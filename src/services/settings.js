const fs = require('fs');
const path = require('path');
const axios = require('axios');

const STORE_PATH = path.join(__dirname, '..', '..', 'data', 'settings.json');

const NOTION_VERSION = '2022-06-28';

const DEFAULTS = {
  notionApiKey: '',
  aiProvider: 'openai',
  aiModel: 'gpt-4o',
  aiBaseUrl: 'https://api.openai.com/v1',
  aiApiKey: '',
  extraPrompt: '',
};

function loadStore() {
  try {
    const content = fs.readFileSync(STORE_PATH, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(content) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function getAll() {
  return loadStore();
}

async function update(updates) {
  const store = loadStore();
  if (updates.notionApiKey !== undefined) store.notionApiKey = updates.notionApiKey;
  if (updates.aiProvider !== undefined) store.aiProvider = updates.aiProvider;
  if (updates.aiModel !== undefined) store.aiModel = updates.aiModel;
  if (updates.aiBaseUrl !== undefined) store.aiBaseUrl = updates.aiBaseUrl;
  if (updates.aiApiKey !== undefined) store.aiApiKey = updates.aiApiKey;
  if (updates.extraPrompt !== undefined) store.extraPrompt = updates.extraPrompt;
  saveStore(store);
}

function getNotionHeaders(settings) {
  const store = settings || loadStore();
  const apiKey = store.notionApiKey;
  if (!apiKey) throw new Error('Notion API Key not configured');
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

async function testNotionConnection(settings) {
  const res = await axios.get('https://api.notion.com/v1/users/me', { headers: getNotionHeaders(settings) });
  return { success: true, user: res.data };
}

function extractPageTitle(page) {
  const props = page.properties || {};
  // Prefer the property whose type is 'title' (name varies per page / database)
  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (prop && prop.type === 'title' && Array.isArray(prop.title)) {
      const text = prop.title.map(t => t.plain_text || '').join('').trim();
      if (text) return text;
    }
  }
  // Fallback: derive from Notion URL slug (.../My-Page-Title-<32hex>)
  const fromUrl = titleFromNotionUrl(page.url);
  if (fromUrl) return fromUrl;
  return 'Untitled';
}

function titleFromNotionUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const path = new URL(url).pathname.replace(/\/$/, '');
    const segment = path.split('/').pop() || '';
    const match = segment.match(/^(.*)-([0-9a-f]{32})$/i);
    if (!match || !match[1]) return '';
    return decodeURIComponent(match[1].replace(/-/g, ' ')).trim();
  } catch {
    return '';
  }
}

function isDatabaseRow(parent) {
  const type = parent && parent.type;
  return type === 'database_id' || type === 'data_source_id';
}

function normalizeNotionId(id) {
  if (!id) return null;
  const hex = String(id).replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return String(id).trim();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function getNotionPages(settings, query, parentId) {
  const headers = getNotionHeaders(settings);
  parentId = normalizeNotionId(parentId);

  // Children of a specific page — list via blocks API
  if (parentId) {
    const pages = [];
    let startCursor;
    let hasMore = true;
    let guard = 0;
    while (hasMore && guard < 10) {
      guard++;
      const params = { page_size: 100 };
      if (startCursor) params.start_cursor = startCursor;
      const res = await axios.get(`https://api.notion.com/v1/blocks/${parentId}/children`, {
        headers,
        params,
      });
      const results = (res.data && res.data.results) || [];
      for (const block of results) {
        if (block.archived || block.in_trash) continue;
        if (block.type === 'child_page') {
          const title = ((block.child_page && block.child_page.title) || '').trim() || 'Untitled';
          pages.push({ id: normalizeNotionId(block.id), title, parentId });
        }
      }
      hasMore = !!res.data.has_more;
      startCursor = res.data.next_cursor;
    }
    // Keep Notion document order from blocks API (do not re-sort by title)
    return { pages };
  }

  // Search or root listing via search API
  const pages = [];
  const byId = {};
  let startCursor;
  let hasMore = true;
  let guard = 0;

  while (hasMore && guard < 5) {
    guard++;
    const body = { filter: { property: 'object', value: 'page' }, page_size: 100 };
    if (query) body.query = query;
    if (startCursor) body.start_cursor = startCursor;

    const res = await axios.post('https://api.notion.com/v1/search', body, { headers });
    const results = (res.data && res.data.results) || [];
    for (const page of results) {
      if (page.archived || page.in_trash) continue;
      const parent = page.parent || {};
      // Database / data-source rows are not directory pages
      if (!query && isDatabaseRow(parent)) continue;

      let pageParentId = null;
      if (parent.type === 'page_id') pageParentId = normalizeNotionId(parent.page_id);
      else if (parent.type === 'block_id') pageParentId = normalizeNotionId(parent.block_id);

      const id = normalizeNotionId(page.id);
      const item = {
        id,
        title: extractPageTitle(page),
        parentId: pageParentId,
        parentType: parent.type || null,
      };
      pages.push(item);
      byId[id] = item;
    }
    hasMore = !!res.data.has_more;
    startCursor = res.data.next_cursor;
  }

  // Search mode: return flat matches (still skip empty untitled clutter when possible)
  if (query) {
    const filtered = pages.filter((p) => p.title && p.title !== 'Untitled');
    const list = filtered.length ? filtered : pages;
    list.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
    return { pages: list };
  }

  // Root mode: only workspace top-level pages.
  // If a mid-level page was shared without its parent, use that page as an entry
  // point — but never promote a page whose parent is already in the accessible set.
  const workspaceRoots = pages.filter((p) => p.parentType === 'workspace');
  let roots = workspaceRoots;

  if (!roots.length) {
    roots = pages.filter((p) => {
      if (p.parentType !== 'page_id' && p.parentType !== 'block_id') return false;
      if (!p.parentId) return false;
      return !byId[p.parentId];
    });
  }

  const named = roots.filter((p) => p.title && p.title !== 'Untitled');
  const list = named.length ? named : roots;
  list.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  return { pages: list };
}

async function testAIConnection(settings) {
  const store = settings || loadStore();
  const { aiProvider, aiBaseUrl, aiApiKey, aiModel } = store;
  if (!aiApiKey) throw new Error('AI API Key not configured');

  let headers = { 'Content-Type': 'application/json' };
  if (aiProvider === 'anthropic') {
    headers['x-api-key'] = aiApiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = `Bearer ${aiApiKey}`;
  }

  const baseUrl = aiBaseUrl || 'https://api.openai.com/v1';
  const isAnthropic = aiProvider === 'anthropic';

  const payload = isAnthropic
    ? { messages: [{ role: 'user', content: 'Hi' }], model: aiModel || 'claude-haiku-4-20250514', max_tokens: 10 }
    : { messages: [{ role: 'user', content: 'Hi' }], model: aiModel || 'gpt-4o-mini', max_tokens: 10 };

  const endpoint = isAnthropic ? '/messages' : '/chat/completions';
  const res = await axios.post(`${baseUrl}${endpoint}`, payload, { headers, timeout: 15000 });
  return { success: true, model: res.data.model || aiModel };
}

module.exports = { getAll, update, testNotionConnection, getNotionPages, testAIConnection, NOTION_VERSION };

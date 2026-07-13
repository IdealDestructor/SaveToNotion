const fs = require('fs');
const path = require('path');
const axios = require('axios');

const STORE_PATH = path.join(__dirname, '..', '..', 'data', 'settings.json');

const DEFAULTS = {
  notionApiKey: '',
  notionVersion: '2022-06-28',
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
  if (updates.notionVersion !== undefined) store.notionVersion = updates.notionVersion;
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
    'Notion-Version': store.notionVersion || '2022-06-28',
  };
}

async function testNotionConnection(settings) {
  const res = await axios.get('https://api.notion.com/v1/users/me', { headers: getNotionHeaders(settings) });
  return { success: true, user: res.data };
}

function extractPageTitle(page) {
  const props = page.properties || {};
  // Prefer the property whose type is 'title' (name varies per page)
  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (prop && prop.type === 'title' && Array.isArray(prop.title) && prop.title.length) {
      const text = prop.title.map(t => t.plain_text || '').join('');
      if (text) return text;
    }
  }
  // Fallbacks for common property names
  for (const name of ['title', 'Title', 'name', 'Name']) {
    const arr = props[name] && props[name].title;
    if (Array.isArray(arr) && arr.length) {
      const text = arr.map(t => t.plain_text || '').join('');
      if (text) return text;
    }
  }
  return 'Untitled';
}

async function getNotionPages(settings, query) {
  const headers = getNotionHeaders(settings);
  const pages = [];
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
      const parent = page.parent;
      const parentId = parent && parent.type === 'page_id' ? parent.page_id : null;
      pages.push({ id: page.id, title: extractPageTitle(page), parentId });
    }
    hasMore = !!res.data.has_more;
    startCursor = res.data.next_cursor;
  }

  return { pages };
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

module.exports = { getAll, update, testNotionConnection, getNotionPages, testAIConnection };

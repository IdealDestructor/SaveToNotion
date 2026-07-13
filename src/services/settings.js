const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const ENV_PATH = path.join(__dirname, '..', '..', '.env');

function loadEnv() {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const parsed = {};
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          parsed[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
    return parsed;
  } catch {
    return {};
  }
}

async function saveEnv(env) {
  const existing = loadEnv();
  const merged = { ...existing, ...env };
  Object.keys(merged).forEach(k => {
    if (!merged[k]) delete merged[k];
  });
  const lines = Object.entries(merged).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  await fs.writeFile(ENV_PATH, lines);
}

function getAll() {
  const env = loadEnv();
  return {
    notionApiKey: env.NOTION_API_KEY || '',
    notionVersion: env.NOTION_VERSION || '2022-06-28',
    aiProvider: env.AI_PROVIDER || 'openai',
    aiModel: env.AI_MODEL || 'gpt-4o',
    aiBaseUrl: env.AI_BASE_URL || 'https://api.openai.com/v1',
    aiApiKey: env.AI_API_KEY || '',
    extraPrompt: env.EXTRA_PROMPT || '',
  };
}

async function update(updates) {
  const env = {};
  if (updates.notionApiKey !== undefined) env.NOTION_API_KEY = updates.notionApiKey;
  if (updates.notionVersion !== undefined) env.NOTION_VERSION = updates.notionVersion;
  if (updates.aiProvider !== undefined) env.AI_PROVIDER = updates.aiProvider;
  if (updates.aiModel !== undefined) env.AI_MODEL = updates.aiModel;
  if (updates.aiBaseUrl !== undefined) env.AI_BASE_URL = updates.aiBaseUrl;
  if (updates.aiApiKey !== undefined) env.AI_API_KEY = updates.aiApiKey;
  if (updates.extraPrompt !== undefined) env.EXTRA_PROMPT = updates.extraPrompt;
  await saveEnv(env);
}

function getNotionHeaders() {
  const env = loadEnv();
  const apiKey = env.NOTION_API_KEY;
  if (!apiKey) throw new Error('Notion API Key not configured');
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': env.NOTION_VERSION || '2022-06-28',
  };
}

async function testNotionConnection() {
  const res = await axios.get('https://api.notion.com/v1/users/me', { headers: getNotionHeaders() });
  return { success: true, user: res.data };
}

async function getNotionPages() {
  const searchRes = await axios.post('https://api.notion.com/v1/search', {
    filter: { property: 'object', value: 'page' },
  }, { headers: getNotionHeaders() });
  
  const pages = searchRes.data.results.slice(0, 50).map(page => ({
    id: page.id,
    title: page.properties?.Title?.title?.[0]?.plain_text 
      || page.properties?.name?.title?.[0]?.plain_text 
      || 'Untitled',
    type: 'page',
  }));
  
  return { pages };
}

async function testAIConnection() {
  const env = loadEnv();
  const { AI_PROVIDER, AI_BASE_URL, AI_API_KEY, AI_MODEL } = env;
  if (!AI_API_KEY) throw new Error('AI API Key not configured');
  
  let headers = { 'Content-Type': 'application/json' };
  if (AI_PROVIDER === 'anthropic') {
    headers['x-api-key'] = AI_API_KEY;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = `Bearer ${AI_API_KEY}`;
  }
  
  const baseUrl = AI_BASE_URL || 'https://api.openai.com/v1';
  const isAnthropic = AI_PROVIDER === 'anthropic';
  
  const payload = isAnthropic
    ? { messages: [{ role: 'user', content: 'Hi' }], model: AI_MODEL || 'claude-haiku-4-20250514', max_tokens: 10 }
    : { messages: [{ role: 'user', content: 'Hi' }], model: AI_MODEL || 'gpt-4o-mini', max_tokens: 10 };
  
  const endpoint = isAnthropic ? '/messages' : '/chat/completions';
  const res = await axios.post(`${baseUrl}${endpoint}`, payload, { headers, timeout: 15000 });
  return { success: true, model: res.data.model || AI_MODEL };
}

module.exports = { getAll, update, testNotionConnection, getNotionPages, testAIConnection };

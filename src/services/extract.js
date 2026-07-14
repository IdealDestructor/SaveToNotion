const axios = require('axios');
const cheerio = require('cheerio');
const { NodeHtmlMarkdown } = require('node-html-markdown');
const settingsService = require('./settings');

async function fetchUrlContent(url) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await axios.get(url, {
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) savetonotion/1.0' },
        maxRedirects: 5,
      });
      var response = res;
      break;
    } catch (err) {
      lastErr = err;
      const status = err.response && err.response.status;
      if (status === 503 || status === 502 || status === 429 || !status) {
        await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, i), 6000)));
        continue;
      }
      throw err;
    }
  }
  if (!response) throw lastErr;
  const res = response;
  
  const $ = cheerio.load(res.data);
  $('script, style, noscript, iframe, nav, footer, header, .sidebar, .nav, .menu, .advertisement, .ads, .comment').remove();
  
  const title = $('title').text().trim() 
    || $('h1').first().text().trim() 
    || $('meta[property="og:title"]').attr('content') || url;
  
  let mainContent = '';
  for (const sel of ['#article', '#article-content', '.article-content', '.post-content', '.entry-content', '.post', '.article', 'article']) {
    const el = $(sel).first();
    if (el.length > 0) { mainContent = el.html(); break; }
  }
  if (!mainContent) mainContent = $('body').html();
  
  const md = NodeHtmlMarkdown.translate(mainContent);
  
  return {
    title,
    content: md.replace(/\n{3,}/g, '\n\n').trim(),
    url,
    author: $('meta[name="author"]').attr('content') || '',
  };
}

async function processWithAI(rawContent, settings, promptOverride) {
  const { aiProvider, aiBaseUrl, aiApiKey, aiModel } = settings;
  if (!aiApiKey) throw new Error('AI API Key not configured');
  
  const defaultPrompt = `你是一个专业的内容整理助手。请将以下网页内容整理成结构清晰、格式优美的 Notion 笔记。

要求：
1. 保留原文的核心信息和逻辑结构
2. 使用适当的 Markdown 格式（标题、列表、引用、代码块等）
3. 去除广告、导航栏等无关内容
4. 如果原文有作者信息，在开头注明
5. 在文末添加原文链接
6. 输出纯 Markdown 格式，不要添加额外的解释文字`;

  const prompt = promptOverride || (settings.extraPrompt || '') + '\n\n' + defaultPrompt;
  
  const messages = [
    { role: 'system', content: prompt },
    { role: 'user', content: rawContent.content },
  ];
  
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
    ? { messages, model: aiModel || 'claude-haiku-4-20250514', max_tokens: 8192 }
    : { messages, model: aiModel || 'gpt-4o', max_tokens: 8192 };
  
  const endpoint = isAnthropic ? '/messages' : '/chat/completions';
  const res = await axios.post(`${baseUrl}${endpoint}`, payload, { headers, timeout: 120000 });
  
  if (isAnthropic) return res.data.content?.[0]?.text || '';
  return res.data.choices?.[0]?.message?.content || '';
}

const CODE_LANG_MAP = {
  '': 'plain text', 'text': 'plain text', 'txt': 'plain text', 'plaintext': 'plain text',
  'sh': 'bash', 'shell': 'bash', 'bash': 'bash', 'zsh': 'bash', 'console': 'bash',
  'js': 'javascript', 'javascript': 'javascript', 'jsx': 'jsx',
  'ts': 'typescript', 'typescript': 'typescript', 'tsx': 'typescript',
  'py': 'python', 'python': 'python', 'python3': 'python',
  'yml': 'yaml', 'yaml': 'yaml',
  'c++': 'cpp', 'cpp': 'cpp', 'c': 'c', 'h': 'c',
  'c#': 'csharp', 'cs': 'csharp', 'csharp': 'csharp',
  'objective-c': 'objectivec', 'objectivec': 'objectivec',
  'vb': 'visual basic', 'vb.net': 'vb.net',
  'md': 'markdown', 'markdown': 'markdown',
  'dockerfile': 'docker', 'docker': 'docker',
  'go': 'go', 'golang': 'go', 'rust': 'rust', 'ruby': 'ruby', 'rb': 'ruby',
  'java': 'java', 'kotlin': 'kotlin', 'sql': 'sql', 'xml': 'xml',
  'html': 'html', 'css': 'css', 'json': 'json', 'scss': 'scss', 'less': 'less',
  'php': 'php', 'swift': 'swift', 'r': 'r', 'lua': 'lua', 'perl': 'perl',
};

function normalizeCodeLang(lang) {
  if (!lang) return 'plain text';
  const key = String(lang).toLowerCase().trim();
  return CODE_LANG_MAP[key] || 'plain text';
}

function chunkText(text, max) {
  const out = [];
  for (let i = 0; i < text.length; i += max) out.push(text.slice(i, i + max));
  return out.length ? out : [''];
}

function richText(text, max) {
  max = max || 1900;
  return chunkText(text, max).map(t => ({ type: 'text', text: { content: t } }));
}

function parseMarkdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');
  let currentParagraph = [];
  let inCode = false;
  let codeLang = 'text';
  let codeBuf = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ');
      if (text.trim()) {
        blocks.push({
          object: 'block', type: 'paragraph',
          paragraph: { rich_text: richText(text.trim()) },
        });
      }
      currentParagraph = [];
    }
  }

  function flushCode() {
    const content = codeBuf.join('\n');
    blocks.push({
      object: 'block', type: 'code',
      code: { rich_text: richText(content || ''), language: normalizeCodeLang(codeLang) },
    });
    codeBuf = [];
    inCode = false;
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) { flushCode(); }
      else { flushParagraph(); inCode = true; codeLang = line.slice(3).trim() || 'text'; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    if (line.startsWith('#### ')) { flushParagraph(); blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: richText(line.slice(5)) } }); }
    else if (line.startsWith('### ')) { flushParagraph(); blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: richText(line.slice(4)) } }); }
    else if (line.startsWith('## ')) { flushParagraph(); blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: richText(line.slice(3)) } }); }
    else if (line.startsWith('# ')) { flushParagraph(); blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: richText(line.slice(2)) } }); }
    else if (line.startsWith('> ')) { flushParagraph(); blocks.push({ object: 'block', type: 'quote', quote: { rich_text: richText(line.slice(2)) } }); }
    else if (line.startsWith('- ') || line.startsWith('* ')) { flushParagraph(); blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: richText(line.slice(2)) } }); }
    else if (/^\d+\.\s/.test(line)) { flushParagraph(); blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: richText(line.replace(/^\d+\.\s/, '')) } }); }
    else if (line.trim() === '') { flushParagraph(); }
    else { currentParagraph.push(line); }
  }
  if (inCode) flushCode();
  flushParagraph();
  return blocks;
}

async function requestWithRetry(method, url, body, headers, attempts, step) {
  attempts = attempts || 4;
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await axios({ method, url, data: body, headers });
    } catch (err) {
      lastErr = err;
      const status = err.response && err.response.status;
      if (status === 503 || status === 502 || status === 429) {
        const delay = Math.min(1000 * Math.pow(2, i), 8000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw enhancedErr(err, step);
    }
  }
  throw enhancedErr(lastErr, step);
}

function postWithRetry(url, body, headers, attempts, step) {
  return requestWithRetry('post', url, body, headers, attempts, step);
}

function patchWithRetry(url, body, headers, attempts, step) {
  return requestWithRetry('patch', url, body, headers, attempts, step);
}

function enhancedErr(err, step) {
  if (!err) return new Error('Unknown error');
  const status = err.response && err.response.status;
  const data = err.response && err.response.data;
  let msg = err.message;
  if (data) {
    if (typeof data === 'string') msg += ` | ${data}`;
    else msg += ` | ${data.status || ''} ${data.code || ''} ${data.message || JSON.stringify(data)}`;
  }
  const url = err.config && err.config.url;
  if (step) msg = `${step}: ${msg}`;
  if (url) msg += ` (${url})`;
  const e = new Error(msg);
  e.status = status;
  e.code = data && data.code;
  return e;
}

function normalizeNotionId(id) {
  if (!id) return null;
  const raw = String(id).trim();
  const match = raw.match(/([0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12})/i);
  if (!match) return raw;
  const hex = match[1].replace(/-/g, '');
  if (hex.length !== 32) return raw;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function titleProperty(text) {
  return { title: richText(text || 'Untitled', 2000) };
}

async function saveToNotion(processedContent, title, settings, parentId, note) {
  if (!settings) settings = settingsService.getAll();
  const { notionApiKey } = settings;
  if (!notionApiKey) throw new Error('Notion API Key not configured');

  const normalizedParentId = normalizeNotionId(parentId);
  if (!normalizedParentId) {
    throw new Error(
      '请选择一个父页面。内部集成无法直接保存到工作区根目录，请先在 Notion 中创建页面并授权给集成，然后在上方选择目标页面。'
    );
  }

  const headers = {
    Authorization: `Bearer ${notionApiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': settingsService.NOTION_VERSION,
  };

  const notionContent = processedContent + (note ? `\n\n> 💡 备注: ${note}` : '');
  const blocks = parseMarkdownToBlocks(notionContent);

  // Child pages under page_id always use the "title" property (Notion API requirement).
  const createRes = await postWithRetry(
    'https://api.notion.com/v1/pages',
    {
      parent: { page_id: normalizedParentId },
      properties: { title: titleProperty(title) },
    },
    headers,
    4,
    '创建 Notion 页面'
  );

  const pageId = createRes.data && createRes.data.id;
  if (!pageId) throw new Error('创建 Notion 页面失败: 响应中缺少 page id');

  // Append content blocks in batches of 100 (Notion limit). Endpoint requires PATCH.
  for (let i = 0; i < blocks.length; i += 100) {
    const batch = blocks.slice(i, i + 100);
    if (!batch.length) continue;
    await patchWithRetry(
      `https://api.notion.com/v1/blocks/${pageId}/children`,
      { children: batch },
      headers,
      4,
      '写入 Notion 内容块'
    );
  }

  return { success: true, pageId };
}

async function extractAndSave(url, parentId, note, promptOverride, settings) {
  settings = settings || settingsService.getAll();
  let rawContent;
  try {
    console.log(`Fetching URL: ${url}`);
    rawContent = await fetchUrlContent(url);
  } catch (err) {
    throw new Error('抓取网页失败: ' + err.message);
  }

  let processedContent;
  try {
    console.log('Processing with AI...');
    processedContent = await processWithAI(rawContent, settings, promptOverride);
  } catch (err) {
    throw new Error('AI 整理失败: ' + err.message);
  }

  try {
    console.log('Saving to Notion...');
    const result = await saveToNotion(processedContent, rawContent.title, settings, parentId, note);
    return { success: true, title: rawContent.title, url: rawContent.url, notionResult: result };
  } catch (err) {
    throw new Error('保存到 Notion 失败: ' + err.message);
  }
}

async function preview(url, promptOverride, settings) {
  settings = settings || settingsService.getAll();
  const rawContent = await fetchUrlContent(url);
  const processedContent = await processWithAI(rawContent, settings, promptOverride);
  return { title: rawContent.title, url: rawContent.url, rawContent: rawContent.content, processedContent };
}

module.exports = { extractAndSave, preview };

const axios = require('axios');
const cheerio = require('cheerio');
const { NodeHtmlMarkdown } = require('node-html-markdown');
const settingsService = require('./settings');

async function fetchUrlContent(url) {
  const res = await axios.get(url, {
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) url2notion/1.0' },
    maxRedirects: 5,
  });
  
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
  const { AI_PROVIDER, AI_BASE_URL, AI_API_KEY, AI_MODEL } = settings;
  if (!AI_API_KEY) throw new Error('AI API Key not configured');
  
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
  if (AI_PROVIDER === 'anthropic') {
    headers['x-api-key'] = AI_API_KEY;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers['Authorization'] = `Bearer ${AI_API_KEY}`;
  }
  
  const baseUrl = AI_BASE_URL || 'https://api.openai.com/v1';
  const isAnthropic = AI_PROVIDER === 'anthropic';
  
  const payload = isAnthropic
    ? { messages, model: AI_MODEL || 'claude-haiku-4-20250514', max_tokens: 8192 }
    : { messages, model: AI_MODEL || 'gpt-4o', max_tokens: 8192 };
  
  const endpoint = isAnthropic ? '/messages' : '/chat/completions';
  const res = await axios.post(`${baseUrl}${endpoint}`, payload, { headers, timeout: 120000 });
  
  if (isAnthropic) return res.data.content?.[0]?.text || '';
  return res.data.choices?.[0]?.message?.content || '';
}

function parseMarkdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');
  let currentParagraph = [];
  
  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ');
      if (text.trim()) {
        blocks.push({
          object: 'block', type: 'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: text.trim() } }] },
        });
      }
      currentParagraph = [];
    }
  }
  
  for (const line of lines) {
    if (line.startsWith('#### ')) { flushParagraph(); blocks.push({ object: 'block', type: 'heading_4', heading_4: { rich_text: [{ type: 'text', text: { content: line.slice(5) } }] } }); }
    else if (line.startsWith('### ')) { flushParagraph(); blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: line.slice(4) } }] } }); }
    else if (line.startsWith('## ')) { flushParagraph(); blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: line.slice(3) } }] } }); }
    else if (line.startsWith('# ')) { flushParagraph(); blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } }); }
    else if (line.startsWith('> ')) { flushParagraph(); blocks.push({ object: 'block', type: 'quote', quote: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } }); }
    else if (line.startsWith('- ') || line.startsWith('* ')) { flushParagraph(); blocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: line.slice(2) } }] } }); }
    else if (/^\d+\.\s/.test(line)) { flushParagraph(); blocks.push({ object: 'block', type: 'numbered_list_item', numbered_list_item: { rich_text: [{ type: 'text', text: { content: line.replace(/^\d+\.\s/, '') } }] } }); }
    else if (line.startsWith('```')) { flushParagraph(); blocks.push({ object: 'block', type: 'code', code: { rich_text: [{ type: 'text', text: { content: '' } }], language: 'text' } }); }
    else if (line.trim() === '') { flushParagraph(); }
    else { currentParagraph.push(line); }
  }
  flushParagraph();
  return blocks;
}

async function saveToNotion(processedContent, title, settings, parentId, note) {
  const { NOTION_API_KEY } = settingsService.getAll();
  if (!NOTION_API_KEY) throw new Error('Notion API Key not configured');
  
  const headers = {
    Authorization: `Bearer ${NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': settings.notionVersion || '2022-06-28',
  };
  
  const notionContent = processedContent + (note ? `\n\n> 💡 备注: ${note}` : '');
  const blocks = parseMarkdownToBlocks(notionContent);
  
  // Create page
  const createRes = await axios.post('https://api.notion.com/v1/pages', {
    parent: parentId ? { page_id: parentId } : { workspace: true },
    properties: { title: [{ type: 'text', text: { content: title } }] },
  }, { headers });
  
  const pageId = createRes.data.id;
  
  // Append content blocks
  await axios.post(`https://api.notion.com/v1/blocks/${pageId}/children`, { children: blocks }, { headers });
  
  return { success: true, pageId };
}

async function extractAndSave(url, parentId, note, promptOverride) {
  const settings = settingsService.getAll();
  console.log(`Fetching URL: ${url}`);
  const rawContent = await fetchUrlContent(url);
  
  console.log('Processing with AI...');
  const processedContent = await processWithAI(rawContent, settings, promptOverride);
  
  console.log('Saving to Notion...');
  const result = await saveToNotion(processedContent, rawContent.title, settings, parentId, note);
  
  return { success: true, title: rawContent.title, url: rawContent.url, notionResult: result };
}

async function preview(url, promptOverride) {
  const settings = settingsService.getAll();
  const rawContent = await fetchUrlContent(url);
  const processedContent = await processWithAI(rawContent, settings, promptOverride);
  return { title: rawContent.title, url: rawContent.url, rawContent: rawContent.content, processedContent };
}

module.exports = { extractAndSave, preview };

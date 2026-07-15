const axios = require('axios');
const cheerio = require('cheerio');
const { NodeHtmlMarkdown } = require('node-html-markdown');
const settingsService = require('./settings');

const MEDIA_LINE_RE = /^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/;
const PDF_LINK_LINE_RE = /^\s*\[([^\]]*)\]\(([^)\s]+\.pdf(?:\?[^)\s]*)?)(?:\s+"[^"]*")?\)\s*$/i;
const VIDEO_URL_RE = /\.(mp4|webm|ogg|mov)(?:\?|$)/i;
const PDF_URL_RE = /\.pdf(?:\?|$)/i;
const STREAM_HOST_RE = /(?:youtube\.com|youtu\.be|vimeo\.com|bilibili\.com|player\.bilibili\.com)/i;
const MEDIA_MD_PATTERN = '!\\[([^\\]]*)\\]\\(([^)\\s]+)(?:\\s+"[^"]*")?\\)';

function absolutizeUrl(href, base) {
  if (!href) return null;
  const trimmed = String(href).trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('javascript:')) {
    return null;
  }
  try {
    return new URL(trimmed, base).href;
  } catch {
    return null;
  }
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function pickMediaSrc($el) {
  const candidates = [
    $el.attr('src'),
    $el.attr('data-src'),
    $el.attr('data-original'),
    $el.attr('data-lazy-src'),
    $el.attr('data-actualsrc'),
    $el.attr('data-url'),
  ];
  const srcset = $el.attr('srcset') || $el.attr('data-srcset');
  if (srcset) {
    const first = String(srcset).split(',')[0].trim().split(/\s+/)[0];
    candidates.push(first);
  }
  for (const candidate of candidates) {
    if (candidate && !String(candidate).startsWith('data:')) return candidate;
  }
  return null;
}

function prepareMediaInHtml($, pageUrl, options) {
  options = options || {};
  if (options.textOnly) {
    $('iframe, img, video, picture, source, figure').remove();
    $('a').each((_, el) => {
      const $el = $(el);
      const abs = absolutizeUrl($el.attr('href'), pageUrl);
      if (abs) $el.attr('href', abs);
    });
    return;
  }

  $('iframe').each((_, el) => {
    const abs = absolutizeUrl($(el).attr('src'), pageUrl);
    if (abs && STREAM_HOST_RE.test(abs)) {
      $(el).replaceWith(`<p>![video](${abs})</p>`);
    }
  });

  $('img').each((_, el) => {
    const $el = $(el);
    const abs = absolutizeUrl(pickMediaSrc($el), pageUrl);
    if (abs) {
      const alt = ($el.attr('alt') || '').replace(/[\[\]]/g, '');
      // Keep images as block-level markdown so relative order survives conversion.
      $el.replaceWith(`<p>![${alt}](${abs})</p>`);
    } else {
      $el.remove();
    }
  });

  $('video').each((_, el) => {
    const $el = $(el);
    const raw = $el.attr('src') || $el.find('source').first().attr('src');
    const abs = absolutizeUrl(raw, pageUrl);
    if (abs) $el.replaceWith(`<p>![video](${abs})</p>`);
    else $el.remove();
  });

  $('a').each((_, el) => {
    const $el = $(el);
    const abs = absolutizeUrl($el.attr('href'), pageUrl);
    if (abs) $el.attr('href', abs);
  });
}

function stripMediaMarkdown(markdown) {
  if (!markdown) return '';
  return markdown
    .replace(new RegExp(MEDIA_MD_PATTERN, 'g'), '')
    .replace(/^\s*\[[^\]]*\]\(([^)\s]+\.pdf(?:\?[^)\s]*)?)(?:\s+"[^"]*")?\)\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function mediaPlaceholder(idx) {
  return `⟦MEDIA:${idx}⟧`;
}

// Match common AI-mangled forms: ⟦MEDIA:0⟧, ⟦MEDIA_0⟧, [[MEDIA_N]], 【MEDIA_0】, etc.
const MEDIA_PLACEHOLDER_RE =
  /(?:⟦|\[\[|【)\s*MEDIA(?:\s*[_\s:-]\s*|\s+)(\d+|N)\s*(?:⟧|\]\]|】)/gi;

function normalizeCtx(text) {
  return String(text || '')
    .replace(MEDIA_PLACEHOLDER_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findInsertPos(haystack, needle, placeAfter) {
  const n = normalizeCtx(needle);
  if (!n || n.length < 10) return -1;
  const candidates = [n];
  if (n.length > 24) candidates.push(n.slice(-24), n.slice(0, 24));
  for (const c of candidates) {
    if (c.length < 10) continue;
    const idx = haystack.indexOf(c);
    if (idx >= 0) return placeAfter ? idx + c.length : idx;
    const softHay = haystack.replace(/\s+/g, ' ');
    const softIdx = softHay.indexOf(c);
    if (softIdx >= 0) {
      // Map approximate position back to original loosely by ratio
      const ratio = softHay.length ? softIdx / softHay.length : 0;
      return Math.min(haystack.length, Math.floor(haystack.length * ratio) + (placeAfter ? c.length : 0));
    }
  }
  return -1;
}

function protectMedia(markdown) {
  const media = [];
  const re = new RegExp(MEDIA_MD_PATTERN, 'g');
  let match;
  const parts = [];
  let last = 0;
  while ((match = re.exec(markdown)) !== null) {
    const idx = media.length;
    media.push({
      md: match[0],
      beforeCtx: markdown.slice(Math.max(0, match.index - 160), match.index),
      afterCtx: markdown.slice(match.index + match[0].length, match.index + match[0].length + 160),
    });
    parts.push(markdown.slice(last, match.index));
    parts.push(`\n\n${mediaPlaceholder(idx)}\n\n`);
    last = match.index + match[0].length;
  }
  parts.push(markdown.slice(last));
  return {
    text: parts.join('').replace(/\n{3,}/g, '\n\n').trim(),
    media,
  };
}

function resolveMediaIndex(token, media, used, autoIdx) {
  if (token != null && /^\d+$/.test(token)) {
    const i = Number(token);
    if (media[i] && !used.has(i)) return { index: i, autoIdx };
  }
  // Literal "N" / unknown / duplicate index → assign next unused media in order
  while (autoIdx < media.length && used.has(autoIdx)) autoIdx += 1;
  if (autoIdx < media.length) return { index: autoIdx, autoIdx: autoIdx + 1 };
  return { index: -1, autoIdx };
}

function restoreMedia(processed, media) {
  if (!media || !media.length) return (processed || '').trim();
  let out = processed || '';
  const used = new Set();
  let autoIdx = 0;

  // Whole-line placeholders (optionally wrapped as quote/list by the model)
  out = out.replace(
    /^[ \t]*(?:>[ \t]*)?(?:[-*][ \t]+|\d+\.[ \t]+)?(?:⟦|\[\[|【)\s*MEDIA(?:\s*[_\s:-]\s*|\s+)(\d+|N)\s*(?:⟧|\]\]|】)[ \t]*$/gim,
    (_, token) => {
      const resolved = resolveMediaIndex(token, media, used, autoIdx);
      autoIdx = resolved.autoIdx;
      if (resolved.index < 0) return '';
      used.add(resolved.index);
      return `\n\n${media[resolved.index].md}\n\n`;
    }
  );

  // Inline / remaining placeholders
  MEDIA_PLACEHOLDER_RE.lastIndex = 0;
  out = out.replace(MEDIA_PLACEHOLDER_RE, (_, token) => {
    const resolved = resolveMediaIndex(token, media, used, autoIdx);
    autoIdx = resolved.autoIdx;
    if (resolved.index < 0) return '';
    used.add(resolved.index);
    return `\n\n${media[resolved.index].md}\n\n`;
  });

  for (let i = 0; i < media.length; i++) {
    if (used.has(i)) continue;
    const item = media[i];
    let pos = findInsertPos(out, item.beforeCtx, true);
    if (pos < 0) pos = findInsertPos(out, item.afterCtx, false);

    if (pos < 0 && i > 0) {
      const prevMd = media[i - 1].md;
      const prevPos = out.indexOf(prevMd);
      if (prevPos >= 0) pos = prevPos + prevMd.length;
    }
    if (pos < 0 && i < media.length - 1) {
      const nextMd = media[i + 1].md;
      const nextPos = out.indexOf(nextMd);
      if (nextPos >= 0) pos = nextPos;
    }

    if (pos >= 0) {
      out = `${out.slice(0, pos)}\n\n${item.md}\n\n${out.slice(pos)}`;
    } else {
      out = `${out.trim()}\n\n${item.md}\n\n`;
    }
    used.add(i);
  }

  // Drop any leftover placeholder tokens the model invented
  out = out.replace(MEDIA_PLACEHOLDER_RE, '');
  out = out.replace(/^[ \t]*>[ \t]*$/gm, '');
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

async function fetchUrlContent(url, options) {
  options = options || {};
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
  prepareMediaInHtml($, url, options);
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
  
  let md = NodeHtmlMarkdown.translate(mainContent || '');
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  if (options.textOnly) md = stripMediaMarkdown(md);
  
  return {
    title,
    content: md,
    url,
    author: $('meta[name="author"]').attr('content') || '',
  };
}

async function processWithAI(rawContent, settings, promptOverride, options) {
  options = options || {};
  const textOnly = !!options.textOnly;
  const { aiProvider, aiBaseUrl, aiApiKey, aiModel } = settings;
  if (!aiApiKey) throw new Error('AI API Key not configured');

  let contentForAI = rawContent.content;
  let media = [];
  if (textOnly) {
    contentForAI = stripMediaMarkdown(rawContent.content);
  } else {
    const protectedContent = protectMedia(rawContent.content);
    contentForAI = protectedContent.text;
    media = protectedContent.media;
  }

  const mediaRule = textOnly
    ? '6. 纯文本模式：不要输出任何图片、视频、PDF 或媒体链接'
    : `6. 正文中形如 ⟦MEDIA:0⟧、⟦MEDIA:1⟧ 的标记是媒体占位符（冒号后为从 0 递增的数字）。必须完整原样保留每个占位符及编号；禁止改写为 MEDIA_N、禁止加 > 引用前缀、禁止删除/合并/改成图片链接。不要自行发明媒体 URL`;
  
  const defaultPrompt = `你是一个专业的内容整理助手。请将以下网页内容整理成结构清晰、格式优美的 Notion 笔记。

要求：
1. 保留原文的核心信息和逻辑结构
2. 使用适当的 Markdown 格式（标题、列表、引用、代码块等）
3. 去除广告、导航栏等无关内容
4. 如果原文有作者信息，在开头注明
5. 在文末添加原文链接
${mediaRule}
7. 输出纯 Markdown 格式，不要添加额外的解释文字`;

  const prompt = promptOverride || (settings.extraPrompt || '') + '\n\n' + defaultPrompt;
  
  const messages = [
    { role: 'system', content: prompt },
    { role: 'user', content: contentForAI },
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
  
  const text = isAnthropic
    ? (res.data.content?.[0]?.text || '')
    : (res.data.choices?.[0]?.message?.content || '');

  if (textOnly) return stripMediaMarkdown(text);
  return restoreMedia(text, media);
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

function makeRichTextItem(content, opts) {
  opts = opts || {};
  const item = {
    type: 'text',
    text: { content: content == null ? '' : String(content) },
    annotations: {
      bold: !!opts.bold,
      italic: !!opts.italic,
      strikethrough: !!opts.strikethrough,
      underline: false,
      code: !!opts.code,
      color: 'default',
    },
  };
  if (opts.url && isHttpUrl(opts.url)) {
    item.text.link = { url: opts.url };
  }
  return item;
}

function appendRichTextChunks(out, content, opts, max) {
  if (content == null || content === '') return;
  for (const chunk of chunkText(String(content), max)) {
    out.push(makeRichTextItem(chunk, opts));
  }
}

// Inline markdown → Notion rich_text (links, bold, italic, code, strike, images-as-links).
const INLINE_MD_RE = /(!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\))|(\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)|(~~([^~]+)~~)|(https?:\/\/[^\s<]+[^\s<.,;:!?'")\]])/g;

function parseInlineToRichText(text, max) {
  max = max || 1900;
  const src = text == null ? '' : String(text);
  if (!src) return [makeRichTextItem('')];

  const out = [];
  let last = 0;
  INLINE_MD_RE.lastIndex = 0;
  let match;
  while ((match = INLINE_MD_RE.exec(src)) !== null) {
    if (match.index > last) {
      appendRichTextChunks(out, src.slice(last, match.index), null, max);
    }

    if (match[1] != null) {
      // ![alt](url) — Notion rich_text cannot embed images; use a hyperlink fallback.
      const alt = match[2] || match[3];
      const url = match[3];
      if (isHttpUrl(url)) appendRichTextChunks(out, alt || url, { url }, max);
      else appendRichTextChunks(out, match[0], null, max);
    } else if (match[4] != null) {
      const label = match[5];
      const url = match[6];
      if (isHttpUrl(url)) appendRichTextChunks(out, label, { url }, max);
      else appendRichTextChunks(out, match[0], null, max);
    } else if (match[7] != null) {
      appendRichTextChunks(out, match[8], { code: true }, max);
    } else if (match[9] != null) {
      appendRichTextChunks(out, match[10], { bold: true }, max);
    } else if (match[11] != null) {
      appendRichTextChunks(out, match[12], { bold: true }, max);
    } else if (match[13] != null) {
      appendRichTextChunks(out, match[14], { italic: true }, max);
    } else if (match[15] != null) {
      appendRichTextChunks(out, match[16], { italic: true }, max);
    } else if (match[17] != null) {
      appendRichTextChunks(out, match[18], { strikethrough: true }, max);
    } else if (match[19] != null) {
      const url = match[19];
      if (isHttpUrl(url)) appendRichTextChunks(out, url, { url }, max);
      else appendRichTextChunks(out, url, null, max);
    }

    last = match.index + match[0].length;
  }
  if (last < src.length) appendRichTextChunks(out, src.slice(last), null, max);
  return out.length ? out : [makeRichTextItem('')];
}

function richText(text, max, options) {
  max = max || 1900;
  options = options || {};
  if (options.plain) {
    return chunkText(text == null ? '' : String(text), max).map(t => makeRichTextItem(t));
  }
  return parseInlineToRichText(text, max);
}

function mediaBlock(url, caption, forcedType) {
  if (!isHttpUrl(url)) return null;
  const captionText = caption && caption !== 'video' ? caption : '';
  const captionRt = captionText ? richText(captionText, 1900, { plain: true }) : [];

  let type = forcedType;
  if (!type) {
    if (STREAM_HOST_RE.test(url) || VIDEO_URL_RE.test(url) || caption === 'video') type = 'video';
    else if (PDF_URL_RE.test(url)) type = 'pdf';
    else type = 'image';
  }

  if (type === 'video') {
    return {
      object: 'block',
      type: 'video',
      video: { type: 'external', external: { url }, caption: captionRt },
    };
  }
  if (type === 'pdf') {
    return {
      object: 'block',
      type: 'pdf',
      pdf: { type: 'external', external: { url } },
    };
  }
  return {
    object: 'block',
    type: 'image',
    image: { type: 'external', external: { url }, caption: captionRt },
  };
}

function splitInlineMedia(text) {
  const parts = [];
  let lastIndex = 0;
  const re = new RegExp(MEDIA_MD_PATTERN, 'g');
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ kind: 'media', alt: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ kind: 'text', value: text.slice(lastIndex) });
  }
  return parts.length ? parts : [{ kind: 'text', value: text }];
}

function pushTextBlocks(blocks, text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return;
  const parts = splitInlineMedia(trimmed);
  let textBuf = [];

  function flushText() {
    const joined = textBuf.join('').trim();
    if (!joined) { textBuf = []; return; }
    blocks.push({
      object: 'block', type: 'paragraph',
      paragraph: { rich_text: richText(joined) },
    });
    textBuf = [];
  }

  for (const part of parts) {
    if (part.kind === 'media') {
      flushText();
      const block = mediaBlock(part.url, part.alt);
      if (block) blocks.push(block);
      else textBuf.push(`[${part.alt || part.url}](${part.url})`);
    } else {
      textBuf.push(part.value);
    }
  }
  flushText();
}

/** Push a typed text block, pulling out any inline media as sibling image/video blocks. */
function pushTypedBlock(blocks, type, text) {
  const trimmed = text == null ? '' : String(text);
  const parts = splitInlineMedia(trimmed);
  const textValue = parts.filter(p => p.kind === 'text').map(p => p.value).join('').trim();
  const mediaParts = parts.filter(p => p.kind === 'media');

  if (textValue || mediaParts.length === 0) {
    blocks.push({
      object: 'block',
      type,
      [type]: { rich_text: richText(textValue || trimmed.trim()) },
    });
  }

  for (const part of mediaParts) {
    const block = mediaBlock(part.url, part.alt);
    if (block) blocks.push(block);
    else pushTextBlocks(blocks, `[${part.alt || part.url}](${part.url})`);
  }
}

function parseMarkdownToBlocks(markdown) {
  const blocks = [];
  const lines = String(markdown || '').split('\n');
  let currentParagraph = [];
  let inCode = false;
  let codeLang = 'text';
  let codeBuf = [];

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      pushTextBlocks(blocks, currentParagraph.join(' '));
      currentParagraph = [];
    }
  }

  function flushCode() {
    const content = codeBuf.join('\n');
    blocks.push({
      object: 'block', type: 'code',
      code: { rich_text: richText(content || '', 1900, { plain: true }), language: normalizeCodeLang(codeLang) },
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

    const mediaLine = line.match(MEDIA_LINE_RE);
    if (mediaLine) {
      flushParagraph();
      const block = mediaBlock(mediaLine[2], mediaLine[1]);
      if (block) blocks.push(block);
      else pushTextBlocks(blocks, line);
      continue;
    }

    const pdfLine = line.match(PDF_LINK_LINE_RE);
    if (pdfLine) {
      flushParagraph();
      const block = mediaBlock(pdfLine[2], pdfLine[1], 'pdf');
      if (block) blocks.push(block);
      else pushTextBlocks(blocks, line);
      continue;
    }

    if (line.startsWith('#### ')) { flushParagraph(); pushTypedBlock(blocks, 'heading_3', line.slice(5)); }
    else if (line.startsWith('### ')) { flushParagraph(); pushTypedBlock(blocks, 'heading_3', line.slice(4)); }
    else if (line.startsWith('## ')) { flushParagraph(); pushTypedBlock(blocks, 'heading_2', line.slice(3)); }
    else if (line.startsWith('# ')) { flushParagraph(); pushTypedBlock(blocks, 'heading_1', line.slice(2)); }
    else if (line.startsWith('> ')) { flushParagraph(); pushTypedBlock(blocks, 'quote', line.slice(2)); }
    else if (line.startsWith('- ') || line.startsWith('* ')) { flushParagraph(); pushTypedBlock(blocks, 'bulleted_list_item', line.slice(2)); }
    else if (/^\d+\.\s/.test(line)) { flushParagraph(); pushTypedBlock(blocks, 'numbered_list_item', line.replace(/^\d+\.\s/, '')); }
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
  return { title: richText(text || 'Untitled', 2000, { plain: true }) };
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

  const pageUrl = `https://www.notion.so/${String(pageId).replace(/-/g, '')}`;
  return { success: true, pageId, pageUrl };
}

async function extractAndSave(url, parentId, note, promptOverride, settings, options) {
  settings = settings || settingsService.getAll();
  options = options || {};
  let rawContent;
  try {
    console.log(`Fetching URL: ${url}`);
    rawContent = await fetchUrlContent(url, options);
  } catch (err) {
    throw new Error('抓取网页失败: ' + err.message);
  }

  let processedContent;
  try {
    console.log('Processing with AI...');
    processedContent = await processWithAI(rawContent, settings, promptOverride, options);
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

async function preview(url, promptOverride, settings, options) {
  settings = settings || settingsService.getAll();
  options = options || {};
  const rawContent = await fetchUrlContent(url, options);
  const processedContent = await processWithAI(rawContent, settings, promptOverride, options);
  return { title: rawContent.title, url: rawContent.url, rawContent: rawContent.content, processedContent, textOnly: !!options.textOnly };
}

module.exports = { extractAndSave, preview, parseMarkdownToBlocks, protectMedia, restoreMedia };

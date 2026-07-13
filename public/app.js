(function() {
  'use strict';

  let settingsCache = null;

  // --- Tab switching ---
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  // --- API helpers ---
  async function api(path, opts) {
    opts = opts || {};
    var res = await fetch('/api' + path, {
      headers: { 'Content-Type': 'application/json' },
      method: opts.method || 'GET',
      body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined,
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  }

  // --- Status display ---
  function showStatus(id, type, msg, loading) {
    loading = loading || false;
    var el = document.getElementById(id);
    el.className = 'status show status-' + type;
    el.innerHTML = (loading ? '<div class="spinner"></div>' : '') + '<span>' + msg + '</span>';
  }

  function hideStatus(id) {
    var el = document.getElementById(id);
    el.className = 'status';
    el.innerHTML = '';
  }

  // --- Loading overlay ---
  function setLoading(show, text, progress) {
    text = text || '正在处理...';
    progress = progress || 0;
    var overlay = document.getElementById('loading-overlay');
    var txt = document.getElementById('loading-text');
    var bar = document.getElementById('progress-bar');
    if (show) {
      overlay.classList.add('show');
      txt.textContent = text;
      bar.style.width = progress + '%';
    } else {
      overlay.classList.remove('show');
    }
  }

  // --- Local storage for settings ---
  var STORAGE_KEY = 'savetonotion-settings';
  var LEGACY_KEY = 'u2n-settings';
  var DEFAULTS = {
    notionApiKey: '', notionVersion: '2022-06-28', aiProvider: 'openai',
    aiModel: 'gpt-4o', aiBaseUrl: 'https://api.openai.com/v1', aiApiKey: '', extraPrompt: ''
  };
  function loadLocalSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw && LEGACY_KEY) raw = localStorage.getItem(LEGACY_KEY);
      return Object.assign({}, DEFAULTS, JSON.parse(raw || '{}'));
    }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function saveLocalSettings(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
  function getSettingsFromForm() {
    return {
      notionApiKey: document.getElementById('notion-key').value.trim(),
      notionVersion: document.getElementById('notion-version').value.trim(),
      aiProvider: document.getElementById('ai-provider').value,
      aiModel: document.getElementById('ai-model').value.trim(),
      aiBaseUrl: document.getElementById('ai-base-url').value.trim(),
      aiApiKey: document.getElementById('ai-key').value.trim(),
      extraPrompt: document.getElementById('extra-prompt').value.trim(),
    };
  }
  function applySettingsToForm(s) {
    document.getElementById('notion-key').value = s.notionApiKey || '';
    document.getElementById('notion-version').value = s.notionVersion || '2022-06-28';
    document.getElementById('ai-provider').value = s.aiProvider || 'openai';
    document.getElementById('ai-model').value = s.aiModel || 'gpt-4o';
    document.getElementById('ai-base-url').value = s.aiBaseUrl || 'https://api.openai.com/v1';
    document.getElementById('ai-key').value = s.aiApiKey || '';
    document.getElementById('extra-prompt').value = s.extraPrompt || '';
  }

  // --- Load settings ---
  async function loadSettings() {
    try {
      var s = loadLocalSettings();
      applySettingsToForm(s);
      settingsCache = s;
      onProviderChange();
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }

  // --- Save settings ---
  async function saveSettings() {
    var btn = document.getElementById('btn-save-settings');
    btn.disabled = true;
    try {
      var s = getSettingsFromForm();
      saveLocalSettings(s);
      settingsCache = s;
      showStatus('settings-status', 'success', '\u2705 \u8bbe\u7f6e\u5df2\u4fdd\u5b58');
    } catch (e) {
      showStatus('settings-status', 'error', '\u274c ' + e.message);
    } finally {
      btn.disabled = false;
    }
  }

  // --- Test Notion ---
  async function testNotion() {
    showStatus('notion-test-status', '', '\u6b63\u5728\u6d4b\u8bd5...', true);
    try {
      await api('/settings/test-notion', { method: 'POST', body: JSON.stringify(getSettingsFromForm()) });
      showStatus('notion-test-status', 'success', '\u2705 Notion \u8fde\u63a5\u6b63\u5e38');
    } catch (e) {
      showStatus('notion-test-status', 'error', '\u274c ' + e.message);
    }
  }

  // --- Test AI ---
  async function testAI() {
    showStatus('ai-test-status', '', '\u6b63\u5728\u6d4b\u8bd5...', true);
    try {
      await api('/settings/test-ai', { method: 'POST', body: JSON.stringify(getSettingsFromForm()) });
      showStatus('ai-test-status', 'success', '\u2705 AI \u8fde\u63a5\u6b63\u5e38');
    } catch (e) {
      showStatus('ai-test-status', 'error', '\u274c ' + e.message);
    }
  }

  // --- Provider change ---
  function onProviderChange() {
    var provider = document.getElementById('ai-provider').value;
    var baseUrl = document.getElementById('ai-base-url');
    var model = document.getElementById('ai-model');
    if (provider === 'anthropic') {
      if (baseUrl.value.indexOf('openai') !== -1) baseUrl.value = 'https://api.anthropic.com/v1';
      if (model.value.indexOf('gpt') !== -1) model.value = 'claude-haiku-4-20250514';
    } else {
      if (baseUrl.value.indexOf('anthropic') !== -1) baseUrl.value = 'https://api.openai.com/v1';
      if (model.value.indexOf('claude') !== -1) model.value = 'gpt-4o';
    }
  }

  // --- Load Notion pages (tree + search) ---
  var parentSearchTimer = null;

  function renderParentTree(pages, selectedId) {
    var sel = document.getElementById('parent-select');
    sel.innerHTML = '<option value="">请选择目标页面...</option>';
    if (!pages || !pages.length) return;
    var byId = {};
    pages.forEach(function (p) {
      byId[p.id] = { id: p.id, title: p.title || 'Untitled', parentId: p.parentId, children: [] };
    });
    var roots = [];
    pages.forEach(function (p) {
      var node = byId[p.id];
      if (p.parentId && byId[p.parentId]) byId[p.parentId].children.push(node);
      else roots.push(node);
    });
    function sortNodes(nodes) {
      nodes.sort(function (a, b) { return a.title.localeCompare(b.title); });
      nodes.forEach(function (n) { sortNodes(n.children); });
    }
    sortNodes(roots);
    var flat = [];
    (function flatten(nodes, depth) {
      nodes.forEach(function (n) {
        flat.push({ id: n.id, title: n.title, depth: depth });
        flatten(n.children, depth + 1);
      });
    })(roots, 0);
    flat.forEach(function (n) {
      var opt = document.createElement('option');
      opt.value = n.id;
      opt.textContent = (n.depth > 0 ? ' '.repeat(n.depth) + '↳ ' : '') + n.title;
      if (n.id === selectedId) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  async function loadNotionPages(query) {
    var sel = document.getElementById('parent-select');
    var selected = sel.value;
    sel.innerHTML = '<option value="">加载中...</option>';
    try {
      var payload = getSettingsFromForm();
      if (query) payload.query = query;
      var data = await api('/settings/notion-pages', { method: 'POST', body: JSON.stringify(payload) });
      renderParentTree(data.pages || [], selected);
    } catch (e) {
      sel.innerHTML = '<option value="">加载失败: ' + e.message + '</option>';
    }
  }

  function onParentSearch() {
    if (parentSearchTimer) clearTimeout(parentSearchTimer);
    parentSearchTimer = setTimeout(function () {
      loadNotionPages(document.getElementById('parent-search').value.trim());
    }, 300);
  }

  // --- Markdown export ---
  let lastPreview = null;

  function sanitizeFilename(name) {
    name = (name || 'savetonotion-export').trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    return name.slice(0, 80) || 'savetonotion-export';
  }

  function buildMarkdownContent(data, note) {
    var md = (data && data.processedContent) || '';
    if (note) md += '\n\n> 💡 备注: ' + note;
    return md;
  }

  function triggerMarkdownDownload(data, note) {
    var md = buildMarkdownContent(data, note);
    var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFilename(data && data.title) + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return a.download;
  }

  async function copyMarkdown() {
    if (!lastPreview) return;
    try {
      var note = document.getElementById('extract-note').value.trim();
      await navigator.clipboard.writeText(buildMarkdownContent(lastPreview, note));
      showStatus('extract-status', 'success', '✅ 已复制到剪贴板');
    } catch (e) {
      showStatus('extract-status', 'error', '❌ 复制失败：' + e.message);
    }
  }

  function downloadMarkdown() {
    if (!lastPreview) return;
    var note = document.getElementById('extract-note').value.trim();
    var filename = triggerMarkdownDownload(lastPreview, note);
    showStatus('extract-status', 'success', '✅ Markdown 文件已下载：' + filename);
  }

  async function doExportMarkdown() {
    var url = document.getElementById('extract-url').value.trim();
    if (!url) {
      showStatus('extract-status', 'error', '请输入网页链接');
      return;
    }
    var note = document.getElementById('extract-note').value.trim();
    var promptOverride = document.getElementById('prompt-override').value.trim();
    hideStatus('extract-status');
    setLoading(true, '正在提取并整理 Markdown...', 30);
    try {
      var data = lastPreview && lastPreview.url === url ? lastPreview : await api('/extract/preview', {
        method: 'POST',
        body: JSON.stringify({ url: url, promptOverride: promptOverride, settings: getSettingsFromForm() }),
      });
      lastPreview = data;
      document.getElementById('preview-card').style.display = 'block';
      document.getElementById('preview-title-tag').textContent = data.title || url;
      document.getElementById('preview-content').textContent = buildMarkdownContent(data, note) || '(无内容)';
      var filename = triggerMarkdownDownload(data, note);
      showStatus('extract-status', 'success', '✅ Markdown 文件已下载：' + filename);
    } catch (e) {
      showStatus('extract-status', 'error', '❌ ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Preview ---
  async function doPreview() {
    var url = document.getElementById('extract-url').value.trim();
    if (!url) {
      showStatus('extract-status', 'error', '\u8bf7\u8f93\u5165\u7f51\u9875\u94fe\u63a5');
      return;
    }
    hideStatus('extract-status');
    setLoading(true, '\u6b63\u5728\u63d0\u53d6\u5e76\u5206\u6790\u7f51\u9875\u5185\u5bb9...', 30);
    try {
      var data = await api('/extract/preview', {
        method: 'POST',
        body: JSON.stringify({ url: url, settings: getSettingsFromForm() }),
      });
      document.getElementById('preview-card').style.display = 'block';
      document.getElementById('preview-title-tag').textContent = data.title || url;
      document.getElementById('preview-content').textContent = buildMarkdownContent(data, document.getElementById('extract-note').value.trim()) || '(\u65e0\u5185\u5bb9)';
      lastPreview = data;
      showStatus('extract-status', 'success', '\u2705 \u9884\u89c8\u5b8c\u6210 \u2014 \u786e\u8ba4\u65e0\u8bef\u540e\u70b9\u51fb"\u63d0\u53d6\u5e76\u4fdd\u5b58"');
    } catch (e) {
      showStatus('extract-status', 'error', '\u274c ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Extract & Save ---
  async function doExtract() {
    var url = document.getElementById('extract-url').value.trim();
    if (!url) {
      showStatus('extract-status', 'error', '\u8bf7\u8f93\u5165\u7f51\u9875\u94fe\u63a5');
      return;
    }
    var parentId = document.getElementById('parent-select').value.trim();
    if (!parentId) {
      showStatus('extract-status', 'error', '\u8bf7\u9009\u62e9\u4e00\u4e2a Notion \u76ee\u6807\u9875\u9762\uff08\u9700\u5728 Notion \u4e2d\u5c06\u9875\u9762\u6388\u6743\u7ed9\u96c6\u6210\uff09');
      return;
    }
    hideStatus('extract-status');
    setLoading(true, '\u6b63\u5728\u63d0\u53d6\u5185\u5bb9...', 20);
    try {
      var result = await api('/extract', {
        method: 'POST',
        body: JSON.stringify({
          url: url,
          parentId: parentId,
          note: document.getElementById('extract-note').value.trim(),
          promptOverride: document.getElementById('prompt-override').value.trim(),
          settings: getSettingsFromForm(),
        }),
      });
      setLoading(true, '\u6b63\u5728\u4fdd\u5b58\u5230 Notion...', 60);
      await (function(wait){ return function(resolve){ setTimeout(resolve, wait); }})(800);
      showStatus('extract-status', 'success', '\u2705 \u5df2\u6210\u529f\u4fdd\u5b58\u5230 Notion\uff01\u6807\u9898: ' + (result.title || url));
      setLoading(false);
    } catch (e) {
      showStatus('extract-status', 'error', '\u274c ' + e.message);
      setLoading(false);
    }
  }

  // --- Init ---
  loadSettings();

  // Expose handlers so inline onclick/onchange in HTML can reach them
  window.saveSettings = saveSettings;
  window.testNotion = testNotion;
  window.testAI = testAI;
  window.loadNotionPages = loadNotionPages;
  window.onParentSearch = onParentSearch;
  window.doPreview = doPreview;
  window.doExtract = doExtract;
  window.doExportMarkdown = doExportMarkdown;
  window.copyMarkdown = copyMarkdown;
  window.downloadMarkdown = downloadMarkdown;
  window.onProviderChange = onProviderChange;
})();

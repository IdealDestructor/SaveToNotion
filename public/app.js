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

  // --- Load settings ---
  async function loadSettings() {
    try {
      settingsCache = await api('/settings');
      document.getElementById('notion-key').value = settingsCache.notionApiKey || '';
      document.getElementById('notion-version').value = settingsCache.notionVersion || '2022-06-28';
      document.getElementById('ai-provider').value = settingsCache.aiProvider || 'openai';
      document.getElementById('ai-model').value = settingsCache.aiModel || 'gpt-4o';
      document.getElementById('ai-base-url').value = settingsCache.aiBaseUrl || 'https://api.openai.com/v1';
      document.getElementById('ai-key').value = settingsCache.aiApiKey || '';
      document.getElementById('extra-prompt').value = settingsCache.extraPrompt || '';
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
      await api('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          notionApiKey: document.getElementById('notion-key').value.trim(),
          notionVersion: document.getElementById('notion-version').value.trim(),
          aiProvider: document.getElementById('ai-provider').value,
          aiModel: document.getElementById('ai-model').value.trim(),
          aiBaseUrl: document.getElementById('ai-base-url').value.trim(),
          aiApiKey: document.getElementById('ai-key').value.trim(),
          extraPrompt: document.getElementById('extra-prompt').value.trim(),
        }),
      });
      showStatus('settings-status', 'success', '\u2705 \u8bbe\u7f6e\u5df2\u4fdd\u5b58');
      loadSettings();
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
      await api('/settings/test-notion');
      showStatus('notion-test-status', 'success', '\u2705 Notion \u8fde\u63a5\u6b63\u5e38');
    } catch (e) {
      showStatus('notion-test-status', 'error', '\u274c ' + e.message);
    }
  }

  // --- Test AI ---
  async function testAI() {
    showStatus('ai-test-status', '', '\u6b63\u5728\u6d4b\u8bd5...', true);
    try {
      await api('/settings/test-ai');
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

  // --- Load Notion pages ---
  async function loadNotionPages() {
    var sel = document.getElementById('parent-select');
    sel.innerHTML = '<option value="">\u52a0\u8f7d\u4e2d...</option>';
    try {
      var data = await api('/settings/notion-pages');
      sel.innerHTML = '<option value="">Notion \u5de5\u4f5c\u533a\uff08\u6839\u76ee\u5f55\uff09</option>';
      var pages = data.pages || [];
      for (var i = 0; i < pages.length; i++) {
        var opt = document.createElement('option');
        opt.value = pages[i].id;
        opt.textContent = pages[i].title;
        sel.appendChild(opt);
      }
      if (pages.length === 0) {
        sel.innerHTML = '<option value="">Notion \u5de5\u4f5c\u533a\uff08\u6839\u76ee\u5f55\uff09</option>';
      }
    } catch (e) {
      sel.innerHTML = '<option value="">\u52a0\u8f7d\u5931\u8d25: ' + e.message + '</option>';
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
        body: JSON.stringify({ url: url }),
      });
      document.getElementById('preview-card').style.display = 'block';
      document.getElementById('preview-title-tag').textContent = data.title || url;
      document.getElementById('preview-content').textContent = data.processedContent || '(\u65e0\u5185\u5bb9)';
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
    hideStatus('extract-status');
    setLoading(true, '\u6b63\u5728\u63d0\u53d6\u5185\u5bb9...', 20);
    try {
      var result = await api('/extract', {
        method: 'POST',
        body: JSON.stringify({
          url: url,
          parentId: document.getElementById('parent-select').value,
          note: document.getElementById('extract-note').value.trim(),
          promptOverride: document.getElementById('prompt-override').value.trim(),
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
})();

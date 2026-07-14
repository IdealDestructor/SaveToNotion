(function() {
  'use strict';

  let settingsCache = null;
  var applyingSettings = false;
  var settingsSaveTimer = null;

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
    notionApiKey: '', aiProvider: 'openai',
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
      aiProvider: document.getElementById('ai-provider').value,
      aiModel: document.getElementById('ai-model').value.trim(),
      aiBaseUrl: document.getElementById('ai-base-url').value.trim(),
      aiApiKey: document.getElementById('ai-key').value.trim(),
      extraPrompt: document.getElementById('extra-prompt').value.trim(),
    };
  }
  function applySettingsToForm(s) {
    document.getElementById('notion-key').value = s.notionApiKey || '';
    document.getElementById('ai-provider').value = s.aiProvider || 'openai';
    document.getElementById('ai-model').value = s.aiModel || 'gpt-4o';
    document.getElementById('ai-base-url').value = s.aiBaseUrl || 'https://api.openai.com/v1';
    document.getElementById('ai-key').value = s.aiApiKey || '';
    document.getElementById('extra-prompt').value = s.extraPrompt || '';
  }

  // --- Load settings ---
  async function loadSettings() {
    applyingSettings = true;
    try {
      var s = loadLocalSettings();
      applySettingsToForm(s);
      settingsCache = s;
      onProviderChange();
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      applyingSettings = false;
    }
  }

  // --- Save settings (auto-save on change) ---
  async function saveSettings(opts) {
    opts = opts || {};
    var statusId = 'settings-status';
    try {
      var prevKey = (settingsCache && settingsCache.notionApiKey) || '';
      var s = getSettingsFromForm();
      saveLocalSettings(s);
      settingsCache = s;
      if ((prevKey || '') !== (s.notionApiKey || '')) {
        clearRootsCache();
        writeLastParent([]);
        setSelectedParent([], false);
      }
      if (!opts.silent) {
        showStatus(statusId, 'success', '✅ 设置已自动保存');
      }
    } catch (e) {
      showStatus(statusId, 'error', '❌ ' + e.message);
    }
  }

  function scheduleAutoSaveSettings() {
    if (applyingSettings) return;
    if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
    settingsSaveTimer = setTimeout(function () {
      saveSettings({ silent: false });
    }, 400);
  }

  function bindSettingsAutoSave() {
    var ids = ['notion-key', 'ai-model', 'ai-base-url', 'ai-key', 'extra-prompt'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', scheduleAutoSaveSettings);
      el.addEventListener('change', scheduleAutoSaveSettings);
    });
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
    scheduleAutoSaveSettings();
  }

  // --- Notion page cascader (single trigger + multi-column panel) ---
  var parentSearchTimer = null;
  var cascadeColumns = []; // [{ parentId, pages, activeId }]
  var childrenCache = {}; // parentId -> pages[]
  var rootsCache = null;
  var cascadeMode = 'cascade'; // 'cascade' | 'search'
  var cascadeLoading = false;
  var cascadeBootstrapped = false;
  var selectedPath = []; // [{ id, title }]
  var panelOpen = false;
  var rootsFetchedAt = 0;

  // Roots cache: TTL 30min; invalidate when Notion API Key changes or manual refresh
  var ROOTS_CACHE_TTL_MS = 30 * 60 * 1000;
  var ROOTS_CACHE_KEY = 'savetonotion-roots-cache';
  var LAST_PARENT_KEY = 'savetonotion-last-parent';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getApiFingerprint() {
    var key = (getSettingsFromForm().notionApiKey || '').trim();
    if (!key) return '';
    return key.length + ':' + key.slice(-8);
  }

  function formatCacheAge(fetchedAt) {
    if (!fetchedAt) return '';
    var mins = Math.max(0, Math.floor((Date.now() - fetchedAt) / 60000));
    if (mins < 1) return '刚刚更新';
    if (mins < 60) return mins + ' 分钟前缓存';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + ' 小时前缓存';
    return Math.floor(hours / 24) + ' 天前缓存';
  }

  function readRootsCache() {
    try {
      var raw = JSON.parse(localStorage.getItem(ROOTS_CACHE_KEY) || 'null');
      if (!raw || !Array.isArray(raw.pages)) return null;
      if (raw.apiKeyFingerprint !== getApiFingerprint()) return null;
      return raw;
    } catch (e) {
      return null;
    }
  }

  function isRootsCacheFresh(cache) {
    return !!(cache && typeof cache.fetchedAt === 'number' && (Date.now() - cache.fetchedAt) < ROOTS_CACHE_TTL_MS);
  }

  function writeRootsCache(pages) {
    rootsCache = pages || [];
    rootsFetchedAt = Date.now();
    try {
      localStorage.setItem(ROOTS_CACHE_KEY, JSON.stringify({
        pages: rootsCache,
        fetchedAt: rootsFetchedAt,
        apiKeyFingerprint: getApiFingerprint(),
      }));
    } catch (e) { /* ignore quota */ }
  }

  function clearRootsCache() {
    rootsCache = null;
    rootsFetchedAt = 0;
    cascadeBootstrapped = false;
    childrenCache = {};
    try { localStorage.removeItem(ROOTS_CACHE_KEY); } catch (e) { /* ignore */ }
  }

  function readLastParent() {
    try {
      var raw = JSON.parse(localStorage.getItem(LAST_PARENT_KEY) || 'null');
      if (!raw || !Array.isArray(raw.path) || !raw.path.length) return null;
      if (raw.apiKeyFingerprint && raw.apiKeyFingerprint !== getApiFingerprint()) return null;
      return raw.path.filter(function (p) { return p && p.id; });
    } catch (e) {
      return null;
    }
  }

  function writeLastParent(path) {
    try {
      if (!path || !path.length) {
        localStorage.removeItem(LAST_PARENT_KEY);
        return;
      }
      localStorage.setItem(LAST_PARENT_KEY, JSON.stringify({
        path: path.map(function (p) { return { id: p.id, title: p.title || 'Untitled' }; }),
        savedAt: Date.now(),
        apiKeyFingerprint: getApiFingerprint(),
      }));
    } catch (e) { /* ignore */ }
  }

  function updateRootsHint(extra) {
    var hint = document.getElementById('cascader-hint');
    var age = formatCacheAge(rootsFetchedAt);
    var base = age
      ? ('点击可选中；向右展开子页面 · ' + age)
      : '点击页面可选中；有子页面时向右展开';
    hint.textContent = extra || base;
  }

  function setSelectedParent(path, persist) {
    selectedPath = path || [];
    var id = selectedPath.length ? selectedPath[selectedPath.length - 1].id : '';
    document.getElementById('parent-select').value = id;
    var label = document.getElementById('cascader-label');
    var confirmBtn = document.getElementById('cascader-confirm');
    if (!id) {
      label.textContent = '请选择 Notion 页面';
      label.classList.remove('has-value');
      confirmBtn.disabled = true;
      if (persist) writeLastParent([]);
      return;
    }
    label.textContent = selectedPath.map(function (p) { return p.title; }).join(' / ');
    label.classList.add('has-value');
    confirmBtn.disabled = false;
    if (persist !== false) writeLastParent(selectedPath);
  }

  function restoreLastParent() {
    var path = readLastParent();
    if (path && path.length) setSelectedParent(path, false);
  }

  function fetchNotionPages(opts) {
    opts = opts || {};
    var payload = getSettingsFromForm();
    if (opts.query) payload.query = opts.query;
    if (opts.parentId) payload.parentId = opts.parentId;
    return api('/settings/notion-pages', { method: 'POST', body: JSON.stringify(payload) })
      .then(function (data) { return data.pages || []; });
  }

  function openCascaderPanel() {
    panelOpen = true;
    document.getElementById('parent-cascader').classList.add('open');
    document.getElementById('cascader-panel').hidden = false;
    document.getElementById('cascader-trigger').setAttribute('aria-expanded', 'true');
  }

  function closeCascaderPanel() {
    panelOpen = false;
    document.getElementById('parent-cascader').classList.remove('open');
    document.getElementById('cascader-panel').hidden = true;
    document.getElementById('cascader-trigger').setAttribute('aria-expanded', 'false');
  }

  function toggleCascaderPanel() {
    if (panelOpen) closeCascaderPanel();
    else {
      openCascaderPanel();
      bootstrapCascade();
    }
  }

  function applyRootsToColumns(roots, activeId) {
    cascadeColumns = [{
      parentId: null,
      pages: roots || [],
      activeId: activeId || '',
      loadingId: null,
    }];
    cascadeBootstrapped = true;
    cascadeMode = 'cascade';
    updateRootsHint();
    renderCascaderMenus();
  }

  function renderCascaderMenus() {
    var menus = document.getElementById('cascader-menus');
    menus.innerHTML = '';

    if (cascadeLoading && !cascadeColumns.length) {
      menus.innerHTML = '<div class="cascader-loading"><div class="spinner"></div><span>正在加载目录...</span></div>';
      return;
    }
    if (!cascadeColumns.length) {
      menus.innerHTML = '<div class="cascader-empty">暂无可用页面，请确认已授权 Notion 集成</div>';
      return;
    }

    cascadeColumns.forEach(function (col, colIndex) {
      var menu = document.createElement('div');
      menu.className = 'cascader-menu';

      if (col.loading) {
        menu.innerHTML = '<div class="cascader-loading"><div class="spinner"></div><span>加载子页面...</span></div>';
        menus.appendChild(menu);
        return;
      }

      if (!col.pages || !col.pages.length) {
        menu.innerHTML = '<div class="cascader-empty">' + (colIndex === 0 ? '暂无页面' : '无子页面') + '</div>';
        menus.appendChild(menu);
        return;
      }

      col.pages.forEach(function (page) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cascader-item' + (page.id === col.activeId ? ' active' : '');
        var isLoading = col.loadingId === page.id;
        if (isLoading) btn.classList.add('loading');
        btn.innerHTML =
          '<span class="cascader-item-label">' + escapeHtml(page.title || 'Untitled') + '</span>' +
          (isLoading
            ? '<div class="spinner"></div>'
            : '<svg class="cascader-item-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 6l6 6-6 6"/></svg>');
        btn.addEventListener('click', function () {
          onCascaderPick(colIndex, page);
        });
        menu.appendChild(btn);
      });
      menus.appendChild(menu);
    });

    menus.scrollLeft = menus.scrollWidth;
  }

  async function onCascaderPick(colIndex, page) {
    cascadeColumns = cascadeColumns.slice(0, colIndex + 1);
    cascadeColumns[colIndex].activeId = page.id;
    cascadeColumns[colIndex].loadingId = page.id;

    var path = [];
    for (var i = 0; i <= colIndex; i++) {
      var activeId = cascadeColumns[i].activeId;
      var found = (cascadeColumns[i].pages || []).find(function (p) { return p.id === activeId; });
      if (found) path.push({ id: found.id, title: found.title || 'Untitled' });
    }
    setSelectedParent(path);

    if (cascadeMode === 'search') {
      cascadeColumns[colIndex].loadingId = null;
      renderCascaderMenus();
      return;
    }

    var cached = childrenCache[page.id];
    if (cached) {
      cascadeColumns[colIndex].loadingId = null;
      if (cached.length) {
        cascadeColumns.push({ parentId: page.id, pages: cached, activeId: '', loadingId: null, loading: false });
      }
      renderCascaderMenus();
      return;
    }

    // Show next-column loading placeholder while fetching
    cascadeColumns.push({ parentId: page.id, pages: [], activeId: '', loadingId: null, loading: true });
    renderCascaderMenus();
    updateRootsHint('正在加载「' + (page.title || 'Untitled') + '」的子页面…');

    try {
      var children = await fetchNotionPages({ parentId: page.id });
      childrenCache[page.id] = children;
      cascadeColumns = cascadeColumns.slice(0, colIndex + 1);
      cascadeColumns[colIndex].activeId = page.id;
      cascadeColumns[colIndex].loadingId = null;
      if (children.length) {
        cascadeColumns.push({ parentId: page.id, pages: children, activeId: '', loadingId: null, loading: false });
        updateRootsHint();
      } else {
        updateRootsHint('「' + (page.title || 'Untitled') + '」下暂无子页面，可直接确认选择');
      }
      renderCascaderMenus();
    } catch (e) {
      cascadeColumns = cascadeColumns.slice(0, colIndex + 1);
      cascadeColumns[colIndex].loadingId = null;
      updateRootsHint('子页面加载失败: ' + e.message);
      renderCascaderMenus();
    }
  }

  async function loadRootsFromNetwork() {
    var roots = await fetchNotionPages();
    writeRootsCache(roots);
    return roots;
  }

  async function bootstrapCascade(force) {
    if (cascadeLoading) return;
    if (!force && cascadeBootstrapped && cascadeMode === 'cascade' && cascadeColumns.length) {
      renderCascaderMenus();
      return;
    }

    cascadeMode = 'cascade';
    var cached = readRootsCache();
    var activeRootId = selectedPath.length ? selectedPath[0].id : '';

    // Use localStorage cache immediately when available
    if (!force && cached) {
      rootsCache = cached.pages;
      rootsFetchedAt = cached.fetchedAt;
      applyRootsToColumns(rootsCache, activeRootId);

      // Stale-while-revalidate: refresh in background after TTL
      if (!isRootsCacheFresh(cached)) {
        updateRootsHint(formatCacheAge(cached.fetchedAt) + '（已过期，正在刷新…）');
        try {
          var fresh = await loadRootsFromNetwork();
          if (cascadeMode === 'cascade') {
            var keepActive = cascadeColumns[0] && cascadeColumns[0].activeId;
            applyRootsToColumns(fresh, keepActive || activeRootId);
          }
        } catch (e) {
          updateRootsHint(formatCacheAge(cached.fetchedAt) + '（刷新失败，仍使用缓存）');
        }
      }
      return;
    }

    cascadeLoading = true;
    cascadeColumns = [];
    renderCascaderMenus();
    try {
      var roots = await loadRootsFromNetwork();
      applyRootsToColumns(roots, activeRootId);
    } catch (e) {
      cascadeBootstrapped = false;
      cascadeColumns = [];
      document.getElementById('cascader-menus').innerHTML =
        '<div class="cascader-empty">加载失败: ' + escapeHtml(e.message) + '</div>';
    } finally {
      cascadeLoading = false;
    }
  }

  async function refreshRootsCache() {
    if (cascadeLoading) return;
    childrenCache = {};
    cascadeMode = 'cascade';
    cascadeLoading = true;
    cascadeColumns = [];
    document.getElementById('parent-search').value = '';
    updateRootsHint('正在刷新一级目录…');
    renderCascaderMenus();
    var keepActive = selectedPath[0] && selectedPath[0].id;
    try {
      var roots = await loadRootsFromNetwork();
      applyRootsToColumns(roots, keepActive || '');
      updateRootsHint('已刷新 · ' + formatCacheAge(rootsFetchedAt));
    } catch (e) {
      updateRootsHint('刷新失败: ' + e.message);
      document.getElementById('cascader-menus').innerHTML =
        '<div class="cascader-empty">刷新失败: ' + escapeHtml(e.message) + '</div>';
    } finally {
      cascadeLoading = false;
    }
  }

  async function loadNotionPages(query) {
    query = (query || '').trim();
    if (!query) {
      cascadeMode = 'cascade';
      if (rootsCache) {
        applyRootsToColumns(rootsCache, selectedPath[0] && selectedPath[0].id);
      } else {
        await bootstrapCascade(true);
      }
      return;
    }

    cascadeMode = 'search';
    cascadeLoading = true;
    cascadeColumns = [];
    renderCascaderMenus();
    document.getElementById('cascader-hint').textContent = '正在搜索…';
    try {
      var pages = await fetchNotionPages({ query: query });
      cascadeColumns = [{ parentId: null, pages: pages, activeId: '', loadingId: null, loading: false }];
      document.getElementById('cascader-hint').textContent = pages.length
        ? '搜索模式：点击结果即可选中'
        : '未找到匹配页面';
      renderCascaderMenus();
    } catch (e) {
      document.getElementById('cascader-menus').innerHTML =
        '<div class="cascader-empty">搜索失败: ' + escapeHtml(e.message) + '</div>';
      document.getElementById('cascader-hint').textContent = '搜索失败';
    } finally {
      cascadeLoading = false;
    }
  }

  function onParentSearch() {
    if (parentSearchTimer) clearTimeout(parentSearchTimer);
    parentSearchTimer = setTimeout(function () {
      loadNotionPages(document.getElementById('parent-search').value.trim());
    }, 300);
  }

  function bindCascaderUi() {
    document.getElementById('cascader-trigger').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleCascaderPanel();
    });
    document.getElementById('cascader-confirm').addEventListener('click', function () {
      if (document.getElementById('parent-select').value) {
        writeLastParent(selectedPath);
        closeCascaderPanel();
      }
    });
    document.getElementById('cascader-refresh').addEventListener('click', function (e) {
      e.stopPropagation();
      refreshRootsCache();
    });
    document.getElementById('parent-search').addEventListener('input', onParentSearch);
    document.getElementById('cascader-panel').addEventListener('click', function (e) {
      e.stopPropagation();
    });
    document.addEventListener('click', function () {
      if (panelOpen) closeCascaderPanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panelOpen) closeCascaderPanel();
    });
  }

  // --- Markdown export ---
  let lastPreview = null;

  function sanitizeFilename(name) {
    name = (name || 'savetonotion-export').trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
    return name.slice(0, 80) || 'savetonotion-export';
  }

  function buildMarkdownContent(data) {
    return (data && data.processedContent) || '';
  }

  function triggerMarkdownDownload(data) {
    var md = buildMarkdownContent(data);
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
      await navigator.clipboard.writeText(buildMarkdownContent(lastPreview));
      showStatus('extract-status', 'success', '✅ 已复制到剪贴板');
    } catch (e) {
      showStatus('extract-status', 'error', '❌ 复制失败：' + e.message);
    }
  }

  function downloadMarkdown() {
    if (!lastPreview) return;
    var filename = triggerMarkdownDownload(lastPreview);
    showStatus('extract-status', 'success', '✅ Markdown 文件已下载：' + filename);
  }

  async function doExportMarkdown() {
    var url = document.getElementById('extract-url').value.trim();
    if (!url) {
      showStatus('extract-status', 'error', '请输入网页链接');
      return;
    }
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
      document.getElementById('preview-content').textContent = buildMarkdownContent(data) || '(无内容)';
      var filename = triggerMarkdownDownload(data);
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
      document.getElementById('preview-content').textContent = buildMarkdownContent(data) || '(\u65e0\u5185\u5bb9)';
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
  bindSettingsAutoSave();
  bindCascaderUi();
  restoreLastParent();

  // Warm roots cache in background if already present / expired
  (function warmRootsCache() {
    var cached = readRootsCache();
    if (cached) {
      rootsCache = cached.pages;
      rootsFetchedAt = cached.fetchedAt;
    }
  })();

  // Expose handlers so inline onclick/onchange in HTML can reach them
  window.saveSettings = saveSettings;
  window.testNotion = testNotion;
  window.testAI = testAI;
  window.doPreview = doPreview;
  window.doExtract = doExtract;
  window.doExportMarkdown = doExportMarkdown;
  window.copyMarkdown = copyMarkdown;
  window.downloadMarkdown = downloadMarkdown;
  window.onProviderChange = onProviderChange;
})();

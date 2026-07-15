(function() {
  'use strict';

  // --- i18n & theme ---
  var LOCALE_KEY = 'savetonotion-locale';
  var THEME_KEY = 'savetonotion-theme';
  var I18N = {
    zh: {
      tabHome: '首页', tabSettings: '设置', tabAbout: '关于',
      toggleTheme: '切换主题（系统 / 浅色 / 深色）',
      themeSystem: '跟随系统',
      themeLight: '浅色',
      themeDark: '深色',
      toggleLang: 'Switch to English',
      heroTitleBefore: '把一个网页', heroTitleGrad: '变成一篇 Notion 笔记',
      heroDesc: '粘贴链接，AI 自动提炼正文、整理为结构化 Markdown，可存入 Notion 或直接导出 .md 文件。',
      labelUrl: '网页链接', phUrl: 'https://example.com/article',
      labelTarget: '保存目标', hintTarget: '必选；需先在 Notion 中授权页面给集成',
      selectPage: '请选择 Notion 页面', phSearchPages: '搜索页面...',
      cascaderHint: '点击页面可选中；有子页面时向右展开',
      refreshRoots: '刷新目录', confirmSelect: '确认选择',
      labelPrompt: '自定义提示词', hintPrompt: '可选，覆盖默认 AI 指令',
      phPrompt: '例如：用中文总结，保留所有小标题...',
      optTextOnly: '无图模式',
      optTextOnlyHint: '不抓取图片/视频，仅整理文字内容',
      btnPreview: '预览', btnExportMd: '导出 Markdown', btnSave: '保存到 Notion',
      previewTitle: '预览', previewDesc: 'AI 处理后的内容预览',
      btnCopy: '复制', btnDownloadMd: '下载 Markdown',
      settingsNotion: 'Notion 配置',
      settingsNotionDesc: '在 Notion 的', settingsNotionDesc2: '页面创建集成并获取 API Key。',
      settingsAi: 'AI 配置', settingsAiDesc: '选择 AI 提供商与模型，用于内容整理。',
      labelProvider: 'AI 提供商', labelModel: '模型', btnTest: '测试连接',
      settingsExtra: '额外提示词', settingsExtraDesc: '会追加到默认 AI 指令之前。',
      labelExtraPrompt: '自定义提示词', phExtraPrompt: '例如：请用中文总结以下内容...',
      aboutTitle: '关于 Save to Notion',
      aboutLead: '一键提取网页内容，经 AI 整理后保存到 Notion，或导出为 Markdown。',
      aboutProject: '项目说明',
      aboutLi1: '粘贴网页链接，自动抓取正文并用 AI 整理为结构化 Markdown',
      aboutLi2: '支持保存到 Notion 指定页面，或直接导出 / 复制 Markdown',
      aboutLi3: '兼容 OpenAI 与 Anthropic（Claude）接口，密钥保存在浏览器本地',
      aboutLi4: '目标页面支持级联选择与搜索，配置修改后自动保存',
      aboutAuthor: '作者与仓库', aboutAuthorDesc: '开源项目，欢迎 Star、提 Issue 与 PR。',
      aboutRepo: '项目仓库', aboutIssues: '问题反馈',
      aboutLicense: '开源协议',
      aboutLicenseDesc: '本项目采用 <strong>MIT License</strong> 发布。Copyright © 2026 IdealDestructor。',
      aboutLicenseNote: '你可以自由使用、修改与分发本软件，但需保留版权声明与协议文本。软件按「原样」提供，作者不承担任何明示或暗示的担保责任。',
      aboutLicenseLink: '查看完整 LICENSE →',
      footerTagline: '把网页优雅地搬进 Notion', loading: '正在处理...',
      requestFailed: '请求失败', processing: '正在处理...',
      settingsSaved: '✅ 设置已自动保存',
      testing: '正在测试...', notionOk: '✅ Notion 连接正常', aiOk: '✅ AI 连接正常',
      justNow: '刚刚更新', minsAgo: '{n} 分钟前缓存', hoursAgo: '{n} 小时前缓存', daysAgo: '{n} 天前缓存',
      cascaderHintExpand: '点击可选中；向右展开子页面 · {age}',
      loadingRoots: '正在加载目录...', noPages: '暂无可用页面，请确认已授权 Notion 集成',
      loadingChildren: '加载子页面...', noPagesShort: '暂无页面', noChildren: '无子页面',
      loadingChildrenOf: '正在加载「{title}」的子页面…',
      noChildrenConfirm: '「{title}」下暂无子页面，可直接确认选择',
      childrenFail: '子页面加载失败: {msg}',
      cacheExpired: '{age}（已过期，正在刷新…）',
      cacheRefreshFail: '{age}（刷新失败，仍使用缓存）',
      loadFail: '加载失败: {msg}', refreshingRoots: '正在刷新一级目录…',
      refreshed: '已刷新 · {age}', refreshFail: '刷新失败: {msg}',
      searching: '正在搜索…', searchMode: '搜索模式：点击结果即可选中',
      searchEmpty: '未找到匹配页面', searchFail: '搜索失败', searchFailDetail: '搜索失败: {msg}',
      noContent: '(无内容)', copied: '✅ 已复制到剪贴板', copyFail: '❌ 复制失败：{msg}',
      mdDownloaded: '✅ Markdown 文件已下载：{name}',
      needUrl: '请输入网页链接',
      extractingMd: '正在提取并整理 Markdown...',
      extracting: '正在提取并分析网页内容...',
      previewDone: '✅ 预览完成 — 确认无误后点击“保存到 Notion”',
      needParent: '请选择一个 Notion 目标页面（需在 Notion 中将页面授权给集成）',
      extractingContent: '正在提取内容...',
      savingNotion: '正在保存到 Notion...',
      saveSuccess: '✅ 已成功保存到 Notion！标题: {title}',
      openInNotion: '在 Notion 中打开 →',
      emptyPreview: '(无内容)',
    },
    en: {
      tabHome: 'Home', tabSettings: 'Settings', tabAbout: 'About',
      toggleTheme: 'Cycle theme (System / Light / Dark)',
      themeSystem: 'System',
      themeLight: 'Light',
      themeDark: 'Dark',
      toggleLang: '切换到中文',
      heroTitleBefore: 'Turn any webpage ', heroTitleGrad: 'into a Notion note',
      heroDesc: 'Paste a URL. AI extracts the article into structured Markdown — save to Notion or export a .md file.',
      labelUrl: 'Page URL', phUrl: 'https://example.com/article',
      labelTarget: 'Save to', hintTarget: 'Required; share the Notion page with your integration first',
      selectPage: 'Select a Notion page', phSearchPages: 'Search pages...',
      cascaderHint: 'Click to select; expand right for child pages',
      refreshRoots: 'Refresh', confirmSelect: 'Confirm',
      labelPrompt: 'Custom prompt', hintPrompt: 'Optional; overrides the default AI instructions',
      phPrompt: 'e.g. Summarize in English and keep all subheadings...',
      optTextOnly: 'No media',
      optTextOnlyHint: 'Skip images/videos and keep text only',
      btnPreview: 'Preview', btnExportMd: 'Export Markdown', btnSave: 'Save to Notion',
      previewTitle: 'Preview', previewDesc: 'AI-processed content preview',
      btnCopy: 'Copy', btnDownloadMd: 'Download Markdown',
      settingsNotion: 'Notion',
      settingsNotionDesc: 'Create an integration on Notion', settingsNotionDesc2: 'and copy the API Key.',
      settingsAi: 'AI', settingsAiDesc: 'Choose a provider and model for content refinement.',
      labelProvider: 'Provider', labelModel: 'Model', btnTest: 'Test connection',
      settingsExtra: 'Extra prompt', settingsExtraDesc: 'Prepended to the default AI instructions.',
      labelExtraPrompt: 'Custom prompt', phExtraPrompt: 'e.g. Please summarize the following in Chinese...',
      aboutTitle: 'About Save to Notion',
      aboutLead: 'Extract webpages, refine with AI, save to Notion — or export Markdown.',
      aboutProject: 'What it does',
      aboutLi1: 'Paste a URL to fetch the article and turn it into structured Markdown with AI',
      aboutLi2: 'Save to a chosen Notion page, or export / copy Markdown directly',
      aboutLi3: 'Works with OpenAI and Anthropic (Claude); keys stay in local browser storage',
      aboutLi4: 'Cascading page picker with search; settings auto-save on change',
      aboutAuthor: 'Author & repo', aboutAuthorDesc: 'Open source — stars, issues, and PRs welcome.',
      aboutRepo: 'Repository', aboutIssues: 'Issues',
      aboutLicense: 'License',
      aboutLicenseDesc: 'Released under the <strong>MIT License</strong>. Copyright © 2026 IdealDestructor.',
      aboutLicenseNote: 'You may use, modify, and distribute this software with the copyright notice retained. Provided “as is”, without warranty of any kind.',
      aboutLicenseLink: 'View full LICENSE →',
      footerTagline: 'Move the web into Notion, elegantly', loading: 'Working...',
      requestFailed: 'Request failed', processing: 'Working...',
      settingsSaved: '✅ Settings saved',
      testing: 'Testing...', notionOk: '✅ Notion connected', aiOk: '✅ AI connected',
      justNow: 'Updated just now', minsAgo: 'Cached {n} min ago', hoursAgo: 'Cached {n} h ago', daysAgo: 'Cached {n} d ago',
      cascaderHintExpand: 'Click to select; expand right for children · {age}',
      loadingRoots: 'Loading pages...', noPages: 'No pages found — make sure the integration has access',
      loadingChildren: 'Loading children...', noPagesShort: 'No pages', noChildren: 'No child pages',
      loadingChildrenOf: 'Loading children of “{title}”…',
      noChildrenConfirm: '“{title}” has no children — you can confirm selection',
      childrenFail: 'Failed to load children: {msg}',
      cacheExpired: '{age} (expired, refreshing…)',
      cacheRefreshFail: '{age} (refresh failed, using cache)',
      loadFail: 'Load failed: {msg}', refreshingRoots: 'Refreshing root pages…',
      refreshed: 'Refreshed · {age}', refreshFail: 'Refresh failed: {msg}',
      searching: 'Searching…', searchMode: 'Search mode: click a result to select',
      searchEmpty: 'No matching pages', searchFail: 'Search failed', searchFailDetail: 'Search failed: {msg}',
      noContent: '(empty)', copied: '✅ Copied to clipboard', copyFail: '❌ Copy failed: {msg}',
      mdDownloaded: '✅ Markdown downloaded: {name}',
      needUrl: 'Please enter a page URL',
      extractingMd: 'Extracting and refining Markdown...',
      extracting: 'Extracting and analyzing the page...',
      previewDone: '✅ Preview ready — click “Save to Notion” when it looks good',
      needParent: 'Select a Notion target page (share it with your integration first)',
      extractingContent: 'Extracting content...',
      savingNotion: 'Saving to Notion...',
      saveSuccess: '✅ Saved to Notion! Title: {title}',
      openInNotion: 'Open in Notion →',
      emptyPreview: '(empty)',
    }
  };

  var currentLocale = 'zh';
  var currentThemePref = 'system';
  var currentTheme = 'light';
  var systemThemeMql = null;

  function t(key, vars) {
    var dict = I18N[currentLocale] || I18N.zh;
    var str = (dict && dict[key]) || (I18N.zh && I18N.zh[key]) || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return str;
  }

  function detectLocale() {
    try {
      var saved = localStorage.getItem(LOCALE_KEY);
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) {}
    return (navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  function systemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function detectThemePref() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch (e) {}
    return 'system';
  }

  function resolveTheme(pref) {
    return pref === 'system' ? systemTheme() : (pref === 'dark' ? 'dark' : 'light');
  }

  function syncThemeButton() {
    var btn = document.getElementById('btn-theme');
    if (!btn) return;
    var labelKey = currentThemePref === 'dark'
      ? 'themeDark'
      : (currentThemePref === 'light' ? 'themeLight' : 'themeSystem');
    var label = t('toggleTheme') + ' · ' + t(labelKey);
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  function applyTheme(pref) {
    currentThemePref = (pref === 'light' || pref === 'dark' || pref === 'system') ? pref : 'system';
    currentTheme = resolveTheme(currentThemePref);
    document.documentElement.setAttribute('data-theme-pref', currentThemePref);
    document.documentElement.setAttribute('data-theme', currentTheme);
    try { localStorage.setItem(THEME_KEY, currentThemePref); } catch (e) {}
    syncThemeButton();
  }

  function applyLocale(locale) {
    currentLocale = locale === 'en' ? 'en' : 'zh';
    document.documentElement.setAttribute('data-locale', currentLocale);
    document.documentElement.setAttribute('lang', currentLocale === 'zh' ? 'zh-CN' : 'en');
    try { localStorage.setItem(LOCALE_KEY, currentLocale); } catch (e) {}

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });

    var langCode = document.getElementById('lang-code');
    if (langCode) langCode.textContent = currentLocale === 'zh' ? 'EN' : '中文';

    var parentVal = document.getElementById('parent-select');
    if (parentVal && !parentVal.value) {
      var label = document.getElementById('cascader-label');
      if (label) {
        label.textContent = t('selectPage');
        label.classList.add('cascader-placeholder');
      }
    }
    updateRootsHint();
    syncThemeButton();
  }

  function toggleTheme() {
    var next = currentThemePref === 'system'
      ? 'light'
      : (currentThemePref === 'light' ? 'dark' : 'system');
    applyTheme(next);
  }

  function bindSystemThemeListener() {
    systemThemeMql = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () {
      if (currentThemePref === 'system') applyTheme('system');
    };
    if (systemThemeMql.addEventListener) systemThemeMql.addEventListener('change', onChange);
    else if (systemThemeMql.addListener) systemThemeMql.addListener(onChange);
  }

  function toggleLocale() {
    applyLocale(currentLocale === 'zh' ? 'en' : 'zh');
  }

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
    if (!res.ok) throw new Error(data.error || t('requestFailed'));
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
    text = text || t('processing');
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
        showStatus(statusId, 'success', t('settingsSaved'));
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
    showStatus('notion-test-status', '', t('testing'), true);
    try {
      await api('/settings/test-notion', { method: 'POST', body: JSON.stringify(getSettingsFromForm()) });
      showStatus('notion-test-status', 'success', t('notionOk'));
    } catch (e) {
      showStatus('notion-test-status', 'error', '\u274c ' + e.message);
    }
  }

  // --- Test AI ---
  async function testAI() {
    showStatus('ai-test-status', '', t('testing'), true);
    try {
      await api('/settings/test-ai', { method: 'POST', body: JSON.stringify(getSettingsFromForm()) });
      showStatus('ai-test-status', 'success', t('aiOk'));
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
    if (mins < 1) return t('justNow');
    if (mins < 60) return t('minsAgo', { n: mins });
    var hours = Math.floor(mins / 60);
    if (hours < 24) return t('hoursAgo', { n: hours });
    return t('daysAgo', { n: Math.floor(hours / 24) });
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
    if (!hint) return;
    var age = formatCacheAge(rootsFetchedAt);
    var base = age
      ? t('cascaderHintExpand', { age: age })
      : t('cascaderHint');
    hint.textContent = extra || base;
  }

  function setSelectedParent(path, persist) {
    selectedPath = path || [];
    var id = selectedPath.length ? selectedPath[selectedPath.length - 1].id : '';
    document.getElementById('parent-select').value = id;
    var label = document.getElementById('cascader-label');
    var confirmBtn = document.getElementById('cascader-confirm');
    if (!id) {
      label.textContent = t('selectPage');
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
      menus.innerHTML = '<div class="cascader-loading"><div class="spinner"></div><span>' + escapeHtml(t('loadingRoots')) + '</span></div>';
      return;
    }
    if (!cascadeColumns.length) {
      menus.innerHTML = '<div class="cascader-empty">' + escapeHtml(t('noPages')) + '</div>';
      return;
    }

    cascadeColumns.forEach(function (col, colIndex) {
      var menu = document.createElement('div');
      menu.className = 'cascader-menu';

      if (col.loading) {
        menu.innerHTML = '<div class="cascader-loading"><div class="spinner"></div><span>' + escapeHtml(t('loadingChildren')) + '</span></div>';
        menus.appendChild(menu);
        return;
      }

      if (!col.pages || !col.pages.length) {
        menu.innerHTML = '<div class="cascader-empty">' + escapeHtml(colIndex === 0 ? t('noPagesShort') : t('noChildren')) + '</div>';
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
    updateRootsHint(t('loadingChildrenOf', { title: page.title || 'Untitled' }));

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
        updateRootsHint(t('noChildrenConfirm', { title: page.title || 'Untitled' }));
      }
      renderCascaderMenus();
    } catch (e) {
      cascadeColumns = cascadeColumns.slice(0, colIndex + 1);
      cascadeColumns[colIndex].loadingId = null;
      updateRootsHint(t('childrenFail', { msg: e.message }));
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
        updateRootsHint(t('cacheExpired', { age: formatCacheAge(cached.fetchedAt) }));
        try {
          var fresh = await loadRootsFromNetwork();
          if (cascadeMode === 'cascade') {
            var keepActive = cascadeColumns[0] && cascadeColumns[0].activeId;
            applyRootsToColumns(fresh, keepActive || activeRootId);
          }
        } catch (e) {
          updateRootsHint(t('cacheRefreshFail', { age: formatCacheAge(cached.fetchedAt) }));
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
        '<div class="cascader-empty">' + escapeHtml(t('loadFail', { msg: e.message })) + '</div>';
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
    updateRootsHint(t('refreshingRoots'));
    renderCascaderMenus();
    var keepActive = selectedPath[0] && selectedPath[0].id;
    try {
      var roots = await loadRootsFromNetwork();
      applyRootsToColumns(roots, keepActive || '');
      updateRootsHint(t('refreshed', { age: formatCacheAge(rootsFetchedAt) }));
    } catch (e) {
      updateRootsHint(t('refreshFail', { msg: e.message }));
      document.getElementById('cascader-menus').innerHTML =
        '<div class="cascader-empty">' + escapeHtml(t('refreshFail', { msg: e.message })) + '</div>';
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
    document.getElementById('cascader-hint').textContent = t('searching');
    try {
      var pages = await fetchNotionPages({ query: query });
      cascadeColumns = [{ parentId: null, pages: pages, activeId: '', loadingId: null, loading: false }];
      document.getElementById('cascader-hint').textContent = pages.length
        ? t('searchMode')
        : t('searchEmpty');
      renderCascaderMenus();
    } catch (e) {
      document.getElementById('cascader-menus').innerHTML =
        '<div class="cascader-empty">' + escapeHtml(t('searchFailDetail', { msg: e.message })) + '</div>';
      document.getElementById('cascader-hint').textContent = t('searchFail');
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

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderPreviewContent(md) {
    var src = md || t('noContent');
    var html = escapeHtml(src);
    // Images
    html = html.replace(/!\[([^\]]*)\]\((https?:[^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, function(_, alt, url) {
      return '<img class="preview-media" src="' + url + '" alt="' + alt + '" loading="lazy">';
    });
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\((https?:[^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, function(_, label, url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
    });
    // Inline code, bold, italic (order: code → bold → italic)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Paragraph breaks
    html = html.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');
    return '<p>' + html + '</p>';
  }

  function showPreview(data, url) {
    document.getElementById('preview-card').style.display = 'block';
    document.getElementById('preview-title-tag').textContent = (data && data.title) || url;
    document.getElementById('preview-content').innerHTML = renderPreviewContent(buildMarkdownContent(data));
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
      showStatus('extract-status', 'success', t('copied'));
    } catch (e) {
      showStatus('extract-status', 'error', t('copyFail', { msg: e.message }));
    }
  }

  function downloadMarkdown() {
    if (!lastPreview) return;
    var filename = triggerMarkdownDownload(lastPreview);
    showStatus('extract-status', 'success', t('mdDownloaded', { name: filename }));
  }

  function isTextOnlyMode() {
    var el = document.getElementById('opt-text-only');
    return !!(el && el.checked);
  }

  function extractPayload(extra) {
    return Object.assign({
      url: document.getElementById('extract-url').value.trim(),
      promptOverride: document.getElementById('prompt-override').value.trim(),
      settings: getSettingsFromForm(),
      textOnly: isTextOnlyMode(),
    }, extra || {});
  }

  async function doExportMarkdown() {
    var url = document.getElementById('extract-url').value.trim();
    if (!url) {
      showStatus('extract-status', 'error', t('needUrl'));
      return;
    }
    hideStatus('extract-status');
    setLoading(true, t('extractingMd'), 30);
    try {
      var reuse = lastPreview
        && lastPreview.url === url
        && !!lastPreview.textOnly === isTextOnlyMode();
      var data = reuse ? lastPreview : await api('/extract/preview', {
        method: 'POST',
        body: JSON.stringify(extractPayload()),
      });
      lastPreview = data;
      showPreview(data, url);
      var filename = triggerMarkdownDownload(data);
      showStatus('extract-status', 'success', t('mdDownloaded', { name: filename }));
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
      showStatus('extract-status', 'error', t('needUrl'));
      return;
    }
    hideStatus('extract-status');
    setLoading(true, t('extracting'), 30);
    try {
      var data = await api('/extract/preview', {
        method: 'POST',
        body: JSON.stringify(extractPayload()),
      });
      showPreview(data, url);
      lastPreview = data;
      showStatus('extract-status', 'success', t('previewDone'));
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
      showStatus('extract-status', 'error', t('needUrl'));
      return;
    }
    var parentId = document.getElementById('parent-select').value.trim();
    if (!parentId) {
      showStatus('extract-status', 'error', t('needParent'));
      return;
    }
    hideStatus('extract-status');
    setLoading(true, t('extractingContent'), 20);
    try {
      var result = await api('/extract', {
        method: 'POST',
        body: JSON.stringify(extractPayload({ parentId: parentId })),
      });
      setLoading(true, t('savingNotion'), 60);
      await new Promise(function (resolve) { setTimeout(resolve, 400); });
      var pageUrl = result.notionResult && result.notionResult.pageUrl;
      var msg = t('saveSuccess', { title: escapeHtml(result.title || url) });
      if (pageUrl) {
        msg += ' <a class="status-link" href="' + escapeHtml(pageUrl) + '" target="_blank" rel="noreferrer">' +
          escapeHtml(t('openInNotion')) + '</a>';
      }
      showStatus('extract-status', 'success', msg);
      setLoading(false);
    } catch (e) {
      showStatus('extract-status', 'error', '❌ ' + e.message);
      setLoading(false);
    }
  }

  // --- Init ---
  applyTheme(detectThemePref());
  applyLocale(detectLocale());
  bindSystemThemeListener();
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);
  document.getElementById('btn-lang').addEventListener('click', toggleLocale);

  (function bindTextOnlyOption() {
    var key = 'savetonotion-text-only';
    var el = document.getElementById('opt-text-only');
    if (!el) return;
    try {
      el.checked = localStorage.getItem(key) === '1';
    } catch (e) {}
    el.addEventListener('change', function () {
      try { localStorage.setItem(key, el.checked ? '1' : '0'); } catch (e) {}
      lastPreview = null;
    });
  })();

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

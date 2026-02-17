export const INTERNAL_HOME = 'jei://home'
export const INTERNAL_BOOKMARKS = 'jei://bookmarks'
export const INTERNAL_HISTORY = 'jei://history'
export const INTERNAL_SETTINGS = 'jei://settings'

export function internalHomeUrl(): string {
  const links = [
    { group: 'mirrors', url: 'https://jei.mic.run', desc: '中国大陆访问镜像（Mic）' },
    { group: 'mirrors', url: 'https://cnjeiweb.sirrus.cc', desc: '中国大陆转跳（sirrus.cc）' },
    { group: 'mirrors', url: 'https://jeiweb.sirrus.cc', desc: 'CloudFlare 源（sirrus.cc）' },
    { group: 'mirrors', url: 'https://fastjeiweb.sirrus.cc', desc: 'EdgeOne 亚太源（sirrus.cc）' },
    { group: 'mirrors', url: 'https://jei.arcwolf.top', desc: 'EdgeOne 全球版（Arcwolf）' },
    { group: 'friends', url: 'https://end.shallow.ink', desc: '协议终端' },
    { group: 'friends', url: 'https://www.gamekee.com/zmd', desc: '终末地非官方 Wiki' },
    { group: 'sources', url: 'https://wiki.skland.com/endfield', desc: '官方 Wiki（数据来源之一）' }
  ]

  const html = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JEI Web</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background:#1e1e1e; color:#d4d4d4; }
    .wrap { max-width: 900px; margin: 0 auto; padding: 48px 20px; }
    h1 { margin: 0 0 10px 0; font-size: 28px; font-weight: 650; letter-spacing: .2px; }
    .sub { opacity: .8; margin: 0 0 22px 0; line-height: 1.6; }
    .note { margin-top: 10px; opacity: .78; line-height: 1.6; }
    .pill { display:inline-flex; align-items:center; gap: 8px; padding: 6px 10px; border-radius: 999px; border: 1px solid #2d2d2d; background: #252526; }
    .pill b { font-weight: 650; }
    form { display:flex; gap: 10px; }
    input { flex:1; min-width:0; padding: 12px 14px; border-radius: 10px; border: 1px solid #2d2d2d; background: #252526; color: #fff; font-size: 15px; }
    button { padding: 12px 14px; border-radius: 10px; border: 1px solid #2d2d2d; background: #007acc; color:#fff; cursor:pointer; font-size: 15px; }
    button:hover { background:#0063a5; }
    .section { margin-top: 26px; }
    .section h2 { font-size: 14px; letter-spacing: .8px; text-transform: uppercase; opacity: .72; margin: 0 0 10px 0; }
    .cards { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .card { display:flex; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid #2d2d2d; background:#252526; color:#d4d4d4; text-decoration:none; }
    .card:hover { background:#2d2d2d; }
    .icon { width: 28px; height: 28px; border-radius: 8px; flex: 0 0 auto; background:#1e1e1e; border: 1px solid #2d2d2d; }
    .meta { min-width:0; }
    .title { font-size: 14px; color:#fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .desc { margin-top: 2px; font-size: 12px; opacity: .78; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .url { margin-top: 2px; font-size: 12px; opacity: .65; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  </style>
  <script>
    function go() {
      const input = document.getElementById('q');
      const v = (input && input.value || '').trim();
      if (!v) return false;
      const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v);
      const url = hasScheme ? v : (v.includes('.') ? 'https://' + v : 'https://www.google.com/search?q=' + encodeURIComponent(v));
      location.href = url;
      return false;
    }

    function hostOf(u) {
      try { return new URL(u).host; } catch { return u; }
    }

    function fallbackIcon(u) {
      const host = hostOf(u);
      const letter = (host[0] || 'J').toUpperCase();
      const hue = (Array.from(host).reduce((a,c) => a + c.charCodeAt(0), 0) * 13) % 360;
      const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="hsl(\${hue} 60% 34%)"/>
  <text x="32" y="40" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="700">\${letter}</text>
</svg>\`;
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    async function hydrateCards() {
      const cards = document.querySelectorAll('[data-site-url]');
      for (const card of cards) {
        const url = card.getAttribute('data-site-url');
        if (!url) continue;
        const img = card.querySelector('img');
        const titleEl = card.querySelector('.title');
        const urlEl = card.querySelector('.url');
        if (urlEl) urlEl.textContent = url;
        if (img) img.src = fallbackIcon(url);
        if (titleEl) titleEl.textContent = hostOf(url);

        try {
          const api = window.JEIHome;
          if (!api || typeof api.fetchSiteMeta !== 'function') continue;
          const meta = await api.fetchSiteMeta(url);
          if (!meta) continue;
          if (titleEl && meta.title) titleEl.textContent = meta.title;
          if (img && meta.iconUrl) img.src = meta.iconUrl;
        } catch {}
      }
    }

    window.addEventListener('DOMContentLoaded', hydrateCards);
  <\/script>
</head>
<body>
  <div class="wrap">
    <h1>欢迎来到 JEI Web</h1>
    <div class="sub">
      <span class="pill">官方 QQ 群：<b>1080814651</b></span>
      <div class="note">有任何反馈和希望参与开发都可以加入，也支持明日方舟：终末地（以及任何我们支持的游戏和 Minecraft）的游戏讨论。</div>
    </div>
    <form onsubmit="return go()">
      <input id="q" autocomplete="off" placeholder="网址 / 搜索关键词" />
      <button type="submit">Go</button>
    </form>

    <div class="section">
      <h2>镜像与访问</h2>
      <div class="cards">
        ${links.filter((x) => x.group === 'mirrors').map((x) => `<a class="card" href="${x.url}" data-site-url="${x.url}"><img class="icon" alt="" /><div class="meta"><div class="title"></div><div class="desc">${x.desc}</div><div class="url"></div></div></a>`).join('')}
      </div>
    </div>

    <div class="section">
      <h2>友链</h2>
      <div class="cards">
        ${links.filter((x) => x.group === 'friends').map((x) => `<a class="card" href="${x.url}" data-site-url="${x.url}"><img class="icon" alt="" /><div class="meta"><div class="title"></div><div class="desc">${x.desc}</div><div class="url"></div></div></a>`).join('')}
      </div>
    </div>

    <div class="section">
      <h2>数据来源</h2>
      <div class="cards">
        ${links.filter((x) => x.group === 'sources').map((x) => `<a class="card" href="${x.url}" data-site-url="${x.url}"><img class="icon" alt="" /><div class="meta"><div class="title"></div><div class="desc">${x.desc}</div><div class="url"></div></div></a>`).join('')}
      </div>
    </div>

    <div class="section">
      <h2>声明</h2>
      <div class="note">免责声明：JEI-Web 和 Minecraft Mod JEI 没有任何隶属和其他关系，仅仅是灵感来源于 JEI Mod。</div>
    </div>
  </div>
</body>
</html>`

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}#jei-home`
}

function shell(title: string, body: string, script: string, hash: string): string {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; }
    body { margin:0; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background:#1e1e1e; color:#d4d4d4; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 28px 20px; }
    h1 { margin: 0 0 16px 0; font-size: 24px; }
    .bar { display:flex; gap: 10px; margin-bottom: 16px; }
    button { padding: 10px 12px; border-radius: 8px; border:1px solid #2d2d2d; background:#007acc; color:#fff; cursor:pointer; }
    button.secondary { background:#252526; }
    input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid #2d2d2d; background:#252526; color:#fff; }
    .list { border:1px solid #2d2d2d; border-radius:10px; overflow:hidden; }
    .row { display:grid; grid-template-columns: 1fr auto; gap:10px; padding: 12px; border-bottom:1px solid #2d2d2d; align-items:center; }
    .row:last-child { border-bottom:none; }
    .meta { min-width: 0; }
    .t { color:#fff; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .u { font-size:12px; opacity:.75; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .status { margin-top: 10px; font-size: 12px; min-height: 18px; opacity:.85; }
    label { display:block; margin-bottom:6px; font-size:13px; opacity:.9; }
    .field { margin-bottom: 12px; }
  </style>
<\/head>
<body>
  <div class="wrap">
    ${body}
  </div>
  <script>
${script}
  <\/script>
</body>
</html>`

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}${hash}`
}

export function internalBookmarksUrl(): string {
  const body = `
    <h1>书签管理</h1>
    <div class="bar">
      <button onclick="refreshData()">刷新</button>
    </div>
    <div id="list" class="list"></div>
    <div id="status" class="status"></div>
  `

  const script = `
    function setStatus(text) {
      const el = document.getElementById('status');
      if (el) el.textContent = text || '';
    }

    function render(items) {
      const root = document.getElementById('list');
      if (!root) return;
      root.innerHTML = '';
      if (!items || !items.length) {
        root.innerHTML = '<div class="row"><div class="meta"><div class="t">暂无书签</div></div></div>';
        return;
      }

      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = '<div class="meta"><div class="t"></div><div class="u"></div></div><button class="secondary">在新标签页打开</button>';
        row.querySelector('.t').textContent = item.title || item.url;
        row.querySelector('.u').textContent = item.url || '';
        row.querySelector('button').addEventListener('click', async () => {
          try {
            await window.JEIHome?.openUrlInNewTab?.(item.url || '');
          } catch {}
        });
        root.appendChild(row);
      }
    }

    async function refreshData() {
      if (!window.JEIHome || typeof window.JEIHome.getBookmarks !== 'function') {
        setStatus('内嵌页面桥接未就绪（JEIHome 不可用）');
        return;
      }
      try {
        const data = await window.JEIHome?.getBookmarks?.();
        render(Array.isArray(data) ? data : []);
        setStatus('已刷新');
      } catch {
        setStatus('读取书签失败');
      }
    }

    window.refreshData = refreshData;
    window.addEventListener('DOMContentLoaded', refreshData);
  `

  return shell('书签管理', body, script, '#jei-bookmarks')
}

export function internalHistoryUrl(): string {
  const body = `
    <h1>历史记录</h1>
    <div class="bar">
      <button onclick="refreshData()">刷新</button>
      <button class="secondary" onclick="clearData()">清空历史</button>
    </div>
    <div id="list" class="list"></div>
    <div id="status" class="status"></div>
  `

  const script = `
    function setStatus(text) {
      const el = document.getElementById('status');
      if (el) el.textContent = text || '';
    }

    function render(items) {
      const root = document.getElementById('list');
      if (!root) return;
      root.innerHTML = '';
      if (!items || !items.length) {
        root.innerHTML = '<div class="row"><div class="meta"><div class="t">暂无历史记录</div></div></div>';
        return;
      }

      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = '<div class="meta"><div class="t"></div><div class="u"></div></div><button class="secondary">在新标签页打开</button>';
        row.querySelector('.t').textContent = item.title || item.url;
        row.querySelector('.u').textContent = item.url || '';
        row.querySelector('button').addEventListener('click', async () => {
          try {
            await window.JEIHome?.openUrlInNewTab?.(item.url || '');
          } catch {}
        });
        root.appendChild(row);
      }
    }

    async function refreshData() {
      if (!window.JEIHome || typeof window.JEIHome.getHistory !== 'function') {
        setStatus('内嵌页面桥接未就绪（JEIHome 不可用）');
        return;
      }
      try {
        const data = await window.JEIHome?.getHistory?.();
        render(Array.isArray(data) ? data : []);
        setStatus('已刷新');
      } catch {
        setStatus('读取历史记录失败');
      }
    }

    async function clearData() {
      if (!window.JEIHome || typeof window.JEIHome.clearHistory !== 'function') {
        setStatus('内嵌页面桥接未就绪（JEIHome 不可用）');
        return;
      }

      try {
        const result = await window.JEIHome.clearHistory();
        if (result && result.success) {
          setStatus('历史记录已清空');
          await refreshData();
          return;
        }
        setStatus('清空失败');
      } catch {
        setStatus('清空失败');
      }
    }

    window.refreshData = refreshData;
    window.clearData = clearData;
    window.addEventListener('DOMContentLoaded', refreshData);
  `

  return shell('历史记录', body, script, '#jei-history')
}

export function internalSettingsUrl(): string {
  const body = `
    <h1>设置</h1>
    <div class="field">
      <label for="shortcut">快捷键（例如 CommandOrControl+F8）</label>
      <input id="shortcut" type="text" placeholder="CommandOrControl+F8" />
    </div>
    <div class="field">
      <label for="homepage">主页（例如 jei://home）</label>
      <input id="homepage" type="text" placeholder="jei://home" />
    </div>
    <div class="field">
      <label><input id="alwaysOnTop" type="checkbox" /> 置顶窗口</label>
    </div>
    <div class="bar">
      <button onclick="saveSettings()">保存</button>
      <button class="secondary" onclick="loadSettings()">重新读取</button>
    </div>
    <div id="status" class="status"></div>
  `

  const script = `
    function setStatus(text) {
      const el = document.getElementById('status');
      if (el) el.textContent = text || '';
    }

    async function loadSettings() {
      if (!window.JEIHome || typeof window.JEIHome.getSettings !== 'function') {
        setStatus('内嵌页面桥接未就绪（JEIHome 不可用）');
        return;
      }
      try {
        const settings = await window.JEIHome?.getSettings?.();
        if (!settings) return;
        const shortcutEl = document.getElementById('shortcut');
        const homepageEl = document.getElementById('homepage');
        const alwaysOnTopEl = document.getElementById('alwaysOnTop');
        if (shortcutEl) shortcutEl.value = settings.shortcut || '';
        if (homepageEl) homepageEl.value = settings.homePage || 'jei://home';
        if (alwaysOnTopEl) alwaysOnTopEl.checked = !!settings.alwaysOnTop;
        setStatus('设置已加载');
      } catch {
        setStatus('读取设置失败');
      }
    }

    async function saveSettings() {
      const shortcutEl = document.getElementById('shortcut');
      const homepageEl = document.getElementById('homepage');
      const alwaysOnTopEl = document.getElementById('alwaysOnTop');
      const payload = {
        shortcut: shortcutEl ? shortcutEl.value : '',
        homePage: homepageEl ? (homepageEl.value || 'jei://home') : 'jei://home',
        alwaysOnTop: !!(alwaysOnTopEl && alwaysOnTopEl.checked)
      };

      try {
        const result = await window.JEIHome?.saveSettings?.(payload);
        if (result && result.success) {
          setStatus('保存成功');
          return;
        }
        setStatus('保存失败');
      } catch {
        setStatus('保存失败');
      }
    }

    window.loadSettings = loadSettings;
    window.saveSettings = saveSettings;
    window.addEventListener('DOMContentLoaded', loadSettings);
  `

  return shell('设置', body, script, '#jei-settings')
}

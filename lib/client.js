// Browser source, distributed directly. tsc deliberately does not rewrite this file.
window.__ModuleLoader__.load({ id: 'dsh-ppt', factory: require => {
  const React = require('react');
var __FR_KEY = "dsh-first-run:dsh-ppt:v1";
var __FR_TITLE = "演示文稿 · 首次使用（4 步）";
var __FR_TITLE_EN = "Presentations · First steps";
var __FR_STEPS_EN = [{title:"Choose a theme",body:"Choose from swiss, velvet, data, soft and bold before building your presentation."},{title:"Provide actual material",body:"Give the assistant your points, data and tables. It produces an editable PPTX and an HTML presentation.",tryIt:"Turn this quarterly update into eight slides using the data theme."},{title:"Review in the browser",body:"Step through the HTML preview, then edit text, images and speaker notes in this panel."},{title:"Check the final slides",body:"Review the final PPTX in PowerPoint or WPS, or use the optional renderer to check fonts and layout before delivery."}];
var __FR_STEPS = [{"title":"先选主题","body":"内置 5 套主题（swiss / velvet / data / soft / bold），先定风格再生成内容。"},{"title":"给内容，不给空话","body":"把要点、数据、表格直接给助手，它会排成幻灯片并同时产出 PPTX 与网页版。","tryIt":"把这份季度总结做成 8 页汇报，用 data 主题"},{"title":"先在浏览器里过一遍","body":"网页版可直接翻页预览，确认排版没问题再导出。"},{"title":"导出后看图核对","body":"渲染成图检查一遍再交付，避免字体缺失或溢出。"}];

// ---- first-run guide (shared snippet; keep in sync across plugins) ----
var __FR_STYLE_ID = 'dsh-first-run-css';
var __FR_CSS = [
  '.fr-card{border:1px solid var(--dsw-border,rgba(0,0,0,.10));border-radius:12px;padding:14px 16px;margin:0 0 14px;background:linear-gradient(180deg,rgba(59,130,246,.06),rgba(59,130,246,.02))}',
  '.fr-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}',
  '.fr-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-accent,#3b82f6)}',
  '.fr-title{font-weight:650;font-size:13.5px}',
  '.fr-count{margin-left:auto;font-size:11px;color:var(--dsw-text-weak,#6b7280);font-variant-numeric:tabular-nums}',
  '.fr-step{font-weight:600;font-size:13px;margin:2px 0 4px}',
  '.fr-body{color:var(--dsw-text-weak,#4b5563);font-size:12.5px;line-height:1.65}',
  '.fr-try{margin-top:8px;padding:7px 9px;border-radius:8px;background:rgba(59,130,246,.09);font-size:12px;display:flex;gap:8px}',
  '.fr-try code{font-family:ui-monospace,monospace;white-space:pre-wrap;word-break:break-word}',
  '.fr-bar{display:flex;gap:8px;align-items:center;margin-top:12px}',
  '.fr-progress{display:flex;gap:4px;margin-right:auto}',
  '.fr-seg{width:16px;height:3px;border-radius:2px;background:var(--dsw-border,rgba(0,0,0,.12))}',
  '.fr-seg.on{background:var(--dsw-accent,#3b82f6)}',
  '.fr-btn{border:1px solid var(--dsw-border,rgba(0,0,0,.14));background:transparent;color:inherit;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer}',
  '.fr-btn:hover{background:rgba(0,0,0,.04)}',
  '.fr-btn.primary{background:var(--dsw-accent,#3b82f6);border-color:transparent;color:#fff}',
  '.fr-btn.ghost{border-color:transparent;color:var(--dsw-text-weak,#6b7280)}',
].join('\n');
function __frEnsureCss() {
  if (typeof document === 'undefined' || document.getElementById(__FR_STYLE_ID)) return;
  var el = document.createElement('style');
  el.id = __FR_STYLE_ID;
  el.textContent = __FR_CSS;
  document.head.appendChild(el);
}
function __frRead() { try { return localStorage.getItem(__FR_KEY) === 'done'; } catch (e) { return false; } }
function __frWrite() { try { localStorage.setItem(__FR_KEY, 'done'); } catch (e) {} }
function __FirstRunCard(props) {
  useLanguage(props?.locale || localeService);
  var english = languageOf(props?.locale || localeService) === 'en';
  var steps = english ? __FR_STEPS_EN : __FR_STEPS;
  var text = (zh, en) => english ? en : zh;
  var doneState = React.useState(__frRead);
  var done = doneState[0], setDone = doneState[1];
  var idxState = React.useState(0);
  var index = idxState[0], setIndex = idxState[1];
  React.useEffect(function () { __frEnsureCss(); }, []);
  if (done) return null;
  var step = steps[index];
  var last = index >= steps.length - 1;
  var close = function () { __frWrite(); setDone(true); };
  var kids = [
    React.createElement('div', { className: 'fr-head', key: 'h' },
      React.createElement('span', { className: 'fr-dot' }),
      React.createElement('span', { className: 'fr-title' }, english ? __FR_TITLE_EN : __FR_TITLE),
      React.createElement('span', { className: 'fr-count' }, (index + 1) + ' / ' + steps.length)),
    React.createElement('div', { className: 'fr-step', key: 't' }, step.title),
    React.createElement('div', { className: 'fr-body', key: 'b' }, step.body),
  ];
  if (step.tryIt) kids.push(React.createElement('div', { className: 'fr-try', key: 'y' },
    React.createElement('span', null, text('可以直接说', 'Try saying')),
    React.createElement('code', null, text('「', '“') + step.tryIt + text('」', '”'))));
  var buttons = [React.createElement('div', { className: 'fr-progress', key: 'p' }, steps.map(function (_, i) {
    return React.createElement('span', { key: i, className: 'fr-seg' + (i <= index ? ' on' : '') });
  }))];
  buttons.push(React.createElement('button', { className: 'fr-btn ghost', type: 'button', onClick: close, key: 's' }, text('跳过', 'Skip')));
  if (index > 0) buttons.push(React.createElement('button', { className: 'fr-btn', type: 'button', key: 'prev', onClick: function () { setIndex(index - 1); } }, text('上一步', 'Back')));
  buttons.push(React.createElement('button', { className: 'fr-btn primary', type: 'button', key: 'next', onClick: function () { if (last) close(); else setIndex(index + 1); } }, last ? text('开始使用', 'Start') : text('下一步', 'Next')));
  kids.push(React.createElement('div', { className: 'fr-bar', key: 'bar' }, buttons));
  return React.createElement('div', { className: 'fr-card' }, kids);
}
function __withFirstRun(Component) {
  return function FirstRunWrapped(props) {
    return React.createElement(React.Fragment, null, React.createElement(__FirstRunCard, props), React.createElement(Component, props));
  };
}
// ---- end first-run guide ----

  const { useState, useEffect, useRef, useMemo } = React;
  const h = React.createElement;

// Interface language follows DSH; user content and stored records keep their original text.
let localeService;
const EN = Object.freeze({
  "标题": "Title",
  "副标题": "Subtitle",
  "眉题": "Kicker",
  "正文": "Body text",
  "要点（每行一条）": "Bullets (one per line)",
  "演讲备注": "Speaker notes",
  "无法读取服务响应，请检查插件是否加载": "Could not read the server response. Check that the plugin is loaded.",
  "操作未完成": "The operation did not complete.",
  "正在处理，请稍候…": "Working, please wait…",
  "操作失败": "Operation failed.",
  "已定位到": "Focused ",
  "，在字段中修改后保存。": ". Edit this field, then save.",
  "点击预览里的文字，或在下方修改字段。": "Click text in the preview, or edit the fields below.",
  "当前页已被删除，输入仍保留，请复制需要的内容后取消修改。": "This slide was deleted. Your input is preserved; copy anything you need before cancelling your edits.",
  "已载入最新版本并保留你的修改，请核对后再保存。": "Latest version loaded with your edits preserved. Review before saving.",
  "内容没有变化。": "No changes to save.",
  "已保存，HTML、PPTX 和工程文件已同步更新。": "Saved. HTML, PPTX and project files were updated together.",
  "页面顺序已更新，可撤销。": "Slides reordered. You can undo this change.",
  "复制本页": "Duplicate slide",
  "删除本页": "Delete slide",
  "页面已复制，图片、图表和备注一并保留，可撤销。": "Slide duplicated with its images, charts and notes. You can undo this change.",
  "页面已删除，可撤销。": "Slide deleted. You can undo this change.",
  "已撤销上次修改。": "Last change undone.",
  "当前 PPTX 已生成逐页图片，请查看画面。": "Slide images were rendered from the current PPTX. Review each slide.",
  "正在渲染最终 PPTX，较大文件可能需要几分钟…": "Rendering the final PPTX. Large files may take a few minutes…",
  "已请求下载，请查看浏览器的下载列表。": "Download requested. Check your browser’s downloads.",
  "请选择 5 MiB 以内的 PNG 或 JPEG 图片。": "Choose a PNG or JPEG image up to 5 MiB.",
  "无法读取图片，请重试。": "Could not read the image. Try again.",
  "正在读取图片，切换页面会取消本次读取。": "Reading the image. Switching slides cancels this upload.",
  "图片已载入，保存后生效。": "Image loaded. Save this slide to apply it.",
  "下载讲稿 Markdown": "Download speaker notes",
  "另存副本": "Save a copy",
  "副本已保存，原文件保留。副本从工程生成，不包含 Office 手工修改。": "Copy saved. Original files are preserved. The copy is rebuilt from the project and does not include external Office edits.",
  "演示文稿编辑": "Presentation editor",
  "修改本插件生成的成品，保存时同步更新 HTML、可编辑 PPTX 和工程文件。": "Edit presentations generated by this plugin. Saving updates the HTML, editable PPTX and project file together.",
  "载入最新版本，保留我的输入": "Load latest and keep my input",
  "刷新项目": "Refresh projects",
  "还没有可以编辑的项目": "No editable projects yet",
  "先在对话中让助手生成演示文稿。已有项目可以让助手调用 ppt_check 检查一次，它会出现在这里。": "Ask the assistant to generate a presentation in chat. For an existing project, ask it to run ppt_check; the project will appear here.",
  "示例：请把这份材料制作成可直接交付的演示文稿，生成 HTML、PPTX 和工程文件。": "Example: Turn this material into a presentation ready to deliver, including HTML, PPTX and project files.",
  "返回项目": "Back to projects",
  " 页 · 修订 ": " slides · Revision ",
  "页面": "Slides",
  "未命名页": "Untitled slide",
  "上移": "Move up",
  "下移": "Move down",
  "HTML 预览": "HTML preview",
  "最终 PPTX 预览": "Final PPTX preview",
  "渲染当前 PPTX": "Render current PPTX",
  "演示文稿 HTML 预览": "Presentation HTML preview",
  "此项目尚无 HTML，请保存一次生成预览。": "This project has no HTML yet. Save to generate a preview.",
  "最终 PPTX 第 ": "Final PPTX slide ",
  " 页渲染结果": " rendered image",
  "正在载入当前页渲染…": "Loading the rendered slide…",
  "这是 HTML 放映预览。最终 PPTX 的字体和排版请用上方渲染检查。点击文字可定位编辑字段。": "This is the HTML playback preview. Use the render controls above to check fonts and layout in the final PPTX. Click text to focus its editing field.",
  "这是当前 PPTX 文件的实际渲染图片，仍需检查每页画面；PowerPoint / WPS 可能因字体环境而不同。": "This image is rendered from the current PPTX. Review every slide; PowerPoint / WPS may display it differently depending on installed fonts.",
  "渲染引擎报告缺失字体：": "The renderer reported missing fonts: ",
  "。请替换为目标电脑可用字体后重新渲染。": ". Choose fonts available on the target computer and render again.",
  "编辑第 ": "Edit slide ",
  " 页": "",
  "有未保存修改，请先保存或取消，再切换页面。": "You have unsaved edits. Save or cancel before switching slides.",
  "这些字段也被修改过，请比较后决定是否保存：": "These fields were changed elsewhere. Compare them before saving:",
  "最新版本：": "Latest version: ",
  "你的修改：": "Your edits: ",
  "替换图片（PNG / JPEG）": "Replace image (PNG / JPEG)",
  "添加图片（会改为图文布局）": "Add image (changes to an image-and-text layout)",
  "当前图片": "Current image",
  "已选择：": "Selected: ",
  "图片说明": "Image description",
  "图片适应方式": "Image fit",
  "完整显示": "Show complete image",
  "填满并裁切": "Fill and crop",
  "保存此页": "Save slide",
  "取消修改": "Cancel edits",
  "撤销上次修改": "Undo last change",
  "质量提醒（": "Quality findings (",
  "第 ": "Slide ",
  " 页：": ": ",
  "下载最新 PPTX": "Download latest PPTX",
  "下载成品包 ZIP": "Download delivery ZIP",
  "成品包包含 PPTX、HTML 和工程文件。请先保存修改，再下载最新版本。": "The bundle includes the PPTX, HTML and project file. Save your edits before downloading the latest version.",
  "下载 HTML": "Download HTML",
  "备份工程": "Back up project",
  "快捷键：Ctrl/⌘+S 保存 · Esc 取消或返回 · Alt+←/→ 切换页面": "Shortcuts: Ctrl/⌘+S save · Esc cancel or go back · Alt+←/→ switch slides",
  "未保存": "Unsaved",
  "有未保存修改，确定取消吗？": "Discard unsaved changes?",
  "已取消未保存的修改。": "Unsaved changes discarded.",
  "有未保存修改，离开页面会丢失。": "You have unsaved changes that will be lost.",
  "重试": "Retry",
  "复制示例": "Copy example",
  "已复制示例": "Example copied",
  "演示文稿": "Presentations"
});
function languageOf(locale = localeService) {
  try { return String(locale?.getSnapshot?.().active || '').startsWith('en') ? 'en' : 'zh'; } catch { return 'zh'; }
}
function t(zh) { return languageOf() === 'en' ? (EN[zh] ?? zh) : zh; }
function englishError(message, status) {
  if (status === 401) return 'Your session has expired. Reopen DSH and try again.';
  if (status === 404) return 'The presentation workbench is unavailable. Check that the plugin is loaded and restart DSH.';
  if (status === 409) return 'The project changed. Load the latest version and review your edits before saving.';
  return /[\u3400-\u9fff]/.test(message || '') ? 'The operation failed. Check the project files and DSH logs, then retry.' : message;
}
function useLanguage(locale) {
  const [, rerender] = useState(0);
  useEffect(() => { const update = () => rerender(n => n + 1); update(); return locale?.subscribe?.(update); }, [locale]);
}

  const ROUTE = 'api/dsh-ppt/workbench';
  const fields = [['title', '标题'], ['subtitle', '副标题'], ['kicker', '眉题'], ['text', '正文'], ['bullets', '要点（每行一条）'], ['notes', '演讲备注']];
  const css = `
  .pptw {--fg:var(--dsw-alias-label-primary,#27354b);--fg-muted:var(--dsw-alias-label-tertiary,#66768a);--bg:var(--dsw-alias-bg-layer-1,#fff);--bg-surface:var(--dsw-alias-bg-layer-2,#fff);--border:var(--dsw-alias-border-l3,#ccd8e5);color:var(--fg);font:14px/1.6 system-ui,sans-serif;min-width:0;max-width:1140px;margin:0 auto;padding:8px}
  .pptw *{box-sizing:border-box}.pptw h2{font-size:22px;margin:0}.pptw h3{font-size:16px;margin:12px 0 6px}
  .pptw .muted{color:var(--fg-muted,#66768a);font-size:13px}.pptw .tools{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;align-items:center}
  .pptw button{font:inherit;border:1px solid var(--border,#ccd8e5);border-radius:9px;background:var(--bg-surface,#fff);color:inherit;padding:7px 12px;cursor:pointer;text-align:left;white-space:normal}
  .pptw button.primary{background:#245ee9;border-color:#245ee9;color:#fff}.pptw button:disabled{opacity:.45;cursor:default}
  .pptw input:not([type=file]),.pptw textarea,.pptw select{font:inherit;color:inherit;width:100%;background:var(--bg,#fff);border:1px solid var(--border,#c9d5e4);border-radius:8px;padding:8px 10px}
  .pptw textarea{resize:vertical}.pptw label{display:block;margin:8px 0 3px}.pptw .layout{display:grid;grid-template-columns:minmax(130px,190px) minmax(0,1fr);gap:14px}
  .pptw .pages{display:flex;flex-direction:column;gap:5px;max-height:480px;overflow:auto}.pptw .pages button[aria-current=true]{background:#245ee9;color:#fff}
  .pptw .preview{border:1px solid var(--border,#ced8e6);border-radius:12px;overflow:hidden;background:#f0f4fa;aspect-ratio:16/9;position:relative}
  .pptw iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.pptw .render-page{width:100%;display:block}
  .pptw .notice{border-radius:9px;padding:10px 12px;margin:10px 0;background:color-mix(in srgb,#5686fe 12%,var(--bg-surface));color:var(--fg);overflow-wrap:anywhere}.pptw .error{background:color-mix(in srgb,#f25a5a 14%,var(--bg-surface))}
  .pptw .card{border:1px solid var(--border,#d5dfeb);border-radius:12px;padding:12px;margin:10px 0;background:var(--bg-surface,#fff)}
  .pptw .coaching{margin-top:24px}.pptw .coaching-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px}
  .pptw .coaching label.choice{display:flex;gap:8px;align-items:flex-start}.pptw .coaching input[type=checkbox]{width:auto;flex:none;margin-top:5px}
  .pptw .coaching pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin:6px 0}.pptw .coaching blockquote{margin:8px 0;padding-left:12px;border-left:3px solid var(--border,#ccd8e5);overflow-wrap:anywhere}
  .pptw .coaching .card{overflow-wrap:anywhere}.pptw .coaching .before-after{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .pptw .project-list{display:flex;flex-direction:column;gap:8px}.pptw .project-list button{display:block;width:100%}
  .pptw .file{font-size:12px;overflow-wrap:anywhere}.pptw .image-preview{width:100%;max-height:160px;object-fit:contain;background:#edf2f8;border-radius:8px}
  .pptw :focus-visible{outline:3px solid #78a8ff;outline-offset:2px}.pptw .dirty{color:#986114;font-size:13px}
.pptw .badge-dirty{color:#986114;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:rgba(245,158,11,.14);border:1px solid rgba(245,158,11,.35);margin-left:4px}
.pptw .notice button{margin-left:8px;padding:2px 9px;border-radius:6px;border:1px solid currentColor;background:transparent;color:inherit;font-size:12px;cursor:pointer}
  [role=dialog]:has(.pptw){width:min(1200px,calc(100vw - 48px))!important;max-width:1200px!important}
  @media(max-width:700px){.pptw .layout{grid-template-columns:1fr}.pptw .pages{max-height:180px}.pptw .preview{min-height:190px}.pptw{padding:3px}
    .pptw .coaching-grid,.pptw .coaching .before-after{grid-template-columns:1fr}
    [role=dialog]:has(.pptw){width:100%!important;max-width:100%!important;flex-direction:column!important}
    [role=dialog]:has(.pptw)>nav+div{min-width:0;width:100%}
    [role=dialog]:has(.pptw)>nav+div>div:has(.pptw){padding:12px!important;min-width:0}
    [role=dialog]:has(.pptw) nav{width:100%!important;flex-basis:auto!important;border-right:0;max-height:170px;overflow:auto}
    [role=dialog]:has(.pptw) nav>div:has(>button){display:flex;flex-direction:row!important;flex-wrap:wrap;flex-shrink:0;gap:4px}
  }`;

  async function action(body, signal) {
    const response = await fetch(new URL(ROUTE, document.baseURI), { method: 'POST', credentials: 'same-origin', signal,
      headers: { 'content-type': 'application/json', 'x-dsh-ppt-action': '1' }, body: JSON.stringify(body) });
    let value;
    try { value = await response.json(); } catch { throw new Error(t("无法读取服务响应，请检查插件是否加载")) }
    if (!response.ok || value.ok === false) { const localized = languageOf() === 'en' ? value.messageEn || englishError(value.message, response.status) : value.message; const hint = languageOf() === 'en' ? value.installationHintEn : value.installationHint; const error = new Error((localized || t("操作未完成")) + (hint ? '\n' + hint : '')); error.status = response.status; throw error; }
    return value;
  }
  function draftFor(slide) {
    return { title: slide.title || '', subtitle: slide.subtitle || '', kicker: slide.kicker || '', text: slide.text || '',
      bullets: (slide.bullets || []).join('\n'), notes: slide.notes || '' };
  }
  function editorHtml(html, nonce) {
    const bridge = `<style>#hud,#delivery-bar,#review-panel,#progress,#notes-panel,#help-panel,#toast,#blank{display:none!important}.slide-frame{pointer-events:none!important}.slide-frame .slide{pointer-events:auto!important}</style><script>(function(){const nonce=${JSON.stringify(nonce)};
      function tell(field){parent.postMessage({type:'dsh-ppt-select',nonce:nonce,field:field},'*')}
      document.addEventListener('keydown',function(e){
        var mod=e.ctrlKey||e.metaKey;
        if(mod&&(e.key==='s'||e.key==='S')){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'dsh-ppt-shortcut',nonce:nonce,key:'save'},'*');return}
        if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'dsh-ppt-shortcut',nonce:nonce,key:'escape'},'*');return}
        if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'dsh-ppt-shortcut',nonce:nonce,key:e.key==='ArrowLeft'?'prev':'next'},'*');return}
        e.stopImmediatePropagation();if(e.key!=='Tab')e.preventDefault()
      },true);
      document.addEventListener('touchstart',function(e){e.stopImmediatePropagation()},true);
      document.addEventListener('touchend',function(e){e.stopImmediatePropagation()},true);
      document.addEventListener('wheel',function(e){e.stopImmediatePropagation()},{capture:true,passive:true});
      document.addEventListener('click',function(e){const n=e.target.closest('h1,h2,.subtitle,.kicker,.statement-title,.quote-text,.quote-attr,li');if(!n)return;
        e.preventDefault();e.stopImmediatePropagation();let field=n.matches('li')?'bullets':n.matches('.subtitle,.quote-attr')?'subtitle':n.matches('.kicker')?'kicker':'title';tell(field)},true);
      window.addEventListener('message',function(e){if(e.source!==parent||e.data?.nonce!==nonce||e.data.type!=='dsh-ppt-jump')return;window.__dshPpt?.jump(e.data.page)});
    })();<\/script>`;
    const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; form-action 'none'">`;
    // Presenter code contains a quoted </body>; only append at the document end.
    return html.replace(/<head>/i, '<head>' + policy).replace(/<\/body>(\s*<\/html>\s*)$/i, bridge + '</body>$1');
  }
  function createImageLoader() {
    let current = null;
    function cancel() {
      const reader = current; current = null;
      if (reader?.readyState === 1) reader.abort();
    }
    return {
      cancel,
      get pending() { return current !== null; },
      read(file, success, failure) {
        cancel(); const reader = new FileReader(); current = reader;
        const settle = callback => { if (current !== reader) return; current = null; callback(); };
        reader.onload = () => settle(() => success(String(reader.result)));
        reader.onerror = () => settle(failure);
        reader.onabort = () => { if (current === reader) current = null; };
        try { reader.readAsDataURL(file); } catch { settle(failure); }
      },
    };
  }
  function CoachingPanel({ project, selected, blocked, onAdopt, onChoose }) {
    const L = (zh, en) => languageOf() === 'en' ? en : zh;
    const [mode, setMode] = useState(''), [routes, setRoutes] = useState([]), [route, setRoute] = useState('');
    const [difficulty, setDifficulty] = useState('normal'), [audience, setAudience] = useState('general'), [limit, setLimit] = useState(1);
    const [scope, setScope] = useState('all'), [material, setMaterial] = useState(''), [run, setRun] = useState(null), [history, setHistory] = useState([]);
    const [answer, setAnswer] = useState(''), [patches, setPatches] = useState([]), [backups, setBackups] = useState([]);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const active = useRef(null), alive = useRef(true), current = useRef(null), runRef = useRef(null), reading = useRef(0);
    current.current = { project, selected, blocked }; runRef.current = run;
    const stale = !!run && (run.stale || run.revision !== project.revision);
    const maxCalls = mode === 'review' ? limit : limit + 1;
    const modeName = value => value === 'review' ? L('AI 预审', 'AI review') : L('模拟答辩', 'Rehearsal');
    const statusName = value => ({ ready: L('等待下一步', 'Ready'), busy: L('正在调用模型', 'Calling model'), paused: L('已暂停', 'Paused'), complete: L('已结束', 'Finished') })[value] || value;
    const kindName = value => ({ expression: L('表达建议', 'Expression'), logic: L('逻辑问题', 'Logic'), evidence: L('证据缺口', 'Missing evidence') })[value];
    function accept(value) { if (alive.current) { runRef.current = value; setRun(value); } }
    const request = (operation, data = {}, signal) => action({ operation: 'coach-' + operation, id: current.current.project.id, expectedRevision: current.current.project.revision, ...data }, signal);
    async function refresh(signal) { const value = await request('list', {}, signal); if (alive.current) setHistory(value.runs); }
    useEffect(() => {
      alive.current = true;
      return () => {
        alive.current = false; reading.current++;
        if (active.current) {
          active.current.abort();
          const item = runRef.current;
          if (item) void request('stop', { runId: item.id }).catch(() => {});
        }
      };
    }, []);
    useEffect(() => {
      if (!run || run.status !== 'busy' || busy) return;
      const controller = new AbortController();
      const timer = setInterval(() => { void request('get', { runId: run.id }, controller.signal).then(value => { if (!controller.signal.aborted) accept(value.run); }).catch(() => {}); }, 750);
      return () => { clearInterval(timer); controller.abort(); };
    }, [run?.id, run?.status, busy]);
    async function task(work) {
      if (active.current) return;
      const controller = new AbortController(); active.current = controller;
      setBusy(true); setError(''); setNotice('');
      try { await work(controller.signal); }
      catch (e) {
        if (!alive.current) return;
        if (!controller.signal.aborted) setError(e.message || L('操作失败', 'Operation failed'));
        const item = runRef.current;
        if (item) { try { accept((await request('get', { runId: item.id })).run); } catch { /* Keep visible results. */ } }
      } finally {
        if (active.current === controller) active.current = null;
        if (alive.current) setBusy(false);
      }
    }
    function configure(value) {
      if (active.current || !canLeave()) return;
      setMode(value); setLimit(value === 'review' ? 1 : 3); accept(null); setPatches([]); setBackups([]); setAnswer('');
      return task(async signal => {
        const results = await Promise.allSettled([request('options', {}, signal), refresh(signal)]);
        if (signal.aborted || !alive.current) return;
        const available = results[0];
        if (available.status === 'rejected') throw available.reason;
        const models = available.value.routes;
        setRoutes(models);
        const preferred = models.findIndex(r => r.provider === project.modelRoute?.provider && r.model === project.modelRoute?.model);
        setRoute(models.length ? String(Math.max(0, preferred)) : '');
        if (!models.length) setNotice(L('先在 DSH 的模型设置中配置可用模型，再点“刷新模型”。成品仍可直接下载。', 'Configure a model in DSH, then refresh models. Your finished files remain available.'));
        if (results[1].status === 'rejected') throw results[1].reason;
      });
    }
    function canLeave() {
      const item = runRef.current, question = item?.questions.at(-1);
      return !(item?.mode === 'practice' && question && !question.feedback && answer.trim() && answer.trim() !== (question.answer || '')) || window.confirm(L('当前回答尚未提交，离开会丢失。继续吗？', 'Your answer has not been submitted and will be lost. Continue?'));
    }
    async function advance(item, signal, response) {
      let next = (await request('step', { runId: item.id, confirmed: true, ...(response === undefined ? {} : { answer: response }) }, signal)).run;
      accept(next);
      // Only this explicit Start click authorizes the configured review rounds.
      while (next.mode === 'review' && next.status === 'ready' && !next.stale && !signal.aborted && current.current.project.revision === next.revision) {
        next = (await request('step', { runId: next.id, confirmed: true }, signal)).run; accept(next);
      }
      await refresh(signal);
      if (alive.current && response !== undefined) setAnswer('');
    }
    function start() {
      if (current.current.blocked) return;
      return task(async signal => {
        const model = routes[Number(route)]; if (!model) throw new Error(L('请选择模型', 'Choose a model'));
        reading.current++;
        const item = (await request('create', { confirmed: true, mode, ...model, difficulty, audience, limit, material,
          language: languageOf(), ...(scope === 'current' ? { slideId: current.current.selected } : {}) }, signal)).run;
        accept(item); await advance(item, signal);
      });
    }
    function stop() {
      active.current?.abort();
      if (runRef.current) void request('stop', { runId: runRef.current.id }).then(value => accept(value.run)).catch(e => { if (alive.current) setError(e.message); });
      setNotice(L('已请求停止。已完成的结果保留，本次调用仍可能计费。', 'Stop requested. Completed results are kept; the current call may still be billed.'));
    }
    function finish() { return task(async signal => { accept((await request('finish', { runId: run.id }, signal)).run); await refresh(signal); }); }
    function openReport(id) { if (!canLeave()) return; return task(async signal => { const value = (await request('get', { runId: id }, signal)).run; accept(value); setMode(value.mode); setAnswer(value.questions.at(-1)?.answer || ''); setPatches([]); setBackups([]); }); }
    function removeReport() {
      if (!window.confirm(L('删除这次本地演练记录？幻灯片成品不受影响。', 'Delete this local rehearsal record? Presentation files are kept.'))) return;
      return task(async signal => { await request('delete', { runId: run.id }, signal); accept(null); await refresh(signal); });
    }
    function exportReport() {
      const url = new URL('api/dsh-ppt/download', document.baseURI);
      for (const [key, value] of Object.entries({ id: project.id, kind: 'coaching', revision: project.revision, run: run.id })) url.searchParams.set(key, String(value));
      const link = document.createElement('a'); link.href = url.href; link.download = ''; link.hidden = true; document.body.append(link); link.click(); link.remove();
    }
    function applySelected() {
      if (current.current.blocked || stale) return;
      return task(async signal => {
        const value = await request('apply', { runId: run.id, confirmed: true, selected: patches, backup: backups }, signal);
        if (alive.current) onAdopt(value.project);
      });
    }
    async function uploadMaterial(event) {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      const ticket = ++reading.current;
      if (!/\.(txt|md)$/i.test(file.name) || file.size > 100000) { setError(L('请选择 100 KB 以内的 TXT / Markdown 文件。', 'Choose a TXT / Markdown file up to 100 KB.')); return; }
      try {
        const value = await file.text();
        if (!alive.current || ticket !== reading.current) return;
        if (value.length > 20000) throw new Error(L('补充材料最多 20000 字符。', 'Supporting material: up to 20,000 characters.'));
        setMaterial(value); setError('');
      } catch (e) { if (alive.current && ticket === reading.current) setError(e.message); }
    }
    function toggle(set, values, id) { set(values.includes(id) ? values.filter(v => v !== id) : [...values, id]); }
    function pageButton(id) {
      const index = project.slides.findIndex(s => s.id === id);
      return h('button', { disabled: blocked || index < 0, onClick: () => onChoose(id) }, L('查看第 ' + (index + 1) + ' 页', 'View slide ' + (index + 1)));
    }
    function source(card) { return card.reference ? h('blockquote', null, h('small', { className: 'muted' }, card.reference === 'material' ? L('补充材料中的原文', 'Quote from supporting material') : L('幻灯片中的原文', 'Quote from slides')), h('pre', null, card.quote)) : h('p', { className: 'muted' }, L('未匹配到材料原文，请核对或补充依据。', 'No matching source quote. Verify or add supporting evidence.')); }
    const last = run?.questions.at(-1);
    useEffect(() => {
      if (!last || last.feedback || !answer.trim() || answer.trim() === (last.answer || '')) return;
      const warn = event => { event.preventDefault(); event.returnValue = ''; };
      window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
    }, [run?.id, last?.id, last?.feedback, last?.answer, answer]);
    return h('section', { className: 'card coaching', 'aria-label': L('可选演练', 'Optional rehearsal'), onKeyDown: e => { if (e.key === 'Escape' || (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.stopPropagation(); if (e.key.toLowerCase() === 's') e.preventDefault(); } } },
      h('h3', null, L('想再准备充分一点？', 'Want to prepare further?')),
      h('p', { className: 'muted' }, L('成品已可下载。以下两项按需开启，不影响直接交付。', 'Your files are ready to download. Both options below are optional.')),
      h('div', { className: 'tools' }, h('button', { disabled: busy, 'aria-pressed': mode === 'review', onClick: () => configure('review') }, L('AI 预审', 'AI review')), h('button', { disabled: busy, 'aria-pressed': mode === 'practice', onClick: () => configure('practice') }, L('模拟答辩', 'Rehearsal')),
        mode && h('button', { disabled: busy, onClick: () => { if (canLeave()) { setMode(''); accept(null); setAnswer(''); } } }, L('收起', 'Collapse'))),
      mode && h(React.Fragment, null,
        error && h('div', { role: 'alert', className: 'notice error' }, error),
        notice && h('div', { role: 'status', className: 'notice' }, notice),
        busy && h('div', { role: 'status', className: 'tools' }, L('正在处理…可以继续预览或下载成品。', 'Working… You can still preview or download your presentation.'), h('button', { onClick: stop }, L('停止', 'Stop'))),
        !run && h(React.Fragment, null,
          h('p', null, mode === 'review' ? L('AI 根据材料模拟质疑与回答，最多保留 5 个值得改进的问题。', 'AI simulates questions and answers based on your material, keeping up to five useful findings.') : L('AI 一次问一题，你来回答；可随时结束并整理已完成的问答。', 'AI asks one question at a time. You answer and can finish at any point.')),
          h('div', { className: 'coaching-grid' },
            h('label', null, L('模型', 'Model'), h('select', { 'aria-label': L('演练模型', 'Rehearsal model'), value: route, disabled: busy, onChange: e => setRoute(e.target.value) }, !routes.length && h('option', { value: '' }, L('暂无可用模型', 'No configured model')), routes.map((r, i) => h('option', { key: i, value: i }, r.label)))),
            h('label', null, L('听众', 'Audience'), h('select', { 'aria-label': L('听众', 'Audience'), value: audience, disabled: busy, onChange: e => setAudience(e.target.value) }, [['general', L('一般听众', 'General audience')], ['management', L('管理层 / 客户', 'Management / clients')], ['academic', L('答辩评委', 'Academic panel')]].map(([v, label]) => h('option', { key: v, value: v }, label)))),
            h('label', null, L('提问强度', 'Difficulty'), h('select', { 'aria-label': L('提问强度', 'Difficulty'), value: difficulty, disabled: busy, onChange: e => setDifficulty(e.target.value) }, [['gentle', L('温和', 'Gentle')], ['normal', L('普通', 'Normal')], ['strict', L('严格', 'Strict')]].map(([v, label]) => h('option', { key: v, value: v }, label)))),
            h('label', null, mode === 'review' ? L('预审轮数', 'Review rounds') : L('答辩题数', 'Questions'), h('select', { 'aria-label': mode === 'review' ? L('预审轮数', 'Review rounds') : L('答辩题数', 'Questions'), value: limit, disabled: busy, onChange: e => setLimit(Number(e.target.value)) }, Array.from({ length: mode === 'review' ? 3 : 5 }, (_, i) => h('option', { key: i, value: i + 1 }, String(i + 1))))),
            h('label', null, L('检查范围', 'Scope'), h('select', { 'aria-label': L('检查范围', 'Scope'), value: scope, disabled: busy, onChange: e => setScope(e.target.value) }, h('option', { value: 'all' }, L('整个工程', 'Whole presentation')), h('option', { value: 'current' }, L('当前页', 'Current slide'))))),
          h('label', { htmlFor: 'ppt-coach-material' }, L('补充材料（可选）', 'Supporting material (optional)')),
          h('textarea', { id: 'ppt-coach-material', rows: 3, maxLength: 20000, value: material, disabled: busy, onChange: e => { reading.current++; setMaterial(e.target.value); } }),
          h('label', null, L('或导入 TXT / Markdown', 'Or import TXT / Markdown'), h('input', { type: 'file', accept: '.txt,.md,text/plain,text/markdown', disabled: busy, onChange: uploadMaterial })),
          h('p', { className: 'muted' }, L('将所选页面的文字、图表数据、备注及补充材料发送给所选 DSH 模型，不发送图片文件。最多 ' + maxCalls + ' 次插件调用；模型服务自身的重试与计费规则仍适用。', 'Sends selected slide text, chart data, notes and supporting material to the chosen DSH model. Image files are excluded. Up to ' + maxCalls + ' plugin calls; provider retry and billing rules still apply.')),
          h('div', { className: 'tools' }, h('button', { disabled: busy || blocked || !routes.length, onClick: start }, mode === 'review' ? L('开始 AI 预审', 'Start AI review') : L('开始模拟答辩', 'Start rehearsal')), h('button', { disabled: busy, onClick: () => configure(mode) }, L('刷新模型', 'Refresh models'))),
          blocked && h('p', { className: 'muted' }, L('请先保存或取消幻灯片修改。', 'Save or cancel slide edits first.'))),
        run && h(React.Fragment, null,
          h('h3', null, modeName(run.mode) + ' · ' + statusName(run.status)),
          h('p', { className: 'muted' }, L('修订 ', 'Revision ') + run.revision + ' · ' + run.route.provider + ' / ' + run.route.model + ' · ' + L('调用 ', 'Calls ') + run.usedCalls + '/' + run.maxCalls),
          h('p', { className: 'muted' }, L('AI 意见不等于事实核验，也不代表真实听众的评价。请先看原文与改动，再决定是否采纳。', 'AI suggestions are not fact checks or predictions of audience feedback. Compare sources and edits before adopting them.')),
          stale && h('div', { role: 'alert', className: 'notice' }, L('工程已经修改。旧报告仍可导出，但不能继续调用或采纳；请重新开始。', 'The presentation changed. You can export this report, but cannot continue or apply it. Start a new rehearsal.')),
          run.error && h('p', { className: 'muted' }, languageOf() === 'en' ? run.error.split(' / ').at(-1) : run.error.split(' / ')[0]),
          run.findings.map(f => {
            const slide = project.slides.find(s => s.id === f.slideId);
            return h('article', { key: f.id, className: 'card' }, h('strong', null, kindName(f.kind) + ' · ' + f.issue), h('div', { className: 'tools' }, pageButton(f.slideId)),
              h('p', null, f.question), h('p', null, f.answer), h('p', null, f.suggestion), source(f),
              f.patch && h(React.Fragment, null, h('details', null, h('summary', null, L('比较原文和建议', 'Compare before and after')), Object.entries(f.patch).map(([key, value]) => h('div', { key }, h('strong', null, t(fields.find(([name]) => name === key)?.[1] || key)), h('div', { className: 'before-after' }, h('div', null, h('small', null, L('原文', 'Before')), h('pre', null, Array.isArray(slide?.[key]) ? slide[key].join('\n') : slide?.[key] || '')), h('div', null, h('small', null, L('建议', 'After')), h('pre', null, Array.isArray(value) ? value.join('\n') : value)))))),
                h('label', { className: 'choice' }, h('input', { type: 'checkbox', disabled: busy || stale, checked: patches.includes(f.id), onChange: () => toggle(setPatches, patches, f.id) }), L('采纳这项表达修改', 'Adopt this expression edit'))),
              h('label', { className: 'choice' }, h('input', { type: 'checkbox', disabled: busy || stale, checked: backups.includes(f.id), onChange: () => toggle(setBackups, backups, f.id) }), L('选为备用问答页', 'Add as a backup Q&A slide')));
          }),
          run.mode === 'review' && run.status === 'complete' && !run.findings.length && h('p', null, L('本次未提出明显问题。仍建议检查事实、字体和最终 PPTX。', 'No findings this time. Still check facts, fonts and the final PPTX.')),
          run.questions.map((q, i) => h('article', { key: q.id, className: 'card' }, h('strong', null, (i + 1) + '. ' + q.question), h('div', { className: 'tools' }, pageButton(q.slideId)), q.answer && h('p', null, L('你的回答：', 'Your answer: ') + q.answer), q.feedback && h('p', null, q.feedback), q.needsEvidence && h('p', { className: 'muted' }, L('待补充依据', 'Evidence needed')), source(q),
            q.answer && h('label', { className: 'choice' }, h('input', { type: 'checkbox', disabled: busy || stale, checked: backups.includes(q.id), onChange: () => toggle(setBackups, backups, q.id) }), L('选为备用问答页', 'Add as a backup Q&A slide')))),
          run.mode === 'practice' && last && !last.feedback && run.status !== 'complete' && !stale && h(React.Fragment, null,
            h('label', { htmlFor: 'ppt-coach-answer' }, L('你的回答', 'Your answer')), h('textarea', { id: 'ppt-coach-answer', maxLength: 4000, rows: 4, value: answer, disabled: busy, onChange: e => setAnswer(e.target.value) }),
            h('button', { disabled: busy || blocked || !answer.trim() || run.usedCalls >= run.maxCalls, onClick: () => task(signal => advance(run, signal, answer)) }, L('提交回答，继续', 'Submit answer and continue'))),
          h('div', { className: 'tools' }, h('button', { disabled: busy, onClick: exportReport }, L('下载问答与材料清单', 'Download Q&A and evidence checklist')),
            h('button', { disabled: busy || blocked || stale || !(patches.length + backups.length), onClick: applySelected }, L('将所选内容保存为副本', 'Save selected changes as a copy')),
            run.status !== 'complete' && h('button', { disabled: busy || run.status === 'busy', onClick: finish }, L('结束并整理已有结果', 'Finish with current results')),
            h('button', { disabled: busy, onClick: () => configure(run.mode) }, L('重新开始', 'Start again')),
            h('button', { disabled: busy || run.status === 'busy', onClick: removeReport }, L('删除本次记录', 'Delete this record'))),
          h('p', { className: 'muted' }, L('采纳后会生成新副本，原稿保留；副本中可“撤销上次修改”。备用页包含 AI 演练标记，请核对后再对外展示。', 'Adoption creates a copy and keeps the original. Undo last change also works in the copy. Backup slides identify AI rehearsal content; verify before presenting.'))),
        history.length > 0 && h('details', null, h('summary', null, L('本机历史记录（', 'Local history (') + history.length + L('）', ')')), h('div', { className: 'project-list' }, history.map(item => h('button', { key: item.id, disabled: busy, onClick: () => openReport(item.id) }, modeName(item.mode) + ' · ' + L('修订 ', 'Revision ') + item.revision + ' · ' + new Date(item.createdAt).toLocaleString(languageOf() === 'en' ? 'en-US' : 'zh-CN')))))));
  }
  function Workbench({ locale } = {}) {
    useLanguage(locale);
    const [projects, setProjects] = useState([]), [project, setProject] = useState(null), [selected, setSelected] = useState('');
    const [draft, setDraft] = useState({}), [image, setImage] = useState(null), [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false), [job, setJob] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('');
    const [mode, setMode] = useState('html'), [raster, setRaster] = useState('');
    const [conflict, setConflict] = useState(false), [overlaps, setOverlaps] = useState([]);
    const frame = useRef(null), previewBox = useRef(null), fieldRefs = useRef({}), alive = useRef(true), operations = useRef(new Set());
    const imageLoader = useRef(null);
    if (!imageLoader.current) imageLoader.current = createImageLoader();
    const imagePending = imageLoader.current.pending;
    const nonce = useRef(crypto.randomUUID());
    const previewDocument = useMemo(() => project?.html ? editorHtml(project.html, nonce.current) : '', [project?.html]);
    const index = project ? Math.max(0, project.slides.findIndex(s => s.id === selected)) : 0;
    const slide = project?.slides[index];
    function adopt(next, preferred) {
      imageLoader.current.cancel();
      setProject(next);
      const row = next.slides.find(s => s.id === preferred) || next.slides[0];
      setSelected(row.id); setDraft(draftFor(row)); setImage(null); setDirty(false); setRaster(''); setOverlaps([]);
      if (!next.render) setMode('html');
    }
    async function perform(work, success, label = t("正在处理，请稍候…")) {
      setBusy(true); setJob(label); setError(''); setMessage(''); setConflict(false);
      const controller = new AbortController(); operations.current.add(controller);
      try { const result = await work(controller.signal); if (alive.current && success) success(result); }
      catch (e) { if (alive.current) { setError(e.message || t("操作失败")); setConflict(e.status === 409); } }
      finally { operations.current.delete(controller); if (alive.current) setBusy(false); }
    }
    function refreshList() { return perform(signal => action({ operation: 'list' }, signal), value => setProjects(value.projects)); }
    useEffect(() => {
      alive.current = true; const abort = new AbortController();
      action({ operation: 'list' }, abort.signal).then(value => { if (alive.current) setProjects(value.projects) }).catch(e => { if (!abort.signal.aborted) setError(e.message) });
      return () => { alive.current = false; abort.abort(); imageLoader.current.cancel(); for (const operation of operations.current) operation.abort(); };
    }, []);
    useEffect(() => {
      function receive(event) {
        if (event.source !== frame.current?.contentWindow || event.data?.nonce !== nonce.current || mode !== 'html') return;
        if (event.data.type === 'dsh-ppt-shortcut') { handleShortcut(event.data.key); return; }
        if (event.data.type !== 'dsh-ppt-select') return;
        const key = event.data.field;
        const field = fields.find(([field]) => field === key);
        if (field) { fieldRefs.current[key]?.focus(); fieldRefs.current[key]?.scrollIntoView({ block: 'nearest' }); setMessage(t("已定位到") + t(field[1]) + t("，在字段中修改后保存。")); }
      }
      window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
    }, [mode, project, dirty, busy, imagePending, index, selected, draft, image]);
    useEffect(() => {
      if (mode !== 'html' || !project || !previewBox.current) return;
      // Align iframe edges/dimensions when the host uses fractional text metrics.
      const box = previewBox.current;
      function align() {
        const target = frame.current; if (!target) return;
        const r = box.getBoundingClientRect(), x = r.x + box.clientLeft, y = r.y + box.clientTop;
        target.style.width = box.clientWidth + 'px'; target.style.height = box.clientHeight + 'px';
        target.style.transform = 'translate(' + (Math.ceil(x) - x) + 'px,' + (Math.ceil(y) - y) + 'px)';
      }
      align(); const observer = new ResizeObserver(align); observer.observe(box);
      window.addEventListener('scroll', align, true);
      return () => { observer.disconnect(); window.removeEventListener('scroll', align, true); };
    }, [mode, !!project]);
    function jump() { frame.current?.contentWindow?.postMessage({ type: 'dsh-ppt-jump', nonce: nonce.current, page: index }, '*'); }
    useEffect(() => { jump(); }, [index, project?.revision, mode]);
    useEffect(() => {
      if (mode !== 'pptx' || !project?.render) return;
      const abort = new AbortController(); setRaster('');
      action({ operation: 'page', id: project.id, page: index + 1 }, abort.signal).then(value => setRaster(value.data)).catch(e => { if (!abort.signal.aborted) setError(e.message) });
      return () => abort.abort();
    }, [mode, index, project?.revision]);
    function handleShortcut(key) {
      if (key === 'save') { if (project && dirty && !busy && !imagePending) save(); return; }
      if (key === 'escape') {
        if (!project || busy || imagePending) return;
        if (dirty) {
          if (!window.confirm(t("有未保存修改，确定取消吗？"))) return;
          setDraft(draftFor(slide)); setImage(null); setDirty(false); setError(''); setMessage(t("已取消未保存的修改。"));
        } else {
          imageLoader.current.cancel(); setProject(null); refreshList();
        }
        return;
      }
      if (key === 'prev' || key === 'next') {
        if (!project || busy || dirty || imagePending) return;
        const next = index + (key === 'next' ? 1 : -1);
        if (next >= 0 && next < project.slides.length) choose(project.slides[next]);
      }
    }
    useEffect(() => {
      function onKey(event) {
        if (event.isComposing || event.defaultPrevented) return;
        if (event.key === 'Escape' && event.target && event.target.tagName === 'SELECT') return;
        const mod = event.ctrlKey || event.metaKey;
        if (mod && (event.key === 's' || event.key === 'S')) {
          if (!project) return;
          event.preventDefault(); handleShortcut('save'); return;
        }
        if (event.key === 'Escape') {
          if (!project || busy || imagePending) return;
          event.preventDefault(); handleShortcut('escape'); return;
        }
        if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
          if (!project || busy || dirty || imagePending) return;
          event.preventDefault(); handleShortcut(event.key === 'ArrowRight' ? 'next' : 'prev');
        }
      }
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [project, dirty, busy, imagePending, index, selected, draft, image]);
    useEffect(() => {
      if (!dirty) return;
      function warn(event) { event.preventDefault(); event.returnValue = t("有未保存修改，离开页面会丢失。"); }
      window.addEventListener('beforeunload', warn);
      return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);
    function open(id) { return perform(signal => action({ operation: 'open', id }, signal), value => { adopt(value.project); setMessage(t("点击预览里的文字，或在下方修改字段。")); }); }
    function keepInputsAndReload() {
      const original = draftFor(slide), keys = fields.filter(([key]) => draft[key] !== original[key]).map(([key]) => key), pending = { ...draft }, pendingImage = image;
      return perform(signal => action({ operation: 'open', id: project.id }, signal), value => {
        const row = value.project.slides.find(s => s.id === selected);
        if (!row) { setError(t("当前页已被删除，输入仍保留，请复制需要的内容后取消修改。")); return; }
        const latest = draftFor(row), merged = { ...latest }, shared = [];
        for (const key of keys) { merged[key] = pending[key]; if (latest[key] !== original[key] && latest[key] !== pending[key]) shared.push({ key, latest: latest[key], yours: pending[key] }); }
        adopt(value.project, selected); setDraft(merged); setImage(pendingImage); setDirty(keys.length > 0 || !!pendingImage); setOverlaps(shared);
        setMessage(t("已载入最新版本并保留你的修改，请核对后再保存。"));
      });
    }
    function choose(row) { if (dirty || busy) return; imageLoader.current.cancel(); setSelected(row.id); setDraft(draftFor(row)); setImage(null); setMessage(''); }
    function save(saveAs = false) {
      const original = draftFor(slide), patch = {};
      for (const [key] of fields) if (draft[key] !== original[key]) patch[key] = key === 'bullets' ? draft[key].split('\n').map(v => v.trim()).filter(Boolean) : draft[key];
      if (image) patch.image = { src: image.src, alt: image.alt, fit: image.fit, caption: image.caption };
      return perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, slide: slide.id, patch, saveAs }, signal), value => {
        adopt(value.project, slide.id); setMessage(saveAs ? t("副本已保存，原文件保留。副本从工程生成，不包含 Office 手工修改。") : value.changed === false ? t("内容没有变化。") : t("已保存，HTML、PPTX 和工程文件已同步更新。"));
      });
    }
    function move(delta) {
      const order = project.slides.map(s => s.id); [order[index], order[index + delta]] = [order[index + delta], order[index]];
      return perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, order }, signal), value => { adopt(value.project, slide.id); setMessage(t("页面顺序已更新，可撤销。")); });
    }
    function structure(operation) {
      return perform(signal => action({ operation, id: project.id, expectedRevision: project.revision, slide: slide.id }, signal), value => {
        adopt(value.project, value.selected);
        setMessage(operation === 'duplicate' ? t("页面已复制，图片、图表和备注一并保留，可撤销。") : t("页面已删除，可撤销。"));
      });
    }
    function undo() { return perform(signal => action({ operation: 'undo', id: project.id, expectedRevision: project.revision }, signal), value => { adopt(value.project, selected); setMessage(t("已撤销上次修改。")); }); }
    function render() {
      return perform(signal => action({ operation: 'render', id: project.id, expectedRevision: project.revision }, signal), value => { adopt(value.project, selected); setMode('pptx'); setMessage(t("当前 PPTX 已生成逐页图片，请查看画面。")); }, t("正在渲染最终 PPTX，较大文件可能需要几分钟…"));
    }
    function download(kind) {
      const url = new URL('api/dsh-ppt/download', document.baseURI);
      url.searchParams.set('id', project.id); url.searchParams.set('kind', kind); url.searchParams.set('revision', String(project.revision));
      // An authenticated attachment response keeps the click's user gesture and
      // works in WebViews whose native download handler cannot read blob URLs.
      const link = document.createElement('a'); link.href = url.href; link.download = '';
      link.hidden = true; document.body.append(link); link.click(); link.remove();
      setMessage(t("已请求下载，请查看浏览器的下载列表。"));
    }
    function copyExample() {
      const text = t("示例：请把这份材料制作成可直接交付的演示文稿，生成 HTML、PPTX 和工程文件。");
      try { navigator.clipboard?.writeText(text).then(() => setMessage(t("已复制示例"))).catch(() => {}); } catch (_) { /* ignore */ }
    }
    function upload(event) {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      imageLoader.current.cancel(); setMessage(''); setError('');
      if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError(t("请选择 5 MiB 以内的 PNG 或 JPEG 图片。")); return; }
      imageLoader.current.read(file, data => {
        if (!alive.current) return;
        setImage({ src: data, alt: slide.image?.alt || file.name.replace(/\.[^.]+$/, ''), caption: slide.image?.caption || '', fit: slide.image?.fit || 'contain', name: file.name });
        setDirty(true); setError(''); setMessage(t("图片已载入，保存后生效。"));
      }, () => { if (alive.current) { setError(t("无法读取图片，请重试。")); setMessage(''); } });
      if (imageLoader.current.pending) setMessage(t("正在读取图片，切换页面会取消本次读取。"));
    }
    const currentImage = image?.src || (slide?.image?.assetId && project.assets[slide.image.assetId]?.data);
    return h('div', { className: 'pptw', 'aria-busy': busy ? 'true' : undefined }, h('style', null, css),
      h('h2', null, t("演示文稿编辑")), h('p', { className: 'muted' }, t("修改本插件生成的成品，保存时同步更新 HTML、可编辑 PPTX 和工程文件。")),
      h('p', { className: 'muted' }, t("快捷键：Ctrl/⌘+S 保存 · Esc 取消或返回 · Alt+←/→ 切换页面")),
      error && h('div', { role: 'alert', className: 'notice error' }, error, ' ', h('button', { disabled: busy, onClick: () => project ? open(project.id) : refreshList() }, t("重试"))),
      conflict && project && h('button', { disabled: busy, onClick: keepInputsAndReload }, t("载入最新版本，保留我的输入")),
      message && h('div', { role: 'status', className: 'notice' }, message),
      busy && h('div', { role: 'status', className: 'muted' }, job),
      !project ? h(React.Fragment, null,
        h('div', { className: 'tools' }, h('button', { onClick: refreshList, disabled: busy }, t("刷新项目"))),
        projects.length ? h('div', { className: 'project-list' }, projects.map(row => h('button', { key: row.id, onClick: () => open(row.id), disabled: busy }, h('strong', null, row.title), h('div', { className: 'file muted' }, row.path)))) :
          h('div', { className: 'card' }, h('h3', null, t("还没有可以编辑的项目")), h('p', null, t("先在对话中让助手生成演示文稿。已有项目可以让助手调用 ppt_check 检查一次，它会出现在这里。")), h('p', { className: 'muted' }, t("示例：请把这份材料制作成可直接交付的演示文稿，生成 HTML、PPTX 和工程文件。")), h('div', { className: 'tools' }, h('button', { onClick: copyExample }, t("复制示例"))))
      ) : h(React.Fragment, null,
        h('div', { className: 'tools' }, h('button', { disabled: busy || dirty, onClick: () => { imageLoader.current.cancel(); setImage(null); setProject(null); refreshList(); } }, t("返回项目")), h('strong', null, project.title), dirty && h('span', { className: 'badge-dirty', role: 'status' }, t("未保存")), h('span', { className: 'muted' }, project.slides.length + t(" 页 · 修订 ") + project.revision)),
        h('div', { className: 'layout' },
          h('div', null, h('h3', null, t("页面")), h('div', { className: 'pages' }, project.slides.map((row, i) => h('button', { key: row.id, 'aria-current': row.id === selected ? 'true' : undefined, disabled: busy || dirty, onClick: () => choose(row) }, (i + 1) + '. ' + (row.title || t("未命名页"))))),
            h('div', { className: 'tools' }, h('button', { disabled: busy || dirty || imagePending || index === 0, onClick: () => move(-1) }, t("上移")), h('button', { disabled: busy || dirty || imagePending || index === project.slides.length - 1, onClick: () => move(1) }, t("下移")),
              h('button', { disabled: busy || dirty || imagePending || project.slides.length >= 120, onClick: () => structure('duplicate') }, t("复制本页")),
              h('button', { disabled: busy || dirty || imagePending || project.slides.length <= 1, onClick: () => structure('remove') }, t("删除本页")))),
          h('div', null,
            h('div', { className: 'tools' }, h('button', { disabled: busy, 'aria-pressed': mode === 'html', onClick: () => setMode('html') }, t("HTML 预览")),
              h('button', { disabled: busy || !project.render, 'aria-pressed': mode === 'pptx', onClick: () => setMode('pptx') }, t("最终 PPTX 预览")),
              h('button', { disabled: busy || dirty || imagePending, onClick: render }, t("渲染当前 PPTX"))),
            h('div', { className: 'preview', ref: previewBox }, mode === 'html' ? (project.html ? h('iframe', { ref: frame, title: t("演示文稿 HTML 预览"), sandbox: 'allow-scripts', srcDoc: previewDocument, onLoad: jump }) : h('p', null, t("此项目尚无 HTML，请保存一次生成预览。"))) : raster ? h('img', { className: 'render-page', src: raster, alt: t("最终 PPTX 第 ") + (index + 1) + t(" 页渲染结果") }) : h('p', null, t("正在载入当前页渲染…"))),
            h('p', { className: 'muted' }, mode === 'html' ? t("这是 HTML 放映预览。最终 PPTX 的字体和排版请用上方渲染检查。点击文字可定位编辑字段。") : t("这是当前 PPTX 文件的实际渲染图片，仍需检查每页画面；PowerPoint / WPS 可能因字体环境而不同。")),
            project.render?.missingFonts?.length ? h('div', { role: 'alert', className: 'notice error' }, t("渲染引擎报告缺失字体：") + project.render.missingFonts.join('、') + t("。请替换为目标电脑可用字体后重新渲染。")) : null,
            h('div', { className: 'card' }, h('h3', null, t("编辑第 ") + (index + 1) + t(" 页")),
              dirty && h('p', { className: 'dirty' }, t("有未保存修改，请先保存或取消，再切换页面。")),
              overlaps.length ? h('div', { className: 'notice' }, h('strong', null, t("这些字段也被修改过，请比较后决定是否保存：")), overlaps.map(row => h('div', { key: row.key }, h('strong', null, t(fields.find(([key]) => key === row.key)[1])), h('p', null, t("最新版本：") + row.latest), h('p', null, t("你的修改：") + row.yours)))) : null,
              fields.filter(([key]) => key === 'title' || key === 'notes' || key === 'bullets' && (slide.layout === 'bullets' || slide.bullets?.length > 0) || key !== 'bullets' && (slide[key] || key === 'subtitle' && ['cover','section','closing','quote'].includes(slide.layout) || key === 'kicker' && ['cover','section','closing'].includes(slide.layout))).map(([key, label]) => h('div', { key }, h('label', { htmlFor: 'pptw-' + key }, t(label)), h(key === 'title' || key === 'kicker' ? 'input' : 'textarea', { id: 'pptw-' + key, ref: el => { fieldRefs.current[key] = el }, disabled: busy, value: draft[key] || '', rows: key === 'bullets' ? 4 : 2, maxLength: 8000, onChange: e => { setDraft({ ...draft, [key]: e.target.value }); setDirty(true); } }))),
              h('label', { htmlFor: 'pptw-image' }, slide.image ? t("替换图片（PNG / JPEG）") : t("添加图片（会改为图文布局）")),
              h('input', { id: 'pptw-image', type: 'file', accept: 'image/png,image/jpeg', disabled: busy, onChange: upload }),
              currentImage && h('img', { className: 'image-preview', src: currentImage, alt: image?.alt || slide.image?.alt || t("当前图片") }),
              image && h(React.Fragment, null, h('p', { className: 'muted' }, t("已选择：") + image.name), h('label', { htmlFor: 'pptw-alt' }, t("图片说明")), h('input', { id: 'pptw-alt', value: image.alt, disabled: busy, onChange: e => setImage({ ...image, alt: e.target.value }) }), h('label', { htmlFor: 'pptw-fit' }, t("图片适应方式")), h('select', { id: 'pptw-fit', value: image.fit, disabled: busy, onChange: e => setImage({ ...image, fit: e.target.value }) }, h('option', { value: 'contain' }, t("完整显示")), h('option', { value: 'cover' }, t("填满并裁切")))),
              h('div', { className: 'tools' }, h('button', { className: 'primary', 'aria-keyshortcuts': 'Control+S Meta+S', disabled: busy || imagePending || !dirty, onClick: () => save() }, t("保存此页")), h('button', { 'aria-keyshortcuts': 'Control+Shift+S Meta+Shift+S', disabled: busy || imagePending, onClick: () => save(true) }, t("另存副本")), h('button', { 'aria-keyshortcuts': 'Escape', disabled: busy || (!dirty && !imagePending), onClick: () => { imageLoader.current.cancel(); setDraft(draftFor(slide)); setImage(null); setDirty(false); setError(''); setMessage(''); setConflict(false); setOverlaps([]); } }, t("取消修改")), h('button', { disabled: busy || dirty || imagePending || !project.undoAvailable, onClick: undo }, t("撤销上次修改")))),
            h('details', { className: 'card' }, h('summary', null, t("质量提醒（") + (project.quality.warningCount + project.quality.errorCount) + (languageOf() === 'en' ? ')' : '）')), (project.quality.issues || []).map((issue, i) => h('p', { key: i }, (issue.slide > 0 ? t("第 ") + issue.slide + t(" 页：") : "") + (languageOf() === 'en' ? issue.messageEn : issue.message) + (languageOf() === 'en' ? ' ' : '；') + (languageOf() === 'en' ? issue.suggestionEn : issue.suggestion)))),
            h('p', { className: 'muted' }, t("成品包包含 PPTX、HTML 和工程文件。请先保存修改，再下载最新版本。")),
            h('div', { className: 'tools' }, h('button', { className: 'primary', disabled: busy || dirty || imagePending, onClick: () => download('bundle') }, t("下载成品包 ZIP")), h('button', { disabled: busy || dirty || imagePending, onClick: () => download('pptx') }, t("下载最新 PPTX")), h('button', { disabled: busy || dirty || imagePending, onClick: () => download('html') }, t("下载 HTML")), h('button', { disabled: busy || dirty || imagePending, onClick: () => download('notes') }, t("下载讲稿 Markdown")), h('button', { disabled: busy || dirty || imagePending, onClick: () => download('json') }, t("备份工程"))),
            h(CoachingPanel, { key: project.id, project, selected, blocked: busy || dirty || imagePending,
              onChoose: id => { choose(project.slides.find(s => s.id === id)); previewBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
              onAdopt: next => { adopt(next, selected); setMessage(languageOf() === 'en' ? 'Saved to a new copy. The original is kept; you can undo the adopted changes in this copy.' : '已保存为新副本，原稿保留；可在当前副本中撤销采纳的修改。'); } })
          )
        )
      )
    );
  }
  function apply(ctx) {
    try { localeService = ctx.get?.('locale') || ctx.locale; } catch { localeService = ctx.locale; }
    ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'dsh-ppt', order: 58, label: () => t("演示文稿"), inject: () => ({ locale: localeService }) }, __withFirstRun(Workbench)));
  }
  return { inject: ['slots', 'locale'], apply, __internals: { draftFor, editorHtml, createImageLoader } };
} });

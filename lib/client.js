// Browser source, distributed directly. tsc deliberately does not rewrite this file.
window.__ModuleLoader__.load({ id: 'dsh-ppt', factory: require => {
  const React = require('react');
  const { useState, useEffect, useRef, useMemo } = React;
  const h = React.createElement;
  const ROUTE = 'api/dsh-ppt/workbench';
  const fields = [['title', '标题'], ['subtitle', '副标题'], ['kicker', '眉题'], ['text', '正文'], ['bullets', '要点（每行一条）'], ['notes', '演讲备注']];
  const css = `
  .pptw {color:var(--fg,#27354b);font:14px/1.6 system-ui,sans-serif;min-width:0;max-width:1140px;margin:0 auto;padding:8px}
  .pptw *{box-sizing:border-box}.pptw h2{font-size:22px;margin:0}.pptw h3{font-size:16px;margin:12px 0 6px}
  .pptw .muted{color:var(--fg-muted,#66768a);font-size:13px}.pptw .tools{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;align-items:center}
  .pptw button{font:inherit;border:1px solid var(--border,#ccd8e5);border-radius:9px;background:var(--bg-surface,#fff);color:inherit;padding:7px 12px;cursor:pointer;text-align:left;white-space:normal}
  .pptw button.primary{background:#245ee9;border-color:#245ee9;color:#fff}.pptw button:disabled{opacity:.45;cursor:default}
  .pptw input:not([type=file]),.pptw textarea,.pptw select{font:inherit;color:inherit;width:100%;background:var(--bg,#fff);border:1px solid var(--border,#c9d5e4);border-radius:8px;padding:8px 10px}
  .pptw textarea{resize:vertical}.pptw label{display:block;margin:8px 0 3px}.pptw .layout{display:grid;grid-template-columns:minmax(130px,190px) minmax(0,1fr);gap:14px}
  .pptw .pages{display:flex;flex-direction:column;gap:5px;max-height:480px;overflow:auto}.pptw .pages button[aria-current=true]{background:#245ee9;color:#fff}
  .pptw .preview{border:1px solid var(--border,#ced8e6);border-radius:12px;overflow:hidden;background:#f0f4fa;aspect-ratio:16/9;position:relative}
  .pptw iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.pptw .render-page{width:100%;display:block}
  .pptw .notice{border-radius:9px;padding:10px 12px;margin:10px 0;background:#edf4ff;color:#17408e;overflow-wrap:anywhere}.pptw .error{background:#fff1ef;color:#922d20}
  .pptw .card{border:1px solid var(--border,#d5dfeb);border-radius:12px;padding:12px;margin:10px 0;background:var(--bg-surface,#fff)}
  .pptw .project-list{display:flex;flex-direction:column;gap:8px}.pptw .project-list button{display:block;width:100%}
  .pptw .file{font-size:12px;overflow-wrap:anywhere}.pptw .image-preview{width:100%;max-height:160px;object-fit:contain;background:#edf2f8;border-radius:8px}
  .pptw :focus-visible{outline:3px solid #78a8ff;outline-offset:2px}.pptw .dirty{color:#986114;font-size:13px}
  [role=dialog]:has(.pptw){width:min(1200px,calc(100vw - 48px))!important;max-width:1200px!important}
  @media(max-width:700px){.pptw .layout{grid-template-columns:1fr}.pptw .pages{max-height:180px}.pptw .preview{min-height:190px}.pptw{padding:3px}
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
    try { value = await response.json(); } catch { throw new Error('无法读取服务响应，请检查插件是否加载') }
    if (!response.ok || value.ok === false) { const error = new Error((value.message || '操作未完成') + (value.installationHint ? '\n' + value.installationHint : '')); error.status = response.status; throw error; }
    return value;
  }
  function draftFor(slide) {
    return { title: slide.title || '', subtitle: slide.subtitle || '', kicker: slide.kicker || '', text: slide.text || '',
      bullets: (slide.bullets || []).join('\n'), notes: slide.notes || '' };
  }
  function editorHtml(html, nonce) {
    const bridge = `<style>#hud,#delivery-bar,#review-panel,#progress,#notes-panel,#help-panel,#toast,#blank{display:none!important}.slide-frame{pointer-events:none!important}.slide-frame .slide{pointer-events:auto!important}</style><script>(function(){const nonce=${JSON.stringify(nonce)};
      function tell(field){parent.postMessage({type:'dsh-ppt-select',nonce:nonce,field:field},'*')}
      document.addEventListener('keydown',function(e){e.stopImmediatePropagation();if(e.key!=='Tab')e.preventDefault()},true);
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
  function Workbench() {
    const [projects, setProjects] = useState([]), [project, setProject] = useState(null), [selected, setSelected] = useState('');
    const [draft, setDraft] = useState({}), [image, setImage] = useState(null), [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false), [job, setJob] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('');
    const [mode, setMode] = useState('html'), [raster, setRaster] = useState('');
    const [conflict, setConflict] = useState(false), [overlaps, setOverlaps] = useState([]);
    const frame = useRef(null), previewBox = useRef(null), fieldRefs = useRef({}), alive = useRef(true), operations = useRef(new Set());
    const nonce = useRef(crypto.randomUUID());
    const previewDocument = useMemo(() => project?.html ? editorHtml(project.html, nonce.current) : '', [project?.html]);
    const index = project ? Math.max(0, project.slides.findIndex(s => s.id === selected)) : 0;
    const slide = project?.slides[index];
    function adopt(next, preferred) {
      setProject(next);
      const row = next.slides.find(s => s.id === preferred) || next.slides[0];
      setSelected(row.id); setDraft(draftFor(row)); setImage(null); setDirty(false); setRaster(''); setOverlaps([]);
      if (!next.render) setMode('html');
    }
    async function perform(work, success, label = '正在处理，请稍候…') {
      setBusy(true); setJob(label); setError(''); setMessage(''); setConflict(false);
      const controller = new AbortController(); operations.current.add(controller);
      try { const result = await work(controller.signal); if (alive.current && success) success(result); }
      catch (e) { if (alive.current) { setError(e.message || '操作失败'); setConflict(e.status === 409); } }
      finally { operations.current.delete(controller); if (alive.current) setBusy(false); }
    }
    function refreshList() { return perform(signal => action({ operation: 'list' }, signal), value => setProjects(value.projects)); }
    useEffect(() => {
      alive.current = true; const abort = new AbortController();
      action({ operation: 'list' }, abort.signal).then(value => { if (alive.current) setProjects(value.projects) }).catch(e => { if (!abort.signal.aborted) setError(e.message) });
      return () => { alive.current = false; abort.abort(); for (const operation of operations.current) operation.abort(); };
    }, []);
    useEffect(() => {
      function receive(event) {
        if (event.source !== frame.current?.contentWindow || event.data?.nonce !== nonce.current || event.data.type !== 'dsh-ppt-select' || mode !== 'html') return;
        const key = event.data.field;
        const field = fields.find(([field]) => field === key);
        if (field) { fieldRefs.current[key]?.focus(); fieldRefs.current[key]?.scrollIntoView({ block: 'nearest' }); setMessage('已定位到' + field[1] + '，在字段中修改后保存。'); }
      }
      window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
    }, [mode]);
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
    function open(id) { return perform(signal => action({ operation: 'open', id }, signal), value => { adopt(value.project); setMessage('点击预览里的文字，或在下方修改字段。'); }); }
    function keepInputsAndReload() {
      const original = draftFor(slide), keys = fields.filter(([key]) => draft[key] !== original[key]).map(([key]) => key), pending = { ...draft }, pendingImage = image;
      return perform(signal => action({ operation: 'open', id: project.id }, signal), value => {
        const row = value.project.slides.find(s => s.id === selected);
        if (!row) { setError('当前页已被删除，输入仍保留，请复制需要的内容后取消修改。'); return; }
        const latest = draftFor(row), merged = { ...latest }, shared = [];
        for (const key of keys) { merged[key] = pending[key]; if (latest[key] !== original[key] && latest[key] !== pending[key]) shared.push({ key, latest: latest[key], yours: pending[key] }); }
        adopt(value.project, selected); setDraft(merged); setImage(pendingImage); setDirty(keys.length > 0 || !!pendingImage); setOverlaps(shared);
        setMessage('已载入最新版本并保留你的修改，请核对后再保存。');
      });
    }
    function choose(row) { if (dirty || busy) return; setSelected(row.id); setDraft(draftFor(row)); setImage(null); }
    function save() {
      const original = draftFor(slide), patch = {};
      for (const [key] of fields) if (draft[key] !== original[key]) patch[key] = key === 'bullets' ? draft[key].split('\n').map(v => v.trim()).filter(Boolean) : draft[key];
      if (image) patch.image = { src: image.src, alt: image.alt, fit: image.fit, caption: image.caption };
      return perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, slide: slide.id, patch }, signal), value => {
        adopt(value.project, slide.id); setMessage(value.changed === false ? '内容没有变化。' : '已保存，HTML、PPTX 和工程文件已同步更新。');
      });
    }
    function move(delta) {
      const order = project.slides.map(s => s.id); [order[index], order[index + delta]] = [order[index + delta], order[index]];
      return perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, order }, signal), value => { adopt(value.project, slide.id); setMessage('页面顺序已更新，可撤销。'); });
    }
    function undo() { return perform(signal => action({ operation: 'undo', id: project.id, expectedRevision: project.revision }, signal), value => { adopt(value.project, selected); setMessage('已撤销上次修改。'); }); }
    function render() {
      return perform(signal => action({ operation: 'render', id: project.id, expectedRevision: project.revision }, signal), value => { adopt(value.project, selected); setMode('pptx'); setMessage('当前 PPTX 已生成逐页图片，请查看画面。'); }, '正在渲染最终 PPTX，较大文件可能需要几分钟…');
    }
    function download(kind) {
      const url = new URL('api/dsh-ppt/download', document.baseURI);
      url.searchParams.set('id', project.id); url.searchParams.set('kind', kind); url.searchParams.set('revision', String(project.revision));
      // An authenticated attachment response keeps the click's user gesture and
      // works in WebViews whose native download handler cannot read blob URLs.
      const link = document.createElement('a'); link.href = url.href; link.download = '';
      link.hidden = true; document.body.append(link); link.click(); link.remove();
      setMessage('已请求下载，请查看浏览器的下载列表。');
    }
    function upload(event) {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 8 * 1024 * 1024) { setError('请选择 8 MiB 以内的 PNG 或 JPEG 图片。'); return; }
      const reader = new FileReader();
      reader.onload = () => { if (!alive.current) return; setImage({ src: String(reader.result), alt: slide.image?.alt || file.name.replace(/\.[^.]+$/, ''), caption: slide.image?.caption || '', fit: slide.image?.fit || 'contain', name: file.name }); setDirty(true); setError(''); };
      reader.onerror = () => setError('无法读取图片，请重试。'); reader.readAsDataURL(file);
    }
    const currentImage = image?.src || (slide?.image?.assetId && project.assets[slide.image.assetId]?.data);
    return h('div', { className: 'pptw' }, h('style', null, css),
      h('h2', null, '演示文稿编辑'), h('p', { className: 'muted' }, '修改本插件生成的成品，保存时同步更新 HTML、可编辑 PPTX 和工程文件。'),
      error && h('div', { role: 'alert', className: 'notice error' }, error),
      conflict && project && h('button', { disabled: busy, onClick: keepInputsAndReload }, '载入最新版本，保留我的输入'),
      message && h('div', { role: 'status', className: 'notice' }, message),
      busy && h('div', { role: 'status', className: 'muted' }, job),
      !project ? h(React.Fragment, null,
        h('div', { className: 'tools' }, h('button', { onClick: refreshList, disabled: busy }, '刷新项目')),
        projects.length ? h('div', { className: 'project-list' }, projects.map(row => h('button', { key: row.id, onClick: () => open(row.id), disabled: busy }, h('strong', null, row.title), h('div', { className: 'file muted' }, row.path)))) :
          h('div', { className: 'card' }, h('h3', null, '还没有可以编辑的项目'), h('p', null, '先在对话中让助手生成演示文稿。已有项目可以让助手调用 ppt_check 检查一次，它会出现在这里。'), h('p', { className: 'muted' }, '示例：请把这份材料制作成可直接交付的演示文稿，生成 HTML、PPTX 和工程文件。'))
      ) : h(React.Fragment, null,
        h('div', { className: 'tools' }, h('button', { disabled: busy || dirty, onClick: () => { setProject(null); refreshList(); } }, '返回项目'), h('strong', null, project.title), h('span', { className: 'muted' }, project.slides.length + ' 页 · 修订 ' + project.revision)),
        h('div', { className: 'layout' },
          h('div', null, h('h3', null, '页面'), h('div', { className: 'pages' }, project.slides.map((row, i) => h('button', { key: row.id, 'aria-current': row.id === selected ? 'true' : undefined, disabled: busy || dirty, onClick: () => choose(row) }, (i + 1) + '. ' + (row.title || '未命名页')))),
            h('div', { className: 'tools' }, h('button', { disabled: busy || dirty || index === 0, onClick: () => move(-1) }, '上移'), h('button', { disabled: busy || dirty || index === project.slides.length - 1, onClick: () => move(1) }, '下移'))),
          h('div', null,
            h('div', { className: 'tools' }, h('button', { disabled: busy, 'aria-pressed': mode === 'html', onClick: () => setMode('html') }, 'HTML 预览'),
              h('button', { disabled: busy || !project.render, 'aria-pressed': mode === 'pptx', onClick: () => setMode('pptx') }, '最终 PPTX 预览'),
              h('button', { disabled: busy || dirty, onClick: render }, '渲染当前 PPTX')),
            h('div', { className: 'preview', ref: previewBox }, mode === 'html' ? (project.html ? h('iframe', { ref: frame, title: '演示文稿 HTML 预览', sandbox: 'allow-scripts', srcDoc: previewDocument, onLoad: jump }) : h('p', null, '此项目尚无 HTML，请保存一次生成预览。')) : raster ? h('img', { className: 'render-page', src: raster, alt: '最终 PPTX 第 ' + (index + 1) + ' 页渲染结果' }) : h('p', null, '正在载入当前页渲染…')),
            h('p', { className: 'muted' }, mode === 'html' ? '这是 HTML 放映预览。最终 PPTX 的字体和排版请用上方渲染检查。点击文字可定位编辑字段。' : '这是当前 PPTX 文件的实际渲染图片，仍需检查每页画面；PowerPoint / WPS 可能因字体环境而不同。'),
            project.render?.missingFonts?.length ? h('div', { role: 'alert', className: 'notice error' }, '渲染引擎报告缺失字体：' + project.render.missingFonts.join('、') + '。请替换为目标电脑可用字体后重新渲染。') : null,
            h('div', { className: 'card' }, h('h3', null, '编辑第 ' + (index + 1) + ' 页'),
              dirty && h('p', { className: 'dirty' }, '有未保存修改，请先保存或取消，再切换页面。'),
              overlaps.length ? h('div', { className: 'notice' }, h('strong', null, '这些字段也被修改过，请比较后决定是否保存：'), overlaps.map(row => h('div', { key: row.key }, h('strong', null, fields.find(([key]) => key === row.key)[1]), h('p', null, '最新版本：' + row.latest), h('p', null, '你的修改：' + row.yours)))) : null,
              fields.filter(([key]) => key === 'title' || key === 'notes' || key === 'bullets' && (slide.layout === 'bullets' || slide.bullets?.length > 0) || key !== 'bullets' && (slide[key] || key === 'subtitle' && ['cover','section','closing','quote'].includes(slide.layout) || key === 'kicker' && ['cover','section','closing'].includes(slide.layout))).map(([key, label]) => h('div', { key }, h('label', { htmlFor: 'pptw-' + key }, label), h(key === 'title' || key === 'kicker' ? 'input' : 'textarea', { id: 'pptw-' + key, ref: el => { fieldRefs.current[key] = el }, disabled: busy, value: draft[key] || '', rows: key === 'bullets' ? 4 : 2, maxLength: 8000, onChange: e => { setDraft({ ...draft, [key]: e.target.value }); setDirty(true); } }))),
              h('label', { htmlFor: 'pptw-image' }, slide.image ? '替换图片（PNG / JPEG）' : '添加图片（会改为图文布局）'),
              h('input', { id: 'pptw-image', type: 'file', accept: 'image/png,image/jpeg', disabled: busy, onChange: upload }),
              currentImage && h('img', { className: 'image-preview', src: currentImage, alt: image?.alt || slide.image?.alt || '当前图片' }),
              image && h(React.Fragment, null, h('p', { className: 'muted' }, '已选择：' + image.name), h('label', { htmlFor: 'pptw-alt' }, '图片说明'), h('input', { id: 'pptw-alt', value: image.alt, disabled: busy, onChange: e => setImage({ ...image, alt: e.target.value }) }), h('label', { htmlFor: 'pptw-fit' }, '图片适应方式'), h('select', { id: 'pptw-fit', value: image.fit, disabled: busy, onChange: e => setImage({ ...image, fit: e.target.value }) }, h('option', { value: 'contain' }, '完整显示'), h('option', { value: 'cover' }, '填满并裁切'))),
              h('div', { className: 'tools' }, h('button', { className: 'primary', disabled: busy || !dirty, onClick: save }, '保存此页'), h('button', { disabled: busy || !dirty, onClick: () => { setDraft(draftFor(slide)); setImage(null); setDirty(false); setError(''); setConflict(false); setOverlaps([]); } }, '取消修改'), h('button', { disabled: busy || dirty || !project.undoAvailable, onClick: undo }, '撤销上次修改'))),
            h('details', { className: 'card' }, h('summary', null, '质量提醒（' + project.quality.warningCount + '）'), (project.quality.issues || []).map((issue, i) => h('p', { key: i }, '第 ' + issue.slide + ' 页：' + issue.message + '；' + issue.suggestion))),
            h('div', { className: 'tools' }, h('button', { disabled: busy || dirty, onClick: () => download('pptx') }, '下载最新 PPTX'), h('button', { disabled: busy || dirty, onClick: () => download('html') }, '下载 HTML'), h('button', { disabled: busy || dirty, onClick: () => download('json') }, '备份工程'))
          )
        )
      )
    );
  }
  function apply(ctx) {
    ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'dsh-ppt', order: 58, label: () => '演示文稿', inject: () => ({}) }, Workbench));
  }
  return { inject: ['slots'], apply, __internals: { draftFor, editorHtml } };
} });

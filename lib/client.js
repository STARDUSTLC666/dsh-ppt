// Generated: shared optional update controls; edit the original client templates.
(function(){
/* DSH workbench UI v1. MIT. Canonical source: dsh-suite/ui/workbench-ui.js.
 * Vendored into each plugin: no Suite or extra runtime dependency is required.
 * Styles are scoped to .dshw and never replace the host chrome or theme.
 */
function createWorkbenchUI(React) {
  const h = React.createElement;
  const { useEffect, useId, useRef } = React;
  const cx = (...values) => values.filter(Boolean).join(' ');
  const paths = {
    book: ['M4 4h6a3 3 0 0 1 2 2v15a4 4 0 0 0-4-2H4z', 'M20 4h-6a3 3 0 0 0-2 2v15a4 4 0 0 1 4-2h4z'],
    calendar: ['M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z', 'M7 3v4M17 3v4M3 10h18'],
    mail: ['M3 5h18v14H3z', 'm3 6 9 7 9-7'],
    rss: ['M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16', 'M4 19h.01'],
    slides: ['M3 4h18v13H3z', 'M12 17v4M8 21h8'],
    shield: ['m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z', 'm8 12 3 3 5-6'],
    layers: ['M5 3h16v16H5z', 'M2 7v15h15'],
    play: ['m9 6 9 6-9 6Z'],
    video: ['M3 5h12v14H3z', 'm15 10 6-4v12l-6-4'],
    search: ['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'm16 16 5 5'],
    plus: ['M12 5v14M5 12h14'],
    refresh: ['M20 7a9 9 0 1 0 1 8', 'M20 2v5h-5'],
    settings: ['m9 3-.7 2.4-2 .9L4 5.8 2.5 8.4l1.7 1.8v2.3L2.5 14 4 17l2.5-.4 1.9 1L9 20h3l.8-2.4 2-1 2.5.4 1.5-2.7-1.7-1.9v-2.2l1.7-1.8-1.5-2.6-2.5.4-2-1L12 3Z', 'M14 11.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z'],
    close: ['m6 6 12 12M18 6 6 18'],
    left: ['m14 5-7 7 7 7'],
    right: ['m10 5 7 7-7 7'],
    down: ['m5 9 7 7 7-7'],
    filter: ['M4 5h16M7 12h10M10 19h4'],
    download: ['M12 3v12m-5-5 5 5 5-5', 'M4 16v5h16v-5'],
    upload: ['M12 16V4m-5 5 5-5 5 5', 'M4 16v5h16v-5'],
    copy: ['M8 8h13v13H8z', 'M16 8V3H3v13h5'],
    external: ['M14 3h7v7m0-7L10 14', 'M10 3H3v18h18v-7'],
    file: ['M4 3h10l6 6v12H4z', 'M14 3v6h6M8 13h8M8 17h6'],
    folder: ['M3 5h7l2 3h9v12H3z'],
    edit: ['m15 4 5 5-10 10-6 1 1-6Z', 'm13 6 5 5'],
    trash: ['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'],
    more: ['M5 12h.01M12 12h.01M19 12h.01'],
    info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 11v6M12 7h.01'],
    check: ['m5 12 4 4L19 6'],
    quote: ['M4 12h6v7H3v-7c0-4 2-6 5-7M15 12h6v7h-7v-7c0-4 2-6 5-7'],
    star: ['m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z'],
    reply: ['m9 5-7 7 7 7v-5h6c3 0 5 2 6 5 0-8-4-11-12-11Z'],
    link: ['m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0', 'm14 8 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0'],
  };
  function Icon({ name = 'file', size = 20, ...props }) {
    return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false, ...props },
      (paths[name] || paths.file).map((d, index) => h('path', { key: index, d })));
  }
  function Button({ children, icon, variant, className, ...props }) {
    return h('button', { type: 'button', ...props, className: cx('w-button', variant && 'w-' + variant, className) }, icon ? h(Icon, { name: icon, size: 18 }) : null, children);
  }
  function IconButton({ label, icon, ...props }) {
    return h(Button, { ...props, icon, className: cx('w-icon-button', props.className), 'aria-label': label, title: label });
  }
  function Page({ title, subtitle, actions, children, workbench = false, className, rootRef, ...props }) {
    return h('section', { ...props, ref: rootRef, className: cx('dshw', 'w-page', className), 'data-main': workbench ? 'true' : 'false' },
      h('style', null, styles),
      h('header', { className: 'w-page-header' }, h('div', { className: 'w-heading' }, h('h1', null, title), subtitle ? h('p', { className: 'w-subtitle' }, subtitle) : null), actions ? h('div', { className: 'w-header-actions' }, actions) : null),
      h('div', { className: 'w-body' }, children));
  }
  function Tabs({ items, value, onChange, label, children }) {
    const id = useId();
    const active = items.some(item => item.id === value) ? value : items[0]?.id;
    function keys(event, index) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      const node = event.currentTarget.parentElement?.querySelectorAll('[role=tab]')[next];
      if (node) { onChange(items[next].id); node.focus(); }
    }
    return h('div', { className: 'w-tabs-layout' },
      h('div', { className: 'w-tabs', role: 'tablist', 'aria-label': label }, items.map((item, index) => h('button', {
        type: 'button', role: 'tab', key: item.id, id: id + '-' + item.id, 'aria-controls': id + '-panel', 'aria-selected': active === item.id, tabIndex: active === item.id ? 0 : -1,
        onClick: () => onChange(item.id), onKeyDown: event => keys(event, index),
      }, item.label, item.count !== undefined ? h('span', { className: 'w-count' }, item.count) : null))),
      h('div', { className: 'w-tab-panel', id: id + '-panel', role: 'tabpanel', 'aria-labelledby': id + '-' + active }, children));
  }
  function Status({ children, tone = 'info', className }) {
    if (!children) return null;
    return h('div', { className: cx('w-status', 'w-status-' + tone, className), role: tone === 'error' ? 'alert' : 'status', 'aria-live': tone === 'error' ? 'assertive' : 'polite' }, h(Icon, { name: tone === 'success' ? 'check' : 'info', size: 18 }), h('div', null, children));
  }
  function Empty({ title, children, action, icon = 'file' }) {
    return h('div', { className: 'w-empty' }, h(Icon, { name: icon, size: 32 }), h('h2', null, title), children ? h('div', { className: 'w-muted' }, children) : null, action ? h('div', { className: 'w-toolbar' }, action) : null);
  }
  function Split({ list, detail, selected, onBack, backLabel, className, listWidth = 360 }) {
    const ref = useRef(null);
    useEffect(() => {
      if (!selected || !ref.current || ref.current.clientWidth > 760) return;
      const heading = ref.current.querySelector('.w-detail h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }, [selected]);
    return h('div', { ref, className: cx('w-split', className), 'data-selected': selected ? 'true' : 'false', style: { '--w-list-width': listWidth + 'px' } },
      h('div', { className: 'w-master' }, list),
      h('div', { className: 'w-detail' }, selected ? h(Button, { className: 'w-back', icon: 'left', variant: 'ghost', onClick: onBack }, backLabel) : null, detail));
  }
  function Row({ title, meta, description, active, onClick, children, status, className, disabled }) {
    return h('div', { className: cx('w-row', active && 'w-selected', className) },
      children ? h('div', { className: 'w-row-select' }, children) : null,
      h('button', { type: 'button', className: 'w-row-button', onClick, disabled, 'aria-pressed': !!active },
        h('span', { className: 'w-row-head' }, h('strong', null, title), status ? h('span', { className: 'w-tag' }, status) : null),
        meta ? h('span', { className: 'w-row-meta' }, meta) : null,
        description ? h('span', { className: 'w-row-description' }, description) : null));
  }
  function Search({ label, value, onChange, ...props }) {
    const id = useId();
    return h('div', { className: 'w-search' }, h(Icon, { name: 'search', size: 18 }), h('input', { type: 'search', id, 'aria-label': label, placeholder: label, value, onChange, ...props }));
  }
  function Switch({ label, checked, onChange, disabled }) {
    return h('label', { className: 'w-switch-label' }, h('span', null, label), h('input', { type: 'checkbox', role: 'switch', checked, disabled, onChange, 'aria-label': label }), h('span', { className: 'w-switch-track', 'aria-hidden': true }));
  }
  function Dialog({ title, children, onClose, closeLabel, className, busy = false }) {
    const id = useId(), panel = useRef(null);
    useEffect(() => {
      const previous = document.activeElement;
      panel.current?.querySelector('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')?.focus();
      return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
    }, []);
    function keydown(event) {
      if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); if (!busy) onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!controls.length) { event.preventDefault(); panel.current.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    return h('div', { className: 'w-overlay', onClick: event => { if (!busy && event.target === event.currentTarget) onClose(); } },
      h('section', { ref: panel, className: cx('w-dialog', className), role: 'dialog', 'aria-modal': true, 'aria-labelledby': id, tabIndex: -1, onKeyDown: keydown },
        h('header', { className: 'w-dialog-header' }, h('h2', { id }, title), h(IconButton, { icon: 'close', label: closeLabel, disabled: busy, onClick: onClose })), h('div', { className: 'w-dialog-body' }, children)));
  }
  function register(ctx, { id, label, icon, component, inject, order = 50 }) {
    // The two slots are optional. Existing settings and manual tools still load
    // in hosts without a workbench, while RC.3 owns navigation/pinning itself.
    ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: id, inject: () => ({ ...(inject?.() || {}), workbench: true }) }, component));
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id, order, label }, function WorkbenchIcon({ size }) { return h(Icon, { name: icon, size }); }));
  }
  const styles = `
.dshw{--w-bg:var(--dsw-alias-bg-layer-1,#fff);--w-soft:var(--dsw-alias-bg-layer-2,#f7f8fa);--w-text:var(--dsw-alias-label-primary,#18202c);--w-muted:var(--dsw-alias-label-secondary,#667085);--w-border:var(--dsw-alias-border-l3,#e7e9ef);--w-accent:var(--dsh-plugin-workbench-accent,#4f6bdb);--w-selected:color-mix(in srgb,var(--w-accent) 10%,var(--w-bg));--w-primary:var(--w-text);--w-on-primary:var(--w-bg);container-type:inline-size;container-name:dsh-workbench;color:var(--w-text);background:var(--w-bg);font:14px/1.65 var(--dsh-font-family-content,system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif);min-width:0;max-width:100%;box-sizing:border-box;text-align:start;color-scheme:inherit}
.dshw *,.dshw *:before,.dshw *:after{box-sizing:border-box}.dshw h1,.dshw h2,.dshw h3,.dshw h4,.dshw p{margin:0}.dshw h1{font-size:30px;line-height:1.25;letter-spacing:-.025em;font-weight:650}.dshw h2{font-size:24px;line-height:1.35;font-weight:650;letter-spacing:-.015em;overflow-wrap:anywhere}.dshw h3,.dshw h4{font-size:16px;line-height:1.4;font-weight:600}.dshw a{color:var(--w-accent);text-underline-offset:3px;overflow-wrap:anywhere}.dshw button,.dshw input,.dshw select,.dshw textarea{font:inherit;color:inherit;max-width:100%}.dshw input:not([type=checkbox]):not([type=radio]):not([type=file]),.dshw select,.dshw textarea{background:var(--w-bg);border:1px solid var(--w-border);border-radius:8px;padding:8px 11px;min-width:0;line-height:1.5}.dshw input:not([type=checkbox]):not([type=radio]):not([type=file]),.dshw select{min-height:38px}.dshw textarea{resize:vertical}.dshw input[type=checkbox],.dshw input[type=radio]{width:16px;height:16px;flex-shrink:0;accent-color:var(--w-accent)}.dshw :focus-visible{outline:2px solid var(--w-accent);outline-offset:3px}.dshw button:disabled,.dshw input:disabled,.dshw select:disabled,.dshw textarea:disabled{opacity:.5;cursor:not-allowed}.dshw label{font-size:13px}.dshw fieldset{min-width:0;border:1px solid var(--w-border);border-radius:8px}.dshw summary{cursor:pointer;font-weight:550;list-style:none;display:flex;align-items:center;gap:8px}.dshw summary::-webkit-details-marker{display:none}.dshw summary:after{content:'';display:block;margin-inline-start:auto;width:7px;height:7px;border-inline-end:1.75px solid currentColor;border-bottom:1.75px solid currentColor;transform:rotate(45deg);flex-shrink:0}.dshw details[open]>summary:after{transform:rotate(225deg)}.dshw details>summary+*{margin-top:12px}.dshw pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;max-width:100%;background:var(--w-soft);border-radius:6px;padding:14px}.dshw img,.dshw video,.dshw iframe{max-width:100%}
.w-page{display:flex;flex-direction:column;position:relative;padding:0;min-height:540px;gap:0}.w-page[data-main=true]{height:100%;min-height:0;padding:calc(24px + var(--dsh-frame-top-clearance,0px)) 28px 0 max(28px,var(--dsh-frame-leading-clearance,0px));overflow:auto}.w-page-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding-bottom:22px;flex-shrink:0}.w-heading{min-width:0}.w-subtitle{margin-top:8px!important;font-size:14px;color:var(--w-muted);line-height:1.6}.w-header-actions,.w-toolbar,.w-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0}.w-header-actions{justify-content:flex-end}.w-body,.w-tabs-layout{display:flex;flex-direction:column;flex:1;min-height:0;min-width:0}.w-body{overflow:auto}.w-tab-panel{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:auto}.w-tabs{display:flex;align-items:stretch;gap:20px;border-bottom:1px solid var(--w-border);flex-shrink:0;overflow-x:auto;scrollbar-width:thin}.dshw .w-tabs>button{border:0;border-bottom:2px solid transparent;background:transparent;padding:11px 8px 13px;white-space:nowrap;font-size:14px;font-weight:550;cursor:pointer;color:var(--w-muted);display:flex;align-items:center;gap:7px}.dshw .w-tabs>button[aria-selected=true]{border-bottom-color:var(--w-accent);color:var(--w-accent)}.w-count,.w-tag{font-size:12px;line-height:1.5;display:inline-flex;align-items:center;flex-shrink:0;background:var(--w-soft);border-radius:5px;padding:1px 6px;color:var(--w-muted)}.w-tabs [aria-selected=true] .w-count,.w-selected .w-tag{color:var(--w-accent);background:var(--w-selected)}
.dshw .w-button{display:inline-flex;justify-content:center;align-items:center;gap:7px;background:var(--w-bg);border:1px solid var(--w-border);border-radius:8px;padding:8px 12px;min-height:36px;line-height:1.4;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;white-space:normal}.dshw .w-button:not(:disabled):hover{background:var(--w-soft)}.dshw .w-primary{background:var(--w-primary);border-color:var(--w-primary);color:var(--w-on-primary)}.dshw .w-primary:not(:disabled):hover{background:var(--w-primary);opacity:.9}.dshw .w-ghost{background:transparent;border-color:transparent}.dshw .w-danger{color:var(--dsw-alias-state-error-primary,#b43c3c)}.dshw .w-icon-button{width:36px;min-width:36px;padding:8px}.dshw .w-button svg{flex-shrink:0}.w-muted{color:var(--w-muted);font-size:12px;line-height:1.6}.w-section{padding:24px 0;border-bottom:1px solid var(--w-border);min-width:0}.w-section>h3{margin-bottom:12px}.w-section>p+p{margin-top:8px}.w-fields{display:grid;gap:16px;min-width:0}.w-field{display:grid;gap:6px;min-width:0}.w-field>input,.w-field>select,.w-field>textarea{width:100%}.w-status{display:flex;align-items:flex-start;gap:8px;padding:11px 13px;margin:12px 0;border:1px solid var(--w-border);border-radius:8px;background:var(--w-soft);font-size:13px;overflow-wrap:anywhere;flex-shrink:0}.w-status>svg{flex-shrink:0;margin-top:2px}.w-status-error{color:var(--dsw-alias-state-error-primary,#ad3636)}.w-status-success{color:var(--dsw-alias-state-success-primary,#24794a)}.w-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;max-width:580px;padding:48px 24px;margin:auto;min-height:280px;overflow-wrap:anywhere}.w-empty>svg{color:var(--w-muted)}.w-empty h2{font-size:20px}.w-empty .w-muted{font-size:14px}.w-empty .w-toolbar{justify-content:center}
.w-split{display:grid;grid-template-columns:minmax(240px,var(--w-list-width)) minmax(0,1fr);min-height:460px;flex:1;min-width:0}.w-master{min-width:0;border-inline-end:1px solid var(--w-border);overflow:auto;padding-bottom:24px}.w-detail{min-width:0;padding:26px 28px;overflow:auto;overflow-wrap:anywhere;display:flex;flex-direction:column}.w-master-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:20px 16px}.w-search{display:flex;align-items:center;gap:8px;border:1px solid var(--w-border);border-radius:8px;padding:0 10px;min-width:0;flex:1;background:var(--w-bg)}.w-search>svg{color:var(--w-muted);flex-shrink:0}.dshw .w-search>input{border:0!important;background:transparent!important;padding:8px 0!important;width:100%;outline-offset:0}.w-row{display:flex;gap:0;min-width:0;position:relative;border-bottom:1px solid var(--w-border);border-inline-start:3px solid transparent}.w-row-select{display:flex;align-items:flex-start;padding:21px 0 0 14px}.dshw .w-row-button{display:flex;flex-direction:column;align-items:stretch;gap:7px;text-align:start;width:100%;padding:18px 18px 18px 16px;border:0;background:transparent;color:inherit;min-width:0;cursor:pointer;line-height:1.5}.dshw .w-row-button:hover{background:var(--w-soft)}.w-row-head{display:flex;align-items:flex-start;gap:10px;justify-content:space-between;min-width:0}.w-row-head>strong{font-size:14px;line-height:1.5;font-weight:600;overflow-wrap:anywhere}.w-row-meta,.w-row-description{color:var(--w-muted);font-size:12px;line-height:1.6;overflow-wrap:anywhere}.w-row-description{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.w-selected{background:var(--w-selected);border-inline-start-color:var(--w-accent)}.w-back{display:none!important}.w-detail-title{margin-bottom:12px!important}.w-detail-meta{color:var(--w-muted);font-size:13px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.w-detail-footer{padding:24px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:auto;border-top:1px solid var(--w-border)}.w-detail-footer .w-muted{flex:1;min-width:160px}.w-definition{display:grid;grid-template-columns:minmax(80px,120px) minmax(0,1fr);gap:8px 16px;font-size:14px;margin:20px 0}.w-definition dt{color:var(--w-muted)}.w-definition dd{margin:0;min-width:0;overflow-wrap:anywhere}
.w-switch-label{display:inline-flex;align-items:center;gap:8px;font-size:13px;position:relative;cursor:pointer}.w-switch-label>input{position:absolute;opacity:0;inset-inline-end:0;width:36px!important;height:22px!important;margin:0;cursor:pointer}.w-switch-track{width:36px;height:22px;border-radius:12px;display:block;background:var(--w-border);border:1px solid var(--w-border);pointer-events:none;padding:2px;transition:background .15s}.w-switch-track:before{content:'';display:block;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px #0002;transition:transform .15s}.w-switch-label>input:checked+.w-switch-track{background:var(--w-accent);border-color:var(--w-accent)}.w-switch-label>input:checked+.w-switch-track:before{transform:translateX(14px)}.w-switch-label>input:focus-visible+.w-switch-track{outline:2px solid var(--w-accent);outline-offset:3px}.w-switch-label:has(>input:disabled){opacity:.5;cursor:not-allowed}
.w-overlay{position:fixed;inset:0;background:#0005;display:flex;justify-content:flex-end;z-index:1000;padding:12px;overflow:auto}.w-dialog{width:min(620px,100%);max-height:100%;display:flex;flex-direction:column;min-height:0;background:var(--w-bg);color:var(--w-text);border:1px solid var(--w-border);border-radius:12px;box-shadow:0 18px 70px #0003}.w-dialog-header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px;border-bottom:1px solid var(--w-border);flex-shrink:0}.w-dialog-header>h2{font-size:20px}.w-dialog-body{overflow:auto;padding:20px 24px;min-height:0}.w-editor-grid{display:grid;grid-template-columns:210px minmax(0,1fr) 300px;min-height:500px;flex:1}.w-editor-list{padding:20px 12px;border-inline-end:1px solid var(--w-border);min-width:0}.w-editor-canvas{background:var(--w-soft);padding:20px;min-width:0;display:flex;flex-direction:column;gap:14px}.w-editor-inspector{padding:24px;border-inline-start:1px solid var(--w-border);min-width:0;overflow:auto}.w-editor-inspector h3{margin-bottom:18px}.w-preview-empty{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:12px;aspect-ratio:16/9;min-height:180px;background:var(--w-soft);border:1px solid var(--w-border);border-radius:8px;padding:24px;color:var(--w-muted)}.w-content-pad{padding:24px 0}.w-stack{display:flex;flex-direction:column;gap:16px;min-width:0}.w-scroll-x{overflow:auto;max-width:100%}
@container dsh-workbench (max-width:1000px){.w-editor-grid{grid-template-columns:160px minmax(0,1fr)}.w-editor-inspector{grid-column:1/-1;border-inline-start:0;border-top:1px solid var(--w-border)}.w-header-actions{max-width:60%}.w-split{grid-template-columns:minmax(240px,32%) minmax(0,1fr)}}
@container dsh-workbench (max-width:760px){.w-page-header{gap:14px;flex-wrap:wrap;padding-bottom:18px}.w-heading{flex:1;min-width:170px}.dshw h1{font-size:24px}.w-header-actions{max-width:100%;justify-content:flex-start}.w-subtitle{font-size:13px}.w-tabs{gap:12px}.dshw .w-tabs>button{padding:10px 4px 12px}.w-split{display:block;min-height:360px}.w-split[data-selected=false]>.w-detail{display:none}.w-split[data-selected=true]>.w-master{display:none}.w-master{border-inline-end:0}.w-detail{padding:20px 0}.w-back{display:inline-flex!important;align-self:flex-start;margin:0 0 16px!important}.w-detail h2{font-size:22px}.w-master-toolbar{padding:16px 0}.dshw .w-row-button{padding:16px 10px}.w-detail-footer{position:static}.w-detail-footer .w-muted{flex-basis:100%}.w-editor-grid{display:flex;flex-direction:column}.w-editor-list{border-inline-end:0;border-bottom:1px solid var(--w-border);padding:16px 0}.w-editor-canvas{padding:16px 0;background:var(--w-bg)}.w-editor-inspector{padding:20px 0}.w-dialog-header,.w-dialog-body{padding:16px}.w-button{min-height:40px}.w-definition{grid-template-columns:80px minmax(0,1fr)}}
@media(max-width:700px){.w-page[data-main=true]{padding:calc(16px + var(--dsh-frame-top-clearance,0px)) 16px 0 max(16px,var(--dsh-frame-leading-clearance,0px))}.w-overlay{padding:8px}.w-dialog{width:100%}}
@media(prefers-reduced-motion:reduce){.dshw *,.dshw *:before{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
  return { Icon, Button, IconButton, Page, Tabs, Status, Empty, Split, Row, Search, Switch, Dialog, register, styles };
}

/* One update control per plugin. Only transport, idle guards and installation
 * coordination are shared; no global update page or update-all action exists. */
function __stardustUpdatesGuards() {
  const key = Symbol.for('stardustlc.plugin-updates.guards.v1');
  return globalThis[key] ||= { values: new Map(), listeners: new Set(), viewListeners: new Set(), clients: new Set() };
}
function __stardustUpdatesGuard(React, name, { dirty = false, busy = false, retainOnClose = false } = {}) {
  const token = React.useRef(null);
  if (!token.current) token.current = {};
  React.useLayoutEffect(() => {
    const pool = __stardustUpdatesGuards();
    if (!dirty && !busy) for (const [key, value] of pool.values) if (value.name === name && value.orphan) pool.values.delete(key);
    pool.values.set(token.current, { name, dirty: !!dirty, busy: !!busy, retainOnClose, orphan: false });
    for (const listener of pool.listeners) listener();
  }, [name, !!dirty, !!busy, retainOnClose]);
  React.useEffect(() => () => {
    const pool = __stardustUpdatesGuards(), value = pool.values.get(token.current);
    if (value?.retainOnClose && (value.dirty || value.busy)) value.orphan = true;
    else pool.values.delete(token.current);
    for (const listener of pool.listeners) listener();
  }, []);
}
function __StardustPluginUpdatesFooter({ React, name }) {
  const [, render] = React.useState(0), pool = __stardustUpdatesGuards();
  React.useEffect(() => { const fn = () => render(value => value + 1); pool.viewListeners.add(fn); return () => pool.viewListeners.delete(fn); }, []);
  const client = [...pool.clients].find(client => client.has(name));
  if (!client) return null;
  return React.createElement(client.Footer, { name });
}
function __stardustUpdatesInlinePage(React, element, name) {
  return React.cloneElement(element, null, element.props.children, React.createElement(__StardustPluginUpdatesFooter, { key: 'plugin-updates', React, name }));
}
function __stardustUpdatesDetailName(subject, rows) {
  if (!subject || !['bundle', 'row'].includes(subject.kind)) return null;
  if (subject.kind === 'row' && subject.pkg?.name === '@stardustlc/dsh-suite') {
    const component = rows.find(row => row.bundledBy === subject.pkg.name && (subject.row?.moduleName === row.name || subject.row?.moduleName?.startsWith(row.name + '/')));
    if (component) return component.name;
  }
  return rows.some(row => row.name === subject.pkg?.name) ? subject.pkg.name : null;
}
function __stardustUpdatesNativeFormState(document) {
  let dirty = false, busy = false;
  for (const scope of document.querySelectorAll('[data-plugin-detail],[data-plugin-row-detail]')) for (const button of scope.querySelectorAll('button')) {
    if (!button.getClientRects().length || button.closest('.plugin-updates-footer')) continue;
    const label = (button.getAttribute('aria-label') || button.textContent || '').trim();
    if (/^(?:正在保存|保存中|Saving)(?:[.…\s]|$)/i.test(label) || button.getAttribute('aria-busy') === 'true') busy = true;
    if (!button.disabled && button.getAttribute('aria-disabled') !== 'true' && /^(?:保存(?:更改|设置|配置)?|Save(?: changes| settings| configuration)?)(?:\s+(?:Ctrl|⌘|Enter|↵).*)?$/i.test(label)) dirty = true;
  }
  return { dirty, busy };
}
function __stardustUpdatesDisplayRows(next, known) {
  for (const row of next.rows) known.set(row.name, row);
  if (!['verifying', 'installing', 'cancelling', 'unknown', 'restore-failed'].includes(next.job?.state)) return next;
  const rows = [...next.rows];
  for (const row of known.values()) if ((row.name === next.job.name || row.bundledBy === next.job.name) && !rows.some(item => item.name === row.name)) rows.push({ ...row, updating: true });
  return { ...next, rows };
}
function __stardustUpdatesSuiteRows(next, participants) {
  // The official manager lists top-level dependencies, not Suite's transitive
  // components. Project active, build-identified clients for display only.
  // Installation and preferences still use the real Suite row from the host.
  const suite = next.rows.find(row => row.name === '@stardustlc/dsh-suite' && row.enabled);
  if (!suite) return next;
  const rows = [...next.rows], names = new Set(rows.map(row => row.name));
  for (const item of participants) if (item.suiteComponent && item.packageVersion && item.label && !names.has(item.name)) {
    names.add(item.name);
    rows.push({ name: item.name, version: item.packageVersion, enabled: true, sourceKind: 'suite', loadError: false, label: item.label, labelEn: item.labelEn, bundledBy: suite.name });
  }
  return { ...next, rows };
}
function __stardustUpdatesWrap(definition, participant) {
  return { ...definition, factory(require) {
    const original = definition.factory(require);
    if (!original || typeof original !== 'object') return original;
    const React = require('react');
    return { ...original, apply(ctx, ...args) {
      const result = original.apply?.call(this, ctx, ...args);
      if (typeof ctx.inject === 'function') ctx.inject(['slots', 'locale', 'remote', 'remote.pluginManager'], host => __stardustUpdatesJoin(host, React, require, participant));
      return result;
    } };
  } };
}
function __stardustUpdatesJoin(host, React, require, participant) {
  const key = Symbol.for('stardustlc.plugin-updates.client.v1'), pools = globalThis[key] ||= new WeakMap(), root = host.root || host;
  if (typeof root.plugin !== 'function') return;
  let record = pools.get(root);
  if (!record) {
    record = { refs: new Map(), timer: null, version: participant.version, alive: true, hold: false };
    pools.set(root, record);
    const shared = record;
    record.fiber = root.plugin({ name: 'stardustlc-plugin-updates-client', inject: ['slots', 'locale', 'remote', 'remote.pluginManager'], apply(ctx) {
      const client = __stardustUpdatesClient(ctx, React, require, shared);
      ctx.effect(() => () => { shared.alive = false; client.dispose(); if (pools.get(root) === shared) pools.delete(root); });
    } });
    Promise.resolve(record.fiber).catch(() => { shared.alive = false; if (pools.get(root) === shared) pools.delete(root); });
  }
  clearTimeout(record.timer);
  const ref = {}; record.refs.set(ref, participant);
  host.effect(() => () => {
    record.refs.delete(ref);
    const stop = () => {
      if (record.refs.size || !record.alive) return;
      if (record.hold) { record.timer = setTimeout(stop, 1000); return; }
      record.alive = false; Promise.resolve(record.fiber?.dispose?.()).catch(() => {});
    };
    if (!record.refs.size) record.timer = setTimeout(stop, 1000);
  });
}
function __stardustUpdatesClient(ctx, React, require, shared) {
  const h = React.createElement, W = createWorkbenchUI(React), route = new URL('api/stardustlc/plugin-updates', document.baseURI);
  const { useState, useEffect } = React, id = crypto.randomUUID(), listeners = new Set(), pool = __stardustUpdatesGuards(), requests = new Set(), notified = new Set(), knownRows = new Map();
  let alive = true, registered = false, state = null, lastInteraction = Date.now(), inPoll = false, manualOperation = false;
  const language = () => String(ctx.locale?.getSnapshot?.().active || '').startsWith('en') ? 'en' : 'zh';
  const t = (zh, en) => language() === 'en' ? en : zh;
  const preferences = name => state?.preferences.packages[name] || { checkEnabled: true, autoInstall: false, deferredUntil: 0, ignoredVersion: null };
  const originalRow = name => state?.rows.find(row => row.name === name);
  const rowFor = name => { const row = originalRow(name); return row?.bundledBy ? originalRow(row.bundledBy) : row; };
  const activeJob = () => ['verifying', 'installing', 'cancelling'].includes(state?.job?.state);
  function notify() { shared.hold = manualOperation || activeJob(); for (const listener of listeners) listener(); for (const listener of pool.viewListeners) listener(); }
  async function api(body = { action: 'state' }) {
    const controller = new AbortController(); requests.add(controller);
    const timeout = setTimeout(() => controller.abort(), body.action === 'check' ? 95000 : 45000);
    try {
      const response = await fetch(route, { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: { 'content-type': 'application/json', 'x-stardustlc-updates': '1' }, body: JSON.stringify(body) });
      let data; try { data = await response.json(); } catch { throw new Error('service-unavailable'); }
      if (!response.ok || !data.ok) throw new Error(response.status === 403 ? 'owner-required' : data.code || 'service-unavailable');
      return data.value;
    } catch (error) { if (error?.name === 'AbortError') throw new Error('service-unavailable'); throw error; }
    finally { clearTimeout(timeout); requests.delete(controller); }
  }
  function pageState(manual = manualOperation) {
    const values = [...pool.values.values()], nativeForm = __stardustUpdatesNativeFormState(document);
    const dialog = [...document.querySelectorAll('[role="dialog"],dialog[open]')].some(node => node.getClientRects().length && !(manual && (node.closest('.plugin-updates-footer') || node.querySelector('.plugin-updates-footer'))));
    return { action: 'heartbeat', id, dirty: nativeForm.dirty || values.some(value => value.dirty), busy: nativeForm.busy || values.some(value => value.busy) || dialog, idleForMs: Math.min(86400000, Math.max(0, Date.now() - lastInteraction)) };
  }
  const heartbeat = () => api(pageState());
  function interaction() { lastInteraction = Date.now(); if (registered && alive) void heartbeat().catch(() => {}); }
  const guardChanged = () => { if (registered && alive) void heartbeat().catch(() => {}); };
  for (const event of ['pointerdown', 'keydown', 'input']) document.addEventListener(event, interaction, { capture: true, passive: true });
  pool.listeners.add(guardChanged);
  const close = () => { void fetch(route, { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'content-type': 'application/json', 'x-stardustlc-updates': '1' }, body: JSON.stringify({ action: 'client-close', id }) }).catch(() => {}); };
  window.addEventListener('pagehide', close);
  async function refresh() { const next = await api(); if (alive) { state = __stardustUpdatesDisplayRows(__stardustUpdatesSuiteRows(next, shared.refs.values()), knownRows); notify(); } return next; }
  function useSnapshot() {
    const [, render] = useState(0);
    useEffect(() => { const fn = () => render(value => value + 1); listeners.add(fn); const stop = ctx.locale?.subscribe?.(fn); return () => { listeners.delete(fn); stop?.(); }; }, []);
    return state;
  }
  function message(code) {
    return ({
      'page-dirty': t('有未保存的修改。请先保存或放弃修改，再更新。', 'Save or discard unsaved changes before updating.'),
      'page-busy': t('有页面操作或对话框尚未结束，请完成后再试。', 'Finish the active page operation or close its dialog, then retry.'),
      'page-not-ready': t('还有窗口状态未确认，或旧版插件尚未提供状态保护。请刷新相关窗口，必要时先手动更新旧版插件。', 'A window state is unknown or an older plugin lacks state protection. Refresh the affected windows and manually update legacy plugins if needed.'),
      busy: t('DSH 正在执行任务或安装，请等操作结束。', 'DSH is running a task or installation. Wait for it to finish.'),
      'activity-unknown': t('无法确认任务是否空闲，已暂停安装。', 'Installation paused because task activity is unknown.'),
      'restart-required': t('更新服务需要重启后继续。请在方便时手动重启 DSH。', 'The updater needs a restart. Restart DSH manually when convenient.'),
      'operation-unconfirmed': t('上次安装未确认或恢复失败。请在官方插件管理中检查并修复，之后手动重启 DSH。', 'The last installation is unconfirmed or recovery failed. Check and repair it in native plugin management, then restart DSH manually.'),
      'check-first': t('检查结果已过期，请重新检查。', 'This check expired. Check again.'),
      'release-changed': t('发布信息已变化，本次未安装。请重新检查。', 'Release metadata changed. Nothing was installed; check again.'),
      'preferences-conflict': t('另一个窗口修改了偏好，已刷新，请重试。', 'Preferences changed in another window. They have been refreshed; retry.'),
      'preferences-unreadable': t('更新偏好文件无法读取，自动安装已关闭。请检查当前 profile 的 stardustlc-plugin-updates.json。', 'Preferences could not be read. Automatic installation is off. Check stardustlc-plugin-updates.json in this profile.'),
      'no-update': t('版本已变化或暂不兼容，请重新检查。', 'The version changed or is incompatible. Check again.'),
      'source-not-registry': t('本地源码、Git 等安装，请通过原安装方式更新。', 'Update local, Git and other external sources through their original installation method.'),
      'managed-by-suite': t('这个插件随 Suite 安装，通过 Suite 更新。', 'This plugin was installed through Suite and is updated through Suite.'),
      'owner-required': t('只有 profile 拥有者能管理更新。', 'Only the profile owner can manage updates.'),
    })[code] || t('操作未完成，请刷新后重试。DSH 不会因此自动重启。', 'The operation could not be completed. Refresh and retry. DSH will not restart automatically.');
  }
  function jobLabel(job) {
    return ({ verifying: t('正在核对版本', 'Verifying release'), installing: t('正在安装', 'Installing'), cancelling: t('正在请求取消', 'Requesting cancellation'), complete: t('已更新', 'Updated'), 'restart-required': t('已安装，等待你手动重启', 'Installed; manual restart needed'), restored: t('更新未成功，已恢复原版本', 'Update failed; previous version restored'), 'restore-failed': t('恢复未成功，请检查官方插件管理', 'Recovery failed; check native plugin management'), unknown: t('结果未确认，请检查官方插件管理', 'Result unconfirmed; check native plugin management'), cancelled: t('已取消', 'Cancelled'), failed: t('更新未成功', 'Update failed') })[job.state] || job.state;
  }
  function FooterFrame({ name, label, subtitle, actions, children }) {
    return h('section', { className: 'dshw plugin-updates-footer', 'data-plugin-update-footer': name, 'aria-label': label + t(' · 版本与更新', ' · Version and updates') },
      h('style', null, W.styles),
      h('style', null, '.plugin-updates-footer{box-sizing:border-box;flex-shrink:0;margin-top:28px;padding-top:18px;border-top:1px solid var(--dsw-alias-border-l3,#e5e7eb);min-width:0;max-width:100%;color:var(--dsw-alias-label-primary,#202124)}.plugin-updates-footer .updates-head{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px}.plugin-updates-footer h2{font-size:14px;line-height:22px;margin:0;font-weight:600}.plugin-updates-footer .updates-subtitle,.plugin-updates-footer .updates-version{font:12px/1.6 ui-monospace,monospace;overflow-wrap:anywhere;margin:4px 0}.plugin-updates-footer .updates-options{margin-top:12px}.plugin-updates-footer .updates-options>summary{cursor:pointer;font-size:12px;line-height:22px;color:var(--dsw-alias-label-secondary,#657080)}.plugin-updates-footer .updates-options>summary:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#6b79df);outline-offset:4px}.plugin-updates-footer .updates-settings{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px;padding:14px 0 0}.plugin-updates-footer .updates-note{margin:5px 0 0;font-size:12px;line-height:1.6}.plugin-updates-footer>.w-section{margin:10px 0 0;padding:0;border:0}.plugin-updates-footer .w-toolbar{margin-top:10px!important}.plugin-updates-footer .w-switch-label{max-width:100%;gap:12px;align-items:flex-start}.plugin-updates-footer .w-switch-track{flex-shrink:0}.plugin-updates-footer .updates-notes{margin-top:12px;padding:12px;border:1px solid var(--dsw-alias-border-l3,#e5e7eb);border-radius:10px}.plugin-updates-footer .updates-notes pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;font:12px/1.7 ui-monospace,monospace}.plugin-updates-footer .w-overlay{z-index:1002}@media(max-width:600px){.plugin-updates-footer .updates-head{gap:8px}.plugin-updates-footer .w-toolbar{gap:6px;flex-wrap:wrap}.plugin-updates-footer .w-button{max-width:100%}}'),
      h('div', { className: 'updates-head' }, h('div', null, h('h2', null, t('版本与更新', 'Version and updates')), h('p', { className: 'updates-subtitle w-muted' }, subtitle)), actions), children);
  }
  function Panel({ name }) {
    const snapshot = useSnapshot(), [error, setError] = useState(''), [working, setWorking] = useState(false), [checking, setChecking] = useState(false), [dialog, setDialog] = useState(null), [notes, setNotes] = useState(null), [notesOpen, setNotesOpen] = useState(false), [loadingNotes, setLoadingNotes] = useState(false);
    const row = rowFor(name), original = originalRow(name), target = row?.name || name, prefs = preferences(target), job = snapshot?.job?.name === target ? snapshot.job : null;
    async function perform(callback) { setError(''); setWorking(true); try { await callback(); await refresh(); } catch (error) { setError(error.message); await refresh().catch(() => {}); } finally { setWorking(false); } }
    async function save(changes, consent) { await api({ action: 'preferences', name: target, revision: state.preferences.revision, changes, consent }); }
    async function check() { setError(''); setChecking(true); try { await api({ action: 'check', name: target }); await refresh(); } catch (error) { setError(error.message); } finally { setChecking(false); } }
    async function install() {
      setDialog(null); manualOperation = true; notify();
      await perform(async () => {
        try {
          await heartbeat();
          const started = await api({ action: 'install', name: row.name, version: row.release.version, confirmation: 'update-installed-plugin' });
          while (alive) {
            await new Promise(resolve => setTimeout(resolve, 800)); await heartbeat(); await refresh();
            if (state.job?.id !== started.id) throw new Error('operation-unconfirmed');
            if (!activeJob()) break;
          }
        } finally { manualOperation = false; notify(); }
      });
    }
    async function showNotes() {
      if (notesOpen) { setNotesOpen(false); return; }
      setNotesOpen(true); setNotes(null); setLoadingNotes(true); setError('');
      try { setNotes(await api({ action: 'notes', name: target, version: row.release.version })); } catch (error) { setError(error.message); } finally { setLoadingNotes(false); }
    }
    if (!snapshot || !row) return h(W.Status, null, t('此插件尚未安装或已从当前 profile 移除。', 'This plugin is not installed in the current profile.'));
    const title = language() === 'en' ? original.labelEn : original.label;
    const ownPage = pageState(true), unconfirmed = ['unknown', 'restore-failed'].includes(snapshot.job?.state), pageBusy = ownPage.busy || (snapshot.pages.clients || []).some(client => client.id !== id && client.busy), installLocked = working || activeJob() || unconfirmed || snapshot.updaterRestart || snapshot.preferenceError || !snapshot.activity.known || snapshot.activity.busy || snapshot.pages.dirty || ownPage.dirty || pageBusy || !snapshot.pages.known;
    const checkingThis = checking || snapshot.checkingNames?.includes(target);
    const status = row.sourceKind !== 'registry' ? t('本地 / 外部来源，保留原安装方式', 'Local / external source; keep original install method') : row.loadError ? t('加载异常，请先检查官方插件管理', 'Loading error; check native plugin management') : row.error ? t('检查失败，可以重试', 'Check failed; retry available') : row.release && !row.release.compatible ? t('新版本暂不兼容当前环境', 'Latest release is incompatible with this environment') : row.available ? (prefs.ignoredVersion === row.release.version ? t('已忽略提醒，仍可手动更新', 'Reminder ignored; manual update available') : t('有新版本', 'Update available')) : row.checkedAt ? t('当前已是最新稳定版', 'Latest stable version') : t('尚未检查', 'Not checked yet');
    return h(FooterFrame, { name, label: title, subtitle: original.name + ' · ' + original.version, actions: h(W.Button, { icon: 'refresh', disabled: checkingThis || row.sourceKind !== 'registry', onClick: check }, checkingThis ? t('正在检查…', 'Checking…') : target === '@stardustlc/dsh-suite' ? t('检查整包更新', 'Check Suite updates') : t('检查更新', 'Check for updates')) },
      original.bundledBy && h(W.Status, null, t('此插件随 Suite 安装。以下设置与安装作用于 Suite 整包，以保持组件版本一致。单独安装的插件可以独立更新。', 'This plugin was installed through Suite. These controls update Suite as a package so its components stay consistent. Independently installed plugins update individually.')),
      h('section', { className: 'w-section' }, (original.bundledBy || row.available) && h('p', { className: 'updates-version' }, target + ' · ' + row.version, row.release?.version && row.release.version !== row.version ? ' → ' + row.release.version : ''), h('p', { className: 'w-muted updates-note' }, status), !row.enabled && h('p', { className: 'w-muted' }, t('当前已停用，更新后仍保持停用。', 'Currently disabled; it will remain disabled after updating.')), row.checkedAt && h('p', { className: 'w-muted updates-note' }, t('上次检查：', 'Last checked: ') + new Date(row.checkedAt).toLocaleString(language() === 'en' ? 'en-US' : 'zh-CN')),
        h('div', { className: 'w-toolbar' }, row.available && row.sourceKind === 'registry' && h(W.Button, { variant: 'primary', icon: 'download', disabled: installLocked || row.loadError, onClick: () => setDialog('install') }, target === '@stardustlc/dsh-suite' ? t('更新 Suite 整包', 'Update whole Suite') : t('更新此插件', 'Update this plugin')), row.release && h(W.Button, { variant: 'ghost', onClick: showNotes, 'aria-expanded': notesOpen }, t('更新记录', 'Release notes')), row.available && h(W.Button, { variant: 'ghost', disabled: working, onClick: () => perform(() => api({ action: 'later', name: target, revision: state.preferences.revision })) }, t('明天再提醒', 'Remind me tomorrow')), row.available && prefs.ignoredVersion !== row.release.version && h(W.Button, { variant: 'ghost', disabled: working, onClick: () => perform(() => api({ action: 'ignore', name: target, revision: state.preferences.revision, version: row.release.version })) }, t('忽略此版本提醒', 'Ignore this reminder')))),
      notesOpen && h('section', { className: 'updates-notes', 'aria-label': t('更新记录', 'Release notes') }, h('strong', null, target + ' · ' + (notes?.version || row.release?.version || '')), loadingNotes ? h('p', null, t('正在读取…', 'Loading…')) : notes?.text ? h('pre', null, notes.text) : h('p', null, t('未找到此版本的独立更新记录。', 'No separate notes were found for this version.')), notes?.url && h('a', { href: notes.url, target: '_blank', rel: 'noreferrer noopener' }, t('查看仓库更新记录', 'View repository changelog'))),
      h('details', { className: 'updates-options' }, h('summary', null, t('更新选项', 'Update options'), ' · ', prefs.checkEnabled ? t('自动检查：开', 'Checks: on') : t('自动检查：关', 'Checks: off'), ' · ', prefs.autoInstall ? t('自动安装：开', 'Install: on') : t('自动安装：关', 'Install: off')), h('section', { className: 'updates-settings', 'aria-label': t('这个插件的更新偏好', 'Update preferences for this plugin') },
        h('div', null, h(W.Switch, { label: t('自动检查这个插件的更新', 'Automatically check this plugin'), checked: prefs.checkEnabled, disabled: working || !!snapshot.preferenceError || row.sourceKind !== 'registry', onChange: event => perform(() => save({ checkEnabled: event.target.checked })) }), h('p', { className: 'w-muted updates-note' }, t('默认开启，每天最多一次。只影响这个插件，关闭后仍可手动检查。', 'On by default, at most once daily. This affects only this plugin; manual checks remain available.'))),
        h('div', null, h(W.Switch, { label: t('空闲时自动安装这个插件的补丁', 'Install patches for this plugin while idle'), checked: prefs.autoInstall, disabled: working || !!snapshot.preferenceError || row.sourceKind !== 'registry', onChange: event => event.target.checked ? setDialog('automatic') : perform(() => save({ autoInstall: false })) }), h('p', { className: 'w-muted updates-note' }, t('默认关闭。明确开启后，仅空闲且没有未保存修改时安装兼容补丁。其他插件的开关不变。', 'Off by default. Explicitly enable compatible patches while idle with no unsaved changes. Other plugins’ settings stay unchanged.'))))),
      error && h(W.Status, { tone: 'error' }, message(error)), snapshot.preferenceError && h(W.Status, { tone: 'error' }, message('preferences-unreadable')),
      snapshot.pendingRestart && h(W.Status, null, snapshot.updaterRestart ? message('restart-required') : t('已有更新等待手动重启后生效。你可以继续工作，自动安装已暂停。', 'Some updates need a manual restart. Continue your work; automatic installation is paused.')),
      prefs.autoInstall && snapshot.autoReady === false && h(W.Status, null, message('page-not-ready')),
      snapshot.pages.clients.some(client => !client.fresh) && h(W.Status, null, h('p', null, t('有窗口已断开，无法确认是否还有未保存修改。仍在使用的窗口请先保存并刷新；已关闭的窗口可以手动重新确认。', 'A disconnected window may contain unsaved changes. Save and refresh windows still in use. If they are closed, you can confirm that manually.')), h(W.Button, { onClick: () => setDialog('windows') }, t('重新确认已关闭的窗口', 'Confirm closed windows'))),
      (snapshot.pages.dirty || ownPage.dirty) && h(W.Status, null, message('page-dirty')), (snapshot.activity.busy || pageBusy) && h(W.Status, null, message(snapshot.activity.busy ? 'busy' : 'page-busy')),
      prefs.deferredUntil > Date.now() && h(W.Status, null, t('此插件已推迟提醒和自动安装 24 小时，仍可手动更新。', 'Reminders and automatic installation for this plugin are deferred for 24 hours. Manual updates remain available.')),
      unconfirmed && h(W.Status, { tone: 'error' }, message('operation-unconfirmed')),
      job && h('section', { className: 'w-section', 'aria-label': t('这个插件的更新进度', 'Update progress for this plugin') }, h('h3', null, jobLabel(job)), h('p', { className: 'w-muted' }, job.from + ' → ' + job.to + (job.mode === 'automatic' ? t(' · 自动补丁更新', ' · Automatic patch') : '')), (job.reason || job.outcome?.result?.error?.code) && h(W.Status, { tone: 'error' }, message(job.reason || job.outcome.result.error.code)), activeJob() && h(W.Button, { disabled: job.state === 'cancelling', onClick: () => perform(() => api({ action: 'cancel', id: job.id })) }, t('取消更新', 'Cancel update')), h('p', { className: 'w-muted updates-note' }, t('安装开始后，取消由官方包管理器处理；已落盘的写入以实际结果或恢复状态为准。', 'After installation starts, the native package manager handles cancellation. Completed writes and recovery are reported as they occur.'))),
      dialog && h(W.Dialog, { title: dialog === 'windows' ? t('断开的窗口都已关闭？', 'Are the disconnected windows closed?') : dialog === 'automatic' ? t('允许这个插件自动安装补丁？', 'Allow automatic patches for this plugin?') : t('确认更新此插件', 'Confirm this plugin update'), closeLabel: t('关闭', 'Close'), onClose: () => setDialog(null) },
        target === '@stardustlc/dsh-suite' && h('p', null, t('此处操作的是 Suite 整包，包含 18 个组件。独立安装的其他插件不受影响。', 'This action applies to the whole Suite, including its 18 components. Other independently installed plugins are unaffected.')),
        dialog === 'windows' ? h('div', { className: 'w-stack' }, h('p', null, t('只清除超过 45 秒未回应的其他窗口记录。请先确认它们已经关闭；仍在使用的窗口请保存修改并刷新。当前或仍在回应的窗口保护会保留。', 'Only other windows silent for over 45 seconds are cleared. Confirm that they are closed; save and refresh windows still in use. Current and responsive windows remain protected.')), h('div', { className: 'w-toolbar' }, h(W.Button, { onClick: () => setDialog(null) }, t('取消', 'Cancel')), h(W.Button, { onClick: () => { setDialog(null); void perform(() => api({ ...pageState(true), action: 'reconfirm-windows', confirmation: 'other-stale-windows-are-closed' })); } }, t('已关闭，重新确认状态', 'They are closed; reconfirm')))) :
        dialog === 'automatic' ? h('div', { className: 'w-stack' }, h('p', null, (language() === 'en' ? row.labelEn : row.label) + ' · ' + target), h('p', null, t('你正在主动启用这个插件的自动安装。只处理兼容的稳定补丁；有任务、未保存修改、未知窗口或等待重启时暂停。', 'You are explicitly enabling automatic installation for this plugin. Only compatible stable patches qualify; running tasks, unsaved changes, unknown windows or a pending restart pause it.')), h('p', null, t('不会自动重启 DSH，其他插件不会跟着开启。可随时关闭。', 'DSH will not restart automatically, and other plugins will not be enabled for automatic updates. Turn it off anytime.')), h('div', { className: 'w-toolbar' }, h(W.Button, { onClick: () => setDialog(null) }, t('保持关闭', 'Keep off')), h(W.Button, { variant: 'primary', onClick: () => { setDialog(null); void perform(() => save({ checkEnabled: true, autoInstall: true }, 'enable-idle-patch-updates')); } }, t('允许此插件自动安装补丁', 'Allow patches for this plugin')))) :
        h('div', { className: 'w-stack' }, h('p', { className: 'updates-version' }, target + ': ' + row.version + ' → ' + row.release.version), h('p', null, t('通过 DSH 官方插件管理器安装。需要重启时，由你手动决定时间；停用状态会保留。', 'Install through DSH’s native plugin manager. Choose when to restart if needed; disabled status is preserved.')), h('p', { className: 'w-muted' }, t('来源：npm 官方 registry，网络不可达时回退 npmmirror。安装前再次核对版本与完整性。', 'Source: official npm registry, with npmmirror fallback if unreachable. Version and integrity are checked again before installation.')), (ownPage.dirty || snapshot.pages.dirty) && h(W.Status, null, message('page-dirty')), h('div', { className: 'w-toolbar' }, h(W.Button, { onClick: () => setDialog(null) }, t('取消', 'Cancel')), h(W.Button, { variant: 'primary', disabled: installLocked || row.loadError, onClick: install }, t('确认安装此版本', 'Install this version')))))
    );
  }
  function NativeFooter({ subject }) {
    const snapshot = useSnapshot(), name = __stardustUpdatesDetailName(subject, snapshot?.rows || []);
    return name ? h(Panel, { name }) : null;
  }
  function Reminder() {
    useSnapshot();
    const row = state?.rows.find(row => { const prefs = preferences(row.name); return row.available && !row.updating && !row.bundledBy && prefs.checkEnabled && prefs.deferredUntil <= Date.now() && prefs.ignoredVersion !== row.release.version && !notified.has(row.name + '@' + row.release.version); });
    if (!row) return null;
    let Toast; try { Toast = require('@deepseek-ai/dsh-client-ui-primitives').Toast; } catch { return null; }
    if (!Toast) return null;
    const key = row.name + '@' + row.release.version;
    return h(Toast, { key, text: (language() === 'en' ? row.labelEn : row.label) + t('有新版本，可在页面底部查看。', ' has an update. Review it at the bottom of its page.'), icon: h(W.Icon, { name: 'refresh', size: 18 }), holdMs: 7000, onDone: () => { notified.add(key); notify(); } });
  }
  function register() {
    if (!alive) return;
    if (!registered) {
      registered = true; pool.clients.add(client);
      ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({ name: 'plugins.detail.section', id: 'stardustlc.plugin-update-footer', order: 1000 }, NativeFooter));
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'stardustlc.plugin-update-reminder' }, Reminder));
      notify();
    }
  }
  async function poll() {
    if (inPoll || !alive || !shared.refs.size) return;
    inPoll = true;
    try { await refresh(); register(); await heartbeat(); }
    catch { /* Owner-only controls stay absent for guests and unsupported hosts. */ }
    finally { inPoll = false; }
  }
  const timer = setInterval(() => { void poll(); }, 15000), first = setTimeout(() => { void poll(); }, 100);
  const client = { t, Footer: Panel, has: name => registered && !!originalRow(name), row: rowFor, dispose() {
    close(); alive = false; clearTimeout(first); clearInterval(timer); pool.clients.delete(client);
    pool.listeners.delete(guardChanged); listeners.clear();
    for (const event of ['pointerdown', 'keydown', 'input']) document.removeEventListener(event, interaction, true);
    window.removeEventListener('pagehide', close);
    for (const controller of requests) controller.abort();
    for (const listener of pool.viewListeners) listener();
  } };
  return client;
}

/* STARDUSTLC_UPDATE_CLIENT_BODY_START */
// Generated from templates/client.js, templates/panels/ and templates/workbench-ui.js. Edit the sources.
(function () {
/* DSH workbench UI v1. MIT. Canonical source: dsh-suite/ui/workbench-ui.js.
 * Vendored into each plugin: no Suite or extra runtime dependency is required.
 * Styles are scoped to .dshw and never replace the host chrome or theme.
 */
function createWorkbenchUI(React) {
  const h = React.createElement;
  const { useEffect, useId, useRef } = React;
  const cx = (...values) => values.filter(Boolean).join(' ');
  const paths = {
    book: ['M4 4h6a3 3 0 0 1 2 2v15a4 4 0 0 0-4-2H4z', 'M20 4h-6a3 3 0 0 0-2 2v15a4 4 0 0 1 4-2h4z'],
    calendar: ['M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z', 'M7 3v4M17 3v4M3 10h18'],
    mail: ['M3 5h18v14H3z', 'm3 6 9 7 9-7'],
    rss: ['M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16', 'M4 19h.01'],
    slides: ['M3 4h18v13H3z', 'M12 17v4M8 21h8'],
    shield: ['m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z', 'm8 12 3 3 5-6'],
    layers: ['M5 3h16v16H5z', 'M2 7v15h15'],
    play: ['m9 6 9 6-9 6Z'],
    video: ['M3 5h12v14H3z', 'm15 10 6-4v12l-6-4'],
    search: ['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'm16 16 5 5'],
    plus: ['M12 5v14M5 12h14'],
    refresh: ['M20 7a9 9 0 1 0 1 8', 'M20 2v5h-5'],
    settings: ['m9 3-.7 2.4-2 .9L4 5.8 2.5 8.4l1.7 1.8v2.3L2.5 14 4 17l2.5-.4 1.9 1L9 20h3l.8-2.4 2-1 2.5.4 1.5-2.7-1.7-1.9v-2.2l1.7-1.8-1.5-2.6-2.5.4-2-1L12 3Z', 'M14 11.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z'],
    close: ['m6 6 12 12M18 6 6 18'],
    left: ['m14 5-7 7 7 7'],
    right: ['m10 5 7 7-7 7'],
    down: ['m5 9 7 7 7-7'],
    filter: ['M4 5h16M7 12h10M10 19h4'],
    download: ['M12 3v12m-5-5 5 5 5-5', 'M4 16v5h16v-5'],
    upload: ['M12 16V4m-5 5 5-5 5 5', 'M4 16v5h16v-5'],
    copy: ['M8 8h13v13H8z', 'M16 8V3H3v13h5'],
    external: ['M14 3h7v7m0-7L10 14', 'M10 3H3v18h18v-7'],
    file: ['M4 3h10l6 6v12H4z', 'M14 3v6h6M8 13h8M8 17h6'],
    folder: ['M3 5h7l2 3h9v12H3z'],
    edit: ['m15 4 5 5-10 10-6 1 1-6Z', 'm13 6 5 5'],
    trash: ['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'],
    more: ['M5 12h.01M12 12h.01M19 12h.01'],
    info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 11v6M12 7h.01'],
    check: ['m5 12 4 4L19 6'],
    quote: ['M4 12h6v7H3v-7c0-4 2-6 5-7M15 12h6v7h-7v-7c0-4 2-6 5-7'],
    star: ['m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z'],
    reply: ['m9 5-7 7 7 7v-5h6c3 0 5 2 6 5 0-8-4-11-12-11Z'],
    link: ['m10 13 4-4M8 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0', 'm14 8 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0'],
  };
  function Icon({ name = 'file', size = 20, ...props }) {
    return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false, ...props },
      (paths[name] || paths.file).map((d, index) => h('path', { key: index, d })));
  }
  function Button({ children, icon, variant, className, ...props }) {
    return h('button', { type: 'button', ...props, className: cx('w-button', variant && 'w-' + variant, className) }, icon ? h(Icon, { name: icon, size: 18 }) : null, children);
  }
  function IconButton({ label, icon, ...props }) {
    return h(Button, { ...props, icon, className: cx('w-icon-button', props.className), 'aria-label': label, title: label });
  }
  function Page({ title, subtitle, actions, children, workbench = false, className, rootRef, ...props }) {
    return h('section', { ...props, ref: rootRef, className: cx('dshw', 'w-page', className), 'data-main': workbench ? 'true' : 'false' },
      h('style', null, styles),
      h('header', { className: 'w-page-header' }, h('div', { className: 'w-heading' }, h('h1', null, title), subtitle ? h('p', { className: 'w-subtitle' }, subtitle) : null), actions ? h('div', { className: 'w-header-actions' }, actions) : null),
      h('div', { className: 'w-body' }, children));
  }
  function Tabs({ items, value, onChange, label, children }) {
    const id = useId();
    const active = items.some(item => item.id === value) ? value : items[0]?.id;
    function keys(event, index) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      const node = event.currentTarget.parentElement?.querySelectorAll('[role=tab]')[next];
      if (node) { onChange(items[next].id); node.focus(); }
    }
    return h('div', { className: 'w-tabs-layout' },
      h('div', { className: 'w-tabs', role: 'tablist', 'aria-label': label }, items.map((item, index) => h('button', {
        type: 'button', role: 'tab', key: item.id, id: id + '-' + item.id, 'aria-controls': id + '-panel', 'aria-selected': active === item.id, tabIndex: active === item.id ? 0 : -1,
        onClick: () => onChange(item.id), onKeyDown: event => keys(event, index),
      }, item.label, item.count !== undefined ? h('span', { className: 'w-count' }, item.count) : null))),
      h('div', { className: 'w-tab-panel', id: id + '-panel', role: 'tabpanel', 'aria-labelledby': id + '-' + active }, children));
  }
  function Status({ children, tone = 'info', className }) {
    if (!children) return null;
    return h('div', { className: cx('w-status', 'w-status-' + tone, className), role: tone === 'error' ? 'alert' : 'status', 'aria-live': tone === 'error' ? 'assertive' : 'polite' }, h(Icon, { name: tone === 'success' ? 'check' : 'info', size: 18 }), h('div', null, children));
  }
  function Empty({ title, children, action, icon = 'file' }) {
    return h('div', { className: 'w-empty' }, h(Icon, { name: icon, size: 32 }), h('h2', null, title), children ? h('div', { className: 'w-muted' }, children) : null, action ? h('div', { className: 'w-toolbar' }, action) : null);
  }
  function Split({ list, detail, selected, onBack, backLabel, className, listWidth = 360 }) {
    const ref = useRef(null);
    useEffect(() => {
      if (!selected || !ref.current || ref.current.clientWidth > 760) return;
      const heading = ref.current.querySelector('.w-detail h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }, [selected]);
    return h('div', { ref, className: cx('w-split', className), 'data-selected': selected ? 'true' : 'false', style: { '--w-list-width': listWidth + 'px' } },
      h('div', { className: 'w-master' }, list),
      h('div', { className: 'w-detail' }, selected ? h(Button, { className: 'w-back', icon: 'left', variant: 'ghost', onClick: onBack }, backLabel) : null, detail));
  }
  function Row({ title, meta, description, active, onClick, children, status, className, disabled }) {
    return h('div', { className: cx('w-row', active && 'w-selected', className) },
      children ? h('div', { className: 'w-row-select' }, children) : null,
      h('button', { type: 'button', className: 'w-row-button', onClick, disabled, 'aria-pressed': !!active },
        h('span', { className: 'w-row-head' }, h('strong', null, title), status ? h('span', { className: 'w-tag' }, status) : null),
        meta ? h('span', { className: 'w-row-meta' }, meta) : null,
        description ? h('span', { className: 'w-row-description' }, description) : null));
  }
  function Search({ label, value, onChange, ...props }) {
    const id = useId();
    return h('div', { className: 'w-search' }, h(Icon, { name: 'search', size: 18 }), h('input', { type: 'search', id, 'aria-label': label, placeholder: label, value, onChange, ...props }));
  }
  function Switch({ label, checked, onChange, disabled }) {
    return h('label', { className: 'w-switch-label' }, h('span', null, label), h('input', { type: 'checkbox', role: 'switch', checked, disabled, onChange, 'aria-label': label }), h('span', { className: 'w-switch-track', 'aria-hidden': true }));
  }
  function Dialog({ title, children, onClose, closeLabel, className, busy = false }) {
    const id = useId(), panel = useRef(null);
    useEffect(() => {
      const previous = document.activeElement;
      panel.current?.querySelector('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')?.focus();
      return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
    }, []);
    function keydown(event) {
      if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); if (!busy) onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(node => node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!controls.length) { event.preventDefault(); panel.current.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    return h('div', { className: 'w-overlay', onClick: event => { if (!busy && event.target === event.currentTarget) onClose(); } },
      h('section', { ref: panel, className: cx('w-dialog', className), role: 'dialog', 'aria-modal': true, 'aria-labelledby': id, tabIndex: -1, onKeyDown: keydown },
        h('header', { className: 'w-dialog-header' }, h('h2', { id }, title), h(IconButton, { icon: 'close', label: closeLabel, disabled: busy, onClick: onClose })), h('div', { className: 'w-dialog-body' }, children)));
  }
  function register(ctx, { id, label, icon, component, inject, order = 50 }) {
    // The two slots are optional. Existing settings and manual tools still load
    // in hosts without a workbench, while RC.3 owns navigation/pinning itself.
    ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: id, inject: () => ({ ...(inject?.() || {}), workbench: true }) }, component));
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id, order, label }, function WorkbenchIcon({ size }) { return h(Icon, { name: icon, size }); }));
  }
  const styles = `
.dshw{--w-bg:var(--dsw-alias-bg-layer-1,#fff);--w-soft:var(--dsw-alias-bg-layer-2,#f7f8fa);--w-text:var(--dsw-alias-label-primary,#18202c);--w-muted:var(--dsw-alias-label-secondary,#667085);--w-border:var(--dsw-alias-border-l3,#e7e9ef);--w-accent:var(--dsh-plugin-workbench-accent,#4f6bdb);--w-selected:color-mix(in srgb,var(--w-accent) 10%,var(--w-bg));--w-primary:var(--w-text);--w-on-primary:var(--w-bg);container-type:inline-size;container-name:dsh-workbench;color:var(--w-text);background:var(--w-bg);font:14px/1.65 var(--dsh-font-family-content,system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif);min-width:0;max-width:100%;box-sizing:border-box;text-align:start;color-scheme:inherit}
.dshw *,.dshw *:before,.dshw *:after{box-sizing:border-box}.dshw h1,.dshw h2,.dshw h3,.dshw h4,.dshw p{margin:0}.dshw h1{font-size:30px;line-height:1.25;letter-spacing:-.025em;font-weight:650}.dshw h2{font-size:24px;line-height:1.35;font-weight:650;letter-spacing:-.015em;overflow-wrap:anywhere}.dshw h3,.dshw h4{font-size:16px;line-height:1.4;font-weight:600}.dshw a{color:var(--w-accent);text-underline-offset:3px;overflow-wrap:anywhere}.dshw button,.dshw input,.dshw select,.dshw textarea{font:inherit;color:inherit;max-width:100%}.dshw input:not([type=checkbox]):not([type=radio]):not([type=file]),.dshw select,.dshw textarea{background:var(--w-bg);border:1px solid var(--w-border);border-radius:8px;padding:8px 11px;min-width:0;line-height:1.5}.dshw input:not([type=checkbox]):not([type=radio]):not([type=file]),.dshw select{min-height:38px}.dshw textarea{resize:vertical}.dshw input[type=checkbox],.dshw input[type=radio]{width:16px;height:16px;flex-shrink:0;accent-color:var(--w-accent)}.dshw :focus-visible{outline:2px solid var(--w-accent);outline-offset:3px}.dshw button:disabled,.dshw input:disabled,.dshw select:disabled,.dshw textarea:disabled{opacity:.5;cursor:not-allowed}.dshw label{font-size:13px}.dshw fieldset{min-width:0;border:1px solid var(--w-border);border-radius:8px}.dshw summary{cursor:pointer;font-weight:550;list-style:none;display:flex;align-items:center;gap:8px}.dshw summary::-webkit-details-marker{display:none}.dshw summary:after{content:'';display:block;margin-inline-start:auto;width:7px;height:7px;border-inline-end:1.75px solid currentColor;border-bottom:1.75px solid currentColor;transform:rotate(45deg);flex-shrink:0}.dshw details[open]>summary:after{transform:rotate(225deg)}.dshw details>summary+*{margin-top:12px}.dshw pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;max-width:100%;background:var(--w-soft);border-radius:6px;padding:14px}.dshw img,.dshw video,.dshw iframe{max-width:100%}
.w-page{display:flex;flex-direction:column;position:relative;padding:0;min-height:540px;gap:0}.w-page[data-main=true]{height:100%;min-height:0;padding:calc(24px + var(--dsh-frame-top-clearance,0px)) 28px 0 max(28px,var(--dsh-frame-leading-clearance,0px));overflow:auto}.w-page-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding-bottom:22px;flex-shrink:0}.w-heading{min-width:0}.w-subtitle{margin-top:8px!important;font-size:14px;color:var(--w-muted);line-height:1.6}.w-header-actions,.w-toolbar,.w-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0}.w-header-actions{justify-content:flex-end}.w-body,.w-tabs-layout{display:flex;flex-direction:column;flex:1;min-height:0;min-width:0}.w-body{overflow:auto}.w-tab-panel{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:auto}.w-tabs{display:flex;align-items:stretch;gap:20px;border-bottom:1px solid var(--w-border);flex-shrink:0;overflow-x:auto;scrollbar-width:thin}.dshw .w-tabs>button{border:0;border-bottom:2px solid transparent;background:transparent;padding:11px 8px 13px;white-space:nowrap;font-size:14px;font-weight:550;cursor:pointer;color:var(--w-muted);display:flex;align-items:center;gap:7px}.dshw .w-tabs>button[aria-selected=true]{border-bottom-color:var(--w-accent);color:var(--w-accent)}.w-count,.w-tag{font-size:12px;line-height:1.5;display:inline-flex;align-items:center;flex-shrink:0;background:var(--w-soft);border-radius:5px;padding:1px 6px;color:var(--w-muted)}.w-tabs [aria-selected=true] .w-count,.w-selected .w-tag{color:var(--w-accent);background:var(--w-selected)}
.dshw .w-button{display:inline-flex;justify-content:center;align-items:center;gap:7px;background:var(--w-bg);border:1px solid var(--w-border);border-radius:8px;padding:8px 12px;min-height:36px;line-height:1.4;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;white-space:normal}.dshw .w-button:not(:disabled):hover{background:var(--w-soft)}.dshw .w-primary{background:var(--w-primary);border-color:var(--w-primary);color:var(--w-on-primary)}.dshw .w-primary:not(:disabled):hover{background:var(--w-primary);opacity:.9}.dshw .w-ghost{background:transparent;border-color:transparent}.dshw .w-danger{color:var(--dsw-alias-state-error-primary,#b43c3c)}.dshw .w-icon-button{width:36px;min-width:36px;padding:8px}.dshw .w-button svg{flex-shrink:0}.w-muted{color:var(--w-muted);font-size:12px;line-height:1.6}.w-section{padding:24px 0;border-bottom:1px solid var(--w-border);min-width:0}.w-section>h3{margin-bottom:12px}.w-section>p+p{margin-top:8px}.w-fields{display:grid;gap:16px;min-width:0}.w-field{display:grid;gap:6px;min-width:0}.w-field>input,.w-field>select,.w-field>textarea{width:100%}.w-status{display:flex;align-items:flex-start;gap:8px;padding:11px 13px;margin:12px 0;border:1px solid var(--w-border);border-radius:8px;background:var(--w-soft);font-size:13px;overflow-wrap:anywhere;flex-shrink:0}.w-status>svg{flex-shrink:0;margin-top:2px}.w-status-error{color:var(--dsw-alias-state-error-primary,#ad3636)}.w-status-success{color:var(--dsw-alias-state-success-primary,#24794a)}.w-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;max-width:580px;padding:48px 24px;margin:auto;min-height:280px;overflow-wrap:anywhere}.w-empty>svg{color:var(--w-muted)}.w-empty h2{font-size:20px}.w-empty .w-muted{font-size:14px}.w-empty .w-toolbar{justify-content:center}
.w-split{display:grid;grid-template-columns:minmax(240px,var(--w-list-width)) minmax(0,1fr);min-height:460px;flex:1;min-width:0}.w-master{min-width:0;border-inline-end:1px solid var(--w-border);overflow:auto;padding-bottom:24px}.w-detail{min-width:0;padding:26px 28px;overflow:auto;overflow-wrap:anywhere;display:flex;flex-direction:column}.w-master-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:20px 16px}.w-search{display:flex;align-items:center;gap:8px;border:1px solid var(--w-border);border-radius:8px;padding:0 10px;min-width:0;flex:1;background:var(--w-bg)}.w-search>svg{color:var(--w-muted);flex-shrink:0}.dshw .w-search>input{border:0!important;background:transparent!important;padding:8px 0!important;width:100%;outline-offset:0}.w-row{display:flex;gap:0;min-width:0;position:relative;border-bottom:1px solid var(--w-border);border-inline-start:3px solid transparent}.w-row-select{display:flex;align-items:flex-start;padding:21px 0 0 14px}.dshw .w-row-button{display:flex;flex-direction:column;align-items:stretch;gap:7px;text-align:start;width:100%;padding:18px 18px 18px 16px;border:0;background:transparent;color:inherit;min-width:0;cursor:pointer;line-height:1.5}.dshw .w-row-button:hover{background:var(--w-soft)}.w-row-head{display:flex;align-items:flex-start;gap:10px;justify-content:space-between;min-width:0}.w-row-head>strong{font-size:14px;line-height:1.5;font-weight:600;overflow-wrap:anywhere}.w-row-meta,.w-row-description{color:var(--w-muted);font-size:12px;line-height:1.6;overflow-wrap:anywhere}.w-row-description{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.w-selected{background:var(--w-selected);border-inline-start-color:var(--w-accent)}.w-back{display:none!important}.w-detail-title{margin-bottom:12px!important}.w-detail-meta{color:var(--w-muted);font-size:13px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.w-detail-footer{padding:24px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:auto;border-top:1px solid var(--w-border)}.w-detail-footer .w-muted{flex:1;min-width:160px}.w-definition{display:grid;grid-template-columns:minmax(80px,120px) minmax(0,1fr);gap:8px 16px;font-size:14px;margin:20px 0}.w-definition dt{color:var(--w-muted)}.w-definition dd{margin:0;min-width:0;overflow-wrap:anywhere}
.w-switch-label{display:inline-flex;align-items:center;gap:8px;font-size:13px;position:relative;cursor:pointer}.w-switch-label>input{position:absolute;opacity:0;inset-inline-end:0;width:36px!important;height:22px!important;margin:0;cursor:pointer}.w-switch-track{width:36px;height:22px;border-radius:12px;display:block;background:var(--w-border);border:1px solid var(--w-border);pointer-events:none;padding:2px;transition:background .15s}.w-switch-track:before{content:'';display:block;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px #0002;transition:transform .15s}.w-switch-label>input:checked+.w-switch-track{background:var(--w-accent);border-color:var(--w-accent)}.w-switch-label>input:checked+.w-switch-track:before{transform:translateX(14px)}.w-switch-label>input:focus-visible+.w-switch-track{outline:2px solid var(--w-accent);outline-offset:3px}.w-switch-label:has(>input:disabled){opacity:.5;cursor:not-allowed}
.w-overlay{position:fixed;inset:0;background:#0005;display:flex;justify-content:flex-end;z-index:1000;padding:12px;overflow:auto}.w-dialog{width:min(620px,100%);max-height:100%;display:flex;flex-direction:column;min-height:0;background:var(--w-bg);color:var(--w-text);border:1px solid var(--w-border);border-radius:12px;box-shadow:0 18px 70px #0003}.w-dialog-header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px;border-bottom:1px solid var(--w-border);flex-shrink:0}.w-dialog-header>h2{font-size:20px}.w-dialog-body{overflow:auto;padding:20px 24px;min-height:0}.w-editor-grid{display:grid;grid-template-columns:210px minmax(0,1fr) 300px;min-height:500px;flex:1}.w-editor-list{padding:20px 12px;border-inline-end:1px solid var(--w-border);min-width:0}.w-editor-canvas{background:var(--w-soft);padding:20px;min-width:0;display:flex;flex-direction:column;gap:14px}.w-editor-inspector{padding:24px;border-inline-start:1px solid var(--w-border);min-width:0;overflow:auto}.w-editor-inspector h3{margin-bottom:18px}.w-preview-empty{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:12px;aspect-ratio:16/9;min-height:180px;background:var(--w-soft);border:1px solid var(--w-border);border-radius:8px;padding:24px;color:var(--w-muted)}.w-content-pad{padding:24px 0}.w-stack{display:flex;flex-direction:column;gap:16px;min-width:0}.w-scroll-x{overflow:auto;max-width:100%}
@container dsh-workbench (max-width:1000px){.w-editor-grid{grid-template-columns:160px minmax(0,1fr)}.w-editor-inspector{grid-column:1/-1;border-inline-start:0;border-top:1px solid var(--w-border)}.w-header-actions{max-width:60%}.w-split{grid-template-columns:minmax(240px,32%) minmax(0,1fr)}}
@container dsh-workbench (max-width:760px){.w-page-header{gap:14px;flex-wrap:wrap;padding-bottom:18px}.w-heading{flex:1;min-width:170px}.dshw h1{font-size:24px}.w-header-actions{max-width:100%;justify-content:flex-start}.w-subtitle{font-size:13px}.w-tabs{gap:12px}.dshw .w-tabs>button{padding:10px 4px 12px}.w-split{display:block;min-height:360px}.w-split[data-selected=false]>.w-detail{display:none}.w-split[data-selected=true]>.w-master{display:none}.w-master{border-inline-end:0}.w-detail{padding:20px 0}.w-back{display:inline-flex!important;align-self:flex-start;margin:0 0 16px!important}.w-detail h2{font-size:22px}.w-master-toolbar{padding:16px 0}.dshw .w-row-button{padding:16px 10px}.w-detail-footer{position:static}.w-detail-footer .w-muted{flex-basis:100%}.w-editor-grid{display:flex;flex-direction:column}.w-editor-list{border-inline-end:0;border-bottom:1px solid var(--w-border);padding:16px 0}.w-editor-canvas{padding:16px 0;background:var(--w-bg)}.w-editor-inspector{padding:20px 0}.w-dialog-header,.w-dialog-body{padding:16px}.w-button{min-height:40px}.w-definition{grid-template-columns:80px minmax(0,1fr)}}
@media(max-width:700px){.w-page[data-main=true]{padding:calc(16px + var(--dsh-frame-top-clearance,0px)) 16px 0 max(16px,var(--dsh-frame-leading-clearance,0px))}.w-overlay{padding:8px}.w-dialog{width:100%}}
@media(prefers-reduced-motion:reduce){.dshw *,.dshw *:before{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
  return { Icon, Button, IconButton, Page, Tabs, Status, Empty, Split, Row, Search, Switch, Dialog, register, styles };
}

// Editable browser entry. Build with node scripts/build-client.mjs.
// Browser source, distributed directly. tsc deliberately does not rewrite this file.
window.__ModuleLoader__.load(__stardustUpdatesWrap({ id: 'dsh-ppt', factory: require => {
        const React = require('react');
        const W = createWorkbenchUI(React);
function pptText(zh, en) { return languageOf() === 'en' ? en : zh; }

function PptPages({ project, selected, busy, imagePending, onChoose, onDuplicate, dirty, dataDirty }) {
  return h('aside', { className: 'ppt-page-rail', 'aria-label': pptText('幻灯片目录', 'Slide outline') },
    h('h3', null, pptText('幻灯片', 'Slides')),
    h('div', { className: 'ppt-page-buttons' }, project.slides.map((row, index) => h('button', {
      type: 'button', key: row.id, 'aria-current': row.id === selected ? 'true' : undefined, disabled: busy || imagePending, onClick: () => onChoose(row),
    }, h('span', { className: 'ppt-page-number' }, String(index + 1).padStart(2, '0')), h('span', null, row.title || t('未命名页'))))),
    h(W.Button, { icon: 'copy', className: 'ppt-duplicate', disabled: busy || dirty || imagePending || dataDirty || project.slides.length >= 120, onClick: onDuplicate }, t('复制本页')));
}

const PPT_WORKBENCH_CSS = `
.ppt-workbench.pptw{--fg:var(--w-text);--fg-muted:var(--w-muted);--bg:var(--w-bg);--bg-surface:var(--w-bg);--border:var(--w-border);max-width:none;margin:0;padding:0}.ppt-workbench.pptw[data-main=true]{padding:calc(24px + var(--dsh-frame-top-clearance,0px)) 28px 0 max(28px,var(--dsh-frame-leading-clearance,0px))}.ppt-workbench .ppt-editor{--ppt-inspector:320px;display:grid;grid-template-columns:190px minmax(0,1fr) var(--ppt-inspector);flex:1;min-height:520px}.ppt-workbench .ppt-editor[data-view=visual],.ppt-workbench .ppt-editor[data-view=rehearsal],.ppt-workbench .ppt-editor[data-view=data]{--ppt-inspector:400px}.ppt-workbench .ppt-page-rail{padding:24px 14px 24px 0;border-inline-end:1px solid var(--w-border);min-width:0;display:flex;flex-direction:column;gap:18px}.ppt-workbench .ppt-page-rail h3{margin:0;font-size:16px}.ppt-workbench .ppt-page-buttons{display:flex;flex-direction:column;gap:4px;max-height:calc(100dvh - 340px);overflow:auto;min-width:0}.ppt-workbench .ppt-page-buttons>button{border:0;border-inline-start:3px solid transparent;border-radius:6px;padding:12px 8px;display:flex;align-items:flex-start;gap:10px;background:transparent;min-width:0;font-size:13px;line-height:1.6;text-align:start;overflow-wrap:anywhere}.ppt-workbench .ppt-page-buttons>button[aria-current=true]{border-inline-start-color:var(--w-accent);background:var(--w-selected);color:var(--w-text)}.ppt-workbench .ppt-page-number{font-variant-numeric:tabular-nums;color:var(--w-muted);font-size:12px;flex-shrink:0}.ppt-workbench .ppt-duplicate{margin-top:auto;font-size:13px}.ppt-workbench .ppt-canvas-region{display:flex;flex-direction:column;gap:14px;padding:24px;background:var(--w-soft);min-width:0}.ppt-workbench .ppt-preview-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.ppt-workbench .ppt-preview-tools .w-button{font-size:12px;min-height:32px;padding:7px 9px}.ppt-workbench .ppt-preview-tools [aria-pressed=true]{background:var(--w-bg);border-color:var(--w-accent);color:var(--w-accent)}.ppt-workbench .ppt-preview-tools .w-icon-button{margin-inline-start:auto}.ppt-workbench .preview{width:100%;aspect-ratio:16/9;border:1px solid var(--w-border);border-radius:4px;background:var(--w-bg);box-shadow:0 6px 20px #0001;overflow:hidden;min-height:0;margin:auto 0}.ppt-workbench .preview{position:relative}.ppt-workbench .preview>.ppt-fullscreen-exit{display:none}.ppt-workbench .preview:fullscreen>.ppt-fullscreen-exit{display:inline-flex;position:absolute;inset:16px 16px auto auto;z-index:10;background:#14171c;color:#fff;border:1px solid #ffffff66}.ppt-workbench .preview:fullscreen{width:100vw;height:100vh;aspect-ratio:auto;border:0;border-radius:0;margin:0;background:#14171c;box-shadow:none}.ppt-workbench .preview:fullscreen iframe{background:#14171c}.ppt-workbench .preview .render-page{width:100%;height:100%;object-fit:contain}.ppt-workbench .ppt-preview-help{font-size:12px;color:var(--w-muted);line-height:1.7}.ppt-workbench .ppt-preview-help+details{background:transparent;border:0;border-top:1px solid var(--w-border);border-radius:0;padding:14px 0}.ppt-workbench .ppt-preview-help+details summary{font-size:12px}.ppt-workbench .ppt-inspector{padding:24px 0 24px 22px;border-inline-start:1px solid var(--w-border);min-width:0;overflow-wrap:anywhere}.ppt-workbench .ppt-inspector-panel[hidden]{display:none!important}.ppt-workbench .ppt-inspector .card{border:0;border-bottom:1px solid var(--w-border);border-radius:0;padding:0 0 20px;margin:0 0 20px;background:transparent;box-shadow:none}.ppt-workbench .ppt-inspector h3{font-size:17px;margin:0 0 18px}.ppt-workbench .ppt-inspector .card>div>label,.ppt-workbench .ppt-inspector .card>label{font-size:13px;margin:16px 0 6px;color:var(--w-muted)}.ppt-workbench .ppt-inspector input,.ppt-workbench .ppt-inspector textarea,.ppt-workbench .ppt-inspector select{font-size:14px}.ppt-workbench .ppt-inspector textarea{min-height:72px}.ppt-workbench .ppt-inspector .tools{gap:8px;margin-top:18px}.ppt-workbench .ppt-inspector .tools button{font-size:13px;min-height:34px;padding:7px 9px}.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:1fr}.ppt-workbench .ppt-inspector .before-after,.ppt-workbench .ppt-inspector .data-before-after{grid-template-columns:1fr}.ppt-workbench .ppt-inspector .coaching{margin-top:0}.ppt-workbench .ppt-inspector .coaching p,.ppt-workbench .ppt-inspector .data-workbench p{font-size:13px;line-height:1.7}.ppt-workbench .ppt-inspector .coaching blockquote{margin:12px 0;padding-inline-start:12px}.ppt-workbench .ppt-inspector .muted{font-size:12px;color:var(--w-muted)}.ppt-workbench .ppt-inspector .data-workbench .data-controls{grid-template-columns:1fr}.ppt-workbench .ppt-structure{border-top:1px solid var(--w-border);padding-top:16px;margin-top:16px}.ppt-workbench .ppt-structure .w-button{font-size:12px}.ppt-workbench.pptw button.primary{background:var(--w-primary);color:var(--w-on-primary);border-color:var(--w-primary)}.ppt-workbench .ppt-library{max-width:1000px;padding:12px 0 24px}.ppt-workbench .ppt-library .w-row-button{padding:20px 16px;border:0;border-radius:0;background:transparent}.ppt-workbench .notice{border:1px solid var(--w-border);border-radius:8px;background:var(--w-soft);color:var(--w-text)}.ppt-workbench .notice.error{color:var(--dsw-alias-state-error-primary,#ad3636)}.ppt-workbench .ppt-data-warning{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ppt-workbench .ppt-downloads{display:flex;flex-direction:column;gap:16px}.ppt-workbench .ppt-downloads .tools{display:flex;flex-direction:column;align-items:stretch}.ppt-workbench .ppt-downloads button{font-size:14px;min-height:38px}.ppt-workbench .ppt-image-section{border-block:1px solid var(--w-border);margin:20px 0;padding:16px 0}.ppt-workbench .ppt-image-section>summary{font-size:14px}.ppt-workbench .ppt-image-section input,.ppt-workbench .ppt-image-section select{width:100%;margin-bottom:14px}.ppt-workbench .ppt-image-section input[type=file]{font-size:12px}.ppt-workbench :focus-visible{outline:2px solid var(--w-accent);outline-offset:3px}.ppt-workbench .w-dialog{max-width:700px}.ppt-workbench .ppt-inspector .image-preview{max-height:180px;object-fit:contain;background:var(--w-soft)}
@container dsh-workbench (max-width:1100px){.ppt-workbench .ppt-editor{grid-template-columns:160px minmax(0,1fr)}.ppt-workbench .ppt-inspector{grid-column:1/-1;border-inline-start:0;border-top:1px solid var(--w-border);padding:24px 0}.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ppt-workbench .ppt-canvas-region{padding-inline-end:0}.ppt-workbench .ppt-page-buttons{max-height:400px}}
@container dsh-workbench (max-width:760px){.ppt-workbench .ppt-editor{display:flex;flex-direction:column;min-height:0}.ppt-workbench .ppt-page-rail{border-inline-end:0;border-bottom:1px solid var(--w-border);padding:16px 0}.ppt-workbench .ppt-page-buttons{display:flex;flex-direction:row;max-height:150px;overflow:auto;gap:8px}.ppt-workbench .ppt-page-buttons>button{min-width:150px;max-width:200px;flex-shrink:0}.ppt-workbench .ppt-duplicate{align-self:flex-start}.ppt-workbench .ppt-canvas-region{padding:18px 0;background:var(--w-bg)}.ppt-workbench .preview{margin:0;min-height:0}.ppt-workbench .ppt-preview-tools .w-icon-button{margin-inline-start:0}.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:1fr}.ppt-workbench .ppt-preview-tools .w-button{font-size:12px}.ppt-workbench .ppt-inspector{padding:20px 0}}
@media(max-width:700px){.ppt-workbench.pptw[data-main=true]{padding:calc(16px + var(--dsh-frame-top-clearance,0px)) 16px 0 max(16px,var(--dsh-frame-leading-clearance,0px))}}
`;

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
            try {
                return String(locale?.getSnapshot?.().active || '').startsWith('en') ? 'en' : 'zh';
            }
            catch {
                return 'zh';
            }
        }
        function t(zh) { return languageOf() === 'en' ? (EN[zh] ?? zh) : zh; }
        function englishError(message, status) {
            if (status === 401)
                return 'Your session has expired. Reopen DSH and try again.';
            if (status === 404)
                return 'The presentation workbench is unavailable. Check that the plugin is loaded and restart DSH.';
            if (status === 409)
                return 'The project changed. Load the latest version and review your edits before saving.';
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
            try {
                value = await response.json();
            }
            catch {
                throw new Error(t("无法读取服务响应，请检查插件是否加载"));
            }
            if (!response.ok || value.ok === false) {
                const localized = languageOf() === 'en' ? value.messageEn || englishError(value.message, response.status) : value.message;
                const hint = languageOf() === 'en' ? value.installationHintEn : value.installationHint;
                const error = new Error((localized || t("操作未完成")) + (hint ? '\n' + hint : ''));
                error.status = response.status;
                throw error;
            }
            return value;
        }
        function draftFor(slide) {
            const source = { ...slide, ...slide.dataTemplate };
            return { title: source.title || '', subtitle: source.subtitle || '', kicker: source.kicker || '', text: source.text || '',
                bullets: (source.bullets || []).join('\n'), notes: source.notes || '' };
        }
        function editorHtml(html, nonce) {
            const bridge = `<style>#hud,#delivery-bar,#review-panel,#progress,#notes-panel,#help-panel,#toast,#blank{display:none!important}.slide-frame{pointer-events:none!important}.slide-frame .slide{pointer-events:auto!important}</style><script>(function(){const nonce=${JSON.stringify(nonce)};
      function tell(field){parent.postMessage({type:'dsh-ppt-select',nonce:nonce,field:field},'*')}
      document.addEventListener('keydown',function(e){
        if(e.target.closest('#data-panel'))return;
        var mod=e.ctrlKey||e.metaKey;
        if(mod&&(e.key==='s'||e.key==='S')){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'dsh-ppt-shortcut',nonce:nonce,key:'save'},'*');return}
        if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'dsh-ppt-shortcut',nonce:nonce,key:'escape'},'*');return}
        if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'dsh-ppt-shortcut',nonce:nonce,key:e.key==='ArrowLeft'?'prev':'next'},'*');return}
        e.stopImmediatePropagation();if(e.key!=='Tab')e.preventDefault()
      },true);
      document.addEventListener('touchstart',function(e){e.stopImmediatePropagation()},true);
      document.addEventListener('touchend',function(e){e.stopImmediatePropagation()},true);
      document.addEventListener('wheel',function(e){e.stopImmediatePropagation()},{capture:true,passive:true});
      document.addEventListener('click',function(e){if(e.target.closest('#data-panel,.data-number,.data-chart-trace'))return;const n=e.target.closest('h1,h2,.subtitle,.kicker,.statement-title,.quote-text,.quote-attr,li');if(!n)return;
        e.preventDefault();e.stopImmediatePropagation();let field=n.matches('li')?'bullets':n.matches('.subtitle,.quote-attr')?'subtitle':n.matches('.kicker')?'kicker':'title';tell(field)},true);
      window.addEventListener('message',function(e){if(e.source!==parent||e.data?.nonce!==nonce)return;if(e.data.type==='dsh-ppt-jump')window.__dshPpt?.jump(e.data.page);if(e.data.type==='dsh-ppt-data-set'&&window.__dshData){window.__dshData.setParameters(e.data.parameters);const state=window.__dshData.getState();parent.postMessage({type:'dsh-ppt-data',nonce,parameters:e.data.parameters,valid:state.valid,command:e.data.command},'*')}});
      if(window.__dshData)window.__dshData.onChange=function(parameters,dirty,valid){parent.postMessage({type:'dsh-ppt-data',nonce,parameters,dirty,valid},'*')};
    })();<\/script>`;
            const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:; connect-src 'none'; form-action 'none'">`;
            // Presenter code contains a quoted </body>; only append at the document end.
            return html.replace(/<head>/i, '<head>' + policy).replace(/<\/body>(\s*<\/html>\s*)$/i, bridge + '</body>$1');
        }
        function createImageLoader() {
            let current = null;
            function cancel() {
                const reader = current;
                current = null;
                if (reader?.readyState === 1)
                    reader.abort();
            }
            return {
                cancel,
                get pending() { return current !== null; },
                read(file, success, failure) {
                    cancel();
                    const reader = new FileReader();
                    current = reader;
                    const settle = callback => { if (current !== reader)
                        return; current = null; callback(); };
                    reader.onload = () => settle(() => success(String(reader.result)));
                    reader.onerror = () => settle(failure);
                    reader.onabort = () => { if (current === reader)
                        current = null; };
                    try {
                        reader.readAsDataURL(file);
                    }
                    catch {
                        settle(failure);
                    }
                },
            };
        }
        function modelRouteKey(model) { return JSON.stringify([model.provider, model.model]); }
        function findModelRoute(models, key) { return key ? models.find(model => modelRouteKey(model) === key) : undefined; }
        function reconcileModelRoute(models, selected, preferred) {
            if (selected)
                return findModelRoute(models, selected) ? selected : '';
            const key = preferred ? modelRouteKey(preferred) : '';
            return findModelRoute(models, key) ? key : '';
        }
        function CoachingPanel({ project, selected, blocked, onAdopt, onChoose }) {
const fieldId=React.useId();
            const L = (zh, en) => languageOf() === 'en' ? en : zh;
            const [mode, setMode] = useState(''), [routes, setRoutes] = useState([]), [route, setRoute] = useState('');
            const [difficulty, setDifficulty] = useState('normal'), [audience, setAudience] = useState('general'), [limit, setLimit] = useState(1);
            const [scope, setScope] = useState('all'), [material, setMaterial] = useState(''), [run, setRun] = useState(null), [history, setHistory] = useState([]);
            const [answer, setAnswer] = useState(''), [patches, setPatches] = useState([]), [backups, setBackups] = useState([]);
            const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
            const active = useRef(null), alive = useRef(true), current = useRef(null), runRef = useRef(null), reading = useRef(0), routeInitialized = useRef(false);
            current.current = { project, selected, blocked };
            runRef.current = run;
            const stale = !!run && (run.stale || run.revision !== project.revision);
            const maxCalls = mode === 'review' ? limit : limit + 1;
            const modeName = value => value === 'review' ? L('AI 预审', 'AI review') : L('模拟答辩', 'Rehearsal');
            const statusName = value => ({ ready: L('等待下一步', 'Ready'), busy: L('正在调用模型', 'Calling model'), paused: L('已暂停', 'Paused'), complete: L('已结束', 'Finished') })[value] || value;
            const kindName = value => ({ expression: L('表达建议', 'Expression'), logic: L('逻辑问题', 'Logic'), evidence: L('证据缺口', 'Missing evidence') })[value];
            function accept(value) { if (alive.current) {
                runRef.current = value;
                setRun(value);
            } }
            const request = (operation, data = {}, signal) => action({ operation: 'coach-' + operation, id: current.current.project.id, expectedRevision: current.current.project.revision, ...data }, signal);
            async function refresh(signal) { const value = await request('list', {}, signal); if (alive.current)
                setHistory(value.runs); }
            useEffect(() => {
                alive.current = true;
                return () => {
                    alive.current = false;
                    reading.current++;
                    if (active.current) {
                        active.current.abort();
                        const item = runRef.current;
                        if (item)
                            void request('stop', { runId: item.id }).catch(() => { });
                    }
                };
            }, []);
            useEffect(() => {
                if (!run || run.status !== 'busy' || busy)
                    return;
                const controller = new AbortController();
                const timer = setInterval(() => { void request('get', { runId: run.id }, controller.signal).then(value => { if (!controller.signal.aborted)
                    accept(value.run); }).catch(() => { }); }, 750);
                return () => { clearInterval(timer); controller.abort(); };
            }, [run?.id, run?.status, busy]);
            async function task(work) {
                if (active.current)
                    return;
                const controller = new AbortController();
                active.current = controller;
                setBusy(true);
                setError('');
                setNotice('');
                try {
                    await work(controller.signal);
                }
                catch (e) {
                    if (!alive.current)
                        return;
                    if (!controller.signal.aborted)
                        setError(e.message || L('操作失败', 'Operation failed'));
                    const item = runRef.current;
                    if (item) {
                        try {
                            accept((await request('get', { runId: item.id })).run);
                        }
                        catch { /* Keep visible results. */ }
                    }
                }
                finally {
                    if (active.current === controller)
                        active.current = null;
                    if (alive.current)
                        setBusy(false);
                }
            }
            function configure(value) {
                if (active.current || !canLeave())
                    return;
                setMode(value);
                setLimit(value === 'review' ? 1 : 3);
                accept(null);
                setPatches([]);
                setBackups([]);
                setAnswer('');
                return task(async (signal) => {
                    const results = await Promise.allSettled([request('options', {}, signal), refresh(signal)]);
                    if (signal.aborted || !alive.current)
                        return;
                    const available = results[0];
                    if (available.status === 'rejected')
                        throw available.reason;
                    const models = available.value.routes;
                    setRoutes(models);
                    const preferred = routeInitialized.current ? undefined : project.modelRoute;
                    routeInitialized.current = true;
                    setRoute(value => reconcileModelRoute(models, value, preferred));
                    if (!models.length)
                        setNotice(L('先在 DSH 的模型设置中配置可用模型，再点“刷新模型”。成品仍可直接下载。', 'Configure a model in DSH, then refresh models. Your finished files remain available.'));
                    if (results[1].status === 'rejected')
                        throw results[1].reason;
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
                    next = (await request('step', { runId: next.id, confirmed: true }, signal)).run;
                    accept(next);
                }
                await refresh(signal);
                if (alive.current && response !== undefined)
                    setAnswer('');
            }
            function start() {
                if (current.current.blocked)
                    return;
                return task(async (signal) => {
                    const model = findModelRoute(routes, route);
                    if (!model)
                        throw new Error(L('请选择模型', 'Choose a model'));
                    reading.current++;
                    const item = (await request('create', { confirmed: true, mode, ...model, difficulty, audience, limit, material,
                        language: languageOf(), ...(scope === 'current' ? { slideId: current.current.selected } : {}) }, signal)).run;
                    accept(item);
                    await advance(item, signal);
                });
            }
            function stop() {
                active.current?.abort();
                if (runRef.current)
                    void request('stop', { runId: runRef.current.id }).then(value => accept(value.run)).catch(e => { if (alive.current)
                        setError(e.message); });
                setNotice(L('已请求停止。已完成的结果保留，本次调用仍可能计费。', 'Stop requested. Completed results are kept; the current call may still be billed.'));
            }
            function finish() { return task(async (signal) => { accept((await request('finish', { runId: run.id }, signal)).run); await refresh(signal); }); }
            function openReport(id) { if (!canLeave())
                return; return task(async (signal) => { const value = (await request('get', { runId: id }, signal)).run; accept(value); setMode(value.mode); setAnswer(value.questions.at(-1)?.answer || ''); setPatches([]); setBackups([]); }); }
            function removeReport() {
                if (!window.confirm(L('删除这次本地演练记录？幻灯片成品不受影响。', 'Delete this local rehearsal record? Presentation files are kept.')))
                    return;
                return task(async (signal) => { await request('delete', { runId: run.id }, signal); accept(null); await refresh(signal); });
            }
            function exportReport() {
                const url = new URL('api/dsh-ppt/download', document.baseURI);
                for (const [key, value] of Object.entries({ id: project.id, kind: 'coaching', revision: project.revision, run: run.id }))
                    url.searchParams.set(key, String(value));
                const link = document.createElement('a');
                link.href = url.href;
                link.download = '';
                link.hidden = true;
                document.body.append(link);
                link.click();
                link.remove();
            }
            function applySelected() {
                if (current.current.blocked || stale)
                    return;
                return task(async (signal) => {
                    const value = await request('apply', { runId: run.id, confirmed: true, selected: patches, backup: backups }, signal);
                    if (alive.current)
                        onAdopt(value.project);
                });
            }
            async function uploadMaterial(event) {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file)
                    return;
                const ticket = ++reading.current;
                if (!/\.(txt|md)$/i.test(file.name) || file.size > 100000) {
                    setError(L('请选择 100 KB 以内的 TXT / Markdown 文件。', 'Choose a TXT / Markdown file up to 100 KB.'));
                    return;
                }
                try {
                    const value = await file.text();
                    if (!alive.current || ticket !== reading.current)
                        return;
                    if (value.length > 20000)
                        throw new Error(L('补充材料最多 20000 字符。', 'Supporting material: up to 20,000 characters.'));
                    setMaterial(value);
                    setError('');
                }
                catch (e) {
                    if (alive.current && ticket === reading.current)
                        setError(e.message);
                }
            }
            function toggle(set, values, id) { set(values.includes(id) ? values.filter(v => v !== id) : [...values, id]); }
            function pageButton(id) {
                const index = project.slides.findIndex(s => s.id === id);
                return h('button', { disabled: blocked || index < 0, onClick: () => onChoose(id) }, L('查看第 ' + (index + 1) + ' 页', 'View slide ' + (index + 1)));
            }
            function source(card) { return card.reference ? h('blockquote', null, h('small', { className: 'muted' }, card.reference === 'material' ? L('补充材料中的原文', 'Quote from supporting material') : L('幻灯片中的原文', 'Quote from slides')), h('pre', null, card.quote)) : h('p', { className: 'muted' }, L('未匹配到材料原文，请核对或补充依据。', 'No matching source quote. Verify or add supporting evidence.')); }
            const last = run?.questions.at(-1);
// Update protection: dsh-ppt.coaching
__stardustUpdatesGuard(React, "dsh-ppt.coaching", { dirty: !!last && !last.feedback && !!answer.trim() && answer.trim() !== (last.answer || ''), busy });

            useEffect(() => {
                if (!last || last.feedback || !answer.trim() || answer.trim() === (last.answer || ''))
                    return;
                const warn = event => { event.preventDefault(); event.returnValue = ''; };
                window.addEventListener('beforeunload', warn);
                return () => window.removeEventListener('beforeunload', warn);
            }, [run?.id, last?.id, last?.feedback, last?.answer, answer]);
            return h('section', { className: 'card coaching', 'aria-label': L('可选演练', 'Optional rehearsal'), onKeyDown: e => { if (e.key === 'Escape' || (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.stopPropagation();
                    if (e.key.toLowerCase() === 's')
                        e.preventDefault();
                } } }, h('h3', null, L('想再准备充分一点？', 'Want to prepare further?')), h('p', { className: 'muted' }, L('成品已可下载。以下两项按需开启，不影响直接交付。', 'Your files are ready to download. Both options below are optional.')), h('div', { className: 'tools' }, h('button', { disabled: busy, 'aria-pressed': mode === 'review', onClick: () => configure('review') }, L('AI 预审', 'AI review')), h('button', { disabled: busy, 'aria-pressed': mode === 'practice', onClick: () => configure('practice') }, L('模拟答辩', 'Rehearsal')), mode && h('button', { disabled: busy, onClick: () => { if (canLeave()) {
                    setMode('');
                    accept(null);
                    setAnswer('');
                } } }, L('收起', 'Collapse'))), mode && h(React.Fragment, null, error && h('div', { role: 'alert', className: 'notice error' }, error), notice && h('div', { role: 'status', className: 'notice' }, notice), busy && h('div', { role: 'status', className: 'tools' }, L('正在处理…可以继续预览或下载成品。', 'Working… You can still preview or download your presentation.'), h('button', { onClick: stop }, L('停止', 'Stop'))), !run && h(React.Fragment, null, h('p', null, mode === 'review' ? L('AI 根据材料模拟质疑与回答，最多保留 5 个值得改进的问题。', 'AI simulates questions and answers based on your material, keeping up to five useful findings.') : L('AI 一次问一题，你来回答；可随时结束并整理已完成的问答。', 'AI asks one question at a time. You answer and can finish at any point.')), h('div', { className: 'coaching-grid' }, h('label', null, L('模型', 'Model'), h('select', { 'aria-label': L('演练模型', 'Rehearsal model'), value: route, disabled: busy, onChange: e => setRoute(e.target.value) }, h('option', { value: '' }, routes.length ? L('请选择模型', 'Choose a model') : L('暂无可用模型', 'No configured model')), routes.map(r => h('option', { key: modelRouteKey(r), value: modelRouteKey(r) }, r.label)))), h('label', null, L('听众', 'Audience'), h('select', { 'aria-label': L('听众', 'Audience'), value: audience, disabled: busy, onChange: e => setAudience(e.target.value) }, [['general', L('一般听众', 'General audience')], ['management', L('管理层 / 客户', 'Management / clients')], ['academic', L('答辩评委', 'Academic panel')]].map(([v, label]) => h('option', { key: v, value: v }, label)))), h('label', null, L('提问强度', 'Difficulty'), h('select', { 'aria-label': L('提问强度', 'Difficulty'), value: difficulty, disabled: busy, onChange: e => setDifficulty(e.target.value) }, [['gentle', L('温和', 'Gentle')], ['normal', L('普通', 'Normal')], ['strict', L('严格', 'Strict')]].map(([v, label]) => h('option', { key: v, value: v }, label)))), h('label', null, mode === 'review' ? L('预审轮数', 'Review rounds') : L('答辩题数', 'Questions'), h('select', { 'aria-label': mode === 'review' ? L('预审轮数', 'Review rounds') : L('答辩题数', 'Questions'), value: limit, disabled: busy, onChange: e => setLimit(Number(e.target.value)) }, Array.from({ length: mode === 'review' ? 3 : 5 }, (_, i) => h('option', { key: i, value: i + 1 }, String(i + 1))))), h('label', null, L('检查范围', 'Scope'), h('select', { 'aria-label': L('检查范围', 'Scope'), value: scope, disabled: busy, onChange: e => setScope(e.target.value) }, h('option', { value: 'all' }, L('整个工程', 'Whole presentation')), h('option', { value: 'current' }, L('当前页', 'Current slide'))))), h('label', { htmlFor: fieldId + '-ppt-coach-material' }, L('补充材料（可选）', 'Supporting material (optional)')), h('textarea', { id: fieldId + '-ppt-coach-material', rows: 3, maxLength: 20000, value: material, disabled: busy, onChange: e => { reading.current++; setMaterial(e.target.value); } }), h('label', null, L('或导入 TXT / Markdown', 'Or import TXT / Markdown'), h('input', { type: 'file', accept: '.txt,.md,text/plain,text/markdown', disabled: busy, onChange: uploadMaterial })), h('p', { className: 'muted' }, L('将所选页面的文字、图表数据、备注及补充材料发送给所选 DSH 模型，不发送图片文件。最多 ' + maxCalls + ' 次插件调用；模型服务自身的重试与计费规则仍适用。', 'Sends selected slide text, chart data, notes and supporting material to the chosen DSH model. Image files are excluded. Up to ' + maxCalls + ' plugin calls; provider retry and billing rules still apply.')), h('div', { className: 'tools' }, h('button', { disabled: busy || blocked || !findModelRoute(routes, route), onClick: start }, mode === 'review' ? L('开始 AI 预审', 'Start AI review') : L('开始模拟答辩', 'Start rehearsal')), h('button', { disabled: busy, onClick: () => configure(mode) }, L('刷新模型', 'Refresh models'))), blocked && h('p', { className: 'muted' }, L('请先保存或取消幻灯片修改。', 'Save or cancel slide edits first.'))), run && h(React.Fragment, null, h('h3', null, modeName(run.mode) + ' · ' + statusName(run.status)), h('p', { className: 'muted' }, L('修订 ', 'Revision ') + run.revision + ' · ' + run.route.provider + ' / ' + run.route.model + ' · ' + L('调用 ', 'Calls ') + run.usedCalls + '/' + run.maxCalls), h('p', { className: 'muted' }, L('AI 意见不等于事实核验，也不代表真实听众的评价。请先看原文与改动，再决定是否采纳。', 'AI suggestions are not fact checks or predictions of audience feedback. Compare sources and edits before adopting them.')), stale && h('div', { role: 'alert', className: 'notice' }, L('工程已经修改。旧报告仍可导出，但不能继续调用或采纳；请重新开始。', 'The presentation changed. You can export this report, but cannot continue or apply it. Start a new rehearsal.')), run.error && h('p', { className: 'muted' }, languageOf() === 'en' ? run.error.split(' / ').at(-1) : run.error.split(' / ')[0]), run.findings.map(f => {
                const slide = project.slides.find(s => s.id === f.slideId);
                return h('article', { key: f.id, className: 'card' }, h('strong', null, kindName(f.kind) + ' · ' + f.issue), h('div', { className: 'tools' }, pageButton(f.slideId)), h('p', null, f.question), h('p', null, f.answer), h('p', null, f.suggestion), source(f), f.patch && h(React.Fragment, null, h('details', null, h('summary', null, L('比较原文和建议', 'Compare before and after')), Object.entries(f.patch).map(([key, value]) => h('div', { key }, h('strong', null, t(fields.find(([name]) => name === key)?.[1] || key)), h('div', { className: 'before-after' }, h('div', null, h('small', null, L('原文', 'Before')), h('pre', null, Array.isArray(slide?.[key]) ? slide[key].join('\n') : slide?.[key] || '')), h('div', null, h('small', null, L('建议', 'After')), h('pre', null, Array.isArray(value) ? value.join('\n') : value)))))), h('label', { className: 'choice' }, h('input', { type: 'checkbox', disabled: busy || stale, checked: patches.includes(f.id), onChange: () => toggle(setPatches, patches, f.id) }), L('采纳这项表达修改', 'Adopt this expression edit'))), h('label', { className: 'choice' }, h('input', { type: 'checkbox', disabled: busy || stale, checked: backups.includes(f.id), onChange: () => toggle(setBackups, backups, f.id) }), L('选为备用问答页', 'Add as a backup Q&A slide')));
            }), run.mode === 'review' && run.status === 'complete' && !run.findings.length && h('p', null, L('本次未提出明显问题。仍建议检查事实、字体和最终 PPTX。', 'No findings this time. Still check facts, fonts and the final PPTX.')), run.questions.map((q, i) => h('article', { key: q.id, className: 'card' }, h('strong', null, (i + 1) + '. ' + q.question), h('div', { className: 'tools' }, pageButton(q.slideId)), q.answer && h('p', null, L('你的回答：', 'Your answer: ') + q.answer), q.feedback && h('p', null, q.feedback), q.needsEvidence && h('p', { className: 'muted' }, L('待补充依据', 'Evidence needed')), source(q), q.answer && h('label', { className: 'choice' }, h('input', { type: 'checkbox', disabled: busy || stale, checked: backups.includes(q.id), onChange: () => toggle(setBackups, backups, q.id) }), L('选为备用问答页', 'Add as a backup Q&A slide')))), run.mode === 'practice' && last && !last.feedback && run.status !== 'complete' && !stale && h(React.Fragment, null, h('label', { htmlFor: 'ppt-coach-answer' }, L('你的回答', 'Your answer')), h('textarea', { id: 'ppt-coach-answer', maxLength: 4000, rows: 4, value: answer, disabled: busy, onChange: e => setAnswer(e.target.value) }), h('button', { disabled: busy || blocked || !answer.trim() || run.usedCalls >= run.maxCalls, onClick: () => task(signal => advance(run, signal, answer)) }, L('提交回答，继续', 'Submit answer and continue'))), h('div', { className: 'tools' }, h('button', { disabled: busy, onClick: exportReport }, L('下载问答与材料清单', 'Download Q&A and evidence checklist')), h('button', { disabled: busy || blocked || stale || !(patches.length + backups.length), onClick: applySelected }, L('将所选内容保存为副本', 'Save selected changes as a copy')), run.status !== 'complete' && h('button', { disabled: busy || run.status === 'busy', onClick: finish }, L('结束并整理已有结果', 'Finish with current results')), h('button', { disabled: busy, onClick: () => configure(run.mode) }, L('重新开始', 'Start again')), h('button', { disabled: busy || run.status === 'busy', onClick: removeReport }, L('删除本次记录', 'Delete this record'))), h('p', { className: 'muted' }, L('采纳后会生成新副本，原稿保留；副本中可“撤销上次修改”。备用页包含 AI 演练标记，请核对后再对外展示。', 'Adoption creates a copy and keeps the original. Undo last change also works in the copy. Backup slides identify AI rehearsal content; verify before presenting.'))), history.length > 0 && h('details', null, h('summary', null, L('本机历史记录（', 'Local history (') + history.length + L('）', ')')), h('div', { className: 'project-list' }, history.map(item => h('button', { key: item.id, disabled: busy, onClick: () => openReport(item.id) }, modeName(item.mode) + ' · ' + L('修订 ', 'Revision ') + item.revision + ' · ' + new Date(item.createdAt).toLocaleString(languageOf() === 'en' ? 'en-US' : 'zh-CN')))))));
        }
        const dataCss = `.pptw .data-workbench{margin-top:18px}.pptw .data-workbench details{margin:12px 0}.pptw .data-workbench summary{cursor:pointer;font-weight:600}.pptw .data-workbench pre,.pptw .data-workbench code{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;max-height:220px;overflow:auto}.pptw .data-input-row{margin:15px 0}.pptw .data-input-controls{display:grid;grid-template-columns:minmax(0,1fr) 115px;gap:12px;align-items:center}.pptw .data-input-controls input[type=range]{accent-color:var(--dsw-alias-brand-primary,#2563eb)}.pptw .data-before-after{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.pptw .data-before-after pre{padding:10px;border:1px solid var(--dsw-alias-divider-default,#b8c0cc);border-radius:8px}.pptw .data-copy{display:flex;gap:8px;align-items:center}.pptw .data-copy input{width:auto}@media(max-width:640px){.pptw .data-before-after{grid-template-columns:minmax(0,1fr)}.pptw .data-input-controls{grid-template-columns:minmax(0,1fr) 100px}}`;
        function VisualPanel({ project, selected, blocked, onBusy, onAdopt }) {
            const L = (zh, en) => languageOf() === 'en' ? en : zh;
            const [expanded, setExpanded] = useState(false), [routes, setRoutes] = useState([]), [route, setRoute] = useState('');
            const [scope, setScope] = useState(project.slides.length > 12 ? 'current' : 'all'), [repairs, setRepairs] = useState(1);
            const [run, setRun] = useState(null), [history, setHistory] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
            const [compare, setCompare] = useState(''), [pictures, setPictures] = useState({}), [loading, setLoading] = useState(false);
// Update protection: dsh-ppt.visual
__stardustUpdatesGuard(React, "dsh-ppt.visual", { busy: busy || loading });

            const active = useRef(null), alive = useRef(true), current = useRef(null), runRef = useRef(null), progressVersion = useRef(0), routeInitialized = useRef(false);
            current.current = { project, selected, blocked };
            runRef.current = run;
            const request = (op, data = {}, signal) => action({ operation: 'visual-' + op, id: current.current.project.id, expectedRevision: current.current.project.revision, ...data }, signal);
            const accept = value => { if (alive.current) {
                progressVersion.current++;
                runRef.current = value;
                setRun(value);
            } };
            const phaseName = value => ({ render: L('正在渲染实际 PPTX', 'Rendering the actual PPTX'), inspect: L('正在看图检查', 'Inspecting rendered slides'), repair: L('正在生成排版副本', 'Creating a formatting copy'), done: L('检查已结束', 'Review finished') })[value] || value;
            const failureText = value => { const split = value.lastIndexOf(' / '); return split < 0 ? value : L(value.slice(0, split), value.slice(split + 3)); };
            const actionName = a => ({ 'title-size': L('标题字号', 'Title size'), 'body-size': L('正文字号', 'Body size'), 'chart-label-size': L('图表字号', 'Chart label size'), 'chart-horizontal': L('改为横向条形图', 'Use horizontal bars'), 'image-contain': L('完整显示图片', 'Show the complete image'), 'split-bullets': L('拆分要点页', 'Split bullet slide'), 'split-table': L('拆分表格页', 'Split table slide') })[a.type] + (a.value !== undefined ? ' · ' + a.value : '');
            useEffect(() => { alive.current = true; return () => { alive.current = false; active.current?.abort(); if (runRef.current && active.current)
                void request('stop', { runId: runRef.current.id }).catch(() => { }); }; }, []);
            useEffect(() => { if (!run || ['complete', 'paused'].includes(run.status) || !busy && run.status !== 'busy')
                return; const abort = new AbortController(), timer = setInterval(() => { const version = progressVersion.current; void request('get', { runId: run.id }, abort.signal).then(v => { if (!abort.signal.aborted && version === progressVersion.current)
                accept(v.run); }).catch(() => { }); }, 1000); return () => { clearInterval(timer); abort.abort(); }; }, [run?.id, run?.status, busy]);
            async function refresh(signal) { const value = await request('list', {}, signal); if (alive.current)
                setHistory(value.runs); }
            async function task(work, lock = false) {
                if (active.current)
                    return;
                const controller = new AbortController();
                active.current = controller;
                setBusy(true);
                setError('');
                if (lock)
                    onBusy(true);
                try {
                    await work(controller.signal);
                }
                catch (e) {
                    if (alive.current) {
                        if (!controller.signal.aborted)
                            setError(e.message || L('视觉检查失败', 'Visual review failed'));
                        if (runRef.current)
                            try {
                                accept((await request('get', { runId: runRef.current.id })).run);
                            }
                            catch { /* Keep the last checkpoint. */ }
                    }
                }
                finally {
                    if (active.current === controller)
                        active.current = null;
                    if (alive.current)
                        setBusy(false);
                    if (lock)
                        onBusy(false);
                }
            }
            function configure() {
                setExpanded(true);
                return task(async (signal) => {
                    const results = await Promise.allSettled([request('options', {}, signal), refresh(signal)]);
                    if (results[0].status === 'rejected')
                        throw results[0].reason;
                    if (signal.aborted || !alive.current)
                        return;
                    const models = results[0].value.routes;
                    setRoutes(models);
                    const preferred = routeInitialized.current ? undefined : project.modelRoute;
                    routeInitialized.current = true;
                    setRoute(value => reconcileModelRoute(models, value, preferred));
                    if (results[1].status === 'rejected')
                        throw results[1].reason;
                });
            }
            function start() {
                if (current.current.blocked)
                    return;
                return task(async (signal) => {
                    const model = findModelRoute(routes, route);
                    if (!model)
                        throw new Error(L('请选择支持图片输入的模型', 'Choose an image-capable model'));
                    let value = (await request('create', { confirmed: true, ...model, repairs, language: languageOf(), ...(scope === 'current' ? { slideId: current.current.selected } : {}) }, signal)).run;
                    accept(value);
                    setPictures({});
                    setCompare('');
                    while (value.status === 'ready' && !signal.aborted) {
                        value = (await request('step', { runId: value.id, confirmed: true }, signal)).run;
                        accept(value);
                    }
                    await refresh(signal);
                    const last = value.rounds.at(-1);
                    if (alive.current && last?.rendered)
                        setCompare(last.ids[0]);
                }, true);
            }
            function stop() { active.current?.abort(); if (runRef.current)
                void request('stop', { runId: runRef.current.id }).then(value => accept(value.run)).catch(e => { if (alive.current)
                    setError(e.message); }); }
            function open(id) { return task(async (signal) => { const value = (await request('get', { runId: id }, signal)).run; accept(value); setCompare(value.rounds.at(-1)?.rendered ? value.rounds.at(-1).ids[0] : ''); }); }
            function adopt() { if (blocked || !run?.canAdopt)
                return; return task(async (signal) => { const value = await request('adopt', { runId: run.id, confirmed: true }, signal); if (alive.current)
                onAdopt(value.project); }, true); }
            function remove() { if (!window.confirm(L('删除这次检查记录和预览图片？生成的 PPT 副本会保留。', 'Delete this review and its preview images? Presentation copies are kept.')))
                return; return task(async (signal) => { await request('delete', { runId: run.id }, signal); accept(null); setPictures({}); setCompare(''); await refresh(signal); }); }
            function download() { const url = new URL('api/dsh-ppt/download', document.baseURI); for (const [k, v] of Object.entries({ id: project.id, kind: 'visual', revision: project.revision, run: run.id }))
                url.searchParams.set(k, String(v)); const a = document.createElement('a'); a.href = url.href; a.download = ''; document.body.append(a); a.click(); a.remove(); }
            useEffect(() => {
                if (!compare || !run)
                    return;
                const abort = new AbortController(), last = run.rounds.length - 1;
                setPictures({});
                setLoading(true);
                const initial = run.rounds[0].ids.includes(compare);
                Promise.allSettled([initial ? request('page', { runId: run.id, round: 0, slideId: compare }, abort.signal) : Promise.resolve(null), request('page', { runId: run.id, round: last, slideId: compare }, abort.signal)]).then(values => {
                    if (abort.signal.aborted || !alive.current)
                        return;
                    setPictures({ before: values[0].status === 'fulfilled' ? values[0].value?.data : null, after: values[1].status === 'fulfilled' ? values[1].value?.data : null });
                    const failed = values.find(v => v.status === 'rejected');
                    if (failed)
                        setError(failed.reason.message);
                    setLoading(false);
                });
                return () => abort.abort();
            }, [run?.id, run?.rounds.length, compare]);
            useEffect(() => { const last = run?.rounds.at(-1); if (!busy && !compare && last?.rendered)
                setCompare(last.ids[0]); }, [run?.id, run?.rounds.length, run?.rounds.at(-1)?.rendered, busy, compare]);
            const first = run?.rounds[0], last = run?.rounds.at(-1), stale = run && (run.stale || run.revision !== project.revision), count = scope === 'all' ? project.slides.length : 1;
            const callCap = Array.from({ length: repairs + 1 }, (_, i) => Math.ceil(count * 2 ** i / 2)).reduce((a, b) => a + b, 0);
            function image(src, round, label) { return h('figure', { style: { margin: 0, minWidth: 0 } }, h('figcaption', null, label), src ? h('div', { style: { position: 'relative', lineHeight: 0 } }, h('img', { src, alt: label, style: { width: '100%', height: 'auto', display: 'block' } }), (round?.findings || []).filter(f => f.slideId === compare).map((f, i) => h('span', { key: i, title: f.issue, style: { position: 'absolute', pointerEvents: 'none', border: '2px solid #f97316', boxSizing: 'border-box', left: f.box[0] * 100 + '%', top: f.box[1] * 100 + '%', width: f.box[2] * 100 + '%', height: f.box[3] * 100 + '%' } }))) : h('p', { className: 'muted' }, round === first && !first.ids.includes(compare) ? L('此页由拆分生成，没有对应的原页画面。', 'This page was created by a split and has no original counterpart.') : L('画面尚未载入，请重新选择页面。', 'Image not loaded; select the slide again.'))); }
            return h('section', { className: 'card coaching', 'aria-label': L('视觉检查与修复', 'Visual review and repair') }, h('h3', null, L('让 AI 看完成品，再修排版', 'Let AI inspect the finished slides and repair formatting')), h('p', { className: 'muted' }, L('可选功能。检查实际 PPTX 画面，另存修复副本，再渲染复查。原稿保留。', 'Optional. Inspect actual PPTX images, save a repaired copy, and render it again for rechecking. The original is kept.')), !expanded ? h('button', { disabled: busy || blocked, onClick: configure }, L('视觉检查与修复', 'Visual review and repair')) : h(React.Fragment, null, error && h('div', { role: 'alert', className: 'notice error' }, error), !run && h(React.Fragment, null, h('div', { className: 'coaching-grid' }, h('label', null, L('视觉模型', 'Vision model'), h('select', { 'aria-label': L('视觉模型', 'Vision model'), value: route, disabled: busy, onChange: e => setRoute(e.target.value) }, h('option', { value: '' }, L('请选择', 'Choose a model')), routes.map(m => h('option', { key: modelRouteKey(m), value: modelRouteKey(m) }, m.label)))), h('label', null, L('检查范围', 'Review scope'), h('select', { 'aria-label': L('视觉检查范围', 'Visual review scope'), value: scope, disabled: busy, onChange: e => setScope(e.target.value) }, h('option', { value: 'all', disabled: project.slides.length > 12 }, L('全部页面（最多 12 页）', 'All slides (up to 12)')), h('option', { value: 'current' }, L('当前页', 'Current slide')))), h('label', null, L('自动修复上限', 'Repair limit'), h('select', { 'aria-label': L('自动修复上限', 'Repair limit'), value: repairs, disabled: busy, onChange: e => setRepairs(Number(e.target.value)) }, h('option', { value: 0 }, L('仅看图检查', 'Inspect only')), h('option', { value: 1 }, L('最多修复 1 轮（推荐）', 'Up to 1 repair round (recommended)')), h('option', { value: 2 }, L('最多修复 2 轮', 'Up to 2 repair rounds'))))), !routes.length && h('p', { className: 'notice' }, L('未找到声明支持图片输入的模型。请在 DSH 模型设置中检查图片输入配置；普通生成和下载仍可使用。', 'No model declares image input. Check the image-input configuration in DSH model settings; normal creation and downloads remain available.')), h('p', null, L('会向所选模型发送 ' + count + ' 页的渲染图片和页面文字；拆页后会重新检查新增页面，最多 ' + callCap + ' 次模型调用。', 'Sends rendered images and text from ' + count + ' slides to the selected model. New split pages are rechecked, with up to ' + callCap + ' model calls.')), h('p', { className: 'muted' }, L('只调整字号、拆页、图表方向和图片裁切，不改写原文、数字或公式。可随时停止；服务商仍可能收取已发起调用的费用。', 'Changes font sizes, pagination, chart orientation and image cropping. Original text, numbers and formulas are preserved. You can stop at any time; calls already sent may still be billed.')), h('div', { className: 'tools' }, h('button', { className: 'primary', disabled: busy || blocked || !findModelRoute(routes, route) || count > 12, onClick: start }, L('开始看图检查', 'Start visual review')), h('button', { disabled: busy, onClick: configure }, L('刷新视觉模型', 'Refresh vision models')))), run && h(React.Fragment, null, h('p', { role: 'status' }, (run.status === 'paused' ? L('检查已停止', 'Review stopped') : run.status === 'ready' && !busy ? L('等待检查', 'Review ready') : phaseName(run.phase)) + ' · ' + L('已调用 ', 'Calls ') + run.usedCalls + '/' + run.maxCalls + ' · ' + L('本轮已检查 ', 'Slides checked this pass ') + (last?.cursor || 0) + '/' + (last?.ids.length || 0)), busy && h('button', { onClick: stop }, L('停止视觉检查', 'Stop visual review')), run.error && h('p', { role: 'alert', className: 'notice error' }, failureText(run.error)), stale && h('p', { className: 'notice' }, L('工程或成品已变化，旧记录可查看，但不能继续或采纳。', 'The project or output changed. This old record is readable, but cannot be continued or adopted.')), run.status === 'complete' && h('p', { className: 'notice' }, last.findings.length ? L('复查仍有 ' + last.findings.length + ' 个问题，请查看标记和说明。', 'Recheck still found ' + last.findings.length + ' issues. Review the highlighted regions and notes.') : L('AI 在本次范围内未发现明显视觉问题；这是一份模型检查记录。', 'AI found no obvious visual issues in this scope. This is a model review record.')), (last?.missingFonts || []).length > 0 && h('p', { className: 'notice error' }, L('渲染引擎报告缺失字体：', 'Renderer reported missing fonts: ') + last.missingFonts.join(', ')), run.rounds.map((r, i) => h('details', { key: i, open: i === run.rounds.length - 1 }, h('summary', null, L('检查轮次 ', 'Inspection pass ') + i + ' · ' + r.cursor + '/' + r.ids.length), r.findings.map((f, j) => h('p', { key: j }, h('strong', null, (project.slides.findIndex(s => s.id === f.slideId) >= 0 ? L('原第 ' + (project.slides.findIndex(s => s.id === f.slideId) + 1) + ' 页', 'Original slide ' + (project.slides.findIndex(s => s.id === f.slideId) + 1)) : L('拆分页', 'Split page')) + ' · '), f.issue, h('br'), h('small', { className: 'muted' }, f.action ? actionName(f.action) : L('需要人工判断', 'Needs manual review')))), r.applied.length > 0 && h('ul', null, r.applied.map((a, j) => h('li', { key: j }, L('已应用：', 'Applied: ') + actionName(a)))))), !busy && last?.rendered && h(React.Fragment, null, h('label', null, L('查看前后画面（橙框为 AI 定位区域）', 'Compare images (orange boxes mark AI findings)'), h('select', { 'aria-label': L('对比页面', 'Comparison slide'), value: compare, onChange: e => setCompare(e.target.value) }, last.ids.map((id, i) => h('option', { value: id, key: id }, String(i + 1) + '. ' + (project.slides.find(s => s.id === id)?.title || L('拆分页', 'Split page')))))), loading ? h('p', { role: 'status' }, L('正在载入画面…', 'Loading images…')) : h('div', { className: 'before-after' }, image(pictures.before, first, L('原稿 · 实际 PPTX', 'Original · actual PPTX')), image(pictures.after, last, run.rounds.length > 1 ? L('修复后 · 实际 PPTX', 'Repaired · actual PPTX') : L('本次检查画面', 'Reviewed image')))), h('div', { className: 'tools' }, h('button', { className: 'primary', disabled: busy || blocked || !run.canAdopt || stale, onClick: adopt }, last?.findings.length ? L('打开修复副本（仍有待处理问题）', 'Open repaired copy (issues remain)') : L('采用修复副本', 'Use repaired copy')), h('button', { disabled: busy, onClick: download }, L('下载视觉检查记录', 'Download visual review')), h('button', { disabled: busy || run.status === 'busy', onClick: remove }, L('删除检查记录', 'Delete review')), h('button', { disabled: busy, onClick: () => { accept(null); setCompare(''); setPictures({}); configure(); } }, L('新建视觉检查', 'New visual review')))), !busy && history.length > 0 && h('details', null, h('summary', null, L('本机视觉检查历史', 'Local visual review history')), h('div', { className: 'project-list' }, history.map(item => h('button', { key: item.id, onClick: () => open(item.id) }, L('修订 ', 'Revision ') + item.revision + ' · ' + new Date(item.createdAt).toLocaleString(languageOf() === 'en' ? 'en-US' : 'zh-CN'))))), h('button', { disabled: busy, onClick: () => setExpanded(false) }, L('收起视觉检查', 'Collapse visual review'))));
        }
        function DataPanel({ project, blocked, incoming, onParameters, onDirty, onBusy, onAdopt, onChoose, onDownload }) {
const fieldId=React.useId();
            const L = (zh, en) => languageOf() === 'en' ? en : zh, model = project.dataModel;
            const baseline = Object.fromEntries(model.metrics.filter(m => m.kind === 'input').map(m => [m.id, String(m.value)]));
            const [parameters, setParameters] = useState(baseline), [updates, setUpdates] = useState({}), [sourceId, setSourceId] = useState(model.sources[0]?.id || '');
            const [metricId, setMetricId] = useState(model.metrics[0]?.id || ''), [preview, setPreview] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [valid, setValid] = useState(true), [saveAs, setSaveAs] = useState(true), [readingFile, setReadingFile] = useState(false);
// Update protection: dsh-ppt.data
__stardustUpdatesGuard(React, "dsh-ppt.data", { busy: busy || readingFile });

            const pending = useRef(null), alive = useRef(true), reading = useRef(0), latest = useRef(''), guard = useRef(false);
            const numeric = Object.fromEntries(Object.entries(parameters).map(([id, value]) => [id, value.trim() === '' ? null : Number(value)]));
            const inputsValid = model.metrics.filter(m => m.kind === 'input').every(m => typeof numeric[m.id] === 'number' && Number.isFinite(numeric[m.id]) && numeric[m.id] >= m.min && numeric[m.id] <= m.max && Math.abs((numeric[m.id] - m.min) / m.step - Math.round((numeric[m.id] - m.min) / m.step)) <= 1e-6);
            const body = { parameters: numeric, sourceUpdates: Object.values(updates) }, signature = JSON.stringify(body);
            latest.current = signature;
            const changed = readingFile || !valid || Object.entries(baseline).some(([id, value]) => Number(parameters[id]) !== Number(value) || parameters[id].trim() === '') || Object.keys(updates).length > 0;
            useEffect(() => { onDirty(changed); return () => onDirty(false); }, [changed]);
            useEffect(() => { setPreview(null); }, [signature]);
            useEffect(() => { if (incoming) {
                setParameters(Object.fromEntries(Object.entries(incoming.parameters).map(([id, value]) => [id, Number.isFinite(value) ? String(value) : ''])));
                setValid(incoming.valid !== false);
            } }, [incoming]);
            useEffect(() => { alive.current = true; return () => { alive.current = false; reading.current++; pending.current?.abort(); onBusy(false); }; }, []);
            function changeParameter(id, value) { const next = { ...parameters, [id]: value }; setParameters(next); setValid(true); setPreview(null); setError(''); onParameters(Object.fromEntries(Object.entries(next).map(([key, raw]) => [key, raw.trim() === '' ? NaN : Number(raw)]))); }
            function reset() { reading.current++; setParameters(baseline); setUpdates({}); setPreview(null); setError(''); setValid(true); onParameters(Object.fromEntries(Object.entries(baseline).map(([id, value]) => [id, Number(value)]))); }
            async function task(work) {
                if (guard.current || blocked || readingFile)
                    return;
                guard.current = true;
                setBusy(true);
                onBusy(true);
                setError('');
                const controller = new AbortController();
                pending.current = controller;
                try {
                    await work(controller.signal);
                }
                catch (reason) {
                    if (alive.current && !controller.signal.aborted)
                        setError(reason.message || L('操作失败', 'Operation failed'));
                }
                finally {
                    pending.current = null;
                    guard.current = false;
                    if (alive.current) {
                        setBusy(false);
                        onBusy(false);
                    }
                }
            }
            function inspect() { const sent = signature; return task(async (signal) => { const value = await action({ operation: 'data-preview', id: project.id, expectedRevision: project.revision, ...body }, signal); if (alive.current && latest.current === sent)
                setPreview({ ...value, signature: sent }); }); }
            function apply() { if (!preview || preview.signature !== signature)
                return; const sent = signature; return task(async (signal) => { const value = await action({ operation: 'data-apply', id: project.id, expectedRevision: project.revision, ...body, confirmed: true, previewToken: preview.token, saveAs }, signal); if (alive.current && latest.current === sent) {
                onDirty(false);
                onAdopt(value.project);
            } }); }
            async function importSource(event) {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file)
                    return;
                const stamp = ++reading.current, target = sourceId;
                if (file.size > 1024 * 1024 || !['csv', 'tsv', 'txt', 'md'].includes(file.name.split('.').at(-1)?.toLowerCase())) {
                    setError(L('请选择 1 MiB 内的 CSV、TSV、TXT 或 Markdown。', 'Choose CSV, TSV, TXT or Markdown up to 1 MiB.'));
                    return;
                }
                setReadingFile(true);
                try {
                    const content = await file.text();
                    if (!alive.current || stamp !== reading.current)
                        return;
                    const ext = file.name.split('.').at(-1).toLowerCase();
                    setUpdates(old => ({ ...old, [target]: { id: target, format: ext === 'csv' || ext === 'tsv' ? ext : 'text', content } }));
                    setPreview(null);
                    setError('');
                }
                catch {
                    if (alive.current)
                        setError(L('无法读取材料，请重试。', 'Could not read source. Try again.'));
                }
                finally {
                    if (alive.current)
                        setReadingFile(false);
                }
            }
            async function importScenario(event) {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file)
                    return;
                const stamp = ++reading.current;
                setReadingFile(true);
                try {
                    if (file.size > 32000)
                        throw new Error(L('推演参数文件过大。', 'Scenario parameter file is too large.'));
                    const packet = JSON.parse(await file.text());
                    if (!alive.current || stamp !== reading.current)
                        return;
                    if (packet.schemaVersion !== 1 || packet.deckId !== project.deckId || packet.revision !== project.revision || packet.fingerprint !== model.fingerprint || !packet.parameters || typeof packet.parameters !== 'object' || Array.isArray(packet.parameters) || Object.keys(packet.parameters).some(id => !Object.hasOwn(baseline, id)) || Object.values(packet.parameters).some(value => typeof value !== 'number' || !Number.isFinite(value)))
                        throw new Error(L('参数来自其他工程、旧版本或格式无效，请重新导出。', 'Scenario is stale, belongs to another project, or is invalid. Export it again.'));
                    const next = { ...baseline, ...Object.fromEntries(Object.entries(packet.parameters).map(([id, value]) => [id, String(value)])) };
                    setParameters(next);
                    setValid(true);
                    setPreview(null);
                    onParameters(Object.fromEntries(Object.entries(next).map(([id, value]) => [id, Number(value)])));
                    setError('');
                }
                catch (reason) {
                    if (alive.current)
                        setError(reason.message);
                }
                finally {
                    if (alive.current)
                        setReadingFile(false);
                }
            }
            const metric = model.metrics.find(m => m.id === metricId), source = model.sources.find(s => s.id === sourceId), replacement = updates[sourceId];
            const format = (value, m) => new Intl.NumberFormat(languageOf() === 'en' ? 'en-US' : 'zh-CN', { style: m.format.style === 'percent' ? 'percent' : 'decimal', minimumFractionDigits: m.format.digits, maximumFractionDigits: m.format.digits }).format(value) + (m.format.unit || '');
            const display = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2), disabled = busy || blocked || readingFile;
            return h('section', { className: 'card data-workbench', 'aria-label': L('数据溯源与现场推演', 'Data lineage and what-if') }, h('style', null, dataCss), h('h3', null, L('数据溯源与现场推演', 'Data lineage and what-if')), h('p', { className: 'muted' }, L('点预览中的数字可追问来源。只有明确声明的假设可调；来源不等于事实已核验。', 'Click numbers in the preview to inspect their lineage. Only declared assumptions are adjustable. Lineage is not factual verification.')), h('details', null, h('summary', null, L('数字来自哪里', 'Where the numbers come from')), h('label', null, L('指标', 'Metric'), h('select', { value: metricId, disabled, onChange: event => setMetricId(event.target.value) }, model.metrics.map(m => h('option', { key: m.id, value: m.id }, m.label + ' [' + m.id + ']')))), metric && h('div', { className: 'data-evidence' }, h('strong', null, metric.label + ' = ' + format(model.values[metric.id], metric)), metric.kind === 'source' ? h(React.Fragment, null, h('p', null, metric.evidence.name + ' · ' + metric.evidence.locator), h('pre', null, metric.evidence.excerpt), h('details', null, h('summary', null, L('来源快照校验值', 'Source snapshot checksum')), h('code', null, metric.evidence.sha256))) : metric.kind === 'input' ? h('p', null, L('用户假设', 'User assumption') + (metric.note ? ' · ' + metric.note : '')) : h(React.Fragment, null, h('pre', null, '= ' + metric.formula), h('div', { className: 'tools' }, metric.dependencies.map(id => h('button', { key: id, disabled, onClick: () => setMetricId(id) }, model.metrics.find(m => m.id === id).label))))), h('button', { disabled: disabled || changed, onClick: () => onDownload('data') }, L('下载溯源与假设报告', 'Download lineage and assumptions'))), model.metrics.some(m => m.kind === 'input') && h('details', { open: true }, h('summary', null, L('现场推演参数', 'What-if assumptions')), model.metrics.filter(m => m.kind === 'input').map(m => h('div', { key: m.id, className: 'data-input-row' }, h('label', { htmlFor: fieldId + '-ppt-data-' + m.id }, m.label, h('small', { className: 'muted' }, ' · ' + L('假设', 'Assumption') + (m.note ? ' · ' + m.note : ''))), h('div', { className: 'data-input-controls' }, h('input', { type: 'range', min: m.min, max: m.max, step: m.step, value: Number(parameters[m.id]), disabled, 'aria-label': m.label + ' ' + L('滑杆', 'slider'), onChange: event => changeParameter(m.id, event.target.value) }), h('input', { id: fieldId + '-ppt-data-' + m.id, type: 'number', min: m.min, max: m.max, step: m.step, value: parameters[m.id], disabled, onChange: event => changeParameter(m.id, event.target.value) })))), h('label', null, L('导入离线 HTML 保存的推演参数', 'Import scenario parameters saved in offline HTML'), h('input', { type: 'file', accept: '.json,application/json', disabled, onChange: importScenario }))), model.sources.length > 0 && h('details', null, h('summary', null, L('更新来源材料', 'Update source material')), h('p', { className: 'muted' }, L('先导入或粘贴新材料，预览影响后再确认；不会自动监视或修改原文件。表格可从 Excel 导出 CSV。', 'Import or paste new material, then preview the impact before confirming. Original source files are not watched or modified. Export Excel tables as CSV.')), h('label', null, L('替换来源', 'Replace source'), h('select', { value: sourceId, disabled, onChange: event => setSourceId(event.target.value) }, model.sources.map(s => h('option', { key: s.id, value: s.id }, s.name)))), h('label', null, L('导入替换材料', 'Import replacement material'), h('input', { type: 'file', accept: source?.kind === 'table' ? '.csv,.tsv' : '.txt,.md', disabled, onChange: importSource })), source?.kind === 'table' && h('label', null, L('分隔格式', 'Delimiter format'), h('select', { value: replacement?.format || 'csv', disabled, onChange: event => { setUpdates(old => ({ ...old, [sourceId]: { id: sourceId, format: event.target.value, content: replacement?.content || '' } })); setPreview(null); } }, h('option', { value: 'csv' }, 'CSV'), h('option', { value: 'tsv' }, 'TSV'))), h('label', null, L('或粘贴内容', 'Or paste content'), h('textarea', { rows: 4, maxLength: 1048576, value: replacement?.content ?? '', disabled, onChange: event => { setUpdates(old => ({ ...old, [sourceId]: { id: sourceId, format: source.kind === 'table' ? replacement?.format || 'csv' : 'text', content: event.target.value } })); setPreview(null); setError(''); } })), replacement && h('button', { disabled, onClick: () => { setUpdates(old => { const next = { ...old }; delete next[sourceId]; return next; }); setPreview(null); } }, L('取消此来源更新', 'Cancel this source update'))), changed && h('p', { className: 'dirty', role: 'status' }, L('推演或材料尚未保存，当前 PPTX 仍是已保存版本。先预览差异并确认，或恢复参数后下载。', 'Unsaved scenario or source changes. The PPTX still contains saved values. Preview and confirm, or reset before downloading.')), (!valid || !inputsValid) && h('p', { className: 'notice error', role: 'alert' }, L('参数无法计算，请检查范围、步长或除零，再恢复或修改。', 'Cannot calculate these parameters. Check ranges, steps or division by zero; adjust or reset.')), error && h('p', { className: 'notice error', role: 'alert' }, error), h('div', { className: 'tools' }, h('button', { disabled: disabled || !changed || !valid || !inputsValid, onClick: inspect }, L('预览差异', 'Preview changes')), h('button', { disabled: disabled || !changed, onClick: reset }, L('恢复已保存数据', 'Reset to saved data'))), preview && preview.signature === signature && h('div', { className: 'data-diff' }, h('h4', null, L('确认前核对', 'Review before confirming')), !preview.changed ? h('p', null, L('内容没有变化。', 'No content changes.')) : h(React.Fragment, null, h('ul', null, preview.changes.map(change => h('li', { key: change.id }, h('strong', null, change.label + ': '), change.beforeText + ' → ' + change.afterText, change.before === change.after && ' · ' + L('来源已更新', 'Source updated')))), h('h4', null, L('受影响页面', 'Affected slides')), !preview.affectedSlides.length && h('p', { className: 'muted' }, L('指标尚未绑定到页面，只更新数据模型。', 'Metrics are not bound to slides; only the data model changes.')), preview.affectedSlides.map(slide => h('details', { key: slide.id }, h('summary', null, (slide.page) + '. ' + slide.title), h('button', { disabled, onClick: () => onChoose(slide.id) }, L('查看页面', 'View slide')), slide.evidenceChanged && h('p', null, L('关联的来源快照有变化。', 'A linked source snapshot changed.')), slide.fields.map(field => h('div', { key: field.field }, h('strong', null, t(fields.find(([key]) => key === field.field)?.[1] || field.field)), h('div', { className: 'data-before-after' }, h('pre', null, L('之前：', 'Before: ') + display(field.before)), h('pre', null, L('之后：', 'After: ') + display(field.after))))))), h('label', { className: 'data-copy' }, h('input', { type: 'checkbox', checked: saveAs, disabled, onChange: event => setSaveAs(event.target.checked) }), L('保存为新副本，保留原稿（推荐）', 'Save a new copy and keep the original (recommended)')), h('p', { className: 'muted' }, L('PPTX 保存确认后的静态结果，并附公式、来源和假设；HTML 保留交互。JSON 工程包含导入的完整材料，分享前请检查。', 'PPTX saves confirmed static results with formulas, sources and assumptions; HTML retains interaction. The JSON project contains full imported material; review it before sharing.')), h('button', { className: 'primary', disabled: disabled || !valid || !inputsValid, onClick: apply }, saveAs ? L('确认并保存推演副本', 'Confirm and save scenario copy') : L('确认并更新当前工程', 'Confirm and update this project')))));
        }
        function Workbench({locale,workbench=false}={}) {
const [activeTab,setActiveTab]=useState('content'),[downloadOpen,setDownloadOpen]=useState(false),[pendingNav,setPendingNav]=useState(null),[deleteOpen,setDeleteOpen]=useState(false);
const controlId=React.useId(),rootElement=useRef(null),fullscreenBoundary=useRef({was:false,exitedAt:0});
useEffect(()=>{const changed=()=>{const active=!!document.fullscreenElement;if(fullscreenBoundary.current.was && !active)fullscreenBoundary.current.exitedAt=Date.now();fullscreenBoundary.current.was=active;};document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[]);
function clearEdits(){imageLoader.current.cancel();setDraft(draftFor(slide));setImage(null);setDirty(false);setError('');setMessage('');setConflict(false);setOverlaps([]);}
function finishNavigation(target,saved){setPendingNav(null);if(target.kind==='back'){imageLoader.current.cancel();setImage(null);setDirty(false);setProject(null);refreshList();return;}if(target.kind==='slide'){if(saved)adopt(saved,target.id);else choose(project.slides.find(row=>row.id===target.id),true);return;}if(saved)adopt(saved,selected);else clearEdits();}
function requestNavigation(target){if(busy)return;if(dataDirty){setActiveTab('data');setMessage(pptText('请先确认或恢复数据推演。','Confirm or reset the scenario first.'));return;}if(dirty){setPendingNav(target);return;}finishNavigation(target);}
            useLanguage(locale);
            const [projects, setProjects] = useState([]), [project, setProject] = useState(null), [selected, setSelected] = useState('');
            const [draft, setDraft] = useState({}), [image, setImage] = useState(null), [dirty, setDirty] = useState(false);
            const [dataDirty, setDataDirty] = useState(false), [incomingData, setIncomingData] = useState(null);
            const [busy, setBusy] = useState(false), [job, setJob] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('');
            const [mode, setMode] = useState('html'), [raster, setRaster] = useState('');
            const [conflict, setConflict] = useState(false), [overlaps, setOverlaps] = useState([]);
            const frame = useRef(null), previewBox = useRef(null), fieldRefs = useRef({}), alive = useRef(true), operations = useRef(new Set());
            const imageLoader = useRef(null);
            if (!imageLoader.current)
                imageLoader.current = createImageLoader();
            const imagePending = imageLoader.current.pending;
// Update protection: dsh-ppt
__stardustUpdatesGuard(React, "dsh-ppt", { dirty: dirty || dataDirty, busy: busy || imagePending });

            const nonce = useRef(crypto.randomUUID());
            const dataCommand = useRef(0);
            const previewDocument = useMemo(() => project?.html ? editorHtml(project.html, nonce.current) : '', [project?.html]);
            const index = project ? Math.max(0, project.slides.findIndex(s => s.id === selected)) : 0;
            const slide = project?.slides[index];
            function adopt(next, preferred) {
                imageLoader.current.cancel();
                nonce.current = crypto.randomUUID();
                setDataDirty(false);
                setIncomingData(null);
                setProject(next);
                const row = next.slides.find(s => s.id === preferred) || next.slides[0];
                setSelected(row.id);
                setDraft(draftFor(row));
                setImage(null);
                setDirty(false);
                setRaster('');
                setOverlaps([]);
                if (!next.render)
                    setMode('html');
            }
            async function perform(work, success, label = t("正在处理，请稍候…")) {
                setBusy(true);
                setJob(label);
                setError('');
                setMessage('');
                setConflict(false);
                const controller = new AbortController();
                operations.current.add(controller);
                try {
                    const result = await work(controller.signal);
                    if (alive.current && success)
                        success(result);
return result;
                }
                catch (e) {
                    if (alive.current) {
                        setError(e.message || t("操作失败"));
                        setConflict(e.status === 409);
                    }
                }
                finally {
                    operations.current.delete(controller);
                    if (alive.current)
                        setBusy(false);
                }
            }
            function refreshList() { return perform(signal => action({ operation: 'list' }, signal), value => setProjects(value.projects)); }
            useEffect(() => {
                alive.current = true;
                const abort = new AbortController();
                action({ operation: 'list' }, abort.signal).then(value => { if (alive.current)
                    setProjects(value.projects); }).catch(e => { if (!abort.signal.aborted)
                    setError(e.message); });
                return () => { alive.current = false; abort.abort(); imageLoader.current.cancel(); for (const operation of operations.current)
                    operation.abort(); };
            }, []);
            useEffect(() => {
                function receive(event) {
                    if (event.source !== frame.current?.contentWindow || event.data?.nonce !== nonce.current || mode !== 'html')
                        return;
                    if (event.data.type === 'dsh-ppt-data') {
                        if (typeof event.data.command === 'number' && event.data.command !== dataCommand.current)
                            return;
                        setIncomingData({ parameters: event.data.parameters, valid: event.data.valid });
                        return;
                    }
                    if (event.data.type === 'dsh-ppt-shortcut') {
                        handleShortcut(event.data.key);
                        return;
                    }
                    if (event.data.type !== 'dsh-ppt-select')
                        return;
                    const key = event.data.field;
                    const field = fields.find(([field]) => field === key);
                    if (field) {
                        if(dataDirty){setActiveTab('data');return;}setActiveTab('content');requestAnimationFrame(()=>fieldRefs.current[key]?.focus());
                        fieldRefs.current[key]?.scrollIntoView({ block: 'nearest' });
                        setMessage(t("已定位到") + t(field[1]) + t("，在字段中修改后保存。"));
                    }
                }
                window.addEventListener('message', receive);
                return () => window.removeEventListener('message', receive);
            }, [mode, project, dirty, busy, imagePending, index, selected, draft, image, dataDirty]);
            useEffect(() => {
                if (mode !== 'html' || !project || !previewBox.current)
                    return;
                // Align iframe edges/dimensions when the host uses fractional text metrics.
                const box = previewBox.current;
                function align() {
                    const target = frame.current;
                    if (!target)
                        return;
                    const r = box.getBoundingClientRect(), x = r.x + box.clientLeft, y = r.y + box.clientTop;
                    target.style.width = box.clientWidth + 'px';
                    target.style.height = box.clientHeight + 'px';
                    target.style.transform = 'translate(' + (Math.ceil(x) - x) + 'px,' + (Math.ceil(y) - y) + 'px)';
                }
                align();
                const observer = new ResizeObserver(align);
                observer.observe(box);
                window.addEventListener('scroll', align, true);
                return () => { observer.disconnect(); window.removeEventListener('scroll', align, true); };
            }, [mode, !!project]);
            function jump() { frame.current?.contentWindow?.postMessage({ type: 'dsh-ppt-jump', nonce: nonce.current, page: index }, '*'); }
            useEffect(() => { jump(); }, [index, project?.revision, mode]);
            useEffect(() => {
                if (mode !== 'pptx' || !project?.render)
                    return;
                const abort = new AbortController();
                setRaster('');
                action({ operation: 'page', id: project.id, page: index + 1 }, abort.signal).then(value => setRaster(value.data)).catch(e => { if (!abort.signal.aborted)
                    setError(e.message); });
                return () => abort.abort();
            }, [mode, index, project?.revision]);
            function handleShortcut(key) {
 if(key==='escape' && (document.fullscreenElement || Date.now()-fullscreenBoundary.current.exitedAt<300)){if(document.fullscreenElement)void document.exitFullscreen();return;}
 if(dataDirty){if(key==='escape')setActiveTab('data');return;}
 if(key==='save'){if(project && dirty && !busy && !imagePending)save();return;}
 if(key==='escape'){if(!project || busy)return;requestNavigation({kind:dirty || imagePending?'cancel':'back'});return;}
 if(key==='prev' || key==='next'){if(!project || busy || imagePending)return;const next=index+(key==='next'?1:-1);if(next>=0 && next<project.slides.length)choose(project.slides[next]);}
}
            useEffect(() => {
                function onKey(event) {
if(!rootElement.current?.contains(event.target) || event.target?.closest?.('[role=dialog]'))return;
                    if (event.isComposing || event.defaultPrevented)
                        return;
                    if (event.key === 'Escape' && event.target && event.target.tagName === 'SELECT')
                        return;
                    const mod = event.ctrlKey || event.metaKey;
                    if (mod && (event.key === 's' || event.key === 'S')) {
                        if (!project)
                            return;
                        event.preventDefault();
                        handleShortcut('save');
                        return;
                    }
                    if (event.key === 'Escape') {
                        if (!project || busy || imagePending)
                            return;
                        event.preventDefault();
                        handleShortcut('escape');
                        return;
                    }
                    if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
                        if (!project || busy || imagePending)
                            return;
                        event.preventDefault();
                        handleShortcut(event.key === 'ArrowRight' ? 'next' : 'prev');
                    }
                }
                document.addEventListener('keydown', onKey);
                return () => document.removeEventListener('keydown', onKey);
            }, [project, dirty, busy, imagePending, index, selected, draft, image, dataDirty]);
            useEffect(() => {
                if (!dirty && !dataDirty)
                    return;
                function warn(event) { event.preventDefault(); event.returnValue = t("有未保存修改，离开页面会丢失。"); }
                window.addEventListener('beforeunload', warn);
                return () => window.removeEventListener('beforeunload', warn);
            }, [dirty, dataDirty]);
            function open(id) { return perform(signal => action({ operation: 'open', id }, signal), value => { adopt(value.project); setMessage(t("点击预览里的文字，或在下方修改字段。")); }); }
            function keepInputsAndReload() {
                const original = draftFor(slide), keys = fields.filter(([key]) => draft[key] !== original[key]).map(([key]) => key), pending = { ...draft }, pendingImage = image;
                return perform(signal => action({ operation: 'open', id: project.id }, signal), value => {
                    const row = value.project.slides.find(s => s.id === selected);
                    if (!row) {
                        setError(t("当前页已被删除，输入仍保留，请复制需要的内容后取消修改。"));
                        return;
                    }
                    const latest = draftFor(row), merged = { ...latest }, shared = [];
                    for (const key of keys) {
                        merged[key] = pending[key];
                        if (latest[key] !== original[key] && latest[key] !== pending[key])
                            shared.push({ key, latest: latest[key], yours: pending[key] });
                    }
                    adopt(value.project, selected);
                    setDraft(merged);
                    setImage(pendingImage);
                    setDirty(keys.length > 0 || !!pendingImage);
                    setOverlaps(shared);
                    setMessage(t("已载入最新版本并保留你的修改，请核对后再保存。"));
                });
            }
            function choose(row,discard=false) { if(!row || busy)return; if(dirty && !discard){setPendingNav({kind:'slide',id:row.id});return;} imageLoader.current.cancel(); setSelected(row.id); setDraft(draftFor(row)); setImage(null); setMessage(''); }
            function save(saveAs = false) {
                if (dataDirty)
                    return;
                const original = draftFor(slide), patch = {};
                for (const [key] of fields)
                    if (draft[key] !== original[key])
                        patch[key] = key === 'bullets' ? draft[key].split('\n').map(v => v.trim()).filter(Boolean) : draft[key];
                if (image)
                    patch.image = { src: image.src, alt: image.alt, fit: image.fit, caption: image.caption };
                return perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, slide: slide.id, patch, saveAs }, signal), value => {
                    adopt(value.project, slide.id);
                    setMessage(saveAs ? t("副本已保存，原文件保留。副本从工程生成，不包含 Office 手工修改。") : value.changed === false ? t("内容没有变化。") : t("已保存，HTML、PPTX 和工程文件已同步更新。"));
                });
            }
            function move(delta) {
                if (dataDirty)
                    return;
                const order = project.slides.map(s => s.id);
                [order[index], order[index + delta]] = [order[index + delta], order[index]];
                return perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, order }, signal), value => { adopt(value.project, slide.id); setMessage(t("页面顺序已更新，可撤销。")); });
            }
            function structure(operation) {
                if (dataDirty)
                    return;
                return perform(signal => action({ operation, id: project.id, expectedRevision: project.revision, slide: slide.id }, signal), value => {
                    adopt(value.project, value.selected);
                    setMessage(operation === 'duplicate' ? t("页面已复制，图片、图表和备注一并保留，可撤销。") : t("页面已删除，可撤销。"));
                });
            }
            function undo() { if (dataDirty)
                return; return perform(signal => action({ operation: 'undo', id: project.id, expectedRevision: project.revision }, signal), value => { adopt(value.project, selected); setMessage(t("已撤销上次修改。")); }); }
            function render() {
                if (dataDirty)
                    return;
                return perform(signal => action({ operation: 'render', id: project.id, expectedRevision: project.revision }, signal), value => { adopt(value.project, selected); setMode('pptx'); setMessage(t("当前 PPTX 已生成逐页图片，请查看画面。")); }, t("正在渲染最终 PPTX，较大文件可能需要几分钟…"));
            }
            function download(kind) {
                if (dataDirty)
                    return;
                const url = new URL('api/dsh-ppt/download', document.baseURI);
                url.searchParams.set('id', project.id);
                url.searchParams.set('kind', kind);
                url.searchParams.set('revision', String(project.revision));
                // An authenticated attachment response keeps the click's user gesture and
                // works in WebViews whose native download handler cannot read blob URLs.
                const link = document.createElement('a');
                link.href = url.href;
                link.download = '';
                link.hidden = true;
                document.body.append(link);
                link.click();
                link.remove();
                setMessage(t("已请求下载，请查看浏览器的下载列表。"));
            }
            function copyExample() {
                const text = t("示例：请把这份材料制作成可直接交付的演示文稿，生成 HTML、PPTX 和工程文件。");
                try {
                    navigator.clipboard?.writeText(text).then(() => setMessage(t("已复制示例"))).catch(() => { });
                }
                catch (_) { /* ignore */ }
            }
            function upload(event) {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file)
                    return;
                imageLoader.current.cancel();
                setMessage('');
                setError('');
                if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
                    setError(t("请选择 5 MiB 以内的 PNG 或 JPEG 图片。"));
                    return;
                }
                imageLoader.current.read(file, data => {
                    if (!alive.current)
                        return;
                    setImage({ src: data, alt: slide.image?.alt || file.name.replace(/\.[^.]+$/, ''), caption: slide.image?.caption || '', fit: slide.image?.fit || 'contain', name: file.name });
                    setDirty(true);
                    setError('');
                    setMessage(t("图片已载入，保存后生效。"));
                }, () => { if (alive.current) {
                    setError(t("无法读取图片，请重试。"));
                    setMessage('');
                } });
                if (imageLoader.current.pending)
                    setMessage(t("正在读取图片，切换页面会取消本次读取。"));
            }
            const currentImage = image?.src || (slide?.image?.assetId && project.assets[slide.image.assetId]?.data);
            return __stardustUpdatesInlinePage(React,h(W.Page,{workbench,rootRef:rootElement,title:t('演示文稿'),subtitle:project?h(React.Fragment,null,project.title+' · '+project.slides.length+t(' 页 · 修订 ')+project.revision,(dirty || dataDirty)?h('span',{className:'w-tag'},t('未保存')):h('span',null,' · '+pptText('已保存','Saved'))):pptText('管理、预览和编辑已生成的演示文稿。','Manage, preview and edit generated presentations.'),className:'pptw ppt-workbench','aria-busy':busy?'true':undefined,actions:project?h(React.Fragment,null,
 h(W.Button,{icon:'left',disabled:busy || dataDirty,onClick:()=>requestNavigation({kind:'back'})},t('返回项目')),
 h(W.Button,{variant:'primary',disabled:busy || dataDirty || imagePending || !dirty,'aria-keyshortcuts':'Control+S Meta+S',onClick:()=>save()},pptText('保存修改','Save changes')),
 h(W.Button,{icon:'download',disabled:busy || dirty || dataDirty || imagePending,title:dirty || dataDirty?pptText('先保存当前修改','Save changes first'):undefined,onClick:()=>setDownloadOpen(true)},pptText('下载成品','Download output'))) : h(W.IconButton,{icon:'refresh',label:t('刷新项目'),disabled:busy,onClick:refreshList})},
 h('style',null,css),h('style',null,PPT_WORKBENCH_CSS),error && h('div', { role: 'alert', className: 'notice error' }, error, ' ', h('button', { disabled: busy || dataDirty, onClick: () => project ? open(project.id) : refreshList() }, t("重试"))),conflict && project && h('button', { disabled: busy || dataDirty, onClick: keepInputsAndReload }, t("载入最新版本，保留我的输入")),h(W.Status,{tone:'success'},message),busy?h(W.Status,null,job):null,
 dataDirty ? h(W.Status,null,h('div',{className:'ppt-data-warning'},pptText('数据推演或材料尚未保存，成品仍是已保存版本。','Scenario or source changes are unsaved. Output still uses saved values.'),h(W.Button,{variant:'ghost',onClick:()=>setActiveTab('data')},pptText('前往数据与推演','Open data and what-if')))) : null,
 !project ? projects.length ? h('div',{className:'ppt-library'},projects.map(row=>h(W.Row,{key:row.id,title:row.title,description:row.path,disabled:busy,onClick:()=>{setActiveTab('content');open(row.id);}}))) : h('div', { className: 'card' }, h('h3', null, t("还没有可以编辑的项目")), h('p', null, t("先在对话中让助手生成演示文稿。已有项目可以让助手调用 ppt_check 检查一次，它会出现在这里。")), h('p', { className: 'muted' }, t("示例：请把这份材料制作成可直接交付的演示文稿，生成 HTML、PPTX 和工程文件。")), h('div', { className: 'tools' }, h('button', { onClick: copyExample }, t("复制示例")))) :
 h(W.Tabs,{label:pptText('演示文稿工作台视图','Presentation workbench views'),value:activeTab,onChange:value=>{setActiveTab(value);if(value==='data' && project.dataModel)setMode('html');},items:[{id:'content',label:pptText('内容编辑','Edit content')},{id:'visual',label:pptText('视觉检查','Visual review')},{id:'rehearsal',label:pptText('演练','Rehearsal')},{id:'data',label:pptText('数据与推演','Data and what-if')}]},
 h('div',{className:'ppt-editor','data-view':activeTab},
 h(PptPages,{project,selected,busy,imagePending,dirty,dataDirty,onChoose:choose,onDuplicate:()=>structure('duplicate')}),
 h('section',{className:'ppt-canvas-region','aria-label':pptText('成品预览','Presentation preview')},
 h('div',{className:'ppt-preview-tools'},h(W.Button,{'aria-pressed':mode==='html',disabled:busy || dataDirty,onClick:()=>setMode('html')},t('HTML 预览')),h(W.Button,{'aria-pressed':mode==='pptx',disabled:busy || dataDirty || !project.render,onClick:()=>setMode('pptx')},t('最终 PPTX 预览')),h(W.Button,{disabled:busy || dirty || imagePending || dataDirty,onClick:render},t('渲染当前 PPTX')),h(W.IconButton,{icon:'external',label:pptText('查看全屏','View fullscreen'),onClick:async()=>{try{await previewBox.current?.requestFullscreen();previewBox.current?.querySelector('.ppt-fullscreen-exit')?.focus();}catch{setError(pptText('当前宿主无法进入全屏，可以继续使用页面预览。','Fullscreen is unavailable in this host. The page preview remains usable.'));}}})),
 h('div', { className: 'preview', ref: previewBox },h(W.Button,{className:'ppt-fullscreen-exit',onClick:()=>document.exitFullscreen()},pptText('退出全屏','Exit fullscreen')), mode === 'html' ? (project.html ? h('iframe', { ref: frame, title: t("演示文稿 HTML 预览"), sandbox: 'allow-scripts', srcDoc: previewDocument, onLoad: jump }) : h('p', null, t("此项目尚无 HTML，请保存一次生成预览。"))) : raster ? h('img', { className: 'render-page', src: raster, alt: t("最终 PPTX 第 ") + (index + 1) + t(" 页渲染结果") }) : h('p', null, t("正在载入当前页渲染…"))),h('div',{className:'ppt-preview-help'},h('p', { className: 'muted' }, mode === 'html' ? t("这是 HTML 放映预览。最终 PPTX 的字体和排版请用上方渲染检查。点击文字可定位编辑字段。") : t("这是当前 PPTX 文件的实际渲染图片，仍需检查每页画面；PowerPoint / WPS 可能因字体环境而不同。"))),project.render?.missingFonts?.length ? h('div', { role: 'alert', className: 'notice error' }, t("渲染引擎报告缺失字体：") + project.render.missingFonts.join('、') + t("。请替换为目标电脑可用字体后重新渲染。")) : null,h('details', { className: 'card' }, h('summary', null, t("质量提醒（") + (project.quality.warningCount + project.quality.errorCount) + (languageOf() === 'en' ? ')' : '）')), (project.quality.issues || []).map((issue, i) => h('p', { key: i }, (issue.slide > 0 ? t("第 ") + issue.slide + t(" 页：") : "") + (languageOf() === 'en' ? issue.messageEn : issue.message) + (languageOf() === 'en' ? ' ' : '；') + (languageOf() === 'en' ? issue.suggestionEn : issue.suggestion)))),h('p',{className:'w-muted'},t('快捷键：Ctrl/⌘+S 保存 · Esc 取消或返回 · Alt+←/→ 切换页面'))),
 h('aside',{className:'ppt-inspector','aria-label':pptText('页面与辅助工具','Slide properties and tools')},
 h('section',{className:'ppt-inspector-panel',hidden:activeTab!=='content'},h('div',{className:'card'},h('h3',null,pptText('页面内容','Slide content')),dirty && h('p', { className: 'dirty' }, t("有未保存修改，请先保存或取消，再切换页面。")),
overlaps.length ? h('div', { className: 'notice' }, h('strong', null, t("这些字段也被修改过，请比较后决定是否保存：")), overlaps.map(row => h('div', { key: row.key }, h('strong', null, t(fields.find(([key]) => key === row.key)[1])), h('p', null, t("最新版本：") + row.latest), h('p', null, t("你的修改：") + row.yours)))) : null,
fields.filter(([key]) => key === 'title' || key === 'notes' || key === 'bullets' && (slide.layout === 'bullets' || slide.bullets?.length > 0) || key !== 'bullets' && (slide[key] || key === 'subtitle' && ['cover', 'section', 'closing', 'quote'].includes(slide.layout) || key === 'kicker' && ['cover', 'section', 'closing'].includes(slide.layout))).map(([key, label]) => h('div', { key }, h('label', { htmlFor: controlId+'-'+key }, t(label)), h(key === 'title' || key === 'kicker' ? 'input' : 'textarea', { id: controlId+'-'+key, ref: el => { fieldRefs.current[key] = el; }, disabled: busy || dataDirty, value: draft[key] || '', rows: key === 'bullets' ? 4 : 2, maxLength: 8000, onChange: e => { setDraft({ ...draft, [key]: e.target.value }); setDirty(true); } }))),h('details',{className:'ppt-image-section',open:!!image},h('summary',null,pptText('图片','Image')),h('label', { htmlFor: controlId+'-image' }, slide.image ? t("替换图片（PNG / JPEG）") : t("添加图片（会改为图文布局）")),
h('input', { id: controlId+'-image', type: 'file', accept: 'image/png,image/jpeg', disabled: busy || dataDirty, onChange: upload }),
currentImage && h('img', { className: 'image-preview', src: currentImage, alt: image?.alt || slide.image?.alt || t("当前图片") }),
image && h(React.Fragment, null, h('p', { className: 'muted' }, t("已选择：") + image.name), h('label', { htmlFor: controlId+'-alt' }, t("图片说明")), h('input', { id: controlId+'-alt', value: image.alt, disabled: busy || dataDirty, onChange: e => setImage({ ...image, alt: e.target.value }) }), h('label', { htmlFor: controlId+'-fit' }, t("图片适应方式")), h('select', { id: controlId+'-fit', value: image.fit, disabled: busy || dataDirty, onChange: e => setImage({ ...image, fit: e.target.value }) }, h('option', { value: 'contain' }, t("完整显示")), h('option', { value: 'cover' }, t("填满并裁切"))))),h('div',{className:'tools'},h('button', { 'aria-keyshortcuts': 'Control+Shift+S Meta+Shift+S', disabled: busy || dataDirty || imagePending, onClick: () => save(true) }, t("另存副本")),
h('button', { 'aria-keyshortcuts': 'Escape', disabled: busy || (!dirty && !imagePending), onClick: () => { imageLoader.current.cancel(); setDraft(draftFor(slide)); setImage(null); setDirty(false); setError(''); setMessage(''); setConflict(false); setOverlaps([]); } }, t("取消修改")),
h('button', { disabled: busy || dirty || imagePending || dataDirty || !project.undoAvailable, onClick: undo }, t("撤销上次修改")))),h('div',{className:'w-toolbar ppt-structure'},h(W.Button,{disabled:busy || dirty || imagePending || dataDirty || index===0,onClick:()=>move(-1)},t('上移')),h(W.Button,{disabled:busy || dirty || imagePending || dataDirty || index===project.slides.length-1,onClick:()=>move(1)},t('下移')),h(W.Button,{icon:'trash',variant:'danger',disabled:busy || dirty || imagePending || dataDirty || project.slides.length<=1,onClick:()=>{setError('');setDeleteOpen(true);}},t('删除本页')))),
 h('section',{className:'ppt-inspector-panel',hidden:activeTab!=='visual'},h(VisualPanel, { key: 'visual:' + project.id, project, selected, blocked: busy || dirty || imagePending || dataDirty,
                onBusy: value => { setBusy(value); setJob(languageOf() === 'en' ? 'Reviewing rendered slides…' : '正在检查和复查实际 PPTX 画面…'); },
                onAdopt: next => { adopt(next, selected); setMode(next.render ? 'pptx' : 'html'); setMessage(languageOf() === 'en' ? 'Opened the repaired copy. The original is kept, and formatting changes can be undone.' : '已打开修复副本，原稿保留，可撤销排版修改。'); } })),
 h('section',{className:'ppt-inspector-panel',hidden:activeTab!=='rehearsal'},h(CoachingPanel, { key: project.id, project, selected, blocked: busy || dirty || imagePending || dataDirty,
                onChoose: id => { choose(project.slides.find(s => s.id === id)); previewBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
                onAdopt: next => { adopt(next, selected); setMessage(languageOf() === 'en' ? 'Saved to a new copy. The original is kept; you can undo the adopted changes in this copy.' : '已保存为新副本，原稿保留；可在当前副本中撤销采纳的修改。'); } })),
 h('section',{className:'ppt-inspector-panel',hidden:activeTab!=='data'},project.dataModel?project.dataModel && h(DataPanel, { key: project.id + ':' + project.revision, project, blocked: busy || dirty || imagePending || mode !== 'html', incoming: incomingData,
                onParameters: parameters => frame.current?.contentWindow?.postMessage({ type: 'dsh-ppt-data-set', nonce: nonce.current, parameters, command: ++dataCommand.current }, '*'), onDirty: setDataDirty, onBusy: value => { setBusy(value); setJob(languageOf() === 'en' ? 'Updating presentation data…' : '正在核对并更新数据…'); },
                onAdopt: next => { adopt(next, selected); setMessage(languageOf() === 'en' ? 'Saved confirmed data. HTML, PPTX and project are synchronized; undo is available.' : '已保存确认后的数据，HTML、PPTX 和工程已同步，可撤销。'); }, onChoose: id => choose(project.slides.find(s => s.id === id)), onDownload: download }):h(W.Empty,{title:pptText('此工程没有绑定数据模型','This project has no bound data model'),icon:'file'},pptText('生成时提供来源、指标和可调假设后，可在这里核对来源并预览推演影响。普通演示文稿仍可正常编辑和下载。','Provide sources, metrics and adjustable assumptions when generating the deck to inspect lineage and scenario changes here. Normal editing and downloads remain available.')))))),
 downloadOpen && project ? h(W.Dialog,{title:pptText('下载成品','Download output'),closeLabel:pptText('关闭','Close'),onClose:()=>setDownloadOpen(false)},h('div',{className:'ppt-downloads'},h('p', { className: 'muted' }, t("成品包包含 PPTX、HTML 和工程文件。请先保存修改，再下载最新版本。")),h('div', { className: 'tools' }, h('button', { className: 'primary', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('bundle') }, t("下载成品包 ZIP")), h('button', { disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('pptx') }, t("下载最新 PPTX")), h('button', { disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('html') }, t("下载 HTML")), h('button', { disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('notes') }, t("下载讲稿 Markdown")), h('button', { disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('json') }, t("备份工程"))))) : null,
 pendingNav ? h(W.Dialog,{title:pptText('有未保存的修改','Unsaved changes'),closeLabel:pptText('继续编辑','Keep editing'),busy,onClose:()=>setPendingNav(null)},h('p',null,pptText('请选择如何处理当前页的修改。','Choose what to do with the current slide edits.')),h(W.Status,{tone:'error'},error),h('div',{className:'w-toolbar'},h(W.Button,{variant:'primary',disabled:busy || imagePending || dataDirty,onClick:async()=>{const target=pendingNav;const result=await save();if(result?.project && alive.current)finishNavigation(target,result.project);}},pptText('保存后继续','Save and continue')),h(W.Button,{disabled:busy,onClick:()=>finishNavigation(pendingNav)},pptText('放弃修改并继续','Discard and continue')),h(W.Button,{disabled:busy,onClick:()=>setPendingNav(null)},pptText('继续编辑','Keep editing')))) : null,
 deleteOpen && project ? h(W.Dialog,{title:t('删除本页'),closeLabel:pptText('取消','Cancel'),busy,onClose:()=>setDeleteOpen(false)},h('p',null,pptText('将删除当前页面，之后可以撤销。','Remove the current slide. You can undo this change.')),h(W.Status,{tone:'error'},error),h('div',{className:'w-toolbar'},h(W.Button,{variant:'danger',disabled:busy,onClick:async()=>{const result=await structure('remove');if(result)setDeleteOpen(false);}},pptText('确认删除本页','Confirm remove slide')),h(W.Button,{disabled:busy,onClick:()=>setDeleteOpen(false)},pptText('取消','Cancel')))) : null),"dsh-ppt");
        }
        function apply(ctx) {
W.register(ctx,{id:'dsh-ppt.workbench',label:()=>t('演示文稿'),icon:'slides',component:Workbench,inject:()=>({locale:localeService}),order:57});

            try {
                localeService = ctx.get?.('locale') || ctx.locale;
            }
            catch {
                localeService = ctx.locale;
            }
            ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'dsh-ppt', order: 58, label: () => t("演示文稿"), inject: () => ({ locale: localeService }) }, Workbench));
        }
        return { inject: ['slots', 'locale'], apply, __internals: { draftFor, editorHtml, createImageLoader, modelRouteKey, findModelRoute, reconcileModelRoute } };
    } },{"name":"dsh-ppt","version":"0.1.0","hasWorkbench":true,"packageVersion":"0.18.2","label":"演示文稿","labelEn":"PPT","suiteComponent":true}));

})();

/* STARDUSTLC_UPDATE_CLIENT_BODY_END */
})();

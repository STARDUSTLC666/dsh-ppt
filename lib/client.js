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
      h(Styles, { key: 'styles' }),
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
    return h('div', { className: cx('dshw', 'w-status', 'w-status-' + tone, className), role: tone === 'error' ? 'alert' : 'status', 'aria-live': tone === 'error' ? 'assertive' : 'polite' }, h(Icon, { name: tone === 'success' ? 'check' : 'info', size: 18 }), h('div', null, children));
  }
  function Empty({ title, children, action, icon = 'file' }) {
    return h('div', { className: 'dshw w-empty' }, h(Styles, { key: 'styles' }), h(Icon, { name: icon, size: 32 }), h('h2', null, title), children ? h('div', { className: 'w-muted' }, children) : null, action ? h('div', { className: 'w-toolbar' }, action) : null);
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
    return h('div', { className: 'dshw w-overlay', onClick: event => { if (!busy && event.target === event.currentTarget) onClose(); } },
      h(Styles, { key: 'styles' }),
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
.dshw{--w-bg:var(--dsw-alias-bg-layer-1,#fff);--w-soft:var(--dsw-alias-bg-layer-2,#f7f8fa);--w-text:var(--dsw-alias-label-primary,#18202c);--w-muted:var(--dsw-alias-label-secondary,#667085);--w-border:var(--dsw-alias-border-l3,#e7e9ef);--w-accent:var(--dsh-plugin-workbench-accent,#4f6bdb);--w-selected:color-mix(in srgb,var(--w-accent) 10%,var(--w-bg));--w-primary:var(--w-text);--w-on-primary:var(--w-bg);container-type:inline-size;container-name:dsh-workbench;color:var(--w-text);font:14px/1.65 var(--dsh-font-family-content,system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif);min-width:0;max-width:100%;box-sizing:border-box;text-align:start;color-scheme:inherit}
.dshw *,.dshw *:before,.dshw *:after{box-sizing:border-box}.dshw h1,.dshw h2,.dshw h3,.dshw h4,.dshw p{margin:0}.dshw h1{font-size:30px;line-height:1.25;letter-spacing:-.025em;font-weight:650}.dshw h2{font-size:24px;line-height:1.35;font-weight:650;letter-spacing:-.015em;overflow-wrap:anywhere}.dshw h3,.dshw h4{font-size:16px;line-height:1.4;font-weight:600}.dshw a{color:var(--w-accent);text-underline-offset:3px;overflow-wrap:anywhere}.dshw button,.dshw input,.dshw select,.dshw textarea{font:inherit;color:inherit;max-width:100%}.dshw input:not([type=checkbox]):not([type=radio]):not([type=file]),.dshw select,.dshw textarea{background:var(--dsw-specific-input-major,var(--w-bg));border:1px solid var(--w-border);border-radius:8px;padding:8px 11px;min-width:0;line-height:1.5}.dshw input:not([type=checkbox]):not([type=radio]):not([type=file]),.dshw select{min-height:38px}.dshw textarea{resize:vertical}.dshw input[type=checkbox],.dshw input[type=radio]{width:16px;height:16px;flex-shrink:0;accent-color:var(--w-accent)}.dshw :focus-visible{outline:2px solid var(--w-accent);outline-offset:3px}.dshw button:disabled,.dshw input:disabled,.dshw select:disabled,.dshw textarea:disabled{opacity:.5;cursor:not-allowed}.dshw label{font-size:13px}.dshw fieldset{min-width:0;border:1px solid var(--w-border);border-radius:8px}.dshw summary{cursor:pointer;font-weight:550;list-style:none;display:flex;align-items:center;gap:8px}.dshw summary::-webkit-details-marker{display:none}.dshw summary:after{content:'';display:block;margin-inline-start:auto;width:7px;height:7px;border-inline-end:1.75px solid currentColor;border-bottom:1.75px solid currentColor;transform:rotate(45deg);flex-shrink:0}.dshw details[open]>summary:after{transform:rotate(225deg)}.dshw details>summary+*{margin-top:12px}.dshw pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;max-width:100%;background:var(--w-soft);border-radius:6px;padding:14px}.dshw img,.dshw video,.dshw iframe{max-width:100%}
.w-page{display:flex;flex-direction:column;position:relative;padding:0;min-height:540px;gap:0}.w-page[data-main=true]{height:100%;min-height:0;padding:calc(24px + var(--dsh-frame-top-clearance,0px)) 28px 0 max(28px,var(--dsh-frame-leading-clearance,0px));overflow:auto}.dshw[data-main=true]{background:var(--w-bg)}.dshw.w-page,.dshw .w-body,.dshw .w-tab-panel{overflow-x:clip}.w-page-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;padding-bottom:22px;flex-shrink:0}.w-heading{min-width:0}.w-subtitle{margin-top:8px!important;font-size:14px;color:var(--w-muted);line-height:1.6}.w-header-actions,.w-toolbar,.w-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0}.w-header-actions{justify-content:flex-end}.w-body,.w-tabs-layout{display:flex;flex-direction:column;flex:1;min-height:0;min-width:0}.w-body{overflow:auto}.w-tab-panel{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:auto}.w-tabs{display:flex;align-items:stretch;gap:20px;border-bottom:1px solid var(--w-border);flex-shrink:0;overflow-x:auto;scrollbar-width:thin}.dshw .w-tabs>button{border:0;border-bottom:2px solid transparent;background:transparent;padding:11px 8px 13px;white-space:nowrap;font-size:14px;font-weight:550;cursor:pointer;color:var(--w-muted);display:flex;align-items:center;gap:7px}.dshw .w-tabs>button[aria-selected=true]{border-bottom-color:var(--w-accent);color:var(--w-accent)}.w-count,.w-tag{font-size:12px;line-height:1.5;display:inline-flex;align-items:center;flex-shrink:0;background:var(--w-soft);border-radius:5px;padding:1px 6px;color:var(--w-muted)}.w-tabs [aria-selected=true] .w-count,.w-selected .w-tag{color:var(--w-accent);background:var(--w-selected)}
.dshw .w-button{display:inline-flex;justify-content:center;align-items:center;gap:7px;background:var(--w-bg);border:1px solid var(--w-border);border-radius:8px;padding:8px 12px;min-height:36px;line-height:1.4;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;white-space:normal}.dshw .w-button:not(:disabled):hover{background:var(--w-soft)}.dshw .w-primary{background:var(--w-primary);border-color:var(--w-primary);color:var(--w-on-primary)}.dshw .w-primary:not(:disabled):hover{background:var(--w-primary);opacity:.9}.dshw .w-ghost{background:transparent;border-color:transparent}.dshw .w-danger{color:var(--dsw-alias-state-error-primary,#b43c3c)}.dshw .w-icon-button{width:36px;min-width:36px;padding:8px}.dshw .w-button svg{flex-shrink:0}.w-muted{color:var(--w-muted);font-size:12px;line-height:1.6}.w-section{padding:24px 0;border-bottom:1px solid var(--w-border);min-width:0}.w-section>h3{margin-bottom:12px}.w-section>p+p{margin-top:8px}.w-fields{display:grid;gap:16px;min-width:0}.w-field{display:grid;gap:6px;min-width:0}.w-field>input,.w-field>select,.w-field>textarea{width:100%}.w-status{display:flex;align-items:flex-start;gap:8px;padding:11px 13px;margin:12px 0;border:1px solid var(--w-border);border-radius:8px;background:var(--w-soft);font-size:13px;overflow-wrap:anywhere;flex-shrink:0}.w-status>svg{flex-shrink:0;margin-top:2px}.w-status-error{color:var(--dsw-alias-state-error-primary,#ad3636)}.w-status-success{color:var(--dsw-alias-state-success-primary,#24794a)}.w-status-warn{color:var(--dsw-alias-state-warning-primary,#8a5a00)}.w-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;width:100%;max-width:580px;padding:48px 24px;margin:auto;min-height:280px;overflow-wrap:anywhere}.w-empty>svg{color:var(--w-muted)}.w-empty h2{font-size:20px}.w-empty .w-muted{font-size:14px}.w-empty .w-toolbar{justify-content:center}
.w-split{display:grid;grid-template-columns:minmax(240px,var(--w-list-width)) minmax(0,1fr);min-height:460px;flex:1;min-width:0}.w-master{min-width:0;border-inline-end:1px solid var(--w-border);overflow:auto;padding-bottom:24px}.w-detail{min-width:0;padding:26px 28px;overflow:auto;overflow-wrap:anywhere;display:flex;flex-direction:column}.w-master-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:20px 16px}.w-search{display:flex;align-items:center;gap:8px;border:1px solid var(--w-border);border-radius:8px;padding:0 10px;min-width:0;flex:1;background:var(--w-bg)}.w-search>svg{color:var(--w-muted);flex-shrink:0}.dshw .w-search>input{border:0!important;background:transparent!important;padding:8px 0!important;width:100%;outline-offset:0}.w-row{display:flex;gap:0;min-width:0;position:relative;border-bottom:1px solid var(--w-border);border-inline-start:3px solid transparent}.w-row-select{display:flex;align-items:flex-start;padding:21px 0 0 14px}.dshw .w-row-button{display:flex;flex-direction:column;align-items:stretch;gap:7px;text-align:start;width:100%;padding:18px 18px 18px 16px;border:0;background:transparent;color:inherit;min-width:0;cursor:pointer;line-height:1.5}.dshw .w-row-button:hover{background:var(--w-soft)}.w-row-head{display:flex;align-items:flex-start;gap:10px;justify-content:space-between;min-width:0}.w-row-head>strong{font-size:14px;line-height:1.5;font-weight:600;overflow-wrap:anywhere}.w-row-meta,.w-row-description{color:var(--w-muted);font-size:12px;line-height:1.6;overflow-wrap:anywhere}.w-row-description{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.w-selected{background:var(--w-selected);border-inline-start-color:var(--w-accent)}.w-back{display:none!important}.w-detail-title{margin-bottom:12px!important}.w-detail-meta{color:var(--w-muted);font-size:13px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.w-detail-footer{padding:24px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:auto;border-top:1px solid var(--w-border)}.w-detail-footer .w-muted{flex:1;min-width:160px}.w-definition{display:grid;grid-template-columns:minmax(80px,120px) minmax(0,1fr);gap:8px 16px;font-size:14px;margin:20px 0}.w-definition dt{color:var(--w-muted)}.w-definition dd{margin:0;min-width:0;overflow-wrap:anywhere}
.w-switch-label{display:inline-flex;align-items:center;gap:8px;font-size:13px;position:relative;cursor:pointer}.w-switch-label>input{position:absolute;opacity:0;inset-inline-end:0;width:36px!important;height:22px!important;margin:0;cursor:pointer}.w-switch-track{width:36px;height:22px;border-radius:12px;display:block;background:var(--w-border);border:1px solid var(--w-border);pointer-events:none;padding:2px;transition:background .15s}.w-switch-track:before{content:'';display:block;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 2px #0002;transition:transform .15s}.w-switch-label>input:checked+.w-switch-track{background:var(--w-accent);border-color:var(--w-accent)}.w-switch-label>input:checked+.w-switch-track:before{transform:translateX(14px)}.w-switch-label>input:focus-visible+.w-switch-track{outline:2px solid var(--w-accent);outline-offset:3px}.w-switch-label:has(>input:disabled){opacity:.5;cursor:not-allowed}
.w-overlay{position:fixed;inset:0;background:#0005;display:flex;justify-content:flex-end;z-index:1000;padding:12px;overflow:auto}.w-dialog{width:min(620px,100%);max-height:100%;display:flex;flex-direction:column;min-height:0;background:var(--w-bg);color:var(--w-text);border:1px solid var(--w-border);border-radius:12px;box-shadow:0 18px 70px #0003}.w-dialog-header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px;border-bottom:1px solid var(--w-border);flex-shrink:0}.w-dialog-header>h2{font-size:20px}.w-dialog-body{overflow:auto;padding:20px 24px;min-height:0}.w-editor-grid{display:grid;grid-template-columns:210px minmax(0,1fr) 300px;min-height:500px;flex:1}.w-editor-list{padding:20px 12px;border-inline-end:1px solid var(--w-border);min-width:0}.w-editor-canvas{background:var(--w-soft);padding:20px;min-width:0;display:flex;flex-direction:column;gap:14px}.w-editor-inspector{padding:24px;border-inline-start:1px solid var(--w-border);min-width:0;overflow:auto}.w-editor-inspector h3{margin-bottom:18px}.w-preview-empty{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:12px;aspect-ratio:16/9;min-height:180px;background:var(--w-soft);border:1px solid var(--w-border);border-radius:8px;padding:24px;color:var(--w-muted)}.w-content-pad{padding:24px 0}.w-stack{display:flex;flex-direction:column;gap:16px;min-width:0}.w-scroll-x{overflow:auto;max-width:100%}
@container dsh-workbench (max-width:1000px){.w-editor-grid{grid-template-columns:160px minmax(0,1fr)}.w-editor-inspector{grid-column:1/-1;border-inline-start:0;border-top:1px solid var(--w-border)}.w-header-actions{max-width:60%}.w-split{grid-template-columns:minmax(240px,32%) minmax(0,1fr)}}
@container dsh-workbench (max-width:760px){.w-page-header{gap:14px;flex-wrap:wrap;padding-bottom:18px}.w-heading{flex:1;min-width:170px}.dshw h1{font-size:24px}.w-header-actions{max-width:100%;justify-content:flex-start}.w-subtitle{font-size:13px}.w-tabs{gap:12px}.dshw .w-tabs>button{padding:10px 4px 12px}.w-split{display:block;min-height:360px}.w-split[data-selected=false]>.w-detail{display:none}.w-split[data-selected=true]>.w-master{display:none}.w-master{border-inline-end:0}.w-detail{padding:20px 0}.w-back{display:inline-flex!important;align-self:flex-start;margin:0 0 16px!important}.w-detail h2{font-size:22px}.w-master-toolbar{padding:16px 0}.dshw .w-row-button{padding:16px 10px}.w-detail-footer{position:static}.w-detail-footer .w-muted{flex-basis:100%}.w-editor-grid{display:flex;flex-direction:column}.w-editor-list{border-inline-end:0;border-bottom:1px solid var(--w-border);padding:16px 0}.w-editor-canvas{padding:16px 0;background:var(--w-bg)}.w-editor-inspector{padding:20px 0}.w-dialog-header,.w-dialog-body{padding:16px}.w-button{min-height:40px}.w-definition{grid-template-columns:80px minmax(0,1fr)}}
@media(max-width:700px){.w-page[data-main=true]{padding:calc(16px + var(--dsh-frame-top-clearance,0px)) 16px 0 max(16px,var(--dsh-frame-leading-clearance,0px))}.w-overlay{padding:8px}.w-dialog{width:100%}}
@media(prefers-reduced-motion:reduce){.dshw *,.dshw *:before{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
  function Styles() { return h('style', null, styles); }
  return { Icon, Button, IconButton, Page, Tabs, Status, Empty, Split, Row, Search, Switch, Dialog, Styles, register, styles };
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
  const client = [...pool.clients].find(client => typeof client.Footer === 'function' && client.has(name));
  if (!client) return null;
  return React.createElement(client.Footer, { name });
}
function __stardustUpdatesFooter(React, name) {
  return React.createElement(__StardustPluginUpdatesFooter, { key: 'plugin-updates', React, name });
}
function __stardustUpdatesInlinePage(React, element, name) {
  return React.cloneElement(element, null, element.props.children, __stardustUpdatesFooter(React, name));
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
  const suiteUpdating = next.job?.name === '@stardustlc/dsh-suite' && ['verifying', 'installing', 'cancelling', 'unknown', 'restore-failed'].includes(next.job?.state);
  const suite = next.rows.find(row => row.name === '@stardustlc/dsh-suite' && (row.enabled || suiteUpdating));
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
      // The optional alpha.3 slot stays dormant in older hosts; its scoped
      // injection unregisters naturally when the plugin is unloaded.
      if (participant.iconData && participant.sectionIds?.length && typeof ctx.inject === 'function') ctx.inject(['slots'], host => {
        for (const id of new Set(participant.sectionIds)) host.slots.inject('settings.section.icon', () => host.slots.register({ name: 'settings.section.icon', id }, function PluginSettingsIcon({ size = 20 }) {
          return React.createElement('img', { src: participant.iconData, alt: '', 'aria-hidden': true, width: size, height: size, style: { objectFit: 'contain', display: 'block', flexShrink: 0 } });
        }));
      });
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
    record = { refs: new Map(), timer: null, version: participant.version, alive: true, hold: false, uiRevision: 10, migration: Promise.resolve() };
    pools.set(root, record);
    __stardustUpdatesActivate(record, pools, root, React, require);
  } else if ((record.uiRevision || 0) < 10 && !record.upgrading) {
    // An earlier loaded participant may still own an older client revision. Keep
    // its references and draft guards, wait for any admitted install, then
    // replace that one client fiber instead of running two window heartbeats.
    const shared = record;
    const previousMigration = record.migration;
    record.upgrading = record.migration = Promise.resolve(previousMigration).then(async () => {
      while (shared.alive && shared.hold) await new Promise(resolve => setTimeout(resolve, 500));
      if (!shared.alive || !shared.refs.size) return;
      await shared.fiber?.dispose?.();
      if (!shared.refs.size) return;
      shared.alive = true; shared.uiRevision = 10; pools.set(root, shared);
      __stardustUpdatesActivate(shared, pools, root, React, require);
    }).catch(() => { /* The original page remains usable if host disposal fails. */ });
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
function __stardustUpdatesActivate(shared, pools, root, React, require) {
  shared.fiber = root.plugin({ name: 'stardustlc-plugin-updates-client', inject: ['slots', 'locale', 'remote', 'remote.pluginManager'], apply(ctx) {
    const client = __stardustUpdatesClient(ctx, React, require, shared);
    ctx.effect(() => () => { shared.alive = false; client.dispose(); if (pools.get(root) === shared) pools.delete(root); });
  } });
  Promise.resolve(shared.fiber).catch(() => { shared.alive = false; if (pools.get(root) === shared) pools.delete(root); });
}
function __stardustUpdatesClient(ctx, React, require, shared) {
  const h = React.createElement, W = createWorkbenchUI(React), route = new URL('api/stardustlc/plugin-updates', document.baseURI);
  const { useState, useEffect, useRef } = React, id = crypto.randomUUID(), listeners = new Set(), pool = __stardustUpdatesGuards(), requests = new Set(), notified = new Set(), knownRows = new Map();
  let alive = true, registered = false, state = null, lastInteraction = Date.now(), inPoll = false, manualOperation = false, legacyHint = null;
  const language = () => String(ctx.locale?.getSnapshot?.().active || '').startsWith('en') ? 'en' : 'zh';
  const t = (zh, en) => language() === 'en' ? en : zh;
  const REPOS = { 'dsh-calendar': 'dsh-calendar', 'dsh-cite': 'dsh-cite', 'dsh-code-security': 'dsh-code-security', 'dsh-codex-port': 'dsh-codex-port', 'deepseek-computer-use': 'deepseek-computer-use', 'dsh-dingtalk': 'dsh-dingtalk', '@stardustlc/dsh-docker': 'dsh-docker', '@stardustlc/dsh-dream': 'dsh-dream', 'dsh-email': 'dsh-email', 'dsh-ffmpeg': 'dsh-ffmpeg', 'dsh-flakefinder': 'dsh-flakefinder', 'dsh-hyperframes': 'dsh-hyperframes', 'dsh-minimal-ptc': 'dsh-minimal-ptc', 'dsh-ppt': 'dsh-ppt', 'dsh-remotion': 'dsh-remotion', '@stardustlc/dsh-review': 'dsh-review', 'dsh-rss': 'dsh-rss', 'dsh-slack': 'dsh-slack', 'dsh-sql': 'dsh-sql', '@stardustlc/dsh-suite': 'dsh-suite', 'dsh-voice': 'dsh-voice' };
  const repoUrl = pkg => Object.hasOwn(REPOS, pkg) ? 'https://github.com/STARDUSTLC666/' + REPOS[pkg] : null;
  const preferences = name => state?.preferences.packages[name] || { checkEnabled: true, autoInstall: false, autoScope: 'compatible', deferredUntil: 0, ignoredVersion: null };
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
    const dialog = [...document.querySelectorAll('[role="dialog"],dialog[open]')].some(node => node.getClientRects().length && !(manual && (node.closest('.plugin-updates-footer,.plugin-updates-reminder') || node.querySelector('.plugin-updates-footer,.plugin-updates-reminder'))));
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
  const STALE_CHECK_MS = 30 * 60 * 1000, STALE_RETRY_MS = 5 * 60 * 1000, staleChecks = new Map(), staleInFlight = new Set();
  function refreshIfStale(row) {
    if (!alive || !row || row.sourceKind !== 'registry' || row.bundledBy || !row.available || row.updating) return;
    const now = Date.now();
    if (row.checkedAt && now - row.checkedAt <= STALE_CHECK_MS) return;
    if (staleInFlight.has(row.name) || now - (staleChecks.get(row.name) ?? -Infinity) < STALE_RETRY_MS) return;
    staleChecks.set(row.name, now);
    staleInFlight.add(row.name);
    void (async () => {
      try { await api({ action: 'check', name: row.name }); await refresh(); }
      catch { /* Offline or transient errors stay silent and throttled by staleChecks. */ }
      finally { staleInFlight.delete(row.name); }
    })();
  }
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
      'release-changed': t('发现更新的发布版本（或发布信息已更新），已刷新至最新状态，请再次确认安装。', 'A newer release or updated metadata was found and refreshed; confirm again to install.'),
      'preferences-conflict': t('另一个窗口修改了偏好，已刷新，请重试。', 'Preferences changed in another window. They have been refreshed; retry.'),
      'preferences-unreadable': t('更新偏好文件无法读取，自动安装已关闭。请检查当前 profile 的 stardustlc-plugin-updates.json。', 'Preferences could not be read. Automatic installation is off. Check stardustlc-plugin-updates.json in this profile.'),
      'no-update': t('版本已变化或暂不兼容，请重新检查。', 'The version changed or is incompatible. Check again.'),
      'source-not-registry': t('本地源码、Git 等安装，请通过原安装方式更新。', 'Update local, Git and other external sources through their original installation method.'),
      'managed-by-suite': t('这个插件随 Suite 安装，通过 Suite 更新。', 'This plugin was installed through Suite and is updated through Suite.'),
      'owner-required': t('只有 profile 拥有者能管理更新。', 'Only the profile owner can manage updates.'),
      'version-mismatch': t('宿主装入的版本与目标不同。请重新检查版本和软件源策略。', 'The installed version differs from the target. Check the release and registry policy.'),
      'unexpected-package': t('宿主装入的包或版本与目标不同。请检查版本和软件源策略。', 'The installed package or version differed from the target. Check the release and registry policy.'),
      'version-unconfirmed': t('尚未确认新版已加载，请在插件详情中检查当前版本。', 'The new version could not be confirmed. Check the installed version in plugin details.'),
      'build-blocked': t('构建脚本等待批准。请查看原生插件管理中的安装提示。', 'Build scripts await approval. Review the install details in native plugin management.'),
      'bundle-in-use': t('宿主暂时无法热卸载旧版（通常因本轮刚更新过其他共用底层依赖的插件，内存路径待刷新；或同时启用了包含此组件的组合包）：直接手动重启一次 DSH 即可继续更新，无需逐个停用插件。', 'The host cannot hot-unload the previous version right now (usually because another plugin sharing dependencies was updated earlier in this session, or a bundle containing this component is also active): restart DSH once and retry without disabling plugins one by one.'),
      'already-installed': t('该包已在当前配置中，请刷新或重启 DSH 后查看当前版本。', 'This package is already present in the profile; refresh or restart DSH to inspect its version.'),
      'incompatible-version': t('目标版本与当前运行的 DSH 版本不兼容。', 'The target version is incompatible with the running DSH version.'),
      'stop-profile': t('当前配置未启用热重载，需关闭 DSH 后再通过命令行更新。', 'This profile runs without hot reload; stop DSH and update via CLI.'),
      'not-removable': t('此内置或受保护插件不支持在此处移除替换。', 'This built-in or protected bundle cannot be replaced here.'),
      'pkg-network': t('连接 npm 源时网络中断，请稍后重试。', 'Network error reaching the package registry. Retry shortly.'),
      'pkg-timeout': t('包管理器请求超时，请检查网络后重试。', 'Package manager request timed out. Check your connection and retry.'),
      'pkg-not-found': t('未找到目标版本或已被源撤回，请重新检查更新。', 'Target release was not found on the registry. Check again.'),
      'pkg-no-matching-version': t('没有匹配当前兼容性要求的已发布版本。', 'No published version matches the compatibility constraints.'),
      'pkg-integrity': t('下载包的完整性校验未通过，已放弃安装，请重试。', 'Package integrity verification failed. Installation aborted; retry.'),
      'pkg-disk-full': t('磁盘空间不足，请清理后重试。', 'Disk space is full. Free disk space and retry.'),
      'pkg-permission': t('无权写入当前 profile 目录，请检查文件权限。', 'Permission denied writing to this profile directory.'),
      'pkg-pnpm-missing': t('未检测到可用的 pnpm，请在环境或宿主插件设置中检查。', 'pnpm is unavailable to the host package manager.'),
      'operation-error': t('宿主包管理器未能完成操作，可在原生「插件」详情页点击更新查看完整日志。', 'Host package manager did not complete the operation. Retry from native plugin details to inspect logs.'),
    })[code] || t('操作未完成，请刷新后重试。DSH 不会因此自动重启。', 'The operation could not be completed. Refresh and retry. DSH will not restart automatically.');
  }
  function reasonOf(job) {
    if (!job) return null;
    if (job.reason) return job.reason;
    const res = job.outcome?.result;
    if (res?.pendingBuilds || res?.failureKind === 'build-blocked') return 'build-blocked';
    if (res?.failureKind && ['network', 'timeout', 'not-found', 'no-matching-version', 'integrity', 'pnpm-missing', 'disk-full', 'permission'].includes(res.failureKind)) return 'pkg-' + res.failureKind;
    return res?.error?.code || null;
  }
  // releaseOf() keeps the failing engine/peer range check as a stable code; say which
  // environment has to change instead of only reporting that the release is incompatible.
  function requirement(release) {
    return ({
      'dsh-version': t('需要换成与该版本匹配的 DSH 本体', 'it needs a different DSH version'),
      'node-version': t('需要换成与该版本匹配的 Node.js', 'it needs a different Node.js version'),
      deprecated: t('作者已把这个版本标记为弃用', 'the author marked this release as deprecated'),
      'not-bundle': t('这个版本不是可加载的 DSH 插件包', 'this release is not a loadable DSH plugin bundle'),
    })[release?.reason] || t('发布元数据的兼容范围与当前环境不符', 'its published compatibility range does not match this environment');
  }
  function jobLabel(job) {
    if (job.state === 'installing') {
      const phase = ({
        checking: t('宿主正在检查版本', 'Host checking release'),
        removing: t('正在卸载旧版', 'Unloading the previous version'),
        applying: t('正在加载新版', 'Loading the new version'),
        restoring: t('正在恢复旧版', 'Restoring the previous version'),
      })[job.phase];
      if (phase) return phase;
    }
    return ({ verifying: t('正在核对版本', 'Verifying release'), installing: t('正在安装', 'Installing'), cancelling: t('正在请求取消', 'Requesting cancellation'), complete: t('已更新', 'Updated'), 'restart-required': t('已安装，等待你手动重启', 'Installed; manual restart needed'), restored: t('更新未成功，已恢复原版本', 'Update failed; previous version restored'), 'restore-failed': t('恢复未成功，请检查官方插件管理', 'Recovery failed; check native plugin management'), unknown: t('结果未确认，请检查官方插件管理', 'Result unconfirmed; check native plugin management'), cancelled: t('已取消', 'Cancelled'), failed: t('更新未成功', 'Update failed') })[job.state] || job.state;
  }
  const FOOTER_CSS = '.plugin-updates-footer{box-sizing:border-box;flex-shrink:0;margin-top:16px;padding-top:14px;border-top:var(--dsh-control-border-width,0.5px) solid var(--dsw-alias-border-l2,var(--dsw-alias-border-l3,#e5e7eb));min-width:0;max-width:100%;color:var(--dsw-alias-label-primary,#202124)}'
    + '.dshw.plugin-updates-footer.is-inline{display:block!important;width:100%!important;max-width:100%!important;margin-block:auto 0!important;margin-inline:0!important;padding:6px 14px!important;border-top:var(--dsh-control-border-width,0.5px) solid var(--dsw-alias-border-l2,var(--dsw-alias-border-l3,#e5e7eb));background:var(--dsw-alias-bg-layer-1,var(--w-soft,#f7f8fa));font-size:12px;line-height:1.45}'
    + '.plugin-updates-footer .updates-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px 12px;min-block-size:28px;min-width:0}'
    + '.plugin-updates-footer .updates-bar-info,.plugin-updates-footer .updates-bar-actions,.plugin-updates-footer .updates-head-actions,.plugin-updates-footer .updates-title-row{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;min-width:0}'
    + '.plugin-updates-footer .updates-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 12px}'
    + '.plugin-updates-footer .updates-compact-bar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px 12px}'
    + '.plugin-updates-footer .updates-compact-bar>.updates-options{margin-top:0;min-width:0}'
    + '.plugin-updates-footer .updates-compact-bar>.updates-options[open]{flex:1 1 100%}'
    + '.plugin-updates-footer h2{font-size:13.5px;line-height:1.4;margin:0;font-weight:600}'
    + '.plugin-updates-footer .updates-pill{display:inline-flex;align-items:center;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:600;line-height:1.5;background:var(--dsw-alias-bg-layer-2,var(--w-soft,#eef1f6));color:var(--dsw-alias-label-secondary,#657080)}'
    + '.plugin-updates-footer .updates-pill.is-accent{background:color-mix(in srgb,var(--w-accent,#4f6bdb) 14%,transparent);color:var(--w-accent,#4f6bdb)}'
    + '.plugin-updates-footer .updates-pill.is-error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ad3636) 14%,transparent);color:var(--dsw-alias-state-error-primary,#ad3636)}'
    + '.plugin-updates-footer .updates-mono,.plugin-updates-footer .updates-subtitle,.plugin-updates-footer .updates-version{font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere;margin:0}'
    + '.plugin-updates-footer .updates-badge{padding:1px 6px;border-radius:5px;background:var(--dsw-alias-bg-layer-2,var(--w-soft,#eef1f6));color:var(--dsw-alias-label-secondary,#657080)}'
    + '.plugin-updates-footer .updates-meta-line,.plugin-updates-footer .updates-note{margin:3px 0 0;font-size:12px;line-height:1.55}'
    + '.plugin-updates-footer .updates-inline-msg.is-error{color:var(--dsw-alias-state-error-primary,#ad3636);font-size:12px}'
    + '.plugin-updates-footer .w-button.is-sm{min-block-size:26px;min-inline-size:26px;min-height:26px;padding:3px 9px;font-size:12px;gap:5px;border-radius:6px}'
    + '.plugin-updates-footer .updates-options{margin-top:8px}'
    + '.plugin-updates-footer .updates-options>summary{cursor:pointer;display:inline-flex;align-items:center;gap:0.55ch;min-block-size:24px;font-size:12px;line-height:1.5;font-weight:500;color:var(--dsw-alias-label-secondary,#657080);list-style:none}'
    + '.plugin-updates-footer .updates-options>summary:after{display:none}'
    + '.plugin-updates-footer .updates-options>summary::before{content:"";inline-size:6px;block-size:6px;flex-shrink:0;border-inline-end:1.5px solid currentColor;border-block-end:1.5px solid currentColor;rotate:-45deg}'
    + '.plugin-updates-footer .updates-options>summary:dir(rtl)::before{rotate:135deg}'
    + '.plugin-updates-footer .updates-options[open]>summary::before{rotate:45deg}'
    + '.plugin-updates-footer .updates-options>summary:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#6b79df);outline-offset:3px;border-radius:4px}'
    + '.plugin-updates-footer details::details-content{interpolate-size:allow-keywords;overflow:clip;contain:layout}'
    + '.plugin-updates-footer details:not([open])::details-content{block-size:0}'
    + '.plugin-updates-footer .updates-settings{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:14px;padding:10px 0 2px}'
    + '.plugin-updates-footer>.w-section{margin:8px 0 0;padding:0;border:0}'
    + '.plugin-updates-footer .w-toolbar{margin-top:8px!important}'
    + '.plugin-updates-footer .w-switch-label{max-width:100%;gap:12px;align-items:flex-start}'
    + '.plugin-updates-footer .w-switch-track{flex-shrink:0}'
    + '.plugin-updates-footer .updates-notes{margin-top:8px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l3,#e5e7eb);border-radius:8px;background:var(--dsw-alias-bg-base,var(--w-bg,#fff))}'
    + '.plugin-updates-footer .updates-notes pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;overflow:auto;margin:6px 0;padding:10px;font:12px/1.65 ui-monospace,monospace}'
    + '.plugin-updates-footer .updates-notes pre code{font:inherit;background:transparent;padding:0}'
    + '.plugin-updates-footer .updates-links{display:flex;flex-wrap:wrap;align-items:center;gap:4px 14px;margin-top:10px;padding-top:8px;border-top:1px dashed var(--dsw-alias-border-l3,#e5e7eb);font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#657080)}'
    + '.plugin-updates-footer .updates-links a{color:inherit;text-decoration:none;display:inline-flex;align-items:center;min-block-size:24px;gap:4px}'
    + '.plugin-updates-footer .updates-links a:hover{color:var(--dsw-alias-label-primary,#202124);text-decoration:underline}'
    + '.plugin-updates-footer .updates-links a:focus-visible{outline:2px solid var(--dsw-focus-ring-color,#6b79df);outline-offset:3px;border-radius:4px}'
    + '.plugin-updates-footer .w-overlay,.plugin-updates-reminder .w-overlay{z-index:1002}'
    + '.plugin-updates-reminder{position:fixed;inset-inline-end:64px;inset-block-end:16px;z-index:998;box-sizing:border-box;width:min(400px,calc(100vw - 80px));padding:11px 13px;border-radius:10px;border:var(--dsh-control-border-width,1px) solid var(--dsw-alias-border-l2,#d8dee9);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#202124);box-shadow:0 8px 24px rgba(15,23,42,.12);font-size:12px;line-height:1.5}'
    + '.plugin-updates-reminder .reminder-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}'
    + '.plugin-updates-reminder .reminder-title{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0;font-weight:600;font-size:12.5px}'
    + '.plugin-updates-reminder .reminder-close{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#657080);cursor:pointer;padding:2px 5px;border-radius:5px;font-size:14px;line-height:1}'
    + '.plugin-updates-reminder .reminder-close:hover{background:var(--dsw-alias-bg-layer-2,#eef1f6);color:var(--dsw-alias-label-primary,#202124)}'
    + '.plugin-updates-reminder .reminder-actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:8px}'
    + '.plugin-updates-reminder .w-button.is-sm{min-block-size:26px;min-inline-size:26px;min-height:26px;padding:3px 9px;font-size:12px;gap:5px;border-radius:6px}'
    + '.plugin-updates-reminder .updates-pill{display:inline-flex;align-items:center;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:600;line-height:1.5;background:color-mix(in srgb,var(--w-accent,#4f6bdb) 14%,transparent);color:var(--w-accent,#4f6bdb)}'
    + '.plugin-updates-reminder .updates-pill.is-error{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#ad3636) 14%,transparent);color:var(--dsw-alias-state-error-primary,#ad3636)}'
    + '.plugin-updates-reminder .updates-mono{font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}'
    + '.plugin-updates-reminder .updates-notes{margin-top:8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l3,#e5e7eb);border-radius:7px;background:var(--dsw-alias-bg-layer-1,#f7f8fa)}'
    + '.plugin-updates-reminder .updates-notes pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:160px;overflow:auto;margin:4px 0;padding:6px;font:11.5px/1.6 ui-monospace,monospace}'
    + '.plugin-updates-footer .updates-auto-nudge,.plugin-updates-reminder .updates-auto-nudge{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;margin-top:6px;font-size:12px;color:var(--dsw-alias-label-secondary,#657080)}'
    + '@media(pointer:coarse){.plugin-updates-footer .w-button.is-sm{min-block-size:32px;min-height:32px;padding:5px 11px}}'
    + '@media(prefers-reduced-motion:no-preference){.plugin-updates-footer .updates-options>summary::before{transition:rotate .18s ease}.plugin-updates-footer details::details-content{transition:block-size .22s ease,content-visibility .22s ease allow-discrete}}'
    + '@media(max-width:600px){.plugin-updates-footer .updates-head{gap:8px}.plugin-updates-footer .w-toolbar{gap:6px;flex-wrap:wrap}.plugin-updates-footer .w-button{max-width:100%}}'
    + '@media(max-width:560px){.plugin-updates-reminder{inset-inline-end:16px;width:min(400px,calc(100vw - 32px))}}';
  function FooterFrame({ name, label, inline = false, supplement = false, head, children }) {
    useEffect?.(() => {
      const sync = () => { if (alive) for (const fn of listeners) fn(); };
      void Promise.resolve().then(sync);
      return () => { void Promise.resolve().then(sync); };
    }, []);
    return h('section', { className: 'dshw plugin-updates-footer' + (inline ? ' is-inline' : ''), 'data-plugin-update-footer': name, 'aria-label': label + (supplement ? t(' · 自动更新与反馈', ' · Auto-update and feedback') : t(' · 版本与更新', ' · Version and updates')) },
      h('style', null, W.styles),
      h('style', null, FOOTER_CSS),
      head, children);
  }
  function Panel({ name, inline = false }) {
    const snapshot = useSnapshot(), [error, setError] = useState(''), [working, setWorking] = useState(false), [checking, setChecking] = useState(false), [dialog, setDialog] = useState(null), [selectedVersion, setSelectedVersion] = useState(null), [notes, setNotes] = useState(null), [notesOpen, setNotesOpen] = useState(false), [loadingNotes, setLoadingNotes] = useState(false), [dismissedJobId, setDismissedJobId] = useState(null);
    const seenActiveJob = useRef ? useRef(null) : { current: null };
    const row = rowFor(name), original = originalRow(name), target = row?.name || name, prefs = preferences(target), job = snapshot?.job?.name === target ? snapshot.job : null;
    if (job && ['verifying', 'installing', 'cancelling'].includes(job.state)) seenActiveJob.current = job.id;
    const panelStaleTarget = !!snapshot && !!row && !!original && (!inline || (row.sourceKind === 'registry' && row.available && prefs.deferredUntil <= Date.now() && prefs.ignoredVersion !== row.release?.version));
    useEffect(() => { if (panelStaleTarget && !activeJob()) refreshIfStale(row); }, [panelStaleTarget, row?.name, row?.available, row?.checkedAt]);
    async function perform(callback) { setError(''); setWorking(true); try { await callback(); await refresh(); } catch (error) { setError(error.message); await refresh().catch(() => {}); } finally { setWorking(false); } }
    async function save(changes, consent) { await api({ action: 'preferences', name: target, revision: state.preferences.revision, changes, consent }); }
    async function check() { setError(''); setChecking(true); try { staleChecks.set(target, Date.now()); await api({ action: 'check', name: target }); await refresh(); } catch (error) { setError(error.message); } finally { setChecking(false); } }
    async function runOperation(request) {
      setDialog(null); manualOperation = true; notify();
      setError(''); setWorking(true);
      try {
        try {
          await heartbeat();
          const started = await api(request);
          seenActiveJob.current = started.id;
          while (alive) {
            await new Promise(resolve => setTimeout(resolve, 800)); await heartbeat(); await refresh();
            if (state.job?.id !== started.id) throw new Error('operation-unconfirmed');
            if (!activeJob()) break;
          }
          await refresh();
        } finally { manualOperation = false; notify(); }
      } catch (err) {
        setError(err.message);
        if (request.action === 'install' && ['check-first', 'release-changed'].includes(err?.message)) {
          staleChecks.set(target, Date.now());
          await api({ action: 'check', name: target }).catch(() => {});
        }
        await refresh().catch(() => {});
      } finally { setWorking(false); }
    }
    async function showNotes() {
      if (notesOpen) { setNotesOpen(false); return; }
      setNotesOpen(true); setNotes(null); setLoadingNotes(true); setError('');
      try { setNotes(await api({ action: 'notes', name: target, version: row.release.version })); } catch (error) { setError(error.message); } finally { setLoadingNotes(false); }
    }
    if (inline && (!snapshot || !row || !original)) return null;
    if (!snapshot) return h('p', { className: 'dshw w-muted' }, t('正在读取更新状态…', 'Loading update status…'));
    if (!row || !original) return h(W.Status, null, t('此插件尚未安装或已从当前 profile 移除。', 'This plugin is not installed in the current profile.'));
    const title = language() === 'en' ? original.labelEn : original.label;
    const ownPage = pageState(true), unconfirmed = ['unknown', 'restore-failed'].includes(snapshot.job?.state);
    const staleWindows = (snapshot.pages.clients || []).some(client => !client.fresh);
    const pageBusy = ownPage.busy || (snapshot.pages.clients || []).some(client => client.id !== id && client.busy);
    const installLocked = working || activeJob() || unconfirmed || snapshot.updaterRestart || snapshot.preferenceError || !snapshot.activity.known
      || snapshot.activity.busy || snapshot.pages.dirty || ownPage.dirty || pageBusy || !snapshot.pages.known;
    const checkingThis = checking || snapshot.checkingNames?.includes(target);
    const managed = row.sourceKind === 'registry';
    const showUpdate = managed && row.available;
    const deferred = prefs.deferredUntil > Date.now();
    const ignored = !!row.release?.version && prefs.ignoredVersion === row.release.version;
    const actionableUpdate = showUpdate && !deferred && !ignored;
    const canConfirm = showUpdate && row.release?.version === selectedVersion && !installLocked && !row.loadError;
    const isSuite = target === '@stardustlc/dsh-suite';
    const jobResult = job?.outcome?.result;
    const jobReason = reasonOf(job);
    const jobActiveThis = !!job && ['verifying', 'installing', 'cancelling'].includes(job.state);
    const canCancel = jobActiveThis && !['applying', 'restoring'].includes(job.phase);
    const jobAttentionThis = !!job && ['restart-required', 'restored', 'restore-failed', 'unknown', 'failed'].includes(job.state) && (unconfirmed || dismissedJobId !== job.id);
    const jobJustCompleted = !!job && job.state === 'complete' && seenActiveJob.current === job.id && dismissedJobId !== job.id;
    const canSuggestAuto = !!job && job.state === 'complete' && !jobReason && job.mode !== 'automatic' && (!prefs.autoInstall || prefs.autoScope !== 'compatible') && managed && !snapshot.preferenceError && dismissedJobId !== job.id;
    const inlineJobVisible = jobActiveThis || jobAttentionThis || jobJustCompleted;
    if (inline && !actionableUpdate && !inlineJobVisible && !working && !checking && !error && !dialog && !notesOpen) return null;
    const notesSection = notesOpen && h('section', { className: 'updates-notes', 'aria-label': t('更新记录', 'Release notes') },
      h('strong', null, target + ' · ' + (notes?.version || row.release?.version || '')),
      loadingNotes ? h('p', { className: 'w-muted updates-note' }, t('正在读取…', 'Loading…'))
        : notes?.text ? h('pre', { tabIndex: 0, role: 'region', 'aria-label': t('更新记录内容', 'Release notes content') }, h('code', null, notes.text))
        : h('p', { className: 'w-muted updates-note' }, t('未找到此版本的独立更新记录。', 'No separate notes were found for this version.')),
      notes?.url && h('a', { href: notes.url, target: '_blank', rel: 'noreferrer noopener' }, t('查看仓库更新记录', 'View repository changelog')));
    const windowsDialog = dialog === 'windows' && h(W.Dialog, { title: t('断开的窗口都已关闭？', 'Are the disconnected windows closed?'), closeLabel: t('关闭', 'Close'), onClose: () => setDialog(null) },
      h('div', { className: 'w-stack' }, h('p', null, t('只清除超过 45 秒未回应的其他窗口记录。请先确认它们已经关闭；仍在使用的窗口请保存修改并刷新。当前或仍在回应的窗口保护会保留。', 'Only other windows silent for over 45 seconds are cleared. Confirm that they are closed; save and refresh windows still in use. Current and responsive windows remain protected.')), h('div', { className: 'w-toolbar' }, h(W.Button, { onClick: () => setDialog(null) }, t('取消', 'Cancel')), h(W.Button, { onClick: () => { setDialog(null); void perform(() => api({ ...pageState(true), action: 'reconfirm-windows', confirmation: 'other-stale-windows-are-closed' })); } }, t('已关闭，重新确认状态', 'They are closed; reconfirm')))));
    const confirmDialog = ['automatic', 'install'].includes(dialog) && h(W.Dialog, { title: dialog === 'automatic' ? (isSuite ? t('允许 Suite 空闲时自动热更新？', 'Allow idle automatic updates for Suite?') : t('允许这个插件空闲时自动热更新？', 'Allow idle automatic updates for this plugin?')) : (isSuite ? t('确认更新 Suite 整包', 'Confirm Suite bundle update') : t('确认更新此插件', 'Confirm this plugin update')), closeLabel: t('关闭', 'Close'), onClose: () => setDialog(null) },
      dialog === 'automatic' ? h('div', { className: 'w-stack' }, h('p', null, (language() === 'en' ? row.labelEn : row.label) + ' · ' + target), isSuite && h('p', null, t('此处设置作用于 Suite 整包（包含 18 个组件）。独立安装的其他插件不受影响。', 'This setting applies to the whole Suite (including its 18 components). Other independently installed plugins are unaffected.')), h('p', null, t('你正在主动启用自动安装。只处理通过当前 DSH 与 Node 兼容性校验的稳定版本（含功能小版本与补丁，跨主版本仍需手动确认）；有任务、未保存修改、未知窗口或等待重启时暂停。', 'You are explicitly enabling automatic installation for compatible stable releases (minor and patch updates matching this DSH and Node runtime; major upgrades still require manual confirmation). Running tasks, unsaved changes, unknown windows or a pending restart pause it.')), h('p', null, t('支持热更新时原地重载，不会自动重启 DSH；其他插件不会跟着开启，可随时关闭。', 'Hot-reloads in place when supported and never restarts DSH automatically. Other plugins remain unchanged; turn it off anytime.')), h('div', { className: 'w-toolbar' }, h(W.Button, { onClick: () => setDialog(null) }, t('保持关闭', 'Keep off')), h(W.Button, { variant: 'primary', onClick: () => { setDialog(null); void perform(() => save({ checkEnabled: true, autoInstall: true, autoScope: 'compatible' }, 'enable-idle-compatible-updates')); } }, t('允许空闲自动热更新', 'Allow idle automatic updates')))) :
      h('div', { className: 'w-stack' },
        isSuite && h('p', null, t('此处操作的是 Suite 整包，包含 18 个组件。独立安装的其他插件不受影响。', 'This action applies to the whole Suite, including its 18 components. Other independently installed plugins are unaffected.')),
        h('p', { className: 'updates-version' }, target + ' · ' + row.version + ' → ' + selectedVersion),
        h('p', null, selectedVersion === row.release?.version ? t('Harness 会热更新并重新加载；需要手动重启时，更新区会显示宿主结果，停用状态会保留。', 'Harness hot-updates and reloads in place. If a manual restart is needed, it appears in the update result; disabled status is preserved.') : (showUpdate && row.release?.version ? message('release-changed') : message('check-first'))),
        h('div', { className: 'w-toolbar' }, h(W.Button, { onClick: () => setDialog(null) }, t('取消', 'Cancel')),
          showUpdate && row.release?.version && row.release.version !== selectedVersion
            ? h(W.Button, { variant: 'primary', disabled: installLocked || row.loadError, onClick: () => { setError(''); setSelectedVersion(row.release.version); } }, t('更新为 v', 'Use v') + row.release.version)
            : h(W.Button, { variant: 'primary', disabled: !canConfirm, onClick: () => runOperation({ action: 'install', name: target, version: selectedVersion, confirmation: 'update-installed-plugin' }) }, t('安装此版本', 'Install this version')))));
    const checkButton = variant => h(W.Button, { variant, className: 'is-sm', icon: 'refresh', disabled: checkingThis || !managed, onClick: check }, checkingThis ? t('正在检查…', 'Checking…') : isSuite ? t('检查整包更新', 'Check Suite updates') : t('检查更新', 'Check for updates'));
    const recheckButton = variant => h(W.Button, { variant, className: 'is-sm', icon: 'refresh', disabled: checkingThis || !managed, onClick: check }, checkingThis ? t('正在检查…', 'Checking…') : t('重新检查', 'Check again'));
    const primary = showUpdate
      ? h(W.Button, { variant: 'primary', className: 'is-sm', icon: 'download', disabled: installLocked || row.loadError, onClick: () => { setError(''); if (job && !jobActiveThis && !unconfirmed) setDismissedJobId(job.id); setSelectedVersion(row.release.version); setDialog('install'); } }, (isSuite ? t('更新 Suite 至 v', 'Update Suite to v') : t('更新至 v', 'Update to v')) + row.release.version)
      : managed ? checkButton() : null;
    if (inline) {
      const lockHint = unconfirmed ? message('operation-unconfirmed')
        : snapshot.updaterRestart ? message('restart-required')
        : snapshot.preferenceError ? message('preferences-unreadable')
        : (snapshot.pages.dirty || ownPage.dirty) ? t('请先保存修改后再更新', 'Save changes before updating')
        : (snapshot.activity.busy || pageBusy) ? t('当前任务或对话框结束后可更新', 'Finish active task or dialog to update')
        : (!snapshot.activity.known || !snapshot.pages.known) ? t('等待窗口状态确认', 'Waiting for window confirmation')
        : '';
      return h(FooterFrame, { name, label: title, inline: true, head: h('div', { className: 'updates-bar' },
        h('div', { className: 'updates-bar-info' },
          inlineJobVisible
            ? h(React.Fragment, null,
              h('span', { className: 'updates-pill' + (jobActiveThis ? ' is-accent' : ['failed', 'restore-failed', 'unknown', 'restored'].includes(job.state) ? ' is-error' : '') }, jobLabel(job)),
              job.to && h('span', { className: 'updates-mono' }, (isSuite ? 'dsh-suite ' : '') + job.from + ' → ' + job.to),
              jobReason && h('span', { className: 'updates-inline-msg is-error' }, message(jobReason)))
            : actionableUpdate ? h(React.Fragment, null,
              h('span', { className: 'updates-pill is-accent' }, isSuite ? t('Suite 新版本', 'Suite update') : t('有新版本', 'Update available')),
              h('span', { className: 'updates-mono' }, (isSuite ? 'dsh-suite ' : '') + 'v' + row.version + ' → v' + row.release.version),
              lockHint && h('span', { className: 'w-muted' }, '· ' + lockHint)) : null,
          error && h('span', { className: 'updates-inline-msg is-error', role: 'alert' }, message(error))),
        h('div', { className: 'updates-bar-actions' },
          staleWindows && actionableUpdate && h(W.Button, { variant: 'ghost', className: 'is-sm', onClick: () => setDialog('windows') }, t('确认已关闭窗口', 'Confirm closed windows')),
          canCancel && h(W.Button, { className: 'is-sm', disabled: job?.state === 'cancelling', onClick: () => perform(() => api({ action: 'cancel', id: job.id })) }, t('取消更新', 'Cancel update')),
          !jobActiveThis && error === 'check-first' && managed && recheckButton(actionableUpdate ? 'ghost' : 'primary'),
          !jobActiveThis && actionableUpdate && row.release && h(W.Button, { variant: 'ghost', className: 'is-sm', onClick: showNotes, 'aria-expanded': notesOpen }, t('更新记录', 'Release notes')),
          !jobActiveThis && actionableUpdate && h(W.Button, { variant: 'ghost', className: 'is-sm', disabled: working, onClick: () => perform(() => api({ action: 'later', name: target, revision: state.preferences.revision })) }, t('明天再提醒', 'Remind me tomorrow')),
          !jobActiveThis && actionableUpdate && h(W.Button, { variant: 'ghost', className: 'is-sm', disabled: working, onClick: () => perform(() => api({ action: 'ignore', name: target, revision: state.preferences.revision, version: row.release.version })) }, t('忽略此版', 'Ignore')),
          !jobActiveThis && actionableUpdate && primary,
          !jobActiveThis && !actionableUpdate && canSuggestAuto && h(W.Button, { variant: 'primary', className: 'is-sm', disabled: working, onClick: () => { setError(''); setDialog('automatic'); } }, t('开启空闲自动热更新', 'Enable idle auto-updates')),
          !jobActiveThis && !actionableUpdate && !unconfirmed && h(W.Button, { variant: 'ghost', className: 'is-sm', onClick: () => { setError(''); setNotesOpen(false); if (job) setDismissedJobId(job.id); } }, t('关闭', 'Dismiss')))) },
        notesSection, windowsDialog, confirmDialog);
    }
    function progress() {
      if (!job || (!jobActiveThis && !unconfirmed && dismissedJobId === job.id)) return null;
      if (job.state === 'complete' && !jobReason) {
        return job.to ? h('div', null,
          h('p', { className: 'w-muted updates-note' }, '✓ ' + jobLabel(job) + ' · ' + job.from + ' → ' + job.to + (job.mode === 'automatic' ? t(' · 自动更新', ' · Automatic update') : '')),
          canSuggestAuto && h('div', { className: 'updates-auto-nudge' },
            h('span', null, t('以后有兼容新版本时，需要空闲自动热更新吗？', 'Auto-install future compatible updates while idle?')),
            h(W.Button, { variant: 'ghost', className: 'is-sm', disabled: working, onClick: () => { setError(''); setDialog('automatic'); } }, t('开启空闲自动热更新', 'Enable idle auto-updates')),
            h(W.Button, { variant: 'ghost', className: 'is-sm', onClick: () => setDismissedJobId(job.id) }, t('关闭', 'Dismiss')))) : null;
      }
      return h('section', { className: 'w-section', role: 'status', 'aria-label': t('更新进度', 'Update progress') },
        h('h3', null, jobLabel(job)),
        job.to && h('p', { className: 'w-muted' }, job.from + ' → ' + job.to + (job.mode === 'automatic' ? t(' · 自动更新', ' · Automatic update') : '')),
        job.state === 'restart-required' && jobResult?.restartReason === 'package-moved' && h('p', { className: 'w-muted updates-note' }, t('新版已就绪；因多个独立插件共用底层依赖，请先手动重启一次 DSH 生效后再继续更新其他插件。', 'Installed; because standalone plugins share dependencies, restart DSH once before updating additional plugins.')),
        jobReason && h(W.Status, { tone: 'error' }, message(jobReason)),
        h('div', { className: 'updates-bar-actions', style: { marginTop: '6px' } },
          canCancel && h(W.Button, { className: 'is-sm', disabled: job.state === 'cancelling', onClick: () => perform(() => api({ action: 'cancel', id: job.id })) }, t('取消更新', 'Cancel update')),
          !jobActiveThis && !unconfirmed && h(W.Button, { variant: 'ghost', className: 'is-sm', onClick: () => setDismissedJobId(job.id) }, t('关闭提示', 'Dismiss'))));
    }
    function windowControls() {
      if (!staleWindows) return null;
      return h(W.Status, null, h('p', null, t('有窗口已断开，无法确认是否还有未保存修改。仍在使用的窗口请先保存并刷新；已关闭的窗口可以手动重新确认。', 'A disconnected window may contain unsaved changes. Save and refresh windows still in use. If they are closed, you can confirm that manually.')), h(W.Button, { className: 'is-sm', onClick: () => setDialog('windows') }, t('重新确认已关闭的窗口', 'Confirm closed windows')));
    }
    const incompatibleText = row.release && !row.release.compatible ? t('新版本暂不兼容当前环境：', 'Latest release is incompatible with this environment: ') + requirement(row.release) + (row.release.required ? ' (' + row.release.required + ')' : '') : '';
    const optionsSection = h('details', { className: 'updates-options' },
      h('summary', null, !original.bundledBy ? t('自动更新与提醒', 'Auto-update & reminders') : t('更新选项', 'Update options'), ' · ', prefs.checkEnabled ? t('自动检查：开', 'Checks: on') : t('自动检查：关', 'Checks: off'), ' · ', prefs.autoInstall ? (prefs.autoScope === 'compatible' ? t('空闲自动热更新：兼容版', 'Idle auto-update: compatible') : t('空闲自动热更新：仅补丁', 'Idle auto-update: patches')) : t('空闲自动热更新：关', 'Idle auto-update: off')),
      h('section', { className: 'updates-settings', 'aria-label': t('这个插件的更新偏好', 'Update preferences for this plugin') },
        h('div', null, h(W.Switch, { label: isSuite ? t('自动检查 Suite 整包更新', 'Automatically check Suite updates') : t('自动检查这个插件的更新', 'Automatically check this plugin'), checked: prefs.checkEnabled, disabled: working || !!snapshot.preferenceError || !managed, onChange: event => perform(() => save({ checkEnabled: event.target.checked })) }), h('p', { className: 'w-muted updates-note' }, t('默认开启，每 6 小时最多一次。只影响这个安装包，关闭后仍可手动检查。', 'On by default, at most every 6 hours. This affects only this bundle; manual checks remain available.'))),
        h('div', null, h(W.Switch, { label: isSuite ? t('空闲时自动热更新 Suite 兼容版本', 'Auto-install compatible Suite updates while idle') : t('空闲时自动热更新兼容版本', 'Auto-install compatible updates while idle'), checked: prefs.autoInstall, disabled: working || !!snapshot.preferenceError || !managed, onChange: event => event.target.checked ? (setError(''), setDialog('automatic')) : perform(() => save({ autoInstall: false })) }), h('p', { className: 'w-muted updates-note' }, t('默认关闭。明确开启后，仅在空闲且无未保存修改时热更新兼容稳定版（含功能小版本与补丁，不含跨主版本）。其他插件的开关不变。', 'Off by default. Explicitly enable compatible stable updates (minor and patch, excluding major) while idle with no unsaved changes. Other plugins’ settings stay unchanged.')), prefs.autoInstall && prefs.autoScope !== 'compatible' && h(W.Button, { variant: 'ghost', className: 'is-sm', disabled: working, onClick: () => { setError(''); setDialog('automatic'); } }, t('升级为包含兼容功能小版本', 'Include compatible minor updates')))));
    const errorStatus = error && h(W.Status, { tone: 'error' }, error === 'check-first' && managed ? h('div', { className: 'updates-bar-actions' }, h('span', null, message(error)), recheckButton('ghost')) : message(error));
    const linksNav = (() => {
      const ownRepo = repoUrl(original.name), suiteRepo = repoUrl('@stardustlc/dsh-suite'), starRepo = isSuite ? suiteRepo : ownRepo;
      if (!ownRepo && !starRepo) return null;
      return h('nav', { className: 'updates-links', 'aria-label': t('开源仓库与反馈', 'Repository and feedback') },
        starRepo && h('a', { href: starRepo, target: '_blank', rel: 'noreferrer noopener' }, isSuite ? t('★ 觉得好用？在 GitHub 给 dsh-suite 点个 Star', '★ Useful? Star dsh-suite on GitHub') : t('★ 觉得好用？在 GitHub 点个 Star', '★ Useful? Star on GitHub')),
        ownRepo && h('a', { href: ownRepo + '/issues', target: '_blank', rel: 'noreferrer noopener' }, t('提交建议 / 问题反馈', 'Feedback & issues')),
        isSuite && original.name !== '@stardustlc/dsh-suite' && ownRepo && h('a', { href: ownRepo, target: '_blank', rel: 'noreferrer noopener' }, t('组件仓库', 'Component repo')),
        !isSuite && suiteRepo && h('a', { href: suiteRepo, target: '_blank', rel: 'noreferrer noopener' }, t('了解 dsh-suite（18 合 1 组合包）', 'Explore dsh-suite (18-in-1 bundle)')));
    })();
    if (!original.bundledBy) {
      // Native bundle detail pages in DSH already render their own Version & Source sections
      // ("重新检查", version list & "更新" button). Keep only non-duplicative auto-update preferences,
      // inline changelog notes, compatibility/error diagnostics, and GitHub feedback links here.
      return h(FooterFrame, { name, label: title, supplement: true, head: h('div', { className: 'updates-compact-bar' },
        optionsSection,
        (row.release || (showUpdate && (!deferred || !ignored))) && h('div', { className: 'updates-head-actions' },
          row.release && h(W.Button, { variant: 'ghost', className: 'is-sm', onClick: showNotes, 'aria-expanded': notesOpen }, t('更新记录', 'Release notes')),
          showUpdate && !deferred && h(W.Button, { variant: 'ghost', className: 'is-sm', disabled: working, onClick: () => perform(() => api({ action: 'later', name: target, revision: state.preferences.revision })) }, t('推迟提醒 24h', 'Snooze 24h')),
          showUpdate && !ignored && h(W.Button, { variant: 'ghost', className: 'is-sm', disabled: working, onClick: () => perform(() => api({ action: 'ignore', name: target, revision: state.preferences.revision, version: row.release.version })) }, t('忽略此版提醒', 'Mute reminder')))) },
        notesSection,
        incompatibleText && h(W.Status, null, incompatibleText),
        errorStatus, snapshot.preferenceError && h(W.Status, { tone: 'error' }, message('preferences-unreadable')),
        snapshot.pendingRestart && h(W.Status, null, snapshot.updaterRestart ? message('restart-required') : t('已有插件更新等待手动重启后生效；空闲自动热更新已暂停，建议先重启一次 DSH 再继续更新其他共用依赖的插件。', 'An update awaits a manual restart; idle auto-updates are paused. Restart DSH once before updating other plugins that share dependencies.')),
        prefs.autoInstall && snapshot.autoReady === false && h(W.Status, null, message('page-not-ready')),
        (prefs.autoInstall || jobActiveThis) && windowControls(),
        jobActiveThis && (snapshot.pages.dirty || ownPage.dirty) && h(W.Status, null, message('page-dirty')),
        jobActiveThis && (snapshot.activity.busy || pageBusy) && h(W.Status, null, message(snapshot.activity.busy ? 'busy' : 'page-busy')),
        deferred && h('p', { className: 'w-muted updates-note' }, t('已推迟此插件的对话页与工作台提醒 24 小时。', 'Chat and workbench reminders for this plugin are snoozed for 24 hours.')),
        unconfirmed && h(W.Status, { tone: 'error' }, message('operation-unconfirmed')),
        progress(),
        linksNav,
        windowsDialog, confirmDialog
      );
    }
    const status = !managed ? t('本地 / 外部来源，保留原安装方式', 'Local / external source; keep original install method') : row.loadError ? t('加载异常，请先检查原生插件管理', 'Loading error; check native plugin management') : row.error ? t('检查失败，可以重试', 'Check failed; retry available') : incompatibleText || (row.available ? (ignored ? t('已忽略提醒，仍可手动更新', 'Reminder ignored; manual update available') : t('有兼容的新版本', 'Compatible update available')) : row.checkedAt ? t('当前已是最新稳定版', 'Latest stable version') : t('尚未检查', 'Not checked yet'));
    return h(FooterFrame, { name, label: title, head: h('div', { className: 'updates-head' },
      h('div', null,
        h('div', { className: 'updates-title-row' }, h('h2', null, t('随 Suite 整包管理', 'Managed via Suite bundle')), h('span', { className: 'updates-mono updates-badge' }, original.name + ' · v' + original.version)),
        h('p', { className: 'w-muted updates-meta-line' }, status, row.checkedAt ? ' · ' + t('上次检查：', 'Last checked: ') + new Date(row.checkedAt).toLocaleString(language() === 'en' ? 'en-US' : 'zh-CN') : ''),
        h('p', { className: 'updates-version updates-note' }, target + ' · v' + row.version, row.release?.version && row.release.version !== row.version ? ' → v' + row.release.version : '')),
      h('div', { className: 'updates-head-actions' },
        showUpdate && checkButton('ghost'),
        row.release && h(W.Button, { variant: 'ghost', className: 'is-sm', onClick: showNotes, 'aria-expanded': notesOpen }, t('更新记录', 'Release notes')),
        showUpdate && !deferred && h(W.Button, { variant: 'ghost', className: 'is-sm', disabled: working, onClick: () => perform(() => api({ action: 'later', name: target, revision: state.preferences.revision })) }, t('明天再提醒', 'Remind me tomorrow')),
        showUpdate && !ignored && h(W.Button, { variant: 'ghost', className: 'is-sm', disabled: working, onClick: () => perform(() => api({ action: 'ignore', name: target, revision: state.preferences.revision, version: row.release.version })) }, t('忽略此版本提醒', 'Ignore this reminder')),
        primary)) },
      notesSection,
      optionsSection,
      errorStatus, snapshot.preferenceError && h(W.Status, { tone: 'error' }, message('preferences-unreadable')),
      snapshot.pendingRestart && h(W.Status, null, snapshot.updaterRestart ? message('restart-required') : t('已有插件更新等待手动重启后生效；空闲自动热更新已暂停。', 'An update awaits a manual restart; idle auto-updates are paused.')),
      prefs.autoInstall && snapshot.autoReady === false && h(W.Status, null, message('page-not-ready')),
      windowControls(),
      (showUpdate || jobActiveThis) && (snapshot.pages.dirty || ownPage.dirty) && h(W.Status, null, message('page-dirty')),
      (showUpdate || jobActiveThis) && (snapshot.activity.busy || pageBusy) && h(W.Status, null, message(snapshot.activity.busy ? 'busy' : 'page-busy')),
      deferred && h(W.Status, null, t('已推迟 Suite 提醒和自动安装 24 小时，仍可手动更新。', 'Suite reminders and automatic installation are deferred for 24 hours. Manual updates remain available.')),
      unconfirmed && h(W.Status, { tone: 'error' }, message('operation-unconfirmed')),
      progress(),
      linksNav,
      windowsDialog, confirmDialog
    );
  }
  function InlineFooter({ name }) { return h(Panel, { name, inline: true }); }
  function NativeFooter({ subject }) {
    const snapshot = useSnapshot(), name = __stardustUpdatesDetailName(subject, snapshot?.rows || []);
    return name ? h(Panel, { name, inline: false }) : null;
  }
  function Reminder() {
    const snapshot = useSnapshot(), [working, setWorking] = useState(false), [checking, setChecking] = useState(false), [error, setError] = useState(''), [dialog, setDialog] = useState(null), [selectedTarget, setSelectedTarget] = useState(null), [selectedVersion, setSelectedVersion] = useState(null), [notes, setNotes] = useState(null), [notesOpen, setNotesOpen] = useState(false), [loadingNotes, setLoadingNotes] = useState(false), [dismissedJobId, setDismissedJobId] = useState(null), [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
    const seenJob = useRef ? useRef(null) : { current: null }, autoDismissRef = useRef ? useRef(null) : { current: null };
    const footerVisible = [...(document.querySelectorAll?.('[data-plugin-update-footer]') || [])].some(node => node.getClientRects?.().length);
    const job = snapshot?.job && seenJob.current === snapshot.job.id && dismissedJobId !== snapshot.job.id ? snapshot.job : null;
    const yielded = footerVisible && !job && !dialog && !working && !checking && !error && !legacyHint;
    const eligibleCandidate = item => {
      const p = preferences(item.name);
      return item.sourceKind === 'registry' && item.available && !item.updating && !item.bundledBy && p.checkEnabled && p.deferredUntil <= Date.now() && p.ignoredVersion !== item.release?.version && !notified.has(item.name + '@' + item.release?.version);
    };
    const candidate = yielded ? null : snapshot?.rows?.find(eligibleCandidate);
    const targetName = job?.name || selectedTarget || candidate?.name;
    const row = targetName ? originalRow(targetName) : null;
    const prefs = row ? preferences(row.name) : null;
    const checkingThis = !!row && (checking || !!snapshot?.checkingNames?.includes(row.name));
    const jobReason = reasonOf(job);
    const canSuggestAuto = !!job && !!prefs && job.state === 'complete' && !jobReason && (!prefs.autoInstall || prefs.autoScope !== 'compatible') && !snapshot?.preferenceError;
    const hasMainCard = !yielded && !!row && !!snapshot && (!!candidate || !!job || !!dialog || !!error);
    const hasLegacyCard = !yielded && !!legacyHint && !candidate && !job && !dialog && !(error && row);
    const autoHideMs = (!hasMainCard || hasLegacyCard || hovered || focused || dialog || notesOpen || working || checkingThis || error || jobReason)
      ? null
      : (job ? (job.state === 'complete' ? (canSuggestAuto ? 15000 : 6000) : null) : (row.available && row.release?.version ? 15000 : null));
    const autoHideKey = autoHideMs ? (job ? 'job:' + job.id + ':' + canSuggestAuto : 'avail:' + row.name + '@' + (row.release?.version || '')) : '';
    useEffect(() => { if (!yielded && row && (candidate || selectedTarget) && !activeJob()) refreshIfStale(row); }, [yielded, row?.name, row?.available, row?.checkedAt, !!candidate, selectedTarget]);
    useEffect(() => {
      if (!hasMainCard && !hasLegacyCard && (hovered || focused)) { setHovered(false); setFocused(false); }
    }, [hasMainCard, hasLegacyCard, hovered, focused]);
    useEffect(() => {
      if (!autoHideMs || !autoHideKey) return;
      const timer = setTimeout(() => { autoDismissRef.current?.(); }, autoHideMs);
      return () => clearTimeout(timer);
    }, [autoHideMs, autoHideKey]);
    if (yielded) return null;
    if (!legacyHint && !candidate && !job && !dialog && !(error && row)) return null;
    if (legacyHint && !candidate && !job && !dialog && !(error && row)) {
      const hint = legacyHint;
      return h('aside', { className: 'dshw plugin-updates-reminder', role: 'status', 'aria-live': 'polite' },
        h('style', null, W.styles), h('style', null, FOOTER_CSS),
        h('div', { className: 'reminder-head' },
          h('span', null, hint + t('：请打开「插件」中的此插件详情页，在底部管理更新。', ': open its details in Plugins to manage updates at the bottom.')),
          h('button', { type: 'button', className: 'reminder-close', 'aria-label': t('关闭', 'Dismiss'), onClick: () => { legacyHint = null; notify(); } }, '×')));
    }
    if (!row || !snapshot) return null;
    const isSuite = row.name === '@stardustlc/dsh-suite', label = language() === 'en' ? row.labelEn : row.label;
    const ownPage = pageState(true), unconfirmed = ['unknown', 'restore-failed'].includes(snapshot.job?.state);
    const pageBusy = ownPage.busy || (snapshot.pages.clients || []).some(c => c.id !== id && c.busy);
    const installLocked = working || activeJob() || unconfirmed || snapshot.updaterRestart || snapshot.preferenceError || !snapshot.activity.known || snapshot.activity.busy || snapshot.pages.dirty || ownPage.dirty || pageBusy || !snapshot.pages.known || row.loadError;
    const jobResult = job?.outcome?.result;
    const jobRunning = !!job && ['verifying', 'installing', 'cancelling'].includes(job.state);
    const key = row.release?.version ? row.name + '@' + row.release.version : null;
    async function perform(callback) { setError(''); setWorking(true); try { await callback(); await refresh(); } catch (err) { setError(err.message); await refresh().catch(() => {}); } finally { setWorking(false); } }
    async function checkReminder() { setError(''); setChecking(true); try { staleChecks.set(row.name, Date.now()); await api({ action: 'check', name: row.name }); await refresh(); } catch (err) { setError(err.message); } finally { setChecking(false); } }
    async function runInstall() {
      setDialog(null); manualOperation = true; notify();
      setError(''); setWorking(true);
      try {
        try {
          await heartbeat();
          const started = await api({ action: 'install', name: row.name, version: selectedVersion, confirmation: 'update-installed-plugin' });
          seenJob.current = started.id;
          while (alive) {
            await new Promise(resolve => setTimeout(resolve, 800)); await heartbeat(); await refresh();
            if (state.job?.id !== started.id) throw new Error('operation-unconfirmed');
            if (!activeJob()) break;
          }
          if (key && ['complete', 'restart-required'].includes(state?.job?.state)) notified.add(key);
          await refresh();
        } finally { manualOperation = false; notify(); }
      } catch (err) {
        setError(err.message);
        if (['check-first', 'release-changed'].includes(err?.message)) {
          staleChecks.set(row.name, Date.now());
          await api({ action: 'check', name: row.name }).catch(() => {});
        }
        await refresh().catch(() => {});
      } finally { setWorking(false); }
    }
    async function toggleNotes() {
      if (notesOpen) { setNotesOpen(false); return; }
      if (!row.release?.version) return;
      setNotesOpen(true); setNotes(null); setLoadingNotes(true); setError('');
      try { setNotes(await api({ action: 'notes', name: row.name, version: row.release.version })); } catch (err) { setError(err.message); } finally { setLoadingNotes(false); }
    }
    function clearTransientUi() {
      setError(''); setNotesOpen(false); setDialog(null); setSelectedTarget(null); setHovered(false); setFocused(false);
    }
    function dismiss() {
      clearTransientUi();
      if (key && !jobRunning) notified.add(key);
      if (job) setDismissedJobId(job.id);
      notify();
    }
    autoDismissRef.current = () => {
      if (job) { dismiss(); return; }
      clearTransientUi();
      for (const item of snapshot?.rows || []) if (eligibleCandidate(item) && item.release?.version) notified.add(item.name + '@' + item.release.version);
      if (key) notified.add(key);
      notify();
    };
    const confirmDialog = ['install', 'automatic'].includes(dialog) && h(W.Dialog, {
      title: dialog === 'automatic'
        ? (isSuite ? t('允许 Suite 空闲时自动热更新？', 'Allow idle automatic updates for Suite?') : t('允许这个插件空闲时自动热更新？', 'Allow idle automatic updates for this plugin?'))
        : (isSuite ? t('确认更新 Suite 整包', 'Confirm Suite bundle update') : t('确认更新此插件', 'Confirm this plugin update')),
      closeLabel: t('关闭', 'Close'),
      onClose: () => setDialog(null),
    }, dialog === 'automatic'
      ? h('div', { className: 'w-stack' },
        h('p', null, label + ' · ' + row.name),
        h('p', null, t('你正在主动启用自动安装。只处理通过当前 DSH 与 Node 兼容性校验的稳定版本（含功能小版本与补丁，跨主版本仍需手动确认）；有任务、未保存修改、未知窗口或等待重启时暂停，随时可关闭。', 'You are explicitly enabling automatic installation for compatible stable releases (minor and patch updates matching this DSH and Node runtime; major upgrades still require manual confirmation). Running tasks, unsaved changes, unknown windows or a pending restart pause it; turn it off anytime.')),
        h('div', { className: 'w-toolbar' },
          h(W.Button, { onClick: () => setDialog(null) }, t('保持关闭', 'Keep off')),
          h(W.Button, { variant: 'primary', onClick: () => { setDialog(null); void perform(async () => { await api({ action: 'preferences', name: row.name, revision: state.preferences.revision, changes: { checkEnabled: true, autoInstall: true, autoScope: 'compatible' }, consent: 'enable-idle-compatible-updates' }); dismiss(); }); } }, t('允许空闲自动热更新', 'Allow idle automatic updates'))))
      : h('div', { className: 'w-stack' },
        isSuite && h('p', null, t('此处操作的是 Suite 整包，包含 18 个组件。独立安装的其他插件不受影响。', 'This action applies to the whole Suite, including its 18 components. Other independently installed plugins are unaffected.')),
        h('p', { className: 'updates-mono' }, row.name + ' · v' + row.version + ' → v' + selectedVersion),
        h('p', null, row.release?.version === selectedVersion ? t('Harness 会原地热更新并重新加载，无需离开当前聊天；若需要手动重启会在此处说明。', 'Harness hot-updates and reloads in place without leaving your chat; if a manual restart is needed, it appears here.') : (row.available && row.release?.version ? message('release-changed') : message('check-first'))),
        h('div', { className: 'w-toolbar' },
          h(W.Button, { onClick: () => setDialog(null) }, t('取消', 'Cancel')),
          row.available && row.release?.version && row.release.version !== selectedVersion
            ? h(W.Button, { variant: 'primary', disabled: installLocked, onClick: () => { setError(''); setSelectedVersion(row.release.version); } }, t('更新为 v', 'Use v') + row.release.version)
            : h(W.Button, { variant: 'primary', disabled: installLocked || row.release?.version !== selectedVersion, onClick: runInstall }, t('安装此版本', 'Install this version')))));
    return h('aside', {
      className: 'dshw plugin-updates-reminder',
      'data-plugin-update-reminder': row.name,
      role: 'status',
      'aria-live': 'polite',
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: event => { if (!event?.currentTarget?.contains || !event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) setFocused(false); },
    },
      h('style', null, W.styles), h('style', null, FOOTER_CSS),
      h('div', { className: 'reminder-head' },
        h('div', { className: 'reminder-title' },
          h('span', { className: 'updates-pill' + (job && ['failed', 'restore-failed', 'unknown', 'restored'].includes(job.state) ? ' is-error' : '') },
            job ? jobLabel(job) : isSuite ? t('Suite 新版本', 'Suite update') : label + t(' 有新版本', ' update')),
          h('span', { className: 'updates-mono' }, job ? ('v' + job.from + ' → v' + job.to) : ('v' + row.version + (row.release?.version ? ' → v' + row.release.version : '')))),
        !jobRunning && h('button', { type: 'button', className: 'reminder-close', 'aria-label': t('关闭提醒', 'Dismiss reminder'), onClick: dismiss }, '×')),
      job?.state === 'restart-required' && jobResult?.restartReason === 'package-moved' && h('p', { className: 'w-muted', style: { margin: '4px 0 0' } }, t('新版已就绪；因多个独立插件共用底层依赖，请先手动重启一次 DSH 生效后再继续更新其他插件。', 'Installed; because standalone plugins share dependencies, restart DSH once before updating additional plugins.')),
      jobReason && h('p', { className: 'updates-inline-msg is-error', style: { margin: '4px 0 0' } }, message(jobReason)),
      error && h('p', { className: 'updates-inline-msg is-error', role: 'alert', style: { margin: '4px 0 0' } }, message(error)),
      !job && installLocked && h('p', { className: 'w-muted', style: { margin: '4px 0 0' } },
        (snapshot.pages.dirty || ownPage.dirty) ? t('请先保存修改后再更新', 'Save changes before updating')
          : (snapshot.activity.busy || pageBusy) ? t('当前对话或任务结束后即可一键热更新', 'Hot-update available once the active turn finishes')
          : ''),
      canSuggestAuto && h('div', { className: 'updates-auto-nudge' },
        h('span', null, t('下次有兼容新版本时，空闲自动热更新？', 'Auto-install future compatible updates while idle?')),
        h(W.Button, { variant: 'primary', className: 'is-sm', disabled: working, onClick: () => { setError(''); setSelectedTarget(row.name); setDialog('automatic'); } }, t('开启空闲自动热更新', 'Enable idle auto-updates'))),
      !jobRunning && !unconfirmed && !['complete', 'restart-required'].includes(job?.state) && h('div', { className: 'reminder-actions' },
        row.available && row.release?.version && h(W.Button, { variant: 'primary', className: 'is-sm', icon: 'download', disabled: installLocked || checkingThis, onClick: () => { setError(''); if (job) setDismissedJobId(job.id); setSelectedTarget(row.name); setSelectedVersion(row.release.version); setDialog('install'); } }, (isSuite ? t('热更新 Suite 至 v', 'Update Suite to v') : t('热更新至 v', 'Update to v')) + row.release.version),
        error === 'check-first' && h(W.Button, { variant: row.available ? 'ghost' : 'primary', className: 'is-sm', icon: 'refresh', disabled: working || checkingThis, onClick: checkReminder }, checkingThis ? t('正在检查…', 'Checking…') : t('重新检查', 'Check again')),
        row.release?.version && h(W.Button, { variant: 'ghost', className: 'is-sm', onClick: toggleNotes, 'aria-expanded': notesOpen }, t('更新记录', 'Release notes')),
        row.available && h(W.Button, { variant: 'ghost', className: 'is-sm', disabled: working, onClick: () => perform(async () => { await api({ action: 'later', name: row.name, revision: state.preferences.revision }); dismiss(); }) }, t('明天再提醒', 'Remind tomorrow'))),
      jobRunning && !['applying', 'restoring'].includes(job.phase) && h('div', { className: 'reminder-actions' },
        h(W.Button, { className: 'is-sm', disabled: job.state === 'cancelling', onClick: () => perform(() => api({ action: 'cancel', id: job.id })) }, t('取消更新', 'Cancel update'))),
      notesOpen && h('section', { className: 'updates-notes', 'aria-label': t('更新记录', 'Release notes') },
        loadingNotes ? h('p', { className: 'w-muted', style: { margin: 0 } }, t('正在读取…', 'Loading…'))
          : notes?.text ? h('pre', { tabIndex: 0 }, h('code', null, notes.text))
          : h('p', { className: 'w-muted', style: { margin: 0 } }, t('未找到此版本的独立更新记录。', 'No separate notes were found for this version.')),
        notes?.url && h('a', { href: notes.url, target: '_blank', rel: 'noreferrer noopener' }, t('查看仓库更新记录', 'View repository changelog'))),
      confirmDialog);
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
  const client = { t, Footer: InlineFooter, NativeFooter, Button: W.Button, open(name) { const footer = [...document.querySelectorAll('[data-plugin-update-footer]')].find(node => node.getAttribute('data-plugin-update-footer') === name); if (footer) footer.scrollIntoView({ block: 'end', behavior: 'smooth' }); else { legacyHint = name; notify(); } }, has: name => registered && !!originalRow(name), row: rowFor, dispose() {
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
/* DSH Workbench UI v3 — Unified DeepSeek Harness (>=0.2.2-rc.3) Studio UI & Motion Kit.
 * Integrates @deepseek-ai/dsh-client-ui-primitives lazily at render time with semantic HTML
 * fallbacks for standalone jsdom/VM tests, 13 switchable [data-dsh-style] themes + 8 [data-dsh-font]
 * pairings (default: arcade) synced via localStorage['dsh-stardust:ui-style'] / ['dsh-stardust:ui-font'],
 * soft-slate dark adaptation, unified 48px single-row header, sliding tab indicator,
 * resizable split panes (DshSplitResizer), shimmer skeletons (DshSkeleton), row hover quick-actions,
 * calm compact update strip, tactile press physics, small-button icon micro-animations,
 * and window-drag exclusions.
 */
function createWorkbenchUI(React, requireFn) {
  const h = React.createElement;
  const useIdHook = typeof React.useId === 'function' ? React.useId : () => 'dshw-id';
  const useEffectHook = typeof React.useEffect === 'function' ? React.useEffect : () => {};
  const useLayoutHook = typeof React.useLayoutEffect === 'function' ? React.useLayoutEffect : useEffectHook;
  const useRefHook = typeof React.useRef === 'function' ? React.useRef : (initial => ({ current: initial }));
  const useStateHook = typeof React.useState === 'function' ? React.useState : (initial => [typeof initial === 'function' ? initial() : initial, () => {}]);
  const forwardRefWrap = typeof React.forwardRef === 'function' ? React.forwardRef : (fn => props => fn(props, null));
  const cx = (...values) => values.filter(Boolean).join(' ');

  const DSH_STYLE_STORAGE_KEY = 'dsh-stardust:ui-style';
  const DSH_STYLE_EVENT = 'dsh-stardust-style';
  const DSH_DEFAULT_STYLE = 'harness';

  const DSH_FONT_STORAGE_KEY = 'dsh-stardust:ui-font';
  const DSH_FONT_EVENT = 'dsh-stardust-font';
  const DSH_DEFAULT_FONT = 'arcade';

  const DSH_FONTS = Object.freeze([
    Object.freeze({ id: 'arcade', zh: '幼圆等宽（默认）', zhShort: '幼圆', en: 'YouYuan Mono (Default)', enShort: 'YouYuan' }),
    Object.freeze({ id: 'auto', zh: '跟随风格专属字', zhShort: '专属字', en: 'Match Style Font', enShort: 'Style Font' }),
    Object.freeze({ id: 'songkai', zh: '中宋+楷书', zhShort: '中宋楷', en: 'Song + Kai', enShort: 'Song+Kai' }),
    Object.freeze({ id: 'fangsong', zh: '工程仿宋', zhShort: '仿宋', en: 'Blueprint FangSong', enShort: 'FangSong' }),
    Object.freeze({ id: 'poster', zh: '重磅画报黑', zhShort: '画报黑', en: 'Poster Sans', enShort: 'Poster' }),
    Object.freeze({ id: 'retro98', zh: '千禧新宋', zhShort: '新宋98', en: 'Retro 98 SimSun', enShort: 'Retro 98' }),
    Object.freeze({ id: 'serif', zh: '思源书宋', zhShort: '书宋', en: 'Book Serif', enShort: 'Serif' }),
    Object.freeze({ id: 'modern', zh: '现代思源黑', zhShort: '思源黑', en: 'Modern Sans', enShort: 'Modern' }),
  ]);

  const DSH_STYLES = Object.freeze([
    Object.freeze({ id: 'harness', zh: '原生清透', zhShort: '原生', en: 'Native Airy', enShort: 'Native', swatch: '#4176e6', surface: '#f8fafc' }),
    Object.freeze({ id: 'cream', zh: '米白纸感', zhShort: '米白色', en: 'Warm Cream', enShort: 'Cream', swatch: '#9e5829', surface: '#faf7f0' }),
    Object.freeze({ id: 'claude', zh: 'Claude 暖书卷', zhShort: 'Claude风', en: 'Claude Warmth', enShort: 'Claude', swatch: '#c96442', surface: '#f5f4ed' }),
    Object.freeze({ id: 'pixel8bit', zh: '8-Bit 掌机', zhShort: '8-Bit', en: 'Bright 8-Bit', enShort: '8-Bit', swatch: '#2e7d5b', surface: '#f4f6e8' }),
    Object.freeze({ id: 'mint', zh: '晴空薄荷', zhShort: '薄荷', en: 'Airy Mint', enShort: 'Mint', swatch: '#0f766e', surface: '#f5fafb' }),
    Object.freeze({ id: 'glass', zh: '晴昼琉璃', zhShort: '琉璃', en: 'Daylight Glass', enShort: 'Glass', swatch: '#4f6df5', surface: '#f3f7ff' }),
    Object.freeze({ id: 'eink', zh: '护眼墨水屏', zhShort: '墨水屏', en: 'E-Ink Paper', enShort: 'E-Ink', swatch: '#171716', surface: '#f2f1ec' }),
    Object.freeze({ id: 'blueprint', zh: '工程晒图', zhShort: '晒图', en: 'Blueprint', enShort: 'Blueprint', swatch: '#0d3b66', surface: '#eaf3fb' }),
    Object.freeze({ id: 'risograph', zh: '波普孔版', zhShort: '孔版', en: 'Riso Zine', enShort: 'Riso', swatch: '#ff3e7f', surface: '#faf6ee' }),
    Object.freeze({ id: 'win98', zh: '千禧复古', zhShort: '复古98', en: 'Retro 98', enShort: 'Retro 98', swatch: '#1b4f9c', surface: '#dcdcdc' }),
    Object.freeze({ id: 'songhui', zh: '宋韵朱砂', zhShort: '宋韵', en: 'Song Xuan', enShort: 'Song', swatch: '#b83b2a', surface: '#f7f3e8' }),
    Object.freeze({ id: 'frutiger', zh: '晴空水晶', zhShort: '水晶', en: 'Aqua Gloss', enShort: 'Aqua', swatch: '#0ea5e9', surface: '#eaf7ff' }),
    Object.freeze({ id: 'gazette', zh: '铅字晨报', zhShort: '晨报', en: 'Gazette', enShort: 'Gazette', swatch: '#9b1c1c', surface: '#f6f3ec' }),
  ]);

  const VALID_STYLE_IDS = new Set(DSH_STYLES.map(preset => preset.id));
  const VALID_FONT_IDS = new Set(DSH_FONTS.map(preset => preset.id));

  function resolveWindow(win) {
    if (win && typeof win === 'object') return win;
    return typeof window !== 'undefined' ? window : null;
  }

  function clampNumber(value, min, max) {
    const lo = Number.isFinite(min) ? min : 0;
    const hi = Number.isFinite(max) ? Math.max(lo, max) : lo;
    const num = Number(value);
    if (!Number.isFinite(num)) return lo;
    return Math.min(hi, Math.max(lo, num));
  }

  function normalizeDshStyle(value) {
    const key = typeof value === 'string' ? value.trim() : '';
    return VALID_STYLE_IDS.has(key) ? key : DSH_DEFAULT_STYLE;
  }

  function getDshStylePreset(value) {
    const id = normalizeDshStyle(value);
    return DSH_STYLES.find(preset => preset.id === id) || DSH_STYLES[0];
  }

  function readDshStyle(win) {
    const target = resolveWindow(win);
    if (!target) return DSH_DEFAULT_STYLE;
    try {
      const raw = target.localStorage?.getItem(DSH_STYLE_STORAGE_KEY);
      return normalizeDshStyle(raw);
    } catch {
      return DSH_DEFAULT_STYLE;
    }
  }

  function normalizeDshFont(value) {
    const key = typeof value === 'string' ? value.trim() : '';
    return VALID_FONT_IDS.has(key) ? key : DSH_DEFAULT_FONT;
  }

  function getDshFontPreset(value) {
    const id = normalizeDshFont(value);
    return DSH_FONTS.find(preset => preset.id === id) || DSH_FONTS[0];
  }

  function readDshFont(win) {
    const target = resolveWindow(win);
    if (!target) return DSH_DEFAULT_FONT;
    try {
      const raw = target.localStorage?.getItem(DSH_FONT_STORAGE_KEY);
      return normalizeDshFont(raw);
    } catch {
      return DSH_DEFAULT_FONT;
    }
  }

  function syncPortaledOverlays(style, doc, font) {
    const normalized = normalizeDshStyle(style);
    const normalizedFont = normalizeDshFont(font ?? readDshFont());
    const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
    if (!targetDoc) return;
    if (targetDoc.documentElement && typeof targetDoc.documentElement.setAttribute === 'function') {
      targetDoc.documentElement.setAttribute('data-dsh-font', normalizedFont);
    }
    if (typeof targetDoc.querySelectorAll !== 'function') return;
    for (const el of targetDoc.querySelectorAll('[data-dsh-portal-synced]')) {
      el.setAttribute('data-dsh-style', normalized);
      el.setAttribute('data-dsh-font', normalizedFont);
      if (!el.hasAttribute('data-window-drag-exclude')) {
        el.setAttribute('data-window-drag-exclude', '');
      }
    }
  }

  function syncPortaledFont(font, doc) {
    const normalizedFont = normalizeDshFont(font);
    const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
    if (!targetDoc) return;
    if (targetDoc.documentElement && typeof targetDoc.documentElement.setAttribute === 'function') {
      targetDoc.documentElement.setAttribute('data-dsh-font', normalizedFont);
    }
    if (typeof targetDoc.querySelectorAll !== 'function') return;
    for (const el of targetDoc.querySelectorAll('[data-dsh-portal-synced], [data-dsh-style]')) {
      el.setAttribute('data-dsh-font', normalizedFont);
    }
  }

  function writeDshStyle(nextStyle, win) {
    const normalized = normalizeDshStyle(nextStyle);
    const target = resolveWindow(win);
    if (target) {
      try {
        target.localStorage?.setItem(DSH_STYLE_STORAGE_KEY, normalized);
      } catch {
        // Restricted storage: keep in-memory + custom event sync working.
      }
      syncPortaledOverlays(normalized, target.document, readDshFont(target));
      if (typeof target.dispatchEvent === 'function') {
        try {
          const CustomEventCtor = target.CustomEvent || (typeof CustomEvent === 'function' ? CustomEvent : null);
          if (CustomEventCtor) {
            target.dispatchEvent(new CustomEventCtor(DSH_STYLE_EVENT, { detail: { style: normalized } }));
          } else if (typeof Event === 'function') {
            const ev = new Event(DSH_STYLE_EVENT);
            ev.detail = { style: normalized };
            target.dispatchEvent(ev);
          }
        } catch {
          // Ignore synthetic event errors in minimal VM environments.
        }
      }
    }
    return normalized;
  }

  function writeDshFont(nextFont, win) {
    const normalized = normalizeDshFont(nextFont);
    const target = resolveWindow(win);
    if (target) {
      try {
        target.localStorage?.setItem(DSH_FONT_STORAGE_KEY, normalized);
      } catch {
        // Restricted storage: keep in-memory + custom event sync working.
      }
      syncPortaledFont(normalized, target.document);
      if (typeof target.dispatchEvent === 'function') {
        try {
          const CustomEventCtor = target.CustomEvent || (typeof CustomEvent === 'function' ? CustomEvent : null);
          if (CustomEventCtor) {
            target.dispatchEvent(new CustomEventCtor(DSH_FONT_EVENT, { detail: { font: normalized } }));
          } else if (typeof Event === 'function') {
            const ev = new Event(DSH_FONT_EVENT);
            ev.detail = { font: normalized };
            target.dispatchEvent(ev);
          }
        } catch {
          // Ignore synthetic event errors in minimal VM environments.
        }
      }
    }
    return normalized;
  }

  function subscribeDshStyle(onChange, win) {
    const target = resolveWindow(win);
    if (!target || typeof target.addEventListener !== 'function' || typeof onChange !== 'function') {
      return () => {};
    }
    const onCustom = event => {
      const next = normalizeDshStyle(event?.detail?.style ?? readDshStyle(target));
      syncPortaledOverlays(next, target.document, readDshFont(target));
      onChange(next);
    };
    const onStorage = event => {
      if (event && event.key !== null && event.key !== undefined && event.key !== DSH_STYLE_STORAGE_KEY) {
        return;
      }
      const next = normalizeDshStyle(event?.newValue ?? readDshStyle(target));
      syncPortaledOverlays(next, target.document, readDshFont(target));
      onChange(next);
    };
    target.addEventListener(DSH_STYLE_EVENT, onCustom);
    target.addEventListener('storage', onStorage);
    return () => {
      target.removeEventListener(DSH_STYLE_EVENT, onCustom);
      target.removeEventListener('storage', onStorage);
    };
  }

  function subscribeDshFont(onChange, win) {
    const target = resolveWindow(win);
    if (!target || typeof target.addEventListener !== 'function' || typeof onChange !== 'function') {
      return () => {};
    }
    const onCustom = event => {
      const next = normalizeDshFont(event?.detail?.font ?? readDshFont(target));
      syncPortaledFont(next, target.document);
      onChange(next);
    };
    const onStorage = event => {
      if (event && event.key !== null && event.key !== undefined && event.key !== DSH_FONT_STORAGE_KEY) {
        return;
      }
      const next = normalizeDshFont(event?.newValue ?? readDshFont(target));
      syncPortaledFont(next, target.document);
      onChange(next);
    };
    target.addEventListener(DSH_FONT_EVENT, onCustom);
    target.addEventListener('storage', onStorage);
    return () => {
      target.removeEventListener(DSH_FONT_EVENT, onCustom);
      target.removeEventListener('storage', onStorage);
    };
  }

  function useDshStyle(win) {
    if (typeof React.useState !== 'function') {
      return [readDshStyle(win), next => writeDshStyle(next, win)];
    }
    const [style, setStyleState] = React.useState(() => readDshStyle(win));
    if (typeof React.useEffect === 'function') {
      React.useEffect(() => {
        const current = readDshStyle(win);
        setStyleState(prev => (prev === current ? prev : current));
        syncPortaledOverlays(current, resolveWindow(win)?.document, readDshFont(win));
        return subscribeDshStyle(next => {
          setStyleState(prev => (prev === next ? prev : next));
        }, win);
      }, [win]);
    }
    const setStyle = next => {
      const resolved = typeof next === 'function' ? next(style) : next;
      const applied = writeDshStyle(resolved, win);
      setStyleState(applied);
      return applied;
    };
    return [style, setStyle];
  }

  function useDshFont(win) {
    if (typeof React.useState !== 'function') {
      return [readDshFont(win), next => writeDshFont(next, win)];
    }
    const [font, setFontState] = React.useState(() => readDshFont(win));
    if (typeof React.useEffect === 'function') {
      React.useEffect(() => {
        const current = readDshFont(win);
        setFontState(prev => (prev === current ? prev : current));
        syncPortaledFont(current, resolveWindow(win)?.document);
        return subscribeDshFont(next => {
          setFontState(prev => (prev === next ? prev : next));
        }, win);
      }, [win]);
    }
    const setFont = next => {
      const resolved = typeof next === 'function' ? next(font) : next;
      const applied = writeDshFont(resolved, win);
      setFontState(applied);
      return applied;
    };
    return [font, setFont];
  }

  function createOverlaySyncRef(style, font) {
    const normalized = normalizeDshStyle(style);
    const normalizedFont = normalizeDshFont(font ?? readDshFont());
    return node => {
      if (!node || typeof node.setAttribute !== 'function') return;
      node.setAttribute('data-dsh-style', normalized);
      node.setAttribute('data-dsh-font', normalizedFont);
      node.setAttribute('data-window-drag-exclude', '');
      node.setAttribute('data-dsh-portal-synced', 'true');
      if (typeof node.closest === 'function') {
        const overlay = node.closest('[role="dialog"], [role="alertdialog"], [role="menu"], dialog');
        if (overlay) {
          overlay.setAttribute('data-dsh-style', normalized);
          overlay.setAttribute('data-dsh-font', normalizedFont);
          overlay.setAttribute('data-window-drag-exclude', '');
          overlay.setAttribute('data-dsh-portal-synced', 'true');
        }
      }
    };
  }

  const paths = {
    book: ['M4 4h6a3 3 0 0 1 2 2v15a4 4 0 0 0-4-2H4z', 'M20 4h-6a3 3 0 0 0-2 2v15a4 4 0 0 1 4-2h4z'],
    calendar: ['M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z', 'M7 3v4M17 3v4M3 10h18'],
    mail: ['M3 5h18v14H3z', 'm3 6 9 7 9-7'],
    inbox: ['M4 13 6 5h12l2 8v6H4z', 'M4 13h5l1 3h4l1-3h5'],
    send: ['m22 2-7 20-4-9-9-4Z', 'M22 2 11 13'],
    rss: ['M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16', 'M4 19h.01'],
    slides: ['M3 4h18v13H3z', 'M12 17v4M8 21h8'],
    shield: ['m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6z', 'm8 12 3 3 5-6'],
    layers: ['M5 3h16v16H5z', 'M2 7v15h15'],
    play: ['m8 5 11 7-11 7Z'],
    video: ['M3 5h12v14H3z', 'm15 10 6-4v12l-6-4'],
    search: ['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'm16 16 5 5'],
    plus: ['M12 5v14M5 12h14'],
    refresh: ['M20 7a9 9 0 1 0 1 8', 'M20 2v5h-5'],
    settings: ['m9 3-.7 2.4-2 .9L4 5.8 2.5 8.4l1.7 1.8v2.3L2.5 14 4 17l2.5-.4 1.9 1L9 20h3l.8-2.4 2-1 2.5.4 1.5-2.7-1.7-1.9v-2.2l1.7-1.8-1.5-2.6-2.5.4-2-1L12 3Z', 'M14 11.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z'],
    close: ['m6 6 12 12M18 6 6 18'],
    left: ['m14 5-7 7 7 7'],
    right: ['m10 5 7 7-7 7'],
    up: ['m5 15 7-7 7 7'],
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
    lock: ['M5 10h14v11H5z', 'M8 10V7a4 4 0 0 1 8 0v3M12 14v3'],
    clip: ['m8 13 6-6a2.5 2.5 0 0 1 3.5 3.5l-7 7a4 4 0 0 1-5.7-5.7l8-8a5 5 0 0 1 7.1 7.1l-8 8'],
    clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
    image: ['M3 4h18v16H3z', 'm3 17 6-6 5 5 2-2 5 5M16 8h.01'],
    palette: ['M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h4a5 5 0 0 0 5-5c0-2.2-4-4-9-4Z', 'M7.5 10.5h.01M10.5 7.5h.01M14.5 7.5h.01'],
    sparkles: ['m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8Z', 'M19 15v4M17 17h4'],
    grip: ['M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01'],
    bookmark: ['M6 4h12v17l-6-4-6 4Z'],
  };

  function Icon({ name = 'file', size = 16, ...props }) {
    return h('svg', {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.7,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      focusable: 'false',
      'data-dsh-icon': name,
      ...props,
    }, (paths[name] || paths.file).map((d, index) => h('path', { key: index, d })));
  }

  function useSlidingTabIndicator(arg1, arg2, arg3) {
    const isExplicitReact = Boolean(arg1 && typeof arg1 === 'object' && typeof arg1.createElement === 'function');
    const activeValue = isExplicitReact ? arg2 : arg1;
    const options = (isExplicitReact ? arg3 : arg2) || {};
    const tablistRef = useRefHook(null);
    const [metrics, setMetrics] = useStateHook({ x: 0, width: 0, ready: false });

    const syncIndicator = () => {
      const list = tablistRef.current;
      if (!list || typeof list.querySelector !== 'function') return;
      const activeTab = list.querySelector('[role="tab"][aria-selected="true"]');
      if (!activeTab) {
        list.setAttribute?.('data-indicator-ready', 'false');
        setMetrics(prev => (prev.ready ? { x: 0, width: 0, ready: false } : prev));
        return;
      }
      let x = typeof activeTab.offsetLeft === 'number' ? activeTab.offsetLeft : 0;
      let width = typeof activeTab.offsetWidth === 'number' ? activeTab.offsetWidth : 0;
      if (!width && typeof activeTab.getBoundingClientRect === 'function' && typeof list.getBoundingClientRect === 'function') {
        const tabRect = activeTab.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        if (tabRect && listRect && tabRect.width > 0) {
          width = tabRect.width;
          x = tabRect.left - listRect.left + (list.scrollLeft || 0);
        }
      }
      const ready = width > 0;
      if (list.style && typeof list.style.setProperty === 'function') {
        list.style.setProperty('--dsh-tab-x', Math.round(x) + 'px');
        list.style.setProperty('--dsh-tab-w', Math.round(width) + 'px');
      }
      list.setAttribute?.('data-indicator-ready', ready ? 'true' : 'false');
      setMetrics(prev => (
        prev.x === Math.round(x) && prev.width === Math.round(width) && prev.ready === ready
          ? prev
          : { x: Math.round(x), width: Math.round(width), ready }
      ));
    };

    const deps = Array.isArray(options?.deps) ? [activeValue, ...options.deps] : [activeValue];
    useLayoutHook(() => {
      syncIndicator();
      const list = tablistRef.current;
      const win = resolveWindow(options?.win);
      let ro = null;
      if (list && typeof win?.ResizeObserver === 'function') {
        try {
          ro = new win.ResizeObserver(() => syncIndicator());
          ro.observe(list);
        } catch {
          ro = null;
        }
      }
      if (win && typeof win.addEventListener === 'function') {
        win.addEventListener('resize', syncIndicator);
      }
      return () => {
        ro?.disconnect?.();
        if (win && typeof win.removeEventListener === 'function') {
          win.removeEventListener('resize', syncIndicator);
        }
      };
    }, deps);

    const indicatorStyle = {
      '--dsh-tab-x': metrics.x + 'px',
      '--dsh-tab-w': metrics.width + 'px',
    };

    return {
      tablistRef,
      ready: metrics.ready,
      indicatorStyle,
      tablistProps: {
        ref: tablistRef,
        'data-dsh-tablist': '',
        'data-indicator-ready': metrics.ready ? 'true' : 'false',
      },
      indicatorProps: {
        className: 'dsh-tab-indicator',
        'aria-hidden': 'true',
        style: indicatorStyle,
      },
      syncIndicator,
    };
  }

  function useResizableSplit(arg1, arg2) {
    const isExplicitReact = Boolean(arg1 && typeof arg1 === 'object' && typeof arg1.createElement === 'function');
    const opts = (isExplicitReact ? arg2 : arg1) || {};
    const { key, initial = 320, min = 220, max = 560, orientation = 'vertical', reverse = false, win } = opts;
    const clampedInitial = clampNumber(initial, min, max);

    const readStored = () => {
      const target = resolveWindow(win);
      if (!key || !target) return clampedInitial;
      try {
        const raw = target.localStorage?.getItem(key);
        if (raw == null || raw === '') return clampedInitial;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? clampNumber(parsed, min, max) : clampedInitial;
      } catch {
        return clampedInitial;
      }
    };

    const writeStored = nextSize => {
      const clamped = Math.round(clampNumber(nextSize, min, max));
      const target = resolveWindow(win);
      if (key && target) {
        try {
          target.localStorage?.setItem(key, String(clamped));
        } catch {
          // Ignore restricted storage errors.
        }
      }
      return clamped;
    };

    const [size, setSizeState] = useStateHook(() => readStored());
    const [isDragging, setIsDragging] = useStateHook(false);

    const setSize = next => {
      const resolved = typeof next === 'function' ? next(size) : next;
      const applied = writeStored(resolved);
      setSizeState(applied);
      return applied;
    };

    const reset = () => {
      const applied = writeStored(clampedInitial);
      setSizeState(applied);
      return applied;
    };

    return {
      size,
      width: size,
      setSize,
      reset,
      isDragging,
      setIsDragging,
      paneStyle: { '--dsh-split-size': size + 'px' },
      resizerProps: {
        value: size,
        initial: clampedInitial,
        min,
        max,
        orientation,
        reverse,
        onChange: setSize,
        onReset: reset,
        onDraggingChange: setIsDragging,
      },
    };
  }

  function SplitResizer({
    value = 320,
    initial,
    min = 220,
    max = 560,
    orientation = 'vertical',
    reverse = false,
    step = 16,
    label = 'Resize pane',
    onChange,
    onReset,
    onDraggingChange,
    className,
    style,
    ...rest
  } = {}) {
    const dragRef = useRefHook(null);
    const [dragging, setDragging] = useStateHook(false);
    const isHorizontal = orientation === 'horizontal';
    const clampedValue = Math.round(clampNumber(value, min, max));

    const setDragActive = active => {
      setDragging(active);
      onDraggingChange?.(active);
    };

    const cleanupWindowListeners = () => {
      const drag = dragRef.current;
      if (drag?.cleanup) drag.cleanup();
      dragRef.current = null;
    };

    useEffectHook(() => cleanupWindowListeners, []);

    const updateFromClientPos = (clientX, clientY) => {
      const drag = dragRef.current;
      if (!drag) return;
      const rawDelta = isHorizontal ? (clientY - drag.startY) : (clientX - drag.startX);
      const delta = reverse ? -rawDelta : rawDelta;
      const next = Math.round(clampNumber(drag.startValue + delta, min, max));
      onChange?.(next);
    };

    const handlePointerDown = event => {
      if (event?.button !== undefined && event.button !== 0) return;
      event?.preventDefault?.();
      const targetEl = event?.currentTarget;
      const pointerId = event?.pointerId;
      const startX = Number(event?.clientX ?? 0);
      const startY = Number(event?.clientY ?? 0);

      cleanupWindowListeners();

      let captured = false;
      if (targetEl && typeof targetEl.setPointerCapture === 'function' && pointerId !== undefined) {
        try {
          targetEl.setPointerCapture(pointerId);
          captured = true;
        } catch {
          captured = false;
        }
      }

      const win = resolveWindow();
      let cleanup = null;
      if (!captured && win && typeof win.addEventListener === 'function') {
        const onWinMove = moveEvent => updateFromClientPos(Number(moveEvent.clientX ?? 0), Number(moveEvent.clientY ?? 0));
        const onWinUp = () => {
          cleanupWindowListeners();
          setDragActive(false);
        };
        win.addEventListener('pointermove', onWinMove);
        win.addEventListener('mousemove', onWinMove);
        win.addEventListener('pointerup', onWinUp);
        win.addEventListener('mouseup', onWinUp);
        win.addEventListener('pointercancel', onWinUp);
        cleanup = () => {
          win.removeEventListener('pointermove', onWinMove);
          win.removeEventListener('mousemove', onWinMove);
          win.removeEventListener('pointerup', onWinUp);
          win.removeEventListener('mouseup', onWinUp);
          win.removeEventListener('pointercancel', onWinUp);
        };
      }

      dragRef.current = { startX, startY, startValue: clampedValue, pointerId, captured, cleanup };
      setDragActive(true);
    };

    const handlePointerMove = event => {
      if (!dragRef.current) return;
      updateFromClientPos(Number(event?.clientX ?? 0), Number(event?.clientY ?? 0));
    };

    const handlePointerEnd = event => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.captured && event?.currentTarget && typeof event.currentTarget.releasePointerCapture === 'function' && drag.pointerId !== undefined) {
        try {
          event.currentTarget.releasePointerCapture(drag.pointerId);
        } catch {
          // Ignore release errors when pointer already detached.
        }
      }
      cleanupWindowListeners();
      setDragActive(false);
    };

    const handleKeyDown = event => {
      const key = event?.key;
      const deltaStep = event?.shiftKey ? step * 2 : step;
      const dir = reverse ? -1 : 1;
      let next = null;
      if ((!isHorizontal && key === 'ArrowLeft') || (isHorizontal && key === 'ArrowUp')) {
        next = clampNumber(clampedValue - deltaStep * dir, min, max);
      } else if ((!isHorizontal && key === 'ArrowRight') || (isHorizontal && key === 'ArrowDown')) {
        next = clampNumber(clampedValue + deltaStep * dir, min, max);
      } else if (key === 'Home') {
        next = min;
      } else if (key === 'End') {
        next = max;
      }
      if (next !== null) {
        event?.preventDefault?.();
        onChange?.(Math.round(next));
      }
    };

    const handleDoubleClick = () => {
      if (typeof onReset === 'function') {
        onReset();
      } else if (initial !== undefined) {
        onChange?.(Math.round(clampNumber(initial, min, max)));
      }
    };

    return h('div', {
      ...rest,
      role: 'separator',
      tabIndex: 0,
      'aria-orientation': orientation,
      'aria-label': label,
      'aria-valuemin': min,
      'aria-valuemax': max,
      'aria-valuenow': clampedValue,
      'data-dsh-resizer': '',
      'data-dragging': dragging ? 'true' : 'false',
      'data-window-drag-exclude': '',
      className: cx('dsh-split-resizer', className),
      style,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      onLostPointerCapture: handlePointerEnd,
      onKeyDown: handleKeyDown,
      onDoubleClick: handleDoubleClick,
    });
  }

  function Skeleton({
    variant = 'text',
    lines = 3,
    width,
    height,
    radius,
    animated = true,
    label,
    className,
    style,
    ...rest
  } = {}) {
    const a11yProps = label
      ? { role: 'status', 'aria-busy': 'true', 'aria-label': label }
      : { 'aria-hidden': 'true' };

    const baseBar = (barWidth, barHeight, key) =>
      h('span', {
        key,
        className: 'dsh-skeleton',
        'data-dsh-skeleton': variant,
        'data-animated': animated ? 'true' : 'false',
        style: {
          width: barWidth ?? width,
          height: barHeight ?? height,
          borderRadius: radius,
        },
      });

    if (variant === 'circle') {
      return h('span', {
        ...a11yProps,
        ...rest,
        className: cx('dsh-skeleton', 'dsh-skeleton-circle', className),
        'data-dsh-skeleton': 'circle',
        'data-animated': animated ? 'true' : 'false',
        style: { width, height, ...style },
      });
    }

    if (variant === 'rect') {
      return h('span', {
        ...a11yProps,
        ...rest,
        className: cx('dsh-skeleton', className),
        'data-dsh-skeleton': 'rect',
        'data-animated': animated ? 'true' : 'false',
        style: { width, height: height ?? '80px', borderRadius: radius, ...style },
      });
    }

    if (variant === 'row') {
      return h('div', {
        ...a11yProps,
        ...rest,
        className: cx('dsh-skeleton-row', className),
        style,
      },
      h('span', {
        className: 'dsh-skeleton dsh-skeleton-circle',
        'data-dsh-skeleton': 'circle',
        'data-animated': animated ? 'true' : 'false',
      }),
      h('div', { className: 'dsh-skeleton-group' },
        baseBar('58%', '12px', 'r1'),
        baseBar('84%', '10px', 'r2')));
    }

    if (variant === 'card') {
      return h('div', {
        ...a11yProps,
        ...rest,
        className: cx('dsh-skeleton-card', className),
        style,
      },
      baseBar('46%', '14px', 'c1'),
      baseBar('100%', '11px', 'c2'),
      baseBar('74%', '11px', 'c3'));
    }

    const count = Math.max(1, Math.round(Number(lines) || 1));
    if (count === 1) {
      return h('span', {
        ...a11yProps,
        ...rest,
        className: cx('dsh-skeleton', className),
        'data-dsh-skeleton': 'text',
        'data-animated': animated ? 'true' : 'false',
        style: { width, height, borderRadius: radius, ...style },
      });
    }

    const bars = [];
    for (let i = 0; i < count; i += 1) {
      const isLast = i === count - 1;
      bars.push(baseBar(isLast ? '68%' : '100%', height, 'l-' + i));
    }
    return h('div', {
      ...a11yProps,
      ...rest,
      className: cx('dsh-skeleton-group', className),
      style,
    }, bars);
  }

  const primitivesByHost = new Map();

  function resolveHostPrimitives(customRequire = requireFn) {
    let host = null;
    if (typeof customRequire === 'function') {
      try {
        host = customRequire('@deepseek-ai/dsh-client-ui-primitives') || null;
      } catch {
        host = null;
      }
    }

    // Keep component types stable while still discovering host changes on render.
    const cached = primitivesByHost.get(host);
    if (cached) return cached;

    const FallbackButton = forwardRefWrap(function FallbackButton({ variant = 'ghost', size = 'md', icon, className, children, type = 'button', ...rest }, ref) {
      return h('button', {
        ...(ref ? { ref } : {}),
        type,
        className: cx('dsh-btn', 'dsh-btn-' + variant, 'dsh-btn-' + size, className),
        ...rest,
      }, icon != null ? h('span', { className: 'dsh-fallback-btn-icon' }, icon) : null, children);
    });

    const FallbackInput = forwardRefWrap(function FallbackInput({ icon, className, ...rest }, ref) {
      return h('span', { className: cx('dsh-fallback-input-wrap', className) },
        icon != null ? h('span', { className: 'dsh-fallback-input-icon' }, icon) : null,
        h('input', ref ? { ...rest, ref } : rest));
    });

    function FallbackCheckbox({ checked = false, onChange, label, disabled = false, title, className, ...rest }) {
      return h('label', { className, title },
        h('input', {
          type: 'checkbox',
          checked: Boolean(checked),
          disabled,
          onChange: event => onChange?.(Boolean(event?.target?.checked)),
          ...rest,
        }),
        h('span', null, label));
    }

    function FallbackSwitch({ checked = false, onChange, label, disabled = false, title, className }) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': Boolean(checked),
        'aria-label': label,
        title,
        disabled,
        className,
        onClick: () => onChange?.(!checked),
      }, h('span', null));
    }

    function FallbackSegmentedControl({ id, value, options = [], onChange, label, disabled = false, className }) {
      return h('div', { role: 'tablist', 'aria-label': label, className },
        options.map(opt => {
          const selected = opt.value === value;
          return h('button', {
            key: opt.value,
            id: id ? id + '-' + opt.value : undefined,
            type: 'button',
            role: 'tab',
            'aria-selected': selected,
            tabIndex: selected ? 0 : -1,
            disabled: disabled || Boolean(opt.disabled),
            onClick: () => {
              if (!disabled && !opt.disabled && opt.value !== value) onChange?.(opt.value);
            },
          }, opt.label);
        }));
    }

    function renderPortalSyncNode(styleValue, fontValue) {
      const syncStyle = normalizeDshStyle(styleValue ?? readDshStyle());
      const syncFont = normalizeDshFont(fontValue ?? readDshFont());
      return h('span', {
        key: '__dsh_portal_sync__',
        ref: createOverlaySyncRef(syncStyle, syncFont),
        hidden: true,
        'aria-hidden': 'true',
        'data-dsh-style': syncStyle,
        'data-dsh-font': syncFont,
      });
    }

    function FallbackMenu({ open = false, anchor, items = [], children, selectedId, onSelect, onClose, footer, className, listClassName, dshStyle, dshFont }) {
      const style = normalizeDshStyle(dshStyle ?? readDshStyle());
      const font = normalizeDshFont(dshFont ?? readDshFont());
      return h('div', { className: cx('dsh-style-fallback-wrap', className) },
        anchor,
        open
          ? h('div', {
              role: 'menu',
              'data-dsh-style': style,
              'data-dsh-font': font,
              'data-window-drag-exclude': '',
              'data-dsh-portal-synced': 'true',
              className: cx('dsh-style-fallback-menu', listClassName),
              onKeyDown: event => {
                if (event?.key === 'Escape') {
                  event.stopPropagation?.();
                  onClose?.();
                }
              },
            },
            items.map(item => {
              const stylePreset = VALID_STYLE_IDS.has(item.id) ? getDshStylePreset(item.id) : null;
              return h('button', {
                key: item.id,
                type: 'button',
                role: 'menuitemradio',
                'aria-checked': item.id === selectedId,
                disabled: Boolean(item.disabled),
                className: 'dsh-style-fallback-item',
                onClick: () => {
                  if (!item.disabled) {
                    onSelect?.(item.id);
                    onClose?.();
                  }
                },
              },
              h('span', { className: 'dsh-style-fallback-item-leading' },
                stylePreset ? h('span', { className: 'dsh-style-swatch', 'aria-hidden': 'true', style: { '--dsh-swatch-color': stylePreset.swatch } }) : null,
                h('span', null, item.label)),
              item.id === selectedId ? h('span', { 'aria-hidden': 'true' }, '✓') : null);
            }),
            children,
            footer)
          : null);
    }

    function FallbackModal({ open = true, onClose, title, closeLabel = 'Close', children, footer, className, contentClassName, onKeyDownCapture, headless = false, dshStyle, dshFont }) {
      if (!open) return null;
      const style = normalizeDshStyle(dshStyle ?? readDshStyle());
      const font = normalizeDshFont(dshFont ?? readDshFont());
      return h('div', {
        className: 'dsh-fallback-modal-root',
        role: 'presentation',
        'data-dsh-style': style,
        'data-dsh-font': font,
        'data-window-drag-exclude': '',
        'data-dsh-portal-synced': 'true',
        onKeyDownCapture,
        // Let nested menus/editors consume Escape before the enclosing dialog.
        onKeyDown: event => {
          if (!event?.defaultPrevented && event?.key === 'Escape') {
            event.stopPropagation?.();
            onClose?.();
          }
        },
      },
      h('div', { className: 'dsh-fallback-modal-mask', 'aria-hidden': 'true', onClick: onClose }),
      h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': title,
        tabIndex: -1,
        'data-dsh-style': style,
        'data-dsh-font': font,
        'data-window-drag-exclude': '',
        'data-dsh-portal-synced': 'true',
        className: cx('dsh-fallback-modal-dialog', className),
      }, headless
        ? children
        : h(React.Fragment || 'div', null,
            h('header', null, h('h2', null, title), h('button', { type: 'button', 'aria-label': closeLabel, onClick: onClose }, '×')),
            h('div', { className: contentClassName }, children),
            footer ? h('footer', null, footer) : null)));
    }

    const WrappedMenu = host?.Menu
      ? function HostMenuWithStyle({ dshStyle, dshFont, children, ...menuProps }) {
          if (!menuProps.open) {
            return children !== undefined ? h(host.Menu, menuProps, children) : h(host.Menu, menuProps);
          }
          const syncNode = renderPortalSyncNode(dshStyle, dshFont);
          return children !== undefined && children !== null
            ? h(host.Menu, menuProps, children, syncNode)
            : h(host.Menu, menuProps, syncNode);
        }
      : FallbackMenu;

    const WrappedModal = host?.Modal
      ? function HostModalWithStyle({ dshStyle, dshFont, children, ...modalProps }) {
          if (!modalProps.open) {
            return children !== undefined ? h(host.Modal, modalProps, children) : h(host.Modal, modalProps);
          }
          const syncNode = renderPortalSyncNode(dshStyle, dshFont);
          return children !== undefined && children !== null
            ? h(host.Modal, modalProps, children, syncNode)
            : h(host.Modal, modalProps, syncNode);
        }
      : FallbackModal;

    const resolved = {
      ...(host || {}),
      isFallback: !host,
      Button: host?.Button || FallbackButton,
      Input: host?.Input || FallbackInput,
      Checkbox: host?.Checkbox || FallbackCheckbox,
      Switch: host?.Switch || FallbackSwitch,
      SegmentedControl: host?.SegmentedControl || FallbackSegmentedControl,
      Menu: WrappedMenu,
      Modal: WrappedModal,
    };
    primitivesByHost.set(host, resolved);
    return resolved;
  }

  const Button = forwardRefWrap(function Button({ children, icon, iconSize = 15, variant = 'outline', size = 'sm', className, ...props }, ref) {
    const P = resolveHostPrimitives();
    const hostVariant = variant === 'danger' ? 'ghost' : (variant || 'outline');
    const iconEl = typeof icon === 'string' ? h(Icon, { name: icon, size: iconSize }) : icon;
    return h(P.Button, {
      ...(ref ? { ref } : {}),
      variant: hostVariant,
      size,
      ...props,
      'data-variant': variant || 'outline',
      className: cx('w-button', variant && 'w-' + variant, className),
      icon: iconEl,
    }, children);
  });

  function IconButton({ label, icon, variant = 'ghost', className, ...props }) {
    return h(Button, { ...props, icon, variant, className: cx('w-icon-button', className), 'aria-label': label, title: label });
  }

  const Input = forwardRefWrap(function Input({ icon, className, inputRef, ...props }, ref) {
    const P = resolveHostPrimitives();
    const iconEl = typeof icon === 'string' ? h(Icon, { name: icon, size: 16 }) : icon;
    const targetRef = inputRef || ref;
    return h(P.Input, {
      ...props,
      ...(targetRef ? { ref: targetRef } : {}),
      icon: iconEl,
      className: cx('w-input', className),
    });
  });

  function Checkbox({ checked = false, onChange, label, hiddenLabel = false, disabled = false, title, className, ...props }) {
    const P = resolveHostPrimitives();
    return h(P.Checkbox, {
      ...props,
      checked: Boolean(checked),
      disabled,
      title,
      label,
      className: cx('w-checkbox', hiddenLabel && 'w-checkbox-icon', className),
      onChange: value => {
        const next = typeof value === 'boolean' ? value : Boolean(value?.target?.checked);
        onChange?.(next);
      },
    });
  }

  function ChoiceMenu({ label, id, value, items = [], onChange, disabled, children, className, align = 'start' }) {
    const [open, setOpen] = useStateHook(false);
    const [style] = useDshStyle();
    const [font] = useDshFont();
    const P = resolveHostPrimitives();
    const selected = items.find(item => item.id === value);
    return h(P.Menu, {
      open: Boolean(open && !disabled),
      selectedId: value,
      dshStyle: style,
      dshFont: font,
      items,
      align,
      portal: !P.isFallback,
      autoFocus: true,
      minWidthFromAnchor: true,
      className: cx('w-menu', className),
      onClose: () => setOpen(false),
      onSelect: next => {
        setOpen(false);
        if (next !== value) onChange?.(next);
      },
      anchor: h(Button, {
        id,
        variant: 'outline',
        className: 'w-menu-button',
        disabled: Boolean(disabled || items.length === 0),
        'aria-label': label,
        'aria-haspopup': 'menu',
        'aria-expanded': Boolean(open && !disabled),
        onClick: () => setOpen(prev => !prev),
        onKeyDown: event => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault?.();
            setOpen(true);
          }
        },
      }, h('span', { className: 'w-menu-value' }, children ?? selected?.label ?? label), h(Icon, { name: 'down', size: 14 })),
    });
  }

  function FontSwitcher({ font: controlledFont, style: controlledStyle, onChange, lang = 'zh', id = 'dsh-font-switcher', compact = true, disabled = false, align = 'end', className, open: controlledOpen, onOpenChange } = {}) {
    const [syncedFont, setSyncedFont] = useDshFont();
    const [syncedStyle] = useDshStyle();
    const activeFont = normalizeDshFont(controlledFont ?? syncedFont);
    const activeStyle = normalizeDshStyle(controlledStyle ?? syncedStyle);
    const [internalOpen, setInternalOpen] = useStateHook(false);
    const open = controlledOpen !== undefined ? Boolean(controlledOpen) : internalOpen;
    const setOpen = next => {
      const resolved = typeof next === 'function' ? next(open) : Boolean(next);
      if (controlledOpen === undefined) setInternalOpen(resolved);
      onOpenChange?.(resolved);
    };
    const isZh = String(lang || '').toLowerCase().startsWith('zh');
    const preset = getDshFontPreset(activeFont);
    const P = resolveHostPrimitives();
    const triggerLabel = isZh ? '字体搭配：' + preset.zh : 'Font pairing: ' + preset.en;
    const visibleText = compact ? (isZh ? preset.zhShort : preset.enShort) : (isZh ? preset.zh : preset.en);
    const items = DSH_FONTS.map(option => ({
      id: option.id,
      label: isZh ? option.zh + ' (' + option.enShort + ')' : option.en,
    }));
    const selectFont = nextId => {
      const applied = writeDshFont(nextId);
      setSyncedFont(applied);
      onChange?.(applied);
      setOpen(false);
    };
    return h(P.Menu, {
      open: Boolean(open && !disabled),
      selectedId: activeFont,
      dshStyle: activeStyle,
      dshFont: activeFont,
      items,
      align,
      portal: !P.isFallback,
      autoFocus: true,
      minWidthFromAnchor: true,
      className,
      onClose: () => setOpen(false),
      onSelect: selectFont,
      anchor: h(P.Button, {
        id,
        variant: 'outline',
        size: 'sm',
        disabled,
        className: 'dsh-font-trigger',
        'aria-label': triggerLabel,
        'aria-haspopup': 'menu',
        'aria-expanded': Boolean(open && !disabled),
        title: triggerLabel,
        onClick: () => setOpen(prev => !prev),
        onKeyDown: event => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault?.();
            setOpen(true);
          }
        },
      },
      h('span', { className: 'dsh-font-glyph', 'aria-hidden': 'true' }, isZh ? '字' : 'Aa'),
      h('span', { className: 'dsh-font-label' }, visibleText),
      h(Icon, { name: 'down', size: 13 })),
    });
  }

  function StyleSwitcher({ style: controlledStyle, font: controlledFont, onChange, onFontChange, showFontSwitcher = true, lang = 'zh', id = 'dsh-style-switcher', compact = true, disabled = false, align = 'end', className } = {}) {
    const [syncedStyle, setSyncedStyle] = useDshStyle();
    const [syncedFont] = useDshFont();
    const activeStyle = normalizeDshStyle(controlledStyle ?? syncedStyle);
    const activeFont = normalizeDshFont(controlledFont ?? syncedFont);
    const [open, setOpen] = useStateHook(false);
    const [fontOpen, setFontOpen] = useStateHook(false);
    const isZh = String(lang || '').toLowerCase().startsWith('zh');
    const preset = getDshStylePreset(activeStyle);
    const P = resolveHostPrimitives();
    const triggerLabel = isZh ? '界面风格：' + preset.zh : 'UI style: ' + preset.en;
    const visibleText = compact ? (isZh ? preset.zhShort : preset.enShort) : (isZh ? preset.zh : preset.en);
    const items = DSH_STYLES.map(option => ({
      id: option.id,
      label: isZh ? option.zh + ' (' + option.enShort + ')' : option.en,
    }));
    const selectStyle = nextId => {
      const applied = writeDshStyle(nextId);
      setSyncedStyle(applied);
      onChange?.(applied);
      setOpen(false);
    };
    return h('div', {
      className: cx('dsh-style-switcher', className),
      'data-window-drag-exclude': '',
    }, h(P.Menu, {
      open: Boolean(open && !disabled),
      selectedId: activeStyle,
      dshStyle: activeStyle,
      dshFont: activeFont,
      items,
      align,
      portal: !P.isFallback,
      autoFocus: true,
      minWidthFromAnchor: true,
      onClose: () => setOpen(false),
      onSelect: selectStyle,
      anchor: h(P.Button, {
        id,
        variant: 'outline',
        size: 'sm',
        disabled,
        className: 'dsh-style-trigger',
        'aria-label': triggerLabel,
        'aria-haspopup': 'menu',
        'aria-expanded': Boolean(open && !disabled),
        title: triggerLabel,
        onClick: () => {
          setFontOpen(false);
          setOpen(prev => !prev);
        },
        onKeyDown: event => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault?.();
            setFontOpen(false);
            setOpen(true);
          }
        },
      },
      h('span', { className: 'dsh-style-swatch', 'aria-hidden': 'true', style: { '--dsh-swatch-color': preset.swatch } }),
      h('span', { className: 'dsh-style-label' }, visibleText),
      h(Icon, { name: 'down', size: 14 })),
    }),
    showFontSwitcher
      ? h(FontSwitcher, {
          id: id + '-font',
          font: controlledFont,
          style: activeStyle,
          onChange: onFontChange,
          lang,
          compact: true,
          disabled,
          align,
          open: Boolean(fontOpen && !disabled),
          onOpenChange: next => {
            if (next) setOpen(false);
            setFontOpen(next);
          },
        })
      : null);
  }

  const tourSessionDone = new Set();

  function readTourDone(storageKey, win) {
    const key = String(storageKey || 'dsh-workbench.tour.v1');
    if (tourSessionDone.has(key)) return true;
    const target = resolveWindow(win);
    if (!target) return false;
    try {
      return target.localStorage?.getItem(key) === 'done';
    } catch {
      return false;
    }
  }

  function writeTourDone(storageKey, win) {
    const key = String(storageKey || 'dsh-workbench.tour.v1');
    tourSessionDone.add(key);
    const target = resolveWindow(win);
    if (!target) return;
    try {
      target.localStorage?.setItem(key, 'done');
    } catch {
      // Restricted storage: in-memory tourSessionDone keeps tour dismissed for the session.
    }
  }

  function hasOpenModalDialog(pageNode) {
    const doc = pageNode?.ownerDocument || resolveWindow()?.document || (typeof document !== 'undefined' ? document : null);
    if (!doc || typeof doc.querySelectorAll !== 'function') return false;
    const dialogs = doc.querySelectorAll('[role="dialog"]:not([data-tour-card])');
    for (const el of dialogs) {
      if (pageNode && el !== pageNode && typeof el.contains === 'function' && el.contains(pageNode)) continue;
      return true;
    }
    return false;
  }

  function computeTourLayout(target, preferredSide, cardEl) {
    const win = resolveWindow();
    const vw = (win && win.innerWidth) || 1280;
    const vh = (win && win.innerHeight) || 800;
    const cw = cardEl?.offsetWidth || 320;
    const ch = cardEl?.offsetHeight || 196;
    const pad = 5;
    const gap = 12;
    const raw = target?.getBoundingClientRect?.();
    if (!target) {
      return {
        spotlight: null,
        side: 'center',
        left: Math.max(12, Math.round((vw - cw) / 2)),
        top: Math.max(12, Math.round((vh - ch) / 2)),
        arrowX: 28,
        arrowY: 24,
      };
    }
    const hasBox = Boolean(raw && (raw.width > 0 || raw.height > 0));
    const rect = hasBox ? raw : { left: 120, top: 72, width: 140, height: 32 };
    const spotlight = {
      left: Math.round(rect.left - pad),
      top: Math.round(rect.top - pad),
      width: Math.round(rect.width + pad * 2),
      height: Math.round(rect.height + pad * 2),
    };
    const spaceBottom = vh - spotlight.top - spotlight.height;
    const spaceTop = spotlight.top;
    const spaceRight = vw - spotlight.left - spotlight.width;
    const spaceLeft = spotlight.left;
    let side = preferredSide || 'bottom';
    if (side === 'right' && spaceRight < cw + gap + 12) {
      side = spaceBottom >= ch + gap + 12 ? 'bottom' : spaceLeft >= cw + gap + 12 ? 'left' : 'top';
    } else if (side === 'left' && spaceLeft < cw + gap + 12) {
      side = spaceRight >= cw + gap + 12 ? 'right' : 'bottom';
    } else if (side === 'bottom' && spaceBottom < ch + gap + 12 && spaceTop > spaceBottom) {
      side = 'top';
    } else if (side === 'top' && spaceTop < ch + gap + 12 && spaceBottom > spaceTop) {
      side = 'bottom';
    }
    let left = spotlight.left;
    let top = spotlight.top + spotlight.height + gap;
    if (side === 'top') top = spotlight.top - ch - gap;
    else if (side === 'right') { left = spotlight.left + spotlight.width + gap; top = spotlight.top; }
    else if (side === 'left') { left = spotlight.left - cw - gap; top = spotlight.top; }
    left = Math.round(Math.max(12, Math.min(vw - cw - 12, left)));
    top = Math.round(Math.max(12, Math.min(vh - ch - 12, top)));
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return {
      spotlight,
      side,
      left,
      top,
      arrowX: Math.round(Math.max(18, Math.min(cw - 18, centerX - left))),
      arrowY: Math.round(Math.max(18, Math.min(ch - 18, centerY - top))),
    };
  }

  function CoachmarkTour({ rootRef, steps = [], step = 0, manual = false, style = 'harness', font, lang = 'zh', layout: rawLayout, setLayout, onStep, onClose, onCopyPrompt }) {
    const layerRef = useRefHook(null);
    const cardRef = useRefHook(null);
    const nextBtnRef = useRefHook(null);
    const [copied, setCopied] = useStateHook(false);
    const titleId = useIdHook() + '-tour-title';
    const isEn = String(lang || '').toLowerCase().startsWith('en');
    const l = (zh, en) => (isEn ? en : zh);
    const safeIndex = Math.max(0, Math.min(steps.length - 1, step));
    const current = steps[safeIndex] || {};
    const activeStyle = normalizeDshStyle(style);
    const activeFont = normalizeDshFont(font ?? readDshFont());
    const layout = rawLayout && typeof rawLayout === 'object' && rawLayout.side
      ? rawLayout
      : { spotlight: null, side: current.side || 'bottom', left: 24, top: 76, arrowX: 28, arrowY: 24 };

    useEffectHook(() => {
      const node = layerRef.current;
      if (!node) return undefined;
      try {
        node.setAttribute?.('popover', 'manual');
        node.showPopover?.();
      } catch { /* ignore */ }
      return () => { try { node.hidePopover?.(); } catch { /* ignore */ } };
    }, []);

    useEffectHook(() => {
      setCopied(false);
    }, [safeIndex]);

    useEffectHook(() => {
      function safeQuery(root, selector) {
        if (!root || typeof root.querySelector !== 'function' || !selector) return null;
        try {
          return root.querySelector(selector);
        } catch {
          if (typeof selector === 'string' && selector.startsWith('#') && !/[\s>+~,\[:.\]]/.test(selector.slice(1))) {
            try {
              const id = selector.slice(1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
              return root.querySelector('[id="' + id + '"]');
            } catch {
              return null;
            }
          }
          return null;
        }
      }
      function measure() {
        const doc = resolveWindow()?.document || (typeof document !== 'undefined' ? document : null);
        const scope = rootRef?.current || doc;
        if (!scope || typeof scope.querySelector !== 'function') return;
        const target = safeQuery(scope, current.selector)
          || safeQuery(scope, current.fallback)
          || (scope !== doc ? (safeQuery(doc, current.selector) || safeQuery(doc, current.fallback)) : null)
          || null;
        setLayout?.(computeTourLayout(target, current.side, cardRef.current));
      }
      measure();
      const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(measure) : null;
      const win = resolveWindow();
      if (!win || typeof win.addEventListener !== 'function') {
        return () => { if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf); };
      }
      win.addEventListener('resize', measure, { passive: true });
      win.addEventListener('scroll', measure, true);
      return () => {
        if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
        win.removeEventListener('resize', measure);
        win.removeEventListener('scroll', measure, true);
      };
    }, [safeIndex, current.selector, current.fallback, current.side]);

    useEffectHook(() => {
      if (manual) {
        const btn = nextBtnRef.current || cardRef.current?.querySelector?.('[data-tour-next]');
        btn?.focus?.();
      }
    }, [manual, safeIndex]);

    async function defaultCopyPrompt(text) {
      const win = resolveWindow();
      const nav = win?.navigator || (typeof navigator !== 'undefined' ? navigator : null);
      if (nav?.clipboard?.writeText) {
        try {
          await nav.clipboard.writeText(String(text));
          return true;
        } catch { /* ignore */ }
      }
      return false;
    }

    async function handleCopy() {
      if (!current.prompt) return;
      const copyFn = typeof onCopyPrompt === 'function' ? onCopyPrompt : defaultCopyPrompt;
      const ok = await copyFn(current.prompt);
      if (ok !== false) {
        setCopied(true);
        const timer = setTimeout(() => setCopied(false), 1800);
        if (timer && typeof timer.unref === 'function') timer.unref();
      }
    }

    const isLast = safeIndex >= steps.length - 1;
    function finish() { onClose?.(manual); }
    function onKeyDown(event) {
      if (event.isComposing || event.nativeEvent?.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault?.();
        event.stopPropagation?.();
        finish();
      } else if (event.key === 'ArrowRight' && !isLast) {
        event.preventDefault?.();
        onStep?.(safeIndex + 1, true);
      } else if (event.key === 'ArrowLeft' && safeIndex > 0) {
        event.preventDefault?.();
        onStep?.(safeIndex - 1, true);
      }
    }

    return h('div', {
      ref: layerRef,
      className: 'dshw w-tour-layer',
      'data-dsh-style': activeStyle,
      'data-dsh-font': activeFont,
      'data-wb-tour': current.id || String(safeIndex),
      'data-window-drag-exclude': '',
    },
      layout.spotlight
        ? h('div', {
            className: 'w-tour-spotlight',
            'data-tour-spotlight': current.id || String(safeIndex),
            'aria-hidden': 'true',
            style: {
              left: layout.spotlight.left + 'px',
              top: layout.spotlight.top + 'px',
              width: layout.spotlight.width + 'px',
              height: layout.spotlight.height + 'px',
            },
          })
        : h('div', { className: 'w-tour-backdrop-fallback', 'aria-hidden': 'true' }),
      h('div', {
        ref: cardRef,
        role: 'dialog',
        'aria-modal': 'false',
        'aria-labelledby': titleId,
        tabIndex: -1,
        onKeyDown,
        className: 'w-tour-card',
        'data-side': layout.side,
        'data-tour-card': current.id || String(safeIndex),
        style: {
          left: layout.left + 'px',
          top: layout.top + 'px',
          '--arrow-x': layout.arrowX + 'px',
          '--arrow-y': layout.arrowY + 'px',
        },
      },
        h('span', { className: 'w-tour-arrow', 'data-tour-arrow': layout.side, 'aria-hidden': 'true' }),
        h('div', { className: 'w-tour-head' },
          h('div', { className: 'w-tour-step-meta' },
            h('span', { className: 'w-tour-step-badge' }, (safeIndex + 1) + ' / ' + steps.length),
            h('span', { className: 'w-tour-dots', 'aria-hidden': 'true' },
              steps.map((item, idx) => h('span', { key: item.id || idx, className: 'w-tour-dot', 'data-active': idx === safeIndex ? 'true' : undefined })))),
          h('button', { type: 'button', className: 'w-tour-skip', 'data-tour-skip': '', onClick: finish }, l('跳过', 'Skip'))),
        h('h2', { id: titleId, className: 'w-tour-title' }, current.title),
        h('p', { className: 'w-tour-desc' }, current.desc),
        current.prompt ? h('div', { className: 'w-tour-inline-action' },
          h(Button, {
            variant: 'outline',
            size: 'sm',
            icon: copied ? 'check' : 'copy',
            'data-copy-prompt': current.prompt,
            'data-copied': copied ? 'true' : undefined,
            onClick: () => { void handleCopy(); },
          }, copied ? l('已复制', 'Copied') : (current.promptLabel || l('复制对话指令', 'Copy prompt')))) : null,
        h('div', { className: 'w-tour-footer' },
          safeIndex > 0
            ? h(Button, { variant: 'ghost', size: 'sm', onClick: () => onStep?.(safeIndex - 1, true), 'data-tour-prev': '' }, l('上一步', 'Back'))
            : h('span', null),
          h('div', { className: 'w-tour-nav' },
            h(Button, {
              ref: nextBtnRef,
              variant: 'primary',
              size: 'sm',
              'data-tour-next': '',
              onClick: () => (isLast ? finish() : onStep?.(safeIndex + 1, true)),
            }, isLast ? l('完成引导', 'Done') : l('下一步', 'Next'))))));
  }

  function TabBar({ items = [], value, onChange, label, id: explicitId, className, pill = true }) {
    const fallbackId = useIdHook();
    const id = explicitId || fallbackId;
    const active = items.some(item => item.id === value) ? value : items[0]?.id;
    const indicator = useSlidingTabIndicator(active, { deps: [items.length] });
    function keys(event, index) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      const node = event.currentTarget.parentElement?.querySelectorAll('[role=tab]')[next];
      if (node) { onChange(items[next].id); node.focus(); }
    }
    return h('div', {
      ...indicator.tablistProps,
      className: cx('w-tabs', 'dsh-tablist', pill && 'dsh-tablist-pill', className),
      role: 'tablist',
      'aria-label': label,
      'data-window-drag-exclude': '',
    },
    items.map((item, index) => h('button', {
      type: 'button',
      role: 'tab',
      key: item.id,
      className: 'w-tab',
      id: id + '-' + item.id,
      'data-tab-id': item.id,
      ...(item['data-tour'] ? { 'data-tour': item['data-tour'] } : {}),
      'aria-selected': active === item.id,
      tabIndex: active === item.id ? 0 : -1,
      onClick: () => onChange(item.id),
      onKeyDown: event => keys(event, index),
    }, item.icon ? h(Icon, { name: item.icon, size: 14 }) : null, h('span', null, item.label), item.count !== undefined ? h('span', { className: 'w-count' }, item.count) : null)),
    h('span', indicator.indicatorProps));
  }

  function Page({ title, subtitle, headerMeta, icon, tabs, navigation, actions, children, workbench = false, lang = 'zh', showStyleSwitcher = true, showFontSwitcher = true, className, rootRef, tourSteps = null, tourStorageKey = 'dsh-workbench.tour.v1', onTourCopyPrompt, ...props }) {
    const [style, setStyle] = useDshStyle();
    const [font, setFont] = useDshFont();
    const fallbackRootRef = useRefHook(null);
    const pageRef = rootRef && typeof rootRef === 'object' ? rootRef : fallbackRootRef;
    const triggerRef = useRefHook(null);
    const [tour, setTour] = useStateHook({ open: false, step: 0, manual: false });
    const [tourLayout, setTourLayout] = useStateHook(null);
    const hasTour = Array.isArray(tourSteps) && tourSteps.length > 0;
    const isEn = String(lang || '').toLowerCase().startsWith('en');
    const titleTooltip = typeof subtitle === 'string' && subtitle ? subtitle : undefined;
    const inlineTabs = tabs && Array.isArray(tabs.items) && tabs.items.length > 0
      ? h(TabBar, {
          id: tabs.id,
          items: tabs.items,
          value: tabs.value,
          onChange: tabs.onChange,
          label: tabs.label,
          pill: tabs.pill !== false,
        })
      : null;

    useEffectHook(() => {
      if (!workbench || !hasTour || readTourDone(tourStorageKey)) return undefined;
      const timer = setTimeout(() => {
        if (!readTourDone(tourStorageKey) && !hasOpenModalDialog(pageRef.current)) {
          setTour({ open: true, step: 0, manual: false });
        }
      }, 280);
      if (timer && typeof timer.unref === 'function') timer.unref();
      return () => clearTimeout(timer);
    }, [workbench, hasTour, tourStorageKey]);

    useEffectHook(() => {
      if (!tour.open || tour.manual) return undefined;
      if (hasOpenModalDialog(pageRef.current)) {
        writeTourDone(tourStorageKey);
        setTour(prev => (prev.open ? { ...prev, open: false } : prev));
        return undefined;
      }
      const doc = pageRef.current?.ownerDocument || resolveWindow()?.document || (typeof document !== 'undefined' ? document : null);
      if (typeof MutationObserver !== 'function' || !doc?.body || typeof doc.body.nodeType !== 'number') return undefined;
      const observer = new MutationObserver(() => {
        if (hasOpenModalDialog(pageRef.current)) {
          writeTourDone(tourStorageKey);
          setTour(prev => (prev.open && !prev.manual ? { ...prev, open: false } : prev));
        }
      });
      observer.observe(doc.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }, [tour.open, tour.manual, tourStorageKey, children]);

    function closeTour(restoreFocus = false) {
      writeTourDone(tourStorageKey);
      setTour(prev => ({ ...prev, open: false }));
      if (restoreFocus) {
        const timer = setTimeout(() => {
          const btn = triggerRef.current || pageRef.current?.querySelector?.('[data-wb-tour-trigger]');
          btn?.focus?.();
        }, 0);
        if (timer && typeof timer.unref === 'function') timer.unref();
      }
    }

    return h('section', {
      ...props,
      ref: pageRef,
      'data-dsh-style': style,
      'data-dsh-font': font,
      'data-main': workbench ? 'true' : 'false',
      className: cx('dshw', 'w-page', !workbench && 'w-embedded', className),
    },
      h(Styles, { key: 'styles' }),
      h('header', { className: cx('w-page-header', 'dsh-header'), 'data-dsh-header': '' },
        h('div', { className: 'dsh-header-leading' },
          h('div', { className: 'dsh-header-brand' },
            icon ? h('span', { className: cx('w-brand', 'dsh-header-badge'), 'aria-hidden': 'true' }, h(Icon, { name: icon, size: 14 })) : null,
            h('h1', { className: cx('w-title', 'dsh-header-title'), title: titleTooltip }, title),
            headerMeta || null),
          (inlineTabs || navigation) ? h('div', { className: 'dsh-header-tabs' }, inlineTabs, navigation || null) : null),
        (actions || showStyleSwitcher || hasTour)
          ? h('div', { className: 'w-header-actions', 'data-dsh-header-actions': '', 'data-window-drag-exclude': '' },
              hasTour ? h(Button, {
                ref: triggerRef,
                variant: 'ghost',
                size: 'sm',
                className: 'w-tour-trigger',
                'data-wb-tour-trigger': '',
                'aria-label': isEn ? 'Interactive guide' : '使用引导',
                'aria-expanded': Boolean(tour.open),
                title: isEn ? 'Interactive guide' : '使用引导',
                onClick: () => {
                  if (tour.open) closeTour(true);
                  else setTour({ open: true, step: 0, manual: true });
                },
              }, isEn ? '? Tour' : '? 引导') : null,
              showStyleSwitcher ? h(StyleSwitcher, { style, font, onChange: setStyle, onFontChange: setFont, showFontSwitcher, lang, compact: true }) : null,
              actions)
          : null),
      h('div', { className: 'w-body' }, children),
      hasTour && tour.open ? h(CoachmarkTour, {
        rootRef: pageRef,
        steps: tourSteps,
        step: tour.step,
        manual: tour.manual,
        style,
        font,
        lang,
        layout: tourLayout,
        setLayout: setTourLayout,
        onStep: (next, isManual) => setTour({ open: true, step: next, manual: Boolean(isManual) }),
        onClose: closeTour,
        onCopyPrompt: onTourCopyPrompt,
      }) : null);
  }

  function Tabs({ items, value, onChange, label, children, pill = false }) {
    const id = useIdHook();
    const active = items.some(item => item.id === value) ? value : items[0]?.id;
    return h('div', { className: 'w-tabs-layout' },
      h(TabBar, { id, items, value: active, onChange, label, pill }),
      children !== undefined
        ? h('div', {
            key: active,
            className: 'w-tab-panel dsh-tab-panel',
            'data-dsh-tab-panel': '',
            id: id + '-panel',
            role: 'tabpanel',
            'aria-labelledby': id + '-' + active,
          }, children)
        : null);
  }

  function Status({ children, tone = 'info', className }) {
    if (!children) return null;
    return h('div', {
      className: cx('dshw', 'w-status', 'w-status-' + tone, className),
      'data-tone': tone,
      role: tone === 'error' ? 'alert' : 'status',
      'aria-live': tone === 'error' ? 'assertive' : 'polite',
    }, h(Icon, { name: tone === 'success' ? 'check' : 'info', size: 16 }), h('div', { className: 'w-status-text' }, children));
  }

  function Empty({ title, children, action, icon = 'file' }) {
    const [style] = useDshStyle();
    const [font] = useDshFont();
    return h('div', { className: 'dshw w-empty', 'data-dsh-style': style, 'data-dsh-font': font },
      h(Styles, { key: 'styles' }),
      h('span', { className: 'w-empty-icon' }, h(Icon, { name: icon, size: 24 })),
      h('h2', { 'data-dsh-serif': '' }, title),
      children ? h('div', { className: 'w-muted' }, children) : null,
      action ? h('div', { className: 'w-toolbar' }, action) : null);
  }

  function Split({ list, detail, selected, onBack, backLabel, className, listWidth = 360, storageKey, minWidth = 220, maxWidth = 540, resizerLabel = 'Resize pane' }) {
    const ref = useRefHook(null);
    const splitState = storageKey
      ? useResizableSplit({ key: storageKey, initial: listWidth, min: minWidth, max: maxWidth })
      : null;
    useEffectHook(() => {
      if (!selected || !ref.current || ref.current.clientWidth > 760) return;
      const heading = ref.current.querySelector('.w-detail h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }, [selected]);
    const effectiveWidth = splitState ? splitState.size : listWidth;
    return h('div', {
      ref,
      className: cx('w-split', storageKey && 'dsh-split-pane', className),
      'data-selected': selected ? 'true' : 'false',
      style: { '--w-list-width': effectiveWidth + 'px', '--dsh-split-size': effectiveWidth + 'px' },
    },
      h('div', { className: cx('w-master', storageKey && 'dsh-split-leading') }, list),
      storageKey ? h(SplitResizer, { ...splitState.resizerProps, label: resizerLabel }) : null,
      h('div', { className: cx('w-detail', storageKey && 'dsh-split-trailing') }, selected ? h(Button, { className: 'w-back', icon: 'left', variant: 'ghost', onClick: onBack }, backLabel) : null, detail));
  }

  function Row({ title, meta, description, active, onClick, children, actions, status, className, disabled }) {
    return h('div', {
      className: cx('w-row', 'dsh-row', active && 'w-selected', className),
      'data-dsh-row': '',
      'data-active': active ? 'true' : 'false',
      'data-selected': active ? 'true' : 'false',
    },
      children ? h('div', { className: 'w-row-select' }, children) : null,
      h('button', { type: 'button', className: 'w-row-button', onClick, disabled, 'aria-pressed': !!active },
        h('span', { className: 'w-row-head' },
          h('span', { className: 'w-row-title-wrap' },
            h('span', { className: 'dsh-pixel-cursor', 'aria-hidden': 'true' }, '▶'),
            h('strong', { 'data-dsh-serif': '' }, title)),
          status ? h('span', { className: 'w-tag' }, status) : null),
        meta ? h('span', { className: 'w-row-meta' }, meta) : null,
        description ? h('span', { className: 'w-row-description' }, description) : null),
      actions ? h('div', { className: 'dsh-row-actions', 'data-window-drag-exclude': '' }, actions) : null);
  }

  function Search({ label, value, onChange, ...props }) {
    const id = useIdHook();
    return h(Input, { type: 'search', id, icon: 'search', 'aria-label': label, placeholder: label, value, onChange, className: 'w-search', ...props });
  }

  function Switch({ label, checked, onChange, disabled, className }) {
    const P = resolveHostPrimitives();
    return h('div', { className: cx('w-switch-row', className) },
      label ? h('span', { className: 'w-switch-text' }, label) : null,
      h(P.Switch, {
        checked: Boolean(checked),
        disabled,
        label,
        className: 'w-switch',
        onChange: next => onChange?.(typeof next === 'boolean' ? next : Boolean(next?.target?.checked)),
      }));
  }

  function Dialog({ title, children, onClose, closeLabel, className, busy = false, footer, tone }) {
    const [style] = useDshStyle();
    const [font] = useDshFont();
    const id = useIdHook();
    const P = resolveHostPrimitives();
    const close = () => { if (!busy) onClose?.(); };
    return h(P.Modal, {
      open: true,
      headless: true,
      dshStyle: style,
      dshFont: font,
      title,
      onClose: close,
      backdropBlur: false,
      className: cx('dshw', 'w-dialog-modal', className),
    },
      h('div', {
        ref: createOverlaySyncRef(style, font),
        className: cx('dshw', 'w-dialog', className),
        'data-dsh-style': style,
        'data-dsh-font': font,
        'data-window-drag-exclude': '',
        'aria-labelledby': id,
      },
        h(Styles, { key: 'styles' }),
        h('header', { className: 'w-dialog-header' },
          h('h2', { id, 'data-tone': tone, 'data-dsh-serif': '' }, title),
          h(IconButton, { icon: 'close', label: closeLabel, disabled: busy, onClick: close })),
        h('div', { className: 'w-dialog-body', 'aria-busy': busy || undefined }, children),
        footer ? h('footer', { className: 'w-dialog-footer' }, footer) : null));
  }

  function register(ctx, { id, label, icon, component, inject, order = 50 }) {
    ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: id, inject: () => ({ ...(inject?.() || {}), workbench: true }) }, component));
    ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id, order, label }, function WorkbenchIcon({ size }) { return h(Icon, { name: icon, size }); }));
  }

  const styles = `
/* ==========================================================================
 * DeepSeek Harness (>=0.2.2-rc.3) Unified Workbench Themes & Motion System v3
 * Shared across STARDUSTLC666 workbench plugins:
 *   dsh-email, dsh-calendar, dsh-cite, dsh-dream, dsh-code-security,
 *   dsh-rss, dsh-ppt, dsh-remotion, dsh-hyperframes
 *
 * Design Principles:
 * 1. NEVER TOO DARK: Airy daylight defaults; when host \`body[data-ds-dark-theme]\`
 *    is active under \`harness\`, soften to breathable slate (#1f232b / #272c36),
 *    never pitch black (#000 / #090a0f / #151517).
 * 2. 13 SWITCHABLE PRESETS via \`[data-dsh-style]\` + 8 FONT PAIRINGS via \`[data-dsh-font]\`:
 *    - \`harness\`   (原生清透 / Native Airy)
 *    - \`cream\`     (米白纸感 / Warm Cream — stacked paper, dashed rows, bookmark tab)
 *    - \`claude\`    (Claude 暖书卷 / Claude Warmth — editorial serif, paper grain, borderless cards)
 *    - \`pixel8bit\` (8-Bit 掌机 / Bright 8-Bit — dot-matrix header, 2px borders, ▶ cursor, pixel progress)
 *    - \`mint\`      (晴空薄荷 / Airy Mint)
 *    - \`glass\`     (晴昼琉璃 / Daylight Glass — pastel aurora mesh, frosted blur, specular inner rim)
 *    - \`eink\`      (护眼墨水屏 / E-Ink Paper — matte warm paper, #171716 ink, 60ms snappy transitions)
 *    - \`blueprint\` (工程晒图 / Blueprint — cyanotype grid, Prussian #0d3b66 ink, safety-orange #e05a2b, \`+\` ticks)
 *    - \`risograph\` (波普孔版 / Riso Zine — halftone header, 2px #18181b outlines, #ff3e7f/#2563eb offset shadows)
 *    - \`win98\`     (千禧复古 / Retro 98 — Platinum silver 3D raised/sunken bevels, royal-blue titlebar accent)
 *    - \`songhui\`   (宋韵朱砂 / Song Xuan — gold-flecked Xuan paper, 3px double #b83b2a masthead, seal stamps)
 *    - \`frutiger\`  (晴空水晶 / Aqua Gloss — sky-aqua gradient, glossy specular 999px aqua pills)
 *    - \`gazette\`   (铅字晨报 / Gazette — warm newsprint, 4px double #161514 masthead, 1px column rules, #9b1c1c seal)
 *    - Dual-layer Chinese + Latin typography per preset + independent \`[data-dsh-font]\` overrides
 *      (\`auto\`, \`songkai\`, \`fangsong\`, \`poster\`, \`retro98\`, \`serif\`, \`arcade\`, \`modern\`)
 * 3. SHARED v3 LAYOUT & MOTION PRIMITIVES:
 *    - Unified 48px Single-Row Header (\`.dsh-header\`) + compact \`.dsh-style-switcher\` + \`.dsh-font-trigger\`
 *    - Sliding Tab Indicator (\`.dsh-tablist\` + \`.dsh-tab-indicator\`) + 140ms Panel Enter
 *    - Resizable Split Pane (\`.dsh-split-pane\`, \`.dsh-split-resizer\`, <760px auto-stack)
 *    - Theme-Tinted Shimmer Skeleton (\`.dsh-skeleton\`)
 *    - Row Hover Quick-Action Bar (\`.dsh-row-actions\`)
 *    - Calm Compact Update Strip (\`[data-plugin-update-footer]\`)
 * 4. PORTALED OVERLAY SYNC + \`prefers-reduced-motion\` + \`forced-colors\` compliance.
 * ========================================================================== */

/* --------------------------------------------------------------------------
 * 1. Motion Timing & Base Token Fallbacks (Standalone + Host Safe)
 * -------------------------------------------------------------------------- */
:where([data-dsh-style]),
:where([data-dsh-portal-synced]),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) {
  --dsh-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --dsh-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  /* Standard cubic-bezier fallback before linear() physics spring */
  --dsh-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --dsh-motion-fast: 140ms;
  --dsh-motion-base: 200ms;
  --dsh-motion-dialog: 220ms;
  --dsh-control-border-width: 0.5px;
  --dsh-button-shadow: none;
  --dsh-button-hover-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
  --dsh-card-shadow: none;
  --dsh-card-hover-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
  --dsh-font-display: "Cascadia Code SemiBold", "Cascadia Code", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-body: "Cascadia Code", "Cascadia Mono", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-mono: "Cascadia Mono", "Cascadia Code", "YouYuan", "幼圆", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.015em;
  --dsh-body-tracking: normal;
  --dsh-serif-font: "Palatino Linotype", Georgia, "Noto Serif SC", "STZhongsong", "华文中宋", "STSong", "华文宋体", serif;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

@supports (transition-timing-function: linear(0, 1)) {
  :where([data-dsh-style]),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) {
    --dsh-ease-spring: linear(
      0, 0.402 7.4%, 0.711 15.3%, 0.929 23.7%, 1.008 28.2%,
      1.067 33%, 1.099 36.9%, 1.12 41%, 1.13 45.4%, 1.13 50.1%,
      1.111 58.5%, 1.019 83.2%, 1.004 91.3%, 1
    );
  }
}

/* Electron / macOS 0.2.2+ window-drag-regions rule:
 * Exclude ONLY the visible overlay owner box itself (never \`[data-window-drag-exclude] *\`,
 * so scrolled/clipped descendants cannot register offscreen no-drag rects over headers). */
[data-window-drag-exclude] {
  -webkit-app-region: no-drag;
}

/* --------------------------------------------------------------------------
 * 2. Preset 1: \`harness\` — 原生清透 / Native Airy
 * -------------------------------------------------------------------------- */
[data-dsh-style="harness"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="harness"], :has([data-dsh-style="harness"])) {
  --dsh-font-display: "Cascadia Code SemiBold", "Cascadia Code", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-body: "Cascadia Code", "Cascadia Mono", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-mono: "Cascadia Mono", "Cascadia Code", "YouYuan", "幼圆", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.015em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

:where(body:not([data-ds-dark-theme])) [data-dsh-style="harness"],
:where(body:not([data-ds-dark-theme])) :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style="harness"]) {
  color-scheme: light;
  accent-color: var(--dsw-alias-state-business-primary, #4176e6);
}

/* Standalone fallbacks when host ui-theme stylesheet is not mounted (e.g. jsdom / preview) */
:root:not([data-dsh-host-tokens]) [data-dsh-style="harness"] {
  --dsw-radius-xs: 6px;
  --dsw-radius-sm: 8px;
  --dsw-radius-md: 12px;
  --dsw-radius-lg: 16px;
  --dsw-radius-xl: 20px;
}

body:not([data-ds-dark-theme]) [data-dsh-style="harness"] {
  --dsh-surface-spotlight: rgba(65, 118, 230, 0.06);
}

/* NEVER TOO DARK: Soft breathable slate when host dark mode is active in \`harness\` mode */
body[data-ds-dark-theme] [data-dsh-style="harness"],
body[data-ds-dark-theme] :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="harness"], :has([data-dsh-style="harness"])) {
  color-scheme: dark;
  accent-color: #7aaaff;
  --dsw-alias-bg-base: #1f232b;
  --dsw-alias-bg-layer-1: #272c36;
  --dsw-alias-bg-layer-2: #2f3542;
  --dsw-alias-bg-layer-3: #373e4d;
  --dsw-alias-bg-overlay: #2a303c;
  --dsw-alias-bg-module-platform: #2c323e;
  --dsw-alias-settings-card-fill: #262b35;
  --dsw-alias-settings-card-stroke: rgba(226, 232, 240, 0.12);
  --dsw-specific-menu: rgba(39, 44, 54, 0.96);
  --dsw-alias-border-l1: rgba(226, 232, 240, 0.09);
  --dsw-alias-border-l2: rgba(226, 232, 240, 0.15);
  --dsw-alias-border-l3: rgba(226, 232, 240, 0.22);
  --dsw-alias-border-l4: rgba(226, 232, 240, 0.28);
  --dsw-alias-label-primary: #eef2f7;
  --dsw-alias-label-secondary: #b6c0cf;
  --dsw-alias-label-tertiary: #8d98ab;
  --dsw-alias-label-dimmed: #737e91;
  --dsw-alias-brand-primary: #7aaaff;
  --dsw-alias-brand-text: #eef2f7;
  --dsw-alias-state-business-primary: #7aaaff;
  --dsw-alias-state-business-tertiary: rgba(122, 170, 255, 0.16);
  --dsw-alias-link: #8bb6ff;
  --dsw-alias-button-primary-fill: #5b8def;
  --dsw-alias-button-primary-hover: #6f9cf4;
  --dsw-alias-button-primary-ink: #ffffff;
  --dsw-alias-interactive-bg-hover: rgba(226, 232, 240, 0.07);
  --dsw-alias-interactive-bg-active: rgba(226, 232, 240, 0.13);
  --dsw-alias-interactive-bg-hover-accent: rgba(122, 170, 255, 0.15);
  --dsw-alias-interactive-bg-hover-danger: rgba(248, 113, 113, 0.16);
  --dsw-alias-state-error-primary: #f87171;
  --dsw-alias-state-warn-primary: #fbbf24;
  --dsw-alias-state-warn-label: #fcd34d;
  --dsw-alias-state-warn-tertiary: rgba(251, 191, 36, 0.15);
  --dsw-alias-state-success-primary: #4ade80;
  --dsw-elevation-panel: 0 4px 16px rgba(10, 14, 22, 0.28), 0 0 0 1px rgba(226, 232, 240, 0.12);
  --dsw-elevation-prominent: 0 14px 38px rgba(10, 14, 22, 0.42), 0 0 0 1px rgba(226, 232, 240, 0.16);
  --dsh-button-hover-shadow: 0 2px 8px rgba(10, 14, 22, 0.25);
  --dsh-card-hover-shadow: 0 8px 22px rgba(10, 14, 22, 0.32);
  --dsh-surface-spotlight: rgba(122, 170, 255, 0.10);
}

/* --------------------------------------------------------------------------
 * 3. Preset 2: \`cream\` — 米白纸感 / Warm Cream (Deepened Materiality)
 *    - Stacked-paper double-edge card shadow
 *    - Dashed notebook row dividers
 *    - Warm bookmark-style active tab accent
 * -------------------------------------------------------------------------- */
[data-dsh-style="cream"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="cream"], :has([data-dsh-style="cream"])) {
  color-scheme: light;
  accent-color: #9e5829;
  --dsw-alias-bg-base: #faf7f0;
  --dsw-alias-bg-layer-1: #f3efe4;
  --dsw-alias-bg-layer-2: #eae3d3;
  --dsw-alias-bg-layer-3: #e0d7c3;
  --dsw-alias-bg-overlay: #fcfaf4;
  --dsw-alias-bg-module-platform: #efe9da;
  --dsw-alias-settings-card-fill: #fdfbf6;
  --dsw-alias-settings-card-stroke: #d4c8ae;
  --dsw-specific-menu: rgba(252, 250, 244, 0.97);
  --dsw-alias-border-l1: #e6dec8;
  --dsw-alias-border-l2: #d4c8ae;
  --dsw-alias-border-l3: #c0b193;
  --dsw-alias-border-l4: #ad9c7c;
  --dsw-alias-label-primary: #2b2620;
  --dsw-alias-label-secondary: #655b4e;
  --dsw-alias-label-tertiary: #857968;
  --dsw-alias-label-dimmed: #9c907f;
  --dsw-alias-brand-primary: #9e5829;
  --dsw-alias-brand-text: #2b2620;
  --dsw-alias-state-business-primary: #a65e2e;
  --dsw-alias-state-business-tertiary: rgba(166, 94, 46, 0.13);
  --dsw-alias-link: #934e20;
  --dsw-alias-button-primary-fill: #9e5829;
  --dsw-alias-button-primary-hover: #86481e;
  --dsw-alias-button-primary-ink: #fffdf9;
  --dsw-alias-interactive-bg-hover: rgba(108, 84, 50, 0.075);
  --dsw-alias-interactive-bg-active: rgba(166, 94, 46, 0.14);
  --dsw-alias-interactive-bg-hover-accent: rgba(166, 94, 46, 0.12);
  --dsw-alias-interactive-bg-hover-danger: rgba(185, 56, 44, 0.11);
  --dsw-alias-state-error-primary: #b9382c;
  --dsw-alias-state-warn-primary: #b45309;
  --dsw-alias-state-warn-label: #8c3d08;
  --dsw-alias-state-warn-tertiary: #fdefd6;
  --dsw-alias-state-success-primary: #2a6f4e;
  --dsw-radius-xs: 6px;
  --dsw-radius-sm: 9px;
  --dsw-radius-md: 13px;
  --dsw-radius-lg: 16px;
  --dsw-radius-xl: 20px;
  --dsw-elevation-panel: 0 1px 2px rgba(68, 52, 32, 0.06), 3px 3px 0 #ebe3d1, 0 0 0 1px rgba(180, 164, 138, 0.42);
  --dsw-elevation-prominent: 0 14px 34px rgba(68, 52, 32, 0.14), 3px 3px 0 #ebe3d1, 0 0 0 1px rgba(180, 164, 138, 0.48);
  --dsh-control-border-width: 1px;
  --dsh-button-hover-shadow: 0 2px 6px rgba(84, 62, 34, 0.09);
  --dsh-card-shadow: 0 1px 2px rgba(68, 52, 32, 0.06), 3px 3px 0 #ebe3d1;
  --dsh-card-hover-shadow: 0 4px 10px rgba(68, 52, 32, 0.10), 4px 4px 0 #e2d7be;
  --dsh-surface-spotlight: rgba(166, 94, 46, 0.08);
  --dsh-font-display: "Trebuchet MS", "STKaiti", "华文楷体", "Noto Serif SC SemiBold", serif;
  --dsh-font-body: "Source Sans 3", "Noto Sans SC", "Microsoft YaHei UI", sans-serif;
  --dsh-font-mono: "Cascadia Mono", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: normal;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

[data-dsh-style="cream"] :where([data-dsh-card], .dsh-card) {
  border-color: var(--dsw-alias-border-l2);
  box-shadow: var(--dsh-card-shadow);
}

[data-dsh-style="cream"] :where([data-dsh-row], .dsh-row) {
  border-block-end: 1px dashed var(--dsw-alias-border-l2);
}

[data-dsh-style="cream"] [role="tab"][aria-selected="true"] {
  background: rgba(158, 88, 41, 0.10);
  color: #7d4119;
  box-shadow: inset 0 2px 0 rgba(158, 88, 41, 0.22);
}

[data-dsh-style="cream"] [role="tab"][aria-selected="true"]::after {
  border-block-end-color: #9e5829;
  border-block-end-width: 2.5px;
}

/* --------------------------------------------------------------------------
 * 4. Preset 3: \`claude\` — Claude 暖书卷 / Claude Warmth (Deepened Materiality)
 *    - Editorial serif on headings, reader/detail titles & card titles (\`[data-dsh-serif]\`)
 *    - Subtle warm paper texture
 *    - Soft borderless surface cards
 * -------------------------------------------------------------------------- */
[data-dsh-style="claude"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="claude"], :has([data-dsh-style="claude"])) {
  color-scheme: light;
  accent-color: #c96442;
  --dsw-alias-bg-base: #f5f4ed;
  --dsw-alias-bg-layer-1: #ece9df;
  --dsw-alias-bg-layer-2: #e3dfd2;
  --dsw-alias-bg-layer-3: #d8d3c3;
  --dsw-alias-bg-overlay: #faf9f4;
  --dsw-alias-bg-module-platform: #e7e3d6;
  --dsw-alias-settings-card-fill: #faf9f4;
  --dsw-alias-settings-card-stroke: transparent;
  --dsw-specific-menu: rgba(250, 249, 244, 0.97);
  --dsw-alias-border-l1: #e4e0d3;
  --dsw-alias-border-l2: #d5d0c3;
  --dsw-alias-border-l3: #c1bbb0;
  --dsw-alias-border-l4: #aba495;
  --dsw-alias-label-primary: #1f1e1b;
  --dsw-alias-label-secondary: #5d5a51;
  --dsw-alias-label-tertiary: #7b776c;
  --dsw-alias-label-dimmed: #948f83;
  --dsw-alias-brand-primary: #c96442;
  --dsw-alias-brand-text: #1f1e1b;
  --dsw-alias-state-business-primary: #c96442;
  --dsw-alias-state-business-tertiary: rgba(201, 100, 66, 0.14);
  --dsw-alias-link: #b35030;
  --dsw-alias-button-primary-fill: #c96442;
  --dsw-alias-button-primary-hover: #b25232;
  --dsw-alias-button-primary-ink: #faf9f5;
  --dsw-alias-interactive-bg-hover: rgba(31, 30, 27, 0.055);
  --dsw-alias-interactive-bg-active: rgba(201, 100, 66, 0.14);
  --dsw-alias-interactive-bg-hover-accent: rgba(201, 100, 66, 0.11);
  --dsw-alias-interactive-bg-hover-danger: rgba(180, 48, 42, 0.11);
  --dsw-alias-state-error-primary: #b4302a;
  --dsw-alias-state-warn-primary: #b85d19;
  --dsw-alias-state-warn-label: #8c430c;
  --dsw-alias-state-warn-tertiary: #f7e8d6;
  --dsw-alias-state-success-primary: #2d6a4f;
  --dsw-radius-xs: 7px;
  --dsw-radius-sm: 10px;
  --dsw-radius-md: 14px;
  --dsw-radius-lg: 18px;
  --dsw-radius-xl: 22px;
  --dsw-elevation-panel: 0 2px 12px rgba(31, 30, 27, 0.05), 0 0 0 1px rgba(145, 139, 126, 0.18);
  --dsw-elevation-prominent: 0 16px 38px rgba(31, 30, 27, 0.13), 0 2px 8px rgba(31, 30, 27, 0.05), 0 0 0 1px rgba(145, 139, 126, 0.24);
  --dsh-control-border-width: 1px;
  --dsh-button-hover-shadow: 0 2px 7px rgba(31, 30, 27, 0.08);
  --dsh-card-shadow: 0 1px 3px rgba(31, 30, 27, 0.05), 0 0 0 1px rgba(145, 139, 126, 0.13);
  --dsh-card-hover-shadow: 0 8px 22px rgba(31, 30, 27, 0.08), 0 0 0 1px rgba(145, 139, 126, 0.20);
  --dsh-surface-spotlight: rgba(201, 100, 66, 0.08);
  --dsh-font-display: "Palatino Linotype", Georgia, "Noto Serif SC SemiBold", "Noto Serif SC", "STZhongsong", "华文中宋", serif;
  --dsh-font-body: Georgia, "Noto Serif SC", "STSong", "华文宋体", serif;
  --dsh-font-mono: "Cascadia Code", "Cascadia Mono", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: -0.01em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

/* Subtle warm paper grain texture */
[data-dsh-style="claude"] {
  background-color: var(--dsw-alias-bg-base);
  background-image:
    radial-gradient(rgba(31, 30, 27, 0.024) 0.75px, transparent 0),
    linear-gradient(180deg, rgba(255, 253, 247, 0.45), rgba(236, 233, 223, 0.25));
  background-size: 16px 16px, 100% 100%;
}

/* Soft borderless surface cards */
[data-dsh-style="claude"] :where([data-dsh-card], .dsh-card) {
  background: var(--dsw-alias-settings-card-fill);
  border-color: transparent;
  box-shadow: var(--dsh-card-shadow);
}

/* Editorial display font applied to workbench headings, reader/detail titles & card titles (overrideable via [data-dsh-font]) */
[data-dsh-style="claude"] :where(
  header h1,
  [data-dsh-editorial-heading],
  [data-dsh-serif],
  [data-dsh-card] :is(h2, h3, .dsh-card-title),
  .dsh-card :is(h2, h3, .dsh-card-title),
  [data-dsh-reader] :is(h1, h2),
  .dsh-reader :is(h1, h2)
),
:where([role="dialog"], dialog):where([data-dsh-style="claude"], :has([data-dsh-style="claude"])) header h2 {
  font-family: var(--dsh-font-display);
  font-weight: var(--dsh-display-weight, 700);
  letter-spacing: var(--dsh-display-tracking, -0.01em);
}

/* --------------------------------------------------------------------------
 * 5. Preset 4: \`pixel8bit\` — 8-Bit 掌机 / Bright 8-Bit (Deepened Materiality)
 *    - 1px dot-matrix header pattern (\`6px 6px\`)
 *    - 2px solid #1e2826 borders + 2px 2px 0 pixel shadows
 *    - Animated \`▶\` active row cursor + stepped pixel progress helper
 * -------------------------------------------------------------------------- */
[data-dsh-style="pixel8bit"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) {
  color-scheme: light;
  accent-color: #2e7d5b;
  --dsw-alias-bg-base: #f4f6e8;
  --dsw-alias-bg-layer-1: #e7eed2;
  --dsw-alias-bg-layer-2: #dbe5c0;
  --dsw-alias-bg-layer-3: #cedaad;
  --dsw-alias-bg-overlay: #f9fbf0;
  --dsw-alias-bg-module-platform: #e2ebc9;
  --dsw-alias-settings-card-fill: #edf2dc;
  --dsw-alias-settings-card-stroke: #1e2826;
  --dsw-specific-menu: #f9fbf0;
  --dsw-alias-border-l1: #7e9478;
  --dsw-alias-border-l2: #1e2826;
  --dsw-alias-border-l3: #1e2826;
  --dsw-alias-border-l4: #1e2826;
  --dsw-alias-label-primary: #1e2826;
  --dsw-alias-label-secondary: #3d514c;
  --dsw-alias-label-tertiary: #58706a;
  --dsw-alias-label-dimmed: #6e857f;
  --dsw-alias-brand-primary: #2e7d5b;
  --dsw-alias-brand-text: #1e2826;
  --dsw-alias-state-business-primary: #2e7d5b;
  --dsw-alias-state-business-tertiary: rgba(46, 125, 91, 0.18);
  --dsw-alias-link: #226448;
  --dsw-alias-button-primary-fill: #2e7d5b;
  --dsw-alias-button-primary-hover: #24674a;
  --dsw-alias-button-primary-ink: #f4f6e8;
  --dsw-alias-interactive-bg-hover: #dfe9c4;
  --dsw-alias-interactive-bg-active: #cfe0ad;
  --dsw-alias-interactive-bg-hover-accent: rgba(46, 125, 91, 0.16);
  --dsw-alias-interactive-bg-hover-danger: rgba(217, 91, 67, 0.18);
  --dsw-alias-state-error-primary: #d95b43;
  --dsw-alias-state-warn-primary: #c47614;
  --dsw-alias-state-warn-label: #7a4808;
  --dsw-alias-state-warn-tertiary: #f6e7b4;
  --dsw-alias-state-success-primary: #2e7d5b;
  --dsh-pixel-accent-secondary: #d95b43;
  --dsw-radius-xs: 0px;
  --dsw-radius-sm: 0px;
  --dsw-radius-md: 0px;
  --dsw-radius-lg: 0px;
  --dsw-radius-xl: 0px;
  --dsw-corner-shape: square;
  --dsw-elevation-panel: 2px 2px 0px #1e2826;
  --dsw-elevation-prominent: 4px 4px 0px #1e2826;
  --dsh-control-border-width: 2px;
  --dsh-button-shadow: 2px 2px 0px #1e2826;
  --dsh-button-hover-shadow: 3px 3px 0px #1e2826;
  --dsh-card-shadow: 2px 2px 0px #1e2826;
  --dsh-card-hover-shadow: 4px 4px 0px #1e2826;
  --dsh-surface-spotlight: rgba(46, 125, 91, 0.12);
  --dsh-font-display: "Cascadia Code SemiBold", "Cascadia Code", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-body: "Cascadia Code", "Cascadia Mono", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-mono: "Cascadia Mono", "Cascadia Code", "YouYuan", "幼圆", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.03em;
  --dsh-body-tracking: 0.03em;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

/* Subtle 1px dot-matrix header pattern (\`6px 6px\`) */
[data-dsh-style="pixel8bit"] :where(.dsh-header, [data-dsh-header], .dsh-wb-header) {
  background-color: var(--dsw-alias-bg-layer-1);
  background-image: radial-gradient(rgba(30, 40, 38, 0.14) 1px, transparent 0);
  background-size: 6px 6px;
  border-block-end: 2px solid #1e2826;
}

/* Crisp 0px corners, 2px solid borders, and arcade shadows in \`pixel8bit\` */
[data-dsh-style="pixel8bit"] :where(button, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemradio"], [data-dsh-card], .dsh-card, [data-dsh-panel], .dsh-panel),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) :where(button, input, select, textarea, [role="menuitem"], [role="menuitemradio"]) {
  border-radius: 0px !important;
  corner-shape: square;
}

[data-dsh-style="pixel8bit"] :where(button:not([role="tab"]), .dsh-btn),
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) :where(button:not([role="tab"]), .dsh-btn) {
  border: 2px solid #1e2826;
  box-shadow: 2px 2px 0px #1e2826;
}

[data-dsh-style="pixel8bit"] :where([data-dsh-card], .dsh-card, [data-dsh-panel], .dsh-panel) {
  border: 2px solid #1e2826;
  box-shadow: 2px 2px 0px #1e2826;
}

[data-dsh-style="pixel8bit"] :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea),
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea) {
  border-width: 2px;
  border-color: #1e2826;
}

:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) {
  border: 2px solid #1e2826 !important;
  box-shadow: 4px 4px 0px #1e2826 !important;
  backdrop-filter: none;
}

[data-dsh-style="pixel8bit"] [role="tab"][aria-selected="true"]::after,
[data-dsh-style="pixel8bit"] .dsh-tab-indicator {
  border-block-end-color: #d95b43;
  border-block-end-width: 3px;
}

/* Animated \`▶\` active row cursor (\`[data-dsh-row][data-active="true"]\` or \`.dsh-pixel-cursor\`) */
.dsh-pixel-cursor {
  display: none;
  flex: none;
  font-size: 10px;
  line-height: 1;
  color: var(--dsh-pixel-accent-secondary, #d95b43);
}

@keyframes dsh-pixel-cursor-nudge {
  0%, 100% { translate: 0px 0px; }
  50% { translate: 2px 0px; }
}

[data-dsh-style="pixel8bit"] :where([data-dsh-row], .dsh-row):where([data-active="true"], [data-selected="true"], [aria-selected="true"]) {
  background-color: var(--dsw-alias-interactive-bg-active);
  box-shadow: inset 3px 0 0 #d95b43;
}

[data-dsh-style="pixel8bit"] :where([data-dsh-row], .dsh-row):where([data-active="true"], [data-selected="true"], [aria-selected="true"]):not(:has(.dsh-pixel-cursor))::before {
  content: "▶";
  display: inline-block;
  flex: none;
  margin-inline-end: 6px;
  font-size: 10px;
  line-height: 1;
  color: #d95b43;
}

[data-dsh-style="pixel8bit"] :where([data-active="true"], [data-selected="true"], [aria-selected="true"]) .dsh-pixel-cursor {
  display: inline-flex;
  align-items: center;
}

@media (prefers-reduced-motion: no-preference) {
  [data-dsh-style="pixel8bit"] :where([data-dsh-row], .dsh-row):where([data-active="true"], [data-selected="true"], [aria-selected="true"]):not(:has(.dsh-pixel-cursor))::before,
  [data-dsh-style="pixel8bit"] :where([data-active="true"], [data-selected="true"], [aria-selected="true"]) .dsh-pixel-cursor {
    animation: dsh-pixel-cursor-nudge 760ms steps(2, end) infinite;
  }
}

/* --------------------------------------------------------------------------
 * 6. Preset 5: \`mint\` — 晴空薄荷 / Airy Mint
 * -------------------------------------------------------------------------- */
[data-dsh-style="mint"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="mint"], :has([data-dsh-style="mint"])) {
  color-scheme: light;
  accent-color: #0f766e;
  --dsw-alias-bg-base: #f5fafb;
  --dsw-alias-bg-layer-1: #eaf3f6;
  --dsw-alias-bg-layer-2: #dcebf0;
  --dsw-alias-bg-layer-3: #cce1e8;
  --dsw-alias-bg-overlay: #fafdff;
  --dsw-alias-bg-module-platform: #e3eff3;
  --dsw-alias-settings-card-fill: #eef6f8;
  --dsw-alias-settings-card-stroke: #c7dde5;
  --dsw-specific-menu: rgba(250, 253, 255, 0.97);
  --dsw-alias-border-l1: #d5e6ec;
  --dsw-alias-border-l2: #bdd5de;
  --dsw-alias-border-l3: #9ec0cd;
  --dsw-alias-border-l4: #7faab9;
  --dsw-alias-label-primary: #132a2e;
  --dsw-alias-label-secondary: #426067;
  --dsw-alias-label-tertiary: #628088;
  --dsw-alias-label-dimmed: #7c98a0;
  --dsw-alias-brand-primary: #0f766e;
  --dsw-alias-brand-text: #132a2e;
  --dsw-alias-state-business-primary: #0f766e;
  --dsw-alias-state-business-tertiary: rgba(15, 118, 110, 0.13);
  --dsw-alias-link: #0284c7;
  --dsw-alias-button-primary-fill: #0f766e;
  --dsw-alias-button-primary-hover: #0d635c;
  --dsw-alias-button-primary-ink: #f5fafb;
  --dsw-alias-interactive-bg-hover: rgba(15, 118, 110, 0.07);
  --dsw-alias-interactive-bg-active: rgba(15, 118, 110, 0.13);
  --dsw-alias-interactive-bg-hover-accent: rgba(2, 132, 199, 0.11);
  --dsw-alias-interactive-bg-hover-danger: rgba(200, 50, 64, 0.11);
  --dsw-alias-state-error-primary: #c83240;
  --dsw-alias-state-warn-primary: #b4690e;
  --dsw-alias-state-warn-label: #864c07;
  --dsw-alias-state-warn-tertiary: #fdf1d6;
  --dsw-alias-state-success-primary: #0f766e;
  --dsh-mint-sky-accent: #0284c7;
  --dsw-radius-xs: 6px;
  --dsw-radius-sm: 9px;
  --dsw-radius-md: 12px;
  --dsw-radius-lg: 16px;
  --dsw-radius-xl: 20px;
  --dsw-elevation-panel: 0 3px 12px rgba(15, 76, 92, 0.07), 0 0 0 1px rgba(127, 170, 185, 0.28);
  --dsw-elevation-prominent: 0 14px 34px rgba(15, 76, 92, 0.13), 0 2px 6px rgba(15, 76, 92, 0.05), 0 0 0 1px rgba(127, 170, 185, 0.34);
  --dsh-control-border-width: 1px;
  --dsh-button-hover-shadow: 0 2px 7px rgba(15, 118, 110, 0.11);
  --dsh-card-hover-shadow: 0 8px 22px rgba(2, 132, 199, 0.10);
  --dsh-surface-spotlight: rgba(2, 132, 199, 0.08);
  --dsh-font-display: "Cascadia Code SemiBold", "Cascadia Code", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-body: "Cascadia Code", "Cascadia Mono", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-mono: "Cascadia Mono", "Cascadia Code", "YouYuan", "幼圆", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.015em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

/* --------------------------------------------------------------------------
 * 7. Preset 6: \`glass\` — 晴昼琉璃 / Daylight Glass (NEW!)
 *    - Pastel aurora daylight mesh background over \`#f3f7ff\`
 *    - Frosted translucent glass surfaces (\`rgba(255,255,255,0.70)\`, blur(14px) saturate(140%))
 *    - Crisp white specular inner border (\`inset 0 1px 0 rgba(255,255,255,0.9)\`)
 * -------------------------------------------------------------------------- */
[data-dsh-style="glass"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="glass"], :has([data-dsh-style="glass"])) {
  color-scheme: light;
  accent-color: #4f6df5;
  --dsw-alias-bg-base: #f3f7ff;
  --dsw-alias-bg-layer-1: rgba(255, 255, 255, 0.70);
  --dsw-alias-bg-layer-2: rgba(240, 245, 255, 0.78);
  --dsw-alias-bg-layer-3: rgba(226, 236, 255, 0.84);
  --dsw-alias-bg-overlay: rgba(255, 255, 255, 0.84);
  --dsw-alias-bg-module-platform: rgba(244, 248, 255, 0.76);
  --dsw-alias-settings-card-fill: rgba(255, 255, 255, 0.70);
  --dsw-alias-settings-card-stroke: rgba(255, 255, 255, 0.82);
  --dsw-specific-menu: rgba(255, 255, 255, 0.86);
  --dsw-alias-border-l1: rgba(148, 173, 219, 0.24);
  --dsw-alias-border-l2: rgba(132, 159, 212, 0.34);
  --dsw-alias-border-l3: rgba(114, 144, 204, 0.46);
  --dsw-alias-border-l4: rgba(96, 128, 196, 0.56);
  --dsw-alias-label-primary: #172033;
  --dsw-alias-label-secondary: #4b5973;
  --dsw-alias-label-tertiary: #6b7994;
  --dsw-alias-label-dimmed: #8895ae;
  --dsw-alias-brand-primary: #4f6df5;
  --dsw-alias-brand-text: #172033;
  --dsw-alias-state-business-primary: #4f6df5;
  --dsw-alias-state-business-tertiary: rgba(79, 109, 245, 0.14);
  --dsw-alias-link: #3b59e2;
  --dsw-alias-button-primary-fill: #4f6df5;
  --dsw-alias-button-primary-hover: #3f5de3;
  --dsw-alias-button-primary-ink: #ffffff;
  --dsw-alias-interactive-bg-hover: rgba(79, 109, 245, 0.08);
  --dsw-alias-interactive-bg-active: rgba(79, 109, 245, 0.14);
  --dsw-alias-interactive-bg-hover-accent: rgba(14, 165, 233, 0.12);
  --dsw-alias-interactive-bg-hover-danger: rgba(220, 56, 82, 0.12);
  --dsw-alias-state-error-primary: #d13850;
  --dsw-alias-state-warn-primary: #c06a12;
  --dsw-alias-state-warn-label: #8a4a09;
  --dsw-alias-state-warn-tertiary: rgba(251, 191, 36, 0.18);
  --dsw-alias-state-success-primary: #15805d;
  --dsw-radius-xs: 8px;
  --dsw-radius-sm: 11px;
  --dsw-radius-md: 15px;
  --dsw-radius-lg: 18px;
  --dsw-radius-xl: 22px;
  --dsw-elevation-panel: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 4px 18px rgba(59, 92, 168, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.72);
  --dsw-elevation-prominent: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 16px 40px rgba(59, 92, 168, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.80);
  --dsh-control-border-width: 1px;
  --dsh-button-hover-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92), 0 3px 10px rgba(79, 109, 245, 0.12);
  --dsh-card-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 4px 16px rgba(59, 92, 168, 0.07);
  --dsh-card-hover-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.96), 0 10px 26px rgba(59, 92, 168, 0.12);
  --dsh-surface-spotlight: rgba(79, 109, 245, 0.08);
  --dsh-font-display: "Cascadia Code SemiBold", "Cascadia Code", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-body: "Cascadia Code", "Cascadia Mono", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-mono: "Cascadia Mono", "Cascadia Code", "YouYuan", "幼圆", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.015em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

[data-dsh-style="glass"] {
  background-color: #f3f7ff;
  background-image:
    radial-gradient(64% 58% at 12% 8%, rgba(125, 211, 252, 0.30) 0%, transparent 65%),
    radial-gradient(58% 52% at 88% 14%, rgba(196, 181, 253, 0.28) 0%, transparent 65%),
    radial-gradient(60% 55% at 52% 96%, rgba(153, 246, 228, 0.24) 0%, transparent 68%);
}

[data-dsh-style="glass"] :where([data-dsh-card], .dsh-card, [data-dsh-panel], .dsh-panel, .dsh-header, [data-dsh-header]),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="glass"], :has([data-dsh-style="glass"])) {
  background: rgba(255, 255, 255, 0.70);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  backdrop-filter: blur(14px) saturate(140%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 4px 16px rgba(59, 92, 168, 0.07);
}

@supports not (backdrop-filter: blur(1px)) {
  [data-dsh-style="glass"] :where([data-dsh-card], .dsh-card, [data-dsh-panel], .dsh-panel, .dsh-header, [data-dsh-header]),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="glass"], :has([data-dsh-style="glass"])) {
    background: rgba(255, 255, 255, 0.92);
  }
}

/* --------------------------------------------------------------------------
 * 8. Preset 7: \`eink\` — 护眼墨水屏 / E-Ink Paper (NEW!)
 *    - Warm matte e-paper (\`#F2F1EC\` base, \`#EAE8E1\` layer, \`#F7F6F2\` card)
 *    - High-contrast \`#171716\` charcoal ink, crisp \`1px solid #9E9C93\` rules
 *    - \`2px–4px\` sharp corners, ultra-snappy \`60ms\` transitions, zero chromatic distraction
 * -------------------------------------------------------------------------- */
[data-dsh-style="eink"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="eink"], :has([data-dsh-style="eink"])) {
  color-scheme: light;
  accent-color: #171716;
  --dsw-alias-bg-base: #f2f1ec;
  --dsw-alias-bg-layer-1: #eae8e1;
  --dsw-alias-bg-layer-2: #e1dfd6;
  --dsw-alias-bg-layer-3: #d6d3c9;
  --dsw-alias-bg-overlay: #f7f6f2;
  --dsw-alias-bg-module-platform: #eae8e1;
  --dsw-alias-settings-card-fill: #f7f6f2;
  --dsw-alias-settings-card-stroke: #9e9c93;
  --dsw-specific-menu: #f7f6f2;
  --dsw-alias-border-l1: #c5c2b8;
  --dsw-alias-border-l2: #9e9c93;
  --dsw-alias-border-l3: #78766e;
  --dsw-alias-border-l4: #54534d;
  --dsw-alias-label-primary: #171716;
  --dsw-alias-label-secondary: #484742;
  --dsw-alias-label-tertiary: #66645d;
  --dsw-alias-label-dimmed: #807e76;
  --dsw-alias-brand-primary: #171716;
  --dsw-alias-brand-text: #171716;
  --dsw-alias-state-business-primary: #171716;
  --dsw-alias-state-business-tertiary: rgba(23, 23, 22, 0.10);
  --dsw-alias-link: #171716;
  --dsw-alias-button-primary-fill: #171716;
  --dsw-alias-button-primary-hover: #2f2f2c;
  --dsw-alias-button-primary-ink: #f7f6f2;
  --dsw-alias-interactive-bg-hover: rgba(23, 23, 22, 0.06);
  --dsw-alias-interactive-bg-active: rgba(23, 23, 22, 0.12);
  --dsw-alias-interactive-bg-hover-accent: rgba(23, 23, 22, 0.08);
  --dsw-alias-interactive-bg-hover-danger: rgba(23, 23, 22, 0.10);
  --dsw-alias-state-error-primary: #2d2c28;
  --dsw-alias-state-warn-primary: #45443e;
  --dsw-alias-state-warn-label: #171716;
  --dsw-alias-state-warn-tertiary: #e6e4db;
  --dsw-alias-state-success-primary: #242422;
  --dsw-radius-xs: 2px;
  --dsw-radius-sm: 3px;
  --dsw-radius-md: 4px;
  --dsw-radius-lg: 4px;
  --dsw-radius-xl: 4px;
  --dsw-elevation-panel: 0 0 0 1px #9e9c93;
  --dsw-elevation-prominent: 0 2px 0 #9e9c93, 0 0 0 1px #78766e;
  --dsh-control-border-width: 1px;
  --dsh-motion-fast: 60ms;
  --dsh-motion-base: 60ms;
  --dsh-motion-dialog: 60ms;
  --dsh-button-shadow: none;
  --dsh-button-hover-shadow: none;
  --dsh-card-shadow: none;
  --dsh-card-hover-shadow: none;
  --dsh-surface-spotlight: rgba(23, 23, 22, 0.06);
  --dsh-font-display: "Palatino Linotype", Georgia, "Noto Serif SC SemiBold", "Noto Serif SC", "STZhongsong", "华文中宋", serif;
  --dsh-font-body: Georgia, "Noto Serif SC", "STSong", "华文宋体", serif;
  --dsh-font-mono: "Cascadia Code", "Cascadia Mono", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: normal;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

[data-dsh-style="eink"] :where([data-dsh-card], .dsh-card, [data-dsh-panel], .dsh-panel) {
  border: 1px solid #9e9c93;
  box-shadow: none;
}

[data-dsh-style="eink"] :where([data-dsh-row], .dsh-row) {
  border-block-end: 1px solid #c5c2b8;
}

[data-dsh-style="eink"] :where(button, [role="button"], [data-dsh-card], .dsh-card, [data-dsh-row], .dsh-row) {
  translate: none !important;
  scale: none !important;
  transition-duration: 60ms;
}

/* --------------------------------------------------------------------------
 * 9. Preset 8: \`blueprint\` — 工程晒图 / Blueprint (NEW!)
 *    - Light cyanotype drafting paper (\`#eaf3fb\`) + dual millimeter grid (\`24px\` + \`6px\`)
 *    - Prussian engineering blue (\`#0d3b66\`) ink & \`1px solid #1b5e8a\` crisp rules
 *    - Industrial safety-orange (\`#e05a2b\`) primary accent + technical monospace
 *    - Tiny \`+\` crosshair registration ticks on cards
 * -------------------------------------------------------------------------- */
[data-dsh-style="blueprint"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="blueprint"], :has([data-dsh-style="blueprint"])) {
  color-scheme: light;
  accent-color: #e05a2b;
  --dsw-alias-bg-base: #eaf3fb;
  --dsw-alias-bg-layer-1: #f4f9fe;
  --dsw-alias-bg-layer-2: #dfeef9;
  --dsw-alias-bg-layer-3: #cfe3f4;
  --dsw-alias-bg-overlay: #f7fbff;
  --dsw-alias-bg-module-platform: #e3f0fa;
  --dsw-alias-settings-card-fill: rgba(244, 249, 254, 0.92);
  --dsw-alias-settings-card-stroke: #1b5e8a;
  --dsw-specific-menu: rgba(247, 251, 255, 0.98);
  --dsw-alias-border-l1: rgba(27, 94, 138, 0.28);
  --dsw-alias-border-l2: #1b5e8a;
  --dsw-alias-border-l3: #0d3b66;
  --dsw-alias-border-l4: #092b4c;
  --dsw-alias-label-primary: #0d3b66;
  --dsw-alias-label-secondary: #1d4e78;
  --dsw-alias-label-tertiary: #3b6f99;
  --dsw-alias-label-dimmed: #5b89ad;
  --dsw-alias-brand-primary: #e05a2b;
  --dsw-alias-brand-text: #0d3b66;
  --dsw-alias-state-business-primary: #e05a2b;
  --dsw-alias-state-business-tertiary: rgba(224, 90, 43, 0.14);
  --dsw-alias-link: #0d3b66;
  --dsw-alias-button-primary-fill: #e05a2b;
  --dsw-alias-button-primary-hover: #c94b20;
  --dsw-alias-button-primary-ink: #ffffff;
  --dsw-alias-interactive-bg-hover: rgba(27, 94, 138, 0.08);
  --dsw-alias-interactive-bg-active: rgba(224, 90, 43, 0.13);
  --dsw-alias-interactive-bg-hover-accent: rgba(224, 90, 43, 0.12);
  --dsw-alias-interactive-bg-hover-danger: rgba(185, 45, 38, 0.12);
  --dsw-alias-state-error-primary: #b92d26;
  --dsw-alias-state-warn-primary: #c05614;
  --dsw-alias-state-warn-label: #7c3408;
  --dsw-alias-state-warn-tertiary: #fce9d8;
  --dsw-alias-state-success-primary: #156d5b;
  --dsw-radius-xs: 2px;
  --dsw-radius-sm: 2px;
  --dsw-radius-md: 3px;
  --dsw-radius-lg: 4px;
  --dsw-radius-xl: 4px;
  --dsw-elevation-panel: 0 0 0 1px #1b5e8a;
  --dsw-elevation-prominent: 0 8px 24px rgba(13, 59, 102, 0.14), 0 0 0 1px #1b5e8a;
  --dsh-control-border-width: 1px;
  --dsh-button-shadow: none;
  --dsh-button-hover-shadow: 0 2px 0 #1b5e8a;
  --dsh-card-shadow: 0 0 0 1px #1b5e8a;
  --dsh-card-hover-shadow: 0 3px 0 #1b5e8a;
  --dsh-surface-spotlight: rgba(27, 94, 138, 0.09);
  --dsh-font-display: "Cascadia Mono SemiBold", "Cascadia Mono", "STZhongsong", "华文中宋", "FangSong", "仿宋", monospace;
  --dsh-font-body: "Cascadia Mono", "STFangsong", "华文仿宋", "FangSong", "仿宋", monospace;
  --dsh-font-mono: "Cascadia Mono", "STFangsong", "华文仿宋", "FangSong", "仿宋", monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.02em;
  --dsh-body-tracking: 0.02em;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

[data-dsh-style="blueprint"] {
  background-color: #eaf3fb;
  background-image:
    linear-gradient(to right, rgba(18, 78, 120, 0.09) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(18, 78, 120, 0.09) 1px, transparent 1px),
    linear-gradient(to right, rgba(18, 78, 120, 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(18, 78, 120, 0.045) 1px, transparent 1px);
  background-size: 24px 24px, 24px 24px, 6px 6px, 6px 6px;
}

[data-dsh-style="blueprint"] :where(.dsh-header, [data-dsh-header], .dsh-wb-header) {
  background: rgba(244, 249, 254, 0.90);
  border-block-end: 1px solid #1b5e8a;
}

[data-dsh-style="blueprint"] :where([data-dsh-card], .dsh-card) {
  position: relative;
  border: 1px solid #1b5e8a;
  background: rgba(244, 249, 254, 0.92);
}

[data-dsh-style="blueprint"] :where([data-dsh-card], .dsh-card):not([role="tab"])::after {
  content: "+";
  position: absolute;
  inset-block-start: 4px;
  inset-inline-end: 6px;
  font-family: ui-monospace, "Cascadia Mono", Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1;
  color: #e05a2b;
  opacity: 0.78;
  pointer-events: none;
}

[data-dsh-style="blueprint"] :where(button:not([role="tab"]), .dsh-btn) {
  border: 1px solid #1b5e8a;
}

/* --------------------------------------------------------------------------
 * 10. Preset 9: \`risograph\` — 波普孔版 / Riso Zine (NEW!)
 *     - Warm printmaking paper (\`#faf6ee\`), bold \`2px solid #18181b\` outlines
 *     - Vibrant offset hard shadows (\`3px 3px 0 #18181b\` buttons, \`4px 4px 0 #2563eb\`/\`#ff3e7f\` cards/dialogs)
 *     - Subtle halftone dot pattern (\`7px 7px\`) on header
 *     - Electric pink \`#ff3e7f\` & marker-yellow \`#fde047\` accents + \`translate(2px, 2px)\` shadow-collapse press
 * -------------------------------------------------------------------------- */
[data-dsh-style="risograph"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="risograph"], :has([data-dsh-style="risograph"])) {
  color-scheme: light;
  accent-color: #ff3e7f;
  --dsw-alias-bg-base: #faf6ee;
  --dsw-alias-bg-layer-1: #f5efe2;
  --dsw-alias-bg-layer-2: #ede4d1;
  --dsw-alias-bg-layer-3: #e3d7be;
  --dsw-alias-bg-overlay: #fffdf7;
  --dsw-alias-bg-module-platform: #f5efe2;
  --dsw-alias-settings-card-fill: #fffdf7;
  --dsw-alias-settings-card-stroke: #18181b;
  --dsw-specific-menu: #fffdf7;
  --dsw-alias-border-l1: #d4cbb8;
  --dsw-alias-border-l2: #18181b;
  --dsw-alias-border-l3: #18181b;
  --dsw-alias-border-l4: #18181b;
  --dsw-alias-label-primary: #18181b;
  --dsw-alias-label-secondary: #3f3f46;
  --dsw-alias-label-tertiary: #52525b;
  --dsw-alias-label-dimmed: #71717a;
  --dsw-alias-brand-primary: #ff3e7f;
  --dsw-alias-brand-text: #18181b;
  --dsw-alias-state-business-primary: #ff3e7f;
  --dsw-alias-state-business-tertiary: rgba(255, 62, 127, 0.14);
  --dsw-alias-link: #2563eb;
  --dsw-alias-button-primary-fill: #ff3e7f;
  --dsw-alias-button-primary-hover: #e62e6d;
  --dsw-alias-button-primary-ink: #ffffff;
  --dsw-alias-interactive-bg-hover: rgba(253, 224, 71, 0.38);
  --dsw-alias-interactive-bg-active: #fde047;
  --dsw-alias-interactive-bg-hover-accent: rgba(37, 99, 235, 0.14);
  --dsw-alias-interactive-bg-hover-danger: rgba(255, 62, 127, 0.18);
  --dsw-alias-state-error-primary: #dc2626;
  --dsw-alias-state-warn-primary: #ca8a04;
  --dsw-alias-state-warn-label: #713f12;
  --dsw-alias-state-warn-tertiary: #fef08a;
  --dsw-alias-state-success-primary: #15803d;
  --dsw-radius-xs: 3px;
  --dsw-radius-sm: 4px;
  --dsw-radius-md: 6px;
  --dsw-radius-lg: 8px;
  --dsw-radius-xl: 10px;
  --dsw-elevation-panel: 4px 4px 0px #2563eb;
  --dsw-elevation-prominent: 4px 4px 0px #ff3e7f;
  --dsh-control-border-width: 2px;
  --dsh-button-shadow: 3px 3px 0px #18181b;
  --dsh-button-hover-shadow: 4px 4px 0px #2563eb;
  --dsh-card-shadow: 4px 4px 0px #2563eb;
  --dsh-card-hover-shadow: 5px 5px 0px #ff3e7f;
  --dsh-surface-spotlight: rgba(253, 224, 71, 0.35);
  --dsh-font-display: Impact, "Arial Black", "Noto Sans SC Black", "SimHei", "黑体", sans-serif;
  --dsh-font-body: "Source Sans 3", "Noto Sans SC Medium", "Noto Sans SC", sans-serif;
  --dsh-font-mono: "Cascadia Code", "Cascadia Mono", Consolas, monospace;
  --dsh-display-weight: 900;
  --dsh-display-tracking: -0.02em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

[data-dsh-style="risograph"] :where(.dsh-header, [data-dsh-header], .dsh-wb-header) {
  background-color: #fffdf7;
  background-image: radial-gradient(rgba(255, 62, 127, 0.15) 1px, transparent 0);
  background-size: 7px 7px;
  border-block-end: 2px solid #18181b;
}

[data-dsh-style="risograph"] :where(button:not([role="tab"]), .dsh-btn),
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="risograph"], :has([data-dsh-style="risograph"])) :where(button:not([role="tab"]), .dsh-btn) {
  border: 2px solid #18181b;
  box-shadow: 3px 3px 0px #18181b;
}

[data-dsh-style="risograph"] :where([data-dsh-card], .dsh-card, [data-dsh-panel], .dsh-panel) {
  border: 2px solid #18181b;
  box-shadow: 4px 4px 0px #2563eb;
}

:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="risograph"], :has([data-dsh-style="risograph"])) {
  border: 2px solid #18181b !important;
  box-shadow: 4px 4px 0px #ff3e7f !important;
}

[data-dsh-style="risograph"] [role="tab"][aria-selected="true"] {
  background: #fde047;
  color: #18181b;
  font-weight: 700;
}

[data-dsh-style="risograph"] [role="tab"][aria-selected="true"]::after,
[data-dsh-style="risograph"] .dsh-tab-indicator {
  border-block-end-color: #ff3e7f;
  border-block-end-width: 3px;
}

/* --------------------------------------------------------------------------
 * 11. Preset 10: \`win98\` — 千禧复古 / Retro 98 (NEW!)
 *     - Classic bright Platinum/Win98 silver-gray (\`#dcdcdc\` / \`#e4e4e4\`, \`#ffffff\` wells)
 *     - Authentic 3D beveled raised borders flipping to sunken bevels on \`:active\` / \`[aria-selected="true"]\`
 *     - \`0px\` sharp corners + royal-blue (\`#1b4f9c\` -> \`#3b82c4\`) header accent
 * -------------------------------------------------------------------------- */
[data-dsh-style="win98"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="win98"], :has([data-dsh-style="win98"])) {
  color-scheme: light;
  accent-color: #1b4f9c;
  --dsw-alias-bg-base: #dcdcdc;
  --dsw-alias-bg-layer-1: #e4e4e4;
  --dsw-alias-bg-layer-2: #d0d0d0;
  --dsw-alias-bg-layer-3: #c0c0c0;
  --dsw-alias-bg-overlay: #e4e4e4;
  --dsw-alias-bg-module-platform: #d4d4d4;
  --dsw-alias-settings-card-fill: #ffffff;
  --dsw-alias-settings-card-stroke: #808080;
  --dsw-specific-menu: #dcdcdc;
  --dsw-alias-border-l1: #b8b8b8;
  --dsw-alias-border-l2: #808080;
  --dsw-alias-border-l3: #5a5a5a;
  --dsw-alias-border-l4: #222222;
  --dsw-alias-label-primary: #111111;
  --dsw-alias-label-secondary: #333333;
  --dsw-alias-label-tertiary: #555555;
  --dsw-alias-label-dimmed: #767676;
  --dsw-alias-brand-primary: #1b4f9c;
  --dsw-alias-brand-text: #111111;
  --dsw-alias-state-business-primary: #1b4f9c;
  --dsw-alias-state-business-tertiary: rgba(27, 79, 156, 0.14);
  --dsw-alias-link: #0b3c88;
  --dsw-alias-button-primary-fill: #1b4f9c;
  --dsw-alias-button-primary-hover: #245cb0;
  --dsw-alias-button-primary-ink: #ffffff;
  --dsw-alias-interactive-bg-hover: rgba(27, 79, 156, 0.09);
  --dsw-alias-interactive-bg-active: rgba(27, 79, 156, 0.16);
  --dsw-alias-interactive-bg-hover-accent: rgba(59, 130, 196, 0.15);
  --dsw-alias-interactive-bg-hover-danger: rgba(185, 28, 28, 0.13);
  --dsw-alias-state-error-primary: #b91c1c;
  --dsw-alias-state-warn-primary: #9a5b08;
  --dsw-alias-state-warn-label: #6e3f04;
  --dsw-alias-state-warn-tertiary: #fef3c7;
  --dsw-alias-state-success-primary: #166534;
  --dsw-radius-xs: 0px;
  --dsw-radius-sm: 0px;
  --dsw-radius-md: 0px;
  --dsw-radius-lg: 0px;
  --dsw-radius-xl: 0px;
  --dsw-corner-shape: square;
  --dsw-elevation-panel: inset 1.5px 1.5px 0 #ffffff, inset -1.5px -1.5px 0 #5a5a5a, inset 2.5px 2.5px 0 #f4f4f4, inset -2.5px -2.5px 0 #9a9a9a;
  --dsw-elevation-prominent: inset 1.5px 1.5px 0 #ffffff, inset -1.5px -1.5px 0 #5a5a5a, inset 2.5px 2.5px 0 #f4f4f4, inset -2.5px -2.5px 0 #9a9a9a, 4px 4px 12px rgba(0, 0, 0, 0.18);
  --dsh-control-border-width: 1px;
  --dsh-button-shadow: inset 1.5px 1.5px 0 #ffffff, inset -1.5px -1.5px 0 #5a5a5a, inset 2.5px 2.5px 0 #f4f4f4, inset -2.5px -2.5px 0 #9a9a9a;
  --dsh-button-hover-shadow: inset 1.5px 1.5px 0 #ffffff, inset -1.5px -1.5px 0 #5a5a5a, inset 2.5px 2.5px 0 #f4f4f4, inset -2.5px -2.5px 0 #9a9a9a;
  --dsh-card-shadow: inset 1.5px 1.5px 0 #808080, inset -1.5px -1.5px 0 #ffffff, inset 2.5px 2.5px 0 #5a5a5a, inset -2.5px -2.5px 0 #dcdcdc;
  --dsh-card-hover-shadow: inset 1.5px 1.5px 0 #808080, inset -1.5px -1.5px 0 #ffffff, inset 2.5px 2.5px 0 #5a5a5a, inset -2.5px -2.5px 0 #dcdcdc;
  --dsh-surface-spotlight: rgba(27, 79, 156, 0.10);
  --dsh-font-display: Tahoma, "SimSun", "NSimSun", "宋体", "新宋体", sans-serif;
  --dsh-font-body: Tahoma, "SimSun", "NSimSun", "宋体", "新宋体", sans-serif;
  --dsh-font-mono: "Fixedsys", Consolas, "Courier New", "SimSun", "宋体", monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: normal;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

[data-dsh-style="win98"] :where(button, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemradio"], [data-dsh-card], .dsh-card, [data-dsh-panel], .dsh-panel),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="win98"], :has([data-dsh-style="win98"])),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="win98"], :has([data-dsh-style="win98"])) :where(button, input, select, textarea, [role="menuitem"], [role="menuitemradio"]) {
  border-radius: 0px !important;
  corner-shape: square;
}

/* Raised 3D bevel buttons */
[data-dsh-style="win98"] :where(button:not([role="tab"]), .dsh-btn),
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="win98"], :has([data-dsh-style="win98"])) :where(button:not([role="tab"]), .dsh-btn) {
  border: 0;
  background-color: #dcdcdc;
  box-shadow: inset 1.5px 1.5px 0 #ffffff, inset -1.5px -1.5px 0 #5a5a5a, inset 2.5px 2.5px 0 #f4f4f4, inset -2.5px -2.5px 0 #9a9a9a;
}

/* Keep primary buttons royal blue with 3D bevel */
[data-dsh-style="win98"] :where(.dsh-wb-btn-primary, .dsh-btn-primary) {
  background-color: #1b4f9c;
  color: #ffffff;
  box-shadow: inset 1.5px 1.5px 0 #6ca0e8, inset -1.5px -1.5px 0 #0d2b57, inset 2.5px 2.5px 0 #4a82d1, inset -2.5px -2.5px 0 #143c78;
}

/* Sunken 3D bevel on active / pressed / selected controls */
[data-dsh-style="win98"] :where(button, [role="button"]):is(:active, [aria-pressed="true"], [aria-expanded="true"]):not(:disabled):not([aria-disabled="true"]),
[data-dsh-style="win98"] [role="tab"][aria-selected="true"],
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="win98"], :has([data-dsh-style="win98"])) :where(button, [role="button"]):is(:active, [aria-pressed="true"]):not(:disabled):not([aria-disabled="true"]) {
  translate: 0px 0px !important;
  scale: 1 !important;
  background-color: #e4e4e4;
  box-shadow: inset 1.5px 1.5px 0 #5a5a5a, inset -1.5px -1.5px 0 #ffffff, inset 2.5px 2.5px 0 #9a9a9a, inset -2.5px -2.5px 0 #f4f4f4 !important;
}

/* Sunken white list/card/input wells */
[data-dsh-style="win98"] :where([data-dsh-card], .dsh-card, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea) {
  border: 0;
  background: #ffffff;
  box-shadow: inset 1.5px 1.5px 0 #808080, inset -1.5px -1.5px 0 #ffffff, inset 2.5px 2.5px 0 #5a5a5a, inset -2.5px -2.5px 0 #dcdcdc;
}

/* Bright Win98 Platinum raised toolbar header with iconic royal-blue titlebar stripe */
[data-dsh-style="win98"] :where(.dsh-header, [data-dsh-header], .pageHeader, .dsh-wb-header, .topbar) {
  background: linear-gradient(180deg, #ececec 0%, #dcdcdc 100%) !important;
  color: #111111;
  border-block-start: 3px solid #1b4f9c !important;
  border-block-end: 2px solid #808080;
  box-shadow: inset 0 1px 0 #ffffff, inset 0 -1px 0 #808080;
}

[data-dsh-style="win98"] .dsh-header-badge {
  background: linear-gradient(90deg, #1b4f9c 0%, #3b82c4 100%);
  color: #ffffff;
}

:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="win98"], :has([data-dsh-style="win98"])) header {
  background: linear-gradient(90deg, #1b4f9c 0%, #3b82c4 100%);
  color: #ffffff;
}

:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="win98"], :has([data-dsh-style="win98"])) header h2 {
  color: #ffffff;
}

/* --------------------------------------------------------------------------
 * 12. Preset 11: \`songhui\` — 宋韵朱砂 / Song Xuan (NEW!)
 *     - Warm gold-flecked Xuan paper (\`#f7f3e8\`, subtle \`18px\` gold-dust radial dots)
 *     - Double cinnabar masthead border (\`3px double #b83b2a\`)
 *     - Cinnabar seal-stamp primary buttons (\`#b83b2a\` with \`#fbf9f2\` ink, \`2px\` crisp corners)
 *     - Classical Songti / serif typography
 * -------------------------------------------------------------------------- */
[data-dsh-style="songhui"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="songhui"], :has([data-dsh-style="songhui"])) {
  color-scheme: light;
  accent-color: #b83b2a;
  --dsw-alias-bg-base: #f7f3e8;
  --dsw-alias-bg-layer-1: #f0ead9;
  --dsw-alias-bg-layer-2: #e7dec8;
  --dsw-alias-bg-layer-3: #dcd0b4;
  --dsw-alias-bg-overlay: #fbf9f2;
  --dsw-alias-bg-module-platform: #ede6d4;
  --dsw-alias-settings-card-fill: #fbf9f2;
  --dsw-alias-settings-card-stroke: #d4c4a2;
  --dsw-specific-menu: #fbf9f2;
  --dsw-alias-border-l1: #e4dac2;
  --dsw-alias-border-l2: #cfbda0;
  --dsw-alias-border-l3: #b8a382;
  --dsw-alias-border-l4: #9d8765;
  --dsw-alias-label-primary: #252019;
  --dsw-alias-label-secondary: #5c5142;
  --dsw-alias-label-tertiary: #7d705e;
  --dsw-alias-label-dimmed: #998c79;
  --dsw-alias-brand-primary: #b83b2a;
  --dsw-alias-brand-text: #252019;
  --dsw-alias-state-business-primary: #b83b2a;
  --dsw-alias-state-business-tertiary: rgba(184, 59, 42, 0.12);
  --dsw-alias-link: #9e2f20;
  --dsw-alias-button-primary-fill: #b83b2a;
  --dsw-alias-button-primary-hover: #9f3021;
  --dsw-alias-button-primary-ink: #fbf9f2;
  --dsw-alias-interactive-bg-hover: rgba(184, 59, 42, 0.065);
  --dsw-alias-interactive-bg-active: rgba(184, 59, 42, 0.13);
  --dsw-alias-interactive-bg-hover-accent: rgba(184, 59, 42, 0.11);
  --dsw-alias-interactive-bg-hover-danger: rgba(184, 59, 42, 0.15);
  --dsw-alias-state-error-primary: #a62b1c;
  --dsw-alias-state-warn-primary: #9c6216;
  --dsw-alias-state-warn-label: #704309;
  --dsw-alias-state-warn-tertiary: #f7ecd1;
  --dsw-alias-state-success-primary: #2e664b;
  --dsw-radius-xs: 2px;
  --dsw-radius-sm: 2px;
  --dsw-radius-md: 3px;
  --dsw-radius-lg: 4px;
  --dsw-radius-xl: 4px;
  --dsw-elevation-panel: 0 2px 10px rgba(66, 52, 32, 0.06), 0 0 0 1px #cfbda0;
  --dsw-elevation-prominent: 0 12px 30px rgba(66, 52, 32, 0.14), 0 0 0 1px #b8a382;
  --dsh-control-border-width: 1px;
  --dsh-button-hover-shadow: 0 2px 6px rgba(184, 59, 42, 0.12);
  --dsh-card-shadow: 0 1px 2px rgba(66, 52, 32, 0.05);
  --dsh-card-hover-shadow: 0 6px 16px rgba(66, 52, 32, 0.09);
  --dsh-surface-spotlight: rgba(184, 59, 42, 0.07);
  --dsh-font-display: "STZhongsong", "华文中宋", "Noto Serif SC Black", "SimSun", "宋体", serif;
  --dsh-font-body: "Palatino Linotype", "STKaiti", "华文楷体", "KaiTi", "楷体", "Noto Serif SC", serif;
  --dsh-font-mono: "Cascadia Mono", Consolas, "STFangsong", "华文仿宋", monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.04em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

/* Gold-flecked Xuan paper */
[data-dsh-style="songhui"] {
  background-color: #f7f3e8;
  background-image:
    radial-gradient(rgba(196, 152, 64, 0.18) 1px, transparent 0),
    radial-gradient(rgba(196, 152, 64, 0.11) 0.75px, transparent 0);
  background-size: 18px 18px, 29px 29px;
  background-position: 0 0, 9px 7px;
}

/* Double cinnabar masthead border */
[data-dsh-style="songhui"] :where(.pageHeader, .dsh-header, [data-dsh-header], .dsh-wb-header) {
  background: rgba(251, 249, 242, 0.90);
  border-block-end: 3px double #b83b2a;
}

/* Cinnabar seal-stamp primary buttons & badge */
[data-dsh-style="songhui"] :where(.dsh-wb-btn-primary, .dsh-btn-primary, .dsh-header-badge) {
  background: #b83b2a;
  color: #fbf9f2;
  border-color: #9e2f20;
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px rgba(251, 249, 242, 0.28);
}

/* --------------------------------------------------------------------------
 * 13. Preset 12: \`frutiger\` — 晴空水晶 / Aqua Gloss (NEW!)
 *     - Bright Frutiger Aero sky-aqua gradient (\`#eaf7ff\` -> \`#f4fbff\`)
 *     - Glossy upper-half specular aqua pill buttons (\`linear-gradient\` + \`inset 0 1.5px 0\`)
 *     - Pill \`999px\` control radius + luminous translucent cards
 * -------------------------------------------------------------------------- */
[data-dsh-style="frutiger"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="frutiger"], :has([data-dsh-style="frutiger"])) {
  color-scheme: light;
  accent-color: #0284c7;
  --dsw-alias-bg-base: #eaf7ff;
  --dsw-alias-bg-layer-1: rgba(255, 255, 255, 0.78);
  --dsw-alias-bg-layer-2: rgba(232, 246, 255, 0.86);
  --dsw-alias-bg-layer-3: rgba(209, 236, 255, 0.90);
  --dsw-alias-bg-overlay: rgba(248, 253, 255, 0.93);
  --dsw-alias-bg-module-platform: rgba(232, 246, 255, 0.84);
  --dsw-alias-settings-card-fill: rgba(255, 255, 255, 0.82);
  --dsw-alias-settings-card-stroke: rgba(56, 189, 248, 0.44);
  --dsw-specific-menu: rgba(248, 253, 255, 0.95);
  --dsw-alias-border-l1: rgba(56, 189, 248, 0.26);
  --dsw-alias-border-l2: rgba(14, 165, 233, 0.36);
  --dsw-alias-border-l3: rgba(2, 132, 199, 0.48);
  --dsw-alias-border-l4: rgba(3, 105, 161, 0.58);
  --dsw-alias-label-primary: #0c2b45;
  --dsw-alias-label-secondary: #275373;
  --dsw-alias-label-tertiary: #487596;
  --dsw-alias-label-dimmed: #6c96b5;
  --dsw-alias-brand-primary: #0284c7;
  --dsw-alias-brand-text: #0c2b45;
  --dsw-alias-state-business-primary: #0284c7;
  --dsw-alias-state-business-tertiary: rgba(14, 165, 233, 0.16);
  --dsw-alias-link: #0369a1;
  --dsw-alias-button-primary-fill: #0284c7;
  --dsw-alias-button-primary-hover: #0369a1;
  --dsw-alias-button-primary-ink: #ffffff;
  --dsw-alias-interactive-bg-hover: rgba(14, 165, 233, 0.10);
  --dsw-alias-interactive-bg-active: rgba(14, 165, 233, 0.18);
  --dsw-alias-interactive-bg-hover-accent: rgba(56, 189, 248, 0.16);
  --dsw-alias-interactive-bg-hover-danger: rgba(220, 56, 82, 0.13);
  --dsw-alias-state-error-primary: #c83244;
  --dsw-alias-state-warn-primary: #c06a12;
  --dsw-alias-state-warn-label: #8a4a09;
  --dsw-alias-state-warn-tertiary: #fef0d6;
  --dsw-alias-state-success-primary: #0f766e;
  --dsw-radius-xs: 10px;
  --dsw-radius-sm: 999px;
  --dsw-radius-md: 18px;
  --dsw-radius-lg: 22px;
  --dsw-radius-xl: 26px;
  --dsw-elevation-panel: inset 0 1.5px 0 rgba(255, 255, 255, 0.92), 0 6px 20px rgba(14, 165, 233, 0.12), 0 0 0 1px rgba(56, 189, 248, 0.36);
  --dsw-elevation-prominent: inset 0 1.5px 0 rgba(255, 255, 255, 0.95), 0 16px 38px rgba(14, 165, 233, 0.18), 0 0 0 1px rgba(56, 189, 248, 0.44);
  --dsh-control-border-width: 1px;
  --dsh-button-shadow: inset 0 1.5px 0 rgba(255, 255, 255, 0.92), 0 2px 6px rgba(14, 165, 233, 0.12);
  --dsh-button-hover-shadow: inset 0 1.5px 0 rgba(255, 255, 255, 0.96), 0 4px 12px rgba(2, 132, 199, 0.22);
  --dsh-card-shadow: inset 0 1.5px 0 rgba(255, 255, 255, 0.92), 0 6px 20px rgba(14, 165, 233, 0.10);
  --dsh-card-hover-shadow: inset 0 1.5px 0 rgba(255, 255, 255, 0.98), 0 10px 26px rgba(2, 132, 199, 0.16);
  --dsh-surface-spotlight: rgba(14, 165, 233, 0.10);
  --dsh-font-display: "Cascadia Code SemiBold", "Cascadia Code", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-body: "Cascadia Code", "Cascadia Mono", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-mono: "Cascadia Mono", "Cascadia Code", "YouYuan", "幼圆", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.015em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

[data-dsh-style="frutiger"] {
  background-color: #eaf7ff;
  background-image:
    radial-gradient(60% 48% at 15% 6%, rgba(125, 211, 252, 0.34) 0%, transparent 65%),
    linear-gradient(180deg, #eaf7ff 0%, #f4fbff 55%, #e5f5fe 100%);
}

[data-dsh-style="frutiger"] :where(button:not([role="tab"]), .dsh-btn),
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="frutiger"], :has([data-dsh-style="frutiger"])) :where(button:not([role="tab"]), .dsh-btn) {
  border-radius: 999px;
  border: 1px solid rgba(14, 165, 233, 0.42);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(224, 244, 255, 0.88) 49%, rgba(204, 236, 255, 0.92) 51%, rgba(235, 249, 255, 0.96) 100%);
  box-shadow: inset 0 1.5px 0 rgba(255, 255, 255, 0.92), 0 2px 6px rgba(14, 165, 233, 0.12);
}

[data-dsh-style="frutiger"] :where(.dsh-wb-btn-primary, .dsh-btn-primary, .dsh-header-badge) {
  border-radius: 999px;
  border: 1px solid #0284c7;
  color: #ffffff;
  background: linear-gradient(180deg, #7dd3fc 0%, #0ea5e9 48%, #0284c7 52%, #38bdf8 100%);
  box-shadow: inset 0 1.5px 0 rgba(255, 255, 255, 0.88), 0 3px 10px rgba(2, 132, 199, 0.24);
}

[data-dsh-style="frutiger"] :where([data-dsh-card], .dsh-card, [data-dsh-panel], .dsh-panel, .dsh-header, [data-dsh-header]) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(240, 250, 255, 0.78) 100%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
  backdrop-filter: blur(10px) saturate(130%);
  box-shadow: var(--dsh-card-shadow);
}

/* --------------------------------------------------------------------------
 * 14. Preset 13: \`gazette\` — 铅字晨报 / Gazette
 *     - Warm newsprint base (\`#f6f3ec\`), \`#ede8dd\` layer, \`#faf8f3\` card, \`#161514\` ink
 *     - \`4px double #161514\` masthead border on \`.pageHeader\` / \`.dsh-header\`
 *     - Crisp \`1px solid #161514\` column rules, \`0px–2px\` editorial corners
 *     - \`#9b1c1c\` crimson seal/editorial accent & high-contrast ink buttons
 * -------------------------------------------------------------------------- */
[data-dsh-style="gazette"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="gazette"], :has([data-dsh-style="gazette"])) {
  color-scheme: light;
  accent-color: #9b1c1c;
  --dsw-alias-bg-base: #f6f3ec;
  --dsw-alias-bg-layer-1: #ede8dd;
  --dsw-alias-bg-layer-2: #e3dccd;
  --dsw-alias-bg-layer-3: #d6cebc;
  --dsw-alias-bg-overlay: #faf8f3;
  --dsw-alias-bg-module-platform: #ebe5d8;
  --dsw-alias-settings-card-fill: #faf8f3;
  --dsw-alias-settings-card-stroke: #161514;
  --dsw-specific-menu: #faf8f3;
  --dsw-alias-border-l1: #cec6b6;
  --dsw-alias-border-l2: #161514;
  --dsw-alias-border-l3: #161514;
  --dsw-alias-border-l4: #161514;
  --dsw-alias-label-primary: #161514;
  --dsw-alias-label-secondary: #43403c;
  --dsw-alias-label-tertiary: #635f59;
  --dsw-alias-label-dimmed: #827d75;
  --dsw-alias-brand-primary: #9b1c1c;
  --dsw-alias-brand-text: #161514;
  --dsw-alias-state-business-primary: #9b1c1c;
  --dsw-alias-state-business-tertiary: rgba(155, 28, 28, 0.12);
  --dsw-alias-link: #9b1c1c;
  --dsw-alias-button-primary-fill: #161514;
  --dsw-alias-button-primary-hover: #2d2b28;
  --dsw-alias-button-primary-ink: #faf8f3;
  --dsw-alias-interactive-bg-hover: rgba(22, 21, 20, 0.06);
  --dsw-alias-interactive-bg-active: rgba(155, 28, 28, 0.11);
  --dsw-alias-interactive-bg-hover-accent: rgba(155, 28, 28, 0.10);
  --dsw-alias-interactive-bg-hover-danger: rgba(155, 28, 28, 0.14);
  --dsw-alias-state-error-primary: #9b1c1c;
  --dsw-alias-state-warn-primary: #9a5b08;
  --dsw-alias-state-warn-label: #6e3f04;
  --dsw-alias-state-warn-tertiary: #f6ead2;
  --dsw-alias-state-success-primary: #1f5c3a;
  --dsw-radius-xs: 0px;
  --dsw-radius-sm: 1px;
  --dsw-radius-md: 2px;
  --dsw-radius-lg: 2px;
  --dsw-radius-xl: 2px;
  --dsw-elevation-panel: 0 1px 0 #161514, 0 0 0 1px #161514;
  --dsw-elevation-prominent: 3px 3px 0 #161514, 0 0 0 1px #161514;
  --dsh-control-border-width: 1px;
  --dsh-button-shadow: none;
  --dsh-button-hover-shadow: 0 2px 0 #161514;
  --dsh-card-shadow: none;
  --dsh-card-hover-shadow: 2px 2px 0 #161514;
  --dsh-surface-spotlight: rgba(155, 28, 28, 0.06);
  --dsh-font-display: Garamond, Georgia, "STZhongsong", "华文中宋", "Noto Serif SC Black", serif;
  --dsh-font-body: Georgia, "Noto Serif SC", "STSong", "华文宋体", serif;
  --dsh-font-mono: "Cascadia Mono", Consolas, "Courier New", monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: -0.01em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

[data-dsh-style="gazette"] {
  background-color: #f6f3ec;
}

/* Broadsheet 4px double masthead border */
[data-dsh-style="gazette"] :where(.pageHeader, .dsh-header, [data-dsh-header], .dsh-wb-header) {
  background: #faf8f3;
  border-block-end: 4px double #161514;
}

/* Crisp 1px solid #161514 column rules & editorial cards */
[data-dsh-style="gazette"] :where([data-dsh-card], .dsh-card, [data-dsh-panel], .dsh-panel) {
  background: #faf8f3;
  border: 1px solid #161514;
  border-radius: 2px;
  box-shadow: none;
}

[data-dsh-style="gazette"] :where([data-dsh-row], .dsh-row) {
  border-block-end: 1px solid #161514;
}

[data-dsh-style="gazette"] .dsh-split-leading {
  border-inline-end: 1px solid #161514;
}

[data-dsh-style="gazette"] .dsh-split-resizer::before {
  background: #161514;
}

/* 0px–2px editorial corners, crimson seal accent & high-contrast ink buttons */
[data-dsh-style="gazette"] :where(button:not([role="tab"]), .dsh-btn),
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="gazette"], :has([data-dsh-style="gazette"])) :where(button:not([role="tab"]), .dsh-btn) {
  border: 1px solid #161514;
  border-radius: 1px;
}

[data-dsh-style="gazette"] :where(.dsh-wb-btn-primary, .dsh-btn-primary) {
  background: #161514;
  color: #faf8f3;
  border-color: #161514;
}

[data-dsh-style="gazette"] :where(.dsh-wb-btn-primary, .dsh-btn-primary):hover:not(:disabled) {
  background: #9b1c1c;
  border-color: #9b1c1c;
}

[data-dsh-style="gazette"] .dsh-header-badge {
  background: #9b1c1c;
  color: #faf8f3;
  border-radius: 1px;
}

[data-dsh-style="gazette"] [role="tab"][aria-selected="true"]::after,
[data-dsh-style="gazette"] .dsh-tab-indicator {
  border-block-end-color: #9b1c1c;
  border-block-end-width: 2.5px;
}

:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="gazette"], :has([data-dsh-style="gazette"])) {
  border: 1px solid #161514 !important;
  border-radius: 2px !important;
}

/* --------------------------------------------------------------------------
 * 14b. Independent \`[data-dsh-font]\` Overrides & Dual-Layer Typography Rules
 *      When \`data-dsh-font="auto"\` (or unset), each \`[data-dsh-style]\` uses its
 *      own Windows-verified Chinese + Latin signature font stack.
 * -------------------------------------------------------------------------- */
:root[data-dsh-font="songkai"] [data-dsh-style],
:root[data-dsh-font="songkai"] [data-dsh-portal-synced],
:root[data-dsh-font="songkai"] :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]),
[data-dsh-style][data-dsh-font="songkai"],
[data-dsh-portal-synced][data-dsh-font="songkai"] {
  --dsh-font-display: "STZhongsong", "华文中宋", "Noto Serif SC Black", "SimSun", "宋体", serif;
  --dsh-font-body: "Palatino Linotype", "STKaiti", "华文楷体", "KaiTi", "楷体", "Noto Serif SC", serif;
  --dsh-font-mono: "Cascadia Mono", Consolas, "STFangsong", "华文仿宋", monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.04em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

:root[data-dsh-font="fangsong"] [data-dsh-style],
:root[data-dsh-font="fangsong"] [data-dsh-portal-synced],
:root[data-dsh-font="fangsong"] :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]),
[data-dsh-style][data-dsh-font="fangsong"],
[data-dsh-portal-synced][data-dsh-font="fangsong"] {
  --dsh-font-display: "Cascadia Mono SemiBold", "Cascadia Mono", "STZhongsong", "华文中宋", "FangSong", "仿宋", monospace;
  --dsh-font-body: "Cascadia Mono", "STFangsong", "华文仿宋", "FangSong", "仿宋", monospace;
  --dsh-font-mono: "Cascadia Mono", "STFangsong", "华文仿宋", "FangSong", "仿宋", monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.02em;
  --dsh-body-tracking: 0.02em;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

:root[data-dsh-font="poster"] [data-dsh-style],
:root[data-dsh-font="poster"] [data-dsh-portal-synced],
:root[data-dsh-font="poster"] :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]),
[data-dsh-style][data-dsh-font="poster"],
[data-dsh-portal-synced][data-dsh-font="poster"] {
  --dsh-font-display: Impact, "Arial Black", "Noto Sans SC Black", "SimHei", "黑体", sans-serif;
  --dsh-font-body: "Source Sans 3", "Noto Sans SC Medium", "Noto Sans SC", sans-serif;
  --dsh-font-mono: "Cascadia Code", "Cascadia Mono", Consolas, monospace;
  --dsh-display-weight: 900;
  --dsh-display-tracking: -0.02em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

:root[data-dsh-font="retro98"] [data-dsh-style],
:root[data-dsh-font="retro98"] [data-dsh-portal-synced],
:root[data-dsh-font="retro98"] :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]),
[data-dsh-style][data-dsh-font="retro98"],
[data-dsh-portal-synced][data-dsh-font="retro98"] {
  --dsh-font-display: Tahoma, "SimSun", "NSimSun", "宋体", "新宋体", sans-serif;
  --dsh-font-body: Tahoma, "SimSun", "NSimSun", "宋体", "新宋体", sans-serif;
  --dsh-font-mono: "Fixedsys", Consolas, "Courier New", "SimSun", "宋体", monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: normal;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

:root[data-dsh-font="serif"] [data-dsh-style],
:root[data-dsh-font="serif"] [data-dsh-portal-synced],
:root[data-dsh-font="serif"] :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]),
[data-dsh-style][data-dsh-font="serif"],
[data-dsh-portal-synced][data-dsh-font="serif"] {
  --dsh-font-display: "Palatino Linotype", Georgia, "Noto Serif SC SemiBold", "Noto Serif SC", "STZhongsong", "华文中宋", serif;
  --dsh-font-body: Georgia, "Noto Serif SC", "STSong", "华文宋体", serif;
  --dsh-font-mono: "Cascadia Code", "Cascadia Mono", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: -0.01em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

:root[data-dsh-font="arcade"] [data-dsh-style],
:root[data-dsh-font="arcade"] [data-dsh-portal-synced],
:root[data-dsh-font="arcade"] :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]),
[data-dsh-style][data-dsh-font="arcade"],
[data-dsh-portal-synced][data-dsh-font="arcade"] {
  --dsh-font-display: "Cascadia Code SemiBold", "Cascadia Code", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-body: "Cascadia Code", "Cascadia Mono", "YouYuan", "幼圆", "Noto Sans SC", monospace;
  --dsh-font-mono: "Cascadia Mono", "Cascadia Code", "YouYuan", "幼圆", Consolas, monospace;
  --dsh-display-weight: 700;
  --dsh-display-tracking: 0.015em;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

:root[data-dsh-font="modern"] [data-dsh-style],
:root[data-dsh-font="modern"] [data-dsh-portal-synced],
:root[data-dsh-font="modern"] :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]),
[data-dsh-style][data-dsh-font="modern"],
[data-dsh-portal-synced][data-dsh-font="modern"] {
  --dsh-font-display: "Source Sans 3", "Segoe UI", "Noto Sans SC", "Microsoft YaHei UI", sans-serif;
  --dsh-font-body: "Source Sans 3", "Segoe UI", "Noto Sans SC", "Microsoft YaHei UI", sans-serif;
  --dsh-font-mono: "Cascadia Code", "Cascadia Mono", Consolas, "Microsoft YaHei UI", monospace;
  --dsh-display-weight: 650;
  --dsh-display-tracking: normal;
  --dsh-body-tracking: normal;
  --dsw-font-family: var(--dsh-font-body);
  --dsw-font-markdown-base: var(--dsh-font-body);
}

/* Dual-layer body typography application (workbench + form controls + portaled menus/modals) */
:where([data-dsh-style], [data-dsh-portal-synced]),
:where([data-dsh-style], [data-dsh-portal-synced]) :where(button, input, select, textarea),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style], [data-dsh-portal-synced], :has([data-dsh-style])),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style], [data-dsh-portal-synced], :has([data-dsh-style])) :where(button, input, select, textarea) {
  font-family: var(--dsh-font-body);
  letter-spacing: var(--dsh-body-tracking, normal);
}

/* Dual-layer display typography application (headings, tabs, header title, editorial titles) */
:where([data-dsh-style], [data-dsh-portal-synced]) :where(
  h1,
  h2,
  h3,
  [role="tab"],
  .dsh-header-title,
  [data-dsh-serif],
  [data-dsh-editorial-heading],
  [data-dsh-card] :is(h2, h3, .dsh-card-title),
  .dsh-card :is(h2, h3, .dsh-card-title),
  [data-dsh-reader] :is(h1, h2),
  .dsh-reader :is(h1, h2)
),
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style], [data-dsh-portal-synced], :has([data-dsh-style])) :where(h1, h2, h3, header h2, [role="tab"], [data-dsh-serif]) {
  font-family: var(--dsh-font-display);
  font-weight: var(--dsh-display-weight, 700);
  letter-spacing: var(--dsh-display-tracking, normal);
}

/* Monospace code typography */
:where([data-dsh-style], [data-dsh-portal-synced]) :where(code, pre, kbd, samp),
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style], [data-dsh-portal-synced], :has([data-dsh-style])) :where(code, pre, kbd, samp) {
  font-family: var(--dsh-font-mono);
}

/* --------------------------------------------------------------------------
 * 11. Interactive Dynamics: Tactile Button Physics & Active States
 * -------------------------------------------------------------------------- */
:where([data-dsh-style]) :where(button, [role="button"]),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) :where(button, [role="button"]) {
  /* Identity transforms prevent mid-interaction stacking-context shifts */
  translate: 0px 0px;
  scale: 1;
  transition-property: background-color, border-color, color, box-shadow, opacity, translate, scale;
  transition-duration: var(--dsh-motion-fast);
  transition-timing-function: var(--dsh-ease-out);
}

/* Visible active style on open menu triggers */
:where([data-dsh-style]) :where(button, [role="button"])[aria-expanded="true"]:not(:disabled):not([aria-disabled="true"]),
:where([role="dialog"], [role="alertdialog"], dialog):has([data-dsh-style]) :where(button, [role="button"])[aria-expanded="true"]:not(:disabled):not([aria-disabled="true"]) {
  background-color: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
}

@media (prefers-reduced-motion: no-preference) {
  @media (hover: hover) {
    :where([data-dsh-style]:not([data-dsh-style="pixel8bit"]):not([data-dsh-style="eink"]):not([data-dsh-style="win98"]):not([data-dsh-style="risograph"])) :where(button:not([role="tab"]):not([role="menuitem"]):not([role="menuitemradio"]):not([role="switch"]), .dsh-btn):hover:not(:disabled):not([aria-disabled="true"]),
    :where([role="dialog"], [role="alertdialog"], dialog):has([data-dsh-style]:not([data-dsh-style="pixel8bit"]):not([data-dsh-style="eink"]):not([data-dsh-style="win98"]):not([data-dsh-style="risograph"])) :where(button:not([role="tab"]):not([role="menuitem"]):not([role="menuitemradio"]):not([role="switch"]), .dsh-btn):hover:not(:disabled):not([aria-disabled="true"]) {
      translate: 0px -0.5px;
    }

    [data-dsh-style="pixel8bit"] :where(button:not([role="tab"]):not([role="menuitem"]):not([role="menuitemradio"]), .dsh-btn):hover:not(:disabled):not([aria-disabled="true"]),
    :where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) :where(button:not([role="tab"]):not([role="menuitem"]):not([role="menuitemradio"]), .dsh-btn):hover:not(:disabled):not([aria-disabled="true"]) {
      translate: -1px -1px;
      box-shadow: 3px 3px 0px #1e2826;
      transition-timing-function: steps(2, end);
      transition-duration: 70ms;
    }

    [data-dsh-style="risograph"] :where(button:not([role="tab"]):not([role="menuitem"]):not([role="menuitemradio"]), .dsh-btn):hover:not(:disabled):not([aria-disabled="true"]),
    :where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="risograph"], :has([data-dsh-style="risograph"])) :where(button:not([role="tab"]):not([role="menuitem"]):not([role="menuitemradio"]), .dsh-btn):hover:not(:disabled):not([aria-disabled="true"]) {
      translate: -1px -1px;
      box-shadow: 4px 4px 0px #2563eb;
    }
  }

  /* Tactile spring press on standard themes */
  :where([data-dsh-style]:not([data-dsh-style="pixel8bit"]):not([data-dsh-style="eink"]):not([data-dsh-style="win98"]):not([data-dsh-style="risograph"])) :where(button:not([role="switch"]), [role="button"]):active:not(:disabled):not([aria-disabled="true"]),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]:not([data-dsh-style="pixel8bit"]):not([data-dsh-style="eink"]):not([data-dsh-style="win98"]):not([data-dsh-style="risograph"])) :where(button:not([role="switch"]), [role="button"]):active:not(:disabled):not([aria-disabled="true"]) {
    scale: 0.965;
    translate: 0px 0.5px;
    transition-duration: 80ms;
  }

  /* Stepped 8-Bit arcade press (\`translate(1px, 1px)\` + crisp 1px pixel shadow) */
  [data-dsh-style="pixel8bit"] :where(button:not([role="tab"]):not([role="switch"]), .dsh-btn):active:not(:disabled):not([aria-disabled="true"]),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) :where(button:not([role="tab"]):not([role="switch"]), .dsh-btn):active:not(:disabled):not([aria-disabled="true"]) {
    translate: 1px 1px !important;
    scale: 1 !important;
    box-shadow: 1px 1px 0px #1e2826 !important;
    transition-timing-function: steps(2, end);
    transition-duration: 50ms;
  }

  /* Risograph shadow-collapse button press (\`translate(2px, 2px)\`) */
  [data-dsh-style="risograph"] :where(button:not([role="tab"]):not([role="switch"]), .dsh-btn):active:not(:disabled):not([aria-disabled="true"]),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="risograph"], :has([data-dsh-style="risograph"])) :where(button:not([role="tab"]):not([role="switch"]), .dsh-btn):active:not(:disabled):not([aria-disabled="true"]) {
    translate: 2px 2px !important;
    scale: 1 !important;
    box-shadow: 1px 1px 0px #18181b !important;
    transition-duration: 60ms;
  }
}

/* --------------------------------------------------------------------------
 * 12. Small-Button SVG Icon Micro-Animations
 * -------------------------------------------------------------------------- */
:where([data-dsh-style]) :where(button, [role="button"], summary) svg,
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) :where(button, [role="button"], summary) svg {
  translate: 0px 0px;
  rotate: 0deg;
  scale: 1;
  transform-origin: center;
}

@keyframes dsh-icon-spin {
  to {
    rotate: 360deg;
  }
}

@keyframes dsh-icon-wiggle {
  0% { rotate: 0deg; }
  25% { rotate: -12deg; }
  55% { rotate: 10deg; }
  80% { rotate: -5deg; }
  100% { rotate: 0deg; }
}

@keyframes dsh-icon-pop {
  0% { scale: 1; }
  45% { scale: 1.26; }
  75% { scale: 0.94; }
  100% { scale: 1; }
}

@keyframes dsh-icon-bounce {
  0%, 100% { translate: 0px 0px; }
  45% { translate: 0px 2.5px; }
  75% { translate: 0px -1px; }
}

@media (prefers-reduced-motion: no-preference) {
  :where([data-dsh-style]) :where(button, [role="button"], summary) svg,
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) :where(button, [role="button"], summary) svg {
    transition:
      translate var(--dsh-motion-base) var(--dsh-ease-spring),
      rotate 240ms var(--dsh-ease-spring),
      scale var(--dsh-motion-base) var(--dsh-ease-spring);
  }

  /* 1) \`down\` / chevron: 180deg flip on \`[aria-expanded="true"]\` or \`details[open]\` */
  :where([data-dsh-style]) :where([aria-expanded="true"], [data-open="true"], details[open] > summary) :is(svg[data-dsh-icon="down"], svg[data-dsh-icon="chevron-down"], svg[data-icon="down"], svg[data-icon="chevron-down"]),
  :where([role="dialog"], [role="alertdialog"], dialog):has([data-dsh-style]) :where([aria-expanded="true"], [data-open="true"]) :is(svg[data-dsh-icon="down"], svg[data-dsh-icon="chevron-down"], svg[data-icon="down"], svg[data-icon="chevron-down"]) {
    rotate: 180deg;
  }

  /* 2) \`refresh\` / \`sync\`: smooth 180deg spin on hover, continuous spin when busy */
  :where([data-dsh-style]) :where(button, [role="button"])[aria-busy="true"] :is(svg[data-dsh-icon="refresh"], svg[data-dsh-icon="sync"], svg[data-icon="refresh"], svg[data-icon="sync"]),
  :where([data-dsh-style]) :is(svg[data-dsh-icon="refresh"], svg[data-icon="refresh"])[data-spinning="true"] {
    animation: dsh-icon-spin 0.85s linear infinite;
  }

  @media (hover: hover) {
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="refresh"], svg[data-dsh-icon="sync"], svg[data-dsh-icon="reload"], svg[data-icon="refresh"], svg[data-icon="sync"], svg[data-icon="reload"]) {
      rotate: 180deg;
    }

    /* 3) \`plus\` / \`close\`: crisp 90deg turn */
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="plus"], svg[data-dsh-icon="add"], svg[data-dsh-icon="close"], svg[data-dsh-icon="x"], svg[data-icon="plus"], svg[data-icon="add"], svg[data-icon="close"], svg[data-icon="x"]) {
      rotate: 90deg;
    }

    /* 4) \`send\` / \`external\` / \`link\`: forward/diagonal glide */
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"], a):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="send"], svg[data-dsh-icon="external"], svg[data-dsh-icon="link"], svg[data-icon="send"], svg[data-icon="external"], svg[data-icon="link"]) {
      translate: 2px -1.5px;
    }

    /* 5) \`reply\` / \`left\` / \`undo\`: leading glide */
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="reply"], svg[data-dsh-icon="left"], svg[data-dsh-icon="undo"], svg[data-icon="reply"], svg[data-icon="left"], svg[data-icon="undo"]) {
      translate: -2px 0px;
    }

    /* 6) \`right\` / \`play\`: trailing nudge & pulse */
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="right"], svg[data-icon="right"]) {
      translate: 2px 0px;
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="play"], svg[data-icon="play"]) {
      translate: 1.5px 0px;
      scale: 1.14;
    }

    /* 7) \`trash\` / \`delete\`: tactile warning wiggle */
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="trash"], svg[data-dsh-icon="delete"], svg[data-icon="trash"], svg[data-icon="delete"]) {
      animation: dsh-icon-wiggle 360ms var(--dsh-ease-in-out);
    }

    /* 8) \`star\` / \`check\` / \`copy\` / \`bookmark\`: spring pop */
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="star"], svg[data-dsh-icon="check"], svg[data-dsh-icon="copy"], svg[data-dsh-icon="bookmark"], svg[data-icon="star"], svg[data-icon="check"], svg[data-icon="copy"], svg[data-icon="bookmark"]) {
      scale: 1.18;
    }

    /* 9) \`download\` / \`export\`: vertical bounce */
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="download"], svg[data-dsh-icon="export"], svg[data-icon="download"], svg[data-icon="export"]) {
      animation: dsh-icon-bounce 420ms var(--dsh-ease-out);
    }

    /* 10) \`palette\` / \`sparkles\` / \`edit\`: playful tilt */
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="palette"], svg[data-dsh-icon="sparkles"], svg[data-dsh-icon="edit"], svg[data-icon="palette"], svg[data-icon="sparkles"], svg[data-icon="edit"]) {
      rotate: -12deg;
      scale: 1.08;
    }

    /* Closed chevron gentle downward cue on hover */
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"])[aria-expanded="false"]:hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="down"], svg[data-dsh-icon="chevron-down"], svg[data-icon="down"], svg[data-icon="chevron-down"]) {
      translate: 0px 1.5px;
    }
  }

  /* Pop feedback when toggled into active/pressed/checked state */
  :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where([aria-pressed="true"], [aria-checked="true"], [data-active="true"], [data-copied="true"]) :is(svg[data-dsh-icon="star"], svg[data-dsh-icon="check"], svg[data-dsh-icon="copy"], svg[data-icon="star"], svg[data-icon="check"], svg[data-icon="copy"]) {
    animation: dsh-icon-pop 300ms var(--dsh-ease-spring);
  }
}

/* --------------------------------------------------------------------------
 * 13. v3 Layout Primitives: Unified 48px Single-Row Header
 * -------------------------------------------------------------------------- */
:where([data-dsh-style]) :where(.dsh-header, [data-dsh-header]) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 48px;
  padding: 6px 14px;
  flex: none;
  min-width: 0;
  background: var(--dsw-alias-bg-base);
  border-block-end: var(--dsh-control-border-width, 0.5px) solid var(--dsw-alias-border-l2);
}

.dsh-header-leading {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
}

.dsh-header-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: none;
  white-space: nowrap;
}

.dsh-header-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: var(--dsw-radius-xs, 6px);
  background: var(--dsw-alias-button-primary-fill, #4176e6);
  color: var(--dsw-alias-button-primary-ink, #ffffff);
}

.dsh-header-title {
  margin: 0;
  font-size: 13.5px;
  font-weight: var(--dsh-display-weight, 650);
  line-height: 1.25;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
}

.dsh-header-tabs {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 auto;
}

.dsh-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  white-space: nowrap;
}

@container (max-width: 759px) {
  :where([data-dsh-style]) :where(.dsh-header, [data-dsh-header]) {
    flex-wrap: wrap;
    padding-block: 6px;
  }

  .dsh-header-leading {
    flex-wrap: wrap;
    gap: 6px 10px;
  }
}

/* --------------------------------------------------------------------------
 * 14. v3 Tabs: Sliding Indicator + 140ms \`@starting-style\` Panel Entrance
 * -------------------------------------------------------------------------- */
:where([data-dsh-style]) :where([role="tablist"], .dsh-tablist) {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}

:where([data-dsh-style]) [role="tab"] {
  position: relative;
  flex: none;
  white-space: nowrap;
}

/* Static fallback underline when sliding indicator is not active (or in forced-colors) */
:where([data-dsh-style]) [role="tab"][aria-selected="true"]::after {
  content: "";
  position: absolute;
  inset-inline: 6px;
  inset-block-end: 0;
  border-block-end: 2px solid var(--dsw-alias-state-business-primary);
  pointer-events: none;
}

[data-dsh-style] :where([data-dsh-tablist][data-indicator-ready="true"], .dsh-tablist[data-indicator-ready="true"]) [role="tab"][aria-selected="true"]::after {
  opacity: 0;
}

.dsh-tab-indicator {
  position: absolute;
  inset-inline-start: 0;
  inset-block-end: 0;
  height: 2px;
  width: var(--dsh-tab-w, 0px);
  translate: var(--dsh-tab-x, 0px) 0px;
  border-block-end: 2px solid var(--dsw-alias-state-business-primary);
  border-radius: 2px 2px 0 0;
  pointer-events: none;
  opacity: 0;
  transition:
    translate 180ms var(--dsh-ease-out),
    width 180ms var(--dsh-ease-out),
    opacity 120ms ease-out;
}

[data-indicator-ready="true"] > .dsh-tab-indicator {
  opacity: 1;
}

.dsh-tablist-pill > .dsh-tab-indicator {
  inset-block: 3px;
  height: auto;
  border-block-end: 2px solid var(--dsw-alias-state-business-primary);
  border-radius: var(--dsw-radius-xs, 6px);
  background: var(--dsw-alias-interactive-bg-active);
  z-index: 0;
}

.dsh-tablist-pill > [role="tab"] {
  z-index: 1;
}

[data-dsh-style="eink"] .dsh-tab-indicator {
  transition-duration: 60ms;
}

[data-dsh-style="pixel8bit"] .dsh-tab-indicator {
  border-radius: 0px !important;
  transition-timing-function: steps(4, end);
}

/* 140ms \`@starting-style\` + keyframe fade-in for active tab panels */
@keyframes dsh-tab-panel-enter {
  from {
    opacity: 0;
    translate: 0px 4px;
  }
  to {
    opacity: 1;
    translate: 0px 0px;
  }
}

:where([data-dsh-style]) :where(.dsh-tab-panel, [data-dsh-tab-panel]):not([hidden]) {
  opacity: 1;
  translate: 0px 0px;
  transition:
    opacity 140ms var(--dsh-ease-out),
    translate 140ms var(--dsh-ease-out);
  animation: dsh-tab-panel-enter 140ms var(--dsh-ease-out);
}

@starting-style {
  :where([data-dsh-style]) :where(.dsh-tab-panel, [data-dsh-tab-panel]):not([hidden]) {
    opacity: 0;
    translate: 0px 4px;
  }
}

/* --------------------------------------------------------------------------
 * 15. v3 Resizable Split Pane (\`.dsh-split-pane\` + \`.dsh-split-resizer\`)
 *     - Pointer-capture drag + double-click reset + ArrowLeft/ArrowRight
 *     - Auto-stack fallback below 760px container/viewport width
 * -------------------------------------------------------------------------- */
.dsh-split-pane {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
}

.dsh-split-leading {
  flex: none;
  min-width: 0;
  min-height: 0;
  width: var(--dsh-split-size, 320px);
}

.dsh-split-trailing {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.dsh-split-resizer {
  position: relative;
  flex: none;
  width: 9px;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
  user-select: none;
  background: transparent;
  outline: none;
}

.dsh-split-resizer[aria-orientation="horizontal"] {
  width: 100%;
  height: 9px;
  min-height: 9px;
  cursor: row-resize;
}

.dsh-split-resizer::before {
  content: "";
  width: 1px;
  height: 100%;
  background: var(--dsw-alias-border-l2);
  transition:
    width 120ms var(--dsh-ease-out),
    background-color 120ms var(--dsh-ease-out);
}

.dsh-split-resizer[aria-orientation="horizontal"]::before {
  width: 100%;
  height: 1px;
}

.dsh-split-resizer::after {
  content: "";
  position: absolute;
  width: 3px;
  height: 28px;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3);
  opacity: 0;
  transition:
    opacity 120ms var(--dsh-ease-out),
    background-color 120ms var(--dsh-ease-out);
}

.dsh-split-resizer[aria-orientation="horizontal"]::after {
  width: 28px;
  height: 3px;
}

.dsh-split-resizer:hover::before,
.dsh-split-resizer:focus-visible::before,
.dsh-split-resizer[data-dragging="true"]::before {
  width: 2px;
  background: var(--dsw-alias-state-business-primary);
}

.dsh-split-resizer[aria-orientation="horizontal"]:is(:hover, :focus-visible, [data-dragging="true"])::before {
  width: 100%;
  height: 2px;
}

.dsh-split-resizer:is(:hover, :focus-visible, [data-dragging="true"])::after {
  opacity: 1;
  background: var(--dsw-alias-state-business-primary);
}

.dsh-split-resizer:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: -2px;
}

[data-dsh-style="pixel8bit"] .dsh-split-resizer::before {
  width: 2px;
  background: #1e2826;
}

[data-dsh-style="pixel8bit"] .dsh-split-resizer::after {
  border-radius: 0px;
}

@container (max-width: 759px) {
  .dsh-split-pane {
    flex-direction: column;
    overflow-y: auto;
  }

  .dsh-split-leading {
    width: 100% !important;
    max-width: 100%;
    flex: none;
  }

  .dsh-split-resizer {
    display: none;
  }
}

@media (max-width: 759px) {
  .dsh-split-pane {
    flex-direction: column;
    overflow-y: auto;
  }

  .dsh-split-leading {
    width: 100% !important;
    max-width: 100%;
    flex: none;
  }

  .dsh-split-resizer {
    display: none;
  }
}

/* --------------------------------------------------------------------------
 * 16. v3 Theme-Tinted Shimmer Skeleton & Pixel Progress Helpers
 * -------------------------------------------------------------------------- */
@keyframes dsh-skeleton-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.dsh-skeleton-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.dsh-skeleton {
  display: block;
  width: 100%;
  height: 12px;
  border-radius: var(--dsw-radius-xs, 6px);
  background-color: var(--dsw-alias-bg-layer-2, #e5e7eb);
  background-image: linear-gradient(
    90deg,
    var(--dsw-alias-bg-layer-2, #e5e7eb) 0%,
    color-mix(in oklab, var(--dsw-alias-bg-overlay, #ffffff) 82%, var(--dsw-alias-state-business-primary, #4176e6) 18%) 48%,
    var(--dsw-alias-bg-layer-2, #e5e7eb) 100%
  );
  background-size: 220% 100%;
  background-position: 100% 0;
}

.dsh-skeleton-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex: none;
}

.dsh-skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--dsw-radius-md, 12px);
  border: var(--dsh-control-border-width, 0.5px) solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}

.dsh-skeleton-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
}

@media (prefers-reduced-motion: no-preference) {
  :where([data-dsh-style]:not([data-dsh-style="eink"])) .dsh-skeleton[data-animated="true"] {
    animation: dsh-skeleton-shimmer 1.35s var(--dsh-ease-in-out) infinite;
  }

  [data-dsh-style="pixel8bit"] .dsh-skeleton[data-animated="true"] {
    border-radius: 0px !important;
    border: 1px solid #1e2826;
    animation-timing-function: steps(4, end);
  }
}

[data-dsh-style="eink"] .dsh-skeleton {
  background-image: none;
  border: 1px solid #c5c2b8;
}

/* Stepped pixel progress helper */
.dsh-progress {
  position: relative;
  width: 100%;
  height: 6px;
  overflow: clip;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
}

.dsh-progress-bar {
  height: 100%;
  width: var(--dsh-progress-value, 0%);
  border-radius: inherit;
  background: var(--dsw-alias-state-business-primary);
  transition: width 200ms var(--dsh-ease-out);
}

[data-dsh-style="pixel8bit"] .dsh-progress {
  height: 10px;
  border-radius: 0px !important;
  border: 2px solid #1e2826;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: 2px 2px 0px #1e2826;
}

[data-dsh-style="pixel8bit"] .dsh-progress-bar {
  border-radius: 0px !important;
  background: repeating-linear-gradient(
    90deg,
    #2e7d5b 0px,
    #2e7d5b 6px,
    #24674a 6px,
    #24674a 8px
  );
  transition-timing-function: steps(8, end);
}

/* --------------------------------------------------------------------------
 * 17. v3 Interactive Cards, Rows, Quick-Action Bar & Top-Layer Dialog Entrance
 * -------------------------------------------------------------------------- */
:where([data-dsh-style]) :where([data-dsh-card], .dsh-card, [data-dsh-row], .dsh-row) {
  translate: 0px 0px;
  transition:
    background-color var(--dsh-motion-fast) var(--dsh-ease-out),
    border-color var(--dsh-motion-fast) var(--dsh-ease-out),
    box-shadow var(--dsh-motion-base) var(--dsh-ease-out),
    translate var(--dsh-motion-base) var(--dsh-ease-out);
}

/* Row Hover Quick-Action Bar (\`.dsh-row-actions\`) */
.dsh-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: none;
  translate: 0px 0px;
  transition:
    opacity var(--dsh-motion-fast) var(--dsh-ease-out),
    translate var(--dsh-motion-fast) var(--dsh-ease-out);
}

@media (hover: hover) {
  :where([data-dsh-row], .dsh-row) .dsh-row-actions:not([data-always-visible="true"]) {
    opacity: 0;
    translate: 4px 0px;
    pointer-events: none;
  }

  :where([data-dsh-row], .dsh-row):is(:hover, :focus-within, [data-active="true"], [data-selected="true"], [aria-selected="true"]) .dsh-row-actions {
    opacity: 1;
    translate: 0px 0px;
    pointer-events: auto;
  }
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  :where([data-dsh-style]:not([data-dsh-style="pixel8bit"]):not([data-dsh-style="eink"]):not([data-dsh-style="win98"]):not([data-dsh-style="risograph"])) :where([data-dsh-card], .dsh-card):hover {
    translate: 0px -1.5px;
    box-shadow: var(--dsh-card-hover-shadow);
  }

  [data-dsh-style="pixel8bit"] :where([data-dsh-card], .dsh-card):hover {
    translate: -1px -1px;
    box-shadow: 4px 4px 0px #1e2826;
  }

  [data-dsh-style="risograph"] :where([data-dsh-card], .dsh-card):hover {
    translate: -1px -1px;
    box-shadow: 5px 5px 0px #ff3e7f;
  }

  :where([data-dsh-style]) :where([data-dsh-row], .dsh-row):hover:not([data-selected="true"]):not([aria-selected="true"]):not([data-active="true"]) {
    background-color: var(--dsh-surface-spotlight, var(--dsw-alias-interactive-bg-hover));
  }
}

/* Modal / Dialog & Popover Top-Layer Entrance + Scroll Containment */
:where([role="dialog"], [role="alertdialog"], dialog[open]):where([data-dsh-style], :has([data-dsh-style])) {
  overscroll-behavior: contain;
  opacity: 1;
  transition-property: opacity, scale, translate, display, overlay;
  transition-duration: var(--dsh-motion-dialog);
  transition-timing-function: var(--dsh-ease-out);
  /* Separate declaration after transition so older parsers never drop transitions */
  transition-behavior: allow-discrete;
}

@starting-style {
  :where([role="dialog"], [role="alertdialog"], dialog[open]):where([data-dsh-style], :has([data-dsh-style])) {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: no-preference) {
  :where([role="dialog"], [role="alertdialog"], dialog[open]):where([data-dsh-style], :has([data-dsh-style])) {
    scale: 1;
    translate: 0px 0px;
  }

  @starting-style {
    :where([role="dialog"], [role="alertdialog"], dialog[open]):where([data-dsh-style], :has([data-dsh-style])) {
      scale: 0.965;
      translate: 0px 6px;
    }
  }
}

dialog[open]::backdrop {
  overflow: hidden;
  overscroll-behavior: contain;
}

/* --------------------------------------------------------------------------
 * 18. v3 Calm Compact Update Strip (\`[data-plugin-update-footer]\`)
 *     Keeps \`@stardustlc/dsh-updates\` footer compact at bottom without
 *     crushing or cutting off \`flex: 1\` split-pane columns.
 * -------------------------------------------------------------------------- */
:where([data-dsh-style]) [data-plugin-update-footer] {
  flex: none;
  box-sizing: border-box;
  width: 100%;
  min-height: 32px;
  margin: 0;
  padding: 6px 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  border-block-start: var(--dsh-control-border-width, 0.5px) solid var(--dsw-alias-border-l2);
}

:where([data-dsh-style]) [data-plugin-update-footer] :where(button, a) {
  min-height: 24px;
  font-size: 11.5px;
}

:where([data-dsh-style]) [data-show-updates="false"] [data-plugin-update-footer] {
  display: none;
}

/* --------------------------------------------------------------------------
 * 19. Unified Header Style & Font Switcher Chrome (\`.dsh-style-switcher\`)
 * -------------------------------------------------------------------------- */
.dsh-style-switcher {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  flex: none;
  white-space: nowrap;
}

.dsh-style-trigger.dsh-style-trigger,
.dsh-font-trigger.dsh-font-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  height: 28px;
  padding-inline: 8px;
  width: auto;
  flex-shrink: 0;
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-1);
  border: var(--dsh-control-border-width, 0.5px) solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm, 8px);
  cursor: pointer;
  white-space: nowrap;
}

.dsh-font-trigger.dsh-font-trigger {
  gap: 5px;
  padding-inline: 7px;
}

.dsh-font-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  min-width: 16px;
  height: 16px;
  padding-inline: 3px;
  border-radius: var(--dsw-radius-xs, 4px);
  background: var(--dsw-alias-state-business-tertiary, rgba(65, 118, 230, 0.12));
  color: var(--dsw-alias-state-business-primary, var(--dsw-alias-label-primary));
  font-family: var(--dsh-font-display);
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
}

.dsh-style-label,
.dsh-font-label {
  white-space: nowrap;
  line-height: 1;
}

@media (hover: hover) {
  .dsh-style-trigger.dsh-style-trigger:hover:not(:disabled),
  .dsh-font-trigger.dsh-font-trigger:hover:not(:disabled) {
    color: var(--dsw-alias-label-primary);
    background: var(--dsw-alias-interactive-bg-hover);
  }
}

.dsh-style-swatch {
  display: inline-block;
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  corner-shape: round;
  background: var(--dsh-swatch-color, var(--dsw-alias-state-business-primary));
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.16);
}

[data-dsh-style="pixel8bit"] .dsh-style-swatch {
  border-radius: 0px !important;
  corner-shape: square;
  box-shadow: 1px 1px 0px #1e2826;
}

.dsh-style-fallback-wrap {
  position: relative;
  display: inline-flex;
}

.dsh-style-fallback-menu {
  position: absolute;
  inset-block-start: calc(100% + 4px);
  inset-inline-end: 0;
  z-index: 2147483001;
  display: grid;
  gap: 2px;
  min-width: 186px;
  max-height: min(420px, 70dvh);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px;
  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-base));
  border: var(--dsh-control-border-width, 0.5px) solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md, 12px);
  box-shadow: var(--dsw-elevation-prominent);
}

.dsh-style-fallback-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 28px;
  padding: 4px 8px;
  border: 0;
  border-radius: var(--dsw-radius-xs, 6px);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  text-align: start;
  cursor: pointer;
}

.dsh-style-fallback-item-leading {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.dsh-style-fallback-item[aria-checked="true"] {
  background: var(--dsw-alias-interactive-bg-active);
  font-weight: 600;
}

@media (hover: hover) {
  .dsh-style-fallback-item:hover:not(:disabled) {
    background: var(--dsw-alias-interactive-bg-hover);
  }
}

/* Fallback Modal & Menu Chrome (when host \`@deepseek-ai/dsh-client-ui-primitives\` is absent) */
.dsh-fallback-modal-root {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: grid;
  place-items: center;
  padding: 16px;
}

.dsh-fallback-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.36);
}

.dsh-fallback-modal-dialog {
  position: relative;
  z-index: 1;
  max-width: min(560px, calc(100dvw - 32px));
  max-height: calc(100dvh - 32px);
  overflow: clip;
  display: flex;
  flex-direction: column;
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--dsw-alias-bg-layer-1, #f8fafc);
  color: var(--dsw-alias-label-primary, #1f232b);
  box-shadow: var(--dsw-elevation-prominent);
}

/* --------------------------------------------------------------------------
 * 20. Accessibility: Reduced Motion & Windows High Contrast (Forced Colors)
 * -------------------------------------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  :where([data-dsh-style]) :where(button, [role="button"], [data-dsh-card], .dsh-card, [data-dsh-row], .dsh-row, .dsh-row-actions, .dsh-tab-panel, [data-dsh-tab-panel]),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) :where(button, [role="button"]) {
    translate: none !important;
    scale: none !important;
    animation: none !important;
    transition-property: background-color, border-color, color, opacity;
    transition-duration: 90ms;
  }

  :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"], summary) svg,
  [data-dsh-style="pixel8bit"] :where([data-dsh-row], .dsh-row)::before,
  [data-dsh-style="pixel8bit"] .dsh-pixel-cursor {
    animation: none !important;
    transition: none !important;
    translate: none !important;
    scale: none !important;
  }

  .dsh-tab-indicator {
    transition-property: opacity;
    transition-duration: 90ms;
  }

  .dsh-skeleton {
    animation: none !important;
    background-image: none;
  }

  /* Short, non-spatial fade only for top-layer dialogs under reduced motion */
  :where([role="dialog"], [role="alertdialog"], dialog[open]):where([data-dsh-style], :has([data-dsh-style])) {
    scale: none !important;
    translate: none !important;
    transition-duration: 100ms;
  }
}

@media (forced-colors: active) {
  :where([data-dsh-style]) :where(button, input, select, textarea, [data-dsh-card], .dsh-card),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style], :has([data-dsh-style])) {
    border: 1px solid ButtonText;
  }

  :where([data-dsh-style]) [role="tab"][aria-selected="true"]::after {
    opacity: 1 !important;
    border-block-end: 3px solid Highlight;
  }

  .dsh-tab-indicator {
    background: transparent !important;
    border-block-end: 3px solid Highlight;
  }

  .dsh-split-resizer::before,
  .dsh-split-resizer::after {
    background: ButtonText;
  }

  .dsh-skeleton {
    border: 1px solid GrayText;
    background: Canvas;
  }
}

/* 16. Workbench UI v3 Core Studio Layout & Components */
.dshw,
.dshw[data-dsh-style],
[data-dsh-style] .dshw {
  --w-canvas: var(--dsw-alias-bg-base, #ffffff);
  --w-bg: var(--dsw-alias-bg-layer-1, #f8fafc);
  --w-soft: var(--dsw-alias-bg-layer-2, #f1f5f9);
  --w-text: var(--dsw-alias-label-primary, #1e293b);
  --w-muted: var(--dsw-alias-label-secondary, #64748b);
  --w-border: var(--dsw-alias-border-l2, #e2e8f0);
  --w-accent: var(--dsw-alias-state-business-primary, #4176e6);
  --w-selected: var(--dsw-alias-interactive-bg-active, color-mix(in oklab, var(--w-accent) 11%, var(--w-canvas)));
  --w-primary: var(--dsw-alias-button-primary-fill, var(--w-accent));
  --w-on-primary: var(--dsw-alias-button-primary-ink, #ffffff);
  container-type: inline-size;
  container-name: dsh-workbench;
  color: var(--w-text);
  font-size: 13.5px;
  line-height: 1.6;
  font-family: var(--dsh-font-body, var(--dsw-font-family, var(--dsh-font-family-content, system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif)));
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  text-align: start;
}
.dshw *, .dshw *:before, .dshw *:after { box-sizing: border-box; }
.dshw h1, .dshw h2, .dshw h3, .dshw h4, .dshw p { margin: 0; }
.dshw h1 { font-size: 16px; line-height: 1.3; font-family: var(--dsh-font-display, inherit); letter-spacing: var(--dsh-display-tracking, -0.015em); font-weight: var(--dsh-display-weight, 650); }
.dshw .dsh-header-title { font-size: 13.5px; line-height: 1.25; }
.dshw h2 { font-size: 17px; line-height: 1.35; font-family: var(--dsh-font-display, inherit); font-weight: var(--dsh-display-weight, 650); letter-spacing: var(--dsh-display-tracking, -0.01em); overflow-wrap: anywhere; }
.dshw h3, .dshw h4 { font-size: 14.5px; line-height: 1.4; font-family: var(--dsh-font-display, inherit); font-weight: var(--dsh-display-weight, 600); letter-spacing: var(--dsh-display-tracking, normal); }
.dshw a { color: var(--dsw-alias-link, var(--w-accent)); text-underline-offset: 3px; overflow-wrap: anywhere; }
.dshw button, .dshw input, .dshw select, .dshw textarea { font: inherit; color: inherit; max-width: 100%; }
.dshw [role="tab"] { font-family: var(--dsh-font-display, inherit); font-weight: var(--dsh-display-weight, 600); letter-spacing: var(--dsh-display-tracking, normal); }
.dshw input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]),
.dshw select,
.dshw textarea {
  background: var(--dsw-alias-bg-base, var(--w-canvas));
  border: var(--dsh-control-border-width, 1px) solid var(--w-border);
  border-radius: var(--dsw-radius-sm, 8px);
  padding: 7px 10px;
  min-width: 0;
  line-height: 1.5;
}
.dshw input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]),
.dshw select { min-height: 34px; }
.dshw textarea { resize: vertical; }
.dshw input[type=checkbox], .dshw input[type=radio] {
  width: 16px; height: 16px; flex-shrink: 0; accent-color: var(--w-accent);
}
.dshw :focus-visible { outline: 2px solid var(--w-accent); outline-offset: 2px; }
.dshw button:disabled, .dshw input:disabled, .dshw select:disabled, .dshw textarea:disabled {
  opacity: 0.48; cursor: not-allowed;
}
.dshw label { font-size: 13px; }
.dshw fieldset { min-width: 0; border: 1px solid var(--w-border); border-radius: var(--dsw-radius-sm, 8px); }
.dshw summary { cursor: pointer; font-weight: 550; list-style: none; display: flex; align-items: center; gap: 8px; }
.dshw summary::-webkit-details-marker { display: none; }
.dshw summary:after {
  content: ''; display: block; margin-inline-start: auto; width: 7px; height: 7px;
  border-inline-end: 1.75px solid currentColor; border-bottom: 1.75px solid currentColor;
  transform: rotate(45deg); flex-shrink: 0;
  transition: transform var(--dsh-motion-fast, 140ms) var(--dsh-ease-out, ease);
}
.dshw details[open] > summary:after { transform: rotate(225deg); }
.dshw details > summary + * { margin-top: 12px; }
.dshw pre {
  white-space: pre-wrap; overflow-wrap: anywhere;
  font: 12px/1.65 var(--ds-font-family-code, ui-monospace, SFMono-Regular, Consolas, monospace);
  max-width: 100%; background: var(--w-soft); border-radius: var(--dsw-radius-xs, 6px); padding: 12px;
}
.dshw img, .dshw video, .dshw iframe { max-width: 100%; }

.w-page {
  display: flex; flex-direction: column; position: relative;
  padding: 0; min-height: 540px; gap: 0;
  background: var(--w-canvas);
}
.w-page[data-main="true"] {
  height: 100%; min-height: 0;
  padding-block-start: var(--dsh-frame-top-clearance, 0px);
  padding-inline: 0;
  padding-block-end: 0;
  overflow: hidden;
}
.w-page[data-main="true"] > .dsh-header {
  padding-inline-start: max(14px, calc(10px + var(--dsh-frame-leading-clearance, 0px)));
  padding-inline-end: 14px;
}
.dshw :where(.dsh-header-actions, .w-header-actions, [data-dsh-header-actions]) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  white-space: nowrap;
}
.dshw .dsh-header-leading {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}
.dshw .dsh-header-tabs {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}
.dshw .w-tabs {
  min-width: 0;
  max-width: 100%;
  scrollbar-width: none;
}
.w-page[data-main="true"] > .w-body {
  padding-inline: 18px;
  padding-block-start: 10px;
}
.w-page.w-embedded, .w-page[data-main="false"] { padding: 0; }
.w-page.w-embedded > .dsh-header { padding-inline: 10px; }
.dshw.w-page, .dshw .w-body, .dshw .w-tab-panel { overflow-x: clip; }

.w-brand, .w-empty-icon {
  display: grid; place-items: center; flex: none;
  color: var(--w-accent);
  background: var(--dsw-alias-interactive-bg-hover-accent, color-mix(in oklab, var(--w-accent) 12%, transparent));
  border-radius: var(--dsw-radius-sm, 8px);
}
.w-toolbar, .w-actions {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0;
}
.w-body, .w-tabs-layout {
  display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; min-width: 0;
}
.w-body { overflow: auto; }

/* Calm Compact Update Strip ([data-plugin-update-footer]) */
:where([data-dsh-style]) [data-plugin-update-footer],
.w-body > [data-plugin-update-footer] {
  flex: none;
  box-sizing: border-box;
  width: 100%;
  min-height: 32px;
  margin: auto 0 0;
  padding: 6px 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary, var(--w-muted));
  background: var(--dsw-alias-bg-layer-1, var(--w-bg));
  border-block-start: var(--dsh-control-border-width, 0.5px) solid var(--w-border);
}
.w-page[data-main="true"] > .w-body > [data-plugin-update-footer] {
  width: calc(100% + 36px);
  margin-inline: -18px;
}
:where([data-dsh-style]) [data-plugin-update-footer] :where(button, a) {
  min-height: 24px;
  font-size: 11.5px;
}
:where([data-dsh-style]) [data-show-updates="false"] [data-plugin-update-footer] {
  display: none;
}

.w-tab-panel {
  flex: 1 1 auto; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: auto;
}
.w-tabs {
  display: flex; align-items: center; gap: 2px;
  border-block-end: var(--dsh-control-border-width, 0.5px) solid var(--w-border);
  flex-shrink: 0; overflow-x: auto; scrollbar-width: thin;
}
.dshw .w-tabs > button,
.dshw[data-dsh-style] .w-tabs > button {
  border: 0 !important; box-shadow: none !important; background: transparent;
  padding: 5px 10px; white-space: nowrap;
  font-size: 12.5px; font-weight: 550; cursor: pointer;
  color: var(--w-muted); display: inline-flex; align-items: center; gap: 5px;
  border-radius: var(--dsw-radius-xs, 6px);
  min-height: 30px;
}
.dshw .w-tabs > button:hover:not(:disabled),
.dshw[data-dsh-style] .w-tabs > button:hover:not(:disabled) {
  color: var(--w-text); background: var(--dsw-alias-interactive-bg-hover, var(--w-soft));
}
.dshw .w-tabs > button[aria-selected="true"],
.dshw[data-dsh-style] .w-tabs > button[aria-selected="true"] {
  color: var(--w-accent);
}
.w-count, .w-tag {
  font-size: 11px; line-height: 1.4; display: inline-flex; align-items: center;
  flex-shrink: 0; background: var(--w-soft); border-radius: var(--dsw-radius-xs, 6px);
  padding: 1px 6px; color: var(--w-muted);
}
.w-tabs [aria-selected="true"] .w-count, .w-selected .w-tag {
  color: var(--w-accent); background: var(--w-selected);
}

.dshw .w-button {
  display: inline-flex; justify-content: center; align-items: center; gap: 5px;
  background: var(--dsw-alias-bg-base, var(--w-canvas));
  border: var(--dsh-control-border-width, 1px) solid var(--w-border);
  border-radius: var(--dsw-radius-sm, 8px);
  padding: 5px 10px; min-height: 28px; height: auto;
  line-height: 1.35; font-size: 12.5px; font-weight: 500;
  cursor: pointer; text-decoration: none; white-space: nowrap;
  box-shadow: var(--dsh-button-shadow, none);
}
.dshw .w-button:not(:disabled):hover {
  background: var(--dsw-alias-interactive-bg-hover, var(--w-soft));
}
.dshw .w-button.w-primary {
  background: var(--w-primary); border-color: var(--w-primary); color: var(--w-on-primary);
}
.dshw .w-button.w-primary:not(:disabled):hover {
  background: var(--dsw-alias-button-primary-hover, var(--w-primary));
}
.dshw .w-button.w-ghost {
  background: transparent; border-color: transparent; box-shadow: none;
}
.dshw .w-button.w-ghost:not(:disabled):hover {
  background: var(--dsw-alias-interactive-bg-hover, var(--w-soft));
}
.dshw .w-button.w-danger {
  color: var(--dsw-alias-state-error-primary, #c83240);
}
.dshw .w-button.w-danger:not(:disabled):hover {
  background: var(--dsw-alias-interactive-bg-hover-danger, rgba(200, 50, 64, 0.1));
}
.dshw .w-icon-button {
  width: 28px; min-width: 28px; padding-inline: 0; flex: none;
}
.dshw .w-button svg, .dshw .dsh-fallback-btn-icon {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.dshw .w-input {
  display: inline-flex; align-items: center; gap: 8px;
  width: 100%; min-width: 0; min-height: 34px; padding-inline: 10px;
  background: var(--dsw-alias-bg-base, var(--w-canvas));
  border: var(--dsh-control-border-width, 1px) solid var(--w-border);
  border-radius: var(--dsw-radius-sm, 8px);
  box-shadow: none;
}
.dshw .w-input:focus-within {
  border-color: var(--w-accent);
  outline: 2px solid color-mix(in oklab, var(--w-accent) 22%, transparent);
  outline-offset: 1px;
}
.dshw .w-input > span { display: inline-flex; align-items: center; color: var(--w-muted); flex: none; }
.dshw .w-input > input {
  border: 0 !important; background: transparent !important;
  padding: 5px 0 !important; min-height: 30px !important;
  width: 100%; min-width: 0; font: inherit; color: var(--w-text);
  outline: none !important; box-shadow: none !important;
}

.dshw .w-checkbox {
  display: inline-flex; align-items: flex-start; gap: 8px;
  min-width: 0; cursor: pointer; color: inherit;
}
.dshw .w-checkbox input { margin-block-start: 2px; accent-color: var(--w-accent); }
.dshw .w-checkbox-icon > span {
  position: absolute; inline-size: 1px; block-size: 1px;
  overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}

.dshw .w-menu { display: inline-block; min-width: 0; }
.dshw .w-menu-button { width: 100%; justify-content: space-between; gap: 8px; text-align: start; }
.dshw .w-menu-value { display: block; min-width: 0; overflow-wrap: anywhere; }

.w-muted { color: var(--w-muted); font-size: 12px; line-height: 1.6; }
.w-section { padding: 18px 0; border-block-end: var(--dsh-control-border-width, 0.5px) solid var(--w-border); min-width: 0; }
.w-section > h3 { margin-block-end: 10px; }
.w-section > p + p { margin-block-start: 8px; }
.w-fields { display: grid; gap: 14px; min-width: 0; }
.w-field { display: grid; gap: 6px; min-width: 0; }
.w-field > input, .w-field > select, .w-field > textarea { width: 100%; }

.w-status {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 12px; margin: 8px 0;
  border: var(--dsh-control-border-width, 0.5px) solid var(--w-border);
  border-radius: var(--dsw-radius-sm, 8px);
  background: var(--w-bg); font-size: 12.5px; line-height: 1.5;
  overflow-wrap: anywhere; flex-shrink: 0;
}
.w-status > svg { flex-shrink: 0; margin-block-start: 2px; }
.w-status-text { min-width: 0; flex: 1; }
.w-status-error {
  background: var(--dsw-alias-interactive-bg-hover-danger, color-mix(in oklab, var(--dsw-alias-state-error-primary, #c83240) 10%, var(--w-canvas)));
  color: var(--dsw-alias-state-error-primary, #c83240);
}
.w-status-success { color: var(--dsw-alias-state-success-primary, #24794a); }
.w-status-warn {
  background: var(--dsw-alias-state-warn-tertiary, var(--w-soft));
  color: var(--dsw-alias-state-warn-label, var(--dsw-alias-state-warn-primary, #8a5a00));
}

.w-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; gap: 10px; width: 100%; max-width: 560px;
  padding: 40px 20px; margin: auto; min-height: 240px; overflow-wrap: anywhere;
}
.w-empty-icon { width: 44px; height: 44px; margin-block-end: 4px; }
.w-empty h2 { font-size: 16px; }
.w-empty .w-muted { font-size: 13px; max-width: 46ch; }
.w-empty .w-toolbar { justify-content: center; margin-block-start: 4px; }

.w-split {
  display: grid; grid-template-columns: minmax(240px, var(--w-list-width)) minmax(0, 1fr);
  min-height: 460px; flex: 1; min-width: 0;
}
.w-split.dsh-split-pane {
  display: flex;
}
.w-master { min-width: 0; border-inline-end: var(--dsh-control-border-width, 0.5px) solid var(--w-border); overflow: auto; padding-block-end: 20px; }
.w-split.dsh-split-pane > .w-master { border-inline-end: 0; }
.w-detail { min-width: 0; padding: 20px 22px; overflow: auto; overflow-wrap: anywhere; display: flex; flex-direction: column; }
.w-master-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 14px; }

.w-row {
  display: flex; gap: 0; min-width: 0; position: relative; align-items: stretch;
  border-block-end: var(--dsh-control-border-width, 0.5px) solid var(--w-border);
  border-inline-start: 3px solid transparent;
  border-radius: var(--dsw-radius-xs, 6px);
}
.w-row-select { display: flex; align-items: flex-start; padding: 16px 0 0 12px; }
.dshw .w-row-button {
  display: flex; flex-direction: column; align-items: stretch; gap: 4px;
  text-align: start; flex: 1 1 auto; padding: 13px 14px;
  border: 0; background: transparent; color: inherit; min-width: 0;
  cursor: pointer; line-height: 1.45;
}
.w-row-head { display: flex; align-items: flex-start; gap: 10px; justify-content: space-between; min-width: 0; }
.w-row-title-wrap { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.w-row-head strong { font-size: 14px; line-height: 1.45; font-weight: 600; overflow-wrap: anywhere; }
.w-row-meta, .w-row-description { color: var(--w-muted); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.w-row-description { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.w-selected { background: var(--w-selected); border-inline-start-color: var(--w-accent); }
.w-back { display: none !important; }

.w-dialog-modal { padding: 0 !important; border: 0 !important; background: transparent !important; }
.w-dialog {
  width: min(620px, 100%); max-height: min(85dvh, 100%);
  display: flex; flex-direction: column; min-height: 0;
  background: var(--dsw-alias-bg-overlay, var(--w-canvas));
  color: var(--w-text);
  border: var(--dsh-control-border-width, 0.5px) solid var(--w-border);
  border-radius: var(--dsw-radius-md, 12px);
  box-shadow: var(--dsw-elevation-prominent, 0 18px 50px rgba(15, 23, 42, 0.16));
  overflow: clip;
}
.w-dialog-header, .w-dialog-footer {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 14px 18px; background: var(--dsw-alias-bg-base, var(--w-canvas)); flex-shrink: 0;
}
.w-dialog-header { border-block-end: var(--dsh-control-border-width, 0.5px) solid var(--w-border); }
.w-dialog-header > h2 { font-size: 16px; line-height: 1.4; }
.w-dialog-body { overflow: auto; overscroll-behavior: contain; padding: 18px; min-height: 0; }
.w-dialog-footer { justify-content: flex-end; flex-wrap: wrap; border-block-start: var(--dsh-control-border-width, 0.5px) solid var(--w-border); }

.w-preview-empty {
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  text-align: center; gap: 10px; aspect-ratio: 16 / 9; min-height: 180px;
  background: var(--w-bg);
  border: var(--dsh-control-border-width, 1px) solid var(--w-border);
  border-radius: var(--dsw-radius-md, 12px);
  padding: 24px; color: var(--w-muted);
}

@container dsh-workbench (max-width: 1080px) {
  .dsh-header { flex-wrap: wrap; }
  .dsh-header-leading { flex-wrap: wrap; gap: 6px 10px; }
  .dsh-header .w-header-actions { flex-wrap: wrap; }
  .w-split { grid-template-columns: minmax(240px, 34%) minmax(0, 1fr); }
}

@container dsh-workbench (max-width: 760px) {
  .dsh-split-pane { flex-direction: column; overflow-y: auto; }
  .dsh-split-leading { width: 100% !important; max-width: 100%; flex: none; }
  .dsh-split-resizer { display: none; }
  .w-split { display: block; min-height: 360px; }
  .w-split[data-selected="false"] > .w-detail { display: none; }
  .w-split[data-selected="true"] > .w-master { display: none; }
  .w-master { border-inline-end: 0; }
  .w-detail { padding: 18px 0; }
  .w-back { display: inline-flex !important; align-self: flex-start; margin: 0 0 14px !important; }
  .w-dialog-header, .w-dialog-body, .w-dialog-footer { padding: 14px; }
}

@media (max-width: 700px) {
  .w-page[data-main="true"] > .w-body {
    padding-inline: 12px;
  }
  .w-page[data-main="true"] > .w-body > [data-plugin-update-footer] {
    width: calc(100% + 24px);
    margin-inline: -12px;
  }
  .w-dialog { width: 100%; }
}

/* 17. Interactive Spotlight + Directional Arrow Coachmark Tour */
.dshw .w-tour-trigger {
  font-weight: 600;
}

.w-tour-layer {
  --tour-accent: var(--dsw-alias-state-business-primary, #4176e6);
  --tour-bg: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-base, #ffffff));
  --tour-ink: var(--dsw-alias-label-primary, #1e293b);
  --tour-muted: var(--dsw-alias-label-secondary, #64748b);
  --tour-border: var(--dsw-alias-border-l2, #e2e8f0);
  --tour-radius: var(--dsw-radius-md, 12px);
  container-type: normal;
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  overflow: visible;
  pointer-events: none;
  z-index: 2147483000;
  color: var(--tour-ink);
  font-size: 13px;
  line-height: 1.55;
  font-family: var(--dsh-font-body, var(--dsw-font-family, var(--dsh-font-family-content, system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif)));
}

.w-tour-layer[popover]:is(:popover-open, .\\:popover-open) {
  display: block;
}

.w-tour-layer[data-dsh-style="pixel8bit"] {
  --tour-radius: 0px;
}

.w-tour-spotlight {
  position: fixed;
  pointer-events: none;
  border-radius: calc(var(--tour-radius) * 0.75 + 2px);
  box-shadow:
    0 0 0 2px var(--tour-accent),
    0 0 0 5px color-mix(in oklab, var(--tour-accent) 22%, transparent),
    0 0 0 9999px rgba(15, 23, 42, 0.26);
}

.w-tour-layer[data-dsh-style="pixel8bit"] .w-tour-spotlight {
  border-radius: 0px;
}

.w-tour-backdrop-fallback {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: rgba(15, 23, 42, 0.24);
}

.w-tour-card {
  position: fixed;
  inset: auto;
  margin: 0;
  width: min(328px, calc(100vw - 24px));
  max-block-size: calc(100dvh - 24px);
  padding: 13px 15px 12px;
  border: 1px solid var(--tour-border);
  border-radius: var(--tour-radius);
  background: var(--tour-bg);
  color: var(--tour-ink);
  box-shadow: var(--dsw-elevation-prominent, 0 16px 40px rgba(15, 23, 42, 0.18));
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.w-tour-layer[data-dsh-style="pixel8bit"] .w-tour-card {
  border: 2px solid #1e2826;
  border-radius: 0px;
  box-shadow: 4px 4px 0px #1e2826;
}

.w-tour-arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--tour-bg);
  transform: rotate(45deg);
  pointer-events: none;
}

.w-tour-card[data-side="bottom"] > .w-tour-arrow {
  top: -6px;
  left: calc(var(--arrow-x, 28px) - 5px);
  border-top: 1px solid var(--tour-border);
  border-left: 1px solid var(--tour-border);
}

.w-tour-card[data-side="top"] > .w-tour-arrow {
  bottom: -6px;
  left: calc(var(--arrow-x, 28px) - 5px);
  border-bottom: 1px solid var(--tour-border);
  border-right: 1px solid var(--tour-border);
}

.w-tour-card[data-side="right"] > .w-tour-arrow {
  left: -6px;
  top: calc(var(--arrow-y, 24px) - 5px);
  border-bottom: 1px solid var(--tour-border);
  border-left: 1px solid var(--tour-border);
}

.w-tour-card[data-side="left"] > .w-tour-arrow {
  right: -6px;
  top: calc(var(--arrow-y, 24px) - 5px);
  border-top: 1px solid var(--tour-border);
  border-right: 1px solid var(--tour-border);
}

.w-tour-card[data-side="center"] > .w-tour-arrow {
  display: none;
}

.w-tour-layer[data-dsh-style="pixel8bit"] .w-tour-card[data-side="bottom"] > .w-tour-arrow {
  top: -7px;
  border-top-width: 2px;
  border-left-width: 2px;
}

.w-tour-layer[data-dsh-style="pixel8bit"] .w-tour-card[data-side="top"] > .w-tour-arrow {
  bottom: -7px;
  border-bottom-width: 2px;
  border-right-width: 2px;
}

.w-tour-layer[data-dsh-style="pixel8bit"] .w-tour-card[data-side="right"] > .w-tour-arrow {
  left: -7px;
  border-bottom-width: 2px;
  border-left-width: 2px;
}

.w-tour-layer[data-dsh-style="pixel8bit"] .w-tour-card[data-side="left"] > .w-tour-arrow {
  right: -7px;
  border-top-width: 2px;
  border-right-width: 2px;
}

.w-tour-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.w-tour-step-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.w-tour-step-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  background: color-mix(in oklab, var(--tour-accent) 14%, transparent);
  color: var(--tour-accent);
}

.w-tour-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.w-tour-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--tour-border);
}

.w-tour-dot[data-active="true"] {
  width: 14px;
  background: var(--tour-accent);
}

.w-tour-layer[data-dsh-style="pixel8bit"] .w-tour-step-badge,
.w-tour-layer[data-dsh-style="pixel8bit"] .w-tour-dot {
  border-radius: 0px;
}

.w-tour-skip {
  min-block-size: 24px;
  min-inline-size: 24px;
  padding: 2px 6px;
  border: 0 !important;
  box-shadow: none !important;
  border-radius: var(--dsw-radius-xs, 6px);
  background: transparent;
  color: var(--tour-muted);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}

.w-tour-skip:hover {
  color: var(--tour-ink);
  background: var(--dsw-alias-interactive-bg-hover, rgba(15, 23, 42, 0.05));
}

.dshw .w-tour-title,
.w-tour-title {
  margin: 0;
  font-size: 14px;
  line-height: 1.38;
  font-weight: 650;
}

.dshw .w-tour-desc,
.w-tour-desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--tour-muted);
}

.w-tour-inline-action {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-block-start: 2px;
}

.w-tour-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-block-start: 2px;
  padding-block-start: 8px;
  border-block-start: 0.5px solid var(--tour-border);
}

.w-tour-nav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-inline-start: auto;
}

@media (pointer: coarse) {
  .w-tour-skip {
    min-block-size: 32px;
    padding: 4px 10px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .w-tour-spotlight {
    transition:
      top 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      left 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      width 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .w-tour-card {
    transition: top 0.22s cubic-bezier(0.22, 1, 0.36, 1), left 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .w-tour-dot {
    transition: width 0.18s ease, background-color 0.18s ease;
  }
}

/* 18. Accessibility: Reduced Motion & Forced Colors */
@media (prefers-reduced-motion: reduce) {
  .w-tour-spotlight,
  .w-tour-card,
  .w-tour-dot {
    transition: none !important;
  }
  :where([data-dsh-style]) :where(button, [role="button"], a.w-button, [data-dsh-card], .dsh-card, [data-dsh-row], .dsh-row, .dsh-row-actions, .dsh-tab-panel, [data-dsh-tab-panel]),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) :where(button, [role="button"], a.w-button) {
    translate: none !important;
    scale: none !important;
    animation: none !important;
    transition-property: background-color, border-color, color, opacity;
    transition-duration: 90ms;
  }
  :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"], summary, a.w-button) svg,
  [data-dsh-style="pixel8bit"] :where([data-dsh-row], .dsh-row)::before,
  [data-dsh-style="pixel8bit"] .dsh-pixel-cursor {
    animation: none !important;
    transition: none !important;
    translate: none !important;
    scale: none !important;
    rotate: none !important;
  }
  .dsh-tab-indicator {
    transition-property: opacity;
    transition-duration: 90ms;
  }
  .dsh-skeleton {
    animation: none !important;
    background-image: none;
  }
  :where([role="dialog"], [role="alertdialog"], dialog[open]):where([data-dsh-style], :has([data-dsh-style])) {
    scale: none !important;
    translate: none !important;
    transition-duration: 100ms;
  }
  .dshw .w-tab-panel,
  .dshw .ppt-inspector-panel:not([hidden]) {
    translate: none !important;
    transition: opacity 90ms linear;
  }
}

@media (forced-colors: active) {
  :where([data-dsh-style]) :where(button, input, select, textarea, [data-dsh-card], .dsh-card),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style], :has([data-dsh-style])) {
    border: 1px solid ButtonText;
  }
  :where([data-dsh-style]) [role="tab"][aria-selected="true"]::after {
    opacity: 1 !important;
    border-block-end: 3px solid Highlight;
  }
  .dsh-tab-indicator {
    background: transparent !important;
    border-block-end: 3px solid Highlight;
  }
  .dsh-split-resizer::before,
  .dsh-split-resizer::after {
    background: ButtonText;
  }
  .dsh-skeleton {
    border: 1px solid GrayText;
    background: Canvas;
  }
}
`;

  function Styles() { return h('style', null, styles); }

  return {
    Icon,
    Button,
    IconButton,
    Input,
    Checkbox,
    ChoiceMenu,
    StyleSwitcher,
    FontSwitcher,
    CoachmarkTour,
    computeTourLayout,
    Page,
    TabBar,
    Tabs,
    Status,
    Empty,
    Split,
    SplitResizer,
    DshSplitResizer: SplitResizer,
    Skeleton,
    DshSkeleton: Skeleton,
    Row,
    Search,
    Switch,
    Dialog,
    Styles,
    register,
    styles,
    DSH_STYLES,
    DSH_STYLE_STORAGE_KEY,
    DSH_STYLE_EVENT,
    DSH_DEFAULT_STYLE,
    normalizeDshStyle,
    getDshStylePreset,
    readDshStyle,
    writeDshStyle,
    subscribeDshStyle,
    useDshStyle,
    DSH_FONTS,
    DSH_FONT_STORAGE_KEY,
    DSH_FONT_EVENT,
    DSH_DEFAULT_FONT,
    normalizeDshFont,
    getDshFontPreset,
    readDshFont,
    writeDshFont,
    subscribeDshFont,
    useDshFont,
    syncPortaledOverlays,
    syncPortaledFont,
    useSlidingTabIndicator,
    useResizableSplit,
    createOverlaySyncRef,
    resolveHostPrimitives,
  };
}

// Editable browser entry. Build with node scripts/build-client.mjs.
// Browser source, distributed directly. tsc deliberately does not rewrite this file.
window.__ModuleLoader__.load(__stardustUpdatesWrap({ id: 'dsh-ppt', factory: require => {
        const React = require('react');
        const W = createWorkbenchUI(React, require);
function pptText(zh, en) { return languageOf() === 'en' ? en : zh; }

const PPT_QUICK_PROMPTS = Object.freeze([
  {
    id: 'quarterly',
    zhLabel: '季度经营复盘',
    enLabel: 'Quarterly review',
    zhPrompt: '请根据当前工作区材料制作季度经营复盘演示文稿，自动匹配明亮咨询风与 KPI/价值链箭头/瀑布图/甘特图，输出 HTML、可编辑 PPTX 与工程包。',
    enPrompt: 'Turn the workspace materials into an executive quarterly review deck with KPI cards, value-chain chevrons, waterfall bridge, and Gantt roadmap. Export HTML, editable PPTX, and project JSON.',
  },
  {
    id: 'absorb-corp',
    zhLabel: '吸收公司模板出稿',
    enLabel: 'Clone company .pptx',
    zhPrompt: '请先调用 ppt_absorb 吸收我的参考模板 ref.pptx 的色板、字体、Logo 与页面骨架（cloneStructure: true），再将这份汇报整理为同款风格的演示文稿。',
    enPrompt: 'Run ppt_absorb on ref.pptx to absorb its brand palette, fonts, logo, and slide skeleton (cloneStructure: true), then turn my notes into a matching presentation.',
  },
  {
    id: 'academic',
    zhLabel: '论文答辩与三线表',
    enLabel: 'Academic defense',
    zhPrompt: '请把这篇论文与实验结果整理为清澄学术风答辩 PPT，采用 Beamer 通栏页眉、无竖线学术三线表（booktabs）与方法流程图，结论先行。',
    enPrompt: 'Turn this paper and experimental data into an academic defense deck using Beamer chrome, booktabs 3-line tables, and methodology diagrams with action titles.',
  },
  {
    id: 'pitch',
    zhLabel: '创投融资简报',
    enLabel: 'Daylight pitch deck',
    zhPrompt: '请将这份商业计划整理为适合投资人屏幕阅读的硅谷创投明亮风 BP（venture-daylight），包含痛点对比、增长 KPI、TAM/SAM/SOM 同心圆与竞品哈维球矩阵。',
    enPrompt: 'Build a screen-friendly venture-daylight investor deck covering problem/solution, traction KPIs, concentric TAM/SAM/SOM sizing, and a Harvey-ball competitive matrix.',
  },
]);

function PptWorkflowGuide({ defaultOpen = false, onOpenCreate, onCopied }) {
  const [copiedId, setCopiedId] = React.useState('');
  function copyPrompt(item) {
    const text = languageOf() === 'en' ? item.enPrompt : item.zhPrompt;
    try {
      navigator.clipboard?.writeText(text).then(() => {
        setCopiedId(item.id);
        onCopied?.(pptText('已复制对话提示词，可直接粘贴到聊天框发送。', 'Prompt copied. Paste it into chat to generate.'));
        setTimeout(() => setCopiedId(prev => prev === item.id ? '' : prev), 2200);
      }).catch(() => {});
    } catch { /* ignore */ }
  }
  return h('details', { className: 'ppt-workflow-guide', open: defaultOpen || undefined },
    h('summary', null, pptText('使用流程指引与一句话提问模板（4 步快速交付）', 'How humans use this workbench · 4-step workflow & prompt templates')),
    h('div', { className: 'ppt-workflow-body' },
      h('ol', { className: 'ppt-workflow-steps' },
        h('li', null, h('strong', null, pptText('1. 起稿或导入翻新：', '1. Start or import: ')), pptText('点右上角「新建演示文稿」选 20 套蓝图 / 贴大纲出稿，或点击「导入 PPTX 翻新」一键把存量老旧 .pptx 变成高颜值可编辑工程。', 'Click New presentation for 20 blueprints or notes, or Import & Modernize .pptx to turn legacy slides into an editable deck.')),
        h('li', null, h('strong', null, pptText('2. 精修结构与公式：', '2. Shape slides & math: ')), pptText('点击画面文字直接定位输入框；在「内容编辑」一键切换 Bento、KPI、不等宽市场图、桑基图、SWOT、波特价值链、甘特图、架构图、哈维球与学术三线表，支持 LaTeX 原生公式。', 'Click slide text to focus its field; switch among Bento, KPI, Marimekko, Sankey, SWOT, Porter value chain, Gantt, architecture, Harvey balls, 3-line tables & native LaTeX math.')),
        h('li', null, h('strong', null, pptText('3. 换肤与 Office 导回：', '3. Restyle & Office sync: ')), pptText('在「风格与母版」一键套用名家范本、切换 24 套主题，或上传「Office 修改稿」把外部微调导回工作台更新（支持撤销）。', 'Apply 8 master presets, switch 24 themes, or sync an Office-edited .pptx back into this project with full undo support.')),
        h('li', null, h('strong', null, pptText('4. 演讲提词与交付：', '4. Present & deliver: ')), pptText('按需渲染并排核对真实 PPTX；HTML 放映按 P 开启双屏演讲者提词台（含 L 键激光笔），下载 panel 可导出「演讲讲义 (.md)」与分享成品包。', 'Inspect rendered PPTX side-by-side; press P in HTML playback for Dual-Screen Presenter View (with L laser pointer), and export Handout (.md) or Share ZIP.'))),
      h('div', { className: 'ppt-workflow-prompts' },
        h('span', { className: 'w-muted' }, pptText('复制对话指令：', 'Copy chat prompt:')),
        PPT_QUICK_PROMPTS.map(item => h(W.Button, {
          key: item.id,
          size: 'sm',
          icon: copiedId === item.id ? 'check' : 'copy',
          'data-copied': copiedId === item.id ? 'true' : undefined,
          onClick: () => copyPrompt(item),
        }, copiedId === item.id ? pptText('已复制', 'Copied') : pptText(item.zhLabel, item.enLabel))),
        onOpenCreate ? h(W.Button, { size: 'sm', variant: 'primary', icon: 'plus', onClick: onOpenCreate }, pptText('直接新建演示文稿', 'Create in workbench')) : null)));
}

function PptCreateDialog({ open, busy, initialMode = 'create', onClose, onCreate, onCreateDemo, onImport, onImportOffice, onError }) {
  const fieldId = React.useId();
  const [meta, setMeta] = React.useState({ themes: [], templates: [], exemplars: [] });
  const [dialogMode, setDialogMode] = React.useState(initialMode);
  const [title, setTitle] = React.useState('');
  const [template, setTemplate] = React.useState('');
  const [exemplar, setExemplar] = React.useState('');
  const [alignOrder, setAlignOrder] = React.useState(false);
  const [theme, setTheme] = React.useState('auto');
  const [content, setContent] = React.useState('');
  const [refFile, setRefFile] = React.useState(null);
  const [cloneStructure, setCloneStructure] = React.useState(true);
  const [importFile, setImportFile] = React.useState(null);
  const [officeFile, setOfficeFile] = React.useState(null);
  const [targetMinutes, setTargetMinutes] = React.useState('');
  const [preserveSourceTheme, setPreserveSourceTheme] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDialogMode(initialMode || 'create');
    let cancelled = false;
    action({ operation: 'catalog-meta', lang: languageOf() }).then(res => {
      if (!cancelled && res?.ok) {
        setMeta({
          themes: Array.isArray(res.themes) ? res.themes : [],
          templates: Array.isArray(res.templates) ? res.templates : [],
          exemplars: Array.isArray(res.exemplars) ? res.exemplars : [],
        });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [open, initialMode]);

  if (!open) return null;
  const disabled = busy || submitting;

  function fillSampleOutline() {
    if (!title.trim()) setTitle(pptText('Q4 核心业务进展与下阶段规划', 'Q4 Business Progress & Next-Quarter Plan'));
    setContent(languageOf() === 'en'
      ? '# Q4 Business Progress & Next-Quarter Plan\n\n## Headline Metrics Exceeded Targets\n- **Quarterly ARR**: $18.5M (+42% YoY)\n- **Net Dollar Retention**: 118% across enterprise cohorts\n- **Deployment Cycle**: Reduced from 14 days to 5 days\n\n## End-to-End Value Chain Efficiency\n- **Demand Intake**: Automated qualification raised hit-rate to 64%\n- **Agile Delivery**: Standardized templates cut rework by 50%\n- **Customer Expansion**: 38% of accounts adopted multi-seat plans\n\n## Key Bottlenecks & Mitigations\n- Onboarding backlog in mid-market: Ship self-serve import wizard in W2\n- Cross-team handoff delays: Enforce single-owner milestone gates'
      : '# Q4 核心业务进展与下阶段规划\n\n## 核心经营指标超额达成\n- **季度经常性收入**：突破 1.85 亿元（同比增长 +42%）\n- **净收入留存率 NRR**：提升至 118%，标杆续费率稳健\n- **平均交付周期**：由 14 天压缩至 5 天\n\n## 端到端业务价值链提效复盘\n- **需求准入**：分级筛选机制将有效立项率提升至 64%\n- **敏捷交付**：标准化母版与自动门禁减少 50% 返工\n- **规模增购**：38% 存量客户完成多模块扩购\n\n## 当前瓶颈与应对举措对比\n- 中腰部客户上手慢：下周上线一键导入向导与场景模板\n- 跨组联调周期长：建立单点责任人与双周里程碑卡点');
  }

  function handleRefSelect(file) {
    if (!file) { setRefFile(null); return; }
    if (!/\.pptx$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
      onError?.(pptText('请选择 24 MiB 以内的 .pptx 参考文件。', 'Choose a reference .pptx file up to 24 MiB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRefFile({ name: file.name, data: String(reader.result || '') });
    };
    reader.onerror = () => onError?.(pptText('无法读取参考 PPTX，请重试。', 'Could not read the reference PPTX.'));
    reader.readAsDataURL(file);
  }

  function handleImportSelect(file) {
    if (!file) { setImportFile(null); return; }
    if (!/\.pptx$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
      onError?.(pptText('请选择 24 MiB 以内的 .pptx 文件。', 'Choose a .pptx file up to 24 MiB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImportFile({ name: file.name, data: String(reader.result || '') });
    };
    reader.onerror = () => onError?.(pptText('无法读取 PPTX 文件，请重试。', 'Could not read the PPTX file.'));
    reader.readAsDataURL(file);
  }

  function handleOfficeSelect(file) {
    if (!file) { setOfficeFile(null); return; }
    if (!/\.(xlsx|csv|tsv|docx)$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
      onError?.(pptText('请选择 24 MiB 以内的 .xlsx、.csv、.tsv 或 .docx 文件。', 'Choose an .xlsx, .csv, .tsv, or .docx file up to 24 MiB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setOfficeFile({ name: file.name, data: String(reader.result || '') });
    };
    reader.onerror = () => onError?.(pptText('无法读取 Office 文档，请重试。', 'Could not read the Office document.'));
    reader.readAsDataURL(file);
  }

  async function submitOffice() {
    if (!officeFile?.data || !onImportOffice) return;
    setSubmitting(true);
    try {
      const mins = targetMinutes.trim() ? Number(targetMinutes.trim()) : undefined;
      await onImportOffice({
        fileName: officeFile.name,
        data: officeFile.data,
        theme: theme || 'auto',
        lang: languageOf(),
        ...(mins && Number.isFinite(mins) && mins >= 1 ? { targetMinutes: mins } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitImport() {
    if (!importFile?.data || !onImport) return;
    setSubmitting(true);
    try {
      await onImport({
        data: importFile.data,
        modernize: true,
        preserveSourceTheme,
        theme: preserveSourceTheme ? 'auto' : (theme || 'auto'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCreate() {
    const effectiveTitle = title.trim() || (template ? (meta.templates.find(tp => tp.id === template)?.name || template) : pptText('新建演示文稿', 'New Presentation'));
    setSubmitting(true);
    try {
      await onCreate({
        title: effectiveTitle,
        ...(template ? { template } : {}),
        ...(exemplar ? { exemplar } : {}),
        ...(exemplar && alignOrder ? { alignOrder: true } : {}),
        theme: theme || 'auto',
        lang: languageOf(),
        ...(content.trim() ? { content } : {}),
        ...(refFile?.data ? { referencePptxData: refFile.data, cloneStructure } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return h(W.Dialog, {
    className: 'pptw ppt-dialog',
    title: dialogMode === 'import'
      ? pptText('导入 PPTX 翻新', 'Import & Modernize .pptx')
      : dialogMode === 'office'
        ? pptText('导入 Excel / Word 文档', 'Import Excel / CSV / Word')
        : pptText('新建演示文稿', 'New presentation'),
    closeLabel: pptText('关闭', 'Close'),
    busy: disabled,
    onClose,
  },
    h('div', { className: 'ppt-create-wizard' },
      h('div', { className: 'ppt-archetype-pills', role: 'tablist', 'aria-label': pptText('创建方式', 'Creation mode') },
        h('button', { type: 'button', role: 'tab', className: 'ppt-pill', 'aria-selected': dialogMode === 'create' ? 'true' : 'false', 'aria-pressed': dialogMode === 'create' ? 'true' : 'false', disabled, onClick: () => setDialogMode('create') }, pptText('从蓝图 / 大纲新建', 'New from blueprint / notes')),
        onImportOffice ? h('button', { type: 'button', role: 'tab', className: 'ppt-pill', 'aria-selected': dialogMode === 'office' ? 'true' : 'false', 'aria-pressed': dialogMode === 'office' ? 'true' : 'false', disabled, onClick: () => setDialogMode('office') }, pptText('导入 Excel / Word', 'Import Excel / Word')) : null,
        onImport ? h('button', { type: 'button', role: 'tab', className: 'ppt-pill', 'aria-selected': dialogMode === 'import' ? 'true' : 'false', 'aria-pressed': dialogMode === 'import' ? 'true' : 'false', disabled, onClick: () => setDialogMode('import') }, pptText('导入 PPTX 翻新', 'Import & Modernize .pptx')) : null),
      dialogMode === 'office' ? h(React.Fragment, null,
        h('p', { className: 'muted' }, pptText('拖拽或上传 .xlsx / .csv / .tsv 数据表或 .docx 文档（≤24 MiB），自动识别流向、进度、市场份额与章节结构并生成多页演示文稿。', 'Drop or upload an .xlsx / .csv / .tsv workbook or .docx report (≤24 MiB) to auto-profile charts, Sankey, Gantt, tables, and narrative slides.')),
        h('div', {
          className: 'ppt-create-refbox',
          onDragOver: e => { e.preventDefault(); },
          onDrop: e => { e.preventDefault(); if (!disabled) handleOfficeSelect(e.dataTransfer?.files?.[0]); },
        },
          h('label', { htmlFor: fieldId + '-office-file' }, pptText('拖拽或选择 .xlsx / .csv / .tsv / .docx 文件（≤24 MiB）', 'Drop or choose .xlsx / .csv / .tsv / .docx (≤24 MiB)')),
          h('input', {
            id: fieldId + '-office-file',
            type: 'file',
            accept: '.xlsx,.csv,.tsv,.docx',
            disabled,
            onChange: e => { const f = e.target.files?.[0]; e.target.value = ''; handleOfficeSelect(f); },
          }),
          officeFile ? h('div', { className: 'ppt-create-refmeta' },
            h('span', { className: 'w-tag' }, officeFile.name),
            h(W.Button, { size: 'sm', variant: 'ghost', icon: 'close', disabled, onClick: () => setOfficeFile(null) }, pptText('移除文件', 'Clear'))) : null),
        h('div', { className: 'ppt-create-grid' },
          h('div', null,
            h('label', { htmlFor: fieldId + '-office-theme' }, pptText('视觉主题（24 套大师主题）', 'Visual theme (24 curated themes)')),
            h('select', { id: fieldId + '-office-theme', value: theme, disabled, onChange: e => setTheme(e.target.value) },
              h('option', { value: 'auto' }, pptText('自动导演智能匹配', 'Auto-Director match')),
              meta.themes.map(th => h('option', { key: th.id, value: th.id }, (th.name || th.id) + (th.dark ? pptText(' · 深色', ' · Dark') : pptText(' · 浅色', ' · Light')))))),
          h('div', null,
            h('label', { htmlFor: fieldId + '-office-mins' }, pptText('目标演讲时长（分钟，可选）', 'Target duration (min, optional)')),
            h(W.Input, { id: fieldId + '-office-mins', type: 'number', min: 1, max: 240, value: targetMinutes, disabled, placeholder: '10', onChange: e => setTargetMinutes(e.target.value) }))),
        h('div', { className: 'w-toolbar' },
          h(W.Button, { variant: 'primary', icon: 'upload', disabled: disabled || !officeFile?.data, onClick: submitOffice }, submitting ? pptText('正在剖析文档并生成工程…', 'Profiling & building deck…') : pptText('立即导入并生成演示文稿', 'Import & build presentation')),
          h(W.Button, { variant: 'ghost', disabled, onClick: onClose }, pptText('取消', 'Cancel'))))
      : dialogMode === 'import' ? h(React.Fragment, null,
        h('p', { className: 'muted' }, pptText('上传外部 .pptx（≤24 MiB），自动提取每页文字、表格、原生图表、图片与演讲备注并重排版为可编辑工程，同时生成演讲讲义（.handout.md）。', 'Upload an external .pptx (≤24 MiB) to extract slides, tables, live charts, images, and speaker notes into an editable dsh-ppt project with speaker handout (.handout.md).')),
        h('div', { className: 'ppt-create-refbox' },
          h('label', { htmlFor: fieldId + '-import-file' }, pptText('选择需要导入翻新的 .pptx 文件（≤24 MiB）', 'Choose a .pptx file to import & modernize (≤24 MiB)')),
          h('input', {
            id: fieldId + '-import-file',
            type: 'file',
            accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
            disabled,
            onChange: e => { const f = e.target.files?.[0]; e.target.value = ''; handleImportSelect(f); },
          }),
          importFile ? h('div', { className: 'ppt-create-refmeta' },
            h('span', { className: 'w-tag' }, importFile.name),
            h(W.Button, { size: 'sm', variant: 'ghost', icon: 'close', disabled, onClick: () => setImportFile(null) }, pptText('移除文件', 'Clear'))) : null),
        h('div', { className: 'ppt-create-grid' },
          h('div', null,
            h('label', { htmlFor: fieldId + '-import-mode' }, pptText('翻新视觉策略', 'Visual refurbishment mode')),
            h('select', {
              id: fieldId + '-import-mode',
              value: preserveSourceTheme ? 'preserve' : 'modernize',
              disabled,
              onChange: e => setPreserveSourceTheme(e.target.value === 'preserve'),
            },
              h('option', { value: 'modernize' }, pptText('自动焕新现代主题 (Auto-Modernize Theme)', 'Auto-Modernize Theme')),
              h('option', { value: 'preserve' }, pptText('保留原稿品牌配色 (Keep Original Brand Colors)', 'Keep Original Brand Colors')))),
          !preserveSourceTheme ? h('div', null,
            h('label', { htmlFor: fieldId + '-import-theme' }, pptText('目标主题（24 套大师主题）', 'Target theme (24 curated themes)')),
            h('select', { id: fieldId + '-import-theme', value: theme, disabled, onChange: e => setTheme(e.target.value) },
              h('option', { value: 'auto' }, pptText('自动导演智能匹配', 'Auto-Director match')),
              meta.themes.map(th => h('option', { key: th.id, value: th.id }, (th.name || th.id) + (th.dark ? pptText(' · 深色', ' · Dark') : pptText(' · 浅色', ' · Light')))))) : null),
        h('div', { className: 'w-toolbar' },
          h(W.Button, { variant: 'primary', icon: 'upload', disabled: disabled || !importFile?.data, onClick: submitImport }, submitting ? pptText('正在解析并翻新 PPTX…', 'Importing & modernizing…') : pptText('立即导入并生成工程', 'Import & modernize deck')),
          h(W.Button, { variant: 'ghost', disabled, onClick: onClose }, pptText('取消', 'Cancel'))))
      : h(React.Fragment, null,
      h('p', { className: 'muted' }, pptText('任选一种方式即可生成：选行业蓝图快速起稿、粘贴 Markdown/要点自动排布多版式，或上传公司 .pptx 一键复刻配色与页面骨架。', 'Start from an industry blueprint, paste rough Markdown notes for auto-layout choreography, or upload a reference .pptx to absorb its style and slide structure.')),
      h('label', { htmlFor: fieldId + '-title' }, pptText('演示文稿标题', 'Presentation title')),
      h(W.Input, {
        id: fieldId + '-title',
        value: title,
        disabled,
        maxLength: 200,
        placeholder: pptText('例如：2026 Q4 研发效能复盘与规划', 'e.g. Q4 Engineering Review & Roadmap'),
        onChange: e => setTitle(e.target.value),
      }),
      h('div', { className: 'ppt-create-grid' },
        h('div', null,
          h('label', { htmlFor: fieldId + '-exemplar' }, pptText('标杆范本契约（20 套精选含开源蒸馏 + 已吸收）', 'Gold Exemplar Contract (20 curated + absorbed)')),
          h('select', { id: fieldId + '-exemplar', value: exemplar, disabled, onChange: e => setExemplar(e.target.value) },
            h('option', { value: '' }, pptText('自动防退化升维（不限定单一范本）', 'Auto anti-slop upgrade (no fixed exemplar)')),
            h('option', { value: 'auto' }, pptText('智能路由匹配最佳标杆范本（Auto Exemplar）', 'Auto-match best Gold Exemplar (auto)')),
            meta.exemplars.map(ex => h('option', { key: ex.id, value: ex.id }, (languageOf() === 'en' ? (ex.enName || ex.name) : ex.name) + (ex.source === 'workspace' ? pptText(' · 已吸收', ' · Absorbed') : ex.source === 'github-curated' ? pptText(' · 开源蒸馏', ' · OSS') : '') + ' (' + (ex.slideCount || 0) + pptText('页)', 'p)')))),
          exemplar ? h(W.Checkbox, {
            checked: alignOrder,
            disabled,
            onChange: next => setAlignOrder(next),
            label: pptText('按标杆叙事弧线自动重排草稿页序', 'Auto-align draft slide order to exemplar narrative arc'),
          }) : null),
        h('div', null,
          h('label', { htmlFor: fieldId + '-tpl' }, pptText('行业场景蓝图（可选，20 套）', 'Scenario blueprint (optional, 20 built-in)')),
          h('select', { id: fieldId + '-tpl', value: template, disabled, onChange: e => setTemplate(e.target.value) },
            h('option', { value: '' }, pptText('不限蓝图（按大纲自动升维版式）', 'Auto-choreograph from outline')),
            meta.templates.map(tp => h('option', { key: tp.id, value: tp.id }, tp.name + ' (' + tp.id + ')'))))),
      h('div', null,
        h('label', { htmlFor: fieldId + '-theme' }, pptText('视觉主题（24 套大师主题）', 'Visual theme (24 curated themes)')),
        h('select', { id: fieldId + '-theme', value: theme, disabled, onChange: e => setTheme(e.target.value) },
          h('option', { value: 'auto' }, pptText('自动导演匹配（选范本时优先继承范本主题）', 'Auto-Director match (inherits exemplar theme)')),
          meta.themes.map(th => h('option', { key: th.id, value: th.id }, (th.name || th.id) + (th.dark ? pptText(' · 深色', ' · Dark') : pptText(' · 浅色', ' · Light')))))),
      h('div', { className: 'ppt-create-head-row' },
        h('label', { htmlFor: fieldId + '-content' }, pptText('汇报材料或 Markdown 大纲（可选，用 ## 分页、- 写要点）', 'Outline or Markdown notes (optional; use ## for slides, - for bullets)')),
        h(W.Button, { size: 'sm', variant: 'ghost', icon: 'sparkles', disabled, onClick: fillSampleOutline }, pptText('填入示例大纲', 'Fill sample outline'))),
      h('textarea', {
        id: fieldId + '-content',
        rows: 6,
        disabled,
        maxLength: 200000,
        value: content,
        placeholder: pptText('# 汇报标题\n\n## 核心结论句（自动识别指标升格 KPI 卡片）\n- **关键指标**：达成 118%\n\n## 痛点与对策对比\n- 原流程耗时高：上线自动化门禁缩短 50%', '# Deck Title\n\n## Action Title Slide\n- **Metric**: 118% net retention'),
        onChange: e => setContent(e.target.value),
      }),
      h('div', { className: 'ppt-create-refbox' },
        h('label', { htmlFor: fieldId + '-ref' }, pptText('可选：上传参考 .pptx 吸收配色、Logo 与版式骨架（≤24 MiB）', 'Optional: upload reference .pptx to absorb brand & slide skeleton (≤24 MiB)')),
        h('input', {
          id: fieldId + '-ref',
          type: 'file',
          accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
          disabled,
          onChange: e => { const f = e.target.files?.[0]; e.target.value = ''; handleRefSelect(f); },
        }),
        refFile ? h('div', { className: 'ppt-create-refmeta' },
          h('span', { className: 'w-tag' }, refFile.name),
          h(W.Checkbox, {
            checked: cloneStructure,
            disabled,
            onChange: next => setCloneStructure(next),
            label: pptText('同时复刻该 PPTX 的逐页版式序列与母版骨架', 'Also clone per-slide layout sequence & master skeleton'),
          }),
          h(W.Button, { size: 'sm', variant: 'ghost', icon: 'close', disabled, onClick: () => setRefFile(null) }, pptText('移除参考文件', 'Clear'))) : null),
      h('div', { className: 'w-toolbar' },
        h(W.Button, { variant: 'primary', icon: 'plus', disabled, onClick: submitCreate }, submitting ? pptText('正在生成三件套…', 'Generating HTML & PPTX…') : pptText('立即生成演示文稿', 'Create presentation')),
        onCreateDemo ? h(W.Button, { icon: 'sparkles', disabled, onClick: async () => { setSubmitting(true); try { await onCreateDemo(); } finally { setSubmitting(false); } } }, pptText('一键体验旗舰示例', 'Load Flagship Demo')) : null,
        h(W.Button, { variant: 'ghost', disabled, onClick: onClose }, pptText('取消', 'Cancel'))))));
}

function PptPages({ project, selected, busy, imagePending, onChoose, onMoveSlide, onReorderSlide, onDuplicate, onAppend, dirty, dataDirty }) {
  const railId = React.useId();
  const [newOpen, setNewOpen] = React.useState(false);
  const [archetype, setArchetype] = React.useState('cards');
  const [dragIdx, setDragIdx] = React.useState(-1);
  const [overIdx, setOverIdx] = React.useState(-1);
  const blocked = busy || dirty || imagePending || dataDirty || project.slides.length >= 120;
  const issues = project.quality?.issues || [];
  const newOptions = [
    ['cards', pptText('Bento / 支柱卡片页', 'Bento / pillar cards')],
    ['kpi', pptText('大数字指标 KPI 页', 'KPI metrics')],
    ['mockup', pptText('设备原型 / 产品界面页', 'Device mockup showcase')],
    ['code', pptText('语法高亮代码展示页', 'Syntax-highlighted code')],
    ['quadrant', pptText('魔力象限 / 战略气泡图', 'Magic Quadrant matrix')],
    ['radar', pptText('多维能力雷达图', 'Multi-series radar chart')],
    ['dumbbell', pptText('哑铃 / 前后跃迁对比图', 'Dumbbell slope chart')],
    ['heatmap', pptText('矩阵热力图', 'Matrix heatmap')],
    ['comparison', pptText('双栏 / 痛点对比页', 'Two-column comparison')],
    ['process', pptText('流程 / 时间轴页', 'Process / timeline')],
    ['chevron', pptText('价值链五边形箭头页', 'Value-chain chevrons')],
    ['value-chain', pptText('波特价值链', 'Porter value chain')],
    ['marimekko', pptText('不等宽市场图', 'Marimekko market map')],
    ['sankey', pptText('桑基流向图', 'Sankey flow diagram')],
    ['swot', pptText('SWOT 十字矩阵', 'SWOT matrix')],
    ['matrix', pptText('2×2 四象限矩阵页', '2×2 Matrix')],
    ['gantt', pptText('甘特图路线图页', 'Gantt roadmap')],
    ['architecture', pptText('分层系统架构图页', 'Architecture diagram')],
    ['harvey', pptText('哈维球竞品矩阵页', 'Harvey-ball matrix')],
    ['tam', pptText('TAM/SAM/SOM 同心圆页', 'TAM/SAM/SOM concentric')],
    ['org', pptText('组织架构 / 团队图谱页', 'Org chart / team')],
    ['mermaid', pptText('Mermaid 流程图 / 时序图', 'Mermaid flowchart / sequence')],
    ['table', pptText('咨询表 / 学术三线表', 'Table / 3-line booktabs')],
    ['callout', pptText('核心结论与行动清单', 'Key takeaways & callout')],
    ['bullets', pptText('精炼要点列表页', 'Concise bullets')],
    ['statement', pptText('单句核心观点页', 'Statement breather')],
    ['section', pptText('章节过渡页', 'Section divider')],
    ['agenda', pptText('汇报目录页', 'Agenda')],
    ['closing', pptText('结束与行动号召页', 'Closing & CTA')],
  ];
  return h('aside', { className: 'ppt-page-rail', 'aria-label': pptText('幻灯片目录', 'Slide outline') },
    h('h3', { 'data-dsh-serif': '' }, pptText('幻灯片', 'Slides')),
    h('div', { className: 'ppt-page-buttons' }, project.slides.map((row, index) => {
      const slideIssues = issues.filter(item => item.slide === index + 1 || (item.slideId && item.slideId === row.id));
      const severity = slideIssues.some(item => item.severity === 'error') ? 'error' : slideIssues.length ? 'warning' : '';
      const active = row.id === selected;
      const canDrag = !blocked && Boolean(onReorderSlide) && project.slides.length > 1;
      return h('div', {
        key: row.id,
        className: 'ppt-slide-row dsh-row',
        'data-dsh-row': '',
        'data-active': active ? 'true' : 'false',
        'data-selected': active ? 'true' : 'false',
        draggable: canDrag,
        'data-dragging': dragIdx === index ? 'true' : undefined,
        'data-drag-over': overIdx === index && dragIdx >= 0 && dragIdx !== index ? 'true' : undefined,
        title: canDrag ? pptText('拖拽可调整页面顺序', 'Drag to reorder slides') : undefined,
        onDragStart: e => {
          if (!canDrag) { e.preventDefault(); return; }
          setDragIdx(index);
          try {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(index));
          } catch {}
        },
        onDragOver: e => {
          if (!canDrag || dragIdx < 0) return;
          e.preventDefault();
          try { e.dataTransfer.dropEffect = 'move'; } catch {}
          if (overIdx !== index) setOverIdx(index);
        },
        onDragLeave: () => {
          if (overIdx === index) setOverIdx(-1);
        },
        onDrop: e => {
          e.preventDefault();
          const from = dragIdx;
          setDragIdx(-1);
          setOverIdx(-1);
          if (from >= 0 && from !== index && !blocked) onReorderSlide?.(from, index);
        },
        onDragEnd: () => {
          setDragIdx(-1);
          setOverIdx(-1);
        },
      },
        h('button', {
          type: 'button',
          className: 'ppt-slide-card',
          'data-dsh-card': '',
          'aria-current': active ? 'true' : undefined,
          disabled: busy || imagePending,
          onClick: () => onChoose(row),
        },
          h('span', { className: 'dsh-pixel-cursor', 'aria-hidden': 'true' }, '▶'),
          h('span', { className: 'ppt-page-number' }, String(index + 1).padStart(2, '0')),
          h('span', { className: 'ppt-page-body' },
            h('span', { className: 'ppt-page-title-line' },
              h('span', { className: 'ppt-page-label', 'data-dsh-serif': '' }, row.title || t('未命名页')),
              severity ? h('span', {
                className: 'ppt-page-dot',
                'data-severity': severity,
                title: slideIssues.map(it => languageOf() === 'en' ? (it.messageEn || it.message) : it.message).join(' · '),
                'aria-label': severity === 'error' ? pptText('有待修复错误', 'Has error') : pptText('有排版提醒', 'Has warning'),
              }) : null),
            h('span', { className: 'w-tag ppt-page-layout-tag' }, typeof pptLayoutLabel === 'function' ? pptLayoutLabel(row.layout) : (row.layout || 'bullets')))),
        onMoveSlide ? h('div', { className: 'dsh-row-actions ppt-slide-actions', 'data-window-drag-exclude': '' },
          h(W.IconButton, { icon: 'up', label: t('上移'), disabled: blocked || index === 0, onClick: () => onMoveSlide(index, -1) }),
          h(W.IconButton, { icon: 'down', label: t('下移'), disabled: blocked || index === project.slides.length - 1, onClick: () => onMoveSlide(index, 1) })) : null);
    })),
    h('div', { className: 'ppt-rail-actions' },
      newOpen && onAppend ? h('div', { className: 'ppt-add-slide-box', 'data-dsh-card': '' },
        h('label', { htmlFor: railId + '-archetype' }, pptText('选择新增页面版式', 'Choose new slide archetype')),
        h('select', { id: railId + '-archetype', value: archetype, disabled: blocked, onChange: e => setArchetype(e.target.value) },
          newOptions.map(([id, label]) => h('option', { key: id, value: id }, label))),
        h('div', { className: 'w-toolbar' },
          h(W.Button, { variant: 'primary', icon: 'plus', disabled: blocked, onClick: () => { setNewOpen(false); onAppend(archetype); } }, pptText('确认新增', 'Add slide')),
          h(W.Button, { variant: 'ghost', icon: 'close', disabled: busy, onClick: () => setNewOpen(false) }, pptText('收起', 'Cancel'))))
      : onAppend ? h(W.Button, { icon: 'plus', className: 'ppt-add-slide', disabled: blocked, onClick: () => setNewOpen(true) }, pptText('新建页面', 'New slide')) : null,
      h(W.Button, { icon: 'copy', className: 'ppt-duplicate', disabled: blocked, onClick: onDuplicate }, t('复制本页'))));
}

const PPT_WORKBENCH_CSS = `
.ppt-workbench.pptw{--fg:var(--w-text);--fg-muted:var(--w-muted);--bg:var(--w-canvas);--bg-surface:var(--w-bg);--border:var(--w-border);max-width:none;margin:0}
.ppt-workbench .ppt-loading-skeleton{display:flex;flex-direction:column;gap:12px;max-width:900px;padding:18px 0}
.ppt-workbench.ppt-in-project .dsh-header{gap:8px;padding-inline:10px}
.ppt-workbench.ppt-in-project .dsh-header-leading{gap:6px}
.ppt-workbench.ppt-in-project .dsh-header-title{max-width:104px;overflow:hidden;text-overflow:ellipsis}
.ppt-workbench.ppt-in-project .w-tabs>button{padding:4px 7px;font-size:12px;gap:4px}
.ppt-workbench.ppt-in-project .w-header-actions{gap:4px}
.ppt-workbench.ppt-in-project .w-header-actions .w-button:not(.w-icon-button){padding:4px 8px;font-size:12px;gap:4px}
.ppt-workbench .ppt-header-meta{font-variant-numeric:tabular-nums;font-weight:600}
.ppt-workbench .ppt-editor{--ppt-rail-width:204px;--ppt-inspector:360px;display:flex;align-items:stretch;flex:1 1 auto;min-height:480px;min-width:0}
.ppt-workbench .ppt-page-rail{flex:none;width:var(--ppt-rail-width,204px);padding:14px 10px 14px 0;min-width:0;display:flex;flex-direction:column;gap:12px}
.ppt-workbench .ppt-page-rail h3{margin:0;font-size:14px;color:var(--w-muted);font-weight:600}
.ppt-workbench .ppt-page-buttons{display:flex;flex-direction:column;gap:6px;max-height:calc(100dvh - 280px);overflow:auto;overscroll-behavior:contain;min-width:0;padding:2px}
.ppt-workbench .ppt-slide-row{display:flex;align-items:stretch;gap:4px;border-block-end:0;border-inline-start:0;padding:0;min-width:0;position:relative}
.ppt-workbench .ppt-slide-row[draggable=true]{cursor:grab}
.ppt-workbench .ppt-slide-row[data-dragging=true]{opacity:.45}
.ppt-workbench .ppt-slide-row[data-drag-over=true]{box-shadow:0 -2px 0 0 var(--w-accent);border-radius:var(--dsw-radius-sm,8px)}
.ppt-workbench .ppt-slide-card{flex:1 1 auto;border:var(--dsh-control-border-width,1px) solid transparent;border-inline-start:3px solid transparent;border-radius:var(--dsw-radius-sm,8px);padding:9px 10px;display:flex;align-items:flex-start;gap:8px;background:var(--dsw-alias-settings-card-fill,var(--w-canvas));min-width:0;font-size:13px;line-height:1.45;text-align:start;overflow-wrap:anywhere;cursor:pointer}
.ppt-workbench .ppt-slide-card:hover:not(:disabled){background:var(--dsh-surface-spotlight,var(--w-bg));border-color:var(--w-border)}
.ppt-workbench .ppt-slide-card[aria-current=true]{border-color:var(--w-border);border-inline-start-color:var(--w-accent);background:var(--w-selected);color:var(--w-text);font-weight:550}
.ppt-workbench .ppt-slide-actions{padding-inline-end:2px;gap:2px}
.ppt-workbench .ppt-slide-actions .w-icon-button{width:24px;min-width:24px;min-height:24px;padding:0}
.ppt-workbench .ppt-page-number{font-variant-numeric:tabular-nums;color:var(--w-muted);font-size:11.5px;font-weight:600;flex-shrink:0;padding-top:1px}
.ppt-workbench .ppt-slide-card[aria-current=true] .ppt-page-number{color:var(--w-accent)}
.ppt-workbench .ppt-page-body{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.ppt-workbench .ppt-page-title-line{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0}
.ppt-workbench .ppt-page-layout-tag{align-self:flex-start;font-size:11px;padding:0 6px}
.ppt-workbench .ppt-page-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--dsw-alias-state-warn-primary)}
.ppt-workbench .ppt-page-dot[data-severity=error]{background:var(--dsw-alias-state-error-primary)}
.ppt-workbench .ppt-rail-actions{margin-top:auto;display:flex;flex-direction:column;gap:8px}
.ppt-workbench .ppt-rail-actions .w-button{width:100%;justify-content:flex-start;font-size:13px}
.ppt-workbench .ppt-add-slide-box{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);padding:10px;background:var(--dsw-alias-settings-card-fill,var(--w-canvas));display:flex;flex-direction:column;gap:8px}
.ppt-workbench .ppt-add-slide-box label{font-size:12px;color:var(--w-muted);margin:0;display:grid;gap:6px}
.ppt-workbench .ppt-duplicate{font-size:13px}
.ppt-workbench .ppt-canvas-region{flex:1 1 auto;display:flex;flex-direction:column;gap:14px;padding:16px 18px;margin:8px 0;border-radius:var(--dsw-radius-md,10px);background:var(--w-bg);min-width:0}
.ppt-workbench .ppt-preview-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ppt-workbench .ppt-preview-tools .w-button{font-size:12.5px;min-height:30px;padding:5px 10px}
.ppt-workbench .ppt-preview-tools [aria-pressed=true]{background:var(--w-selected);border-color:var(--w-accent);color:var(--w-accent);font-weight:600}
.ppt-workbench .ppt-preview-tools .w-icon-button{margin-inline-start:auto}
.ppt-workbench .preview{width:100%;aspect-ratio:16/9;border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);background:var(--w-soft,#f0f4fa);box-shadow:var(--dsw-elevation-panel,0 6px 20px rgba(15,23,42,0.06));overflow:clip;min-height:0;margin:auto 0;position:relative;display:flex;align-items:center;justify-content:center}
.ppt-workbench .ppt-split-preview,.ppt-workbench .ppt-canvas-visual-diff{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}
.ppt-workbench .ppt-split-pane{display:flex;flex-direction:column;gap:6px;min-width:0}
.ppt-workbench .ppt-split-pane figcaption{font-size:12px;font-weight:600;color:var(--w-muted)}
.ppt-workbench .ppt-canvas-diff-card{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);padding:14px;background:var(--dsw-alias-settings-card-fill,var(--w-canvas));display:flex;flex-direction:column;gap:10px}
.ppt-workbench .ppt-canvas-diff-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.ppt-workbench .ppt-issue-list{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.ppt-workbench .ppt-issue-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:8px 10px;border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);background:var(--w-bg)}
.ppt-workbench .ppt-issue-row p{margin:0;font-size:12.5px;line-height:1.55}
.ppt-workbench .ppt-issue-jump{flex-shrink:0;font-size:12px;min-height:28px;padding:3px 9px}
.ppt-workbench .preview>.ppt-fullscreen-exit{display:none}
.ppt-workbench .preview:fullscreen>.ppt-fullscreen-exit{display:inline-flex;position:absolute;inset:16px 16px auto auto;z-index:10;background:var(--w-primary);color:var(--w-on-primary);border:1px solid var(--w-border)}
.ppt-workbench .preview:fullscreen{width:100dvw;height:100dvh;aspect-ratio:auto;border:0;border-radius:0;margin:0;background:var(--dsw-alias-bg-document-preview,#1f232b);box-shadow:none}
.ppt-workbench .preview:fullscreen iframe{background:var(--dsw-alias-bg-document-preview,#1f232b)}
.ppt-workbench .preview .render-page{width:100%;height:100%;object-fit:contain}
.ppt-workbench .ppt-preview-help{font-size:12px;color:var(--w-muted);line-height:1.65}
.ppt-workbench .ppt-preview-help+details{background:var(--dsw-alias-settings-card-fill,var(--w-canvas));border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);padding:12px 14px}
.ppt-workbench .ppt-preview-help+details summary{font-size:12.5px}
.ppt-workbench .ppt-inspector{flex:none;width:var(--ppt-inspector,360px);padding:14px 0 14px 12px;min-width:0;overflow:auto;overscroll-behavior:contain;overflow-wrap:anywhere}
.ppt-workbench .ppt-inspector-panel[hidden]{display:none!important}
.ppt-workbench .ppt-inspector .card{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);padding:16px;margin:0 0 16px;background:var(--dsw-alias-settings-card-fill,var(--w-canvas));box-shadow:var(--dsh-card-shadow,none)}
.ppt-workbench .ppt-inspector h3{font-size:15.5px;margin:0 0 14px}
.ppt-workbench .ppt-inspector .card>div>label,.ppt-workbench .ppt-inspector .card>label{font-size:12.5px;margin:14px 0 5px;color:var(--w-muted)}
.ppt-workbench .ppt-inspector input,.ppt-workbench .ppt-inspector textarea,.ppt-workbench .ppt-inspector select{font-size:13.5px}
.ppt-workbench .ppt-inspector textarea{min-height:72px}
.ppt-workbench .ppt-inspector .tools{gap:8px;margin-top:16px}
.ppt-workbench .ppt-inspector .tools button{font-size:12.5px;min-height:32px;padding:6px 10px}
.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:1fr}
.ppt-workbench .ppt-inspector .before-after,.ppt-workbench .ppt-inspector .data-before-after{grid-template-columns:1fr}
.ppt-workbench .ppt-inspector .coaching{margin-top:0}
.ppt-workbench .ppt-inspector .coaching p,.ppt-workbench .ppt-inspector .data-workbench p{font-size:13px;line-height:1.65}
.ppt-workbench .ppt-inspector .coaching blockquote{margin:10px 0;padding-inline-start:12px}
.ppt-workbench .ppt-inspector .muted{font-size:12px;color:var(--w-muted)}
.ppt-workbench .ppt-inspector .data-workbench .data-controls{grid-template-columns:1fr}
.ppt-workbench .ppt-structure{border-top:var(--dsh-control-border-width,0.5px) solid var(--w-border);padding-top:14px;margin-top:14px}
.ppt-workbench .ppt-structure .w-button{font-size:12.5px}
.ppt-workbench.pptw button.primary,:is(.ppt-workbench,.ppt-dialog) button.primary{background:var(--w-primary);color:var(--w-on-primary);border-color:var(--w-primary)}
.ppt-workbench .ppt-library{max-width:1000px;padding:12px 0 24px}
.ppt-workbench .ppt-library .w-row-button{padding:14px 16px;border:0;border-radius:0;background:transparent}
.ppt-workbench .ppt-workflow-guide{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-md,10px);background:var(--w-bg);padding:10px 14px;margin:8px 0 14px}
.ppt-workbench .ppt-workflow-guide>summary{cursor:pointer;font-size:13px;font-weight:600;color:var(--w-text);list-style:none;display:flex;align-items:center;gap:8px}
.ppt-workbench .ppt-workflow-guide>summary::-webkit-details-marker{display:none}
.ppt-workbench .ppt-workflow-guide>summary::before{content:"▸";content:"▸" / "";color:var(--w-accent);font-size:12px}
@media(prefers-reduced-motion:no-preference){.ppt-workbench .ppt-workflow-guide>summary::before{transition:rotate .16s ease}}
.ppt-workbench .ppt-workflow-guide[open]>summary::before{rotate:90deg}
.ppt-workbench dialog:modal,.ppt-dialog:modal{overscroll-behavior:contain}
.ppt-workbench dialog::backdrop,.ppt-dialog::backdrop{overflow:hidden;overscroll-behavior:contain}
.ppt-workbench .ppt-workflow-body{margin-top:10px;padding-top:10px;border-top:var(--dsh-control-border-width,0.5px) solid var(--w-border);display:flex;flex-direction:column;gap:10px}
.ppt-workbench .ppt-workflow-steps{margin:0;padding-inline-start:18px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;font-size:12.5px;line-height:1.55;color:var(--w-muted)}
.ppt-workbench .ppt-workflow-steps strong{color:var(--w-text)}
.ppt-workbench .ppt-workflow-prompts{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
:is(.ppt-workbench,.ppt-dialog) .ppt-create-wizard{display:flex;flex-direction:column;gap:10px}
:is(.ppt-workbench,.ppt-dialog) .ppt-create-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
:is(.ppt-workbench,.ppt-dialog) .ppt-create-head-row{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
:is(.ppt-workbench,.ppt-dialog) .ppt-create-refbox{border:1px dashed var(--w-border);border-radius:var(--dsw-radius-sm,8px);padding:10px 12px;background:var(--w-soft);display:flex;flex-direction:column;gap:8px}
:is(.ppt-workbench,.ppt-dialog) .ppt-create-refmeta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
@media(max-width:680px){.ppt-workbench .ppt-workflow-steps,:is(.ppt-workbench,.ppt-dialog) .ppt-create-grid{grid-template-columns:1fr}}
:is(.ppt-workbench,.ppt-dialog) .notice{border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);background:var(--w-bg);color:var(--w-text)}
:is(.ppt-workbench,.ppt-dialog) .notice.error{color:var(--dsw-alias-state-error-primary,#ad3636);background:var(--dsw-alias-interactive-bg-hover-danger,var(--w-bg))}
.ppt-workbench .ppt-data-warning{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
:is(.ppt-workbench,.ppt-dialog) .ppt-downloads{display:flex;flex-direction:column;gap:14px}
:is(.ppt-workbench,.ppt-dialog) .ppt-downloads .tools{display:flex;flex-direction:column;align-items:stretch;gap:8px}
:is(.ppt-workbench,.ppt-dialog) .ppt-downloads .w-button,:is(.ppt-workbench,.ppt-dialog) .ppt-downloads button{font-size:13.5px;min-height:36px;justify-content:flex-start}
.ppt-workbench .ppt-image-section{border-block:var(--dsh-control-border-width,0.5px) solid var(--w-border);margin:16px 0;padding:14px 0}
.ppt-workbench .ppt-image-section>summary{font-size:13.5px}
.ppt-workbench .ppt-image-section input,.ppt-workbench .ppt-image-section select{width:100%;margin-bottom:12px}
.ppt-workbench .ppt-image-section input[type=file]{font-size:12px}
.ppt-workbench :focus-visible{outline:2px solid var(--w-accent);outline-offset:2px}
.ppt-workbench .w-dialog,.ppt-dialog.w-dialog{max-width:680px}
.ppt-workbench .ppt-inspector .image-preview{max-height:180px;object-fit:contain;background:var(--w-soft)}
@container dsh-workbench (max-width:1100px){.ppt-workbench .ppt-editor{flex-wrap:wrap}.ppt-workbench .ppt-page-rail{width:var(--ppt-rail-width,180px)}.ppt-workbench .ppt-canvas-region{flex:1 1 320px}.ppt-workbench .ppt-split-resizer-right{display:none}.ppt-workbench .ppt-inspector{width:100%;border-top:var(--dsh-control-border-width,0.5px) solid var(--w-border);padding:16px 0}.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ppt-workbench .ppt-page-buttons{max-height:400px}.ppt-workbench .ppt-split-preview,.ppt-workbench .ppt-canvas-visual-diff{grid-template-columns:1fr}}
@container dsh-workbench (max-width:760px){.ppt-workbench .ppt-editor{flex-direction:column;min-height:0}.ppt-workbench .ppt-split-resizer{display:none}.ppt-workbench .ppt-page-rail{width:100%;border-bottom:var(--dsh-control-border-width,0.5px) solid var(--w-border);padding:12px 0}.ppt-workbench .ppt-page-buttons{display:flex;flex-direction:row;max-height:150px;overflow:auto;gap:8px}.ppt-workbench .ppt-slide-row{min-width:165px;max-width:220px;flex-shrink:0}.ppt-workbench .ppt-rail-actions{flex-direction:row;flex-wrap:wrap}.ppt-workbench .ppt-rail-actions .w-button{width:auto}.ppt-workbench .ppt-canvas-region{padding:14px 0;background:var(--w-canvas);margin:0}.ppt-workbench .preview{margin:0;min-height:0}.ppt-workbench .ppt-preview-tools .w-icon-button{margin-inline-start:0}.ppt-workbench .ppt-inspector .coaching-grid{grid-template-columns:1fr}.ppt-workbench .ppt-preview-tools .w-button{font-size:12px}.ppt-workbench .ppt-inspector{width:100%;padding:16px 0}}
`;

// Per-view preferences stay in this plugin instance; user files are never changed.
const projectLibraryPreferences = new Map();
function ProjectLibrary({ items, scope = 'projects', language = 'zh', searchText, updatedAt, renderItem, t, searchHint }) {
  const saved = projectLibraryPreferences.get(scope);
  const [query, setQuery] = React.useState(saved?.query || '');
  const [order, setOrder] = React.useState(saved?.order || 'updated');
  const controlId = React.useId();
  const normalize = text => String(text ?? '').normalize('NFKC').toLocaleLowerCase(language);
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const collator = new Intl.Collator(language, { numeric: true, sensitivity: 'base' });
  const timestamp = row => { const value = Date.parse(updatedAt(row)); return Number.isFinite(value) ? value : 0; };
  const visible = items.filter(row => words.every(word => normalize(searchText(row)).includes(word))).sort((a, b) => {
    const tie = collator.compare(String(a.title || ''), String(b.title || '')) || String(a.id).localeCompare(String(b.id));
    return order === 'title' ? tie : (order === 'oldest' ? timestamp(a) - timestamp(b) : timestamp(b) - timestamp(a)) || tie;
  });
  function change(nextQuery, nextOrder) {
    projectLibraryPreferences.set(scope, { query: nextQuery, order: nextOrder });
    setQuery(nextQuery); setOrder(nextOrder);
  }
  return h('section', { className: 'project-library', 'aria-label': t('工程查找', 'Find projects') },
    h('style', null, PROJECT_LIBRARY_CSS),
    h('div', { className: 'project-library-controls' },
      h('label', { htmlFor: controlId + '-query' }, t('搜索工程', 'Search projects'),
        h(W.Input, { id: controlId + '-query', icon: 'search', type: 'search', value: query, placeholder: searchHint, maxLength: 200,
          onChange: e => change(e.target.value, order), onKeyDown: e => { if (e.key === 'Escape' && query) { e.preventDefault(); e.stopPropagation(); change('', order); } } })),
      h('label', { htmlFor: controlId + '-order' }, t('排序', 'Sort by'),
        h('select', { id: controlId + '-order', value: order, onChange: e => change(query, e.target.value) },
          h('option', { value: 'updated' }, t('最近更新', 'Recently updated')),
          h('option', { value: 'oldest' }, t('最早更新', 'Oldest updated')),
          h('option', { value: 'title' }, t('标题', 'Title')))),
      query ? h(W.Button, { variant: 'ghost', icon: 'close', onClick: () => change('', order) }, t('清空搜索', 'Clear search')) : null),
    h('p', { className: 'w-muted project-library-count', role: 'status', 'aria-live': 'polite' },
      t('显示 ', 'Showing ') + visible.length + ' / ' + items.length + t(' 个工程', ' projects')),
    visible.length ? h('div', { className: 'project-library-list' }, visible.map(renderItem)) : h(W.Empty, { title: t('没有匹配的工程', 'No matching projects'), icon: 'folder' },
      t('换个关键词，或清空搜索查看全部工程。', 'Try another keyword or clear the search to show all projects.')));
}
const PROJECT_LIBRARY_CSS = `.project-library{min-width:0}.project-library-controls{display:flex;gap:12px;align-items:end;flex-wrap:wrap;padding:12px 0}.project-library-controls>label{display:grid;gap:6px;margin:0!important;min-width:0;color:var(--w-muted);font-size:12.5px}.project-library-controls>label:first-child{flex:1 1 240px}.project-library-controls>label:nth-child(2){flex:0 1 180px}.project-library-controls select{width:100%;min-width:0;min-height:34px;font:inherit;color:var(--w-text);background:var(--dsw-alias-bg-base,var(--w-canvas));border:var(--dsh-control-border-width,1px) solid var(--w-border);border-radius:var(--dsw-radius-sm,8px);padding:6px 10px}.project-library-list{display:flex;flex-direction:column;gap:6px}.project-library-count{margin:4px 0 12px;font-size:12px}.project-library-controls :focus-visible{outline:2px solid var(--w-accent);outline-offset:2px}@media(max-width:520px){.project-library-controls>label:first-child{flex-basis:100%}.project-library-controls>label:nth-child(2){flex:1 1 160px}}`;

// Style Studio, Slide Archetype Switcher, and Structured Content Editors.
// Uses only host/workbench CSS tokens (--w-*, --dsw-alias-*); palette swatches use inline style objects.

const PPT_CHROME_SKELETONS = Object.freeze([
  { id: 'consulting-classic', zh: '麦肯锡直角', en: 'Consulting Classic', descZh: '0px 直角卡片 + 左强调竖线 + 右上章节标', descEn: '0px sharp cards, left accent rule & section pill' },
  { id: 'keynote-spatial', zh: 'Apple 空间留白', en: 'Keynote Spatial', descZh: '无顶部分隔线 + 16pt 留白无边框浮卡', descEn: 'Divider-free airy canvas with 16pt borderless cards' },
  { id: 'editorial-folio', zh: '杂志社论书脊', en: 'Editorial Folio', descZh: '顶栏刊号 + 右上页码 + 衬线大序号', descEn: 'Top running folio, top-right page number & display numerals' },
  { id: 'saas-bento', zh: '黑曜石 Bento', en: 'SaaS Bento', descZh: '10pt 圆角描边网格 + 等宽标签', descEn: '10pt rounded hairline grid & monospace pills' },
  { id: 'academic-minimal', zh: '学术顶栏横幅', en: 'Academic Beamer', descZh: 'Beamer 通栏色带页眉 + 三段学术底栏', descEn: 'Full-width Beamer header band & 3-zone footer' },
  { id: 'gov-ceremonial', zh: '东方政务双线', en: 'Gov Ceremonial', descZh: '双线页眉 + 方括章节标签 + 对称卡片', descEn: 'Double-rule header, bracketed tag & symmetric cards' },
]);

function pptChromeLabel(id) {
  const found = PPT_CHROME_SKELETONS.find(item => item.id === id);
  if (!found) return id || '';
  return languageOf() === 'en' ? found.en : found.zh;
}

const PPT_LAYOUT_CATALOG = Object.freeze([
  { id: 'cover', zh: '封面', en: 'Cover', group: 'framing', variants: [['default', '标准', 'Standard'], ['keynote-glow', '发布会光晕', 'Keynote glow'], ['editorial-grid', '瑞士网格杂志', 'Editorial grid'], ['architectural', '建筑感非对称', 'Architectural'], ['split-bleed', '满版分屏', 'Split bleed'], ['monolith', '色块横幅', 'Monolith'], ['inverted', '深底反白', 'Inverted']] },
  { id: 'agenda', zh: '目录议程', en: 'Agenda', group: 'framing', variants: [['list', '列表目录', 'List'], ['cards', '卡片目录', 'Cards']] },
  { id: 'section', zh: '章节过渡', en: 'Section', group: 'framing', variants: [['agenda', '实时议程进度', 'Live agenda'], ['minimal', '极简章节', 'Minimal'], ['number-hero', '大数字序号', 'Number hero'], ['inverted', '深色反白', 'Inverted']] },
  { id: 'bullets', zh: '核心要点', en: 'Bullets', group: 'structured', quick: true, variants: [['clean', '清爽列表', 'Clean'], ['accent-rail', '强调竖线', 'Accent rail'], ['ruled', '分割细线', 'Ruled'], ['two-column', '双栏要点', 'Two-column']] },
  { id: 'cards', zh: 'Bento / 支柱卡', en: 'Cards & Bento', group: 'structured', quick: true, variants: [['pillars', '并列支柱卡', 'Pillars'], ['frameless', '无框通透列', 'Frameless'], ['bento-hero', '反白主卡 Bento', 'Bento hero'], ['bento', 'Bento 网格', 'Bento grid'], ['exec-summary', '结论+三支柱', 'Exec summary'], ['numbered', '编号卡片', 'Numbered']] },
  { id: 'kpi', zh: '大数字指标 KPI', en: 'KPI metrics', group: 'structured', quick: true, variants: [['spotlight', '主次聚光灯', 'Spotlight'], ['frameless', '无框大数字', 'Frameless'], ['grid', '指标矩阵', 'Grid'], ['hero-left', '主指标左置', 'Hero left'], ['banner', '通栏指标', 'Banner']] },
  { id: 'comparison', zh: '双栏 / 痛点对比', en: 'Comparison', group: 'structured', quick: true, variants: [['versus', 'A/B 对比', 'Versus'], ['before-after', '前后对比', 'Before / after'], ['do-dont', '推荐 vs 避免', 'Do / don’t'], ['issue-action', '痛点 → 举措', 'Issue → action']] },
  { id: 'process', zh: '流程 / 价值链 / 飞轮', en: 'Process & value chain', group: 'structured', quick: true, variants: [['steps', '推进步骤', 'Steps'], ['chevron', '价值链箭头', 'Value-chain chevrons'], ['timeline', '里程碑时间轴', 'Timeline'], ['layers', '架构分层', 'Layers'], ['funnel', '转化漏斗', 'Funnel'], ['flywheel', '增长飞轮', 'Flywheel']] },
  { id: 'matrix', zh: '2×2 四象限矩阵', en: '2×2 Matrix', group: 'structured', quick: true, variants: [['2x2', '四象限坐标轴', '2×2 quadrant'], ['grid', '四宫格', 'Grid']] },
  { id: 'callout', zh: '结论清单 / 定理框', en: 'Callout & checklist', group: 'structured', variants: [['takeaways', '行动清单', 'Takeaways'], ['definition', '核心定义框', 'Definition'], ['formula', '公式定理框', 'Formula']] },
  { id: 'gantt', zh: '甘特图路线图', en: 'Gantt roadmap', group: 'data', quick: true, variants: [['quarters', '按季度', 'Quarters'], ['months', '按月份', 'Months'], ['weeks', '按周次', 'Weeks'], ['swimlane', '泳道甘特', 'Swimlane']] },
  { id: 'architecture', zh: '分层系统架构图', en: 'Architecture diagram', group: 'structured', quick: true, variants: [['layered', '分层架构', 'Layered'], ['platform', '平台中台', 'Platform']] },
  { id: 'harvey', zh: '哈维球竞品矩阵', en: 'Harvey-ball matrix', group: 'data', quick: true, variants: [] },
  { id: 'tam', zh: 'TAM/SAM/SOM 同心圆', en: 'TAM/SAM/SOM', group: 'data', variants: [['concentric', '同心圆', 'Concentric']] },
  { id: 'org', zh: '组织架构 / 团队图谱', en: 'Org & team', group: 'structured', variants: [['tree', '汇报树状图', 'Org tree'], ['team', '核心团队卡', 'Team bios']] },
  { id: 'marimekko', zh: '不等宽市场图', en: 'Marimekko market map', group: 'data', quick: true, variants: [] },
  { id: 'sankey', zh: '桑基流向图', en: 'Sankey flow diagram', group: 'data', quick: true, variants: [] },
  { id: 'swot', zh: 'SWOT 十字矩阵', en: 'SWOT matrix', group: 'structured', quick: true, variants: [] },
  { id: 'value-chain', zh: '波特价值链', en: 'Porter value chain', group: 'structured', quick: true, variants: [] },
  { id: 'mermaid', zh: 'Mermaid 流程图/时序图', en: 'Mermaid Diagram', group: 'data', quick: true, variants: [['flowchart', '流程图', 'Flowchart'], ['sequence', '时序图', 'Sequence']] },
  { id: 'mockup', zh: '设备原型 / 界面展示', en: 'Device mockup', group: 'media', quick: true, variants: [['browser', '浏览器窗口', 'Browser window'], ['mobile', '移动端真机', 'Mobile device'], ['split', '双端协同对比', 'Desktop + mobile']] },
  { id: 'code', zh: '语法高亮代码展示', en: 'Code showcase', group: 'structured', quick: true, variants: [['full', '全宽终端窗口', 'Full terminal'], ['split', '左代码右批注', 'Split annotations']] },
  { id: 'quadrant', zh: '魔力象限 / 战略气泡', en: 'Magic Quadrant', group: 'data', quick: true, variants: [] },
  { id: 'radar', zh: '多维雷达图', en: 'Radar chart', group: 'data', quick: true, variants: [] },
  { id: 'dumbbell', zh: '哑铃 / 前后跃迁图', en: 'Dumbbell slope', group: 'data', quick: true, variants: [] },
  { id: 'heatmap', zh: '矩阵热力图', en: 'Heatmap matrix', group: 'data', quick: true, variants: [] },
  { id: 'table', zh: '表格 / 学术三线表', en: 'Table', group: 'data', quick: true, variants: [] },
  { id: 'chart', zh: '原生数据图表', en: 'Chart', group: 'data', variants: [] },
  { id: 'chart-split', zh: '图表 + 洞察分栏', en: 'Chart + insights', group: 'data', variants: [['chart-left', '左图右洞察', 'Chart left'], ['chart-right', '左洞察右图', 'Chart right']] },
  { id: 'statement', zh: '单句核心论断', en: 'Statement', group: 'framing', variants: [['rail', '侧栏强调', 'Rail'], ['editorial-asymmetric', '非对称社论', 'Asymmetric'], ['centered', '居中金句', 'Centered']] },
  { id: 'quote', zh: '引用金句', en: 'Quote', group: 'framing', variants: [['editorial', '经典引号', 'Editorial'], ['card', '卡片引用', 'Card']] },
  { id: 'image', zh: '整页大图 / 画廊', en: 'Full image', group: 'media', variants: [['framed', '画框留白', 'Framed'], ['full-bleed', '满版铺满', 'Full bleed'], ['gallery', '多图画廊', 'Gallery']] },
  { id: 'image-left', zh: '左图右文', en: 'Image left', group: 'media', variants: [['framed', '圆角画框', 'Framed'], ['split-bleed', '半屏满版', 'Split bleed']] },
  { id: 'image-right', zh: '左文右图', en: 'Image right', group: 'media', variants: [['framed', '圆角画框', 'Framed'], ['split-bleed', '半屏满版', 'Split bleed']] },
  { id: 'closing', zh: '结束与行动号召', en: 'Closing & CTA', group: 'framing', variants: [['standard', '标准致谢', 'Standard'], ['cta-cards', '行动卡片', 'CTA cards'], ['inverted', '深色封底', 'Inverted']] },
]);

const PPT_ITEM_LAYOUTS = new Set(['cards', 'kpi', 'comparison', 'matrix', 'process', 'chart-split', 'gantt', 'architecture', 'tam', 'org', 'sankey', 'swot', 'value-chain', 'mockup', 'quadrant', 'dumbbell']);

function pptLayoutMeta(layout) {
  return PPT_LAYOUT_CATALOG.find(item => item.id === layout) || { id: layout || 'bullets', zh: layout || '要点', en: layout || 'Bullets', group: 'structured', variants: [] };
}

function pptLayoutLabel(layout) {
  const meta = pptLayoutMeta(layout);
  return languageOf() === 'en' ? meta.en : meta.zh;
}

function normalizeSlideItems(slide) {
  const raw = Array.isArray(slide?.items) ? slide.items : Array.isArray(slide?.cards) ? slide.cards : [];
  return raw.slice(0, 12).map(entry => ({
    tag: String(entry?.tag ?? entry?.badge ?? ''),
    title: String(entry?.title ?? ''),
    text: String(entry?.text ?? entry?.body ?? ''),
    value: entry?.value === undefined || entry?.value === null ? '' : String(entry.value),
    unit: String(entry?.unit ?? ''),
    delta: String(entry?.delta ?? ''),
    status: String(entry?.status ?? entry?.tone ?? ''),
    icon: String(entry?.icon ?? ''),
    avatar: String(entry?.avatar ?? ''),
    start: typeof entry?.start === 'number' && Number.isFinite(entry.start) ? String(entry.start) : '',
    span: typeof entry?.span === 'number' && Number.isFinite(entry.span) ? String(entry.span) : '',
    milestone: entry?.milestone === true,
    role: String(entry?.role ?? ''),
    conversion: String(entry?.conversion ?? ''),
    x: typeof entry?.x === 'number' && Number.isFinite(entry.x) ? String(entry.x) : '',
    y: typeof entry?.y === 'number' && Number.isFinite(entry.y) ? String(entry.y) : '',
    size: typeof entry?.size === 'number' && Number.isFinite(entry.size) ? String(entry.size) : '',
    before: typeof entry?.before === 'number' && Number.isFinite(entry.before) ? String(entry.before) : '',
    after: typeof entry?.after === 'number' && Number.isFinite(entry.after) ? String(entry.after) : '',
    bullets: Array.isArray(entry?.bullets) ? entry.bullets.map(b => String(b)) : [],
  }));
}

function serializeSlideRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return '';
  return rows.map(row => Array.isArray(row) ? row.map(cell => String(cell ?? '').replace(/\t|\r|\n/g, ' ')).join('\t') : '').join('\n');
}

function parseSlideRowsText(text) {
  const lines = String(text ?? '').split(/\r?\n/).map(line => line.trimEnd()).filter(line => line.trim() !== '');
  if (!lines.length) return null;
  const useTab = lines.some(line => line.includes('\t'));
  const usePipe = !useTab && lines.every(line => line.includes('|'));
  const parsed = lines.map(line => {
    if (useTab) return line.split('\t').map(cell => cell.trim());
    if (usePipe) {
      const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
      return trimmed.split('|').map(cell => cell.trim());
    }
    return line.split(/\s*,\s*/).map(cell => cell.trim());
  }).filter(row => !(usePipe && row.every(cell => /^:?-{2,}:?$/.test(cell))));
  if (!parsed.length) return null;
  const cols = Math.max(1, Math.min(12, Math.max(...parsed.map(r => r.length))));
  return parsed.slice(0, 50).map(row => {
    const padded = row.slice(0, cols);
    while (padded.length < cols) padded.push('');
    return padded.map(cell => {
      if (/^[+-]?\d+(?:\.\d+)?$/.test(cell) && Number.isFinite(Number(cell))) return Number(cell);
      return cell.slice(0, 500);
    });
  });
}

function itemsFromBulletsText(bulletsText, targetLayout) {
  const lines = String(bulletsText || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 6);
  if (!lines.length) return [];
  return lines.map((line, index) => {
    const clean = line.replace(/^\*\*([^*]+)\*\*\s*[:：—-]\s*/, '$1：');
    if (targetLayout === 'kpi') {
      const metric = /^([+-]?\d+(?:[.,]\d+)?[%％xX倍万亿kKmMbB+]?)\s*(.*)$/.exec(clean) || /^(.*?)\s*[:：]\s*([+-]?\d+(?:[.,]\d+)?[%％xX倍万亿kKmMbB+]?.*)$/.exec(clean);
      if (metric) {
        const firstIsNum = /^[+-]?\d/.test(metric[1]);
        return { tag: '', value: (firstIsNum ? metric[1] : metric[2]).slice(0, 40), unit: '', delta: '', title: (firstIsNum ? metric[2] : metric[1]).trim() || ('KPI ' + (index + 1)), text: '', status: 'accent' };
      }
      return { tag: '', value: String(index + 1), unit: '', delta: '', title: clean.slice(0, 60), text: '', status: 'neutral' };
    }
    const split = /^([^:：]{1,28})[:：]\s*(.+)$/.exec(clean);
    return {
      tag: String(index + 1).padStart(2, '0'),
      title: split ? split[1].trim() : clean.slice(0, 48),
      text: split ? split[2].trim() : '',
      value: '',
      unit: '',
      delta: '',
      status: '',
    };
  });
}

function bulletsFromItems(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return items.map(item => {
    const head = [item.value, item.unit].filter(Boolean).join('');
    const title = item.title || '';
    const body = item.text || '';
    if (head && title) return head + ' ' + title + (body ? '：' + body : '');
    if (title && body) return '**' + title + '**：' + body;
    return title || body || head;
  }).filter(Boolean).join('\n');
}

function projectDraftToLayout(draft, nextLayout) {
  const next = { ...draft, layout: nextLayout };
  const meta = pptLayoutMeta(nextLayout);
  if (meta.variants.length && !meta.variants.some(([v]) => v === next.variant)) {
    next.variant = meta.variants[0][0];
  } else if (!meta.variants.length) {
    next.variant = '';
  }
  if (PPT_ITEM_LAYOUTS.has(nextLayout) && (!Array.isArray(next.items) || !next.items.length) && next.bullets?.trim()) {
    next.items = itemsFromBulletsText(next.bullets, nextLayout);
  } else if (nextLayout === 'bullets' && !next.bullets?.trim() && Array.isArray(next.items) && next.items.length) {
    next.bullets = bulletsFromItems(next.items);
  } else if ((nextLayout === 'table' || nextLayout === 'harvey') && !next.rowsText?.trim()) {
    const en = languageOf() === 'en';
    if (nextLayout === 'harvey') {
      const rows = en
        ? [['Capability', 'Ours', 'Vendor A', 'Vendor B'], ['Native editability', '●', '◑', '○'], ['Contrast guard', '●', '◕', '◑']]
        : [['能力维度', '本方案', '竞品 A', '竞品 B'], ['原生可编辑', '●', '◑', '○'], ['对比度净化', '●', '◕', '◑']];
      next.rowsText = serializeSlideRows(rows);
      next.tableStyle = 'harvey';
    } else if (Array.isArray(next.items) && next.items.length) {
      const rows = [[en ? 'Item' : '项目', en ? 'Detail' : '说明'], ...next.items.map(it => [it.title || it.tag || '-', it.value ? (it.value + (it.unit || '')) : (it.text || '-')])];
      next.rowsText = serializeSlideRows(rows);
    } else if (next.bullets?.trim()) {
      const lines = next.bullets.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const rows = [[en ? '#' : '序号', en ? 'Point' : '内容'], ...lines.map((l, i) => [String(i + 1), l])];
      next.rowsText = serializeSlideRows(rows);
    }
    if (!next.tableStyle) next.tableStyle = 'consulting';
  }
  if (nextLayout === 'gantt' && !next.columnsText?.trim()) {
    next.columnsText = 'Q1, Q2, Q3, Q4';
  }
  if (nextLayout === 'marimekko' && !next.rowsText?.trim() && (!Array.isArray(next.items) || !next.items.length)) {
    const en = languageOf() === 'en';
    next.rowsText = serializeSlideRows(en
      ? [['Player / Segment', 'Enterprise (45B)', 'Financial (32B)', 'Industrial (23B)'], ['Ours', '42%', '35%', '28%'], ['Vendor B', '33%', '40%', '32%'], ['Others', '25%', '25%', '40%']]
      : [['厂商 / 赛道', '华东政务 (450亿)', '金融信创 (320亿)', '工业制造 (230亿)'], ['本方案', '42%', '35%', '28%'], ['厂商 B', '33%', '40%', '32%'], ['其他', '25%', '25%', '40%']]);
  }
  if (nextLayout === 'sankey' && (!Array.isArray(next.items) || !next.items.length)) {
    const en = languageOf() === 'en';
    next.items = en
      ? [
          { tag: 'Total Revenue', title: 'Gross Profit', text: '', value: '68.5', unit: 'B', delta: '', status: 'positive', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: 'Total Revenue', title: 'Cost of Revenue', text: '', value: '31.5', unit: 'B', delta: '', status: 'neutral', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: 'Gross Profit', title: 'R&D Investment', text: '', value: '22.0', unit: 'B', delta: '', status: 'accent', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: 'Gross Profit', title: 'Operating Income', text: '', value: '46.5', unit: 'B', delta: '', status: 'positive', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
        ]
      : [
          { tag: '总营收', title: '毛利润', text: '', value: '68.5', unit: '亿', delta: '', status: 'positive', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: '总营收', title: '营业成本', text: '', value: '31.5', unit: '亿', delta: '', status: 'neutral', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: '毛利润', title: '研发投入', text: '', value: '22.0', unit: '亿', delta: '', status: 'accent', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: '毛利润', title: '营业利润', text: '', value: '46.5', unit: '亿', delta: '', status: 'positive', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
        ];
  }
  if (nextLayout === 'swot' && (!Array.isArray(next.items) || !next.items.length)) {
    const en = languageOf() === 'en';
    next.items = en
      ? [
          { tag: 'S · Strengths', title: 'Core capabilities', text: '', value: '', unit: '', delta: '', status: 'positive', start: '', span: '', milestone: false, role: '', conversion: '', bullets: ['HTML + native OOXML parity'] },
          { tag: 'W · Weaknesses', title: 'Current gaps', text: '', value: '', unit: '', delta: '', status: 'warning', start: '', span: '', milestone: false, role: '', conversion: '', bullets: ['Initial template setup'] },
          { tag: 'O · Opportunities', title: 'Market tailwinds', text: '', value: '', unit: '', delta: '', status: 'accent', start: '', span: '', milestone: false, role: '', conversion: '', bullets: ['Legacy deck refurbishment'] },
          { tag: 'T · Threats', title: 'External risks', text: '', value: '', unit: '', delta: '', status: 'negative', start: '', span: '', milestone: false, role: '', conversion: '', bullets: ['Brand lock-in constraints'] },
        ]
      : [
          { tag: 'S · 核心优势', title: '技术壁垒', text: '', value: '', unit: '', delta: '', status: 'positive', start: '', span: '', milestone: false, role: '', conversion: '', bullets: ['HTML 与原生 OOXML 双向同源'] },
          { tag: 'W · 关键短板', title: '待补齐点', text: '', value: '', unit: '', delta: '', status: 'warning', start: '', span: '', milestone: false, role: '', conversion: '', bullets: ['复杂旧模板首次迁移微调'] },
          { tag: 'O · 外部机遇', title: '增长空间', text: '', value: '', unit: '', delta: '', status: 'accent', start: '', span: '', milestone: false, role: '', conversion: '', bullets: ['存量 PPTX 一键翻新需求'] },
          { tag: 'T · 潜在威胁', title: '外部挑战', text: '', value: '', unit: '', delta: '', status: 'negative', start: '', span: '', milestone: false, role: '', conversion: '', bullets: ['严格既有母版约束'] },
        ];
  }
  if (nextLayout === 'value-chain' && (!Array.isArray(next.items) || !next.items.length)) {
    const en = languageOf() === 'en';
    next.items = en
      ? [
          { tag: 'Support', title: 'Governance & Infrastructure', text: 'Unified metrics and compliance', value: '', unit: '', delta: '', status: 'neutral', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: 'Support', title: 'R&D & Technology Platform', text: 'AI workflow & QA automation', value: '', unit: '', delta: '', status: 'accent', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: 'Primary', title: 'Demand Intake', text: 'High-intent capture', value: '', unit: '', delta: '', status: 'neutral', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: 'Primary', title: 'Core Delivery', text: 'Zero-rework build', value: '', unit: '', delta: '', status: 'accent', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: 'Primary', title: 'Go-to-Market', text: 'Benchmark rollout', value: '', unit: '', delta: '', status: 'accent', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: 'Primary', title: 'Retention', text: '118% net expansion', value: '', unit: '', delta: '', status: 'positive', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
        ]
      : [
          { tag: '辅助活动', title: '企业基础设施与敏捷治理', text: '统一口径与合规审计', value: '', unit: '', delta: '', status: 'neutral', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: '辅助活动', title: '技术研发与数字化中台', text: '智能编排与自动化门禁', value: '', unit: '', delta: '', status: 'accent', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: '基本活动', title: '需求洞察', text: '精准准入筛选', value: '', unit: '', delta: '', status: 'neutral', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: '基本活动', title: '标准交付', text: '同源构建提效', value: '', unit: '', delta: '', status: 'accent', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: '基本活动', title: '市场拓展', text: '标杆复制推广', value: '', unit: '', delta: '', status: 'accent', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
          { tag: '基本活动', title: '运营复购', text: '118% 净留存', value: '', unit: '', delta: '', status: 'positive', start: '', span: '', milestone: false, role: '', conversion: '', bullets: [] },
        ];
  }
  if ((nextLayout === 'mermaid' || nextLayout === 'flowchart' || nextLayout === 'sequence') && !next.mermaid?.trim()) {
    const en = languageOf() === 'en';
    next.mermaid = nextLayout === 'sequence' || next.variant === 'sequence'
      ? (en
          ? 'sequenceDiagram\n  participant User\n  participant Studio\n  participant Engine\n  User->>Studio: Upload .xlsx / .docx\n  Studio->>Engine: Profile & choreograph\n  Engine-->>User: HTML + Native PPTX'
          : 'sequenceDiagram\n  participant 用户\n  participant 工作台\n  participant 引擎\n  用户->>工作台: 上传 .xlsx / .docx\n  工作台->>引擎: 智能剖析与编排\n  引擎-->>用户: HTML + 原生 PPTX')
      : (en
          ? 'flowchart LR\n  A([Inputs]) --> B{Auto-Director}\n  B -->|Data| C[Sankey & KPI]\n  B -->|Docs| D[24+ Layouts]\n  C --> E[(HTML & PPTX)]\n  D --> E'
          : 'flowchart LR\n  A([多源输入]) --> B{智能导演}\n  B -->|数据表| C[桑基与指标]\n  B -->|文稿| D[24+ 版式]\n  C --> E[(同源交付)]\n  D --> E');
  }
  if (nextLayout === 'code' && !next.code?.trim()) {
    next.language = next.language || 'typescript';
    next.filename = next.filename || 'src/pipeline.ts';
    next.code = 'export async function buildDeck(spec: DeckSpec) {\n  const plan = choreograph(spec);\n  const [html, pptx] = await Promise.all([\n    renderHtml(plan),\n    renderOoxml(plan),\n  ]);\n  return { html, pptx, quality: verify(plan) };\n}';
  }
  if (nextLayout === 'mockup') {
    if (!next.url?.trim()) next.url = 'https://studio.dsh-ppt.dev/workspace';
    if (!Array.isArray(next.items) || !next.items.length) {
      const en = languageOf() === 'en';
      next.items = en
        ? [
            { tag: 'LIVE', title: 'Monthly ARR', text: 'Enterprise tier', value: '$18.5M', unit: '', delta: '+42%', status: 'positive', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '', after: '', bullets: [] },
            { tag: 'SLA', title: 'P99 Latency', text: 'Edge inference', value: '38ms', unit: '', delta: '-46%', status: 'accent', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '', after: '', bullets: [] },
            { tag: 'QA', title: 'Auto-Audit', text: 'Zero overlap gate', value: '100%', unit: '', delta: 'Pass', status: 'positive', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '', after: '', bullets: [] },
          ]
        : [
            { tag: '实时', title: '月度经常性收入', text: '企业版主力', value: '¥1.85亿', unit: '', delta: '+42%', status: 'positive', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '', after: '', bullets: [] },
            { tag: 'SLA', title: 'P99 推理时延', text: '边缘节点加速', value: '38ms', unit: '', delta: '-46%', status: 'accent', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '', after: '', bullets: [] },
            { tag: '门禁', title: '视觉巡检通过率', text: '零溢出零遮挡', value: '100%', unit: '', delta: '达标', status: 'positive', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '', after: '', bullets: [] },
          ];
    }
  }
  if (nextLayout === 'quadrant') {
    const en = languageOf() === 'en';
    if (!next.xLabel?.trim()) next.xLabel = en ? 'Completeness of Vision →' : '战略前瞻与产品完备度 →';
    if (!next.yLabel?.trim()) next.yLabel = en ? 'Ability to Execute →' : '工程执行与落地能力 →';
    if (!Array.isArray(next.items) || !next.items.length) {
      next.items = [
        { tag: en ? 'Leader' : '领航者', title: en ? 'Our Platform' : '本平台方案', text: '', value: '', unit: '', delta: '', status: 'positive', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '84', y: '86', size: '34', before: '', after: '', bullets: [] },
        { tag: en ? 'Challenger' : '挑战者', title: en ? 'Vendor A' : '竞品 A', text: '', value: '', unit: '', delta: '', status: 'accent', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '44', y: '74', size: '24', before: '', after: '', bullets: [] },
        { tag: en ? 'Visionary' : '远见者', title: en ? 'Vendor B' : '竞品 B', text: '', value: '', unit: '', delta: '', status: 'warning', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '76', y: '38', size: '20', before: '', after: '', bullets: [] },
        { tag: en ? 'Niche' : '特定领域', title: en ? 'Legacy Tool' : '传统工具', text: '', value: '', unit: '', delta: '', status: 'neutral', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '26', y: '32', size: '18', before: '', after: '', bullets: [] },
      ];
    }
  }
  if (nextLayout === 'radar' && !next.rowsText?.trim()) {
    const en = languageOf() === 'en';
    next.rowsText = serializeSlideRows(en
      ? [['Dimension', 'Our Platform', 'Industry Avg'], ['Editability', 96, 62], ['Visual Polish', 94, 68], ['Data Charts', 92, 58], ['Speed', 90, 74], ['Governance', 88, 65]]
      : [['评估维度', '本方案', '行业均值'], ['原生可编辑', 96, 62], ['视觉质感', 94, 68], ['咨询图表', 92, 58], ['生成效率', 90, 74], ['品牌合规', 88, 65]]);
  }
  if (nextLayout === 'dumbbell' && (!Array.isArray(next.items) || !next.items.length)) {
    const en = languageOf() === 'en';
    next.items = en
      ? [
          { tag: 'Latency', title: 'Deck Build Time (s)', text: '', value: '', unit: 's', delta: '', status: 'positive', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '180', after: '24', bullets: [] },
          { tag: 'Quality', title: 'First-Pass QA Rate (%)', text: '', value: '', unit: '%', delta: '', status: 'positive', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '58', after: '96', bullets: [] },
          { tag: 'Adoption', title: 'Weekly Active Teams (%)', text: '', value: '', unit: '%', delta: '', status: 'accent', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '34', after: '82', bullets: [] },
        ]
      : [
          { tag: '提速', title: '单份成稿耗时 (分钟)', text: '', value: '', unit: 'm', delta: '', status: 'positive', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '180', after: '24', bullets: [] },
          { tag: '质量', title: '视觉巡检一次通过率 (%)', text: '', value: '', unit: '%', delta: '', status: 'positive', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '58', after: '96', bullets: [] },
          { tag: '渗透', title: '核心业务周活使用率 (%)', text: '', value: '', unit: '%', delta: '', status: 'accent', icon: '', avatar: '', start: '', span: '', milestone: false, role: '', conversion: '', x: '', y: '', size: '', before: '34', after: '82', bullets: [] },
        ];
  }
  if (nextLayout === 'heatmap' && !next.rowsText?.trim()) {
    const en = languageOf() === 'en';
    next.rowsText = serializeSlideRows(en
      ? [['Region / Qtr', 'Q1', 'Q2', 'Q3', 'Q4'], ['North America', 68, 76, 84, 94], ['Europe', 54, 62, 71, 82], ['APAC', 72, 81, 89, 97], ['LATAM', 38, 45, 58, 69]]
      : [['大区 / 季度', 'Q1', 'Q2', 'Q3', 'Q4'], ['华东区', 68, 76, 84, 94], ['华北区', 54, 62, 71, 82], ['华南区', 72, 81, 89, 97], ['西南区', 38, 45, 58, 69]]);
  }
  return next;
}

function SlideArchetypeEditor({ slide, draft, disabled, controlId, onChange }) {
  const L = (zh, en) => languageOf() === 'en' ? en : zh;
  const currentLayout = draft.layout || slide?.layout || 'bullets';
  const meta = pptLayoutMeta(currentLayout);
  const canQuickSwitch = !['chart', 'image', 'image-left', 'image-right'].includes(slide?.layout) || currentLayout === slide?.layout;
  const items = Array.isArray(draft.items) ? draft.items : [];
  const showItemsEditor = PPT_ITEM_LAYOUTS.has(currentLayout) || (currentLayout === 'code' && draft.variant === 'split') || items.length > 0;
  const showTableEditor = currentLayout === 'table' || currentLayout === 'harvey' || currentLayout === 'marimekko' || currentLayout === 'heatmap' || currentLayout === 'radar' || Boolean(draft.rowsText?.trim());

  function updateItem(idx, key, val) {
    const nextItems = items.map((entry, i) => i === idx ? { ...entry, [key]: val } : entry);
    onChange({ ...draft, items: nextItems });
  }
  function addItem() {
    if (items.length >= 12) return;
    onChange({
      ...draft,
      items: [...items, {
        tag: currentLayout === 'kpi' ? '' : currentLayout === 'tam' ? ['TAM', 'SAM', 'SOM'][items.length] || 'SOM' : String(items.length + 1).padStart(2, '0'),
        title: L('卡片标题', 'Card title'),
        text: currentLayout === 'kpi' ? '' : L('补充关键论据或举措', 'Supporting point or action'),
        value: currentLayout === 'kpi' ? '95%' : currentLayout === 'tam' ? '$1B' : '',
        unit: '',
        delta: '',
        status: currentLayout === 'kpi' ? 'accent' : '',
        icon: '',
        avatar: '',
        start: currentLayout === 'gantt' ? String(Math.min(items.length, 3)) : '',
        span: currentLayout === 'gantt' ? '1' : '',
        milestone: false,
        role: currentLayout === 'org' ? L('负责人', 'Lead') : '',
        conversion: '',
        x: currentLayout === 'quadrant' ? '60' : '',
        y: currentLayout === 'quadrant' ? '65' : '',
        size: currentLayout === 'quadrant' ? '22' : '',
        before: currentLayout === 'dumbbell' ? '40' : '',
        after: currentLayout === 'dumbbell' ? '80' : '',
        bullets: [],
      }],
    });
  }
  function removeItem(idx) {
    onChange({ ...draft, items: items.filter((_, i) => i !== idx) });
  }

  return h('div', { className: 'ppt-archetype-box' },
    h('div', { className: 'ppt-archetype-header' },
      h('label', { htmlFor: controlId + '-layout' }, L('页面版式（一键切换）', 'Slide archetype (1-click switch)')),
      h('select', {
        id: controlId + '-layout',
        value: currentLayout,
        disabled,
        onChange: e => onChange(projectDraftToLayout(draft, e.target.value)),
      }, PPT_LAYOUT_CATALOG.map(row => h('option', { key: row.id, value: row.id }, languageOf() === 'en' ? row.en : row.zh)))),
    canQuickSwitch ? h('div', { className: 'ppt-archetype-pills', role: 'group', 'aria-label': L('常用高质感版式', 'Recommended archetypes') },
      PPT_LAYOUT_CATALOG.filter(row => row.quick).map(row => h('button', {
        type: 'button',
        key: row.id,
        className: 'ppt-pill',
        'aria-pressed': currentLayout === row.id ? 'true' : 'false',
        disabled,
        onClick: () => onChange(projectDraftToLayout(draft, row.id)),
      }, languageOf() === 'en' ? row.en : row.zh))) : null,
    h('div', { className: 'ppt-archetype-subgrid' },
      meta.variants.length > 0 ? h('div', null,
        h('label', { htmlFor: controlId + '-variant' }, L('视觉变体', 'Visual variant')),
        h('select', {
          id: controlId + '-variant',
          value: draft.variant || '',
          disabled,
          onChange: e => onChange({ ...draft, variant: e.target.value }),
        }, h('option', { value: '' }, L('主题推荐默认', 'Theme default')),
          meta.variants.map(([v, zh, en]) => h('option', { key: v, value: v }, L(zh, en))))) : null,
      h('div', null,
        h('label', { htmlFor: controlId + '-density' }, L('排版疏密', 'Spacing density')),
        h('select', {
          id: controlId + '-density',
          value: draft.density || '',
          disabled,
          onChange: e => onChange({ ...draft, density: e.target.value }),
        },
          h('option', { value: '' }, L('自动均衡', 'Auto balanced')),
          h('option', { value: 'compact' }, L('紧凑（信息量大）', 'Compact')),
          h('option', { value: 'balanced' }, L('标准均衡', 'Balanced')),
          h('option', { value: 'airy' }, L('舒展留白', 'Airy')))),
      h('div', null,
        h('label', { htmlFor: controlId + '-chrome' }, L('单页母版骨架', 'Slide chrome skeleton')),
        h('select', {
          id: controlId + '-chrome',
          value: draft.chrome || '',
          disabled,
          onChange: e => onChange({ ...draft, chrome: e.target.value }),
        },
          h('option', { value: '' }, L('跟随整稿母版', 'Deck default')),
          PPT_CHROME_SKELETONS.map(sk => h('option', { key: sk.id, value: sk.id }, L(sk.zh, sk.en))))),
      currentLayout === 'cover' ? h('div', null,
        h('label', { htmlFor: controlId + '-cover-pattern' }, L('封面几何肌理', 'Cover geometric pattern')),
        h('select', {
          id: controlId + '-cover-pattern',
          value: draft.coverPattern || '',
          disabled,
          onChange: e => onChange({ ...draft, coverPattern: e.target.value }),
        },
          h('option', { value: '' }, L('默认纯净底纹', 'Default clean')),
          h('option', { value: 'dots' }, L('建筑点阵 (Dots)', 'Architectural dots')),
          h('option', { value: 'grid' }, L('细线坐标网 (Grid)', 'Micro blueprint grid')),
          h('option', { value: 'rings' }, L('同心圆环 (Rings)', 'Concentric rings')))) : null),
    currentLayout === 'gantt' ? h('div', { className: 'ppt-structured-section' },
      h('label', { htmlFor: controlId + '-columns' }, L('时间轴列头（逗号分隔，如 Q1, Q2, Q3, Q4）', 'Timeline columns (comma-separated, e.g. Q1, Q2, Q3, Q4)')),
      h('input', {
        id: controlId + '-columns',
        value: draft.columnsText || '',
        disabled,
        placeholder: 'Q1, Q2, Q3, Q4',
        onChange: e => onChange({ ...draft, columnsText: e.target.value }),
      })) : null,
    showTableEditor ? h('details', { className: 'ppt-structured-section', open: currentLayout === 'table' || currentLayout === 'harvey' },
      h('summary', null, currentLayout === 'harvey' ? L('哈维球矩阵数据（● ◕ ◑ ◔ ○）', 'Harvey-ball matrix data (● ◕ ◑ ◔ ○)') : L('表格样式与数据编辑', 'Table style & cell data')),
      h('label', { htmlFor: controlId + '-table-style' }, L('表格规范样式', 'Table style')),
      h('div', { className: 'ppt-archetype-pills', role: 'group', 'aria-label': L('表格样式', 'Table style') },
        [['consulting', L('咨询报告表', 'Consulting')], ['booktabs', L('学术三线表', 'Academic 3-line')], ['minimal', L('极简细线', 'Minimal')], ['banded', L('斑马纹', 'Banded')], ['harvey', L('哈维球矩阵', 'Harvey balls')]].map(([id, label]) =>
          h('button', {
            type: 'button',
            key: id,
            className: 'ppt-pill',
            'aria-pressed': (draft.tableStyle || (currentLayout === 'harvey' ? 'harvey' : 'consulting')) === id ? 'true' : 'false',
            disabled,
            onClick: () => onChange({ ...draft, tableStyle: id }),
          }, label))),
      h('label', { htmlFor: controlId + '-rows' }, L('表格单元格（每行一排，用 Tab、竖线 | 或逗号分隔，首行为表头）', 'Table cells (first line is header; separate columns with Tab, |, or comma)')),
      (currentLayout === 'harvey' || draft.tableStyle === 'harvey') ? h('div', { className: 'ppt-archetype-pills', role: 'group', 'aria-label': L('快捷插入哈维球符号', 'Quick insert Harvey symbols') },
        [['●', L('● 满分', '● Full')], ['◕', L('◕ 较强', '◕ Strong')], ['◑', L('◑ 中等', '◑ Half')], ['◔', L('◔ 起步', '◔ Quarter')], ['○', L('○ 暂无', '○ None')]].map(([sym, lbl]) =>
          h('button', {
            type: 'button',
            key: sym,
            className: 'ppt-pill',
            disabled,
            onClick: () => {
              const base = String(draft.rowsText || '');
              const sep = base && !base.endsWith('\t') && !base.endsWith('\n') ? '\t' : '';
              onChange({ ...draft, rowsText: base + sep + sym });
            },
          }, lbl))) : null,
      h('textarea', {
        id: controlId + '-rows',
        rows: 5,
        disabled,
        value: draft.rowsText || '',
        placeholder: currentLayout === 'harvey'
          ? L('能力项\t本方案\t竞品A\n原生可编辑\t●\t◑', 'Capability\tOurs\tVendor A\nNative edit\t●\t◑')
          : L('模块\t负责人\t进度\n核心架构\t平台组\t已完成', 'Stream\tOwner\tStatus\nCore\tPlatform\tDone'),
        onChange: e => onChange({ ...draft, rowsText: e.target.value }),
      })) : null,
    showItemsEditor ? h('details', { className: 'ppt-structured-section', open: PPT_ITEM_LAYOUTS.has(currentLayout) },
      h('summary', null, L('结构化卡片 / 指标项（', 'Structured cards / metrics (') + items.length + L(' 项）', ')')),
      h('div', { className: 'tools' },
        h('button', { type: 'button', disabled: disabled || items.length >= 12, onClick: addItem }, L('+ 添加卡片项', '+ Add card item')),
        draft.bullets?.trim() ? h('button', { type: 'button', disabled, onClick: () => onChange({ ...draft, items: itemsFromBulletsText(draft.bullets, currentLayout) }) }, L('从要点文本自动生成卡片', 'Convert bullets to cards')) : null),
      items.map((entry, idx) => h('div', { key: idx, className: 'ppt-item-editor' },
        h('div', { className: 'ppt-item-head' },
          h('strong', null, '#' + (idx + 1)),
          h('button', { type: 'button', disabled, onClick: () => removeItem(idx) }, L('移除', 'Remove'))),
        h('div', { className: 'ppt-archetype-subgrid' },
          h('div', null,
            h('label', null, currentLayout === 'kpi' ? L('核心数值', 'Metric value') : L('角标 / 序号', 'Badge / step')),
            h('input', {
              value: currentLayout === 'kpi' ? entry.value : entry.tag,
              disabled,
              maxLength: 120,
              placeholder: currentLayout === 'kpi' ? '98.5%' : '01',
              onChange: e => updateItem(idx, currentLayout === 'kpi' ? 'value' : 'tag', e.target.value),
            })),
          h('div', null,
            h('label', null, currentLayout === 'kpi' ? L('涨跌 / 标签', 'Delta / note') : L('状态强调', 'Semantic tone')),
            currentLayout === 'kpi'
              ? h('input', { value: entry.delta, disabled, maxLength: 120, placeholder: '+12% YoY', onChange: e => updateItem(idx, 'delta', e.target.value) })
              : h('select', { value: entry.status || '', disabled, onChange: e => updateItem(idx, 'status', e.target.value) },
                  h('option', { value: '' }, L('默认表面', 'Default')),
                  h('option', { value: 'accent' }, L('主色强调', 'Accent')),
                  h('option', { value: 'positive' }, L('正向达成', 'Positive')),
                  h('option', { value: 'warning' }, L('风险关注', 'Warning')),
                  h('option', { value: 'negative' }, L('负向警示', 'Negative'))))),
        currentLayout === 'gantt' ? h('div', { className: 'ppt-archetype-subgrid' },
          h('div', null,
            h('label', null, L('起始列 (0-based)', 'Start slot (0-based)')),
            h('input', { type: 'number', min: 0, max: 52, step: 0.5, value: entry.start ?? '', disabled, placeholder: '0', onChange: e => updateItem(idx, 'start', e.target.value) })),
          h('div', null,
            h('label', null, L('跨度列数 (0=里程碑)', 'Span (0=milestone)')),
            h('input', { type: 'number', min: 0, max: 52, step: 0.5, value: entry.span ?? '', disabled, placeholder: '1', onChange: e => updateItem(idx, 'span', e.target.value) }))) : null,
        currentLayout === 'org' ? h('div', null,
          h('label', null, L('角色 / 职级标签', 'Role / title badge')),
          h('input', { value: entry.role || '', disabled, maxLength: 120, placeholder: L('例如：技术负责人', 'e.g. VP Engineering'), onChange: e => updateItem(idx, 'role', e.target.value) })) : null,
        currentLayout === 'process' ? h('div', null,
          h('label', null, L('阶段转化率 / 指标', 'Stage conversion / metric')),
          h('input', { value: entry.conversion || '', disabled, maxLength: 120, placeholder: '42%', onChange: e => updateItem(idx, 'conversion', e.target.value) })) : null,
        currentLayout === 'quadrant' ? h('div', { className: 'ppt-archetype-subgrid' },
          h('div', null,
            h('label', null, L('横坐标 X (0-100)', 'X position (0-100)')),
            h('input', { type: 'number', min: 0, max: 100, step: 1, value: entry.x ?? '', disabled, placeholder: '75', onChange: e => updateItem(idx, 'x', e.target.value) })),
          h('div', null,
            h('label', null, L('纵坐标 Y (0-100)', 'Y position (0-100)')),
            h('input', { type: 'number', min: 0, max: 100, step: 1, value: entry.y ?? '', disabled, placeholder: '80', onChange: e => updateItem(idx, 'y', e.target.value) })),
          h('div', null,
            h('label', null, L('气泡大小', 'Bubble size')),
            h('input', { type: 'number', min: 4, max: 100, step: 1, value: entry.size ?? '', disabled, placeholder: '24', onChange: e => updateItem(idx, 'size', e.target.value) }))) : null,
        currentLayout === 'dumbbell' ? h('div', { className: 'ppt-archetype-subgrid' },
          h('div', null,
            h('label', null, L('优化前 (Before)', 'Before value')),
            h('input', { type: 'number', step: 'any', value: entry.before ?? '', disabled, placeholder: '45', onChange: e => updateItem(idx, 'before', e.target.value) })),
          h('div', null,
            h('label', null, L('优化后 (After)', 'After value')),
            h('input', { type: 'number', step: 'any', value: entry.after ?? '', disabled, placeholder: '88', onChange: e => updateItem(idx, 'after', e.target.value) })),
          h('div', null,
            h('label', null, L('单位', 'Unit')),
            h('input', { value: entry.unit || '', disabled, maxLength: 24, placeholder: '%', onChange: e => updateItem(idx, 'unit', e.target.value) }))) : null,
        h('label', null, L('卡片标题', 'Card title')),
        h('input', { value: entry.title, disabled, maxLength: 300, onChange: e => updateItem(idx, 'title', e.target.value) }),
        h('label', null, L('说明正文', 'Card description')),
        h('textarea', { rows: 2, value: entry.text, disabled, maxLength: 1500, onChange: e => updateItem(idx, 'text', e.target.value) }),
        currentLayout === 'architecture' || (Array.isArray(entry.bullets) && entry.bullets.length > 0) ? h('div', null,
          h('label', null, L('子模块 / 要点（每行一项）', 'Sub-modules / bullets (one per line)')),
          h('textarea', {
            rows: 2,
            value: Array.isArray(entry.bullets) ? entry.bullets.join('\n') : '',
            disabled,
            placeholder: L('模块 A\n模块 B', 'Module A\nModule B'),
            onChange: e => updateItem(idx, 'bullets', e.target.value.split(/\r?\n/)),
          })) : null))) : null);
}

const PPT_SAVED_BRANDS_KEY = 'dsh-ppt:saved-brands';
const PPT_FALLBACK_MASTER_PRESETS = Object.freeze([
  { id: 'mckinsey-board', zh: '麦肯锡董事会简报', en: 'McKinsey Board Brief', metaZh: '0px 直角卡片 · 结论先行 · 深海蓝主调', metaEn: '0px sharp cards · Action titles · Deep navy', theme: 'consulting', brand: { primaryColor: '#0057B8', secondaryColor: '#0E7490', backgroundColor: '#FFFFFF', textColor: '#0F172A', chromeStyle: 'consulting-classic' } },
  { id: 'bcg-growth', zh: 'BCG 增长与双碳战略', en: 'BCG Growth Strategy', metaZh: '翡翠绿主色 · 价值链五边形箭头 · 哈维球矩阵', metaEn: 'Emerald accent · Value-chain chevrons · Harvey matrix', theme: 'bcg-emerald', brand: { primaryColor: '#006B54', secondaryColor: '#0F4C81', backgroundColor: '#FFFFFF', textColor: '#0D1F18', chromeStyle: 'consulting-classic' } },
  { id: 'sequoia-memo', zh: '红杉 / YC 创投简报（明亮版）', en: 'Sequoia / YC Partner Deck', metaZh: '适合邮件与平板阅读 · TAM 同心圆 · 增长指标', metaEn: 'Screen-first daylight · TAM sizing · Traction KPIs', theme: 'venture-daylight', brand: { primaryColor: '#C2410C', secondaryColor: '#0F766E', backgroundColor: '#FFFFFF', textColor: '#111827', chromeStyle: 'keynote-spatial' } },
  { id: 'apple-cupertino', zh: 'Cupertino 旗舰产品发布', en: 'Cupertino Spatial Keynote', metaZh: '无顶部分隔线 · 16pt 呼吸感浮卡 · 大数字聚焦', metaEn: 'Divider-free canvas · 16pt airy Bento · Hero metrics', theme: 'keynote-light', brand: { primaryColor: '#0066CC', secondaryColor: '#5E5CE6', backgroundColor: '#FFFFFF', textColor: '#1D1D1F', chromeStyle: 'keynote-spatial' } },
  { id: 'stripe-product', zh: 'Stripe / Vercel 产研评审', en: 'Stripe / Vercel Product Craft', metaZh: '1px 精密 Bento 网格 · 系统分层架构 · 路线图', metaEn: '1px Bento grid · Layered architecture · Roadmap', theme: 'stripe-craft', brand: { primaryColor: '#4F46E5', secondaryColor: '#0284C7', backgroundColor: '#F8FAFC', textColor: '#0F172A', chromeStyle: 'saas-bento' } },
  { id: 'economist-macro', zh: '经济学人 / FT 宏观与财报', en: 'Economist & FT Briefing', metaZh: '暖纸底色 · 红标书脊 · 衬线标题 + 瀑布利润桥', metaEn: 'Warm paper · Editorial folio · Serif title & waterfall', theme: 'economist-brief', brand: { primaryColor: '#C8102E', secondaryColor: '#1D3557', backgroundColor: '#F9F8F5', textColor: '#141413', headingFont: 'Georgia', chromeStyle: 'editorial-folio' } },
  { id: 'nature-defense', zh: 'Nature / ETH 学术答辩', en: 'Nature & Beamer Defense', metaZh: 'Beamer 通栏页眉 · 无竖线学术三线表 · 严谨对比', metaEn: 'Beamer header band · Booktabs 3-line tables · Rigor', theme: 'academic', brand: { primaryColor: '#006980', secondaryColor: '#C8430E', backgroundColor: '#FFFFFF', textColor: '#111827', chromeStyle: 'academic-minimal' } },
  { id: 'imperial-gov', zh: '现代东方政务述职', en: 'Modern Institutional Briefing', metaZh: '深霁蓝庄重封面 + 宣纸浅底正文 · 双线页眉', metaEn: 'Inverted slate cover + warm paper body · Double rule', theme: 'exec-jilan', brand: { primaryColor: '#1A2B4C', secondaryColor: '#9E1B1E', chromeStyle: 'gov-ceremonial' } },
]);

function readSavedBrands() {
  try {
    const raw = window.localStorage?.getItem(PPT_SAVED_BRANDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function writeSavedBrands(list) {
  try {
    window.localStorage?.setItem(PPT_SAVED_BRANDS_KEY, JSON.stringify(list.slice(0, 12)));
  } catch { /* sandbox storage fallback */ }
}

function StyleStudioPanel({ project, busy, blocked, onApplyTheme, onApplyBrand, onApplyAbsorbed, onSyncPptx, onError, onMessage }) {
  const L = (zh, en) => languageOf() === 'en' ? en : zh;
  const controlId = React.useId();
  const themes = Array.isArray(project?.themes) ? project.themes : [];
  const masterPresets = Array.isArray(project?.presets) && project.presets.length > 0
    ? project.presets
    : PPT_FALLBACK_MASTER_PRESETS.map(p => ({ id: p.id, name: L(p.zh, p.en), sourceStyle: L(p.metaZh, p.metaEn), theme: p.theme, brand: p.brand }));
  const tasteRecipes = Array.isArray(project?.tasteRecipes) ? project.tasteRecipes : [];
  const activeTasteId = typeof project?.taste === 'string'
    ? project.taste
    : (project?.taste?.id || project?.brand?.taste || '');
  const lightThemes = themes.filter(item => !item.dark);
  const darkThemes = themes.filter(item => item.dark);
  const savedBrand = project?.brand || {};
  const activeThemeMeta = themes.find(item => item.id === project?.theme);
  const activeChromeStyle = savedBrand.chromeStyle || activeThemeMeta?.chromeStyle || '';
  const activeCardMaterial = savedBrand.cardMaterial || 'solid';
  const activeIconMode = savedBrand.iconMode || 'explicit';
  const [brandDraft, setBrandDraft] = React.useState(() => ({
    name: savedBrand.name || '',
    primaryColor: savedBrand.primaryColor || '',
    secondaryColor: savedBrand.secondaryColor || '',
    backgroundColor: savedBrand.backgroundColor || '',
    textColor: savedBrand.textColor || '',
    fontFamily: savedBrand.fontFamily || '',
    headingFont: savedBrand.headingFont || '',
    footer: savedBrand.footer || '',
    logo: savedBrand.logo || '',
    chromeStyle: savedBrand.chromeStyle || '',
  }));
  const [absorbing, setAbsorbing] = React.useState(false);
  const [absorbed, setAbsorbed] = React.useState(null);
  const [absorbedName, setAbsorbedName] = React.useState('');
  const [savedVault, setSavedVault] = React.useState(() => readSavedBrands());

  React.useEffect(() => {
    const next = project?.brand || {};
    setBrandDraft({
      name: next.name || '',
      primaryColor: next.primaryColor || '',
      secondaryColor: next.secondaryColor || '',
      backgroundColor: next.backgroundColor || '',
      textColor: next.textColor || '',
      fontFamily: next.fontFamily || '',
      headingFont: next.headingFont || '',
      footer: next.footer || '',
      logo: next.logo || '',
      chromeStyle: next.chromeStyle || '',
    });
  }, [project?.id, project?.revision]);

  const disabled = busy || blocked || absorbing;

  function saveCurrentAbsorbedToVault() {
    if (!absorbed) return;
    const entryBrand = {
      ...(absorbed.sanitizedBrand || {}),
      ...(!absorbed.sanitizedBrand?.chromeStyle && absorbed.recommendedChrome ? { chromeStyle: absorbed.recommendedChrome } : {}),
    };
    if (typeof entryBrand.logo === 'string' && entryBrand.logo.length > 260000) {
      delete entryBrand.logo;
    }
    const label = (absorbedName || entryBrand.name || L('企业模板风格', 'Corporate style')).replace(/\.pptx$/i, '').slice(0, 48);
    const nextItem = {
      id: 'brand-' + Date.now(),
      label,
      theme: absorbed.recommendedTheme || project.theme || 'consulting',
      brand: entryBrand,
    };
    const nextList = [nextItem, ...savedVault.filter(item => item.label !== label)].slice(0, 12);
    setSavedVault(nextList);
    writeSavedBrands(nextList);
    onMessage(L('已收藏到“我的品牌库”，后续任何演示文稿均可一键套用。', 'Saved to My Brand Library for 1-click reuse across future decks.'));
  }

  function removeVaultItem(id) {
    const nextList = savedVault.filter(item => item.id !== id);
    setSavedVault(nextList);
    writeSavedBrands(nextList);
  }

  function renderSwatches(palette) {
    if (!palette || typeof palette !== 'object') return null;
    const colors = [palette.bg, palette.panel, palette.accent, palette.accent2 || palette.fg].filter(c => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c));
    return h('span', { className: 'ppt-swatch-row', 'aria-hidden': 'true' },
      colors.map((hex, idx) => h('span', { key: idx, className: 'ppt-swatch-dot', style: { backgroundColor: hex } })));
  }

  function renderThemeCard(theme) {
    const active = project.theme === theme.id;
    return h('button', {
      type: 'button',
      key: theme.id,
      className: 'ppt-theme-card',
      'data-dsh-card': '',
      'aria-pressed': active ? 'true' : 'false',
      disabled,
      onClick: () => { if (!active) onApplyTheme(theme.id); },
    },
      h('div', { className: 'ppt-theme-card-top' },
        renderSwatches(theme.palette),
        active ? h('span', { className: 'w-tag' }, L('当前使用', 'Active')) : null),
      h('strong', { className: 'ppt-theme-name' }, theme.name || theme.id),
      theme.mood ? h('span', { className: 'ppt-theme-meta' }, theme.mood) : null,
      theme.bestFor ? h('span', { className: 'ppt-theme-meta' }, L('适合：', 'Best for: ') + theme.bestFor) : null);
  }

  function handlePptxFile(file) {
    if (!file) return;
    if (!/\.pptx$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
      onError(L('请选择 24 MiB 以内的 .pptx 参考文件。', 'Choose a reference .pptx file up to 24 MiB.'));
      return;
    }
    setAbsorbing(true);
    onError('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const cleanSlug = file.name.replace(/\.pptx$/i, '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'absorbed-deck';
        const response = await action({
          operation: 'absorb-upload',
          id: project.id,
          expectedRevision: project.revision,
          data: String(reader.result || ''),
          extractLogo: true,
          saveExemplarAs: cleanSlug,
          exemplarName: file.name.replace(/\.pptx$/i, ''),
        });
        setAbsorbed(response.absorbed);
        setAbsorbedName(file.name);
        onMessage(L('已解析参考 PPTX 配色、字体与对比度净化方案，并同步沉淀为可复用标杆范本（' + cleanSlug + '）。', 'Extracted palette, fonts & contrast-sanitized recipe, and saved as reusable Exemplar (' + cleanSlug + ').'));
      } catch (err) {
        onError(err.message || L('解析参考 PPTX 失败。', 'Could not extract style from this PPTX.'));
      } finally {
        setAbsorbing(false);
      }
    };
    reader.onerror = () => {
      setAbsorbing(false);
      onError(L('无法读取该 PPTX 文件，请重试。', 'Could not read the PPTX file. Try again.'));
    };
    reader.readAsDataURL(file);
  }

  function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      onError(L('Logo 请选择 5 MiB 以内的 PNG 或 JPEG 图片。', 'Choose a PNG or JPEG logo up to 5 MiB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBrandDraft(prev => ({ ...prev, logo: String(reader.result || '') }));
      onMessage(L('Logo 已载入，点击下方“应用品牌设置”生效。', 'Logo loaded. Click Apply brand below to save.'));
    };
    reader.onerror = () => onError(L('无法读取图片，请重试。', 'Could not read the image. Try again.'));
    reader.readAsDataURL(file);
  }

  function handleSyncFile(file) {
    if (!file || !onSyncPptx) return;
    if (!/\.pptx$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
      onError(L('请选择 24 MiB 以内的 .pptx 修改稿。', 'Choose an edited .pptx file up to 24 MiB.'));
      return;
    }
    onError('');
    const reader = new FileReader();
    reader.onload = () => {
      onSyncPptx({ data: String(reader.result || ''), fileName: file.name });
    };
    reader.onerror = () => onError(L('无法读取该 PPTX 文件，请重试。', 'Could not read the PPTX file. Try again.'));
    reader.readAsDataURL(file);
  }

  function submitBrand() {
    const payload = {
      name: brandDraft.name.trim(),
      footer: brandDraft.footer.trim(),
      ...(brandDraft.primaryColor.trim() ? { primaryColor: brandDraft.primaryColor.trim() } : {}),
      ...(brandDraft.secondaryColor.trim() ? { secondaryColor: brandDraft.secondaryColor.trim() } : {}),
      ...(brandDraft.backgroundColor.trim() ? { backgroundColor: brandDraft.backgroundColor.trim() } : {}),
      ...(brandDraft.textColor.trim() ? { textColor: brandDraft.textColor.trim() } : {}),
      ...(brandDraft.fontFamily.trim() ? { fontFamily: brandDraft.fontFamily.trim() } : {}),
      ...(brandDraft.headingFont.trim() ? { headingFont: brandDraft.headingFont.trim() } : {}),
      ...(brandDraft.chromeStyle ? { chromeStyle: brandDraft.chromeStyle } : savedBrand.chromeStyle ? { chromeStyle: null } : {}),
      ...(brandDraft.logo ? { logo: brandDraft.logo } : savedBrand.logo ? { logo: null } : {}),
    };
    onApplyBrand(payload);
  }

  return h('section', { className: 'card ppt-style-studio', 'data-dsh-card': '', 'aria-label': L('风格与母版工作室', 'Style & Master Studio') },
    h('style', null, PPT_STYLE_STUDIO_CSS),
    h('h3', null, L('风格与母版工作室', 'Style & Master Studio')),
    h('p', { className: 'muted' }, L('无需手调设计参数：可一键直吸名家范本、切换 24 套大师明暗主题，或拖拽企业参考 PPTX 提取配色、双字体、封面反白与母版骨架。所有更改同步更新 HTML 与可编辑 PPTX，且支持撤销。', 'Apply curated master deck DNA in one click, switch 24 themes, or drop a reference .pptx to absorb its palette, font pairing, cover polarity, and skeleton with undo.')),
    blocked ? h('p', { className: 'dirty' }, L('请先保存或取消“内容编辑 / 数据推演”中的未保存修改，再切换全稿风格。', 'Save or discard unsaved content or scenario edits before restyling the presentation.')) : null,

    tasteRecipes.length > 0 ? h('div', { className: 'ppt-theme-section' },
      h('div', { className: 'ppt-theme-card-top' },
        h('h4', null, L('大师审美配方（8 大流派一键换灵魂）', 'Aesthetic Taste Recipes (8 Design Schools)')),
        activeTasteId ? h('button', {
          type: 'button',
          className: 'ppt-pill',
          disabled,
          onClick: () => onApplyAbsorbed({ taste: null }),
        }, L('清除配方', 'Clear recipe')) : null),
      h('p', { className: 'muted' }, L('一键同步切换海报级封面构图、卡片材质（无框/玻璃/出版双线）、议程进度章节页、原生矢量图标与图表聚光灯标注。', 'Atomically applies poster covers, surface materiality (frameless/glass/editorial), live agenda chapters, native vector icons, and spotlight charts.')),
      h('div', { className: 'ppt-theme-grid', role: 'group', 'aria-label': L('大师审美配方', 'Aesthetic Taste Recipes') }, tasteRecipes.map(recipe => {
        const isCurrent = activeTasteId === recipe.id;
        const sw = Array.isArray(recipe.swatches) ? recipe.swatches : [];
        return h('button', {
          type: 'button',
          key: recipe.id,
          className: 'ppt-theme-card',
          'data-dsh-card': '',
          'data-taste-id': recipe.id,
          'aria-pressed': isCurrent ? 'true' : 'false',
          disabled,
          onClick: () => onApplyAbsorbed({ taste: recipe.id }),
        },
          h('div', { className: 'ppt-theme-card-top' },
            h('span', { className: 'ppt-swatch-row', 'aria-hidden': 'true' },
              sw.slice(0, 4).map((hex, si) => h('span', { key: si, className: 'ppt-swatch-dot', style: { backgroundColor: hex } }))),
            isCurrent ? h('span', { className: 'w-tag' }, L('已应用', 'Active')) : (!recipe.builtin ? h('span', { className: 'w-tag' }, L('已吸收', 'Absorbed')) : null)),
          h('strong', { className: 'ppt-theme-name', 'data-dsh-serif': '' }, languageOf() === 'en' ? (recipe.enName || recipe.name) : recipe.name),
          h('span', { className: 'ppt-theme-meta' }, languageOf() === 'en' ? (recipe.enDescription || recipe.description) : recipe.description));
      }))) : null,

    h('div', { className: 'ppt-theme-section' },
      h('h4', null, L('卡片材质与原生矢量图标', 'Surface Materiality & Native Vector Icons')),
      h('div', { className: 'ppt-archetype-pills', role: 'group', 'aria-label': L('卡片材质', 'Card materiality') }, [
        ['solid', '实心卡片', 'Solid cards'],
        ['frameless', '无框发丝线', 'Frameless'],
        ['glass', '玻璃拟态', 'Glass'],
        ['editorial-rule', '出版物双线', 'Editorial rule'],
      ].map(([id, zh, en]) => h('button', {
        type: 'button',
        key: id,
        className: 'ppt-pill',
        'aria-pressed': activeCardMaterial === id ? 'true' : 'false',
        disabled,
        onClick: () => onApplyBrand({ cardMaterial: id }),
      }, L(zh, en)))),
      h('div', { className: 'ppt-archetype-pills', role: 'group', 'aria-label': L('矢量图标模式', 'Vector icon mode') }, [
        ['auto', '自动语义图标', 'Auto semantic icons'],
        ['explicit', '仅显式图标', 'Explicit icons'],
        ['off', '关闭图标', 'Icons off'],
      ].map(([id, zh, en]) => h('button', {
        type: 'button',
        key: id,
        className: 'ppt-pill',
        'aria-pressed': activeIconMode === id ? 'true' : 'false',
        disabled,
        onClick: () => onApplyBrand({ iconMode: id }),
      }, L(zh, en))))),

    savedVault.length > 0 ? h('div', { className: 'ppt-theme-section' },
      h('h4', null, L('我的已收藏企业品牌（一键复用）', 'My Saved Brand Presets')),
      h('div', { className: 'ppt-theme-grid' }, savedVault.map(item =>
        h('div', { key: item.id, className: 'ppt-theme-card', 'data-dsh-card': '' },
          h('div', { className: 'ppt-theme-card-top' },
            renderSwatches({ bg: item.brand?.backgroundColor, accent: item.brand?.primaryColor, accent2: item.brand?.secondaryColor, fg: item.brand?.textColor }),
            h('button', { type: 'button', className: 'ppt-pill', disabled, onClick: () => removeVaultItem(item.id) }, L('移除', 'Remove'))),
          h('strong', { className: 'ppt-theme-name' }, item.label),
          h('button', {
            type: 'button',
            className: 'ppt-pill',
            disabled,
            onClick: () => onApplyAbsorbed({ theme: item.theme, brand: item.brand }),
          }, L('套用此品牌', 'Apply brand')))))) : null,

    masterPresets.length > 0 ? h('div', { className: 'ppt-theme-section' },
      h('h4', null, L('名家范本一键直吸（免上传 .pptx）', 'World-Class Reference Deck Presets')),
      h('div', { className: 'ppt-theme-grid' }, masterPresets.map(preset => {
        const isCurrent = project.theme === preset.theme && (savedBrand.chromeStyle || activeChromeStyle) === (preset.brand?.chromeStyle || preset.chromeStyle);
        return h('button', {
          type: 'button',
          key: preset.id,
          className: 'ppt-theme-card',
          'data-dsh-card': '',
          'aria-pressed': isCurrent ? 'true' : 'false',
          disabled,
          onClick: () => onApplyAbsorbed({ theme: preset.theme, brand: preset.brand }),
        },
          h('div', { className: 'ppt-theme-card-top' },
            renderSwatches({ bg: preset.brand?.backgroundColor || '#FFFFFF', accent: preset.brand?.primaryColor, accent2: preset.brand?.secondaryColor, fg: preset.brand?.textColor || '#0F172A' }),
            isCurrent ? h('span', { className: 'w-tag' }, L('已匹配', 'Active')) : null),
          h('strong', { className: 'ppt-theme-name' }, preset.name),
          preset.sourceStyle ? h('span', { className: 'ppt-theme-meta' }, preset.sourceStyle) : null);
      }))) : null,

    lightThemes.length > 0 ? h('div', { className: 'ppt-theme-section' },
      h('h4', null, L('明亮投影与政务/咨询/学术推荐（', 'Projector-safe daylight themes (') + lightThemes.length + L(' 套）', ')')),
      h('div', { className: 'ppt-theme-grid' }, lightThemes.map(renderThemeCard))) : null,

    darkThemes.length > 0 ? h('div', { className: 'ppt-theme-section' },
      h('h4', null, L('沉浸舞台与科技路演深色主题（', 'Keynote & stage dark themes (') + darkThemes.length + L(' 套）', ')')),
      h('div', { className: 'ppt-theme-grid' }, darkThemes.map(renderThemeCard))) : null,

    h('div', { className: 'ppt-theme-section' },
      h('div', { className: 'ppt-theme-card-top' },
        h('h4', null, L('母版骨架（6 套结构规范）', 'Master Skeleton (6 Chrome Styles)')),
        savedBrand.chromeStyle ? h('button', {
          type: 'button',
          className: 'ppt-pill',
          disabled,
          onClick: () => onApplyBrand({ chromeStyle: null }),
        }, L('恢复主题默认', 'Theme default')) : null),
      h('p', { className: 'muted' }, L('改变页眉分割线、圆角几何、页码位置与卡片装饰结构，可独立于配色切换。', 'Switch header dividers, card corner geometry, folio placement, and card accents independently from colours.')),
      h('div', { className: 'ppt-theme-grid', role: 'group', 'aria-label': L('母版骨架', 'Master Skeleton') },
        PPT_CHROME_SKELETONS.map(sk => {
          const pressed = savedBrand.chromeStyle ? savedBrand.chromeStyle === sk.id : activeChromeStyle === sk.id;
          return h('button', {
            type: 'button',
            key: sk.id,
            className: 'ppt-theme-card',
            'data-dsh-card': '',
            'data-chrome-style': sk.id,
            'aria-pressed': pressed ? 'true' : 'false',
            disabled,
            onClick: () => onApplyBrand({ chromeStyle: sk.id }),
          },
            h('div', { className: 'ppt-theme-card-top' },
              h('strong', { className: 'ppt-theme-name', 'data-dsh-serif': '' }, L(sk.zh, sk.en)),
              pressed ? h('span', { className: 'w-tag' }, savedBrand.chromeStyle ? L('已指定', 'Override') : L('默认', 'Default')) : null),
            h('span', { className: 'ppt-theme-meta' }, L(sk.descZh, sk.descEn)));
        }))),

    h('details', { className: 'ppt-structured-section', open: true },
      h('summary', null, L('吸收外部优质 PPTX 风格（零本地路径暴露）', 'Absorb style from reference .pptx')),
      h('p', { className: 'muted' }, L('上传公司模板或喜欢的参考 .pptx（≤24 MiB）：深度解析母版主辅色、中英文标题/正文字体配对、封面深底反白、母版 Logo 与逐页版式序列，自动完成 WCAG ≥4.5:1 对比度净化。', 'Upload a corporate template or reference .pptx (≤24 MiB) to extract dual brand colours, heading/body fonts, cover polarity, logo, and slide archetypes with WCAG ≥4.5:1 clamping.')),
      h('div', {
        className: 'ppt-dropzone',
        onDragOver: e => { e.preventDefault(); },
        onDrop: e => { e.preventDefault(); if (!disabled) handlePptxFile(e.dataTransfer?.files?.[0]); },
      },
        h('label', { htmlFor: controlId + '-absorb-pptx' }, absorbing ? L('正在解析参考 PPTX…', 'Extracting reference PPTX style…') : L('拖拽 .pptx 到此处，或点击选择参考文件', 'Drop a .pptx here, or choose a reference file')),
        h('input', {
          id: controlId + '-absorb-pptx',
          type: 'file',
          accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
          disabled,
          onChange: e => { const f = e.target.files?.[0]; e.target.value = ''; handlePptxFile(f); },
        })),
      absorbed ? h('div', { className: 'ppt-absorbed-card', 'data-dsh-card': '' },
        h('strong', null, L('已提取风格方案：', 'Extracted style: ') + absorbedName + ' · ' + (absorbed.slideCount ?? 0) + L(' 页', ' slides')),
        absorbed.recommendedTheme ? h('p', { className: 'muted' }, L('匹配基底主题：', 'Recommended base theme: ') + absorbed.recommendedTheme + (absorbed.recommendedChrome ? ' · ' + L('推荐母版骨架：', 'Recommended skeleton: ') + pptChromeLabel(absorbed.recommendedChrome) + ' (' + absorbed.recommendedChrome + ')' : '')) : null,
        absorbed.extractedSkeleton ? h('p', { className: 'muted' },
          L('骨架几何：', 'Extracted geometry: ') +
          (absorbed.extractedSkeleton.cornerStyle || 'rounded') +
          (absorbed.extractedSkeleton.hasTopBanner ? L(' · 顶部通栏横幅', ' · Top banner') : '') +
          (absorbed.extractedSkeleton.hasSideSpine ? L(' · 侧边装饰脊', ' · Side spine') : '') +
          (absorbed.sanitizedBrand?.coverMode === 'inverted-accent' ? L(' · 深色庄重封面+浅色正文', ' · Inverted cover + daylight body') : '') +
          (typeof absorbed.extractedSkeleton.masterShapeCount === 'number' ? ' · ' + absorbed.extractedSkeleton.masterShapeCount + L(' 个母版形状', ' master shapes') : '')) : null,
        Array.isArray(absorbed.slideSkeleton) && absorbed.slideSkeleton.length > 0 ? h('p', { className: 'muted' },
          L('页面骨架序列：', 'Slide sequence: ') + absorbed.slideSkeleton.slice(0, 10).map(s => 'P' + s.slideNumber + ':' + s.inferredLayout + (s.variant ? '[' + s.variant + ']' : '')).join(' → ') + (absorbed.slideSkeleton.length > 10 ? ' …' : '')) : null,
        absorbed.narrativeProfile && typeof absorbed.narrativeProfile.diagramRatio === 'number' ? h('p', { className: 'muted' },
          L('版式诊断：专业图示占比 ', 'Layout recipe: diagram ratio ') + Math.round(absorbed.narrativeProfile.diagramRatio * 100) + '%' +
          (absorbed.recommendedTableStyle ? ' · ' + L('推荐表格：', 'Table style: ') + absorbed.recommendedTableStyle : '') +
          (absorbed.styleRecipe && typeof absorbed.styleRecipe.whitespaceRatio === 'number'
            ? ' · ' + L('留白率 ', 'Whitespace ') + Math.round(absorbed.styleRecipe.whitespaceRatio * 100) + '% · ' + L('材质 ', 'Material ') + absorbed.styleRecipe.cardMaterial
            : '')) : null,
        absorbed.sanitizedBrand ? h('div', { className: 'ppt-swatch-row' },
          [absorbed.sanitizedBrand.backgroundColor, absorbed.sanitizedBrand.primaryColor, absorbed.sanitizedBrand.secondaryColor, absorbed.sanitizedBrand.textColor].filter(Boolean).map((hex, i) =>
            h('span', { key: i, className: 'ppt-swatch-chip' },
              h('span', { className: 'ppt-swatch-dot', style: { backgroundColor: hex } }),
              h('code', null, hex)))) : null,
        (absorbed.sanitizedBrand?.fontFamily || absorbed.sanitizedBrand?.headingFont) ? h('p', { className: 'muted' },
          L('安全字体映射：', 'Safe font pairing: ') + [absorbed.sanitizedBrand.headingFont ? L('标题 ', 'Heading ') + absorbed.sanitizedBrand.headingFont : '', absorbed.sanitizedBrand.fontFamily ? L('正文 ', 'Body ') + absorbed.sanitizedBrand.fontFamily : ''].filter(Boolean).join(' · ')) : null,
        Array.isArray(absorbed.warnings) && absorbed.warnings.length > 0 ? h('p', { className: 'muted' }, absorbed.warnings.join(' ')) : null,
        absorbed.sanitizedBrand?.logo ? h('img', { className: 'image-preview', src: absorbed.sanitizedBrand.logo, alt: L('提取的母版 Logo', 'Extracted master logo') }) : null,
        h('div', { className: 'tools' },
          absorbed.styleRecipe ? h('button', {
            type: 'button',
            className: 'primary',
            disabled,
            onClick: () => onApplyAbsorbed({ taste: absorbed.styleRecipe }),
          }, L('套用完整品味配方（含材质与节奏）', 'Apply full absorbed Taste Recipe')) : null,
          h('button', {
            type: 'button',
            className: absorbed.styleRecipe ? '' : 'primary',
            disabled,
            onClick: () => onApplyAbsorbed({
              theme: absorbed.recommendedTheme || project.theme,
              brand: absorbed.sanitizedBrand || absorbed.recommendedChrome
                ? { ...(absorbed.sanitizedBrand || {}), ...(!absorbed.sanitizedBrand?.chromeStyle && absorbed.recommendedChrome ? { chromeStyle: absorbed.recommendedChrome } : {}) }
                : null,
            }),
          }, L('仅应用吸收的配色与字体', 'Apply palette & fonts only')),
          h('button', { type: 'button', disabled, onClick: saveCurrentAbsorbedToVault }, L('收藏到我的品牌库', 'Save to My Brand Library')),
          h('button', { type: 'button', disabled, onClick: () => { setAbsorbed(null); setAbsorbedName(''); } }, L('清除预览', 'Dismiss')))) : null),

    h('details', { className: 'ppt-structured-section', open: false },
      h('summary', null, L('导入 Office 修改稿（导回更新当前工程，支持撤销）', 'Sync Edited .pptx (Round-trip Office edits into project)')),
      h('p', { className: 'muted' }, L('在 PowerPoint / WPS 微调文字、表格、图表或演讲备注后，可直接将修改后的 .pptx（≤24 MiB）导回当前工程并重建 HTML 与工程快照；支持随时撤销，零数据丢失。', 'After polishing text, tables, charts, or speaker notes in PowerPoint / WPS, upload the edited .pptx (≤24 MiB) to sync changes back into this project as an undoable revision.')),
      h('div', {
        className: 'ppt-dropzone',
        onDragOver: e => { e.preventDefault(); },
        onDrop: e => { e.preventDefault(); if (!disabled) handleSyncFile(e.dataTransfer?.files?.[0]); },
      },
        h('label', { htmlFor: controlId + '-sync-pptx' }, L('导入 Office 修改稿 / Sync Edited .pptx', 'Sync Edited .pptx')),
        h('input', {
          id: controlId + '-sync-pptx',
          type: 'file',
          accept: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',
          disabled,
          onChange: e => { const f = e.target.files?.[0]; e.target.value = ''; handleSyncFile(f); },
        }))),

    h('details', { className: 'ppt-structured-section', open: Boolean(project.brand) },
      h('summary', null, L('自定义品牌色、安全字体、Logo 与页脚', 'Custom brand colours, font, logo & footer')),
      h('div', { className: 'ppt-archetype-subgrid' },
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-primary' }, L('主强调色 (#RRGGBB)', 'Primary (#RRGGBB)')),
          h('div', { className: 'ppt-color-pair' },
            h('input', { type: 'color', 'aria-label': L('选择主强调色', 'Pick primary colour'), value: /^#[0-9A-Fa-f]{6}$/.test(brandDraft.primaryColor) ? brandDraft.primaryColor : '#0057B8', disabled, onChange: e => setBrandDraft({ ...brandDraft, primaryColor: e.target.value.toUpperCase() }) }),
            h('input', { id: controlId + '-brand-primary', value: brandDraft.primaryColor, disabled, placeholder: '#0057B8', onChange: e => setBrandDraft({ ...brandDraft, primaryColor: e.target.value }) }))),
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-secondary' }, L('辅助色 (#RRGGBB)', 'Secondary (#RRGGBB)')),
          h('div', { className: 'ppt-color-pair' },
            h('input', { type: 'color', 'aria-label': L('选择辅助色', 'Pick secondary colour'), value: /^#[0-9A-Fa-f]{6}$/.test(brandDraft.secondaryColor) ? brandDraft.secondaryColor : '#0E7490', disabled, onChange: e => setBrandDraft({ ...brandDraft, secondaryColor: e.target.value.toUpperCase() }) }),
            h('input', { id: controlId + '-brand-secondary', value: brandDraft.secondaryColor, disabled, placeholder: '#0E7490', onChange: e => setBrandDraft({ ...brandDraft, secondaryColor: e.target.value }) }))),
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-bg' }, L('背景色 (#RRGGBB)', 'Background (#RRGGBB)')),
          h('div', { className: 'ppt-color-pair' },
            h('input', { type: 'color', 'aria-label': L('选择背景色', 'Pick background colour'), value: /^#[0-9A-Fa-f]{6}$/.test(brandDraft.backgroundColor) ? brandDraft.backgroundColor : '#FFFFFF', disabled, onChange: e => setBrandDraft({ ...brandDraft, backgroundColor: e.target.value.toUpperCase() }) }),
            h('input', { id: controlId + '-brand-bg', value: brandDraft.backgroundColor, disabled, placeholder: '#FFFFFF', onChange: e => setBrandDraft({ ...brandDraft, backgroundColor: e.target.value }) }))),
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-fg' }, L('正文色 (#RRGGBB)', 'Text (#RRGGBB)')),
          h('div', { className: 'ppt-color-pair' },
            h('input', { type: 'color', 'aria-label': L('选择正文色', 'Pick text colour'), value: /^#[0-9A-Fa-f]{6}$/.test(brandDraft.textColor) ? brandDraft.textColor : '#0F172A', disabled, onChange: e => setBrandDraft({ ...brandDraft, textColor: e.target.value.toUpperCase() }) }),
            h('input', { id: controlId + '-brand-fg', value: brandDraft.textColor, disabled, placeholder: '#0F172A', onChange: e => setBrandDraft({ ...brandDraft, textColor: e.target.value }) }))),
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-font' }, L('正文安全字体', 'Body font family')),
          h('input', { id: controlId + '-brand-font', value: brandDraft.fontFamily, disabled, placeholder: 'Microsoft YaHei', onChange: e => setBrandDraft({ ...brandDraft, fontFamily: e.target.value }) })),
        h('div', null,
          h('label', { htmlFor: controlId + '-brand-heading-font' }, L('标题字体（可选衬线配对）', 'Heading font (optional)')),
          h('input', { id: controlId + '-brand-heading-font', value: brandDraft.headingFont, disabled, placeholder: 'Georgia', onChange: e => setBrandDraft({ ...brandDraft, headingFont: e.target.value }) }))),
      h('label', { htmlFor: controlId + '-brand-chrome' }, L('母版骨架覆盖（chromeStyle）', 'Master skeleton override (chromeStyle)')),
      h('select', {
        id: controlId + '-brand-chrome',
        value: brandDraft.chromeStyle,
        disabled,
        onChange: e => setBrandDraft({ ...brandDraft, chromeStyle: e.target.value }),
      },
        h('option', { value: '' }, L('跟随主题默认', 'Theme default')),
        PPT_CHROME_SKELETONS.map(sk => h('option', { key: sk.id, value: sk.id }, L(sk.zh, sk.en)))),
      h('label', { htmlFor: controlId + '-brand-footer' }, L('统一页脚文字', 'Shared footer')),
      h('input', { id: controlId + '-brand-footer', value: brandDraft.footer, disabled, maxLength: 200, placeholder: L('例如：战略发展部 · 2026 Q4', 'e.g. Strategy Team · 2026'), onChange: e => setBrandDraft({ ...brandDraft, footer: e.target.value }) }),
      h('label', { htmlFor: controlId + '-brand-logo' }, L('上传品牌 Logo（PNG / JPEG）', 'Upload brand logo (PNG / JPEG)')),
      h('input', { id: controlId + '-brand-logo', type: 'file', accept: 'image/png,image/jpeg', disabled, onChange: handleLogoUpload }),
      brandDraft.logo ? h('div', { className: 'tools' },
        h('img', { className: 'image-preview', src: brandDraft.logo, alt: L('当前品牌 Logo', 'Current brand logo') }),
        h('button', { type: 'button', disabled, onClick: () => setBrandDraft({ ...brandDraft, logo: '' }) }, L('移除 Logo', 'Clear logo'))) : null,
      h('div', { className: 'tools' },
        h('button', { type: 'button', className: 'primary', disabled, onClick: submitBrand }, L('应用品牌设置', 'Apply brand')),
        project.brand ? h('button', { type: 'button', disabled, onClick: () => onApplyBrand(null) }, L('恢复默认主题无品牌状态', 'Clear custom brand')) : null)));
}

const PPT_STYLE_STUDIO_CSS = `
.ppt-workbench .ppt-archetype-box{border-bottom:1px solid var(--w-border);padding-bottom:16px;margin-bottom:16px}
.ppt-workbench .ppt-archetype-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ppt-workbench .ppt-pill{font-size:12px;padding:5px 10px;border-radius:999px;border:1px solid var(--w-border);background:var(--w-bg);color:var(--w-text);cursor:pointer}
.ppt-workbench .ppt-pill[aria-pressed=true]{background:var(--w-selected);border-color:var(--w-accent);color:var(--w-accent);font-weight:600}
.ppt-workbench .ppt-archetype-subgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;margin-top:8px}
.ppt-workbench .ppt-structured-section{border-top:1px solid var(--w-border);margin-top:14px;padding-top:12px}
.ppt-workbench .ppt-item-editor{border:1px solid var(--w-border);border-radius:8px;padding:10px;margin-top:10px;background:var(--w-soft)}
.ppt-workbench .ppt-item-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}
.ppt-workbench .ppt-theme-section{margin:16px 0}
.ppt-workbench .ppt-theme-section h4{font-size:13px;color:var(--w-muted);margin:0 0 10px;font-weight:600}
.ppt-workbench .ppt-theme-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ppt-workbench .ppt-theme-card{display:flex;flex-direction:column;gap:5px;padding:10px;border-radius:10px;border:1px solid var(--w-border);background:var(--w-bg);text-align:start;cursor:pointer;min-width:0}
.ppt-workbench .ppt-theme-card:not(:disabled):hover{background:var(--w-soft)}
.ppt-workbench .ppt-theme-card[aria-pressed=true]{border-color:var(--w-accent);background:var(--w-selected)}
.ppt-workbench .ppt-theme-card-top{display:flex;justify-content:space-between;align-items:center;gap:6px;width:100%}
.ppt-workbench .ppt-theme-name{font-size:13px;line-height:1.35;color:var(--w-text)}
.ppt-workbench .ppt-theme-meta{font-size:11px;line-height:1.4;color:var(--w-muted)}
.ppt-workbench .ppt-swatch-row{display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap}
.ppt-workbench .ppt-swatch-dot{width:14px;height:14px;border-radius:50%;border:1px solid var(--w-border);display:inline-block;flex-shrink:0}
.ppt-workbench .ppt-swatch-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border:1px solid var(--w-border);border-radius:999px;background:var(--w-bg);font-size:11px}
.ppt-workbench .ppt-dropzone{border:1px dashed var(--w-border);border-radius:10px;padding:12px;margin-top:8px;background:var(--w-soft)}
.ppt-workbench .ppt-absorbed-card{border:1px solid var(--w-border);border-radius:10px;padding:12px;margin-top:10px;background:var(--w-bg);display:flex;flex-direction:column;gap:8px}
.ppt-workbench .ppt-color-pair{display:grid;grid-template-columns:34px minmax(0,1fr);gap:6px;align-items:center}
.ppt-workbench .ppt-color-pair input[type=color]{width:34px;height:34px;padding:2px;border:1px solid var(--w-border);border-radius:8px;background:var(--w-bg);cursor:pointer}
@container dsh-workbench (max-width:760px){.ppt-workbench .ppt-theme-grid,.ppt-workbench .ppt-archetype-subgrid{grid-template-columns:1fr}}
`;

// Spotlight tour configuration and clipboard helper for dsh-ppt Workbench.
// Uses only host/workbench CSS tokens (--w-*, --dsw-alias-*) via W.CoachmarkTour.

const PPT_TOUR_STORAGE_KEY = 'dsh-ppt.tour.v1';

function buildPptTourSteps({ project, pptText }) {
  return [
    {
      id: 'start',
      selector: '[data-tour="ppt-start"]',
      fallback: '.w-header-actions',
      side: 'bottom',
      title: pptText('新建、体验旗舰示例或直导 Excel / Word / PPTX', 'Create, load Flagship Demo, or import Office files'),
      desc: pptText(
        '点击顶栏「新建演示文稿」、「导入 Excel / Word (.xlsx/.csv/.docx)」或「导入 PPTX 翻新」，也可一键体验旗舰示例，或复制下方指令发到对话生成：',
        'Use New presentation, Import Excel/Word (.xlsx/.csv/.docx), Import & Modernize .pptx, Load Flagship Demo, or copy this chat prompt:',
      ),
      prompt: pptText(
        '请根据当前工作区材料制作一份结构清晰的演示文稿，输出 HTML、可编辑 PPTX 与工程包。',
        'Create a structured presentation from workspace materials and export HTML, editable PPTX, and project JSON.',
      ),
      promptLabel: pptText('复制对话生成指令', 'Copy generation prompt'),
    },
    {
      id: 'edit',
      selector: project ? '[data-tour="ppt-edit"]' : '[data-tour="ppt-library"]',
      fallback: project ? '.ppt-canvas-region' : '.w-empty',
      side: 'bottom',
      title: pptText('24+ 版式、Mermaid 原生流程图、LaTeX 与演讲时长预算', '24+ layouts, native Mermaid, LaTeX & pace budget'),
      desc: pptText(
        '点击画布文字即可定位输入框，在「内容编辑」切换 KPI、桑基图、不等宽市场图、Mermaid 流程图/时序图与原生公式，并实时监控目标演讲时长与超时提醒。',
        'Click slide text to focus its field, switch among 24+ layouts, Mermaid flowcharts/sequences, and native math, and monitor target speaking duration.',
      ),
    },
    {
      id: 'style',
      selector: '[data-tour="ppt-style"]',
      fallback: '.dsh-style-switcher',
      side: 'bottom',
      title: pptText('24 套大师主题、6 套母版骨架与企业模板吸收', '24 master themes, 6 skeletons & template absorb'),
      desc: pptText(
        '在「风格与母版」切换 24 套明暗主题与 6 套母版骨架，一键直吸名家范本，或上传参考 .pptx 自动提取配色、字体与 Logo。',
        'Switch 24 themes, 6 chrome skeletons, and 8 master presets in Style Studio, or absorb palette, fonts, and logo from a company .pptx.',
      ),
    },
    {
      id: 'deliver',
      selector: '[data-tour="ppt-deliver"]',
      fallback: '.w-header-actions',
      side: 'bottom',
      title: pptText('双屏提词、高管一页纸 (.html) 与 Remotion 视频分镜包', 'Dual-screen presenter, One-Pager & Remotion bundle'),
      desc: pptText(
        '独立放映按 P 开双屏提词台（L 激光笔）；在「下载成品」可导出高管一页纸 (.html)、dsh-remotion 视频分镜包 (.zip)、演讲讲义与可编辑 PPTX。',
        'Press P in standalone HTML for Dual-Screen Presenter View (L laser), or export Executive One-Pager (.html), Remotion video bundle (.zip), handout, and PPTX.',
      ),
    },
  ];
}

async function copyPptTourPrompt(text, { setMessage, pptText }) {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setMessage?.(pptText('已复制对话提示词，可直接粘贴到聊天框发送。', 'Prompt copied. Paste it into chat to generate.'));
      return true;
    }
  } catch (_) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = String(text);
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append?.(ta);
    ta.select?.();
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : true;
    ta.remove?.();
    if (ok) {
      setMessage?.(pptText('已复制对话提示词，可直接粘贴到聊天框发送。', 'Prompt copied. Paste it into chat to generate.'));
    }
    return ok;
  } catch (_) {
    return false;
  }
}

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
            "演示文稿": "Presentations",
            "底栏结论条": "Bottom takeaway",
            "数据来源": "Source citation",
            "数学公式 (LaTeX)": "Math formula (LaTeX)",
            "Mermaid 流程图 / 时序图": "Mermaid Diagram",
            "下载演讲讲义 (.md)": "Download Handout",
            "下载高管一页纸 (.html)": "Download Executive One-Pager (.html)",
            "导出 Remotion 视频分镜包 (.zip)": "Export Remotion Video Bundle (.zip)",
            "一键体验旗舰示例": "Load Flagship Demo",
            "导入 Excel / Word": "Import Excel / Word",
            "导入 PPTX 翻新": "Import & Modernize .pptx",
            "导入 Office 修改稿": "Sync Edited .pptx",
            "HTML + PPTX 并排对比": "Side-by-side HTML & PPTX",
            "查看此页": "Jump to slide",
            "已切换全稿主题，HTML、PPTX 和工程文件已同步更新，可撤销。": "Theme updated across HTML, PPTX and project files. You can undo this change.",
            "品牌与母版设置已更新，可撤销。": "Brand and master settings updated. You can undo this change.",
            "已新增一页，可继续编辑或撤销。": "New slide added. You can edit it or undo this change.",
            "代码片段": "Code snippet",
            "编程语言": "Language",
            "文件名 / 地址": "Filename",
            "页面地址 (URL)": "Page URL",
            "横轴标签": "X-axis label",
            "纵轴标签": "Y-axis label",
            "导出高精 PDF (.pdf)": "Export High-DPI PDF (.pdf)",
            "导出逐页 PNG 图包 (.zip)": "Export Slide PNG Pack (.zip)",
            "已直接编辑文字并同步更新 HTML 与 PPTX。": "Inline text updated across HTML and PPTX."
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
        const fields = [['title', '标题'], ['subtitle', '副标题'], ['kicker', '眉题'], ['takeaway', '底栏结论条'], ['source', '数据来源'], ['formula', '数学公式 (LaTeX)'], ['mermaid', 'Mermaid 流程图 / 时序图'], ['code', '代码片段'], ['language', '编程语言'], ['filename', '文件名 / 地址'], ['url', '页面地址 (URL)'], ['xLabel', '横轴标签'], ['yLabel', '纵轴标签'], ['text', '正文'], ['bullets', '要点（每行一条）'], ['notes', '演讲备注']];
        const css = `
  .pptw {--fg:var(--dsw-alias-label-primary,var(--w-text,#1e293b));--fg-muted:var(--dsw-alias-label-secondary,var(--w-muted,#64748b));--bg:var(--dsw-alias-bg-base,var(--w-canvas,#fff));--bg-surface:var(--dsw-alias-bg-layer-1,var(--w-bg,#f8fafc));--border:var(--dsw-alias-border-l2,var(--w-border,#e2e8f0));color:var(--fg);min-width:0}
  .pptw *{box-sizing:border-box}.pptw h2{font-size:20px;margin:0}.pptw h3{font-size:15.5px;margin:10px 0 6px}
  .pptw .muted{color:var(--w-muted,#64748b);font-size:12.5px}.pptw .tools{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;align-items:center}
  .pptw button:not(.w-button):not(.dsh-style-trigger):not(.dsh-font-trigger):not(.dsh-style-fallback-item):not(.ppt-slide-card):not(.ppt-theme-card):not(.ppt-pill):not([role=tab]):not(.w-row-button){font:inherit;border:var(--dsh-control-border-width,1px) solid var(--w-border,#e2e8f0);border-radius:var(--dsw-radius-sm,8px);background:var(--w-bg,#f8fafc);color:inherit;padding:6px 11px;cursor:pointer;text-align:start;white-space:normal}
  .pptw button.primary{background:var(--w-primary,#4176e6);border-color:var(--w-primary,#4176e6);color:var(--w-on-primary,#fff)}.pptw button:disabled{opacity:.48;cursor:not-allowed}
  .pptw input:not([type=file]):not([type=checkbox]):not([type=radio]):not([type=range]),.pptw textarea,.pptw select{font:inherit;color:inherit;width:100%;background:var(--dsw-alias-bg-base,var(--w-bg,#fff));border:var(--dsh-control-border-width,1px) solid var(--w-border,#e2e8f0);border-radius:var(--dsw-radius-sm,8px);padding:7px 10px}
  .pptw .w-input>input{border:0!important;background:transparent!important;padding:5px 0!important}
  .pptw textarea{resize:vertical}.pptw label:not(.w-checkbox){display:block;margin:8px 0 3px}.pptw .layout{display:grid;grid-template-columns:minmax(130px,190px) minmax(0,1fr);gap:14px}
  .pptw .pages{display:flex;flex-direction:column;gap:5px;max-height:480px;overflow:auto}.pptw .pages button[aria-current=true]{background:var(--w-selected,#e9eefc);color:var(--w-accent,#4176e6);border-color:var(--w-accent,#4176e6)}
  .pptw .preview{border:var(--dsh-control-border-width,1px) solid var(--w-border,#e2e8f0);border-radius:var(--dsw-radius-md,10px);overflow:clip;background:var(--w-soft,#f0f4fa);aspect-ratio:16/9;position:relative}
  .pptw iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.pptw .render-page{width:100%;display:block}.pptw .preview .ppt-fullscreen-exit{display:none}.pptw .preview:fullscreen .ppt-fullscreen-exit{display:inline-flex;position:absolute;top:10px;inset-inline-end:10px;z-index:2}
  .pptw .notice{border-radius:var(--dsw-radius-sm,8px);padding:10px 12px;margin:10px 0;background:color-mix(in oklab,var(--w-accent,#4176e6) 10%,var(--w-bg,#f8fafc));color:var(--w-text);overflow-wrap:anywhere}.pptw .error{background:color-mix(in oklab,var(--dsw-alias-state-error-primary,#c83240) 12%,var(--w-bg,#f8fafc))}
  .pptw .card{border:var(--dsh-control-border-width,1px) solid var(--w-border,#e2e8f0);border-radius:var(--dsw-radius-md,10px);padding:12px;margin:10px 0;background:var(--w-bg,#f8fafc)}
  .pptw .coaching{margin-top:20px}.pptw .coaching-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px}
  .pptw .coaching .choice{margin:6px 0}.pptw .coaching input[type=checkbox]{width:16px;flex:none;margin-top:3px}
  .pptw .coaching pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;margin:6px 0}.pptw .coaching blockquote{margin:8px 0;padding-inline-start:12px;border-inline-start:3px solid var(--w-border,#e2e8f0);overflow-wrap:anywhere}
  .pptw .coaching .card{overflow-wrap:anywhere}.pptw .coaching .before-after{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .pptw .project-list{display:flex;flex-direction:column;gap:8px}.pptw .project-list button{width:100%;justify-content:flex-start}
  .pptw .file{font-size:12px;overflow-wrap:anywhere}.pptw .image-preview{width:100%;max-height:160px;object-fit:contain;background:var(--w-soft,#f0f4fa);border-radius:var(--dsw-radius-sm,8px)}
  .pptw :focus-visible{outline:2px solid var(--w-accent,#4176e6);outline-offset:2px}.pptw .dirty{color:var(--dsw-alias-state-warn-primary,#b45309);font-size:13px}
.pptw .badge-dirty{color:var(--dsw-alias-state-warn-primary,#b45309);font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-state-warn-tertiary,rgba(245,158,11,.14));border:1px solid rgba(245,158,11,.32);margin-inline-start:6px}
.pptw .notice button{margin-inline-start:8px;padding:2px 9px;border-radius:var(--dsw-radius-xs,6px);border:1px solid currentColor;background:transparent;color:inherit;font-size:12px;cursor:pointer}
.pptw .ppt-pace-card{display:flex;flex-direction:column;gap:8px}
.pptw .ppt-pace-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pptw .ppt-pace-row input{width:92px}
.pptw .ppt-pace-badge{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:999px;border:1px solid var(--w-border);background:var(--w-soft);color:var(--w-text)}
.pptw .ppt-pace-badge[data-over="true"]{color:var(--dsw-alias-state-warn-primary,#b45309);border-color:var(--dsw-alias-state-warn-primary,#b45309);background:color-mix(in oklab,var(--dsw-alias-state-warn-primary,#b45309) 12%,var(--w-bg))}
  [role=dialog]:has(.pptw.w-page){width:min(1200px,calc(100dvw - 48px))!important;max-width:1200px!important}
  @media(max-width:700px){.pptw .layout{grid-template-columns:1fr}.pptw .pages{max-height:180px}.pptw .preview{min-height:190px}
    .pptw .coaching-grid,.pptw .coaching .before-after{grid-template-columns:1fr}
    [role=dialog]:has(.pptw.w-page){width:100%!important;max-width:100%!important;flex-direction:column!important}
    [role=dialog]:has(.pptw.w-page)>nav+div{min-width:0;width:100%}
    [role=dialog]:has(.pptw.w-page)>nav+div>div:has(.pptw.w-page){padding:12px!important;min-width:0}
    [role=dialog]:has(.pptw.w-page) nav{width:100%!important;flex-basis:auto!important;border-right:0;max-height:170px;overflow:auto}
    [role=dialog]:has(.pptw.w-page) nav>div:has(>button){display:flex;flex-direction:row!important;flex-wrap:wrap;flex-shrink:0;gap:4px}
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
            const source = { ...(slide || {}), ...(slide?.dataTemplate || {}) };
            return {
                layout: source.layout || 'bullets',
                variant: source.variant || '',
                chrome: source.chrome || '',
                coverPattern: source.coverPattern || '',
                tableStyle: source.tableStyle || source.visual?.tableStyle || '',
                density: source.visual?.density || '',
                columnsText: Array.isArray(source.columns) ? source.columns.filter(c => typeof c === 'string').join(', ') : '',
                title: source.title || '',
                subtitle: source.subtitle || '',
                kicker: source.kicker || '',
                takeaway: source.takeaway || '',
                source: source.source || '',
                formula: source.formula || '',
                mermaid: source.mermaid || '',
                code: source.code || '',
                language: source.language || '',
                filename: source.filename || '',
                url: source.url || '',
                xLabel: source.xLabel || '',
                yLabel: source.yLabel || '',
                text: source.text || '',
                bullets: (source.bullets || []).join('\n'),
                notes: source.notes || '',
                items: typeof normalizeSlideItems === 'function' ? normalizeSlideItems(source) : [],
                rowsText: typeof serializeSlideRows === 'function' ? serializeSlideRows(source.rows) : '',
            };
        }
        function editorHtml(html, nonce) {
            const bridge = `<style>#hud,#delivery-bar,#review-panel,#progress,#notes-panel,#help-panel,#toast,#blank{display:none!important}.slide-frame{pointer-events:none!important}.slide-frame .slide{pointer-events:auto!important}[data-dsh-editing="1"]{outline:2px solid #2563eb!important;outline-offset:3px;border-radius:4px;cursor:text!important}</style><script>(function(){const nonce=${JSON.stringify(nonce)};
      function tell(field){parent.postMessage({type:'dsh-ppt-select',nonce:nonce,field:field},'*')}
      function fieldOfEditable(n){if(!n)return '';if(n.matches('.subtitle,.quote-attr'))return 'subtitle';if(n.matches('.kicker'))return 'kicker';if(n.matches('.slide-takeaway'))return 'takeaway';if(n.matches('.slide-source'))return 'source';return 'title';}
      document.addEventListener('keydown',function(e){
        if(e.target.closest('#data-panel'))return;
        if(e.target && e.target.isContentEditable){
          if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();e.target.dataset.dshCancel='1';e.target.innerText=e.target.dataset.dshOrig||'';e.target.blur();return}
          if(e.key==='Enter' && !e.shiftKey){e.preventDefault();e.stopImmediatePropagation();e.target.blur();return}
          e.stopImmediatePropagation();return;
        }
        var mod=e.ctrlKey||e.metaKey;
        if(mod&&(e.key==='s'||e.key==='S')){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'dsh-ppt-shortcut',nonce:nonce,key:'save'},'*');return}
        if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'dsh-ppt-shortcut',nonce:nonce,key:'escape'},'*');return}
        if(e.altKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({type:'dsh-ppt-shortcut',nonce:nonce,key:e.key==='ArrowLeft'?'prev':'next'},'*');return}
        e.stopImmediatePropagation();if(e.key!=='Tab')e.preventDefault()
      },true);
      document.addEventListener('touchstart',function(e){e.stopImmediatePropagation()},true);
      document.addEventListener('touchend',function(e){e.stopImmediatePropagation()},true);
      document.addEventListener('wheel',function(e){e.stopImmediatePropagation()},{capture:true,passive:true});
      document.addEventListener('dblclick',function(e){
        if(e.target.closest('#data-panel,.data-number,.data-chart-trace'))return;
        const n=e.target.closest('h1,h2,.subtitle,.kicker,.slide-takeaway,.slide-source,.statement-title,.quote-text,.quote-attr');
        if(!n||n.isContentEditable)return;
        e.preventDefault();e.stopImmediatePropagation();
        const field=fieldOfEditable(n);
        const orig=n.innerText;
        n.dataset.dshOrig=orig;
        n.dataset.dshEditing='1';
        n.dataset.dshCancel='';
        n.contentEditable='true';
        n.focus();
        try{const r=document.createRange();r.selectNodeContents(n);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r);}catch(_){}
        function finish(){
          n.removeEventListener('blur',finish);
          const cancelled=n.dataset.dshCancel==='1';
          const next=String(n.innerText||'').replace(/\r?\n/g,' ').trim();
          n.contentEditable='false';
          delete n.dataset.dshEditing;
          delete n.dataset.dshOrig;
          delete n.dataset.dshCancel;
          if(!cancelled && next && next!==String(orig||'').replace(/\r?\n/g,' ').trim()){
            parent.postMessage({type:'dsh-ppt-inline-edit',nonce:nonce,field:field,value:next},'*');
          }
        }
        n.addEventListener('blur',finish);
      },true);
      document.addEventListener('click',function(e){if(e.target.closest('#data-panel,.data-number,.data-chart-trace,[data-dsh-editing="1"]'))return;const n=e.target.closest('.code-window,.code-body,.mockup-browser,.mockup-phone,.quadrant-svg,.radar-svg,.dumbbell-svg,.hm-grid,.deck-mermaid-svg,.mermaid-canvas,.deck-math,.formula-plate,.callout-formula,h1,h2,.subtitle,.kicker,.statement-title,.quote-text,.quote-attr,.slide-takeaway,.slide-source,li,.mekko-col,.sankey-node,.sankey-svg,.swot-quad,.porter-beam,.surface-card,.kpi-card,.gantt-row,.arch-tier,.tam-card,.org-child,.chevron-col,table');if(!n)return;
        e.preventDefault();e.stopImmediatePropagation();let field=n.matches('.code-window,.code-body')?'code':n.matches('.deck-mermaid-svg,.mermaid-canvas')?'mermaid':n.matches('.deck-math,.formula-plate,.callout-formula')?'formula':n.matches('li')?'bullets':n.matches('.subtitle,.quote-attr')?'subtitle':n.matches('.kicker')?'kicker':n.matches('.slide-takeaway')?'takeaway':n.matches('.slide-source')?'source':n.matches('table,.mekko-col,.hm-grid,.radar-svg')?'rows':n.matches('.mockup-browser,.mockup-phone,.quadrant-svg,.dumbbell-svg,.sankey-node,.sankey-svg,.swot-quad,.porter-beam,.surface-card,.kpi-card,.gantt-row,.arch-tier,.tam-card,.org-child,.chevron-col')?'items':'title';tell(field)},true);
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
            const kindName = value => ({ expression: L('表达建议', 'Expression'), storyline: L('叙事与结论标题', 'Storyline & action title'), logic: L('逻辑问题', 'Logic'), evidence: L('证据缺口', 'Missing evidence') })[value] || value;
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
                return h(W.Button, { icon: 'right', disabled: blocked || index < 0, onClick: () => onChoose(id) }, L('查看第 ' + (index + 1) + ' 页', 'View slide ' + (index + 1)));
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
            return h('section', { className: 'card coaching', 'data-dsh-card': '', 'aria-label': L('可选演练', 'Optional rehearsal'), onKeyDown: e => { if (e.key === 'Escape' || (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.stopPropagation();
                    if (e.key.toLowerCase() === 's')
                        e.preventDefault();
                } } }, h('h3', { 'data-dsh-serif': '' }, L('想再准备充分一点？', 'Want to prepare further?')), h('p', { className: 'muted' }, L('成品已可下载。以下两项按需开启，不影响直接交付。', 'Your files are ready to download. Both options below are optional.')), h('div', { className: 'tools' }, h(W.Button, { icon: 'sparkles', disabled: busy, 'aria-pressed': mode === 'review', onClick: () => configure('review') }, L('AI 预审', 'AI review')), h(W.Button, { icon: 'play', disabled: busy, 'aria-pressed': mode === 'practice', onClick: () => configure('practice') }, L('模拟答辩', 'Rehearsal')), mode && h(W.Button, { variant: 'ghost', icon: 'close', disabled: busy, onClick: () => { if (canLeave()) {
                    setMode('');
                    accept(null);
                    setAnswer('');
                } } }, L('收起', 'Collapse'))), mode && h(React.Fragment, null, error && h('div', { role: 'alert', className: 'notice error' }, error), notice && h('div', { role: 'status', className: 'notice' }, notice), busy && h('div', { role: 'status', className: 'tools' }, h(W.Skeleton, { variant: 'text', lines: 2, label: L('正在处理…可以继续预览或下载成品。', 'Working… You can still preview or download your presentation.'), style: { flex: '1 1 160px' } }), h(W.Button, { icon: 'close', onClick: stop }, L('停止', 'Stop'))), !run && h(React.Fragment, null, h('p', null, mode === 'review' ? L('AI 根据材料把关结论型标题（Action Title）、叙事衔接与论据缺口，最多保留 8 个关键改进点。', 'AI reviews action titles, SCQA storyline flow, and evidence gaps based on your material, keeping up to eight high-value findings.') : L('AI 一次问一题，你来回答；可随时结束并整理已完成的问答。', 'AI asks one question at a time. You answer and can finish at any point.')), h('div', { className: 'coaching-grid' }, h('label', null, L('模型', 'Model'), h('select', { 'aria-label': L('演练模型', 'Rehearsal model'), value: route, disabled: busy, onChange: e => setRoute(e.target.value) }, h('option', { value: '' }, routes.length ? L('请选择模型', 'Choose a model') : L('暂无可用模型', 'No configured model')), routes.map(r => h('option', { key: modelRouteKey(r), value: modelRouteKey(r) }, r.label)))), h('label', null, L('听众', 'Audience'), h('select', { 'aria-label': L('听众', 'Audience'), value: audience, disabled: busy, onChange: e => setAudience(e.target.value) }, [['general', L('一般听众', 'General audience')], ['executive', L('高管决策层', 'Executive decision-makers')], ['investor', L('投资人 / 路演评委', 'Investors / pitch panel')], ['management', L('管理层 / 客户', 'Management / clients')], ['academic', L('学术 / 答辩评委', 'Academic / defense panel')], ['technical', L('技术架构评审', 'Technical review')], ['client', L('客户与业务方', 'Client stakeholders')]].map(([v, label]) => h('option', { key: v, value: v }, label)))), h('label', null, L('提问强度', 'Difficulty'), h('select', { 'aria-label': L('提问强度', 'Difficulty'), value: difficulty, disabled: busy, onChange: e => setDifficulty(e.target.value) }, [['gentle', L('温和', 'Gentle')], ['normal', L('普通', 'Normal')], ['strict', L('严格', 'Strict')]].map(([v, label]) => h('option', { key: v, value: v }, label)))), h('label', null, mode === 'review' ? L('预审轮数', 'Review rounds') : L('答辩题数', 'Questions'), h('select', { 'aria-label': mode === 'review' ? L('预审轮数', 'Review rounds') : L('答辩题数', 'Questions'), value: limit, disabled: busy, onChange: e => setLimit(Number(e.target.value)) }, Array.from({ length: mode === 'review' ? 3 : 5 }, (_, i) => h('option', { key: i, value: i + 1 }, String(i + 1))))), h('label', null, L('检查范围', 'Scope'), h('select', { 'aria-label': L('检查范围', 'Scope'), value: scope, disabled: busy, onChange: e => setScope(e.target.value) }, h('option', { value: 'all' }, L('整个工程', 'Whole presentation')), h('option', { value: 'current' }, L('当前页', 'Current slide'))))), h('label', { htmlFor: fieldId + '-ppt-coach-material' }, L('补充材料（可选）', 'Supporting material (optional)')), h('textarea', { id: fieldId + '-ppt-coach-material', rows: 3, maxLength: 20000, value: material, disabled: busy, onChange: e => { reading.current++; setMaterial(e.target.value); } }), h('label', null, L('或导入 TXT / Markdown', 'Or import TXT / Markdown'), h('input', { type: 'file', accept: '.txt,.md,text/plain,text/markdown', disabled: busy, onChange: uploadMaterial })), h('p', { className: 'muted' }, L('将所选页面的文字、图表数据、备注及补充材料发送给所选 DSH 模型，不发送图片文件。最多 ' + maxCalls + ' 次插件调用；模型服务自身的重试与计费规则仍适用。', 'Sends selected slide text, chart data, notes and supporting material to the chosen DSH model. Image files are excluded. Up to ' + maxCalls + ' plugin calls; provider retry and billing rules still apply.')), h('div', { className: 'tools' }, h(W.Button, { variant: 'primary', icon: 'play', disabled: busy || blocked || !findModelRoute(routes, route), onClick: start }, mode === 'review' ? L('开始 AI 预审', 'Start AI review') : L('开始模拟答辩', 'Start rehearsal')), h(W.Button, { icon: 'refresh', 'aria-busy': busy ? 'true' : undefined, disabled: busy, onClick: () => configure(mode) }, L('刷新模型', 'Refresh models'))), blocked && h('p', { className: 'muted' }, L('请先保存或取消幻灯片修改。', 'Save or cancel slide edits first.'))), run && h(React.Fragment, null, h('h3', null, modeName(run.mode) + ' · ' + statusName(run.status)), h('p', { className: 'muted' }, L('修订 ', 'Revision ') + run.revision + ' · ' + run.route.provider + ' / ' + run.route.model + ' · ' + L('调用 ', 'Calls ') + run.usedCalls + '/' + run.maxCalls), h('p', { className: 'muted' }, L('AI 意见不等于事实核验，也不代表真实听众的评价。请先看原文与改动，再决定是否采纳。', 'AI suggestions are not fact checks or predictions of audience feedback. Compare sources and edits before adopting them.')), stale && h('div', { role: 'alert', className: 'notice' }, L('工程已经修改。旧报告仍可导出，但不能继续调用或采纳；请重新开始。', 'The presentation changed. You can export this report, but cannot continue or apply it. Start a new rehearsal.')), run.error && h('p', { className: 'muted' }, languageOf() === 'en' ? run.error.split(' / ').at(-1) : run.error.split(' / ')[0]), run.findings.map(f => {
                const slide = project.slides.find(s => s.id === f.slideId);
                return h('article', { key: f.id, className: 'card', 'data-dsh-card': '' }, h('strong', null, kindName(f.kind) + ' · ' + f.issue), h('div', { className: 'tools' }, pageButton(f.slideId)), h('p', null, f.question), h('p', null, f.answer), h('p', null, f.suggestion), source(f), f.patch && h(React.Fragment, null, h('details', null, h('summary', null, L('比较原文和建议', 'Compare before and after')), Object.entries(f.patch).map(([key, value]) => h('div', { key }, h('strong', null, t(fields.find(([name]) => name === key)?.[1] || key)), h('div', { className: 'before-after' }, h('div', null, h('small', null, L('原文', 'Before')), h('pre', null, Array.isArray(slide?.[key]) ? slide[key].join('\n') : slide?.[key] || '')), h('div', null, h('small', null, L('建议', 'After')), h('pre', null, Array.isArray(value) ? value.join('\n') : value)))))), h(W.Checkbox, { className: 'choice', disabled: busy || stale, checked: patches.includes(f.id), onChange: () => toggle(setPatches, patches, f.id), label: L('采纳这项表达修改', 'Adopt this expression edit') })), h(W.Checkbox, { className: 'choice', disabled: busy || stale, checked: backups.includes(f.id), onChange: () => toggle(setBackups, backups, f.id), label: L('选为备用问答页', 'Add as a backup Q&A slide') }));
            }), run.mode === 'review' && run.status === 'complete' && !run.findings.length && h('p', null, L('本次未提出明显问题。仍建议检查事实、字体和最终 PPTX。', 'No findings this time. Still check facts, fonts and the final PPTX.')), run.questions.map((q, i) => h('article', { key: q.id, className: 'card', 'data-dsh-card': '' }, h('strong', null, (i + 1) + '. ' + q.question), h('div', { className: 'tools' }, pageButton(q.slideId)), q.answer && h('p', null, L('你的回答：', 'Your answer: ') + q.answer), q.feedback && h('p', null, q.feedback), q.needsEvidence && h('p', { className: 'muted' }, L('待补充依据', 'Evidence needed')), source(q), q.answer && h(W.Checkbox, { className: 'choice', disabled: busy || stale, checked: backups.includes(q.id), onChange: () => toggle(setBackups, backups, q.id), label: L('选为备用问答页', 'Add as a backup Q&A slide') }))), run.mode === 'practice' && last && !last.feedback && run.status !== 'complete' && !stale && h(React.Fragment, null, h('label', { htmlFor: 'ppt-coach-answer' }, L('你的回答', 'Your answer')), h('textarea', { id: 'ppt-coach-answer', maxLength: 4000, rows: 4, value: answer, disabled: busy, onChange: e => setAnswer(e.target.value) }), h(W.Button, { variant: 'primary', icon: 'send', disabled: busy || blocked || !answer.trim() || run.usedCalls >= run.maxCalls, onClick: () => task(signal => advance(run, signal, answer)) }, L('提交回答，继续', 'Submit answer and continue'))), h('div', { className: 'tools' }, h(W.Button, { icon: 'download', disabled: busy, onClick: exportReport }, L('下载问答与材料清单', 'Download Q&A and evidence checklist')), h(W.Button, { variant: 'primary', icon: 'copy', disabled: busy || blocked || stale || !(patches.length + backups.length), onClick: applySelected }, L('将所选内容保存为副本', 'Save selected changes as a copy')), run.status !== 'complete' && h(W.Button, { icon: 'check', disabled: busy || run.status === 'busy', onClick: finish }, L('结束并整理已有结果', 'Finish with current results')), h(W.Button, { icon: 'refresh', disabled: busy, onClick: () => configure(run.mode) }, L('重新开始', 'Start again')), h(W.Button, { variant: 'danger', icon: 'trash', disabled: busy || run.status === 'busy', onClick: removeReport }, L('删除本次记录', 'Delete this record'))), h('p', { className: 'muted' }, L('采纳后会生成新副本，原稿保留；副本中可“撤销上次修改”。备用页包含 AI 演练标记，请核对后再对外展示。', 'Adoption creates a copy and keeps the original. Undo last change also works in the copy. Backup slides identify AI rehearsal content; verify before presenting.'))), history.length > 0 && h('details', null, h('summary', null, L('本机历史记录（', 'Local history (') + history.length + L('）', ')')), h('div', { className: 'project-list' }, history.map(item => h(W.Button, { key: item.id, disabled: busy, onClick: () => openReport(item.id) }, modeName(item.mode) + ' · ' + L('修订 ', 'Revision ') + item.revision + ' · ' + new Date(item.createdAt).toLocaleString(languageOf() === 'en' ? 'en-US' : 'zh-CN')))))));
        }
        const dataCss = `.pptw .data-workbench{margin-top:18px}.pptw .data-workbench details{margin:12px 0}.pptw .data-workbench summary{cursor:pointer;font-weight:600}.pptw .data-workbench pre,.pptw .data-workbench code{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;max-height:220px;overflow:auto}.pptw .data-input-row{margin:15px 0}.pptw .data-input-controls{display:grid;grid-template-columns:minmax(0,1fr) 115px;gap:12px;align-items:center}.pptw .data-input-controls input[type=range]{accent-color:var(--dsw-alias-brand-primary,#2563eb)}.pptw .data-before-after{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}.pptw .data-before-after pre{padding:10px;border:1px solid var(--dsw-alias-divider-default,#b8c0cc);border-radius:8px}.pptw .data-copy{display:flex;gap:8px;align-items:center}.pptw .data-copy input{width:auto}@media(max-width:640px){.pptw .data-before-after{grid-template-columns:minmax(0,1fr)}.pptw .data-input-controls{grid-template-columns:minmax(0,1fr) 100px}}`;
        function VisualPanel({ project, selected, blocked, onBusy, onAdopt, onDiffChange }) {
            const L = (zh, en) => languageOf() === 'en' ? en : zh;
            const [expanded, setExpanded] = useState(false), [routes, setRoutes] = useState([]), [route, setRoute] = useState('');
            const [scope, setScope] = useState(project.slides.length > 24 ? 'current' : 'all'), [repairs, setRepairs] = useState(1);
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
            const actionName = a => ({
                'title-size': L('标题字号', 'Title size'),
                'body-size': L('正文字号', 'Body size'),
                'chart-label-size': L('图表字号', 'Chart label size'),
                'chart-horizontal': L('改为横向条形图', 'Use horizontal bars'),
                'image-contain': L('完整显示图片', 'Show the complete image'),
                'split-bullets': L('拆分要点页', 'Split bullet slide'),
                'split-table': L('拆分表格页', 'Split table slide'),
                'density-mode': L('版面疏密调整', 'Adjust spacing density'),
                'swap-image-side': L('对调图文左右位置', 'Swap image side'),
                'switch-layout': L('无损升级页面版式', 'Upgrade slide layout'),
                'chart-highlight': L('聚焦高亮核心数据柱', 'Highlight focal bar'),
                'table-style': L('优化表格规范样式', 'Upgrade table style'),
            }[a.type] || a.type) + (a.value !== undefined ? ' · ' + a.value : '');
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
            useEffect(() => {
                if (!onDiffChange) return;
                const lastRound = run?.rounds?.at(-1);
                if (!run || !lastRound?.rendered || busy) { onDiffChange(null); return; }
                onDiffChange({ run, first: run.rounds[0], last: lastRound, compare, pictures, loading, setCompare });
            }, [run, compare, pictures, loading, busy]);
            const first = run?.rounds[0], last = run?.rounds.at(-1), stale = run && (run.stale || run.revision !== project.revision), count = scope === 'all' ? project.slides.length : 1;
            const callCap = Array.from({ length: repairs + 1 }, (_, i) => Math.ceil(Math.min(120, count * 2 ** i) / 2)).reduce((a, b) => a + b, 0);
            function image(src, round, label) { return h('figure', { style: { margin: 0, minWidth: 0 } }, h('figcaption', null, label), src ? h('div', { style: { position: 'relative', lineHeight: 0 } }, h('img', { src, alt: label, style: { width: '100%', height: 'auto', display: 'block' } }), (round?.findings || []).filter(f => f.slideId === compare).map((f, i) => h('span', { key: i, title: f.issue, style: { position: 'absolute', pointerEvents: 'none', border: '2px solid var(--dsw-alias-state-warn-primary,#f97316)', boxSizing: 'border-box', left: f.box[0] * 100 + '%', top: f.box[1] * 100 + '%', width: f.box[2] * 100 + '%', height: f.box[3] * 100 + '%' } }))) : h('p', { className: 'muted' }, round === first && !first.ids.includes(compare) ? L('此页由拆分生成，没有对应的原页画面。', 'This page was created by a split and has no original counterpart.') : L('画面尚未载入，请重新选择页面。', 'Image not loaded; select the slide again.'))); }
            return h('section', { className: 'card coaching', 'data-dsh-card': '', 'aria-label': L('视觉检查与修复', 'Visual review and repair') }, h('h3', { 'data-dsh-serif': '' }, L('让 AI 看完成品，再修排版', 'Let AI inspect the finished slides and repair formatting')), h('p', { className: 'muted' }, L('可选功能。检查实际 PPTX 画面与美学层级，另存修复副本并重新渲染复查。原稿保留。', 'Optional. Inspect actual PPTX images and visual hierarchy, save a repaired copy, and render it again for rechecking. The original is kept.')), !expanded ? h(W.Button, { icon: 'sparkles', disabled: busy || blocked, onClick: configure }, L('视觉检查与修复', 'Visual review and repair')) : h(React.Fragment, null, error && h('div', { role: 'alert', className: 'notice error' }, error), !run && h(React.Fragment, null, h('div', { className: 'coaching-grid' }, h('label', null, L('视觉模型', 'Vision model'), h('select', { 'aria-label': L('视觉模型', 'Vision model'), value: route, disabled: busy, onChange: e => setRoute(e.target.value) }, h('option', { value: '' }, L('请选择', 'Choose a model')), routes.map(m => h('option', { key: modelRouteKey(m), value: modelRouteKey(m) }, m.label)))), h('label', null, L('检查范围', 'Review scope'), h('select', { 'aria-label': L('视觉检查范围', 'Visual review scope'), value: scope, disabled: busy, onChange: e => setScope(e.target.value) }, h('option', { value: 'all', disabled: project.slides.length > 24 }, L('全部页面（最多 24 页）', 'All slides (up to 24)')), h('option', { value: 'current' }, L('当前页', 'Current slide')))), h('label', null, L('自动修复上限', 'Repair limit'), h('select', { 'aria-label': L('自动修复上限', 'Repair limit'), value: repairs, disabled: busy, onChange: e => setRepairs(Number(e.target.value)) }, h('option', { value: 0 }, L('仅看图检查', 'Inspect only')), h('option', { value: 1 }, L('最多修复 1 轮（推荐）', 'Up to 1 repair round (recommended)')), h('option', { value: 2 }, L('最多修复 2 轮', 'Up to 2 repair rounds'))))), !routes.length && h('p', { className: 'notice' }, L('未找到声明支持图片输入的模型。请在 DSH 模型设置中检查图片输入配置；普通生成和下载仍可使用。', 'No model declares image input. Check the image-input configuration in DSH model settings; normal creation and downloads remain available.')), h('p', null, L('会向所选模型发送 ' + count + ' 页的渲染图片和页面文字；拆页后会重新检查新增页面，最多 ' + callCap + ' 次模型调用。', 'Sends rendered images and text from ' + count + ' slides to the selected model. New split pages are rechecked, with up to ' + callCap + ' model calls.')), h('p', { className: 'muted' }, L('只调整字号、疏密、拆页、无损版式投影、图表高亮与图片适应方式，不改写原文、数字或公式。可随时停止；服务商仍可能收取已发起调用的费用。', 'Adjusts font sizes, spacing density, pagination, lossless layout projection, chart highlights and image fit. Original text, numbers and formulas are preserved. You can stop at any time; calls already sent may still be billed.')), h('div', { className: 'tools' }, h(W.Button, { variant: 'primary', icon: 'play', disabled: busy || blocked || !findModelRoute(routes, route) || count > 24, onClick: start }, L('开始看图检查', 'Start visual review')), h(W.Button, { icon: 'refresh', 'aria-busy': busy ? 'true' : undefined, disabled: busy, onClick: configure }, L('刷新视觉模型', 'Refresh vision models')))), run && h(React.Fragment, null, h('p', { role: 'status' }, (run.status === 'paused' ? L('检查已停止', 'Review stopped') : run.status === 'ready' && !busy ? L('等待检查', 'Review ready') : phaseName(run.phase)) + ' · ' + L('已调用 ', 'Calls ') + run.usedCalls + '/' + run.maxCalls + ' · ' + L('本轮已检查 ', 'Slides checked this pass ') + (last?.cursor || 0) + '/' + (last?.ids.length || 0)), busy && h(W.Button, { icon: 'close', onClick: stop }, L('停止视觉检查', 'Stop visual review')), run.error && h('p', { role: 'alert', className: 'notice error' }, failureText(run.error)), stale && h('p', { className: 'notice' }, L('工程或成品已变化，旧记录可查看，但不能继续或采纳。', 'The project or output changed. This old record is readable, but cannot be continued or adopted.')), run.status === 'complete' && h('p', { className: 'notice' }, last.findings.length ? L('复查仍有 ' + last.findings.length + ' 个问题，请查看标记和说明。', 'Recheck still found ' + last.findings.length + ' issues. Review the highlighted regions and notes.') : L('AI 在本次范围内未发现明显视觉问题；这是一份模型检查记录。', 'AI found no obvious visual issues in this scope. This is a model review record.')), (last?.missingFonts || []).length > 0 && h('p', { className: 'notice error' }, L('渲染引擎报告缺失字体：', 'Renderer reported missing fonts: ') + last.missingFonts.join(', ')), run.rounds.map((r, i) => h('details', { key: i, open: i === run.rounds.length - 1 }, h('summary', null, L('检查轮次 ', 'Inspection pass ') + i + ' · ' + r.cursor + '/' + r.ids.length), r.findings.map((f, j) => h('p', { key: j }, h('strong', null, (project.slides.findIndex(s => s.id === f.slideId) >= 0 ? L('原第 ' + (project.slides.findIndex(s => s.id === f.slideId) + 1) + ' 页', 'Original slide ' + (project.slides.findIndex(s => s.id === f.slideId) + 1)) : L('拆分页', 'Split page')) + ' · '), f.issue, h('br'), h('small', { className: 'muted' }, f.action ? actionName(f.action) : L('需要人工判断', 'Needs manual review')))), r.applied.length > 0 && h('ul', null, r.applied.map((a, j) => h('li', { key: j }, L('已应用：', 'Applied: ') + actionName(a)))))), !busy && last?.rendered && h(React.Fragment, null, h('label', null, L('查看前后画面（橙框为 AI 定位区域；中央画布已同步展开大图对比）', 'Compare images (orange boxes mark AI findings; full-width view is shown on the canvas)'), h('select', { 'aria-label': L('对比页面', 'Comparison slide'), value: compare, onChange: e => setCompare(e.target.value) }, last.ids.map((id, i) => h('option', { value: id, key: id }, String(i + 1) + '. ' + (project.slides.find(s => s.id === id)?.title || L('拆分页', 'Split page')))))), loading ? h(W.Skeleton, { variant: 'card', label: L('正在载入画面…', 'Loading images…') }) : h('div', { className: 'before-after' }, image(pictures.before, first, L('原稿 · 实际 PPTX', 'Original · actual PPTX')), image(pictures.after, last, run.rounds.length > 1 ? L('修复后 · 实际 PPTX', 'Repaired · actual PPTX') : L('本次检查画面', 'Reviewed image')))), h('div', { className: 'tools' }, h(W.Button, { variant: 'primary', icon: 'check', disabled: busy || blocked || !run.canAdopt || stale, onClick: adopt }, last?.findings.length ? L('打开修复副本（仍有待处理问题）', 'Open repaired copy (issues remain)') : L('采用修复副本', 'Use repaired copy')), h(W.Button, { icon: 'download', disabled: busy, onClick: download }, L('下载视觉检查记录', 'Download visual review')), h(W.Button, { variant: 'danger', icon: 'trash', disabled: busy || run.status === 'busy', onClick: remove }, L('删除检查记录', 'Delete review')), h(W.Button, { icon: 'plus', disabled: busy, onClick: () => { accept(null); setCompare(''); setPictures({}); configure(); } }, L('新建视觉检查', 'New visual review')))), !busy && history.length > 0 && h('details', null, h('summary', null, L('本机视觉检查历史', 'Local visual review history')), h('div', { className: 'project-list' }, history.map(item => h(W.Button, { key: item.id, onClick: () => open(item.id) }, L('修订 ', 'Revision ') + item.revision + ' · ' + new Date(item.createdAt).toLocaleString(languageOf() === 'en' ? 'en-US' : 'zh-CN'))))), h(W.Button, { variant: 'ghost', icon: 'close', disabled: busy, onClick: () => setExpanded(false) }, L('收起视觉检查', 'Collapse visual review'))));
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
            return h('section', { className: 'card data-workbench', 'data-dsh-card': '', 'aria-label': L('数据溯源与现场推演', 'Data lineage and what-if') }, h('style', null, dataCss), h('h3', null, L('数据溯源与现场推演', 'Data lineage and what-if')), h('p', { className: 'muted' }, L('点预览中的数字可追问来源。只有明确声明的假设可调；来源不等于事实已核验。', 'Click numbers in the preview to inspect their lineage. Only declared assumptions are adjustable. Lineage is not factual verification.')), h('details', null, h('summary', null, L('数字来自哪里', 'Where the numbers come from')), h('label', null, L('指标', 'Metric'), h('select', { value: metricId, disabled, onChange: event => setMetricId(event.target.value) }, model.metrics.map(m => h('option', { key: m.id, value: m.id }, m.label + ' [' + m.id + ']')))), metric && h('div', { className: 'data-evidence' }, h('strong', null, metric.label + ' = ' + format(model.values[metric.id], metric)), metric.kind === 'source' ? h(React.Fragment, null, h('p', null, metric.evidence.name + ' · ' + metric.evidence.locator), h('pre', null, metric.evidence.excerpt), h('details', null, h('summary', null, L('来源快照校验值', 'Source snapshot checksum')), h('code', null, metric.evidence.sha256))) : metric.kind === 'input' ? h('p', null, L('用户假设', 'User assumption') + (metric.note ? ' · ' + metric.note : '')) : h(React.Fragment, null, h('pre', null, '= ' + metric.formula), h('div', { className: 'tools' }, metric.dependencies.map(id => h(W.Button, { key: id, disabled, onClick: () => setMetricId(id) }, model.metrics.find(m => m.id === id).label))))), h(W.Button, { icon: 'download', disabled: disabled || changed, onClick: () => onDownload('data') }, L('下载溯源与假设报告', 'Download lineage and assumptions'))), model.metrics.some(m => m.kind === 'input') && h('details', { open: true }, h('summary', null, L('现场推演参数', 'What-if assumptions')), model.metrics.filter(m => m.kind === 'input').map(m => h('div', { key: m.id, className: 'data-input-row' }, h('label', { htmlFor: fieldId + '-ppt-data-' + m.id }, m.label, h('small', { className: 'muted' }, ' · ' + L('假设', 'Assumption') + (m.note ? ' · ' + m.note : ''))), h('div', { className: 'data-input-controls' }, h('input', { type: 'range', min: m.min, max: m.max, step: m.step, value: Number(parameters[m.id]), disabled, 'aria-label': m.label + ' ' + L('滑杆', 'slider'), onChange: event => changeParameter(m.id, event.target.value) }), h(W.Input, { id: fieldId + '-ppt-data-' + m.id, type: 'number', min: m.min, max: m.max, step: m.step, value: parameters[m.id], disabled, onChange: event => changeParameter(m.id, event.target.value) })))), h('label', null, L('导入离线 HTML 保存的推演参数', 'Import scenario parameters saved in offline HTML'), h('input', { type: 'file', accept: '.json,application/json', disabled, onChange: importScenario }))), model.sources.length > 0 && h('details', null, h('summary', null, L('更新来源材料', 'Update source material')), h('p', { className: 'muted' }, L('先导入或粘贴新材料，预览影响后再确认；不会自动监视或修改原文件。表格可从 Excel 导出 CSV。', 'Import or paste new material, then preview the impact before confirming. Original source files are not watched or modified. Export Excel tables as CSV.')), h('label', null, L('替换来源', 'Replace source'), h('select', { value: sourceId, disabled, onChange: event => setSourceId(event.target.value) }, model.sources.map(s => h('option', { key: s.id, value: s.id }, s.name)))), h('label', null, L('导入替换材料', 'Import replacement material'), h('input', { type: 'file', accept: source?.kind === 'table' ? '.csv,.tsv' : '.txt,.md', disabled, onChange: importSource })), source?.kind === 'table' && h('label', null, L('分隔格式', 'Delimiter format'), h('select', { value: replacement?.format || 'csv', disabled, onChange: event => { setUpdates(old => ({ ...old, [sourceId]: { id: sourceId, format: event.target.value, content: replacement?.content || '' } })); setPreview(null); } }, h('option', { value: 'csv' }, 'CSV'), h('option', { value: 'tsv' }, 'TSV'))), h('label', null, L('或粘贴内容', 'Or paste content'), h('textarea', { rows: 4, maxLength: 1048576, value: replacement?.content ?? '', disabled, onChange: event => { setUpdates(old => ({ ...old, [sourceId]: { id: sourceId, format: source.kind === 'table' ? replacement?.format || 'csv' : 'text', content: event.target.value } })); setPreview(null); setError(''); } })), replacement && h(W.Button, { icon: 'close', disabled, onClick: () => { setUpdates(old => { const next = { ...old }; delete next[sourceId]; return next; }); setPreview(null); } }, L('取消此来源更新', 'Cancel this source update'))), changed && h('p', { className: 'dirty', role: 'status' }, L('推演或材料尚未保存，当前 PPTX 仍是已保存版本。先预览差异并确认，或恢复参数后下载。', 'Unsaved scenario or source changes. The PPTX still contains saved values. Preview and confirm, or reset before downloading.')), (!valid || !inputsValid) && h('p', { className: 'notice error', role: 'alert' }, L('参数无法计算，请检查范围、步长或除零，再恢复或修改。', 'Cannot calculate these parameters. Check ranges, steps or division by zero; adjust or reset.')), error && h('p', { className: 'notice error', role: 'alert' }, error), h('div', { className: 'tools' }, h(W.Button, { icon: 'search', disabled: disabled || !changed || !valid || !inputsValid, onClick: inspect }, L('预览差异', 'Preview changes')), h(W.Button, { icon: 'reply', disabled: disabled || !changed, onClick: reset }, L('恢复已保存数据', 'Reset to saved data'))), preview && preview.signature === signature && h('div', { className: 'data-diff' }, h('h4', null, L('确认前核对', 'Review before confirming')), !preview.changed ? h('p', null, L('内容没有变化。', 'No content changes.')) : h(React.Fragment, null, h('ul', null, preview.changes.map(change => h('li', { key: change.id }, h('strong', null, change.label + ': '), change.beforeText + ' → ' + change.afterText, change.before === change.after && ' · ' + L('来源已更新', 'Source updated')))), h('h4', null, L('受影响页面', 'Affected slides')), !preview.affectedSlides.length && h('p', { className: 'muted' }, L('指标尚未绑定到页面，只更新数据模型。', 'Metrics are not bound to slides; only the data model changes.')), preview.affectedSlides.map(slide => h('details', { key: slide.id }, h('summary', null, (slide.page) + '. ' + slide.title), h(W.Button, { icon: 'right', disabled, onClick: () => onChoose(slide.id) }, L('查看页面', 'View slide')), slide.evidenceChanged && h('p', null, L('关联的来源快照有变化。', 'A linked source snapshot changed.')), slide.fields.map(field => h('div', { key: field.field }, h('strong', null, t(fields.find(([key]) => key === field.field)?.[1] || field.field)), h('div', { className: 'data-before-after' }, h('pre', null, L('之前：', 'Before: ') + display(field.before)), h('pre', null, L('之后：', 'After: ') + display(field.after))))))), h(W.Checkbox, { className: 'data-copy', checked: saveAs, disabled, onChange: next => setSaveAs(next), label: L('保存为新副本，保留原稿（推荐）', 'Save a new copy and keep the original (recommended)') }), h('p', { className: 'muted' }, L('PPTX 保存确认后的静态结果，并附公式、来源和假设；HTML 保留交互。JSON 工程包含导入的完整材料，分享前请检查。', 'PPTX saves confirmed static results with formulas, sources and assumptions; HTML retains interaction. The JSON project contains full imported material; review it before sharing.')), h(W.Button, { variant: 'primary', icon: 'check', disabled: disabled || !valid || !inputsValid, onClick: apply }, saveAs ? L('确认并保存推演副本', 'Confirm and save scenario copy') : L('确认并更新当前工程', 'Confirm and update this project')))));
        }
        function Workbench({locale,workbench=false}={}) {
const [activeTab,setActiveTab]=useState('content'),[downloadOpen,setDownloadOpen]=useState(false),[createOpen,setCreateOpen]=useState(false),[createMode,setCreateMode]=useState('create'),[pendingNav,setPendingNav]=useState(null),[deleteOpen,setDeleteOpen]=useState(false);
const controlId=React.useId(),rootElement=useRef(null),syncInputRef=useRef(null),fullscreenBoundary=useRef({was:false,exitedAt:0});
useEffect(()=>{const changed=()=>{const active=!!document.fullscreenElement;if(fullscreenBoundary.current.was && !active)fullscreenBoundary.current.exitedAt=Date.now();fullscreenBoundary.current.was=active;};document.addEventListener('fullscreenchange',changed);return()=>document.removeEventListener('fullscreenchange',changed);},[]);
function clearEdits(){imageLoader.current.cancel();setDraft(draftFor(slide));setImage(null);setDirty(false);setError('');setMessage('');setConflict(false);setOverlaps([]);}
function finishNavigation(target,saved){setPendingNav(null);if(target.kind==='back'){imageLoader.current.cancel();setImage(null);setDirty(false);setVisualDiff(null);setProject(null);refreshList();return;}if(target.kind==='slide'){if(saved)adopt(saved,target.id);else choose(project.slides.find(row=>row.id===target.id),true);return;}if(saved)adopt(saved,selected);else clearEdits();}
function requestNavigation(target){if(busy)return;if(dataDirty){setActiveTab('data');setMessage(pptText('请先确认或恢复数据推演。','Confirm or reset the scenario first.'));return;}if(dirty){setPendingNav(target);return;}finishNavigation(target);}
            useLanguage(locale);
            const [projects, setProjects] = useState([]), [listLoading, setListLoading] = useState(true), [project, setProject] = useState(null), [selected, setSelected] = useState('');
            const [targetMinsInput, setTargetMinsInput] = useState('');
            const [draft, setDraft] = useState({}), [image, setImage] = useState(null), [dirty, setDirty] = useState(false);
            const [dataDirty, setDataDirty] = useState(false), [incomingData, setIncomingData] = useState(null);
            const [busy, setBusy] = useState(false), [job, setJob] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('');
            const [mode, setMode] = useState('html'), [raster, setRaster] = useState(''), [visualDiff, setVisualDiff] = useState(null);
            const [conflict, setConflict] = useState(false), [overlaps, setOverlaps] = useState([]);
            const railSplit = W.useResizableSplit({ key: 'dsh-ppt:rail-width', initial: 204, min: 156, max: 320 });
            const inspectorSplit = W.useResizableSplit({ key: 'dsh-ppt:inspector-width', initial: 360, min: 270, max: 560, reverse: true });
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
                setTargetMinsInput(next?.targetMinutes ? String(next.targetMinutes) : '');
                const row = next.slides.find(s => s.id === preferred) || next.slides[0];
                setSelected(row.id);
                setDraft(draftFor(row));
                setImage(null);
                setDirty(false);
                setRaster('');
                setOverlaps([]);
                setVisualDiff(null);
                if (!next.render && (mode === 'pptx' || mode === 'split'))
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
            function refreshList() { return perform(signal => action({ operation: 'list' }, signal), value => { setProjects(value.projects); setListLoading(false); }); }
            useEffect(() => {
                alive.current = true;
                const abort = new AbortController();
                action({ operation: 'list' }, abort.signal).then(value => { if (alive.current) {
                    setProjects(value.projects);
                    setListLoading(false);
                } }).catch(e => { if (!abort.signal.aborted) {
                    setError(e.message);
                    setListLoading(false);
                } });
                return () => { alive.current = false; abort.abort(); imageLoader.current.cancel(); for (const operation of operations.current)
                    operation.abort(); };
            }, []);
            useEffect(() => {
                function receive(event) {
                    if (event.source !== frame.current?.contentWindow || event.data?.nonce !== nonce.current || (mode !== 'html' && mode !== 'split'))
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
                    if (event.data.type === 'dsh-ppt-inline-edit') {
                        const field = event.data.field;
                        const val = typeof event.data.value === 'string' ? event.data.value.trim() : '';
                        if (!['title', 'subtitle', 'kicker', 'takeaway', 'source'].includes(field) || !val || !project || !slide || busy || dataDirty || imagePending)
                            return;
                        if (dirty) {
                            setDraft(prev => ({ ...prev, [field]: val }));
                            setActiveTab('content');
                            setMessage(pptText('已更新草稿内容，按 Ctrl/⌘+S 保存到 HTML 与 PPTX。', 'Draft updated inline. Press Ctrl/⌘+S to save HTML and PPTX.'));
                        } else {
                            void perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, slide: slide.id, patch: { [field]: val } }, signal), value => {
                                adopt(value.project, slide.id);
                                setMessage(t("已直接编辑文字并同步更新 HTML 与 PPTX。"));
                            });
                        }
                        return;
                    }
                    if (event.data.type !== 'dsh-ppt-select')
                        return;
                    const key = event.data.field;
                    if (key === 'items' || key === 'rows') {
                        if (dataDirty) { setActiveTab('data'); return; }
                        setActiveTab('content');
                        requestAnimationFrame(() => {
                            const targetEl = rootElement.current?.querySelector(key === 'rows' ? 'textarea[id$="-rows"], .ppt-item-editor input, .ppt-archetype-box select' : '.ppt-item-editor input, .ppt-archetype-box select');
                            targetEl?.focus?.();
                            targetEl?.scrollIntoView?.({ block: 'nearest' });
                        });
                        setMessage(key === 'rows' ? pptText('已定位到表格编辑区，修改后保存。', 'Focused table editor. Edit cells, then save.') : pptText('已定位到结构化卡片编辑区，修改后保存。', 'Focused structured card editor. Edit items, then save.'));
                        return;
                    }
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
                if ((mode !== 'html' && mode !== 'split') || !project || !previewBox.current)
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
                if ((mode !== 'pptx' && mode !== 'split') || !project?.render)
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
                if (draft.layout && draft.layout !== original.layout)
                    patch.layout = draft.layout;
                if ((draft.variant || '') !== (original.variant || ''))
                    patch.variant = draft.variant || '';
                if ((draft.chrome || '') !== (original.chrome || ''))
                    patch.chrome = draft.chrome || '';
                if ((draft.coverPattern || '') !== (original.coverPattern || ''))
                    patch.coverPattern = draft.coverPattern || '';
                if ((draft.tableStyle || '') !== (original.tableStyle || ''))
                    patch.tableStyle = draft.tableStyle || '';
                if ((draft.columnsText || '') !== (original.columnsText || '')) {
                    const cols = String(draft.columnsText || '').split(/[,，\t|]+/).map(s => s.trim()).filter(Boolean);
                    patch.columns = cols.length ? cols : null;
                }
                if ((draft.density || '') !== (original.density || '')) {
                    const nextVisual = { ...(slide?.visual || {}) };
                    if (draft.density) nextVisual.density = draft.density;
                    else delete nextVisual.density;
                    patch.visual = Object.keys(nextVisual).length ? nextVisual : null;
                }
                if (JSON.stringify(draft.items || []) !== JSON.stringify(original.items || [])) {
                    patch.items = (draft.items || []).map(entry => {
                        const clean = {
                            ...(entry.tag ? { tag: entry.tag } : {}),
                            ...(entry.title ? { title: entry.title } : {}),
                            ...(entry.text ? { text: entry.text } : {}),
                            ...(entry.value !== undefined && entry.value !== '' ? { value: entry.value } : {}),
                            ...(entry.unit ? { unit: entry.unit } : {}),
                            ...(entry.delta ? { delta: entry.delta } : {}),
                            ...(entry.status ? { status: entry.status } : {}),
                            ...(entry.icon ? { icon: entry.icon } : {}),
                            ...(entry.avatar ? { avatar: entry.avatar } : {}),
                            ...(entry.role ? { role: entry.role } : {}),
                            ...(entry.conversion ? { conversion: entry.conversion } : {}),
                            ...(entry.milestone === true ? { milestone: true } : {}),
                        };
                        for (const numKey of ['start', 'span', 'x', 'y', 'size', 'before', 'after']) {
                            if (entry[numKey] !== undefined && String(entry[numKey]).trim() !== '' && Number.isFinite(Number(entry[numKey]))) {
                                clean[numKey] = Number(entry[numKey]);
                            }
                        }
                        if (Array.isArray(entry.bullets)) {
                            const lines = entry.bullets.map(b => String(b).trim()).filter(Boolean);
                            if (lines.length) clean.bullets = lines;
                        }
                        return clean;
                    });
                }
                if ((draft.rowsText || '') !== (original.rowsText || '')) {
                    const parsedRows = typeof parseSlideRowsText === 'function' ? parseSlideRowsText(draft.rowsText) : null;
                    if (parsedRows) patch.rows = parsedRows;
                }
                if (image)
                    patch.image = { src: image.src, alt: image.alt, fit: image.fit, caption: image.caption };
                return perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, slide: slide.id, patch, saveAs }, signal), value => {
                    adopt(value.project, slide.id);
                    setMessage(saveAs ? t("副本已保存，原文件保留。副本从工程生成，不包含 Office 手工修改。") : value.changed === false ? t("内容没有变化。") : t("已保存，HTML、PPTX 和工程文件已同步更新。"));
                });
            }
            function applyStyle(styleBody, doneMessage) {
                if (dataDirty || dirty)
                    return;
                return perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, ...styleBody }, signal), value => {
                    adopt(value.project, selected);
                    setMessage(doneMessage);
                });
            }
            function appendSlide(archetype) {
                if (dataDirty || dirty)
                    return;
                return perform(signal => action({ operation: 'append', id: project.id, expectedRevision: project.revision, archetype }, signal), value => {
                    adopt(value.project, value.selected);
                    setActiveTab('content');
                    setMessage(t("已新增一页，可继续编辑或撤销。"));
                });
            }
            function moveSlideAt(fromIndex, delta) {
                if (dataDirty || dirty)
                    return;
                const toIndex = fromIndex + delta;
                if (fromIndex < 0 || toIndex < 0 || toIndex >= project.slides.length)
                    return;
                const order = project.slides.map(s => s.id);
                [order[fromIndex], order[toIndex]] = [order[toIndex], order[fromIndex]];
                return perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, order }, signal), value => { adopt(value.project, project.slides[fromIndex].id); setMessage(t("页面顺序已更新，可撤销。")); });
            }
            function reorderSlide(fromIndex, toIndex) {
                if (dataDirty || dirty)
                    return;
                if (fromIndex < 0 || toIndex < 0 || fromIndex >= project.slides.length || toIndex >= project.slides.length || fromIndex === toIndex)
                    return;
                const order = project.slides.map(s => s.id);
                const [moved] = order.splice(fromIndex, 1);
                order.splice(toIndex, 0, moved);
                return perform(signal => action({ operation: 'edit', id: project.id, expectedRevision: project.revision, order }, signal), value => { adopt(value.project, moved); setMessage(t("页面顺序已更新，可撤销。")); });
            }
            function move(delta) {
                return moveSlideAt(index, delta);
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
            function download(kind, targetProject = project) {
                if (dataDirty && targetProject === project)
                    return;
                if (!targetProject?.id)
                    return;
                const url = new URL('api/dsh-ppt/download', document.baseURI);
                url.searchParams.set('id', targetProject.id);
                url.searchParams.set('kind', kind);
                url.searchParams.set('revision', String(targetProject.revision ?? 0));
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
            function createDeck(payload) {
                return perform(signal => action({ operation: 'create', ...payload }, signal), value => {
                    setCreateOpen(false);
                    setActiveTab('content');
                    adopt(value.project);
                    refreshList();
                    setMessage(pptText('演示文稿已生成，可直接预览、切换版式或下载 PPTX。', 'Presentation created. Preview, switch archetypes, or download PPTX.'));
                }, pptText('正在生成 HTML、可编辑 PPTX 与工程文件…', 'Generating HTML, editable PPTX, and project files…'));
            }
            function createDemo() {
                return perform(signal => action({ operation: 'create-demo', lang: languageOf() }, signal), value => {
                    setCreateOpen(false);
                    setActiveTab('content');
                    adopt(value.project);
                    refreshList();
                    setMessage(pptText('已加载旗舰全景示例工程！可点击预览文字编辑、切换主题，或导出高管一页纸与 Remotion 视频分镜包。', 'Flagship showcase deck loaded! Edit slides, restyle themes, or export One-Pager & Remotion bundle.'));
                }, pptText('正在生成旗舰全景示例工程…', 'Building flagship showcase deck…'));
            }
            function importOfficeDeck(payload) {
                return perform(signal => action({ operation: 'import-office', ...payload }, signal), value => {
                    setCreateOpen(false);
                    setActiveTab('content');
                    adopt(value.project);
                    refreshList();
                    setMessage(pptText('已从 Excel / Word 文档智能生成多页演示文稿，可继续编辑与导出。', 'Generated multi-slide presentation from Office file. Ready to edit or export.'));
                }, pptText('正在剖析 Excel / Word 文档并智能排布版式…', 'Profiling Excel / Word document into slides…'));
            }
            function importDeck(payload) {
                return perform(signal => action({ operation: 'import-pptx', ...payload }, signal), value => {
                    setCreateOpen(false);
                    setActiveTab('content');
                    adopt(value.project);
                    refreshList();
                    setMessage(pptText('已导入并翻新 PPTX 工程，可直接预览编辑、导出讲义或按 P 开启提词台。', 'Imported and modernized .pptx into an editable project. Preview, edit, or export handout.'));
                }, pptText('正在解析外部 PPTX 并翻新工程…', 'Importing and modernizing .pptx…'));
            }
            function syncEditedPptx(payload) {
                if (dataDirty || dirty)
                    return;
                return perform(signal => action({ operation: 'import-pptx', id: project.id, expectedRevision: project.revision, data: payload.data, modernize: true, preserveSourceTheme: false }, signal), value => {
                    adopt(value.project, selected);
                    refreshList();
                    setMessage(pptText('已将 Office 修改稿同步回当前工程（支持撤销）。', 'Synced Office-edited .pptx back into this project (undoable).'));
                }, pptText('正在导入 Office 修改稿并重建工程…', 'Syncing Office-edited .pptx into project…'));
            }
            function handleToolbarSyncFile(event) {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file)
                    return;
                if (!/\.pptx$/i.test(file.name) || file.size > 24 * 1024 * 1024) {
                    setError(pptText('请选择 24 MiB 以内的 .pptx 修改稿。', 'Choose an edited .pptx file up to 24 MiB.'));
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    void syncEditedPptx({ data: String(reader.result || ''), fileName: file.name });
                };
                reader.onerror = () => setError(pptText('无法读取该 PPTX 文件，请重试。', 'Could not read the PPTX file. Try again.'));
                reader.readAsDataURL(file);
            }
            const pptTourSteps = typeof buildPptTourSteps === 'function'
                ? buildPptTourSteps({ project, pptText })
                : [];
            const currentImage = image?.src || (slide?.image?.assetId && project.assets[slide.image.assetId]?.data);
            const pptTabsConfig = project ? {
                label: pptText('演示文稿工作台视图', 'Presentation workbench views'),
                value: activeTab,
                onChange: value => { setActiveTab(value); if (value === 'data' && project.dataModel) setMode('html'); },
                items: [
                    { id: 'content', icon: 'edit', 'data-tour': 'ppt-edit', label: pptText('内容编辑', 'Edit content') },
                    { id: 'style', icon: 'palette', 'data-tour': 'ppt-style', label: pptText('风格与母版', 'Style Studio') },
                    { id: 'visual', icon: 'image', label: pptText('视觉检查', 'Visual review') },
                    { id: 'rehearsal', icon: 'sparkles', label: pptText('演练', 'Rehearsal') },
                    { id: 'data', icon: 'filter', label: pptText('数据与推演', 'Data and what-if') },
                ],
            } : null;
            const pptHeaderMeta = project ? h(React.Fragment, null,
                h('span', { className: 'w-tag ppt-header-meta' }, project.slides.length + pptText('页·R', 'p·R') + project.revision),
                (dirty || dataDirty) ? h('span', { className: 'w-tag badge-dirty' }, t('未保存')) : null) : null;
            return __stardustUpdatesInlinePage(React,h(W.Page,{workbench,lang:languageOf(),icon:'slides',rootRef:rootElement,tourSteps:pptTourSteps,tourStorageKey:typeof PPT_TOUR_STORAGE_KEY==='string'?PPT_TOUR_STORAGE_KEY:'dsh-ppt.tour.v1',onTourCopyPrompt:text=>copyPptTourPrompt(text,{setMessage,pptText}),title:project?project.title:t('演示文稿'),headerMeta:pptHeaderMeta,tabs:pptTabsConfig,subtitle:project?(project.title+' · '+project.slides.length+t(' 页 · 修订 ')+project.revision):pptText('管理、预览和编辑已生成的演示文稿。','Manage, preview and edit generated presentations.'),className:project?'pptw ppt-workbench ppt-in-project':'pptw ppt-workbench','aria-busy':busy?'true':undefined,actions:project?h(React.Fragment,null,
 h(W.Button,{icon:'left','data-tour':'ppt-start',disabled:busy || dataDirty,title:t('返回项目'),onClick:()=>requestNavigation({kind:'back'})},pptText('返回','Back')),
 h(W.Button,{variant:'primary',icon:'check',disabled:busy || dataDirty || imagePending || !dirty,'aria-keyshortcuts':'Control+S Meta+S',title:pptText('保存修改','Save changes'),onClick:()=>save()},pptText('保存','Save')),
 h(W.Button,{icon:'download','data-tour':'ppt-deliver',disabled:busy || dirty || dataDirty || imagePending,title:dirty || dataDirty?pptText('先保存当前修改','Save changes first'):pptText('下载 PPTX','Download PPTX'),onClick:()=>download('pptx')},'PPTX'),
 h(W.IconButton,{icon:'upload',label:pptText('导入 Office 修改稿','Sync Edited .pptx'),disabled:busy || dirty || dataDirty || imagePending,title:dirty || dataDirty?pptText('先保存当前修改','Save changes first'):pptText('导入 Office 修改稿','Sync Edited .pptx'),onClick:()=>syncInputRef.current?.click()}),
 h('input',{ref:syncInputRef,type:'file',accept:'.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation',hidden:true,onChange:handleToolbarSyncFile}),
 h(W.Button,{icon:'download',disabled:busy || dirty || dataDirty || imagePending,title:dirty || dataDirty?pptText('先保存当前修改','Save changes first'):pptText('下载成品','Download output'),onClick:()=>setDownloadOpen(true)},pptText('导出','Output'))) : h(React.Fragment,null,
 h(W.Button,{variant:'primary',icon:'plus','data-tour':'ppt-start',disabled:busy,onClick:()=>{setCreateMode('create');setCreateOpen(true);}},pptText('新建演示文稿','New presentation')),
 h(W.Button,{icon:'file',disabled:busy,onClick:()=>{setCreateMode('office');setCreateOpen(true);}},pptText('导入 Excel / Word','Import Excel / Word')),
 h(W.Button,{icon:'upload',disabled:busy,onClick:()=>{setCreateMode('import');setCreateOpen(true);}},pptText('导入 PPTX 翻新','Import & Modernize .pptx')),
 h(W.IconButton,{icon:'refresh','data-tour':'ppt-deliver',label:t('刷新项目'),'aria-busy':busy?'true':undefined,disabled:busy,onClick:refreshList}))},
 h('style',null,css),h('style',null,PPT_WORKBENCH_CSS),error && h(W.Status,{tone:'error',className:'ppt-recovery'},[h('p',{key:'text'},error),h('div',{key:'actions',className:'w-toolbar'},[h(W.Button,{key:'retry',icon:'refresh','aria-busy':busy?'true':undefined,disabled:busy || dataDirty,onClick:() => project ? open(project.id) : refreshList()},t("重试")),conflict && project ? h(W.Button,{key:'reload',icon:'download',disabled:busy || dataDirty,onClick:keepInputsAndReload},t("载入最新版本，保留我的输入")) : null])]),h(W.Status,{tone:'success'},message),busy?h(W.Status,null,job):null,
 dataDirty ? h(W.Status,null,h('div',{className:'ppt-data-warning'},pptText('数据推演或材料尚未保存，成品仍是已保存版本。','Scenario or source changes are unsaved. Output still uses saved values.'),h(W.Button,{variant:'ghost',icon:'right',onClick:()=>setActiveTab('data')},pptText('前往数据与推演','Open data and what-if')))) : null,
 !project ? listLoading && !projects.length && !error ? h('div',{className:'ppt-loading-skeleton'},h(W.Skeleton,{variant:'card',label:pptText('正在读取演示文稿列表…','Loading presentation projects…')}),h(W.Skeleton,{variant:'row'}),h(W.Skeleton,{variant:'row'}),h(W.Skeleton,{variant:'row'})) : projects.length ? h('div',{className:'ppt-library','data-tour':'ppt-library'},h(ProjectLibrary,{items:projects,language:languageOf(),t:pptText,searchHint:pptText('搜索标题或工程路径','Search titles or project paths'),searchText:row=>row.title+' '+row.path+' '+(row.theme||''),updatedAt:row=>row.updatedAt,renderItem:row=>h(W.Row,{key:row.id,title:row.title,meta:[row.theme,row.slideCount!==undefined?row.slideCount+t(' 页 · 修订 ')+(row.revision??0):null].filter(Boolean).join(' · ') || undefined,description:row.path,disabled:busy,actions:h(React.Fragment,null,h(W.Button,{size:'sm',icon:'edit',disabled:busy,onClick:()=>{setActiveTab('content');open(row.id);}},pptText('编辑','Open')),h(W.Button,{size:'sm',variant:'ghost',icon:'download',disabled:busy,onClick:()=>download('pptx',row)},'PPTX')),onClick:()=>{setActiveTab('content');open(row.id);}})})) : h(W.Empty,{icon:'slides',title:t("还没有可以编辑的项目"),action:h(React.Fragment,null,[h(W.Button,{key:'demo',variant:'primary',icon:'sparkles',disabled:busy,onClick:createDemo},pptText('一键体验旗舰示例','Load Flagship Demo')),h(W.Button,{key:'create',icon:'plus',disabled:busy,onClick:()=>{setCreateMode('create');setCreateOpen(true);}},pptText('新建演示文稿','New presentation')),h(W.Button,{key:'office',icon:'file',disabled:busy,onClick:()=>{setCreateMode('office');setCreateOpen(true);}},pptText('导入 Excel / Word','Import Excel / Word')),h(W.Button,{key:'import',icon:'upload',disabled:busy,onClick:()=>{setCreateMode('import');setCreateOpen(true);}},pptText('导入 PPTX 翻新','Import & Modernize .pptx')),h(W.Button,{key:'copy',icon:'copy',onClick:copyExample},t("复制示例")),h(W.Button,{key:'refresh',icon:'refresh','aria-busy':busy?'true':undefined,disabled:busy,onClick:refreshList},t("刷新项目"))])},[h('p',{key:'how'},t("先在对话中让助手生成演示文稿。已有项目可以让助手调用 ppt_check 检查一次，它会出现在这里。")),h('p',{key:'example'},t("示例：请把这份材料制作成可直接交付的演示文稿，生成 HTML、PPTX 和工程文件。"))]) :
 h('div',{className:'ppt-editor','data-view':activeTab,style:{'--ppt-rail-width':railSplit.size+'px','--ppt-inspector':inspectorSplit.size+'px'}},
 h(PptPages,{project,selected,busy,imagePending,dirty,dataDirty,onChoose:choose,onMoveSlide:moveSlideAt,onReorderSlide:reorderSlide,onDuplicate:()=>structure('duplicate'),onAppend:appendSlide}),
 h(W.SplitResizer,{...railSplit.resizerProps,className:'ppt-split-resizer ppt-split-resizer-left',label:pptText('调整幻灯片目录宽度','Resize slide rail')}),
 h('section',{className:'ppt-canvas-region','aria-label':pptText('成品预览','Presentation preview')},
 h('div',{className:'ppt-preview-tools'},h(W.Button,{icon:'slides','aria-pressed':mode==='html',disabled:busy || dataDirty,onClick:()=>setMode('html')},t('HTML 预览')),h(W.Button,{icon:'image','aria-pressed':mode==='pptx',disabled:busy || dataDirty || !project.render,onClick:()=>setMode('pptx')},t('最终 PPTX 预览')),h(W.Button,{icon:'layers','aria-pressed':mode==='split',disabled:busy || dataDirty || !project.render,onClick:()=>setMode('split')},t('HTML + PPTX 并排对比')),h(W.Button,{icon:'play',disabled:busy || dirty || imagePending || dataDirty,onClick:render},t('渲染当前 PPTX')),h(W.IconButton,{icon:'external',label:pptText('查看全屏','View fullscreen'),onClick:async()=>{try{await previewBox.current?.requestFullscreen();previewBox.current?.querySelector('.ppt-fullscreen-exit')?.focus();}catch{setError(pptText('当前宿主无法进入全屏，可以继续使用页面预览。','Fullscreen is unavailable in this host. The page preview remains usable.'));}}})),
 mode === 'split' ? h('div',{className:'ppt-split-preview'},
   h('figure',{className:'ppt-split-pane',style:{margin:0}},h('figcaption',null,t('HTML 预览')),
     h('div',{className:'preview',ref:previewBox},h(W.Button,{icon:'close',className:'ppt-fullscreen-exit','data-window-drag-exclude':'',onClick:()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});}},pptText('退出全屏','Exit fullscreen')),project.html ? h('iframe',{ref:frame,title:t("演示文稿 HTML 预览"),sandbox:'allow-scripts',srcDoc:previewDocument,onLoad:jump}) : h('p',null,t("此项目尚无 HTML，请保存一次生成预览。")))),
   h('figure',{className:'ppt-split-pane',style:{margin:0}},h('figcaption',null,t('最终 PPTX 预览')),
     h('div',{className:'preview'},raster ? h('img',{className:'render-page',src:raster,alt:t("最终 PPTX 第 ")+(index+1)+t(" 页渲染结果")}) : h(W.Skeleton,{variant:'card',label:t("正在载入当前页渲染…"),style:{width:'82%',margin:'auto'}}))))
 : h('div', { className: 'preview', ref: previewBox },h(W.Button,{icon:'close',className:'ppt-fullscreen-exit','data-window-drag-exclude':'',onClick:()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});}},pptText('退出全屏','Exit fullscreen')), mode === 'html' ? (project.html ? h('iframe', { ref: frame, title: t("演示文稿 HTML 预览"), sandbox: 'allow-scripts', srcDoc: previewDocument, onLoad: jump }) : h('p', null, t("此项目尚无 HTML，请保存一次生成预览。"))) : raster ? h('img', { className: 'render-page', src: raster, alt: t("最终 PPTX 第 ") + (index + 1) + t(" 页渲染结果") }) : h(W.Skeleton, { variant: 'card', label: t("正在载入当前页渲染…"), style: { width: '78%', margin: 'auto' } })),
 activeTab === 'visual' && visualDiff ? h('div',{className:'ppt-canvas-diff-card','data-dsh-card':''},
   h('div',{className:'ppt-canvas-diff-head'},
     h('strong',{'data-dsh-serif':''},pptText('AI 视觉修复前后对比（全宽画布）','AI Visual Review Before & After (Full Width)')),
     h('select',{'aria-label':pptText('画布对比页面','Canvas comparison slide'),value:visualDiff.compare,style:{width:'auto',minWidth:'180px'},onChange:e=>visualDiff.setCompare(e.target.value)},
       visualDiff.last.ids.map((id,i)=>h('option',{value:id,key:id},String(i+1)+'. '+(project.slides.find(s=>s.id===id)?.title||pptText('拆分页','Split page')))))),
   visualDiff.loading ? h(W.Skeleton,{variant:'card',label:pptText('正在载入前后对比图片…','Loading comparison images…')})
   : h('div',{className:'ppt-canvas-visual-diff'},
       [['before',visualDiff.first,pptText('原稿 · 实际 PPTX','Original · actual PPTX')],['after',visualDiff.last,visualDiff.run.rounds.length>1?pptText('修复后 · 实际 PPTX','Repaired · actual PPTX'):pptText('本次检查画面','Reviewed image')]].map(([slot,round,label])=>
         h('figure',{key:slot,className:'ppt-split-pane',style:{margin:0}},h('figcaption',null,label),
           visualDiff.pictures[slot] ? h('div',{className:'preview'},h('img',{className:'render-page',src:visualDiff.pictures[slot],alt:label}),
             (round?.findings||[]).filter(f=>f.slideId===visualDiff.compare).map((f,i)=>h('span',{key:i,title:f.issue,style:{position:'absolute',pointerEvents:'none',border:'2px solid var(--dsw-alias-state-warn-primary,#f97316)',boxSizing:'border-box',left:f.box[0]*100+'%',top:f.box[1]*100+'%',width:f.box[2]*100+'%',height:f.box[3]*100+'%'}})))
           : h('p',{className:'muted'},pptText('此页由拆分新增或尚未载入。','Created by split or not loaded yet.')))))) : null,
 h('div',{className:'ppt-preview-help'},h('p', { className: 'muted' }, mode === 'html' ? pptText('这是 HTML 放映预览。单击文字定位编辑框，双击文字直接原地改写并同步 PPTX；左侧目录支持拖拽调序；独立打开 HTML 按 P 开启双屏演讲者提词台（含 L 键虚拟激光笔）。', 'This is the HTML playback preview. Click text to focus its field, or double-click text to edit inline and sync to PPTX. Drag slides in the left rail to reorder; press P in standalone HTML for Dual-Screen Presenter View.') : t("这是当前 PPTX 文件的实际渲染图片，仍需检查每页画面；PowerPoint / WPS 可能因字体环境而不同。"))),project.render?.missingFonts?.length ? h('div', { role: 'alert', className: 'notice error' }, t("渲染引擎报告缺失字体：") + project.render.missingFonts.join('、') + t("。请替换为目标电脑可用字体后重新渲染。")) : null,h('details', { className: 'card', 'data-dsh-card': '' }, h('summary', null, t("质量提醒（") + (project.quality.warningCount + project.quality.errorCount) + (languageOf() === 'en' ? ')' : '）')), h('div',{className:'ppt-issue-list'},(project.quality.issues || []).map((issue, i) => h('div', { key: i, className: 'ppt-issue-row' }, h('p', null, (issue.slide > 0 ? t("第 ") + issue.slide + t(" 页：") : "") + (languageOf() === 'en' ? issue.messageEn : issue.message) + (languageOf() === 'en' ? ' ' : '；') + (languageOf() === 'en' ? issue.suggestionEn : issue.suggestion)), issue.slide > 0 && project.slides[issue.slide - 1] ? h(W.Button, { className: 'ppt-issue-jump', icon: 'right', disabled: busy || imagePending, onClick: () => choose(project.slides[issue.slide - 1]) }, t("查看此页")) : null)))),h('p',{className:'w-muted'},pptText('快捷键：Ctrl/⌘+S 保存 · Esc 取消或返回 · Alt+←/→ 切换页面 · 独立放映按 P 开提词台 / L 激光笔','Shortcuts: Ctrl/⌘+S save · Esc cancel or go back · Alt+←/→ switch slides · Standalone HTML: P Presenter View / L Laser'))),
 h(W.SplitResizer,{...inspectorSplit.resizerProps,className:'ppt-split-resizer ppt-split-resizer-right',label:pptText('调整属性检查器宽度','Resize inspector')}),
 h('aside',{className:'ppt-inspector','aria-label':pptText('页面与辅助工具','Slide properties and tools')},
 h('section',{className:'ppt-inspector-panel',hidden:activeTab!=='content'},
 project.paceBudget ? h('div',{className:'card ppt-pace-card','data-dsh-card':''},
   h('div',{className:'ppt-pace-row'},
     h('strong',null,pptText('演讲节奏预算','Speaking Pace Budget')),
     h('span',{className:'ppt-pace-badge','data-over':project.paceBudget.overBudget?'true':'false'},
       project.paceBudget.overBudget
         ? pptText('超时 +' + project.paceBudget.deltaMinutes + ' 分钟','Over +' + project.paceBudget.deltaMinutes + 'm')
         : pptText('节奏均衡 · ~' + project.paceBudget.estimatedMinutes + ' 分钟','On pace · ~' + project.paceBudget.estimatedMinutes + 'm'))),
   h('div',{className:'ppt-pace-row'},
     h('label',{htmlFor:controlId+'-target-mins',style:{margin:0}},pptText('目标时长 (分钟)','Target (min)')),
     h('input',{id:controlId+'-target-mins',type:'number',min:1,max:240,value:targetMinsInput,disabled:busy||dirty||dataDirty,placeholder:String(Math.max(1,Math.round(project.paceBudget.estimatedMinutes||5))),onChange:e=>setTargetMinsInput(e.target.value)}),
     h(W.Button,{size:'sm',disabled:busy||dirty||dataDirty,onClick:()=>{const v=targetMinsInput.trim();applyStyle({targetMinutes:v?Number(v):null},pptText('目标演讲时长已更新。','Target speaking duration updated.'));}},pptText('设定时长','Set'))),
   project.paceBudget.overrunSlides?.length ? h('p',{className:'muted',style:{margin:0}},pptText('超预算页面：第 ' + project.paceBudget.overrunSlides.join('、') + ' 页','Over-budget slides: #' + project.paceBudget.overrunSlides.join(', #'))) : null) : null,
 h('div',{className:'card','data-dsh-card':''},h('h3',{'data-dsh-serif':''},pptText('页面内容','Slide content')),dirty && h('p', { className: 'dirty' }, t("有未保存修改，请先保存或取消，再切换页面。")),
overlaps.length ? h('div', { className: 'notice' }, h('strong', null, t("这些字段也被修改过，请比较后决定是否保存：")), overlaps.map(row => h('div', { key: row.key }, h('strong', null, t(fields.find(([key]) => key === row.key)[1])), h('p', null, t("最新版本：") + row.latest), h('p', null, t("你的修改：") + row.yours)))) : null,
typeof SlideArchetypeEditor === 'function' ? h(SlideArchetypeEditor, { slide, draft, disabled: busy || dataDirty, controlId, onChange: nextDraft => { setDraft(nextDraft); setDirty(true); } }) : null,
fields.filter(([key]) => {
  const activeLayout = draft.layout || slide.layout || 'bullets';
  if (key === 'title' || key === 'notes') return true;
  if (key === 'bullets') return ['bullets', 'callout', 'agenda', 'image-left', 'image-right', 'chart-split'].includes(activeLayout) || (slide.bullets?.length > 0) || Boolean(draft.bullets);
  if (key === 'takeaway') return !['cover', 'section', 'closing'].includes(activeLayout) || Boolean(slide.takeaway || draft.takeaway);
  if (key === 'source') return ['chart', 'chart-split', 'table', 'harvey', 'kpi', 'cards', 'comparison', 'matrix', 'gantt', 'architecture', 'tam', 'org', 'marimekko', 'sankey', 'swot', 'value-chain', 'mermaid', 'flowchart', 'sequence', 'quadrant', 'radar', 'dumbbell', 'heatmap', 'code', 'mockup'].includes(activeLayout) || Boolean(slide.source || draft.source);
  if (key === 'formula') return (activeLayout === 'callout' && (draft.variant === 'formula' || slide.variant === 'formula')) || Boolean(slide.formula || draft.formula);
  if (key === 'mermaid') return ['mermaid', 'flowchart', 'sequence'].includes(activeLayout) || Boolean(slide.mermaid || draft.mermaid);
  if (key === 'code' || key === 'language' || key === 'filename') return activeLayout === 'code' || Boolean(slide[key] || draft[key]);
  if (key === 'url') return activeLayout === 'mockup' || Boolean(slide.url || draft.url);
  if (key === 'xLabel' || key === 'yLabel') return activeLayout === 'quadrant' || Boolean(slide[key] || draft[key]);
  if (key === 'subtitle') return ['cover', 'section', 'closing', 'quote', 'statement', 'image-left', 'image-right'].includes(activeLayout) || Boolean(slide.subtitle || draft.subtitle);
  if (key === 'kicker') return ['cover', 'section', 'closing', 'cards', 'kpi', 'bullets', 'chart', 'mockup', 'code', 'quadrant', 'radar', 'dumbbell', 'heatmap'].includes(activeLayout) || Boolean(slide.kicker || draft.kicker);
  return Boolean(slide[key] || draft[key] || ['statement', 'callout'].includes(activeLayout));
}).map(([key, label]) => h('div', { key }, h('label', { htmlFor: controlId+'-'+key }, t(label)), ['title', 'kicker', 'takeaway', 'source', 'language', 'filename', 'url', 'xLabel', 'yLabel'].includes(key) ? h(W.Input, { id: controlId+'-'+key, inputRef: el => { fieldRefs.current[key] = el; }, disabled: busy || dataDirty, value: draft[key] || '', maxLength: 8000, onChange: e => { setDraft({ ...draft, [key]: e.target.value }); setDirty(true); } }) : h('textarea', { id: controlId+'-'+key, ref: el => { fieldRefs.current[key] = el; }, disabled: busy || dataDirty, value: draft[key] || '', rows: key === 'code' ? 8 : key === 'mermaid' ? 5 : key === 'bullets' ? 4 : 2, style: key === 'code' ? { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '12.5px' } : undefined, maxLength: (key === 'mermaid' || key === 'code') ? 16000 : 8000, placeholder: key === 'formula' ? '\\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2' : key === 'mermaid' ? 'flowchart LR\n  A([Start]) --> B{Decision}\n  B -->|Yes| C[Result]' : key === 'code' ? 'export function run() {\n  return "ok";\n}' : undefined, onChange: e => { setDraft({ ...draft, [key]: e.target.value }); setDirty(true); } }))),h('details',{className:'ppt-image-section',open:!!image},h('summary',null,pptText('图片','Image')),h('label', { htmlFor: controlId+'-image' }, slide.image ? t("替换图片（PNG / JPEG）") : t("添加图片（会改为图文布局）")),
h('input', { id: controlId+'-image', type: 'file', accept: 'image/png,image/jpeg', disabled: busy || dataDirty, onChange: upload }),
currentImage && h('img', { className: 'image-preview', src: currentImage, alt: image?.alt || slide.image?.alt || t("当前图片") }),
image && h(React.Fragment, null, h('p', { className: 'muted' }, t("已选择：") + image.name), h('label', { htmlFor: controlId+'-alt' }, t("图片说明")), h(W.Input, { id: controlId+'-alt', value: image.alt, disabled: busy || dataDirty, onChange: e => setImage({ ...image, alt: e.target.value }) }), h('label', { htmlFor: controlId+'-fit' }, t("图片适应方式")), h('select', { id: controlId+'-fit', value: image.fit, disabled: busy || dataDirty, onChange: e => setImage({ ...image, fit: e.target.value }) }, h('option', { value: 'contain' }, t("完整显示")), h('option', { value: 'cover' }, t("填满并裁切"))))),h('div',{className:'tools'},h(W.Button, { variant: 'primary', icon: 'check', 'aria-keyshortcuts': 'Control+S Meta+S', disabled: busy || dataDirty || imagePending || !dirty, onClick: () => save(false) }, t("保存此页")),h(W.Button, { icon: 'copy', 'aria-keyshortcuts': 'Control+Shift+S Meta+Shift+S', disabled: busy || dataDirty || imagePending, onClick: () => save(true) }, t("另存副本")),
h(W.Button, { icon: 'close', 'aria-keyshortcuts': 'Escape', disabled: busy || (!dirty && !imagePending), onClick: () => { imageLoader.current.cancel(); setDraft(draftFor(slide)); setImage(null); setDirty(false); setError(''); setMessage(''); setConflict(false); setOverlaps([]); } }, t("取消修改")),
h(W.Button, { icon: 'reply', disabled: busy || dirty || imagePending || dataDirty || !project.undoAvailable, onClick: undo }, t("撤销上次修改")))),h('div',{className:'w-toolbar ppt-structure'},h(W.Button,{icon:'up',disabled:busy || dirty || imagePending || dataDirty || index===0,onClick:()=>move(-1)},t('上移')),h(W.Button,{icon:'down',disabled:busy || dirty || imagePending || dataDirty || index===project.slides.length-1,onClick:()=>move(1)},t('下移')),h(W.Button,{icon:'trash',variant:'danger',disabled:busy || dirty || imagePending || dataDirty || project.slides.length<=1,onClick:()=>{setError('');setDeleteOpen(true);}},t('删除本页')))),
 h('section',{className:'ppt-inspector-panel',hidden:activeTab!=='style'},typeof StyleStudioPanel === 'function' ? h(StyleStudioPanel, { key: 'style:' + project.id + ':' + project.revision, project, busy, blocked: dirty || imagePending || dataDirty,
                onApplyTheme: theme => applyStyle({ theme }, t("已切换全稿主题，HTML、PPTX 和工程文件已同步更新，可撤销。")),
                onApplyBrand: brand => applyStyle({ brand }, t("品牌与母版设置已更新，可撤销。")),
                onApplyAbsorbed: ({ theme, brand, taste }) => applyStyle({ ...(theme ? { theme } : {}), ...(brand !== undefined ? { brand } : {}), ...(taste !== undefined ? { taste } : {}) }, t("品味配方与品牌母版已更新，可撤销。")),
                onSyncPptx: syncEditedPptx,
                onError: setError, onMessage: setMessage }) : null),
 h('section',{className:'ppt-inspector-panel',hidden:activeTab!=='visual'},h(VisualPanel, { key: 'visual:' + project.id, project, selected, blocked: busy || dirty || imagePending || dataDirty,
                onDiffChange: setVisualDiff,
                onBusy: value => { setBusy(value); setJob(languageOf() === 'en' ? 'Reviewing rendered slides…' : '正在检查和复查实际 PPTX 画面…'); },
                onAdopt: next => { adopt(next, selected); setMode(next.render ? 'pptx' : 'html'); setMessage(languageOf() === 'en' ? 'Opened the repaired copy. The original is kept, and formatting changes can be undone.' : '已打开修复副本，原稿保留，可撤销排版修改。'); } })),
 h('section',{className:'ppt-inspector-panel',hidden:activeTab!=='rehearsal'},h(CoachingPanel, { key: project.id, project, selected, blocked: busy || dirty || imagePending || dataDirty,
                onChoose: id => { choose(project.slides.find(s => s.id === id)); previewBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
                onAdopt: next => { adopt(next, selected); setMessage(languageOf() === 'en' ? 'Saved to a new copy. The original is kept; you can undo the adopted changes in this copy.' : '已保存为新副本，原稿保留；可在当前副本中撤销采纳的修改。'); } })),
 h('section',{className:'ppt-inspector-panel',hidden:activeTab!=='data'},project.dataModel?project.dataModel && h(DataPanel, { key: project.id + ':' + project.revision, project, blocked: busy || dirty || imagePending || mode !== 'html', incoming: incomingData,
                onParameters: parameters => frame.current?.contentWindow?.postMessage({ type: 'dsh-ppt-data-set', nonce: nonce.current, parameters, command: ++dataCommand.current }, '*'), onDirty: setDataDirty, onBusy: value => { setBusy(value); setJob(languageOf() === 'en' ? 'Updating presentation data…' : '正在核对并更新数据…'); },
                onAdopt: next => { adopt(next, selected); setMessage(languageOf() === 'en' ? 'Saved confirmed data. HTML, PPTX and project are synchronized; undo is available.' : '已保存确认后的数据，HTML、PPTX 和工程已同步，可撤销。'); }, onChoose: id => choose(project.slides.find(s => s.id === id)), onDownload: download }):h(W.Empty,{title:pptText('此工程没有绑定数据模型','This project has no bound data model'),icon:'file'},pptText('生成时提供来源、指标和可调假设后，可在这里核对来源并预览推演影响。普通演示文稿仍可正常编辑和下载。','Provide sources, metrics and adjustable assumptions when generating the deck to inspect lineage and scenario changes here. Normal editing and downloads remain available.'))))),
 downloadOpen && project ? h(W.Dialog,{className:'pptw ppt-dialog',title:pptText('下载成品','Download output'),closeLabel:pptText('关闭','Close'),onClose:()=>setDownloadOpen(false)},h('div',{className:'ppt-downloads'},
 h('p',{className:'muted'},pptText('分享包包含 PPTX、HTML 和讲稿，不含工程 JSON；工程包保留完整编辑资料。请先保存修改，再下载最新版本。','The share bundle contains PPTX, HTML and speaker notes, without the project JSON. The project bundle keeps full editing data. Save edits before downloading.')),
 h('p',{className:'muted'},pptText('HTML、PPTX 备注和讲稿保留已绑定的来源摘录与用户填写内容。','HTML, PPTX notes and speaker notes retain bound source excerpts and authored content.')),
 h('div', { className: 'tools' }, h(W.Button, { variant: 'primary', icon: 'download', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('share') }, pptText('下载分享成品包 ZIP','Download share bundle ZIP')),h(W.Button,{icon:'download',disabled:busy || dirty || imagePending || dataDirty,onClick:()=>download('bundle')},pptText('下载完整工程包 ZIP','Download project bundle ZIP')), h(W.Button, { icon: 'download', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('pptx') }, t("下载最新 PPTX")), h(W.Button, { icon: 'download', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('pdf') }, t("导出高精 PDF (.pdf)")), h(W.Button, { icon: 'download', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('png-zip') }, t("导出逐页 PNG 图包 (.zip)")), h(W.Button, { icon: 'download', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('html') }, t("下载 HTML")), h(W.Button, { icon: 'download', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('onepager') }, pptText('下载高管一页纸 (.html)', 'Download Executive One-Pager (.html)')), h(W.Button, { icon: 'download', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('remotion') }, pptText('导出 Remotion 视频分镜包 (.zip)', 'Export Remotion Video Bundle (.zip)')), h(W.Button, { icon: 'download', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('handout') }, pptText('下载演讲讲义 (.md)', 'Download Handout')), h(W.Button, { icon: 'download', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('notes') }, t("下载讲稿 Markdown")), h(W.Button, { icon: 'download', disabled: busy || dirty || imagePending || dataDirty, onClick: () => download('json') }, t("备份工程"))))) : null,
 pendingNav ? h(W.Dialog,{className:'pptw ppt-dialog',title:pptText('有未保存的修改','Unsaved changes'),closeLabel:pptText('继续编辑','Keep editing'),busy,onClose:()=>setPendingNav(null)},h('p',null,pptText('请选择如何处理当前页的修改。','Choose what to do with the current slide edits.')),h(W.Status,{tone:'error'},error),h('div',{className:'w-toolbar'},h(W.Button,{variant:'primary',icon:'check',disabled:busy || imagePending || dataDirty,onClick:async()=>{const target=pendingNav;const result=await save();if(result?.project && alive.current)finishNavigation(target,result.project);}},pptText('保存后继续','Save and continue')),h(W.Button,{icon:'close',disabled:busy,onClick:()=>finishNavigation(pendingNav)},pptText('放弃修改并继续','Discard and continue')),h(W.Button,{variant:'ghost',disabled:busy,onClick:()=>setPendingNav(null)},pptText('继续编辑','Keep editing')))) : null,
 deleteOpen && project ? h(W.Dialog,{className:'pptw ppt-dialog',title:t('删除本页'),closeLabel:pptText('取消','Cancel'),busy,onClose:()=>setDeleteOpen(false)},h('p',null,pptText('将删除当前页面，之后可以撤销。','Remove the current slide. You can undo this change.')),h(W.Status,{tone:'error'},error),h('div',{className:'w-toolbar'},h(W.Button,{variant:'danger',icon:'trash',disabled:busy,onClick:async()=>{const result=await structure('remove');if(result)setDeleteOpen(false);}},pptText('确认删除本页','Confirm remove slide')),h(W.Button,{disabled:busy,onClick:()=>setDeleteOpen(false)},pptText('取消','Cancel')))) : null,
 typeof PptCreateDialog === 'function' ? h(PptCreateDialog, { open: createOpen, initialMode: createMode, busy, onClose: () => setCreateOpen(false), onCreate: createDeck, onCreateDemo: createDemo, onImport: importDeck, onImportOffice: importOfficeDeck, onError: setError }) : null),"dsh-ppt");
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
    } },{"name":"dsh-ppt","version":"0.1.0","hasWorkbench":true,"packageVersion":"0.32.0","label":"演示文稿","labelEn":"PPT","suiteComponent":true,"sectionIds":["dsh-ppt"],"iconData":"data:image/webp;base64,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"}));

})();

/* STARDUSTLC_UPDATE_CLIENT_BODY_END */
})();

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

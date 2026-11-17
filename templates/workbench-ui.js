/* DSH Workbench UI v2 — Unified DeepSeek Harness (>=0.2.2-rc.3) Studio UI & Motion Kit.
 * Integrates @deepseek-ai/dsh-client-ui-primitives lazily at render time with semantic HTML
 * fallbacks for standalone jsdom/VM tests, 5 switchable [data-dsh-style] themes synced via
 * localStorage['dsh-stardust:ui-style'] + 'dsh-stardust-style', soft-slate dark adaptation,
 * tactile press physics, small-button icon micro-animations, and window-drag exclusions.
 */
function createWorkbenchUI(React, requireFn) {
  const h = React.createElement;
  const useIdHook = typeof React.useId === 'function' ? React.useId : () => 'dshw-id';
  const useEffectHook = typeof React.useEffect === 'function' ? React.useEffect : () => {};
  const useRefHook = typeof React.useRef === 'function' ? React.useRef : (initial => ({ current: initial }));
  const useStateHook = typeof React.useState === 'function' ? React.useState : (initial => [typeof initial === 'function' ? initial() : initial, () => {}]);
  const forwardRefWrap = typeof React.forwardRef === 'function' ? React.forwardRef : (fn => props => fn(props, null));
  const cx = (...values) => values.filter(Boolean).join(' ');

  const DSH_STYLE_STORAGE_KEY = 'dsh-stardust:ui-style';
  const DSH_STYLE_EVENT = 'dsh-stardust-style';
  const DSH_DEFAULT_STYLE = 'harness';

  const DSH_STYLES = Object.freeze([
    Object.freeze({ id: 'harness', zh: '原生清透', zhShort: '原生', en: 'Native Airy', enShort: 'Native', swatch: '#4176e6', surface: '#f8fafc' }),
    Object.freeze({ id: 'cream', zh: '米白纸感', zhShort: '米白色', en: 'Warm Cream', enShort: 'Cream', swatch: '#9e5829', surface: '#faf7f0' }),
    Object.freeze({ id: 'claude', zh: 'Claude 暖书卷', zhShort: 'Claude风', en: 'Claude Warmth', enShort: 'Claude', swatch: '#c96442', surface: '#f5f4ed' }),
    Object.freeze({ id: 'pixel8bit', zh: '8-Bit 像素', zhShort: '8-Bit像素', en: 'Bright 8-Bit', enShort: '8-Bit', swatch: '#2e7d5b', surface: '#f4f6e8' }),
    Object.freeze({ id: 'mint', zh: '晴空薄荷', zhShort: '薄荷', en: 'Airy Mint', enShort: 'Mint', swatch: '#0f766e', surface: '#f5fafb' }),
  ]);

  const VALID_STYLE_IDS = new Set(DSH_STYLES.map(preset => preset.id));

  function resolveWindow(win) {
    if (win && typeof win === 'object') return win;
    return typeof window !== 'undefined' ? window : null;
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

  function syncPortaledOverlays(style, doc) {
    const normalized = normalizeDshStyle(style);
    const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
    if (!targetDoc || typeof targetDoc.querySelectorAll !== 'function') return;
    for (const el of targetDoc.querySelectorAll('[data-dsh-portal-synced]')) {
      el.setAttribute('data-dsh-style', normalized);
      if (!el.hasAttribute('data-window-drag-exclude')) {
        el.setAttribute('data-window-drag-exclude', '');
      }
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
      syncPortaledOverlays(normalized, target.document);
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

  function subscribeDshStyle(onChange, win) {
    const target = resolveWindow(win);
    if (!target || typeof target.addEventListener !== 'function' || typeof onChange !== 'function') {
      return () => {};
    }
    const onCustom = event => {
      const next = normalizeDshStyle(event?.detail?.style ?? readDshStyle(target));
      syncPortaledOverlays(next, target.document);
      onChange(next);
    };
    const onStorage = event => {
      if (event && event.key !== null && event.key !== undefined && event.key !== DSH_STYLE_STORAGE_KEY) {
        return;
      }
      const next = normalizeDshStyle(event?.newValue ?? readDshStyle(target));
      syncPortaledOverlays(next, target.document);
      onChange(next);
    };
    target.addEventListener(DSH_STYLE_EVENT, onCustom);
    target.addEventListener('storage', onStorage);
    return () => {
      target.removeEventListener(DSH_STYLE_EVENT, onCustom);
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
        syncPortaledOverlays(current, resolveWindow(win)?.document);
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

  function createOverlaySyncRef(style) {
    const normalized = normalizeDshStyle(style);
    return node => {
      if (!node || typeof node.setAttribute !== 'function') return;
      node.setAttribute('data-dsh-style', normalized);
      node.setAttribute('data-window-drag-exclude', '');
      node.setAttribute('data-dsh-portal-synced', 'true');
      if (typeof node.closest === 'function') {
        const overlay = node.closest('[role="dialog"], [role="alertdialog"], [role="menu"], dialog');
        if (overlay) {
          overlay.setAttribute('data-dsh-style', normalized);
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

  function resolveHostPrimitives(customRequire = requireFn) {
    let host = null;
    if (typeof customRequire === 'function') {
      try {
        host = customRequire('@deepseek-ai/dsh-client-ui-primitives') || null;
      } catch {
        host = null;
      }
    }

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

    function renderPortalSyncNode(styleValue) {
      const syncStyle = normalizeDshStyle(styleValue ?? readDshStyle());
      return h('span', {
        key: '__dsh_portal_sync__',
        ref: createOverlaySyncRef(syncStyle),
        hidden: true,
        'aria-hidden': 'true',
        'data-dsh-style': syncStyle,
      });
    }

    function FallbackMenu({ open = false, anchor, items = [], children, selectedId, onSelect, onClose, footer, className, listClassName, dshStyle }) {
      const style = normalizeDshStyle(dshStyle ?? readDshStyle());
      return h('div', { className: cx('dsh-style-fallback-wrap', className) },
        anchor,
        open
          ? h('div', {
              role: 'menu',
              'data-dsh-style': style,
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
            items.map(item => h('button', {
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
            }, h('span', null, item.label), item.id === selectedId ? h('span', { 'aria-hidden': 'true' }, '✓') : null)),
            children,
            footer)
          : null);
    }

    function FallbackModal({ open = true, onClose, title, closeLabel = 'Close', children, footer, className, contentClassName, onKeyDownCapture, headless = false, dshStyle }) {
      if (!open) return null;
      const style = normalizeDshStyle(dshStyle ?? readDshStyle());
      return h('div', {
        className: 'dsh-fallback-modal-root',
        role: 'presentation',
        'data-dsh-style': style,
        'data-window-drag-exclude': '',
        'data-dsh-portal-synced': 'true',
        onKeyDownCapture: event => {
          onKeyDownCapture?.(event);
          if (!event?.defaultPrevented && event?.key === 'Escape') {
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
      ? function HostMenuWithStyle({ dshStyle, children, ...menuProps }) {
          if (!menuProps.open) {
            return children !== undefined ? h(host.Menu, menuProps, children) : h(host.Menu, menuProps);
          }
          const syncNode = renderPortalSyncNode(dshStyle);
          return children !== undefined && children !== null
            ? h(host.Menu, menuProps, children, syncNode)
            : h(host.Menu, menuProps, syncNode);
        }
      : FallbackMenu;

    const WrappedModal = host?.Modal
      ? function HostModalWithStyle({ dshStyle, children, ...modalProps }) {
          if (!modalProps.open) {
            return children !== undefined ? h(host.Modal, modalProps, children) : h(host.Modal, modalProps);
          }
          const syncNode = renderPortalSyncNode(dshStyle);
          return children !== undefined && children !== null
            ? h(host.Modal, modalProps, children, syncNode)
            : h(host.Modal, modalProps, syncNode);
        }
      : FallbackModal;

    return {
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
  }

  function Button({ children, icon, iconSize = 16, variant = 'outline', size = 'sm', className, ...props }) {
    const P = resolveHostPrimitives();
    const hostVariant = variant === 'danger' ? 'ghost' : (variant || 'outline');
    const iconEl = typeof icon === 'string' ? h(Icon, { name: icon, size: iconSize }) : icon;
    return h(P.Button, {
      variant: hostVariant,
      size,
      ...props,
      'data-variant': variant || 'outline',
      className: cx('w-button', variant && 'w-' + variant, className),
      icon: iconEl,
    }, children);
  }

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
    const P = resolveHostPrimitives();
    const selected = items.find(item => item.id === value);
    return h(P.Menu, {
      open: Boolean(open && !disabled),
      selectedId: value,
      dshStyle: style,
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

  function StyleSwitcher({ style: controlledStyle, onChange, lang = 'zh', id = 'dsh-style-switcher', compact = true, disabled = false, align = 'end', className } = {}) {
    const [syncedStyle, setSyncedStyle] = useDshStyle();
    const activeStyle = normalizeDshStyle(controlledStyle ?? syncedStyle);
    const [open, setOpen] = useStateHook(false);
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
        onClick: () => setOpen(prev => !prev),
        onKeyDown: event => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault?.();
            setOpen(true);
          }
        },
      },
      h('span', { className: 'dsh-style-swatch', 'aria-hidden': 'true', style: { '--dsh-swatch-color': preset.swatch } }),
      h('span', { className: 'dsh-style-label' }, visibleText),
      h(Icon, { name: 'down', size: 14 })),
    }));
  }

  function Page({ title, subtitle, icon, navigation, actions, children, workbench = false, lang = 'zh', showStyleSwitcher = true, className, rootRef, ...props }) {
    const [style, setStyle] = useDshStyle();
    return h('section', {
      ...props,
      ref: rootRef,
      'data-dsh-style': style,
      'data-main': workbench ? 'true' : 'false',
      className: cx('dshw', 'w-page', !workbench && 'w-embedded', className),
    },
      h(Styles, { key: 'styles' }),
      h('header', { className: 'w-page-header' },
        h('div', { className: 'w-heading' },
          h('h1', { className: 'w-title' },
            icon ? h('span', { className: 'w-brand' }, h(Icon, { name: icon, size: 17 })) : null,
            h('span', null, title)),
          subtitle ? h('p', { className: 'w-subtitle' }, subtitle) : null),
        navigation || null,
        (actions || showStyleSwitcher)
          ? h('div', { className: 'w-header-actions', 'data-window-drag-exclude': '' },
              showStyleSwitcher ? h(StyleSwitcher, { style, onChange: setStyle, lang, compact: true }) : null,
              actions)
          : null),
      h('div', { className: 'w-body' }, children));
  }

  function Tabs({ items, value, onChange, label, children }) {
    const id = useIdHook();
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
        type: 'button',
        role: 'tab',
        key: item.id,
        className: 'w-tab',
        id: id + '-' + item.id,
        'aria-selected': active === item.id,
        tabIndex: active === item.id ? 0 : -1,
        onClick: () => onChange(item.id),
        onKeyDown: event => keys(event, index),
      }, item.icon ? h(Icon, { name: item.icon, size: 15 }) : null, item.label, item.count !== undefined ? h('span', { className: 'w-count' }, item.count) : null))),
      h('div', { className: 'w-tab-panel', id: id + '-panel', role: 'tabpanel', 'aria-labelledby': id + '-' + active }, children));
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
    return h('div', { className: 'dshw w-empty', 'data-dsh-style': style },
      h(Styles, { key: 'styles' }),
      h('span', { className: 'w-empty-icon' }, h(Icon, { name: icon, size: 24 })),
      h('h2', null, title),
      children ? h('div', { className: 'w-muted' }, children) : null,
      action ? h('div', { className: 'w-toolbar' }, action) : null);
  }

  function Split({ list, detail, selected, onBack, backLabel, className, listWidth = 360 }) {
    const ref = useRefHook(null);
    useEffectHook(() => {
      if (!selected || !ref.current || ref.current.clientWidth > 760) return;
      const heading = ref.current.querySelector('.w-detail h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }, [selected]);
    return h('div', { ref, className: cx('w-split', className), 'data-selected': selected ? 'true' : 'false', style: { '--w-list-width': listWidth + 'px' } },
      h('div', { className: 'w-master' }, list),
      h('div', { className: 'w-detail' }, selected ? h(Button, { className: 'w-back', icon: 'left', variant: 'ghost', onClick: onBack }, backLabel) : null, detail));
  }

  function Row({ title, meta, description, active, onClick, children, status, className, disabled }) {
    return h('div', {
      className: cx('w-row', 'dsh-row', active && 'w-selected', className),
      'data-dsh-row': '',
      'data-selected': active ? 'true' : 'false',
    },
      children ? h('div', { className: 'w-row-select' }, children) : null,
      h('button', { type: 'button', className: 'w-row-button', onClick, disabled, 'aria-pressed': !!active },
        h('span', { className: 'w-row-head' }, h('strong', null, title), status ? h('span', { className: 'w-tag' }, status) : null),
        meta ? h('span', { className: 'w-row-meta' }, meta) : null,
        description ? h('span', { className: 'w-row-description' }, description) : null));
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
    const id = useIdHook();
    const P = resolveHostPrimitives();
    const close = () => { if (!busy) onClose?.(); };
    return h(P.Modal, {
      open: true,
      headless: true,
      dshStyle: style,
      title,
      onClose: close,
      backdropBlur: false,
      className: cx('dshw', 'w-dialog-modal', className),
    },
      h('div', {
        ref: createOverlaySyncRef(style),
        className: cx('dshw', 'w-dialog', className),
        'data-dsh-style': style,
        'data-window-drag-exclude': '',
        'aria-labelledby': id,
      },
        h(Styles, { key: 'styles' }),
        h('header', { className: 'w-dialog-header' },
          h('h2', { id, 'data-tone': tone }, title),
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
 * DeepSeek Harness (>=0.2.2-rc.3) Unified Themes, Motion & Workbench UI v2
 * ========================================================================== */
:where([data-dsh-style]),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) {
  --dsh-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --dsh-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --dsh-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --dsh-motion-fast: 140ms;
  --dsh-motion-base: 200ms;
  --dsh-motion-dialog: 220ms;
  --dsh-control-border-width: 0.5px;
  --dsh-button-shadow: none;
  --dsh-button-hover-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
  --dsh-card-hover-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
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

[data-window-drag-exclude] {
  -webkit-app-region: no-drag;
}

/* 1. Preset: harness (Native Airy + Soft Breathable Slate Dark Mode) */
:where(body:not([data-ds-dark-theme])) [data-dsh-style="harness"],
:where(body:not([data-ds-dark-theme])) :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style="harness"]) {
  color-scheme: light;
  accent-color: var(--dsw-alias-state-business-primary, #4176e6);
}

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

/* NEVER TOO DARK: Soft breathable slate when host dark mode is active in harness mode */
body[data-ds-dark-theme] [data-dsh-style="harness"],
body[data-ds-dark-theme] :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="harness"], :has([data-dsh-style="harness"])) {
  color-scheme: dark;
  accent-color: #7aaaff;
  --dsw-alias-bg-base: #1f232b;
  --dsw-alias-bg-layer-1: #272c36;
  --dsw-alias-bg-layer-2: #2f3542;
  --dsw-alias-bg-layer-3: #373e4d;
  --dsw-alias-bg-overlay: #2a303c;
  --dsw-alias-bg-document-preview: #1f232b;
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

/* 2. Preset: cream (Warm Cream / 米白纸感) */
[data-dsh-style="cream"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="cream"], :has([data-dsh-style="cream"])) {
  color-scheme: light;
  accent-color: #9e5829;
  --dsw-alias-bg-base: #faf7f0;
  --dsw-alias-bg-layer-1: #f3efe4;
  --dsw-alias-bg-layer-2: #eae3d3;
  --dsw-alias-bg-layer-3: #e0d7c3;
  --dsw-alias-bg-overlay: #fcfaf4;
  --dsw-alias-bg-document-preview: #e8e1d0;
  --dsw-alias-bg-module-platform: #efe9da;
  --dsw-alias-settings-card-fill: #f5f1e6;
  --dsw-alias-settings-card-stroke: #dfd5be;
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
  --dsw-elevation-panel: 0 3px 12px rgba(68, 52, 32, 0.07), 0 0 0 1px rgba(180, 164, 138, 0.35);
  --dsw-elevation-prominent: 0 14px 34px rgba(68, 52, 32, 0.14), 0 2px 6px rgba(68, 52, 32, 0.06), 0 0 0 1px rgba(180, 164, 138, 0.42);
  --dsh-control-border-width: 1px;
  --dsh-button-hover-shadow: 0 2px 6px rgba(84, 62, 34, 0.09);
  --dsh-card-hover-shadow: 0 8px 20px rgba(84, 62, 34, 0.10);
  --dsh-surface-spotlight: rgba(166, 94, 46, 0.08);
}

/* 3. Preset: claude (Claude Warmth / Claude 暖书卷) */
[data-dsh-style="claude"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="claude"], :has([data-dsh-style="claude"])) {
  color-scheme: light;
  accent-color: #c96442;
  --dsw-alias-bg-base: #f5f4ed;
  --dsw-alias-bg-layer-1: #ece9df;
  --dsw-alias-bg-layer-2: #e3dfd2;
  --dsw-alias-bg-layer-3: #d8d3c3;
  --dsw-alias-bg-overlay: #faf9f4;
  --dsw-alias-bg-document-preview: #e1ddd0;
  --dsw-alias-bg-module-platform: #e7e3d6;
  --dsw-alias-settings-card-fill: #efece2;
  --dsw-alias-settings-card-stroke: #dad5c6;
  --dsw-specific-menu: rgba(250, 249, 244, 0.97);
  --dsw-alias-border-l1: #e2ded0;
  --dsw-alias-border-l2: #d0cbc0;
  --dsw-alias-border-l3: #bcb6a7;
  --dsw-alias-border-l4: #a69f8f;
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
  --dsw-elevation-panel: 0 3px 14px rgba(31, 30, 27, 0.06), 0 0 0 1px rgba(145, 139, 126, 0.28);
  --dsw-elevation-prominent: 0 16px 38px rgba(31, 30, 27, 0.13), 0 2px 8px rgba(31, 30, 27, 0.05), 0 0 0 1px rgba(145, 139, 126, 0.34);
  --dsh-control-border-width: 1px;
  --dsh-button-hover-shadow: 0 2px 7px rgba(31, 30, 27, 0.08);
  --dsh-card-hover-shadow: 0 8px 22px rgba(31, 30, 27, 0.09);
  --dsh-surface-spotlight: rgba(201, 100, 66, 0.08);
}

[data-dsh-style="claude"] :where(header h1, [data-dsh-editorial-heading]),
:where([role="dialog"], dialog):where([data-dsh-style="claude"], :has([data-dsh-style="claude"])) header h2 {
  font-family: "Iowan Old Style", "Georgia", "Songti SC", "Noto Serif SC", var(--dsw-font-family, serif);
  letter-spacing: -0.01em;
}

/* 4. Preset: pixel8bit (Bright 8-Bit / 8-Bit 像素) */
[data-dsh-style="pixel8bit"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) {
  color-scheme: light;
  accent-color: #2e7d5b;
  --dsw-alias-bg-base: #f4f6e8;
  --dsw-alias-bg-layer-1: #e7eed2;
  --dsw-alias-bg-layer-2: #dbe5c0;
  --dsw-alias-bg-layer-3: #cedaad;
  --dsw-alias-bg-overlay: #f9fbf0;
  --dsw-alias-bg-document-preview: #dbe5c0;
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
  --dsw-elevation-panel: 3px 3px 0px #1e2826;
  --dsw-elevation-prominent: 4px 4px 0px #1e2826;
  --dsh-control-border-width: 2px;
  --dsh-button-shadow: 2px 2px 0px #1e2826;
  --dsh-button-hover-shadow: 3px 3px 0px #1e2826;
  --dsh-card-hover-shadow: 4px 4px 0px #1e2826;
  --dsh-surface-spotlight: rgba(46, 125, 91, 0.12);
}

[data-dsh-style="pixel8bit"] :where(button, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemradio"], [data-dsh-card], [data-dsh-panel], .w-input, .w-status, .w-tag, .w-count, .w-brand, .w-empty-icon),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) :where(button, input, select, textarea, [role="menuitem"], [role="menuitemradio"], .w-input) {
  border-radius: 0px !important;
  corner-shape: square;
}

[data-dsh-style="pixel8bit"] :where(button:not([role="tab"]), .dsh-btn, a.w-button),
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) :where(button:not([role="tab"]), .dsh-btn, a.w-button) {
  border: 2px solid #1e2826;
  box-shadow: 2px 2px 0px #1e2826;
}

[data-dsh-style="pixel8bit"] :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea, .w-input),
:where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea, .w-input) {
  border-width: 2px;
  border-color: #1e2826;
}

:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) {
  border: 2px solid #1e2826 !important;
  box-shadow: 4px 4px 0px #1e2826 !important;
  backdrop-filter: none;
}

[data-dsh-style="pixel8bit"] [role="tab"][aria-selected="true"]::after {
  border-block-end-color: #d95b43;
  border-block-end-width: 3px;
}

/* 5. Preset: mint (Airy Mint / 晴空薄荷) */
[data-dsh-style="mint"],
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="mint"], :has([data-dsh-style="mint"])) {
  color-scheme: light;
  accent-color: #0f766e;
  --dsw-alias-bg-base: #f5fafb;
  --dsw-alias-bg-layer-1: #eaf3f6;
  --dsw-alias-bg-layer-2: #dcebf0;
  --dsw-alias-bg-layer-3: #cce1e8;
  --dsw-alias-bg-overlay: #fafdff;
  --dsw-alias-bg-document-preview: #d9e8ee;
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
}

/* 6. Interactive Dynamics: Tactile Button Physics & Active States */
:where([data-dsh-style]) :where(button, [role="button"], a.w-button),
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) :where(button, [role="button"], a.w-button) {
  translate: 0px 0px;
  scale: 1;
  transition-property: background-color, border-color, color, box-shadow, opacity, translate, scale;
  transition-duration: var(--dsh-motion-fast);
  transition-timing-function: var(--dsh-ease-out);
}

:where([data-dsh-style]) :where(button, [role="button"])[aria-expanded="true"]:not(:disabled):not([aria-disabled="true"]),
:where([role="dialog"], [role="alertdialog"], dialog):has([data-dsh-style]) :where(button, [role="button"])[aria-expanded="true"]:not(:disabled):not([aria-disabled="true"]) {
  background-color: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
}

@media (prefers-reduced-motion: no-preference) {
  @media (hover: hover) {
    :where([data-dsh-style]:not([data-dsh-style="pixel8bit"])) :where(button:not([role="tab"]):not([role="menuitem"]):not([role="menuitemradio"]):not([role="switch"]), .dsh-btn, a.w-button):hover:not(:disabled):not([aria-disabled="true"]),
    :where([role="dialog"], [role="alertdialog"], dialog):has([data-dsh-style]:not([data-dsh-style="pixel8bit"])) :where(button:not([role="tab"]):not([role="menuitem"]):not([role="menuitemradio"]):not([role="switch"]), .dsh-btn, a.w-button):hover:not(:disabled):not([aria-disabled="true"]) {
      translate: 0px -0.5px;
      box-shadow: var(--dsh-button-hover-shadow);
    }

    [data-dsh-style="pixel8bit"] :where(button:not([role="tab"]):not([role="menuitem"]):not([role="menuitemradio"]), .dsh-btn, a.w-button):hover:not(:disabled):not([aria-disabled="true"]),
    :where([role="dialog"], [role="alertdialog"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) :where(button:not([role="tab"]):not([role="menuitem"]):not([role="menuitemradio"]), .dsh-btn, a.w-button):hover:not(:disabled):not([aria-disabled="true"]) {
      translate: -1px -1px;
      box-shadow: 3px 3px 0px #1e2826;
      transition-timing-function: steps(2, end);
      transition-duration: 70ms;
    }
  }

  :where([data-dsh-style]:not([data-dsh-style="pixel8bit"])) :where(button:not([role="switch"]), [role="button"], a.w-button):active:not(:disabled):not([aria-disabled="true"]),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]:not([data-dsh-style="pixel8bit"])) :where(button:not([role="switch"]), [role="button"], a.w-button):active:not(:disabled):not([aria-disabled="true"]) {
    scale: 0.965;
    translate: 0px 0.5px;
    transition-duration: 80ms;
  }

  [data-dsh-style="pixel8bit"] :where(button:not([role="tab"]):not([role="switch"]), .dsh-btn, a.w-button):active:not(:disabled):not([aria-disabled="true"]),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style="pixel8bit"], :has([data-dsh-style="pixel8bit"])) :where(button:not([role="tab"]):not([role="switch"]), .dsh-btn, a.w-button):active:not(:disabled):not([aria-disabled="true"]) {
    translate: 1px 1px !important;
    scale: 1 !important;
    box-shadow: 1px 1px 0px #1e2826 !important;
    transition-timing-function: steps(2, end);
    transition-duration: 50ms;
  }
}

/* 7. Small-Button SVG Icon Micro-Animations */
:where([data-dsh-style]) :where(button, [role="button"], summary, a.w-button) svg,
:where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) :where(button, [role="button"], summary, a.w-button) svg {
  translate: 0px 0px;
  rotate: 0deg;
  scale: 1;
  transform-origin: center;
}

@keyframes dsh-icon-spin { to { rotate: 360deg; } }
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
@keyframes dsh-icon-bounce-up {
  0%, 100% { translate: 0px 0px; }
  45% { translate: 0px -2.5px; }
  75% { translate: 0px 1px; }
}

@media (prefers-reduced-motion: no-preference) {
  :where([data-dsh-style]) :where(button, [role="button"], summary, a.w-button) svg,
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) :where(button, [role="button"], summary, a.w-button) svg {
    transition:
      translate var(--dsh-motion-base) var(--dsh-ease-spring),
      rotate 240ms var(--dsh-ease-spring),
      scale var(--dsh-motion-base) var(--dsh-ease-spring);
  }

  :where([data-dsh-style]) :where([aria-expanded="true"], [data-open="true"], details[open] > summary) :is(svg[data-dsh-icon="down"], svg[data-dsh-icon="chevron-down"]),
  :where([role="dialog"], [role="alertdialog"], dialog):has([data-dsh-style]) :where([aria-expanded="true"], [data-open="true"]) :is(svg[data-dsh-icon="down"], svg[data-dsh-icon="chevron-down"]) {
    rotate: 180deg;
  }

  :where([data-dsh-style]) :where(button, [role="button"])[aria-busy="true"] :is(svg[data-dsh-icon="refresh"], svg[data-dsh-icon="sync"]),
  :where([data-dsh-style]) svg[data-dsh-icon="refresh"][data-spinning="true"] {
    animation: dsh-icon-spin 0.85s linear infinite;
  }

  @media (hover: hover) {
    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="refresh"], svg[data-dsh-icon="sync"], svg[data-dsh-icon="reload"]) {
      rotate: 180deg;
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="plus"], svg[data-dsh-icon="add"], svg[data-dsh-icon="close"], svg[data-dsh-icon="x"]) {
      rotate: 90deg;
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"], a):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="send"], svg[data-dsh-icon="external"], svg[data-dsh-icon="link"]) {
      translate: 2px -1.5px;
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="reply"], svg[data-dsh-icon="left"], svg[data-dsh-icon="undo"]) {
      translate: -2px 0px;
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) svg[data-dsh-icon="right"] {
      translate: 2px 0px;
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) svg[data-dsh-icon="up"] {
      translate: 0px -1.5px;
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) svg[data-dsh-icon="play"] {
      translate: 1.5px 0px;
      scale: 1.14;
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="trash"], svg[data-dsh-icon="delete"]) {
      animation: dsh-icon-wiggle 360ms var(--dsh-ease-in-out);
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="star"], svg[data-dsh-icon="check"], svg[data-dsh-icon="copy"]) {
      scale: 1.18;
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"], a.w-button):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="download"], svg[data-dsh-icon="export"]) {
      animation: dsh-icon-bounce 420ms var(--dsh-ease-out);
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) svg[data-dsh-icon="upload"] {
      animation: dsh-icon-bounce-up 420ms var(--dsh-ease-out);
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"]):hover:not(:disabled):not([aria-disabled="true"]) :is(svg[data-dsh-icon="palette"], svg[data-dsh-icon="sparkles"], svg[data-dsh-icon="edit"]) {
      rotate: -12deg;
      scale: 1.08;
    }

    :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"])[aria-expanded="false"]:hover:not(:disabled):not([aria-disabled="true"]) svg[data-dsh-icon="down"] {
      translate: 0px 1.5px;
    }
  }

  :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where([aria-pressed="true"], [aria-checked="true"], [data-active="true"], [data-copied="true"]) :is(svg[data-dsh-icon="star"], svg[data-dsh-icon="check"], svg[data-dsh-icon="copy"]) {
    animation: dsh-icon-pop 300ms var(--dsh-ease-spring);
  }
}

/* 8. Tabs, Cards, Rows & Top-Layer Dialog/Inspector Entrance */
:where([data-dsh-style]) [role="tablist"] { scrollbar-width: thin; }
:where([data-dsh-style]) [role="tab"] { position: relative; }
:where([data-dsh-style]) [role="tab"][aria-selected="true"]::after {
  content: "";
  position: absolute;
  inset-inline: 6px;
  inset-block-end: 0;
  border-block-end: 2px solid var(--dsw-alias-state-business-primary, var(--w-accent));
  pointer-events: none;
}

:where([data-dsh-style]) :where([data-dsh-card], .dsh-card, [data-dsh-row], .dsh-row) {
  translate: 0px 0px;
  transition:
    background-color var(--dsh-motion-fast) var(--dsh-ease-out),
    border-color var(--dsh-motion-fast) var(--dsh-ease-out),
    box-shadow var(--dsh-motion-base) var(--dsh-ease-out),
    translate var(--dsh-motion-base) var(--dsh-ease-out);
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  :where([data-dsh-style]:not([data-dsh-style="pixel8bit"])) :where([data-dsh-card], .dsh-card):hover {
    translate: 0px -1.5px;
    box-shadow: var(--dsh-card-hover-shadow);
  }
  [data-dsh-style="pixel8bit"] :where([data-dsh-card], .dsh-card):hover {
    translate: -1px -1px;
    box-shadow: 4px 4px 0px #1e2826;
  }
  :where([data-dsh-style]) :where([data-dsh-row], .dsh-row):hover:not([data-selected="true"]):not([aria-selected="true"]) {
    background-color: var(--dsh-surface-spotlight, var(--dsw-alias-interactive-bg-hover));
  }
}

:where([role="dialog"], [role="alertdialog"], dialog[open]):where([data-dsh-style], :has([data-dsh-style])) {
  overscroll-behavior: contain;
  opacity: 1;
  transition-property: opacity, scale, translate, display, overlay;
  transition-duration: var(--dsh-motion-dialog);
  transition-timing-function: var(--dsh-ease-out);
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
  .dshw .w-tab-panel,
  .dshw .ppt-inspector-panel:not([hidden]) {
    opacity: 1;
    translate: 0px 0px;
    transition: opacity 160ms var(--dsh-ease-out), translate 180ms var(--dsh-ease-out);
  }
  @starting-style {
    .dshw .w-tab-panel,
    .dshw .ppt-inspector-panel:not([hidden]) {
      opacity: 0;
      translate: 0px 4px;
    }
  }
}

/* 9. Header Style Switcher & Fallback Overlay Chrome */
.dsh-style-switcher { display: inline-flex; align-items: center; flex: none; }
.dsh-style-trigger.dsh-style-trigger {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 32px; padding-inline: 10px; width: auto;
  font-size: 12.5px; line-height: 18px; font-weight: 500;
  color: var(--dsw-alias-label-secondary, #64748b);
  background: var(--dsw-alias-bg-layer-1, #f8fafc);
  border: var(--dsh-control-border-width, 0.5px) solid var(--dsw-alias-border-l2, #e2e8f0);
  border-radius: var(--dsw-radius-sm, 8px);
  cursor: pointer; white-space: nowrap;
}
@media (hover: hover) {
  .dsh-style-trigger.dsh-style-trigger:hover:not(:disabled) {
    color: var(--dsw-alias-label-primary, #1e293b);
    background: var(--dsw-alias-interactive-bg-hover, rgba(15, 23, 42, 0.04));
  }
}
.dsh-style-swatch {
  display: inline-block; flex: none; width: 10px; height: 10px;
  border-radius: 50%; corner-shape: round;
  background: var(--dsh-swatch-color, var(--dsw-alias-state-business-primary, #4176e6));
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.16);
}
[data-dsh-style="pixel8bit"] .dsh-style-swatch {
  border-radius: 0px !important; corner-shape: square; box-shadow: 1px 1px 0px #1e2826;
}
.dsh-style-fallback-wrap { position: relative; display: inline-flex; }
.dsh-style-fallback-menu {
  position: absolute; inset-block-start: calc(100% + 4px); inset-inline-end: 0;
  z-index: 2147483001; display: grid; gap: 2px; min-width: 176px; padding: 4px;
  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-base, #ffffff));
  border: var(--dsh-control-border-width, 0.5px) solid var(--dsw-alias-border-l2, #e2e8f0);
  border-radius: var(--dsw-radius-md, 12px);
  box-shadow: var(--dsw-elevation-prominent, 0 12px 32px rgba(15, 23, 42, 0.12));
}
.dsh-style-fallback-item {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; min-height: 28px; padding: 4px 8px; border: 0;
  border-radius: var(--dsw-radius-xs, 6px); background: transparent;
  color: var(--dsw-alias-label-primary, #1e293b); font: inherit; font-size: 12px;
  text-align: start; cursor: pointer;
}
.dsh-style-fallback-item[aria-checked="true"] {
  background: var(--dsw-alias-interactive-bg-active, rgba(65, 118, 230, 0.12)); font-weight: 600;
}
@media (hover: hover) {
  .dsh-style-fallback-item:hover:not(:disabled) {
    background: var(--dsw-alias-interactive-bg-hover, rgba(15, 23, 42, 0.04));
  }
}
.dsh-fallback-modal-root {
  position: fixed; inset: 0; z-index: 2147483000;
  display: grid; place-items: center; padding: 16px;
}
.dsh-fallback-modal-mask { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.36); }
.dsh-fallback-modal-dialog {
  position: relative; z-index: 1;
  width: min(620px, calc(100dvw - 32px)); max-height: calc(100dvh - 32px);
  overflow: clip; display: flex; flex-direction: column;
  border-radius: var(--dsw-radius-md, 12px);
  background: var(--dsw-alias-bg-layer-1, #f8fafc);
  color: var(--dsw-alias-label-primary, #1e293b);
  box-shadow: var(--dsw-elevation-prominent, 0 16px 40px rgba(15, 23, 42, 0.18));
}

/* 10. Workbench UI v2 Core Studio Layout & Components */
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
  font: 13.5px/1.6 var(--dsw-font-family, var(--dsh-font-family-content, system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif));
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  text-align: start;
}
.dshw *, .dshw *:before, .dshw *:after { box-sizing: border-box; }
.dshw h1, .dshw h2, .dshw h3, .dshw h4, .dshw p { margin: 0; }
.dshw h1 { font-size: 20px; line-height: 1.3; letter-spacing: -0.015em; font-weight: 650; }
.dshw h2 { font-size: 18px; line-height: 1.35; font-weight: 650; letter-spacing: -0.01em; overflow-wrap: anywhere; }
.dshw h3, .dshw h4 { font-size: 15px; line-height: 1.4; font-weight: 600; }
.dshw a { color: var(--dsw-alias-link, var(--w-accent)); text-underline-offset: 3px; overflow-wrap: anywhere; }
.dshw button, .dshw input, .dshw select, .dshw textarea { font: inherit; color: inherit; max-width: 100%; }
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
  padding-block-start: calc(16px + var(--dsh-frame-top-clearance, 0px));
  padding-inline-end: 24px;
  padding-block-end: 0;
  padding-inline-start: max(24px, calc(12px + var(--dsh-frame-leading-clearance, 0px)));
  overflow: auto;
}
.w-page.w-embedded, .w-page[data-main="false"] { padding: 0; }
.dshw.w-page, .dshw .w-body, .dshw .w-tab-panel { overflow-x: clip; }

.w-page-header {
  display: flex; justify-content: space-between; gap: 16px;
  align-items: center; padding-block-end: 14px;
  border-block-end: var(--dsh-control-border-width, 0.5px) solid var(--w-border);
  flex-shrink: 0;
}
.w-heading { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.w-title { display: flex; align-items: center; gap: 9px; }
.w-brand, .w-empty-icon {
  display: grid; place-items: center; flex: none;
  color: var(--w-accent);
  background: var(--dsw-alias-interactive-bg-hover-accent, color-mix(in oklab, var(--w-accent) 12%, transparent));
  border-radius: var(--dsw-radius-sm, 8px);
}
.w-brand { width: 28px; height: 28px; }
.w-subtitle { font-size: 12.5px; color: var(--w-muted); line-height: 1.5; }
.w-header-actions, .w-toolbar, .w-actions {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0;
}
.w-header-actions { justify-content: flex-end; margin-inline-start: auto; }
.w-body, .w-tabs-layout {
  display: flex; flex-direction: column; flex: 1; min-height: 0; min-width: 0;
}
.w-body { overflow: auto; }
.w-body > [data-plugin-update-footer] {
  box-sizing: border-box; width: min(100%, 1040px);
  margin: 16px auto 0; padding: 12px 16px 20px;
  border-block-start: var(--dsh-control-border-width, 0.5px) solid var(--w-border);
  flex: none;
}
.w-tab-panel {
  flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: auto;
}
.w-tabs {
  display: flex; align-items: stretch; gap: 6px;
  border-block-end: var(--dsh-control-border-width, 0.5px) solid var(--w-border);
  flex-shrink: 0; overflow-x: auto; scrollbar-width: thin; padding-block-start: 4px;
}
.dshw .w-tabs > button,
.dshw[data-dsh-style] .w-tabs > button {
  border: 0 !important; background: transparent;
  padding: 9px 10px 11px; white-space: nowrap;
  font-size: 13.5px; font-weight: 550; cursor: pointer;
  color: var(--w-muted); display: inline-flex; align-items: center; gap: 6px;
  border-radius: var(--dsw-radius-xs, 6px) var(--dsw-radius-xs, 6px) 0 0;
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
  font-size: 11.5px; line-height: 1.45; display: inline-flex; align-items: center;
  flex-shrink: 0; background: var(--w-soft); border-radius: var(--dsw-radius-xs, 6px);
  padding: 1px 7px; color: var(--w-muted);
}
.w-tabs [aria-selected="true"] .w-count, .w-selected .w-tag {
  color: var(--w-accent); background: var(--w-selected);
}

.dshw .w-button {
  display: inline-flex; justify-content: center; align-items: center; gap: 6px;
  background: var(--dsw-alias-bg-base, var(--w-canvas));
  border: var(--dsh-control-border-width, 1px) solid var(--w-border);
  border-radius: var(--dsw-radius-sm, 8px);
  padding: 6px 11px; min-height: 32px; height: auto;
  line-height: 1.4; font-size: 13px; font-weight: 500;
  cursor: pointer; text-decoration: none; white-space: normal;
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
  width: 32px; min-width: 32px; padding-inline: 0; flex: none;
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
.w-section { padding: 20px 0; border-block-end: var(--dsh-control-border-width, 0.5px) solid var(--w-border); min-width: 0; }
.w-section > h3 { margin-block-end: 10px; }
.w-section > p + p { margin-block-start: 8px; }
.w-fields { display: grid; gap: 14px; min-width: 0; }
.w-field { display: grid; gap: 6px; min-width: 0; }
.w-field > input, .w-field > select, .w-field > textarea { width: 100%; }

.w-status {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 9px 12px; margin: 10px 0;
  border: var(--dsh-control-border-width, 0.5px) solid var(--w-border);
  border-radius: var(--dsw-radius-sm, 8px);
  background: var(--w-bg); font-size: 12.5px; line-height: 1.55;
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
.w-master { min-width: 0; border-inline-end: var(--dsh-control-border-width, 0.5px) solid var(--w-border); overflow: auto; padding-block-end: 20px; }
.w-detail { min-width: 0; padding: 22px 24px; overflow: auto; overflow-wrap: anywhere; display: flex; flex-direction: column; }
.w-master-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 16px; }

.w-row {
  display: flex; gap: 0; min-width: 0; position: relative;
  border-block-end: var(--dsh-control-border-width, 0.5px) solid var(--w-border);
  border-inline-start: 3px solid transparent;
  border-radius: var(--dsw-radius-xs, 6px);
}
.w-row-select { display: flex; align-items: flex-start; padding: 18px 0 0 12px; }
.dshw .w-row-button {
  display: flex; flex-direction: column; align-items: stretch; gap: 5px;
  text-align: start; width: 100%; padding: 15px 16px;
  border: 0; background: transparent; color: inherit; min-width: 0;
  cursor: pointer; line-height: 1.5;
}
.w-row-head { display: flex; align-items: flex-start; gap: 10px; justify-content: space-between; min-width: 0; }
.w-row-head > strong { font-size: 14px; line-height: 1.45; font-weight: 600; overflow-wrap: anywhere; }
.w-row-meta, .w-row-description { color: var(--w-muted); font-size: 12px; line-height: 1.55; overflow-wrap: anywhere; }
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

@container dsh-workbench (max-width: 1000px) {
  .w-header-actions { max-width: 65%; }
  .w-split { grid-template-columns: minmax(240px, 34%) minmax(0, 1fr); }
}

@container dsh-workbench (max-width: 760px) {
  .w-page-header { gap: 10px; flex-wrap: wrap; padding-block-end: 12px; }
  .w-heading { flex: 1; min-width: 170px; }
  .w-header-actions { max-width: 100%; justify-content: flex-start; margin-inline-start: 0; }
  .w-split { display: block; min-height: 360px; }
  .w-split[data-selected="false"] > .w-detail { display: none; }
  .w-split[data-selected="true"] > .w-master { display: none; }
  .w-master { border-inline-end: 0; }
  .w-detail { padding: 18px 0; }
  .w-back { display: inline-flex !important; align-self: flex-start; margin: 0 0 14px !important; }
  .w-dialog-header, .w-dialog-body, .w-dialog-footer { padding: 14px; }
}

@media (max-width: 700px) {
  .w-page[data-main="true"] {
    padding: calc(12px + var(--dsh-frame-top-clearance, 0px)) 14px 0 max(14px, var(--dsh-frame-leading-clearance, 0px));
  }
  .w-dialog { width: 100%; }
}

/* 11. Accessibility: Reduced Motion & Forced Colors */
@media (prefers-reduced-motion: reduce) {
  :where([data-dsh-style]) :where(button, [role="button"], a.w-button, [data-dsh-card], .dsh-card, [data-dsh-row], .dsh-row),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):has([data-dsh-style]) :where(button, [role="button"], a.w-button) {
    translate: none !important;
    scale: none !important;
    transition-property: background-color, border-color, color, opacity;
    transition-duration: 90ms;
  }
  :where([data-dsh-style], [role="dialog"], [role="alertdialog"], dialog) :where(button, [role="button"], summary, a.w-button) svg {
    animation: none !important;
    transition: none !important;
    translate: none !important;
    scale: none !important;
    rotate: none !important;
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
  :where([data-dsh-style]) :where(button, input, select, textarea),
  :where([role="dialog"], [role="alertdialog"], [role="menu"], dialog):where([data-dsh-style], :has([data-dsh-style])) {
    border: 1px solid ButtonText;
  }
  :where([data-dsh-style]) [role="tab"][aria-selected="true"]::after {
    border-block-end: 3px solid Highlight;
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
    Page,
    Tabs,
    Status,
    Empty,
    Split,
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
    readDshStyle,
    writeDshStyle,
    subscribeDshStyle,
    useDshStyle,
    createOverlaySyncRef,
    resolveHostPrimitives,
  };
}

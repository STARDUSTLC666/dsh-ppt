import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const BUNDLE = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const WORKBENCH_UI = readFileSync(new URL('../templates/workbench-ui.js', import.meta.url), 'utf8')

function createMiniEnv({ withHostPrimitives = false, throwStorage = false } = {}) {
  const storage = new Map()
  const listeners = new Map()
  const dispatched = []
  const primitiveCalls = { Button: 0, Input: 0, Checkbox: 0, Menu: 0, Modal: 0, Switch: 0 }
  const portalOverlays = []

  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  }

  const document = {
    baseURI: 'http://127.0.0.1:8181/',
    fullscreenElement: null,
    activeElement: null,
    body: { append() {} },
    addEventListener() {},
    removeEventListener() {},
    createElement(tag) {
      return { tag, setAttribute() {}, click() {}, remove() {}, style: {} }
    },
    querySelectorAll(selector) {
      if (selector === '[data-dsh-portal-synced]') return portalOverlays
      return []
    },
  }

  const window = {
    CustomEvent,
    document,
    localStorage: {
      getItem(key) {
        if (throwStorage) throw new Error('storage blocked')
        return storage.has(key) ? storage.get(key) : null
      },
      setItem(key, value) {
        if (throwStorage) throw new Error('storage blocked')
        storage.set(key, String(value))
      },
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(fn)
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn)
    },
    dispatchEvent(event) {
      dispatched.push(event)
      for (const fn of listeners.get(event.type) || []) fn(event)
      return true
    },
    confirm: () => true,
    __ModuleLoader__: { load() {} },
  }

  const states = []
  let cursor = 0
  let idCounter = 0
  const effects = []

  const React = {
    Fragment: Symbol.for('react.fragment'),
    createElement(type, props, ...children) {
      const flat = children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false && child !== true)
      return { type, props: { ...(props || {}), children: flat.length <= 1 ? flat[0] : flat }, children: flat }
    },
    cloneElement(element, extraProps, ...children) {
      const flat = children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false && child !== true)
      return {
        type: element.type,
        props: { ...element.props, ...(extraProps || {}), children: flat.length ? (flat.length === 1 ? flat[0] : flat) : element.props.children },
        children: flat.length ? flat : element.children,
      }
    },
    forwardRef(render) {
      return function ForwardRef(props) { return render(props, props?.ref || null) }
    },
    useState(initial) {
      const idx = cursor++
      if (!(idx in states)) states[idx] = typeof initial === 'function' ? initial() : initial
      const set = next => { states[idx] = typeof next === 'function' ? next(states[idx]) : next }
      return [states[idx], set]
    },
    useRef(initial) {
      const idx = cursor++
      if (!(idx in states)) states[idx] = { current: initial }
      return states[idx]
    },
    useMemo(fn) {
      return fn()
    },
    useCallback(fn) {
      return fn
    },
    useId() {
      return 'id-' + (++idCounter)
    },
    useEffect(fn) {
      effects.push(fn)
    },
    useLayoutEffect(fn) {
      effects.push(fn)
    },
  }

  const hostPrimitives = {
    Button({ variant = 'ghost', size = 'md', icon, className, children, ...rest }) {
      primitiveCalls.Button++
      return React.createElement('button', { 'data-host-primitive': 'Button', 'data-host-variant': variant, 'data-host-size': size, className, ...rest }, icon, children)
    },
    Input({ icon, className, ...rest }) {
      primitiveCalls.Input++
      return React.createElement('span', { 'data-host-primitive': 'Input', className }, icon, React.createElement('input', rest))
    },
    Checkbox({ checked, onChange, label, disabled, className }) {
      primitiveCalls.Checkbox++
      return React.createElement('label', { 'data-host-primitive': 'Checkbox', className },
        React.createElement('input', { type: 'checkbox', checked, disabled, onChange: e => onChange?.(Boolean(e?.target?.checked)) }),
        React.createElement('span', null, label))
    },
    Switch({ checked, onChange, label, disabled, className }) {
      primitiveCalls.Switch++
      return React.createElement('button', { 'data-host-primitive': 'Switch', role: 'switch', 'aria-checked': checked, 'aria-label': label, disabled, className, onClick: () => onChange?.(!checked) })
    },
    Menu({ open, anchor, items = [], children, selectedId, onSelect, onClose, className }) {
      primitiveCalls.Menu++
      return React.createElement('div', { 'data-host-primitive': 'Menu', className },
        anchor,
        open ? React.createElement('div', { role: 'menu', 'data-selected-id': selectedId },
          items.map(item => React.createElement('button', { key: item.id, role: 'menuitemradio', 'aria-checked': item.id === selectedId, onClick: () => { onSelect?.(item.id); onClose?.() } }, item.label)),
          children) : null)
    },
    Modal({ open, children, title, onClose, className }) {
      primitiveCalls.Modal++
      if (!open) return null
      return React.createElement('div', { 'data-host-primitive': 'Modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, className, onClose }, children)
    },
  }

  function expand(node) {
    if (!node || typeof node !== 'object') return node
    if (Array.isArray(node)) return node.map(expand)
    if (typeof node.type === 'function') {
      return expand(node.type(node.props || {}))
    }
    const expandedChildren = (node.children || []).map(expand).flat(Infinity).filter(c => c !== null && c !== undefined && c !== false && c !== true)
    if (typeof node.props?.ref === 'function') {
      const attrs = new Map()
      const portalDialog = {
        attrs: new Map(),
        setAttribute(k, v) { this.attrs.set(k, String(v)) },
        hasAttribute(k) { return this.attrs.has(k) },
        getAttribute(k) { return this.attrs.get(k) ?? null },
      }
      portalOverlays.push(portalDialog)
      const domNode = {
        attrs,
        setAttribute(k, v) { attrs.set(k, String(v)) },
        hasAttribute(k) { return attrs.has(k) },
        closest(sel) { return sel.includes('dialog') ? portalDialog : null },
      }
      node.props.ref(domNode)
      node.syncedDom = { domNode, portalDialog }
    }
    return { ...node, children: expandedChildren }
  }

  function render(Component, props = {}) {
    cursor = 0
    idCounter = 0
    effects.length = 0
    const tree = expand(React.createElement(Component, props))
    return tree
  }

  function findAll(node, predicate, out = []) {
    if (!node || typeof node !== 'object') return out
    if (Array.isArray(node)) {
      for (const item of node) findAll(item, predicate, out)
      return out
    }
    if (predicate(node)) out.push(node)
    for (const child of node.children || []) findAll(child, predicate, out)
    return out
  }

  let loaded
  window.__ModuleLoader__.load = entry => { loaded = entry }
  runInNewContext(BUNDLE, {
    window,
    document,
    CustomEvent,
    Event: CustomEvent,
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true, projects: [] }) }),
    FileReader: class {},
    ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: fn => fn(),
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval() {},
    URL,
  })

  let primitivesRequested = 0
  const plugin = loaded.factory(name => {
    if (name === 'react') return React
    if (name === '@deepseek-ai/dsh-client-ui-primitives') {
      primitivesRequested++
      if (withHostPrimitives) return hostPrimitives
    }
    throw new Error('Module not mounted: ' + name)
  })

  return { window, document, storage, dispatched, primitiveCalls, primitivesRequested: () => primitivesRequested, portalOverlays, React, plugin, render, findAll, effects }
}

test('Workbench UI v2 integrates @deepseek-ai/dsh-client-ui-primitives lazily and falls back cleanly in standalone DOM', () => {
  const hostEnv = createMiniEnv({ withHostPrimitives: true })
  assert.equal(hostEnv.primitivesRequested(), 0, 'must not require ui-primitives eagerly during module load')

  const registrations = []
  hostEnv.plugin.apply({
    locale: { getSnapshot: () => ({ active: 'zh' }) },
    slots: {
      inject(_name, fn) { fn() },
      register(meta, component) { registrations.push({ meta, component }); return () => {} },
    },
  })
  assert.equal(hostEnv.primitivesRequested(), 0, 'must not require ui-primitives eagerly during slot registration')

  const main = registrations.find(row => row.meta.name === 'main')
  const tree = hostEnv.render(main.component, { workbench: true, locale: { getSnapshot: () => ({ active: 'zh' }) } })
  assert.ok(hostEnv.primitivesRequested() > 0, 'ui-primitives should resolve lazily on component render')
  assert.ok(hostEnv.primitiveCalls.Button > 0, 'host Button primitive should be used')
  assert.ok(hostEnv.primitiveCalls.Menu > 0, 'host Menu primitive should be used by header StyleSwitcher')

  const rootSection = hostEnv.findAll(tree, n => n.type === 'section' && n.props?.['data-dsh-style'])[0]
  assert.ok(rootSection, 'workbench root section carries data-dsh-style')
  assert.equal(rootSection.props['data-dsh-style'], 'harness')
  assert.equal(rootSection.props['data-main'], 'true')
  const allButtons = hostEnv.findAll(tree, n => n.type === 'button')
  assert.ok(allButtons.some(b => JSON.stringify(b).includes('导入 PPTX 翻新')), 'Import & Modernize .pptx button renders in workbench')

  // Verify standalone fallback mode when @deepseek-ai/dsh-client-ui-primitives is unavailable
  const fallbackEnv = createMiniEnv({ withHostPrimitives: false, throwStorage: true })
  const fallbackRegs = []
  fallbackEnv.plugin.apply({
    locale: { getSnapshot: () => ({ active: 'en' }) },
    slots: {
      inject(_name, fn) { fn() },
      register(meta, component) { fallbackRegs.push({ meta, component }); return () => {} },
    },
  })
  const fallbackTree = fallbackEnv.render(fallbackRegs.find(r => r.meta.name === 'main').component, {
    workbench: true,
    locale: { getSnapshot: () => ({ active: 'en' }) },
  })
  const fallbackRoot = fallbackEnv.findAll(fallbackTree, n => n.type === 'section' && n.props?.['data-dsh-style'])[0]
  assert.equal(fallbackRoot.props['data-dsh-style'], 'harness')
  const buttons = fallbackEnv.findAll(fallbackTree, n => n.type === 'button')
  assert.ok(buttons.length >= 3, 'semantic HTML <button> fallbacks render cleanly without host primitives')
  const icons = fallbackEnv.findAll(fallbackTree, n => n.type === 'svg' && n.props?.['data-dsh-icon'])
  assert.ok(icons.some(svg => svg.props['data-dsh-icon'] === 'refresh'))
  assert.ok(icons.some(svg => svg.props['data-dsh-icon'] === 'down'))
})

test('5-preset StyleSwitcher syncs localStorage, dsh-stardust-style events, and portaled Dialog overlays', () => {
  const env = createMiniEnv({ withHostPrimitives: false })
  const sandbox = {
    window: env.window,
    document: env.document,
    CustomEvent: env.window.CustomEvent,
    React: env.React,
    __W: null,
  }
  runInNewContext(WORKBENCH_UI + '\n__W = createWorkbenchUI(React);', sandbox)
  const W = sandbox.__W
  assert.ok(W.styles.includes(String.raw`.w-tour-layer[popover]:is(:popover-open, .\:popover-open)`), 'evaluated CSS contains .\\:popover-open polyfill selector')

  assert.deepEqual([...W.DSH_STYLES.map(s => s.id)], ['harness', 'cream', 'claude', 'pixel8bit', 'mint'])

  // Render Dialog + StyleSwitcher together and verify portal sync across all 5 styles
  function HarnessFixture() {
    return env.React.createElement('div', null,
      env.React.createElement(W.Page, { workbench: true, lang: 'zh', icon: 'slides', title: '演示文稿' }, 'content'),
      env.React.createElement(W.Dialog, { title: '下载成品', closeLabel: '关闭', onClose() {} }, 'dialog-body'))
  }

  let tree = env.render(HarnessFixture)
  const trigger = env.findAll(tree, n => n.type === 'button' && n.props?.className?.includes('dsh-style-trigger'))[0]
  assert.ok(trigger, 'StyleSwitcher trigger renders in Page header')
  assert.equal(trigger.props['aria-expanded'], false)

  // Open menu
  trigger.props.onClick()
  tree = env.render(HarnessFixture)
  const openTrigger = env.findAll(tree, n => n.type === 'button' && n.props?.className?.includes('dsh-style-trigger'))[0]
  assert.equal(openTrigger.props['aria-expanded'], true)
  const menuItems = env.findAll(tree, n => n.type === 'button' && n.props?.role === 'menuitemradio')
  assert.equal(menuItems.length, 5, 'all 5 style presets appear in menu')

  for (const styleId of ['cream', 'claude', 'pixel8bit', 'mint', 'harness']) {
    W.writeDshStyle(styleId, env.window)
    assert.equal(env.storage.get('dsh-stardust:ui-style'), styleId)
    assert.equal(env.dispatched.at(-1)?.type, 'dsh-stardust-style')
    assert.equal(env.dispatched.at(-1)?.detail?.style, styleId)
    for (const overlay of env.portalOverlays) {
      assert.equal(overlay.getAttribute('data-dsh-style'), styleId, 'portaled dialog receives synced data-dsh-style')
      assert.equal(overlay.getAttribute('data-window-drag-exclude'), '', 'portaled dialog receives data-window-drag-exclude')
    }
  }
})

test('themes, soft-slate dark mode, 8-bit physics, clearances, drag exclusions and update footer are preserved', () => {
  // 1. Never too dark: soft breathable slate in host dark mode, no pitch-black chrome
  assert.match(BUNDLE, /body\[data-ds-dark-theme\] \[data-dsh-style="harness"\]/)
  assert.ok(BUNDLE.includes('#1f232b') && BUNDLE.includes('#272c36'), 'soft breathable slate tokens present')
  assert.doesNotMatch(BUNDLE, /background:#000\b|background:#090a0f|background:#0b0d13|background:#14171c/)

  // 2. All 5 switchable [data-dsh-style] presets + 8-bit stepped press physics
  for (const preset of ['[data-dsh-style="harness"]', '[data-dsh-style="cream"]', '[data-dsh-style="claude"]', '[data-dsh-style="pixel8bit"]', '[data-dsh-style="mint"]']) {
    assert.ok(BUNDLE.includes(preset), 'missing theme selector ' + preset)
  }
  assert.match(BUNDLE, /translate:\s*1px 1px\s*!important/, '8-bit stepped press physics present')
  assert.match(BUNDLE, /box-shadow:\s*2px 2px 0px #1e2826/, '8-bit crisp pixel shadow present')

  // 3. Small-button SVG micro-animations + prefers-reduced-motion
  for (const iconAnim of ['data-dsh-icon="play"', 'data-dsh-icon="refresh"', 'data-dsh-icon="plus"', 'data-dsh-icon="close"', 'data-dsh-icon="download"', 'data-dsh-icon="trash"', 'data-dsh-icon="down"']) {
    assert.ok(BUNDLE.includes(iconAnim), 'missing icon micro-animation rule ' + iconAnim)
  }
  assert.match(BUNDLE, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)

  // 4. DSH >=0.2.2-rc.3 host clearances, drag exclusions & @stardustlc/dsh-updates footer wrapper
  assert.ok(BUNDLE.includes('--dsh-frame-top-clearance'), 'top clearance token present')
  assert.ok(BUNDLE.includes('--dsh-frame-leading-clearance'), 'leading clearance token present')
  assert.ok(BUNDLE.includes('data-window-drag-exclude'), 'window drag exclusion present')
  assert.ok(BUNDLE.includes('data-plugin-update-footer'), 'plugin update footer selector/hook preserved')
  assert.ok(BUNDLE.includes('__stardustUpdatesInlinePage'), 'build-updates.mjs wrapped W.Page successfully')
})

test('HostMenuWithStyle and HostModalWithStyle sync portaled host Menu and Modal overlays, and apply() cleans up via ctx.effect', async () => {
  const hostEnv = createMiniEnv({ withHostPrimitives: true })
  const sandbox = {
    window: hostEnv.window,
    document: hostEnv.document,
    CustomEvent: hostEnv.window.CustomEvent,
    React: hostEnv.React,
    __W: null,
    requireFn: name => {
      if (name === '@deepseek-ai/dsh-client-ui-primitives') {
        return {
          Button: ({ children, icon, ...rest }) => hostEnv.React.createElement('button', rest, icon, children),
          Menu: ({ open, anchor, items = [], children }) => hostEnv.React.createElement('div', null, anchor, open ? hostEnv.React.createElement('div', { role: 'menu' }, items.map(i => hostEnv.React.createElement('button', { key: i.id }, i.label)), children) : null),
          Modal: ({ open, children }) => open ? hostEnv.React.createElement('div', { role: 'dialog' }, children) : null,
        }
      }
      throw new Error('unexpected')
    },
  }
  runInNewContext(WORKBENCH_UI + '\n__W = createWorkbenchUI(React, requireFn);', sandbox)
  const W = sandbox.__W

  function PortalFixture() {
    return hostEnv.React.createElement('div', null,
      hostEnv.React.createElement(W.StyleSwitcher, { lang: 'zh' }),
      hostEnv.React.createElement(W.Dialog, { title: '测试弹窗', closeLabel: '关闭', onClose() {} }, 'body'))
  }

  let tree = hostEnv.render(PortalFixture)
  const trigger = hostEnv.findAll(tree, n => n.type === 'button' && n.props?.className?.includes('dsh-style-trigger'))[0]
  trigger.props.onClick()
  hostEnv.portalOverlays.length = 0
  tree = hostEnv.render(PortalFixture)
  assert.ok(hostEnv.portalOverlays.length >= 2, 'both host Menu and host Modal receive __dsh_portal_sync__ callback refs')
  W.writeDshStyle('pixel8bit', hostEnv.window)
  for (const overlay of hostEnv.portalOverlays) {
    assert.equal(overlay.getAttribute('data-dsh-style'), 'pixel8bit')
    assert.equal(overlay.getAttribute('data-window-drag-exclude'), '')
  }

  // Verify Cordis 4.1.0 ctx.effect unload cleanup when ctx.on is absent
  const { apply } = await import('../lib/index.js')
  const activeTools = []
  const activeSkills = []
  const effectCleanups = []
  apply({
    tools: { register(t) { activeTools.push(t); return () => activeTools.splice(activeTools.indexOf(t), 1) } },
    skills: { register(s) { activeSkills.push(s); return () => activeSkills.splice(activeSkills.indexOf(s), 1) } },
    effect(fn) { const cleanup = fn(); if (typeof cleanup === 'function') effectCleanups.push(cleanup) },
  })
  assert.ok(activeTools.length > 0 && activeSkills.length > 0)
  for (const fn of effectCleanups) fn()
  assert.equal(activeTools.length, 0, 'all tools unregistered via ctx.effect cleanup')
  assert.equal(activeSkills.length, 0, 'all skills unregistered via ctx.effect cleanup')
})

test('CoachmarkTour trigger, spotlight popover, directional arrow, 4-step progression, prompt copy, and localStorage persistence work cleanly', async () => {
  assert.ok(BUNDLE.includes(String.raw`.w-tour-layer[popover]:is(:popover-open, .\\:popover-open)`), 'popover-open + polyfill class selector present')
  assert.ok(BUNDLE.includes('.w-tour-spotlight') && BUNDLE.includes('rgba(15, 23, 42, 0.26)'), 'spotlight cutout mask present')
  assert.ok(BUNDLE.includes('.w-tour-card[data-side="bottom"] > .w-tour-arrow'), 'directional arrow positioning CSS present')
  assert.ok(BUNDLE.includes('.w-tour-layer[data-dsh-style="pixel8bit"] .w-tour-card') && BUNDLE.includes('4px 4px 0px #1e2826'), '8-bit tour card adaptation present')

  const env = createMiniEnv({ withHostPrimitives: false })
  const registrations = []
  env.plugin.apply({
    locale: { getSnapshot: () => ({ active: 'zh' }) },
    slots: {
      inject(_name, fn) { fn() },
      register(meta, component) { registrations.push({ meta, component }); return () => {} },
    },
  })
  const main = registrations.find(row => row.meta.name === 'main')
  let tree = env.render(main.component, { workbench: true, locale: { getSnapshot: () => ({ active: 'zh' }) } })

  // Static workflow guide clutter is removed from workbench canvas
  assert.equal(env.findAll(tree, n => n.props?.className === 'ppt-workflow-guide').length, 0, 'static PptWorkflowGuide box is not rendered')

  // Header actions include `? 引导` trigger without aria-haspopup
  const headerActions = env.findAll(tree, n => n.props?.className === 'w-header-actions')[0]
  assert.ok(headerActions, 'header actions container exists')
  const trigger = env.findAll(headerActions, n => Object.hasOwn(n.props || {}, 'data-wb-tour-trigger'))[0]
  assert.ok(trigger, 'tour trigger renders inside .w-header-actions')
  assert.equal(trigger.props['aria-expanded'], false)
  assert.equal(trigger.props['aria-haspopup'], undefined, 'tour trigger must not declare aria-haspopup')
  assert.ok(JSON.stringify(trigger.children).includes('? 引导'))

  // Open tour manually via trigger
  trigger.props.onClick()
  tree = env.render(main.component, { workbench: true, locale: { getSnapshot: () => ({ active: 'zh' }) } })
  const openTrigger = env.findAll(tree, n => Object.hasOwn(n.props || {}, 'data-wb-tour-trigger'))[0]
  assert.equal(openTrigger.props['aria-expanded'], true)

  const layer = env.findAll(tree, n => n.props?.className?.includes('w-tour-layer'))[0]
  assert.ok(layer, 'CoachmarkTour layer renders when open')
  assert.equal(layer.props['data-dsh-style'], 'harness')
  assert.equal(layer.props['data-window-drag-exclude'], '')

  let card = env.findAll(layer, n => n.props?.role === 'dialog' && n.props?.['data-tour-card'])[0]
  assert.ok(card, 'coachmark card exposes role="dialog"')
  assert.equal(card.props['aria-modal'], 'false')
  const titleEl = env.findAll(card, n => n.type === 'h2')[0]
  assert.equal(card.props['aria-labelledby'], titleEl.props.id)
  const arrow = env.findAll(card, n => n.props?.['data-tour-arrow'])[0]
  assert.ok(arrow, 'coachmark card renders directional [data-tour-arrow]')
  assert.equal(env.findAll(card, n => n.props?.className === 'w-tour-step-badge')[0].children[0], '1 / 4')
  assert.equal(env.findAll(card, n => n.props?.className === 'w-tour-dot').length, 4)

  // Step 1 inline 1-click prompt copy
  const expectedPrompt = '请根据当前工作区材料制作一份结构清晰的演示文稿，输出 HTML、可编辑 PPTX 与工程包。'
  const copyBtn = env.findAll(card, n => n.props?.['data-copy-prompt'] === expectedPrompt)[0]
  assert.ok(copyBtn, 'Step 1 renders inline 1-click prompt copy button')
  await copyBtn.props.onClick()
  for (let i = 0; i < 4; i++) await Promise.resolve()
  tree = env.render(main.component, { workbench: true, locale: { getSnapshot: () => ({ active: 'zh' }) } })
  card = env.findAll(tree, n => n.props?.['data-tour-card'])[0]
  const copiedBtn = env.findAll(card, n => n.props?.['data-copy-prompt'] === expectedPrompt)[0]
  assert.equal(copiedBtn.props['data-copied'], 'true')

  // Step progression 1 -> 2 -> 3 -> 4 -> Done
  for (const expectedStep of ['2 / 4', '3 / 4', '4 / 4']) {
    const nextBtn = env.findAll(card, n => Object.hasOwn(n.props || {}, 'data-tour-next'))[0]
    nextBtn.props.onClick()
    tree = env.render(main.component, { workbench: true, locale: { getSnapshot: () => ({ active: 'zh' }) } })
    card = env.findAll(tree, n => n.props?.['data-tour-card'])[0]
    assert.equal(env.findAll(card, n => n.props?.className === 'w-tour-step-badge')[0].children[0], expectedStep)
  }
  assert.ok(env.findAll(card, n => Object.hasOwn(n.props || {}, 'data-tour-prev'))[0], 'Back button renders on later steps')
  const finishBtn = env.findAll(card, n => Object.hasOwn(n.props || {}, 'data-tour-next'))[0]
  assert.ok(JSON.stringify(finishBtn.children).includes('完成引导'))
  finishBtn.props.onClick()

  tree = env.render(main.component, { workbench: true, locale: { getSnapshot: () => ({ active: 'zh' }) } })
  assert.equal(env.findAll(tree, n => n.props?.className?.includes('w-tour-layer')).length, 0, 'tour closes on Done')
  assert.equal(env.storage.get('dsh-ppt.tour.v1'), 'done', 'localStorage persists done state')

  // Standalone W.CoachmarkTour + W.computeTourLayout + popover promotion + modal auto-close
  const standaloneEnv = createMiniEnv({ withHostPrimitives: false })
  const sandbox = {
    window: { ...standaloneEnv.window, innerWidth: 1280, innerHeight: 800 },
    document: standaloneEnv.document,
    CustomEvent: standaloneEnv.window.CustomEvent,
    React: standaloneEnv.React,
    setTimeout,
    clearTimeout,
    __W: null,
  }
  runInNewContext(WORKBENCH_UI + '\n__W = createWorkbenchUI(React);', sandbox)
  const W = sandbox.__W
  assert.ok(W.styles.includes(String.raw`.w-tour-layer[popover]:is(:popover-open, .\:popover-open)`), 'evaluated CSS contains .\\:popover-open polyfill selector')

  const flipped = W.computeTourLayout({ getBoundingClientRect: () => ({ left: 200, top: 740, width: 120, height: 32 }) }, 'bottom', { offsetWidth: 320, offsetHeight: 200 })
  assert.equal(flipped.side, 'top', 'flips from bottom to top near viewport bottom edge')
  assert.ok(flipped.spotlight.width > 120 && flipped.arrowX >= 18)
  assert.equal(W.computeTourLayout(null, 'bottom', null).side, 'center')

  let popoverAttr = null
  let showedPopover = false
  let focusedNext = false
  let copiedStandalone = ''
  const standaloneTree = standaloneEnv.render(W.CoachmarkTour, {
    steps: [{ id: 's1', selector: '#t1', side: 'bottom', title: 'Step 1', desc: 'Desc', prompt: 'Prompt X' }],
    step: 0,
    manual: true,
    style: 'pixel8bit',
    lang: 'en',
    onCopyPrompt: async text => { copiedStandalone = text; return true },
  })
  assert.equal(standaloneTree.props['data-dsh-style'], 'pixel8bit')
  standaloneTree.props.ref.current = {
    setAttribute(k, v) { popoverAttr = [k, v] },
    showPopover() { showedPopover = true },
    hidePopover() {},
  }
  const standaloneNext = standaloneEnv.findAll(standaloneTree, n => Object.hasOwn(n.props || {}, 'data-tour-next'))[0]
  standaloneNext.props.ref.current = { focus() { focusedNext = true } }
  for (const eff of [...standaloneEnv.effects]) eff()
  assert.deepEqual(popoverAttr, ['popover', 'manual'], 'promotes layer via setAttribute("popover", "manual")')
  assert.equal(showedPopover, true)
  assert.equal(focusedNext, true, 'focuses Next button when opened manually')
  const standaloneCopy = standaloneEnv.findAll(standaloneTree, n => n.props?.['data-copy-prompt'] === 'Prompt X')[0]
  await standaloneCopy.props.onClick()
  assert.equal(copiedStandalone, 'Prompt X')

  // Verify manual: false does NOT steal focus, and auto-tour closes when a modal dialog opens
  const autoEnv = createMiniEnv({ withHostPrimitives: false })
  const autoSandbox = {
    window: autoEnv.window,
    document: autoEnv.document,
    CustomEvent: autoEnv.window.CustomEvent,
    React: autoEnv.React,
    setTimeout,
    clearTimeout,
    __W: null,
  }
  runInNewContext(WORKBENCH_UI + '\n__W = createWorkbenchUI(React);', autoSandbox)
  let autoFocused = false
  const autoTree = autoEnv.render(autoSandbox.__W.CoachmarkTour, {
    steps: [{ id: 's1', selector: '#t1', side: 'bottom', title: 'Auto', desc: 'Desc' }],
    step: 0,
    manual: false,
  })
  autoEnv.findAll(autoTree, n => Object.hasOwn(n.props || {}, 'data-tour-next'))[0].props.ref.current = { focus() { autoFocused = true } }
  for (const eff of [...autoEnv.effects]) eff()
  assert.equal(autoFocused, false, 'auto-opened tour must not steal focus')

  const modalEnv = createMiniEnv({ withHostPrimitives: false })
  let modalPresent = false
  modalEnv.document.querySelectorAll = selector => {
    if (selector === '[role="dialog"]:not([data-tour-card])') return modalPresent ? [{ contains: () => false }] : []
    return []
  }
  const modalSandbox = {
    window: modalEnv.window,
    document: modalEnv.document,
    CustomEvent: modalEnv.window.CustomEvent,
    React: modalEnv.React,
    setTimeout: fn => { fn(); return 0 },
    clearTimeout() {},
    __W: null,
  }
  runInNewContext(WORKBENCH_UI + '\n__W = createWorkbenchUI(React);', modalSandbox)
  const ModalW = modalSandbox.__W
  const AutoPage = () => modalEnv.React.createElement(ModalW.Page, {
    workbench: true,
    title: 'Auto Page',
    tourStorageKey: 'dsh-ppt.auto.test',
    tourSteps: [{ id: 's1', selector: '#x', title: 'T', desc: 'D' }],
  }, 'body')
  modalEnv.render(AutoPage)
  for (const eff of [...modalEnv.effects]) eff()
  let autoOpenTree = modalEnv.render(AutoPage)
  assert.equal(modalEnv.findAll(autoOpenTree, n => n.props?.className?.includes('w-tour-layer')).length, 1, 'auto-tour opens on first workbench visit')
  modalPresent = true
  for (const eff of [...modalEnv.effects]) eff()
  autoOpenTree = modalEnv.render(AutoPage)
  assert.equal(modalEnv.findAll(autoOpenTree, n => n.props?.className?.includes('w-tour-layer')).length, 0, 'auto-tour closes when a modal dialog is open')
})

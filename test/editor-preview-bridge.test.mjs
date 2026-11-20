import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { Script, runInNewContext } from 'node:vm'
import { renderHtml, resolveLanguage, resolveTheme } from '../skills/dsh-ppt/scripts/deck-core.mjs'

function editorDocument(html) {
  let plugin
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load(entry) { plugin = entry.factory(() => ({ createElement() {} })) } } },
  })
  return plugin.__internals.editorHtml(html, 'preview-nonce')
}

const scriptsOf = html => [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(match => match[1])

test('a generated editor preview contains executable deck and inline-edit bridge scripts', () => {
  const deck = renderHtml({ title: '真实预览脚本', slides: [{ layout: 'cover', title: '收入增长 28%', subtitle: '第一行\r\n第二行' }] }, resolveTheme('data'), resolveLanguage('zh'))
  const scripts = scriptsOf(editorDocument(deck))
  assert.ok(scripts.length >= 2, 'The preview must retain the deck script and append its editing bridge')
  for (const [index, script] of scripts.entries()) {
    assert.doesNotThrow(() => new Script(script, { filename: `preview-script-${index + 1}.js` }), `Generated preview script ${index + 1} must parse`)
  }
})

test('the injected bridge saves multiline inline edits on Enter and discards unchanged or cancelled edits', () => {
  const bridge = scriptsOf(editorDocument('<html><head></head><body></body></html>')).at(-1)
  for (const scenario of ['changed', 'unchanged', 'cancelled']) {
    const handlers = new Map(), messages = [], nodeHandlers = new Map()
    const node = {
      innerText: '原始\r\n标题', dataset: {}, contentEditable: 'false',
      get isContentEditable() { return this.contentEditable === 'true' },
      matches() { return false },
      closest(selector) { return selector.startsWith('#data-panel') ? null : this },
      focus() {},
      addEventListener(name, fn) { nodeHandlers.set(name, fn) },
      removeEventListener(name, fn) { if (nodeHandlers.get(name) === fn) nodeHandlers.delete(name) },
      blur() { nodeHandlers.get('blur')?.() },
    }
    runInNewContext(bridge, {
      setTimeout, clearTimeout,
      parent: { postMessage(message) { messages.push(message) } },
      document: { addEventListener(name, fn) { handlers.set(name, fn) }, createRange: () => ({ selectNodeContents() {} }) },
      window: { addEventListener() {}, getSelection: () => ({ removeAllRanges() {}, addRange() {} }) },
    })
    const event = { target: node, preventDefault() {}, stopImmediatePropagation() {} }
    handlers.get('dblclick')(event)
    assert.equal(node.isContentEditable, true)
    node.innerText = scenario === 'unchanged' ? '原始\n标题' : '  收入\r\n提升\n28%  '
    handlers.get('keydown')({ ...event, key: scenario === 'cancelled' ? 'Escape' : 'Enter' })
    assert.equal(node.isContentEditable, false)
    assert.equal(node.dataset.dshEditing, undefined)
    assert.equal(nodeHandlers.has('blur'), false)
    const edits = messages.filter(message => message.type === 'dsh-ppt-inline-edit')
    assert.equal(edits.length, scenario === 'changed' ? 1 : 0, scenario)
    if (scenario === 'changed') {
      assert.equal(edits[0].nonce, 'preview-nonce')
      assert.equal(edits[0].field, 'title')
      assert.equal(edits[0].value, '收入 提升 28%')
    }
    if (scenario === 'cancelled') assert.equal(node.innerText, '原始\r\n标题')
  }
})

test('a text double-click cancels the pending inspector focus and keeps inline editing active', () => {
  const bridge = scriptsOf(editorDocument('<html><head></head><body></body></html>')).at(-1)
  const handlers = new Map(), timers = new Map(), messages = []
  let sequence = 0
  const node = {
    innerText: '双击编辑', dataset: {}, contentEditable: 'false',
    get isContentEditable() { return this.contentEditable === 'true' },
    matches(selector) { return selector.startsWith('h1,') },
    closest(selector) { return selector.startsWith('#data-panel') ? null : this },
    focus() {}, addEventListener() {},
  }
  runInNewContext(bridge, {
    setTimeout(fn) { const id = ++sequence; timers.set(id, fn); return id },
    clearTimeout(id) { timers.delete(id) },
    parent: { postMessage(message) { messages.push(message) } },
    document: { addEventListener(name, fn) { handlers.set(name, fn) }, createRange: () => ({ selectNodeContents() {} }) },
    window: { addEventListener() {}, getSelection: () => ({ removeAllRanges() {}, addRange() {} }) },
  })
  const event = { target: node, detail: 1, preventDefault() {}, stopImmediatePropagation() {} }
  handlers.get('click')(event)
  assert.equal(messages.length, 0, 'The first text click must not focus the inspector before the double-click window ends')
  handlers.get('click')({ ...event, detail: 2 })
  handlers.get('dblclick')({ ...event, detail: 2 })
  for (const fn of timers.values()) fn()
  assert.equal(messages.some(message => message.type === 'dsh-ppt-select'), false)
  assert.equal(node.isContentEditable, true)
  assert.equal(messages.find(message => message.type === 'dsh-ppt-inline-state')?.editing, true)

  // A single click still locates its inspector after the double-click opportunity.
  node.contentEditable = 'false'; delete node.dataset.dshEditing
  handlers.get('click')(event)
  for (const fn of [...timers.values()]) fn()
  assert.equal(messages.filter(message => message.type === 'dsh-ppt-select').length, 1)
})

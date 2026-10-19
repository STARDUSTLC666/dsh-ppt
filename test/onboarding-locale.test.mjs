import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

test('first-run steps follow the host language, keep navigation and persist dismissal', () => {
  let client, Section, active = 'en-US', cursor = 0
  const values = [], storage = new Map(), subscribers = new Set()
  const locale = { getSnapshot: () => ({ active }), subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn) } }
  const React = {
    Fragment: 'fragment',
    createElement(type, props, ...children) { return { type, props: props || {}, children } },
    useState(initial) { const index = cursor++; if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial; return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value }] },
    useEffect() {},
  }
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    window: { __ModuleLoader__: { load(entry) { client = entry.factory(() => React) } } },
  })
  client.apply({ locale, get: () => locale, effect(fn, label) { if (label?.endsWith(': locale')) return fn() }, slots: { inject(_name, callback) { callback() }, register(meta, component) { if (meta.name === 'settings.section') Section = component } } })
  const card = Section({ locale }).children[0]
  const render = () => { cursor = 0; return card.type(card.props) }
  const nodes = tree => !tree ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : typeof tree === 'object' ? [tree, ...nodes(tree.children)] : [tree]
  const text = tree => nodes(tree).filter(value => typeof value === 'string').join(' ')
  const click = (tree, label) => { const button = nodes(tree).find(node => node?.type === 'button' && text(node) === label); assert.ok(button, label); button.props.onClick() }
  for (let step = 1; step <= 4; step++) {
    const tree = render(), content = text(tree)
    assert.match(content, /First steps/)
    assert.match(content, new RegExp(step + ' / 4'))
    assert.doesNotMatch(content, /[\u3400-\u9fff]/)
    if (step < 4) click(tree, 'Next')
  }
  active = 'zh'; for (const notify of subscribers) notify()
  assert.match(text(render()), /首次使用/)
  assert.match(text(render()), /上一步/)
  active = 'en'; for (const notify of subscribers) notify()
  click(render(), 'Start')
  assert.equal(render(), null)
  assert.equal(storage.get('dsh-first-run:dsh-ppt:v1'), 'done')
})

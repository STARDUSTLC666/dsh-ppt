import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

test('keeps Dialog mounted across renders and discovers host changes lazily', () => {
  const source = readFileSync(new URL('../templates/workbench-ui.js', import.meta.url), 'utf8')
  const React = { createElement: (type, props, ...children) => ({ type, props, children }) }
  const original = { Modal() {} }
  const replacement = { Modal() {} }
  let host = null
  const requireHost = () => {
    if (!host) throw new Error('not mounted')
    return host
  }
  const W = runInNewContext(`${source}\ncreateWorkbenchUI(React, requireHost)`, { React, requireHost })
  const render = children => W.Dialog({ title: 'Test', children, onClose() {} }).type
  const fallback = render('initial')
  assert.equal(render('edited'), fallback)
  host = original
  const mounted = render('initial')
  assert.notEqual(mounted, fallback)
  assert.equal(render('edited'), mounted)
  host = null
  assert.equal(render('unmounted'), fallback)
  host = replacement
  assert.notEqual(render('replaced'), mounted)
})

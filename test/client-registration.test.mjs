import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
test('browser entry registers the declared settings slot and confines generated previews', () => {
  let plugin
  runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load(entry) { plugin = entry.factory(() => ({ createElement() {} })) } } }
  })
  let definition
  plugin.apply({ slots: { inject(name, callback) { assert.equal(name, 'settings.section'); callback() }, register(meta, Component) { assert.equal(meta.name, 'settings.section'); assert.equal(typeof Component, 'function'); definition = meta } } })
  assert.equal(definition.id, 'dsh-ppt'); assert.equal(definition.label(), '演示文稿')
  const html = plugin.__internals.editorHtml('<html><head></head><body>preview</body></html>', 'nonce')
  assert.match(html, /Content-Security-Policy/); assert.match(html, /connect-src 'none'/)
  assert.match(html, /e.source!==parent/); assert.match(html, /#hud,#delivery-bar/)
  assert.match(html, /dsh-ppt-select/); assert.match(html, /dsh-ppt-jump/)
  const nested = plugin.__internals.editorHtml('<html><head></head><body><script>var presenter="</body></html>";<\/script></body></html>', 'nonce')
  assert.ok(nested.includes('var presenter="</body></html>";'))
  assert.ok(nested.indexOf('dsh-ppt-select') > nested.indexOf('var presenter='))
})

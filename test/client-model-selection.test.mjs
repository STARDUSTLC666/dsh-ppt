import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

let client
runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
  window: { __ModuleLoader__: { load(entry) { client = entry.factory(() => ({ createElement() {} })) } } },
})
const { modelRouteKey: key, findModelRoute: find, reconcileModelRoute: select } = client.__internals
const first = { provider: 'gateway-a', model: 'vision-a', label: 'Vision A' }
const second = { provider: 'gateway-b', model: 'vision-b', label: 'Vision B' }

test('a catalog reorder preserves the selected provider and model, not its row', () => {
  const selected = select([first, second], '', second)
  assert.equal(select([second, first], selected), key(second))
  assert.equal(find([second, first], selected), second)
})

test('a removed model clears selection instead of adopting the replacement or preferred route', () => {
  const replacement = { ...first, model: 'new-model' }
  assert.equal(select([replacement, second], key(first), second), '')
  assert.equal(find([replacement, second], key(first)), undefined)
})

test('an empty selection cannot resolve the first model or silently refill on refresh', () => {
  assert.equal(find([first, second], ''), undefined)
  assert.equal(select([first, second], ''), '')
  assert.equal(select([], key(first)), '')
})

test('initial preference is used only when that exact provider and model are available', () => {
  assert.equal(select([first, second], '', { provider: second.provider, model: second.model }), key(second))
  assert.equal(select([first], '', second), '')
  assert.equal(select([first], '', { provider: 'other-gateway', model: first.model }), '')
})

test('provider identity prevents collisions between identical model IDs and delimiter-bearing names', () => {
  const sameName = { ...first, provider: 'other' }
  assert.notEqual(key(first), key(sameName))
  assert.notEqual(key({ provider: 'a:b', model: 'c' }), key({ provider: 'a', model: 'b:c' }))
  assert.equal(select([sameName], key(first)), '')
})

test('renaming a displayed model label does not change the chosen route', () => {
  const renamed = { ...first, label: 'Updated display name' }
  assert.equal(select([renamed], key(first)), key(first))
  assert.equal(find([renamed], key(first)), renamed)
})

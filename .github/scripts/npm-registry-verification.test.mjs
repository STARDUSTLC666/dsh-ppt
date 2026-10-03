import test from 'node:test'
import assert from 'node:assert/strict'
import { waitForPublishedMetadata } from './npm-registry-verification.mjs'

test('delayed public metadata is retried without republishing', async () => {
  let now = 0, reads = 0
  const waits = [], result = { dist: { integrity: 'sha512-tested' } }
  const published = await waitForPublishedMetadata(async () => ++reads < 3 ? null : result, 'sha512-tested', { timeoutMs: 30000, now: () => now, pause: async ms => { waits.push(ms); now += ms } })
  assert.equal(published, result); assert.equal(reads, 3); assert.deepEqual(waits, [10000, 10000])
})
test('a different published artifact fails immediately', async () => {
  let reads = 0, waits = 0
  await assert.rejects(waitForPublishedMetadata(async () => { reads++; return { dist: { integrity: 'sha512-other' } } }, 'sha512-tested', { pause: async () => { waits++ } }), /integrity mismatch/)
  assert.equal(reads, 1); assert.equal(waits, 0)
})
test('propagation polling has a finite deadline and an actionable uncertainty error', async () => {
  let now = 0, reads = 0
  const waits = []
  await assert.rejects(waitForPublishedMetadata(async () => { reads++; return null }, 'sha512-tested', { timeoutMs: 25000, now: () => now, pause: async ms => { waits.push(ms); now += ms } }), /accepted the upload.*verification timed out/)
  assert.equal(reads, 4); assert.deepEqual(waits, [10000, 10000, 5000]); assert.equal(now, 25000)
})
test('registry errors are not hidden by propagation retries', async () => {
  let reads = 0, waits = 0
  await assert.rejects(waitForPublishedMetadata(async () => { reads++; throw new Error('Registry verification failed: HTTP 403') }, 'sha512-tested', { pause: async () => { waits++ } }), /HTTP 403/)
  assert.equal(reads, 1); assert.equal(waits, 0)
})

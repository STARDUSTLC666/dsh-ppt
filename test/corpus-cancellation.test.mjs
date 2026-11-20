import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { resolve, join, relative, isAbsolute, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ingestExemplarDirectory } from '../skills/dsh-ppt/scripts/deck-exemplars.mjs'

const ownedRoot = fileURLToPath(new URL('../../.harness-validation/ppt-corpus-cancel/', import.meta.url))
function fixture(t) {
  mkdirSync(ownedRoot, { recursive: true })
  const directory = mkdtempSync(join(ownedRoot, 'run-')), corpus = join(directory, 'corpus')
  mkdirSync(corpus)
  for (const name of ['a.pptx', 'b.pptx']) writeFileSync(join(corpus, name), 'fixture')
  t.after(() => {
    const child = relative(resolve(ownedRoot), resolve(directory))
    assert.ok(child && child !== '..' && !child.startsWith('..' + sep) && !isAbsolute(child))
    rmSync(directory, { recursive: true, force: true })
  })
  return { directory, corpus }
}
const absorbed = { sourceFile: 'fixture.pptx', recommendedTheme: 'consulting', slideSkeleton: [] }

test('corpus ingestion rejects a pre-aborted request without reading or saving exemplars', async t => {
  const { directory, corpus } = fixture(t), reason = new Error('cancel before corpus'), calls = []
  await assert.rejects(ingestExemplarDirectory({ dirPath: corpus, cwd: directory, signal: AbortSignal.abort(reason), absorbFn: async () => { calls.push('absorb'); return absorbed } }), error => error === reason)
  assert.deepEqual(calls, [])
  assert.equal(existsSync(join(directory, '.dsh-ppt')), false)
})

test('cancellation while an absorber settles prevents saving and starting remaining files', async t => {
  const { directory, corpus } = fixture(t), controller = new AbortController(), reason = new Error('cancel while absorbing')
  let calls = 0
  await assert.rejects(ingestExemplarDirectory({ dirPath: corpus, cwd: directory, signal: controller.signal, absorbFn: async () => { calls++; controller.abort(reason); return absorbed } }), error => error === reason)
  assert.equal(calls, 1)
  assert.equal(existsSync(join(directory, '.dsh-ppt')), false)
})

test('a rejected cancelled absorber is propagated instead of reported as a successful batch', async t => {
  const { directory, corpus } = fixture(t), controller = new AbortController(), reason = new Error('cancelled absorber')
  let calls = 0
  await assert.rejects(ingestExemplarDirectory({ dirPath: corpus, cwd: directory, signal: controller.signal, absorbFn: async () => { calls++; controller.abort(reason); throw reason } }), error => error === reason)
  assert.equal(calls, 1)
})

test('ordinary per-file failures still allow later valid corpus files to be saved', async t => {
  const { directory, corpus } = fixture(t)
  let calls = 0
  const result = await ingestExemplarDirectory({ dirPath: corpus, cwd: directory, absorbFn: async () => { if (++calls === 1) throw new Error('invalid first deck'); return absorbed } })
  assert.equal(result.ok, true)
  assert.equal(result.failedCount, 1)
  assert.equal(result.ingestedCount, 1)
  assert.equal(calls, 2)
})

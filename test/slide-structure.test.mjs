import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { buildDeckAsync, editDeck, undoDeck, readDeckProject } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { PptWorkbench } from '../lib/workbench.js'
import { englishWorkbenchMessage } from '../lib/workbench-language.js'
import { unzipSync } from 'fflate'

const root = resolve('.test-output'); mkdirSync(root, { recursive: true })
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1cAAAAASUVORK5CYII='
async function fixture(t, slides) {
  const dir = mkdtempSync(join(root, 'structure-'))
  t.after(() => { assert.ok(dir.startsWith(root)); rmSync(dir, { recursive: true, force: true }) })
  const created = await buildDeckAsync({ title: '页面操作', outputDir: dir, slides })
  return { created, dir, manifest: () => readDeckProject({ deckPath: created.jsonPath }).manifest }
}

test('copying image/chart pages preserves embedded resources and notes with new stable IDs', async t => {
  const { created, manifest } = await fixture(t, [
    { layout: 'image', title: '图片', image, notes: '图片备注' },
    { layout: 'chart', title: '图表', notes: '图表备注', chart: { kind: 'column', categories: ['A', 'B'], series: [{ name: '值', values: [2, 4] }] } },
  ])
  const original = manifest()
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 0, duplicate: [1, original.slides[1].id] })
  const next = manifest()
  assert.equal(next.slides.length, 4)
  assert.equal(new Set(next.slides.map(s => s.id)).size, 4)
  for (const i of [0, 2]) {
    const { id: a, ...base } = next.slides[i], { id: b, ...copy } = next.slides[i + 1]
    assert.notEqual(a, b); assert.deepEqual(base, copy)
  }
  assert.deepEqual(next.assets, original.assets)
  const files = unzipSync(readFileSync(created.pptxPath))
  assert.equal(Object.keys(files).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p)).length, 4)
  assert.ok(Object.keys(files).some(p => /^ppt\/media\//.test(p)))
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 1, edits: [{ slide: next.slides[1].id, patch: { title: '只修改副本' } }] })
  assert.equal(manifest().slides[0].title, '图片')
  assert.equal(manifest().slides[1].title, '只修改副本')
  await undoDeck({ deckPath: created.jsonPath, expectedRevision: 2 })
  await undoDeck({ deckPath: created.jsonPath, expectedRevision: 3 })
  assert.deepEqual(manifest().slides, original.slides)
})

test('page references use the original deck even when ordering, editing and removing together', async t => {
  const { created, manifest } = await fixture(t, ['A', 'B', 'C'].map(title => ({ title, layout: 'bullets', bullets: [title] })))
  const before = manifest(), ids = before.slides.map(s => s.id)
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 0, order: [...ids].reverse(), edits: [{ slide: 2, patch: { title: '新版 B' } }], duplicate: [2], remove: [1] })
  assert.deepEqual(manifest().slides.map(s => s.title), ['C', '新版 B', '新版 B'])
  assert.equal(manifest().slides[1].id, ids[1])
  await undoDeck({ deckPath: created.jsonPath, expectedRevision: 1 })
  assert.deepEqual(manifest().slides, before.slides)
})

test('invalid copy/remove requests never partly change any delivery file', async t => {
  const { created, manifest } = await fixture(t, [{ title: 'A' }, { title: 'B' }])
  const ids = manifest().slides.map(s => s.id), paths = Object.values(created.files), bytes = paths.map(p => readFileSync(p))
  for (const request of [{ duplicate: [] }, { duplicate: [1, ids[0]] }, { duplicate: ['foreign'] }, { remove: [1, 2] }, { remove: [1], duplicate: [1] }, { duplicate: [0] }, { remove: [2.5] }]) {
    await assert.rejects(editDeck({ deckPath: created.jsonPath, expectedRevision: 0, ...request }), /页面|保留|重复|复制|删除|需为/)
    paths.forEach((p, i) => assert.deepEqual(readFileSync(p), bytes[i]))
  }
})

test('workbench copy/delete selects the adjacent page and supports revision checks and undo', async t => {
  const { created, dir } = await fixture(t, [{ title: 'A' }, { title: 'B' }])
  const wb = new PptWorkbench({ catalogPath: join(dir, 'projects.jsonl') })
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const opened = await wb.action({ operation: 'open', id }), first = opened.project.slides[0].id
  const copied = await wb.action({ operation: 'duplicate', id, slide: first, expectedRevision: 0 })
  assert.equal(copied.project.slides.length, 3)
  assert.equal(copied.selected, copied.project.slides[1].id)
  assert.notEqual(copied.selected, first)
  await assert.rejects(wb.action({ operation: 'remove', id, slide: first, expectedRevision: 0 }), /已被修改/)
  const removed = await wb.action({ operation: 'remove', id, slide: copied.selected, expectedRevision: 1 })
  assert.equal(removed.project.slides.length, 2)
  const undone = await wb.action({ operation: 'undo', id, expectedRevision: 2 })
  assert.equal(undone.project.slides.length, 3)
  assert.match(englishWorkbenchMessage('dsh-ppt：至少保留一页'), /at least one slide/)
})

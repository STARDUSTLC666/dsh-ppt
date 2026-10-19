import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { unzipSync, zipSync, strToU8 } from 'fflate'
import { buildDeckAsync, editDeck, undoDeck, checkDeck } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'

function folder(t) {
  const root = resolve('.test-output'); mkdirSync(root, { recursive: true })
  const dir = mkdtempSync(join(root, 'project-safety-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}
const create = outputDir => buildDeckAsync({ title: 'Project safety', outputDir, slides: [{ layout: 'cover', title: 'Original', notes: 'Speaker notes' }] })
const edit = deckPath => editDeck({ deckPath, edits: [{ slide: 1, patch: { title: 'Edited in DSH' } }] })

for (const kind of ['pptx', 'html']) test(`external ${kind} edits survive edit, undo and a JSON-based copy`, async t => {
  const deck = await create(folder(t)); await edit(deck.jsonPath)
  if (kind === 'pptx') {
    const parts = unzipSync(readFileSync(deck.pptxPath))
    parts['ppt/slides/slide1.xml'] = strToU8(Buffer.from(parts['ppt/slides/slide1.xml']).toString().replaceAll('Edited in DSH', 'Edited in Office'))
    writeFileSync(deck.pptxPath, zipSync(parts))
  } else writeFileSync(deck.htmlPath, '<p>Edited outside DSH</p>')
  const before = Object.values(deck.files).map(path => readFileSync(path))
  assert.equal(checkDeck({ deckPath: deck.jsonPath }).ok, false)
  assert.equal(checkDeck({ deckPath: deck.jsonPath }).issues.at(-1).code, 'artifact-conflict')
  await assert.rejects(editDeck({ deckPath: deck.jsonPath, edits: [{ slide: 1, patch: { title: 'Do not overwrite' } }] }), /外部修改/)
  await assert.rejects(undoDeck({ deckPath: deck.jsonPath }), /外部修改/)
  const copy = await editDeck({ deckPath: deck.jsonPath, saveAs: true })
  assert.notEqual(copy.jsonPath, deck.jsonPath)
  assert.equal(copy.undoAvailable, 0)
  assert.equal(checkDeck({ deckPath: copy.jsonPath }).ok, true)
  assert.equal(JSON.parse(readFileSync(copy.jsonPath)).slides[0].title, 'Edited in DSH')
  Object.values(deck.files).forEach((path, index) => assert.deepEqual(readFileSync(path), before[index]))
})

test('legacy projects require a safe copy before any output can be regenerated', async t => {
  const deck = await create(folder(t)), document = JSON.parse(readFileSync(deck.jsonPath))
  delete document.artifacts; writeFileSync(deck.jsonPath, JSON.stringify(document))
  await assert.rejects(edit(deck.jsonPath), /旧工程.*另存副本/)
  const first = await editDeck({ deckPath: deck.jsonPath, saveAs: true })
  const second = await editDeck({ deckPath: deck.jsonPath, saveAs: true })
  assert.notEqual(first.jsonPath, second.jsonPath)
  assert.equal(checkDeck({ deckPath: first.jsonPath }).ok, true)
})

test('untrusted current and undo branding and image fit are rejected before generating files', async t => {
  const deck = await create(folder(t)); await edit(deck.jsonPath)
  const original = JSON.parse(readFileSync(deck.jsonPath))
  for (const tamper of [
    doc => { doc.brand = { fontFamily: 'unsafe;font' } },
    doc => { doc.history[0].brand = { backgroundColor: '#FFFFFF;unsafe' } },
    doc => { doc.slides[0] = { ...doc.slides[0], layout: 'image', image: { fit: 'cover;background:unsafe' } } },
  ]) {
    const doc = structuredClone(original); tamper(doc); writeFileSync(deck.jsonPath, JSON.stringify(doc))
    const before = Object.values(deck.files).map(path => readFileSync(path))
    assert.throws(() => checkDeck({ deckPath: deck.jsonPath }), /dsh-ppt/)
    await assert.rejects(edit(deck.jsonPath), /dsh-ppt/)
    await assert.rejects(undoDeck({ deckPath: deck.jsonPath }), /dsh-ppt/)
    Object.values(deck.files).forEach((path, index) => assert.deepEqual(readFileSync(path), before[index]))
  }
})

test('every generated XML part removes forbidden XML scalars while preserving Unicode and word boundaries', async t => {
  const text = '中文 😀 A\u000BB\u000CC\u001B\u0008\uFFFE\uFFFF\uD800!'
  const deck = await buildDeckAsync({ title: text, outputDir: folder(t), slides: [{ layout: 'cover', title: text, notes: text }] })
  const parts = unzipSync(readFileSync(deck.pptxPath)), xml = Object.entries(parts).filter(([name]) => /\.xml$|\.rels$/.test(name))
  assert.ok(xml.length > 5)
  for (const [name, bytes] of xml) assert.doesNotMatch(Buffer.from(bytes).toString(), /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u, name)
  assert.match(Buffer.from(parts['ppt/slides/slide1.xml']).toString(), /中文 😀 A[ \n]B[ \n]C!/)
})

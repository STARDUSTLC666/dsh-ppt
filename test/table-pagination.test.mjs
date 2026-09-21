import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { buildDeck, normalizeBuildOptions, normalizeSlides, parseMarkdownDeck } from '../skills/dsh-ppt/scripts/deck-core.mjs'

const rows = [['Item', 'Value'], ...Array.from({ length: 17 }, (_, i) => ['row-' + String(i + 1).padStart(2, '0'), String(i + 1)])]
const markdown = [rows[0].join(' | '), '-- | --', ...rows.slice(1).map(row => row.join(' | '))].map(row => '| ' + row + ' |').join('\n')

function verifyTables(slides) {
  const tables = slides.filter(slide => slide.layout === 'table')
  assert.deepEqual(tables.map(slide => slide.rows.length), [9, 9, 2])
  assert.deepEqual(tables.flatMap(slide => slide.rows.slice(1)), rows.slice(1))
  for (const table of tables) assert.deepEqual(table.rows[0], rows[0])
  return tables
}

for (const heading of ['## Data\n', '', '# Deck\n']) {
  test('Markdown long tables preserve every row, heading=' + JSON.stringify(heading), () => {
    verifyTables(parseMarkdownDeck('Deck', heading + markdown).slides)
  })
}

test('structured tables paginate with repeated headers and first-page notes', () => {
  const tables = verifyTables(normalizeBuildOptions({ title: 'Deck', lang: 'en', slides: [{ layout: 'table', title: 'Data', rows, notes: 'Explain the data' }] }).deck.slides)
  assert.equal(tables[0].notes, 'Explain the data')
  assert.equal(tables[1].notes, undefined)
  assert.equal(tables[2].notes, undefined)
  assert.match(tables[1].title, /continued/i)
  assert.equal(tables[1].kicker, tables[1].title, 'continuation must keep the compact table heading layout')
  assert.equal(normalizeSlides([{ layout: 'table', title: 'Boundary', rows: rows.slice(0, 9) }]).length, 1)
})

test('table column and cell limits report errors instead of truncating input', () => {
  assert.throws(() => normalizeSlides([{ layout: 'table', rows: [Array(9).fill('x')] }]), /8.*列|columns/i)
  assert.throws(() => parseMarkdownDeck('Deck', '## Data\n| ' + 'x'.repeat(61) + ' |\n| -- |\n| value |'), /60.*字符|characters/i)
  const table = normalizeSlides([{ layout: 'table', rows: [['a'], ['1', '2']] }])[0]
  assert.deepEqual(table.rows, [['a', ''], ['1', '2']], 'pad short rows instead of dropping cells in PPTX')
})

test('page limits include expanded tables and fail before creating any artifacts', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-limit-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const outputDir = join(dir, 'not-created')
  assert.throws(() => buildDeck({ title: 'Deck', content: '## Data\n' + markdown, maxSlides: 3, outputDir }), /maxSlides.*5|5.*maxSlides/)
  assert.equal(existsSync(outputDir), false)
  assert.throws(() => normalizeSlides([{ layout: 'table', rows }], 2), /maxSlides/)
})

function slideXml(buffer) {
  const result = []
  let pos = 0
  while (buffer.readUInt32LE(pos) === 0x04034b50) {
    const size = buffer.readUInt32LE(pos + 18)
    const nameLength = buffer.readUInt16LE(pos + 26)
    const extraLength = buffer.readUInt16LE(pos + 28)
    const name = buffer.subarray(pos + 30, pos + 30 + nameLength).toString()
    const start = pos + 30 + nameLength + extraLength
    if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) result.push(inflateRawSync(buffer.subarray(start, start + size)).toString())
    pos = start + size
  }
  return result.join('\n')
}

test('JSON, HTML and PPTX all contain the last row after automatic pagination', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-table-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const result = buildDeck({ title: 'Deck', content: '## Data\n' + markdown, outputDir: dir })
  verifyTables(JSON.parse(readFileSync(result.jsonPath, 'utf8')).slides)
  const html = readFileSync(result.htmlPath, 'utf8')
  const xml = slideXml(readFileSync(result.pptxPath))
  for (const [label] of rows.slice(1)) {
    assert.ok(html.includes(label), 'HTML retains ' + label)
    assert.ok(xml.includes(label), 'PPTX retains ' + label)
  }
})

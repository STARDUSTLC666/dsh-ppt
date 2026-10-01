import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { buildDeckAsync, editDeck, undoDeck, checkDeck, checkDeckAsync, checkManifest, listTemplates } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { main } from '../skills/dsh-ppt/scripts/build-deck.mjs'
import { normalizeChart, renderChartSvg } from '../skills/dsh-ppt/scripts/deck-media.mjs'
import { resolveTheme, buildDeck } from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { createPptExecutors } from '../lib/execution.js'
import { resolvePptConfig } from '../lib/config.js'

const work = resolve('.test-output'); mkdirSync(work, { recursive: true })
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVcoAAAAASUVORK5CYII=', 'base64')
const dataImage = 'data:image/png;base64,' + png.toString('base64')
const simple = [{ layout: 'cover', title: '成果汇报' }, { layout: 'bullets', title: '进展', bullets: ['已完成第一阶段', '下一步开展验收'], notes: '保留备注' }, { layout: 'closing', title: '确认验收时间' }]
const chart = kind => ({ kind, categories: ['一月', '二月', '三月'], series: [{ name: '完成量', values: [3, 5, 9] }] })
const json = path => JSON.parse(readFileSync(path, 'utf8'))
async function inDir(run) { const dir = mkdtempSync(join(work, 'advanced-')); try { return await run(dir) } finally { if (!dir.startsWith(work + '/')) assert.ok(dir.startsWith(work + '\\')); rmSync(dir, { recursive: true, force: true }) } }
function zipEntries(buffer) {
  let end = buffer.length - 22
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--
  assert.ok(end >= 0, 'ZIP end directory exists')
  const count = buffer.readUInt16LE(end + 10), entries = {}; let pos = buffer.readUInt32LE(end + 16)
  for (let i = 0; i < count; i++) {
    assert.equal(buffer.readUInt32LE(pos), 0x02014b50)
    const method = buffer.readUInt16LE(pos + 10), size = buffer.readUInt32LE(pos + 20), nameLength = buffer.readUInt16LE(pos + 28), extra = buffer.readUInt16LE(pos + 30), comment = buffer.readUInt16LE(pos + 32), local = buffer.readUInt32LE(pos + 42)
    const name = buffer.toString('utf8', pos + 46, pos + 46 + nameLength)
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28), raw = buffer.subarray(start, start + size)
    entries[name] = method === 0 ? raw : inflateRawSync(raw)
    pos += 46 + nameLength + extra + comment
  }
  return entries
}

test('all four scenarios expose useful outlines; unfilled templates are labelled draft', () => inDir(async dir => {
  assert.deepEqual(listTemplates().map(s => s.id), ['weekly', 'defense', 'project', 'pitch'])
  for (const template of listTemplates('en')) {
    const result = await buildDeckAsync({ title: 'Report', template: template.id, lang: 'en', outputDir: dir })
    assert.equal(result.deliveryStatus, 'draft')
    assert.ok(result.quality.issues.some(i => i.code === 'template-unfilled'))
    assert.equal(result.theme, template.theme)
  }
  const finished = await buildDeckAsync({ title: 'Report', template: 'weekly', slides: simple, outputDir: dir })
  assert.equal(finished.deliveryStatus, 'ready-for-review')
  assert.deepEqual(json(finished.jsonPath).slides.map(s => s.title), simple.map(s => s.title))
}))

test('PNG embedded in HTML/PPTX; contain/cover and all image layouts preserve notes and animation', () => inDir(async dir => {
  writeFileSync(join(dir, '截图 中文.png'), png)
  const output = await buildDeckAsync({ title: '图片', cwd: dir, outputDir: join(dir, 'out'), slides: [simple[1],
    ...['image', 'image-left', 'image-right'].map((layout, i) => ({ layout, title: '图文说明', image: { src: '截图 中文.png', alt: '界面截图', fit: i === 1 ? 'cover' : 'contain' }, bullets: ['界面与操作说明'] }))] })
  const manifest = json(output.jsonPath), entries = zipEntries(readFileSync(output.pptxPath))
  assert.equal(Object.keys(manifest.assets).length, 1)
  rmSync(join(dir, '截图 中文.png'))
  assert.match(readFileSync(output.htmlPath, 'utf8'), /data:image\/png;base64/)
  assert.equal(Object.keys(entries).filter(n => n.startsWith('ppt/media/')).length, 3)
  assert.match(entries['ppt/slides/slide3.xml'].toString(), /srcRect/)
  assert.match(entries['ppt/slides/slide1.xml'].toString(), /<p:timing>/)
  assert.match(entries['ppt/slides/slide1.xml'].toString(), /<p:transition/)
  assert.ok(Object.keys(entries).some(n => /notesSlides\/notesSlide1.xml/.test(n)))
  assert.ok(checkDeck({ deckPath: output.jsonPath }).ok)
}))

test('four chart types are native editable charts with matching embedded workbooks and accessible HTML data', () => inDir(async dir => {
  const output = await buildDeckAsync({ title: '图表', outputDir: dir, slides: ['column', 'bar', 'line', 'pie'].map(kind => ({ layout: 'chart', title: kind, chart: chart(kind) })) })
  const entries = zipEntries(readFileSync(output.pptxPath)), charts = Object.keys(entries).filter(n => /^ppt\/charts\/chart\d+\.xml$/.test(n)), books = Object.keys(entries).filter(n => n.endsWith('.xlsx'))
  assert.equal(charts.length, 4); assert.equal(books.length, 4)
  assert.match(entries[charts[0]].toString(), /<c:barDir val="col"/)
  assert.match(entries[charts[1]].toString(), /<c:barDir val="bar"/)
  assert.match(entries[charts[2]].toString(), /<c:lineChart>/)
  assert.match(entries[charts[3]].toString(), /<c:pieChart>/)
  for (const book of books) { const xlsx = zipEntries(entries[book]); const sheet = xlsx['xl/worksheets/sheet1.xml'].toString(); assert.match(sheet, /<v>9<\/v>/); assert.match(sheet, /<v>3<\/v>/) }
  const html = readFileSync(output.htmlPath, 'utf8')
  assert.equal((html.match(/class="native-chart"/g) || []).length, 4)
  assert.match(html, /<td>9<\/td>/)
}))

test('tabular chart input rejects inconsistent, empty, non-finite and misleading numeric data', () => {
  assert.deepEqual(normalizeChart({ kind: 'column', rows: [['月份', '销量'], ['一月', '3.5'], ['二月', -2]] }).series[0].values, [3.5, -2])
  for (const rows of [[['x', 'a'], ['A']], [['x', 'a'], ['A', '']], [['x', 'a'], ['A', '12元']], [['x', 'a'], ['A', Infinity]]]) assert.throws(() => normalizeChart({ rows }), /dsh-ppt/)
  for (const input of [{ ...chart('pie'), series: [{ name: 'A', values: [-1, 2, 3] }] }, { ...chart('pie'), series: [{ name: 'A', values: [0, 0, 0] }] }, { ...chart('line'), series: [{ name: 'A', values: [1] }] }]) assert.throws(() => normalizeChart(input), /dsh-ppt/)
  const svg = renderChartSvg(normalizeChart({ kind: 'column', rows: [['x', 'amount'], ['A', -4], ['B', 6]] }), resolveTheme('data'))
  assert.doesNotMatch(svg, /(?:NaN|Infinity)/)
  assert.match(svg, /<td>-4<\/td>/)
})

test('selected-page edits keep every other page byte-equivalent and stable IDs; undo restores content', () => inDir(async dir => {
  const output = await buildDeckAsync({ title: '单页修改', slides: simple, outputDir: dir }), before = json(output.jsonPath)
  const changed = await editDeck({ deckPath: output.jsonPath, expectedRevision: 0, edits: [{ slide: 2, patch: { title: '本周进展', bullets: ['完成验收'] } }] })
  assert.equal(changed.revision, 1); assert.equal(changed.undoAvailable, 1)
  const after = json(output.jsonPath)
  assert.deepEqual(after.slides[0], before.slides[0]); assert.deepEqual(after.slides[2], before.slides[2]); assert.equal(after.slides[1].id, before.slides[1].id)
  await assert.rejects(editDeck({ deckPath: output.jsonPath, expectedRevision: 0, edits: [{ slide: 2, patch: { title: '过期修改' } }] }), /修订号冲突/)
  const undone = await undoDeck({ deckPath: output.jsonPath, expectedRevision: 1 })
  assert.equal(undone.revision, 2); assert.deepEqual(json(output.jsonPath).slides, before.slides)
  await assert.rejects(undoDeck({ deckPath: output.jsonPath }), /没有可撤销/)
}))

test('image replacement and undo work after original sources are removed; brand changes undo together', () => inDir(async dir => {
  const output = await buildDeckAsync({ title: '品牌', slides: [{ layout: 'image-left', title: '图片', image: { src: dataImage } }], brand: { name: 'DSH', logo: dataImage, primaryColor: '#118866', footer: '项目汇报' }, outputDir: dir })
  const before = json(output.jsonPath)
  await editDeck({ deckPath: output.jsonPath, edits: [{ slide: before.slides[0].id, patch: { title: '新的说明', image: { src: dataImage, fit: 'cover' } } }], brand: { footer: '新版页脚', logo: null } })
  assert.ok(!json(output.jsonPath).brand.logoAssetId)
  await undoDeck({ deckPath: output.jsonPath })
  assert.deepEqual(json(output.jsonPath).brand, before.brand)
  assert.deepEqual(json(output.jsonPath).slides, before.slides)
  assert.match(readFileSync(output.htmlPath, 'utf8'), /项目汇报/)
}))

test('invalid multi-page edit, image, chart and table expansion never overwrite any artifact', () => inDir(async dir => {
  const output = await buildDeckAsync({ title: '事务', slides: simple, outputDir: dir })
  const before = Object.values(output.files).map(path => readFileSync(path))
  for (const edits of [[{ slide: 1, patch: { title: '不应写入' } }, { slide: 4, patch: { title: '未知页' } }],
    [{ slide: 2, patch: { image: { src: '不存在.png' } } }], [{ slide: 2, patch: { chart: { ...chart('column'), series: [{ name: 'A', values: [NaN, 2, 3] }] } } }],
    [{ slide: 2, patch: { layout: 'table', rows: [['头'], ...Array.from({ length: 10 }, (_, i) => [String(i)])] } }]]) {
    await assert.rejects(editDeck({ deckPath: output.jsonPath, edits, cwd: dir }), /dsh-ppt/)
    Object.values(output.files).forEach((path, i) => assert.deepEqual(readFileSync(path), before[i]))
  }
  assert.ok(!readdirSync(dir).some(n => /\.tmp$|\.dsh-ppt-lock$/.test(n)))
}))

test('parallel edits detect competing revisions and simultaneous creation uses unique artifact groups', () => inDir(async dir => {
  const created = await Promise.all([1, 2].map(n => buildDeckAsync({ title: '并行', slides: simple, outputDir: dir })))
  assert.notEqual(created[0].jsonPath, created[1].jsonPath)
  const edits = await Promise.allSettled([1, 2].map(n => editDeck({ deckPath: created[0].jsonPath, edits: [{ slide: 2, patch: { title: '修改 ' + n } }] })))
  assert.equal(edits.filter(e => e.status === 'fulfilled').length, 1)
  assert.match(edits.find(e => e.status === 'rejected').reason.message, /其他操作修改/)
}))

test('quality checker locates dense text, overflow, missing/low-res assets, small table text and contrast by page', () => {
  const manifest = { theme: 'data', assets: { tiny: { width: 1, height: 1 } }, brand: { backgroundColor: '#FFFFFF', textColor: '#DDDDDD' }, slides: [
    { id: 'dense', layout: 'bullets', title: '过长标题'.repeat(20), bullets: Array(12).fill('过长的正文说明'.repeat(10)) },
    { id: 'tiny', layout: 'image', title: '图', image: { assetId: 'tiny', alt: '图' } },
    { id: 'lost', layout: 'image', title: '缺图', image: { assetId: 'missing' } },
    { id: 'table', layout: 'table', title: '表格', rows: [Array(7).fill('头'), Array(7).fill('长内容'.repeat(20))] },
  ] }
  const report = checkManifest(manifest)
  for (const [code, page] of [['title-overflow', 1], ['dense-bullets', 1], ['body-overflow', 1], ['low-resolution', 2], ['missing-image', 3], ['small-font', 4], ['low-contrast', 1]]) assert.ok(report.issues.some(i => i.code === code && i.slide === page), code)
  assert.equal(report.ok, false); assert.match(report.note, /静态估算/)
})

test('cancel before export commit leaves no output, tools resolve images and projects relative to session cwd', () => inDir(async dir => {
  const controller = new AbortController(), out = join(dir, 'cancelled')
  const pending = buildDeckAsync({ title: '取消', slides: [{ layout: 'chart', title: '图表', chart: chart('line') }], outputDir: out, signal: controller.signal })
  controller.abort(new Error('user cancelled'))
  await assert.rejects(pending, /user cancelled/)
  writeFileSync(join(dir, 'source.png'), png)
  const execute = createPptExecutors(resolvePptConfig({})), context = { agent: { session: { header: { cwd: dir } } } }
  const created = await execute.create({ title: '会话', slides: [{ layout: 'image', title: '截图', image: 'source.png' }] }, context)
  const changed = await execute.edit({ deckPath: '会话.json', edits: [{ slide: 1, patch: { title: '修改截图' } }] }, context)
  assert.equal(changed.revision, 1)
  const report = await execute.check({ deckPath: '会话.json' }, context); assert.equal(report.revision, 1)
  assert.ok(created.pptxPath.startsWith(dir))
}))

test('legacy synchronous text API remains usable and refuses media instead of silently dropping it', () => inDir(async dir => {
  assert.ok(buildDeck({ title: '旧接口', content: '# 旧接口\n- 文字', outputDir: dir }).ok)
  assert.throws(() => buildDeck({ title: '图', slides: [{ layout: 'chart', chart: chart('pie') }] }), /buildDeckAsync/)
}))

test('explicit media layout changes replace the old object, preserve IDs and remain undoable', () => inDir(async dir => {
  const output = await buildDeckAsync({ title: '布局修改', outputDir: dir, slides: [{ layout: 'image-left', title: '图文', image: dataImage, bullets: ['原正文'] }] })
  const original = json(output.jsonPath)
  await editDeck({ deckPath: output.jsonPath, edits: [{ slide: 1, patch: { layout: 'chart', chart: chart('column') } }] })
  const changed = json(output.jsonPath)
  assert.equal(changed.slides[0].id, original.slides[0].id)
  assert.equal(changed.slides[0].layout, 'chart'); assert.equal(changed.slides[0].image, undefined)
  assert.ok(zipEntries(readFileSync(output.pptxPath))['ppt/charts/chart1.xml'])
  await editDeck({ deckPath: output.jsonPath, edits: [{ slide: 1, patch: { layout: 'image-right', image: dataImage } }] })
  assert.equal(json(output.jsonPath).slides[0].chart, undefined)
  await undoDeck({ deckPath: output.jsonPath })
  assert.equal(json(output.jsonPath).slides[0].layout, 'chart')
  const before = readFileSync(output.jsonPath)
  await assert.rejects(editDeck({ deckPath: output.jsonPath, edits: [{ slide: 1, patch: { chart: chart('line'), image: dataImage } }] }), /不能同时/)
  assert.deepEqual(readFileSync(output.jsonPath), before)
}))

test('corrupt embedded assets are reported by page and prevent replacing existing artifacts', () => inDir(async dir => {
  const output = await buildDeckAsync({ title: '图片工程', outputDir: dir, slides: [{ layout: 'image', title: '截图', image: dataImage }] })
  const damaged = json(output.jsonPath), asset = Object.values(damaged.assets)[0]
  asset.width += 1
  writeFileSync(output.jsonPath, JSON.stringify(damaged))
  const before = Object.values(output.files).map(file => readFileSync(file))
  assert.ok(checkDeck({ deckPath: output.jsonPath }).issues.some(i => i.code === 'invalid-image' && i.slide === 1 && i.severity === 'error'))
  await assert.rejects(editDeck({ deckPath: output.jsonPath, edits: [{ slide: 1, patch: { title: '不能导出损坏图' } }] }), /摘要不匹配/)
  Object.values(output.files).forEach((file, i) => assert.deepEqual(readFileSync(file), before[i]))
}))

test('explicit invalid render receipt fails CLI while retaining the independent static result', () => inDir(async dir => {
  const output = await buildDeckAsync({ title: '核验', slides: simple, outputDir: dir })
  const receipt = join(dir, 'missing-receipt.json')
  const report = await checkDeckAsync({ deckPath: output.jsonPath, renderReceipt: receipt })
  assert.equal(report.ok, true); assert.equal(report.verification.static, 'checked')
  assert.equal(report.verification.pptxRender, 'not-verified'); assert.equal(report.verification.visual, 'not-verified')
  assert.equal(report.render.status, 'not-verified')
  assert.equal(await main(['--check', output.jsonPath, '--render-receipt', receipt], { log() {} }), 1)
  assert.equal(await main(['--check', output.jsonPath], { log() {} }), 0)
}))

test('render CLI leaves default directory selection to renderer and respects explicit output', async () => {
  const calls = [], io = { log() {}, renderDeck: async options => { calls.push(options); return { ok: true, status: 'rendered' } } }
  assert.equal(await main(['--render', 'nested/deck.pptx', '--format', 'both'], io), 0)
  assert.equal(calls[0].outputDir, undefined); assert.equal(calls[0].format, 'both')
  assert.equal(await main(['--render', 'nested/deck.pptx', '--out', 'chosen'], io), 0)
  assert.equal(calls[1].outputDir, 'chosen')
  await assert.rejects(main(['--check', 'deck.json', '--render', 'deck.pptx'], io), /只能选择一项/)
})

test('all default themes write usable Office font fallbacks and explicit East Asian faces', () => inDir(async dir => {
  for (const theme of ['swiss', 'velvet', 'data', 'soft', 'bold']) {
    const output = await buildDeckAsync({ title: '中文和 English', theme, slides: simple, outputDir: dir, fileName: theme })
    const parts = zipEntries(readFileSync(output.pptxPath)), slide = parts['ppt/slides/slide2.xml'].toString(), scheme = parts['ppt/theme/theme1.xml'].toString()
    assert.ok(slide.includes('已完成第一阶段'))
    assert.ok([...slide.matchAll(/<a:ea typeface="([^"]+)"/g)].length > 0, theme)
    assert.doesNotMatch(scheme, /<a:ea typeface=""/)
    assert.doesNotMatch(slide, /typeface="Space Grotesk"/)
    const chosen = process.platform === 'win32' ? /Microsoft YaHei|SimSun/ : process.platform === 'darwin' ? /PingFang SC|Songti SC/ : /Noto (Sans|Serif) CJK SC/
    assert.match(slide, chosen)
  }
}))

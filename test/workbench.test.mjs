import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { buildDeckAsync, editDeck, undoDeck, readDeckProject } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import * as engine from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { PptWorkbench, installPptWorkbench, PPT_WORKBENCH_ROUTE, PPT_DOWNLOAD_ROUTE } from '../lib/workbench.js'
import { unzipSync, strFromU8 } from 'fflate'
const work = resolve('.test-output'); mkdirSync(work, { recursive: true })
const slides = [{ layout: 'cover', title: '原始封面' }, { layout: 'bullets', title: '行动', bullets: ['保留资料'] }, { layout: 'closing', title: '下一步' }]
async function fixture(run) {
  const dir = mkdtempSync(join(work, 'workbench-'))
  try { const created = await buildDeckAsync({ title: '工程', slides, outputDir: dir }); const wb = new PptWorkbench({ catalogPath: join(dir, 'catalog.jsonl') }); return await run({ dir, created, wb }); }
  finally { assert.ok(dir.startsWith(work)); rmSync(dir, { recursive: true, force: true }); }
}
const request = (body, headers = {}) => new Request('http://dsh.internal' + PPT_WORKBENCH_ROUTE, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dsh-ppt-action': '1', origin: 'http://127.0.0.1:8181', host: '127.0.0.1:8181', ...headers }, body: JSON.stringify(body) })

test('workbench returns both UI languages while preserving slide content and conflict recovery', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 0, edits: [{ slide: 1, patch: { title: '过长的中文标题'.repeat(15) } }] })
  const opened = await wb.action({ operation: 'open', id })
  assert.equal(opened.project.slides[0].title, '过长的中文标题'.repeat(15))
  const finding = opened.project.quality.issues.find(issue => issue.code === 'title-overflow')
  assert.match(finding.message, /标题/)
  assert.match(finding.messageEn, /title/); assert.match(finding.suggestionEn, /Shorten/)
  const response = await wb.fetch(request({ operation: 'edit', id, expectedRevision: 0, slide: opened.project.slides[0].id, patch: { title: '不能覆盖' } }))
  assert.equal(response.status, 409)
  const error = await response.json()
  assert.match(error.message, /输入保留/); assert.match(error.messageEn, /input is preserved/)
  assert.equal(readDeckProject({ deckPath: created.jsonPath }).manifest.slides[0].title, '过长的中文标题'.repeat(15))
}))

test('one atomic edit reorders stable pages and edits content; undo restores both', () => fixture(async ({ created }) => {
  const original = readDeckProject({ deckPath: created.jsonPath }).manifest
  const order = [original.slides[0].id, original.slides[2].id, original.slides[1].id]
  const result = await editDeck({ deckPath: created.jsonPath, expectedRevision: 0, order, edits: [{ slide: original.slides[1].id, patch: { title: '修改后的行动' } }] })
  assert.equal(result.revision, 1); assert.equal(result.undoAvailable, 1)
  assert.deepEqual(readDeckProject({ deckPath: created.jsonPath }).manifest.slides.map(s => s.id), order)
  assert.match(readFileSync(created.htmlPath, 'utf8'), /修改后的行动/)
  await undoDeck({ deckPath: created.jsonPath, expectedRevision: 1 })
  assert.deepEqual(readDeckProject({ deckPath: created.jsonPath }).manifest.slides, original.slides)
}))
test('invalid order cannot lose a page or partially write any artifact', () => fixture(async ({ created }) => {
  const original = readDeckProject({ deckPath: created.jsonPath }).manifest
  const prior = Object.values(created.files).map(p => readFileSync(p))
  for (const order of [[], original.slides.map(() => original.slides[0].id), original.slides.map((s, i) => i ? s.id : 'foreign')]) {
    await assert.rejects(editDeck({ deckPath: created.jsonPath, order, edits: [{ slide: 1, patch: { title: '不能写入' } }] }), /order/)
    Object.values(created.files).forEach((p, i) => assert.deepEqual(readFileSync(p), prior[i]))
  }
}))
test('read-only listing does not create storage; known tools register persistent projects', () => fixture(async ({ dir, created, wb }) => {
  assert.deepEqual(await wb.action({ operation: 'list' }), { ok: true, projects: [] }); assert.equal(existsSync(wb.catalogPath), false)
  await wb.remember(created, {})
  const again = new PptWorkbench({ catalogPath: wb.catalogPath }); const list = await again.action({ operation: 'list' }); assert.equal(list.projects.length, 1)
  const opened = await again.action({ operation: 'open', id: list.projects[0].id })
  assert.equal(opened.project.revision, 0); assert.equal(opened.project.title, '工程'); assert.equal(opened.project.slides.length, 3)
  writeFileSync(join(dir, 'other.json'), '{}')
  await assert.rejects(again.action({ operation: 'open', id: '0'.repeat(64), path: join(dir, 'other.json') }), /索引/)
}))
test('authenticated carrier only; original Host used across HTTP bridge and origin checked', () => fixture(async ({ wb }) => {
  const registrations = []; installPptWorkbench({ inject(deps, fn) { assert.deepEqual(deps, ['connection']); fn({ connection: { fetch: { register(route) { registrations.push(route) } } } }); } }, wb)
  assert.equal(registrations.length, 2); assert.equal(registrations[0].path, PPT_WORKBENCH_ROUTE)
  assert.equal(registrations[1].path, PPT_DOWNLOAD_ROUTE); assert.deepEqual(registrations[1].methods, ['GET']); assert.equal(registrations[1].requestBody, 'buffered')
  assert.equal((await wb.fetch(request({ operation: 'list' }))).status, 200)
  assert.equal((await wb.fetch(request({ operation: 'list' }, { origin: 'https://evil.example' }))).status, 403)
  assert.equal((await wb.fetch(request({ operation: 'list' }, { 'sec-fetch-site': 'cross-site' }))).status, 403)
  assert.equal((await wb.fetch(request({ operation: 'list' }, { 'x-dsh-ppt-action': '' }))).status, 403)
}))
test('attachment downloads return original bytes and refuse stale, unknown and cross-origin requests', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {}); const id = (await wb.action({ operation: 'list' })).projects[0].id
  const download = (kind, revision = 0, headers = {}, selected = id) => wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${selected}&kind=${kind}&revision=${revision}`, { headers: { host: '127.0.0.1:8181', 'sec-fetch-site': 'same-origin', ...headers } }))
  for (const kind of ['html', 'pptx', 'json']) {
    const response = await download(kind); assert.equal(response.status, 200)
    assert.match(response.headers.get('content-disposition'), /^attachment;/)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), readFileSync(created.files[kind]))
  }
  assert.equal((await download('pptx', 0, { origin: 'http://127.0.0.1:8182' })).status, 403)
  assert.equal((await download('pptx', 0, { 'sec-fetch-site': 'cross-site' })).status, 403)
  assert.equal((await download('env')).status, 400)
  assert.equal((await download('pptx', 0, {}, '0'.repeat(64))).status, 400)
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 0, edits: [{ slide: 1, patch: { title: '新版本' } }] })
  assert.equal((await download('pptx')).status, 409)
  assert.equal((await download('pptx', 1)).status, 200)
}))
test('delivery ZIP preserves all three artifacts, Unicode names and revision guards', () => fixture(async ({ dir, created, wb }) => {
  await wb.remember(created, {}); const id = (await wb.action({ operation: 'list' })).projects[0].id
  writeFileSync(join(dir, 'private-config.json'), '{"password":"must-not-export"}')
  const download = revision => wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=bundle&revision=${revision}`))
  const response = await download(0)
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'application/zip')
  assert.match(decodeURIComponent(response.headers.get('content-disposition')), /工程-delivery.zip/)
  const entries = unzipSync(new Uint8Array(await response.arrayBuffer()))
  assert.equal(Object.keys(entries).length, 4)
  for (const path of Object.values(created.files)) assert.deepEqual(Buffer.from(entries[path.split(/[\\/]/).pop()]), readFileSync(path))
  assert.match(strFromU8(entries['README.txt']), /Revision: 0/)
  assert.equal(entries['private-config.json'], undefined)
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 0, edits: [{ slide: 1, patch: { title: '最终成品' } }] })
  assert.equal((await download(0)).status, 409)
  const latest = unzipSync(new Uint8Array(await (await download(1)).arrayBuffer()))
  assert.match(strFromU8(latest['README.txt']), /Revision: 1/)
  assert.match(strFromU8(latest[created.files.html.split(/[\\/]/).pop()]), /最终成品/)
  rmSync(created.files.pptx)
  const incomplete = await download(1)
  assert.equal(incomplete.status, 400)
  assert.match((await incomplete.json()).messageEn, /incomplete/)
}))

test('speaker notes download contains every current slide and refuses stale revisions', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const download = revision => wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=notes&revision=${revision}`))
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 0, edits: [{ slide: 1, patch: { notes: '旧的开场讲稿' } }] })
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 1, edits: [{ slide: 1, patch: { notes: '现在的开场讲稿\n保留第二行与 emoji 🐳' } }, { slide: 2, patch: { notes: '逐项说明行动。' } }] })
  const response = await download(2)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /text\/markdown/)
  assert.match(decodeURIComponent(response.headers.get('content-disposition')), /工程-speaker-notes\.md/)
  const notes = await response.text()
  assert.match(notes, /# 工程/)
  assert.match(notes, /## 1\. 原始封面/)
  assert.match(notes, /现在的开场讲稿\n保留第二行与 emoji 🐳/)
  assert.match(notes, /## 2\. 行动[\s\S]*逐项说明行动。/)
  assert.match(notes, /## 3\. 下一步/)
  assert.doesNotMatch(notes, /旧的开场讲稿/)
  assert.equal((await download(1)).status, 409)
  assert.equal(readDeckProject({ deckPath: created.jsonPath }).manifest.revision, 2)
}))

test('share ZIP includes current presentation and notes, omits the project and removes its offline download control', () => fixture(async ({ dir, created, wb }) => {
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 0, edits: [{ slide: 1, patch: { notes: '当前讲稿，仅本次合成验收。' } }] })
  writeFileSync(join(dir, 'private-config.json'), '{"password":"synthetic-do-not-export"}')
  const before = Object.values(created.files).map(path => readFileSync(path))
  const download = revision => wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=share&revision=${revision}`))
  assert.equal((await download(0)).status, 409)
  const response = await download(1); assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'application/zip')
  assert.match(decodeURIComponent(response.headers.get('content-disposition')), /工程-share\.zip/)
  const entries = unzipSync(new Uint8Array(await response.arrayBuffer())), filename = path => path.split(/[\\/]/).pop()
  assert.deepEqual(Object.keys(entries).sort(), [filename(created.files.pptx), filename(created.files.html), '工程-speaker-notes.md', 'README.txt'].sort())
  assert.deepEqual(Buffer.from(entries[filename(created.files.pptx)]), readFileSync(created.files.pptx))
  assert.match(strFromU8(entries['工程-speaker-notes.md']), /当前讲稿/)
  assert.equal(entries[filename(created.files.json)], undefined); assert.equal(entries['private-config.json'], undefined)
  assert.doesNotMatch(strFromU8(entries[filename(created.files.html)]), /id="download-project"/)
  assert.match(strFromU8(entries[filename(created.files.html)]), /id="download-pptx"/)
  assert.match(strFromU8(entries['README.txt']), /Revision: 1/)
  Object.values(created.files).forEach((path,index) => assert.deepEqual(readFileSync(path), before[index], 'Download must not rewrite the original artifacts'))
  assert.match(readFileSync(created.files.html, 'utf8'), /id="download-project"/)
}))

test('a malformed project link in an externally changed HTML cannot produce a misleading share archive', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {}); const id = (await wb.action({ operation: 'list' })).projects[0].id
  writeFileSync(created.files.html, '<html><body><a id="download-project" href="./project.json">broken control')
  const response = await wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=share&revision=0`))
  assert.equal(response.status, 400); assert.match((await response.json()).messageEn, /project download control/)
}))

test('empty speaker-note guidance follows the deck language without translating authored content', () => fixture(async ({ dir, wb }) => {
  for (const lang of ['en', 'bilingual']) {
    const deck = await buildDeckAsync({ title: 'Notes ' + lang, slides: [{ layout: 'cover', title: 'Original title', notes: '保留用户写的中文备注' }, { layout: 'closing', title: 'Next' }], lang, outputDir: dir })
    await wb.remember(deck, {})
    const id = (await wb.action({ operation: 'list' })).projects.find(row => row.title === 'Notes ' + lang).id
    const response = await wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=notes&revision=0`))
    assert.equal(response.status, 200)
    const notes = await response.text()
    assert.match(notes, /保留用户写的中文备注/)
    assert.match(notes, /No speaker notes for this slide/)
    if (lang === 'bilingual') assert.match(notes, /本页未填写演讲备注/)
    else assert.doesNotMatch(notes, /本页未填写演讲备注/)
  }
}))
test('stale operator save is refused without overwriting files; path patches cannot read files', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {}); const id = (await wb.action({ operation: 'list' })).projects[0].id
  const slide = (await wb.action({ operation: 'open', id })).project.slides[0].id
  await editDeck({ deckPath: created.jsonPath, edits: [{ slide: 2, patch: { title: '另一人修改' } }], expectedRevision: 0 })
  const stale = await wb.fetch(request({ operation: 'edit', id, expectedRevision: 0, slide, patch: { title: '过期编辑' } })); assert.equal(stale.status, 409)
  assert.equal(readDeckProject({ deckPath: created.jsonPath }).manifest.slides[0].title, '原始封面')
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 1, slide, patch: { image: { src: 'C:/secret.png' } } }), /面板上传/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 1, slide, patch: { assetPath: 'file' } }), /不支持/)
}))
test('operator image replacement is embedded; undo and three download kinds retain content', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {}); const id = (await wb.action({ operation: 'list' })).projects[0].id
  const slide = (await wb.action({ operation: 'open', id })).project.slides[1].id
  const data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVcoAAAAASUVORK5CYII='
  const edited = await wb.action({ operation: 'edit', id, expectedRevision: 0, slide, patch: { image: { src: data, alt: '合成样例', fit: 'contain' } } })
  assert.equal(edited.project.slides[1].layout, 'image-right'); assert.equal(Object.values(edited.project.assets)[0].data, data)
  for (const kind of ['html', 'pptx', 'json']) { const value = await wb.action({ operation: 'download', id, kind }); assert.deepEqual(Buffer.from(value.data, 'base64'), readFileSync(created.files[kind])); }
  const undone = await wb.action({ operation: 'undo', id, expectedRevision: 1 }); assert.equal(undone.project.slides[1].image, undefined)
}))
test('render preview invalidates when PPTX content or project revision changes', () => fixture(async ({ created, dir, wb }) => {
  const pngPath = join(dir, 'page.png'); writeFileSync(pngPath, Buffer.from('89504e470d0a1a0a', 'hex'))
  const { createHash } = await import('node:crypto'); const sha = () => createHash('sha256').update(readFileSync(created.pptxPath)).digest('hex')
  const rendered = new PptWorkbench({ catalogPath: wb.catalogPath, loadEngine: async () => ({ ...engine, renderDeck: async () => ({ ok: true, pngPaths: [pngPath], sourceSha256: sha(), missingFonts: ['Missing font'] }) }) })
  await rendered.remember(created, {}); const id = (await rendered.action({ operation: 'list' })).projects[0].id
  const result = await rendered.action({ operation: 'render', id, expectedRevision: 0 }); assert.equal(result.project.render.pageCount, 1)
  assert.deepEqual(result.project.render.missingFonts, ['Missing font']); assert.match((await rendered.action({ operation: 'page', id, page: 1 })).data, /^data:image\/png/)
  const originalPptx = readFileSync(created.pptxPath)
  writeFileSync(created.pptxPath, Buffer.from('changed PPTX'))
  await assert.rejects(rendered.action({ operation: 'page', id, page: 1 }), /先渲染/)
  writeFileSync(created.pptxPath, originalPptx)
  const slide = result.project.slides[0].id
  const changed = await rendered.action({ operation: 'edit', id, expectedRevision: 0, slide, patch: { title: '新修订' } }); assert.equal(changed.project.render, null)
  await assert.rejects(rendered.action({ operation: 'page', id, page: 1 }), /先渲染/)
}))

test('workbench client keeps keyboard shortcuts, dirty guard and retry affordance', () => {
  const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  for (const marker of [
    'handleShortcut', 'dsh-ppt-shortcut', 'beforeunload', 'badge-dirty', '复制示例', 'aria-busy', 'Ctrl/⌘+S',
    'StyleStudioPanel', 'SlideArchetypeEditor', 'PPT_LAYOUT_CATALOG', 'PPT_CHROME_SKELETONS', 'Master Skeleton', '母版骨架',
    'consulting-classic', 'keynote-spatial', 'editorial-folio', 'saas-bento', 'academic-minimal', 'gov-ceremonial',
    'gantt', 'architecture', 'harvey', 'tam', 'org', 'marimekko', 'sankey', 'swot', 'value-chain', 'formula',
    'absorb-upload', 'import-pptx', 'recommendedChrome', 'extractedSkeleton', 'slideSkeleton',
    'ppt-split-preview', 'ppt-canvas-visual-diff', 'ppt-issue-row',
    '导入 PPTX 翻新', 'Import & Modernize .pptx', '导入 Office 修改稿', 'Sync Edited .pptx',
    '下载演讲讲义 (.md)', 'Download Handout', '双屏演讲者提词台', 'Dual-Screen Presenter View',
  ]) {
    assert.ok(source.includes(marker), marker + ' missing from workbench client')
  }
})

test('catalog caches theme/slideCount/revision and open exposes 24 daylight and dark themes + 8 master presets', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {})
  const list = await wb.action({ operation: 'list' })
  assert.equal(list.projects[0].theme, 'data')
  assert.equal(list.projects[0].slideCount, 3)
  assert.equal(list.projects[0].revision, 0)
  const opened = await wb.action({ operation: 'open', id: list.projects[0].id })
  assert.equal(opened.project.theme, 'data')
  assert.equal(opened.project.brand, null)
  assert.equal(opened.project.themes.length, 24)
  assert.equal(opened.project.themes.filter(t => !t.dark).length, 16)
  assert.equal(opened.project.themes.filter(t => t.dark).length, 8)
  assert.equal(opened.project.presets.length, 8)
}))

test('workbench edits structured archetypes, tables, deck theme/brand, and starter slide append with undo', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const initial = (await wb.action({ operation: 'open', id })).project
  const bodySlideId = initial.slides[1].id

  const kpiUpdated = await wb.action({
    operation: 'edit',
    id,
    expectedRevision: 0,
    slide: bodySlideId,
    patch: {
      layout: 'kpi',
      variant: 'grid',
      title: '核心经营指标稳步提升',
      takeaway: '三大指标全部超越季度基准',
      source: '来源：运营月报 2026Q3',
      cards: [
        { badge: 'SLA', title: '服务达成率', value: 98.5, unit: '%', delta: '+4.2%', tone: 'positive' },
        { tag: 'EFF', title: '处理效率', value: '2.4x', delta: '核验通过', status: 'accent' },
      ],
      visual: { titleSize: 32, bodySize: 18, density: 'compact' },
    },
  })
  const updatedSlide = kpiUpdated.project.slides[1]
  assert.equal(updatedSlide.layout, 'kpi')
  assert.equal(updatedSlide.takeaway, '三大指标全部超越季度基准')
  assert.equal(updatedSlide.source, '来源：运营月报 2026Q3')
  assert.equal(updatedSlide.items.length, 2)
  assert.equal(updatedSlide.items[0].tag, 'SLA')
  assert.equal(updatedSlide.items[0].value, '98.5')
  assert.equal(updatedSlide.items[0].status, 'positive')
  assert.equal(updatedSlide.visual.density, 'compact')

  const tableUpdated = await wb.action({
    operation: 'edit',
    id,
    expectedRevision: 1,
    slide: bodySlideId,
    patch: {
      layout: 'table',
      tableStyle: 'booktabs',
      rows: [['指标', 'Q2', 'Q3'], ['达成率', '94.3%', '98.5%']],
    },
  })
  assert.equal(tableUpdated.project.slides[1].layout, 'table')
  assert.equal(tableUpdated.project.slides[1].tableStyle, 'booktabs')
  assert.deepEqual(tableUpdated.project.slides[1].rows[1], ['达成率', '94.3%', '98.5%'])

  const styled = await wb.action({
    operation: 'edit',
    id,
    expectedRevision: 2,
    theme: 'consulting',
    brand: { name: 'Acme Advisory', primaryColor: '#0057b8', fontFamily: 'Microsoft YaHei', footer: 'Internal Review', chromeStyle: 'academic-minimal' },
  })
  assert.equal(styled.project.theme, 'consulting')
  assert.equal(styled.project.brand.primaryColor, '#0057B8')
  assert.equal(styled.project.brand.footer, 'Internal Review')
  assert.equal(styled.project.brand.chromeStyle, 'academic-minimal')
  assert.equal((await wb.action({ operation: 'list' })).projects[0].theme, 'consulting')

  const ganttEdited = await wb.action({
    operation: 'edit',
    id,
    expectedRevision: 3,
    slide: bodySlideId,
    patch: {
      layout: 'gantt',
      variant: 'quarters',
      chrome: 'editorial-folio',
      columns: ['Q1', 'Q2', 'Q3', 'Q4'],
      items: [
        { tag: 'Core', title: 'Platform rollout', start: 0, span: 2, status: 'accent' },
        { tag: 'GA', title: 'Release gate', start: 2, span: 0, milestone: true, status: 'positive' },
      ],
    },
  })
  assert.equal(ganttEdited.project.slides[1].layout, 'gantt')
  assert.equal(ganttEdited.project.slides[1].chrome, 'editorial-folio')
  assert.deepEqual(ganttEdited.project.slides[1].columns, ['Q1', 'Q2', 'Q3', 'Q4'])
  assert.equal(ganttEdited.project.slides[1].items[0].start, 0)
  assert.equal(ganttEdited.project.slides[1].items[0].span, 2)
  assert.equal(ganttEdited.project.slides[1].items[1].milestone, true)

  const harveyEdited = await wb.action({
    operation: 'edit',
    id,
    expectedRevision: 4,
    slide: bodySlideId,
    patch: {
      layout: 'harvey',
      tableStyle: 'harvey',
      rows: [['Capability', 'Ours', 'Peer'], ['Speed', '●', '◑']],
    },
  })
  assert.equal(harveyEdited.project.slides[1].layout, 'harvey')
  assert.equal(harveyEdited.project.slides[1].tableStyle, 'harvey')

  const appended = await wb.action({ operation: 'append', id, expectedRevision: 5, archetype: 'architecture' })
  assert.equal(appended.project.slides.length, 4)
  assert.equal(appended.project.slides[3].layout, 'architecture')
  assert.equal(appended.selected, appended.project.slides[3].id)
  assert.equal((await wb.action({ operation: 'list' })).projects[0].slideCount, 4)

  const undone = await wb.action({ operation: 'undo', id, expectedRevision: 6 })
  assert.equal(undone.project.slides.length, 3)
}))

test('absorb-upload parses in-memory PPTX bytes for 1-click apply and blocks host path or malformed inputs', () => fixture(async ({ dir, created, wb }) => {
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const slide = (await wb.action({ operation: 'open', id })).project.slides[1].id
  const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVcoAAAAASUVORK5CYII='
  const refDir = join(dir, 'ref')
  mkdirSync(refDir, { recursive: true })
  const refDeck = await buildDeckAsync({
    title: 'Corporate Ref',
    theme: 'consulting',
    brand: { name: 'RefCorp', primaryColor: '#1E3A8A', fontFamily: 'Microsoft YaHei', logo },
    slides: [{ layout: 'cover', title: 'Reference Cover' }],
    outputDir: refDir,
  })
  const pptxDataUrl = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + readFileSync(refDeck.pptxPath).toString('base64')

  const absorbedRes = await wb.action({ operation: 'absorb-upload', id, expectedRevision: 0, data: pptxDataUrl })
  assert.equal(absorbedRes.ok, true)
  assert.equal(absorbedRes.absorbed.slideCount, 1)
  assert.equal(absorbedRes.absorbed.extractedPalette.accent1, '#1E3A8A')
  assert.match(absorbedRes.absorbed.sanitizedBrand.logo, /^data:image\/png;base64,/)
  assert.ok(typeof absorbedRes.absorbed.recommendedTheme === 'string' && absorbedRes.absorbed.recommendedTheme.length > 0)
  assert.ok(typeof absorbedRes.absorbed.recommendedChrome === 'string' && absorbedRes.absorbed.recommendedChrome.length > 0)
  assert.ok(absorbedRes.absorbed.extractedSkeleton && typeof absorbedRes.absorbed.extractedSkeleton === 'object')
  assert.ok(Array.isArray(absorbedRes.absorbed.slideSkeleton) && absorbedRes.absorbed.slideSkeleton.length === 1)

  const beforeFiles = Object.values(created.files).map(p => readFileSync(p))
  await assert.rejects(wb.action({ operation: 'absorb-upload', id, expectedRevision: 0, pptxPath: refDeck.pptxPath, data: pptxDataUrl }), /面板上传/)
  await assert.rejects(wb.action({ operation: 'absorb-upload', id, expectedRevision: 0, path: refDeck.pptxPath, data: pptxDataUrl }), /面板上传/)
  const badPptx = await wb.fetch(request({ operation: 'absorb-upload', id, expectedRevision: 0, data: Buffer.from('not-a-zip-archive-payload'.repeat(8)).toString('base64') }))
  assert.equal(badPptx.status, 400)
  assert.match((await badPptx.json()).messageEn, /reference PPTX/i)

  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 0, referencePptx: refDeck.pptxPath }), /面板上传/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 0, brand: { logo: 'C:/secret.png' } }), /面板上传/)
  const badBrand = await wb.fetch(request({ operation: 'edit', id, expectedRevision: 0, brand: { fontFamily: 'Bad"; url(x)' } }))
  assert.equal(badBrand.status, 400)
  assert.match((await badBrand.json()).messageEn, /Invalid brand settings/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 0, slide, patch: { layout: 'unknown-layout' } }), /版式名称无效/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 0, slide, patch: { tableStyle: 'rainbow' } }), /表格样式无效/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 0, slide, patch: { items: [{ title: 'x', src: 'C:/secret.png' }] } }), /结构化卡片内容无效/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 0, slide, patch: { items: [], cards: [] } }), /结构化卡片内容无效/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 0, slide, patch: { rows: [['A', 'B'], ['only-one']] } }), /表格内容/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 0, slide, patch: { visual: { titleSize: 99 } } }), /排版设置无效/)
  Object.values(created.files).forEach((p, i) => assert.deepEqual(readFileSync(p), beforeFiles[i]))

  const applied = await wb.action({
    operation: 'edit',
    id,
    expectedRevision: 0,
    theme: absorbedRes.absorbed.recommendedTheme,
    brand: absorbedRes.absorbed.sanitizedBrand,
  })
  assert.equal(applied.project.theme, absorbedRes.absorbed.recommendedTheme)
  assert.equal(applied.project.brand.primaryColor, absorbedRes.absorbed.sanitizedBrand.primaryColor)
  assert.equal(Object.values(applied.project.assets).length, 1)
}))

test('workbench starterSlide append supports all 5 Phase-3 pro diagrams (gantt, architecture, harvey, tam, org)', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  let rev = 0
  for (const [archetype, check] of [
    ['gantt', s => { assert.deepEqual(s.columns, ['Q1', 'Q2', 'Q3', 'Q4']); assert.equal(s.items.length, 3); assert.equal(s.items[2].milestone, true) }],
    ['architecture', s => { assert.equal(s.variant, 'layered'); assert.equal(s.items.length, 4); assert.equal(s.items[3].status, 'accent') }],
    ['harvey', s => { assert.equal(s.tableStyle, 'harvey'); assert.ok(s.rows.length >= 3); assert.ok(s.rows[1].includes('●')) }],
    ['tam', s => { assert.equal(s.variant, 'concentric'); assert.deepEqual(s.items.map(i => i.tag), ['TAM', 'SAM', 'SOM']) }],
    ['org', s => { assert.equal(s.variant, 'tree'); assert.equal(s.items.length, 4); assert.ok(s.items[0].role) }],
  ]) {
    const res = await wb.action({ operation: 'append', id, expectedRevision: rev++, archetype })
    const appended = res.project.slides.at(-1)
    assert.equal(appended.layout, archetype)
    check(appended)
  }
}))

test('workbench patch validates chrome, brand.chromeStyle null reset, fractional gantt spans, and invalid bounds', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const slideId = (await wb.action({ operation: 'open', id })).project.slides[1].id

  const setChrome = await wb.action({ operation: 'edit', id, expectedRevision: 0, brand: { chromeStyle: 'keynote-spatial' } })
  assert.equal(setChrome.project.brand.chromeStyle, 'keynote-spatial')
  const clearedChrome = await wb.action({ operation: 'edit', id, expectedRevision: 1, brand: { chromeStyle: null } })
  assert.equal(clearedChrome.project.brand?.chromeStyle, undefined)

  const fracGantt = await wb.action({
    operation: 'edit',
    id,
    expectedRevision: 2,
    slide: slideId,
    patch: {
      layout: 'gantt',
      chrome: 'consulting-classic',
      columns: ['W1', 'W2', 'W3', 'W4'],
      items: [{ tag: 'Prep', title: 'Discovery', start: 0.5, span: 1.5 }, { tag: 'Gate', title: 'Freeze', start: 3, span: 0, milestone: true }],
    },
  })
  assert.equal(fracGantt.project.slides[1].chrome, 'consulting-classic')
  assert.equal(fracGantt.project.slides[1].items[0].start, 0.5)
  assert.equal(fracGantt.project.slides[1].items[0].span, 1.5)
  assert.equal(fracGantt.project.slides[1].items[1].span, 0)

  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 3, brand: { chromeStyle: 'unknown-chrome' } }), /母版骨架/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 3, slide: slideId, patch: { chrome: 'unknown-chrome' } }), /母版骨架/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 3, slide: slideId, patch: { columns: [] } }), /甘特图列头无效/)
  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: 3, slide: slideId, patch: { items: [{ title: 'Bad', span: -1 }] } }), /结构化卡片内容无效/)
}))

test('Style Studio bundle includes 6-Chrome Master Skeleton picker, 24 layouts, master presets, and self-service create wizard UI', () => {
  const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  for (const label of [
    '麦肯锡直角', 'Apple 空间留白', '杂志社论书脊', '黑曜石 Bento', '学术顶栏横幅', '东方政务双线',
    'brand-chrome', '哈维球矩阵', 'Harvey balls', '时间轴列头', 'extractedSkeleton', 'recommendedChrome',
    '价值链箭头', '新建演示文稿', '名家范本一键直吸', '我的已收藏企业品牌',
  ]) {
    assert.ok(bundle.includes(label), label + ' missing from Style Studio bundle')
  }
})

test('workbench catalog-meta, chevron starterSlide, and self-service create wizard work without exposing host paths', () => fixture(async ({ dir, wb }) => {
  const meta = await wb.action({ operation: 'catalog-meta' })
  assert.equal(meta.ok, true)
  assert.equal(meta.themes.length, 24)
  assert.equal(meta.templates.length, 20)
  assert.equal(meta.presets.length, 8)

  // Self-service create from blueprint
  const fromBlueprint = await wb.action({
    operation: 'create',
    title: '2026 Q4 OKR 复盘',
    template: 'quarterly-okr',
    theme: 'auto',
    lang: 'zh',
  })
  assert.equal(fromBlueprint.ok, true)
  assert.equal(fromBlueprint.project.title, '2026 Q4 OKR 复盘')
  assert.ok(fromBlueprint.project.slides.length >= 4)

  // Append chevron slide
  const withChevron = await wb.action({
    operation: 'append',
    id: fromBlueprint.project.id,
    expectedRevision: fromBlueprint.project.revision,
    archetype: 'chevron',
  })
  assert.equal(withChevron.project.slides.at(-1).layout, 'process')
  assert.equal(withChevron.project.slides.at(-1).variant, 'chevron')

  // Self-service create from Markdown + uploaded referencePptxData + cloneStructure
  const refDir = join(dir, 'wizard-ref')
  mkdirSync(refDir, { recursive: true })
  const refBuilt = await buildDeckAsync({
    title: 'Ref Wizard',
    theme: 'bcg-emerald',
    slides: [
      { layout: 'cover', title: 'Ref Cover' },
      { layout: 'kpi', title: 'Ref KPI', items: [{ value: '99%', title: 'SLA' }, { value: '2.4x', title: 'ROI' }] },
      { layout: 'chevron', title: 'Ref Chain', items: [{ tag: '01', title: 'Step A' }, { tag: '02', title: 'Step B' }, { tag: '03', title: 'Step C' }] },
    ],
    outputDir: refDir,
  })
  const refDataUrl = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + readFileSync(refBuilt.pptxPath).toString('base64')
  const fromRef = await wb.action({
    operation: 'create',
    title: '复刻风格汇报',
    content: '# 复刻风格汇报\n\n## 核心达成指标\n- 交付准时率 99.2%\n- 研发人效提升 38%\n\n## 业务流转环节\n- **需求评审**：统一入口\n- **自动集成**：门禁扫描\n- **灰度发布**：秒级回滚',
    referencePptxData: refDataUrl,
    cloneStructure: true,
  })
  assert.equal(fromRef.ok, true)
  assert.equal(fromRef.project.slides[1].layout, 'kpi')

  // Host path attempts must be rejected
  await assert.rejects(wb.action({ operation: 'create', title: 'Bad', referencePptx: refBuilt.pptxPath }), /面板/)
  await assert.rejects(wb.action({ operation: 'create', title: 'Bad', outputDir: refDir }), /面板/)
}))

test('workbench Phase-4 layouts (marimekko, sankey, swot, value-chain), LaTeX formula patch, handout download, and import-pptx security guards', () => fixture(async ({ dir, created, wb }) => {
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const slideId = (await wb.action({ operation: 'open', id })).project.slides[1].id

  const formulaEdited = await wb.action({
    operation: 'edit',
    id,
    expectedRevision: 0,
    slide: slideId,
    patch: {
      layout: 'callout',
      variant: 'formula',
      title: '均方误差目标函数',
      formula: '\\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2',
    },
  })
  assert.equal(formulaEdited.project.slides[1].formula, '\\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2')

  let rev = 1
  for (const [archetype, check] of [
    ['marimekko', s => { assert.ok(Array.isArray(s.rows) && s.rows.length >= 3) }],
    ['sankey', s => { assert.ok(Array.isArray(s.items) && s.items.length >= 4) }],
    ['swot', s => { assert.equal(s.items.length, 4) }],
    ['value-chain', s => { assert.equal(s.items.length, 6) }],
  ]) {
    const res = await wb.action({ operation: 'append', id, expectedRevision: rev++, archetype })
    const appended = res.project.slides.at(-1)
    assert.equal(appended.layout, archetype)
    check(appended)
  }

  // Handout download via POST action & GET fetchDownload
  const handoutAction = await wb.action({ operation: 'download', id, kind: 'handout' })
  assert.equal(handoutAction.ok, true)
  assert.match(handoutAction.name, /\.handout\.md$/)
  const handoutText = Buffer.from(handoutAction.data, 'base64').toString('utf8')
  assert.match(handoutText, /# 工程/)

  const handoutGet = await wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=handout&revision=${rev}`))
  assert.equal(handoutGet.status, 200)
  assert.match(handoutGet.headers.get('content-type'), /text\/markdown/)
  assert.match(decodeURIComponent(handoutGet.headers.get('content-disposition')), /\.handout\.md/)

  // Host paths and malformed payloads must be blocked on import-pptx
  const validData = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + readFileSync(created.pptxPath).toString('base64')
  await assert.rejects(wb.action({ operation: 'import-pptx', pptxPath: created.pptxPath, data: validData }), /面板上传/)
  await assert.rejects(wb.action({ operation: 'import-pptx', path: created.pptxPath, data: validData }), /面板上传/)
  await assert.rejects(wb.action({ operation: 'import-pptx', outputDir: dir, data: validData }), /面板上传/)
  await assert.rejects(wb.action({ operation: 'import-pptx', data: Buffer.from('not-zip'.repeat(30)).toString('base64') }), /24 MiB/)
}))

test('workbench import-pptx Mode A (new modernized project) and Mode B (sync edited .pptx into existing project with undo)', () => fixture(async ({ dir, created, wb }) => {
  // Mode A: import legacy .pptx without project id -> creates and indexes new project
  const legacyDir = join(dir, 'legacy')
  mkdirSync(legacyDir, { recursive: true })
  const legacyDeck = await buildDeckAsync({
    title: 'Legacy Q3 Review',
    theme: 'data',
    slides: [
      { layout: 'cover', title: 'Legacy Q3 Review', subtitle: 'Operations Team' },
      { layout: 'bullets', title: 'Revenue grew 28%', bullets: ['**Cloud ARR**: $42M (+28% YoY)', '**Gross Margin**: 74%'], notes: 'Emphasize cloud mix shift.' },
      { layout: 'table', title: 'Regional Breakdown', rows: [['Region', 'Revenue', 'YoY'], ['East', '18M', '+31%'], ['West', '24M', '+26%']] },
    ],
    outputDir: legacyDir,
  })
  const pptxData = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + readFileSync(legacyDeck.pptxPath).toString('base64')
  const imported = await wb.action({ operation: 'import-pptx', data: pptxData, modernize: true, preserveSourceTheme: false, theme: 'consulting' })
  assert.equal(imported.ok, true)
  assert.equal(imported.created, true)
  assert.equal(imported.project.slides.length, 3)
  assert.equal(imported.project.theme, 'consulting')

  // Mode B: sync Office-edited .pptx into existing project -> updates slides & supports undo
  const editedDir = join(dir, 'edited')
  mkdirSync(editedDir, { recursive: true })
  const editedDeck = await buildDeckAsync({
    title: 'Synced Q3 Review',
    slides: [
      { layout: 'cover', title: 'Synced Cover Title', subtitle: 'Updated in Office' },
      { layout: 'bullets', title: 'Updated Metric Slide', bullets: ['**ARR**: $48M (+34% YoY)'] },
    ],
    outputDir: editedDir,
  })
  const editedData = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + readFileSync(editedDeck.pptxPath).toString('base64')
  const synced = await wb.action({
    operation: 'import-pptx',
    id: imported.project.id,
    expectedRevision: imported.project.revision,
    data: editedData,
    modernize: true,
  })
  assert.equal(synced.ok, true)
  assert.equal(synced.syncedProject, true)
  assert.equal(synced.project.slides.length, 2)
  assert.equal(synced.project.slides[0].title, 'Synced Cover Title')
  assert.ok(synced.project.undoAvailable >= 1)

  const undone = await wb.action({ operation: 'undo', id: imported.project.id, expectedRevision: synced.project.revision })
  assert.equal(undone.project.slides.length, 3)
}))

test('editorHtml click-to-focus maps Phase-4 layout and math targets (.deck-math, .mekko-col, .sankey-svg, .swot-quad, .porter-beam)', () => {
  const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  for (const selector of ['.deck-math', '.formula-plate', '.callout-formula', '.mekko-col', '.sankey-node', '.sankey-svg', '.swot-quad', '.porter-beam']) {
    assert.ok(source.includes(selector), selector + ' click-to-focus selector missing')
  }
  assert.match(source, /n\.matches\('\.deck-math,\.formula-plate,\.callout-formula'\)\?'formula'/)
  assert.match(source, /n\.matches\('table,\.mekko-col'\)\?'rows'/)
  assert.match(source, /n\.matches\('\.sankey-node,\.sankey-svg,\.swot-quad,\.porter-beam,/)
})

test('workbench GET fetchDownload kind=handout returns speaker handout headers and rejects stale revisions', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  await editDeck({ deckPath: created.jsonPath, expectedRevision: 0, edits: [{ slide: 2, patch: { notes: 'Key handout cue for executives.' } }] })

  const okRes = await wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=handout&revision=1`))
  assert.equal(okRes.status, 200)
  assert.match(okRes.headers.get('content-type'), /text\/markdown/)
  assert.match(decodeURIComponent(okRes.headers.get('content-disposition')), /\.handout\.md/)
  const md = await okRes.text()
  assert.match(md, /Key handout cue for executives\./)

  const staleRes = await wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=handout&revision=0`))
  assert.equal(staleRes.status, 409)
}))

test('workbench import-pptx supports preserveSourceTheme=true vs modernize=true theme selection', () => fixture(async ({ dir, wb }) => {
  const srcDir = join(dir, 'src-brand')
  mkdirSync(srcDir, { recursive: true })
  const branded = await buildDeckAsync({
    title: 'Corporate Branded Deck',
    theme: 'consulting',
    brand: { name: 'CorpBrand', primaryColor: '#1E3A8A', backgroundColor: '#FFFFFF', textColor: '#0F172A' },
    slides: [
      { layout: 'cover', title: 'Corporate Branded Deck', subtitle: '2026 Plan' },
      { layout: 'bullets', title: 'Focus Areas', bullets: ['**Growth**: +30% YoY'] },
    ],
    outputDir: srcDir,
  })
  const pptxData = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + readFileSync(branded.pptxPath).toString('base64')

  const preserved = await wb.action({ operation: 'import-pptx', data: pptxData, preserveSourceTheme: true, modernize: true })
  assert.equal(preserved.ok, true)
  assert.equal(preserved.project.brand?.primaryColor, '#1E3A8A')

  const modernized = await wb.action({ operation: 'import-pptx', data: pptxData, preserveSourceTheme: false, modernize: true, theme: 'bcg-emerald' })
  assert.equal(modernized.ok, true)
  assert.equal(modernized.project.theme, 'bcg-emerald')
}))

test('workbench create-demo generates flagship showcase deck in 0 LLM calls with paceBudget & downloads (onepager + remotion)', () => fixture(async ({ wb }) => {
  const demo = await wb.action({ operation: 'create-demo', lang: 'zh' })
  assert.equal(demo.ok, true)
  assert.equal(demo.created, true)
  assert.equal(demo.demo, true)
  assert.ok(demo.project.slides.length >= 8)
  const layouts = new Set(demo.project.slides.map(s => s.layout))
  for (const required of ['cover', 'kpi', 'architecture', 'gantt', 'sankey', 'marimekko', 'callout', 'closing']) {
    assert.ok(layouts.has(required), `demo missing layout ${required}`)
  }
  assert.ok(demo.project.slides.some(s => s.layout === 'callout' && s.formula), 'demo includes native math formula slide')
  assert.ok(demo.project.paceBudget && typeof demo.project.paceBudget.estimatedMinutes === 'number')

  // Reject host path keys on create-demo
  await assert.rejects(wb.action({ operation: 'create-demo', outputDir: 'C:/tmp' }), /面板/)

  // Download One-Pager HTML via POST & GET
  const id = demo.project.id
  const rev = demo.project.revision
  const opPost = await wb.action({ operation: 'download', id, kind: 'onepager' })
  assert.equal(opPost.ok, true)
  assert.match(opPost.name, /-onepager\.html$/)
  assert.match(Buffer.from(opPost.data, 'base64').toString('utf8'), /<!doctype html>/i)

  const opGet = await wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=onepager&revision=${rev}`))
  assert.equal(opGet.status, 200)
  assert.match(opGet.headers.get('content-type'), /text\/html/)
  assert.match(decodeURIComponent(opGet.headers.get('content-disposition')), /-onepager\.html/)

  // Download Remotion storyboard ZIP via POST & GET
  const remPost = await wb.action({ operation: 'download', id, kind: 'remotion' })
  assert.equal(remPost.ok, true)
  assert.match(remPost.name, /-remotion\.zip$/)
  const remFiles = unzipSync(new Uint8Array(Buffer.from(remPost.data, 'base64')))
  for (const f of ['remotion-storyboard.json', 'src/DeckVideo.tsx', 'src/slides-data.json', 'README.md']) {
    assert.ok(remFiles[f], `Remotion zip missing ${f}`)
  }

  const remGet = await wb.fetchDownload(new Request('http://dsh.internal' + PPT_DOWNLOAD_ROUTE + `?id=${id}&kind=remotion&revision=${rev}`))
  assert.equal(remGet.status, 200)
  assert.equal(remGet.headers.get('content-type'), 'application/zip')
  assert.match(decodeURIComponent(remGet.headers.get('content-disposition')), /-remotion\.zip/)
}))

test('workbench import-office enforces upload-only security guards, validates file types, and delegates to importOfficeDeck', () => fixture(async ({ dir, created, wb }) => {
  const csvData = 'data:text/csv;base64,' + Buffer.from('Segment,Revenue,Share\nEnterprise,450,42%\nFinancial,320,35%\n', 'utf8').toString('base64')
  await assert.rejects(wb.action({ operation: 'import-office', filePath: 'C:/secret.csv', fileName: 'a.csv', data: csvData }), /面板/)
  await assert.rejects(wb.action({ operation: 'import-office', outputDir: dir, fileName: 'a.csv', data: csvData }), /面板/)
  await assert.rejects(wb.action({ operation: 'import-office', fileName: 'bad.exe', data: csvData }), /24 MiB/)
  await assert.rejects(wb.action({ operation: 'import-office', fileName: 'bad.xlsx', data: csvData }), /24 MiB/)

  let capturedOpts = null
  const customWb = new PptWorkbench({
    catalogPath: join(dir, 'office-cat.jsonl'),
    loadEngine: async () => ({
      ...engine,
      importOfficeDeck: async (opts) => {
        capturedOpts = opts
        assert.ok(existsSync(opts.filePath), 'temp uploaded office file exists during import')
        return created
      },
    }),
  })
  const res = await customWb.action({
    operation: 'import-office',
    fileName: 'metrics.csv',
    data: csvData,
    theme: 'consulting',
    targetMinutes: 12,
  })
  assert.equal(res.ok, true)
  assert.equal(res.imported, true)
  assert.equal(capturedOpts.theme, 'consulting')
  assert.equal(capturedOpts.targetMinutes, 12)
  assert.equal(existsSync(capturedOpts.filePath), false, 'temp uploaded office file cleaned up after import')

  // Real engine import-office end-to-end
  const realOffice = await wb.action({
    operation: 'import-office',
    fileName: 'segment-growth.csv',
    data: csvData,
    theme: 'consulting',
    targetMinutes: 5,
  })
  assert.equal(realOffice.ok, true)
  assert.equal(realOffice.created, true)
  assert.ok(realOffice.project.slides.length >= 3)
  assert.equal(realOffice.project.targetMinutes, 5)
}))

test('workbench Pace Budget & client bundle include Phase-5 tour, Mermaid editor, One-Pager, and Remotion exports', () => fixture(async ({ created, wb }) => {
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const opened = await wb.action({ operation: 'open', id })
  assert.ok(opened.project.paceBudget)
  assert.equal(opened.project.targetMinutes, null)

  // Trigger pace overrun by setting a tight 1-minute target budget
  const tight = await wb.action({ operation: 'edit', id, expectedRevision: 0, targetMinutes: 1 })
  assert.equal(tight.project.paceBudget.slideCount, 3)

  await assert.rejects(wb.action({ operation: 'edit', id, expectedRevision: tight.project.revision, targetMinutes: 999 }), /1–240/)

  const bundle = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  for (const marker of [
    'buildPptTourSteps', '一键体验旗舰示例', 'Load Flagship Demo', '导入 Excel / Word', 'Import Excel / Word',
    '下载高管一页纸 (.html)', '导出 Remotion 视频分镜包 (.zip)', 'Mermaid 流程图 / 时序图', '.deck-mermaid-svg',
    'ppt-pace-card', '演讲节奏预算', 'Speaking Pace Budget',
  ]) {
    assert.ok(bundle.includes(marker), marker + ' missing from built client bundle')
  }
}))

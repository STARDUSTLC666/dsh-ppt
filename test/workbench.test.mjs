import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { buildDeckAsync, editDeck, undoDeck, readDeckProject } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import * as engine from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { PptWorkbench, installPptWorkbench, PPT_WORKBENCH_ROUTE, PPT_DOWNLOAD_ROUTE } from '../lib/workbench.js'
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
  writeFileSync(created.pptxPath, Buffer.from('changed PPTX'))
  await assert.rejects(rendered.action({ operation: 'page', id, page: 1 }), /先渲染/)
  const slide = result.project.slides[0].id
  const changed = await rendered.action({ operation: 'edit', id, expectedRevision: 0, slide, patch: { title: '新修订' } }); assert.equal(changed.project.render, null)
  await assert.rejects(rendered.action({ operation: 'page', id, page: 1 }), /先渲染/)
}))

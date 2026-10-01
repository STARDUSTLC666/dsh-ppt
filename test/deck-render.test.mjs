import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildDeck } from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { renderDeck, readRenderReceipt, RENDERER_VERSION } from '../skills/dsh-ppt/scripts/deck-render.mjs'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE1cAAAAASUVORK5CYII=', 'base64')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-render-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const deck = buildDeck({ title: '渲染验收', outputDir: dir, fileName: 'deck', slides: [{ layout: 'cover', title: '中文标题', subtitle: 'English subtitle' }] })
  return { dir, pptxPath: deck.pptxPath, outputDir: join(dir, '输出'), original: readFileSync(deck.pptxPath) }
}
function loader(hooks = {}) {
  const calls = { dispose: 0, requests: [] }
  return { calls, load: async () => ({ ENGINE_VERSION: RENDERER_VERSION, createConverter: async config => {
    calls.config = config
    return { backend: 'native', dispose: async () => { calls.dispose++; await hooks.dispose?.() },
      renderImages: async (request, signal) => {
        calls.requests.push(request)
        await hooks.images?.(request, signal)
        mkdirSync(request.outputDir)
        const path = join(request.outputDir, 'page-0001.png')
        writeFileSync(path, png)
        return { schemaVersion: 1, backend: 'native', rasterEngine: 'libreoffice', source: 'saved', inputPath: request.inputPath,
          sourceSha256: hash(readFileSync(request.inputPath)), dpi: request.dpi, pageCount: 1, missingFonts: ['Absent Font'],
          images: [{ index: 0, page: 1, path, width: 1, height: 1, rectangle: { x: 0, y: 0, width: 1, height: 1 }, byteLength: png.length }] }
      },
      convert: async (request, signal) => {
        await hooks.pdf?.(request, signal)
        writeFileSync(request.outputPath, '%PDF-1.7\nmock exporter payload\n%%EOF')
        return { backend: 'native', missingFonts: ['Absent Font', 'Other Font'] }
      } }
  } }) }
}

test('missing optional dependency does not create output or change source', async t => {
  const f = fixture(t), result = await renderDeck(f, async () => { throw Object.assign(new Error('not installed'), { code: 'ERR_MODULE_NOT_FOUND' }) })
  assert.equal(result.status, 'unavailable')
  assert.match(result.installationHint, /0\.1\.3/)
  assert.equal(existsSync(f.outputDir), false)
  assert.deepEqual(readFileSync(f.pptxPath), f.original)
})

test('native engine absence is unavailable and never publishes an empty render', async t => {
  const f = fixture(t), result = await renderDeck(f, async () => ({ ENGINE_VERSION: RENDERER_VERSION, createConverter: async () => { throw Object.assign(new Error('engine missing'), { code: 'unavailable' }) } }))
  assert.equal(result.status, 'unavailable')
  assert.equal(existsSync(f.outputDir), false)
})

test('PNG/PDF commit gives verifiable provenance, preserved source, and no visual-pass claim', async t => {
  const f = fixture(t), kit = loader(), result = await renderDeck({ ...f, format: 'both' }, kit.load)
  assert.equal(result.status, 'rendered')
  assert.equal(result.visual, 'not-verified')
  assert.deepEqual(result.missingFonts, ['Absent Font', 'Other Font'])
  assert.equal(kit.calls.dispose, 1)
  assert.ok(Math.abs(kit.calls.requests[0].dpi - 108) < 0.01)
  assert.deepEqual(readFileSync(f.pptxPath), f.original)
  assert.equal(readRenderReceipt(f.pptxPath, result.receiptPath).status, 'rendered')
  const receipt = JSON.parse(readFileSync(result.receiptPath))
  assert.equal(receipt.pngs[0].file, 'pages/page-0001.png')
  const manifest = JSON.parse(readFileSync(join(result.outputDir, 'artifacts/pages/manifest.json')))
  assert.equal(manifest.inputPath, f.pptxPath)
  assert.equal(manifest.images[0].path, result.pngPaths[0])
  assert.deepEqual(readdirSync(result.outputDir), ['artifacts'])
})

test('existing directories are preserved; concurrent renders reserve distinct directories', async t => {
  const f = fixture(t)
  mkdirSync(f.outputDir)
  writeFileSync(join(f.outputDir, 'keep.txt'), 'user output')
  const results = await Promise.all([renderDeck(f, loader().load), renderDeck(f, loader().load)])
  assert.notEqual(results[0].outputDir, results[1].outputDir)
  assert.equal(readFileSync(join(f.outputDir, 'keep.txt'), 'utf8'), 'user output')
  for (const result of results) assert.equal(readRenderReceipt(f.pptxPath, result.receiptPath).ok, true)
})

test('PDF failure rolls back earlier PNGs and waits for engine disposal', async t => {
  const f = fixture(t), failure = new Error('PDF conversion failed'), kit = loader({ pdf: async () => { throw failure } })
  await assert.rejects(renderDeck({ ...f, format: 'both' }, kit.load), error => error === failure)
  assert.equal(existsSync(f.outputDir), false)
  assert.equal(kit.calls.dispose, 1)
  assert.deepEqual(readFileSync(f.pptxPath), f.original)
})

test('cancellation preserves signal.reason and cleans only the fresh job', async t => {
  const f = fixture(t), controller = new AbortController(), reason = new Error('user cancelled')
  const kit = loader({ images: async request => { writeFileSync(join(request.outputDir, '..', 'scratch.bin'), 'partial'); controller.abort(reason); throw reason } })
  await assert.rejects(renderDeck({ ...f, signal: controller.signal }, kit.load), error => error === reason)
  assert.equal(existsSync(f.outputDir), false)
  assert.equal(kit.calls.dispose, 1)
})

test('pre-cancelled calls do not load the dependency', async t => {
  const f = fixture(t), controller = new AbortController(), reason = new Error('cancel before load')
  controller.abort(reason)
  let loaded = false
  await assert.rejects(renderDeck({ ...f, signal: controller.signal }, async () => { loaded = true }), error => error === reason)
  assert.equal(loaded, false)
})

test('source changes during rendering discard the stale render', async t => {
  const f = fixture(t), kit = loader({ pdf: async () => writeFileSync(f.pptxPath, Buffer.concat([f.original, Buffer.from('changed')])) })
  await assert.rejects(renderDeck({ ...f, format: 'both' }, kit.load), { code: 'source-changed' })
  assert.equal(existsSync(f.outputDir), false)
})

test('source edits during engine disposal also invalidate the pending commit', async t => {
  const f = fixture(t), kit = loader({ dispose: async () => writeFileSync(f.pptxPath, Buffer.concat([f.original, Buffer.from('changed')])) })
  await assert.rejects(renderDeck(f, kit.load), { code: 'source-changed' })
  assert.equal(existsSync(f.outputDir), false)
})

test('one deadline covers the whole PNG/PDF job and cleans timed-out work', async t => {
  const f = fixture(t), kit = loader({ images: async (_request, signal) => new Promise((_resolve, reject) => {
    const keepAlive = setTimeout(() => reject(new Error('test missed deadline')), 2000)
    signal.addEventListener('abort', () => { clearTimeout(keepAlive); reject(signal.reason) }, { once: true })
  }) })
  await assert.rejects(renderDeck({ ...f, timeoutMs: 1000 }, kit.load), { code: 'timeout' })
  assert.equal(existsSync(f.outputDir), false)
  assert.equal(kit.calls.dispose, 1)
})

test('changed source and changed PNGs invalidate receipts', async t => {
  const f = fixture(t), result = await renderDeck(f, loader().load)
  writeFileSync(f.pptxPath, Buffer.concat([f.original, Buffer.from('changed')]))
  assert.equal(readRenderReceipt(f.pptxPath, result.receiptPath).reason, 'source-changed')
  writeFileSync(f.pptxPath, f.original)
  writeFileSync(result.pngPaths[0], 'changed image')
  assert.equal(readRenderReceipt(f.pptxPath, result.receiptPath).ok, false)
})

test('receipts reject version drift and output traversal', async t => {
  const f = fixture(t), result = await renderDeck(f, loader().load)
  const receipt = JSON.parse(readFileSync(result.receiptPath))
  receipt.renderer.version = '99.0.0'
  writeFileSync(result.receiptPath, JSON.stringify(receipt))
  assert.equal(readRenderReceipt(f.pptxPath, result.receiptPath).reason, 'invalid-receipt')
  receipt.renderer.version = RENDERER_VERSION
  receipt.pngs[0].file = '../../keep.txt'
  writeFileSync(result.receiptPath, JSON.stringify(receipt))
  assert.equal(readRenderReceipt(f.pptxPath, result.receiptPath).ok, false)
})

test('PDF-only receipts require a PDF and no fabricated PNG verification', async t => {
  const f = fixture(t), kit = loader(), result = await renderDeck({ ...f, format: 'pdf' }, kit.load)
  assert.equal(result.pngPaths, undefined)
  assert.ok(result.pdfPath)
  assert.equal(kit.calls.requests.length, 0)
  assert.equal(readRenderReceipt(f.pptxPath, result.receiptPath).ok, true)
})

test('invalid input and width limits fail before outputs are created', async t => {
  const f = fixture(t)
  await assert.rejects(renderDeck({ ...f, width: 9000 }, loader().load), /width/)
  writeFileSync(f.pptxPath, 'not an Office zip')
  await assert.rejects(renderDeck(f, loader().load), { code: 'invalid-document' })
  assert.equal(existsSync(f.outputDir), false)
})

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

export const RENDERER_PACKAGE = '@deepseek-ai/libreoffice-kit'
export const RENDERER_VERSION = '0.1.5'
const INPUT_LIMIT = 64 * 1024 * 1024
const OUTPUT_LIMIT = 128 * 1024 * 1024
const PAGE_LIMIT = 120
const RECEIPT_LIMIT = 1024 * 1024
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function fail(message, code = 'invalid-render') { throw Object.assign(new Error(message), { code }) }
function abort(signal) { if (signal?.aborted) throw signal.reason }
function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex') }
function integer(value, fallback, min, max, name) {
  const result = value === undefined ? fallback : value
  if (!Number.isSafeInteger(result) || result < min || result > max) fail(`${name} 需为 ${min}–${max} 的整数`)
  return result
}
function absolute(path, name) {
  if (typeof path !== 'string' || !isAbsolute(path)) fail(`${name} 需为绝对路径`)
  return resolve(path)
}
function readBounded(path, limit, name) {
  const info = lstatSync(path)
  if (!info.isFile()) fail(`${name} 需为普通文件`)
  if (info.size === 0 || info.size > limit) fail(`${name} 为空或超过 ${limit} 字节`, 'size-limit')
  const bytes = readFileSync(path)
  if (bytes.length !== info.size || bytes.length > limit) fail(`${name} 在读取时发生变化`, 'source-changed')
  return bytes
}

function classicExtra(bytes, offset, size) {
  const end = offset + size
  while (offset < end) {
    if (offset + 4 > end) fail('PPTX ZIP 扩展字段损坏', 'invalid-document')
    const id = bytes.readUInt16LE(offset), length = bytes.readUInt16LE(offset + 2)
    if (id === 1) fail('PPTX 渲染不支持 ZIP64，请用标准 PPTX 重新保存', 'invalid-document')
    offset += 4 + length
    if (offset > end) fail('PPTX ZIP 扩展字段越界', 'invalid-document')
  }
}

// Read only the small presentation part to obtain slide geometry. The renderer
// remains responsible for validating and importing the complete Office file.
function presentationXml(bytes) {
  let end = -1
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50 && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) { end = offset; break }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) fail('不支持的 PPTX ZIP 容器', 'invalid-document')
  const count = bytes.readUInt16LE(end + 10), length = bytes.readUInt32LE(end + 12), start = bytes.readUInt32LE(end + 16)
  if (count === 65535 || count > 20000 || start + length > end) fail('PPTX ZIP 目录无效或超过限制', 'invalid-document')
  let offset = start, presentation
  for (let index = 0; index < count; index++) {
    if (offset + 46 > start + length || bytes.readUInt32LE(offset) !== 0x02014b50) fail('PPTX ZIP 目录损坏', 'invalid-document')
    const flags = bytes.readUInt16LE(offset + 8), method = bytes.readUInt16LE(offset + 10)
    const compressed = bytes.readUInt32LE(offset + 20), expanded = bytes.readUInt32LE(offset + 24)
    const nameLength = bytes.readUInt16LE(offset + 28), extra = bytes.readUInt16LE(offset + 30), comment = bytes.readUInt16LE(offset + 32)
    const next = offset + 46 + nameLength + extra + comment
    if (next > start + length) fail('PPTX ZIP 文件名无效', 'invalid-document')
    const name = bytes.toString('utf8', offset + 46, offset + 46 + nameLength)
    const local = bytes.readUInt32LE(offset + 42)
    if (compressed === 0xffffffff || expanded === 0xffffffff || local === 0xffffffff || local + 30 > start || bytes.readUInt32LE(local) !== 0x04034b50) fail('PPTX ZIP64 或文件偏移无效', 'invalid-document')
    classicExtra(bytes, offset + 46 + nameLength, extra)
    const localExtra = local + 30 + bytes.readUInt16LE(local + 26), localExtraSize = bytes.readUInt16LE(local + 28)
    if (localExtra + localExtraSize + compressed > start) fail('PPTX ZIP 文件越界', 'invalid-document')
    classicExtra(bytes, localExtra, localExtraSize)
    if (name === 'ppt/presentation.xml') {
      if (flags & 1 || expanded > RECEIPT_LIMIT || compressed > RECEIPT_LIMIT) fail('PPTX 页面信息加密或超过限制', 'invalid-document')
      if (local + 30 > start || bytes.readUInt32LE(local) !== 0x04034b50) fail('PPTX 页面信息偏移无效', 'invalid-document')
      const dataOffset = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28)
      if (dataOffset + compressed > start) fail('PPTX 页面信息越界', 'invalid-document')
      const data = bytes.subarray(dataOffset, dataOffset + compressed)
      const xml = method === 0 ? data : method === 8 ? inflateRawSync(data, { maxOutputLength: RECEIPT_LIMIT }) : fail('PPTX 压缩格式不支持', 'invalid-document')
      if (xml.length !== expanded) fail('PPTX 页面信息长度不匹配', 'invalid-document')
      presentation = xml.toString('utf8')
    }
    offset = next
  }
  if (presentation === undefined) fail('PPTX 缺少 ppt/presentation.xml', 'invalid-document')
  return presentation
}
function geometry(bytes, width) {
  const xml = presentationXml(bytes), tag = xml.match(/<(?:[\w.-]+:)?sldSz\b[^>]*>/)?.[0]
  const cx = Number(tag?.match(/\bcx\s*=\s*["'](\d+)["']/)?.[1])
  const cy = Number(tag?.match(/\bcy\s*=\s*["'](\d+)["']/)?.[1])
  const count = (xml.match(/<(?:[\w.-]+:)?sldId\b/g) ?? []).length
  if (!Number.isSafeInteger(cx) || !Number.isSafeInteger(cy) || cx <= 0 || cy <= 0 || !count || count > PAGE_LIMIT) fail('PPTX 页面尺寸或页数无效（最多120页）', 'invalid-document')
  const dpi = width * 914400 / cx
  if (dpi < 24 || dpi > 600 || width * cy / cx > 8192) fail('目标宽度超出此 PPTX 页面尺寸的渲染限制', 'size-limit')
  return { dpi, slideCount: count }
}

function unavailable(error) {
  return { ok: false, status: 'unavailable', backend: 'libreoffice-kit',
    message: `PPTX 渲染引擎不可用：${error?.message ?? String(error)}`,
    installationHint: `在 dsh-ppt 所在项目或独立技能目录安装：npm install --ignore-scripts ${RENDERER_PACKAGE}@${RENDERER_VERSION}。Windows 还需与 Node 架构匹配的 Microsoft Visual C++ v14 运行库。` }
}
function missingDependency(error) { return ['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND', 'unavailable'].includes(error?.code) }
async function loadRenderer() {
  const require = createRequire(import.meta.url)
  // DSH redirects linked-package peer requests to its bundled version. Prefer
  // an explicitly installed matching SDK using its physical entry; this Office
  // helper has no Cordis services and must not share a stale host engine.
  for (const directory of require.resolve.paths(RENDERER_PACKAGE) ?? []) {
    const candidate = join(directory, RENDERER_PACKAGE, 'package.json')
    let manifest
    try { manifest = JSON.parse(readFileSync(candidate, 'utf8')) } catch (error) { if (error.code === 'ENOENT') continue; throw error }
    if (manifest.name === RENDERER_PACKAGE && manifest.version === RENDERER_VERSION && typeof manifest.main === 'string') {
      return import(pathToFileURL(require.resolve(join(dirname(candidate), manifest.main))).href)
    }
  }
  return import(pathToFileURL(require.resolve(RENDERER_PACKAGE)).href)
}
function reserveDirectory(base) {
  mkdirSync(dirname(base), { recursive: true })
  for (let index = 0; index < 10000; index++) {
    const candidate = index ? `${base}-${index}` : base
    try { mkdirSync(candidate); return candidate } catch (error) { if (error.code !== 'EEXIST') throw error }
  }
  fail('渲染目录重名过多，请指定新的 outputDir')
}
function cleanupOwned(root, owned) {
  // Only delete the freshly created staging/artifacts subtree. Never recursively
  // remove a requested directory or pre-existing user output.
  if (root && owned && dirname(resolve(owned)) === resolve(root) && (basename(owned).startsWith('.partial-') || basename(owned) === 'artifacts')) rmSync(owned, { recursive: true, force: true })
  if (root) { try { rmdirSync(root) } catch (error) { if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error } }
}
function relativeFile(root, path) {
  const value = relative(root, absolute(path, '引擎输出路径'))
  if (!value || value === '..' || value.startsWith(`..${sep}`) || isAbsolute(value)) fail('引擎输出路径不在本次目录内')
  return value.split(sep).join('/')
}
function fileRecord(root, path, budget) {
  const file = relativeFile(root, path), bytes = readBounded(path, OUTPUT_LIMIT, '渲染输出')
  budget.bytes += bytes.length
  if (budget.bytes > OUTPUT_LIMIT) fail('本次渲染输出超过128MiB', 'size-limit')
  return { record: { file, byteLength: bytes.length, sha256: sha256(bytes) }, bytes }
}
function fontNames(values) { return [...new Set(values.flat().filter(v => typeof v === 'string'))].sort() }

/** Optional renderer; dependency/engine absence is a result, other errors throw.
 * The second argument is an internal loader seam for testing and isolated hosts.
 */
export async function renderDeck(options = {}, loadKit = loadRenderer) {
  abort(options.signal)
  const pptxPath = absolute(options.pptxPath, 'pptxPath')
  if (extname(pptxPath).toLowerCase() !== '.pptx') fail('pptxPath 需为 .pptx 文件')
  const format = options.format ?? 'png'
  if (!['png', 'pdf', 'both'].includes(format)) fail('format 需为 png / pdf / both')
  const width = integer(options.width, 1440, 320, 3840, 'width')
  const timeoutMs = integer(options.timeoutMs, 120000, 1000, 300000, 'timeoutMs')
  const base = options.outputDir === undefined ? join(dirname(pptxPath), `${basename(pptxPath, extname(pptxPath))}-render`) : absolute(options.outputDir, 'outputDir')
  let kit
  try { kit = await loadKit() } catch (error) { abort(options.signal); if (missingDependency(error)) return unavailable(error); throw error }
  abort(options.signal)
  if (kit.ENGINE_VERSION !== RENDERER_VERSION || typeof kit.createConverter !== 'function') return unavailable(new Error(`需要 ${RENDERER_PACKAGE}@${RENDERER_VERSION}，当前模块版本为 ${String(kit.ENGINE_VERSION ?? '未知')}`))
  const input = readBounded(pptxPath, INPUT_LIMIT, 'PPTX'), sourceSha256 = sha256(input), shape = geometry(input, width)
  let converter
  try { converter = await kit.createConverter({ timeoutMs, maxInputBytes: INPUT_LIMIT, maxOutputBytes: OUTPUT_LIMIT, maxArchiveEntries: 20000, maxUncompressedBytes: 512 * 1024 * 1024, fontMetadataCacheDirectory: false }) }
  catch (error) { abort(options.signal); if (missingDependency(error)) return unavailable(error); throw error }
  let root, staging, committed = false
  const deadline = new AbortController()
  const timer = setTimeout(() => deadline.abort(Object.assign(new Error(`PPTX 渲染超过 ${timeoutMs}ms`), { code: 'timeout' })), timeoutMs)
  timer.unref()
  const operationSignal = options.signal ? AbortSignal.any([options.signal, deadline.signal]) : deadline.signal
  try {
    abort(operationSignal)
    root = reserveDirectory(base)
    staging = join(root, `.partial-${randomUUID()}`)
    mkdirSync(staging)
    const snapshot = join(staging, 'source.pptx')
    writeFileSync(snapshot, input, { flag: 'wx' })
    const destination = join(root, 'artifacts'), budget = { bytes: 0 }, fonts = []
    const receipt = { schemaVersion: 1, producer: 'dsh-ppt-render', status: 'rendered', visual: 'not-verified', createdAt: new Date().toISOString(),
      renderer: { package: RENDERER_PACKAGE, version: RENDERER_VERSION, backend: converter.backend },
      source: { sha256: sourceSha256, byteLength: input.length }, format, slideCount: shape.slideCount, missingFonts: [], pngs: [] }
    if (!['native', 'wasm'].includes(converter.backend)) fail('引擎未返回有效 backend')
    if (format !== 'pdf') {
      const images = await converter.renderImages({ inputPath: snapshot, outputDir: join(staging, 'pages'), pages: 'all', dpi: shape.dpi, maxPages: PAGE_LIMIT, maxPixels: 16777216, maxDimension: 8192 }, operationSignal)
      abort(operationSignal)
      if (images.sourceSha256 !== sourceSha256 || !Number.isSafeInteger(images.pageCount) || images.pageCount < 1 || images.pageCount > PAGE_LIMIT || images.images?.length !== images.pageCount) fail('引擎未返回完整且匹配输入的逐页图片')
      receipt.slideCount = images.pageCount
      fonts.push(images.missingFonts ?? [])
      const seen = new Set()
      for (const item of images.images) {
        const { record, bytes } = fileRecord(staging, item.path, budget)
        if (!Number.isSafeInteger(item.page) || item.page < 1 || item.page > images.pageCount || seen.has(item.page)) fail('引擎返回重复或无效页码')
        seen.add(item.page)
        if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE) || bytes.readUInt32BE(16) !== item.width || bytes.readUInt32BE(20) !== item.height || item.width * item.height > 16777216) fail('引擎PNG格式或尺寸不匹配')
        receipt.pngs.push({ page: item.page, ...record, width: item.width, height: item.height })
      }
      receipt.pngs.sort((a, b) => a.page - b.page)
      const manifest = { ...images, inputPath: pptxPath, images: images.images.map(item => ({ ...item, path: join(destination, relativeFile(staging, item.path)) })) }
      const manifestPath = join(staging, 'pages', 'manifest.json')
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
      receipt.manifest = fileRecord(staging, manifestPath, budget).record
    }
    if (format !== 'png') {
      const pdfPath = join(staging, 'document.pdf'), exported = await converter.convert({ inputPath: snapshot, outputPath: pdfPath }, operationSignal)
      abort(operationSignal)
      const { record, bytes } = fileRecord(staging, pdfPath, budget)
      if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) fail('引擎未生成有效PDF')
      receipt.pdf = record
      fonts.push(exported.missingFonts ?? [])
    }
    receipt.missingFonts = fontNames(fonts)
    abort(operationSignal)
    unlinkSync(snapshot)
    writeFileSync(join(staging, 'render-receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
    // Await native cleanup before publishing the output directory.
    await converter.dispose()
    converter = undefined
    abort(operationSignal)
    if (sha256(readBounded(pptxPath, INPUT_LIMIT, 'PPTX')) !== sourceSha256) fail('PPTX 在渲染期间已修改，请重新渲染', 'source-changed')
    if (existsSync(destination)) fail('本次渲染提交目录发生冲突')
    renameSync(staging, destination)
    staging = undefined
    committed = true
    return resultFromReceipt(receipt, join(destination, 'render-receipt.json'))
  } finally {
    if (converter) { try { await converter.dispose() } catch { /* Preserve the original operation/cancellation error. */ } }
    clearTimeout(timer)
    if (!committed) cleanupOwned(root, staging)
  }
}

function resultFromReceipt(receipt, receiptPath) {
  const root = dirname(receiptPath)
  return { ok: true, status: 'rendered', backend: receipt.renderer.backend, rendererVersion: receipt.renderer.version,
    slideCount: receipt.slideCount, sourceSha256: receipt.source.sha256, missingFonts: receipt.missingFonts,
    ...(receipt.pngs.length ? { pngPaths: receipt.pngs.map(image => resolve(root, image.file)) } : {}),
    ...(receipt.pdf ? { pdfPath: resolve(root, receipt.pdf.file) } : {}), receiptPath, outputDir: dirname(root), visual: 'not-verified' }
}
function unverified(message, reason) { return { ok: false, status: 'not-verified', message, reason, visual: 'not-verified' } }
function receiptFile(root, record) {
  if (!record || typeof record.file !== 'string' || isAbsolute(record.file) || record.file.includes('\\') || record.file.split('/').some(part => !part || part === '.' || part === '..') || !/^[0-9a-f]{64}$/.test(record.sha256) || !Number.isSafeInteger(record.byteLength) || record.byteLength < 1 || record.byteLength > OUTPUT_LIMIT) fail('渲染收据文件记录无效')
  const path = resolve(root, record.file)
  relativeFile(root, path)
  const bytes = readBounded(path, OUTPUT_LIMIT, '渲染收据输出')
  if (bytes.length !== record.byteLength || sha256(bytes) !== record.sha256) fail('渲染输出内容已变化')
}

/** Revalidate provenance and output integrity; this never certifies visual quality. */
export function readRenderReceipt(pptxPath, receiptPath) {
  try {
    const inputPath = absolute(pptxPath, 'pptxPath'), path = absolute(receiptPath, 'receiptPath')
    const receipt = JSON.parse(readBounded(path, RECEIPT_LIMIT, '渲染收据').toString('utf8'))
    if (receipt.schemaVersion !== 1 || receipt.producer !== 'dsh-ppt-render' || receipt.status !== 'rendered' || receipt.renderer?.package !== RENDERER_PACKAGE || receipt.renderer?.version !== RENDERER_VERSION || !['native', 'wasm'].includes(receipt.renderer?.backend) || !['png', 'pdf', 'both'].includes(receipt.format) || !Number.isSafeInteger(receipt.slideCount) || receipt.slideCount < 1 || receipt.slideCount > PAGE_LIMIT || !Array.isArray(receipt.pngs) || !Array.isArray(receipt.missingFonts) || receipt.missingFonts.some(name => typeof name !== 'string') || !/^[0-9a-f]{64}$/.test(receipt.source?.sha256)) return unverified('收据格式或渲染版本不匹配', 'invalid-receipt')
    const input = readBounded(inputPath, INPUT_LIMIT, 'PPTX')
    if (input.length !== receipt.source.byteLength || sha256(input) !== receipt.source.sha256) return unverified('PPTX 与渲染时的内容不同', 'source-changed')
    if ((receipt.format !== 'pdf' && (receipt.pngs.length !== receipt.slideCount || !receipt.manifest)) || (receipt.format !== 'png' && !receipt.pdf) || (receipt.format === 'pdf' && receipt.pngs.length) || (receipt.format === 'png' && receipt.pdf)) return unverified('收据缺少完整渲染输出', 'incomplete-output')
    const pages = new Set()
    const records = [...receipt.pngs, ...(receipt.pdf ? [receipt.pdf] : []), ...(receipt.manifest ? [receipt.manifest] : [])]
    if (records.reduce((sum, record) => sum + (Number.isSafeInteger(record?.byteLength) ? record.byteLength : OUTPUT_LIMIT + 1), 0) > OUTPUT_LIMIT) return unverified('收据输出总量超过128MiB', 'invalid-receipt')
    for (const image of receipt.pngs) {
      if (!Number.isSafeInteger(image.page) || image.page < 1 || image.page > receipt.slideCount || pages.has(image.page) || !Number.isSafeInteger(image.width) || !Number.isSafeInteger(image.height) || image.width < 1 || image.height < 1 || image.width * image.height > 16777216) return unverified('收据页码或图片尺寸无效', 'invalid-receipt')
      pages.add(image.page)
      receiptFile(dirname(path), image)
    }
    if (receipt.pdf) receiptFile(dirname(path), receipt.pdf)
    if (receipt.manifest) receiptFile(dirname(path), receipt.manifest)
    return resultFromReceipt(receipt, path)
  } catch (error) { return unverified(`收据验证失败：${error.message}`, 'invalid-or-changed-output') }
}

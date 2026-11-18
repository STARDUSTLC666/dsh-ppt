import { mkdirSync, readdirSync, readFileSync, statSync, openSync, closeSync, rmSync, writeFileSync } from 'node:fs'
import { resolve, dirname, extname, basename, join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { buildPptx, renderHtml, normalizeBuildOptions, normalizeSlides, resolveLanguage, resolveDeckFileName, commitDeckArtifacts, DECK_VERSION, buildDeck } from './deck-core.mjs'
import { listThemes, listMasterPresets, resolveTheme, buildThemePreview as buildThemePreviewFromThemes, deriveBrandedTheme, pptxEastAsianFont } from './deck-themes.mjs'
import { CORE_LAYOUTS, LAYOUT_ALIASES, stripInlineMarkdown } from './deck-layouts.mjs'
import { MEDIA_LAYOUTS, mediaBoxes, LOGO_BOX, FOOTER_BOX, normalizeChart, buildOfficeKitChartSpec, computeWaterfallGeometry } from './deck-media.mjs'
import { normalizeDataModel, prepareDataSlides, validateDataSnapshot, previewDataChange, dataNotes, dataReport } from './deck-data.mjs'
import { normalizeVisual, applyVisualActions } from './deck-visual.mjs'
import { absorbPptx, CHROME_STYLE_IDS } from './deck-absorb.mjs'
import { extractPptxSlides } from './deck-import.mjs'
import { renderHandoutMarkdown } from './deck-delivery.mjs'
import { SCENARIO_TEMPLATES, findScenarioTemplate, buildScenarioSlides, listScenarioTemplates, inferThemeFromContent, promoteMarkdownSlides, auditSlideAesthetics } from './deck-director.mjs'
export { readRenderReceipt } from './deck-render.mjs'
export { dataNotes, dataReport } from './deck-data.mjs'
export { buildDeck, resolveLanguage } from './deck-core.mjs'
export { listThemes, listMasterPresets, resolveTheme } from './deck-themes.mjs'
export { absorbPptx } from './deck-absorb.mjs'
export { extractPptxSlides } from './deck-import.mjs'
export { renderHandoutMarkdown } from './deck-delivery.mjs'
export { inferThemeFromContent } from './deck-director.mjs'

export function buildThemePreview(options = {}) {
  return buildThemePreviewFromThemes(options, resolveLanguage, DECK_VERSION)
}

const MAX_IMAGE = 5 * 1024 * 1024, MAX_ASSETS = 32 * 1024 * 1024, MAX_DOCUMENT = 64 * 1024 * 1024
const MAX_HISTORY = 20
const canonicalLayouts = new Set([...CORE_LAYOUTS, ...MEDIA_LAYOUTS])
const layouts = new Set([...canonicalLayouts, ...Object.keys(LAYOUT_ALIASES)])
const hash = data => createHash('sha256').update(data).digest('hex')
const clone = value => structuredClone(value)
function abort(signal) { signal?.throwIfAborted() }
function fail(message) { throw new Error('dsh-ppt：' + message) }

export function listTemplates(lang = 'zh') {
  const language = resolveLanguage(lang).id === 'en' ? 'en' : 'zh'
  return listScenarioTemplates(language)
}

function imageInfo(bytes, page) {
  let width, height, mime
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (bytes.length < 45 || bytes.toString('ascii', 12, 16) !== 'IHDR') fail(`${page} PNG 文件不完整`)
    width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20); mime = 'image/png'
    let offset = 8, ended = false; const compressed = []
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8)
      if (offset + length + 12 > bytes.length) fail(`${page} PNG 数据截断`)
      if (type === 'IDAT') compressed.push(bytes.subarray(offset + 8, offset + 8 + length))
      if (type === 'IEND') { ended = true; break }
      offset += length + 12
    }
    if (!ended || compressed.length === 0) fail(`${page} PNG 缺少图像数据`)
    try { inflateSync(Buffer.concat(compressed), { maxOutputLength: 128 * 1024 * 1024 }) } catch { fail(`${page} PNG 图像数据无法解码或过大`) }
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    mime = 'image/jpeg'
    let offset = 2
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) break
      while (bytes[offset] === 0xff) offset++
      const marker = bytes[offset++]
      if (marker === 0xd9 || marker === 0xda) break
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue
      const length = bytes.readUInt16BE(offset)
      if (length < 2 || offset + length > bytes.length) fail(`${page} JPEG 数据截断`)
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 7) { height = bytes.readUInt16BE(offset + 3); width = bytes.readUInt16BE(offset + 5) }
      offset += length
    }
    if (!bytes.subarray(-2).equals(Buffer.from([0xff, 0xd9]))) fail(`${page} JPEG 文件不完整`)
  } else if (bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    mime = 'image/webp'
    const chunk = bytes.toString('ascii', 12, 16)
    if (chunk === 'VP8 ' && bytes.length >= 30) { width = bytes.readUInt16LE(26) & 0x3fff; height = bytes.readUInt16LE(28) & 0x3fff }
    else if (chunk === 'VP8L' && bytes.length >= 25) { const bits = bytes.readUInt32LE(21); width = (bits & 0x3fff) + 1; height = ((bits >> 14) & 0x3fff) + 1 }
    else if (chunk === 'VP8X' && bytes.length >= 30) { width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)); height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) }
    else fail(`${page} WebP 文件头无效`)
  } else fail(`${page} 图片仅支持 PNG / JPEG / WebP，请先转换格式`)
  if (!width || !height || width > 16000 || height > 16000 || width * height > 32_000_000) fail(`${page} 图片尺寸无效或超过 3200 万像素`)
  return { width, height, mime }
}

function addAsset(image, assets, cwd, page) {
  if (image.assetId && !image.src) {
    if (!assets[image.assetId]) fail(`${page} 找不到嵌入图片 ${image.assetId}`)
    return image.assetId
  }
  const source = String(image.src ?? '').trim()
  let bytes
  if (/^data:/i.test(source)) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(source)
    if (!match || source.length > MAX_IMAGE * 1.4) fail(`${page} 图片 data URI 无效或超过 5 MiB`)
    bytes = Buffer.from(match[2], 'base64')
  } else {
    if (!source || /^[a-z][a-z0-9+.-]*:/i.test(source) && !/^[a-z]:[\\/]/i.test(source)) fail(`${page} 图片需本地路径或 PNG/JPEG/WebP data URI，不支持外链`)
    const path = resolve(cwd, source)
    let size
    try { size = statSync(path).size } catch { fail(`${page} 图片不存在：${path}`) }
    if (size > MAX_IMAGE) fail(`${page} 图片超过 5 MiB：${path}`)
    try { bytes = readFileSync(path) } catch { fail(`${page} 图片无法读取：${path}`) }
  }
  if (bytes.length > MAX_IMAGE) fail(`${page} 图片超过 5 MiB`)
  const info = imageInfo(bytes, page), id = 'img-' + hash(bytes)
  assets[id] = { ...info, data: `data:${info.mime};base64,${bytes.toString('base64')}` }
  return id
}

const CHROME_STYLE_SET = new Set(CHROME_STYLE_IDS)

function normalizeBrand(input, assets, cwd) {
  if (input === undefined || input === null) return undefined
  if (typeof input !== 'object' || Array.isArray(input)) fail('brand 必须是对象')
  const brand = {}
  for (const key of ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'coverBg']) {
    if (input[key] !== undefined && input[key] !== null && input[key] !== '') {
      if (!/^#[\da-f]{6}$/i.test(input[key])) fail(`brand.${key} 必须为 #RRGGBB`)
      brand[key] = input[key].toUpperCase()
    }
  }
  for (const fontKey of ['fontFamily', 'headingFont']) {
    if (input[fontKey]) {
      const font = String(input[fontKey]).trim()
      if (font.length > 80 || !/^[\p{L}\p{N} _-]+$/u.test(font)) fail(`brand.${fontKey} 需单个字体名称，最多 80 字符`)
      brand[fontKey] = font
    }
  }
  if (input.coverMode !== undefined && input.coverMode !== null && input.coverMode !== '') {
    const cm = String(input.coverMode).trim()
    if (!['standard', 'inverted-accent'].includes(cm)) fail('brand.coverMode 仅支持 standard / inverted-accent')
    brand.coverMode = cm
  }
  if (input.name) brand.name = String(input.name).slice(0, 100)
  if (input.footer) {
    if (String(input.footer).length > 100) fail('brand.footer 最多 100 字符')
    brand.footer = String(input.footer)
  }
  if (input.chromeStyle !== undefined && input.chromeStyle !== null && input.chromeStyle !== '') {
    const cs = String(input.chromeStyle).trim().toLowerCase()
    if (!CHROME_STYLE_SET.has(cs)) fail('brand.chromeStyle 需为 ' + CHROME_STYLE_IDS.join(' / '))
    brand.chromeStyle = cs
  }
  if (input.logo) brand.logoAssetId = addAsset({ src: input.logo }, assets, cwd, '品牌 Logo')
  else if (input.logoAssetId) {
    if (!assets[input.logoAssetId]) fail('品牌 Logo 嵌入资产不存在')
    brand.logoAssetId = input.logoAssetId
  }
  return brand
}

function brandedTheme(manifest) {
  return deriveBrandedTheme(manifest.theme, manifest.brand)
}

function embedSlides(slides, assets, cwd) {
  return slides.map((slide, index) => {
    const pageLabel = `第 ${index + 1} 页`
    let nextSlide = slide
    if (slide.image) {
      const assetId = addAsset(slide.image, assets, cwd, pageLabel)
      const { src, ...image } = slide.image
      nextSlide = { ...nextSlide, image: { ...image, assetId } }
    }
    if (Array.isArray(slide.images) && slide.images.length > 0) {
      const embeddedImages = slide.images.map((img, gIdx) => {
        const assetId = addAsset(img, assets, cwd, `${pageLabel}图 ${gIdx + 1}`)
        const { src, ...rest } = img
        return { ...rest, assetId }
      })
      nextSlide = { ...nextSlide, images: embeddedImages }
    }
    return nextSlide
  })
}

function effectiveLayout(rawLayout) {
  if (!rawLayout) return undefined
  return LAYOUT_ALIASES[rawLayout]?.layout || rawLayout
}

function validateRawSlides(slides) {
  if (slides === undefined || slides === null) return
  if (!Array.isArray(slides)) fail('slides 必须是数组')
  slides.forEach((s, i) => {
    if (!s || typeof s !== 'object' || Array.isArray(s)) fail(`第 ${i + 1} 页必须是对象`)
    if (s.layout && !layouts.has(s.layout)) fail(`第 ${i + 1} 页未知布局 ${s.layout}`)
    if (s.chrome !== undefined && s.chrome !== null && s.chrome !== '') {
      const ch = String(s.chrome).trim().toLowerCase()
      if (!CHROME_STYLE_SET.has(ch)) fail(`第 ${i + 1} 页未知母版骨架 chrome: ${s.chrome}`)
    }
    normalizeVisual(s.visual)
    const eff = effectiveLayout(s.layout)
    const hasImg = Boolean(s.image || (Array.isArray(s.images) && s.images.length > 0))
    if (s.chart && hasImg) fail(`第 ${i + 1} 页不能同时放入 image 和 chart`)
    if (hasImg && eff && !['image', 'image-left', 'image-right'].includes(eff)) fail(`第 ${i + 1} 页图片需使用 image / image-left / image-right / gallery 布局`)
    if (s.chart && eff && !['chart', 'chart-split'].includes(eff)) fail(`第 ${i + 1} 页图表需使用 chart / chart-split / waterfall 布局`)
  })
}

function snapshot(manifest) {
  return clone(Object.fromEntries(['title', 'theme', 'language', 'motion', 'slides', 'brand', 'template', 'dataModel'].filter(k => manifest[k] !== undefined).map(k => [k, manifest[k]])))
}

function collectAssets(manifest) {
  const ids = new Set()
  for (const state of [manifest, ...(manifest.history ?? [])]) {
    if (state.brand?.logoAssetId) ids.add(state.brand.logoAssetId)
    for (const slide of state.slides) {
      if (slide.image?.assetId) ids.add(slide.image.assetId)
      if (Array.isArray(slide.images)) {
        for (const img of slide.images) if (img?.assetId) ids.add(img.assetId)
      }
    }
  }
  manifest.assets = Object.fromEntries([...ids].map(id => [id, manifest.assets[id]]))
  const size = Object.values(manifest.assets).reduce((sum, asset) => sum + (asset?.data?.length ?? 0), 0)
  if (size > MAX_ASSETS * 1.4) fail('工程内图片总量超过 32 MiB，请压缩图片或减少图片')
}

function embeddedAssetError(asset, id) {
  try {
    if (!asset || typeof asset.data !== 'string' || asset.data.length > MAX_IMAGE * 1.4) fail('嵌入图片数据缺失或过大')
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(asset.data)
    if (!match) fail('嵌入图片格式无效')
    const bytes = Buffer.from(match[2], 'base64')
    if (bytes.length > MAX_IMAGE || bytes.toString('base64') !== match[2]) fail('嵌入图片编码无效或过大')
    const info = imageInfo(bytes, '嵌入图片')
    if (asset.width !== info.width || asset.height !== info.height || asset.mime !== info.mime || id !== 'img-' + hash(bytes)) fail('嵌入图片尺寸或内容摘要不匹配')
    return undefined
  } catch (error) { return error.message }
}

// This is a conservative fit estimate. Fonts and PowerPoint/WPS rendering still need visual inspection.
function textWidth(text) { return [...stripInlineMarkdown(String(text ?? ''))].reduce((n, c) => n + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0) }
function contrast(a, b) {
  const lum = color => {
    const rgb = color.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
  }
  const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
}

export function checkManifest(manifest) {
  const issues = [], theme = brandedTheme(manifest)
  const invalidAssets = new Map()
  const assetError = id => {
    if (!invalidAssets.has(id)) invalidAssets.set(id, embeddedAssetError(manifest.assets?.[id], id))
    return invalidAssets.get(id)
  }
  const issue = (index, code, message, suggestion, severity = 'warning') => issues.push({ slide: index + 1, slideId: manifest.slides[index]?.id, severity, code, message, suggestion })
  manifest.slides.forEach((slide, i) => {
    if (!slide.title?.trim()) issue(i, 'missing-title', '页面没有标题', '补充能说明本页内容的标题')
    const titleLimit = ['cover', 'closing', 'statement', 'quote', 'section'].includes(slide.layout) ? 40 : 34
    if (textWidth(slide.title) > titleLimit) issue(i, 'title-overflow', '标题可能换行过多或超过标题区域', '缩短标题，把解释移入正文')
    const mixed = ['image-left', 'image-right', 'chart-split'].includes(slide.layout), bullets = slide.bullets ?? []
    if (bullets.length > (mixed ? 5 : 8)) issue(i, 'dense-bullets', `本页有 ${bullets.length} 条要点，放映时过密`, '减少要点或拆成多页')
    const width = mixed ? 24 : 37
    const lines = bullets.reduce((sum, b) => sum + Math.max(1, Math.ceil(textWidth(b) / width)), 0)
      + (slide.subtitle ? Math.ceil(textWidth(slide.subtitle) / width) : 0)
    if (slide.layout === 'bullets' || mixed) {
      if (lines > (mixed ? 9 : 11)) issue(i, 'body-overflow', '正文估计超过可用高度', '先精简文字，再分拆页面，避免继续缩小字体')
    }
    const itemStrings = Array.isArray(slide.items)
      ? slide.items.flatMap(it => [it?.title, it?.text, it?.value, ...(it?.bullets ?? [])]).filter(Boolean)
      : []
    if ([slide.title, slide.subtitle, slide.takeaway, ...bullets, ...itemStrings].some(s => /待填写|To fill:/i.test(String(s)))) {
      issue(i, 'template-unfilled', '模板中还有待填写内容', '提供实际事实、依据和行动，填完后重新检查')
    }
    if (slide.layout === 'table') {
      if ((slide.rows?.[0]?.length ?? 0) > 6) issue(i, 'small-font', '表格超过 6 列，使用较小字号，小屏放映可能难以阅读', '减少列数或把重点数据改成图表，导出后检查可读性')
      if (slide.rows?.some(row => row.some(c => textWidth(c) > 18))) issue(i, 'table-density', '表格单元格文字较长，可能换行拥挤', '精简单元格或减少列数')
    }
    const boxes = MEDIA_LAYOUTS.has(slide.layout) ? mediaBoxes(slide.layout, slide.variant, slide) : null
    if (Array.isArray(boxes?.gallery) && Array.isArray(slide.images) && slide.images.length > 1) {
      slide.images.forEach((img, gIdx) => {
        const asset = manifest.assets?.[img?.assetId], gBox = boxes.gallery[gIdx] || boxes.image
        if (!asset) issue(i, 'missing-image', `找不到本页第 ${gIdx + 1} 张嵌入图片`, '重新指定图片路径后编辑本页', 'error')
        else {
          if (assetError(img.assetId)) issue(i, 'invalid-image', assetError(img.assetId), '重新提供本地图片后编辑该页', 'error')
          if (asset.width < gBox.w * 100 || asset.height < gBox.h * 100) issue(i, 'low-resolution', `图片为 ${asset.width}×${asset.height}，放大后可能模糊`, '换成更高分辨率图片；Logo 等小图可忽略此提示')
        }
        if (!img?.alt?.trim()) issue(i, 'missing-alt', '图片没有说明文字', '填写 images[].alt，方便读屏及理解图片')
      })
    } else if (slide.image) {
      const asset = manifest.assets?.[slide.image.assetId], box = boxes?.image || mediaBoxes('image').image
      if (!asset) issue(i, 'missing-image', '找不到本页的嵌入图片', '重新指定图片路径后编辑本页', 'error')
      else {
        if (assetError(slide.image.assetId)) issue(i, 'invalid-image', assetError(slide.image.assetId), '重新提供本地图片后编辑该页', 'error')
        if (asset.width < box.w * 100 || asset.height < box.h * 100) issue(i, 'low-resolution', `图片为 ${asset.width}×${asset.height}，放大后可能模糊`, '换成更高分辨率图片；Logo 等小图可忽略此提示')
      }
      if (!slide.image.alt?.trim()) issue(i, 'missing-alt', '图片没有说明文字', '填写 image.alt，方便读屏及理解图片')
    }
    if (slide.chart) {
      try { normalizeChart(slide.chart, i + 1) } catch (error) { issue(i, 'invalid-chart', error.message, '修正图表类别和数值', 'error') }
      if (slide.chart.categories?.length > 10 || (slide.chart.kind !== 'bar' && slide.chart.kind !== 'stacked-bar' && slide.chart.kind !== 'percent-bar' && slide.chart.categories?.some(c => textWidth(c) > 10))) {
        issue(i, 'chart-density', '图表类别较多或标签较长，可能相互遮挡', '减少类别，或使用横向条形图 bar')
      }
      if (slide.chart.series?.some(s => textWidth(s.name) > 14)) issue(i, 'chart-legend', '图例名称较长', '精简系列名称并检查渲染')
    }
    if (contrast(theme.palette.bg, theme.palette.fg) < 4.5) issue(i, 'low-contrast', '正文与背景对比度低于 4.5:1', '调整品牌背景色或文字色')
  })
  if (manifest.brand?.logoAssetId && !manifest.assets?.[manifest.brand.logoAssetId]) issue(0, 'missing-logo', '品牌 Logo 资产不存在', '重新提供 Logo', 'error')
  else if (manifest.brand?.logoAssetId && assetError(manifest.brand.logoAssetId)) issue(0, 'invalid-logo', assetError(manifest.brand.logoAssetId), '重新提供 Logo', 'error')

  // 追加 SLOP-01..10 审美反模式静态诊断
  for (const aestheticIssue of auditSlideAesthetics(manifest, theme, textWidth)) {
    issues.push(aestheticIssue)
  }

  return { ok: !issues.some(i => i.severity === 'error'), slideCount: manifest.slides.length,
    errorCount: issues.filter(i => i.severity === 'error').length, warningCount: issues.filter(i => i.severity === 'warning').length,
    issues, note: '文字尺寸与溢出为静态估算；最终请检查 HTML 放映和 PowerPoint / WPS 实际显示。页脚和页码的小字号不计入正文检查。' }
}

function drawNativeWaterfallWithKit(lib, slide, chart, boxIn, theme) {
  const emuVal = inches => Math.round(inches * 914400)
  const cb = { x: emuVal(boxIn.x), y: emuVal(boxIn.y), w: emuVal(boxIn.w), h: emuVal(boxIn.h) }
  const plotLeft = cb.x + Math.round(cb.w * 0.085)
  const plotRight = cb.x + Math.round(cb.w * 0.975)
  const plotTop = cb.y + Math.round(cb.h * 0.11)
  const plotBottom = cb.y + Math.round(cb.h * 0.83)
  const geom = computeWaterfallGeometry(chart, { left: plotLeft, right: plotRight, top: plotTop, bottom: plotBottom })

  const tokens = theme.tokens || {}
  const fg = tokens.inkPrimary || theme.palette.fg
  const muted = tokens.inkMuted || theme.palette.muted
  const hairline = tokens.hairline || theme.palette.panel
  const focalColor = tokens.chartFocal || theme.palette.accent
  const posColor = tokens.positive || '#0D7A4E'
  const negColor = tokens.negative || '#C81E1E'
  const font = pptxEastAsianFont(theme.fonts.body)

  geom.ticks.forEach((tk, idx) => {
    const grid = lib.addSlideLine(slide, { x1: plotLeft, y1: Math.round(tk.y), x2: plotRight, y2: Math.round(tk.y), name: `Waterfall Grid ${idx}` })
    lib.setShapeStroke(grid, { color: hairline, width: 9525 })
    const lbl = lib.addSlideTextBox(slide, { x: cb.x, y: Math.round(tk.y - 95000), w: Math.max(91440, plotLeft - cb.x - 68000), h: 190000, text: tk.label, name: `Waterfall Tick ${idx}` })
    lib.setShapeTextFormat(lbl, { size: 11, font, color: muted })
    lib.setShapeAlignment(lbl, 'right')
  })

  geom.connectors.forEach((cn, idx) => {
    const bridge = lib.addSlideLine(slide, { x1: Math.round(cn.x1), y1: Math.round(cn.y1), x2: Math.round(cn.x2), y2: Math.round(cn.y2), name: `Waterfall Bridge ${idx + 1}` })
    lib.setShapeStroke(bridge, { color: muted, width: 11430, dash: 'dash' })
  })

  geom.bars.forEach((b, idx) => {
    const col = b.role === 'total' ? focalColor : b.role === 'positive' ? posColor : negColor
    const bar = lib.addSlideShape(slide, 'roundRect', { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.max(25400, Math.round(b.h)), name: `Waterfall Bar ${idx + 1}` })
    lib.setShapeFill(bar, col)
    lib.setShapeNoStroke(bar)
    const labelY = b.value >= 0 || b.isTotal ? Math.round(b.y - 220000) : Math.round(b.y + b.h + 25000)
    const valBox = lib.addSlideTextBox(slide, { x: Math.round(b.x - 95000), y: labelY, w: Math.round(b.w + 190000), h: 205000, text: b.label, name: `Waterfall Value ${idx + 1}` })
    lib.setShapeTextFormat(valBox, { size: 11.5, font, color: b.role === 'total' ? fg : col, bold: true })
    lib.setShapeAlignment(valBox, 'center')
    const catBox = lib.addSlideTextBox(slide, { x: Math.round(b.x - 110000), y: plotBottom + 42000, w: Math.round(b.w + 220000), h: 240000, text: b.category, name: `Waterfall Category ${idx + 1}` })
    lib.setShapeTextFormat(catBox, { size: 12, font, color: fg })
    lib.setShapeAlignment(catBox, 'center')
  })

  const axis = lib.addSlideLine(slide, { x1: plotLeft, y1: Math.round(geom.zeroY), x2: plotRight, y2: Math.round(geom.zeroY), name: 'Waterfall Baseline' })
  lib.setShapeStroke(axis, { color: tokens.inkSecondary || muted, width: 15875 })
}

async function exportPptx(manifest, theme, language, signal) {
  const base = buildPptx({ ...manifest, slides: manifest.slides.map(s => ({ ...s, notes: dataNotes(manifest, s) })) }, theme, language)
  const hasWaterfall = manifest.slides.some(s => s.chart?.kind === 'waterfall')
  const waterfallMissingInBase = hasWaterfall && !base.includes(Buffer.from('Waterfall Bar 1'))
  const hasOfficeKitChart = manifest.slides.some(s => s.chart && s.chart.kind !== 'waterfall')
  const hasImages = manifest.slides.some(s => s.image || (Array.isArray(s.images) && s.images.length > 0))
  if (!manifest.brand?.logoAssetId && !manifest.brand?.footer && !hasImages && !hasOfficeKitChart && !waterfallMissingInBase) return base

  abort(signal)
  let lib
  try { lib = await import('@office-kit/pptx') } catch (error) { fail('图片、图表和品牌导出需要 @office-kit/pptx@0.21.0。插件请重新安装；独立技能请在技能目录运行 npm install --ignore-scripts。' + error.message) }
  abort(signal)
  const presentation = await lib.loadPresentation(base), slides = lib.getSlides(presentation)
  const emu = box => Object.fromEntries(Object.entries(box).map(([k, v]) => [k, Math.round(v * 914400)]))
  const putImage = (slide, id, box, fit, name, alt) => {
    const asset = manifest.assets[id], bytes = Buffer.from(asset.data.split(',')[1], 'base64')
    const shape = lib.addSlideImage(slide, bytes, { ...emu(box), name, fit: fit === 'contain' ? 'contain' : 'fill' })
    lib.setShapeDescription(shape, alt || name)
    if (fit === 'cover') {
      const natural = asset.width / asset.height, target = box.w / box.h
      const fraction = natural > target ? (1 - target / natural) / 2 : (1 - natural / target) / 2
      lib.setShapeImageCrop(shape, natural > target ? { left: fraction, right: fraction } : { top: fraction, bottom: fraction })
    }
  }
  manifest.slides.forEach((source, index) => {
    abort(signal)
    const slide = slides[index]
    const boxes = MEDIA_LAYOUTS.has(source.layout) ? mediaBoxes(source.layout, source.variant, source) : mediaBoxes('image')
    if (Array.isArray(boxes.gallery) && Array.isArray(source.images) && source.images.length > 1) {
      boxes.gallery.forEach((gBox, gIdx) => {
        const img = source.images[gIdx]
        if (img?.assetId) putImage(slide, img.assetId, gBox, img.fit || 'cover', `Gallery image ${gIdx + 1}`, img.alt)
      })
    } else if (source.image) {
      putImage(slide, source.image.assetId, boxes.image, source.image.fit, 'Slide image', source.image.alt)
    }
    if (source.chart) {
      if (source.chart.kind === 'waterfall') {
        if (!lib.findShapeByName(slide, 'Waterfall Bar 1')) {
          drawNativeWaterfallWithKit(lib, slide, source.chart, boxes.chart, theme)
        }
      } else {
        const font = pptxEastAsianFont(theme.fonts.body)
        const spec = buildOfficeKitChartSpec(source.chart, theme, source.visual, font)
        lib.addSlideChart(slide, { ...emu(boxes.chart), name: 'Editable data chart', spec })
      }
    }
    if (manifest.brand?.logoAssetId) putImage(slide, manifest.brand.logoAssetId, LOGO_BOX, 'contain', 'Brand logo', manifest.brand.name)
    if (manifest.brand?.footer && !lib.findShapeByName(slide, 'Footer source')) {
      const footer = lib.addSlideTextBox(slide, { ...emu(FOOTER_BOX), text: manifest.brand.footer, name: 'Brand footer' })
      lib.setShapeTextFormat(footer, { size: 10, font: pptxEastAsianFont(theme.fonts.body), color: theme.palette.muted })
    }
  })
  const invalid = lib.validatePresentation(presentation).filter(i => i.severity === 'error')
  if (invalid.length) fail('PPTX 结构校验失败：' + invalid.map(i => i.message).join('；'))
  const bytes = await lib.savePresentation(presentation)
  abort(signal)
  return Buffer.from(bytes)
}

function documentBytes(manifest) {
  const text = JSON.stringify(manifest, null, 2) + '\n'
  if (Buffer.byteLength(text) > MAX_DOCUMENT) fail('JSON 工程含历史超过 64 MiB，请缩减图片或清理历史后另存工程')
  return text
}
function result(manifest, paths, writeHandout = false) {
  const handoutPath = paths.json.slice(0, -5) + '.handout.md'
  return { ok: true, title: manifest.title, theme: manifest.theme, language: manifest.language,
    slideCount: manifest.slides.length, deckId: manifest.deckId, revision: manifest.revision,
    slides: manifest.slides.map((s, i) => ({ slide: i + 1, id: s.id, title: s.title, layout: s.layout })),
    undoAvailable: manifest.history.length, deliveryStatus: manifest.quality?.issues.some(i => i.code === 'template-unfilled') ? 'draft' : 'ready-for-review',
    quality: manifest.quality, verification: { static: 'checked', pptxRender: 'not-verified', visual: 'not-verified' }, outputDir: dirname(paths.json),
    files: paths, htmlPath: paths.html, pptxPath: paths.pptx, jsonPath: paths.json,
    ...(writeHandout ? { handoutPath } : {}) }
}
function pathsFor(jsonPath) {
  const base = jsonPath.slice(0, -5)
  return { html: base + '.html', pptx: base + '.pptx', json: jsonPath }
}
function withLock(path, commit) {
  const lock = path + '.dsh-ppt-lock'
  let fd
  try { fd = openSync(lock, 'wx') } catch { fail('该工程正在被另一次修改，请稍后重试：' + path) }
  try { return commit() } finally { closeSync(fd); rmSync(lock, { force: true }) }
}
async function generate(manifest, signal) {
  abort(signal)
  validateSnapshot(manifest, manifest.assets)
  collectAssets(manifest)
  manifest.slideCount = manifest.slides.length
  manifest.quality = checkManifest(manifest)
  if (manifest.quality.errorCount) fail(manifest.quality.issues.filter(i => i.severity === 'error').map(i => `第 ${i.slide} 页：${i.message}`).join('；'))
  const theme = brandedTheme(manifest), language = resolveLanguage(manifest.language)
  const json = documentBytes(manifest)
  const pptx = await exportPptx(manifest, theme, language, signal)
  abort(signal)
  return { json, pptx, manifest, theme, language }
}
function commit(paths, data, writeHandout = false) {
  const handoutPath = paths.json.slice(0, -5) + '.handout.md'
  const html = renderHtml(data.manifest, data.theme, data.language, { ...paths, ...(writeHandout ? { handout: handoutPath } : {}) })
  data.manifest.artifacts = { html: hash(html), pptx: hash(data.pptx) }
  const artifacts = [
    { path: paths.json, data: documentBytes(data.manifest), encoding: 'utf8' },
    { path: paths.html, data: html, encoding: 'utf8' },
    { path: paths.pptx, data: data.pptx },
  ]
  if (writeHandout) {
    artifacts.push({ path: handoutPath, data: renderHandoutMarkdown(data.manifest, data.language.id), encoding: 'utf8' })
  }
  commitDeckArtifacts(artifacts)
}

function validateEmbeddedImgObject(img, assets) {
  if (img.fit !== undefined && !['contain', 'cover'].includes(img.fit)) fail('工程 image.fit 只允许 contain / cover')
  if (img.src !== undefined || !assets[img.assetId]) fail('工程图片必须使用有效的嵌入资产')
}

function validateSnapshot(value, assets) {
  resolveTheme(value.theme); resolveLanguage(value.language)
  validateRawSlides(value.slides)
  validateDataSnapshot(value, normalizeSlides)
  if (value.brand != null) {
    if (Object.hasOwn(value.brand, 'logo')) fail('工程品牌仅支持嵌入的 logoAssetId，不读取本地 logo 路径')
    for (const key of ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'fontFamily', 'headingFont', 'coverMode', 'coverBg', 'name', 'footer', 'chromeStyle']) {
      if (value.brand[key] !== undefined && typeof value.brand[key] !== 'string') fail('工程 brand.' + key + ' 必须为字符串')
    }
    normalizeBrand(value.brand, assets, '.')
  }
  for (const slide of value.slides) {
    if (slide.image) validateEmbeddedImgObject(slide.image, assets)
    if (Array.isArray(slide.images)) {
      for (const img of slide.images) validateEmbeddedImgObject(img, assets)
    }
    if (slide.chart) normalizeChart(slide.chart)
  }
}

function artifactProblem(manifest, paths) {
  if (!manifest.artifacts) return '旧工程没有成品校验记录，无法确认外部修改；请另存副本，保留原文件。'
  for (const kind of ['html', 'pptx']) {
    try { if (hash(readFileSync(paths[kind])) === manifest.artifacts[kind]) continue } catch {}
    return kind.toUpperCase() + ' 已在外部修改或缺失，不会覆盖；请另存副本。副本从 JSON 生成，不导入 Office 手工修改。'
  }
}

const SKELETON_METRIC_RE = /(?:^|[^\d])[-+]?\d+(?:,\d{3})*(?:\.\d+)?\s*(?:[%％倍xX万亿千百元美元刀kKmMbB+家个席天周月年项次]|pp\b|bps\b|ms\b|pts?\b)/i

function mapSlidesToAbsorbedSkeleton(slides, slideSkeleton, langId) {
  if (!Array.isArray(slides) || !Array.isArray(slideSkeleton) || slideSkeleton.length === 0) return slides
  const bodySkeleton = slideSkeleton.filter((entry) => entry && !['cover', 'closing', 'section'].includes(entry.inferredLayout))
  const cyclePool = bodySkeleton.length > 0 ? bodySkeleton : slideSkeleton
  let cursor = 0
  const mapped = slides.map((slide, idx) => {
    if (slide.layout === 'cover' || slide.layout === 'closing' || slide.layout === 'section' || slide.layout === 'agenda') {
      return slide
    }
    const target = cyclePool[cursor % cyclePool.length]
    cursor += 1
    if (!target || !target.inferredLayout) return slide
    const want = target.inferredLayout
    const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
    const n = bullets.length
    const metricHits = bullets.filter((b) => SKELETON_METRIC_RE.test(stripInlineMarkdown(b))).length
    const hasMetrics = n >= 2 && n <= 4 && (metricHits / n) >= 0.75
    // Avoid breaking Markdown-only slides that lack media assets (chart/image) by mapping media slots to visual card equivalents
    if (want === 'chart' || want === 'chart-split' || want === 'waterfall') {
      return { ...slide, layout: hasMetrics ? 'kpi' : 'cards', variant: hasMetrics ? 'grid' : 'bento' }
    }
    if (want === 'image' || want === 'image-left' || want === 'image-right') {
      return { ...slide, layout: n <= 2 ? 'callout' : 'cards', variant: n <= 2 ? 'takeaways' : 'pillars' }
    }
    if (want === 'matrix' && n !== 4) {
      return { ...slide, layout: 'cards', variant: 'bento' }
    }
    if (want === 'kpi' && (!hasMetrics || n < 1 || n > 4)) {
      return { ...slide, layout: 'cards', variant: 'pillars' }
    }
    if (want === 'table' && (!Array.isArray(slide.rows) || slide.rows.length === 0)) {
      return { ...slide, layout: 'cards', variant: 'pillars' }
    }
    if (want === 'harvey' && (!Array.isArray(slide.rows) || slide.rows.length === 0)) {
      return { ...slide, layout: 'comparison', variant: 'versus' }
    }
    if (['cards', 'kpi', 'comparison', 'matrix', 'process', 'callout', 'statement', 'quote', 'bullets', 'gantt', 'architecture', 'tam', 'org'].includes(want)) {
      return {
        ...slide,
        layout: want,
        ...(target.variant ? { variant: target.variant } : {}),
        ...(want === 'gantt' && !Array.isArray(slide.columns) ? { columns: ['Q1', 'Q2', 'Q3', 'Q4'] } : {}),
      }
    }
    return slide
  })
  return normalizeSlides(mapped, 120, langId)
}

export async function buildDeckAsync(options = {}) {
  abort(options.signal)
  validateRawSlides(options.slides)
  const cwd = resolve(options.cwd || '.')
  const scenario = options.template ? findScenarioTemplate(options.template) : undefined
  if (options.template && !scenario) fail('未知 template，请使用 ' + SCENARIO_TEMPLATES.map(s => s.id).join(' / '))

  let absorbed = null
  if (options.referencePptx !== undefined && options.referencePptx !== null && String(options.referencePptx).trim() !== '') {
    absorbed = await absorbPptx({ pptxPath: String(options.referencePptx).trim(), cwd, extractLogo: true, signal: options.signal })
  }

  const rawThemeOpt = typeof options.theme === 'string' && options.theme.trim() ? options.theme.trim() : undefined
  let chosenThemeId = rawThemeOpt
  let directorHint = null
  if (chosenThemeId === 'auto' || (!chosenThemeId && (options.persona || absorbed || scenario))) {
    if (absorbed && (!rawThemeOpt || rawThemeOpt === 'auto') && !options.persona && !scenario) {
      chosenThemeId = absorbed.recommendedTheme
    } else {
      directorHint = inferThemeFromContent({
        title: options.title,
        content: options.content,
        slides: options.slides,
        template: scenario?.id,
        persona: options.persona,
      })
      chosenThemeId = directorHint.theme
    }
  }

  const langId = resolveLanguage(options.lang).id
  const fromMarkdown = !options.slides?.length && !scenario && Boolean(options.content?.trim())
  const input = {
    ...options,
    theme: chosenThemeId,
    ...(!options.content?.trim() && !options.slides?.length && scenario
      ? { slides: buildScenarioSlides(scenario, String(options.title ?? ''), langId === 'en' ? 'en' : 'zh') }
      : {}),
  }

  const dataModel = options.dataModel ? normalizeDataModel(options.dataModel, { cwd, allowFiles: true }) : undefined
  if (dataModel && (!Array.isArray(input.slides) || !input.slides.length)) fail('数据绑定需使用结构化 slides / Data binding requires structured slides')
  const prepared = dataModel ? prepareDataSlides(input.slides, dataModel, normalizeSlides, langId) : undefined
  const normalized = normalizeBuildOptions({ ...input, ...(prepared ? { slides: prepared } : {}) })
  if (prepared) normalized.deck.slides = prepared

  if (fromMarkdown) {
    if (absorbed && options.cloneStructure === true && Array.isArray(absorbed.slideSkeleton) && absorbed.slideSkeleton.length > 0) {
      normalized.deck.slides = mapSlidesToAbsorbedSkeleton(normalized.deck.slides, absorbed.slideSkeleton, langId)
    } else {
      const shouldPromote = options.smartLayout === true || (options.smartLayout !== false && (rawThemeOpt === 'auto' || Boolean(options.persona) || Boolean(absorbed)))
      if (shouldPromote) {
        normalized.deck.slides = promoteMarkdownSlides(normalized.deck.slides, { explicitSmartLayout: options.smartLayout === true })
      }
    }
  }
  if (directorHint?.tableStyle === 'booktabs') {
    normalized.deck.slides = normalized.deck.slides.map(s => s.layout === 'table' && !s.tableStyle ? { ...s, tableStyle: 'booktabs' } : s)
  }

  const assets = {}
  let brandInput = options.brand
  if (absorbed) {
    const baseAbsorbedBrand = {
      ...absorbed.sanitizedBrand,
      ...(options.cloneStructure === true && absorbed.recommendedChrome ? { chromeStyle: absorbed.recommendedChrome } : {}),
    }
    const targetTheme = resolveTheme(normalized.theme.id)
    if (
      absorbed.sanitizedTokens?.coverMode === 'inverted-accent' &&
      targetTheme.tokens?.coverMode === 'inverted-accent' &&
      !options.brand?.backgroundColor
    ) {
      delete baseAbsorbedBrand.backgroundColor
    }
    brandInput = options.brand === null ? null : { ...baseAbsorbedBrand, ...(options.brand || {}) }
  }
  const brand = normalizeBrand(brandInput, assets, cwd)

  const manifest = {
    version: DECK_VERSION,
    schemaVersion: 1,
    deckId: randomUUID(),
    revision: 0,
    title: normalized.title,
    theme: normalized.theme.id,
    language: normalized.language.id,
    motion: normalized.motion,
    ...(scenario ? { template: scenario.id } : {}),
    ...(brand ? { brand } : {}),
    ...(dataModel ? { dataModel } : {}),
    assets,
    history: [],
    slides: embedSlides(normalized.deck.slides, assets, cwd).map(s => ({ ...s, id: randomUUID() })),
  }
  const data = await generate(manifest, options.signal)
  mkdirSync(normalized.outputDir, { recursive: true })
  // Resolve collisions after asynchronous rendering; an earlier call may have committed meanwhile.
  const file = resolveDeckFileName(normalized.outputDir, normalized.fileName, normalized.overwrite)
  const paths = pathsFor(resolve(normalized.outputDir, file + '.json'))
  const writeHandout = options.handout === true
  withLock(paths.json, () => { abort(options.signal); commit(paths, data, writeHandout) })
  return result(manifest, paths, writeHandout)
}

function readDocument(pathInput, cwd = '.') {
  const path = resolve(cwd, String(pathInput ?? ''))
  if (!pathInput || extname(path).toLowerCase() !== '.json') fail('deckPath 需指向本插件生成的 .json 工程')
  if (statSync(path).size > MAX_DOCUMENT) fail('工程文件超过 64 MiB')
  const bytes = readFileSync(path)
  let document
  try { document = JSON.parse(bytes) } catch { fail('JSON 工程无法解析：' + path) }
  if (!document || typeof document.title !== 'string' || !Array.isArray(document.slides) || !document.slides.length) fail('这不是有效的 dsh-ppt JSON 工程')
  if (document.schemaVersion !== undefined && document.schemaVersion !== 1) fail('未知工程 schemaVersion，请升级插件后再修改')
  if (document.slides.length > 120) fail('工程页数超过 120')
  resolveTheme(document.theme); resolveLanguage(document.language)
  document.deckId ||= randomUUID(); document.revision ??= 0
  if (!Number.isInteger(document.revision) || document.revision < 0) fail('工程 revision 无效')
  document.assets ??= {}; document.history ??= []
  if (typeof document.assets !== 'object' || Array.isArray(document.assets)) fail('工程图片资产无效')
  if (!Array.isArray(document.history) || document.history.length > MAX_HISTORY || document.history.some(h => !h || !Array.isArray(h.slides))) fail('工程历史无效')
  validateSnapshot(document, document.assets)
  for (const prior of document.history) validateSnapshot(prior, document.assets)
  if (document.artifacts !== undefined && (!document.artifacts || typeof document.artifacts !== 'object'
    || ['html', 'pptx'].some(kind => !/^[a-f0-9]{64}$/.test(document.artifacts[kind])))) fail('工程成品校验记录无效')
  const ids = new Set()
  for (const slide of document.slides) {
    if (!slide || !layouts.has(slide.layout)) fail('工程含有未知页面布局')
    slide.id ||= randomUUID()
    if (ids.has(slide.id)) fail('工程含有重复页面 ID')
    ids.add(slide.id)
  }
  return { manifest: document, path, fingerprint: hash(bytes) }
}

/** Validated project snapshot for the operator workbench; no file is modified. */
export function readDeckProject(options = {}) {
  abort(options.signal)
  const { manifest, path } = readDocument(options.deckPath, options.cwd)
  return { manifest: clone(manifest), path }
}
function expected(manifest, revision) {
  if (revision !== undefined && (!Number.isInteger(revision) || revision !== manifest.revision)) fail(`修订号冲突：当前 revision=${manifest.revision}，请重新读取工程后修改`)
}
async function saveRevision(state, next, signal, saveAs = false, preserveUndo = false) {
  if (!saveAs) { const problem = artifactProblem(state.manifest, pathsFor(state.path)); if (problem) fail(problem) }
  next.version = DECK_VERSION; next.schemaVersion = 1; next.revision = state.manifest.revision + 1
  if (saveAs) { next.deckId = randomUUID(); next.revision = 0; next.history = preserveUndo ? [snapshot(state.manifest)] : [] }
  const data = await generate(next, signal)
  let paths = pathsFor(state.path)
  withLock(state.path, () => {
    abort(signal)
    if (hash(readFileSync(state.path)) !== state.fingerprint) fail('工程已被其他操作修改，请重新读取后重试')
    if (saveAs) {
      const file = resolveDeckFileName(dirname(state.path), basename(state.path, '.json') + '-dsh', false)
      paths = pathsFor(resolve(dirname(state.path), file + '.json'))
    } else {
      const problem = artifactProblem(state.manifest, paths); if (problem) fail(problem)
    }
    commit(paths, data)
  })
  return result(next, paths)
}

export async function editDeck(options = {}) {
  abort(options.signal)
  const cwd = resolve(options.cwd || '.')
  const state = readDocument(options.deckPath, options.cwd), current = state.manifest
  expected(current, options.expectedRevision)
  const next = clone(current)
  if (!Array.isArray(options.edits) || !options.edits.length) {
    if (
      options.brand === undefined &&
      options.theme === undefined &&
      options.referencePptx === undefined &&
      options.order === undefined &&
      options.duplicate === undefined &&
      options.remove === undefined &&
      options.append === undefined &&
      options.saveAs !== true
    ) {
      fail('请提供 edits、theme、referencePptx、order、duplicate、remove、append 或 brand')
    }
  }
  const used = new Set()
  const allowed = new Set([
    'layout', 'variant', 'chrome', 'title', 'subtitle', 'kicker', 'takeaway', 'source',
    'text', 'formula', 'activeIndex', 'tableStyle', 'bullets', 'items', 'cards', 'metrics',
    'columns', 'steps', 'quadrants', 'rows', 'notes', 'image', 'images', 'chart', 'visual',
  ])
  for (const edit of options.edits ?? []) {
    const index = typeof edit.slide === 'number' && Number.isInteger(edit.slide) ? edit.slide - 1 : next.slides.findIndex(s => s.id === edit.slide)
    if (index < 0 || index >= next.slides.length) fail('找不到要修改的页面：' + edit.slide)
    if (used.has(index)) fail('一次修改不能重复指定同一页：' + (index + 1))
    used.add(index)
    if (!edit.patch || typeof edit.patch !== 'object' || Array.isArray(edit.patch)) fail('第 ' + (index + 1) + ' 页 patch 需为对象')
    for (const key of Object.keys(edit.patch)) if (!allowed.has(key)) fail('不支持修改页面字段：' + key)
    validateRawSlides([edit.patch])
    const changed = { ...next.slides[index], ...next.slides[index].dataTemplate, ...edit.patch }
    delete changed.dataTemplate
    for (const key of Object.keys(changed)) if (changed[key] === null) delete changed[key]
    if (edit.patch.bullets && !edit.patch.items && !edit.patch.cards && !edit.patch.metrics && !edit.patch.steps && !edit.patch.columns && !edit.patch.quadrants && !next.slides[index].dataTemplate?.items) {
      delete changed.items
    }
    if (edit.patch.chart) {
      if (!edit.patch.layout && !['chart', 'chart-split', 'waterfall'].includes(changed.layout)) changed.layout = 'chart'
      if (['chart', 'chart-split', 'waterfall'].includes(changed.layout)) { delete changed.image; delete changed.images }
    }
    if (edit.patch.image || edit.patch.images) {
      if (!edit.patch.layout && !['image', 'image-left', 'image-right', 'gallery'].includes(changed.layout)) {
        changed.layout = Array.isArray(edit.patch.images) && edit.patch.images.length > 1 ? 'image' : 'image-right'
      }
      if (['image', 'image-left', 'image-right', 'gallery'].includes(changed.layout)) delete changed.chart
    }
    if (edit.patch.layout) {
      const eff = effectiveLayout(edit.patch.layout)
      if (!MEDIA_LAYOUTS.has(eff)) { delete changed.image; delete changed.images; delete changed.chart }
    }
    validateRawSlides([changed])
    let slides
    try { slides = next.dataModel ? prepareDataSlides([changed], next.dataModel, normalizeSlides, next.language) : normalizeSlides([changed], 120, next.language) } catch (error) { fail(`第 ${index + 1} 页修改失败：${error.message}`) }
    if (slides.length !== 1) fail(`第 ${index + 1} 页修改会产生分页，请减少表格行数或另建演示文稿`)
    const embedded = embedSlides(slides, next.assets, cwd)[0]
    next.slides[index] = { ...embedded, id: current.slides[index].id }
  }
  if (options.order !== undefined) {
    if (!Array.isArray(options.order) || options.order.length !== next.slides.length || options.order.some(id => typeof id !== 'string') || new Set(options.order).size !== next.slides.length) fail('order 必须包含每个页面 ID，且各出现一次')
    const byId = new Map(next.slides.map(slide => [slide.id, slide]))
    if (options.order.some(id => !byId.has(id))) fail('order 含有不属于本工程的页面 ID')
    next.slides = options.order.map(id => byId.get(id))
  }
  function selectedIds(value, field) {
    if (value === undefined) return new Set()
    if (!Array.isArray(value) || value.length === 0 || value.length > 120) fail(field + ' 需为 1-120 个页码或页面 ID')
    const ids = value.map(ref => {
      const slide = typeof ref === 'number' && Number.isInteger(ref) ? current.slides[ref - 1] : current.slides.find(s => s.id === ref)
      if (!slide) fail(field + ' 找不到页面：' + ref)
      return slide.id
    })
    if (new Set(ids).size !== ids.length) fail(field + ' 不能重复指定同一页')
    return new Set(ids)
  }
  const duplicate = selectedIds(options.duplicate, 'duplicate'), remove = selectedIds(options.remove, 'remove')
  if ([...duplicate].some(id => remove.has(id))) fail('同一页不能同时复制和删除')
  const count = next.slides.length + duplicate.size - remove.size
  if (count < 1) fail('至少保留一页')
  if (count > 120) fail('工程页数超过 120')
  if (duplicate.size || remove.size) next.slides = next.slides.flatMap(slide => remove.has(slide.id) ? [] :
    duplicate.has(slide.id) ? [slide, { ...clone(slide), id: randomUUID() }] : [slide])
  if (options.append !== undefined) {
    if (!Array.isArray(options.append) || options.append.length < 1 || options.append.length > 5) fail('append 需为 1-5 页')
    validateRawSlides(options.append)
    const added = next.dataModel ? prepareDataSlides(options.append, next.dataModel, normalizeSlides, next.language) : normalizeSlides(options.append, 120, next.language)
    if (next.slides.length + added.length > 120) fail('工程页数超过 120')
    next.slides.push(...embedSlides(added, next.assets, cwd).map(slide => ({ ...slide, id: randomUUID() })))
  }

  if (options.theme !== undefined) {
    const requestedTheme = String(options.theme ?? '').trim()
    if (!requestedTheme) fail('theme 不能为空')
    next.theme = requestedTheme === 'auto'
      ? inferThemeFromContent({ title: next.title, slides: next.slides, template: next.template }).theme
      : resolveTheme(requestedTheme).id
  }

  if (options.referencePptx !== undefined && options.referencePptx !== null && String(options.referencePptx).trim() !== '') {
    const absorbed = await absorbPptx({ pptxPath: String(options.referencePptx).trim(), cwd, extractLogo: true, signal: options.signal })
    if (options.theme === undefined) next.theme = absorbed.recommendedTheme
    const absorbedBrand = {
      ...absorbed.sanitizedBrand,
      ...(absorbed.recommendedChrome && !next.brand?.chromeStyle && !options.brand?.chromeStyle ? { chromeStyle: absorbed.recommendedChrome } : {}),
    }
    if (
      absorbed.sanitizedTokens?.coverMode === 'inverted-accent' &&
      resolveTheme(next.theme).tokens?.coverMode === 'inverted-accent' &&
      !options.brand?.backgroundColor
    ) {
      delete absorbedBrand.backgroundColor
    }
    next.brand = normalizeBrand({ ...next.brand, ...absorbedBrand }, next.assets, cwd)
  }

  if (options.brand !== undefined) {
    next.brand = normalizeBrand(options.brand === null ? null : { ...next.brand, ...options.brand,
      ...(options.brand?.logo === null ? { logo: undefined, logoAssetId: undefined } : {}) }, next.assets, cwd)
    if (next.brand && Object.keys(next.brand).length === 0) delete next.brand
  }
  if (options.saveAs !== true && JSON.stringify(snapshot(next)) === JSON.stringify(snapshot(current))) return { ...result(current, pathsFor(state.path)), changed: false }
  next.history = [...next.history, snapshot(current)].slice(-MAX_HISTORY)
  return { ...await saveRevision(state, next, options.signal, options.saveAs === true, options.preserveUndo === true), changed: true }
}

/** An AI-selected, bounded formatting vocabulary; always an undoable new copy. */
export async function repairDeckVisual(options = {}) {
  abort(options.signal)
  const state = readDocument(options.deckPath, options.cwd)
  expected(state.manifest, options.expectedRevision)
  const next = clone(state.manifest)
  next.slides = applyVisualActions(next, options.actions)
  // Splitting can move the only binding off a continuation page. Rebuild each
  // page's canonical template so plain fields do not remain falsely bound.
  if (next.dataModel) next.slides = next.slides.map(slide => ({ ...prepareDataSlides([slide], next.dataModel, normalizeSlides, next.language)[0], id: slide.id }))
  if (JSON.stringify(next.slides) === JSON.stringify(state.manifest.slides)) fail('排版操作没有变化 / Formatting actions made no changes')
  return saveRevision(state, next, options.signal, true, true)
}

export async function undoDeck(options = {}) {
  abort(options.signal)
  const state = readDocument(options.deckPath, options.cwd)
  expected(state.manifest, options.expectedRevision)
  if (!state.manifest.history.length) fail('该工程没有可撤销的修改')
  const next = clone(state.manifest), prior = next.history.pop()
  for (const key of ['brand', 'template', 'dataModel']) delete next[key]
  Object.assign(next, prior)
  return saveRevision(state, next, options.signal)
}

function dataChange(state, options) {
  expected(state.manifest, options.expectedRevision)
  const packet = options.scenario
  if (packet && (packet.schemaVersion !== 1 || packet.deckId !== state.manifest.deckId || packet.revision !== state.manifest.revision || packet.fingerprint !== state.manifest.dataModel?.fingerprint)) fail('推演参数来自其他工程或旧版本，请重新导出 / Scenario belongs to another project or revision')
  return previewDataChange(state.manifest, { ...options, ...(packet ? { parameters: packet.parameters } : {}) }, normalizeSlides)
}
export function previewDeckData(options = {}) {
  abort(options.signal)
  const state = readDocument(options.deckPath, options.cwd)
  return { ok: true, deckId: state.manifest.deckId, revision: state.manifest.revision, ...dataChange(state, options).preview }
}
export async function updateDeckData(options = {}) {
  abort(options.signal)
  const state = readDocument(options.deckPath, options.cwd), change = dataChange(state, options)
  if (options.confirmed !== true || options.expectedRevision === undefined || options.previewToken !== change.preview.token) fail('请先预览差异，再携带修订号与预览凭证确认 / Preview changes and confirm with the revision and preview token')
  if (!change.preview.changed) return { ...result(state.manifest, pathsFor(state.path)), changed: false }
  const next = { ...clone(state.manifest), dataModel: change.model, slides: change.slides, history: [...state.manifest.history, snapshot(state.manifest)].slice(-MAX_HISTORY) }
  return { ...await saveRevision(state, next, options.signal, options.saveAs !== false, true), changed: true }
}

export function checkDeck(options = {}) {
  abort(options.signal)
  const { manifest, path } = readDocument(options.deckPath, options.cwd)
  const quality = checkManifest(manifest), problem = artifactProblem(manifest, pathsFor(path))
  if (problem) {
    quality.issues.push({ slide: 0, severity: 'error', code: 'artifact-conflict', message: problem, suggestion: '保留原成品，使用 saveAs:true 或面板「另存副本」。副本不包含 Office 手工修改。' })
    quality.errorCount++; quality.ok = false
  }
  return { ...quality, deckPath: path, deckId: manifest.deckId, revision: manifest.revision,
    verification: { static: 'checked', pptxRender: 'not-verified', visual: 'not-verified' },
    undoAvailable: manifest.history.length, slides: manifest.slides.map((s, i) => ({ slide: i + 1, id: s.id, title: s.title, layout: s.layout })) }
}

export async function checkDeckAsync(options = {}) {
  const report = checkDeck(options)
  if (options.renderReceipt === undefined) return report
  if (typeof options.renderReceipt !== 'string' || !options.renderReceipt.trim()) fail('renderReceipt 需为收据文件路径')
  const { readRenderReceipt } = await import('./deck-render.mjs')
  abort(options.signal)
  report.render = await readRenderReceipt(pathsFor(report.deckPath).pptx, resolve(options.cwd || '.', options.renderReceipt))
  if (report.render.status === 'rendered') report.verification.pptxRender = 'rendered'
  return report
}

export async function renderDeck(options = {}) {
  abort(options.signal)
  if (typeof options.pptxPath !== 'string' || !options.pptxPath.trim()) fail('pptxPath 需为 PPTX 文件路径')
  if (options.outputDir !== undefined && (typeof options.outputDir !== 'string' || !options.outputDir.trim())) fail('outputDir 需为目录路径')
  const renderer = await import('./deck-render.mjs')
  abort(options.signal)
  const cwd = options.cwd || '.'
  return renderer.renderDeck({ ...options, pptxPath: resolve(cwd, options.pptxPath),
    ...(options.outputDir !== undefined ? { outputDir: resolve(cwd, options.outputDir) } : {}) })
}

function detectSlidesLanguage(slides, title) {
  const sample = [title, ...(slides || []).flatMap(s => [s.title, s.subtitle, ...(s.bullets || [])])].filter(Boolean).join(' ')
  const cjkCount = (sample.match(/[\u3400-\u9fff]/g) || []).length
  return cjkCount >= 4 ? 'zh' : 'en'
}

function findProjectJsonInDir(targetDir, cwd) {
  const dir = resolve(cwd, String(targetDir))
  if (extname(dir).toLowerCase() === '.json') return readDocument(dir, cwd)
  let entries
  try {
    entries = readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('.'))
  } catch {
    fail('找不到目标工程目录：' + dir)
  }
  entries.sort((a, b) => (a === 'project.json' ? -1 : b === 'project.json' ? 1 : a.localeCompare(b)))
  for (const name of entries) {
    try { return readDocument(join(dir, name), cwd) } catch { /* skip non-manifest json */ }
  }
  fail('目标目录中未找到有效的 dsh-ppt .json 工程：' + dir)
}

function sanitizeImportedSlideForSync(extractedSlide, priorSlide) {
  if (!priorSlide) return extractedSlide
  const merged = {
    ...extractedSlide,
    id: priorSlide.id,
  }
  // Keep prior visual/chrome/tableStyle tuning when layout category matches
  if (priorSlide.chrome && !merged.chrome) merged.chrome = priorSlide.chrome
  if (priorSlide.visual && !merged.visual) merged.visual = clone(priorSlide.visual)
  if (priorSlide.tableStyle && merged.layout === 'table' && !merged.tableStyle) merged.tableStyle = priorSlide.tableStyle
  if (priorSlide.variant && merged.layout === priorSlide.layout && !merged.variant) merged.variant = priorSlide.variant
  // Preserve dataTemplate provenance only if Office edits left bound content untouched
  if (priorSlide.dataTemplate) {
    const unchanged =
      merged.title === priorSlide.title &&
      JSON.stringify(merged.bullets ?? null) === JSON.stringify(priorSlide.bullets ?? null) &&
      JSON.stringify(merged.rows ?? null) === JSON.stringify(priorSlide.rows ?? null) &&
      JSON.stringify(merged.chart ?? null) === JSON.stringify(priorSlide.chart ?? null)
    if (unchanged) merged.dataTemplate = clone(priorSlide.dataTemplate)
  }
  return merged
}

/**
 * Full .pptx content importer, legacy deck refurbisher, and Office round-trip sync.
 * Mode A (new import / legacy modernization): writes standalone HTML, refurbished PPTX, JSON project (and optional .handout.md).
 * Mode B (sync onto targetProjectDir / deckPath): snapshots prior manifest into .history/ + manifest.history, updates slides, rebuilds deliverables.
 */
export async function importPptxDeck(options = {}) {
  abort(options.signal)
  const cwd = resolve(String(options.cwd ?? '.'))
  const hasTarget = Boolean(
    (typeof options.deckPath === 'string' && options.deckPath.trim()) ||
    (typeof options.targetProjectDir === 'string' && options.targetProjectDir.trim())
  )
  const modernize = options.modernize !== false
  const preserveSourceTheme = options.preserveSourceTheme === true
  const writeHandout = options.handout === true

  if (hasTarget) {
    // Mode B: Office Round-Trip Sync onto existing dsh-ppt project
    const state = options.deckPath
      ? readDocument(options.deckPath, cwd)
      : findProjectJsonInDir(options.targetProjectDir, cwd)
    const current = state.manifest
    const projectDir = dirname(state.path)
    const assetOutDir = options.assetOutDir ? resolve(cwd, String(options.assetOutDir)) : join(projectDir, 'assets')

    const extracted = await extractPptxSlides({
      pptxPath: options.pptxPath,
      bytes: options.bytes,
      cwd,
      assetOutDir,
      signal: options.signal,
    })

    // Write disk snapshot to .history/ AND push onto manifest.history so undoDeck / ppt_undo works 100%
    const historyDir = join(projectDir, '.history')
    mkdirSync(historyDir, { recursive: true })
    const histFile = join(historyDir, `${basename(state.path, '.json')}-rev${current.revision}-${Date.now()}.json`)
    writeFileSync(histFile, documentBytes(current), 'utf8')

    const next = clone(current)
    next.history = [...next.history, snapshot(current)].slice(-MAX_HISTORY)

    let syncSlides = extracted.slides
    if (modernize) {
      syncSlides = promoteMarkdownSlides(syncSlides, { explicitSmartLayout: false })
    }
    const mergedRaw = syncSlides.map((s, idx) => {
      const prior = current.slides[idx] || current.slides.find(p => p.title && p.title === s.title)
      return sanitizeImportedSlideForSync(s, prior)
    })
    validateRawSlides(mergedRaw)
    const normalizedSlides = normalizeSlides(mergedRaw, 120, next.language)
    const usedIds = new Set()
    const embedded = embedSlides(normalizedSlides, next.assets, cwd).map((s, idx) => {
      let id = mergedRaw[idx]?.id || randomUUID()
      if (usedIds.has(id)) id = randomUUID()
      usedIds.add(id)
      const dataTemplate = mergedRaw[idx]?.dataTemplate
      return { ...s, id, ...(dataTemplate ? { dataTemplate } : {}) }
    })
    next.slides = embedded

    if (options.theme && options.theme !== 'auto') {
      next.theme = resolveTheme(options.theme).id
    }
    if (options.chromeStyle) {
      next.brand = normalizeBrand({ ...(next.brand || {}), chromeStyle: options.chromeStyle }, next.assets, cwd)
    }
    if (preserveSourceTheme) {
      const absorbed = await absorbPptx({ pptxPath: options.pptxPath, bytes: options.bytes, cwd, extractLogo: true, signal: options.signal })
      next.brand = normalizeBrand({ ...(next.brand || {}), ...absorbed.sanitizedBrand, ...(options.chromeStyle ? { chromeStyle: options.chromeStyle } : {}) }, next.assets, cwd)
    }

    next.version = DECK_VERSION
    next.schemaVersion = 1
    next.revision = current.revision + 1

    const data = await generate(next, options.signal)
    const paths = pathsFor(state.path)
    withLock(state.path, () => {
      abort(options.signal)
      if (hash(readFileSync(state.path)) !== state.fingerprint) fail('工程已被其他操作修改，请重新读取后重试')
      commit(paths, data, writeHandout)
    })

    return {
      ...result(next, paths, writeHandout),
      importedFrom: options.pptxPath ? resolve(cwd, String(options.pptxPath)) : 'memory.pptx',
      syncedProject: true,
      historySnapshotPath: histFile,
      extractedStats: extracted.stats,
    }
  }

  // Mode A: New Import & Legacy Deck Modernization
  const rawOut = options.outDir ?? options.outputDir ?? (options.pptxPath ? dirname(resolve(cwd, String(options.pptxPath))) : '.')
  const resolvedOutDir = resolve(cwd, String(rawOut))
  const assetOutDir = options.assetOutDir ? resolve(cwd, String(options.assetOutDir)) : join(resolvedOutDir, 'assets')

  const extracted = await extractPptxSlides({
    pptxPath: options.pptxPath,
    bytes: options.bytes,
    cwd,
    assetOutDir,
    signal: options.signal,
  })

  let absorbed = null
  if (preserveSourceTheme) {
    absorbed = await absorbPptx({
      pptxPath: options.pptxPath,
      bytes: options.bytes,
      cwd,
      extractLogo: true,
      signal: options.signal,
    })
  }

  const rawSlides = modernize
    ? promoteMarkdownSlides(extracted.slides, { explicitSmartLayout: false })
    : extracted.slides

  const baseFileName = typeof options.pptxPath === 'string' && options.pptxPath.trim() && !basename(options.pptxPath).startsWith('.import-')
    ? basename(options.pptxPath, extname(options.pptxPath))
    : ''
  const title = (typeof options.title === 'string' && options.title.trim()) ||
    (extracted.title && extracted.title !== 'Imported Presentation' ? extracted.title : '') ||
    baseFileName ||
    'Imported Presentation'

  const lang = options.lang || detectSlidesLanguage(rawSlides, title)
  const requestedTheme = typeof options.theme === 'string' && options.theme.trim() ? options.theme.trim() : 'auto'
  const effectiveTheme = requestedTheme === 'auto' && preserveSourceTheme && absorbed
    ? absorbed.recommendedTheme
    : requestedTheme

  let brand = options.brand
  if (preserveSourceTheme && absorbed) {
    brand = {
      ...absorbed.sanitizedBrand,
      ...(absorbed.recommendedChrome ? { chromeStyle: absorbed.recommendedChrome } : {}),
      ...(options.chromeStyle ? { chromeStyle: options.chromeStyle } : {}),
      ...(options.brand && typeof options.brand === 'object' ? options.brand : {}),
    }
  } else if (options.chromeStyle) {
    brand = {
      ...(options.brand && typeof options.brand === 'object' ? options.brand : {}),
      chromeStyle: options.chromeStyle,
    }
  }

  const built = await buildDeckAsync({
    title,
    slides: rawSlides,
    theme: effectiveTheme,
    persona: options.persona || 'auto',
    lang,
    motion: options.motion,
    brand,
    outputDir: resolvedOutDir,
    fileName: options.fileName || baseFileName || title,
    overwrite: options.overwrite === true,
    smartLayout: false,
    handout: writeHandout,
    cwd,
    signal: options.signal,
  })

  return {
    ...built,
    importedFrom: options.pptxPath ? resolve(cwd, String(options.pptxPath)) : 'memory.pptx',
    syncedProject: false,
    extractedStats: extracted.stats,
  }
}

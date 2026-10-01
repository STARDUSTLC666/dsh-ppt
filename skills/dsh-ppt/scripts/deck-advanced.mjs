import { mkdirSync, readFileSync, statSync, openSync, closeSync, rmSync } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import { buildPptx, renderHtml, normalizeBuildOptions, normalizeSlides, resolveTheme, resolveLanguage, resolveDeckFileName, commitDeckArtifacts, DECK_VERSION, pptxEastAsianFont } from './deck-core.mjs'
import { MEDIA_LAYOUTS, mediaBoxes, LOGO_BOX, FOOTER_BOX, chartColors, normalizeChart } from './deck-media.mjs'
export { buildDeck, buildThemePreview, listThemes, resolveTheme, resolveLanguage } from './deck-core.mjs'

const MAX_IMAGE = 5 * 1024 * 1024, MAX_ASSETS = 32 * 1024 * 1024, MAX_DOCUMENT = 64 * 1024 * 1024
const MAX_HISTORY = 20
const layouts = new Set(['cover', 'section', 'bullets', 'statement', 'closing', 'quote', 'table', ...MEDIA_LAYOUTS])
const hash = data => createHash('sha256').update(data).digest('hex')
const clone = value => structuredClone(value)
function abort(signal) { signal?.throwIfAborted() }
function fail(message) { throw new Error('dsh-ppt：' + message) }

const scenarios = [
  { id: 'weekly', name: { zh: '工作周报', en: 'Weekly report' }, theme: 'data', sections: [['本周工作', 'This week'], ['完成情况', 'Progress'], ['问题与风险', 'Risks'], ['下周计划', 'Next week']] },
  { id: 'defense', name: { zh: '论文答辩', en: 'Thesis defense' }, theme: 'soft', sections: [['研究问题', 'Research question'], ['相关研究', 'Related work'], ['研究方法', 'Method'], ['研究结果', 'Results'], ['结论与局限', 'Conclusions and limitations']] },
  { id: 'project', name: { zh: '项目汇报', en: 'Project update' }, theme: 'swiss', sections: [['目标与范围', 'Goals and scope'], ['进度与交付', 'Progress and delivery'], ['数据与证据', 'Evidence'], ['风险与决策', 'Risks and decisions'], ['下一步', 'Next steps']] },
  { id: 'pitch', name: { zh: '项目路演', en: 'Pitch deck' }, theme: 'velvet', sections: [['用户问题', 'Customer problem'], ['解决方案', 'Solution'], ['产品与证据', 'Product and evidence'], ['商业模式', 'Business model'], ['计划与需求', 'Plan and ask']] },
]

export function listTemplates(lang = 'zh') {
  const language = resolveLanguage(lang).id === 'en' ? 'en' : 'zh'
  return scenarios.map(s => ({ id: s.id, name: s.name[language], theme: s.theme,
    outline: s.sections.map(p => p[language === 'en' ? 1 : 0]),
    slides: templateSlides(s, s.name[language], language) }))
}
function templateSlides(scenario, title, lang) {
  const en = lang === 'en'
  return [{ layout: 'cover', title, subtitle: en ? 'To fill: presenter and date' : '待填写：汇报人和日期' },
    ...scenario.sections.map(section => ({ layout: 'bullets', title: section[en ? 1 : 0], bullets: [en ? 'To fill: specific facts, evidence and next action' : '待填写：具体事实、依据与下一步行动'] })),
    { layout: 'closing', title: en ? 'Next action' : '下一步行动', subtitle: en ? 'To fill: owner and deadline' : '待填写：负责人和时间' }]
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
  } else fail(`${page} 图片仅支持 PNG / JPEG，请先转换格式`)
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
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(source)
    if (!match || source.length > MAX_IMAGE * 1.4) fail(`${page} 图片 data URI 无效或超过 5 MiB`)
    bytes = Buffer.from(match[2], 'base64')
  } else {
    if (!source || /^[a-z][a-z0-9+.-]*:/i.test(source) && !/^[a-z]:[\\/]/i.test(source)) fail(`${page} 图片需本地路径或 PNG/JPEG data URI，不支持外链`)
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

function normalizeBrand(input, assets, cwd) {
  if (input === undefined || input === null) return undefined
  if (typeof input !== 'object' || Array.isArray(input)) fail('brand 必须是对象')
  const brand = {}
  for (const key of ['primaryColor', 'backgroundColor', 'textColor']) {
    if (input[key] !== undefined && input[key] !== '') {
      if (!/^#[\da-f]{6}$/i.test(input[key])) fail(`brand.${key} 必须为 #RRGGBB`)
      brand[key] = input[key].toUpperCase()
    }
  }
  if (input.fontFamily) {
    const font = String(input.fontFamily).trim()
    if (font.length > 80 || !/^[\p{L}\p{N} _-]+$/u.test(font)) fail('brand.fontFamily 需单个字体名称，最多 80 字符')
    brand.fontFamily = font
  }
  if (input.name) brand.name = String(input.name).slice(0, 100)
  if (input.footer) {
    if (String(input.footer).length > 100) fail('brand.footer 最多 100 字符')
    brand.footer = String(input.footer)
  }
  if (input.logo) brand.logoAssetId = addAsset({ src: input.logo }, assets, cwd, '品牌 Logo')
  else if (input.logoAssetId) {
    if (!assets[input.logoAssetId]) fail('品牌 Logo 嵌入资产不存在')
    brand.logoAssetId = input.logoAssetId
  }
  return brand
}
function brandedTheme(manifest) {
  const theme = clone(resolveTheme(manifest.theme)), brand = manifest.brand
  if (brand?.primaryColor) theme.palette.accent = brand.primaryColor
  if (brand?.backgroundColor) theme.palette.bg = brand.backgroundColor
  if (brand?.textColor) theme.palette.fg = brand.textColor
  if (brand?.fontFamily) theme.fonts = { heading: brand.fontFamily, body: brand.fontFamily }
  return theme
}
function embedSlides(slides, assets, cwd) {
  return slides.map((slide, index) => {
    if (!slide.image) return slide
    const assetId = addAsset(slide.image, assets, cwd, `第 ${index + 1} 页`)
    const { src, ...image } = slide.image
    return { ...slide, image: { ...image, assetId } }
  })
}
function validateRawSlides(slides) {
  if (slides === undefined || slides === null) return
  if (!Array.isArray(slides)) fail('slides 必须是数组')
  slides.forEach((s, i) => {
    if (!s || typeof s !== 'object' || Array.isArray(s)) fail(`第 ${i + 1} 页必须是对象`)
    if (s.layout && !layouts.has(s.layout)) fail(`第 ${i + 1} 页未知布局 ${s.layout}`)
    if (s.chart && s.image) fail(`第 ${i + 1} 页不能同时放入 image 和 chart`)
    if (s.image && s.layout && !['image', 'image-left', 'image-right'].includes(s.layout)) fail(`第 ${i + 1} 页图片需使用 image / image-left / image-right 布局`)
    if (s.chart && s.layout && s.layout !== 'chart') fail(`第 ${i + 1} 页图表需使用 chart 布局`)
  })
}
function snapshot(manifest) {
  return clone(Object.fromEntries(['title', 'theme', 'language', 'motion', 'slides', 'brand', 'template'].filter(k => manifest[k] !== undefined).map(k => [k, manifest[k]])))
}
function collectAssets(manifest) {
  const ids = new Set()
  for (const state of [manifest, ...(manifest.history ?? [])]) {
    if (state.brand?.logoAssetId) ids.add(state.brand.logoAssetId)
    for (const slide of state.slides) if (slide.image?.assetId) ids.add(slide.image.assetId)
  }
  manifest.assets = Object.fromEntries([...ids].map(id => [id, manifest.assets[id]]))
  const size = Object.values(manifest.assets).reduce((sum, asset) => sum + (asset?.data?.length ?? 0), 0)
  if (size > MAX_ASSETS * 1.4) fail('工程内图片总量超过 32 MiB，请压缩图片或减少图片')
}

function embeddedAssetError(asset, id) {
  try {
    if (!asset || typeof asset.data !== 'string' || asset.data.length > MAX_IMAGE * 1.4) fail('嵌入图片数据缺失或过大')
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(asset.data)
    if (!match) fail('嵌入图片格式无效')
    const bytes = Buffer.from(match[2], 'base64')
    if (bytes.length > MAX_IMAGE || bytes.toString('base64') !== match[2]) fail('嵌入图片编码无效或过大')
    const info = imageInfo(bytes, '嵌入图片')
    if (asset.width !== info.width || asset.height !== info.height || asset.mime !== info.mime || id !== 'img-' + hash(bytes)) fail('嵌入图片尺寸或内容摘要不匹配')
    return undefined
  } catch (error) { return error.message }
}

// This is a conservative fit estimate. Fonts and PowerPoint/WPS rendering still need visual inspection.
function textWidth(text) { return [...String(text ?? '')].reduce((n, c) => n + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0) }
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
    const titleLimit = ['cover', 'closing', 'statement', 'quote', 'section'].includes(slide.layout) ? 40 : 24
    if (textWidth(slide.title) > titleLimit) issue(i, 'title-overflow', '标题可能换行过多或超过标题区域', '缩短标题，把解释移入正文')
    const mixed = ['image-left', 'image-right'].includes(slide.layout), bullets = slide.bullets ?? []
    if (bullets.length > (mixed ? 5 : 8)) issue(i, 'dense-bullets', `本页有 ${bullets.length} 条要点，放映时过密`, '减少要点或拆成多页')
    const width = mixed ? 19 : 37
    const lines = bullets.reduce((sum, b) => sum + Math.max(1, Math.ceil(textWidth(b) / width)), 0)
      + (slide.subtitle ? Math.ceil(textWidth(slide.subtitle) / width) : 0)
    if (lines > (mixed ? 9 : 11)) issue(i, 'body-overflow', '正文估计超过可用高度', '先精简文字，再分拆页面，避免继续缩小字体')
    if ([slide.title, slide.subtitle, ...bullets].some(s => /待填写|To fill:/i.test(String(s)))) issue(i, 'template-unfilled', '模板中还有待填写内容', '提供实际事实、依据和行动，填完后重新检查')
    if (slide.layout === 'table') {
      if ((slide.rows?.[0]?.length ?? 0) > 6) issue(i, 'small-font', '表格超过 6 列，使用 14pt，小屏放映可能难以阅读', '减少列数或把重点数据改成图表，导出后检查可读性')
      if (slide.rows?.some(row => row.some(c => textWidth(c) > 18))) issue(i, 'table-density', '表格单元格文字较长，可能换行拥挤', '精简单元格或减少列数')
    }
    if (slide.image) {
      const asset = manifest.assets?.[slide.image.assetId], box = mediaBoxes(slide.layout).image
      if (!asset) issue(i, 'missing-image', '找不到本页的嵌入图片', '重新指定图片路径后编辑本页', 'error')
      else {
        if (assetError(slide.image.assetId)) issue(i, 'invalid-image', assetError(slide.image.assetId), '重新提供本地图片后编辑该页', 'error')
        if (asset.width < box.w * 100 || asset.height < box.h * 100) issue(i, 'low-resolution', `图片为 ${asset.width}×${asset.height}，放大后可能模糊`, '换成更高分辨率图片；Logo 等小图可忽略此提示')
      }
      if (!slide.image.alt?.trim()) issue(i, 'missing-alt', '图片没有说明文字', '填写 image.alt，方便读屏及理解图片')
    }
    if (slide.chart) {
      try { normalizeChart(slide.chart, i + 1) } catch (error) { issue(i, 'invalid-chart', error.message, '修正图表类别和数值', 'error') }
      if (slide.chart.categories?.length > 10 || slide.chart.categories?.some(c => textWidth(c) > 10)) issue(i, 'chart-density', '图表类别较多或标签较长，可能相互遮挡', '减少类别，或使用横向条形图')
      if (slide.chart.series?.some(s => textWidth(s.name) > 14)) issue(i, 'chart-legend', '图例名称较长', '精简系列名称并检查渲染')
    }
    if (contrast(theme.palette.bg, theme.palette.fg) < 4.5) issue(i, 'low-contrast', '正文与背景对比度低于 4.5:1', '调整品牌背景色或文字色')
  })
  if (manifest.brand?.logoAssetId && !manifest.assets?.[manifest.brand.logoAssetId]) issue(0, 'missing-logo', '品牌 Logo 资产不存在', '重新提供 Logo', 'error')
  else if (manifest.brand?.logoAssetId && assetError(manifest.brand.logoAssetId)) issue(0, 'invalid-logo', assetError(manifest.brand.logoAssetId), '重新提供 Logo', 'error')
  return { ok: !issues.some(i => i.severity === 'error'), slideCount: manifest.slides.length,
    errorCount: issues.filter(i => i.severity === 'error').length, warningCount: issues.filter(i => i.severity === 'warning').length,
    issues, note: '文字尺寸与溢出为静态估算；最终请检查 HTML 放映和 PowerPoint / WPS 实际显示。页脚和页码的小字号不计入正文检查。' }
}

async function exportPptx(manifest, theme, language, signal) {
  const base = buildPptx(manifest, theme, language)
  if (!manifest.brand?.logoAssetId && !manifest.brand?.footer && !manifest.slides.some(s => s.image || s.chart)) return base
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
    const slide = slides[index], boxes = mediaBoxes(source.layout)
    if (source.image) putImage(slide, source.image.assetId, boxes.image, source.image.fit, 'Slide image', source.image.alt)
    if (source.chart) {
      const colors = chartColors(theme), font = pptxEastAsianFont(theme.fonts.body)
      const style = { font, sizePt: 17, color: theme.palette.fg }
      lib.addSlideChart(slide, { ...emu(boxes.chart), name: 'Editable data chart', spec: {
        kind: source.chart.kind, categories: source.chart.categories,
        series: source.chart.series.map((s, i) => ({ ...s, color: colors[i], ...(source.chart.kind === 'pie' ? { pointColors: source.chart.categories.map((_, j) => colors[j % colors.length]) } : {}) })),
        chartAreaFill: theme.palette.bg, chartAreaStrokeColor: theme.palette.bg, plotAreaFill: theme.palette.bg,
        categoryAxisLabelStyle: style, valueAxisLabelStyle: style,
        valueAxisMinorTickMark: 'none', categoryAxisMinorTickMark: 'none', valueAxisMajorTickMark: 'none', categoryAxisMajorTickMark: 'none',
        valueAxisMajorGridlines: true, valueAxisMajorGridlineColor: theme.palette.panel,
        ...(source.chart.kind === 'bar' ? { categoryAxisOrientation: 'maxMin', valueAxisCrosses: 'max' } : {}),
        ...(source.chart.kind === 'pie' ? { dataLabels: { showPercent: true, showValue: false, showCategory: false, showSeriesName: false, numberFormat: '0.0%', position: 'bestFit', textStyle: style } } : {}),
        ...(source.chart.unit ? { valueAxisTitle: source.chart.unit, valueAxisTitleStyle: style } : {}),
        legend: { position: 'b', textStyle: style },
      } })
    }
    if (manifest.brand?.logoAssetId) putImage(slide, manifest.brand.logoAssetId, LOGO_BOX, 'contain', 'Brand logo', manifest.brand.name)
    if (manifest.brand?.footer) {
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
function result(manifest, paths) {
  return { ok: true, title: manifest.title, theme: manifest.theme, language: manifest.language,
    slideCount: manifest.slides.length, deckId: manifest.deckId, revision: manifest.revision,
    slides: manifest.slides.map((s, i) => ({ slide: i + 1, id: s.id, title: s.title, layout: s.layout })),
    undoAvailable: manifest.history.length, deliveryStatus: manifest.quality?.issues.some(i => i.code === 'template-unfilled') ? 'draft' : 'ready-for-review',
    quality: manifest.quality, verification: { static: 'checked', pptxRender: 'not-verified', visual: 'not-verified' }, outputDir: dirname(paths.json),
    files: paths, htmlPath: paths.html, pptxPath: paths.pptx, jsonPath: paths.json }
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
  collectAssets(manifest)
  manifest.slideCount = manifest.slides.length
  manifest.quality = checkManifest(manifest)
  if (manifest.quality.errorCount) fail(manifest.quality.issues.filter(i => i.severity === 'error').map(i => `第 ${i.slide} 页：${i.message}`).join('；'))
  const theme = brandedTheme(manifest), language = resolveLanguage(manifest.language)
  const json = documentBytes(manifest), html = renderHtml(manifest, theme, language)
  const pptx = await exportPptx(manifest, theme, language, signal)
  abort(signal)
  return { json, html, pptx }
}
function commit(paths, data) {
  commitDeckArtifacts([{ path: paths.json, data: data.json, encoding: 'utf8' }, { path: paths.html, data: data.html, encoding: 'utf8' }, { path: paths.pptx, data: data.pptx }])
}

export async function buildDeckAsync(options = {}) {
  abort(options.signal)
  validateRawSlides(options.slides)
  const scenario = options.template ? scenarios.find(s => s.id === options.template) : undefined
  if (options.template && !scenario) fail('未知 template，请使用 weekly / defense / project / pitch')
  const input = { ...options, theme: options.theme || scenario?.theme,
    ...(!options.content?.trim() && !options.slides?.length && scenario ? { slides: templateSlides(scenario, String(options.title ?? ''), options.lang) } : {}) }
  const normalized = normalizeBuildOptions(input), cwd = resolve(options.cwd || '.')
  const assets = {}
  const brand = normalizeBrand(options.brand, assets, cwd)
  const manifest = { version: DECK_VERSION, schemaVersion: 1, deckId: randomUUID(), revision: 0,
    title: normalized.title, theme: normalized.theme.id, language: normalized.language.id, motion: normalized.motion,
    ...(scenario ? { template: scenario.id } : {}), ...(brand ? { brand } : {}), assets, history: [],
    slides: embedSlides(normalized.deck.slides, assets, cwd).map(s => ({ ...s, id: randomUUID() })) }
  const data = await generate(manifest, options.signal)
  mkdirSync(normalized.outputDir, { recursive: true })
  // Resolve collisions after asynchronous rendering; an earlier call may have committed meanwhile.
  const file = resolveDeckFileName(normalized.outputDir, normalized.fileName, normalized.overwrite)
  const paths = pathsFor(resolve(normalized.outputDir, file + '.json'))
  withLock(paths.json, () => { abort(options.signal); commit(paths, data) })
  return result(manifest, paths)
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
  const ids = new Set()
  for (const slide of document.slides) {
    if (!slide || !layouts.has(slide.layout)) fail('工程含有未知页面布局')
    slide.id ||= randomUUID()
    if (ids.has(slide.id)) fail('工程含有重复页面 ID')
    ids.add(slide.id)
  }
  return { manifest: document, path, fingerprint: hash(bytes) }
}
function expected(manifest, revision) {
  if (revision !== undefined && (!Number.isInteger(revision) || revision !== manifest.revision)) fail(`修订号冲突：当前 revision=${manifest.revision}，请重新读取工程后修改`)
}
async function saveRevision(state, next, signal) {
  next.version = DECK_VERSION; next.schemaVersion = 1; next.revision = state.manifest.revision + 1
  const data = await generate(next, signal), paths = pathsFor(state.path)
  withLock(state.path, () => {
    abort(signal)
    if (hash(readFileSync(state.path)) !== state.fingerprint) fail('工程已被其他操作修改，请重新读取后重试')
    commit(paths, data)
  })
  return result(next, paths)
}

export async function editDeck(options = {}) {
  abort(options.signal)
  const state = readDocument(options.deckPath, options.cwd), current = state.manifest
  expected(current, options.expectedRevision)
  const next = clone(current)
  if (!Array.isArray(options.edits) || !options.edits.length) {
    if (options.brand === undefined) fail('请提供 edits 或 brand')
  }
  const used = new Set(), allowed = new Set(['layout', 'title', 'subtitle', 'kicker', 'text', 'bullets', 'rows', 'notes', 'image', 'chart'])
  for (const edit of options.edits ?? []) {
    const index = typeof edit.slide === 'number' && Number.isInteger(edit.slide) ? edit.slide - 1 : next.slides.findIndex(s => s.id === edit.slide)
    if (index < 0 || index >= next.slides.length) fail('找不到要修改的页面：' + edit.slide)
    if (used.has(index)) fail('一次修改不能重复指定同一页：' + (index + 1))
    used.add(index)
    if (!edit.patch || typeof edit.patch !== 'object' || Array.isArray(edit.patch)) fail('第 ' + (index + 1) + ' 页 patch 需为对象')
    for (const key of Object.keys(edit.patch)) if (!allowed.has(key)) fail('不支持修改页面字段：' + key)
    validateRawSlides([edit.patch])
    const changed = { ...next.slides[index], ...edit.patch }
    for (const key of Object.keys(changed)) if (changed[key] === null) delete changed[key]
    if (edit.patch.chart) { if (!edit.patch.layout) changed.layout = 'chart'; if (changed.layout === 'chart') delete changed.image }
    if (edit.patch.image) { if (!edit.patch.layout && !['image', 'image-left', 'image-right'].includes(changed.layout)) changed.layout = 'image-right'; if (['image', 'image-left', 'image-right'].includes(changed.layout)) delete changed.chart }
    if (edit.patch.layout && !MEDIA_LAYOUTS.has(edit.patch.layout)) { delete changed.image; delete changed.chart }
    validateRawSlides([changed])
    let slides
    try { slides = normalizeSlides([changed], 120, next.language) } catch (error) { fail(`第 ${index + 1} 页修改失败：${error.message}`) }
    if (slides.length !== 1) fail(`第 ${index + 1} 页修改会产生分页，请减少表格行数或另建演示文稿`)
    const embedded = embedSlides(slides, next.assets, resolve(options.cwd || '.'))[0]
    next.slides[index] = { ...embedded, id: current.slides[index].id }
  }
  if (options.brand !== undefined) next.brand = normalizeBrand(options.brand === null ? null : { ...next.brand, ...options.brand,
    ...(options.brand?.logo === null ? { logo: undefined, logoAssetId: undefined } : {}) }, next.assets, resolve(options.cwd || '.'))
  if (JSON.stringify(snapshot(next)) === JSON.stringify(snapshot(current))) return { ...result(current, pathsFor(state.path)), changed: false }
  next.history = [...next.history, snapshot(current)].slice(-MAX_HISTORY)
  return { ...await saveRevision(state, next, options.signal), changed: true }
}

export async function undoDeck(options = {}) {
  abort(options.signal)
  const state = readDocument(options.deckPath, options.cwd)
  expected(state.manifest, options.expectedRevision)
  if (!state.manifest.history.length) fail('该工程没有可撤销的修改')
  const next = clone(state.manifest), prior = next.history.pop()
  for (const key of ['brand', 'template']) delete next[key]
  Object.assign(next, prior)
  return saveRevision(state, next, options.signal)
}

export function checkDeck(options = {}) {
  abort(options.signal)
  const { manifest, path } = readDocument(options.deckPath, options.cwd)
  return { ...checkManifest(manifest), deckPath: path, deckId: manifest.deckId, revision: manifest.revision,
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

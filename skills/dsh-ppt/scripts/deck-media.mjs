// Shared geometry, media framing, and publication-grade chart compilers (SVG + OOXML + @office-kit/pptx).
import { resolveChromeStyle } from './deck-themes.mjs'
import { getChromeConfig, computeBadgePillWidth, roundRectAdj } from './deck-layouts.mjs'
import { resolveActiveTaste } from './deck-taste.mjs'

export const MEDIA_LAYOUTS = new Set(['image', 'image-left', 'image-right', 'chart', 'chart-split'])
export const CHART_KINDS = Object.freeze([
  'column', 'bar', 'stacked-column', 'stacked-bar', 'percent-column', 'percent-bar',
  'line', 'area', 'pie', 'doughnut', 'scatter', 'combo', 'waterfall',
])
export const CANVAS = { w: 13.3333333333, h: 7.5 }
export const LOGO_BOX = { x: 11.55, y: 0.18, w: 0.95, h: 0.42 }
export const FOOTER_BOX = { x: 0.65, y: 6.98, w: 9.2, h: 0.28 }

function hasChartAnnotationStrip(slide, manifest = {}) {
  if (!slide?.chart || slide.chart.kind === 'waterfall') return false
  if (slide.layout !== 'chart' && slide.layout !== 'chart-split') return false
  const c = slide.chart
  if (c.referenceLine && Number.isFinite(c.referenceLine.value)) return true
  if (c.callout?.label) return true
  const taste = resolveActiveTaste(manifest, slide)
  if ((c.showGrowthCallout || taste.chartGrowthCallout) && ['column', 'bar', 'line', 'area', 'combo'].includes(c.kind)) {
    const vals = c.series?.[0]?.values || []
    if (vals.length >= 2 && Math.abs(vals[0]) > 1e-9) return true
  }
  return false
}

export function mediaBoxes(layout, variantInput, slide = {}, manifest = {}) {
  const variant = String(variantInput ?? slide?.variant ?? '').trim().toLowerCase()
  const hasTakeaway = Boolean(slide?.takeaway && String(slide.takeaway).trim())
  const hasCaption = Boolean((slide?.image?.caption && String(slide.image.caption).trim()) || (slide?.chart?.caption && String(slide.chart.caption).trim()))
  const annotReserve = hasChartAnnotationStrip(slide, manifest) ? 0.36 : 0
  const bottomLimit = hasTakeaway ? (hasCaption ? 5.80 : 6.04) : 6.42
  const bodyTop = 1.68
  const bodyH = +(bottomLimit - bodyTop).toFixed(3)
  const title = { x: 0.65, y: 0.52, w: 12.03, h: 0.88 }
  const kicker = { x: 0.65, y: 0.28, w: 10.5, h: 0.24 }
  const takeaway = { x: 0.62, y: 6.26, w: 12.09, h: 0.54 }
  const fullCaption = { x: 0.65, y: hasTakeaway ? 5.86 : 6.46, w: 12.03, h: 0.30 }

  if (layout === 'image' && variant === 'full-bleed') {
    return {
      kicker,
      title: { x: 0.65, y: hasTakeaway ? 4.95 : 5.35, w: 10.6, h: 1.02 },
      image: { x: 0, y: 0, w: CANVAS.w, h: CANVAS.h },
      body: null,
      chart: { x: 0.65, y: bodyTop, w: 12.03, h: bodyH },
      caption: { x: 0.65, y: hasTakeaway ? 5.98 : 6.52, w: 10.6, h: 0.26 },
      takeaway,
    }
  }

  if ((layout === 'image-left' || layout === 'image-right') && variant === 'split-bleed') {
    const imgLeft = layout === 'image-left'
    const colX = imgLeft ? 6.85 : 0.65
    return {
      kicker: { x: colX, y: 0.44, w: 5.8, h: 0.26 },
      title: { x: colX, y: 0.76, w: 5.8, h: 1.05 },
      image: imgLeft ? { x: 0, y: 0, w: 6.25, h: CANVAS.h } : { x: 7.08, y: 0, w: 6.253, h: CANVAS.h },
      body: { x: colX, y: 2.02, w: 5.8, h: hasTakeaway ? (hasCaption ? 3.62 : 3.98) : 4.42 },
      chart: { x: 0.65, y: bodyTop, w: 12.03, h: bodyH },
      caption: { x: colX, y: hasTakeaway ? 5.76 : 6.52, w: 5.8, h: 0.28 },
      takeaway: { x: colX, y: 6.14, w: 5.8, h: 0.54 },
    }
  }

  if (layout === 'chart-split') {
    const chartRight = variant === 'chart-right'
    const chartBox = chartRight
      ? { x: 5.32, y: +(bodyTop + annotReserve).toFixed(3), w: 7.36, h: +(bodyH - annotReserve).toFixed(3) }
      : { x: 0.65, y: +(bodyTop + annotReserve).toFixed(3), w: 7.36, h: +(bodyH - annotReserve).toFixed(3) }
    const sideBox = chartRight
      ? { x: 0.65, y: bodyTop, w: 4.35, h: bodyH }
      : { x: 8.33, y: bodyTop, w: 4.35, h: bodyH }
    return {
      kicker,
      title,
      image: chartBox,
      body: sideBox,
      chart: chartBox,
      caption: { x: chartBox.x, y: hasTakeaway ? 5.86 : 6.46, w: chartBox.w, h: 0.30 },
      takeaway,
    }
  }

  const left = { x: 0.65, y: bodyTop, w: 5.76, h: bodyH }
  const right = { x: 6.92, y: bodyTop, w: 5.76, h: bodyH }
  const full = { x: 0.65, y: bodyTop, w: 12.03, h: bodyH }
  const imageTarget = layout === 'image-left' ? left : layout === 'image-right' ? right : full
  const galleryCount = Array.isArray(slide?.images) && slide.images.length > 1 ? Math.min(4, slide.images.length) : 0
  const gallery = galleryCount > 1
    ? Array.from({ length: galleryCount }, (_, idx) => {
        const gap = 0.24
        const cellW = (full.w - gap * (galleryCount - 1)) / galleryCount
        return { x: +(full.x + idx * (cellW + gap)).toFixed(4), y: full.y, w: +cellW.toFixed(4), h: +(bodyH - 0.25).toFixed(4) }
      })
    : null

  const captionBox = (layout === 'image-left' || layout === 'image-right')
    ? { x: imageTarget.x, y: hasTakeaway ? 5.86 : 6.46, w: imageTarget.w, h: 0.30 }
    : fullCaption

  return {
    kicker,
    title,
    image: { ...imageTarget, h: +(bodyH - 0.14).toFixed(3) },
    gallery,
    body: layout === 'image-left' ? right : layout === 'image-right' ? left : null,
    chart: { ...full, y: +(full.y + annotReserve).toFixed(3), h: +(bodyH - 0.12 - annotReserve).toFixed(3) },
    caption: captionBox,
    takeaway,
  }
}

function textUnits(text) {
  let units = 0
  for (const ch of String(text ?? '')) {
    units += /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch) ? 1 : 0.55
  }
  return units
}

function numeric(value, page) {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) {
    throw new Error(`dsh-ppt：第 ${page} 页图表有非数值数据：${String(value).slice(0, 40)}`)
  }
  const result = Number(value)
  if (!Number.isFinite(result)) throw new Error(`dsh-ppt：第 ${page} 页图表数值必须有限`)
  return result
}

function normalizeHighlight(highlight, categoryCount) {
  if (highlight === undefined || highlight === null || highlight === '' || highlight === 'none') return undefined
  if (highlight === 'max' || highlight === 'last' || highlight === 'min') return highlight
  if (typeof highlight === 'number') {
    if (!Number.isInteger(highlight) || highlight < 0 || highlight >= categoryCount) return undefined
    return highlight
  }
  if (Array.isArray(highlight)) {
    const valid = highlight.filter(n => Number.isInteger(n) && n >= 0 && n < categoryCount)
    return valid.length ? [...new Set(valid)] : undefined
  }
  return undefined
}

export function normalizeChart(input, page = 1) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`dsh-ppt：第 ${page} 页缺少 chart 对象`)
  let kind = String(input.kind ?? 'column').trim().toLowerCase()
  if (kind === 'percent-stacked') kind = 'percent-column'
  if (kind === 'donut') kind = 'doughnut'
  if (!CHART_KINDS.includes(kind)) throw new Error(`dsh-ppt：第 ${page} 页未知图表类型 ${kind}`)

  let categories = input.categories
  let series = input.series
  if (input.rows !== undefined) {
    const rows = input.rows
    if (!Array.isArray(rows) || rows.length < 2 || !Array.isArray(rows[0]) || rows[0].length < 2
      || rows.some(row => !Array.isArray(row) || row.length !== rows[0].length)) {
      throw new Error(`dsh-ppt：第 ${page} 页图表 rows 需包含表头、类别和数值列，各行列数一致`)
    }
    categories = rows.slice(1).map(row => row[0])
    series = rows[0].slice(1).map((name, column) => ({ name, values: rows.slice(1).map(row => row[column + 1]) }))
  }

  if (kind === 'scatter' && (!Array.isArray(categories) || categories.length === 0) && Array.isArray(series) && series[0]?.values?.length) {
    categories = series[0].values.map((_, idx) => String(series[0].xValues?.[idx] ?? idx + 1))
  }

  if (!Array.isArray(categories) || categories.length < 1 || categories.length > 24 || categories.some(c => String(c ?? '').trim() === '')) {
    throw new Error(`dsh-ppt：第 ${page} 页图表需 1–24 个非空类别`)
  }
  if (!Array.isArray(series) || series.length < 1 || series.length > 6) {
    throw new Error(`dsh-ppt：第 ${page} 页图表需 1–6 个数据系列`)
  }

  // Auto horizontal bar orientation for very long category labels unless caller explicitly locked vertical
  if (kind === 'column' && input.keepVertical !== true && categories.some(c => textUnits(c) > 9.5)) {
    kind = 'bar'
  }

  const clean = series.map((s, i) => {
    if (!s || !Array.isArray(s.values) || s.values.length !== categories.length) {
      throw new Error(`dsh-ppt：第 ${page} 页图表第 ${i + 1} 个系列与类别数量不一致`)
    }
    const item = {
      name: String(s.name ?? `系列 ${i + 1}`).trim() || `系列 ${i + 1}`,
      values: s.values.map(v => numeric(v, page)),
    }
    if (kind === 'scatter') {
      const rawX = Array.isArray(s.xValues) && s.xValues.length === categories.length
        ? s.xValues.map(v => numeric(v, page))
        : categories.map((cat, idx) => {
            const parsed = Number(String(cat).trim())
            return Number.isFinite(parsed) ? parsed : idx + 1
          })
      item.xValues = rawX
    }
    if (kind === 'combo') {
      const sub = s.chartKind && ['column', 'line', 'area', 'bar'].includes(s.chartKind)
        ? s.chartKind
        : (i === 0 ? 'column' : 'line')
      item.chartKind = sub
      if (s.secondaryAxis === true && i > 0) item.secondaryAxis = true
    }
    return item
  })

  if ((kind === 'pie' || kind === 'doughnut') && (clean.length !== 1 || categories.length > 12 || clean[0].values.some(v => v < 0) || clean[0].values.reduce((a, b) => a + b, 0) <= 0)) {
    throw new Error(`dsh-ppt：第 ${page} 页饼图只支持一个系列、最多 12 个类别，数值需非负且总和大于零`)
  }
  if (kind === 'waterfall' && clean.length !== 1) {
    throw new Error(`dsh-ppt：第 ${page} 页瀑布图只支持单个数据系列`)
  }

  const highlight = normalizeHighlight(input.highlight, categories.length)
  const totalIndices = Array.isArray(input.totalIndices)
    ? input.totalIndices.filter(n => Number.isInteger(n) && n >= 0 && n < categories.length)
    : undefined
  const rawRef = input.referenceLine && typeof input.referenceLine === 'object' ? input.referenceLine : null
  const refVal = rawRef ? Number(rawRef.value) : NaN
  const referenceLine = Number.isFinite(refVal)
    ? {
        value: refVal,
        ...(rawRef.label ? { label: String(rawRef.label).trim() } : {}),
        ...(rawRef.color ? { color: String(rawRef.color).trim() } : {}),
      }
    : undefined
  const rawCallout = input.callout && typeof input.callout === 'object' ? input.callout : null
  const callout = rawCallout && String(rawCallout.label ?? '').trim()
    ? {
        label: String(rawCallout.label).trim(),
        ...(Number.isInteger(rawCallout.fromIndex) ? { fromIndex: rawCallout.fromIndex } : {}),
        ...(Number.isInteger(rawCallout.toIndex) ? { toIndex: rawCallout.toIndex } : {}),
      }
    : undefined

  return {
    kind,
    categories: categories.map(c => String(c).trim()),
    series: clean,
    ...(highlight !== undefined ? { highlight } : {}),
    ...(typeof input.spotlight === 'boolean' ? { spotlight: input.spotlight } : {}),
    ...(typeof input.showGrowthCallout === 'boolean' ? { showGrowthCallout: input.showGrowthCallout } : {}),
    ...(referenceLine ? { referenceLine } : {}),
    ...(callout ? { callout } : {}),
    ...(typeof input.showValues === 'boolean' ? { showValues: input.showValues } : {}),
    ...(typeof input.showLegend === 'boolean' ? { showLegend: input.showLegend } : {}),
    ...(totalIndices?.length ? { totalIndices } : {}),
    ...(input.unit ? { unit: String(input.unit).trim() } : {}),
    ...(input.caption ? { caption: String(input.caption).trim() } : {}),
    ...(input.source ? { source: String(input.source).trim() } : {}),
  }
}

function normalizeSingleImage(raw, fallbackAlt, page, defaultFit = 'contain') {
  const image = typeof raw === 'string' ? { src: raw } : raw
  if (!image || typeof image !== 'object' || (!image.src && !image.assetId)) {
    throw new Error(`dsh-ppt：第 ${page} 页缺少 image.src`)
  }
  const fit = image.fit ?? defaultFit
  if (!['contain', 'cover'].includes(fit)) {
    throw new Error(`dsh-ppt：第 ${page} 页 image.fit 仅支持 contain / cover`)
  }
  return {
    ...(image.src ? { src: String(image.src) } : {}),
    ...(image.assetId ? { assetId: String(image.assetId) } : {}),
    alt: String(image.alt ?? fallbackAlt ?? ''),
    fit,
    ...(image.caption ? { caption: String(image.caption) } : {}),
  }
}

function normalizeItemsAlias(source) {
  const rawList = source.items ?? source.cards ?? source.metrics ?? source.steps ?? source.columns ?? source.quadrants
  if (!Array.isArray(rawList) || rawList.length === 0) return undefined
  return rawList
    .filter(item => item && typeof item === 'object')
    .slice(0, 8)
    .map(item => ({
      ...(item.tag || item.badge ? { tag: String(item.tag ?? item.badge).trim() } : {}),
      ...(item.title ? { title: String(item.title).trim() } : {}),
      ...(item.text || item.body ? { text: String(item.text ?? item.body).trim() } : {}),
      ...(item.value !== undefined && item.value !== null && String(item.value).trim() !== '' ? { value: String(item.value).trim() } : {}),
      ...(item.unit ? { unit: String(item.unit).trim() } : {}),
      ...(item.delta ? { delta: String(item.delta).trim() } : {}),
      ...(item.status || item.tone ? { status: String(item.status ?? item.tone).trim() } : {}),
      ...(Array.isArray(item.bullets) ? { bullets: item.bullets.map(b => String(b).trim()).filter(Boolean) } : {}),
    }))
}

export function normalizeMediaSlide(source, normalized, index) {
  if (!MEDIA_LAYOUTS.has(normalized.layout)) return normalized
  const page = index + 1
  const variant = source.variant ? String(source.variant).trim() : undefined
  const takeaway = source.takeaway ? String(source.takeaway).trim() : undefined
  const slideSource = source.source ? String(source.source).trim() : undefined
  const items = normalized.items ?? normalizeItemsAlias(source)
  const extras = {
    ...(variant ? { variant } : {}),
    ...(takeaway ? { takeaway } : {}),
    ...(slideSource ? { source: slideSource } : {}),
    ...(items ? { items } : {}),
  }

  if (normalized.layout === 'chart' || normalized.layout === 'chart-split') {
    const chartInput = source.layout === 'waterfall' && source.chart
      ? { ...source.chart, kind: 'waterfall' }
      : source.chart
    const chart = normalizeChart(chartInput, page)
    return { ...normalized, ...extras, chart }
  }

  const defaultFit = variant === 'split-bleed' || variant === 'full-bleed' || variant === 'gallery' ? 'cover' : 'contain'
  if (Array.isArray(source.images) && source.images.length > 0) {
    const images = source.images.slice(0, 4).map(img => normalizeSingleImage(img, normalized.title, page, defaultFit))
    return {
      ...normalized,
      ...extras,
      variant: variant || (images.length > 1 ? 'gallery' : undefined),
      image: source.image ? normalizeSingleImage(source.image, normalized.title, page, defaultFit) : images[0],
      images,
    }
  }

  return {
    ...normalized,
    ...extras,
    image: normalizeSingleImage(source.image, normalized.title, page, defaultFit),
  }
}

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const position = box => `left:${(box.x / CANVAS.w * 100).toFixed(4)}%;top:${(box.y / CANVAS.h * 100).toFixed(4)}%;width:${(box.w / CANVAS.w * 100).toFixed(4)}%;height:${(box.h / CANVAS.h * 100).toFixed(4)}%`

export function chartColors(theme) {
  if (Array.isArray(theme?.tokens?.chartSeries) && theme.tokens.chartSeries.length >= 6) {
    return [...theme.tokens.chartSeries]
  }
  const accent = theme?.palette?.accent || '#0057B8'
  const accent2 = theme?.palette?.accent2 || '#0E7490'
  return [accent, accent2, '#0D7A4E', '#4F46E5', '#D97706', '#64748B']
}

/**
 * Pure-math waterfall geometry solver shared between SVG and native OOXML shapes.
 */
function niceAxisScale(rawMin, rawMax, targetIntervals = 4) {
  const lo = rawMin < 0 ? rawMin * 1.08 : 0
  const hi = rawMax > 0 ? rawMax * 1.08 : (lo === 0 ? 1 : 0)
  const roughSpan = hi - lo || 1
  const pickStep = (span) => {
    const rawStep = span / targetIntervals
    const mag = 10 ** Math.floor(Math.log10(Math.max(1e-9, rawStep)))
    const res = rawStep / mag
    const mult = [1, 2, 2.5, 4, 5, 10].find(m => m >= res - 1e-9) ?? 10
    return mult * mag
  }
  let step = pickStep(roughSpan)
  let min = lo < 0 ? Math.floor(lo / step) * step : 0
  let max = hi > 0 ? Math.ceil(hi / step) * step : 0
  if (max === min) max = min + step
  if (Math.round((max - min) / step) > 5) {
    step = pickStep((max - min) * 1.15)
    min = lo < 0 ? Math.floor(lo / step) * step : 0
    max = hi > 0 ? Math.ceil(hi / step) * step : 0
  }
  const count = Math.max(1, Math.round((max - min) / step))
  const tickValues = Array.from({ length: count + 1 }, (_, i) => {
    const v = min + i * step
    return Math.abs(v) < 1e-12 ? 0 : Number(v.toFixed(8))
  })
  return { min, max, span: max - min || 1, step, tickValues }
}

export function computeWaterfallGeometry(chart, bounds = { left: 86, right: 1088, top: 34, bottom: 342 }) {
  const values = chart.series[0]?.values ?? []
  const categories = chart.categories ?? []
  const n = categories.length
  const explicitTotals = new Set(Array.isArray(chart.totalIndices) ? chart.totalIndices : [])
  if (explicitTotals.size === 0 && n >= 1) {
    explicitTotals.add(0)
    if (n >= 3) {
      const priorSum = values.slice(0, -1).reduce((a, b) => a + b, 0)
      const lastLabel = String(categories[n - 1] ?? '')
      if (/(?:^(?:合计|总计|总和|期末|净\S*|最终|Total|Sum|Net|End|Ending|Final|Target)|(?:合计|总计|净额|净值|净利|利润|总和)$)/i.test(lastLabel) && Math.abs(values[n - 1] - priorSum) <= Math.max(1e-6, Math.abs(priorSum) * 1e-4)) {
        explicitTotals.add(n - 1)
      }
    }
  }

  let running = 0
  const bars = values.map((val, idx) => {
    const isTotal = explicitTotals.has(idx)
    const start = isTotal ? 0 : running
    const end = isTotal ? val : running + val
    running = end
    const role = isTotal ? 'total' : val >= 0 ? 'positive' : 'negative'
    return { index: idx, category: categories[idx], value: val, start, end, isTotal, role }
  })

  const allPoints = [0, ...bars.flatMap(b => [b.start, b.end])]
  const { min, max, span, tickValues } = niceAxisScale(Math.min(...allPoints), Math.max(...allPoints), 4)
  const { left, right, top, bottom } = bounds
  const yOf = v => bottom - ((v - min) / span) * (bottom - top)
  const groupW = (right - left) / Math.max(1, n)
  const barW = Math.max(8, groupW * 0.58)

  const positioned = bars.map((b, idx) => {
    const x = left + idx * groupW + (groupW - barW) / 2
    const yTop = yOf(Math.max(b.start, b.end))
    const yBottom = yOf(Math.min(b.start, b.end))
    const h = Math.max(2, yBottom - yTop)
    const formatted = (!b.isTotal && b.value > 0 ? '+' : '') + Number(b.value.toPrecision(6)).toLocaleString('en-US')
    return { ...b, x, w: barW, y: yTop, h, yEnd: yOf(b.end), label: formatted }
  })

  const connectors = []
  for (let i = 0; i < positioned.length - 1; i++) {
    connectors.push({
      x1: positioned[i].x + positioned[i].w,
      y1: positioned[i].yEnd,
      x2: positioned[i + 1].x,
      y2: positioned[i].yEnd,
    })
  }

  const ticks = tickValues.map((v) => ({
    value: v,
    y: yOf(v),
    label: Number(v.toFixed(6)).toLocaleString('en-US'),
  }))

  return { min, max, span, zeroY: yOf(0), bars: positioned, connectors, ticks, bounds }
}

/**
 * Self-contained SVG chart renderer (safe to serialize via .toString() in deck-data-view.mjs).
 */
export function renderChartSvg(chart, theme) {
  const colors = chartColors(theme)
  const tokens = theme?.tokens || {}
  const bg = tokens.canvas || theme?.palette?.bg || '#FFFFFF'
  const fg = tokens.inkPrimary || theme?.palette?.fg || '#0F172A'
  const muted = tokens.inkMuted || theme?.palette?.muted || '#64748B'
  const gridColor = tokens.hairline || (theme?.dark ? '#263554' : '#D5DFEC')
  const axisColor = tokens.inkSecondary || muted
  const focalColor = tokens.chartFocal || colors[0]
  const neutralColor = tokens.chartNeutral || (theme?.dark ? '#2B354D' : '#CBD5E1')
  const posColor = tokens.positive || (theme?.dark ? '#34D399' : '#0D7A4E')
  const negColor = tokens.negative || (theme?.dark ? '#F87171' : '#C81E1E')

  const width = 1120, height = 430, n = chart.categories.length
  const fmtNum = v => Number(Math.abs(v) < 1e-12 ? 0 : Number(Number(v).toPrecision(5))).toLocaleString('en-US')
  const niceBounds = (rMin, rMax) => {
    const lo = rMin < 0 ? rMin * 1.08 : 0, hi = rMax > 0 ? rMax * 1.08 : (lo === 0 ? 1 : 0)
    const pick = sp => { const rs = sp / 4, m = 10 ** Math.floor(Math.log10(Math.max(1e-9, rs))), r = rs / m; return ([1, 2, 2.5, 4, 5, 10].find(k => k >= r - 1e-9) ?? 10) * m }
    let st = pick(hi - lo || 1), mn = lo < 0 ? Math.floor(lo / st) * st : 0, mx = hi > 0 ? Math.ceil(hi / st) * st : 0
    if (mx === mn) mx = mn + st
    if (Math.round((mx - mn) / st) > 5) { st = pick((mx - mn) * 1.15); mn = lo < 0 ? Math.floor(lo / st) * st : 0; mx = hi > 0 ? Math.ceil(hi / st) * st : 0 }
    const cnt = Math.max(1, Math.round((mx - mn) / st))
    return { min: mn, max: mx, span: mx - mn || 1, ticks: Array.from({ length: cnt + 1 }, (_, i) => Number((mn + i * st).toFixed(8))) }
  }
  const rect = (x, y, w, h, color, rx = 3) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="${rx}" fill="${color}"/>`
  const text = (x, y, content, anchor = 'start', color = fg, size = 16, weight = 400) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" fill="${color}" font-size="${size}" font-weight="${weight}">${esc(content)}</text>`
  const line = (x1, y1, x2, y2, color = gridColor, sw = 1, dash = '') => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`

  const resolveHighlights = (vals, hl) => {
    if (hl === undefined || hl === null || hl === 'none') return null
    if (typeof hl === 'number') return new Set([hl])
    if (Array.isArray(hl)) return new Set(hl)
    if (hl === 'last') return new Set([vals.length - 1])
    if (hl === 'max') {
      let best = 0
      for (let i = 1; i < vals.length; i++) if (vals[i] > vals[best]) best = i
      return new Set([best])
    }
    if (hl === 'min') {
      let best = 0
      for (let i = 1; i < vals.length; i++) if (vals[i] < vals[best]) best = i
      return new Set([best])
    }
    return null
  }

  let shapes = ''
  const kind = chart.kind || 'column'
  const showLegend = chart.showLegend === true || (chart.showLegend !== false && chart.series.length > 1 && kind !== 'pie' && kind !== 'doughnut' && kind !== 'waterfall')
  const showDirectValues = chart.showValues === true || (chart.showValues !== false && n <= 8)

  if (kind === 'pie' || kind === 'doughnut') {
    const values = chart.series[0].values, sum = values.reduce((a, b) => a + b, 0)
    const cx = 330, cy = 212, r = 164, innerR = kind === 'doughnut' ? r * 0.62 : (chart.holeSizePct ? r * (chart.holeSizePct / 100) : r * 0.56)
    const useDonut = kind === 'doughnut'
    let angle = -Math.PI / 2
    values.forEach((value, i) => {
      const sliceColor = colors[i % colors.length]
      const sweep = (value / sum) * Math.PI * 2
      const next = angle + sweep
      if (value === sum) {
        shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${sliceColor}"/>`
        if (useDonut) shapes += `<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="${bg}"/>`
      } else if (value > 0) {
        const large = sweep > Math.PI ? 1 : 0
        const x1 = cx + Math.cos(angle) * r, y1 = cy + Math.sin(angle) * r
        const x2 = cx + Math.cos(next) * r, y2 = cy + Math.sin(next) * r
        if (useDonut) {
          const ix1 = cx + Math.cos(next) * innerR, iy1 = cy + Math.sin(next) * innerR
          const ix2 = cx + Math.cos(angle) * innerR, iy2 = cy + Math.sin(angle) * innerR
          shapes += `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix1.toFixed(2)} ${iy1.toFixed(2)} A ${innerR} ${innerR} 0 ${large} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)} Z" fill="${sliceColor}" stroke="${bg}" stroke-width="2"/>`
        } else {
          shapes += `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${sliceColor}" stroke="${bg}" stroke-width="2"/>`
        }
      }
      angle = next
      const rowY = 58 + i * 31
      shapes += rect(590, rowY - 13, 14, 14, sliceColor, 3)
      shapes += text(616, rowY, chart.categories[i], 'start', fg, 16, i === 0 ? 600 : 400)
      shapes += text(1080, rowY, `${fmtNum(value)} (${(value / sum * 100).toFixed(1)}%)`, 'end', muted, 15, 600)
    })
    if (useDonut) {
      shapes += text(cx, cy - 4, fmtNum(sum), 'middle', fg, 28, 700)
      shapes += text(cx, cy + 22, chart.unit || chart.series[0].name, 'middle', muted, 14, 500)
    }
  } else if (kind === 'waterfall') {
    const vals = chart.series[0].values
    const explicit = new Set(Array.isArray(chart.totalIndices) ? chart.totalIndices : [])
    if (explicit.size === 0 && n >= 1) {
      explicit.add(0)
      if (n >= 3) {
        const prior = vals.slice(0, -1).reduce((a, b) => a + b, 0)
        if (/(?:^(?:合计|总计|总和|期末|净\S*|最终|Total|Sum|Net|End|Ending|Final|Target)|(?:合计|总计|净额|净值|净利|利润|总和)$)/i.test(String(chart.categories[n - 1] ?? '')) && Math.abs(vals[n - 1] - prior) <= Math.max(1e-6, Math.abs(prior) * 1e-4)) {
          explicit.add(n - 1)
        }
      }
    }
    let running = 0
    const rawBars = vals.map((v, idx) => {
      const isTotal = explicit.has(idx)
      const s = isTotal ? 0 : running
      const e = isTotal ? v : running + v
      running = e
      return { value: v, start: s, end: e, isTotal }
    })
    const pts = [0, ...rawBars.flatMap(b => [b.start, b.end])]
    const { min, max, span, ticks: wfTicks } = niceBounds(Math.min(...pts), Math.max(...pts))
    const left = 88, right = 1088, top = 32, bottom = 348
    const y = v => bottom - ((v - min) / span) * (bottom - top)
    for (const tv of wfTicks) {
      shapes += line(left, y(tv), right, y(tv), gridColor, 1) + text(left - 12, y(tv) + 5, fmtNum(tv), 'end', muted, 14)
    }
    const gw = (right - left) / n, bw = Math.max(10, gw * 0.56)
    const coords = rawBars.map((b, idx) => {
      const bx = left + idx * gw + (gw - bw) / 2
      const yt = y(Math.max(b.start, b.end)), yb = y(Math.min(b.start, b.end))
      const col = b.isTotal ? focalColor : b.value >= 0 ? posColor : negColor
      shapes += rect(bx, yt, bw, Math.max(2, yb - yt), col, 4)
      const lbl = (!b.isTotal && b.value > 0 ? '+' : '') + fmtNum(b.value)
      const ly = b.value >= 0 || b.isTotal ? yt - 8 : yb + 18
      shapes += text(bx + bw / 2, ly, lbl, 'middle', b.isTotal ? fg : col, 14, 700)
      shapes += text(bx + bw / 2, bottom + 28, chart.categories[idx], 'middle', fg, 15)
      return { x: bx, w: bw, yEnd: y(b.end) }
    })
    for (let i = 0; i < coords.length - 1; i++) {
      shapes += line(coords[i].x + coords[i].w, coords[i].yEnd, coords[i + 1].x, coords[i].yEnd, muted, 1.2, '4 3')
    }
    shapes += line(left, y(0), right, y(0), axisColor, 1.5)
  } else if (kind === 'scatter') {
    const left = 88, right = 1088, top = showLegend ? 46 : 24, bottom = 346
    const allX = chart.series.flatMap((s, si) => s.xValues ?? s.values.map((_, i) => i + 1 + si * 0))
    const allY = chart.series.flatMap(s => s.values)
    const minX = Math.min(...allX), maxX = Math.max(...allX), spanX = maxX - minX || 1
    const minY = Math.min(0, ...allY), maxY = Math.max(...allY), spanY = maxY - minY || 1
    const sx = v => left + ((v - minX) / spanX) * (right - left)
    const sy = v => bottom - ((v - minY) / spanY) * (bottom - top)
    for (let t = 0; t <= 4; t++) {
      const vy = minY + (spanY * t) / 4, vx = minX + (spanX * t) / 4
      shapes += line(left, sy(vy), right, sy(vy), gridColor, 1) + text(left - 12, sy(vy) + 5, fmtNum(vy), 'end', muted, 14)
      shapes += line(sx(vx), top, sx(vx), bottom, gridColor, 0.75, '3 3') + text(sx(vx), bottom + 26, fmtNum(vx), 'middle', muted, 14)
    }
    shapes += line(left, bottom, right, bottom, axisColor, 1.4) + line(left, top, left, bottom, axisColor, 1.4)
    chart.series.forEach((s, si) => {
      const col = colors[si % colors.length]
      const xs = s.xValues ?? s.values.map((_, i) => i + 1)
      s.values.forEach((vy, i) => {
        const px = sx(xs[i]), py = sy(vy)
        shapes += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="6.5" fill="${col}" fill-opacity="0.86" stroke="${bg}" stroke-width="1.5"/>`
        if (showDirectValues && chart.series.length === 1) shapes += text(px, py - 11, chart.categories[i] || fmtNum(vy), 'middle', muted, 13)
      })
    })
  } else {
    const isHoriz = kind === 'bar' || kind === 'stacked-bar' || kind === 'percent-bar'
    const isStacked = kind === 'stacked-column' || kind === 'stacked-bar'
    const isPercent = kind === 'percent-column' || kind === 'percent-bar'
    const left = isHoriz ? 186 : 86, right = kind === 'combo' && chart.series.some(s => s.secondaryAxis) ? 1028 : 1088
    const top = showLegend ? 50 : 28, bottom = 348

    let min = 0, max = 1
    if (isPercent) {
      min = 0; max = 100
    } else if (isStacked) {
      const posSums = chart.categories.map((_, i) => chart.series.reduce((acc, s) => acc + Math.max(0, s.values[i]), 0))
      const negSums = chart.categories.map((_, i) => chart.series.reduce((acc, s) => acc + Math.min(0, s.values[i]), 0))
      min = Math.min(0, ...negSums)
      max = Math.max(0, ...posSums) * 1.1 || 1
    } else {
      const primarySeries = kind === 'combo' ? chart.series.filter(s => !s.secondaryAxis) : chart.series
      const values = (primarySeries.length ? primarySeries : chart.series).flatMap(s => s.values)
      const rMin = Math.min(0, ...values), rMax = Math.max(0, ...values)
      min = rMin < 0 ? rMin * 1.12 : 0
      max = rMax > 0 ? rMax * 1.14 : (rMin === 0 ? 1 : 0)
    }
    const span = max - min || 1
    const y = value => bottom - ((value - min) / span) * (bottom - top)
    const x = value => left + ((value - min) / span) * (right - left)

    for (let tick = 0; tick <= 4; tick++) {
      const value = min + (span * tick) / 4
      const label = isPercent ? `${Math.round(value)}%` : fmtNum(value)
      if (isHoriz) shapes += line(x(value), top, x(value), bottom, gridColor, 1) + text(x(value), bottom + 26, label, 'middle', muted, 14)
      else shapes += line(left, y(value), right, y(value), gridColor, 1) + text(left - 12, y(value) + 5, label, 'end', muted, 14)
    }

    chart.categories.forEach((category, i) => {
      if (isHoriz) shapes += text(left - 14, top + (i + 0.5) * (bottom - top) / n + 5, category, 'end', fg, 15)
      else shapes += text(left + (i + 0.5) * (right - left) / n, bottom + 28, category, 'middle', fg, 15)
    })

    const effectiveHighlight = chart.highlight !== undefined
      ? chart.highlight
      : (chart.spotlight === true ? 'max' : undefined)
    const singleHighlights = chart.series.length === 1 && (kind === 'column' || kind === 'bar')
      ? resolveHighlights(chart.series[0].values, effectiveHighlight)
      : null

    if (isStacked || isPercent) {
      chart.categories.forEach((_, i) => {
        const totalAbs = chart.series.reduce((acc, s) => acc + Math.max(0, s.values[i]), 0) || 1
        let posRun = 0, negRun = 0
        chart.series.forEach((s, si) => {
          const rawV = s.values[i]
          const v = isPercent ? (Math.max(0, rawV) / totalAbs) * 100 : rawV
          const start = v >= 0 ? posRun : negRun
          const end = start + v
          if (v >= 0) posRun = end; else negRun = end
          const color = colors[si % colors.length]
          if (isHoriz) {
            const group = (bottom - top) / n, h = Math.max(4, group * 0.62)
            shapes += rect(Math.min(x(start), x(end)), top + i * group + (group - h) / 2, Math.abs(x(end) - x(start)), h, color, 2)
          } else {
            const group = (right - left) / n, w = Math.max(6, group * 0.58)
            shapes += rect(left + i * group + (group - w) / 2, Math.min(y(start), y(end)), w, Math.abs(y(end) - y(start)), color, 2)
          }
        })
      })
    } else {
      const barSeries = chart.series.filter((s, si) => kind === 'combo' ? (s.chartKind || (si === 0 ? 'column' : 'line')) === 'column' || s.chartKind === 'bar' : (kind === 'column' || kind === 'bar'))
      const lineSeries = chart.series.filter((s, si) => kind === 'combo' ? ['line', 'area'].includes(s.chartKind || (si === 0 ? 'column' : 'line')) : (kind === 'line' || kind === 'area'))

      // Secondary axis scale for combo charts if needed
      const secSeries = chart.series.filter(s => s.secondaryAxis)
      const secVals = secSeries.flatMap(s => s.values)
      const secMin = secVals.length ? Math.min(0, ...secVals) : 0
      const secMax = secVals.length ? (Math.max(0, ...secVals) * 1.15 || 1) : 1
      const secSpan = secMax - secMin || 1
      const ySec = v => bottom - ((v - secMin) / secSpan) * (bottom - top)
      if (secSeries.length) {
        for (let t = 0; t <= 4; t++) {
          const sv = secMin + (secSpan * t) / 4
          shapes += text(right + 10, ySec(sv) + 5, fmtNum(sv), 'start', colors[chart.series.indexOf(secSeries[0]) % colors.length], 13)
        }
      }

      barSeries.forEach((series, bIdx) => {
        const origIdx = chart.series.indexOf(series)
        series.values.forEach((v, i) => {
          const isFocal = singleHighlights ? singleHighlights.has(i) : true
          const color = singleHighlights ? (isFocal ? focalColor : neutralColor) : colors[origIdx % colors.length]
          const mapY = series.secondaryAxis ? ySec : y
          if (isHoriz) {
            const group = (bottom - top) / n, h = (group * 0.66) / Math.max(1, barSeries.length)
            const by = top + i * group + group * 0.17 + bIdx * h
            const bx = Math.min(x(0), x(v)), bw = Math.abs(x(v) - x(0))
            shapes += rect(bx, by, bw, Math.max(2, h - 2), color, 3)
            if (showDirectValues && barSeries.length <= 2) {
              shapes += text(v >= 0 ? bx + bw + 8 : bx - 8, by + h / 2 + 4, fmtNum(v), v >= 0 ? 'start' : 'end', isFocal ? fg : muted, 14, isFocal && singleHighlights ? 700 : 500)
            }
          } else {
            const group = (right - left) / n, w = (group * 0.62) / Math.max(1, barSeries.length)
            const bx = left + i * group + group * 0.19 + bIdx * w
            const by = Math.min(mapY(0), mapY(v)), bh = Math.abs(mapY(v) - mapY(0))
            shapes += rect(bx, by, Math.max(3, w - 3), bh, color, 3)
            if (showDirectValues && barSeries.length <= 2) {
              if (kind === 'combo' && bh >= 24 && v >= 0) {
                const secYAtI = lineSeries[0] ? (lineSeries[0].secondaryAxis ? ySec : y)(lineSeries[0].values[i]) : -999
                const topLabelY = by + 18
                const safeBarY = Math.abs(secYAtI - topLabelY) < 28 && bh >= 48 ? by + bh - 12 : topLabelY
                shapes += text(bx + (w - 3) / 2, safeBarY, fmtNum(v), 'middle', tokens.inkOnAccent || '#FFFFFF', 13, 700)
              } else {
                shapes += text(bx + (w - 3) / 2, v >= 0 ? by - 8 : by + bh + 16, fmtNum(v), 'middle', isFocal ? fg : muted, 14, isFocal && singleHighlights ? 700 : 500)
              }
            }
          }
        })
      })

      lineSeries.forEach((series) => {
        const origIdx = chart.series.indexOf(series)
        const color = colors[origIdx % colors.length]
        const mapY = series.secondaryAxis ? ySec : y
        const pts = series.values.map((v, i) => [left + (i + 0.5) * (right - left) / n, mapY(v)])
        const isArea = kind === 'area' || series.chartKind === 'area'
        if (isArea && pts.length >= 2) {
          const poly = `M ${pts[0][0].toFixed(1)} ${mapY(0).toFixed(1)} ` + pts.map(p => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ` L ${pts.at(-1)[0].toFixed(1)} ${mapY(0).toFixed(1)} Z`
          shapes += `<path d="${poly}" fill="${color}" fill-opacity="0.18"/>`
        }
        shapes += `<polyline points="${pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`
        pts.forEach(([px, py], i) => {
          shapes += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="${color}" stroke="${bg}" stroke-width="2"/>`
          if (showDirectValues && lineSeries.length === 1 && (barSeries.length === 0 || kind === 'combo')) {
            shapes += text(px, py - 12, fmtNum(series.values[i]), 'middle', kind === 'combo' ? color : fg, 14, 700)
          }
        })
      })
    }

    // 基准参考虚线（Target / Average Benchmark Reference Line）
    if (chart.referenceLine && Number.isFinite(chart.referenceLine.value)) {
      const rv = chart.referenceLine.value
      const rCol = chart.referenceLine.color || tokens.accentSecondary || focalColor
      const rLbl = chart.referenceLine.label || `Target ${fmtNum(rv)}`
      if (isHoriz && rv >= min && rv <= max) {
        const rx = x(rv)
        shapes += `<line x1="${rx.toFixed(1)}" y1="${top}" x2="${rx.toFixed(1)}" y2="${bottom}" stroke="${rCol}" stroke-width="1.8" stroke-dasharray="6 4"/>`
        shapes += rect(Math.min(right - 130, rx + 6), top + 4, Math.max(84, rLbl.length * 10 + 18), 22, bg, 11)
        shapes += text(Math.min(right - 122, rx + 14), top + 19, rLbl, 'start', rCol, 12, 700)
      } else if (!isHoriz && rv >= min && rv <= max) {
        const ry = y(rv)
        const pw = Math.min(220, Math.max(82, rLbl.length * 11 + 22))
        shapes += `<line x1="${left}" y1="${ry.toFixed(1)}" x2="${right}" y2="${ry.toFixed(1)}" stroke="${rCol}" stroke-width="1.8" stroke-dasharray="6 4"/>`
        shapes += `<rect x="${(right - pw).toFixed(1)}" y="${(ry - 24).toFixed(1)}" width="${pw.toFixed(1)}" height="20" rx="10" fill="${bg}" stroke="${rCol}" stroke-width="1"/>`
        shapes += text(right - pw / 2, ry - 10, rLbl, 'middle', rCol, 12, 700)
      }
    }

    // 麦肯锡增长飞线标注箭弧（CAGR / Growth Callout Arc）
    if (!isHoriz && !isStacked && !isPercent && n >= 2 && (chart.callout?.label || chart.showGrowthCallout)) {
      const vals = chart.series[0]?.values || []
      const fromIdx = Number.isInteger(chart.callout?.fromIndex) ? Math.max(0, Math.min(n - 1, chart.callout.fromIndex)) : 0
      const toIdx = Number.isInteger(chart.callout?.toIndex) ? Math.max(0, Math.min(n - 1, chart.callout.toIndex)) : n - 1
      const v0 = vals[fromIdx]
      const v1 = vals[toIdx]
      let badgeLabel = chart.callout?.label || ''
      if (!badgeLabel && Number.isFinite(v0) && Number.isFinite(v1) && Math.abs(v0) > 1e-9 && fromIdx !== toIdx) {
        const pct = ((v1 - v0) / Math.abs(v0)) * 100
        badgeLabel = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
      }
      if (badgeLabel && fromIdx !== toIdx) {
        const x0 = left + (fromIdx + 0.5) * (right - left) / n
        const x1 = left + (toIdx + 0.5) * (right - left) / n
        const y0 = Math.max(top + 24, y(v0) - 24)
        const y1 = Math.max(top + 24, y(v1) - 24)
        const yArc = Math.max(top + 4, Math.min(y0, y1) - 22)
        const midX = (x0 + x1) / 2
        const cCol = v1 >= v0 ? posColor : negColor
        const pw = Math.min(180, Math.max(76, badgeLabel.length * 10 + 24))
        shapes += `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x0.toFixed(1)} ${yArc.toFixed(1)} L ${x1.toFixed(1)} ${yArc.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${cCol}" stroke-width="1.8"/>`
        shapes += `<polygon points="${(x1 - 5).toFixed(1)},${(y1 - 7).toFixed(1)} ${(x1 + 5).toFixed(1)},${(y1 - 7).toFixed(1)} ${x1.toFixed(1)},${(y1 + 1).toFixed(1)}" fill="${cCol}"/>`
        shapes += `<rect x="${(midX - pw / 2).toFixed(1)}" y="${(yArc - 11).toFixed(1)}" width="${pw.toFixed(1)}" height="22" rx="11" fill="${bg}" stroke="${cCol}" stroke-width="1.2"/>`
        shapes += text(midX, yArc + 4, badgeLabel, 'middle', cCol, 12.5, 700)
      }
    }

    shapes += isHoriz ? line(x(0), top, x(0), bottom, axisColor, 1.5) : line(left, y(0), right, y(0), axisColor, 1.5)
  }

  if (showLegend) {
    chart.series.forEach((s, i) => {
      const lx = 86 + i * 172
      shapes += rect(lx, 8, 12, 12, colors[i % colors.length], 3) + text(lx + 19, 19, s.name, 'start', fg, 15, 600)
    })
  }
  if (chart.unit) shapes += text(1088, showLegend ? 20 : 18, `${chart.unit}`, 'end', muted, 14, 500)

  const table = '<table class="chart-data"><caption>' + esc(chart.caption || 'Chart data') + '</caption><thead><tr><th></th>' + chart.series.map(s => `<th>${esc(s.name)}</th>`).join('') + '</tr></thead><tbody>'
    + chart.categories.map((c, i) => `<tr><th>${esc(c)}</th>${chart.series.map(s => `<td>${s.values[i]}</td>`).join('')}</tr>`).join('') + '</tbody></table>'
  return `<svg class="native-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(chart.caption || kind + ' chart')}"><title>${esc(chart.caption || kind)}</title>${shapes}</svg>${table}`
}

function formatInlineHtml(rawText) {
  const str = String(rawText ?? '')
  if (!/[*`]/.test(str)) {
    const colonMatch = /^([^:：]{1,12})([:：]\s*)([\s\S]+)$/.exec(str)
    if (colonMatch) return `<strong>${esc(colonMatch[1] + colonMatch[2])}</strong>${esc(colonMatch[3])}`
    return esc(str)
  }
  const tokenRe = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`/g
  let out = '', last = 0
  for (const m of str.matchAll(tokenRe)) {
    out += esc(str.slice(last, m.index))
    if (m[1] !== undefined) out += `<strong>${esc(m[1])}</strong>`
    else if (m[2] !== undefined) out += `<em>${esc(m[2])}</em>`
    else if (m[3] !== undefined) out += `<code class="media-code">${esc(m[3])}</code>`
    last = m.index + m[0].length
  }
  out += esc(str.slice(last))
  return out
}

function projectInsightCards(slide) {
  if (Array.isArray(slide.items) && slide.items.length > 0) return slide.items.slice(0, 4)
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
  if (bullets.length > 0) {
    return bullets.slice(0, 4).map((b, idx) => {
      const cleaned = b.replace(/^\*\*([^*]+)\*\*\s*[:：—-]?\s*/, (_, lead) => `${lead}\u0000`)
      if (cleaned.includes('\u0000')) {
        const [title, text] = cleaned.split('\u0000')
        return { tag: `0${idx + 1}`, title: title.trim(), text: text.trim() }
      }
      const colon = /^([^:：]{1,14})[:：]\s*(.+)$/.exec(b)
      if (colon) return { tag: `0${idx + 1}`, title: colon[1].trim(), text: colon[2].trim() }
      return { tag: `0${idx + 1}`, text: b }
    })
  }
  if (slide.subtitle) return [{ tag: 'INSIGHT', title: '', text: slide.subtitle }]
  return []
}

export function renderMediaHtml(slide, manifest, theme) {
  const boxes = mediaBoxes(slide.layout, slide.variant, slide, manifest)
  const variant = String(slide.variant ?? '').trim().toLowerCase()
  const chromeStyle = resolveChromeStyle(theme, slide, manifest?.brand)
  const slidesArr = Array.isArray(manifest?.slides) ? manifest.slides : []
  const foundIdx = slidesArr.findIndex((s) => s === slide || (slide?.id && s?.id === slide.id))
  const slideIndex = foundIdx >= 0 ? foundIdx : 0
  const totalSlides = Math.max(1, slidesArr.length)
  const folioText = String(slideIndex + 1).padStart(2, '0') + ' / ' + String(totalSlides).padStart(2, '0')
  const langEn = manifest?.language === 'en'
  const isBleed = variant === 'full-bleed' || variant === 'split-bleed'

  let body = ''
  if (!isBleed && chromeStyle === 'academic-minimal') {
    body += `<div class="media-beamer-band">` +
      (slide.kicker && slide.kicker !== slide.title ? `<div class="kicker media-kicker-band">${esc(slide.kicker)}</div>` : '') +
      `<h2 class="media-title-band">${esc(slide.title)}</h2>` +
      `</div>`
  } else if (!isBleed && chromeStyle === 'editorial-folio') {
    body += `<div class="media-editorial-bar">` +
      (slide.kicker && slide.kicker !== slide.title ? `<span class="kicker media-kicker-inline">${esc(slide.kicker)}</span>` : '<span class="kicker media-kicker-inline"></span>') +
      `<span class="slide-folio">${folioText}</span>` +
      `</div>` +
      `<h2 class="media-title media-title--editorial" style="${position(boxes.title)}">${esc(slide.title)}</h2>`
  } else if (!isBleed && chromeStyle === 'consulting-classic') {
    if (slide.kicker && slide.kicker !== slide.title) {
      body += `<div class="kicker media-consulting-tracker">${esc(slide.kicker)}</div>`
    }
    body += `<h2 class="media-title media-title--ruled" style="${position({ ...boxes.title, w: slide.kicker && slide.kicker !== slide.title ? 9.4 : boxes.title.w })}">${esc(slide.title)}</h2>`
  } else if (!isBleed && chromeStyle === 'gov-ceremonial') {
    if (slide.kicker && slide.kicker !== slide.title) {
      const gk = /^【/.test(slide.kicker.trim()) ? slide.kicker.trim() : '【' + slide.kicker.trim() + '】'
      body += `<div class="kicker media-kicker" style="${position(boxes.kicker)}">${esc(gk)}</div>`
    }
    body += `<h2 class="media-title media-title--gov" style="${position(boxes.title)}">${esc(slide.title)}</h2>`
  } else {
    if (slide.kicker && slide.kicker !== slide.title && variant !== 'full-bleed') {
      const kickerCls = chromeStyle === 'keynote-spatial' ? 'kicker media-kicker media-kicker--pill' : 'kicker media-kicker'
      body += `<div class="${kickerCls}" style="${position(boxes.kicker)}">${esc(slide.kicker)}</div>`
    }
    const titleCls = variant === 'full-bleed'
      ? 'media-title media-title--bleed'
      : (chromeStyle === 'keynote-spatial' ? 'media-title' : 'media-title media-title--ruled')
    body += `<h2 class="${titleCls}" style="${position(boxes.title)}">${esc(slide.title)}</h2>`
  }

  if (slide.layout === 'chart' || slide.layout === 'chart-split') {
    const taste = resolveActiveTaste(manifest, slide)
    const chartWithTaste = {
      ...slide.chart,
      ...(slide.chart?.highlight === undefined && slide.chart?.spotlight === undefined && taste.chartSpotlight ? { spotlight: true } : {}),
      ...(slide.chart?.showGrowthCallout === undefined && !slide.chart?.callout && taste.chartGrowthCallout ? { showGrowthCallout: true } : {}),
    }
    body += `<div class="media-chart" style="${position(boxes.chart)}">${renderChartSvg(chartWithTaste, theme)}</div>`
    if (slide.layout === 'chart-split' && boxes.body) {
      const cards = projectInsightCards(slide)
      const cardsHtml = cards.map((card, idx) =>
        `<div class="media-insight-card" data-item-index="${idx}">` +
        (card.value ? `<div class="media-insight-val" data-item-field="value">${esc(card.value)}${card.unit ? `<small>${esc(card.unit)}</small>` : ''}</div>` : (card.tag ? `<span class="media-insight-tag" data-item-field="tag">${esc(card.tag)}</span>` : '')) +
        (card.title ? `<strong class="media-insight-head" data-item-field="title">${formatInlineHtml(card.title)}</strong>` : '') +
        (card.text ? `<p class="media-insight-text" data-item-field="text">${formatInlineHtml(card.text)}</p>` : '') +
        `</div>`
      ).join('')
      body += `<div class="media-body media-insights" style="${position(boxes.body)}">${cardsHtml}</div>`
    }
    const cap = slide.chart?.caption
    if (cap) body += `<div class="media-caption" style="${position(boxes.caption)}">${esc(cap)}</div>`
  } else {
    if (Array.isArray(boxes.gallery) && Array.isArray(slide.images) && slide.images.length > 1) {
      boxes.gallery.forEach((gBox, idx) => {
        const img = slide.images[idx]
        const asset = manifest.assets?.[img?.assetId]
        body += `<figure class="media-image media-image--framed" style="${position(gBox)}"><img src="${esc(asset?.data ?? '')}" alt="${esc(img?.alt)}" style="object-fit:${img?.fit || 'cover'}"/>${img?.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}</figure>`
      })
    } else {
      const image = slide.image, asset = manifest.assets?.[image?.assetId]
      const frameClass = variant === 'split-bleed' || variant === 'full-bleed' ? 'media-image--bleed' : 'media-image--framed'
      body += `<figure class="media-image ${frameClass}" style="${position(boxes.image)}"><img src="${esc(asset?.data ?? '')}" alt="${esc(image?.alt)}" style="object-fit:${image?.fit || 'contain'}"/></figure>`
    }
    if (boxes.body) {
      const lead = slide.subtitle ? `<p class="media-lead">${formatInlineHtml(slide.subtitle)}</p>` : ''
      const list = slide.bullets?.length ? `<ul class="media-list">${slide.bullets.map(b => `<li>${formatInlineHtml(b)}</li>`).join('')}</ul>` : ''
      body += `<div class="media-body" style="${position(boxes.body)}">${lead}${list}</div>`
    }
    if (slide.image?.caption) {
      body += `<div class="media-caption" style="${position(boxes.caption)}">${esc(slide.image.caption)}</div>`
    }
  }

  if (slide.takeaway) {
    const arrowChar = chromeStyle === 'editorial-folio' ? '—' : '▸'
    const prefix = chromeStyle === 'consulting-classic' || chromeStyle === 'academic-minimal'
      ? `<strong class="takeaway-prefix">${langEn ? 'Key Takeaway:' : '核心结论：'}</strong>`
      : ''
    body += `<div class="media-takeaway takeaway-bar" style="${position(boxes.takeaway)}"><span class="takeaway-arrow" aria-hidden="true">${arrowChar}</span>${prefix}<span class="takeaway-text">${formatInlineHtml(slide.takeaway)}</span></div>`
  }
  const srcText = slide.source || slide.chart?.source
  if (chromeStyle === 'academic-minimal') {
    const zLeft = srcText || manifest?.brand?.footer || manifest?.title || ''
    const zMid = (slide.kicker || slide.title || '').trim()
    body += `<footer class="media-beamer-status"><span class="media-beamer-left">${esc(zLeft)}</span><span class="media-beamer-mid">${esc(zMid)}</span><span class="media-beamer-right">${folioText}</span></footer>`
  } else if (srcText) {
    body += `<div class="media-source">${esc(srcText)}</div>`
  }
  return `<div class="media-canvas">${body}</div>`
}

/**
 * Compile publication-grade ChartSpec for @office-kit/pptx (all non-waterfall chart types).
 */
export function buildOfficeKitChartSpec(chart, theme, visual = {}, font = 'Microsoft YaHei') {
  const colors = chartColors(theme)
  const tokens = theme?.tokens || {}
  const bg = tokens.canvas || theme?.palette?.bg || '#FFFFFF'
  const fg = tokens.inkPrimary || theme?.palette?.fg || '#0F172A'
  const muted = tokens.inkMuted || theme?.palette?.muted || '#64748B'
  const hairline = tokens.hairline || (theme?.dark ? '#263554' : '#D5DFEC')
  const axisLine = tokens.inkSecondary || muted
  const focalColor = tokens.chartFocal || colors[0]
  const neutralColor = tokens.chartNeutral || (theme?.dark ? '#2B354D' : '#CBD5E1')

  const sizePt = visual?.chartLabelSize ?? 14
  const labelStyle = { font, sizePt, color: fg }
  const axisLabelStyle = { font, sizePt: Math.max(11, sizePt - 2), color: muted }
  const n = chart.categories.length
  const kind = chart.kind
  const showDirectValues = chart.showValues === true || (chart.showValues !== false && n <= 8)

  if (kind === 'pie' || kind === 'doughnut') {
    const sliceColors = chart.categories.map((_, j) => colors[j % colors.length])
    const hexLum = (hex) => {
      const c = String(hex ?? '#000000').replace('#', '').slice(0, 6)
      const rgb = [0, 2, 4].map(k => parseInt(c.slice(k, k + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
    }
    const doughnutPointLabels = kind === 'doughnut'
      ? sliceColors.map(sc => ({
          showPercent: true,
          showValue: false,
          showCategory: false,
          showSeriesName: false,
          numberFormat: '0.0%',
          textStyle: { font, sizePt: Math.max(12, sizePt - 1), bold: true, color: hexLum(sc) > 0.44 ? '#0F172A' : '#FFFFFF' },
        }))
      : undefined
    return {
      kind,
      categories: chart.categories,
      series: [{
        name: chart.series[0].name,
        values: chart.series[0].values,
        color: colors[0],
        lineColor: bg,
        pointColors: sliceColors,
        ...(kind === 'doughnut' ? {
          dataLabels: {
            showPercent: true,
            showValue: false,
            showCategory: false,
            showSeriesName: false,
            numberFormat: '0.0%',
            textStyle: { font, sizePt: Math.max(12, sizePt - 1), bold: true, color: '#FFFFFF' },
          },
          pointDataLabels: doughnutPointLabels,
        } : {}),
      }],
      ...(kind === 'doughnut' ? { holeSizePct: 60 } : {}),
      chartAreaFill: bg,
      chartAreaStrokeColor: bg,
      plotAreaFill: bg,
      ...(kind === 'pie' ? {
        dataLabels: {
          showPercent: true,
          showValue: false,
          showCategory: false,
          showSeriesName: false,
          numberFormat: '0.0%',
          position: 'outEnd',
          showLeaderLines: true,
          textStyle: { font, sizePt: Math.max(12, sizePt - 1), bold: true, color: fg },
        },
      } : {}),
      legend: { position: 'r', textStyle: labelStyle },
    }
  }

  if (kind === 'scatter') {
    return {
      kind: 'scatter',
      scatterStyle: 'marker',
      categories: chart.categories,
      series: chart.series.map((s, i) => ({
        name: s.name,
        values: s.values,
        xValues: s.xValues ?? s.values.map((_, idx) => idx + 1),
        color: colors[i % colors.length],
        markerSymbol: 'circle',
        markerSizePt: 8,
        markerColor: colors[i % colors.length],
      })),
      chartAreaFill: bg,
      chartAreaStrokeColor: bg,
      plotAreaFill: bg,
      valueAxisLabelStyle: axisLabelStyle,
      categoryAxisLabelStyle: axisLabelStyle,
      valueAxisMajorGridlines: true,
      valueAxisMajorGridlineColor: hairline,
      valueAxisMajorGridlineWidthEmu: 9525,
      categoryAxisMajorGridlines: true,
      categoryAxisMajorGridlineColor: hairline,
      categoryAxisMajorGridlineWidthEmu: 6350,
      valueAxisMajorTickMark: 'none',
      categoryAxisMajorTickMark: 'none',
      legend: { position: chart.series.length > 1 || chart.showLegend === true ? 't' : null, textStyle: labelStyle },
    }
  }

  const baseKind = kind === 'stacked-column' || kind === 'percent-column' || kind === 'combo' ? 'column'
    : kind === 'stacked-bar' || kind === 'percent-bar' ? 'bar'
    : kind
  const grouping = kind === 'stacked-column' || kind === 'stacked-bar' ? 'stacked'
    : kind === 'percent-column' || kind === 'percent-bar' ? 'percentStacked'
    : 'clustered'

  let highlightSet = null
  const effHighlight = chart.highlight !== undefined ? chart.highlight : (chart.spotlight === true ? 'max' : undefined)
  if (chart.series.length === 1 && (kind === 'column' || kind === 'bar') && effHighlight !== undefined && effHighlight !== 'none') {
    const vals = chart.series[0].values
    if (typeof effHighlight === 'number') highlightSet = new Set([effHighlight])
    else if (Array.isArray(effHighlight)) highlightSet = new Set(effHighlight)
    else if (effHighlight === 'last') highlightSet = new Set([vals.length - 1])
    else if (effHighlight === 'max') {
      let best = 0
      for (let i = 1; i < vals.length; i++) if (vals[i] > vals[best]) best = i
      highlightSet = new Set([best])
    } else if (effHighlight === 'min') {
      let best = 0
      for (let i = 1; i < vals.length; i++) if (vals[i] < vals[best]) best = i
      highlightSet = new Set([best])
    }
  }

  const hasSecondary = kind === 'combo' && chart.series.some(s => s.secondaryAxis)
  const seriesSpec = chart.series.map((s, i) => {
    const col = colors[i % colors.length]
    const effKind = kind === 'combo' ? (s.chartKind || (i === 0 ? 'column' : 'line')) : baseKind
    const isLineLike = effKind === 'line' || effKind === 'area'
    const comboLabels = kind === 'combo' && showDirectValues
      ? {
          showValue: true,
          showCategory: false,
          showSeriesName: false,
          showPercent: false,
          position: isLineLike ? 't' : 'inEnd',
          textStyle: {
            font,
            sizePt: Math.max(11, sizePt - 2),
            bold: true,
            color: isLineLike ? col : (tokens.inkOnAccent || '#FFFFFF'),
          },
        }
      : undefined
    return {
      name: s.name,
      values: s.values,
      color: highlightSet ? focalColor : col,
      ...(highlightSet ? { pointColors: s.values.map((_, idx) => highlightSet.has(idx) ? focalColor : neutralColor) } : {}),
      ...(kind === 'combo' ? { chartKind: effKind } : {}),
      ...(s.secondaryAxis ? { secondaryAxis: true } : {}),
      ...(isLineLike ? { lineWidthEmu: 31750, lineColor: col, markerSymbol: 'circle', markerSizePt: 6, markerColor: col } : {}),
      ...(effKind === 'area' ? { fillOpacity: 0.24 } : {}),
      ...(comboLabels ? { dataLabels: comboLabels } : {}),
    }
  })

  const showLegend = chart.showLegend === true || (chart.showLegend !== false && chart.series.length > 1)
  const dataLabelPos = baseKind === 'bar' || baseKind === 'column'
    ? (grouping === 'clustered' ? 'outEnd' : 'ctr')
    : 't'

  return {
    kind: baseKind,
    categories: chart.categories,
    series: seriesSpec,
    ...(baseKind === 'column' || baseKind === 'bar' || baseKind === 'area' ? { grouping } : {}),
    ...(baseKind === 'column' || baseKind === 'bar' ? { gapWidthPct: 85 } : {}),
    ...(baseKind === 'line' ? { lineMarkers: true } : {}),
    chartAreaFill: bg,
    chartAreaStrokeColor: bg,
    plotAreaFill: bg,
    categoryAxisLabelStyle: labelStyle,
    valueAxisLabelStyle: axisLabelStyle,
    valueAxisMinorTickMark: 'none',
    categoryAxisMinorTickMark: 'none',
    valueAxisMajorTickMark: 'none',
    categoryAxisMajorTickMark: 'none',
    valueAxisLineHidden: true,
    categoryAxisLineColor: axisLine,
    categoryAxisLineWidthEmu: 12700,
    valueAxisMajorGridlines: true,
    valueAxisMajorGridlineColor: hairline,
    valueAxisMajorGridlineWidthEmu: 9525,
    ...(grouping === 'percentStacked' ? { valueAxis: { min: 0, max: 1, numberFormat: '0%' } } : {}),
    ...(baseKind === 'bar' ? { categoryAxisOrientation: 'maxMin', valueAxisCrosses: 'max' } : {}),
    ...(kind !== 'combo' && showDirectValues && grouping === 'clustered' && chart.series.length <= 2 ? {
      dataLabels: {
        showValue: true,
        showCategory: false,
        showSeriesName: false,
        showPercent: false,
        position: dataLabelPos,
        textStyle: { font, sizePt: Math.max(11, sizePt - 2), bold: Boolean(highlightSet), color: fg },
      },
    } : {}),
    ...(chart.unit ? { valueAxisTitle: chart.unit, valueAxisTitleStyle: axisLabelStyle } : {}),
    ...(hasSecondary ? {
      secondaryValueAxis: {
        labelStyle: axisLabelStyle,
        majorGridlines: false,
        majorTickMark: 'none',
        minorTickMark: 'none',
      },
    } : {}),
    legend: { position: showLegend ? 't' : null, textStyle: labelStyle },
  }
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/[\u000B\u000C]/g, '\n')
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function hex6(color, fallback = '0057B8') {
  const clean = String(color ?? '').replace('#', '').trim().toUpperCase()
  if (/^[0-9A-F]{6}$/.test(clean)) return clean
  if (/^[0-9A-F]{3}$/.test(clean)) return clean.split('').map(c => c + c).join('')
  return fallback
}

function parseRichRuns(text, defaultBold = false) {
  const str = String(text ?? '')
  if (!/[*`]/.test(str)) {
    const colon = !defaultBold && /^([^:：]{1,12})([:：]\s*)([\s\S]+)$/.exec(str)
    if (colon) return [{ text: colon[1] + colon[2], bold: true }, { text: colon[3], bold: false, secondary: true }]
    return [{ text: str, bold: defaultBold }]
  }
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`/g
  const runs = []
  let last = 0
  for (const m of str.matchAll(re)) {
    if (m.index > last) runs.push({ text: str.slice(last, m.index), bold: defaultBold })
    if (m[1] !== undefined) runs.push({ text: m[1], bold: true })
    else if (m[2] !== undefined) runs.push({ text: m[2], bold: defaultBold, italic: true })
    else if (m[3] !== undefined) runs.push({ text: m[3], bold: true, code: true })
    last = m.index + m[0].length
  }
  if (last < str.length) runs.push({ text: str.slice(last), bold: defaultBold })
  return runs.length ? runs : [{ text: str, bold: defaultBold }]
}

/**
 * Native DrawingML shape compiler for media/chart slides (including 100% vector waterfall bridges,
 * framed image mattes, vertically centered rich-text columns, and chart-split insight cards).
 */
export function renderMediaPptxShapes(slide, index, theme, langId = 'zh-CN', fontHelpers = {}, total = 1, manifest = {}) {
  const p = theme.palette || {}
  const t = theme.tokens || {}
  const fg = t.inkPrimary || p.fg || '#0F172A'
  const secondary = t.inkSecondary || p.muted || '#334155'
  const muted = t.inkMuted || p.muted || '#64748B'
  const accent = p.accent || t.accentPrimary || '#0057B8'
  const accent2 = p.accent2 || t.accentSecondary || accent
  const accentText = t.accentText || accent
  const surface1 = t.surface1 || p.panel || (theme.dark ? '#141B29' : '#F4F6F9')
  const hairline = t.hairline || (theme.dark ? '#263554' : '#D5DFEC')
  const posColor = t.positive || (theme.dark ? '#34D399' : '#0D7A4E')
  const negColor = t.negative || (theme.dark ? '#F87171' : '#C81E1E')
  const focalColor = t.chartFocal || accent
  const chromeStyle = resolveChromeStyle(theme, slide, manifest?.brand)
  const chromeCfg = getChromeConfig(chromeStyle, theme)
  const isEn = langId === 'en-US'

  const headingFont = fontHelpers.latinHeading || 'Segoe UI'
  const headingEa = fontHelpers.eaHeading || 'Microsoft YaHei'
  const bodyFont = fontHelpers.latinBody || 'Segoe UI'
  const bodyEa = fontHelpers.eaBody || 'Microsoft YaHei'

  const toEmu = v => Math.round(v * 914400)
  const boxEmu = b => ({ x: toEmu(b.x), y: toEmu(b.y), w: toEmu(b.w), h: toEmu(b.h) })
  const boxes = mediaBoxes(slide.layout, slide.variant, slide, manifest)
  const variant = String(slide.variant ?? '').trim().toLowerCase()
  const isBleed = variant === 'full-bleed' || variant === 'split-bleed'
  let nextId = (index + 1) * 100 + 2
  const allocId = () => nextId++
  const shapes = []

  const runXml = (r, sizeHundredths, baseColor, latin, ea, extraAttrs = '') => {
    const col = r.secondary ? secondary : baseColor
    return `<a:r><a:rPr lang="${langId}" sz="${sizeHundredths}" b="${r.bold ? 1 : 0}"${r.italic ? ' i="1"' : ''}${extraAttrs} dirty="0"><a:solidFill><a:srgbClr val="${hex6(col)}"/></a:solidFill><a:latin typeface="${xmlEscape(latin)}"/><a:ea typeface="${xmlEscape(ea)}"/></a:rPr><a:t>${xmlEscape(r.text)}</a:t></a:r>`
  }

  const paraRich = (content, opts = {}) => {
    const { size = 1600, color = fg, bold = false, align = 'l', bullet = false, bulletChar = '▪', bulletColor = accent, latin = bodyFont, ea = bodyEa, spaceBefore = 0, spaceAfter = 0, linePct = 135000, spc = 0 } = opts
    const runs = parseRichRuns(content, bold)
    const spacing = `<a:lnSpc><a:spcPct val="${linePct}"/></a:lnSpc>` +
      (spaceBefore > 0 ? `<a:spcBef><a:spcPts val="${spaceBefore}"/></a:spcBef>` : '') +
      (spaceAfter > 0 ? `<a:spcAft><a:spcPts val="${spaceAfter}"/></a:spcAft>` : '')
    const pPr = `<a:pPr${bullet ? ' marL="247650" indent="-247650"' : ''}${align !== 'l' ? ` algn="${align}"` : ''}>${spacing}` +
      (bullet ? `<a:buClr><a:srgbClr val="${hex6(bulletColor)}"/></a:buClr><a:buFont typeface="${xmlEscape(latin)}"/><a:buChar char="${bulletChar}"/>` : '<a:buNone/>') +
      `</a:pPr>`
    const extra = spc ? ` spc="${spc}"` : ''
    return `<a:p>${pPr}${runs.map(r => runXml(r, size, color, latin, ea, extra)).join('')}</a:p>`
  }

  const spText = (name, b, paragraphs, opts = {}) => {
    const { anchor = 't', fill = null, stroke = null, strokeW = 12700, roundAdj = 0, ins = [91440, 45720, 91440, 45720], fontScale = 100000 } = opts
    const eb = b.x > 1000 ? b : boxEmu(b)
    const geom = roundAdj > 0
      ? `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${roundAdj}"/></a:avLst></a:prstGeom>`
      : `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`
    const fillXml = fill ? `<a:solidFill><a:srgbClr val="${hex6(fill)}"/></a:solidFill>` : '<a:noFill/>'
    const lnXml = stroke ? `<a:ln w="${strokeW}"><a:solidFill><a:srgbClr val="${hex6(stroke)}"/></a:solidFill></a:ln>` : '<a:ln/>'
    return `<p:sp><p:nvSpPr><p:cNvPr id="${allocId()}" name="${xmlEscape(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
      `<p:spPr><a:xfrm><a:off x="${eb.x}" y="${eb.y}"/><a:ext cx="${eb.w}" cy="${eb.h}"/></a:xfrm>${geom}${fillXml}${lnXml}</p:spPr>` +
      `<p:txBody><a:bodyPr wrap="square" rtlCol="0" anchor="${anchor}" lIns="${ins[0]}" tIns="${ins[1]}" rIns="${ins[2]}" bIns="${ins[3]}"><a:normAutofit${fontScale < 100000 ? ` fontScale="${fontScale}"` : ''}/></a:bodyPr><a:lstStyle/>${paragraphs.join('')}</p:txBody></p:sp>`
  }

  const spRect = (name, eb, fill, stroke = null, strokeW = 12700, roundAdj = 3500) => {
    const geom = roundAdj > 0
      ? `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${roundAdj}"/></a:avLst></a:prstGeom>`
      : `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`
    const lnXml = stroke ? `<a:ln w="${strokeW}"><a:solidFill><a:srgbClr val="${hex6(stroke)}"/></a:solidFill></a:ln>` : '<a:ln><a:noFill/></a:ln>'
    return `<p:sp><p:nvSpPr><p:cNvPr id="${allocId()}" name="${xmlEscape(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
      `<p:spPr><a:xfrm><a:off x="${eb.x}" y="${eb.y}"/><a:ext cx="${eb.w}" cy="${eb.h}"/></a:xfrm>${geom}<a:solidFill><a:srgbClr val="${hex6(fill)}"/></a:solidFill>${lnXml}</p:spPr>` +
      `<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`
  }

  const spLine = (name, x1, y1, x2, y2, color, widthEmu = 12700, dash = 'solid') => {
    const ox = Math.min(x1, x2), oy = Math.min(y1, y2)
    const cx = Math.abs(x2 - x1), cy = Math.abs(y2 - y1)
    const flipH = x2 < x1 ? ' flipH="1"' : '', flipV = y2 < y1 ? ' flipV="1"' : ''
    return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${allocId()}" name="${xmlEscape(name)}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>` +
      `<p:spPr><a:xfrm${flipH}${flipV}><a:off x="${ox}" y="${oy}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom>` +
      `<a:ln w="${widthEmu}"><a:solidFill><a:srgbClr val="${hex6(color)}"/></a:solidFill><a:prstDash val="${dash}"/></a:ln></p:spPr></p:cxnSp>`
  }

  // Kicker & Action Title (aligned with 6 Chrome Skeletons)
  const titleUnits = textUnits(slide.title)
  const titlePt = slide.visual?.titleSize ?? (titleUnits > 26 ? 22 : titleUnits > 18 ? 25 : 28)
  const hasKicker = Boolean(slide.kicker && slide.kicker !== slide.title)
  const cardAdj = chromeCfg.cardRadiusPx > 0 ? (chromeStyle === 'keynote-spatial' ? 6000 : 3500) : 0
  const cardStroke = chromeCfg.cardBorderless ? null : hairline
  const cardStrokeW = Math.round(chromeCfg.cardStrokePt * 12700)

  if (!isBleed && chromeStyle === 'academic-minimal') {
    // Beamer Metropolis full-width tinted header band + 1.5pt accent bottom rule
    shapes.push(spRect('Beamer header band', boxEmu({ x: 0, y: 0, w: CANVAS.w, h: 1.28 }), surface1, null, 0, 0))
    shapes.push(spLine('Beamer header rule', 0, toEmu(1.28), toEmu(CANVAS.w), toEmu(1.28), accent, 19050, 'solid'))
    if (hasKicker) {
      shapes.push(spText('Kicker', { x: 0.65, y: 0.14, w: 12.03, h: 0.24 }, [paraRich(slide.kicker.toUpperCase(), { size: 1000, color: accentText, bold: true, spc: 140 })], { ins: [0, 0, 0, 0] }))
    }
    shapes.push(spText('Title', { x: 0.65, y: hasKicker ? 0.38 : 0.24, w: 12.03, h: 0.80 }, [paraRich(slide.title || '', { size: Math.min(25, titlePt) * 100, color: fg, bold: true, latin: headingFont, ea: headingEa, linePct: 118000 })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
  } else if (!isBleed && chromeStyle === 'editorial-folio') {
    if (hasKicker) {
      shapes.push(spText('Kicker', { x: 0.65, y: 0.22, w: 8.8, h: 0.26 }, [paraRich(slide.kicker.toUpperCase(), { size: 1000, color: accentText, bold: true, spc: 180 })], { ins: [0, 0, 0, 0] }))
    }
    shapes.push(spLine('Editorial folio rule', toEmu(0.65), toEmu(0.54), toEmu(12.68), toEmu(0.54), hairline, 6350, 'solid'))
    shapes.push(spText('Title', { x: 0.65, y: 0.64, w: 12.03, h: 0.82 }, [paraRich(slide.title || '', { size: titlePt * 100, color: fg, bold: true, latin: headingFont, ea: headingEa, linePct: 118000 })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
    shapes.push(spLine('Header rule', toEmu(0.65), toEmu(1.56), toEmu(12.68), toEmu(1.56), hairline, 6350, 'solid'))
  } else if (!isBleed && chromeStyle === 'consulting-classic') {
    let trackerW = 0
    if (hasKicker) {
      trackerW = computeBadgePillWidth(slide.kicker.toUpperCase(), 10, 3.6, 1.15)
      shapes.push(spText('Kicker', { x: 12.68 - trackerW, y: 0.42, w: trackerW, h: 0.32 }, [paraRich(slide.kicker.toUpperCase(), { size: 1000, color: accentText, bold: true, align: 'ctr', spc: 80 })], {
        anchor: 'ctr',
        fill: t.accentSoft || surface1,
        stroke: accent,
        strokeW: 9525,
        roundAdj: 0,
        ins: [45720, 18288, 45720, 18288],
      }))
    }
    const titleW = trackerW > 0 ? 12.03 - trackerW - 0.30 : 12.03
    shapes.push(spText('Title', { x: 0.65, y: 0.42, w: titleW, h: 1.02 }, [paraRich(slide.title || '', { size: titlePt * 100, color: fg, bold: true, latin: headingFont, ea: headingEa, linePct: 118000 })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
    shapes.push(spLine('Header rule', toEmu(0.65), toEmu(1.56), toEmu(12.68), toEmu(1.56), hairline, 9525, 'solid'))
  } else if (!isBleed && chromeStyle === 'gov-ceremonial') {
    if (hasKicker) {
      const gk = /^【/.test(slide.kicker.trim()) ? slide.kicker.trim() : '【' + slide.kicker.trim() + '】'
      shapes.push(spText('Kicker', boxes.kicker, [paraRich(gk, { size: 1150, color: accentText, bold: true, spc: 80 })], { ins: [0, 0, 0, 0] }))
    }
    shapes.push(spText('Title', boxes.title, [paraRich(slide.title || '', { size: titlePt * 100, color: fg, bold: true, latin: headingFont, ea: headingEa, linePct: 118000 })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
    shapes.push(spLine('Header rule', toEmu(0.65), toEmu(1.50), toEmu(12.68), toEmu(1.50), accent, 19050, 'solid'))
    shapes.push(spLine('Header secondary rule', toEmu(0.65), toEmu(1.57), toEmu(12.68), toEmu(1.57), accent2, 6350, 'solid'))
  } else if (!isBleed && chromeStyle === 'keynote-spatial') {
    if (hasKicker) {
      const pillW = computeBadgePillWidth(slide.kicker.toUpperCase(), 10, 4.2, 1.05)
      shapes.push(spText('Kicker', { x: 0.65, y: 0.30, w: pillW, h: 0.28 }, [paraRich(slide.kicker.toUpperCase(), { size: 1000, color: accentText, bold: true, align: 'ctr', spc: 100 })], {
        anchor: 'ctr',
        fill: t.accentSoft || surface1,
        roundAdj: 50000,
        ins: [45720, 12000, 45720, 12000],
      }))
    }
    shapes.push(spText('Title', { x: 0.65, y: hasKicker ? 0.62 : 0.44, w: 12.03, h: 0.88 }, [paraRich(slide.title || '', { size: titlePt * 100, color: fg, bold: true, latin: headingFont, ea: headingEa, linePct: 118000 })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
    // Zero horizontal divider line in keynote-spatial!
  } else {
    if (hasKicker && variant !== 'full-bleed') {
      shapes.push(spText('Kicker', boxes.kicker, [paraRich(slide.kicker.toUpperCase(), { size: 1100, color: accentText, bold: true, spc: 140 })], { ins: [0, 0, 0, 0] }))
    }
    if (variant === 'full-bleed') {
      const scrim = boxEmu({ x: 0.45, y: 5.15, w: 11.2, h: 1.75 })
      shapes.push(spRect('Title Scrim', scrim, theme.dark ? '#090B10' : '#FFFFFF', hairline, 9525, 3500))
    }
    shapes.push(spText('Title', boxes.title, [paraRich(slide.title || '', { size: titlePt * 100, color: fg, bold: true, latin: headingFont, ea: headingEa, linePct: 118000 })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
    if (!isBleed) {
      shapes.push(spLine('Header rule', toEmu(0.65), toEmu(1.56), toEmu(12.68), toEmu(1.56), hairline, 9525, 'solid'))
    }
  }

  // Framed matte container behind non-bleed images
  if (['image', 'image-left', 'image-right'].includes(slide.layout) && !isBleed) {
    if (Array.isArray(boxes.gallery) && Array.isArray(slide.images) && slide.images.length > 1) {
      boxes.gallery.forEach((gBox, gIdx) => {
        const pad = 0.06
        shapes.push(spRect(`Gallery Frame ${gIdx + 1}`, boxEmu({ x: gBox.x - pad, y: gBox.y - pad, w: gBox.w + pad * 2, h: gBox.h + pad * 2 }), surface1, cardStroke, cardStrokeW || 9525, cardAdj))
        if (slide.images[gIdx]?.caption) {
          shapes.push(spText(`Gallery Caption ${gIdx + 1}`, { x: gBox.x, y: gBox.y + gBox.h + 0.08, w: gBox.w, h: 0.28 }, [paraRich(slide.images[gIdx].caption, { size: 1150, color: muted, align: 'ctr' })], { ins: [0, 0, 0, 0] }))
        }
      })
    } else {
      const ib = boxes.image, pad = 0.06
      shapes.push(spRect('Image Matte', boxEmu({ x: ib.x - pad, y: ib.y - pad, w: ib.w + pad * 2, h: ib.h + pad * 2 }), surface1, cardStroke, cardStrokeW || 9525, cardAdj))
    }
  }

  // Body column for image-left / image-right (vertically centered + distinct subtitle hierarchy!)
  if (boxes.body && (slide.layout === 'image-left' || slide.layout === 'image-right')) {
    const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
    const bodyPt = slide.visual?.bodySize ?? (bullets.length > 4 ? 15 : 16.5)
    const paras = []
    if (slide.subtitle) {
      paras.push(paraRich(slide.subtitle, { size: Math.round((bodyPt + 1.5) * 100), color: secondary, bold: false, spaceAfter: bullets.length ? 900 : 0, linePct: 140000 }))
    }
    bullets.forEach((b, idx) => {
      paras.push(paraRich(b, { size: Math.round(bodyPt * 100), color: fg, bullet: true, bulletChar: '▪', bulletColor: accent, spaceAfter: idx < bullets.length - 1 ? 550 : 0, linePct: 142000 }))
    })
    if (paras.length) {
      shapes.push(spText('Body', boxes.body, paras, { anchor: 'ctr', ins: [45720, 45720, 45720, 45720] }))
    }
  }

  // Structured insight cards for chart-split (chrome-aware card geometry)
  if (slide.layout === 'chart-split' && boxes.body) {
    const cards = projectInsightCards(slide)
    const count = Math.max(1, cards.length)
    const gap = 0.16
    const cardH = (boxes.body.h - gap * (count - 1)) / count
    cards.forEach((card, idx) => {
      const cy = boxes.body.y + idx * (cardH + gap)
      const cardBox = { x: boxes.body.x, y: cy, w: boxes.body.w, h: cardH }
      const paras = []
      if (card.value) {
        paras.push(paraRich(card.value + (card.unit ? ` ${card.unit}` : ''), { size: 2200, color: accentText, bold: true, spaceAfter: 180 }))
      } else if (card.tag) {
        paras.push(paraRich(card.tag, { size: 1000, color: accentText, bold: true, spc: 120, spaceAfter: 140 }))
      }
      if (card.title) paras.push(paraRich(card.title, { size: 1450, color: fg, bold: true, spaceAfter: card.text ? 160 : 0 }))
      if (card.text) paras.push(paraRich(card.text, { size: 1350, color: secondary, linePct: 132000 }))
      shapes.push(spText(`Insight Card ${idx + 1}`, cardBox, paras.length ? paras : [paraRich('', { size: 1350 })], {
        anchor: 'ctr',
        fill: surface1,
        stroke: cardStroke,
        strokeW: cardStrokeW || 9525,
        roundAdj: chromeStyle === 'keynote-spatial' ? 6000 : (chromeCfg.cardRadiusPx > 0 ? roundRectAdj(cardBox.w, cardBox.h, chromeCfg.cardRadiusPx) : 0),
        ins: [128000, 76200, 128000, 76200],
      }))
      if (chromeCfg.cardLeftBar) {
        shapes.push(spRect(`Insight Stripe ${idx + 1}`, boxEmu({ x: cardBox.x, y: cardBox.y, w: 0.04, h: cardBox.h }), accent, null, 0, 0))
      } else if (chromeCfg.cardTopBar && idx === 0) {
        shapes.push(spRect(`Insight Top ${idx + 1}`, boxEmu({ x: cardBox.x, y: cardBox.y, w: cardBox.w, h: 0.045 }), accent, null, 0, 0))
      }
    })
  }

  // Native editable OOXML vector Waterfall bridge chart
  if ((slide.layout === 'chart' || slide.layout === 'chart-split') && slide.chart?.kind === 'waterfall') {
    const cb = boxEmu(boxes.chart)
    const plotLeft = cb.x + Math.round(cb.w * 0.085)
    const plotRight = cb.x + Math.round(cb.w * 0.975)
    const plotTop = cb.y + Math.round(cb.h * 0.11)
    const plotBottom = cb.y + Math.round(cb.h * 0.83)
    const geom = computeWaterfallGeometry(slide.chart, { left: plotLeft, right: plotRight, top: plotTop, bottom: plotBottom })

    geom.ticks.forEach((tk, tIdx) => {
      shapes.push(spLine(`Waterfall Grid ${tIdx}`, plotLeft, Math.round(tk.y), plotRight, Math.round(tk.y), hairline, 9525, 'solid'))
      shapes.push(spText(`Waterfall Tick ${tIdx}`, { x: cb.x, y: Math.round(tk.y - 95000), w: plotLeft - cb.x - 68000, h: 190000 }, [paraRich(tk.label, { size: 1100, color: muted, align: 'r' })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
    })

    geom.connectors.forEach((cn, cIdx) => {
      shapes.push(spLine(`Waterfall Bridge ${cIdx + 1}`, Math.round(cn.x1), Math.round(cn.y1), Math.round(cn.x2), Math.round(cn.y2), muted, 11430, 'dash'))
    })

    geom.bars.forEach((b, bIdx) => {
      const col = b.role === 'total' ? focalColor : b.role === 'positive' ? posColor : negColor
      shapes.push(spRect(`Waterfall Bar ${bIdx + 1}`, { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.max(25400, Math.round(b.h)) }, col, null, 0, chromeCfg.cardRadiusPx > 0 ? 3500 : 0))
      const labelY = b.value >= 0 || b.isTotal ? Math.round(b.y - 220000) : Math.round(b.y + b.h + 25000)
      shapes.push(spText(`Waterfall Value ${bIdx + 1}`, { x: Math.round(b.x - 95000), y: labelY, w: Math.round(b.w + 190000), h: 205000 }, [paraRich(b.label, { size: 1150, color: b.role === 'total' ? fg : col, bold: true, align: 'ctr' })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
      shapes.push(spText(`Waterfall Category ${bIdx + 1}`, { x: Math.round(b.x - 110000), y: plotBottom + 42000, w: Math.round(b.w + 220000), h: 240000 }, [paraRich(b.category, { size: 1200, color: fg, align: 'ctr' })], { anchor: 't', ins: [0, 0, 0, 0] }))
    })

    shapes.push(spLine('Waterfall Baseline', plotLeft, Math.round(geom.zeroY), plotRight, Math.round(geom.zeroY), secondary, 15875, 'solid'))
    if (slide.chart.unit) {
      shapes.push(spText('Waterfall Unit', { x: plotRight - 1400000, y: cb.y, w: 1400000, h: 200000 }, [paraRich(slide.chart.unit, { size: 1100, color: muted, align: 'r' })], { ins: [0, 0, 0, 0] }))
    }
  }

  // 原生图表顶部精修标注徽章（麦肯锡增长飞线结论 / 基准参考线提示，避免遮挡柱体，原生可编辑）
  if ((slide.layout === 'chart' || slide.layout === 'chart-split') && slide.chart && slide.chart.kind !== 'waterfall') {
    const taste = resolveActiveTaste(manifest, slide)
    const chartObj = slide.chart
    const badges = []
    if (chartObj.callout?.label || chartObj.showGrowthCallout || taste.chartGrowthCallout) {
      const vals = chartObj.series?.[0]?.values || []
      const fromIdx = Number.isInteger(chartObj.callout?.fromIndex) ? Math.max(0, Math.min(vals.length - 1, chartObj.callout.fromIndex)) : 0
      const toIdx = Number.isInteger(chartObj.callout?.toIndex) ? Math.max(0, Math.min(vals.length - 1, chartObj.callout.toIndex)) : vals.length - 1
      let gText = chartObj.callout?.label || ''
      let isPos = true
      if (vals.length >= 2 && fromIdx !== toIdx) {
        const v0 = vals[fromIdx]
        const v1 = vals[toIdx]
        isPos = v1 >= v0
        if (!gText && Math.abs(v0) > 1e-9 && ['column', 'bar', 'line', 'area', 'combo'].includes(chartObj.kind)) {
          const pct = ((v1 - v0) / Math.abs(v0)) * 100
          gText = `${chartObj.categories[fromIdx]}→${chartObj.categories[toIdx]}  ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
        }
      }
      if (gText) badges.push({ text: gText, color: isPos ? posColor : negColor })
    }
    if (chartObj.referenceLine && Number.isFinite(chartObj.referenceLine.value)) {
      const rLbl = chartObj.referenceLine.label || `${isEn ? 'Target' : '基准线'} ${chartObj.referenceLine.value}`
      badges.push({ text: '┄ ' + rLbl, color: chartObj.referenceLine.color || accent2 })
    }
    if (badges.length > 0 && boxes.chart) {
      let curRight = boxes.chart.x + boxes.chart.w
      const badgeY = Math.max(1.66, boxes.chart.y - 0.35)
      badges.forEach((b, bi) => {
        const bw = computeBadgePillWidth(b.text, 10.5, 3.6, 1.15)
        curRight -= bw
        if (curRight >= boxes.chart.x + 0.4) {
          shapes.push(spText('Chart Annotation ' + (bi + 1), { x: curRight, y: badgeY, w: bw, h: 0.28 }, [paraRich(b.text, { size: 1050, color: b.color, bold: true, align: 'ctr' })], {
            anchor: 'ctr',
            fill: t.canvas || p.bg || '#FFFFFF',
            stroke: b.color,
            strokeW: 9525,
            roundAdj: 50000,
            ins: [45720, 9144, 45720, 9144],
          }))
          curRight -= 0.12
        }
      })
    }
  }

  // Caption + Chrome-aware Takeaway coexistence
  const caption = slide.chart?.caption || slide.image?.caption
  if (caption) {
    shapes.push(spText('Caption', boxes.caption, [paraRich(caption, { size: 1150, color: muted })], { ins: [0, 0, 0, 0] }))
  }
  if (slide.takeaway) {
    const tkText = slide.takeaway.trim()
    if (chromeCfg.takeawayStyle === 'caption') {
      shapes.push(spText('Takeaway', boxes.takeaway, [paraRich(tkText, { size: 1350, color: secondary, align: 'ctr' })], {
        anchor: 'ctr',
        ins: [180000, 24000, 180000, 24000],
      }))
    } else if (chromeCfg.takeawayStyle === 'top-rule' || chromeCfg.takeawayStyle === 'editorial-rule') {
      const prefix = chromeCfg.takeawayStyle === 'editorial-rule'
        ? '**—**  '
        : (isEn ? '**Key Takeaway:** ' : '**核心结论：**')
      shapes.push(spRect('Takeaway accent', boxEmu({ x: boxes.takeaway.x, y: boxes.takeaway.y, w: boxes.takeaway.w, h: 0.02 }), chromeCfg.takeawayStyle === 'editorial-rule' ? hairline : accent, null, 0, 0))
      shapes.push(spText('Takeaway', { x: boxes.takeaway.x, y: boxes.takeaway.y + 0.05, w: boxes.takeaway.w, h: boxes.takeaway.h - 0.05 }, [paraRich(prefix + tkText, { size: 1350, color: fg })], {
        anchor: 'ctr',
        ins: [0, 20000, 0, 20000],
      }))
    } else {
      const accentSoft = theme?.tokens?.accentSoft || surface1
      shapes.push(spText('Takeaway', boxes.takeaway, [paraRich('▸  ' + tkText, { size: 1350, color: fg, bold: true })], {
        anchor: 'ctr',
        fill: accentSoft,
        stroke: hairline,
        strokeW: 9525,
        roundAdj: chromeCfg.cardRadiusPx > 0 ? 4000 : 0,
        ins: [201168, 36576, 146304, 36576],
      }))
      shapes.push(spRect('Takeaway accent', boxEmu({ x: boxes.takeaway.x, y: boxes.takeaway.y, w: 0.06, h: boxes.takeaway.h }), accent, null, 0, 0))
    }
  }

  // Footer source & chrome-aware Page number
  const rawSourceLine = slide.source || slide.chart?.source
  const formattedSource = rawSourceLine
    ? (/^(?:数据来源|来源|出处|测算口径|实验环境|统计口径|Source|Note)\s*[:：]/i.test(rawSourceLine.trim())
        ? rawSourceLine.trim()
        : (isEn ? 'Source: ' : '数据来源：') + rawSourceLine.trim())
    : ''
  const folio = String(index + 1).padStart(2, '0') + ' / ' + String(Math.max(1, total)).padStart(2, '0')

  if (chromeCfg.folioPos === 'beamer-bar') {
    shapes.push(spRect('Beamer footer band', boxEmu({ x: 0, y: 7.04, w: CANVAS.w, h: 0.46 }), surface1, null, 0, 0))
    shapes.push(spLine('Beamer footer rule', 0, toEmu(7.04), toEmu(CANVAS.w), toEmu(7.04), hairline, 6350, 'solid'))
    const leftText = formattedSource || manifest?.brand?.footer || manifest?.title || ''
    if (leftText) {
      shapes.push(spText(formattedSource ? 'Source' : 'Beamer zone left', { x: 0.65, y: 7.10, w: 4.4, h: 0.32 }, [paraRich(leftText, { size: 950, color: muted })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
    }
    const centerText = (slide.kicker || slide.title || '').trim()
    if (centerText) {
      shapes.push(spText('Beamer zone chapter', { x: 5.1, y: 7.10, w: 3.13, h: 0.32 }, [paraRich(centerText, { size: 950, color: secondary, bold: true, align: 'ctr' })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
    }
    shapes.push(spText('Page number', { x: 10.65, y: 7.10, w: 2.03, h: 0.32 }, [paraRich(folio, { size: 950, color: accentText, bold: true, align: 'r' })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
  } else {
    if (formattedSource && !manifest?.brand?.footer) {
      shapes.push(spText('Source', FOOTER_BOX, [paraRich(formattedSource, { size: 950, color: muted })], { ins: [0, 0, 0, 0] }))
    } else if (formattedSource && manifest?.brand?.footer) {
      shapes.push(spText('Source', { x: 5.4, y: 6.95, w: 5.0, h: 0.32 }, [paraRich(formattedSource, { size: 950, color: muted, align: 'r' })], { ins: [0, 0, 0, 0] }))
    }
    const folioBox = chromeCfg.folioPos === 'top-right'
      ? { x: 10.65, y: 0.22, w: 2.03, h: 0.28 }
      : { x: 10.65, y: 6.95, w: 2.03, h: 0.32 }
    shapes.push(spText('Page number', folioBox, [paraRich(folio, { size: chromeCfg.folioPos === 'top-right' ? 1000 : 950, color: muted, align: 'r' })], { anchor: 'ctr', ins: [0, 0, 0, 0] }))
  }

  return shapes.join('')
}

export const MEDIA_CSS = `
.slide--image,.slide--image-left,.slide--image-right,.slide--chart,.slide--chart-split{padding:0;align-items:center}
.slide--image .slide-inner,.slide--image-left .slide-inner,.slide--image-right .slide-inner,.slide--chart .slide-inner,.slide--chart-split .slide-inner{width:100%;display:flex;justify-content:center}
.media-canvas{position:relative;width:min(100vw,177.7778vh);height:min(100vh,56.25vw);container-type:inline-size}
.media-kicker,.media-title,.media-image,.media-body,.media-chart,.media-caption,.media-takeaway{position:absolute;margin:0;max-width:none;box-sizing:border-box}
.media-kicker{font-size:1.05cqw;line-height:1.2;margin:0}
.media-title{font-size:2.95cqw;font-weight:750;line-height:1.18;letter-spacing:-.015em;display:flex;align-items:center;overflow-wrap:anywhere}
.media-title--bleed{background:color-mix(in srgb, var(--bg) 88%, transparent);backdrop-filter:blur(10px);padding:1.1cqw 1.6cqw;border-radius:12px;border:1px solid color-mix(in srgb, var(--muted) 32%, transparent);z-index:2}
.media-image{overflow:hidden}
.media-image--framed{border-radius:12px;background:var(--surface1,var(--panel));border:1px solid var(--hairline,color-mix(in srgb, var(--muted) 28%, transparent));padding:.45cqw}
.media-image--framed img{border-radius:8px}
.media-image--bleed{border-radius:0}
.media-image img{width:100%;height:100%;display:block}
.media-image figcaption{position:absolute;left:.8cqw;right:.8cqw;bottom:.7cqw;padding:.35cqw .7cqw;border-radius:6px;background:color-mix(in srgb, var(--bg) 84%, transparent);color:var(--fg);font-size:1.05cqw}
.media-body{display:flex;flex-direction:column;justify-content:center;gap:.9cqw;font-size:1.68cqw;line-height:1.5;overflow-wrap:anywhere}
.media-lead{margin:0;font-size:1.82cqw;line-height:1.45;color:var(--ink-secondary,var(--muted));border-left:3px solid var(--accent);padding-left:.85cqw}
.media-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:.68cqw}
.media-list li{position:relative;padding-left:1.5cqw;margin:0}
.media-list li::before{content:"";position:absolute;left:0;top:.55em;width:.44em;height:.44em;border-radius:2px;background:var(--accent)}
.media-code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;padding:.08em .36em;border-radius:4px;background:var(--surface2,var(--panel))}
.media-insights{display:flex;flex-direction:column;justify-content:space-between;gap:.8cqw}
.media-insight-card{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:.25cqw;padding:.85cqw 1.1cqw;border-radius:10px;background:var(--surface1,var(--panel));border:1px solid var(--hairline,color-mix(in srgb, var(--muted) 28%, transparent))}
.media-insight-tag{font-size:.92cqw;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent-text,var(--accent))}
.media-insight-val{font-size:2.25cqw;font-weight:800;line-height:1.05;font-variant-numeric:tabular-nums;color:var(--accent-text,var(--accent))}
.media-insight-val small{font-size:.52em;font-weight:600;margin-left:.22em;color:var(--muted)}
.media-insight-head{font-size:1.36cqw;font-weight:700;line-height:1.25;color:var(--fg)}
.media-insight-text{margin:0;font-size:1.22cqw;line-height:1.38;color:var(--ink-secondary,var(--muted))}
.media-caption{color:var(--muted);font-size:1.12cqw;line-height:1.3}
.media-takeaway{display:flex;align-items:center;gap:.65cqw;padding:.45cqw 1.15cqw;border-radius:var(--radius-sm,8px);background:var(--accent-soft,var(--surface1,var(--panel)));border:1px solid var(--hairline,color-mix(in srgb, var(--muted) 28%, transparent));border-left:5px solid var(--accent);font-size:1.28cqw;font-weight:700;color:var(--fg)}
.media-takeaway .takeaway-arrow{color:var(--accent-text,var(--accent));font-size:1.1em;line-height:1}
.media-source{position:absolute;left:4.65%;bottom:2.6%;max-width:65%;font-size:clamp(10px,.95cqw,13px);color:var(--muted)}
.native-chart{width:100%;height:100%;font-family:var(--font-body);font-variant-numeric:tabular-nums}
.chart-data{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.brand-logo{position:absolute;right:5.2%;top:2.2%;width:7.1%;height:5.4%;object-fit:contain;pointer-events:none;z-index:4}
.brand-footer{position:absolute;left:4.875%;bottom:2.8%;max-width:65%;font-size:clamp(10px,.95cqw,14px);color:var(--muted)}
body.printing .brand-footer,body.printing .media-source{display:block}
.media-title--ruled{border-bottom:1px solid var(--hairline);padding-bottom:.4cqw}
.media-title--editorial{border-bottom:1px solid var(--hairline);padding-bottom:.3cqw}
.media-title--gov{border-bottom:2px solid var(--accent);box-shadow:0 4px 0 0 var(--bg),0 5.5px 0 0 var(--accent2);padding-bottom:.4cqw}
.media-kicker--pill{display:inline-flex;align-items:center;width:auto!important;height:auto!important;background:var(--accent-soft);padding:.28cqw 1cqw;border-radius:99px}
.media-consulting-tracker{position:absolute;right:4.875%;top:5.4%;background:var(--accent-soft);border:1px solid var(--accent);padding:.28cqw .9cqw;font-size:.92cqw;margin:0}
.media-editorial-bar{position:absolute;left:4.875%;right:4.875%;top:2.8%;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--hairline);padding-bottom:.35cqw;font-size:.95cqw;color:var(--muted)}
.media-kicker-inline{margin:0!important;font-size:.95cqw}
.media-beamer-band{position:absolute;left:0;right:0;top:0;height:17%;background:var(--surface1,var(--panel));border-bottom:2.5px solid var(--accent);padding:1.2cqw 4.875%;display:flex;flex-direction:column;justify-content:center;gap:.3cqw;box-sizing:border-box}
.media-kicker-band{margin:0!important;font-size:.92cqw}
.media-title-band{margin:0;font-size:2.45cqw;font-weight:750;line-height:1.15;color:var(--fg)}
.media-beamer-status{position:absolute;left:0;right:0;bottom:0;height:6%;background:var(--surface1,var(--panel));border-top:1px solid var(--hairline);padding:0 4.875%;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;font-size:.92cqw;color:var(--muted);font-variant-numeric:tabular-nums}
.media-beamer-mid{text-align:center;font-weight:600;color:var(--ink-secondary)}
.media-beamer-right{text-align:right;font-weight:700;color:var(--accent-text)}
.slide[data-chrome="consulting-classic"] .media-image--framed,.slide[data-chrome="consulting-classic"] .media-insight-card{border-radius:0;border-left:3.5px solid var(--accent)}
.slide[data-chrome="consulting-classic"] .media-takeaway{background:transparent;border:0;border-top:1.5px solid var(--accent);border-radius:0;padding:.45cqw 0 0}
.slide[data-chrome="keynote-spatial"] .media-image--framed,.slide[data-chrome="keynote-spatial"] .media-insight-card{border:0;border-radius:18px}
.slide[data-chrome="keynote-spatial"] .media-takeaway{background:transparent;border:0;justify-content:center;text-align:center;color:var(--ink-secondary);font-weight:500}
.slide[data-chrome="editorial-folio"] .media-image--framed,.slide[data-chrome="editorial-folio"] .media-insight-card{border-radius:0}
.slide[data-chrome="editorial-folio"] .media-takeaway{background:transparent;border:0;border-top:1px solid var(--hairline);border-radius:0;padding:.45cqw 0 0}
.slide[data-chrome="academic-minimal"] .media-takeaway{background:transparent;border:0;border-top:1px solid var(--accent);border-bottom:1px solid var(--hairline);border-radius:0;padding:.35cqw 0}
.slide[data-chrome="academic-minimal"] .media-canvas .slide-folio{display:none}
`

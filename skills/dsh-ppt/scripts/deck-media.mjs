// Shared geometry and chart data for the offline player and native PPTX export.
export const MEDIA_LAYOUTS = new Set(['image', 'image-left', 'image-right', 'chart'])
export const CANVAS = { w: 13.3333333333, h: 7.5 }
export const LOGO_BOX = { x: 11.55, y: 0.12, w: 0.95, h: 0.42 }
export const FOOTER_BOX = { x: 0.85, y: 6.95, w: 9.3, h: 0.3 }

export function mediaBoxes(layout) {
  const title = { x: 0.85, y: 0.64, w: 11.6, h: 0.85 }
  const left = { x: 0.85, y: 1.85, w: 5.55, h: 4.65 }
  const right = { x: 6.88, y: 1.85, w: 5.6, h: 4.65 }
  const full = { x: 0.85, y: 1.85, w: 11.6, h: 4.65 }
  return { title, image: { ...(layout === 'image-left' ? left : layout === 'image-right' ? right : full), h: 4.45 },
    body: layout === 'image-left' ? right : layout === 'image-right' ? left : null,
    chart: { ...full, h: 4.45 }, caption: { x: 0.85, y: 6.38, w: 11.6, h: 0.35 } }
}

function numeric(value, page) {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) {
    throw new Error(`dsh-ppt：第 ${page} 页图表有非数值数据：${String(value).slice(0, 40)}`)
  }
  const result = Number(value)
  if (!Number.isFinite(result)) throw new Error(`dsh-ppt：第 ${page} 页图表数值必须有限`)
  return result
}

export function normalizeChart(input, page = 1) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`dsh-ppt：第 ${page} 页缺少 chart 对象`)
  const kind = input.kind ?? 'column'
  if (!['column', 'bar', 'line', 'pie'].includes(kind)) throw new Error(`dsh-ppt：第 ${page} 页未知图表类型 ${kind}`)
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
  if (!Array.isArray(categories) || categories.length < 1 || categories.length > 24 || categories.some(c => String(c ?? '').trim() === '')) {
    throw new Error(`dsh-ppt：第 ${page} 页图表需 1–24 个非空类别`)
  }
  if (!Array.isArray(series) || series.length < 1 || series.length > 6) throw new Error(`dsh-ppt：第 ${page} 页图表需 1–6 个数据系列`)
  const clean = series.map((s, i) => {
    if (!s || !Array.isArray(s.values) || s.values.length !== categories.length) throw new Error(`dsh-ppt：第 ${page} 页图表第 ${i + 1} 个系列与类别数量不一致`)
    return { name: String(s.name ?? `系列 ${i + 1}`).trim() || `系列 ${i + 1}`, values: s.values.map(v => numeric(v, page)) }
  })
  if (kind === 'pie' && (clean.length !== 1 || categories.length > 12 || clean[0].values.some(v => v < 0) || clean[0].values.reduce((a, b) => a + b, 0) <= 0)) {
    throw new Error(`dsh-ppt：第 ${page} 页饼图只支持一个系列、最多 12 个类别，数值需非负且总和大于零`)
  }
  return { kind, categories: categories.map(c => String(c).trim()), series: clean,
    ...(input.unit ? { unit: String(input.unit) } : {}), ...(input.caption ? { caption: String(input.caption) } : {}) }
}

export function normalizeMediaSlide(source, normalized, index) {
  if (!MEDIA_LAYOUTS.has(normalized.layout)) return normalized
  if (normalized.layout === 'chart') return { ...normalized, chart: normalizeChart(source.chart, index + 1) }
  const image = typeof source.image === 'string' ? { src: source.image } : source.image
  if (!image || typeof image !== 'object' || (!image.src && !image.assetId)) throw new Error(`dsh-ppt：第 ${index + 1} 页缺少 image.src`)
  const fit = image.fit ?? 'contain'
  if (!['contain', 'cover'].includes(fit)) throw new Error(`dsh-ppt：第 ${index + 1} 页 image.fit 仅支持 contain / cover`)
  return { ...normalized, image: { ...(image.src ? { src: String(image.src) } : {}), ...(image.assetId ? { assetId: String(image.assetId) } : {}),
    alt: String(image.alt ?? normalized.title ?? ''), fit, ...(image.caption ? { caption: String(image.caption) } : {}) } }
}

const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
const position = box => `left:${box.x / CANVAS.w * 100}%;top:${box.y / CANVAS.h * 100}%;width:${box.w / CANVAS.w * 100}%;height:${box.h / CANVAS.h * 100}%`
export function chartColors(theme) { return [theme.palette.accent, theme.palette.accent2, '#55B5AA', '#A580D3', '#E67979', '#7EA4C4'] }

export function renderChartSvg(chart, theme) {
  const colors = chartColors(theme), fg = theme.palette.fg, muted = theme.palette.muted
  const width = 1120, height = 430, n = chart.categories.length
  const rect = (x, y, w, h, color) => `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(0, h)}" fill="${color}"/>`
  const text = (x, y, content, anchor = 'start', color = fg, size = 18) => `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-size="${size}">${esc(content)}</text>`
  const line = (x1, y1, x2, y2, color = muted) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"/>`
  let shapes = ''
  if (chart.kind === 'pie') {
    const values = chart.series[0].values, sum = values.reduce((a, b) => a + b, 0)
    let angle = -Math.PI / 2
    values.forEach((value, i) => {
      const next = angle + value / sum * Math.PI * 2
      if (value === sum) shapes += `<circle cx="350" cy="205" r="173" fill="${colors[i % colors.length]}"/>`
      else if (value > 0) shapes += `<path d="M 350 205 L ${350 + Math.cos(angle) * 173} ${205 + Math.sin(angle) * 173} A 173 173 0 ${next - angle > Math.PI ? 1 : 0} 1 ${350 + Math.cos(next) * 173} ${205 + Math.sin(next) * 173} Z" fill="${colors[i % colors.length]}"/>`
      angle = next
      const y = 35 + i * 30
      shapes += rect(625, y - 15, 15, 15, colors[i % colors.length]) + text(651, y, chart.categories[i])
        + text(1095, y, `${(value / sum * 100).toFixed(1)}%`, 'end')
    })
  } else {
    const values = chart.series.flatMap(s => s.values), min = Math.min(0, ...values), max = Math.max(0, ...values)
    const span = max - min || 1, left = chart.kind === 'bar' ? 170 : 82, right = 1090, top = 18, bottom = 340
    const y = value => bottom - (value - min) / span * (bottom - top)
    const x = value => left + (value - min) / span * (right - left)
    for (let tick = 0; tick <= 4; tick++) {
      const value = min + span * tick / 4, label = Number(value.toPrecision(4)).toLocaleString('en-US')
      if (chart.kind === 'bar') shapes += line(x(value), top, x(value), bottom, `${muted}66`) + text(x(value), bottom + 28, label, 'middle', muted, 16)
      else shapes += line(left, y(value), right, y(value), `${muted}66`) + text(left - 12, y(value) + 6, label, 'end', muted, 16)
    }
    chart.categories.forEach((category, i) => {
      if (chart.kind === 'bar') shapes += text(left - 14, top + (i + 0.5) * (bottom - top) / n + 6, category, 'end', fg, 16)
      else shapes += text(left + (i + 0.5) * (right - left) / n, bottom + 30, category, 'middle', fg, 16)
    })
    chart.series.forEach((series, s) => {
      const color = colors[s % colors.length]
      if (chart.kind === 'line') {
        const points = series.values.map((v, i) => `${left + (i + 0.5) * (right - left) / n},${y(v)}`).join(' ')
        shapes += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="4"/>`
        series.values.forEach((v, i) => { shapes += `<circle cx="${left + (i + 0.5) * (right - left) / n}" cy="${y(v)}" r="5" fill="${color}"/>` })
      } else series.values.forEach((v, i) => {
        if (chart.kind === 'bar') {
          const group = (bottom - top) / n, h = group * 0.7 / chart.series.length
          shapes += rect(Math.min(x(0), x(v)), top + i * group + group * 0.15 + s * h, Math.abs(x(v) - x(0)), Math.max(1, h - 2), color)
        } else {
          const group = (right - left) / n, w = group * 0.7 / chart.series.length
          shapes += rect(left + i * group + group * 0.15 + s * w, Math.min(y(0), y(v)), Math.max(1, w - 3), Math.abs(y(v) - y(0)), color)
        }
      })
    })
    shapes += chart.kind === 'bar' ? line(x(0), top, x(0), bottom, fg) : line(left, y(0), right, y(0), fg)
    chart.series.forEach((s, i) => { shapes += rect(left + i * 175, 397, 14, 14, colors[i % colors.length]) + text(left + 22 + i * 175, 410, s.name, 'start', fg, 17) })
  }
  if (chart.unit) shapes += text(1095, 428, chart.unit, 'end', muted, 16)
  // Accessible data remains available even when SVG cannot be viewed.
  const table = '<table class="chart-data"><caption>' + esc(chart.caption || 'Chart data') + '</caption><thead><tr><th></th>' + chart.series.map(s => `<th>${esc(s.name)}</th>`).join('') + '</tr></thead><tbody>'
    + chart.categories.map((c, i) => `<tr><th>${esc(c)}</th>${chart.series.map(s => `<td>${s.values[i]}</td>`).join('')}</tr>`).join('') + '</tbody></table>'
  return `<svg class="native-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(chart.caption || chart.kind + ' chart')}"><title>${esc(chart.caption || chart.kind)}</title>${shapes}</svg>${table}`
}

export function renderMediaHtml(slide, manifest, theme) {
  const boxes = mediaBoxes(slide.layout)
  let body = `<h2 class="media-title" style="${position(boxes.title)}">${esc(slide.title)}</h2>`
  if (slide.layout === 'chart') {
    body += `<div class="media-chart" style="${position(boxes.chart)}">${renderChartSvg(slide.chart, theme)}</div>`
    if (slide.chart.caption) body += `<div class="media-caption" style="${position(boxes.caption)}">${esc(slide.chart.caption)}</div>`
  } else {
    const image = slide.image, asset = manifest.assets?.[image?.assetId]
    body += `<figure class="media-image" style="${position(boxes.image)}"><img src="${esc(asset?.data ?? '')}" alt="${esc(image?.alt)}" style="object-fit:${image?.fit || 'contain'}"/></figure>`
    if (boxes.body) body += `<div class="media-body" style="${position(boxes.body)}">${slide.subtitle ? `<p>${esc(slide.subtitle)}</p>` : ''}${slide.bullets?.length ? `<ul>${slide.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}</div>`
    if (image?.caption) body += `<div class="media-caption" style="${position(boxes.caption)}">${esc(image.caption)}</div>`
  }
  return `<div class="media-canvas">${body}</div>`
}

export const MEDIA_CSS = `
.slide--image,.slide--image-left,.slide--image-right,.slide--chart{padding:0;align-items:center}
.slide--image .slide-inner,.slide--image-left .slide-inner,.slide--image-right .slide-inner,.slide--chart .slide-inner{width:100%;display:flex;justify-content:center}
.media-canvas{position:relative;width:min(100vw,177.7778vh);height:min(100vh,56.25vw);container-type:inline-size}
.media-title,.media-image,.media-body,.media-chart,.media-caption{position:absolute;margin:0;max-width:none;box-sizing:border-box}
.media-title{font-size:3.54cqw;line-height:1.17;overflow-wrap:anywhere}
.media-image img{width:100%;height:100%;display:block}
.media-body{font-size:2.083cqw;line-height:1.45;overflow-wrap:anywhere}
.media-body p{margin:0 0 1.2em}.media-body ul{margin:0;padding-left:1.1em}.media-body li{margin-bottom:.6em}
.media-caption{color:var(--muted);font-size:1.4cqw;line-height:1.2}
.native-chart{width:100%;height:100%;font-family:var(--font-body)}
.chart-data{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.brand-logo{position:absolute;right:6.2%;top:1.6%;width:7.1%;height:5.6%;object-fit:contain;pointer-events:none}
.brand-footer{position:absolute;left:6.4%;bottom:3.4%;max-width:69%;font-size:clamp(10px,1vw,15px);color:var(--muted)}
body.printing .brand-footer{display:block}
`

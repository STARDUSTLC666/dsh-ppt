// Deliberately small formatting vocabulary. Model output never contains text edits.
import { randomUUID } from 'node:crypto'

export function normalizeVisual(value) {
  if (value == null) return undefined
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('visual 需为字号设置对象 / Invalid visual settings')
  const ranges = { titleSize: [24, 60], bodySize: [16, 28], chartLabelSize: [14, 24] }, out = {}
  for (const [key, number] of Object.entries(value)) {
    const range = ranges[key]
    if (!range || !Number.isInteger(number) || number < range[0] || number > range[1]) throw new Error('visual 字号超出允许范围 / Invalid visual font size')
    out[key] = number
  }
  return Object.keys(out).length ? out : undefined
}

export function visualHtmlStyle(value) {
  const v = normalizeVisual(value)
  if (!v) return ''
  return Object.entries(v).map(([key, n]) => '--ppt-' + key + ':' + n).join(';')
}

export const VISUAL_CSS = `
.slide[style*="--ppt-titleSize"] h1,.slide[style*="--ppt-titleSize"] h2,.slide[style*="--ppt-titleSize"] .statement-title,.slide[style*="--ppt-titleSize"] .quote-text{font-size:clamp(24px,calc(var(--ppt-titleSize) * .12vw),calc(var(--ppt-titleSize) * 2px))}
.slide[style*="--ppt-titleSize"] .media-title{font-size:calc(var(--ppt-titleSize) * .104167cqw)}
.slide[style*="--ppt-bodySize"] li,.slide[style*="--ppt-bodySize"] .subtitle,.slide[style*="--ppt-bodySize"] .quote-attr{font-size:clamp(16px,calc(var(--ppt-bodySize) * .13vw),calc(var(--ppt-bodySize) * 2px))}
.slide[style*="--ppt-bodySize"] .media-body,.slide[style*="--ppt-bodySize"] .media-body li{font-size:calc(var(--ppt-bodySize) * .104167cqw)}
.slide[style*="--ppt-bodySize"] .deck-table{font-size:clamp(12px,calc(var(--ppt-bodySize) * .09vw),calc(var(--ppt-bodySize) * 1.35px))}
.slide[style*="--ppt-chartLabelSize"] .native-chart text{font-size:calc(var(--ppt-chartLabelSize) * 1px)}
`

/** Apply formatting to the generator's known OOXML shapes, never arbitrary XML. */
export function visualShapeXml(xml, visual) {
  const v = normalizeVisual(visual)
  if (!v) return xml
  return xml.replace(/<p:(sp|graphicFrame)>[\s\S]*?<\/p:\1>/g, shape => {
    const name = shape.match(/<p:cNvPr\b[^>]*\bname="([^"]*)"/)?.[1]
    const pt = ['Title', 'Statement', 'Quote'].includes(name) ? v.titleSize : ['Body', 'Subtitle', 'Attribution', 'Table'].includes(name) ? v.bodySize : undefined
    return pt ? shape.replace(/(<a:(?:rPr|defRPr|endParaRPr)\b[^>]*\bsz=")[0-9]+"/g, '$1' + (pt * 100) + '"') : shape
  })
}

/** Facts, metrics, assets, titles and slide order are preserved by construction. */
export function applyVisualActions(manifest, actions) {
  if (!Array.isArray(actions) || !actions.length || actions.length > 48) throw new Error('请选择有效的排版修改 / Invalid formatting actions')
  const next = structuredClone(manifest), seen = new Set()
  for (const a of actions) {
    if (!a || typeof a !== 'object' || Object.keys(a).some(k => !['slideId', 'type', 'value'].includes(k))) throw new Error('排版操作包含无效字段 / Invalid formatting action fields')
    const index = next.slides.findIndex(s => s.id === a.slideId), original = manifest.slides.find(s => s.id === a.slideId)
    if (index < 0 || !original) throw new Error('排版操作关联的页面不存在 / Unknown slide')
    const key = a.slideId + ':' + (a.type?.startsWith('split-') ? 'split' : a.type)
    if (seen.has(key)) throw new Error('同一页的排版操作重复 / Duplicate formatting action')
    seen.add(key)
    const slide = next.slides[index]
    const field = { 'title-size': 'titleSize', 'body-size': 'bodySize', 'chart-label-size': 'chartLabelSize' }[a.type]
    if (field) {
      if (field === 'chartLabelSize' && !slide.chart) throw new Error('本页没有图表 / Slide has no chart')
      slide.visual = normalizeVisual({ ...slide.visual, [field]: a.value })
    } else if (a.type === 'chart-horizontal') {
      if (a.value !== undefined || slide.chart?.kind !== 'column') throw new Error('只支持将柱状图改为横向条形图 / Only column-to-bar conversion is supported')
      slide.chart.kind = 'bar'
      if (slide.dataTemplate?.chart) slide.dataTemplate.chart.kind = 'bar'
    } else if (a.type === 'image-contain') {
      if (a.value !== undefined || !slide.image) throw new Error('本页没有图片 / Slide has no image')
      slide.image.fit = 'contain'
    } else if (a.type === 'split-bullets' || a.type === 'split-table') {
      const bullets = a.type === 'split-bullets', field = bullets ? 'bullets' : 'rows'
      if (bullets ? !['bullets','image-left','image-right'].includes(slide.layout) : slide.layout !== 'table') throw new Error('此版式不支持所选拆页操作 / Split is not supported for this layout')
      const data = slide[field], count = bullets ? data?.length : data?.length - 1
      if (!Number.isInteger(a.value) || a.value < 1 || a.value >= count) throw new Error('拆页位置无效 / Invalid split position')
      if (next.slides.length >= 120) throw new Error('拆页后超过 120 页 / Split would exceed 120 slides')
      const added = structuredClone(slide); added.id = randomUUID()
      const split = values => bullets ? [values.slice(0, a.value), values.slice(a.value)] : [values.slice(0, a.value + 1), [values[0], ...values.slice(a.value + 1)]]
      ;[slide[field], added[field]] = split(data)
      if (slide.dataTemplate?.[field]) [slide.dataTemplate[field], added.dataTemplate[field]] = split(slide.dataTemplate[field])
      next.slides.splice(index + 1, 0, added)
    } else throw new Error('不支持此排版操作 / Unsupported formatting action')
  }
  return next.slides
}

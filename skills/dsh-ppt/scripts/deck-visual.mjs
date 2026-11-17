// Deliberately small, content-preserving formatting & layout vocabulary.
// Model output never rewrites text, metrics, or file paths.
import { randomUUID } from 'node:crypto'

const NUMERIC_RANGES = {
  titleSize: [24, 60],
  bodySize: [14, 28],
  chartLabelSize: [12, 24],
}

const STRING_ENUMS = {
  density: ['compact', 'balanced', 'airy'],
  tableStyle: ['consulting', 'booktabs', 'minimal', 'banded', 'harvey'],
}

export function normalizeVisual(value) {
  if (value == null) return undefined
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('visual 需为排版设置对象 / Invalid visual settings')
  const out = {}
  for (const [key, val] of Object.entries(value)) {
    if (val === undefined) continue
    if (Object.hasOwn(NUMERIC_RANGES, key)) {
      const range = NUMERIC_RANGES[key]
      if (!Number.isInteger(val) || val < range[0] || val > range[1]) {
        throw new Error('visual 字号超出允许范围 / Invalid visual font size')
      }
      out[key] = val
    } else if (Object.hasOwn(STRING_ENUMS, key)) {
      if (typeof val !== 'string' || !STRING_ENUMS[key].includes(val)) {
        throw new Error('visual 枚举值无效 / Invalid visual option')
      }
      out[key] = val
    } else {
      throw new Error('visual 包含不支持的字段 / Unsupported visual property')
    }
  }
  return Object.keys(out).length ? out : undefined
}

export function visualHtmlStyle(value) {
  const v = normalizeVisual(value)
  if (!v) return ''
  return Object.entries(v)
    .filter(([key]) => Object.hasOwn(NUMERIC_RANGES, key))
    .map(([key, n]) => '--ppt-' + key + ':' + n)
    .join(';')
}

export const VISUAL_CSS = `
.slide[style*="--ppt-titleSize"] h1,.slide[style*="--ppt-titleSize"] h2,.slide[style*="--ppt-titleSize"] .statement-title,.slide[style*="--ppt-titleSize"] .quote-text{font-size:clamp(22px,calc(var(--ppt-titleSize) * .115vw),calc(var(--ppt-titleSize) * 1.85px))}
.slide[style*="--ppt-titleSize"] .media-title{font-size:calc(var(--ppt-titleSize) * .104167cqw)}
.slide[style*="--ppt-bodySize"] li,.slide[style*="--ppt-bodySize"] .subtitle,.slide[style*="--ppt-bodySize"] .quote-attr,.slide[style*="--ppt-bodySize"] .card-body{font-size:clamp(14px,calc(var(--ppt-bodySize) * .115vw),calc(var(--ppt-bodySize) * 1.65px))}
.slide[style*="--ppt-bodySize"] .media-body,.slide[style*="--ppt-bodySize"] .media-body li{font-size:calc(var(--ppt-bodySize) * .104167cqw)}
.slide[style*="--ppt-bodySize"] .deck-table{font-size:clamp(12px,calc(var(--ppt-bodySize) * .088vw),calc(var(--ppt-bodySize) * 1.3px))}
.slide[style*="--ppt-chartLabelSize"] .native-chart text{font-size:calc(var(--ppt-chartLabelSize) * 1px)}
.slide[data-density="compact"] .layout-grid,.slide[data-density="compact"] .bullets ul{gap:12px}
.slide[data-density="airy"] .layout-grid,.slide[data-density="airy"] .bullets ul{gap:28px}
`

/** Apply formatting to the generator's known OOXML shapes, never arbitrary XML. */
export function visualShapeXml(xml, visual) {
  const v = normalizeVisual(visual)
  if (!v) return xml
  return xml.replace(/<p:(sp|graphicFrame)>[\s\S]*?<\/p:\1>/g, (shape) => {
    const name = shape.match(/<p:cNvPr\b[^>]*\bname="([^"]*)"/)?.[1] ?? ''
    const isTitle = ['Title', 'Statement', 'Quote'].includes(name)
    const isBody = ['Body', 'Subtitle', 'Attribution', 'Table'].includes(name) || /^(?:Card|Step|Comparison|Matrix|Callout|Gantt|Architecture|TAM|Org|Team|Flywheel)\s+\d+/i.test(name)
    const pt = isTitle ? v.titleSize : isBody ? v.bodySize : undefined
    return pt ? shape.replace(/(<a:(?:rPr|defRPr|endParaRPr)\b[^>]*\bsz=")[0-9]+"/g, '$1' + (pt * 100) + '"') : shape
  })
}

const SWITCHABLE_LAYOUTS = ['bullets', 'cards', 'comparison', 'process', 'kpi']

function canSwitchSlideLayout(slide, target) {
  if (!SWITCHABLE_LAYOUTS.includes(target) || slide.layout === target) return false
  if (slide.image || slide.images?.length || slide.chart || slide.rows?.length) return false
  if (!SWITCHABLE_LAYOUTS.includes(slide.layout)) return false
  const entries = Array.isArray(slide.items) && slide.items.length
    ? slide.items.map((it) => [it.value, it.title, it.text, ...(it.bullets ?? [])].filter(Boolean).join(' '))
    : Array.isArray(slide.bullets)
      ? slide.bullets
      : []
  const n = entries.length
  if (target === 'bullets') return n >= 1
  if (target === 'cards') return n >= 2 && n <= 6
  if (target === 'process') return n >= 3 && n <= 6
  if (target === 'comparison') return n === 2 || n === 4
  if (target === 'kpi') return n >= 2 && n <= 4 && entries.every((entry) => /\d/.test(String(entry)))
  return false
}

/** Facts, metrics, assets, titles and slide order are preserved by construction. */
export function applyVisualActions(manifest, actions) {
  if (!Array.isArray(actions) || !actions.length || actions.length > 64) {
    throw new Error('请选择有效的排版修改 / Invalid formatting actions')
  }
  const next = structuredClone(manifest)
  const seen = new Set()
  for (const a of actions) {
    if (!a || typeof a !== 'object' || Object.keys(a).some((k) => !['slideId', 'type', 'value'].includes(k))) {
      throw new Error('排版操作包含无效字段 / Invalid formatting action fields')
    }
    const index = next.slides.findIndex((s) => s.id === a.slideId)
    const original = manifest.slides.find((s) => s.id === a.slideId)
    if (index < 0 || !original) throw new Error('排版操作关联的页面不存在 / Unknown slide')
    const key = a.slideId + ':' + (a.type?.startsWith('split-') ? 'split' : a.type)
    if (seen.has(key)) throw new Error('同一页的排版操作重复 / Duplicate formatting action')
    seen.add(key)

    const slide = next.slides[index]
    const sizeField = { 'title-size': 'titleSize', 'body-size': 'bodySize', 'chart-label-size': 'chartLabelSize' }[a.type]
    if (sizeField) {
      if (sizeField === 'chartLabelSize' && !slide.chart) throw new Error('本页没有图表 / Slide has no chart')
      slide.visual = normalizeVisual({ ...slide.visual, [sizeField]: a.value })
    } else if (a.type === 'chart-horizontal') {
      if (a.value !== undefined || slide.chart?.kind !== 'column') {
        throw new Error('只支持将柱状图改为横向条形图 / Only column-to-bar conversion is supported')
      }
      slide.chart.kind = 'bar'
      if (slide.dataTemplate?.chart) slide.dataTemplate.chart.kind = 'bar'
    } else if (a.type === 'image-contain') {
      if (a.value !== undefined || !slide.image) throw new Error('本页没有图片 / Slide has no image')
      slide.image.fit = 'contain'
    } else if (a.type === 'density-mode') {
      if (!['compact', 'balanced', 'airy'].includes(a.value)) throw new Error('密度模式无效 / Invalid density mode')
      slide.visual = normalizeVisual({ ...slide.visual, density: a.value })
    } else if (a.type === 'swap-image-side') {
      if (a.value !== undefined || !['image-left', 'image-right'].includes(slide.layout)) {
        throw new Error('仅左图右文或右图左文支持互换位置 / Only image-left/image-right can swap side')
      }
      slide.layout = slide.layout === 'image-left' ? 'image-right' : 'image-left'
    } else if (a.type === 'switch-layout') {
      if (typeof a.value !== 'string' || !canSwitchSlideLayout(slide, a.value)) {
        throw new Error('当前页面条目不满足目标版式切换条件 / Slide cannot switch to target layout')
      }
      slide.layout = a.value
    } else if (a.type === 'chart-highlight') {
      if (!slide.chart || !['max', 'last', 'none'].includes(a.value)) {
        throw new Error('图表高亮模式无效 / Invalid chart highlight mode')
      }
      if (a.value === 'none') {
        delete slide.chart.highlight
        if (slide.dataTemplate?.chart) delete slide.dataTemplate.chart.highlight
      } else {
        slide.chart.highlight = a.value
        if (slide.dataTemplate?.chart) slide.dataTemplate.chart.highlight = a.value
      }
    } else if (a.type === 'table-style') {
      if (!['table', 'harvey'].includes(slide.layout) || !['consulting', 'booktabs', 'minimal', 'banded', 'harvey'].includes(a.value)) {
        throw new Error('表格样式仅适用于 table 版式 / Table style requires a table slide')
      }
      slide.tableStyle = a.value
    } else if (a.type === 'split-bullets' || a.type === 'split-table') {
      const bullets = a.type === 'split-bullets'
      const field = bullets ? 'bullets' : 'rows'
      if (bullets ? !['bullets', 'image-left', 'image-right'].includes(slide.layout) : slide.layout !== 'table') {
        throw new Error('此版式不支持所选拆页操作 / Split is not supported for this layout')
      }
      const data = slide[field]
      const count = bullets ? data?.length : data?.length - 1
      if (!Number.isInteger(a.value) || a.value < 1 || a.value >= count) {
        throw new Error('拆页位置无效 / Invalid split position')
      }
      if (next.slides.length >= 120) throw new Error('拆页后超过 120 页 / Split would exceed 120 slides')
      const added = structuredClone(slide)
      added.id = randomUUID()
      const split = (values) => bullets
        ? [values.slice(0, a.value), values.slice(a.value)]
        : [values.slice(0, a.value + 1), [values[0], ...values.slice(a.value + 1)]]
      ;[slide[field], added[field]] = split(data)
      if (slide.dataTemplate?.[field]) {
        ;[slide.dataTemplate[field], added.dataTemplate[field]] = split(slide.dataTemplate[field])
      }
      next.slides.splice(index + 1, 0, added)
    } else {
      throw new Error('不支持此排版操作 / Unsupported formatting action')
    }
  }
  return next.slides
}

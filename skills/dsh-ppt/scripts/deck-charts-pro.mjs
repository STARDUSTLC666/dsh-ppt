/**
 * deck-charts-pro.mjs —— dsh-ppt 四大顶级商业分析与咨询矢量图表引擎（零外部依赖）。
 *
 * 100% 原生可编辑 PowerPoint DrawingML（<p:sp> / <p:cxnSp> / <a:custGeom>）+ HTML SVG 双端同构：
 *   1. quadrant（魔力象限 / 波士顿 BCG 气泡矩阵）：十字象限线、象限角标、面积比例气泡与防出界标签
 *   2. radar（多维能力雷达图）：4 层同心正多边形蛛网、辐条轴标、半透明多系列叠加多边形与顶点锚点
 *   3. dumbbell（麦肯锡哑铃对比图 / Before→After）：统一数轴、方向连接桥、外侧防撞直标值与右侧增减徽章
 *   4. heatmap（热力图矩阵）：顺序/发散色阶自动插值、WCAG 相对亮度自动反白字色与连续色带图例
 */

import { relativeLuminance, mixHex } from './deck-themes.mjs'
import {
  roundRectAdj,
  escapeXml,
  escapeHtml,
  stripInlineMarkdown,
  ooxmlRichParagraph,
  ooxmlShape,
  ooxmlCustGeomShape,
  ooxmlLine,
  computeBadgePillWidth,
} from './deck-chrome.mjs'

export const PRO_CHART_LAYOUTS = new Set(['quadrant', 'radar', 'dumbbell', 'heatmap'])

function parseNum(raw, fallback = NaN) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const cleaned = String(raw ?? '').replace(/[,，%％$¥€£\s]/g, '').replace(/[+＋]/g, '')
  const m = /-?\d+(?:\.\d+)?/.exec(cleaned)
  return m ? Number(m[0]) : fallback
}

function fmtNum(v, unit = '') {
  if (!Number.isFinite(v)) return '—'
  const rounded = Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1)
  return unit ? `${rounded}${unit}` : rounded
}

// ---------------------------------------------------------------------------
// 1. 数据模型解析（Quadrant / Radar / Dumbbell / Heatmap）
// ---------------------------------------------------------------------------

export function computeQuadrantModel(slide, langEn = false) {
  let points = []
  if (Array.isArray(slide.items) && slide.items.length > 0) {
    points = slide.items
      .map((it, idx) => {
        const x = parseNum(it.x ?? it.start, NaN)
        const y = parseNum(it.y ?? it.value, NaN)
        const size = parseNum(it.size ?? it.span, 36)
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null
        return {
          title: stripInlineMarkdown(it.title || it.tag || `Item ${idx + 1}`),
          tag: stripInlineMarkdown(it.tag || ''),
          x,
          y,
          size: Number.isFinite(size) ? Math.max(8, size) : 36,
          status: it.status || (idx === 0 ? 'accent' : 'neutral'),
        }
      })
      .filter(Boolean)
  } else if (Array.isArray(slide.rows) && slide.rows.length >= 2) {
    points = slide.rows.slice(1).map((r, idx) => {
      const x = parseNum(r[1], NaN)
      const y = parseNum(r[2], NaN)
      const size = parseNum(r[3], 36)
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null
      return {
        title: stripInlineMarkdown(r[0] || `Item ${idx + 1}`),
        tag: '',
        x,
        y,
        size: Number.isFinite(size) ? Math.max(8, size) : 36,
        status: idx === 0 ? 'accent' : 'neutral',
      }
    }).filter(Boolean)
  }

  if (points.length === 0) {
    points = [
      { title: langEn ? 'Our Platform' : '本平台', x: 82, y: 84, size: 78, status: 'accent' },
      { title: langEn ? 'Vendor A' : '竞品 A', x: 66, y: 68, size: 58, status: 'neutral' },
      { title: langEn ? 'Vendor B' : '竞品 B', x: 34, y: 74, size: 46, status: 'neutral' },
      { title: langEn ? 'Vendor C' : '竞品 C', x: 72, y: 36, size: 40, status: 'neutral' },
      { title: langEn ? 'Legacy Tool' : '传统方案', x: 26, y: 28, size: 52, status: 'negative' },
    ]
  }

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const sizes = points.map((p) => p.size)
  const xMin = Math.min(0, ...xs)
  const xMax = Math.max(100, ...xs)
  const yMin = Math.min(0, ...ys)
  const yMax = Math.max(100, ...ys)
  const sMin = Math.min(...sizes)
  const sMax = Math.max(...sizes)

  const normPoints = points.slice(0, 12).map((p) => ({
    ...p,
    nx: Math.max(0.06, Math.min(0.94, (p.x - xMin) / Math.max(1e-6, xMax - xMin))),
    ny: Math.max(0.08, Math.min(0.92, (p.y - yMin) / Math.max(1e-6, yMax - yMin))),
    ns: sMax === sMin ? 0.55 : (p.size - sMin) / Math.max(1e-6, sMax - sMin),
  }))

  const defaultQuads = langEn
    ? ['Challengers', 'Leaders', 'Niche Players', 'Visionaries']
    : ['挑战者', '领导者', '特定领域', '远见者']
  const quadrants = Array.isArray(slide.quadrants) && slide.quadrants.length === 4
    ? slide.quadrants.map((q) => stripInlineMarkdown(q))
    : defaultQuads

  return {
    points: normPoints,
    quadrants,
    xLabel: stripInlineMarkdown(slide.xLabel || (langEn ? 'Completeness of Vision →' : '战略前瞻性与产品完整度 →')),
    yLabel: stripInlineMarkdown(slide.yLabel || (langEn ? 'Ability to Execute ↑' : '工程交付与规模化执行力 ↑')),
  }
}

export function computeRadarModel(slide, langEn = false) {
  let axes = []
  let series = []

  if (Array.isArray(slide.rows) && slide.rows.length >= 4 && Array.isArray(slide.rows[0]) && slide.rows[0].length >= 2) {
    const head = slide.rows[0]
    const sNames = head.slice(1, 4).map((h, i) => stripInlineMarkdown(h || `Series ${i + 1}`))
    axes = slide.rows.slice(1, 9).map((r, i) => stripInlineMarkdown(r[0] || `Axis ${i + 1}`))
    series = sNames.map((name, si) => ({
      name,
      values: slide.rows.slice(1, 9).map((r) => Math.max(0, parseNum(r[si + 1], 0))),
    }))
  } else if (slide.chart && Array.isArray(slide.chart.categories) && Array.isArray(slide.chart.series) && slide.chart.categories.length >= 3) {
    axes = slide.chart.categories.slice(0, 8).map((c) => stripInlineMarkdown(c))
    series = slide.chart.series.slice(0, 3).map((s, si) => ({
      name: stripInlineMarkdown(s.name || `Series ${si + 1}`),
      values: axes.map((_, ai) => Math.max(0, parseNum(s.values?.[ai], 0))),
    }))
  } else if (Array.isArray(slide.items) && slide.items.length >= 3) {
    axes = slide.items.slice(0, 8).map((it, i) => stripInlineMarkdown(it.title || it.tag || `Axis ${i + 1}`))
    const valsA = slide.items.slice(0, 8).map((it) => Math.max(0, parseNum(it.after ?? it.value, 75)))
    const hasSecond = slide.items.some((it) => Number.isFinite(parseNum(it.before, NaN)))
    series = [{ name: langEn ? 'Target' : '核心方案', values: valsA }]
    if (hasSecond) {
      series.push({
        name: langEn ? 'Baseline' : '行业基线',
        values: slide.items.slice(0, 8).map((it) => Math.max(0, parseNum(it.before, 50))),
      })
    }
  } else {
    axes = langEn
      ? ['Throughput', 'Latency', 'Reliability', 'Security', 'Cost Efficiency', 'Ecosystem']
      : ['推理吞吐', '响应延迟', '高可用性', '安全合规', '成本效率', '生态兼容']
    series = [
      { name: langEn ? 'Our Platform' : '本平台', values: [94, 91, 96, 92, 88, 86] },
      { name: langEn ? 'Industry Avg' : '行业均值', values: [70, 68, 76, 72, 64, 74] },
    ]
  }

  const allVals = series.flatMap((s) => s.values)
  const rawMax = Math.max(10, ...allVals)
  const maxVal = rawMax <= 5 ? 5 : rawMax <= 10 ? 10 : rawMax <= 100 ? 100 : Math.ceil(rawMax / 10) * 10
  return { axes, series, maxVal }
}

export function computeDumbbellModel(slide, langEn = false) {
  let rows = []
  let beforeLabel = langEn ? 'Before' : '优化前'
  let afterLabel = langEn ? 'After' : '优化后'

  if (Array.isArray(slide.items) && slide.items.length > 0) {
    rows = slide.items.slice(0, 7).map((it, idx) => {
      const b = parseNum(it.before ?? it.start, NaN)
      const a = parseNum(it.after ?? it.value, NaN)
      if (!Number.isFinite(b) || !Number.isFinite(a)) return null
      const diff = a - b
      const unit = stripInlineMarkdown(it.unit || '')
      const autoDelta = `${diff >= 0 ? '+' : ''}${fmtNum(diff, unit)}`
      return {
        title: stripInlineMarkdown(it.title || it.tag || `Metric ${idx + 1}`),
        before: b,
        after: a,
        unit,
        delta: stripInlineMarkdown(it.delta || autoDelta),
        status: it.status || (diff >= 0 ? 'positive' : 'negative'),
      }
    }).filter(Boolean)
  } else if (Array.isArray(slide.rows) && slide.rows.length >= 2) {
    if (slide.rows[0]?.[1]) beforeLabel = stripInlineMarkdown(slide.rows[0][1])
    if (slide.rows[0]?.[2]) afterLabel = stripInlineMarkdown(slide.rows[0][2])
    rows = slide.rows.slice(1, 8).map((r, idx) => {
      const b = parseNum(r[1], NaN)
      const a = parseNum(r[2], NaN)
      if (!Number.isFinite(b) || !Number.isFinite(a)) return null
      const unitMatch = /(%|pp|ms|s|x|×|亿|万)/.exec(String(r[2] ?? r[1] ?? ''))
      const unit = unitMatch ? unitMatch[1] : ''
      const diff = a - b
      const delta = r[3] ? stripInlineMarkdown(r[3]) : `${diff >= 0 ? '+' : ''}${fmtNum(diff, unit)}`
      return {
        title: stripInlineMarkdown(r[0] || `Metric ${idx + 1}`),
        before: b,
        after: a,
        unit,
        delta,
        status: diff >= 0 ? 'positive' : 'negative',
      }
    }).filter(Boolean)
  }

  if (rows.length === 0) {
    rows = [
      { title: langEn ? 'Automation Rate' : '核心流程自动化率', before: 38, after: 84, unit: '%', delta: '+46pp', status: 'positive' },
      { title: langEn ? 'First-Pass Yield' : '一次交付达标率', before: 64, after: 93, unit: '%', delta: '+29pp', status: 'positive' },
      { title: langEn ? 'Unit Cost Index' : '单笔处理成本指数', before: 92, after: 54, unit: '', delta: '-41%', status: 'accent' },
      { title: langEn ? 'User Adoption' : '活跃部门渗透率', before: 45, after: 89, unit: '%', delta: '+44pp', status: 'positive' },
    ]
  }

  const allVals = rows.flatMap((r) => [r.before, r.after])
  const lo = Math.min(...allVals)
  const hi = Math.max(...allVals)
  const rawSpan = Math.max(1, hi - lo)
  const paddedLo = lo >= 0 ? Math.max(0, lo - rawSpan * 0.12) : lo - rawSpan * 0.12
  const paddedHi = hi + rawSpan * 0.10
  const roughStep = Math.max(1e-6, (paddedHi - paddedLo) / 4)
  const mag = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const norm = roughStep / mag
  const niceMult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  const step = niceMult * mag
  let minVal = Math.floor(paddedLo / step) * step
  if (lo >= 0 && minVal < 0) minVal = 0
  let maxVal = Math.ceil(paddedHi / step) * step
  if (hi <= 100 && lo >= 0 && hi > 50 && maxVal > 100 && maxVal <= 160) {
    minVal = 0
    maxVal = 100
  }
  const tickStep = (maxVal - minVal) / 4
  const ticks = []
  const count = Math.round((maxVal - minVal) / (maxVal === 100 && minVal === 0 ? 25 : step))
  const finalStep = (maxVal === 100 && minVal === 0) ? 25 : (count >= 3 && count <= 6 ? step : tickStep)
  for (let v = minVal; v <= maxVal + finalStep * 0.01; v += finalStep) {
    ticks.push(Math.abs(v) < 1e-9 ? 0 : +v.toFixed(2))
  }
  return { rows, minVal, maxVal: Math.max(minVal + 5, maxVal), ticks, beforeLabel, afterLabel }
}

export function computeHeatmapModel(slide, langEn = false) {
  let rawRows = Array.isArray(slide.rows) && slide.rows.length >= 2 ? slide.rows : null
  if (!rawRows) {
    rawRows = langEn
      ? [
          ['Region \\ Quarter', 'Q1', 'Q2', 'Q3', 'Q4'],
          ['North America', 72, 81, 88, 95],
          ['Europe', 64, 70, 79, 86],
          ['APAC', 58, 74, 85, 93],
          ['LatAm', 41, 49, 57, 68],
        ]
      : [
          ['区域 \\ 季度', 'Q1', 'Q2', 'Q3', 'Q4'],
          ['华东大区', 78, 84, 91, 97],
          ['华南大区', 68, 75, 83, 90],
          ['华北大区', 62, 69, 77, 85],
          ['海外新兴', 44, 56, 71, 88],
        ]
  }

  const corner = stripInlineMarkdown(rawRows[0]?.[0] || '')
  const colHeaders = rawRows[0].slice(1, 9).map((c) => stripInlineMarkdown(c))
  const rowLabels = rawRows.slice(1, 8).map((r) => stripInlineMarkdown(r[0] || ''))
  const matrix = rawRows.slice(1, 8).map((r) =>
    colHeaders.map((_, ci) => {
      const rawText = stripInlineMarkdown(r[ci + 1] ?? '')
      const num = parseNum(rawText, NaN)
      return { raw: rawText || (Number.isFinite(num) ? fmtNum(num) : '—'), num }
    }),
  )

  const nums = matrix.flat().map((c) => c.num).filter(Number.isFinite)
  const minVal = nums.length ? Math.min(...nums) : 0
  const maxVal = nums.length ? Math.max(...nums) : 100
  const diverging = minVal < 0 && maxVal > 0
  return { corner, colHeaders, rowLabels, matrix, minVal, maxVal, diverging }
}

function heatCellColor(num, model, tk) {
  if (!Number.isFinite(num)) return tk.surface1
  if (model.diverging) {
    const absMax = Math.max(Math.abs(model.minVal), Math.abs(model.maxVal), 1e-6)
    const t = Math.max(-1, Math.min(1, num / absMax))
    return t >= 0
      ? mixHex(tk.surface1, tk.positive, 0.14 + t * 0.82)
      : mixHex(tk.surface1, tk.negative, 0.14 + Math.abs(t) * 0.82)
  }
  const t = model.maxVal === model.minVal ? 0.5 : (num - model.minVal) / (model.maxVal - model.minVal)
  return mixHex(tk.surface1, tk.accentPrimary, 0.08 + Math.max(0, Math.min(1, t)) * 0.86)
}

// ---------------------------------------------------------------------------
// 2. PPTX 原生 DrawingML 渲染器
// ---------------------------------------------------------------------------

export function renderProChartSlideBodyPptx(slide, ctx) {
  const layout = slide.layout
  if (!PRO_CHART_LAYOUTS.has(layout)) return null
  const { theme, langAttr, chromeCfg, nextId, bodyTopY, bodyH } = ctx
  const tk = theme.tokens
  const langEn = langAttr === 'en-US'
  const shapes = []

  // ---------------- 1. QUADRANT / MAGIC QUADRANT BUBBLE MATRIX ----------------
  if (layout === 'quadrant') {
    const model = computeQuadrantModel(slide, langEn)
    const plotX = 1.24
    const plotY = bodyTopY + 0.08
    const plotW = 11.35
    const plotH = Math.max(2.6, bodyH - 0.56)
    const midX = plotX + plotW / 2
    const midY = plotY + plotH / 2

    // 外框底板
    shapes.push(ooxmlShape(nextId(), 'Quadrant Frame', { x: plotX, y: plotY, w: plotW, h: plotH }, {
      preset: 'roundRect',
      adj: roundRectAdj(plotW, plotH, Math.min(8, chromeCfg.cardRadiusPx)),
      fill: tk.surface1,
      stroke: tk.hairline,
      strokePt: 0.9,
    }))
    // 右上领导者象限微弱主题光晕区
    shapes.push(ooxmlShape(nextId(), 'Quadrant Leader Zone', { x: midX, y: plotY, w: plotW / 2, h: plotH / 2 }, {
      preset: 'rect',
      fill: tk.accentSoft,
      fillAlpha: theme.dark ? 0.35 : 0.62,
    }))
    // 十字中位虚线
    shapes.push(ooxmlLine(nextId(), 'Quadrant Mid V', { x: midX, y: plotY }, { x: midX, y: plotY + plotH }, {
      color: tk.hairline,
      widthPt: 1.0,
      dash: 'dash',
    }))
    shapes.push(ooxmlLine(nextId(), 'Quadrant Mid H', { x: plotX, y: midY }, { x: plotX + plotW, y: midY }, {
      color: tk.hairline,
      widthPt: 1.0,
      dash: 'dash',
    }))

    // 四象限角标（TL, TR, BL, BR）
    const cornerPos = [
      { x: plotX + 0.14, y: plotY + 0.10, align: 'l', accent: false },
      { x: plotX + plotW - 2.34, y: plotY + 0.10, align: 'r', accent: true },
      { x: plotX + 0.14, y: plotY + plotH - 0.36, align: 'l', accent: false },
      { x: plotX + plotW - 2.34, y: plotY + plotH - 0.36, align: 'r', accent: false },
    ]
    model.quadrants.forEach((ql, qi) => {
      const cp = cornerPos[qi]
      shapes.push(ooxmlShape(nextId(), `Quadrant Corner ${qi + 1}`, { x: cp.x, y: cp.y, w: 2.2, h: 0.28 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(ql.toUpperCase(), {
            sizePt: 10.5,
            color: cp.accent ? tk.accentText : tk.inkMuted,
            bold: true,
            lang: langAttr,
            align: cp.align,
            font: theme.fonts.heading,
            spc: 100,
          }),
        ],
      }))
    })

    // 比例气泡 + 智能避让标签（内置安全边距，彻底避免贴边或遮挡象限角标）
    const padX = 0.72
    const padY = 0.68
    const innerW = Math.max(2.0, plotW - padX * 2)
    const innerH = Math.max(1.4, plotH - padY * 2)
    model.points.forEach((p, idx) => {
      const cx = plotX + padX + p.nx * innerW
      const cy = plotY + padY + (1 - p.ny) * innerH
      const r = 0.17 + p.ns * 0.21
      const isFocal = idx === 0 || p.status === 'accent'
      const fillCol = p.status === 'positive'
        ? tk.positive
        : p.status === 'negative'
          ? tk.negative
          : p.status === 'accent'
            ? tk.accentPrimary
            : (tk.chartSeries?.[idx % tk.chartSeries.length] || tk.accentSecondary)
      shapes.push(ooxmlShape(nextId(), `Quadrant Bubble ${idx + 1}`, { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, {
        preset: 'ellipse',
        fill: fillCol,
        fillAlpha: isFocal ? 0.90 : 0.76,
        stroke: tk.canvas,
        strokePt: isFocal ? 2.0 : 1.25,
      }))
      const lblW = Math.min(2.35, Math.max(1.15, computeBadgePillWidth(p.title, 11.5, 2.4, 1.0)))
      const placeBelow = cy - r - 0.30 < plotY + 0.38
      const lblY = placeBelow ? Math.min(plotY + plotH - 0.34, cy + r + 0.05) : cy - r - 0.29
      const lblX = Math.max(plotX + 0.10, Math.min(plotX + plotW - lblW - 0.10, cx - lblW / 2))
      shapes.push(ooxmlShape(nextId(), `Quadrant Label ${idx + 1}`, { x: lblX, y: lblY, w: lblW, h: 0.26 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(p.title, {
            sizePt: isFocal ? 12 : 11,
            color: idx === 0 ? tk.inkPrimary : (isFocal ? tk.accentText : tk.inkPrimary),
            bold: isFocal,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.heading,
          }),
        ],
      }))
    })

    // X / Y 坐标轴标题（Y 轴单行垂直排版 vert270，零换行折断）
    shapes.push(ooxmlShape(nextId(), 'Quadrant X Axis', { x: plotX, y: plotY + plotH + 0.08, w: plotW, h: 0.30 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(model.xLabel, { sizePt: 11.5, color: tk.inkSecondary, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body }),
      ],
    }))
    shapes.push(ooxmlShape(nextId(), 'Quadrant Y Axis', { x: 0.62, y: plotY, w: 0.44, h: plotH }, {
      txBox: true,
      vert: 'vert270',
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(model.yLabel, { sizePt: 11, color: tk.inkSecondary, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.body }),
      ],
    }))
    return shapes.join('')
  }

  // ---------------- 2. RADAR / SPIDER CHART ----------------
  if (layout === 'radar') {
    const model = computeRadarModel(slide, langEn)
    const n = model.axes.length
    const legendY = bodyTopY + 0.02
    const cx = 6.6667
    const cy = bodyTopY + 0.38 + (bodyH - 0.48) / 2
    const maxR = Math.min(2.02, (bodyH - 1.18) / 2)
    const seriesColors = [tk.accentPrimary, tk.accentSecondary, tk.positive]

    // 顶部图例胶囊
    const legW = 2.25
    const totalLegW = model.series.length * legW
    let lx = cx - totalLegW / 2
    model.series.forEach((s, si) => {
      const col = seriesColors[si % seriesColors.length]
      shapes.push(ooxmlShape(nextId(), `Radar Legend Swatch ${si + 1}`, { x: lx, y: legendY + 0.08, w: 0.16, h: 0.16 }, {
        preset: 'ellipse',
        fill: col,
      }))
      shapes.push(ooxmlShape(nextId(), `Radar Legend Label ${si + 1}`, { x: lx + 0.22, y: legendY, w: legW - 0.26, h: 0.30 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(s.name, { sizePt: 12, color: tk.inkPrimary, bold: si === 0, lang: langAttr, font: theme.fonts.body }),
        ],
      }))
      lx += legW
    })

    const polarPt = (idx, frac) => {
      const a = -Math.PI / 2 + (2 * Math.PI * idx) / n
      return { x: cx + Math.cos(a) * maxR * frac, y: cy + Math.sin(a) * maxR * frac, cos: Math.cos(a), sin: Math.sin(a) }
    }

    // 4 层同心正多边形蛛网（25% / 50% / 75% / 100%）
    const gridBox = { x: cx - maxR, y: cy - maxR, w: maxR * 2, h: maxR * 2 }
    const SCALE = 10000
    const relPt = (pt) => ({ x: ((pt.x - gridBox.x) / gridBox.w) * SCALE, y: ((pt.y - gridBox.y) / gridBox.h) * SCALE })
    ;[1.0, 0.75, 0.5, 0.25].forEach((frac, gi) => {
      const pts = Array.from({ length: n }, (_, i) => relPt(polarPt(i, frac)))
      const cmds = pts.map((p, i) => (i === 0 ? `<a:moveTo><a:pt x="${Math.round(p.x)}" y="${Math.round(p.y)}"/></a:moveTo>` : `<a:lnTo><a:pt x="${Math.round(p.x)}" y="${Math.round(p.y)}"/></a:lnTo>`)).join('') + '<a:close/>'
      shapes.push(ooxmlCustGeomShape(nextId(), `Radar Ring ${gi + 1}`, gridBox, cmds, {
        pathW: SCALE,
        pathH: SCALE,
        fill: gi === 0 ? tk.surface1 : '',
        fillAlpha: gi === 0 ? 0.52 : 1,
        stroke: tk.hairline,
        strokePt: gi === 0 ? 1.0 : 0.75,
      }))
    })

    // 辐条轴线与外圈维度标签
    for (let i = 0; i < n; i += 1) {
      const tip = polarPt(i, 1.0)
      shapes.push(ooxmlLine(nextId(), `Radar Spoke ${i + 1}`, { x: cx, y: cy }, { x: tip.x, y: tip.y }, {
        color: tk.hairline,
        widthPt: 0.65,
      }))
      const lp = polarPt(i, 1.18)
      const align = lp.cos > 0.22 ? 'l' : lp.cos < -0.22 ? 'r' : 'ctr'
      const lw = 2.05
      const lxPos = align === 'l' ? lp.x - 0.04 : align === 'r' ? lp.x - lw + 0.04 : lp.x - lw / 2
      shapes.push(ooxmlShape(nextId(), `Radar Axis ${i + 1}`, { x: lxPos, y: lp.y - 0.16, w: lw, h: 0.34 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(model.axes[i], { sizePt: 12.5, color: tk.inkPrimary, bold: true, lang: langAttr, align, font: theme.fonts.heading }),
        ],
      }))
    }

    // 顶轴轻刻度数字（50 / 75 / 100）
    ;[0.5, 0.75, 1.0].forEach((frac, ri) => {
      const rp = polarPt(0, frac)
      shapes.push(ooxmlShape(nextId(), `Radar Tick ${ri + 1}`, { x: rp.x + 0.06, y: rp.y - 0.11, w: 0.44, h: 0.20 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(fmtNum(model.maxVal * frac), { sizePt: 8.5, color: tk.inkMuted, lang: 'en-US', align: 'l', font: theme.fonts.body }),
        ],
      }))
    })

    // 数据多边形（半透明填充 + 粗描边 + 顶点圆点，逆序绘制使主系列位于最顶层）
    ;[...model.series].map((s, si) => ({ s, si })).reverse().forEach(({ s, si }) => {
      const col = seriesColors[si % seriesColors.length]
      const pts = s.values.map((v, i) => polarPt(i, Math.max(0.05, Math.min(1, v / model.maxVal))))
      const rpts = pts.map(relPt)
      const cmds = rpts.map((p, i) => (i === 0 ? `<a:moveTo><a:pt x="${Math.round(p.x)}" y="${Math.round(p.y)}"/></a:moveTo>` : `<a:lnTo><a:pt x="${Math.round(p.x)}" y="${Math.round(p.y)}"/></a:lnTo>`)).join('') + '<a:close/>'
      shapes.push(ooxmlCustGeomShape(nextId(), `Radar Series ${si + 1}`, gridBox, cmds, {
        pathW: SCALE,
        pathH: SCALE,
        fill: col,
        fillAlpha: si === 0 ? 0.24 : 0.13,
        stroke: col,
        strokePt: si === 0 ? 2.4 : 1.5,
      }))
      pts.forEach((pt, pi) => {
        shapes.push(ooxmlShape(nextId(), `Radar Dot ${si + 1}-${pi + 1}`, { x: pt.x - 0.065, y: pt.y - 0.065, w: 0.13, h: 0.13 }, {
          preset: 'ellipse',
          fill: col,
          stroke: tk.canvas,
          strokePt: 1.15,
        }))
      })
    })
    return shapes.join('')
  }

  // ---------------- 3. DUMBBELL / SLOPE COMPARISON CHART ----------------
  if (layout === 'dumbbell') {
    const model = computeDumbbellModel(slide, langEn)
    const labelW = 2.75
    const deltaW = 1.36
    const trackX = 0.62 + labelW + 0.24
    const trackW = 12.09 - labelW - deltaW - 0.82
    const legendY = bodyTopY + 0.02
    const areaTop = bodyTopY + 0.42
    const areaH = Math.max(2.2, bodyH - 0.84)
    const rowCount = model.rows.length
    const rowH = areaH / rowCount

    // 顶部图例（优化前 vs 优化后）
    shapes.push(ooxmlShape(nextId(), 'Dumbbell Leg Dot B', { x: trackX, y: legendY + 0.06, w: 0.16, h: 0.16 }, {
      preset: 'ellipse',
      fill: tk.canvas,
      stroke: tk.inkMuted,
      strokePt: 1.6,
    }))
    shapes.push(ooxmlShape(nextId(), 'Dumbbell Leg Txt B', { x: trackX + 0.22, y: legendY, w: 1.45, h: 0.28 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(model.beforeLabel, { sizePt: 11.5, color: tk.inkMuted, bold: true, lang: langAttr, font: theme.fonts.body })],
    }))
    shapes.push(ooxmlShape(nextId(), 'Dumbbell Leg Dot A', { x: trackX + 1.80, y: legendY + 0.06, w: 0.16, h: 0.16 }, {
      preset: 'ellipse',
      fill: tk.accentPrimary,
    }))
    shapes.push(ooxmlShape(nextId(), 'Dumbbell Leg Txt A', { x: trackX + 2.02, y: legendY, w: 1.65, h: 0.28 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(model.afterLabel, { sizePt: 11.5, color: tk.accentText, bold: true, lang: langAttr, font: theme.fonts.body })],
    }))

    // 垂直基准网格线与底轴刻度（1-2-5 规整刻度）
    const tickVals = Array.isArray(model.ticks) && model.ticks.length >= 2
      ? model.ticks
      : [0, 0.25, 0.5, 0.75, 1].map((f) => model.minVal + f * (model.maxVal - model.minVal))
    tickVals.forEach((tVal, ti) => {
      const frac = (tVal - model.minVal) / Math.max(1e-6, model.maxVal - model.minVal)
      const gx = trackX + frac * trackW
      shapes.push(ooxmlLine(nextId(), `Dumbbell Grid ${ti}`, { x: gx, y: areaTop }, { x: gx, y: areaTop + areaH }, {
        color: tk.hairline,
        widthPt: 0.6,
        dash: ti === 0 ? 'solid' : 'dash',
      }))
      shapes.push(ooxmlShape(nextId(), `Dumbbell Tick ${ti}`, { x: gx - 0.45, y: areaTop + areaH + 0.06, w: 0.90, h: 0.26 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [ooxmlRichParagraph(fmtNum(tVal), { sizePt: 10.5, color: tk.inkMuted, lang: 'en-US', align: 'ctr', font: theme.fonts.body })],
      }))
    })

    const mapX = (v) => trackX + ((v - model.minVal) / Math.max(1e-6, model.maxVal - model.minVal)) * trackW

    model.rows.forEach((r, idx) => {
      const cy = areaTop + (idx + 0.5) * rowH
      const bx = mapX(r.before)
      const ax = mapX(r.after)
      const barCol = r.status === 'negative' ? tk.negative : (r.status === 'positive' ? tk.positive : tk.accentPrimary)

      // 左侧行标签
      shapes.push(ooxmlShape(nextId(), `Dumbbell Label ${idx + 1}`, { x: 0.62, y: cy - 0.24, w: labelW, h: 0.48 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [ooxmlRichParagraph(r.title, { sizePt: 13.5, color: tk.inkPrimary, bold: true, lang: langAttr, align: 'r', font: theme.fonts.heading })],
      }))
      // 淡色底轨道 + 方向连接桥
      shapes.push(ooxmlLine(nextId(), `Dumbbell Track ${idx + 1}`, { x: trackX, y: cy }, { x: trackX + trackW, y: cy }, {
        color: tk.hairline,
        widthPt: 0.75,
      }))
      shapes.push(ooxmlShape(nextId(), `Dumbbell Bridge ${idx + 1}`, { x: Math.min(bx, ax), y: cy - 0.045, w: Math.max(0.06, Math.abs(ax - bx)), h: 0.09 }, {
        preset: 'roundRect',
        adj: 50000,
        fill: barCol,
        fillAlpha: 0.85,
      }))
      // Before 空心点 + After 实心焦点
      const dotR = 0.115
      shapes.push(ooxmlShape(nextId(), `Dumbbell Before ${idx + 1}`, { x: bx - dotR, y: cy - dotR, w: dotR * 2, h: dotR * 2 }, {
        preset: 'ellipse',
        fill: tk.canvas,
        stroke: tk.inkMuted,
        strokePt: 2.0,
      }))
      shapes.push(ooxmlShape(nextId(), `Dumbbell After ${idx + 1}`, { x: ax - dotR - 0.015, y: cy - dotR - 0.015, w: (dotR + 0.015) * 2, h: (dotR + 0.015) * 2 }, {
        preset: 'ellipse',
        fill: barCol,
        stroke: tk.canvas,
        strokePt: 1.25,
      }))
      // 外侧防撞数值标签
      const bLeft = bx <= ax
      shapes.push(ooxmlShape(nextId(), `Dumbbell Val B ${idx + 1}`, { x: bLeft ? bx - 0.78 : bx + 0.18, y: cy - 0.15, w: 0.62, h: 0.30 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [ooxmlRichParagraph(fmtNum(r.before, r.unit), { sizePt: 11, color: tk.inkMuted, bold: true, lang: 'en-US', align: bLeft ? 'r' : 'l', font: theme.fonts.body })],
      }))
      shapes.push(ooxmlShape(nextId(), `Dumbbell Val A ${idx + 1}`, { x: bLeft ? ax + 0.18 : ax - 0.80, y: cy - 0.15, w: 0.64, h: 0.30 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [ooxmlRichParagraph(fmtNum(r.after, r.unit), { sizePt: 11.5, color: barCol, bold: true, lang: 'en-US', align: bLeft ? 'l' : 'r', font: theme.fonts.heading })],
      }))
      // 右侧变化量胶囊
      const pillX = 12.71 - deltaW
      shapes.push(ooxmlShape(nextId(), `Dumbbell Delta ${idx + 1}`, { x: pillX, y: cy - 0.17, w: deltaW, h: 0.34 }, {
        preset: 'roundRect',
        adj: 50000,
        fill: tk.surface1,
        stroke: barCol,
        strokePt: 0.8,
        anchor: 'ctr',
        marginsIn: { l: 0.04, r: 0.04, t: 0.01, b: 0.01 },
        paragraphs: [ooxmlRichParagraph(r.delta, { sizePt: 11.5, color: barCol, bold: true, lang: 'en-US', align: 'ctr', font: theme.fonts.heading })],
      }))
    })
    return shapes.join('')
  }

  // ---------------- 4. DATA HEATMAP MATRIX ----------------
  const model = computeHeatmapModel(slide, langEn)
  const cols = model.colHeaders.length
  const rows = model.rowLabels.length
  const rowLabelW = Math.min(2.45, Math.max(1.65, 12.09 * 0.18))
  const headH = 0.44
  const legendH = 0.36
  const gap = 0.06
  const gridX = 0.62 + rowLabelW + 0.12
  const gridW = 12.09 - rowLabelW - 0.12
  const gridY = bodyTopY + legendH + headH + 0.06
  const gridH = Math.max(2.1, bodyH - legendH - headH - 0.12)
  const cellW = (gridW - gap * (cols - 1)) / Math.max(1, cols)
  const cellH = (gridH - gap * (rows - 1)) / Math.max(1, rows)

  // 顶部色带图例（Low → High）
  const rampW = 2.6
  const rampX = 12.71 - rampW
  const rampY = bodyTopY + 0.04
  shapes.push(ooxmlShape(nextId(), 'Heatmap Scale Low', { x: rampX - 0.82, y: rampY, w: 0.74, h: 0.24 }, {
    txBox: true,
    anchor: 'ctr',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    paragraphs: [ooxmlRichParagraph(fmtNum(model.minVal), { sizePt: 10, color: tk.inkMuted, lang: 'en-US', align: 'r', font: theme.fonts.body })],
  }))
  const rampSteps = 6
  const segW = (rampW - 0.78) / rampSteps
  for (let si = 0; si < rampSteps; si += 1) {
    const sv = model.minVal + (si / Math.max(1, rampSteps - 1)) * (model.maxVal - model.minVal)
    shapes.push(ooxmlShape(nextId(), `Heatmap Legend ${si + 1}`, { x: rampX + si * segW, y: rampY + 0.04, w: segW - 0.02, h: 0.16 }, {
      preset: 'rect',
      fill: heatCellColor(sv, model, tk),
    }))
  }
  shapes.push(ooxmlShape(nextId(), 'Heatmap Scale High', { x: rampX + rampW - 0.72, y: rampY, w: 0.72, h: 0.24 }, {
    txBox: true,
    anchor: 'ctr',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    paragraphs: [ooxmlRichParagraph(fmtNum(model.maxVal), { sizePt: 10, color: tk.inkPrimary, bold: true, lang: 'en-US', align: 'l', font: theme.fonts.body })],
  }))

  // 左上角标 & 列标题
  if (model.corner) {
    shapes.push(ooxmlShape(nextId(), 'Heatmap Corner', { x: 0.62, y: bodyTopY + legendH, w: rowLabelW, h: headH }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0.06, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(model.corner, { sizePt: 11.5, color: tk.inkMuted, bold: true, lang: langAttr, align: 'r', font: theme.fonts.body })],
    }))
  }
  model.colHeaders.forEach((ch, ci) => {
    shapes.push(ooxmlShape(nextId(), `Heatmap Col ${ci + 1}`, { x: gridX + ci * (cellW + gap), y: bodyTopY + legendH, w: cellW, h: headH }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(ch, { sizePt: 13, color: tk.inkPrimary, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading })],
    }))
  })

  // 矩阵行与色阶单元格
  model.matrix.forEach((rowCells, ri) => {
    const ry = gridY + ri * (cellH + gap)
    shapes.push(ooxmlShape(nextId(), `Heatmap Row ${ri + 1}`, { x: 0.62, y: ry, w: rowLabelW, h: cellH }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0.06, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(model.rowLabels[ri], { sizePt: 13, color: tk.inkPrimary, bold: true, lang: langAttr, align: 'r', font: theme.fonts.heading })],
    }))
    rowCells.forEach((cell, ci) => {
      const cx = gridX + ci * (cellW + gap)
      const bg = heatCellColor(cell.num, model, tk)
      const fg = relativeLuminance(bg) < 0.36 ? '#FFFFFF' : '#0F172A'
      const isPeak = Number.isFinite(cell.num) && cell.num === model.maxVal
      shapes.push(ooxmlShape(nextId(), `Heatmap Cell ${ri + 1}-${ci + 1}`, { x: cx, y: ry, w: cellW, h: cellH }, {
        preset: 'roundRect',
        adj: roundRectAdj(cellW, cellH, Math.min(8, Math.max(4, chromeCfg.cardRadiusPx))),
        fill: bg,
        stroke: isPeak ? mixHex(tk.accentPrimary, '#000000', 0.24) : '',
        strokePt: isPeak ? 1.5 : 0,
        anchor: 'ctr',
        marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
        paragraphs: [
          ooxmlRichParagraph(cell.raw, {
            sizePt: cols >= 7 ? 12.5 : 14.5,
            color: fg,
            bold: isPeak || relativeLuminance(bg) < 0.36,
            lang: 'en-US',
            align: 'ctr',
            font: theme.fonts.heading,
          }),
        ],
      }))
    })
  })
  return shapes.join('')
}

// ---------------------------------------------------------------------------
// 3. HTML SVG 双端同构渲染器
// ---------------------------------------------------------------------------

export function renderProChartSlideBodyHtml(slide, ctx = {}) {
  const layout = slide.layout
  if (!PRO_CHART_LAYOUTS.has(layout)) return null
  const { theme, langId } = ctx
  const tk = theme.tokens
  const langEn = langId === 'en'

  if (layout === 'quadrant') {
    const model = computeQuadrantModel(slide, langEn)
    const W = 960
    const H = 430
    const px = 86
    const py = 18
    const pw = W - 110
    const ph = H - 62
    const mx = px + pw / 2
    const my = py + ph / 2
    const padX = 56
    const padY = 50
    const bubbles = model.points.map((p, idx) => {
      const cx = px + padX + p.nx * (pw - padX * 2)
      const cy = py + padY + (1 - p.ny) * (ph - padY * 2)
      const r = 14 + p.ns * 18
      const isFocal = idx === 0 || p.status === 'accent'
      const col = p.status === 'positive'
        ? tk.positive
        : p.status === 'negative'
          ? tk.negative
          : p.status === 'accent'
            ? tk.accentPrimary
            : (tk.chartSeries?.[idx % tk.chartSeries.length] || tk.accentSecondary)
      const below = cy - r - 20 < py + 30
      const ly = below ? Math.min(py + ph - 12, cy + r + 17) : cy - r - 9
      return (
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" fill-opacity="${isFocal ? 0.90 : 0.76}" stroke="${tk.canvas}" stroke-width="${isFocal ? 2.5 : 1.5}"/>` +
        `<text x="${cx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="${isFocal ? 13 : 12}" font-weight="${isFocal ? 700 : 600}" fill="${idx === 0 ? tk.inkPrimary : (isFocal ? tk.accentText : tk.inkPrimary)}">${escapeHtml(p.title)}</text>`
      )
    }).join('')

    return (
      `<div class="pro-chart-wrap">` +
      `<svg class="pro-chart-svg quadrant-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(slide.title || 'Quadrant chart')}">` +
      `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="10" fill="${tk.surface1}" stroke="${tk.hairline}" stroke-width="1.2"/>` +
      `<rect x="${mx}" y="${py}" width="${pw / 2}" height="${ph / 2}" fill="${tk.accentSoft}" fill-opacity="${theme.dark ? 0.35 : 0.65}"/>` +
      `<line x1="${mx}" y1="${py}" x2="${mx}" y2="${py + ph}" stroke="${tk.hairline}" stroke-width="1.2" stroke-dasharray="5 4"/>` +
      `<line x1="${px}" y1="${my}" x2="${px + pw}" y2="${my}" stroke="${tk.hairline}" stroke-width="1.2" stroke-dasharray="5 4"/>` +
      `<text x="${px + 14}" y="${py + 22}" font-size="11" font-weight="700" letter-spacing="1" fill="${tk.inkMuted}">${escapeHtml(model.quadrants[0].toUpperCase())}</text>` +
      `<text x="${px + pw - 14}" y="${py + 22}" text-anchor="end" font-size="11" font-weight="700" letter-spacing="1" fill="${tk.accentText}">${escapeHtml(model.quadrants[1].toUpperCase())}</text>` +
      `<text x="${px + 14}" y="${py + ph - 12}" font-size="11" font-weight="700" letter-spacing="1" fill="${tk.inkMuted}">${escapeHtml(model.quadrants[2].toUpperCase())}</text>` +
      `<text x="${px + pw - 14}" y="${py + ph - 12}" text-anchor="end" font-size="11" font-weight="700" letter-spacing="1" fill="${tk.inkMuted}">${escapeHtml(model.quadrants[3].toUpperCase())}</text>` +
      bubbles +
      `<text x="${px + pw / 2}" y="${H - 12}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${tk.inkSecondary}">${escapeHtml(model.xLabel)}</text>` +
      `<text x="26" y="${py + ph / 2}" text-anchor="middle" font-size="12" font-weight="700" fill="${tk.inkSecondary}" transform="rotate(-90 26 ${py + ph / 2})">${escapeHtml(model.yLabel)}</text>` +
      `</svg></div>`
    )
  }

  if (layout === 'radar') {
    const model = computeRadarModel(slide, langEn)
    const n = model.axes.length
    const W = 880
    const H = 430
    const cx = W / 2
    const cy = H / 2 + 16
    const maxR = 152
    const cols = [tk.accentPrimary, tk.accentSecondary, tk.positive]
    const pt = (i, f) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n
      return { x: cx + Math.cos(a) * maxR * f, y: cy + Math.sin(a) * maxR * f, cos: Math.cos(a) }
    }
    const rings = [1, 0.75, 0.5, 0.25].map((f, gi) => {
      const d = Array.from({ length: n }, (_, i) => pt(i, f)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      return `<polygon points="${d}" fill="${gi === 0 ? tk.surface1 : 'none'}" fill-opacity="0.45" stroke="${tk.hairline}" stroke-width="${gi === 0 ? 1.3 : 0.9}"/>`
    }).join('')
    const spokes = model.axes.map((ax, i) => {
      const tip = pt(i, 1)
      const lbl = pt(i, 1.18)
      const anchor = lbl.cos > 0.2 ? 'start' : lbl.cos < -0.2 ? 'end' : 'middle'
      return (
        `<line x1="${cx}" y1="${cy}" x2="${tip.x.toFixed(1)}" y2="${tip.y.toFixed(1)}" stroke="${tk.hairline}" stroke-width="0.9"/>` +
        `<text x="${lbl.x.toFixed(1)}" y="${(lbl.y + 4).toFixed(1)}" text-anchor="${anchor}" font-size="13" font-weight="700" fill="${tk.inkPrimary}">${escapeHtml(ax)}</text>`
      )
    }).join('')
    const polys = model.series.map((s, si) => {
      const col = cols[si % cols.length]
      const pts = s.values.map((v, i) => pt(i, Math.max(0.05, Math.min(1, v / model.maxVal))))
      const d = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      const dots = pts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="${col}" stroke="${tk.canvas}" stroke-width="1.5"/>`).join('')
      return `<polygon points="${d}" fill="${col}" fill-opacity="${si === 0 ? 0.24 : 0.14}" stroke="${col}" stroke-width="${si === 0 ? 2.6 : 1.8}"/>${dots}`
    }).join('')
    const legend = model.series.map((s, si) => {
      const col = cols[si % cols.length]
      return `<span class="pro-leg-item"><i style="background:${col}"></i>${escapeHtml(s.name)}</span>`
    }).join('')
    return (
      `<div class="pro-chart-wrap">` +
      `<div class="pro-leg-bar">${legend}</div>` +
      `<svg class="pro-chart-svg radar-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(slide.title || 'Radar chart')}">${rings}${spokes}${polys}</svg>` +
      `</div>`
    )
  }

  if (layout === 'dumbbell') {
    const model = computeDumbbellModel(slide, langEn)
    const W = 960
    const H = Math.max(290, model.rows.length * 64 + 68)
    const lx = 215
    const rx = W - 125
    const tw = rx - lx
    const top = 26
    const rowH = (H - 64) / model.rows.length
    const mapX = (v) => lx + ((v - model.minVal) / Math.max(1e-6, model.maxVal - model.minVal)) * tw

    const tickVals = Array.isArray(model.ticks) && model.ticks.length >= 2
      ? model.ticks
      : [0, 0.25, 0.5, 0.75, 1].map((f) => model.minVal + f * (model.maxVal - model.minVal))
    const grids = tickVals.map((val, ti) => {
      const f = (val - model.minVal) / Math.max(1e-6, model.maxVal - model.minVal)
      const gx = lx + f * tw
      return (
        `<line x1="${gx.toFixed(1)}" y1="${top}" x2="${gx.toFixed(1)}" y2="${H - 36}" stroke="${tk.hairline}" stroke-dasharray="${ti === 0 ? '' : '4 4'}"/>` +
        `<text x="${gx.toFixed(1)}" y="${H - 14}" text-anchor="middle" font-size="11.5" fill="${tk.inkMuted}">${escapeHtml(fmtNum(val))}</text>`
      )
    }).join('')

    const rowsSvg = model.rows.map((r, idx) => {
      const cy = top + (idx + 0.5) * rowH
      const bx = mapX(r.before)
      const ax = mapX(r.after)
      const col = r.status === 'negative' ? tk.negative : (r.status === 'positive' ? tk.positive : tk.accentPrimary)
      const bLeft = bx <= ax
      return (
        `<text x="${lx - 18}" y="${(cy + 5).toFixed(1)}" text-anchor="end" font-size="14" font-weight="700" fill="${tk.inkPrimary}">${escapeHtml(r.title)}</text>` +
        `<line x1="${lx}" y1="${cy.toFixed(1)}" x2="${rx}" y2="${cy.toFixed(1)}" stroke="${tk.hairline}" stroke-width="1"/>` +
        `<line x1="${bx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-opacity="0.85"/>` +
        `<circle cx="${bx.toFixed(1)}" cy="${cy.toFixed(1)}" r="8" fill="${tk.canvas}" stroke="${tk.inkMuted}" stroke-width="2.5"/>` +
        `<circle cx="${ax.toFixed(1)}" cy="${cy.toFixed(1)}" r="9" fill="${col}" stroke="${tk.canvas}" stroke-width="2"/>` +
        `<text x="${(bLeft ? bx - 14 : bx + 14).toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="${bLeft ? 'end' : 'start'}" font-size="12" font-weight="700" fill="${tk.inkMuted}">${escapeHtml(fmtNum(r.before, r.unit))}</text>` +
        `<text x="${(bLeft ? ax + 14 : ax - 14).toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="${bLeft ? 'start' : 'end'}" font-size="12.5" font-weight="800" fill="${col}">${escapeHtml(fmtNum(r.after, r.unit))}</text>` +
        `<rect x="${rx + 18}" y="${(cy - 13).toFixed(1)}" width="94" height="26" rx="13" fill="${tk.surface1}" stroke="${col}" stroke-width="1.2"/>` +
        `<text x="${rx + 65}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" fill="${col}">${escapeHtml(r.delta)}</text>`
      )
    }).join('')

    return (
      `<div class="pro-chart-wrap">` +
      `<div class="pro-leg-bar"><span class="pro-leg-item"><i class="is-hollow" style="border-color:${tk.inkMuted}"></i>${escapeHtml(model.beforeLabel)}</span><span class="pro-leg-item"><i style="background:${tk.accentPrimary}"></i>${escapeHtml(model.afterLabel)}</span></div>` +
      `<svg class="pro-chart-svg dumbbell-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(slide.title || 'Dumbbell chart')}">${grids}${rowsSvg}</svg>` +
      `</div>`
    )
  }

  // layout === 'heatmap'
  const model = computeHeatmapModel(slide, langEn)
  const rampStops = Array.from({ length: 6 }, (_, si) => {
    const sv = model.minVal + (si / 5) * (model.maxVal - model.minVal)
    return `<i style="background:${heatCellColor(sv, model, tk)}"></i>`
  }).join('')
  const headHtml = `<div class="hm-corner">${escapeHtml(model.corner)}</div>` +
    model.colHeaders.map((c) => `<div class="hm-col">${escapeHtml(c)}</div>`).join('')
  const rowsHtml = model.matrix.map((rowCells, ri) =>
    `<div class="hm-row-lbl">${escapeHtml(model.rowLabels[ri])}</div>` +
    rowCells.map((cell) => {
      const bg = heatCellColor(cell.num, model, tk)
      const fg = relativeLuminance(bg) < 0.36 ? '#FFFFFF' : '#0F172A'
      const peak = Number.isFinite(cell.num) && cell.num === model.maxVal
      return `<div class="hm-cell${peak ? ' is-peak' : ''}" style="background:${bg};color:${fg}">${escapeHtml(cell.raw)}</div>`
    }).join(''),
  ).join('')
  return (
    `<div class="pro-chart-wrap">` +
    `<div class="hm-legend"><span>${escapeHtml(fmtNum(model.minVal))}</span><span class="hm-ramp">${rampStops}</span><strong>${escapeHtml(fmtNum(model.maxVal))}</strong></div>` +
    `<div class="hm-grid" style="grid-template-columns:minmax(110px,1.25fr) repeat(${model.colHeaders.length},minmax(0,1fr))">${headHtml}${rowsHtml}</div>` +
    `</div>`
  )
}

export const PRO_CHARTS_CSS = `
/* Phase 7 Pinnacle Analyst Charts: Quadrant, Radar, Dumbbell & Heatmap */
.pro-chart-wrap{display:flex;flex-direction:column;gap:10px;width:100%;align-items:center}
.pro-chart-svg{width:100%;max-height:460px;height:auto;display:block}
.pro-leg-bar{display:flex;gap:18px;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--ink-secondary)}
.pro-leg-item{display:inline-flex;align-items:center;gap:7px}
.pro-leg-item i{width:11px;height:11px;border-radius:50%;display:inline-block}
.pro-leg-item i.is-hollow{background:var(--bg);border:2.2px solid var(--muted)}
.hm-legend{display:flex;align-items:center;gap:8px;align-self:flex-end;font-size:12px;color:var(--muted)}
.hm-legend strong{color:var(--fg)}
.hm-ramp{display:inline-flex;gap:2px}
.hm-ramp i{width:22px;height:12px;border-radius:2px;display:block}
.hm-grid{display:grid;gap:6px;width:100%;align-items:stretch}
.hm-corner,.hm-col,.hm-row-lbl{display:flex;align-items:center;font-family:var(--font-heading);font-weight:700;font-size:clamp(12px,1.2vw,15px);color:var(--fg)}
.hm-corner,.hm-row-lbl{justify-content:flex-end;padding-right:10px}
.hm-corner{color:var(--muted);font-size:12px}
.hm-col{justify-content:center;padding:6px 4px}
.hm-cell{display:flex;align-items:center;justify-content:center;min-height:clamp(42px,5.2vw,66px);border-radius:calc(var(--radius) * .6);font-family:var(--font-heading);font-weight:700;font-size:clamp(14px,1.4vw,18px);font-variant-numeric:tabular-nums}
.hm-cell.is-peak{outline:2px solid var(--fg);outline-offset:-2px}
`

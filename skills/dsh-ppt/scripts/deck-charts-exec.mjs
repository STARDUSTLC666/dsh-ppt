/**
 * deck-charts-exec.mjs —— 4 套高管咨询级原生矢量图谱渲染器（零新增依赖）：
 *   1. `issue-tree`（别名 `mece` / `logic-tree`）：麦肯锡 MECE 逻辑议题树（左核心议题 → 中一级分支 → 右二级假设/行动叶节点 + 原生正交连接线）
 *   2. `treemap`（别名 `rect-map` / `budget-map`）：Squarified Treemap 比例矩形树图（预算/营收/成本占比面积精确切分 + WCAG 自动反白文字）
 *   3. `gauge`（别名 `bullet-chart` / `okr-gauge`）：Stephen Few 高管水平子弹图 / OKR 达标仪（三段定性区间底带 + 实绩柱 + 目标阈值垂线 + 右侧达标徽章）
 *   4. `pricing`（别名 `tiers` / `packages`）：Good / Better / Best 三档商业报价与方案选型矩阵（主推档顶条高亮 + 价格锚点 + 权益清单）
 *
 * 100% HTML/SVG 与 PPTX 原生可编辑 OOXML 双端同构渲染。
 */

import { relativeLuminance, mixHex, bestContrastInk } from './deck-themes.mjs'
import {
  escapeHtml,
  stripInlineMarkdown,
  renderInlineHtml,
  computeTextFit,
  resolveEffectiveItems,
  ooxmlShape,
  ooxmlRichParagraph,
  ooxmlLine,
  renderSurfaceCardPptx,
} from './deck-chrome.mjs'

export const EXEC_CHART_LAYOUTS = new Set(['issue-tree', 'treemap', 'gauge', 'pricing'])

function parseNumericVal(raw, fallback = 0) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const s = String(raw ?? '').replace(/,/g, '')
  const m = /[+-]?(?:\d+\.?\d*|\.\d+)/.exec(s)
  if (!m) return fallback
  const n = Number(m[0])
  return Number.isFinite(n) ? n : fallback
}

function extractUnit(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  const cur = /^[¥$€£]/.exec(s)?.[0] || ''
  const suf = /(%|％|亿元|亿美元|万元|美元|元|万|亿|k|K|M|B|GWh|GW|ms|s|家|人|天|小时|\/月|\/年|\/mo|\/yr)$/.exec(s)?.[1] || ''
  return suf || cur
}

function fmtCompact(num, unit = '') {
  if (!Number.isFinite(num)) return '0'
  const abs = Math.abs(num)
  const str = abs >= 1000 ? Math.round(num).toLocaleString('en-US') : (Number.isInteger(num) ? String(num) : Number(num.toFixed(1)).toString())
  if (['¥', '$', '€', '£'].includes(unit)) return unit + str
  if (unit === '%' || unit === '％') return str + '%'
  return unit ? `${str}${unit}` : str
}

function contrastInkOn(bgHex) {
  return bestContrastInk(bgHex)
}

// ---------------------------------------------------------------------------
// 1. issue-tree (MECE Logic Tree)
// ---------------------------------------------------------------------------

export function computeIssueTreeModel(slide) {
  const items = resolveEffectiveItems(slide).slice(0, 4)
  const rootLabel = stripInlineMarkdown(slide.text || slide.subtitle || slide.title || 'Core Strategic Question').slice(0, 56)
  const rootTag = stripInlineMarkdown(slide.kicker || 'ROOT ISSUE').slice(0, 22)

  const branches = (items.length > 0 ? items : [
    { tag: '01', title: '增长引擎', bullets: ['拓展高价值行业客户', '提升现有客户净留存 NRR'] },
    { tag: '02', title: '成本优化', bullets: ['推理算力单元成本压缩 40%', '自动化交付缩短实施周期'] },
    { tag: '03', title: '组织保障', bullets: ['建立标杆案例复用机制', '季度 OKR 与激励强绑定'] },
  ]).map((it, idx) => {
    let leaves = []
    if (Array.isArray(it.bullets) && it.bullets.length > 0) {
      leaves = it.bullets.slice(0, 3).map((b) => stripInlineMarkdown(b).trim()).filter(Boolean)
    } else if (typeof it.text === 'string' && it.text.trim()) {
      leaves = it.text
        .split(/[；;|\n]/)
        .map((s) => stripInlineMarkdown(s).trim())
        .filter(Boolean)
        .slice(0, 3)
    }
    if (leaves.length === 0) {
      leaves = [stripInlineMarkdown(it.delta || it.value || it.title || `Sub-driver ${idx + 1}`)]
    }
    return {
      tag: stripInlineMarkdown(it.tag || String(idx + 1).padStart(2, '0')).slice(0, 12),
      title: stripInlineMarkdown(it.title || `Branch ${idx + 1}`).slice(0, 36),
      metric: stripInlineMarkdown([it.value, it.unit, it.delta].filter(Boolean).join(' ')).slice(0, 20),
      status: it.status || (idx === 0 ? 'accent' : ''),
      leaves,
    }
  })

  return { rootTag, rootLabel, branches }
}

function renderIssueTreePptx(slide, ctx) {
  const { theme, langAttr, chromeCfg, nextId, bodyTopY, bodyH, cardMaterial = 'solid' } = ctx
  const tk = theme.tokens
  const model = computeIssueTreeModel(slide)
  const branches = model.branches
  const totalLeaves = branches.reduce((s, b) => s + Math.max(1, b.leaves.length), 0)

  const rootX = 0.62, rootW = 2.48, rootH = Math.min(2.1, Math.max(1.35, bodyH * 0.36))
  const rootY = bodyTopY + (bodyH - rootH) / 2
  const branchX = 3.66, branchW = 2.98
  const leafX = 7.20, leafW = 5.51

  const gutter1Mid = (rootX + rootW + branchX) / 2
  const gutter2Mid = (branchX + branchW + leafX) / 2
  const lineColor = mixHex(tk.accentText || theme.palette.accent, tk.hairline || '#CBD5E1', 0.45)

  let xml = ''

  // Root Node (accent filled)
  const rootFill = theme.palette.accent
  const rootInk = contrastInkOn(rootFill)
  const rootFit = computeTextFit(model.rootLabel, { w: rootW - 0.24, h: rootH - 0.56 }, 'cardTitle', { maxPt: 17, minPt: 13.5 })
  xml += ooxmlShape(nextId(), 'IssueTree Root', { x: rootX, y: rootY, w: rootW, h: rootH }, {
    preset: 'roundRect',
    adj: 8000,
    fill: rootFill,
    stroke: rootFill,
    strokePt: 1,
    anchor: 'ctr',
    marginsIn: { l: 0.16, r: 0.16, t: 0.14, b: 0.14 },
    paragraphs: [
      ooxmlRichParagraph(model.rootTag, { sizePt: 10, bold: true, color: mixHex(rootInk, rootFill, 0.22), lang: langAttr, font: theme.fonts.body, spaceAfterPt: 4 }),
      ooxmlRichParagraph(model.rootLabel, { sizePt: rootFit.fontPt, bold: true, color: rootInk, lang: langAttr, font: theme.fonts.heading, lineHeight: 1.24 }),
    ],
  })

  const branchGap = 0.18
  const usableH = bodyH - branchGap * Math.max(0, branches.length - 1)
  let curY = bodyTopY
  const branchCentersY = []

  branches.forEach((br, bIdx) => {
    const share = Math.max(1, br.leaves.length) / Math.max(1, totalLeaves)
    const bandH = usableH * share
    const brH = Math.min(bandH - 0.04, Math.max(0.88, bandH * 0.72))
    const brY = curY + (bandH - brH) / 2
    const brMidY = brY + brH / 2
    branchCentersY.push(brMidY)

    const isAccent = bIdx === 0 || br.status === 'accent'
    const brFit = computeTextFit(br.title, { w: branchW - 0.28, h: brH - 0.36 }, 'cardTitle', { maxPt: 15, minPt: 12.5 })
    xml += renderSurfaceCardPptx(`IssueTree Branch ${bIdx + 1}`, { x: branchX, y: brY, w: branchW, h: brH }, {
      focal: isAccent,
      cardMaterial,
      anchor: 'ctr',
      marginsIn: { l: 0.18, r: 0.14, t: 0.08, b: 0.08 },
      paragraphs: [
        ooxmlRichParagraph(br.metric ? `${br.tag} · ${br.metric}` : br.tag, { sizePt: 9.5, bold: true, color: tk.accentText, lang: langAttr, font: theme.fonts.body, spaceAfterPt: 2 }),
        ooxmlRichParagraph(br.title, { sizePt: brFit.fontPt, bold: true, color: tk.inkPrimary, lang: langAttr, font: theme.fonts.heading, lineHeight: 1.2 }),
      ],
    }, nextId, chromeCfg, theme)

    const leafGap = 0.09
    const leafCount = br.leaves.length
    const leafH = Math.max(0.42, (bandH - leafGap * Math.max(0, leafCount - 1)) / Math.max(1, leafCount))
    const leafCentersY = []

    br.leaves.forEach((leafText, lIdx) => {
      const ly = curY + lIdx * (leafH + leafGap)
      const lMidY = ly + leafH / 2
      leafCentersY.push(lMidY)
      const leafFit = computeTextFit(leafText, { w: leafW - 0.3, h: leafH - 0.08 }, 'cardBody', { maxPt: 13.5, minPt: 11.5 })
      xml += ooxmlShape(nextId(), `IssueTree Leaf ${bIdx + 1}-${lIdx + 1}`, { x: leafX, y: ly, w: leafW, h: leafH }, {
        preset: 'roundRect',
        adj: 11000,
        fill: tk.surface1,
        stroke: tk.hairline,
        strokePt: 0.85,
        anchor: 'ctr',
        marginsIn: { l: 0.16, r: 0.14, t: 0.05, b: 0.05 },
        paragraphs: [
          ooxmlRichParagraph(leafText, { sizePt: leafFit.fontPt, color: tk.inkPrimary, secondaryColor: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.18, autoLeadBold: true }),
        ],
      })
      xml += ooxmlLine(nextId(), `IssueTree LConn ${bIdx + 1}-${lIdx + 1}`, { x: gutter2Mid, y: lMidY }, { x: leafX, y: lMidY }, { color: lineColor, widthPt: 1.25 })
    })

    xml += ooxmlLine(nextId(), `IssueTree BOut ${bIdx + 1}`, { x: branchX + branchW, y: brMidY }, { x: gutter2Mid, y: brMidY }, { color: lineColor, widthPt: 1.25 })
    if (leafCentersY.length >= 2) {
      xml += ooxmlLine(nextId(), `IssueTree BSpine ${bIdx + 1}`, { x: gutter2Mid, y: leafCentersY[0] }, { x: gutter2Mid, y: leafCentersY[leafCentersY.length - 1] }, { color: lineColor, widthPt: 1.25 })
    }
    xml += ooxmlLine(nextId(), `IssueTree RBranch ${bIdx + 1}`, { x: gutter1Mid, y: brMidY }, { x: branchX, y: brMidY }, { color: lineColor, widthPt: 1.5 })

    curY += bandH + branchGap
  })

  const rootMidY = rootY + rootH / 2
  xml += ooxmlLine(nextId(), 'IssueTree ROut', { x: rootX + rootW, y: rootMidY }, { x: gutter1Mid, y: rootMidY }, { color: lineColor, widthPt: 1.5 })
  if (branchCentersY.length >= 2) {
    xml += ooxmlLine(nextId(), 'IssueTree RSpine', { x: gutter1Mid, y: branchCentersY[0] }, { x: gutter1Mid, y: branchCentersY[branchCentersY.length - 1] }, { color: lineColor, widthPt: 1.5 })
  }

  return xml
}

function renderIssueTreeHtml(slide) {
  const model = computeIssueTreeModel(slide)
  return (
    '<div class="itree-board">' +
    '<div class="itree-root">' +
    '<span class="itree-root-tag">' + escapeHtml(model.rootTag) + '</span>' +
    '<div class="itree-root-title">' + renderInlineHtml(model.rootLabel) + '</div>' +
    '</div>' +
    '<div class="itree-branches">' +
    model.branches.map((br, idx) =>
      '<div class="itree-row" data-item-index="' + idx + '">' +
      '<div class="surface-card itree-branch' + (idx === 0 || br.status === 'accent' ? ' is-focal' : '') + '">' +
      '<span class="itree-tag">' + escapeHtml(br.metric ? `${br.tag} · ${br.metric}` : br.tag) + '</span>' +
      '<div class="itree-branch-title">' + renderInlineHtml(br.title) + '</div>' +
      '</div>' +
      '<div class="itree-leaves">' +
      br.leaves.map((lf) => '<div class="itree-leaf">' + renderInlineHtml(lf, { autoLeadBold: true }) + '</div>').join('') +
      '</div></div>',
    ).join('') +
    '</div></div>'
  )
}

// ---------------------------------------------------------------------------
// 2. treemap (Squarified Proportional Area Treemap)
// ---------------------------------------------------------------------------

function squarifyLayout(entries, rect) {
  const results = []
  let rem = [...entries]
  let x = rect.x, y = rect.y, w = rect.w, h = rect.h

  const worstRatio = (row, sideLen) => {
    if (row.length === 0 || sideLen <= 0) return Infinity
    const s = row.reduce((acc, r) => acc + r.area, 0)
    if (s <= 0) return Infinity
    const maxA = Math.max(...row.map((r) => r.area))
    const minA = Math.min(...row.map((r) => r.area))
    const s2 = s * s
    const w2 = sideLen * sideLen
    return Math.max((w2 * maxA) / s2, s2 / (w2 * Math.max(1e-9, minA)))
  }

  while (rem.length > 0 && w > 0.01 && h > 0.01) {
    const shortSide = Math.min(w, h)
    const row = [rem[0]]
    let idx = 1
    while (idx < rem.length) {
      const candidate = [...row, rem[idx]]
      if (worstRatio(candidate, shortSide) <= worstRatio(row, shortSide)) {
        row.push(rem[idx])
        idx += 1
      } else {
        break
      }
    }
    rem = rem.slice(row.length)
    const rowArea = row.reduce((acc, r) => acc + r.area, 0)
    if (w >= h) {
      const colW = h > 0 ? rowArea / h : w
      let cy = y
      for (const item of row) {
        const ih = colW > 0 ? item.area / colW : h / row.length
        results.push({ ...item, x, y: cy, w: colW, h: ih })
        cy += ih
      }
      x += colW
      w = Math.max(0, w - colW)
    } else {
      const rowH = w > 0 ? rowArea / w : h
      let cx = x
      for (const item of row) {
        const iw = rowH > 0 ? item.area / rowH : w / row.length
        results.push({ ...item, x: cx, y, w: iw, h: rowH })
        cx += iw
      }
      y += rowH
      h = Math.max(0, h - rowH)
    }
  }
  return results
}

export function computeTreemapModel(slide, box = { x: 0.62, y: 1.78, w: 12.09, h: 4.35 }) {
  let rawEntries = []
  if (Array.isArray(slide.items) && slide.items.length > 0) {
    rawEntries = slide.items.map((it, idx) => {
      const num = Math.max(0.01, parseNumericVal(it.value ?? it.size ?? it.weight ?? it.text, 10))
      const unit = it.unit || extractUnit(it.value)
      return {
        label: stripInlineMarkdown(it.title || it.tag || `Item ${idx + 1}`).slice(0, 32),
        tag: stripInlineMarkdown(it.tag || '').slice(0, 18),
        value: num,
        unit,
        displayValue: it.value !== undefined && it.value !== '' ? `${stripInlineMarkdown(String(it.value))}${it.unit && !String(it.value).includes(it.unit) ? it.unit : ''}` : fmtCompact(num, unit),
        delta: stripInlineMarkdown(it.delta || ''),
      }
    })
  } else if (Array.isArray(slide.rows) && slide.rows.length >= 2) {
    rawEntries = slide.rows.slice(1).map((r, idx) => {
      const num = Math.max(0.01, parseNumericVal(r[1], 10))
      const unit = extractUnit(r[1])
      return {
        label: stripInlineMarkdown(r[0] || `Segment ${idx + 1}`).slice(0, 32),
        tag: stripInlineMarkdown(r[2] || '').slice(0, 18),
        value: num,
        unit,
        displayValue: stripInlineMarkdown(r[1] || fmtCompact(num, unit)),
        delta: '',
      }
    })
  } else {
    rawEntries = resolveEffectiveItems(slide).map((it, idx) => {
      const num = Math.max(1, parseNumericVal(it.value || it.text || it.title, 25 - idx * 4))
      return {
        label: stripInlineMarkdown(it.title || `Segment ${idx + 1}`).slice(0, 32),
        tag: stripInlineMarkdown(it.tag || '').slice(0, 18),
        value: num,
        unit: '',
        displayValue: fmtCompact(num),
        delta: '',
      }
    })
  }

  rawEntries = rawEntries.filter((e) => e.value > 0).sort((a, b) => b.value - a.value).slice(0, 12)
  if (rawEntries.length === 0) {
    rawEntries = [
      { label: 'Core Platform', tag: 'CORE', value: 45, unit: '%', displayValue: '45%', delta: '' },
      { label: 'Cloud AI', tag: 'GROWTH', value: 30, unit: '%', displayValue: '30%', delta: '' },
      { label: 'Services', tag: 'OPS', value: 25, unit: '%', displayValue: '25%', delta: '' },
    ]
  }

  const total = rawEntries.reduce((s, e) => s + e.value, 0)
  const totalArea = box.w * box.h
  const scaled = rawEntries.map((e, idx) => ({
    ...e,
    rank: idx,
    sharePct: Math.round((e.value / Math.max(1e-9, total)) * 1000) / 10,
    area: (e.value / Math.max(1e-9, total)) * totalArea,
  }))
  const rects = squarifyLayout(scaled, box)
  return { total, rects, box }
}

function treemapPalette(theme) {
  const p = theme.palette
  const tk = theme.tokens
  const base = Array.isArray(tk.chartSeries) && tk.chartSeries.length >= 4
    ? tk.chartSeries
    : [p.accent, p.accent2, mixHex(p.accent, p.fg, 0.3), mixHex(p.accent2, p.fg, 0.25), tk.positive || '#0D7A4E', tk.warning || '#B45309']
  return [
    base[0] || p.accent,
    base[1] || p.accent2,
    mixHex(base[0] || p.accent, p.bg, 0.22),
    mixHex(base[1] || p.accent2, p.bg, 0.22),
    base[2] || mixHex(p.accent, p.fg, 0.35),
    base[3] || mixHex(p.accent2, p.fg, 0.35),
    mixHex(p.accent, p.panel, 0.38),
    mixHex(p.accent2, p.panel, 0.38),
  ]
}

function renderTreemapPptx(slide, ctx) {
  const { theme, langAttr, nextId, bodyTopY, bodyH } = ctx
  const box = { x: 0.62, y: bodyTopY, w: 12.09, h: bodyH }
  const model = computeTreemapModel(slide, box)
  const fills = treemapPalette(theme)
  const gap = 0.045
  let xml = ''

  model.rects.forEach((tile, idx) => {
    const fill = fills[idx % fills.length]
    const ink = contrastInkOn(fill)
    const subInk = mixHex(ink, fill, 0.18)
    const tx = tile.x + gap / 2
    const ty = tile.y + gap / 2
    const tw = Math.max(0.35, tile.w - gap)
    const th = Math.max(0.35, tile.h - gap)

    const isLarge = tw >= 2.2 && th >= 1.3
    const isMed = tw >= 1.4 && th >= 0.85
    const paragraphs = []
    if (isLarge) {
      if (tile.tag && tile.tag !== tile.label) {
        paragraphs.push(ooxmlRichParagraph(tile.tag, { sizePt: 9.5, bold: true, color: subInk, lang: langAttr, font: theme.fonts.body, spaceAfterPt: 3 }))
      }
      paragraphs.push(ooxmlRichParagraph(tile.label, { sizePt: 15, bold: true, color: ink, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 4 }))
      paragraphs.push(ooxmlRichParagraph(`${tile.displayValue}  (${tile.sharePct}%)`, { sizePt: 18, bold: true, color: ink, lang: langAttr, font: theme.fonts.heading }))
    } else if (isMed) {
      paragraphs.push(ooxmlRichParagraph(tile.label, { sizePt: 12.5, bold: true, color: ink, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 2 }))
      paragraphs.push(ooxmlRichParagraph(`${tile.displayValue} · ${tile.sharePct}%`, { sizePt: 12, bold: true, color: subInk, lang: langAttr, font: theme.fonts.body }))
    } else {
      paragraphs.push(ooxmlRichParagraph(`${tile.label} ${tile.sharePct}%`, { sizePt: 10, bold: true, color: ink, lang: langAttr, font: theme.fonts.body }))
    }

    xml += ooxmlShape(nextId(), `Treemap Tile ${idx + 1}`, { x: tx, y: ty, w: tw, h: th }, {
      preset: 'roundRect',
      adj: 4500,
      fill,
      stroke: theme.palette.bg,
      strokePt: 1.5,
      anchor: isLarge ? 't' : 'ctr',
      marginsIn: { l: 0.14, r: 0.12, t: 0.12, b: 0.1 },
      paragraphs,
    })
  })

  return xml
}

function renderTreemapHtml(slide, theme) {
  const vw = 1000, vh = 400
  const model = computeTreemapModel(slide, { x: 0, y: 0, w: vw, h: vh })
  const fills = treemapPalette(theme)
  const pad = 4
  const clipPrefix = 'tm-' + Math.abs(String(slide.id || slide.title || 't').split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)).toString(36)
  const estPx = (s, fs) => {
    let acc = 0
    for (const ch of String(s || '')) acc += /[\u2E80-\u9FFF\uF900-\uFAFF]/.test(ch) ? fs * 1.02 : fs * 0.58
    return acc
  }
  const fitText = (s, maxW, fs) => {
    let out = String(s || '')
    if (estPx(out, fs) <= maxW) return out
    while (out.length > 2 && estPx(out + '…', fs) > maxW) out = out.slice(0, -1)
    return out.length >= 2 ? out + '…' : ''
  }
  const defs = []
  const rectsSvg = model.rects.map((t, idx) => {
    const fill = fills[idx % fills.length]
    const ink = contrastInkOn(fill)
    const x = t.x + pad / 2, y = t.y + pad / 2
    const w = Math.max(8, t.w - pad), h = Math.max(8, t.h - pad)
    const clipId = `${clipPrefix}-${idx}`
    defs.push(`<clipPath id="${clipId}"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="8"/></clipPath>`)
    const isLarge = w >= 190 && h >= 105
    const isMed = w >= 115 && h >= 64
    let labels = ''
    if (isLarge) {
      const l1 = fitText(t.label, w - 24, 16)
      const l2 = fitText(`${t.displayValue} (${t.sharePct}%)`, w - 24, 22)
      labels =
        `<text x="${(x + 14).toFixed(1)}" y="${(y + 28).toFixed(1)}" fill="${ink}" font-size="16" font-weight="700">${escapeHtml(l1)}</text>` +
        `<text x="${(x + 14).toFixed(1)}" y="${(y + 58).toFixed(1)}" fill="${ink}" font-size="22" font-weight="800">${escapeHtml(l2)}</text>`
    } else if (isMed) {
      const l1 = fitText(t.label, w - 18, 13.5)
      const l2 = fitText(`${t.displayValue} · ${t.sharePct}%`, w - 18, 13)
      labels =
        `<text x="${(x + 10).toFixed(1)}" y="${(y + 24).toFixed(1)}" fill="${ink}" font-size="13.5" font-weight="700">${escapeHtml(l1)}</text>` +
        `<text x="${(x + 10).toFixed(1)}" y="${(y + 46).toFixed(1)}" fill="${ink}" opacity="0.9" font-size="13" font-weight="600">${escapeHtml(l2)}</text>`
    } else if (w >= 46 && h >= 24) {
      const full = `${t.label} ${t.sharePct}%`
      const compact = fitText(full, w - 14, 11) || fitText(`${t.sharePct}%`, w - 10, 10.5)
      if (compact) {
        labels = `<text x="${(x + 7).toFixed(1)}" y="${(y + h / 2 + 4).toFixed(1)}" fill="${ink}" font-size="11" font-weight="700">${escapeHtml(compact)}</text>`
      }
    }
    return `<g data-item-index="${idx}"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="8" fill="${fill}"/>${labels ? `<g clip-path="url(#${clipId})">${labels}</g>` : ''}</g>`
  }).join('')
  return `<div class="treemap-wrap"><svg class="treemap-svg" viewBox="0 0 ${vw} ${vh}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(stripInlineMarkdown(slide.title || 'Treemap'))}"><defs>${defs.join('')}</defs>${rectsSvg}</svg></div>`
}

// ---------------------------------------------------------------------------
// 3. gauge (Stephen Few Horizontal Bullet / OKR Attainment Dashboard)
// ---------------------------------------------------------------------------

export function computeGaugeModel(slide, langEn = false) {
  const items = resolveEffectiveItems(slide).slice(0, 5)
  const list = items.length > 0 ? items : (langEn
    ? [
        { title: 'Annual ARR Attainment', value: 86, target: 80, max: 100, unit: '%', text: 'Enterprise renewals ahead of plan' },
        { title: 'Gross Margin', value: 74, target: 75, max: 100, unit: '%', text: 'Inference optimization underway' },
        { title: 'On-Time Delivery Rate', value: 92, target: 90, max: 100, unit: '%', text: 'Automated deployment live' },
      ]
    : [
        { title: '年度 ARR 营收达成', value: 86, target: 80, max: 100, unit: '%', text: '大客户续约超预期' },
        { title: '毛利率水平', value: 74, target: 75, max: 100, unit: '%', text: '算力优化持续推进' },
        { title: '交付周期达标率', value: 92, target: 90, max: 100, unit: '%', text: '全自动化部署落地' },
      ])
  return list.map((it, idx) => {
    const actual = Math.max(0, parseNumericVal(it.actual ?? it.value ?? it.after, 75))
    const rawTarget = it.target ?? it.before
    const target = rawTarget !== undefined && rawTarget !== '' ? Math.max(0.01, parseNumericVal(rawTarget, actual)) : Math.max(actual, 100)
    const rawMax = it.max
    const max = rawMax !== undefined && rawMax !== '' ? Math.max(actual, target, parseNumericVal(rawMax, 100)) : Math.max(100, Math.ceil(Math.max(actual, target) * 1.15))
    const unit = it.unit || extractUnit(it.value ?? it.actual) || (max === 100 ? '%' : '')
    const attainmentPct = Math.round((actual / Math.max(1e-9, target)) * 100)
    const status = it.status || (attainmentPct >= 100 ? 'positive' : attainmentPct >= 85 ? 'accent' : attainmentPct >= 70 ? 'warning' : 'negative')
    return {
      index: idx,
      tag: stripInlineMarkdown(it.tag || `KR${idx + 1}`).slice(0, 14),
      title: stripInlineMarkdown(it.title || `Metric ${idx + 1}`).slice(0, 34),
      subtitle: stripInlineMarkdown(it.text || '').slice(0, 46),
      actual,
      target,
      max,
      unit,
      actualRatio: Math.min(1, actual / Math.max(1e-9, max)),
      targetRatio: Math.min(1, target / Math.max(1e-9, max)),
      attainmentPct,
      displayActual: fmtCompact(actual, unit),
      displayTarget: fmtCompact(target, unit),
      delta: stripInlineMarkdown(it.delta || (langEn ? `${attainmentPct}% of goal` : `${attainmentPct}% 达标`)),
      status,
    }
  })
}

function gaugeStatusColor(status, theme) {
  const tk = theme.tokens
  if (status === 'positive') return tk.positive || '#0D7A4E'
  if (status === 'warning') return tk.warning || '#B45309'
  if (status === 'negative') return tk.negative || '#C81E1E'
  return theme.palette.accent
}

function renderGaugePptx(slide, ctx) {
  const { theme, langAttr, chromeCfg, nextId, bodyTopY, bodyH, cardMaterial = 'solid' } = ctx
  const tk = theme.tokens
  const langEn = langAttr === 'en-US'
  const rows = computeGaugeModel(slide, langEn)
  const count = rows.length
  const gap = 0.16
  const rowH = Math.min(1.04, (bodyH - gap * Math.max(0, count - 1)) / Math.max(1, count))
  const totalH = rowH * count + gap * Math.max(0, count - 1)
  const startY = bodyTopY + Math.max(0, (bodyH - totalH) / 2)

  const leftX = 0.62, leftW = 3.22
  const trackX = 4.04, trackW = 6.68
  const rightX = 10.90, rightW = 1.81

  const band1 = mixHex(tk.inkMuted || '#64748B', theme.palette.bg, 0.58)
  const band2 = mixHex(tk.inkMuted || '#64748B', theme.palette.bg, 0.74)
  const band3 = mixHex(tk.inkMuted || '#64748B', theme.palette.bg, 0.87)
  let xml = ''

  rows.forEach((r, idx) => {
    const ry = startY + idx * (rowH + gap)
    const barColor = gaugeStatusColor(r.status, theme)

    xml += renderSurfaceCardPptx(`Gauge Row ${idx + 1}`, { x: leftX, y: ry, w: 12.09, h: rowH }, {
      focal: false,
      cardMaterial,
      paragraphs: [],
    }, nextId, chromeCfg, theme)

    xml += ooxmlShape(nextId(), `Gauge Label ${idx + 1}`, { x: leftX + 0.16, y: ry + 0.06, w: leftW - 0.18, h: rowH - 0.12 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(r.title, { sizePt: 13.5, bold: true, color: tk.inkPrimary, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 2 }),
        ...(r.subtitle ? [ooxmlRichParagraph(r.subtitle, { sizePt: 10.5, color: tk.inkMuted, lang: langAttr, font: theme.fonts.body })] : []),
      ],
    })

    const trH = Math.min(0.40, rowH * 0.42)
    const trY = ry + (rowH - trH) / 2 - 0.04
    xml += ooxmlShape(nextId(), `Gauge Band3 ${idx + 1}`, { x: trackX, y: trY, w: trackW, h: trH }, { preset: 'rect', fill: band3 })
    xml += ooxmlShape(nextId(), `Gauge Band2 ${idx + 1}`, { x: trackX, y: trY, w: trackW * 0.85, h: trH }, { preset: 'rect', fill: band2 })
    xml += ooxmlShape(nextId(), `Gauge Band1 ${idx + 1}`, { x: trackX, y: trY, w: trackW * 0.6, h: trH }, { preset: 'rect', fill: band1 })
    xml += ooxmlShape(nextId(), `Gauge Track Frame ${idx + 1}`, { x: trackX, y: trY, w: trackW, h: trH }, { preset: 'rect', fill: '', stroke: tk.hairline, strokePt: 0.6 })

    const actH = trH * 0.48
    const actY = trY + (trH - actH) / 2
    const actW = Math.max(0.12, trackW * r.actualRatio)
    xml += ooxmlShape(nextId(), `Gauge Actual ${idx + 1}`, { x: trackX, y: actY, w: actW, h: actH }, { preset: 'roundRect', adj: 22000, fill: barColor })

    const tgtX = trackX + trackW * r.targetRatio - 0.025
    xml += ooxmlShape(nextId(), `Gauge Target ${idx + 1}`, { x: tgtX, y: trY - 0.06, w: 0.05, h: trH + 0.12 }, { preset: 'rect', fill: tk.inkPrimary })

    xml += ooxmlShape(nextId(), `Gauge TgtLabel ${idx + 1}`, { x: Math.max(trackX, Math.min(trackX + trackW - 1.25, tgtX - 0.55)), y: trY + trH + 0.03, w: 1.25, h: 0.2 }, {
      txBox: true,
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(`${langEn ? 'Target ' : '目标 '}${r.displayTarget}`, { sizePt: 8.5, color: tk.inkMuted, align: 'ctr', lang: langAttr, font: theme.fonts.body })],
    })

    xml += ooxmlShape(nextId(), `Gauge Value ${idx + 1}`, { x: rightX, y: ry + 0.06, w: rightW - 0.14, h: rowH - 0.12 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(r.displayActual, { sizePt: 18, bold: true, color: barColor, align: 'r', lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 2 }),
        ooxmlRichParagraph(r.delta, { sizePt: 10, bold: true, color: tk.inkSecondary, align: 'r', lang: langAttr, font: theme.fonts.body }),
      ],
    })
  })

  return xml
}

function renderGaugeHtml(slide, langEn = false) {
  const rows = computeGaugeModel(slide, langEn)
  const tgtPrefix = langEn ? 'Target ' : '目标 '
  return (
    '<div class="gauge-board">' +
    rows.map((r) => {
      const tgtPct = r.targetRatio * 100
      const clampedLblPct = Math.max(6, Math.min(93, tgtPct))
      return (
        '<div class="surface-card gauge-row" data-item-index="' + r.index + '">' +
        '<div class="gauge-label"><div class="card-title">' + renderInlineHtml(r.title) + '</div>' +
        (r.subtitle ? '<div class="gauge-sub">' + renderInlineHtml(r.subtitle) + '</div>' : '') +
        '</div>' +
        '<div class="gauge-track-wrap">' +
        '<div class="gauge-track">' +
        '<div class="gauge-band b1" style="width:60%"></div>' +
        '<div class="gauge-band b2" style="width:85%"></div>' +
        '<div class="gauge-actual tone-' + escapeHtml(r.status) + '" style="width:' + (r.actualRatio * 100).toFixed(1) + '%"></div>' +
        '<div class="gauge-target" style="left:' + tgtPct.toFixed(1) + '%" title="Target ' + escapeHtml(r.displayTarget) + '"></div>' +
        '</div>' +
        '<span class="gauge-tgt-lbl" style="left:' + clampedLblPct.toFixed(1) + '%">' + tgtPrefix + escapeHtml(r.displayTarget) + '</span>' +
        '</div>' +
        '<div class="gauge-readout"><strong class="tone-' + escapeHtml(r.status) + '">' + escapeHtml(r.displayActual) + '</strong><span>' + escapeHtml(r.delta) + '</span></div>' +
        '</div>'
      )
    }).join('') +
    '</div>'
  )
}

// ---------------------------------------------------------------------------
// 4. pricing (Good / Better / Best Executive Pricing & Package Matrix)
// ---------------------------------------------------------------------------

export function computePricingModel(slide) {
  const items = resolveEffectiveItems(slide).slice(0, 4)
  const list = items.length >= 2 ? items : [
    { tag: '标准版', title: 'Standard', value: '¥9,800', unit: '/年', text: '适合单团队快速启动', bullets: ['✓ 10 席位协作', '✓ 标准模板库', '✗ 私有化部署'] },
    { tag: '推荐主推', title: 'Enterprise Pro', value: '¥29,800', unit: '/年', status: 'accent', text: '适合中大型企业规模化赋能', bullets: ['✓ 无限席位与品牌宪章锁', '✓ Office 双向引擎 + 权威溯源', '✓ 专属客户成功顾问'] },
    { tag: '旗舰定制', title: 'Private Cloud', value: '定制报价', unit: '', text: '金融政企专享隔离部署', bullets: ['✓ 全链路本地化/内网运行', '✓ SSO 单点登录与审计日志', '✓ 7×24 SLA 响应'] },
  ]
  const hasExplicitRec = list.some((it) => it.status === 'accent' || /推荐|主推|首选|recommend|popular|best/i.test(String(it.tag || '')))
  return list.map((it, idx) => {
    const recommended = hasExplicitRec
      ? (it.status === 'accent' || /推荐|主推|首选|recommend|popular|best/i.test(String(it.tag || '')))
      : (list.length === 3 && idx === 1)
    const rawBullets = Array.isArray(it.bullets) && it.bullets.length > 0
      ? it.bullets
      : (typeof it.text === 'string' && it.text.includes('；') ? it.text.split(/[；;]/) : [])
    const features = rawBullets.slice(0, 5).map((b) => {
      const clean = stripInlineMarkdown(b).trim()
      const excluded = /^[✗✘×\-]\s*/.test(clean)
      const label = clean.replace(/^[✓✔✗✘×•\-]\s*/, '')
      return { label, included: !excluded }
    })
    return {
      index: idx,
      tag: stripInlineMarkdown(it.tag || (recommended ? 'RECOMMENDED' : `TIER 0${idx + 1}`)).slice(0, 22),
      title: stripInlineMarkdown(it.title || `Plan ${idx + 1}`).slice(0, 28),
      price: stripInlineMarkdown(it.value !== undefined && it.value !== '' ? String(it.value) : '—').slice(0, 20),
      unit: stripInlineMarkdown(it.unit || '').slice(0, 14),
      subtitle: stripInlineMarkdown(it.text && !it.text.includes('；') ? it.text : '').slice(0, 56),
      features,
      recommended,
    }
  })
}

function renderPricingPptx(slide, ctx) {
  const { theme, langAttr, chromeCfg, nextId, bodyTopY, bodyH, cardMaterial = 'solid' } = ctx
  const tk = theme.tokens
  const tiers = computePricingModel(slide)
  const cols = tiers.length
  const gap = 0.24
  const totalW = 12.09
  const cardW = (totalW - gap * Math.max(0, cols - 1)) / Math.max(1, cols)
  let xml = ''

  tiers.forEach((tier, idx) => {
    const cx = 0.62 + idx * (cardW + gap)
    const cy = bodyTopY + (tier.recommended ? 0 : 0.12)
    const ch = bodyH - (tier.recommended ? 0 : 0.12)

    xml += renderSurfaceCardPptx(`Pricing Card ${idx + 1}`, { x: cx, y: cy, w: cardW, h: ch }, {
      focal: tier.recommended,
      cardMaterial,
      paragraphs: [],
    }, nextId, chromeCfg, theme)

    if (tier.recommended) {
      xml += ooxmlShape(nextId(), `Pricing Accent Top ${idx + 1}`, { x: cx, y: cy, w: cardW, h: 0.08 }, { preset: 'rect', fill: theme.palette.accent })
    }

    const badgeFill = tier.recommended ? theme.palette.accent : tk.surface2
    const badgeInk = tier.recommended ? contrastInkOn(badgeFill) : tk.accentText
    xml += ooxmlShape(nextId(), `Pricing Tag ${idx + 1}`, { x: cx + 0.22, y: cy + 0.24, w: Math.min(cardW - 0.44, 1.85), h: 0.3 }, {
      preset: 'roundRect',
      adj: 40000,
      fill: badgeFill,
      anchor: 'ctr',
      marginsIn: { l: 0.08, r: 0.08, t: 0.02, b: 0.02 },
      paragraphs: [ooxmlRichParagraph(tier.tag, { sizePt: 9.5, bold: true, color: badgeInk, align: 'ctr', lang: langAttr, font: theme.fonts.body })],
    })

    const priceRuns = [{ text: tier.price, bold: true }]
    if (tier.unit) {
      const unitPrefix = tier.unit.startsWith('/') ? '' : ' '
      priceRuns.push({ text: unitPrefix + tier.unit, bold: false, sizePt: 13.5, secondary: true })
    }
    const headParas = [
      ooxmlRichParagraph(tier.title, { sizePt: 17, bold: true, color: tk.inkPrimary, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 4 }),
      ooxmlRichParagraph(priceRuns, {
        sizePt: 25,
        bold: false,
        color: tier.recommended ? theme.palette.accent : tk.inkPrimary,
        secondaryColor: tk.inkMuted,
        lang: langAttr,
        font: theme.fonts.heading,
        spaceAfterPt: 4,
      }),
      ...(tier.subtitle ? [ooxmlRichParagraph(tier.subtitle, { sizePt: 11, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body })] : []),
    ]
    xml += ooxmlShape(nextId(), `Pricing Head ${idx + 1}`, { x: cx + 0.22, y: cy + 0.64, w: cardW - 0.44, h: 1.44 }, {
      txBox: true,
      anchor: 't',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: headParas,
    })

    const divY = cy + 2.16
    xml += ooxmlLine(nextId(), `Pricing Rule ${idx + 1}`, { x: cx + 0.22, y: divY }, { x: cx + cardW - 0.22, y: divY }, { color: tk.hairline, widthPt: 1 })

    if (tier.features.length > 0) {
      const featParas = tier.features.map((f) =>
        ooxmlRichParagraph(f.label, {
          sizePt: 12,
          color: f.included ? tk.inkPrimary : tk.inkMuted,
          bullet: true,
          bulletChar: f.included ? '✓' : '×',
          bulletColor: f.included ? (tk.positive || '#0D7A4E') : tk.inkMuted,
          lang: langAttr,
          font: theme.fonts.body,
          spaceAfterPt: 6,
          lineHeight: 1.25,
        })
      )
      xml += ooxmlShape(nextId(), `Pricing Features ${idx + 1}`, { x: cx + 0.22, y: divY + 0.16, w: cardW - 0.44, h: Math.max(0.8, cy + ch - divY - 0.28) }, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: featParas,
      })
    }
  })

  return xml
}

function renderPricingHtml(slide) {
  const tiers = computePricingModel(slide)
  return (
    '<div class="layout-grid pricing-grid cols-' + tiers.length + '">' +
    tiers.map((t) =>
      '<article class="surface-card pricing-card' + (t.recommended ? ' is-recommended is-focal' : '') + '" data-item-index="' + t.index + '">' +
      '<span class="pricing-badge">' + escapeHtml(t.tag) + '</span>' +
      '<h3 class="card-title">' + renderInlineHtml(t.title) + '</h3>' +
      '<div class="pricing-anchor"><span class="pricing-val">' + escapeHtml(t.price) + '</span>' +
      (t.unit ? '<small class="pricing-unit">' + escapeHtml(t.unit) + '</small>' : '') +
      '</div>' +
      (t.subtitle ? '<div class="card-body">' + renderInlineHtml(t.subtitle) + '</div>' : '') +
      '<div class="pricing-rule"></div>' +
      '<ul class="pricing-features">' +
      t.features.map((f) => '<li class="' + (f.included ? 'is-inc' : 'is-exc') + '"><span>' + (f.included ? '✓' : '✗') + '</span>' + renderInlineHtml(f.label) + '</li>').join('') +
      '</ul></article>',
    ).join('') +
    '</div>'
  )
}

// ---------------------------------------------------------------------------
// Dispatch Entrypoints & CSS
// ---------------------------------------------------------------------------

export function renderExecChartSlideBodyPptx(slide, ctx) {
  const layout = slide.layout
  if (layout === 'issue-tree') return renderIssueTreePptx(slide, ctx)
  if (layout === 'treemap') return renderTreemapPptx(slide, ctx)
  if (layout === 'gauge') return renderGaugePptx(slide, ctx)
  if (layout === 'pricing') return renderPricingPptx(slide, ctx)
  return null
}

export function renderExecChartSlideBodyHtml(slide, ctx) {
  const layout = slide.layout
  if (layout === 'issue-tree') return renderIssueTreeHtml(slide)
  if (layout === 'treemap') return renderTreemapHtml(slide, ctx?.theme)
  if (layout === 'gauge') return renderGaugeHtml(slide, ctx?.langId === 'en')
  if (layout === 'pricing') return renderPricingHtml(slide)
  return null
}

export const EXEC_CHARTS_CSS = `
.itree-board{display:grid;grid-template-columns:22% 1fr;gap:clamp(18px,2.2vw,30px);align-items:center;width:100%}
.itree-root{background:var(--accent);color:var(--ink-on-accent);border-radius:var(--radius);padding:clamp(18px,2.2vw,28px);display:flex;flex-direction:column;gap:8px;box-shadow:0 10px 26px rgba(0,0,0,.14)}
.itree-root-tag{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.85}
.itree-root-title{font-family:var(--font-heading);font-size:clamp(17px,1.7vw,24px);font-weight:800;line-height:1.25}
.itree-branches{display:flex;flex-direction:column;gap:clamp(10px,1.3vw,16px)}
.itree-row{display:grid;grid-template-columns:34% 1fr;gap:clamp(14px,1.8vw,24px);align-items:center}
.itree-branch{padding:clamp(12px,1.4vw,18px);border-left:4px solid var(--accent);position:relative}
.itree-tag{font-size:11px;font-weight:700;color:var(--accent-text);letter-spacing:.08em}
.itree-branch-title{font-family:var(--font-heading);font-size:clamp(15px,1.45vw,20px);font-weight:700;color:var(--fg)}
.itree-leaves{display:flex;flex-direction:column;gap:8px}
.itree-leaf{background:var(--surface1);border:1px solid var(--hairline);border-radius:calc(var(--radius) * .8);padding:9px 14px;font-size:clamp(13px,1.2vw,17px);line-height:1.35;color:var(--fg)}
.treemap-wrap{width:100%;display:flex;align-items:center;justify-content:center}
.treemap-svg{width:100%;max-height:58vh;display:block}
.gauge-board{display:flex;flex-direction:column;gap:clamp(10px,1.3vw,16px);width:100%}
.gauge-row{display:grid;grid-template-columns:27% 1fr 16%;gap:clamp(12px,1.6vw,22px);align-items:center;padding:clamp(12px,1.5vw,20px)}
.gauge-sub{font-size:clamp(12px,1.05vw,14px);color:var(--muted);margin-top:2px}
.gauge-track-wrap{position:relative;padding:8px 0 18px}
.gauge-track{position:relative;height:26px;border-radius:6px;background:color-mix(in srgb,var(--hairline) 32%,var(--bg));overflow:visible;border:1px solid var(--hairline)}
.gauge-band{position:absolute;top:0;bottom:0;left:0;border-radius:5px 0 0 5px}
.gauge-band.b1{background:color-mix(in srgb,var(--hairline) 75%,var(--bg))}
.gauge-band.b2{background:color-mix(in srgb,var(--hairline) 48%,var(--bg))}
.gauge-actual{position:absolute;top:6px;bottom:6px;left:0;border-radius:3px;background:var(--accent);z-index:2}
.gauge-actual.tone-positive{background:var(--positive)}.gauge-actual.tone-warning{background:var(--warning)}.gauge-actual.tone-negative{background:var(--negative)}
.gauge-target{position:absolute;top:-3px;bottom:-3px;width:3.5px;background:var(--fg);transform:translateX(-50%);z-index:3;border-radius:2px}
.gauge-tgt-lbl{position:absolute;bottom:0;transform:translateX(-50%);font-size:11px;color:var(--muted);white-space:nowrap}
.gauge-readout{text-align:right;display:flex;flex-direction:column;gap:2px}
.gauge-readout strong{font-family:var(--font-heading);font-size:clamp(20px,2vw,28px);font-weight:800;font-variant-numeric:tabular-nums}
.gauge-readout strong.tone-positive{color:var(--positive)}.gauge-readout strong.tone-warning{color:var(--warning)}.gauge-readout strong.tone-negative{color:var(--negative)}.gauge-readout strong.tone-accent{color:var(--accent-text)}
.gauge-readout span{font-size:12px;font-weight:600;color:var(--muted)}
.pricing-grid{align-items:stretch}
.pricing-card{padding:clamp(18px,2.1vw,28px);gap:10px;position:relative}
.pricing-card.is-recommended{border:2px solid var(--accent);box-shadow:0 14px 32px rgba(0,0,0,.1);transform:translateY(-4px)}
.pricing-badge{display:inline-flex;align-self:flex-start;padding:3px 11px;border-radius:99px;font-size:11px;font-weight:700;background:var(--surface2);color:var(--accent-text);letter-spacing:.06em}
.pricing-card.is-recommended .pricing-badge{background:var(--accent);color:var(--ink-on-accent)}
.pricing-anchor{display:flex;align-items:baseline;gap:6px;margin:4px 0}
.pricing-val{font-family:var(--font-heading);font-size:clamp(26px,3vw,42px);font-weight:800;color:var(--fg);font-variant-numeric:tabular-nums}
.pricing-card.is-recommended .pricing-val{color:var(--accent-text)}
.pricing-unit{font-size:14px;color:var(--muted);font-weight:600}
.pricing-rule{height:1px;background:var(--hairline);margin:4px 0}
.pricing-features{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:clamp(13px,1.25vw,17px);line-height:1.4}
.pricing-features li{display:flex;gap:8px;align-items:flex-start}
.pricing-features li.is-inc span{color:var(--positive);font-weight:800}
.pricing-features li.is-exc{color:var(--muted);text-decoration:line-through;opacity:.72}
.pricing-features li.is-exc span{color:var(--muted);font-weight:700}
@media (max-width:900px){.itree-board,.itree-row,.gauge-row{grid-template-columns:1fr}}
`

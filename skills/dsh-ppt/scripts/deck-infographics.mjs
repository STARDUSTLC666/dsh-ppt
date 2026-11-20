/**
 * deck-infographics.mjs —— dsh-ppt 视觉信息图与智能配图协作引擎（零外部依赖）。
 *
 * 100% 原生可编辑 PowerPoint DrawingML（<p:sp> / <a:custGeom>）+ HTML SVG 双端同构：
 *   1. map（战略热力点阵地图：world 全球点阵版 / china 中国经济带枢纽点阵版 + 右侧区域排行侧栏）
 *   2. isometric（2.5D 等轴测矢量信息图：stack 分层架构堆叠 / pillars 3D 立体柱碑对比）
 *   3. generateVisualBrief / normalizeImageBrief（主题自适应智能配图协作 Brief 与视觉蓝图占位卡）
 */

import { relativeLuminance, mixHex } from './deck-themes.mjs'
import {
  roundRectAdj,
  escapeXml,
  escapeHtml,
  stripInlineMarkdown,
  renderInlineHtml,
  resolveEffectiveItems,
  computeTextFit,
  ooxmlRichParagraph,
  ooxmlShape,
  ooxmlCustGeomShape,
  ooxmlLine,
  computeBadgePillWidth,
  renderSurfaceCardPptx,
} from './deck-chrome.mjs'

export const INFOGRAPHIC_LAYOUTS = new Set(['map', 'isometric'])

function parseNum(raw, fallback = NaN) {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const cleaned = String(raw ?? '').replace(/[,，%％$¥€£\s]/g, '').replace(/[+＋]/g, '')
  const m = /-?\d+(?:\.\d+)?/.exec(cleaned)
  return m ? Number(m[0]) : fallback
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function contrastInk(bgHex, lightInk = '#FFFFFF', darkInk = '#0F172A') {
  return relativeLuminance(bgHex) < 0.36 ? lightInk : darkInk
}

function buildPolygonPathXml(pts, pathW, pathH) {
  if (!pts || pts.length < 3) return ''
  const toP = ([nx, ny]) => `x="${Math.round(clamp(nx, 0, 1) * pathW)}" y="${Math.round(clamp(ny, 0, 1) * pathH)}"`
  const segs = [`<a:moveTo><a:pt ${toP(pts[0])}/></a:moveTo>`]
  for (let i = 1; i < pts.length; i += 1) {
    segs.push(`<a:lnTo><a:pt ${toP(pts[i])}/></a:lnTo>`)
  }
  segs.push('<a:close/>')
  return segs.join('')
}

function renderCustomPolyPptx(id, name, absPts, options = {}) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of absPts) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  const w = Math.max(0.02, maxX - minX)
  const h = Math.max(0.02, maxY - minY)
  const norm = absPts.map(([x, y]) => [(x - minX) / w, (y - minY) / h])
  const pathW = 10000
  const pathH = 10000
  return ooxmlCustGeomShape(id, name, { x: minX, y: minY, w, h }, buildPolygonPathXml(norm, pathW, pathH), {
    pathW,
    pathH,
    ...options,
  })
}

// ---------------------------------------------------------------------------
// 1. 战略点阵地图（World & China Economic Hub Dot-Matrix Maps）
// ---------------------------------------------------------------------------

// 36 x 18 Economist-style dotted world silhouette (row -> column indices)
const WORLD_ROWS = [
  [11, 12, 13], // Greenland top
  [4, 5, 6, 7, 8, 11, 12, 13, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30], // Arctic NA / Scand / Siberia
  [3, 4, 5, 6, 7, 8, 9, 10, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
  [4, 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  [5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31], // US / EU / China / Japan
  [5, 6, 7, 8, 9, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31],
  [6, 7, 8, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29], // Mexico / N Africa / ME / China
  [7, 8, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29], // C America / Sahara / India / SE Asia
  [8, 9, 14, 15, 16, 17, 18, 19, 20, 24, 25, 27, 28, 30], // N SA / W Africa / India / Indochina / PH
  [9, 10, 11, 15, 16, 17, 18, 19, 20, 24, 28, 29], // Brazil / Central Africa
  [9, 10, 11, 12, 16, 17, 18, 19, 20, 28, 29, 30, 31], // Brazil / E Africa / Indonesia
  [10, 11, 12, 17, 18, 19, 20, 29, 30, 31, 32], // S America / S Africa / N Australia
  [10, 11, 12, 17, 18, 19, 21, 28, 29, 30, 31, 32], // S America / S Africa / Madagascar / Australia
  [10, 11, 17, 18, 19, 29, 30, 31, 32], // Argentina / S Africa / Australia
  [10, 11, 18, 30, 31, 33], // Patagonia / NZ
  [10, 33], // Southern tip
]
const WORLD_DOTS = WORLD_ROWS.flatMap((cols, r) => cols.map((c) => [c / 35, (r + 0.6) / 16.5]))

// 26 x 20 stylized China economic-zone dotted landmass (incl. NE, NW, SW, Central, East, South, Hainan & Taiwan)
const CHINA_ROWS = [
  [19, 20, 21], // Heilongjiang N
  [17, 18, 19, 20, 21, 22],
  [16, 17, 18, 19, 20, 21, 22], // NE / Inner Mongolia
  [4, 5, 6, 14, 15, 16, 17, 18, 19, 20, 21], // N Xinjiang / Inner Mongolia / Liaoning
  [2, 3, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 19, 20], // Xinjiang / Gansu / Beijing-Tianjin
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], // Hebei / Shandong
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // Qinghai / Shaanxi / Henan / Jiangsu
  [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], // Tibet / Sichuan / Hubei / Shanghai
  [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21], // Tibet / Chongqing / Zhejiang
  [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // Yunnan / Guizhou / Hunan / Jiangxi / Fujian
  [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], // Yunnan / Guangxi / Guangdong / Fujian
  [10, 11, 12, 13, 14, 15, 16, 17, 18, 20], // Guangxi / Guangdong / Taiwan
  [11, 12, 13, 14, 15, 16, 17, 20], // GBA / Taiwan
  [13, 14], // Hainan
]
const CHINA_DOTS = CHINA_ROWS.flatMap((cols, r) => cols.map((c) => [(c + 0.8) / 24.5, (r + 0.8) / 17]))

const WORLD_HUBS = [
  { re: /拉美|南美|巴西|墨西哥|latam|latin\s*america|south\s*america|brazil|mexico/i, x: 30, y: 68 },
  { re: /北美|北美洲|美国|加拿大|north\s*america|\busa?\b|\bcanada\b|\bna\b/i, x: 20, y: 31 },
  { re: /欧洲|欧盟|英法德|西欧|europe|\beu\b|\bemea\b|\buk\b|germany|france/i, x: 51, y: 25 },
  { re: /中国|大中华|大陆|华东|china|greater\s*china|\bcn\b/i, x: 78, y: 37 },
  { re: /亚太|亚洲|apac|asia/i, x: 80, y: 46 },
  { re: /日韩|日本|韩国|东亚|japan|korea|\bjp\b|\bkr\b/i, x: 89, y: 34 },
  { re: /东南亚|东盟|新加坡|asean|sea|southeast\s*asia|singapore/i, x: 81, y: 58 },
  { re: /印度|南亚|india|south\s*asia/i, x: 70, y: 47 },
  { re: /中东|非洲|中东非|沙特|阿联酋|middle\s*east|africa|\bmea\b|\bmena\b|dubai|uae/i, x: 56, y: 53 },
  { re: /大洋洲|澳洲|澳大利亚|澳新|australia|oceania|\banz\b|new\s*zealand/i, x: 87, y: 78 },
]

const CHINA_HUBS = [
  { re: /华北|京津冀|北京|天津|河北|north\s*china|beijing|tianjin/i, x: 70, y: 33 },
  { re: /华东|长三角|上海|杭州|南京|苏州|浙江|江苏|east\s*china|shanghai|hangzhou/i, x: 84, y: 55 },
  { re: /华南|粤港澳|大湾区|深圳|广州|广东|福建|south\s*china|shenzhen|guangzhou|\bgba\b/i, x: 71, y: 81 },
  { re: /西南|成渝|成都|重庆|四川|云南|贵州|southwest|chengdu|chongqing/i, x: 46, y: 63 },
  { re: /华中|武汉|长沙|郑州|湖北|湖南|河南|central\s*china|wuhan|changsha/i, x: 64, y: 58 },
  { re: /东北|沈阳|大连|哈尔滨|长春|辽宁|吉林|黑龙江|northeast|shenyang|dalian/i, x: 82, y: 19 },
  { re: /西北|西安|陕西|新疆|甘肃|青海|northwest|xian|xi'an|xinjiang/i, x: 41, y: 45 },
  { re: /港澳台|香港|澳门|台湾|台北|hong\s*kong|taipei|taiwan/i, x: 83, y: 82 },
]

function detectMapMode(slide, items) {
  const v = String(slide?.variant || '').trim().toLowerCase()
  if (v === 'china' || v === 'cn') return 'china'
  if (v === 'world' || v === 'global') return 'world'
  const textPool = [slide?.title, slide?.subtitle, ...items.map((it) => `${it.title || ''} ${it.tag || ''}`)].join(' ')
  const chinaHits = CHINA_HUBS.filter((h) => h.re.test(textPool)).length
  const worldHits = WORLD_HUBS.filter((h) => h.re.test(textPool)).length
  if (chinaHits >= 2 && worldHits <= 1) return 'china'
  return 'world'
}

export function computeMapModel(slide, langEn = false) {
  let rawItems = resolveEffectiveItems(slide)
  if (rawItems.length === 0 && Array.isArray(slide?.rows) && slide.rows.length >= 2) {
    rawItems = slide.rows.slice(1).map((r) => ({
      title: stripInlineMarkdown(r[0] || ''),
      value: String(r[1] ?? '').trim(),
      delta: String(r[2] ?? '').trim(),
      text: stripInlineMarkdown(r[3] || ''),
    })).filter((it) => it.title)
  }

  if (rawItems.length === 0) {
    rawItems = langEn
      ? [
          { title: 'North America', value: '$48M', delta: '+28%', status: 'accent', text: 'Enterprise flagship region' },
          { title: 'APAC', value: '$36M', delta: '+44%', status: 'positive', text: 'Fastest YoY expansion' },
          { title: 'Europe', value: '$29M', delta: '+19%', status: 'neutral', text: 'DACH & UK compliance wins' },
          { title: 'MEA', value: '$14M', delta: '+32%', status: 'neutral', text: 'Sovereign cloud partnerships' },
          { title: 'LATAM', value: '$11M', delta: '+21%', status: 'neutral', text: 'Fintech channel rollout' },
        ]
      : [
          { title: '北美区', value: '$48M', delta: '+28%', status: 'accent', text: '企业级大客户主力市场' },
          { title: '亚太区', value: '$36M', delta: '+44%', status: 'positive', text: '增速最快的高潜增量引擎' },
          { title: '欧洲区', value: '$29M', delta: '+19%', status: 'neutral', text: '合规认证驱动稳健交付' },
          { title: '中东非', value: '$14M', delta: '+32%', status: 'neutral', text: '主权云标杆项目落地' },
          { title: '拉美区', value: '$11M', delta: '+21%', status: 'neutral', text: '金融科技渠道加速渗透' },
        ]
  }

  const mode = detectMapMode(slide, rawItems)
  const hubs = mode === 'china' ? CHINA_HUBS : WORLD_HUBS
  const fallbackCoords = mode === 'china'
    ? [[81, 58], [71, 80], [70, 35], [51, 63], [67, 60], [82, 20], [43, 46]]
    : [[21, 31], [79, 45], [51, 26], [56, 50], [31, 66], [87, 78]]

  const parsed = rawItems.slice(0, 7).map((it, idx) => {
    const label = stripInlineMarkdown(it.title || it.tag || `Region ${idx + 1}`)
    const valStr = String(it.value ?? '').trim()
    const numVal = parseNum(valStr || it.text || it.delta, NaN)
    const matchedHub = hubs.find((h) => h.re.test(`${label} ${it.tag || ''}`))
    const explicitX = parseNum(it.x, NaN)
    const explicitY = parseNum(it.y, NaN)
    const fb = fallbackCoords[idx % fallbackCoords.length]
    const x = Number.isFinite(explicitX) ? clamp(explicitX, 6, 94) : (matchedHub ? matchedHub.x : fb[0])
    const y = Number.isFinite(explicitY) ? clamp(explicitY, 8, 90) : (matchedHub ? matchedHub.y : fb[1])
    return {
      title: label,
      tag: stripInlineMarkdown(it.tag || ''),
      value: valStr || (Number.isFinite(numVal) ? String(numVal) : ''),
      numericVal: Number.isFinite(numVal) ? Math.max(0, numVal) : (rawItems.length - idx) * 10,
      delta: stripInlineMarkdown(it.delta || ''),
      text: stripInlineMarkdown(it.text || ''),
      status: it.status || '',
      x,
      y,
      rawIndex: idx,
    }
  })

  const maxVal = Math.max(1, ...parsed.map((p) => p.numericVal))
  const totalVal = parsed.reduce((s, p) => s + Math.max(0, p.numericVal), 0) || 1
  const ranked = [...parsed].sort((a, b) => b.numericVal - a.numericVal)
  const focalItem = ranked.find((p) => p.status === 'accent') || ranked[0]

  const regions = ranked.map((p, rankIdx) => ({
    ...p,
    rank: rankIdx + 1,
    ratio: clamp(p.numericVal / maxVal, 0.14, 1),
    sharePct: Math.round((p.numericVal / totalVal) * 100),
    isFocal: p === focalItem,
    radiusNorm: 0.35 + 0.65 * Math.sqrt(clamp(p.numericVal / maxVal, 0.1, 1)),
  }))

  return {
    mode,
    dots: mode === 'china' ? CHINA_DOTS : WORLD_DOTS,
    regions,
    focal: regions.find((r) => r.isFocal) || regions[0],
  }
}

function resolveRegionColors(regions, tk) {
  return regions.map((r) => {
    if (r.isFocal || r.status === 'accent') return tk.accentPrimary
    if (r.status === 'positive') return tk.positive
    if (r.status === 'warning') return tk.warning
    if (r.status === 'negative') return tk.negative
    return tk.accentSecondary || mixHex(tk.accentPrimary, tk.inkMuted, 0.35)
  })
}

function placeMapBadges(regions, mapBox) {
  const placed = []
  const hubCenters = regions.map((r) => ({
    cx: mapBox.x + (r.x / 100) * mapBox.w,
    cy: mapBox.y + (r.y / 100) * mapBox.h,
    rad: (0.28 + 0.30 * r.radiusNorm) / 2 + 0.04,
  }))
  return regions.map((r, idx) => {
    const { cx, cy } = hubCenters[idx]
    const labelText = r.value ? `${r.title} · ${r.value}` : r.title
    const bw = computeBadgePillWidth(labelText, 9.5, 2.05, 0.95)
    const bh = 0.25
    const candidates = [
      { bx: cx - bw / 2, by: cy - 0.50 },
      { bx: cx - bw / 2, by: cy + 0.28 },
      { bx: cx + 0.30, by: cy - bh / 2 },
      { bx: cx - bw - 0.30, by: cy - bh / 2 },
      { bx: cx + 0.26, by: cy - 0.48 },
      { bx: cx - bw - 0.26, by: cy + 0.28 },
      { bx: cx - bw - 0.26, by: cy - 0.48 },
      { bx: cx + 0.26, by: cy + 0.28 },
    ]
    let chosen = null
    for (const c of candidates) {
      const bx = clamp(c.bx, mapBox.x + 0.08, mapBox.x + mapBox.w - bw - 0.08)
      const by = clamp(c.by, mapBox.y + 0.08, mapBox.y + mapBox.h - bh - 0.08)
      const hitBadge = placed.some((p) => !(bx + bw + 0.06 < p.bx || bx > p.bx + p.bw + 0.06 || by + bh + 0.05 < p.by || by > p.by + p.bh + 0.05))
      const hitHub = hubCenters.some((h) => !(bx + bw + 0.02 < h.cx - h.rad || bx - 0.02 > h.cx + h.rad || by + bh + 0.02 < h.cy - h.rad || by - 0.02 > h.cy + h.rad))
      if (!hitBadge && !hitHub) {
        chosen = { bx, by }
        break
      }
      if (!chosen && !hitBadge) chosen = { bx, by }
    }
    if (!chosen) {
      chosen = {
        bx: clamp(cx - bw / 2, mapBox.x + 0.08, mapBox.x + mapBox.w - bw - 0.08),
        by: clamp(cy - 0.50, mapBox.y + 0.08, mapBox.y + mapBox.h - bh - 0.08),
      }
    }
    placed.push({ bx: chosen.bx, by: chosen.by, bw, bh })
    return { ...r, cx, cy, bx: chosen.bx, by: chosen.by, bw, bh, labelText }
  })
}

function renderMapPptx(slide, ctx) {
  const { theme, langAttr, chromeCfg, nextId, bodyTopY, bodyH } = ctx
  const tk = theme.tokens
  const langEn = langAttr === 'en-US'
  const model = computeMapModel(slide, langEn)
  const colors = resolveRegionColors(model.regions, tk)
  const shapes = []

  const mapBox = { x: 0.62, y: bodyTopY + 0.06, w: 7.62, h: bodyH - 0.14 }
  const sideBox = { x: 8.48, y: bodyTopY + 0.06, w: 4.23, h: bodyH - 0.14 }
  const cardPreset = chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect'

  // Left map card container
  shapes.push(renderSurfaceCardPptx('Map Canvas', mapBox, { fill: tk.surface1 }, nextId, chromeCfg, theme))

  // Top-left subtle map mode tag
  const modeTag = model.mode === 'china'
    ? (langEn ? 'CHINA REGIONAL HUBS' : '中国区域经济枢纽分布')
    : (langEn ? 'GLOBAL STRATEGIC FOOTPRINT' : '全球战略布局热力图')
  shapes.push(ooxmlShape(nextId(), 'Map Mode Badge', { x: mapBox.x + 0.18, y: mapBox.y + 0.12, w: 2.8, h: 0.24 }, {
    txBox: true,
    anchor: 'ctr',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    paragraphs: [ooxmlRichParagraph(modeTag, { sizePt: 9, color: tk.inkMuted, bold: true, lang: langAttr, font: theme.fonts.body, spc: 120 })],
  }))

  // Dotted landmass silhouette (inset inside mapBox)
  const padX = 0.34, padTop = 0.44, padBot = 0.28
  const plotW = mapBox.w - padX * 2
  const plotH = mapBox.h - padTop - padBot
  const dotSize = model.mode === 'china' ? 0.11 : 0.095
  const dotColor = theme.dark ? mixHex(tk.inkMuted, tk.surface2, 0.35) : mixHex(tk.hairline, tk.inkMuted, 0.32)
  for (let i = 0; i < model.dots.length; i += 1) {
    const [nx, ny] = model.dots[i]
    const dx = mapBox.x + padX + nx * plotW - dotSize / 2
    const dy = mapBox.y + padTop + ny * plotH - dotSize / 2
    shapes.push(ooxmlShape(nextId(), `Map Dot ${i}`, { x: dx, y: dy, w: dotSize, h: dotSize }, {
      preset: 'ellipse',
      fill: dotColor,
      fillAlpha: theme.dark ? 0.42 : 0.58,
    }))
  }

  // Place hub hotspots inside plot region
  const plotBox = { x: mapBox.x + padX, y: mapBox.y + padTop, w: plotW, h: plotH }
  const placed = placeMapBadges(model.regions, plotBox)
  const focalPlaced = placed.find((p) => p.isFocal) || placed[0]

  // Subtle dashed network links from focal hub to secondary hubs
  placed.forEach((p, idx) => {
    if (p === focalPlaced) return
    shapes.push(ooxmlLine(nextId(), `Map Link ${idx}`, { x: focalPlaced.cx, y: focalPlaced.cy }, { x: p.cx, y: p.cy }, {
      color: tk.accentPrimary,
      widthPt: 0.75,
      dash: 'dash',
    }))
  })

  // Render outer halo + inner dot + callout badge
  placed.forEach((p, idx) => {
    const col = colors[idx]
    const outerD = 0.28 + 0.30 * p.radiusNorm
    const innerD = 0.13 + 0.11 * p.radiusNorm
    shapes.push(ooxmlShape(nextId(), `Map Halo ${idx + 1}`, { x: p.cx - outerD / 2, y: p.cy - outerD / 2, w: outerD, h: outerD }, {
      preset: 'ellipse',
      fill: col,
      fillAlpha: 0.22,
      stroke: col,
      strokeAlpha: 0.45,
      strokePt: 0.75,
    }))
    shapes.push(ooxmlShape(nextId(), `Map Hub ${idx + 1}`, { x: p.cx - innerD / 2, y: p.cy - innerD / 2, w: innerD, h: innerD }, {
      preset: 'ellipse',
      fill: col,
      stroke: theme.dark ? tk.canvas : '#FFFFFF',
      strokePt: 1.25,
    }))
    shapes.push(ooxmlShape(nextId(), `Map Tag ${idx + 1}`, { x: p.bx, y: p.by, w: p.bw, h: p.bh }, {
      preset: 'roundRect',
      adj: 50000,
      fill: p.isFocal ? col : (theme.dark ? tk.surface2 : '#FFFFFF'),
      stroke: col,
      strokePt: p.isFocal ? 0 : 0.9,
      anchor: 'ctr',
      marginsIn: { l: 0.05, r: 0.05, t: 0.01, b: 0.01 },
      paragraphs: [
        ooxmlRichParagraph(p.labelText, {
          sizePt: 9.5,
          color: p.isFocal ? contrastInk(col) : tk.inkPrimary,
          bold: true,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.body,
        }),
      ],
    }))
  })

  // Right sidecar: Ranked Regional Breakdown cards
  const shown = model.regions.slice(0, 6)
  const gap = 0.12
  const rowH = Math.min(0.86, (sideBox.h - gap * Math.max(0, shown.length - 1)) / Math.max(1, shown.length))
  const startY = sideBox.y + Math.max(0, (sideBox.h - (rowH * shown.length + gap * Math.max(0, shown.length - 1))) / 2)

  shown.forEach((r, idx) => {
    const col = colors[idx]
    const ry = startY + idx * (rowH + gap)
    const rBox = { x: sideBox.x, y: ry, w: sideBox.w, h: rowH }
    shapes.push(renderSurfaceCardPptx(`Map Rank Card ${idx + 1}`, rBox, {
      fill: r.isFocal ? tk.accentSoft : tk.surface1,
      focal: r.isFocal,
    }, nextId, chromeCfg, theme))

    // Rank pill
    shapes.push(ooxmlShape(nextId(), `Rank Num ${idx + 1}`, { x: rBox.x + 0.14, y: ry + 0.09, w: 0.34, h: 0.22 }, {
      preset: cardPreset,
      adj: roundRectAdj(0.34, 0.22, 4),
      fill: r.isFocal ? col : tk.surface2,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(String(r.rank).padStart(2, '0'), { sizePt: 9.5, color: r.isFocal ? contrastInk(col) : tk.inkMuted, bold: true, align: 'ctr', font: theme.fonts.body })],
    }))

    // Region name
    shapes.push(ooxmlShape(nextId(), `Region Name ${idx + 1}`, { x: rBox.x + 0.54, y: ry + 0.07, w: 1.75, h: 0.26 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(r.title, { sizePt: 12.5, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading })],
    }))

    // Value + delta right-aligned
    const valLine = [r.value, r.delta].filter(Boolean).join('  ')
    shapes.push(ooxmlShape(nextId(), `Region Val ${idx + 1}`, { x: rBox.x + 2.28, y: ry + 0.07, w: rBox.w - 2.42, h: 0.26 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(valLine || `${r.sharePct}%`, { sizePt: 12, color: r.isFocal ? tk.accentText : col, bold: true, align: 'r', lang: langAttr, font: theme.fonts.heading })],
    }))

    // Proportional bar track + fill
    const barX = rBox.x + 0.14
    const barW = rBox.w - 0.28
    const showNote = rowH >= 0.72 && Boolean(r.text)
    const barY = ry + (showNote ? 0.38 : rowH - 0.18)
    shapes.push(ooxmlShape(nextId(), `Bar Track ${idx + 1}`, { x: barX, y: barY, w: barW, h: 0.075 }, {
      preset: 'roundRect',
      adj: 50000,
      fill: tk.hairline,
      fillAlpha: 0.55,
    }))
    shapes.push(ooxmlShape(nextId(), `Bar Fill ${idx + 1}`, { x: barX, y: barY, w: Math.max(0.18, barW * r.ratio), h: 0.075 }, {
      preset: 'roundRect',
      adj: 50000,
      fill: col,
    }))

    if (showNote) {
      shapes.push(ooxmlShape(nextId(), `Region Note ${idx + 1}`, { x: barX, y: barY + 0.11, w: barW, h: Math.max(0.20, rowH - (barY - ry) - 0.16) }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [ooxmlRichParagraph(r.text, { sizePt: 9.8, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body })],
      }))
    }
  })

  return shapes.join('')
}

function renderMapHtml(slide, ctx) {
  const { theme, langId } = ctx
  const tk = theme.tokens
  const langEn = langId === 'en'
  const model = computeMapModel(slide, langEn)
  const colors = resolveRegionColors(model.regions, tk)

  const vw = 760, vh = 460
  const padX = 36, padTop = 44, padBot = 28
  const pw = vw - padX * 2, ph = vh - padTop - padBot
  const dotR = model.mode === 'china' ? 5.2 : 4.4
  const dotColor = theme.dark ? mixHex(tk.inkMuted, tk.surface2, 0.35) : mixHex(tk.hairline, tk.inkMuted, 0.32)

  const dotsSvg = model.dots.map(([nx, ny]) =>
    `<circle cx="${(padX + nx * pw).toFixed(1)}" cy="${(padTop + ny * ph).toFixed(1)}" r="${dotR}" fill="${dotColor}" opacity="${theme.dark ? '0.45' : '0.6'}"/>`
  ).join('')

  const focal = model.focal
  const fx = padX + (focal.x / 100) * pw
  const fy = padTop + (focal.y / 100) * ph

  const linksSvg = model.regions.filter((r) => r !== focal).map((r) => {
    const rx = padX + (r.x / 100) * pw
    const ry = padTop + (r.y / 100) * ph
    return `<line x1="${fx.toFixed(1)}" y1="${fy.toFixed(1)}" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}" stroke="${tk.accentPrimary}" stroke-width="1.3" stroke-dasharray="5 4" opacity="0.55"/>`
  }).join('')

  const hubsSvg = model.regions.map((r, idx) => {
    const col = colors[idx]
    const rx = padX + (r.x / 100) * pw
    const ry = padTop + (r.y / 100) * ph
    const outerR = 14 + 15 * r.radiusNorm
    const innerR = 6.5 + 5 * r.radiusNorm
    const lbl = r.value ? `${r.title} · ${r.value}` : r.title
    const pillW = Math.min(188, Math.max(76, lbl.length * 10.5 + 22))
    const px = clamp(rx - pillW / 2, 10, vw - pillW - 10)
    const py = clamp(ry - outerR - 26, 26, vh - 30)
    const pillFill = r.isFocal ? col : (theme.dark ? tk.surface2 : '#FFFFFF')
    const pillInk = r.isFocal ? contrastInk(col) : tk.inkPrimary
    return (
      `<circle cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" r="${outerR.toFixed(1)}" fill="${col}" fill-opacity="0.22" stroke="${col}" stroke-opacity="0.48" stroke-width="1.4"/>` +
      `<circle cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" r="${innerR.toFixed(1)}" fill="${col}" stroke="${theme.dark ? tk.canvas : '#FFFFFF'}" stroke-width="2.2"/>` +
      `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pillW.toFixed(1)}" height="23" rx="11.5" fill="${pillFill}" stroke="${col}" stroke-width="${r.isFocal ? 0 : 1.2}"/>` +
      `<text x="${(px + pillW / 2).toFixed(1)}" y="${(py + 15.5).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${pillInk}">${escapeHtml(lbl)}</text>`
    )
  }).join('')

  const modeTag = model.mode === 'china'
    ? (langEn ? 'CHINA REGIONAL HUBS' : '中国区域经济枢纽分布')
    : (langEn ? 'GLOBAL STRATEGIC FOOTPRINT' : '全球战略布局热力图')

  const rankCards = model.regions.slice(0, 6).map((r, idx) => {
    const col = colors[idx]
    const valLine = [r.value, r.delta].filter(Boolean).join(' ')
    return (
      `<div class="surface-card map-rank-card${r.isFocal ? ' is-focal' : ''}" data-item-index="${r.rawIndex}">` +
      `<div class="map-rank-head">` +
      `<span class="map-rank-num" style="${r.isFocal ? `background:${col};color:${contrastInk(col)}` : ''}">${String(r.rank).padStart(2, '0')}</span>` +
      `<strong class="map-rank-name" data-item-field="title">${escapeHtml(r.title)}</strong>` +
      `<span class="map-rank-val" style="color:${r.isFocal ? 'var(--accent-text)' : col}">${escapeHtml(valLine || `${r.sharePct}%`)}</span>` +
      `</div>` +
      `<div class="map-bar-track"><div class="map-bar-fill" style="width:${Math.round(r.ratio * 100)}%;background:${col}"></div></div>` +
      (r.text ? `<div class="map-rank-note" data-item-field="text">${renderInlineHtml(r.text)}</div>` : '') +
      `</div>`
    )
  }).join('')

  return (
    `<div class="info-map-board">` +
    `<div class="surface-card info-map-canvas">` +
    `<div class="info-map-mode">${escapeHtml(modeTag)}</div>` +
    `<svg class="info-map-svg" viewBox="0 0 ${vw} ${vh}" role="img" aria-label="${escapeHtml(slide.title || modeTag)}">${dotsSvg}${linksSvg}${hubsSvg}</svg>` +
    `</div>` +
    `<div class="info-map-side">${rankCards}</div>` +
    `</div>`
  )
}

// ---------------------------------------------------------------------------
// 2. 2.5D 等轴测矢量信息图（Isometric Stack & Isometric 3D Pillars）
// ---------------------------------------------------------------------------

export function computeIsometricModel(slide, langEn = false) {
  const variant = String(slide?.variant || '').trim().toLowerCase() === 'pillars' ? 'pillars' : 'stack'
  let rawItems = resolveEffectiveItems(slide)
  if (rawItems.length === 0 && Array.isArray(slide?.rows) && slide.rows.length >= 2) {
    rawItems = slide.rows.slice(1).map((r) => ({
      title: stripInlineMarkdown(r[0] || ''),
      value: String(r[1] ?? '').trim(),
      text: stripInlineMarkdown(r[2] || ''),
      delta: String(r[3] ?? '').trim(),
    })).filter((it) => it.title)
  }
  if (rawItems.length === 0) {
    rawItems = variant === 'pillars'
      ? (langEn
          ? [
              { tag: 'Phase 1', title: 'Core Engine', value: '42', unit: 'pts', delta: 'Baseline' },
              { tag: 'Phase 2', title: 'Agent Layer', value: '68', unit: 'pts', delta: '+62%' },
              { tag: 'Phase 3', title: 'Enterprise Scale', value: '94', unit: 'pts', delta: '+124%', status: 'accent' },
            ]
          : [
              { tag: '阶段一', title: '基础底座', value: '42', unit: '分', delta: '基线能力' },
              { tag: '阶段二', title: '智能体协同', value: '68', unit: '分', delta: '+62%' },
              { tag: '阶段三', title: '企业级规模化', value: '94', unit: '分', delta: '+124%', status: 'accent' },
            ])
      : (langEn
          ? [
              { tag: 'L4 · Experience', title: 'Multi-Modal Copilot UI', text: 'Zero-friction workspace & live preview' },
              { tag: 'L3 · Orchestration', title: 'Deterministic Agent Runtime', text: 'Fact-checking, tool guardrails & self-repair' },
              { tag: 'L2 · Knowledge', title: 'Unified Evidence & Vector Graph', text: 'Primary citations, lineage & enterprise memory' },
              { tag: 'L1 · Infrastructure', title: 'High-Throughput Inference Mesh', text: 'Low-latency routing & multi-region resilience' },
            ]
          : [
              { tag: 'L4 · 体验层', title: '多端交互与实时预览工作台', text: '零门槛操控、在线精修与一键多格式交付' },
              { tag: 'L3 · 编排层', title: '确定性 Agent 调度与门禁引擎', text: '任务拆解、SLOP 质量自检修复与事实溯源' },
              { tag: 'L2 · 知识层', title: '企业证据账本与向量语义图谱', text: '一手出处绑定、口径一致性与领域范本沉淀' },
              { tag: 'L1 · 底座层', title: '高吞吐推理与安全隔离算力网', text: '多模型路由、低延迟并发与合规审计隔离' },
            ])
  }

  const maxCount = variant === 'pillars' ? 4 : 5
  const items = rawItems.slice(0, maxCount).map((it, idx) => {
    const valStr = String(it.value ?? '').trim()
    const numVal = parseNum(valStr, NaN)
    return {
      index: idx,
      tag: stripInlineMarkdown(it.tag || (variant === 'pillars' ? `0${idx + 1}` : `L${Math.min(maxCount, rawItems.length) - idx}`)),
      title: stripInlineMarkdown(it.title || it.text || `Layer ${idx + 1}`),
      text: stripInlineMarkdown(it.text || (Array.isArray(it.bullets) ? it.bullets.join(' · ') : '')),
      value: valStr,
      unit: stripInlineMarkdown(it.unit || ''),
      delta: stripInlineMarkdown(it.delta || ''),
      status: it.status || '',
      numericVal: numVal,
    }
  })

  const hasExplicitNums = items.some((it) => Number.isFinite(it.numericVal))
  const resolvedVals = items.map((it, idx) =>
    Number.isFinite(it.numericVal) ? Math.max(1, it.numericVal) : (idx + 1) * 28 + 20
  )
  const maxV = Math.max(1, ...resolvedVals)
  return {
    variant,
    hasExplicitNums,
    items: items.map((it, idx) => ({
      ...it,
      ratio: clamp(resolvedVals[idx] / maxV, 0.28, 1),
    })),
  }
}

function isometricLayerColors(count, tk, dark) {
  const palette = [
    tk.accentPrimary,
    tk.accentSecondary || mixHex(tk.accentPrimary, '#0E7490', 0.45),
    mixHex(tk.accentPrimary, tk.surface2 || '#CBD5E1', dark ? 0.35 : 0.45),
    mixHex(tk.accentSecondary || tk.accentPrimary, tk.surface2 || '#CBD5E1', dark ? 0.52 : 0.62),
    dark ? '#334155' : '#94A3B8',
  ]
  return Array.from({ length: count }, (_, idx) => {
    const top = palette[idx % palette.length]
    const left = mixHex(top, '#020617', 0.22)
    const right = mixHex(top, '#020617', 0.40)
    return { top, left, right }
  })
}

function renderIsometricStackPptx(slide, model, ctx) {
  const { theme, langAttr, chromeCfg, nextId, bodyTopY, bodyH } = ctx
  const tk = theme.tokens
  const shapes = []
  const items = model.items
  const n = items.length
  const colors = isometricLayerColors(n, tk, theme.dark)

  // Left 3D isometric stack stage: x 0.62 .. 6.75 (leave crisp left margin for layer badges!)
  const cx = 4.10
  const rx = 2.28
  const ry = Math.min(0.56, (bodyH * 0.24) / Math.max(1, n * 0.35))
  const thickness = n >= 5 ? 0.22 : 0.27
  const spanY = Math.max(0.65, bodyH - ry * 2 - thickness - 0.34)
  const stepY = n > 1 ? spanY / (n - 1) : 0
  const topCy = bodyTopY + ry + 0.14

  // Right explanation cards: x 7.12 .. 12.71
  const cardX = 7.12
  const cardW = 5.59
  const cardGap = 0.12
  const cardH = Math.min(1.06, (bodyH - 0.14 - cardGap * Math.max(0, n - 1)) / Math.max(1, n))
  const cardStartY = bodyTopY + Math.max(0.06, (bodyH - (cardH * n + cardGap * Math.max(0, n - 1))) / 2)

  // Draw slabs bottom-to-top so upper isometric layers overlap lower ones cleanly!
  for (let i = n - 1; i >= 0; i -= 1) {
    const it = items[i]
    const col = colors[i]
    const cy = topCy + i * stepY
    const pTop = [cx, cy - ry]
    const pRight = [cx + rx, cy]
    const pBot = [cx, cy + ry]
    const pLeft = [cx - rx, cy]
    const pLeftD = [cx - rx, cy + thickness]
    const pBotD = [cx, cy + ry + thickness]
    const pRightD = [cx + rx, cy + thickness]

    // Left shaded face
    shapes.push(renderCustomPolyPptx(nextId(), `Iso Slab Left ${i + 1}`, [pLeft, pBot, pBotD, pLeftD], {
      fill: col.left,
      stroke: theme.dark ? tk.canvas : '#FFFFFF',
      strokeAlpha: 0.35,
      strokePt: 0.5,
    }))
    // Right deeper shaded face
    shapes.push(renderCustomPolyPptx(nextId(), `Iso Slab Right ${i + 1}`, [pBot, pRight, pRightD, pBotD], {
      fill: col.right,
      stroke: theme.dark ? tk.canvas : '#FFFFFF',
      strokeAlpha: 0.35,
      strokePt: 0.5,
    }))
    // Top isometric diamond face
    shapes.push(renderCustomPolyPptx(nextId(), `Iso Slab Top ${i + 1}`, [pTop, pRight, pBot, pLeft], {
      fill: col.top,
      stroke: '#FFFFFF',
      strokeAlpha: 0.55,
      strokePt: 0.75,
    }))

    // Top slab shows full crisp label centered on its unobstructed face; all slabs get crisp non-occluded left index pills!
    const slabLabel = it.tag || it.title.slice(0, 12)
    if (i === 0) {
      shapes.push(ooxmlShape(nextId(), `Iso Face Label ${i + 1}`, { x: cx - rx * 0.62, y: cy - 0.18, w: rx * 1.24, h: 0.36 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(slabLabel, {
            sizePt: 11.5,
            color: contrastInk(col.top),
            bold: true,
            align: 'ctr',
            lang: langAttr,
            font: theme.fonts.heading,
          }),
        ],
      }))
    }
    const shortTag = /^L\d+/i.test(slabLabel) ? slabLabel.split(/[·\s:：-]+/)[0] : `0${i + 1}`
    const pillW = Math.min(1.02, Math.max(0.56, computeBadgePillWidth(shortTag, 9.5, 1.02, 0.56)))
    const pillX = 0.64
    const pillY = cy - 0.13
    shapes.push(ooxmlLine(nextId(), `Iso Left Tick ${i + 1}`, { x: pillX + pillW + 0.04, y: cy }, { x: cx - rx - 0.06, y: cy }, {
      color: col.top,
      widthPt: 0.9,
      dash: i === 0 ? '' : 'dash',
    }))
    shapes.push(ooxmlShape(nextId(), `Iso Left Pill ${i + 1}`, { x: pillX, y: pillY, w: pillW, h: 0.26 }, {
      preset: 'roundRect',
      adj: 50000,
      fill: col.top,
      anchor: 'ctr',
      marginsIn: { l: 0.04, r: 0.04, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(shortTag, { sizePt: 9.5, color: contrastInk(col.top), bold: true, align: 'ctr', lang: langAttr, font: theme.fonts.heading })],
    }))

    // Precision horizontal connector line from right corner of slab to explanation card
    const cardY = cardStartY + i * (cardH + cardGap)
    const cardMidY = cardY + cardH / 2
    const connStartX = cx + rx + 0.06
    const connEndX = cardX - 0.08
    shapes.push(ooxmlLine(nextId(), `Iso Leader ${i + 1}`, { x: connStartX, y: cy }, { x: connEndX, y: cardMidY }, {
      color: col.top,
      widthPt: 1.1,
      dash: i === 0 ? '' : 'dash',
    }))
    shapes.push(ooxmlShape(nextId(), `Iso Anchor ${i + 1}`, { x: connStartX - 0.05, y: cy - 0.05, w: 0.10, h: 0.10 }, {
      preset: 'ellipse',
      fill: col.top,
    }))

    // Right explanation card
    const cBox = { x: cardX, y: cardY, w: cardW, h: cardH }
    shapes.push(renderSurfaceCardPptx(`Iso Info Card ${i + 1}`, cBox, {
      fill: i === 0 ? tk.accentSoft : tk.surface1,
      focal: i === 0,
    }, nextId, chromeCfg, theme))
    shapes.push(ooxmlShape(nextId(), `Iso Card Rail ${i + 1}`, { x: cBox.x, y: cBox.y, w: 0.06, h: cBox.h }, {
      preset: 'rect',
      fill: col.top,
    }))

    const paras = []
    const titleLine = it.value ? `${it.title}  ·  ${it.value}${it.unit ? ' ' + it.unit : ''}` : it.title
    paras.push(ooxmlRichParagraph(titleLine, {
      sizePt: n >= 5 ? 13 : 14,
      color: tk.inkPrimary,
      bold: true,
      lang: langAttr,
      font: theme.fonts.heading,
      spaceAfterPt: it.text ? 2 : 0,
    }))
    if (it.text) {
      paras.push(ooxmlRichParagraph(it.text, {
        sizePt: n >= 5 ? 11.5 : 12.5,
        color: tk.inkSecondary,
        lang: langAttr,
        font: theme.fonts.body,
        lineHeight: 1.28,
      }))
    }
    shapes.push(ooxmlShape(nextId(), `Iso Card Text ${i + 1}`, { x: cBox.x + 0.18, y: cBox.y + 0.06, w: cBox.w - 0.28, h: cBox.h - 0.12 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0.02, r: 0.02, t: 0.01, b: 0.01 },
      paragraphs: paras,
    }))
  }

  return shapes.join('')
}

function renderIsometricPillarsPptx(slide, model, ctx) {
  const { theme, langAttr, chromeCfg, nextId, bodyTopY, bodyH } = ctx
  const tk = theme.tokens
  const shapes = []
  const items = model.items
  const n = items.length

  const stageX = 0.62
  const stageW = 12.09
  const baseLineY = bodyTopY + bodyH * 0.69
  const maxBarH = Math.max(1.1, bodyH * 0.36)
  const colW = stageW / n
  const rx = Math.min(0.92, colW * 0.29)
  const ry = rx * 0.42

  // Subtle architectural ground baseline
  shapes.push(ooxmlLine(nextId(), 'Iso Pillars Ground', { x: stageX + 0.2, y: baseLineY + ry + 0.06 }, { x: stageX + stageW - 0.2, y: baseLineY + ry + 0.06 }, {
    color: tk.hairline,
    widthPt: 1.0,
  }))

  items.forEach((it, idx) => {
    const isFocal = it.status === 'accent' || idx === n - 1
    const baseCol = isFocal
      ? tk.accentPrimary
      : (idx === n - 2 ? (tk.accentSecondary || mixHex(tk.accentPrimary, tk.surface2, 0.3)) : mixHex(tk.accentPrimary, tk.surface2 || '#CBD5E1', theme.dark ? 0.45 : 0.55))
    const leftCol = mixHex(baseCol, '#020617', 0.18)
    const rightCol = mixHex(baseCol, '#020617', 0.36)

    const cx = stageX + (idx + 0.5) * colW
    const barH = Math.max(0.55, maxBarH * it.ratio)
    const topY = baseLineY - barH

    const pTop = [cx, topY - ry]
    const pRight = [cx + rx, topY]
    const pBot = [cx, topY + ry]
    const pLeft = [cx - rx, topY]
    const bLeft = [cx - rx, baseLineY]
    const bBot = [cx, baseLineY + ry]
    const bRight = [cx + rx, baseLineY]

    // Ground soft shadow diamond
    shapes.push(renderCustomPolyPptx(nextId(), `Iso Pillar Shadow ${idx + 1}`, [
      [cx, baseLineY - ry * 0.7],
      [cx + rx * 1.15, baseLineY + 0.04],
      [cx, baseLineY + ry * 1.25],
      [cx - rx * 1.15, baseLineY + 0.04],
    ], { fill: tk.inkPrimary, fillAlpha: theme.dark ? 0.24 : 0.08 }))

    // Left extruded wall
    shapes.push(renderCustomPolyPptx(nextId(), `Iso Pillar Left ${idx + 1}`, [pLeft, pBot, bBot, bLeft], {
      fill: leftCol,
      stroke: '#FFFFFF',
      strokeAlpha: 0.3,
      strokePt: 0.5,
    }))
    // Right shaded wall
    shapes.push(renderCustomPolyPptx(nextId(), `Iso Pillar Right ${idx + 1}`, [pBot, pRight, bRight, bBot], {
      fill: rightCol,
      stroke: '#FFFFFF',
      strokeAlpha: 0.3,
      strokePt: 0.5,
    }))
    // Top cap diamond
    shapes.push(renderCustomPolyPptx(nextId(), `Iso Pillar Top ${idx + 1}`, [pTop, pRight, pBot, pLeft], {
      fill: baseCol,
      stroke: '#FFFFFF',
      strokeAlpha: 0.65,
      strokePt: 0.75,
    }))

    // Floating value + delta above top cap
    const valStr = it.value ? `${it.value}${it.unit ? ' ' + it.unit : ''}` : it.tag
    shapes.push(ooxmlShape(nextId(), `Iso Pillar Value ${idx + 1}`, { x: cx - colW * 0.44, y: topY - ry - 0.62, w: colW * 0.88, h: 0.38 }, {
      txBox: true,
      anchor: 'b',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [ooxmlRichParagraph(valStr, { sizePt: 22, color: isFocal ? tk.accentText : tk.inkPrimary, bold: true, align: 'ctr', lang: langAttr, font: theme.fonts.heading })],
    }))
    if (it.delta) {
      const dw = computeBadgePillWidth(it.delta, 10, colW * 0.78, 0.72)
      shapes.push(ooxmlShape(nextId(), `Iso Pillar Delta ${idx + 1}`, { x: cx - dw / 2, y: topY - ry - 0.90, w: dw, h: 0.24 }, {
        preset: 'roundRect',
        adj: 50000,
        fill: isFocal ? tk.accentSoft : tk.surface2,
        stroke: isFocal ? baseCol : tk.hairline,
        strokePt: 0.75,
        anchor: 'ctr',
        marginsIn: { l: 0.04, r: 0.04, t: 0, b: 0 },
        paragraphs: [ooxmlRichParagraph(it.delta, { sizePt: 9.5, color: isFocal ? tk.accentText : tk.inkSecondary, bold: true, align: 'ctr', lang: langAttr, font: theme.fonts.body })],
      }))
    }

    // Bottom caption card
    const capY = baseLineY + ry + 0.18
    const capH = Math.max(0.85, bodyTopY + bodyH - capY - 0.06)
    const capBox = { x: stageX + idx * colW + 0.12, y: capY, w: colW - 0.24, h: capH }
    shapes.push(renderSurfaceCardPptx(`Iso Pillar Caption ${idx + 1}`, capBox, {
      fill: isFocal ? tk.accentSoft : tk.surface1,
      focal: isFocal,
    }, nextId, chromeCfg, theme))
    const cParas = [
      ooxmlRichParagraph(it.title, { sizePt: 13.5, color: tk.inkPrimary, bold: true, align: 'ctr', lang: langAttr, font: theme.fonts.heading, spaceAfterPt: it.text ? 3 : 0 }),
    ]
    if (it.text) {
      cParas.push(ooxmlRichParagraph(it.text, { sizePt: 11.5, color: tk.inkSecondary, align: 'ctr', lang: langAttr, font: theme.fonts.body, lineHeight: 1.25 }))
    }
    shapes.push(ooxmlShape(nextId(), `Iso Pillar CapText ${idx + 1}`, { x: capBox.x + 0.10, y: capBox.y + 0.06, w: capBox.w - 0.20, h: capBox.h - 0.12 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: cParas,
    }))
  })

  return shapes.join('')
}

function renderIsometricHtml(slide, ctx) {
  const { theme, langId } = ctx
  const tk = theme.tokens
  const langEn = langId === 'en'
  const model = computeIsometricModel(slide, langEn)
  const items = model.items
  const n = items.length

  if (model.variant === 'pillars') {
    const vw = 1040, vh = 320
    const colW = vw / n
    const baseLineY = 266
    const maxBarH = 158
    const rx = Math.min(72, colW * 0.26)
    const ry = rx * 0.42
    let svg = `<line x1="28" y1="${(baseLineY + ry + 6).toFixed(1)}" x2="${vw - 28}" y2="${(baseLineY + ry + 6).toFixed(1)}" stroke="${tk.hairline}" stroke-width="1.5"/>`
    items.forEach((it, idx) => {
      const isFocal = it.status === 'accent' || idx === n - 1
      const baseCol = isFocal
        ? tk.accentPrimary
        : (idx === n - 2 ? (tk.accentSecondary || mixHex(tk.accentPrimary, tk.surface2, 0.3)) : mixHex(tk.accentPrimary, tk.surface2 || '#CBD5E1', theme.dark ? 0.45 : 0.55))
      const leftCol = mixHex(baseCol, '#020617', 0.18)
      const rightCol = mixHex(baseCol, '#020617', 0.36)
      const cx = (idx + 0.5) * colW
      const bh = Math.max(46, maxBarH * it.ratio)
      const topY = baseLineY - bh
      const pts = (arr) => arr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
      svg += `<polygon points="${pts([[cx - rx, topY], [cx, topY + ry], [cx, baseLineY + ry], [cx - rx, baseLineY]])}" fill="${leftCol}" stroke="#FFFFFF" stroke-opacity="0.3"/>`
      svg += `<polygon points="${pts([[cx, topY + ry], [cx + rx, topY], [cx + rx, baseLineY], [cx, baseLineY + ry]])}" fill="${rightCol}" stroke="#FFFFFF" stroke-opacity="0.3"/>`
      svg += `<polygon points="${pts([[cx, topY - ry], [cx + rx, topY], [cx, topY + ry], [cx - rx, topY]])}" fill="${baseCol}" stroke="#FFFFFF" stroke-opacity="0.6"/>`
      const valStr = it.value ? `${it.value}${it.unit ? ' ' + it.unit : ''}` : it.tag
      svg += `<text x="${cx.toFixed(1)}" y="${(topY - ry - 14).toFixed(1)}" text-anchor="middle" font-size="24" font-weight="800" fill="${isFocal ? tk.accentText : tk.inkPrimary}">${escapeHtml(valStr)}</text>`
      if (it.delta) {
        svg += `<text x="${cx.toFixed(1)}" y="${(topY - ry - 42).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="${isFocal ? tk.accentText : tk.inkMuted}">${escapeHtml(it.delta)}</text>`
      }
    })
    const caps = items.map((it, idx) => {
      const isFocal = it.status === 'accent' || idx === n - 1
      return (
        `<div class="surface-card iso-pillar-cap${isFocal ? ' is-focal' : ''}" data-item-index="${idx}">` +
        `<div class="card-title" data-item-field="title">${escapeHtml(it.title)}</div>` +
        (it.text ? `<div class="card-body" data-item-field="text">${renderInlineHtml(it.text)}</div>` : '') +
        `</div>`
      )
    }).join('')
    return (
      `<div class="iso-pillars-wrap">` +
      `<svg class="iso-pillars-svg" viewBox="0 0 ${vw} ${vh}" role="img" aria-label="${escapeHtml(slide.title || 'Isometric pillars')}">${svg}</svg>` +
      `<div class="layout-grid cols-${n} iso-pillars-caps">${caps}</div>` +
      `</div>`
    )
  }

  // Default variant: 'stack'
  const colors = isometricLayerColors(n, tk, theme.dark)
  const vw = 580, vh = 460
  const cx = 330, rx = 198, ry = Math.min(54, 118 / Math.max(1, n * 0.45)), thick = n >= 5 ? 20 : 25
  const spanY = Math.max(80, vh - ry * 2 - thick - 46)
  const stepY = n > 1 ? spanY / (n - 1) : 0
  const topCy = ry + 22
  const pts = (arr) => arr.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  let svg = ''
  for (let i = n - 1; i >= 0; i -= 1) {
    const it = items[i]
    const col = colors[i]
    const cy = topCy + i * stepY
    svg += `<polygon points="${pts([[cx - rx, cy], [cx, cy + ry], [cx, cy + ry + thick], [cx - rx, cy + thick]])}" fill="${col.left}" stroke="#FFFFFF" stroke-opacity="0.35"/>`
    svg += `<polygon points="${pts([[cx, cy + ry], [cx + rx, cy], [cx + rx, cy + thick], [cx, cy + ry + thick]])}" fill="${col.right}" stroke="#FFFFFF" stroke-opacity="0.35"/>`
    svg += `<polygon points="${pts([[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]])}" fill="${col.top}" stroke="#FFFFFF" stroke-opacity="0.6"/>`
    const slabLabel = it.tag || it.title.slice(0, 12)
    if (i === 0) {
      svg += `<text x="${cx}" y="${(cy + 5).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="700" fill="${contrastInk(col.top)}">${escapeHtml(slabLabel)}</text>`
    }
    const shortTag = /^L\d+/i.test(slabLabel) ? slabLabel.split(/[·\s:：-]+/)[0] : `0${i + 1}`
    svg += `<line x1="78" y1="${cy.toFixed(1)}" x2="${(cx - rx - 8).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${col.top}" stroke-width="1.4" ${i === 0 ? '' : 'stroke-dasharray="4 3"'}/>`
    svg += `<rect x="14" y="${(cy - 13).toFixed(1)}" width="58" height="26" rx="13" fill="${col.top}"/>`
    svg += `<text x="43" y="${(cy + 4.5).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="800" fill="${contrastInk(col.top)}">${escapeHtml(shortTag)}</text>`
  }
  const cards = items.map((it, idx) => {
    const col = colors[idx]
    const titleLine = it.value ? `${it.title} · ${it.value}${it.unit ? ' ' + it.unit : ''}` : it.title
    return (
      `<div class="surface-card iso-stack-card${idx === 0 ? ' is-focal' : ''}" style="border-left:5px solid ${col.top}" data-item-index="${idx}">` +
      `<div class="card-title" data-item-field="title">${escapeHtml(titleLine)}</div>` +
      (it.text ? `<div class="card-body" data-item-field="text">${renderInlineHtml(it.text)}</div>` : '') +
      `</div>`
    )
  }).join('')
  return (
    `<div class="iso-stack-board">` +
    `<div class="iso-stack-stage"><svg class="iso-stack-svg" viewBox="0 0 ${vw} ${vh}" role="img" aria-label="${escapeHtml(slide.title || 'Isometric stack')}">${svg}</svg></div>` +
    `<div class="iso-stack-cards">${cards}</div>` +
    `</div>`
  )
}

export function renderInfographicSlideBodyPptx(slide, ctx) {
  const layout = slide?.layout
  if (!INFOGRAPHIC_LAYOUTS.has(layout)) return null
  if (layout === 'map') return renderMapPptx(slide, ctx)
  const model = computeIsometricModel(slide, ctx.langAttr === 'en-US')
  return model.variant === 'pillars'
    ? renderIsometricPillarsPptx(slide, model, ctx)
    : renderIsometricStackPptx(slide, model, ctx)
}

export function renderInfographicSlideBodyHtml(slide, ctx) {
  const layout = slide?.layout
  if (!INFOGRAPHIC_LAYOUTS.has(layout)) return null
  if (layout === 'map') return renderMapHtml(slide, ctx)
  return renderIsometricHtml(slide, ctx)
}

// ---------------------------------------------------------------------------
// 3. 智能配图协作 Brief（Visual Brief Generator + Editorial Blueprint Slot）
// ---------------------------------------------------------------------------

export function normalizeImageBrief(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined
  if (typeof raw === 'string') {
    const prompt = raw.replace(/\s+/g, ' ').trim().slice(0, 400)
    return prompt ? { prompt } : undefined
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const prompt = String(raw.prompt ?? raw.description ?? raw.subject ?? '').replace(/\s+/g, ' ').trim().slice(0, 400)
    const aspect = String(raw.aspect ?? raw.recommendedAspect ?? '').trim().slice(0, 16)
    const mood = String(raw.mood ?? '').trim().slice(0, 40)
    const safeZone = String(raw.safeZone ?? raw.compositionGuide ?? '').replace(/\s+/g, ' ').trim().slice(0, 180)
    const style = String(raw.style ?? '').trim().slice(0, 60)
    if (!prompt && !safeZone) return undefined
    return {
      ...(prompt ? { prompt } : {}),
      ...(aspect ? { aspect } : {}),
      ...(mood ? { mood } : {}),
      ...(safeZone ? { safeZone } : {}),
      ...(style ? { style } : {}),
    }
  }
  return undefined
}

/**
 * 为封面/图文槽位确定性生成与当前主题色板、明暗极性、留白区严格对齐的配图 Brief。
 */
export function generateVisualBrief(slide = {}, theme = null, lang = 'zh') {
  const langEn = String(lang || 'zh').toLowerCase() === 'en'
  const layout = String(slide.layout || 'image-right').toLowerCase()
  const variant = String(slide.variant || '').toLowerCase()
  const title = stripInlineMarkdown(slide.title || slide.topic || 'Executive presentation visual')
  const tk = theme?.tokens || {}
  const dark = Boolean(theme?.dark)
  const accentPrimary = tk.accentPrimary || theme?.palette?.accent || '#0057B8'
  const accentSecondary = tk.accentSecondary || theme?.palette?.accent2 || '#0E7490'
  const canvas = tk.canvas || theme?.palette?.bg || (dark ? '#0B1020' : '#FFFFFF')

  let recommendedAspect = '4:3'
  let safeZoneEn = 'Center primary subject cleanly with subtle editorial margin; avoid text overlays.'
  let safeZoneZh = '主体居中并保留四周呼吸留白；画面内严禁生成任何文字或乱码标签。'
  if (layout === 'cover') {
    recommendedAspect = '8:9'
    safeZoneEn = 'Right-half hero photo split (8:9 vertical); anchor focal subject in right 70%, keep left border clean for seamless dark-panel seam; zero text in image.'
    safeZoneZh = '封面右侧半屏出血（8:9 竖幅）：主体锚定右侧 70%，左侧边缘保持简洁以便与深色排版区无缝衔接；严禁图内文字。'
  } else if (layout === 'image' && variant === 'full-bleed') {
    recommendedAspect = '16:9'
    safeZoneEn = '16:9 full-bleed hero; place main subject in upper 60%, keep bottom 32% low-detail/darker for protective title scrim; zero text in image.'
    safeZoneZh = '16:9 全屏出血主图：视觉主体置于上半 60%，底部 32% 保持简洁暗调以承接标题渐变压暗层；严禁图内文字。'
  } else if (layout === 'image-left' || layout === 'image-right') {
    recommendedAspect = variant === 'split-bleed' ? '5:6' : '4:3'
    safeZoneEn = `${recommendedAspect} split-frame visual; crisp focal subject aligned away from text column; zero embedded text.`
    safeZoneZh = `${recommendedAspect} 图文分栏配图：主体清晰聚焦、避免与文字栏边界争抢焦点；严禁图内文字。`
  }

  const moodLabel = dark ? 'sleek moody studio lighting, obsidian-depth shadows' : 'clean architectural daylight studio photography, airy editorial light'
  const explicitPrompt = typeof slide.imageBrief === 'string'
    ? slide.imageBrief.trim()
    : (slide.imageBrief?.prompt ? String(slide.imageBrief.prompt).trim() : '')

  const promptEn = explicitPrompt
    ? `${explicitPrompt}. Color harmony: ${accentPrimary} and ${accentSecondary} accents on ${dark ? 'dark' : 'light'} backdrop (${canvas}). ${moodLabel}. Ultra-clean composition, NO text, NO letters, NO watermarks.`
    : `Editorial conceptual photography / minimalist 3D studio render illustrating "${title}". Harmonized with accent palette ${accentPrimary} and ${accentSecondary} on a ${dark ? 'deep dark' : 'bright airy daylight'} background (${canvas}). ${moodLabel}, ultra-crisp geometry, NO text, NO typography, NO watermarks.`

  const promptZh = explicitPrompt
    ? `${explicitPrompt}。色调严格呼应主题主色 ${accentPrimary} 与辅色 ${accentSecondary}（画布底色 ${canvas}），${dark ? '暗夜高定棚拍光影' : '明亮现代建筑/杂志级自然棚拍'}，构图干净克制，图内零文字零水印。`
    : `围绕「${title}」的高级杂志感实拍或极简 3D 棚拍概念视觉图；主辅色调严格贴合 ${accentPrimary} / ${accentSecondary}（${dark ? '深邃暗底光影' : '明亮通透浅底自然光'}，底色 ${canvas}），留白克制，图内绝不出现任何文字或水印。`

  return {
    recommendedAspect,
    paletteHex: { accentPrimary, accentSecondary, canvas },
    mood: dark ? 'dark-studio' : 'daylight-editorial',
    safeZone: langEn ? safeZoneEn : safeZoneZh,
    promptEn,
    promptZh,
  }
}

export function renderImageBriefPlaceholderPptx(slide, boxIn, theme, langAttr, nextId) {
  const tk = theme.tokens
  const langEn = langAttr === 'en-US'
  const briefObj = normalizeImageBrief(slide.imageBrief) || {}
  const generated = generateVisualBrief(slide, theme, langEn ? 'en' : 'zh')
  const aspect = briefObj.aspect || generated.recommendedAspect
  const promptText = briefObj.prompt || (langEn ? generated.promptEn : generated.promptZh)
  const safeText = briefObj.safeZone || generated.safeZone

  const shapes = []
  shapes.push(ooxmlShape(nextId(), 'Visual Brief Frame', boxIn, {
    preset: 'roundRect',
    adj: roundRectAdj(boxIn.w, boxIn.h, 12),
    fill: tk.surface2 || tk.surface1,
    stroke: tk.accentPrimary,
    strokePt: 1.25,
    dash: 'dash',
  }))

  // Aspect & tag badge
  const badgeText = langEn ? `VISUAL BRIEF · ${aspect}` : `智能配图槽位 · ${aspect}`
  const bw = computeBadgePillWidth(badgeText, 10, Math.min(3.4, boxIn.w - 0.5), 1.4)
  shapes.push(ooxmlShape(nextId(), 'Visual Brief Pill', { x: boxIn.x + 0.28, y: boxIn.y + 0.28, w: bw, h: 0.30 }, {
    preset: 'roundRect',
    adj: 50000,
    fill: tk.accentPrimary,
    anchor: 'ctr',
    marginsIn: { l: 0.06, r: 0.06, t: 0.01, b: 0.01 },
    paragraphs: [ooxmlRichParagraph(badgeText, { sizePt: 10, color: contrastInk(tk.accentPrimary), bold: true, align: 'ctr', lang: langAttr, font: theme.fonts.body })],
  }))

  // Theme palette harmony swatches (top-right inside frame)
  const swatches = [tk.accentPrimary, tk.accentSecondary || tk.accentPrimary, tk.canvas || theme.palette.bg]
  swatches.forEach((hexCol, si) => {
    shapes.push(ooxmlShape(nextId(), `Brief Swatch ${si + 1}`, { x: boxIn.x + boxIn.w - 0.28 - (3 - si) * 0.28, y: boxIn.y + 0.31, w: 0.22, h: 0.22 }, {
      preset: 'ellipse',
      fill: hexCol,
      stroke: tk.hairline,
      strokePt: 0.75,
    }))
  })

  // Prompt body
  const textBox = { x: boxIn.x + 0.28, y: boxIn.y + 0.78, w: boxIn.w - 0.56, h: Math.max(0.8, boxIn.h - 1.56) }
  const fit = computeTextFit(promptText, textBox, 'cardBody', { maxPt: 14.5, minPt: 11.5 })
  shapes.push(ooxmlShape(nextId(), 'Visual Brief Prompt', textBox, {
    txBox: true,
    anchor: 'ctr',
    marginsIn: { l: 0.04, r: 0.04, t: 0.04, b: 0.04 },
    paragraphs: [
      ooxmlRichParagraph(langEn ? 'Suggested Image Prompt' : '建议生图 / 选图描述', { sizePt: 10.5, color: tk.accentText, bold: true, lang: langAttr, font: theme.fonts.body, spaceAfterPt: 4 }),
      ooxmlRichParagraph(promptText, { sizePt: fit.fontPt, color: tk.inkPrimary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.38 }),
    ],
  }))

  // Safe zone footer
  shapes.push(ooxmlShape(nextId(), 'Visual Brief SafeZone', { x: boxIn.x + 0.28, y: boxIn.y + boxIn.h - 0.62, w: boxIn.w - 0.56, h: 0.44 }, {
    txBox: true,
    anchor: 'b',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    paragraphs: [ooxmlRichParagraph(safeText, { sizePt: 10, color: tk.inkMuted, lang: langAttr, font: theme.fonts.body, lineHeight: 1.25 })],
  }))

  return shapes.join('')
}

export function renderImageBriefPlaceholderHtml(slide, theme, langEn = false) {
  const tk = theme.tokens
  const briefObj = normalizeImageBrief(slide.imageBrief) || {}
  const generated = generateVisualBrief(slide, theme, langEn ? 'en' : 'zh')
  const aspect = briefObj.aspect || generated.recommendedAspect
  const promptText = briefObj.prompt || (langEn ? generated.promptEn : generated.promptZh)
  const safeText = briefObj.safeZone || generated.safeZone
  const swatches = [tk.accentPrimary, tk.accentSecondary || tk.accentPrimary, tk.canvas || theme.palette.bg]
    .map((c) => `<span class="brief-swatch" style="background:${c}" title="${c}"></span>`).join('')
  return (
    `<div class="visual-brief-card">` +
    `<div class="visual-brief-top"><span class="visual-brief-pill">${escapeHtml(langEn ? `VISUAL BRIEF · ${aspect}` : `智能配图槽位 · ${aspect}`)}</span><span class="visual-brief-swatches">${swatches}</span></div>` +
    `<div class="visual-brief-label">${escapeHtml(langEn ? 'Suggested Image Prompt' : '建议生图 / 选图描述')}</div>` +
    `<p class="visual-brief-prompt">${escapeHtml(promptText)}</p>` +
    `<div class="visual-brief-safe">${escapeHtml(safeText)}</div>` +
    `</div>`
  )
}

export const INFOGRAPHICS_CSS = `
.info-map-board{display:grid;grid-template-columns:1.78fr 1fr;gap:clamp(14px,1.6vw,22px);align-items:stretch;width:100%}
.info-map-canvas{position:relative;padding:12px 14px;display:flex;flex-direction:column;justify-content:center}
.info-map-mode{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.info-map-svg{width:100%;height:auto;max-height:56vh;display:block}
.info-map-side{display:flex;flex-direction:column;justify-content:center;gap:10px;min-width:0}
.map-rank-card{padding:11px 14px;gap:6px}
.map-rank-head{display:flex;align-items:center;gap:8px}
.map-rank-num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:20px;border-radius:4px;font-size:11px;font-weight:800;background:var(--surface2);color:var(--muted);flex-shrink:0}
.map-rank-name{font-size:14px;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.map-rank-val{font-size:13.5px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.map-bar-track{width:100%;height:6px;border-radius:99px;background:var(--hairline);overflow:hidden}
.map-bar-fill{height:100%;border-radius:99px}
.map-rank-note{font-size:12px;color:var(--ink-secondary);line-height:1.35}
.iso-stack-board{display:grid;grid-template-columns:1.08fr 1fr;gap:clamp(16px,2vw,28px);align-items:center;width:100%}
.iso-stack-stage{display:flex;align-items:center;justify-content:center}
.iso-stack-svg{width:100%;max-height:58vh;height:auto;display:block}
.iso-stack-cards{display:flex;flex-direction:column;gap:10px;min-width:0}
.iso-stack-card{padding:12px 16px;gap:4px}
.iso-pillars-wrap{display:flex;flex-direction:column;gap:14px;width:100%}
.iso-pillars-svg{width:100%;max-height:36vh;height:auto;display:block}
.iso-pillar-cap{text-align:center;padding:12px 14px;gap:4px}
.visual-brief-card{width:100%;height:100%;box-sizing:border-box;border:2px dashed var(--accent);border-radius:var(--radius);background:var(--surface2);padding:20px 22px;display:flex;flex-direction:column;justify-content:space-between;gap:10px}
.visual-brief-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.visual-brief-pill{display:inline-flex;padding:4px 12px;border-radius:99px;background:var(--accent);color:var(--ink-on-accent);font-size:11px;font-weight:800;letter-spacing:.08em}
.visual-brief-swatches{display:inline-flex;gap:6px}
.brief-swatch{width:16px;height:16px;border-radius:50%;border:1px solid var(--hairline);display:inline-block}
.visual-brief-label{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent-text)}
.visual-brief-prompt{margin:0;font-size:15px;line-height:1.45;color:var(--fg)}
.visual-brief-safe{font-size:12px;color:var(--muted);line-height:1.35;border-top:1px solid var(--hairline);padding-top:8px}
@media (max-width:900px){
  .info-map-board,.iso-stack-board{grid-template-columns:1fr}
}
`

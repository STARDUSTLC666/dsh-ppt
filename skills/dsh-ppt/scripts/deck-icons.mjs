/**
 * deck-icons.mjs —— dsh-ppt 内置 56 枚极简几何线性矢量图标引擎（零外部依赖）。
 *
 * 双端 100% 原生矢量同构输出：
 *   - HTML 端：语义化 <svg class="deck-icon" viewBox="0 0 24 24">（继承 currentColor，随主题自动变色）
 *   - PPTX 端：原生可编辑 DrawingML <p:sp><a:custGeom>（多路径 <a:path fill="none"> + 圆头描边，零位图、PowerPoint/WPS/LibreOffice 原生可换色缩放）
 *
 * 另提供中英双语智能语义匹配 resolveSemanticIcon() 与 3 种徽章容器渲染器（soft / ring / bare）。
 */

import {
  boxToEmu,
  ptToEmu,
  roundRectAdj,
  escapeXml,
  ooxmlSolidFill,
  ooxmlShape,
} from './deck-chrome.mjs'

const SCALE = 100 // 24×24 逻辑坐标 -> 2400×2400 OOXML 整数坐标精度
const KAPPA = 0.5522847498

// ---------------------------------------------------------------------------
// 1. 轻量 SVG Path -> OOXML <a:path> 编译器（支持 M/L/H/V/Q/C/Z 与 Circle/Rect 原语）
// ---------------------------------------------------------------------------

function circleSubpathSvg(cx, cy, r) {
  const k = r * KAPPA
  const fmt = (n) => +n.toFixed(2)
  return (
    `M ${fmt(cx)} ${fmt(cy - r)} ` +
    `C ${fmt(cx + k)} ${fmt(cy - r)} ${fmt(cx + r)} ${fmt(cy - k)} ${fmt(cx + r)} ${fmt(cy)} ` +
    `C ${fmt(cx + r)} ${fmt(cy + k)} ${fmt(cx + k)} ${fmt(cy + r)} ${fmt(cx)} ${fmt(cy + r)} ` +
    `C ${fmt(cx - k)} ${fmt(cy + r)} ${fmt(cx - r)} ${fmt(cy + k)} ${fmt(cx - r)} ${fmt(cy)} ` +
    `C ${fmt(cx - r)} ${fmt(cy - k)} ${fmt(cx - k)} ${fmt(cy - r)} ${fmt(cx)} ${fmt(cy - r)} Z`
  )
}

function roundRectSubpathSvg(x, y, w, h, r = 0) {
  const rr = Math.min(r, w / 2, h / 2)
  const fmt = (n) => +n.toFixed(2)
  if (rr <= 0.05) {
    return `M ${fmt(x)} ${fmt(y)} L ${fmt(x + w)} ${fmt(y)} L ${fmt(x + w)} ${fmt(y + h)} L ${fmt(x)} ${fmt(y + h)} Z`
  }
  const k = rr * KAPPA
  return (
    `M ${fmt(x + rr)} ${fmt(y)} ` +
    `L ${fmt(x + w - rr)} ${fmt(y)} ` +
    `C ${fmt(x + w - rr + k)} ${fmt(y)} ${fmt(x + w)} ${fmt(y + rr - k)} ${fmt(x + w)} ${fmt(y + rr)} ` +
    `L ${fmt(x + w)} ${fmt(y + h - rr)} ` +
    `C ${fmt(x + w)} ${fmt(y + h - rr + k)} ${fmt(x + w - rr + k)} ${fmt(y + h)} ${fmt(x + w - rr)} ${fmt(y + h)} ` +
    `L ${fmt(x + rr)} ${fmt(y + h)} ` +
    `C ${fmt(x + rr - k)} ${fmt(y + h)} ${fmt(x)} ${fmt(y + h - rr + k)} ${fmt(x)} ${fmt(y + h - rr)} ` +
    `L ${fmt(x)} ${fmt(y + rr)} ` +
    `C ${fmt(x)} ${fmt(y + rr - k)} ${fmt(x + rr - k)} ${fmt(y)} ${fmt(x + rr)} ${fmt(y)} Z`
  )
}

function ptXml(x, y) {
  return `<a:pt x="${Math.round(x * SCALE)}" y="${Math.round(y * SCALE)}"/>`
}

function svgPathToOoxmlCommands(d) {
  const tokens = String(d ?? '').match(/[MLHVQCZ]|-?(?:\d+\.?\d*|\.\d+)/gi) || []
  let i = 0
  let cmd = ''
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  const out = []

  const readNum = () => Number(tokens[i++] ?? 0)

  while (i < tokens.length) {
    if (/^[MLHVQCZ]$/i.test(tokens[i])) {
      cmd = tokens[i++].toUpperCase()
      if (cmd === 'Z') {
        out.push('<a:close/>')
        cx = sx
        cy = sy
        continue
      }
    }
    if (cmd === 'M') {
      cx = readNum()
      cy = readNum()
      sx = cx
      sy = cy
      out.push(`<a:moveTo>${ptXml(cx, cy)}</a:moveTo>`)
      cmd = 'L'
    } else if (cmd === 'L') {
      cx = readNum()
      cy = readNum()
      out.push(`<a:lnTo>${ptXml(cx, cy)}</a:lnTo>`)
    } else if (cmd === 'H') {
      cx = readNum()
      out.push(`<a:lnTo>${ptXml(cx, cy)}</a:lnTo>`)
    } else if (cmd === 'V') {
      cy = readNum()
      out.push(`<a:lnTo>${ptXml(cx, cy)}</a:lnTo>`)
    } else if (cmd === 'Q') {
      const qx = readNum()
      const qy = readNum()
      cx = readNum()
      cy = readNum()
      out.push(`<a:quadBezTo>${ptXml(qx, qy)}${ptXml(cx, cy)}</a:quadBezTo>`)
    } else if (cmd === 'C') {
      const x1 = readNum()
      const y1 = readNum()
      const x2 = readNum()
      const y2 = readNum()
      cx = readNum()
      cy = readNum()
      out.push(`<a:cubicBezTo>${ptXml(x1, y1)}${ptXml(x2, y2)}${ptXml(cx, cy)}</a:cubicBezTo>`)
    } else {
      i += 1
    }
  }
  return out.join('')
}

// ---------------------------------------------------------------------------
// 2. 56 枚极简几何线性图标库（24×24 画布，2px 统一光学描边权重）
// ---------------------------------------------------------------------------

const RAW_ICONS = {
  // === 商业与战略 (Business & Strategy) ===
  target: [circleSubpathSvg(12, 12, 9), circleSubpathSvg(12, 12, 5), circleSubpathSvg(12, 12, 1.4)],
  compass: [circleSubpathSvg(12, 12, 9), 'M 15.8 8.2 L 13.5 13.5 L 8.2 15.8 L 10.5 10.5 Z'],
  rocket: [
    'M 12 3 C 16.5 4.2 19 8.5 18 14 L 14 18 C 8.5 19 4.2 16.5 3 12 C 6.5 8 8.8 5 12 3 Z',
    'M 9 15 L 6 18 L 6 21 L 9 18',
    circleSubpathSvg(13.5, 10.5, 1.7),
  ],
  trophy: [
    'M 7 4 H 17 V 10 C 17 13 14.8 15 12 15 C 9.2 15 7 13 7 10 Z',
    'M 7 6 H 4 V 9 C 4 10.8 5.2 12 7 12',
    'M 17 6 H 20 V 9 C 20 10.8 18.8 12 17 12',
    'M 12 15 V 20',
    'M 8 20 H 16',
  ],
  crown: ['M 3 17 L 5 7 L 9.5 11.5 L 12 6 L 14.5 11.5 L 19 7 L 21 17 Z', 'M 4 20 H 20'],
  flag: ['M 5 21 V 4', 'M 5 4 H 18 L 15.5 8.5 L 18 13 H 5'],
  briefcase: [roundRectSubpathSvg(3, 7, 18, 13, 2), 'M 8 7 V 5 C 8 4 8.8 3.5 9.8 3.5 H 14.2 C 15.2 3.5 16 4 16 5 V 7', 'M 3 12 H 21'],
  building: ['M 4 21 V 4 H 14 V 21', 'M 14 10 H 20 V 21', 'M 2 21 H 22', 'M 8 8 H 10', 'M 8 12 H 10', 'M 8 16 H 10'],
  globe: [circleSubpathSvg(12, 12, 9), 'M 3 12 H 21', 'M 12 3 C 15 6 15 18 12 21 C 9 18 9 6 12 3'],
  award: [circleSubpathSvg(12, 9, 5.5), 'M 9 14 L 7.5 21 L 12 18.5 L 16.5 21 L 15 14'],
  scale: ['M 12 3 V 20', 'M 7 20 H 17', 'M 4 7 H 20', 'M 6 7 L 3.5 13 H 8.5 Z', 'M 18 7 L 15.5 13 H 20.5 Z'],
  diamond: ['M 6 4 H 18 L 21 9 L 12 20 L 3 9 Z', 'M 3 9 H 21', 'M 9 4 L 12 20 L 15 4'],
  star: ['M 12 3 L 14.8 8.6 L 21 9.5 L 16.5 13.8 L 17.6 20 L 12 17 L 6.4 20 L 7.5 13.8 L 3 9.5 L 9.2 8.6 Z'],

  // === 数据与财务 (Data & Finance) ===
  'trending-up': ['M 3 17 L 9 11 L 13 15 L 21 7', 'M 15 7 H 21 V 13'],
  'trending-down': ['M 3 7 L 9 13 L 13 9 L 21 17', 'M 15 17 H 21 V 11'],
  'chart-bar': ['M 3 20 H 21', 'M 6 20 V 13 H 9 V 20', 'M 11 20 V 8 H 14 V 20', 'M 16 20 V 4 H 19 V 20'],
  'chart-pie': ['M 12 3 A 9 9 0 1 0 21 12'.replace(/A.*/, 'C 7 3 3 7 3 12 C 3 17 7 21 12 21 C 17 21 21 17 21 12 H 12 Z'), 'M 14.5 3.5 C 17.8 4.4 19.6 6.2 20.5 9.5 H 14.5 Z'],
  coins: [
    'M 4 7 C 4 5.3 7.1 4 11 4 C 14.9 4 18 5.3 18 7 C 18 8.7 14.9 10 11 10 C 7.1 10 4 8.7 4 7 Z',
    'M 4 7 V 12 C 4 13.7 7.1 15 11 15 C 14.9 15 18 13.7 18 12 V 7',
    'M 4 12 V 17 C 4 18.7 7.1 20 11 20 C 14.9 20 18 18.7 18 17 V 12',
  ],
  wallet: [roundRectSubpathSvg(3, 6, 18, 13, 2), 'M 15 11 H 21 V 15 H 15 Z', 'M 5 6 L 16 3.5 V 6'],
  bank: ['M 3 9 L 12 3 L 21 9 Z', 'M 5 9 V 18', 'M 10 9 V 18', 'M 14 9 V 18', 'M 19 9 V 18', 'M 3 18 H 21', 'M 2 21 H 22'],
  percent: ['M 19 5 L 5 19', circleSubpathSvg(7, 7, 2.2), circleSubpathSvg(17, 17, 2.2)],
  layers: ['M 12 3 L 21 8 L 12 13 L 3 8 Z', 'M 3 12.5 L 12 17.5 L 21 12.5', 'M 3 16.5 L 12 21.5 L 21 16.5'],
  funnel: ['M 3 4 H 21 L 14.5 12.5 V 19 L 9.5 21 V 12.5 Z'],

  // === 科技与架构 (Tech & Architecture) ===
  cpu: [
    roundRectSubpathSvg(6, 6, 12, 12, 2),
    roundRectSubpathSvg(9.5, 9.5, 5, 5, 0.8),
    'M 9 3 V 6', 'M 15 3 V 6', 'M 9 18 V 21', 'M 15 18 V 21',
    'M 3 9 H 6', 'M 3 15 H 6', 'M 18 9 H 21', 'M 18 15 H 21',
  ],
  server: [
    roundRectSubpathSvg(3, 4, 18, 6.5, 1.5),
    roundRectSubpathSvg(3, 13.5, 18, 6.5, 1.5),
    'M 7 7.2 H 7.5', 'M 7 16.8 H 7.5', 'M 12 7.2 H 17', 'M 12 16.8 H 17',
  ],
  cloud: ['M 7 18 H 17.5 C 19.7 18 21 16.5 21 14.5 C 21 12.6 19.6 11.2 17.7 11 C 17.2 7.6 14.4 5 11 5 C 7.5 5 4.8 7.5 4.5 10.8 C 3.2 11.4 2.5 12.7 2.5 14.2 C 2.5 16.4 4.3 18 7 18 Z'],
  database: [
    'M 4 6.5 C 4 4.8 7.6 3.5 12 3.5 C 16.4 3.5 20 4.8 20 6.5 C 20 8.2 16.4 9.5 12 9.5 C 7.6 9.5 4 8.2 4 6.5 Z',
    'M 4 6.5 V 17.5 C 4 19.2 7.6 20.5 12 20.5 C 16.4 20.5 20 19.2 20 17.5 V 6.5',
    'M 4 12 C 4 13.7 7.6 15 12 15 C 16.4 15 20 13.7 20 12',
  ],
  code: ['M 8 7 L 3 12 L 8 17', 'M 16 7 L 21 12 L 16 17', 'M 14 5 L 10 19'],
  terminal: [roundRectSubpathSvg(3, 4, 18, 16, 2), 'M 7 10 L 10.5 12.5 L 7 15', 'M 12.5 15 H 17'],
  'git-branch': [circleSubpathSvg(6.5, 6, 2.2), circleSubpathSvg(6.5, 18, 2.2), circleSubpathSvg(17.5, 8, 2.2), 'M 6.5 8.2 V 15.8', 'M 17.5 10.2 C 17.5 14.2 13 15 8.7 15'],
  workflow: [roundRectSubpathSvg(3, 4, 6.5, 6, 1.2), roundRectSubpathSvg(14.5, 14, 6.5, 6, 1.2), 'M 9.5 7 H 14.5 C 16.2 7 17.5 8.2 17.5 10 V 14'],
  spark: ['M 12 2.5 L 14.2 9.8 L 21.5 12 L 14.2 14.2 L 12 21.5 L 9.8 14.2 L 2.5 12 L 9.8 9.8 Z'],
  bot: [
    roundRectSubpathSvg(4, 7, 16, 12, 2.5),
    'M 12 3 V 7', 'M 9 12.5 H 9.6', 'M 14.4 12.5 H 15', 'M 9 16 H 15',
    'M 2 12 V 14', 'M 22 12 V 14',
  ],
  zap: ['M 13 2.5 L 4.5 13.5 H 11.5 L 10.5 21.5 L 19.5 10.5 H 12.5 Z'],
  shield: ['M 12 3 L 19.5 6 V 11.5 C 19.5 16.2 16.3 19.6 12 21 C 7.7 19.6 4.5 16.2 4.5 11.5 V 6 Z', 'M 9 12 L 11 14 L 15.5 9.5'],
  lock: [roundRectSubpathSvg(5, 10.5, 14, 10, 2), 'M 8 10.5 V 7.5 C 8 5.2 9.8 3.5 12 3.5 C 14.2 3.5 16 5.2 16 7.5 V 10.5'],
  key: [circleSubpathSvg(8, 12, 4), 'M 12 12 H 21', 'M 17.5 12 V 15.5', 'M 20.5 12 V 14.5'],
  network: [circleSubpathSvg(12, 5, 2.2), circleSubpathSvg(5.5, 17.5, 2.2), circleSubpathSvg(18.5, 17.5, 2.2), 'M 10.8 7 L 6.7 15.5', 'M 13.2 7 L 17.3 15.5', 'M 7.7 17.5 H 16.3'],

  // === 运营与交付 (Ops & Delivery) ===
  clock: [circleSubpathSvg(12, 12, 9), 'M 12 7 V 12 L 15.5 14'],
  calendar: [roundRectSubpathSvg(3.5, 5, 17, 15.5, 2), 'M 3.5 10 H 20.5', 'M 8 3 V 6.5', 'M 16 3 V 6.5'],
  'check-circle': [circleSubpathSvg(12, 12, 9), 'M 8 12.2 L 10.8 15 L 16.2 9.2'],
  alert: ['M 12 3.5 L 21 19.5 H 3 Z', 'M 12 9.5 V 14', 'M 12 16.8 V 17.2'],
  flame: ['M 12 3 C 15.5 6.8 18.5 9.8 18.5 14 C 18.5 17.8 15.6 20.8 12 20.8 C 8.4 20.8 5.5 17.8 5.5 14 C 5.5 11.2 7.2 8.8 9 7.2 C 9.2 9.2 10.3 10.4 11.4 10.5 C 10.6 8 11 5.2 12 3 Z'],
  gauge: ['M 4 17.5 C 3.3 16 3 14.3 3 12.5 C 3 7.5 7 3.5 12 3.5 C 17 3.5 21 7.5 21 12.5 C 21 14.3 20.7 16 20 17.5', 'M 12 13 L 16.2 8.8', circleSubpathSvg(12, 13.5, 1.4)],
  wrench: ['M 14.8 4.2 C 12.2 4.6 10.4 7.1 11 9.8 L 4.5 16.3 C 3.7 17.1 3.7 18.4 4.5 19.2 C 5.3 20 6.6 20 7.4 19.2 L 13.9 12.7 C 16.6 13.3 19.1 11.5 19.5 8.9 L 16.5 10.2 L 14.2 7.9 Z'],
  package: ['M 12 3 L 20 7.5 V 16.5 L 12 21 L 4 16.5 V 7.5 Z', 'M 4 7.5 L 12 12 L 20 7.5', 'M 12 12 V 21'],
  truck: ['M 2.5 6 H 14.5 V 16 H 2.5 Z', 'M 14.5 9.5 H 18.5 L 21.5 12.5 V 16 H 14.5', circleSubpathSvg(6.5, 17.5, 2), circleSubpathSvg(17.5, 17.5, 2)],
  refresh: ['M 20 11 C 19.5 6.8 16 3.8 11.8 4 C 8.4 4.2 5.6 6.4 4.5 9.5', 'M 4 5 V 9.5 H 8.5', 'M 4 13 C 4.5 17.2 8 20.2 12.2 20 C 15.6 19.8 18.4 17.6 19.5 14.5', 'M 20 19 V 14.5 H 15.5'],
  sliders: ['M 4 7 H 20', 'M 4 12 H 20', 'M 4 17 H 20', circleSubpathSvg(9, 7, 1.8), circleSubpathSvg(15, 12, 1.8), circleSubpathSvg(10.5, 17, 1.8)],

  // === 组织、学术与行业 (People, Academic & Verticals) ===
  users: [
    circleSubpathSvg(9, 8.5, 3),
    'M 3.5 19.5 C 3.5 16.2 6 14 9 14 C 12 14 14.5 16.2 14.5 19.5',
    circleSubpathSvg(16.2, 9.2, 2.4),
    'M 15.5 14.2 C 18.2 14.6 20.5 16.6 20.5 19.5',
  ],
  user: [circleSubpathSvg(12, 8, 3.6), 'M 5 20 C 5 16.2 8.1 13.8 12 13.8 C 15.9 13.8 19 16.2 19 20'],
  book: ['M 3.5 5.5 C 6.2 4.5 9.5 4.8 12 6.5 C 14.5 4.8 17.8 4.5 20.5 5.5 V 18.5 C 17.8 17.5 14.5 17.8 12 19.5 C 9.5 17.8 6.2 17.5 3.5 18.5 Z', 'M 12 6.5 V 19.5'],
  graduation: ['M 2.5 9.5 L 12 5 L 21.5 9.5 L 12 14 Z', 'M 6.5 11.5 V 16.2 C 6.5 17.8 9 19 12 19 C 15 19 17.5 17.8 17.5 16.2 V 11.5', 'M 21 10 V 15.5'],
  microscope: ['M 10 4 H 13.5 V 12 H 10 Z', 'M 8 12 H 15.5', 'M 13.5 8.5 C 17 9 19 11.8 19 15 C 19 18.2 16.2 20.5 12 20.5 H 5', 'M 6 16.5 H 13'],
  atom: [
    circleSubpathSvg(12, 12, 1.5),
    'M 4 12 C 4 8.8 7.6 6.2 12 6.2 C 16.4 6.2 20 8.8 20 12 C 20 15.2 16.4 17.8 12 17.8 C 7.6 17.8 4 15.2 4 12 Z',
    'M 12 4 C 15.2 4 17.8 7.6 17.8 12 C 17.8 16.4 15.2 20 12 20 C 8.8 20 6.2 16.4 6.2 12 C 6.2 7.6 8.8 4 12 4 Z',
  ],
  lightbulb: [
    'M 9 17.5 H 15', 'M 9.8 20.5 H 14.2',
    'M 8.5 14.5 C 7 13.2 6 11.4 6 9.4 C 6 6.1 8.7 3.5 12 3.5 C 15.3 3.5 18 6.1 18 9.4 C 18 11.4 17 13.2 15.5 14.5 L 14.8 17.5 H 9.2 Z',
  ],
  heart: ['M 12 20 C 12 20 4 14.8 4 9.2 C 4 6.4 6.2 4.5 8.6 4.5 C 10.2 4.5 11.4 5.4 12 6.6 C 12.6 5.4 13.8 4.5 15.4 4.5 C 17.8 4.5 20 6.4 20 9.2 C 20 14.8 12 20 12 20 Z'],
  leaf: ['M 5 19 C 5 11 10 5 20 4 C 19 14 14 19 5 19 Z', 'M 5 19 L 13 11'],
  stethoscope: ['M 6 4 V 10 C 6 13.3 8.7 16 12 16 C 15.3 16 18 13.3 18 10 V 4', 'M 12 16 V 18.5 C 12 20 13.4 21 15 21 C 16.6 21 18 20 18 18.5 V 15', circleSubpathSvg(18, 13.5, 1.5)],
  megaphone: ['M 4 11 V 14 H 7.5 L 18 18.5 V 6.5 L 7.5 11 Z', 'M 7.5 14 L 9 19.5 H 11.5 L 10 14'],
  message: ['M 4 5.5 H 20 V 16 H 9.5 L 5 19.5 V 16 H 4 Z', 'M 8 9.5 H 16', 'M 8 12.5 H 13'],
}

export const ICON_NAMES = Object.freeze(Object.keys(RAW_ICONS))
const ICON_SET = new Set(ICON_NAMES)

const SEMANTIC_ICON_RULES = [
  [/增长|营收|收入|增速|收益|提升|爆发|growth|revenue|arr|gmv|upside|cagr|roi/i, 'trending-up'],
  [/下降|亏损|压缩|降本|削减|成本下降|decline|drop|churn|cost cut/i, 'trending-down'],
  [/盈利|利润|资金|现金|融资|预算|定价|估值|财务|profit|ebit|margin|cash|fund|budget|cost|price|finance/i, 'coins'],
  [/银行|宏观|政策|监管|财政|合规审计|bank|macro|policy|fed|fiscal/i, 'bank'],
  [/目标|战略|愿景|北极星|焦点|定位|target|strategy|goal|okr|focus|mission/i, 'target'],
  [/方向|路线|导航|蓝图|规划|compass|roadmap|direction|blueprint/i, 'compass'],
  [/发布|上线|增长引擎|加速|启动|突破|launch|rocket|accelerate|scale|go-live/i, 'rocket'],
  [/领先|第一|冠|标杆|荣誉|壁垒|leader|win|award|champion|top/i, 'trophy'],
  [/安全|风控|防御|防护|合规|隐私|零信任|security|risk|compliance|shield|guard|privacy|audit/i, 'shield'],
  [/加密|权限|鉴权|认证|密钥|auth|lock|encrypt|sso|rbac/i, 'lock'],
  [/智能体|大模型|模型|算法|AI|LLM|agent|bot|copilot|gpt|neural/i, 'bot'],
  [/算力|芯片|推理|引擎|内核|硬件|gpu|cpu|compute|inference|engine|chip|kernel/i, 'cpu'],
  [/云|多云|云原生|弹性|cloud|saas|k8s|serverless/i, 'cloud'],
  [/数据|缓存|库|仓|知识库|检索|kv|sql|database|data|lake|rag|cache|storage/i, 'database'],
  [/架构|分层|底座|平台|生态|模块|layer|architecture|platform|stack|ecosystem/i, 'layers'],
  [/代码|研发|工程|开发|SDK|API|code|dev|sdk|api|engineer/i, 'code'],
  [/编排|流程|工作流|自动化|链路|管道|workflow|pipeline|orchestrat|flow|process/i, 'workflow'],
  [/性能|速度|延迟|毫秒|吞吐|实时|闪电|fast|latency|speed|realtime|zap|turbo|throughput/i, 'zap'],
  [/体验|创新|亮点|灵感|创意|洞察|insight|idea|spark|magic|innovat|ai/i, 'spark'],
  [/网络|互联|全球|出海|节点|生态网|network|global|world|intl|connect|mesh/i, 'globe'],
  [/组织|团队|客户|用户|人才|协同|合作|team|user|customer|org|people|talent|partner/i, 'users'],
  [/时间|周期|排期|节奏|效率|时长|clock|time|pace|schedule|sla/i, 'clock'],
  [/里程碑|节点|日期|季度|年度|calendar|milestone|quarter|timeline/i, 'calendar'],
  [/交付|验证|验收|通过|质量|门禁|check|verify|quality|pass|done|deliver/i, 'check-circle'],
  [/告警|痛点|瓶颈|阻塞|挑战|风险点|warning|alert|pain|blocker|bottleneck|challenge/i, 'alert'],
  [/图表|指标|统计|量化|看板|chart|metric|kpi|analytics|dashboard/i, 'chart-bar'],
  [/份额|占比|结构|分布|share|ratio|percent|mix|segment/i, 'chart-pie'],
  [/转化|漏斗|获客|留存|funnel|conversion|retention|acquisition/i, 'funnel'],
  [/学术|论文|文献|出版|研报|书籍|paper|citation|book|journal|report|study/i, 'book'],
  [/教育|培训|高校|答辩|课程|edu|campus|defense|thesis|course|train/i, 'graduation'],
  [/实验|科研|生物|化学|实验室|lab|research|experiment|bio|clinical|science/i, 'microscope'],
  [/医疗|健康|临床|医药|medical|health|clinic|care|pharma/i, 'stethoscope'],
  [/绿色|碳中和|能源|环保|ESG|可持续|green|esg|carbon|sustain|clean|solar/i, 'leaf'],
  [/品牌|营销|传播|声量|市场|marketing|brand|campaign|gtm|voice/i, 'megaphone'],
  [/供应|物流|交付链|产品|打包|package|supply|product|bundle|ship/i, 'package'],
  [/运维|迭代|闭环|循环|优化|refresh|loop|cycle|ops|iterat/i, 'refresh'],
  [/工具|治理|配置|调优|sliders|config|tune|control|governance/i, 'sliders'],
  [/价值|高端|旗舰|核心|奢华|diamond|value|premium|core|flagship/i, 'diamond'],
  [/旗帜|目标|里程|flag|goal|victory/i, 'flag'],
]

const FALLBACK_CYCLE = ['spark', 'layers', 'target', 'zap', 'compass', 'shield', 'trending-up', 'cpu']

export function normalizeIconName(name) {
  const raw = String(name ?? '').trim().toLowerCase().replace(/[_\s]+/g, '-')
  if (!raw || raw === 'none' || raw === 'false') return ''
  if (ICON_SET.has(raw)) return raw
  const aliases = {
    chart: 'chart-bar',
    bar: 'chart-bar',
    pie: 'chart-pie',
    up: 'trending-up',
    'chart-up': 'trending-up',
    growth: 'trending-up',
    down: 'trending-down',
    'chart-down': 'trending-down',
    money: 'coins',
    dollar: 'coins',
    revenue: 'coins',
    finance: 'coins',
    profit: 'coins',
    cash: 'coins',
    cost: 'coins',
    ai: 'bot',
    llm: 'bot',
    security: 'shield',
    safety: 'shield',
    compliance: 'shield',
    speed: 'zap',
    bolt: 'zap',
    battery: 'zap',
    energy: 'zap',
    power: 'zap',
    performance: 'zap',
    team: 'users',
    people: 'users',
    check: 'check-circle',
    done: 'check-circle',
    warning: 'alert',
    idea: 'lightbulb',
    bulb: 'lightbulb',
    world: 'globe',
    earth: 'globe',
    network: 'globe',
    db: 'database',
    flow: 'workflow',
    pipeline: 'workflow',
    process: 'workflow',
    chip: 'cpu',
    compute: 'cpu',
    gpu: 'cpu',
    launch: 'rocket',
    deploy: 'rocket',
    magic: 'spark',
    sparkles: 'spark',
    med: 'stethoscope',
    health: 'stethoscope',
    eco: 'leaf',
    esg: 'leaf',
    science: 'microscope',
    edu: 'graduation',
  }
  return aliases[raw] || ''
}

export function resolveSemanticIcon(itemOrText, fallbackIndex = 0) {
  if (itemOrText && typeof itemOrText === 'object') {
    const explicit = String(itemOrText.icon ?? '').trim()
    if (explicit && explicit !== 'auto') {
      const norm = normalizeIconName(explicit)
      if (norm) return norm
    }
    const text = [itemOrText.tag, itemOrText.title, itemOrText.text].filter(Boolean).join(' ')
    for (const [re, iconName] of SEMANTIC_ICON_RULES) {
      if (re.test(text)) return iconName
    }
    return FALLBACK_CYCLE[Math.abs(fallbackIndex) % FALLBACK_CYCLE.length]
  }
  const str = String(itemOrText ?? '')
  const direct = normalizeIconName(str)
  if (direct) return direct
  for (const [re, iconName] of SEMANTIC_ICON_RULES) {
    if (re.test(str)) return iconName
  }
  return FALLBACK_CYCLE[Math.abs(fallbackIndex) % FALLBACK_CYCLE.length]
}

// ---------------------------------------------------------------------------
// 3. HTML SVG 与 PPTX 原生 <a:custGeom> 同构渲染器
// ---------------------------------------------------------------------------

export function renderIconSvg(iconName, options = {}) {
  const key = normalizeIconName(iconName) || 'spark'
  const paths = RAW_ICONS[key] || RAW_ICONS.spark
  const size = options.size ?? 20
  const strokeWidth = options.strokeWidth ?? 1.9
  const cls = options.className ? ` ${options.className}` : ''
  const pathEls = paths
    .map((d) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('')
  return `<svg class="deck-icon${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${pathEls}</svg>`
}

export function renderIconBadgeHtml(iconName, options = {}) {
  const style = options.style || 'soft' // 'soft' | 'ring' | 'bare' | 'solid'
  const size = options.size ?? 18
  return `<span class="deck-icon-badge deck-icon-badge--${style}" aria-hidden="true">${renderIconSvg(iconName, { size })}</span>`
}

/**
 * 输出 100% 原生可编辑 PowerPoint DrawingML <p:sp><a:custGeom> 线性矢量图标。
 */
export function ooxmlVectorIcon(id, name, boxIn, iconName, options = {}) {
  const key = normalizeIconName(iconName) || 'spark'
  const paths = RAW_ICONS[key] || RAW_ICONS.spark
  const stroke = options.color || '#0057B8'
  const strokePt = options.strokePt ?? 1.55
  const b = boxToEmu(boxIn)
  const pathsXml = paths
    .map((d) => `<a:path w="${24 * SCALE}" h="${24 * SCALE}" fill="none">${svgPathToOoxmlCommands(d)}</a:path>`)
    .join('')

  return (
    '<p:sp>' +
    '<p:nvSpPr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr>' +
    '<a:xfrm><a:off x="' + b.x + '" y="' + b.y + '"/><a:ext cx="' + Math.max(12700, b.w) + '" cy="' + Math.max(12700, b.h) + '"/></a:xfrm>' +
    '<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="l" t="t" r="r" b="b"/>' +
    '<a:pathLst>' + pathsXml + '</a:pathLst></a:custGeom>' +
    '<a:noFill/>' +
    '<a:ln w="' + ptToEmu(strokePt) + '" cap="rnd">' + ooxmlSolidFill(stroke) + '<a:round/></a:ln>' +
    '</p:spPr>' +
    '<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>' +
    '</p:sp>'
  )
}

/**
 * 渲染带可选精致底托（soft / ring / bare / solid）的矢量图标徽章（PPTX 原生形状组合）。
 */
export function renderIconBadgePptx(namePrefix, boxIn, iconName, nextIdFn, theme, options = {}) {
  const tk = theme.tokens
  const style = options.style || 'soft'
  const color = options.color || (style === 'solid' ? tk.inkOnAccent : tk.accentPrimary)
  const shapes = []

  if (style === 'soft') {
    shapes.push(ooxmlShape(nextIdFn(), namePrefix + ' Plate', boxIn, {
      preset: 'roundRect',
      adj: roundRectAdj(boxIn.w, boxIn.h, options.radiusPx ?? 10),
      fill: options.bg || tk.accentSoft,
      stroke: theme.dark ? tk.accentPrimary : '',
      strokePt: theme.dark ? 0.5 : 0,
    }))
  } else if (style === 'ring') {
    shapes.push(ooxmlShape(nextIdFn(), namePrefix + ' Ring', boxIn, {
      preset: 'roundRect',
      adj: roundRectAdj(boxIn.w, boxIn.h, options.radiusPx ?? 10),
      fill: '',
      stroke: options.stroke || tk.accentPrimary,
      strokePt: 0.9,
    }))
  } else if (style === 'solid') {
    shapes.push(ooxmlShape(nextIdFn(), namePrefix + ' Solid Plate', boxIn, {
      preset: 'roundRect',
      adj: roundRectAdj(boxIn.w, boxIn.h, options.radiusPx ?? 10),
      fill: options.bg || tk.accentPrimary,
    }))
  }

  const inset = style === 'bare' ? 0.02 : Math.min(boxIn.w, boxIn.h) * 0.22
  const iconBox = {
    x: boxIn.x + inset,
    y: boxIn.y + inset,
    w: Math.max(0.14, boxIn.w - inset * 2),
    h: Math.max(0.14, boxIn.h - inset * 2),
  }
  shapes.push(ooxmlVectorIcon(nextIdFn(), namePrefix + ' Icon ' + iconName, iconBox, iconName, {
    color,
    strokePt: options.strokePt ?? (style === 'bare' ? 1.7 : 1.45),
  }))
  return shapes.join('')
}

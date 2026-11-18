/**
 * deck-themes.mjs —— dsh-ppt 的 18 套大师视觉主题、18 语义设计 Token、
 * 6 套差异化母版骨架（Chrome Skeleton）、WCAG 对比度求解器、
 * 外源 PPTX 主题净化器与跨平台零缺字字体映射系统。
 *
 * 零外部运行时依赖，仅使用 Node 内置模块。
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath, join as joinPath } from 'node:path'

// ---------------------------------------------------------------------------
// 色彩空间、WCAG 对比度与确定性净化数学工具
// ---------------------------------------------------------------------------

export function normalizeHex(input, fallback = '#000000') {
  const raw = String(input ?? '').trim().replace(/^#/, '')
  if (/^[\da-fA-F]{3}$/.test(raw)) {
    return '#' + raw.split('').map((c) => c + c).join('').toUpperCase()
  }
  if (/^[\da-fA-F]{6}$/.test(raw)) {
    return '#' + raw.toUpperCase()
  }
  if (/^[\da-fA-F]{8}$/.test(raw)) {
    return '#' + raw.slice(0, 6).toUpperCase()
  }
  return fallback.toUpperCase()
}

export function hexToRgb(hex) {
  const clean = normalizeHex(hex).slice(1)
  const num = Number.parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

export function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
  return '#' + [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

export function rgbToHsl(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
        break
      case gn:
        h = ((bn - rn) / d + 2) / 6
        break
      default:
        h = ((rn - gn) / d + 4) / 6
        break
    }
  }
  return { h: h * 360, s, l }
}

export function hslToRgb(h, s, l) {
  const hn = (((h % 360) + 360) % 360) / 360
  const sn = Math.max(0, Math.min(1, s))
  const ln = Math.max(0, Math.min(1, l))
  if (sn === 0) {
    const v = Math.round(ln * 255)
    return { r: v, g: v, b: v }
  }
  const hue2rgb = (p, q, t) => {
    let tn = t
    if (tn < 0) tn += 1
    if (tn > 1) tn -= 1
    if (tn < 1 / 6) return p + (q - p) * 6 * tn
    if (tn < 1 / 2) return q
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6
    return p
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q
  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  }
}

export function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHsl(r, g, b)
}

export function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const lin = (c) => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA)
  const lb = relativeLuminance(hexB)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function mixHex(hexA, hexB, weightB = 0.5) {
  const t = Math.max(0, Math.min(1, weightB))
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  return rgbToHex(
    a.r * (1 - t) + b.r * t,
    a.g * (1 - t) + b.g * t,
    a.b * (1 - t) + b.b * t,
  )
}

function adjustLightness(hex, deltaL) {
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, s, Math.max(0, Math.min(1, l + deltaL)))
}

function clampHslColor(hex, { minL = 0, maxL = 1, maxS = 1 } = {}) {
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, Math.min(s, maxS), Math.max(minL, Math.min(maxL, l)))
}

/**
 * 16 步二分法对比度求解器：钳制过饱和荧光色并调整亮度直至满足 WCAG 目标对比度。
 */
export function ensureContrast(hex, bgHex, minCR = 4.5, maxSaturation = 0.82) {
  const bg = normalizeHex(bgHex, '#FFFFFF')
  const start = normalizeHex(hex, '#0057B8')
  const hsl = hexToHsl(start)
  const cappedS = Math.min(hsl.s, maxSaturation)
  const cappedHex = hslToHex(hsl.h, cappedS, hsl.l)
  if (contrastRatio(cappedHex, bg) >= minCR) return cappedHex

  const bgLum = relativeLuminance(bg)
  const goDarker = bgLum >= 0.42
  let low = goDarker ? 0 : hsl.l
  let high = goDarker ? hsl.l : 1
  let best = goDarker ? '#000000' : '#FFFFFF'
  // Check whether target direction can reach minCR; if not, flip search direction
  const extreme = hslToHex(hsl.h, cappedS, goDarker ? 0.02 : 0.98)
  if (contrastRatio(extreme, bg) < minCR) {
    return bgLum >= 0.42 ? '#0F172A' : '#F8FAFC'
  }
  best = extreme
  for (let step = 0; step < 16; step += 1) {
    const mid = (low + high) / 2
    const candidate = hslToHex(hsl.h, cappedS, mid)
    if (contrastRatio(candidate, bg) >= minCR) {
      best = candidate
      if (goDarker) low = mid
      else high = mid
    } else {
      if (goDarker) high = mid
      else low = mid
    }
  }
  return best
}

function colorDistance(hexA, hexB) {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b)
}

function hueDelta(hexA, hexB) {
  const ha = hexToHsl(hexA).h
  const hb = hexToHsl(hexB).h
  const diff = Math.abs(ha - hb) % 360
  return diff > 180 ? 360 - diff : diff
}

// ---------------------------------------------------------------------------
// 跨平台安全字体栈与零缺字 PPTX 字体解析
// ---------------------------------------------------------------------------

const SANS_STACK = '"Inter", "Segoe UI", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
const GEOMETRIC_SANS_STACK = '"Avenir Next", "Segoe UI", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
const DISPLAY_SANS_STACK = '"Segoe UI", "Helvetica Neue", "Arial Black", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'
const SERIF_HEADING_STACK = 'Georgia, "Times New Roman", "Songti SC", "Noto Serif CJK SC", "Microsoft YaHei", serif'

const BITMAP_SERIF_FONT_RE = /^(?:SimSun|NSimSun|宋体|新宋体|FangSong|仿宋)$/i
const NOVELTY_FONT_RE = /^(?:Impact|Comic Sans MS|Papyrus)$/i

export function pptxFontName(value, platform = process.platform) {
  const names = String(value ?? '')
    .split(',')
    .map((name) => name.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
  if (names.length === 1 && !['serif', 'sans-serif', 'system-ui', 'monospace'].includes(names[0].toLowerCase())) {
    const single = names[0]
    if (BITMAP_SERIF_FONT_RE.test(single)) {
      return platform === 'win32' ? 'Microsoft YaHei' : platform === 'darwin' ? 'Songti SC' : 'Noto Serif CJK SC'
    }
    if (NOVELTY_FONT_RE.test(single) || /^(?:微软雅黑|黑体)$/i.test(single)) {
      return platform === 'win32' ? 'Microsoft YaHei' : platform === 'darwin' ? 'PingFang SC' : 'Noto Sans CJK SC'
    }
    if (platform === 'win32' && /^Songti SC$/i.test(single)) return 'Microsoft YaHei'
    if (platform === 'linux' && /^(Microsoft YaHei|PingFang SC|Songti SC|Segoe UI|Helvetica Neue|Avenir Next)$/i.test(single)) {
      return /Songti|Serif/i.test(single) ? 'Liberation Serif' : 'Liberation Sans'
    }
    return single
  }
  const available = platform === 'win32'
    ? ['Segoe UI', 'Georgia', 'Arial', 'Arial Black', 'Calibri', 'Times New Roman', 'Microsoft YaHei']
    : platform === 'darwin'
      ? ['Helvetica Neue', 'Avenir Next', 'Georgia', 'Arial', 'Times New Roman', 'PingFang SC', 'Songti SC']
      : ['Liberation Sans', 'Liberation Serif', 'Noto Sans', 'Noto Sans CJK SC', 'Noto Serif CJK SC']
  const hit = names.find((name) => available.includes(name))
  if (hit) return hit
  const isSerif = names.some((n) => /serif|Georgia|Times/i.test(n) && !/sans-serif/i.test(n))
  if (isSerif) return platform === 'linux' ? 'Liberation Serif' : 'Georgia'
  return platform === 'win32' ? 'Segoe UI' : platform === 'darwin' ? 'Helvetica Neue' : 'Liberation Sans'
}

/**
 * PPTX <a:ea> 东亚字体映射：
 * - win32 统一优先使用矢量平滑的 Microsoft YaHei（避免 SimSun 大字号点阵锯齿，且避免 macOS 专属 Songti SC 缺字）
 * - darwin 使用 PingFang SC / Songti SC
 * - linux 使用 Noto Sans CJK SC / Noto Serif CJK SC
 */
export function pptxEastAsianFont(value, platform = process.platform) {
  const names = String(value ?? '')
    .split(',')
    .map((name) => name.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
  if (names.length === 1) {
    const single = names[0]
    if (BITMAP_SERIF_FONT_RE.test(single)) {
      return platform === 'win32' ? 'Microsoft YaHei' : platform === 'darwin' ? 'Songti SC' : 'Noto Serif CJK SC'
    }
    if (NOVELTY_FONT_RE.test(single) || /^(?:微软雅黑|黑体)$/i.test(single)) {
      return platform === 'win32' ? 'Microsoft YaHei' : platform === 'darwin' ? 'PingFang SC' : 'Noto Sans CJK SC'
    }
    if (platform === 'win32' && /^(Microsoft YaHei|SimHei|KaiTi)$/i.test(single)) return single
    if (platform === 'darwin' && /^(PingFang SC|Songti SC|Heiti SC|Kaiti SC)$/i.test(single)) return single
    if (platform === 'linux' && /^Noto (Sans|Serif) CJK SC$/i.test(single)) return single
  }
  const font = pptxFontName(value, platform)
  const isSerif = /Georgia|Times New Roman|Cambria|Liberation Serif|Songti|Noto Serif/i.test(font) ||
    names.some((n) => /^serif$/i.test(n))
  if (platform === 'win32') return 'Microsoft YaHei'
  if (platform === 'darwin') return isSerif ? 'Songti SC' : 'PingFang SC'
  return isSerif ? 'Noto Serif CJK SC' : 'Noto Sans CJK SC'
}

// ---------------------------------------------------------------------------
// 6 套母版骨架（Chrome Skeleton）与 18 套内置大师主题定义（前 5 项兼容原顺序与色值）
// ---------------------------------------------------------------------------

export const CHROME_STYLES = Object.freeze([
  'consulting-classic',
  'keynote-spatial',
  'editorial-folio',
  'saas-bento',
  'academic-minimal',
  'gov-ceremonial',
])

const CHROME_STYLE_SET = new Set(CHROME_STYLES)

export function resolveChromeStyle(theme, slide = null, brand = null) {
  const candidates = [slide?.chrome, brand?.chromeStyle, theme?.chromeStyle]
  for (const cand of candidates) {
    if (typeof cand === 'string') {
      const clean = cand.trim()
      if (CHROME_STYLE_SET.has(clean)) return clean
    }
  }
  return 'consulting-classic'
}

function makeTheme(spec) {
  const {
    id,
    name,
    mood,
    bestFor,
    persona,
    dark,
    palette,
    tokens,
    fonts,
    radiusPx = 10,
    shadow = !dark,
    defaultTableStyle = 'consulting',
    chromeStyle = 'saas-bento',
  } = spec
  const canvas = normalizeHex(tokens.canvas ?? palette.bg)
  const surface1 = normalizeHex(tokens.surface1 ?? palette.panel)
  const surface2 = normalizeHex(tokens.surface2 ?? (dark ? mixHex(surface1, '#FFFFFF', 0.06) : mixHex(surface1, '#0F172A', 0.05)))
  const hairline = normalizeHex(tokens.hairline ?? (dark ? mixHex(canvas, '#FFFFFF', 0.16) : mixHex(canvas, '#0F172A', 0.14)))
  const inkPrimary = normalizeHex(tokens.inkPrimary ?? palette.fg)
  const inkSecondary = ensureContrast(tokens.inkSecondary ?? mixHex(inkPrimary, surface1, 0.24), surface1, 7.0)
  const inkMuted = ensureContrast(tokens.inkMuted ?? palette.muted, surface1, 4.6)
  const accentPrimary = normalizeHex(tokens.accentPrimary ?? palette.accent)
  const accentText = ensureContrast(tokens.accentText ?? accentPrimary, surface1, 4.6)
  const accentSecondary = normalizeHex(tokens.accentSecondary ?? palette.accent2)
  const accent2Text = ensureContrast(tokens.accent2Text ?? accentSecondary, surface1, 4.6)
  const inkOnAccent = normalizeHex(tokens.inkOnAccent ?? (relativeLuminance(accentPrimary) > 0.36 ? '#0F172A' : '#FFFFFF'))
  const accentSoft = normalizeHex(tokens.accentSoft ?? mixHex(canvas, accentPrimary, dark ? 0.18 : 0.10))
  const positive = normalizeHex(tokens.positive ?? ensureContrast(dark ? '#34D399' : '#0D7A4E', surface1, 4.5))
  const negative = normalizeHex(tokens.negative ?? ensureContrast(dark ? '#F87171' : '#C81E1E', surface1, 4.5))
  const warning = normalizeHex(tokens.warning ?? ensureContrast(dark ? '#FBBF24' : '#B45309', surface1, 4.5))
  const chartFocal = normalizeHex(tokens.chartFocal ?? accentPrimary)
  const chartNeutral = normalizeHex(tokens.chartNeutral ?? (dark ? '#2B354D' : '#CBD5E1'))
  const chartSeries = (tokens.chartSeries ?? [accentPrimary, accentSecondary, '#0E7490', '#4F46E5', '#0D7A4E', '#64748B']).map((c) => normalizeHex(c))
  const coverMode = tokens.coverMode ?? 'standard'
  const coverBg = normalizeHex(tokens.coverBg ?? (coverMode === 'inverted-accent' ? accentPrimary : canvas))

  return Object.freeze({
    id,
    name: Object.freeze(name),
    mood: Object.freeze(mood),
    bestFor: Object.freeze(bestFor),
    persona: persona ?? 'consulting',
    dark: Boolean(dark),
    radiusPx,
    shadow: Boolean(shadow),
    defaultTableStyle,
    chromeStyle,
    palette: Object.freeze({
      bg: normalizeHex(palette.bg),
      panel: normalizeHex(palette.panel),
      fg: normalizeHex(palette.fg),
      muted: normalizeHex(palette.muted),
      accent: normalizeHex(palette.accent),
      accent2: normalizeHex(palette.accent2),
    }),
    tokens: Object.freeze({
      canvas,
      surface1,
      surface2,
      hairline,
      inkPrimary,
      inkSecondary,
      inkMuted,
      inkOnAccent,
      accentPrimary,
      accentText,
      accentSecondary,
      accent2Text,
      accentSoft,
      positive,
      negative,
      warning,
      chartFocal,
      chartNeutral,
      chartSeries: Object.freeze(chartSeries),
      coverMode,
      coverBg,
    }),
    fonts: Object.freeze(fonts),
  })
}

export const THEMES = {
  // 0..4: Legacy 5 themes (exact order & exact palette hexes preserved for zero regression)
  swiss: makeTheme({
    id: 'swiss',
    name: { zh: '瑞士脉冲', en: 'Swiss Pulse' },
    mood: { zh: '精准、理性、数据', en: 'Precise, rational, data-driven' },
    bestFor: { zh: 'SaaS、数据、开发者工具', en: 'SaaS, data, developer tools' },
    persona: 'tech-pitch',
    dark: true,
    radiusPx: 8,
    shadow: false,
    chromeStyle: 'saas-bento',
    palette: {
      bg: '#10151B',
      panel: '#161D26',
      fg: '#F5F7FA',
      muted: '#8E9AAA',
      accent: '#2F6BFF',
      accent2: '#FFB300',
    },
    tokens: {
      canvas: '#10151B',
      surface1: '#161D26',
      surface2: '#1E2835',
      hairline: '#293646',
      inkPrimary: '#F5F7FA',
      inkSecondary: '#C2CCD8',
      inkMuted: '#8E9AAA',
      accentPrimary: '#2F6BFF',
      accentText: '#6B9BFF',
      accentSecondary: '#FFB300',
      accent2Text: '#FFC233',
      chartNeutral: '#2A3748',
      chartSeries: ['#2F6BFF', '#FFB300', '#22D3EE', '#34D399', '#F87171', '#94A3B8'],
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),
  velvet: makeTheme({
    id: 'velvet',
    name: { zh: '天鹅绒标准', en: 'Velvet Standard' },
    mood: { zh: '高级、克制、可信', en: 'Premium, restrained, trustworthy' },
    bestFor: { zh: '高管汇报、品牌、融资路演', en: 'Executive decks, brand, investor pitches' },
    persona: 'editorial',
    dark: true,
    radiusPx: 8,
    shadow: false,
    chromeStyle: 'editorial-folio',
    palette: {
      bg: '#111316',
      panel: '#1A1D22',
      fg: '#F4EFE6',
      muted: '#A79F91',
      accent: '#C9A84C',
      accent2: '#3D4A63',
    },
    tokens: {
      canvas: '#111316',
      surface1: '#1A1D22',
      surface2: '#23272F',
      hairline: '#2F3540',
      inkPrimary: '#F4EFE6',
      inkSecondary: '#CEC6B8',
      inkMuted: '#A79F91',
      accentPrimary: '#C9A84C',
      accentText: '#D6B862',
      accentSecondary: '#3D4A63',
      accent2Text: '#8FA5C7',
      chartNeutral: '#323842',
      chartSeries: ['#C9A84C', '#6C82A6', '#C87D65', '#6D9B87', '#9B8EC4', '#8A847C'],
    },
    fonts: { heading: SERIF_HEADING_STACK, body: SANS_STACK },
  }),
  data: makeTheme({
    id: 'data',
    name: { zh: '数据漂移', en: 'Data Drift' },
    mood: { zh: '未来、沉浸、前沿', en: 'Futuristic, immersive, cutting-edge' },
    bestFor: { zh: 'AI、数据、研究、技术发布', en: 'AI, data, research, tech launches' },
    persona: 'tech-pitch',
    dark: true,
    radiusPx: 10,
    shadow: false,
    chromeStyle: 'saas-bento',
    palette: {
      bg: '#070B14',
      panel: '#0D1424',
      fg: '#E8F1FF',
      muted: '#7E8BA8',
      accent: '#7C3AED',
      accent2: '#06B6D4',
    },
    tokens: {
      canvas: '#070B14',
      surface1: '#0D1424',
      surface2: '#152038',
      hairline: '#233252',
      inkPrimary: '#E8F1FF',
      inkSecondary: '#B5C5E0',
      inkMuted: '#8896B5',
      accentPrimary: '#7C3AED',
      accentText: '#A78BFA',
      accentSecondary: '#06B6D4',
      accent2Text: '#22D3EE',
      chartNeutral: '#253453',
      chartSeries: ['#7C3AED', '#06B6D4', '#60A5FA', '#34D399', '#F472B6', '#818CF8'],
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),
  soft: makeTheme({
    id: 'soft',
    name: { zh: '柔和信号', en: 'Soft Signal' },
    mood: { zh: '温暖、亲近、人本', en: 'Warm, intimate, human' },
    bestFor: { zh: '品牌故事、培训、个人分享', en: 'Brand stories, training, personal talks' },
    persona: 'education',
    dark: false,
    radiusPx: 12,
    shadow: true,
    chromeStyle: 'saas-bento',
    palette: {
      bg: '#FFF8EC',
      panel: '#FFF2DE',
      fg: '#3B2F2A',
      muted: '#7E6F68',
      accent: '#E58A2F',
      accent2: '#8FAF8C',
    },
    tokens: {
      canvas: '#FFF8EC',
      surface1: '#F7EEDF',
      surface2: '#EFE2CE',
      hairline: '#DED0BC',
      inkPrimary: '#3B2F2A',
      inkSecondary: '#54453E',
      inkMuted: '#6E5E57',
      accentPrimary: '#E58A2F',
      accentText: '#B35309',
      accentSecondary: '#8FAF8C',
      accent2Text: '#3E6644',
      chartNeutral: '#D8CBB8',
      chartSeries: ['#C86419', '#4D7358', '#2B5B84', '#9A3B26', '#7A5C3E', '#7D746D'],
    },
    fonts: { heading: GEOMETRIC_SANS_STACK, body: GEOMETRIC_SANS_STACK },
  }),
  bold: makeTheme({
    id: 'bold',
    name: { zh: '极繁大字', en: 'Maximalist Type' },
    mood: { zh: '大声、动能、发布', en: 'Loud, kinetic, launch' },
    bestFor: { zh: '产品发布、活动、品牌大事件', en: 'Product launches, events, brand moments' },
    persona: 'tech-pitch',
    dark: true,
    radiusPx: 6,
    shadow: false,
    chromeStyle: 'keynote-spatial',
    palette: {
      bg: '#0D0D0D',
      panel: '#181818',
      fg: '#FFFFFF',
      muted: '#B8B8B8',
      accent: '#E63946',
      accent2: '#FFD60A',
    },
    tokens: {
      canvas: '#0D0D0D',
      surface1: '#181818',
      surface2: '#222226',
      hairline: '#303036',
      inkPrimary: '#FFFFFF',
      inkSecondary: '#D4D4D8',
      inkMuted: '#A1A1AA',
      accentPrimary: '#E63946',
      accentText: '#FF6B76',
      accentSecondary: '#FFD60A',
      accent2Text: '#FFD60A',
      chartNeutral: '#32323A',
      chartSeries: ['#E63946', '#FFD60A', '#38BDF8', '#34D399', '#A855F7', '#71717A'],
    },
    fonts: { heading: DISPLAY_SANS_STACK, body: SANS_STACK },
  }),

  // 5..13: 9 High-Taste Daylight & Persona Signature Themes
  consulting: makeTheme({
    id: 'consulting',
    name: { zh: '蔚蓝战略', en: 'Strategy Navy' },
    mood: { zh: '权威、清晰、高管决策', en: 'Authoritative, crisp, executive strategy' },
    bestFor: { zh: '管理咨询、商业分析、经营汇报、项目复盘', en: 'Consulting, business reviews, strategy decks' },
    persona: 'consulting',
    dark: false,
    radiusPx: 8,
    shadow: false,
    defaultTableStyle: 'consulting',
    chromeStyle: 'consulting-classic',
    palette: {
      bg: '#FFFFFF',
      panel: '#F4F6F9',
      fg: '#0F172A',
      muted: '#5B6B82',
      accent: '#0057B8',
      accent2: '#0E7490',
    },
    tokens: {
      canvas: '#FFFFFF',
      surface1: '#F4F6F9',
      surface2: '#E9EEF5',
      hairline: '#D5DFEC',
      inkPrimary: '#0F172A',
      inkSecondary: '#334155',
      inkMuted: '#5B6B82',
      accentPrimary: '#0057B8',
      accentText: '#004C9E',
      accentSecondary: '#0E7490',
      accent2Text: '#0C637B',
      chartNeutral: '#CBD5E1',
      chartSeries: ['#0057B8', '#0E7490', '#1E293B', '#4F46E5', '#0D7A4E', '#64748B'],
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),
  'cobalt-cream': makeTheme({
    id: 'cobalt-cream',
    name: { zh: '钴蓝简报', en: 'Blue Professional' },
    mood: { zh: '理性纸感、现代简报、零阴影', en: 'Warm paper, crisp cobalt, zero-shadow precision' },
    bestFor: { zh: '产品方案、B2B提案、研究简报、技术方案', en: 'B2B proposals, product briefs, research memos' },
    persona: 'consulting',
    dark: false,
    radiusPx: 8,
    shadow: false,
    chromeStyle: 'consulting-classic',
    palette: {
      bg: '#FDFAE7',
      panel: '#F3F1E8',
      fg: '#111111',
      muted: '#5C5B55',
      accent: '#1E2BFA',
      accent2: '#0F6E56',
    },
    tokens: {
      canvas: '#FDFAE7',
      surface1: '#F3F1E8',
      surface2: '#E8E6DC',
      hairline: '#D0D0EC',
      inkPrimary: '#111111',
      inkSecondary: '#363632',
      inkMuted: '#5C5B55',
      accentPrimary: '#1E2BFA',
      accentText: '#1A25D9',
      accentSecondary: '#0F6E56',
      accent2Text: '#0D5E49',
      chartNeutral: '#CFCBC0',
      chartSeries: ['#1E2BFA', '#0F6E56', '#1E293B', '#B45309', '#9A3B26', '#64748B'],
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),
  'exec-jilan': makeTheme({
    id: 'exec-jilan',
    name: { zh: '霁蓝政务', en: 'Imperial Slate' },
    mood: { zh: '庄重、稳健、现代东方政务', en: 'Dignified, composed, modern institutional' },
    bestFor: { zh: '政企汇报、年度总结、述职报告、专项规划', en: 'Institutional reports, annual reviews, executive briefings' },
    persona: 'gov-exec',
    dark: false,
    radiusPx: 6,
    shadow: false,
    chromeStyle: 'gov-ceremonial',
    palette: {
      bg: '#F7F6F2',
      panel: '#EFECE6',
      fg: '#16243E',
      muted: '#5F6C80',
      accent: '#1A2B4C',
      accent2: '#9E1B1E',
    },
    tokens: {
      canvas: '#F7F6F2',
      surface1: '#EFECE6',
      surface2: '#E5E0D5',
      hairline: '#D4CEC3',
      inkPrimary: '#16243E',
      inkSecondary: '#3A4963',
      inkMuted: '#5F6C80',
      accentPrimary: '#1A2B4C',
      accentText: '#1A2B4C',
      accentSecondary: '#9E1B1E',
      accent2Text: '#9E1B1E',
      chartNeutral: '#C8C3B8',
      chartSeries: ['#1A2B4C', '#9E1B1E', '#2B5B84', '#8C6508', '#3D6B5E', '#7A869A'],
      coverMode: 'inverted-accent',
      coverBg: '#1A2B4C',
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),
  'exec-palace': makeTheme({
    id: 'exec-palace',
    name: { zh: '故宫丹宸', en: 'Palace Vermilion' },
    mood: { zh: '典雅庄严、丹红金线、宣纸浅底', en: 'Ceremonial vermilion cover with warm rice-paper body' },
    bestFor: { zh: '党建述职、重大表彰、文化工程、庆典汇报', en: 'Keynote ceremonies, cultural & institutional milestones' },
    persona: 'gov-exec',
    dark: false,
    radiusPx: 6,
    shadow: false,
    chromeStyle: 'gov-ceremonial',
    palette: {
      bg: '#F9F6F1',
      panel: '#F1ECE3',
      fg: '#231916',
      muted: '#6E5D56',
      accent: '#9E1B1E',
      accent2: '#8A6826',
    },
    tokens: {
      canvas: '#F9F6F1',
      surface1: '#F1ECE3',
      surface2: '#E7DFD3',
      hairline: '#D8CEBE',
      inkPrimary: '#231916',
      inkSecondary: '#4A3B36',
      inkMuted: '#6E5D56',
      accentPrimary: '#9E1B1E',
      accentText: '#8E171A',
      accentSecondary: '#8A6826',
      accent2Text: '#75571E',
      chartNeutral: '#CFC6BA',
      chartSeries: ['#9E1B1E', '#2C4A63', '#8A6826', '#4E6E5D', '#5C4B51', '#8C7B70'],
      coverMode: 'inverted-accent',
      coverBg: '#9E1B1E',
    },
    fonts: { heading: SERIF_HEADING_STACK, body: SANS_STACK },
  }),
  academic: makeTheme({
    id: 'academic',
    name: { zh: '清澄学术', en: 'ETH & Nature' },
    mood: { zh: '严谨、清澈、出版级学术规范', en: 'Rigorous, high-clarity, publication-grade' },
    bestFor: { zh: '论文答辩、开题报告、学术会议、科研组会', en: 'Thesis defense, academic talks, research seminars' },
    persona: 'academic',
    dark: false,
    radiusPx: 6,
    shadow: false,
    defaultTableStyle: 'booktabs',
    chromeStyle: 'academic-minimal',
    palette: {
      bg: '#FFFFFF',
      panel: '#F5F7FA',
      fg: '#111827',
      muted: '#596577',
      accent: '#006980',
      accent2: '#C8430E',
    },
    tokens: {
      canvas: '#FFFFFF',
      surface1: '#F5F7FA',
      surface2: '#EBF0F5',
      hairline: '#CBD5E1',
      inkPrimary: '#111827',
      inkSecondary: '#374151',
      inkMuted: '#596577',
      accentPrimary: '#006980',
      accentText: '#005A6E',
      accentSecondary: '#C8430E',
      accent2Text: '#B23A0B',
      chartNeutral: '#CBD5E1',
      chartSeries: ['#006980', '#C8430E', '#1E3A8A', '#2E7D32', '#6D28D9', '#52525B'],
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),
  'editorial-forest': makeTheme({
    id: 'editorial-forest',
    name: { zh: '森系社论', en: 'Editorial Forest' },
    mood: { zh: '人文杂志、衬线留白、沉静质感', en: 'Editorial serif, organic calm, generous whitespace' },
    bestFor: { zh: '品牌提案、文化策展、ESG报告、深度叙事', en: 'Brand strategy, ESG reports, cultural curation' },
    persona: 'editorial',
    dark: false,
    radiusPx: 8,
    shadow: false,
    chromeStyle: 'editorial-folio',
    palette: {
      bg: '#F4EFE4',
      panel: '#EAE2D3',
      fg: '#1A1A17',
      muted: '#615E55',
      accent: '#2E4A2A',
      accent2: '#A64B67',
    },
    tokens: {
      canvas: '#F4EFE4',
      surface1: '#EAE2D3',
      surface2: '#DFD5C3',
      hairline: '#C5BCAA',
      inkPrimary: '#1A1A17',
      inkSecondary: '#3F3E38',
      inkMuted: '#615E55',
      accentPrimary: '#2E4A2A',
      accentText: '#263E23',
      accentSecondary: '#E89CB1',
      accent2Text: '#9C3F5B',
      chartNeutral: '#C9C0AE',
      chartSeries: ['#2E4A2A', '#9C3F5B', '#2D4A5E', '#8C6239', '#556B52', '#7A756B'],
    },
    fonts: { heading: SERIF_HEADING_STACK, body: SANS_STACK },
  }),
  cartesian: makeTheme({
    id: 'cartesian',
    name: { zh: '暖石极简', en: 'Cartesian Stone' },
    mood: { zh: '建筑网格、0圆角锋利线条、克制优雅', en: 'Architectural hairline grid, zero-radius minimalism' },
    bestFor: { zh: '设计提案、建筑作品集、高端零售、战略宣言', en: 'Design portfolios, architecture, luxury & manifesto decks' },
    persona: 'editorial',
    dark: false,
    radiusPx: 0,
    shadow: false,
    defaultTableStyle: 'minimal',
    chromeStyle: 'editorial-folio',
    palette: {
      bg: '#F5F1EB',
      panel: '#EAE4DB',
      fg: '#1A1A1A',
      muted: '#635E57',
      accent: '#734B2F',
      accent2: '#2F4F4F',
    },
    tokens: {
      canvas: '#F5F1EB',
      surface1: '#EAE4DB',
      surface2: '#DFD7CB',
      hairline: '#B8B0A4',
      inkPrimary: '#1A1A1A',
      inkSecondary: '#403D39',
      inkMuted: '#635E57',
      accentPrimary: '#734B2F',
      accentText: '#664128',
      accentSecondary: '#2F4F4F',
      accent2Text: '#284545',
      chartNeutral: '#C9C1B6',
      chartSeries: ['#734B2F', '#2F4F4F', '#8C6239', '#4A5D73', '#5E5063', '#7D776D'],
    },
    fonts: { heading: SERIF_HEADING_STACK, body: SANS_STACK },
  }),
  'course-sage': makeTheme({
    id: 'course-sage',
    name: { zh: '知行讲义', en: 'Workshop Sage' },
    mood: { zh: '清晰易读、护眼低眩光、循序渐进', en: 'Low-glare clarity, structured learning progression' },
    bestFor: { zh: '教学课件、企业内训、工作坊、科普分享', en: 'Courseware, corporate training, workshops, tutorials' },
    persona: 'education',
    dark: false,
    radiusPx: 10,
    shadow: false,
    chromeStyle: 'academic-minimal',
    palette: {
      bg: '#FAFBF9',
      panel: '#F0F4F1',
      fg: '#182420',
      muted: '#5A6F67',
      accent: '#0F6E56',
      accent2: '#B45309',
    },
    tokens: {
      canvas: '#FAFBF9',
      surface1: '#F0F4F1',
      surface2: '#E3EBE6',
      hairline: '#C8D6CE',
      inkPrimary: '#182420',
      inkSecondary: '#384B44',
      inkMuted: '#5A6F67',
      accentPrimary: '#0F6E56',
      accentText: '#0C5C47',
      accentSecondary: '#B45309',
      accent2Text: '#9A4607',
      chartNeutral: '#CBD8D1',
      chartSeries: ['#0F6E56', '#B45309', '#1D4ED8', '#7C3AED', '#BE123C', '#576B63'],
    },
    fonts: { heading: GEOMETRIC_SANS_STACK, body: GEOMETRIC_SANS_STACK },
  }),
  'linear-dark': makeTheme({
    id: 'linear-dark',
    name: { zh: '黑曜石路演', en: 'Obsidian Keynote' },
    mood: { zh: '1px微描边层级、Apple/Linear式科技质感', en: 'Keynote dark elevation, crisp 1px hairlines' },
    bestFor: { zh: '科技发布会、AI产品路演、融资Deck、开发者大会', en: 'Product keynotes, AI launches, VC pitch decks' },
    persona: 'tech-pitch',
    dark: true,
    radiusPx: 12,
    shadow: false,
    chromeStyle: 'saas-bento',
    palette: {
      bg: '#090B10',
      panel: '#11151F',
      fg: '#F3F6FC',
      muted: '#8A96AC',
      accent: '#5E81F4',
      accent2: '#38BDF8',
    },
    tokens: {
      canvas: '#090B10',
      surface1: '#11151F',
      surface2: '#181E2C',
      hairline: '#232B3E',
      inkPrimary: '#F3F6FC',
      inkSecondary: '#B8C2D4',
      inkMuted: '#8A96AC',
      accentPrimary: '#5E81F4',
      accentText: '#7C9BFF',
      accentSecondary: '#38BDF8',
      accent2Text: '#38BDF8',
      chartNeutral: '#2B354D',
      chartSeries: ['#5E81F4', '#38BDF8', '#A78BFA', '#34D399', '#FBBF24', '#64748B'],
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),

  // 14..17: 4 Signature World-Class Themes (Keynote, FT Financial, Clinical Medical, Luxury Noir)
  'keynote-light': makeTheme({
    id: 'keynote-light',
    name: { zh: '苹果极简白', en: 'Keynote Spatial Light' },
    mood: { zh: 'Apple空间留白、无框空气感、极致纯净', en: 'Apple spatial whitespace, borderless purity, airy clarity' },
    bestFor: { zh: '旗舰产品发布、设计哲学演讲、高管主题演讲', en: 'Flagship launches, design keynotes, executive talks' },
    persona: 'tech-pitch',
    dark: false,
    radiusPx: 16,
    shadow: false,
    chromeStyle: 'keynote-spatial',
    palette: {
      bg: '#FFFFFF',
      panel: '#F5F5F7',
      fg: '#1D1D1F',
      muted: '#6E6E73',
      accent: '#0066CC',
      accent2: '#5E5CE6',
    },
    tokens: {
      canvas: '#FFFFFF',
      surface1: '#F5F5F7',
      surface2: '#EAEAEF',
      hairline: '#D2D2D7',
      inkPrimary: '#1D1D1F',
      inkSecondary: '#424245',
      inkMuted: '#6E6E73',
      accentPrimary: '#0066CC',
      accentText: '#0055B3',
      accentSecondary: '#5E5CE6',
      accent2Text: '#4947C2',
      chartNeutral: '#D2D2D7',
      chartSeries: ['#0066CC', '#5E5CE6', '#0F766E', '#D97706', '#DC2626', '#6E6E73'],
    },
    fonts: { heading: GEOMETRIC_SANS_STACK, body: SANS_STACK },
  }),
  'financial-ft': makeTheme({
    id: 'financial-ft',
    name: { zh: '金融时报粉', en: 'FT Salmon Financial' },
    mood: { zh: '财经权威纸感、锋利直角、深海蓝与酒红双色', en: 'FT salmon paper authority, sharp corners, deep teal & claret' },
    bestFor: { zh: '季度财报、投行路演、宏观研究、CFO经营复盘', en: 'Earnings decks, investment banking, macro research, CFO reviews' },
    persona: 'consulting',
    dark: false,
    radiusPx: 0,
    shadow: false,
    defaultTableStyle: 'consulting',
    chromeStyle: 'consulting-classic',
    palette: {
      bg: '#FFF1E5',
      panel: '#F6E3D2',
      fg: '#1A1817',
      muted: '#5F544C',
      accent: '#0D3D56',
      accent2: '#990F3D',
    },
    tokens: {
      canvas: '#FFF1E5',
      surface1: '#F6E3D2',
      surface2: '#ECD3BE',
      hairline: '#D8BFA9',
      inkPrimary: '#1A1817',
      inkSecondary: '#3E3834',
      inkMuted: '#5F544C',
      accentPrimary: '#0D3D56',
      accentText: '#0D3D56',
      accentSecondary: '#990F3D',
      accent2Text: '#990F3D',
      chartNeutral: '#D2BAA5',
      chartSeries: ['#0D3D56', '#990F3D', '#0F766E', '#B45309', '#4F46E5', '#6B5E54'],
    },
    fonts: { heading: SERIF_HEADING_STACK, body: SANS_STACK },
  }),
  'medical-clean': makeTheme({
    id: 'medical-clean',
    name: { zh: '循证医学蓝绿', en: 'Clinical Evidence Teal' },
    mood: { zh: '高洁净临床严谨感、蓝绿理性配色、三线表规范', en: 'Clinical precision, antiseptic clarity, publication-grade rigor' },
    bestFor: { zh: '医学病例汇报、临床试验、生物医药路演、科研进展', en: 'Clinical cases, biomedical trials, healthcare research' },
    persona: 'academic',
    dark: false,
    radiusPx: 8,
    shadow: false,
    defaultTableStyle: 'booktabs',
    chromeStyle: 'academic-minimal',
    palette: {
      bg: '#F8FAFC',
      panel: '#EEF5F7',
      fg: '#0F172A',
      muted: '#526478',
      accent: '#0F766E',
      accent2: '#0284C7',
    },
    tokens: {
      canvas: '#F8FAFC',
      surface1: '#EEF5F7',
      surface2: '#E1ECEF',
      hairline: '#CBD8DE',
      inkPrimary: '#0F172A',
      inkSecondary: '#334155',
      inkMuted: '#526478',
      accentPrimary: '#0F766E',
      accentText: '#0D665F',
      accentSecondary: '#0284C7',
      accent2Text: '#0369A1',
      chartNeutral: '#CBD5E1',
      chartSeries: ['#0F766E', '#0284C7', '#1E3A8A', '#B45309', '#BE123C', '#64748B'],
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),
  'luxury-noir': makeTheme({
    id: 'luxury-noir',
    name: { zh: '黑金典藏', en: 'Luxury Noir Gold' },
    mood: { zh: '黑金杂志书脊、衬线排印、高奢品牌与白皮书', en: 'Noir gold editorial folio, serif authority, luxury lookbook' },
    bestFor: { zh: '高奢品牌画册、创意作品集、年度白皮书、高端峰会', en: 'Luxury lookbooks, creative portfolios, flagship annual books' },
    persona: 'editorial',
    dark: true,
    radiusPx: 0,
    shadow: false,
    defaultTableStyle: 'minimal',
    chromeStyle: 'editorial-folio',
    palette: {
      bg: '#0B0B0D',
      panel: '#151519',
      fg: '#F5F2EB',
      muted: '#A09A8E',
      accent: '#D4AF37',
      accent2: '#8FA3BF',
    },
    tokens: {
      canvas: '#0B0B0D',
      surface1: '#151519',
      surface2: '#1F1F26',
      hairline: '#2D2C33',
      inkPrimary: '#F5F2EB',
      inkSecondary: '#D2CCC0',
      inkMuted: '#A09A8E',
      accentPrimary: '#D4AF37',
      accentText: '#E0BE4C',
      accentSecondary: '#8FA3BF',
      accent2Text: '#9EB3CF',
      chartNeutral: '#2C2C34',
      chartSeries: ['#D4AF37', '#8FA3BF', '#C87D65', '#6D9B87', '#B695C0', '#8A847C'],
    },
    fonts: { heading: SERIF_HEADING_STACK, body: SANS_STACK },
  }),

  // 18..23: 6 Absorbed World-Class Benchmark Themes (BCG, Economist, Venture Daylight, Stripe Craft, Aurora, Terminal)
  'bcg-emerald': makeTheme({
    id: 'bcg-emerald',
    name: { zh: '翡翠战略', en: 'Emerald Strategy' },
    mood: { zh: '顶级绿金咨询、增长转型、锋利高管矩阵', en: 'BCG-grade emerald authority, growth & sustainability' },
    bestFor: { zh: '增长战略、业务转型、ESG双碳、OKR季度复盘', en: 'Growth strategy, ESG transformation, quarterly OKR reviews' },
    persona: 'consulting',
    dark: false,
    radiusPx: 4,
    shadow: false,
    defaultTableStyle: 'consulting',
    chromeStyle: 'consulting-classic',
    palette: {
      bg: '#FFFFFF',
      panel: '#F1F7F4',
      fg: '#0D1F18',
      muted: '#4A6157',
      accent: '#006B54',
      accent2: '#0F4C81',
    },
    tokens: {
      canvas: '#FFFFFF',
      surface1: '#F1F7F4',
      surface2: '#E3EFE9',
      hairline: '#C8DDD3',
      inkPrimary: '#0D1F18',
      inkSecondary: '#2C4239',
      inkMuted: '#4A6157',
      accentPrimary: '#006B54',
      accentText: '#005A46',
      accentSecondary: '#0F4C81',
      accent2Text: '#0D416E',
      chartNeutral: '#C9D8D0',
      chartSeries: ['#006B54', '#0F4C81', '#1F2937', '#0D9488', '#B45309', '#64748B'],
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),
  'economist-brief': makeTheme({
    id: 'economist-brief',
    name: { zh: '社论红标', en: 'Economist Briefing' },
    mood: { zh: '经济学人红标书脊、智库级图表、衬线洞察', en: 'Economist red-tab folio, think-tank rigor, editorial serif' },
    bestFor: { zh: '行业研究、宏观洞察、智库白皮书、并购尽调', en: 'Macro briefings, industry research, think-tank & M&A memos' },
    persona: 'consulting',
    dark: false,
    radiusPx: 0,
    shadow: false,
    defaultTableStyle: 'booktabs',
    chromeStyle: 'editorial-folio',
    palette: {
      bg: '#F9F8F5',
      panel: '#F0EDE6',
      fg: '#141413',
      muted: '#57534B',
      accent: '#C8102E',
      accent2: '#1D3557',
    },
    tokens: {
      canvas: '#F9F8F5',
      surface1: '#F0EDE6',
      surface2: '#E5E0D6',
      hairline: '#CFC8BA',
      inkPrimary: '#141413',
      inkSecondary: '#383631',
      inkMuted: '#57534B',
      accentPrimary: '#C8102E',
      accentText: '#A60D25',
      accentSecondary: '#1D3557',
      accent2Text: '#1D3557',
      chartNeutral: '#CCC5B7',
      chartSeries: ['#C8102E', '#1D3557', '#0F766E', '#6D4C3D', '#3B5998', '#6B665E'],
    },
    fonts: { heading: SERIF_HEADING_STACK, body: SANS_STACK },
  }),
  'venture-daylight': makeTheme({
    id: 'venture-daylight',
    name: { zh: '硅谷创投白', en: 'Venture Daylight' },
    mood: { zh: '红杉/YC日间阅读风、清爽高锐度、数据抓手', en: 'Sequoia/YC partner-memo clarity, crisp daylight pitch' },
    bestFor: { zh: '创投BP（邮件/iPad阅读版）、商业计划书、新业务立项', en: 'Daylight investor decks, partner memos, venture proposals' },
    persona: 'tech-pitch',
    dark: false,
    radiusPx: 12,
    shadow: false,
    defaultTableStyle: 'consulting',
    chromeStyle: 'keynote-spatial',
    palette: {
      bg: '#FFFFFF',
      panel: '#F6F7F9',
      fg: '#111827',
      muted: '#525B66',
      accent: '#C2410C',
      accent2: '#0F766E',
    },
    tokens: {
      canvas: '#FFFFFF',
      surface1: '#F6F7F9',
      surface2: '#ECEEF2',
      hairline: '#D8DEE4',
      inkPrimary: '#111827',
      inkSecondary: '#374151',
      inkMuted: '#525B66',
      accentPrimary: '#C2410C',
      accentText: '#9A3412',
      accentSecondary: '#0F766E',
      accent2Text: '#0D655E',
      chartNeutral: '#CBD5E1',
      chartSeries: ['#C2410C', '#0F766E', '#1E3A8A', '#7C3AED', '#B45309', '#64748B'],
    },
    fonts: { heading: GEOMETRIC_SANS_STACK, body: SANS_STACK },
  }),
  'stripe-craft': makeTheme({
    id: 'stripe-craft',
    name: { zh: '极光产研', en: 'Product Indigo' },
    mood: { zh: 'Stripe/Vercel工程美学、1px精密Bento、清透靛蓝', en: 'Stripe/Vercel product craft, crisp 1px Bento hairlines' },
    bestFor: { zh: 'PRD产品评审、SaaS方案、开发者平台、AI工程复盘', en: 'Product reviews, SaaS roadmaps, developer platforms, AI eng' },
    persona: 'tech-pitch',
    dark: false,
    radiusPx: 10,
    shadow: false,
    defaultTableStyle: 'consulting',
    chromeStyle: 'saas-bento',
    palette: {
      bg: '#F8FAFC',
      panel: '#EFF3F9',
      fg: '#0F172A',
      muted: '#4E5D73',
      accent: '#4F46E5',
      accent2: '#0284C7',
    },
    tokens: {
      canvas: '#F8FAFC',
      surface1: '#EFF3F9',
      surface2: '#E2E9F3',
      hairline: '#CBD5E1',
      inkPrimary: '#0F172A',
      inkSecondary: '#334155',
      inkMuted: '#4E5D73',
      accentPrimary: '#4F46E5',
      accentText: '#3730A3',
      accentSecondary: '#0284C7',
      accent2Text: '#0369A1',
      chartNeutral: '#CBD5E1',
      chartSeries: ['#4F46E5', '#0284C7', '#0D9488', '#7C3AED', '#D97706', '#64748B'],
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),
  'aurora-stage': makeTheme({
    id: 'aurora-stage',
    name: { zh: '极光发布会', en: 'Aurora Keynote' },
    mood: { zh: '深海极光青紫、无框空间悬浮、算力与硬件大秀', en: 'Deep midnight aurora teal & indigo, spatial keynote stage' },
    bestFor: { zh: 'AI基础设施发布、大模型演进、芯片/硬件主题演讲', en: 'AI infra keynotes, foundation model launches, hardware talks' },
    persona: 'tech-pitch',
    dark: true,
    radiusPx: 16,
    shadow: false,
    chromeStyle: 'keynote-spatial',
    palette: {
      bg: '#070B14',
      panel: '#101726',
      fg: '#F1F5F9',
      muted: '#94A3B8',
      accent: '#2DD4BF',
      accent2: '#818CF8',
    },
    tokens: {
      canvas: '#070B14',
      surface1: '#101726',
      surface2: '#192338',
      hairline: '#26344E',
      inkPrimary: '#F1F5F9',
      inkSecondary: '#CBD5E1',
      inkMuted: '#94A3B8',
      accentPrimary: '#2DD4BF',
      accentText: '#2DD4BF',
      accentSecondary: '#818CF8',
      accent2Text: '#A5B4FC',
      chartNeutral: '#293856',
      chartSeries: ['#2DD4BF', '#818CF8', '#38BDF8', '#F472B6', '#FBBF24', '#64748B'],
    },
    fonts: { heading: GEOMETRIC_SANS_STACK, body: SANS_STACK },
  }),
  'obsidian-amber': makeTheme({
    id: 'obsidian-amber',
    name: { zh: '黑曜终端', en: 'Terminal Amber' },
    mood: { zh: '彭博终端琥珀金、0px锋利栅格、高密风控与量化', en: 'Bloomberg-inspired carbon & amber, sharp analytical grid' },
    bestFor: { zh: '量化金融、网络安全态势、SRE作战室、实时监控复盘', en: 'Quant finance, security operations, SRE war-room, telemetry' },
    persona: 'consulting',
    dark: true,
    radiusPx: 0,
    shadow: false,
    defaultTableStyle: 'consulting',
    chromeStyle: 'consulting-classic',
    palette: {
      bg: '#0C0D10',
      panel: '#151820',
      fg: '#F3F4F6',
      muted: '#9CA3AF',
      accent: '#F59E0B',
      accent2: '#38BDF8',
    },
    tokens: {
      canvas: '#0C0D10',
      surface1: '#151820',
      surface2: '#1F2430',
      hairline: '#2E3545',
      inkPrimary: '#F3F4F6',
      inkSecondary: '#D1D5DB',
      inkMuted: '#9CA3AF',
      accentPrimary: '#F59E0B',
      accentText: '#FBBF24',
      accentSecondary: '#38BDF8',
      accent2Text: '#38BDF8',
      chartNeutral: '#2A303E',
      chartSeries: ['#F59E0B', '#38BDF8', '#34D399', '#F87171', '#A78BFA', '#6B7280'],
    },
    fonts: { heading: SANS_STACK, body: SANS_STACK },
  }),
}

/**
 * 8 套内置名家参考文稿直吸预设（无需外部 .pptx 文件，一键套用大师级配色、母版骨架与叙事节奏建议）。
 */
export const CURATED_MASTER_PRESETS = Object.freeze([
  {
    id: 'mckinsey-board',
    name: { zh: '麦肯锡董事会简报', en: 'McKinsey Board Brief' },
    sourceStyle: { zh: '0px 直角卡片 · 结论先行 · 深海蓝主调', en: '0px sharp cards · Action titles · Deep navy' },
    theme: 'consulting',
    chromeStyle: 'consulting-classic',
    brand: { primaryColor: '#0057B8', secondaryColor: '#0E7490', backgroundColor: '#FFFFFF', textColor: '#0F172A', chromeStyle: 'consulting-classic' },
    rhythm: ['cover', 'cards', 'kpi', 'waterfall', 'matrix', 'gantt', 'closing'],
  },
  {
    id: 'bcg-growth',
    name: { zh: 'BCG 增长与双碳战略', en: 'BCG Growth & Sustainability' },
    sourceStyle: { zh: '翡翠绿主色 · 价值链五边形箭头 · 哈维球矩阵', en: 'Emerald accent · Value-chain chevrons · Harvey matrix' },
    theme: 'bcg-emerald',
    chromeStyle: 'consulting-classic',
    brand: { primaryColor: '#006B54', secondaryColor: '#0F4C81', backgroundColor: '#FFFFFF', textColor: '#0D1F18', chromeStyle: 'consulting-classic' },
    rhythm: ['cover', 'kpi', 'process', 'harvey', 'gantt', 'closing'],
  },
  {
    id: 'sequoia-memo',
    name: { zh: '红杉 / YC 创投融资简报（明亮版）', en: 'Sequoia / YC Partner Deck' },
    sourceStyle: { zh: '适合邮件与平板阅读 · TAM 同心圆 · 增长指标', en: 'Screen-first daylight · TAM sizing · Traction KPIs' },
    theme: 'venture-daylight',
    chromeStyle: 'keynote-spatial',
    brand: { primaryColor: '#C2410C', secondaryColor: '#0F766E', backgroundColor: '#FFFFFF', textColor: '#111827', chromeStyle: 'keynote-spatial' },
    rhythm: ['cover', 'comparison', 'kpi', 'tam', 'harvey', 'org', 'closing'],
  },
  {
    id: 'apple-cupertino',
    name: { zh: 'Cupertino 旗舰产品发布', en: 'Cupertino Spatial Keynote' },
    sourceStyle: { zh: '无顶部分隔线 · 16pt 呼吸感浮卡 · 大数字聚焦', en: 'Divider-free canvas · 16pt airy Bento · Hero metrics' },
    theme: 'keynote-light',
    chromeStyle: 'keynote-spatial',
    brand: { primaryColor: '#0066CC', secondaryColor: '#5E5CE6', backgroundColor: '#FFFFFF', textColor: '#1D1D1F', chromeStyle: 'keynote-spatial' },
    rhythm: ['cover', 'statement', 'cards', 'kpi', 'architecture', 'closing'],
  },
  {
    id: 'stripe-product',
    name: { zh: 'Stripe / Vercel 产研方案评审', en: 'Stripe / Vercel Product Craft' },
    sourceStyle: { zh: '1px 精密 Bento 网格 · 系统分层架构 · 路线图', en: '1px Bento grid · Layered architecture · Roadmap' },
    theme: 'stripe-craft',
    chromeStyle: 'saas-bento',
    brand: { primaryColor: '#4F46E5', secondaryColor: '#0284C7', backgroundColor: '#F8FAFC', textColor: '#0F172A', chromeStyle: 'saas-bento' },
    rhythm: ['cover', 'comparison', 'architecture', 'cards', 'gantt', 'closing'],
  },
  {
    id: 'economist-macro',
    name: { zh: '经济学人 / FT 宏观与财报洞察', en: 'Economist & FT Macro Briefing' },
    sourceStyle: { zh: '暖纸底色 · 红标书脊 · 衬线标题 + 瀑布利润桥', en: 'Warm paper · Editorial folio · Serif title & waterfall' },
    theme: 'economist-brief',
    chromeStyle: 'editorial-folio',
    brand: { primaryColor: '#C8102E', secondaryColor: '#1D3557', backgroundColor: '#F9F8F5', textColor: '#141413', headingFont: 'Georgia', chromeStyle: 'editorial-folio' },
    rhythm: ['cover', 'statement', 'waterfall', 'chart-split', 'table', 'closing'],
  },
  {
    id: 'nature-defense',
    name: { zh: 'Nature / ETH 学术答辩与临床研究', en: 'Nature & Beamer Academic Defense' },
    sourceStyle: { zh: 'Beamer 通栏页眉 · 无竖线学术三线表 · 严谨对比', en: 'Beamer header band · Booktabs 3-line tables · Rigor' },
    theme: 'academic',
    chromeStyle: 'academic-minimal',
    brand: { primaryColor: '#006980', secondaryColor: '#C8430E', backgroundColor: '#FFFFFF', textColor: '#111827', chromeStyle: 'academic-minimal' },
    rhythm: ['cover', 'cards', 'process', 'table', 'kpi', 'closing'],
  },
  {
    id: 'imperial-gov',
    name: { zh: '现代东方政务述职与规划', en: 'Modern Institutional Briefing' },
    sourceStyle: { zh: '深霁蓝庄重封面 + 宣纸浅底正文 · 双线页眉', en: 'Inverted slate cover + warm paper body · Double rule' },
    theme: 'exec-jilan',
    chromeStyle: 'gov-ceremonial',
    brand: { primaryColor: '#1A2B4C', secondaryColor: '#9E1B1E', chromeStyle: 'gov-ceremonial' },
    rhythm: ['cover', 'kpi', 'cards', 'comparison', 'org', 'gantt', 'closing'],
  },
])

export function listMasterPresets(lang = 'zh') {
  const pick = (pair) => (lang === 'en' ? pair.en : pair.zh)
  return CURATED_MASTER_PRESETS.map((preset) => ({
    id: preset.id,
    name: pick(preset.name),
    sourceStyle: pick(preset.sourceStyle),
    theme: preset.theme,
    chromeStyle: preset.chromeStyle,
    brand: { ...preset.brand },
    rhythm: [...preset.rhythm],
  }))
}

export const THEME_IDS = Object.keys(THEMES)
export const DEFAULT_THEME = 'data'
export const SMART_DEFAULT_THEME = 'consulting'

export function resolveTheme(input) {
  if (input && typeof input === 'object' && input.palette && input.tokens) return input
  const raw = String(input ?? DEFAULT_THEME).trim().toLowerCase()
  const id = raw === '' || raw === 'auto' ? (raw === 'auto' ? SMART_DEFAULT_THEME : DEFAULT_THEME) : raw
  const theme = THEMES[id]
  if (!theme) {
    throw new Error('dsh-ppt：未知主题 "' + id + '"，可选：' + THEME_IDS.join(' / ') + '（默认 ' + DEFAULT_THEME + '）')
  }
  return theme
}

export function listThemes(lang = 'zh') {
  const pick = (pair) => (lang === 'en' ? pair.en : pair.zh)
  return THEME_IDS.map((id) => {
    const theme = THEMES[id]
    return {
      id,
      name: pick(theme.name),
      mood: pick(theme.mood),
      bestFor: pick(theme.bestFor),
      persona: theme.persona,
      dark: theme.dark,
      radiusPx: theme.radiusPx,
      defaultTableStyle: theme.defaultTableStyle,
      chromeStyle: theme.chromeStyle,
      palette: { ...theme.palette },
      tokens: { ...theme.tokens, chartSeries: [...theme.tokens.chartSeries] },
      fonts: { ...theme.fonts },
    }
  })
}

// ---------------------------------------------------------------------------
// 外源 PPTX 主题净化器 sanitizeAbsorbedTheme() 与品牌色派生器 deriveBrandedTheme()
// ---------------------------------------------------------------------------

const OKABE_ITO_FALLBACKS = ['#0057B8', '#C8430E', '#0F6E56', '#7C3AED', '#B45309', '#475569']

/**
 * 将任意提取出的外部 .pptx 色板与字体净化为满足 WCAG 对比度与审美约束的 18-Token 主题配置。
 * 自动处理高饱和企业红/蓝底母版（降级为深色庄重封面 + 明亮正文画布）。
 */
export function sanitizeAbsorbedTheme(raw = {}) {
  const warnings = []
  const srcPalette = raw.palette ?? raw.theme ?? raw
  const srcFonts = raw.fonts ?? raw

  const rawBgCandidate = raw.contentSlideBg ?? raw.backgroundColor ?? raw.masterBg ?? srcPalette.bg ?? srcPalette.light1 ?? '#FFFFFF'
  const rawBg = normalizeHex(rawBgCandidate, '#FFFFFF')
  const bgHsl = hexToHsl(rawBg)
  const bgLum = relativeLuminance(rawBg)

  let dark = false
  let canvas = rawBg
  let coverMode = 'standard'
  let coverBg = rawBg

  // 高饱和度母版背景自动降级（如 #FF0000 刺眼大红底或高饱和蓝底）
  if (bgHsl.s > 0.35 && bgLum > 0.06 && bgLum < 0.78) {
    coverMode = 'inverted-accent'
    coverBg = hslToHex(bgHsl.h, Math.min(bgHsl.s, 0.76), Math.max(0.14, Math.min(0.22, bgHsl.l * 0.42)))
    canvas = mixHex('#FFFFFF', rawBg, 0.03)
    dark = false
    warnings.push('检测到高饱和背景色 ' + rawBg + '，已自动设为庄重深色封面 + 护眼浅色正文画布。')
  } else if (bgLum >= 0.42) {
    dark = false
    canvas = clampHslColor(rawBg, { minL: 0.88, maxL: 1.0, maxS: 0.18 })
    if (raw.coverSlideBg) {
      const rawCover = normalizeHex(raw.coverSlideBg, '')
      if (rawCover && relativeLuminance(rawCover) < 0.30) {
        coverMode = 'inverted-accent'
        coverBg = clampHslColor(rawCover, { minL: 0.06, maxL: 0.25, maxS: 0.78 })
      }
    }
  } else {
    dark = true
    canvas = clampHslColor(rawBg, { minL: 0.008, maxL: 0.055, maxS: 0.35 })
    if (bgLum > 0.08) warnings.push('检测到中灰低对比背景色 ' + rawBg + '，已提纯为深邃暗色画布 ' + canvas + '。')
  }

  const accentCandidates = [
    raw.brandPrimary,
    raw.primaryColor,
    coverMode === 'inverted-accent' ? coverBg : null,
    srcPalette.accent,
    srcPalette.accent1,
    srcPalette.accent2,
    srcPalette.accent3,
    srcPalette.dark2,
  ]
    .filter(Boolean)
    .map((c) => normalizeHex(c, ''))
    .filter((c) => c.length === 7)

  const chromaticSeed = accentCandidates.find((c) => hexToHsl(c).s >= 0.12 && colorDistance(c, canvas) > 36)
    ?? accentCandidates[0]
    ?? (dark ? '#5E81F4' : '#0057B8')
  const accentSeed = clampHslColor(chromaticSeed, { maxS: 0.84, minL: 0.12, maxL: 0.82 })

  const surface1 = dark
    ? mixHex(canvas, '#FFFFFF', 0.055)
    : adjustLightness(mixHex(canvas, accentSeed, 0.04), -0.03)
  const surface2 = dark
    ? mixHex(canvas, '#FFFFFF', 0.105)
    : adjustLightness(mixHex(canvas, accentSeed, 0.08), -0.065)
  const hairline = dark
    ? mixHex(canvas, '#FFFFFF', 0.16)
    : mixHex(canvas, '#0F172A', 0.14)

  const rawFgCandidate = raw.textColor ?? srcPalette.fg ?? srcPalette.dark1 ?? (dark ? '#F5F7FA' : '#0F172A')
  const rawFg = normalizeHex(rawFgCandidate, dark ? '#F5F7FA' : '#0F172A')
  const inkPrimary = ensureContrast(rawFg, surface1, 10.0)
  if (contrastRatio(rawFg, surface1) < 4.5) {
    warnings.push('原文字颜色 ' + rawFg + ' 对比度不足，已自动增强至 ' + inkPrimary + '。')
  }
  const inkSecondary = ensureContrast(mixHex(inkPrimary, surface1, 0.25), surface1, 7.0)
  const inkMuted = ensureContrast(mixHex(inkPrimary, surface1, 0.46), surface1, 4.6)

  const accentPrimary = ensureContrast(accentSeed, canvas, 3.2, 0.82)
  const accentText = ensureContrast(accentPrimary, surface1, 4.6, 0.82)
  const inkOnAccent = relativeLuminance(accentPrimary) > 0.36 ? '#0F172A' : '#FFFFFF'

  const secondaryPool = [
    raw.brandSecondary,
    raw.secondaryColor,
    srcPalette.accent2,
    srcPalette.accent3,
    srcPalette.accent4,
    srcPalette.accent5,
    srcPalette.accent6,
  ]
    .filter(Boolean)
    .map((c) => normalizeHex(c, ''))
    .filter((c) => c.length === 7 && hueDelta(c, accentPrimary) >= 24 && colorDistance(c, canvas) > 32)

  const rawSecondary = secondaryPool[0] ?? hslToHex((hexToHsl(accentPrimary).h + 36) % 360, Math.max(0.45, hexToHsl(accentPrimary).s * 0.85), dark ? 0.62 : 0.38)
  const accentSecondary = ensureContrast(rawSecondary, canvas, 3.2, 0.80)
  const accent2Text = ensureContrast(accentSecondary, surface1, 4.6, 0.80)
  const accentSoft = mixHex(canvas, accentPrimary, dark ? 0.18 : 0.10)

  const positive = ensureContrast(dark ? '#34D399' : '#0D7A4E', surface1, 4.5)
  const negative = ensureContrast(dark ? '#F87171' : '#C81E1E', surface1, 4.5)
  const warning = ensureContrast(dark ? '#FBBF24' : '#B45309', surface1, 4.5)

  const seriesSeeds = [
    accentPrimary,
    accentSecondary,
    ...[srcPalette.accent3, srcPalette.accent4, srcPalette.accent5, srcPalette.accent6].filter(Boolean).map((c) => normalizeHex(c)),
    ...OKABE_ITO_FALLBACKS,
  ]
  const chartSeries = []
  for (const candidate of seriesSeeds) {
    if (chartSeries.length >= 6) break
    const adjusted = ensureContrast(candidate, canvas, 3.0, 0.80)
    if (chartSeries.every((existing) => colorDistance(existing, adjusted) >= 34)) {
      chartSeries.push(adjusted)
    }
  }
  while (chartSeries.length < 6) {
    chartSeries.push(ensureContrast(OKABE_ITO_FALLBACKS[chartSeries.length % OKABE_ITO_FALLBACKS.length], canvas, 3.0))
  }
  const chartNeutral = mixHex(canvas, inkPrimary, dark ? 0.24 : 0.18)

  const warnedFonts = new Set()
  const sanitizeExtractedFont = (rawFont) => {
    const trimmed = String(rawFont ?? '').trim()
    if (!trimmed || /^\+mn-|^\+mj-/i.test(trimmed)) return ''
    if (BITMAP_SERIF_FONT_RE.test(trimmed) || NOVELTY_FONT_RE.test(trimmed)) {
      if (!warnedFonts.has(trimmed)) {
        warnedFonts.add(trimmed)
        warnings.push('检测到低可读点阵或装饰字体 ' + trimmed + '，已自动升级为矢量抗锯齿字体。')
      }
      return pptxEastAsianFont(trimmed)
    }
    if (/^微软雅黑$/i.test(trimmed)) return pptxEastAsianFont(trimmed)
    return trimmed
  }

  const isSafeSingleFont = (f) => Boolean(f && /^[\p{L}\p{N} _-]+$/u.test(f) && f.length <= 80 && !/^\+mn-|^\+mj-/i.test(f))
  const majorLatin = sanitizeExtractedFont(srcFonts.majorLatin)
  const majorEA = sanitizeExtractedFont(srcFonts.majorEastAsian)
  const minorLatin = sanitizeExtractedFont(srcFonts.minorLatin)
  const minorEA = sanitizeExtractedFont(srcFonts.minorEastAsian)
  const headingStack = [majorLatin, majorEA, SANS_STACK].filter(Boolean).join(', ')
  const bodyStack = [minorLatin || majorLatin, minorEA || majorEA, SANS_STACK].filter(Boolean).join(', ')
  const safeBrandFont = [minorEA, majorEA, minorLatin, majorLatin].find(isSafeSingleFont)
  const safeHeadingCandidate = [majorEA, majorLatin].find(isSafeSingleFont)
  const safeHeadingFont = safeHeadingCandidate && safeHeadingCandidate !== safeBrandFont ? safeHeadingCandidate : ''

  // 匹配最接近的内置大师主题 ID
  let recommendedTheme = dark ? 'linear-dark' : 'consulting'
  let bestScore = Infinity
  for (const id of THEME_IDS) {
    const candidate = THEMES[id]
    if (candidate.dark !== dark) continue
    if (coverMode === 'inverted-accent' && candidate.tokens.coverMode === 'inverted-accent') {
      const d = hueDelta(coverBg, candidate.tokens.coverBg)
      if (d < bestScore) {
        bestScore = d
        recommendedTheme = id
      }
      continue
    }
    const score = hueDelta(accentPrimary, candidate.palette.accent) + colorDistance(canvas, candidate.palette.bg) * 0.25
    if (score < bestScore) {
      bestScore = score
      recommendedTheme = id
    }
  }

  const tokens = {
    canvas,
    surface1,
    surface2,
    hairline,
    inkPrimary,
    inkSecondary,
    inkMuted,
    inkOnAccent,
    accentPrimary,
    accentText,
    accentSecondary,
    accent2Text,
    accentSoft,
    positive,
    negative,
    warning,
    chartFocal: accentPrimary,
    chartNeutral,
    chartSeries,
    coverMode,
    coverBg: coverMode === 'inverted-accent' ? coverBg : canvas,
  }
  const palette = {
    bg: canvas,
    panel: surface1,
    fg: inkPrimary,
    muted: inkMuted,
    accent: accentPrimary,
    accent2: accentSecondary,
  }
  const sanitizedBrand = {
    primaryColor: accentPrimary,
    secondaryColor: accentSecondary,
    backgroundColor: canvas,
    textColor: inkPrimary,
    ...(safeBrandFont ? { fontFamily: safeBrandFont } : {}),
    ...(safeHeadingFont ? { headingFont: safeHeadingFont } : {}),
    ...(coverMode === 'inverted-accent' ? { coverMode: 'inverted-accent', coverBg } : {}),
  }

  return {
    dark,
    tokens,
    palette,
    fonts: { heading: headingStack, body: bodyStack },
    sanitizedBrand,
    sanitizedTokens: tokens,
    recommendedTheme,
    warnings,
  }
}

/**
 * 基于用户 brand 覆盖安全重算整套主题表面色、网格线与次级色（彻底修复浅色覆盖深色主题时的黑网格线 Bug），
 * 同时保留用户显式指定的 backgroundColor / textColor 原值以供 checkManifest 进行对比度告警。
 */
export function deriveBrandedTheme(themeOrId, brand) {
  const base = resolveTheme(themeOrId)
  const cloned = {
    ...base,
    palette: { ...base.palette },
    tokens: { ...base.tokens, chartSeries: [...base.tokens.chartSeries] },
    fonts: { ...base.fonts },
  }
  if (!brand || typeof brand !== 'object') return cloned

  const hasColorOverride = Boolean(brand.backgroundColor || brand.textColor || brand.primaryColor || brand.secondaryColor || brand.coverMode || brand.coverBg)
  if (hasColorOverride) {
    const nextBg = brand.backgroundColor ? normalizeHex(brand.backgroundColor, base.palette.bg) : base.palette.bg
    const nextDark = relativeLuminance(nextBg) < 0.42
    const nextAccent = brand.primaryColor ? normalizeHex(brand.primaryColor, base.palette.accent) : base.palette.accent
    const defaultFgForPolarity = nextDark ? '#F5F7FA' : '#0F172A'
    const nextFg = brand.textColor
      ? normalizeHex(brand.textColor, defaultFgForPolarity)
      : (nextDark === base.dark ? base.palette.fg : defaultFgForPolarity)

    const nextSurface1 = nextDark
      ? mixHex(nextBg, '#FFFFFF', 0.06)
      : adjustLightness(mixHex(nextBg, nextAccent, 0.035), -0.028)
    const nextSurface2 = nextDark
      ? mixHex(nextBg, '#FFFFFF', 0.11)
      : adjustLightness(mixHex(nextBg, nextAccent, 0.07), -0.06)
    const nextHairline = nextDark
      ? mixHex(nextBg, '#FFFFFF', 0.16)
      : mixHex(nextBg, '#0F172A', 0.13)
    const safeInkForDerived = contrastRatio(nextFg, nextSurface1) >= 4.5 ? nextFg : defaultFgForPolarity
    const nextInkSecondary = ensureContrast(mixHex(safeInkForDerived, nextSurface1, 0.25), nextSurface1, 7.0)
    const nextMuted = ensureContrast(mixHex(safeInkForDerived, nextSurface1, 0.46), nextSurface1, 4.6)
    const nextAccentText = ensureContrast(nextAccent, nextSurface1, 4.6)
    const rawSecondary = brand.secondaryColor ? normalizeHex(brand.secondaryColor, base.palette.accent2) : base.palette.accent2
    const nextAccent2 = ensureContrast(rawSecondary, nextBg, 3.0)
    const nextAccent2Text = ensureContrast(nextAccent2, nextSurface1, 4.6)
    const nextChartNeutral = mixHex(nextBg, safeInkForDerived, nextDark ? 0.24 : 0.18)
    const seedTail = brand.secondaryColor
      ? [nextAccent2, ...base.tokens.chartSeries.slice(1).filter((c) => colorDistance(c, nextAccent2) >= 28)]
      : base.tokens.chartSeries.slice(1)
    const nextSeries = [nextAccent, ...seedTail.slice(0, 5).map((c) => ensureContrast(c, nextBg, 2.8))]
    while (nextSeries.length < 6) {
      nextSeries.push(ensureContrast(OKABE_ITO_FALLBACKS[nextSeries.length % OKABE_ITO_FALLBACKS.length], nextBg, 2.8))
    }

    const explicitInverted = brand.coverMode === 'inverted-accent'
    const resolvedCoverMode = explicitInverted
      ? 'inverted-accent'
      : brand.coverMode === 'standard'
        ? 'standard'
        : (brand.backgroundColor ? 'standard' : cloned.tokens.coverMode)
    const resolvedCoverBg = resolvedCoverMode === 'inverted-accent'
      ? (brand.coverBg ? normalizeHex(brand.coverBg, nextAccent) : (cloned.tokens.coverMode === 'inverted-accent' ? cloned.tokens.coverBg : nextAccent))
      : nextBg

    cloned.dark = nextDark
    cloned.shadow = !nextDark && base.shadow
    cloned.palette = {
      bg: nextBg,
      panel: nextSurface1,
      fg: nextFg,
      muted: nextMuted,
      accent: nextAccent,
      accent2: nextAccent2,
    }
    cloned.tokens = {
      ...cloned.tokens,
      canvas: nextBg,
      surface1: nextSurface1,
      surface2: nextSurface2,
      hairline: nextHairline,
      inkPrimary: nextFg,
      inkSecondary: nextInkSecondary,
      inkMuted: nextMuted,
      inkOnAccent: relativeLuminance(nextAccent) > 0.36 ? '#0F172A' : '#FFFFFF',
      accentPrimary: nextAccent,
      accentText: nextAccentText,
      accentSecondary: nextAccent2,
      accent2Text: nextAccent2Text,
      accentSoft: mixHex(nextBg, nextAccent, nextDark ? 0.18 : 0.10),
      positive: ensureContrast(nextDark ? '#34D399' : '#0D7A4E', nextSurface1, 4.5),
      negative: ensureContrast(nextDark ? '#F87171' : '#C81E1E', nextSurface1, 4.5),
      warning: ensureContrast(nextDark ? '#FBBF24' : '#B45309', nextSurface1, 4.5),
      chartFocal: nextAccent,
      chartNeutral: nextChartNeutral,
      chartSeries: nextSeries,
      coverMode: resolvedCoverMode,
      coverBg: resolvedCoverBg,
    }
  }

  if (brand.chromeStyle && CHROME_STYLE_SET.has(String(brand.chromeStyle).trim())) {
    cloned.chromeStyle = String(brand.chromeStyle).trim()
  }

  const normalizeBrandFontStack = (raw, fallbackStack) => {
    const trimmed = String(raw).trim()
    if (!trimmed) return fallbackStack
    if (BITMAP_SERIF_FONT_RE.test(trimmed) || NOVELTY_FONT_RE.test(trimmed) || /^微软雅黑$/i.test(trimmed)) {
      return [pptxEastAsianFont(trimmed), SANS_STACK].join(', ')
    }
    return trimmed
  }

  if (brand.fontFamily) {
    const cleanBody = normalizeBrandFontStack(brand.fontFamily, cloned.fonts.body)
    cloned.fonts = { heading: cleanBody, body: cleanBody }
  }
  if (brand.headingFont) {
    cloned.fonts = {
      ...cloned.fonts,
      heading: normalizeBrandFontStack(brand.headingFont, cloned.fonts.heading),
    }
  }
  return cloned
}

// ---------------------------------------------------------------------------
// 主题预览 SVG 色板卡与对比页生成
// ---------------------------------------------------------------------------

function xmlEsc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function htmlEsc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function themePreviewLabels(lang) {
  return lang === 'en'
    ? { title: 'dsh-ppt theme gallery', hint: 'Pick a theme id for ppt_create (or pass auto)', usage: 'theme', dark: 'dark', light: 'light', palette: 'Palette' }
    : { title: 'dsh-ppt 主题预览', hint: '把 id 填给 ppt_create 的 theme 参数（默认推荐 auto 智能匹配）', usage: 'theme', dark: '深色', light: '浅色', palette: '色板' }
}

export function renderThemeSvg(input, lang = 'zh', version = '0.0.0') {
  const theme = typeof input === 'string' ? resolveTheme(input) : input
  const pick = (pair) => (lang === 'en' ? pair.en : pair.zh)
  const p = theme.palette
  const tk = theme.tokens
  const L = themePreviewLabels(lang === 'en' ? 'en' : 'zh')
  const font = theme.fonts.heading.replace(/"/g, "'")
  const bodyFont = theme.fonts.body.replace(/"/g, "'")
  const rx = Math.max(0, Math.min(16, theme.radiusPx ?? 10))
  const out = []
  out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540" role="img" aria-label="' + xmlEsc(theme.id + ' ' + pick(theme.name)) + '">')
  out.push('<rect width="960" height="540" fill="' + p.bg + '"/>')
  out.push('<rect x="0" y="0" width="960" height="6" fill="' + p.accent + '"/><rect x="0" y="534" width="960" height="4" fill="' + p.accent2 + '"/>')
  out.push('<rect x="36" y="40" width="560" height="360" rx="' + rx + '" fill="' + p.panel + '" stroke="' + tk.hairline + '"/>')
  out.push('<text x="64" y="92" fill="' + tk.accentText + '" font-family="' + xmlEsc(bodyFont) + '" font-size="13" font-weight="700" letter-spacing="2.5">' + xmlEsc(pick(theme.mood).toUpperCase()) + '</text>')
  out.push('<text x="64" y="156" fill="' + p.fg + '" font-family="' + xmlEsc(font) + '" font-size="40" font-weight="800">' + xmlEsc('Aa ' + pick(theme.name)) + '</text>')
  out.push('<rect x="64" y="196" width="164" height="74" rx="' + Math.max(0, rx - 2) + '" fill="' + tk.surface2 + '" stroke="' + tk.hairline + '"/>')
  out.push('<text x="80" y="232" fill="' + tk.accentText + '" font-family="' + xmlEsc(font) + '" font-size="24" font-weight="800">+38.4%</text>')
  out.push('<text x="80" y="254" fill="' + p.muted + '" font-family="' + xmlEsc(bodyFont) + '" font-size="12">Core KPI · YoY</text>')
  out.push('<rect x="244" y="196" width="320" height="74" rx="' + Math.max(0, rx - 2) + '" fill="' + tk.surface2 + '" stroke="' + tk.hairline + '"/>')
  out.push('<rect x="262" y="214" width="210" height="10" rx="4" fill="' + hexToRgba(p.fg, 0.78) + '"/>')
  out.push('<rect x="262" y="238" width="165" height="10" rx="4" fill="' + hexToRgba(p.fg, 0.45) + '"/>')
  out.push('<rect x="64" y="298" width="500" height="36" rx="' + Math.max(0, rx - 2) + '" fill="' + p.accent + '"/>')
  out.push('<text x="80" y="321" fill="' + tk.inkOnAccent + '" font-family="' + xmlEsc(bodyFont) + '" font-size="14" font-weight="700">dsh-ppt · ' + xmlEsc(theme.persona) + '</text>')
  out.push('<text x="548" y="321" fill="' + tk.inkOnAccent + '" font-family="' + xmlEsc(bodyFont) + '" font-size="14" font-weight="700" text-anchor="end">100%</text>')
  out.push('<rect x="64" y="352" width="500" height="1" fill="' + tk.hairline + '"/>')
  out.push('<text x="64" y="380" fill="' + p.muted + '" font-family="' + xmlEsc(bodyFont) + '" font-size="13">' + xmlEsc(theme.id + ' · ' + (theme.dark ? L.dark : L.light) + ' · v' + version) + '</text>')
  const swatches = ['bg', 'panel', 'fg', 'muted', 'accent', 'accent2']
  out.push('<text x="632" y="76" fill="' + p.muted + '" font-family="' + xmlEsc(bodyFont) + '" font-size="13" font-weight="700" letter-spacing="2">' + xmlEsc(L.palette.toUpperCase()) + '</text>')
  swatches.forEach((key, i) => {
    const y = 96 + i * 62
    out.push('<rect x="632" y="' + y + '" width="44" height="44" rx="10" fill="' + p[key] + '" stroke="' + tk.hairline + '"/>')
    out.push('<text x="692" y="' + (y + 20) + '" fill="' + p.fg + '" font-family="' + xmlEsc(bodyFont) + '" font-size="14" font-weight="600">' + xmlEsc(key) + '</text>')
    out.push('<text x="692" y="' + (y + 38) + '" fill="' + p.muted + '" font-family="' + xmlEsc(bodyFont) + '" font-size="13">' + xmlEsc(String(p[key]).toUpperCase()) + '</text>')
  })
  out.push('<text x="632" y="508" fill="' + p.muted + '" font-family="' + xmlEsc(bodyFont) + '" font-size="12">' + xmlEsc(pick(theme.bestFor)).slice(0, 44) + '</text>')
  out.push('</svg>')
  return out.join('')
}

export function renderThemePreviewHtml(lang = 'zh', version = '0.0.0') {
  const L = themePreviewLabels(lang === 'en' ? 'en' : 'zh')
  const cards = THEME_IDS.map((id) => {
    const theme = THEMES[id]
    const pick = (pair) => (lang === 'en' ? pair.en : pair.zh)
    const chips = Object.keys(theme.palette).map((key) =>
      '<span class="chip"><i style="background:' + theme.palette[key] + '"></i>' + htmlEsc(String(theme.palette[key]).toUpperCase()) + '</span>').join('')
    return '<figure class="card" id="theme-' + htmlEsc(id) + '">' +
      renderThemeSvg(theme, lang === 'en' ? 'en' : 'zh', version) +
      '<figcaption><div class="row"><strong>' + htmlEsc(id) + '</strong><span class="badge">' + htmlEsc(pick(theme.name)) + ' · ' + (theme.dark ? L.dark : L.light) + '</span></div>' +
      '<p class="muted">' + htmlEsc(pick(theme.mood)) + ' · ' + htmlEsc(pick(theme.bestFor)) + '</p>' +
      '<p class="chips">' + chips + '</p>' +
      '<p class="usage">' + htmlEsc(L.usage) + ': <code>' + htmlEsc(id) + '</code></p></figcaption></figure>'
  }).join('')
  return '<!DOCTYPE html><html lang="' + (lang === 'en' ? 'en-US' : 'zh-CN') + '">' +
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + htmlEsc(L.title) + '</title><style>' +
    'body{margin:0;background:#F8FAFC;color:#0F172A;font-family:"Inter","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;padding:32px}' +
    'h1{font-size:28px;margin:0 0 6px;letter-spacing:-.02em}p.sub{color:#475569;margin:0 0 26px;font-size:14px}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:22px}' +
    '.card{margin:0;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,.04)}' +
    '.card svg{display:block;width:100%;height:auto;border-bottom:1px solid #E2E8F0}' +
    'figcaption{padding:14px 16px 16px}.row{display:flex;align-items:center;gap:10px;font-size:16px}' +
    '.badge{color:#475569;font-size:13px}.muted{color:#475569;font-size:13px;margin:6px 0 10px;line-height:1.5}' +
    '.chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#334155;background:#F8FAFC;border:1px solid #CBD5E1;border-radius:99px;padding:3px 9px}' +
    '.chip i{width:10px;height:10px;border-radius:3px;display:inline-block;border:1px solid rgba(0,0,0,.12)}' +
    '.usage{margin:0;font-size:13px;color:#334155}code{background:#F1F5F9;border:1px solid #CBD5E1;border-radius:6px;padding:1px 6px}' +
    '@media (prefers-reduced-motion: reduce){*{transition:none!important;animation:none!important}}' +
    '</style></head><body><h1>' + htmlEsc(L.title) + '</h1><p class="sub">' + htmlEsc(L.hint) + ' · dsh-ppt v' + htmlEsc(version) + '</p>' +
    '<div class="grid">' + cards + '</div></body></html>'
}

export function buildThemePreviewFileSet(options = {}, resolveLanguageFn, version = '0.0.0') {
  const langInput = typeof options.lang === 'string' && options.lang.trim() !== '' ? options.lang.trim() : 'zh'
  const language = resolveLanguageFn ? resolveLanguageFn(langInput) : { id: langInput === 'en' ? 'en' : 'zh' }
  const outputDir = resolvePath(String(options.outputDir ?? '.'))
  mkdirSync(outputDir, { recursive: true })
  const overwrite = options.overwrite === true
  const pickPath = (base, ext) => {
    const first = resolvePath(joinPath(outputDir, base + ext))
    if (overwrite || !existsSync(first)) return first
    for (let i = 1; i < 1000; i += 1) {
      const candidate = resolvePath(joinPath(outputDir, base + '-' + i + ext))
      if (!existsSync(candidate)) return candidate
    }
    throw new Error('dsh-ppt：找不到可用的预览文件名（同名前缀超过 999 个），请允许 overwrite。')
  }
  const htmlPath = pickPath('themes-preview', '.html')
  writeFileSync(htmlPath, renderThemePreviewHtml(language.id, version), 'utf8')
  const svgs = THEME_IDS.map((id) => {
    const svgPath = pickPath('theme-' + id, '.svg')
    writeFileSync(svgPath, renderThemeSvg(id, language.id, version), 'utf8')
    return { id, path: svgPath }
  })
  return { ok: true, outputDir, htmlPath, svgs, themeCount: THEME_IDS.length, language: language.id }
}

export function buildThemePreview(options = {}, resolveLanguageFn, version = '0.0.0') {
  return buildThemePreviewFileSet(options, resolveLanguageFn, version)
}


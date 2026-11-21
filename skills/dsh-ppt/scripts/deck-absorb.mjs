/**
 * deck-absorb.mjs —— 外部参考 .pptx 母版、主题、字体、Logo 与骨架版式只读提取与审美净化器。
 *
 * Phase 3 深度增强：
 *   - 解析 OOXML <a:schemeClr> / <a:srgbClr> 子变换（lumMod, lumOff, tint, shade, satMod, satOff）
 *   - 提取母版骨架特征 extractedSkeleton: { cornerStyle: 'sharp'|'rounded'|'soft', hasTopBanner, hasSideSpine, masterShapeCount }
 *   - 推荐 6 种母版骨架 chromeStyle (recommendedChrome)
 *   - 逐页推理版式骨架 slideSkeleton: Array<{ slideNumber, inferredLayout, variant?, titleSample? }>
 *
 * 严格约束：
 *   - 仅使用 Node 内置模块 + 动态加载的 @office-kit/pptx
 *   - 绝不直接导入 saxes 或 fflate，保证技能目录独立复制到任意 Agent 环境均可运行
 *   - 提取出的原始配色与字体统一经由 deck-themes.mjs 的 sanitizeAbsorbedTheme 进行 WCAG 对比度与高饱和底色净化
 */

import { lstatSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { sanitizeAbsorbedTheme, normalizeHex, hexToHsl, relativeLuminance } from './deck-themes.mjs'
import { sanitizeCustomTasteRecipe, saveWorkspaceTasteRecipe } from './deck-taste.mjs'
import { extractExemplarFromAbsorbed, saveWorkspaceExemplar } from './deck-exemplars.mjs'
import { buildBrandKitFromAbsorbed, saveWorkspaceBrandKit } from './deck-brand-kit.mjs'

const MAX_PPTX_BYTES = 64 * 1024 * 1024
const MAX_LOGO_BYTES = 2 * 1024 * 1024
const EMU_PER_INCH = 914400

const OFFICE_DEFAULT_ACCENTS = new Set(['#4F81BD', '#4472C4', '#156082', '#0F9ED5'])

/** 6 Chrome Style IDs matching deck-themes.mjs / deck-layouts.mjs */
export const CHROME_STYLE_IDS = Object.freeze([
  'consulting-classic',
  'keynote-spatial',
  'editorial-folio',
  'saas-bento',
  'academic-minimal',
  'gov-ceremonial',
])

const SCHEME_PROP_MAP = {
  dk1: 'dark1',
  lt1: 'light1',
  dk2: 'dark2',
  lt2: 'light2',
  bg1: 'light1',
  tx1: 'dark1',
  bg2: 'light2',
  tx2: 'dark2',
  dark1: 'dark1',
  light1: 'light1',
  dark2: 'dark2',
  light2: 'light2',
  accent1: 'accent1',
  accent2: 'accent2',
  accent3: 'accent3',
  accent4: 'accent4',
  accent5: 'accent5',
  accent6: 'accent6',
  hlink: 'hyperlink',
  folHlink: 'followedHyperlink',
  hyperlink: 'hyperlink',
  followedHyperlink: 'followedHyperlink',
  phClr: 'accent1',
}

function fail(zh, en) {
  throw new Error('dsh-ppt：' + zh + (en ? ' / ' + en : ''))
}

// ---------------------------------------------------------------------------
// OOXML DrawingML Color Modifier Resolver (ISO/IEC 29500)
// ---------------------------------------------------------------------------

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function linearToSrgb(c) {
  const v = clamp01(c)
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
}

function rgbToHsl01(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h / 6, s, l]
}

function hueToRgb(p, q, t) {
  let u = t
  if (u < 0) u += 1
  if (u > 1) u -= 1
  if (u < 1 / 6) return p + (q - p) * 6 * u
  if (u < 1 / 2) return q
  if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6
  return p
}

function hslToRgb01(h, s, l) {
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    hueToRgb(p, q, h + 1 / 3),
    hueToRgb(p, q, h),
    hueToRgb(p, q, h - 1 / 3),
  ]
}

/**
 * Resolve OOXML DrawingML color child modifiers (`lumMod`, `lumOff`, `tint`, `shade`, `satMod`, `satOff`)
 * on a base `#RRGGBB` color string. Values are OOXML percentage units (`100000` = 100%).
 */
export function resolveColorModifiers(baseHex, mods) {
  const norm = normalizeHex(baseHex, '')
  if (!norm) return baseHex
  if (!mods || (Array.isArray(mods) && mods.length === 0) || (typeof mods === 'object' && Object.keys(mods).length === 0)) {
    return norm
  }

  let r = parseInt(norm.slice(1, 3), 16) / 255
  let g = parseInt(norm.slice(3, 5), 16) / 255
  let b = parseInt(norm.slice(5, 7), 16) / 255

  const steps = Array.isArray(mods)
    ? mods
    : Object.entries(mods).map(([kind, val]) => ({ kind, val }))

  for (const step of steps) {
    if (!step || typeof step.val !== 'number' || !Number.isFinite(step.val)) continue
    const ratio = step.val / 100000
    if (step.kind === 'tint') {
      r = linearToSrgb(srgbToLinear(r) * ratio + (1 - ratio))
      g = linearToSrgb(srgbToLinear(g) * ratio + (1 - ratio))
      b = linearToSrgb(srgbToLinear(b) * ratio + (1 - ratio))
    } else if (step.kind === 'shade') {
      r = linearToSrgb(srgbToLinear(r) * ratio)
      g = linearToSrgb(srgbToLinear(g) * ratio)
      b = linearToSrgb(srgbToLinear(b) * ratio)
    } else if (step.kind === 'lumMod' || step.kind === 'lumOff') {
      const [h, s, l] = rgbToHsl01(r, g, b)
      const nextL = clamp01(step.kind === 'lumMod' ? l * ratio : l + ratio)
      ;[r, g, b] = hslToRgb01(h, s, nextL)
    } else if (step.kind === 'satMod' || step.kind === 'satOff') {
      const [h, s, l] = rgbToHsl01(r, g, b)
      const nextS = clamp01(step.kind === 'satMod' ? s * ratio : s + ratio)
      ;[r, g, b] = hslToRgb01(h, nextS, l)
    } else if (step.kind === 'hueMod' || step.kind === 'hueOff') {
      const [h, s, l] = rgbToHsl01(r, g, b)
      // OOXML hueOff uses 1/60000 deg (21600000 = 360 deg); hueMod uses 1/100000 ratio
      const nextH = step.kind === 'hueMod'
        ? ((h * ratio) % 1 + 1) % 1
        : (((h + step.val / 21600000) % 1) + 1) % 1
      ;[r, g, b] = hslToRgb01(nextH, s, l)
    }
  }

  const toHex = (v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0').toUpperCase()
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

function parseXmlModifiers(innerXml) {
  if (!innerXml) return []
  const mods = []
  const modRe = /<a:(lumMod|lumOff|tint|shade|satMod|satOff|hueMod|hueOff)\b[^>]*\bval=["'](-?\d+)["'][^>]*\/?>/g
  for (const m of innerXml.matchAll(modRe)) {
    mods.push({ kind: m[1], val: Number(m[2]) })
  }
  return mods
}

const PRESET_COLOR_HEX = {
  black: '#000000',
  white: '#FFFFFF',
  navy: '#000080',
  darkblue: '#00008B',
  midnightblue: '#191970',
  royalblue: '#4169E1',
  teal: '#008080',
  darkgreen: '#006400',
  seagreen: '#2E8B57',
  darkred: '#8B0000',
  crimson: '#DC143C',
  firebrick: '#B22222',
  gold: '#FFD700',
  orange: '#FFA500',
  darkslategray: '#2F4F4F',
  slategray: '#708090',
  gray: '#808080',
  lightgray: '#D3D3D3',
}

function lookupSchemeHex(slot, themeScheme, colorMap) {
  if (!slot || !themeScheme) return null
  const mapped = (colorMap && colorMap[slot]) || slot
  const prop = SCHEME_PROP_MAP[mapped] || SCHEME_PROP_MAP[slot] || mapped
  const candidate = themeScheme[prop]
  if (candidate && /^#?[\da-f]{6}$/i.test(String(candidate))) {
    return normalizeHex(candidate, '') || null
  }
  return null
}

/**
 * Parse <a:srgbClr>, <a:schemeClr>, <a:sysClr>, or <a:prstClr> (including child modifiers) from an XML fragment.
 */
export function resolveXmlColorElement(xmlFragment, themeScheme, colorMap) {
  if (!xmlFragment || typeof xmlFragment !== 'string') return null
  const match = /<a:(srgbClr|schemeClr|sysClr|prstClr)\b([^>]*)(?:\/>|>([\s\S]*?)<\/a:\1>)/.exec(xmlFragment)
  if (!match) return null
  const [, tag, attrs, inner] = match
  const valMatch = /\bval=["']([^"']+)["']/.exec(attrs)
  const lastClrMatch = /\blastClr=["']([^"']+)["']/.exec(attrs)
  const val = valMatch ? valMatch[1].trim() : ''
  let baseHex = null
  if (tag === 'srgbClr') {
    baseHex = normalizeHex(val, '') || null
  } else if (tag === 'sysClr') {
    if (lastClrMatch && /^#?[\da-f]{6}$/i.test(lastClrMatch[1].trim())) {
      baseHex = normalizeHex(lastClrMatch[1].trim(), '') || null
    } else if (/windowtext|buttontext|menutext/i.test(val)) {
      baseHex = '#000000'
    } else if (/window|highlighttext/i.test(val)) {
      baseHex = '#FFFFFF'
    }
  } else if (tag === 'prstClr') {
    baseHex = PRESET_COLOR_HEX[val.toLowerCase()] ?? null
  } else if (val) {
    baseHex = lookupSchemeHex(val, themeScheme, colorMap)
  }
  if (!baseHex) return null
  const mods = parseXmlModifiers(inner)
  return mods.length ? resolveColorModifiers(baseHex, mods) : baseHex
}

function resolveBackgroundFromXml(xmlStr, themeScheme, colorMap) {
  if (!xmlStr) return null
  const bgMatch = /<p:bg\b[^>]*>([\s\S]*?)<\/p:bg>/.exec(xmlStr)
  if (!bgMatch) return null
  const bgInner = bgMatch[1]
  // Direct solidFill or gradFill stop inside p:bgPr
  const solidMatch = /<a:solidFill\b[^>]*>([\s\S]*?)<\/a:solidFill>/.exec(bgInner)
  if (solidMatch) {
    const resolved = resolveXmlColorElement(solidMatch[1], themeScheme, colorMap)
    if (resolved) return resolved
  }
  // bgRef referencing style matrix (e.g. <p:bgRef idx="1001"><a:schemeClr val="bg1">...</a:schemeClr></p:bgRef>)
  const refMatch = /<p:bgRef\b[^>]*>([\s\S]*?)<\/p:bgRef>/.exec(bgInner)
  if (refMatch) {
    const resolved = resolveXmlColorElement(refMatch[1], themeScheme, colorMap)
    if (resolved) return resolved
  }
  const gradMatch = /<a:gs\b[^>]*>([\s\S]*?)<\/a:gs>/.exec(bgInner)
  if (gradMatch) {
    const resolved = resolveXmlColorElement(gradMatch[1], themeScheme, colorMap)
    if (resolved) return resolved
  }
  return null
}

function resolveShapeFillSafe(lib, pres, shape, themeScheme, colorMap) {
  try {
    const hex = lib.getShapeFillColorResolved(pres, shape)
    if (hex && /^#[\da-f]{6}$/i.test(hex)) return hex.toUpperCase()
  } catch { /* fallback to XML */ }
  try {
    const xml = lib.getShapeXmlString?.(shape)
    if (xml) {
      const spPrMatch = /<p:spPr\b[^>]*>([\s\S]*?)<\/p:spPr>/.exec(xml)
      const solid = spPrMatch && /<a:solidFill\b[^>]*>([\s\S]*?)<\/a:solidFill>/.exec(spPrMatch[1])
      if (solid) {
        return resolveXmlColorElement(solid[1], themeScheme, colorMap)
      }
    }
  } catch { /* ignore */ }
  return null
}

// ---------------------------------------------------------------------------
// Master Slide Skeleton Extraction
// ---------------------------------------------------------------------------

function getBoundsSafe(lib, shape) {
  try {
    const resolved = lib.getShapeBoundsResolved?.(shape)
    if (resolved && Number.isFinite(resolved.w) && Number.isFinite(resolved.h)) return resolved
  } catch { /* fallback */ }
  try {
    return lib.getShapeBounds(shape)
  } catch {
    return null
  }
}

function flattenShapes(lib, shapes, depth = 0) {
  if (!Array.isArray(shapes) || depth > 4) return []
  const out = []
  for (const shape of shapes) {
    if (!shape) continue
    let children = null
    try {
      children = lib.getGroupChildren?.(shape)
    } catch { /* ignore */ }
    if (Array.isArray(children) && children.length > 0) {
      out.push(...flattenShapes(lib, children, depth + 1))
    } else {
      out.push(shape)
    }
  }
  return out
}

function classifyCornerFromShapes(lib, shapes, slideW) {
  let hasRounded = false
  let hasSoft = false
  let hasSharpRect = false
  for (const shape of flattenShapes(lib, shapes)) {
    try {
      const bounds = getBoundsSafe(lib, shape)
      if (!bounds) continue
      const relW = bounds.w / slideW
      if (relW < 0.08) continue
      const preset = String(lib.getShapePreset?.(shape) ?? '').toLowerCase()
      const name = String(lib.getShapeName?.(shape) ?? '').toLowerCase()
      if (preset === 'roundrect' || preset === 'round2samerect' || preset === 'round1rect' || name.includes('round')) {
        let adjVal = 0
        try {
          const adjs = lib.getShapeAdjustValues?.(shape)
          if (adjs && typeof adjs.adj === 'number') adjVal = adjs.adj
          else if (Array.isArray(adjs)) {
            const adjItem = adjs.find((a) => a?.name === 'adj')
            if (adjItem && typeof adjItem.val === 'number') adjVal = adjItem.val
          }
        } catch { /* ignore */ }
        if (adjVal >= 10000) hasSoft = true
        else hasRounded = true
      } else if (preset === 'ellipse' && relW > 0.12) {
        hasSoft = true
      } else if (preset === 'rect') {
        hasSharpRect = true
      }
    } catch { /* ignore */ }
  }
  if (hasSoft) return 'soft'
  if (hasRounded) return 'rounded'
  if (hasSharpRect) return 'sharp'
  return 'sharp'
}

function extractSkeletonFromShapes(lib, masterShapes, layoutShapes, sampleSlideShapes, slideW, slideH) {
  const mShapes = flattenShapes(lib, masterShapes)
  const lShapes = flattenShapes(lib, layoutShapes)
  const sShapes = flattenShapes(lib, sampleSlideShapes)
  const inspectShapes = [...mShapes, ...lShapes, ...(mShapes.length + lShapes.length === 0 ? sShapes : [])]

  let hasTopBanner = false
  let hasSideSpine = false
  let hasFooterRule = false
  let doubleHeaderLines = 0

  for (const shape of inspectShapes) {
    try {
      if (lib.hasShapeImage(shape)) continue
      const bounds = getBoundsSafe(lib, shape)
      if (!bounds) continue
      const relW = bounds.w / slideW
      const relH = bounds.h / slideH
      const relX = bounds.x / slideW
      const relY = bounds.y / slideH
      const name = String(lib.getShapeName?.(shape) ?? '').toLowerCase()

      if (relY <= 0.08 && relW >= 0.65 && relH <= 0.22) {
        hasTopBanner = true
        if (relH <= 0.025) doubleHeaderLines += 1
      }
      if ((relX <= 0.06 || relX >= 0.90) && relW <= 0.10 && relH >= 0.45) {
        hasSideSpine = true
      }
      if (relY >= 0.85 && relW >= 0.5 && relH <= 0.03) {
        hasFooterRule = true
      }
      if (name.includes('header') && relW >= 0.6) {
        hasTopBanner = true
      }
    } catch { /* ignore malformed shape */ }
  }

  const cornerStyle = classifyCornerFromShapes(lib, [...mShapes, ...lShapes, ...sShapes], slideW)
  return {
    cornerStyle,
    hasTopBanner,
    hasSideSpine,
    masterShapeCount: Array.isArray(masterShapes) ? masterShapes.length : mShapes.length,
    _hasFooterRule: hasFooterRule,
    _doubleHeaderLines: doubleHeaderLines,
  }
}

function inferChromeStyle(skeleton, palette, fonts, dark, recommendedTheme) {
  const fontText = [fonts.majorLatin, fonts.majorEastAsian, fonts.minorLatin, fonts.minorEastAsian].filter(Boolean).join(' ')
  const isSerif = /(?:times|georgia|garamond|cambria|palatino|宋体|SimSun|Songti|Source\s*Serif|Noto\s*Serif)/i.test(fontText)

  if (
    recommendedTheme === 'exec-palace' ||
    recommendedTheme === 'exec-jilan' ||
    skeleton._doubleHeaderLines >= 2 ||
    (palette.accent1 && /^#[89AB][0-9A-F]0{3}$/i.test(palette.accent1))
  ) {
    return 'gov-ceremonial'
  }

  if (
    recommendedTheme === 'academic' ||
    recommendedTheme === 'course-sage' ||
    recommendedTheme === 'medical-clean' ||
    (isSerif && !dark && (skeleton.hasTopBanner || skeleton._hasFooterRule))
  ) {
    return 'academic-minimal'
  }

  if (
    recommendedTheme === 'keynote-light' ||
    recommendedTheme === 'venture-daylight' ||
    recommendedTheme === 'aurora-stage' ||
    recommendedTheme === 'bold' ||
    skeleton.cornerStyle === 'soft' ||
    (!skeleton.hasTopBanner && !skeleton.hasSideSpine && !skeleton._hasFooterRule && skeleton.cornerStyle !== 'sharp' && !dark)
  ) {
    return 'keynote-spatial'
  }

  if (
    skeleton.hasSideSpine ||
    recommendedTheme === 'editorial-forest' ||
    recommendedTheme === 'economist-brief' ||
    recommendedTheme === 'cartesian' ||
    recommendedTheme === 'velvet' ||
    recommendedTheme === 'luxury-noir'
  ) {
    return 'editorial-folio'
  }

  if (
    recommendedTheme === 'linear-dark' ||
    recommendedTheme === 'stripe-craft' ||
    recommendedTheme === 'swiss' ||
    recommendedTheme === 'data' ||
    recommendedTheme === 'soft' ||
    (skeleton.cornerStyle === 'rounded' && dark)
  ) {
    return 'saas-bento'
  }

  return 'consulting-classic'
}

// ---------------------------------------------------------------------------
// Per-Slide Layout Classification (Full 24-Archetype + Variant Recognition)
// ---------------------------------------------------------------------------

function inspectTableForHarveyAndStyle(lib, tables) {
  let hasHarvey = false
  let styleHint = null
  for (const tbl of tables ?? []) {
    try {
      const dims = lib.getTableDimensions?.(tbl)
      const rows = dims?.rows ?? 0
      const cols = dims?.cols ?? 0
      let harveyHits = 0
      for (let r = 0; r < Math.min(rows, 15); r += 1) {
        for (let c = 0; c < Math.min(cols, 10); c += 1) {
          const txt = String(lib.getTableCellText?.(tbl, r, c) ?? '').trim()
          if (/[●◕◑◔○]/.test(txt)) harveyHits += 1
        }
      }
      if (harveyHits >= 2) hasHarvey = true
      const flags = lib.getTableStyleFlags?.(tbl)
      if (flags && flags.bandRow === false && flags.bandCol === false && flags.firstRow === true) {
        styleHint ||= 'booktabs'
      } else if (flags?.bandRow === true) {
        styleHint ||= 'banded'
      }
    } catch { /* ignore table inspection error */ }
  }
  return { hasHarvey, styleHint }
}

function analyzeSlideLayout(lib, slide, slideIndex, totalSlides, slideW, slideH) {
  const result = { slideNumber: slideIndex + 1, inferredLayout: 'bullets' }
  try {
    const slideXmlStr = typeof slide?.xml === 'string' ? slide.xml : ''
    if (/<p:sld\b[^>]*\bshow="0"/.test(slideXmlStr)) result.hidden = true
    const rawShapes = lib.getSlideShapes(slide) ?? []
    const shapes = flattenShapes(lib, rawShapes)
    let layoutType = ''
    let layoutName = ''
    try {
      const sLayout = lib.getSlideLayout(slide)
      if (sLayout) {
        layoutType = String(lib.getSlideLayoutType(sLayout) ?? '').toLowerCase()
        layoutName = String(lib.getSlideLayoutName?.(sLayout) ?? '').toLowerCase()
      }
    } catch { /* ignore */ }

    let hasChart = false
    let isWaterfallChart = false
    let hasTable = false
    let slideTables = []
    try {
      const charts = lib.getSlideCharts?.(slide)
      if (Array.isArray(charts) && charts.length > 0) hasChart = true
    } catch { /* ignore */ }
    try {
      const tables = lib.getSlideTables?.(slide)
      if (Array.isArray(tables) && tables.length > 0) {
        hasTable = true
        slideTables = tables
      }
    } catch { /* ignore */ }

    const tableMeta = hasTable ? inspectTableForHarveyAndStyle(lib, slideTables) : { hasHarvey: false, styleHint: null }

    let titleText = ''
    let titleFound = false
    let imageCount = 0
    let hasLeftHalfImage = false
    let hasRightHalfImage = false
    let nonTitleTextShapes = 0
    let largeCardShapes = 0
    let numericKpiShapes = 0
    let harveyCells = tableMeta.hasHarvey
    const harveyDotCoords = []
    let waterfallBars = 0
    let chevronShapes = 0
    const ellipseCircles = []
    let diamondShapes = 0
    let connectorShapes = 0
    let horizontalAxisLines = 0
    let roleBioHits = 0
    let quoteSignal = false
    let tamTextHits = 0
    const cardRects = []
    const ganttBars = []
    const layerBands = []
    const shapeCenters = []
    const allBodyTexts = []

    for (const shape of shapes) {
      try {
        if (lib.isChartShape?.(shape)) {
          hasChart = true
          try {
            if (String(lib.getShapeChartKind?.(shape) ?? '').toLowerCase() === 'waterfall') isWaterfallChart = true
          } catch { /* ignore */ }
        }
        if (lib.isTableShape?.(shape)) hasTable = true

        const name = String(lib.getShapeName?.(shape) ?? '').toLowerCase()
        const phType = String(lib.getShapePlaceholderType?.(shape) ?? '').toLowerCase()
        const preset = String(lib.getShapePreset?.(shape) ?? '').toLowerCase()
        const kind = String(lib.getShapeKind?.(shape) ?? '').toLowerCase()
        const bounds = getBoundsSafe(lib, shape)
        const text = String(lib.getShapeText?.(shape) ?? '').trim()

        if (name.startsWith('waterfall bar') || name.startsWith('waterfall bridge')) {
          waterfallBars += 1
        }
        if (name.startsWith('harvey ')) {
          harveyCells = true
        } else if (bounds && (preset === 'pie' || preset === 'ellipse') && (bounds.w / slideW) >= 0.01 && (bounds.w / slideW) <= 0.045 && Math.abs(bounds.w - bounds.h) <= bounds.w * 0.18) {
          const rx = bounds.x / slideW
          const ry = bounds.y / slideH
          // Ignore decorative vertical dot margins (left/right edges) — Harvey matrices sit inside the body grid
          if (rx >= 0.18 && rx <= 0.92 && ry >= 0.20 && ry <= 0.88) {
            harveyDotCoords.push({ x: rx, y: ry })
          }
        }
        if (kind === 'connector' || preset.includes('connector') || preset === 'line') {
          const inBodyZone = bounds && (bounds.y / slideH) > 0.22 && (bounds.y / slideH) < 0.86 && !/rule|folio|divider|header|footer|takeaway/i.test(name)
          if (inBodyZone) {
            connectorShapes += 1
            if (bounds.w / slideW >= 0.52 && bounds.h / slideH <= 0.025) {
              horizontalAxisLines += 1
            }
          }
        }
        if (!hasChart && (name.includes('chart') || (name.includes('diagram') && !name.includes('arch')))) hasChart = true
        if (!hasTable && name.includes('table')) hasTable = true

        if (phType === 'title' || phType === 'ctrtitle' || name.startsWith('title') || name.includes('标题')) {
          titleFound = true
          if (!titleText && text) titleText = text.replace(/\s+/g, ' ').slice(0, 80)
          continue
        }

        if (lib.hasShapeImage(shape)) {
          // Ignore tiny corner brand logos during content layout classification
          if (bounds && bounds.w <= slideW * 0.16 && bounds.h <= slideH * 0.14 && (bounds.y <= slideH * 0.16 || bounds.y + bounds.h >= slideH * 0.84)) {
            continue
          }
          imageCount += 1
          if (bounds) {
            const relW = bounds.w / slideW
            const relH = bounds.h / slideH
            const relX = bounds.x / slideW
            if (relW > 0.25 && relH > 0.3) {
              if (relX < 0.35) hasLeftHalfImage = true
              else if (relX >= 0.35) hasRightHalfImage = true
            }
          }
          continue
        }

        if (!bounds) {
          if (text) nonTitleTextShapes += 1
          continue
        }

        const relW = bounds.w / slideW
        const relH = bounds.h / slideH
        const relX = bounds.x / slideW
        const relY = bounds.y / slideH

        // Skip full-bleed background canvas shapes
        if (relW >= 0.78 && relH >= 0.78 && relX <= 0.12 && relY <= 0.12) continue

        if (!titleFound && relY < 0.22 && relW > 0.45 && relH < 0.22 && text) {
          titleFound = true
          titleText = text.replace(/\s+/g, ' ').slice(0, 80)
          continue
        }

        const isChromeShape =
          relY >= 0.88 ||
          (relY <= 0.12 && relH <= 0.12) ||
          /^(?:page number|footer|source|kicker|folio|beamer|header rule|takeaway)/i.test(name) ||
          phType === 'ftr' || phType === 'sldnum' || phType === 'dt'
        if (isChromeShape) continue

        if (preset === 'chevron' || preset === 'homeplate' || preset === 'pentagon') {
          chevronShapes += 1
        } else if (preset === 'ellipse' && relW >= 0.12 && relH >= 0.16 && Math.abs(bounds.w - bounds.h) <= Math.max(bounds.w, bounds.h) * 0.45) {
          ellipseCircles.push({ cx: relX + relW / 2, cy: relY + relH / 2, r: (relW + relH) / 4 })
        } else if (preset === 'diamond' && relW <= 0.08 && relH <= 0.12) {
          diamondShapes += 1
        }

        if (text) {
          nonTitleTextShapes += 1
          allBodyTexts.push(text)
          const firstLine = text.split('\n')[0]?.trim() ?? ''
          if (/^[+-]?[$¥€£]?\s*\d[\d.,]*\s*[%％倍xX万亿千百kKmMbBtT+]*$/.test(firstLine)) {
            numericKpiShapes += 1
          }
          if (/[●◕◑◔○]/.test(text)) harveyCells = true
          if (/\b(?:TAM|SAM|SOM)\b/i.test(text)) tamTextHits += 1
          if (/\b(?:CEO|CTO|CFO|COO|CMO|VP|SVP|Director|Founder|Partner)\b|负责人|总监|合伙人|首席|院长|组长/.test(text)) {
            roleBioHits += 1
          }
          if (/^[“"「『][\s\S]{10,}[”"」』]?/.test(text) || /——\s*\S+/.test(text)) {
            quoteSignal = true
          }
        }

        if (!lib.isChartShape?.(shape) && !lib.isTableShape?.(shape)) {
          if (relW >= 0.52 && relH >= 0.065 && relH <= 0.22 && relY >= 0.16 && relY <= 0.86) {
            layerBands.push({ x: relX, y: relY, w: relW, h: relH })
          }
          if (relW >= 0.10 && relW <= 0.68 && relH >= 0.025 && relH <= 0.105 && relY >= 0.20 && relY <= 0.85 && relX >= 0.14) {
            ganttBars.push({ x: relX, y: relY, w: relW, h: relH })
          }
          if (relW > 0.16 && relW < 0.88 && relH > 0.14) {
            cardRects.push({ x: relX, y: relY, w: relW, h: relH, cx: relX + relW / 2, cy: relY + relH / 2 })
            if (relW > 0.18 && relW < 0.65 && relH > 0.18) {
              largeCardShapes += 1
              shapeCenters.push({ x: relX + relW / 2, y: relY + relH / 2 })
            }
          }
        }
      } catch { /* ignore shape */ }
    }

    const combinedSignal = (titleText + ' ' + layoutName + ' ' + allBodyTexts.join(' ')).trim()
    const distinctGanttStarts = new Set(ganttBars.map((b) => Math.round(b.x * 20))).size
    const distinctLayerYs = new Set(layerBands.map((b) => Math.round(b.y * 20))).size
    const isFunnelBands = layerBands.length >= 3 && (() => {
      const sorted = [...layerBands].sort((a, b) => a.y - b.y)
      return sorted[0].w > sorted[sorted.length - 1].w * 1.18 && sorted.every((b, idx) => idx === 0 || b.w <= sorted[idx - 1].w * 1.03)
    })()
    const hasTopSummaryBanner = cardRects.some((r) => r.w >= 0.68 && r.h <= 0.26 && r.y <= 0.38)
    const lowerPillars = cardRects.filter((r) => r.w <= 0.42 && r.y >= 0.34)

    if (!harveyCells && harveyDotCoords.length >= 4) {
      const distinctCols = new Set(harveyDotCoords.map((p) => Math.round(p.x * 16))).size
      const distinctRows = new Set(harveyDotCoords.map((p) => Math.round(p.y * 12))).size
      if (distinctCols >= 2 && distinctRows >= 2) harveyCells = true
    }
    const hasConcentricCircles = ellipseCircles.length >= 2 && ellipseCircles.some((a, ai) =>
      ellipseCircles.some((b, bi) => bi > ai && Math.hypot(a.cx - b.cx, a.cy - b.cy) <= 0.16 && Math.abs(a.r - b.r) >= 0.04))

    // Priority order: rich native charts/tables/diagrams -> media -> framing -> structured layouts
    if (waterfallBars >= 3 || isWaterfallChart) {
      result.inferredLayout = 'waterfall'
    } else if (harveyCells) {
      result.inferredLayout = 'harvey'
    } else if (hasChart) {
      result.inferredLayout = nonTitleTextShapes >= 1 || largeCardShapes >= 1 ? 'chart-split' : 'chart'
    } else if (hasTable) {
      result.inferredLayout = 'table'
      if (tableMeta.styleHint) result.tableStyle = tableMeta.styleHint
    } else if (ellipseCircles.length >= 2 && (tamTextHits >= 2 || /市场规模|市场空间|\bTAM\b|\bSAM\b|\bSOM\b/i.test(combinedSignal) || (ellipseCircles.length >= 3 && hasConcentricCircles))) {
      result.inferredLayout = 'tam'
      result.variant = 'concentric'
    } else if (chevronShapes >= 3) {
      result.inferredLayout = 'process'
      result.variant = 'chevron'
    } else if (
      ganttBars.length >= 3 &&
      (distinctGanttStarts >= 2 || diamondShapes >= 1 || /\bQ[1-4]\b|\bW[1-9]\b|甘特|排期|路线图|里程碑|roadmap|gantt/i.test(combinedSignal)) &&
      distinctLayerYs >= 2 &&
      ganttBars.every((b) => b.w < 0.62)
    ) {
      result.inferredLayout = 'gantt'
      result.variant = /\bM1\b|1月|月份|month/i.test(combinedSignal) ? 'months' : 'quarters'
    } else if (isFunnelBands) {
      result.inferredLayout = 'process'
      result.variant = 'funnel'
    } else if (
      layerBands.length >= 3 &&
      distinctLayerYs >= 3 &&
      (/架构|分层|中台|底座|平台层|应用层|接入层|architecture|layer|platform|stack|infra/i.test(combinedSignal) || layerBands.length >= 4)
    ) {
      result.inferredLayout = 'architecture'
      result.variant = 'layered'
    } else if (
      largeCardShapes >= 3 &&
      numericKpiShapes < 2 &&
      (connectorShapes >= 2 || /组织架构|汇报线|治理架构|核心团队|管理团队|org\s*chart|leadership|team/i.test(titleText))
    ) {
      const ys = shapeCenters.map((c) => c.y).sort((a, b) => a - b)
      const hasTopRoot = ys.length >= 3 && (ys[1] - ys[0] >= 0.14)
      result.inferredLayout = 'org'
      result.variant = hasTopRoot || (!roleBioHits && connectorShapes >= 2) ? 'tree' : 'team'
    } else if (imageCount >= 2) {
      result.inferredLayout = 'image'
      result.variant = 'gallery'
    } else if (imageCount === 1) {
      if (hasLeftHalfImage && nonTitleTextShapes >= 1) result.inferredLayout = 'image-left'
      else if (hasRightHalfImage && nonTitleTextShapes >= 1) result.inferredLayout = 'image-right'
      else if (hasLeftHalfImage) result.inferredLayout = 'image-left'
      else if (hasRightHalfImage) result.inferredLayout = 'image-right'
      else result.inferredLayout = 'image'
    } else if (
      slideIndex === 0 &&
      (layoutType === 'title' || (titleFound && nonTitleTextShapes <= 2 && largeCardShapes <= 1) || (nonTitleTextShapes <= 1 && shapes.length <= 3))
    ) {
      result.inferredLayout = 'cover'
    } else if (
      slideIndex === totalSlides - 1 &&
      totalSlides >= 3 &&
      (nonTitleTextShapes <= 1 && /谢谢|感谢|Q\s*&\s*A|Thank|Contact|Next/i.test(titleText))
    ) {
      result.inferredLayout = 'closing'
    } else if (slideIndex > 0 && slideIndex <= 2 && /^(?:目录|汇报目录|议程|大纲|章节导航|Agenda|Contents|Table\s+of\s+Contents|Outline)$/i.test(titleText.trim())) {
      result.inferredLayout = 'agenda'
      result.variant = largeCardShapes >= 3 ? 'cards' : 'list'
    } else if (slideIndex > 0 && (layoutType === 'sechdr' || (nonTitleTextShapes === 0 && shapes.length <= 2))) {
      result.inferredLayout = 'section'
    } else if (quoteSignal && largeCardShapes <= 1 && nonTitleTextShapes <= 2) {
      result.inferredLayout = 'quote'
      result.variant = 'editorial'
    } else if (numericKpiShapes >= 2) {
      result.inferredLayout = 'kpi'
      result.variant = 'grid'
    } else if (hasTopSummaryBanner && lowerPillars.length >= 2 && lowerPillars.length <= 4) {
      result.inferredLayout = 'cards'
      result.variant = 'exec-summary'
    } else if (ellipseCircles >= 1 && largeCardShapes >= 3 && largeCardShapes <= 5) {
      result.inferredLayout = 'process'
      result.variant = 'flywheel'
    } else if (largeCardShapes === 4 && shapeCenters.length === 4) {
      const xs = shapeCenters.map((c) => c.x).sort((a, b) => a - b)
      const ys = shapeCenters.map((c) => c.y).sort((a, b) => a - b)
      const is2x2 = xs[2] - xs[1] > 0.15 && ys[2] - ys[1] > 0.15
      result.inferredLayout = is2x2 ? 'matrix' : 'cards'
      result.variant = is2x2 ? '2x2' : 'bento'
    } else if (largeCardShapes >= 3) {
      const ySpread = Math.max(...shapeCenters.map((c) => c.y)) - Math.min(...shapeCenters.map((c) => c.y))
      if (ySpread < 0.12) {
        const avgH = cardRects.reduce((s, r) => s + r.h, 0) / Math.max(1, cardRects.length)
        if (horizontalAxisLines >= 1 || /\bQ[1-4]\b|20\d{2}|阶段|里程碑|timeline|phase/i.test(combinedSignal)) {
          result.inferredLayout = 'process'
          result.variant = horizontalAxisLines >= 1 ? 'timeline' : 'steps'
        } else if (avgH >= 0.36) {
          result.inferredLayout = 'cards'
          result.variant = 'pillars'
        } else {
          result.inferredLayout = 'process'
          result.variant = 'steps'
        }
      } else {
        result.inferredLayout = 'cards'
        result.variant = 'bento'
      }
    } else if (largeCardShapes === 2) {
      result.inferredLayout = 'comparison'
      result.variant = /问题|痛点|风险|整改|应对|issue|mitigation/i.test(combinedSignal) ? 'issue-action' : 'versus'
    } else if (titleFound && nonTitleTextShapes === 0 && titleText.length >= 16) {
      result.inferredLayout = 'statement'
    } else {
      result.inferredLayout = 'bullets'
    }

    if (titleText) result.titleSample = titleText
  } catch { /* ignore slide analysis error */ }

  return result
}

// ---------------------------------------------------------------------------
// Background, Logo, Theme & Palette Extraction
// ---------------------------------------------------------------------------

function resolveBackgroundHex(bg, pres, slideOrLayout, themeScheme, colorMap, getGradFn, xmlStr = '') {
  if (bg && typeof bg === 'object') {
    let rawColor = null
    if (bg.kind === 'solid' && typeof bg.color === 'string') {
      rawColor = bg.color
    } else if (bg.kind === 'gradient' && typeof getGradFn === 'function') {
      try {
        const grad = slideOrLayout !== undefined ? getGradFn(pres, slideOrLayout) : null
        rawColor = grad?.stops?.[0]?.color ?? null
      } catch {
        try {
          const grad = getGradFn(slideOrLayout)
          rawColor = grad?.stops?.[0]?.color ?? null
        } catch { /* ignore */ }
      }
    }
    if (rawColor && typeof rawColor === 'string') {
      if (/^#?[\da-f]{6}$/i.test(rawColor.trim())) {
        return normalizeHex(rawColor.trim(), '') || null
      }
      if (rawColor.startsWith('scheme:') && themeScheme) {
        const slot = rawColor.slice(7).trim()
        const resolved = lookupSchemeHex(slot, themeScheme, colorMap)
        if (resolved) return resolved
      }
    }
  }
  if (xmlStr) {
    return resolveBackgroundFromXml(xmlStr, themeScheme, colorMap)
  }
  return null
}

function isValidRasterLogo(bytes, format) {
  if (!bytes || bytes.byteLength < 24 || bytes.byteLength > MAX_LOGO_BYTES) return false
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  if (format === 'png') {
    if (!buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return false
    if (buf.length < 45 || buf.toString('ascii', 12, 16) !== 'IHDR') return false
    const width = buf.readUInt32BE(16)
    const height = buf.readUInt32BE(20)
    if (!width || !height || width > 8000 || height > 8000) return false
    let offset = 8
    let ended = false
    const compressed = []
    while (offset + 12 <= buf.length) {
      const length = buf.readUInt32BE(offset)
      const type = buf.toString('ascii', offset + 4, offset + 8)
      if (offset + length + 12 > buf.length) return false
      if (type === 'IDAT') compressed.push(buf.subarray(offset + 8, offset + 8 + length))
      if (type === 'IEND') { ended = true; break }
      offset += length + 12
    }
    if (!ended || compressed.length === 0) return false
    try {
      inflateSync(Buffer.concat(compressed), { maxOutputLength: 32 * 1024 * 1024 })
      return true
    } catch {
      return false
    }
  }
  if (format === 'jpeg') {
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return false
    if (!buf.subarray(-2).equals(Buffer.from([0xff, 0xd9]))) return false
    return true
  }
  return false
}

function aspectLabel(widthEmu, heightEmu) {
  if (!widthEmu || !heightEmu) return '16:9'
  const ratio = widthEmu / heightEmu
  if (Math.abs(ratio - 16 / 9) < 0.04) return '16:9'
  if (Math.abs(ratio - 16 / 10) < 0.04) return '16:10'
  if (Math.abs(ratio - 4 / 3) < 0.04) return '4:3'
  return ratio.toFixed(2) + ':1'
}

function detectFullBleedShapeBg(lib, pres, shapes, slideW, slideH, themeScheme, colorMap) {
  if (!Array.isArray(shapes) || !slideW || !slideH) return null
  for (const shape of shapes) {
    try {
      if (lib.hasShapeImage(shape)) continue
      const bounds = lib.getShapeBounds(shape)
      if (!bounds) continue
      if (bounds.w >= slideW * 0.78 && bounds.h >= slideH * 0.78 && bounds.x <= slideW * 0.12 && bounds.y <= slideH * 0.12) {
        const fill = resolveShapeFillSafe(lib, pres, shape, themeScheme, colorMap)
        if (fill && /^#[\da-f]{6}$/i.test(fill)) return fill.toUpperCase()
      }
    } catch { /* ignore individual malformed shape */ }
  }
  return null
}

function extractCandidateLogo(lib, pres, slides, layouts, slideW, slideH) {
  const pools = []
  for (const layout of layouts.slice(0, 6)) {
    try { pools.push({ source: 'master', shapes: flattenShapes(lib, lib.getSlideMasterShapes(pres, layout)) }) } catch { /* ignore */ }
    try { pools.push({ source: 'layout', shapes: flattenShapes(lib, lib.getSlideLayoutShapes(pres, layout)) }) } catch { /* ignore */ }
  }
  if (slides[1]) {
    try { pools.push({ source: 'content-slide', shapes: flattenShapes(lib, lib.getSlideShapes(slides[1])) }) } catch { /* ignore */ }
  }
  if (slides[0]) {
    try { pools.push({ source: 'cover-slide', shapes: flattenShapes(lib, lib.getSlideShapes(slides[0])) }) } catch { /* ignore */ }
  }

  let best = null
  for (const pool of pools) {
    for (const shape of pool.shapes ?? []) {
      try {
        if (!lib.hasShapeImage(shape)) continue
        const rawFmt = String(lib.getShapeImageFormat(shape) ?? '').toLowerCase()
        const fmt = rawFmt === 'jpg' ? 'jpeg' : rawFmt
        if (fmt !== 'png' && fmt !== 'jpeg') continue
        const bounds = getBoundsSafe(lib, shape)
        if (!bounds || bounds.w <= 0 || bounds.h <= 0) continue

        const nameText = [
          lib.getShapeName?.(shape),
          lib.getShapeDescription?.(shape),
          lib.getShapeAltTitle?.(shape),
        ].filter(Boolean).join(' ')
        const namedLogo = /logo|brand|徽|标|院徽|校徽|台标/i.test(nameText)
        const maxW = namedLogo ? slideW * 0.45 : slideW * 0.28
        const maxH = namedLogo ? slideH * 0.35 : slideH * 0.20
        if (bounds.w > maxW || bounds.h > maxH) continue

        const nearCornerBand = bounds.y <= slideH * 0.24 || (bounds.y + bounds.h) >= slideH * 0.76
        if (!namedLogo && (pool.source === 'cover-slide' || pool.source === 'content-slide') && !nearCornerBand) continue

        const bytes = lib.getShapeImageBytes(shape)
        if (!isValidRasterLogo(bytes, fmt)) continue

        const originWeight = pool.source === 'master' ? 45 : pool.source === 'layout' ? 30 : pool.source === 'content-slide' ? 20 : 12
        const score = (namedLogo ? 100 : 0) + originWeight + (nearCornerBand ? 15 : 0)
        if (!best || score > best.score) {
          const b64 = Buffer.from(bytes).toString('base64')
          best = { score, source: pool.source, dataUri: `data:image/${fmt};base64,${b64}` }
        }
      } catch { /* ignore shape read error */ }
    }
  }
  return best ?? null
}

function safeReadXmlPart(lib, pres, partName) {
  if (!partName) return ''
  try {
    const raw = lib.readPackagePart?.(pres, partName)
    return raw ? Buffer.from(raw).toString('utf8') : ''
  } catch {
    return ''
  }
}

function resolveAnySlideBg(lib, pres, slide, widthEmu, heightEmu, rawTheme, fallbackColorMap) {
  if (!slide) return null
  const sColorMap = (() => { try { return lib.getEffectiveColorMap(slide) } catch { return fallbackColorMap } })() ?? fallbackColorMap
  const slideXml = (() => { try { return lib.getSlideXmlString?.(slide) ?? '' } catch { return '' } })()
  let bg = null
  try {
    bg = resolveBackgroundHex(
      lib.getSlideBackground(slide),
      pres,
      slide,
      rawTheme,
      sColorMap,
      lib.getSlideBackgroundGradientFill,
      slideXml,
    )
  } catch { /* ignore */ }
  if (!bg) {
    try {
      const sLayout = lib.getSlideLayout(slide)
      if (sLayout) {
        const layoutXml = safeReadXmlPart(lib, pres, lib.getSlideLayoutPartName?.(sLayout))
        bg = resolveBackgroundHex(
          lib.getSlideLayoutBackground(sLayout),
          pres,
          sLayout,
          rawTheme,
          sColorMap,
          lib.getSlideLayoutBackgroundGradientFill,
          layoutXml,
        ) || detectFullBleedShapeBg(lib, pres, lib.getSlideLayoutShapes(pres, sLayout), widthEmu, heightEmu, rawTheme, sColorMap)
      }
    } catch { /* ignore */ }
  }
  if (!bg) {
    try {
      bg = detectFullBleedShapeBg(lib, pres, lib.getSlideShapes(slide), widthEmu, heightEmu, rawTheme, sColorMap)
    } catch { /* ignore */ }
  }
  return bg
}

/**
 * 只读解析外部 .pptx 文件或字节流，提取并净化主题色板、中英文字体、母版 Logo、骨架特征与逐页版式分布。
 */
export async function absorbPptx(options = {}) {
  options.signal?.throwIfAborted()
  const cwd = resolve(String(options.cwd ?? '.'))
  const extractLogo = options.extractLogo !== false

  let bytes
  let resolvedPath
  if (options.bytes instanceof Uint8Array) {
    bytes = options.bytes
    if (typeof options.pptxPath === 'string' && options.pptxPath.trim()) {
      resolvedPath = resolve(cwd, options.pptxPath.trim())
    }
  } else {
    if (typeof options.pptxPath !== 'string' || !options.pptxPath.trim()) {
      fail('请提供参考 .pptx 文件路径 pptxPath', 'pptxPath is required')
    }
    resolvedPath = resolve(cwd, options.pptxPath.trim())
    let stat
    try {
      stat = lstatSync(resolvedPath)
    } catch {
      fail('找不到参考 PPTX 文件：' + resolvedPath, 'Reference PPTX file not found: ' + resolvedPath)
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      fail('参考 PPTX 必须是普通文件（不支持目录或符号链接）', 'Reference PPTX must be a regular file')
    }
    if (stat.size < 22 || stat.size > MAX_PPTX_BYTES) {
      fail('参考 PPTX 文件大小需在 64 MiB 以内', 'Reference PPTX must be up to 64 MiB')
    }
    bytes = readFileSync(resolvedPath)
  }

  if (!bytes || bytes.byteLength < 22 || bytes.byteLength > MAX_PPTX_BYTES || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    fail('文件不是有效的 .pptx 压缩包', 'Invalid .pptx archive')
  }

  options.signal?.throwIfAborted()
  let lib
  try {
    lib = await import('@office-kit/pptx')
  } catch (error) {
    fail('解析参考 PPTX 需要 @office-kit/pptx@0.21.0。独立技能请在技能目录运行 npm install --ignore-scripts。' + error.message)
  }
  options.signal?.throwIfAborted()

  let pres
  try {
    pres = await lib.loadPresentation(bytes)
  } catch (error) {
    fail('无法解析参考 PPTX 结构：' + error.message, 'Failed to parse PPTX: ' + error.message)
  }
  options.signal?.throwIfAborted()

  const slides = lib.getSlides(pres)
  const slideCount = slides.length
  const rawSize = lib.getSlideSize(pres)
  const widthEmu = rawSize?.width ?? 12192000
  const heightEmu = rawSize?.height ?? 6858000
  const slideSize = {
    width: Number((widthEmu / EMU_PER_INCH).toFixed(3)),
    height: Number((heightEmu / EMU_PER_INCH).toFixed(3)),
    widthEmu,
    heightEmu,
    aspect: aspectLabel(widthEmu, heightEmu),
  }

  const rawTheme = lib.getPresentationTheme(pres) ?? {}
  const rawFonts = lib.getPresentationFonts(pres) ?? {}
  const layouts = lib.getSlideLayouts(pres) ?? []
  const sampleSlide = slides[1] ?? slides[0] ?? null
  const colorMap = sampleSlide ? lib.getEffectiveColorMap(sampleSlide) : null

  let sampleLayout = null
  if (sampleSlide) {
    try { sampleLayout = lib.getSlideLayout(sampleSlide) } catch { /* ignore */ }
  }
  const firstLayout = sampleLayout ?? layouts[0] ?? null
  let masterPartName = null
  if (sampleSlide) {
    try { masterPartName = lib.getSlideMasterPartName?.(sampleSlide) } catch { /* ignore */ }
  }
  if (!masterPartName) {
    try { masterPartName = lib.getSlideMasterPartNames?.(pres)?.[0] ?? null } catch { /* ignore */ }
  }
  const masterXml = safeReadXmlPart(lib, pres, masterPartName)

  let masterBg = null
  if (firstLayout) {
    try {
      masterBg = resolveBackgroundHex(
        lib.getSlideMasterBackground(pres, firstLayout),
        pres,
        firstLayout,
        rawTheme,
        colorMap,
        lib.getSlideMasterBackgroundGradientFill,
        masterXml,
      )
    } catch { /* ignore */ }
    if (!masterBg) {
      try {
        masterBg = detectFullBleedShapeBg(lib, pres, lib.getSlideMasterShapes(pres, firstLayout), widthEmu, heightEmu, rawTheme, colorMap)
      } catch { /* ignore */ }
    }
  } else if (masterXml) {
    masterBg = resolveBackgroundFromXml(masterXml, rawTheme, colorMap)
  }

  const coverSlideBg = slides[0] ? resolveAnySlideBg(lib, pres, slides[0], widthEmu, heightEmu, rawTheme, colorMap) : null
  let contentSlideBg = sampleSlide ? resolveAnySlideBg(lib, pres, sampleSlide, widthEmu, heightEmu, rawTheme, colorMap) : null
  if (!contentSlideBg && coverSlideBg && slides.length === 1) {
    contentSlideBg = coverSlideBg
  }

  let bodyTextColor = null
  if (sampleSlide) {
    try { bodyTextColor = lib.resolveDeckBodyTextColor(sampleSlide) } catch { /* ignore */ }
  }

  // Scan shape fills across master + up to 8 slides to discover real chromatic brand accents
  // (covers Office default #4472C4/#156082 AND corporate templates where accent1 is charcoal/navy while brand color lives on shapes)
  let shapeAccentCandidate = null
  let shapeSecondaryCandidate = null
  const rawAccent1 = rawTheme.accent1 ? normalizeHex(rawTheme.accent1, '') : ''
  const accent1IsWeakOrDefault = !rawAccent1 || OFFICE_DEFAULT_ACCENTS.has(rawAccent1) || hexToHsl(rawAccent1).s < 0.14
  {
    const colorCounts = new Map()
    const inspectPool = []
    if (firstLayout) {
      try { inspectPool.push(...flattenShapes(lib, lib.getSlideMasterShapes(pres, firstLayout))) } catch { /* ignore */ }
    }
    for (const slide of slides.slice(0, 8)) {
      try { inspectPool.push(...flattenShapes(lib, lib.getSlideShapes(slide))) } catch { /* ignore */ }
    }
    const effectiveBg = (contentSlideBg ?? masterBg ?? '#FFFFFF').toUpperCase()
    for (const shape of inspectPool) {
      try {
        const b = getBoundsSafe(lib, shape)
        if (b && b.w >= widthEmu * 0.78 && b.h >= heightEmu * 0.78) continue
        const hex = resolveShapeFillSafe(lib, pres, shape, rawTheme, colorMap)
        if (!hex || !/^#[\da-f]{6}$/i.test(hex)) continue
        const norm = hex.toUpperCase()
        if (norm === '#FFFFFF' || norm === '#000000' || norm === effectiveBg || norm === coverSlideBg) continue
        const hsl = hexToHsl(norm)
        // Ignore very pale surface tints (L > 0.90) and near-neutral greys (S < 0.10) when hunting brand accents
        if (hsl.l > 0.90 || hsl.s < 0.10) continue
        colorCounts.set(norm, (colorCounts.get(norm) ?? 0) + 1)
      } catch { /* ignore */ }
    }
    const ranked = [...colorCounts.entries()].sort((a, b) => b[1] - a[1])
    if (accent1IsWeakOrDefault && ranked[0]) {
      shapeAccentCandidate = ranked[0][0]
    }
    const primaryRef = shapeAccentCandidate || rawAccent1
    if (primaryRef && ranked.length > 0) {
      const pH = hexToHsl(primaryRef).h
      const secHit = ranked.find(([hex]) => {
        const d = Math.abs(hexToHsl(hex).h - pH) % 360
        return (d > 180 ? 360 - d : d) >= 26
      })
      if (secHit) shapeSecondaryCandidate = secHit[0]
    }
  }

  const extractedPalette = {}
  for (const key of ['dark1', 'light1', 'dark2', 'light2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hyperlink', 'followedHyperlink']) {
    if (typeof rawTheme[key] === 'string' && rawTheme[key]) {
      extractedPalette[key] = normalizeHex(rawTheme[key], rawTheme[key])
    }
  }
  if (masterBg) extractedPalette.masterBg = masterBg
  if (coverSlideBg) extractedPalette.coverSlideBg = coverSlideBg
  if (contentSlideBg) extractedPalette.contentSlideBg = contentSlideBg
  if (bodyTextColor) extractedPalette.bodyTextColor = normalizeHex(bodyTextColor, bodyTextColor)

  const extractedFonts = {}
  for (const key of ['majorLatin', 'majorEastAsian', 'minorLatin', 'minorEastAsian']) {
    if (typeof rawFonts[key] === 'string' && rawFonts[key].trim()) {
      extractedFonts[key] = rawFonts[key].trim()
    }
  }

  const sanitized = sanitizeAbsorbedTheme({
    palette: extractedPalette,
    fonts: extractedFonts,
    masterBg: masterBg ?? undefined,
    coverSlideBg: coverSlideBg ?? undefined,
    contentSlideBg: contentSlideBg ?? masterBg ?? undefined,
    textColor: bodyTextColor ?? undefined,
    ...(shapeAccentCandidate ? { brandPrimary: shapeAccentCandidate } : {}),
    ...(shapeSecondaryCandidate ? { brandSecondary: shapeSecondaryCandidate } : {}),
  })

  const logoMatch = extractLogo ? extractCandidateLogo(lib, pres, slides, layouts, widthEmu, heightEmu) : null
  const logoDataUri = logoMatch?.dataUri ?? null
  if (
    logoMatch?.source === 'cover-slide' &&
    !sanitized.dark &&
    coverSlideBg &&
    relativeLuminance(coverSlideBg) < 0.25
  ) {
    sanitized.warnings.push('母版 Logo 提取自深色封面页；若为反白透明图标，应用后建议核对浅色正文页右上角可见度。')
  }

  let coreTitle = ''
  const isGenericDeckTitle = (t) =>
    /^(?:PowerPoint\s*(?:Presentation|演示文稿)|Microsoft\s+PowerPoint(?:\s+Presentation)?|Presentation\s*\d*|Slide\s*Deck|Untitled(?:\s+Presentation)?|Default\s+Presentation|演示文稿\s*\d*|幻灯片\s*\d*|新建\s*Microsoft\s*PowerPoint\s*演示文稿|WPS\s*演示)$/i.test(t)
  try {
    const props = lib.getCoreProperties(pres)
    if (typeof props?.title === 'string' && props.title.trim() && !isGenericDeckTitle(props.title.trim())) {
      coreTitle = props.title.trim().slice(0, 100)
    }
  } catch { /* ignore */ }

  const sanitizedBrand = {
    ...sanitized.sanitizedBrand,
    ...(coreTitle ? { name: coreTitle } : {}),
    ...(logoDataUri ? { logo: logoDataUri } : {}),
  }
  const isOfficeDefaultFont = (f) =>
    /^(?:SimSun|NSimSun|宋体|新宋体|FangSong|仿宋|Impact|Comic Sans MS|Songti SC|PingFang SC|Hiragino Sans GB|STSong|STHeiti|STFangsong|STKaiti|Arial Unicode MS|Apple SD Gothic Neo|Pretendard|Menlo|SF Pro(?: Display| Text)?|Helvetica Neue|Playfair Display)$/i.test(f) ||
    (/^(?:Calibri|Calibri Light|Aptos|Aptos Display)$/i.test(f) &&
      !extractedFonts.majorEastAsian &&
      !extractedFonts.minorEastAsian)

  if (sanitizedBrand.fontFamily && isOfficeDefaultFont(sanitizedBrand.fontFamily)) {
    delete sanitizedBrand.fontFamily
  }
  if (sanitizedBrand.headingFont && isOfficeDefaultFont(sanitizedBrand.headingFont)) {
    delete sanitizedBrand.headingFont
  }

  const layoutTypes = {}
  for (const layout of layouts) {
    try {
      const t = lib.getSlideLayoutType(layout) || lib.getSlideLayoutName(layout) || 'custom'
      layoutTypes[t] = (layoutTypes[t] ?? 0) + 1
    } catch { /* ignore */ }
  }
  let chartCount = 0
  let tableCount = 0
  let mediaPartCount = 0
  try { chartCount = lib.getAllCharts(pres).length } catch { /* ignore */ }
  try { tableCount = lib.getAllTables(pres).length } catch { /* ignore */ }
  try { mediaPartCount = lib.getMediaParts(pres).length } catch { /* ignore */ }

  const layoutSummary = {
    layoutCount: layouts.length,
    slideCount,
    chartCount,
    tableCount,
    mediaPartCount,
    hasLogo: Boolean(logoDataUri),
    layoutTypes,
  }

  // Deep Skeleton Extraction
  let masterShapes = []
  let layoutShapes = []
  let sampleSlideShapes = []
  if (firstLayout) {
    try { masterShapes = lib.getSlideMasterShapes(pres, firstLayout) ?? [] } catch { /* ignore */ }
    try { layoutShapes = lib.getSlideLayoutShapes(pres, firstLayout) ?? [] } catch { /* ignore */ }
  }
  if (sampleSlide) {
    try { sampleSlideShapes = lib.getSlideShapes(sampleSlide) ?? [] } catch { /* ignore */ }
  }

  const rawSkeleton = extractSkeletonFromShapes(lib, masterShapes, layoutShapes, sampleSlideShapes, widthEmu, heightEmu)
  const recommendedChrome = inferChromeStyle(rawSkeleton, extractedPalette, extractedFonts, sanitized.dark, sanitized.recommendedTheme)
  const extractedSkeleton = {
    cornerStyle: rawSkeleton.cornerStyle,
    hasTopBanner: rawSkeleton.hasTopBanner,
    hasSideSpine: rawSkeleton.hasSideSpine,
    masterShapeCount: rawSkeleton.masterShapeCount,
  }

  const slideSkeleton = slides.slice(0, 60).map((slide, idx) =>
    analyzeSlideLayout(lib, slide, idx, slides.length, widthEmu, heightEmu)
  )

  // Synthesize human-readable Narrative & Style Recipe Profile
  const archetypeCounts = {}
  let diagramSlideCount = 0
  let detectedTableStyle = null
  for (const entry of slideSkeleton) {
    const key = entry.variant ? `${entry.inferredLayout}:${entry.variant}` : entry.inferredLayout
    archetypeCounts[key] = (archetypeCounts[key] ?? 0) + 1
    if (['kpi', 'cards', 'comparison', 'matrix', 'process', 'gantt', 'architecture', 'harvey', 'tam', 'org', 'chart', 'chart-split', 'waterfall', 'table'].includes(entry.inferredLayout)) {
      diagramSlideCount += 1
    }
    if (!detectedTableStyle && entry.tableStyle) detectedTableStyle = entry.tableStyle
  }
  const recommendedTableStyle = detectedTableStyle || (recommendedChrome === 'academic-minimal' ? 'booktabs' : 'consulting')
  const narrativeProfile = {
    rhythmSummary: slideSkeleton.slice(0, 10).map((s) => `P${s.slideNumber}:${s.inferredLayout}${s.variant ? `[${s.variant}]` : ''}`).join(' → '),
    archetypeCounts,
    diagramRatio: slideCount > 0 ? Number((diagramSlideCount / slideCount).toFixed(2)) : 0,
    hasInvertedCover: sanitized.sanitizedTokens.coverMode === 'inverted-accent',
    recommendedTableStyle,
  }

  // Phase 6：深度审美 DNA 提炼（留白比、卡片材质倾向、字阶倍率、封面构图、跨页节奏分 -> 可复用 StyleRecipe）
  const canvasArea = Math.max(1, widthEmu * heightEmu)
  let wsSamples = []
  let filledBoxCount = 0
  let totalContentShapes = 0
  let maxTitlePt = 0
  const bodyPts = []
  for (const s of slides.slice(1, 9)) {
    try {
      const shs = flattenShapes(lib, lib.getSlideShapes(s) ?? [])
      let covered = 0
      for (const sh of shs) {
        const b = getBoundsSafe(lib, sh)
        if (!b || b.w <= 0 || b.h <= 0) continue
        if (b.w >= widthEmu * 0.88 && b.h >= heightEmu * 0.88) continue
        totalContentShapes += 1
        covered += Math.min(canvasArea * 0.45, b.w * b.h)
        const fill = resolveShapeFillSafe(lib, pres, sh, rawTheme, colorMap)
        if (fill) filledBoxCount += 1
        const xml = typeof sh?.xml === 'string' ? sh.xml : ''
        for (const m of xml.matchAll(/\bsz="(\d{3,4})"/g)) {
          const pt = Number(m[1]) / 100
          if (pt >= 22 && pt <= 72) maxTitlePt = Math.max(maxTitlePt, pt)
          else if (pt >= 10 && pt <= 20) bodyPts.push(pt)
        }
      }
      wsSamples.push(Math.max(0.18, Math.min(0.82, 1 - Math.min(0.82, covered / canvasArea))))
    } catch { /* ignore */ }
  }
  const whitespaceRatio = wsSamples.length > 0
    ? Number((wsSamples.reduce((a, b) => a + b, 0) / wsSamples.length).toFixed(2))
    : 0.48
  const density = whitespaceRatio >= 0.54 ? 'airy' : whitespaceRatio < 0.34 ? 'compact' : 'balanced'
  const filledRatio = totalContentShapes > 0 ? filledBoxCount / totalContentShapes : 0.4
  const inferredCardMaterial = sanitized.dark && rawSkeleton.cornerStyle !== 'sharp'
    ? 'glass'
    : recommendedChrome === 'editorial-folio'
      ? 'editorial-rule'
      : (filledRatio < 0.28 || whitespaceRatio >= 0.58)
        ? 'frameless'
        : 'solid'
  const medianBodyPt = bodyPts.length > 0
    ? bodyPts.sort((a, b) => a - b)[Math.floor(bodyPts.length / 2)]
    : 15
  const typeScaleRatio = maxTitlePt > 0
    ? Number(Math.max(1.4, Math.min(3.0, maxTitlePt / Math.max(11, medianBodyPt))).toFixed(2))
    : (recommendedChrome === 'keynote-spatial' ? 2.2 : 1.8)
  const coverVariant = sanitized.dark
    ? 'keynote-glow'
    : recommendedChrome === 'editorial-folio'
      ? 'editorial-grid'
      : sanitized.sanitizedTokens.coverMode === 'inverted-accent'
        ? 'inverted'
        : rawSkeleton.hasSideSpine
          ? 'architectural'
          : 'architectural'
  const sectionCount = slideSkeleton.filter((s) => s.inferredLayout === 'section').length
  let layoutTransitions = 0
  for (let i = 1; i < slideSkeleton.length; i += 1) {
    if (slideSkeleton[i].inferredLayout !== slideSkeleton[i - 1].inferredLayout) layoutTransitions += 1
  }
  const rhythmScore = slideSkeleton.length > 1
    ? Math.round((layoutTransitions / (slideSkeleton.length - 1)) * 100)
    : 85

  const baseId = String(options.saveTasteAs || coreTitle || (resolvedPath ? basename(resolvedPath, '.pptx') : 'absorbed-deck'))
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'absorbed-taste'

  const styleRecipe = sanitizeCustomTasteRecipe({
    id: baseId,
    name: options.tasteName || coreTitle || (resolvedPath ? basename(resolvedPath, '.pptx') : '吸收的标杆品味'),
    enName: options.tasteName || coreTitle || baseId,
    school: recommendedChrome,
    description: `提取自标杆 PPTX（${slideCount} 页）：${recommendedChrome} 骨架 · ${inferredCardMaterial} 材质 · 留白率 ${Math.round(whitespaceRatio * 100)}%`,
    enDescription: `Absorbed benchmark (${slideCount} slides): ${recommendedChrome} chrome, ${inferredCardMaterial} cards, ${Math.round(whitespaceRatio * 100)}% whitespace`,
    theme: sanitized.recommendedTheme,
    chromeStyle: recommendedChrome,
    tableStyle: recommendedTableStyle,
    cardMaterial: inferredCardMaterial,
    coverVariant,
    sectionVariant: sectionCount >= 2 ? 'agenda' : 'default',
    kpiVariant: whitespaceRatio >= 0.46 ? 'spotlight' : 'grid',
    cardsVariant: inferredCardMaterial === 'frameless' ? 'frameless' : (sanitized.dark ? 'bento-hero' : 'pillars'),
    iconMode: recommendedChrome === 'keynote-spatial' || recommendedChrome === 'saas-bento' ? 'auto' : 'explicit',
    iconBadgeStyle: inferredCardMaterial === 'frameless' ? 'bare' : (inferredCardMaterial === 'glass' ? 'ring' : 'soft'),
    chartSpotlight: true,
    chartGrowthCallout: chartCount > 0,
    density,
    typeScaleRatio,
    whitespaceRatio,
    rhythmScore,
    brand: sanitizedBrand,
    swatches: [
      sanitized.sanitizedTokens.canvas,
      sanitized.sanitizedTokens.accentPrimary,
      sanitized.sanitizedTokens.accentSecondary,
      sanitized.sanitizedTokens.inkPrimary,
    ],
    ...(resolvedPath ? { sourceFile: basename(resolvedPath) } : {}),
  })

  let savedTastePath
  if (typeof options.saveTasteAs === 'string' && options.saveTasteAs.trim()) {
    const saved = saveWorkspaceTasteRecipe(styleRecipe, cwd)
    savedTastePath = saved.path
  }

  const baseResult = {
    ok: true,
    ...(resolvedPath ? { pptxPath: resolvedPath, sourceFile: basename(resolvedPath) } : {}),
    slideCount,
    slideSize,
    extractedPalette,
    extractedFonts,
    sanitizedBrand,
    sanitizedTokens: sanitized.sanitizedTokens,
    recommendedTheme: sanitized.recommendedTheme,
    recommendedChrome,
    recommendedTableStyle,
    narrativeProfile,
    styleRecipe,
    ...(savedTastePath ? { savedTastePath } : {}),
    dark: sanitized.dark,
    warnings: sanitized.warnings,
    layoutSummary,
    extractedSkeleton,
    slideSkeleton: slideSkeleton.map((entry) => (
      entry.titleSample && /\(hidden\)|模板说明|使用说明|template\s+instructions/i.test(entry.titleSample)
        ? { ...entry, hidden: true }
        : entry
    )),
  }

  let savedExemplarPath
  let exemplar
  if (typeof options.saveExemplarAs === 'string' && options.saveExemplarAs.trim()) {
    const extracted = extractExemplarFromAbsorbed(baseResult, {
      id: options.saveExemplarAs.trim(),
      name: options.tasteName || options.exemplarName,
    })
    const savedEx = saveWorkspaceExemplar(cwd, extracted)
    savedExemplarPath = savedEx.path
    exemplar = savedEx.exemplar
  }

  let savedBrandKitPath
  let brandKit
  if (options.saveBrandKit === true || (options.saveBrandKit && typeof options.saveBrandKit === 'object')) {
    const bkOpts = typeof options.saveBrandKit === 'object' ? options.saveBrandKit : {}
    const builtKit = buildBrandKitFromAbsorbed(baseResult, {
      name: options.brandKitName || bkOpts.name || options.tasteName,
      enforce: bkOpts.enforce !== false,
      watermark: options.watermark || bkOpts.watermark,
      footer: options.footer || bkOpts.footer,
      forbiddenTerms: Array.isArray(options.forbiddenTerms) ? options.forbiddenTerms : bkOpts.forbiddenTerms,
      mandatoryClosing: options.mandatoryClosing || bkOpts.mandatoryClosing,
    })
    const savedBk = saveWorkspaceBrandKit(cwd, builtKit)
    savedBrandKitPath = savedBk.path
    brandKit = savedBk.brandKit
  }

  return {
    ...baseResult,
    ...(savedExemplarPath ? { savedExemplarPath, exemplar } : {}),
    ...(savedBrandKitPath ? { savedBrandKitPath, brandKit } : {}),
  }
}

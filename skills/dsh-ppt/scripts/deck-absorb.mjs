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
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { sanitizeAbsorbedTheme, normalizeHex, hexToHsl } from './deck-themes.mjs'

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
    }
  }

  const toHex = (v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0').toUpperCase()
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

function parseXmlModifiers(innerXml) {
  if (!innerXml) return []
  const mods = []
  const modRe = /<a:(lumMod|lumOff|tint|shade|satMod|satOff)\b[^>]*\bval=["'](-?\d+)["'][^>]*\/?>/g
  for (const m of innerXml.matchAll(modRe)) {
    mods.push({ kind: m[1], val: Number(m[2]) })
  }
  return mods
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
 * Parse <a:srgbClr> or <a:schemeClr> (including child lumMod/lumOff/tint/shade/satMod) from an XML fragment.
 */
export function resolveXmlColorElement(xmlFragment, themeScheme, colorMap) {
  if (!xmlFragment || typeof xmlFragment !== 'string') return null
  const match = /<a:(srgbClr|schemeClr)\b[^>]*\bval=["']([^"']+)["'][^>]*(?:\/>|>([\s\S]*?)<\/a:\1>)/.exec(xmlFragment)
  if (!match) return null
  const [, tag, val, inner] = match
  let baseHex = null
  if (tag === 'srgbClr') {
    baseHex = normalizeHex(val, '') || null
  } else {
    baseHex = lookupSchemeHex(val.trim(), themeScheme, colorMap)
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

function classifyCornerFromShapes(lib, shapes, slideW) {
  let hasRounded = false
  let hasSoft = false
  let hasSharpRect = false
  for (const shape of shapes) {
    try {
      const bounds = lib.getShapeBounds(shape)
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
  const mShapes = Array.isArray(masterShapes) ? masterShapes : []
  const lShapes = Array.isArray(layoutShapes) ? layoutShapes : []
  const sShapes = Array.isArray(sampleSlideShapes) ? sampleSlideShapes : []
  const inspectShapes = [...mShapes, ...lShapes, ...(mShapes.length + lShapes.length === 0 ? sShapes : [])]

  let hasTopBanner = false
  let hasSideSpine = false
  let hasFooterRule = false
  let doubleHeaderLines = 0

  for (const shape of inspectShapes) {
    try {
      if (lib.hasShapeImage(shape)) continue
      const bounds = lib.getShapeBounds(shape)
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
    masterShapeCount: mShapes.length,
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
    recommendedTheme === 'bold' ||
    skeleton.cornerStyle === 'soft' ||
    (!skeleton.hasTopBanner && !skeleton.hasSideSpine && !skeleton._hasFooterRule && skeleton.cornerStyle !== 'sharp' && !dark)
  ) {
    return 'keynote-spatial'
  }

  if (
    skeleton.hasSideSpine ||
    recommendedTheme === 'editorial-forest' ||
    recommendedTheme === 'cartesian' ||
    recommendedTheme === 'velvet' ||
    recommendedTheme === 'luxury-noir'
  ) {
    return 'editorial-folio'
  }

  if (
    recommendedTheme === 'linear-dark' ||
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
// Per-Slide Layout Classification
// ---------------------------------------------------------------------------

function analyzeSlideLayout(lib, slide, slideIndex, totalSlides, slideW, slideH) {
  const result = { slideNumber: slideIndex + 1, inferredLayout: 'bullets' }
  try {
    const shapes = lib.getSlideShapes(slide) ?? []
    let layoutType = ''
    try {
      const sLayout = lib.getSlideLayout(slide)
      if (sLayout) layoutType = String(lib.getSlideLayoutType(sLayout) ?? '').toLowerCase()
    } catch { /* ignore */ }

    let hasChart = false
    let hasTable = false
    try {
      const charts = lib.getSlideCharts?.(slide)
      if (Array.isArray(charts) && charts.length > 0) hasChart = true
    } catch { /* ignore */ }
    try {
      const tables = lib.getSlideTables?.(slide)
      if (Array.isArray(tables) && tables.length > 0) hasTable = true
    } catch { /* ignore */ }

    let titleText = ''
    let titleFound = false
    let imageCount = 0
    let hasLeftHalfImage = false
    let hasRightHalfImage = false
    let nonTitleTextShapes = 0
    let largeCardShapes = 0
    let numericKpiShapes = 0
    let harveyCells = false
    const shapeCenters = []

    for (const shape of shapes) {
      try {
        if (lib.isChartShape?.(shape)) hasChart = true
        if (lib.isTableShape?.(shape)) hasTable = true

        const name = String(lib.getShapeName?.(shape) ?? '').toLowerCase()
        const phType = String(lib.getShapePlaceholderType?.(shape) ?? '').toLowerCase()
        const bounds = lib.getShapeBounds(shape)
        const text = String(lib.getShapeText?.(shape) ?? '').trim()

        if (!hasChart && (name.includes('chart') || name.includes('diagram'))) hasChart = true
        if (!hasTable && name.includes('table')) hasTable = true

        if (phType === 'title' || phType === 'ctrtitle' || name.startsWith('title') || name.includes('标题')) {
          titleFound = true
          if (!titleText && text) titleText = text.replace(/\s+/g, ' ').slice(0, 80)
          continue
        }

        if (lib.hasShapeImage(shape)) {
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

        if (text) {
          nonTitleTextShapes += 1
          if (/^[+-]?\d[\d.,]*\s*[%％倍xX万亿千百kKmMbB+]*$/.test(text.split('\n')[0]?.trim() ?? '')) {
            numericKpiShapes += 1
          }
          if (/[●◕◑◔○]/.test(text)) harveyCells = true
        }

        if (!lib.isChartShape?.(shape) && !lib.isTableShape?.(shape) && relW > 0.18 && relW < 0.65 && relH > 0.18) {
          largeCardShapes += 1
          shapeCenters.push({ x: relX + relW / 2, y: relY + relH / 2 })
        }
      } catch { /* ignore shape */ }
    }

    // Check charts & tables BEFORE shapeCount <= 2 so single-chart/single-table slides classify accurately!
    if (harveyCells) {
      result.inferredLayout = 'harvey'
    } else if (hasChart) {
      result.inferredLayout = nonTitleTextShapes >= 1 || largeCardShapes >= 1 ? 'chart-split' : 'chart'
    } else if (hasTable) {
      result.inferredLayout = 'table'
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
    } else if (slideIndex > 0 && (layoutType === 'sechdr' || (nonTitleTextShapes === 0 && shapes.length <= 2))) {
      result.inferredLayout = 'section'
    } else if (numericKpiShapes >= 2) {
      result.inferredLayout = 'kpi'
      result.variant = 'grid'
    } else if (largeCardShapes === 4 && shapeCenters.length === 4) {
      const xs = shapeCenters.map((c) => c.x).sort((a, b) => a - b)
      const ys = shapeCenters.map((c) => c.y).sort((a, b) => a - b)
      const is2x2 = xs[2] - xs[1] > 0.15 && ys[2] - ys[1] > 0.15
      result.inferredLayout = is2x2 ? 'matrix' : 'cards'
      result.variant = is2x2 ? '2x2' : 'bento'
    } else if (largeCardShapes >= 3) {
      const ySpread = Math.max(...shapeCenters.map((c) => c.y)) - Math.min(...shapeCenters.map((c) => c.y))
      if (ySpread < 0.12) {
        result.inferredLayout = 'process'
        result.variant = 'steps'
      } else {
        result.inferredLayout = 'cards'
        result.variant = 'bento'
      }
    } else if (largeCardShapes === 2) {
      result.inferredLayout = 'comparison'
      result.variant = 'versus'
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
    try { pools.push({ source: 'master', shapes: lib.getSlideMasterShapes(pres, layout) }) } catch { /* ignore */ }
    try { pools.push({ source: 'layout', shapes: lib.getSlideLayoutShapes(pres, layout) }) } catch { /* ignore */ }
  }
  for (const slide of slides.slice(0, 2)) {
    try { pools.push({ source: 'slide', shapes: lib.getSlideShapes(slide) }) } catch { /* ignore */ }
  }

  let best = null
  for (const pool of pools) {
    for (const shape of pool.shapes ?? []) {
      try {
        if (!lib.hasShapeImage(shape)) continue
        const rawFmt = String(lib.getShapeImageFormat(shape) ?? '').toLowerCase()
        const fmt = rawFmt === 'jpg' ? 'jpeg' : rawFmt
        if (fmt !== 'png' && fmt !== 'jpeg') continue
        const bounds = lib.getShapeBounds(shape)
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
        if (!namedLogo && pool.source === 'slide' && !nearCornerBand) continue

        const bytes = lib.getShapeImageBytes(shape)
        if (!isValidRasterLogo(bytes, fmt)) continue

        const score = (namedLogo ? 100 : 0) + (pool.source === 'master' ? 40 : pool.source === 'layout' ? 25 : 10) + (nearCornerBand ? 15 : 0)
        if (!best || score > best.score) {
          const b64 = Buffer.from(bytes).toString('base64')
          best = { score, dataUri: `data:image/${fmt};base64,${b64}` }
        }
      } catch { /* ignore shape read error */ }
    }
  }
  return best?.dataUri ?? null
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

  let contentSlideBg = null
  if (sampleSlide) {
    const sampleXml = (() => { try { return lib.getSlideXmlString?.(sampleSlide) ?? '' } catch { return '' } })()
    try {
      contentSlideBg = resolveBackgroundHex(
        lib.getSlideBackground(sampleSlide),
        pres,
        sampleSlide,
        rawTheme,
        colorMap,
        lib.getSlideBackgroundGradientFill,
        sampleXml,
      )
    } catch { /* ignore */ }
    if (!contentSlideBg && sampleLayout) {
      const layoutPartName = (() => { try { return lib.getSlideLayoutPartName?.(sampleLayout) } catch { return '' } })()
      const layoutXml = safeReadXmlPart(lib, pres, layoutPartName)
      try {
        contentSlideBg = resolveBackgroundHex(
          lib.getSlideLayoutBackground(sampleLayout),
          pres,
          sampleLayout,
          rawTheme,
          colorMap,
          lib.getSlideLayoutBackgroundGradientFill,
          layoutXml,
        ) || detectFullBleedShapeBg(lib, pres, lib.getSlideLayoutShapes(pres, sampleLayout), widthEmu, heightEmu, rawTheme, colorMap)
      } catch { /* ignore */ }
    }
    if (!contentSlideBg) {
      try {
        contentSlideBg = detectFullBleedShapeBg(lib, pres, lib.getSlideShapes(sampleSlide), widthEmu, heightEmu, rawTheme, colorMap)
      } catch { /* ignore */ }
    }
  }
  if (!contentSlideBg && slides[0] && slides[0] !== sampleSlide) {
    const firstXml = (() => { try { return lib.getSlideXmlString?.(slides[0]) ?? '' } catch { return '' } })()
    try {
      contentSlideBg = resolveBackgroundHex(
        lib.getSlideBackground(slides[0]),
        pres,
        slides[0],
        rawTheme,
        colorMap,
        lib.getSlideBackgroundGradientFill,
        firstXml,
      ) || detectFullBleedShapeBg(lib, pres, lib.getSlideShapes(slides[0]), widthEmu, heightEmu, rawTheme, colorMap)
    } catch { /* ignore */ }
  }

  let bodyTextColor = null
  if (sampleSlide) {
    try { bodyTextColor = lib.resolveDeckBodyTextColor(sampleSlide) } catch { /* ignore */ }
  }

  let shapeAccentCandidate = null
  const rawAccent1 = rawTheme.accent1 ? normalizeHex(rawTheme.accent1, '') : ''
  if (!rawAccent1 || OFFICE_DEFAULT_ACCENTS.has(rawAccent1)) {
    const colorCounts = new Map()
    const inspectPool = []
    if (firstLayout) {
      try { inspectPool.push(...lib.getSlideMasterShapes(pres, firstLayout)) } catch { /* ignore */ }
    }
    for (const slide of slides.slice(0, 6)) {
      try { inspectPool.push(...lib.getSlideShapes(slide)) } catch { /* ignore */ }
    }
    for (const shape of inspectPool) {
      try {
        const b = lib.getShapeBounds(shape)
        if (b && b.w >= widthEmu * 0.78 && b.h >= heightEmu * 0.78) continue
        const hex = resolveShapeFillSafe(lib, pres, shape, rawTheme, colorMap)
        if (!hex || !/^#[\da-f]{6}$/i.test(hex)) continue
        const norm = hex.toUpperCase()
        if (norm === '#FFFFFF' || norm === '#000000' || norm === (contentSlideBg ?? masterBg)) continue
        colorCounts.set(norm, (colorCounts.get(norm) ?? 0) + 1)
      } catch { /* ignore */ }
    }
    let topCount = 0
    for (const [hex, count] of colorCounts.entries()) {
      if (count > topCount) {
        topCount = count
        shapeAccentCandidate = hex
      }
    }
  }

  const extractedPalette = {}
  for (const key of ['dark1', 'light1', 'dark2', 'light2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hyperlink', 'followedHyperlink']) {
    if (typeof rawTheme[key] === 'string' && rawTheme[key]) {
      extractedPalette[key] = normalizeHex(rawTheme[key], rawTheme[key])
    }
  }
  if (masterBg) extractedPalette.masterBg = masterBg
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
    contentSlideBg: contentSlideBg ?? masterBg ?? undefined,
    textColor: bodyTextColor ?? undefined,
    ...(shapeAccentCandidate ? { brandPrimary: shapeAccentCandidate } : {}),
  })

  const logoDataUri = extractLogo ? extractCandidateLogo(lib, pres, slides, layouts, widthEmu, heightEmu) : null
  let coreTitle = ''
  try {
    const props = lib.getCoreProperties(pres)
    if (typeof props?.title === 'string' && props.title.trim() && !/^PowerPoint 演示文稿$|^Presentation\d*$/i.test(props.title.trim())) {
      coreTitle = props.title.trim().slice(0, 100)
    }
  } catch { /* ignore */ }

  const sanitizedBrand = {
    ...sanitized.sanitizedBrand,
    ...(coreTitle ? { name: coreTitle } : {}),
    ...(logoDataUri ? { logo: logoDataUri } : {}),
  }
  if (
    sanitizedBrand.fontFamily &&
    (
      /^(?:SimSun|NSimSun|宋体|新宋体|FangSong|仿宋|Impact|Comic Sans MS)$/i.test(sanitizedBrand.fontFamily) ||
      (/^(?:Calibri|Calibri Light|Aptos|Aptos Display)$/i.test(sanitizedBrand.fontFamily) &&
        !extractedFonts.majorEastAsian &&
        !extractedFonts.minorEastAsian)
    )
  ) {
    delete sanitizedBrand.fontFamily
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

  return {
    ok: true,
    ...(resolvedPath ? { pptxPath: resolvedPath } : {}),
    slideCount,
    slideSize,
    extractedPalette,
    extractedFonts,
    sanitizedBrand,
    sanitizedTokens: sanitized.sanitizedTokens,
    recommendedTheme: sanitized.recommendedTheme,
    recommendedChrome,
    dark: sanitized.dark,
    warnings: sanitized.warnings,
    layoutSummary,
    extractedSkeleton,
    slideSkeleton,
  }
}

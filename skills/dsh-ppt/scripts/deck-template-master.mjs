/**
 * deck-template-master.mjs —— 企业固定模板母版层（Plan A 双端同构母版 + Plan B 原生 PPTX slideMaster 直出引擎）。
 *
 * 严格遵循零冲突与安全原则：
 *   1. 默认彻底关闭（opt-in：`brand.templateMaster.enabled === true` 才激活），绝不干扰既有默认建稿链路与 506 项回归测试；
 *   2. 零外部运行时依赖（仅使用 Node 内置模块 + 外部传入的 @office-kit/pptx 实例），技能目录独立复制到任意 Agent 环境均可运行；
 *   3. Plan A（overlay / HTML 同构层）：按 4 种页面角色（cover / section / content / closing）提取矢量+位图母版背景、自动计算安全留白区（safeInsets）、自动检测明暗极性适配文字对比度、自动避让冲突的内置封面装饰/重复 Logo/重复页脚；
 *   4. Plan B（native-master 直出增强版）：在 Plan A 基础上，将企业 .pptx 原生 slideMaster / slideLayout / theme 与去重媒体清洗移植到导出 .pptx，支持 PowerPoint 幻灯片母版视图二次编辑，并在异常母版校验失败时自动无感回退至 Plan A。
 */

import { createHash } from 'node:crypto'
import { basename, extname } from 'node:path'
import { inflateSync } from 'node:zlib'
import {
  normalizeHex,
  relativeLuminance,
  contrastRatio,
  mixHex,
  bestContrastInk,
  ensureContrast,
} from './deck-themes.mjs'
import { escapeXml, escapeHtml, CANVAS_IN, EMU_PER_IN, EMU_W, EMU_H } from './deck-chrome.mjs'

export const TEMPLATE_MASTER_ROLES = Object.freeze(['cover', 'section', 'content', 'closing'])
export const TEMPLATE_MASTER_MODES = Object.freeze(['native-master', 'overlay'])

const MAX_SINGLE_MEDIA_BYTES = 5 * 1024 * 1024
const MAX_TOTAL_TEMPLATE_BYTES = 12 * 1024 * 1024

const DEFAULT_MARGINS_IN = Object.freeze({
  top: 0.36,
  bottom: 0.45,
  left: 0.62,
  right: 0.62,
})

const CONTENT_PH_TYPES = new Set([
  '',
  'title',
  'ctrtitle',
  'subtitle',
  'body',
  'obj',
  'pic',
  'tbl',
  'chart',
  'dgm',
  'media',
  'clipart',
  'half',
  'qtr',
  'objtx',
])

const MEDIA_MIME_BY_EXT = Object.freeze({
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  gif: 'image/gif',
  emf: 'image/x-emf',
  wmf: 'image/x-wmf',
})

const RASTER_ASSET_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp'])

const SAFE_REL_TYPES = Object.freeze({
  SLIDE_MASTER: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster',
  SLIDE_LAYOUT: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout',
  THEME: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme',
  IMAGE: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
  NOTES_SLIDE: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide',
})

// ---------------------------------------------------------------------------
// 平衡 XML 元素扫描器（零外部依赖，正确处理嵌套 <p:grpSp> 与注释/CDATA）
// ---------------------------------------------------------------------------

function findTagClose(xml, startIdx) {
  let quote = ''
  for (let i = startIdx; i < xml.length; i += 1) {
    const ch = xml[i]
    if (quote) {
      if (ch === quote) quote = ''
    } else if (ch === '"' || ch === "'") {
      quote = ch
    } else if (ch === '>') {
      return i
    }
  }
  return -1
}

function isTagBoundary(ch) {
  return ch === undefined || ch === '>' || ch === '/' || ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r'
}

/**
 * 扫描 XML 中所有顶层平衡的 `<tagName ...>...</tagName>` 或 `<tagName .../>` 元素。
 */
export function findBalancedElements(xml, tagName) {
  if (typeof xml !== 'string' || !xml || !tagName) return []
  const out = []
  const openPrefix = '<' + tagName
  const closePrefix = '</' + tagName
  let i = 0
  const len = xml.length

  while (i < len) {
    const lt = xml.indexOf('<', i)
    if (lt < 0) break
    if (xml.startsWith('<!--', lt)) {
      const end = xml.indexOf('-->', lt + 4)
      i = end < 0 ? len : end + 3
      continue
    }
    if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt + 9)
      i = end < 0 ? len : end + 3
      continue
    }
    if (xml.startsWith(openPrefix, lt) && isTagBoundary(xml[lt + openPrefix.length])) {
      const firstGt = findTagClose(xml, lt + openPrefix.length)
      if (firstGt < 0) break
      const rawOpen = xml.slice(lt, firstGt + 1)
      const selfClosing = /\/\s*>$/.test(rawOpen)
      const attrs = xml.slice(lt + openPrefix.length, selfClosing ? firstGt - 1 : firstGt).trim()
      if (selfClosing) {
        out.push({
          start: lt,
          end: firstGt + 1,
          outerXml: rawOpen,
          attrs,
          innerXml: '',
          selfClosing: true,
        })
        i = firstGt + 1
        continue
      }
      let depth = 1
      let cur = firstGt + 1
      let matchedEnd = -1
      let innerEnd = -1
      while (cur < len && depth > 0) {
        const nextLt = xml.indexOf('<', cur)
        if (nextLt < 0) break
        if (xml.startsWith('<!--', nextLt)) {
          const end = xml.indexOf('-->', nextLt + 4)
          cur = end < 0 ? len : end + 3
          continue
        }
        if (xml.startsWith('<![CDATA[', nextLt)) {
          const end = xml.indexOf(']]>', nextLt + 9)
          cur = end < 0 ? len : end + 3
          continue
        }
        if (xml.startsWith(openPrefix, nextLt) && isTagBoundary(xml[nextLt + openPrefix.length])) {
          const gt = findTagClose(xml, nextLt + openPrefix.length)
          if (gt < 0) break
          if (!/\/\s*>$/.test(xml.slice(nextLt, gt + 1))) depth += 1
          cur = gt + 1
          continue
        }
        if (xml.startsWith(closePrefix, nextLt) && isTagBoundary(xml[nextLt + closePrefix.length])) {
          const gt = findTagClose(xml, nextLt + closePrefix.length)
          if (gt < 0) break
          depth -= 1
          if (depth === 0) {
            innerEnd = nextLt
            matchedEnd = gt + 1
            break
          }
          cur = gt + 1
          continue
        }
        cur = nextLt + 1
      }
      if (matchedEnd > 0) {
        out.push({
          start: lt,
          end: matchedEnd,
          outerXml: xml.slice(lt, matchedEnd),
          attrs,
          innerXml: xml.slice(firstGt + 1, innerEnd),
          selfClosing: false,
        })
        i = matchedEnd
      } else {
        i = firstGt + 1
      }
      continue
    }
    i = lt + 1
  }
  return out
}

export function stripXmlRanges(xml, ranges) {
  if (!ranges || ranges.length === 0) return xml
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  let out = ''
  let cursor = 0
  for (const r of sorted) {
    if (r.start < cursor) continue
    out += xml.slice(cursor, r.start)
    cursor = r.end
  }
  out += xml.slice(cursor)
  return out
}

function getXmlAttr(attrs, name) {
  if (!attrs) return ''
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`(?:^|\\s)${escaped}=["']([^"']*)["']`).exec(attrs)
  return m ? m[1] : ''
}

function unescapeXmlEntities(str) {
  return String(str ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function resolvePartRelativePath(basePartPath, target) {
  const cleanBase = String(basePartPath || '').replace(/^\/+/, '')
  const cleanTarget = String(target || '').trim()
  if (!cleanTarget || /^https?:|^mailto:|^file:/i.test(cleanTarget)) return null
  if (cleanTarget.startsWith('/')) return '/' + cleanTarget.replace(/^\/+/, '')
  const baseParts = cleanBase.split('/')
  baseParts.pop()
  for (const seg of cleanTarget.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') baseParts.pop()
    else baseParts.push(seg)
  }
  return '/' + baseParts.join('/')
}

function relsPathForPart(partName) {
  const norm = '/' + String(partName || '').replace(/^\/+/, '')
  const idx = norm.lastIndexOf('/')
  const dir = norm.slice(0, idx)
  const file = norm.slice(idx + 1)
  return `${dir}/_rels/${file}.rels`
}

function parseRelationshipsXml(xml) {
  if (!xml || typeof xml !== 'string') return []
  const rels = []
  const re = /<Relationship\b([^>]*)\/?>/g
  for (const m of xml.matchAll(re)) {
    const attrs = m[1]
    const id = getXmlAttr(attrs, 'Id')
    const type = getXmlAttr(attrs, 'Type')
    const target = getXmlAttr(attrs, 'Target')
    const targetMode = getXmlAttr(attrs, 'TargetMode')
    if (id && type && target) {
      rels.push({ id, type, target, targetMode })
    }
  }
  return rels
}

function buildRelationshipsXml(rels) {
  const items = rels.map((r) =>
    `<Relationship Id="${escapeXml(r.id)}" Type="${escapeXml(r.type)}" Target="${escapeXml(r.target)}"` +
    (r.targetMode ? ` TargetMode="${escapeXml(r.targetMode)}"` : '') +
    '/>',
  ).join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    items +
    '</Relationships>'
}

// ---------------------------------------------------------------------------
// 图像解析 & 纯 JS PNG 中心安全区明暗/方差采样器
// ---------------------------------------------------------------------------

function inspectRasterImageBytes(bytes) {
  if (!bytes || bytes.length < 16) return null
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  if (buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (buf.length < 33 || buf.toString('ascii', 12, 16) !== 'IHDR') return null
    const width = buf.readUInt32BE(16)
    const height = buf.readUInt32BE(20)
    if (!width || !height || width > 16000 || height > 16000) return null
    return { width, height, mime: 'image/png', ext: 'png' }
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2
    let width = 0
    let height = 0
    while (offset + 4 < buf.length) {
      if (buf[offset] !== 0xff) break
      while (buf[offset] === 0xff) offset += 1
      const marker = buf[offset++]
      if (marker === 0xd9 || marker === 0xda) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      const len = buf.readUInt16BE(offset)
      if (len < 2 || offset + len > buf.length) break
      if ([0xc0, 0xc1, 0xc2].includes(marker) && len >= 7) {
        height = buf.readUInt16BE(offset + 3)
        width = buf.readUInt16BE(offset + 5)
        break
      }
      offset += len
    }
    if (!width || !height) return null
    return { width, height, mime: 'image/jpeg', ext: 'jpg' }
  }
  if (buf.length >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buf.toString('ascii', 12, 16)
    let width = 0
    let height = 0
    if (chunk === 'VP8 ' && buf.length >= 30) {
      width = buf.readUInt16LE(26) & 0x3fff
      height = buf.readUInt16LE(28) & 0x3fff
    } else if (chunk === 'VP8L' && buf.length >= 25) {
      const bits = buf.readUInt32LE(21)
      width = (bits & 0x3fff) + 1
      height = ((bits >> 14) & 0x3fff) + 1
    } else if (chunk === 'VP8X' && buf.length >= 30) {
      width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16))
      height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16))
    }
    if (!width || !height) return null
    return { width, height, mime: 'image/webp', ext: 'webp' }
  }
  return null
}

function paethPredictor(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

/**
 * 纯 JS 解码 PNG（支持 8-bit 灰度/RGB/索引调色板/RGBA 与全部 5 种滤波模式）并采样中心内容安全区的平均亮度、代表色与方差。
 */
export function samplePngCenterLuminance(pngBytes) {
  try {
    const buf = Buffer.isBuffer(pngBytes) ? pngBytes : Buffer.from(pngBytes)
    if (buf.length < 45 || !buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return null
    if (buf.toString('ascii', 12, 16) !== 'IHDR') return null
    const width = buf.readUInt32BE(16)
    const height = buf.readUInt32BE(20)
    const bitDepth = buf[24]
    const colorType = buf[25]
    const interlace = buf[28]
    if (bitDepth !== 8 || interlace !== 0 || width <= 0 || height <= 0 || width * height > 20_000_000) return null

    const bppByType = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }
    const bpp = bppByType[colorType]
    if (!bpp) return null

    const idatChunks = []
    let palette = null
    let offset = 8
    while (offset + 12 <= buf.length) {
      const length = buf.readUInt32BE(offset)
      const type = buf.toString('ascii', offset + 4, offset + 8)
      if (offset + 12 + length > buf.length) break
      const chunkData = buf.subarray(offset + 8, offset + 8 + length)
      if (type === 'IDAT') idatChunks.push(chunkData)
      else if (type === 'PLTE') palette = chunkData
      else if (type === 'IEND') break
      offset += 12 + length
    }
    if (idatChunks.length === 0) return null
    if (colorType === 3 && (!palette || palette.length < 3)) return null

    const stride = width * bpp
    const expectedLen = (stride + 1) * height
    if (expectedLen > 64 * 1024 * 1024) return null
    const raw = inflateSync(Buffer.concat(idatChunks), { maxOutputLength: expectedLen + 65536 })
    if (raw.length < expectedLen) return null

    const prev = new Uint8Array(stride)
    const curr = new Uint8Array(stride)
    const yStart = Math.floor(height * 0.18)
    const yEnd = Math.max(yStart + 1, Math.floor(height * 0.82))
    const xStart = Math.floor(width * 0.14)
    const xEnd = Math.max(xStart + 1, Math.floor(width * 0.86))
    const yStep = Math.max(1, Math.floor((yEnd - yStart) / 14))
    const xStep = Math.max(1, Math.floor((xEnd - xStart) / 18))

    const lums = []
    let sumR = 0
    let sumG = 0
    let sumB = 0
    let samples = 0

    for (let y = 0; y <= yEnd && y < height; y += 1) {
      const rowOff = y * (stride + 1)
      const filter = raw[rowOff]
      for (let x = 0; x < stride; x += 1) {
        const v = raw[rowOff + 1 + x]
        const a = x >= bpp ? curr[x - bpp] : 0
        const b = y > 0 ? prev[x] : 0
        const c = (x >= bpp && y > 0) ? prev[x - bpp] : 0
        let recon = v
        if (filter === 1) recon = (v + a) & 0xff
        else if (filter === 2) recon = (v + b) & 0xff
        else if (filter === 3) recon = (v + ((a + b) >> 1)) & 0xff
        else if (filter === 4) recon = (v + paethPredictor(a, b, c)) & 0xff
        curr[x] = recon
      }
      if (y >= yStart && y <= yEnd && ((y - yStart) % yStep === 0)) {
        for (let px = xStart; px < xEnd; px += xStep) {
          const i = px * bpp
          let r = 255
          let g = 255
          let b = 255
          let alpha = 255
          if (colorType === 0) {
            r = g = b = curr[i]
          } else if (colorType === 2) {
            r = curr[i]; g = curr[i + 1]; b = curr[i + 2]
          } else if (colorType === 3) {
            const pIdx = curr[i] * 3
            if (pIdx + 2 < palette.length) {
              r = palette[pIdx]; g = palette[pIdx + 1]; b = palette[pIdx + 2]
            }
          } else if (colorType === 4) {
            r = g = b = curr[i]; alpha = curr[i + 1]
          } else if (colorType === 6) {
            r = curr[i]; g = curr[i + 1]; b = curr[i + 2]; alpha = curr[i + 3]
          }
          // Composite transparent pixels over white
          if (alpha < 255) {
            const a01 = alpha / 255
            r = Math.round(r * a01 + 255 * (1 - a01))
            g = Math.round(g * a01 + 255 * (1 - a01))
            b = Math.round(b * a01 + 255 * (1 - a01))
          }
          const hex = '#' +
            r.toString(16).padStart(2, '0') +
            g.toString(16).padStart(2, '0') +
            b.toString(16).padStart(2, '0')
          lums.push(relativeLuminance(hex))
          sumR += r
          sumG += g
          sumB += b
          samples += 1
        }
      }
      prev.set(curr)
    }

    if (samples === 0) return null
    const avgLuminance = lums.reduce((s, v) => s + v, 0) / samples
    const variance = lums.reduce((s, v) => s + (v - avgLuminance) ** 2, 0) / samples
    const stdLuminance = Math.sqrt(variance)
    const avgHex = '#' +
      Math.round(sumR / samples).toString(16).padStart(2, '0').toUpperCase() +
      Math.round(sumG / samples).toString(16).padStart(2, '0').toUpperCase() +
      Math.round(sumB / samples).toString(16).padStart(2, '0').toUpperCase()
    return {
      avgLuminance: Number(avgLuminance.toFixed(4)),
      stdLuminance: Number(stdLuminance.toFixed(4)),
      avgColor: avgHex,
      dark: avgLuminance < 0.36,
      needsScrim: stdLuminance > 0.22,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Theme / ColorMap 解析器（支持 <p:clrMap>、<p:clrMapOvr>、<p:bgRef>）
// ---------------------------------------------------------------------------

function parseColorMapFromXml(xml, fallbackMap = null) {
  const base = fallbackMap ? { ...fallbackMap } : {
    bg1: 'lt1',
    tx1: 'dk1',
    bg2: 'lt2',
    tx2: 'dk2',
    accent1: 'accent1',
    accent2: 'accent2',
    accent3: 'accent3',
    accent4: 'accent4',
    accent5: 'accent5',
    accent6: 'accent6',
    hlink: 'hlink',
    folHlink: 'folHlink',
  }
  if (!xml) return base
  const m = /<(?:p:clrMap|a:overrideClrMapping)\b([^>]*)\/?>/.exec(xml)
  if (!m) return base
  const attrs = m[1]
  for (const key of Object.keys(base)) {
    const val = getXmlAttr(attrs, key)
    if (val) base[key] = val
  }
  return base
}

const SCHEME_PROP_MAP = {
  dk1: 'dark1', lt1: 'light1', dk2: 'dark2', lt2: 'light2',
  bg1: 'light1', tx1: 'dark1', bg2: 'light2', tx2: 'dark2',
  dark1: 'dark1', light1: 'light1', dark2: 'dark2', light2: 'light2',
  accent1: 'accent1', accent2: 'accent2', accent3: 'accent3',
  accent4: 'accent4', accent5: 'accent5', accent6: 'accent6',
  hlink: 'hyperlink', folHlink: 'followedHyperlink',
  hyperlink: 'hyperlink', followedHyperlink: 'followedHyperlink',
  phClr: 'accent1',
}

const PRESET_COLOR_HEX = {
  black: '#000000', white: '#FFFFFF', navy: '#000080', darkblue: '#00008B',
  midnightblue: '#191970', royalblue: '#4169E1', teal: '#008080', darkgreen: '#006400',
  darkred: '#8B0000', crimson: '#DC143C', gold: '#FFD700', orange: '#FFA500',
  gray: '#808080', lightgray: '#D3D3D3', darkslategray: '#2F4F4F', slategray: '#708090',
}

function clamp01(v) { return Math.max(0, Math.min(1, v)) }
function srgbToLin(c) { return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
function linToSrgb(c) { const v = clamp01(c); return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055 }

function rgbToHsl01(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h / 6, s, l]
}

function hslToRgb01(h, s, l) {
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const hue = (t) => {
    let u = t
    if (u < 0) u += 1
    if (u > 1) u -= 1
    if (u < 1 / 6) return p + (q - p) * 6 * u
    if (u < 1 / 2) return q
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6
    return p
  }
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)]
}

function resolveXmlColorElement(xmlFragment, themeScheme, colorMap) {
  if (!xmlFragment || typeof xmlFragment !== 'string') return null
  const m = /<a:(srgbClr|schemeClr|sysClr|prstClr)\b([^>]*)(?:\/>|>([\s\S]*?)<\/a:\1>)/.exec(xmlFragment)
  if (!m) return null
  const [, tag, attrs, inner] = m
  const val = getXmlAttr(attrs, 'val').trim()
  const lastClr = getXmlAttr(attrs, 'lastClr').trim()
  let baseHex = null
  if (tag === 'srgbClr') {
    baseHex = normalizeHex(val, '') || null
  } else if (tag === 'sysClr') {
    if (lastClr && /^#?[\da-f]{6}$/i.test(lastClr)) baseHex = normalizeHex(lastClr, '') || null
    else if (/windowtext|buttontext|menutext/i.test(val)) baseHex = '#000000'
    else if (/window|highlighttext/i.test(val)) baseHex = '#FFFFFF'
  } else if (tag === 'prstClr') {
    baseHex = PRESET_COLOR_HEX[val.toLowerCase()] ?? null
  } else if (val && themeScheme) {
    const mapped = (colorMap && colorMap[val]) || val
    const prop = SCHEME_PROP_MAP[mapped] || SCHEME_PROP_MAP[val] || mapped
    const cand = themeScheme[prop]
    if (cand && /^#?[\da-f]{6}$/i.test(String(cand))) baseHex = normalizeHex(cand, '') || null
  }
  if (!baseHex) return null
  if (!inner) return baseHex
  let r = parseInt(baseHex.slice(1, 3), 16) / 255
  let g = parseInt(baseHex.slice(3, 5), 16) / 255
  let b = parseInt(baseHex.slice(5, 7), 16) / 255
  for (const mod of inner.matchAll(/<a:(lumMod|lumOff|tint|shade|satMod|satOff)\b[^>]*\bval=["'](-?\d+)["'][^>]*\/?>/g)) {
    const kind = mod[1]
    const ratio = Number(mod[2]) / 100000
    if (!Number.isFinite(ratio)) continue
    if (kind === 'tint') {
      r = linToSrgb(srgbToLin(r) * ratio + (1 - ratio))
      g = linToSrgb(srgbToLin(g) * ratio + (1 - ratio))
      b = linToSrgb(srgbToLin(b) * ratio + (1 - ratio))
    } else if (kind === 'shade') {
      r = linToSrgb(srgbToLin(r) * ratio)
      g = linToSrgb(srgbToLin(g) * ratio)
      b = linToSrgb(srgbToLin(b) * ratio)
    } else if (kind === 'lumMod' || kind === 'lumOff') {
      const [h, s, l] = rgbToHsl01(r, g, b)
      ;[r, g, b] = hslToRgb01(h, s, clamp01(kind === 'lumMod' ? l * ratio : l + ratio))
    } else if (kind === 'satMod' || kind === 'satOff') {
      const [h, s, l] = rgbToHsl01(r, g, b)
      ;[r, g, b] = hslToRgb01(h, clamp01(kind === 'satMod' ? s * ratio : s + ratio), l)
    }
  }
  const toHex = (v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0').toUpperCase()
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

function parseThemeSchemeFromXml(themeXml) {
  const scheme = {
    dark1: '#000000',
    light1: '#FFFFFF',
    dark2: '#1F2937',
    light2: '#F3F4F6',
    accent1: '#1D4ED8',
    accent2: '#0EA5E9',
    accent3: '#10B981',
    accent4: '#F59E0B',
    accent5: '#8B5CF6',
    accent6: '#EF4444',
    hyperlink: '#1D4ED8',
    followedHyperlink: '#7C3AED',
  }
  if (!themeXml) return { scheme, bgFillStyles: [] }
  const slotMap = {
    dk1: 'dark1',
    lt1: 'light1',
    dk2: 'dark2',
    lt2: 'light2',
    accent1: 'accent1',
    accent2: 'accent2',
    accent3: 'accent3',
    accent4: 'accent4',
    accent5: 'accent5',
    accent6: 'accent6',
    hlink: 'hyperlink',
    folHlink: 'followedHyperlink',
  }
  const clrSchemeEl = findBalancedElements(themeXml, 'a:clrScheme')[0]
  if (clrSchemeEl) {
    for (const [tag, prop] of Object.entries(slotMap)) {
      const el = findBalancedElements(clrSchemeEl.innerXml, 'a:' + tag)[0]
      if (!el) continue
      const resolved = resolveXmlColorElement(el.innerXml, scheme, null)
      if (resolved) scheme[prop] = resolved
    }
  }
  const bgFillStyles = []
  const bgLst = findBalancedElements(themeXml, 'a:bgFillStyleLst')[0]
  if (bgLst) {
    const re = /<a:(solidFill|gradFill|blipFill|pattFill|noFill)\b/g
    let m
    while ((m = re.exec(bgLst.innerXml)) !== null) {
      const found = findBalancedElements(bgLst.innerXml.slice(m.index), 'a:' + m[1])[0]
      if (found) {
        bgFillStyles.push(found.outerXml)
        re.lastIndex = m.index + found.end
      }
    }
  }
  return { scheme, bgFillStyles }
}

function parseColorAlpha(xmlFragment) {
  if (!xmlFragment) return 1
  const m = /<a:alpha\b[^>]*\bval=["'](\d+)["']/.exec(xmlFragment)
  if (!m) return 1
  return Math.max(0, Math.min(1, Number(m[1]) / 100000))
}

function parseFillFromXml(containerXml, themeScheme, colorMap, relsMap, bgFillStyles = []) {
  if (!containerXml) return null
  if (/<a:noFill\b[^>]*\/>/.test(containerXml)) return { type: 'none' }

  // <p:bgRef idx="1001..">
  const bgRef = findBalancedElements(containerXml, 'p:bgRef')[0]
  if (bgRef) {
    const idx = Number(getXmlAttr(bgRef.attrs, 'idx') || '0')
    const phHex = resolveXmlColorElement(bgRef.innerXml, themeScheme, colorMap) || '#FFFFFF'
    if (idx >= 1001 && bgFillStyles[idx - 1001]) {
      const substituted = bgFillStyles[idx - 1001].replace(
        /<a:schemeClr\b[^>]*\bval=["']phClr["']([^>]*)(?:\/>|>([\s\S]*?)<\/a:schemeClr>)/g,
        (_, restAttrs, inner) => inner !== undefined
          ? `<a:srgbClr val="${phHex.slice(1)}"${restAttrs}>${inner}</a:srgbClr>`
          : `<a:srgbClr val="${phHex.slice(1)}"${restAttrs}/>`,
      )
      const parsed = parseFillFromXml(substituted, themeScheme, colorMap, relsMap, [])
      if (parsed) return parsed
    }
    return { type: 'solid', color: phHex, alpha: parseColorAlpha(bgRef.innerXml) }
  }

  const blipFill = findBalancedElements(containerXml, 'a:blipFill')[0] || findBalancedElements(containerXml, 'p:blipFill')[0]
  if (blipFill) {
    const rId = extractPreferredBlipRId(blipFill.outerXml)
    const targetPath = rId ? relsMap.get(rId) : null
    if (targetPath) {
      const srcRectMatch = /<a:srcRect\b([^>]*)\/?>/.exec(blipFill.outerXml)
      const crop = srcRectMatch ? {
        l: Number(getXmlAttr(srcRectMatch[1], 'l') || 0) / 100000,
        r: Number(getXmlAttr(srcRectMatch[1], 'r') || 0) / 100000,
        t: Number(getXmlAttr(srcRectMatch[1], 't') || 0) / 100000,
        b: Number(getXmlAttr(srcRectMatch[1], 'b') || 0) / 100000,
      } : null
      return { type: 'image', partPath: targetPath, rId, crop }
    }
  }

  const gradFill = findBalancedElements(containerXml, 'a:gradFill')[0]
  if (gradFill) {
    const stops = []
    for (const gs of findBalancedElements(gradFill.innerXml, 'a:gs')) {
      const pos = Math.max(0, Math.min(100, Number(getXmlAttr(gs.attrs, 'pos') || '0') / 1000))
      const color = resolveXmlColorElement(gs.innerXml, themeScheme, colorMap)
      if (color) stops.push({ pos, color, alpha: parseColorAlpha(gs.innerXml) })
    }
    if (stops.length >= 2) {
      const linMatch = /<a:lin\b([^>]*)\/?>/.exec(gradFill.innerXml)
      const angleDeg = linMatch ? (Number(getXmlAttr(linMatch[1], 'ang') || '0') / 60000) % 360 : 0
      return { type: 'gradient', angleDeg, stops }
    }
    if (stops.length === 1) {
      return { type: 'solid', color: stops[0].color, alpha: stops[0].alpha }
    }
  }

  const solidFill = findBalancedElements(containerXml, 'a:solidFill')[0]
  if (solidFill) {
    const color = resolveXmlColorElement(solidFill.innerXml, themeScheme, colorMap)
    if (color) return { type: 'solid', color, alpha: parseColorAlpha(solidFill.innerXml) }
  }
  return null
}

function extractPreferredBlipRId(xml) {
  if (!xml) return ''
  // Prefer raster <a:blip r:embed="..."> (works across HTML img/SVG & PowerPoint/LibreOffice)
  const m = /<a:blip\b[^>]*\br:embed=["']([^"']+)["']/.exec(xml)
  if (m) return m[1]
  const svgM = /<asvg:svgBlip\b[^>]*\br:embed=["']([^"']+)["']/.exec(xml)
  return svgM ? svgM[1] : ''
}

function parseXfrmFromXml(xml) {
  const xfrm = findBalancedElements(xml, 'a:xfrm')[0] || findBalancedElements(xml, 'p:xfrm')[0]
  if (!xfrm) return null
  const off = /<a:off\b([^>]*)\/?>/.exec(xfrm.innerXml)
  const ext = /<a:ext\b([^>]*)\/?>/.exec(xfrm.innerXml)
  if (!off || !ext) return null
  const x = Number(getXmlAttr(off[1], 'x'))
  const y = Number(getXmlAttr(off[1], 'y'))
  const w = Number(getXmlAttr(ext[1], 'cx'))
  const h = Number(getXmlAttr(ext[1], 'cy'))
  if (![x, y, w, h].every(Number.isFinite)) return null
  const rot = Number(getXmlAttr(xfrm.attrs, 'rot') || '0') / 60000
  const flipH = getXmlAttr(xfrm.attrs, 'flipH') === '1'
  const flipV = getXmlAttr(xfrm.attrs, 'flipV') === '1'
  const chOff = /<a:chOff\b([^>]*)\/?>/.exec(xfrm.innerXml)
  const chExt = /<a:chExt\b([^>]*)\/?>/.exec(xfrm.innerXml)
  const ch = (chOff && chExt) ? {
    x: Number(getXmlAttr(chOff[1], 'x')) || 0,
    y: Number(getXmlAttr(chOff[1], 'y')) || 0,
    w: Number(getXmlAttr(chExt[1], 'cx')) || w || 1,
    h: Number(getXmlAttr(chExt[1], 'cy')) || h || 1,
  } : null
  return { x, y, w, h, rot, flipH, flipV, ch }
}

function parsePlaceholderTag(shapeXml) {
  const phMatch = /<p:ph\b([^>]*)\/?>/.exec(shapeXml)
  if (!phMatch) return null
  const attrs = phMatch[1]
  return {
    type: getXmlAttr(attrs, 'type').toLowerCase(),
    idx: getXmlAttr(attrs, 'idx'),
  }
}

function extractPlainTextFromShapeXml(shapeXml) {
  const txBody = findBalancedElements(shapeXml, 'p:txBody')[0]
  if (!txBody) return ''
  const parts = []
  for (const t of findBalancedElements(txBody.innerXml, 'a:t')) {
    const s = unescapeXmlEntities(t.innerXml).trim()
    if (s) parts.push(s)
  }
  return parts.join(' ').trim()
}

function isPlaceholderPromptText(text) {
  const s = String(text || '').trim().toLowerCase()
  if (!s) return true
  return /^(?:click to (?:add|edit)|单击此处|点击(?:添加|编辑)|双击|标题|副标题|正文|页脚|footer|date|日期|<#>|‹#›|\d{1,3})$/i.test(s)
}

function hasDynamicSlideNumberField(shapeXml) {
  return /<a:fld\b[^>]*\btype=["']slidenum["']/i.test(shapeXml)
}

/**
 * 判断某形状元素是否是应从 slideMaster / slideLayout 中剥离的内容占位符：
 * - 标题/副标题/正文/对象/图片/表格/图表等占位符：剥离，彻底杜绝 "Click to add title" 幽灵占位框；
 * - 保留带真实企业页脚文字的 `ftr` 占位符，及含动态 `<a:fld type="slidenum">` 的 `sldNum` 占位符（在 layout 上保留）；
 * - 空的或仅提示词的 `dt` / `ftr` / `sldNum` 占位符：剥离。
 */
function shouldStripPlaceholderElement(shapeXml, isMaster = false) {
  const ph = parsePlaceholderTag(shapeXml)
  if (!ph) return false
  if (CONTENT_PH_TYPES.has(ph.type)) return true
  if (ph.type === 'sldnum') {
    if (isMaster) return true
    return !hasDynamicSlideNumberField(shapeXml)
  }
  if (ph.type === 'ftr') {
    if (isMaster) return true
    const txt = extractPlainTextFromShapeXml(shapeXml)
    return isPlaceholderPromptText(txt)
  }
  if (ph.type === 'dt' || ph.type === 'hdr') {
    if (isMaster) return true
    const txt = extractPlainTextFromShapeXml(shapeXml)
    return isPlaceholderPromptText(txt)
  }
  return true
}

// ---------------------------------------------------------------------------
// 4:3 等非 16:9 模板智能适配 16:9（保护角落 Logo 绝不拉伸变形）
// ---------------------------------------------------------------------------

function scaleBoxTo16x9(box, srcW, srcH) {
  const sx = EMU_W / srcW
  const sy = EMU_H / srcH
  if (Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return box
  const sUniform = Math.min(sx, sy)
  const isFullWidthBanner = box.w >= srcW * 0.62
  const isFullHeightSpine = box.h >= srcH * 0.60 && box.w < srcW * 0.25
  const isCornerSmall = box.w <= srcW * 0.35 && box.h <= srcH * 0.30

  if (isFullWidthBanner) {
    return {
      x: Math.round(box.x * sx),
      y: Math.round(box.y * sy),
      w: Math.round(box.w * sx),
      h: Math.round(box.h * sy),
    }
  }
  if (isFullHeightSpine) {
    const newW = Math.round(box.w * sUniform)
    const onRight = (box.x + box.w / 2) > srcW / 2
    const newX = onRight
      ? Math.round(EMU_W - (srcW - (box.x + box.w)) * sUniform - newW)
      : Math.round(box.x * sUniform)
    return {
      x: newX,
      y: Math.round(box.y * sy),
      w: newW,
      h: Math.round(box.h * sy),
    }
  }
  if (isCornerSmall) {
    const newW = Math.round(box.w * sUniform)
    const newH = Math.round(box.h * sUniform)
    const onRight = (box.x + box.w / 2) > srcW / 2
    const onBottom = (box.y + box.h / 2) > srcH / 2
    const newX = onRight
      ? Math.round(EMU_W - (srcW - (box.x + box.w)) * sUniform - newW)
      : Math.round(box.x * sUniform)
    const newY = onBottom
      ? Math.round(EMU_H - (srcH - (box.y + box.h)) * sUniform - newH)
      : Math.round(box.y * sUniform)
    return { x: newX, y: newY, w: newW, h: newH }
  }
  return {
    x: Math.round(box.x * sx),
    y: Math.round(box.y * sy),
    w: Math.round(box.w * sx),
    h: Math.round(box.h * sy),
  }
}

function replaceFirstXfrmInShapeXml(shapeXml, nextBox) {
  const xfrm = findBalancedElements(shapeXml, 'a:xfrm')[0] || findBalancedElements(shapeXml, 'p:xfrm')[0]
  if (!xfrm) return shapeXml
  let updated = xfrm.outerXml
  // ST_Coordinate allows negative x/y (e.g., bled-off corporate decorative arcs/circles); only cx/cy must be >= 0
  updated = updated.replace(/<a:off\b[^>]*(?:\/>|>[\s\S]*?<\/a:off>)/, `<a:off x="${Math.round(nextBox.x)}" y="${Math.round(nextBox.y)}"/>`)
  updated = updated.replace(/<a:ext\b[^>]*(?:\/>|>[\s\S]*?<\/a:ext>)/, `<a:ext cx="${Math.max(0, Math.round(nextBox.w))}" cy="${Math.max(0, Math.round(nextBox.h))}"/>`)
  return shapeXml.slice(0, xfrm.start) + updated + shapeXml.slice(xfrm.end)
}

function scaleSpTreeTo16x9(xml, srcW, srcH) {
  if (Math.abs(srcW - EMU_W) < 100000 && Math.abs(srcH - EMU_H) < 100000) return xml
  const spTree = findBalancedElements(xml, 'p:spTree')[0]
  if (!spTree) return xml
  const inner = spTree.innerXml
  const tags = ['p:sp', 'p:pic', 'p:cxnSp', 'p:graphicFrame', 'p:grpSp']
  const items = []
  for (const tag of tags) {
    for (const el of findBalancedElements(inner, tag)) {
      items.push({ ...el, tag })
    }
  }
  items.sort((a, b) => a.start - b.start)
  let rebuilt = ''
  let cursor = 0
  for (const item of items) {
    if (item.start < cursor) continue
    rebuilt += inner.slice(cursor, item.start)
    const xfrm = parseXfrmFromXml(item.outerXml)
    if (xfrm) {
      const scaled = scaleBoxTo16x9(xfrm, srcW, srcH)
      rebuilt += replaceFirstXfrmInShapeXml(item.outerXml, scaled)
    } else {
      rebuilt += item.outerXml
    }
    cursor = item.end
  }
  rebuilt += inner.slice(cursor)
  const spTreeOpenEnd = spTree.outerXml.indexOf('>') + 1
  const spTreeOpen = spTree.outerXml.slice(0, spTreeOpenEnd)
  return xml.slice(0, spTree.start) + spTreeOpen + rebuilt + '</p:spTree>' + xml.slice(spTree.end)
}

// ---------------------------------------------------------------------------
// 扁平化解析 spTree 视觉元素（用于 Plan A 1:1 SVG 编译、Logo/Footer/SafeInsets 探测）
// ---------------------------------------------------------------------------

function extractVisualNodesFromSpTree(xml, { themeScheme, colorMap, relsMap, srcW, srcH, isMaster = false, excludePlaceholders = true }) {
  const spTree = findBalancedElements(xml, 'p:spTree')[0]
  if (!spTree) return []

  const nodes = []
  const mapPoint = (px, py, transform) => ({
    x: transform.ox + (px - transform.chX) * transform.sx,
    y: transform.oy + (py - transform.chY) * transform.sy,
  })

  const walk = (containerInner, transform, depth = 0) => {
    if (depth > 8) return
    const entries = []
    for (const tag of ['p:sp', 'p:pic', 'p:cxnSp', 'p:grpSp']) {
      for (const el of findBalancedElements(containerInner, tag)) {
        entries.push({ ...el, tag })
      }
    }
    entries.sort((a, b) => a.start - b.start)
    for (const item of entries) {
      if (item.tag === 'p:grpSp') {
        const grpSpPr = findBalancedElements(item.innerXml, 'p:grpSpPr')[0]
        const xfrm = grpSpPr ? parseXfrmFromXml(grpSpPr.outerXml) : null
        let childTransform = transform
        if (xfrm && xfrm.ch && xfrm.ch.w > 0 && xfrm.ch.h > 0) {
          const p0 = mapPoint(xfrm.x, xfrm.y, transform)
          const gxW = xfrm.w * transform.sx
          const gxH = xfrm.h * transform.sy
          childTransform = {
            ox: p0.x,
            oy: p0.y,
            chX: xfrm.ch.x,
            chY: xfrm.ch.y,
            sx: gxW / xfrm.ch.w,
            sy: gxH / xfrm.ch.h,
          }
        }
        walk(item.innerXml, childTransform, depth + 1)
        continue
      }

      if (excludePlaceholders && shouldStripPlaceholderElement(item.outerXml, isMaster)) continue

      const spPr = findBalancedElements(item.innerXml, 'p:spPr')[0]
      const xfrm = spPr ? parseXfrmFromXml(spPr.outerXml) : null
      if (!xfrm) continue

      const p0 = mapPoint(xfrm.x, xfrm.y, transform)
      const rawBox = {
        x: Math.round(p0.x),
        y: Math.round(p0.y),
        w: Math.round(xfrm.w * transform.sx),
        h: Math.round(xfrm.h * transform.sy),
      }
      if (rawBox.w <= 0 && rawBox.h <= 0) continue
      const box = scaleBoxTo16x9(rawBox, srcW, srcH)

      const cNvPrMatch = /<p:cNvPr\b([^>]*)\/?>/.exec(item.innerXml)
      const name = cNvPrMatch ? getXmlAttr(cNvPrMatch[1], 'name') : ''
      const ph = parsePlaceholderTag(item.outerXml)

      if (item.tag === 'p:pic') {
        const blipFill = findBalancedElements(item.innerXml, 'p:blipFill')[0] || findBalancedElements(item.innerXml, 'a:blipFill')[0]
        const rId = blipFill ? extractPreferredBlipRId(blipFill.outerXml) : ''
        const partPath = rId ? relsMap.get(rId) : null
        if (partPath) {
          nodes.push({
            kind: 'image',
            name,
            ph,
            box,
            rot: xfrm.rot || 0,
            flipH: xfrm.flipH,
            flipV: xfrm.flipV,
            partPath,
            rId,
          })
        }
        continue
      }

      const spPrInner = spPr.innerXml
      // Remove <a:ln> before parsing shape fill so line fill isn't confused with shape fill
      const lnEl = findBalancedElements(spPrInner, 'a:ln')[0]
      const spPrNoLn = lnEl ? stripXmlRanges(spPrInner, [lnEl]) : spPrInner
      const fill = parseFillFromXml(spPrNoLn, themeScheme, colorMap, relsMap)

      let stroke = null
      if (lnEl && !/<a:noFill\b[^>]*\/>/.test(lnEl.innerXml)) {
        const lnFill = parseFillFromXml(lnEl.innerXml, themeScheme, colorMap, relsMap)
        if (lnFill?.type === 'solid') {
          const wEmu = Number(getXmlAttr(lnEl.attrs, 'w') || '12700')
          stroke = {
            color: lnFill.color,
            alpha: lnFill.alpha ?? 1,
            widthPx: Math.max(0.75, (wEmu / EMU_PER_IN) * 96),
          }
        }
      }

      if (item.tag === 'p:cxnSp') {
        if (stroke) {
          nodes.push({
            kind: 'line',
            name,
            box,
            flipH: xfrm.flipH,
            flipV: xfrm.flipV,
            stroke,
          })
        }
        continue
      }

      const prstMatch = /<a:prstGeom\b[^>]*\bprst=["']([^"']+)["']/.exec(spPrInner)
      const preset = prstMatch ? prstMatch[1] : 'rect'
      const text = extractPlainTextFromShapeXml(item.outerXml)
      let textColor = null
      let textSizePt = 11
      let textAlign = 'l'
      let textBold = false
      let lInsEmu = 0
      let rInsEmu = 0
      if (text) {
        const txBody = findBalancedElements(item.innerXml, 'p:txBody')[0]
        if (txBody) {
          const bodyPrMatch = /<a:bodyPr\b([^>]*)/.exec(txBody.innerXml)
          if (bodyPrMatch) {
            const li = Number(getXmlAttr(bodyPrMatch[1], 'lIns') || '0')
            const ri = Number(getXmlAttr(bodyPrMatch[1], 'rIns') || '0')
            if (Number.isFinite(li) && li > 0) lInsEmu = li
            if (Number.isFinite(ri) && ri > 0) rInsEmu = ri
          }
          const rPr = findBalancedElements(txBody.innerXml, 'a:rPr')[0] || findBalancedElements(txBody.innerXml, 'a:defRPr')[0]
          if (rPr) {
            const sz = Number(getXmlAttr(rPr.attrs, 'sz') || '0')
            if (sz >= 600 && sz <= 7200) textSizePt = sz / 100
            if (getXmlAttr(rPr.attrs, 'b') === '1') textBold = true
            const tc = parseFillFromXml(rPr.innerXml, themeScheme, colorMap, relsMap)
            if (tc?.type === 'solid') textColor = tc.color
          }
          const pPrMatch = /<a:pPr\b([^>]*)/.exec(txBody.innerXml)
          if (pPrMatch) {
            const algn = getXmlAttr(pPrMatch[1], 'algn')
            if (algn) textAlign = algn
          }
        }
      }

      const hasSlideNum = hasDynamicSlideNumberField(item.outerXml)
      if ((fill && fill.type !== 'none') || stroke || (text && !isPlaceholderPromptText(text)) || hasSlideNum) {
        nodes.push({
          kind: 'shape',
          name,
          ph,
          preset,
          box,
          rot: xfrm.rot || 0,
          fill: fill && fill.type !== 'none' ? fill : null,
          stroke,
          text: (!isPlaceholderPromptText(text) && !hasSlideNum) ? text : '',
          textColor,
          textSizePt,
          textAlign,
          textBold,
          lInsEmu,
          rInsEmu,
          hasSlideNum,
        })
      }
    }
  }

  walk(spTree.innerXml, { ox: 0, oy: 0, chX: 0, chY: 0, sx: 1, sy: 1 }, 0)
  return nodes
}

// ---------------------------------------------------------------------------
// Plan A: 1:1 CSP-Safe 16:9 SVG 母版编译器（带 {{asset:img-...}} 去重占位符）
// ---------------------------------------------------------------------------

function emuToSvgX(emu) {
  return Number(((emu / EMU_W) * 1280).toFixed(2))
}

function emuToSvgY(emu) {
  return Number(((emu / EMU_H) * 720).toFixed(2))
}

function compileRoleMasterSvg({ bgFill, nodes, mediaByPartPath, defaultBgColor = '#FFFFFF' }) {
  const defs = []
  const layers = []
  const usedAssetIds = new Set()
  let gradSeq = 0

  const resolveMediaHref = (partPath) => {
    const info = mediaByPartPath.get(partPath)
    if (!info) return ''
    if (info.assetId) {
      usedAssetIds.add(info.assetId)
      return `{{asset:${info.assetId}}}`
    }
    if (info.dataUri && info.mime === 'image/svg+xml') {
      return info.dataUri
    }
    return ''
  }

  const pushFillAttr = (fill) => {
    if (!fill || fill.type === 'none') return 'fill="none"'
    if (fill.type === 'solid') {
      const op = fill.alpha !== undefined && fill.alpha < 0.999 ? ` fill-opacity="${fill.alpha.toFixed(3)}"` : ''
      return `fill="${escapeXml(fill.color)}"${op}`
    }
    if (fill.type === 'gradient' && Array.isArray(fill.stops) && fill.stops.length >= 2) {
      gradSeq += 1
      const id = `tm_g${gradSeq}`
      const rad = ((fill.angleDeg || 0) * Math.PI) / 180
      const x1 = (50 - Math.cos(rad) * 50).toFixed(1)
      const y1 = (50 - Math.sin(rad) * 50).toFixed(1)
      const x2 = (50 + Math.cos(rad) * 50).toFixed(1)
      const y2 = (50 + Math.sin(rad) * 50).toFixed(1)
      const stopsXml = fill.stops.map((st) =>
        `<stop offset="${st.pos.toFixed(1)}%" stop-color="${escapeXml(st.color)}"` +
        (st.alpha !== undefined && st.alpha < 0.999 ? ` stop-opacity="${st.alpha.toFixed(3)}"` : '') +
        '/>',
      ).join('')
      defs.push(`<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stopsXml}</linearGradient>`)
      return `fill="url(#${id})"`
    }
    return `fill="${escapeXml(defaultBgColor)}"`
  }

  // 1. Canvas background
  if (bgFill?.type === 'image') {
    const href = resolveMediaHref(bgFill.partPath)
    if (href) {
      layers.push(`<rect x="0" y="0" width="1280" height="720" fill="${escapeXml(defaultBgColor)}"/>`)
      layers.push(`<image x="0" y="0" width="1280" height="720" preserveAspectRatio="xMidYMid slice" href="${escapeXml(href)}"/>`)
    } else {
      layers.push(`<rect x="0" y="0" width="1280" height="720" fill="${escapeXml(defaultBgColor)}"/>`)
    }
  } else if (bgFill?.type === 'solid' || bgFill?.type === 'gradient') {
    layers.push(`<rect x="0" y="0" width="1280" height="720" ${pushFillAttr(bgFill)}/>`)
  } else {
    layers.push(`<rect x="0" y="0" width="1280" height="720" fill="${escapeXml(defaultBgColor)}"/>`)
  }

  // 2. Master + layout shapes & images (capped at 120 visual elements for fast rendering)
  for (const node of nodes.slice(0, 120)) {
    const x = emuToSvgX(node.box.x)
    const y = emuToSvgY(node.box.y)
    const w = emuToSvgX(node.box.w)
    const h = emuToSvgY(node.box.h)
    const rotAttr = node.rot && Math.abs(node.rot) > 0.2
      ? ` transform="rotate(${node.rot.toFixed(1)} ${(x + w / 2).toFixed(1)} ${(y + h / 2).toFixed(1)})"`
      : ''

    if (node.kind === 'image') {
      const href = resolveMediaHref(node.partPath)
      if (!href || w <= 0 || h <= 0) continue
      const isFullBg = w >= 1080 && h >= 600
      const par = isFullBg ? 'xMidYMid slice' : 'xMidYMid meet'
      layers.push(`<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${par}" href="${escapeXml(href)}"${rotAttr}/>`)
      continue
    }

    if (node.kind === 'line' && node.stroke) {
      const x1 = node.flipH ? x + w : x
      const y1 = node.flipV ? y + h : y
      const x2 = node.flipH ? x : x + w
      const y2 = node.flipV ? y : y + h
      layers.push(
        `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" ` +
        `stroke="${escapeXml(node.stroke.color)}" stroke-width="${node.stroke.widthPx.toFixed(2)}"` +
        (node.stroke.alpha < 0.999 ? ` stroke-opacity="${node.stroke.alpha.toFixed(3)}"` : '') +
        '/>',
      )
      continue
    }

    if (node.kind === 'shape') {
      const strokeAttr = node.stroke
        ? ` stroke="${escapeXml(node.stroke.color)}" stroke-width="${node.stroke.widthPx.toFixed(2)}"` +
          (node.stroke.alpha < 0.999 ? ` stroke-opacity="${node.stroke.alpha.toFixed(3)}"` : '')
        : ''
      if (node.fill?.type === 'image') {
        const href = resolveMediaHref(node.fill.partPath)
        if (href && w > 0 && h > 0) {
          layers.push(`<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" href="${escapeXml(href)}"${rotAttr}/>`)
        }
      } else if (node.fill || node.stroke) {
        const fillAttr = pushFillAttr(node.fill)
        if (node.preset === 'ellipse' || node.preset === 'oval') {
          layers.push(`<ellipse cx="${(x + w / 2).toFixed(2)}" cy="${(y + h / 2).toFixed(2)}" rx="${(w / 2).toFixed(2)}" ry="${(h / 2).toFixed(2)}" ${fillAttr}${strokeAttr}${rotAttr}/>`)
        } else if (node.preset === 'triangle' || node.preset === 'rtTriangle') {
          const pts = node.preset === 'rtTriangle'
            ? `${x},${y} ${x},${y + h} ${x + w},${y + h}`
            : `${(x + w / 2).toFixed(2)},${y} ${x + w},${y + h} ${x},${y + h}`
          layers.push(`<polygon points="${pts}" ${fillAttr}${strokeAttr}${rotAttr}/>`)
        } else if (node.preset === 'line') {
          layers.push(`<line x1="${x}" y1="${y}" x2="${(x + w).toFixed(2)}" y2="${(y + h).toFixed(2)}"${strokeAttr}/>`)
        } else {
          const rx = node.preset === 'roundRect' ? Math.min(18, Math.min(w, h) * 0.16).toFixed(1) : '0'
          layers.push(`<rect x="${x}" y="${y}" width="${Math.max(0.5, w)}" height="${Math.max(0.5, h)}"${rx !== '0' ? ` rx="${rx}"` : ''} ${fillAttr}${strokeAttr}${rotAttr}/>`)
        }
      }
      if (node.text && w > 12 && h > 8) {
        const fontPx = Math.max(9, Math.min(36, Math.round((node.textSizePt || 11) * (96 / 72))))
        const anchor = node.textAlign === 'ctr' ? 'middle' : node.textAlign === 'r' ? 'end' : 'start'
        const lPad = node.lInsEmu > 0 ? Math.min(w * 0.4, emuToSvgX(node.lInsEmu)) : 8
        const rPad = node.rInsEmu > 0 ? Math.min(w * 0.4, emuToSvgX(node.rInsEmu)) : 8
        const tx = anchor === 'middle' ? x + w / 2 : anchor === 'end' ? x + w - rPad : x + lPad
        const ty = y + h / 2 + fontPx * 0.35
        const tColor = node.textColor || (relativeLuminance(defaultBgColor) < 0.36 ? '#E2E8F0' : '#475569')
        const weightAttr = node.textBold ? ' font-weight="700"' : ''
        layers.push(
          `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" fill="${escapeXml(tColor)}" ` +
          `font-size="${fontPx}"${weightAttr} font-family="system-ui,-apple-system,sans-serif" opacity="0.92">${escapeXml(node.text.slice(0, 120))}</text>`,
        )
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" preserveAspectRatio="none" class="corp-master-svg" aria-hidden="true">` +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') +
    layers.join('') +
    '</svg>'

  return {
    svgPreview: sanitizeMasterSvg(svg),
    svgAssetIds: [...usedAssetIds],
  }
}

export function sanitizeMasterSvg(svg) {
  if (typeof svg !== 'string' || !svg.trim()) return ''
  let s = svg.trim()
  // Strip any script / foreignObject / iframe / event handlers / javascript: or external http(s) URLs (CSP strict)
  s = s.replace(/<(script|foreignObject|iframe|object|embed)\b[\s\S]*?<\/\1>/gi, '')
  s = s.replace(/<(script|foreignObject|iframe|object|embed)\b[^>]*\/>/gi, '')
  s = s.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  s = s.replace(/\b(?:xlink:)?href\s*=\s*["']\s*(?:javascript:|https?:|file:)[^"']*["']/gi, '')
  if (!/^<svg\b/i.test(s) || !/<\/svg>$/i.test(s)) return ''
  return s
}

export function hydrateMasterSvg(svgPreview, assets = {}) {
  if (!svgPreview || typeof svgPreview !== 'string') return ''
  return svgPreview.replace(/\{\{asset:(img-[a-f0-9]{64})\}\}/g, (_, assetId) => {
    const data = assets?.[assetId]?.data
    return typeof data === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(data)
      ? escapeXml(data)
      : ''
  })
}

// ---------------------------------------------------------------------------
// 角色识别、安全留白区（safeInsets）、Logo/页脚/页码碰撞自动避让探测
// ---------------------------------------------------------------------------

function scoreLayoutForRole(role, layoutMeta) {
  const type = String(layoutMeta.type || '').toLowerCase()
  const name = String(layoutMeta.name || '').toLowerCase()
  let score = 0

  if (role === 'cover') {
    if (type === 'title') score += 100
    if (/cover|title\s*slide|封面|首页|主视觉|片头|开场/.test(name)) score += 90
    if (type === 'sechead' || /section|章节|过渡|目录|closing|封底|谢谢|致谢/.test(name)) score -= 60
  } else if (role === 'section') {
    if (type === 'sechead') score += 100
    if (/section|divider|chapter|transition|agenda|章节|过渡|转场|目录|分节/.test(name)) score += 90
    if (type === 'title' || /cover|封面|closing|封底|谢谢|致谢/.test(name)) score -= 50
  } else if (role === 'closing') {
    if (/closing|thank|end\s*slide|back\s*cover|q&a|封底|致谢|结束|谢谢|尾页|感谢/.test(name)) score += 110
    if (type === 'title') score += 15
    if (type === 'sechead' || /section|章节/.test(name)) score -= 20
  } else {
    // content
    if (type === 'obj' || type === 'tx' || type === 'titleonly') score += 90
    if (type === 'twoobj' || type === 'objtx' || type === 'txandobj') score += 70
    if (type === 'blank') score += 55
    if (/content|body|正文|内容|通用|标准|默认|blank|空白/.test(name)) score += 80
    if (type === 'title' || type === 'sechead' || /cover|封面|closing|封底|谢谢|致谢|section|章节/.test(name)) score -= 70
  }
  return score
}

function detectSafeInsetsFromLayoutAndNodes(layoutXml, masterXml, nodes, srcW, srcH) {
  const insets = {
    top: DEFAULT_MARGINS_IN.top,
    right: DEFAULT_MARGINS_IN.right,
    bottom: DEFAULT_MARGINS_IN.bottom,
    left: DEFAULT_MARGINS_IN.left,
  }

  // 1. Resolve body/content placeholder bounds (with master placeholder fallback!)
  const collectPlaceholders = (xml) => {
    const out = []
    if (!xml) return out
    for (const sp of findBalancedElements(xml, 'p:sp')) {
      const ph = parsePlaceholderTag(sp.outerXml)
      if (!ph) continue
      const spPr = findBalancedElements(sp.innerXml, 'p:spPr')[0]
      const xfrm = spPr ? parseXfrmFromXml(spPr.outerXml) : null
      out.push({ type: ph.type, idx: ph.idx, xfrm })
    }
    return out
  }
  const masterPhs = collectPlaceholders(masterXml)
  const layoutPhs = collectPlaceholders(layoutXml)
  const resolvedPhs = layoutPhs.map((lp) => {
    if (lp.xfrm) return lp
    const inherited = masterPhs.find((mp) => (lp.type && mp.type === lp.type) || (lp.idx && mp.idx === lp.idx))
    return inherited?.xfrm ? { ...lp, xfrm: inherited.xfrm } : lp
  })

  const bodyPh = resolvedPhs.find((p) => ['body', 'obj', ''].includes(p.type) && p.xfrm && p.xfrm.w > srcW * 0.45 && p.xfrm.h > srcH * 0.30)
  const titlePh = resolvedPhs.find((p) => p.type === 'title' && p.xfrm && p.xfrm.w > srcW * 0.35)

  if (titlePh) {
    const sb = scaleBoxTo16x9(titlePh.xfrm, srcW, srcH)
    const topIn = sb.y / EMU_PER_IN
    if (topIn > insets.top && topIn <= 1.85) insets.top = topIn
  }
  if (bodyPh) {
    const sb = scaleBoxTo16x9(bodyPh.xfrm, srcW, srcH)
    const leftIn = sb.x / EMU_PER_IN
    const rightIn = (EMU_W - (sb.x + sb.w)) / EMU_PER_IN
    const bottomIn = (EMU_H - (sb.y + sb.h)) / EMU_PER_IN
    if (leftIn > insets.left && leftIn <= 2.15) insets.left = leftIn
    if (rightIn > insets.right && rightIn <= 2.15) insets.right = rightIn
    if (bottomIn > insets.bottom && bottomIn <= 1.35) insets.bottom = bottomIn
    if (!titlePh) {
      const topIn = sb.y / EMU_PER_IN
      if (topIn > insets.top && topIn <= 1.85) insets.top = topIn
    }
  }

  // 2. Detect opaque decorative edge bands (header bar, footer strip, side spines) on master/layout
  for (const node of nodes) {
    const b = node.box
    if (!b) continue
    const xIn = b.x / EMU_PER_IN
    const yIn = b.y / EMU_PER_IN
    const wIn = b.w / EMU_PER_IN
    const hIn = b.h / EMU_PER_IN
    const isFullCanvas = wIn >= CANVAS_IN.w * 0.85 && hIn >= CANVAS_IN.h * 0.85
    if (isFullCanvas) continue
    const isVisualBand = node.kind === 'image' || Boolean(node.fill) || (node.kind === 'shape' && Boolean(node.text))
    if (!isVisualBand) continue

    // Top header banner
    if (yIn <= 0.18 && wIn >= CANVAS_IN.w * 0.55 && hIn >= 0.20 && hIn <= 1.65) {
      insets.top = Math.max(insets.top, yIn + hIn + 0.14)
    }
    // Bottom footer band
    if (yIn + hIn >= CANVAS_IN.h - 0.18 && wIn >= CANVAS_IN.w * 0.50 && hIn >= 0.18 && hIn <= 1.20) {
      insets.bottom = Math.max(insets.bottom, (CANVAS_IN.h - yIn) + 0.12)
    }
    // Left vertical spine
    if (xIn <= 0.18 && hIn >= CANVAS_IN.h * 0.55 && wIn >= 0.25 && wIn <= 2.10) {
      insets.left = Math.max(insets.left, xIn + wIn + 0.18)
    }
    // Right vertical spine
    if (xIn + wIn >= CANVAS_IN.w - 0.18 && hIn >= CANVAS_IN.h * 0.55 && wIn >= 0.25 && wIn <= 2.10) {
      insets.right = Math.max(insets.right, (CANVAS_IN.w - xIn) + 0.18)
    }
  }

  return {
    top: Number(Math.min(1.85, Math.max(DEFAULT_MARGINS_IN.top, insets.top)).toFixed(3)),
    right: Number(Math.min(2.20, Math.max(DEFAULT_MARGINS_IN.right, insets.right)).toFixed(3)),
    bottom: Number(Math.min(1.35, Math.max(DEFAULT_MARGINS_IN.bottom, insets.bottom)).toFixed(3)),
    left: Number(Math.min(2.20, Math.max(DEFAULT_MARGINS_IN.left, insets.left)).toFixed(3)),
  }
}

function detectMasterChromePresence(nodes) {
  let hasLogo = false
  let hasFooter = false
  let hasSlideNumber = false
  for (const node of nodes) {
    const b = node.box
    if (!b) continue
    const xIn = b.x / EMU_PER_IN
    const yIn = b.y / EMU_PER_IN
    const wIn = b.w / EMU_PER_IN
    const hIn = b.h / EMU_PER_IN
    const isFullCanvas = wIn >= CANVAS_IN.w * 0.85 && hIn >= CANVAS_IN.h * 0.85
    if (node.kind === 'image' && !isFullCanvas) {
      const nearCorner = (yIn <= 1.2 || yIn + hIn >= CANVAS_IN.h - 1.2) && (xIn <= 2.4 || xIn + wIn >= CANVAS_IN.w - 2.4)
      if (nearCorner && wIn <= 3.6 && hIn <= 1.6) hasLogo = true
    }
    if (node.hasSlideNum || node.ph?.type === 'sldnum') {
      hasSlideNumber = true
    }
    if (node.kind === 'shape' && !isFullCanvas) {
      const inFooterBand = yIn >= CANVAS_IN.h - 0.95 && hIn <= 0.95
      if (inFooterBand && (node.text || node.ph?.type === 'ftr')) {
        hasFooter = true
      }
    }
  }
  return { hasLogo, hasFooter, hasSlideNumber }
}

// ---------------------------------------------------------------------------
// Plan B: 原生 OOXML slideMaster / slideLayout / theme 清洗与安全关系重映射
// ---------------------------------------------------------------------------

function convertDefRPrToRPr(defRPrXml) {
  if (!defRPrXml) return ''
  return defRPrXml
    .replace(/^<a:defRPr\b/, '<a:rPr')
    .replace(/<\/a:defRPr>$/, '</a:rPr>')
}

function extractOtherStyleRPr(masterXml) {
  if (!masterXml) return ''
  const otherStyle = findBalancedElements(masterXml, 'p:otherStyle')[0]
  if (!otherStyle) return ''
  const lvl1 = findBalancedElements(otherStyle.innerXml, 'a:lvl1pPr')[0]
  const defRPr = lvl1 ? findBalancedElements(lvl1.innerXml, 'a:defRPr')[0] : null
  if (!defRPr) return ''
  return convertDefRPrToRPr(defRPr.outerXml)
}

function extractMasterPlaceholderMetadata(masterXml) {
  const xfrmByType = new Map()
  const rPrByType = new Map()
  const pPrAlgnByType = new Map()
  const inheritableShapes = { ftr: '', sldnum: '' }
  if (!masterXml) return { xfrmByType, rPrByType, pPrAlgnByType, inheritableShapes }

  const mTree = findBalancedElements(masterXml, 'p:spTree')[0]
  if (!mTree) return { xfrmByType, rPrByType, pPrAlgnByType, inheritableShapes }

  for (const sp of findBalancedElements(mTree.innerXml, 'p:sp')) {
    const ph = parsePlaceholderTag(sp.outerXml)
    if (!ph?.type) continue
    const spPr = findBalancedElements(sp.innerXml, 'p:spPr')[0]
    const xfrm = spPr ? findBalancedElements(spPr.innerXml, 'a:xfrm')[0] : null
    if (xfrm && !xfrmByType.has(ph.type)) {
      xfrmByType.set(ph.type, xfrm.outerXml)
    }
    const txBody = findBalancedElements(sp.innerXml, 'p:txBody')[0]
    if (txBody) {
      if (!rPrByType.has(ph.type)) {
        const rPr = findBalancedElements(txBody.innerXml, 'a:rPr')[0]
        const defRPr = !rPr ? findBalancedElements(txBody.innerXml, 'a:defRPr')[0] : null
        if (rPr) rPrByType.set(ph.type, rPr.outerXml)
        else if (defRPr) rPrByType.set(ph.type, convertDefRPrToRPr(defRPr.outerXml))
      }
      if (!pPrAlgnByType.has(ph.type)) {
        const pPrM = /<a:pPr\b([^>]*)/.exec(txBody.innerXml)
        const algn = pPrM ? getXmlAttr(pPrM[1], 'algn') : ''
        if (algn) pPrAlgnByType.set(ph.type, algn)
      }
    }
    if (ph.type === 'ftr' && !inheritableShapes.ftr) {
      const txt = extractPlainTextFromShapeXml(sp.outerXml)
      if (!isPlaceholderPromptText(txt)) inheritableShapes.ftr = sp.outerXml
    } else if (ph.type === 'sldnum' && !inheritableShapes.sldnum) {
      if (hasDynamicSlideNumberField(sp.outerXml)) inheritableShapes.sldnum = sp.outerXml
    }
  }
  return { xfrmByType, rPrByType, pPrAlgnByType, inheritableShapes }
}

/**
 * 严格遵循 ECMA-376 CT_ShapeProperties (`<p:spPr>`) xsd:sequence 顺序：
 * `a:xfrm` -> `a:prstGeom` / `a:custGeom` -> fill -> `a:ln` -> effects。
 * 同时正确展开带属性的自闭合 `<p:spPr bwMode="auto"/>`。
 */
function ensurePromotedShapeSpPr(shapeXml, fallbackXfrmXml) {
  const spPr = findBalancedElements(shapeXml, 'p:spPr')[0]
  if (!spPr) {
    if (!fallbackXfrmXml) return shapeXml
    return shapeXml.replace(
      /<\/p:nvSpPr>/,
      `</p:nvSpPr><p:spPr>${fallbackXfrmXml}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>`,
    )
  }
  const attrsPart = spPr.attrs ? ' ' + spPr.attrs : ''
  if (spPr.selfClosing) {
    if (!fallbackXfrmXml) return shapeXml
    const expanded = `<p:spPr${attrsPart}>${fallbackXfrmXml}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>`
    return shapeXml.slice(0, spPr.start) + expanded + shapeXml.slice(spPr.end)
  }
  let inner = spPr.innerXml
  if (!/<a:xfrm\b/.test(inner) && fallbackXfrmXml) {
    inner = fallbackXfrmXml + inner
  }
  const xfrmEl = findBalancedElements(inner, 'a:xfrm')[0]
  if (xfrmEl && !/<a:prstGeom\b/.test(inner) && !/<a:custGeom\b/.test(inner)) {
    inner = inner.slice(0, xfrmEl.end) + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' + inner.slice(xfrmEl.end)
  }
  const rebuilt = `<p:spPr${attrsPart}>${inner}</p:spPr>`
  return shapeXml.slice(0, spPr.start) + rebuilt + shapeXml.slice(spPr.end)
}

function promotePlaceholderShapeXml(shapeXml, { phType, masterMeta, otherStyleRPr }) {
  let promoted = shapeXml
    .replace(/<p:ph\b[^>]*\/>/g, '')
    .replace(/<p:ph\b[^>]*>[\s\S]*?<\/p:ph>/g, '')
  const fallbackXfrm = masterMeta?.xfrmByType?.get(phType) || ''
  promoted = ensurePromotedShapeSpPr(promoted, fallbackXfrm)

  const fallbackRPr = masterMeta?.rPrByType?.get(phType) || otherStyleRPr || ''
  const fallbackAlgn = masterMeta?.pPrAlgnByType?.get(phType) || ''
  if (fallbackRPr || fallbackAlgn) {
    const txBody = findBalancedElements(promoted, 'p:txBody')[0]
    if (txBody) {
      let txInner = txBody.innerXml
      if (fallbackAlgn && !/<a:pPr\b/.test(txInner)) {
        txInner = txInner.replace(/<a:p\b([^>]*)>/, `<a:p$1><a:pPr algn="${escapeXml(fallbackAlgn)}"/>`)
      }
      if (fallbackRPr) {
        // Inject inherited <a:rPr> into <a:fld> or <a:r> that lack an explicit <a:rPr>
        for (const runTag of ['a:fld', 'a:r']) {
          const runs = findBalancedElements(txInner, runTag)
          if (runs.length > 0) {
            let rebuilt = ''
            let cur = 0
            for (const run of runs) {
              rebuilt += txInner.slice(cur, run.start)
              if (!/<a:rPr\b/.test(run.innerXml) && /<a:t\b/.test(run.innerXml)) {
                rebuilt += run.outerXml.replace(/<a:t\b/, `${fallbackRPr}<a:t`)
              } else {
                rebuilt += run.outerXml
              }
              cur = run.end
            }
            rebuilt += txInner.slice(cur)
            txInner = rebuilt
          }
        }
      }
      if (txInner !== txBody.innerXml) {
        const openEnd = txBody.outerXml.indexOf('>') + 1
        promoted = promoted.slice(0, txBody.start) + txBody.outerXml.slice(0, openEnd) + txInner + '</p:txBody>' + promoted.slice(txBody.end)
      }
    }
  }
  return promoted
}

function allocateNextShapeId(xml) {
  let maxId = 100
  for (const m of xml.matchAll(/<p:cNvPr\b[^>]*\bid=["'](\d+)["']/g)) {
    const n = Number(m[1])
    if (Number.isFinite(n) && n > maxId) maxId = n
  }
  return maxId + 1
}

function sanitizePartRelsAndXml(xml, rawRelsXml, partPath, {
  packagePartSet,
  registerMedia,
  masterIndexBySrcPath,
  themeIndexBySrcPath,
  isMaster = false,
  isLayout = false,
  stripPlaceholders = true,
  masterXml = '',
  layoutType = '',
  showMasterSp = true,
  srcW = EMU_W,
  srcH = EMU_H,
}) {
  const rels = parseRelationshipsXml(rawRelsXml)
  const keptRels = []
  const keptRIdSet = new Set()

  for (const rel of rels) {
    if (rel.targetMode && rel.targetMode.toLowerCase() === 'external') continue
    const resolved = resolvePartRelativePath(partPath, rel.target)
    if (!resolved || !packagePartSet.has(resolved)) continue
    if (rel.type === SAFE_REL_TYPES.SLIDE_LAYOUT && isMaster) {
      // slideMaster -> slideLayout relationships are rebuilt cleanly from the kept role layouts
      continue
    }
    if (rel.type === SAFE_REL_TYPES.SLIDE_MASTER && isLayout) {
      const mIdx = masterIndexBySrcPath.get(resolved)
      if (!mIdx) continue
      keptRels.push({ ...rel, target: `../slideMasters/slideMaster${mIdx}.xml` })
      keptRIdSet.add(rel.id)
      continue
    }
    if (rel.type === SAFE_REL_TYPES.THEME) {
      const tIdx = themeIndexBySrcPath.get(resolved)
      if (!tIdx) continue
      keptRels.push({ ...rel, target: `../theme/theme${tIdx}.xml` })
      keptRIdSet.add(rel.id)
      continue
    }
    if (rel.type === SAFE_REL_TYPES.IMAGE) {
      const reg = registerMedia(resolved)
      if (!reg) continue
      keptRels.push({ ...rel, target: `../media/${reg.targetName}` })
      keptRIdSet.add(rel.id)
      continue
    }
    // Drop OLE / ActiveX / VML / media / customXml / tags / diagrams / charts / comments / etc.
  }

  let cleanXml = xml
  const masterMeta = isLayout && masterXml ? extractMasterPlaceholderMetadata(masterXml) : null
  const otherStyleRPr = isLayout && masterXml ? extractOtherStyleRPr(masterXml) : ''

  // Track whether this layout already has a kept ftr / sldNum (or explicitly declared an empty stub for them)
  let layoutHasKeptFtr = false
  let layoutHasKeptSldNum = false
  let layoutDeclaredSldNumStub = false

  // 1. Strip content placeholders (and broken-rel shapes) cleanly using balanced scanner
  if (stripPlaceholders && (isMaster || isLayout)) {
    const spTree = findBalancedElements(cleanXml, 'p:spTree')[0]
    if (spTree) {
      const stripInContainer = (containerXml) => {
        const ranges = []
        const shapeEdits = []
        for (const tag of ['p:sp', 'p:pic', 'p:graphicFrame', 'p:cxnSp']) {
          for (const el of findBalancedElements(containerXml, tag)) {
            let hasBrokenVisualRel = false
            if (tag === 'p:graphicFrame') {
              hasBrokenVisualRel = [...el.outerXml.matchAll(/\br:(?:embed|link|id)=["']([^"']+)["']/g)]
                .some((m) => !keptRIdSet.has(m[1]))
            } else {
              // Check primary <a:blip> refs against keptRIdSet (catches both dropped and undeclared dangling rIds)
              for (const bm of el.outerXml.matchAll(/<a:blip\b([^>]*)/g)) {
                const emb = getXmlAttr(bm[1], 'r:embed')
                const lnk = getXmlAttr(bm[1], 'r:link')
                if ((emb && !keptRIdSet.has(emb)) || (!emb && lnk && !keptRIdSet.has(lnk))) {
                  hasBrokenVisualRel = true
                  break
                }
              }
            }
            const ph = tag === 'p:sp' ? parsePlaceholderTag(el.outerXml) : null
            if (isLayout && ph?.type === 'sldnum' && !hasDynamicSlideNumberField(el.outerXml)) {
              layoutDeclaredSldNumStub = true
            }
            if (hasBrokenVisualRel || shouldStripPlaceholderElement(el.outerXml, isMaster)) {
              ranges.push({ start: el.start, end: el.end })
            } else if (isLayout && tag === 'p:sp' && ph) {
              // Kept layout sldNum / ftr / dt / hdr placeholder -> promote to regular layout shape
              // with strict ECMA-376 <p:spPr> ordering and inherited master <a:xfrm> + <a:rPr>.
              if (ph.type === 'ftr') layoutHasKeptFtr = true
              if (ph.type === 'sldnum') layoutHasKeptSldNum = true
              const promoted = promotePlaceholderShapeXml(el.outerXml, {
                phType: ph.type,
                masterMeta,
                otherStyleRPr,
              })
              if (promoted !== el.outerXml) {
                shapeEdits.push({ start: el.start, end: el.end, replacement: promoted })
              }
            }
          }
        }
        // Also strip broken rels or nested placeholders inside <p:grpSp>
        const grpUpdates = []
        for (const grp of findBalancedElements(containerXml, 'p:grpSp')) {
          const openEnd = grp.outerXml.indexOf('>') + 1
          const innerCleaned = stripInContainer(grp.innerXml)
          if (innerCleaned !== grp.innerXml) {
            grpUpdates.push({
              start: grp.start,
              end: grp.end,
              replacement: grp.outerXml.slice(0, openEnd) + innerCleaned + '</p:grpSp>',
            })
          }
        }
        const allEdits = [
          ...ranges.map((r) => ({ ...r, replacement: '' })),
          ...shapeEdits,
          ...grpUpdates,
        ].sort((a, b) => a.start - b.start)
        if (allEdits.length === 0) return containerXml
        let out = ''
        let cur = 0
        for (const ed of allEdits) {
          if (ed.start < cur) continue
          out += containerXml.slice(cur, ed.start) + ed.replacement
          cur = ed.end
        }
        out += containerXml.slice(cur)
        return out
      }

      const openEnd = spTree.outerXml.indexOf('>') + 1
      let cleanedInner = stripInContainer(spTree.innerXml)

      // Inherit real company footer / dynamic slide number defined ONLY on slideMaster when layout inherits master shapes
      if (isLayout && showMasterSp && masterMeta) {
        const inheritedToAppend = []
        let nextSpId = allocateNextShapeId(cleanXml)
        if (!layoutHasKeptFtr && masterMeta.inheritableShapes.ftr) {
          const promotedFtr = promotePlaceholderShapeXml(masterMeta.inheritableShapes.ftr, {
            phType: 'ftr',
            masterMeta,
            otherStyleRPr,
          }).replace(/(<p:cNvPr\b[^>]*\bid=["'])\d+(["'])/, `$1${nextSpId++}$2`)
          inheritedToAppend.push(promotedFtr)
        }
        const allowInheritedSldNum = layoutType.toLowerCase() !== 'title' || layoutDeclaredSldNumStub
        if (!layoutHasKeptSldNum && allowInheritedSldNum && masterMeta.inheritableShapes.sldnum) {
          const promotedNum = promotePlaceholderShapeXml(masterMeta.inheritableShapes.sldnum, {
            phType: 'sldnum',
            masterMeta,
            otherStyleRPr,
          }).replace(/(<p:cNvPr\b[^>]*\bid=["'])\d+(["'])/, `$1${nextSpId++}$2`)
          inheritedToAppend.push(promotedNum)
        }
        if (inheritedToAppend.length > 0) {
          cleanedInner += inheritedToAppend.join('')
        }
      }

      cleanXml = cleanXml.slice(0, spTree.start) + spTree.outerXml.slice(0, openEnd) + cleanedInner + '</p:spTree>' + cleanXml.slice(spTree.end)
    }
  }

  // 2. Strip <p:timing>, <p:transition>, <p:hf>, <p:custDataLst> (tags), and <p:controls> (ActiveX)
  if (isMaster || isLayout) {
    for (const tag of ['p:timing', 'p:transition', 'p:hf', 'p:custDataLst', 'p:controls']) {
      const els = findBalancedElements(cleanXml, tag)
      if (els.length) cleanXml = stripXmlRanges(cleanXml, els)
    }
  }

  // 3. Strip ANY remaining references to non-kept (dropped or undeclared dangling) relationship IDs
  // 3a. Remove <a:ext> / <p:ext> extension blocks referencing unkept rIds (e.g., dropped <asvg:svgBlip r:embed="..."/>)
  for (const extTag of ['a:ext', 'p:ext']) {
    const badExts = findBalancedElements(cleanXml, extTag).filter((el) =>
      [...el.outerXml.matchAll(/\br:(?:embed|link|id)=["']([^"']+)["']/g)].some((m) => !keptRIdSet.has(m[1])),
    )
    if (badExts.length) cleanXml = stripXmlRanges(cleanXml, badExts)
  }
  // 3b. Remove <p:bg> if its <a:blip> references an unkept rId
  const bgEl = findBalancedElements(cleanXml, 'p:bg')[0]
  if (bgEl) {
    let bgBroken = false
    for (const bm of bgEl.outerXml.matchAll(/<a:blip\b([^>]*)/g)) {
      const emb = getXmlAttr(bm[1], 'r:embed')
      const lnk = getXmlAttr(bm[1], 'r:link')
      if ((emb && !keptRIdSet.has(emb)) || (!emb && lnk && !keptRIdSet.has(lnk))) {
        bgBroken = true
        break
      }
    }
    if (bgBroken) cleanXml = stripXmlRanges(cleanXml, [bgEl])
  }
  // 3c. Remove dangling r:link attributes (external images)
  cleanXml = cleanXml.replace(/\s+r:link=(["'])([^"']+)\1/g, (full, _q, rid) => (keptRIdSet.has(rid) ? full : ''))
  // 3d. Remove <a:hlinkClick>, <a:hlinkHover>, <p:oleObj>, <p:control> referencing any unkept/dangling rId
  cleanXml = cleanXml.replace(/<a:(hlinkClick|hlinkHover)\b([^>]*)(?:\/>|>([\s\S]*?)<\/a:\1>)/g, (full, _tag, attrs) => {
    const rid = getXmlAttr(attrs, 'r:id')
    return (!rid || keptRIdSet.has(rid)) ? full : ''
  })
  cleanXml = cleanXml.replace(/<p:(oleObj|control)\b([^>]*)(?:\/>|>([\s\S]*?)<\/p:\1>)/g, (full, _tag, attrs) => {
    const rid = getXmlAttr(attrs, 'r:id')
    return (!rid || keptRIdSet.has(rid)) ? full : ''
  })
  // 3e. Clean up empty <a:extLst/> or <a:extLst></a:extLst> left behind if all extensions were stripped
  cleanXml = cleanXml.replace(/<a:extLst>\s*<\/a:extLst>/g, '')

  // 4. Scale 4:3 / non-16:9 shapes to 16:9 while preserving corner logo aspect ratios
  if (isMaster || isLayout) {
    cleanXml = scaleSpTreeTo16x9(cleanXml, srcW, srcH)
  }

  // 5. Ensure layout has preserve="1" so PowerPoint never auto-deletes unused layouts
  if (isLayout && !/\bpreserve=["']1["']/.test(cleanXml.slice(0, 400))) {
    cleanXml = cleanXml.replace(/<p:sldLayout\b/, '<p:sldLayout preserve="1"')
  }

  return { xml: cleanXml, keptRels, keptRIdSet }
}

function allocateNextRId(usedRIds) {
  let n = 1
  while (usedRIds.has(`rId${n}`)) n += 1
  const id = `rId${n}`
  usedRIds.add(id)
  return id
}

function ensureMissingXmlNamespacesOnRoot(targetXml, sourceXml, fragmentXml, rootTag) {
  if (!fragmentXml || !sourceXml) return targetXml
  const srcRootOpen = new RegExp(`<${rootTag === 'p:sldLayout' ? 'p:sld' : rootTag}\\b([^>]*)>`).exec(sourceXml)
  const tgtRootOpen = new RegExp(`<${rootTag}\\b([^>]*)>`).exec(targetXml)
  if (!srcRootOpen || !tgtRootOpen) return targetXml

  const usedPrefixes = new Set()
  for (const m of fragmentXml.matchAll(/<\/?([a-zA-Z_][\w.-]*):/g)) {
    usedPrefixes.add(m[1])
  }
  const missingDecls = []
  for (const prefix of usedPrefixes) {
    if (['a', 'p', 'r', 'xml'].includes(prefix)) continue
    if (new RegExp(`\\bxmlns:${prefix}=`).test(tgtRootOpen[1])) continue
    const uri = getXmlAttr(srcRootOpen[1], `xmlns:${prefix}`)
    if (uri) missingDecls.push(` xmlns:${prefix}="${escapeXml(uri)}"`)
  }
  if (missingDecls.length === 0) return targetXml
  return targetXml.replace(new RegExp(`(<${rootTag}\\b)`), `$1${missingDecls.join('')}`)
}

/**
 * 若企业模板把封面/内容背景直接贴在示例页（slide-level `<p:bg>` 或满幅 `<p:pic>`）而非 `slideLayout` 上，
 * 自动将其提升注入到对应角色的移植 `slideLayout` XML + rels 中（原子单次 rId 重映射 + 剥离外链 + 补齐命名空间声明）。
 */
function promoteSlideBackgroundIntoLayout({
  layoutXml,
  layoutRels,
  slideXml,
  slidePartPath,
  slideRelsMap,
  registerMedia,
  srcW,
  srcH,
}) {
  if (!slideXml) return { xml: layoutXml, rels: layoutRels, promoted: false }
  const usedRIds = new Set(layoutRels.map((r) => r.id))
  const nextRels = [...layoutRels]

  // Case A: slide-level <p:bg>
  const slideBg = findBalancedElements(slideXml, 'p:bg')[0]
  if (slideBg) {
    let bgXml = slideBg.outerXml
    // Strip any external r:link attributes from slide background blips
    bgXml = bgXml.replace(/\s+r:link=(["'])[^"']*\1/g, '')
    // Strip any <a:ext> containing an unresolvable svgBlip before validating primary embeds
    const badExts = findBalancedElements(bgXml, 'a:ext').filter((extEl) => {
      const embeds = [...extEl.outerXml.matchAll(/\br:embed=["']([^"']+)["']/g)]
      return embeds.some((m) => {
        const mediaPath = slideRelsMap.get(m[1])
        return !mediaPath || !registerMedia(mediaPath)
      })
    })
    if (badExts.length) bgXml = stripXmlRanges(bgXml, badExts).replace(/<a:extLst>\s*<\/a:extLst>/g, '')

    // Atomic single-pass rId remapping (prevents sequential rId2->rId3 then rId3->rId4 clobbering!)
    let ok = true
    const ridMap = new Map()
    for (const m of bgXml.matchAll(/\br:embed=["']([^"']+)["']/g)) {
      const oldRid = m[1]
      if (ridMap.has(oldRid)) continue
      const mediaPath = slideRelsMap.get(oldRid)
      const reg = mediaPath ? registerMedia(mediaPath) : null
      if (!reg) {
        ok = false
        break
      }
      const newRid = allocateNextRId(usedRIds)
      nextRels.push({ id: newRid, type: SAFE_REL_TYPES.IMAGE, target: `../media/${reg.targetName}` })
      ridMap.set(oldRid, newRid)
    }
    if (ok) {
      if (ridMap.size > 0) {
        bgXml = bgXml.replace(/\br:embed=(["'])([^"']+)\1/g, (full, _q, oldRid) =>
          ridMap.has(oldRid) ? `r:embed="${ridMap.get(oldRid)}"` : full,
        )
      }
      let nextXml = ensureMissingXmlNamespacesOnRoot(layoutXml, slideXml, bgXml, 'p:sldLayout')
      const existingBg = findBalancedElements(nextXml, 'p:bg')[0]
      if (existingBg) {
        nextXml = nextXml.slice(0, existingBg.start) + bgXml + nextXml.slice(existingBg.end)
      } else {
        const cSldIdx = nextXml.indexOf('<p:cSld')
        const cSldGt = cSldIdx >= 0 ? findTagClose(nextXml, cSldIdx) : -1
        if (cSldGt >= 0) {
          nextXml = nextXml.slice(0, cSldGt + 1) + bgXml + nextXml.slice(cSldGt + 1)
        }
      }
      return { xml: nextXml, rels: nextRels, promoted: true }
    }
  }

  // Case B: full-bleed background <p:pic> on slide (>= 85% width & height)
  const spTree = findBalancedElements(slideXml, 'p:spTree')[0]
  if (spTree) {
    for (const pic of findBalancedElements(spTree.innerXml, 'p:pic')) {
      const spPr = findBalancedElements(pic.innerXml, 'p:spPr')[0]
      const xfrm = spPr ? parseXfrmFromXml(spPr.outerXml) : null
      if (!xfrm || xfrm.w < srcW * 0.85 || xfrm.h < srcH * 0.85) continue
      const rId = extractPreferredBlipRId(pic.outerXml)
      const mediaPath = rId ? slideRelsMap.get(rId) : null
      const reg = mediaPath ? registerMedia(mediaPath) : null
      if (!reg) continue
      const newRid = allocateNextRId(usedRIds)
      nextRels.push({ id: newRid, type: SAFE_REL_TYPES.IMAGE, target: `../media/${reg.targetName}` })
      const bgXml = `<p:bg><p:bgPr><a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="${newRid}"/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg>`
      let nextXml = layoutXml
      const existingBg = findBalancedElements(nextXml, 'p:bg')[0]
      if (existingBg) {
        nextXml = nextXml.slice(0, existingBg.start) + bgXml + nextXml.slice(existingBg.end)
      } else {
        const cSldIdx = nextXml.indexOf('<p:cSld')
        const cSldGt = cSldIdx >= 0 ? findTagClose(nextXml, cSldIdx) : -1
        if (cSldGt >= 0) {
          nextXml = nextXml.slice(0, cSldGt + 1) + bgXml + nextXml.slice(cSldGt + 1)
        }
      }
      return { xml: nextXml, rels: nextRels, promoted: true }
    }
  }

  return { xml: layoutXml, rels: layoutRels, promoted: false }
}

// ---------------------------------------------------------------------------
// 核心入口：从已加载的 @office-kit/pptx Presentation 提取 Plan A + Plan B 企业模板母版
// ---------------------------------------------------------------------------

/**
 * 从企业参考 `.pptx` 提取 4 角色母版（Plan A 同构视觉层 + Plan B 原生 OOXML slideMaster 移植包）。
 * 仅使用传入的 `@office-kit/pptx` 实例和 Node 内置模块，零外部依赖。
 */
export function extractTemplateMasterFromPresentation(lib, pres, options = {}) {
  const warnings = []
  const mode = options.templateMasterMode === 'overlay' ? 'overlay' : 'native-master'
  const rawSourceBase = options.sourceFile ? basename(String(options.sourceFile).replace(/[\\/]+/g, '/')).slice(0, 120) : ''
  const sourceFile = (rawSourceBase && !/^\.absorb-[0-9a-f-]+\.pptx$/i.test(rawSourceBase)) ? rawSourceBase : 'corporate-template.pptx'

  const partList = (lib.listPackageParts?.(pres) ?? [])
    .map((p) => {
      const raw = typeof p === 'string' ? p : (p && typeof p === 'object' ? (p.name || p.partName || '') : '')
      return raw ? '/' + String(raw).replace(/^\/+/, '') : ''
    })
    .filter(Boolean)
  const packagePartSet = new Set(partList)
  const readText = (partPath) => {
    const norm = '/' + String(partPath || '').replace(/^\/+/, '')
    if (!packagePartSet.has(norm)) return ''
    try {
      const bytes = lib.readPackagePart(pres, norm)
      return bytes ? Buffer.from(bytes).toString('utf8') : ''
    } catch {
      return ''
    }
  }
  const readBytes = (partPath) => {
    const norm = '/' + String(partPath || '').replace(/^\/+/, '')
    if (!packagePartSet.has(norm)) return null
    try {
      const bytes = lib.readPackagePart(pres, norm)
      return bytes ? Buffer.from(bytes) : null
    } catch {
      return null
    }
  }

  // 1. Source slide dimensions
  let srcW = EMU_W
  let srcH = EMU_H
  try {
    const sz = lib.getSlideSize?.(pres)
    if (sz?.widthEmu > 0 && sz?.heightEmu > 0) {
      srcW = sz.widthEmu
      srcH = sz.heightEmu
    }
  } catch { /* fallback to presentation.xml */ }
  const presXml = readText('/ppt/presentation.xml')
  if (srcW === EMU_W && presXml) {
    const szM = /<p:sldSz\b([^>]*)\/?>/.exec(presXml)
    if (szM) {
      const cx = Number(getXmlAttr(szM[1], 'cx'))
      const cy = Number(getXmlAttr(szM[1], 'cy'))
      if (cx > 0 && cy > 0) { srcW = cx; srcH = cy }
    }
  }
  const adaptedAspect = Math.abs(srcW - EMU_W) > 100000 || Math.abs(srcH - EMU_H) > 100000
  if (adaptedAspect) {
    warnings.push(`企业模板原始画幅为 ${(srcW / EMU_PER_IN).toFixed(2)}"×${(srcH / EMU_PER_IN).toFixed(2)}"，已等比保护角落 Logo 并智能适配至 16:9 宽屏画布`)
  }

  // 2. Discover all slideMasters, themes, and slideLayouts
  const masterParts = partList
    .filter((p) => /^\/ppt\/slideMasters\/slideMaster\d+\.xml$/i.test(p))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const layoutParts = partList
    .filter((p) => /^\/ppt\/slideLayouts\/slideLayout\d+\.xml$/i.test(p))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  if (masterParts.length === 0 || layoutParts.length === 0) {
    throw new Error('dsh-ppt：企业参考 .pptx 缺少有效的 slideMaster 或 slideLayout，无法提取模板母版')
  }

  // Parse each master + its theme + colorMap
  const masterInfoByPath = new Map()
  const themeParsedByPath = new Map()
  for (const mPath of masterParts) {
    const mXml = readText(mPath)
    const mRelsXml = readText(relsPathForPart(mPath))
    const mRels = parseRelationshipsXml(mRelsXml)
    const mRelsMap = new Map()
    let themePath = ''
    for (const r of mRels) {
      if (r.targetMode?.toLowerCase() === 'external') continue
      const target = resolvePartRelativePath(mPath, r.target)
      if (!target || !packagePartSet.has(target)) continue
      mRelsMap.set(r.id, target)
      if (r.type === SAFE_REL_TYPES.THEME && !themePath) themePath = target
    }
    if (!themePath && packagePartSet.has('/ppt/theme/theme1.xml')) themePath = '/ppt/theme/theme1.xml'
    let themeData = themeParsedByPath.get(themePath)
    if (!themeData) {
      const tXml = themePath ? readText(themePath) : ''
      themeData = { xml: tXml, relsXml: themePath ? readText(relsPathForPart(themePath)) : '', ...parseThemeSchemeFromXml(tXml) }
      if (themePath) themeParsedByPath.set(themePath, themeData)
    }
    const colorMap = parseColorMapFromXml(mXml)
    masterInfoByPath.set(mPath, {
      partPath: mPath,
      xml: mXml,
      relsXml: mRelsXml,
      relsMap: mRelsMap,
      themePath,
      themeData,
      colorMap,
    })
  }

  // Parse each slideLayout
  const layoutInfos = []
  const layoutInfoByPath = new Map()
  for (const lPath of layoutParts) {
    const lXml = readText(lPath)
    const lRelsXml = readText(relsPathForPart(lPath))
    const lRels = parseRelationshipsXml(lRelsXml)
    const lRelsMap = new Map()
    let masterPath = ''
    for (const r of lRels) {
      if (r.targetMode?.toLowerCase() === 'external') continue
      const target = resolvePartRelativePath(lPath, r.target)
      if (!target || !packagePartSet.has(target)) continue
      lRelsMap.set(r.id, target)
      if (r.type === SAFE_REL_TYPES.SLIDE_MASTER && !masterPath) masterPath = target
    }
    if (!masterPath) masterPath = masterParts[0]
    const openMatch = /<p:sldLayout\b([^>]*)>/.exec(lXml)
    const cSldMatch = /<p:cSld\b([^>]*)>/.exec(lXml)
    const type = openMatch ? getXmlAttr(openMatch[1], 'type') : ''
    const showMasterSp = openMatch ? getXmlAttr(openMatch[1], 'showMasterSp') !== '0' : true
    const name = cSldMatch ? getXmlAttr(cSldMatch[1], 'name') : basename(lPath, '.xml')
    const masterInfo = masterInfoByPath.get(masterPath) || masterInfoByPath.get(masterParts[0])
    const colorMap = parseColorMapFromXml(lXml, masterInfo?.colorMap)
    const info = {
      partPath: lPath,
      xml: lXml,
      relsXml: lRelsXml,
      relsMap: lRelsMap,
      masterPath: masterInfo.partPath,
      masterInfo,
      type,
      name: name || basename(lPath, '.xml'),
      showMasterSp,
      colorMap,
    }
    layoutInfos.push(info)
    layoutInfoByPath.set(lPath, info)
  }

  // 3. Inspect non-hidden sample slides (if present) for accurate role mapping + slide-level bg promotion
  const presRels = parseRelationshipsXml(readText('/ppt/_rels/presentation.xml.rels'))
  const presRelMap = new Map()
  for (const r of presRels) {
    const target = resolvePartRelativePath('/ppt/presentation.xml', r.target)
    if (target && packagePartSet.has(target)) presRelMap.set(r.id, target)
  }
  const orderedSlideParts = []
  for (const m of presXml.matchAll(/<p:sldId\b[^>]*\br:id=["']([^"']+)["'][^>]*\/?>/g)) {
    const p = presRelMap.get(m[1])
    if (p) orderedSlideParts.push(p)
  }
  if (orderedSlideParts.length === 0) {
    orderedSlideParts.push(...partList
      .filter((p) => /^\/ppt\/slides\/slide\d+\.xml$/i.test(p))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })))
  }

  const sampleSlides = []
  for (let i = 0; i < orderedSlideParts.length; i += 1) {
    const sPath = orderedSlideParts[i]
    const sXml = readText(sPath)
    if (!sXml) continue
    const sOpen = /<p:sld\b([^>]*)>/.exec(sXml)
    const isHidden = sOpen ? getXmlAttr(sOpen[1], 'show') === '0' : false
    if (isHidden) continue
    const sRels = parseRelationshipsXml(readText(relsPathForPart(sPath)))
    const sRelsMap = new Map()
    let layoutPath = ''
    for (const r of sRels) {
      if (r.targetMode?.toLowerCase() === 'external') continue
      const target = resolvePartRelativePath(sPath, r.target)
      if (!target || !packagePartSet.has(target)) continue
      sRelsMap.set(r.id, target)
      if (r.type === SAFE_REL_TYPES.SLIDE_LAYOUT && !layoutPath) layoutPath = target
    }
    const layoutInfo = layoutInfoByPath.get(layoutPath) || layoutInfos[0]
    const hasOwnBg = Boolean(findBalancedElements(sXml, 'p:bg')[0])
    let hasFullBleedPic = false
    const spTree = findBalancedElements(sXml, 'p:spTree')[0]
    if (spTree) {
      for (const pic of findBalancedElements(spTree.innerXml, 'p:pic')) {
        const spPr = findBalancedElements(pic.innerXml, 'p:spPr')[0]
        const xfrm = spPr ? parseXfrmFromXml(spPr.outerXml) : null
        if (xfrm && xfrm.w >= srcW * 0.85 && xfrm.h >= srcH * 0.85) {
          hasFullBleedPic = true
          break
        }
      }
    }
    const textSample = extractPlainTextFromShapeXml(sXml).slice(0, 120)
    // Sample dominant text color luminance on sample slide for dark-photo cover fallback polarity
    const textColors = []
    for (const sp of findBalancedElements(sXml, 'p:sp').slice(0, 8)) {
      const tx = findBalancedElements(sp.innerXml, 'p:txBody')[0]
      if (!tx) continue
      const rPr = findBalancedElements(tx.innerXml, 'a:rPr')[0]
      const tc = rPr ? parseFillFromXml(rPr.innerXml, layoutInfo.masterInfo.themeData.scheme, layoutInfo.colorMap, sRelsMap) : null
      if (tc?.type === 'solid') textColors.push(tc.color)
    }
    const lightTextRatio = textColors.length > 0
      ? textColors.filter((c) => relativeLuminance(c) > 0.65).length / textColors.length
      : null

    sampleSlides.push({
      index: i,
      partPath: sPath,
      xml: sXml,
      relsMap: sRelsMap,
      layoutInfo,
      hasOwnBg,
      hasFullBleedPic,
      showMasterSp: sOpen ? getXmlAttr(sOpen[1], 'showMasterSp') !== '0' : true,
      textSample,
      lightTextRatio,
    })
  }

  // 4. Select best (layoutInfo, sampleSlide?) for each of the 4 roles
  const pickBestLayoutForRole = (role) => {
    let best = layoutInfos[0]
    let bestScore = -Infinity
    for (const l of layoutInfos) {
      const sc = scoreLayoutForRole(role, l)
      if (sc > bestScore) { bestScore = sc; best = l }
    }
    return { layout: best, score: bestScore }
  }

  const roleSelection = {}
  // Cover
  if (sampleSlides.length > 0) {
    const first = sampleSlides[0]
    const bestLay = pickBestLayoutForRole('cover')
    const useFirstSlide = first.hasOwnBg || first.hasFullBleedPic || scoreLayoutForRole('cover', first.layoutInfo) >= 0 || bestLay.score <= 0
    roleSelection.cover = useFirstSlide
      ? { layout: first.layoutInfo, sampleSlide: first }
      : { layout: bestLay.layout, sampleSlide: null }
  } else {
    roleSelection.cover = { layout: pickBestLayoutForRole('cover').layout, sampleSlide: null }
  }

  // Closing
  const bestClosingLay = pickBestLayoutForRole('closing')
  if (sampleSlides.length >= 2) {
    const last = sampleSlides[sampleSlides.length - 1]
    const lastLooksClosing = /thank|谢谢|感谢|结束|q\s*&\s*a|contact|联系|封底/i.test(last.textSample) ||
      scoreLayoutForRole('closing', last.layoutInfo) >= 50 ||
      last.hasOwnBg || last.hasFullBleedPic ||
      last.layoutInfo.partPath !== sampleSlides[Math.min(1, sampleSlides.length - 1)].layoutInfo.partPath
    if (bestClosingLay.score >= 80 && !last.hasOwnBg && !last.hasFullBleedPic) {
      roleSelection.closing = { layout: bestClosingLay.layout, sampleSlide: null }
    } else if (lastLooksClosing) {
      roleSelection.closing = { layout: last.layoutInfo, sampleSlide: last }
    } else {
      roleSelection.closing = { layout: roleSelection.cover.layout, sampleSlide: roleSelection.cover.sampleSlide }
    }
  } else {
    roleSelection.closing = bestClosingLay.score >= 60
      ? { layout: bestClosingLay.layout, sampleSlide: null }
      : { layout: roleSelection.cover.layout, sampleSlide: null }
  }

  // Section
  const bestSectionLay = pickBestLayoutForRole('section')
  const middleSlides = sampleSlides.slice(1, Math.max(1, sampleSlides.length - 1))
  const sectionSample = middleSlides.find((s) =>
    scoreLayoutForRole('section', s.layoutInfo) >= 50 ||
    /^(?:0?\d|part\s*\d|chapter\s*\d|第[一二三四五六七八九十\d]+[章部节])/i.test(s.textSample),
  ) || null
  if (sectionSample) {
    roleSelection.section = { layout: sectionSample.layoutInfo, sampleSlide: sectionSample }
  } else if (bestSectionLay.score >= 50) {
    roleSelection.section = { layout: bestSectionLay.layout, sampleSlide: null }
  } else {
    roleSelection.section = { layout: roleSelection.cover.layout, sampleSlide: null }
  }

  // Content
  const bestContentLay = pickBestLayoutForRole('content')
  const contentCandidates = middleSlides.filter((s) => s !== sectionSample)
  if (contentCandidates.length > 0) {
    const counts = new Map()
    for (const s of contentCandidates) {
      counts.set(s.layoutInfo.partPath, (counts.get(s.layoutInfo.partPath) || 0) + 1)
    }
    const topSlide = contentCandidates.slice().sort((a, b) =>
      (counts.get(b.layoutInfo.partPath) - counts.get(a.layoutInfo.partPath)) ||
      (scoreLayoutForRole('content', b.layoutInfo) - scoreLayoutForRole('content', a.layoutInfo)),
    )[0]
    roleSelection.content = { layout: topSlide.layoutInfo, sampleSlide: topSlide }
  } else if (sampleSlides.length === 2 && sampleSlides[1] !== roleSelection.closing.sampleSlide) {
    roleSelection.content = { layout: sampleSlides[1].layoutInfo, sampleSlide: sampleSlides[1] }
  } else {
    roleSelection.content = { layout: bestContentLay.layout, sampleSlide: null }
  }

  // 5. Deduplicated media registry (raster -> assets map; svg/emf/wmf/gif -> nativePackage.media.dataBase64)
  const templateMasterAssets = {}
  const mediaBySha = new Map()
  const mediaByPartPath = new Map()
  const nativeMediaList = []
  let mediaSeq = 0
  let totalMediaBytes = 0

  const registerMedia = (partPath) => {
    const norm = '/' + String(partPath || '').replace(/^\/+/, '')
    if (mediaByPartPath.has(norm)) return mediaByPartPath.get(norm)
    const bytes = readBytes(norm)
    if (!bytes || bytes.length === 0) return null
    if (bytes.length > MAX_SINGLE_MEDIA_BYTES) {
      warnings.push(`跳过超过 5 MiB 的母版媒体：${basename(norm)}`)
      return null
    }
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    if (mediaBySha.has(sha256)) {
      const existing = mediaBySha.get(sha256)
      mediaByPartPath.set(norm, existing)
      return existing
    }
    if (totalMediaBytes + bytes.length > MAX_TOTAL_TEMPLATE_BYTES) {
      warnings.push(`企业母版媒体总量超过 12 MiB 上限，已跳过后续大图：${basename(norm)}`)
      return null
    }

    const rasterInfo = inspectRasterImageBytes(bytes)
    let ext = extname(norm).replace(/^\./, '').toLowerCase()
    if (rasterInfo) ext = rasterInfo.ext
    if (!MEDIA_MIME_BY_EXT[ext]) return null
    const mime = rasterInfo ? rasterInfo.mime : MEDIA_MIME_BY_EXT[ext]

    mediaSeq += 1
    totalMediaBytes += bytes.length
    const targetName = `corp_m_${mediaSeq}.${ext}`
    let entry
    if (rasterInfo && RASTER_ASSET_EXTS.has(ext)) {
      const assetId = 'img-' + sha256
      const dataUri = `data:${mime};base64,${bytes.toString('base64')}`
      templateMasterAssets[assetId] = {
        width: rasterInfo.width,
        height: rasterInfo.height,
        mime,
        data: dataUri,
      }
      entry = {
        targetName,
        ext,
        mime,
        assetId,
        sha256,
        bytes,
        dataUri,
        width: rasterInfo.width,
        height: rasterInfo.height,
      }
    } else {
      const b64 = bytes.toString('base64')
      entry = {
        targetName,
        ext,
        mime,
        dataBase64: b64,
        sha256,
        bytes,
        dataUri: mime === 'image/svg+xml' ? `data:image/svg+xml;base64,${b64}` : '',
      }
    }
    mediaBySha.set(sha256, entry)
    mediaByPartPath.set(norm, entry)
    nativeMediaList.push({
      targetName: entry.targetName,
      ext: entry.ext,
      mime: entry.mime,
      ...(entry.assetId ? { assetId: entry.assetId } : { dataBase64: entry.dataBase64 }),
      sha256: entry.sha256,
    })
    return entry
  }

  // 6. Collect distinct masters & themes referenced by the 4 role selections
  const masterIndexBySrcPath = new Map()
  const usedMasters = []
  const themeIndexBySrcPath = new Map()
  const usedThemes = []

  for (const role of TEMPLATE_MASTER_ROLES) {
    const mInfo = roleSelection[role].layout.masterInfo
    if (!masterIndexBySrcPath.has(mInfo.partPath)) {
      const mIdx = usedMasters.length + 1
      masterIndexBySrcPath.set(mInfo.partPath, mIdx)
      usedMasters.push({ index: mIdx, info: mInfo })
      if (mInfo.themePath && !themeIndexBySrcPath.has(mInfo.themePath)) {
        const tIdx = usedThemes.length + 1
        themeIndexBySrcPath.set(mInfo.themePath, tIdx)
        usedThemes.push({ index: tIdx, path: mInfo.themePath, data: mInfo.themeData })
      }
    }
  }

  // Sanitize themes
  const nativeThemes = usedThemes.map((t) => {
    const res = sanitizePartRelsAndXml(t.data.xml, t.data.relsXml, t.path, {
      packagePartSet,
      registerMedia,
      masterIndexBySrcPath,
      themeIndexBySrcPath,
      stripPlaceholders: false,
      srcW,
      srcH,
    })
    return {
      index: t.index,
      xml: res.xml,
      ...(res.keptRels.length > 0 ? { relsXml: buildRelationshipsXml(res.keptRels) } : {}),
    }
  })

  // Sanitize masters (rels & sldLayoutIdLst will be finalized after layouts are registered)
  const sanitizedMasters = usedMasters.map((m) => {
    const res = sanitizePartRelsAndXml(m.info.xml, m.info.relsXml, m.info.partPath, {
      packagePartSet,
      registerMedia,
      masterIndexBySrcPath,
      themeIndexBySrcPath,
      isMaster: true,
      stripPlaceholders: true,
      srcW,
      srcH,
    })
    // Ensure theme relationship exists
    const tIdx = themeIndexBySrcPath.get(m.info.themePath) || 1
    if (!res.keptRels.some((r) => r.type === SAFE_REL_TYPES.THEME)) {
      const used = new Set(res.keptRels.map((r) => r.id))
      res.keptRels.push({
        id: allocateNextRId(used),
        type: SAFE_REL_TYPES.THEME,
        target: `../theme/theme${tIdx}.xml`,
      })
    }
    return {
      index: m.index,
      name: basename(m.info.partPath, '.xml'),
      info: m.info,
      xml: res.xml,
      rels: res.keptRels,
      layoutEntries: [],
    }
  })
  const masterEntryByIndex = new Map(sanitizedMasters.map((m) => [m.index, m]))

  // 7. Build 4 role layouts (with slide-level background promotion when needed) + Plan A SVG + polarity + safeInsets
  const nativeLayouts = []
  const roleLayoutIndex = {}
  const roles = {}
  const layoutKeyToIndex = new Map()

  for (const role of TEMPLATE_MASTER_ROLES) {
    const sel = roleSelection[role]
    const lInfo = sel.layout
    const mInfo = lInfo.masterInfo
    const masterIndex = masterIndexBySrcPath.get(mInfo.partPath) || 1
    const sampleSlide = sel.sampleSlide
    const wantsSlidePromo = Boolean(sampleSlide && (sampleSlide.hasOwnBg || sampleSlide.hasFullBleedPic))
    const dedupKey = wantsSlidePromo
      ? `${lInfo.partPath}#slide:${sampleSlide.partPath}`
      : lInfo.partPath

    const showMasterSp = lInfo.showMasterSp && (!wantsSlidePromo || sampleSlide?.showMasterSp !== false)
    let layoutIndex = layoutKeyToIndex.get(dedupKey)
    let promotedFromSlide = false
    if (!layoutIndex) {
      const sanitizedLay = sanitizePartRelsAndXml(lInfo.xml, lInfo.relsXml, lInfo.partPath, {
        packagePartSet,
        registerMedia,
        masterIndexBySrcPath,
        themeIndexBySrcPath,
        isLayout: true,
        stripPlaceholders: true,
        masterXml: mInfo.xml,
        layoutType: lInfo.type || '',
        showMasterSp,
        srcW,
        srcH,
      })
      let layXml = sanitizedLay.xml
      let layRels = sanitizedLay.keptRels

      // Guarantee slideMaster rel exists
      if (!layRels.some((r) => r.type === SAFE_REL_TYPES.SLIDE_MASTER)) {
        const used = new Set(layRels.map((r) => r.id))
        layRels.push({
          id: allocateNextRId(used),
          type: SAFE_REL_TYPES.SLIDE_MASTER,
          target: `../slideMasters/slideMaster${masterIndex}.xml`,
        })
      }

      // Promote slide-level bg / full-bleed pic into this role layout if present
      if (wantsSlidePromo) {
        const promoted = promoteSlideBackgroundIntoLayout({
          layoutXml: layXml,
          layoutRels: layRels,
          slideXml: sampleSlide.xml,
          slidePartPath: sampleSlide.partPath,
          slideRelsMap: sampleSlide.relsMap,
          registerMedia,
          srcW,
          srcH,
        })
        layXml = promoted.xml
        layRels = promoted.rels
        promotedFromSlide = promoted.promoted
        if (promotedFromSlide && !sampleSlide.showMasterSp && !/\bshowMasterSp=/.test(layXml.slice(0, 400))) {
          layXml = layXml.replace(/<p:sldLayout\b/, '<p:sldLayout showMasterSp="0"')
        }
      }

      layoutIndex = nativeLayouts.length + 1
      layoutKeyToIndex.set(dedupKey, layoutIndex)
      nativeLayouts.push({
        index: layoutIndex,
        masterIndex,
        role,
        name: lInfo.name,
        type: lInfo.type || 'blank',
        xml: layXml,
        relsXml: buildRelationshipsXml(layRels),
      })
      masterEntryByIndex.get(masterIndex).layoutEntries.push(layoutIndex)
    } else {
      promotedFromSlide = wantsSlidePromo
    }
    roleLayoutIndex[role] = layoutIndex

    // Visual compilation for Plan A (HTML 1:1 SVG + overlay mode + luminance + safeInsets)
    // Respect layout <p:clrMapOvr> (e.g. bg1="dk1" dark cover overriding master's bgRef bg1) when resolving master bg & master shapes!
    const effectiveColorMap = lInfo.colorMap || mInfo.colorMap
    const masterBg = parseFillFromXml(
      findBalancedElements(mInfo.xml, 'p:bg')[0]?.outerXml || '',
      mInfo.themeData.scheme,
      effectiveColorMap,
      mInfo.relsMap,
      mInfo.themeData.bgFillStyles,
    )
    const layoutBg = parseFillFromXml(
      findBalancedElements(lInfo.xml, 'p:bg')[0]?.outerXml || '',
      mInfo.themeData.scheme,
      effectiveColorMap,
      lInfo.relsMap,
      mInfo.themeData.bgFillStyles,
    )
    let slideBg = null
    if (wantsSlidePromo && sampleSlide?.xml) {
      const slideColorMap = parseColorMapFromXml(sampleSlide.xml, effectiveColorMap)
      slideBg = parseFillFromXml(
        findBalancedElements(sampleSlide.xml, 'p:bg')[0]?.outerXml || '',
        mInfo.themeData.scheme,
        slideColorMap,
        sampleSlide.relsMap,
        mInfo.themeData.bgFillStyles,
      )
      if (!slideBg && sampleSlide.hasFullBleedPic) {
        const sTree = findBalancedElements(sampleSlide.xml, 'p:spTree')[0]
        if (sTree) {
          for (const pic of findBalancedElements(sTree.innerXml, 'p:pic')) {
            const spPr = findBalancedElements(pic.innerXml, 'p:spPr')[0]
            const xfrm = spPr ? parseXfrmFromXml(spPr.outerXml) : null
            if (xfrm && xfrm.w >= srcW * 0.85 && xfrm.h >= srcH * 0.85) {
              const rId = extractPreferredBlipRId(pic.outerXml)
              const partPath = rId ? sampleSlide.relsMap.get(rId) : null
              if (partPath) { slideBg = { type: 'image', partPath, rId }; break }
            }
          }
        }
      }
    }
    const effectiveBg = slideBg || layoutBg || masterBg

    // Ensure background media is registered even when mode is overlay
    if (effectiveBg?.type === 'image' && effectiveBg.partPath) {
      registerMedia(effectiveBg.partPath)
    }

    const masterNodes = showMasterSp
      ? extractVisualNodesFromSpTree(mInfo.xml, {
          themeScheme: mInfo.themeData.scheme,
          colorMap: effectiveColorMap,
          relsMap: mInfo.relsMap,
          srcW,
          srcH,
          isMaster: true,
        })
      : []
    const layoutNodes = extractVisualNodesFromSpTree(lInfo.xml, {
      themeScheme: mInfo.themeData.scheme,
      colorMap: effectiveColorMap,
      relsMap: lInfo.relsMap,
      srcW,
      srcH,
      isMaster: false,
    })
    // Include master-level real company footer / dynamic slide number placeholders inherited by this layout
    const inheritedChromeNodes = []
    if (showMasterSp) {
      const mMeta = extractMasterPlaceholderMetadata(mInfo.xml)
      const hasLayFtr = layoutNodes.some((n) => n.ph?.type === 'ftr' && n.text)
      const hasLaySldNum = layoutNodes.some((n) => n.hasSlideNum || n.ph?.type === 'sldnum')
      const layHasSldNumStub = /<p:ph\b[^>]*\btype=["']sldNum["']/i.test(lInfo.xml)
      const inheritedSpChunks = []
      if (!hasLayFtr && mMeta.inheritableShapes.ftr) inheritedSpChunks.push(mMeta.inheritableShapes.ftr)
      if (!hasLaySldNum && ((lInfo.type || '').toLowerCase() !== 'title' || layHasSldNumStub) && mMeta.inheritableShapes.sldnum) {
        inheritedSpChunks.push(mMeta.inheritableShapes.sldnum)
      }
      if (inheritedSpChunks.length > 0) {
        const syntheticXml = `<p:spTree>${inheritedSpChunks.join('')}</p:spTree>`
        inheritedChromeNodes.push(
          ...extractVisualNodesFromSpTree(syntheticXml, {
            themeScheme: mInfo.themeData.scheme,
            colorMap: effectiveColorMap,
            relsMap: mInfo.relsMap,
            srcW,
            srcH,
            isMaster: false,
            excludePlaceholders: false,
          }),
        )
      }
    }
    const combinedNodes = [...masterNodes, ...layoutNodes, ...inheritedChromeNodes]
    for (const n of combinedNodes) {
      if (n.kind === 'image' && n.partPath) registerMedia(n.partPath)
      else if (n.fill?.type === 'image' && n.fill.partPath) registerMedia(n.fill.partPath)
    }

    // Determine full-bleed bgAssetId + representative color + luminance polarity
    let bgAssetId
    let bgSample = null
    if (effectiveBg?.type === 'image') {
      const m = mediaByPartPath.get(effectiveBg.partPath)
      if (m?.assetId) bgAssetId = m.assetId
      if (m?.mime === 'image/png' && m.bytes) bgSample = samplePngCenterLuminance(m.bytes)
    } else {
      // Check for full-bleed image node in master/layout
      const fullImgNode = [...combinedNodes].reverse().find((n) =>
        n.kind === 'image' && n.box.w >= EMU_W * 0.85 && n.box.h >= EMU_H * 0.85,
      )
      if (fullImgNode) {
        const m = mediaByPartPath.get(fullImgNode.partPath)
        if (m?.assetId) bgAssetId = m.assetId
        if (m?.mime === 'image/png' && m.bytes) bgSample = samplePngCenterLuminance(m.bytes)
      }
    }

    let bgColor = bgSample?.avgColor || ''
    if (!bgColor && effectiveBg?.type === 'solid') bgColor = effectiveBg.color
    if (!bgColor && effectiveBg?.type === 'gradient' && effectiveBg.stops?.length) {
      bgColor = effectiveBg.stops[Math.floor(effectiveBg.stops.length / 2)].color
    }
    if (!bgColor) {
      // Check full-bleed solid/gradient shape in layout/master
      const fullShape = [...combinedNodes].reverse().find((n) =>
        n.kind === 'shape' && n.fill && n.box.w >= EMU_W * 0.85 && n.box.h >= EMU_H * 0.85,
      )
      if (fullShape?.fill?.type === 'solid') bgColor = fullShape.fill.color
      else if (fullShape?.fill?.type === 'gradient' && fullShape.fill.stops?.length) bgColor = fullShape.fill.stops[0].color
    }
    if (!bgColor) {
      const bg1Mapped = effectiveColorMap?.bg1 || 'lt1'
      const bg1Prop = SCHEME_PROP_MAP[bg1Mapped] || 'light1'
      const schemeBg1 = mInfo.themeData.scheme[bg1Prop] || mInfo.themeData.scheme.light1
      bgColor = normalizeHex(schemeBg1, '#FFFFFF')
    }

    let avgLuminance = bgSample ? bgSample.avgLuminance : Number(relativeLuminance(bgColor).toFixed(4))
    let dark = bgSample ? bgSample.dark : avgLuminance < 0.36
    let needsScrim = Boolean(bgSample?.needsScrim)

    // Non-PNG full-bleed photo fallback: use sample slide's text polarity when pixel sampling unavailable
    if (!bgSample && bgAssetId && sampleSlide?.lightTextRatio !== null && sampleSlide?.lightTextRatio !== undefined) {
      if (sampleSlide.lightTextRatio >= 0.6) {
        dark = true
        avgLuminance = 0.08
        bgColor = '#0F172A'
      } else if (sampleSlide.lightTextRatio <= 0.3) {
        dark = false
        avgLuminance = 0.92
        bgColor = '#FFFFFF'
      }
    }

    const compiled = compileRoleMasterSvg({
      bgFill: effectiveBg,
      nodes: combinedNodes,
      mediaByPartPath,
      defaultBgColor: bgColor,
    })

    const roleSafeInsets = detectSafeInsetsFromLayoutAndNodes(lInfo.xml, mInfo.xml, combinedNodes, srcW, srcH)
    const chromePresence = detectMasterChromePresence(combinedNodes)

    const normalizeGradientObj = (grad) => {
      if (!grad || !Array.isArray(grad.stops) || grad.stops.length < 2) return null
      const rawAng = Number.isFinite(grad.angleDeg) ? grad.angleDeg : (Number.isFinite(grad.angle) ? grad.angle : 0)
      return {
        angle: Number(rawAng.toFixed(2)),
        stops: grad.stops.slice(0, 6).map((st) => {
          const rawPos = Number(st.pos)
          const normPos = Number.isFinite(rawPos) ? Math.max(0, Math.min(1, rawPos > 1 ? rawPos / 100 : rawPos)) : 0
          return {
            pos: Number(normPos.toFixed(4)),
            color: normalizeHex(st.color, bgColor),
            ...(st.alpha !== undefined && st.alpha < 0.999 ? { alpha: st.alpha } : {}),
          }
        }),
      }
    }

    // Extract lightweight vector overlay shapes (solid/gradient shapes, lines, images) for Plan A PPTX overlay parity
    const overlayShapes = combinedNodes
      .filter((n) => {
        const isFullCanvasImg = n.kind === 'image' && n.box.w >= EMU_W * 0.85 && n.box.h >= EMU_H * 0.85
        if (isFullCanvasImg) return false
        // Plan A renders its own Page number shape; omit bare sldNum placeholder boxes with no static text
        if (n.hasSlideNum && !n.text) return false
        return true
      })
      .slice(0, 36)
      .map((n) => {
        if (n.kind === 'image') {
          const m = mediaByPartPath.get(n.partPath)
          if (!m?.assetId) return null
          return {
            kind: 'image',
            box: n.box,
            assetId: m.assetId,
            name: n.name || 'Master Graphic',
            ...(n.rot && Math.abs(n.rot) > 0.2 ? { rot: Number(n.rot.toFixed(2)) } : {}),
          }
        }
        if (n.kind === 'line' && n.stroke) {
          return { kind: 'line', box: n.box, flipH: n.flipH, flipV: n.flipV, stroke: n.stroke }
        }
        if (n.kind === 'shape' && (n.fill?.type === 'solid' || n.fill?.type === 'gradient' || n.stroke || n.text)) {
          const shapeGrad = n.fill?.type === 'gradient' ? normalizeGradientObj(n.fill) : null
          return {
            kind: 'shape',
            preset: n.preset || 'rect',
            box: n.box,
            ...(n.rot && Math.abs(n.rot) > 0.2 ? { rot: Number(n.rot.toFixed(2)) } : {}),
            fill: n.fill?.type === 'solid' ? { color: n.fill.color, alpha: n.fill.alpha ?? 1 } : null,
            ...(shapeGrad ? { fillGradient: shapeGrad } : {}),
            stroke: n.stroke || null,
            ...(n.text ? {
              text: n.text.slice(0, 120),
              textColor: n.textColor,
              textSizePt: n.textSizePt,
              textAlign: n.textAlign,
              ...(n.textBold ? { textBold: true } : {}),
              ...(n.lInsEmu > 0 ? { lInsEmu: n.lInsEmu } : {}),
              ...(n.rInsEmu > 0 ? { rInsEmu: n.rInsEmu } : {}),
            } : {}),
          }
        }
        return null
      })
      .filter(Boolean)

    const bgGradient = effectiveBg?.type === 'gradient' ? (normalizeGradientObj(effectiveBg) || undefined) : undefined

    roles[role] = {
      role,
      layoutName: lInfo.name,
      layoutIndex,
      bgColor,
      ...(bgGradient ? { bgGradient } : {}),
      dark,
      avgLuminance,
      needsScrim,
      ...(bgAssetId ? { bgAssetId } : {}),
      svgPreview: compiled.svgPreview,
      ...(compiled.svgAssetIds.length > 0 ? { svgAssetIds: compiled.svgAssetIds } : {}),
      safeInsets: roleSafeInsets,
      hasLogo: chromePresence.hasLogo,
      hasFooter: chromePresence.hasFooter,
      hasSlideNumber: chromePresence.hasSlideNumber,
      ...(promotedFromSlide ? { promotedFromSlide: true } : {}),
      ...(overlayShapes.length > 0 ? { overlayShapes } : {}),
    }
  }

  // 8. Finalize each slideMaster's <p:sldLayoutIdLst> and rels with strictly disjoint IDs & ECMA-376 CT_SlideMaster order
  let nextLayoutIdNum = 2147483700
  const finalNativeMasters = sanitizedMasters.map((m) => {
    const usedRIds = new Set(m.rels.map((r) => r.id))
    const layoutIdEntries = []
    for (const layIdx of m.layoutEntries) {
      const rId = allocateNextRId(usedRIds)
      m.rels.push({
        id: rId,
        type: SAFE_REL_TYPES.SLIDE_LAYOUT,
        target: `../slideLayouts/slideLayout${layIdx}.xml`,
      })
      layoutIdEntries.push(`<p:sldLayoutId id="${nextLayoutIdNum++}" r:id="${rId}"/>`)
    }
    const listXml = `<p:sldLayoutIdLst>${layoutIdEntries.join('')}</p:sldLayoutIdLst>`
    let masterXml = m.xml
    const existingList = findBalancedElements(masterXml, 'p:sldLayoutIdLst')[0]
    if (existingList) {
      masterXml = masterXml.slice(0, existingList.start) + listXml + masterXml.slice(existingList.end)
    } else {
      // CT_SlideMaster sequence: cSld -> clrMap -> sldLayoutIdLst -> transition -> timing -> hf -> txStyles -> extLst
      const clrMapEl = findBalancedElements(masterXml, 'p:clrMap')[0]
      if (clrMapEl) {
        masterXml = masterXml.slice(0, clrMapEl.end) + listXml + masterXml.slice(clrMapEl.end)
      } else {
        const anchor = findBalancedElements(masterXml, 'p:txStyles')[0] || findBalancedElements(masterXml, 'p:extLst')[0]
        if (anchor) {
          masterXml = masterXml.slice(0, anchor.start) + listXml + masterXml.slice(anchor.start)
        } else {
          masterXml = masterXml.replace(/<\/p:sldMaster>/, listXml + '</p:sldMaster>')
        }
      }
    }
    return {
      index: m.index,
      name: m.name,
      xml: masterXml,
      relsXml: buildRelationshipsXml(m.rels),
    }
  })

  const contentRole = roles.content
  const yieldLogo = Boolean(contentRole.hasLogo || roles.cover.hasLogo)
  const yieldFooter = Boolean(contentRole.hasFooter)
  const yieldSlideNumber = Boolean(contentRole.hasSlideNumber)

  const templateMaster = {
    enabled: true,
    mode,
    sourceFile,
    sourceSlideSize: {
      widthIn: Number((srcW / EMU_PER_IN).toFixed(2)),
      heightIn: Number((srcH / EMU_PER_IN).toFixed(2)),
      aspectRatio: Number((srcW / Math.max(1, srcH)).toFixed(3)),
    },
    adaptedAspect,
    safeInsets: { ...contentRole.safeInsets },
    yieldChrome: true,
    yieldLogo,
    yieldFooter,
    yieldSlideNumber,
    roles,
    nativePackage: {
      masters: finalNativeMasters,
      layouts: nativeLayouts,
      themes: nativeThemes,
      media: nativeMediaList,
      roleLayoutIndex,
    },
    ...(warnings.length > 0 ? { warnings } : {}),
  }

  return {
    templateMaster,
    templateMasterAssets,
    warnings,
  }
}

// ---------------------------------------------------------------------------
// 规范化、校验与资产引用收集（防止 undo / save 丢失母版资产，拦截非法路径）
// ---------------------------------------------------------------------------

function clampInset(v, minVal, maxVal, fallback) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Number(Math.max(minVal, Math.min(maxVal, n)).toFixed(3))
}

function normalizeSafeInsets(raw, fallback = DEFAULT_MARGINS_IN) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    top: clampInset(src.top, 0.20, 1.85, fallback.top),
    right: clampInset(src.right, 0.30, 2.20, fallback.right),
    bottom: clampInset(src.bottom, 0.25, 1.35, fallback.bottom),
    left: clampInset(src.left, 0.30, 2.20, fallback.left),
  }
}

export function normalizeTemplateMaster(raw, assets = null) {
  if (raw === undefined || raw === null) return undefined
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('dsh-ppt：brand.templateMaster 必须是对象')
  }
  const enabled = raw.enabled !== false
  const rawMode = String(raw.mode || 'native-master').trim().toLowerCase()
  const mode = TEMPLATE_MASTER_MODES.includes(rawMode) ? rawMode : 'native-master'
  const rawNormSource = basename(String(raw.sourceFile || 'corporate-template.pptx').replace(/[\\/]+/g, '/')).slice(0, 120)
  const sourceFile = (rawNormSource && !/^\.absorb-[0-9a-f-]+\.pptx$/i.test(rawNormSource)) ? rawNormSource : 'corporate-template.pptx'
  const safeInsets = normalizeSafeInsets(raw.safeInsets)

  const rawRoles = raw.roles && typeof raw.roles === 'object' ? raw.roles : {}
  const roles = {}
  for (const role of TEMPLATE_MASTER_ROLES) {
    const r = rawRoles[role] && typeof rawRoles[role] === 'object' ? rawRoles[role] : (rawRoles.content || {})
    const bgColor = normalizeHex(r.bgColor, '#FFFFFF')
    const avgLuminance = Number.isFinite(Number(r.avgLuminance))
      ? Number(Math.max(0, Math.min(1, Number(r.avgLuminance))).toFixed(4))
      : Number(relativeLuminance(bgColor).toFixed(4))
    const dark = typeof r.dark === 'boolean' ? r.dark : avgLuminance < 0.36
    const bgAssetId = typeof r.bgAssetId === 'string' && /^img-[a-f0-9]{64}$/.test(r.bgAssetId)
      ? r.bgAssetId
      : undefined
    if (bgAssetId && assets && !assets[bgAssetId]) {
      throw new Error(`dsh-ppt：企业母版角色 ${role} 引用的背景资产不存在：${bgAssetId}`)
    }
    const svgPreview = typeof r.svgPreview === 'string' ? sanitizeMasterSvg(r.svgPreview) : ''
    const svgAssetIds = Array.isArray(r.svgAssetIds)
      ? [...new Set(r.svgAssetIds.filter((id) => typeof id === 'string' && /^img-[a-f0-9]{64}$/.test(id)))]
      : []
    if (assets) {
      for (const id of svgAssetIds) {
        if (!assets[id]) throw new Error(`dsh-ppt：企业母版角色 ${role} 引用的图形资产不存在：${id}`)
      }
    }
    const overlayShapes = Array.isArray(r.overlayShapes)
      ? r.overlayShapes.filter((sh) => sh && typeof sh === 'object' && sh.box && (!sh.assetId || !assets || Boolean(assets[sh.assetId]))).slice(0, 40)
      : []
    const bgGradient = (r.bgGradient && typeof r.bgGradient === 'object' && Array.isArray(r.bgGradient.stops) && r.bgGradient.stops.length >= 2)
      ? {
          angle: Number.isFinite(Number(r.bgGradient.angle)) ? Number(r.bgGradient.angle) : 0,
          stops: r.bgGradient.stops.slice(0, 6).map((st) => {
            const rawPos = Number(st?.pos)
            const normPos = Number.isFinite(rawPos)
              ? Math.max(0, Math.min(1, rawPos > 1 && rawPos <= 100 ? rawPos / 100 : rawPos))
              : 0
            return {
              pos: Number(normPos.toFixed(4)),
              color: normalizeHex(st?.color, bgColor),
              ...(Number.isFinite(Number(st?.alpha)) && Number(st.alpha) < 0.999 ? { alpha: Math.max(0, Math.min(1, Number(st.alpha))) } : {}),
            }
          }),
        }
      : undefined
    roles[role] = {
      role,
      layoutName: String(r.layoutName || role).slice(0, 80),
      layoutIndex: Number.isInteger(r.layoutIndex) && r.layoutIndex >= 1 ? r.layoutIndex : 1,
      bgColor,
      ...(bgGradient ? { bgGradient } : {}),
      dark,
      avgLuminance,
      needsScrim: Boolean(r.needsScrim),
      ...(bgAssetId ? { bgAssetId } : {}),
      ...(svgPreview ? { svgPreview } : {}),
      ...(svgAssetIds.length > 0 ? { svgAssetIds } : {}),
      safeInsets: normalizeSafeInsets(r.safeInsets, safeInsets),
      hasLogo: Boolean(r.hasLogo),
      hasFooter: Boolean(r.hasFooter),
      hasSlideNumber: Boolean(r.hasSlideNumber),
      ...(r.promotedFromSlide ? { promotedFromSlide: true } : {}),
      ...(overlayShapes.length > 0 ? { overlayShapes } : {}),
    }
  }

  let nativePackage
  if (raw.nativePackage && typeof raw.nativePackage === 'object' && !Array.isArray(raw.nativePackage)) {
    const np = raw.nativePackage
    const masters = Array.isArray(np.masters)
      ? np.masters
          .filter((m) => m && typeof m.xml === 'string' && typeof m.relsXml === 'string' && Number.isInteger(m.index) && m.index >= 1)
          .slice(0, 8)
          .map((m) => ({ index: m.index, name: String(m.name || `slideMaster${m.index}`).slice(0, 64), xml: m.xml, relsXml: m.relsXml }))
      : []
    const layouts = Array.isArray(np.layouts)
      ? np.layouts
          .filter((l) => l && typeof l.xml === 'string' && typeof l.relsXml === 'string' && Number.isInteger(l.index) && l.index >= 1)
          .slice(0, 16)
          .map((l) => ({
            index: l.index,
            masterIndex: Number.isInteger(l.masterIndex) && l.masterIndex >= 1 ? l.masterIndex : 1,
            role: TEMPLATE_MASTER_ROLES.includes(l.role) ? l.role : 'content',
            name: String(l.name || `slideLayout${l.index}`).slice(0, 80),
            type: String(l.type || 'blank').slice(0, 32),
            xml: l.xml,
            relsXml: l.relsXml,
          }))
      : []
    const themes = Array.isArray(np.themes)
      ? np.themes
          .filter((t) => t && typeof t.xml === 'string' && Number.isInteger(t.index) && t.index >= 1)
          .slice(0, 8)
          .map((t) => ({ index: t.index, xml: t.xml, ...(typeof t.relsXml === 'string' ? { relsXml: t.relsXml } : {}) }))
      : []
    const media = Array.isArray(np.media)
      ? np.media
          .filter((m) => m && typeof m.targetName === 'string' && /^[a-z0-9_.-]+$/i.test(m.targetName) && (m.assetId || m.dataBase64))
          .slice(0, 64)
          .map((m) => {
            if (m.assetId && assets && !assets[m.assetId]) {
              throw new Error(`dsh-ppt：企业母版原生媒体资产不存在：${m.assetId}`)
            }
            return {
              targetName: m.targetName,
              ext: String(m.ext || extname(m.targetName).slice(1)).toLowerCase(),
              mime: String(m.mime || MEDIA_MIME_BY_EXT[String(m.ext || '').toLowerCase()] || 'application/octet-stream'),
              ...(m.assetId ? { assetId: m.assetId } : { dataBase64: String(m.dataBase64) }),
              sha256: String(m.sha256 || ''),
            }
          })
      : []
    const rli = np.roleLayoutIndex && typeof np.roleLayoutIndex === 'object' ? np.roleLayoutIndex : {}
    if (masters.length > 0 && layouts.length > 0 && themes.length > 0) {
      nativePackage = {
        masters,
        layouts,
        themes,
        media,
        roleLayoutIndex: {
          cover: Number.isInteger(rli.cover) ? rli.cover : layouts[0].index,
          section: Number.isInteger(rli.section) ? rli.section : layouts[0].index,
          content: Number.isInteger(rli.content) ? rli.content : layouts[0].index,
          closing: Number.isInteger(rli.closing) ? rli.closing : layouts[0].index,
        },
      }
    }
  }

  return {
    enabled,
    mode: mode === 'native-master' && !nativePackage ? 'overlay' : mode,
    sourceFile,
    ...(raw.sourceSlideSize && typeof raw.sourceSlideSize === 'object' ? {
      sourceSlideSize: {
        widthIn: Number(raw.sourceSlideSize.widthIn) || 13.33,
        heightIn: Number(raw.sourceSlideSize.heightIn) || 7.5,
        aspectRatio: Number(raw.sourceSlideSize.aspectRatio) || 1.778,
      },
    } : {}),
    adaptedAspect: Boolean(raw.adaptedAspect),
    safeInsets,
    yieldChrome: raw.yieldChrome !== false,
    yieldLogo: Boolean(raw.yieldLogo),
    yieldFooter: Boolean(raw.yieldFooter),
    yieldSlideNumber: Boolean(raw.yieldSlideNumber),
    roles,
    ...(nativePackage ? { nativePackage } : {}),
    ...(Array.isArray(raw.warnings) && raw.warnings.length > 0 ? { warnings: raw.warnings.map((w) => String(w).slice(0, 240)).slice(0, 12) } : {}),
  }
}

export function collectTemplateMasterAssetIds(templateMaster, targetSet = new Set()) {
  if (!templateMaster || typeof templateMaster !== 'object') return targetSet
  if (templateMaster.roles && typeof templateMaster.roles === 'object') {
    for (const role of TEMPLATE_MASTER_ROLES) {
      const r = templateMaster.roles[role]
      if (!r || typeof r !== 'object') continue
      if (r.bgAssetId) targetSet.add(r.bgAssetId)
      if (Array.isArray(r.svgAssetIds)) {
        for (const id of r.svgAssetIds) if (id) targetSet.add(id)
      }
      if (Array.isArray(r.overlayShapes)) {
        for (const sh of r.overlayShapes) if (sh?.assetId) targetSet.add(sh.assetId)
      }
    }
  }
  if (Array.isArray(templateMaster.nativePackage?.media)) {
    for (const m of templateMaster.nativePackage.media) {
      if (m?.assetId) targetSet.add(m.assetId)
    }
  }
  return targetSet
}

// ---------------------------------------------------------------------------
// 单页母版解析、角色极性对比度适配 & 安全留白区全局坐标重映射
// ---------------------------------------------------------------------------

export function mapSlideLayoutToMasterRole(layout) {
  const lay = String(layout || 'bullets').toLowerCase()
  if (lay === 'cover') return 'cover'
  if (lay === 'section') return 'section'
  if (lay === 'closing') return 'closing'
  return 'content'
}

/**
 * 解析当前页面是否处于企业模板母版激活状态及其角色配置、冲突避让标记与安全留白区。
 * 未开启时返回 `null`（零开销、零影响）。
 */
export function resolveTemplateMasterForSlide(manifest, slide) {
  const tm = manifest?.brand?.templateMaster
  if (!tm || tm.enabled !== true) return null
  const role = mapSlideLayoutToMasterRole(slide?.layout)
  const roleSpec = tm.roles?.[role] || tm.roles?.content || null
  if (!roleSpec) return null
  const isNative = tm.mode === 'native-master' && Boolean(tm.nativePackage?.layouts?.length)
  return {
    enabled: true,
    mode: isNative ? 'native-master' : 'overlay',
    isNative,
    role,
    roleSpec,
    safeInsets: roleSpec.safeInsets || tm.safeInsets || DEFAULT_MARGINS_IN,
    yieldChrome: tm.yieldChrome !== false,
    yieldLogo: Boolean(tm.yieldLogo || roleSpec.hasLogo),
    yieldFooter: Boolean(tm.yieldFooter || roleSpec.hasFooter),
    yieldSlideNumber: Boolean(isNative && roleSpec.hasSlideNumber),
  }
}

function ensureAccessibleAccent(accentHex, bgHex, isDarkBg) {
  const base = normalizeHex(accentHex, isDarkBg ? '#60A5FA' : '#1D4ED8')
  if (contrastRatio(base, bgHex) >= 4.5) return base
  const target = isDarkBg ? '#F8FAFC' : '#0F172A'
  for (let w = 0.15; w <= 0.85; w += 0.1) {
    const candidate = mixHex(base, target, w)
    if (contrastRatio(candidate, bgHex) >= 4.5) return candidate
  }
  return target
}

/**
 * 根据企业模板当前角色母版的明暗极性，自动推导本页的高对比度安全主题 tokens（如深色封面配浅字、浅色内容页配深字）。
 */
export function adaptThemeForMasterSurface(baseTheme, roleSpec) {
  if (!baseTheme || !roleSpec) return baseTheme
  const rawBg = normalizeHex(roleSpec.bgColor, baseTheme.tokens?.canvas || '#FFFFFF')
  const isDark = Boolean(roleSpec.dark)
  // When needsScrim is active, all slide text sits atop the frosted reading scrim (light #F8FAFC / dark #0A1120),
  // NOT on raw mid-gray average photo pixels. Similarly guard mid-tone boundary backgrounds against ensureContrast polarity inversion.
  const bg = roleSpec.needsScrim
    ? (isDark ? '#0A1120' : '#F8FAFC')
    : (!isDark && relativeLuminance(rawBg) < 0.45)
      ? '#F8FAFC'
      : (isDark && relativeLuminance(rawBg) > 0.35)
        ? '#0F172A'
        : rawBg
  const baseTk = baseTheme.tokens || {}
  const baseCanvas = normalizeHex(baseTk.canvas || baseTheme.palette?.bg, '#FFFFFF')
  const baseAccent = normalizeHex(baseTk.accentPrimary || baseTheme.palette?.accent, '#1D4ED8')
  const baseAccent2 = normalizeHex(baseTk.accentSecondary || baseTheme.palette?.accent2, baseAccent)
  const needsPolarityFlip = isDark !== Boolean(baseTheme.dark)
  const existingPrimaryCR = contrastRatio(baseTk.inkPrimary || baseTheme.palette?.fg || '#0F172A', bg)
  const existingSecondaryCR = contrastRatio(baseTk.inkSecondary || baseTk.inkPrimary || '#334155', bg)
  const existingMutedCR = contrastRatio(baseTk.inkMuted || baseTheme.palette?.muted || '#64748B', bg)
  const sameSurface = Math.abs(relativeLuminance(baseCanvas) - relativeLuminance(bg)) < 0.04 &&
    baseCanvas.toUpperCase() === bg.toUpperCase()

  if (
    !needsPolarityFlip &&
    !roleSpec.needsScrim &&
    sameSurface &&
    existingPrimaryCR >= 10.5 &&
    existingSecondaryCR >= 6.5 &&
    existingMutedCR >= 4.6
  ) {
    const accentText = ensureAccessibleAccent(baseTk.accentText || baseAccent, bg, isDark)
    return {
      ...baseTheme,
      dark: isDark,
      palette: { ...baseTheme.palette, bg },
      tokens: {
        ...baseTk,
        canvas: bg,
        accentText,
      },
    }
  }

  const inkPrimary = isDark ? '#F8FAFC' : '#0F172A'
  const inkSecondary = ensureContrast(isDark ? '#CBD5E1' : '#334155', bg, 6.5, 0.25)
  const inkMuted = ensureContrast(isDark ? '#94A3B8' : '#475569', bg, 4.8, 0.25)
  const surface1 = isDark
    ? mixHex(bg, '#FFFFFF', roleSpec.needsScrim ? 0.14 : 0.09)
    : (roleSpec.needsScrim ? '#FFFFFF' : mixHex(bg, '#0F172A', 0.035))
  const surface2 = isDark
    ? mixHex(bg, '#FFFFFF', roleSpec.needsScrim ? 0.21 : 0.15)
    : mixHex(bg, '#0F172A', 0.075)
  const hairline = isDark ? mixHex(bg, '#FFFFFF', 0.24) : mixHex(bg, '#0F172A', 0.16)
  const accentPrimary = ensureContrast(baseAccent, bg, 3.6, 0.82)
  const accentSecondary = ensureContrast(baseAccent2, bg, 3.2, 0.82)
  const accentText = ensureAccessibleAccent(baseAccent, bg, isDark)
  const accent2Text = ensureAccessibleAccent(baseAccent2, bg, isDark)
  const accentSoft = isDark ? mixHex(bg, accentPrimary, 0.25) : mixHex(bg, accentPrimary, 0.10)
  const inkOnAccent = bestContrastInk(accentPrimary)
  const positive = ensureContrast(isDark ? '#34D399' : '#047857', surface2, 4.6, 0.82)
  const negative = ensureContrast(isDark ? '#F87171' : '#B91C1C', surface2, 4.6, 0.82)
  const warning = ensureContrast(isDark ? '#FBBF24' : '#B45309', surface2, 4.6, 0.82)
  const chartNeutral = isDark ? mixHex(bg, '#FFFFFF', 0.28) : mixHex(bg, '#0F172A', 0.22)
  const baseSeries = Array.isArray(baseTk.chartSeries) && baseTk.chartSeries.length > 0
    ? baseTk.chartSeries
    : [accentPrimary, accentSecondary, positive, '#7C3AED', warning, '#64748B']
  const chartSeries = baseSeries.map((c) => ensureContrast(c, bg, 3.0, 0.82))

  return {
    ...baseTheme,
    dark: isDark,
    palette: {
      ...baseTheme.palette,
      bg,
      panel: surface1,
      fg: inkPrimary,
      muted: inkMuted,
      accent: accentPrimary,
      accent2: accentSecondary,
    },
    tokens: {
      ...baseTk,
      canvas: bg,
      surface1,
      surface2,
      hairline,
      inkPrimary,
      inkSecondary,
      inkMuted,
      inkOnAccent,
      inkOnAccent2: bestContrastInk(accentSecondary),
      inkOnPositive: bestContrastInk(positive),
      inkOnNegative: bestContrastInk(negative),
      inkOnWarning: bestContrastInk(warning),
      accentPrimary,
      accentSecondary,
      accentText,
      accent2Text,
      accentSoft,
      positive,
      negative,
      warning,
      chartFocal: accentPrimary,
      chartNeutral,
      chartSeries,
      coverMode: 'standard',
      coverBg: bg,
    },
  }
}

export function roleThemeCssVarsInline(roleTheme, roleSpec) {
  if (!roleTheme?.tokens) return ''
  const tk = roleTheme.tokens
  const vars = [
    `--bg:${tk.canvas}`,
    `--panel:${tk.surface1}`,
    `--fg:${tk.inkPrimary}`,
    `--muted:${tk.inkMuted}`,
    `--ink-secondary:${tk.inkSecondary}`,
    `--surface1:${tk.surface1}`,
    `--surface2:${tk.surface2}`,
    `--hairline:${tk.hairline}`,
    `--accent:${tk.accentPrimary}`,
    `--accent2:${tk.accentSecondary || tk.accentPrimary}`,
    `--accent-text:${tk.accentText}`,
    `--accent-soft:${tk.accentSoft}`,
    `--ink-on-accent:${tk.inkOnAccent || '#FFFFFF'}`,
    `--ink-on-accent2:${tk.inkOnAccent2 || '#FFFFFF'}`,
    `--ink-on-positive:${tk.inkOnPositive || '#FFFFFF'}`,
    `--ink-on-negative:${tk.inkOnNegative || '#FFFFFF'}`,
    `--ink-on-warning:${tk.inkOnWarning || '#0F172A'}`,
    `--positive:${tk.positive}`,
    `--negative:${tk.negative}`,
    `--warning:${tk.warning}`,
    `--cover-bg:${tk.canvas}`,
  ]
  if (roleSpec?.needsScrim) {
    const s = normalizeSafeInsets(roleSpec.safeInsets)
    const padX = 0.16
    const padY = 0.16
    const tPct = Math.max(0, ((s.top - padY) / CANVAS_IN.h) * 100).toFixed(2)
    const bPct = Math.max(0, ((s.bottom - padY) / CANVAS_IN.h) * 100).toFixed(2)
    const lPct = Math.max(0, ((s.left - padX) / CANVAS_IN.w) * 100).toFixed(2)
    const rPct = Math.max(0, ((s.right - padX) / CANVAS_IN.w) * 100).toFixed(2)
    vars.push(
      `--tm-scrim:${roleSpec.dark ? 'rgba(6,11,22,0.78)' : 'rgba(255,255,255,0.88)'}`,
      `--tm-scrim-t:${tPct}%`,
      `--tm-scrim-r:${rPct}%`,
      `--tm-scrim-b:${bPct}%`,
      `--tm-scrim-l:${lPct}%`,
    )
  }
  return vars.join(';')
}

/**
 * 计算全局 safeInsets 仿射映射变换。当企业模板边距与 dsh-ppt 默认边距无冲突时返回 `active: false`（零变换）。
 */
export function computeSafeZoneTransform(safeInsets) {
  const s = normalizeSafeInsets(safeInsets)
  const extraTop = Math.max(0, s.top - DEFAULT_MARGINS_IN.top)
  const extraBottom = Math.max(0, s.bottom - DEFAULT_MARGINS_IN.bottom)
  const extraLeft = Math.max(0, s.left - DEFAULT_MARGINS_IN.left)
  const extraRight = Math.max(0, s.right - DEFAULT_MARGINS_IN.right)

  if (extraTop < 0.04 && extraBottom < 0.04 && extraLeft < 0.04 && extraRight < 0.04) {
    return { active: false, scaleX: 1, scaleY: 1, minScale: 1, safeInsets: s }
  }

  const srcLeft = DEFAULT_MARGINS_IN.left
  const srcTop = DEFAULT_MARGINS_IN.top
  const srcW = CANVAS_IN.w - DEFAULT_MARGINS_IN.left - DEFAULT_MARGINS_IN.right
  const srcH = CANVAS_IN.h - DEFAULT_MARGINS_IN.top - DEFAULT_MARGINS_IN.bottom

  const dstLeft = s.left
  const dstTop = s.top
  const dstW = Math.max(6.0, CANVAS_IN.w - s.left - s.right)
  const dstH = Math.max(3.6, CANVAS_IN.h - s.top - s.bottom)

  const scaleX = dstW / srcW
  const scaleY = dstH / srcH
  return {
    active: true,
    srcLeft,
    srcTop,
    dstLeft,
    dstTop,
    scaleX,
    scaleY,
    minScale: Math.min(scaleX, scaleY),
    safeInsets: s,
  }
}

export function mapBoxToSafeZone(boxIn, safeInsets) {
  const tr = computeSafeZoneTransform(safeInsets)
  if (!tr.active || !boxIn) return boxIn
  const isFullBleed = boxIn.x <= 0.05 && boxIn.y <= 0.05 && boxIn.w >= CANVAS_IN.w - 0.1 && boxIn.h >= CANVAS_IN.h - 0.1
  if (isFullBleed) return boxIn
  return {
    x: Number((tr.dstLeft + (boxIn.x - tr.srcLeft) * tr.scaleX).toFixed(4)),
    y: Number((tr.dstTop + (boxIn.y - tr.srcTop) * tr.scaleY).toFixed(4)),
    w: Number(Math.max(0.05, boxIn.w * tr.scaleX).toFixed(4)),
    h: Number(Math.max(0.05, boxIn.h * tr.scaleY).toFixed(4)),
  }
}

/**
 * 将单页所有 DrawingML 形状（`<p:sp>` / `<p:cxnSp>` / `<p:graphicFrame>`）线性映射到企业模板的 `safeInsets` 安全区内，
 * 保持正圆/图标等比不畸变，并在压缩比 < 0.92 时微调字号避免文本框溢出。
 */
export function remapShapesXmlToSafeZone(shapesXml, safeInsets) {
  const tr = computeSafeZoneTransform(safeInsets)
  if (!tr.active || !shapesXml) return shapesXml

  const srcLeftEmu = tr.srcLeft * EMU_PER_IN
  const srcTopEmu = tr.srcTop * EMU_PER_IN
  const dstLeftEmu = tr.dstLeft * EMU_PER_IN
  const dstTopEmu = tr.dstTop * EMU_PER_IN

  const mapEmuX = (x) => Math.round(dstLeftEmu + (x - srcLeftEmu) * tr.scaleX)
  const mapEmuY = (y) => Math.round(dstTopEmu + (y - srcTopEmu) * tr.scaleY)

  const tags = ['p:sp', 'p:cxnSp', 'p:graphicFrame']
  const elements = []
  for (const tag of tags) {
    for (const el of findBalancedElements(shapesXml, tag)) {
      elements.push({ ...el, tag })
    }
  }
  elements.sort((a, b) => a.start - b.start)

  const fontScaleFactor = tr.minScale < 0.92 ? Math.max(0.84, tr.minScale) : 1

  let out = ''
  let cursor = 0
  for (const el of elements) {
    if (el.start < cursor) continue
    out += shapesXml.slice(cursor, el.start)
    let chunk = el.outerXml

    const xfrmTag = el.tag === 'p:graphicFrame' ? 'p:xfrm' : 'a:xfrm'
    const xfrm = findBalancedElements(chunk, xfrmTag)[0]
    if (xfrm) {
      const off = /<a:off\b([^>]*)\/?>/.exec(xfrm.innerXml)
      const ext = /<a:ext\b([^>]*)\/?>/.exec(xfrm.innerXml)
      if (off && ext) {
        const x = Number(getXmlAttr(off[1], 'x'))
        const y = Number(getXmlAttr(off[1], 'y'))
        const w = Number(getXmlAttr(ext[1], 'cx'))
        const h = Number(getXmlAttr(ext[1], 'cy'))
        const isFullBleed = x <= 50000 && y <= 50000 && w >= EMU_W - 100000 && h >= EMU_H - 100000
        if (!isFullBleed && [x, y, w, h].every(Number.isFinite)) {
          const isCircleOrSquare =
            (/<a:prstGeom\b[^>]*\bprst=["'](?:ellipse|oval)["']/.test(chunk) ||
              (w > 0 && h > 0 && Math.abs(w - h) / Math.max(w, h) < 0.05 && w < 2.2 * EMU_PER_IN))
          let nx
          let ny
          let nw
          let nh
          if (isCircleOrSquare) {
            const cx = mapEmuX(x + w / 2)
            const cy = mapEmuY(y + h / 2)
            nw = Math.max(0, Math.round(w * tr.minScale))
            nh = Math.max(0, Math.round(h * tr.minScale))
            nx = Math.round(cx - nw / 2)
            ny = Math.round(cy - nh / 2)
          } else {
            nx = mapEmuX(x)
            ny = mapEmuY(y)
            nw = Math.max(0, Math.round(w * tr.scaleX))
            nh = Math.max(0, Math.round(h * tr.scaleY))
          }
          let updatedXfrm = xfrm.outerXml
          updatedXfrm = updatedXfrm.replace(/<a:off\b[^>]*\/>/, `<a:off x="${Math.max(0, nx)}" y="${Math.max(0, ny)}"/>`)
          updatedXfrm = updatedXfrm.replace(/<a:ext\b[^>]*\/>/, `<a:ext cx="${nw}" cy="${nh}"/>`)
          chunk = chunk.slice(0, xfrm.start) + updatedXfrm + chunk.slice(xfrm.end)
        }
      }
    }

    // Scale <a:gridCol w="..."/> inside native tables proportionally
    if (el.tag === 'p:graphicFrame' && Math.abs(tr.scaleX - 1) > 0.01) {
      chunk = chunk.replace(/<a:gridCol\b([^>]*)\bw=["'](\d+)["']([^>]*)\/>/g, (_, a, wStr, b) =>
        `<a:gridCol${a}w="${Math.max(100000, Math.round(Number(wStr) * tr.scaleX))}"${b}/>`,
      )
    }

    // Gentle font scaling when corporate safe zone substantially narrows usable area
    if (fontScaleFactor < 0.999) {
      chunk = chunk.replace(/(<a:rPr\b[^>]*\bsz=["'])(\d+)(["'])/g, (_, pre, szStr, post) => {
        const cur = Number(szStr)
        const next = Math.max(950, Math.round((cur * fontScaleFactor) / 50) * 50)
        return pre + next + post
      })
    }

    out += chunk
    cursor = el.end
  }
  out += shapesXml.slice(cursor)
  return out
}

// ---------------------------------------------------------------------------
// HTML 同构母版层渲染器 & CSS
// ---------------------------------------------------------------------------

export function renderMasterLayerHtml(tmSlide, assets = {}, slideIndex = 0) {
  if (!tmSlide?.enabled || !tmSlide.roleSpec) return ''
  const role = tmSlide.roleSpec
  let inner = ''
  if (role.svgPreview) {
    // Scope SVG gradient IDs per slide so hidden (display:none) sibling slides never shadow active url(#...) paint servers in Chrome/Safari
    const prefix = `tm_s${Number.isInteger(slideIndex) ? slideIndex : 0}_`
    inner = hydrateMasterSvg(role.svgPreview, assets)
      .replace(/\bid="tm_(g\d+)"/g, `id="${prefix}$1"`)
      .replace(/url\(#tm_(g\d+)\)/g, `url(#${prefix}$1)`)
  } else if (role.bgAssetId && assets?.[role.bgAssetId]?.data) {
    inner = `<img class="corp-master-bg" src="${escapeHtml(assets[role.bgAssetId].data)}" alt=""/>`
  } else {
    inner = `<div class="corp-master-solid" style="background:${escapeHtml(role.bgColor || '#FFFFFF')}"></div>`
  }
  const scrim = role.needsScrim ? '<div class="corp-master-scrim" aria-hidden="true"></div>' : ''
  return `<div class="corp-master-layer" data-master-role="${escapeHtml(tmSlide.role)}" aria-hidden="true">${inner}${scrim}</div>`
}

export function safeInsetsHtmlPaddingStyle(safeInsets, isMediaSlide = false) {
  const tr = computeSafeZoneTransform(safeInsets)
  if (!tr.active) return ''
  const s = tr.safeInsets
  if (isMediaSlide) return ''
  // CSS % padding-top/bottom resolves against containing WIDTH (1.78x oversized on 16:9!).
  // Use vh for full-viewport slides and exact 1280x720 px for is-scaled-stage / overview modes.
  const topVh = (s.top / CANVAS_IN.h * 100).toFixed(2)
  const bottomVh = (s.bottom / CANVAS_IN.h * 100).toFixed(2)
  const leftPct = (s.left / CANVAS_IN.w * 100).toFixed(2)
  const rightPct = (s.right / CANVAS_IN.w * 100).toFixed(2)
  const topPx = (s.top / CANVAS_IN.h * 720).toFixed(1)
  const bottomPx = (s.bottom / CANVAS_IN.h * 720).toFixed(1)
  const leftPx = (s.left / CANVAS_IN.w * 1280).toFixed(1)
  const rightPx = (s.right / CANVAS_IN.w * 1280).toFixed(1)
  return `--tm-pad-t-vh:${topVh}vh;--tm-pad-r-pct:${rightPct}%;--tm-pad-b-vh:${bottomVh}vh;--tm-pad-l-pct:${leftPct}%;--tm-pad-t-px:${topPx}px;--tm-pad-r-px:${rightPx}px;--tm-pad-b-px:${bottomPx}px;--tm-pad-l-px:${leftPx}px`
}

export const TEMPLATE_MASTER_CSS = `
.slide.has-template-master{background:transparent !important;color:var(--fg)}
.slide.has-template-master::before{display:none !important}
.slide.has-template-master > .slide-inner{position:relative;z-index:2;color:var(--fg)}
.slide.has-template-master.has-tm-insets{padding:var(--tm-pad-t-vh) var(--tm-pad-r-pct) var(--tm-pad-b-vh) var(--tm-pad-l-pct)}
body.is-scaled-stage:not(.overview) .slide.has-template-master.has-tm-insets,
body.overview .slide.has-template-master.has-tm-insets{padding:var(--tm-pad-t-px) var(--tm-pad-r-px) var(--tm-pad-b-px) var(--tm-pad-l-px)}
.corp-master-layer{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.corp-master-svg,.corp-master-bg,.corp-master-solid{width:100%;height:100%;display:block;object-fit:cover}
.corp-master-scrim{position:absolute;top:var(--tm-scrim-t,8%);right:var(--tm-scrim-r,4%);bottom:var(--tm-scrim-b,8%);left:var(--tm-scrim-l,4%);border-radius:14px;background:var(--tm-scrim,rgba(255,255,255,.84));pointer-events:none}
.slide.has-template-master.tm-yield-chrome .cover-shell.is-inverted,
.slide.has-template-master.tm-yield-chrome .closing-shell.is-inverted{background:transparent !important;color:var(--fg)}
.slide.has-template-master.tm-yield-chrome .cover-shell::before,
.slide.has-template-master.tm-yield-chrome .cover-shell::after,
.slide.has-template-master.tm-yield-chrome .poster-cover-glow,
.slide.has-template-master.tm-yield-chrome .poster-cover-grid,
.slide.has-template-master.tm-yield-chrome .poster-cover-arch-panel,
.slide.has-template-master.tm-yield-chrome .cover-pattern-svg{display:none !important}
.slide.has-template-master.tm-yield-chrome[data-chrome="academic-minimal"] .beamer-header-band,
.slide.has-template-master.tm-yield-chrome[data-chrome="academic-minimal"] .media-beamer-band{position:static !important;background:transparent !important;border-bottom:1px solid var(--hairline) !important;padding:0 0 10px 0 !important}
.slide.has-template-master.tm-yield-chrome[data-chrome="academic-minimal"] .beamer-status-bar,
.slide.has-template-master.tm-yield-chrome[data-chrome="academic-minimal"] .media-beamer-status{background:transparent !important;border-top-color:var(--hairline) !important}
.slide.has-template-master.tm-yield-chrome[data-chrome="academic-minimal"]:not(.has-tm-insets):not(.slide--cover):not(.slide--closing):not(.slide--section){padding-top:clamp(30px,4.6vw,68px);padding-bottom:clamp(30px,4.6vw,68px)}
.slide.has-template-master.tm-yield-chrome .slide-takeaway{backdrop-filter:blur(4px)}
`

// ---------------------------------------------------------------------------
// PPTX 装配支持：Plan B 原生母版包 + Plan A Overlay 去重底图与矢量图形
// ---------------------------------------------------------------------------

function dataUriToBuffer(dataUri) {
  if (typeof dataUri !== 'string') return null
  const idx = dataUri.indexOf(',')
  if (idx < 0) return null
  return Buffer.from(dataUri.slice(idx + 1), 'base64')
}

/**
 * 为 `deck-core.mjs` 的 `buildPptx()` 构造 Plan B 原生母版 ZIP 部件表、ContentTypes 扩展及角色布局路由。
 */
export function buildNativeMasterPptxSupport(templateMaster, assets = {}) {
  const np = templateMaster?.nativePackage
  if (!templateMaster?.enabled || templateMaster.mode !== 'native-master' || !np?.masters?.length || !np?.layouts?.length) {
    return null
  }

  const extraEntries = []
  const mediaExts = new Set()
  const masterOverrides = []
  const layoutOverrides = []
  const themeOverrides = []

  // Media parts (deduplicated once in ppt/media/corp_m_*)
  for (const m of np.media || []) {
    let bytes = null
    if (m.assetId && assets?.[m.assetId]?.data) {
      bytes = dataUriToBuffer(assets[m.assetId].data)
    } else if (m.dataBase64) {
      bytes = Buffer.from(m.dataBase64, 'base64')
    }
    if (!bytes) continue
    extraEntries.push({ name: `ppt/media/${m.targetName}`, data: bytes })
    const ext = String(m.ext || extname(m.targetName).slice(1)).toLowerCase()
    if (ext) mediaExts.add(ext)
  }

  // Themes
  for (const t of np.themes || []) {
    extraEntries.push({ name: `ppt/theme/theme${t.index}.xml`, data: t.xml })
    if (t.relsXml) extraEntries.push({ name: `ppt/theme/_rels/theme${t.index}.xml.rels`, data: t.relsXml })
    themeOverrides.push(`<Override PartName="/ppt/theme/theme${t.index}.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`)
  }

  // Masters
  const masterList = np.masters.map((m) => {
    extraEntries.push({ name: `ppt/slideMasters/slideMaster${m.index}.xml`, data: m.xml })
    extraEntries.push({ name: `ppt/slideMasters/_rels/slideMaster${m.index}.xml.rels`, data: m.relsXml })
    masterOverrides.push(`<Override PartName="/ppt/slideMasters/slideMaster${m.index}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>`)
    return { index: m.index }
  })

  // Layouts
  for (const l of np.layouts) {
    extraEntries.push({ name: `ppt/slideLayouts/slideLayout${l.index}.xml`, data: l.xml })
    extraEntries.push({ name: `ppt/slideLayouts/_rels/slideLayout${l.index}.xml.rels`, data: l.relsXml })
    layoutOverrides.push(`<Override PartName="/ppt/slideLayouts/slideLayout${l.index}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>`)
  }

  const defaultExtXml = [...mediaExts]
    .filter((ext) => MEDIA_MIME_BY_EXT[ext])
    .map((ext) => `<Default Extension="${ext}" ContentType="${MEDIA_MIME_BY_EXT[ext]}"/>`)
    .join('')

  const layoutIndexForSlide = (slide) => {
    const role = mapSlideLayoutToMasterRole(slide?.layout)
    return np.roleLayoutIndex?.[role] || np.layouts[0].index
  }

  return {
    extraEntries,
    masterList,
    defaultExtXml,
    overridesXml: masterOverrides.join('') + layoutOverrides.join('') + themeOverrides.join(''),
    layoutIndexForSlide,
  }
}

/**
 * 为 `deck-core.mjs` 的 `buildPptx()` 构造 Plan A (`overlay`) 共享去重底图与矢量母版图形支持。
 */
export function buildOverlayMasterPptxSupport(templateMaster, assets = {}) {
  if (!templateMaster?.enabled || templateMaster.mode !== 'overlay') return null
  const mediaEntries = []
  const mediaExts = new Set()
  const targetByAssetId = new Map()
  let seq = 0

  const ensureAssetMedia = (assetId) => {
    if (!assetId) return null
    if (targetByAssetId.has(assetId)) return targetByAssetId.get(assetId)
    const asset = assets?.[assetId]
    if (!asset?.data) return null
    const bytes = dataUriToBuffer(asset.data)
    if (!bytes) return null
    const ext = asset.mime === 'image/jpeg' ? 'jpg' : asset.mime === 'image/webp' ? 'webp' : 'png'
    seq += 1
    const targetName = `corp_ov_${seq}.${ext}`
    mediaEntries.push({ name: `ppt/media/${targetName}`, data: bytes })
    mediaExts.add(ext)
    targetByAssetId.set(assetId, targetName)
    return targetName
  }

  for (const role of TEMPLATE_MASTER_ROLES) {
    const r = templateMaster.roles?.[role]
    if (!r) continue
    if (r.bgAssetId) ensureAssetMedia(r.bgAssetId)
    for (const sh of r.overlayShapes || []) {
      if (sh?.kind === 'image' && sh.assetId) ensureAssetMedia(sh.assetId)
    }
  }

  const defaultExtXml = [...mediaExts]
    .filter((ext) => MEDIA_MIME_BY_EXT[ext])
    .map((ext) => `<Default Extension="${ext}" ContentType="${MEDIA_MIME_BY_EXT[ext]}"/>`)
    .join('')

  const compileSlideOverlay = (slide, slideIndex) => {
    const role = mapSlideLayoutToMasterRole(slide?.layout)
    const r = templateMaster.roles?.[role] || templateMaster.roles?.content
    if (!r) return { bgXml: '', backShapesXml: '', extraRels: [] }

    const extraRels = []
    let rIdCounter = 10
    const allocRel = (targetName) => {
      const id = `rId${rIdCounter++}`
      extraRels.push(`<Relationship Id="${id}" Type="${SAFE_REL_TYPES.IMAGE}" Target="../media/${targetName}"/>`)
      return id
    }

    const renderGradFillXml = (grad, fallbackColor) => {
      const ang = Math.round(((Number(grad.angle) || 0) % 360 + 360) % 360 * 60000)
      const gsXml = grad.stops
        .map((st) => {
          const rawPos = Number(st.pos)
          const normPos = Number.isFinite(rawPos) ? Math.max(0, Math.min(1, rawPos > 1 && rawPos <= 100 ? rawPos / 100 : rawPos)) : 0
          const pos = Math.round(normPos * 100000)
          const hex6 = escapeXml(normalizeHex(st.color, fallbackColor || '#FFFFFF').slice(1))
          const alphaTag = st.alpha !== undefined && st.alpha < 0.999 ? `<a:alpha val="${Math.round(st.alpha * 100000)}"/>` : ''
          return `<a:gs pos="${pos}"><a:srgbClr val="${hex6}">${alphaTag}</a:srgbClr></a:gs>`
        })
        .join('')
      return `<a:gradFill><a:gsLst>${gsXml}</a:gsLst><a:lin ang="${ang}" scaled="1"/></a:gradFill>`
    }

    let bgXml = ''
    const bgTarget = r.bgAssetId ? targetByAssetId.get(r.bgAssetId) : null
    if (bgTarget) {
      const bgRId = allocRel(bgTarget)
      bgXml = `<p:bg><p:bgPr><a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="${bgRId}"/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg>`
    } else if (r.bgGradient && Array.isArray(r.bgGradient.stops) && r.bgGradient.stops.length >= 2) {
      bgXml = `<p:bg><p:bgPr>${renderGradFillXml(r.bgGradient, r.bgColor)}<a:effectLst/></p:bgPr></p:bg>`
    } else {
      const hex6 = normalizeHex(r.bgColor, '#FFFFFF').slice(1)
      bgXml = `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${hex6}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`
    }

    const backShapes = []
    let spId = (slideIndex + 1) * 1000 + 500
    for (const sh of r.overlayShapes || []) {
      const b = sh.box
      if (!b) continue
      const rotAttr = Number.isFinite(sh.rot) && Math.abs(sh.rot) > 0.2
        ? ` rot="${Math.round(((sh.rot % 360) + 360) % 360 * 60000)}"`
        : ''
      if (sh.kind === 'image' && sh.assetId) {
        const tgt = targetByAssetId.get(sh.assetId)
        if (!tgt) continue
        const rId = allocRel(tgt)
        backShapes.push(
          `<p:pic><p:nvPicPr><p:cNvPr id="${spId++}" name="${escapeXml(sh.name || 'Corporate Master Graphic')}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>` +
          `<p:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
          `<p:spPr><a:xfrm${rotAttr}><a:off x="${Math.round(b.x)}" y="${Math.round(b.y)}"/><a:ext cx="${Math.max(1, Math.round(b.w))}" cy="${Math.max(1, Math.round(b.h))}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`,
        )
      } else if (sh.kind === 'line' && sh.stroke) {
        const wEmu = Math.max(6350, Math.round((sh.stroke.widthPx || 1) * 9525))
        const flipH = sh.flipH ? ' flipH="1"' : ''
        const flipV = sh.flipV ? ' flipV="1"' : ''
        backShapes.push(
          `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${spId++}" name="Corporate Master Line"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>` +
          `<p:spPr><a:xfrm${flipH}${flipV}><a:off x="${Math.round(b.x)}" y="${Math.round(b.y)}"/><a:ext cx="${Math.max(0, Math.round(b.w))}" cy="${Math.max(0, Math.round(b.h))}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom>` +
          `<a:ln w="${wEmu}"><a:solidFill><a:srgbClr val="${escapeXml(normalizeHex(sh.stroke.color, '#94A3B8').slice(1))}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>`,
        )
      } else if (sh.kind === 'shape') {
        const prst = ['rect', 'roundRect', 'ellipse', 'triangle', 'rtTriangle'].includes(sh.preset) ? sh.preset : 'rect'
        const fillXml = (sh.fillGradient && Array.isArray(sh.fillGradient.stops) && sh.fillGradient.stops.length >= 2)
          ? renderGradFillXml(sh.fillGradient, r.bgColor)
          : sh.fill?.color
            ? `<a:solidFill><a:srgbClr val="${escapeXml(normalizeHex(sh.fill.color, '#FFFFFF').slice(1))}">` +
              (sh.fill.alpha !== undefined && sh.fill.alpha < 0.999 ? `<a:alpha val="${Math.round(sh.fill.alpha * 100000)}"/>` : '') +
              `</a:srgbClr></a:solidFill>`
            : '<a:noFill/>'
        const lnXml = sh.stroke?.color
          ? `<a:ln w="${Math.max(6350, Math.round((sh.stroke.widthPx || 1) * 9525))}"><a:solidFill><a:srgbClr val="${escapeXml(normalizeHex(sh.stroke.color, '#CBD5E1').slice(1))}"/></a:solidFill></a:ln>`
          : '<a:ln><a:noFill/></a:ln>'
        const boldAttr = sh.textBold ? ' b="1"' : ''
        const lInsAttr = Number.isFinite(sh.lInsEmu) && sh.lInsEmu > 0 ? ` lIns="${Math.round(sh.lInsEmu)}"` : ''
        const rInsAttr = Number.isFinite(sh.rInsEmu) && sh.rInsEmu > 0 ? ` rIns="${Math.round(sh.rInsEmu)}"` : ''
        const paraXml = sh.text
          ? `<a:p><a:pPr algn="${['l', 'ctr', 'r'].includes(sh.textAlign) ? sh.textAlign : 'l'}"/><a:r><a:rPr lang="zh-CN" sz="${Math.round((sh.textSizePt || 10) * 100)}"${boldAttr} dirty="0"><a:solidFill><a:srgbClr val="${escapeXml(normalizeHex(sh.textColor, r.dark ? '#E2E8F0' : '#475569').slice(1))}"/></a:solidFill></a:rPr><a:t>${escapeXml(sh.text)}</a:t></a:r></a:p>`
          : '<a:p/>'
        backShapes.push(
          `<p:sp><p:nvSpPr><p:cNvPr id="${spId++}" name="Corporate Master Shape"/><p:cNvSpPr${sh.text && !sh.fill && !sh.fillGradient ? ' txBox="1"' : ''}/><p:nvPr/></p:nvSpPr>` +
          `<p:spPr><a:xfrm${rotAttr}><a:off x="${Math.round(b.x)}" y="${Math.round(b.y)}"/><a:ext cx="${Math.max(1, Math.round(b.w))}" cy="${Math.max(1, Math.round(b.h))}"/></a:xfrm><a:prstGeom prst="${prst}"><a:avLst/></a:prstGeom>${fillXml}${lnXml}</p:spPr>` +
          `<p:txBody><a:bodyPr anchor="ctr"${lInsAttr}${rInsAttr}/><a:lstStyle/>${paraXml}</p:txBody></p:sp>`,
        )
      }
    }

    return {
      bgXml,
      backShapesXml: backShapes.join(''),
      extraRels,
    }
  }

  return {
    extraEntries: mediaEntries,
    defaultExtXml,
    compileSlideOverlay,
  }
}

/**
 * 为高方差忙乱照片底图（`needsScrim: true`）在安全区内生成一层柔和的半透明护眼阅读衬底（PPTX 与 HTML 双端同构）。
 */
export function buildPptxScrimShapeXml(safeInsets, isDark, shapeId = 980) {
  const s = normalizeSafeInsets(safeInsets)
  const padX = 0.16
  const padY = 0.16
  const x = Math.max(0, Math.round((s.left - padX) * EMU_PER_IN))
  const y = Math.max(0, Math.round((s.top - padY) * EMU_PER_IN))
  const w = Math.max(EMU_PER_IN * 4, Math.min(EMU_W - x, Math.round((CANVAS_IN.w - s.left - s.right + padX * 2) * EMU_PER_IN)))
  const h = Math.max(EMU_PER_IN * 2.5, Math.min(EMU_H - y, Math.round((CANVAS_IN.h - s.top - s.bottom + padY * 2) * EMU_PER_IN)))
  const fillHex = isDark ? '060B16' : 'FFFFFF'
  const alphaVal = isDark ? 82000 : 88000
  const borderHex = isDark ? 'FFFFFF' : '0F172A'
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="${shapeId}" name="Corporate Master Reading Scrim"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>` +
    `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 2800"/></a:avLst></a:prstGeom>` +
    `<a:solidFill><a:srgbClr val="${fillHex}"><a:alpha val="${alphaVal}"/></a:srgbClr></a:solidFill>` +
    `<a:ln w="9525"><a:solidFill><a:srgbClr val="${borderHex}"><a:alpha val="12000"/></a:srgbClr></a:solidFill></a:ln></p:spPr>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`
  )
}

// ---------------------------------------------------------------------------
// 严格 OOXML 预检校验器（覆盖所有 theme/master/layout/.rels 良构性、命名空间、关系完整性与 spPr 序列）
// ---------------------------------------------------------------------------

function assertStrictWellFormedXml(xml, label, expectedRoot = '') {
  if (typeof xml !== 'string' || !xml.trim()) {
    throw new Error(`${label} 为空`)
  }
  const len = xml.length
  const stack = []
  const nsStack = [new Set(['xml', 'xmlns'])]
  let rootName = ''
  let rootClosed = false
  let i = 0

  const hasPrefix = (prefix) => {
    for (let k = nsStack.length - 1; k >= 0; k -= 1) {
      if (nsStack[k].has(prefix)) return true
    }
    return false
  }

  while (i < len) {
    const lt = xml.indexOf('<', i)
    if (lt < 0) {
      if (stack.length === 0 && !rootClosed) throw new Error(`${label} 缺少 XML 根元素`)
      const trailing = xml.slice(i).trim()
      if (stack.length === 0 && trailing) throw new Error(`${label} 根元素后存在非法文本`)
      break
    }
    const between = xml.slice(i, lt)
    if (stack.length === 0 && between.trim()) {
      throw new Error(`${label} 根元素外存在非法文本`)
    }
    if (xml.startsWith('<!--', lt)) {
      const end = xml.indexOf('-->', lt + 4)
      if (end < 0) throw new Error(`${label} 注释未闭合`)
      i = end + 3
      continue
    }
    if (xml.startsWith('<![CDATA[', lt)) {
      const end = xml.indexOf(']]>', lt + 9)
      if (end < 0) throw new Error(`${label} CDATA 未闭合`)
      i = end + 3
      continue
    }
    if (xml.startsWith('<?', lt)) {
      const end = xml.indexOf('?>', lt + 2)
      if (end < 0) throw new Error(`${label} 处理指令未闭合`)
      i = end + 2
      continue
    }
    if (xml.startsWith('<!DOCTYPE', lt)) {
      const end = findTagClose(xml, lt + 9)
      if (end < 0) throw new Error(`${label} DOCTYPE 未闭合`)
      i = end + 1
      continue
    }

    const gt = findTagClose(xml, lt + 1)
    if (gt < 0) throw new Error(`${label} 标签未闭合`)
    const token = xml.slice(lt + 1, gt)
    if (!token || token.includes('<')) throw new Error(`${label} 含有畸形标签语法`)

    if (token[0] === '/') {
      const closeName = token.slice(1).trim()
      if (stack.length === 0 || stack[stack.length - 1] !== closeName) {
        throw new Error(`${label} 闭合标签不匹配：</${closeName}>`)
      }
      stack.pop()
      nsStack.pop()
      if (stack.length === 0) rootClosed = true
      i = gt + 1
      continue
    }

    if (rootClosed) throw new Error(`${label} 存在多个根元素`)
    const selfClosing = /\/\s*$/.test(token)
    const body = selfClosing ? token.replace(/\/\s*$/, '').trim() : token.trim()
    const nameMatch = /^([a-zA-Z_][\w.-]*(?::[a-zA-Z_][\w.-]*)?)(?:\s+([\s\S]*))?$/.exec(body)
    if (!nameMatch) throw new Error(`${label} 元素名非法：<${body.slice(0, 32)}>`)
    const tagName = nameMatch[1]
    const rawAttrs = nameMatch[2] || ''
    if (!rootName) rootName = tagName

    // Parse attributes quote-safely so quoted values containing ":" or "=" never confuse prefix checks
    const localNs = new Set()
    const prefixedAttrNames = []
    const attrRe = /([a-zA-Z_][\w.-]*(?::[a-zA-Z_][\w.-]*)?)\s*=\s*(?:"[^"]*"|'[^']*')/g
    for (const am of rawAttrs.matchAll(attrRe)) {
      const aName = am[1]
      if (aName.startsWith('xmlns:')) {
        localNs.add(aName.slice(6))
      } else if (aName.includes(':')) {
        prefixedAttrNames.push(aName)
      }
    }
    nsStack.push(localNs)

    const colonIdx = tagName.indexOf(':')
    if (colonIdx > 0) {
      const prefix = tagName.slice(0, colonIdx)
      if (!hasPrefix(prefix)) {
        throw new Error(`${label} 使用了未声明的 XML 命名空间前缀：${prefix}（标签 <${tagName}>）`)
      }
    }
    for (const aName of prefixedAttrNames) {
      const attrPrefix = aName.slice(0, aName.indexOf(':'))
      if (!hasPrefix(attrPrefix)) {
        throw new Error(`${label} 使用了未声明的属性命名空间前缀：${aName}`)
      }
    }

    if (selfClosing) {
      nsStack.pop()
      if (stack.length === 0) rootClosed = true
    } else {
      stack.push(tagName)
    }
    i = gt + 1
  }

  if (stack.length > 0 || !rootClosed) {
    throw new Error(`${label} 标签未完全闭合（残留：${stack[stack.length - 1] || 'root'}）`)
  }
  if (expectedRoot && rootName !== expectedRoot) {
    throw new Error(`${label} 根元素期望 <${expectedRoot}>，实际为 <${rootName}>`)
  }
}

function assertValidSpPrChildOrder(xml, label) {
  const rankOf = (tag) => {
    if (tag === 'a:xfrm') return 1
    if (tag === 'a:prstGeom' || tag === 'a:custGeom') return 2
    if (['a:noFill', 'a:solidFill', 'a:gradFill', 'a:blipFill', 'a:pattFill', 'a:grpFill'].includes(tag)) return 3
    if (tag === 'a:ln') return 4
    if (tag === 'a:effectLst' || tag === 'a:effectDag') return 5
    if (tag === 'a:scene3d') return 6
    if (tag === 'a:sp3d') return 7
    if (tag === 'a:extLst') return 8
    return 0
  }
  for (const spPr of findBalancedElements(xml, 'p:spPr')) {
    if (spPr.selfClosing || !spPr.innerXml) continue
    let maxRank = 0
    let cur = 0
    const inner = spPr.innerXml
    while (cur < inner.length) {
      const lt = inner.indexOf('<', cur)
      if (lt < 0) break
      if (inner.startsWith('<!--', lt)) {
        const end = inner.indexOf('-->', lt + 4)
        cur = end < 0 ? inner.length : end + 3
        continue
      }
      const m = /^<([a-zA-Z_][\w.-]*:[a-zA-Z_][\w.-]*)/.exec(inner.slice(lt))
      if (!m) { cur = lt + 1; continue }
      const childTag = m[1]
      const el = findBalancedElements(inner.slice(lt), childTag)[0]
      const rank = rankOf(childTag)
      if (rank > 0) {
        if (rank < maxRank) {
          throw new Error(`${label} 的 <p:spPr> 子元素顺序违反 OOXML xsd:sequence（<${childTag}> 出现过晚）`)
        }
        maxRank = rank
      }
      cur = el ? lt + el.end : lt + 1
    }
  }
}

/**
 * 在导出 Plan B 原生母版 PPTX 前执行严格 OOXML 完整性校验：
 * 覆盖全部 slideMaster / slideLayout / theme（含多母版 theme2+）及其 .rels 的 XML 良构性、
 * 命名空间声明、零悬空 rId/目标部件检查与 <p:spPr> 子元素顺序检查。
 * 若校验抛出异常，`exportPptx` 将自动无感回退至 Plan A (`overlay`)。
 */
export function validateNativePackageXml(nativePackage) {
  if (!nativePackage || typeof nativePackage !== 'object') {
    throw new Error('原生母版包为空')
  }
  const { masters = [], layouts = [], themes = [], media = [] } = nativePackage
  if (!masters.length || !layouts.length || !themes.length) {
    throw new Error('原生母版包缺少 master/layout/theme 部件')
  }

  const availableParts = new Set()
  for (const m of masters) availableParts.add(`/ppt/slideMasters/slideMaster${m.index}.xml`)
  for (const l of layouts) availableParts.add(`/ppt/slideLayouts/slideLayout${l.index}.xml`)
  for (const t of themes) availableParts.add(`/ppt/theme/theme${t.index}.xml`)
  for (const f of media) availableParts.add(`/ppt/media/${f.targetName}`)

  const checkPartAndRels = (partPath, xml, relsXml, expectedRoot, checkDanglingRIds) => {
    assertStrictWellFormedXml(xml, partPath, expectedRoot)
    const relIds = new Set()
    if (relsXml) {
      assertStrictWellFormedXml(relsXml, relsPathForPart(partPath), 'Relationships')
      for (const rel of parseRelationshipsXml(relsXml)) {
        if (rel.targetMode && rel.targetMode.toLowerCase() === 'external') {
          throw new Error(`${partPath} 的关系包含未清洗的外部目标：${rel.id}`)
        }
        const resolved = resolvePartRelativePath(partPath, rel.target)
        if (!resolved || !availableParts.has(resolved)) {
          throw new Error(`${partPath} 的关系 ${rel.id} 指向缺失部件：${rel.target}`)
        }
        relIds.add(rel.id)
      }
    }
    if (checkDanglingRIds) {
      const xmlNoText = stripXmlRanges(xml, findBalancedElements(xml, 'a:t'))
      for (const m of xmlNoText.matchAll(/\br:(?:id|embed|link)=["']([^"']+)["']/g)) {
        if (m[1] && !relIds.has(m[1])) {
          throw new Error(`${partPath} 存在悬空关系引用：${m[1]}`)
        }
      }
      assertValidSpPrChildOrder(xml, partPath)
    }
  }

  for (const t of themes) {
    checkPartAndRels(`/ppt/theme/theme${t.index}.xml`, t.xml, t.relsXml || '', 'a:theme', false)
  }
  for (const m of masters) {
    checkPartAndRels(`/ppt/slideMasters/slideMaster${m.index}.xml`, m.xml, m.relsXml, 'p:sldMaster', true)
  }
  for (const l of layouts) {
    checkPartAndRels(`/ppt/slideLayouts/slideLayout${l.index}.xml`, l.xml, l.relsXml, 'p:sldLayout', true)
  }
}

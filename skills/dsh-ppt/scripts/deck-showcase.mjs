/**
 * deck-showcase.mjs —— dsh-ppt 科技产品与工程展示版式引擎（零外部依赖）。
 *
 * 包含 2 大高频旗舰版式（HTML + 100% 原生可编辑 PowerPoint DrawingML 双端同构）：
 *   1. mockup（设备样机框）：browser（macOS 浏览器窗口）/ mobile（灵动岛手机框）/ split（设备 + 右侧特性拆解卡）
 *      支持在屏幕视口内直接嵌图（由 deck-advanced.mjs 注入），无图时自动渲染高质感结构化 UI/指标预览卡片。
 *   2. code（原生语法高亮代码窗）：零依赖词法高亮器支持 JS/TS/Python/SQL/Bash/JSON/YAML/Go/Rust/CSS/HTML，
 *      渲染深色编辑器窗口（红黄绿三点 + 文件名/语言标签 + 行号槽 + 多色 OOXML <a:r> 语法高亮），
 *      当同时提供 items/bullets 时自动切换左右分栏代码精讲模式（62% 代码窗 + 35% 要点解析卡）。
 */

import { mixHex } from './deck-themes.mjs'
import {
  roundRectAdj,
  escapeXml,
  escapeHtml,
  renderInlineHtml,
  computeTextFit,
  resolveEffectiveItems,
  ooxmlSolidFill,
  ooxmlRichParagraph,
  ooxmlShape,
  ooxmlLine,
  computeBadgePillWidth,
  renderSurfaceCardPptx,
} from './deck-chrome.mjs'
import { normalizeIconName, resolveSemanticIcon, renderIconBadgePptx, renderIconBadgeHtml } from './deck-icons.mjs'
import { resolveActiveTaste } from './deck-taste.mjs'

export const SHOWCASE_LAYOUTS = new Set(['mockup', 'code'])

// ---------------------------------------------------------------------------
// 1. 零依赖轻量多语言词法高亮器（面向 HTML <span> 与 OOXML <a:r> 双端输出）
// ---------------------------------------------------------------------------

const CODE_THEME = Object.freeze({
  bg: '#0F172A',
  chromeBg: '#1E293B',
  border: '#334155',
  gutter: '#64748B',
  plain: '#E2E8F0',
  keyword: '#C084FC',
  string: '#34D399',
  comment: '#64748B',
  number: '#FBBF24',
  func: '#38BDF8',
  type: '#F472B6',
  operator: '#94A3B8',
})

const KEYWORDS_BY_LANG = Object.freeze({
  js: new Set(['const', 'let', 'var', 'function', 'return', 'async', 'await', 'export', 'import', 'from', 'default', 'if', 'else', 'for', 'of', 'in', 'while', 'switch', 'case', 'break', 'new', 'class', 'extends', 'try', 'catch', 'finally', 'throw', 'typeof', 'interface', 'type', 'enum', 'implements', 'public', 'private', 'readonly', 'as', 'true', 'false', 'null', 'undefined']),
  py: new Set(['def', 'class', 'return', 'async', 'await', 'import', 'from', 'as', 'if', 'elif', 'else', 'for', 'in', 'while', 'try', 'except', 'finally', 'with', 'yield', 'lambda', 'pass', 'raise', 'and', 'or', 'not', 'is', 'True', 'False', 'None', 'self']),
  sql: new Set(['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX', 'AS', 'AND', 'OR', 'NOT', 'IN', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'WITH', 'OVER', 'PARTITION', 'DESC', 'ASC']),
  sh: new Set(['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'export', 'echo', 'cd', 'npm', 'npx', 'pnpm', 'node', 'git', 'curl', 'docker', 'kubectl', 'python', 'pip', 'set', 'local']),
  go: new Set(['package', 'import', 'func', 'return', 'type', 'struct', 'interface', 'var', 'const', 'if', 'else', 'for', 'range', 'go', 'defer', 'chan', 'select', 'case', 'make', 'nil', 'true', 'false']),
  rust: new Set(['fn', 'let', 'mut', 'pub', 'struct', 'enum', 'impl', 'trait', 'use', 'mod', 'match', 'if', 'else', 'for', 'in', 'while', 'async', 'await', 'return', 'Result', 'Option', 'Some', 'None', 'Ok', 'Err', 'true', 'false']),
})

function canonicalLang(raw) {
  const s = String(raw ?? '').trim().toLowerCase()
  if (/^(ts|tsx|typescript|js|jsx|javascript|mjs|cjs)$/.test(s)) return 'js'
  if (/^(py|python)$/.test(s)) return 'py'
  if (/^sql$/.test(s)) return 'sql'
  if (/^(sh|bash|zsh|shell|powershell|ps1)$/.test(s)) return 'sh'
  if (/^go(lang)?$/.test(s)) return 'go'
  if (/^(rs|rust)$/.test(s)) return 'rust'
  if (/^json$/.test(s)) return 'json'
  if (/^(yml|yaml)$/.test(s)) return 'yaml'
  return s || 'js'
}

export function tokenizeCodeLine(line, rawLang = 'ts') {
  const lang = canonicalLang(rawLang)
  const kwSet = KEYWORDS_BY_LANG[lang] || KEYWORDS_BY_LANG.js
  const tokens = []
  const text = String(line ?? '')
  let i = 0

  const push = (kind, value) => {
    if (!value) return
    if (tokens.length > 0 && tokens[tokens.length - 1].kind === kind) {
      tokens[tokens.length - 1].value += value
    } else {
      tokens.push({ kind, value })
    }
  }

  while (i < text.length) {
    const ch = text[i]
    const rest = text.slice(i)

    // Comments
    if (
      ((lang === 'py' || lang === 'sh' || lang === 'yaml') && ch === '#') ||
      (lang === 'sql' && rest.startsWith('--')) ||
      (lang !== 'py' && lang !== 'sql' && lang !== 'yaml' && rest.startsWith('//'))
    ) {
      push('comment', rest)
      break
    }

    // Strings
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1
      while (j < text.length) {
        if (text[j] === '\\') { j += 2; continue }
        if (text[j] === ch) { j += 1; break }
        j += 1
      }
      const lit = text.slice(i, j)
      if (lang === 'json' && /^\s*:/.test(text.slice(j))) {
        push('func', lit)
      } else {
        push('string', lit)
      }
      i = j
      continue
    }

    // Numbers
    const numMatch = /^(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/.exec(rest)
    if (numMatch && (i === 0 || !/[A-Za-z0-9_$]/.test(text[i - 1]))) {
      push('number', numMatch[0])
      i += numMatch[0].length
      continue
    }

    // Identifiers / Keywords / Types / Functions
    const idMatch = /^[A-Za-z_$][\w$-]*/.exec(rest)
    if (idMatch) {
      const word = idMatch[0]
      const after = text.slice(i + word.length)
      if (lang === 'sql' ? kwSet.has(word.toUpperCase()) : kwSet.has(word)) {
        push('keyword', word)
      } else if (lang === 'yaml' && /^\s*:/.test(after)) {
        push('func', word)
      } else if (/^\s*\(/.test(after)) {
        push('func', word)
      } else if (/^[A-Z][A-Za-z0-9_]+$/.test(word)) {
        push('type', word)
      } else {
        push('plain', word)
      }
      i += word.length
      continue
    }

    // Operators & punctuation
    if (/[=<>!+\-*/%&|^~?:{}[\](),.;]/.test(ch)) {
      push('operator', ch)
      i += 1
      continue
    }

    push('plain', ch)
    i += 1
  }
  return tokens.length > 0 ? tokens : [{ kind: 'plain', value: ' ' }]
}

export function extractCodeSource(slide) {
  if (typeof slide?.code === 'string' && slide.code.trim()) return slide.code.replace(/\r\n/g, '\n').trimEnd()
  if (typeof slide?.text === 'string' && slide.text.trim()) {
    const fenced = /^```[\w.+-]*\n([\s\S]*?)\n?```$/.exec(slide.text.trim())
    return (fenced ? fenced[1] : slide.text).replace(/\r\n/g, '\n').trimEnd()
  }
  return '// Add code snippet here'
}

/**
 * 计算设备样机屏幕视口坐标（供 deck-showcase.mjs 渲染及 deck-advanced.mjs 注入截图共用，确保 100% 对齐）。
 */
export function computeMockupGeometry(slide, bodyTopY, bodyH) {
  const variant = String(slide?.variant || 'browser').trim().toLowerCase()
  const items = resolveEffectiveItems(slide)
  const hasSide = (variant === 'split' || variant === 'mobile') && items.length > 0
  const hasImage = Boolean(slide?.image?.assetId || slide?.image?.src)

  if (variant === 'mobile') {
    const phoneW = Math.min(3.35, bodyH * 0.56)
    const phoneH = Math.min(bodyH - 0.08, 4.78)
    const phoneX = hasSide ? 1.12 : (13.3333 - phoneW) / 2
    const phoneY = bodyTopY + (bodyH - phoneH) / 2
    const pad = 0.14
    const screenBox = {
      x: +(phoneX + pad).toFixed(4),
      y: +(phoneY + 0.44).toFixed(4),
      w: +(phoneW - pad * 2).toFixed(4),
      h: +(phoneH - 0.62).toFixed(4),
    }
    const sideBox = hasSide
      ? { x: 5.02, y: bodyTopY + 0.04, w: 7.68, h: bodyH - 0.08 }
      : null
    return { kind: 'mobile', frameBox: { x: phoneX, y: phoneY, w: phoneW, h: phoneH }, screenBox, sideBox, hasImage }
  }

  // browser / desktop / split
  const isSplit = variant === 'split' || (hasSide && items.length > 0 && hasImage)
  const frameW = isSplit ? 7.65 : 11.45
  const frameH = Math.min(bodyH - 0.08, 4.82)
  const frameX = isSplit ? 0.62 : (13.3333 - frameW) / 2
  const frameY = bodyTopY + (bodyH - frameH) / 2
  const chromeH = 0.44
  const screenBox = {
    x: +(frameX + 0.06).toFixed(4),
    y: +(frameY + chromeH + 0.02).toFixed(4),
    w: +(frameW - 0.12).toFixed(4),
    h: +(frameH - chromeH - 0.08).toFixed(4),
  }
  const sideBox = isSplit
    ? { x: 8.58, y: frameY, w: 4.13, h: frameH }
    : null
  return { kind: 'browser', frameBox: { x: frameX, y: frameY, w: frameW, h: frameH }, chromeH, screenBox, sideBox, hasImage }
}

// ---------------------------------------------------------------------------
// 2. PPTX 原生 DrawingML 渲染器（mockup & code）
// ---------------------------------------------------------------------------

function measureCodeColumns(line) {
  let cols = 0
  for (const ch of String(line ?? '')) {
    const cp = ch.codePointAt(0) ?? 0
    if (
      (cp >= 0x2E80 && cp <= 0x9FFF) ||
      (cp >= 0xF900 && cp <= 0xFAFF) ||
      (cp >= 0xFF00 && cp <= 0xFFEF) ||
      (cp >= 0x3000 && cp <= 0x303F) ||
      cp > 0x1F000
    ) {
      cols += 1.9
    } else {
      cols += 1
    }
  }
  return cols
}

function ooxmlCodeParagraph(lineNum, tokens, sizePt, lineHeightPt) {
  const numStr = String(lineNum).padStart(2, ' ') + '  '
  const sz = Math.round(sizePt * 100)
  const spcPts = Math.round(lineHeightPt * 100)
  const runs = [
    `<a:r><a:rPr lang="en-US" sz="${sz}" dirty="0">${ooxmlSolidFill(CODE_THEME.gutter)}<a:latin typeface="Consolas"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t xml:space="preserve">${escapeXml(numStr)}</a:t></a:r>`,
    ...tokens.map((tok) => {
      const col = CODE_THEME[tok.kind] || CODE_THEME.plain
      const boldAttr = tok.kind === 'keyword' ? ' b="1"' : ''
      const italicAttr = tok.kind === 'comment' ? ' i="1"' : ''
      return `<a:r><a:rPr lang="en-US" sz="${sz}"${boldAttr}${italicAttr} dirty="0">${ooxmlSolidFill(col)}<a:latin typeface="Consolas"/><a:ea typeface="Microsoft YaHei"/></a:rPr><a:t xml:space="preserve">${escapeXml(tok.value)}</a:t></a:r>`
    }),
  ]
  // 使用绝对磅值 <a:spcPts> 替代百分比 <a:spcPct>，消除 PowerPoint/WPS 下 Consolas + 微软雅黑混排行高膨胀导致末行溢出暗色代码窗的问题
  return `<a:p><a:pPr algn="l"><a:lnSpc><a:spcPts val="${spcPts}"/></a:lnSpc></a:pPr>${runs.join('')}</a:p>`
}

export function renderShowcaseSlideBodyPptx(slide, ctx) {
  const layout = slide.layout
  if (!SHOWCASE_LAYOUTS.has(layout)) return null
  const { theme, langAttr, chromeCfg, nextId, bodyTopY, bodyH, manifest = {} } = ctx
  const tk = theme.tokens
  const taste = resolveActiveTaste(manifest, slide)
  const shapes = []

  if (layout === 'code') {
    const codeSrc = extractCodeSource(slide)
    const rawLines = codeSrc.split('\n').slice(0, 22)
    const langTag = String(slide.language || 'typescript').trim()
    const fileLabel = String(slide.filename || slide.url || `snippet.${canonicalLang(langTag)}`).trim()
    const items = Array.isArray(slide.items) && slide.items.length > 0
      ? slide.items
      : (Array.isArray(slide.bullets) && slide.bullets.length > 0 ? resolveEffectiveItems(slide) : [])
    const hasSide = items.length > 0 && String(slide.variant || '').toLowerCase() !== 'full'

    const winW = hasSide ? 7.72 : 12.09
    const winH = Math.min(bodyH - 0.08, 4.82)
    const winX = 0.62
    const winY = bodyTopY + (bodyH - winH) / 2
    const chromeH = 0.44

    // 外壳圆角深色代码窗
    shapes.push(ooxmlShape(nextId(), 'Code Window Shell', { x: winX, y: winY, w: winW, h: winH }, {
      preset: 'roundRect',
      adj: roundRectAdj(winW, winH, 12),
      fill: CODE_THEME.bg,
      stroke: CODE_THEME.border,
      strokePt: 1.0,
      shadow: true,
    }))
    // 顶部 macOS 窗口标题栏
    shapes.push(ooxmlShape(nextId(), 'Code Window Chrome', { x: winX, y: winY, w: winW, h: chromeH }, {
      preset: 'roundRect',
      adj: roundRectAdj(winW, chromeH, 10),
      fill: CODE_THEME.chromeBg,
    }))
    shapes.push(ooxmlShape(nextId(), 'Code Chrome Bottom Mask', { x: winX, y: winY + chromeH - 0.14, w: winW, h: 0.14 }, {
      preset: 'rect',
      fill: CODE_THEME.chromeBg,
    }))
    shapes.push(ooxmlLine(nextId(), 'Code Chrome Rule', { x: winX, y: winY + chromeH }, { x: winX + winW, y: winY + chromeH }, {
      color: CODE_THEME.border,
      widthPt: 0.75,
    }))
    // 红黄绿交通灯圆点
    ;['#FF5F56', '#FFBD2E', '#27C93F'].forEach((dotCol, di) => {
      shapes.push(ooxmlShape(nextId(), `Window Dot ${di + 1}`, { x: winX + 0.18 + di * 0.21, y: winY + 0.155, w: 0.13, h: 0.13 }, {
        preset: 'ellipse',
        fill: dotCol,
      }))
    })
    // 文件名与语言徽章
    shapes.push(ooxmlShape(nextId(), 'Code Filename', { x: winX + 0.92, y: winY + 0.06, w: winW - 2.35, h: 0.32 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(fileLabel, { sizePt: 11, color: '#CBD5E1', bold: true, lang: 'en-US', font: 'Consolas' }),
      ],
    }))
    const langPillW = computeBadgePillWidth(langTag.toUpperCase(), 9.5, 1.5, 0.72)
    shapes.push(ooxmlShape(nextId(), 'Code Lang Pill', { x: winX + winW - langPillW - 0.14, y: winY + 0.09, w: langPillW, h: 0.26 }, {
      preset: 'roundRect',
      adj: 50000,
      fill: tk.accentPrimary,
      fillAlpha: 0.25,
      stroke: tk.accentPrimary,
      strokeAlpha: 0.65,
      strokePt: 0.6,
      anchor: 'ctr',
      marginsIn: { l: 0.04, r: 0.04, t: 0.01, b: 0.01 },
      paragraphs: [
        ooxmlRichParagraph(langTag.toUpperCase(), { sizePt: 9, color: '#E2E8F0', bold: true, lang: 'en-US', align: 'ctr', font: 'Consolas', spc: 100 }),
      ],
    }))

    // 代码内容区（按 CJK 双宽列数与绝对行距自适应字号，确保 PowerPoint/WPS/LibreOffice 全链路不溢出暗色代码窗）
    const maxLineCols = Math.max(24, ...rawLines.map((l) => measureCodeColumns(l) + 5))
    const availCodeW = winW - 0.44
    const availCodeH = winH - chromeH - 0.36
    const lineRatio = rawLines.length > 16 ? 1.34 : rawLines.length > 12 ? 1.40 : 1.44
    const ptByH = (availCodeH * 72) / ((Math.max(1, rawLines.length) + 0.45) * lineRatio)
    const ptByW = (availCodeW * 72) / (maxLineCols * 0.62)
    const codePt = Math.max(7.5, Math.min(13.0, +Math.min(ptByH, ptByW).toFixed(1)))
    const lineHeightPt = +(codePt * lineRatio).toFixed(2)

    const codeParagraphs = rawLines.map((line, idx) =>
      ooxmlCodeParagraph(idx + 1, tokenizeCodeLine(line, langTag), codePt, lineHeightPt),
    )
    shapes.push(ooxmlShape(nextId(), 'Code Content', { x: winX + 0.20, y: winY + chromeH + 0.18, w: availCodeW, h: availCodeH }, {
      txBox: true,
      anchor: rawLines.length <= 10 ? 'ctr' : 't',
      marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
      paragraphs: codeParagraphs,
    }))

    // 右侧代码亮点解析卡
    if (hasSide) {
      const sideX = winX + winW + 0.28
      const sideW = 12.71 - sideX
      const shown = items.slice(0, 4)
      const gap = 0.16
      const cardH = (winH - gap * (shown.length - 1)) / shown.length
      shown.forEach((it, idx) => {
        const cy = winY + idx * (cardH + gap)
        const box = { x: sideX, y: cy, w: sideW, h: cardH }
        shapes.push(renderSurfaceCardPptx(`Code Note Surface ${idx + 1}`, box, {
          fill: tk.surface1,
          focal: idx === 0,
          cardMaterial: taste.cardMaterial,
        }, nextId, chromeCfg, theme))
        const iconName = normalizeIconName(it.icon) || (taste.iconMode === 'auto' ? resolveSemanticIcon(it, idx) : '')
        let tx = box.x + 0.18
        if (iconName) {
          shapes.push(renderIconBadgePptx(`Code Note Icon ${idx + 1}`, { x: tx, y: box.y + 0.16, w: 0.34, h: 0.34 }, iconName, nextId, theme, {
            style: taste.iconBadgeStyle,
          }))
          tx += 0.44
        }
        const tagText = it.tag || String(idx + 1).padStart(2, '0')
        shapes.push(ooxmlShape(nextId(), `Code Note ${idx + 1}`, { x: tx, y: box.y + 0.10, w: box.x + box.w - tx - 0.14, h: box.h - 0.18 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ...(!iconName ? [ooxmlRichParagraph(tagText, { sizePt: 10, color: tk.accentText, bold: true, lang: 'en-US', font: theme.fonts.heading, spc: 100, spaceAfterPt: 2 })] : []),
            ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: 14, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: it.text ? 3 : 0 })] : []),
            ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: 12.5, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.32 })] : []),
          ],
        }))
      })
    }
    return shapes.join('')
  }

  // layout === 'mockup'
  const geom = computeMockupGeometry(slide, bodyTopY, bodyH)
  const items = resolveEffectiveItems(slide)
  const urlText = String(slide.url || slide.filename || 'https://app.dsh-ppt.studio/workspace').trim()

  if (geom.kind === 'mobile') {
    const fb = geom.frameBox
    const sb = geom.screenBox
    // 手机深色金属外框
    shapes.push(ooxmlShape(nextId(), 'Mobile Device Bezel', fb, {
      preset: 'roundRect',
      adj: roundRectAdj(fb.w, fb.h, 28),
      fill: '#0F172A',
      stroke: theme.dark ? '#475569' : '#334155',
      strokePt: 2.0,
      shadow: true,
    }))
    // 内部屏幕视口
    shapes.push(ooxmlShape(nextId(), 'Mobile Screen Viewport', sb, {
      preset: 'roundRect',
      adj: roundRectAdj(sb.w, sb.h, 18),
      fill: tk.canvas,
      stroke: tk.hairline,
      strokePt: 0.5,
    }))
    // 顶部灵动岛胶囊
    const islandW = Math.min(1.05, fb.w * 0.34)
    shapes.push(ooxmlShape(nextId(), 'Dynamic Island', { x: fb.x + (fb.w - islandW) / 2, y: fb.y + 0.17, w: islandW, h: 0.16 }, {
      preset: 'roundRect',
      adj: 50000,
      fill: '#020617',
    }))
    // 底部 Home 指示条
    shapes.push(ooxmlShape(nextId(), 'Home Indicator', { x: fb.x + (fb.w - 0.96) / 2, y: fb.y + fb.h - 0.12, w: 0.96, h: 0.045 }, {
      preset: 'roundRect',
      adj: 50000,
      fill: '#64748B',
    }))
    // 无外部图片时在手机屏内绘制精简应用 UI 卡片预览
    if (!geom.hasImage) {
      shapes.push(ooxmlShape(nextId(), 'Mobile App Header', { x: sb.x + 0.14, y: sb.y + 0.14, w: sb.w - 0.28, h: 0.42 }, {
        preset: 'roundRect',
        adj: roundRectAdj(sb.w - 0.28, 0.42, 8),
        fill: tk.accentPrimary,
        anchor: 'ctr',
        marginsIn: { l: 0.10, r: 0.10, t: 0.02, b: 0.02 },
        paragraphs: [
          ooxmlRichParagraph(slide.kicker || slide.url || 'Mobile App', { sizePt: 11, color: tk.inkOnAccent, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading }),
        ],
      }))
      const uiCards = items.slice(0, 3)
      const cGap = 0.12
      const cTop = sb.y + 0.68
      const cH = (sb.h - 0.84 - cGap * Math.max(0, uiCards.length - 1)) / Math.max(1, uiCards.length)
      uiCards.forEach((it, ci) => {
        const cy = cTop + ci * (cH + cGap)
        shapes.push(ooxmlShape(nextId(), `Mobile Screen Card ${ci + 1}`, { x: sb.x + 0.14, y: cy, w: sb.w - 0.28, h: cH }, {
          preset: 'roundRect',
          adj: roundRectAdj(sb.w - 0.28, cH, 10),
          fill: ci === 0 ? tk.accentSoft : tk.surface1,
          stroke: ci === 0 ? tk.accentPrimary : tk.hairline,
          strokePt: 0.75,
          anchor: 'ctr',
          marginsIn: { l: 0.12, r: 0.12, t: 0.06, b: 0.06 },
          paragraphs: [
            ...(it.value ? [ooxmlRichParagraph(it.value + (it.unit ? ' ' + it.unit : ''), { sizePt: 18, color: tk.accentText, bold: true, lang: 'en-US', font: theme.fonts.heading, spaceAfterPt: 2 })] : []),
            ooxmlRichParagraph(it.title || it.text || '', { sizePt: 12, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading }),
          ],
        }))
      })
    }
  } else {
    // macOS 浏览器窗口样机
    const fb = geom.frameBox
    const sb = geom.screenBox
    const chromeH = geom.chromeH
    shapes.push(ooxmlShape(nextId(), 'Browser Window Shell', fb, {
      preset: 'roundRect',
      adj: roundRectAdj(fb.w, fb.h, 12),
      fill: tk.canvas,
      stroke: tk.hairline,
      strokePt: 1.0,
      shadow: true,
    }))
    shapes.push(ooxmlShape(nextId(), 'Browser Top Bar', { x: fb.x, y: fb.y, w: fb.w, h: chromeH }, {
      preset: 'roundRect',
      adj: roundRectAdj(fb.w, chromeH, 10),
      fill: tk.surface2,
    }))
    shapes.push(ooxmlShape(nextId(), 'Browser Bar Mask', { x: fb.x, y: fb.y + chromeH - 0.14, w: fb.w, h: 0.14 }, {
      preset: 'rect',
      fill: tk.surface2,
    }))
    shapes.push(ooxmlLine(nextId(), 'Browser Bar Rule', { x: fb.x, y: fb.y + chromeH }, { x: fb.x + fb.w, y: fb.y + chromeH }, {
      color: tk.hairline,
      widthPt: 0.75,
    }))
    ;['#FF5F56', '#FFBD2E', '#27C93F'].forEach((dotCol, di) => {
      shapes.push(ooxmlShape(nextId(), `Browser Dot ${di + 1}`, { x: fb.x + 0.18 + di * 0.20, y: fb.y + 0.155, w: 0.125, h: 0.125 }, {
        preset: 'ellipse',
        fill: dotCol,
      }))
    })
    const urlW = Math.min(fb.w - 2.1, 5.4)
    shapes.push(ooxmlShape(nextId(), 'Browser Address Bar', { x: fb.x + (fb.w - urlW) / 2, y: fb.y + 0.08, w: urlW, h: 0.28 }, {
      preset: 'roundRect',
      adj: 50000,
      fill: tk.canvas,
      stroke: tk.hairline,
      strokePt: 0.6,
      anchor: 'ctr',
      marginsIn: { l: 0.10, r: 0.10, t: 0.01, b: 0.01 },
      paragraphs: [
        ooxmlRichParagraph(urlText, { sizePt: 10, color: tk.inkMuted, lang: 'en-US', align: 'ctr', font: 'Consolas' }),
      ],
    }))

    // 无外部图片时在浏览器视口内绘制精致模拟 SaaS 仪表盘界面（左侧导航 + 主指标/卡片）
    if (!geom.hasImage) {
      const navW = Math.min(1.65, sb.w * 0.21)
      shapes.push(ooxmlShape(nextId(), 'Mockup Sidebar', { x: sb.x + 0.08, y: sb.y + 0.08, w: navW, h: sb.h - 0.16 }, {
        preset: 'roundRect',
        adj: roundRectAdj(navW, sb.h - 0.16, 8),
        fill: tk.surface1,
        stroke: tk.hairline,
        strokePt: 0.5,
      }))
      const navItems = ['Overview', 'Analytics', 'Workflows', 'Settings']
      navItems.forEach((lbl, ni) => {
        shapes.push(ooxmlShape(nextId(), `Mockup Nav ${ni + 1}`, { x: sb.x + 0.18, y: sb.y + 0.26 + ni * 0.44, w: navW - 0.20, h: 0.34 }, {
          preset: 'roundRect',
          adj: roundRectAdj(navW - 0.20, 0.34, 6),
          fill: ni === 0 ? tk.accentSoft : '',
          anchor: 'ctr',
          marginsIn: { l: 0.08, r: 0.06, t: 0.02, b: 0.02 },
          paragraphs: [
            ooxmlRichParagraph(lbl, { sizePt: 10.5, color: ni === 0 ? tk.accentText : tk.inkMuted, bold: ni === 0, lang: 'en-US', font: theme.fonts.body }),
          ],
        }))
      })
      const mainX = sb.x + navW + 0.22
      const mainW = sb.x + sb.w - mainX - 0.12
      const uiItems = (geom.sideBox ? items.slice(0, 2) : items.slice(0, 4))
      const cols = Math.min(2, Math.max(1, uiItems.length))
      const rows = Math.ceil(Math.max(1, uiItems.length) / cols)
      const cGap = 0.16
      const cW = (mainW - cGap * (cols - 1)) / cols
      const cH = (sb.h - 0.24 - cGap * (rows - 1)) / rows
      uiItems.forEach((it, idx) => {
        const col = idx % cols
        const row = Math.floor(idx / cols)
        const cx = mainX + col * (cW + cGap)
        const cy = sb.y + 0.12 + row * (cH + cGap)
        shapes.push(ooxmlShape(nextId(), `Mockup UI Card ${idx + 1}`, { x: cx, y: cy, w: cW, h: cH }, {
          preset: 'roundRect',
          adj: roundRectAdj(cW, cH, 10),
          fill: idx === 0 ? tk.accentSoft : tk.surface1,
          stroke: idx === 0 ? tk.accentPrimary : tk.hairline,
          strokePt: 0.75,
          anchor: 'ctr',
          marginsIn: { l: 0.16, r: 0.16, t: 0.10, b: 0.10 },
          paragraphs: [
            ...(it.tag ? [ooxmlRichParagraph(it.tag.toUpperCase(), { sizePt: 9.5, color: tk.accentText, bold: true, lang: 'en-US', spc: 100, spaceAfterPt: 3 })] : []),
            ...(it.value ? [ooxmlRichParagraph(it.value + (it.unit ? ' ' + it.unit : ''), { sizePt: 22, color: tk.accentText, bold: true, lang: 'en-US', font: theme.fonts.heading, spaceAfterPt: 3 })] : []),
            ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: 13.5, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: it.text ? 3 : 0 })] : []),
            ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: 11.5, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.32 })] : []),
          ],
        }))
      })
    }
  }

  // 右侧说明栏（mobile 或 split 变体）
  if (geom.sideBox && items.length > 0) {
    const sb = geom.sideBox
    const shown = items.slice(0, 4)
    const gap = 0.18
    const rowH = (sb.h - gap * (shown.length - 1)) / shown.length
    shown.forEach((it, idx) => {
      const ry = sb.y + idx * (rowH + gap)
      const box = { x: sb.x, y: ry, w: sb.w, h: rowH }
      shapes.push(renderSurfaceCardPptx(`Mockup Feature ${idx + 1}`, box, {
        fill: tk.surface1,
        focal: idx === 0,
        cardMaterial: taste.cardMaterial,
      }, nextId, chromeCfg, theme))
      const iconName = normalizeIconName(it.icon) || (taste.iconMode === 'auto' ? resolveSemanticIcon(it, idx) : '')
      let tx = box.x + 0.18
      if (iconName) {
        shapes.push(renderIconBadgePptx(`Mockup Feature Icon ${idx + 1}`, { x: tx, y: box.y + (box.h - 0.38) / 2, w: 0.38, h: 0.38 }, iconName, nextId, theme, {
          style: taste.iconBadgeStyle,
        }))
        tx += 0.50
      }
      shapes.push(ooxmlShape(nextId(), `Mockup Callout ${idx + 1}`, { x: tx, y: box.y + 0.08, w: box.x + box.w - tx - 0.16, h: box.h - 0.16 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: 14.5, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: it.text ? 3 : 0 })] : []),
          ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: 12.5, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.35 })] : []),
        ],
      }))
    })
  }

  return shapes.join('')
}

// ---------------------------------------------------------------------------
// 3. HTML 双端同构渲染器（mockup & code）
// ---------------------------------------------------------------------------

export function renderShowcaseSlideBodyHtml(slide, ctx = {}) {
  const layout = slide.layout
  if (!SHOWCASE_LAYOUTS.has(layout)) return null
  const { manifest = {} } = ctx
  const taste = resolveActiveTaste(manifest, slide)
  const matClass = taste.cardMaterial && taste.cardMaterial !== 'solid' ? ` mat-${taste.cardMaterial}` : ''

  if (layout === 'code') {
    const codeSrc = extractCodeSource(slide)
    const rawLines = codeSrc.split('\n').slice(0, 22)
    const langTag = String(slide.language || 'typescript').trim()
    const fileLabel = String(slide.filename || slide.url || `snippet.${canonicalLang(langTag)}`).trim()
    const items = Array.isArray(slide.items) && slide.items.length > 0
      ? slide.items
      : (Array.isArray(slide.bullets) && slide.bullets.length > 0 ? resolveEffectiveItems(slide) : [])
    const hasSide = items.length > 0 && String(slide.variant || '').toLowerCase() !== 'full'

    const linesHtml = rawLines.map((line, idx) => {
      const toks = tokenizeCodeLine(line, langTag)
      const codeHtml = toks.map((tk) => `<span class="tok-${tk.kind}">${escapeHtml(tk.value)}</span>`).join('')
      return `<div class="code-line"><span class="code-ln">${String(idx + 1).padStart(2, ' ')}</span><span class="code-src">${codeHtml}</span></div>`
    }).join('')

    const maxLineCols = Math.max(24, ...rawLines.map((l) => measureCodeColumns(l) + 5))
    const htmlFsByLines = rawLines.length > 16 ? 11.5 : rawLines.length > 13 ? 12.5 : rawLines.length > 10 ? 13.5 : 14.5
    const htmlFsByWidth = hasSide
      ? (maxLineCols > 64 ? 11.5 : maxLineCols > 52 ? 12.5 : 14.5)
      : (maxLineCols > 96 ? 11.5 : maxLineCols > 80 ? 12.5 : 14.5)
    const htmlCodeFs = Math.min(htmlFsByLines, htmlFsByWidth)
    const htmlCodeLh = rawLines.length > 15 ? 1.34 : rawLines.length > 11 ? 1.40 : 1.48
    const codeBodyStyle = ` style="--code-fs:${htmlCodeFs}px;--code-lh:${htmlCodeLh}"`

    const winHtml =
      `<div class="code-window">` +
      `<div class="code-chrome"><span class="win-dots"><i></i><i></i><i></i></span><span class="code-file">${escapeHtml(fileLabel)}</span><span class="code-lang">${escapeHtml(langTag.toUpperCase())}</span></div>` +
      `<pre class="code-body"${codeBodyStyle}><code>${linesHtml}</code></pre>` +
      `</div>`

    if (!hasSide) return `<div class="code-stage">${winHtml}</div>`
    const notesHtml = items.slice(0, 4).map((it, idx) => {
      const iconName = normalizeIconName(it.icon) || (taste.iconMode === 'auto' ? resolveSemanticIcon(it, idx) : '')
      return (
        `<div class="surface-card code-note${idx === 0 ? ' is-focal' : ''}${matClass}" data-item-index="${idx}">` +
        (iconName ? renderIconBadgeHtml(iconName, { style: taste.iconBadgeStyle, size: 17 }) : `<span class="item-badge">${escapeHtml(it.tag || String(idx + 1).padStart(2, '0'))}</span>`) +
        `<div class="code-note-copy">` +
        (it.title ? `<div class="card-title" data-item-field="title">${renderInlineHtml(it.title)}</div>` : '') +
        (it.text ? `<div class="card-body" data-item-field="text">${renderInlineHtml(it.text)}</div>` : '') +
        `</div></div>`
      )
    }).join('')
    return `<div class="code-stage is-split">${winHtml}<div class="code-notes">${notesHtml}</div></div>`
  }

  // layout === 'mockup'
  const variant = String(slide.variant || 'browser').trim().toLowerCase()
  const items = resolveEffectiveItems(slide)
  const hasSide = (variant === 'split' || variant === 'mobile') && items.length > 0
  const urlText = String(slide.url || slide.filename || 'https://app.dsh-ppt.studio/workspace').trim()
  const rawAsset = slide.image?.assetId && manifest.assets?.[slide.image.assetId]
  const imgData = rawAsset
    ? (String(rawAsset.data || '').startsWith('data:') ? rawAsset.data : `data:${rawAsset.mime};base64,${rawAsset.data}`)
    : (typeof slide.image?.src === 'string' && slide.image.src.startsWith('data:image/') ? slide.image.src : '')

  let deviceHtml = ''
  if (variant === 'mobile') {
    const innerContent = imgData
      ? `<img class="mockup-img" src="${imgData}" alt="${escapeHtml(slide.image?.alt || slide.title || '')}"/>`
      : `<div class="mobile-ui-head">${escapeHtml(slide.kicker || 'Mobile App')}</div>` +
        items.slice(0, 3).map((it, ci) =>
          `<div class="mobile-ui-card${ci === 0 ? ' is-accent' : ''}">` +
          (it.value ? `<div class="card-stat">${escapeHtml(it.value + (it.unit ? ' ' + it.unit : ''))}</div>` : '') +
          `<div class="card-title">${renderInlineHtml(it.title || it.text || '')}</div>` +
          `</div>`,
        ).join('')
    deviceHtml =
      `<div class="mockup-phone"><div class="phone-island" aria-hidden="true"></div>` +
      `<div class="phone-screen">${innerContent}</div>` +
      `<div class="phone-home" aria-hidden="true"></div></div>`
  } else {
    const innerContent = imgData
      ? `<img class="mockup-img" src="${imgData}" alt="${escapeHtml(slide.image?.alt || slide.title || '')}"/>`
      : `<div class="browser-ui-grid"><aside class="browser-ui-nav"><span class="is-on">Overview</span><span>Analytics</span><span>Workflows</span><span>Settings</span></aside>` +
        `<div class="browser-ui-cards">` +
        (hasSide ? items.slice(0, 2) : items.slice(0, 4)).map((it, idx) =>
          `<div class="browser-ui-card${idx === 0 ? ' is-accent' : ''}">` +
          (it.tag ? `<span class="kicker">${escapeHtml(it.tag)}</span>` : '') +
          (it.value ? `<div class="card-stat">${escapeHtml(it.value + (it.unit ? ' ' + it.unit : ''))}</div>` : '') +
          (it.title ? `<div class="card-title">${renderInlineHtml(it.title)}</div>` : '') +
          (it.text ? `<div class="card-body">${renderInlineHtml(it.text)}</div>` : '') +
          `</div>`,
        ).join('') +
        `</div></div>`
    deviceHtml =
      `<div class="mockup-browser">` +
      `<div class="browser-chrome"><span class="win-dots"><i></i><i></i><i></i></span><span class="browser-url">${escapeHtml(urlText)}</span></div>` +
      `<div class="browser-screen">${innerContent}</div></div>`
  }

  if (!hasSide) return `<div class="mockup-stage">${deviceHtml}</div>`
  const sideHtml = items.slice(0, 4).map((it, idx) => {
    const iconName = normalizeIconName(it.icon) || (taste.iconMode === 'auto' ? resolveSemanticIcon(it, idx) : '')
    return (
      `<div class="surface-card mockup-note${idx === 0 ? ' is-focal' : ''}${matClass}" data-item-index="${idx}">` +
      (iconName ? renderIconBadgeHtml(iconName, { style: taste.iconBadgeStyle, size: 18 }) : '') +
      `<div class="mockup-note-copy">` +
      (it.title ? `<div class="card-title" data-item-field="title">${renderInlineHtml(it.title)}</div>` : '') +
      (it.text ? `<div class="card-body" data-item-field="text">${renderInlineHtml(it.text)}</div>` : '') +
      `</div></div>`
    )
  }).join('')
  return `<div class="mockup-stage is-split is-${variant}">${deviceHtml}<div class="mockup-notes">${sideHtml}</div></div>`
}

export const SHOWCASE_CSS = `
/* Phase 7 Tech & Product Showcase: Device Mockups & Syntax-Highlighted Code Windows */
.code-stage{display:grid;grid-template-columns:1fr;gap:clamp(16px,2vw,26px);width:100%;align-items:stretch;flex:1 1 auto;min-height:0}
.code-stage.is-split{grid-template-columns:1.68fr 1fr}
.code-window{background:#0F172A;border:1px solid #334155;border-radius:12px;overflow:hidden;box-shadow:0 18px 44px rgba(2,6,23,.24);display:flex;flex-direction:column;min-height:0;max-height:100%}
.code-chrome,.browser-chrome{display:flex;align-items:center;gap:12px;padding:10px 16px;background:#1E293B;border-bottom:1px solid #334155}
.browser-chrome{background:var(--surface2);border-bottom-color:var(--hairline)}
.win-dots{display:inline-flex;gap:6px;flex:0 0 auto}
.win-dots i{width:11px;height:11px;border-radius:50%;display:block}
.win-dots i:nth-child(1){background:#FF5F56}
.win-dots i:nth-child(2){background:#FFBD2E}
.win-dots i:nth-child(3){background:#27C93F}
.code-file{font-family:Consolas,"SFMono-Regular",ui-monospace,monospace;font-size:13px;font-weight:600;color:#CBD5E1;margin-right:auto}
.code-lang{font-family:Consolas,monospace;font-size:11px;font-weight:700;letter-spacing:.08em;padding:2px 10px;border-radius:999px;background:rgba(56,189,248,.18);border:1px solid rgba(56,189,248,.45);color:#E2E8F0}
.code-body{margin:0;padding:14px 18px;overflow:auto;font-family:Consolas,"SFMono-Regular",ui-monospace,monospace;font-size:var(--code-fs,clamp(12px,1.08vw,15px));line-height:var(--code-lh,1.48);color:#E2E8F0;flex:1;min-height:0}
.code-line{display:flex;gap:14px;white-space:pre}
.code-ln{color:#64748B;user-select:none;min-width:2ch;text-align:right}
.tok-keyword{color:#C084FC;font-weight:700}.tok-string{color:#34D399}.tok-comment{color:#64748B;font-style:italic}.tok-number{color:#FBBF24}.tok-func{color:#38BDF8}.tok-type{color:#F472B6}.tok-operator{color:#94A3B8}
.code-notes,.mockup-notes{display:flex;flex-direction:column;gap:12px;justify-content:space-between;min-height:0}
.code-note,.mockup-note{flex-direction:row;align-items:center;gap:12px;padding:14px 16px}
.mockup-stage{display:flex;justify-content:center;align-items:center;width:100%;gap:clamp(20px,2.8vw,38px)}
.mockup-stage.is-split{display:grid;grid-template-columns:1.65fr 1fr;align-items:stretch}
.mockup-stage.is-split.is-mobile{grid-template-columns:300px 1fr;align-items:center}
.mockup-browser{width:100%;background:var(--bg);border:1px solid var(--hairline);border-radius:12px;overflow:hidden;box-shadow:0 20px 48px rgba(15,23,42,.12);display:flex;flex-direction:column}
.browser-url{flex:1;max-width:440px;margin:0 auto;padding:4px 14px;border-radius:999px;background:var(--bg);border:1px solid var(--hairline);color:var(--muted);font-family:Consolas,monospace;font-size:12px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.browser-screen{padding:16px;min-height:290px;display:flex;flex-direction:column;flex:1}
.browser-ui-grid{display:grid;grid-template-columns:140px 1fr;gap:14px;flex:1}
.browser-ui-nav{background:var(--surface1);border:1px solid var(--hairline);border-radius:8px;padding:12px 10px;display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--muted)}
.browser-ui-nav .is-on{background:var(--accent-soft);color:var(--accent-text);font-weight:700;padding:5px 8px;border-radius:6px}
.browser-ui-nav span:not(.is-on){padding:5px 8px}
.browser-ui-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.browser-ui-card{background:var(--surface1);border:1px solid var(--hairline);border-radius:10px;padding:14px;display:flex;flex-direction:column;justify-content:center;gap:6px}
.browser-ui-card.is-accent,.mobile-ui-card.is-accent{background:var(--accent-soft);border-color:var(--accent)}
.mockup-phone{width:270px;background:#0F172A;border:3px solid #334155;border-radius:36px;padding:14px 12px 10px;box-shadow:0 24px 52px rgba(2,6,23,.28);display:flex;flex-direction:column;align-items:center;gap:8px;margin:0 auto}
.phone-island{width:84px;height:14px;border-radius:999px;background:#020617}
.phone-screen{width:100%;min-height:360px;background:var(--bg);border-radius:22px;padding:12px;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.phone-home{width:88px;height:4px;border-radius:999px;background:#64748B;margin-top:2px}
.mobile-ui-head{background:var(--accent);color:var(--ink-on-accent);font-weight:700;font-size:12px;text-align:center;padding:8px 10px;border-radius:8px}
.mobile-ui-card{background:var(--surface1);border:1px solid var(--hairline);border-radius:10px;padding:10px 12px}
.mockup-img{width:100%;height:100%;object-fit:cover;border-radius:8px;display:block}
`

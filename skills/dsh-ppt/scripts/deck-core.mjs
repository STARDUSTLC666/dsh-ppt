#! /usr/bin/env node
/**
 * deck-core.mjs —— dsh-ppt 的零依赖演示文稿核心协调引擎。
 *
 * 这是插件工具与裸 SKILL.md 共用的唯一事实源：
 *   - DSH 内：ppt_create 工具动态加载本文件
 *   - 其他 harness：直接运行同目录的 build-deck.mjs
 *
 * 能力：Markdown / 结构化 slides → 三件套
 *   deck.html  独立网页放映（键盘/触屏/演讲者视图/缩略图总览/打印，无外链）
 *   deck.pptx  可编辑 PPTX（16:9，OOXML 由 deck-layouts 手写，zip 用 node:zlib）
 *   deck.json  结构化 deck manifest
 *
 * 零外部运行时依赖，仅使用 Node 内置模块。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { deflateRawSync } from 'node:zlib'
import * as deckMedia from './deck-media.mjs'
import { renderDelivery, renderHandoutMarkdown, renderOnePagerHtml } from './deck-delivery.mjs'
import { renderDataView } from './deck-data-view.mjs'
import { normalizeVisual, visualHtmlStyle, visualShapeXml, VISUAL_CSS } from './deck-visual.mjs'
import {
  containsLatexMath,
  looksLikeRawLatex,
  unwrapOuterMathDelimiters,
  splitMathSegments,
  parseLatexMath,
  astToMathMl,
  latexToMathMl,
  astToOmml,
  latexToOmml,
  astToOoxmlInlineRuns,
  has2dMathConstruct,
  measureMathAst,
  fitFormulaBoxIn,
} from './deck-math.mjs'
import {
  THEMES,
  THEME_IDS,
  CHROME_STYLES,
  DEFAULT_THEME,
  SMART_DEFAULT_THEME,
  resolveTheme,
  resolveChromeStyle,
  listThemes,
  CURATED_MASTER_PRESETS,
  listMasterPresets,
  deriveBrandedTheme,
  sanitizeAbsorbedTheme,
  pptxFontName,
  pptxEastAsianFont,
  contrastRatio,
  ensureContrast,
  hexToRgba,
  renderThemeSvg as renderThemeSvgBase,
  renderThemePreviewHtml as renderThemePreviewHtmlBase,
  buildThemePreview as buildThemePreviewBase,
} from './deck-themes.mjs'
import {
  CORE_LAYOUTS,
  LAYOUT_ALIASES,
  normalizeImageBrief,
  EMU_W,
  EMU_H,
  escapeXml,
  escapeHtml,
  stripInlineMarkdown,
  cleanRichText,
  parseInlineRuns,
  renderInlineHtml,
  computeTextFit,
  normalizeSlideItems,
  resolveEffectiveItems,
  formatSourceLine,
  computeBadgePillWidth,
  roundRectAdj,
  ooxmlShape,
  ooxmlCustGeomShape,
  ooxmlMathShape,
  ooxmlConnector,
  ooxmlRichParagraph,
  getChromeConfig,
  parseHarveyValue,
  computeMarimekkoModel,
  computeSankeyLayout,
  partitionValueChainItems,
  computeSwotModel,
  extractMermaidSource,
  detectMermaidMode,
  parseMermaidFlowchart,
  layoutMermaidFlowchart,
  parseMermaidSequence,
  layoutMermaidSequence,
  compileMermaidSlide,
  renderMermaidPptx,
  renderMermaidHtml,
  renderSlideChromePptx,
  renderCoreSlidePptx,
  renderCoreSlideHtml,
  LAYOUT_CSS,
  buildLayoutCss,
  EXEC_CHART_LAYOUTS,
  computeIssueTreeModel,
  computeTreemapModel,
  computeGaugeModel,
  computePricingModel,
} from './deck-layouts.mjs'

export {
  THEMES,
  THEME_IDS,
  CHROME_STYLES,
  DEFAULT_THEME,
  SMART_DEFAULT_THEME,
  resolveTheme,
  resolveChromeStyle,
  listThemes,
  CURATED_MASTER_PRESETS,
  listMasterPresets,
  deriveBrandedTheme,
  sanitizeAbsorbedTheme,
  pptxFontName,
  pptxEastAsianFont,
  contrastRatio,
  ensureContrast,
  hexToRgba,
  CORE_LAYOUTS,
  LAYOUT_ALIASES,
  escapeXml,
  escapeHtml,
  stripInlineMarkdown,
  cleanRichText,
  parseInlineRuns,
  renderInlineHtml,
  computeTextFit,
  normalizeSlideItems,
  resolveEffectiveItems,
  formatSourceLine,
  computeBadgePillWidth,
  roundRectAdj,
  ooxmlCustGeomShape,
  ooxmlMathShape,
  ooxmlConnector,
  getChromeConfig,
  parseHarveyValue,
  computeMarimekkoModel,
  computeSankeyLayout,
  partitionValueChainItems,
  computeSwotModel,
  extractMermaidSource,
  detectMermaidMode,
  parseMermaidFlowchart,
  layoutMermaidFlowchart,
  parseMermaidSequence,
  layoutMermaidSequence,
  compileMermaidSlide,
  renderMermaidPptx,
  renderMermaidHtml,
  renderSlideChromePptx,
  containsLatexMath,
  looksLikeRawLatex,
  unwrapOuterMathDelimiters,
  splitMathSegments,
  parseLatexMath,
  astToMathMl,
  latexToMathMl,
  astToOmml,
  latexToOmml,
  astToOoxmlInlineRuns,
  has2dMathConstruct,
  measureMathAst,
  fitFormulaBoxIn,
  buildLayoutCss,
  EXEC_CHART_LAYOUTS,
  computeIssueTreeModel,
  computeTreemapModel,
  computeGaugeModel,
  computePricingModel,
}

/**
 * manifest 版本跟随发布包 package.json；把 skills/dsh-ppt 独立复制到其他
 * harness（没有 package.json）时回退为 0.0.0，避免版本号悄悄漂移。
 */
function readDeckVersion() {
  for (const file of ['../../../package.json', '../package.json']) {
    try {
      const pkg = JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'))
      if (!['dsh-ppt', 'dsh-ppt-skill'].includes(pkg.name)) continue
      const version = String(pkg.version ?? '').trim()
      if (version) return version
    } catch { /* Copied skill may have no parent manifest. */ }
  }
  return '0.0.0'
}

export const DECK_VERSION = readDeckVersion()

// ---------------------------------------------------------------------------
// 多语言 UI 文案与参数解析
// ---------------------------------------------------------------------------

export const LANGUAGES = {
  zh: {
    id: 'zh',
    attr: 'zh-CN',
    ui: {
      slide: '第',
      of: '/ 共',
      theme: '主题',
      help: '← → 翻页 · F 全屏 · G 总览 · S 备注 · V/P 演讲者',
      coverKicker: '开场',
      pointKicker: '要点',
      statementKicker: '核心观点',
      quoteKicker: '金句',
      tableKicker: '数据',
      continuation: '（续）',
      notesLabel: '演讲者备注',
      notesToggle: '备注',
      closingTitle: '谢谢',
      closingSubtitle: '讨论与问答',
      generatedBy: '由 dsh-ppt 生成',
      overviewToggle: '总览',
      presenterToggle: '演讲者',
      presenterLabel: '演讲者视图 · Presenter view',
      helpTitle: '快捷键 · Shortcuts',
      noNotes: '（本页无备注）',
      closeLabel: '关闭',
      currentLabel: '当前页 · Current',
      nextLabel: '下一页 · Next',
      timerLabel: '计时 · Timer',
      presenterHint: '备注：未开演讲者窗口时按 S 显示在顶部；打开后只在演讲者窗口显示，观众看不到',
      wrapHint: '已环绕到',
      popupBlocked: '浏览器拦截了演讲者窗口，请允许弹出窗口后按 V 重试',
      fullscreenUnavailable: '当前窗口无法进入全屏，请在浏览器中独立打开演示文件后重试。',
      notesCloseLabel: '关闭备注',
      overviewHint: '点击缩略图跳页，方向键切换，Enter 进入，Esc 退出',
    },
  },
  en: {
    id: 'en',
    attr: 'en-US',
    ui: {
      slide: 'Slide',
      of: '/',
      theme: 'Theme',
      help: '← → navigate · F fullscreen · G overview · S notes · V/P presenter',
      coverKicker: 'Opening',
      pointKicker: 'Key point',
      statementKicker: 'Core idea',
      quoteKicker: 'Quote',
      tableKicker: 'Data',
      continuation: ' (continued)',
      notesLabel: 'Speaker notes',
      notesToggle: 'Notes',
      closingTitle: 'Thank You',
      closingSubtitle: 'Discussion & Q&A',
      generatedBy: 'Generated with dsh-ppt',
      overviewToggle: 'Overview',
      presenterToggle: 'Presenter',
      presenterLabel: 'Presenter view',
      helpTitle: 'Keyboard shortcuts',
      noNotes: '(No notes on this slide)',
      closeLabel: 'Close',
      currentLabel: 'Current',
      nextLabel: 'Next',
      timerLabel: 'Timer',
      presenterHint: 'Notes: S shows them on top until a presenter window is open; afterwards only in the presenter window.',
      wrapHint: 'Wrapped to',
      popupBlocked: 'The presenter window was blocked. Allow pop-ups and press V to retry.',
      fullscreenUnavailable: 'Fullscreen is unavailable here. Open the presentation in a browser tab and try again.',
      notesCloseLabel: 'Close notes',
      overviewHint: 'Click a thumbnail to jump; arrows move, Enter opens, Esc exits',
    },
  },
  bilingual: {
    id: 'bilingual',
    attr: 'zh-CN',
    ui: {
      slide: '第',
      of: '/ 共',
      theme: '主题 · Theme',
      help: '← → 翻页 · F 全屏 · G 总览 · S 备注 · V/P 演讲者',
      coverKicker: '开场 · Opening',
      pointKicker: '要点 · Key point',
      statementKicker: '核心观点 · Core Idea',
      quoteKicker: '金句 · Quote',
      tableKicker: '数据 · Data',
      continuation: '（续 · continued）',
      notesLabel: '演讲者备注 · Speaker notes',
      notesToggle: '备注 · Notes',
      closingTitle: '谢谢 · Thank You',
      closingSubtitle: '讨论与问答 · Q&A',
      generatedBy: '由 dsh-ppt 生成 · Generated with dsh-ppt',
      overviewToggle: '总览 · Overview',
      presenterToggle: '演讲者 · Presenter',
      presenterLabel: '演讲者视图 · Presenter view',
      helpTitle: '快捷键 · Shortcuts',
      noNotes: '（本页无备注 · No notes on this slide）',
      closeLabel: '关闭 · Close',
      currentLabel: '当前页 · Current',
      nextLabel: '下一页 · Next',
      timerLabel: '计时 · Timer',
      presenterHint: '备注：未开演讲者窗口时按 S 显示在顶部；打开后只在演讲者窗口显示 · Notes: S shows on top until a presenter window is open',
      wrapHint: '已环绕到 · Wrapped to',
      popupBlocked: '浏览器拦截了演讲者窗口 · Presenter window blocked; allow pop-ups and press V',
      fullscreenUnavailable: '当前窗口无法全屏，请独立打开演示文件 · Open this presentation in a browser tab for fullscreen.',
      notesCloseLabel: '关闭备注 · Close notes',
      overviewHint: '点击缩略图跳页 · Click to jump, arrows move, Enter opens, Esc exits',
    },
  },
}

export function resolveLanguage(input) {
  const id = String(input ?? 'zh').trim().toLowerCase()
  const language = LANGUAGES[id]
  if (!language) {
    throw new Error('dsh-ppt：未知语言 "' + id + '"，可选：zh / en / bilingual')
  }
  return language
}

export function resolveMotion(input) {
  if (input === undefined || input === null || input === '') return true
  if (input === true || input === 'on') return true
  if (input === false || input === 'off') return false
  throw new Error('dsh-ppt：未知 motion 值 "' + String(input) + '"，可选：on / off（默认 on）')
}

// ---------------------------------------------------------------------------
// 主题预览包装器（注入 DECK_VERSION 与语言校验）
// ---------------------------------------------------------------------------

/** 单套主题的 960x540 SVG 色板卡：可直接放进 README / npm 首屏。 */
export function renderThemeSvg(input, lang = 'zh') {
  return renderThemeSvgBase(input, lang, DECK_VERSION)
}

/** 自包含主题对比页：14 套主题并排，含色板与用法。 */
export function renderThemePreviewHtml(lang = 'zh') {
  return renderThemePreviewHtmlBase(lang, DECK_VERSION)
}

/** 写主题对比页 + 每套主题 SVG 色板卡；默认不覆盖同名文件。 */
export function buildThemePreview(options = {}) {
  return buildThemePreviewBase(options, resolveLanguage, DECK_VERSION)
}

// ---------------------------------------------------------------------------
// 文本与文件名工具
// ---------------------------------------------------------------------------

export function clampInt(value, fallback, min, max) {
  const n = typeof value === 'number' ? Math.trunc(value) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// Windows 保留设备名：首个点之前的主名命中即不可用（NUL、com1、aux.report.html 都算）。
const WINDOWS_RESERVED_FILE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i

export function sanitizeFileName(input) {
  const base = String(input ?? 'deck').toWellFormed().trim().replace(/[\uFFFE\uFFFF]/g, '-').replace(/\.(html?|pptx|json)$/i, '')
  let cleaned = base
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (WINDOWS_RESERVED_FILE_NAME.test(cleaned)) cleaned = 'deck-' + cleaned
  return cleaned.slice(0, 120) || 'deck'
}

const DECK_ARTIFACT_EXTENSIONS = ['.html', '.pptx', '.json']

/**
 * 为三件套选择同一个可用文件名前缀。默认不覆盖：任一产物已存在时，
 * 整组改用 -1/-2… 后缀，避免新旧 deck 被静默混写。
 */
export function resolveDeckFileName(outputDir, requestedFileName, overwrite) {
  const existing = new Set(readdirSync(outputDir).map((name) => name.toLowerCase()))
  const isAvailable = (candidate) => DECK_ARTIFACT_EXTENSIONS.every((ext) => !existing.has((candidate + ext).toLowerCase()))
  if (overwrite || isAvailable(requestedFileName)) return requestedFileName
  for (let index = 1; index < 1000; index += 1) {
    const candidate = requestedFileName + '-' + index
    if (isAvailable(candidate)) return candidate
  }
  throw new Error('dsh-ppt：找不到可用的输出文件名（同名前缀超过 999 个），请更换 fileName 或显式允许 overwrite。')
}

export function splitSentences(value) {
  const text = String(value ?? '').trim()
  if (text === '') return []
  const parts = text.split(/(?<=[。！？])|(?<=[.!?…])\s+/).map((part) => part.trim()).filter(Boolean)
  return parts.length > 0 ? parts : [text]
}

export function truncate(value, max) {
  const text = String(value ?? '').trim()
  if (text.length <= max) return text
  return text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

function chunk(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// ---------------------------------------------------------------------------
// Markdown → deck（兼容纯 Markdown，并原生支持 ::: 版式块、[!TAKEAWAY] 与 source 注释）
// ---------------------------------------------------------------------------

function createSection(heading = '', level = 0, coverOnly = false) {
  return {
    heading,
    level,
    coverOnly,
    bullets: [],
    paragraphs: [],
    quote: [],
    table: null,
    notes: [],
    directive: null,
    formula: '',
    mermaid: '',
    code: '',
    codeLang: '',
    takeaway: '',
    source: '',
  }
}

function splitTableRow(line) {
  const trimmed = line.trim()
  const match = /^\|(.+)\|$/.exec(trimmed)
  if (match === null) return null
  return match[1].split('|').map((cell) => cell.trim())
}

function isTableSeparator(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell) || /^:?-+:?$/.test(cell))
}

const NOTES_COMMENT = /^<!--\s*(?:notes?|备注)\s*[:：]\s*([\s\S]*?)\s*-->$/i
const SOURCE_COMMENT = /^<!--\s*(?:source|来源|数据来源)\s*[:：]\s*([\s\S]*?)\s*-->$/i
const TAKEAWAY_COMMENT = /^<!--\s*(?:takeaway|结论|核心结论)\s*[:：]\s*([\s\S]*?)\s*-->$/i
const TAKEAWAY_CALLOUT = /^>\s*\[!(?:TAKEAWAY|结论|KEY)\]\s*(.*)$/i
const DIRECTIVE_OPEN = /^:::\s*([a-zA-Z][\w-]*)(?:\s+([\w-]+))?\s*$/
const DIRECTIVE_CLOSE = /^:::\s*$/

function resolveDirectiveSpec(rawLayout, rawVariant = '') {
  const key = String(rawLayout ?? '').trim().toLowerCase()
  const alias = LAYOUT_ALIASES[key]
  if (alias && CORE_LAYOUTS.has(alias.layout)) {
    return { layout: alias.layout, variant: rawVariant || alias.variant || '' }
  }
  if (CORE_LAYOUTS.has(key)) {
    return { layout: key, variant: rawVariant || '' }
  }
  return null
}

function quoteSlideFrom(section, ui) {
  const lines = [...section.quote]
  let attribution = ''
  const attrMatch = /^(?:——|—|--|-)\s*(.+)$/.exec(lines[lines.length - 1] ?? '')
  if (attrMatch !== null && lines.length > 1) {
    attribution = attrMatch[1]
    lines.pop()
  }
  return {
    layout: 'quote',
    kicker: ui.quoteKicker,
    title: truncate(lines.join(' '), 220),
    subtitle: attribution,
    ...(section.source ? { source: section.source } : {}),
  }
}

function paginateTable(slide, continuation = '（续）') {
  const rows = slide.rows
  const columns = Math.max(...rows.map((row) => row.length))
  if (columns > 8) throw new Error('dsh-ppt：表格最多 8 列，请拆成多个表格后重试 / tables support up to 8 columns')
  if (rows.some((row) => row.some((cell) => [...stripInlineMarkdown(cell)].length > 60))) {
    throw new Error('dsh-ppt：表格单元格最多 60 个字符，请精简或拆分内容后重试 / cells support up to 60 characters')
  }
  const padded = rows.map((row) => Array.from({ length: columns }, (_, i) => row[i] ?? ''))
  const pages = chunk(padded.slice(1), 8)
  if (pages.length === 0) pages.push([])
  return pages.map((body, index) => {
    const { notes, ...rest } = slide
    const title = slide.title + (index === 0 ? '' : continuation)
    return {
      ...rest,
      title,
      kicker: slide.kicker === slide.title ? title : slide.kicker,
      rows: [padded[0], ...body],
      ...(index === 0 && notes ? { notes } : {}),
    }
  })
}

function tableSlidesFrom(section, ui) {
  const table = section.table
  const rows = [table.header, ...table.rows]
  const heading = section.heading || ui.tableKicker
  const tableStyle = section.directive?.layout === 'table' && section.directive.variant
    ? section.directive.variant
    : undefined
  return paginateTable({
    layout: 'table',
    kicker: heading,
    title: heading,
    rows,
    ...(tableStyle ? { tableStyle } : {}),
    ...(section.takeaway ? { takeaway: section.takeaway } : {}),
    ...(section.source ? { source: section.source } : {}),
  }, ui.continuation)
}

function specialSlidesFor(section, ui) {
  const out = []
  if (section.quote.length > 0) out.push(quoteSlideFrom(section, ui))
  const dirLayout = section.directive?.layout
  const tableOwnedByDirective = dirLayout && ['marimekko', 'harvey', 'sankey', 'map', 'isometric'].includes(dirLayout)
  if (section.table !== null && !tableOwnedByDirective) out.push(...tableSlidesFrom(section, ui))
  if (out.length > 0 && section.notes.length > 0) out[0].notes = section.notes.join('\n')
  return out
}

function directiveSlideFrom(section, ui, pointIndexRef) {
  const spec = section.directive
  if (!spec || spec.layout === 'table') return null
  const label = section.heading || (ui.pointKicker + ' ' + (++pointIndexRef.count))
  const rawPoints = [
    ...section.bullets,
    ...section.paragraphs.slice(spec.layout === 'callout' ? 1 : 0),
  ]
  const items = normalizeSlideItems(rawPoints, spec.layout)
  const dirRows = section.table && ['marimekko', 'harvey', 'sankey', 'map', 'isometric'].includes(spec.layout)
    ? [section.table.header, ...section.table.rows]
    : undefined
  const effVariant = spec.variant || (spec.layout === 'mermaid' && section.mermaid ? detectMermaidMode(section.mermaid) : '')
  const slide = {
    layout: spec.layout,
    ...(effVariant ? { variant: effVariant } : {}),
    kicker: label,
    title: label,
    ...(section.formula ? { formula: section.formula } : {}),
    ...(section.mermaid ? { mermaid: section.mermaid } : {}),
    ...(spec.layout === 'callout' && section.paragraphs[0] ? { text: section.paragraphs[0] } : {}),
    ...(dirRows ? { rows: dirRows } : {}),
    ...(rawPoints.length > 0 ? { bullets: rawPoints } : {}),
    ...(items ? { items } : {}),
    ...(section.takeaway ? { takeaway: section.takeaway } : {}),
    ...(section.source ? { source: section.source } : {}),
  }
  if (section.notes.length > 0) slide.notes = section.notes.join('\n')
  return slide
}

export function parseMarkdownDeck(titleInput, content, lang = 'zh') {
  const language = resolveLanguage(lang)
  const ui = language.ui
  const title = String(titleInput ?? '').trim()
  let coverTitle = title
  let coverSubtitle = ''
  let coverSubtitleConsumed = false

  let body = String(content ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
  body = body.replace(/^---[ \t]*\n[\s\S]*?\n---[ \t]*\n?/, '')

  const sections = []
  let current = null
  let firstH1Seen = false
  let inDirective = false
  let awaitingTakeawayLine = false
  let inMathBlock = false
  let mathBlockLines = []
  let inMermaidFence = false
  let mermaidFenceMarker = ''
  let mermaidFenceLines = []
  let inCodeFence = false
  let codeFenceMarker = ''
  let codeFenceLang = ''
  let codeFenceLines = []

  const flush = () => {
    if (inMermaidFence && mermaidFenceLines.length > 0) {
      if (current === null) current = createSection()
      const pendingMermaid = mermaidFenceLines.join('\n').trim()
      if (pendingMermaid !== '') {
        current.mermaid = current.mermaid ? current.mermaid + '\n' + pendingMermaid : pendingMermaid
      }
    }
    if (inCodeFence && codeFenceLines.length > 0) {
      if (current === null) current = createSection()
      const pendingCode = codeFenceLines.join('\n').trimEnd()
      if (pendingCode.trim() !== '') {
        current.code = current.code ? current.code + '\n\n' + pendingCode : pendingCode
        if (!current.codeLang && codeFenceLang) current.codeLang = codeFenceLang
      }
    }
    if (
      current !== null &&
      (current.heading !== '' ||
        current.bullets.length > 0 ||
        current.paragraphs.length > 0 ||
        current.formula !== '' ||
        current.mermaid !== '' ||
        current.code !== '' ||
        current.table !== null ||
        current.quote.length > 0 ||
        current.directive !== null)
    ) {
      sections.push(current)
    }
    current = null
    inDirective = false
    awaitingTakeawayLine = false
    inMathBlock = false
    mathBlockLines = []
    inMermaidFence = false
    mermaidFenceMarker = ''
    mermaidFenceLines = []
    inCodeFence = false
    codeFenceMarker = ''
    codeFenceLang = ''
    codeFenceLines = []
  }

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (inMermaidFence) {
      if (line.startsWith(mermaidFenceMarker) && new RegExp('^' + mermaidFenceMarker + '\\s*$').test(line)) {
        if (current === null) current = createSection()
        const joinedMermaid = mermaidFenceLines.join('\n').trim()
        if (joinedMermaid !== '') {
          current.mermaid = current.mermaid ? current.mermaid + '\n' + joinedMermaid : joinedMermaid
        }
        inMermaidFence = false
        mermaidFenceMarker = ''
        mermaidFenceLines = []
      } else {
        mermaidFenceLines.push(rawLine)
      }
      continue
    }

    if (inCodeFence) {
      if (line.startsWith(codeFenceMarker) && new RegExp('^' + codeFenceMarker + '\\s*$').test(line)) {
        if (current === null) current = createSection()
        const joinedCode = codeFenceLines.join('\n').trimEnd()
        if (joinedCode.trim() !== '') {
          current.code = current.code ? current.code + '\n\n' + joinedCode : joinedCode
          if (!current.codeLang && codeFenceLang) current.codeLang = codeFenceLang
        }
        inCodeFence = false
        codeFenceMarker = ''
        codeFenceLang = ''
        codeFenceLines = []
      } else {
        codeFenceLines.push(rawLine)
      }
      continue
    }

    const mermaidOpen = /^(`{3,}|~{3,})\s*mermaid\b.*$/i.exec(line)
    if (mermaidOpen !== null) {
      if (current === null) current = createSection()
      inMermaidFence = true
      mermaidFenceMarker = mermaidOpen[1]
      mermaidFenceLines = []
      continue
    }

    const codeOpen = /^(`{3,}|~{3,})\s*([a-zA-Z][\w.+-]*)\s*$/.exec(line)
    if (codeOpen !== null) {
      if (current === null) current = createSection()
      inCodeFence = true
      codeFenceMarker = codeOpen[1]
      codeFenceLang = codeOpen[2]
      codeFenceLines = []
      continue
    }

    if (inMathBlock) {
      if (line === '$$') {
        if (current === null) current = createSection()
        const joinedFormula = mathBlockLines.join(' ').trim()
        if (joinedFormula !== '') {
          current.formula = current.formula ? current.formula + ' ; ' + joinedFormula : joinedFormula
        }
        inMathBlock = false
        mathBlockLines = []
      } else {
        mathBlockLines.push(line)
      }
      continue
    }

    if (line === '$$') {
      if (current === null) current = createSection()
      inMathBlock = true
      mathBlockLines = []
      continue
    }

    if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
      if (current === null) current = createSection()
      const inlineDisplayFormula = line.slice(2, -2).trim()
      if (inlineDisplayFormula !== '') {
        current.formula = current.formula ? current.formula + ' ; ' + inlineDisplayFormula : inlineDisplayFormula
      }
      continue
    }

    if (line === '') {
      awaitingTakeawayLine = false
      if (!inDirective && current !== null && current.heading === '') flush()
      continue
    }

    if (DIRECTIVE_CLOSE.test(line)) {
      inDirective = false
      continue
    }

    const dirOpen = DIRECTIVE_OPEN.exec(line)
    if (dirOpen !== null) {
      const resolved = resolveDirectiveSpec(dirOpen[1], dirOpen[2])
      if (resolved) {
        if (current === null) current = createSection()
        if (current.coverOnly) {
          flush()
          current = createSection()
        }
        current.directive = resolved
        inDirective = true
        continue
      }
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line)
    if (headingMatch !== null) {
      const level = headingMatch[1].length
      const heading = stripInlineMarkdown(headingMatch[2])
      if (level === 1 && !firstH1Seen) {
        firstH1Seen = true
        if (coverTitle === '') coverTitle = heading
        flush()
        current = createSection(heading, level, true)
        continue
      }
      flush()
      current = createSection(heading, level, false)
      continue
    }

    const notesMatch = NOTES_COMMENT.exec(line)
    if (notesMatch !== null && notesMatch[1].trim() !== '') {
      if (current === null) current = createSection()
      current.notes.push(notesMatch[1].trim())
      continue
    }

    const sourceMatch = SOURCE_COMMENT.exec(line)
    if (sourceMatch !== null && sourceMatch[1].trim() !== '') {
      if (current === null) current = createSection()
      current.source = stripInlineMarkdown(sourceMatch[1])
      continue
    }

    const takeawayCommentMatch = TAKEAWAY_COMMENT.exec(line)
    if (takeawayCommentMatch !== null && takeawayCommentMatch[1].trim() !== '') {
      if (current === null) current = createSection()
      current.takeaway = cleanRichText(takeawayCommentMatch[1])
      continue
    }

    const takeawayCalloutMatch = TAKEAWAY_CALLOUT.exec(line)
    if (takeawayCalloutMatch !== null) {
      if (current === null) current = createSection()
      const inlineTakeaway = cleanRichText(takeawayCalloutMatch[1])
      if (inlineTakeaway !== '') {
        current.takeaway = inlineTakeaway
        awaitingTakeawayLine = false
      } else {
        awaitingTakeawayLine = true
      }
      continue
    }

    if (awaitingTakeawayLine && line.startsWith('>')) {
      const nextTakeaway = cleanRichText(line.replace(/^>\s?/, ''))
      if (nextTakeaway !== '') current.takeaway = nextTakeaway
      awaitingTakeawayLine = false
      continue
    }
    awaitingTakeawayLine = false

    if (inDirective && current?.directive?.layout === 'mermaid') {
      current.mermaid = current.mermaid ? current.mermaid + '\n' + rawLine : rawLine
      continue
    }

    const bulletMatch = /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/.exec(line)
    if (bulletMatch !== null) {
      const bullet = cleanRichText(bulletMatch[1])
      if (bullet !== '') {
        if (current === null) current = createSection()
        current.bullets.push(bullet)
      }
      continue
    }

    const tableCells = splitTableRow(line)
    if (tableCells !== null) {
      if (current === null) current = createSection()
      if (isTableSeparator(tableCells)) continue
      if (current.table === null) {
        current.table = { header: tableCells.map((cell) => cleanRichText(cell)), rows: [] }
      } else {
        current.table.rows.push(tableCells.map((cell) => cleanRichText(cell)))
      }
      continue
    }

    const quoteMatch = /^>\s?(.*)$/.exec(line)
    if (quoteMatch !== null) {
      const quoted = cleanRichText(quoteMatch[1])
      if (quoted !== '') {
        if (current === null) current = createSection()
        current.quote.push(quoted)
      }
      continue
    }

    const paragraph = cleanRichText(line)
    if (paragraph === '') continue
    if (current === null) current = createSection()
    current.paragraphs.push(paragraph)
  }
  flush()

  const slides = []
  const coverSource = sections.find((section) => section.coverOnly === true)
  if (coverSource !== null && coverSource !== undefined) {
    const coverText = coverSource.paragraphs[0] ?? coverSource.bullets[0] ?? ''
    if (coverSubtitle === '') {
      coverSubtitle = truncate(stripInlineMarkdown(coverText), 180)
      coverSubtitleConsumed = true
    }
  }

  let bodySections = sections.filter((section) => section.coverOnly !== true)
  if (bodySections.length === 0 && coverSource !== null && coverSource !== undefined) {
    const usedParagraph = coverSource.paragraphs.length > 0
    const extras = [
      ...(usedParagraph ? coverSource.bullets : coverSource.bullets.slice(1)),
      ...coverSource.paragraphs.slice(usedParagraph ? 1 : 0),
    ]
    if (extras.length > 0) {
      const synthetic = createSection()
      synthetic.bullets = extras
      synthetic.takeaway = coverSource.takeaway
      synthetic.source = coverSource.source
      bodySections = [synthetic]
    }
  }

  if (coverSource && (coverSource.table !== null || coverSource.quote.length > 0 || coverSource.mermaid !== '')) {
    const special = createSection()
    special.table = coverSource.table
    special.quote = coverSource.quote
    special.mermaid = coverSource.mermaid
    special.notes = coverSource.notes
    special.takeaway = coverSource.takeaway
    special.source = coverSource.source
    bodySections.unshift(special)
  }

  if (bodySections.length === 0) {
    const allText = coverSource !== null && coverSource !== undefined
      ? [...coverSource.bullets, ...coverSource.paragraphs].join(' ')
      : String(content ?? '').trim()
    if (coverSubtitle === '') coverSubtitle = truncate(splitSentences(stripInlineMarkdown(allText))[0] ?? '', 180)
    slides.push({ layout: 'cover', kicker: ui.coverKicker, title: coverTitle || 'Untitled', subtitle: coverSubtitle })
    if (coverSubtitle !== '') {
      slides.push({ layout: 'statement', kicker: ui.statementKicker, title: coverSubtitle, subtitle: coverTitle })
    }
    slides.push({ layout: 'closing', title: ui.closingTitle, subtitle: coverTitle || 'Untitled' })
    return { title: coverTitle || 'Untitled', subtitle: coverSubtitle, slides }
  }

  const hadHeadings = bodySections.some(
    (section) => section.heading !== '' || section.directive !== null || section.mermaid !== '',
  )

  if (!hadHeadings) {
    const ordered = bodySections.map((section) => ({
      section,
      sentences: [...section.bullets, ...section.paragraphs].flatMap((part) => splitSentences(part)),
    }))
    const firstSentence = ordered[0]?.sentences[0] ?? ''
    if (coverSubtitle === '') coverSubtitle = truncate(stripInlineMarkdown(firstSentence), 180)
    const bodySlides = []
    let pointIndex = 0
    ordered.forEach((group, groupIndex) => {
      const specials = specialSlidesFor(group.section, ui)
      bodySlides.push(...specials)
      const sentences = (groupIndex === 0 && !coverSubtitleConsumed) ? group.sentences.slice(1) : group.sentences
      for (const points of chunk(sentences, 5)) {
        pointIndex += 1
        const slide = {
          layout: 'bullets',
          kicker: ui.pointKicker + ' ' + pointIndex,
          title: truncate(stripInlineMarkdown(points[0]), 40) || ui.pointKicker + ' ' + pointIndex,
          bullets: points,
          ...(group.section.takeaway ? { takeaway: group.section.takeaway } : {}),
          ...(group.section.source ? { source: group.section.source } : {}),
        }
        if (specials.length === 0 && group.section.notes.length > 0) slide.notes = group.section.notes.join('\n')
        bodySlides.push(slide)
      }
    })
    slides.push({ layout: 'cover', kicker: ui.coverKicker, title: coverTitle || 'Untitled', subtitle: coverSubtitle })
    if (bodySlides.length === 0) {
      if (coverSubtitle !== '') {
        slides.push({ layout: 'statement', kicker: ui.statementKicker, title: coverSubtitle, subtitle: coverTitle || 'Untitled' })
      }
    } else {
      slides.push(...bodySlides)
    }
    slides.push({ layout: 'closing', title: ui.closingTitle, subtitle: coverTitle || 'Untitled' })
    return { title: coverTitle || 'Untitled', subtitle: coverSubtitle, slides }
  }

  slides.push({ layout: 'cover', kicker: ui.coverKicker, title: coverTitle || 'Untitled', subtitle: coverSubtitle })
  const pointRef = { count: 0 }
  for (const section of bodySections) {
    const notes = section.notes.join('\n')
    const specials = specialSlidesFor(section, ui)
    slides.push(...specials)

    if (section.directive && section.directive.layout !== 'table') {
      const dirSlide = directiveSlideFrom(section, ui, pointRef)
      if (dirSlide) slides.push(dirSlide)
      continue
    }

    if (section.mermaid !== '') {
      const label = section.heading || (ui.pointKicker + ' ' + (++pointRef.count))
      const rawPoints = [...section.bullets, ...section.paragraphs]
      const slide = {
        layout: 'mermaid',
        variant: detectMermaidMode(section.mermaid),
        kicker: label,
        title: label,
        mermaid: section.mermaid,
        ...(rawPoints.length > 0 ? { bullets: rawPoints } : {}),
        ...(section.takeaway ? { takeaway: section.takeaway } : {}),
        ...(section.source ? { source: section.source } : {}),
      }
      if (specials.length === 0 && notes !== '') slide.notes = notes
      slides.push(slide)
      continue
    }

    if (section.code !== '') {
      const label = section.heading || (ui.pointKicker + ' ' + (++pointRef.count))
      const rawPoints = [...section.bullets, ...section.paragraphs]
      const slide = {
        layout: 'code',
        kicker: label,
        title: label,
        code: section.code,
        ...(section.codeLang ? { language: section.codeLang } : {}),
        ...(rawPoints.length > 0 ? { bullets: rawPoints } : {}),
        ...(section.takeaway ? { takeaway: section.takeaway } : {}),
        ...(section.source ? { source: section.source } : {}),
      }
      if (specials.length === 0 && notes !== '') slide.notes = notes
      slides.push(slide)
      continue
    }

    if (section.formula !== '') {
      const label = section.heading || (ui.pointKicker + ' ' + (++pointRef.count))
      const rawPoints = [...section.bullets, ...section.paragraphs]
      const items = normalizeSlideItems(rawPoints, 'callout')
      const slide = {
        layout: 'callout',
        variant: 'formula',
        kicker: label,
        title: label,
        formula: section.formula,
        ...(rawPoints.length > 0 ? { bullets: rawPoints } : {}),
        ...(items ? { items } : {}),
        ...(section.takeaway ? { takeaway: section.takeaway } : {}),
        ...(section.source ? { source: section.source } : {}),
      }
      if (specials.length === 0 && notes !== '') slide.notes = notes
      slides.push(slide)
      continue
    }

    if (section.heading === '') {
      const points = [...section.bullets, ...section.paragraphs].flatMap((part) => splitSentences(part))
      for (const [pageIndex, pagePoints] of chunk(points, 8).entries()) {
        pointRef.count += 1
        const slide = {
          layout: 'bullets',
          kicker: ui.pointKicker + ' ' + pointRef.count,
          title: truncate(stripInlineMarkdown(pagePoints[0]), 40) || ui.pointKicker + ' ' + pointRef.count,
          bullets: pagePoints,
          ...(section.takeaway ? { takeaway: section.takeaway } : {}),
          ...(section.source ? { source: section.source } : {}),
        }
        if (pageIndex === 0 && specials.length === 0 && notes !== '') slide.notes = notes
        slides.push(slide)
      }
      continue
    }

    const points = [
      ...section.bullets,
      ...section.paragraphs.flatMap((part) => splitSentences(part)),
    ]
    const pages = chunk(points, 8)
    if (pages.length > 0) {
      pages.forEach((pagePoints, pageIndex) => {
        const label = pageIndex === 0 ? section.heading : section.heading + ui.continuation
        const slide = {
          layout: 'bullets',
          kicker: label,
          title: label,
          bullets: pagePoints,
          ...(section.takeaway ? { takeaway: section.takeaway } : {}),
          ...(section.source ? { source: section.source } : {}),
        }
        if (pageIndex === 0 && specials.length === 0 && notes !== '') slide.notes = notes
        slides.push(slide)
      })
    } else if (specials.length === 0) {
      const slide = {
        layout: 'section',
        kicker: section.heading,
        title: section.heading,
        ...(section.source ? { source: section.source } : {}),
      }
      if (notes !== '') slide.notes = notes
      slides.push(slide)
    }
  }
  slides.push({ layout: 'closing', title: ui.closingTitle, subtitle: coverTitle || 'Untitled' })
  return { title: coverTitle || 'Untitled', subtitle: coverSubtitle, slides }
}

// ---------------------------------------------------------------------------
// 结构化幻灯片规范化
// ---------------------------------------------------------------------------

export const SLIDE_LAYOUTS = new Set([
  ...CORE_LAYOUTS,
  ...Object.keys(LAYOUT_ALIASES),
  ...deckMedia.MEDIA_LAYOUTS,
])

const VALID_TABLE_STYLES = new Set(['consulting', 'booktabs', 'minimal', 'banded', 'harvey'])
const VALID_CHROME_STYLES = new Set(CHROME_STYLES)

function normalizeSlide(raw, index) {
  const result = normalizeSlideContent(raw, index)
  const visual = normalizeVisual(raw?.visual)
  return visual ? { ...result, visual } : result
}

function normalizeSlideContent(raw, index) {
  const source = (raw !== null && typeof raw === 'object') ? raw : {}
  const rawLayoutKey = String(source.layout ?? '').trim().toLowerCase()
  const alias = LAYOUT_ALIASES[rawLayoutKey]
  const candidateLayout = alias ? alias.layout : rawLayoutKey
  const rawMermaid = typeof source.mermaid === 'string'
    ? source.mermaid.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()
    : ''
  const layout = (CORE_LAYOUTS.has(candidateLayout) || deckMedia.MEDIA_LAYOUTS.has(candidateLayout))
    ? candidateLayout
    : source.chart
      ? 'chart'
      : (source.image || (Array.isArray(source.images) && source.images.length > 0))
        ? 'image-right'
        : rawMermaid !== ''
          ? 'mermaid'
          : 'bullets'

  const variant = stripInlineMarkdown(source.variant ?? alias?.variant ?? '')
  const rawChrome = typeof source.chrome === 'string' ? source.chrome.trim() : ''
  const chrome = VALID_CHROME_STYLES.has(rawChrome) ? rawChrome : undefined
  const rawMat = typeof source.cardMaterial === 'string' ? source.cardMaterial.trim().toLowerCase() : ''
  const cardMaterial = ['solid', 'frameless', 'glass', 'editorial-rule'].includes(rawMat) ? rawMat : undefined
  const rawIconMode = typeof source.iconMode === 'string' ? source.iconMode.trim().toLowerCase() : ''
  const iconMode = ['off', 'explicit', 'auto'].includes(rawIconMode) ? rawIconMode : undefined
  const title = stripInlineMarkdown(source.title ?? '')
  const subtitle = cleanRichText(source.subtitle ?? '')
  const kicker = stripInlineMarkdown(source.kicker ?? '')
  const text = cleanRichText(source.text ?? '')
  const formula = typeof source.formula === 'string'
    ? source.formula.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()
    : ''
  const mermaid = rawMermaid !== ''
    ? rawMermaid
    : (layout === 'mermaid' && typeof source.text === 'string' && source.text.trim() !== ''
        ? source.text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()
        : '')
  const takeaway = cleanRichText(source.takeaway ?? '')
  const slideSource = stripInlineMarkdown(source.source ?? '')
  const notes = String(source.notes ?? '').trim()
  const activeIndex = Number.isInteger(source.activeIndex) && source.activeIndex >= 1 ? source.activeIndex : undefined
  const rawTableStyle = String(source.tableStyle ?? '').trim().toLowerCase()
  const tableStyle = VALID_TABLE_STYLES.has(rawTableStyle) ? rawTableStyle : undefined
  const start = source.start !== undefined && source.start !== null && Number.isFinite(Number(source.start)) ? Number(source.start) : undefined
  const span = source.span !== undefined && source.span !== null && Number.isFinite(Number(source.span)) ? Number(source.span) : undefined

  let bullets = []
  if (Array.isArray(source.bullets)) {
    bullets = source.bullets.map((item) => cleanRichText(String(item))).filter(Boolean)
  } else if (typeof source.bullets === 'string' && source.bullets.trim() !== '') {
    bullets = splitSentences(cleanRichText(source.bullets))
  }

  const hasStringColumns = Array.isArray(source.columns) && source.columns.length > 0 && source.columns.every((c) => typeof c === 'string')
  const columns = hasStringColumns
    ? source.columns.map((c) => stripInlineMarkdown(c)).filter(Boolean)
    : undefined

  const fencedTextMatch = (!source.code && typeof source.text === 'string')
    ? /```([a-zA-Z0-9_-]*)\r?\n([\s\S]+?)\r?\n```/.exec(source.text)
    : null
  const rawCode = typeof source.code === 'string'
    ? source.code.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trimEnd()
    : (fencedTextMatch ? fencedTextMatch[2].replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trimEnd() : '')
  const codeLanguage = stripInlineMarkdown(source.language ?? (fencedTextMatch?.[1] || ''))
  const filename = stripInlineMarkdown(source.filename ?? '')
  const url = stripInlineMarkdown(source.url ?? '')
  const rawCoverPattern = String(source.coverPattern ?? '').trim().toLowerCase()
  const coverPattern = ['dots', 'grid', 'rings', 'waves', 'isometric-mesh', 'editorial-arcs'].includes(rawCoverPattern) ? rawCoverPattern : ''
  const imageBrief = normalizeImageBrief(source.imageBrief)
  const xLabel = stripInlineMarkdown(source.xLabel ?? '')
  const yLabel = stripInlineMarkdown(source.yLabel ?? '')
  const hasStringQuadrants = Array.isArray(source.quadrants) && source.quadrants.length === 4 && source.quadrants.every((q) => typeof q === 'string')
  const quadrantLabels = hasStringQuadrants ? source.quadrants.map((q) => stripInlineMarkdown(q)) : undefined

  const rawItemsInput = source.items
    ?? source.cards
    ?? source.metrics
    ?? (!hasStringColumns ? source.columns : undefined)
    ?? source.steps
    ?? (!hasStringQuadrants && layout !== 'quadrant' ? source.quadrants : undefined)
    ?? (layout === 'sankey' && bullets.length > 0 ? bullets : undefined)
  const items = normalizeSlideItems(rawItemsInput, layout)

  const rawEvidenceIds = Array.isArray(source.evidenceIds)
    ? [...new Set(source.evidenceIds.map((id) => stripInlineMarkdown(id).trim().toUpperCase()).filter(Boolean))].slice(0, 12)
    : undefined
  const rawReveal = String(source.reveal ?? '').trim().toLowerCase()
  const reveal = rawReveal === 'step' || rawReveal === 'all' ? rawReveal : undefined
  const rawTransition = String(source.transition ?? '').trim().toLowerCase()
  const transition = ['fade', 'push', 'wipe', 'cover', 'cut', 'none'].includes(rawTransition) ? rawTransition : undefined

  const commonExtras = {
    ...(variant !== '' ? { variant } : {}),
    ...(chrome ? { chrome } : {}),
    ...(cardMaterial ? { cardMaterial } : {}),
    ...(iconMode ? { iconMode } : {}),
    ...(reveal ? { reveal } : {}),
    ...(transition ? { transition } : {}),
    ...(formula !== '' ? { formula } : {}),
    ...(mermaid !== '' ? { mermaid } : {}),
    ...(rawCode !== '' ? { code: rawCode } : {}),
    ...(codeLanguage !== '' ? { language: codeLanguage } : {}),
    ...(filename !== '' ? { filename } : {}),
    ...(url !== '' ? { url } : {}),
    ...(coverPattern !== '' ? { coverPattern } : {}),
    ...(imageBrief ? { imageBrief } : {}),
    ...(xLabel !== '' ? { xLabel } : {}),
    ...(yLabel !== '' ? { yLabel } : {}),
    ...(quadrantLabels ? { quadrants: quadrantLabels } : {}),
    ...(takeaway !== '' ? { takeaway } : {}),
    ...(slideSource !== '' ? { source: slideSource } : {}),
    ...(rawEvidenceIds?.length ? { evidenceIds: rawEvidenceIds } : {}),
    ...(activeIndex !== undefined ? { activeIndex } : {}),
    ...(columns?.length ? { columns } : {}),
    ...(start !== undefined ? { start } : {}),
    ...(span !== undefined ? { span } : {}),
    ...(items ? { items } : {}),
    ...(notes !== '' ? { notes } : {}),
  }

  if (deckMedia.MEDIA_LAYOUTS.has(layout)) {
    const mediaSource = alias?.chartKind && source.chart
      ? { ...source, variant: variant || source.variant, chart: { ...source.chart, kind: alias.chartKind } }
      : (variant ? { ...source, variant } : source)
    return deckMedia.normalizeMediaSlide(
      mediaSource,
      { layout, kicker, title, subtitle, text, bullets, ...commonExtras },
      index,
    )
  }

  if (layout === 'statement' && title === '' && text !== '') {
    return { layout, kicker, title: stripInlineMarkdown(text), subtitle: subtitle || '', bullets, ...commonExtras }
  }

  if (layout === 'quote') {
    const quoteText = title !== '' ? title : stripInlineMarkdown(text)
    if (quoteText === '') {
      return { layout: 'statement', kicker, title: stripInlineMarkdown(subtitle), subtitle: '', bullets, ...commonExtras }
    }
    return { layout, kicker, title: truncate(quoteText, 220), subtitle, ...commonExtras }
  }

  if (layout === 'harvey' || layout === 'marimekko' || layout === 'sankey' || layout === 'quadrant' || layout === 'radar' || layout === 'dumbbell' || layout === 'heatmap' || layout === 'map' || layout === 'isometric' || layout === 'treemap') {
    let rows = []
    if (Array.isArray(source.rows)) {
      rows = source.rows
        .map((row) => (Array.isArray(row) ? row : [row]).map((cell) => cleanRichText(String(cell))))
        .filter((row) => row.some((cell) => cell !== ''))
    }
    return {
      layout,
      kicker: kicker || title,
      title,
      subtitle,
      text,
      bullets,
      ...(rows.length ? { rows } : {}),
      ...(tableStyle ? { tableStyle } : {}),
      ...(layout === 'radar' && source.chart ? { chart: deckMedia.normalizeChart(source.chart, index + 1) } : {}),
      ...commonExtras,
    }
  }

  if (layout === 'table') {
    let rows = []
    if (Array.isArray(source.rows)) {
      rows = source.rows
        .map((row) => (Array.isArray(row) ? row : [row]).map((cell) => cleanRichText(String(cell))))
        .filter((row) => row.some((cell) => cell !== ''))
    }
    if (rows.length === 0) {
      return { layout: 'bullets', kicker, title, subtitle, bullets, ...commonExtras }
    }
    return {
      layout,
      kicker: kicker || title,
      title,
      rows,
      ...(tableStyle ? { tableStyle } : {}),
      ...commonExtras,
    }
  }

  const preservedImage = (layout === 'cover' || layout === 'mockup') && source.image && typeof source.image === 'object'
    ? { image: source.image }
    : {}
  return { layout, kicker, title, subtitle, text, bullets, ...preservedImage, ...commonExtras }
}

function checkSlideLimit(slides, limit) {
  if (slides.length > limit) {
    throw new Error('dsh-ppt：生成后共 ' + slides.length + ' 页，超过 maxSlides=' + limit
      + '，请提高 maxSlides（最多 120）或拆分内容 / generated ' + slides.length + ' slides; raise maxSlides or split the deck')
  }
}

export function normalizeSlides(rawSlides, maxSlides = 60, lang = 'zh') {
  if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
    throw new Error('dsh-ppt：slides 必须是非空数组（每个元素是 { layout, title, subtitle, kicker, bullets } 对象）')
  }
  const limit = clampInt(maxSlides, 60, 1, 120)
  const ui = resolveLanguage(lang).ui
  const slides = rawSlides
    .map(normalizeSlide)
    .flatMap((slide) => (slide.layout === 'table' ? paginateTable(slide, ui.continuation) : [slide]))
  checkSlideLimit(slides, limit)
  if (slides.length === 0) throw new Error('dsh-ppt：slides 规范化后为空')
  return slides
}

// ---------------------------------------------------------------------------
// 构建入口与原子落盘
// ---------------------------------------------------------------------------

export function normalizeBuildOptions(options = {}) {
  const title = String(options.title ?? '').trim()
  if (title === '') throw new Error('dsh-ppt：title 不能为空')
  const theme = resolveTheme(options.theme)
  const language = resolveLanguage(options.lang)
  const motion = resolveMotion(options.motion)
  const maxSlides = clampInt(options.maxSlides, 60, 3, 120)
  let deck
  if (Array.isArray(options.slides) && options.slides.length > 0) {
    deck = {
      title,
      subtitle: stripInlineMarkdown(options.subtitle ?? ''),
      slides: normalizeSlides(options.slides, maxSlides, language.id),
    }
  } else {
    const content = String(options.content ?? '').trim()
    if (content === '') throw new Error('dsh-ppt：content 不能为空（或用 slides 传结构化幻灯片）')
    deck = parseMarkdownDeck(title, content, language.id)
    checkSlideLimit(deck.slides, maxSlides)
  }
  if (deck.slides.length < 1) throw new Error('dsh-ppt：没有可生成的幻灯片')
  const outputDir = resolvePath(String(options.outputDir ?? '.').trim() || '.')
  const fileName = sanitizeFileName(options.fileName ?? title)
  const overwrite = options.overwrite === true
  const rawMotionProfile = String(options.motionProfile ?? '').trim().toLowerCase()
  const motionProfile = ['subtle', 'executive', 'keynote'].includes(rawMotionProfile) ? rawMotionProfile : undefined
  return { title, theme, language, motion, ...(motionProfile ? { motionProfile } : {}), deck, outputDir, fileName, overwrite }
}

/**
 * 三件套落盘：三份内容全部先写同目录临时文件，再逐个 rename 提交。
 * 任一步失败都清理临时文件，并把已提交的目标恢复为调用前的内容，
 * 避免出现「json/html 已更新、pptx 还是旧的」这类混版状态。
 */
export function commitDeckArtifacts(artifacts) {
  const stamp = process.pid.toString(36) + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
  const items = artifacts.map((item, index) => ({ ...item, tempPath: item.path + '.' + stamp + '-' + index + '.tmp' }))
  const removeTemp = (item) => {
    try {
      rmSync(item.tempPath, { force: true })
    } catch {}
  }

  const previous = new Map()
  for (const item of items) {
    if (!existsSync(item.path)) continue
    try {
      previous.set(item.path, readFileSync(item.path))
    } catch (error) {
      throw new Error('dsh-ppt：三件套写入失败（' + item.path + ' 已存在但无法读取），原文件未改动：' + error.message)
    }
  }

  let written = 0
  try {
    for (const item of items) {
      writeFileSync(item.tempPath, item.data, item.encoding)
      written += 1
    }
  } catch (error) {
    for (const item of items.slice(0, written + 1)) removeTemp(item)
    throw new Error('dsh-ppt：写入临时文件失败（' + items[written].path + '），原三件套未改动：' + error.message)
  }

  const committed = []
  try {
    for (const item of items) {
      renameSync(item.tempPath, item.path)
      committed.push(item)
    }
  } catch (error) {
    const failedPath = items[committed.length].path
    for (const item of items) removeTemp(item)
    for (const item of committed) {
      try {
        const previousData = previous.get(item.path)
        if (previousData === undefined) rmSync(item.path, { force: true })
        else writeFileSync(item.path, previousData)
      } catch {}
    }
    throw new Error('dsh-ppt：提交三件套失败（' + failedPath + '），已回滚为原文件：' + error.message)
  }
}

export function buildDeck(options = {}) {
  if (options.dataModel !== undefined) {
    throw new Error('dsh-ppt：数据绑定请使用 deck-advanced.mjs 的 buildDeckAsync / Data models require buildDeckAsync from deck-advanced.mjs')
  }
  if (
    options.brand ||
    options.template ||
    options.referencePptx ||
    options.slides?.some((slide) => deckMedia.MEDIA_LAYOUTS.has(slide.layout) || slide.image || slide.images?.length || slide.chart)
  ) {
    throw new Error('dsh-ppt：图片、图表、模板与品牌请使用异步 buildDeckAsync 或 ppt_create / CLI')
  }
  const normalized = normalizeBuildOptions(options)
  const { title, theme, language, motion, deck, outputDir, overwrite } = normalized
  mkdirSync(outputDir, { recursive: true })
  const fileName = resolveDeckFileName(outputDir, normalized.fileName, overwrite)

  const rawTargetMin = options.targetMinutes !== undefined && options.targetMinutes !== null
    ? Number(options.targetMinutes)
    : NaN
  const targetMinutes = Number.isFinite(rawTargetMin) && rawTargetMin > 0 ? rawTargetMin : undefined

  const manifest = {
    version: DECK_VERSION,
    title,
    theme: theme.id,
    language: language.id,
    motion,
    ...(normalized.motionProfile ? { motionProfile: normalized.motionProfile } : {}),
    ...(targetMinutes !== undefined ? { targetMinutes } : {}),
    slideCount: deck.slides.length,
    slides: deck.slides,
  }
  const jsonPath = resolvePath(outputDir, fileName + '.json')
  const htmlPath = resolvePath(outputDir, fileName + '.html')
  const pptxPath = resolvePath(outputDir, fileName + '.pptx')
  const handoutPath = options.handout === true ? resolvePath(outputDir, fileName + '.handout.md') : undefined
  const onePagerPath = options.onePager === true ? resolvePath(outputDir, fileName + '.onepager.html') : undefined

  const artifacts = [
    { path: jsonPath, data: JSON.stringify(manifest, null, 2) + '\n', encoding: 'utf8' },
    { path: htmlPath, data: renderHtml(manifest, theme, language, { pptx: pptxPath, json: jsonPath, ...(handoutPath ? { handout: handoutPath } : {}), ...(onePagerPath ? { onepager: onePagerPath } : {}) }), encoding: 'utf8' },
    { path: pptxPath, data: buildPptx(manifest, theme, language) },
  ]
  if (handoutPath) {
    artifacts.push({ path: handoutPath, data: renderHandoutMarkdown(manifest, language.id), encoding: 'utf8' })
  }
  if (onePagerPath) {
    artifacts.push({ path: onePagerPath, data: renderOnePagerHtml(manifest, language.id), encoding: 'utf8' })
  }
  commitDeckArtifacts(artifacts)

  return {
    ok: true,
    title,
    theme: theme.id,
    language: language.id,
    slideCount: deck.slides.length,
    outputDir,
    files: {
      html: htmlPath,
      pptx: pptxPath,
      json: jsonPath,
    },
    htmlPath,
    pptxPath,
    jsonPath,
    ...(handoutPath ? { handoutPath } : {}),
    ...(onePagerPath ? { onePagerPath } : {}),
  }
}

// ---------------------------------------------------------------------------
// HTML 网页放映
// ---------------------------------------------------------------------------

export function renderHtml(manifest, themeInput, languageInput, files = {}) {
  const t = themeInput?.id ? themeInput : resolveTheme(themeInput)
  const tk = t.tokens
  const lang = languageInput?.id ? languageInput : resolveLanguage(languageInput)
  const ui = lang.ui
  const motion = manifest.motion !== false
  const motionCss = motion
    ? `body.motion .slide.is-active{animation:slide-in .45s cubic-bezier(.22,.8,.36,1)}
body.motion .slide.is-active[data-transition="push"]{animation:slide-push .42s cubic-bezier(.22,.8,.36,1)}
body.motion .slide.is-active[data-transition="wipe"]{animation:slide-wipe .42s cubic-bezier(.22,.8,.36,1)}
body.motion .slide.is-active[data-transition="cover"]{animation:slide-cover .42s cubic-bezier(.22,.8,.36,1)}
body.motion .slide.is-active[data-transition="cut"],body.motion .slide.is-active[data-transition="none"]{animation:none}
@keyframes slide-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes slide-push{from{opacity:.15;transform:translateX(56px)}to{opacity:1;transform:none}}
@keyframes slide-wipe{from{clip-path:inset(0 100% 0 0);opacity:.6}to{clip-path:inset(0 0 0 0);opacity:1}}
@keyframes slide-cover{from{opacity:.25;transform:translateY(36px) scale(.985)}to{opacity:1;transform:none}}
body.motion .bullets li{
  opacity:0;animation:bullet-in .55s cubic-bezier(.22,.8,.36,1) forwards;
  animation-delay:calc(var(--i, 0)*90ms + .12s);
}
@keyframes bullet-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
body.motion .slide[data-reveal="step"] [data-reveal-step]{opacity:0;transform:translateY(14px);transition:opacity .38s ease,transform .38s ease}
body.motion .slide[data-reveal="step"] [data-reveal-step].is-revealed,body.overview .slide[data-reveal="step"] [data-reveal-step],body.is-embedded .slide[data-reveal="step"] [data-reveal-step]{opacity:1;transform:none}`
    : ''
  const needsMediaCss = Boolean(
    manifest.brand?.logoAssetId ||
    manifest.brand?.footer ||
    manifest.brand?.watermark ||
    manifest.slides.some((s) => deckMedia.MEDIA_LAYOUTS.has(s.layout) || s.image || (Array.isArray(s.images) && s.images.length > 0) || s.chart)
  )
  const treeShakenLayoutCss = buildLayoutCss(manifest.slides)
  const slides = manifest.slides.map((slide, index) => {
    const label = slide.title || slide.kicker || (ui.slide + ' ' + (index + 1))
    return '<div class="slide-frame" data-frame="' + (index + 1) + '" tabindex="-1" role="button" aria-label="' + escapeHtml(String(label)) + '">' +
      renderHtmlSlide(slide, index, ui, lang.id, manifest, t) + '</div>'
  }).join('\n')
  const themeLabel = t.name[lang.id] ?? t.name.en
  const total = manifest.slides.length
  const delivery = renderDelivery(manifest, files, lang.id)
  const dataView = renderDataView(manifest, t)

  const ambientCss = t.dark
    ? `radial-gradient(42% 34% at 82% 18%, ${hexToRgba(t.palette.accent, 0.16)}, transparent 70%),
    radial-gradient(36% 30% at 12% 86%, ${hexToRgba(t.palette.accent2, 0.11)}, transparent 70%),
    radial-gradient(70% 60% at 50% 50%, ${hexToRgba(t.palette.panel, 0.45)}, transparent 100%)`
    : `radial-gradient(48% 36% at 90% 8%, ${hexToRgba(t.palette.accent, 0.045)}, transparent 72%)`

  return `<!DOCTYPE html>
<html lang="${lang.attr}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="data:,">
<title>${escapeHtml(manifest.title)}</title>
<style>
:root{
  --bg:${t.palette.bg};
  --panel:${t.palette.panel};
  --fg:${t.palette.fg};
  --muted:${t.palette.muted};
  --accent:${t.palette.accent};
  --accent2:${t.palette.accent2};
  --surface1:${tk.surface1};
  --surface2:${tk.surface2};
  --hairline:${tk.hairline};
  --ink-secondary:${tk.inkSecondary};
  --ink-on-accent:${tk.inkOnAccent};
  --accent-text:${tk.accentText};
  --accent-soft:${tk.accentSoft};
  --positive:${tk.positive};
  --negative:${tk.negative};
  --warning:${tk.warning};
  --cover-bg:${tk.coverBg};
  --radius:${t.radiusPx ?? 8}px;
  --font-heading:${t.fonts.heading};
  --font-body:${t.fonts.body};
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;background:var(--bg);color:var(--fg);
  font-family:var(--font-body);overflow:hidden;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
#stage{position:fixed;inset:0}
.slide-frame{position:fixed;inset:0;pointer-events:none}
.slide-frame.is-current,body.overview .slide-frame{pointer-events:auto}
.slide{
  position:absolute;inset:0;display:none;flex-direction:column;justify-content:center;
  padding:clamp(30px,4.6vw,68px) clamp(36px,5.4vw,88px);overflow:hidden;
}
.slide::before{
  content:"";position:absolute;inset:-20%;pointer-events:none;z-index:-1;
  background:${ambientCss};
}
.slide.is-active{display:flex}
${motionCss}
${treeShakenLayoutCss}
${needsMediaCss ? deckMedia.MEDIA_CSS : ''}
${VISUAL_CSS}
.kicker{
  color:var(--accent-text);font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  font-size:clamp(12px,1.15vw,16px);margin-bottom:14px;
}
h1,h2,.statement-title{font-family:var(--font-heading);line-height:1.12;letter-spacing:-.018em;margin:0}
h1{font-size:clamp(40px,5.8vw,86px);max-width:22ch;font-weight:800}
h2{font-size:clamp(28px,3.6vw,56px);max-width:28ch;font-weight:750}
.subtitle{
  color:var(--ink-secondary);font-size:clamp(17px,1.9vw,28px);line-height:1.5;
  max-width:46em;margin-top:18px;
}
.meta{
  color:var(--muted);font-size:clamp(12px,1.1vw,15px);margin-top:32px;
  letter-spacing:.04em;
}
.section .kicker,.slide--section .kicker{margin-bottom:10px}
.section .accent-line,.slide--section .accent-line{width:min(140px,14vw);height:5px;background:var(--accent);margin:18px 0;border-radius:2px}
.statement-title{
  font-size:clamp(30px,4.4vw,68px);max-width:24ch;font-weight:800;line-height:1.24;
}
.slide--closing .subtitle{color:var(--accent-text);font-weight:600}
.quote-mark{
  font-family:var(--font-heading);font-size:clamp(68px,9vw,132px);line-height:.62;
  color:var(--accent);margin-bottom:clamp(10px,1.4vw,20px);
}
.quote-text{
  font-family:var(--font-heading);font-size:clamp(24px,3.4vw,48px);line-height:1.34;
  font-weight:700;max-width:26ch;margin:0;
}
.quote-attr{color:var(--muted);margin-top:clamp(14px,2vw,24px);font-size:clamp(14px,1.5vw,22px);letter-spacing:.03em}
table.deck-table{
  border-collapse:collapse;margin-top:clamp(12px,1.8vw,24px);width:100%;max-width:100%;
  font-size:clamp(14px,1.4vw,20px);
}
.deck-table th{
  background:var(--surface2);color:var(--fg);
  text-align:left;font-weight:700;padding:.62em .9em;letter-spacing:.02em;
  border-top:1.5px solid var(--accent);border-bottom:1.5px solid var(--accent);
}
.deck-table td{
  padding:.56em .9em;border-bottom:1px solid var(--hairline);
  color:var(--fg);
}
.deck-table .num{text-align:right;font-variant-numeric:tabular-nums}
.deck-table tbody tr:nth-child(even){background:var(--surface1)}
#progress{position:fixed;top:0;left:0;height:3px;width:0;background:var(--accent);z-index:30;transition:width .25s}
#hud{
  position:fixed;left:22px;right:22px;bottom:18px;z-index:50;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;align-items:center;
  color:var(--muted);font-size:13px;letter-spacing:.08em;font-variant-numeric:tabular-nums;
}
#hud button{
  background:color-mix(in srgb, var(--panel) 88%, transparent);color:var(--fg);
  border:1px solid color-mix(in srgb, var(--muted) 45%, transparent);border-radius:99px;
  padding:8px 14px;min-height:34px;font:inherit;cursor:pointer;
}
#hud button:hover{border-color:var(--accent);color:var(--accent)}
#notes-panel{
  position:fixed;left:0;right:0;bottom:64px;z-index:40;display:none;
  background:color-mix(in srgb, var(--panel) 96%, black 4%);
  border-top:2px solid var(--accent);
  padding:14px clamp(22px,4vw,64px) 18px;max-height:38vh;overflow:auto;
}
body.notes-open #notes-panel{display:block}
#notes-panel .notes-head{display:flex;align-items:center;justify-content:space-between;gap:16px}
#notes-close{
  background:transparent;color:var(--muted);border:1px solid color-mix(in srgb, var(--muted) 45%, transparent);
  border-radius:99px;padding:4px 12px;font:inherit;cursor:pointer;min-height:30px;
}
#notes-close:hover{color:var(--accent);border-color:var(--accent)}
#notes-panel .notes-label{
  color:var(--accent-text);font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  font-size:12px;margin-bottom:8px;
}
#notes-text{white-space:pre-wrap;line-height:1.65;font-size:clamp(15px,1.5vw,18px);color:var(--fg)}
#notes-text.is-empty{color:var(--muted);font-style:italic}
#help-panel{
  position:fixed;right:22px;bottom:64px;z-index:60;max-width:390px;
  background:color-mix(in srgb, var(--panel) 96%, black 4%);color:var(--fg);
  border:1px solid color-mix(in srgb, var(--accent) 55%, transparent);border-radius:14px;
  padding:16px 20px;box-shadow:0 18px 50px rgba(0,0,0,.28);font-size:14px;line-height:1.8;
}
#help-panel[hidden]{display:none}
#help-panel kbd{
  background:color-mix(in srgb, var(--accent) 22%, transparent);border-radius:5px;
  padding:1px 6px;font-family:inherit;font-size:12px;
}
#toast{
  position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:70;
  background:color-mix(in srgb, var(--panel) 96%, black 4%);color:var(--fg);
  border:1px solid color-mix(in srgb, var(--accent) 55%, transparent);border-radius:99px;
  padding:9px 18px;font-size:13px;
}
#toast[hidden]{display:none}
#blank{position:fixed;inset:0;z-index:80;display:none;pointer-events:none}
body.blank-black #blank{display:block;background:#000}
body.blank-white #blank{display:block;background:#fff}
body.blank-black #hud,body.blank-white #hud{visibility:hidden;pointer-events:none}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
body.overview #stage{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;
  grid-auto-rows:var(--deck-thumb-height,180px);
  padding:18px 18px 92px;position:fixed;inset:0;overflow:auto;align-content:start;
}
body.overview .slide-frame{
  position:relative;inset:auto;width:100%;aspect-ratio:16/9;overflow:hidden;
  border:1px solid color-mix(in srgb, var(--muted) 35%, transparent);border-radius:12px;
  cursor:pointer;background:var(--bg);outline:none;
}
body.overview .slide-frame:hover{border-color:var(--accent)}
body.overview .slide-frame.is-current{outline:2px solid var(--accent);outline-offset:2px}
body.overview .slide-frame:focus-visible{outline:2px solid var(--accent);outline-offset:-3px}
body.overview .slide-frame::after{
  content:attr(data-frame);position:absolute;right:8px;bottom:6px;z-index:2;
  font-size:12px;color:var(--muted);background:color-mix(in srgb, var(--bg) 84%, transparent);
  border:1px solid color-mix(in srgb, var(--muted) 40%, transparent);border-radius:6px;
  padding:1px 7px;font-variant-numeric:tabular-nums;
}
body.overview .slide{
  display:flex !important;position:absolute;inset:0;width:1280px;height:720px;
  transform:scale(var(--deck-thumb-scale,.25));transform-origin:top left;pointer-events:none;
  animation:none !important;
}
body.overview .bullets li{opacity:1 !important;animation:none !important}
body.overview .media-canvas{width:1280px;height:720px}
body.overview #notes-panel,body.presenting #notes-panel{display:none !important}
body.presenting #notes-toggle{opacity:.55}
body.presenting #hud{opacity:0;pointer-events:none;transition:opacity .25s}
body.presenting #hud:hover{opacity:1;pointer-events:auto}
body.is-scaled-stage:not(.overview) #stage{display:flex;align-items:center;justify-content:center;overflow:hidden}
body.is-scaled-stage:not(.overview) .slide-frame{position:relative;inset:auto;width:1280px;height:720px;flex:none;display:none;transform:scale(var(--stage-scale,1));transform-origin:center center}
body.is-scaled-stage:not(.overview) .slide-frame.is-current{display:block}
body.is-scaled-stage:not(.overview) .slide{width:1280px;height:720px;padding:42px 52px}
body.is-scaled-stage:not(.overview) .media-canvas{width:1280px;height:720px}
body.is-scaled-stage:not(.overview) h1{font-size:58px}
body.is-scaled-stage:not(.overview) h2{font-size:38px}
body.is-scaled-stage:not(.overview) .slide-header h2{font-size:33px}
body.is-scaled-stage:not(.overview) .subtitle{font-size:21px}
body.is-scaled-stage:not(.overview) .kicker{font-size:13.5px}
body.is-scaled-stage:not(.overview) .statement-title{font-size:46px}
body.is-scaled-stage:not(.overview) .quote-text{font-size:36px}
body.is-scaled-stage:not(.overview) .quote-mark{font-size:96px}
body.is-scaled-stage:not(.overview) .bullets-list li{font-size:20px}
body.is-scaled-stage:not(.overview) .card-title{font-size:19px}
body.is-scaled-stage:not(.overview) .card-body{font-size:16px}
body.is-scaled-stage:not(.overview) .kpi-value{font-size:50px}
body.is-scaled-stage:not(.overview) .kpi-label{font-size:14.5px}
body.is-scaled-stage:not(.overview) .mermaid-board{flex:1 1 auto;min-height:360px}
body.is-embedded #hud{left:12px;right:12px;bottom:8px;gap:6px;font-size:11.5px}
body.is-embedded #hud button{padding:5px 10px;min-height:28px}
body.is-embedded #theme-label{display:none}
@media (max-width:900px){
  body:not(.is-scaled-stage) .slide{padding:clamp(22px,5vw,44px)}
  body:not(.is-scaled-stage) h1{font-size:clamp(34px,8.5vw,64px)}
  body:not(.is-scaled-stage) h2{font-size:clamp(26px,6.5vw,48px)}
  body:not(.is-scaled-stage) .statement-title{font-size:clamp(26px,7vw,54px)}
  body:not(.is-scaled-stage) .subtitle{font-size:clamp(16px,3.4vw,24px)}
  body:not(.is-scaled-stage) .bullets li{font-size:clamp(16px,3.4vw,24px)}
  body:not(.is-scaled-stage) .kicker{font-size:13px}
  body:not(.is-scaled-stage) .deck-table{font-size:14px}
  body:not(.is-scaled-stage) .deck-table th,body:not(.is-scaled-stage) .deck-table td{padding:.55em .6em}
  #hud{left:10px;right:10px;bottom:10px;gap:6px;font-size:12px}
  #hud button{padding:10px 16px;min-height:44px}
  #notes-panel{bottom:68px;max-height:45vh}
  #help-panel{right:10px;bottom:68px;left:10px;max-width:none}
}
@media (max-width:640px){
  #theme-label{display:none}
}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation:none !important;transition:none !important}
}
@media print{
  html,body{height:auto;overflow:visible;background:#fff}
  .slide-frame{position:relative;display:block !important}
  .slide{position:relative;display:block !important;height:100vh;page-break-after:always;padding:48px}
  ${motion ? 'body.motion .bullets li{opacity:1 !important;transform:none !important;animation:none !important}\n  body.motion .slide[data-reveal="step"] [data-reveal-step]{opacity:1 !important;transform:none !important;animation:none !important}' : ''}
  #progress,#hud,#notes-panel,#help-panel,#toast{display:none !important}
}
${delivery.css}
${dataView.css}
</style>
</head>
<body class="${motion ? 'motion' : 'no-motion'}">
<div id="progress" aria-hidden="true"></div>
${delivery.body}
${dataView.body}
<div id="stage">
${slides}
</div>
<div id="hud" aria-live="polite">
  <span id="counter">${ui.slide} 1 ${ui.of} ${total}</span>
  ${delivery.navigation}
  <span id="theme-label">${ui.theme} · ${escapeHtml(themeLabel)}</span>
  <button id="notes-toggle" type="button" title="S · ${escapeHtml(ui.notesToggle)}" aria-controls="notes-panel" aria-expanded="false">${escapeHtml(ui.notesToggle)}</button>
  <button id="presenter-toggle" type="button" title="V · ${escapeHtml(ui.presenterToggle)}">${escapeHtml(ui.presenterToggle)}</button>
  <button id="overview-toggle" type="button" title="G · ${escapeHtml(ui.overviewToggle)}" aria-pressed="false">${escapeHtml(ui.overviewToggle)}</button>
  <button id="help-toggle" type="button" title="?" aria-label="${escapeHtml(ui.helpTitle)}">?</button>
  <button id="fullscreen" type="button" title="F · Fullscreen" aria-label="Fullscreen">⛶</button>
</div>
<div id="notes-panel" role="region" aria-label="${escapeHtml(ui.notesLabel)}">
  <div class="notes-head">
    <span class="notes-label">${escapeHtml(ui.notesLabel)}</span>
    <button id="notes-close" type="button" aria-label="${escapeHtml(ui.notesCloseLabel)}">×</button>
  </div>
  <div id="notes-text"></div>
</div>
<div id="help-panel" hidden>
  <div class="notes-label">${escapeHtml(ui.helpTitle)}</div>
  <p><kbd>←</kbd> <kbd>→</kbd> / <kbd>Space</kbd> 翻页 · <kbd>Home</kbd> / <kbd>End</kbd> 首末页 · <kbd>S</kbd> ${escapeHtml(ui.notesToggle)} · <kbd>V</kbd> ${escapeHtml(ui.presenterToggle)} · <kbd>G</kbd> ${escapeHtml(ui.overviewToggle)} · <kbd>F</kbd> 全屏 · <kbd>P</kbd> 打印 · <kbd>B</kbd> 黑屏 · <kbd>W</kbd> 白屏 · <kbd>Esc</kbd> ${escapeHtml(ui.closeLabel)} · <kbd>?</kbd> ${escapeHtml(ui.helpTitle)}</p>
  <p>${escapeHtml(ui.presenterHint)}</p>
  <p>${escapeHtml(ui.overviewHint)}</p>
</div>
<div id="toast" role="status" hidden></div>
<div id="blank" aria-hidden="true"></div>
<script>
(() => {
  const frames = Array.from(document.querySelectorAll('.slide-frame'));
  const slides = Array.from(document.querySelectorAll('.slide'));
  const counter = document.getElementById('counter');
  const progress = document.getElementById('progress');
  const fullscreenBtn = document.getElementById('fullscreen');
  const notesPanel = document.getElementById('notes-panel');
  const notesText = document.getElementById('notes-text');
  const notesBtn = document.getElementById('notes-toggle');
  const notesClose = document.getElementById('notes-close');
  const presenterBtn = document.getElementById('presenter-toggle');
  const overviewBtn = document.getElementById('overview-toggle');
  const helpBtn = document.getElementById('help-toggle');
  const helpPanel = document.getElementById('help-panel');
  const toastEl = document.getElementById('toast');
  let index = 0;
  let syncDelivery = () => {};
  let presenterWin = null;
  let presenterInitSent = false;
  let toastTimer = 0;
  const total = slides.length;
  const ui = ${JSON.stringify(ui).replace(/</g, '\\u003c')};

  function notesOf(i) { return slides[i] && slides[i].dataset ? (slides[i].dataset.notes || '') : ''; }
  function titleOf(i) {
    const el = slides[i] ? slides[i].querySelector('h1,h2,.statement-title,.quote-text') : null;
    return el ? el.textContent.trim() : '';
  }
  function state() {
    const next = (index + 1) % total;
    return { index: index, total: total, title: titleOf(index), notes: notesOf(index), nextTitle: titleOf(next), nextNotes: notesOf(next) };
  }
  window.__dshPpt = { go: function (delta) { go(index + delta); }, jump: function (i) { go(i); }, state: state };

  function toast(message) {
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  function syncNotes() {
    const notes = notesOf(index);
    notesText.textContent = notes || ui.noNotes;
    notesText.classList.toggle('is-empty', notes === '');
    notesBtn.setAttribute('aria-expanded', document.body.classList.contains('notes-open') ? 'true' : 'false');
    updatePresenter();
  }

  function sendInit() {
    if (!presenterOpen()) return;
    try {
      presenterWin.postMessage({
        __dshPpt: 'init',
        title: (document.title.split(' · ')[1] || document.title),
        css: document.querySelector('style') ? document.querySelector('style').textContent : '',
        total: total,
        slides: slides.map(function (slide) { return slide.outerHTML; }),
      }, '*');
    } catch (_) { /* popup closing */ }
  }

  function sendState() {
    if (!presenterOpen()) return;
    const next = (index + 1) % total;
    try {
      presenterWin.postMessage({
        __dshPpt: 'state',
        index: index,
        total: total,
        title: titleOf(index),
        nextTitle: titleOf(next),
        notes: notesOf(index),
        nextNotes: notesOf(next),
        blank: document.body.classList.contains('blank-black') ? 'black' : (document.body.classList.contains('blank-white') ? 'white' : null),
      }, '*');
    } catch (_) { /* popup closing */ }
  }

  function updatePresenter() { sendState(); }

  const isEmbedded = (function () {
    try {
      if (window.self !== window.top) return true;
      const sp = new URLSearchParams(window.location.search || '');
      return sp.has('preview') || sp.has('static');
    } catch (_) { return true; }
  })();
  if (isEmbedded) document.body.classList.add('is-embedded');

  function fitStage() {
    if (document.body.classList.contains('overview')) {
      document.body.classList.remove('is-scaled-stage');
      return;
    }
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;
    const shouldScale = isEmbedded || vw < 1040 || vh < 600;
    document.body.classList.toggle('is-scaled-stage', shouldScale);
    if (shouldScale) {
      const s = Math.max(0.2, Math.min(vw / 1280, vh / 720));
      document.documentElement.style.setProperty('--stage-scale', String(s));
    }
  }

  function resetStepReveal(slideEl) {
    if (!slideEl || slideEl.dataset.reveal !== 'step') return;
    slideEl.querySelectorAll('[data-reveal-step]').forEach(function (el) { el.classList.remove('is-revealed'); });
  }
  function advanceStep(dir) {
    if (document.body.classList.contains('is-embedded')) return false;
    const curSlide = slides[index];
    if (!curSlide || curSlide.dataset.reveal !== 'step' || !document.body.classList.contains('motion')) return false;
    const steps = Array.from(curSlide.querySelectorAll('[data-reveal-step]'));
    if (steps.length === 0) return false;
    if (dir > 0) {
      const nextHidden = steps.find(function (el) { return !el.classList.contains('is-revealed'); });
      if (nextHidden) { nextHidden.classList.add('is-revealed'); return true; }
      return false;
    }
    const revealed = steps.filter(function (el) { return el.classList.contains('is-revealed'); });
    if (revealed.length > 0) { revealed[revealed.length - 1].classList.remove('is-revealed'); return true; }
    return false;
  }

  function go(next) {
    if (document.body.classList.contains('blank-black') || document.body.classList.contains('blank-white')) setBlank(null);
    const wrapped = next < 0 || next >= total;
    index = (next + total) % total;
    slides.forEach(function (slide, i) {
      slide.classList.toggle('is-active', i === index);
      if (i === index) resetStepReveal(slide);
      if (frames[i]) frames[i].classList.toggle('is-current', i === index);
    });
    counter.textContent = ui.slide + ' ' + (index + 1) + ' ' + ui.of + ' ' + total;
    syncDelivery(index);
    progress.style.width = ((index + 1) / total * 100) + '%';
    document.title = (index + 1) + ' / ' + total + ' · ' + ${JSON.stringify(manifest.title).replace(/</g, '\\u003c')};
    try { history.replaceState?.(null, '', '#slide-' + (index + 1)); } catch (_) { /* file:// 下个别浏览器可能拒绝 */ }
    if (wrapped) toast(ui.wrapHint + ' ' + (index + 1) + ' / ' + total);
    syncNotes();
  }

  function notesOpen() { return document.body.classList.contains('notes-open'); }
  function presenterOpen() { try { return !!(presenterWin && !presenterWin.closed); } catch (_) { return false; } }

  function setNotes(on) {
    document.body.classList.toggle('notes-open', on);
    if (on) setOverview(false);
    syncNotes();
  }

  function updateThumbScale() {
    if (!document.body.classList.contains('overview')) return;
    requestAnimationFrame(function () {
      const width = frames[0] ? frames[0].getBoundingClientRect().width : 0;
      if (width > 0) {
        document.documentElement.style.setProperty('--deck-thumb-scale', String(width / 1280));
        document.documentElement.style.setProperty('--deck-thumb-height', String(width * 9 / 16) + 'px');
      }
    });
  }

  function setOverview(on) {
    document.body.classList.toggle('overview', on);
    overviewBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    frames.forEach(function (frame) { frame.tabIndex = on ? 0 : -1; });
    if (on) {
      document.body.classList.remove('notes-open');
      document.body.classList.remove('is-scaled-stage');
      helpPanel.hidden = true;
      syncNotes();
      updateThumbScale();
    } else {
      fitStage();
    }
  }

  function presenterHtml() {
    const labelCurrent = ${JSON.stringify(ui.currentLabel)};
    const labelNext = ${JSON.stringify(ui.nextLabel)};
    const labelNotes = ${JSON.stringify(ui.notesLabel)};
    const noNotes = ${JSON.stringify(ui.noNotes)};
    const hintText = ${JSON.stringify('← → 翻页 · P 暂停 · T 重置 · +/- 字号 · B/W 黑/白屏 · Esc 结束')};
    const deckTitle = ${JSON.stringify(manifest.title).replace(/</g, '\\u003c')};
    const langAttr = ${JSON.stringify(lang.attr)};
    const cs = getComputedStyle(document.documentElement);
    const val = function (name, fallback) { const v = cs.getPropertyValue(name).trim(); return v || fallback; };
    const css = [
      ':root{--bg:' + val('--bg', '#070B14') + ';--panel:' + val('--panel', '#0D1424') + ';--fg:' + val('--fg', '#E8F1FF') + ';--muted:' + val('--muted', '#7E8BA8') + ';--accent:' + val('--accent', '#7C3AED') + ';--accent2:' + val('--accent2', '#06B6D4') + ';--font-heading:' + val('--font-heading', 'sans-serif') + ';--font-body:' + val('--font-body', 'sans-serif') + '}',
      '*{box-sizing:border-box}',
      'body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-body);height:100vh;display:flex;flex-direction:column;overflow:hidden}',
      'header{display:flex;align-items:center;gap:14px;padding:9px 16px;border-bottom:1px solid color-mix(in srgb, var(--muted) 40%, transparent);font-size:13px;color:var(--muted)}',
      'header #ptitle{color:var(--fg);font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      'header #pclock{font-variant-numeric:tabular-nums}',
      'main{flex:1;display:grid;grid-template-columns:1.12fr .88fr;gap:12px;padding:12px 16px;min-height:0}',
      '.col{display:flex;flex-direction:column;gap:10px;min-height:0}',
      '.card{background:var(--panel);border:1px solid color-mix(in srgb, var(--muted) 30%, transparent);border-radius:12px;padding:10px 12px;min-height:0;display:flex;flex-direction:column;gap:6px}',
      '.card-notes{flex:1}',
      '.lbl{color:var(--accent);font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}',
      '.pv{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:8px;background:var(--bg);border:1px solid color-mix(in srgb, var(--muted) 25%, transparent);--pv-scale:.3}',
      '.pv-slide{position:absolute;left:0;top:0;transform:translate(var(--pv-x,0px),var(--pv-y,0px)) scale(var(--pv-scale,.25));transform-origin:top left}',
      '.pv-slide .slide{display:flex !important;position:absolute;left:0;top:0;width:100vw;height:100vh;animation:none !important}',
      '.pv-slide .bullets li{opacity:1 !important;animation:none !important}',
      '#thumbs{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}',
      '#thumbs .thumb{position:relative;flex:0 0 128px;aspect-ratio:16/9;border-radius:8px;overflow:hidden;border:1px solid color-mix(in srgb, var(--muted) 35%, transparent);cursor:pointer;background:var(--bg);--pv-scale:.09}',
      '#thumbs .thumb.is-current{outline:2px solid var(--accent);outline-offset:1px}',
      '#pnotes{font-size:var(--notes-size,19px);line-height:1.6;white-space:pre-wrap;overflow:auto;flex:1}',
      'footer{display:flex;align-items:center;gap:8px;padding:9px 16px;border-top:1px solid color-mix(in srgb, var(--muted) 40%, transparent);flex-wrap:wrap}',
      'button{background:color-mix(in srgb, var(--panel) 90%, transparent);color:var(--fg);border:1px solid color-mix(in srgb, var(--muted) 45%, transparent);border-radius:99px;padding:6px 12px;min-height:34px;font:inherit;font-size:13px;cursor:pointer}',
      'button:hover{border-color:var(--accent);color:var(--accent)}',
      'button[aria-pressed="true"]{background:var(--accent);color:var(--bg);border-color:var(--accent)}',
      '#ptimer{font-variant-numeric:tabular-nums;font-size:20px;font-weight:700;color:var(--accent);margin-left:6px}',
      '.bar{flex:1;min-width:100px;height:8px;background:color-mix(in srgb, var(--muted) 28%, transparent);border-radius:99px;overflow:hidden}',
      '#pprog{height:100%;width:0;background:var(--accent);transition:width .2s}',
      '.hint{color:var(--muted);font-size:11px;width:100%}',
    ].join('');
    const js = [
      'var total=0,index=0,elapsed=0,started=Date.now(),paused=false,notesSize=19,slides=[],cssText="",curBlank=null,initialized=false,readyTries=0;',
      'function q(id){return document.getElementById(id)}',
      'function post(m){try{if(window.opener)window.opener.postMessage(m,"*")}catch(e){}}',
      'function fmt(ms){var s=Math.max(0,Math.floor(ms/1000)),m=Math.floor(s/60);s=s%60;var h=Math.floor(m/60);m=m%60;return (h>0?(h<10?"0":"")+h+":":"")+(m<10?"0":"")+m+":"+(s<10?"0":"")+s}',
      'function clock(){var d=new Date();return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+":"+("0"+d.getSeconds()).slice(-2)}',
      'function tick(){if(!paused)elapsed=Date.now()-started;q("ptimer").textContent=fmt(elapsed);q("pclock").textContent=clock();if(window.requestAnimationFrame)requestAnimationFrame(tick);else setTimeout(tick,250)}',
      'function fitBox(box){var rw=box.clientWidth||320,rh=box.clientHeight||180;var s=Math.min(rw/window.innerWidth,rh/window.innerHeight);var ox=(rw-window.innerWidth*s)/2,oy=(rh-window.innerHeight*s)/2;box.style.setProperty("--pv-scale",String(s));box.style.setProperty("--pv-x",ox+"px");box.style.setProperty("--pv-y",oy+"px")}',
      'function fit(){fitBox(q("pv-cur"));fitBox(q("pv-next"));var th=q("thumbs").children;for(var i=0;i<th.length;i++){fitBox(th[i])}}',
      'function setSlide(box,html){box.innerHTML="";var f=document.createElement("div");f.className="pv-slide";f.innerHTML=html;box.appendChild(f)}',
      'function buildThumbs(){var box=q("thumbs");box.innerHTML="";slides.forEach(function(html,i){var t=document.createElement("div");t.className="thumb";var f=document.createElement("div");f.className="pv-slide";f.innerHTML=html;t.appendChild(f);t.addEventListener("click",function(){post({__dshPpt:"cmd",kind:"go",index:i})});box.appendChild(t)});fit()}',
      'function renderState(st){index=st.index;total=st.total||total;q("pcounter").textContent=(index+1)+" / "+total;setSlide(q("pv-cur"),slides[index]||"");setSlide(q("pv-next"),slides[(index+1)%total]||"");q("pnotes").textContent=st.notes||' + JSON.stringify(ui.noNotes) + ';q("pprog").style.width=((index+1)/total*100)+"%";curBlank=st.blank||null;q("pv-black").setAttribute("aria-pressed",curBlank==="black"?"true":"false");q("pv-white").setAttribute("aria-pressed",curBlank==="white"?"true":"false");q("pv-black").textContent=curBlank==="black"?"取消黑屏":"黑屏";q("pv-white").textContent=curBlank==="white"?"取消白屏":"白屏";var th=q("thumbs").children;for(var i=0;i<th.length;i++){th[i].classList.toggle("is-current",i===index)}fit()}',
      'function togglePause(){paused=!paused;if(!paused)started=Date.now()-elapsed;var b=q("pause");b.setAttribute("aria-pressed",paused?"true":"false");b.textContent=paused?"继续":"暂停"}',
      'function resetTimer(){started=Date.now();elapsed=0}',
      'function applyNotesSize(){document.documentElement.style.setProperty("--notes-size",notesSize+"px")}',
      'window.addEventListener("message",function(e){var d=e.data||{};if(d.__dshPpt==="init"&&!initialized){initialized=true;slides=d.slides||[];total=d.total||slides.length;cssText=d.css||"";var st=document.createElement("style");st.textContent=cssText;document.head.appendChild(st);q("ptitle").textContent=d.title||"";buildThumbs()}else if(d.__dshPpt==="state"){renderState(d)}else if(d.__dshPpt==="close"){window.close()}});',
      'window.addEventListener("resize",fit);',
      'window.addEventListener("beforeunload",function(){post({__dshPpt:"cmd",kind:"closed"})});',
      'document.addEventListener("keydown",function(e){var k=e.key;if(k==="ArrowRight"||k===" "){e.preventDefault();post({__dshPpt:"cmd",kind:"go",delta:1})}else if(k==="ArrowLeft"){e.preventDefault();post({__dshPpt:"cmd",kind:"go",delta:-1})}else if(k==="Escape"){post({__dshPpt:"cmd",kind:"end"});window.close()}else if(k.toLowerCase()==="p"){togglePause()}else if(k.toLowerCase()==="t"){resetTimer()}else if(k==="+"||k==="="){notesSize=Math.min(34,notesSize+2);applyNotesSize()}else if(k==="-"){notesSize=Math.max(12,notesSize-2);applyNotesSize()}else if(k.toLowerCase()==="b"){post({__dshPpt:"cmd",kind:"blank",color:curBlank==="black"?null:"black"})}else if(k.toLowerCase()==="w"){post({__dshPpt:"cmd",kind:"blank",color:curBlank==="white"?null:"white"})}});',
      'q("prev").addEventListener("click",function(){post({__dshPpt:"cmd",kind:"go",delta:-1})});',
      'q("next").addEventListener("click",function(){post({__dshPpt:"cmd",kind:"go",delta:1})});',
      'q("pause").addEventListener("click",togglePause);',
      'q("reset").addEventListener("click",resetTimer);',
      'q("font-plus").addEventListener("click",function(){notesSize=Math.min(34,notesSize+2);applyNotesSize()});',
      'q("font-minus").addEventListener("click",function(){notesSize=Math.max(12,notesSize-2);applyNotesSize()});',
      'q("pv-black").addEventListener("click",function(){post({__dshPpt:"cmd",kind:"blank",color:curBlank==="black"?null:"black"})});',
      'q("pv-white").addEventListener("click",function(){post({__dshPpt:"cmd",kind:"blank",color:curBlank==="white"?null:"white"})});',
      'q("end").addEventListener("click",function(){post({__dshPpt:"cmd",kind:"end"});window.close()});',
      'applyNotesSize();tick();function ready(){if(initialized)return;post({__dshPpt:"ready"});readyTries++;if(readyTries<5)setTimeout(ready,700)}setTimeout(ready,250);',
    ].join('');
    return '<!DOCTYPE html><html lang="' + langAttr + '"><head><meta charset="UTF-8"><title>' + deckTitle + ' · 演讲者视图</title><style>' + css + '</style></head><body>'
      + '<header><div id="ptitle"></div><div id="pcounter"></div><div id="pclock" title="本地时间"></div></header>'
      + '<main><div class="col">'
      + '<div class="card"><div class="lbl">' + labelCurrent + '</div><div class="pv" id="pv-cur"></div></div>'
      + '<div class="card"><div class="lbl">' + labelNext + '</div><div class="pv" id="pv-next"></div></div>'
      + '<div class="card"><div class="lbl">SLIDES</div><div id="thumbs"></div></div>'
      + '</div><div class="col"><div class="card card-notes"><div class="lbl">' + labelNotes + '</div><div id="pnotes"></div></div></div></main>'
      + '<footer><button id="prev" title="上一页 (←)">◀</button><button id="next" title="下一页 (→)">▶</button><button id="pause" title="暂停 (P)" aria-pressed="false">暂停</button><button id="reset" title="重置计时 (T)">重置计时</button><button id="font-minus" title="备注字号减小 (-)">A−</button><button id="font-plus" title="备注字号增大 (+)">A+</button><button id="pv-black" title="黑屏 (B)">黑屏</button><button id="pv-white" title="白屏 (W)">白屏</button><button id="end" title="结束放映 (Esc)">结束放映</button><div id="ptimer">00:00</div><div class="bar"><div id="pprog"></div></div><div class="hint">' + hintText + '</div></footer>'
      + '<scr' + 'ipt>' + js + '</scr' + 'ipt></body></html>';
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) { await document.exitFullscreen?.(); return; }
      if (!document.documentElement.requestFullscreen || document.fullscreenEnabled === false) {
        toast(ui.fullscreenUnavailable);
        return;
      }
      await document.documentElement.requestFullscreen();
      if (!document.fullscreenElement) toast(ui.fullscreenUnavailable);
    } catch (_) { toast(ui.fullscreenUnavailable); }
  }

  function openPresenter() {
    if (presenterOpen()) { try { presenterWin.focus(); } catch (_) { /* gone */ } return; }
    let url = '';
    try {
      url = URL.createObjectURL(new Blob([presenterHtml()], { type: 'text/html' }));
    } catch (_) { toast(ui.popupBlocked); return; }
    presenterInitSent = false;
    presenterWin = window.open(url, 'dsh-ppt-presenter', 'width=1180,height=760');
    if (!presenterWin) {
      try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ }
      toast(ui.popupBlocked);
      return;
    }
    document.body.classList.add('presenting');
    if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) { /* ignore */ } }, 5000);
  }

  function closePresenter() {
    if (presenterOpen()) {
      try { presenterWin.postMessage({ __dshPpt: 'close' }, '*'); presenterWin.close(); } catch (_) { /* gone */ }
    }
    document.body.classList.remove('presenting');
    presenterInitSent = false;
    if (document.fullscreenElement) { try { document.exitFullscreen?.(); } catch (_) { /* ignore */ } }
    setBlank(null);
  }

  function setBlank(color) {
    document.body.classList.remove('blank-black', 'blank-white');
    if (color === 'black') document.body.classList.add('blank-black');
    else if (color === 'white') document.body.classList.add('blank-white');
    sendState();
  }

  setInterval(function () {
    if (!presenterOpen() && document.body.classList.contains('presenting')) {
      document.body.classList.remove('presenting');
      if (document.fullscreenElement) { try { document.exitFullscreen?.(); } catch (_) { /* ignore */ } }
      setBlank(null);
    }
  }, 800);

  window.addEventListener('message', function (event) {
    if (event.source !== presenterWin) return;
    const data = event.data || {};
    if (data.__dshPpt === 'cmd' && (data.kind === 'end' || data.kind === 'closed')) { closePresenter(); return; }
    if (!presenterOpen()) return;
    if (data.__dshPpt === 'ready') {
      if (!presenterInitSent) { presenterInitSent = true; sendInit(); }
      sendState();
      return;
    }
    if (data.__dshPpt !== 'cmd') return;
    if (data.kind === 'go') {
      setBlank(null);
      if (typeof data.index === 'number') go(data.index);
      else go(index + (data.delta || 0));
      sendState();
    } else if (data.kind === 'blank') {
      setBlank(data.color || null);
    } else if (data.kind === 'end') {
      closePresenter();
    } else if (data.kind === 'closed') {
      document.body.classList.remove('presenting');
      setBlank(null);
    }
  });

  document.addEventListener('keydown', (event) => {
    const key = event.key;
    const lower = key.toLowerCase();
    const targetEl = event.target;
    if (document.getElementById('review-panel').open || event.ctrlKey || event.metaKey || event.altKey) return;
    if (key !== 'Escape' && targetEl && (['INPUT', 'SELECT', 'TEXTAREA'].includes(targetEl.tagName) || targetEl.isContentEditable === true)) return;
    const interactive = targetEl && (targetEl.tagName === 'BUTTON' || targetEl.tagName === 'INPUT' || targetEl.tagName === 'SELECT' || targetEl.tagName === 'TEXTAREA' || targetEl.isContentEditable === true);
    if (key === ' ' && interactive) return;
    if (key === 'Escape') {
      if (!helpPanel.hidden) { helpPanel.hidden = true; return; }
      if (document.body.classList.contains('overview')) { setOverview(false); return; }
      if (notesOpen()) { setNotes(false); return; }
      if (document.body.classList.contains('presenting') || document.body.classList.contains('blank-black') || document.body.classList.contains('blank-white')) { closePresenter(); return; }
      if (document.fullscreenElement) { document.exitFullscreen?.(); return; }
      return;
    }
    const inOverview = document.body.classList.contains('overview');
    if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || (key === 'ArrowDown' && !inOverview)) {
      event.preventDefault();
      if (inOverview || !advanceStep(1)) go(index + 1);
    } else if (key === 'ArrowLeft' || key === 'PageUp' || (key === 'ArrowUp' && !inOverview)) {
      event.preventDefault();
      if (inOverview || !advanceStep(-1)) go(index - 1);
    } else if (/^[1-9]$/.test(key) && !inOverview) {
      const jumped = Number(key);
      if (jumped <= total) { event.preventDefault(); go(jumped - 1); }
    } else if (key === 'Home') {
      event.preventDefault(); go(0);
    } else if (key === 'End') {
      event.preventDefault(); go(total - 1);
    } else if (key === 'Enter' && inOverview) {
      event.preventDefault(); setOverview(false);
    } else if (lower === 'f') {
      void toggleFullscreen();
    } else if (lower === 'g') {
      setOverview(!inOverview);
    } else if (lower === 's') {
      if (document.body.classList.contains('presenting')) { toast(ui.presenterHint); }
      else { document.body.classList.toggle('notes-open'); syncNotes(); }
    } else if (lower === 'v' || lower === 'p') {
      event.preventDefault();
      if (typeof window.__dshTogglePresenter === 'function') window.__dshTogglePresenter();
      else if (presenterOpen()) closePresenter();
      else openPresenter();
    } else if (lower === 'b') {
      setBlank(document.body.classList.contains('blank-black') ? null : 'black');
    } else if (lower === 'w') {
      setBlank(document.body.classList.contains('blank-white') ? null : 'white');
    } else if (key === '?') {
      helpPanel.hidden = !helpPanel.hidden;
    }
  });

  let wheelLock = 0;
  document.addEventListener('wheel', (event) => {
    if (document.getElementById('review-panel').open || event.target.closest?.('#hud,#delivery-bar,#notes-panel,#help-panel')) return;
    const now = Date.now();
    if (now - wheelLock < 550 || document.body.classList.contains('overview') || notesOpen()) return;
    wheelLock = now;
    if (Math.abs(event.deltaY) > 12) go(index + (event.deltaY > 0 ? 1 : -1));
  }, { passive: true });

  let touchStartY = 0;
  let touchOnStage = false;
  document.addEventListener('touchstart', (event) => { touchOnStage = !document.getElementById('review-panel').open && !!event.target.closest?.('#stage'); touchStartY = event.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].clientY - touchStartY;
    if (touchOnStage && Math.abs(delta) > 48 && !document.body.classList.contains('overview')) go(index + (delta < 0 ? 1 : -1));
  }, { passive: true });

  fullscreenBtn.addEventListener('click', () => { void toggleFullscreen(); });
  notesBtn.addEventListener('click', () => {
    if (document.body.classList.contains('presenting')) { toast(ui.presenterHint); return; }
    setNotes(!notesOpen());
  });
  notesClose.addEventListener('click', () => setNotes(false));
  presenterBtn.addEventListener('click', () => {
    if (typeof window.__dshTogglePresenter === 'function') window.__dshTogglePresenter();
    else if (presenterOpen()) closePresenter();
    else openPresenter();
  });
  overviewBtn.addEventListener('click', () => setOverview(!document.body.classList.contains('overview')));
  helpBtn.addEventListener('click', () => { helpPanel.hidden = !helpPanel.hidden; });
  frames.forEach((frame, i) => {
    frame.addEventListener('click', () => {
      if (document.body.classList.contains('overview')) { go(i); setOverview(false); }
    });
    frame.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && document.body.classList.contains('overview')) { go(i); setOverview(false); }
    });
  });
  window.addEventListener('resize', function () { updateThumbScale(); fitStage(); });
  window.addEventListener('beforeunload', closePresenter);

  ${delivery.script}
  window.addEventListener('dsh-data-change', () => { syncNotes(); if (presenterOpen()) sendInit(); updatePresenter(); });
  fitStage();
  const start = Number.parseInt(location.hash?.replace('#slide-', ''), 10);
  go(Number.isInteger(start) ? start - 1 : 0);
})();
</script>
${dataView.script}
</body>
</html>`
}

function renderHtmlSlide(slide, index, ui, langId, manifest = {}, theme) {
  const layout = slide.layout || 'bullets'
  const total = manifest.slides?.length ?? 1
  const number = String(index + 1).padStart(2, '0')
  const chromeStyle = resolveChromeStyle(theme, slide, manifest.brand)
  let inner = deckMedia.MEDIA_LAYOUTS.has(layout)
    ? deckMedia.renderMediaHtml(slide, manifest, theme)
    : renderCoreSlideHtml(slide, index, total, ui, langId, manifest, theme)

  const isStepReveal = slide.reveal === 'step'
  if (isStepReveal && inner.includes('data-item-index="')) {
    let stepSeq = 0
    inner = inner.replace(/data-item-index="(\d+)"/g, (_, idxStr) => {
      stepSeq += 1
      return `data-item-index="${idxStr}" data-reveal-step="${stepSeq}"`
    })
  }
  const revealAttr = isStepReveal ? ' data-reveal="step"' : ''
  const resolvedTransition = resolveSlideTransition(slide, manifest.motionProfile)
  const transitionAttr = resolvedTransition && resolvedTransition !== 'fade' ? ' data-transition="' + escapeHtml(resolvedTransition) + '"' : ''

  const notesAttr = typeof slide.notes === 'string' && slide.notes.trim() !== ''
    ? ' data-notes="' + escapeHtml(slide.notes) + '"'
    : ''
  const densityAttr = slide.visual?.density
    ? ' data-density="' + escapeHtml(slide.visual.density) + '"'
    : ''
  const tableStyleAttr = (layout === 'table' || layout === 'harvey')
    ? ' data-table-style="' + escapeHtml(slide.tableStyle || slide.visual?.tableStyle || theme.defaultTableStyle || 'consulting') + '"'
    : ''
  const chromeAttr = ' data-chrome="' + escapeHtml(chromeStyle) + '"'
  const visualStyle = visualHtmlStyle(slide.visual)
  const hasLogo = Boolean(manifest.brand?.logoAssetId)
  const isFramingSlide = layout === 'cover' || layout === 'closing' || layout === 'section'
  const slideClasses = 'slide slide--' + escapeHtml(layout) + (layout === 'bullets' ? ' bullets' : '') + (hasLogo ? ' has-brand-logo' : '')
  const watermarkHtml = (!isFramingSlide && typeof manifest.brand?.watermark === 'string' && manifest.brand.watermark.trim())
    ? '<div class="brand-watermark" aria-label="Watermark">' + escapeHtml(manifest.brand.watermark.trim()) + '</div>'
    : ''

  return '<section class="' + slideClasses + '" data-index="' + number + '"' + chromeAttr + revealAttr + transitionAttr + notesAttr + densityAttr + tableStyleAttr + (visualStyle ? ' style="' + escapeHtml(visualStyle) + '"' : '') + '>' +
    '<div class="slide-inner">' + inner + '</div>' +
    watermarkHtml +
    (hasLogo ? '<img class="brand-logo" src="' + escapeHtml(manifest.assets?.[manifest.brand.logoAssetId]?.data ?? '') + '" alt="' + escapeHtml(manifest.brand.name || 'Logo') + '"/>' : '') +
    (manifest.brand?.footer ? '<div class="brand-footer">' + escapeHtml(manifest.brand.footer) + '</div>' : '') + '</section>'
}

// ---------------------------------------------------------------------------
// PPTX（OOXML 组件装配 + node:zlib zip）
// ---------------------------------------------------------------------------

function hex(value) {
  return String(value).replace('#', '').toUpperCase()
}

function slideShapeList(slide, index, total, theme, langId, manifest = {}) {
  const lang = langId || 'zh-CN'
  const idBase = (index + 1) * 10
  let xml = ''

  if (deckMedia.MEDIA_LAYOUTS.has(slide.layout)) {
    const fontHelpers = {
      latinHeading: pptxFontName(theme.fonts.heading),
      eaHeading: pptxEastAsianFont(theme.fonts.heading),
      latinBody: pptxFontName(theme.fonts.body),
      eaBody: pptxEastAsianFont(theme.fonts.body),
    }
    const mediaShapes = typeof deckMedia.renderMediaPptxShapes === 'function'
      ? deckMedia.renderMediaPptxShapes(slide, index, theme, lang, fontHelpers, total, manifest)
      : ''
    if (mediaShapes.includes('name="Page number"')) {
      xml = mediaShapes
    } else {
      const folio = String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0')
      const folioShape = ooxmlShape(idBase + 9, 'Page number', { x: 10.65, y: 6.95, w: 2.06, h: 0.32 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(folio, {
            sizePt: 9.5,
            color: theme.tokens.inkMuted,
            lang,
            align: 'r',
            font: theme.fonts.body,
            lineHeight: 1.15,
          }),
        ],
      })
      xml = mediaShapes + folioShape
    }
  } else {
    xml = renderCoreSlidePptx(slide, index, total, theme, lang, manifest)
  }

  return visualShapeXml(xml, slide.visual)
}

/**
 * 原生逐条点击显现动画（PowerPoint「出现，按段落」的标准时序树）：
 * bldP 把正文文本框标记为按段落构建，主序列里每条要点一个点击节点。
 */
function bulletTimingXml(spid, clicks) {
  let id = 2
  const nextId = () => { id += 1; return String(id) }
  const clickPars = []
  for (let i = 0; i < clicks; i += 1) {
    clickPars.push(
      '<p:par><p:cTn id="' + nextId() + '" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>' +
      '<p:par><p:cTn id="' + nextId() + '" presetID="1" presetClass="entr" presetSubtype="0" fill="hold" grpId="0" nodeType="clickEffect">' +
      '<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>' +
      '<p:set><p:cBhvr><p:cTn id="' + nextId() + '" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>' +
      '<p:tgtEl><p:spTgt spid="' + spid + '"/></p:tgtEl>' +
      '<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>' +
      '<p:to><p:strVal val="visible"/></p:to></p:set>' +
      '</p:childTnLst></p:cTn></p:par>' +
      '</p:childTnLst></p:cTn></p:par>',
    )
  }
  return '<p:timing><p:tnLst><p:par>' +
    '<p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>' +
    '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>' +
    clickPars.join('') +
    '</p:childTnLst></p:cTn>' +
    '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>' +
    '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>' +
    '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>' +
    '<p:bldLst><p:bldP spid="' + spid + '" grpId="0"/></p:bldLst></p:timing>'
}

function multiShapeTimingXml(groups) {
  let id = 2
  const nextId = () => { id += 1; return String(id) }
  const normalizedGroups = groups.map((g) => (Array.isArray(g) ? g : [g])).filter((g) => g.length > 0)
  const allSpids = []
  const clickPars = normalizedGroups.map((group, grpIdx) => {
    const memberPars = group.map((spid, mIdx) => {
      allSpids.push({ spid, grpIdx })
      const nodeType = mIdx === 0 ? 'clickEffect' : 'withEffect'
      return '<p:par><p:cTn id="' + nextId() + '" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" grpId="' + grpIdx + '" nodeType="' + nodeType + '">' +
        '<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>' +
        '<p:set><p:cBhvr><p:cTn id="' + nextId() + '" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>' +
        '<p:tgtEl><p:spTgt spid="' + spid + '"/></p:tgtEl>' +
        '<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>' +
        '<p:to><p:strVal val="visible"/></p:to></p:set>' +
        '<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="' + nextId() + '" dur="350"/>' +
        '<p:tgtEl><p:spTgt spid="' + spid + '"/></p:tgtEl></p:cBhvr></p:animEffect>' +
        '</p:childTnLst></p:cTn></p:par>'
    }).join('')
    return '<p:par><p:cTn id="' + nextId() + '" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>' +
      '<p:par><p:cTn id="' + nextId() + '" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>' +
      memberPars +
      '</p:childTnLst></p:cTn></p:par>' +
      '</p:childTnLst></p:cTn></p:par>'
  })
  const bldPs = allSpids.map(({ spid, grpIdx }) => '<p:bldP spid="' + spid + '" grpId="' + grpIdx + '"/>').join('')
  return '<p:timing><p:tnLst><p:par>' +
    '<p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>' +
    '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>' +
    clickPars.join('') +
    '</p:childTnLst></p:cTn>' +
    '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>' +
    '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>' +
    '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>' +
    '<p:bldLst>' + bldPs + '</p:bldLst></p:timing>'
}

function parseShapeBoxes(shapesXml) {
  const boxes = []
  const re = /<p:(sp|cxnSp)\b[^>]*>[\s\S]*?<p:cNvPr\s+id="(\d+)"\s+name="([^"]*)"[\s\S]*?<a:off\s+x="(\d+)"\s+y="(\d+)"\s*\/>\s*<a:ext\s+cx="(\d+)"\s+cy="(\d+)"\s*\/>[\s\S]*?<\/p:\1>/g
  for (const m of shapesXml.matchAll(re)) {
    boxes.push({
      tag: m[1],
      spid: m[2],
      name: m[3],
      x: Number(m[4]),
      y: Number(m[5]),
      w: Number(m[6]),
      h: Number(m[7]),
    })
  }
  return boxes
}

function extractStepRevealGroups(shapesXml) {
  const all = parseShapeBoxes(shapesXml)
  const stepNameRe = /^(?:KPI Surface|KPI Hero Surface|KPI Sat Val|Card Surface|Card Hero Surface|Comparison Card|Issue Card|Matrix Surface|Matrix Cell|Matrix Quadrant|Step Surface|Timeline Card|Timeline Step|Stage |Layer |Chevron |Iso Info Card|Iso Pillar Cap|Iso Stack Card|IssueTree Branch|Pricing Card|Gauge Row)/i
  const excludeAnchorRe = /hairline|rule|bar|shadow|top|bottom|accent|editorial|label|tag|badge|head|title|desc|stripe|axis|connector|number|rail|leader|anchor|tick|pill/i
  const excludeChildRe = /^(?:Title|Kicker|Header|Footer|Page number|Brand|Takeaway|Slide |Beamer |Editorial folio|Gov |Watermark)/i

  const anchors = []
  const anchorSet = new Set()
  for (const b of all) {
    if (stepNameRe.test(b.name) && !excludeAnchorRe.test(b.name) && !anchorSet.has(b.spid)) {
      anchorSet.add(b.spid)
      anchors.push(b)
    }
  }
  const capped = anchors.slice(0, 8)
  if (capped.length < 2) return []

  const claimed = new Set(capped.map((a) => a.spid))
  const pad = 70000 // ~0.076" tolerance for top bars / edge rails
  return capped.map((anchor) => {
    const group = [anchor.spid]
    const minX = anchor.x - pad
    const maxX = anchor.x + anchor.w + pad
    const minY = anchor.y - pad
    const maxY = anchor.y + anchor.h + pad
    for (const cand of all) {
      if (claimed.has(cand.spid)) continue
      if (cand.w > 10000000 || excludeChildRe.test(cand.name)) continue
      const cx = cand.x + cand.w / 2
      const cy = cand.y + cand.h / 2
      if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
        claimed.add(cand.spid)
        group.push(cand.spid)
      }
    }
    return group
  })
}

function resolveSlideTransition(slide, motionProfile) {
  const explicit = String(slide?.transition ?? '').trim().toLowerCase()
  if (['fade', 'push', 'wipe', 'cover', 'cut', 'none'].includes(explicit)) return explicit
  if (motionProfile === 'subtle') return 'fade'
  if (motionProfile === 'keynote') {
    const layout = String(slide?.layout ?? 'bullets')
    if (layout === 'cover' || layout === 'section' || layout === 'closing' || layout === 'statement' || layout === 'quote') return 'fade'
    if (layout === 'chart' || layout === 'chart-split' || layout === 'waterfall' || layout === 'radar' || layout === 'heatmap' || layout === 'treemap' || layout === 'gauge') return 'wipe'
    return 'push'
  }
  return 'fade'
}

function transitionXmlFor(motionProfile, slide) {
  const kind = resolveSlideTransition(slide, motionProfile)
  if (kind === 'none') return ''
  if (kind === 'cut') return '<p:transition spd="fast"><p:cut/></p:transition>'
  if (kind === 'push') return '<p:transition spd="med"><p:push dir="l"/></p:transition>'
  if (kind === 'wipe') return '<p:transition spd="med"><p:wipe dir="l"/></p:transition>'
  if (kind === 'cover') return '<p:transition spd="med"><p:cover dir="l"/></p:transition>'
  const spd = motionProfile === 'subtle' ? 'fast' : 'med'
  return '<p:transition spd="' + spd + '"><p:fade/></p:transition>'
}

function slideXml(slide, index, total, theme, langId, motion, manifest = {}) {
  const p = theme.palette
  const shapesXml = slideShapeList(slide, index, total, theme, langId, manifest)
  let motionXml = ''
  if (motion) {
    motionXml = transitionXmlFor(manifest.motionProfile, slide)
    const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
    const bodySpid = (index + 1) * 10 + 3
    if (slide.reveal === 'step' && slide.layout !== 'bullets') {
      const stepGroups = extractStepRevealGroups(shapesXml)
      if (stepGroups.length >= 2) {
        motionXml += multiShapeTimingXml(stepGroups)
      }
    } else if (slide.layout === 'bullets' && bullets.length >= 2 && shapesXml.includes('id="' + bodySpid + '"')) {
      motionXml += bulletTimingXml(bodySpid, bullets.length)
    }
  }
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="' + hex(p.bg) + '"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>' +
    '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    shapesXml +
    '</p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr>' +
    motionXml +
    '</p:sld>'
}

function slideRelXml(hasNotes, slideIndex) {
  const notesRel = hasNotes
    ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide' + slideIndex + '.xml"/>'
    : ''
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    notesRel +
    '</Relationships>'
}

function presentationXml(slideCount, hasNotesMaster) {
  const slideIds = Array.from({ length: slideCount }, (_, i) =>
    '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>').join('')
  const notesMasterId = hasNotesMaster
    ? '<p:notesMasterIdLst><p:notesMasterId id="2147483649" r:id="rId' + (slideCount + 2) + '"/></p:notesMasterIdLst>'
    : ''
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst>' + slideIds + '</p:sldIdLst>' +
    notesMasterId +
    '<p:sldSz cx="' + EMU_W + '" cy="' + EMU_H + '" type="screen16x9"/>' +
    '<p:notesSz cx="6858000" cy="9144000"/>' +
    '</p:presentation>'
}

function presentationRelXml(slideCount, hasNotesMaster) {
  const slideRels = Array.from({ length: slideCount }, (_, i) =>
    '<Relationship Id="rId' + (i + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i + 1) + '.xml"/>').join('')
  const notesMasterRel = hasNotesMaster
    ? '<Relationship Id="rId' + (slideCount + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="notesMasters/notesMaster1.xml"/>'
    : ''
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
    slideRels +
    notesMasterRel +
    '</Relationships>'
}

function notesMasterXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:notesMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '</p:spTree></p:cSld>' +
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
    '<p:notesStyle><a:lvl1pPr><a:defRPr sz="1200"/></a:lvl1pPr></p:notesStyle>' +
    '</p:notesMaster>'
}

function notesMasterRelXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
    '</Relationships>'
}

function notesSlideXml(notes, langId) {
  const lang = langId || 'zh-CN'
  const paragraphs = String(notes ?? '').split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => '<a:p><a:r><a:rPr lang="' + lang + '" sz="1200" dirty="0"/><a:t>' + escapeXml(line) + '</a:t></a:r></a:p>')
    .join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr/><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr/><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>' +
    '<p:txBody><a:bodyPr/><a:lstStyle/>' + paragraphs + '</p:txBody></p:sp>' +
    '</p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr>' +
    '</p:notes>'
}

function notesSlideRelXml(slideIndex) {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide' + slideIndex + '.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster" Target="../notesMasters/notesMaster1.xml"/>' +
    '</Relationships>'
}

function slideMasterXml(theme) {
  const p = theme.palette
  const levels = Array.from({ length: 9 }, (_, i) => {
    const sz = Math.max(1100, 2000 - i * 100)
    return '<a:lvl' + (i + 1) + 'pPr marL="' + (342900 + i * 342900) + '" indent="' + (-342900) + '">' +
      '<a:defRPr sz="' + sz + '"><a:solidFill><a:srgbClr val="' + hex(p.fg) + '"/></a:solidFill><a:latin typeface="' + escapeXml(pptxFontName(theme.fonts.body)) + '"/><a:ea typeface="' + escapeXml(pptxEastAsianFont(theme.fonts.body)) + '"/></a:defRPr></a:lvl' + (i + 1) + 'pPr>'
  }).join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '</p:spTree></p:cSld>' +
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    '<p:txStyles><p:titleStyle>' + levels + '</p:titleStyle><p:bodyStyle>' + levels + '</p:bodyStyle><p:otherStyle>' + levels + '</p:otherStyle></p:txStyles>' +
    '</p:sldMaster>'
}

function slideMasterRelXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
    '</Relationships>'
}

function slideLayoutXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">' +
    '<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '</p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:overrideClrMapping bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/></p:clrMapOvr>' +
    '</p:sldLayout>'
}

function slideLayoutRelXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
    '</Relationships>'
}

export function themeXml(theme) {
  const p = theme.palette
  const series = theme.tokens?.chartSeries ?? [p.accent, p.accent2, p.fg, p.muted, p.accent, p.accent2]
  const color = (name, value) => '<a:' + name + '><a:srgbClr val="' + hex(value) + '"/></a:' + name + '>'
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="dsh-ppt ' + escapeXml(theme.name?.en ?? theme.id ?? 'Theme') + '">' +
    '<a:themeElements>' +
    '<a:clrScheme name="dsh-ppt">' +
    color('dk1', p.fg) + color('lt1', p.bg) + color('dk2', p.muted) + color('lt2', p.panel) +
    color('accent1', series[0] ?? p.accent) + color('accent2', series[1] ?? p.accent2) + color('accent3', series[2] ?? p.fg) +
    color('accent4', series[3] ?? p.muted) + color('accent5', series[4] ?? p.accent) + color('accent6', series[5] ?? p.accent2) +
    color('hlink', p.accent) + color('folHlink', p.accent2) +
    '</a:clrScheme>' +
    '<a:fontScheme name="dsh-ppt">' +
    '<a:majorFont><a:latin typeface="' + escapeXml(pptxFontName(theme.fonts.heading)) + '"/><a:ea typeface="' + escapeXml(pptxEastAsianFont(theme.fonts.heading)) + '"/><a:cs typeface=""/></a:majorFont>' +
    '<a:minorFont><a:latin typeface="' + escapeXml(pptxFontName(theme.fonts.body)) + '"/><a:ea typeface="' + escapeXml(pptxEastAsianFont(theme.fonts.body)) + '"/><a:cs typeface=""/></a:minorFont>' +
    '</a:fontScheme>' +
    '<a:fmtScheme name="dsh-ppt">' +
    '<a:fillStyleLst>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '</a:fillStyleLst>' +
    '<a:lnStyleLst><a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln></a:lnStyleLst>' +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
    '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>' +
    '</a:fmtScheme>' +
    '</a:themeElements>' +
    '<a:objectDefaults/><a:extraClrSchemeLst/>' +
    '</a:theme>'
}

function contentTypesXml(slideCount, noteIndexes) {
  const overrides = Array.from({ length: slideCount }, (_, i) =>
    '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join('')
  const notesOverrides = noteIndexes.map((index) =>
    '<Override PartName="/ppt/notesSlides/notesSlide' + (index + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>').join('')
  const notesMasterOverride = noteIndexes.length > 0
    ? '<Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>'
    : ''
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
    notesMasterOverride +
    overrides +
    notesOverrides +
    '</Types>'
}

function rootRelXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
    '</Relationships>'
}

function coreXml(title) {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
    'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '<dc:title>' + escapeXml(title) + '</dc:title><dc:creator>dsh-ppt</dc:creator>' +
    '<cp:lastModifiedBy>dsh-ppt</cp:lastModifiedBy>' +
    '</cp:coreProperties>'
}

function appXml(slideCount, notesCount) {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
    '<Application>dsh-ppt</Application><PresentationFormat>Widescreen</PresentationFormat>' +
    '<Slides>' + slideCount + '</Slides><Notes>' + notesCount + '</Notes><HiddenSlides>0</HiddenSlides>' +
    '</Properties>'
}

export function buildZip(entries) {
  const chunks = []
  const central = []
  let offset = 0

  for (const entry of entries) {
    const entryOffset = offset
    const name = Buffer.from(entry.name, 'utf8')
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data), 'utf8')
    const crc = crc32(data)
    const compressed = deflateRawSync(data)
    const method = 8
    const nameLength = name.length
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(method, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0x21, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(nameLength, 26)
    localHeader.writeUInt16LE(0, 28)

    chunks.push(localHeader, name, compressed)
    offset += 30 + nameLength + compressed.length

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(method, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0x21, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(compressed.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(nameLength, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(entryOffset, 42)
    central.push(centralHeader, name)
  }

  const centralOffset = offset
  const centralSize = central.reduce((sum, part) => sum + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(centralOffset, 16)
  end.writeUInt16LE(0, 20)

  chunks.push(...central, end)
  return Buffer.concat(chunks)
}

let CRC_TABLE = null
function crc32(buffer) {
  if (CRC_TABLE === null) {
    CRC_TABLE = new Int32Array(256)
    for (let n = 0; n < 256; n += 1) {
      let c = n
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
      CRC_TABLE[n] = c
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function buildPptx(manifest, themeInput, languageInput) {
  const theme = themeInput?.id ? themeInput : resolveTheme(themeInput)
  const language = languageInput?.id ? languageInput : resolveLanguage(languageInput)
  const motion = manifest.motion !== false
  const slides = manifest.slides
  const noteIndexes = []
  slides.forEach((slide, index) => {
    if (typeof slide.notes === 'string' && slide.notes.trim() !== '') noteIndexes.push(index)
  })
  const hasNotesMaster = noteIndexes.length > 0
  const entries = [
    { name: '[Content_Types].xml', data: contentTypesXml(slides.length, noteIndexes) },
    { name: '_rels/.rels', data: rootRelXml() },
    { name: 'docProps/app.xml', data: appXml(slides.length, noteIndexes.length) },
    { name: 'docProps/core.xml', data: coreXml(manifest.title) },
    { name: 'ppt/presentation.xml', data: presentationXml(slides.length, hasNotesMaster) },
    { name: 'ppt/_rels/presentation.xml.rels', data: presentationRelXml(slides.length, hasNotesMaster) },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: slideMasterXml(theme) },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: slideMasterRelXml() },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: slideLayoutXml(theme) },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: slideLayoutRelXml() },
    { name: 'ppt/theme/theme1.xml', data: themeXml(theme) },
  ]
  if (hasNotesMaster) {
    entries.push({ name: 'ppt/notesMasters/notesMaster1.xml', data: notesMasterXml() })
    entries.push({ name: 'ppt/notesMasters/_rels/notesMaster1.xml.rels', data: notesMasterRelXml() })
  }
  slides.forEach((slide, index) => {
    const hasNotes = noteIndexes.includes(index)
    entries.push({ name: 'ppt/slides/slide' + (index + 1) + '.xml', data: slideXml(slide, index, slides.length, theme, language.attr, motion, manifest) })
    entries.push({ name: 'ppt/slides/_rels/slide' + (index + 1) + '.xml.rels', data: slideRelXml(hasNotes, index + 1) })
    if (hasNotes) {
      entries.push({ name: 'ppt/notesSlides/notesSlide' + (index + 1) + '.xml', data: notesSlideXml(slide.notes, language.attr) })
      entries.push({ name: 'ppt/notesSlides/_rels/notesSlide' + (index + 1) + '.xml.rels', data: notesSlideRelXml(index + 1) })
    }
  })
  return buildZip(entries)
}

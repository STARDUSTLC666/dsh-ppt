#! /usr/bin/env node
/**
 * deck-core.mjs —— dsh-ppt 的零依赖演示文稿引擎。
 *
 * 这是插件工具与裸 SKILL.md 共用的唯一事实源：
 *   - DSH 内：ppt_create 工具动态加载本文件
 *   - 其他 harness：直接运行同目录的 build-deck.mjs
 *
 * 能力：Markdown / 结构化 slides → 三件套
 *   deck.html  独立网页放映（键盘/触屏/打印，无外链）
 *   deck.pptx  可编辑 PPTX（16:9，OOXML 由本文件手写，zip 用 node:zlib）
 *   deck.json  结构化 deck manifest
 *
 * 零运行时依赖，仅使用 node:fs / node:path / node:zlib。
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath, join as joinPath } from 'node:path'
import { deflateRawSync } from 'node:zlib'

/**
 * manifest 版本跟随发布包 package.json；把 skills/dsh-ppt 独立复制到其他
 * harness（没有 package.json）时回退为 0.0.0，避免版本号悄悄漂移。
 */
function readDeckVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'))
    const version = String(pkg.version ?? '').trim()
    return version !== '' ? version : '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export const DECK_VERSION = readDeckVersion()

// ---------------------------------------------------------------------------
// 主题
// ---------------------------------------------------------------------------

export const THEMES = {
  swiss: {
    id: 'swiss',
    name: { zh: '瑞士脉冲', en: 'Swiss Pulse' },
    mood: { zh: '精准、理性、数据', en: 'Precise, rational, data-driven' },
    bestFor: { zh: 'SaaS、数据、开发者工具', en: 'SaaS, data, developer tools' },
    dark: true,
    palette: {
      bg: '#10151B',
      panel: '#161D26',
      fg: '#F5F7FA',
      muted: '#8E9AAA',
      accent: '#2F6BFF',
      accent2: '#FFB300',
    },
    fonts: {
      heading: '"Helvetica Neue", Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
      body: '"Helvetica Neue", Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
    },
  },
  velvet: {
    id: 'velvet',
    name: { zh: '天鹅绒标准', en: 'Velvet Standard' },
    mood: { zh: '高级、克制、可信', en: 'Premium, restrained, trustworthy' },
    bestFor: { zh: '高管汇报、品牌、融资路演', en: 'Executive decks, brand, investor pitches' },
    dark: true,
    palette: {
      bg: '#111316',
      panel: '#1A1D22',
      fg: '#F4EFE6',
      muted: '#A79F91',
      accent: '#C9A84C',
      accent2: '#3D4A63',
    },
    fonts: {
      heading: 'Georgia, "Times New Roman", "Songti SC", "SimSun", serif',
      body: '"Helvetica Neue", Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
    },
  },
  data: {
    id: 'data',
    name: { zh: '数据漂移', en: 'Data Drift' },
    mood: { zh: '未来、沉浸、前沿', en: 'Futuristic, immersive, cutting-edge' },
    bestFor: { zh: 'AI、数据、研究、技术发布', en: 'AI, data, research, tech launches' },
    dark: true,
    palette: {
      bg: '#070B14',
      panel: '#0D1424',
      fg: '#E8F1FF',
      muted: '#7E8BA8',
      accent: '#7C3AED',
      accent2: '#06B6D4',
    },
    fonts: {
      heading: '"Space Grotesk", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      body: '"Space Grotesk", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    },
  },
  soft: {
    id: 'soft',
    name: { zh: '柔和信号', en: 'Soft Signal' },
    mood: { zh: '温暖、亲近、人本', en: 'Warm, intimate, human' },
    bestFor: { zh: '品牌故事、培训、个人分享', en: 'Brand stories, training, personal talks' },
    dark: false,
    palette: {
      bg: '#FFF8EC',
      panel: '#FFF2DE',
      fg: '#3B2F2A',
      muted: '#7E6F68',
      accent: '#E58A2F',
      accent2: '#8FAF8C',
    },
    fonts: {
      heading: '"Avenir Next", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      body: '"Avenir Next", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    },
  },
  bold: {
    id: 'bold',
    name: { zh: '极繁大字', en: 'Maximalist Type' },
    mood: { zh: '大声、动能、发布', en: 'Loud, kinetic, launch' },
    bestFor: { zh: '产品发布、活动、品牌大事件', en: 'Product launches, events, brand moments' },
    dark: true,
    palette: {
      bg: '#0D0D0D',
      panel: '#181818',
      fg: '#FFFFFF',
      muted: '#B8B8B8',
      accent: '#E63946',
      accent2: '#FFD60A',
    },
    fonts: {
      heading: 'Impact, "Arial Black", "PingFang SC", "Microsoft YaHei", sans-serif',
      body: '"Helvetica Neue", Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
    },
  },
}

export const THEME_IDS = Object.keys(THEMES)
export const DEFAULT_THEME = 'data'

export const LANGUAGES = {
  zh: {
    id: 'zh',
    attr: 'zh-CN',
    ui: {
      slide: '第',
      of: '/ 共',
      theme: '主题',
      help: '← → 翻页 · F 全屏 · G 总览 · S 备注 · P 打印',
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
      overviewHint: '点击缩略图跳页，方向键切换，Enter 进入，Esc 退出'
    },
  },
  en: {
    id: 'en',
    attr: 'en-US',
    ui: {
      slide: 'Slide',
      of: '/',
      theme: 'Theme',
      help: '← → navigate · F fullscreen · G overview · S notes · P print',
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
      overviewHint: 'Click a thumbnail to jump; arrows move, Enter opens, Esc exits'
    },
  },
  bilingual: {
    id: 'bilingual',
    attr: 'zh-CN',
    ui: {
      slide: '第',
      of: '/ 共',
      theme: '主题 · Theme',
      help: '← → 翻页 · F 全屏 · G 总览 · S 备注 · P 打印',
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
      overviewHint: '点击缩略图跳页 · Click to jump, arrows move, Enter opens, Esc exits'
    },
  },
}

 // ---------------------------------------------------------------------------
// 主题预览（ppt_themes preview=true / buildThemePreview）
// ---------------------------------------------------------------------------

function themePages(lang) {
  return lang === 'en'
    ? { title: 'dsh-ppt theme gallery', hint: 'Pick a theme id for ppt_create', usage: 'theme', dark: 'dark', light: 'light', palette: 'Palette' }
    : { title: 'dsh-ppt 主题预览', hint: '把 id 填给 ppt_create 的 theme 参数', usage: 'theme', dark: '深色', light: '浅色', palette: '色板' }
}

/** 单套主题的 960x540 SVG 色板卡：可直接放进 README / npm 首屏。 */
export function renderThemeSvg(input, lang = 'zh') {
  const theme = typeof input === 'string' ? resolveTheme(input) : input
  const pick = (pair) => (lang === 'en' ? pair.en : pair.zh)
  const p = theme.palette
  const L = themePages(lang === 'en' ? 'en' : 'zh')
  const font = theme.fonts.heading.replace(/"/g, "'")
  const bodyFont = theme.fonts.body.replace(/"/g, "'")
  const out = []
  out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540" role="img" aria-label="' + escapeXml(theme.id + ' ' + pick(theme.name)) + '">')
  out.push('<rect width="960" height="540" fill="' + p.bg + '"/>')
  out.push('<rect x="0" y="0" width="960" height="6" fill="' + p.accent + '"/><rect x="0" y="534" width="960" height="6" fill="' + p.accent2 + '"/>')
  out.push('<rect x="36" y="40" width="560" height="360" rx="16" fill="' + p.panel + '" stroke="' + hexToRgba(p.muted, 0.45) + '"/>')
  out.push('<text x="64" y="92" fill="' + p.accent + '" font-family="' + escapeXml(bodyFont) + '" font-size="14" font-weight="700" letter-spacing="3">' + escapeXml(pick(theme.mood).toUpperCase()) + '</text>')
  out.push('<text x="64" y="158" fill="' + p.fg + '" font-family="' + escapeXml(font) + '" font-size="42" font-weight="800">' + escapeXml('Aa ' + pick(theme.name)) + '</text>')
  out.push('<circle cx="72" cy="206" r="5" fill="' + p.accent + '"/><rect x="92" y="199" width="360" height="12" rx="6" fill="' + hexToRgba(p.fg, 0.75) + '"/>')
  out.push('<circle cx="72" cy="240" r="5" fill="' + p.accent + '"/><rect x="92" y="233" width="300" height="12" rx="6" fill="' + hexToRgba(p.fg, 0.55) + '"/>')
  out.push('<circle cx="72" cy="274" r="5" fill="' + p.accent + '"/><rect x="92" y="267" width="330" height="12" rx="6" fill="' + hexToRgba(p.fg, 0.55) + '"/>')
  out.push('<rect x="64" y="312" width="500" height="34" rx="6" fill="' + p.accent + '"/>')
  out.push('<text x="78" y="334" fill="' + p.bg + '" font-family="' + escapeXml(bodyFont) + '" font-size="14" font-weight="700">dsh-ppt</text>')
  out.push('<text x="470" y="334" fill="' + p.bg + '" font-family="' + escapeXml(bodyFont) + '" font-size="14" font-weight="700" text-anchor="end">1,234</text>')
  out.push('<rect x="64" y="346" width="500" height="2" fill="' + hexToRgba(p.muted, 0.5) + '"/>')
  out.push('<text x="64" y="378" fill="' + p.muted + '" font-family="' + escapeXml(bodyFont) + '" font-size="13">' + escapeXml(theme.id + ' · ' + (theme.dark ? L.dark : L.light) + ' · v' + DECK_VERSION) + '</text>')
  const swatches = ['bg', 'panel', 'fg', 'muted', 'accent', 'accent2']
  const labels = ['bg', 'panel', 'fg', 'muted', 'accent', 'accent2']
  out.push('<text x="632" y="76" fill="' + p.muted + '" font-family="' + escapeXml(bodyFont) + '" font-size="13" font-weight="700" letter-spacing="2">' + escapeXml(L.palette.toUpperCase()) + '</text>')
  swatches.forEach((key, i) => {
    const y = 96 + i * 62
    out.push('<rect x="632" y="' + y + '" width="44" height="44" rx="10" fill="' + p[key] + '" stroke="' + hexToRgba(p.muted, 0.45) + '"/>')
    out.push('<text x="692" y="' + (y + 20) + '" fill="' + p.fg + '" font-family="' + escapeXml(bodyFont) + '" font-size="14" font-weight="600">' + escapeXml(labels[i]) + '</text>')
    out.push('<text x="692" y="' + (y + 38) + '" fill="' + p.muted + '" font-family="' + escapeXml(bodyFont) + '" font-size="13">' + escapeXml(String(p[key]).toUpperCase()) + '</text>')
  })
  out.push('<text x="632" y="508" fill="' + p.muted + '" font-family="' + escapeXml(bodyFont) + '" font-size="12">' + escapeXml(pick(theme.bestFor)).slice(0, 44) + '</text>')
  out.push('</svg>')
  return out.join('')
}

/** 自包含主题对比页：5 套主题并排，含色板与用法。 */
export function renderThemePreviewHtml(lang = 'zh') {
  const L = themePages(lang === 'en' ? 'en' : 'zh')
  const cards = THEME_IDS.map((id) => {
    const theme = THEMES[id]
    const pick = (pair) => (lang === 'en' ? pair.en : pair.zh)
    const chips = Object.keys(theme.palette).map((key) =>
      '<span class="chip"><i style="background:' + theme.palette[key] + '"></i>' + escapeHtml(String(theme.palette[key]).toUpperCase()) + '</span>').join('')
    return '<figure class="card" id="theme-' + escapeHtml(id) + '">' +
      renderThemeSvg(theme, lang === 'en' ? 'en' : 'zh') +
      '<figcaption><div class="row"><strong>' + escapeHtml(id) + '</strong><span class="badge">' + escapeHtml(pick(theme.name)) + '</span></div>' +
      '<p class="muted">' + escapeHtml(pick(theme.mood)) + ' · ' + escapeHtml(pick(theme.bestFor)) + '</p>' +
      '<p class="chips">' + chips + '</p>' +
      '<p class="usage">' + escapeHtml(L.usage) + ': <code>' + escapeHtml(id) + '</code></p></figcaption></figure>'
  }).join('')
  return '<!DOCTYPE html>' + eolSafe('<html lang="zh-CN">') +
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + escapeHtml(L.title) + '</title><style>' +
    'body{margin:0;background:#0b0f17;color:#e8f1ff;font-family:"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;padding:28px}' +
    'h1{font-size:26px;margin:0 0 6px}p.sub{color:#8b98ad;margin:0 0 24px;font-size:14px}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:22px}' +
    '.card{margin:0;background:#111827;border:1px solid #263043;border-radius:16px;overflow:hidden}' +
    '.card svg{display:block;width:100%;height:auto}' +
    'figcaption{padding:14px 16px 16px}.row{display:flex;align-items:center;gap:10px;font-size:16px}' +
    '.badge{color:#8b98ad;font-size:13px}.muted{color:#8b98ad;font-size:13px;margin:6px 0 10px;line-height:1.5}' +
    '.chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#aab6c9;background:#0b0f17;border:1px solid #263043;border-radius:99px;padding:3px 9px}' +
    '.chip i{width:10px;height:10px;border-radius:3px;display:inline-block}' +
    '.usage{margin:0;font-size:13px;color:#aab6c9}code{background:#0b0f17;border:1px solid #263043;border-radius:6px;padding:1px 6px}' +
    '@media (prefers-reduced-motion: reduce){*{transition:none!important;animation:none!important}}' +
    '</style></head><body><h1>' + escapeHtml(L.title) + '</h1><p class="sub">' + escapeHtml(L.hint) + ' · dsh-ppt v' + escapeHtml(DECK_VERSION) + '</p>' +
    '<div class="grid">' + cards + '</div></body></html>'
}

function eolSafe(text) { return text }

/** 写主题对比页 + 每套主题 SVG 色板卡；默认不覆盖同名文件。 */
export function buildThemePreview(options = {}) {
  const langInput = typeof options.lang === 'string' && options.lang.trim() !== '' ? options.lang.trim() : 'zh'
  const language = resolveLanguage(langInput)
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
  writeFileSync(htmlPath, renderThemePreviewHtml(language.id), 'utf8')
  const svgs = THEME_IDS.map((id) => {
    const svgPath = pickPath('theme-' + id, '.svg')
    writeFileSync(svgPath, renderThemeSvg(id, language.id), 'utf8')
    return { id, path: svgPath }
  })
  return { ok: true, outputDir, htmlPath, svgs, themeCount: THEME_IDS.length, language: language.id }
}


export function resolveTheme(input) {
  const id = String(input ?? DEFAULT_THEME).trim().toLowerCase()
  const theme = THEMES[id]
  if (!theme) {
    throw new Error('dsh-ppt：未知主题 "' + id + '"，可选：' + THEME_IDS.join(' / ') + '（默认 ' + DEFAULT_THEME + '）')
  }
  return theme
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

export function listThemes(lang = 'zh') {
  const pick = (pair) => (lang === 'en' ? pair.en : pair.zh)
  return THEME_IDS.map((id) => {
    const theme = THEMES[id]
    return {
      id,
      name: pick(theme.name),
      mood: pick(theme.mood),
      bestFor: pick(theme.bestFor),
      dark: theme.dark,
      palette: { ...theme.palette },
      fonts: { ...theme.fonts },
    }
  })
}

// ---------------------------------------------------------------------------
// 文本工具
// ---------------------------------------------------------------------------

export function clampInt(value, fallback, min, max) {
  const n = typeof value === 'number' ? Math.trunc(value) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// Windows 保留设备名：首个点之前的主名命中即不可用（NUL、com1、aux.report.html 都算）。
const WINDOWS_RESERVED_FILE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i

export function sanitizeFileName(input) {
  const base = String(input ?? 'deck').trim().replace(/\.(html?|pptx|json)$/i, '')
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
function resolveDeckFileName(outputDir, requestedFileName, overwrite) {
  // 一次 readdir 建集，替代逐个候选 existsSync 探测（最坏 ~3000 次 stat）；
  // 统一小写比较，避免 Windows 大小写不敏感文件系统把已占用的名字判成可用。
  const existing = new Set(readdirSync(outputDir).map((name) => name.toLowerCase()))
  const isAvailable = (candidate) => DECK_ARTIFACT_EXTENSIONS.every((ext) => !existing.has((candidate + ext).toLowerCase()))
  if (overwrite || isAvailable(requestedFileName)) return requestedFileName
  for (let index = 1; index < 1000; index += 1) {
    const candidate = requestedFileName + '-' + index
    if (isAvailable(candidate)) return candidate
  }
  throw new Error('dsh-ppt：找不到可用的输出文件名（同名前缀超过 999 个），请更换 fileName 或显式允许 overwrite。')
}

export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function stripInlineMarkdown(value) {
  return String(value ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
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
// Markdown → deck
// ---------------------------------------------------------------------------

function createSection(heading = '', level = 0, coverOnly = false) {
  return { heading, level, coverOnly, bullets: [], paragraphs: [], quote: [], table: null, notes: [] }
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

const NOTES_COMMENT = /^<!--\s*(?:notes?|备注)\s*[:：]\s*([\s\S]*?)\s*-->$/

function quoteSlideFrom(section, ui) {
  const lines = [...section.quote]
  let attribution = ''
  const attrMatch = /^(?:——|—|--|-)\s*(.+)$/.exec(lines[lines.length - 1] ?? '')
  if (attrMatch !== null && lines.length > 1) {
    attribution = attrMatch[1]
    lines.pop()
  }
  return { layout: 'quote', kicker: ui.quoteKicker, title: truncate(lines.join(' '), 220), subtitle: attribution }
}

function paginateTable(slide, continuation = '（续）') {
  const rows = slide.rows
  const columns = Math.max(...rows.map(row => row.length))
  if (columns > 8) throw new Error('dsh-ppt：表格最多 8 列，请拆成多个表格后重试 / tables support up to 8 columns')
  if (rows.some(row => row.some(cell => [...cell].length > 60))) {
    throw new Error('dsh-ppt：表格单元格最多 60 个字符，请精简或拆分内容后重试 / cells support up to 60 characters')
  }
  const padded = rows.map(row => Array.from({ length: columns }, (_, i) => row[i] ?? ''))
  const pages = chunk(padded.slice(1), 8)
  if (pages.length === 0) pages.push([])
  return pages.map((body, index) => {
    const { notes, ...rest } = slide
    const title = slide.title + (index === 0 ? '' : continuation)
    // 同名 kicker/title 共用紧凑标题；续页不能凭空多出一行大标题挤压表格。
    return { ...rest, title, kicker: slide.kicker === slide.title ? title : slide.kicker, rows: [padded[0], ...body],
      ...(index === 0 && notes ? { notes } : {}) }
  })
}

function tableSlidesFrom(section, ui) {
  const table = section.table
  const rows = [table.header, ...table.rows]
  const heading = section.heading || ui.tableKicker
  return paginateTable({ layout: 'table', kicker: heading, title: heading, rows }, ui.continuation)
}

/** 把一个 section 里的金句/表格拆成独立页；备注附着到第一张产出页。 */
function specialSlidesFor(section, ui) {
  const out = []
  if (section.quote.length > 0) out.push(quoteSlideFrom(section, ui))
  if (section.table !== null) out.push(...tableSlidesFrom(section, ui))
  if (out.length > 0 && section.notes.length > 0) out[0].notes = section.notes.join('\n')
  return out
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
  // 去除文档级 YAML frontmatter（如果有）
  body = body.replace(/^---[ \t]*\n[\s\S]*?\n---[ \t]*\n?/, '')

  const sections = []
  let current = null
  let firstH1Seen = false

  const flush = () => {
    if (current !== null && (current.heading !== '' || current.bullets.length > 0 || current.paragraphs.length > 0
      || current.table !== null || current.quote.length > 0)) {
      sections.push(current)
    }
    current = null
  }

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (line === '') {
      // 无标题分组按空行分段，保证「文档无标题」时按段落生成幻灯片
      if (current !== null && current.heading === '') flush()
      continue
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

    const bulletMatch = /^\s*(?:[-*+]|\d+[.)])\s+(.+)$/.exec(line)
    if (bulletMatch !== null) {
      const bullet = stripInlineMarkdown(bulletMatch[1])
      if (bullet !== '') {
        if (current === null) current = createSection()
        current.bullets.push(bullet)
      }
      continue
    }

    // 演讲者备注：`<!-- 备注: ... -->` / `<!-- note: ... -->` 附到当前页
    const notesMatch = NOTES_COMMENT.exec(line)
    if (notesMatch !== null && notesMatch[1].trim() !== '') {
      if (current === null) current = createSection()
      current.notes.push(notesMatch[1].trim())
      continue
    }

    // Markdown 表格：连续的 | ... | 行，第二行是分隔线
    const tableCells = splitTableRow(line)
    if (tableCells !== null) {
      if (current === null) current = createSection()
      if (isTableSeparator(tableCells)) continue
      if (current.table === null) {
        current.table = { header: tableCells.map((cell) => stripInlineMarkdown(cell)), rows: [] }
      } else {
        current.table.rows.push(tableCells.map((cell) => stripInlineMarkdown(cell)))
      }
      continue
    }

    // 金句：`>` 引用块（最后一行 `—— 出处` 识别为署名）
    const quoteMatch = /^>\s?(.*)$/.exec(line)
    if (quoteMatch !== null) {
      const quoted = stripInlineMarkdown(quoteMatch[1])
      if (quoted !== '') {
        if (current === null) current = createSection()
        current.quote.push(quoted)
      }
      continue
    }

    const paragraph = stripInlineMarkdown(line)
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
        coverSubtitle = truncate(coverText, 180)
        coverSubtitleConsumed = true
      }
  }

  let bodySections = sections.filter((section) => section.coverOnly !== true)
  // 首个 H1 既是封面又把所有要点收在封面节里时，把封面副标题之外的剩余要点
  // 提升为一个无标题节，走下面的要点页生成逻辑，避免丢掉内容。
  if (bodySections.length === 0 && coverSource !== null && coverSource !== undefined) {
    const usedParagraph = coverSource.paragraphs.length > 0
    const extras = [
      ...(usedParagraph ? coverSource.bullets : coverSource.bullets.slice(1)),
      ...coverSource.paragraphs.slice(usedParagraph ? 1 : 0),
    ]
    if (extras.length > 0) {
      const synthetic = createSection()
      synthetic.bullets = extras
      bodySections = [synthetic]
    }
  }

  // 表格和引用不能只挂在封面节上，否则首个 H1 后没有 H2 时会丢失。
  if (coverSource && (coverSource.table !== null || coverSource.quote.length > 0)) {
    const special = createSection()
    special.table = coverSource.table
    special.quote = coverSource.quote
    special.notes = coverSource.notes
    bodySections.unshift(special)
  }

  if (bodySections.length === 0) {
    // 一句话 / 无结构输入：封面 + 核心观点 + 结束页（仍是完整的三页演示文稿）
    const allText = coverSource !== null && coverSource !== undefined
      ? [...coverSource.bullets, ...coverSource.paragraphs].join(' ')
      : String(content ?? '').trim()
    if (coverSubtitle === '') coverSubtitle = truncate(splitSentences(allText)[0] ?? '', 180)
    slides.push({ layout: 'cover', kicker: ui.coverKicker, title: coverTitle || 'Untitled', subtitle: coverSubtitle })
    if (coverSubtitle !== '') {
      slides.push({ layout: 'statement', kicker: ui.statementKicker, title: coverSubtitle, subtitle: coverTitle })
    }
    slides.push({ layout: 'closing', title: ui.closingTitle, subtitle: coverTitle || 'Untitled' })
    return { title: coverTitle || 'Untitled', subtitle: coverSubtitle, slides }
  }

  const hadHeadings = bodySections.some((section) => section.heading !== '')

  if (!hadHeadings) {
    // 无标题文档：第一段摘要作封面副标题，后续段落拆成要点页
    const ordered = bodySections.map((section) => ({
      section,
      sentences: [...section.bullets, ...section.paragraphs].flatMap((part) => splitSentences(part)),
    }))
    const firstSentence = ordered[0]?.sentences[0] ?? ''
    if (coverSubtitle === '') coverSubtitle = truncate(firstSentence, 180)
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
          title: truncate(points[0], 40) || ui.pointKicker + ' ' + pointIndex,
          bullets: points,
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
  let pointIndex = 0
  for (const section of bodySections) {
    const notes = section.notes.join('\n')
    const specials = specialSlidesFor(section, ui)
    slides.push(...specials)
    if (section.heading === '') {
      const points = [...section.bullets, ...section.paragraphs]
        .flatMap((part) => splitSentences(part))
      // 超过 8 条自动续页，不再静默丢弃；备注只挂在第一页
      for (const [pageIndex, pagePoints] of chunk(points, 8).entries()) {
        pointIndex += 1
        const slide = {
          layout: 'bullets',
          kicker: ui.pointKicker + ' ' + pointIndex,
          title: truncate(pagePoints[0], 40) || ui.pointKicker + ' ' + pointIndex,
          bullets: pagePoints,
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
      // 超过 8 条自动续页，不再静默丢弃；备注只挂在第一页
      pages.forEach((pagePoints, pageIndex) => {
        const label = pageIndex === 0 ? section.heading : section.heading + ui.continuation
        const slide = { layout: 'bullets', kicker: label, title: label, bullets: pagePoints }
        if (pageIndex === 0 && specials.length === 0 && notes !== '') slide.notes = notes
        slides.push(slide)
      })
    } else if (specials.length === 0) {
      const slide = { layout: 'section', kicker: section.heading, title: section.heading }
      if (notes !== '') slide.notes = notes
      slides.push(slide)
    }
  }
  slides.push({ layout: 'closing', title: ui.closingTitle, subtitle: coverTitle || 'Untitled' })
  return { title: coverTitle || 'Untitled', subtitle: coverSubtitle, slides }
}

const SLIDE_LAYOUTS = new Set(['cover', 'section', 'bullets', 'statement', 'closing', 'quote', 'table'])

function normalizeSlide(raw, index) {
  const source = (raw !== null && typeof raw === 'object') ? raw : {}
  const layout = SLIDE_LAYOUTS.has(source.layout) ? source.layout : 'bullets'
  const title = stripInlineMarkdown(source.title ?? '')
  const subtitle = stripInlineMarkdown(source.subtitle ?? '')
  const kicker = stripInlineMarkdown(source.kicker ?? '')
  const text = stripInlineMarkdown(source.text ?? '')
  // 备注保留换行（放映面板与备注页都按原文显示），只做转义，不做 Markdown 清洗
  const notes = String(source.notes ?? '').trim()
  let bullets = []
  if (Array.isArray(source.bullets)) {
    bullets = source.bullets.map((item) => stripInlineMarkdown(String(item))).filter(Boolean)
  } else if (typeof source.bullets === 'string' && source.bullets.trim() !== '') {
    bullets = splitSentences(source.bullets)
  }
  if (layout === 'statement' && title === '' && text !== '') {
    return { layout, kicker, title: text, subtitle: subtitle || '', bullets, ...(notes !== '' ? { notes } : {}) }
  }
  if (layout === 'quote') {
    const quoteText = title !== '' ? title : text
    if (quoteText === '') return { layout: 'statement', kicker, title: subtitle, subtitle: '', bullets, ...(notes !== '' ? { notes } : {}) }
    return { layout, kicker, title: truncate(quoteText, 220), subtitle, ...(notes !== '' ? { notes } : {}) }
  }
  if (layout === 'table') {
    let rows = []
    if (Array.isArray(source.rows)) {
      rows = source.rows
        .map((row) => (Array.isArray(row) ? row : [row]).map((cell) => stripInlineMarkdown(String(cell))))
        .filter((row) => row.some((cell) => cell !== ''))
    }
    if (rows.length === 0) {
      // 没有表格数据的 table 页退化成要点页，避免产出空白版式
      return { layout: 'bullets', kicker, title, subtitle, bullets, ...(notes !== '' ? { notes } : {}) }
    }
    return { layout, kicker: kicker || title, title, rows, ...(notes !== '' ? { notes } : {}) }
  }
  return { layout, kicker, title, subtitle, text, bullets, ...(notes !== '' ? { notes } : {}) }
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
  const slides = rawSlides.map(normalizeSlide).flatMap(slide => slide.layout === 'table'
    ? paginateTable(slide, ui.continuation) : [slide])
  checkSlideLimit(slides, limit)
  if (slides.length === 0) throw new Error('dsh-ppt：slides 规范化后为空')
  return slides
}

// ---------------------------------------------------------------------------
// 构建入口
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
  return { title, theme, language, motion, deck, outputDir, fileName, overwrite }
}

/**
 * 三件套落盘：三份内容全部先写同目录临时文件，再逐个 rename 提交。
 * 任一步失败都清理临时文件，并把已提交的目标恢复为调用前的内容，
 * 避免出现「json/html 已更新、pptx 还是旧的」这类混版状态。
 */
function commitDeckArtifacts(artifacts) {
  const stamp = process.pid.toString(36) + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
  const items = artifacts.map((item, index) => ({ ...item, tempPath: item.path + '.' + stamp + '-' + index + '.tmp' }))
  const removeTemp = (item) => {
    try {
      rmSync(item.tempPath, { force: true })
    } catch {}
  }

  // 阶段 0：记下已有产物内容用于回滚；读不出来（如被同名目录占用）先报错，不碰任何文件。
  const previous = new Map()
  for (const item of items) {
    if (!existsSync(item.path)) continue
    try {
      previous.set(item.path, readFileSync(item.path))
    } catch (error) {
      throw new Error('dsh-ppt：三件套写入失败（' + item.path + ' 已存在但无法读取），原文件未改动：' + error.message)
    }
  }

  // 阶段 1：全部写临时文件；这一步失败时目标文件尚未被改动。
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

  // 阶段 2：逐个 rename 提交；中途失败则把已提交的目标回滚成旧内容。
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
  const normalized = normalizeBuildOptions(options)
  const { title, theme, language, motion, deck, outputDir, overwrite } = normalized
  mkdirSync(outputDir, { recursive: true })
  const fileName = resolveDeckFileName(outputDir, normalized.fileName, overwrite)

  const manifest = {
    version: DECK_VERSION,
    title,
    theme: theme.id,
    language: language.id,
    motion,
    slideCount: deck.slides.length,
    slides: deck.slides,
  }
  const jsonPath = resolvePath(outputDir, fileName + '.json')
  const htmlPath = resolvePath(outputDir, fileName + '.html')
  const pptxPath = resolvePath(outputDir, fileName + '.pptx')

  // 先生成三份内容再统一提交：生成阶段抛错时也不会留下半套文件。
  commitDeckArtifacts([
    { path: jsonPath, data: JSON.stringify(manifest, null, 2) + '\n', encoding: 'utf8' },
    { path: htmlPath, data: renderHtml(manifest, theme, language), encoding: 'utf8' },
    { path: pptxPath, data: buildPptx(manifest, theme, language) },
  ])

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
  }
}

// ---------------------------------------------------------------------------
// HTML 网页放映
// ---------------------------------------------------------------------------

export function renderHtml(manifest, theme, language) {
  const t = theme
  const lang = language
  const ui = lang.ui
  const motion = manifest.motion !== false
  const motionCss = motion
    ? `body.motion .slide.is-active{animation:slide-in .45s cubic-bezier(.22,.8,.36,1)}
@keyframes slide-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
body.motion .bullets li{
  opacity:0;animation:bullet-in .55s cubic-bezier(.22,.8,.36,1) forwards;
  animation-delay:calc(var(--i, 0)*90ms + .12s);
}
@keyframes bullet-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`
    : ''
  const slides = manifest.slides.map((slide, index) => {
    const label = slide.title || slide.kicker || (ui.slide + ' ' + (index + 1))
    return '<div class="slide-frame" data-frame="' + (index + 1) + '" tabindex="-1" role="button" aria-label="' + escapeHtml(String(label)) + '">' +
      renderHtmlSlide(slide, index, ui, lang.id) + '</div>'
  }).join('\n')
  const themeLabel = t.name[lang.id] ?? t.name.en
  const total = manifest.slides.length

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
.slide-frame{position:fixed;inset:0}
.slide{
  position:absolute;inset:0;display:none;flex-direction:column;justify-content:center;
  padding:clamp(34px,7vw,110px);overflow:hidden;
}
.slide::before{
  content:"";position:absolute;inset:-20%;pointer-events:none;z-index:-1;
  background:
    radial-gradient(42% 34% at 82% 18%, ${hexToRgba(t.palette.accent, t.dark ? 0.22 : 0.12)}, transparent 70%),
    radial-gradient(36% 30% at 12% 86%, ${hexToRgba(t.palette.accent2, t.dark ? 0.16 : 0.12)}, transparent 70%),
    radial-gradient(70% 60% at 50% 50%, ${hexToRgba(t.palette.panel, 0.55)}, transparent 100%);
}
.slide.is-active{display:flex}
${motionCss}
.kicker{
  color:var(--accent);font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  font-size:clamp(12px,1.3vw,18px);margin-bottom:22px;
}
h1,h2,.statement-title{font-family:var(--font-heading);line-height:1.06;letter-spacing:-.015em;margin:0}
h1{font-size:clamp(44px,7.4vw,118px);max-width:20ch}
h2{font-size:clamp(34px,5vw,82px);max-width:20ch}
.subtitle{
  color:var(--muted);font-size:clamp(18px,2.3vw,34px);line-height:1.5;
  max-width:46em;margin-top:28px;
}
.meta{
  color:var(--muted);font-size:clamp(12px,1.2vw,16px);margin-top:48px;
  letter-spacing:.06em;
}
.bullets ul{margin:30px 0 0;padding:0;list-style:none;display:grid;gap:clamp(12px,1.6vw,24px)}
.bullets li{
  position:relative;padding-left:clamp(28px,2.6vw,44px);
  font-size:clamp(20px,2.6vw,40px);line-height:1.35;max-width:24em;
}
.bullets li::before{
  content:"";position:absolute;left:0;top:.58em;width:.5em;height:.5em;
  background:var(--accent);border-radius:2px;box-shadow:.28em .28em 0 color-mix(in srgb, var(--accent2) 78%, transparent);
}
.section .kicker{margin-bottom:10px}
.section .accent-line{width:min(180px,18vw);height:6px;background:var(--accent);margin:28px 0}
.statement-title{
  font-size:clamp(34px,5.4vw,88px);max-width:22ch;font-weight:800;
  border-left:6px solid var(--accent);padding-left:clamp(22px,3vw,48px);
}
.closing{text-align:center;align-items:center}
.closing h1,.closing .statement-title{font-size:clamp(52px,9vw,148px)}
.closing .subtitle{color:var(--accent);font-weight:700}
.cover h1{font-weight:900}
.quote-mark{
  font-family:var(--font-heading);font-size:clamp(90px,13vw,210px);line-height:.62;
  color:var(--accent);margin-bottom:clamp(14px,2vw,30px);
}
.quote-text{
  font-family:var(--font-heading);font-size:clamp(26px,4.2vw,62px);line-height:1.28;
  font-weight:700;max-width:22ch;margin:0;
}
.quote-attr{color:var(--muted);margin-top:clamp(18px,2.6vw,34px);font-size:clamp(15px,1.8vw,26px);letter-spacing:.04em}
table.deck-table{
  border-collapse:collapse;margin-top:clamp(20px,3vw,42px);width:100%;max-width:100%;
  font-size:clamp(14px,1.55vw,23px);
}
.deck-table th{
  background:color-mix(in srgb, var(--accent) 26%, var(--bg));color:var(--fg);
  text-align:left;font-weight:700;padding:.6em .9em;letter-spacing:.02em;
  border-bottom:2px solid var(--accent);
}
.deck-table td{
  padding:.55em .9em;border-bottom:1px solid color-mix(in srgb, var(--muted) 55%, transparent);
  color:var(--fg);
}
.deck-table .num{text-align:right;font-variant-numeric:tabular-nums}
.deck-table tbody tr:nth-child(even){background:color-mix(in srgb, var(--panel) 62%, transparent)}
#progress{position:fixed;top:0;left:0;height:3px;width:0;background:var(--accent);z-index:30;transition:width .25s}
#hud{
  position:fixed;right:22px;bottom:18px;z-index:50;display:flex;gap:10px;align-items:center;
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
  color:var(--accent);font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  font-size:12px;margin-bottom:8px;
}
#notes-text{white-space:pre-wrap;line-height:1.65;font-size:clamp(15px,1.5vw,18px);color:var(--fg)}
#notes-text.is-empty{color:var(--muted);font-style:italic}
#help-panel{
  position:fixed;right:22px;bottom:64px;z-index:60;max-width:390px;
  background:color-mix(in srgb, var(--panel) 96%, black 4%);color:var(--fg);
  border:1px solid color-mix(in srgb, var(--accent) 55%, transparent);border-radius:14px;
  padding:16px 20px;box-shadow:0 18px 50px rgba(0,0,0,.45);font-size:14px;line-height:1.8;
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
  display:flex !important;position:absolute;inset:0;width:100vw;height:100vh;
  transform:scale(var(--deck-thumb-scale,.25));transform-origin:top left;pointer-events:none;
  animation:none !important;
}
body.overview .bullets li{opacity:1 !important;animation:none !important}
body.overview #notes-panel,body.presenting #notes-panel{display:none !important}
body.presenting #notes-toggle{opacity:.55}
body.presenting #hud{opacity:0;pointer-events:none;transition:opacity .25s}
body.presenting #hud:hover{opacity:1;pointer-events:auto}
@media (max-width:900px){
  .slide{padding:clamp(22px,5vw,44px)}
  h1{font-size:clamp(34px,8.5vw,64px)}
  h2{font-size:clamp(26px,6.5vw,48px)}
  .statement-title{font-size:clamp(26px,7vw,54px)}
  .subtitle{font-size:clamp(16px,3.4vw,24px)}
  .bullets li{font-size:clamp(16px,3.4vw,24px)}
  .kicker{font-size:13px}
  .deck-table{font-size:14px}
  .deck-table th,.deck-table td{padding:.55em .6em}
  #hud{right:10px;bottom:10px;gap:8px;font-size:12px}
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
  ${motion ? 'body.motion .bullets li{opacity:1 !important;animation:none !important}' : ''}
  #progress,#hud,#notes-panel,#help-panel,#toast{display:none !important}
}
</style>
</head>
<body class="${motion ? 'motion' : 'no-motion'}">
<div id="progress" aria-hidden="true"></div>
<div id="stage">
${slides}
</div>
<div id="hud" aria-live="polite">
  <span id="counter">${ui.slide} 1 ${ui.of} ${total}</span>
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

  function go(next) {
    if (document.body.classList.contains('blank-black') || document.body.classList.contains('blank-white')) setBlank(null);
    const wrapped = next < 0 || next >= total;
    index = (next + total) % total;
    slides.forEach(function (slide, i) {
      slide.classList.toggle('is-active', i === index);
      if (frames[i]) frames[i].classList.toggle('is-current', i === index);
    });
    counter.textContent = ui.slide + ' ' + (index + 1) + ' ' + ui.of + ' ' + total;
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
      if (width > 0) document.documentElement.style.setProperty('--deck-thumb-scale', String(width / window.innerWidth));
    });
  }

  function setOverview(on) {
    document.body.classList.toggle('overview', on);
    overviewBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    frames.forEach(function (frame) { frame.tabIndex = on ? 0 : -1; });
    if (on) {
      document.body.classList.remove('notes-open');
      helpPanel.hidden = true;
      syncNotes();
      updateThumbScale();
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
      event.preventDefault(); go(index + 1);
    } else if (key === 'ArrowLeft' || key === 'PageUp' || (key === 'ArrowUp' && !inOverview)) {
      event.preventDefault(); go(index - 1);
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
    } else if (lower === 'v') {
      if (presenterOpen()) closePresenter();
      else openPresenter();
    } else if (lower === 'b') {
      setBlank(document.body.classList.contains('blank-black') ? null : 'black');
    } else if (lower === 'w') {
      setBlank(document.body.classList.contains('blank-white') ? null : 'white');
    } else if (lower === 'p') {
      window.print();
    } else if (key === '?') {
      helpPanel.hidden = !helpPanel.hidden;
    }
  });

  let wheelLock = 0;
  document.addEventListener('wheel', (event) => {
    const now = Date.now();
    if (now - wheelLock < 550 || document.body.classList.contains('overview') || notesOpen()) return;
    wheelLock = now;
    if (Math.abs(event.deltaY) > 12) go(index + (event.deltaY > 0 ? 1 : -1));
  }, { passive: true });

  let touchStartY = 0;
  document.addEventListener('touchstart', (event) => { touchStartY = event.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(delta) > 48 && !document.body.classList.contains('overview')) go(index + (delta < 0 ? 1 : -1));
  }, { passive: true });

  fullscreenBtn.addEventListener('click', () => { void toggleFullscreen(); });
  notesBtn.addEventListener('click', () => {
    if (document.body.classList.contains('presenting')) { toast(ui.presenterHint); return; }
    setNotes(!notesOpen());
  });
  notesClose.addEventListener('click', () => setNotes(false));
  presenterBtn.addEventListener('click', () => { if (presenterOpen()) closePresenter(); else openPresenter(); });
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
  window.addEventListener('resize', updateThumbScale);
  window.addEventListener('beforeunload', closePresenter);

  const start = Number.parseInt(location.hash?.replace('#slide-', ''), 10);
  go(Number.isInteger(start) ? start - 1 : 0);
})();
</script>
</body>
</html>`
}
function renderHtmlSlide(slide, index, ui, langId) {
  const kicker = slide.kicker || (slide.layout === 'cover' ? ui.coverKicker : '')
  const title = slide.title || ''
  const subtitle = slide.subtitle || ''
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
  const number = String(index + 1).padStart(2, '0')
  let inner = ''
  switch (slide.layout) {
    case 'cover':
      inner = '<div class="kicker">' + escapeHtml(kicker) + '</div>' +
        '<h1>' + escapeHtml(title) + '</h1>' +
        (subtitle !== '' ? '<div class="subtitle">' + escapeHtml(subtitle) + '</div>' : '') +
        '<div class="meta">' + escapeHtml(ui.generatedBy) + '</div>'
      break
    case 'section':
      inner = '<div class="kicker">' + escapeHtml(kicker) + '</div>' +
        '<h2>' + escapeHtml(title) + '</h2>' +
        '<div class="accent-line"></div>' +
        (subtitle !== '' ? '<div class="subtitle">' + escapeHtml(subtitle) + '</div>' : '')
      break
    case 'statement':
      inner = '<div class="kicker">' + escapeHtml(kicker) + '</div>' +
        '<div class="statement-title">' + escapeHtml(title || slide.text || '') + '</div>' +
        (subtitle !== '' ? '<div class="subtitle">' + escapeHtml(subtitle) + '</div>' : '')
      break
    case 'quote':
      inner = '<div class="kicker">' + escapeHtml(kicker || ui.quoteKicker) + '</div>' +
        '<div class="quote-mark" aria-hidden="true">\u201C</div>' +
        '<blockquote class="quote-text">' + escapeHtml(title || slide.text || '') + '</blockquote>' +
        (subtitle !== '' ? '<div class="quote-attr">\u2014\u2014 ' + escapeHtml(subtitle) + '</div>' : '')
      break
    case 'table': {
      const rows = Array.isArray(slide.rows) ? slide.rows : []
      const head = rows[0] ?? []
      const body = rows.slice(1)
      const isNum = (cell) => /^\s*[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:%|％|次|页|个|人|元|天|小时|分钟)?\s*$/.test(String(cell ?? ''))
      const headingText = title !== '' ? title : (kicker || ui.tableKicker)
      const showKicker = kicker !== '' && kicker !== headingText
      inner = (showKicker ? '<div class="kicker">' + escapeHtml(kicker) + '</div>' : '') +
        '<h2>' + escapeHtml(headingText) + '</h2>' +
        '<table class="deck-table"><thead><tr>' +
        head.map((cell) => '<th' + (isNum(cell) ? ' class="num"' : '') + '>' + escapeHtml(cell) + '</th>').join('') +
        '</tr></thead><tbody>' +
        body.map((row) => '<tr>' + row.map((cell) => '<td' + (isNum(cell) ? ' class="num"' : '') + '>' + escapeHtml(cell) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table>'
      break
    }
    case 'closing':
      inner = '<h1>' + escapeHtml(title || ui.closingTitle) + '</h1>' +
        (subtitle !== '' ? '<div class="subtitle">' + escapeHtml(subtitle) + '</div>' : '') +
        '<div class="meta">' + escapeHtml(ui.generatedBy) + '</div>'
      break
    case 'bullets':
    default:
      inner = '<div class="kicker">' + escapeHtml(kicker) + '</div>' +
        '<h2>' + escapeHtml(title) + '</h2>' +
        '<ul>' + bullets.map((bullet, bulletIndex) => '<li style="--i:' + bulletIndex + '">' + escapeHtml(bullet) + '</li>').join('') + '</ul>'
      break
  }
  const notesAttr = typeof slide.notes === 'string' && slide.notes.trim() !== ''
    ? ' data-notes="' + escapeHtml(slide.notes) + '"'
    : ''
  return '<section class="slide slide--' + escapeHtml(slide.layout || 'bullets') + '" data-index="' + number + '"' + notesAttr + '>' +
    '<div class="slide-inner">' + inner + '</div></section>'
}

function hexToRgba(hex, alpha) {
  const value = String(hex).replace('#', '')
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const num = Number.parseInt(full, 16)
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

// ---------------------------------------------------------------------------
// PPTX（OOXML 手写 + node:zlib zip）
// ---------------------------------------------------------------------------

const EMU_W = 12192000
const EMU_H = 6858000

function hex(value) {
  return String(value).replace('#', '').toUpperCase()
}

function pptxFontName(value) {
  const match = /"?([^",]+)"?/.exec(String(value ?? ''))
  return match?.[1]?.trim() || 'Arial'
}

function paragraphXml(text, options = {}) {
  const {
    size = 2000,
    color = 'FFFFFF',
    bold = false,
    lang = 'zh-CN',
    align = 'l',
    bullet = false,
    font = 'Arial',
    spaceBefore = 0,
    spaceAfter = 0,
  } = options
  const runFont = pptxFontName(font)
    let pPr = ''
  if (bullet) {
    pPr = '<a:pPr marL="285750" indent="-285750"><a:buFont typeface="Arial" panose="020B0604020202020204"/><a:buChar char="•"/></a:pPr>'
  } else {
    const parts = [] // align 与 spacing 二选一
    if (align !== 'l') parts.push('algn="' + align + '"')
    if (spaceBefore > 0) parts.push('<a:spcBef><a:spcPts val="' + (spaceBefore / 100) + '"/></a:spcBef>')
    if (spaceAfter > 0) parts.push('<a:spcAft><a:spcPts val="' + (spaceAfter / 100) + '"/></a:spcAft>')
    pPr = '<a:pPr' + (parts.length > 0 ? ' ' + parts.join(' ') : '') + '><a:buNone/></a:pPr>'
  }
  return '<a:p>' + pPr +
    '<a:r><a:rPr lang="' + lang + '" sz="' + size + '" b="' + (bold ? 1 : 0) + '" dirty="0">' +
    '<a:solidFill><a:srgbClr val="' + hex(color) + '"/></a:solidFill>' +
    '<a:latin typeface="' + escapeXml(runFont) + '"/><a:ea typeface="' + escapeXml(runFont) + '"/></a:rPr>' +
    '<a:t>' + escapeXml(text) + '</a:t></a:r></a:p>'
}

function textShapeXml(id, name, box, paragraphs, options = {}) {
  const { x = 0, y = 0, w = EMU_W, h = EMU_H } = box
  return '<p:sp>' +
    '<p:nvSpPr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + w + '" cy="' + h + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln/></p:spPr>' +
    '<p:txBody><a:bodyPr wrap="square" rtlCol="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>' +
    paragraphs.join('') + '</p:txBody></p:sp>'
}

function accentBarXml(id, name, box, color) {
  const { x = 0, y = 0, w = EMU_W, h = EMU_H } = box
  return '<p:sp>' +
    '<p:nvSpPr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + w + '" cy="' + h + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' +
    '<a:solidFill><a:srgbClr val="' + hex(color) + '"/></a:solidFill><a:ln/></p:spPr>' +
    '<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>'
}

/** 原生 OOXML 表格（graphicFrame + a:tbl）：首行主题色表头，隔行面板色。 */
function tableGraphicXml(id, name, box, rows, theme, langId) {
  const p = theme.palette
  const lang = langId || 'zh-CN'
  const font = pptxFontName(theme.fonts.body)
  const safeRows = rows.length > 0 ? rows : [['']]
  const cols = Math.max(1, safeRows[0].length)
  const colW = Math.floor(box.w / cols)
  const grid = Array.from({ length: cols }, () => '<a:gridCol w="' + colW + '"/>').join('')
  const rowH = 420000
  const cellXml = (text, fill, color, bold) =>
    '<a:tc><a:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/><a:p><a:pPr algn="l"><a:buNone/></a:pPr>' +
    '<a:r><a:rPr lang="' + lang + '" sz="1400" b="' + (bold ? 1 : 0) + '" dirty="0">' +
    '<a:solidFill><a:srgbClr val="' + hex(color) + '"/></a:solidFill>' +
    '<a:latin typeface="' + escapeXml(font) + '"/><a:ea typeface="' + escapeXml(font) + '"/></a:rPr>' +
    '<a:t>' + escapeXml(text) + '</a:t></a:r></a:p></a:txBody>' +
    '<a:tcPr marL="91440" marR="91440" anchor="ctr">' +
    (fill !== '' ? '<a:solidFill><a:srgbClr val="' + hex(fill) + '"/></a:solidFill>' : '<a:noFill/>') +
    '</a:tcPr></a:tc>'
  const trs = safeRows.map((row, rowIndex) => {
    const padded = Array.from({ length: cols }, (_, i) => row[i] ?? '')
    const cells = rowIndex === 0
      ? padded.map((c) => cellXml(c, p.accent, p.bg, true)).join('')
      : padded.map((c) => cellXml(c, rowIndex % 2 === 1 ? p.panel : '', p.fg, false)).join('')
    return '<a:tr h="' + rowH + '">' + cells + '</a:tr>'
  }).join('')
  const height = Math.max(1, safeRows.length) * rowH
  return '<p:graphicFrame>' +
    '<p:nvGraphicFramePr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/>' +
    '<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>' +
    '<p:xfrm><a:off x="' + box.x + '" y="' + box.y + '"/><a:ext cx="' + box.w + '" cy="' + height + '"/></p:xfrm>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">' +
    '<a:tbl><a:tblPr firstRow="1" bandRow="1"/>' +
    '<a:tblGrid>' + grid + '</a:tblGrid>' + trs + '</a:tbl>' +
    '</a:graphicData></a:graphic></p:graphicFrame>'
}

function slideShapeList(slide, index, total, theme, langId) {
  const p = theme.palette
  const font = pptxFontName(theme.fonts.heading)
  const bodyFont = pptxFontName(theme.fonts.body) // 保留：v0.1 后续用于统一正文字体
  const lang = langId || 'zh-CN'
  // PPTX 每个文本 run 的语言跟随 deck.lang（zh-CN / en-US），不再写死中文
  const para = (content, options = {}) => paragraphXml(content, { lang, ...options })
  const shapes = []
  const kicker = slide.kicker || ''
  const title = slide.title || ''
  const subtitle = slide.subtitle || ''
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
  const idBase = (index + 1) * 10
  const footer = String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0')

  if (slide.layout === 'cover') {
    shapes.push(accentBarXml(idBase + 1, 'Accent bar', { x: 914400, y: 2250000, w: 240000, h: 1600000 }, p.accent))
    shapes.push(textShapeXml(idBase + 2, 'Title', { x: 1550000, y: 2160000, w: 9250000, h: 1800000 }, [
      para(title, { size: 4400, color: p.fg, bold: true, font }),
    ]))
    if (subtitle !== '') {
      shapes.push(textShapeXml(idBase + 3, 'Subtitle', { x: 1570000, y: 4150000, w: 9000000, h: 1200000 }, [
        para(subtitle, { size: 2200, color: p.muted, font: theme.fonts.body }),
      ]))
    }
    if (kicker !== '') {
      shapes.push(textShapeXml(idBase + 4, 'Kicker', { x: 1570000, y: 5800000, w: 7000000, h: 500000 }, [
        para(kicker, { size: 1400, color: p.accent, bold: true, font: theme.fonts.body }),
      ]))
    }
  } else if (slide.layout === 'section') {
    if (kicker !== '') {
      shapes.push(textShapeXml(idBase + 1, 'Kicker', { x: 1050000, y: 2250000, w: 9000000, h: 500000 }, [
        para(kicker, { size: 1600, color: p.accent, bold: true, font: theme.fonts.body }),
      ]))
    }
    shapes.push(accentBarXml(idBase + 2, 'Accent bar', { x: 1050000, y: 2850000, w: 1600000, h: 160000 }, p.accent2))
    shapes.push(textShapeXml(idBase + 3, 'Title', { x: 1050000, y: 3150000, w: 10200000, h: 1400000 }, [
      para(title, { size: 4000, color: p.fg, bold: true, font }),
    ]))
    if (subtitle !== '') {
      shapes.push(textShapeXml(idBase + 4, 'Subtitle', { x: 1070000, y: 4750000, w: 9000000, h: 900000 }, [
        para(subtitle, { size: 1800, color: p.muted, font: theme.fonts.body }),
      ]))
    }
  } else if (slide.layout === 'statement') {
    shapes.push(accentBarXml(idBase + 1, 'Accent bar', { x: 914400, y: 1900000, w: 200000, h: 2800000 }, p.accent))
    shapes.push(textShapeXml(idBase + 2, 'Statement', { x: 1500000, y: 1950000, w: 9400000, h: 2700000 }, [
      para(title || slide.text || '', { size: 3600, color: p.fg, bold: true, font }),
    ]))
    if (subtitle !== '') {
      shapes.push(textShapeXml(idBase + 3, 'Subtitle', { x: 1520000, y: 4900000, w: 9000000, h: 800000 }, [
        para(subtitle, { size: 1800, color: p.muted, font: theme.fonts.body }),
      ]))
    }
  } else if (slide.layout === 'quote') {
    shapes.push(textShapeXml(idBase + 1, 'Quote mark', { x: 900000, y: 1050000, w: 1700000, h: 1900000 }, [
      para('\u201C', { size: 9600, color: p.accent, bold: true, font }),
    ]))
    shapes.push(textShapeXml(idBase + 2, 'Quote', { x: 1050000, y: 2550000, w: 10100000, h: 2600000 }, [
      para(title || slide.text || '', { size: 3000, color: p.fg, bold: true, font }),
    ]))
    if (subtitle !== '') {
      shapes.push(textShapeXml(idBase + 3, 'Attribution', { x: 1070000, y: 5300000, w: 9000000, h: 600000 }, [
        para('\u2014\u2014 ' + subtitle, { size: 1600, color: p.muted, font: theme.fonts.body }),
      ]))
    }
  } else if (slide.layout === 'table') {
    const hasTitle = title !== '' && title !== kicker
    if (kicker !== '') {
      shapes.push(textShapeXml(idBase + 1, 'Kicker', { x: 900000, y: 420000, w: 10000000, h: 420000 }, [
        para(kicker, { size: 1400, color: p.accent, bold: true, font: theme.fonts.body }),
      ]))
    }
    if (hasTitle) {
      shapes.push(textShapeXml(idBase + 2, 'Title', { x: 900000, y: 920000, w: 10300000, h: 800000 }, [
        para(title, { size: 3400, color: p.fg, bold: true, font }),
      ]))
    }
    shapes.push(tableGraphicXml(idBase + 3, 'Table', { x: 900000, y: hasTitle ? 1950000 : 900000, w: 10300000 }, Array.isArray(slide.rows) ? slide.rows : [], theme, lang))
  } else if (slide.layout === 'closing') {
    shapes.push(textShapeXml(idBase + 1, 'Title', { x: 1050000, y: 2300000, w: 10200000, h: 1700000 }, [
      para(title || '谢谢', { size: 5200, color: p.fg, bold: true, align: 'ctr', font }),
    ]))
    if (subtitle !== '') {
      shapes.push(textShapeXml(idBase + 2, 'Subtitle', { x: 1050000, y: 4200000, w: 10200000, h: 900000 }, [
        para(subtitle, { size: 2000, color: p.accent, bold: true, align: 'ctr', font: theme.fonts.body }),
      ]))
    }
  } else {
    // bullets（默认布局）
    if (kicker !== '') {
      shapes.push(textShapeXml(idBase + 1, 'Kicker', { x: 900000, y: 420000, w: 10000000, h: 420000 }, [
        para(kicker, { size: 1400, color: p.accent, bold: true, font: theme.fonts.body }),
      ]))
    }
    shapes.push(textShapeXml(idBase + 2, 'Title', { x: 900000, y: 920000, w: 10300000, h: 800000 }, [
      para(title, { size: 3400, color: p.fg, bold: true, font }),
    ]))
    const bodyParagraphs = bullets.length > 0
      ? bullets.map((bullet) => para(bullet, { size: 2000, color: p.fg, bullet: true, font: theme.fonts.body, spaceAfter: 600 }))
      : [para(subtitle || '', { size: 2000, color: p.fg, font: theme.fonts.body })]
    shapes.push(textShapeXml(idBase + 3, 'Body', { x: 1050000, y: 1850000, w: 10100000, h: 4500000 }, bodyParagraphs))
  }

  shapes.push(textShapeXml(idBase + 9, 'Page number', { x: 10600000, y: 6250000, w: 1200000, h: 400000 }, [
    para(footer, { size: 1000, color: p.muted, align: 'r', font: theme.fonts.body }),
  ]))

  return shapes.join('')
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

function slideXml(slide, index, total, theme, langId, motion) {
  const p = theme.palette
  let motionXml = ''
  if (motion) {
    motionXml = '<p:transition spd="med"><p:fade/></p:transition>'
    const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
    if (slide.layout === 'bullets' && bullets.length >= 2) {
      motionXml += bulletTimingXml((index + 1) * 10 + 3, bullets.length)
    }
  }
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="' + hex(p.bg) + '"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>' +
    '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    slideShapeList(slide, index, total, theme, langId) +
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
    return '<a:lvl' + (i + 1) + 'pPr marL="' + (342900 + i * 342900) + '" indent="' + (-342900 - i * 0) + '">' +
      '<a:defRPr sz="' + sz + '"><a:solidFill><a:srgbClr val="' + hex(p.fg) + '"/></a:solidFill><a:latin typeface="' + escapeXml(pptxFontName(theme.fonts.body)) + '"/></a:defRPr></a:lvl' + (i + 1) + 'pPr>'
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

function slideLayoutXml(theme) {
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

function themeXml(theme) {
  const p = theme.palette
  const color = (name, value) => '<a:' + name + '><a:srgbClr val="' + hex(value) + '"/></a:' + name + '>'
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="dsh-ppt ' + escapeXml(theme.name.en) + '">' +
    '<a:themeElements>' +
    '<a:clrScheme name="dsh-ppt">' +
    color('dk1', p.fg) + color('lt1', p.bg) + color('dk2', p.muted) + color('lt2', p.panel) +
    color('accent1', p.accent) + color('accent2', p.accent2) + color('accent3', p.fg) +
    color('accent4', p.muted) + color('accent5', p.accent) + color('accent6', p.accent2) +
    color('hlink', p.accent) + color('folHlink', p.accent2) +
    '</a:clrScheme>' +
    '<a:fontScheme name="dsh-ppt">' +
    '<a:majorFont><a:latin typeface="' + escapeXml(pptxFontName(theme.fonts.heading)) + '"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
    '<a:minorFont><a:latin typeface="' + escapeXml(pptxFontName(theme.fonts.body)) + '"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>' +
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

function buildZip(entries) {
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
    localHeader.writeUInt16LE(0x0800, 6) // UTF-8 文件名
    localHeader.writeUInt16LE(method, 8)
    localHeader.writeUInt16LE(0, 10) // DOS time
    localHeader.writeUInt16LE(0x21, 12) // DOS date 1980-01-01
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
    entries.push({ name: 'ppt/slides/slide' + (index + 1) + '.xml', data: slideXml(slide, index, slides.length, theme, language.attr, motion) })
    entries.push({ name: 'ppt/slides/_rels/slide' + (index + 1) + '.xml.rels', data: slideRelXml(hasNotes, index + 1) })
    if (hasNotes) {
      entries.push({ name: 'ppt/notesSlides/notesSlide' + (index + 1) + '.xml', data: notesSlideXml(slide.notes, language.attr) })
      entries.push({ name: 'ppt/notesSlides/_rels/notesSlide' + (index + 1) + '.xml.rels', data: notesSlideRelXml(index + 1) })
    }
  })
  return buildZip(entries)
}

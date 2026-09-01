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

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { deflateRawSync } from 'node:zlib'

export const DECK_VERSION = '0.1.0'

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
      help: '← → 翻页 · F 全屏 · G 总览 · P 打印',
      coverKicker: '开场',
      pointKicker: '要点',
      statementKicker: '核心观点',
      closingTitle: '谢谢',
      closingSubtitle: '讨论与问答',
      generatedBy: '由 dsh-ppt 生成',
    },
  },
  en: {
    id: 'en',
    attr: 'en-US',
    ui: {
      slide: 'Slide',
      of: '/',
      theme: 'Theme',
      help: '← → navigate · F fullscreen · G overview · P print',
      coverKicker: 'Opening',
      pointKicker: 'Key point',
      statementKicker: 'Core idea',
      closingTitle: 'Thank You',
      closingSubtitle: 'Discussion & Q&A',
      generatedBy: 'Generated with dsh-ppt',
    },
  },
  bilingual: {
    id: 'bilingual',
    attr: 'zh-CN',
    ui: {
      slide: '第',
      of: '/ 共',
      theme: '主题 · Theme',
      help: '← → 翻页 · F 全屏 · G 总览 · P 打印',
      coverKicker: '开场 · Opening',
      pointKicker: '要点 · Key point',
      statementKicker: '核心观点 · Core Idea',
      closingTitle: '谢谢 · Thank You',
      closingSubtitle: '讨论与问答 · Q&A',
      generatedBy: '由 dsh-ppt 生成 · Generated with dsh-ppt',
    },
  },
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

export function sanitizeFileName(input) {
  const base = String(input ?? 'deck').trim().replace(/\.(html?|pptx|json)$/i, '')
  const cleaned = base
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned.slice(0, 120) || 'deck'
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
  const parts = text.split(/(?<=[.!?。！？…])\s+/).map((part) => part.trim()).filter(Boolean)
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
  return { heading, level, coverOnly, bullets: [], paragraphs: [] }
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
    if (current !== null && (current.heading !== '' || current.bullets.length > 0 || current.paragraphs.length > 0)) {
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
    const rest = ordered.flatMap((group, groupIndex) => {
      const sentences = (groupIndex === 0 && !coverSubtitleConsumed) ? group.sentences.slice(1) : group.sentences
      return chunk(sentences, 5)
    })
    slides.push({ layout: 'cover', kicker: ui.coverKicker, title: coverTitle || 'Untitled', subtitle: coverSubtitle })
    if (rest.length === 0) {
      if (coverSubtitle !== '') {
        slides.push({ layout: 'statement', kicker: ui.statementKicker, title: coverSubtitle, subtitle: coverTitle || 'Untitled' })
      }
    } else {
      rest.forEach((points, index) => {
        slides.push({
          layout: 'bullets',
          kicker: ui.pointKicker + ' ' + (index + 1),
          title: truncate(points[0], 40) || ui.pointKicker + ' ' + (index + 1),
          bullets: points,
        })
      })
    }
    slides.push({ layout: 'closing', title: ui.closingTitle, subtitle: coverTitle || 'Untitled' })
    return { title: coverTitle || 'Untitled', subtitle: coverSubtitle, slides }
  }

  slides.push({ layout: 'cover', kicker: ui.coverKicker, title: coverTitle || 'Untitled', subtitle: coverSubtitle })
  let pointIndex = 0
  for (const section of bodySections) {
    if (section.heading === '') {
      const points = [...section.bullets, ...section.paragraphs]
        .flatMap((part) => splitSentences(part))
        .slice(0, 8)
      if (points.length > 0) {
        pointIndex += 1
        slides.push({
          layout: 'bullets',
          kicker: ui.pointKicker + ' ' + pointIndex,
          title: truncate(points[0], 40) || ui.pointKicker + ' ' + pointIndex,
          bullets: points,
        })
      }
      continue
    }
    const points = [
      ...section.bullets,
      ...section.paragraphs.flatMap((part) => splitSentences(part)),
    ].slice(0, 8)
    if (points.length > 0) {
      slides.push({ layout: 'bullets', kicker: section.heading, title: section.heading, bullets: points })
    } else {
      slides.push({ layout: 'section', kicker: section.heading, title: section.heading })
    }
  }
  slides.push({ layout: 'closing', title: ui.closingTitle, subtitle: coverTitle || 'Untitled' })
  return { title: coverTitle || 'Untitled', subtitle: coverSubtitle, slides }
}

const SLIDE_LAYOUTS = new Set(['cover', 'section', 'bullets', 'statement', 'closing'])

function normalizeSlide(raw, index) {
  const source = (raw !== null && typeof raw === 'object') ? raw : {}
  const layout = SLIDE_LAYOUTS.has(source.layout) ? source.layout : 'bullets'
  const title = stripInlineMarkdown(source.title ?? '')
  const subtitle = stripInlineMarkdown(source.subtitle ?? '')
  const kicker = stripInlineMarkdown(source.kicker ?? '')
  const text = stripInlineMarkdown(source.text ?? '')
  let bullets = []
  if (Array.isArray(source.bullets)) {
    bullets = source.bullets.map((item) => stripInlineMarkdown(String(item))).filter(Boolean)
  } else if (typeof source.bullets === 'string' && source.bullets.trim() !== '') {
    bullets = splitSentences(source.bullets)
  }
  if (layout === 'statement' && title === '' && text !== '') {
    return { layout, kicker, title: text, subtitle: subtitle || '', bullets }
  }
  return { layout, kicker, title, subtitle, text, bullets }
}

export function normalizeSlides(rawSlides, maxSlides = 60) {
  if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
    throw new Error('dsh-ppt：slides 必须是非空数组（每个元素是 { layout, title, subtitle, kicker, bullets } 对象）')
  }
  const limit = clampInt(maxSlides, 60, 1, 120)
  const bounded = rawSlides.length > limit && limit >= 3
    ? [rawSlides[0], ...rawSlides.slice(1, limit - 1), rawSlides[rawSlides.length - 1]]
    : rawSlides.slice(0, limit)
  const slides = bounded.map(normalizeSlide)
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
  const maxSlides = clampInt(options.maxSlides, 60, 3, 120)
  let deck
  if (Array.isArray(options.slides) && options.slides.length > 0) {
    deck = {
      title,
      subtitle: stripInlineMarkdown(options.subtitle ?? ''),
      slides: normalizeSlides(options.slides, maxSlides),
    }
  } else {
    const content = String(options.content ?? '').trim()
    if (content === '') throw new Error('dsh-ppt：content 不能为空（或用 slides 传结构化幻灯片）')
    deck = parseMarkdownDeck(title, content, language.id)
    const slideLimit = clampInt(maxSlides, 60, 3, 120)
      if (deck.slides.length > slideLimit) {
        deck.slides = [deck.slides[0], ...deck.slides.slice(1, slideLimit - 1), deck.slides[deck.slides.length - 1]]
      }
  }
  if (deck.slides.length < 1) throw new Error('dsh-ppt：没有可生成的幻灯片')
  const outputDir = resolvePath(String(options.outputDir ?? '.').trim() || '.')
  const fileName = sanitizeFileName(options.fileName ?? title)
  return { title, theme, language, deck, outputDir, fileName }
}

export function buildDeck(options = {}) {
  const normalized = normalizeBuildOptions(options)
  const { title, theme, language, deck, outputDir, fileName } = normalized
  mkdirSync(outputDir, { recursive: true })

  const manifest = {
    version: DECK_VERSION,
    title,
    theme: theme.id,
    language: language.id,
    slideCount: deck.slides.length,
    slides: deck.slides,
  }
  const jsonPath = resolvePath(outputDir, fileName + '.json')
  const htmlPath = resolvePath(outputDir, fileName + '.html')
  const pptxPath = resolvePath(outputDir, fileName + '.pptx')

  writeFileSync(jsonPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  writeFileSync(htmlPath, renderHtml(manifest, theme, language), 'utf8')
  writeFileSync(pptxPath, buildPptx(manifest, theme, language))

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
  const slides = manifest.slides.map((slide, index) => renderHtmlSlide(slide, index, ui, lang.id)).join('\n')
  const themeLabel = t.name[lang.id] ?? t.name.en
  const total = manifest.slides.length

  return `<!DOCTYPE html>
<html lang="${lang.attr}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
.slide{
  position:fixed;inset:0;display:none;flex-direction:column;justify-content:center;
  padding:clamp(34px,7vw,110px);overflow:hidden;
}
.slide::before{
  content:"";position:absolute;inset:-20%;pointer-events:none;z-index:-1;
  background:
    radial-gradient(42% 34% at 82% 18%, ${hexToRgba(t.palette.accent, t.dark ? 0.22 : 0.12)}, transparent 70%),
    radial-gradient(36% 30% at 12% 86%, ${hexToRgba(t.palette.accent2, t.dark ? 0.16 : 0.12)}, transparent 70%),
    radial-gradient(70% 60% at 50% 50%, ${hexToRgba(t.palette.panel, 0.55)}, transparent 100%);
}
.slide.is-active{display:flex;animation:slide-in .45s cubic-bezier(.22,.8,.36,1)}
@keyframes slide-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
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
#progress{position:fixed;top:0;left:0;height:3px;width:0;background:var(--accent);z-index:30;transition:width .25s}
#hud{
  position:fixed;right:22px;bottom:18px;z-index:30;display:flex;gap:14px;align-items:center;
  color:var(--muted);font-size:13px;letter-spacing:.08em;font-variant-numeric:tabular-nums;
}
#hud button{
  background:color-mix(in srgb, var(--panel) 88%, transparent);color:var(--fg);
  border:1px solid color-mix(in srgb, var(--muted) 45%, transparent);border-radius:99px;
  padding:7px 13px;font:inherit;cursor:pointer;
}
#hud button:hover{border-color:var(--accent);color:var(--accent)}
body.overview .slide{display:flex !important;position:relative;inset:auto;width:100%;height:100vh}
body.overview{overflow:auto}
body.overview #progress,body.overview #hud{position:fixed}
@media (max-width:640px){
  #hud{right:12px;bottom:10px;gap:8px;font-size:11px}
}
@media print{
  html,body{height:auto;overflow:visible;background:#fff}
  .slide{position:relative;display:block !important;height:100vh;page-break-after:always;padding:48px}
  #progress,#hud{display:none !important}
}
</style>
</head>
<body>
<div id="progress" aria-hidden="true"></div>
${slides}
<div id="hud" aria-live="polite">
  <span id="counter">${ui.slide} 1 ${ui.of} ${total}</span>
  <span id="theme-label">${ui.theme} · ${escapeHtml(themeLabel)}</span>
  <button id="fullscreen" title="F">⛶</button>
</div>
<script>
(() => {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const counter = document.getElementById('counter');
  const progress = document.getElementById('progress');
  const fullscreenBtn = document.getElementById('fullscreen');
  let index = 0;
  const total = slides.length;
  const ui = ${JSON.stringify(ui).replace(/</g, '\\u003c')};

  function go(next) {
    index = (next + total) % total;
    slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
    counter.textContent = ui.slide + ' ' + (index + 1) + ' ' + ui.of + ' ' + total;
    progress.style.width = ((index + 1) / total * 100) + '%';
    document.title = (index + 1) + ' / ' + total + ' · ' + ${JSON.stringify(manifest.title).replace(/</g, '\\u003c')};
    try { history.replaceState?.(null, '', '#slide-' + (index + 1)); } catch { /* file:// 下个别浏览器可能拒绝 */ }
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault(); go(index + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault(); go(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault(); go(0);
    } else if (event.key === 'End') {
      event.preventDefault(); go(total - 1);
    } else if (event.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    } else if (event.key.toLowerCase() === 'g') {
      document.body.classList.toggle('overview');
      go(index);
    } else if (event.key.toLowerCase() === 'p') {
      window.print();
    }
  });

  let wheelLock = 0;
  document.addEventListener('wheel', (event) => {
    const now = Date.now();
    if (now - wheelLock < 550 || document.body.classList.contains('overview')) return;
    wheelLock = now;
    if (Math.abs(event.deltaY) > 12) go(index + (event.deltaY > 0 ? 1 : -1));
  }, { passive: true });

  let touchStartY = 0;
  document.addEventListener('touchstart', (event) => { touchStartY = event.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(delta) > 48) go(index + (delta < 0 ? 1 : -1));
  }, { passive: true });

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

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
    case 'closing':
      inner = '<h1>' + escapeHtml(title || ui.closingTitle) + '</h1>' +
        (subtitle !== '' ? '<div class="subtitle">' + escapeHtml(subtitle) + '</div>' : '') +
        '<div class="meta">' + escapeHtml(ui.generatedBy) + '</div>'
      break
    case 'bullets':
    default:
      inner = '<div class="kicker">' + escapeHtml(kicker) + '</div>' +
        '<h2>' + escapeHtml(title) + '</h2>' +
        '<ul>' + bullets.map((bullet) => '<li>' + escapeHtml(bullet) + '</li>').join('') + '</ul>'
      break
  }
  return '<section class="slide slide--' + escapeHtml(slide.layout || 'bullets') + '" data-index="' + number + '">' +
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
    '<a:r><a:rPr lang="zh-CN" sz="' + size + '" b="' + (bold ? 1 : 0) + '" dirty="0">' +
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

function slideShapeList(slide, index, total, theme, langId) {
  const p = theme.palette
  const font = pptxFontName(theme.fonts.heading)
  const bodyFont = pptxFontName(theme.fonts.body) // 保留：v0.1 后续用于统一正文字体
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
      paragraphXml(title, { size: 4400, color: p.fg, bold: true, font }),
    ]))
    if (subtitle !== '') {
      shapes.push(textShapeXml(idBase + 3, 'Subtitle', { x: 1570000, y: 4150000, w: 9000000, h: 1200000 }, [
        paragraphXml(subtitle, { size: 2200, color: p.muted, font: theme.fonts.body }),
      ]))
    }
    if (kicker !== '') {
      shapes.push(textShapeXml(idBase + 4, 'Kicker', { x: 1570000, y: 5800000, w: 7000000, h: 500000 }, [
        paragraphXml(kicker, { size: 1400, color: p.accent, bold: true, font: theme.fonts.body }),
      ]))
    }
  } else if (slide.layout === 'section') {
    if (kicker !== '') {
      shapes.push(textShapeXml(idBase + 1, 'Kicker', { x: 1050000, y: 2250000, w: 9000000, h: 500000 }, [
        paragraphXml(kicker, { size: 1600, color: p.accent, bold: true, font: theme.fonts.body }),
      ]))
    }
    shapes.push(accentBarXml(idBase + 2, 'Accent bar', { x: 1050000, y: 2850000, w: 1600000, h: 160000 }, p.accent2))
    shapes.push(textShapeXml(idBase + 3, 'Title', { x: 1050000, y: 3150000, w: 10200000, h: 1400000 }, [
      paragraphXml(title, { size: 4000, color: p.fg, bold: true, font }),
    ]))
    if (subtitle !== '') {
      shapes.push(textShapeXml(idBase + 4, 'Subtitle', { x: 1070000, y: 4750000, w: 9000000, h: 900000 }, [
        paragraphXml(subtitle, { size: 1800, color: p.muted, font: theme.fonts.body }),
      ]))
    }
  } else if (slide.layout === 'statement') {
    shapes.push(accentBarXml(idBase + 1, 'Accent bar', { x: 914400, y: 1900000, w: 200000, h: 2800000 }, p.accent))
    shapes.push(textShapeXml(idBase + 2, 'Statement', { x: 1500000, y: 1950000, w: 9400000, h: 2700000 }, [
      paragraphXml(title || slide.text || '', { size: 3600, color: p.fg, bold: true, font }),
    ]))
    if (subtitle !== '') {
      shapes.push(textShapeXml(idBase + 3, 'Subtitle', { x: 1520000, y: 4900000, w: 9000000, h: 800000 }, [
        paragraphXml(subtitle, { size: 1800, color: p.muted, font: theme.fonts.body }),
      ]))
    }
  } else if (slide.layout === 'closing') {
    shapes.push(textShapeXml(idBase + 1, 'Title', { x: 1050000, y: 2300000, w: 10200000, h: 1700000 }, [
      paragraphXml(title || '谢谢', { size: 5200, color: p.fg, bold: true, align: 'ctr', font }),
    ]))
    if (subtitle !== '') {
      shapes.push(textShapeXml(idBase + 2, 'Subtitle', { x: 1050000, y: 4200000, w: 10200000, h: 900000 }, [
        paragraphXml(subtitle, { size: 2000, color: p.accent, bold: true, align: 'ctr', font: theme.fonts.body }),
      ]))
    }
  } else {
    // bullets（默认布局）
    if (kicker !== '') {
      shapes.push(textShapeXml(idBase + 1, 'Kicker', { x: 900000, y: 420000, w: 10000000, h: 420000 }, [
        paragraphXml(kicker, { size: 1400, color: p.accent, bold: true, font: theme.fonts.body }),
      ]))
    }
    shapes.push(textShapeXml(idBase + 2, 'Title', { x: 900000, y: 920000, w: 10300000, h: 800000 }, [
      paragraphXml(title, { size: 3400, color: p.fg, bold: true, font }),
    ]))
    const bodyParagraphs = bullets.length > 0
      ? bullets.map((bullet) => paragraphXml(bullet, { size: 2000, color: p.fg, bullet: true, font: theme.fonts.body, spaceAfter: 600 }))
      : [paragraphXml(subtitle || '', { size: 2000, color: p.fg, font: theme.fonts.body })]
    shapes.push(textShapeXml(idBase + 3, 'Body', { x: 1050000, y: 1850000, w: 10100000, h: 4500000 }, bodyParagraphs))
  }

  shapes.push(textShapeXml(idBase + 9, 'Page number', { x: 10600000, y: 6250000, w: 1200000, h: 400000 }, [
    paragraphXml(footer, { size: 1000, color: p.muted, align: 'r', font: theme.fonts.body }),
  ]))

  return shapes.join('')
}

function slideXml(slide, index, total, theme, langId) {
  const p = theme.palette
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
    '</p:sld>'
}

function slideRelXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '</Relationships>'
}

function presentationXml(slideCount) {
  const slideIds = Array.from({ length: slideCount }, (_, i) =>
    '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>').join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst>' + slideIds + '</p:sldIdLst>' +
    '<p:sldSz cx="' + EMU_W + '" cy="' + EMU_H + '" type="screen16x9"/>' +
    '<p:notesSz cx="6858000" cy="9144000"/>' +
    '</p:presentation>'
}

function presentationRelXml(slideCount) {
  const slideRels = Array.from({ length: slideCount }, (_, i) =>
    '<Relationship Id="rId' + (i + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i + 1) + '.xml"/>').join('')
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
    slideRels +
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

function contentTypesXml(slideCount) {
  const overrides = Array.from({ length: slideCount }, (_, i) =>
    '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join('')
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
    overrides +
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

function appXml(slideCount) {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" ' +
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">' +
    '<Application>dsh-ppt</Application><PresentationFormat>Widescreen</PresentationFormat>' +
    '<Slides>' + slideCount + '</Slides><Notes>0</Notes><HiddenSlides>0</HiddenSlides>' +
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
  const slides = manifest.slides
  const entries = [
    { name: '[Content_Types].xml', data: contentTypesXml(slides.length) },
    { name: '_rels/.rels', data: rootRelXml() },
    { name: 'docProps/app.xml', data: appXml(slides.length) },
    { name: 'docProps/core.xml', data: coreXml(manifest.title) },
    { name: 'ppt/presentation.xml', data: presentationXml(slides.length) },
    { name: 'ppt/_rels/presentation.xml.rels', data: presentationRelXml(slides.length) },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: slideMasterXml(theme) },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: slideMasterRelXml() },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: slideLayoutXml(theme) },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: slideLayoutRelXml() },
    { name: 'ppt/theme/theme1.xml', data: themeXml(theme) },
  ]
  slides.forEach((slide, index) => {
    entries.push({ name: 'ppt/slides/slide' + (index + 1) + '.xml', data: slideXml(slide, index, slides.length, theme, language.id) })
    entries.push({ name: 'ppt/slides/_rels/slide' + (index + 1) + '.xml.rels', data: slideRelXml() })
  })
  return buildZip(entries)
}

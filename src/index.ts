/**
 * dsh-ppt —— 演示文稿技能 + 工具插件（v0.1.0）。
 *
 * 一句话或一篇 Markdown 文档 → 完整演示文稿三件套：
 *   deck.html  独立网页放映（无外链）
 *   deck.pptx  可编辑 PPTX（16:9，零依赖 OOXML 生成）
 *   deck.json  结构化 manifest
 *
 * 插件同时注册：
 *   1. 技能 dsh-ppt（跨 harness 的完整 SOP，SKILL.md 随包分发）
 *   2. 工具 ppt_create / ppt_themes（确定性生成与主题查询）
 *
 * 生成引擎是 skills/dsh-ppt/scripts/deck-core.mjs，由工具运行时动态加载；
 * 裸 SKILL.md 复制到其他 agent 时可直接运行同目录 build-deck.mjs。
 *
 * @module dsh-ppt
 */
import { resolvePptConfig } from './config.js'
import { registerPptSkill, type SkillsService } from './skill.js'
import type { DeckEngine, PptConfig, PptCreateArgs, PptCreateResult, PptThemesResult } from './types.js'

/** cordis 服务注入：apply 里要使用 ctx.tools 与 ctx.skills。 */
export const inject = ['tools', 'skills']
export const name = 'dsh-ppt'
export type Config = PptConfig

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: { schema: Record<string, unknown>; render: (args: unknown, value: unknown) => Array<{ type: 'text'; text: string }> }
  execute: (rawArgs: unknown) => Promise<unknown>
}

export interface PptPluginContext {
  tools: { register(definition: ToolDefinition): () => void }
  skills: SkillsService
  logger?: { warn?(message: string): void }
  on?(event: string, listener: () => void): () => void
}

/**
 * 把作者 DSL 映射编译成原生 JSON Schema 对象，作为 defineTool 的
 * definition.parameters 原样下发。原生 wire 请求会逐字携带该值。
 */
function compileParameters(spec: Record<string, any>): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const [key, prop] of Object.entries(spec)) {
    if (prop?.required === true) required.push(key)
    const node: Record<string, unknown> = {}
    if (typeof prop?.type === 'string') node.type = prop.type
    if (typeof prop?.description === 'string') node.description = prop.description
    if (Array.isArray(prop?.enum)) node.enum = prop.enum
    if (prop?.type === 'array' && prop.items !== null && typeof prop.items === 'object') {
      node.items = {
        type: prop.items.type === 'object' ? 'object' : 'string',
        ...(prop.items.type === 'object' ? { additionalProperties: true } : {}),
      }
    }
    properties[key] = node
  }
  return { type: 'object', properties, ...(required.length > 0 ? { required } : {}) }
}

const themeInfoSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    mood: { type: 'string' },
    bestFor: { type: 'string' },
    dark: { type: 'boolean' },
    palette: { type: 'object', additionalProperties: true },
    fonts: { type: 'object', additionalProperties: true },
  },
  additionalProperties: true,
}

const themesResultSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    themes: { type: 'array', items: themeInfoSchema },
  },
  additionalProperties: true,
}

const createResultSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    title: { type: 'string' },
    theme: { type: 'string' },
    language: { type: 'string' },
    slideCount: { type: 'integer' },
    outputDir: { type: 'string' },
    files: {
      type: 'object',
      properties: {
        html: { type: 'string' },
        pptx: { type: 'string' },
        json: { type: 'string' },
      },
      additionalProperties: true,
    },
    htmlPath: { type: 'string' },
    pptxPath: { type: 'string' },
    jsonPath: { type: 'string' },
  },
  additionalProperties: true,
}

type TextBlock = { type: 'text'; text: string }
function oneText(text: string): TextBlock[] {
  return [{ type: 'text', text }]
}

function renderThemes(value: PptThemesResult): TextBlock[] {
  if (value.themes.length === 0) return oneText('dsh-ppt 没有可用主题。')
  const lines = value.themes.map((theme) =>
    '- ' + theme.id + '：' + theme.name + '（' + theme.mood + '）｜适合：' + theme.bestFor + '｜' + (theme.dark ? '深色' : '浅色'))
  return oneText('dsh-ppt 内置主题：\n\n' + lines.join('\n') + '\n\nppt_create 的 theme 参数填其中的 id（默认 data）。')
}

function renderCreate(value: PptCreateResult): TextBlock[] {
  return oneText(
    'dsh-ppt 已生成 ' + value.slideCount + ' 页演示文稿（主题 ' + value.theme + '，语言 ' + value.language + '）：\n' +
    'HTML 网页放映：' + value.htmlPath + '\n' +
    'PPTX 导出：' + value.pptxPath + '\n' +
    'Manifest：' + value.jsonPath + '\n' +
    'HTML 双击即可放映（方向键翻页 / F 全屏 / G 总览 / P 打印）；PPTX 可用 PowerPoint / WPS / Keynote 打开。',
  )
}

let enginePromise: Promise<DeckEngine> | null = null
function getEngine(): Promise<DeckEngine> {
  if (enginePromise === null) {
    const engineUrl = new URL('../skills/dsh-ppt/scripts/deck-core.mjs', import.meta.url)
    enginePromise = import(engineUrl.href).then((module: Record<string, unknown>) => module as unknown as DeckEngine)
      .catch((error: unknown) => {
        enginePromise = null
        throw error
      })
  }
  return enginePromise
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

export function apply(ctx: PptPluginContext, config: Config = {}): void {
  const resolved = resolvePptConfig(config)
  const warn = (message: string): void => { ctx.logger?.warn?.(message) }
  const disposers: Array<() => void> = []

  // 技能注册：单个技能文件缺失只告警，不弄崩宿主启动。
  try {
    disposers.push(registerPptSkill(ctx))
  } catch (error) {
    warn('[dsh-ppt] 技能加载失败：' + (error instanceof Error ? error.message : String(error)))
  }

  disposers.push(ctx.tools.register({
    name: 'ppt_themes',
    description: 'List the built-in visual themes of dsh-ppt (id, name, mood, best-for, light/dark palette) before building a deck. Use a theme id as the theme argument of ppt_create. 中文：列出 dsh-ppt 内置视觉主题（id、名称、情绪、适用场景、明暗色板），用于选择 ppt_create 的 theme 参数。',
    parameters: compileParameters({
      lang: { type: 'string', description: 'Theme description language: zh (default), en, or bilingual.' },
    }),
    output: {
      schema: themesResultSchema,
      render: (_args: unknown, value: unknown) => renderThemes(value as PptThemesResult),
    },
    async execute(rawArgs: unknown) {
      const args = isRecord(rawArgs) ? rawArgs : {}
      const lang = typeof args.lang === 'string' && args.lang.trim() !== '' ? args.lang.trim() : 'zh'
      const engine = await getEngine()
      const themes = engine.listThemes(lang)
      return { ok: true, themes } satisfies PptThemesResult
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'ppt_create',
    description: 'Build a complete presentation deck from one sentence or a Markdown document and write three artifacts to outputDir: a standalone HTML web slideshow, an editable 16:9 PPTX, and a deck.json manifest. Five built-in visual themes are available (see ppt_themes). content is Markdown text (recommended); advanced callers may pass structured slides instead. 中文：把一句话或一篇 Markdown 文档生成完整演示文稿，写入 outputDir 三个文件：独立 HTML 网页放映、可编辑 16:9 PPTX、deck.json manifest；内置 5 套视觉主题。',
    parameters: compileParameters({
      title: { type: 'string', required: true, description: 'Deck title (used for the cover and file names).' },
      content: { type: 'string', required: true, description: 'Markdown content: one sentence, a paragraph, or a full document. First # heading becomes the cover title; ## headings become slides; -/* lists become bullets; | ... | tables become table slides; > blockquotes become quote slides; <!-- 备注: ... --> comments become speaker notes. Required unless slides is provided.' },
      theme: { type: 'string', description: 'Visual theme id: swiss / velvet / data / soft / bold. Default data. See ppt_themes.' },
      lang: { type: 'string', description: 'UI language of the generated player: zh (default), en, or bilingual. Content language is whatever you write.' },
      slides: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Optional structured slides: [{ layout: cover|section|bullets|statement|quote|table|closing, title, subtitle, kicker, bullets: [], rows: [][] (for table), notes: "speaker notes" }]. Use this for precise control instead of content.' },
      outputDir: { type: 'string', description: 'Directory to write the files into. Default: session working directory (or the plugin outputDir config).' },
      fileName: { type: 'string', description: 'Base file name for the three artifacts. Default: sanitized deck title.' },
    }),
    output: {
      schema: createResultSchema,
      render: (_args: unknown, value: unknown) => renderCreate(value as PptCreateResult),
    },
    async execute(rawArgs: unknown) {
      const args = (isRecord(rawArgs) ? rawArgs : {}) as unknown as PptCreateArgs
      if (typeof args.title !== 'string' || args.title.trim() === '') throw new Error('dsh-ppt：title 不能为空')
      const hasContent = typeof args.content === 'string' && args.content.trim() !== ''
      const hasSlides = Array.isArray(args.slides) && args.slides.length > 0
      if (!hasContent && !hasSlides) throw new Error('dsh-ppt：content 不能为空（或用 slides 传结构化幻灯片）')
      const engine = await getEngine()
      return engine.buildDeck({
        title: args.title.trim(),
        content: typeof args.content === 'string' ? args.content : '',
        slides: hasSlides ? args.slides : undefined,
        theme: typeof args.theme === 'string' && args.theme.trim() !== '' ? args.theme.trim() : (resolved.defaultTheme || undefined),
        lang: typeof args.lang === 'string' && args.lang.trim() !== '' ? args.lang.trim() : (resolved.defaultLang || undefined),
        outputDir: typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? args.outputDir.trim() : (resolved.outputDir || undefined),
        fileName: typeof args.fileName === 'string' && args.fileName.trim() !== '' ? args.fileName.trim() : undefined,
        maxSlides: resolved.maxSlides,
      }) as PptCreateResult
    },
  }))

  if (typeof ctx.on === 'function') {
    ctx.on('dispose', () => {
      for (const dispose of disposers) dispose()
    })
  }
}

export { resolvePptConfig, PPT_OUTPUT_DIR_ENV, DEFAULT_MAX_SLIDES, clampInt } from './config.js'
export { bundledSkillsDir, parseSkillFile, registerPptSkill, SKILL_NAMES } from './skill.js'
export type { PptConfig, PptCreateArgs, PptCreateResult, PptSlideSpec, PptThemeInfo, PptThemesResult } from './types.js'

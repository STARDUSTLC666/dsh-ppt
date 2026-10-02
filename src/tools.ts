import type { ResolvedPptConfig } from './config.js'
import { createPptExecutors, type PptExecution } from './execution.js'
import type { PptCreateResult, PptThemesResult, PptQualityResult, PptCheckResult, PptRenderResult } from './types.js'

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: { schema: Record<string, unknown>; render: (args: unknown, value: unknown) => Array<{ type: 'text'; text: string }> }
  execute: (rawArgs: unknown, exec?: PptExecution) => Promise<unknown>
}

/**
 * 把作者 DSL 映射编译成原生 JSON Schema 对象，作为 defineTool 的
 * definition.parameters 原样下发。原生 wire 请求会逐字携带该值。
 */
interface ParameterSpec {
  type: string | string[]
  description?: string
  required?: boolean
  enum?: readonly string[]
  items?: Record<string, unknown>
  properties?: Record<string, unknown>
  additionalProperties?: boolean
}

/** Harness uses disjoint oneOf branches for unions, never type arrays. */
function compileNode(node: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(node.type)) {
    const { type, description, properties, additionalProperties, items, required, ...shared } = node
    return {
      ...(description !== undefined ? { description } : {}),
      oneOf: (type as string[]).map(kind => compileNode({
        ...shared, type: kind,
        ...(kind === 'object' ? {
          ...(properties !== undefined ? { properties } : {}),
          ...(additionalProperties !== undefined ? { additionalProperties } : {}),
          ...(required !== undefined ? { required } : {}),
        } : {}),
        ...(kind === 'array' && items !== undefined ? { items } : {}),
      })),
    }
  }
  const compiled = { ...node }
  if (node.properties) compiled.properties = Object.fromEntries(Object.entries(node.properties as Record<string, Record<string, unknown>>).map(([key, value]) => [key, compileNode(value)]))
  if (node.items) compiled.items = compileNode(node.items as Record<string, unknown>)
  if (Array.isArray(node.oneOf)) compiled.oneOf = node.oneOf.map(value => compileNode(value as Record<string, unknown>))
  return compiled
}

function compileParameters(spec: Record<string, ParameterSpec>): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const [key, prop] of Object.entries(spec)) {
    if (prop?.required === true) required.push(key)
    const node: Record<string, unknown> = {}
    if (typeof prop?.type === 'string' || Array.isArray(prop?.type)) node.type = prop.type
    if (typeof prop?.description === 'string') node.description = prop.description
    if (Array.isArray(prop?.enum)) node.enum = prop.enum
    if (prop?.type === 'array' && prop.items !== null && typeof prop.items === 'object') node.items = prop.items
    if (prop.properties) node.properties = prop.properties
    if (prop.additionalProperties !== undefined) node.additionalProperties = prop.additionalProperties
    properties[key] = compileNode(node)
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
    preview: { type: 'object', additionalProperties: true },
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
  const summary = 'dsh-ppt 内置主题：\n\n' + lines.join('\n') + '\n\nppt_create 的 theme 参数填其中的 id（默认 data）。'
  if (value.preview) {
    return oneText(summary + '\n\n主题预览已写入：' + value.preview.htmlPath + '\nSVG 色板卡：' + value.preview.svgs.map((svg) => svg.path).join(' / '))
  }
  return oneText(summary + '\n\n想要并排对比：ppt_themes { preview: true, outputDir: "..." } 会生成 themes-preview.html 和每套主题的 SVG 色板卡。')
}

function renderCreate(value: PptCreateResult): TextBlock[] {
  return oneText(
    'dsh-ppt 已生成 ' + value.slideCount + ' 页' + (value.deliveryStatus === 'draft' ? '草稿（还有待填写内容，不能作为成品交付）' : '演示文稿') + '（主题 ' + value.theme + '，语言 ' + value.language + '）：\n' +
    '打开演示文稿：' + value.htmlPath + '\n' +
    '可直接修改的 PPTX：' + value.pptxPath + '\n' +
    '可继续编辑的项目：' + value.jsonPath + '\n' +
    'HTML 双击即可放映；可点击上一页/下一页、输入页码，以及“检查与导出”定位问题或下载 PPTX。PPTX 可用 PowerPoint / WPS / Keynote 直接编辑。' +
    (value.revision !== undefined ? '\n修订号：' + value.revision + '；可撤销修改：' + value.undoAvailable + '。用 ppt_edit 修改指定页，ppt_undo 撤销。' : '') +
    (value.quality ? '\n\n' + qualityText(value.quality) : ''),
  )
}

function qualityText(value: PptQualityResult): string {
  return '质量检查：' + value.errorCount + ' 个错误，' + value.warningCount + ' 个提醒。\n' +
    value.issues.slice(0, 12).map(issue => '第 ' + issue.slide + ' 页：' + issue.message + '；' + issue.suggestion).join('\n') +
    (value.issues.length > 12 ? '\n其余提醒请查看结构化结果。' : '') + '\n' + value.note
}

function renderCheck(value: PptCheckResult): TextBlock[] {
  return oneText(qualityText(value) + '\nPPTX 渲染：' + (value.verification?.pptxRender === 'rendered' ? '已核验当前文件的渲染输出' : '尚未验证') +
    '；视觉检查：需查看实际画面。' + (value.render?.message ? '\n' + value.render.message : '') +
    (value.render?.missingFonts?.length ? '\n缺失字体：' + value.render.missingFonts.join('、') + '。请替换为可用字体，重新生成并检查每页；解决前需标注字体问题。' : ''))
}

function renderPreview(value: PptRenderResult): TextBlock[] {
  if (!value.ok) return oneText((value.message || 'PPTX 尚未渲染。') + (value.installationHint ? '\n' + value.installationHint : ''))
  return oneText('PPTX 已渲染 ' + value.slideCount + ' 页（' + value.backend + '）：\n' +
    (value.pngPaths?.length ? '逐页 PNG：\n' + value.pngPaths.slice(0, 6).join('\n') + (value.pngPaths.length > 6 ? '\n其余页面见结构化结果。' : '') + '\n' : '') +
    (value.pdfPath ? 'PDF：' + value.pdfPath + '\n' : '') + '渲染收据：' + value.receiptPath +
    '\n缺失字体：' + (value.missingFonts?.join('、') || '引擎未报告缺失字体') +
    (value.missingFonts?.length ? '\n请先替换为环境和目标机器可用字体，重新生成并渲染检查；解决前不能声称已验收。' : '') +
    '\n请查看实际画面，确认文字、图片和图表后再交付。原可编辑 PPTX 保留。')
}

const imageSchema = { type: ['object', 'string', 'null'], properties: {
  src: { type: 'string', description: 'Local PNG/JPEG path relative to the session cwd, or image data URI. Embedded into all output files.' },
  alt: { type: 'string' }, fit: { type: 'string', enum: ['contain', 'cover'] }, caption: { type: 'string' },
}, additionalProperties: false }
const chartSchema = { type: ['object', 'null'], properties: {
  kind: { type: 'string', enum: ['column', 'bar', 'line', 'pie'] },
  categories: { type: 'array', items: { type: ['string', 'number'] } },
  series: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, values: { type: 'array', items: { type: ['number', 'string'] } } }, required: ['name', 'values'], additionalProperties: false } },
  rows: { type: 'array', items: { type: 'array', items: { type: ['string', 'number'] } }, description: 'Alternative: header row [category, series names], then category/value rows.' },
  unit: { type: 'string' }, caption: { type: 'string' },
}, additionalProperties: false }
const brandProperties = {
  name: { type: 'string' }, primaryColor: { type: 'string' }, backgroundColor: { type: 'string' }, textColor: { type: 'string' },
  fontFamily: { type: 'string', description: 'One installed font family; choose a font available on the recipient computer.' },
  logo: { type: ['string', 'null'], description: 'Local PNG/JPEG logo path; null clears logo during edit.' }, footer: { type: 'string' },
}
const slideProperties = {
  layout: { type: 'string', enum: ['cover', 'section', 'bullets', 'statement', 'quote', 'table', 'closing', 'image', 'image-left', 'image-right', 'chart'] },
  title: { type: 'string' }, subtitle: { type: 'string' }, kicker: { type: 'string' }, text: { type: 'string' }, notes: { type: 'string' },
  bullets: { type: 'array', items: { type: 'string' } }, rows: { type: 'array', items: { type: 'array', items: { type: ['string', 'number'] } } },
  image: imageSchema, chart: chartSchema,
}
const projectParameters = {
  deckPath: { type: 'string', required: true, description: 'Path to a dsh-ppt .json project, relative to this session cwd or absolute. Arbitrary external PPTX editing is not supported.' },
  expectedRevision: { type: 'integer', description: 'Use revision returned by ppt_create/ppt_check to prevent overwriting another edit.' },
}

/** Assemble presentation schemas, rendering and the session-aware executors. */
export function buildPptTools(config: ResolvedPptConfig): ToolDefinition[] {
  const executors = createPptExecutors(config)
  return [
    {
      name: 'ppt_themes',
      description: 'List the built-in visual themes of dsh-ppt (id, name, mood, best-for, light/dark palette) before building a deck. Pass preview: true with outputDir to also write a self-contained theme gallery HTML plus one SVG palette card per theme (ready for README/npm screenshots). Use a theme id as the theme argument of ppt_create. 中文：列出 dsh-ppt 内置视觉主题（id、名称、情绪、适用场景、明暗色板）；传 preview: true + outputDir 会额外生成主题对比页和每套主题的 SVG 色板卡（可直接放 README/npm 首屏），用于选择 ppt_create 的 theme 参数。',
      parameters: compileParameters({
        lang: { type: 'string', description: 'Theme description language: zh (default), en, or bilingual.' },
        preview: { type: 'boolean', description: 'Write a theme gallery HTML and one SVG palette card per theme into outputDir. Default false (list only).' },
        outputDir: { type: 'string', description: 'Directory for preview files when preview is true. Default: session working directory (or the plugin outputDir config).' },
        overwrite: { type: 'boolean', description: 'Overwrite existing preview files instead of adding a numeric suffix. Default false.' },
      }),
      output: {
        schema: themesResultSchema,
        render: (_args: unknown, value: unknown) => renderThemes(value as PptThemesResult),
      },
      execute: executors.themes,
    },
    {
      name: 'ppt_create',
      description: 'Generate a standalone HTML slideshow, editable 16:9 PPTX and JSON project from prepared Markdown or structured slides. Organize actual facts and content before calling; this deterministic generator does not invent missing facts or research them. Supports five themes, local images, native editable charts and shared branding. Check and visually review artifacts before delivery; template-only output is an unfilled draft. 中文：先组织事实与内容，再生成可直接放映和继续编辑的三件套；支持图片、原生图表与品牌，交付前检查成品。',
      parameters: compileParameters({
        title: { type: 'string', required: true, description: 'Deck title (used for the cover and file names).' },
        content: { type: 'string', description: 'Markdown content: one sentence, a paragraph, or a full document. First # heading becomes the cover title; ## headings become slides; -/* lists become bullets; | ... | tables paginate with repeated headers (8 data rows/page, up to 8 columns and 60 characters/cell); > blockquotes become quote slides; <!-- 备注: ... --> comments become speaker notes. Required unless slides is provided.' },
        theme: { type: 'string', description: 'Visual theme id: swiss / velvet / data / soft / bold. Default data. See ppt_themes.' },
        lang: { type: 'string', description: 'UI language of the generated player: zh (default), en, or bilingual. Content language is whatever you write.' },
        motion: { type: 'string', enum: ['on', 'off'], description: 'Slide transitions plus bullet entrance animations: on (default) or off for a fully static deck.' },
        slides: { type: 'array', items: { type: 'object', properties: slideProperties, additionalProperties: true }, description: 'Structured slides including image/image-left/image-right and chart. Images: {src, alt, fit: contain|cover, caption}. Charts: {kind: column|bar|line|pie, categories, series:[{name,values}]} or rows with header. Tables paginate at 8 data rows. Keep full content editable; use images only for actual photos/screenshots/logos.' },
        template: { type: 'string', enum: ['weekly', 'defense', 'project', 'pitch'], description: 'Scenario reference from ppt_templates. Provide finished content/slides following its outline. Template alone creates a clearly marked draft with unfilled slots, never a finished presentation.' },
        brand: { type: 'object', properties: brandProperties, additionalProperties: false, description: 'Shared brand: #RRGGBB primary/background/text colors, fontFamily, logo and footer. Applied to HTML and PPTX.' },
        outputDir: { type: 'string', description: 'Directory to write the files into. Default: session working directory (or the plugin outputDir config).' },
        fileName: { type: 'string', description: 'Base file name for the three artifacts. Default: sanitized deck title.' },
        overwrite: { type: 'boolean', description: 'Replace an existing same-name HTML/PPTX/JSON trio. Default false: choose a unique numeric suffix instead.' },
      }),
      output: {
        schema: createResultSchema,
        render: (_args: unknown, value: unknown) => renderCreate(value as PptCreateResult),
      },
      execute: executors.create,
    },
    {
      name: 'ppt_templates',
      description: 'List weekly report, thesis defense, project update and pitch scenario outlines and draft structures. Use as internal content planning references; fill actual facts before delivering a finished deck. 中文：查看周报、答辩、项目汇报和路演的结构参考，组织并填写真实内容后再调用 ppt_create 交付成品。',
      parameters: compileParameters({ lang: { type: 'string', description: 'zh / en / bilingual, default zh.' } }),
      output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => oneText(JSON.stringify(value, null, 2)) },
      execute: executors.templates,
    },
    {
      name: 'ppt_edit',
      description: 'Modify selected slides in an existing dsh-ppt JSON project, preserving other pages and stable IDs. Each edit uses a 1-based slide number or ID and a patch of changed fields. Regenerates the HTML/PPTX/JSON trio atomically, embeds new images, stores undo history. Use ppt_check first and expectedRevision. 中文：按页码或 ID 修改指定页，其他页不变，支持撤销；可同步调整品牌。',
      parameters: compileParameters({ ...projectParameters,
        edits: { type: 'array', items: { type: 'object', properties: { slide: { type: ['integer', 'string'], description: '1-based page number or stable slide ID' }, patch: { type: 'object', properties: slideProperties, additionalProperties: false } }, required: ['slide', 'patch'], additionalProperties: false } },
        brand: { type: ['object', 'null'], properties: brandProperties, additionalProperties: false, description: 'Merge shared branding. null clears all branding. Empty footer clears footer; logo:null clears logo.' },
      }),
      output: { schema: createResultSchema, render: (_args, value) => renderCreate(value as PptCreateResult) },
      execute: executors.edit,
    },
    {
      name: 'ppt_undo',
      description: 'Undo the most recent edit in a dsh-ppt JSON project, restoring slides, charts, embedded images and branding together. Revision increases so stale edits cannot overwrite the undo. Keeps up to 20 edits. 中文：撤销最近一次修改，恢复正文、图表、图片和品牌设置。',
      parameters: compileParameters(projectParameters),
      output: { schema: createResultSchema, render: (_args, value) => renderCreate(value as PptCreateResult) },
      execute: executors.undo,
    },
    {
      name: 'ppt_check',
      description: 'Inspect a dsh-ppt JSON project without rewriting artifacts. Report revision, slide IDs, page-specific errors and warnings for dense text, estimated overflow, small table fonts, missing/low-resolution images, chart labels, contrast and unfilled template slots. Static estimates require final visual review in browser and PowerPoint/WPS. 中文：交付前检查工程，定位具体页的问题并给出修改建议，不改文件。',
      parameters: compileParameters({ deckPath: projectParameters.deckPath,
        renderReceipt: { type: 'string', description: 'Optional receiptPath returned by ppt_render. Rechecks current PPTX hash and every rendered output; never implies a visual pass.' },
      }),
      output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => renderCheck(value as PptCheckResult) },
      execute: executors.check,
    },
    {
      name: 'ppt_render',
      description: 'Read the final PPTX and render all pages to PNG, PDF, or both using optional official @deepseek-ai/libreoffice-kit@0.1.3. Returns unavailable plus installation guidance when absent; ordinary deck creation remains usable. Retains original editable PPTX and creates a separate unique output folder and integrity receipt. Reports missing fonts. Inspect actual pages before delivery. 中文：把最终 PPTX 渲染为逐页图片和 PDF，报告缺失字体；需安装可选官方引擎，渲染成功仍需检查画面。',
      parameters: compileParameters({
        pptxPath: { type: 'string', required: true, description: 'Final .pptx path, absolute or relative to session cwd.' },
        outputDir: { type: 'string', description: 'Base output folder. Existing folders are preserved; creates a unique sibling when needed. Default <deck>-render.' },
        format: { type: 'string', enum: ['png', 'pdf', 'both'], description: 'png (default), pdf, or both.' },
        width: { type: 'integer', description: 'PNG target width 320–3840, default 1440; scales from actual page dimensions.' },
        timeoutMs: { type: 'integer', description: 'Whole rendering deadline in milliseconds, 1000–300000, default 120000.' },
      }),
      output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => renderPreview(value as PptRenderResult) },
      execute: executors.render,
    },
  ]
}

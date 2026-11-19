import { ALLOWED_CHROME_STYLES, ALLOWED_THEME_IDS, type ResolvedPptConfig } from './config.js'
import { createPptExecutors, type PptExecution } from './execution.js'
import type {
  PptAbsorbResult,
  PptCheckResult,
  PptCiteResult,
  PptCreateResult,
  PptQualityResult,
  PptRemotionResult,
  PptRenderResult,
  PptThemesResult,
} from './types.js'

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
        handout: { type: 'string' },
      },
      additionalProperties: true,
    },
    htmlPath: { type: 'string' },
    pptxPath: { type: 'string' },
    jsonPath: { type: 'string' },
    handoutPath: { type: 'string' },
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
    '- ' + theme.id + '：' + theme.name + '（' + theme.mood + '）｜适合：' + theme.bestFor +
    (theme.chromeStyle ? '｜骨架：' + theme.chromeStyle : '') + '｜' + (theme.dark ? '深色' : '浅色'))
  const summary = 'dsh-ppt 内置主题（共 ' + value.themes.length + ' 套，配 6 套差异化母版骨架）：\n\n' + lines.join('\n') + '\n\nppt_create 的 theme 参数可填其中的 id，或省略 / 填 auto 由智能导演按场景自动匹配（通用默认 consulting）。'
  if (value.preview) {
    return oneText(summary + '\n\n主题预览已写入：' + value.preview.htmlPath + '\nSVG 色板卡：' + value.preview.svgs.map((svg) => svg.path).join(' / '))
  }
  return oneText(summary + '\n\n想要并排对比：ppt_themes { preview: true, outputDir: "..." } 会生成 themes-preview.html 和每套主题的 SVG 色板卡。')
}

function renderAbsorb(value: PptAbsorbResult): TextBlock[] {
  const brand = value.sanitizedBrand ?? {}
  const profile = value.narrativeProfile as Record<string, unknown> | undefined
  const parts = [
    'dsh-ppt 已解析参考演示文稿' + (value.pptxPath ? '：' + value.pptxPath : '') + '（共 ' + value.slideCount + ' 页）',
    '推荐内置主题：' + value.recommendedTheme + (value.recommendedChrome ? ' ｜ 推荐母版骨架：' + value.recommendedChrome : '') + (value.recommendedTableStyle ? ' ｜ 推荐表格规范：' + value.recommendedTableStyle : ''),
    '净化后品牌色板：主色 ' + (brand.primaryColor || '—') + (brand.secondaryColor ? ' ｜ 辅色 ' + brand.secondaryColor : '') + ' ｜ 背景 ' + (brand.backgroundColor || '—') + ' ｜ 文字 ' + (brand.textColor || '—') +
      (brand.fontFamily ? ' ｜ 正文字体 ' + brand.fontFamily : '') + (brand.headingFont ? ' ｜ 标题字体 ' + brand.headingFont : '') +
      (brand.coverMode === 'inverted-accent' ? ' ｜ 深色反白封面 (' + (brand.coverBg || brand.primaryColor || '') + ')' : '') +
      (brand.chromeStyle ? ' ｜ 骨架 ' + brand.chromeStyle : '') + (brand.logo ? ' ｜ 已提取母版 Logo' : ''),
    ...(value.slideSkeleton?.length ? ['提取页面骨架：' + value.slideSkeleton.slice(0, 8).map(s => `P${s.slideNumber}:${s.inferredLayout}${s.variant ? `[${s.variant}]` : ''}`).join(' → ') + (value.slideSkeleton.length > 8 ? ' …' : '')] : []),
    ...(typeof profile?.diagramRatio === 'number' ? ['专业图示页占比：' + Math.round(Number(profile.diagramRatio) * 100) + '%'] : []),
    '可直接调用 ppt_create { title: "...", content: "...", referencePptx: ' + JSON.stringify(value.pptxPath || '<参考文件.pptx>') + ', cloneStructure: true } 自动套用净化后的色板、母版骨架与版式序列。',
  ]
  return oneText(parts.join('\n'))
}

function renderCreate(value: PptCreateResult): TextBlock[] {
  return oneText(
    'dsh-ppt 已生成 ' + value.slideCount + ' 页' + (value.deliveryStatus === 'draft' ? '草稿（还有待填写内容，不能作为成品交付）' : '演示文稿') + '（主题 ' + value.theme + '，语言 ' + value.language + '）：\n' +
    '打开演示文稿：' + value.htmlPath + '\n' +
    '可直接修改的 PPTX：' + value.pptxPath + '\n' +
    '可继续编辑的项目：' + value.jsonPath + '\n' +
    (value.handoutPath ? '演讲讲义：' + value.handoutPath + '\n' : '') +
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

function renderCite(value: PptCiteResult): TextBlock[] {
  if (value.matchedCount === 0) {
    return oneText(
      'dsh-cite 引文链接：未匹配到 [@citeKey] / [doi:...] 标记或指定文献' +
      (value.missingKeys.length ? '（未找到：' + value.missingKeys.join(', ') + '）' : '') +
      '，未修改工程文件。',
    )
  }
  return oneText(
    'dsh-cite 已链接 ' + value.matchedCount + ' 条已核验文献（' + value.citedKeys.join(', ') + '）' +
    (value.referencesSlideIndex ? '，已同步更新第 ' + value.referencesSlideIndex + ' 页参考文献' : '') +
    (value.missingKeys.length ? '；未匹配键：' + value.missingKeys.join(', ') : '') +
    (value.deck ? '。\n最新修订号：' + value.deck.revision + ' · PPTX：' + value.deck.pptxPath : '。'),
  )
}

function renderRemotion(value: PptRemotionResult): TextBlock[] {
  return oneText(
    'dsh-remotion 视频分镜工程已导出至：' + value.outputDir + '\n' +
    '分镜清单：' + value.storyboardPath + '\n' +
    '规格：' + value.slideCount + ' 页 · ' + value.fps + ' fps · 共 ' + value.totalFrames + ' 帧（约 ' + value.totalSeconds + ' 秒）\n' +
    '进入目录运行 npm install && npm run preview 或 npm run render 即可预览与渲染 MP4。',
  )
}

const imageObjectProperties = {
  src: { type: 'string', description: 'Local PNG/JPEG path relative to the session cwd, or image data URI. Embedded into all output files.' },
  alt: { type: 'string' }, fit: { type: 'string', enum: ['contain', 'cover'] }, caption: { type: 'string' },
}
const imageSchema = { type: ['object', 'string', 'null'], properties: imageObjectProperties, additionalProperties: false }
const chartKinds = [
  'column', 'bar', 'stacked-column', 'stacked-bar', 'percent-column', 'percent-bar',
  'line', 'area', 'pie', 'doughnut', 'scatter', 'combo', 'waterfall',
] as const
const chartSchema = { type: ['object', 'null'], properties: {
  kind: { type: 'string', enum: chartKinds },
  categories: { type: 'array', items: { type: ['string', 'number'] } },
  series: { type: 'array', items: { type: 'object', properties: {
    name: { type: 'string' },
    values: { type: 'array', items: { type: ['number', 'string'] } },
    chartKind: { type: 'string', enum: ['column', 'line', 'area'] },
    secondaryAxis: { type: 'boolean' },
  }, required: ['name', 'values'], additionalProperties: false } },
  rows: { type: 'array', items: { type: 'array', items: { type: ['string', 'number'] } }, description: 'Alternative: header row [category, series names], then category/value rows.' },
  unit: { type: 'string' }, caption: { type: 'string' }, source: { type: 'string' },
  highlight: {
    description: 'Focal bar/point highlight: 0-based category index, array of indices, or "max" | "last" | "none".',
    oneOf: [
      { type: 'integer' },
      { type: 'array', items: { type: 'integer' } },
      { type: 'string', enum: ['max', 'last', 'none'] },
    ],
  },
  spotlight: { type: 'boolean', description: 'Automatically dim non-focal bars and highlight the leading value.' },
  showGrowthCallout: { type: 'boolean', description: 'Render McKinsey-style first-to-last growth callout arc and badge.' },
  referenceLine: {
    type: 'object',
    properties: {
      value: { type: 'number' },
      label: { type: 'string' },
      color: { type: 'string' },
    },
    required: ['value'],
    additionalProperties: false,
    description: 'Dashed benchmark/target reference line across the chart plot.',
  },
  callout: {
    type: 'object',
    properties: {
      label: { type: 'string' },
      fromIndex: { type: 'integer' },
      toIndex: { type: 'integer' },
    },
    required: ['label'],
    additionalProperties: false,
    description: 'Explicit executive growth/bridge annotation badge linking two categories.',
  },
  showValues: { type: 'boolean' },
  totalIndices: { type: 'array', items: { type: 'integer' }, description: '0-based category indices treated as totals in waterfall charts.' },
}, additionalProperties: false }
const brandProperties = {
  name: { type: 'string' }, primaryColor: { type: 'string' }, secondaryColor: { type: 'string' }, backgroundColor: { type: 'string' }, textColor: { type: 'string' },
  fontFamily: { type: 'string', description: 'One installed font family; choose a font available on the recipient computer.' },
  headingFont: { type: 'string', description: 'Optional distinct heading font family (e.g. Georgia or serif paired with sans body).' },
  coverMode: { type: 'string', enum: ['standard', 'inverted-accent'], description: 'Optional cover polarity override.' },
  coverBg: { type: 'string', description: 'Optional #RRGGBB cover background color when coverMode is inverted-accent.' },
  logo: { type: ['string', 'null'], description: 'Local PNG/JPEG logo path or data URI; null clears logo during edit.' }, footer: { type: 'string' },
  chromeStyle: {
    description: 'Master chrome skeleton override: ' + ALLOWED_CHROME_STYLES.join(' | ') + ' (or null to clear during edit).',
    oneOf: [
      { type: 'string', enum: ALLOWED_CHROME_STYLES },
      { type: 'null' },
    ],
  },
  cardMaterial: {
    description: 'Surface materiality: solid | frameless | glass | editorial-rule (or null to clear during edit).',
    oneOf: [
      { type: 'string', enum: ['solid', 'frameless', 'glass', 'editorial-rule'] },
      { type: 'null' },
    ],
  },
  iconMode: {
    description: 'Native vector icon mode on cards/KPIs: off | explicit | auto (or null to clear).',
    oneOf: [
      { type: 'string', enum: ['off', 'explicit', 'auto'] },
      { type: 'null' },
    ],
  },
  taste: {
    description: 'Curated Taste Recipe ID (mckinsey-partner | apple-keynote-dark | apple-keynote-light | swiss-editorial | linear-craft | ft-data-journal | nature-academic | oriental-zen) or saved workspace recipe ID.',
    oneOf: [
      { type: 'string' },
      { type: 'null' },
    ],
  },
}
const slideItemSchema = {
  type: 'object',
  properties: {
    tag: { type: 'string' }, badge: { type: 'string' },
    title: { type: 'string' },
    text: { type: 'string' }, body: { type: 'string' },
    bullets: { type: 'array', items: { type: 'string' } },
    value: { type: ['string', 'number'] },
    unit: { type: 'string' },
    delta: { type: 'string' },
    start: { type: 'number', description: '0-based start column/slot index for gantt bars.' },
    span: { type: 'number', description: 'Column span width (>=0; 0 or milestone:true renders a diamond milestone) for gantt bars.' },
    milestone: { type: 'boolean' },
    role: { type: 'string', description: 'Role/title badge for org/team cards.' },
    conversion: { type: 'string', description: 'Stage conversion rate badge for funnel/flywheel process steps.' },
    icon: { type: 'string', description: 'Native vector icon name (e.g. rocket, shield, cpu, trending-up, coins, cloud, bot, spark, target, users, or "auto").' },
    status: { type: 'string', enum: ['positive', 'negative', 'warning', 'neutral', 'accent'] },
    tone: { type: 'string', enum: ['positive', 'negative', 'warning', 'neutral', 'accent'] },
  },
  additionalProperties: false,
}
const slideLayouts = [
  'cover', 'agenda', 'section', 'bullets', 'statement', 'quote',
  'kpi', 'cards', 'comparison', 'matrix', 'process', 'callout',
  'gantt', 'architecture', 'harvey', 'tam', 'org',
  'marimekko', 'sankey', 'swot',
  'table', 'closing', 'image', 'image-left', 'image-right',
  'chart', 'chart-split', 'gallery', 'waterfall', 'flywheel',
  'bento', 'pillars', 'exec-summary', 'timeline', 'steps', 'layers', 'funnel', 'chevron', 'value-chain',
  'issue-action', 'before-after', 'matrix-2x2', 'kpi-grid', 'scorecard',
  'formula-callout', 'takeaways', 'gallery-grid', 'ablation-compare', 'roadmap', 'swimlane', 'team',
  'mermaid', 'flowchart', 'sequence',
] as const
const templateIds = [
  'weekly', 'defense', 'project', 'pitch',
  'consulting', 'keynote', 'gov-report', 'workshop',
  'architecture-review', 'financial-earnings', 'medical-case', 'postmortem',
  'marketing-campaign', 'promotion-review', 'legal-compliance', 'creative-lookbook',
  'quarterly-okr', 'product-prd', 'vc-daylight', 'industry-research',
] as const
const tableStyles = ['consulting', 'booktabs', 'minimal', 'banded', 'harvey'] as const
const slideProperties = {
  layout: { type: 'string', enum: slideLayouts },
  variant: { type: 'string', description: 'Layout sub-variant, e.g. keynote-glow|editorial-grid|architectural|split-bleed (cover), agenda (section), spotlight|frameless|grid (kpi), pillars|bento|bento-hero|frameless|exec-summary (cards), versus|before-after|do-dont|issue-action (comparison), steps|timeline|layers|funnel|flywheel (process), quarters|months|weeks|swimlane (gantt), layered|platform (architecture), concentric (tam), tree|team (org), framed|split-bleed (image-left/right), chart-left|chart-right (chart-split).' },
  chrome: { type: 'string', enum: ALLOWED_CHROME_STYLES, description: 'Optional per-slide master chrome skeleton override.' },
  cardMaterial: { type: 'string', enum: ['solid', 'frameless', 'glass', 'editorial-rule'], description: 'Optional per-slide card surface materiality.' },
  iconMode: { type: 'string', enum: ['off', 'explicit', 'auto'], description: 'Optional per-slide native vector icon badge mode.' },
  title: { type: 'string' }, subtitle: { type: 'string' }, kicker: { type: 'string' },
  takeaway: { type: 'string', description: 'Bottom key-takeaway synthesis banner.' },
  source: { type: 'string', description: 'Bottom-left data/citation source line.' },
  text: { type: 'string' },
  formula: { type: 'string', description: 'LaTeX math expression rendered as native Office Math (<m:oMath>) in PPTX and MathML in HTML (e.g. on callout slides with variant: "formula").' },
  mermaid: { type: 'string', description: 'Mermaid flowchart or sequenceDiagram code compiled into native editable PowerPoint shapes & attached connectors in PPTX and SVG in HTML.' },
  notes: { type: 'string' },
  start: { type: 'number' }, span: { type: 'number' },
  activeIndex: { type: 'integer' },
  tableStyle: { type: 'string', enum: tableStyles },
  bullets: { type: 'array', items: { type: 'string' } },
  items: { type: 'array', items: slideItemSchema, description: 'Structured sub-elements for kpi, cards, comparison, matrix, process, callout, gantt, architecture, tam, org, or chart-split.' },
  cards: { type: 'array', items: slideItemSchema },
  metrics: { type: 'array', items: slideItemSchema },
  columns: { type: 'array', items: { oneOf: [{ type: 'string' }, slideItemSchema] }, description: 'Time-header labels (string[]) for gantt slides, or column items (object[]) as an items alias.' },
  steps: { type: 'array', items: slideItemSchema },
  quadrants: { type: 'array', items: slideItemSchema },
  rows: { type: 'array', items: { type: 'array', items: { type: ['string', 'number'] } } },
  image: imageSchema,
  images: { type: 'array', items: { oneOf: [{ type: 'object', properties: imageObjectProperties, additionalProperties: false }, { type: 'string' }] } },
  chart: chartSchema,
  visual: {
    type: 'object',
    properties: {
      titleSize: { type: 'integer' },
      bodySize: { type: 'integer' },
      chartLabelSize: { type: 'integer' },
      density: { type: 'string', enum: ['compact', 'balanced', 'airy'] },
      tableStyle: { type: 'string', enum: tableStyles },
      chrome: { type: 'string', enum: ALLOWED_CHROME_STYLES },
    },
    additionalProperties: false,
  },
}
const projectParameters = {
  deckPath: { type: 'string', required: true, description: 'Path to a dsh-ppt .json project, relative to this session cwd or absolute. Arbitrary external PPTX editing is not supported.' },
  expectedRevision: { type: 'integer', description: 'Use revision returned by ppt_create/ppt_check to prevent overwriting another edit.' },
}

const sourceProperties = {
  id:{type:'string',description:'Letters and digits, starting with a letter; unique ID.'}, name:{type:'string'},
  format:{type:'string',enum:['csv','tsv','text']},content:{type:'string',description:'CSV/TSV or text content, combined sources at most 1 MiB.'},
  path:{type:'string',description:'Explicit local CSV/TSV/TXT/Markdown import path, relative to session cwd. Embedded once; no file watcher.'},
  kind:{type:'string',enum:['table','text']},rows:{type:'array',items:{type:'array',items:{oneOf:[{type:'string'},{type:'number'}]}}},text:{type:'string'},
}
const metricProperties = {
  id:{type:'string'},label:{type:'string'},kind:{type:'string',enum:['source','input','formula']},
  source:{type:'object',properties:{sourceId:{type:'string'},cell:{type:'string',description:'A1 to Z500; first CSV row counts as row 1.'},line:{type:'integer',description:'1-based text line.'},numberIndex:{type:'integer',description:'0-based numeric token on that line.'}},required:['sourceId']},
  value:{type:'number'},min:{type:'number'},max:{type:'number'},step:{type:'number'},note:{type:'string',description:'Explain the user assumption; do not invent factual provenance.'},
  formula:{type:'string',description:'Metric IDs, + - * / % **, parentheses and min/max/sum/abs/floor/ceil/round only. No JS property access or I/O.'},
  format:{type:'object',properties:{style:{type:'string',enum:['number','percent']},digits:{type:'integer'},unit:{type:'string'}}},
}

/** Assemble presentation schemas, rendering and the session-aware executors. */
export function buildPptTools(config: ResolvedPptConfig): ToolDefinition[] {
  const executors = createPptExecutors(config)
  return [
    {
      name: 'ppt_themes',
      description: 'List the 24 built-in visual themes of dsh-ppt (paired with 6 distinct master chrome skeletons: id, name, mood, best-for, chromeStyle, palette) before building a deck. Pass preview: true with outputDir to also write a self-contained theme gallery HTML plus one SVG palette card per theme. Use a theme id (or "auto") as the theme argument of ppt_create. 中文：列出 dsh-ppt 内置 24 套大师主题与 6 套差异化母版骨架；传 preview: true + outputDir 会额外生成主题对比页和每套主题的 SVG 色板卡。',
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
      name: 'ppt_absorb',
      description: 'Inspect a local reference .pptx file (read-only, offline via @office-kit/pptx) to absorb its theme palette (including lumMod/tint/shade modifiers), Latin/East-Asian fonts, master logo, chrome skeleton geometry (extractedSkeleton, recommendedChrome), and per-slide layout sequence (slideSkeleton[]), returning WCAG-sanitized brand & semantic tokens for ppt_create. 中文：只读深度解析本地参考 .pptx 母版骨架、修饰色值、字体、Logo 与逐页版式序列，自动执行 WCAG 净化后供 ppt_create (referencePptx / cloneStructure) 或 ppt_edit 直接吸收复用。',
      parameters: compileParameters({
        pptxPath: { type: 'string', required: true, description: 'Local reference .pptx path, relative to session cwd or absolute. Read-only.' },
        extractLogo: { type: 'boolean', description: 'Extract embedded master/cover logo as a PNG/JPEG data URI into sanitizedBrand.logo when present (default true).' },
        saveTasteAs: { type: 'string', description: 'Optional ID to save the absorbed deep aesthetic StyleRecipe into workspace .dsh-ppt/taste-recipes.json for one-click reuse via taste.' },
        tasteName: { type: 'string', description: 'Optional display name when saving the absorbed StyleRecipe.' },
      }),
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (_args: unknown, value: unknown) => renderAbsorb(value as PptAbsorbResult),
      },
      execute: executors.absorb,
    },
    {
      name: 'ppt_create',
      description: 'Generate a standalone HTML slideshow, editable 16:9 PPTX and JSON project from prepared Markdown or structured slides. Supports 24 themes, 6 distinct master chrome skeletons, Scenario Auto-Director (theme: "auto"), 24+ native editable layouts & pro diagrams (KPI, Bento/pillar cards, comparison, 2x2 matrix, process/timeline/flywheel/chevron, gantt roadmaps, layered architecture, Harvey-ball matrices, concentric TAM/SAM/SOM, org/team charts, academic booktabs 3-line tables, chart-split, waterfall bridges), 20 industry blueprints, deep reference .pptx skeleton absorption (cloneStructure), and shared branding. 中文：先组织事实与内容，再生成可直接放映和继续编辑的三件套；内置 24 套大师主题、6 套差异化母版骨架、24+ 种原生可编辑版式与专业图示、20 套行业蓝图、13 类出版级图表与外部 PPTX 深度骨架吸收。',
      parameters: compileParameters({
        title: { type: 'string', required: true, description: 'Deck title (used for the cover and file names).' },
        content: { type: 'string', description: 'Markdown content: # cover title, ## slides, -/* bullets (supports **bold** lead-ins), | ... | tables, > quotes, > [!TAKEAWAY] bottom summary bar, ::: kpi|cards|comparison|process|matrix|callout|gantt|architecture|harvey|tam|org blocks, and <!-- 备注: ... --> speaker notes. Required unless slides or template is provided.' },
        theme: { type: 'string', description: 'Visual theme id: auto (default: Scenario Auto-Director picks optimal theme & chrome) or ' + ALLOWED_THEME_IDS.join(' / ') + '. See ppt_themes.' },
        taste: { type: 'string', description: 'Curated Aesthetic Taste Recipe ID (mckinsey-partner | apple-keynote-dark | apple-keynote-light | swiss-editorial | linear-craft | ft-data-journal | nature-academic | oriental-zen) or a workspace-absorbed custom recipe ID.' },
        persona: { type: 'string', enum: ['auto', 'consulting', 'tech-pitch', 'academic', 'gov-exec', 'education', 'editorial'], description: 'Optional scenario/audience persona for Auto-Art-Direction, layout rhythm promotion, and table/chart styling. Default auto.' },
        referencePptx: { type: 'string', description: 'Optional local reference .pptx path; absorbs its sanitized palette, CJK/Latin fonts, chrome skeleton, and master logo before applying explicit brand overrides.' },
        cloneStructure: { type: 'boolean', description: 'When referencePptx is provided, align generated slide archetypes and master chrome skeleton with the absorbed reference slideSkeleton[] where compatible (default false).' },
        smartLayout: { type: 'boolean', description: 'Enable or disable automatic multi-archetype Markdown layout promotion on >=4-section decks. Default true in async tool mode.' },
        lang: { type: 'string', description: 'UI language of the generated player: zh (default), en, or bilingual. Content language is whatever you write.' },
        motion: { type: 'string', enum: ['on', 'off'], description: 'Slide transitions plus bullet entrance animations: on (default) or off for a fully static deck.' },
        slides: { type: 'array', items: { type: 'object', properties: slideProperties, additionalProperties: true }, description: 'Structured slides across 24 native layouts & pro diagrams (cover, agenda, section, bullets, kpi, cards, comparison, matrix, process, callout, gantt, architecture, harvey, tam, org, statement, quote, table, chart, chart-split, waterfall, image, image-left, image-right, closing) with items[], columns[], takeaway, source, chrome, tableStyle (consulting|booktabs|minimal|banded|harvey), local images, and 13 chart kinds.' },
        template: { type: 'string', enum: templateIds, description: 'Industry blueprint from ppt_templates (16 blueprints). Provide finished content/slides following its outline; template alone creates an unfilled draft.' },
        brand: { type: 'object', properties: brandProperties, additionalProperties: false, description: 'Shared brand: #RRGGBB primary/background/text colors, fontFamily, logo, footer, and chromeStyle (' + ALLOWED_CHROME_STYLES.join('|') + '). Applied to HTML and PPTX.' },
        targetMinutes: { type: 'number', description: 'Optional target speaking duration in minutes for pace budgeting.' },
        dataModel: {type:'object',properties:{schemaVersion:{type:'integer',enum:[1]},sources:{type:'array',items:{type:'object',properties:sourceProperties,required:['id']}},metrics:{type:'array',items:{type:'object',properties:metricProperties,required:['id','kind']}}},additionalProperties:false,description:'Optional explicit lineage and what-if model. Use with structured slides containing {{metricId}} in text/items/takeaway/tables or an exact token as chart values. Source facts reference a real cell or text line; assumptions require value/min/max/step. Formulas compute derived metrics. HTML offers live sliders; PPTX includes confirmed static values, formulas and assumptions in speaker notes. Leave absent for ordinary finished decks.'},
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
      description: 'List all 20 industry scenario blueprints (weekly, defense, project, pitch, consulting, keynote, gov-report, workshop, architecture-review, financial-earnings, medical-case, postmortem, marketing-campaign, promotion-review, legal-compliance, creative-lookbook, quarterly-okr, product-prd, vc-daylight, industry-research) with recommended themes, chrome skeletons, and multi-archetype slide outlines. 中文：查看全部 20 套行业场景蓝图（含推荐主题、母版骨架与专业图示大纲），组织真实内容后再调用 ppt_create 交付成品。',
      parameters: compileParameters({ lang: { type: 'string', description: 'zh / en / bilingual, default zh.' } }),
      output: { schema: { type: 'object', additionalProperties: true }, render: (_args, value) => oneText(JSON.stringify(value, null, 2)) },
      execute: executors.templates,
    },
    {
      name: 'ppt_edit',
      description: 'Modify selected slides, switch visual theme, absorb a reference .pptx brand, or append/reorder/duplicate/remove pages in an existing dsh-ppt JSON project, preserving other pages and stable IDs. Regenerates the HTML/PPTX/JSON trio atomically and stores undo history. Use ppt_check first and expectedRevision. 中文：按页码或 ID 修改指定页、切换整套主题、吸收参考 PPTX 风格或增删重排页面，其他页不变，支持撤销。',
      parameters: compileParameters({ ...projectParameters,
        saveAs: { type: 'boolean', description: 'Save a new uniquely named trio, leaving the originals untouched. Rebuilds from JSON; does not import external Office edits. Required for legacy projects or externally changed outputs.' },
        edits: { type: 'array', items: { type: 'object', properties: { slide: { type: ['integer', 'string'], description: '1-based page number or stable slide ID' }, patch: { type: 'object', properties: slideProperties, additionalProperties: false } }, required: ['slide', 'patch'], additionalProperties: false } },
        order: { type: 'array', items: { type: 'string' }, description: 'Reorder pages using every stable slide ID exactly once. May be used alone or together with edits; one undo restores the previous content and order.' },
        duplicate: { type: 'array', items: { type: ['integer', 'string'] }, description: 'Copy selected existing slides immediately after their originals, including images/charts/notes. References are 1-based page numbers or stable IDs from before this edit. Copies get new IDs; undo restores the previous deck.' },
        remove: { type: 'array', items: { type: ['integer', 'string'] }, description: 'Remove selected slides by their original 1-based page number or stable ID. At least one page must remain. A slide cannot be copied and removed in the same edit.' },
        append: { type: 'array', items: { type: 'object', properties: slideProperties, additionalProperties: false }, description: 'Append 1–5 new structured slides at the end of the deck in one undoable operation.' },
        theme: { type: 'string', description: 'Optional built-in theme id (' + ALLOWED_THEME_IDS.join(' / ') + ') to restyle the entire project atomically (undoable).' },
        taste: {
          type: ['string', 'null'],
          description: 'Apply a Curated or Absorbed Taste Recipe ID (mckinsey-partner | apple-keynote-dark | apple-keynote-light | swiss-editorial | linear-craft | ft-data-journal | nature-academic | oriental-zen) to restyle covers, materiality, rhythm & charts atomically, or null to clear.',
        },
        referencePptx: { type: 'string', description: 'Optional local reference .pptx path to absorb sanitized palette/fonts/logo and chrome skeleton onto this project (undoable).' },
        brand: { type: ['object', 'null'], properties: brandProperties, additionalProperties: false, description: 'Merge shared branding. null clears all branding. Empty footer clears footer; logo:null clears logo.' },
        targetMinutes: { type: ['number', 'null'], description: 'Optional target speaking duration in minutes for pace budgeting (null clears).' },
      }),
      output: { schema: createResultSchema, render: (_args, value) => renderCreate(value as PptCreateResult) },
      execute: executors.edit,
    },
    {
      name:'ppt_data',
      description:'Preview or confirm source/assumption changes in a data-enabled project. Preview first; inspect affected slides and before/after values, then apply with confirmed:true, exact previewToken and expectedRevision. Default saves an undoable new copy. HTML remains interactive; PPTX is a confirmed static snapshot. Never invent provenance or silently treat assumptions as facts. 中文：预览来源更新或推演参数的影响，确认后保存可撤销副本；只允许更改声明的假设。',
      parameters:compileParameters({...projectParameters,
        action:{type:'string',enum:['preview','apply'],required:true},
        parameters:{type:'object',additionalProperties:true,description:'Declared input metric IDs to numeric values only.'},
        sourceUpdates:{type:'array',items:{type:'object',properties:sourceProperties,required:['id']},description:'Replacement content for existing source IDs; keep source type.'},
        scenario:{type:'object',additionalProperties:true,description:'Exact scenario.json from HTML: schemaVersion, deckId, revision, fingerprint, parameters. Rejects stale/foreign projects.'},
        previewToken:{type:'string'},confirmed:{type:'boolean'},saveAs:{type:'boolean',description:'Default true. false updates only when artifacts have not been externally modified.'},
      }),
      output:{schema:{type:'object',additionalProperties:true},render:(_args,value)=>oneText(JSON.stringify(value,null,2))},
      execute:executors.data,
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
      description: 'Read the final PPTX and render all pages to PNG, PDF, or both using the optional official @deepseek-ai/libreoffice-kit (0.2.3, bundled by DSH 0.2.2+, or 0.1.5). Returns unavailable plus installation guidance when neither version is present; ordinary deck creation remains usable. Retains original editable PPTX and creates a separate unique output folder and integrity receipt. Reports missing fonts. Inspect actual pages before delivery. 中文：把最终 PPTX 渲染为逐页图片和 PDF，报告缺失字体；需安装可选官方引擎（0.2.3，或 0.1.5），渲染成功仍需检查画面。',
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
    {
      name: 'ppt_import',
      description: 'Import an external .pptx file into an editable dsh-ppt project (HTML, modernized or source-themed PPTX, project JSON, and speaker handout), or sync Office-edited .pptx content back into an existing project with undo history. 中文：导入外部 .pptx 一键翻新生成可编辑 dsh-ppt 工程，或将 Office 修改稿导回既有工程更新（支持撤销）。',
      parameters: compileParameters({
        pptxPath: { type: 'string', required: true, description: 'Local .pptx file path, relative to session cwd or absolute.' },
        projectId: { type: 'string', description: 'Optional existing dsh-ppt project .json path, project folder, or workbench project ID. If provided, syncs Office-edited .pptx content back into that project with undo support; if omitted, creates a brand-new editable project.' },
        outputDir: { type: 'string', description: 'Directory to write newly imported project files into when projectId is omitted. Default: session working directory (or the plugin outputDir config).' },
        theme: { type: 'string', description: 'Target built-in theme id (or "auto", default "auto") when modernizing an imported .pptx.' },
        persona: { type: 'string', enum: ['auto', 'consulting', 'tech-pitch', 'academic', 'gov-exec', 'education', 'editorial'], description: 'Optional scenario/audience persona for Auto-Director refurbishment. Default auto.' },
        chromeStyle: { type: 'string', enum: ALLOWED_CHROME_STYLES, description: 'Optional master chrome skeleton override: ' + ALLOWED_CHROME_STYLES.join(' | ') + '.' },
        modernize: { type: 'boolean', description: 'Refurbish layouts, typography, and WCAG contrast into dsh-ppt archetypes (default true).' },
        preserveSourceTheme: { type: 'boolean', description: 'Preserve sanitized palette, fonts, and logo absorbed from the source .pptx instead of switching to a new theme (default false).' },
      }),
      output: {
        schema: createResultSchema,
        render: (_args: unknown, value: unknown) => renderCreate(value as PptCreateResult),
      },
      execute: executors.importPptx,
    },
    {
      name: 'ppt_from_office',
      description: 'Import an Excel workbook (.xlsx), CSV/TSV dataset, or Word document (.docx) directly into a polished, multi-slide dsh-ppt presentation (HTML, editable PPTX, and JSON project) using deterministic data-to-visual profiling (Sankey, Gantt, Marimekko, Waterfall, combo charts, tables, and structured narrative slides). 中文：直吞本地 .xlsx / .csv / .tsv / .docx 文档并智能拆分为高颜值多页演示文稿三件套。',
      parameters: compileParameters({
        filePath: { type: 'string', required: true, description: 'Local .xlsx, .csv, .tsv, or .docx file path, relative to session cwd or absolute.' },
        outputDir: { type: 'string', description: 'Directory to write the generated files into. Default: session working directory (or the plugin outputDir config).' },
        fileName: { type: 'string', description: 'Base file name for the three artifacts. Default: derived from source file or title.' },
        theme: { type: 'string', description: 'Target built-in theme id (or "auto", default "auto").' },
        persona: { type: 'string', enum: ['auto', 'consulting', 'tech-pitch', 'academic', 'gov-exec', 'education', 'editorial'], description: 'Optional scenario/audience persona for Auto-Director choreography. Default auto.' },
        chromeStyle: { type: 'string', enum: ALLOWED_CHROME_STYLES, description: 'Optional master chrome skeleton override: ' + ALLOWED_CHROME_STYLES.join(' | ') + '.' },
        targetMinutes: { type: 'number', description: 'Optional target speaking duration in minutes for pace budgeting.' },
        lang: { type: 'string', description: 'UI language: zh (default), en, or bilingual.' },
        overwrite: { type: 'boolean', description: 'Replace existing same-name output files. Default false.' },
      }),
      output: {
        schema: createResultSchema,
        render: (_args: unknown, value: unknown) => renderCreate(value as PptCreateResult),
      },
      execute: executors.fromOffice,
    },
    {
      name: 'ppt_cite',
      description: 'Attach verified academic citations from a dsh-cite library (.json/.jsonl), BibTeX (.bib) file, or inline BibTeX/DOIs to a dsh-ppt project. Resolves [@citeKey] and [doi:...] markers into slide.source footers and appends or updates a formatted References slide without inventing metadata. 中文：对接 dsh-cite 文献库或 BibTeX/DOI，自动将 [@citeKey] / [doi:...] 解析写入页脚并生成或更新标准参考文献页。',
      parameters: compileParameters({
        deckPath: { type: 'string', required: true, description: 'Path to a dsh-ppt .json project, relative to session cwd or absolute.' },
        citePath: { type: 'string', description: 'Optional path to dsh-cite library.json, .jsonl, or .bib file. Auto-discovers workspace or ~/.dsh/data/dsh-cite/library.json if omitted.' },
        bibtex: { type: 'string', description: 'Optional inline BibTeX entries.' },
        dois: { type: 'array', items: { type: 'string' }, description: 'Optional verified DOI strings to resolve and cite.' },
        citeKeys: { type: 'array', items: { type: 'string' }, description: 'Optional explicit citeKeys or DOIs to attach as citations.' },
        style: { type: 'string', enum: ['gb-t-7714', 'apa', 'mla', 'chicago'], description: 'Bibliography formatting style: gb-t-7714 (default), apa, mla, or chicago.' },
        appendReferences: { type: 'boolean', description: 'Append or update a References slide (default true).' },
        expectedRevision: { type: 'integer', description: 'Use revision returned by ppt_create/ppt_check to prevent overwriting another edit.' },
        saveAs: { type: 'boolean', description: 'Save a new uniquely named copy instead of updating in place.' },
      }),
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (_args: unknown, value: unknown) => renderCite(value as PptCiteResult),
      },
      execute: executors.cite,
    },
    {
      name: 'ppt_remotion',
      description: 'Export a dsh-ppt project into a ready-to-render Remotion (dsh-remotion) animated video storyboard package (remotion-storyboard.json, src/DeckVideo.tsx, src/slides-data.json, src/index.ts, package.json, README.md) with 30fps pace-budgeted durations, spring entrances, KPI count-up, progressive bars, and synchronized speaker-note captions. 中文：将演示文稿导出为可直接渲染的 Remotion 视频分镜工程包（含 30fps 时长预算、KPI 数字递增、进度条生长动画与同步字幕）。',
      parameters: compileParameters({
        deckPath: { type: 'string', required: true, description: 'Path to a dsh-ppt .json project, relative to session cwd or absolute.' },
        outputDir: { type: 'string', description: 'Directory to write the Remotion package into. Default: <deck>-remotion next to deckPath.' },
        format: { type: 'string', enum: ['landscape', 'portrait', 'square'], description: 'Video aspect ratio: landscape (1920x1080, default), portrait (1080x1920), or square (1080x1080).' },
        fps: { type: 'integer', description: 'Frames per second (24, 30, or 60; default 30).' },
        overwrite: { type: 'boolean', description: 'Overwrite existing files in outputDir (default false).' },
      }),
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (_args: unknown, value: unknown) => renderRemotion(value as PptRemotionResult),
      },
      execute: executors.remotion,
    },
  ]
}

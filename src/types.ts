/** dsh-ppt 的公共类型。 */

export type PptThemeId =
  | 'swiss'
  | 'velvet'
  | 'data'
  | 'soft'
  | 'bold'
  | 'consulting'
  | 'cobalt-cream'
  | 'exec-jilan'
  | 'exec-palace'
  | 'academic'
  | 'editorial-forest'
  | 'cartesian'
  | 'course-sage'
  | 'linear-dark'
  | 'keynote-light'
  | 'financial-ft'
  | 'medical-clean'
  | 'luxury-noir'
  | 'bcg-emerald'
  | 'economist-brief'
  | 'venture-daylight'
  | 'stripe-craft'
  | 'aurora-stage'
  | 'obsidian-amber'

export type PptChromeStyle =
  | 'consulting-classic'
  | 'keynote-spatial'
  | 'editorial-folio'
  | 'saas-bento'
  | 'academic-minimal'
  | 'gov-ceremonial'

export type PptCardMaterial = 'solid' | 'frameless' | 'glass' | 'editorial-rule'
export type PptIconMode = 'off' | 'explicit' | 'auto'
export type PptTasteRecipeId =
  | 'mckinsey-partner'
  | 'apple-keynote-dark'
  | 'apple-keynote-light'
  | 'swiss-editorial'
  | 'linear-craft'
  | 'ft-data-journal'
  | 'nature-academic'
  | 'oriental-zen'

export interface PptTasteRecipe {
  id: string
  name: string
  enName?: string
  school?: string
  description?: string
  enDescription?: string
  theme?: string
  chromeStyle?: PptChromeStyle | string
  tableStyle?: PptTableStyle | string
  cardMaterial: PptCardMaterial
  coverVariant: string
  sectionVariant?: string
  kpiVariant?: string
  cardsVariant?: string
  iconMode?: PptIconMode
  iconBadgeStyle?: 'soft' | 'ring' | 'bare' | 'solid'
  chartSpotlight?: boolean
  chartGrowthCallout?: boolean
  density?: 'airy' | 'balanced' | 'compact'
  typeScaleRatio?: number
  whitespaceRatio?: number
  rhythmScore?: number
  brand?: PptBrand
  swatches?: string[]
  builtin?: boolean
  sourceFile?: string
  absorbedAt?: string
}

export type PptPersonaId = 'auto' | 'consulting' | 'tech-pitch' | 'academic' | 'gov-exec' | 'education' | 'editorial'
export type PptLanguage = 'zh' | 'en' | 'bilingual'
export type PptSlideLayout =
  | 'cover'
  | 'agenda'
  | 'section'
  | 'bullets'
  | 'statement'
  | 'quote'
  | 'kpi'
  | 'cards'
  | 'comparison'
  | 'matrix'
  | 'process'
  | 'callout'
  | 'gantt'
  | 'architecture'
  | 'harvey'
  | 'tam'
  | 'org'
  | 'marimekko'
  | 'sankey'
  | 'swot'
  | 'table'
  | 'closing'
  | 'image'
  | 'image-left'
  | 'image-right'
  | 'chart'
  | 'chart-split'
  | 'gallery'
  | 'waterfall'
  | 'flywheel'
  | 'bento'
  | 'pillars'
  | 'exec-summary'
  | 'timeline'
  | 'steps'
  | 'layers'
  | 'funnel'
  | 'chevron'
  | 'value-chain'
  | 'issue-action'
  | 'before-after'
  | 'matrix-2x2'
  | 'kpi-grid'
  | 'scorecard'
  | 'formula-callout'
  | 'takeaways'
  | 'gallery-grid'
  | 'ablation-compare'
  | 'roadmap'
  | 'swimlane'
  | 'team'
  | 'mermaid'
  | 'flowchart'
  | 'sequence'

export type PptTemplateId =
  | 'weekly'
  | 'defense'
  | 'project'
  | 'pitch'
  | 'consulting'
  | 'keynote'
  | 'gov-report'
  | 'workshop'
  | 'architecture-review'
  | 'financial-earnings'
  | 'medical-case'
  | 'postmortem'
  | 'marketing-campaign'
  | 'promotion-review'
  | 'legal-compliance'
  | 'creative-lookbook'
  | 'quarterly-okr'
  | 'product-prd'
  | 'vc-daylight'
  | 'industry-research'
export type PptTableStyle = 'consulting' | 'booktabs' | 'minimal' | 'banded' | 'harvey'
export interface PptImageSpec { src?: string; assetId?: string; alt?: string; fit?: 'contain' | 'cover'; caption?: string }
export interface PptSlideItem {
  tag?: string
  badge?: string
  title?: string
  text?: string
  body?: string
  bullets?: string[]
  value?: string | number
  unit?: string
  delta?: string
  start?: number
  span?: number
  milestone?: boolean
  role?: string
  conversion?: string
  icon?: string
  status?: 'positive' | 'negative' | 'warning' | 'neutral' | 'accent'
  tone?: 'positive' | 'negative' | 'warning' | 'neutral' | 'accent'
}
export interface PptChartSpec {
  kind?:
    | 'column'
    | 'bar'
    | 'stacked-column'
    | 'stacked-bar'
    | 'percent-column'
    | 'percent-bar'
    | 'line'
    | 'area'
    | 'pie'
    | 'doughnut'
    | 'scatter'
    | 'combo'
    | 'waterfall'
  categories?: Array<string | number>
  series?: Array<{ name: string; values: Array<string | number>; chartKind?: 'column' | 'line' | 'area'; secondaryAxis?: boolean }>
  rows?: Array<Array<string | number>>
  unit?: string
  caption?: string
  source?: string
  highlight?: number | number[] | 'max' | 'last' | 'none'
  spotlight?: boolean
  showGrowthCallout?: boolean
  referenceLine?: { value: number; label?: string; color?: string }
  callout?: { label: string; fromIndex?: number; toIndex?: number }
  showValues?: boolean
  totalIndices?: number[]
}
export interface PptBrand {
  name?: string
  primaryColor?: string
  secondaryColor?: string
  backgroundColor?: string
  textColor?: string
  fontFamily?: string
  headingFont?: string
  coverMode?: 'standard' | 'inverted-accent'
  coverBg?: string
  logo?: string | null
  footer?: string
  chromeStyle?: PptChromeStyle | string | null
  cardMaterial?: PptCardMaterial | null
  iconMode?: PptIconMode | null
  taste?: PptTasteRecipeId | string | null
  tasteRecipe?: PptTasteRecipe | null
}
export interface PptQualityIssue { slide: number; slideId?: string; severity: 'warning' | 'error'; code: string; message: string; suggestion: string }
export interface PptQualityResult { ok: boolean; slideCount: number; errorCount: number; warningCount: number; issues: PptQualityIssue[]; note: string }
export interface PptVerification { static: 'checked'; pptxRender: 'not-verified' | 'rendered'; visual: 'not-verified' }
export interface PptRenderArgs { pptxPath: string; outputDir?: string; format?: 'png' | 'pdf' | 'both'; width?: number; timeoutMs?: number }
export interface PptRenderResult { ok: boolean; status: 'unavailable' | 'not-verified' | 'rendered'; backend?: string; rendererVersion?: string; sourceSha256?: string; outputDir?: string; reason?: string; slideCount?: number; pngPaths?: string[]; pdfPath?: string; receiptPath?: string; missingFonts?: string[]; message?: string; installationHint?: string; visual?: 'not-verified' }
export interface PptCheckResult extends PptQualityResult { verification: PptVerification; render?: PptRenderResult }
export interface PptEditArgs {
  deckPath: string
  edits?: Array<{ slide: number | string; patch: Partial<Omit<PptSlideSpec, 'id'>> }>
  order?: string[]
  duplicate?: Array<number | string>
  remove?: Array<number | string>
  append?: PptSlideSpec[]
  theme?: string
  taste?: PptTasteRecipeId | string | PptTasteRecipe | null
  referencePptx?: string
  brand?: PptBrand | null
  targetMinutes?: number | null
  expectedRevision?: number
  saveAs?: boolean
}
export interface PptProjectArgs { deckPath: string; expectedRevision?: number }
export interface PptDataSource { id: string; name?: string; format?: 'csv' | 'tsv' | 'text'; path?: string; content?: string; kind?: 'table' | 'text'; rows?: Array<Array<string | number>>; text?: string }
export interface PptDataMetric { id: string; label?: string; kind: 'source' | 'input' | 'formula'; source?: { sourceId: string; cell?: string; line?: number; numberIndex?: number }; value?: number; min?: number; max?: number; step?: number; note?: string; formula?: string; format?: { style?: 'number' | 'percent'; digits?: number; unit?: string } }
export interface PptDataModel { schemaVersion?: 1; sources: PptDataSource[]; metrics: PptDataMetric[] }

export interface PptSlideSpec {
  id?: string
  layout?: PptSlideLayout
  variant?: string
  chrome?: PptChromeStyle | string
  cardMaterial?: PptCardMaterial
  iconMode?: PptIconMode
  title?: string
  subtitle?: string
  kicker?: string
  takeaway?: string
  source?: string
  text?: string
  formula?: string
  mermaid?: string
  bullets?: string[]
  items?: PptSlideItem[]
  cards?: PptSlideItem[]
  metrics?: PptSlideItem[]
  columns?: Array<string | PptSlideItem>
  steps?: PptSlideItem[]
  quadrants?: PptSlideItem[]
  start?: number
  span?: number
  activeIndex?: number
  tableStyle?: PptTableStyle
  /** 表格页或哈维球矩阵数据；第一行作为表头。 */
  rows?: Array<Array<string | number>>
  /** 演讲者备注；写入 HTML 备注面板与 PPTX 原生备注页。 */
  notes?: string
  image?: PptImageSpec | string | null
  images?: Array<PptImageSpec | string>
  chart?: PptChartSpec | null
  /** Optional bounded native font sizes (in points) and layout polish settings. */
  visual?: { titleSize?: number; bodySize?: number; chartLabelSize?: number; density?: 'compact' | 'balanced' | 'airy'; tableStyle?: PptTableStyle; chrome?: PptChromeStyle | string }
}

export interface PptConfig {
  /** 默认输出目录；调用 ppt_create 时可用 outputDir 覆盖。相对路径按会话工作目录解析。 */
  outputDir?: string
  /** 单次生成幻灯片上限，默认 60（3–120）。 */
  maxSlides?: number
  /** 默认视觉主题 id（支持 auto 或 18 套内置主题），调用 ppt_create 时可用 theme 覆盖。 */
  defaultTheme?: string
  /** 默认播放器界面语言，调用 ppt_create 时可用 lang 覆盖。 */
  defaultLang?: string
}

export interface PptCreateArgs {
  title: string
  /** Markdown 正文：一句话、一段文字或整篇文档（与 slides 二选一，推荐）。 */
  content?: string
  /** 结构化幻灯片（高级用法，与 content 二选一）。 */
  slides?: PptSlideSpec[]
  theme?: string
  taste?: PptTasteRecipeId | string | PptTasteRecipe
  persona?: PptPersonaId | string
  referencePptx?: string
  cloneStructure?: boolean
  smartLayout?: boolean
  lang?: string
  /** 页间转场与要点入场动画：on（默认）/ off。 */
  motion?: 'on' | 'off'
  outputDir?: string
  fileName?: string
  /** 是否覆盖同名三件套；默认 false，同名时自动选择唯一后缀。 */
  overwrite?: boolean
  template?: PptTemplateId | string
  brand?: PptBrand
  /** Optional target speaking duration in minutes for pace budgeting. */
  targetMinutes?: number
  /** Optional explicit source facts, assumptions and safe arithmetic; bind slides with {{metricId}}. */
  dataModel?: PptDataModel
}

export interface PptThemeInfo {
  id: string
  name: string
  mood: string
  bestFor: string
  dark: boolean
  palette: Record<string, string>
  fonts: Record<string, string>
  tokens?: Record<string, unknown>
  persona?: string
  chromeStyle?: PptChromeStyle | string
}

export interface PptThemePreviewResult {
  ok: boolean
  outputDir: string
  htmlPath: string
  svgs: Array<{ id: string; path: string }>
  themeCount: number
  language: string
}

export interface PptThemesResult {
  ok: boolean
  themes: PptThemeInfo[]
  tasteRecipes?: PptTasteRecipe[]
  /** 传 preview: true 时返回：主题对比页 + 每套主题的 SVG 色板卡。 */
  preview?: PptThemePreviewResult
}

export interface PptAbsorbArgs {
  pptxPath?: string
  bytes?: Uint8Array | Buffer
  cwd?: string
  extractLogo?: boolean
  saveTasteAs?: string
  tasteName?: string
  signal?: AbortSignal
}

export interface PptAbsorbSkeleton {
  cornerStyle?: string
  hasTopBanner?: boolean
  hasSideSpine?: boolean
  masterShapeCount?: number
  [key: string]: unknown
}

export interface PptAbsorbSlideSkeleton {
  slideNumber: number
  inferredLayout: string
  variant?: string
  titleSample?: string
}

export interface PptAbsorbResult {
  ok: boolean
  pptxPath?: string
  slideCount: number
  slideSize?: { width: number; height: number; aspect?: string }
  dark?: boolean
  warnings?: string[]
  extractedPalette?: Record<string, string>
  extractedFonts?: Record<string, string>
  extractedSkeleton?: PptAbsorbSkeleton
  sanitizedBrand: PptBrand
  sanitizedTokens: Record<string, unknown>
  recommendedTheme: string
  recommendedChrome?: PptChromeStyle | string
  recommendedTableStyle?: PptTableStyle | string
  narrativeProfile?: Record<string, unknown>
  styleRecipe?: PptTasteRecipe
  savedTastePath?: string
  slideSkeleton?: PptAbsorbSlideSkeleton[]
  layoutSummary?: Record<string, unknown>
}

export interface PptImportArgs {
  pptxPath: string
  projectId?: string
  outputDir?: string
  theme?: string
  persona?: PptPersonaId | string
  chromeStyle?: PptChromeStyle | string
  modernize?: boolean
  preserveSourceTheme?: boolean
}

export interface PptFromOfficeArgs {
  filePath: string
  outputDir?: string
  fileName?: string
  theme?: string
  persona?: PptPersonaId | string
  chromeStyle?: PptChromeStyle | string
  targetMinutes?: number
  lang?: string
  overwrite?: boolean
}

export type PptCitationStyle = 'gb-t-7714' | 'apa' | 'mla' | 'chicago'

export interface PptCiteArgs {
  deckPath: string
  citePath?: string
  bibtex?: string
  dois?: string[]
  citeKeys?: string[]
  style?: PptCitationStyle
  appendReferences?: boolean
  expectedRevision?: number
  saveAs?: boolean
}

export interface PptCiteResult {
  ok: boolean
  matchedCount: number
  citedKeys: string[]
  missingKeys: string[]
  sourcePath?: string
  referencesSlideIndex?: number
  deck?: PptCreateResult
}

export interface PptRemotionArgs {
  deckPath: string
  outputDir?: string
  format?: 'landscape' | 'portrait' | 'square'
  fps?: number
  overwrite?: boolean
}

export interface PptRemotionResult {
  ok: boolean
  outputDir: string
  storyboardPath: string
  files: string[]
  fps: number
  totalFrames: number
  totalSeconds: number
  slideCount: number
}

export interface PptCreateResult {
  ok: boolean
  title: string
  theme: string
  language: string
  slideCount: number
  outputDir: string
  files: { html: string; pptx: string; json: string; handout?: string }
  htmlPath: string
  pptxPath: string
  jsonPath: string
  handoutPath?: string
  deckId?: string
  revision?: number
  undoAvailable?: number
  deliveryStatus?: 'draft' | 'ready-for-review'
  importedFrom?: string
  syncedProject?: boolean
  quality?: PptQualityResult
  verification?: PptVerification
}

/** Shared generator and optional renderer exposed to the plugin. */
export interface DeckEngine {
  absorbPptx(options: Record<string, unknown>): Promise<PptAbsorbResult>
  importPptxDeck(options: Record<string, unknown>): Promise<PptCreateResult>
  importOfficeDeck?(options: Record<string, unknown>): Promise<PptCreateResult>
  repairDeckVisual(options: Record<string, unknown>): Promise<PptCreateResult>
  readRenderReceipt(pptxPath: string, receiptPath: string): PptRenderResult
  previewDeckData(options: Record<string, unknown>): Record<string, any>
  updateDeckData(options: Record<string, unknown>): Promise<PptCreateResult>
  dataReport(manifest: any): string
  dataNotes(manifest: any, slide: any): string
  renderHandoutMarkdown?(manifest: any, lang?: string): string
  renderOnePagerHtml?(manifest: any, lang?: string): string
  computePaceBudget?(manifest: any, targetMinutes?: number): Record<string, any>
  buildDeckAsync?(options: Record<string, unknown>): Promise<PptCreateResult>
  listTemplates(lang?: string): unknown[]
  editDeck(options: Record<string, unknown>): Promise<PptCreateResult>
  undoDeck(options: Record<string, unknown>): Promise<PptCreateResult>
  checkDeck(options: Record<string, unknown>): PptQualityResult
  checkDeckAsync?(options: Record<string, unknown>): Promise<PptCheckResult>
  renderDeck(options: Record<string, unknown>): Promise<PptRenderResult>
  buildDeck(options: Record<string, unknown>): PptCreateResult
  buildThemePreview(options: Record<string, unknown>): PptThemePreviewResult
  listThemes(lang?: string): PptThemeInfo[]
  listMasterPresets?(lang?: string): unknown[]
  listAllTasteRecipes?(cwd?: string): PptTasteRecipe[]
  saveWorkspaceTasteRecipe?(recipe: PptTasteRecipe, cwd?: string): { path: string; recipe: PptTasteRecipe; totalSaved: number }
  resolveTheme(input: unknown): Record<string, unknown>
  resolveLanguage(input: unknown): Record<string, unknown>
}

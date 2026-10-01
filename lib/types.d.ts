/** dsh-ppt 的公共类型。 */
export type PptThemeId = 'swiss' | 'velvet' | 'data' | 'soft' | 'bold';
export type PptLanguage = 'zh' | 'en' | 'bilingual';
export type PptSlideLayout = 'cover' | 'section' | 'bullets' | 'statement' | 'quote' | 'table' | 'closing' | 'image' | 'image-left' | 'image-right' | 'chart';
export type PptTemplateId = 'weekly' | 'defense' | 'project' | 'pitch';
export interface PptImageSpec {
    src?: string;
    assetId?: string;
    alt?: string;
    fit?: 'contain' | 'cover';
    caption?: string;
}
export interface PptChartSpec {
    kind?: 'column' | 'bar' | 'line' | 'pie';
    categories?: Array<string | number>;
    series?: Array<{
        name: string;
        values: Array<string | number>;
    }>;
    rows?: Array<Array<string | number>>;
    unit?: string;
    caption?: string;
}
export interface PptBrand {
    name?: string;
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    logo?: string | null;
    footer?: string;
}
export interface PptQualityIssue {
    slide: number;
    slideId?: string;
    severity: 'warning' | 'error';
    code: string;
    message: string;
    suggestion: string;
}
export interface PptQualityResult {
    ok: boolean;
    slideCount: number;
    errorCount: number;
    warningCount: number;
    issues: PptQualityIssue[];
    note: string;
}
export interface PptVerification {
    static: 'checked';
    pptxRender: 'not-verified' | 'rendered';
    visual: 'not-verified';
}
export interface PptRenderArgs {
    pptxPath: string;
    outputDir?: string;
    format?: 'png' | 'pdf' | 'both';
    width?: number;
    timeoutMs?: number;
}
export interface PptRenderResult {
    ok: boolean;
    status: 'unavailable' | 'not-verified' | 'rendered';
    backend?: string;
    rendererVersion?: string;
    sourceSha256?: string;
    outputDir?: string;
    reason?: string;
    slideCount?: number;
    pngPaths?: string[];
    pdfPath?: string;
    receiptPath?: string;
    missingFonts?: string[];
    message?: string;
    installationHint?: string;
    visual?: 'not-verified';
}
export interface PptCheckResult extends PptQualityResult {
    verification: PptVerification;
    render?: PptRenderResult;
}
export interface PptEditArgs {
    deckPath: string;
    edits?: Array<{
        slide: number | string;
        patch: Partial<Omit<PptSlideSpec, 'id'>>;
    }>;
    brand?: PptBrand | null;
    expectedRevision?: number;
}
export interface PptProjectArgs {
    deckPath: string;
    expectedRevision?: number;
}
export interface PptSlideSpec {
    id?: string;
    layout?: PptSlideLayout;
    title?: string;
    subtitle?: string;
    kicker?: string;
    text?: string;
    bullets?: string[];
    /** 表格页数据；第一行作为表头。 */
    rows?: Array<Array<string | number>>;
    /** 演讲者备注；写入 HTML 备注面板与 PPTX 原生备注页。 */
    notes?: string;
    image?: PptImageSpec | string | null;
    chart?: PptChartSpec | null;
}
export interface PptConfig {
    /** 默认输出目录；调用 ppt_create 时可用 outputDir 覆盖。相对路径按会话工作目录解析。 */
    outputDir?: string;
    /** 单次生成幻灯片上限，默认 60（3–120）。 */
    maxSlides?: number;
    /** 默认视觉主题 id，调用 ppt_create 时可用 theme 覆盖。 */
    defaultTheme?: string;
    /** 默认播放器界面语言，调用 ppt_create 时可用 lang 覆盖。 */
    defaultLang?: string;
}
export interface PptCreateArgs {
    title: string;
    /** Markdown 正文：一句话、一段文字或整篇文档（与 slides 二选一，推荐）。 */
    content?: string;
    /** 结构化幻灯片（高级用法，与 content 二选一）。 */
    slides?: PptSlideSpec[];
    theme?: string;
    lang?: string;
    /** 页间转场与要点入场动画：on（默认）/ off。 */
    motion?: 'on' | 'off';
    outputDir?: string;
    fileName?: string;
    /** 是否覆盖同名三件套；默认 false，同名时自动选择唯一后缀。 */
    overwrite?: boolean;
    template?: PptTemplateId;
    brand?: PptBrand;
}
export interface PptThemeInfo {
    id: string;
    name: string;
    mood: string;
    bestFor: string;
    dark: boolean;
    palette: Record<string, string>;
    fonts: Record<string, string>;
}
export interface PptThemePreviewResult {
    ok: boolean;
    outputDir: string;
    htmlPath: string;
    svgs: Array<{
        id: string;
        path: string;
    }>;
    themeCount: number;
    language: string;
}
export interface PptThemesResult {
    ok: boolean;
    themes: PptThemeInfo[];
    /** 传 preview: true 时返回：主题对比页 + 每套主题的 SVG 色板卡。 */
    preview?: PptThemePreviewResult;
}
export interface PptCreateResult {
    ok: boolean;
    title: string;
    theme: string;
    language: string;
    slideCount: number;
    outputDir: string;
    files: {
        html: string;
        pptx: string;
        json: string;
    };
    htmlPath: string;
    pptxPath: string;
    jsonPath: string;
    deckId?: string;
    revision?: number;
    undoAvailable?: number;
    deliveryStatus?: 'draft' | 'ready-for-review';
    quality?: PptQualityResult;
    verification?: PptVerification;
}
/** Shared generator and optional renderer exposed to the plugin. */
export interface DeckEngine {
    buildDeckAsync?(options: Record<string, unknown>): Promise<PptCreateResult>;
    listTemplates(lang?: string): unknown[];
    editDeck(options: Record<string, unknown>): Promise<PptCreateResult>;
    undoDeck(options: Record<string, unknown>): Promise<PptCreateResult>;
    checkDeck(options: Record<string, unknown>): PptQualityResult;
    checkDeckAsync?(options: Record<string, unknown>): Promise<PptCheckResult>;
    renderDeck(options: Record<string, unknown>): Promise<PptRenderResult>;
    buildDeck(options: Record<string, unknown>): PptCreateResult;
    buildThemePreview(options: Record<string, unknown>): PptThemePreviewResult;
    listThemes(lang?: string): PptThemeInfo[];
    resolveTheme(input: unknown): Record<string, unknown>;
    resolveLanguage(input: unknown): Record<string, unknown>;
}

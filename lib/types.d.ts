/** dsh-ppt 的公共类型。 */
export type PptThemeId = 'swiss' | 'velvet' | 'data' | 'soft' | 'bold';
export type PptLanguage = 'zh' | 'en' | 'bilingual';
export type PptSlideLayout = 'cover' | 'section' | 'bullets' | 'statement' | 'quote' | 'table' | 'closing';
export interface PptSlideSpec {
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
export interface PptThemesResult {
    ok: boolean;
    themes: PptThemeInfo[];
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
}
/** deck-core.mjs 暴露给插件的最小面。 */
export interface DeckEngine {
    buildDeck(options: Record<string, unknown>): PptCreateResult;
    listThemes(lang?: string): PptThemeInfo[];
    resolveTheme(input: unknown): Record<string, unknown>;
    resolveLanguage(input: unknown): Record<string, unknown>;
}

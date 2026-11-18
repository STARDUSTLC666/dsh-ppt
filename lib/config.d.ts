import type { PptConfig } from './types.js';
export declare const PPT_OUTPUT_DIR_ENV = "DSH_PPT_OUTPUT_DIR";
export declare const DEFAULT_MAX_SLIDES = 60;
export declare const ALLOWED_THEME_IDS: readonly ["swiss", "velvet", "data", "soft", "bold", "consulting", "cobalt-cream", "exec-jilan", "exec-palace", "academic", "editorial-forest", "cartesian", "course-sage", "linear-dark", "keynote-light", "financial-ft", "medical-clean", "luxury-noir", "bcg-emerald", "economist-brief", "venture-daylight", "stripe-craft", "aurora-stage", "obsidian-amber"];
export declare const ALLOWED_CHROME_STYLES: readonly ["consulting-classic", "keynote-spatial", "editorial-folio", "saas-bento", "academic-minimal", "gov-ceremonial"];
export interface ResolvedPptConfig {
    outputDir: string;
    maxSlides: number;
    defaultTheme: string;
    defaultLang: string;
}
/** 解析并校验插件行配置。本插件无必填项，空配置永远可用。 */
export declare function resolvePptConfig(config: PptConfig | undefined | null): ResolvedPptConfig;
export declare function clampInt(value: unknown, fallback: number, min: number, max: number): number;

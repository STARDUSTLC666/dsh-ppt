export const PPT_OUTPUT_DIR_ENV = 'DSH_PPT_OUTPUT_DIR';
export const DEFAULT_MAX_SLIDES = 60;
/** 解析并校验插件行配置。本插件无必填项，空配置永远可用。 */
export function resolvePptConfig(config) {
    const raw = config ?? {};
    const outputDir = (typeof raw.outputDir === 'string' ? raw.outputDir : '').trim()
        || (process.env[PPT_OUTPUT_DIR_ENV] ?? '').trim();
    const defaultTheme = (typeof raw.defaultTheme === 'string' ? raw.defaultTheme : '').trim();
    const defaultLang = (typeof raw.defaultLang === 'string' ? raw.defaultLang : '').trim();
    if (defaultLang !== '' && defaultLang !== 'zh' && defaultLang !== 'en' && defaultLang !== 'bilingual') {
        throw new Error('defaultLang 只支持 zh / en / bilingual。');
    }
    return {
        outputDir,
        maxSlides: clampInt(raw.maxSlides, DEFAULT_MAX_SLIDES, 3, 120),
        defaultTheme,
        defaultLang,
    };
}
export function clampInt(value, fallback, min, max) {
    const n = typeof value === 'number' ? Math.trunc(value) : fallback;
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, n));
}

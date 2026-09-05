import { createPptExecutors } from './execution.js';
function compileParameters(spec) {
    const properties = {};
    const required = [];
    for (const [key, prop] of Object.entries(spec)) {
        if (prop?.required === true)
            required.push(key);
        const node = {};
        if (typeof prop?.type === 'string')
            node.type = prop.type;
        if (typeof prop?.description === 'string')
            node.description = prop.description;
        if (Array.isArray(prop?.enum))
            node.enum = prop.enum;
        if (prop?.type === 'array' && prop.items !== null && typeof prop.items === 'object') {
            node.items = {
                type: prop.items.type === 'object' ? 'object' : 'string',
                ...(prop.items.type === 'object' ? { additionalProperties: true } : {}),
            };
        }
        properties[key] = node;
    }
    return { type: 'object', properties, ...(required.length > 0 ? { required } : {}) };
}
const themeInfoSchema = {
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
};
const themesResultSchema = {
    type: 'object',
    properties: {
        ok: { type: 'boolean' },
        themes: { type: 'array', items: themeInfoSchema },
    },
    additionalProperties: true,
};
const createResultSchema = {
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
};
function oneText(text) {
    return [{ type: 'text', text }];
}
function renderThemes(value) {
    if (value.themes.length === 0)
        return oneText('dsh-ppt 没有可用主题。');
    const lines = value.themes.map((theme) => '- ' + theme.id + '：' + theme.name + '（' + theme.mood + '）｜适合：' + theme.bestFor + '｜' + (theme.dark ? '深色' : '浅色'));
    return oneText('dsh-ppt 内置主题：\n\n' + lines.join('\n') + '\n\nppt_create 的 theme 参数填其中的 id（默认 data）。');
}
function renderCreate(value) {
    return oneText('dsh-ppt 已生成 ' + value.slideCount + ' 页演示文稿（主题 ' + value.theme + '，语言 ' + value.language + '）：\n' +
        'HTML 网页放映：' + value.htmlPath + '\n' +
        'PPTX 导出：' + value.pptxPath + '\n' +
        'Manifest：' + value.jsonPath + '\n' +
        'HTML 双击即可放映（方向键翻页 / F 全屏 / G 总览 / P 打印）；PPTX 可用 PowerPoint / WPS / Keynote 打开。');
}
/** Assemble presentation schemas, rendering and the session-aware executors. */
export function buildPptTools(config) {
    const executors = createPptExecutors(config);
    return [
        {
            name: 'ppt_themes',
            description: 'List the built-in visual themes of dsh-ppt (id, name, mood, best-for, light/dark palette) before building a deck. Use a theme id as the theme argument of ppt_create. 中文：列出 dsh-ppt 内置视觉主题（id、名称、情绪、适用场景、明暗色板），用于选择 ppt_create 的 theme 参数。',
            parameters: compileParameters({
                lang: { type: 'string', description: 'Theme description language: zh (default), en, or bilingual.' },
            }),
            output: {
                schema: themesResultSchema,
                render: (_args, value) => renderThemes(value),
            },
            execute: executors.themes,
        },
        {
            name: 'ppt_create',
            description: 'Build a complete presentation deck from one sentence or a Markdown document and write three artifacts to outputDir: a standalone HTML web slideshow, an editable 16:9 PPTX, and a deck.json manifest. Five built-in visual themes are available (see ppt_themes). content is Markdown text (recommended); advanced callers may pass structured slides instead. 中文：把一句话或一篇 Markdown 文档生成完整演示文稿，写入 outputDir 三个文件：独立 HTML 网页放映、可编辑 16:9 PPTX、deck.json manifest；内置 5 套视觉主题。',
            parameters: compileParameters({
                title: { type: 'string', required: true, description: 'Deck title (used for the cover and file names).' },
                content: { type: 'string', description: 'Markdown content: one sentence, a paragraph, or a full document. First # heading becomes the cover title; ## headings become slides; -/* lists become bullets; | ... | tables become table slides; > blockquotes become quote slides; <!-- 备注: ... --> comments become speaker notes. Required unless slides is provided.' },
                theme: { type: 'string', description: 'Visual theme id: swiss / velvet / data / soft / bold. Default data. See ppt_themes.' },
                lang: { type: 'string', description: 'UI language of the generated player: zh (default), en, or bilingual. Content language is whatever you write.' },
                motion: { type: 'string', enum: ['on', 'off'], description: 'Slide transitions plus bullet entrance animations: on (default) or off for a fully static deck.' },
                slides: { type: 'array', items: { type: 'object', additionalProperties: true }, description: 'Optional structured slides: [{ layout: cover|section|bullets|statement|quote|table|closing, title, subtitle, kicker, bullets: [], rows: [][] (for table), notes: "speaker notes" }]. Use this for precise control instead of content.' },
                outputDir: { type: 'string', description: 'Directory to write the files into. Default: session working directory (or the plugin outputDir config).' },
                fileName: { type: 'string', description: 'Base file name for the three artifacts. Default: sanitized deck title.' },
                overwrite: { type: 'boolean', description: 'Replace an existing same-name HTML/PPTX/JSON trio. Default false: choose a unique numeric suffix instead.' },
            }),
            output: {
                schema: createResultSchema,
                render: (_args, value) => renderCreate(value),
            },
            execute: executors.create,
        },
    ];
}

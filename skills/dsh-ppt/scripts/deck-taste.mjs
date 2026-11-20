/**
 * deck-taste.mjs —— dsh-ppt 大师审美配方系统（Curated Taste Recipes）与标杆 PPTX 品味学习库。
 *
 * 将世界顶级演示流派（麦肯锡合伙人精修、Apple Keynote 暗夜/纯白、瑞士杂志 Monocle、
 * Linear 玻璃工艺、Financial Times 财经研报、Nature 学术顶会、东方宋韵极简）
 * 抽象为结构化、可组合、可由外部真实优质 .pptx 反向吸收并持久化的 Taste Recipe。
 *
 * 零外部运行时依赖，仅使用 Node 内置模块。
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { writeWorkspaceJson } from './deck-store.mjs'

export const CARD_MATERIALS = Object.freeze(['solid', 'frameless', 'glass', 'editorial-rule'])
export const COVER_VARIANTS = Object.freeze([
  'default',
  'inverted',
  'monolith',
  'keynote-glow',
  'editorial-grid',
  'architectural',
  'split-bleed',
])
export const ICON_MODES = Object.freeze(['off', 'explicit', 'auto'])

/**
 * 8 套向世界顶级演示流派致敬的精选审美配方（Taste Recipes）。
 * 每份配方同时驱动：主题基调、母版骨架、卡片材质、封面/章节/指标/卡片变体、图标语言、图表聚光灯与增长标注。
 */
export const CURATED_TASTE_RECIPES = Object.freeze({
  'mckinsey-partner': Object.freeze({
    id: 'mckinsey-partner',
    name: '麦肯锡合伙人精修',
    enName: 'McKinsey Partner',
    school: 'consulting',
    description: '高白度极克制版面、顶部细线无框指标、议程进度章节页、聚光灯单色图表与 CAGR 增长飞线',
    enDescription: 'Crisp executive daylight, frameless hairline metrics, live agenda chapters, spotlight charts & growth callouts',
    theme: 'consulting',
    chromeStyle: 'consulting-classic',
    tableStyle: 'consulting',
    cardMaterial: 'frameless',
    coverVariant: 'architectural',
    sectionVariant: 'agenda',
    kpiVariant: 'spotlight',
    cardsVariant: 'frameless',
    iconMode: 'explicit',
    iconBadgeStyle: 'ring',
    chartSpotlight: true,
    chartGrowthCallout: true,
    density: 'balanced',
    typeScaleRatio: 1.75,
    swatches: ['#FFFFFF', '#003A70', '#0E7490', '#CBD5E1'],
  }),
  'apple-keynote-dark': Object.freeze({
    id: 'apple-keynote-dark',
    name: 'Apple 发布会暗夜',
    enName: 'Apple Keynote Dark',
    school: 'keynote',
    description: '深邃双色径向光晕封面、半透明玻璃拟态卡片、超大字号无框指标、非对称 Bento 主次排版与线性图标',
    enDescription: 'Luminous dark gradient glow cover, translucent glass cards, monumental frameless KPIs & asymmetric bento',
    theme: 'aurora-stage',
    chromeStyle: 'keynote-spatial',
    tableStyle: 'minimal',
    cardMaterial: 'glass',
    coverVariant: 'keynote-glow',
    sectionVariant: 'agenda',
    kpiVariant: 'frameless',
    cardsVariant: 'bento-hero',
    iconMode: 'auto',
    iconBadgeStyle: 'soft',
    chartSpotlight: true,
    chartGrowthCallout: true,
    density: 'airy',
    typeScaleRatio: 2.35,
    swatches: ['#070B14', '#2DD4BF', '#818CF8', '#192338'],
  }),
  'apple-keynote-light': Object.freeze({
    id: 'apple-keynote-light',
    name: 'Apple 极简纯白',
    enName: 'Apple Keynote Light',
    school: 'keynote',
    description: '高透气纯白画布、柔光氛围封面、超大视觉重心指标与非对称 Bento 视觉节奏',
    enDescription: 'Alabaster daylight canvas, soft aura cover, spotlight KPI hero & airy bento rhythm',
    theme: 'keynote-light',
    chromeStyle: 'keynote-spatial',
    tableStyle: 'minimal',
    cardMaterial: 'frameless',
    coverVariant: 'keynote-glow',
    sectionVariant: 'agenda',
    kpiVariant: 'spotlight',
    cardsVariant: 'bento-hero',
    iconMode: 'auto',
    iconBadgeStyle: 'soft',
    chartSpotlight: true,
    chartGrowthCallout: true,
    density: 'airy',
    typeScaleRatio: 2.3,
    swatches: ['#FBFBFD', '#0071E3', '#1D1D1F', '#E5E7EB'],
  }),
  'swiss-editorial': Object.freeze({
    id: 'swiss-editorial',
    name: '瑞士杂志 · Monocle',
    enName: 'Swiss Editorial',
    school: 'editorial',
    description: '暖米纸张底色、0.5pt 瑞士网格发丝封面、大号衬线序数与双线出版物分栏',
    enDescription: 'Warm archival paper, 0.5pt Swiss hairline grid cover, monumental folio numerals & editorial rules',
    theme: 'economist-brief',
    chromeStyle: 'editorial-folio',
    tableStyle: 'minimal',
    cardMaterial: 'editorial-rule',
    coverVariant: 'editorial-grid',
    sectionVariant: 'agenda',
    kpiVariant: 'spotlight',
    cardsVariant: 'frameless',
    iconMode: 'explicit',
    iconBadgeStyle: 'bare',
    chartSpotlight: true,
    chartGrowthCallout: false,
    density: 'airy',
    typeScaleRatio: 2.1,
    swatches: ['#F9F8F5', '#C8102E', '#141413', '#CFC8BA'],
  }),
  'linear-craft': Object.freeze({
    id: 'linear-craft',
    name: 'Linear 玻璃工艺',
    enName: 'Linear Craft',
    school: 'tech',
    description: '碳黑高质感暗底、电光紫/青双色微光、精细 1px 玻璃高光卡片、自动语义线性矢量图标',
    enDescription: 'Precision carbon dark canvas, indigo-cyan ambient glow, crisp hairline glass cards & semantic line icons',
    theme: 'linear-dark',
    chromeStyle: 'saas-bento',
    tableStyle: 'minimal',
    cardMaterial: 'glass',
    coverVariant: 'keynote-glow',
    sectionVariant: 'agenda',
    kpiVariant: 'spotlight',
    cardsVariant: 'bento-hero',
    iconMode: 'auto',
    iconBadgeStyle: 'ring',
    chartSpotlight: true,
    chartGrowthCallout: true,
    density: 'balanced',
    typeScaleRatio: 2.0,
    swatches: ['#0B0D14', '#7C6DF0', '#22D3EE', '#1E2436'],
  }),
  'ft-data-journal': Object.freeze({
    id: 'ft-data-journal',
    name: 'Financial Times 研报',
    enName: 'FT Data Journal',
    school: 'finance',
    description: '经典三文鱼粉纸底、酒红+青黛双色数据叙事、瑞士报刊网格封面与聚光灯增长标注',
    enDescription: 'Iconic salmon paper backdrop, claret & teal financial storytelling, grid cover & spotlight growth charts',
    theme: 'financial-ft',
    chromeStyle: 'editorial-folio',
    tableStyle: 'minimal',
    cardMaterial: 'editorial-rule',
    coverVariant: 'editorial-grid',
    sectionVariant: 'agenda',
    kpiVariant: 'spotlight',
    cardsVariant: 'frameless',
    iconMode: 'explicit',
    iconBadgeStyle: 'bare',
    chartSpotlight: true,
    chartGrowthCallout: true,
    density: 'balanced',
    typeScaleRatio: 1.85,
    swatches: ['#FFF1E5', '#990F3D', '#0D7680', '#1A1816'],
  }),
  'nature-academic': Object.freeze({
    id: 'nature-academic',
    name: 'Nature / NeurIPS 学术',
    enName: 'Nature Academic',
    school: 'academic',
    description: 'Beamer 学术顶底导航条、标准三线表、高对比无干扰细线结构与章节进度条',
    enDescription: 'Beamer top-bottom running headers, booktabs three-line tables, clean hairline hierarchy & chapter tracker',
    theme: 'academic',
    chromeStyle: 'academic-minimal',
    tableStyle: 'booktabs',
    cardMaterial: 'editorial-rule',
    coverVariant: 'editorial-grid',
    sectionVariant: 'agenda',
    kpiVariant: 'frameless',
    cardsVariant: 'frameless',
    iconMode: 'explicit',
    iconBadgeStyle: 'bare',
    chartSpotlight: true,
    chartGrowthCallout: false,
    density: 'balanced',
    typeScaleRatio: 1.65,
    swatches: ['#FFFFFF', '#0F5257', '#1E293B', '#E2E8F0'],
  }),
  'oriental-zen': Object.freeze({
    id: 'oriental-zen',
    name: '东方极简 · 宋韵',
    enName: 'Oriental Zen',
    school: 'editorial',
    description: '宣纸暖白留白、朱砂印红与天青黛墨点缀、建筑感不对称封面与大留白无框章节',
    enDescription: 'Xuan paper whitespace, cinnabar & celadon accents, architectural asymmetric cover & serene frameless typography',
    theme: 'exec-palace',
    chromeStyle: 'editorial-folio',
    tableStyle: 'minimal',
    cardMaterial: 'frameless',
    coverVariant: 'architectural',
    sectionVariant: 'agenda',
    kpiVariant: 'spotlight',
    cardsVariant: 'frameless',
    iconMode: 'explicit',
    iconBadgeStyle: 'bare',
    chartSpotlight: true,
    chartGrowthCallout: false,
    density: 'airy',
    typeScaleRatio: 2.05,
    swatches: ['#F9F6F0', '#9E2A2B', '#3D6B5E', '#1C1917'],
  }),
})

export const TASTE_RECIPE_IDS = Object.freeze(Object.keys(CURATED_TASTE_RECIPES))

export function listCuratedTasteRecipes() {
  return TASTE_RECIPE_IDS.map((id) => ({ ...CURATED_TASTE_RECIPES[id] }))
}

/**
 * 规范化任意品味配方输入（内置 ID 字符串 或 外部吸收的自定义 StyleRecipe 对象）。
 */
export function resolveTasteRecipe(input, customRegistry = null) {
  if (!input) return null
  if (typeof input === 'string') {
    const key = input.trim().toLowerCase()
    if (!key) return null
    if (CURATED_TASTE_RECIPES[key]) return { ...CURATED_TASTE_RECIPES[key] }
    if (customRegistry && customRegistry[key]) return sanitizeCustomTasteRecipe(customRegistry[key])
    return null
  }
  if (typeof input === 'object' && !Array.isArray(input)) {
    const base = typeof input.extends === 'string' && CURATED_TASTE_RECIPES[input.extends]
      ? CURATED_TASTE_RECIPES[input.extends]
      : typeof input.id === 'string' && CURATED_TASTE_RECIPES[input.id]
        ? CURATED_TASTE_RECIPES[input.id]
        : null
    return sanitizeCustomTasteRecipe(base ? { ...base, ...input } : input)
  }
  return null
}

export function sanitizeCustomTasteRecipe(raw) {
  if (!raw || typeof raw !== 'object') return null
  const cardMaterial = CARD_MATERIALS.includes(raw.cardMaterial) ? raw.cardMaterial : 'solid'
  const coverVariant = COVER_VARIANTS.includes(raw.coverVariant) ? raw.coverVariant : 'default'
  const iconMode = ICON_MODES.includes(raw.iconMode) ? raw.iconMode : 'explicit'
  const iconBadgeStyle = ['soft', 'ring', 'bare', 'solid'].includes(raw.iconBadgeStyle) ? raw.iconBadgeStyle : 'soft'
  return {
    id: String(raw.id || 'absorbed-custom').trim().slice(0, 64),
    name: String(raw.name || raw.id || '自定义标杆品味').trim().slice(0, 80),
    enName: String(raw.enName || raw.name || raw.id || 'Custom Taste Recipe').trim().slice(0, 80),
    school: String(raw.school || 'custom').trim(),
    description: String(raw.description || '').trim(),
    enDescription: String(raw.enDescription || raw.description || '').trim(),
    ...(raw.theme ? { theme: String(raw.theme).trim() } : {}),
    ...(raw.chromeStyle ? { chromeStyle: String(raw.chromeStyle).trim() } : {}),
    ...(raw.tableStyle ? { tableStyle: String(raw.tableStyle).trim() } : {}),
    cardMaterial,
    coverVariant,
    sectionVariant: raw.sectionVariant === 'agenda' ? 'agenda' : 'default',
    kpiVariant: ['spotlight', 'frameless', 'grid'].includes(raw.kpiVariant) ? raw.kpiVariant : 'grid',
    cardsVariant: ['frameless', 'bento-hero', 'bento', 'pillars'].includes(raw.cardsVariant) ? raw.cardsVariant : 'pillars',
    iconMode,
    iconBadgeStyle,
    chartSpotlight: raw.chartSpotlight === true,
    chartGrowthCallout: raw.chartGrowthCallout === true,
    density: ['airy', 'balanced', 'compact'].includes(raw.density) ? raw.density : 'balanced',
    typeScaleRatio: Number.isFinite(Number(raw.typeScaleRatio)) ? Number(Number(raw.typeScaleRatio).toFixed(2)) : 1.8,
    ...(Number.isFinite(Number(raw.whitespaceRatio)) ? { whitespaceRatio: Number(Number(raw.whitespaceRatio).toFixed(2)) } : {}),
    ...(Number.isFinite(Number(raw.rhythmScore)) ? { rhythmScore: Math.round(Number(raw.rhythmScore)) } : {}),
    ...(raw.brand && typeof raw.brand === 'object' ? { brand: { ...raw.brand } } : {}),
    ...(Array.isArray(raw.swatches) ? { swatches: raw.swatches.slice(0, 4).map(String) } : {}),
    ...(raw.sourceFile ? { sourceFile: String(raw.sourceFile) } : {}),
    ...(raw.absorbedAt ? { absorbedAt: String(raw.absorbedAt) } : {}),
  }
}

/**
 * 读取工作区持久化的用户品味配方库（.dsh-ppt/taste-recipes.json）。
 */
function readWorkspaceTasteRecipes(cwd, strict = false) {
  const storePath = resolve(cwd, '.dsh-ppt', 'taste-recipes.json')
  if (!existsSync(storePath)) return {}
  try {
    const parsed = JSON.parse(readFileSync(storePath, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid taste store')
    if (Object.hasOwn(parsed, 'recipes') && (!parsed.recipes || typeof parsed.recipes !== 'object' || Array.isArray(parsed.recipes))) throw new Error('Invalid taste recipes')
    const rawMap = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed.recipes && typeof parsed.recipes === 'object' ? parsed.recipes : parsed)
      : {}
    const out = {}
    for (const [k, v] of Object.entries(rawMap)) {
      const clean = sanitizeCustomTasteRecipe({ id: k, ...v })
      if (clean) out[clean.id.toLowerCase()] = clean
    }
    return out
  } catch (error) {
    if (strict) throw new Error('dsh-ppt：品味配方库格式无效或无法读取，已保留原文件，请备份并修复后重试', { cause: error })
    return {}
  }
}

export function loadWorkspaceTasteRecipes(cwd = process.cwd()) { return readWorkspaceTasteRecipes(cwd) }

/**
 * 将从优质 .pptx 吸收提炼的品味配方持久化到工作区（.dsh-ppt/taste-recipes.json），供后续所有新稿一键复用。
 */
export function saveWorkspaceTasteRecipe(recipe, cwd = process.cwd()) {
  const clean = sanitizeCustomTasteRecipe(recipe)
  if (!clean) throw new Error('dsh-ppt：无效的品味配方对象')
  const storePath = resolve(cwd, '.dsh-ppt', 'taste-recipes.json')
  const existing = readWorkspaceTasteRecipes(cwd, true)
  existing[clean.id.toLowerCase()] = {
    ...clean,
    absorbedAt: clean.absorbedAt || new Date().toISOString(),
  }
  writeWorkspaceJson(storePath, { version: 1, recipes: existing })
  return { path: storePath, recipe: existing[clean.id.toLowerCase()], totalSaved: Object.keys(existing).length }
}

/**
 * 从 manifest / brand / slide 中解析当前页有效的审美材质与品味配置。
 */
export function resolveActiveTaste(manifest = {}, slide = null) {
  const raw = manifest?.taste ?? manifest?.brand?.tasteRecipe ?? manifest?.brand?.taste ?? null
  const recipe = resolveTasteRecipe(raw)
  const cardMaterial = slide?.cardMaterial || manifest?.brand?.cardMaterial || recipe?.cardMaterial || 'solid'
  const iconMode = slide?.iconMode || manifest?.brand?.iconMode || recipe?.iconMode || 'explicit'
  const iconBadgeStyle = slide?.iconBadgeStyle || recipe?.iconBadgeStyle || (cardMaterial === 'frameless' ? 'bare' : cardMaterial === 'glass' ? 'ring' : 'soft')
  return {
    recipe,
    cardMaterial: CARD_MATERIALS.includes(cardMaterial) ? cardMaterial : 'solid',
    iconMode: ICON_MODES.includes(iconMode) ? iconMode : 'explicit',
    iconBadgeStyle,
    chartSpotlight: slide?.chart?.spotlight ?? recipe?.chartSpotlight ?? false,
    chartGrowthCallout: slide?.chart?.showGrowthCallout ?? recipe?.chartGrowthCallout ?? false,
  }
}

/**
 * 列出所有可用品味配方（内置 8 套 + 工作区已吸收的标杆配方）。
 */
export function listAllTasteRecipes(cwd = process.cwd()) {
  const curated = listCuratedTasteRecipes().map((r) => ({ ...r, builtin: true }))
  const saved = Object.values(loadWorkspaceTasteRecipes(cwd)).map((r) => ({ ...r, builtin: false }))
  return [...curated, ...saved]
}

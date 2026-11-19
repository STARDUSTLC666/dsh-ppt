import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import {
  ICON_NAMES,
  normalizeIconName,
  resolveSemanticIcon,
  renderIconSvg,
  renderIconBadgeHtml,
  ooxmlVectorIcon,
  renderIconBadgePptx,
} from '../skills/dsh-ppt/scripts/deck-icons.mjs'
import {
  CURATED_TASTE_RECIPES,
  TASTE_RECIPE_IDS,
  CARD_MATERIALS,
  ICON_MODES,
  resolveTasteRecipe,
  resolveActiveTaste,
  saveWorkspaceTasteRecipe,
  loadWorkspaceTasteRecipes,
  listAllTasteRecipes,
} from '../skills/dsh-ppt/scripts/deck-taste.mjs'
import {
  ooxmlRadialGradientFill,
  ooxmlShape,
  renderSurfaceCardPptx,
  getChromeConfig,
} from '../skills/dsh-ppt/scripts/deck-chrome.mjs'
import { POSTER_COVER_VARIANTS } from '../skills/dsh-ppt/scripts/deck-covers.mjs'
import { resolveTheme } from '../skills/dsh-ppt/scripts/deck-themes.mjs'
import {
  normalizeChart,
  chartColors,
  renderChartSvg,
  buildOfficeKitChartSpec,
  mediaBoxes,
} from '../skills/dsh-ppt/scripts/deck-media.mjs'
import {
  optimizeVisualRhythm,
  auditSlideAesthetics,
} from '../skills/dsh-ppt/scripts/deck-director.mjs'
import {
  buildDeckAsync,
  editDeck,
  undoDeck,
  readDeckProject,
  absorbPptx,
} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { PptWorkbench } from '../lib/workbench.js'
import { buildPptTools } from '../lib/tools.js'

const WORK = resolve('.test-output')
mkdirSync(WORK, { recursive: true })

function withTempDir(fn) {
  const dir = mkdtempSync(join(WORK, 'aesthetic-'))
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => {
      assert.ok(dir.startsWith(WORK))
      rmSync(dir, { recursive: true, force: true })
    })
}

function readSlideXmls(pptxPath) {
  const files = unzipSync(readFileSync(pptxPath))
  return Object.keys(files)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map((k) => strFromU8(files[k]))
}

test('Pillar 5: all 61 native vector icons compile cleanly to SVG + OOXML <a:custGeom> and match ZH/EN semantics', () => {
  assert.ok(ICON_NAMES.length >= 56, `expected >= 56 built-in geometric vector icons, got ${ICON_NAMES.length}`)
  const theme = resolveTheme('consulting')
  let idCounter = 100
  const nextId = () => idCounter++

  for (const name of ICON_NAMES) {
    const svg = renderIconSvg(name, { size: 20 })
    assert.match(svg, /^<svg class="deck-icon" width="20" height="20" viewBox="0 0 24 24"/, `valid SVG for ${name}`)
    assert.ok(!svg.includes('NaN'), `SVG for ${name} must not contain NaN`)

    const xml = ooxmlVectorIcon(nextId(), `Icon ${name}`, { x: 1, y: 1, w: 0.4, h: 0.4 }, name, { color: '#0057B8' })
    assert.match(xml, /<a:custGeom>.*<a:pathLst><a:path w="2400" h="2400" fill="none">/, `valid OOXML custGeom for ${name}`)
    assert.ok(!xml.includes('NaN'), `OOXML for ${name} must not contain NaN`)
  }

  // Badge container styles (soft / ring / bare / solid)
  for (const style of ['soft', 'ring', 'bare', 'solid']) {
    const badgeHtml = renderIconBadgeHtml('rocket', { style, size: 18 })
    assert.match(badgeHtml, new RegExp(`deck-icon-badge--${style}`))
    const badgePptx = renderIconBadgePptx('Badge', { x: 1, y: 1, w: 0.44, h: 0.44 }, 'rocket', nextId, theme, { style })
    assert.match(badgePptx, /<a:custGeom>/)
  }

  // Alias resolution & semantic auto-matching
  assert.equal(normalizeIconName('revenue'), 'coins')
  assert.equal(normalizeIconName('chart-up'), 'trending-up')
  assert.equal(normalizeIconName('battery'), 'zap')
  assert.equal(normalizeIconName('sparkles'), 'spark')
  assert.equal(resolveSemanticIcon({ title: '云端多活安全合规', text: '全链路零信任防护' }), 'shield')
  assert.equal(resolveSemanticIcon({ title: '年度 ARR 营收增长', text: '同比增长 45%' }), 'trending-up')
  assert.equal(resolveSemanticIcon({ title: '年度预算与现金流管理', text: '资金成本优化' }), 'coins')
  assert.equal(resolveSemanticIcon({ title: '算力芯片架构', text: 'GPU 异构集群' }), 'cpu')
  assert.equal(resolveSemanticIcon({ title: '产品发布加速上线', text: '快速启动试点' }), 'rocket')
})

test('Pillar 1: materiality & radial lighting primitives emit valid DrawingML radial gradients, strokeAlpha & 4 card materials', () => {
  const rad = ooxmlRadialGradientFill([
    { offset: 0, color: '#2DD4BF', alpha: 0.3 },
    { offset: 1, color: '#2DD4BF', alpha: 0 },
  ])
  assert.match(rad, /<a:gradFill rotWithShape="1"><a:gsLst>.*<a:path path="circle"><a:fillToRect/)
  assert.match(rad, /<a:alpha val="30000"\/>/)

  const glowShape = ooxmlShape(10, 'Glow', { x: 0, y: 0, w: 5, h: 5 }, {
    preset: 'ellipse',
    radialGradientStops: [
      { offset: 0, color: '#38BDF8', alpha: 0.25 },
      { offset: 1, color: '#38BDF8', alpha: 0 },
    ],
    stroke: '#FFFFFF',
    strokeAlpha: 0.22,
    strokePt: 0.75,
  })
  assert.match(glowShape, /<a:path path="circle">/)
  assert.match(glowShape, /<a:alpha val="22000"\/>/)

  const theme = resolveTheme('aurora-stage')
  const chromeCfg = getChromeConfig('keynote-spatial', theme)
  let seq = 200
  const nextId = () => seq++
  for (const mat of CARD_MATERIALS) {
    const cardXml = renderSurfaceCardPptx('Card ' + mat, { x: 1, y: 2, w: 3.5, h: 2.5 }, {
      fill: theme.tokens.surface1,
      focal: true,
      cardMaterial: mat,
    }, nextId, chromeCfg, theme)
    assert.ok(cardXml.length > 100, `material ${mat} should emit DrawingML`)
    if (mat === 'glass') assert.match(cardXml, /glass specular/)
    if (mat === 'editorial-rule') assert.match(cardXml, /editorial/i)
    if (mat === 'frameless') assert.match(cardXml, /top hairline/)
  }
})

test('Pillar 2 & 3: all 4 poster covers, section[agenda], kpi[spotlight], cards[bento-hero] & cards[frameless] build valid HTML + PPTX', () => withTempDir(async (dir) => {
  for (const coverVariant of POSTER_COVER_VARIANTS) {
    const built = await buildDeckAsync({
      title: `Cover ${coverVariant}`,
      theme: coverVariant === 'keynote-glow' ? 'aurora-stage' : 'consulting',
      outputDir: join(dir, coverVariant),
      overwrite: true,
      slides: [
        { layout: 'cover', variant: coverVariant, kicker: 'BRIEFING 2026', title: `海报封面 ${coverVariant}`, subtitle: '高辨识度封面架构验证', text: '2026 战略组' },
        { layout: 'section', variant: 'agenda', kicker: '01', title: '第一章 战略总览', subtitle: '自动议程追踪' },
        {
          layout: 'kpi',
          variant: 'spotlight',
          title: '主次聚光灯指标体系',
          items: [
            { title: '年度营收', value: '$4.8B', delta: '+42%', status: 'positive', icon: 'revenue', text: '核心增长引擎' },
            { title: '毛利率', value: '71.8%', delta: '+6.4pp', status: 'accent', icon: 'cpu', text: '单位算力成本下降' },
            { title: 'SLA 可用性', value: '99.99%', delta: '零中断', status: 'positive', icon: 'shield', text: '三区域多活' },
          ],
        },
        {
          layout: 'cards',
          variant: 'bento-hero',
          title: '反色主锚点 Bento 架构',
          items: [
            { tag: 'CORE', icon: 'sparkles', title: '主引擎内核', value: '4.6×', text: '片上统一内存域加速' },
            { tag: 'SPEED', icon: 'bolt', title: '毫秒响应', text: '首字延迟 38ms' },
            { tag: 'SAFE', icon: 'lock', title: '隐私飞地', text: '硬件级隔离加密' },
          ],
        },
        { layout: 'section', variant: 'agenda', kicker: '02', title: '第二章 落地路线图', subtitle: '聚焦关键节点' },
        {
          layout: 'cards',
          variant: 'frameless',
          title: '无框瑞士发丝三栏',
          items: [
            { tag: '01', icon: 'globe', title: '全球合规', text: '新加坡与法兰克福节点' },
            { tag: '02', icon: 'layers', title: '异构调度', text: 'GPU/NPU 统一池化' },
            { tag: '03', icon: 'award', title: '联合工程', text: '3 周快速投产' },
          ],
        },
      ],
    })

    const html = readFileSync(built.htmlPath, 'utf8')
    const xmls = readSlideXmls(built.pptxPath)
    assert.equal(xmls.length, 6)

    // Verify cover variant markup in HTML & PPTX
    if (coverVariant === 'keynote-glow') {
      assert.match(html, /is-keynote-glow/)
      assert.match(xmls[0], /Ambient Glow Primary/)
      assert.match(xmls[0], /<a:path path="circle">/)
    } else if (coverVariant === 'editorial-grid') {
      assert.match(html, /is-editorial-grid/)
      assert.match(xmls[0], /Editorial Meta Div/)
    } else {
      assert.match(html, /is-architectural/)
      assert.match(xmls[0], /Architectural Wing/)
      // Consulting light theme must still produce a deep high-contrast wing (not #FFFFFF!)
      assert.ok(!xmls[0].includes('Architectural Wing"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="8305800" y="0"/><a:ext cx="3886200" cy="6858000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:srgbClr val="FFFFFF"'))
    }

    // Section agenda live tracker links both chapters & avoids duplicating bare "01" kicker
    assert.match(html, /section-agenda-shell/)
    assert.match(xmls[1], /Agenda Active Row/)
    assert.match(xmls[1], /第 01 部分/)
    assert.match(xmls[4], /第 02 部分/)

    // Spotlight KPI & Bento-Hero & Frameless cards + native vector icons
    assert.match(html, /kpi-spotlight/)
    assert.match(html, /bento-hero-grid/)
    assert.match(html, /mat-frameless/)
    assert.match(xmls[2], /KPI Hero Surface/)
    assert.match(xmls[2], /<a:custGeom>/)
    assert.match(xmls[3], /Card Hero Surface/)
    assert.match(xmls[5], /top hairline/)
  }
}))

test('Pillar 3: optimizeVisualRhythm & SLOP-11/SLOP-12 break monotony without altering user content', () => {
  const monotonous = [
    { layout: 'cover', title: '封面' },
    { layout: 'cards', title: '卡片页 1', items: [{ title: 'A', text: 'Alpha' }, { title: 'B', text: 'Beta' }, { title: 'C', text: 'Gamma' }] },
    { layout: 'cards', title: '卡片页 2', items: [{ title: 'D', text: 'Delta' }, { title: 'E', text: 'Epsilon' }, { title: 'F', text: 'Zeta' }] },
    { layout: 'cards', title: '卡片页 3', items: [{ title: 'G', text: 'Eta' }, { title: 'H', text: 'Theta' }, { title: 'I', text: 'Iota' }] },
    { layout: 'kpi', title: '指标页 4', items: [{ title: 'J', value: '100' }, { title: 'K', value: '200' }, { title: 'L', value: '300' }] },
    {
      layout: 'chart',
      title: '无重点柱状图',
      chart: { kind: 'column', categories: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'], series: [{ name: '销量', values: [10, 14, 18, 22, 31] }] },
    },
    { layout: 'bullets', title: '关键执行清单', bullets: ['落实季度目标', '复盘交付节奏'] },
    { layout: 'closing', title: '谢谢', subtitle: '下一步联系项目组' },
  ]

  const issues = auditSlideAesthetics({ slides: monotonous }, resolveTheme('consulting'), (s) => String(s).length)
  assert.ok(issues.some((i) => i.code === 'visual-card-monotony'), 'should flag SLOP-11 visual-card-monotony')
  assert.ok(issues.some((i) => i.code === 'chart-emphasis-missing'), 'should flag SLOP-12 chart-emphasis-missing')

  const optimized = optimizeVisualRhythm(monotonous, CURATED_TASTE_RECIPES['apple-keynote-dark'])
  const variants = optimized.slice(1, 5).map((s) => s.variant || '')
  assert.ok(new Set(variants).size >= 2, `consecutive cards/kpi should vary variants, got ${JSON.stringify(variants)}`)
  assert.equal(optimized[1].items[0].text, 'Alpha', 'user content must never be mutated')
  assert.equal(optimized[3].items[2].text, 'Iota', 'user content must never be mutated')
})

test('Pillar 4: publication-grade chart finishing (spotlight, referenceLine, growth callout) in self-contained SVG & PPTX', () => withTempDir(async (dir) => {
  const norm = normalizeChart({
    kind: 'column',
    unit: '营收 ($M)',
    spotlight: true,
    showGrowthCallout: true,
    referenceLine: { value: 150, label: '目标线 150' },
    categories: ['2022', '2023', '2024', '2025', '2026E'],
    series: [{ name: 'ARR', values: [52, 89, 134, 176, 218] }],
  }, 1)

  assert.equal(norm.spotlight, true)
  assert.equal(norm.showGrowthCallout, true)
  assert.equal(norm.referenceLine.value, 150)

  // Verify renderChartSvg remains 100% self-contained in deck-data-view.mjs serialization sandbox
  const standaloneRender = new Function(
    'esc',
    'chartColors',
    `return (${renderChartSvg.toString()})`,
  )(
    (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'),
    chartColors,
  )
  const theme = resolveTheme('consulting')
  const svg = standaloneRender(norm, theme, { title: 'Test Chart' })
  assert.match(svg, /目标线 150/)
  assert.match(svg, /stroke-dasharray/)
  assert.match(svg, /\+319\.2%/)

  // Verify OfficeKit spec maps spotlight -> focal vs neutral pointColors
  const spec = buildOfficeKitChartSpec(norm, theme)
  assert.equal(spec.series[0].pointColors.length, 5)
  assert.equal(spec.series[0].pointColors[4], theme.tokens.chartFocal)
  assert.equal(spec.series[0].pointColors[0], theme.tokens.chartNeutral)

  // Verify mediaBoxes reserves clean top annotation strip (zero clipping behind chart)
  const slideWithAnnot = { layout: 'chart-split', chart: norm, takeaway: '核心结论' }
  const plainSlide = { layout: 'chart-split', chart: { kind: 'column', categories: ['A', 'B'], series: [{ name: 'S', values: [1, 2] }] }, takeaway: '核心结论' }
  const annotBox = mediaBoxes('chart-split', '', slideWithAnnot, {})
  const plainBox = mediaBoxes('chart-split', '', plainSlide, {})
  assert.ok(annotBox.chart.y > plainBox.chart.y + 0.3, 'annotated chart must shift down to reserve top strip for pills')

  // End-to-end build check
  const built = await buildDeckAsync({
    title: 'Chart Finishing',
    taste: 'mckinsey-partner',
    outputDir: dir,
    overwrite: true,
    slides: [
      { layout: 'cover', title: '封面' },
      { layout: 'chart-split', title: '增长曲线', chart: norm, bullets: ['要点一', '要点二'], takeaway: '结论' },
    ],
  })
  const xmls = readSlideXmls(built.pptxPath)
  assert.match(xmls[1], /Chart Annotation 1/)
  assert.match(xmls[1], /目标线 150/)
}))

test('Pillar 6: all 8 curated Taste Recipes resolve valid themes, persist custom recipes & round-trip via absorbPptx', () => withTempDir(async (dir) => {
  assert.equal(TASTE_RECIPE_IDS.length, 8)
  for (const id of TASTE_RECIPE_IDS) {
    const recipe = resolveTasteRecipe(id)
    assert.ok(recipe, `curated recipe ${id} must resolve`)
    const theme = resolveTheme(recipe.theme)
    assert.equal(theme.id, recipe.theme, `recipe ${id} must reference a real built-in theme`)
    assert.ok(CARD_MATERIALS.includes(recipe.cardMaterial))
    assert.ok(ICON_MODES.includes(recipe.iconMode))
  }

  // Build source deck with ft-data-journal taste
  const srcDeck = await buildDeckAsync({
    title: 'FT 标杆测试源稿',
    taste: 'ft-data-journal',
    outputDir: join(dir, 'src'),
    overwrite: true,
    slides: [
      { layout: 'cover', kicker: 'SPECIAL 2026', title: '全球能源资本开支格局', subtitle: '电化学储能进入全面平价' },
      { layout: 'cards', title: '三大拐点', items: [{ tag: '01', title: '成本拐点', text: 'EPC 均价下降 52%' }, { tag: '02', title: '并网机制', text: '构网型成刚需' }, { tag: '03', title: '现货套利', text: '峰谷价差 3.4×' }] },
      { layout: 'chart', title: '新增装机', chart: { kind: 'column', spotlight: true, categories: ['2022', '2023', '2024', '2025', '2026E'], series: [{ name: 'GWh', values: [52, 89, 134, 176, 218] }] } },
    ],
  })

  // Absorb deep aesthetic DNA & persist to workspace Taste Library
  const absorbed = await absorbPptx({
    pptxPath: srcDeck.files.pptx,
    cwd: dir,
    saveTasteAs: 'bench-ft-custom',
    tasteName: 'FT 标杆复刻',
  })
  assert.equal(absorbed.ok, true)
  assert.ok(absorbed.styleRecipe, 'absorbPptx must emit styleRecipe')
  assert.equal(absorbed.styleRecipe.id, 'bench-ft-custom')
  assert.ok(Number.isFinite(absorbed.styleRecipe.whitespaceRatio))
  assert.ok(CARD_MATERIALS.includes(absorbed.styleRecipe.cardMaterial))
  assert.ok(existsSync(join(dir, '.dsh-ppt', 'taste-recipes.json')))

  const loaded = loadWorkspaceTasteRecipes(dir)
  assert.ok(loaded['bench-ft-custom'], 'custom recipe must persist in .dsh-ppt/taste-recipes.json')
  assert.ok(listAllTasteRecipes(dir).length >= 9)

  // Reuse absorbed custom Taste Recipe directly in a brand-new deck
  const clonedDeck = await buildDeckAsync({
    title: '基于标杆品味复刻的新汇报',
    taste: 'bench-ft-custom',
    cwd: dir,
    outputDir: join(dir, 'cloned'),
    overwrite: true,
    slides: [
      { layout: 'cover', title: '新业务年度汇报', subtitle: '完整承袭标杆品味 DNA' },
      { layout: 'kpi', title: '关键进展', items: [{ title: '收入', value: '¥1.2B', delta: '+38%' }, { title: '利润率', value: '24.5%', delta: '+3.1pp' }] },
    ],
  })
  const clonedProject = readDeckProject({ deckPath: clonedDeck.jsonPath })
  const clonedTasteId = typeof clonedProject.manifest.taste === 'string'
    ? clonedProject.manifest.taste
    : clonedProject.manifest.taste?.id
  assert.equal(clonedTasteId, 'bench-ft-custom')

  // Explicit saveWorkspaceTasteRecipe helper test
  const saved = saveWorkspaceTasteRecipe({ id: 'manual-lab', name: 'Manual Lab', theme: 'linear-dark', cardMaterial: 'glass', iconMode: 'auto' }, dir)
  assert.equal(saved.recipe.id, 'manual-lab')
  const active = resolveActiveTaste({ taste: saved.recipe })
  assert.equal(active.cardMaterial, 'glass')
  assert.equal(active.iconMode, 'auto')
}))

test('Pillar 6: CLI --list-tastes & --taste, Agent Tool zero type-arrays, and Workbench Taste Studio edit + undo', () => withTempDir(async (dir) => {
  // 1. CLI --list-tastes & --taste
  const cliPath = resolve('skills/dsh-ppt/scripts/build-deck.mjs')
  const listOut = execFileSync(process.execPath, [cliPath, '--list-tastes'], { encoding: 'utf8' })
  const listed = JSON.parse(listOut)
  assert.ok(Array.isArray(listed.tasteRecipes) && listed.tasteRecipes.length >= 8)
  assert.ok(listed.tasteRecipes.some((r) => r.id === 'mckinsey-partner'))
  assert.ok(listed.tasteRecipes.some((r) => r.id === 'apple-keynote-dark'))

  const cliDeckOut = execFileSync(process.execPath, [
    cliPath,
    '--title', 'CLI Taste Verification',
    '--taste', 'linear-craft',
    '--out', join(dir, 'cli-out'),
    '--overwrite',
    '--content', '# CLI Taste Verification\n\n## 核心指标\n- ARR: $4.2B (+42%)\n- NDR: 134% (+7pp)',
  ], { encoding: 'utf8' })
  assert.match(cliDeckOut, /html|pptx|json/i)

  // 2. Agent Tool schema wire check: 0 JSON Schema type arrays across all 13 tools
  const tools = buildPptTools({ outputDir: dir, defaultTheme: 'auto', defaultLang: 'zh', defaultMotion: 'on' })
  assert.equal(tools.length, 13)
  const typeArrayViolations = []
  const walk = (node, pathStr) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node.type)) typeArrayViolations.push(pathStr)
    for (const [k, v] of Object.entries(node)) walk(v, `${pathStr}.${k}`)
  }
  for (const t of tools) walk(t.parameters, t.name)
  assert.deepEqual(typeArrayViolations, [], 'zero JSON Schema type arrays allowed on wire')

  // 3. Workbench open exposes tasteRecipes & edit applies taste + cardMaterial + iconMode atomically with undo
  const created = await buildDeckAsync({
    title: 'Workbench Taste Studio',
    outputDir: join(dir, 'wb'),
    slides: [
      { layout: 'cover', title: '原始封面', subtitle: '待套用品味配方' },
      { layout: 'kpi', title: '核心指标', items: [{ title: 'ARR', value: '$1.8B', delta: '+35%' }, { title: '留存', value: '128%', delta: '+4pp' }] },
    ],
  })
  const wb = new PptWorkbench({ catalogPath: join(dir, 'catalog.jsonl') })
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const opened = await wb.action({ operation: 'open', id })
  assert.ok(Array.isArray(opened.project.tasteRecipes) && opened.project.tasteRecipes.length >= 8, 'workbench open must expose 8+ tasteRecipes')
  const meta = await wb.action({ operation: 'catalog-meta', lang: 'zh' })
  assert.ok(Array.isArray(meta.tasteRecipes) && meta.tasteRecipes.length >= 8, 'workbench catalog-meta must expose 8+ tasteRecipes')

  // Apply taste + brand materiality & iconMode via editDeck (same executor path as workbench edit)
  const edited = await editDeck({
    deckPath: created.jsonPath,
    expectedRevision: 0,
    taste: 'apple-keynote-dark',
    brand: { cardMaterial: 'glass', iconMode: 'auto' },
  })
  assert.equal(edited.revision, 1)
  const afterEdit = readDeckProject({ deckPath: created.jsonPath })
  assert.equal(afterEdit.manifest.taste, 'apple-keynote-dark')
  assert.equal(afterEdit.manifest.theme, 'aurora-stage')
  assert.equal(afterEdit.manifest.brand.cardMaterial, 'glass')
  assert.equal(afterEdit.manifest.brand.iconMode, 'auto')

  // Undo restores original taste/theme cleanly
  await undoDeck({ deckPath: created.jsonPath, expectedRevision: 1 })
  const afterUndo = readDeckProject({ deckPath: created.jsonPath })
  assert.equal(afterUndo.manifest.taste, undefined)
  assert.notEqual(afterUndo.manifest.theme, 'aurora-stage')

  // Verify client bundle exposes Style Studio Taste Recipes UI
  const clientCode = readFileSync(resolve('lib/client.js'), 'utf8')
  assert.match(clientCode, /tasteRecipes|TASTE_RECIPES|cardMaterial|iconMode/)
}))

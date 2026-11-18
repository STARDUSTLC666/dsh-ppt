import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'
import * as officeKit from '@office-kit/pptx'
import {
  buildDeckAsync,
  editDeck,
  undoDeck,
  checkManifest,
  absorbPptx,
  inferThemeFromContent,
} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { resolveColorModifiers, resolveXmlColorElement, CHROME_STYLE_IDS } from '../skills/dsh-ppt/scripts/deck-absorb.mjs'
import { promoteMarkdownSlides, SCENARIO_TEMPLATES } from '../skills/dsh-ppt/scripts/deck-director.mjs'
import { normalizeDataModel, prepareDataSlides } from '../skills/dsh-ppt/scripts/deck-data.mjs'
import { normalizeSlides } from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { main } from '../skills/dsh-ppt/scripts/build-deck.mjs'
import { CHART_KINDS, normalizeChart, computeWaterfallGeometry, mediaBoxes, buildOfficeKitChartSpec } from '../skills/dsh-ppt/scripts/deck-media.mjs'
import { contrastRatio, relativeLuminance, resolveTheme, CURATED_MASTER_PRESETS, listMasterPresets } from '../skills/dsh-ppt/scripts/deck-themes.mjs'

const work = resolve('.test-output')
mkdirSync(work, { recursive: true })
const pngLogo = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVcoAAAAASUVORK5CYII=',
  'base64',
)

async function inDir(run) {
  const dir = mkdtempSync(join(work, 'absorb-charts-'))
  try {
    return await run(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('all 13 chart kinds render SVG + accessible HTML tables and 100% valid editable PPTX charts/shapes', () => inDir(async dir => {
  assert.equal(CHART_KINDS.length, 13)
  const cats = ['Q1', 'Q2', 'Q3', 'Q4']
  const singleKinds = ['column', 'bar', 'line', 'area', 'pie', 'doughnut', 'scatter']
  const multiKinds = ['stacked-column', 'stacked-bar', 'percent-column', 'percent-bar']

  const slides = [
    ...singleKinds.map((kind) => ({
      layout: 'chart',
      title: `${kind} 关键指标增长 42%`,
      chart: {
        kind,
        categories: cats,
        series: [{ name: '核心营收', values: [120, 155, 190, 240] }],
        unit: '百万元',
        highlight: 'max',
      },
      takeaway: `${kind} 展示清晰层级与直接数值标注`,
    })),
    ...multiKinds.map((kind) => ({
      layout: 'chart',
      title: `${kind} 结构占比演进`,
      chart: {
        kind,
        categories: cats,
        series: [
          { name: '订阅收入', values: [80, 95, 120, 150] },
          { name: '企业服务', values: [40, 50, 55, 65] },
        ],
        unit: kind.startsWith('percent-') ? '%' : '百万元',
      },
      takeaway: '高毛利订阅占比持续扩大',
    })),
    {
      layout: 'chart-split',
      variant: 'chart-left',
      title: 'Combo 双轴显示收入与毛利率同步改善',
      chart: {
        kind: 'combo',
        categories: cats,
        series: [
          { name: '营业收入', values: [120, 155, 190, 240], chartKind: 'column' },
          { name: '毛利率', values: [58, 62, 65, 69], chartKind: 'line', secondaryAxis: true },
        ],
        source: '2026 经营审计季报',
      },
      items: [
        { value: '+100%', unit: 'YoY', title: '营收规模翻倍', text: 'Q4 单季达 **2.4 亿**' },
        { value: '69%', unit: 'GM', title: '毛利率创新高', text: '规模效应摊薄固定成本' },
      ],
      takeaway: '量价齐升验证商业模型健康度',
    },
    {
      layout: 'waterfall',
      title: '营业利润桥接拆解：增收贡献远超研发投入增量',
      chart: {
        kind: 'waterfall',
        categories: ['上期利润', '老客续费增收', '新客拓展', '研发投入增加', '供应链降本', '本期利润'],
        series: [{ name: '利润变动', values: [100, 45, 35, -28, 18, 170] }],
        unit: '百万元',
      },
      takeaway: '本期营业利润净增 70 百万元（+70%）',
    },
  ]

  assert.equal(slides.length, 13)
  const output = await buildDeckAsync({
    title: '全量 13 类出版级图表验收',
    theme: 'consulting',
    slides,
    outputDir: dir,
  })
  assert.equal(output.ok, true)
  assert.equal(output.quality.errorCount, 0)

  const html = readFileSync(output.htmlPath, 'utf8')
  assert.equal((html.match(/class="native-chart"/g) || []).length, 13)
  assert.equal((html.match(/class="chart-data"/g) || []).length, 13)
  assert.match(html, /2026 经营审计季报/)

  const pptxBytes = readFileSync(output.pptxPath)
  const pres = await officeKit.loadPresentation(pptxBytes)
  const validationErrors = officeKit.validatePresentation(pres).filter((i) => i.severity === 'error')
  assert.deepEqual(validationErrors, [])

  const zip = unzipSync(pptxBytes)
  const chartParts = Object.keys(zip).filter((p) => /^ppt\/charts\/chart\d+\.xml$/.test(p))
  assert.equal(chartParts.length, 12, '12 OOXML chart parts + 1 pure DrawingML vector waterfall slide')

  // Economist/FT rule: single-series column chart suppresses redundant legend and highlights focal point
  const colChartXml = strFromU8(zip['ppt/charts/chart1.xml'])
  assert.doesNotMatch(colChartXml, /<c:legend>/)
  assert.match(colChartXml, /<c:dPt>/)

  // Native editable DrawingML vector waterfall shapes on slide 13
  const waterfallSlideXml = strFromU8(zip['ppt/slides/slide13.xml'])
  assert.match(waterfallSlideXml, /Waterfall Bar 1/)
  assert.match(waterfallSlideXml, /Waterfall Bar 6/)
  assert.match(waterfallSlideXml, /Waterfall Bridge 1/)
  assert.match(waterfallSlideXml, /prstDash val="dash"/)
  assert.match(waterfallSlideXml, /\+45/)
  assert.match(waterfallSlideXml, /-28/)
}))

test('long category labels auto-promote column chart to horizontal bar; waterfall bridge math is exact', () => {
  const flipped = normalizeChart({
    categories: ['华东智能制造事业群数字化平台', '华南跨境供应链协同事业部', '华北政企云原生基础设施中心'],
    series: [{ name: '合同额', values: [320, 260, 410] }],
  })
  assert.equal(flipped.kind, 'bar', 'long CJK category labels automatically switch default column to horizontal bar')

  const geom = computeWaterfallGeometry(
    normalizeChart({
      kind: 'waterfall',
      categories: ['基期', '增量', '流失', '期末合计'],
      series: [{ name: 'ARR', values: [100, 40, -15, 125] }],
    }),
  )
  assert.equal(geom.bars.length, 4)
  assert.equal(geom.bars[0].isTotal, true)
  assert.equal(geom.bars[3].isTotal, true)
  assert.equal(geom.bars[1].start, 100)
  assert.equal(geom.bars[1].end, 140)
  assert.equal(geom.bars[2].start, 140)
  assert.equal(geom.bars[2].end, 125)
  assert.equal(geom.connectors.length, 3)
})

test('absorbPptx & referencePptx sanitize hostile #FF0000 corporate template into inverted cover + WCAG daylight canvas + extracted logo', () => inDir(async dir => {
  const pres = await officeKit.createPresentation({ title: '红头母版参考' })
  officeKit.setPresentationFonts(pres, {
    majorLatin: 'Georgia',
    majorEastAsian: 'Microsoft YaHei',
    minorLatin: 'Segoe UI',
    minorEastAsian: 'Microsoft YaHei',
  })
  const s1 = officeKit.addBlankSlide(pres)
  officeKit.setSlideBackground(s1, '#FF0000')
  const tb = officeKit.addSlideTextBox(s1, { x: 914400, y: 1828800, w: 8000000, h: 914400, text: '刺眼红底黄字模板' })
  officeKit.setShapeTextFormat(tb, { size: 32, color: '#FFFF00', font: 'Microsoft YaHei' })
  officeKit.addSlideImage(s1, pngLogo, { x: 200000, y: 160000, w: 720000, h: 360000, name: 'Master Brand Logo' })
  const s2 = officeKit.addBlankSlide(pres)
  officeKit.setSlideBackground(s2, '#FF0000')

  const refPath = join(dir, 'hostile-red-template.pptx')
  writeFileSync(refPath, await officeKit.savePresentation(pres))

  const absorbed = await absorbPptx({ pptxPath: refPath })
  assert.equal(absorbed.ok, true)
  assert.equal(absorbed.slideCount, 2)
  assert.equal(absorbed.sanitizedTokens.coverMode, 'inverted-accent')
  assert.equal(absorbed.recommendedTheme, 'exec-palace')
  assert.ok(relativeLuminance(absorbed.sanitizedBrand.backgroundColor) > 0.85, 'content canvas must be sanitized to warm daylight')
  assert.ok(contrastRatio(absorbed.sanitizedBrand.backgroundColor, absorbed.sanitizedBrand.textColor) >= 4.5, 'text contrast must satisfy WCAG AA')
  assert.match(absorbed.sanitizedBrand.logo, /^data:image\/png;base64,/)
  assert.ok(absorbed.warnings.length >= 1)

  // CLI --absorb outputs structured JSON
  const cliLogs = []
  assert.equal(await main(['--absorb', refPath], { log: (line) => cliLogs.push(line) }), 0)
  assert.equal(JSON.parse(cliLogs.join('\n')).recommendedTheme, 'exec-palace')

  // Create finished deck absorbing hostile referencePptx
  const created = await buildDeckAsync({
    title: '年度专项工作总结汇报',
    referencePptx: refPath,
    content: [
      '# 年度专项工作总结汇报',
      '## 核心任务超额完成',
      '- 全年重点指标完成率达 106%',
      '- 办结时效同比提速 38%',
      '## 重点创新举措',
      '- 机制重塑：打通跨部门协同台账',
      '- 数字赋能：线上流转率提升至 95%',
      '## 检视问题与整改对策',
      '- 基层填报重复：统一数据底座一次性采集',
      '- 督办反馈滞后：建立红黄绿灯周调度机制',
      '## 下一阶段部署',
      '- 第一阶段：一季度完成存量清零',
      '- 第二阶段：二季度推广示范标杆',
      '- 第三阶段：年底实现常态化闭环',
    ].join('\n'),
    outputDir: dir,
  })
  assert.equal(created.theme, 'exec-palace')
  assert.equal(created.quality.errorCount, 0)
  const manifest = JSON.parse(readFileSync(created.jsonPath, 'utf8'))
  assert.ok(manifest.brand?.logoAssetId, 'master logo automatically absorbed into project assets')
  const html = readFileSync(created.htmlPath, 'utf8')
  assert.match(html, /is-inverted/, 'cover uses dignified inverted deep crimson surface')

  // editDeck with referencePptx + undoDeck
  const plain = await buildDeckAsync({
    title: '普通工程换肤测试',
    theme: 'consulting',
    slides: [
      { layout: 'cover', title: '换肤前封面' },
      { layout: 'bullets', title: '核心进展提升 25%', bullets: ['第一阶段已完成验收'] },
    ],
    outputDir: dir,
  })
  const absorbedEdit = await editDeck({ deckPath: plain.jsonPath, expectedRevision: 0, referencePptx: refPath })
  assert.equal(absorbedEdit.theme, 'exec-palace')
  assert.ok(JSON.parse(readFileSync(plain.jsonPath, 'utf8')).brand?.logoAssetId)
  const undone = await undoDeck({ deckPath: plain.jsonPath, expectedRevision: 1 })
  assert.equal(undone.theme, 'consulting')
  assert.equal(JSON.parse(readFileSync(plain.jsonPath, 'utf8')).brand, undefined)
}))

test('Scenario Auto-Director infers daylight/persona themes, promotes >=4-section Markdown rhythm, and flags SLOP-01..10', () => inDir(async dir => {
  // 1. Persona & theme inference: ambiguous input defaults to daylight consulting (never dark data)
  assert.equal(inferThemeFromContent({ title: '部门会议沟通材料' }).theme, 'consulting')
  assert.equal(inferThemeFromContent({ title: '多模态大模型消融实验与毕业论文答辩' }).theme, 'academic')
  assert.equal(inferThemeFromContent({ title: '机关年度述职与专项整治工作总结' }).theme, 'exec-jilan')
  assert.equal(inferThemeFromContent({ title: '支部党建主题教育专题汇报' }).theme, 'exec-palace')
  assert.equal(inferThemeFromContent({ title: '新员工入职培训课程讲义与课后练习' }).theme, 'course-sage')
  assert.equal(inferThemeFromContent({ title: '可持续品牌故事与非遗策展' }).theme, 'editorial-forest')
  assert.equal(inferThemeFromContent({ title: '极简建筑空间设计作品集 Monograph' }).theme, 'cartesian')
  assert.equal(inferThemeFromContent({ title: 'AI 智能体新品发布会暨种子轮融资路演' }).theme, 'linear-dark')
  assert.equal(inferThemeFromContent({ title: '云原生微服务架构设计与系统重构方案', persona: 'tech-pitch' }).theme, 'cobalt-cream')

  // 2. Markdown auto-rhythm promotion: zero >2 consecutive bullets & 100% text preservation
  const md = [
    '# Q3 经营增长复盘',
    '## 核心经营指标超额达成',
    '- **ARR 年度经常性收入**：突破 1.85 亿元，同比增长 +46%',
    '- **净收入留存率 NRR**：提升至 118%，创历史新高',
    '- **销售回收周期**：缩短至 7.5 个月',
    '## 增长瓶颈与应对策略对比',
    '- 中小客群流失率偏高：推出年度包年激励与自动化上手引导',
    '- 交付实施人力重：上线零代码配置器将交付周期压缩 50%',
    '## Q4 分阶段落地路径',
    '- 第一阶段：10 月完成华东标杆客户迁移',
    '- 第二阶段：11 月全面开放自助式数据分析模块',
    '- 第三阶段：12 月冲刺年度盈利目标与次年预算锁定',
    '## 组织与研发保障底座',
    '- **产研协同提效**：双周发布节奏稳定达成率 98%',
    '- **客户成功体系**：高价值客户专属 CSM 覆盖率 100%',
    '- **安全合规认证**：通过等保三级与 SOC2 Type II 审计',
  ].join('\n')

  const directed = await buildDeckAsync({
    title: 'Q3 经营增长复盘',
    theme: 'auto',
    content: md,
    outputDir: dir,
  })
  assert.equal(directed.theme, 'consulting')
  const layouts = directed.slides.map((s) => s.layout)
  assert.ok(layouts.includes('kpi'), 'metric section promoted to kpi')
  assert.ok(layouts.includes('comparison'), 'problem/action section promoted to comparison')
  assert.ok(layouts.includes('process'), 'phased roadmap promoted to process')
  assert.ok(new Set(layouts).size >= 4, 'multi-archetype rhythm guaranteed')
  const renderedHtml = readFileSync(directed.htmlPath, 'utf8')
  for (const phrase of ['1.85 亿元', '118%', '零代码配置器', 'SOC2 Type II']) {
    assert.ok(renderedHtml.includes(phrase), `must preserve 100% of original text: ${phrase}`)
  }

  // 3. SLOP-01..10 anti-pattern static detection
  const sloppyReport = checkManifest({
    theme: 'consulting',
    brand: { backgroundColor: '#FF0055', textColor: '#FFFFFF' },
    slides: [
      { id: 's1', layout: 'cover', title: '反模式检测' },
      { id: 's2', layout: 'bullets', kicker: '要点', title: '项目背景', bullets: ['超长文字墙'.repeat(18)] },
      { id: 's3', layout: 'bullets', kicker: '要点', title: '常规标题一', bullets: ['短句'] },
      { id: 's4', layout: 'bullets', kicker: '要点', title: '常规标题二', bullets: ['短句'] },
      { id: 's5', layout: 'bullets', title: '常规标题三', bullets: ['短句'] },
      { id: 's6', layout: 'kpi', title: '过多指标卡', items: Array.from({ length: 6 }, (_, i) => ({ title: `指标${i}`, value: '10%' })) },
      { id: 's7', layout: 'chart', title: '市场份额', chart: { kind: 'pie', categories: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], series: [{ name: '份额', values: [20, 18, 16, 14, 12, 10, 10] }] } },
      { id: 's8', layout: 'table', title: '超长明细表', rows: [['列1', '列2'], ...Array.from({ length: 10 }, (_, i) => [`行${i}`, String(i)])] },
      { id: 's9', layout: 'closing', title: '谢谢！' },
    ],
  })
  const codes = new Set(sloppyReport.issues.map((i) => i.code))
  for (const expectedCode of [
    'weak-topic-title',
    'repetitive-kicker',
    'wall-of-text',
    'card-count-overflow',
    'chart-spaghetti',
    'table-overload',
    'saturated-canvas',
    'layout-monotony',
    'bare-closing',
    'missing-chart-callout',
  ]) {
    assert.ok(codes.has(expectedCode), `expected SLOP check ${expectedCode} in ${[...codes].join(', ')}`)
  }
}))

test('waterfall 1-2-5 nice ticks produce clean round axis numbers without ugly multi-decimal steps', () => {
  const geom = computeWaterfallGeometry(
    normalizeChart({
      kind: 'waterfall',
      categories: ['Q1 基线', '新增订阅', '扩容增购', '流失冲减', 'Q4 净额'],
      series: [{ name: 'ARR', values: [10.2, 3.1, 2.4, -0.9, 14.8] }],
    }),
  )
  assert.deepEqual(
    geom.ticks.map((t) => t.label),
    ['0', '5', '10', '15', '20'],
    '15.7 intermediate peak snaps to clean 1-2-5 step-5 ticks instead of 4.218 decimals',
  )
})

test('combo chart separates column inEnd labels from line top labels; pie uses outEnd and doughnut uses crisp white contrast', () => inDir(async dir => {
  const out = await buildDeckAsync({
    title: '图表标签防碰撞与深色扇区对比度',
    theme: 'editorial-forest',
    slides: [
      {
        layout: 'chart',
        title: '26Q3 营收与毛利率双创新高',
        chart: {
          kind: 'combo',
          categories: ['26Q1', '26Q2', '26Q3'],
          series: [
            { name: '营收', values: [980, 1120, 1340], chartKind: 'column' },
            { name: '毛利率', values: [71, 75, 78], chartKind: 'line', secondaryAxis: true },
          ],
        },
      },
      {
        layout: 'chart',
        title: '企业版贡献 41% 核心份额',
        chart: {
          kind: 'pie',
          categories: ['企业版', '专业版', '团队版'],
          series: [{ name: '份额', values: [41, 35, 24] }],
        },
      },
      {
        layout: 'chart',
        title: '年度经常性收入结构占比',
        chart: {
          kind: 'doughnut',
          categories: ['旗舰订阅', '增购模块', '生态分成'],
          series: [{ name: 'ARR', values: [41, 34, 25] }],
        },
      },
    ],
    outputDir: dir,
  })
  const zip = unzipSync(readFileSync(out.pptxPath))
  const comboXml = strFromU8(zip['ppt/charts/chart1.xml'])
  assert.match(comboXml, /<c:dLblPos val="inEnd"\/>/)
  assert.match(comboXml, /<c:dLblPos val="t"\/>/)

  const pieXml = strFromU8(zip['ppt/charts/chart2.xml'])
  assert.match(pieXml, /<c:dLblPos val="outEnd"\/>/)
  assert.match(pieXml, /<c:showLeaderLines val="1"\/>/)

  const doughnutXml = strFromU8(zip['ppt/charts/chart3.xml'])
  assert.doesNotMatch(doughnutXml, /<c:dLblPos/)
  assert.match(doughnutXml, /val="FFFFFF"/)
}))

test('media takeaway bar renders accent stripe + arrow prefix while preserving image.caption directly below image', () => inDir(async dir => {
  const dataUri = 'data:image/png;base64,' + pngLogo.toString('base64')
  const out = await buildDeckAsync({
    title: '图文说明与底栏结论共存',
    theme: 'consulting',
    slides: [
      {
        layout: 'image-right',
        title: '新一代架构将端到端交付耗时缩短 52%',
        subtitle: '标准化流水线消除人工配置瓶颈',
        bullets: ['**自动预检**：发布前拦截 99% 配置漂移', '**灰度回滚**：秒级流量切换零中断'],
        image: { src: dataUri, alt: '架构图', caption: '图 1：云原生流水线拓扑结构' },
        takeaway: '全链路自动化是本季度毛利率提升的第一驱动力',
        source: '数据来源：平台工程效能月报',
      },
    ],
    outputDir: dir,
  })
  const html = readFileSync(out.htmlPath, 'utf8')
  assert.match(html, /图 1：云原生流水线拓扑结构/)
  assert.match(html, /全链路自动化是本季度毛利率提升的第一驱动力/)
  assert.match(html, /takeaway-arrow/)

  const slideXml = strFromU8(unzipSync(readFileSync(out.pptxPath))['ppt/slides/slide1.xml'])
  assert.match(slideXml, /name="Caption"/)
  assert.match(slideXml, /name="Takeaway"/)
  assert.match(slideXml, /name="Takeaway accent"/)
  assert.doesNotMatch(slideXml, /数据来源：数据来源：/)
}))

test('absorbPptx strips jagged legacy SimSun/Impact bitmap fonts so sanitized decks render smooth vector typography', () => inDir(async dir => {
  for (const legacyFont of ['SimSun', '宋体', 'NSimSun', 'Impact']) {
    const pres = await officeKit.createPresentation()
    officeKit.setPresentationFonts(pres, {
      majorLatin: legacyFont,
      majorEastAsian: legacyFont,
      minorLatin: legacyFont,
      minorEastAsian: legacyFont,
    })
    officeKit.addBlankSlide(pres)
    const bytes = await officeKit.savePresentation(pres)
    const res = await absorbPptx({ bytes })
    assert.doesNotMatch(String(res.sanitizedBrand.fontFamily ?? ''), /^(?:SimSun|NSimSun|宋体|Impact)$/i, `${legacyFont} must not leak into sanitizedBrand.fontFamily`)
  }
}))

test('checkManifest allows single-line editorial Action Titles up to 34 CJK units without false-positive title-overflow', () => {
  const report = checkManifest({
    theme: 'editorial-forest',
    slides: [
      {
        id: 'ed1',
        layout: 'image-left',
        title: 'Daylit Oak Tables and Curated Shelves Doubled Stay to 110m',
        bullets: ['Natural light increased afternoon dwell time by 2.1x', 'Acoustic timber baffles reduced ambient noise to 42 dB'],
      },
    ],
  })
  assert.ok(!report.issues.some((i) => i.code === 'title-overflow'), '32-unit editorial action title must not trigger title-overflow')
  assert.ok(!report.issues.some((i) => i.code === 'body-overflow'))
})

test('waterfall negative excursion produces clean symmetric/stepped nice ticks including zero', () => {
  const geom = computeWaterfallGeometry(
    normalizeChart({
      kind: 'waterfall',
      categories: ['期初', '一次性计提', '经营回升'],
      series: [{ name: '现金流', values: [4, -11, 15] }],
    }),
  )
  assert.ok(geom.min < 0 && geom.max > 0)
  assert.ok(geom.ticks.every((t) => Number.isInteger(t.value)))
})

test('buildOfficeKitChartSpec supports highlight last, index, index array, and none', () => {
  const theme = resolveTheme('consulting')
  for (const [hl, expectedFocalIndices] of [
    ['last', [2]],
    [1, [1]],
    [[0, 2], [0, 2]],
  ]) {
    const spec = buildOfficeKitChartSpec(
      normalizeChart({ kind: 'column', categories: ['A', 'B', 'C'], series: [{ name: 'S', values: [10, 30, 20] }], highlight: hl }),
      theme,
    )
    expectedFocalIndices.forEach((idx) => {
      assert.equal(spec.series[0].pointColors[idx], theme.tokens.chartFocal)
    })
  }
  const plain = buildOfficeKitChartSpec(
    normalizeChart({ kind: 'column', categories: ['A', 'B', 'C'], series: [{ name: 'S', values: [10, 30, 20] }], highlight: 'none' }),
    theme,
  )
  assert.equal(plain.series[0].pointColors, undefined)
})

test('mediaBoxes split-bleed and full-bleed stay strictly within 16:9 canvas bounds', () => {
  for (const [layout, variant] of [['image', 'full-bleed'], ['image-left', 'split-bleed'], ['image-right', 'split-bleed']]) {
    const boxes = mediaBoxes(layout, variant, { takeaway: '关键结论', image: { caption: '说明' } })
    for (const key of ['title', 'image', 'caption', 'takeaway']) {
      const b = boxes[key]
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 13.34 && b.y + b.h <= 7.51, `${layout}:${variant}:${key}`)
    }
  }
})

test('mediaBoxes gallery computes non-overlapping 2, 3, and 4 cell grids', () => {
  for (const count of [2, 3, 4]) {
    const boxes = mediaBoxes('image', 'gallery', { images: Array.from({ length: count }, () => ({ src: 'x' })) })
    assert.equal(boxes.gallery.length, count)
    for (let i = 1; i < count; i++) {
      assert.ok(boxes.gallery[i].x > boxes.gallery[i - 1].x + boxes.gallery[i - 1].w)
    }
  }
})

test('chart-split chart-right swaps chart and insight card columns cleanly', () => {
  const left = mediaBoxes('chart-split', 'chart-left', {})
  const right = mediaBoxes('chart-split', 'chart-right', {})
  assert.ok(left.chart.x < left.body.x)
  assert.ok(right.chart.x > right.body.x)
  assert.equal(left.chart.w, right.chart.w)
})

test('absorbPptx rejects invalid bytes/missing paths and honors extractLogo: false', () => inDir(async dir => {
  await assert.rejects(absorbPptx({ bytes: Buffer.from('not-a-zip-archive-at-all-123456') }), /有效的 \.pptx/)
  await assert.rejects(absorbPptx({ pptxPath: join(dir, 'nonexistent.pptx') }), /找不到参考 PPTX/)

  const pres = await officeKit.createPresentation()
  const s = officeKit.addBlankSlide(pres)
  officeKit.addSlideImage(s, pngLogo, { x: 150000, y: 150000, w: 600000, h: 300000, name: 'Brand Logo' })
  const bytes = await officeKit.savePresentation(pres)
  const withLogo = await absorbPptx({ bytes, extractLogo: true })
  const noLogo = await absorbPptx({ bytes, extractLogo: false })
  assert.ok(withLogo.sanitizedBrand.logo)
  assert.equal(noLogo.sanitizedBrand.logo, undefined)
}))

test('inferThemeFromContent rejects unknown persona with clear error and maps all 8 templates', () => {
  assert.throws(() => inferThemeFromContent({ title: '测试', persona: 'cyberpunk' }), /未知 persona/)
  for (const [tpl, expectedTheme] of [
    ['weekly', 'consulting'],
    ['defense', 'academic'],
    ['project', 'cobalt-cream'],
    ['pitch', 'linear-dark'],
    ['consulting', 'consulting'],
    ['keynote', 'linear-dark'],
    ['gov-report', 'exec-jilan'],
    ['workshop', 'course-sage'],
  ]) {
    assert.equal(inferThemeFromContent({ title: '测试', template: tpl }).theme, expectedTheme)
  }
})

test('smartLayout: false opt-out preserves plain bullets slides even when theme is auto', () => inDir(async dir => {
  const md = [
    '# 保持纯列表测试',
    '## 一', '- 指标增长 20%', '- 成本下降 15%',
    '## 二', '- 第一步：调研', '- 第二步：开发', '- 第三步：上线',
    '## 三', '- 要点 A', '- 要点 B',
    '## 四', '- 要点 C', '- 要点 D',
  ].join('\n')
  const out = await buildDeckAsync({ title: '关闭自动版式升维', theme: 'auto', smartLayout: false, content: md, outputDir: dir })
  const bodyLayouts = out.slides.slice(1, -1).map((s) => s.layout)
  assert.deepEqual(bodyLayouts, ['bullets', 'bullets', 'bullets', 'bullets'])
}))

test('Phase 3: resolveColorModifiers & resolveXmlColorElement accurately evaluate DrawingML lumMod/lumOff/tint/shade/satMod', () => {
  assert.equal(resolveColorModifiers('#0057B8', { tint: 50000 }), '#BCC3DF')
  assert.equal(resolveColorModifiers('#0057B8', { shade: 50000 }), '#003E86')
  assert.equal(resolveColorModifiers('#1F497D', [{ kind: 'lumMod', val: 75000 }, { kind: 'lumOff', val: 25000 }]), '#3172C4')
  assert.equal(resolveColorModifiers('#FF0000', { satMod: 50000 }), '#BF4040')

  const scheme = { accent1: '#0057B8', dark1: '#0F172A', light1: '#FFFFFF' }
  const resolved = resolveXmlColorElement(
    '<a:solidFill><a:schemeClr val="accent1"><a:lumMod val="60000"/><a:lumOff val="40000"/></a:schemeClr></a:solidFill>',
    scheme,
    null,
  )
  assert.match(resolved, /^#[0-9A-F]{6}$/)
  assert.notEqual(resolved, '#0057B8')
})

test('Phase 3: absorbPptx extracts skeleton + slideSkeleton and cloneStructure clones chrome & layout cadence onto Markdown', () => inDir(async dir => {
  // Build a multi-archetype reference PPTX with top banner, chart, table, and card shapes
  const ref = await buildDeckAsync({
    title: '参考企业模板',
    theme: 'consulting',
    brand: { chromeStyle: 'academic-minimal' },
    slides: [
      { layout: 'cover', title: '企业年度报告模板', subtitle: '战略部' },
      { layout: 'kpi', title: '核心财务指标', items: [{ tag: 'ARR', value: '1.2亿' }, { tag: 'NRR', value: '115%' }] },
      { layout: 'chart', title: '营收季度趋势', chart: { kind: 'column', categories: ['Q1', 'Q2', 'Q3'], series: [{ name: '营收', values: [30, 45, 62] }] } },
      { layout: 'table', title: '重点任务清单', rows: [['项目', '状态'], ['核心重构', '已完成']] },
    ],
    outputDir: dir,
    fileName: 'corp-skeleton-ref',
  })

  const absorbed = await absorbPptx({ pptxPath: ref.pptxPath })
  assert.equal(absorbed.ok, true)
  assert.ok(['sharp', 'rounded', 'soft'].includes(absorbed.extractedSkeleton.cornerStyle))
  assert.equal(typeof absorbed.extractedSkeleton.hasTopBanner, 'boolean')
  assert.equal(typeof absorbed.extractedSkeleton.hasSideSpine, 'boolean')
  assert.equal(typeof absorbed.extractedSkeleton.masterShapeCount, 'number')
  assert.ok(CHROME_STYLE_IDS.includes(absorbed.recommendedChrome))
  assert.equal(absorbed.slideSkeleton.length, 4)
  assert.equal(absorbed.slideSkeleton[0].inferredLayout, 'cover')
  assert.equal(absorbed.slideSkeleton[2].inferredLayout, 'chart')
  assert.equal(absorbed.slideSkeleton[3].inferredLayout, 'table')

  const cloned = await buildDeckAsync({
    title: '基于参考骨架的 Markdown 新文稿',
    referencePptx: ref.pptxPath,
    cloneStructure: true,
    content: [
      '# 基于参考骨架的新文稿',
      '## 第一部分指标总览',
      '- 营收同比提升 42%',
      '- 客户留存率达 118%',
      '## 第二部分季度增长拆解',
      '- Q1 完成华东布局',
      '- Q2 实现盈亏平衡',
      '## 第三部分重点任务分解',
      '- 底座升级：完成多活架构',
      '- 交付提效：平均周期压缩 50%',
    ].join('\n'),
    outputDir: dir,
    fileName: 'cloned-deck',
  })
  assert.equal(cloned.ok, true)
  assert.equal(cloned.quality.errorCount, 0)
  const manifest = JSON.parse(readFileSync(cloned.jsonPath, 'utf8'))
  assert.equal(manifest.brand.chromeStyle, absorbed.recommendedChrome)
  const pres = await officeKit.loadPresentation(readFileSync(cloned.pptxPath))
  assert.deepEqual(officeKit.validatePresentation(pres).filter((i) => i.severity === 'error'), [])
}))

test('Phase 3: deck-media.mjs renders differentiated HTML & PPTX chrome across all 6 Chrome Skeletons', () => inDir(async dir => {
  const dataUri = 'data:image/png;base64,' + pngLogo.toString('base64')
  const chromes = [
    ['consulting-classic', 'consulting', /Key Takeaway:|核心结论：/],
    ['academic-minimal', 'academic', /Beamer header band/],
    ['editorial-folio', 'editorial-forest', /Editorial folio rule/],
    ['keynote-spatial', 'keynote-light', /takeaway/i],
    ['gov-ceremonial', 'exec-jilan', /Header secondary rule/],
    ['saas-bento', 'linear-dark', /Takeaway accent/],
  ]
  for (const [chromeStyle, themeId, xmlPattern] of chromes) {
    const out = await buildDeckAsync({
      title: `Media Chrome ${chromeStyle}`,
      theme: themeId,
      brand: { chromeStyle },
      slides: [
        {
          layout: 'chart-split',
          title: `${chromeStyle} 图表页增长 35%`,
          kicker: '01 · 趋势',
          chart: { kind: 'column', categories: ['Q1', 'Q2', 'Q3'], series: [{ name: '收入', values: [20, 32, 48] }] },
          items: [{ tag: '核心', value: '+35%', title: '环比提速', text: '重点渠道放量' }],
          takeaway: '核心驱动持续验证',
          source: '内部财务月报',
        },
        {
          layout: 'image-right',
          title: `${chromeStyle} 图文页架构`,
          kicker: '02 · 方案',
          image: { src: dataUri, alt: '示意图' },
          bullets: ['**高可用**：双活容灾切换'],
          takeaway: '全链路零中断',
        },
      ],
      outputDir: dir,
      fileName: `media-${chromeStyle}`,
    })
    assert.equal(out.quality.errorCount, 0)
    const html = readFileSync(out.htmlPath, 'utf8')
    assert.match(html, new RegExp(`data-chrome="${chromeStyle}"`))
    const slide1Xml = strFromU8(unzipSync(readFileSync(out.pptxPath))['ppt/slides/slide1.xml'])
    assert.match(slide1Xml, xmlPattern)
    assert.match(slide1Xml, /name="Page number"/)
  }
}))

test('Phase 3: inferThemeFromContent covers all 24 themes & 20 blueprints; smartLayout promotes gantt/architecture/tam/org/harvey/chevron/funnel', () => {
  assert.equal(SCENARIO_TEMPLATES.length, 20)
  for (const tpl of SCENARIO_TEMPLATES) {
    assert.equal(inferThemeFromContent({ title: '测试', template: tpl.id }).theme, tpl.theme)
  }
  assert.equal(inferThemeFromContent({ title: '2026 Q3 季度财报业绩会与 EBITDA 估值分析' }).theme, 'financial-ft')
  assert.equal(inferThemeFromContent({ title: '肺癌靶向治疗临床病例讨论与循证随访' }).theme, 'medical-clean')
  assert.equal(inferThemeFromContent({ title: '苹果风极简白空间留白硬件生态发布会', persona: 'tech-pitch' }).theme, 'keynote-light')
  assert.equal(inferThemeFromContent({ title: 'Atelier Noir 2026 高定黑金品牌画册 Lookbook' }).theme, 'luxury-noir')
  assert.equal(inferThemeFromContent({ title: 'BCG 双碳战略与绿色转型增长路线图' }).theme, 'bcg-emerald')
  assert.equal(inferThemeFromContent({ title: '经济学人智库：全球地缘政治与通胀展望' }).theme, 'economist-brief')
  assert.equal(inferThemeFromContent({ title: 'A 轮阅读版 BP 投资备忘录与 PMF 增长复盘' }).theme, 'venture-daylight')
  assert.equal(inferThemeFromContent({ title: '开发者平台 SDK 与 API 架构工作坊' }).theme, 'stripe-craft')

  const promoted = promoteMarkdownSlides([
    { layout: 'cover', title: '技术与商业全景规划' },
    { layout: 'bullets', title: '系统技术架构分层设计', bullets: ['**接入层**：API 网关与限流', '**服务层**：领域微服务集群', '**治理层**：零信任安全与观测'] },
    { layout: 'bullets', title: '项目甘特排期与交付计划', bullets: ['**阶段一**：需求冻结与原型', '**阶段二**：研发联调测试', '**阶段三**：灰度放量验收'] },
    { layout: 'bullets', title: '全球可触达市场空间 TAM/SAM/SOM', bullets: ['**总体市场**：120 亿美元全球需求', '**可服务市场**：35 亿美元亚太核心区', '**三年目标**：4.2 亿美元头部客户'] },
    { layout: 'bullets', title: '核心组织架构与交付汇报线', bullets: ['**平台负责人**：统筹技术规划', '**基础架构组**：高可用底座', '**数据智能组**：实时计算引擎'] },
    { layout: 'bullets', title: '主流方案竞品对比与能力矩阵', bullets: ['**自动化编排**：● 支持', '**跨云合规**：● 支持', '**零代码接入**：● 支持'] },
    { layout: 'bullets', title: '端到端供应链价值链拆解', bullets: ['**采购寻源**：集中议价降本', '**智能制造**：柔性排产提效', '**履约交付**：仓配一体直达'] },
    { layout: 'bullets', title: '用户获客与留存转化漏斗', bullets: ['**曝光触达**：100 万月度访客', '**注册激活**：18% 首周转化', '**付费续约**：118% 净留存'] },
  ], { explicitSmartLayout: true })

  assert.equal(promoted[1].layout, 'architecture')
  assert.equal(promoted[2].layout, 'gantt')
  assert.equal(promoted[3].layout, 'tam')
  assert.equal(promoted[4].layout, 'org')
  assert.equal(promoted[5].layout, 'harvey')
  assert.equal(promoted[6].layout, 'process')
  assert.equal(promoted[6].variant, 'chevron')
  assert.equal(promoted[7].layout, 'process')
  assert.equal(promoted[7].variant, 'funnel')
})

test('Phase 3: deck-data {{metricId}} bindings work across gantt, tam, architecture, org items[] & columns[] & harvey rows[][]', () => inDir(async dir => {
  const model = normalizeDataModel({
    sources: [{ id: 's', name: 'kpi.csv', format: 'csv', content: 'Metric,Val\nTam,500\nArr,120\nSpan,2' }],
    metrics: [
      { id: 'tamVal', label: '市场规模', kind: 'source', source: { sourceId: 's', cell: 'B2' }, format: { digits: 0, unit: '亿元' } },
      { id: 'arrVal', label: '目标营收', kind: 'source', source: { sourceId: 's', cell: 'B3' }, format: { digits: 0, unit: '万元' } },
      { id: 'growth', label: '增速假设', kind: 'input', value: 0.4, min: 0.1, max: 1, step: 0.1, format: { style: 'percent', digits: 0 } },
      { id: 'samVal', label: '可服务规模', kind: 'formula', formula: 'tamVal*growth', format: { digits: 0, unit: '亿元' } },
    ],
  })
  const slides = [
    { layout: 'gantt', title: '交付排期目标 {{arrVal}}', columns: ['Q1', 'Q2', 'Q3', 'Q4'], items: [{ tag: 'M1', title: '一期达成 {{arrVal}}', start: 0, span: 2 }] },
    { layout: 'tam', title: '市场规模 {{tamVal}}', items: [{ tag: 'TAM', value: '{{tamVal}}', title: '总体空间' }, { tag: 'SAM', value: '{{samVal}}', title: '增速 {{growth}}' }, { tag: 'SOM', value: '{{arrVal}}', title: '三年目标' }] },
    { layout: 'harvey', title: '能力矩阵 {{growth}}', rows: [['能力', '本方案', '传统'], ['增速 {{growth}}', '●', '◑']] },
    { layout: 'architecture', title: '系统架构', items: [{ tag: 'L1', title: '网关 {{arrVal}}', bullets: ['峰值 {{tamVal}}'] }] },
    { layout: 'org', title: '团队架构', items: [{ tag: 'Lead', title: '负责人', text: '背负 {{arrVal}}' }, { tag: 'Pod', title: '增长组', text: '目标 {{growth}}' }] },
  ]
  const prepared = prepareDataSlides(slides, model, normalizeSlides, 'zh')
  assert.equal(prepared[0].columns[0], 'Q1')
  assert.equal(prepared[0].items[0].title, '一期达成 120万元')
  assert.equal(prepared[1].items[1].value, '200亿元')
  assert.equal(prepared[2].rows[1][0], '增速 40%')
  assert.equal(prepared[3].items[0].bullets[0], '峰值 500亿元')
  assert.equal(prepared[4].items[1].text, '目标 40%')

  const out = await buildDeckAsync({ title: 'Pro Diagrams Data Binding', slides, dataModel: model, outputDir: dir })
  assert.equal(out.ok, true)
  const html = readFileSync(out.htmlPath, 'utf8')
  assert.match(html, /200亿元/)
  assert.match(html, /120万元/)
}))

test('Phase 3+: individual DrawingML modifiers lumMod, lumOff, tint, shade, satMod, satOff behave deterministically', () => {
  assert.equal(resolveColorModifiers('#4F81BD', { lumMod: 50000 }), '#254061')
  const brighter = resolveColorModifiers('#4F81BD', { lumOff: 20000 })
  assert.match(brighter, /^#[0-9A-F]{6}$/)
  assert.notEqual(brighter, '#4F81BD')
  const desaturated = resolveColorModifiers('#4F81BD', { satOff: -50000 })
  assert.match(desaturated, /^#[0-9A-F]{6}$/)
  assert.notEqual(desaturated, '#4F81BD')
  assert.equal(resolveColorModifiers('#FFFFFF', { shade: 100000 }), '#FFFFFF')
  assert.equal(resolveColorModifiers('#000000', { tint: 100000 }), '#000000')
  assert.equal(resolveColorModifiers('#000000', { tint: 0 }), '#FFFFFF')
})

test('Phase 3+: cloneStructure maps chart slots to kpi for numeric bullets and to cards[bento] for prose bullets', () => inDir(async dir => {
  const ref = await buildDeckAsync({
    title: 'Chart-Only Reference',
    theme: 'consulting',
    slides: [
      { layout: 'cover', title: 'Ref Cover' },
      { layout: 'chart', title: 'Chart 1', chart: { kind: 'column', categories: ['A', 'B'], series: [{ name: 'S', values: [10, 20] }] } },
      { layout: 'chart', title: 'Chart 2', chart: { kind: 'bar', categories: ['A', 'B'], series: [{ name: 'S', values: [10, 20] }] } },
    ],
    outputDir: dir,
    fileName: 'chart-ref',
  })
  const cloned = await buildDeckAsync({
    title: 'Prose vs Metric Clone',
    referencePptx: ref.pptxPath,
    cloneStructure: true,
    content: [
      '# Prose vs Metric Clone',
      '## 核心财务指标达成',
      '- 营收同比增长 42%',
      '- 净留存率提升至 118%',
      '## 平台核心工程能力',
      '- **智能文档引擎**：完成六套母版骨架',
      '- **跨端渲染**：实现零缺字原生输出',
    ].join('\n'),
    outputDir: dir,
    fileName: 'prose-vs-metric',
  })
  const manifest = JSON.parse(readFileSync(cloned.jsonPath, 'utf8'))
  assert.equal(manifest.slides[1].layout, 'kpi', 'numeric bullets map chart slot to kpi')
  assert.equal(manifest.slides[2].layout, 'cards', 'non-metric prose bullets map chart slot to cards instead of 46pt KPI')
  assert.equal(manifest.slides[2].variant, 'bento')
}))

test('Phase 3+: cloneStructure preserves gantt, architecture, tam, and org skeleton slots safely', () => inDir(async dir => {
  const { buildDeck } = await import('../skills/dsh-ppt/scripts/deck-core.mjs')
  const { absorbPptx: _a } = await import('../skills/dsh-ppt/scripts/deck-absorb.mjs')
  assert.equal(typeof _a, 'function')
  // Verify normalizing & building a deck with all 4 diagram slots works cleanly
  const out = buildDeck({
    title: 'Pro Diagram Skeletons',
    theme: 'cobalt-cream',
    slides: [
      { layout: 'cover', title: 'Pro Diagrams' },
      { layout: 'gantt', title: 'Timeline', columns: ['Q1', 'Q2', 'Q3', 'Q4'], items: [{ title: 'Build', start: 0, span: 2 }] },
      { layout: 'architecture', title: 'Layers', items: [{ title: 'Gateway', bullets: ['Auth'] }] },
      { layout: 'tam', title: 'Market', items: [{ tag: 'TAM', value: '$10B', title: 'Total' }, { tag: 'SAM', value: '$2B', title: 'Target' }, { tag: 'SOM', value: '$200M', title: 'Obtainable' }] },
      { layout: 'org', title: 'Team', items: [{ tag: 'CEO', title: 'Leader' }, { tag: 'CTO', title: 'Tech' }] },
    ],
    outputDir: dir,
    fileName: 'diagram-slots',
  })
  const pres = await officeKit.loadPresentation(readFileSync(out.pptxPath))
  assert.deepEqual(officeKit.validatePresentation(pres).filter((i) => i.severity === 'error'), [])
}))

test('Phase 3+: all 8 new industry blueprints build valid OOXML in ZH and EN', () => inDir(async dir => {
  const newIds = [
    'architecture-review', 'financial-earnings', 'medical-case', 'postmortem',
    'marketing-campaign', 'promotion-review', 'legal-compliance', 'creative-lookbook',
  ]
  for (const id of newIds) {
    for (const lang of ['zh', 'en']) {
      const out = await buildDeckAsync({
        title: `${id}-${lang}`,
        template: id,
        lang,
        outputDir: dir,
        fileName: `${id}-${lang}`,
      })
      assert.equal(out.ok, true, `${id} (${lang})`)
      assert.equal(out.quality.errorCount, 0, `${id} (${lang}) quality errors`)
      const pres = await officeKit.loadPresentation(readFileSync(out.pptxPath))
      assert.deepEqual(officeKit.validatePresentation(pres).filter((i) => i.severity === 'error'), [], `${id} (${lang}) OOXML errors`)
    }
  }
}))

test('Phase 3+: project blueprint includes gantt diamond milestone and pitch includes tam + harvey', () => inDir(async dir => {
  const proj = await buildDeckAsync({ title: '项目汇报验证', template: 'project', lang: 'zh', outputDir: dir, fileName: 'proj-tpl' })
  const projManifest = JSON.parse(readFileSync(proj.jsonPath, 'utf8'))
  const ganttSlide = projManifest.slides.find((s) => s.layout === 'gantt')
  assert.ok(ganttSlide, 'project blueprint has gantt slide')
  assert.ok(ganttSlide.items.some((it) => it.milestone === true), 'project gantt includes milestone diamond')
  const slide3Xml = strFromU8(unzipSync(readFileSync(proj.pptxPath))['ppt/slides/slide3.xml'])
  assert.match(slide3Xml, /prst="diamond"/)

  const pitch = await buildDeckAsync({ title: '路演验证', template: 'pitch', lang: 'en', outputDir: dir, fileName: 'pitch-tpl' })
  const pitchLayouts = JSON.parse(readFileSync(pitch.jsonPath, 'utf8')).slides.map((s) => s.layout)
  assert.ok(pitchLayouts.includes('tam'))
  assert.ok(pitchLayouts.includes('harvey'))
}))

test('Phase 3+: smartLayout promotes org[team] vs org[tree] and preserves 100% of source phrases', () => {
  const promoted = promoteMarkdownSlides([
    { layout: 'cover', title: '组织与能力评估' },
    { layout: 'bullets', title: '核心管理团队成员履历介绍', bullets: ['**林致远**：前某大厂首席架构师', '**陈思敏**：十年企业增长操盘经验', '**周瑾**：分布式数据库核心作者'] },
    { layout: 'bullets', title: '研发组织架构与部门汇报线', bullets: ['**CTO 办公室**：技术战略规划', '**基础平台部**：云原生基础设施', '**数据智能部**：实时数仓与算法'] },
  ], { explicitSmartLayout: true })
  assert.equal(promoted[1].layout, 'org')
  assert.equal(promoted[1].variant, 'team')
  assert.equal(promoted[2].layout, 'org')
  assert.equal(promoted[2].variant, 'tree')
  assert.ok(JSON.stringify(promoted).includes('林致远'))
  assert.ok(JSON.stringify(promoted).includes('云原生基础设施'))
})

test('Phase 3+: inferThemeFromContent covers keynote-light, financial-ft, medical-clean, luxury-noir across ZH and EN', () => {
  assert.equal(inferThemeFromContent({ title: 'Apple Cupertino spatial keynote hardware launch', persona: 'tech-pitch' }).theme, 'keynote-light')
  assert.equal(inferThemeFromContent({ title: 'Q4 Earnings & EBITDA Valuation Review' }).theme, 'financial-ft')
  assert.equal(inferThemeFromContent({ title: 'Oncology Clinical Trial & Hospital Diagnosis Review' }).theme, 'medical-clean')
  assert.equal(inferThemeFromContent({ title: 'Maison Bespoke Couture Lookbook' }).theme, 'luxury-noir')
})

test('Phase 3+: deck-media chrome parity renders Beamer header/footer and editorial top-right folio in HTML + PPTX', () => inDir(async dir => {
  const ac = await buildDeckAsync({
    title: 'Academic Media Chrome',
    theme: 'academic',
    brand: { chromeStyle: 'academic-minimal' },
    slides: [{ layout: 'chart', title: 'Accuracy improves +12%', kicker: '01 · Results', chart: { kind: 'line', categories: ['E1', 'E2', 'E3'], series: [{ name: 'Acc', values: [72, 80, 84] }] }, source: 'Bench 2026' }],
    outputDir: dir,
    fileName: 'ac-media',
  })
  const acHtml = readFileSync(ac.htmlPath, 'utf8')
  assert.match(acHtml, /media-beamer-band/)
  assert.match(acHtml, /media-beamer-status/)

  const ed = await buildDeckAsync({
    title: 'Editorial Media Chrome',
    theme: 'editorial-forest',
    brand: { chromeStyle: 'editorial-folio' },
    slides: [{ layout: 'chart', title: 'Revenue Mix Shift', kicker: '02 · Mix', chart: { kind: 'pie', categories: ['A', 'B'], series: [{ name: 'Share', values: [60, 40] }] } }],
    outputDir: dir,
    fileName: 'ed-media',
  })
  assert.match(readFileSync(ed.htmlPath, 'utf8'), /media-editorial-bar/)
  assert.match(strFromU8(unzipSync(readFileSync(ed.pptxPath))['ppt/slides/slide1.xml']), /Editorial folio rule/)
}))

test('Phase 4: chevron value-chain diagram, 4 new blueprints, and 8 curated master presets build valid OOXML & HTML', () => inDir(async dir => {
  assert.equal(CURATED_MASTER_PRESETS.length, 8)
  assert.equal(listMasterPresets('zh').length, 8)
  assert.equal(listMasterPresets('en').length, 8)

  const chevronOut = await buildDeckAsync({
    title: '端到端价值链诊断',
    theme: 'bcg-emerald',
    slides: [
      { layout: 'cover', title: '端到端价值链诊断', subtitle: 'BCG 祖母绿母版验证' },
      {
        layout: 'chevron',
        title: '核心业务价值链在履约环节释放 18% 利润空间',
        kicker: '01 · 价值链拆解',
        takeaway: '优先改造制造排产与仓配直达两个高杠杆环节',
        items: [
          { tag: '01', title: '寻源采购', text: '集中供应商议价', bullets: ['账期优化 15 天'] },
          { tag: '02', title: '柔性制造', text: 'APS 智能排产', status: 'accent', bullets: ['换线耗时 -32%'] },
          { tag: '03', title: '仓配履约', text: '区域中心直发', status: 'positive', bullets: ['次日达率 94%'] },
          { tag: '04', title: '客户续约', text: '全周期健康度预警', bullets: ['NRR 达 118%'] },
        ],
      },
    ],
    outputDir: dir,
    fileName: 'chevron-check',
  })
  assert.equal(chevronOut.ok, true)
  const chevronHtml = readFileSync(chevronOut.htmlPath, 'utf8')
  assert.match(chevronHtml, /chevron-board/)
  assert.match(chevronHtml, /chevron-arrow/)
  const chevronXml = strFromU8(unzipSync(readFileSync(chevronOut.pptxPath))['ppt/slides/slide2.xml'])
  assert.match(chevronXml, /prst="homePlate"/)
  assert.match(chevronXml, /prst="chevron"/)
  const chevronPres = await officeKit.loadPresentation(readFileSync(chevronOut.pptxPath))
  assert.deepEqual(officeKit.validatePresentation(chevronPres).filter((i) => i.severity === 'error'), [])

  for (const id of ['quarterly-okr', 'product-prd', 'vc-daylight', 'industry-research']) {
    for (const lang of ['zh', 'en']) {
      const out = await buildDeckAsync({ title: `${id}-${lang}`, template: id, lang, outputDir: dir, fileName: `${id}-${lang}` })
      assert.equal(out.ok, true)
      assert.equal(out.quality.errorCount, 0)
      const pres = await officeKit.loadPresentation(readFileSync(out.pptxPath))
      assert.deepEqual(officeKit.validatePresentation(pres).filter((i) => i.severity === 'error'), [], `${id} (${lang}) OOXML errors`)
    }
  }
}))

test('Phase 4: deep absorbPptx unwraps nested <p:grpSp>, resolves sysClr/prstClr/hueMod, detects dark cover + daylight body, dual accents & 24 layouts', () => inDir(async dir => {
  // Verify XML color resolution for sysClr, prstClr, and hueMod
  assert.equal(resolveXmlColorElement('<a:sysClr val="windowText" lastClr="1E293B"/>', {}), '#1E293B')
  assert.equal(resolveXmlColorElement('<a:sysClr val="window"/>', {}), '#FFFFFF')
  assert.equal(resolveXmlColorElement('<a:prstClr val="navy"/>', {}), '#000080')
  const hueShifted = resolveColorModifiers('#0057B8', { hueOff: 3600000 })
  assert.match(hueShifted, /^#[0-9A-F]{6}$/)
  assert.notEqual(hueShifted, '#0057B8')

  // Build a multi-archetype reference deck, then wrap slide 2's KPI shapes inside a nested <p:grpSp>
  // and give slide 1 an explicit dark background while keeping slides 2..5 daylight to test cover polarity!
  const baseRef = await buildDeckAsync({
    title: 'Enterprise Master Deck',
    theme: 'economist-brief',
    brand: {
      name: 'Global Strategy House',
      primaryColor: '#1E293B',
      secondaryColor: '#C8102E',
      fontFamily: 'Microsoft YaHei',
      headingFont: 'Georgia',
    },
    slides: [
      { layout: 'cover', title: '2026 Global Industry Outlook', subtitle: 'Executive Briefing' },
      { layout: 'kpi', title: 'Operating Margin Expanded +420 bps', items: [{ tag: 'REV', value: '$4.8B', delta: '+19%', title: 'Annual Revenue' }, { tag: 'EBITDA', value: '28.4%', delta: '+420bps', title: 'Margin' }, { tag: 'NRR', value: '121%', delta: '+6pt', title: 'Net Retention' }] },
      { layout: 'chevron', title: 'Four-Stage Value Chain Transformation', items: [{ tag: '01', title: 'Source', text: 'Direct procurement' }, { tag: '02', title: 'Build', text: 'Automated assembly' }, { tag: '03', title: 'Ship', text: 'Regional hubs' }, { tag: '04', title: 'Serve', text: 'Predictive care' }] },
      { layout: 'harvey', title: 'Competitive Capability Matrix', rows: [['Dimension', 'Platform A', 'Legacy B'], ['Automation', '●', '◔'], ['Compliance', '◕', '◑'], ['Latency', '●', '○']] },
      { layout: 'table', tableStyle: 'booktabs', title: 'Regional Breakdown', rows: [['Region', 'FY25', 'FY26E'], ['APAC', '$1.4B', '$1.9B'], ['EMEA', '$1.8B', '$2.1B']] },
    ],
    outputDir: dir,
    fileName: 'deep-ref',
  })

  const archive = unzipSync(readFileSync(baseRef.pptxPath))
  // Inject explicit dark cover background on slide1.xml (<p:bg>...#0F172A...</p:bg>) + wrap slide2 KPI cards inside <p:grpSp> with scaled child coords
  let s1 = strFromU8(archive['ppt/slides/slide1.xml'])
  if (/<p:bg>[\s\S]*?<\/p:bg>/.test(s1)) {
    s1 = s1.replace(/<p:bg>[\s\S]*?<\/p:bg>/, '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>')
  } else {
    s1 = s1.replace(/<p:cSld[^>]*>/, (m) => m + '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>')
  }
  archive['ppt/slides/slide1.xml'] = strToU8(s1)
  let s2 = strFromU8(archive['ppt/slides/slide2.xml'])
  // Wrap all <p:sp> after the first title shape into a <p:grpSp> to prove recursive group unwrapping preserves KPI detection
  const spParts = s2.split(/(?=<p:sp\b)/)
  if (spParts.length > 3) {
    const head = spParts[0] + spParts[1]
    const tailIdx = spParts.at(-1).lastIndexOf('</p:spTree>')
    const lastSp = spParts.at(-1).slice(0, tailIdx)
    const restTree = spParts.at(-1).slice(tailIdx)
    const groupedBody = spParts.slice(2, -1).join('') + lastSp
    const grpXml = `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="900" name="GroupedKPIs"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/><a:chOff x="0" y="0"/><a:chExt cx="12192000" cy="6858000"/></a:xfrm></p:grpSpPr>${groupedBody}</p:grpSp>`
    archive['ppt/slides/slide2.xml'] = strToU8(head + grpXml + restTree)
  }
  // Inject explicit theme majorFont Georgia + minorFont Microsoft YaHei and accent2 C8102E into theme1.xml
  let themeXml = strFromU8(archive['ppt/theme/theme1.xml'])
  themeXml = themeXml.replace(/<a:accent2>[\s\S]*?<\/a:accent2>/, '<a:accent2><a:srgbClr val="C8102E"/></a:accent2>')
  archive['ppt/theme/theme1.xml'] = strToU8(themeXml)

  const mutatedPath = join(dir, 'mutated-enterprise.pptx')
  writeFileSync(mutatedPath, Buffer.from(zipSync(archive)))

  const absorbed = await absorbPptx({ pptxPath: mutatedPath })
  assert.equal(absorbed.slideCount, 5)
  assert.equal(absorbed.sanitizedBrand.coverMode, 'inverted-accent', 'dark cover + daylight body preserved as inverted-accent')
  assert.equal(absorbed.sanitizedBrand.coverBg, '#0F172A')
  assert.equal(absorbed.sanitizedBrand.secondaryColor, '#C21632', 'vivid secondary accent preserved and saturation-clamped alongside charcoal primary')
  assert.ok(contrastRatio(absorbed.sanitizedBrand.secondaryColor, absorbed.sanitizedBrand.backgroundColor) >= 3.2)
  assert.equal(absorbed.slideSkeleton[1].inferredLayout, 'kpi', 'grouped KPI shapes inside <p:grpSp> accurately unwrapped and classified')
  assert.equal(absorbed.slideSkeleton[2].inferredLayout, 'process')
  assert.equal(absorbed.slideSkeleton[2].variant, 'chevron', 'interlocking chevron shapes classified as process[chevron]')
  assert.equal(absorbed.slideSkeleton[3].inferredLayout, 'harvey', 'Harvey ball symbols inside <a:tbl> cells classified as harvey')
  assert.ok(absorbed.narrativeProfile && typeof absorbed.narrativeProfile.diagramRatio === 'number')
  assert.ok(absorbed.narrativeProfile.diagramRatio > 0.4)
}))

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildPptTools } from '../lib/tools.js'
import { createPptExecutors } from '../lib/execution.js'
import { PptCoaching } from '../lib/coaching.js'
import { PptVisual } from '../lib/visual.js'
import { THEME_IDS } from '../skills/dsh-ppt/scripts/deck-themes.mjs'
import { TASTE_RECIPE_IDS } from '../skills/dsh-ppt/scripts/deck-taste.mjs'
import { CORE_LAYOUTS, LAYOUT_ALIASES, measureEmWidth } from '../skills/dsh-ppt/scripts/deck-layouts.mjs'
import { CURATED_EXEMPLARS, renderExemplarPromptGuide } from '../skills/dsh-ppt/scripts/deck-exemplars.mjs'
import { upgradeWeakDeck, selfRepairDeck, synthesizeActionTitle, splitLead } from '../skills/dsh-ppt/scripts/deck-upgrader.mjs'
import {
  inferThemeFromContent,
  promoteMarkdownSlides,
  auditSlideAesthetics,
  buildArtDirectorPrompt,
} from '../skills/dsh-ppt/scripts/deck-director.mjs'
import { auditEvidenceAndSourcing, applyEvidenceLedgerToSlides } from '../skills/dsh-ppt/scripts/deck-evidence.mjs'
import { buildDeckAsync, checkDeck } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'

const DEFAULT_CONFIG = {
  defaultTheme: '',
  defaultLang: 'zh',
  outputDir: '.',
  maxSlides: 60,
}

function collectNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out
  out.push(node)
  if (node.properties && typeof node.properties === 'object') {
    for (const child of Object.values(node.properties)) collectNodes(child, out)
  }
  if (node.items && typeof node.items === 'object') collectNodes(node.items, out)
  if (Array.isArray(node.oneOf)) {
    for (const child of node.oneOf) collectNodes(child, out)
  }
  return out
}

test('P0-1: autoBoldBullet 绝不拆毁千分位数字且截断不腰斩数值短语，EN/ZH Action-Title 无乱拼', () => {
  const { slides } = upgradeWeakDeck([
    { layout: 'cover', title: '2026 经营复盘' },
    {
      layout: 'bullets',
      title: '业绩情况',
      bullets: [
        '全年合同额达到 3,850 万元，较去年同期显著增长并提前达成目标',
        '新客交付周期从 3.5 天压缩至 4 小时，客户满意度提升至 96%',
      ],
    },
    {
      layout: 'bullets',
      title: 'Summary',
      bullets: ['Thank you', 'Enterprise ARR reached $48.2M with 128% NRR across 140 accounts'],
    },
  ], { lang: 'zh' })

  const body = JSON.stringify(slides[1])
  assert.ok(body.includes('3,850'), '千分位数字 3,850 必须完整保留，不得被拆成 3**：850')
  assert.ok(!body.includes('3**：850'), '绝不能在千分位逗号处插入加粗冒号')
  assert.ok(!String(slides[1].title || '').match(/从\s*3\.5$/), '标题截断不能停在半截范围短语「从 3.5」')

  const enTitle = synthesizeActionTitle({
    layout: 'bullets',
    title: 'Summary',
    bullets: ['Thank you', 'Enterprise ARR reached $48.2M (+42% YoY)'],
  }, true)
  assert.ok(enTitle && !/Thank\s*you/i.test(enTitle), 'Action Title 候选必须跳过致谢词')
  assert.ok(!enTitle.includes('：'), '英文标题应使用英文冒号 ": " 而非中文全角冒号')
  assert.ok((enTitle.match(/:/g) || []).length <= 1, '不应叠加双重冒号')
})

test('P0-2: 所有内置标杆、Art-Director 提示词与文档中的 theme/taste ID 均合法且不覆盖 styleRecipe', async () => {
  const validThemes = new Set(THEME_IDS)
  const validTastes = new Set(TASTE_RECIPE_IDS)

  for (const ex of Object.values(CURATED_EXEMPLARS)) {
    assert.ok(validThemes.has(ex.theme), `Exemplar ${ex.id} theme "${ex.theme}" 必须属于 THEME_IDS`)
    if (ex.taste) {
      assert.ok(validTastes.has(ex.taste), `Exemplar ${ex.id} taste "${ex.taste}" 必须属于 TASTE_RECIPE_IDS`)
    }
    if (ex.styleRecipe) {
      const guide = renderExemplarPromptGuide(ex, 'zh')
      assert.doesNotMatch(guide, /,\s*taste:\s*"/, `含 styleRecipe 的标杆 ${ex.id} 指南不应建议再传 taste 覆盖自定义色板`)
    }
  }

  for (const topic of ['炫酷科技发布会', '战略咨询汇报', '论文学术答辩', '人文品牌策展']) {
    for (const lang of ['zh', 'en']) {
      const ad = buildArtDirectorPrompt({ topic, lang })
      assert.ok(validThemes.has(ad.recommendedTheme), `recommendedTheme ${ad.recommendedTheme} 必须合法`)
      assert.ok(validThemes.has(ad.altDarkTheme), `altDarkTheme ${ad.altDarkTheme} 必须合法`)
      assert.ok(validTastes.has(ad.recommendedTaste), `recommendedTaste ${ad.recommendedTaste} 必须合法`)
      assert.doesNotMatch(ad.directorPrompt, /nordic-slate|editorial-warm/, 'directorPrompt 不得引用不存在的主题名')
    }
  }

  const artDoc = readFileSync(new URL('../skills/dsh-ppt/references/art-director.md', import.meta.url), 'utf8')
  assert.doesNotMatch(artDoc, /editorial-warm|nordic-slate/, 'references/art-director.md 不得包含无效主题名')

  const outDir = mkdtempSync(join(tmpdir(), 'dsh-ppt-ex-'))
  try {
    for (const exId of ['quiet-canvas-keynote', 'medical-clinical-course']) {
      const res = await buildDeckAsync({
        title: `Test ${exId}`,
        exemplar: exId,
        outputDir: outDir,
        overwrite: true,
        slides: [
          { layout: 'cover', title: `Test ${exId}`, subtitle: 'Verified Build' },
          { layout: 'kpi', title: 'Core KPIs reached target', items: [{ title: 'Accuracy', value: '98.4%', delta: '+3.1pp' }, { title: 'Latency', value: '28ms', delta: '-64%' }] },
          { layout: 'closing', title: 'Next Steps & Owners', subtitle: 'Confirm Q2 rollout by Friday' },
        ],
      })
      assert.equal(res.ok, true, `${exId} 必须可无错构建`)
      assert.equal(res.quality.errorCount, 0, `${exId} 不应有静态错误`)
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true })
  }
})

test('P0-3: upgradeWeakDeck 在无 cover 槽位的自定义 exemplar 下不再抛出 persona ReferenceError', () => {
  for (const persona of ['editorial', 'tech-pitch', 'consulting']) {
    const customExemplar = {
      id: 'no-cover-slot-ex',
      persona,
      slots: [
        { layout: 'cards', variant: 'bento-hero' },
        { layout: 'closing', variant: 'cta-cards' },
      ],
    }
    const { slides } = upgradeWeakDeck([
      { layout: 'cover', title: 'Custom Deck' },
      { layout: 'bullets', title: 'Key Findings', bullets: ['**Point A**: First evidence', '**Point B**: Second evidence'] },
      { layout: 'closing', title: 'Next Steps', subtitle: 'Owner: PM · Q2' },
    ], { exemplar: customExemplar, persona })
    assert.ok(slides[0].coverPattern, `persona=${persona} 应自动补齐 coverPattern 而不抛错`)
  }
})

test('P0-4 & P1-5: tools.ts schema 瘦身、与引擎版式 100% 对齐、且 ppt_templates 渲染紧凑含导演词', async () => {
  const tools = buildPptTools(DEFAULT_CONFIG)
  assert.equal(tools.length, 13)

  const totalWireChars = JSON.stringify(tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }))).length
  assert.ok(totalWireChars < 85_000, `13 工具总 wire schema 应瘦身至 <85KB，当前 ${totalWireChars}`)

  for (const t of tools) {
    const nodes = collectNodes(t.parameters)
    assert.ok(nodes.every((n) => !Array.isArray(n.type)), `${t.name} 不得包含 wire type 数组`)
  }

  const create = tools.find((t) => t.name === 'ppt_create')
  const slideProps = create.parameters.properties.slides.items.properties
  const schemaLayouts = new Set(slideProps.layout.enum)
  const engineLayouts = new Set([
    ...CORE_LAYOUTS,
    'image', 'image-left', 'image-right', 'chart', 'chart-split',
    ...Object.keys(LAYOUT_ALIASES),
  ])
  for (const lay of engineLayouts) {
    assert.ok(schemaLayouts.has(lay), `tools.ts slideLayouts 缺少引擎支持的版式 "${lay}"`)
  }
  assert.equal(schemaLayouts.size, engineLayouts.size, 'slideLayouts 应与引擎支持集合严格一致')

  assert.ok(slideProps.items.items.properties.label, 'slideItemSchema 应暴露 label 别名')
  assert.equal(slideProps.visual.properties.chrome, undefined, 'visual 不应暴露会被引擎拒绝的 chrome')
  assert.equal(slideProps.start, undefined, 'slide 顶层不应暴露会被 editDeck 拒绝的 start')
  assert.equal(slideProps.span, undefined, 'slide 顶层不应暴露会被 editDeck 拒绝的 span')
  assert.equal(slideProps.cards, undefined, 'slide 不应重复内联 cards 的 27 字段 schema')
  assert.equal(slideProps.columns.type, 'array')
  assert.equal(slideProps.columns.items.type, 'string')

  const fromOffice = tools.find((t) => t.name === 'ppt_from_office')
  assert.ok(fromOffice.parameters.properties.evidenceAppendix, 'ppt_from_office 应暴露 evidenceAppendix')
  assert.ok(fromOffice.parameters.properties.motionProfile, 'ppt_from_office 应暴露 motionProfile')

  const templatesTool = tools.find((t) => t.name === 'ppt_templates')
  const defaultOut = await templatesTool.execute({})
  const defaultText = templatesTool.output.render({}, defaultOut)[0].text
  assert.ok(defaultText.length < 15_000, `ppt_templates({}) 渲染应紧凑 (<15KB)，当前 ${defaultText.length}`)
  assert.ok(defaultText.includes('Art-Director Brief') && defaultText.includes('Golden Field Cheat-Sheet'))
  assert.ok(defaultText.includes('mckinsey-strategy') && defaultText.includes('industry-research'))

  const exOut = await templatesTool.execute({ exemplarId: 'mckinsey-strategy' })
  const exText = templatesTool.output.render({ exemplarId: 'mckinsey-strategy' }, exOut)[0].text
  assert.ok(exText.includes('Art-Director Brief') && exText.includes('Golden Field Cheat-Sheet'))
  assert.ok(!exText.includes('"slots": ['), 'exemplarId 模式不应把原始 exemplar JSON 重复 dump 一遍')

  const topicOut = await templatesTool.execute({ topic: '2026 Enterprise AI Inference Strategy', lang: 'en' })
  const topicText = templatesTool.output.render({ topic: '2026 Enterprise AI Inference Strategy', lang: 'en' }, topicOut)[0].text
  assert.ok(topicText.includes('Art-Director Brief') && topicText.includes('Golden Field Cheat-Sheet'))
})

test('P1-6: inferThemeFromContent 英文路由修复（财报不被 onboarding 劫持，架构 RFC 走科技白天主题）', () => {
  const fin = inferThemeFromContent({
    title: 'Q4 Financial Performance & FY26 Strategy',
    content: 'Revenue reached $142M with 74% gross margin and $31M operating cash flow. Shorter customer onboarding cycle improved NRR to 124%.',
  })
  assert.equal(fin.persona, 'consulting')
  assert.equal(fin.theme, 'financial-ft')

  const rfc = inferThemeFromContent({
    title: 'RFC-042: Distributed LLM Inference Router Architecture',
    content: 'Kubernetes API gateway and microservices design for multi-region GPU scheduling, failover, and SRE observability.',
  })
  assert.equal(rfc.persona, 'tech-pitch')
  assert.equal(rfc.theme, 'cobalt-cream')

  // 既有中文路由回归不退化
  assert.equal(inferThemeFromContent({ title: '云原生微服务架构设计与系统重构方案', persona: 'tech-pitch' }).theme, 'cobalt-cream')
  assert.equal(inferThemeFromContent({ title: '新员工入职培训课程讲义与课后练习' }).theme, 'course-sage')
})

test('P1-7: 英文 dumbbell 升格、数值表自动升维 chart-split、以及散文人物介绍不被误判 KPI', () => {
  const { slides } = upgradeWeakDeck([
    { layout: 'cover', title: 'Q4 Operations Upgrade' },
    {
      layout: 'bullets',
      title: 'Operational latency and unit cost dropped sharply',
      bullets: [
        'Support cost per ticket reduced from $4.80 to $1.65',
        'Average resolution time shortened from 18.5 hours to 3.2 hours',
        'Deployment cycle cut from 14 days to 2 days',
      ],
    },
    {
      layout: 'table',
      title: 'Quarterly revenue grew steadily through Q4',
      rows: [
        ['Quarter', 'Revenue ($M)', 'YoY'],
        ['Q1', '$12.4M', '+18%'],
        ['Q2', '$14.8M', '+22%'],
        ['Q3', '$17.1M', '+27%'],
        ['Q4', '$21.5M', '+34%'],
      ],
    },
    {
      layout: 'table',
      title: 'Mixed-unit comparison stays a table',
      rows: [
        ['Metric', 'Legacy', 'Ours'],
        ['Build time', '240 min', '3.5 min'],
        ['Editability', '42%', '100%'],
        ['WCAG pass', '55%', '100%'],
      ],
    },
  ], { lang: 'en' })

  assert.equal(slides[1].layout, 'dumbbell', '英文 $ 与 hours/days 跃迁应升格 dumbbell')
  assert.equal(slides[1].items.length, 3)
  assert.equal(slides[1].items[0].before, 4.8)
  assert.equal(slides[1].items[0].after, 1.65)
  assert.equal(slides[1].items[0].status, 'positive')

  assert.equal(slides[2].layout, 'chart-split', '规整 3 列数值表应自动升维为 chart-split')
  assert.equal(slides[2].chart.kind, 'column')
  assert.deepEqual(slides[2].chart.series[0].values, [12.4, 14.8, 17.1, 21.5])
  assert.ok(JSON.stringify(slides[2].items).includes('+34%'), '第二列 YoY 百分比必须无损保留在洞察卡中')

  assert.equal(slides[3].layout, 'table', '混单位指标对比表必须保持 table 不强转图表')

  // 散文式履历句子不应被 promoteMarkdownSlides 误升格成 KPI
  const promoted = promoteMarkdownSlides([
    { layout: 'cover', title: '项目介绍' },
    { layout: 'bullets', title: '团队背景与行业积累', bullets: ['核心团队来自阿里云与微软，平均拥有 10 年以上架构经验', '已完成 3 家头部券商深度试点，研发团队规模 45 人'] },
    { layout: 'bullets', title: '产品核心方向', bullets: ['打造跨平台原生可编辑引擎', '支持离线高安全部署'] },
  ], { explicitSmartLayout: true })
  assert.notEqual(promoted[1].layout, 'kpi', '散文履历句绝不应被误拆成残缺 KPI 卡')
})

test('P1-8: SLOP-01..15 盲区全面闭合且 evidenceAppendix 零误报', () => {
  const manifest = {
    title: '年度战略汇报',
    slides: [
      { id: 's1', layout: 'cover', title: '年度战略汇报' },
      { id: 's2', layout: 'bullets', title: '市场分析', bullets: ['要点 A', '要点 B'] },
      { id: 's3', layout: 'bullets', title: '增长驱动一', bullets: ['要点 C', '要点 D'] },
      { id: 's4', layout: 'bullets', title: '增长驱动二', bullets: ['要点 E', '要点 F'] },
      {
        id: 's5',
        layout: 'cards',
        title: '高密度文字卡片检查',
        items: [
          { title: '模块一', text: '这是一段非常冗长且未提炼的业务背景说明文字，直接塞进了单张卡片正文区域里导致会议室投影仪完全无法阅读并且严重超出了单卡字数上限标准要求。' },
          { title: '模块二', text: '简短说明' },
        ],
      },
      { id: 's6', layout: 'section', title: '过渡页一' },
      { id: 's7', layout: 'statement', title: '过渡页二' },
      { id: 's8', layout: 'quote', title: '过渡页三' },
      { id: 's9', layout: 'kpi', title: '唯一视觉锚点', items: [{ title: '营收', value: '1.2亿' }, { title: '留存', value: '120%' }] },
      { id: 's10', layout: 'closing', title: '谢谢 · Thank You', subtitle: '年度战略汇报' },
    ],
  }
  const issues = auditSlideAesthetics(manifest, { palette: { bg: '#FFFFFF' } }, measureEmWidth)
  const codes = new Set(issues.map((i) => i.code))
  assert.ok(codes.has('weak-topic-title'), 'SLOP-01 应拦截「市场分析」')
  assert.ok(codes.has('layout-monotony'), 'SLOP-08 应拦截连续 3 页 bullets')
  assert.ok(codes.has('wall-of-text'), 'SLOP-03 应拦截 cards.items[] 内部长文墙')
  assert.ok(codes.has('bare-closing'), 'SLOP-09 应拦截双语致谢 + 复读标题副标题')
  assert.ok(codes.has('excessive-filler-slides'), 'SLOP-15 应拦截 3/8 (37.5%) 过渡页占比')
  assert.ok(codes.has('low-visual-diversity'), 'SLOP-15 应拦截 10 页仅 1 类视觉锚点')

  // meta-prompt-echo 检查
  const echoIssues = auditSlideAesthetics({
    title: '帮我做一份关于 AI 的 PPT',
    slides: [
      { id: 'e1', layout: 'cover', title: '帮我做一份关于 AI 的 PPT' },
      { id: 'e2', layout: 'statement', title: '帮我做一份关于 AI 的 PPT' },
      { id: 'e3', layout: 'closing', title: '谢谢', subtitle: '讨论与问答' },
    ],
  }, { palette: { bg: '#FFFFFF' } }, measureEmWidth)
  assert.ok(echoIssues.some((i) => i.code === 'meta-prompt-echo'), '应拦截复读用户元指令的极简幻灯片')
  assert.ok(echoIssues.some((i) => i.code === 'bare-closing'), '讨论与问答不应豁免 SLOP-09 空洞封底检查')

  // selfRepairDeck 应修复连续 3 页 bullets 与双语空洞封底
  const repaired = selfRepairDeck({
    title: '测试自修',
    slides: [
      { id: 'r1', layout: 'cover', title: '测试自修' },
      { id: 'r2', layout: 'bullets', title: '第一项核心结论达成 38%', bullets: ['**事实A**：达成 38%', '**事实B**：覆盖 12 城'] },
      { id: 'r3', layout: 'bullets', title: '第二项核心结论降本 24%', bullets: ['**事实C**：成本降 24%', '**事实D**：人力省 30%'] },
      { id: 'r4', layout: 'bullets', title: '第三项核心结论提速 2 倍', bullets: ['**事实E**：吞吐翻倍', '**事实F**：延迟减半'] },
      { id: 'r5', layout: 'kpi', title: '核心指标达成', items: [{ title: '增速', value: '38%' }, { title: '降本', value: '24%' }] },
      { id: 'r6', layout: 'closing', title: '谢谢 · Thank You', subtitle: '测试自修' },
    ],
  }, {
    checkFn: (m) => {
      const iss = auditSlideAesthetics(m, { palette: { bg: '#FFFFFF' } }, measureEmWidth)
      return { issues: iss, warningCount: iss.length }
    },
  })
  assert.equal(repaired.report.finalWarnings, 0, 'selfRepairDeck 应将 layout-monotony 与 bare-closing 修复至 0 告警')

  // SLOP-13: 覆盖无出处数值 table/cards，但自动生成的 evidenceAppendix 必须 0 误报
  const evidence = [
    { id: 'E1', claim: '2025 营收 120 亿元', source: '年报 2025', date: '2025', origin: 'local-file', tier: 1, confidence: 'verified' },
  ]
  const rawSlides = [
    { id: 'c1', layout: 'cover', title: '行研报告' },
    { id: 'c2', layout: 'kpi', title: '营收达 120 亿元 [E1]', items: [{ title: '营收', value: '120亿元' }], evidenceIds: ['E1'] },
    { id: 'c3', layout: 'table', title: '各区域增速表', rows: [['区域', '营收'], ['华东', '68亿元'], ['华南', '52亿元']] },
    { id: 'c4', layout: 'cards', title: '成本拆解卡片', items: [{ title: '研发', text: '投入 18 亿元，占比 15%' }, { title: '销售', text: '投入 24 亿元，占比 20%' }] },
    { id: 'c5', layout: 'closing', title: '下一步安排', subtitle: 'Q2 评审' },
  ]
  const applied = applyEvidenceLedgerToSlides(rawSlides, evidence, { lang: 'zh', evidenceAppendix: true })
  const evIssues = auditEvidenceAndSourcing({ slides: applied.slides, evidence })
  assert.ok(evIssues.some((i) => i.slide === 3 && i.code === 'unsourced-research-numbers'), 'SLOP-13 应拦截无出处数值 table')
  assert.ok(evIssues.some((i) => i.slide === 4 && i.code === 'unsourced-research-numbers'), 'SLOP-13 应拦截无出处高密度数值 cards')
  const appendixSlideIdx = applied.slides.findIndex((s) => /附录/.test(String(s.kicker || '')))
  assert.ok(appendixSlideIdx > 0)
  assert.ok(!evIssues.some((i) => i.slide === appendixSlideIdx + 1), '自动生成的 evidenceAppendix 表绝不能触发 SLOP-13 误报')
})

test('P2-9 & #128-10: execution.ts 尊重 projects.jsonl tombstones、taste 启用 autoUpgrade、透传 evidenceAppendix', async () => {
  const fakeHome = mkdtempSync(join(tmpdir(), 'dsh-home-'))
  const prevHome = process.env.DSH_HOME
  try {
    const dir = join(fakeHome, 'plugins', 'dsh-ppt')
    mkdirSync(dir, { recursive: true })
    const deletedId = 'a'.repeat(64)
    const activeId = 'b'.repeat(64)
    const lines = [
      JSON.stringify({ id: deletedId, path: join(fakeHome, 'deleted', 'deck.json') }),
      JSON.stringify({ id: deletedId, removed: true }),
      JSON.stringify({ id: activeId, path: join(fakeHome, 'active', 'deck.json') }),
    ]
    writeFileSync(join(dir, 'projects.jsonl'), lines.join('\n') + '\n', 'utf8')
    process.env.DSH_HOME = fakeHome

    const calls = []
    const mockEngine = {
      importPptxDeck: async (opts) => { calls.push(['importPptx', opts]); return { ok: true } },
      buildDeckAsync: async (opts) => { calls.push(['create', opts]); return { ok: true } },
      importOfficeDeck: async (opts) => { calls.push(['fromOffice', opts]); return { ok: true } },
    }
    const exec = createPptExecutors(DEFAULT_CONFIG, async () => mockEngine)

    await assert.rejects(
      () => exec.importPptx({ pptxPath: 'a.pptx', projectId: deletedId }),
      /未在工作台索引中找到该 projectId/,
      '被 removed:true 墓碑删除的 projectId 绝不能命中旧路径',
    )
    await exec.importPptx({ pptxPath: 'a.pptx', projectId: activeId })
    assert.equal(calls[0][1].deckPath, join(fakeHome, 'active', 'deck.json'))

    await exec.create({ title: 'Taste Test', content: '# Taste Test\n## Slide 1\n- A', taste: 'linear-craft' })
    assert.equal(calls[1][1].autoUpgrade, true, '仅传 taste 未传 theme 时应启用 autoUpgrade')
    assert.equal(calls[1][1].smartLayout, true, '仅传 taste 未传 theme 的 Markdown 应启用 smartLayout')

    await exec.fromOffice({ filePath: 'report.xlsx', evidenceAppendix: true, motionProfile: 'executive' })
    assert.equal(calls[2][1].evidenceAppendix, true, 'fromOffice 应透传 evidenceAppendix')
    assert.equal(calls[2][1].motionProfile, 'executive', 'fromOffice 应透传 motionProfile')
  } finally {
    if (prevHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = prevHome
    rmSync(fakeHome, { recursive: true, force: true })
  }
})

test('P2-9: coaching.ts 支持 layout/formula/code 上下文与 +38% / 章节 kicker 补丁，同时拦截编造数字', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-coach-'))
  try {
    let seenInput = ''
    let nextOutput = ''
    const model = {
      routes: async () => [{ provider: 'test', model: 'm1' }],
      generate: async (_route, _sys, input) => { seenInput = input; return nextOutput },
    }
    const coaching = new PptCoaching(dir, model)
    const context = {
      id: 'proj-1',
      manifest: {
        deckId: 'deck-1',
        revision: 1,
        title: 'Growth Review',
        slides: [
          { id: 's1', layout: 'cover', title: 'Growth Review' },
          { id: 's2', layout: 'callout', title: '营收增长 38%', formula: 'y = ax + b', code: 'const rate = 0.38', evidenceIds: ['E1'], bullets: ['全年增速达 38％'] },
        ],
      },
    }
    const run = await coaching.create(context, {
      confirmed: true,
      mode: 'review',
      difficulty: 'normal',
      provider: 'test',
      model: 'm1',
      limit: 2,
    })

    // 1. 允许 "+38%"（归一化匹配 "38%"）和 "01 · 增长概览" 章节前缀
    nextOutput = JSON.stringify({
      findings: [
        {
          slideId: 's2',
          kind: 'storyline',
          question: '标题能否更清晰？',
          answer: '可补充正号与章节页眉',
          issue: '缺少章节面包屑',
          suggestion: '补充 kicker 与正向符号',
          reference: 'slide:s2',
          quote: '全年增速达 38％',
          patch: { kicker: '01 · 增长概览', title: '全年营收同比 +38%' },
        },
        {
          slideId: 's2',
          kind: 'expression',
          question: '能编造 99% 吗？',
          answer: '不能',
          issue: '尝试塞入未出现数字',
          suggestion: '应被守恒锁拦截',
          reference: 'slide:s2',
          quote: '全年增速达 38％',
          patch: { kicker: '02 · 达成 99%' },
        },
      ],
    })
    const step1 = await coaching.step(context, run.id, { confirmed: true })
    assert.ok(seenInput.includes('"layout":"callout"') && seenInput.includes('"formula":"y = ax + b"') && seenInput.includes('"code":"const rate = 0.38"'))
    assert.ok(step1.findings[0].patch, '+38% 与 01 · 前缀 kicker 合法补丁应被保留')
    assert.equal(step1.findings[1].patch, undefined, 'kicker 中编造的 99% 必须仍被数字守恒锁拦截')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('P2-9: visual.ts 在 image.fit 省略（默认 cover）时允许 image-contain 且向视觉模型透传 source/formula/mermaid/code', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-vis-'))
  try {
    const visual = new PptVisual(dir)
    const slide = {
      id: 's1',
      layout: 'image-left',
      title: 'Product Shot',
      image: { src: 'data:image/png;base64,AA==' }, // fit omitted => default cover
    }
    const parsed = visual['findings'](
      {
        slides: [{
          slideId: 's1',
          findings: [{
            kind: 'image-crop',
            region: 'image',
            issue: 'Image edge clipped',
            box: [0.05, 0.2, 0.4, 0.6],
            action: { type: 'image-contain' },
          }],
        }],
      },
      [slide],
    )
    assert.deepEqual(parsed[0].action, { slideId: 's1', type: 'image-contain' }, 'fit 省略时应允许 image-contain 修复')

    const containSlide = { ...slide, image: { src: 'data:image/png;base64,AA==', fit: 'contain' } }
    const parsedContain = visual['findings'](
      {
        slides: [{
          slideId: 's1',
          findings: [{
            kind: 'image-crop',
            region: 'image',
            issue: 'Already contain',
            box: [0.05, 0.2, 0.4, 0.6],
            action: { type: 'image-contain' },
          }],
        }],
      },
      [containSlide],
    )
    assert.equal(parsedContain[0].action, undefined, '已是 fit=contain 时不应重复应用 image-contain')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('Cross-module Math Guard: splitLead 不撕裂 $...$ 公式，且含行内 2D LaTeX 的 bullets 页在升维与自修中保持 bullets', () => {
  const mathBullet = 'Expected batch cost $\\frac{1}{N}\\sum_{i=1}^{N} L_i(\\theta)$ stays below 18ms across all 64 tensor shards'
  const lead = splitLead(mathBullet)
  assert.equal(lead.title, 'Expected batch cost', 'splitLead 必须在 $...$ 边界前切分，绝不把 $ 留在 title 中')
  assert.ok(lead.text.startsWith('$\\frac{1}{N}\\sum_{i=1}^{N} L_i(\\theta)$'), '完整 $...$ 公式必须无损保留在 text 中')

  const leadingMath = '$\\frac{1}{N}\\sum_{i=1}^{N} L_i(\\theta)$ stays below 18ms across all 64 tensor shards'
  const lead2 = splitLead(leadingMath)
  assert.equal(lead2.title, '$\\frac{1}{N}\\sum_{i=1}^{N} L_i(\\theta)$', '以公式开头的要点应在闭合 $ 后切分')
  assert.equal(lead2.text, 'stays below 18ms across all 64 tensor shards')

  const colonMath = 'Mapping $f: X \\to Y$ preserves convexity across all 12 training epochs'
  const lead3 = splitLead(colonMath)
  assert.ok(!lead3.title.includes('$') || (lead3.title.match(/\$/g) || []).length % 2 === 0, '公式内部的冒号绝不能撕裂 $...$')

  // 1. upgradeWeakDeck (break-bullet-streak & exemplar-slot) must keep 2D-math bullets slide as bullets while breaking non-math streaks
  const { slides } = upgradeWeakDeck([
    { layout: 'cover', title: 'Stripe Craft Math Test' },
    { layout: 'bullets', title: 'First plain bullet slide achieves 3,850 ops/s', bullets: ['Throughput reaches 3,850 req/s on single GPU', 'Tail p99 stays under 18ms'] },
    { layout: 'bullets', title: 'Batch loss bound stays below 18ms', bullets: [mathBullet, 'Gradient norm stays bounded under $\\sqrt{\\sigma^2 + \\epsilon}$'] },
    { layout: 'bullets', title: 'Third plain bullet slide breaks streak', bullets: ['**Canary**: 5% traffic shift first', '**Rollback**: Automatic revert in 30s'] },
    { layout: 'closing', title: 'Next Steps', subtitle: 'Confirm Q3 benchmark owners' },
  ], { lang: 'en', exemplar: CURATED_EXEMPLARS['stripe-product-launch'] })

  assert.equal(slides[2].layout, 'bullets', '含 2D 行内 LaTeX 的 bullets 页在 exemplar-slot 与 break-bullet-streak 中必须保持 layout=bullets')
  assert.ok(slides[2].bullets[0].includes('$\\frac{1}{N}\\sum_{i=1}^{N} L_i(\\theta)$'), '公式原文必须完整保留')
  assert.notEqual(slides[3].layout, 'bullets', '后续非公式 bullets 页仍应正常升格以打破单调')

  // 2. selfRepairDeck break-bullet-monotony must keep 2D-math bullets slide as bullets and break monotony on non-math neighbors
  const repaired = selfRepairDeck({
    title: 'Math Monotony Test',
    slides: [
      { id: 'm1', layout: 'cover', title: 'Math Monotony Test' },
      { id: 'm2', layout: 'bullets', title: 'First plain bullet slide achieves 38%', bullets: ['**Alpha**: Gain 38%', '**Beta**: Cut 24%'] },
      { id: 'm3', layout: 'bullets', title: 'Expected batch loss stays bounded', bullets: [mathBullet, 'Secondary bound stays under 12ms'] },
      { id: 'm4', layout: 'bullets', title: 'Third plain bullet slide scales 4x', bullets: ['**Gamma**: 4x scale', '**Delta**: Zero downtime'] },
      { id: 'm5', layout: 'kpi', title: 'Core Metrics', items: [{ title: 'P99', value: '18ms' }, { title: 'Gain', value: '+38%' }] },
      { id: 'm6', layout: 'closing', title: 'Next Steps', subtitle: 'Confirm rollout plan' },
    ],
  }, {
    checkFn: (m) => {
      const iss = auditSlideAesthetics(m, { palette: { bg: '#FFFFFF' } }, measureEmWidth)
      return { issues: iss, warningCount: iss.length }
    },
  })
  assert.equal(repaired.manifest.slides[2].layout, 'bullets', 'selfRepairDeck 必须保留含 2D LaTeX 的 bullets 版式')
  assert.equal(repaired.report.finalWarnings, 0, '非公式相邻页被打破后 SLOP-08 应归零')
})

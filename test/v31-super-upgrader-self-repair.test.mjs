import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  CURATED_EXEMPLARS,
  checkManifest,
  upgradeWeakDeck,
  resequenceSlidesToExemplar,
  selfRepairDeck,
  synthesizeActionTitle,
  buildDeckAsync,
} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { PptWorkbench } from '../lib/workbench.js'
import { buildPptTools } from '../lib/tools.js'

const CLI_PATH = resolve(process.cwd(), 'skills/dsh-ppt/scripts/build-deck.mjs')

function inTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v31-'))
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => rmSync(dir, { recursive: true, force: true }))
}

function hasWireTypeArray(node) {
  if (!node || typeof node !== 'object') return false
  if (Array.isArray(node.type)) return true
  for (const val of Object.values(node)) {
    if (Array.isArray(val)) {
      if (val.some(hasWireTypeArray)) return true
    } else if (val && typeof val === 'object') {
      if (hasWireTypeArray(val)) return true
    }
  }
  return false
}

test('v0.31: resequenceSlidesToExemplar aligns scrambled draft to exemplar narrative arc and preserves chapter boundaries', () => {
  const scrambled = [
    { layout: 'cover', title: '2026 企业智能体战略报告' },
    { layout: 'gantt', title: '四季度实施排期路线图', columns: ['Q1', 'Q2', 'Q3', 'Q4'], items: [{ title: '试点', start: 0, span: 1 }] },
    { layout: 'table', title: '区域执行定量对比', rows: [['区域', '达成率'], ['华东', '118%']] },
    { layout: 'comparison', title: '现有流程痛点与瓶颈', items: [{ title: '手工低效', text: '返工高' }, { title: '自动门禁', text: '零返工' }] },
    { layout: 'kpi', title: '核心财务指标', items: [{ value: '4.8亿', title: 'ARR', delta: '+45%' }, { value: '126%', title: 'NRR' }] },
    { layout: 'statement', title: '核心判断：智能化编排重塑 60% 交付成本', subtitle: '以标准化底座驱动复利增长' },
    { layout: 'closing', title: '立即启动三项动作', subtitle: '董事会审批' },
  ]

  const res = resequenceSlidesToExemplar(scrambled, CURATED_EXEMPLARS['mckinsey-strategy'])
  assert.equal(res.orderChanged, true)
  assert.ok(res.movedCount >= 3)
  assert.equal(res.slides[0].layout, 'cover', 'cover must stay first')
  assert.equal(res.slides.at(-1).layout, 'closing', 'closing must stay last')
  const idxStatement = res.slides.findIndex((s) => s.layout === 'statement')
  const idxKpi = res.slides.findIndex((s) => s.layout === 'kpi')
  const idxTable = res.slides.findIndex((s) => s.layout === 'table')
  const idxGantt = res.slides.findIndex((s) => s.layout === 'gantt')
  assert.ok(idxStatement < idxKpi, 'executive thesis should precede KPIs')
  assert.ok(idxKpi < idxTable, 'headline KPIs should precede detailed table proof')
  assert.ok(idxTable < idxGantt, 'gantt roadmap should sit at the end before closing')

  // Chapter preservation test: 2 explicit section dividers must keep chapter members grouped
  const chaptered = [
    { layout: 'cover', title: '分章报告' },
    { layout: 'section', title: '第一章：现状' },
    { layout: 'gantt', title: '第一章时间线', columns: ['M1', 'M2'], items: [{ title: 'A', start: 0, span: 1 }] },
    { layout: 'kpi', title: '第一章核心指标', items: [{ value: '98%', title: 'SLA' }] },
    { layout: 'section', title: '第二章：规划' },
    { layout: 'gantt', title: '第二章排期', columns: ['Q1', 'Q2'], items: [{ title: 'B', start: 0, span: 1 }] },
    { layout: 'kpi', title: '第二章目标指标', items: [{ value: '200%', title: 'ROI' }] },
    { layout: 'closing', title: '结束' },
  ]
  const chRes = resequenceSlidesToExemplar(chaptered, CURATED_EXEMPLARS['mckinsey-strategy'])
  assert.equal(chRes.slides[1].title, '第一章：现状')
  assert.equal(chRes.slides[2].title, '第一章核心指标', 'chapter 1 KPI reordered before chapter 1 gantt')
  assert.equal(chRes.slides[3].title, '第一章时间线')
  assert.equal(chRes.slides[4].title, '第二章：规划', 'chapter 2 boundary preserved intact')
  assert.equal(chRes.slides[5].title, '第二章目标指标')
  assert.equal(chRes.slides[6].title, '第二章排期')
})

test('v0.31: synthesizeActionTitle upgrades weak noun labels across KPI/dumbbell/chart/table/quadrant without inventing numbers or overflowing', () => {
  const kpiSlide = {
    layout: 'kpi',
    title: '财务数据',
    items: [
      { title: '年度总营收', value: '47.3亿', delta: '+105%' },
      { title: '自由现金流', value: '8.7亿', delta: '+28%' },
    ],
  }
  const kpiTitle = synthesizeActionTitle(kpiSlide, false)
  assert.ok(kpiTitle && kpiTitle.includes('47.3亿'), `expected grounded KPI figure in "${kpiTitle}"`)

  const dbSlide = {
    layout: 'dumbbell',
    title: 'Q4 性能提升',
    items: [
      { title: '响应延迟', before: 180, after: 42, unit: 'ms', status: 'positive' },
      { title: '覆盖率', before: 54, after: 92, unit: '%', status: 'positive' },
    ],
  }
  const dbTitle = synthesizeActionTitle(dbSlide, false)
  assert.ok(dbTitle && dbTitle.includes('180ms') && dbTitle.includes('42ms'), `expected before→after in "${dbTitle}"`)

  const chartSlide = {
    layout: 'chart',
    title: 'Financials',
    chart: {
      kind: 'column',
      unit: 'M',
      categories: ['Q1', 'Q2', 'Q3', 'Q4'],
      series: [{ name: 'Revenue', values: [40, 52, 65, 80] }],
    },
  }
  const chartTitle = synthesizeActionTitle(chartSlide, true)
  assert.ok(chartTitle && chartTitle.includes('80M') && chartTitle.includes('+100%'), `expected exact +100% chart proof in "${chartTitle}"`)

  const tableSlide = {
    layout: 'table',
    title: '03. 核心数据',
    rows: [
      ['业务线', '营收', '达成率'],
      ['企业云', '12.4亿', '114%'],
      ['智能体平台', '8.2亿', '128%'],
    ],
  }
  const tableTitle = synthesizeActionTitle(tableSlide, false)
  assert.ok(tableTitle && /\d/.test(tableTitle), `expected grounded table figure in "${tableTitle}"`)

  const boundSlide = {
    layout: 'kpi',
    title: '财务数据',
    items: [{ title: 'ARR', value: '{{arr_total}}' }],
  }
  assert.equal(synthesizeActionTitle(boundSlide, false), null, 'dataModel-bound slide must never be mutated')
})

test('v0.31: Zero-LLM Self-Repair Loop fixes nightmare SLOP-01..12 & density defects losslessly before commit', () => inTempDir(async (dir) => {
  const nightmare = {
    theme: 'consulting',
    language: 'zh',
    brand: { backgroundColor: '#FF0055', textColor: '#FFCCDD' },
    slides: [
      { id: 's1', layout: 'cover', title: '2026 年度数字化转型综合战报与全链路治理方案：全面打通研发运营与客户成功核心指标' },
      { id: 's2', layout: 'bullets', kicker: '要点', title: '财务情况', bullets: ['本季度华东与华南核心企业客户续约率达到百分之九十八点五并且整体云成本通过精细化调度压降了三成以上。其次我们的自动化质检链路上线后彻底消除了跨团队人工反复核对导致的交付延迟问题。'] },
      { id: 's3', layout: 'kpi', kicker: '要点', title: '核心指标', items: Array.from({ length: 6 }, (_, i) => ({ title: `指标${i + 1}`, value: `${(i + 1) * 15}%`, status: 'positive' })) },
      { id: 's4', layout: 'chart', kicker: '要点', title: '市场分析', chart: { kind: 'pie', categories: ['华东', '华北', '华南', '西南', '华中', '西北', '海外'], series: [{ name: '份额', values: [30, 22, 16, 11, 9, 7, 5] }] } },
      { id: 's5', layout: 'chart', title: '季度营收趋势', chart: { kind: 'column', categories: ['2022', '2023', '2024', '2025', '2026E'], series: [{ name: '营收', values: [42, 58, 79, 105, 148] }] } },
      { id: 's6', layout: 'table', title: '明细台账', rows: [['项目', '金额'], ...Array.from({ length: 12 }, (_, i) => [`P${i + 1}`, `${(i + 1) * 10}万`])] },
      { id: 's7', layout: 'cards', title: '核心支柱一', items: [{ title: 'A1', text: '说明1' }, { title: 'A2', text: '说明2' }, { title: 'A3', text: '说明3' }] },
      { id: 's8', layout: 'cards', title: '核心支柱二', items: [{ title: 'B1', text: '说明1' }, { title: 'B2', text: '说明2' }, { title: 'B3', text: '说明3' }] },
      { id: 's9', layout: 'cards', title: '核心支柱三', items: [{ title: 'C1', text: '说明1' }, { title: 'C2', text: '说明2' }, { title: 'C3', text: '说明3' }] },
      { id: 's10', layout: 'cards', title: '核心支柱四', items: [{ title: 'D1', text: '说明1' }, { title: 'D2', text: '说明2' }, { title: 'D3', text: '说明3' }] },
      { id: 's11', layout: 'closing', title: '谢谢！' },
    ],
  }

  const before = checkManifest(nightmare)
  assert.ok(before.warningCount >= 10, `expected >=10 warnings before repair, got ${before.warningCount}`)

  const repaired = selfRepairDeck(nightmare, { checkFn: checkManifest, maxPasses: 2, maxSlides: 60, lang: 'zh' })
  assert.ok(repaired.report.fixedCount >= 9, `expected >=9 warnings fixed, got ${repaired.report.fixedCount}`)
  assert.equal(repaired.report.finalWarnings, 0, `expected 0 warnings after self-repair, remaining: ${JSON.stringify(checkManifest(repaired.manifest).issues)}`)

  // Verify 100% lossless preservation across repairs
  const kpiItems = repaired.manifest.slides.filter((s) => s.layout === 'kpi').flatMap((s) => s.items || [])
  assert.equal(kpiItems.length, 6, 'all 6 KPI items preserved across split slides')
  const tableDataRows = repaired.manifest.slides.filter((s) => s.layout === 'table').flatMap((s) => (s.rows || []).slice(1))
  assert.equal(tableDataRows.length, 12, 'all 12 table data rows preserved across paginated slides')
  const pieConverted = repaired.manifest.slides.find((s) => s.chart?.categories?.length === 7)
  assert.equal(pieConverted.chart.kind, 'bar', '7-slice pie converted losslessly to horizontal bar')
  const colChart = repaired.manifest.slides.find((s) => s.chart?.categories?.length === 5)
  assert.equal(colChart.chart.spotlight, true, '5-bar column chart auto-received spotlight')
  assert.ok(colChart.takeaway && colChart.takeaway.includes('148'), 'chart auto-received grounded takeaway')

  // End-to-end buildDeckAsync with autoUpgrade: true runs self-repair before commit; autoUpgrade: false skips it
  const builtRepaired = await buildDeckAsync({
    title: '夜魔测试修复',
    theme: 'consulting',
    brand: { backgroundColor: '#FF0055', textColor: '#FFCCDD' },
    autoUpgrade: true,
    outputDir: dir,
    fileName: 'repaired-deck',
    slides: nightmare.slides.map(({ id, ...rest }) => rest),
  })
  assert.equal(builtRepaired.quality.errorCount, 0)
  assert.equal(builtRepaired.quality.warningCount, 0, `built deck should commit with 0 warnings, got: ${JSON.stringify(builtRepaired.quality.issues)}`)
  assert.ok(builtRepaired.upgradeReport?.selfRepair?.fixedCount > 0)

  const builtRaw = await buildDeckAsync({
    title: '夜魔测试原始',
    theme: 'consulting',
    brand: { backgroundColor: '#FF0055', textColor: '#FFCCDD' },
    autoUpgrade: false,
    smartLayout: false,
    outputDir: dir,
    fileName: 'raw-deck',
    slides: nightmare.slides.map(({ id, ...rest }) => rest),
  })
  assert.ok(builtRaw.quality.warningCount >= 8, 'autoUpgrade: false must preserve raw warnings verbatim')
}))

test('v0.31: 13 Agent tools wire schema stays type-array-free; alignOrder & selfRepair work across Tools, CLI, and Workbench', () => inTempDir(async (dir) => {
  const tools = buildPptTools({ outputDir: dir, defaultTheme: '', defaultLang: 'zh', maxSlides: 60 })
  assert.equal(tools.length, 13)
  for (const t of tools) {
    assert.equal(hasWireTypeArray(t.parameters), false, `tool ${t.name} must emit 0 JSON Schema wire type arrays`)
  }

  const scrambledMd = [
    '# 2026 Q4 晋升述职与 OKR 复盘',
    '',
    '## 下季度重点排期计划',
    '- 第一阶段：完成核心调度器灰度发布',
    '- 第二阶段：全量推广自动化巡检',
    '- 第三阶段：季度末达成 99.9% SLA',
    '',
    '## 核心数据',
    '- 年度总营收：47.3 亿元，同比 +28%',
    '- 准时完成率：99.2%，较目标 +1.2pp',
    '- 自由现金流：8.7 亿元，同比 +34%',
    '',
    '## 效能提升',
    '- 核心响应耗时：从 180 ms 降至 42 ms',
    '- 自动化覆盖率：从 54% 升至 92%',
    '',
    '## 谢谢！',
  ].join('\n')

  // 1. Agent Tool ppt_create with exemplar: 'auto' + alignOrder: true
  const execCtx = { agent: { session: { header: { cwd: dir } } } }
  const createTool = tools.find((t) => t.name === 'ppt_create')
  const toolRes = await createTool.execute({
    title: '2026 Q4 晋升述职与 OKR 复盘',
    exemplar: 'auto',
    alignOrder: true,
    content: scrambledMd,
    outputDir: dir,
    fileName: 'tool-v31',
  }, execCtx)
  assert.equal(toolRes.exemplar, 'okr-performance-review')
  assert.equal(toolRes.quality.errorCount, 0)
  assert.equal(toolRes.quality.warningCount, 0)
  assert.equal(toolRes.upgradeReport?.resequenced, true)
  const kpiIdx = toolRes.slides.findIndex((s) => s.layout === 'kpi')
  const dbIdx = toolRes.slides.findIndex((s) => s.layout === 'dumbbell')
  assert.ok(kpiIdx > 0 && kpiIdx < dbIdx, 'KPI slide should be re-sequenced ahead of dumbbell proof')
  const renderedText = createTool.output.render({}, toolRes)[0].text
  assert.match(renderedText, /标杆弧线重排/)

  // 2. CLI --exemplar okr-performance-review --align-order
  const mdPath = join(dir, 'okr.md')
  writeFileSync(mdPath, scrambledMd, 'utf8')
  const cliOut = join(dir, 'cli-v31')
  execFileSync(
    process.execPath,
    [CLI_PATH, '--title', '2026 Q4 晋升述职与 OKR 复盘', '--file', 'okr-cli', '--content', '@' + mdPath, '--exemplar', 'okr-performance-review', '--align-order', '--out', cliOut],
    { cwd: dir, encoding: 'utf8' },
  )
  const cliManifest = JSON.parse(readFileSync(join(cliOut, 'okr-cli.json'), 'utf8'))
  assert.equal(cliManifest.exemplar, 'okr-performance-review')
  assert.equal(cliManifest.slides[0].layout, 'cover')
  assert.equal(cliManifest.slides.at(-1).layout, 'closing')
  assert.ok(cliManifest.slides.findIndex((s) => s.layout === 'kpi') < cliManifest.slides.findIndex((s) => s.layout === 'dumbbell'))

  // 3. Workbench create with alignOrder: true
  const wbDir = join(dir, 'wb')
  mkdirSync(wbDir, { recursive: true })
  const wb = new PptWorkbench({ catalogPath: join(wbDir, 'projects.jsonl') })
  const wbRes = await wb.action({
    operation: 'create',
    title: '2026 Q4 晋升述职与 OKR 复盘',
    exemplar: 'okr-performance-review',
    alignOrder: true,
    theme: 'auto',
    content: scrambledMd,
  })
  assert.equal(wbRes.ok, true)
  assert.equal(wbRes.project.quality.errorCount, 0)
  assert.equal(wbRes.project.quality.warningCount, 0)
}))

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  buildDeckAsync,
  editDeck,
  undoDeck,
  checkDeck,
  normalizeEvidenceLedger,
  applyEvidenceLedgerToSlides,
  auditEvidenceAndSourcing,
  buildResearchPlan,
} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { main as cliMain } from '../skills/dsh-ppt/scripts/build-deck.mjs'
import { buildPptTools } from '../lib/tools.js'
import { resolvePptConfig } from '../lib/config.js'

function hasTypeArray(node) {
  if (!node || typeof node !== 'object') return false
  if (Array.isArray(node.type)) return true
  if (Array.isArray(node)) return node.some(hasTypeArray)
  return Object.values(node).some(hasTypeArray)
}

test('v0.32 Evidence Ledger normalizes strictly, binds clean source footers, speaker notes, zero-warning booktabs appendix & handout table', async () => {
  assert.throws(() => normalizeEvidenceLedger('bad'), /必须是证据条目数组/)
  assert.throws(() => normalizeEvidenceLedger([{ id: 'E1', claim: 'c', source: 's' }, { id: 'E1', claim: 'c2', source: 's2' }]), /重复编号/)
  assert.throws(() => normalizeEvidenceLedger([{ id: 'E1', claim: '', source: 's' }]), /缺少事实描述/)
  assert.throws(() => normalizeEvidenceLedger([{ id: 'E1', claim: 'c', source: 's', url: 'javascript:alert(1)' }]), /仅支持 http:\/\/ 或 https:\/\//)
  assert.throws(() => normalizeEvidenceLedger([{ id: 'E1', claim: 'c', source: 's', confidence: 'guessed' }]), /confidence 仅支持/)

  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v32-ledger-'))
  try {
    const evidence = [
      {
        id: 'e1',
        claim: '2025 年全球半固态电池出货量突破 12.4 GWh，中国车企装车贡献超 75%',
        source: 'GGII 高工产研《2025 固态电池产业蓝皮书》',
        date: '2026-01',
        scope: '全球出货口径',
        url: 'https://example.org/reports/ggii-2025',
        confidence: 'verified',
      },
      {
        id: 'E2',
        claim: '头部硫化物全固态电芯中试良率已提升至 72%，较 2024 年提升 24 个百分点',
        source: '中国汽车动力电池产业创新联盟',
        date: '2026-02',
        scope: '中试产线实测',
        url: 'https://example.org/cabia-2026',
        confidence: 'verified',
      },
      {
        id: 'E3',
        claim: '全固态电池规模化平价节点预计在 2028–2030 年区间，车企与供应链预测相差 2 年',
        source: '中汽协 & TrendForce 联合对比',
        date: '2026-03',
        scope: '硫化物路线口径',
        confidence: 'conflicting',
        note: '整车厂规划偏乐观（2028），材料端普遍预计 2030 达平价',
      },
    ]

    const res = await buildDeckAsync({
      title: '2026 固态电池商业化进展研报',
      outputDir: dir,
      exemplar: 'daylight-earnings-research',
      alignOrder: true,
      evidence,
      evidenceAppendix: true,
      handout: true,
      slides: [
        { layout: 'cover', title: '2026 固态电池商业化进展研报', subtitle: '基于多源核验数据的产业拐点与量产路线分析' },
        {
          layout: 'kpi',
          kicker: '01 · 商用拐点',
          title: '半固态出货突破 12.4 GWh，全固态平价存在 2 年口径区间',
          evidenceIds: ['E1', 'E3'],
          items: [
            { tag: '2025 全球出货', value: '12.4 GWh', delta: '中国占 >75% [E1]' },
            { tag: '全固态平价窗口', value: '2028–2030', delta: '多机构预测区间 [E3]' },
          ],
          takeaway: '半固态已跨过量产门槛，全固态在车企与供应链口径间存在约 2 年预期差异。',
        },
        {
          layout: 'chart-split',
          kicker: '02 · 良率爬坡',
          title: '硫化物中试良率升至 72%，2026 年成为工程化分水岭',
          evidenceIds: ['E2'],
          chart: {
            kind: 'column',
            categories: ['2023', '2024', '2025', '2026Q1'],
            series: [{ name: '中试良率', values: [35, 48, 63, 72] }],
            unit: '%',
            highlight: 'last',
            showGrowthCallout: true,
          },
          items: [
            { tag: '关键跃迁', title: '干法电极工艺定型', text: '界面阻抗下降推动良率两年跃升 24 个百分点。' },
            { tag: '验证节点', title: '百兆瓦级中试线贯通', text: '头部企业完成首批车规级热失控针刺测试。' },
          ],
          takeaway: '良率从 48% 升至 72% 标志着工艺进入工程收敛期。',
        },
        {
          layout: 'closing',
          title: '聚焦半固态现金流与硫化物电解质核心专利卡位',
          subtitle: '建议 Q2 启动两家头部电芯厂尽调与中试产线实地复核',
        },
      ],
    })

    assert.equal(res.ok, true)
    assert.equal(res.evidenceCount, 3)
    assert.equal(res.quality.errorCount, 0)
    assert.equal(res.quality.warningCount, 0, `expected 0 warnings, got: ${JSON.stringify(res.quality.issues)}`)

    const manifest = JSON.parse(readFileSync(res.jsonPath, 'utf8'))
    assert.equal(manifest.evidence.length, 3)
    assert.equal(manifest.evidence[0].id, 'E1')

    // KPI slide gets clean auto-injected source footer & full URL inside speaker notes
    const kpiSlide = manifest.slides.find((s) => s.layout === 'kpi')
    assert.ok(kpiSlide.source.includes('GGII') && kpiSlide.source.includes('[E1]'))
    assert.ok(kpiSlide.notes.includes('[证据溯源]'))
    assert.ok(kpiSlide.notes.includes('https://example.org/reports/ggii-2025'))

    // Evidence appendix booktabs slide inserted cleanly right BEFORE closing
    const closingIdx = manifest.slides.findIndex((s) => s.layout === 'closing')
    assert.equal(closingIdx, manifest.slides.length - 1)
    const appendixSlide = manifest.slides[closingIdx - 1]
    assert.equal(appendixSlide.layout, 'table')
    assert.equal(appendixSlide.tableStyle, 'booktabs')
    assert.ok(appendixSlide.kicker.includes('事实溯源'))
    assert.equal(appendixSlide.rows.length, 4) // header + 3 ledger entries

    // Handout contains Verified Evidence Ledger table with clickable Markdown link
    const handoutMd = readFileSync(res.handoutPath, 'utf8')
    assert.ok(handoutMd.includes('事实核验与证据账本'))
    assert.ok(handoutMd.includes('[link](https://example.org/reports/ggii-2025)'))
    assert.ok(handoutMd.includes('存在口径差异'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.32 SLOP-13 fact-hygiene gate intercepts dangling refs, unverified claims, vague placeholder sources, and unsourced research numbers with 0 false positives', () => {
  const ledger = normalizeEvidenceLedger([
    { id: 'E1', claim: 'Verified sales 120M', source: 'FY2025 Annual Report', date: '2026-02', confidence: 'verified' },
    { id: 'E2', claim: 'Unverified rumor 88%', source: 'Industry Blog', confidence: 'unverified' },
  ])

  const badManifest = {
    evidence: ledger,
    slides: [
      { id: 's1', layout: 'cover', title: 'Cover' },
      {
        id: 's2',
        layout: 'kpi',
        title: 'Revenue hit 120M [E99]',
        evidenceIds: ['E1', 'E99'],
        items: [{ tag: 'ARR', value: '$120M' }],
      },
      {
        id: 's3',
        layout: 'cards',
        title: 'Adoption rate reached 88% across all customers',
        evidenceIds: ['E2'],
        items: [{ title: 'Adoption', text: '88% adoption [E2]' }],
        takeaway: 'Strong market momentum everywhere.',
      },
      {
        id: 's4',
        layout: 'bullets',
        title: 'Market overview highlights key drivers',
        bullets: ['Driver A', 'Driver B'],
        source: '数据来源：网络整理',
      },
      {
        id: 's5',
        layout: 'kpi',
        title: 'Cost dropped 42% in Q4 without any citation',
        items: [{ tag: 'Cost Drop', value: '-42%' }],
      },
    ],
  }

  const issues = auditEvidenceAndSourcing(badManifest)
  const codes = new Set(issues.map((i) => i.code))
  assert.ok(codes.has('dangling-evidence-ref'), 'must catch dangling [E99]')
  assert.ok(codes.has('unverified-evidence-claim'), 'must catch unverified E2 without visible caveat')
  assert.ok(codes.has('vague-placeholder-source'), 'must catch 网络整理 placeholder')
  assert.ok(codes.has('unsourced-research-numbers'), 'must catch unsourced numeric KPI in research mode')

  // Verify applyEvidenceLedgerToSlides auto-notes do NOT falsely silence unverified-evidence-claim
  const applied = applyEvidenceLedgerToSlides(badManifest.slides, ledger, { lang: 'zh' })
  const issuesAfterBind = auditEvidenceAndSourcing({ evidence: ledger, slides: applied.slides })
  assert.ok(
    issuesAfterBind.some((i) => i.code === 'unverified-evidence-claim'),
    'auto-appended provenance notes must not mask missing visible slide caveat for unverified/conflicting claims',
  )

  // Ordinary non-research deck (no manifest.evidence) gets ZERO false positives on numeric KPIs
  const normalManifest = {
    slides: [
      { id: 'n1', layout: 'cover', title: 'Internal Review' },
      { id: 'n2', layout: 'kpi', title: 'Q4 latency dropped 38%', items: [{ tag: 'P99', value: '42ms', delta: '-38%' }] },
    ],
  }
  assert.equal(auditEvidenceAndSourcing(normalManifest).length, 0)
})

test('v0.32 buildResearchPlan & ppt_templates(topic) + CLI --plan produce Gold Exemplar match, 3-round queries, gap diagnostics & storyboard', async () => {
  const planEmpty = buildResearchPlan({
    topic: '2026 中国低空经济 eVTOL 商业化进展研报',
    lang: 'zh',
  })
  assert.equal(planEmpty.ok, true)
  assert.ok(planEmpty.exemplar.id)
  assert.equal(planEmpty.researchRounds.length, 3)
  assert.ok(planEmpty.storyboard.length >= 6)
  assert.ok(planEmpty.evidenceAudit.gapCount >= 1)
  assert.ok(planEmpty.planMarkdown.includes('三轮定向检索与交叉核验清单'))
  assert.ok(planEmpty.planMarkdown.includes('逐页分镜策划表'))
  assert.ok(Array.isArray(planEmpty.fewShotSlides) && planEmpty.fewShotSlides.length >= 2)

  // Adding verified evidence shrinks gap count & binds [E1]..[E3] into storyboard slots
  const seeded = [
    { id: 'E1', claim: '2025 中国低空经济市场规模约 8500 亿元', source: '中国民航局发展报告', date: '2026-01', confidence: 'verified' },
    { id: 'E2', claim: '亿航 EH216-S 成为全球首个四证齐全载人 eVTOL', source: 'CAAC 官方适航公告', date: '2025-10', confidence: 'verified' },
    { id: 'E3', claim: '2026 年试点城市起降场规划突破 300 座', source: '发改委低空试点汇总', date: '2026-02', confidence: 'verified' },
    { id: 'E4', claim: '电池能量密度需突破 400 Wh/kg 支撑城际航线', source: '中航工业白皮书', date: '2025-12', confidence: 'verified' },
  ]
  const planWithEvidence = buildResearchPlan({
    topic: '2026 中国低空经济 eVTOL 商业化进展研报',
    exemplarId: planEmpty.exemplar.id,
    evidence: seeded,
    lang: 'en',
  })
  assert.equal(planWithEvidence.evidenceAudit.verified, 4)
  assert.ok(planWithEvidence.evidenceAudit.gapCount < planEmpty.evidenceAudit.gapCount)
  assert.ok(planWithEvidence.planMarkdown.includes('[E1]'))
  assert.ok(planWithEvidence.planMarkdown.includes('3-Round Retrieval'))

  // CLI --plan works standalone without writing files
  const logs = []
  const exitCode = await cliMain(['--plan', '2026 AI Agent Infrastructure Benchmark', '--lang', 'en'], { log: (m) => logs.push(m) })
  assert.equal(exitCode, 0)
  const cliPlan = JSON.parse(logs.join('\n'))
  assert.equal(cliPlan.ok, true)
  assert.equal(cliPlan.researchRounds.length, 3)
})

test('v0.32 13-tool wire schema compliance (0 type arrays), ppt_templates(topic) + ppt_create(evidence) + CLI --evidence + editDeck/undoDeck preserve ledger', async () => {
  const tools = buildPptTools(resolvePptConfig({}))
  assert.equal(tools.length, 13, 'must remain strictly 13 registered Agent tools')
  for (const tool of tools) {
    assert.equal(hasTypeArray(tool.parameters), false, `tool ${tool.name} must have 0 wire JSON Schema type arrays`)
  }

  const templatesTool = tools.find((t) => t.name === 'ppt_templates')
  const createTool = tools.find((t) => t.name === 'ppt_create')
  assert.ok(templatesTool && createTool)

  // ppt_templates with topic returns planMarkdown & renders cleanly
  const planRes = await templatesTool.execute({ topic: '2026 量子计算纠错进展汇报', lang: 'zh' })
  assert.equal(planRes.ok, true)
  assert.ok(typeof planRes.planMarkdown === 'string' && planRes.planMarkdown.includes('2026 量子计算纠错进展汇报'))
  const renderedPlan = templatesTool.output.render({}, planRes)
  assert.ok(renderedPlan[0].text.includes('逐页分镜策划表'))

  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v32-e2e-'))
  try {
    const evidence = [
      { id: 'E1', claim: 'Google Willow 实现逻辑量子比特纠错阈值下指数抑错', source: 'Nature (2024-12)', date: '2024-12', url: 'https://www.nature.com/articles/s41586-024-08449-y', confidence: 'verified' },
      { id: 'E2', claim: 'IBM Quantum 2026 路线图目标交付 200 逻辑门纠错演示', source: 'IBM Quantum Roadmap', date: '2025-11', confidence: 'verified' },
    ]
    const created = await createTool.execute({
      title: '量子纠错进展',
      outputDir: dir,
      exemplar: 'tech-arch-rfc',
      evidence,
      evidenceAppendix: true,
      slides: [
        { layout: 'cover', title: '量子纠错进展', subtitle: '2025–2026 关键工程里程碑' },
        {
          layout: 'kpi',
          kicker: '01 · 核心突破',
          title: '表面码跨过纠错阈值，物理比特扩展首次降低逻辑错误率',
          evidenceIds: ['E1', 'E2'],
          items: [
            { tag: 'Willow 里程碑', value: '指数抑错', delta: 'Nature 2024 [E1]' },
            { tag: 'IBM 2026 目标', value: '200 逻辑门', delta: '官方路线图 [E2]' },
          ],
          takeaway: '量子计算已从 NISQ 探索进入可容错纠错工程验证期。',
        },
        { layout: 'closing', title: '持续跟踪容错逻辑比特规模与低温控制成本', subtitle: '量子硬件研究组 · 2026' },
      ],
    })
    assert.equal(created.ok, true)
    assert.equal(created.evidenceCount, 2)
    assert.equal(created.quality.errorCount, 0)
    const renderedCreate = createTool.output.render({}, created)
    assert.ok(renderedCreate[0].text.includes('事实溯源账本：已绑定 2 条核验证据'))

    // editDeck + undoDeck preserve manifest.evidence and allow evidenceIds patching
    const edited = await editDeck({
      deckPath: created.jsonPath,
      expectedRevision: created.revision,
      edits: [{ slide: 2, patch: { evidenceIds: ['E1'], title: '表面码跨过阈值并实现指数抑错' } }],
    })
    const afterEdit = JSON.parse(readFileSync(edited.jsonPath, 'utf8'))
    assert.equal(afterEdit.evidence.length, 2)
    assert.deepEqual(afterEdit.slides[1].evidenceIds, ['E1'])

    const undone = await undoDeck({ deckPath: edited.jsonPath, expectedRevision: edited.revision })
    const afterUndo = JSON.parse(readFileSync(undone.jsonPath, 'utf8'))
    assert.equal(afterUndo.evidence.length, 2)
    assert.deepEqual(afterUndo.slides[1].evidenceIds, ['E1', 'E2'])

    // CLI --evidence @file.json --evidence-appendix --handout end-to-end
    const evPath = join(dir, 'evidence.json')
    const slidesPath = join(dir, 'slides.json')
    writeFileSync(evPath, JSON.stringify(evidence), 'utf8')
    writeFileSync(slidesPath, JSON.stringify([
      { layout: 'cover', title: 'CLI 证据测试', subtitle: '端到端验证' },
      { layout: 'kpi', kicker: '01 · 指标', title: '逻辑纠错跨越工程阈值', evidenceIds: ['E1'], items: [{ tag: '纠错表现', value: '2.14x', delta: '跨码距抑错 [E1]' }] },
      { layout: 'closing', title: '下一步进入容错逻辑门实测验证', subtitle: '研究团队' },
    ]), 'utf8')
    const cliLogs = []
    const code = await cliMain([
      '--title', 'CLI 证据测试',
      '--slides', '@' + slidesPath,
      '--evidence', '@' + evPath,
      '--evidence-appendix',
      '--handout',
      '--theme', 'consulting',
      '--out', dir,
      '--file', 'cli-ev-deck',
    ], { log: (m) => cliLogs.push(m) })
    assert.equal(code, 0)
    const checked = checkDeck({ deckPath: join(dir, 'cli-ev-deck.json') })
    assert.equal(checked.errorCount, 0)
    assert.equal(checked.warningCount, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

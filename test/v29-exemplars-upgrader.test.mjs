import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'

import {
  CURATED_EXEMPLARS,
  CURATED_EXEMPLAR_IDS,
  listCuratedExemplars,
  resolveExemplar,
  loadWorkspaceExemplars,
  saveWorkspaceExemplar,
  extractExemplarFromAbsorbed,
  matchBestExemplar,
  renderExemplarPromptGuide,
  upgradeWeakDeck,
  ingestExemplarCorpus,
  absorbPptx,
  buildDeckAsync,
} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { relativeLuminance } from '../skills/dsh-ppt/scripts/deck-themes.mjs'
import { PptWorkbench } from '../lib/workbench.js'
import { buildPptTools } from '../lib/tools.js'

const CLI_PATH = resolve(process.cwd(), 'skills/dsh-ppt/scripts/build-deck.mjs')

function inTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v29-'))
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

test('v0.29: 8 built-in Curated Gold Exemplars expose complete slot contracts, matching, and bilingual prompt guides', () => {
  assert.equal(CURATED_EXEMPLAR_IDS.length, 8)
  const expectedIds = [
    'mckinsey-strategy',
    'sequoia-pitch',
    'stripe-product-launch',
    'quarterly-exec-review',
    'tech-arch-rfc',
    'academic-defense',
    'enterprise-proposal',
    'gov-institutional',
  ]
  for (const id of expectedIds) {
    const ex = CURATED_EXEMPLARS[id]
    assert.ok(ex, `missing exemplar ${id}`)
    assert.ok(ex.slots.length >= 8, `${id} should have >=8 slots`)
    assert.equal(ex.slots[0].layout, 'cover')
    assert.equal(ex.slots.at(-1).layout, 'closing')
    const guideZh = renderExemplarPromptGuide(ex, 'zh')
    const guideEn = renderExemplarPromptGuide(ex, 'en')
    assert.ok(guideZh.includes(id) && guideZh.includes('填空铁律'))
    assert.ok(guideEn.includes(id) && guideEn.includes('Action Title'))
  }

  assert.equal(matchBestExemplar({ title: '2026 A轮融资路演商业计划书' }).id, 'sequoia-pitch')
  assert.equal(matchBestExemplar({ title: '毕业论文答辩与消融实验' }).id, 'academic-defense')
  assert.equal(matchBestExemplar({ title: 'Stripe SDK 开发者新品发布会' }).id, 'stripe-product-launch')
  assert.equal(matchBestExemplar({ title: '机关年度述职政务工作报告', persona: 'gov-exec' }).id, 'gov-institutional')
  assert.equal(matchBestExemplar({ template: 'architecture-review' }).id, 'tech-arch-rfc')

  const list = listCuratedExemplars()
  assert.equal(list.length, 8)
  assert.ok(list.every((item) => item.source === 'curated' && item.layoutCadence.length >= 8))
})

test('v0.29: absorbPptx filters hidden slides (show="0" & "(hidden)"), saves exemplar, and ingestExemplarCorpus batch-absorbs a directory', () => inTempDir(async (dir) => {
  const corpusDir = join(dir, 'corpus')
  mkdirSync(corpusDir, { recursive: true })

  // 1. Build a realistic 5-slide deck and inject show="0" on Slide 2 (simulating corporate template instruction slide)
  const deckA = await buildDeckAsync({
    title: 'Board Strategy Master',
    theme: 'consulting',
    outputDir: dir,
    fileName: 'raw-board',
    slides: [
      { layout: 'cover', title: 'Board Strategy Master', subtitle: '2026 Template' },
      { layout: 'bullets', title: 'Template Guide (hidden)', bullets: ['Do not present this instruction slide'] },
      { layout: 'kpi', title: 'Core KPIs', items: [{ value: '124%', title: 'NRR' }, { value: '1.8B', title: 'ARR' }] },
      { layout: 'quadrant', title: 'Positioning', items: [{ title: 'Ours', x: 85, y: 86, size: 30 }, { title: 'Peer', x: 35, y: 40, size: 22 }] },
      { layout: 'closing', title: 'Next Steps', subtitle: 'Board sign-off' },
    ],
  })
  const zipEntries = unzipSync(readFileSync(deckA.pptxPath))
  const slide2Xml = strFromU8(zipEntries['ppt/slides/slide2.xml']).replace('<p:sld ', '<p:sld show="0" ')
  zipEntries['ppt/slides/slide2.xml'] = strToU8(slide2Xml)
  const boardPptx = join(corpusDir, '01-board-master.pptx')
  writeFileSync(boardPptx, Buffer.from(zipSync(zipEntries)))

  // 2. Build a 1-slide master template (simulating GitHub single-slide starter like coder-template.pptx)
  const deckB = await buildDeckAsync({
    title: 'Coder Dark Master',
    theme: 'aurora-stage',
    outputDir: dir,
    fileName: 'raw-single',
    slides: [{ layout: 'cover', title: 'Coder Dark Master', subtitle: 'Brand Starter' }],
  })
  const singlePptx = join(corpusDir, '02-single-master.pptx')
  writeFileSync(singlePptx, readFileSync(deckB.pptxPath))

  // Single absorb with saveExemplarAs
  const singleAbsorbed = await absorbPptx({
    pptxPath: boardPptx,
    cwd: dir,
    saveExemplarAs: 'board-clean',
    exemplarName: '董事会精简范本',
  })
  assert.equal(singleAbsorbed.slideSkeleton[1].hidden, true, 'show="0" slide must be flagged hidden')
  assert.ok(singleAbsorbed.savedExemplarPath && existsSync(singleAbsorbed.savedExemplarPath))
  assert.ok(!singleAbsorbed.exemplar.slots.some((s) => /hidden/i.test(s.exampleTitleZh || '')), 'hidden slide excluded from exemplar slots')

  // Batch corpus ingestion into a clean workspace
  const wsDir = join(dir, 'ws')
  mkdirSync(wsDir, { recursive: true })
  const batch = await ingestExemplarCorpus({ dirPath: corpusDir, cwd: wsDir, limit: 10 })
  assert.equal(batch.ok, true)
  assert.equal(batch.scanned, 2)
  assert.equal(batch.ingestedCount, 2)
  assert.equal(batch.failedCount, 0)
  assert.ok(existsSync(join(wsDir, '.dsh-ppt', 'exemplars.json')))
  assert.ok(existsSync(join(wsDir, '.dsh-ppt', 'taste-recipes.json')))

  const loaded = loadWorkspaceExemplars(wsDir)
  assert.equal(Object.keys(loaded).length, 2)
  const singleEx = Object.values(loaded).find((e) => e.sourceFile === '02-single-master.pptx')
  assert.ok(singleEx && singleEx.slots.length === 7, '1-slide master falls back to balanced 7-slot cadence')

  const combined = listCuratedExemplars(loaded)
  assert.equal(combined.length, 10)
  assert.ok(resolveExemplar(singleEx.id, loaded))
}))

test('v0.29: upgradeWeakDeck deterministically promotes buried code/dumbbell/radar/quadrant/heatmap/mockup/kpi, splits >6 bullets, breaks streaks, rescues SLOP-01/02/09, and stays 100% lossless', () => inTempDir(async (dir) => {
  const weakSlides = [
    { layout: 'cover', title: '平台 3.0 升级汇报', subtitle: '技术部 2026' },
    {
      layout: 'bullets',
      kicker: '要点',
      title: '核心指标',
      bullets: [
        '年度经常性收入：突破 2.4 亿元，同比 +58%',
        '客户净留存率 NRR：提升至 126%，同比 +9pp',
        '编译构建速度：达到 4.8x 提速',
      ],
    },
    {
      layout: 'bullets',
      kicker: '要点',
      title: '性能提升',
      bullets: [
        '单份成稿耗时：从 180 分钟缩短至 18 分钟',
        '首轮巡检达标率：从 58% 提升至 96%',
        '重复返工工时：从 12 小时降至 1.5 小时',
      ],
    },
    {
      layout: 'bullets',
      kicker: '要点',
      title: '多维能力对比评估',
      bullets: [
        '原生可编辑度：96 vs 62',
        '视觉质感密度：94 vs 68',
        '咨询图表完备：92 vs 56',
        '离线合规安全：98 vs 60',
      ],
    },
    {
      layout: 'bullets',
      kicker: '要点',
      title: '竞品魔力象限',
      bullets: [
        '本平台（领航者）：x=86, y=88',
        '竞品 A（挑战者）：x=42, y=76',
        '竞品 B（远见者）：x=78, y=38',
        '传统方案（落后）：x=24, y=28',
      ],
    },
    {
      layout: 'bullets',
      kicker: '要点',
      title: '产品界面演示工作台',
      bullets: [
        '在线入口：https://studio.example.dev 实时联动预览',
        '双击直改：支持标题与表格原地微调',
        '零依赖导出：同步生成可编辑 PPTX 与 HTML',
      ],
    },
    {
      layout: 'bullets',
      kicker: '要点',
      title: '技术实现',
      text: '```typescript\nexport async function ship() {\n  return buildDeckAsync({ exemplar: "mckinsey-strategy" })\n}\n```',
      bullets: [
        '范本槽位契约：锁定麦肯锡视觉节奏',
        '弱模型自动升维：零额外调用打破文字墙',
      ],
    },
    {
      layout: 'table',
      kicker: '要点',
      title: '各大区季度达成率热力图',
      rows: [
        ['区域', 'Q1', 'Q2', 'Q3', 'Q4'],
        ['华东', 76, 84, 91, 98],
        ['华南', 68, 75, 86, 93],
        ['华北', 62, 71, 80, 89],
      ],
    },
    {
      layout: 'bullets',
      kicker: '要点',
      title: '项目合规与 SOC2 安全体系',
      bullets: [
        '产研协同：双周发布达成率 98%',
        '安全审计：通过等保三级与 SOC2 Type II 认证',
        '权限隔离：全链路零外网访问保障',
      ],
    },
    {
      layout: 'bullets',
      kicker: '要点',
      title: '痛点与落地全清单',
      bullets: [
        '痛点一：各部门模板不统一',
        '痛点二：人工排版耗时极长',
        '痛点三：弱模型爱输出纯文字墙',
        '痛点四：演示机缺字导致错位',
        '举措一：沉淀 8 套标杆范本',
        '举措二：上线防退化升维器',
        '举措三：交付前渲染巡检零缺字',
        '举措四：提供双屏提词与一页纸',
      ],
    },
    { layout: 'closing', title: '谢谢！' },
  ]

  const built = await buildDeckAsync({
    title: '平台 3.0 升级汇报',
    slides: structuredClone(weakSlides),
    exemplar: 'stripe-product-launch',
    autoUpgrade: true,
    outputDir: dir,
    fileName: 'upgraded',
  })

  // Strictly 3 sibling files by default
  const written = readdirSync(dir).filter((f) => f.startsWith('upgraded.'))
  assert.deepEqual(written.sort(), ['upgraded.html', 'upgraded.json', 'upgraded.pptx'])

  assert.equal(built.theme, 'stripe-craft')
  assert.equal(built.exemplar, 'stripe-product-launch')
  assert.equal(built.quality.errorCount, 0)
  assert.equal(built.quality.warningCount, 0)
  assert.ok(built.upgradeReport.promotedCount >= 7)
  assert.equal(built.upgradeReport.splitCount, 1)
  assert.ok(built.upgradeReport.rescuedTitles >= 3)

  const layoutSeq = built.slides.map((s) => s.layout)
  for (const expectedLayout of ['kpi', 'dumbbell', 'radar', 'quadrant', 'mockup', 'code', 'heatmap', 'cards', 'callout', 'closing']) {
    assert.ok(layoutSeq.includes(expectedLayout), `expected upgraded deck to include ${expectedLayout}; got ${layoutSeq.join(',')}`)
  }

  // 100% lossless check (especially alphanumeric tokens like SOC2 Type II & split bullets!)
  const html = readFileSync(built.htmlPath, 'utf8')
  for (const phrase of ['2.4 亿元', '126%', '180', '1.5', 'SOC2 Type II', 'buildDeckAsync', '举措四', '感谢聆听']) {
    assert.ok(html.includes(phrase), `lossless check failed for: ${phrase}`)
  }

  // Verify bento-hero inverted card on light theme uses dark high-contrast accent fill (NOT light coverBg!)
  const zip = unzipSync(readFileSync(built.pptxPath))
  const heroSlideXmls = Object.entries(zip)
    .filter(([k]) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .map(([, v]) => strFromU8(v))
    .filter((xml) => xml.includes('Card Hero Surface'))
  assert.ok(heroSlideXmls.length >= 1, 'should render at least one bento-hero card')
  for (const xml of heroSlideXmls) {
    const idx = xml.indexOf('Card Hero Surface')
    const snippet = xml.slice(idx, idx + 1200)
    const firstHex = /srgbClr val="([0-9A-Fa-f]{6})"/.exec(snippet)?.[1]
    assert.ok(firstHex, 'hero card gradient must specify srgbClr')
    assert.ok(relativeLuminance('#' + firstHex) < 0.25, `hero card fill #${firstHex} must stay dark for crisp white text`)
  }

  // Verify dumbbell near-zero value label (1.5 小时) does NOT cross left of trackX (2.68 in = 2,450,592 EMU)
  const dumbbellXml = Object.entries(zip)
    .filter(([k]) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .map(([, v]) => strFromU8(v))
    .find((xml) => xml.includes('Dumbbell Val A 3'))
  assert.ok(dumbbellXml, 'dumbbell slide should exist in PPTX')
  const valIdx = dumbbellXml.indexOf('Dumbbell Val A 3')
  const xOff = Number(/<a:off x="(\d+)"/.exec(dumbbellXml.slice(valIdx, valIdx + 600))?.[1] || 0)
  assert.ok(xOff >= Math.round(2.60 * 914400), `dumbbell near-zero label x=${xOff} must not collide with left row title`)

  // Opt-out check: autoUpgrade: false preserves raw bullets verbatim
  const rawBuilt = await buildDeckAsync({
    title: 'Raw Verbatim',
    slides: structuredClone(weakSlides),
    theme: 'consulting',
    smartLayout: false,
    autoUpgrade: false,
    outputDir: dir,
    fileName: 'raw-verbatim',
  })
  assert.equal(rawBuilt.slideCount, weakSlides.length)
  assert.equal(rawBuilt.slides[1].layout, 'bullets')
  assert.equal(rawBuilt.slides[1].title, '核心指标')
}))

test('v0.29: 13 Agent tools wire schema stays type-array-free; ppt_templates(exemplarId), ppt_absorb(dir & saveExemplarAs), ppt_create(exemplar) work end-to-end', () => inTempDir(async (dir) => {
  const tools = buildPptTools({ outputDir: dir, defaultTheme: '', defaultLang: 'zh', maxSlides: 60 })
  assert.equal(tools.length, 13, 'must remain strictly 13 registered tools')
  for (const t of tools) {
    assert.equal(hasWireTypeArray(t.parameters), false, `tool ${t.name} must not emit wire type arrays`)
  }

  const execCtx = { agent: { session: { header: { cwd: dir } } } }
  const tplTool = tools.find((t) => t.name === 'ppt_templates')
  const absorbTool = tools.find((t) => t.name === 'ppt_absorb')
  const createTool = tools.find((t) => t.name === 'ppt_create')

  // 1. ppt_templates list + exemplarId promptGuide
  const tplRes = await tplTool.execute({ lang: 'zh', exemplarId: 'mckinsey-strategy' }, execCtx)
  assert.equal(tplRes.ok, true)
  assert.equal(tplRes.exemplars.length, 8)
  assert.equal(tplRes.exemplar.id, 'mckinsey-strategy')
  assert.ok(tplRes.promptGuide.includes('mckinsey-strategy'))
  const tplRendered = tplTool.output.render({}, tplRes)
  assert.ok(tplRendered[0].text.includes('标杆范本：麦肯锡战略诊断与破局报告'))

  // 2. ppt_create with exemplar
  const created = await createTool.execute({
    title: 'Q4 战略破局汇报',
    exemplar: 'mckinsey-strategy',
    content: '# Q4 战略破局汇报\n\n## 核心指标\n- 营收增速：+45%\n- 净留存率：122%\n\n## 行动计划\n- 第一步：聚焦头部客户\n- 第二步：全量自动化交付',
    outputDir: dir,
    fileName: 'tool-exemplar',
  }, execCtx)
  assert.equal(created.ok, true)
  assert.equal(created.exemplar, 'mckinsey-strategy')
  assert.equal(created.theme, 'consulting')

  // 3. ppt_absorb on directory via pptxPath (preserves required:['pptxPath'] contract!)
  const corpusDir = join(dir, 'tool-corpus')
  mkdirSync(corpusDir, { recursive: true })
  writeFileSync(join(corpusDir, 'sample-ref.pptx'), readFileSync(created.pptxPath))
  const batchRes = await absorbTool.execute({ pptxPath: corpusDir, limit: 5 }, execCtx)
  assert.equal(batchRes.ok, true)
  assert.equal(batchRes.ingestedCount, 1)
  const batchText = absorbTool.output.render({}, batchRes)[0].text
  assert.ok(batchText.includes('批量扫描并吸收'))
}))

test('v0.29: CLI flags (--list-exemplars, --ingest-exemplars, --exemplar, --no-auto-upgrade) and Workbench exemplar studio work end-to-end', () => inTempDir(async (dir) => {
  // 1. CLI --list-exemplars
  const listOut = execFileSync(process.execPath, [CLI_PATH, '--list-exemplars'], { cwd: dir, encoding: 'utf8' })
  const listJson = JSON.parse(listOut)
  assert.ok(Array.isArray(listJson.exemplars) && listJson.exemplars.length === 8)

  // 2. CLI --exemplar + --no-auto-upgrade
  const mdPath = join(dir, 'notes.md')
  writeFileSync(mdPath, '# CLI Test\n\n## 核心指标\n- 增速：+42%\n- 留存：120%\n\n## 性能提升\n- 耗时：从 120 分钟缩短至 15 分钟\n- 达标率：从 60% 提升至 95%', 'utf8')
  const cliOutDir = join(dir, 'cli-out')
  const cliBuiltLog = execFileSync(process.execPath, [CLI_PATH, '--title', 'CLI Test', '--file', 'cli-test', '--content', '@' + mdPath, '--exemplar', 'sequoia-pitch', '--out', cliOutDir], { cwd: dir, encoding: 'utf8' })
  assert.ok(cliBuiltLog.includes('dsh-ppt 已生成'))
  const cliBuilt = JSON.parse(readFileSync(join(cliOutDir, 'cli-test.json'), 'utf8'))
  assert.equal(cliBuilt.theme, 'venture-daylight')
  assert.equal(cliBuilt.exemplar, 'sequoia-pitch')

  const cliRawDir = join(dir, 'cli-raw')
  execFileSync(process.execPath, [CLI_PATH, '--title', 'CLI Raw', '--file', 'cli-raw', '--content', '@' + mdPath, '--theme', 'consulting', '--no-auto-upgrade', '--out', cliRawDir], { cwd: dir, encoding: 'utf8' })
  const cliNoUp = JSON.parse(readFileSync(join(cliRawDir, 'cli-raw.json'), 'utf8'))
  assert.equal(cliNoUp.slides[1].layout, 'bullets')

  // 3. CLI --ingest-exemplars
  const corpusDir = join(dir, 'cli-corpus')
  mkdirSync(corpusDir, { recursive: true })
  const cliPptxPath = join(cliOutDir, 'cli-test.pptx')
  writeFileSync(join(corpusDir, 'demo-pitch.pptx'), readFileSync(cliPptxPath))
  const ingestRaw = execFileSync(process.execPath, [CLI_PATH, '--ingest-exemplars', corpusDir], { cwd: dir, encoding: 'utf8' })
  const ingestJson = JSON.parse(ingestRaw)
  assert.equal(ingestJson.ok, true)
  assert.equal(ingestJson.ingestedCount, 1)

  // 4. Workbench catalog-meta & create(exemplar) & absorb-upload(saveExemplarAs)
  const wbDir = join(dir, 'wb')
  mkdirSync(wbDir, { recursive: true })
  const wb = new PptWorkbench({ catalogPath: join(wbDir, 'projects.jsonl') })
  const meta = await wb.action({ operation: 'catalog-meta', lang: 'zh' })
  assert.equal(meta.ok, true)
  assert.ok(Array.isArray(meta.exemplars) && meta.exemplars.length >= 8)

  const wbCreated = await wb.action({
    operation: 'create',
    title: '工作台范本测试',
    exemplar: 'tech-arch-rfc',
    theme: 'auto',
    content: '# 工作台范本测试\n\n## 性能提升\n- 延迟：从 180 ms 降至 24 ms\n- 吞吐：从 400 提升至 1600',
  })
  assert.equal(wbCreated.ok, true)
  assert.equal(wbCreated.project.theme, 'stripe-craft')

  const pptxB64 = readFileSync(cliPptxPath).toString('base64')
  const absRes = await wb.action({
    operation: 'absorb-upload',
    id: wbCreated.project.id,
    expectedRevision: wbCreated.project.revision,
    data: pptxB64,
    saveExemplarAs: 'wb-saved-ex',
    exemplarName: '工作台吸收范本',
  })
  assert.equal(absRes.ok, true)
  assert.ok(absRes.absorbed.savedExemplarPath && existsSync(absRes.absorbed.savedExemplarPath))
  const metaAfter = await wb.action({ operation: 'catalog-meta', lang: 'zh' })
  assert.ok(metaAfter.exemplars.some((e) => e.id === 'wb-saved-ex'))

  // 5. Verify client bundle contains Gold Exemplar selector UI
  const clientJs = readFileSync(resolve(process.cwd(), 'lib/client.js'), 'utf8')
  assert.ok(clientJs.includes('Gold Exemplar Contract'), 'bundled lib/client.js must include exemplar selector')
}))

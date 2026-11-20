import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'

import {
  CURATED_EXEMPLAR_IDS,
  GITHUB_DISTILLED_EXEMPLARS,
  getExemplarFewShotSlides,
  listCuratedExemplars,
  matchBestExemplar,
  renderExemplarPromptGuide,
  resolveExemplar,
  absorbPptx,
  ingestExemplarCorpus,
  buildDeckAsync,
} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { PptWorkbench } from '../lib/workbench.js'
import { buildPptTools } from '../lib/tools.js'

const CLI_PATH = resolve(process.cwd(), 'skills/dsh-ppt/scripts/build-deck.mjs')

function inTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v30-'))
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => rmSync(dir, { recursive: true, force: true }))
}

test('v0.30: 12 GitHub-distilled OSS exemplars expose verified Apache-2.0/MIT/CC-BY-4.0 provenance, extracted styleRecipes, and bilingual Few-Shot JSON', () => {
  const ghIds = Object.keys(GITHUB_DISTILLED_EXEMPLARS)
  assert.equal(ghIds.length, 12)
  assert.equal(CURATED_EXEMPLAR_IDS.length, 20)

  for (const id of ghIds) {
    const ex = GITHUB_DISTILLED_EXEMPLARS[id]
    assert.ok(ex.provenance && ex.provenance.repo && ['Apache-2.0', 'MIT', 'CC0-1.0', 'CC-BY-4.0'].includes(ex.provenance.license), `${id} needs clean OSS provenance`)
    assert.ok(ex.styleRecipe && ex.styleRecipe.brand && ex.styleRecipe.cardMaterial, `${id} needs distilled styleRecipe`)
    assert.ok(ex.slots.length >= 8, `${id} needs >=8 slots`)

    const fsZh = getExemplarFewShotSlides(id, 'zh')
    const fsEn = getExemplarFewShotSlides(id, 'en')
    assert.ok(Array.isArray(fsZh) && fsZh.length >= 2)
    assert.ok(Array.isArray(fsEn) && fsEn.length >= 2)

    const guideZh = renderExemplarPromptGuide(ex, 'zh')
    const guideEn = renderExemplarPromptGuide(ex, 'en')
    assert.ok(guideZh.includes(ex.provenance.repo) && guideZh.includes('满分 JSON 填空样板'))
    assert.ok(guideEn.includes(ex.provenance.repo) && guideEn.includes('Few-Shot Gold Slide JSON'))
  }

  const allListed = listCuratedExemplars()
  assert.equal(allListed.length, 20)
  assert.equal(allListed.filter((e) => e.source === 'github-curated').length, 12)
  assert.ok(allListed.every((e) => e.hasFewShot === true))
})

test('v0.30: exemplar:"auto" routes semantically across newly distilled GitHub exemplars in engine, tools, CLI, and Workbench', () => inTempDir(async (dir) => {
  assert.equal(matchBestExemplar({ title: 'FY2026 年度财务预算复盘与资金配置' }).id, 'luxury-budget-review')
  assert.equal(matchBestExemplar({ title: 'AI Agent 智能体工厂工程蓝图平台' }).id, 'blueprint-ai-factory')
  assert.equal(matchBestExemplar({ title: '2026 品牌焕新与市场增长营销提案' }).id, 'warm-brand-story')
  assert.equal(matchBestExemplar({ title: '瑞士包豪斯设计思维创新工作坊' }).id, 'swiss-bauhaus-workshop')
  assert.equal(matchBestExemplar({ title: '微软企业级 AI 场景发现与用例评估' }).id, 'msft-enterprise-discovery')
  assert.equal(matchBestExemplar({ title: 'TED 公开课主题演讲：注意力预算' }).id, 'ted-storytelling-keynote')
  // Wave-2 gap-filling exemplars (daylight financial, Chinese OKR review, quiet canvas keynote, medical/courseware)
  assert.equal(matchBestExemplar({ title: 'FY2026 上市公司年报业绩会与投行估值研报' }).id, 'daylight-earnings-research')
  assert.equal(matchBestExemplar({ title: '2026 Q4 晋升述职与 OKR 目标达成复盘报告' }).id, 'okr-performance-review')
  assert.equal(matchBestExemplar({ title: '极简静谧画布：下一代硬件工业设计发布会' }).id, 'quiet-canvas-keynote')
  assert.equal(matchBestExemplar({ title: '微创脊柱外科多中心临床队列随访与循证课件' }).id, 'medical-clinical-course')
  assert.equal(matchBestExemplar({ template: 'financial-earnings' }).id, 'daylight-earnings-research')
  assert.equal(matchBestExemplar({ template: 'quarterly-okr' }).id, 'okr-performance-review')
  assert.equal(matchBestExemplar({ template: 'medical-case' }).id, 'medical-clinical-course')

  // 1. buildDeckAsync with exemplar: 'auto'
  const built = await buildDeckAsync({
    title: 'FY2026 年度财务预算复盘',
    exemplar: 'auto',
    content: '# FY2026 年度财务预算复盘\n\n## 核心指标\n- 总营收：12.8 亿元，同比 +24%\n- 自由现金流：2.1 亿元，同比 +180%\n\n## 性能提升\n- 关账周期：从 14 天降至 4 天\n- 算力成本：从 142 降至 88 元',
    outputDir: dir,
    fileName: 'auto-budget',
  })
  assert.equal(built.exemplar, 'luxury-budget-review')
  assert.equal(built.theme, 'luxury-noir')
  assert.equal(built.quality.errorCount, 0)
  assert.ok(built.slides.some((s) => s.layout === 'kpi'))
  assert.ok(built.slides.some((s) => s.layout === 'dumbbell'))

  // 2. ppt_templates(exemplarId) exposes fewShotSlides + promptGuide; ppt_create(exemplar:'auto') works
  const tools = buildPptTools({ outputDir: dir, defaultTheme: '', defaultLang: 'zh', maxSlides: 60 })
  assert.equal(tools.length, 13)
  const execCtx = { agent: { session: { header: { cwd: dir } } } }
  const tplRes = await tools.find((t) => t.name === 'ppt_templates').execute({ exemplarId: 'blueprint-ai-factory', lang: 'zh' }, execCtx)
  assert.equal(tplRes.ok, true)
  assert.ok(Array.isArray(tplRes.fewShotSlides) && tplRes.fewShotSlides.length >= 2)
  assert.ok(tplRes.promptGuide.includes('满分 JSON 填空样板'))

  const createRes = await tools.find((t) => t.name === 'ppt_create').execute({
    title: 'AI Agent 智能体工厂蓝图架构',
    exemplar: 'auto',
    content: '# AI Agent 智能体工厂蓝图架构\n\n## 核心指标\n- 吞吐：1600 req/s\n- 延迟：24 ms',
    outputDir: dir,
    fileName: 'tool-auto',
  }, execCtx)
  assert.equal(createRes.exemplar, 'blueprint-ai-factory')
  assert.equal(createRes.theme, 'linear-dark')

  // 3. CLI --exemplar auto
  const mdPath = join(dir, 'brand.md')
  writeFileSync(mdPath, '# 2026 品牌焕新与全域增长营销\n\n## 核心指标\n- 品牌搜索：+65%\n- 线索转化：18.4%', 'utf8')
  const cliOut = join(dir, 'cli-brand')
  execFileSync(process.execPath, [CLI_PATH, '--title', '2026 品牌焕新与全域增长营销', '--file', 'brand-deck', '--content', '@' + mdPath, '--exemplar', 'auto', '--out', cliOut], { cwd: dir, encoding: 'utf8' })
  const manifest = JSON.parse(readFileSync(join(cliOut, 'brand-deck.json'), 'utf8'))
  assert.equal(manifest.exemplar, 'warm-brand-story')
  assert.equal(manifest.theme, 'editorial-forest')

  // 4. Workbench create with exemplar: 'auto'
  const wbDir = join(dir, 'wb')
  mkdirSync(wbDir, { recursive: true })
  const wb = new PptWorkbench({ catalogPath: join(wbDir, 'projects.jsonl') })
  const wbRes = await wb.action({
    operation: 'create',
    title: '微软企业级 AI 场景发现与用例评估',
    exemplar: 'auto',
    theme: 'auto',
    content: '# 微软企业级 AI 场景发现与用例评估\n\n## 核心指标\n- 候选场景：18 个\n- 潜在降本：72%',
  })
  assert.equal(wbRes.ok, true)
  assert.equal(wbRes.project.theme, 'consulting')
}))

test('v0.30: hardened absorbPptx ignores decorative margin dots (no false harvey) and non-concentric ambient circles (no false tam)', () => inTempDir(async (dir) => {
  const emu = (inches) => Math.round(inches * 914400)
  const ellipseXml = (id, name, xIn, yIn, wIn, hIn, hex) =>
    `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${emu(xIn)}" y="${emu(yIn)}"/><a:ext cx="${emu(wIn)}" cy="${emu(hIn)}"/></a:xfrm>` +
    `<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${hex}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`

  const base = await buildDeckAsync({
    title: 'Dark Stage Decor Regression',
    theme: 'aurora-stage',
    outputDir: dir,
    fileName: 'raw-decor',
    slides: [
      { layout: 'cover', title: 'Dark Stage Cover', subtitle: 'Margin Dot Test' },
      { layout: 'statement', title: 'Focus is our scarcest resource.', subtitle: 'Ambient Glow Circles' },
      { layout: 'bullets', title: 'Vendor Capability Matrix', bullets: ['Security', 'Latency', 'Scale'] },
      { layout: 'bullets', title: 'Addressable Market', bullets: ['Global enterprise segment', 'Mid-market capture'] },
    ],
  })

  const entries = unzipSync(readFileSync(base.pptxPath))

  // Slide 1: inject 6 left-margin decorative dots (x=0.35 in) — must NOT trigger harvey
  const marginDots = Array.from({ length: 6 }, (_, i) =>
    ellipseXml(910 + i, `Decor Dot ${i}`, 0.35, 1.2 + i * 0.6, 0.22, 0.22, 'E94560')
  ).join('')
  entries['ppt/slides/slide1.xml'] = strToU8(
    strFromU8(entries['ppt/slides/slide1.xml']).replace('</p:spTree>', `${marginDots}</p:spTree>`)
  )

  // Slide 2: inject 3 scattered non-concentric ambient glow circles in different corners — must NOT trigger tam
  const ambientCircles = [
    ellipseXml(920, 'Ambient Circle 1', 0.4, 0.5, 2.6, 2.6, '1A2438'),
    ellipseXml(921, 'Ambient Circle 2', 9.8, 0.6, 2.8, 2.8, '1A2438'),
    ellipseXml(922, 'Ambient Circle 3', 9.6, 4.5, 2.4, 2.4, '1A2438'),
  ].join('')
  entries['ppt/slides/slide2.xml'] = strToU8(
    strFromU8(entries['ppt/slides/slide2.xml']).replace('</p:spTree>', `${ambientCircles}</p:spTree>`)
  )

  // Slide 3: positive control — genuine 2D Harvey ball grid (2 cols × 3 rows) inside body zone MUST trigger harvey
  const harveyGrid = [
    ellipseXml(930, 'Dot 1', 4.0, 2.3, 0.26, 0.26, '38BDF8'),
    ellipseXml(931, 'Dot 2', 6.4, 2.3, 0.26, 0.26, '38BDF8'),
    ellipseXml(932, 'Dot 3', 4.0, 3.5, 0.26, 0.26, '38BDF8'),
    ellipseXml(933, 'Dot 4', 6.4, 3.5, 0.26, 0.26, '38BDF8'),
    ellipseXml(934, 'Dot 5', 4.0, 4.7, 0.26, 0.26, '38BDF8'),
    ellipseXml(935, 'Dot 6', 6.4, 4.7, 0.26, 0.26, '38BDF8'),
  ].join('')
  entries['ppt/slides/slide3.xml'] = strToU8(
    strFromU8(entries['ppt/slides/slide3.xml']).replace('</p:spTree>', `${harveyGrid}</p:spTree>`)
  )

  // Slide 4: positive control — genuine 3 concentric circles centered at (3.2, 4.0) MUST trigger tam
  const concentricTam = [
    ellipseXml(940, 'Outer Ring', 1.1, 1.9, 4.2, 4.2, '1E3A8A'),
    ellipseXml(941, 'Mid Ring', 1.7, 2.5, 3.0, 3.0, '2563EB'),
    ellipseXml(942, 'Core Ring', 2.3, 3.1, 1.8, 1.8, '60A5FA'),
  ].join('')
  entries['ppt/slides/slide4.xml'] = strToU8(
    strFromU8(entries['ppt/slides/slide4.xml']).replace('</p:spTree>', `${concentricTam}</p:spTree>`)
  )

  const pptxPath = join(dir, 'decor-test.pptx')
  writeFileSync(pptxPath, Buffer.from(zipSync(entries)))

  const absorbed = await absorbPptx({ pptxPath, cwd: dir, extractLogo: false })
  assert.notEqual(absorbed.slideSkeleton[0].inferredLayout, 'harvey', 'left margin decor dots must not trigger harvey')
  assert.notEqual(absorbed.slideSkeleton[1].inferredLayout, 'tam', 'scattered non-concentric ambient circles must not trigger tam')
  assert.equal(absorbed.slideSkeleton[2].inferredLayout, 'harvey', 'genuine 2D body Harvey ball grid must still detect harvey')
  assert.equal(absorbed.slideSkeleton[3].inferredLayout, 'tam', 'genuine concentric TAM rings must still detect tam')
}))

test('v0.30: absorbPptx & ingestExemplarCorpus ignore generic "PowerPoint Presentation" dc:title (zero ID collision) and strip macOS-only fonts', () => inTempDir(async (dir) => {
  const corpusDir = join(dir, 'generic-title-corpus')
  mkdirSync(corpusDir, { recursive: true })

  const deck = await buildDeckAsync({
    title: 'Sample Base',
    theme: 'consulting',
    outputDir: dir,
    fileName: 'base-doc',
    slides: [
      { layout: 'cover', title: 'Base Cover', subtitle: 'Sub' },
      { layout: 'kpi', title: 'KPIs', items: [{ value: '99%', title: 'SLA' }] },
      { layout: 'closing', title: 'End', subtitle: 'Next' },
    ],
  })

  for (const name of ['alpha-earnings.pptx', 'beta-clinical.pptx']) {
    const entries = unzipSync(readFileSync(deck.pptxPath))
    if (entries['docProps/core.xml']) {
      entries['docProps/core.xml'] = strToU8(
        strFromU8(entries['docProps/core.xml']).replace(/<dc:title>[^<]*<\/dc:title>/, '<dc:title>PowerPoint Presentation</dc:title>')
      )
    }
    if (entries['ppt/theme/theme1.xml']) {
      entries['ppt/theme/theme1.xml'] = strToU8(
        strFromU8(entries['ppt/theme/theme1.xml'])
          .replace(/typeface="[^"]*"/g, (m, idx) => (idx % 2 === 0 ? 'typeface="Songti SC"' : 'typeface="Arial Unicode MS"'))
      )
    }
    writeFileSync(join(corpusDir, name), Buffer.from(zipSync(entries)))
  }

  const ingested = await ingestExemplarCorpus({ dirPath: corpusDir, cwd: dir, limit: 10 })
  assert.equal(ingested.ingestedCount, 2)
  const ids = ingested.exemplars.map((e) => e.id).sort()
  assert.deepEqual(ids, ['alpha-earnings', 'beta-clinical'], 'generic dc:title must fall back to filename stem with zero collision')

  const ab = await absorbPptx({ pptxPath: join(corpusDir, 'alpha-earnings.pptx'), cwd: dir, extractLogo: false })
  assert.equal(ab.sanitizedBrand.name, undefined, 'generic PowerPoint Presentation dc:title should not pollute sanitizedBrand.name')
  assert.notEqual(ab.sanitizedBrand.fontFamily, 'Arial Unicode MS', 'macOS-only Arial Unicode MS must be stripped')
  assert.notEqual(ab.sanitizedBrand.headingFont, 'Songti SC', 'macOS-only Songti SC must be stripped')
}))

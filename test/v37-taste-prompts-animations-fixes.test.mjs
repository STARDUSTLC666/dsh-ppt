import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, statSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { inflateRawSync } from 'node:zlib'

import { buildDeck, buildPptx, renderHtml, resolveTheme } from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { buildDeckAsync, checkDeck, buildArtDirectorPrompt } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { createPptExecutors } from '../lib/execution.js'
import { resolvePptConfig } from '../lib/config.js'
import { buildPptTools } from '../lib/tools.js'

function readZipEntryText(buf, entryName) {
  let pos = 0
  while (pos < buf.length - 30) {
    if (buf.readUInt32LE(pos) !== 0x04034b50) break
    const comp = buf.readUInt16LE(pos + 8)
    const cSize = buf.readUInt32LE(pos + 18)
    const nLen = buf.readUInt16LE(pos + 26)
    const eLen = buf.readUInt16LE(pos + 28)
    const name = buf.subarray(pos + 30, pos + 30 + nLen).toString('utf8')
    const dataStart = pos + 30 + nLen + eLen
    if (name === entryName) {
      const raw = buf.subarray(dataStart, dataStart + cSize)
      return (comp === 8 ? inflateRawSync(raw) : raw).toString('utf8')
    }
    pos = dataStart + cSize
  }
  return ''
}

test('v0.37: KPI grid & spotlight fall back to item.tag/label in both HTML and PPTX', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v37-kpi-'))
  try {
    const built = buildDeck({
      title: 'KPI Tag Fallback Test',
      theme: 'stripe-craft',
      outputDir: dir,
      slides: [
        { layout: 'cover', title: 'KPI 测试', subtitle: '示意数据' },
        {
          layout: 'kpi',
          variant: 'grid',
          title: '四项核心指标同步改善',
          items: [
            { tag: '首字延迟', value: '28', unit: 'ms', delta: '-72%', status: 'positive', text: '较基线压低 72%' },
            { tag: '集群利用率', value: '93.4', unit: '%', delta: '+41pp', status: 'accent', text: '排队空转消失' },
            { label: '单百万成本', value: '1.2', unit: '元', delta: '-64%', status: 'positive', text: '单位成本骤降' },
            { title: '冷启动', value: '120', unit: 'ms', delta: '-88%', status: 'positive', text: '预热池唤醒' },
          ],
        },
        {
          layout: 'kpi',
          variant: 'spotlight',
          title: '聚光灯指标同时兜底 tag',
          items: [
            { tag: '主指标延迟', value: '28', unit: 'ms', delta: '-72%', status: 'positive', text: '主卡' },
            { tag: '吞吐率', value: '4.8x', delta: '+380%', status: 'accent', text: '副卡' },
          ],
        },
      ],
    })
    const html = readFileSync(built.htmlPath, 'utf8')
    const pptx = readFileSync(built.pptxPath)
    const s2 = readZipEntryText(pptx, 'ppt/slides/slide2.xml')
    const s3 = readZipEntryText(pptx, 'ppt/slides/slide3.xml')

    for (const lbl of ['首字延迟', '集群利用率', '单百万成本', '冷启动']) {
      assert.ok(html.includes(lbl), `HTML kpi[grid] missing label: ${lbl}`)
      assert.ok(s2.includes(lbl), `PPTX kpi[grid] missing label: ${lbl}`)
    }
    assert.ok(html.includes('主指标延迟') && s3.includes('主指标延迟'), 'kpi[spotlight] hero tag missing')
    assert.ok(html.includes('吞吐率') && s3.includes('吞吐率'), 'kpi[spotlight] sat tag missing')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.37: Waterfall near-zero negative delta flips label cleanly without colliding with X-axis', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v37-wf-'))
  try {
    const built = await buildDeckAsync({
      title: 'Waterfall Anti-Collision',
      theme: 'stripe-craft',
      outputDir: dir,
      autoUpgrade: false,
      slides: [
        { layout: 'cover', title: '延迟拆解' },
        {
          layout: 'chart',
          title: '420ms 压到 28ms：四刀砍掉九成端到端延迟',
          chart: {
            kind: 'waterfall',
            unit: 'ms',
            categories: ['基线', '排队优化', '冷启动', '序列化', '抖动收敛', 'NOVA'],
            series: [{ name: '延迟', values: [420, -180, -130, -50, -32, 28] }],
            totalIndices: [0, 5],
          },
          source: '示意数据',
        },
      ],
    })
    const html = readFileSync(built.htmlPath, 'utf8')
    const pptx = readFileSync(built.pptxPath)
    const s2 = readZipEntryText(pptx, 'ppt/slides/slide2.xml')

    // In SVG, plot bottom is y=348; '-32' label must sit strictly above bottom (not >= 344)
    const svgMatch = html.match(/<text[^>]*y="([0-9.]+)"[^>]*>-32<\/text>/)
    assert.ok(svgMatch, 'expected -32 SVG label')
    assert.ok(Number(svgMatch[1]) < 344, `SVG -32 label y=${svgMatch[1]} collided with X-axis at 348`)

    // In PPTX, Waterfall Value 5 y must sit strictly above Waterfall Category 5 y (by >= 200000 EMU)
    const val5 = s2.match(/name="Waterfall Value 5"[\s\S]*?<a:off x="\d+" y="(\d+)"/)
    const cat5 = s2.match(/name="Waterfall Category 5"[\s\S]*?<a:off x="\d+" y="(\d+)"/)
    assert.ok(val5 && cat5, 'expected Waterfall Value 5 and Category 5 shapes in PPTX')
    assert.ok(Number(val5[1]) + 185000 < Number(cat5[1]), `PPTX Waterfall Value 5 (${val5[1]}) collided with Category 5 (${cat5[1]})`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.37: Whole-card grouped PPTX <p:timing> (clickEffect + withEffect) & per-slide transitions', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v37-anim-'))
  try {
    const built = await buildDeckAsync({
      title: 'Animation & Transition Suite',
      theme: 'stripe-craft',
      motion: true,
      motionProfile: 'keynote',
      outputDir: dir,
      autoUpgrade: false,
      slides: [
        { layout: 'cover', variant: 'keynote-glow', title: '动效验证' },
        {
          layout: 'kpi',
          variant: 'grid',
          reveal: 'step',
          transition: 'wipe',
          title: '整卡联动逐步显现',
          items: [
            { title: '延迟', value: '28', unit: 'ms', delta: '-72%', status: 'positive', text: '大幅下降' },
            { title: '利用率', value: '93%', delta: '+41pp', status: 'accent', text: '消除空转' },
            { title: '成本', value: '1.2', unit: '元', delta: '-64%', status: 'positive', text: '降本增效' },
          ],
        },
        {
          layout: 'isometric',
          variant: 'stack',
          reveal: 'step',
          transition: 'cover',
          title: '架构分层逐层呈现',
          items: [
            { tag: 'L3', title: '网关层', text: '统一鉴权与灰度' },
            { tag: 'L2', title: '调度层', text: '动态拼批' },
            { tag: 'L1', title: '算力层', text: '异构池化' },
          ],
        },
        { layout: 'closing', transition: 'none', title: '立即开始' },
      ],
    })
    const html = readFileSync(built.htmlPath, 'utf8')
    const pptx = readFileSync(built.pptxPath)
    const s1 = readZipEntryText(pptx, 'ppt/slides/slide1.xml')
    const s2 = readZipEntryText(pptx, 'ppt/slides/slide2.xml')
    const s3 = readZipEntryText(pptx, 'ppt/slides/slide3.xml')
    const s4 = readZipEntryText(pptx, 'ppt/slides/slide4.xml')

    // Transitions: keynote cover -> fade, slide 2 explicit wipe, slide 3 explicit cover, slide 4 none
    assert.ok(s1.includes('<p:fade/>'), 'keynote cover should use smooth fade')
    assert.ok(s2.includes('<p:wipe dir="l"/>'), 'slide 2 should honor explicit transition="wipe"')
    assert.ok(s3.includes('<p:cover dir="l"/>'), 'slide 3 should honor explicit transition="cover"')
    assert.ok(!s4.includes('<p:transition'), 'slide 4 transition="none" should omit <p:transition>')

    // Whole-card grouped timing: 3 KPI cards -> 3 clickEffect anchors + multiple withEffect child shapes (>3 total bldP)
    const clickCount = (s2.match(/nodeType="clickEffect"/g) || []).length
    const withCount = (s2.match(/nodeType="withEffect"/g) || []).length
    assert.equal(clickCount, 3, '3 KPI cards should produce 3 clickEffect groups')
    assert.ok(withCount >= 6, `expected child text/value/delta shapes grouped via withEffect, got ${withCount}`)

    // Isometric cards grouped too
    assert.equal((s3.match(/nodeType="clickEffect"/g) || []).length, 3)
    assert.ok((s3.match(/nodeType="withEffect"/g) || []).length >= 3)

    // HTML embedded auto-reveal & proportional narrow-stage scaling hooks
    assert.ok(html.includes('body.is-embedded .slide[data-reveal="step"] [data-reveal-step]'), 'missing embedded step auto-reveal CSS')
    assert.ok(html.includes('body.is-scaled-stage:not(.overview)'), 'missing proportional 16:9 stage scaling CSS')
    assert.ok(html.includes('function fitStage()'), 'missing fitStage() scaler')
    assert.ok(html.includes('data-transition="wipe"'), 'missing HTML data-transition attribute')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.37: editorial-forest facelift, architectural cover artwork & compact statement/quote/steps', () => {
  const th = resolveTheme('editorial-forest')
  assert.equal(th.palette.bg, '#FAF8F3')
  assert.equal(th.palette.panel, '#FFFFFF')
  assert.equal(th.tokens.accentSecondary, '#8B5E3C')

  const buf = buildPptx({
    title: '森系社论升级验证',
    theme: 'editorial-forest',
    slides: [
      { layout: 'cover', title: '把一周过成作品', subtitle: '关于注意力与留白的四步设计法' },
      { layout: 'statement', kicker: '第一原则', title: '真正的效率不是把日程填满', subtitle: '—— 节奏设计的第一原则' },
      { layout: 'quote', title: '留白不是浪费，是为判断力预留的带宽。', subtitle: '一份关于节奏的提醒' },
      {
        layout: 'process',
        variant: 'steps',
        title: '四步重排一周',
        items: [
          { tag: '01', title: '记录', text: '记下实际耗时' },
          { tag: '02', title: '分类', text: '识别高耗任务' },
          { tag: '03', title: '定锚', text: '锁住深度时段' },
          { tag: '04', title: '留白', text: '预留缓冲复盘' },
        ],
      },
    ],
  }, th, 'zh')

  const s1 = readZipEntryText(buf, 'ppt/slides/slide1.xml')
  const s2 = readZipEntryText(buf, 'ppt/slides/slide2.xml')
  const s3 = readZipEntryText(buf, 'ppt/slides/slide3.xml')
  const s4 = readZipEntryText(buf, 'ppt/slides/slide4.xml')

  assert.ok(s1.includes('Cover Editorial Ring 1'), 'default editorial cover should include subtle architectural rings')
  assert.ok(s1.includes('Cover Editorial Colophon'), 'default editorial cover should include issue colophon')

  // Quote card height should be compact (< 3.8" = 3474720 EMU, previously hardcoded 4.85" = 4434840 EMU)
  const qH = s3.match(/name="Quote card"[\s\S]*?<a:ext cx="\d+" cy="(\d+)"/)
  assert.ok(qH && Number(qH[1]) < 3600000, `expected compact quote card height, got ${qH?.[1]}`)

  // Statement card height should be compact (< 2.8" = 2560320 EMU for short 1-line title)
  const stH = s2.match(/name="Statement surface"[\s\S]*?<a:ext cx="\d+" cy="(\d+)"/)
  assert.ok(stH && Number(stH[1]) < 2600000, `expected compact statement card height, got ${stH?.[1]}`)

  // Short steps card height should be compact (< 2.8" = 2560320 EMU, previously 3.55" = 3246120 EMU)
  const stepH = s4.match(/name="Step Surface 1"[\s\S]*?<a:ext cx="\d+" cy="(\d+)"/)
  assert.ok(stepH && Number(stepH[1]) < 2600000, `expected compact step card height, got ${stepH?.[1]}`)
})

test('v0.37: 3-Layer Art-Director Prompts, SLOP-15 taste gates & repo invariants', async () => {
  // Layer 3 helper & reference file
  assert.ok(existsSync(resolve('skills/dsh-ppt/references/art-director.md')), 'references/art-director.md must exist')
  const showcase = buildArtDirectorPrompt({ topic: '随便做一份很酷炫的PPT', lang: 'zh' })
  assert.equal(showcase.profile, 'showcase')
  assert.equal(showcase.recommendedTheme, 'stripe-craft')
  assert.ok(showcase.directorPrompt.includes('示意数据'))
  assert.ok(showcase.goldenFields.kpi && showcase.goldenFields.waterfall)

  const consulting = buildArtDirectorPrompt({ topic: 'Q4 季度战略复盘汇报', persona: 'consulting', lang: 'zh' })
  assert.equal(consulting.profile, 'consulting')
  assert.equal(consulting.recommendedTheme, 'consulting')

  // ppt_templates executor automatically injects artDirector + directorPrompt
  const exec = createPptExecutors(resolvePptConfig({}))
  const tplRes = await exec.templates({ topic: '随便做一份炫酷产品发布PPT', lang: 'zh' })
  assert.ok(tplRes.artDirector && typeof tplRes.directorPrompt === 'string' && tplRes.directorPrompt.length > 40)

  // SLOP-15 catches excessive filler slides & zero visual anchors
  const blandDeck = {
    title: '纯文字鸡汤反例',
    theme: 'editorial-forest',
    language: 'zh',
    slides: [
      { layout: 'cover', title: '鸡汤' },
      { layout: 'statement', title: '观点一' },
      { layout: 'section', title: '第一章' },
      { layout: 'cards', title: '纯文字卡片一', items: [{ title: '甲', text: '说明' }, { title: '乙', text: '说明' }] },
      { layout: 'section', title: '第二章' },
      { layout: 'comparison', title: '对比', items: [{ title: '旧', bullets: ['一'] }, { title: '新', bullets: ['二'] }] },
      { layout: 'section', title: '第三章' },
      { layout: 'quote', title: '一句名言', subtitle: '某人' },
      { layout: 'closing', title: '开始行动', items: [{ title: '步一', text: '做' }, { title: '步二', text: '看' }] },
    ],
  }
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v37-slop15-'))
  try {
    const built = buildDeck({ ...blandDeck, outputDir: dir })
    const checked = checkDeck({ deckPath: built.jsonPath })
    assert.ok(checked.issues.some((i) => i.code === 'excessive-filler-slides'), 'SLOP-15 must flag excessive-filler-slides')
    assert.ok(checked.issues.some((i) => i.code === 'no-visual-anchors'), 'SLOP-15 must flag no-visual-anchors')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }

  // Sacred invariants: 13 tools & deck-layouts.mjs < 122880 B
  const tools = buildPptTools(resolvePptConfig({}))
  assert.equal(tools.length, 13, 'must remain strictly 13 tools')
  const layoutBytes = statSync(resolve('skills/dsh-ppt/scripts/deck-layouts.mjs')).size
  assert.ok(layoutBytes < 122880, `deck-layouts.mjs (${layoutBytes} B) exceeded 122880 B cap`)
})

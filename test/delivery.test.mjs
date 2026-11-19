import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { buildDeckAsync, editDeck, undoDeck, renderHandoutMarkdown, computePaceBudget, renderOnePagerHtml } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { renderHtml, resolveLanguage, resolveTheme } from '../skills/dsh-ppt/scripts/deck-core.mjs'

const link = (html, id) => new RegExp(`id="${id}" href="([^"]+)"`).exec(html)?.[1]

test('delivery links follow collision-resolved sibling artifacts, including Unicode names', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ppt-delivery-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const options = { title: '交付测试', content: '已经验收的具体事实。', outputDir: dir, fileName: '汇报 & 中文' }
  const first = await buildDeckAsync(options), second = await buildDeckAsync(options)
  assert.notEqual(first.jsonPath, second.jsonPath)
  for (const result of [first, second]) {
    const html = readFileSync(result.htmlPath, 'utf8')
    assert.equal(link(html, 'download-pptx'), './' + encodeURIComponent(basename(result.pptxPath)))
    assert.equal(link(html, 'download-project'), './' + encodeURIComponent(basename(result.jsonPath)))
    assert.equal(link(html, 'review-download-pptx'), link(html, 'download-pptx'))
    assert.equal(Object.keys(result.files).length, 3, 'portable delivery stays a three-file group')
  }
})

test('draft warnings and issue destinations refresh after editing and undo', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ppt-draft-review-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const output = await buildDeckAsync({ title: '周报', template: 'weekly', outputDir: dir })
  let html = readFileSync(output.htmlPath, 'utf8')
  assert.match(html, /草稿中还有待填写内容/)
  assert.match(html, /data-review-slide="2"/)
  const manifest = JSON.parse(readFileSync(output.jsonPath, 'utf8'))
  await editDeck({ deckPath: output.jsonPath, expectedRevision: 0, edits: manifest.slides.map((slide, i) => ({ slide: i + 1, patch: { subtitle: '已完成验收', bullets: ['有记录的事实'] } })) })
  html = readFileSync(output.htmlPath, 'utf8')
  assert.doesNotMatch(html, /草稿中还有待填写内容/)
  assert.match(html, /静态检查未发现问题/)
  await undoDeck({ deckPath: output.jsonPath, expectedRevision: 1 })
  assert.match(readFileSync(output.htmlPath, 'utf8'), /草稿中还有待填写内容/)
})

test('outline and quality report cannot inject executable markup', () => {
  const payload = '</button><script>alert(1)</script>'
  const manifest = { title: '安全样例', slides: [{ layout: 'cover', title: payload }], quality: { issues: [{ slide: 1, message: payload, suggestion: '<img src=x onerror=alert(1)>' }] } }
  const html = renderHtml(manifest, resolveTheme('data'), resolveLanguage('zh'))
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>|<img src=x/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
})

test('delivery includes Presenter Console (BroadcastChannel, Laser, Pace, A+/A-) and Handout download', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ppt-handout-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const output = await buildDeckAsync({
    title: '双屏提词测试',
    slides: [
      { layout: 'cover', title: '双屏提词测试', subtitle: '副标题' },
      { layout: 'bullets', title: '无备注自动回退要点', bullets: ['**核心指标**：增长 28%'], takeaway: '重点强调环比加速' },
      { layout: 'table', title: '核心数据表', rows: [['项目', '数值'], ['营收', '100万']], notes: '手写备注优先显示' },
    ],
    handout: true,
    outputDir: dir,
    fileName: 'presenter-handout',
  })
  assert.ok(output.handoutPath && existsSync(output.handoutPath), 'explicit handout:true writes .handout.md')
  const md = readFileSync(output.handoutPath, 'utf8')
  assert.match(md, /演讲者讲义|Speaker Handout/)
  assert.match(md, /预计演讲时长|Estimated Speaking Time/)
  assert.match(md, /\| 项目 \| 数值 \|/)
  assert.match(md, /手写备注优先显示/)
  assert.match(md, /重点强调环比加速/)

  const html = readFileSync(output.htmlPath, 'utf8')
  assert.match(html, /id="download-handout"/)
  assert.match(html, /id="dsh-laser-dot"/)
  assert.match(html, /BroadcastChannel/)
  assert.match(html, /window\.opener\.postMessage/)
  assert.match(html, /dsh-ppt-presenter/)
  assert.match(html, /id="ppace"/)
  assert.match(html, /id="font-plus"/)
  assert.match(html, /__dshTogglePresenter/)

  const standaloneMd = renderHandoutMarkdown({ title: 'Standalone', slides: [{ layout: 'bullets', title: 'Slide A', bullets: ['Fact 1'] }] }, 'en')
  assert.match(standaloneMd, /Speaker Handout & Script/)
  assert.match(standaloneMd, /Fact 1/)
})

test('Speaking-Pace Time Budgeter, Executive One-Pager, and 3-file default invariant', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ppt-onepager-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  // Default mode strictly preserves 3 files on disk (.html, .pptx, .json) while embedding #download-onepager Blob
  const defaultOut = await buildDeckAsync({
    title: '配速与一页纸测试',
    targetMinutes: 5,
    slides: [
      { layout: 'cover', title: '配速与一页纸测试', subtitle: '副标题论证' },
      { layout: 'kpi', title: '核心增长指标', items: [{ tag: '营收', value: '1.84', unit: '亿', delta: '+38%' }], takeaway: '增长稳健' },
      {
        layout: 'chart-split',
        title: '季度趋势领跑',
        chart: { kind: 'column', categories: ['Q1', 'Q2', 'Q3'], series: [{ name: '收入', values: [40, 55, 78] }], highlight: 'max' },
        items: [{ tag: '峰值', title: 'Q3 达 78', text: '创年内新高' }],
        notes: '这是一段非常长的演讲者备注，用来触发单页超过目标配速切片或者超过一百五十秒的预算告警。'.repeat(10),
      },
      { layout: 'closing', title: '下一步计划', subtitle: 'Q1 启动试点' },
    ],
    outputDir: dir,
    fileName: 'default-three',
  })

  assert.deepEqual(readdirSync(dir).sort(), ['default-three.html', 'default-three.json', 'default-three.pptx'])
  assert.equal(Object.keys(defaultOut.files).length, 3)
  assert.equal(defaultOut.onePagerPath, undefined)
  assert.ok(defaultOut.paceBudget.overBudgetSlides.includes(3), 'long notes + chart bonus triggers over-budget on slide 3')

  const defaultHtml = readFileSync(defaultOut.htmlPath, 'utf8')
  assert.match(defaultHtml, /id="download-onepager"/)
  assert.match(defaultHtml, /id="review-pace"/)

  // Explicit onePager: true writes .onepager.html
  const opDir = mkdtempSync(join(tmpdir(), 'ppt-onepager-explicit-'))
  t.after(() => rmSync(opDir, { recursive: true, force: true }))
  const opOut = await buildDeckAsync({
    title: '显式一页纸导出',
    onePager: true,
    targetMinutes: 4,
    slides: [
      { layout: 'cover', title: '显式一页纸导出', subtitle: '高管摘要' },
      { layout: 'kpi', title: '关键指标', items: [{ tag: 'ARR', value: '$12M', delta: '+42%' }] },
      { layout: 'closing', title: '行动清单', items: [{ tag: 'W1', title: '完成签核', text: '负责人确认' }] },
    ],
    outputDir: opDir,
    fileName: 'with-op',
  })
  assert.equal(Object.keys(opOut.files).length, 3)
  assert.ok(opOut.onePagerPath && existsSync(opOut.onePagerPath))
  const opHtml = readFileSync(opOut.onePagerPath, 'utf8')
  assert.match(opHtml, /切换长图战报|Mobile Long-Card/)
  assert.match(opHtml, /@media print/)
  assert.match(opHtml, /\$12M/)

  // Standalone computePaceBudget + renderOnePagerHtml
  const pace = computePaceBudget({
    title: 'Pace Unit',
    slides: [
      { layout: 'cover', title: 'Cover' },
      { layout: 'bullets', title: 'Dense', notes: 'word '.repeat(420) },
      { layout: 'bullets', title: 'Short', notes: 'Hi' },
    ],
  }, 5)
  assert.equal(pace.targetMinutes, 5)
  assert.ok(pace.overBudgetSlides.includes(2))
  assert.ok(pace.underBudgetSlides.includes(3))

  const standaloneOp = renderOnePagerHtml({
    title: 'One Pager EN',
    theme: 'consulting',
    slides: [
      { layout: 'cover', title: 'One Pager EN', subtitle: 'Thesis line' },
      { layout: 'chart', title: 'Revenue', chart: { kind: 'column', categories: ['A', 'B'], series: [{ name: 'Rev', values: [10, 20] }] } },
    ],
  }, 'en')
  assert.match(standaloneOp, /Mobile Long-Card/)
  assert.match(standaloneOp, /<svg/)
})

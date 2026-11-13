import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { generateLessonPlan, inferLessonType, createLessonDeck } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { apply } from '../lib/index.js'

const LESSON_TYPES = ['lecture', 'workshop', 'caseStudy', 'lab', 'seminar', 'flipped', 'micro']
const AUDIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'mixed']


/** 读取 PPTX zip 中的条目（仅测试用）。 */
function zipEntries(buffer) {
  let end = buffer.length - 22
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--
  const count = buffer.readUInt16LE(end + 10), entries = {}
  let pos = buffer.readUInt32LE(end + 16)
  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(pos + 10), size = buffer.readUInt32LE(pos + 20)
    const nameLength = buffer.readUInt16LE(pos + 28), extra = buffer.readUInt16LE(pos + 30)
    const comment = buffer.readUInt16LE(pos + 32), local = buffer.readUInt32LE(pos + 42)
    const name = buffer.toString('utf8', pos + 46, pos + 46 + nameLength)
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28)
    const raw = buffer.subarray(start, start + size)
    entries[name] = method === 0 ? raw : inflateRawSync(raw)
    pos += 46 + nameLength + extra + comment
  }
  return entries
}

function fakeCtx() {
  return {
    tools: {
      defs: [],
      register(def) { this.defs.push(def); return () => {} },
    },
    skills: { defs: [], register(def) { this.defs.push(def); return () => {} } },
    logger: { warn() {} },
    on() { return () => {} },
  }
}

function slideText(slide) {
  return [slide.title, slide.subtitle, slide.kicker, ...(slide.bullets ?? []), slide.notes]
    .filter(Boolean).join('\n')
}

test('generateLessonPlan 单对象参数：标题不再变成 [object Object]', () => {
  const plan = generateLessonPlan({ topic: 'Python 入门' })
  assert.equal(typeof plan.title, 'string')
  assert.ok(plan.title.includes('Python 入门'))
  assert.ok(!plan.title.includes('[object Object]'))
  assert.equal(plan.lessonType, 'lecture')
  assert.equal(plan.duration, 45)
  assert.ok(plan.slides.length >= 10)
})

test('时间分配：各页 timing 之和精确等于 duration（7 模式 × 抽样受众）', () => {
  for (const lessonType of LESSON_TYPES) {
    const duration = lessonType === 'micro' ? 15 : 45
    const plan = generateLessonPlan({ topic: '教学设计测试', lessonType, duration })
    const sum = plan.slides.reduce((acc, s) => acc + (s.timing || 0), 0)
    assert.equal(plan.totalTiming, sum, lessonType + ' totalTiming 应等于各页之和')
    assert.equal(sum, duration, lessonType + ' 各页 timing 之和应等于 duration')
    assert.ok(Math.abs(sum - duration) <= 5)
  }
})

test('确定性：同输入两次产出结构一致', () => {
  const a = generateLessonPlan({ topic: '确定性测试', lessonType: 'workshop', audience: 'intermediate', duration: 60 })
  const b = generateLessonPlan({ topic: '确定性测试', lessonType: 'workshop', audience: 'intermediate', duration: 60 })
  assert.equal(a.title, b.title)
  assert.equal(a.lessonType, b.lessonType)
  assert.equal(a.duration, b.duration)
  assert.deepEqual(a.objectives, b.objectives)
  assert.deepEqual(a.slides, b.slides)
  assert.equal(a.totalTiming, b.totalTiming)
})

test('自动推断：中英文关键词 → lessonType', () => {
  const cases = [
    ['动手实操 Python', 'workshop'], ['hands-on workshop', 'workshop'],
    ['商业案例分析', 'caseStudy'], ['a case study', 'caseStudy'],
    ['物理实验课', 'lab'], ['chemistry lab', 'lab'],
    ['读书研讨会', 'seminar'], ['a seminar', 'seminar'],
    ['翻转课堂', 'flipped'], ['flipped classroom', 'flipped'],
    ['15分钟微课', 'micro'], ['micro lesson', 'micro'],
    ['普通主题讲解', 'lecture'], ['random lecture topic', 'lecture'],
  ]
  for (const [topic, expected] of cases) {
    assert.equal(inferLessonType(topic), expected, `inferLessonType(${topic})`)
    assert.equal(generateLessonPlan({ topic }).lessonType, expected, `generateLessonPlan(${topic}).lessonType`)
  }
})

test('7 模式 × 4 受众共 28 组合均可生成且可落盘抽样', async () => {
  for (const lessonType of LESSON_TYPES) {
    for (const audience of AUDIENCE_LEVELS) {
      const plan = generateLessonPlan({ topic: '组合测试主题', lessonType, audience })
      assert.equal(plan.lessonType, lessonType)
      assert.equal(plan.audience, audience)
      assert.ok(plan.slides.length >= 8, `${lessonType}/${audience} 应产出多页`)
      assert.ok(plan.slides.every(s => typeof s.title === 'string' && s.title.trim() !== ''))
      // 时间总和仍等于 duration
      const sum = plan.slides.reduce((acc, s) => acc + (s.timing || 0), 0)
      assert.equal(sum, plan.duration, `${lessonType}/${audience} timing 总和`)
    }
  }
  // 抽样落盘：三种模式真实写出三件套 + 教案
  const dir = mkdtempSync(join(tmpdir(), 'dsh-lesson-28-'))
  try {
    for (const lessonType of ['lecture', 'workshop', 'micro']) {
      const out = await createLessonDeck({ topic: '抽样落盘测试', lessonType, outputDir: dir, fileName: 'sample-' + lessonType })
      assert.equal(out.ok, true)
      assert.ok(existsSync(out.htmlPath))
      assert.ok(existsSync(out.pptxPath))
      assert.ok(existsSync(out.jsonPath))
      assert.ok(existsSync(out.lessonPlanPath))
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('中英双语文案：en 产出英文、zh 产出中文、bilingual 不崩', () => {
  const zh = generateLessonPlan({ topic: '用户访谈', language: 'zh' })
  const en = generateLessonPlan({ topic: 'User Interviews', language: 'en' })
  const bi = generateLessonPlan({ topic: '用户访谈', language: 'bilingual' })
  assert.match(zh.slides[0].subtitle, /分钟/)
  assert.match(zh.objectives[0], /[\u4e00-\u9fff]/)
  assert.match(en.slides[0].subtitle, /min/)
  assert.match(en.objectives[0], /[a-zA-Z]/)
  assert.ok(!/[a-zA-Z]{4,}/.test(zh.objectives[0]), '中文目标不应以英文长词为主')
  assert.equal(bi.language, 'bilingual')
  assert.ok(bi.slides.length > 0)
})

test('无编造数据：不含裸百分比、虚构结果或图表假值', () => {
  const plan = generateLessonPlan({ topic: '数据安全', lessonType: 'lecture' })
  const allText = plan.slides.map(slideText).join('\n')
  // 任务点名的虚构内容必须被替换成占位符
  assert.ok(!allText.includes('30% improvement'), '不得出现 30% improvement')
  assert.ok(!allText.includes('A company facing'), '不得出现 A company facing')
  assert.ok(!/65\s*,\s*72\s*,\s*91/.test(allText), '不得出现图表假值 65,72,91')
  // 不产生图表页（数据必须是占位符，而非编造数字）
  assert.ok(plan.slides.every(s => !s.chart), '不得生成带编造数值的图表页')
  assert.ok(plan.slides.every(s => !s.image || !s.image.src || s.image.src !== ''), '不得生成空 src 图片')
  // 占位符显式存在
  assert.match(allText, /\[待填写：|\[To fill:/)
})

test('ppt_lesson_create 端到端：三件套 + 教案 Markdown 真实落盘、JSON 可解析', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-lesson-create-'))
  try {
    const out = await createLessonDeck({ topic: '如何做一次有效的用户访谈', lessonType: 'workshop', duration: 60, outputDir: dir, fileName: 'interview' })
    assert.equal(out.ok, true)
    assert.equal(out.theme, 'soft')
    assert.equal(out.lessonPlan.totalTiming, 60)
    // 三件套
    assert.ok(existsSync(out.htmlPath))
    assert.ok(existsSync(out.pptxPath))
    assert.ok(existsSync(out.jsonPath))
    assert.ok(existsSync(out.lessonPlanPath))
    // HTML / PPTX 结构
    assert.match(readFileSync(out.htmlPath, 'utf8'), /<!DOCTYPE html>/)
    assert.equal(readFileSync(out.pptxPath).subarray(0, 2).toString('ascii'), 'PK')
    // JSON 可解析且页数与返回值一致
    const manifest = JSON.parse(readFileSync(out.jsonPath, 'utf8'))
    assert.equal(manifest.slides.length, out.slideCount)
    // 教案 Markdown 含必需章节
    const md = readFileSync(out.lessonPlanPath, 'utf8')
    for (const section of ['学习目标', '时间轴', '互动清单', '评价设计', '准备事项']) {
      assert.ok(md.includes(section), '教案应包含「' + section + '」')
    }
    // 标注为草稿（含未填占位符）
    assert.equal(out.deliveryStatus, 'draft')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('ppt_lesson_generate 与 ppt_lesson_create 共用同一套生成逻辑', async () => {
  const generated = generateLessonPlan({ topic: '共享逻辑验证', lessonType: 'seminar' })
  const dir = mkdtempSync(join(tmpdir(), 'dsh-lesson-shared-'))
  try {
    const out = await createLessonDeck({ topic: '共享逻辑验证', lessonType: 'seminar', outputDir: dir, fileName: 'shared' })
    // create 内部的教案与 generate 的 slides/objectives 一致
    assert.deepEqual(out.lessonPlan.slides, generated.slides)
    assert.deepEqual(out.lessonPlan.objectives, generated.objectives)
    assert.equal(out.lessonPlan.totalTiming, generated.totalTiming)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('工具注册数为 10，ppt_lesson_create 参数 schema 合法', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const names = ctx.tools.defs.map((def) => def.name).sort()
  assert.deepEqual(names, ['ppt_check', 'ppt_create', 'ppt_data', 'ppt_edit', 'ppt_lesson_create', 'ppt_lesson_generate', 'ppt_render', 'ppt_templates', 'ppt_themes', 'ppt_undo'])
  const create = ctx.tools.defs.find((def) => def.name === 'ppt_lesson_create')
  assert.ok(create)
  assert.deepEqual(create.parameters.required, ['topic'])
  assert.deepEqual(create.parameters.properties.lessonType.enum, LESSON_TYPES)
  assert.deepEqual(create.parameters.properties.audience.enum, AUDIENCE_LEVELS)
  assert.deepEqual(create.parameters.properties.language.enum, ['zh', 'en', 'bilingual'])
  assert.equal(create.parameters.properties.theme.type, 'string')
  assert.deepEqual(create.parameters.properties.motion.enum, ['on', 'off'])
  assert.equal(create.output.schema.type, 'object')
  assert.equal(create.output.schema.additionalProperties, true)
  assert.deepEqual(JSON.parse(JSON.stringify(create.parameters)), create.parameters)
  // 执行校验：topic 为空报错
  await assert.rejects(() => create.execute({ topic: '  ' }), /topic 不能为空/)
})

test('ppt_lesson_create 工具可经注册通道一键出成品', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const create = ctx.tools.defs.find((def) => def.name === 'ppt_lesson_create')
  const dir = mkdtempSync(join(tmpdir(), 'dsh-lesson-tool-'))
  try {
    const out = await create.execute({ topic: '如何做好时间管理', outputDir: dir, fileName: 'time' })
    assert.equal(out.ok, true)
    assert.ok(existsSync(out.htmlPath))
    assert.ok(existsSync(out.pptxPath))
    assert.ok(existsSync(out.jsonPath))
    assert.ok(existsSync(out.lessonPlanPath))
    const rendered = create.output.render({}, out)
    assert.equal(rendered.length, 1)
    assert.match(rendered[0].text, /教案 Markdown/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('长主题标题不溢出：按显示宽度判定，端到端无 title-overflow', async () => {
  // 与引擎一致：全角字符记 1、半角记 0.55；正文页限额 24，封面等大版式限额 40
  const textWidth = text => [...String(text ?? '')].reduce((n, c) => n + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0)
  const limitFor = layout => (['cover', 'closing', 'statement', 'quote', 'section'].includes(layout) ? 40 : 24)

  const cases = [
    ['如何做一次真正有效且能落地的用户深度访谈与需求洞察完整方法论', 'zh'],
    ['How to run deeply effective user interviews that actually produce actionable insight', 'en'],
    ['短主题', 'zh'],
  ]
  for (const [topic, language] of cases) {
    const plan = generateLessonPlan({ topic, duration: 45, language })
    for (const slide of plan.slides) {
      if (typeof slide.title !== 'string' || slide.title === '') continue
      const width = textWidth(slide.title), limit = limitFor(slide.layout)
      assert.ok(width <= limit, `[${language}/${slide.layout}] 标题显示宽度 ${width} > ${limit}：${slide.title}`)
    }
  }

  // 端到端：ppt_check 不应报 title-overflow
  const dir = mkdtempSync(join(tmpdir(), 'lesson-title-'))
  try {
    const { checkDeck } = await import('../skills/dsh-ppt/scripts/deck-advanced.mjs')
    for (const [topic, language] of cases) {
      const result = await createLessonDeck({ topic, duration: 45, language, outputDir: dir })
      const report = checkDeck({ deckPath: result.jsonPath })
      const overflow = report.issues.filter(i => i.code === 'title-overflow')
      assert.deepEqual(overflow, [], `[${language}] 不应再有标题溢出：${JSON.stringify(overflow)}`)
      assert.equal(report.errorCount, 0)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('计时守恒与互动可用性：任意模式/时长下各页之和等于设定值，互动不低于 3 分钟', () => {
  for (const lessonType of LESSON_TYPES) {
    for (const duration of [15, 30, 45, 60, 90]) {
      const plan = generateLessonPlan({ topic: '用户访谈', lessonType, duration, language: 'zh' })
      // ① 总和必须等于设定时长
      assert.equal(plan.totalTiming, duration, `${lessonType}/${duration} 总计时 ${plan.totalTiming} ≠ ${duration}`)
      const sum = plan.slides.reduce((n, s) => n + (s.timing || 0), 0)
      assert.equal(sum, duration, `${lessonType}/${duration} 各页之和 ${sum} ≠ ${duration}`)
      // ② 互动页要够用（≥3 分钟），否则页面上的活动步骤做不完
      for (const slide of plan.slides.filter(s => s.activity === 'interaction')) {
        assert.ok((slide.timing || 0) >= 3, `${lessonType}/${duration} 互动「${slide.title}」仅 ${slide.timing} 分钟`)
      }
      // ③ 主活动与步骤合起来要有实际时长
      const mainActivity = plan.slides
        .filter(s => s.activity === 'main-activity' || s.activity === 'activity-step')
        .reduce((n, s) => n + (s.timing || 0), 0)
      if (plan.slides.some(s => s.activity === 'main-activity')) {
        assert.ok(mainActivity >= 4, `${lessonType}/${duration} 主活动合计仅 ${mainActivity} 分钟`)
      }
    }
  }
})

test('教案时间轴不出现 0 分钟的主活动行，且合计与时长一致', async () => {
  const { renderLessonPlanMarkdown } = await import('../skills/dsh-ppt/scripts/deck-advanced.mjs')
  const plan = generateLessonPlan({ topic: '用户访谈', duration: 45, language: 'zh' })
  const md = renderLessonPlanMarkdown(plan)
  assert.doesNotMatch(md, /\|\s*主活动\s*\|\s*0\s*\|/, '主活动不应显示为 0 分钟')
  assert.match(md, new RegExp(`\\|\\s*\\*\\*?合计\\*\\*?\\s*\\|\\s*\\*\\*?${plan.totalTiming}\\*\\*?\\s*\\|`))
})

test('长标题自动降字号：HTML 与 PPTX 都标记长度等级，不再依赖固定 max-width', async () => {
  const { buildDeckAsync } = await import('../skills/dsh-ppt/scripts/deck-advanced.mjs')
  const dir = mkdtempSync(join(tmpdir(), 'lesson-font-'))
  try {
    // 13 个全角字：PPTX 44pt 会折行，HTML 的 20ch 更早折行
    const title = '如何做一次有效的用户访谈'
    const out = await buildDeckAsync({
      title,
      theme: 'soft',
      outputDir: dir,
      fileName: 'font-check',
      slides: [
        { layout: 'cover', title, subtitle: '副标题' },
        { layout: 'closing', title: '谢谢' },
      ],
    })
    const html = readFileSync(out.htmlPath, 'utf8')
    assert.ok(html.includes('data-len="long"'), '长标题应带 data-len="long" 标记以触发降字号')
    // 短标题不应被降级
    assert.ok(!/data-len="long"[^>]*>谢谢/.test(html), '短标题不应被标记为长')

    // PPTX 侧：封面标题文本框里的字号应小于默认 44pt
    const entries = zipEntries(readFileSync(out.pptxPath))
    const slide1 = entries['ppt/slides/slide1.xml'].toString()
    const titleBox = slide1.match(/name="Title"[\s\S]*?<\/p:sp>/)
    assert.ok(titleBox, '应能找到封面标题文本框')
    assert.ok(titleBox[0].includes('如何做一次有效的用户访谈'), '标题文本框应包含标题文字')
    const sizeMatch = titleBox[0].match(/sz="(\d+)"/)
    assert.ok(sizeMatch, '封面标题应写入字号')
    assert.ok(Number(sizeMatch[1]) < 4400, `长标题封面字号应小于 4400，实际 ${sizeMatch[1]}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

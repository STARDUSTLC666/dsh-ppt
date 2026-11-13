/**
 * deck-course.mjs —— 课程包课件成稿引擎（零依赖）。
 *
 * 复用 deck-lesson.mjs 的教学结构常量（教学模式、环节标签、布鲁姆动词），
 * 但内容来自课程转写提炼出的结构化要点（带时间戳溯源），不是占位符。
 * 用 buildDeckAsync 出三件套，页数与深度按 mode 控制：
 *   deep 15–25 页 / quick 6–10 页 / outline 3–5 页。
 */
import { LESSON_TYPES, AUDIENCE_LEVELS, ACTIVITY_LABELS } from './deck-lesson.mjs'

const clampInt = (value, fallback, min, max) => {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback
  return Math.min(max, Math.max(min, n))
}
const fitTitle = (text, langKey, layout = 'bullets') => {
  const limit = ['cover', 'closing', 'statement', 'quote', 'section'].includes(layout) ? 40 : 24
  const raw = String(text ?? '').replace(/\s+/g, ' ').trim()
  const width = s => [...s].reduce((n, c) => n + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0)
  if (!raw || width(raw) <= limit) return raw
  let out = ''
  for (const c of raw) { if (width(out + c) > limit - 1) break; out += c }
  return out.replace(/[\s,，、:：—-]+$/, '') + '…'
}

/**
 * 生成课程课件计划（结构同 generateLessonPlan 的返回，供 buildDeckAsync 与 Markdown 渲染复用）。
 * @param {{ topic: string, mode: 'deep'|'quick'|'outline', language: string, refined: object,
 *   withHomework: boolean, lessonIndex: number, materials?: string[], stt: string, durationSec: number }} options
 */
export function generateCoursePlan(options = {}) {
  const topic = String(options.topic ?? '').trim() || '课程'
  const mode = ['quick', 'outline'].includes(options.mode) ? options.mode : 'deep'
  const language = ['zh', 'en', 'bilingual'].includes(options.language) ? options.language : 'zh'
  const en = language === 'en'
  const L = (zh, eng) => (en ? eng : zh)
  const refined = options.refined && typeof options.refined === 'object' ? options.refined : {}
  const core = Array.isArray(refined.coreConcepts) ? refined.coreConcepts : []
  const steps = Array.isArray(refined.keySteps) ? refined.keySteps : []
  const pitfalls = Array.isArray(refined.pitfalls) ? refined.pitfalls.map(String).filter(Boolean) : []
  const examples = Array.isArray(refined.examples) ? refined.examples : []
  const summary = Array.isArray(refined.summary) ? refined.summary.map(String).filter(Boolean) : []
  const withHomework = options.withHomework !== false
  const lessonIndex = clampInt(options.lessonIndex, 1, 1, 999)
  const materials = Array.isArray(options.materials) ? options.materials : []

  const durationMin = clampInt(Math.ceil((options.durationSec || 0) / 60), 15, 5, 180)
  const objectives = core.length
    ? core.map((c) => L('掌握', 'Understand') + '：' + (c.title || ''))
    : [L('掌握本课核心概念', 'Understand the core concepts')]

  const slides = []
  const push = (s) => slides.push(s)

  // 封面
  push({ layout: 'cover', title: fitTitle(topic, language, 'cover'),
    subtitle: L('第 ' + lessonIndex + ' 课 · ' + durationMin + ' 分钟', 'Lesson ' + lessonIndex + ' · ' + durationMin + ' min'),
    kicker: L('精讲课件', 'Course Lesson'), timing: 0, activity: 'cover' })

  if (mode === 'outline') {
    const bullets = [...(core.length ? core.map((c) => c.title) : []), ...(summary.length ? [summary[0]] : [])].slice(0, 8)
    push({ layout: 'bullets', title: L('📋 本课要点', '📋 Key points'), bullets: bullets.length ? bullets : [L('（本课无转写要点）', '(no points)')], timing: 3, activity: 'lecture' })
    if (summary.length) push({ layout: 'bullets', title: L('📝 小结', '📝 Summary'), bullets: summary.slice(0, 5), timing: 2, activity: 'summary' })
    if (withHomework) push({ layout: 'bullets', title: L('🏠 课后作业', '🏠 Homework'), bullets: homeworkBullets(topic, L, materials, core, summary), timing: 2, activity: 'homework' })
    push({ layout: 'closing', title: L('谢谢', 'Thank you'), subtitle: L('完成本课后继续下一课', 'Continue to the next lesson'), timing: 0, activity: 'closing' })
  } else if (mode === 'quick') {
    push({ layout: 'bullets', title: L('📋 课程议程', '📋 Agenda'), bullets: [L('核心概念', 'Core concepts'), L('关键步骤', 'Key steps'), L('易错点', 'Pitfalls'), L('小结', 'Summary')], timing: 2, activity: 'agenda' })
    for (const c of core.slice(0, 3)) push({ layout: 'bullets', title: fitTitle(L('概念', 'Concept') + '：' + (c.title || ''), language), bullets: (c.points || []).slice(0, 5), timing: 3, activity: 'lecture' })
    const stepBullets = steps.flatMap((s) => (s.points || []).slice(0, 2)).slice(0, 6)
    if (stepBullets.length) push({ layout: 'bullets', title: L('🔧 关键步骤', '🔧 Key steps'), bullets: stepBullets, timing: 2, activity: 'activity-step' })
    if (pitfalls.length) push({ layout: 'bullets', title: L('⚠️ 易错点', '⚠️ Pitfalls'), bullets: pitfalls.slice(0, 5), timing: 2, activity: 'assessment' })
    if (summary.length) push({ layout: 'bullets', title: L('📝 小结', '📝 Summary'), bullets: summary.slice(0, 5), timing: 2, activity: 'summary' })
    if (withHomework) push({ layout: 'bullets', title: L('🏠 课后作业', '🏠 Homework'), bullets: homeworkBullets(topic, L, materials, core, summary), timing: 2, activity: 'homework' })
    push({ layout: 'closing', title: L('谢谢', 'Thank you'), subtitle: L('完成本课后继续下一课', 'Continue to the next lesson'), timing: 0, activity: 'closing' })
  } else {
    // deep
    push({ layout: 'bullets', title: L('🎯 学习目标', '🎯 Objectives'), bullets: objectives.map((o, i) => (i + 1) + '. ' + o).slice(0, 6), timing: 3, activity: 'objectives' })
    push({ layout: 'bullets', title: L('📋 课程议程', '📋 Agenda'), bullets: [L('核心概念', 'Core concepts'), L('关键步骤', 'Key steps'), L('易错点与案例', 'Pitfalls & cases'), L('练习与小结', 'Practice & summary')], timing: 2, activity: 'agenda' })
    push({ layout: 'statement', title: L('💡 引入', '💡 Hook'), subtitle: (summary[0] || L('本课将讲解：' + topic, 'This lesson covers: ' + topic)), timing: 2, activity: 'hook' })
    // 核心概念：超过 3 点拆页，保证深度
    for (const c of core.slice(0, 6)) {
      const points = (c.points || []).slice(0, 8)
      if (points.length <= 3) push({ layout: 'bullets', title: fitTitle(L('概念', 'Concept') + '：' + (c.title || ''), language), bullets: points, timing: 4, activity: 'lecture' })
      else {
        const per = Math.ceil(points.length / Math.ceil(points.length / 3))
        for (let i = 0; i < points.length; i += per) push({ layout: 'bullets', title: fitTitle(L('概念', 'Concept') + '：' + (c.title || '') + (i > 0 ? '（续）' : ''), language), bullets: points.slice(i, i + per), timing: 3, activity: 'lecture' })
      }
    }
    for (const s of steps.slice(0, 4)) push({ layout: 'bullets', title: fitTitle(L('步骤', 'Step') + '：' + (s.title || ''), language), bullets: (s.points || []).slice(0, 5), timing: 3, activity: 'activity-step' })
    if (pitfalls.length) {
      if (pitfalls.length <= 5) push({ layout: 'bullets', title: L('⚠️ 易错点', '⚠️ Pitfalls'), bullets: pitfalls, timing: 2, activity: 'assessment' })
      else { push({ layout: 'bullets', title: L('⚠️ 易错点（上）', '⚠️ Pitfalls (1)'), bullets: pitfalls.slice(0, 5), timing: 2, activity: 'assessment' }); push({ layout: 'bullets', title: L('⚠️ 易错点（下）', '⚠️ Pitfalls (2)'), bullets: pitfalls.slice(5, 10), timing: 2, activity: 'assessment' }) }
    }
    for (const e of examples.slice(0, 2)) push({ layout: 'bullets', title: fitTitle(L('示例', 'Example') + '：' + (e.title || ''), language), bullets: (e.points || []).slice(0, 5), timing: 3, activity: 'example' })
    push({ layout: 'bullets', title: L('📝 练习巩固', '📝 Practice'), bullets: practiceBullets(topic, L, core, steps), timing: 3, activity: 'practice' })
    if (summary.length) push({ layout: 'bullets', title: L('📝 小结', '📝 Summary'), bullets: summary.slice(0, 6), timing: 2, activity: 'summary' })
    if (withHomework) push({ layout: 'bullets', title: L('🏠 课后作业', '🏠 Homework'), bullets: homeworkBullets(topic, L, materials, core, summary), timing: 2, activity: 'homework' })
    push({ layout: 'closing', title: L('谢谢', 'Thank you'), subtitle: L('完成本课后继续下一课', 'Continue to the next lesson'), timing: 0, activity: 'closing' })
  }

  // 统一把页数收进目标区间
  const trimmed = enforceRange(slides, mode, language)

  const totalTiming = trimmed.reduce((sum, s) => sum + (s.timing || 0), 0)
  return {
    title: topic, topic, lessonType: 'lecture', duration: durationMin, audience: 'mixed', language,
    slides: trimmed, totalTiming, objectives,
    metadata: { version: '1.0', slideCount: trimmed.length, estimatedDuration: totalTiming, interactionsCount: 0, assessmentCount: trimmed.filter((s) => s.activity === 'assessment').length },
  }
}

function homeworkBullets(topic, L, materials, core, summary) {
  const bullets = []
  bullets.push(L('观看视频并回看本课课件，梳理「' + (core[0]?.title || topic) + '」的核心概念', 'Review the video and these slides; summarize the core concepts'))
  bullets.push(L('完成练习题并对照小结自查', 'Finish the practice and check against the summary'))
  if (materials.length) bullets.push(L('作业素材已就位：' + materials.join('、'), 'Materials available: ' + materials.join(', ')))
  else bullets.push(L('按课件要点独立完成一次实操/复述', 'Complete one hands-on task or retell the key points'))
  bullets.push(L('提交：书面小结 + 你遇到的 1 个疑问', 'Submit: a written summary plus one question you still have'))
  return bullets.slice(0, 6)
}

function practiceBullets(topic, L, core, steps) {
  const b = []
  b.push(L('用自己的话复述「' + (core[0]?.title || topic) + '」', 'Restate the key concept in your own words'))
  if (steps.length) b.push(L('按步骤重做一遍：' + steps[0]?.title, 'Redo the first step: ' + steps[0]?.title))
  b.push(L('与同桌核对答案/结果', 'Compare with a partner'))
  return b.slice(0, 4)
}

function enforceRange(slides, mode, language) {
  const min = mode === 'outline' ? 3 : mode === 'quick' ? 6 : 15
  const max = mode === 'outline' ? 5 : mode === 'quick' ? 10 : 25
  if (slides.length < min) {
    // 扩张：把要点较多的页拆成两页
    let out = slides
    while (out.length < min) {
      const splitIdx = out.findIndex((s) => s.layout === 'bullets' && Array.isArray(s.bullets) && s.bullets.length > 3 && s.activity !== 'homework')
      if (splitIdx < 0) break
      const s = out[splitIdx], half = Math.ceil(s.bullets.length / 2)
      out = [...out.slice(0, splitIdx), { ...s, title: fitTitle(s.title + (language === 'en' ? ' (1)' : '（上）'), language), bullets: s.bullets.slice(0, half) }, { ...s, title: fitTitle(s.title + (language === 'en' ? ' (2)' : '（下）'), language), bullets: s.bullets.slice(half) }, ...out.slice(splitIdx + 1)]
    }
    return out
  }
  if (slides.length > max) {
    // 收缩：从后往前去掉概念/示例页，保留 cover/作业/closing
    let out = slides
    while (out.length > max) {
      const dropIdx = out.findLastIndex((s) => ['lecture', 'example'].includes(s.activity))
      if (dropIdx < 0) break
      out = [...out.slice(0, dropIdx), ...out.slice(dropIdx + 1)]
    }
    return out.slice(0, max)
  }
  return slides
}

/**
 * 渲染教案 Markdown（含转写时间戳溯源），与三件套同目录落盘。
 */
export function renderCoursePlanMarkdown(plan, segments = []) {
  const en = plan.language === 'en'
  const L = (zh, eng) => (en ? eng : zh)
  const t = LESSON_TYPES[plan.lessonType] || LESSON_TYPES.lecture
  const level = AUDIENCE_LEVELS[plan.audience] || AUDIENCE_LEVELS.beginner
  const lines = []
  lines.push(`# ${plan.title} · ${L('教案', 'Lesson Plan')}`)
  lines.push('')
  lines.push(`- ${L('主题', 'Topic')}：${plan.topic}`)
  lines.push(`- ${L('模式', 'Mode')}：${L(t.zh, t.en)}（${plan.lessonType}）`)
  lines.push(`- ${L('受众', 'Audience')}：${L(level.zh, level.en)}（${plan.audience}）`)
  lines.push(`- ${L('时长', 'Duration')}：${plan.duration} ${L('分钟', 'min')}`)
  lines.push('')
  lines.push(`## ${L('学习目标', 'Objectives')}`)
  lines.push('')
  plan.objectives.forEach((o, i) => lines.push(`${i + 1}. ${o}`))
  lines.push('')

  const groups = []
  for (const s of plan.slides) {
    const label = (ACTIVITY_LABELS[s.activity] || { zh: s.activity, en: s.activity })
    const last = groups[groups.length - 1]
    if (last && last.activity === s.activity) { last.pages += 1 } else { groups.push({ activity: s.activity, label: L(label.zh, label.en), pages: 1 }) }
  }
  lines.push(`## ${L('时间轴', 'Timeline')}`)
  lines.push('')
  lines.push(`| ${L('环节', 'Segment')} | ${L('页数', 'Pages')} |`)
  lines.push('| --- | --- |')
  for (const g of groups) lines.push(`| ${g.label} | ${g.pages} |`)
  lines.push(`| **${L('合计', 'Total')}** | ${plan.slides.length} |`)
  lines.push('')

  if (segments && segments.length) {
    lines.push(`## ${L('转写溯源', 'Transcript provenance')}`)
    lines.push('')
    lines.push(L('> 课件内容来自视频转写，逐条要点可回看对应时间戳。', '> Slide content is grounded in the video transcript with timestamps.'))
    lines.push('')
    for (const seg of segments.slice(0, 40)) {
      lines.push(`- \`${fmt(seg.start)}\` ${seg.text}`)
    }
    if (segments.length > 40) lines.push(L(`- （其余 ${segments.length - 40} 条转写见 _transcripts/）`, `- (${segments.length - 40} more segments in _transcripts/)`))
    lines.push('')
  }
  return lines.join('\n')
}

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec))
  const p = (n) => String(n).padStart(2, '0')
  return p(Math.floor(s / 3600)) + ':' + p(Math.floor((s % 3600) / 60)) + ':' + p(s % 60)
}

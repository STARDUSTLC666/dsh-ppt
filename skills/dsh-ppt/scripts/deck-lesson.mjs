/**
 * deck-lesson.mjs —— dsh-ppt 的课件教学设计引擎（零依赖）。
 *
 * 只做「教学设计结构骨架」的生成，不编造真实学科知识：
 * 所有需要真实内容的地方统一用 [待填写：…] / [To fill: …] 占位。
 *
 * 确定性：同一 (topic + 模式 + 受众 + 语言) 输入，两次产出结构完全一致
 * （不依赖 Date / Math.random，改用基于输入关键字的确定性哈希）。
 */

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

/** 课件教学模式 */
export const LESSON_TYPES = {
  lecture: { zh: '讲座式', en: 'Lecture', description: { zh: '教师主导，系统讲授知识点', en: 'Teacher-led, systematic knowledge delivery' } },
  workshop: { zh: '工作坊', en: 'Workshop', description: { zh: '动手实践为主，边学边做', en: 'Hands-on practice, learn by doing' } },
  caseStudy: { zh: '案例教学', en: 'Case Study', description: { zh: '真实案例分析，培养决策思维', en: 'Real case analysis, develop decision thinking' } },
  lab: { zh: '实验课', en: 'Lab Session', description: { zh: '实验操作、观察记录、结论推导', en: 'Experiments, observation, deduction' } },
  seminar: { zh: '研讨会', en: 'Seminar', description: { zh: '小组讨论、深度探究、共创知识', en: 'Group discussion, deep inquiry, co-creation' } },
  flipped: { zh: '翻转课堂', en: 'Flipped Classroom', description: { zh: '课前自学，课内解惑应用', en: 'Pre-class study, in-class application' } },
  micro: { zh: '微课', en: 'Micro Lesson', description: { zh: '5-15分钟聚焦单一知识点', en: '5-15 min focus on single concept' } },
}

/** 受众层级 */
export const AUDIENCE_LEVELS = {
  beginner: { zh: '入门/零基础', en: 'Beginner', bloom: ['remember', 'understand'] },
  intermediate: { zh: '进阶/有基础', en: 'Intermediate', bloom: ['understand', 'apply', 'analyze'] },
  advanced: { zh: '高阶/专业', en: 'Advanced', bloom: ['analyze', 'evaluate', 'create'] },
  mixed: { zh: '混合水平', en: 'Mixed', bloom: ['understand', 'apply', 'analyze'] },
}

/** 布鲁姆分类学动词 */
export const BLOOM_VERBS = {
  zh: {
    remember: ['列举', '识别', '回忆', '定义', '命名', '复述'],
    understand: ['解释', '描述', '分类', '总结', '转述', '举例说明'],
    apply: ['应用', '演示', '计算', '操作', '解决', '使用'],
    analyze: ['分析', '对比', '区分', '归类', '推断', '关联'],
    evaluate: ['评价', '论证', '判断', '批评', '验证', '优选'],
    create: ['设计', '构建', '规划', '创新', '整合', '重构'],
  },
  en: {
    remember: ['list', 'identify', 'recall', 'define', 'name', 'state'],
    understand: ['explain', 'describe', 'classify', 'summarize', 'paraphrase', 'illustrate'],
    apply: ['apply', 'demonstrate', 'calculate', 'operate', 'solve', 'use'],
    analyze: ['analyze', 'compare', 'differentiate', 'categorize', 'infer', 'relate'],
    evaluate: ['evaluate', 'argue', 'judge', 'critique', 'validate', 'prioritize'],
    create: ['design', 'construct', 'plan', 'innovate', 'integrate', 'reconstruct'],
  },
}

/** 互动活动类型（duration 仅作参考说明，实际时间由总时长预算分配） */
export const INTERACTION_TYPES = {
  poll: { zh: '即时投票', en: 'Live Poll', icon: '📊', minutes: 3 },
  quiz: { zh: '快速测验', en: 'Quick Quiz', icon: '❓', minutes: 4 },
  thinkPairShare: { zh: '思考-配对-分享', en: 'Think-Pair-Share', icon: '🤝', minutes: 5 },
  groupDiscussion: { zh: '小组讨论', en: 'Group Discussion', icon: '💬', minutes: 8 },
  handsOn: { zh: '动手实操', en: 'Hands-on Exercise', icon: '⌨️', minutes: 10 },
  caseAnalysis: { zh: '案例分析', en: 'Case Analysis', icon: '📋', minutes: 10 },
  peerReview: { zh: '同伴互评', en: 'Peer Review', icon: '👥', minutes: 8 },
  exitTicket: { zh: '出口票/离场卡', en: 'Exit Ticket', icon: '🎫', minutes: 3 },
  reflection: { zh: '反思日志', en: 'Reflection Journal', icon: '📝', minutes: 5 },
  galleryWalk: { zh: '画廊漫步', en: 'Gallery Walk', icon: '🖼️', minutes: 8 },
}

const VISUAL_LABELS = {
  zh: {
    'concept-map': '概念图', flowchart: '流程图', 'comparison-table': '对比表格',
    checklist: '检查清单', 'mind-map': '思维导图', 'screenshot-sequence': '分步截图',
    diagram: '原理示意图', 'case-study': '案例结构图',
  },
  en: {
    'concept-map': 'a concept map', flowchart: 'a flowchart', 'comparison-table': 'a comparison table',
    checklist: 'a checklist', 'mind-map': 'a mind map', 'screenshot-sequence': 'step-by-step screenshots',
    diagram: 'a diagram', 'case-study': 'a case structure diagram',
  },
}

/** 时间模型：固定分钟 + 内容权重（权重总和为 1，一次性分配） */
const LESSON_TIME_MODEL = {
  lecture: { fixed: { hook: 3, objectives: 3, agenda: 2, summary: 3, homework: 2 }, weights: { concepts: 0.40, examples: 0.20, activity: 0.15, interactions: 0.10, assessment: 0.15 } },
  workshop: { fixed: { hook: 2, objectives: 2, agenda: 2, summary: 3, homework: 2 }, weights: { concepts: 0.20, examples: 0.10, activity: 0.45, interactions: 0.15, assessment: 0.10 } },
  caseStudy: { fixed: { hook: 3, objectives: 2, agenda: 2, summary: 3, homework: 2 }, weights: { concepts: 0.15, examples: 0.35, activity: 0.25, interactions: 0.15, assessment: 0.10 } },
  lab: { fixed: { hook: 2, objectives: 2, agenda: 2, summary: 3, homework: 2 }, weights: { concepts: 0.10, examples: 0.10, activity: 0.55, interactions: 0.15, assessment: 0.10 } },
  seminar: { fixed: { hook: 3, objectives: 2, agenda: 2, summary: 3, homework: 2 }, weights: { concepts: 0.15, examples: 0.20, activity: 0.35, interactions: 0.20, assessment: 0.10 } },
  flipped: { fixed: { hook: 1, objectives: 1, agenda: 1, summary: 2, homework: 2 }, weights: { concepts: 0.10, examples: 0.10, activity: 0.55, interactions: 0.15, assessment: 0.10 } },
  micro: { fixed: { hook: 1, objectives: 1, agenda: 0, summary: 1, homework: 1 }, weights: { concepts: 0.50, examples: 0.20, activity: 0.20, interactions: 0.00, assessment: 0.10 } },
}

const ACTIVITY_LABELS = {
  cover: { zh: '封面', en: 'Cover' },
  objectives: { zh: '学习目标', en: 'Learning objectives' },
  agenda: { zh: '课程议程', en: 'Agenda' },
  hook: { zh: '引入钩子', en: 'Hook' },
  lecture: { zh: '核心概念', en: 'Core concepts' },
  interaction: { zh: '互动活动', en: 'Interaction' },
  example: { zh: '示例/案例', en: 'Examples & cases' },
  'main-activity': { zh: '主活动', en: 'Main activity' },
  'activity-step': { zh: '活动步骤', en: 'Activity steps' },
  practice: { zh: '练习巩固', en: 'Practice' },
  assessment: { zh: '形成性检查', en: 'Formative assessment' },
  'formative-check': { zh: '评价检查', en: 'Assessment check' },
  summary: { zh: '总结', en: 'Summary' },
  homework: { zh: '作业', en: 'Homework' },
  closing: { zh: '结束页', en: 'Closing' },
}

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

/** 确定性哈希（FNV-1a 32 位），把同一输入稳定映射到同一选择。 */
function hashString(input) {
  let h = 2166136261
  const text = String(input ?? '')
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick(seed, list) {
  if (!Array.isArray(list) || list.length === 0) return undefined
  return list[hashString(seed) % list.length]
}

function clampInt(value, fallback, min, max) {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback
  return Math.min(max, Math.max(min, n))
}

/** 把 total 分钟拆成 count 份整数，总和精确等于 total。 */
function splitMinutes(total, count) {
  if (!Number.isInteger(count) || count <= 0) return []
  const base = Math.floor(total / count)
  const rem = total - base * count
  const out = []
  for (let i = 0; i < count; i++) out.push(base + (i < rem ? 1 : 0))
  return out
}

/**
 * 标题长度兜底：长主题在拼接「核心概念 N: 主题+片段」后会超出行宽，触发 title-overflow。
 * 中英文分别按更保守的字数/词数截断，并保留可读的省略号；不改动主题本身。
 */
/** 与 ppt_check 一致的显示宽度：全角记 1、半角记 0.55。 */
function displayWidth(text) {
  return [...String(text ?? '')].reduce((n, c) => n + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0)
}

/** 按显示宽度裁剪文本，保留可读省略号。 */
function clampWidth(text, limit) {
  const raw = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!raw || displayWidth(raw) <= limit) return raw
  let out = ''
  for (const c of raw) {
    if (displayWidth(out + c) > limit - 1) break
    out += c
  }
  return out.replace(/[\s,，、:：—-]+$/, '') + '…'
}

/**
 * 标题长度兜底：正文页标题限额 24（显示宽度），大版式（cover/closing/statement/quote/section）为 40。
 * 长主题拼接后容易超出行宽并触发 title-overflow，这里统一按版式收缩。
 */
function fitTitle(text, langKey, layout = 'bullets') {
  const limit = ['cover', 'closing', 'statement', 'quote', 'section'].includes(layout) ? 40 : 24
  return clampWidth(text, limit)
}

/** 把 slides 的总计时校正到 target 分钟；优先压缩概念/示例等弹性页，互动与主活动保底。 */
function balanceTiming(slides, target) {
  const total = () => slides.reduce((sum, s) => sum + (s.timing || 0), 0)
  let diff = total() - target
  if (diff === 0) return slides

  // 可压缩页：保留至少 1 分钟；互动/主活动/评价这类参与型环节下限更高。
  const floorOf = slide => {
    if (slide.activity === 'interaction') return Math.min(3, slide.timing || 1)
    if (slide.activity === 'main-activity' || slide.activity === 'activity-step') return 2
    if (slide.activity === 'formative-check') return 1
    if (slide.timing > 0) return 1
    return 0
  }
  const shrinkables = slides.filter(s => (s.timing || 0) > floorOf(s))

  while (diff > 0 && shrinkables.length > 0) {
    // 每轮从最长的页各扣 1 分钟，避免把某一页压到不可用
    shrinkables.sort((a, b) => (b.timing || 0) - (a.timing || 0))
    let shrunk = false
    for (const slide of shrinkables) {
      if (diff <= 0) break
      if ((slide.timing || 0) > floorOf(slide)) { slide.timing -= 1; diff -= 1; shrunk = true }
    }
    if (!shrunk) break
  }

  // 若仍不足（页数太多、每页都已到下限），把多出来的量补给最长的页，至少保证总数一致
  if (diff !== 0) {
    const flexible = slides.filter(s => s.timing !== undefined && s.timing > 0)
    if (flexible.length > 0) {
      flexible.sort((a, b) => (b.timing || 0) - (a.timing || 0))
      flexible[0].timing = Math.max(0, (flexible[0].timing || 0) - diff)
    }
  }
  return slides
}

// ---------------------------------------------------------------------------
// 自动推断
// ---------------------------------------------------------------------------

/** 按主题关键词推断教学模式（中英文覆盖）。 */
export function inferLessonType(topic) {
  const text = String(topic ?? '').toLowerCase()
  if (/实操|动手|练习|workshop|hands[- ]on/.test(text)) return 'workshop'
  if (/案例|\bcase\b/.test(text)) return 'caseStudy'
  if (/实验|\blab\b/.test(text)) return 'lab'
  if (/研讨|讨论|\bseminar\b/.test(text)) return 'seminar'
  if (/翻转|flipped/.test(text)) return 'flipped'
  if (/微课|15 ?分钟|短课|micro/.test(text)) return 'micro'
  return 'lecture'
}

// ---------------------------------------------------------------------------
// 时间分配（一次性）
// ---------------------------------------------------------------------------

function calculateTimeAllocation(totalMinutes, lessonType, hasInteractions, hasAssessment) {
  const model = LESSON_TIME_MODEL[lessonType] || LESSON_TIME_MODEL.lecture
  const fixed = model.fixed
  const fixedTotal = fixed.hook + fixed.objectives + fixed.agenda + fixed.summary + fixed.homework
  const flexible = Math.max(0, totalMinutes - fixedTotal)
  const weights = { ...model.weights }
  if (!hasInteractions) { weights.activity += weights.interactions; weights.interactions = 0 }
  if (!hasAssessment) { weights.activity += weights.assessment; weights.assessment = 0 }
  // 各段最小可用时间：低于这个值环节没有实际意义（例如主活动 0 分钟、互动 1 分钟）。
  const MINIMUM = { concepts: 6, examples: 4, activity: 8, interactions: 3, assessment: 3 }
  const keys = ['concepts', 'examples', 'activity', 'interactions', 'assessment']
  const weightTotal = keys.reduce((sum, k) => sum + weights[k], 0) || 1
  const alloc = { objectives: fixed.objectives, agenda: fixed.agenda, hook: fixed.hook, summary: fixed.summary, homework: fixed.homework }
  for (const key of keys) {
    alloc[key] = weights[key] > 0 ? Math.round(flexible * weights[key] / weightTotal) : 0
  }

  // ① 先补足低于最小值的环节，从占比最大且富余最多的段落里扣。
  for (const key of keys) {
    if (weights[key] <= 0) { alloc[key] = 0; continue }
    if (alloc[key] >= MINIMUM[key]) continue
    const need = MINIMUM[key] - alloc[key]
    const donors = keys
      .filter(k => k !== key && weights[k] > 0 && alloc[k] > MINIMUM[k])
      .sort((a, b) => (alloc[b] - MINIMUM[b]) - (alloc[a] - MINIMUM[a]))
    let remaining = need
    for (const donor of donors) {
      if (remaining <= 0) break
      const spare = alloc[donor] - MINIMUM[donor]
      const take = Math.min(spare, remaining)
      alloc[donor] -= take
      remaining -= take
    }
    alloc[key] += need - remaining
  }

  // ② 修正四舍五入误差，把差额补到 concepts（内容主段），保证总和精确等于 duration。
  const used = fixedTotal + keys.reduce((sum, k) => sum + alloc[k], 0)
  alloc.concepts = Math.max(0, alloc.concepts + (totalMinutes - used))
  return alloc
}

// ---------------------------------------------------------------------------
// 生成辅助函数
// ---------------------------------------------------------------------------

function generateObjectives(topic, bloomLevels, verbs, langKey, seed) {
  const en = langKey === 'en'
  const count = 3 + (hashString(seed + '::objectives') % 3) // 3..5
  const templates = en
    ? [
        (v, t) => `${v} the key concepts of ${t}`,
        (v, t) => `${v} the differences between ${t} approaches`,
        (v, t) => `${v} ${t} to solve a real problem`,
        (v, t) => `${v} a ${t} solution for a given scenario`,
        (v, t) => `${v} the effectiveness of ${t} methods`,
      ]
    : [
        (v, t) => `${v}${t}的核心概念`,
        (v, t) => `${v}${t}的不同方法与区别`,
        (v, t) => `${v}${t}解决实际问题`,
        (v, t) => `${v}一个${t}解决方案`,
        (v, t) => `${v}${t}方法的有效性`,
      ]
  const objectives = []
  for (let i = 0; i < count; i++) {
    const level = bloomLevels[i % bloomLevels.length]
    const verb = verbs[level][i % verbs[level].length]
    objectives.push(templates[i % templates.length](verb, topic))
  }
  return objectives
}

function generateHook(topic, lessonType, langKey, seed) {
  const en = langKey === 'en'
  const hooks = en
    ? [
        `What if you could master ${topic} in just ${lessonType === 'micro' ? '15 minutes' : 'one session'}?`,
        `Every expert in ${topic} started exactly where you are today.`,
        `The #1 mistake beginners make with ${topic} is…`,
        `By the end of this session, you'll be able to ${topic.toLowerCase()} like a pro.`,
        `Imagine being able to ${topic.toLowerCase()} effortlessly. Today, we make it real.`,
      ]
    : [
        `如果只用${lessonType === 'micro' ? '15分钟' : '一节课'}就能掌握${topic}，你想试试吗？`,
        `每一位${topic}专家，都曾从你现在的起点出发。`,
        `初学者在${topic}上最容易犯的错误是……`,
        `课程结束时，你将能像专家一样${topic}。`,
        `想象一下：轻松驾驭${topic}的感觉。今天，我们让它变成现实。`,
      ]
  return pick(seed + '::hook', hooks)
}

function generateConcepts(topic, lessonType, duration, langKey, seed) {
  const en = langKey === 'en'
  const count = Math.min(5, Math.max(3, Math.floor(duration / 10)))
  const conceptTemplates = en
    ? [
        { title: `Fundamentals`, points: [`What is ${topic}?`, `Why does ${topic} matter?`, `Core principles`, `Key terminology`], visual: 'concept-map' },
        { title: `How it works`, points: [`Step-by-step process`, `Input → Process → Output`, `Critical decision points`, `Common variations`], visual: 'flowchart' },
        { title: `Key techniques`, points: [`Technique A: when to use it`, `Technique B: when to use it`, `Technique C: when to use it`, `How to compare them`], visual: 'comparison-table' },
        { title: `Best practices`, points: [`Do: [To fill: proven patterns]`, `Don't: [To fill: common pitfalls]`, `Performance / quality tips`, `Maintainability guidelines`], visual: 'checklist' },
        { title: `Advanced concepts`, points: [`Edge cases`, `Optimization strategies`, `Integration with other tools`, `Future trends`], visual: 'mind-map' },
      ]
    : [
        { title: `基础入门`, points: [`什么是${topic}？`, `为什么${topic}重要？`, `核心原理`, `关键术语`], visual: 'concept-map' },
        { title: `运作机制`, points: [`分步骤流程`, `输入 → 处理 → 输出`, `关键决策点`, `常见变体`], visual: 'flowchart' },
        { title: `核心技巧`, points: [`技巧A：适用场景`, `技巧B：适用场景`, `技巧C：适用场景`, `如何对比选择`], visual: 'comparison-table' },
        { title: `最佳实践`, points: [`推荐做法：[待填写：经验模式]`, `避坑指南：[待填写：常见错误]`, `性能/质量优化建议`, `可维护性原则`], visual: 'checklist' },
        { title: `进阶概念`, points: [`边界情况处理`, `优化策略`, `与其他工具集成`, `未来发展趋势`], visual: 'mind-map' },
      ]
  const start = hashString(seed + '::concepts') % conceptTemplates.length
  const concepts = []
  for (let i = 0; i < count; i++) {
    const tmpl = conceptTemplates[(start + i) % conceptTemplates.length]
    concepts.push({
      title: tmpl.title,
      points: tmpl.points,
      notes: en
        ? `Explain ${tmpl.title.toLowerCase()}. Visual aid: use ${VISUAL_LABELS.en[tmpl.visual] || tmpl.visual}. Check understanding with a quick question.`
        : `讲解${tmpl.title}。视觉建议：使用${VISUAL_LABELS.zh[tmpl.visual] || tmpl.visual}辅助理解。用快速提问检查掌握度。`,
    })
  }
  return concepts
}

function selectInteraction(lessonType, bloomLevels, langKey, seed, index) {
  const interactions = Object.entries(INTERACTION_TYPES).map(([id, v]) => ({ id, ...v }))
  let filtered = interactions
  if (lessonType === 'lecture') filtered = interactions.filter(i => ['poll', 'quiz', 'thinkPairShare'].includes(i.id))
  else if (lessonType === 'workshop') filtered = interactions.filter(i => ['handsOn', 'groupDiscussion', 'peerReview'].includes(i.id))
  else if (lessonType === 'caseStudy') filtered = interactions.filter(i => ['caseAnalysis', 'groupDiscussion', 'galleryWalk'].includes(i.id))
  else if (lessonType === 'lab') filtered = interactions.filter(i => ['handsOn', 'peerReview', 'exitTicket'].includes(i.id))
  else if (lessonType === 'seminar') filtered = interactions.filter(i => ['groupDiscussion', 'thinkPairShare', 'galleryWalk'].includes(i.id))
  else if (lessonType === 'flipped') filtered = interactions.filter(i => ['peerReview', 'groupDiscussion', 'reflection'].includes(i.id))
  else if (lessonType === 'micro') filtered = interactions.filter(i => ['poll', 'quiz', 'exitTicket'].includes(i.id))
  const selected = pick(seed + '::interaction-' + index, filtered)
  const en = langKey === 'en'
  const prompts = en
    ? {
        poll: [`Which aspect of today's topic is most relevant to you?`, `Rate your confidence level (1-5)`],
        quiz: [`Quick question: What is the key principle?`, `Multiple choice: Which approach is best for X?`],
        thinkPairShare: [`Think: work out your own answer first`, `Pair: discuss and compare with a neighbor`, `Share: volunteers present to the group`],
        groupDiscussion: [`Discuss in groups of 3-4`, `Each group presents one key insight`, `Synthesize: What patterns emerged?`],
        handsOn: [`Follow the step-by-step guide`, `Complete the exercise independently`, `Compare results with a partner`],
        caseAnalysis: [`Read the case silently`, `Analyze: What would you do?`, `Debate: Alternative approaches`],
        peerReview: [`Exchange work with a partner`, `Use the rubric to give feedback`, `Discuss improvements`],
        exitTicket: [`One thing you learned`, `One question you still have`, `Rate today's session (1-5)`],
        reflection: [`What was your "aha!" moment?`, `How will you apply this?`, `What needs more practice?`],
        galleryWalk: [`Walk around and review peers' work`, `Leave sticky-note feedback`, `Return to your work: What did you learn?`],
      }
    : {
        poll: [`今天的主题中，哪方面与你最相关？`, `你的自信度打几分 (1-5)？`],
        quiz: [`快速提问：核心原则是什么？`, `单选题：场景X最适合哪种方法？`],
        thinkPairShare: [`独立思考：先各自写出你的答案`, `两两讨论：与同桌交换并对比想法`, `全班分享：自愿者向全班展示`],
        groupDiscussion: [`3-4人小组讨论`, `每组输出一个核心洞见`, `综合：发现了什么共同模式？`],
        handsOn: [`跟随步骤指南操作`, `独立完成练习`, `与搭档对比结果`],
        caseAnalysis: [`静读案例材料`, `分析：你会怎么做？`, `辩论：有什么替代方案？`],
        peerReview: [`与搭档交换作业`, `用评分表给予反馈`, `讨论改进方向`],
        exitTicket: [`今天学到的一点`, `仍有的一个疑问`, `给今天打分 (1-5)`],
        reflection: [`你的"顿悟时刻"是什么？`, `你打算怎么应用？`, `哪里还需要练习？`],
        galleryWalk: [`走动查看同伴作品`, `贴便利贴给反馈`, `回到自己的作品：学到了什么？`],
      }
  const notes = en
    ? {
        poll: 'Use a live poll tool. Show results and discuss the distribution.',
        quiz: 'Show the correct answer after. Explain why the distractors are wrong.',
        thinkPairShare: 'Circulate during pair time. Call on diverse voices to share.',
        groupDiscussion: 'Assign roles: facilitator, note-taker, timekeeper, presenter.',
        handsOn: 'Provide a starter template. Offer hint cards for stuck learners.',
        caseAnalysis: 'No single right answer. Focus on reasoning quality.',
        peerReview: 'Model constructive feedback: specific, actionable, kind.',
        exitTicket: 'Collect digitally or on paper. Review before the next class.',
        reflection: 'Optional: collect for insight. Not graded.',
        galleryWalk: 'Set clear criteria for feedback. Debrief patterns.',
      }
    : {
        poll: '使用实时投票工具。展示结果并讨论分布。',
        quiz: '公布答案后讲解。解释为什么干扰项不对。',
        thinkPairShare: '配对时巡场。点名不同学员分享。',
        groupDiscussion: '分配角色：主持、记录、计时、汇报。',
        handsOn: '提供启动模板。准备提示卡帮助卡住的学员。',
        caseAnalysis: '无标准答案。关注推理质量。',
        peerReview: '示范建设性反馈：具体、可行、善意。',
        exitTicket: '电子或纸质收集。下节课前复盘。',
        reflection: '可选收集洞察。不计分。',
        galleryWalk: '设定明确反馈标准。复盘共性模式。',
      }
  return {
    id: selected.id,
    icon: selected.icon,
    name: selected[langKey],
    minutes: selected.minutes,
    prompts: prompts[selected.id] || [en ? 'Activity prompt 1' : '活动提示 1'],
    notes: notes[selected.id] || (en ? 'Facilitate the activity.' : '主持该活动。'),
  }
}

function generateExamples(topic, lessonType, langKey, seed) {
  const en = langKey === 'en'
  const frames = [
    {
      title: en ? `Real-world case` : `真实应用案例`,
      points: [
        en ? `Context: [To fill: one line on the industry and scenario]` : `背景：[待填写：一句话说明案例所在行业与场景]`,
        en ? `Challenge: [To fill: the specific problem faced]` : `挑战：[待填写：该场景面临的具体问题]`,
        en ? `Approach: how ${topic} is applied — [To fill: key steps]` : `做法：如何应用${topic}——[待填写：关键步骤]`,
        en ? `Result: [To fill: real data or effect; do not invent percentages, names or history]` : `结果：[待填写：真实数据或效果，勿编造百分比/人名/史实]`,
        en ? `Takeaway: [To fill: one lesson transferable to this class]` : `启示：[待填写：可迁移给本课听众的一条经验]`,
      ],
    },
    {
      title: en ? `Step-by-step walkthrough` : `分步演示`,
      points: [
        en ? `Starting point: [To fill: initial state / prerequisites]` : `起点：[待填写：初始状态/前提条件]`,
        en ? `Step 1: [To fill: first action]` : `步骤 1：[待填写：第一步操作]`,
        en ? `Step 2: [To fill: second action]` : `步骤 2：[待填写：第二步操作]`,
        en ? `Verify: [To fill: how to confirm it worked]` : `验证：[待填写：如何确认这一步做对了]`,
      ],
    },
  ]
  const count = lessonType === 'micro' ? 1 : 2
  const start = hashString(seed + '::examples') % frames.length
  const examples = []
  for (let i = 0; i < count; i++) {
    const frame = frames[(start + i) % frames.length]
    examples.push({
      layout: 'bullets',
      title: frame.title,
      points: frame.points,
      notes: en
        ? `Walk through this ${frame.title.toLowerCase()}. Replace every placeholder with real, verifiable content; never invent figures or cases.`
        : `演示这个${frame.title}。把每个占位符替换为真实、可核实的内容；不要编造数据或案例。`,
    })
  }
  return examples
}

function generateMainActivity(topic, lessonType, langKey) {
  const en = langKey === 'en'
  const activities = {
    lecture: {
      en: { title: 'Guided Practice Exercise', notes: 'Learners apply the concept with instructor guidance. Work through one example together, then try one independently.', steps: [
        { title: 'Worked Example', details: ['Instructor demonstrates', 'Think aloud: explain reasoning', 'Highlight decision points'], notes: 'Model the thinking process.' },
        { title: 'Your Turn', details: ['Learners try a similar problem', 'Instructor circulates to help', 'Share solutions'], notes: 'Scaffold: provide a template if needed.' },
      ] },
      zh: { title: '指导性练习', notes: '学员在教师指导下应用概念。先共同完成一例，再独立尝试一例。', steps: [
        { title: '示范演示', details: ['教师现场演示', '声思维：讲解推理', '标记决策点'], notes: '展示专家思维过程。' },
        { title: '你来试', details: ['学员尝试类似题目', '教师巡场辅导', '分享解题思路'], notes: '脚手架：必要时提供模板。' },
      ] },
    },
    workshop: {
      en: { title: 'Hands-On Project', notes: 'Learners build a complete mini-project. Provide a starter template. Milestones with check-ins.', steps: [
        { title: 'Setup & Orient', details: ['Get the starter template', 'Run the hello-world step', 'Understand the structure'], notes: 'Ensure everyone can start.' },
        { title: 'Core Implementation', details: ['Implement feature 1', 'Test & debug', 'Implement feature 2'], notes: 'Pair work encouraged.' },
        { title: 'Extend & Polish', details: ['Add a personal touch', 'Write checks/tests', 'Document'], notes: 'Celebrate working versions!' },
      ] },
      zh: { title: '动手实战项目', notes: '学员构建完整迷你项目。提供启动模板。设里程碑检查点。', steps: [
        { title: '环境就绪', details: ['获取启动模板', '跑通最小示例', '理解结构'], notes: '确保所有人能开始。' },
        { title: '核心实现', details: ['实现功能1', '测试调试', '实现功能2'], notes: '鼓励结对。' },
        { title: '扩展完善', details: ['加入个人特色', '编写检查/测试', '写文档'], notes: '庆祝可运行的版本！' },
      ] },
    },
    caseStudy: {
      en: { title: 'Case Analysis & Decision', notes: 'Groups analyze a complex case, make a decision, and defend it. Use a structured analysis framework.', steps: [
        { title: 'Read & Understand', details: ['Read the case individually', 'Identify key facts', 'Define the problem'], notes: 'Silent reading first.' },
        { title: 'Analyze in Groups', details: ['Apply a framework (SWOT/5W1H)', 'Generate 3+ options', 'Evaluate pros/cons'], notes: 'Assign a devil\u2019s advocate.' },
        { title: 'Decide & Present', details: ['Choose the best option', 'Prepare a 2-min pitch', 'Q&A from the class'], notes: 'Focus on reasoning, not just the answer.' },
      ] },
      zh: { title: '案例分析与决策', notes: '小组分析复杂案例，做出决策并辩护。使用结构化分析框架。', steps: [
        { title: '阅读理解', details: ['个人静读案例', '提取关键事实', '界定核心问题'], notes: '先静读，再讨论。' },
        { title: '小组分析', details: ['应用框架(SWOT/5W1H)', '生成3+备选方案', '优劣势评估'], notes: '指派"反方辩手"。' },
        { title: '决策汇报', details: ['选择最优方案', '准备2分钟演示', '全班问答'], notes: '关注推理过程，非单一答案。' },
      ] },
    },
    lab: {
      en: { title: 'Experiment & Report', notes: 'Conduct an experiment, collect data, analyze results, write a mini-report. Follow the scientific method.', steps: [
        { title: 'Hypothesis & Setup', details: ['State the hypothesis', 'Identify variables', 'Prepare materials'], notes: 'Safety check first.' },
        { title: 'Run Experiment', details: ['Follow the procedure', 'Record observations', 'Repeat for reliability'], notes: 'Lab notebook: date, time, conditions.' },
        { title: 'Analyze & Conclude', details: ['Plot data', 'Compare to the hypothesis', 'Discuss errors'], notes: 'Error analysis is key learning.' },
      ] },
      zh: { title: '实验操作与报告', notes: '开展实验，收集数据，分析结果，撰写迷你报告。遵循科学方法。', steps: [
        { title: '假设与准备', details: ['提出假设', '识别变量', '准备器材'], notes: '安全检查优先。' },
        { title: '实施实验', details: ['按步骤操作', '记录观察', '重复验证'], notes: '实验记录：日期、时间、条件。' },
        { title: '分析结论', details: ['绘制数据图', '对比假设', '讨论误差'], notes: '误差分析是关键学习。' },
      ] },
    },
    seminar: {
      en: { title: 'Deep-Dive Discussion', notes: 'Socratic seminar on a provocative question. Text-based evidence required. Build on each other\u2019s ideas.', steps: [
        { title: 'Opening Question', details: ['Pose the big question', 'Silent think time (2 min)', 'Initial responses'], notes: 'No right answer. Explore tensions.' },
        { title: 'Sustained Dialogue', details: ['Build on peers\u2019 ideas', 'Ask clarifying questions', 'Cite evidence from readings'], notes: 'Facilitator speaks less than a fifth of the time.' },
        { title: 'Synthesis', details: ['What changed in your thinking?', 'Remaining uncertainties', 'Next questions to pursue'], notes: 'Capture on a shared doc.' },
      ] },
      zh: { title: '深度探究讨论', notes: '苏格拉底式研讨，围绕挑战性问题。要求文本证据。在彼此观点上建构。', steps: [
        { title: '开场大问题', details: ['抛出核心问题', '静默思考 (2分钟)', '初步回应'], notes: '无标准答案。探索张力。' },
        { title: '持续对话', details: ['在同伴观点上建构', '追问澄清性问题', '引用阅读材料证据'], notes: '主持人发言少于五分之一的时间。' },
        { title: '综合升华', details: ['思维有何改变？', '仍存疑点', '想进一步探究的问题'], notes: '记录在共享文档。' },
      ] },
    },
    flipped: {
      en: { title: 'Application Workshop', notes: 'Learners came prepared. Use class time for practice, troubleshooting, and deepening.', steps: [
        { title: 'Quick Recap', details: ['30-sec key concept review', 'Address pre-class questions', 'Clarify misconceptions'], notes: 'Don\u2019t re-lecture. Target gaps.' },
        { title: 'Guided Application', details: ['Work on a problem set', 'Instructor coaches 1-on-1', 'Peer help encouraged'], notes: 'Differentiate: extension for advanced.' },
        { title: 'Synthesis', details: ['Share solutions', 'Generalize patterns', 'Connect to the next topic'], notes: 'Exit ticket: one insight.' },
      ] },
      zh: { title: '应用工作坊', notes: '学员已预习。课堂时间用于练习、答疑、深化。', steps: [
        { title: '快速回顾', details: ['30秒核心概念', '解决预习疑问', '澄清误解'], notes: '不重讲。精准补缺。' },
        { title: '指导应用', details: ['练习题集', '教师1对1辅导', '鼓励互助'], notes: '分层：进阶学员做拓展。' },
        { title: '综合内化', details: ['分享解法', '提炼模式', '关联下一主题'], notes: '出口票：一个洞见。' },
      ] },
    },
    micro: {
      en: { title: 'Quick Practice', notes: 'One focused exercise. Immediate feedback. Done.', steps: [
        { title: 'Try It', details: ['One focused task', 'Immediate self-check', 'Reflect: what clicked?'], notes: 'Keep it under 5 minutes.' },
      ] },
      zh: { title: '快速练一练', notes: '一道聚焦练习。即时反馈。完成。', steps: [
        { title: '动手试试', details: ['一道聚焦题', '即时自查', '反思：哪里通了？'], notes: '控制在5分钟内。' },
      ] },
    },
  }
  const langActivities = activities[lessonType] || activities.lecture
  const picked = langActivities[langKey] || langActivities.zh
  return { title: picked.title, notes: picked.notes, steps: picked.steps.map(s => ({ title: s.title, details: s.details, notes: s.notes })) }
}

function generateFormativeChecks(topic, bloomLevels, langKey, seed, count) {
  const en = langKey === 'en'
  const templates = en
    ? [
        { type: 'quiz', question: `What is the key principle behind ${topic}?`, options: ['A) [To fill: option]', 'B) [To fill: option]', 'C) [To fill: option]', 'D) [To fill: option]'], notes: '[To fill: correct answer, and why the distractors are common misconceptions]' },
        { type: 'application', question: `Given scenario X, which ${topic} approach would you choose?`, options: ['[To fill: approach A]', '[To fill: approach B]', '[To fill: approach C]', 'It depends on…'], notes: 'No single answer. Evaluate whether the learner matches approach to context.' },
        { type: 'exit', question: `One-sentence summary of today\u2019s most important idea:`, options: ['Write your sentence', 'Share with a partner', 'Volunteer to read aloud'], notes: 'Collect as an exit ticket. Scan for misconceptions.' },
      ]
    : [
        { type: 'quiz', question: `${topic}的核心原理是什么？`, options: ['A) [待填写：选项]', 'B) [待填写：选项]', 'C) [待填写：选项]', 'D) [待填写：选项]'], notes: '[待填写：正确答案，以及为什么其余为常见误区]' },
        { type: 'application', question: `面对场景X，你会选哪种${topic}方法？`, options: ['[待填写：方法A]', '[待填写：方法B]', '[待填写：方法C]', '视情况而定…'], notes: '无标准答案。看学员能否把方法与场景匹配起来。' },
        { type: 'exit', question: `用一句话总结今天最重要的思想：`, options: ['写下你的话', '与同桌分享', '自愿者大声读出'], notes: '作为出口票收集，扫描常见误解。' },
      ]
  const start = hashString(seed + '::checks') % templates.length
  const checks = []
  for (let i = 0; i < count; i++) {
    const tmpl = templates[(start + i) % templates.length]
    checks.push({ layout: 'bullets', question: tmpl.question, options: tmpl.options, notes: tmpl.notes, type: tmpl.type })
  }
  return checks
}

function generateSummary(topic, objectives, langKey) {
  const en = langKey === 'en'
  return en
    ? [
        `We covered: ${topic} — from basics to application`,
        `Key principles: ${objectives.slice(0, 2).join('; ')}`,
        `Remember: the core idea is [To fill: one-sentence essence]`,
        `Pitfalls to avoid: [To fill: top 2 mistakes]`,
        `Your action item: [To fill: specific next step]`,
      ]
    : [
        `我们涵盖了：${topic} —— 从基础到应用`,
        `核心原则：${objectives.slice(0, 2).join('；')}`,
        `记住：核心思想是 [待填写：一句话精华]`,
        `避坑指南：[待填写：最易犯的2个错误]`,
        `你的行动项：[待填写：具体下一步]`,
      ]
}

function generateHomework(topic, lessonType, audience, langKey) {
  const en = langKey === 'en'
  const homeworkTemplates = en
    ? {
        beginner: [
          `Practice Exercise: complete the guided tutorial on ${topic.toLowerCase()} — [To fill: resource link]`,
          `Reflection: write 3 sentences about what you learned and 1 question`,
          `Reading: review the summary handout (10 min)`,
          `Optional: try the bonus challenge for extra credit`,
        ],
        intermediate: [
          `Applied Exercise: solve the practice problem set (3-5 problems)`,
          `Mini-Project: build a small ${topic.toLowerCase()} demo and share it`,
          `Peer Review: review a classmate's work using the rubric`,
          `Extension: read the recommended article and write a 100-word takeaway`,
        ],
        advanced: [
          `Design Challenge: create an original ${topic.toLowerCase()} solution for a real problem`,
          `Review: submit your implementation for architectural review`,
          `Research: compare 3 approaches to ${topic.toLowerCase()}, write a decision memo`,
          `Teach Back: explain ${topic} to a peer who missed class`,
        ],
        mixed: [
          `Core Practice: everyone completes the baseline exercise`,
          `Stretch Goal: advanced learners tackle the extension challenge`,
          `Reflection: all learners write a learning journal entry`,
          `Resource Pack: curated links for deeper study at your own pace`,
        ],
      }
    : {
        beginner: [
          `基础练习：完成${topic}的引导式教程——[待填写：资源链接]`,
          `反思记录：写3句收获 + 1个疑问`,
          `复习阅读：阅读总结手册 (10分钟)`,
          `选做挑战：完成额外加分题`,
        ],
        intermediate: [
          `应用练习：完成练习题集 (3-5题)`,
          `迷你项目：搭建一个${topic}演示并分享`,
          `同伴互评：用评分表评审同学作业`,
          `拓展阅读：读推荐文章，写100字心得`,
        ],
        advanced: [
          `设计挑战：为真实问题创建原创${topic}方案`,
          `评审：提交实现接受架构评审`,
          `对比研究：对比3种${topic}方法，写决策备忘录`,
          `以教代学：向缺席同学讲解${topic}`,
        ],
        mixed: [
          `基础必做：全员完成基准练习`,
          `进阶挑战：高水平学员攻克拓展题`,
          `学习日志：全员写一篇反思`,
          `资源包：分层整理的深度学习链接`,
        ],
      }
  return homeworkTemplates[audience] || homeworkTemplates.beginner
}

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

/** 生成智能课件计划（单对象参数，确定性）。 */
export function generateLessonPlan(options = {}) {
  const opts = (options !== null && typeof options === 'object' && !Array.isArray(options)) ? options : {}
  const topic = String(opts.topic ?? '').trim()
  if (topic === '') throw new Error('dsh-ppt：topic 不能为空')

  const lessonType = LESSON_TYPES[opts.lessonType] ? opts.lessonType : inferLessonType(topic)
  const t = LESSON_TYPES[lessonType]
  const audience = AUDIENCE_LEVELS[opts.audience] ? opts.audience : 'beginner'
  const level = AUDIENCE_LEVELS[audience]
  const language = ['zh', 'en', 'bilingual'].includes(opts.language) ? opts.language : 'zh'
  const en = language === 'en'
  const langKey = en ? 'en' : 'zh'
  const defaultDuration = lessonType === 'micro' ? 15 : 45
  const duration = clampInt(opts.duration, defaultDuration, 5, 180)
  const includeInteractions = opts.includeInteractions !== false
  const includeAssessment = opts.includeAssessment !== false
  // 封面标题：长主题拼接模式名后可能超出封面版式宽度，按显示宽度兜底。
  // 渲染实测：封面大字号下约 15 个全角字宽即折行，超过就会把末字挤到下一行。
  const titleLimit = 15
  const displayWidth = text => [...String(text ?? '')].reduce((n, c) => n + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0)
  const fitCover = text => {
    const raw = String(text ?? '').replace(/\s+/g, ' ').trim()
    if (displayWidth(raw) <= titleLimit) return raw
    const suffix = en ? ` — ${t.en}` : ` — ${t.zh}`
    // 先尝试省略模式名，只保留主题
    if (displayWidth(raw.slice(0, raw.length - suffix.length)) <= titleLimit) {
      return raw.slice(0, raw.length - suffix.length).trim()
    }
    // 主题本身也过长：按宽度逐字裁剪
    const chars = [...raw]
    let out = ''
    for (const c of chars) {
      if (displayWidth(out + c) > titleLimit - 1) break
      out += c
    }
    return out.replace(/[\s,，、:：—-]+$/, '') + '…'
  }
  const title = fitCover((typeof opts.title === 'string' && opts.title.trim() !== '')
    ? opts.title.trim()
    : (en ? `${topic} — ${t.en}` : `${topic} — ${t.zh}`))

  const seed = `${topic}|${lessonType}|${audience}|${language}`
  const bloomLevels = level.bloom
  const verbs = BLOOM_VERBS[langKey]

  const objectives = Array.isArray(opts.customObjectives) && opts.customObjectives.length > 0
    ? opts.customObjectives.map(v => String(v))
    : generateObjectives(topic, bloomLevels, verbs, langKey, seed)

  const alloc = calculateTimeAllocation(duration, lessonType, includeInteractions, includeAssessment)

  const slides = []

  // 1. 封面
  slides.push({
    layout: 'cover',
    title,
    subtitle: en ? `${t.en} • ${duration} min • ${level.en}` : `${t.zh} • ${duration} 分钟 • ${level.zh}`,
    kicker: en ? 'Lesson Plan' : '教学设计',
    notes: en
      ? `Welcome learners. This ${t.en.toLowerCase()} on "${topic}" is designed for ${level.en.toLowerCase()} level. Duration: ${duration} minutes.`
      : `欢迎学员。本${t.zh}《${topic}》面向${level.zh}学员，时长${duration}分钟。`,
    timing: 0,
    activity: 'cover',
  })

  // 2. 学习目标
  slides.push({
    layout: 'bullets',
    title: en ? '🎯 Learning Objectives' : '🎯 学习目标',
    bullets: objectives.map((obj, i) => `${i + 1}. ${obj}`),
    notes: en
      ? `By the end of this lesson, learners will be able to: ${objectives.join('; ')}. These objectives use Bloom's taxonomy verbs at the ${bloomLevels.join(', ')} levels.`
      : `本课结束时，学员将能够：${objectives.join('；')}。目标采用布鲁姆分类学的${bloomLevels.map(b => verbs[b][0]).join('、')}层级动词。`,
    timing: alloc.objectives,
    activity: 'objectives',
  })

  // 3. 议程
  slides.push({
    layout: 'bullets',
    title: en ? '📋 Agenda' : '📋 课程议程',
    bullets: [
      en ? '🎯 Learning objectives & motivation' : '🎯 学习目标与激励',
      en ? '📚 Core concepts & key knowledge' : '📚 核心知识点讲解',
      en ? '💡 Examples & case studies' : '💡 示例与案例分析',
      includeInteractions ? (en ? '🤝 Interactive activities & practice' : '🤝 互动与练习') : (en ? '📝 Practice exercises' : '📝 练习巩固'),
      includeAssessment ? (en ? '✅ Formative checks & summary' : '✅ 形成性评价与总结') : (en ? '📋 Summary & homework' : '📋 总结与作业'),
    ],
    notes: en
      ? 'Walk through the agenda. Emphasize the learning journey: from objectives, through practice, to mastery.'
      : '走一遍议程。强调学习旅程：从目标出发，通过练习走向掌握。',
    timing: alloc.agenda,
    activity: 'agenda',
  })

  // 4. 引入钩子
  slides.push({
    layout: 'statement',
    title: en ? '💡 Why This Matters' : '💡 为什么要学这个？',
    subtitle: generateHook(topic, lessonType, langKey, seed),
    notes: en
      ? 'Start with a hook. Connect to learners\u2019 prior knowledge or a real-world problem.'
      : '用钩子开场。联系学员已有知识或真实问题。',
    timing: alloc.hook,
    activity: 'hook',
  })

  // 5. 核心概念 + 概念间互动
  const concepts = generateConcepts(topic, lessonType, duration, langKey, seed)
  const interactionSlots = includeInteractions && lessonType !== 'micro' ? Math.min(concepts.length - 1, 3) : 0
  // 先按「活动自身标准时长」为每个互动预留时间；不足时从概念段扣，
  // 保证各页 timing 之和仍等于 duration，也不会出现「页面写 5 分钟、时间轴给 1 分钟」的矛盾。
  const planned = []
  for (let k = 0; k < interactionSlots; k++) {
    const probe = selectInteraction(lessonType, bloomLevels, langKey, seed, k)
    planned.push(probe.minutes || 0)
  }
  let interactionBudget = alloc.interactions
  let over = planned.reduce((a, b) => a + b, 0) - interactionBudget
  if (over > 0) {
    // 缺口按「弹性段」比例分摊扣减（概念 → 示例 → 主活动），各自保留最小值，
    // 这样总时长始终守恒，不会出现 45 分钟的课跑出 64 分钟。
    const FLOOR = { concepts: 6, examples: 4, activity: 8 }
    for (const key of ['concepts', 'examples', 'activity']) {
      if (over <= 0) break
      const spare = Math.max(0, alloc[key] - FLOOR[key])
      const take = Math.min(spare, over)
      alloc[key] -= take
      over -= take
      interactionBudget += take
    }
  }
  const interactionTimes = planned.length > 0 ? planned : []
  const conceptTimes = splitMinutes(alloc.concepts, concepts.length)
  let interactionIndex = 0
  concepts.forEach((concept, i) => {
    slides.push({
      layout: 'bullets',
      title: fitTitle(`${en ? 'Concept' : '核心概念'} ${i + 1}: ${concept.title}`, langKey),
      bullets: concept.points,
      notes: concept.notes,
      timing: conceptTimes[i] || 0,
      activity: 'lecture',
    })
    if (i < interactionSlots) {
      const interaction = selectInteraction(lessonType, bloomLevels, langKey, seed, interactionIndex)
      slides.push({
        layout: 'bullets',
        title: fitTitle(`${interaction.icon} ${interaction.name}`, langKey),
        bullets: interaction.prompts,
        notes: interaction.notes,
        timing: Math.max(interactionTimes[interactionIndex] || 0, interaction.minutes || 0),
        activity: 'interaction',
        interaction: true,
      })
      interactionIndex += 1
    }
  })

  // 6. 示例与案例
  const examples = generateExamples(topic, lessonType, langKey, seed)
  const exampleTimes = splitMinutes(alloc.examples, examples.length)
  examples.forEach((ex, i) => {
    slides.push({
      layout: ex.layout,
      title: fitTitle(`${en ? 'Example' : '示例'} ${i + 1}: ${ex.title}`, langKey),
      bullets: ex.points,
      notes: ex.notes,
      timing: exampleTimes[i] || 0,
      activity: 'example',
    })
  })

  // 7. 主活动
  // 短课（≤20 分钟）或微课放不下「主活动 + 分步」结构，直接省略，避免出现 0 分钟的环节。
  // 主活动需要至少 6 分钟才有意义（否则就是走过场），不够时同样省略。
  const activityBudgetOk = (alloc.activity || 0) >= 6
  const includeMainActivity = includeInteractions && duration > 20 && lessonType !== 'micro' && activityBudgetOk
  if (includeMainActivity) {
    const mainActivity = generateMainActivity(topic, lessonType, langKey)
    slides.push({
      layout: 'section',
      title: en ? '🎯 Main Activity' : '🎯 核心活动',
      kicker: mainActivity.title,
      notes: mainActivity.notes,
      timing: 0,
      activity: 'main-activity',
    })
    const stepTimes = splitMinutes(alloc.activity, mainActivity.steps.length)
    mainActivity.steps.forEach((step, i) => {
      slides.push({
        layout: 'bullets',
        title: fitTitle(`${en ? 'Step' : '步骤'} ${i + 1}: ${step.title}`, langKey),
        bullets: step.details,
        notes: step.notes,
        timing: stepTimes[i] || 0,
        activity: 'activity-step',
      })
    })
  } else {
    slides.push({
      layout: 'bullets',
      title: en ? '📝 Practice' : '📝 练习巩固',
      bullets: en
        ? ['Complete the practice exercise', '[To fill: exercise questions]', 'Check answers with a partner', '[To fill: answer key / rubric]']
        : ['完成练习题目', '[待填写：练习题目]', '与搭档核对答案', '[待填写：答案/评分标准]'],
      notes: en
        ? 'Learners consolidate the concepts through focused practice.'
        : '学员通过集中练习巩固概念。',
      timing: alloc.activity,
      activity: 'practice',
    })
  }

  // 8. 形成性评价
  if (includeAssessment) {
    const checkCount = lessonType === 'micro' ? 1 : 3
    const checks = generateFormativeChecks(topic, bloomLevels, langKey, seed, checkCount)
    slides.push({
      layout: 'section',
      title: en ? '✅ Check Your Understanding' : '✅ 形成性检查：检验学习效果',
      kicker: en ? 'Formative Assessment' : '即时反馈',
      notes: en
        ? 'Quick checks to see whether learners met the objectives. Use responses to adjust pacing.'
        : '快速检查学员是否达成目标。根据反馈调整节奏。',
      timing: 0,
      activity: 'assessment',
    })
    const checkTimes = splitMinutes(alloc.assessment, checks.length)
    checks.forEach((check, i) => {
      slides.push({
        layout: check.layout,
        title: fitTitle(`${en ? 'Check' : '检查'} ${i + 1}: ${check.question}`, langKey),
        bullets: check.options,
        notes: check.notes,
        timing: checkTimes[i] || 0,
        activity: 'formative-check',
        interaction: true,
      })
    })
  }

  // 9. 总结
  slides.push({
    layout: 'bullets',
    title: en ? '📝 Key Takeaways' : '📝 核心收获回顾',
    bullets: generateSummary(topic, objectives, langKey),
    notes: en
      ? `Summarize the key points. Connect back to learning objectives: ${objectives.join('; ')}.`
      : `回顾核心要点。回扣学习目标：${objectives.join('；')}。`,
    timing: alloc.summary,
    activity: 'summary',
  })

  // 10. 作业
  slides.push({
    layout: 'bullets',
    title: en ? '🏠 Homework & Next Steps' : '🏠 课后作业与后续学习',
    bullets: generateHomework(topic, lessonType, audience, langKey),
    notes: en
      ? "Assign homework that reinforces today's learning. Provide resources for further study."
      : '布置巩固今日所学的作业。提供进阶学习资源。',
    timing: alloc.homework,
    activity: 'homework',
  })

  // 11. 结束页
  slides.push({
    layout: 'closing',
    title: en ? 'Thank You!' : '谢谢大家！',
    subtitle: en
      ? 'Questions? Contact: [To fill: instructor email] • Resources: [To fill: link]'
      : '有问题？联系方式：[待填写：讲师邮箱] • 资源链接：[待填写：链接]',
    notes: en
      ? 'Thank learners. Share contact info and resource links. Remind them of the homework deadline.'
      : '感谢学员。分享联系方式和资源链接。提醒作业截止时间。',
    timing: 0,
    activity: 'closing',
  })

  // 统一校正：各段最小值叠加后可能超出设定时长，这里把差额按比例压缩回非关键页，
  // 保证「各页计时之和 == 设定时长」这条硬约束始终成立（互动页保留其活动所需的最短时间）。
  balanceTiming(slides, duration)

  const totalTiming = slides.reduce((sum, s) => sum + (s.timing || 0), 0)

  return {
    title,
    topic,
    lessonType,
    duration,
    audience,
    language,
    slides,
    totalTiming,
    objectives,
    metadata: {
      version: '1.0',
      slideCount: slides.length,
      estimatedDuration: totalTiming,
      interactionsCount: slides.filter(s => s.activity === 'interaction' || s.activity === 'main-activity').length,
      assessmentCount: slides.filter(s => s.activity === 'formative-check').length,
    },
  }
}

// ---------------------------------------------------------------------------
// 教案 Markdown
// ---------------------------------------------------------------------------

const PREP_ITEMS = {
  zh: [
    '核对时长与节奏：[待填写：按实际班级微调各环节分钟数]',
    '准备材料：[待填写：讲义、案例文本、示例数据/器材等]',
    '准备互动工具：[待填写：投票工具 / 分组方式 / 白板等]',
    '提前试用演示环境：[待填写：投影、软件版本、示例能否跑通]',
    '为不同水平学员准备分层任务：[待填写：基础版 / 进阶版]',
  ],
  en: [
    'Check timing and pacing: [To fill: adjust minutes to the actual class]',
    'Prepare materials: [To fill: handouts, case text, sample data / equipment]',
    'Prepare interaction tools: [To fill: polling tool / grouping / whiteboard]',
    'Rehearse the demo environment: [To fill: projector, software versions, sample runs]',
    'Prepare tiered tasks for mixed levels: [To fill: baseline / extension]',
  ],
}

function timelineGroups(slides) {
  // 主活动的过渡页（section）与它下面的步骤页属于同一环节，合并成一行统计，
  // 否则时间轴会出现「主活动 0 分钟 + 活动步骤 N 分钟」这种误导性拆分。
  const MERGE = { 'main-activity': 'activity-step', 'activity-step': 'main-activity' }
  const groups = []
  for (const s of slides) {
    const label = s.activity || 'other'
    const last = groups[groups.length - 1]
    const same = last && (last.activity === label || MERGE[last.activity] === label)
    if (same) {
      last.minutes += s.timing || 0
      last.pages += 1
    } else {
      groups.push({ activity: label, minutes: s.timing || 0, pages: 1 })
    }
  }
  return groups
}

/** 生成教案 Markdown（与三件套同目录落盘）。 */
export function renderLessonPlanMarkdown(plan) {
  const en = plan.language === 'en'
  const L = (pair) => (en ? pair.en : pair.zh)
  const t = LESSON_TYPES[plan.lessonType] || LESSON_TYPES.lecture
  const level = AUDIENCE_LEVELS[plan.audience] || AUDIENCE_LEVELS.beginner
  const lines = []
  lines.push(`# ${plan.title} · ${en ? 'Lesson Plan' : '教案'}`)
  lines.push('')
  lines.push(`- ${en ? 'Topic' : '主题'}：${plan.topic}`)
  lines.push(`- ${en ? 'Mode' : '模式'}：${L(t)}（${plan.lessonType}）`)
  lines.push(`- ${en ? 'Audience' : '受众'}：${L(level)}（${plan.audience}）`)
  lines.push(`- ${en ? 'Duration' : '时长'}：${plan.duration} ${en ? 'min' : '分钟'}`)
  lines.push(`- ${en ? 'Language' : '语言'}：${plan.language}`)
  lines.push('')
  lines.push(en
    ? '> ⚠️ This is an editable teaching-structure skeleton. Replace every `[To fill: …]` with real, verifiable content before delivery. It does not contain finished subject matter.'
    : '> ⚠️ 这是一份可编辑的教学结构骨架。所有 `[待填写：…]` 处都需由老师/AI 补全真实内容后才能作为成品交付，本身不构成真实学科知识。')
  lines.push('')

  lines.push(`## ${en ? 'Learning objectives' : '学习目标'}`)
  lines.push('')
  plan.objectives.forEach((o, i) => lines.push(`${i + 1}. ${o}`))
  lines.push('')

  lines.push(`## ${en ? 'Timeline' : '时间轴'}`)
  lines.push('')
  lines.push(`| ${en ? 'Segment' : '环节'} | ${en ? 'Time (min)' : '时间（分钟）'} | ${en ? 'Pages' : '页数'} |`)
  lines.push('| --- | --- | --- |')
  for (const group of timelineGroups(plan.slides)) {
    const label = (ACTIVITY_LABELS[group.activity] || { zh: group.activity, en: group.activity })
    lines.push(`| ${L(label)} | ${group.minutes} | ${group.pages} |`)
  }
  lines.push(`| **${en ? 'Total' : '合计'}** | **${plan.totalTiming}** | ${plan.slides.length} |`)
  lines.push('')

  const interactionSlides = plan.slides.filter(s => s.activity === 'interaction')
  if (interactionSlides.length) {
    lines.push(`## ${en ? 'Interaction plan' : '互动清单'}`)
    lines.push('')
    interactionSlides.forEach((s, i) => {
      lines.push(`${i + 1}. **${s.title}**（${s.timing} ${en ? 'min' : '分钟'}）`)
      ;(s.bullets || []).forEach(b => lines.push(`   - ${b}`))
    })
    const main = plan.slides.find(s => s.activity === 'main-activity')
    if (main) lines.push(`${interactionSlides.length + 1}. **${main.kicker || main.title}**（${en ? 'main activity, see its step slides' : '主活动，见步骤页'}）`)
    lines.push('')
  }

  const checks = plan.slides.filter(s => s.activity === 'formative-check')
  if (checks.length) {
    lines.push(`## ${en ? 'Assessment design' : '评价设计'}`)
    lines.push('')
    checks.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.title}（${s.timing} ${en ? 'min' : '分钟'}）`)
    })
    lines.push('')
  }

  lines.push(`## ${en ? 'Preparation' : '准备事项'}`)
  lines.push('')
  ;(PREP_ITEMS[en ? 'en' : 'zh']).forEach(item => lines.push(`- [ ] ${item}`))
  lines.push('')

  return lines.join('\n') + '\n'
}

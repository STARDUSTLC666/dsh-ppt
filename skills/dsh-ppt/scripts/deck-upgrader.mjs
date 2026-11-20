/**
 * deck-upgrader.mjs —— 弱模型兜底升维编译器（Weak-LLM Compensator & Anti-Slop Auto-Upgrader）。
 *
 * 解决痛点：即使上游 LLM（如 DeepSeek 或轻量模型）偷懒输出了连续 bullets 文字墙、空洞名词标题、
 * 埋在文字里的前后对比数据/多维评分/代码块/原型描述，或只有“谢谢”的空洞封底，本引擎也在渲染前以
 * 100% 确定性规则无损升维为顶级咨询/发布会视觉版式（零额外 LLM 调用、零新增外部依赖、零幻觉编造）。
 */

import { stripInlineMarkdown } from './deck-layouts.mjs'

const WEAK_GENERIC_TITLE_RE = /^(?:第?[一二三四五六七八九十\d]+[章节部分页、.\s-]*)?(?:项目背景|研究背景|背景介绍|现状分析|现状与问题|数据分析|核心指标|关键指标|性能提升|效能提升|技术实现|架构实现|核心功能|产品介绍|团队介绍|商业模式|未来规划|核心优势|工作进展|项目进展|阶段进展|竞品分析|竞品对比|解决方案|实施方案|行动计划|工作计划|总结|总结汇报|概述|目录页|关于我们|Overview|Introduction|Background|Status|Progress|Metrics|Performance|Implementation|Architecture|Product|Team|Data\s*Analysis|Analysis|Comparison|Solution|Plan|Summary|Results|Chart|Slide\s*\d+)$/i
const BARE_CLOSING_RE = /^(?:谢谢|谢谢观看|谢谢聆听|感谢(?:聆听|观看|大家|指导)?|敬请指正|Thank\s*You|Thanks|Q\s*&\s*A)[!！.。?？\s]*$/i
const LOWER_IS_BETTER_RE = /耗时|时延|延迟|周期|成本|返工|缺陷|故障|错误|流失|投诉|报错|开销|预算|疼痛|障碍|并发症|复发|住院|latency|cost|time|cycle|rework|defect|error|churn|bug|delay|mttr|pain|disability|complication|mortality/i
const DUMBBELL_RE = /(?:从|由|from\s+)?(-?\d+(?:\.\d+)?)\s*(%|％|pp|bp|ms|s|分|pts|天|小时|分钟|h|m|x|倍|万|亿|元|例|k|M|B)?\s*(?:提升至|提升到|增长至|增长到|跃升至|上涨至|提高到|升至|升到|降至|降到|压缩至|压缩到|缩短至|缩短到|减少至|减少到|优化至|优化到|变为|→|->|to)\s*(-?\d+(?:\.\d+)?)\s*(%|％|pp|bp|ms|s|分|pts|天|小时|分钟|h|m|x|倍|万|亿|元|例|k|M|B)?/i
const RADAR_TITLE_RE = /雷达|多维|能力评估|能力对比|综合评测|基准评测|权衡|radar|spider|benchmark|capability|trade-?off|multi-?axis/i
const HEATMAP_TITLE_RE = /热力|达成率|分布矩阵|覆盖率|完成度|矩阵|heatmap|heat\s*map|coverage|regional|fulfillment|sensitivity/i
const QUADRANT_TITLE_RE = /魔力象限|象限|竞争格局|波士顿|定位矩阵|市场定位|quadrant|positioning|bcg|competitive\s+landscape|magic\s+quadrant/i
const MOCKUP_TITLE_RE = /界面|原型|工作台演示|产品演示|端体验|交互体验|移动端|app\s*体验|ui\s*展示|mockup|prototype|web\s*studio|dashboard|product\s*demo|mobile\s*app|companion/i
const CODE_LINE_RE = /^\s*(?:export\s+|import\s+|const\s+|let\s+|var\s+|function\s+|async\s+function|class\s+|def\s+|fn\s+|pub\s+fn|package\s+|SELECT\s+|CREATE\s+|curl\s+|npm\s+|pnpm\s+|docker\s+|kubectl\s+|return\s+|\{|\})/

function splitLead(raw) {
  const clean = stripInlineMarkdown(String(raw ?? '')).trim()
  const boldMatch = /^\*\*([^*]{1,28})\*\*\s*[:：—–-]?\s*(.*)$/.exec(String(raw ?? '').trim())
  if (boldMatch) return { title: boldMatch[1].trim(), text: stripInlineMarkdown(boldMatch[2]).trim() }
  const sep = /^([^:：—–]{2,26})[:：—–]\s*(.+)$/.exec(clean)
  if (sep) return { title: sep[1].trim(), text: sep[2].trim() }
  return { title: clean.slice(0, 26), text: clean.length > 26 ? clean : '' }
}

function parseDumbbellBullet(raw) {
  const plain = stripInlineMarkdown(String(raw ?? '')).trim()
  const m = DUMBBELL_RE.exec(plain)
  if (!m) return null
  const before = Number(m[1])
  const after = Number(m[3])
  if (!Number.isFinite(before) || !Number.isFinite(after) || before === after) return null
  const rawUnit = (m[4] || m[2] || '').replace('％', '%')
  const lead = splitLead(raw).title
  const titleCandidate = lead && !DUMBBELL_RE.test(lead)
    ? lead
    : plain.slice(0, m.index).replace(/[:：—–\-\s]+$/, '').trim() || plain.slice(0, 22)
  const lowerBetter = LOWER_IS_BETTER_RE.test(plain)
  const improved = lowerBetter ? after < before : after > before
  return {
    title: titleCandidate.slice(0, 28),
    before,
    after,
    unit: rawUnit,
    status: improved ? 'positive' : 'negative',
  }
}

function parseRadarBullet(raw) {
  const plain = stripInlineMarkdown(String(raw ?? '')).trim()
  const leadSep = /^([^:：]{2,24})[:：]\s*(.+)$/.exec(plain)
  if (!leadSep) return null
  const axis = leadSep[1].trim()
  const rest = leadSep[2]
  const nums = [...rest.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])).filter((n) => Number.isFinite(n) && n >= 0 && n <= 1000)
  if (nums.length < 2) return null
  return { axis, vals: nums.slice(0, 3) }
}

function parseQuadrantBullet(raw, idx) {
  const plain = stripInlineMarkdown(String(raw ?? '')).trim()
  const coord = /(?:x\s*[:=]\s*(\d+(?:\.\d+)?)\s*[,，;/\s]+y\s*[:=]\s*(\d+(?:\.\d+)?))|(?:\((\d+(?:\.\d+)?)\s*[,，]\s*(\d+(?:\.\d+)?)(?:\s*[,，]\s*(\d+(?:\.\d+)?))?\))/i.exec(plain)
  const { title } = splitLead(raw)
  const cleanTitle = title.replace(/\s*\(.*?\)\s*$/, '').replace(/\s*x\s*[:=].*$/i, '').trim() || `Item ${idx + 1}`
  if (coord) {
    const x = Number(coord[1] ?? coord[3])
    const y = Number(coord[2] ?? coord[4])
    const size = Number(coord[5] ?? (idx === 0 ? 34 : 22))
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return {
        title: cleanTitle.slice(0, 24),
        x: Math.max(5, Math.min(95, x)),
        y: Math.max(5, Math.min(95, y)),
        size: Number.isFinite(size) ? Math.max(12, Math.min(48, size)) : 24,
        status: idx === 0 ? 'positive' : idx === 1 ? 'accent' : 'neutral',
      }
    }
  }
  // 无显式坐标时按象限关键词自动锚定位置
  if (/领航|领导|第一梯队|leader/i.test(plain)) {
    return { title: cleanTitle.slice(0, 24), x: 82 - (idx % 2) * 8, y: 84 - (idx % 2) * 6, size: idx === 0 ? 34 : 26, status: 'positive' }
  }
  if (/挑战|challenger/i.test(plain)) {
    return { title: cleanTitle.slice(0, 24), x: 34 + (idx % 2) * 8, y: 74, size: 24, status: 'accent' }
  }
  if (/远见|创新|visionar/i.test(plain)) {
    return { title: cleanTitle.slice(0, 24), x: 76, y: 34 + (idx % 2) * 8, size: 22, status: 'warning' }
  }
  if (/特定|利基|传统|落后|niche|legacy/i.test(plain)) {
    return { title: cleanTitle.slice(0, 24), x: 26 + (idx % 2) * 10, y: 28 + (idx % 2) * 6, size: 20, status: 'neutral' }
  }
  return null
}

const KPI_VAL_RE = /(?:^|[^A-Za-z0-9_.])([$¥€£]\s*\d+(?:[.,]\d+)?\s*(?:k|K|M|B|T|万|亿|亿元|亿美元|万元)?|\d+(?:[.,]\d+)?\s*(?:%|％|pp|ms|s|x|X|倍|亿元|亿美元|万元|万|亿|元|k|K|M|B|T|天|小时|分钟|周|个月|月|家|项|个|\+))(?![A-Za-z0-9])/

function parseKpiBullet(raw, idx) {
  const plain = stripInlineMarkdown(String(raw ?? '')).trim()
  const deltaMatch = /([+-]\d+(?:\.\d+)?(?:%|％|pp|x|倍)?(?:\s*(?:YoY|QoQ|MoM|同比|环比))?)/i.exec(plain)
  const valExec = KPI_VAL_RE.exec(plain)
  if (!valExec || !valExec[1] || !/\d/.test(valExec[1])) return null
  const value = valExec[1].trim()
  const delta = deltaMatch && deltaMatch[0].trim() !== value ? deltaMatch[0].trim() : ''
  const { title, text } = splitLead(raw)
  const cleanTitle = title && title !== value ? title : plain.replace(value, '').replace(delta, '').replace(/^[:：—–\-\s]+|[:：—–\-\s]+$/g, '').slice(0, 26) || `KPI ${idx + 1}`
  const cleanText = text ? text.trim() : ''
  return {
    value,
    ...(delta ? { delta } : {}),
    title: cleanTitle,
    ...(cleanText ? { text: cleanText } : {}),
    status: delta.startsWith('-') && !LOWER_IS_BETTER_RE.test(plain) ? 'warning' : (idx === 0 ? 'accent' : 'positive'),
  }
}

function extractEmbeddedCode(slide) {
  if (typeof slide.code === 'string' && slide.code.trim().length > 0) {
    return { language: slide.language || 'typescript', code: slide.code.trimEnd() }
  }
  const text = String(slide.text ?? '').trim()
  const fence = /```([a-zA-Z0-9_-]*)\s*\n([\s\S]+?)\n```/.exec(text)
  if (fence) {
    return { language: fence[1] || 'typescript', code: fence[2].trimEnd() }
  }
  const lines = text ? text.split(/\r?\n/) : (Array.isArray(slide.bullets) ? slide.bullets.map(stripInlineMarkdown) : [])
  const codeHits = lines.filter((l) => CODE_LINE_RE.test(l)).length
  if (lines.length >= 3 && codeHits / lines.length >= 0.6) {
    const joined = lines.join('\n')
    const lang = /\bdef\s+\w+\(/.test(joined) ? 'python'
      : /\bSELECT\s+/i.test(joined) ? 'sql'
      : /\bfn\s+\w+/.test(joined) ? 'rust'
      : /\bpackage\s+\w+/.test(joined) ? 'go'
      : /\b(?:curl|npm|pnpm|docker)\s+/.test(joined) ? 'bash'
      : 'typescript'
    return { language: lang, code: joined }
  }
  return null
}

function isNumericTable(rows) {
  if (!Array.isArray(rows) || rows.length < 4 || !Array.isArray(rows[0]) || rows[0].length < 3) return false
  let numericCells = 0
  let totalCells = 0
  for (let r = 1; r < rows.length; r += 1) {
    for (let c = 1; c < rows[r].length; c += 1) {
      totalCells += 1
      const v = String(rows[r][c] ?? '').replace(/[,，%％$¥€£+\s]/g, '')
      if (/^-?\d+(?:\.\d+)?$/.test(v)) numericCells += 1
    }
  }
  return totalCells > 0 && numericCells / totalCells >= 0.78
}

function autoBoldBullet(raw) {
  const s = String(raw ?? '').trim()
  if (!s || /\*\*[^*]+\*\*/.test(s) || s.length < 18) return s
  const sep = /^([^:：—–，,]{2,18})([:：—–])\s*(.+)$/.exec(s)
  if (sep) return `**${sep[1].trim()}**：${sep[3].trim()}`
  const comma = /^([^，,。；;]{4,14})[，,]\s*(.{8,})$/.exec(s)
  if (comma && s.length >= 24) return `**${comma[1].trim()}**：${comma[2].trim()}`
  return s
}

function rescueWeakTitle(slide, langEn) {
  const rawTitle = String(slide.title ?? '').trim()
  if (!rawTitle || !WEAK_GENERIC_TITLE_RE.test(rawTitle)) return null

  // 优先从 takeaway 或首条含数字的要点提炼短结论
  const candidates = [
    String(slide.takeaway ?? '').trim(),
    ...(Array.isArray(slide.items) ? slide.items.map((it) => `${it.title || ''}${it.value ? ' ' + it.value : ''}${it.delta ? ' ' + it.delta : ''}${it.after !== undefined ? ' → ' + it.after + (it.unit || '') : ''}`.trim()) : []),
    ...(Array.isArray(slide.bullets) ? slide.bullets.map(stripInlineMarkdown) : []),
  ].filter(Boolean)

  const best = candidates.find((c) => /\d/.test(c) && c.length >= 6) || candidates[0]
  if (!best) return null
  const concise = best.replace(/[。.;；]+$/, '').slice(0, langEn ? 48 : 22).trim()
  if (!concise || concise.toLowerCase() === rawTitle.toLowerCase()) return null
  const sep = langEn ? ': ' : '：'
  const merged = `${rawTitle}${sep}${concise}`
  return merged.length <= (langEn ? 68 : 32) ? merged : concise
}

function synthesizeKicker(slide, index, langEn) {
  const lay = slide.layout || 'bullets'
  const num = String(index).padStart(2, '0')
  const mapZh = {
    kpi: '核心指标',
    cards: '核心洞察',
    comparison: '方案对比',
    process: '演进路径',
    gantt: '实施路线',
    architecture: '系统架构',
    quadrant: '竞争格局',
    radar: '能力评估',
    dumbbell: '效能跃迁',
    heatmap: '分布矩阵',
    code: '工程实现',
    mockup: '产品演示',
    mermaid: '核心流程',
    table: '定量对比',
    harvey: '选型矩阵',
    marimekko: '市场结构',
    sankey: '价值流向',
    swot: '综合研判',
    'value-chain': '价值链条',
    tam: '市场空间',
    org: '组织保障',
    callout: '关键结论',
    bullets: '重点解析',
  }
  const mapEn = {
    kpi: 'KEY METRICS',
    cards: 'CORE PILLARS',
    comparison: 'COMPARISON',
    process: 'EXECUTION',
    gantt: 'ROADMAP',
    architecture: 'ARCHITECTURE',
    quadrant: 'POSITIONING',
    radar: 'BENCHMARK',
    dumbbell: 'IMPACT LEAP',
    heatmap: 'MATRIX',
    code: 'IMPLEMENTATION',
    mockup: 'PRODUCT DEMO',
    mermaid: 'WORKFLOW',
    table: 'DATA TABLE',
    harvey: 'CAPABILITY MATRIX',
    marimekko: 'MARKET MAP',
    sankey: 'FLOW ANALYSIS',
    swot: 'SWOT',
    'value-chain': 'VALUE CHAIN',
    tam: 'MARKET SIZING',
    org: 'TEAM & ORG',
    callout: 'KEY TAKEAWAYS',
    bullets: 'HIGHLIGHTS',
  }
  const label = (langEn ? mapEn[lay] : mapZh[lay]) || (langEn ? 'INSIGHTS' : '核心要点')
  return `${num} · ${label}`
}

/**
 * 将弱模型生成的平庸幻灯片数组进行确定性无损升维（Auto-Upgrader）。
 *
 * @param {Array<object>} rawSlides
 * @param {{ exemplar?: object|null, lang?: string, allowSplit?: boolean, rescueTitles?: boolean }} [options]
 * @returns {{ slides: Array<object>, report: { applied: boolean, exemplarId: string|null, upgrades: Array<object> } }}
 */
export function upgradeWeakDeck(rawSlides, options = {}) {
  if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
    return { slides: rawSlides || [], report: { applied: false, exemplarId: null, upgrades: [] } }
  }
  const exemplar = options.exemplar || null
  const langEn = String(options.lang || 'zh').toLowerCase() === 'en'
  const allowSplit = options.allowSplit !== false
  const rescueTitles = options.rescueTitles !== false
  const upgrades = []

  const working = rawSlides.map((s) => (s && typeof s === 'object' ? { ...s } : s))

  // --- PASS 1: 语义自动升格 v2（覆盖 v0.28.0 六大王牌版式 + KPI Spotlight） ---
  for (let i = 0; i < working.length; i += 1) {
    const slide = working[i]
    if (!slide || typeof slide !== 'object') continue
    const lay = slide.layout || 'bullets'
    const title = String(slide.title ?? '').trim()
    const bullets = Array.isArray(slide.bullets) ? slide.bullets.filter((b) => String(b ?? '').trim() !== '') : []

    // 1a. 表格自动升格为 heatmap 或 radar（仅在未显式指定 tableStyle 时触发）
    if (lay === 'table' && !slide.tableStyle && isNumericTable(slide.rows)) {
      if (RADAR_TITLE_RE.test(title) && slide.rows.length <= 9 && slide.rows[0].length <= 4) {
        slide.layout = 'radar'
        upgrades.push({ slide: i + 1, action: 'promote-layout', from: 'table', to: 'radar', reason: 'multi-axis benchmark numeric table' })
        continue
      }
      if (HEATMAP_TITLE_RE.test(title) && slide.rows.length >= 4 && slide.rows[0].length >= 4) {
        slide.layout = 'heatmap'
        upgrades.push({ slide: i + 1, action: 'promote-layout', from: 'table', to: 'heatmap', reason: 'regional/matrix numeric table' })
        continue
      }
    }

    // 仅对 plain bullets（且无 image / chart / mermaid / formula / items）做语义升维
    const isPlainBullets = lay === 'bullets' && !slide.image && !slide.images && !slide.chart && !slide.mermaid && !slide.formula && !(Array.isArray(slide.items) && slide.items.length > 0)
    if (!isPlainBullets) continue

    // 1b. 嵌入式代码块自动晋升为 code[split]
    const embeddedCode = extractEmbeddedCode(slide)
    if (embeddedCode) {
      slide.layout = 'code'
      slide.language = embeddedCode.language
      slide.code = embeddedCode.code
      slide.filename = slide.filename || `snippet.${embeddedCode.language === 'python' ? 'py' : embeddedCode.language === 'typescript' ? 'ts' : embeddedCode.language}`
      if (bullets.length > 0 && (slide.text || slide.code)) {
        slide.variant = 'split'
        slide.items = bullets.slice(0, 3).map((b, idx) => {
          const { title: t, text: d } = splitLead(b)
          return { tag: String(idx + 1).padStart(2, '0'), title: t, ...(d ? { text: d } : {}), status: idx === 0 ? 'accent' : 'positive' }
        })
        delete slide.bullets
      } else {
        slide.variant = 'full'
        delete slide.bullets
      }
      delete slide.text
      upgrades.push({ slide: i + 1, action: 'promote-layout', from: 'bullets', to: `code[${slide.variant}]`, reason: 'embedded code detected' })
      continue
    }

    // 1c. Before→After 数值跃迁 -> dumbbell（100% 无损保留未匹配说明句）
    if (bullets.length >= 2 && bullets.length <= 7) {
      const parsedDb = []
      const leftovers = []
      for (const b of bullets) {
        const item = parseDumbbellBullet(b)
        if (item) parsedDb.push(item)
        else leftovers.push(stripInlineMarkdown(b).trim())
      }
      if (parsedDb.length >= 2 && (leftovers.length === 0 || (leftovers.length === 1 && !slide.takeaway && parsedDb.length / bullets.length >= 0.65))) {
        slide.layout = 'dumbbell'
        slide.items = parsedDb
        if (leftovers.length === 1 && !slide.takeaway) slide.takeaway = leftovers[0]
        delete slide.bullets
        upgrades.push({ slide: i + 1, action: 'promote-layout', from: 'bullets', to: 'dumbbell', reason: `${parsedDb.length} before→after numeric deltas` })
        continue
      }
    }

    // 1d. 多维能力对比评分 -> radar（100% 无损）
    if (bullets.length >= 3 && bullets.length <= 8 && RADAR_TITLE_RE.test(title)) {
      const parsedRadar = []
      const leftovers = []
      for (const b of bullets) {
        const item = parseRadarBullet(b)
        if (item) parsedRadar.push(item)
        else leftovers.push(stripInlineMarkdown(b).trim())
      }
      if (parsedRadar.length >= 3 && (leftovers.length === 0 || (leftovers.length === 1 && !slide.takeaway))) {
        const sCount = Math.min(3, Math.min(...parsedRadar.map((r) => r.vals.length)))
        const head = langEn
          ? ['Dimension', 'Our Solution', 'Industry Avg', 'Baseline'].slice(0, sCount + 1)
          : ['评估维度', '本方案', '行业均值', '基线方案'].slice(0, sCount + 1)
        slide.layout = 'radar'
        slide.rows = [head, ...parsedRadar.map((r) => [r.axis, ...r.vals.slice(0, sCount)])]
        if (leftovers.length === 1 && !slide.takeaway) slide.takeaway = leftovers[0]
        delete slide.bullets
        upgrades.push({ slide: i + 1, action: 'promote-layout', from: 'bullets', to: 'radar', reason: `${parsedRadar.length}-axis benchmark scores` })
        continue
      }
    }

    // 1e. 魔力象限 / 战略定位 -> quadrant（100% 无损）
    if (bullets.length >= 3 && bullets.length <= 10 && QUADRANT_TITLE_RE.test(title)) {
      const parsedQuad = []
      const leftovers = []
      bullets.forEach((b, idx) => {
        const item = parseQuadrantBullet(b, idx)
        if (item) parsedQuad.push(item)
        else leftovers.push(stripInlineMarkdown(b).trim())
      })
      if (parsedQuad.length >= 3 && (leftovers.length === 0 || (leftovers.length === 1 && !slide.takeaway))) {
        slide.layout = 'quadrant'
        slide.items = parsedQuad
        if (leftovers.length === 1 && !slide.takeaway) slide.takeaway = leftovers[0]
        delete slide.bullets
        upgrades.push({ slide: i + 1, action: 'promote-layout', from: 'bullets', to: 'quadrant', reason: `${parsedQuad.length} competitive positioning points` })
        continue
      }
    }

    // 1f. 产品界面 / 设备原型 -> mockup[browser | mobile]
    if (bullets.length >= 2 && bullets.length <= 4 && MOCKUP_TITLE_RE.test(title)) {
      const isMobile = /移动|手机|端|mobile|ios|android|phone|app/i.test(title) && !/桌面|网页|浏览器|web|browser|desktop/i.test(title)
      const urlHit = /(https?:\/\/[^\s)）]+)/i.exec(bullets.join(' ') + ' ' + String(slide.text || ''))
      slide.layout = 'mockup'
      slide.variant = isMobile ? 'mobile' : 'browser'
      if (urlHit) slide.url = urlHit[1]
      slide.items = bullets.map((b, idx) => {
        const kpi = parseKpiBullet(b, idx)
        const { title: t, text: d } = splitLead(b)
        return {
          tag: String(idx + 1).padStart(2, '0'),
          ...(kpi?.value ? { value: kpi.value } : {}),
          ...(kpi?.delta ? { delta: kpi.delta } : {}),
          title: t,
          ...(d ? { text: d } : {}),
          status: idx === 0 ? 'accent' : 'positive',
        }
      })
      delete slide.bullets
      upgrades.push({ slide: i + 1, action: 'promote-layout', from: 'bullets', to: `mockup[${slide.variant}]`, reason: 'product/UI showcase cues' })
      continue
    }

    // 1g. 高密度数字指标 -> kpi[spotlight]（仅全部条目均为真实指标时升格，确保 100% 无损）
    if (bullets.length >= 2 && bullets.length <= 4) {
      const kpis = bullets.map((b, idx) => parseKpiBullet(b, idx)).filter(Boolean)
      const avgLen = bullets.reduce((acc, b) => acc + stripInlineMarkdown(b).length, 0) / bullets.length
      if (kpis.length === bullets.length && avgLen <= 56) {
        slide.layout = 'kpi'
        slide.variant = 'spotlight'
        slide.items = kpis
        delete slide.bullets
        upgrades.push({ slide: i + 1, action: 'promote-layout', from: 'bullets', to: 'kpi[spotlight]', reason: `${kpis.length} quantified KPI bullets` })
        continue
      }
    }
  }

  // --- PASS 2: Exemplar 节奏投影（覆盖封面/封底/剩余 bullets 视觉多样性） ---
  if (exemplar && Array.isArray(exemplar.slots) && exemplar.slots.length > 0) {
    const coverSlot = exemplar.slots.find((s) => s.layout === 'cover')
    const closingSlot = exemplar.slots.find((s) => s.layout === 'closing')
    const proseFallbackLayouts = [
      { layout: 'cards', variant: 'bento-hero' },
      { layout: 'comparison', variant: 'issue-action' },
      { layout: 'cards', variant: 'frameless' },
      { layout: 'process', variant: 'steps' },
      { layout: 'callout', variant: 'takeaways' },
    ]
    let fallbackCursor = 0

    working.forEach((slide, idx) => {
      if (!slide || typeof slide !== 'object') return
      if (slide.layout === 'cover' && coverSlot) {
        if (!slide.variant && coverSlot.variant) {
          slide.variant = coverSlot.variant
          upgrades.push({ slide: idx + 1, action: 'exemplar-cover', from: 'cover', to: `cover[${coverSlot.variant}]`, reason: `exemplar ${exemplar.id}` })
        }
        if (!slide.coverPattern && coverSlot.coverPattern) {
          slide.coverPattern = coverSlot.coverPattern
        }
      } else if (slide.layout === 'closing' && closingSlot && !slide.variant && closingSlot.variant) {
        slide.variant = closingSlot.variant
      } else if (slide.layout === 'bullets' && Array.isArray(slide.bullets) && slide.bullets.length >= 2 && slide.bullets.length <= 6 && !slide.image && !slide.chart) {
        // 寻找对应序号的 exemplar 文本型槽位，若不匹配则轮转高质感结构化卡片
        const aligned = exemplar.slots[Math.min(idx, exemplar.slots.length - 1)]
        const compatibleSlot = aligned && ['cards', 'comparison', 'process', 'callout'].includes(aligned.layout)
          ? { layout: aligned.layout, variant: aligned.variant || '' }
          : proseFallbackLayouts[fallbackCursor++ % proseFallbackLayouts.length]
        if (compatibleSlot.layout === 'cards' && compatibleSlot.variant === 'bento-hero' && (slide.bullets.length < 2 || slide.bullets.length > 4)) {
          compatibleSlot.variant = 'frameless'
        }
        slide.layout = compatibleSlot.layout
        if (compatibleSlot.variant) slide.variant = compatibleSlot.variant
        slide.items = slide.bullets.map((b, bi) => {
          const { title: t, text: d } = splitLead(b)
          return {
            tag: String(bi + 1).padStart(2, '0'),
            title: t,
            ...(d ? { text: d } : {}),
            ...(bi === 0 ? { status: 'accent' } : {}),
          }
        })
        delete slide.bullets
        upgrades.push({
          slide: idx + 1,
          action: 'exemplar-slot',
          from: 'bullets',
          to: compatibleSlot.variant ? `${compatibleSlot.layout}[${compatibleSlot.variant}]` : compatibleSlot.layout,
          reason: `aligned to exemplar ${exemplar.id}`,
        })
      }
    })
  }

  // --- PASS 3: 反文字墙自动脱水、自动拆分与连续 bullets 破冰 ---
  const finalSlides = []
  let bulletStreak = 0
  let diversityToggle = 0
  for (let i = 0; i < working.length; i += 1) {
    const slide = working[i]
    if (!slide || typeof slide !== 'object') {
      finalSlides.push(slide)
      continue
    }
    const lay = slide.layout || 'bullets'
    if (lay === 'bullets' && Array.isArray(slide.bullets) && slide.bullets.length > 0 && !slide.image && !slide.chart) {
      // 自动为长散文要点提取加粗引导词
      slide.bullets = slide.bullets.map(autoBoldBullet)

      // 超过 6 条要点强制无损拆页，防止文字墙溢出
      if (allowSplit && slide.bullets.length > 6 && finalSlides.length < 100) {
        const mid = Math.ceil(slide.bullets.length / 2)
        const partA = slide.bullets.slice(0, mid)
        const partB = slide.bullets.slice(mid)
        const slideA = {
          ...slide,
          layout: 'cards',
          variant: partA.length <= 4 ? 'bento-hero' : 'frameless',
          items: partA.map((b, bi) => {
            const { title: t, text: d } = splitLead(b)
            return { tag: String(bi + 1).padStart(2, '0'), title: t, ...(d ? { text: d } : {}) }
          }),
        }
        delete slideA.bullets
        const slideB = {
          ...slide,
          title: `${slide.title}${langEn ? ' (Cont.)' : '（续）'}`,
          layout: partB.length <= 4 ? 'callout' : 'cards',
          variant: partB.length <= 4 ? 'takeaways' : 'pillars',
          items: partB.map((b, bi) => {
            const { title: t, text: d } = splitLead(b)
            return { tag: String(mid + bi + 1).padStart(2, '0'), title: t, ...(d ? { text: d } : {}) }
          }),
        }
        delete slideB.bullets
        finalSlides.push(slideA, slideB)
        upgrades.push({ slide: i + 1, action: 'auto-split', from: `bullets(${slide.bullets.length})`, to: `${slideA.layout}+${slideB.layout}`, reason: 'prevented >6 bullet text wall' })
        bulletStreak = 0
        continue
      }

      // 严禁连续 >= 2 页纯 bullets
      bulletStreak += 1
      if (bulletStreak >= 2 && slide.bullets.length >= 2 && slide.bullets.length <= 6) {
        const nextLayout = diversityToggle % 2 === 0 ? 'cards' : 'callout'
        const nextVariant = nextLayout === 'cards'
          ? (slide.bullets.length <= 4 ? 'bento-hero' : 'frameless')
          : 'takeaways'
        slide.layout = nextLayout
        slide.variant = nextVariant
        slide.items = slide.bullets.map((b, bi) => {
          const { title: t, text: d } = splitLead(b)
          return { tag: String(bi + 1).padStart(2, '0'), title: t, ...(d ? { text: d } : {}) }
        })
        delete slide.bullets
        diversityToggle += 1
        bulletStreak = 0
        upgrades.push({ slide: i + 1, action: 'break-bullet-streak', from: 'bullets', to: `${nextLayout}[${nextVariant}]`, reason: 'prevented consecutive bullet walls' })
      }
    } else if (!['section', 'agenda', 'cover'].includes(lay)) {
      bulletStreak = 0
    }
    finalSlides.push(slide)
  }

  // --- PASS 4: Action Title 救援 + Kicker 叙事脉络修复 + 空洞封底补全 ---
  const genericKickers = finalSlides.filter((s) => /^(?:要点|Key\s*point)(?:\s*\d+)?$/i.test(String(s?.kicker ?? '').trim())).length
  const shouldRepairKickers = genericKickers >= 2 || (finalSlides.length >= 5 && finalSlides.filter((s) => !['cover', 'section', 'closing', 'agenda'].includes(s?.layout) && !s?.kicker).length >= 3)
  let contentOrd = 0

  for (let i = 0; i < finalSlides.length; i += 1) {
    const slide = finalSlides[i]
    if (!slide || typeof slide !== 'object') continue
    const lay = slide.layout || 'bullets'
    const isFraming = ['cover', 'section', 'closing', 'agenda', 'quote'].includes(lay)

    if (!isFraming) {
      contentOrd += 1
      if (rescueTitles) {
        const rescued = rescueWeakTitle(slide, langEn)
        if (rescued) {
          upgrades.push({ slide: i + 1, action: 'rescue-action-title', from: slide.title, to: rescued, reason: 'SLOP-01 weak topic label' })
          slide.title = rescued
        }
      }
      const curKicker = String(slide.kicker ?? '').trim()
      if (shouldRepairKickers && (!curKicker || /^(?:要点|Key\s*point)(?:\s*\d+)?$/i.test(curKicker))) {
        slide.kicker = synthesizeKicker(slide, contentOrd, langEn)
        upgrades.push({ slide: i + 1, action: 'repair-kicker', from: curKicker || '(empty)', to: slide.kicker, reason: 'SLOP-02 narrative breadcrumb' })
      }
    }

    // SLOP-09 空洞封底救援
    if (lay === 'closing' && BARE_CLOSING_RE.test(String(slide.title ?? '').trim())) {
      const hasDetail = Boolean(String(slide.subtitle ?? '').trim() || (slide.bullets?.length > 0) || (slide.items?.length > 0))
      if (!hasDetail) {
        const seenRoots = new Set()
        const takeaways = []
        for (const s of [...finalSlides].reverse()) {
          if (!s || s === slide || ['cover', 'section', 'closing', 'agenda'].includes(s.layout)) continue
          const raw = String(s.takeaway || s.title || '').trim()
          const root = raw.replace(/(?:（续）|\s*\(Cont\.\))$/i, '')
          if (!raw || seenRoots.has(root)) continue
          seenRoots.add(root)
          takeaways.unshift(raw)
          if (takeaways.length >= 3) break
        }
        if (takeaways.length > 0) {
          const origTitle = slide.title
          slide.title = langEn ? 'Thank You · Key Decisions & Next Steps' : '感谢聆听 · 核心结论与下一步行动'
          slide.variant = slide.variant || 'cta-cards'
          slide.subtitle = langEn ? 'Confirm owners and milestone dates to lock execution' : '请重点确认以下三项核心推进方向与交付节点'
          slide.items = takeaways.map((tkText, ti) => ({
            tag: `0${ti + 1}`,
            title: tkText.slice(0, langEn ? 42 : 20),
            text: tkText.length > (langEn ? 42 : 20) ? tkText.slice(0, 56) : (langEn ? 'Confirm owner & target date' : '确认责任人与落实节点'),
            status: ti === 0 ? 'accent' : 'positive',
          }))
          upgrades.push({ slide: i + 1, action: 'rescue-closing-cta', from: origTitle, to: 'closing[cta-cards]', reason: 'SLOP-09 bare thank-you slide' })
        }
      }
    }
  }

  const promotedCount = upgrades.filter((u) => u.action === 'promote-layout' || u.action === 'exemplar-slot').length
  const splitCount = upgrades.filter((u) => u.action === 'auto-split').length
  const brokenStreaks = upgrades.filter((u) => u.action === 'break-bullet-streak').length
  const rescuedTitles = upgrades.filter((u) => u.action === 'rescue-action-title').length

  return {
    slides: finalSlides,
    report: {
      applied: upgrades.length > 0 || Boolean(exemplar),
      exemplarId: exemplar?.id || null,
      upgradeCount: upgrades.length,
      promotedCount,
      splitCount,
      brokenStreaks,
      rescuedTitles,
      upgrades,
    },
  }
}

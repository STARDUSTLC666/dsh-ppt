/**
 * deck-upgrader.mjs —— 弱模型兜底升维编译器（Weak-LLM Compensator）、标杆槽位重排器与零模型自检修复闭环（v0.31.0）。
 *
 * 解决痛点：
 * 1. 即使上游 LLM（如 DeepSeek 或轻量模型）偷懒输出了连续 bullets 文字墙、空洞名词标题、
 *    埋在文字里的前后对比数据/多维评分/代码块/原型描述、乱序章节或只有“谢谢”的空洞封底，
 *    本引擎也在渲染前以 100% 确定性规则无损升维为顶级咨询/发布会视觉版式；
 * 2. 支持 `alignOrder: true` 按标杆范本槽位节奏（封面 → 摘要/KPI → 痛点对比 → 方案图谱 → 量化证明 → 排期路线 → 行动封底）重排乱序草稿；
 * 3. 内置零额外 LLM 调用的确定性自检修复闭环（`selfRepairDeck`）：渲染落盘前先跑 `checkManifest` + SLOP-01..12，
 *    自动无损修复标题溢出、文字墙、卡片/表格过载、饼图碎块、缺图表焦点/结论、连续方框疲劳与刺眼/低对比配色，复检通过后再落盘。
 */

import { stripInlineMarkdown } from './deck-layouts.mjs'
import { relativeLuminance, hexToHsl } from './deck-themes.mjs'

export const WEAK_GENERIC_TITLE_RE = /^(?:(?:第?[一二三四五六七八九十\d]+[章节部分页、.\s·:-]*)|(?:(?:Part|Section|Step|Q[1-4]|FY\d{2,4}|20\d{2})\s*[\d.:·\-—\s]*))*(?:项目背景|研究背景|背景介绍|现状分析|业务现状|现状与问题|存在问题|问题分析|痛点分析|数据分析|数据概览|核心数据|财务情况|财务数据|经营数据|业绩情况|成本分析|市场分析|行业分析|用户分析|核心指标|关键指标|性能提升|效能提升|技术实现|技术方案|架构实现|架构设计|核心功能|核心功能介绍|产品介绍|产品规划|团队介绍|组织架构|商业模式|未来规划|下一步计划|项目排期|核心优势|核心亮点|主要成果|工作进展|工作汇报|工作总结|年度总结|季度总结|阶段总结|业务复盘|项目复盘|项目进展|阶段进展|竞品分析|竞品对比|解决方案|实施方案|改进措施|行动计划|工作计划|风险分析|总结|总结汇报|概述|目录页|关于我们|Overview|Introduction|Background|Current\s+State|Status|Progress|Metrics|Key\s+Metrics|Financials|Financial\s+Summary|Performance|Implementation|Architecture|Architecture\s+Overview|Product|Product\s+Overview|Team|Organization|Data\s+Analysis|Analysis|Market\s+Analysis|Comparison|Solution|Plan|Roadmap|Next\s+Steps|Risks?(?:\s*(?:&|and)\s*Mitigations?)?|Summary|Executive\s+Summary|Project\s+Update|Results|Highlights|Chart|Slide\s*\d+)$/i
const BARE_CLOSING_RE = /^(?:谢谢|谢谢观看|谢谢聆听|感谢(?:聆听|观看|大家|指导)?|敬请指正|Thank\s*You|Thanks|Q\s*&\s*A)[!！.。?？\s]*$/i
const LOWER_IS_BETTER_RE = /耗时|时延|延迟|周期|成本|返工|缺陷|故障|错误|流失|投诉|报错|开销|预算|疼痛|障碍|并发症|复发|住院|latency|cost|time|cycle|rework|defect|error|churn|bug|delay|mttr|pain|disability|complication|mortality/i
const DUMBBELL_RE = /(?:从|由|from\s+)?(-?\d+(?:\.\d+)?)\s*(%|％|pp|bp|ms|s|分|pts|天|小时|分钟|h|m|x|倍|万|亿|元|例|k|M|B)?\s*(?:提升至|提升到|增长至|增长到|跃升至|上涨至|提高到|升至|升到|降至|降到|压缩至|压缩到|缩短至|缩短到|减少至|减少到|优化至|优化到|变为|→|->|to)\s*(-?\d+(?:\.\d+)?)\s*(%|％|pp|bp|ms|s|分|pts|天|小时|分钟|h|m|x|倍|万|亿|元|例|k|M|B)?/i
const RADAR_TITLE_RE = /雷达|多维|能力评估|能力对比|综合评测|基准评测|权衡|radar|spider|benchmark|capability|trade-?off|multi-?axis/i
const HEATMAP_TITLE_RE = /热力|达成率|分布矩阵|覆盖率|完成度|矩阵|heatmap|heat\s*map|coverage|regional|fulfillment|sensitivity/i
const QUADRANT_TITLE_RE = /魔力象限|象限|竞争格局|波士顿|定位矩阵|市场定位|quadrant|positioning|bcg|competitive\s+landscape|magic\s+quadrant/i
const MOCKUP_TITLE_RE = /界面|原型|工作台演示|产品演示|端体验|交互体验|移动端|app\s*体验|ui\s*展示|mockup|prototype|web\s*studio|dashboard|product\s*demo|mobile\s*app|companion/i
const CODE_LINE_RE = /^\s*(?:export\s+|import\s+|const\s+|let\s+|var\s+|function\s+|async\s+function|class\s+|def\s+|fn\s+|pub\s+fn|package\s+|SELECT\s+|CREATE\s+|curl\s+|npm\s+|pnpm\s+|docker\s+|kubectl\s+|return\s+|\{|\})/
const DATA_BINDING_RE = /\{\{[^{}]+\}\}/

function measureWidth(text) {
  return [...stripInlineMarkdown(String(text ?? ''))].reduce((n, c) => n + (/[^\x00-\xff]/.test(c) ? 1 : 0.55), 0)
}

function slideHasDataBinding(slide) {
  if (!slide || typeof slide !== 'object') return false
  try {
    return DATA_BINDING_RE.test(JSON.stringify(slide))
  } catch {
    return false
  }
}

function truncateCleanly(text, maxWidth) {
  const s = String(text ?? '').trim()
  if (!s || measureWidth(s) <= maxWidth) return s
  // 优先在自然句读/标点/空格边界截断，绝不在数字或英文单词中间腰斩
  const chars = [...s]
  let acc = 0
  let cutIdx = chars.length
  let lastBoundary = -1
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]
    acc += /[^\x00-\xff]/.test(ch) ? 1 : 0.55
    if (acc > maxWidth) {
      cutIdx = i
      break
    }
    if (/[，,。；;、：:\s)）]/.test(ch) && acc >= maxWidth * 0.48) {
      lastBoundary = i
    }
  }
  let chosen = lastBoundary > 0 ? chars.slice(0, lastBoundary).join('') : chars.slice(0, cutIdx).join('')
  // 避免末尾停在半截数字/英文单词
  if (lastBoundary <= 0 && cutIdx < chars.length && /[A-Za-z0-9.]/.test(chars[cutIdx - 1] || '') && /[A-Za-z0-9.]/.test(chars[cutIdx] || '')) {
    chosen = chosen.replace(/[A-Za-z0-9.]+$/, '')
  }
  // 清理截断残留的未闭合括号与悬空介词/动词
  chosen = chosen.replace(/[（(][^）)]*$/, '')
  chosen = chosen.replace(/(?:降至|升至|由|从|较|的)\s*$/, '')
  return chosen.replace(/[，,。；;、：:\-—\s]+$/, '').trim()
}

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

function formatCompactNumber(v) {
  if (!Number.isFinite(v)) return ''
  return Math.abs(v) >= 100 ? String(Math.round(v * 10) / 10) : String(Number(v.toFixed(1)))
}

function extractChartEvidence(chart, langEn) {
  if (!chart || !Array.isArray(chart.categories) || !Array.isArray(chart.series) || chart.series.length === 0) return null
  const primary = chart.series[0]
  const vals = Array.isArray(primary?.values) ? primary.values.map(Number) : []
  const cats = chart.categories
  if (vals.length === 0 || vals.length !== cats.length || vals.some((n) => !Number.isFinite(n))) return null

  let maxIdx = 0
  let minIdx = 0
  for (let i = 1; i < vals.length; i += 1) {
    if (vals[i] > vals[maxIdx]) maxIdx = i
    if (vals[i] < vals[minIdx]) minIdx = i
  }
  const unit = chart.unit ? String(chart.unit).replace(/[()（）]/g, '').trim() : ''
  const unitSuffix = unit && unit.length <= 6 ? unit : ''
  const maxValStr = `${formatCompactNumber(vals[maxIdx])}${unitSuffix}`
  const maxCat = String(cats[maxIdx] ?? '').trim()
  const first = vals[0]
  const last = vals[vals.length - 1]
  const firstCat = String(cats[0] ?? '').trim()
  const lastCat = String(cats[cats.length - 1] ?? '').trim()
  const sName = String(primary.name || '').trim()

  if (chart.kind === 'pie' || chart.kind === 'doughnut') {
    const sum = vals.reduce((a, b) => a + Math.max(0, b), 0)
    const share = sum > 0 ? Math.round((Math.max(0, vals[maxIdx]) / sum) * 100) : 0
    const shareStr = `${share}%`
    const valNote = maxValStr && maxValStr !== shareStr ? `（${maxValStr}）` : ''
    const valNoteEn = maxValStr && maxValStr !== shareStr ? ` (${maxValStr})` : ''
    return {
      headline: langEn
        ? `${maxCat} leads at ${shareStr}${valNoteEn}`
        : `${maxCat}占比居首达 ${shareStr}${valNote}`,
      takeaway: langEn
        ? `${maxCat} accounts for ${shareStr}${valNoteEn} of total, outpacing ${String(cats[minIdx] ?? '').trim()} (${formatCompactNumber(vals[minIdx])}${unitSuffix}).`
        : `${maxCat}以 ${shareStr}${valNote} 位居第一，显著领先末项 ${String(cats[minIdx] ?? '').trim()}（${formatCompactNumber(vals[minIdx])}${unitSuffix}）。`,
    }
  }

  if (vals.length >= 2 && Math.abs(first) > 1e-6 && last !== first && ['line', 'area', 'column', 'waterfall', 'combo'].includes(chart.kind || 'column')) {
    const pct = Math.round(((last - first) / Math.abs(first)) * 100)
    const sign = pct >= 0 ? '+' : ''
    const headline = langEn
      ? `${lastCat} reached ${formatCompactNumber(last)}${unitSuffix} (${sign}${pct}% vs ${firstCat})`
      : `${lastCat} 达 ${formatCompactNumber(last)}${unitSuffix}（较 ${firstCat} ${sign}${pct}%）`
    const peakClauseZh = maxIdx === vals.length - 1
      ? (pct > 0 ? '，创周期新高' : '')
      : `，峰值位于 ${maxCat}（${maxValStr}）`
    const peakClauseEn = maxIdx === vals.length - 1
      ? (pct > 0 ? ', reaching a period high' : '')
      : `; peak in ${maxCat} (${maxValStr})`
    const verbZh = pct >= 0 ? '增长至' : '回落至'
    const takeaway = langEn
      ? `${sName || 'Primary metric'} moved from ${formatCompactNumber(first)}${unitSuffix} (${firstCat}) to ${formatCompactNumber(last)}${unitSuffix} (${lastCat}, ${sign}${pct}%)${peakClauseEn}.`
      : `${sName || '核心指标'}由 ${firstCat} 的 ${formatCompactNumber(first)}${unitSuffix} ${verbZh} ${lastCat} 的 ${formatCompactNumber(last)}${unitSuffix}（${sign}${pct}%）${peakClauseZh}。`
    return { headline, takeaway }
  }

  return {
    headline: langEn
      ? `${maxCat} leads at ${maxValStr}`
      : `${maxCat}表现居首达 ${maxValStr}`,
    takeaway: langEn
      ? `${maxCat} leads at ${maxValStr}, while ${String(cats[minIdx] ?? '').trim()} sits at ${formatCompactNumber(vals[minIdx])}${unitSuffix}.`
      : `${maxCat}以 ${maxValStr} 位居最高，${String(cats[minIdx] ?? '').trim()} 为 ${formatCompactNumber(vals[minIdx])}${unitSuffix}。`,
  }
}

function extractTableEvidence(rows, langEn) {
  if (!Array.isArray(rows) || rows.length < 2) return null
  const header = rows[0].map((c) => stripInlineMarkdown(String(c ?? '')).trim())
  let bestRow = null
  let bestScore = -Infinity
  let bestCell = ''
  let bestCol = ''
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r]
    if (!Array.isArray(row) || row.length < 2) continue
    const label = stripInlineMarkdown(String(row[0] ?? '')).trim()
    if (!label) continue
    const isBoldRow = /\*\*/.test(String(row[0] ?? ''))
    for (let c = 1; c < row.length; c += 1) {
      const rawCell = stripInlineMarkdown(String(row[c] ?? '')).trim()
      const numMatch = /-?\d+(?:\.\d+)?/.exec(rawCell.replace(/,/g, ''))
      if (!numMatch) continue
      const val = Number(numMatch[0])
      const score = (isBoldRow ? 1e9 : 0) + (Number.isFinite(val) ? Math.abs(val) : 0)
      if (score > bestScore) {
        bestScore = score
        bestRow = label
        bestCell = rawCell
        bestCol = header[c] || ''
      }
    }
  }
  if (!bestRow || !bestCell) return null
  const headline = langEn
    ? `${bestRow} stands out at ${bestCell}${bestCol ? ' (' + bestCol + ')' : ''}`
    : `${bestRow}${bestCol ? bestCol : ''}达 ${bestCell}`
  return { headline }
}

/**
 * 证据锚定式 Action-Title 提炼器（100% 源自当前页真实数据，零编造数字，严格控宽避免 title-overflow）。
 */
export function synthesizeActionTitle(slide, langEn = false) {
  if (!slide || typeof slide !== 'object' || slideHasDataBinding(slide)) return null
  const rawTitle = String(slide.title ?? '').trim()
  if (!rawTitle || !WEAK_GENERIC_TITLE_RE.test(rawTitle)) return null

  const lay = slide.layout || 'bullets'
  const cleanPrefix = rawTitle
    .replace(/^(?:第?[一二三四五六七八九十\d]+[章节部分页、.\s·:-]*)/, '')
    .trim()
  const maxTotalWidth = langEn ? 32 : 31
  const sep = langEn ? ': ' : '：'

  const compose = (claim) => {
    const cleanClaim = String(claim ?? '').replace(/[。.;；]+$/, '').trim()
    if (!cleanClaim || cleanClaim.toLowerCase() === rawTitle.toLowerCase()) return null
    const merged = `${cleanPrefix || rawTitle}${sep}${cleanClaim}`
    if (measureWidth(merged) <= maxTotalWidth) return merged
    const trimmedClaim = truncateCleanly(cleanClaim, maxTotalWidth)
    if (!trimmedClaim) return null
    const mergedShort = `${cleanPrefix || rawTitle}${sep}${truncateCleanly(cleanClaim, Math.max(10, maxTotalWidth - measureWidth(cleanPrefix || rawTitle) - 1.5))}`
    return measureWidth(mergedShort) <= maxTotalWidth && measureWidth(mergedShort) > measureWidth(cleanPrefix || rawTitle) + 4
      ? mergedShort
      : trimmedClaim
  }

  // 1. 已有明确 takeaway：优先取其核心句
  const tk = stripInlineMarkdown(String(slide.takeaway ?? '')).trim()
  if (tk && tk.length >= 6 && /\d/.test(tk)) {
    const built = compose(tk)
    if (built) return built
  }

  // 2. KPI 指标页：取前 1-2 个带核心数值与涨跌的指标
  if (lay === 'kpi' && Array.isArray(slide.items) && slide.items.length > 0) {
    const top = slide.items.slice(0, 2).map((it) => {
      const t = stripInlineMarkdown(it?.title || '').trim()
      const v = stripInlineMarkdown(it?.value || '').trim()
      const d = stripInlineMarkdown(it?.delta || '').trim()
      return `${t}${v ? (langEn ? ' ' : '达 ') + v : ''}${d ? ` (${d})` : ''}`.trim()
    }).filter(Boolean)
    if (top.length > 0) {
      const joined = top.join(langEn ? ', ' : '，')
      const built = compose(measureWidth(joined) <= 24 ? joined : top[0])
      if (built) return built
    }
  }

  // 3. Dumbbell 哑铃跃迁页：提取最大改善幅度项
  if (lay === 'dumbbell' && Array.isArray(slide.items) && slide.items.length > 0) {
    const scored = slide.items
      .filter((it) => Number.isFinite(Number(it?.before)) && Number.isFinite(Number(it?.after)))
      .sort((a, b) => {
        const ra = Math.abs(Number(a.after) - Number(a.before)) / Math.max(1, Math.abs(Number(a.before)))
        const rb = Math.abs(Number(b.after) - Number(b.before)) / Math.max(1, Math.abs(Number(b.before)))
        return rb - ra
      })
    if (scored.length > 0) {
      const best = scored[0]
      const u = best.unit || ''
      const verbZh = Number(best.after) < Number(best.before) ? '降至' : '升至'
      const claim = langEn
        ? `${best.title} moved from ${best.before}${u} to ${best.after}${u}`
        : `${best.title}由 ${best.before}${u} ${verbZh} ${best.after}${u}`
      const built = compose(claim)
      if (built) return built
    }
  }

  // 4. Chart / Chart-Split 页：基于真实序列极值/增长率提炼
  if ((lay === 'chart' || lay === 'chart-split') && slide.chart) {
    const ev = extractChartEvidence(slide.chart, langEn)
    if (ev?.headline) {
      const built = compose(ev.headline)
      if (built) return built
    }
  }

  // 5. Quadrant 魔力象限：取右上领航者
  if (lay === 'quadrant' && Array.isArray(slide.items) && slide.items.length > 0) {
    const leader = [...slide.items].sort((a, b) => ((Number(b.x) || 0) + (Number(b.y) || 0)) - ((Number(a.x) || 0) + (Number(a.y) || 0)))[0]
    if (leader?.title) {
      const claim = langEn ? `${leader.title} leads in top-right quadrant` : `${leader.title}位居右上领航象限`
      const built = compose(claim)
      if (built) return built
    }
  }

  // 6. Table / Heatmap / Radar 页：提取代表行
  if ((lay === 'table' || lay === 'heatmap' || lay === 'radar') && Array.isArray(slide.rows) && slide.rows.length >= 2) {
    const ev = extractTableEvidence(slide.rows, langEn)
    if (ev?.headline) {
      const built = compose(ev.headline)
      if (built) return built
    }
  }

  // 7. 通用候选（items / bullets / takeaway）
  const candidates = [
    tk,
    ...(Array.isArray(slide.items) ? slide.items.map((it) => `${stripInlineMarkdown(it?.title || '')}${it?.value ? ' ' + it.value : ''}${it?.delta ? ' ' + it.delta : ''}${it?.text ? (langEn ? ': ' : '：') + stripInlineMarkdown(it.text) : ''}`.trim()) : []),
    ...(Array.isArray(slide.bullets) ? slide.bullets.map(stripInlineMarkdown) : []),
  ].filter(Boolean)

  const best = candidates.find((c) => /\d/.test(c) && c.length >= 6) || candidates[0]
  if (!best) return null
  return compose(best)
}

function synthesizeGroundedTakeaway(slide, langEn = false) {
  if (!slide || typeof slide !== 'object' || slideHasDataBinding(slide)) return null
  if (String(slide.takeaway ?? '').trim()) return null
  const lay = slide.layout || 'bullets'

  if ((lay === 'chart' || lay === 'chart-split') && slide.chart && !String(slide.chart.caption ?? '').trim()) {
    const ev = extractChartEvidence(slide.chart, langEn)
    if (ev?.takeaway) return ev.takeaway
  }
  if (lay === 'dumbbell' && Array.isArray(slide.items) && slide.items.length >= 2) {
    const pos = slide.items.filter((it) => it?.status === 'positive')
    if (pos.length > 0) {
      const top = pos[0]
      const u = top.unit || ''
      return langEn
        ? `${pos.length} of ${slide.items.length} tracked indicators improved, led by ${top.title} (${top.before}${u} → ${top.after}${u}).`
        : `${pos.length}/${slide.items.length} 项核心指标实现正向跃迁，其中${top.title}由 ${top.before}${u} 优化至 ${top.after}${u}。`
    }
  }
  return null
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
    chart: '数据趋势',
    'chart-split': '数据解读',
    waterfall: '盈利桥接',
    statement: '核心判断',
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
    chart: 'DATA TREND',
    'chart-split': 'DATA INSIGHT',
    waterfall: 'VALUE BRIDGE',
    statement: 'CORE THESIS',
  }
  const label = (langEn ? mapEn[lay] : mapZh[lay]) || (langEn ? 'INSIGHTS' : '核心要点')
  return `${num} · ${label}`
}

// ---------------------------------------------------------------------------
// Exemplar Narrative-Arc Re-sequencer (alignOrder: true)
// ---------------------------------------------------------------------------

function inferNarrativePhase(slide) {
  const lay = slide?.layout || 'bullets'
  const title = String(slide?.title ?? '').toLowerCase()
  const role = String(slide?.role ?? '').toLowerCase()
  const text = `${role} ${title}`

  if (lay === 'cover') return -1
  if (lay === 'closing') return 99
  if (lay === 'agenda' || lay === 'statement' || lay === 'quote' || /执行摘要|核心判断|目录|议程|exec-summary|thesis|agenda|overview/i.test(text)) {
    return 0
  }
  if (lay === 'kpi' || /核心指标|财务快照|营收|headline|kpi|metric|financial/i.test(text)) {
    return 1
  }
  if (lay === 'comparison' || lay === 'swot' || lay === 'tam' || /痛点|问题|现状|瓶颈|挑战|风险|市场空间|pain|problem|challenge|bottleneck|tam/i.test(text)) {
    return 2
  }
  if (lay === 'gantt' || lay === 'org' || /排期|路线图|里程碑|实施计划|下一步|甘特|组织|团队|roadmap|milestone|gantt|timeline|schedule|next\s+phase/i.test(text)) {
    return 5
  }
  if (['chart', 'chart-split', 'waterfall', 'dumbbell', 'radar', 'quadrant', 'heatmap', 'table', 'harvey', 'marimekko', 'sankey'].includes(lay)) {
    return 4
  }
  // architecture, mermaid, mockup, code, process, value-chain, cards, callout, bullets
  return 3
}

function buildExemplarPhaseRank(exemplar) {
  const baseOrder = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
  if (!exemplar || !Array.isArray(exemplar.slots) || exemplar.slots.length === 0) return baseOrder
  const firstSeen = {}
  exemplar.slots.forEach((sl, idx) => {
    const p = inferNarrativePhase(sl)
    if (p >= 0 && p <= 5 && firstSeen[p] === undefined) firstSeen[p] = idx
  })
  const rank = {}
  for (let p = 0; p <= 5; p += 1) {
    rank[p] = firstSeen[p] !== undefined ? firstSeen[p] : (10 + p)
  }
  return rank
}

/**
 * 将乱序草稿幻灯片按目标标杆范本的叙事弧线重排（保持封面置顶、封底置尾、章节边界完整）。
 *
 * @param {Array<object>} slides
 * @param {object|null} exemplar
 * @returns {{ slides: Array<object>, orderChanged: boolean, movedCount: number }}
 */
export function resequenceSlidesToExemplar(slides, exemplar = null) {
  if (!Array.isArray(slides) || slides.length <= 3) {
    return { slides: Array.isArray(slides) ? [...slides] : [], orderChanged: false, movedCount: 0 }
  }
  const hasCover = slides[0]?.layout === 'cover'
  const hasClosing = slides[slides.length - 1]?.layout === 'closing'
  const head = hasCover ? [slides[0]] : []
  const tail = hasClosing ? [slides[slides.length - 1]] : []
  const middle = slides.slice(hasCover ? 1 : 0, hasClosing ? slides.length - 1 : slides.length)

  if (middle.length <= 1) {
    return { slides: [...slides], orderChanged: false, movedCount: 0 }
  }

  // 若包含多个显式 section 章节分隔页，则按章节块内部重排，绝不打散人工分章
  const sectionIndices = middle.map((s, i) => (s?.layout === 'section' ? i : -1)).filter((i) => i >= 0)
  const phaseRank = buildExemplarPhaseRank(exemplar)

  const sortBlock = (block) => {
    if (block.length <= 1) return block
    const decorated = block.map((slide, origIdx) => {
      const phase = inferNarrativePhase(slide)
      const slotPos = phaseRank[phase] ?? (10 + phase)
      return { slide, origIdx, phase, slotPos }
    })
    decorated.sort((a, b) => (a.slotPos - b.slotPos) || (a.origIdx - b.origIdx))

    // 1-pass 相邻同版式错峰微调（仅在同一阶段带内或相邻非封面/排期页间互换，避免连续同布局）
    for (let i = 1; i < decorated.length - 1; i += 1) {
      const prevLay = decorated[i - 1].slide?.layout || 'bullets'
      const curLay = decorated[i].slide?.layout || 'bullets'
      const nextLay = decorated[i + 1].slide?.layout || 'bullets'
      if (curLay === prevLay && nextLay !== curLay && Math.abs(decorated[i + 1].slotPos - decorated[i].slotPos) <= 2) {
        const tmp = decorated[i]
        decorated[i] = decorated[i + 1]
        decorated[i + 1] = tmp
      }
    }
    return decorated.map((d) => d.slide)
  }

  let sortedMiddle
  if (sectionIndices.length >= 2) {
    sortedMiddle = []
    let cursor = 0
    for (const secIdx of sectionIndices) {
      if (secIdx > cursor) sortedMiddle.push(...sortBlock(middle.slice(cursor, secIdx)))
      sortedMiddle.push(middle[secIdx])
      cursor = secIdx + 1
    }
    if (cursor < middle.length) sortedMiddle.push(...sortBlock(middle.slice(cursor)))
  } else {
    sortedMiddle = sortBlock(middle)
  }

  const reordered = [...head, ...sortedMiddle, ...tail]
  let movedCount = 0
  for (let i = 0; i < reordered.length; i += 1) {
    if (reordered[i] !== slides[i]) movedCount += 1
  }
  return {
    slides: reordered,
    orderChanged: movedCount > 0,
    movedCount,
  }
}

// ---------------------------------------------------------------------------
// Zero-LLM Deterministic Self-Repair Loop (checkManifest + SLOP-01..12)
// ---------------------------------------------------------------------------

function contrastRatioHex(a, b) {
  if (!/^#[0-9a-f]{6}$/i.test(String(a || '')) || !/^#[0-9a-f]{6}$/i.test(String(b || ''))) return 7
  const x = relativeLuminance(a)
  const y = relativeLuminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

function splitOverflowTitle(slide, maxWidth, langEn) {
  const title = String(slide.title ?? '').trim()
  if (!title || measureWidth(title) <= maxWidth || slideHasDataBinding(slide)) return false
  // 1. 优先在冒号/破折号/分号处拆分主标题与副标题
  const delimMatch = /^(.+?)\s*([：:]|——|—|;\s*|；)\s*(.+)$/.exec(title)
  let head = ''
  let tail = ''
  if (delimMatch && measureWidth(delimMatch[1]) >= 4 && measureWidth(delimMatch[1]) <= maxWidth) {
    head = delimMatch[1].trim()
    tail = delimMatch[3].trim()
  } else {
    head = truncateCleanly(title, maxWidth - 1)
    if (!head || head.length >= title.length) return false
    tail = title.slice(head.length).replace(/^[：:，,。；;、\-—\s]+/, '').trim()
  }
  if (!head || measureWidth(head) > maxWidth) return false
  slide.title = head
  if (tail) {
    if (!String(slide.subtitle ?? '').trim()) {
      slide.subtitle = tail
    } else if (!String(slide.takeaway ?? '').trim() && !['cover', 'closing', 'section'].includes(slide.layout)) {
      slide.takeaway = tail
    } else if (measureWidth(`${slide.subtitle} · ${tail}`) <= 68) {
      slide.subtitle = `${String(slide.subtitle).trim()}${langEn ? ' — ' : ' · '}${tail}`
    }
  }
  return true
}

function splitLongBulletStrings(bullets) {
  const out = []
  for (const raw of bullets) {
    const s = String(raw ?? '').trim()
    if (!s) continue
    if (measureWidth(s) <= 68) {
      out.push(s)
      continue
    }
    const parts = s.split(/(?<=[。；;！？!?])\s*|\.\s+(?=[A-Z0-9])/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      out.push(...parts.map(autoBoldBullet))
    } else {
      // 超长无句号文本按逗号切半，确保 100% 无损保留原文
      const commaParts = s.split(/[，,]\s*/).filter(Boolean)
      if (commaParts.length >= 2) {
        const mid = Math.ceil(commaParts.length / 2)
        out.push(autoBoldBullet(commaParts.slice(0, mid).join('，')), autoBoldBullet(commaParts.slice(mid).join('，')))
      } else {
        out.push(s)
      }
    }
  }
  return out
}

function makeSplitSlideCopy(base, suffixTitle, overrides) {
  const copy = { ...base, ...overrides, title: suffixTitle }
  delete copy.id
  return copy
}

/**
 * 零模型调用确定性自检修复闭环：
 * 在渲染落盘前运行 `checkFn(manifest)`，对所有可确定性无损修复的版式/密度/图表/对比度告警执行最多 `maxPasses` 轮修复并复检。
 *
 * @param {object} manifest
 * @param {{ checkFn: (m: object) => object, maxPasses?: number, maxSlides?: number, lang?: string, allowSplit?: boolean }} options
 * @returns {{ manifest: object, report: { passes: number, initialWarnings: number, finalWarnings: number, fixedCount: number, repairs: Array<object> } }}
 */
export function selfRepairDeck(manifest, options = {}) {
  const checkFn = options.checkFn
  if (!manifest || !Array.isArray(manifest.slides) || typeof checkFn !== 'function') {
    return {
      manifest,
      report: { passes: 0, initialWarnings: 0, finalWarnings: 0, fixedCount: 0, repairs: [] },
    }
  }
  const maxPasses = Math.max(1, Math.min(3, Number(options.maxPasses) || 2))
  const maxSlides = Math.max(manifest.slides.length, Number(options.maxSlides) || 60)
  const langEn = String(options.lang || manifest.language || 'zh').toLowerCase() === 'en'
  const allowSplit = options.allowSplit !== false

  const working = {
    ...manifest,
    ...(manifest.brand ? { brand: { ...manifest.brand } } : {}),
    slides: manifest.slides.map((s) => (s && typeof s === 'object' ? { ...s, ...(s.chart ? { chart: { ...s.chart } } : {}) } : s)),
  }

  let check = checkFn(working)
  const initialWarnings = check.warningCount ?? 0
  const repairs = []
  let passes = 0

  for (let pass = 1; pass <= maxPasses; pass += 1) {
    if (!Array.isArray(check.issues) || check.issues.length === 0) break
    let changedThisPass = false

    // 1. 画布级配色修复（SLOP-07 刺眼饱和底色 / low-contrast WCAG < 4.5:1）
    const hasSatCanvas = check.issues.some((iss) => iss.code === 'saturated-canvas')
    const hasLowContrast = check.issues.some((iss) => iss.code === 'low-contrast')
    if (hasSatCanvas && working.brand?.backgroundColor) {
      const hsl = hexToHsl(working.brand.backgroundColor)
      const lum = relativeLuminance(working.brand.backgroundColor)
      if (hsl.s > 0.38 && lum > 0.06 && lum < 0.80) {
        const oldBg = working.brand.backgroundColor
        working.brand.backgroundColor = '#F8FAFC'
        if (!working.brand.textColor || contrastRatioHex('#F8FAFC', working.brand.textColor) < 4.5) {
          working.brand.textColor = '#0F172A'
        }
        repairs.push({ pass, slide: 1, code: 'saturated-canvas', action: 'sanitize-canvas', detail: `${oldBg} → #F8FAFC` })
        changedThisPass = true
      }
    }
    if (hasLowContrast && working.brand) {
      const bg = working.brand.backgroundColor || '#FFFFFF'
      const fg = working.brand.textColor || '#0F172A'
      if (contrastRatioHex(bg, fg) < 4.5) {
        const darkCanvas = relativeLuminance(bg) < 0.28
        const nextInk = darkCanvas ? '#F8FAFC' : '#0F172A'
        working.brand.textColor = nextInk
        repairs.push({ pass, slide: 1, code: 'low-contrast', action: 'fix-wcag-ink', detail: `${fg} → ${nextInk} on ${bg}` })
        changedThisPass = true
      }
    }

    // 2. 逐页修复（按页序收集，支持安全拆页）
    const issuesBySlide = new Map()
    for (const iss of check.issues) {
      const idx = Math.max(0, (iss.slide || 1) - 1)
      if (!issuesBySlide.has(idx)) issuesBySlide.set(idx, [])
      issuesBySlide.get(idx).push(iss)
    }

    const nextSlides = []
    let contentOrd = 0
    const needsKickerSweep = check.issues.some((iss) => iss.code === 'repetitive-kicker')

    for (let i = 0; i < working.slides.length; i += 1) {
      const slide = working.slides[i]
      if (!slide || typeof slide !== 'object') {
        nextSlides.push(slide)
        continue
      }
      const lay = slide.layout || 'bullets'
      const isFraming = ['cover', 'section', 'closing', 'agenda', 'quote'].includes(lay)
      if (!isFraming) contentOrd += 1

      const slideIssues = issuesBySlide.get(i) || []
      const codes = new Set(slideIssues.map((x) => x.code))
      const bound = slideHasDataBinding(slide)

      // 2a. SLOP-01 空洞标题二次救援
      if (codes.has('weak-topic-title') && !bound) {
        const rescued = synthesizeActionTitle(slide, langEn)
        if (rescued && rescued !== slide.title) {
          repairs.push({ pass, slide: i + 1, code: 'weak-topic-title', action: 'synthesize-action-title', detail: `${slide.title} → ${rescued}` })
          slide.title = rescued
          changedThisPass = true
        }
      }

      // 2b. SLOP-02 机械重复 kicker 清理
      if (needsKickerSweep && !isFraming && /^(?:要点|Key\s*point)(?:\s*\d+)?$/i.test(String(slide.kicker ?? '').trim())) {
        const nextKicker = synthesizeKicker(slide, contentOrd, langEn)
        repairs.push({ pass, slide: i + 1, code: 'repetitive-kicker', action: 'repair-kicker', detail: `${slide.kicker} → ${nextKicker}` })
        slide.kicker = nextKicker
        changedThisPass = true
      }

      // 2c. 标题溢出无损拆分到 subtitle/takeaway
      if (codes.has('title-overflow') && !bound) {
        const limit = ['cover', 'closing', 'statement', 'quote', 'section'].includes(lay) ? 39 : 33
        if (splitOverflowTitle(slide, limit, langEn)) {
          repairs.push({ pass, slide: i + 1, code: 'title-overflow', action: 'split-title-to-subtitle', detail: slide.title })
          changedThisPass = true
        }
      }

      // 2d. SLOP-05 碎块饼图 (>6 扇区) → 横向条形图 bar（100% 无损，关闭不适用于分类项的增长飞线）
      if (codes.has('chart-spaghetti') && slide.chart && ['pie', 'doughnut'].includes(slide.chart.kind)) {
        const prevKind = slide.chart.kind
        slide.chart = { ...slide.chart, kind: 'bar', highlight: slide.chart.highlight ?? 'max', spotlight: true, showGrowthCallout: false }
        repairs.push({ pass, slide: i + 1, code: 'chart-spaghetti', action: 'promote-pie-to-bar', detail: `${prevKind} → bar` })
        changedThisPass = true
      }

      // 2e. 图表横轴拥挤 → 转为横向 bar（100% 无损）
      if (codes.has('chart-density') && slide.chart && ['column', 'stacked-column'].includes(slide.chart.kind || 'column')) {
        const prevKind = slide.chart.kind || 'column'
        const nextKind = prevKind === 'stacked-column' ? 'stacked-bar' : 'bar'
        slide.chart = { ...slide.chart, kind: nextKind }
        repairs.push({ pass, slide: i + 1, code: 'chart-density', action: 'flip-to-horizontal-bar', detail: `${prevKind} → ${nextKind}` })
        changedThisPass = true
      }

      // 2f. SLOP-12 单系列柱/条图自动补聚光灯焦点
      if (codes.has('chart-emphasis-missing') && slide.chart) {
        slide.chart = { ...slide.chart, highlight: 'max', spotlight: true }
        repairs.push({ pass, slide: i + 1, code: 'chart-emphasis-missing', action: 'add-chart-spotlight', detail: 'highlight=max, spotlight=true' })
        changedThisPass = true
      }

      // 2g. SLOP-10 图表页缺结论自动补齐 grounded takeaway
      if (codes.has('missing-chart-callout') && slide.chart && !bound) {
        const tk = synthesizeGroundedTakeaway(slide, langEn)
        if (tk) {
          slide.takeaway = tk
          repairs.push({ pass, slide: i + 1, code: 'missing-chart-callout', action: 'synthesize-chart-takeaway', detail: tk.slice(0, 48) })
          changedThisPass = true
        }
      }

      // 2h. SLOP-09 空洞收尾页兜底
      if (codes.has('bare-closing') && lay === 'closing' && !bound) {
        const takeaways = working.slides
          .filter((s) => s && s !== slide && !['cover', 'section', 'closing', 'agenda'].includes(s.layout))
          .slice(-3)
          .map((s) => String(s.takeaway || s.title || '').trim())
          .filter(Boolean)
        if (takeaways.length > 0) {
          slide.title = langEn ? 'Thank You · Key Decisions & Next Steps' : '感谢聆听 · 核心结论与下一步行动'
          slide.variant = slide.variant || 'cta-cards'
          slide.subtitle = langEn ? 'Confirm owners and milestone dates to lock execution' : '请重点确认以下核心推进方向与交付节点'
          slide.items = takeaways.map((tkText, ti) => ({
            tag: `0${ti + 1}`,
            title: truncateCleanly(tkText, langEn ? 22 : 18),
            text: tkText.length > 18 ? truncateCleanly(tkText, 48) : (langEn ? 'Confirm owner & target date' : '确认责任人与落实节点'),
            status: ti === 0 ? 'accent' : 'positive',
          }))
          repairs.push({ pass, slide: i + 1, code: 'bare-closing', action: 'rescue-closing-cta', detail: 'closing[cta-cards]' })
          changedThisPass = true
        }
      }

      // 2i. SLOP-04 组件数量越界自动无损拆页（kpi > 4 / cards|process > 6 / matrix != 4）
      if (codes.has('card-count-overflow') && Array.isArray(slide.items) && !bound) {
        if (lay === 'matrix' && slide.items.length !== 4) {
          slide.layout = 'cards'
          slide.variant = slide.items.length <= 4 ? 'bento-hero' : 'frameless'
          repairs.push({ pass, slide: i + 1, code: 'card-count-overflow', action: 'matrix-to-cards', detail: `matrix(${slide.items.length}) → cards` })
          changedThisPass = true
        } else if (allowSplit && nextSlides.length + (working.slides.length - i) < maxSlides) {
          const cap = lay === 'kpi' ? 4 : 6
          if (slide.items.length > cap) {
            const mid = Math.ceil(slide.items.length / 2)
            const partA = slide.items.slice(0, mid)
            const partB = slide.items.slice(mid)
            const slideA = { ...slide, items: partA }
            let contTitle = `${slide.title}${langEn ? ' (Cont.)' : '（续）'}`
            if (lay === 'kpi' && partB[0]?.title && partB[0]?.value) {
              const prefix = String(slide.title ?? '').split(/[：:]/)[0].trim()
              const candidate = langEn
                ? `${prefix} (Cont.): ${partB[0].title} ${partB[0].value}${partB[0].delta ? ' (' + partB[0].delta + ')' : ''}`
                : `${prefix}（续）：${partB[0].title}达 ${partB[0].value}${partB[0].delta ? ' (' + partB[0].delta + ')' : ''}`
              if (measureWidth(candidate) <= 32) contTitle = candidate
            }
            const slideB = makeSplitSlideCopy(slide, contTitle, {
              items: partB,
              ...(lay === 'cards' ? { variant: partB.length <= 4 ? 'frameless' : 'pillars' } : {}),
            })
            nextSlides.push(slideA, slideB)
            repairs.push({ pass, slide: i + 1, code: 'card-count-overflow', action: 'split-overflow-items', detail: `${lay}(${slide.items.length}) → ${partA.length}+${partB.length}` })
            changedThisPass = true
            continue
          }
        }
      }

      // 2j. SLOP-06 超长表格 (> 9 行) 重复表头无损分页
      if (codes.has('table-overload') && lay === 'table' && Array.isArray(slide.rows) && slide.rows.length > 9 && !bound && allowSplit) {
        const header = slide.rows[0]
        const dataRows = slide.rows.slice(1)
        const chunks = []
        for (let r = 0; r < dataRows.length; r += 8) {
          chunks.push([header, ...dataRows.slice(r, r + 8)])
        }
        if (chunks.length > 1 && nextSlides.length + chunks.length + (working.slides.length - i - 1) <= maxSlides) {
          chunks.forEach((chunkRows, ci) => {
            const sCopy = ci === 0
              ? { ...slide, rows: chunkRows }
              : makeSplitSlideCopy(slide, `${slide.title}${langEn ? ` (${ci + 1}/${chunks.length})` : `（续 ${ci + 1}/${chunks.length}）`}`, { rows: chunkRows, notes: undefined })
            nextSlides.push(sCopy)
          })
          repairs.push({ pass, slide: i + 1, code: 'table-overload', action: 'paginate-table', detail: `${slide.rows.length} rows → ${chunks.length} slides` })
          changedThisPass = true
          continue
        }
      }

      // 2k. SLOP-03 文字墙 / dense-bullets / body-overflow 自动无损拆页并结构化
      if ((codes.has('wall-of-text') || codes.has('dense-bullets') || codes.has('body-overflow')) && Array.isArray(slide.bullets) && slide.bullets.length > 0 && !slide.image && !slide.chart && !bound) {
        const expanded = splitLongBulletStrings(slide.bullets)
        if (expanded.length >= 2 && allowSplit && nextSlides.length + (working.slides.length - i) < maxSlides) {
          const mid = Math.ceil(expanded.length / 2)
          const toItems = (arr, offset) => arr.map((b, bi) => {
            const { title: t, text: d } = splitLead(b)
            return { tag: String(offset + bi + 1).padStart(2, '0'), title: t, ...(d ? { text: d } : {}), ...(bi === 0 ? { status: 'accent' } : {}) }
          })
          const partA = expanded.slice(0, mid)
          const partB = expanded.slice(mid)
          const slideA = { ...slide, layout: 'cards', variant: partA.length <= 4 ? 'bento-hero' : 'frameless', items: toItems(partA, 0) }
          delete slideA.bullets
          const slideB = makeSplitSlideCopy(slide, `${slide.title}${langEn ? ' (Cont.)' : '（续）'}`, {
            layout: partB.length <= 4 ? 'callout' : 'cards',
            variant: partB.length <= 4 ? 'takeaways' : 'frameless',
            items: toItems(partB, mid),
          })
          delete slideB.bullets
          nextSlides.push(slideA, slideB)
          repairs.push({ pass, slide: i + 1, code: codes.has('wall-of-text') ? 'wall-of-text' : 'body-overflow', action: 'split-text-wall', detail: `bullets(${slide.bullets.length}) → cards(${partA.length})+${slideB.layout}(${partB.length})` })
          changedThisPass = true
          continue
        }
      }

      nextSlides.push(slide)
    }

    // 3. SLOP-11 连续等宽方框卡片疲劳破冰
    if (check.issues.some((iss) => iss.code === 'visual-card-monotony')) {
      let run = 0
      const altVariants = ['bento-hero', 'frameless', 'bento-hero']
      let altIdx = 0
      for (let i = 0; i < nextSlides.length; i += 1) {
        const s = nextSlides[i]
        const lay = s?.layout || 'bullets'
        const v = String(s?.variant || '').toLowerCase()
        const isPlainBoxed = (lay === 'cards' && (!v || v === 'pillars')) || (lay === 'kpi' && (!v || v === 'grid'))
        if (isPlainBoxed) {
          run += 1
          if (run >= 2) {
            if (lay === 'kpi') {
              s.variant = 'spotlight'
            } else {
              const cnt = Array.isArray(s.items) ? s.items.length : 3
              const pick = altVariants[altIdx++ % altVariants.length]
              s.variant = pick === 'bento-hero' && (cnt < 2 || cnt > 4) ? 'frameless' : pick
            }
            repairs.push({ pass, slide: i + 1, code: 'visual-card-monotony', action: 'vary-card-variant', detail: `${lay}[${s.variant}]` })
            changedThisPass = true
            run = 0
          }
        } else {
          run = 0
        }
      }
    }

    working.slides = nextSlides
    passes = pass
    if (!changedThisPass) break
    check = checkFn(working)
  }

  const finalWarnings = check.warningCount ?? 0
  return {
    manifest: working,
    report: {
      passes,
      initialWarnings,
      finalWarnings,
      fixedCount: Math.max(0, initialWarnings - finalWarnings),
      repairs,
    },
  }
}

/**
 * 将弱模型生成的平庸幻灯片数组进行确定性无损升维（Auto-Upgrader v2）。
 *
 * @param {Array<object>} rawSlides
 * @param {{ exemplar?: object|null, lang?: string, allowSplit?: boolean, rescueTitles?: boolean, alignOrder?: boolean }} [options]
 * @returns {{ slides: Array<object>, report: { applied: boolean, exemplarId: string|null, resequenced: boolean, upgrades: Array<object> } }}
 */
export function upgradeWeakDeck(rawSlides, options = {}) {
  if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
    return { slides: rawSlides || [], report: { applied: false, exemplarId: null, resequenced: false, upgrades: [] } }
  }
  const exemplar = options.exemplar || null
  const langEn = String(options.lang || 'zh').toLowerCase() === 'en'
  const allowSplit = options.allowSplit !== false
  const rescueTitles = options.rescueTitles !== false
  const alignOrder = options.alignOrder === true
  const upgrades = []

  let working = rawSlides.map((s) => (s && typeof s === 'object' ? { ...s } : s))

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

  // --- PASS 1.5: 标杆叙事弧线重排（alignOrder: true 时激活） ---
  let resequenced = false
  if (alignOrder && working.length >= 4) {
    const seq = resequenceSlidesToExemplar(working, exemplar)
    if (seq.orderChanged) {
      working = seq.slides
      resequenced = true
      upgrades.push({
        slide: 1,
        action: 'resequence-exemplar',
        from: 'raw-order',
        to: exemplar?.id || 'narrative-arc',
        reason: `re-aligned ${seq.movedCount} slides to exemplar narrative cadence`,
      })
    }
  }

  // --- PASS 2: Exemplar 语义槽位亲和投影 + 相邻防撞节奏 ---
  if (exemplar && Array.isArray(exemplar.slots) && exemplar.slots.length > 0) {
    const coverSlot = exemplar.slots.find((s) => s.layout === 'cover')
    const closingSlot = exemplar.slots.find((s) => s.layout === 'closing')
    const kpiSlot = exemplar.slots.find((s) => s.layout === 'kpi')
    const tableSlot = exemplar.slots.find((s) => s.layout === 'table' && s.tableStyle)
    const proseSlots = exemplar.slots.filter((s) => ['cards', 'comparison', 'process', 'callout'].includes(s.layout))
    const proseFallbackLayouts = [
      ...proseSlots.map((s) => ({ layout: s.layout, variant: s.variant || '' })),
      { layout: 'cards', variant: 'bento-hero' },
      { layout: 'comparison', variant: 'issue-action' },
      { layout: 'cards', variant: 'frameless' },
      { layout: 'process', variant: 'steps' },
      { layout: 'callout', variant: 'takeaways' },
    ]
    let fallbackCursor = 0
    let prevVisualSig = ''

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
      } else if (slide.layout === 'kpi' && kpiSlot && !slide.variant && kpiSlot.variant) {
        slide.variant = kpiSlot.variant
      } else if (slide.layout === 'table' && tableSlot && !slide.tableStyle && tableSlot.tableStyle) {
        slide.tableStyle = tableSlot.tableStyle
      } else if (slide.layout === 'bullets' && Array.isArray(slide.bullets) && slide.bullets.length >= 2 && slide.bullets.length <= 6 && !slide.image && !slide.chart) {
        const aligned = exemplar.slots[Math.min(idx, exemplar.slots.length - 1)]
        let pick = aligned && ['cards', 'comparison', 'process', 'callout'].includes(aligned.layout)
          ? { layout: aligned.layout, variant: aligned.variant || '' }
          : { ...proseFallbackLayouts[fallbackCursor++ % proseFallbackLayouts.length] }
        if (pick.layout === 'cards' && pick.variant === 'bento-hero' && (slide.bullets.length < 2 || slide.bullets.length > 4)) {
          pick = { layout: 'cards', variant: 'frameless' }
        }
        // 避免与上一页视觉撞车
        const sig = `${pick.layout}:${pick.variant}`
        if (sig === prevVisualSig) {
          const alt = proseFallbackLayouts.find((cand) => {
            const cSig = `${cand.layout}:${cand.variant}`
            if (cSig === prevVisualSig) return false
            if (cand.layout === 'cards' && cand.variant === 'bento-hero' && (slide.bullets.length < 2 || slide.bullets.length > 4)) return false
            return true
          })
          if (alt) pick = { ...alt }
        }
        slide.layout = pick.layout
        if (pick.variant) slide.variant = pick.variant
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
          to: pick.variant ? `${pick.layout}[${pick.variant}]` : pick.layout,
          reason: `aligned to exemplar ${exemplar.id}`,
        })
      }
      prevVisualSig = `${slide.layout || 'bullets'}:${slide.variant || ''}`
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
      slide.bullets = slide.bullets.map(autoBoldBullet)

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

  // --- PASS 4: 证据锚定 Action Title 救援 + Grounded Takeaway + Kicker 叙事脉络 + 空洞封底补全 ---
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
        const rescued = synthesizeActionTitle(slide, langEn)
        if (rescued) {
          upgrades.push({ slide: i + 1, action: 'rescue-action-title', from: slide.title, to: rescued, reason: 'SLOP-01 weak topic label' })
          slide.title = rescued
        }
      }
      const groundedTk = synthesizeGroundedTakeaway(slide, langEn)
      if (groundedTk) {
        slide.takeaway = groundedTk
        upgrades.push({ slide: i + 1, action: 'synthesize-takeaway', from: '(empty)', to: groundedTk.slice(0, 48), reason: 'SLOP-10 grounded insight takeaway' })
      }
      const curKicker = String(slide.kicker ?? '').trim()
      if (shouldRepairKickers && (!curKicker || /^(?:要点|Key\s*point)(?:\s*\d+)?$/i.test(curKicker))) {
        slide.kicker = synthesizeKicker(slide, contentOrd, langEn)
        upgrades.push({ slide: i + 1, action: 'repair-kicker', from: curKicker || '(empty)', to: slide.kicker, reason: 'SLOP-02 narrative breadcrumb' })
      }
    }

    if (lay === 'closing' && BARE_CLOSING_RE.test(String(slide.title ?? '').trim())) {
      const hasDetail = Boolean(String(slide.subtitle ?? '').trim() || (slide.bullets?.length > 0) || (slide.items?.length > 0))
      if (!hasDetail) {
        const seenRoots = new Set()
        const cards = []
        for (const s of [...finalSlides].reverse()) {
          if (!s || s === slide || ['cover', 'section', 'closing', 'agenda'].includes(s.layout)) continue
          const titleRaw = String(s.title || '').trim()
          const tkRaw = String(s.takeaway || '').trim()
          const root = titleRaw.replace(/(?:（续）|\s*\(Cont\.\))$/i, '')
          if (!titleRaw || seenRoots.has(root)) continue
          seenRoots.add(root)
          cards.unshift({ title: titleRaw, text: tkRaw })
          if (cards.length >= 3) break
        }
        if (cards.length > 0) {
          const origTitle = slide.title
          slide.title = langEn ? 'Thank You · Key Decisions & Next Steps' : '感谢聆听 · 核心结论与下一步行动'
          slide.variant = slide.variant || 'cta-cards'
          slide.subtitle = langEn ? 'Confirm owners and milestone dates to lock execution' : '请重点确认以下三项核心推进方向与交付节点'
          slide.items = cards.map((card, ti) => ({
            tag: `0${ti + 1}`,
            title: truncateCleanly(card.title, langEn ? 24 : 20),
            text: card.text ? truncateCleanly(card.text, 52) : (langEn ? 'Confirm owner & target date' : '确认责任人与落实节点'),
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
      resequenced,
      upgradeCount: upgrades.length,
      promotedCount,
      splitCount,
      brokenStreaks,
      rescuedTitles,
      upgrades,
    },
  }
}

/**
 * deck-evidence.mjs —— 零资料深度调研与事实溯源引擎（Evidence Ledger、Storyboard Planner 与 SLOP-13 出处门禁）。
 *
 * 设计边界：
 * - 100% 离线、零新增运行时依赖、绝不在引擎内部发起网络请求（检索由宿主 Agent / dsh-cite 完成）；
 * - 接收宿主 Agent 检索并交叉核验后的结构化 `evidence[]` 证据账本，实现：
 *   1. `[E1]` / `evidenceIds` 自动注入规范左下角 `source` 脚注与演讲者备注 `notes` 完整 URL/口径溯源卡；
 *   2. 可选在封底前自动插入「数据来源与事实核验清单」三线表附录页（`evidenceAppendix: true`）；
 *   3. `SLOP-13` 事实出处静态门禁：拦截悬空引用 `[E99]`、未标注口径的 `unverified`/`conflicting` 证据、
 *      「数据来源：网络整理 / 公开资料」等空洞假出处，以及调研模式下无出处的量化数据页；
 *   4. `buildResearchPlan`：围绕 20 套标杆范本生成 3 轮检索指南、证据缺口诊断与逐页分镜策划表（先策划、再生成）。
 */

import { stripInlineMarkdown } from './deck-layouts.mjs'
import { CURATED_EXEMPLARS, resolveExemplar, matchBestExemplar, getExemplarFewShotSlides } from './deck-exemplars.mjs'

const MAX_EVIDENCE_ITEMS = 60
const CONFIDENCE_SET = new Set(['verified', 'estimated', 'conflicting', 'unverified'])
const INLINE_REF_RE = /\[([Ee]\d{1,3})\]/g
const VAGUE_SOURCE_RE = /^(?:(?:数据|资料|信息)?来源\s*[:：]\s*|sources?\s*[:：]\s*)?(?:网络(?:整理|搜集|公开资料|资料|收集)?|互联网(?:整理|公开资料|资料)?|公开资料(?:整理)?|网上(?:资料|整理)?|综合整理|内部估算|估算|整理自网络|public\s+internet|online\s+sources?|web\s+search|various\s+sources?|internet|google|baidu|ai\s+generated?)[。.\s]*$/i
const QUANT_LAYOUTS = new Set(['kpi', 'chart', 'chart-split', 'waterfall', 'marimekko', 'tam', 'dumbbell', 'heatmap'])

function cleanText(value, maxLen = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLen)
}

function estimateTextWidth(text) {
  let w = 0
  for (const ch of stripInlineMarkdown(String(text ?? ''))) {
    w += /[^\x00-\xff]/.test(ch) ? 1 : 0.55
  }
  return w
}

function trimCellByWidth(text, maxWidth = 17.2) {
  const s = cleanText(text, 160)
  if (!s || estimateTextWidth(s) <= maxWidth) return s
  let out = ''
  let w = 0
  const limit = Math.max(4, maxWidth - 1.1)
  for (const ch of s) {
    const cw = /[^\x00-\xff]/.test(ch) ? 1 : 0.55
    if (w + cw > limit) break
    out += ch
    w += cw
  }
  out = out.replace(/[\s,，、；;：:(\[（【《「『&-]+$/, '')
  // Drop an unclosed opening title/paren fragment if cut mid-phrase (e.g. "GGII《2025" -> "GGII")
  out = out.replace(/[《（(「『【][^》）)」』】]*$/, '').replace(/[\s,，、；;：:&-]+$/, '')
  return (out || s.slice(0, 6)) + '…'
}

function sanitizeHttpUrl(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  try {
    const parsed = new URL(s)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('dsh-ppt：evidence.url 仅支持 http:// 或 https:// 链接：' + s)
    }
    return parsed.toString()
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('dsh-ppt：')) throw err
    throw new Error('dsh-ppt：evidence.url 格式无效：' + s)
  }
}

/**
 * 校验并规范化外部传入的 `evidence[]` 证据账本。
 * @param {Array<object>} rawEvidence
 * @returns {Array<object>}
 */
export function normalizeEvidenceLedger(rawEvidence) {
  if (rawEvidence === undefined || rawEvidence === null) return []
  if (!Array.isArray(rawEvidence)) {
    throw new Error('dsh-ppt：evidence 必须是证据条目数组')
  }
  if (rawEvidence.length > MAX_EVIDENCE_ITEMS) {
    throw new Error(`dsh-ppt：evidence 最多支持 ${MAX_EVIDENCE_ITEMS} 条证据`)
  }
  const seen = new Set()
  const out = []
  for (let i = 0; i < rawEvidence.length; i += 1) {
    const item = rawEvidence[i]
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`dsh-ppt：evidence[${i}] 必须是对象`)
    }
    const rawId = cleanText(item.id || `E${i + 1}`, 24).toUpperCase()
    if (!/^[A-Z][A-Z0-9_-]{0,23}$/.test(rawId)) {
      throw new Error(`dsh-ppt：evidence[${i}].id 无效（请使用如 E1、E2 格式）：${rawId}`)
    }
    if (seen.has(rawId)) {
      throw new Error(`dsh-ppt：evidence 存在重复编号 ${rawId}`)
    }
    seen.add(rawId)

    const claim = cleanText(item.claim ?? item.fact ?? item.summary, 320)
    const source = cleanText(item.source ?? item.publisher ?? item.origin, 160)
    if (!claim) {
      throw new Error(`dsh-ppt：evidence ${rawId} 缺少事实描述 claim`)
    }
    if (!source) {
      throw new Error(`dsh-ppt：evidence ${rawId} 缺少一手出处 source`)
    }
    const date = cleanText(item.date ?? item.year ?? item.period, 40)
    const scope = cleanText(item.scope ?? item.region, 80)
    const url = item.url ? sanitizeHttpUrl(item.url) : ''
    const rawConf = cleanText(item.confidence || 'verified', 24).toLowerCase()
    if (!CONFIDENCE_SET.has(rawConf)) {
      throw new Error(`dsh-ppt：evidence ${rawId} 的 confidence 仅支持 verified / estimated / conflicting / unverified`)
    }
    const note = cleanText(item.note ?? item.caveat, 240)
    out.push({
      id: rawId,
      claim,
      source,
      ...(date ? { date } : {}),
      ...(scope ? { scope } : {}),
      ...(url ? { url } : {}),
      confidence: rawConf,
      ...(note ? { note } : {}),
    })
  }
  return out
}

/**
 * 提取单页显式 `evidenceIds` 与正文内联 `[E1]` 引用编号（去重保序）。
 */
export function extractSlideEvidenceRefs(slide) {
  if (!slide || typeof slide !== 'object') return []
  const refs = []
  const seen = new Set()
  const add = (id) => {
    const norm = String(id ?? '').trim().toUpperCase()
    if (!norm || seen.has(norm)) return
    seen.add(norm)
    refs.push(norm)
  }
  if (Array.isArray(slide.evidenceIds)) {
    for (const id of slide.evidenceIds) add(id)
  }
  const scanText = (val) => {
    if (typeof val !== 'string' || !val.includes('[')) return
    for (const m of val.matchAll(INLINE_REF_RE)) {
      add(m[1])
    }
  }
  scanText(slide.title)
  scanText(slide.subtitle)
  scanText(slide.takeaway)
  scanText(slide.source)
  scanText(slide.text)
  if (Array.isArray(slide.bullets)) slide.bullets.forEach(scanText)
  if (Array.isArray(slide.items)) {
    for (const it of slide.items) {
      if (!it || typeof it !== 'object') continue
      scanText(it.tag); scanText(it.title); scanText(it.value); scanText(it.delta); scanText(it.text)
      if (Array.isArray(it.bullets)) it.bullets.forEach(scanText)
    }
  }
  if (Array.isArray(slide.rows)) {
    for (const row of slide.rows) {
      if (Array.isArray(row)) row.forEach(scanText)
    }
  }
  if (slide.chart?.caption) scanText(slide.chart.caption)
  return refs
}

function formatCompactEvidenceSource(entries, langEn) {
  const parts = entries.slice(0, 2).map((e) => {
    const shortSrc = trimCellByWidth(e.source, 16)
    const dateTag = e.date ? ` (${e.date})` : ''
    return `${shortSrc}${dateTag} [${e.id}]`
  })
  const suffix = entries.length > 2 ? (langEn ? ` +${entries.length - 2} more` : ` 等 ${entries.length} 项`) : ''
  return parts.join(langEn ? '; ' : '；') + suffix
}

function compareEvidenceId(a, b) {
  const ma = /^([A-Z]+)(\d+)$/.exec(String(a?.id || ''))
  const mb = /^([A-Z]+)(\d+)$/.exec(String(b?.id || ''))
  if (ma && mb && ma[1] === mb[1]) return Number(ma[2]) - Number(mb[2])
  return String(a?.id || '').localeCompare(String(b?.id || ''))
}

function confidenceLabel(conf, langEn) {
  const mapZh = { verified: '已核验', estimated: '口径估算', conflicting: '存在口径差异', unverified: '待核实' }
  const mapEn = { verified: 'Verified', estimated: 'Estimated', conflicting: 'Conflicting', unverified: 'Unverified' }
  return (langEn ? mapEn[conf] : mapZh[conf]) || conf
}

function formatNotesProvenanceBlock(entries, langEn) {
  const header = langEn ? '[Evidence Provenance]' : '[证据溯源]'
  const lines = entries.map((e) => {
    const meta = [e.source, e.date, e.scope, confidenceLabel(e.confidence, langEn)].filter(Boolean).join(' · ')
    const urlPart = e.url ? ` | ${e.url}` : ''
    const notePart = e.note ? ` (${e.note})` : ''
    return `- [${e.id}] ${e.claim} — ${meta}${notePart}${urlPart}`
  })
  return `${header}\n${lines.join('\n')}`
}

/**
 * 将核验后的证据账本绑定至幻灯片：
 * - 自动为引用 `[E#]` / `evidenceIds` 的页面注入干净的 `slide.source` 脚注；
 * - 将完整出处、统计口径、核验状态与原始 URL 写入演讲备注 `notes`（提词台随时备查）；
 * - 若 `evidenceAppendix: true`，在封底前自动插入「数据来源与事实核验清单」三线表附录页。
 */
export function applyEvidenceLedgerToSlides(slides, ledger, options = {}) {
  const list = Array.isArray(slides) ? slides : []
  const items = Array.isArray(ledger) ? ledger : []
  if (list.length === 0 || items.length === 0) {
    return { slides: list, citedIds: [], appendixAdded: false }
  }
  const langEn = String(options.lang || 'zh').toLowerCase() === 'en'
  const byId = new Map(items.map((e) => [e.id, e]))
  const citedOrder = []
  const citedSet = new Set()

  const enriched = list.map((rawSlide) => {
    if (!rawSlide || typeof rawSlide !== 'object') return rawSlide
    const refs = extractSlideEvidenceRefs(rawSlide)
    const matched = refs.map((id) => byId.get(id)).filter(Boolean)
    if (matched.length === 0) return rawSlide

    for (const e of matched) {
      if (!citedSet.has(e.id)) {
        citedSet.add(e.id)
        citedOrder.push(e.id)
      }
    }

    const next = { ...rawSlide }
    const existingSource = String(next.source ?? '').trim()
    if (!existingSource || VAGUE_SOURCE_RE.test(existingSource)) {
      next.source = formatCompactEvidenceSource(matched, langEn)
    }

    const existingNotes = String(next.notes ?? '').trim()
    const marker = langEn ? '[Evidence Provenance]' : '[证据溯源]'
    if (!existingNotes.includes(marker)) {
      const provBlock = formatNotesProvenanceBlock(matched, langEn)
      next.notes = existingNotes ? `${existingNotes}\n\n${provBlock}` : provBlock
    }
    return next
  })

  let appendixAdded = false
  if (options.evidenceAppendix === true) {
    const rawAppendixEntries = citedOrder.length > 0
      ? citedOrder.map((id) => byId.get(id)).filter(Boolean)
      : items
    const appendixEntries = [...rawAppendixEntries].sort(compareEvidenceId)
    const maxRows = 6
    const shortStatus = (conf) => {
      if (langEn) return confidenceLabel(conf, true)
      const compactZh = { verified: '已核验', estimated: '口径估算', conflicting: '口径差异', unverified: '待核实' }
      return compactZh[conf] || conf
    }
    const rows = [
      langEn
        ? ['ID', 'Key Verified Fact', 'Primary Source & Year', 'Status']
        : ['编号', '核心核验事实', '一手出处与年份', '核验状态'],
      ...appendixEntries.slice(0, maxRows).map((e) => {
        const datePart = e.date ? ` (${e.date})` : ''
        const srcBudget = Math.max(7.5, 17.4 - estimateTextWidth(datePart))
        const srcWithDate = `${trimCellByWidth(e.source, srcBudget)}${datePart}`
        return [
          trimCellByWidth(e.id, 6),
          trimCellByWidth(e.claim, 16.5),
          srcWithDate,
          trimCellByWidth(shortStatus(e.confidence), 6),
        ]
      }),
    ]
    const verifiedCount = appendixEntries.filter((e) => e.confidence === 'verified').length
    const allVerified = verifiedCount === appendixEntries.length
    const shownCount = Math.min(maxRows, appendixEntries.length)
    const appendixSlide = {
      layout: 'table',
      tableStyle: 'booktabs',
      kicker: langEn ? 'APPENDIX · SOURCES' : '附录 · 事实溯源',
      title: langEn
        ? (allVerified
            ? `All ${appendixEntries.length} Core Claims Verified Against Primary Sources`
            : `Evidence Ledger: ${verifiedCount}/${appendixEntries.length} Core Claims Verified`)
        : (allVerified
            ? `全篇 ${appendixEntries.length} 项核心论据均已完成一手出处核验`
            : `全篇 ${appendixEntries.length} 项核心论据溯源清单（已核验 ${verifiedCount} 项）`),
      rows,
      takeaway: langEn
        ? `${shownCount < appendixEntries.length ? `Showing ${shownCount} of ${appendixEntries.length}` : `All ${appendixEntries.length}`} ledger entries carry publisher & scope metadata; full claims and URLs are preserved in speaker notes and handout.`
        : `${shownCount < appendixEntries.length ? `表内列出 ${shownCount}/${appendixEntries.length} 条` : `共列出全部 ${appendixEntries.length} 条`}核心证据，完整原文链接、口径说明与备注已同步保存在演讲备注与讲义中。`,
      notes: formatNotesProvenanceBlock(appendixEntries, langEn),
    }
    const lastIdx = enriched.length - 1
    if (lastIdx >= 0 && enriched[lastIdx]?.layout === 'closing') {
      enriched.splice(lastIdx, 0, appendixSlide)
    } else {
      enriched.push(appendixSlide)
    }
    appendixAdded = true
  }

  return { slides: enriched, citedIds: citedOrder, appendixAdded }
}

function slideHasNumericClaims(slide) {
  const parts = [
    slide?.title,
    ...(Array.isArray(slide?.bullets) ? slide.bullets : []),
    ...(Array.isArray(slide?.items) ? slide.items.flatMap((it) => [it?.value, it?.delta, it?.before, it?.after, it?.text]) : []),
    ...(Array.isArray(slide?.rows) ? slide.rows.slice(1).flat() : []),
  ]
  if (slide?.chart?.series?.length) return true
  const text = parts.filter((v) => v !== undefined && v !== null).map((v) => stripInlineMarkdown(String(v))).join(' ')
  return /\d+(?:\.\d+)?\s*(?:%|％|亿|万|M|B|GWh|GW|TB|ms|倍|x|元|美元|\$|¥)/i.test(text)
}

/**
 * SLOP-13 事实出处与证据账本静态门禁（100% 确定性、零误报）。
 * 1. 拦截悬空 `[E99]` 引用；
 * 2. 拦截将 `unverified` / `conflicting` 证据当作无说明定论展示；
 * 3. 拦截「数据来源：网络整理 / 公开资料」等空洞占位假出处；
 * 4. 在启用 `manifest.evidence[]` 调研账本时，拦截无出处且未绑定 `[E#]` 的量化数据页。
 */
export function auditEvidenceAndSourcing(manifest) {
  const issues = []
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  if (slides.length === 0) return issues

  const ledger = Array.isArray(manifest?.evidence) ? manifest.evidence : []
  const hasLedger = ledger.length > 0
  const byId = new Map(ledger.map((e) => [String(e?.id ?? '').toUpperCase(), e]))

  const push = (index, code, message, suggestion) => {
    issues.push({
      slide: index + 1,
      slideId: slides[index]?.id,
      severity: 'warning',
      code,
      message,
      suggestion,
    })
  }

  slides.forEach((slide, i) => {
    if (!slide || typeof slide !== 'object') return
    const lay = slide.layout || 'bullets'
    const isFraming = ['cover', 'section', 'closing', 'agenda', 'quote'].includes(lay)
    const rawSource = String(slide.source ?? '').trim()

    // 1. 拦截空洞假出处（「数据来源：网络整理 / 公开资料 / 综合整理」）
    if (rawSource && VAGUE_SOURCE_RE.test(rawSource)) {
      push(
        i,
        'vague-placeholder-source',
        `来源标注「${rawSource}」属于空洞占位词，无法追溯真实发布方与年份（SLOP-13）`,
        '请替换为具体机构、报告名与年份（如「IEA Global EV Outlook 2025」），或标注为「内部口径估算」',
      )
    }

    // 2. 检查 `[E#]` / `evidenceIds` 悬空引用与未核验/冲突状态
    const refs = extractSlideEvidenceRefs(slide)
    if (refs.length > 0) {
      const missing = refs.filter((id) => !byId.has(id))
      if (missing.length > 0) {
        push(
          i,
          'dangling-evidence-ref',
          `页面引用了证据账本中不存在的编号 ${missing.join('、')}（SLOP-13）`,
          '请在 evidence[] 中补齐对应核验条目与原始出处，或移除悬空引用编号',
        )
      }
      const risky = refs.map((id) => byId.get(id)).filter((e) => e && (e.confidence === 'unverified' || e.confidence === 'conflicting'))
      if (risky.length > 0) {
        const rawNotes = String(slide.notes || '')
        const authorNotes = rawNotes.split(/\[(?:证据溯源|Evidence Provenance)\]/)[0] || ''
        const itemText = Array.isArray(slide.items)
          ? slide.items.flatMap((it) => [it?.tag, it?.title, it?.delta, it?.text]).filter(Boolean).join(' ')
          : ''
        const bulletText = Array.isArray(slide.bullets) ? slide.bullets.join(' ') : ''
        const caveatContext = `${slide.title || ''} ${slide.subtitle || ''} ${slide.takeaway || ''} ${slide.source || ''} ${itemText} ${bulletText} ${authorNotes}`
        const hasCaveat = /待核实|未核实|冲突|差异|区间|口径|估算|约\s*\d|caveat|conflict|unverified|range|estimate|approx/i.test(caveatContext)
        if (!hasCaveat) {
          push(
            i,
            'unverified-evidence-claim',
            `页面引用了标记为 ${risky.map((e) => `${e.id}(${e.confidence})`).join('、')} 的证据，但未在页面中说明口径差异或待核实状态（SLOP-13）`,
            '请先完成双源交叉核验，或在页面 takeaway / subtitle / 正文中明确标注数据区间与核验口径',
          )
        }
      }
    }

    // 3. 调研模式（存在 evidence[] 账本时）要求所有高密度量化数据页给出真实出处或绑定 [E#]
    if (hasLedger && !isFraming && QUANT_LAYOUTS.has(lay) && slideHasNumericClaims(slide)) {
      const hasBoundSource = refs.length > 0 || (rawSource.length > 0 && !VAGUE_SOURCE_RE.test(rawSource))
      const hasDataModel = Boolean(manifest?.dataModel)
      if (!hasBoundSource && !hasDataModel) {
        push(
          i,
          'unsourced-research-numbers',
          `${lay} 量化数据页未绑定任何已核验证据 [E#] 且缺少有效 source 出处（SLOP-13）`,
          '请从 evidence[] 绑定对应证据编号（如 evidenceIds: ["E1"]）或填写具体出处与口径；若无确凿数据请改用定性版式',
        )
      }
    }
  })

  return issues
}

/**
 * 在演讲讲义 (.handout.md) 末尾追加结构化「事实核验与证据账本」总表。
 */
export function renderEvidenceHandoutSection(manifest, language) {
  const ledger = Array.isArray(manifest?.evidence) ? manifest.evidence : []
  if (ledger.length === 0) return ''
  const en = (language || manifest?.language || 'zh') === 'en'
  const lines = [
    '',
    `## ${en ? 'Verified Evidence Ledger & Fact-Check Sources' : '事实核验与证据账本（Evidence Ledger）'}`,
    '',
    en
      ? '| ID | Verified Claim | Source | Period / Scope | Confidence | URL |'
      : '| 编号 | 核验事实与数据 | 一手出处 | 时间 / 口径 | 核验状态 | 原文链接 |',
    '| --- | --- | --- | --- | --- | --- |',
  ]
  for (const e of ledger) {
    const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
    const periodScope = [e.date, e.scope].filter(Boolean).join(' · ') || '—'
    const link = e.url ? `[link](${e.url})` : '—'
    lines.push(`| ${esc(e.id)} | ${esc(e.claim)} | ${esc(e.source)} | ${esc(periodScope)} | ${esc(confidenceLabel(e.confidence, en))} | ${link} |`)
  }
  lines.push('')
  return lines.join('\n')
}

/**
 * 零资料调研策划器：给定选题（与可选已搜集的 evidence[] 账本），输出：
 * 1. 最佳匹配的标杆范本（20 套内置 + 工作区已吸收）与配色骨架；
 * 2. 3 轮定向检索清单（官方一手源 → 行业基准竞品 → 最新进展与反方风险）；
 * 3. 逐页分镜策划表（Storyboard）与证据绑定缺口诊断；
 * 4. 可直接展示给用户确认的 Markdown 策划方案（`planMarkdown`）。
 */
export function buildResearchPlan(options = {}) {
  const topic = cleanText(options.topic ?? options.title, 160)
  if (!topic) {
    throw new Error('dsh-ppt：buildResearchPlan 需要提供选题 topic')
  }
  const langEn = String(options.lang || 'zh').toLowerCase() === 'en'
  const workspaceExemplars = options.workspaceExemplars || {}
  const explicitId = cleanText(options.exemplarId || options.exemplar, 64)
  let exemplar = null
  if (explicitId && explicitId.toLowerCase() !== 'auto') {
    exemplar = resolveExemplar(explicitId, workspaceExemplars)
  }
  if (!exemplar) {
    exemplar = matchBestExemplar({
      title: topic,
      content: String(options.context || options.audience || ''),
      persona: options.persona || '',
    }, workspaceExemplars) || CURATED_EXEMPLARS['mckinsey-strategy']
  }

  const evidence = normalizeEvidenceLedger(options.evidence || [])
  const verified = evidence.filter((e) => e.confidence === 'verified')
  const estimated = evidence.filter((e) => e.confidence === 'estimated')
  const conflicting = evidence.filter((e) => e.confidence === 'conflicting')
  const unverified = evidence.filter((e) => e.confidence === 'unverified')

  const researchRounds = langEn
    ? [
        {
          round: 1,
          goal: 'Primary Official & Authoritative Baseline',
          queries: [
            `"${topic}" official report OR whitepaper OR annual report 2025 2026`,
            `"${topic}" government OR regulator OR IEA OR Gartner OR SEC statistics`,
          ],
          requirement: 'Verify headline market size, growth rate, exact year & geographic scope from ≥2 primary sources.',
        },
        {
          round: 2,
          goal: 'Competitive Landscape & Quantitative Benchmarks',
          queries: [
            `"${topic}" leading companies market share benchmark comparison 2025 2026`,
            `"${topic}" cost reduction OR efficiency improvement case study metrics`,
          ],
          requirement: 'Collect comparable before→after metrics, unit economics, and player differentiation.',
        },
        {
          round: 3,
          goal: 'Latest Milestones, Bottlenecks & Counter-Arguments',
          queries: [
            `"${topic}" bottleneck OR risk OR limitation OR failed deployment 2025 2026`,
            `"${topic}" roadmap 2026 2027 commercialization forecast`,
          ],
          requirement: 'Record conflicting estimates honestly; switch any unsourced dimension to qualitative diagrams.',
        },
      ]
    : [
        {
          round: 1,
          goal: '一手官方与权威基线数据（市场/政策/年报）',
          queries: [
            `${topic} 官方报告 OR 白皮书 OR 年报 2025 2026 数据`,
            `${topic} 权威统计 规模 增速 口径 2025 2026`,
          ],
          requirement: '核心规模、增速与关键指标须来自权威一手源并至少双源交叉核验，记清年份与地域口径。',
        },
        {
          round: 2,
          goal: '行业标杆对比与量化实绩（竞品/成本/提效）',
          queries: [
            `${topic} 头部厂商 竞争格局 市场份额 对比 2025 2026`,
            `${topic} 标杆案例 降本 提效 实测指标`,
          ],
          requirement: '收集同口径竞品对比、改造前后量化跃迁与单点经济模型，避免混用不可比口径。',
        },
        {
          round: 3,
          goal: '最新进展、落地瓶颈与反方风险（避免一边倒）',
          queries: [
            `${topic} 痛点 瓶颈 风险 局限 商业化障碍 2025 2026`,
            `${topic} 2026 2027 路线图 发展趋势 商业化节点`,
          ],
          requirement: '如实记录存在口径差异的预测区间；凡查不到确凿数字的维度改用定性图示，严禁编造数字。',
        },
      ]

  let evCursor = 0
  const gaps = []
  const storyboard = (exemplar.slots || []).map((slot) => {
    const needsQuant = QUANT_LAYOUTS.has(slot.layout) || slot.layout === 'table' || slot.layout === 'sankey'
    const assigned = []
    if (needsQuant && evidence.length > 0 && evCursor < evidence.length) {
      assigned.push(evidence[evCursor].id)
      evCursor += 1
      if (slot.layout === 'kpi' && evCursor < evidence.length) {
        assigned.push(evidence[evCursor].id)
        evCursor += 1
      }
    }
    const gap = needsQuant && assigned.length === 0
      ? (langEn
          ? `Needs verified primary data for [${slot.layout}]; search first or downgrade to qualitative cards/comparison.`
          : `本页 [${slot.layout}] 尚缺已核验量化证据，请先检索补充或降级为定性卡片/对比页，严禁编造数字`)
      : ''
    if (gap) gaps.push({ slide: slot.index, role: slot.role, layout: slot.layout, gap })

    return {
      slide: slot.index,
      role: slot.role,
      layout: slot.variant ? `${slot.layout}[${slot.variant}]` : slot.layout,
      needsQuantitativeEvidence: needsQuant,
      boundEvidenceIds: assigned,
      titleGuide: langEn ? (slot.exampleTitleEn || slot.fillGuideEn || slot.role) : (slot.exampleTitleZh || slot.fillGuideZh || slot.role),
      fillGuide: langEn ? (slot.fillGuideEn || '') : (slot.fillGuideZh || ''),
      ...(gap ? { gap } : {}),
    }
  })

  const lines = langEn
    ? [
        `# Research & Storyboard Plan: ${topic}`,
        '',
        `- **Matched Gold Exemplar**: \`${exemplar.id}\` (${exemplar.enName || exemplar.name}) · Theme: \`${exemplar.theme}\` · Chrome: \`${exemplar.chromeStyle}\``,
        `- **Evidence Ledger Status**: ${evidence.length} total (${verified.length} verified, ${estimated.length} estimated, ${conflicting.length} conflicting, ${unverified.length} unverified) · **Data Gaps**: ${gaps.length} quantitative slot(s)`,
        '',
        '## 1. 3-Round Retrieval & Fact-Check Checklist',
        ...researchRounds.map((r) => `- **Round ${r.round} — ${r.goal}**: ${r.requirement} (Queries: \`${r.queries.join('` / `')}\`)`),
        '',
        '## 2. Slide-by-Slide Storyboard Blueprint',
        '| # | Role | Layout | Bound Evidence | Action-Title & Fill Direction |',
        '| --- | --- | --- | --- | --- |',
        ...storyboard.map((s) => `| ${s.slide} | ${s.role} | \`${s.layout}\` | ${s.boundEvidenceIds.length ? s.boundEvidenceIds.map((id) => `[${id}]`).join(' ') : (s.needsQuantitativeEvidence ? '⚠️ Needs data' : 'Qualitative')} | ${s.titleGuide} |`),
        '',
        '## 3. Generation Rule',
        `Once confirmed, call \`ppt_create({ title: ${JSON.stringify(topic)}, exemplar: ${JSON.stringify(exemplar.id)}, alignOrder: true, evidence: [...], evidenceAppendix: true, slides: [...] })\`.`,
      ]
    : [
        `# PPT 调研与分镜策划方案：${topic}`,
        '',
        `- **匹配标杆范本**：\`${exemplar.id}\`（${exemplar.name}）｜推荐主题 \`${exemplar.theme}\` ｜母版骨架 \`${exemplar.chromeStyle}\``,
        `- **证据账本现状**：共 ${evidence.length} 条（已核验 ${verified.length} · 估算 ${estimated.length} · 口径差异 ${conflicting.length} · 待核实 ${unverified.length}）｜**待补量化缺口**：${gaps.length} 页`,
        '',
        '## 一、三轮定向检索与交叉核验清单',
        ...researchRounds.map((r) => `- **第 ${r.round} 轮 · ${r.goal}**：${r.requirement}（参考检索词：\`${r.queries.join('` / `')}\`）`),
        '',
        '## 二、逐页分镜策划表（Storyboard）',
        '| 页码 | 叙事角色 | 推荐版式 | 绑定证据 | 结论标题方向与填空要点 |',
        '| --- | --- | --- | --- | --- |',
        ...storyboard.map((s) => `| P${s.slide} | ${s.role} | \`${s.layout}\` | ${s.boundEvidenceIds.length ? s.boundEvidenceIds.map((id) => `[${id}]`).join(' ') : (s.needsQuantitativeEvidence ? '⚠️ 待补核验数据' : '定性叙事')} | ${s.titleGuide} |`),
        '',
        '## 三、确认后出稿参数',
        `方案确认并补齐证据账本后，调用 \`ppt_create({ title: ${JSON.stringify(topic)}, exemplar: ${JSON.stringify(exemplar.id)}, alignOrder: true, evidence: [...], evidenceAppendix: true, slides: [...] })\` 生成带完整出处与零告警校验的三件套。`,
      ]

  return {
    ok: true,
    topic,
    exemplar: {
      id: exemplar.id,
      name: exemplar.name,
      enName: exemplar.enName || exemplar.name,
      theme: exemplar.theme,
      chromeStyle: exemplar.chromeStyle,
      slotCount: exemplar.slots?.length ?? 0,
    },
    evidenceAudit: {
      total: evidence.length,
      verified: verified.length,
      estimated: estimated.length,
      conflicting: conflicting.length,
      unverified: unverified.length,
      gapCount: gaps.length,
      gaps,
    },
    researchRounds,
    storyboard,
    fewShotSlides: getExemplarFewShotSlides(exemplar.id, langEn ? 'en' : 'zh'),
    planMarkdown: lines.join('\n'),
  }
}

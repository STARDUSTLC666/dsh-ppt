import { basename } from 'node:path'
import { deriveBrandedTheme, resolveTheme, relativeLuminance } from './deck-themes.mjs'
import { renderChartSvg } from './deck-media.mjs'
import { renderMermaidHtml, MERMAID_CSS } from './deck-mermaid.mjs'
import { latexToMathMl } from './deck-math.mjs'
import { renderEvidenceHandoutSection } from './deck-evidence.mjs'

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const VISUAL_DIAGRAM_LAYOUTS = new Set([
  'chart', 'chart-split', 'table', 'gantt', 'architecture', 'harvey',
  'tam', 'org', 'marimekko', 'sankey', 'value-chain', 'swot',
  'process', 'matrix', 'mermaid', 'flowchart', 'sequence',
  'quadrant', 'radar', 'dumbbell', 'heatmap', 'map', 'isometric',
  'issue-tree', 'treemap', 'gauge', 'pricing', 'mockup', 'code',
  'image', 'image-left', 'image-right', 'gallery',
])

function cleanLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function stripMd(value) {
  return cleanLine(String(value ?? '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1'))
}

function collectSlideCopy(slide) {
  const parts = [
    slide?.title,
    slide?.subtitle,
    slide?.takeaway,
    slide?.text,
    ...(Array.isArray(slide?.bullets) ? slide.bullets : []),
  ]
  if (Array.isArray(slide?.items)) {
    for (const it of slide.items) {
      if (!it || typeof it !== 'object') continue
      parts.push(it.tag, it.title, it.value, it.unit, it.delta, it.text)
      if (Array.isArray(it.bullets)) parts.push(...it.bullets)
    }
  }
  return parts.filter(Boolean).map(stripMd).join(' ')
}

function slideCueLines(slide) {
  const cues = []
  if (typeof slide?.takeaway === 'string' && slide.takeaway.trim()) {
    cues.push(cleanLine(slide.takeaway))
  }
  if (Array.isArray(slide?.bullets)) {
    for (const b of slide.bullets.slice(0, 5)) {
      const t = cleanLine(b)
      if (t) cues.push('• ' + t)
    }
  }
  if (cues.length === 0 && Array.isArray(slide?.items)) {
    for (const it of slide.items.slice(0, 5)) {
      if (!it || typeof it !== 'object') continue
      const parts = [it.tag, it.title, it.value, it.text].map(cleanLine).filter(Boolean)
      if (parts.length) cues.push('• ' + parts.join(' — '))
    }
  }
  if (cues.length === 0 && typeof slide?.subtitle === 'string' && slide.subtitle.trim()) {
    cues.push(cleanLine(slide.subtitle))
  }
  return cues.join('\n')
}

function hasVisualComprehensionLoad(slide) {
  if (!slide) return false
  if (slide.chart || (Array.isArray(slide.rows) && slide.rows.length > 0)) return true
  if (typeof slide.mermaid === 'string' && slide.mermaid.trim()) return true
  return VISUAL_DIAGRAM_LAYOUTS.has(slide.layout)
}

/**
 * Deterministic Speaking-Pace Time Budgeter.
 * Computes per-slide seconds at 220 CJK chars/min + 145 EN words/min from `notes`
 * (falling back to slide copy) plus +12s visual comprehension for charts/tables/diagrams.
 * @param {object} manifest
 * @param {number} [targetMinutes]
 */
export function computePaceBudget(manifest, targetMinutes) {
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  const rawTarget = targetMinutes ?? manifest?.targetMinutes
  const explicitTarget = Number.isFinite(Number(rawTarget)) && Number(rawTarget) > 0
    ? Number(rawTarget)
    : undefined

  const rawEntries = slides.map((slide, i) => {
    const rawNotes = cleanLine(slide?.notes)
    const usedNotes = rawNotes.length > 0
    const text = usedNotes ? stripMd(rawNotes) : collectSlideCopy(slide)
    const cjkChars = (text.match(/[\u3400-\u9fff]/g) || []).length
    const latinWords = (text.replace(/[\u3400-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
    const speechSeconds = (cjkChars / 220) * 60 + (latinWords / 145) * 60
    const visualBonusSeconds = hasVisualComprehensionLoad(slide) ? 12 : 0
    const isFraming = ['cover', 'closing', 'section'].includes(slide?.layout)
    const floorSeconds = isFraming ? 15 : 22
    const seconds = Math.max(floorSeconds, Math.round(speechSeconds + visualBonusSeconds))
    return {
      slide: i + 1,
      id: slide?.id,
      title: cleanLine(slide?.title) || `Slide ${i + 1}`,
      layout: slide?.layout || 'bullets',
      source: usedNotes ? 'notes' : 'copy',
      cjkChars,
      latinWords,
      visualBonusSeconds,
      seconds,
      isFraming,
    }
  })

  const estimatedSeconds = rawEntries.reduce((sum, e) => sum + e.seconds, 0)
  const effectiveTargetMinutes = explicitTarget ?? Math.max(1, Math.round(estimatedSeconds / 60))
  const targetSeconds = Math.round(effectiveTargetMinutes * 60)
  const slideCount = Math.max(1, slides.length)
  const targetSliceSeconds = targetSeconds / slideCount
  const scaleFactor = estimatedSeconds > 0 ? targetSeconds / estimatedSeconds : 1

  const overBudgetSlides = []
  const underBudgetSlides = []

  const perSlide = rawEntries.map((entry) => {
    const recommendedSeconds = explicitTarget
      ? Math.max(entry.isFraming ? 12 : 15, Math.round(entry.seconds * scaleFactor))
      : entry.seconds
    let status = 'on-track'
    let reason = ''
    if (entry.seconds > 150 || (explicitTarget && entry.seconds > targetSliceSeconds * 1.45)) {
      status = 'over-budget'
      reason = entry.seconds > 150 ? 'exceeds 150s single-slide cap' : 'exceeds 1.45x target slice'
      overBudgetSlides.push(entry.slide)
    } else if (!entry.isFraming && explicitTarget && entry.seconds < targetSliceSeconds * 0.55) {
      status = 'under-budget'
      reason = 'below 0.55x target slice'
      underBudgetSlides.push(entry.slide)
    }
    return {
      ...entry,
      recommendedSeconds,
      minutes: Math.round((entry.seconds / 60) * 10) / 10,
      status,
      ...(reason ? { reason } : {}),
    }
  })

  const estimatedMinutes = Math.round((estimatedSeconds / 60) * 10) / 10
  const deltaSeconds = estimatedSeconds - targetSeconds
  const deckStatus = explicitTarget
    ? (estimatedSeconds > targetSeconds * 1.15 || overBudgetSlides.length > 0
      ? 'over-budget'
      : (estimatedSeconds < targetSeconds * 0.65 ? 'under-budget' : 'on-track'))
    : (overBudgetSlides.length > 0 ? 'over-budget' : 'on-track')

  return {
    targetMinutes: effectiveTargetMinutes,
    explicitTarget: Boolean(explicitTarget),
    targetSeconds,
    estimatedSeconds,
    estimatedMinutes,
    deltaSeconds,
    status: deckStatus,
    overBudgetSlides,
    underBudgetSlides,
    slides: perSlide,
  }
}

function fmtSeconds(totalSec) {
  const s = Math.max(0, Math.round(Number(totalSec) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0')
}

/**
 * Render a complete structured Speaker Handout & Verbatim Teleprompter Markdown document.
 * @param {object} manifest
 * @param {string} [language]
 */
export function renderHandoutMarkdown(manifest, language) {
  const lang = language || manifest?.language || 'zh'
  const en = lang === 'en'
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  const pace = computePaceBudget(manifest)
  const title = cleanLine(manifest?.title) || (en ? 'Presentation Handout' : '演示文稿讲义')
  const statusLabel = (st) => {
    if (st === 'over-budget') return en ? 'OVER-BUDGET' : '超预算'
    if (st === 'under-budget') return en ? 'UNDER-BUDGET' : '偏短'
    return en ? 'ON-TRACK' : '适中'
  }

  const lines = [
    `# ${title} — ${en ? 'Speaker Handout & Script' : '演讲者讲义与逐页手稿'}`,
    '',
    `## ${en ? 'Executive Overview' : '演示概览'}`,
    `- **${en ? 'Theme' : '视觉主题'}**: \`${cleanLine(manifest?.theme || 'consulting')}\``,
    `- **${en ? 'Slides' : '总页数'}**: ${slides.length}`,
    `- **${en ? 'Estimated Speaking Time' : '预计演讲时长'}**: ~${pace.estimatedMinutes} ${en ? 'min' : '分钟'} (${fmtSeconds(pace.estimatedSeconds)})${pace.explicitTarget ? ` · ${en ? 'Target' : '目标'}: ${pace.targetMinutes} ${en ? 'min' : '分钟'} [${statusLabel(pace.status)}]` : ''}`,
    ...(pace.overBudgetSlides.length > 0
      ? [`- **${en ? 'Over-Budget Slides' : '超预算警告页'}**: ${pace.overBudgetSlides.map(n => `#${n}`).join(', ')}`]
      : []),
    '',
    '---',
    '',
  ]

  slides.forEach((slide, idx) => {
    const slideTitle = cleanLine(slide?.title) || (en ? `Slide ${idx + 1}` : `第 ${idx + 1} 页`)
    const budget = pace.slides[idx] || { seconds: 45, minutes: 0.8, status: 'on-track' }
    lines.push(`## ${en ? `Slide ${idx + 1}` : `第 ${idx + 1} 页`} · ${slideTitle}`)
    const cleanKicker = cleanLine(slide?.kicker)
    const meta = [
      `**${en ? 'Layout' : '版式'}**: \`${slide?.layout || 'bullets'}${slide?.variant ? `[${slide.variant}]` : ''}\``,
      (cleanKicker && cleanKicker !== slideTitle) ? `**${en ? 'Section' : '章节'}**: ${cleanKicker}` : '',
      `**${en ? 'Pace' : '建议时长'}**: ${fmtSeconds(budget.seconds)} (~${budget.minutes} ${en ? 'min' : '分钟'} · ${statusLabel(budget.status)})`,
    ].filter(Boolean)
    lines.push(meta.join(' · '))
    lines.push('')

    if (slide?.subtitle) {
      lines.push(`_${cleanLine(slide.subtitle)}_`)
      lines.push('')
    }

    if (slide?.formula) {
      lines.push(`$$${String(slide.formula).trim()}$$`)
      lines.push('')
    }

    if (slide?.mermaid) {
      lines.push('```mermaid')
      lines.push(String(slide.mermaid).trim())
      lines.push('```')
      lines.push('')
    }

    if (Array.isArray(slide?.items) && slide.items.length > 0) {
      lines.push(`### ${en ? 'Key Metrics & Structured Items' : '核心指标与结构要素'}`)
      for (const it of slide.items) {
        if (!it || typeof it !== 'object') continue
        const head = [it.tag, it.title].map(cleanLine).filter(Boolean).join(' · ')
        const val = it.value !== undefined && it.value !== '' ? ` **${cleanLine(it.value)}${it.unit ? cleanLine(it.unit) : ''}**` : ''
        const delta = it.delta ? ` (${cleanLine(it.delta)})` : ''
        const body = it.text ? ` — ${cleanLine(it.text)}` : ''
        lines.push(`- ${head || (en ? 'Item' : '条目')}${val}${delta}${body}`)
        if (Array.isArray(it.bullets)) {
          for (const sub of it.bullets) lines.push(`  - ${cleanLine(sub)}`)
        }
      }
      lines.push('')
    }

    if (Array.isArray(slide?.rows) && slide.rows.length > 0) {
      lines.push(`### ${en ? 'Data Table' : '核心数据表'}`)
      const header = slide.rows[0].map((c) => cleanLine(c).replace(/\|/g, '\\|'))
      lines.push(`| ${header.join(' | ')} |`)
      lines.push(`| ${header.map(() => '---').join(' | ')} |`)
      for (const r of slide.rows.slice(1)) {
        const cells = header.map((_, ci) => cleanLine(r?.[ci] ?? '').replace(/\|/g, '\\|'))
        lines.push(`| ${cells.join(' | ')} |`)
      }
      lines.push('')
    }

    if (slide?.chart && Array.isArray(slide.chart.series) && slide.chart.series.length > 0) {
      lines.push(`### ${en ? 'Chart Data' : '图表数据'} (${slide.chart.kind || 'column'})`)
      const cats = Array.isArray(slide.chart.categories) ? slide.chart.categories : []
      for (const s of slide.chart.series) {
        const pairs = (s.values || []).map((v, i) => `${cats[i] ?? i + 1}: ${v}`).join(', ')
        lines.push(`- **${cleanLine(s.name || 'Series')}**: ${pairs}`)
      }
      lines.push('')
    }

    if (Array.isArray(slide?.bullets) && slide.bullets.length > 0) {
      lines.push(`### ${en ? 'Slide Points' : '页面要点'}`)
      for (const b of slide.bullets) {
        const t = cleanLine(b)
        if (t) lines.push(`- ${t}`)
      }
      lines.push('')
    }

    if (slide?.takeaway) {
      lines.push(`> **${en ? 'Takeaway' : '核心结论'}**: ${cleanLine(slide.takeaway)}`)
      lines.push('')
    }

    if (slide?.source) {
      lines.push(`_${en ? 'Source' : '数据来源'}: ${cleanLine(slide.source)}_`)
      lines.push('')
    }

    const script = cleanLine(slide?.notes)
      ? String(slide.notes).trim()
      : slideCueLines(slide) || (en ? '(Opening / transition slide — pause 2s and introduce next section.)' : '（过渡页 — 停顿 2 秒，引导进入下一章节。）')
    lines.push(`### ${en ? 'Speaker Script' : '演讲逐字稿 / 提词参考'}`)
    lines.push(script)
    lines.push('')
    lines.push('---')
    lines.push('')
  })

  const evidenceSection = renderEvidenceHandoutSection(manifest, lang)
  if (evidenceSection) lines.push(evidenceSection)

  return lines.join('\n')
}

function safeBrandedTheme(manifest) {
  try {
    return deriveBrandedTheme(manifest?.theme || 'consulting', manifest?.brand)
  } catch {
    return resolveTheme('consulting')
  }
}

function renderOnePagerVisualHtml(slide, theme, en) {
  const layout = slide.layout || 'bullets'
  if (slide.chart) {
    let svg = ''
    try {
      svg = renderChartSvg(slide.chart, theme)
    } catch {
      svg = ''
    }
    const items = Array.isArray(slide.items) ? slide.items.slice(0, 3) : []
    return `
      <div class="op-vis-card">
        <div class="op-vis-head"><span class="op-badge">${escape(slide.chart.kind || 'chart')}</span><h4>${escape(stripMd(slide.title))}</h4></div>
        ${svg ? `<div class="op-chart-svg">${svg}</div>` : ''}
        ${items.length ? `<div class="op-mini-notes">${items.map(it => `<div><strong>${escape(stripMd(it.title || it.tag || ''))}</strong> ${escape(stripMd(it.text || ''))}</div>`).join('')}</div>` : ''}
        ${slide.takeaway ? `<p class="op-takeaway">▸ ${escape(stripMd(slide.takeaway))}</p>` : ''}
        ${slide.source ? `<p class="op-source">${escape(stripMd(slide.source))}</p>` : ''}
      </div>`
  }

  if (layout === 'sankey') {
    const flows = (Array.isArray(slide.items) && slide.items.length
      ? slide.items.map(it => `${stripMd(it.tag || '')} ──(${stripMd((it.value ?? '') + (it.unit ?? ''))})──▶ ${stripMd(it.title || '')}`)
      : (Array.isArray(slide.bullets) ? slide.bullets.map(stripMd) : [])).slice(0, 6)
    return `
      <div class="op-vis-card">
        <div class="op-vis-head"><span class="op-badge">SANKEY</span><h4>${escape(stripMd(slide.title))}</h4></div>
        <ul class="op-flow-list">${flows.map(f => `<li>${escape(f)}</li>`).join('')}</ul>
        ${slide.takeaway ? `<p class="op-takeaway">▸ ${escape(stripMd(slide.takeaway))}</p>` : ''}
      </div>`
  }

  if (layout === 'gantt') {
    const cols = Array.isArray(slide.columns) && slide.columns.length ? slide.columns : ['Q1', 'Q2', 'Q3', 'Q4']
    const items = (Array.isArray(slide.items) ? slide.items : []).slice(0, 6)
    return `
      <div class="op-vis-card">
        <div class="op-vis-head"><span class="op-badge">GANTT</span><h4>${escape(stripMd(slide.title))}</h4></div>
        <div class="op-gantt-list">${items.map(it => {
          const start = Math.max(0, Number(it.start ?? 0))
          const span = Math.max(0.4, Number(it.span ?? 1))
          const left = Math.min(90, (start / Math.max(1, cols.length)) * 100).toFixed(1)
          const width = Math.min(100 - Number(left), (span / Math.max(1, cols.length)) * 100).toFixed(1)
          return `<div class="op-gantt-row"><span class="op-gantt-lbl">${escape(stripMd(it.title || it.tag || ''))}</span><div class="op-gantt-track"><span class="op-gantt-bar" style="left:${left}%;width:${width}%"></span></div></div>`
        }).join('')}</div>
        <div class="op-gantt-axis">${cols.slice(0, 8).map(c => `<span>${escape(stripMd(c))}</span>`).join('')}</div>
      </div>`
  }

  if (layout === 'mermaid' || layout === 'flowchart' || layout === 'sequence' || slide.mermaid) {
    const src = String(slide.mermaid || '').trim()
    const lines = src.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const kind = /^sequenceDiagram/i.test(lines[0] || '') ? 'SEQUENCE' : 'FLOWCHART'
    let mermaidBody = ''
    try {
      mermaidBody = renderMermaidHtml(slide, 0)
    } catch {
      mermaidBody = ''
    }
    return `
      <div class="op-vis-card">
        <div class="op-vis-head"><span class="op-badge">${kind}</span><h4>${escape(stripMd(slide.title))}</h4></div>
        ${mermaidBody ? `<div class="op-mermaid-wrap">${mermaidBody}</div>` : `<pre class="op-mermaid-code">${escape(lines.slice(0, 10).join('\n'))}</pre>`}
        ${slide.takeaway ? `<p class="op-takeaway">▸ ${escape(stripMd(slide.takeaway))}</p>` : ''}
      </div>`
  }

  if (Array.isArray(slide.rows) && slide.rows.length > 0) {
    const rows = slide.rows.slice(0, 6)
    const head = rows[0] || []
    const body = rows.slice(1)
    return `
      <div class="op-vis-card">
        <div class="op-vis-head"><span class="op-badge">${escape(layout.toUpperCase())}</span><h4>${escape(stripMd(slide.title))}</h4></div>
        <div class="op-tbl-wrap"><table class="op-table">
          <thead><tr>${head.slice(0, 6).map(c => `<th>${escape(stripMd(c))}</th>`).join('')}</tr></thead>
          <tbody>${body.map(r => `<tr>${head.slice(0, 6).map((_, ci) => `<td>${escape(stripMd(r?.[ci] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
        ${slide.takeaway ? `<p class="op-takeaway">▸ ${escape(stripMd(slide.takeaway))}</p>` : ''}
      </div>`
  }

  if (slide.formula) {
    const rawFormula = String(slide.formula).trim()
    let mathHtml = ''
    try {
      mathHtml = latexToMathMl(rawFormula, { display: true, className: 'deck-math is-block' })
    } catch {
      mathHtml = ''
    }
    return `
      <div class="op-vis-card">
        <div class="op-vis-head"><span class="op-badge">FORMULA</span><h4>${escape(stripMd(slide.title))}</h4></div>
        <div class="op-formula">${mathHtml || escape(rawFormula)}</div>
        ${slide.takeaway ? `<p class="op-takeaway">▸ ${escape(stripMd(slide.takeaway))}</p>` : ''}
      </div>`
  }

  return ''
}

/**
 * Generate a standalone, print-to-PDF-ready A4 Executive One-Pager HTML
 * with an interactive "切换长图战报 / Mobile Long-Card" mode switcher.
 * @param {object} manifest
 * @param {string} [language]
 */
export function renderOnePagerHtml(manifest, language) {
  const lang = language || manifest?.language || 'zh'
  const en = lang === 'en'
  const theme = safeBrandedTheme(manifest)
  const tk = theme.tokens || {}
  const pal = theme.palette || {}
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  const pace = computePaceBudget(manifest)
  const title = cleanLine(manifest?.title) || (en ? 'Executive One-Pager' : '高管一页纸战报')

  const cover = slides.find(s => s.layout === 'cover') || slides[0] || {}
  const closing = [...slides].reverse().find(s => s.layout === 'closing') || null
  const takeaways = slides.map(s => stripMd(s.takeaway)).filter(Boolean)
  const thesis = stripMd(cover.subtitle) || takeaways[0] || stripMd(slides.find(s => s.layout === 'statement')?.title) || title

  // Extract Top KPI Strip (up to 4 cards)
  const kpis = []
  for (const s of slides) {
    if (s.layout === 'kpi' && Array.isArray(s.items)) {
      for (const it of s.items) {
        if (it && (it.value !== undefined || it.title)) {
          kpis.push({
            label: stripMd(it.tag || it.title || ''),
            value: stripMd(it.value ?? ''),
            unit: stripMd(it.unit ?? ''),
            delta: stripMd(it.delta ?? ''),
            note: stripMd(it.text ?? ''),
            status: it.status || 'accent',
          })
        }
      }
    }
  }
  if (kpis.length === 0) {
    kpis.push(
      { label: en ? 'Total Slides' : '演示总页数', value: String(slides.length), unit: en ? 'slides' : '页', delta: '', note: '', status: 'accent' },
      { label: en ? 'Est. Duration' : '预计演讲时长', value: String(pace.estimatedMinutes), unit: en ? 'min' : '分钟', delta: fmtSeconds(pace.estimatedSeconds), note: '', status: pace.status === 'over-budget' ? 'warning' : 'positive' },
    )
  }
  const topKpis = kpis.slice(0, 4)

  // Key Visuals (Charts / Tables / Sankey / Gantt / Mermaid / Formulas)
  const visualSlides = slides.filter(s =>
    s.chart || s.mermaid || s.formula ||
    ['sankey', 'gantt', 'marimekko', 'harvey', 'table', 'mermaid', 'flowchart', 'sequence'].includes(s.layout) ||
    (Array.isArray(s.rows) && s.rows.length > 0)
  )
  const visualsHtml = visualSlides.slice(0, 4).map(s => renderOnePagerVisualHtml(s, theme, en)).filter(Boolean).join('')

  // Core Pillars
  const pillarSlides = slides.filter(s => !['cover', 'closing', 'section', 'agenda'].includes(s.layout))
  const pillars = []
  for (const s of pillarSlides) {
    if (pillars.length >= 6) break
    const pts = []
    if (Array.isArray(s.items)) {
      for (const it of s.items.slice(0, 3)) {
        const line = [stripMd(it.title || it.tag), stripMd(it.text)].filter(Boolean).join(': ')
        if (line) pts.push(line)
      }
    }
    if (pts.length === 0 && Array.isArray(s.bullets)) {
      for (const b of s.bullets.slice(0, 3)) pts.push(stripMd(b))
    }
    if (pts.length === 0 && s.takeaway) pts.push(stripMd(s.takeaway))
    if (s.title || pts.length) {
      pillars.push({
        kicker: stripMd(s.kicker || s.layout || ''),
        title: stripMd(s.title),
        points: pts.slice(0, 3),
        takeaway: stripMd(s.takeaway),
      })
    }
  }

  // Action Items
  const actions = []
  if (closing) {
    if (Array.isArray(closing.items)) {
      for (const it of closing.items.slice(0, 4)) {
        actions.push({
          tag: stripMd(it.tag || ''),
          title: stripMd(it.title || ''),
          text: stripMd(it.text || ''),
        })
      }
    }
    if (actions.length === 0 && Array.isArray(closing.bullets)) {
      for (const b of closing.bullets.slice(0, 4)) {
        actions.push({ tag: en ? 'Action' : '行动', title: stripMd(b), text: '' })
      }
    }
    if (actions.length === 0 && closing.subtitle) {
      actions.push({ tag: en ? 'Next' : '下一步', title: stripMd(closing.title), text: stripMd(closing.subtitle) })
    }
  }
  if (actions.length === 0 && takeaways.length > 0) {
    takeaways.slice(0, 3).forEach((t, idx) => actions.push({ tag: `#${idx + 1}`, title: t, text: '' }))
  }

  const badgeText = (st) => st === 'over-budget'
    ? (en ? 'Over' : '超预算')
    : st === 'under-budget'
      ? (en ? 'Short' : '偏短')
      : (en ? 'OK' : '适中')

  const paceRowsHtml = pace.slides.map(ps => `
    <tr>
      <td class="num">${ps.slide}</td>
      <td>${escape(ps.title)}</td>
      <td><code>${escape(ps.layout)}</code></td>
      <td class="num">${fmtSeconds(ps.seconds)}</td>
      <td><span class="op-pace-pill op-pace-${escape(ps.status)}">${escape(badgeText(ps.status))}</span></td>
    </tr>`).join('')

  const toggleLabelLong = en ? 'Mobile Long-Card' : '切换长图战报'
  const toggleLabelA4 = en ? 'A4 Print View' : '切换 A4 报告视图'
  const printLabel = en ? 'Print / Export PDF' : '打印 / 导出 PDF'
  const headerBg = tk.coverIsDark === true && tk.coverBg ? tk.coverBg : (pal.accent || '#0B1F3A')
  const headerFg = relativeLuminance(headerBg) > 0.35 ? '#0F172A' : '#FFFFFF'
  const headerChipBg = headerFg === '#FFFFFF' ? 'rgba(255,255,255,.16)' : 'rgba(15,23,42,.10)'

  return `<!DOCTYPE html>
<html lang="${en ? 'en' : 'zh-CN'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escape(title)} · ${en ? 'Executive One-Pager' : '高管一页纸战报'}</title>
<style>
:root{
  --bg:${pal.bg || '#FFFFFF'};
  --panel:${pal.panel || '#F8FAFC'};
  --fg:${pal.fg || '#0F172A'};
  --muted:${pal.muted || '#64748B'};
  --accent:${pal.accent || '#0057B8'};
  --accent2:${pal.accent2 || '#0EA5E9'};
  --surface1:${tk.surface1 || pal.panel || '#F8FAFC'};
  --surface2:${tk.surface2 || '#EEF2F7'};
  --hairline:${tk.hairline || '#DCE3EE'};
  --ink-secondary:${tk.inkSecondary || pal.muted || '#475569'};
  --ink-on-accent:${tk.inkOnAccent || '#FFFFFF'};
  --accent-text:${tk.accentText || pal.accent || '#0057B8'};
  --accent-soft:${tk.accentSoft || '#E8F0FE'};
  --positive:${tk.positive || '#0D7A4E'};
  --negative:${tk.negative || '#C81E1E'};
  --warning:${tk.warning || '#B45309'};
  --cover-bg:${headerBg};
  --header-fg:${headerFg};
  --header-chip-bg:${headerChipBg};
  --font-heading:${theme.fonts?.heading || 'system-ui, sans-serif'};
  --font-body:${theme.fonts?.body || 'system-ui, sans-serif'};
}
*{box-sizing:border-box}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
body{margin:0;background:color-mix(in srgb,var(--surface2) 70%,var(--bg));color:var(--fg);font-family:var(--font-body);line-height:1.5;padding:18px 16px 40px;transition:background .2s}
.op-toolbar{max-width:960px;margin:0 auto 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.op-toolbar-title{font-size:13px;color:var(--muted);font-weight:600}
.op-toolbar-actions{display:flex;gap:8px;flex-wrap:wrap}
.op-btn{border:1px solid var(--hairline);background:var(--bg);color:var(--fg);border-radius:99px;padding:7px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.op-btn:hover{border-color:var(--accent);color:var(--accent)}
.op-btn.primary{background:var(--accent);color:var(--ink-on-accent);border-color:var(--accent)}
.op-sheet{max-width:960px;margin:0 auto;background:var(--bg);border:1px solid var(--hairline);border-radius:16px;padding:24px 26px;box-shadow:0 12px 32px rgba(15,23,42,.08);transition:max-width .25s ease}
body.long-card .op-sheet{max-width:440px;padding:18px 16px;border-radius:22px}
body.long-card .op-kpi-strip{grid-template-columns:repeat(2,minmax(0,1fr))}
body.long-card .op-grid,body.long-card .op-pillars,body.long-card .op-actions{grid-template-columns:1fr}
.op-header{background:var(--cover-bg);color:var(--header-fg);border-radius:12px;padding:18px 20px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
.op-kicker{font-size:11px;letter-spacing:.1em;text-transform:uppercase;opacity:.85;margin-bottom:4px;font-weight:700}
.op-header h1{margin:0;font-family:var(--font-heading);font-size:22px;line-height:1.25}
.op-thesis{margin:6px 0 0;font-size:13.5px;opacity:.92;max-width:min(100%,44em)}
.op-meta{display:flex;gap:8px;flex-wrap:wrap;font-size:12px}
.op-meta-chip{background:var(--header-chip-bg);padding:4px 10px;border-radius:99px;white-space:nowrap}
.op-section-title{font-family:var(--font-heading);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);margin:16px 0 8px;display:flex;align-items:center;gap:8px}
.op-section-title::after{content:"";flex:1;height:1px;background:var(--hairline)}
.op-kpi-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:14px}
.op-kpi{background:var(--surface1);border:1px solid var(--hairline);border-top:3px solid var(--accent);border-radius:10px;padding:11px 13px;break-inside:avoid}
.op-kpi-lbl{font-size:11.5px;color:var(--muted);font-weight:600}
.op-kpi-val{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--fg);margin:2px 0}
.op-kpi-val small{font-size:12px;font-weight:600;color:var(--muted);margin-left:3px}
.op-kpi-delta{font-size:11.5px;font-weight:700;color:var(--positive)}
.op-kpi-note{font-size:11.5px;color:var(--muted);margin-top:2px}
.op-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}
.op-vis-card{background:var(--surface1);border:1px solid var(--hairline);border-radius:10px;padding:12px 14px;break-inside:avoid}
.op-vis-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.op-vis-head h4{margin:0;font-size:14px;font-family:var(--font-heading);line-height:1.3}
.op-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--accent);text-transform:uppercase;flex-shrink:0}
.op-chart-svg{position:relative}
.op-chart-svg svg{width:100%;height:auto;max-height:190px;display:block}
.op-mermaid-wrap{max-height:210px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.op-mermaid-wrap svg.deck-mermaid-svg{max-height:210px;width:100%;height:auto}
${MERMAID_CSS}
.op-mini-notes{font-size:12px;color:var(--muted);margin-top:6px;display:grid;gap:3px}
.op-takeaway{margin:7px 0 0;font-size:12px;color:var(--fg);background:color-mix(in srgb,var(--accent) 8%,transparent);padding:5px 8px;border-radius:6px;border-left:3px solid var(--accent)}
.op-source{margin:5px 0 0;font-size:11px;color:var(--muted)}
.op-tbl-wrap{overflow-x:auto}
.op-table{width:100%;border-collapse:collapse;font-size:12px}
.op-table th,.op-table td{padding:5px 7px;border-bottom:1px solid var(--hairline);text-align:left}
.op-table th{color:var(--muted);font-weight:700;background:var(--surface2)}
.op-table td.num{text-align:right;font-variant-numeric:tabular-nums}
.op-flow-list{margin:0;padding-left:16px;font-size:12.5px;display:grid;gap:4px}
.op-gantt-list{display:grid;gap:6px;font-size:12px}
.op-gantt-row{display:grid;grid-template-columns:110px 1fr;align-items:center;gap:8px}
.op-gantt-lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.op-gantt-track{position:relative;height:12px;background:var(--surface2);border-radius:99px;overflow:hidden}
.op-gantt-bar{position:absolute;top:0;bottom:0;background:var(--accent);border-radius:99px}
.op-gantt-axis{display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted);margin-top:6px;padding-left:118px}
.op-mermaid-code{margin:0;padding:8px 10px;background:var(--surface2);border-radius:8px;font-size:11px;overflow:auto;max-height:150px;white-space:pre-wrap}
.op-formula{padding:12px 14px;background:var(--surface2);border-radius:8px;font-size:15px;text-align:center;color:var(--fg);overflow-x:auto}
.op-formula .deck-math{font-size:18px;color:var(--fg)}
.op-pillars{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
.op-pillar{background:var(--surface1);border:1px solid var(--hairline);border-radius:10px;padding:11px 13px;break-inside:avoid}
.op-pillar-kicker{font-size:10.5px;font-weight:700;color:var(--accent);text-transform:uppercase}
.op-pillar h4{margin:2px 0 6px;font-size:13.5px;font-family:var(--font-heading)}
.op-pillar ul{margin:0;padding-left:16px;font-size:12px;color:var(--muted);display:grid;gap:3px}
.op-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:14px}
.op-action{background:var(--surface1);border:1px solid var(--hairline);border-left:3px solid var(--accent2);border-radius:8px;padding:9px 11px;font-size:12.5px;break-inside:avoid}
.op-action strong{display:block;margin-bottom:2px}
.op-pace-box{background:var(--surface1);border:1px solid var(--hairline);border-radius:10px;padding:12px 14px;break-inside:avoid}
.op-pace-summary{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:12.5px;margin-bottom:8px}
.op-pace-pill{display:inline-block;padding:1px 7px;border-radius:99px;font-size:11px;font-weight:700}
.op-pace-on-track{background:color-mix(in srgb,var(--positive) 15%,transparent);color:var(--positive)}
.op-pace-over-budget{background:color-mix(in srgb,var(--negative) 15%,transparent);color:var(--negative)}
.op-pace-under-budget{background:color-mix(in srgb,var(--warning) 15%,transparent);color:var(--warning)}
@media(max-width:700px){.op-grid,.op-pillars{grid-template-columns:1fr}}
@media print{
  @page{size:A4 portrait;margin:11mm}
  body{background:#fff;padding:0}
  .op-toolbar{display:none!important}
  .op-sheet{max-width:none!important;border:none;box-shadow:none;padding:0}
}
</style>
</head>
<body>
<div class="op-toolbar">
  <span class="op-toolbar-title">${escape(en ? 'dsh-ppt Executive One-Pager' : 'dsh-ppt 高管一页纸战报')}</span>
  <div class="op-toolbar-actions">
    <button id="mode-toggle" class="op-btn" type="button" data-mode="a4">${escape(toggleLabelLong)}</button>
    <button id="print-btn" class="op-btn primary" type="button" onclick="window.print()">${escape(printLabel)}</button>
  </div>
</div>
<main class="op-sheet">
  <header class="op-header">
    <div>
      <div class="op-kicker">${escape(stripMd(cover.kicker || (en ? 'EXECUTIVE BRIEF' : '高管摘要战报')))}</div>
      <h1>${escape(title)}</h1>
      ${thesis && thesis !== title ? `<p class="op-thesis">${escape(thesis)}</p>` : ''}
    </div>
    <div class="op-meta">
      <span class="op-meta-chip">${slides.length} ${escape(en ? 'Slides' : '页')}</span>
      <span class="op-meta-chip">${escape(en ? 'Pace' : '预计时长')}: ~${pace.estimatedMinutes} ${escape(en ? 'min' : '分钟')}</span>
      <span class="op-meta-chip">${escape(theme.id || 'consulting')}</span>
    </div>
  </header>

  <div class="op-section-title">${escape(en ? 'Top KPI Strip' : '核心指标概览')}</div>
  <section class="op-kpi-strip">
    ${topKpis.map(k => `<div class="op-kpi">
      <div class="op-kpi-lbl">${escape(k.label)}</div>
      <div class="op-kpi-val">${escape(k.value)}${k.unit ? `<small>${escape(k.unit)}</small>` : ''}</div>
      ${k.delta ? `<div class="op-kpi-delta">${escape(k.delta)}</div>` : ''}
      ${k.note ? `<div class="op-kpi-note">${escape(k.note)}</div>` : ''}
    </div>`).join('')}
  </section>

  ${visualsHtml ? `<div class="op-section-title">${escape(en ? 'Key Visuals & Evidence' : '关键图表与核心证据')}</div><section class="op-grid">${visualsHtml}</section>` : ''}

  ${pillars.length ? `<div class="op-section-title">${escape(en ? 'Core Pillars' : '核心支柱与论证')}</div><section class="op-pillars">
    ${pillars.map(p => `<div class="op-pillar">
      ${p.kicker ? `<div class="op-pillar-kicker">${escape(p.kicker)}</div>` : ''}
      <h4>${escape(p.title)}</h4>
      ${p.points.length ? `<ul>${p.points.map(pt => `<li>${escape(pt)}</li>`).join('')}</ul>` : ''}
      ${p.takeaway ? `<p class="op-takeaway">▸ ${escape(p.takeaway)}</p>` : ''}
    </div>`).join('')}
  </section>` : ''}

  ${actions.length ? `<div class="op-section-title">${escape(en ? 'Action Items' : '下一步行动')}</div><section class="op-actions">
    ${actions.map(a => `<div class="op-action">${a.tag ? `<span class="op-badge">${escape(a.tag)}</span> ` : ''}<strong>${escape(a.title)}</strong>${a.text ? `<span>${escape(a.text)}</span>` : ''}</div>`).join('')}
  </section>` : ''}

  <div class="op-section-title">${escape(en ? 'Speaking Pace Budget' : '演讲配速预算')}</div>
  <section class="op-pace-box">
    <div class="op-pace-summary">
      <span><strong>${escape(en ? 'Total Estimated' : '总计预计')}:</strong> ${fmtSeconds(pace.estimatedSeconds)} (~${pace.estimatedMinutes} ${escape(en ? 'min' : '分钟')}) · <strong>${escape(en ? 'Target' : '目标')}:</strong> ${pace.targetMinutes} ${escape(en ? 'min' : '分钟')}</span>
      <span class="op-pace-pill op-pace-${escape(pace.status)}">${escape(badgeText(pace.status))}</span>
    </div>
    <div class="op-tbl-wrap"><table class="op-table">
      <thead><tr><th>#</th><th>${escape(en ? 'Slide' : '页面')}</th><th>${escape(en ? 'Layout' : '版式')}</th><th>${escape(en ? 'Budget' : '预算')}</th><th>${escape(en ? 'Status' : '状态')}</th></tr></thead>
      <tbody>${paceRowsHtml}</tbody>
    </table></div>
  </section>
</main>
<script>
(function(){
  var btn = document.getElementById('mode-toggle');
  if (!btn) return;
  btn.addEventListener('click', function(){
    var longMode = document.body.classList.toggle('long-card');
    btn.dataset.mode = longMode ? 'long-card' : 'a4';
    btn.textContent = longMode ? ${JSON.stringify(toggleLabelA4)} : ${JSON.stringify(toggleLabelLong)};
  });
})();
</script>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Subtitles (.srt / .vtt) Generator (powered by computePaceBudget)
// ---------------------------------------------------------------------------

function formatSubtitleTime(totalSeconds, separator = ',') {
  const safe = Math.max(0, Number(totalSeconds) || 0)
  const hrs = Math.floor(safe / 3600)
  const mins = Math.floor((safe % 3600) / 60)
  const secs = Math.floor(safe % 60)
  const ms = Math.round((safe - Math.floor(safe)) * 1000) % 1000
  return (
    String(hrs).padStart(2, '0') + ':' +
    String(mins).padStart(2, '0') + ':' +
    String(secs).padStart(2, '0') + separator +
    String(ms).padStart(3, '0')
  )
}

function splitCaptionPhrases(text, maxChars = 48) {
  const raw = String(text ?? '').replace(/\r/g, '').trim()
  if (!raw) return []
  const chunks = []
  for (const para of raw.split(/\n+/)) {
    const clean = stripMd(para).replace(/^[-•▸*]\s*/, '').trim()
    if (!clean || /^\[(?:证据溯源|压缩归档|Condensed Backup|Evidence)/i.test(clean)) continue
    const sentences = clean.split(/(?<=[。！？.!?;；])\s*/).map(s => s.trim()).filter(Boolean)
    for (const sent of sentences) {
      if (sent.length <= maxChars) {
        chunks.push(sent)
      } else {
        for (let i = 0; i < sent.length; i += maxChars) {
          chunks.push(sent.slice(i, i + maxChars).trim())
        }
      }
    }
  }
  return chunks.filter(Boolean).slice(0, 6)
}

function buildSubtitleCues(manifest, language = 'zh') {
  const pace = computePaceBudget(manifest)
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  const isEn = (language || manifest?.language) === 'en'
  const cues = []
  let cursorSec = 0

  slides.forEach((slide, idx) => {
    const duration = Math.max(6, Number(pace.slides?.[idx]?.seconds) || 20)
    const rawNotes = typeof slide?.notes === 'string' && slide.notes.trim()
      ? slide.notes.split(/\n\[(?:证据溯源|压缩归档|Condensed Backup|Evidence)/i)[0].trim()
      : ''
    const fallbackText = [
      stripMd(slide?.title || (isEn ? `Slide ${idx + 1}` : `第 ${idx + 1} 页`)),
      slide?.takeaway ? stripMd(slide.takeaway) : '',
      !slide?.takeaway ? slideCueLines(slide) : '',
    ].filter(Boolean).join('\n')

    const lines = splitCaptionPhrases(rawNotes || fallbackText, isEn ? 68 : 42)
    const safeLines = lines.length > 0 ? lines : [stripMd(slide?.title || (isEn ? `Slide ${idx + 1}` : `第 ${idx + 1} 页`))]
    const totalWeight = safeLines.reduce((sum, l) => sum + Math.max(4, l.length), 0)
    let localStart = cursorSec
    safeLines.forEach((line, lIdx) => {
      const share = lIdx === safeLines.length - 1
        ? (cursorSec + duration) - localStart
        : Math.max(2, Number(((Math.max(4, line.length) / totalWeight) * duration).toFixed(2)))
      const localEnd = Math.min(cursorSec + duration, localStart + share)
      cues.push({
        index: cues.length + 1,
        slide: idx + 1,
        start: localStart,
        end: Math.max(localStart + 1.5, localEnd),
        text: line,
      })
      localStart = localEnd
    })
    cursorSec += duration
  })

  return cues
}

/** Generate standard SubRip (.srt) timed narration captions synced with computePaceBudget. */
export function renderSubtitlesSrt(manifest, language) {
  const cues = buildSubtitleCues(manifest, language)
  return cues.map(c =>
    `${c.index}\n${formatSubtitleTime(c.start, ',')} --> ${formatSubtitleTime(c.end, ',')}\n${c.text}\n`
  ).join('\n')
}

/** Generate standard WebVTT (.vtt) timed narration captions synced with computePaceBudget. */
export function renderSubtitlesVtt(manifest, language) {
  const cues = buildSubtitleCues(manifest, language)
  return 'WEBVTT\n\n' + cues.map(c =>
    `${formatSubtitleTime(c.start, '.')} --> ${formatSubtitleTime(c.end, '.')}\n${c.text}\n`
  ).join('\n')
}

/** Offline, sibling-file links only. No credentials or application server needed. */
export function renderDelivery(manifest, files = {}, language) {
  const label = (zh, en) => language === 'en' ? en : language === 'bilingual' ? zh + ' · ' + en : zh
  const issues = manifest.quality?.issues ?? []
  const draft = issues.some(issue => issue.code === 'template-unfilled')
  const href = path => './' + encodeURIComponent(basename(path))
  const download = (kind, text, id) => files[kind] ? `<a id="${id}" href="${escape(href(files[kind]))}" download>${escape(text)}</a>` : ''
  const pptxLabel = label('下载 PPTX', 'Download PPTX')
  const handoutLabel = label('下载讲义 (.md)', 'Download handout (.md)')
  const onePagerLabel = label('下载一页纸战报 (.html)', 'Download One-Pager (.html)')
  const carouselLabel = label('下载社媒长图卡片 (.html)', 'Download Social Carousel (.html)')
  const subtitlesLabel = label('下载配音字幕 (.srt)', 'Download Subtitles (.srt)')
  const reviewLabel = label('检查与导出', 'Review and export')
  const outline = manifest.slides.map((slide, i) => `<li><button type="button" data-review-slide="${i + 1}"><span>${i + 1}</span>${escape(slide.title || label('无标题', 'Untitled'))}</button></li>`).join('')
  const rows = issues.map(issue => `<li><button type="button" data-review-slide="${issue.slide}"><strong>${escape(label('第 ' + issue.slide + ' 页', 'Slide ' + issue.slide))} · ${escape(issue.message)}</strong><span>${escape(issue.suggestion)}</span></button></li>`).join('')
  const summary = draft ? label('草稿中还有待填写内容，请补齐事实后再交付。', 'This draft still contains placeholders. Complete the facts before delivery.')
    : manifest.quality ? label('静态检查发现 ' + issues.length + ' 项提示；请核对实际显示。', 'Static checks found ' + issues.length + ' item(s); review the actual slides.')
    : label('此项目没有静态质量报告，请逐页检查。', 'No static quality report is available; review every slide.')

  const slugBase = files.json
    ? basename(files.json, '.json')
    : (manifest.title || 'presentation').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'presentation'

  const handoutMarkdown = renderHandoutMarkdown(manifest, language)
  const handoutFileName = files.handout ? basename(files.handout) : slugBase + '.handout.md'
  const handoutLink = files.handout
    ? `<a id="download-handout" href="${escape(href(files.handout))}" download>${escape(handoutLabel)}</a>`
    : `<a id="download-handout" href="#handout" download="${escape(handoutFileName)}">${escape(handoutLabel)}</a>`

  const onePagerHtml = renderOnePagerHtml(manifest, language)
  const onePagerFileName = files.onepager ? basename(files.onepager) : slugBase + '.onepager.html'
  const onePagerLink = files.onepager
    ? `<a id="download-onepager" href="${escape(href(files.onepager))}" download>${escape(onePagerLabel)}</a>`
    : `<a id="download-onepager" href="#onepager" download="${escape(onePagerFileName)}">${escape(onePagerLabel)}</a>`

  const carouselFileName = files.carousel ? basename(files.carousel) : slugBase + '.carousel.html'
  const carouselLink = files.carousel
    ? `<a id="download-carousel" href="${escape(href(files.carousel))}" download>${escape(carouselLabel)}</a>`
    : `<a id="download-carousel" href="#carousel" download="${escape(carouselFileName)}">${escape(carouselLabel)}</a>`

  const subtitlesSrt = renderSubtitlesSrt(manifest, language)
  const subtitlesFileName = files.subtitles ? basename(files.subtitles) : slugBase + '.srt'
  const subtitlesLink = files.subtitles
    ? `<a id="download-subtitles" href="${escape(href(files.subtitles))}" download>${escape(subtitlesLabel)}</a>`
    : `<a id="download-subtitles" href="#subtitles" download="${escape(subtitlesFileName)}">${escape(subtitlesLabel)}</a>`

  const paceBudget = computePaceBudget(manifest)
  const paceSummaryText = label(
    `预计演讲时长 ${paceBudget.estimatedMinutes} 分钟（目标 ${paceBudget.targetMinutes} 分钟）${paceBudget.overBudgetSlides.length ? ` · 超预算页：${paceBudget.overBudgetSlides.join(', ')}` : ''}`,
    `Estimated speaking pace: ${paceBudget.estimatedMinutes} min (target ${paceBudget.targetMinutes} min)${paceBudget.overBudgetSlides.length ? ` · Over-budget slides: ${paceBudget.overBudgetSlides.join(', ')}` : ''}`
  )

  const slideCues = (manifest.slides || []).map((s) => slideCueLines(s))
  const searchIndex = (manifest.slides || []).map((s, idx) => ({
    slide: idx + 1,
    title: stripMd(s.title || label('无标题', 'Untitled')),
    kicker: stripMd(s.kicker || ''),
    layout: s.layout || 'bullets',
    evidenceIds: Array.isArray(s.evidenceIds) ? s.evidenceIds : [],
  }))
  const evidenceIndex = Array.isArray(manifest.evidence)
    ? manifest.evidence.map((ev) => {
        const citingSlides = []
        ;(manifest.slides || []).forEach((s, idx) => {
          if (Array.isArray(s.evidenceIds) && s.evidenceIds.includes(ev.id)) citingSlides.push(idx + 1)
        })
        return {
          id: ev.id,
          claim: stripMd(ev.claim || ''),
          source: stripMd(ev.source || ''),
          confidence: ev.confidence || 'verified',
          slides: citingSlides,
        }
      })
    : []
  const slideSubtitles = (manifest.slides || []).map((s, idx) => {
    const rawNotes = typeof s.notes === 'string' && s.notes.trim()
      ? s.notes.split(/\n\[(?:证据溯源|压缩归档|Condensed Backup|Evidence)/i)[0].trim()
      : ''
    const first = splitCaptionPhrases(rawNotes || [stripMd(s.title || ''), stripMd(s.takeaway || ''), slideCues[idx] || ''].filter(Boolean).join('\n'), language === 'en' ? 96 : 64)[0]
    return first || stripMd(s.title || '')
  })

  const targetMinutes = paceBudget.targetMinutes
  const deliveryConfig = {
    lang: language || 'zh',
    title: String(manifest.title || 'Presentation'),
    channelId: String(manifest.deckId || manifest.title || 'dsh-ppt').slice(0, 64),
    slideCues,
    slideSubtitles,
    searchIndex,
    evidenceIndex,
    targetMinutes,
    slideBudgets: paceBudget.slides.map(s => ({ seconds: s.seconds, status: s.status })),
    handoutMarkdown,
    handoutFileName,
    hasSiblingHandout: Boolean(files.handout),
    onePagerHtml,
    onePagerFileName,
    hasSiblingOnePager: Boolean(files.onepager),
    carouselFileName,
    hasSiblingCarousel: Boolean(files.carousel),
    subtitlesSrt,
    subtitlesFileName,
    hasSiblingSubtitles: Boolean(files.subtitles),
    labels: {
      presenterTitle: label('演讲者提词台', 'Presenter Console'),
      currentSlide: label('当前画面', 'CURRENT SLIDE'),
      nextSlide: label('下一页预览', 'NEXT SLIDE'),
      teleprompter: label('演讲提词器', 'TELEPROMPTER'),
      autoCueBadge: label('自动提纲提示（无手写备注）', 'Auto cue (no speaker notes)'),
      paceBudgetLabel: label('本页预算', 'Budget'),
      paceOverLabel: label('超预算', 'Over'),
      paceShortLabel: label('偏短', 'Short'),
      noNotes: label('本页暂无演讲备注与要点提示', 'No notes or cues for this slide'),
      elapsed: label('已用时间', 'Elapsed'),
      remaining: label('目标倒计时', 'Remaining'),
      pause: label('暂停', 'Pause'),
      resume: label('继续', 'Resume'),
      reset: label('重置计时', 'Reset'),
      black: label('黑屏', 'Black'),
      unblack: label('取消黑屏', 'Unblack'),
      white: label('白屏', 'White'),
      unwhite: label('取消白屏', 'Unwhite'),
      laser: label('激光笔 (L)', 'Laser (L)'),
      endShow: label('结束放映', 'End'),
      popupBlocked: label('浏览器拦截了演讲者窗口，请允许弹窗后按 P 重试。', 'Presenter popup was blocked. Allow popups and press P to retry.'),
      laserOn: label('虚拟激光笔已开启（移动鼠标指示，按 L 关闭）', 'Laser pointer ON (move pointer, press L to off)'),
      laserOff: label('虚拟激光笔已关闭', 'Laser pointer OFF'),
      drawOn: label('实时白板画笔已开启（按 Z 撤销，C 清屏，D/Esc 退出）', 'Whiteboard pen ON (Z undo, C clear, D/Esc exit)'),
      drawOff: label('实时白板画笔已关闭', 'Whiteboard pen OFF'),
      jumpEmpty: label('未找到匹配的页面或证据编号', 'No matching slides or evidence entries'),
      autoTourStart: label('自动导览', 'Auto-Tour'),
      autoTourStop: label('停止导览', 'Stop Tour'),
      qaFinished: label('Q&A 倒计时结束', 'Q&A time is up'),
      reviewCommentSaved: label('已保存当前页审阅批注', 'Review comment pinned to slide'),
      reviewCommentEmpty: label('暂无批注；按 R 添加当前页修改意见并导出给 AI 修订', 'No comments yet; add feedback for this slide and export JSON for AI revision'),
      reviewExported: label('已导出 review-feedback.json，可直接发给 AI 自动修订', 'Exported review-feedback.json for AI revision'),
      hint: label('← → 翻页 · P/空格 暂停 · T 重置 · A+/A- 字号 · L 激光笔 · B/W 黑白屏 · Esc 结束', '← → Navigate · T Reset · A+/A- Zoom · L Laser · B/W Blank · Esc End'),
    },
  }

  return {
    body: `<div id="delivery-bar">
  <span id="delivery-status">${escape(draft ? label('待补全草稿', 'Draft: content needed') : manifest.dataModel ? label('演示文稿 · Ctrl+K 速搜 · R 批注 · D 推演 · Shift+D 标注 · T 计时 · A 导览', 'Presentation · Ctrl+K Jump · R Comment · D Data · Shift+D Draw · T Timer · A Tour') : label('演示文稿 · Ctrl+K 速搜 · R 批注 · D 标注 · T 计时 · A 导览', 'Presentation · Ctrl+K Jump · R Comment · D Draw · T Timer · A Tour'))}</span>
  <button id="dsh-jump-open" type="button" title="Ctrl/Cmd+K">${escape(label('速搜 (⌘K)', 'Search (⌘K)'))}</button>
  <button id="dsh-comments-btn" type="button" title="R">${escape(label('批注 (R)', 'Comments (R)'))}</button>
  <button id="dsh-autotour-btn" type="button" aria-pressed="false" title="A">${escape(label('自动导览', 'Auto-Tour'))}</button>
  ${download('pptx', pptxLabel, 'download-pptx')}
  <button id="review-toggle" type="button" aria-haspopup="dialog">${escape(reviewLabel)}</button>
</div>
<aside id="dsh-review-comments" hidden role="region" aria-label="${escape(label('离线审阅批注面板', 'Offline Review Comments'))}">
  <div class="dsh-rc-head">
    <strong>${escape(label('审阅批注 · 离线回流 AI', 'Review Comments · Export for AI'))}</strong>
    <button type="button" id="dsh-rc-close" aria-label="${escape(label('关闭', 'Close'))}">✕</button>
  </div>
  <div id="dsh-rc-slide-ctx" class="dsh-rc-ctx"></div>
  <input id="dsh-rc-author" type="text" placeholder="${escape(label('审阅人（可选，如 老板 / CFO）', 'Reviewer (optional, e.g. CFO)'))}"/>
  <textarea id="dsh-rc-input" rows="3" placeholder="${escape(label('输入本页修改意见（如：把第3项数字放大并补充对比口径）…', 'Write slide-pinned revision note…'))}"></textarea>
  <div class="dsh-rc-actions">
    <button type="button" id="dsh-rc-add">${escape(label('添加批注', 'Pin Comment'))}</button>
    <button type="button" id="dsh-rc-export">${escape(label('导出 Feedback JSON', 'Export Feedback JSON'))}</button>
  </div>
  <ul id="dsh-rc-list"></ul>
</aside>
<div id="dsh-laser-dot" aria-hidden="true"></div>
<canvas id="dsh-draw-canvas" aria-label="${escape(label('实时白板标注画布', 'Live annotation canvas'))}"></canvas>
<div id="dsh-draw-bar" hidden role="toolbar" aria-label="${escape(label('白板标注工具条', 'Whiteboard pen toolbar'))}">
  <button type="button" class="dsh-pen-color is-active" data-pen="#EF4444" data-width="4" title="${escape(label('红笔', 'Red pen'))}" style="--swatch:#EF4444"></button>
  <button type="button" class="dsh-pen-color" data-pen="rgba(245,158,11,0.45)" data-width="14" title="${escape(label('荧光笔', 'Highlighter'))}" style="--swatch:#F59E0B"></button>
  <button type="button" class="dsh-pen-color" data-pen="#06B6D4" data-width="4" title="${escape(label('青笔', 'Cyan pen'))}" style="--swatch:#06B6D4"></button>
  <button type="button" id="dsh-draw-undo">${escape(label('撤销 (Z)', 'Undo (Z)'))}</button>
  <button type="button" id="dsh-draw-clear">${escape(label('清屏 (C)', 'Clear (C)'))}</button>
  <button type="button" id="dsh-draw-exit">${escape(label('退出 (D)', 'Exit (D)'))}</button>
</div>
<div id="dsh-qa-timer" hidden role="region" aria-label="${escape(label('Q&A 倒计时器', 'Q&A countdown timer'))}">
  <span class="dsh-qa-lbl">Q&amp;A</span>
  <strong id="dsh-qa-readout">03:00</strong>
  <button type="button" class="dsh-qa-preset" data-mins="1">1m</button>
  <button type="button" class="dsh-qa-preset is-active" data-mins="3">3m</button>
  <button type="button" class="dsh-qa-preset" data-mins="5">5m</button>
  <button type="button" class="dsh-qa-preset" data-mins="10">10m</button>
  <button type="button" id="dsh-qa-toggle">${escape(label('开始', 'Start'))}</button>
  <button type="button" id="dsh-qa-reset">${escape(label('重置', 'Reset'))}</button>
  <button type="button" id="dsh-qa-close" aria-label="${escape(label('关闭', 'Close'))}">✕</button>
</div>
<div id="dsh-sub-bar" hidden role="status" aria-live="polite">
  <span id="dsh-sub-text"></span>
  <div class="dsh-sub-ctrl">
    <button type="button" id="dsh-sub-speed">1×</button>
    <button type="button" id="dsh-sub-pause">${escape(label('暂停', 'Pause'))}</button>
    <button type="button" id="dsh-sub-stop">✕</button>
  </div>
</div>
<dialog id="dsh-jump-dialog" aria-labelledby="dsh-jump-title">
  <div class="dsh-jump-head">
    <span id="dsh-jump-title">${escape(label('快速跳转页面 / 搜索 [E#] 证据', 'Jump to slide or search [E#] evidence'))}</span>
    <button type="button" id="dsh-jump-close">Esc</button>
  </div>
  <input id="dsh-jump-input" type="search" autocomplete="off" placeholder="${escape(label('输入标题关键词、正文、或 E1 / E2 证据编号…', 'Type slide title, keyword, or E1 / E2 evidence ID…'))}"/>
  <ul id="dsh-jump-results" role="listbox"></ul>
</dialog>
<dialog id="review-panel" aria-labelledby="review-title">
  <div class="review-head"><h2 id="review-title">${escape(reviewLabel)}</h2><button id="review-close" type="button">${escape(label('关闭', 'Close'))}</button></div>
  <p id="review-summary">${escape(summary)}</p>
  <p id="review-pace" class="review-pace">${escape(paceSummaryText)}</p>
  <div class="review-exports">${download('pptx', pptxLabel, 'review-download-pptx')}${download('json', label('保存可编辑项目', 'Save project'), 'download-project')}${handoutLink}${onePagerLink}${carouselLink}${subtitlesLink}</div>
  <p>${escape(manifest.dataModel ? label('用 PowerPoint / WPS 打开 PPTX 可直接修改文字、图片和图表。快捷键：P / V 双屏提词台 · L 激光笔 · Ctrl/Cmd+K 速搜跳页 · D 数据推演 · Shift+D 实时白板标注 · T 现场 Q&A 倒计时 · A 自动字幕导览。', 'Open the PPTX in PowerPoint / WPS to edit text, images and charts. Shortcuts: P / V Presenter Console · L Laser · Ctrl/Cmd+K Search · D Data What-If · Shift+D Draw Pen · T Q&A Timer · A Auto-Tour.') : label('用 PowerPoint / WPS 打开 PPTX 可直接修改文字、图片和图表。快捷键：P / V 双屏提词台 · L 激光笔 · Ctrl/Cmd+K 速搜跳页 · D 实时白板标注 · T 现场 Q&A 倒计时 · A 自动字幕导览。', 'Open the PPTX in PowerPoint / WPS to edit text, images and charts. Shortcuts: P / V Presenter Console · L Laser · Ctrl/Cmd+K Search · D Draw Pen · T Q&A Timer · A Auto-Tour.'))}</p>
  <h3>${escape(label('检查提示 · 点击定位页面', 'Review items · click to open slide'))}</h3>
  ${issues.length ? `<ul id="review-issues">${rows}</ul>` : `<p>${escape(manifest.quality ? label('静态检查未发现问题；仍需核对实际排版和事实。', 'No static issues found; check the actual layout and facts.') : label('暂无报告。', 'No report available.'))}</p>`}
  <p>${escape(label('文字尺寸是静态估算；这里不能证明 PowerPoint / WPS 排版已通过验收。', 'Text fit is estimated; this does not verify the rendered PowerPoint / WPS layout.'))}</p>
  <h3>${escape(label('页面目录', 'Slides'))}</h3><ol id="review-outline">${outline}</ol>
</dialog>`,
    navigation: `<button id="previous-slide" type="button" aria-label="${escape(label('上一页', 'Previous slide'))}">←</button><input id="page-number" type="number" min="1" max="${manifest.slides.length}" value="1" aria-label="${escape(label('跳到第几页', 'Go to slide'))}"><button id="next-slide" type="button" aria-label="${escape(label('下一页', 'Next slide'))}">→</button>`,
    css: DELIVERY_CSS,
    script: `syncDelivery = (${initDelivery.toString()})(go, setOverview, () => index, total, ${JSON.stringify(deliveryConfig).replace(/</g, '\\u003c')});`,
  }
}

/** This function is embedded in the standalone HTML, with no module dependencies. */
function initDelivery(go, setOverview, current, total, cfg) {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
  const previous = document.getElementById('previous-slide')
  const next = document.getElementById('next-slide')
  const number = document.getElementById('page-number')
  const panel = document.getElementById('review-panel')
  const toggle = document.getElementById('review-toggle')
  const handoutBtn = document.getElementById('download-handout')
  const onePagerBtn = document.getElementById('download-onepager')
  const carouselBtn = document.getElementById('download-carousel')
  const subtitlesBtn = document.getElementById('download-subtitles')
  const laserDot = document.getElementById('dsh-laser-dot')
  const jumpOpenBtn = document.getElementById('dsh-jump-open')
  const jumpDialog = document.getElementById('dsh-jump-dialog')
  const jumpInput = document.getElementById('dsh-jump-input')
  const jumpResults = document.getElementById('dsh-jump-results')
  const jumpCloseBtn = document.getElementById('dsh-jump-close')
  const drawCanvas = document.getElementById('dsh-draw-canvas')
  const drawBar = document.getElementById('dsh-draw-bar')
  const qaTimer = document.getElementById('dsh-qa-timer')
  const qaReadout = document.getElementById('dsh-qa-readout')
  const qaToggleBtn = document.getElementById('dsh-qa-toggle')
  const qaResetBtn = document.getElementById('dsh-qa-reset')
  const qaCloseBtn = document.getElementById('dsh-qa-close')
  const tourBtn = document.getElementById('dsh-autotour-btn')
  const subBar = document.getElementById('dsh-sub-bar')
  const subText = document.getElementById('dsh-sub-text')
  const subSpeedBtn = document.getElementById('dsh-sub-speed')
  const subPauseBtn = document.getElementById('dsh-sub-pause')
  const subStopBtn = document.getElementById('dsh-sub-stop')
  const commentsBtn = document.getElementById('dsh-comments-btn')
  const commentsDrawer = document.getElementById('dsh-review-comments')
  const rcCloseBtn = document.getElementById('dsh-rc-close')
  const rcSlideCtx = document.getElementById('dsh-rc-slide-ctx')
  const rcAuthor = document.getElementById('dsh-rc-author')
  const rcInput = document.getElementById('dsh-rc-input')
  const rcAddBtn = document.getElementById('dsh-rc-add')
  const rcExportBtn = document.getElementById('dsh-rc-export')
  const rcList = document.getElementById('dsh-rc-list')

  // --- Wave 3E: 'R' Offline Stakeholder Review Comment Drawer ---
  const rcStorageKey = 'dsh-ppt-feedback-' + (cfg?.channelId || 'deck')
  let reviewComments = []
  try {
    const rawSaved = localStorage.getItem(rcStorageKey)
    if (rawSaved) {
      const parsed = JSON.parse(rawSaved)
      if (Array.isArray(parsed)) reviewComments = parsed
    }
  } catch (_) {}
  function persistComments() {
    try { localStorage.setItem(rcStorageKey, JSON.stringify(reviewComments)) } catch (_) {}
  }
  function updateCommentsContext(idx) {
    if (!rcSlideCtx) return
    const i = typeof idx === 'number' ? idx : current()
    const sl = document.querySelectorAll('.slide')[i]
    const heading = sl ? (sl.querySelector('h1,h2,.statement-title,.quote-text')?.textContent || '').trim() : ''
    rcSlideCtx.textContent = `P${String(i + 1).padStart(2, '0')} · ${heading || ('Slide ' + (i + 1))}`
  }
  function renderCommentsList() {
    if (!rcList) return
    if (commentsBtn) {
      const baseLbl = (commentsBtn.dataset.baseLbl ||= commentsBtn.textContent)
      commentsBtn.textContent = reviewComments.length > 0 ? `${baseLbl} (${reviewComments.length})` : baseLbl
    }
    if (reviewComments.length === 0) {
      rcList.innerHTML = `<li class="dsh-rc-empty">${escape(cfg?.labels?.reviewCommentEmpty || 'No comments')}</li>`
      return
    }
    rcList.innerHTML = reviewComments.map((c, idx) =>
      `<li><button type="button" class="dsh-rc-jump" data-rc-slide="${c.slide}"><strong>P${String(c.slide).padStart(2, '0')}</strong>${c.author ? ` <em>${escape(c.author)}</em>` : ''}：${escape(c.text)}</button><button type="button" class="dsh-rc-del" data-rc-del="${idx}" aria-label="Delete">✕</button></li>`
    ).join('')
    rcList.querySelectorAll('[data-rc-slide]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = Number(btn.dataset.rcSlide)
        if (Number.isInteger(s) && s >= 1 && s <= total) go(s - 1)
      })
    })
    rcList.querySelectorAll('[data-rc-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.rcDel)
        if (Number.isInteger(idx) && idx >= 0 && idx < reviewComments.length) {
          reviewComments.splice(idx, 1)
          persistComments()
          renderCommentsList()
        }
      })
    })
  }
  function toggleCommentsDrawer(forceOpen) {
    if (!commentsDrawer) return
    const willOpen = typeof forceOpen === 'boolean' ? forceOpen : commentsDrawer.hidden
    commentsDrawer.hidden = !willOpen
    if (willOpen) {
      updateCommentsContext(current())
      renderCommentsList()
      setTimeout(() => rcInput?.focus(), 20)
    }
  }
  commentsBtn?.addEventListener('click', () => toggleCommentsDrawer())
  rcCloseBtn?.addEventListener('click', () => toggleCommentsDrawer(false))
  rcAddBtn?.addEventListener('click', () => {
    const txt = String(rcInput?.value || '').trim()
    if (!txt) return
    const slideNum = current() + 1
    reviewComments.push({
      id: 'rc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      slide: slideNum,
      author: String(rcAuthor?.value || '').trim() || 'Reviewer',
      text: txt,
      createdAt: new Date().toISOString(),
    })
    if (rcInput) rcInput.value = ''
    persistComments()
    renderCommentsList()
    showToast(cfg?.labels?.reviewCommentSaved || 'Comment pinned')
  })
  rcExportBtn?.addEventListener('click', () => {
    const payload = {
      schemaVersion: 1,
      deckId: cfg?.channelId || '',
      title: cfg?.title || document.title,
      exportedAt: new Date().toISOString(),
      comments: reviewComments,
    }
    triggerBlobDownload(JSON.stringify(payload, null, 2), 'application/json;charset=utf-8', 'review-feedback.json')
    showToast(cfg?.labels?.reviewExported || 'Exported review-feedback.json')
  })
  renderCommentsList()

  previous.addEventListener('click', () => go(Math.max(0, current() - 1)))
  next.addEventListener('click', () => go(Math.min(total - 1, current() + 1)))
  const jump = () => {
    const value = Number(number.value)
    if (Number.isInteger(value) && value >= 1 && value <= total) go(value - 1)
    else number.value = String(current() + 1)
  }
  number.addEventListener('change', jump)
  number.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); jump() } })
  toggle.addEventListener('click', () => panel.showModal())
  document.getElementById('review-close').addEventListener('click', () => panel.close())
  panel.querySelectorAll('[data-review-slide]').forEach(button => button.addEventListener('click', () => {
    const slide = Number(button.dataset.reviewSlide)
    if (Number.isInteger(slide) && slide >= 1 && slide <= total) { go(slide - 1); setOverview(false); panel.close() }
  }))

  const triggerBlobDownload = (content, mime, fileName) => {
    try {
      const blob = new Blob([content || ''], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => { try { URL.revokeObjectURL(url) } catch (_) {} }, 2500)
    } catch (_) {}
  }

  if (handoutBtn && cfg && !cfg.hasSiblingHandout) {
    handoutBtn.addEventListener('click', (event) => {
      event.preventDefault()
      triggerBlobDownload(cfg.handoutMarkdown || '', 'text/markdown;charset=utf-8', cfg.handoutFileName || 'handout.md')
    })
  }
  if (onePagerBtn && cfg && !cfg.hasSiblingOnePager) {
    onePagerBtn.addEventListener('click', (event) => {
      event.preventDefault()
      triggerBlobDownload(cfg.onePagerHtml || '', 'text/html;charset=utf-8', cfg.onePagerFileName || 'onepager.html')
    })
  }
  if (carouselBtn && cfg && !cfg.hasSiblingCarousel) {
    carouselBtn.addEventListener('click', (event) => {
      event.preventDefault()
      const cs = getComputedStyle(document.documentElement)
      const tv = (k, fb) => cs.getPropertyValue(k).trim() || fb
      const domSlides = Array.from(document.querySelectorAll('.slide'))
      const cards = domSlides.map((el, idx) => {
        const heading = (el.querySelector('h1,h2,.statement-title,.quote-text')?.textContent || '').trim()
        const kicker = (el.querySelector('.kicker')?.textContent || `PART ${String(idx + 1).padStart(2, '0')}`).trim()
        const takeaway = (el.querySelector('.slide-takeaway,.media-takeaway')?.textContent || '').trim()
        const points = Array.from(el.querySelectorAll('li,.card-text,.kpi-label,.kpi-val')).map(n => n.textContent.trim()).filter(Boolean).slice(0, 6)
        const img = el.querySelector('img:not(.brand-logo)')
        const imgTag = img ? `<img class="sc-img" src="${escape(img.getAttribute('src') || '')}" alt=""/>` : ''
        const isHero = el.classList.contains('slide--cover') || el.classList.contains('slide--closing') || el.classList.contains('slide--section')
        return `<article class="sc-card${isHero ? ' is-hero' : ''}"><header><span>${escape(kicker)}</span><span>${String(idx + 1).padStart(2, '0')} / ${String(domSlides.length).padStart(2, '0')}</span></header><h2>${escape(heading)}</h2>${imgTag}${points.length ? `<ul>${points.map(p => `<li>${escape(p)}</li>`).join('')}</ul>` : ''}${takeaway ? `<div class="sc-tk">${escape(takeaway)}</div>` : ''}</article>`
      }).join('\n')
      const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(cfg.title || 'Social Carousel')}</title><style>:root{--bg:${tv('--bg', '#FFF')};--fg:${tv('--fg', '#0F172A')};--accent:${tv('--accent', '#2563EB')};--surface:${tv('--panel', '#F8FAFC')};--muted:${tv('--muted', '#64748B')}}*{box-sizing:border-box}body{margin:0;background:#0F172A;color:#FFF;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center}nav{position:sticky;top:0;padding:12px;display:flex;gap:8px;z-index:9}nav button{border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#FFF;border-radius:8px;padding:6px 12px;cursor:pointer}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,420px));gap:20px;padding:16px;width:100%;max-width:960px;justify-content:center}.sc-card{aspect-ratio:4/5;background:var(--bg);color:var(--fg);border-radius:18px;padding:24px;display:flex;flex-direction:column;gap:12px;overflow:hidden}body[data-ratio="1:1"] .sc-card{aspect-ratio:1/1}.sc-card.is-hero{background:var(--accent);color:#FFF;justify-content:center}.sc-card header{display:flex;justify-content:space-between;font-size:11px;font-weight:700;opacity:.75}.sc-card h2{margin:0;font-size:22px;line-height:1.25}.sc-card ul{margin:0;padding-left:18px;font-size:13.5px;line-height:1.5;display:flex;flex-direction:column;gap:6px}.sc-img{width:100%;max-height:46%;object-fit:cover;border-radius:10px}.sc-tk{margin-top:auto;padding:8px 10px;border-left:3px solid var(--accent);background:var(--surface);font-size:12px;font-weight:700}@media print{nav{display:none}.sc-card{page-break-after:always;margin:0 auto}}</style></head><body data-ratio="4:5"><nav><button onclick="document.body.dataset.ratio='4:5'">4:5</button><button onclick="document.body.dataset.ratio='1:1'">1:1</button><button onclick="window.print()">Print / PDF</button></nav><main>${cards}</main></body></html>`
      triggerBlobDownload(doc, 'text/html;charset=utf-8', cfg.carouselFileName || 'carousel.html')
    })
  }
  if (subtitlesBtn && cfg && !cfg.hasSiblingSubtitles) {
    subtitlesBtn.addEventListener('click', (event) => {
      event.preventDefault()
      triggerBlobDownload(cfg.subtitlesSrt || '', 'application/x-subrip;charset=utf-8', cfg.subtitlesFileName || 'subtitles.srt')
    })
  }

  function showToast(msg, ms = 2200) {
    const toastEl = document.getElementById('toast')
    if (!toastEl || !msg) return
    toastEl.textContent = msg
    toastEl.hidden = false
    setTimeout(() => { toastEl.hidden = true }, ms)
  }

  // --- Wave 3A: Ctrl/Cmd+K Instant Jump Search (Slides + [E#] Evidence) ---
  let jumpMatches = []
  let jumpSelected = 0
  function renderJumpResults(queryRaw) {
    if (!jumpResults) return
    const q = String(queryRaw || '').trim().toLowerCase()
    const items = []
    for (const ev of (cfg?.evidenceIndex || [])) {
      const hay = `${ev.id} ${ev.claim} ${ev.source}`.toLowerCase()
      if (q && !hay.includes(q)) continue
      if (q || (cfg?.evidenceIndex?.length && q.startsWith('e'))) {
        items.push({
          kind: 'evidence',
          slide: ev.slides?.[0] || 1,
          badge: `[${ev.id}]`,
          title: ev.claim || ev.source,
          meta: `${ev.source}${ev.slides?.length ? ` · P${ev.slides.join(', P')}` : ''}`,
        })
      }
    }
    const liveSlides = Array.from(document.querySelectorAll('.slide'))
    for (const s of (cfg?.searchIndex || [])) {
      const domEl = liveSlides[s.slide - 1]
      const domText = domEl ? `${domEl.textContent || ''} ${domEl.dataset?.notes || ''}` : ''
      const hay = `${s.slide} ${s.title} ${s.kicker} ${s.layout} ${(s.evidenceIds || []).join(' ')} ${domText}`.toLowerCase()
      if (q && !hay.includes(q)) continue
      items.push({
        kind: 'slide',
        slide: s.slide,
        badge: `P${String(s.slide).padStart(2, '0')}`,
        title: s.title,
        meta: [s.kicker, s.layout, (s.evidenceIds || []).map(id => `[${id}]`).join(' ')].filter(Boolean).join(' · '),
      })
    }
    jumpMatches = items.slice(0, 14)
    jumpSelected = 0
    if (jumpMatches.length === 0) {
      jumpResults.innerHTML = `<li class="dsh-jump-empty">${escape(cfg?.labels?.jumpEmpty || 'No matches')}</li>`
      return
    }
    jumpResults.innerHTML = jumpMatches.map((m, idx) =>
      `<li role="option" class="${idx === 0 ? 'is-selected' : ''}" data-jump-idx="${idx}"><span class="dsh-jump-badge${m.kind === 'evidence' ? ' is-ev' : ''}">${escape(m.badge)}</span><span class="dsh-jump-main"><strong>${escape(m.title)}</strong>${m.meta ? `<small>${escape(m.meta)}</small>` : ''}</span></li>`
    ).join('')
    jumpResults.querySelectorAll('[data-jump-idx]').forEach((li) => {
      li.addEventListener('click', () => {
        const hit = jumpMatches[Number(li.dataset.jumpIdx)]
        if (hit) { go(Math.max(0, Math.min(total - 1, hit.slide - 1))); setOverview(false); jumpDialog.close() }
      })
    })
  }
  function openJumpModal() {
    if (!jumpDialog) return
    if (jumpDialog.open) { jumpDialog.close(); return }
    if (jumpInput) jumpInput.value = ''
    renderJumpResults('')
    jumpDialog.showModal()
    if (jumpInput) setTimeout(() => jumpInput.focus(), 20)
  }
  if (jumpOpenBtn) jumpOpenBtn.addEventListener('click', openJumpModal)
  if (jumpCloseBtn && jumpDialog) jumpCloseBtn.addEventListener('click', () => jumpDialog.close())
  if (jumpInput) {
    jumpInput.addEventListener('input', () => renderJumpResults(jumpInput.value))
    jumpInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' && jumpMatches.length > 0) {
        e.preventDefault()
        jumpSelected = (jumpSelected + 1) % jumpMatches.length
        jumpResults.querySelectorAll('[data-jump-idx]').forEach((el, idx) => el.classList.toggle('is-selected', idx === jumpSelected))
      } else if (e.key === 'ArrowUp' && jumpMatches.length > 0) {
        e.preventDefault()
        jumpSelected = (jumpSelected - 1 + jumpMatches.length) % jumpMatches.length
        jumpResults.querySelectorAll('[data-jump-idx]').forEach((el, idx) => el.classList.toggle('is-selected', idx === jumpSelected))
      } else if (e.key === 'Enter' && jumpMatches[jumpSelected]) {
        e.preventDefault()
        const hit = jumpMatches[jumpSelected]
        go(Math.max(0, Math.min(total - 1, hit.slide - 1)))
        setOverview(false)
        jumpDialog.close()
      }
    })
  }

  // --- Wave 3B: 'D' Live Whiteboard Annotation Pen ---
  let drawActive = false
  let drawingStroke = null
  let penColor = '#EF4444'
  let penWidth = 4
  const strokesBySlide = new Map()
  const drawCtx = drawCanvas ? drawCanvas.getContext('2d') : null

  function resizeDrawCanvas() {
    if (!drawCanvas || !drawCtx) return
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    drawCanvas.width = Math.round(window.innerWidth * dpr)
    drawCanvas.height = Math.round(window.innerHeight * dpr)
    drawCanvas.style.width = window.innerWidth + 'px'
    drawCanvas.style.height = window.innerHeight + 'px'
    drawCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    redrawCanvas(current())
  }
  function redrawCanvas(slideIdx) {
    if (!drawCanvas || !drawCtx) return
    drawCtx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    const strokes = strokesBySlide.get(slideIdx) || []
    for (const st of strokes) {
      if (!st.pts || st.pts.length < 2) continue
      drawCtx.save()
      drawCtx.strokeStyle = st.color
      drawCtx.lineWidth = st.width
      drawCtx.lineCap = 'round'
      drawCtx.lineJoin = 'round'
      drawCtx.beginPath()
      drawCtx.moveTo(st.pts[0][0] * window.innerWidth, st.pts[0][1] * window.innerHeight)
      for (let i = 1; i < st.pts.length; i += 1) {
        drawCtx.lineTo(st.pts[i][0] * window.innerWidth, st.pts[i][1] * window.innerHeight)
      }
      drawCtx.stroke()
      drawCtx.restore()
    }
  }
  function setDrawActive(flag) {
    drawActive = Boolean(flag)
    if (drawCanvas) drawCanvas.classList.toggle('is-active', drawActive)
    if (drawBar) drawBar.hidden = !drawActive
    document.body.classList.toggle('draw-active', drawActive)
    if (drawActive) resizeDrawCanvas()
    showToast(drawActive ? cfg?.labels?.drawOn : cfg?.labels?.drawOff)
  }
  if (drawCanvas && drawCtx) {
    window.addEventListener('resize', resizeDrawCanvas)
    drawCanvas.addEventListener('pointerdown', (e) => {
      if (!drawActive) return
      drawCanvas.setPointerCapture?.(e.pointerId)
      const slideIdx = current()
      const list = strokesBySlide.get(slideIdx) || []
      drawingStroke = {
        color: penColor,
        width: penWidth,
        pts: [[e.clientX / Math.max(1, window.innerWidth), e.clientY / Math.max(1, window.innerHeight)]],
      }
      list.push(drawingStroke)
      strokesBySlide.set(slideIdx, list)
    })
    drawCanvas.addEventListener('pointermove', (e) => {
      if (!drawActive || !drawingStroke) return
      drawingStroke.pts.push([e.clientX / Math.max(1, window.innerWidth), e.clientY / Math.max(1, window.innerHeight)])
      redrawCanvas(current())
    })
    const finishStroke = () => { drawingStroke = null }
    drawCanvas.addEventListener('pointerup', finishStroke)
    drawCanvas.addEventListener('pointercancel', finishStroke)
  }
  if (drawBar) {
    drawBar.querySelectorAll('.dsh-pen-color').forEach((btn) => {
      btn.addEventListener('click', () => {
        penColor = btn.dataset.pen || '#EF4444'
        penWidth = Number(btn.dataset.width) || 4
        drawBar.querySelectorAll('.dsh-pen-color').forEach(b => b.classList.toggle('is-active', b === btn))
      })
    })
    document.getElementById('dsh-draw-undo')?.addEventListener('click', () => {
      const list = strokesBySlide.get(current())
      if (list && list.length > 0) { list.pop(); redrawCanvas(current()) }
    })
    document.getElementById('dsh-draw-clear')?.addEventListener('click', () => {
      strokesBySlide.set(current(), [])
      redrawCanvas(current())
    })
    document.getElementById('dsh-draw-exit')?.addEventListener('click', () => setDrawActive(false))
  }

  // --- Wave 3C: 'T' Q&A Countdown Timer Pill ---
  let qaPresetMins = 3
  let qaRemainSec = 180
  let qaRunning = false
  let qaInterval = null
  function renderQaTimer() {
    if (!qaReadout || !qaTimer) return
    const m = Math.floor(Math.max(0, qaRemainSec) / 60)
    const s = Math.max(0, qaRemainSec) % 60
    qaReadout.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
    qaTimer.classList.toggle('is-warn', qaRemainSec > 0 && qaRemainSec <= 30)
    qaTimer.classList.toggle('is-over', qaRemainSec === 0)
    if (qaToggleBtn) qaToggleBtn.textContent = qaRunning ? (cfg?.labels?.pause || 'Pause') : (cfg?.labels?.resume || 'Start')
  }
  function stopQaInterval() {
    if (qaInterval) { clearInterval(qaInterval); qaInterval = null }
    qaRunning = false
    renderQaTimer()
  }
  function startQaTimer() {
    if (qaRemainSec <= 0) qaRemainSec = qaPresetMins * 60
    if (qaInterval) clearInterval(qaInterval)
    qaRunning = true
    renderQaTimer()
    qaInterval = setInterval(() => {
      qaRemainSec = Math.max(0, qaRemainSec - 1)
      renderQaTimer()
      if (qaRemainSec === 0) {
        stopQaInterval()
        showToast(cfg?.labels?.qaFinished || 'Q&A finished', 3200)
      }
    }, 1000)
  }
  function toggleQaPill() {
    if (!qaTimer) return
    const willOpen = qaTimer.hidden
    qaTimer.hidden = !willOpen
    if (!willOpen) stopQaInterval()
    else renderQaTimer()
  }
  if (qaTimer) {
    qaTimer.querySelectorAll('.dsh-qa-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        qaPresetMins = Number(btn.dataset.mins) || 3
        qaRemainSec = qaPresetMins * 60
        stopQaInterval()
        qaTimer.querySelectorAll('.dsh-qa-preset').forEach(b => b.classList.toggle('is-active', b === btn))
      })
    })
    qaToggleBtn?.addEventListener('click', () => (qaRunning ? stopQaInterval() : startQaTimer()))
    qaResetBtn?.addEventListener('click', () => { qaRemainSec = qaPresetMins * 60; stopQaInterval() })
    qaCloseBtn?.addEventListener('click', () => { qaTimer.hidden = true; stopQaInterval() })
  }

  // --- Wave 3D: 'A' Narrated Auto-Tour + Live Subtitle Bar ---
  let tourActive = false
  let tourPaused = false
  let tourSpeed = 1
  let tourTimer = null
  function updateSubtitleBar(idx) {
    if (!subText) return
    const caption = cfg?.slideSubtitles?.[idx] || cfg?.slideCues?.[idx] || ''
    subText.textContent = caption || `Slide ${idx + 1} / ${total}`
  }
  function scheduleTourStep() {
    if (tourTimer) { clearTimeout(tourTimer); tourTimer = null }
    if (!tourActive || tourPaused) return
    const idx = current()
    updateSubtitleBar(idx)
    const rawSec = Number(cfg?.slideBudgets?.[idx]?.seconds) || 12
    const delayMs = Math.max(3000, Math.round((Math.min(24, Math.max(6, rawSec)) * 1000) / tourSpeed))
    tourTimer = setTimeout(() => {
      if (!tourActive || tourPaused) return
      const nextIdx = current() + 1
      if (nextIdx >= total) {
        stopAutoTour()
      } else {
        go(nextIdx)
        scheduleTourStep()
      }
    }, delayMs)
  }
  function stopAutoTour() {
    tourActive = false
    tourPaused = false
    if (tourTimer) { clearTimeout(tourTimer); tourTimer = null }
    if (subBar) subBar.hidden = true
    if (tourBtn) {
      tourBtn.setAttribute('aria-pressed', 'false')
      tourBtn.textContent = cfg?.labels?.autoTourStart || 'Auto-Tour'
    }
  }
  function startAutoTour() {
    tourActive = true
    tourPaused = false
    if (subBar) subBar.hidden = false
    if (tourBtn) {
      tourBtn.setAttribute('aria-pressed', 'true')
      tourBtn.textContent = cfg?.labels?.autoTourStop || 'Stop Tour'
    }
    if (subPauseBtn) subPauseBtn.textContent = cfg?.labels?.pause || 'Pause'
    scheduleTourStep()
  }
  tourBtn?.addEventListener('click', () => (tourActive ? stopAutoTour() : startAutoTour()))
  subStopBtn?.addEventListener('click', stopAutoTour)
  subPauseBtn?.addEventListener('click', () => {
    if (!tourActive) return
    tourPaused = !tourPaused
    subPauseBtn.textContent = tourPaused ? (cfg?.labels?.resume || 'Resume') : (cfg?.labels?.pause || 'Pause')
    if (tourPaused && tourTimer) { clearTimeout(tourTimer); tourTimer = null }
    else scheduleTourStep()
  })
  subSpeedBtn?.addEventListener('click', () => {
    tourSpeed = tourSpeed === 1 ? 2 : 1
    subSpeedBtn.textContent = tourSpeed + '×'
    if (tourActive && !tourPaused) scheduleTourStep()
  })

  // Phase 4 Dual-Screen Presenter Console (BroadcastChannel + window.opener.postMessage + Laser Pointer)
  let consoleWin = null
  let consoleInitSent = false
  let laserActive = false
  let bc = null
  try {
    if (typeof BroadcastChannel === 'function' && cfg?.channelId) {
      bc = new BroadcastChannel('dsh-ppt-presenter-' + cfg.channelId)
    }
  } catch (_) { bc = null }

  const slidesList = Array.from(document.querySelectorAll('.slide'))
  const notesOf = i => (slidesList[i] && slidesList[i].dataset ? (slidesList[i].dataset.notes || '') : '')
  const cueOf = i => (cfg?.slideCues?.[i] || '')
  const titleOf = i => {
    const el = slidesList[i] ? slidesList[i].querySelector('h1,h2,.statement-title,.quote-text') : null
    return el ? el.textContent.trim() : ''
  }
  const consoleOpen = () => { try { return !!(consoleWin && !consoleWin.closed) } catch (_) { return false } }

  function broadcast(payload) {
    if (bc) { try { bc.postMessage(payload) } catch (_) {} }
    if (consoleOpen()) { try { consoleWin.postMessage(payload, '*') } catch (_) {} }
  }

  function applyLaser(active, nx, ny) {
    laserActive = Boolean(active)
    if (!laserDot) return
    if (!laserActive || typeof nx !== 'number' || typeof ny !== 'number') {
      laserDot.style.display = 'none'
      return
    }
    laserDot.style.display = 'block'
    laserDot.style.left = (Math.max(0, Math.min(1, nx)) * 100) + '%'
    laserDot.style.top = (Math.max(0, Math.min(1, ny)) * 100) + '%'
  }

  function sendConsoleInit() {
    if (!consoleOpen()) return
    const styleEl = document.querySelector('style')
    broadcast({
      __dshPpt: 'init',
      title: cfg?.title || document.title,
      css: styleEl ? styleEl.textContent : '',
      total,
      slides: slidesList.map(s => s.outerHTML),
      cues: cfg?.slideCues || [],
      budgets: cfg?.slideBudgets || [],
    })
  }

  function sendConsoleState(idx) {
    const i = typeof idx === 'number' ? idx : current()
    const nxt = (i + 1) % total
    const rawNotes = notesOf(i)
    const fallbackCue = cueOf(i)
    broadcast({
      __dshPpt: 'state',
      index: i,
      total,
      title: titleOf(i),
      nextTitle: titleOf(nxt),
      notes: rawNotes,
      cue: fallbackCue,
      budget: cfg?.slideBudgets?.[i] || null,
      blank: document.body.classList.contains('blank-black') ? 'black' : (document.body.classList.contains('blank-white') ? 'white' : null),
      laser: laserActive,
    })
  }

  function presenterConsoleHtml() {
    const L = cfg?.labels || {}
    const channelName = cfg?.channelId ? ('dsh-ppt-presenter-' + cfg.channelId) : ''
    const targetSecs = (cfg?.targetMinutes || total || 5) * 60
    const cs = getComputedStyle(document.documentElement)
    const val = (name, fb) => { const v = cs.getPropertyValue(name).trim(); return v || fb }
    const css = [
      `:root{--bg:${val('--bg', '#0B1120')};--panel:${val('--panel', '#131C31')};--fg:${val('--fg', '#F1F5F9')};--muted:${val('--muted', '#94A3B8')};--accent:${val('--accent', '#3B82F6')};--accent2:${val('--accent2', '#10B981')};--font-heading:${val('--font-heading', 'sans-serif')};--font-body:${val('--font-body', 'sans-serif')}}`,
      '*{box-sizing:border-box}',
      'body{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font-body);height:100vh;display:flex;flex-direction:column;overflow:hidden}',
      'header{display:flex;align-items:center;gap:14px;padding:10px 18px;border-bottom:1px solid color-mix(in srgb,var(--muted) 35%,transparent);font-size:13px;color:var(--muted)}',
      'header #ptitle{color:var(--fg);font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      'main{flex:1;display:grid;grid-template-columns:1.18fr .82fr;gap:12px;padding:12px 16px;min-height:0}',
      '.col{display:flex;flex-direction:column;gap:10px;min-height:0}',
      '.card{background:var(--panel);border:1px solid color-mix(in srgb,var(--muted) 28%,transparent);border-radius:12px;padding:10px 12px;min-height:0;display:flex;flex-direction:column;gap:6px}',
      '.card-notes{flex:1}',
      '.lbl-row{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.lbl{color:var(--accent);font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}',
      '.cue-badge{font-size:11px;color:var(--muted);padding:2px 8px;border-radius:99px;border:1px solid color-mix(in srgb,var(--muted) 35%,transparent)}',
      '.cue-badge.is-over{color:#EF4444;border-color:#EF4444}.cue-badge.is-short{color:#F59E0B;border-color:#F59E0B}',
      '.pv{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:8px;background:var(--bg);border:1px solid color-mix(in srgb,var(--muted) 25%,transparent);--pv-scale:.3}',
      '.pv.laser-on{cursor:crosshair}',
      '.pv-slide{position:absolute;left:0;top:0;transform:translate(var(--pv-x,0px),var(--pv-y,0px)) scale(var(--pv-scale,.25));transform-origin:top left;pointer-events:none}',
      '.pv-slide .slide{display:flex !important;position:absolute;left:0;top:0;width:100vw;height:100vh;animation:none !important}',
      '.pv-slide .bullets li{opacity:1 !important;animation:none !important}',
      '#pv-laser-preview{position:absolute;width:12px;height:12px;border-radius:99px;background:#EF4444;box-shadow:0 0 10px 4px rgba(239,68,68,.65);transform:translate(-50%,-50%);pointer-events:none;display:none;z-index:20}',
      '#thumbs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}',
      '#thumbs .thumb{position:relative;flex:0 0 128px;aspect-ratio:16/9;border-radius:8px;overflow:hidden;border:1px solid color-mix(in srgb,var(--muted) 35%,transparent);cursor:pointer;background:var(--bg);--pv-scale:.09}',
      '#thumbs .thumb.is-current{outline:2px solid var(--accent);outline-offset:1px}',
      '#pnotes{font-size:var(--notes-size,20px);line-height:1.65;white-space:pre-wrap;overflow:auto;flex:1}',
      '.timers{display:flex;align-items:center;gap:14px;font-variant-numeric:tabular-nums}',
      '.timer-box{display:flex;flex-direction:column;line-height:1.15}',
      '.timer-lbl{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}',
      '#ptimer{font-size:20px;font-weight:700;color:var(--accent)}',
      '#ppace{font-size:18px;font-weight:700;color:var(--accent2)}',
      '#ppace.is-warn{color:#F59E0B}#ppace.is-over{color:#EF4444}',
      'footer{display:flex;align-items:center;gap:8px;padding:9px 16px;border-top:1px solid color-mix(in srgb,var(--muted) 35%,transparent);flex-wrap:wrap}',
      'button{background:color-mix(in srgb,var(--panel) 90%,transparent);color:var(--fg);border:1px solid color-mix(in srgb,var(--muted) 45%,transparent);border-radius:99px;padding:6px 12px;min-height:34px;font:inherit;font-size:13px;cursor:pointer}',
      'button:hover{border-color:var(--accent);color:var(--accent)}',
      'button[aria-pressed="true"]{background:var(--accent);color:var(--bg);border-color:var(--accent)}',
      '.bar{flex:1;min-width:90px;height:8px;background:color-mix(in srgb,var(--muted) 28%,transparent);border-radius:99px;overflow:hidden}',
      '#pprog{height:100%;width:0;background:var(--accent);transition:width .2s}',
      '.hint{color:var(--muted);font-size:11px;width:100%}',
    ].join('')
    const js = [
      `var total=0,index=0,elapsed=0,started=Date.now(),paused=false,notesSize=20,slides=[],cues=[],budgets=[],targetSecs=${targetSecs},curBlank=null,laserOn=false,initialized=false,readyTries=0;`,
      `var bc=null;try{if(typeof BroadcastChannel==="function"&&${JSON.stringify(channelName)})bc=new BroadcastChannel(${JSON.stringify(channelName)});}catch(_){bc=null;}`,
      'function q(id){return document.getElementById(id)}',
      'function post(m){try{if(bc)bc.postMessage(m)}catch(_){}try{if(window.opener)window.opener.postMessage(m,"*")}catch(_){}}',
      'function fmt(ms,signed){var neg=ms<0;var s=Math.floor(Math.abs(ms)/1000),m=Math.floor(s/60);s=s%60;var h=Math.floor(m/60);m=m%60;return (neg&&signed?"-":"")+(h>0?(h<10?"0":"")+h+":":"")+(m<10?"0":"")+m+":"+(s<10?"0":"")+s}',
      'function clock(){var d=new Date();return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+":"+("0"+d.getSeconds()).slice(-2)}',
      'function tick(){if(!paused)elapsed=Date.now()-started;q("ptimer").textContent=fmt(elapsed,false);var rem=targetSecs*1000-elapsed;var pe=q("ppace");pe.textContent=fmt(rem,true);pe.classList.toggle("is-warn",rem>0&&rem<60000);pe.classList.toggle("is-over",rem<=0);q("pclock").textContent=clock();if(window.requestAnimationFrame)requestAnimationFrame(tick);else setTimeout(tick,250)}',
      'function fitBox(box){var rw=box.clientWidth||320,rh=box.clientHeight||180;var vw=window.innerWidth||1280,vh=window.innerHeight||720;var s=Math.min(rw/vw,rh/vh);var ox=(rw-vw*s)/2,oy=(rh-vh*s)/2;box.style.setProperty("--pv-scale",String(s));box.style.setProperty("--pv-x",ox+"px");box.style.setProperty("--pv-y",oy+"px")}',
      'function fit(){fitBox(q("pv-cur"));fitBox(q("pv-next"));var th=q("thumbs").children;for(var i=0;i<th.length;i++){fitBox(th[i])}}',
      'function setSlide(box,html){var dot=box.id==="pv-cur"?q("pv-laser-preview"):null;box.innerHTML="";var f=document.createElement("div");f.className="pv-slide";f.innerHTML=html;box.appendChild(f);if(dot)box.appendChild(dot)}',
      'function buildThumbs(){var box=q("thumbs");box.innerHTML="";slides.forEach(function(html,i){var t=document.createElement("div");t.className="thumb";var f=document.createElement("div");f.className="pv-slide";f.innerHTML=html;t.appendChild(f);t.addEventListener("click",function(){post({__dshPpt:"cmd",kind:"go",index:i})});box.appendChild(t)});fit()}',
      'function renderState(st){index=st.index;total=st.total||total;q("pcounter").textContent=(index+1)+" / "+total;setSlide(q("pv-cur"),slides[index]||"");setSlide(q("pv-next"),slides[(index+1)%total]||"");var hasNotes=Boolean(st.notes&&st.notes.trim());var cue=st.cue||cues[index]||"";q("pcue-badge").style.display=(!hasNotes&&cue)?"inline-block":"none";var b=st.budget||budgets[index];var be=q("pslide-budget");if(b&&be){var txt=' + JSON.stringify(L.paceBudgetLabel || 'Budget') + '+" "+fmt((b.seconds||0)*1000,false);if(b.status==="over-budget")txt+=" · "+' + JSON.stringify(L.paceOverLabel || 'Over') + ';else if(b.status==="under-budget")txt+=" · "+' + JSON.stringify(L.paceShortLabel || 'Short') + ';be.textContent=txt;be.classList.toggle("is-over",b.status==="over-budget");be.classList.toggle("is-short",b.status==="under-budget");be.style.display="inline-block"}else if(be){be.style.display="none"}q("pnotes").textContent=hasNotes?st.notes:(cue||' + JSON.stringify(L.noNotes || 'No notes') + ');q("pprog").style.width=((index+1)/Math.max(1,total)*100)+"%";curBlank=st.blank||null;q("pv-black").setAttribute("aria-pressed",curBlank==="black"?"true":"false");q("pv-white").setAttribute("aria-pressed",curBlank==="white"?"true":"false");q("pv-black").textContent=curBlank==="black"?' + JSON.stringify(L.unblack || 'Unblack') + ':' + JSON.stringify(L.black || 'Black') + ';q("pv-white").textContent=curBlank==="white"?' + JSON.stringify(L.unwhite || 'Unwhite') + ':' + JSON.stringify(L.white || 'White') + ';if(typeof st.laser==="boolean"){laserOn=st.laser;syncLaserUi()}var th=q("thumbs").children;for(var i=0;i<th.length;i++){th[i].classList.toggle("is-current",i===index)}fit()}',
      'function syncLaserUi(){q("laser-btn").setAttribute("aria-pressed",laserOn?"true":"false");q("pv-cur").classList.toggle("laser-on",laserOn);if(!laserOn)q("pv-laser-preview").style.display="none"}',
      'function toggleLaser(){laserOn=!laserOn;syncLaserUi();post({__dshPpt:"cmd",kind:"laser",active:laserOn,x:0.5,y:0.5})}',
      'function togglePause(){paused=!paused;if(!paused)started=Date.now()-elapsed;var b=q("pause");b.setAttribute("aria-pressed",paused?"true":"false");b.textContent=paused?' + JSON.stringify(L.resume || 'Resume') + ':' + JSON.stringify(L.pause || 'Pause') + '}',
      'function resetTimer(){started=Date.now();elapsed=0}',
      'function applyNotesSize(){document.documentElement.style.setProperty("--notes-size",notesSize+"px")}',
      'function handleMsg(d){if(!d)return;if(d.__dshPpt==="init"&&!initialized){initialized=true;slides=d.slides||[];cues=d.cues||[];budgets=d.budgets||[];total=d.total||slides.length;var st=document.createElement("style");st.textContent=d.css||"";document.head.appendChild(st);q("ptitle").textContent=d.title||"";buildThumbs()}else if(d.__dshPpt==="state"){renderState(d)}else if(d.__dshPpt==="close"){window.close()}}',
      'window.addEventListener("message",function(e){handleMsg(e.data)});if(bc){bc.onmessage=function(e){handleMsg(e.data)}}',
      'window.addEventListener("resize",fit);',
      'window.addEventListener("beforeunload",function(){post({__dshPpt:"cmd",kind:"closed"})});',
      'q("pv-cur").addEventListener("mousemove",function(e){if(!laserOn)return;var r=this.getBoundingClientRect();var nx=(e.clientX-r.left)/Math.max(1,r.width),ny=(e.clientY-r.top)/Math.max(1,r.height);var dot=q("pv-laser-preview");dot.style.display="block";dot.style.left=(nx*100)+"%";dot.style.top=(ny*100)+"%";post({__dshPpt:"cmd",kind:"laser",active:true,x:nx,y:ny})});',
      'document.addEventListener("keydown",function(e){var k=e.key;if(k==="ArrowRight"||k===" "){e.preventDefault();post({__dshPpt:"cmd",kind:"go",delta:1})}else if(k==="ArrowLeft"){e.preventDefault();post({__dshPpt:"cmd",kind:"go",delta:-1})}else if(k==="Escape"){post({__dshPpt:"cmd",kind:"end"});window.close()}else if(k.toLowerCase()==="p"){togglePause()}else if(k.toLowerCase()==="t"){resetTimer()}else if(k.toLowerCase()==="l"){toggleLaser()}else if(k==="+"||k==="="){notesSize=Math.min(38,notesSize+2);applyNotesSize()}else if(k==="-"){notesSize=Math.max(12,notesSize-2);applyNotesSize()}else if(k.toLowerCase()==="b"){post({__dshPpt:"cmd",kind:"blank",color:curBlank==="black"?null:"black"})}else if(k.toLowerCase()==="w"){post({__dshPpt:"cmd",kind:"blank",color:curBlank==="white"?null:"white"})}});',
      'q("prev").addEventListener("click",function(){post({__dshPpt:"cmd",kind:"go",delta:-1})});',
      'q("next").addEventListener("click",function(){post({__dshPpt:"cmd",kind:"go",delta:1})});',
      'q("pause").addEventListener("click",togglePause);',
      'q("reset").addEventListener("click",resetTimer);',
      'q("font-plus").addEventListener("click",function(){notesSize=Math.min(38,notesSize+2);applyNotesSize()});',
      'q("font-minus").addEventListener("click",function(){notesSize=Math.max(12,notesSize-2);applyNotesSize()});',
      'q("laser-btn").addEventListener("click",toggleLaser);',
      'q("pv-black").addEventListener("click",function(){post({__dshPpt:"cmd",kind:"blank",color:curBlank==="black"?null:"black"})});',
      'q("pv-white").addEventListener("click",function(){post({__dshPpt:"cmd",kind:"blank",color:curBlank==="white"?null:"white"})});',
      'q("end").addEventListener("click",function(){post({__dshPpt:"cmd",kind:"end"});window.close()});',
      'applyNotesSize();tick();function ready(){if(initialized)return;post({__dshPpt:"ready"});readyTries++;if(readyTries<6)setTimeout(ready,400)}setTimeout(ready,80);',
    ].join('')
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + escape(cfg?.title || '') + ' · ' + escape(L.presenterTitle || 'Presenter Console') + '</title><style>' + css + '</style></head><body>'
      + '<header><div id="ptitle"></div><div id="pcounter"></div><div id="pclock"></div></header>'
      + '<main><div class="col">'
      + '<div class="card"><div class="lbl-row"><span class="lbl">' + escape(L.currentSlide || 'CURRENT') + '</span></div><div class="pv" id="pv-cur"><div id="pv-laser-preview"></div></div></div>'
      + '<div class="card"><div class="lbl">' + escape(L.nextSlide || 'NEXT') + '</div><div class="pv" id="pv-next"></div></div>'
      + '<div class="card"><div class="lbl">SLIDES</div><div id="thumbs"></div></div>'
      + '</div><div class="col"><div class="card card-notes"><div class="lbl-row"><span class="lbl">' + escape(L.teleprompter || 'TELEPROMPTER') + '</span><span style="display:flex;gap:6px;align-items:center"><span id="pslide-budget" class="cue-badge" style="display:none"></span><span id="pcue-badge" class="cue-badge" style="display:none">' + escape(L.autoCueBadge || 'Auto cue') + '</span></span></div><div id="pnotes"></div></div></div></main>'
      + '<footer>'
      + '<button id="prev">◀</button><button id="next">▶</button>'
      + '<button id="pause" aria-pressed="false">' + escape(L.pause || 'Pause') + '</button>'
      + '<button id="reset">' + escape(L.reset || 'Reset') + '</button>'
      + '<button id="font-minus">A−</button><button id="font-plus">A+</button>'
      + '<button id="laser-btn" aria-pressed="false">' + escape(L.laser || 'Laser (L)') + '</button>'
      + '<button id="pv-black">' + escape(L.black || 'Black') + '</button>'
      + '<button id="pv-white">' + escape(L.white || 'White') + '</button>'
      + '<button id="end">' + escape(L.endShow || 'End') + '</button>'
      + '<div class="timers"><div class="timer-box"><span class="timer-lbl">' + escape(L.elapsed || 'Elapsed') + '</span><span id="ptimer">00:00</span></div>'
      + '<div class="timer-box"><span class="timer-lbl">' + escape(L.remaining || 'Remaining') + '</span><span id="ppace">05:00</span></div></div>'
      + '<div class="bar"><div id="pprog"></div></div>'
      + '<div class="hint">' + escape(L.hint || '') + '</div></footer>'
      + '<scr' + 'ipt>' + js + '</scr' + 'ipt></body></html>'
  }

  function closeConsole() {
    if (consoleOpen()) {
      try { consoleWin.postMessage({ __dshPpt: 'close' }, '*'); consoleWin.close() } catch (_) {}
    }
    broadcast({ __dshPpt: 'close' })
    document.body.classList.remove('presenting', 'blank-black', 'blank-white')
    consoleInitSent = false
  }

  function openConsole() {
    if (consoleOpen()) { try { consoleWin.focus() } catch (_) {} return }
    consoleInitSent = false
    const html = presenterConsoleHtml()
    consoleWin = window.open('', 'dsh-ppt-presenter', 'width=1120,height=760')
    if (!consoleWin) {
      try {
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
        consoleWin = window.open(url, 'dsh-ppt-presenter', 'width=1120,height=760')
      } catch (_) {}
    } else {
      try {
        consoleWin.document.open()
        consoleWin.document.write(html)
        consoleWin.document.close()
      } catch (_) {}
    }
    if (!consoleWin) {
      const toastEl = document.getElementById('toast')
      if (toastEl && cfg?.labels?.popupBlocked) {
        toastEl.textContent = cfg.labels.popupBlocked
        toastEl.hidden = false
        setTimeout(() => { toastEl.hidden = true }, 2600)
      }
      return
    }
    document.body.classList.add('presenting')
    setTimeout(() => {
      if (!consoleInitSent) {
        consoleInitSent = true
        sendConsoleInit()
        sendConsoleState()
      }
    }, 120)
  }

  function handleConsoleCommand(data) {
    if (!data || typeof data !== 'object') return
    if (data.__dshPpt === 'ready') {
      if (!consoleInitSent) { consoleInitSent = true; sendConsoleInit() }
      sendConsoleState()
      return
    }
    if (data.__dshPpt !== 'cmd') return
    if (data.kind === 'end' || data.kind === 'closed') {
      closeConsole()
      return
    }
    if (data.kind === 'go') {
      document.body.classList.remove('blank-black', 'blank-white')
      if (typeof data.index === 'number') go(data.index)
      else go(current() + (data.delta || 0))
      sendConsoleState()
    } else if (data.kind === 'blank') {
      document.body.classList.remove('blank-black', 'blank-white')
      if (data.color === 'black') document.body.classList.add('blank-black')
      else if (data.color === 'white') document.body.classList.add('blank-white')
      sendConsoleState()
    } else if (data.kind === 'laser') {
      applyLaser(data.active, data.x, data.y)
    }
  }

  window.addEventListener('message', event => {
    if (consoleWin && event.source === consoleWin) handleConsoleCommand(event.data)
  })
  if (bc) {
    bc.onmessage = event => handleConsoleCommand(event.data)
  }

  // Register unified toggle hook for deck-core.mjs (#presenter-toggle / P / V)
  window.__dshTogglePresenter = () => {
    if (consoleOpen()) closeConsole()
    else openConsole()
  }

  // Live Presenter Hotkeys: Ctrl/Cmd+K (Jump Search), L (Laser), D (Whiteboard Draw), T (Q&A Timer), A (Auto-Tour)
  document.addEventListener('keydown', event => {
    const targetEl = event.target
    const lower = String(event.key || '').toLowerCase()
    if ((event.ctrlKey || event.metaKey) && lower === 'k') {
      event.preventDefault()
      openJumpModal()
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (targetEl && (['INPUT', 'SELECT', 'TEXTAREA'].includes(targetEl.tagName) || targetEl.isContentEditable === true)) return
    const dataPanel = document.getElementById('data-panel')
    if (panel.open || (jumpDialog && jumpDialog.open) || (dataPanel && dataPanel.open)) return
    if (lower === 'l') {
      event.preventDefault()
      laserActive = !laserActive
      applyLaser(laserActive, 0.5, 0.5)
      document.body.classList.toggle('laser-active', laserActive)
      sendConsoleState()
      showToast(laserActive ? cfg?.labels?.laserOn : cfg?.labels?.laserOff)
    } else if (lower === 'd') {
      if (dataPanel && !drawActive && !event.shiftKey) return
      event.preventDefault()
      setDrawActive(!drawActive)
    } else if (lower === 'z' && drawActive) {
      event.preventDefault()
      const list = strokesBySlide.get(current())
      if (list && list.length > 0) { list.pop(); redrawCanvas(current()) }
    } else if (lower === 'c' && drawActive) {
      event.preventDefault()
      strokesBySlide.set(current(), [])
      redrawCanvas(current())
    } else if (lower === 't') {
      event.preventDefault()
      toggleQaPill()
    } else if (lower === 'a') {
      event.preventDefault()
      if (tourActive) stopAutoTour()
      else startAutoTour()
    } else if (lower === 'r') {
      event.preventDefault()
      toggleCommentsDrawer()
    } else if (lower === 'escape') {
      if (commentsDrawer && !commentsDrawer.hidden) { event.preventDefault(); toggleCommentsDrawer(false); return }
      if (drawActive) { event.preventDefault(); setDrawActive(false); return }
      if (laserActive) {
        applyLaser(false)
        document.body.classList.remove('laser-active')
        sendConsoleState()
      }
      if (tourActive) stopAutoTour()
    }
  })

  document.addEventListener('mousemove', event => {
    if (!laserActive) return
    const nx = event.clientX / Math.max(1, window.innerWidth)
    const ny = event.clientY / Math.max(1, window.innerHeight)
    applyLaser(true, nx, ny)
  })

  return index => {
    number.value = String(index + 1)
    previous.disabled = index === 0
    next.disabled = index === total - 1
    if (consoleOpen()) sendConsoleState(index)
    if (drawActive || strokesBySlide.has(index)) redrawCanvas(index)
    if (tourActive) updateSubtitleBar(index)
    if (commentsDrawer && !commentsDrawer.hidden) updateCommentsContext(index)
  }
}

const DELIVERY_CSS = `
#hud button:disabled{opacity:.4;cursor:default}
#page-number{width:56px;padding:7px;border:1px solid var(--muted);border-radius:8px;background:var(--panel);color:var(--fg);font:inherit}
#delivery-bar{position:fixed;top:18px;left:22px;right:22px;z-index:45;display:flex;align-items:center;gap:12px;font-size:13px}
#delivery-status{flex:1;color:var(--muted)}
#delivery-bar a,#delivery-bar button,.review-exports a{display:inline-block;text-decoration:none;border:1px solid var(--muted);border-radius:99px;padding:9px 14px;background:var(--panel);color:var(--fg);font:inherit;cursor:pointer}
#delivery-bar a:hover,#delivery-bar button:hover,.review-exports a:hover{border-color:var(--accent);color:var(--accent)}
#delivery-bar #download-pptx{background:var(--accent);color:var(--bg);border-color:var(--accent)}
#dsh-laser-dot{position:fixed;z-index:95;width:16px;height:16px;border-radius:99px;background:#EF4444;box-shadow:0 0 14px 6px rgba(239,68,68,.75);pointer-events:none;transform:translate(-50%,-50%);display:none}
body.laser-active{cursor:crosshair}
#dsh-draw-canvas{position:fixed;inset:0;z-index:88;pointer-events:none;touch-action:none}
#dsh-draw-canvas.is-active{pointer-events:auto;cursor:crosshair}
#dsh-draw-bar{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:94;display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:99px;background:color-mix(in srgb,var(--panel) 94%,transparent);border:1px solid var(--accent);box-shadow:0 10px 30px rgba(0,0,0,.35);backdrop-filter:blur(8px)}
#dsh-draw-bar[hidden]{display:none}
.dsh-pen-color{width:20px;height:20px;border-radius:99px;background:var(--swatch);border:2px solid transparent;cursor:pointer;padding:0}
.dsh-pen-color.is-active{border-color:#FFF;box-shadow:0 0 0 2px var(--accent)}
#dsh-draw-bar button:not(.dsh-pen-color){border:1px solid var(--muted);border-radius:99px;background:var(--bg);color:var(--fg);padding:4px 10px;font-size:12px;cursor:pointer}
#dsh-qa-timer{position:fixed;top:64px;right:22px;z-index:92;display:flex;align-items:center;gap:7px;padding:8px 13px;border-radius:99px;background:color-mix(in srgb,var(--panel) 95%,transparent);border:1px solid var(--accent);box-shadow:0 10px 28px rgba(0,0,0,.32);font-size:12.5px;font-variant-numeric:tabular-nums}
#dsh-qa-timer[hidden]{display:none}
#dsh-qa-timer.is-warn{border-color:#F59E0B}
#dsh-qa-timer.is-warn #dsh-qa-readout{color:#F59E0B}
#dsh-qa-timer.is-over{border-color:#EF4444}
#dsh-qa-timer.is-over #dsh-qa-readout{color:#EF4444}
.dsh-qa-lbl{font-weight:700;color:var(--accent);font-size:11px;letter-spacing:.08em}
#dsh-qa-readout{font-size:16px;font-weight:800;min-width:52px;text-align:center}
#dsh-qa-timer button{border:1px solid color-mix(in srgb,var(--muted) 45%,transparent);border-radius:99px;background:var(--bg);color:var(--fg);padding:3px 8px;font-size:11.5px;cursor:pointer}
#dsh-qa-timer button.is-active{background:var(--accent);color:var(--bg);border-color:var(--accent)}
#dsh-sub-bar{position:fixed;bottom:76px;left:50%;transform:translateX(-50%);z-index:90;max-width:min(820px,calc(100vw - 36px));display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:14px;background:rgba(15,23,42,.9);color:#F8FAFC;border:1px solid rgba(255,255,255,.16);box-shadow:0 12px 32px rgba(0,0,0,.38);backdrop-filter:blur(8px)}
#dsh-sub-bar[hidden]{display:none}
#dsh-sub-text{font-size:15px;line-height:1.45;font-weight:500}
.dsh-sub-ctrl{display:flex;gap:6px;flex-shrink:0}
.dsh-sub-ctrl button{border:1px solid rgba(255,255,255,.28);border-radius:99px;background:rgba(255,255,255,.1);color:#F8FAFC;padding:4px 9px;font-size:11.5px;cursor:pointer}
#dsh-jump-dialog{background:var(--panel);color:var(--fg);border:1px solid var(--accent);border-radius:16px;width:min(620px,calc(100vw - 24px));max-height:76vh;padding:16px;box-shadow:0 20px 54px rgba(0,0,0,.45)}
#dsh-jump-dialog::backdrop{background:rgba(0,0,0,.55);backdrop-filter:blur(3px)}
.dsh-jump-head{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;color:var(--muted);margin-bottom:10px}
.dsh-jump-head button{border:1px solid var(--muted);border-radius:8px;background:transparent;color:var(--fg);padding:3px 8px;font-size:11px;cursor:pointer}
#dsh-jump-input{width:100%;padding:11px 14px;border-radius:10px;border:1px solid var(--muted);background:var(--bg);color:var(--fg);font:inherit;font-size:15px;margin-bottom:10px}
#dsh-jump-results{list-style:none;margin:0;padding:0;max-height:48vh;overflow:auto;display:flex;flex-direction:column;gap:6px}
#dsh-jump-results li{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:10px;background:var(--bg);border:1px solid transparent;cursor:pointer}
#dsh-jump-results li:hover,#dsh-jump-results li.is-selected{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--bg))}
.dsh-jump-badge{font-size:11px;font-weight:800;padding:2px 7px;border-radius:6px;background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent);flex-shrink:0}
.dsh-jump-badge.is-ev{background:rgba(16,185,129,.18);color:#10B981}
.dsh-jump-main{display:flex;flex-direction:column;min-width:0}
.dsh-jump-main strong{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-jump-main small{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsh-jump-empty{color:var(--muted);justify-content:center;cursor:default!important}
#review-panel{background:var(--panel);color:var(--fg);border:1px solid var(--muted);border-radius:18px;width:min(620px,calc(100vw - 24px));max-height:85vh;padding:24px;overflow:auto}
#review-panel::backdrop{background:rgba(0,0,0,.65)}
.review-head{display:flex;justify-content:space-between;align-items:center;gap:16px}
.review-head h2{margin:0;font-size:24px}
#review-close{border:1px solid var(--muted);border-radius:10px;background:transparent;color:var(--fg);padding:8px 12px;font:inherit;cursor:pointer}
#review-panel p{line-height:1.65;color:var(--muted)}
#review-panel h3{margin:24px 0 10px;font-size:17px}
#review-panel ul,#review-panel ol{list-style:none;padding:0;margin:0}
#review-panel li+li{margin-top:8px}
#review-panel li button{width:100%;text-align:left;display:flex;gap:12px;align-items:center;background:var(--bg);color:var(--fg);border:1px solid transparent;border-radius:10px;padding:12px;font:inherit;cursor:pointer}
#review-panel li button:hover{border-color:var(--accent)}
#review-issues li button{display:block}
#review-issues strong,#review-issues span{display:block;line-height:1.6}
#review-issues span{color:var(--muted);font-size:13px;margin-top:4px}
.review-exports{display:flex;flex-wrap:wrap;gap:8px}
body.presenting #delivery-bar{display:none}
button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
@media(max-width:640px){
  #delivery-bar{left:10px;right:10px;top:10px;gap:8px}
  #delivery-status{display:none}
  #delivery-bar a,#delivery-bar button{padding:10px 12px;min-height:44px}
  #hud button{padding:9px 12px}
  #notes-panel,#help-panel{bottom:160px}
  #review-panel{padding:18px}
}
#dsh-review-comments{position:fixed;top:64px;right:22px;z-index:93;width:min(360px,calc(100vw - 24px));max-height:74vh;display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:14px;background:color-mix(in srgb,var(--panel) 97%,transparent);color:var(--fg);border:1px solid var(--accent);box-shadow:0 18px 46px rgba(0,0,0,.38);backdrop-filter:blur(8px);overflow:hidden}
#dsh-review-comments[hidden]{display:none}
.dsh-rc-head{display:flex;justify-content:space-between;align-items:center;font-size:13px}
.dsh-rc-head button{border:1px solid var(--muted);border-radius:8px;background:transparent;color:var(--fg);padding:2px 7px;cursor:pointer}
.dsh-rc-ctx{font-size:12px;font-weight:700;color:var(--accent)}
#dsh-rc-author,#dsh-rc-input{width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--muted);background:var(--bg);color:var(--fg);font:inherit;font-size:12.5px}
.dsh-rc-actions{display:flex;gap:8px}
.dsh-rc-actions button{flex:1;padding:7px 10px;border-radius:8px;border:1px solid var(--accent);background:var(--accent);color:var(--bg);font:inherit;font-size:12px;font-weight:700;cursor:pointer}
#dsh-rc-export{background:var(--bg);color:var(--fg);border-color:var(--muted)}
#dsh-rc-list{list-style:none;margin:0;padding:0;overflow:auto;display:flex;flex-direction:column;gap:6px;max-height:30vh}
#dsh-rc-list li{display:flex;gap:6px;align-items:flex-start;background:var(--bg);border:1px solid color-mix(in srgb,var(--muted) 30%,transparent);border-radius:8px;padding:7px 8px;font-size:12px}
.dsh-rc-jump{flex:1;text-align:left;background:transparent;border:0;color:var(--fg);font:inherit;cursor:pointer;padding:0;line-height:1.4}
.dsh-rc-del{background:transparent;border:0;color:var(--muted);cursor:pointer;padding:0 4px}
.dsh-rc-empty{color:var(--muted);justify-content:center}
@media print{#delivery-bar,#review-panel,#dsh-review-comments,#dsh-laser-dot,#dsh-draw-canvas,#dsh-draw-bar,#dsh-qa-timer,#dsh-sub-bar,#dsh-jump-dialog{display:none!important}}
`

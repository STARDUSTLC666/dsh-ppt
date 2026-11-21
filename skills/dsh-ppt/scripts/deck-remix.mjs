/**
 * deck-remix.mjs —— 多受众智能压缩改编引擎（Remix）与自包含小红书/LinkedIn 社媒长图卡片导出器（4:5 / 1:1）。
 *
 * 零新增运行时依赖：
 *   1. `remixSlides(manifest, presetId, lang)`：面向高管 5 分钟（exec-5min）、董事会汇报（board-brief）、
 *      客户方案推演（sales-pitch）三大受众预设，确定性提取高信息密度页面并保持原叙事顺序；
 *      所有被折叠页面的核心结论与要点无损归档至邻近保留页的演讲者备注（Zero-Data-Loss）。
 *   2. `renderSocialCarouselHtml(manifest, { ratio, lang })`：将 16:9 演示文稿一键重排为
 *      自包含可交互、可打印的 4:5 竖版 / 1:1 方形社媒轮播卡片 HTML（支持实时切换画幅比例）。
 */

import { deriveBrandedTheme } from './deck-themes.mjs'
import { escapeHtml, stripInlineMarkdown } from './deck-chrome.mjs'

export const REMIX_PRESETS = Object.freeze({
  'exec-5min': Object.freeze({
    id: 'exec-5min',
    nameZh: '高管 5 分钟速览',
    nameEn: 'Executive 5-Min Brief',
    targetSlides: 6,
    targetMinutes: 5,
    descriptionZh: '浓缩至 6 页高密决策版：封面 + 关键指标/图表/对比/战略要点 + 行动封底，被折叠页要点自动归档到备注。',
    descriptionEn: 'Compresses to 6 high-signal decision slides with omitted points archived into speaker notes.',
    weights: {
      kpi: 95,
      chart: 92,
      'chart-split': 92,
      waterfall: 90,
      map: 88,
      isometric: 85,
      comparison: 84,
      callout: 82,
      matrix: 80,
      gantt: 76,
      table: 74,
      harvey: 74,
      marimekko: 78,
      sankey: 78,
      cards: 70,
      process: 66,
      statement: 62,
      bullets: 52,
      agenda: 12,
      section: 8,
    },
  }),
  'board-brief': Object.freeze({
    id: 'board-brief',
    nameZh: '董事会深度汇报',
    nameEn: 'Board Governance Brief',
    targetSlides: 8,
    targetMinutes: 8,
    descriptionZh: '浓缩至 8 页治理版：优先保留财务/KPI、图表、地图、表格、甘特排期与证据溯源页。',
    descriptionEn: 'Compresses to 8 governance slides prioritizing KPIs, charts, tables, roadmaps, and evidence.',
    weights: {
      kpi: 94,
      waterfall: 93,
      chart: 90,
      'chart-split': 90,
      table: 88,
      harvey: 86,
      gantt: 85,
      map: 84,
      marimekko: 84,
      sankey: 82,
      comparison: 80,
      matrix: 78,
      isometric: 76,
      callout: 72,
      cards: 68,
      process: 64,
      bullets: 55,
      agenda: 28,
      section: 10,
    },
  }),
  'sales-pitch': Object.freeze({
    id: 'sales-pitch',
    nameZh: '客户方案路演',
    nameEn: 'Client Sales Pitch',
    targetSlides: 7,
    targetMinutes: 7,
    descriptionZh: '浓缩至 7 页成交路演版：强化痛点对比、产品原型/架构图、标杆收益与落地路径。',
    descriptionEn: 'Compresses to 7 pitch slides emphasizing contrast, product visuals, proof metrics, and CTA.',
    weights: {
      comparison: 94,
      mockup: 92,
      isometric: 90,
      kpi: 90,
      map: 86,
      cards: 84,
      'image-right': 84,
      'image-left': 84,
      image: 82,
      statement: 82,
      quote: 80,
      'chart-split': 80,
      chart: 78,
      process: 76,
      callout: 74,
      gantt: 70,
      bullets: 50,
      agenda: 18,
      section: 10,
    },
  }),
})

export const REMIX_PRESET_IDS = Object.freeze(Object.keys(REMIX_PRESETS))

const METRIC_SIGNAL_RE = /\d+(?:\.\d+)?\s*(?:%|％|亿|万|倍|x|X|ms|pp|bps|B|M|K|\+)/

function scoreBodySlide(slide, preset, index, total) {
  const layout = slide?.layout || 'bullets'
  let score = preset.weights[layout] ?? 58
  const plain = [
    slide?.title,
    slide?.subtitle,
    slide?.takeaway,
    ...(Array.isArray(slide?.bullets) ? slide.bullets : []),
    ...(Array.isArray(slide?.items) ? slide.items.map(it => `${it?.value || ''} ${it?.title || ''} ${it?.text || ''}`) : []),
  ].filter(Boolean).map(v => stripInlineMarkdown(String(v))).join(' ')

  if (METRIC_SIGNAL_RE.test(plain)) score += 14
  if (slide?.takeaway && String(slide.takeaway).trim()) score += 8
  if (Array.isArray(slide?.evidenceIds) && slide.evidenceIds.length > 0) score += 10
  if (slide?.chart) score += 12
  if (slide?.image || (Array.isArray(slide?.images) && slide.images.length > 0)) score += 10
  // Preserve executive narrative spread: slight boost for opening body and near-final summary slides
  if (index === 1 || index === total - 2) score += 4
  return score
}

function summarizeOmittedSlide(slide, originalPageNumber, isEn) {
  const title = stripInlineMarkdown(slide?.title || (isEn ? `Slide ${originalPageNumber}` : `第 ${originalPageNumber} 页`))
  const snippets = []
  if (slide?.takeaway) snippets.push(stripInlineMarkdown(slide.takeaway))
  if (Array.isArray(slide?.bullets) && slide.bullets.length > 0) {
    snippets.push(...slide.bullets.slice(0, 2).map(b => stripInlineMarkdown(b)))
  } else if (Array.isArray(slide?.items) && slide.items.length > 0) {
    snippets.push(...slide.items.slice(0, 2).map(it => stripInlineMarkdown([it?.value, it?.title, it?.text].filter(Boolean).join(' '))))
  } else if (slide?.subtitle) {
    snippets.push(stripInlineMarkdown(slide.subtitle))
  }
  const detail = snippets.filter(Boolean).join('；').slice(0, 140)
  return `- [P${originalPageNumber}] ${title}${detail ? `：${detail}` : ''}`
}

/**
 * Deterministically remix a deck's slides for a target audience preset without losing omitted insights.
 */
export function remixSlides(manifest, presetId = 'exec-5min', langOverride) {
  const key = String(presetId || 'exec-5min').trim().toLowerCase()
  const preset = REMIX_PRESETS[key]
  if (!preset) {
    throw new Error('dsh-ppt：未知改编预设 remixPreset "' + key + '"，可选：' + REMIX_PRESET_IDS.join(' / '))
  }
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  const isEn = (langOverride || manifest?.language) === 'en'
  if (slides.length <= preset.targetSlides) {
    return {
      preset,
      targetMinutes: preset.targetMinutes,
      slides: slides.map(s => structuredClone(s)),
      report: {
        presetId: preset.id,
        originalCount: slides.length,
        remixedCount: slides.length,
        keptOriginalIndices: slides.map((_, idx) => idx + 1),
        foldedCount: 0,
        foldedSlides: [],
      },
    }
  }

  const fixedIndices = new Set()
  if (slides[0]?.layout === 'cover') fixedIndices.add(0)
  const lastIdx = slides.length - 1
  if (lastIdx > 0 && slides[lastIdx]?.layout === 'closing') fixedIndices.add(lastIdx)
  // Keep evidence appendix on board-brief when present
  if (preset.id === 'board-brief') {
    const appendixIdx = slides.findIndex((s, i) => !fixedIndices.has(i) && s?.layout === 'table' && /证据|溯源|evidence|source/i.test(`${s?.kicker || ''} ${s?.title || ''}`))
    if (appendixIdx >= 0) fixedIndices.add(appendixIdx)
  }

  const bodyBudget = Math.max(2, preset.targetSlides - fixedIndices.size)
  const scoredBody = []
  slides.forEach((slide, idx) => {
    if (fixedIndices.has(idx)) return
    scoredBody.push({
      idx,
      score: scoreBodySlide(slide, preset, idx, slides.length),
    })
  })

  scoredBody.sort((a, b) => b.score - a.score || a.idx - b.idx)
  const keptSet = new Set(fixedIndices)
  for (const entry of scoredBody.slice(0, bodyBudget)) {
    keptSet.add(entry.idx)
  }

  const keptIndices = [...keptSet].sort((a, b) => a - b)
  const outSlides = keptIndices.map((origIdx) => structuredClone(slides[origIdx]))
  const foldedByTarget = new Map()
  const foldedSlides = []

  slides.forEach((slide, origIdx) => {
    if (keptSet.has(origIdx)) return
    // Attach omitted slide digest to the nearest preceding kept slide (or slide 0)
    let targetPos = 0
    for (let k = keptIndices.length - 1; k >= 0; k -= 1) {
      if (keptIndices[k] < origIdx) {
        targetPos = k
        break
      }
    }
    const digest = summarizeOmittedSlide(slide, origIdx + 1, isEn)
    if (!foldedByTarget.has(targetPos)) foldedByTarget.set(targetPos, [])
    foldedByTarget.get(targetPos).push(digest)
    foldedSlides.push({
      originalSlide: origIdx + 1,
      title: stripInlineMarkdown(slide?.title || ''),
      foldedIntoSlide: targetPos + 1,
    })
  })

  const foldHeader = isEn
    ? `[Condensed Backup · ${preset.nameEn}]`
    : `[压缩归档 · ${preset.nameZh}]`
  for (const [targetPos, lines] of foldedByTarget.entries()) {
    const existing = String(outSlides[targetPos].notes || '').trim()
    const block = `${foldHeader}\n${lines.join('\n')}`
    outSlides[targetPos].notes = existing ? `${existing}\n\n${block}` : block
  }

  return {
    preset,
    targetMinutes: preset.targetMinutes,
    slides: outSlides,
    report: {
      presetId: preset.id,
      originalCount: slides.length,
      remixedCount: outSlides.length,
      keptOriginalIndices: keptIndices.map(i => i + 1),
      foldedCount: foldedSlides.length,
      foldedSlides,
    },
  }
}

// ---------------------------------------------------------------------------
// Self-Contained Social Carousel HTML Renderer (4:5 Xiaohongshu/LinkedIn & 1:1)
// ---------------------------------------------------------------------------

function renderSocialSlideBody(slide, manifest, isEn) {
  const layout = slide?.layout || 'bullets'
  const parts = []

  if (slide.subtitle && layout !== 'cover' && layout !== 'closing') {
    parts.push(`<p class="sc-sub">${escapeHtml(stripInlineMarkdown(slide.subtitle))}</p>`)
  }

  if (layout === 'cover' || layout === 'closing' || layout === 'section') {
    if (slide.subtitle) {
      parts.push(`<p class="sc-hero-sub">${escapeHtml(stripInlineMarkdown(slide.subtitle))}</p>`)
    }
    if (Array.isArray(slide.items) && slide.items.length > 0) {
      parts.push('<div class="sc-cta-list">' + slide.items.slice(0, 3).map((it, i) => `
        <div class="sc-cta-item">
          <span class="sc-tag">${escapeHtml(it.tag || `0${i + 1}`)}</span>
          <div><strong>${escapeHtml(stripInlineMarkdown(it.title || ''))}</strong>${it.text ? `<p>${escapeHtml(stripInlineMarkdown(it.text))}</p>` : ''}</div>
        </div>
      `).join('') + '</div>')
    }
    return parts.join('')
  }

  if (slide.image?.assetId && manifest?.assets?.[slide.image.assetId]?.data) {
    parts.push(`<figure class="sc-fig"><img src="${escapeHtml(manifest.assets[slide.image.assetId].data)}" alt="${escapeHtml(slide.image.alt || slide.title || '')}"/>${slide.image.caption ? `<figcaption>${escapeHtml(stripInlineMarkdown(slide.image.caption))}</figcaption>` : ''}</figure>`)
  }

  if (slide.chart && Array.isArray(slide.chart.categories) && Array.isArray(slide.chart.series) && slide.chart.series[0]?.values) {
    const cats = slide.chart.categories.slice(0, 6)
    const vals = slide.chart.series[0].values.slice(0, 6).map(Number)
    const maxVal = Math.max(1, ...vals.map(v => Math.abs(v)))
    const unit = slide.chart.unit ? ` (${slide.chart.unit})` : ''
    parts.push(`<div class="sc-bars"><div class="sc-bars-head">${escapeHtml(slide.chart.series[0].name || (isEn ? 'Metric' : '指标'))}${escapeHtml(unit)}</div>` +
      cats.map((c, idx) => {
        const v = vals[idx] ?? 0
        const pct = Math.max(6, Math.round((Math.abs(v) / maxVal) * 100))
        return `<div class="sc-bar-row"><span class="sc-bar-lbl">${escapeHtml(String(c))}</span><div class="sc-bar-track"><i style="width:${pct}%"></i></div><span class="sc-bar-val">${escapeHtml(String(v))}</span></div>`
      }).join('') + '</div>')
  }

  if (layout === 'kpi' && Array.isArray(slide.items) && slide.items.length > 0) {
    parts.push('<div class="sc-kpi-grid">' + slide.items.slice(0, 4).map(it => `
      <div class="sc-kpi-card">
        <div class="sc-kpi-val">${escapeHtml(stripInlineMarkdown(it.value || it.title || ''))}${it.delta ? `<span class="sc-kpi-delta">${escapeHtml(stripInlineMarkdown(it.delta))}</span>` : ''}</div>
        <div class="sc-kpi-title">${escapeHtml(stripInlineMarkdown(it.title || it.tag || ''))}</div>
        ${it.text ? `<div class="sc-kpi-text">${escapeHtml(stripInlineMarkdown(it.text))}</div>` : ''}
      </div>
    `).join('') + '</div>')
  } else if ((layout === 'table' || layout === 'harvey') && Array.isArray(slide.rows) && slide.rows.length > 0) {
    const rows = slide.rows.slice(0, 6)
    parts.push('<div class="sc-table-wrap"><table class="sc-table"><thead><tr>' +
      rows[0].slice(0, 4).map(c => `<th>${escapeHtml(stripInlineMarkdown(String(c ?? '')))}</th>`).join('') +
      '</tr></thead><tbody>' +
      rows.slice(1).map(r => '<tr>' + r.slice(0, 4).map(c => `<td>${escapeHtml(stripInlineMarkdown(String(c ?? '')))}</td>`).join('') + '</tr>').join('') +
      '</tbody></table></div>')
  } else if (layout === 'quote' || layout === 'statement') {
    if (slide.text) parts.push(`<blockquote class="sc-quote">${escapeHtml(stripInlineMarkdown(slide.text))}</blockquote>`)
  } else if (Array.isArray(slide.items) && slide.items.length > 0) {
    parts.push('<div class="sc-cards">' + slide.items.slice(0, 4).map((it, idx) => `
      <div class="sc-card">
        <div class="sc-card-head">${it.tag ? `<span class="sc-tag">${escapeHtml(stripInlineMarkdown(it.tag))}</span>` : `<span class="sc-tag">0${idx + 1}</span>`}<strong>${escapeHtml(stripInlineMarkdown(it.title || it.value || ''))}</strong></div>
        ${it.text ? `<p>${escapeHtml(stripInlineMarkdown(it.text))}</p>` : ''}
        ${Array.isArray(it.bullets) && it.bullets.length ? `<ul>${it.bullets.slice(0, 2).map(b => `<li>${escapeHtml(stripInlineMarkdown(b))}</li>`).join('')}</ul>` : ''}
      </div>
    `).join('') + '</div>')
  }

  if (Array.isArray(slide.bullets) && slide.bullets.length > 0) {
    parts.push('<ul class="sc-bullets">' + slide.bullets.slice(0, 5).map(b => `<li>${escapeHtml(stripInlineMarkdown(b))}</li>`).join('') + '</ul>')
  }

  return parts.join('')
}

/**
 * Render a self-contained vertical (4:5) or square (1:1) social carousel HTML from a deck manifest.
 */
export function renderSocialCarouselHtml(manifest, options = {}) {
  const ratio = options.ratio === '1:1' ? '1:1' : '4:5'
  const langId = options.lang || manifest?.language || 'zh'
  const isEn = langId === 'en'
  const theme = deriveBrandedTheme(manifest?.theme || 'consulting', manifest?.brand)
  const tk = theme.tokens
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  const watermark = manifest?.brand?.watermark ? String(manifest.brand.watermark).trim() : ''
  const footerBrand = manifest?.brand?.footer || manifest?.brand?.name || manifest?.title || ''

  const cardsHtml = slides.map((slide, idx) => {
    const isHero = slide.layout === 'cover' || slide.layout === 'closing' || slide.layout === 'section'
    const num = `${String(idx + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`
    const kicker = stripInlineMarkdown(slide.kicker || (isHero ? (isEn ? 'FEATURED' : '精选专题') : `PART ${String(idx + 1).padStart(2, '0')}`))
    const title = stripInlineMarkdown(slide.title || manifest?.title || '')
    const takeaway = !isHero && slide.takeaway
      ? `<div class="sc-takeaway">▸ ${escapeHtml(stripInlineMarkdown(slide.takeaway))}</div>`
      : ''
    const sourceText = slide.source ? stripInlineMarkdown(slide.source) : footerBrand
    return `<article class="sc-slide${isHero ? ' is-hero' : ''}" data-idx="${idx}">
      <header class="sc-head">
        <span class="sc-kicker">${escapeHtml(kicker)}</span>
        <span class="sc-meta">${watermark && !isHero ? `<span class="sc-wm">${escapeHtml(watermark)}</span>` : ''}<span class="sc-num">${num}</span></span>
      </header>
      <h2 class="sc-title">${escapeHtml(title)}</h2>
      <div class="sc-body">${renderSocialSlideBody(slide, manifest, isEn)}</div>
      ${takeaway}
      <footer class="sc-foot">
        <span>${escapeHtml(sourceText)}</span>
        <span>dsh-ppt</span>
      </footer>
    </article>`
  }).join('\n')

  return `<!doctype html>
<html lang="${isEn ? 'en' : 'zh-CN'}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(manifest?.title || 'Social Carousel')} · Social Carousel</title>
<style>
:root{
  --bg:${tk.canvas};--surface:${tk.surface1};--fg:${tk.inkPrimary};--ink2:${tk.inkSecondary};
  --muted:${tk.inkMuted};--accent:${tk.accentPrimary};--accent2:${tk.accentSecondary};
  --accent-soft:${tk.accentSoft};--accent-text:${tk.accentText};--hairline:${tk.hairline};
  --font-head:${theme.fonts.heading},system-ui,sans-serif;--font-body:${theme.fonts.body},system-ui,sans-serif;
}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#0F172A;color:#F8FAFC;font-family:var(--font-body);display:flex;flex-direction:column;align-items:center}
.sc-bar{position:sticky;top:0;z-index:20;width:100%;max-width:960px;padding:12px 18px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;background:rgba(15,23,42,.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.1)}
.sc-bar-title{font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px}
.sc-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sc-btn{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#F8FAFC;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer}
.sc-btn.active,.sc-btn:hover{background:var(--accent);border-color:var(--accent);color:#FFF}
.sc-stage{width:100%;max-width:960px;padding:24px 16px 48px;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,430px));justify-content:center;gap:24px}
.sc-slide{
  width:100%;aspect-ratio:4/5;background:var(--bg);color:var(--fg);border-radius:20px;
  padding:26px 26px 20px;display:flex;flex-direction:column;gap:12px;position:relative;overflow:hidden;
  box-shadow:0 20px 50px rgba(0,0,0,.35);border:1px solid var(--hairline);
}
body[data-ratio="1:1"] .sc-slide{aspect-ratio:1/1}
.sc-slide.is-hero{background:linear-gradient(150deg,var(--accent) 0%,var(--accent2) 100%);color:#FFF;border-color:transparent;justify-content:center}
.sc-slide.is-hero .sc-kicker,.sc-slide.is-hero .sc-num,.sc-slide.is-hero .sc-foot,.sc-slide.is-hero .sc-hero-sub{color:rgba(255,255,255,.86)}
.sc-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.sc-kicker{color:var(--accent-text)}
.sc-meta{display:flex;align-items:center;gap:8px;color:var(--muted)}
.sc-wm{font-size:9px;padding:2px 6px;border-radius:4px;border:1px solid var(--hairline);background:var(--surface)}
.sc-title{margin:0;font-family:var(--font-head);font-size:22px;line-height:1.25;font-weight:800}
.sc-slide.is-hero .sc-title{font-size:28px;line-height:1.2}
.sc-hero-sub,.sc-sub{margin:0;font-size:13.5px;line-height:1.5;color:var(--ink2)}
.sc-body{flex:1;min-height:0;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.sc-kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sc-kpi-card,.sc-card{background:var(--surface);border:1px solid var(--hairline);border-radius:12px;padding:11px 12px}
.sc-kpi-val{font-size:24px;font-weight:800;color:var(--accent-text);line-height:1.1;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
.sc-kpi-delta{font-size:11px;font-weight:700;padding:1px 6px;border-radius:99px;background:var(--accent-soft)}
.sc-kpi-title{font-size:12.5px;font-weight:700;margin-top:4px}
.sc-kpi-text{font-size:11.5px;color:var(--ink2);margin-top:2px;line-height:1.35}
.sc-cards{display:flex;flex-direction:column;gap:8px}
.sc-card-head{display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:4px}
.sc-card p,.sc-card ul{margin:0;font-size:12px;line-height:1.42;color:var(--ink2)}
.sc-card ul{padding-left:16px;margin-top:3px}
.sc-tag{display:inline-flex;align-items:center;justify-content:center;padding:2px 7px;border-radius:6px;background:var(--accent-soft);color:var(--accent-text);font-size:10.5px;font-weight:800;flex-shrink:0}
.sc-slide.is-hero .sc-tag{background:rgba(255,255,255,.18);color:#FFF}
.sc-cta-list{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.sc-cta-item{display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,.12);padding:10px 12px;border-radius:10px;font-size:12.5px}
.sc-cta-item p{margin:3px 0 0;font-size:11.5px;opacity:.88}
.sc-bullets{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:7px;font-size:13px;line-height:1.48;color:var(--fg)}
.sc-bullets li::marker{color:var(--accent)}
.sc-bars{background:var(--surface);border:1px solid var(--hairline);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:7px}
.sc-bars-head{font-size:11.5px;font-weight:700;color:var(--muted)}
.sc-bar-row{display:grid;grid-template-columns:76px 1fr 48px;align-items:center;gap:8px;font-size:11.5px}
.sc-bar-lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink2)}
.sc-bar-track{height:10px;border-radius:99px;background:var(--accent-soft);overflow:hidden}
.sc-bar-track i{display:block;height:100%;border-radius:99px;background:var(--accent)}
.sc-bar-val{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
.sc-fig{margin:0;border-radius:12px;overflow:hidden;border:1px solid var(--hairline);background:var(--surface);max-height:52%}
.sc-fig img{width:100%;height:100%;object-fit:cover;display:block}
.sc-fig figcaption{padding:6px 10px;font-size:11px;color:var(--muted)}
.sc-table-wrap{overflow:hidden;border-radius:10px;border:1px solid var(--hairline)}
.sc-table{width:100%;border-collapse:collapse;font-size:11.5px}
.sc-table th{background:var(--surface);text-align:left;padding:6px 8px;border-bottom:1.5px solid var(--accent);font-weight:700}
.sc-table td{padding:6px 8px;border-bottom:1px solid var(--hairline);color:var(--ink2)}
.sc-quote{margin:8px 0;padding:14px 16px;border-left:4px solid var(--accent);background:var(--surface);border-radius:0 12px 12px 0;font-size:15px;font-weight:700;line-height:1.5}
.sc-takeaway{background:var(--accent-soft);border-left:3.5px solid var(--accent);border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;color:var(--fg);line-height:1.38}
.sc-foot{margin-top:auto;padding-top:8px;border-top:1px solid var(--hairline);display:flex;justify-content:space-between;font-size:10.5px;color:var(--muted)}
.sc-slide.is-hero .sc-foot{border-top-color:rgba(255,255,255,.22)}
@media print{
  body{background:#FFF}
  .sc-bar{display:none}
  .sc-stage{display:block;padding:0;max-width:none}
  .sc-slide{page-break-after:always;break-after:page;margin:0 auto 12px;box-shadow:none;width:108mm;height:135mm}
  body[data-ratio="1:1"] .sc-slide{width:120mm;height:120mm}
}
</style>
</head>
<body data-ratio="${ratio}">
<nav class="sc-bar" aria-label="Social Carousel Controls">
  <div class="sc-bar-title">${escapeHtml(manifest?.title || 'Social Carousel')} · <span>${slides.length} ${isEn ? 'Cards' : '张长图卡片'}</span></div>
  <div class="sc-controls">
    <button type="button" class="sc-btn${ratio === '4:5' ? ' active' : ''}" data-set-ratio="4:5">4:5 ${isEn ? 'Vertical' : '竖版（小红书/LinkedIn）'}</button>
    <button type="button" class="sc-btn${ratio === '1:1' ? ' active' : ''}" data-set-ratio="1:1">1:1 ${isEn ? 'Square' : '方形（微信/社群）'}</button>
    <button type="button" class="sc-btn" id="sc-print">${isEn ? 'Print / Save PDF' : '打印 / 导出 PDF'}</button>
  </div>
</nav>
<main class="sc-stage" id="sc-stage">
${cardsHtml}
</main>
<script>
document.querySelectorAll('[data-set-ratio]').forEach(function(btn){
  btn.addEventListener('click',function(){
    var r=btn.getAttribute('data-set-ratio');
    document.body.setAttribute('data-ratio',r);
    document.querySelectorAll('[data-set-ratio]').forEach(function(b){b.classList.toggle('active',b===btn);});
  });
});
document.getElementById('sc-print')?.addEventListener('click',function(){window.print();});
</script>
</body>
</html>`
}

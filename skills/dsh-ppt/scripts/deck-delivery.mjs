import { basename } from 'node:path'

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

function cleanLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
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

function estimateSlideMinutes(slide) {
  const words = [
    slide?.title,
    slide?.subtitle,
    slide?.takeaway,
    slide?.notes,
    ...(Array.isArray(slide?.bullets) ? slide.bullets : []),
  ]
    .filter(Boolean)
    .join(' ')
  const cjk = (words.match(/[\u3400-\u9fff]/g) || []).length
  const latin = (words.replace(/[\u3400-\u9fff]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length
  const spoken = cjk + latin
  if (slide?.layout === 'cover' || slide?.layout === 'closing' || slide?.layout === 'section') return 0.5
  if (spoken > 160) return 2
  if (spoken > 70) return 1.5
  return 1
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
  const totalMinutes = Math.max(1, Math.round(slides.reduce((sum, s) => sum + estimateSlideMinutes(s), 0)))
  const title = cleanLine(manifest?.title) || (en ? 'Presentation Handout' : '演示文稿讲义')

  const lines = [
    `# ${title} — ${en ? 'Speaker Handout & Script' : '演讲者讲义与逐页手稿'}`,
    '',
    `## ${en ? 'Executive Overview' : '演示概览'}`,
    `- **${en ? 'Theme' : '视觉主题'}**: \`${cleanLine(manifest?.theme || 'consulting')}\``,
    `- **${en ? 'Slides' : '总页数'}**: ${slides.length}`,
    `- **${en ? 'Estimated Speaking Time' : '预计演讲时长'}**: ~${totalMinutes} ${en ? 'min' : '分钟'}`,
    '',
    '---',
    '',
  ]

  slides.forEach((slide, idx) => {
    const slideTitle = cleanLine(slide?.title) || (en ? `Slide ${idx + 1}` : `第 ${idx + 1} 页`)
    const mins = estimateSlideMinutes(slide)
    lines.push(`## ${en ? `Slide ${idx + 1}` : `第 ${idx + 1} 页`} · ${slideTitle}`)
    const cleanKicker = cleanLine(slide?.kicker)
    const meta = [
      `**${en ? 'Layout' : '版式'}**: \`${slide?.layout || 'bullets'}${slide?.variant ? `[${slide.variant}]` : ''}\``,
      (cleanKicker && cleanKicker !== slideTitle) ? `**${en ? 'Section' : '章节'}**: ${cleanKicker}` : '',
      `**${en ? 'Pace' : '建议时长'}**: ~${mins} ${en ? 'min' : '分钟'}`,
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

  return lines.join('\n')
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
  const reviewLabel = label('检查与导出', 'Review and export')
  const outline = manifest.slides.map((slide, i) => `<li><button type="button" data-review-slide="${i + 1}"><span>${i + 1}</span>${escape(slide.title || label('无标题', 'Untitled'))}</button></li>`).join('')
  const rows = issues.map(issue => `<li><button type="button" data-review-slide="${issue.slide}"><strong>${escape(label('第 ' + issue.slide + ' 页', 'Slide ' + issue.slide))} · ${escape(issue.message)}</strong><span>${escape(issue.suggestion)}</span></button></li>`).join('')
  const summary = draft ? label('草稿中还有待填写内容，请补齐事实后再交付。', 'This draft still contains placeholders. Complete the facts before delivery.')
    : manifest.quality ? label('静态检查发现 ' + issues.length + ' 项提示；请核对实际显示。', 'Static checks found ' + issues.length + ' item(s); review the actual slides.')
    : label('此项目没有静态质量报告，请逐页检查。', 'No static quality report is available; review every slide.')

  const handoutMarkdown = renderHandoutMarkdown(manifest, language)
  const handoutFileName = files.handout
    ? basename(files.handout)
    : (files.json ? basename(files.json, '.json') : (manifest.title || 'presentation').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'presentation') + '.handout.md'
  const handoutLink = files.handout
    ? `<a id="download-handout" href="${escape(href(files.handout))}" download>${escape(handoutLabel)}</a>`
    : `<a id="download-handout" href="#handout" download="${escape(handoutFileName)}">${escape(handoutLabel)}</a>`

  const slideCues = (manifest.slides || []).map((s) => slideCueLines(s))
  const targetMinutes = Math.max(1, Math.round((manifest.slides || []).reduce((sum, s) => sum + estimateSlideMinutes(s), 0)))
  const deliveryConfig = {
    lang: language || 'zh',
    title: String(manifest.title || 'Presentation'),
    channelId: String(manifest.deckId || manifest.title || 'dsh-ppt').slice(0, 64),
    slideCues,
    targetMinutes,
    handoutMarkdown,
    handoutFileName,
    hasSiblingHandout: Boolean(files.handout),
    labels: {
      presenterTitle: label('演讲者提词台', 'Presenter Console'),
      currentSlide: label('当前画面', 'CURRENT SLIDE'),
      nextSlide: label('下一页预览', 'NEXT SLIDE'),
      teleprompter: label('演讲提词器', 'TELEPROMPTER'),
      autoCueBadge: label('自动提纲提示（无手写备注）', 'Auto cue (no speaker notes)'),
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
      hint: label('← → 翻页 · P/空格 暂停 · T 重置 · A+/A- 字号 · L 激光笔 · B/W 黑白屏 · Esc 结束', '← → Navigate · T Reset · A+/A- Zoom · L Laser · B/W Blank · Esc End'),
    },
  }

  return {
    body: `<div id="delivery-bar">
  <span id="delivery-status">${escape(draft ? label('待补全草稿', 'Draft: content needed') : label('演示文稿 · 请检查后交付', 'Presentation · review before delivery'))}</span>
  ${download('pptx', pptxLabel, 'download-pptx')}
  <button id="review-toggle" type="button" aria-haspopup="dialog">${escape(reviewLabel)}</button>
</div>
<div id="dsh-laser-dot" aria-hidden="true"></div>
<dialog id="review-panel" aria-labelledby="review-title">
  <div class="review-head"><h2 id="review-title">${escape(reviewLabel)}</h2><button id="review-close" type="button">${escape(label('关闭', 'Close'))}</button></div>
  <p id="review-summary">${escape(summary)}</p>
  <div class="review-exports">${download('pptx', pptxLabel, 'review-download-pptx')}${download('json', label('保存可编辑项目', 'Save project'), 'download-project')}${handoutLink}</div>
  <p>${escape(label('用 PowerPoint / WPS 打开 PPTX 可直接修改文字、图片和图表。让 Agent 继续修改时，使用保存的项目文件；按 P 打开双屏演讲者提词台，按 L 开启虚拟激光笔。', 'Open the PPTX in PowerPoint / WPS to edit text, images and charts. Use the saved project when asking your Agent to revise it; press P for Dual-Screen Presenter Console and L for Virtual Laser Pointer.'))}</p>
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
  const previous = document.getElementById('previous-slide')
  const next = document.getElementById('next-slide')
  const number = document.getElementById('page-number')
  const panel = document.getElementById('review-panel')
  const toggle = document.getElementById('review-toggle')
  const handoutBtn = document.getElementById('download-handout')
  const laserDot = document.getElementById('dsh-laser-dot')

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

  if (handoutBtn && cfg && !cfg.hasSiblingHandout) {
    handoutBtn.addEventListener('click', (event) => {
      event.preventDefault()
      try {
        const blob = new Blob([cfg.handoutMarkdown || ''], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = cfg.handoutFileName || 'handout.md'
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => { try { URL.revokeObjectURL(url) } catch (_) {} }, 2500)
      } catch (_) {}
    })
  }

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
      `var total=0,index=0,elapsed=0,started=Date.now(),paused=false,notesSize=20,slides=[],cues=[],targetSecs=${targetSecs},curBlank=null,laserOn=false,initialized=false,readyTries=0;`,
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
      'function renderState(st){index=st.index;total=st.total||total;q("pcounter").textContent=(index+1)+" / "+total;setSlide(q("pv-cur"),slides[index]||"");setSlide(q("pv-next"),slides[(index+1)%total]||"");var hasNotes=Boolean(st.notes&&st.notes.trim());var cue=st.cue||cues[index]||"";q("pcue-badge").style.display=(!hasNotes&&cue)?"inline-block":"none";q("pnotes").textContent=hasNotes?st.notes:(cue||' + JSON.stringify(L.noNotes || 'No notes') + ');q("pprog").style.width=((index+1)/Math.max(1,total)*100)+"%";curBlank=st.blank||null;q("pv-black").setAttribute("aria-pressed",curBlank==="black"?"true":"false");q("pv-white").setAttribute("aria-pressed",curBlank==="white"?"true":"false");q("pv-black").textContent=curBlank==="black"?' + JSON.stringify(L.unblack || 'Unblack') + ':' + JSON.stringify(L.black || 'Black') + ';q("pv-white").textContent=curBlank==="white"?' + JSON.stringify(L.unwhite || 'Unwhite') + ':' + JSON.stringify(L.white || 'White') + ';if(typeof st.laser==="boolean"){laserOn=st.laser;syncLaserUi()}var th=q("thumbs").children;for(var i=0;i<th.length;i++){th[i].classList.toggle("is-current",i===index)}fit()}',
      'function syncLaserUi(){q("laser-btn").setAttribute("aria-pressed",laserOn?"true":"false");q("pv-cur").classList.toggle("laser-on",laserOn);if(!laserOn)q("pv-laser-preview").style.display="none"}',
      'function toggleLaser(){laserOn=!laserOn;syncLaserUi();post({__dshPpt:"cmd",kind:"laser",active:laserOn,x:0.5,y:0.5})}',
      'function togglePause(){paused=!paused;if(!paused)started=Date.now()-elapsed;var b=q("pause");b.setAttribute("aria-pressed",paused?"true":"false");b.textContent=paused?' + JSON.stringify(L.resume || 'Resume') + ':' + JSON.stringify(L.pause || 'Pause') + '}',
      'function resetTimer(){started=Date.now();elapsed=0}',
      'function applyNotesSize(){document.documentElement.style.setProperty("--notes-size",notesSize+"px")}',
      'function handleMsg(d){if(!d)return;if(d.__dshPpt==="init"&&!initialized){initialized=true;slides=d.slides||[];cues=d.cues||[];total=d.total||slides.length;var st=document.createElement("style");st.textContent=d.css||"";document.head.appendChild(st);q("ptitle").textContent=d.title||"";buildThumbs()}else if(d.__dshPpt==="state"){renderState(d)}else if(d.__dshPpt==="close"){window.close()}}',
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
      + '</div><div class="col"><div class="card card-notes"><div class="lbl-row"><span class="lbl">' + escape(L.teleprompter || 'TELEPROMPTER') + '</span><span id="pcue-badge" class="cue-badge" style="display:none">' + escape(L.autoCueBadge || 'Auto cue') + '</span></div><div id="pnotes"></div></div></div></main>'
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

  // Laser pointer toggle ('L') + local stage tracking + fallback 'P' capture handler
  document.addEventListener('keydown', event => {
    const targetEl = event.target
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (targetEl && (['INPUT', 'SELECT', 'TEXTAREA'].includes(targetEl.tagName) || targetEl.isContentEditable === true)) return
    if (panel.open) return
    const lower = String(event.key || '').toLowerCase()
    if (lower === 'l') {
      event.preventDefault()
      laserActive = !laserActive
      applyLaser(laserActive, 0.5, 0.5)
      document.body.classList.toggle('laser-active', laserActive)
      sendConsoleState()
      const toastEl = document.getElementById('toast')
      if (toastEl && cfg?.labels) {
        toastEl.textContent = laserActive ? cfg.labels.laserOn : cfg.labels.laserOff
        toastEl.hidden = false
        setTimeout(() => { toastEl.hidden = true }, 2000)
      }
    } else if (lower === 'escape' && laserActive) {
      applyLaser(false)
      document.body.classList.remove('laser-active')
      sendConsoleState()
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
@media print{#delivery-bar,#review-panel,#dsh-laser-dot{display:none!important}}
`

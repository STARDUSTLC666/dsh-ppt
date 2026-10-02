import { basename } from 'node:path'

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Offline, sibling-file links only. No credentials or application server needed. */
export function renderDelivery(manifest, files, language) {
  const label = (zh, en) => language === 'en' ? en : language === 'bilingual' ? zh + ' · ' + en : zh
  const issues = manifest.quality?.issues ?? []
  const draft = issues.some(issue => issue.code === 'template-unfilled')
  const href = path => './' + encodeURIComponent(basename(path))
  const download = (kind, text, id) => files[kind] ? `<a id="${id}" href="${escape(href(files[kind]))}" download>${escape(text)}</a>` : ''
  const pptxLabel = label('下载 PPTX', 'Download PPTX')
  const reviewLabel = label('检查与导出', 'Review and export')
  const outline = manifest.slides.map((slide, i) => `<li><button type="button" data-review-slide="${i + 1}"><span>${i + 1}</span>${escape(slide.title || label('无标题', 'Untitled'))}</button></li>`).join('')
  const rows = issues.map(issue => `<li><button type="button" data-review-slide="${issue.slide}"><strong>${escape(label('第 ' + issue.slide + ' 页', 'Slide ' + issue.slide))} · ${escape(issue.message)}</strong><span>${escape(issue.suggestion)}</span></button></li>`).join('')
  const summary = draft ? label('草稿中还有待填写内容，请补齐事实后再交付。', 'This draft still contains placeholders. Complete the facts before delivery.')
    : manifest.quality ? label('静态检查发现 ' + issues.length + ' 项提示；请核对实际显示。', 'Static checks found ' + issues.length + ' item(s); review the actual slides.')
    : label('此项目没有静态质量报告，请逐页检查。', 'No static quality report is available; review every slide.')
  return {
    body: `<div id="delivery-bar">
  <span id="delivery-status">${escape(draft ? label('待补全草稿', 'Draft: content needed') : label('演示文稿 · 请检查后交付', 'Presentation · review before delivery'))}</span>
  ${download('pptx', pptxLabel, 'download-pptx')}
  <button id="review-toggle" type="button" aria-haspopup="dialog">${escape(reviewLabel)}</button>
</div>
<dialog id="review-panel" aria-labelledby="review-title">
  <div class="review-head"><h2 id="review-title">${escape(reviewLabel)}</h2><button id="review-close" type="button">${escape(label('关闭', 'Close'))}</button></div>
  <p id="review-summary">${escape(summary)}</p>
  <div class="review-exports">${download('pptx', pptxLabel, 'review-download-pptx')}${download('json', label('保存可编辑项目', 'Save project'), 'download-project')}</div>
  <p>${escape(label('用 PowerPoint / WPS 打开 PPTX 可直接修改文字、图片和图表。让 Agent 继续修改时，使用保存的项目文件。', 'Open the PPTX in PowerPoint / WPS to edit text, images and charts. Use the saved project when asking your Agent to revise it.'))}</p>
  <h3>${escape(label('检查提示 · 点击定位页面', 'Review items · click to open slide'))}</h3>
  ${issues.length ? `<ul id="review-issues">${rows}</ul>` : `<p>${escape(manifest.quality ? label('静态检查未发现问题；仍需核对实际排版和事实。', 'No static issues found; check the actual layout and facts.') : label('暂无报告。', 'No report available.'))}</p>`}
  <p>${escape(label('文字尺寸是静态估算；这里不能证明 PowerPoint / WPS 排版已通过验收。', 'Text fit is estimated; this does not verify the rendered PowerPoint / WPS layout.'))}</p>
  <h3>${escape(label('页面目录', 'Slides'))}</h3><ol id="review-outline">${outline}</ol>
</dialog>`,
    navigation: `<button id="previous-slide" type="button" aria-label="${escape(label('上一页', 'Previous slide'))}">←</button><input id="page-number" type="number" min="1" max="${manifest.slides.length}" value="1" aria-label="${escape(label('跳到第几页', 'Go to slide'))}"><button id="next-slide" type="button" aria-label="${escape(label('下一页', 'Next slide'))}">→</button>`,
    css: DELIVERY_CSS,
    script: `syncDelivery = (${initDelivery.toString()})(go, setOverview, () => index, total);`,
  }
}

/** This function is embedded in the standalone HTML, with no module dependencies. */
function initDelivery(go, setOverview, current, total) {
  const previous = document.getElementById('previous-slide')
  const next = document.getElementById('next-slide')
  const number = document.getElementById('page-number')
  const panel = document.getElementById('review-panel')
  const toggle = document.getElementById('review-toggle')
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
  return index => {
    number.value = String(index + 1)
    previous.disabled = index === 0
    next.disabled = index === total - 1
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
@media print{#delivery-bar,#review-panel{display:none!important}}
`

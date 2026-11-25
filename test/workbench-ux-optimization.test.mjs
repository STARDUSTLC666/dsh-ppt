import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Script, runInNewContext } from 'node:vm'
import { unzipSync, strFromU8 } from 'fflate'
import { buildDeckAsync, readDeckProject } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { PptWorkbench, PPT_WORKBENCH_ROUTE, PPT_DOWNLOAD_ROUTE } from '../lib/workbench.js'
import { englishWorkbenchMessage, splitBilingualMessage } from '../lib/workbench-language.js'

const BUNDLE = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const CLIENT_SRC = readFileSync(new URL('../templates/client.js', import.meta.url), 'utf8')
const EDITOR_SRC = readFileSync(new URL('../templates/panels/editor.js', import.meta.url), 'utf8')
const STUDIO_SRC = readFileSync(new URL('../templates/panels/style-studio.js', import.meta.url), 'utf8')

const work = resolve('.test-output')
mkdirSync(work, { recursive: true })

async function withTempWb(run) {
  const dir = mkdtempSync(join(work, 'wb-ux-opt-'))
  try {
    const wb = new PptWorkbench({ catalogPath: join(dir, 'catalog.jsonl') })
    return await run({ dir, wb })
  } finally {
    assert.ok(dir.startsWith(work))
    rmSync(dir, { recursive: true, force: true })
  }
}

const postReq = body => new Request('http://dsh.internal' + PPT_WORKBENCH_ROUTE, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-dsh-ppt-action': '1', origin: 'http://127.0.0.1:8181', host: '127.0.0.1:8181' },
  body: JSON.stringify(body),
})

function loadClientInternals() {
  let mod
  const src = BUNDLE.replace(
    '__internals: { draftFor,',
    '__internals: { PPT_LAYOUT_CATALOG, SlideArchetypeEditor, StyleStudioPanel, PptCreateDialog, PptLightbox, draftFor,',
  )
  runInNewContext(src, {
    window: {
      __ModuleLoader__: {
        load({ factory }) {
          mod = factory(() => ({
            Fragment: Symbol.for('react.fragment'),
            createElement(type, props, ...children) { return { type, props: props || {}, children } },
            useState: init => [typeof init === 'function' ? init() : init, () => {}],
            useEffect() {},
            useMemo: fn => fn(),
            useRef: v => ({ current: v }),
            useId: () => 'id-1',
          }))
        },
      },
    },
  })
  return mod.__internals
}

test('[P0-2] workbench and UI align on 8-item cap (rejects 9) and allow updating/clearing slide image', () => withTempWb(async ({ dir, wb }) => {
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVcoAAAAASUVORK5CYII='
  const created = await buildDeckAsync({
    title: 'Items Cap Test',
    outputDir: dir,
    slides: [
      { layout: 'cover', title: 'Cover' },
      { layout: 'cards', title: 'Many Cards', items: [{ tag: '01', title: 'A' }, { tag: '02', title: 'B' }] },
      { layout: 'image-right', title: 'With Image', bullets: ['Keep me'], image: { src: tinyPng, alt: 'old', fit: 'contain' } },
    ],
  })
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const opened = (await wb.action({ operation: 'open', id })).project

  const eightItems = Array.from({ length: 8 }, (_, i) => ({ tag: String(i + 1).padStart(2, '0'), title: `Card ${i + 1}`, text: 'Body' }))
  const saved8 = await wb.action({
    operation: 'edit', id, expectedRevision: 0,
    slide: opened.slides[1].id,
    patch: { layout: 'cards', items: eightItems },
  })
  assert.equal(saved8.project.slides[1].items.length, 8)

  const nineItems = [...eightItems, { tag: '09', title: 'Too Many' }]
  await assert.rejects(
    wb.action({ operation: 'edit', id, expectedRevision: saved8.project.revision, slide: opened.slides[1].id, patch: { items: nineItems } }),
    /结构化卡片内容无效/,
  )
  assert.match(STUDIO_SRC, /raw\.slice\(0,\s*8\)/, 'normalizeSlideItems aligns with engine 8-item cap')
  assert.match(STUDIO_SRC, /items\.length >= 8/, 'addItem and + Add card item button align with engine 8-item cap')

  // Updating existing image alt/fit/focalPoint via assetId and removing image via null
  const imgSlide = saved8.project.slides[2]
  const updatedImg = await wb.action({
    operation: 'edit', id, expectedRevision: saved8.project.revision,
    slide: imgSlide.id,
    patch: { image: { assetId: imgSlide.image.assetId, alt: 'Updated alt text', fit: 'cover', focalPoint: 'top' } },
  })
  assert.equal(updatedImg.project.slides[2].image.alt, 'Updated alt text')
  assert.equal(updatedImg.project.slides[2].image.fit, 'cover')
  assert.equal(updatedImg.project.slides[2].image.focalPoint, 'top')

  const removedImg = await wb.action({
    operation: 'edit', id, expectedRevision: updatedImg.project.revision,
    slide: imgSlide.id,
    patch: { layout: 'bullets', image: null },
  })
  assert.equal(removedImg.project.slides[2].image, undefined)
}))

test('[P0-3] workbench brandPatch propagates explicit null clears for colors/fonts, enforces 100-char footer & clean font regex', () => withTempWb(async ({ wb }) => {
  const captured = []
  const customWb = new PptWorkbench({
    catalogPath: wb.catalogPath,
    loadEngine: async () => {
      const real = await import('../skills/dsh-ppt/scripts/deck-advanced.mjs')
      return {
        ...real,
        async editDeck(args) {
          captured.push(args.brand)
          return real.editDeck(args)
        },
      }
    },
  })
  const demo = await customWb.action({ operation: 'create-demo', lang: 'en' })
  const id = demo.project.id
  const styled = await customWb.action({
    operation: 'edit', id, expectedRevision: demo.project.revision,
    brand: { primaryColor: '#123456', fontFamily: 'Microsoft YaHei', footer: 'Short footer' },
  })
  await customWb.action({
    operation: 'edit', id, expectedRevision: styled.project.revision,
    brand: { primaryColor: null, secondaryColor: '', fontFamily: null, headingFont: '', footer: 'Still short' },
  })
  assert.deepEqual(captured.at(-1), {
    primaryColor: null,
    secondaryColor: null,
    fontFamily: null,
    headingFont: null,
    footer: 'Still short',
  })

  // Footer > 100 chars rejected consistently in workbench.ts
  const tooLong = await customWb.fetch(postReq({
    operation: 'edit', id, expectedRevision: styled.project.revision + 1,
    brand: { footer: 'x'.repeat(101) },
  }))
  assert.equal(tooLong.status, 400)
  const errBody = await tooLong.json()
  assert.match(errBody.messageEn, /Invalid brand settings/)

  // Font with comma/quotes rejected consistently in workbench.ts
  const badFont = await customWb.fetch(postReq({
    operation: 'edit', id, expectedRevision: styled.project.revision + 1,
    brand: { fontFamily: 'Arial, sans-serif' },
  }))
  assert.equal(badFont.status, 400)
}))

test('[P1-4] splitBilingualMessage and fail() never truncate slash-separated option lists and translate all workbench errors', () => withTempWb(async ({ wb }) => {
  // Option lists are NOT bilingual splits
  assert.equal(splitBilingualMessage('图片裁切焦点仅支持 center / top / bottom / left / right'), null)
  assert.equal(splitBilingualMessage('改编预设仅支持 exec-5min / board-brief / sales-pitch'), null)
  assert.equal(splitBilingualMessage('当前引擎版本暂不支持导入 Excel / Word 文档'), null)
  assert.equal(splitBilingualMessage('dsh-ppt：第 1 页图片需使用 image / image-left / image-right / gallery / cover / mockup 布局'), null)

  // Genuine ZH / EN bilingual errors still split cleanly (even with internal slashes on ZH side)
  assert.deepEqual(splitBilingualMessage('母版骨架名称无效 / Invalid chrome skeleton style'), {
    zh: '母版骨架名称无效',
    en: 'Invalid chrome skeleton style',
  })
  assert.deepEqual(
    splitBilingualMessage('dsh-ppt：显示格式只支持 number / percent 和 0–6 位小数 / Use number/percent and 0–6 decimal places'),
    { zh: 'dsh-ppt：显示格式只支持 number / percent 和 0–6 位小数', en: 'Use number/percent and 0–6 decimal places' },
  )

  // Live HTTP error checks on PptWorkbench
  const demo = await wb.action({ operation: 'create-demo', lang: 'zh' })
  const id = demo.project.id
  const rev = demo.project.revision

  const remixErr = await (await wb.fetch(postReq({ operation: 'remix', id, expectedRevision: rev, preset: 'bad' }))).json()
  assert.equal(remixErr.message, '改编预设仅支持 exec-5min / board-brief / sales-pitch')
  assert.match(remixErr.messageEn, /exec-5min, board-brief, or sales-pitch/)

  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVcoAAAAASUVORK5CYII='
  const focalErr = await (await wb.fetch(postReq({
    operation: 'edit', id, expectedRevision: rev, slide: demo.project.slides[1].id,
    patch: { image: { src: tinyPng, focalPoint: 'diagonal' } },
  }))).json()
  assert.equal(focalErr.message, '图片裁切焦点仅支持 center / top / bottom / left / right')
  assert.match(focalErr.messageEn, /center, top, bottom, left, or right/)

  const pdfImportErr = await (await wb.fetch(postReq({
    operation: 'import-office', fileName: 'bad.exe', data: 'data:text/plain;base64,AAAA',
  }))).json()
  assert.match(pdfImportErr.messageEn, /\.pdf/)
  assert.doesNotMatch(pdfImportErr.messageEn, /Check the project files/)

  // Ensure English UI toast for Taste Recipe apply exists in client EN dictionary
  assert.ok(CLIENT_SRC.includes('"品味配方与品牌母版已更新，可撤销。": "Taste recipe and brand settings updated'))
  assert.ok(!englishWorkbenchMessage('保密水印最多 48 字符且不能包含控制字符').includes('Check the project files'))
  assert.ok(!englishWorkbenchMessage('代码片段无效或超过 16,000 字符').includes('Check the project files'))
}))

test('[P1-5] editorHtml strips quote-attr prefix, ignores matrix-tag & mekko-total kickers, reverts blank edits, and clicks v0.35 SVGs', () => {
  const { editorHtml } = loadClientInternals()
  const doc = editorHtml('<html><head></head><body></body></html>', 'n1')
  const bridge = [...doc.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(m => m[1]).at(-1)
  assert.doesNotThrow(() => new Script(bridge))

  const handlers = new Map()
  const messages = []
  const fakeParent = { postMessage(msg) { messages.push(msg) } }
  let messageListener = null
  runInNewContext(bridge, {
    setTimeout: fn => { fn(); return 1 },
    clearTimeout() {},
    parent: fakeParent,
    document: {
      addEventListener(name, fn) { handlers.set(name, fn) },
      createRange: () => ({ selectNodeContents() {} }),
    },
    window: {
      addEventListener(name, fn) { if (name === 'message') messageListener = fn },
      getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
    },
  })

  // 1. Quote attribution strips leading "—— " so re-render never produces "—— —— "
  const quoteHandlers = new Map()
  const quoteNode = {
    innerText: '—— Jane Doe',
    dataset: {},
    contentEditable: 'false',
    get isContentEditable() { return this.contentEditable === 'true' },
    matches(sel) { return sel.includes('.quote-attr') },
    closest(sel) { return sel.includes('#data-panel') ? null : this },
    focus() {},
    addEventListener(k, fn) { quoteHandlers.set(k, fn) },
    removeEventListener(k) { quoteHandlers.delete(k) },
    blur() { quoteHandlers.get('blur')?.() },
  }
  handlers.get('dblclick')({ target: quoteNode, preventDefault() {}, stopImmediatePropagation() {} })
  assert.equal(quoteNode.innerText, 'Jane Doe', 'leading em-dash prefix stripped before editing')
  quoteNode.innerText = 'Dr. Jane Doe'
  quoteNode.blur()
  const quoteEdit = messages.find(m => m.type === 'dsh-ppt-inline-edit')
  assert.equal(quoteEdit.field, 'subtitle')
  assert.equal(quoteEdit.value, 'Dr. Jane Doe')
  assert.equal(quoteNode.innerText, '—— Dr. Jane Doe')

  // Simulate spoofed source (ignored) and real parent revert on failed save
  messageListener({ source: {}, data: { nonce: 'n1', type: 'dsh-ppt-inline-revert' } })
  assert.equal(quoteNode.innerText, '—— Dr. Jane Doe', 'untrusted revert source is ignored')
  messageListener({ source: fakeParent, data: { nonce: 'n1', type: 'dsh-ppt-inline-revert' } })
  assert.equal(quoteNode.innerText, '—— Jane Doe', 'revert message from parent restores original DOM text')

  // 2. Matrix cell tag (.kicker.matrix-tag) must NOT enter contentEditable and maps click to 'items'
  messages.length = 0
  const matrixTag = {
    innerText: 'Q1',
    dataset: {},
    contentEditable: 'false',
    get isContentEditable() { return this.contentEditable === 'true' },
    matches(sel) {
      if (sel.includes('.kicker:not(.matrix-tag)')) return false
      return sel.includes('.kicker')
    },
    closest(sel) {
      if (sel.includes('.matrix-cell')) return {}
      if (sel.includes('#data-panel')) return null
      if (sel.includes('.kicker:not(.matrix-tag)')) return null
      return this
    },
    focus() {},
    addEventListener() {},
  }
  handlers.get('dblclick')({ target: matrixTag, preventDefault() {}, stopImmediatePropagation() {} })
  assert.equal(matrixTag.isContentEditable, false, 'matrix tag must not become inline-editable slide kicker')
  handlers.get('click')({ target: matrixTag, detail: 1, preventDefault() {}, stopImmediatePropagation() {} })
  assert.equal(messages.find(m => m.type === 'dsh-ppt-select')?.field, 'items')

  // 3. v0.35 infographic SVG (.treemap-svg) click focuses 'items'
  messages.length = 0
  const treemapSvg = {
    matches(sel) { return sel.includes('.treemap-svg') },
    closest(sel) { return sel.includes('#data-panel') || sel.includes('.matrix-cell') ? null : this },
  }
  handlers.get('click')({ target: treemapSvg, detail: 1, preventDefault() {}, stopImmediatePropagation() {} })
  assert.equal(messages.find(m => m.type === 'dsh-ppt-select')?.field, 'items')
})

test('[#128 item 10] share & bundle ZIPs rewrite sibling export links to inline Blob fallbacks while preserving non-sibling bytes', () => withTempWb(async ({ dir, wb }) => {
  const created = await buildDeckAsync({
    title: 'Sibling Export Deck',
    outputDir: dir,
    exports: ['handout', 'one-pager', 'subtitles', 'social-carousel'],
    slides: [
      { layout: 'cover', title: 'Sibling Export Deck', subtitle: 'Testing ZIP links' },
      { layout: 'bullets', title: 'Key Points', bullets: ['Point A', 'Point B'], notes: 'Speaker note for SRT.' },
    ],
  })
  await wb.remember(created, {})
  const id = (await wb.action({ operation: 'list' })).projects[0].id
  const rawHtml = readFileSync(created.htmlPath, 'utf8')
  assert.match(rawHtml, /"hasSiblingHandout":true/)
  assert.match(rawHtml, /"hasSiblingOnePager":true/)
  assert.match(rawHtml, /"hasSiblingSubtitles":true/)

  for (const kind of ['share', 'bundle']) {
    const res = await wb.fetchDownload(new Request(`http://dsh.internal${PPT_DOWNLOAD_ROUTE}?id=${id}&kind=${kind}&revision=0`))
    assert.equal(res.status, 200)
    const entries = unzipSync(new Uint8Array(await res.arrayBuffer()))
    const htmlName = created.htmlPath.split(/[\\/]/).pop()
    const packagedHtml = strFromU8(entries[htmlName])
    assert.doesNotMatch(packagedHtml, /"hasSiblingHandout":true/, `${kind} ZIP HTML must disable missing sibling handout`)
    assert.doesNotMatch(packagedHtml, /"hasSiblingOnePager":true/, `${kind} ZIP HTML must disable missing sibling onepager`)
    assert.doesNotMatch(packagedHtml, /"hasSiblingCarousel":true/, `${kind} ZIP HTML must disable missing sibling carousel`)
    assert.doesNotMatch(packagedHtml, /"hasSiblingSubtitles":true/, `${kind} ZIP HTML must disable missing sibling subtitles`)
    assert.match(packagedHtml, /id="download-handout" href="#handout"/)
    assert.match(packagedHtml, /id="download-onepager" href="#onepager"/)
    assert.match(packagedHtml, /id="download-subtitles" href="#subtitles"/)
    if (kind === 'share') assert.doesNotMatch(packagedHtml, /id="download-project"/)
    else assert.match(packagedHtml, /id="download-project"/)
  }
}))

test('[P0-1 / P1-1 / P1-2 / P1-3 / P2-1] client & panel structural guards stay intact in built bundle', () => {
  // P0-1: .ppt-editor stays mounted with hidden prop instead of unmounting on Lightbox
  assert.match(CLIENT_SRC, /className:'ppt-editor',hidden:activeTab === 'content' && editorMode === 'lightbox'/)
  assert.ok(EDITOR_SRC.includes('.ppt-workbench .ppt-editor[hidden]{display:none!important}'))
  // P1-1: keyboard handler no longer blocks ancestor [role=dialog] and accepts body focus
  assert.doesNotMatch(CLIENT_SRC, /event\.target\?\.closest\?\.\('\[role=dialog\]'\)/)
  assert.ok(CLIENT_SRC.includes('event.target === document.body'))
  // P1-2: PptCreateDialog displays error inside modal & resets on close
  assert.ok(EDITOR_SRC.includes('error ? h(W.Status, { tone: \'error\' }, error) : null'))
  assert.ok(EDITOR_SRC.includes('cancelPendingRead()'))
  // P1-3: 1260px header wrap, :where() input reset, 6 quick pills, overflow-x hidden on rail
  assert.ok(EDITOR_SRC.includes('@container dsh-workbench (max-width:1260px)'))
  assert.ok(CLIENT_SRC.includes(':where(.pptw input:not([type=file]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color])'))
  assert.ok(EDITOR_SRC.includes('overflow-y:auto;overflow-x:hidden'))
  const quickCount = (STUDIO_SRC.match(/\bquick:\s*true\b/g) || []).length
  assert.equal(quickCount, 6, 'keep only top 6 quick-switch archetype pills above the fold')
  // P0-3: StyleStudio hydrates logo from logoAssetId
  assert.ok(STUDIO_SRC.includes('savedBrand.logoAssetId && project?.assets?.[savedBrand.logoAssetId]?.data'))
  // P2-1: No stale 0.36 branding in workbench.ts, categorized Download dialog, error-checked PDF/PNG fetch
  const wbSrc = readFileSync(new URL('../src/workbench.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(wbSrc, /0\.36/)
  assert.ok(CLIENT_SRC.includes("kind === 'pdf' || kind === 'png-zip'"))
  assert.ok(CLIENT_SRC.includes('ppt-downloads-grid'))
  assert.ok(BUNDLE.includes('ppt-downloads-grid'))
  // Integrated verifier checks: download dialog widens inner .w-dialog + allows clean wrap, and .preview uses margin:0
  assert.ok(EDITOR_SRC.includes('.ppt-dialog.w-dialog.ppt-download-dialog{width:min(760px,calc(100dvw - 32px));max-width:min(760px,calc(100dvw - 32px))}'))
  assert.ok(EDITOR_SRC.includes('white-space:normal;text-align:start;line-height:1.3'))
  assert.ok(EDITOR_SRC.includes('overflow:clip;min-height:0;margin:0;position:relative'))
})

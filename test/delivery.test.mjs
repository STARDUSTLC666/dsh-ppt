import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { buildDeckAsync, editDeck, undoDeck } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { renderHtml, resolveLanguage, resolveTheme } from '../skills/dsh-ppt/scripts/deck-core.mjs'

const link = (html, id) => new RegExp(`id="${id}" href="([^"]+)"`).exec(html)?.[1]

test('delivery links follow collision-resolved sibling artifacts, including Unicode names', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ppt-delivery-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const options = { title: '交付测试', content: '已经验收的具体事实。', outputDir: dir, fileName: '汇报 & 中文' }
  const first = await buildDeckAsync(options), second = await buildDeckAsync(options)
  assert.notEqual(first.jsonPath, second.jsonPath)
  for (const result of [first, second]) {
    const html = readFileSync(result.htmlPath, 'utf8')
    assert.equal(link(html, 'download-pptx'), './' + encodeURIComponent(basename(result.pptxPath)))
    assert.equal(link(html, 'download-project'), './' + encodeURIComponent(basename(result.jsonPath)))
    assert.equal(link(html, 'review-download-pptx'), link(html, 'download-pptx'))
    assert.equal(Object.keys(result.files).length, 3, 'portable delivery stays a three-file group')
  }
})

test('draft warnings and issue destinations refresh after editing and undo', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'ppt-draft-review-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const output = await buildDeckAsync({ title: '周报', template: 'weekly', outputDir: dir })
  let html = readFileSync(output.htmlPath, 'utf8')
  assert.match(html, /草稿中还有待填写内容/)
  assert.match(html, /data-review-slide="2"/)
  const manifest = JSON.parse(readFileSync(output.jsonPath, 'utf8'))
  await editDeck({ deckPath: output.jsonPath, expectedRevision: 0, edits: manifest.slides.map((slide, i) => ({ slide: i + 1, patch: { subtitle: '已完成验收', bullets: ['有记录的事实'] } })) })
  html = readFileSync(output.htmlPath, 'utf8')
  assert.doesNotMatch(html, /草稿中还有待填写内容/)
  assert.match(html, /静态检查未发现问题/)
  await undoDeck({ deckPath: output.jsonPath, expectedRevision: 1 })
  assert.match(readFileSync(output.htmlPath, 'utf8'), /草稿中还有待填写内容/)
})

test('outline and quality report cannot inject executable markup', () => {
  const payload = '</button><script>alert(1)</script>'
  const manifest = { title: '安全样例', slides: [{ layout: 'cover', title: payload }], quality: { issues: [{ slide: 1, message: payload, suggestion: '<img src=x onerror=alert(1)>' }] } }
  const html = renderHtml(manifest, resolveTheme('data'), resolveLanguage('zh'))
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>|<img src=x/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
})

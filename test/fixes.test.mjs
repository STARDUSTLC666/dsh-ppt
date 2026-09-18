import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { DECK_VERSION, buildDeck, buildPptx, parseMarkdownDeck, resolveLanguage, resolveTheme } from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { main } from '../skills/dsh-ppt/scripts/build-deck.mjs'

const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

// 扫描 zip 中央目录并解压出每个部件，用于检查 PPTX 内部 XML。
function zipEntries(buf) {
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  const count = buf.readUInt16LE(eocd + 10)
  let ptr = buf.readUInt32LE(eocd + 16)
  const entries = {}
  for (let n = 0; n < count; n += 1) {
    const nameLen = buf.readUInt16LE(ptr + 28)
    const extraLen = buf.readUInt16LE(ptr + 30)
    const commentLen = buf.readUInt16LE(ptr + 32)
    const compressedSize = buf.readUInt32LE(ptr + 20)
    const localOffset = buf.readUInt32LE(ptr + 42)
    const name = buf.slice(ptr + 46, ptr + 46 + nameLen).toString('utf8')
    const localNameLen = buf.readUInt16LE(localOffset + 26)
    const localExtraLen = buf.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    entries[name] = inflateRawSync(buf.slice(dataStart, dataStart + compressedSize)).toString('utf8')
    ptr += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

test('中文无标题正文按句分页，6 句一个字都不丢', () => {
  const sentences = [
    '第一句讲的是周会占用了工程师大量时间，必须把同步例会的场次和时长都减半。',
    '第二句讲的是改为异步文档决策，会议材料提前二十四小时就发给相关同事。',
    '第三句讲的是只有真正存在分歧的议题，才允许进入同步讨论的环节。',
    '第四句讲的是所有的决策当晚必须归档到知识库，并且通知到相关同事。',
    '第五句讲的是每个季度复盘一次会议成本，把低效重复的例会直接砍掉。',
    '第六句讲的是最终目标是把团队周会压缩到十五分钟以内，大家回去干活。',
  ]
  const fullText = sentences.join('')
  assert.ok(fullText.length > 180, '用例前置条件：正文要长过 180 字才能暴露截断')
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-zh-split-'))
  try {
    const result = buildDeck({ title: '中文分页', content: fullText, theme: 'data', lang: 'zh', outputDir: dir, fileName: 'zh-paging' })
    const manifest = JSON.parse(readFileSync(result.jsonPath, 'utf8'))
    const html = readFileSync(result.htmlPath, 'utf8')
    const bulletSlides = manifest.slides.filter((slide) => slide.layout === 'bullets')
    assert.ok(bulletSlides.length >= 1, '6 句中文应当拆出要点页，而不是塞进封面/核心观点一句')
    const manifestText = JSON.stringify(manifest.slides)
    for (const sentence of sentences) {
      assert.ok(manifestText.includes(sentence), 'manifest 丢失正文：' + sentence)
      assert.ok(html.includes(sentence), 'HTML 丢失正文：' + sentence)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI --content 直接传文件路径时按 README 示例读取文件', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-path-'))
  try {
    const source = join(dir, 'deck.md')
    writeFileSync(source, '# 季度汇报\n\n- 收入增长\n- 成本下降\n', 'utf8')
    const logs = []
    const code = await main([
      '--title', '季度汇报',
      '--content', source,
      '--theme', 'data',
      '--lang', 'zh',
      '--out', dir,
      '--file', 'readme-cli',
    ], { log: (line) => logs.push(line), error: () => {} })
    assert.equal(code, 0)
    const html = readFileSync(join(dir, 'readme-cli.html'), 'utf8')
    assert.match(html, /收入增长/, 'HTML 应包含来自文件的正文')
    assert.match(html, /成本下降/, 'HTML 应包含来自文件的正文')
    assert.ok(!html.includes('deck.md'), 'CLI 不应把文件路径本身当正文')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('单节 12 条要点全部分页保留，不静默丢弃', () => {
  const bullets = Array.from({ length: 12 }, (_, i) => '要点' + (i + 1))
  const deck = parseMarkdownDeck('超量要点', '# 超量要点\n\n## 清单\n' + bullets.map((b) => '- ' + b).join('\n') + '\n', 'zh')
  const bulletSlides = deck.slides.filter((slide) => slide.layout === 'bullets')
  const kept = bulletSlides.flatMap((slide) => slide.bullets)
  assert.ok(bulletSlides.length >= 2, '12 条要点应当分成多张要点页')
  assert.deepEqual(kept, bullets)
})

test('无标题正文块 12 条要点同样分页保留', () => {
  const bullets = Array.from({ length: 12 }, (_, i) => '要点' + (i + 1))
  const content = '前置引言句。\n\n' + bullets.map((b) => '- ' + b).join('\n') + '\n\n## 后文\n- 尾条\n'
  const deck = parseMarkdownDeck('', content, 'zh')
  const kept = deck.slides.filter((slide) => slide.layout === 'bullets').flatMap((slide) => slide.bullets)
  for (const bullet of bullets) assert.ok(kept.includes(bullet), '无标题节丢失要点：' + bullet)
})

test('manifest version 跟随 package.json，不再写死 0.3.0', () => {
  assert.equal(DECK_VERSION, PKG.version)
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-version-'))
  try {
    const result = buildDeck({ title: '版本检查', content: '版本检查正文。', outputDir: dir, fileName: 'version' })
    const manifest = JSON.parse(readFileSync(result.jsonPath, 'utf8'))
    assert.equal(manifest.version, PKG.version)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('lang=en 的 PPTX 使用 en-US，不出现 zh-CN', () => {
  const manifest = {
    title: 'English deck',
    slides: [
      { layout: 'cover', kicker: 'Opening', title: 'Hello', subtitle: 'World' },
      { layout: 'table', kicker: 'Data', title: 'Numbers', rows: [['a', 'b'], ['1', '2']], notes: 'Speaker note' },
    ],
  }
  const entries = zipEntries(buildPptx(manifest, resolveTheme('data'), resolveLanguage('en')))
  for (const [name, xml] of Object.entries(entries)) {
    assert.ok(!xml.includes('lang="zh-CN"'), name + ' 不应出现 lang="zh-CN"')
  }
  assert.match(entries['ppt/slides/slide1.xml'], /lang="en-US"/)
  assert.match(entries['ppt/notesSlides/notesSlide2.xml'], /lang="en-US"/)
})

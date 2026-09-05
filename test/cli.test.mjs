import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { main, parseArgv } from '../skills/dsh-ppt/scripts/build-deck.mjs'

test('parseArgv 解析长选项、@file 内容与显式覆写开关', () => {
  const args = parseArgv(['--title=测试', '--content', '@deck.md', '--theme', 'data', '--lang=bilingual', '--out', 'dist', '--file', 'pitch', '--overwrite'])
  assert.equal(args.title, '测试')
  assert.equal(args.content, '@deck.md')
  assert.equal(args.theme, 'data')
  assert.equal(args.lang, 'bilingual')
  assert.equal(args.out, 'dist')
  assert.equal(args.file, 'pitch')
  assert.equal(args.overwrite, true)
})

test('parseArgv 缺失参数时抛中文错误', () => {
  assert.throws(() => parseArgv(['--title']), /需要一个值/)
})

test('CLI 主流程生成三件套并打印路径', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-'))
  try {
    const source = join(dir, 'source.md')
    writeFileSync(source, '# CLI 冒烟\n\n- HTML 放映\n- PPTX 导出\n', 'utf8')
    const logs = []
    const code = await main([
      '--title', 'CLI 冒烟',
      '--content', '@' + source,
      '--theme', 'soft',
      '--lang', 'zh',
      '--out', dir,
      '--file', 'smoke-deck',
    ], { log: (line) => logs.push(line), error: () => {} })
    assert.equal(code, 0)
    assert.match(logs.join('\n'), /HTML 放映/)
    assert.match(readFileSync(join(dir, 'smoke-deck.html'), 'utf8'), /CLI 冒烟/)
    assert.equal(readFileSync(join(dir, 'smoke-deck.pptx')).subarray(0, 2).toString('ascii'), 'PK')
    assert.ok(readFileSync(join(dir, 'smoke-deck.json'), 'utf8').includes('"title": "CLI 冒烟"'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI --list-themes 不写文件', async () => {
  const logs = []
  const code = await main(['--list-themes'], { log: (line) => logs.push(line), error: () => {} })
  assert.equal(code, 0)
  assert.equal(logs.length, 5)
  assert.match(logs.join('\n'), /data/)
})

test('CLI --motion off 产出纯静态放映页', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-motion-'))
  try {
    const logs = []
    const code = await main([
      '--title', '静态',
      '--content', '# 静态\n- 一\n- 二',
      '--motion', 'off',
      '--out', dir,
      '--file', 'static-deck',
    ], { log: (line) => logs.push(line), error: () => {} })
    assert.equal(code, 0)
    const html = readFileSync(join(dir, 'static-deck.html'), 'utf8')
    assert.match(html, /<body class="no-motion">/)
    assert.ok(!html.includes('bullet-in'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildDeck, sanitizeFileName } from '../skills/dsh-ppt/scripts/deck-core.mjs'

// Windows 保留设备名：首个点之前的主名命中即不可用，大小写不敏感。
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i

function inTempDir(prefix, run) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  try {
    return run(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('Windows 保留设备名会被替换，不落成 CON/NUL 这类文件名', () => {
  for (const input of ['CON', 'con', 'NUL', 'aux', 'COM1', 'lpt9', 'nul.pptx', 'aux.report.html']) {
    const name = sanitizeFileName(input)
    assert.ok(!WINDOWS_RESERVED.test(name), input + ' 仍是 Windows 保留名：' + name)
  }
  assert.equal(sanitizeFileName('con-report'), 'con-report', '只是以保留名开头不算保留名')
  assert.equal(sanitizeFileName('console'), 'console', '普通名字不应被误改')
})

test('fileName=CON 时三件套换成安全前缀，三份文件都真实存在', () => {
  inTempDir('dsh-ppt-reserved-', (dir) => {
    const out = buildDeck({ title: '保留名', content: '保留名测试正文。', outputDir: dir, fileName: 'CON' })
    const base = out.htmlPath.slice(dir.length + 1, -'.html'.length)
    assert.ok(!WINDOWS_RESERVED.test(base), '磁盘上的文件名不能是 Windows 保留名：' + base)
    assert.equal(out.jsonPath, join(dir, base + '.json'))
    assert.equal(out.pptxPath, join(dir, base + '.pptx'))
    for (const path of [out.htmlPath, out.jsonPath, out.pptxPath]) assert.equal(existsSync(path), true, path + ' 未生成')
  })
})

test('同名文件已存在且 overwrite=false 时 -1/-2 递增，不改写已有文件', () => {
  inTempDir('dsh-ppt-increment-', (dir) => {
    writeFileSync(join(dir, 'chain.html'), '用户已有的 HTML')
    writeFileSync(join(dir, 'chain-1.pptx'), '用户已有的 PPTX')
    const out = buildDeck({ title: '链式命名', content: '链式命名正文。', outputDir: dir, fileName: 'chain' })
    assert.equal(out.htmlPath, join(dir, 'chain-2.html'))
    assert.equal(out.jsonPath, join(dir, 'chain-2.json'))
    assert.equal(out.pptxPath, join(dir, 'chain-2.pptx'))
    assert.equal(readFileSync(join(dir, 'chain.html'), 'utf8'), '用户已有的 HTML')
    assert.equal(readFileSync(join(dir, 'chain-1.pptx'), 'utf8'), '用户已有的 PPTX')
    assert.deepEqual(readdirSync(dir).filter((name) => name.endsWith('.tmp')), [], '成功后不应留下临时文件')
  })
})

test('pptx 无法落盘时整体报错并保留旧三件套，不留新旧混版', () => {
  inTempDir('dsh-ppt-atomic-', (dir) => {
    const first = buildDeck({ title: '旧版标题', content: '旧版正文内容。', outputDir: dir, fileName: 'mix' })
    const oldJson = readFileSync(first.jsonPath, 'utf8')
    const oldHtml = readFileSync(first.htmlPath, 'utf8')
    // 用同名目录占住 pptx 路径，模拟 pptx 被占用 / 无法写入替换
    rmSync(first.pptxPath, { force: true })
    mkdirSync(first.pptxPath)

    assert.throws(
      () => buildDeck({ title: '新版标题', content: '新版正文内容。', outputDir: dir, fileName: 'mix', overwrite: true }),
      /dsh-ppt[：:]/,
      'pptx 无法落盘时必须明确报错',
    )
    assert.equal(readFileSync(first.jsonPath, 'utf8'), oldJson, 'json 不能被新版覆盖')
    assert.equal(readFileSync(first.htmlPath, 'utf8'), oldHtml, 'html 不能被新版覆盖')
    assert.equal(statSync(first.pptxPath).isDirectory(), true, 'pptx 占位目录应保持原样')
    assert.deepEqual(readdirSync(dir).filter((name) => name.endsWith('.tmp')), [], '失败后不应留下临时文件')

    // 障碍解除后，overwrite=true 仍应整体覆写三件套
    rmSync(first.pptxPath, { recursive: true, force: true })
    const second = buildDeck({ title: '新版标题', content: '新版正文内容。', outputDir: dir, fileName: 'mix', overwrite: true })
    assert.equal(JSON.parse(readFileSync(second.jsonPath, 'utf8')).title, '新版标题')
    assert.match(readFileSync(second.htmlPath, 'utf8'), /新版正文内容/)
    assert.equal(readFileSync(second.pptxPath).subarray(0, 2).toString('ascii'), 'PK')
    assert.deepEqual(readdirSync(dir).filter((name) => name.endsWith('.tmp')), [], '覆写成功后不应留下临时文件')
  })
})

test('提交阶段 pptx 无法替换时，已提交的 json/html 回滚成旧内容', { skip: process.platform === 'win32' ? false : '仅 Windows：POSIX 下 rename 覆盖只读文件仍会成功' }, () => {
  inTempDir('dsh-ppt-rollback-', (dir) => {
    const first = buildDeck({ title: '旧版标题', content: '旧版正文内容。', outputDir: dir, fileName: 'rollback' })
    const oldJson = readFileSync(first.jsonPath, 'utf8')
    const oldHtml = readFileSync(first.htmlPath, 'utf8')
    const oldPptx = readFileSync(first.pptxPath)
    // Windows：只读文件能读、但 rename 覆盖会被拒绝，正好命中「三件套提交到一半失败」。
    chmodSync(first.pptxPath, 0o444)
    try {
      assert.throws(
        () => buildDeck({ title: '新版标题', content: '新版正文内容。', outputDir: dir, fileName: 'rollback', overwrite: true }),
        /已回滚为原文件/,
        '提交中途失败必须报错并说明已回滚',
      )
      assert.equal(readFileSync(first.jsonPath, 'utf8'), oldJson, 'json 必须回滚成旧内容')
      assert.equal(readFileSync(first.htmlPath, 'utf8'), oldHtml, 'html 必须回滚成旧内容')
      assert.deepEqual(readFileSync(first.pptxPath), oldPptx, 'pptx 必须保持旧内容')
      assert.deepEqual(readdirSync(dir).filter((name) => name.endsWith('.tmp')), [], '失败后不应留下临时文件')
    } finally {
      chmodSync(first.pptxPath, 0o666)
    }
  })
})

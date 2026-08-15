import test from 'node:test'
import assert from 'node:assert/strict'
import { resolvePptConfig, PPT_OUTPUT_DIR_ENV, clampInt } from '../lib/index.js'

test('空配置可用：outputDir 空、maxSlides 默认 60', () => {
  const old = process.env[PPT_OUTPUT_DIR_ENV]
  delete process.env[PPT_OUTPUT_DIR_ENV]
  try {
    assert.deepEqual(resolvePptConfig({}), { outputDir: '', maxSlides: 60 })
    assert.deepEqual(resolvePptConfig(undefined), { outputDir: '', maxSlides: 60 })
  } finally {
    if (old === undefined) delete process.env[PPT_OUTPUT_DIR_ENV]
    else process.env[PPT_OUTPUT_DIR_ENV] = old
  }
})

test('outputDir 优先显式配置，其次环境变量', () => {
  const old = process.env[PPT_OUTPUT_DIR_ENV]
  try {
    delete process.env[PPT_OUTPUT_DIR_ENV]
    assert.equal(resolvePptConfig({ outputDir: ' E:\\decks ' }).outputDir, 'E:\\decks')
    process.env[PPT_OUTPUT_DIR_ENV] = 'D:\\env-decks'
    assert.equal(resolvePptConfig({}).outputDir, 'D:\\env-decks')
    assert.equal(resolvePptConfig({ outputDir: 'C:\\yaml-decks' }).outputDir, 'C:\\yaml-decks')
  } finally {
    if (old === undefined) delete process.env[PPT_OUTPUT_DIR_ENV]
    else process.env[PPT_OUTPUT_DIR_ENV] = old
  }
})

test('maxSlides 夹取到 3–120，非法值兜底', () => {
  assert.equal(resolvePptConfig({ maxSlides: 1 }).maxSlides, 3)
  assert.equal(resolvePptConfig({ maxSlides: 999 }).maxSlides, 120)
  assert.equal(resolvePptConfig({ maxSlides: 'x' }).maxSlides, 60)
})

test('clampInt 边界与兜底', () => {
  assert.equal(clampInt(10, 20, 1, 100), 10)
  assert.equal(clampInt(-2, 20, 1, 100), 1)
  assert.equal(clampInt(200, 20, 1, 100), 100)
  assert.equal(clampInt('x', 20, 1, 100), 20)
})

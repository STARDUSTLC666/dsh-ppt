import test from 'node:test'
import assert from 'node:assert/strict'
import { resolvePptConfig, PPT_OUTPUT_DIR_ENV, clampInt } from '../lib/index.js'
import { ALLOWED_CHROME_STYLES, ALLOWED_THEME_IDS } from '../lib/config.js'

test('空配置可用：outputDir 空、maxSlides 默认 60', () => {
  const old = process.env[PPT_OUTPUT_DIR_ENV]
  delete process.env[PPT_OUTPUT_DIR_ENV]
  try {
    assert.deepEqual(resolvePptConfig({}), { outputDir: '', maxSlides: 60, defaultTheme: '', defaultLang: '' })
    assert.deepEqual(resolvePptConfig(undefined), { outputDir: '', maxSlides: 60, defaultTheme: '', defaultLang: '' })
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

test('defaultTheme / defaultLang 解析与校验（含 auto 与全部 24 套内置主题）', () => {
  assert.equal(ALLOWED_THEME_IDS.length, 24)
  assert.deepEqual(ALLOWED_THEME_IDS.slice(0, 5), ['swiss', 'velvet', 'data', 'soft', 'bold'])
  assert.deepEqual(ALLOWED_THEME_IDS.slice(14, 18), ['keynote-light', 'financial-ft', 'medical-clean', 'luxury-noir'])
  assert.deepEqual(ALLOWED_THEME_IDS.slice(18), ['bcg-emerald', 'economist-brief', 'venture-daylight', 'stripe-craft', 'aurora-stage', 'obsidian-amber'])
  assert.equal(ALLOWED_CHROME_STYLES.length, 6)
  assert.deepEqual([...ALLOWED_CHROME_STYLES], [
    'consulting-classic',
    'keynote-spatial',
    'editorial-folio',
    'saas-bento',
    'academic-minimal',
    'gov-ceremonial',
  ])
  assert.deepEqual(resolvePptConfig({ defaultTheme: ' bold ', defaultLang: ' en ' }), { outputDir: '', maxSlides: 60, defaultTheme: 'bold', defaultLang: 'en' })
  assert.equal(resolvePptConfig({ defaultTheme: ' auto ' }).defaultTheme, 'auto')
  for (const id of ALLOWED_THEME_IDS) {
    assert.equal(resolvePptConfig({ defaultTheme: id }).defaultTheme, id)
  }
  assert.throws(() => resolvePptConfig({ defaultTheme: 'neon' }), /defaultTheme/)
  assert.throws(() => resolvePptConfig({ defaultLang: 'jp' }), /defaultLang/)
})

test('无效配置直接报错，不静默夹取或回退', () => {
  assert.throws(() => resolvePptConfig({ maxSlides: 1 }), /maxSlides/)
  assert.throws(() => resolvePptConfig({ maxSlides: 999 }), /maxSlides/)
  assert.throws(() => resolvePptConfig({ maxSlides: 'x' }), /maxSlides/)
  assert.throws(() => resolvePptConfig({ outputDir: 42 }), /outputDir/)
  assert.throws(() => resolvePptConfig('bad'), /配置必须是对象/)
})

test('clampInt 边界与兜底', () => {
  assert.equal(clampInt(10, 20, 1, 100), 10)
  assert.equal(clampInt(-2, 20, 1, 100), 1)
  assert.equal(clampInt(200, 20, 1, 100), 100)
  assert.equal(clampInt('x', 20, 1, 100), 20)
})

test('24 套内置主题与 6 套母版骨架列表唯一且顺序稳定', () => {
  assert.equal(new Set(ALLOWED_THEME_IDS).size, 24)
  assert.equal(new Set(ALLOWED_CHROME_STYLES).size, 6)
  for (const id of ['keynote-light', 'financial-ft', 'medical-clean', 'luxury-noir', 'bcg-emerald', 'economist-brief', 'venture-daylight', 'stripe-craft', 'aurora-stage', 'obsidian-amber']) {
    assert.ok(ALLOWED_THEME_IDS.includes(id), id + ' missing from ALLOWED_THEME_IDS')
  }
  for (const chrome of ['consulting-classic', 'keynote-spatial', 'editorial-folio', 'saas-bento', 'academic-minimal', 'gov-ceremonial']) {
    assert.ok(ALLOWED_CHROME_STYLES.includes(chrome), chrome + ' missing from ALLOWED_CHROME_STYLES')
  }
})

test('resolvePptConfig 接受 Phase-3 新增主题及 maxSlides/defaultLang 边界', () => {
  for (const theme of ['keynote-light', 'financial-ft', 'medical-clean', 'luxury-noir']) {
    assert.equal(resolvePptConfig({ defaultTheme: theme, defaultLang: 'bilingual', maxSlides: 120 }).defaultTheme, theme)
  }
  assert.equal(resolvePptConfig({ maxSlides: 3 }).maxSlides, 3)
  assert.equal(resolvePptConfig({ maxSlides: 120 }).maxSlides, 120)
  assert.throws(() => resolvePptConfig({ maxSlides: 2 }), /maxSlides/)
  assert.throws(() => resolvePptConfig({ maxSlides: 121 }), /maxSlides/)
})

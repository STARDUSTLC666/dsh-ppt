import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const README_ZH = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
const README_EN = readFileSync(new URL('../README.en.md', import.meta.url), 'utf8')

test('README 不再承诺错误提示中英双语', () => {
  assert.doesNotMatch(README_ZH, /错误提示[^。\n]*中英双语/, 'README.md 仍承诺错误提示中英双语')
  assert.doesNotMatch(README_ZH, /中英双语[^。\n]*错误提示/, 'README.md 仍把中英双语与错误提示绑在一起')
  assert.match(README_ZH, /报错[^。\n]*中文/, 'README.md 应说明 CLI/技能报错为中文')
  assert.doesNotMatch(README_EN, /error messages are bilingual/i, 'README.en.md 仍承诺双语错误提示')
  assert.match(README_EN, /error messages are in Chinese/i, 'README.en.md 应说明报错为中文')
})

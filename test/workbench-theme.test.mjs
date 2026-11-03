import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * 工作台视觉一致性守卫。
 *
 * 这一类问题测试最难抓：控件长得不对、暗色下预览块仍是浅蓝、错误条和首次使用空状态
 * 自己手写一套 —— 纯逻辑测试全绿，用户一眼就看见。所以这里锁两件事：
 *   1. 有意的主题变量必须来自宿主 / workbench-ui（--dsw-alias-*、--w-*），不许写死浅色 hex；
 *   2. 反馈与空状态必须复用 ui/workbench-ui.js 的现成组件（W.Status / W.Empty），
 *      不再各自手写 notice + 裸 <button>。
 * 规范源是 dsh-suite/ui/workbench-ui.js，本仓库只 vendor 副本，不另起设计系统。
 */
const SOURCE = readFileSync(new URL('../templates/client.js', import.meta.url), 'utf8')
const BUNDLE = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

test('workbench surfaces take their colours from host theme tokens', () => {
  for (const hardcoded of [/background:#f0f4fa/, /background:#edf2f8/, /outline:3px solid #78a8ff/, /color:#986114/, /button\.primary\{background:#245ee9/]) {
    assert.doesNotMatch(SOURCE, hardcoded, '工作台 CSS 仍有写死的浅色值：' + hardcoded)
  }
  for (const token of ['var(--w-bg', 'var(--w-soft', 'var(--w-border', 'var(--w-text', 'var(--w-accent', 'var(--w-primary', 'var(--w-selected', 'var(--dsw-alias-state-error-primary', 'var(--dsw-alias-state-warn-primary']) {
    assert.ok(SOURCE.includes(token), token + ' 没有被复用（应跟随宿主主题）')
  }
  assert.match(SOURCE, /\.pptw \.preview\{[^}]*background:var\(--w-soft/, '预览画布底色应跟随主题')
})

test('recovery and first-run states reuse the shared workbench components', () => {
  assert.ok(SOURCE.includes("h(W.Status,{tone:'error',className:'ppt-recovery'}"), '错误恢复应复用 W.Status(tone:error)，不要手写 notice')
  assert.ok(SOURCE.includes("h(W.Empty,{icon:'slides',title:t(\"还没有可以编辑的项目\")"), '首次使用的空状态应复用 W.Empty')
  assert.doesNotMatch(SOURCE, /className: 'notice error' \}, error, ' ', h\('button'/, '错误恢复不应再拼 notice + 裸 <button>')
  assert.match(SOURCE, /h\(W\.Button,\{key:'retry'/, '错误恢复要保留可点的重试按钮')
})

test('the fullscreen exit control only exists while the preview is fullscreen', () => {
  assert.match(SOURCE, /\.pptw \.preview \.ppt-fullscreen-exit\{display:none\}/, '非全屏时必须隐藏退出全屏按钮')
  assert.match(SOURCE, /\.pptw \.preview:fullscreen \.ppt-fullscreen-exit\{display:inline-flex/, '全屏时才显示退出全屏按钮')
  assert.ok(SOURCE.includes('if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{})'), '不在全屏时点击不应产生未处理的 Promise 拒绝')
})

test('built client matches the template sources', () => {
  for (const marker of ['.ppt-fullscreen-exit{display:none}', 'var(--w-soft,#f0f4fa)', "ppt-recovery"]) {
    assert.ok(BUNDLE.includes(marker), marker + ' 不在 lib/client.js 里：请运行 pnpm run build 并提交产物')
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createPptExecutors } from '../lib/execution.js'
import { resolvePptConfig } from '../lib/config.js'

const args = { title: 'Session deck', content: '# Session deck\n- one' }
const execution = (cwd, signal) => ({ agent: { session: { header: { cwd } } }, signal })

test('默认输出随调用会话隔离，两个并行调用不改变进程 cwd', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dsh-ppt-session-'))
  const before = process.cwd()
  try {
    const tools = createPptExecutors(resolvePptConfig({}))
    const sessions = [join(root, 'one'), join(root, 'two')]
    const results = await Promise.all(sessions.map(cwd => tools.create(args, execution(cwd))))
    for (let i = 0; i < results.length; i += 1) {
      assert.equal(results[i].outputDir, sessions[i])
      assert.ok(existsSync(results[i].pptxPath))
    }
    assert.equal(process.cwd(), before)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('相对配置/参数以会话 cwd 解析，绝对参数优先，独立调用回退进程 cwd', async () => {
  const engine = { buildDeck: options => options }
  const tools = createPptExecutors(resolvePptConfig({ outputDir: 'configured' }), async () => engine)
  const sessionDir = resolve(tmpdir(), 'ppt-session')
  const absoluteDir = resolve(tmpdir(), 'ppt-explicit')
  assert.equal((await tools.create(args, execution(sessionDir))).outputDir, join(sessionDir, 'configured'))
  assert.equal((await tools.create({ ...args, outputDir: 'argument' }, execution(sessionDir))).outputDir, join(sessionDir, 'argument'))
  assert.equal((await tools.create({ ...args, outputDir: absoluteDir }, execution(sessionDir))).outputDir, absoluteDir)
  assert.equal((await tools.create(args)).outputDir, join(process.cwd(), 'configured'))
})

test('已取消的工具调用不加载引擎、不生成文件', async () => {
  const controller = new AbortController()
  controller.abort(new Error('cancel before load'))
  let loaded = false
  const tools = createPptExecutors(resolvePptConfig({}), async () => { loaded = true; return {} })
  for (const execute of [tools.create, tools.themes]) {
    await assert.rejects(execute(args, { signal: controller.signal }), /cancel before load/)
  }
  assert.equal(loaded, false)
})

test('引擎加载期间取消后，不调用同步生成或主题查询', async () => {
  for (const name of ['create', 'themes']) {
    const controller = new AbortController()
    let release
    let executed = false
    const engine = {
      buildDeck() { executed = true },
      listThemes() { executed = true },
    }
    const tools = createPptExecutors(resolvePptConfig({}), () => new Promise(resolveEngine => { release = () => resolveEngine(engine) }))
    const pending = tools[name](args, { signal: controller.signal })
    controller.abort(new Error('cancel during load'))
    release()
    await assert.rejects(pending, /cancel during load/)
    assert.equal(executed, false)
  }
})

test('注册工具将 Harness execution 原样传给执行层', async () => {
  const { apply } = await import('../lib/index.js')
  const definitions = []
  apply({
    tools: { register(definition) { definitions.push(definition); return () => {} } },
    skills: { register() { return () => {} } },
  })
  const controller = new AbortController()
  controller.abort(new Error('registered cancellation'))
  for (const definition of definitions) {
    await assert.rejects(definition.execute(args, { signal: controller.signal }), /registered cancellation/)
  }
})

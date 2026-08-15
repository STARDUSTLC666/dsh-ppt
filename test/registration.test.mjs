import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, parseSkillFile } from '../lib/index.js'

function fakeCtx() {
  return {
    tools: {
      defs: [],
      register(def) {
        this.defs.push(def)
        return () => {}
      },
    },
    skills: {
      defs: [],
      register(def) {
        this.defs.push(def)
        return () => {}
      },
    },
    logger: { warn() {} },
    on() { return () => {} },
  }
}

test('parseSkillFile 兼容 CRLF 与带引号的单行 frontmatter', () => {
  const parsed = parseSkillFile('---\r\nname: "dsh-ppt"\r\ndescription: "Turn text into a deck: HTML + PPTX."\r\n---\r\n\r\n# Body\r\n')
  assert.equal(parsed.name, 'dsh-ppt')
  assert.equal(parsed.description, 'Turn text into a deck: HTML + PPTX.')
  assert.match(parsed.content, /^# Body/)
})

test('apply 空配置即可注册 2 个工具与 1 个技能（加载不失败）', () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  assert.deepEqual(ctx.tools.defs.map((def) => def.name).sort(), ['ppt_create', 'ppt_themes'])
  assert.equal(ctx.skills.defs.length, 1)
  assert.equal(ctx.skills.defs[0].name, 'dsh-ppt')
  assert.ok(ctx.skills.defs[0].content.length > 500)
  assert.equal(ctx.skills.defs[0].resourceBase.kind, 'directory')
  assert.ok(existsSync(join(ctx.skills.defs[0].resourceBase.path, 'SKILL.md')))
})

test('每个已注册工具的 parameters 都是编译好的 JSON Schema', () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  for (const def of ctx.tools.defs) {
    assert.equal(def.parameters.type, 'object', def.name + ' parameters 根必须是 object')
    assert.ok(def.parameters.properties && typeof def.parameters.properties === 'object', def.name + ' 必须有 properties')
    for (const [key, node] of Object.entries(def.parameters.properties)) {
      assert.ok(typeof node.type === 'string', def.name + '.' + key + ' 必须声明 type')
    }
    assert.deepEqual(JSON.parse(JSON.stringify(def.parameters)), def.parameters)
  }
  const create = ctx.tools.defs.find((def) => def.name === 'ppt_create')
  assert.deepEqual(create.parameters.required, ['title', 'content'])
  assert.equal(create.parameters.properties.slides.items.type, 'object')
})

test('output.schema 是纯 JSON（可无损序列化）', () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  for (const def of ctx.tools.defs) {
    assert.equal(def.output.schema.type, 'object')
    assert.equal(def.output.schema.additionalProperties, true)
    assert.deepEqual(JSON.parse(JSON.stringify(def.output.schema)), def.output.schema)
  }
})

test('execute 校验参数，不触网', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const create = ctx.tools.defs.find((def) => def.name === 'ppt_create')
  await assert.rejects(() => create.execute({ title: '  ', content: 'x' }), /title 不能为空/)
  await assert.rejects(() => create.execute({ title: 'T', content: '   ' }), /content 不能为空/)
  await assert.rejects(() => create.execute({ title: 'T', content: 'x', theme: 'neon' }), /未知主题/)
})

test('ppt_themes 返回 5 套内置主题并给出可读文本', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const themes = ctx.tools.defs.find((def) => def.name === 'ppt_themes')
  const out = await themes.execute({})
  assert.equal(out.ok, true)
  assert.equal(out.themes.length, 5)
  assert.deepEqual(out.themes.map((theme) => theme.id).sort(), ['bold', 'data', 'soft', 'swiss', 'velvet'])
  const rendered = themes.output.render({}, out)
  assert.equal(rendered.length, 1)
  assert.match(rendered[0].text, /data/)
})

test('ppt_create 生成 HTML 放映 + PPTX + manifest 三件套', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-reg-'))
  try {
    const create = ctx.tools.defs.find((def) => def.name === 'ppt_create')
    const out = await create.execute({
      title: '把会议减半',
      content: '# 把会议减半\n\n用异步决策替代同步例会。\n\n## 问题\n- 工程师每周 6 小时在例会上\n- 决策没有记录\n\n## 方案\n- 会前异步文档\n- 只有分歧项才开会\n',
      theme: 'swiss',
      lang: 'zh',
      outputDir: dir,
      fileName: 'meeting-less',
    })
    assert.equal(out.ok, true)
    assert.equal(out.theme, 'swiss')
    assert.equal(out.slideCount, 4)
    assert.ok(existsSync(out.htmlPath))
    assert.ok(existsSync(out.pptxPath))
    assert.ok(existsSync(out.jsonPath))

    const html = readFileSync(out.htmlPath, 'utf8')
    assert.match(html, /<!DOCTYPE html>/)
    assert.match(html, /slide--cover/)
    assert.match(html, /#2F6BFF/)
    assert.match(html, /把会议减半/)

    const pptx = readFileSync(out.pptxPath)
    assert.equal(pptx.subarray(0, 2).toString('ascii'), 'PK')
    assert.ok(pptx.length > 2000)

    const manifest = JSON.parse(readFileSync(out.jsonPath, 'utf8'))
    assert.equal(manifest.version, '0.1.0')
    assert.equal(manifest.slides.length, out.slideCount)

    const rendered = create.output.render({}, out)
    assert.match(rendered[0].text, /HTML 网页放映/)
    assert.match(rendered[0].text, /PPTX/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('结构化 slides 走精确控制通道', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-slides-'))
  try {
    const create = ctx.tools.defs.find((def) => def.name === 'ppt_create')
    const out = await create.execute({
      title: '双语 Deck',
      content: '',
      slides: [
        { layout: 'cover', title: '双语 Deck', subtitle: 'Bilingual subtitle' },
        { layout: 'statement', title: '核心观点', subtitle: 'Core idea' },
        { layout: 'closing', title: '谢谢 · Thank You', subtitle: 'CTA' },
      ],
      lang: 'bilingual',
      outputDir: dir,
    })
    assert.equal(out.slideCount, 3)
    const html = readFileSync(out.htmlPath, 'utf8')
    assert.match(html, /slide--statement/)
    assert.match(html, /核心观点/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

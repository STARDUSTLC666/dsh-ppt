import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, parseSkillFile } from '../lib/index.js'
import { ALLOWED_THEME_IDS } from '../lib/config.js'

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

test('apply 空配置即可注册 9 个工具与 1 个技能（加载不失败）', () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  assert.deepEqual(ctx.tools.defs.map((def) => def.name).sort(), ['ppt_absorb', 'ppt_check', 'ppt_create', 'ppt_data', 'ppt_edit', 'ppt_render', 'ppt_templates', 'ppt_themes', 'ppt_undo'])
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
      assert.ok(typeof node.type === 'string' || Array.isArray(node.oneOf), def.name + '.' + key + ' 必须声明 type 或 oneOf')
    }
    assert.deepEqual(JSON.parse(JSON.stringify(def.parameters)), def.parameters)
  }
  const create = ctx.tools.defs.find((def) => def.name === 'ppt_create')
  assert.deepEqual(create.parameters.required, ['title'])
  assert.equal(create.parameters.properties.slides.items.type, 'object')
  assert.deepEqual(create.parameters.properties.motion.enum, ['on', 'off'])
  assert.equal(create.parameters.properties.overwrite.type, 'boolean')
  const walk = node => {
    assert.equal(Array.isArray(node.type), false, 'Harness不接受type数组')
    if (node.oneOf) node.oneOf.forEach(walk)
    if (node.items) walk(node.items)
    Object.values(node.properties ?? {}).forEach(walk)
  }
  for (const def of ctx.tools.defs) walk(def.parameters)
  assert.deepEqual(create.parameters.properties.slides.items.properties.image.oneOf.map(n => n.type), ['object', 'string', 'null'])
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

test('ppt_themes 返回 24 套内置主题并给出可读文本', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const themes = ctx.tools.defs.find((def) => def.name === 'ppt_themes')
  const out = await themes.execute({})
  assert.deepEqual(JSON.parse(JSON.stringify(out)), out)
  assert.equal(out.ok, true)
  assert.equal(out.themes.length, 24)
  assert.deepEqual(out.themes.slice(0, 5).map((theme) => theme.id), ['swiss', 'velvet', 'data', 'soft', 'bold'])
  assert.deepEqual(out.themes.map((theme) => theme.id).sort(), [...ALLOWED_THEME_IDS].sort())
  const rendered = themes.output.render({}, out)
  assert.equal(rendered.length, 1)
  assert.match(rendered[0].text, /consulting/)
  assert.match(rendered[0].text, /keynote-light/)
  assert.match(rendered[0].text, /data/)
})

test('ppt_themes preview=true 生成主题对比页与 24 张 SVG', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-reg-preview-'))
  try {
    const themes = ctx.tools.defs.find((def) => def.name === 'ppt_themes')
    const out = await themes.execute({ preview: true, outputDir: dir })
    assert.equal(out.ok, true)
    assert.equal(out.preview.themeCount, 24)
    assert.ok(existsSync(out.preview.htmlPath))
    assert.equal(out.preview.svgs.length, 24)
    for (const svg of out.preview.svgs) assert.ok(existsSync(svg.path))
    const rendered = themes.output.render({}, out)
    assert.match(rendered[0].text, /themes-preview/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
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
    assert.deepEqual(JSON.parse(JSON.stringify(out)), out)
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
    assert.equal(manifest.version, JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version)
    assert.equal(manifest.slides.length, out.slideCount)

    const rendered = create.output.render({}, out)
    assert.match(rendered[0].text, /打开演示文稿/)
    assert.match(rendered[0].text, /可继续编辑的项目/)
    assert.match(rendered[0].text, /PPTX/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('ppt_create motion=off 产出纯静态三件套', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-motion-off-'))
  try {
    const create = ctx.tools.defs.find((def) => def.name === 'ppt_create')
    const out = await create.execute({
      title: '静态汇报',
      content: '# 静态汇报\n- 一\n- 二',
      motion: 'off',
      outputDir: dir,
    })
    assert.equal(out.ok, true)
    const manifest = JSON.parse(readFileSync(out.jsonPath, 'utf8'))
    assert.equal(manifest.motion, false)
    assert.match(readFileSync(out.htmlPath, 'utf8'), /<body class="no-motion">/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('defaultTheme / defaultLang 作为 ppt_create 缺省值', async () => {
  const ctx = fakeCtx()
  apply(ctx, { defaultTheme: 'bold', defaultLang: 'en' })
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-defaults-'))
  try {
    const create = ctx.tools.defs.find((def) => def.name === 'ppt_create')
    const out = await create.execute({ title: 'Defaults', content: '# Defaults\n\n- one', outputDir: dir })
    assert.equal(out.theme, 'bold')
    assert.equal(out.language, 'en')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('结构化 slides 可在不传 content 时走精确控制通道', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-slides-'))
  try {
    const create = ctx.tools.defs.find((def) => def.name === 'ppt_create')
    const out = await create.execute({
      title: '双语 Deck',
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

test('ppt_absorb、扩展版式与编辑参数均通过编译契约与参数校验', async () => {
  const ctx = fakeCtx()
  apply(ctx, {})
  const absorb = ctx.tools.defs.find((def) => def.name === 'ppt_absorb')
  const create = ctx.tools.defs.find((def) => def.name === 'ppt_create')
  const edit = ctx.tools.defs.find((def) => def.name === 'ppt_edit')
  assert.deepEqual(absorb.parameters.required, ['pptxPath'])
  await assert.rejects(() => absorb.execute({ pptxPath: '   ' }), /pptxPath 不能为空/)
  const rendered = absorb.output.render({}, {
    ok: true,
    pptxPath: 'corp-template.pptx',
    slideCount: 6,
    recommendedTheme: 'consulting',
    recommendedChrome: 'consulting-classic',
    extractedSkeleton: { cornerStyle: 'sharp', hasTopBanner: false, hasSideSpine: false, masterShapeCount: 4 },
    slideSkeleton: [{ slideNumber: 1, inferredLayout: 'cover' }, { slideNumber: 2, inferredLayout: 'kpi' }],
    sanitizedBrand: { primaryColor: '#0057B8', backgroundColor: '#FFFFFF', textColor: '#0F172A', fontFamily: 'Microsoft YaHei', chromeStyle: 'consulting-classic', logo: 'data:image/png;base64,AA==' },
    sanitizedTokens: {},
  })
  assert.match(rendered[0].text, /corp-template\.pptx/)
  assert.match(rendered[0].text, /consulting-classic/)
  assert.match(rendered[0].text, /P1:cover/)
  assert.match(rendered[0].text, /Logo/)
  assert.ok(create.parameters.properties.persona.enum.includes('consulting'))
  assert.equal(create.parameters.properties.referencePptx.type, 'string')
  assert.equal(create.parameters.properties.cloneStructure.type, 'boolean')
  assert.equal(create.parameters.properties.template.enum.length, 20)
  for (const layoutId of ['kpi', 'chart-split', 'gantt', 'architecture', 'harvey', 'tam', 'org', 'chevron', 'value-chain']) {
    assert.ok(create.parameters.properties.slides.items.properties.layout.enum.includes(layoutId), layoutId + ' missing')
  }
  assert.ok(create.parameters.properties.slides.items.properties.tableStyle.enum.includes('harvey'))
  assert.equal(create.parameters.properties.slides.items.properties.chrome.enum.length, 6)
  assert.equal(create.parameters.properties.slides.items.properties.columns.type, 'array')
  assert.equal(create.parameters.properties.brand.properties.chromeStyle.oneOf[0].enum.length, 6)
  assert.equal(edit.parameters.properties.theme.type, 'string')
  assert.equal(edit.parameters.properties.referencePptx.type, 'string')
  assert.equal(edit.parameters.properties.append.type, 'array')
  const templates = ctx.tools.defs.find((def) => def.name === 'ppt_templates')
  const tplOut = await templates.execute({})
  assert.equal(tplOut.templates.length, 20)
})

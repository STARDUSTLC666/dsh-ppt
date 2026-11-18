import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as officeKit from '@office-kit/pptx'
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

test('parseArgv 支持 --absorb、--reference-pptx、--persona 与 --smart-layout/--no-smart-layout', () => {
  const enabled = parseArgv(['--title', '汇报', '--persona', 'academic', '--reference-pptx', 'ref.pptx', '--smart-layout'])
  assert.equal(enabled.persona, 'academic')
  assert.equal(enabled.referencePptx, 'ref.pptx')
  assert.equal(enabled.smartLayout, true)
  assert.equal(enabled.theme, undefined)

  const disabled = parseArgv(['--absorb=corp.pptx', '--no-smart-layout'])
  assert.equal(disabled.absorb, 'corp.pptx')
  assert.equal(disabled.smartLayout, false)
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

test('CLI --list-themes 输出全部 24 套内置大师主题且不写文件', async () => {
  const logs = []
  const code = await main(['--list-themes'], { log: (line) => logs.push(line), error: () => {} })
  assert.equal(code, 0)
  assert.equal(logs.length, 24)
  assert.match(logs.join('\n'), /data/)
  assert.match(logs.join('\n'), /consulting/)
  assert.match(logs.join('\n'), /exec-jilan/)
  assert.match(logs.join('\n'), /keynote-light/)
  assert.match(logs.join('\n'), /financial-ft/)
  assert.match(logs.join('\n'), /medical-clean/)
  assert.match(logs.join('\n'), /luxury-noir/)
  assert.match(logs.join('\n'), /bcg-emerald/)
  assert.match(logs.join('\n'), /stripe-craft/)
})

test('CLI --list-templates 输出 20 套行业结构蓝图且兼容前 8 个经典 ID', async () => {
  const logs = []
  const code = await main(['--list-templates', '--lang', 'en'], { log: (line) => logs.push(line) })
  assert.equal(code, 0)
  const payload = JSON.parse(logs.join('\n'))
  assert.equal(payload.templates.length, 20)
  assert.deepEqual(payload.templates.slice(0, 8).map((t) => t.id), [
    'weekly', 'defense', 'project', 'pitch', 'consulting', 'keynote', 'gov-report', 'workshop',
  ])
  assert.deepEqual(payload.templates.slice(16).map((t) => t.id), [
    'quarterly-okr', 'product-prd', 'vc-daylight', 'industry-research',
  ])
})

test('parseArgv 与 CLI 主流程支持 --chrome 与 --clone-structure', async () => {
  const parsed = parseArgv(['--title', '测试', '--chrome', 'academic-minimal', '--clone-structure'])
  assert.equal(parsed.chrome, 'academic-minimal')
  assert.equal(parsed.cloneStructure, true)

  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-chrome-'))
  try {
    const code = await main([
      '--title', '学术横幅测试',
      '--content', '# 学术汇报\n## 实验结果\n- 准确率提升 18%',
      '--theme', 'consulting',
      '--chrome', 'academic-minimal',
      '--out', dir,
      '--file', 'chrome-deck',
    ], { log: () => {}, error: () => {} })
    assert.equal(code, 0)
    const manifest = JSON.parse(readFileSync(join(dir, 'chrome-deck.json'), 'utf8'))
    assert.equal(manifest.brand.chromeStyle, 'academic-minimal')
    assert.match(readFileSync(join(dir, 'chrome-deck.html'), 'utf8'), /data-chrome="academic-minimal"/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI --absorb 输出 extractedSkeleton、recommendedChrome 与 slideSkeleton JSON', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-skel-'))
  try {
    const pres = await officeKit.createPresentation({ title: 'Skeleton Ref' })
    const s = officeKit.addBlankSlide(pres)
    officeKit.addSlideTable(s, { x: 914400, y: 914400, w: 6000000, h: 2000000, rows: [['A', 'B'], ['1', '2']] })
    const refPath = join(dir, 'table-ref.pptx')
    writeFileSync(refPath, await officeKit.savePresentation(pres))

    const logs = []
    assert.equal(await main(['--absorb', refPath], { log: (l) => logs.push(l) }), 0)
    const absorbed = JSON.parse(logs.join('\n'))
    assert.ok(absorbed.extractedSkeleton)
    assert.ok(absorbed.recommendedChrome)
    assert.equal(absorbed.slideSkeleton[0].inferredLayout, 'table')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI --reference-pptx --clone-structure 克隆骨架并写入 chromeStyle', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-clone-'))
  try {
    const pres = await officeKit.createPresentation({ title: 'Corp Ref' })
    officeKit.addBlankSlide(pres)
    const s2 = officeKit.addBlankSlide(pres)
    officeKit.addSlideTable(s2, { x: 914400, y: 914400, w: 6000000, h: 2000000, rows: [['K', 'V'], ['1', '2']] })
    const refPath = join(dir, 'corp.pptx')
    writeFileSync(refPath, await officeKit.savePresentation(pres))

    assert.equal(await main([
      '--title', '克隆测试',
      '--content', '# 克隆测试\n## 第一节\n- 要点 A\n- 要点 B',
      '--reference-pptx', refPath,
      '--clone-structure',
      '--out', dir,
      '--file', 'cloned-cli',
    ], { log: () => {} }), 0)
    const manifest = JSON.parse(readFileSync(join(dir, 'cloned-cli.json'), 'utf8'))
    assert.ok(manifest.brand?.chromeStyle)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI --template architecture-review 可直接生成技术架构评审草稿三件套', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-arch-'))
  try {
    assert.equal(await main([
      '--title', '微服务网关架构评审',
      '--template', 'architecture-review',
      '--out', dir,
      '--file', 'arch-draft',
    ], { log: () => {} }), 0)
    const manifest = JSON.parse(readFileSync(join(dir, 'arch-draft.json'), 'utf8'))
    assert.equal(manifest.template, 'architecture-review')
    assert.ok(manifest.slides.some((s) => s.layout === 'architecture'))
    assert.ok(manifest.slides.some((s) => s.layout === 'gantt'))
    assert.ok(manifest.slides.some((s) => s.layout === 'harvey'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
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

test('CLI --theme auto 与 --persona 自动匹配投影浅色主题并执行 smartLayout 升维', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-auto-'))
  try {
    const mdPath = join(dir, 'auto.md')
    writeFileSync(mdPath, [
      '# 论文答辩汇报',
      '## 核心实验增益',
      '- 准确率提升 14.2%',
      '- 推理延迟降低 38%',
      '## 方法演进路径',
      '- 第一步：多尺度特征对齐',
      '- 第二步：稀疏注意力蒸馏',
      '- 第三步：端侧量化部署',
    ].join('\n'), 'utf8')
    const logs = []
    assert.equal(await main([
      '--title', '多模态论文答辩',
      '--content', '@' + mdPath,
      '--theme', 'auto',
      '--smart-layout',
      '--out', dir,
      '--file', 'auto-deck',
    ], { log: (l) => logs.push(l) }), 0)
    const manifest = JSON.parse(readFileSync(join(dir, 'auto-deck.json'), 'utf8'))
    assert.equal(manifest.theme, 'academic')
    assert.ok(manifest.slides.some((s) => s.layout === 'kpi'))
    assert.ok(manifest.slides.some((s) => s.layout === 'process'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI --absorb、--reference-pptx 与 --edit --theme 完整闭环且互斥参数校验生效', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-absorb-'))
  try {
    const pres = await officeKit.createPresentation({ title: '政务母版' })
    const s = officeKit.addBlankSlide(pres)
    officeKit.setSlideBackground(s, '#0055EE')
    const refPptx = join(dir, 'gov-ref.pptx')
    writeFileSync(refPptx, await officeKit.savePresentation(pres))

    const absorbLogs = []
    assert.equal(await main(['--absorb', refPptx], { log: (l) => absorbLogs.push(l) }), 0)
    const absorbed = JSON.parse(absorbLogs.join('\n'))
    assert.equal(absorbed.ok, true)
    assert.equal(absorbed.sanitizedTokens.coverMode, 'inverted-accent')

    await assert.rejects(main(['--absorb', refPptx, '--check', 'x.json'], { log() {} }), /只能选择一项/)

    assert.equal(await main([
      '--title', '年度总结',
      '--content', '# 年度总结\n- 核心指标超额完成 108%',
      '--reference-pptx', refPptx,
      '--out', dir,
      '--file', 'ref-built',
    ], { log() {} }), 0)
    const builtJson = join(dir, 'ref-built.json')
    assert.equal(JSON.parse(readFileSync(builtJson, 'utf8')).theme, absorbed.recommendedTheme)

    assert.equal(await main([
      '--edit', builtJson,
      '--theme', 'course-sage',
    ], { log() {} }), 0)
    assert.equal(JSON.parse(readFileSync(builtJson, 'utf8')).theme, 'course-sage')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('CLI --import-pptx、--preserve-theme、--handout 与 --sync-pptx 闭环', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-cli-import-'))
  try {
    const parsed = parseArgv(['--import-pptx', 'old.pptx', '--preserve-theme', '--handout'])
    assert.equal(parsed.importPptx, 'old.pptx')
    assert.equal(parsed.preserveTheme, true)
    assert.equal(parsed.handout, true)

    const pres = await officeKit.createPresentation({ title: 'Legacy CLI' })
    const s1 = officeKit.addBlankSlide(pres)
    officeKit.addSlideTextBox(s1, { x: 914400, y: 1200000, w: 8000000, h: 1000000, text: 'CLI 导入翻新标题' })
    const s2 = officeKit.addBlankSlide(pres)
    officeKit.addSlideTextBox(s2, { x: 914400, y: 500000, w: 8000000, h: 800000, text: '关键实验指标' })
    officeKit.addSlideTextBox(s2, { x: 914400, y: 1500000, w: 8000000, h: 2000000, text: '准确率提升 18%' })
    officeKit.setSlideNotes(s2, 'CLI 导入的演讲者备注')
    const srcPptx = join(dir, 'src.pptx')
    writeFileSync(srcPptx, await officeKit.savePresentation(pres))

    await assert.rejects(main(['--import-pptx', srcPptx, '--sync-pptx', srcPptx], { log() {} }), /只能选择一项/)

    const outDir = join(dir, 'out')
    const logs = []
    assert.equal(await main([
      '--import-pptx', srcPptx,
      '--theme', 'consulting',
      '--handout',
      '--out', outDir,
      '--file', 'imported-cli',
    ], { log: (l) => logs.push(l) }), 0)
    const imported = JSON.parse(logs.join('\n'))
    assert.equal(imported.ok, true)
    assert.equal(imported.syncedProject, false)
    assert.ok(imported.handoutPath && existsSync(imported.handoutPath))
    assert.match(readFileSync(imported.handoutPath, 'utf8'), /CLI 导入的演讲者备注/)

    // Office round-trip sync via --sync-pptx + --edit
    const p2 = await officeKit.loadPresentation(readFileSync(imported.pptxPath))
    officeKit.replaceTextInSlide(officeKit.getSlides(p2)[1], '关键实验指标', 'CLI 同步后新标题')
    const editedPath = join(dir, 'edited.pptx')
    writeFileSync(editedPath, await officeKit.savePresentation(p2))

    const syncLogs = []
    assert.equal(await main([
      '--sync-pptx', editedPath,
      '--edit', imported.jsonPath,
      '--handout',
    ], { log: (l) => syncLogs.push(l) }), 0)
    const synced = JSON.parse(syncLogs.join('\n'))
    assert.equal(synced.syncedProject, true)
    assert.equal(synced.revision, 1)
    assert.equal(JSON.parse(readFileSync(imported.jsonPath, 'utf8')).slides[1].title, 'CLI 同步后新标题')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

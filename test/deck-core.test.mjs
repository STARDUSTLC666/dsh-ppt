import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import {
  THEMES,
  THEME_IDS,
  CHROME_STYLES,
  DEFAULT_THEME,
  SMART_DEFAULT_THEME,
  CORE_LAYOUTS,
  LAYOUT_ALIASES,
  buildDeck,
  buildPptx,
  buildThemePreview,
  renderThemePreviewHtml,
  renderThemeSvg,
  listThemes,
  parseMarkdownDeck,
  normalizeSlides,
  renderHtml,
  resolveLanguage,
  resolveTheme,
  resolveChromeStyle,
  sanitizeFileName,
  deriveBrandedTheme,
  sanitizeAbsorbedTheme,
  contrastRatio,
  pptxFontName,
  pptxEastAsianFont,
  computeTextFit,
  parseInlineRuns,
  renderInlineHtml,
  formatSourceLine,
  computeBadgePillWidth,
  roundRectAdj,
  parseHarveyValue,
} from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { applyVisualActions, normalizeVisual, visualShapeXml } from '../skills/dsh-ppt/scripts/deck-visual.mjs'

function unzipPptxXml(buf) {
  let eocd = -1
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  const count = buf.readUInt16LE(eocd + 10)
  let ptr = buf.readUInt32LE(eocd + 16)
  const entries = {}
  for (let n = 0; n < count; n += 1) {
    const nameLen = buf.readUInt16LE(ptr + 28)
    const extraLen = buf.readUInt16LE(ptr + 30)
    const commentLen = buf.readUInt16LE(ptr + 32)
    const compressedSize = buf.readUInt32LE(ptr + 20)
    const localOffset = buf.readUInt32LE(ptr + 42)
    const name = buf.slice(ptr + 46, ptr + 46 + nameLen).toString('utf8')
    const localNameLen = buf.readUInt16LE(localOffset + 26)
    const localExtraLen = buf.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLen + localExtraLen
    entries[name] = inflateRawSync(buf.slice(dataStart, dataStart + compressedSize)).toString('utf8')
    ptr += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

test('内置 24 套大师主题与 6 套母版骨架，兼容前 18 套顺序与色值并满足 WCAG AA 对比度', () => {
  assert.equal(THEME_IDS.length, 24)
  assert.deepEqual(THEME_IDS.slice(0, 5), ['swiss', 'velvet', 'data', 'soft', 'bold'])
  assert.deepEqual(THEME_IDS.slice(14, 18), ['keynote-light', 'financial-ft', 'medical-clean', 'luxury-noir'])
  assert.deepEqual(THEME_IDS.slice(18), ['bcg-emerald', 'economist-brief', 'venture-daylight', 'stripe-craft', 'aurora-stage', 'obsidian-amber'])
  assert.equal(CHROME_STYLES.length, 6)
  assert.equal(DEFAULT_THEME, 'data')
  assert.equal(SMART_DEFAULT_THEME, 'consulting')
  assert.equal(resolveTheme('auto').id, 'consulting')
  assert.equal(resolveTheme().id, 'data')

  for (const id of THEME_IDS) {
    const theme = THEMES[id]
    assert.ok(theme.palette.bg)
    assert.ok(theme.palette.fg)
    assert.ok(theme.palette.accent)
    assert.ok(theme.name.zh)
    assert.ok(theme.name.en)
    assert.ok(CHROME_STYLES.includes(theme.chromeStyle), id + ' 必须映射到有效的 chromeStyle')
    assert.equal(theme.id, id)
    assert.equal(theme.tokens.chartSeries.length, 6, id + ' 应具备 6 色图表序列')
    assert.ok(
      contrastRatio(theme.tokens.inkPrimary, theme.tokens.surface1) >= 7.0,
      id + ' 主正文与卡片表面对比度应 >= 7.0',
    )
    assert.ok(
      contrastRatio(theme.tokens.inkMuted, theme.tokens.surface1) >= 4.5,
      id + ' 辅助灰字与卡片表面对比度应 >= 4.5',
    )
    assert.ok(
      contrastRatio(theme.tokens.accentText, theme.tokens.surface1) >= 4.5,
      id + ' 强调文字色与卡片表面对比度应 >= 4.5',
    )
  }

  assert.equal(THEMES.consulting.chromeStyle, 'consulting-classic')
  assert.equal(THEMES['financial-ft'].chromeStyle, 'consulting-classic')
  assert.equal(THEMES['keynote-light'].chromeStyle, 'keynote-spatial')
  assert.equal(THEMES['luxury-noir'].chromeStyle, 'editorial-folio')
  assert.equal(THEMES['medical-clean'].chromeStyle, 'academic-minimal')
  assert.equal(THEMES['course-sage'].chromeStyle, 'academic-minimal')
  assert.equal(THEMES['exec-jilan'].chromeStyle, 'gov-ceremonial')
  assert.equal(THEMES['exec-palace'].tokens.coverMode, 'inverted-accent')
  assert.equal(THEMES['exec-palace'].dark, false)
  assert.equal(THEMES.academic.defaultTableStyle, 'booktabs')
  assert.equal(THEMES.cartesian.radiusPx, 0)
  assert.equal(listThemes('zh').length, 24)
  assert.equal(listThemes('en')[0].name, 'Swiss Pulse')

  // resolveChromeStyle 优先级：slide.chrome > brand.chromeStyle > theme.chromeStyle
  assert.equal(resolveChromeStyle(THEMES.consulting, null, null), 'consulting-classic')
  assert.equal(resolveChromeStyle(THEMES.consulting, null, { chromeStyle: 'keynote-spatial' }), 'keynote-spatial')
  assert.equal(resolveChromeStyle(THEMES.consulting, { chrome: 'editorial-folio' }, { chromeStyle: 'keynote-spatial' }), 'editorial-folio')
  assert.equal(deriveBrandedTheme('consulting', { chromeStyle: 'academic-minimal' }).chromeStyle, 'academic-minimal')
})

test('resolveTheme 与 resolveLanguage 中文报错', () => {
  assert.equal(resolveTheme('swiss').id, 'swiss')
  assert.equal(resolveTheme('consulting').id, 'consulting')
  assert.throws(() => resolveTheme('neon'), /未知主题/)
  assert.throws(() => resolveTheme('neon'), /swiss/)
  assert.equal(resolveLanguage('bilingual').id, 'bilingual')
  assert.throws(() => resolveLanguage('fr'), /未知语言/)
})

test('sanitizeAbsorbedTheme 与 deriveBrandedTheme 净化高危母版色并重算浅底网格线', () => {
  // 刺眼纯红母版 + 亮黄正文 → 自动降级为深丹红封面 + 护眼浅底正文 + 高对比深色墨水
  const sanitized = sanitizeAbsorbedTheme({
    masterBg: '#FF0000',
    textColor: '#FFFF00',
    palette: { accent1: '#FF0000', accent2: '#FFD700' },
    fonts: { majorEastAsian: 'Microsoft YaHei', minorLatin: 'Segoe UI' },
  })
  assert.equal(sanitized.dark, false)
  assert.equal(sanitized.tokens.coverMode, 'inverted-accent')
  assert.ok(contrastRatio(sanitized.tokens.inkPrimary, sanitized.tokens.surface1) >= 7.0)
  assert.ok(contrastRatio(sanitized.tokens.accentText, sanitized.tokens.surface1) >= 4.5)
  assert.ok(sanitized.warnings.length >= 2)
  assert.equal(sanitized.sanitizedBrand.fontFamily, 'Microsoft YaHei')

  // 深色主题覆盖白色品牌背景时，panel/hairline 自动反转为浅色表面而非黑灰条纹
  const branded = deriveBrandedTheme('data', { backgroundColor: '#FFFFFF', primaryColor: '#0057B8' })
  assert.equal(branded.dark, false)
  assert.notEqual(branded.palette.panel, THEMES.data.palette.panel)
  assert.ok(contrastRatio('#0F172A', branded.palette.panel) >= 10)

  // 用户显式传入低对比度文字色时保留 palette.fg 原值供 checkManifest 告警
  const lowContrastBrand = deriveBrandedTheme('consulting', { backgroundColor: '#FFFFFF', textColor: '#CCCCCC' })
  assert.equal(lowContrastBrand.palette.fg, '#CCCCCC')
})

test('跨平台零缺字字体映射：Windows 避免 Songti SC 缺字并统一平滑雅黑', () => {
  const serifStack = THEMES.velvet.fonts.heading
  assert.equal(pptxEastAsianFont(serifStack, 'win32'), 'Microsoft YaHei')
  assert.equal(pptxEastAsianFont('Songti SC', 'win32'), 'Microsoft YaHei')
  assert.equal(pptxFontName('Songti SC', 'win32'), 'Microsoft YaHei')
  assert.equal(pptxEastAsianFont(serifStack, 'darwin'), 'Songti SC')
  assert.equal(pptxEastAsianFont(THEMES.consulting.fonts.body, 'darwin'), 'PingFang SC')
  assert.equal(pptxEastAsianFont(serifStack, 'linux'), 'Noto Serif CJK SC')
  assert.equal(pptxEastAsianFont(THEMES.consulting.fonts.body, 'linux'), 'Noto Sans CJK SC')
})

test('一句话生成最小完整结构：封面 + 核心观点 + 结束页', () => {
  const deck = parseMarkdownDeck('一句话产品发布', '我们的产品让会议减少一半。', 'zh')
  assert.equal(deck.slides.length, 3)
  assert.equal(deck.slides[0].layout, 'cover')
  assert.equal(deck.slides[1].layout, 'statement')
  assert.equal(deck.slides[2].layout, 'closing')
  assert.equal(deck.slides[0].subtitle, '我们的产品让会议减少一半。')
})

test('首个 H1 下只有列表时不丢弃封面之外的要点', () => {
  const deck = parseMarkdownDeck('', '# 标题\n- 一\n- 二\n- 三', 'zh')
  assert.equal(deck.title, '标题')
  assert.equal(deck.slides[0].layout, 'cover')
  assert.equal(deck.slides[0].subtitle, '一')
  assert.equal(deck.slides[1].layout, 'bullets')
  assert.deepEqual(deck.slides[1].bullets, ['二', '三'])
  assert.equal(deck.slides.at(-1).layout, 'closing')
})

test('Markdown 标题与列表映射为对应页型', () => {
  const deck = parseMarkdownDeck('', '# 让会议少一半\n\n用异步决策替代同步例会。\n\n## 问题\n- 工程师每周 6 小时在例会上\n- 决策没有记录\n\n## 方案\n- 会前异步文档 + 24h 评论期\n- 只有分歧项才开会\n', 'zh')
  assert.equal(deck.title, '让会议少一半')
  assert.equal(deck.slides[0].layout, 'cover')
  assert.equal(deck.slides[0].subtitle, '用异步决策替代同步例会。')
  assert.equal(deck.slides[1].layout, 'bullets')
  assert.equal(deck.slides[1].title, '问题')
  assert.deepEqual(deck.slides[1].bullets, ['工程师每周 6 小时在例会上', '决策没有记录'])
  assert.equal(deck.slides[2].title, '方案')
  assert.equal(deck.slides.at(-1).layout, 'closing')
})

test('Markdown 扩展语法：::: 版式块、[!TAKEAWAY] 结论条与 source 来源注释', () => {
  const md = [
    '# 2026 年度经营复盘',
    '聚焦高毛利核心业务增长',
    '',
    '## 核心指标突破',
    '::: kpi',
    '- +46.2% | 年度经常性收入：华东与北美双轮驱动',
    '- 118% | 净留存率 NRR：头部客户增购显著',
    '- 42ms | 推理 P99 时延：混合精度投机解码',
    ':::',
    '> [!TAKEAWAY] 企业级订阅贡献了全年 **74%** 的毛利净增量',
    '<!-- 来源: 2026Q4 审计快报 -->',
    '',
    '## 四大战略支柱',
    '::: bento',
    '- **训推一体底座**：万卡集群扩展效率达 94%',
    '- **行业知识库**：覆盖 12 个高合规行业',
    '- **零信任沙箱**：私有化 48 小时极速交付',
    ':::',
  ].join('\n')

  const deck = parseMarkdownDeck('', md, 'zh')
  assert.equal(deck.slides[1].layout, 'kpi')
  assert.equal(deck.slides[1].items.length, 3)
  assert.equal(deck.slides[1].items[0].value, '+46.2%')
  assert.equal(deck.slides[1].takeaway, '企业级订阅贡献了全年 **74%** 的毛利净增量')
  assert.equal(deck.slides[1].source, '2026Q4 审计快报')
  assert.equal(deck.slides[2].layout, 'cards')
  assert.equal(deck.slides[2].variant, 'bento')
  assert.equal(deck.slides[2].items[0].title, '训推一体底座')
})

test('无标题文档按段落拆要点页', () => {
  const deck = parseMarkdownDeck('无标题文档', '第一句是封面副标题。第二句是第一页要点。第三句也是第一页要点。\n\n新段落带来新的一页。这里还有第二句。', 'zh')
  assert.equal(deck.slides[0].layout, 'cover')
  assert.ok(deck.slides.some((slide) => slide.layout === 'bullets'))
  assert.equal(deck.slides.at(-1).layout, 'closing')
})

test('30 套核心零依赖版式 HTML 与 OOXML 同构输出，首尾页自动隐藏页码且单页 ID 唯一', () => {
  assert.equal(CORE_LAYOUTS.size, 30)
  const slides = normalizeSlides([
    { layout: 'cover', title: '战略发布封面', subtitle: '副标题说明' },
    { layout: 'agenda', title: '目录导航', activeIndex: 2, bullets: ['市场洞察', '技术突破', '商业落地'] },
    { layout: 'section', kicker: 'PART 01', title: '章节过渡页', subtitle: '章节导语' },
    { layout: 'kpi', title: '关键经营指标', takeaway: 'ARR 同比增长 46%', source: '财务快报', items: [
      { value: '¥4.8亿', title: '年度经常性收入', delta: '+46% YoY', status: 'positive', text: '核心大客户贡献' },
      { value: '118%', title: '净收入留存', delta: '+8pp', status: 'positive', text: '续约稳健' },
    ] },
    { layout: 'bento', title: 'Bento 卡片网格', bullets: ['**底座能力**：高吞吐低时延', '**安全合规**：私有化部署', '**开放生态**：插件市场'] },
    { layout: 'comparison', variant: 'do-dont', title: '新旧方案对比', items: [
      { title: '旧模式', bullets: ['人工巡检耗时长'] },
      { title: '新模式', bullets: ['全链路自动自愈'] },
    ] },
    { layout: 'matrix', title: '四象限战略矩阵', bullets: ['孵化业务：边缘质检', '核心业务：企业知识库', '收缩业务：传统定制', '基础底座：开源 SDK'] },
    { layout: 'process', variant: 'steps', title: '四步实施路径', bullets: ['需求诊断：梳理场景', '沙箱验证：两周 POC', '灰度上线：平滑切换', '规模推广：全员赋能'] },
    { layout: 'timeline', title: '年度里程碑', bullets: ['Q1：引擎升级', 'Q2：生态开放', 'Q3：国际合规', 'Q4：全面盈利'] },
    { layout: 'callout', variant: 'formula', title: '北极星公式', text: 'NRR = (Starting ARR + Expansion − Churn) / Starting ARR', bullets: ['**扩购驱动**：大客户席位渗透率提升'] },
    { layout: 'table', tableStyle: 'booktabs', title: '学术三线表对比', rows: [['模型', '准确率', '时延'], ['Baseline', '88.2%', '120ms'], ['Ours', '**96.4%**', '**38ms**']] },
    { layout: 'bullets', title: '行动纪律', bullets: ['产研双周迭代：**零回归**门禁', '支持 `CLI` 与 Web 双端同构'] },
    { layout: 'statement', title: '把复杂留给引擎，把品味留给表达', subtitle: '核心设计哲学' },
    { layout: 'quote', title: '简约是终极的精密。', subtitle: '设计箴言' },
    { layout: 'closing', variant: 'cta-cards', title: '感谢聆听', subtitle: '欢迎交流', bullets: ['预约演示：48h 开通', '架构咨询：专属团队'] },
  ], 60, 'zh')

  const theme = resolveTheme('exec-jilan')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: '全版式验收', slides, motion: true }, theme, lang)
  assert.match(html, /cover-shell is-inverted/)
  assert.match(html, /kpi-grid/)
  assert.match(html, /bento-grid/)
  assert.match(html, /data-table-style="booktabs"/)
  assert.match(html, /slide-takeaway/)
  assert.match(html, /数据来源：财务快报/)
  assert.match(html, /<code class="inline-code">CLI<\/code>/)

  const entries = unzipPptxXml(buildPptx({ title: '全版式验收', slides, motion: true }, theme, lang))
  assert.ok(!entries['ppt/slides/slide1.xml'].includes('name="Page number"'), '封面不应显示页码')
  assert.ok(!entries['ppt/slides/slide15.xml'].includes('name="Page number"'), '结束页不应显示页码')
  assert.ok(entries['ppt/slides/slide4.xml'].includes('name="Page number"'), '正文页应显示页码')
  assert.ok(entries['ppt/slides/slide11.xml'].includes('bandRow="0"'), 'booktabs 三线表应关闭斑马纹底色')

  // 校验每张幻灯片内所有 cNvPr id 严格唯一无冲突
  for (const [name, xml] of Object.entries(entries)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue
    const ids = [...xml.matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)].map((m) => m[1])
    assert.equal(new Set(ids).size, ids.length, name + ' 存在重复的形状 ID: ' + ids.join(','))
  }
})

test('内联富文本分词与确定性字号拟合引擎保持纯文本无损并守住 13.5pt 正文底线', () => {
  assert.equal(renderInlineHtml('甲'), '甲')
  const runs = parseInlineRuns('**核心增长**：推理吞吐提升 *3.2x*，支持 `FP8` 量化')
  assert.ok(runs.some((r) => r.bold && r.text === '核心增长'))
  assert.ok(runs.some((r) => r.italic && r.text === '3.2x'))
  assert.ok(runs.some((r) => r.code && r.text === 'FP8'))

  const autoLead = parseInlineRuns('架构升级：吞吐翻倍', { autoLeadBold: true })
  assert.equal(autoLead[0].bold, true)
  assert.equal(autoLead[0].text, '架构升级：')

  const comfortable = computeTextFit(['精简要点一', '精简要点二'], { w: 10, h: 4 }, 'body')
  assert.equal(comfortable.fontPt, 18)
  assert.equal(comfortable.overflow, false)

  const dense = computeTextFit(Array.from({ length: 14 }, (_, i) => '这是一段非常密集的业务分析长文本条目用于验证字号下限保护机制第' + i + '条'), { w: 5.2, h: 2.2 }, 'body')
  assert.equal(dense.fontPt, 13.5, '正文拟合字号不得跌破 13.5pt 底线')
  assert.equal(dense.overflow, true)
})

test('deck-visual 12 种保内容排版与版式动作不篡改任何业务文案或数字', () => {
  assert.deepEqual(normalizeVisual({ titleSize: 32, density: 'airy', tableStyle: 'booktabs' }), {
    titleSize: 32,
    density: 'airy',
    tableStyle: 'booktabs',
  })
  const manifest = {
    slides: [
      { id: 's1', layout: 'bullets', title: '指标概览', bullets: ['营收增长 42%', '净留存率 118%', '毛利率 76%'] },
      { id: 's2', layout: 'image-left', title: '架构图', bullets: ['保持原文'], image: { assetId: 'a1', fit: 'cover', alt: 'arch' } },
      { id: 's3', layout: 'chart', title: '趋势', chart: { kind: 'column', categories: ['Q1', 'Q2'], series: [{ name: 'ARR', values: [100, 160] }] } },
      { id: 's4', layout: 'table', title: '对比表', rows: [['方案', '得分'], ['Ours', '98.2']] },
    ],
  }
  const updated = applyVisualActions(manifest, [
    { slideId: 's1', type: 'switch-layout', value: 'kpi' },
    { slideId: 's1', type: 'density-mode', value: 'compact' },
    { slideId: 's2', type: 'swap-image-side' },
    { slideId: 's3', type: 'chart-highlight', value: 'max' },
    { slideId: 's4', type: 'table-style', value: 'booktabs' },
  ])
  assert.equal(updated[0].layout, 'kpi')
  assert.equal(updated[0].visual.density, 'compact')
  assert.deepEqual(updated[0].bullets, manifest.slides[0].bullets)
  assert.equal(updated[1].layout, 'image-right')
  assert.equal(updated[2].chart.highlight, 'max')
  assert.equal(updated[3].tableStyle, 'booktabs')

  // 无数字条目禁止误切为 kpi 版式
  assert.throws(
    () => applyVisualActions({ slides: [{ id: 'p1', layout: 'bullets', title: '纯概念', bullets: ['统一思想', '明确分工'] }] }, [{ slideId: 'p1', type: 'switch-layout', value: 'kpi' }]),
    /不满足目标版式/,
  )
})

test('buildDeck 写入 HTML / PPTX / JSON 三件套', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-core-'))
  try {
    const out = buildDeck({
      title: '测试 Deck',
      content: '# 测试 Deck\n\n- 要点一\n- 要点二\n',
      theme: 'velvet',
      lang: 'en',
      outputDir: dir,
      fileName: 'deck-test',
    })
    assert.equal(out.ok, true)
    assert.equal(out.slideCount, 3)
    assert.equal(out.theme, 'velvet')
    assert.equal(out.language, 'en')
    assert.ok(readFileSync(out.htmlPath, 'utf8').includes('slide--cover'))
    assert.ok(readFileSync(out.htmlPath, 'utf8').includes('#C9A84C'))
    const pptx = readFileSync(out.pptxPath)
    assert.equal(pptx.subarray(0, 2).toString('ascii'), 'PK')
    assert.ok(pptx.includes(Buffer.from('ppt/presentation.xml')))
    assert.ok(pptx.includes(Buffer.from('ppt/slides/slide1.xml')))
    const manifest = JSON.parse(readFileSync(out.jsonPath, 'utf8'))
    assert.equal(manifest.slides.length, out.slideCount)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('buildDeck 默认不覆盖整组三件套，overwrite=true 才显式覆盖', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-overwrite-'))
  try {
    const first = buildDeck({ title: '第一版', content: '第一版内容。', outputDir: dir, fileName: 'deck' })
    const firstJson = readFileSync(first.jsonPath, 'utf8')
    const second = buildDeck({ title: '第二版', content: '第二版内容。', outputDir: dir, fileName: 'deck' })
    assert.equal(first.jsonPath, join(dir, 'deck.json'))
    assert.equal(second.jsonPath, join(dir, 'deck-1.json'))
    assert.equal(readFileSync(first.jsonPath, 'utf8'), firstJson, '默认调用不能改写第一版')
    for (const path of [second.htmlPath, second.pptxPath, second.jsonPath]) assert.equal(existsSync(path), true)

    const partialPptx = join(dir, 'partial.pptx')
    writeFileSync(partialPptx, 'user-owned')
    const partial = buildDeck({ title: '部分冲突', content: '不能混写三件套。', outputDir: dir, fileName: 'partial' })
    assert.equal(partial.htmlPath, join(dir, 'partial-1.html'))
    assert.equal(readFileSync(partialPptx, 'utf8'), 'user-owned')

    const replaced = buildDeck({ title: '显式覆盖', content: '覆盖后的内容。', outputDir: dir, fileName: 'deck', overwrite: true })
    assert.equal(replaced.jsonPath, first.jsonPath)
    assert.equal(JSON.parse(readFileSync(first.jsonPath, 'utf8')).title, '显式覆盖')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('双语界面渲染中英标签', () => {
  const manifest = {
    title: 'Bilingual',
    slides: [{ layout: 'cover', kicker: '开场', title: 'Bilingual', subtitle: 'Test' }],
  }
  const theme = resolveTheme('bold')
  const language = resolveLanguage('bilingual')
  const html = renderHtml(manifest, theme, language)
  assert.match(html, /主题 · Theme/)
  assert.match(html, /开场 · Opening/)
  assert.match(html, /#E63946/)
})

test('HTML 播放器：演讲者视图、缩略图总览、Esc 关闭与备注避让', () => {
  const manifest = { title: 'Player', motion: true, slides: [
    { layout: 'cover', title: '封' },
    { layout: 'bullets', title: '页', bullets: ['一'], notes: '备注' },
  ] }
  const html = renderHtml(manifest, resolveTheme('data'), resolveLanguage('zh'))
  assert.match(html, /id="presenter-toggle"/)
  assert.match(html, /window\.__dshPpt/)
  assert.match(html, /body\.overview #stage/)
  assert.match(html, /key === 'Escape'/)
  assert.match(html, /bottom:64px/)
  assert.match(html, /id="notes-close"/)
  assert.match(html, /tabindex="-1"/)
  assert.match(html, /attr\(data-frame\)/)
  assert.match(html, /body\.overview \.bullets li/)
  assert.match(html, /body\.presenting #hud/)
  assert.match(html, /jumped <= total/)
  assert.match(html, /ArrowDown/)
  assert.match(html, /wrapHint/)
  assert.match(html, /frame\.tabIndex = on \? 0 : -1/)
  assert.match(html, /URL\.createObjectURL/)
  assert.match(html, /postMessage/)
  assert.match(html, /classList.contains\('presenting'\)/)
  assert.match(html, /blank-black/)
  assert.match(html, /id="pv-cur"/)
  assert.match(html, /id="thumbs"/)
  assert.match(html, /id="pclock"/)
  assert.doesNotMatch(html, /max-width:1120px/)
})

test('主题预览：SVG 色板卡与对比页覆盖 24 套主题', () => {
  const svg = renderThemeSvg('data', 'zh')
  assert.ok(svg.startsWith('<svg'))
  assert.match(svg, /#7C3AED/)
  const preview = renderThemePreviewHtml('zh')
  for (const id of THEME_IDS) assert.ok(preview.includes('theme-' + id), id + ' 缺失')
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-preview-'))
  try {
    const out = buildThemePreview({ outputDir: dir, lang: 'zh' })
    assert.equal(out.themeCount, 24)
    assert.ok(existsSync(out.htmlPath))
    for (const item of out.svgs) assert.ok(existsSync(item.path))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('buildPptx 是纯 Buffer 且包含全部 OOXML 核心部件', () => {
  const manifest = {
    title: 'OOXML',
    slides: [{ layout: 'bullets', title: '标题', bullets: ['一', '二'] }],
  }
  const buf = buildPptx(manifest, resolveTheme('data'), resolveLanguage('zh'))
  assert.ok(Buffer.isBuffer(buf))
  for (const name of ['[Content_Types].xml', '_rels/.rels', 'ppt/presentation.xml', 'ppt/slideMasters/slideMaster1.xml', 'ppt/theme/theme1.xml']) {
    assert.ok(buf.includes(Buffer.from(name)), name + ' 缺失')
  }
  assert.ok(buf.length > 0)
})

test('sanitizeFileName 清理危险字符并去除扩展名', () => {
  assert.equal(sanitizeFileName('Q3 汇报: 终版?.pptx'), 'Q3-汇报-终版')
  assert.equal(sanitizeFileName('a/b\\c*<>|?'), 'a-b-c')
  assert.equal(sanitizeFileName('   '), 'deck')
})

test('裸 SimSun / 宋体 / NSimSun / Impact 字体在各平台自动升级为矢量平滑字体', () => {
  for (const legacy of ['SimSun', 'NSimSun', '宋体', '新宋体', '仿宋']) {
    assert.equal(pptxFontName(legacy, 'win32'), 'Microsoft YaHei')
    assert.equal(pptxEastAsianFont(legacy, 'win32'), 'Microsoft YaHei')
    assert.equal(pptxFontName(legacy, 'darwin'), 'Songti SC')
    assert.equal(pptxEastAsianFont(legacy, 'darwin'), 'Songti SC')
    assert.equal(pptxFontName(legacy, 'linux'), 'Noto Serif CJK SC')
    assert.equal(pptxEastAsianFont(legacy, 'linux'), 'Noto Serif CJK SC')
  }
  for (const novelty of ['Impact', 'Comic Sans MS']) {
    assert.equal(pptxFontName(novelty, 'win32'), 'Microsoft YaHei')
    assert.equal(pptxEastAsianFont(novelty, 'win32'), 'Microsoft YaHei')
    assert.equal(pptxFontName(novelty, 'darwin'), 'PingFang SC')
    assert.equal(pptxFontName(novelty, 'linux'), 'Noto Sans CJK SC')
  }
})

test('sanitizeAbsorbedTheme 拦截外部母版中的 SimSun / 宋体 / Impact 点阵字体并附带告警', () => {
  const out = sanitizeAbsorbedTheme({
    masterBg: '#FFFFFF',
    textColor: '#111111',
    palette: { accent1: '#0057B8' },
    fonts: { majorEastAsian: 'SimSun', minorEastAsian: '宋体', majorLatin: 'Impact' },
  })
  assert.ok(!/SimSun|宋体|Impact/i.test(out.sanitizedBrand.fontFamily ?? ''))
  assert.ok(!/SimSun|宋体|Impact/i.test(out.fonts.heading))
  assert.ok(!/SimSun|宋体|Impact/i.test(out.fonts.body))
  assert.ok(out.warnings.some((w) => /点阵|装饰字体/.test(w)))
})

test('deriveBrandedTheme 对显式传入的 SimSun 品牌字体自动做抗锯齿回退', () => {
  const branded = deriveBrandedTheme('consulting', { fontFamily: 'SimSun' })
  assert.ok(!/^SimSun$/i.test(branded.fonts.heading))
  const entries = unzipPptxXml(buildPptx({
    title: 'Brand Font',
    slides: [{ layout: 'bullets', title: '测试标题', bullets: ['测试正文'] }],
  }, branded, resolveLanguage('zh')))
  assert.doesNotMatch(entries['ppt/slides/slide1.xml'], /typeface="SimSun"/)
})

test('formatSourceLine 幂等去重各类中英文来源前缀，杜绝“数据来源：数据来源：”重复', () => {
  assert.equal(formatSourceLine('2026Q4 审计快报', 'zh'), '数据来源：2026Q4 审计快报')
  assert.equal(formatSourceLine('Gartner 2026', 'en'), 'Source: Gartner 2026')
  assert.equal(formatSourceLine('Gartner 2026', 'en-US'), 'Source: Gartner 2026')
  assert.equal(formatSourceLine('数据来源：国家统计局', 'zh'), '数据来源：国家统计局')
  assert.equal(formatSourceLine('来源：内部基准评测', 'zh'), '来源：内部基准评测')
  assert.equal(formatSourceLine('出处：Nature 2026', 'zh'), '出处：Nature 2026')
  assert.equal(formatSourceLine('测算口径：不含税净额', 'zh'), '测算口径：不含税净额')
  assert.equal(formatSourceLine('实验环境：8x H800 集群', 'zh'), '实验环境：8x H800 集群')
  assert.equal(formatSourceLine('统计口径：MAU 口径', 'zh'), '统计口径：MAU 口径')
  assert.equal(formatSourceLine('Source: IDC MarketScape', 'zh'), 'Source: IDC MarketScape')
  assert.equal(formatSourceLine('Note: Preliminary unaudited', 'en-US'), 'Note: Preliminary unaudited')
})

test('HTML 与 PPTX 页脚渲染已含前缀的 slide.source 时均不重复叠加前缀', () => {
  const slides = normalizeSlides([
    { layout: 'cover', title: '封面' },
    { layout: 'kpi', title: '指标页', source: '数据来源：2026 年报审计', items: [{ value: '98%', title: '达成率' }] },
  ])
  const theme = resolveTheme('consulting')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'Source Dedup', slides }, theme, lang)
  assert.ok(html.includes('数据来源：2026 年报审计'))
  assert.ok(!html.includes('数据来源：数据来源：'))

  const entries = unzipPptxXml(buildPptx({ title: 'Source Dedup', slides }, theme, lang))
  assert.ok(entries['ppt/slides/slide2.xml'].includes('数据来源：2026 年报审计'))
  assert.ok(!entries['ppt/slides/slide2.xml'].includes('数据来源：数据来源：'))
})

test('computeBadgePillWidth 与 Bento 大写胶囊徽标自适应拓宽，防止 SERVERLESS 尾字母折行', () => {
  const shortW = computeBadgePillWidth('01', 11, 3.0, 0.54)
  const upperW = computeBadgePillWidth('SERVERLESS', 11, 3.0, 0.54)
  assert.ok(shortW >= 0.54 && shortW <= 0.75)
  assert.ok(upperW >= 1.55, '10 字母大写徽标宽度应 >= 1.55 英寸以保证单行不折行，实际: ' + upperW)

  const slides = normalizeSlides([
    { layout: 'bento', title: '云原生架构', items: [
      { tag: 'SERVERLESS', title: '弹性无服务器底座', text: '毫秒级冷启动' },
      { tag: 'OBSERVABILITY', title: '全链路可观测', text: '实时追踪' },
      { tag: 'ZERO-TRUST', title: '零信任网络', text: '端到端加密' },
    ] },
  ])
  const entries = unzipPptxXml(buildPptx({ title: 'Pill Width', slides }, resolveTheme('consulting'), resolveLanguage('en')))
  const badgeMatch = /name="Card Badge 1"[\s\S]*?<a:ext cx="(\d+)"/.exec(entries['ppt/slides/slide1.xml'])
  assert.ok(badgeMatch, '应存在 Card Badge 1 形状')
  assert.ok(Number(badgeMatch[1]) >= 1400000, 'Card Badge 1 宽度应 >= 1.4M EMU (~1.53")')
})

test('agenda 与 process 横向步骤页对自定义长标签自动拓宽徽标并避让标题区', () => {
  const slides = normalizeSlides([
    { layout: 'agenda', title: '议程', items: [{ tag: 'PHASE 01', title: '现状诊断与基线盘点', text: '双周访谈' }] },
    { layout: 'process', variant: 'steps', title: '流程', items: [
      { tag: 'STAGE A', title: '立项评审', text: '目标对齐' },
      { tag: 'STAGE B', title: '灰度验证', text: '指标监控' },
    ] },
  ])
  const entries = unzipPptxXml(buildPptx({ title: 'Agenda & Steps', slides }, resolveTheme('consulting'), resolveLanguage('zh')))
  const agendaBadge = /name="Agenda Badge 1"[\s\S]*?<a:ext cx="(\d+)"/.exec(entries['ppt/slides/slide1.xml'])
  const stepBadge = /name="Step Number 1"[\s\S]*?<a:ext cx="(\d+)"/.exec(entries['ppt/slides/slide2.xml'])
  assert.ok(Number(agendaBadge?.[1]) > 914400)
  assert.ok(Number(stepBadge?.[1]) > 800000)
})

test('全部 18 个版式别名精准归一到规范 layout 与 variant / chart.kind', () => {
  assert.ok(Object.keys(LAYOUT_ALIASES).length >= 18)
  const normalized = normalizeSlides([
    { layout: 'kpi-grid', title: 'KPI', bullets: ['+30% 增长'] },
    { layout: 'scorecard', title: '计分卡', bullets: ['99.9% 可用性'] },
    { layout: 'pillars', title: '支柱', bullets: ['支柱一：产品', '支柱二：渠道'] },
    { layout: 'exec-summary', title: '摘要', text: '核心论点', bullets: ['论据一', '论据二'] },
    { layout: 'layers', title: '分层架构', bullets: ['接入层', '引擎层', '存储层'] },
    { layout: 'funnel', title: '转化漏斗', bullets: ['曝光', '线索', '成交'] },
    { layout: 'issue-action', title: '问题与对策', bullets: ['延迟高 -> 引入边缘缓存'] },
    { layout: 'matrix-2x2', title: '矩阵', bullets: ['象限一', '象限二', '象限三', '象限四'] },
    { layout: 'formula-callout', title: '公式', text: 'ROI = Gain / Cost' },
  ])
  assert.equal(normalized[0].layout, 'kpi')
  assert.equal(normalized[1].layout, 'kpi')
  assert.equal(normalized[2].layout, 'cards')
  assert.equal(normalized[2].variant, 'pillars')
  assert.equal(normalized[3].variant, 'exec-summary')
  assert.equal(normalized[4].layout, 'process')
  assert.equal(normalized[4].variant, 'layers')
  assert.equal(normalized[5].variant, 'funnel')
  assert.equal(normalized[6].layout, 'comparison')
  assert.equal(normalized[6].variant, 'issue-action')
  assert.equal(normalized[7].layout, 'matrix')
  assert.equal(normalized[8].layout, 'callout')
  assert.equal(normalized[8].variant, 'formula')
})

test('结构化子项别名 cards / metrics / columns / steps / quadrants 统一归一为 slide.items', () => {
  const slides = normalizeSlides([
    { layout: 'cards', title: 'Cards', cards: [{ badge: 'A', heading: '卡一', body: '说明一' }] },
    { layout: 'kpi', title: 'Metrics', metrics: [{ label: '营收', value: '1200', unit: '万', change: '+18%', tone: 'positive' }] },
    { layout: 'comparison', title: 'Columns', columns: [{ name: '旧版', items: ['手工操作'] }, { name: '新版', items: ['自动编排'] }] },
    { layout: 'process', title: 'Steps', steps: [{ step: '01', title: '采集', detail: '秒级同步' }] },
    { layout: 'matrix', title: 'Quadrants', quadrants: [{ phase: 'Q1', title: '明星产品', description: '重点投入' }] },
  ])
  assert.equal(slides[0].items[0].tag, 'A')
  assert.equal(slides[0].items[0].title, '卡一')
  assert.equal(slides[1].items[0].delta, '+18%')
  assert.equal(slides[1].items[0].status, 'positive')
  assert.deepEqual(slides[2].items[0].bullets, ['手工操作'])
  assert.equal(slides[3].items[0].text, '秒级同步')
  assert.equal(slides[4].items[0].title, '明星产品')
})

test('4 种表格视觉风格 consulting / booktabs / minimal / banded 在 HTML 与 OOXML 中各司其职', () => {
  const rows = [['维度', '2025', '2026'], ['毛利率', '68.2%', '76.8%'], ['净留存', '108%', '118%']]
  const slides = normalizeSlides([
    { layout: 'table', tableStyle: 'consulting', title: '咨询表', rows },
    { layout: 'table', tableStyle: 'booktabs', title: '三线表', rows },
    { layout: 'table', tableStyle: 'minimal', title: '极简表', rows },
    { layout: 'table', tableStyle: 'banded', title: '条纹表', rows },
  ])
  const html = renderHtml({ title: 'Tables', slides }, resolveTheme('consulting'), resolveLanguage('zh'))
  for (const style of ['consulting', 'booktabs', 'minimal', 'banded']) {
    assert.ok(html.includes('data-table-style="' + style + '"'))
  }
  const entries = unzipPptxXml(buildPptx({ title: 'Tables', slides }, resolveTheme('consulting'), resolveLanguage('zh')))
  assert.match(entries['ppt/slides/slide1.xml'], /bandRow="1"/)
  assert.match(entries['ppt/slides/slide2.xml'], /bandRow="0"/)
  assert.match(entries['ppt/slides/slide3.xml'], /bandRow="0"/)
  assert.match(entries['ppt/slides/slide4.xml'], /bandRow="1"/)
})

test('::: table booktabs 与多行 [!TAKEAWAY] 在 Markdown 解析中正确传递样式与结论', () => {
  const md = [
    '# 学术论文答辩',
    '',
    '## 消融实验结果',
    '::: table booktabs',
    '| 模型 | Top-1 |',
    '| --- | --- |',
    '| Baseline | 81.2% |',
    '| **Ours** | **89.6%** |',
    ':::',
    '> [!TAKEAWAY]',
    '> 引入跨模态注意力后 Top-1 准确率提升 **8.4pp**',
  ].join('\n')
  const deck = parseMarkdownDeck('', md, 'zh')
  const tableSlide = deck.slides.find((s) => s.layout === 'table')
  assert.ok(tableSlide)
  assert.equal(tableSlide.tableStyle, 'booktabs')
  assert.equal(tableSlide.takeaway, '引入跨模态注意力后 Top-1 准确率提升 **8.4pp**')
})

test('visualShapeXml 支持对 Card / Step / Callout / Table / Quote 精准注入自定义字号', () => {
  const slides = normalizeSlides([
    { layout: 'cards', title: '卡片字号控制', bullets: ['模块一：高并发网关', '模块二：分布式缓存'], visual: { titleSize: 30, bodySize: 18 } },
    { layout: 'quote', title: '金句字号控制', subtitle: '出处', visual: { titleSize: 34, bodySize: 16 } },
  ])
  const entries = unzipPptxXml(buildPptx({ title: 'Visual XML', slides }, resolveTheme('consulting'), resolveLanguage('zh')))
  assert.match(entries['ppt/slides/slide1.xml'], /name="Title"[\s\S]*?sz="3000"/)
  assert.match(entries['ppt/slides/slide1.xml'], /name="Card 1"[\s\S]*?sz="1800"/)
  assert.match(entries['ppt/slides/slide2.xml'], /name="Quote"[\s\S]*?sz="3400"/)
  assert.match(entries['ppt/slides/slide2.xml'], /name="Attribution"[\s\S]*?sz="1600"/)
  assert.equal(visualShapeXml('<p:sp/>', undefined), '<p:sp/>')
})

test('roundRectAdj 保持 0 圆角建筑风主题锋利直角并钳制最大胶囊圆角上限', () => {
  assert.equal(roundRectAdj(4, 2, 0), 0)
  assert.equal(roundRectAdj(4, 2, THEMES.cartesian.radiusPx), 0)
  assert.ok(roundRectAdj(4, 2, 12) > 0 && roundRectAdj(4, 2, 12) <= 50000)
  assert.equal(roundRectAdj(0.5, 0.2, 999), 50000)
})

test('6 套母版骨架（Chrome Skeletons）在 HTML 与 OOXML 中呈现结构性差异', () => {
  const slides = normalizeSlides([
    { layout: 'cards', chrome: 'consulting-classic', kicker: '01 · 战略', title: '麦肯锡直角骨架', takeaway: '左竖线卡片与无边框底栏结论', bullets: ['**支柱一**：锐利直角', '**支柱二**：右上章节追踪器'] },
    { layout: 'cards', chrome: 'keynote-spatial', kicker: 'KEYNOTE', title: 'Apple 空间留白骨架', takeaway: '极简居中无框底栏', bullets: ['**大圆角**：16pt 平滑卡片', '**无顶线**：取消页眉分割线'] },
    { layout: 'cards', chrome: 'editorial-folio', kicker: 'FOLIO 03', title: '杂志社论书脊骨架', takeaway: '顶线社论注脚', bullets: ['**衬线序号**：01..04 大字号', '**右上角页码**：顶部杂志页眉'] },
    { layout: 'cards', chrome: 'saas-bento', kicker: '04 · BENTO', title: 'SaaS Bento 骨架', takeaway: '1px 发丝描边与顶部高亮条', bullets: ['**Bento 卡片**：10pt 圆角', '**主卡高亮**：顶部主色强调'] },
    { layout: 'cards', chrome: 'academic-minimal', kicker: 'SECTION II', title: 'Beamer Metropolis 学术顶栏', takeaway: '学术三线底栏', source: 'Nature 2026', bullets: ['**通栏顶带**：1.28 英寸底色带', '**三区底栏**：来源 | 章节 | 页码'] },
    { layout: 'cards', chrome: 'gov-ceremonial', kicker: '01 · 总体成效', title: '东方政务双线骨架', takeaway: '庄重双线页眉与绶带标签', bullets: ['**双线页眉**：主色粗线配金细线', '**绶带标签**：【01 · 总体成效】'] },
  ])

  const theme = resolveTheme('consulting')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: '6 Chrome Skeletons', slides }, theme, lang)
  for (const c of CHROME_STYLES) {
    assert.ok(html.includes('data-chrome="' + c + '"'), 'HTML 应包含 data-chrome=' + c)
  }
  assert.match(html, /consulting-tracker/)
  assert.match(html, /editorial-folio-bar/)
  assert.match(html, /beamer-header-band/)
  assert.match(html, /beamer-status-bar/)
  assert.match(html, /gov-ribbon/)
  assert.match(html, /【01 · 总体成效】/)

  const entries = unzipPptxXml(buildPptx({ title: '6 Chrome Skeletons', slides }, theme, lang))
  // 1. consulting-classic: sharp rect + left stripe + borderless Takeaway rule (no Takeaway accent rect)
  assert.match(entries['ppt/slides/slide1.xml'], /left stripe/)
  assert.match(entries['ppt/slides/slide1.xml'], /name="Takeaway rule"/)
  // 2. keynote-spatial: no Header rule, soft roundRect cards
  assert.doesNotMatch(entries['ppt/slides/slide2.xml'], /name="Header rule"/)
  assert.match(entries['ppt/slides/slide2.xml'], /prst="roundRect"/)
  // 3. editorial-folio: top-right Page number (y around 0.24" = 219456 EMU) & Editorial folio rule
  assert.match(entries['ppt/slides/slide3.xml'], /name="Editorial folio rule"/)
  const folioMatch = /name="Page number"[\s\S]*?<a:off x="\d+" y="(\d+)"/.exec(entries['ppt/slides/slide3.xml'])
  assert.ok(folioMatch && Number(folioMatch[1]) < 500000, 'editorial-folio 页码应位于顶部右上角')
  // 4. saas-bento: top bar on cards
  assert.match(entries['ppt/slides/slide4.xml'], /top bar/)
  // 5. academic-minimal: Beamer header band + 3-zone Beamer footer band
  assert.match(entries['ppt/slides/slide5.xml'], /name="Beamer header band"/)
  assert.match(entries['ppt/slides/slide5.xml'], /name="Beamer footer band"/)
  assert.match(entries['ppt/slides/slide5.xml'], /name="Beamer zone chapter"/)
  // 6. gov-ceremonial: Header secondary rule (double-rule) + 【】 ribbon tag
  assert.match(entries['ppt/slides/slide6.xml'], /name="Header secondary rule"/)
  assert.ok(entries['ppt/slides/slide6.xml'].includes('【01 · 总体成效】'))
})

test('5 套零依赖原生专业图示（gantt / architecture / harvey / tam / org）及 flywheel / funnel 同构校验', async () => {
  const { validatePresentation, loadPresentation } = await import('@office-kit/pptx')

  const slides = normalizeSlides([
    {
      layout: 'gantt',
      variant: 'swimlane',
      title: '2026 产品演进甘特图',
      columns: ['Q1', 'Q2', 'Q3', 'Q4'],
      items: [
        { tag: 'Core', title: '内核升级与多租户隔离', start: 0, span: 2, value: 'Q1-Q2', status: 'positive' },
        { tag: 'AI', title: '智能体编排引擎上线', start: 1, span: 2, value: 'Q2-Q3', status: 'accent' },
        { tag: 'GA', title: '全球合规正式发布', start: 3, span: 0, milestone: true, value: 'GA 里程碑' },
      ],
    },
    {
      layout: 'architecture',
      variant: 'platform',
      title: '云原生双态系统架构与安全治理侧栏',
      items: [
        { tag: 'L1', title: '接入网关层', bullets: ['WAF 防护', '多活路由', '协议转换'] },
        { tag: 'L2', title: '业务编排层', bullets: ['工作流引擎', '规则中心', '异步队列'] },
        { tag: 'L3', title: '数据底座层', bullets: ['分布式存储', '向量索引', '冷热分层'] },
        { tag: 'SIDECAR', title: '安全与治理', status: 'accent', text: '全链路零信任与可观测性', bullets: ['RBAC 权限', '链路追踪'] },
      ],
    },
    {
      layout: 'harvey',
      title: '核心能力竞品哈维球矩阵',
      rows: [
        ['能力维度', '传统方案', 'SaaS 竞品', '本方案 / Ours'],
        ['原生 OOXML 导出', '0%', '50%', 'full'],
        ['零缺字字体体系', '25%', '75%', '100%'],
        ['离线 HTML 推演', 'no', 'no', 'yes'],
      ],
    },
    {
      layout: 'table',
      tableStyle: 'harvey',
      title: 'tableStyle=harvey 兼容验证',
      rows: [
        ['指标', '基线', '本方案 / Ours'],
        ['自动化覆盖', '◑', '●'],
      ],
    },
    {
      layout: 'tam',
      title: '目标市场空间测算（TAM / SAM / SOM）',
      items: [
        { tag: 'TAM', value: '¥1,200亿', title: '全球企业智能办公市场', text: '覆盖全行业数字化协作预算' },
        { tag: 'SAM', value: '¥280亿', title: '亚太中大型政企可服务市场', text: '聚焦金融、制造与高端科研' },
        { tag: 'SOM', value: '¥36亿', title: '三年内可触达核心份额', text: '基于标杆客户客单价自下而上测算' },
      ],
    },
    {
      layout: 'org',
      variant: 'tree',
      title: '集团组织架构树',
      items: [
        { tag: 'HQ', role: 'CEO', title: '执行委员会', text: '战略统筹与资源配置' },
        { tag: 'R&D', title: '基础研发中心', bullets: ['引擎内核', 'AI 实验室'] },
        { tag: 'BIZ', title: '行业解决方案部', bullets: ['金融行业', '政企客户'] },
        { tag: 'OPS', title: '交付与客户成功', bullets: ['实施团队', 'CSM 运营'] },
      ],
    },
    {
      layout: 'org',
      variant: 'team',
      title: '核心管理团队',
      items: [
        { title: '张明远', role: '创始人 & CEO', text: '前头部云厂商架构师，15 年基础软件经验' },
        { title: 'Alice Lin', role: 'CTO', text: '分布式系统专家，主导千万级并发引擎' },
      ],
    },
    {
      layout: 'process',
      variant: 'flywheel',
      title: 'PLG 增长飞轮模型',
      text: '产品驱动增长',
      items: [
        { tag: '01', title: '极速体验', conversion: '+45%', text: '零门槛生成首份专业演示' },
        { tag: '02', title: '团队分享', conversion: '2.4x', text: '离线 HTML 跨组织传播' },
        { tag: '03', title: '模板沉淀', conversion: '+62%', text: '吸收企业母版形成资产复用' },
        { tag: '04', title: '深度订阅', conversion: '118% NRR', text: '升级多团队协作与数据推演' },
      ],
    },
    {
      layout: 'process',
      variant: 'funnel',
      title: '商业化转化漏斗',
      items: [
        { tag: '曝光', title: '市场触达 100,000', conversion: '28% 激活' },
        { tag: '试用', title: '创建首个项目 28,000', conversion: '18% 留存' },
        { tag: '付费', title: '企业订阅成交 5,040', conversion: '118% 续费' },
      ],
    },
  ])

  assert.equal(parseHarveyValue('full').pct, 100)
  assert.equal(parseHarveyValue('◕').pct, 75)
  assert.equal(parseHarveyValue('half').pct, 50)
  assert.equal(parseHarveyValue('◔').pct, 25)
  assert.equal(parseHarveyValue('none').pct, 0)
  assert.equal(parseHarveyValue('yes').ok, true)
  assert.equal(parseHarveyValue('no').ok, false)

  const theme = resolveTheme('keynote-light')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'Pro Diagrams', slides }, theme, lang)
  assert.match(html, /gantt-board/)
  assert.match(html, /gantt-milestone/)
  assert.match(html, /arch-board has-sidecar/)
  assert.match(html, /harvey-ball harvey-75/)
  assert.match(html, /tam-circle tam-ring-2/)
  assert.match(html, /org-tree/)
  assert.match(html, /team-avatar/)
  assert.match(html, /flywheel-hub/)
  assert.match(html, /funnel-conversion-badge/)

  const pptxBuf = buildPptx({ title: 'Pro Diagrams', slides }, theme, lang)
  const pres = await loadPresentation(pptxBuf)
  const errors = validatePresentation(pres).filter((i) => i.severity === 'error')
  assert.deepEqual(errors, [], '所有新增图示必须 100% 通过 OOXML 结构校验')

  const entries = unzipPptxXml(pptxBuf)
  // Gantt milestone uses native diamond; gantt preserves string[] columns
  assert.match(entries['ppt/slides/slide1.xml'], /prst="diamond"/)
  assert.match(entries['ppt/slides/slide1.xml'], /Gantt Bar 1/)
  // Architecture uses native upDownArrow + Sidecar
  assert.match(entries['ppt/slides/slide2.xml'], /prst="upDownArrow"/)
  assert.match(entries['ppt/slides/slide2.xml'], /Arch Sidecar 1/)
  // Harvey uses native pie + ellipse shapes (zero SVG blips!)
  assert.match(entries['ppt/slides/slide3.xml'], /prst="pie"/)
  assert.match(entries['ppt/slides/slide3.xml'], /Harvey 100/)
  assert.doesNotMatch(entries['ppt/slides/slide3.xml'], /<svg/)
  assert.match(entries['ppt/slides/slide4.xml'], /Harvey 100/)
  // TAM uses 3 native ellipses + connectors
  assert.match(entries['ppt/slides/slide5.xml'], /TAM Circle 3/)
  assert.match(entries['ppt/slides/slide5.xml'], /TAM Connector 1/)
  // Org tree uses Trunk + Bus + Branch lines; Team uses Team Avatar ellipses
  assert.match(entries['ppt/slides/slide6.xml'], /Org Trunk/)
  assert.match(entries['ppt/slides/slide6.xml'], /Org Bus/)
  assert.match(entries['ppt/slides/slide7.xml'], /Team Avatar 1/)
  // Flywheel & Funnel conversion badges
  assert.match(entries['ppt/slides/slide8.xml'], /Flywheel Hub/)
  assert.match(entries['ppt/slides/slide8.xml'], /prst="rightArrow"/)
  assert.match(entries['ppt/slides/slide9.xml'], /Funnel Conversion 1/)

  for (const [name, xml] of Object.entries(entries)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue
    const ids = [...xml.matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)].map((m) => m[1])
    assert.equal(new Set(ids).size, ids.length, name + ' 存在重复形状 ID')
  }
})

test('4 套新增主题 keynote-light / financial-ft / medical-clean / luxury-noir 配色、chromeStyle 与对比度校验', () => {
  const expected = [
    ['keynote-light', '#FFFFFF', '#F5F5F7', '#1D1D1F', '#0066CC', 'keynote-spatial'],
    ['financial-ft', '#FFF1E5', '#F6E3D2', '#1A1817', '#0D3D56', 'consulting-classic'],
    ['medical-clean', '#F8FAFC', '#EEF5F7', '#0F172A', '#0F766E', 'academic-minimal'],
    ['luxury-noir', '#0B0B0D', '#151519', '#F5F2EB', '#D4AF37', 'editorial-folio'],
  ]
  for (const [id, canvas, surface1, inkPrimary, accentPrimary, chromeStyle] of expected) {
    const t = resolveTheme(id)
    assert.equal(t.id, id)
    assert.equal(t.tokens.canvas.toUpperCase(), canvas)
    assert.equal(t.tokens.surface1.toUpperCase(), surface1)
    assert.equal(t.tokens.inkPrimary.toUpperCase(), inkPrimary)
    assert.equal(t.tokens.accentPrimary.toUpperCase(), accentPrimary)
    assert.equal(t.chromeStyle, chromeStyle)
    assert.ok(contrastRatio(t.tokens.inkPrimary, t.tokens.canvas) >= 4.5, id + ' 主文对比度不足')
  }
})

test('resolveChromeStyle 遵循 slide > brand > theme 优先级且 deriveBrandedTheme 兼容 brand.chromeStyle', () => {
  const base = resolveTheme('consulting')
  assert.equal(resolveChromeStyle(base), 'consulting-classic')
  assert.equal(resolveChromeStyle(base, {}, { chromeStyle: 'keynote-spatial' }), 'keynote-spatial')
  assert.equal(resolveChromeStyle(base, { chrome: 'gov-ceremonial' }, { chromeStyle: 'keynote-spatial' }), 'gov-ceremonial')
  assert.equal(resolveChromeStyle(base, { chrome: 'unknown-chrome' }, { chromeStyle: 'bad-chrome' }), 'consulting-classic')

  const branded = deriveBrandedTheme('consulting', { primary: '#1E40AF', chromeStyle: 'editorial-folio' })
  assert.equal(branded.chromeStyle, 'editorial-folio')
  assert.equal(resolveChromeStyle(branded), 'editorial-folio')
})

test('consulting-classic 骨架强制 0px 直角卡片、左竖条、右上章节追踪器与无框底栏', () => {
  const slides = normalizeSlides([
    { layout: 'cards', chrome: 'consulting-classic', kicker: '01 · 战略', title: '咨询直角布局', takeaway: '左竖线配无框底栏', bullets: ['**支柱 A**：聚焦高毛利主业', '**支柱 B**：优化交付人效'] },
  ])
  const theme = resolveTheme('keynote-light')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'Consulting Chrome', slides }, theme, lang)
  assert.match(html, /data-chrome="consulting-classic"/)
  assert.match(html, /class="consulting-tracker kicker"/)

  const xml = unzipPptxXml(buildPptx({ title: 'Consulting Chrome', slides }, theme, lang))['ppt/slides/slide1.xml']
  assert.match(xml, /name="Card Surface 1"[\s\S]*?prst="rect"/)
  assert.match(xml, /name="Card Surface 1 left stripe"/)
  const kickerOff = /name="Kicker"[\s\S]*?<a:off x="(\d+)"/.exec(xml)
  assert.ok(kickerOff && Number(kickerOff[1]) > 7000000)
  assert.match(xml, /name="Takeaway rule"/)
  assert.doesNotMatch(xml, /name="Takeaway bg"/)
})

test('keynote-spatial 骨架省略页眉分割线并渲染大圆角无框卡片与居中极简结语', () => {
  const slides = normalizeSlides([
    { layout: 'cards', chrome: 'keynote-spatial', kicker: 'APPLE KEYNOTE', title: '空间留白体验', takeaway: '无边框圆角呈现', bullets: ['**卡片一**：大圆角无边框', '**卡片二**：呼吸感留白'] },
  ])
  const theme = resolveTheme('consulting')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'Keynote Chrome', slides }, theme, lang)
  assert.match(html, /data-chrome="keynote-spatial"/)
  assert.match(html, /class="slide-takeaway"/)

  const xml = unzipPptxXml(buildPptx({ title: 'Keynote Chrome', slides }, theme, lang))['ppt/slides/slide1.xml']
  assert.doesNotMatch(xml, /name="Header rule"/)
  assert.match(xml, /name="Card Surface 1"[\s\S]*?prst="roundRect"/)
  assert.doesNotMatch(xml, /name="Card Surface 1 top bar"/)
  assert.doesNotMatch(xml, /name="Card Surface 1 left stripe"/)
})

test('editorial-folio 骨架将页码移至右上角杂志报头并渲染衬线序号与顶线注脚', () => {
  const slides = normalizeSlides([
    { layout: 'cards', chrome: 'editorial-folio', kicker: 'ISSUE 08', title: '杂志编辑部专栏', takeaway: '社论顶线注脚', bullets: ['**篇目一**：深度研究报告', '**篇目二**：趋势访谈摘要'] },
  ])
  const theme = resolveTheme('consulting')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'Editorial Chrome', slides }, theme, lang)
  assert.match(html, /data-chrome="editorial-folio"/)
  assert.match(html, /class="editorial-folio-bar"/)
  assert.match(html, /is-editorial-num/)

  const xml = unzipPptxXml(buildPptx({ title: 'Editorial Chrome', slides }, theme, lang))['ppt/slides/slide1.xml']
  assert.match(xml, /name="Editorial folio rule"/)
  assert.match(xml, /name="Takeaway rule"/)
  const pageMatch = /name="Page number"[\s\S]*?<a:off x="\d+" y="(\d+)"/.exec(xml)
  assert.ok(pageMatch && Number(pageMatch[1]) < 450000)
})

test('academic-minimal 骨架渲染 Beamer 通栏底色页眉带与三区学术底栏', () => {
  const slides = normalizeSlides([
    { layout: 'bullets', chrome: 'academic-minimal', kicker: 'CHAPTER 02', title: 'Beamer 学术框架', source: 'ICML 2026', bullets: ['定理证明与复杂度边界分析', '消融实验结果对比'] },
  ])
  const theme = resolveTheme('consulting')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'Beamer Chrome', slides }, theme, lang)
  assert.match(html, /data-chrome="academic-minimal"/)
  assert.match(html, /class="slide-header beamer-header-band"/)
  assert.match(html, /class="beamer-status-bar"/)

  const xml = unzipPptxXml(buildPptx({ title: 'Beamer Chrome', slides }, theme, lang))['ppt/slides/slide1.xml']
  assert.match(xml, /name="Beamer header band"/)
  assert.match(xml, /name="Beamer header rule"/)
  assert.match(xml, /name="Beamer footer band"/)
  assert.match(xml, /name="Beamer zone chapter"/)
})

test('gov-ceremonial 骨架渲染政务双线页眉与【】绶带标签', () => {
  const slides = normalizeSlides([
    { layout: 'bullets', chrome: 'gov-ceremonial', kicker: '02 · 重点举措', title: '稳步推进高质量发展', takeaway: '压实责任闭环', bullets: ['强化制度保障体系建设', '全面提升公共服务效能'] },
  ])
  const theme = resolveTheme('consulting')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'Gov Chrome', slides }, theme, lang)
  assert.match(html, /data-chrome="gov-ceremonial"/)
  assert.match(html, /class="kicker gov-ribbon"/)
  assert.match(html, /【02 · 重点举措】/)

  const xml = unzipPptxXml(buildPptx({ title: 'Gov Chrome', slides }, theme, lang))['ppt/slides/slide1.xml']
  assert.match(xml, /name="Header rule"/)
  assert.match(xml, /name="Header secondary rule"/)
  assert.ok(xml.includes('【02 · 重点举措】'))
})

test('tam 图示左侧圆环截断短标签并按弦宽钳制宽度，右侧卡片保留完整标签与 bullets 展开', () => {
  const slides = normalizeSlides([
    {
      layout: 'tam',
      title: '市场规模分层测算',
      items: [
        { tag: 'TAM · 全球总体市场', value: '$120B', title: '全球企业智能底座', text: '覆盖跨国协作支出', bullets: ['年均增速 18%', '云化渗透率超 65%'] },
        { tag: 'SAM · 亚太政企市场', value: '$28B', title: '亚太核心区域', text: '聚焦金融与制造' },
        { tag: 'SOM · 3 年目标份额', value: '$1.8B', title: '标杆切入市场', text: '高复购标杆客户集群' },
      ],
    },
  ])
  const theme = resolveTheme('consulting')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'TAM Fix', slides }, theme, lang)
  assert.match(html, /<span class="tam-ring-label">TAM · \$120B<\/span>/)
  assert.match(html, /<span class="item-badge">TAM · 全球总体市场<\/span>/)
  assert.match(html, /年均增速 18%；云化渗透率超 65%/)

  const xml = unzipPptxXml(buildPptx({ title: 'TAM Fix', slides }, theme, lang))['ppt/slides/slide1.xml']
  assert.ok(xml.includes('TAM  $120B'))
  assert.ok(xml.includes('TAM · 全球总体市场'))
  assert.ok(xml.includes('年均增速 18%；云化渗透率超 65%'))
})

test('process flywheel 不回退 slide.kicker 并在四角卡片完整渲染 bullets；funnel 柱条显示 value+unit', () => {
  const slides = normalizeSlides([
    {
      layout: 'process',
      variant: 'flywheel',
      kicker: '05 · 增长飞轮机制与跨部门长期演进闭环框架',
      title: '增长飞轮结构',
      items: [
        { tag: '01', title: '产品体验', text: '零门槛上手', bullets: ['首日激活 68%', 'NPS +52'] },
        { tag: '02', title: '口碑裂变', text: '团队协作传播' },
        { tag: '03', title: '生态沉淀', text: '模板资产复用' },
        { tag: '04', title: '商业扩购', text: '席位持续升级' },
      ],
    },
    {
      layout: 'process',
      variant: 'funnel',
      title: '年度销售转化漏斗',
      items: [
        { tag: '线索', title: '全渠道获客', value: '120,000', unit: '人', conversion: '25% MQL' },
        { tag: '商机', title: '有效评估', value: '30,000', unit: '人', conversion: '18% 赢单' },
        { tag: '成交', title: '企业签约', value: '5,400', unit: '家' },
      ],
    },
  ])
  const theme = resolveTheme('saas-bento' in THEMES ? 'linear-dark' : 'consulting')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'Flywheel Funnel Fix', slides }, theme, lang)
  assert.match(html, /<div class="flywheel-hub">增长飞轮<\/div>/)
  assert.doesNotMatch(html, /<div class="flywheel-hub">05 · 增长飞轮/)
  assert.match(html, /零门槛上手；首日激活 68%；NPS \+52/)
  assert.match(html, /120,000 人/)

  const entries = unzipPptxXml(buildPptx({ title: 'Flywheel Funnel Fix', slides }, theme, lang))
  assert.ok(entries['ppt/slides/slide1.xml'].includes('增长飞轮'))
  assert.ok(entries['ppt/slides/slide1.xml'].includes('首日激活 68%；NPS +52'))
  assert.ok(entries['ppt/slides/slide2.xml'].includes('120,000 人'))
})

test('org team 剥离中文敬称后缀并取单字姓氏作为头像字母缩写，English 取双首字母', () => {
  const slides = normalizeSlides([
    {
      layout: 'org',
      variant: 'team',
      title: '专家管理团队',
      items: [
        { title: '陈默 博士', role: '首席科学家', text: '人工智能实验室负责人' },
        { title: '林致远 教授', role: '首席顾问', text: '分布式计算权威学者' },
        { title: 'Grace Hopper Ph.D.', role: 'VP Eng', text: 'Compiler pioneer' },
      ],
    },
  ])
  const theme = resolveTheme('keynote-light')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'Team Monogram Fix', slides }, theme, lang)
  assert.match(html, /<div class="team-avatar">陈<\/div>/)
  assert.match(html, /<div class="team-avatar">林<\/div>/)
  assert.match(html, /<div class="team-avatar">GH<\/div>/)

  const xml = unzipPptxXml(buildPptx({ title: 'Team Monogram Fix', slides }, theme, lang))['ppt/slides/slide1.xml']
  assert.match(xml, /name="Team Avatar 1"[\s\S]*?<a:t>陈<\/a:t>/)
  assert.match(xml, /name="Team Avatar 2"[\s\S]*?<a:t>林<\/a:t>/)
  assert.match(xml, /name="Team Avatar 3"[\s\S]*?<a:t>GH<\/a:t>/)
})

test('gantt 当 span > 0 且 milestone 为 true 时同时渲染进度条与条尾白色描边菱形里程碑', () => {
  const slides = normalizeSlides([
    {
      layout: 'gantt',
      title: '带结尾里程碑的甘特图',
      columns: ['Q1', 'Q2', 'Q3', 'Q4'],
      items: [
        { tag: 'Core', title: '多租户隔离改造', start: 0, span: 2, milestone: true, value: 'Q1-Q2' },
        { tag: 'GA', title: '正式发布节点', start: 3, span: 0, milestone: true, value: 'GA' },
      ],
    },
  ])
  const theme = resolveTheme('consulting')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'Gantt Bar Milestone', slides }, theme, lang)
  assert.match(html, /class="gantt-bar[\s\S]*?gantt-bar-milestone/)
  assert.match(html, /class="gantt-milestone"/)

  const xml = unzipPptxXml(buildPptx({ title: 'Gantt Bar Milestone', slides }, theme, lang))['ppt/slides/slide1.xml']
  assert.match(xml, /name="Gantt Bar 1"/)
  assert.match(xml, /name="Gantt Milestone 1"[\s\S]*?prst="diamond"/)
  assert.match(xml, /name="Gantt Milestone 2"[\s\S]*?prst="diamond"/)
})

test('kpi 字符串条目解析支持中文单位“家/人/万元”与货币前缀提取主指标值', () => {
  const slides = normalizeSlides([
    {
      layout: 'kpi',
      title: '客户与营收指标',
      bullets: [
        '企业级客户总数：680 家',
        '年度合约总额：$1,250 万',
        '研发核心成员：320 人',
      ],
    },
  ])
  const theme = resolveTheme('consulting')
  const lang = resolveLanguage('zh')
  const html = renderHtml({ title: 'KPI Parse Fix', slides }, theme, lang)
  assert.match(html, /data-item-field="title">企业级客户总数<\/div><div class="kpi-value"><span data-item-field="value">680 家<\/span>/)
  assert.match(html, /data-item-field="title">年度合约总额<\/div><div class="kpi-value"><span data-item-field="value">\$1,250 万<\/span>/)
  assert.match(html, /data-item-field="title">研发核心成员<\/div><div class="kpi-value"><span data-item-field="value">320 人<\/span>/)

  const xml = unzipPptxXml(buildPptx({ title: 'KPI Parse Fix', slides }, theme, lang))['ppt/slides/slide1.xml']
  assert.match(xml, /name="KPI Value 1"[\s\S]*?<a:t>680 家<\/a:t>/)
  assert.match(xml, /name="KPI Value 2"[\s\S]*?<a:t>\$1,250 万<\/a:t>/)
  assert.match(xml, /name="KPI Value 3"[\s\S]*?<a:t>320 人<\/a:t>/)
})


import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import {
  CORE_LAYOUTS,
  LAYOUT_ALIASES,
  buildDeck,
  buildPptx,
  normalizeSlides,
  parseMarkdownDeck,
  renderHtml,
  resolveLanguage,
  resolveTheme,
  cleanRichText,
  stripInlineMarkdown,
  renderInlineHtml,
  containsLatexMath,
  looksLikeRawLatex,
  splitMathSegments,
  parseLatexMath,
  latexToMathMl,
  latexToOmml,
  computeMarimekkoModel,
  computeSankeyLayout,
  partitionValueChainItems,
  computeSwotModel,
} from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { buildDeckAsync, editDeck } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { renderDeck } from '../skills/dsh-ppt/scripts/deck-render.mjs'

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

test('deck-math: 分式、根式、上下标、大型算子、定界符、矩阵、重音与函数完整编译为 OMML 与 MathML', () => {
  const expr = '\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V + \\sum_{i=1}^{n} x_i^{2} \\sqrt[3]{\\hat{\\sigma}_i} \\begin{pmatrix} 1 & \\lambda \\\\ 0 & \\vec{v} \\end{pmatrix}'
  const ast = parseLatexMath(expr)
  assert.equal(ast.type, 'row')

  const omml = latexToOmml(expr)
  assert.match(omml, /<a14:m xmlns:a14="http:\/\/schemas\.microsoft\.com\/office\/drawing\/2010\/main">/)
  assert.match(omml, /<m:oMathPara xmlns:m="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/math">/)
  assert.match(omml, /<m:oMath>/)
  assert.match(omml, /<m:f><m:num>[\s\S]*?<\/m:num><m:den>[\s\S]*?<\/m:den><\/m:f>/)
  assert.match(omml, /<m:rad><m:radPr><m:degHide m:val="1"\/><\/m:radPr><m:deg\/><m:e>/)
  assert.match(omml, /<m:rad><m:radPr><m:degHide m:val="0"\/><\/m:radPr><m:deg>/)
  assert.match(omml, /<m:nary><m:naryPr><m:chr m:val="∑"\/><m:limLoc m:val="undOvr"\/><\/m:naryPr>/)
  assert.match(omml, /<m:sSubSup>/)
  assert.match(omml, /<m:d><m:dPr><m:begChr m:val="\("\/><m:endChr m:val="\)"\/><\/m:dPr>/)
  assert.match(omml, /<m:m><m:mr><m:e>/)
  assert.match(omml, /<m:acc><m:accPr>/)
  assert.doesNotMatch(omml, /\\frac|\\sqrt|\\sum|\\begin|\\hat|\\vec|\\lambda|\\sigma/, '零裸 LaTeX 反斜杠泄漏')

  const mathml = latexToMathMl(expr, { display: true })
  assert.match(mathml, /^<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML" display="block">/)
  assert.match(mathml, /<mfrac>/)
  assert.match(mathml, /<msqrt>/)
  assert.match(mathml, /<mroot>/)
  assert.match(mathml, /<munderover>/)
  assert.match(mathml, /<msubsup>/)
  assert.match(mathml, /<mtable class="math-matrix">/)
  assert.match(mathml, /<mover accent="true">/)
  assert.doesNotMatch(mathml, /\\frac|\\sqrt|\\sum|\\begin/)
})

test('deck-math: 全套希腊字母、数学符号、极限算子与花体/黑板粗体零反斜杠编译', () => {
  const symbolsLatex = '\\alpha + \\beta + \\gamma + \\theta + \\omega + \\Gamma + \\Delta + \\Lambda + \\Sigma + \\Omega + \\nabla \\partial \\infty \\leq \\geq \\neq \\approx \\equiv \\pm \\times \\cdot \\in \\notin \\subset \\subseteq \\forall \\exists \\rightarrow \\Rightarrow \\leftrightarrow \\mapsto \\ldots \\cdots'
  const omml = latexToOmml(symbolsLatex, { wrapDrawingMl: false })
  for (const glyph of ['α', 'β', 'γ', 'θ', 'ω', 'Γ', 'Δ', 'Λ', 'Σ', 'Ω', '∇', '∂', '∞', '≤', '≥', '≠', '≈', '≡', '±', '×', '·', '∈', '∉', '⊂', '⊆', '∀', '∃', '→', '⇒', '↔', '↦', '…', '⋯']) {
    assert.ok(omml.includes(glyph), 'OMML 应包含符号: ' + glyph)
  }
  assert.doesNotMatch(omml, /\\[a-zA-Z]+/)

  const limLatex = '\\arg\\max_{\\theta \\in \\mathbb{R}^d} \\lim_{T \\to \\infty} \\oint_{\\gamma} \\mathcal{L}(\\mathbf{W})'
  const limOmml = latexToOmml(limLatex, { wrapDrawingMl: false })
  assert.match(limOmml, /<m:limLow><m:e>[\s\S]*?arg max[\s\S]*?<\/m:e><m:lim>/)
  assert.ok(limOmml.includes('ℝ'))
  assert.ok(limOmml.includes('ℒ'))
  assert.match(limOmml, /<m:chr m:val="∮"\/>/)
  assert.match(limOmml, /<m:supHide m:val="1"\/>/, '单下标围道积分应自动隐藏空白上标占位框')
})

test('deck-math: 货币符号防护、不等号与下划线保护及 XSS 注入免疫', () => {
  assert.equal(containsLatexMath('$120B 全球市场'), false)
  assert.equal(containsLatexMath('年度营收从 $12M 增长至 $48M，翻了四倍'), false)
  assert.equal(containsLatexMath('满足约束 $0 < \\alpha_i < 1$ 且 $\\sum_i \\alpha_i = 1$'), true)
  assert.equal(looksLikeRawLatex('\\frac{QK^T}{\\sqrt{d_k}}'), true)
  assert.equal(looksLikeRawLatex('ROI = Gain / Cost'), false)

  // cleanRichText 与 stripInlineMarkdown 不会把 $0 < \alpha_i < 1$ 里的 <...> 当成 HTML 标签误删
  const preserved = cleanRichText('权重约束：$0 < \\alpha_i < 1$ 且 $x_i > 0$')
  assert.equal(preserved, '权重约束：$0 < \\alpha_i < 1$ 且 $x_i > 0$')
  assert.equal(stripInlineMarkdown('标题 $O(1/\\sqrt{T_k})$'), '标题 $O(1/\\sqrt{T_k})$')

  const html = renderInlineHtml('收敛界 **$\\alpha_i \\leq 1$ 恒成立**，恶意载荷 $<script>alert(1)</script>$')
  assert.match(html, /<strong><math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML"/)
  assert.doesNotMatch(html, /<script>/)
})

test('normalizeSlides 与 Markdown 解析原生保留 slide.formula 及 4 套巅峰咨询版式', () => {
  assert.ok(CORE_LAYOUTS.has('marimekko'))
  assert.ok(CORE_LAYOUTS.has('sankey'))
  assert.ok(CORE_LAYOUTS.has('value-chain'))
  assert.ok(CORE_LAYOUTS.has('swot'))
  assert.equal(LAYOUT_ALIASES['value-chain'], undefined, 'value-chain 已升级为一等核心版式，不再作为 chevron 别名')
  assert.equal(LAYOUT_ALIASES.mekko.layout, 'marimekko')
  assert.equal(LAYOUT_ALIASES.porter.layout, 'value-chain')

  const slides = normalizeSlides([
    { layout: 'callout', variant: 'formula', title: '核心公式', formula: '\\frac{a_1}{b_2} = \\sqrt{x^2 + y^2}' },
    { layout: 'marimekko', title: '市场地图', rows: [['赛道', '政务 (400亿)', '金融 (200亿)'], ['本方案', '45%', '35%'], ['其他', '55%', '65%']] },
    { layout: 'sankey', title: '利润流向', bullets: ['总营收 -> 毛利润: 70亿', '总营收 -> 成本: 30亿'] },
    { layout: 'value-chain', title: '波特价值链', bullets: ['入站接入', '智能加工', '渠道交付', '增值运营'] },
    { layout: 'swot', title: 'SWOT 分析', bullets: ['S：自研壁垒', 'W：渠道尚浅', 'O：信创窗口', 'T：价格竞争'] },
  ])
  assert.equal(slides[0].formula, '\\frac{a_1}{b_2} = \\sqrt{x^2 + y^2}')
  assert.equal(slides[1].layout, 'marimekko')
  assert.equal(slides[1].rows.length, 3)
  assert.equal(slides[2].layout, 'sankey')
  assert.equal(slides[2].items[0].tag, '总营收')
  assert.equal(slides[2].items[0].title, '毛利润')
  assert.equal(slides[3].layout, 'value-chain')
  assert.equal(slides[4].layout, 'swot')

  const md = [
    '# 算法与市场白皮书',
    '',
    '## 目标函数推导',
    '$$',
    '\\mathcal{L}(\\theta) = \\frac{1}{N} \\sum_{i=1}^{N} (y_i - \\hat{y}_i)^2',
    '$$',
    '- $\\theta$：模型参数向量',
    '',
    '## 区域份额地图',
    '::: marimekko',
    '| 厂商 | 华东 (500亿) | 华南 (300亿) |',
    '| --- | --- | --- |',
    '| 本方案 | 40% | 30% |',
    '| 其他 | 60% | 70% |',
    ':::',
  ].join('\n')
  const parsed = parseMarkdownDeck('', md, 'zh')
  const mathSlide = parsed.slides.find((s) => s.formula)
  assert.ok(mathSlide)
  assert.equal(mathSlide.layout, 'callout')
  assert.equal(mathSlide.variant, 'formula')
  assert.match(mathSlide.formula, /\\mathcal\{L\}/)
  const mekkoSlide = parsed.slides.find((s) => s.layout === 'marimekko')
  assert.ok(mekkoSlide)
  assert.equal(mekkoSlide.rows.length, 3)
})

test('4 套巅峰咨询与财务版式几何模型：Marimekko 面积归一、Sankey 流量守恒、Porter 分层与 SWOT 合成', () => {
  // 1. Marimekko 两种输入格式面积守恒校验
  const mekkoFromRows = computeMarimekkoModel({
    rows: [
      ['份额 \\ 赛道', '华东政务 (450亿)', '金融信创 (320亿)', '高端制造 (230亿)'],
      ['本方案 / Ours', '40%', '35%', '25%'],
      ['厂商 B', '35%', '40%', '45%'],
      ['其他', '25%', '25%', '30%'],
    ],
  }, 'zh')
  assert.equal(mekkoFromRows.columns.length, 3)
  const widthSum = mekkoFromRows.columns.reduce((s, c) => s + c.widthRatio, 0)
  assert.ok(Math.abs(widthSum - 1) < 1e-6, 'Marimekko 列宽占比之和必须严格为 1')
  assert.ok(mekkoFromRows.columns[0].widthRatio > mekkoFromRows.columns[1].widthRatio)
  assert.ok(mekkoFromRows.columns[1].widthRatio > mekkoFromRows.columns[2].widthRatio)
  for (const col of mekkoFromRows.columns) {
    const hSum = col.segments.reduce((s, seg) => s + seg.heightRatio, 0)
    assert.ok(Math.abs(hSum - 1) < 1e-6, '每列分段高度之和必须严格为 100%')
  }

  const mekkoFromItems = computeMarimekkoModel({
    layout: 'marimekko',
    items: [
      { title: '政务', value: '600', unit: '亿', bullets: ['本方案: 50%', '其他: 50%'] },
      { title: '金融', value: '400', unit: '亿', bullets: ['本方案: 30%', '其他: 70%'] },
    ],
  }, 'zh')
  assert.ok(Math.abs(mekkoFromItems.columns[0].widthRatio - 0.6) < 1e-6)
  assert.equal(mekkoFromItems.seriesSummary[0].weightedPct, 42)

  // 2. Sankey 多层拓扑与流量守恒校验
  const sankey = computeSankeyLayout({
    layout: 'sankey',
    items: normalizeSlides([{
      layout: 'sankey',
      bullets: [
        '总营收 -> 毛利润: 68.5亿',
        '总营收 -> 营业成本: 31.5亿',
        '毛利润 -> 营业利润: 34.5亿',
        '毛利润 -> 研发投入: 22.0亿',
        '毛利润 -> 营销费用: 12.0亿',
      ],
    }])[0].items,
  })
  assert.equal(sankey.layerCount, 3)
  const revNode = sankey.nodes.find((n) => n.name === '总营收')
  const gpNode = sankey.nodes.find((n) => n.name === '毛利润')
  assert.equal(revNode.val, 100)
  assert.equal(gpNode.val, 68.5)
  assert.ok(revNode.h > gpNode.h, '总营收立柱高度必须大于毛利润立柱')

  // 3. Porter Value Chain 辅助活动 + 基本活动拆分
  const porter = partitionValueChainItems({
    layout: 'value-chain',
    items: [
      { tag: '辅助活动', title: '基础设施治理' },
      { tag: 'Support', title: '研发与人才底座' },
      { tag: '01', title: '多源接入' },
      { tag: '02', title: '模型精调' },
      { tag: '03', title: '生产运营' },
      { tag: '04', title: '客户增值' },
    ],
  }, 'zh')
  assert.equal(porter.supportItems.length, 2)
  assert.equal(porter.primaryItems.length, 4)

  // 4. SWOT 四象限识别与 SO/WO/ST/WT 策略合成
  const swot = computeSwotModel({
    layout: 'swot',
    text: '战略锚点',
    items: [
      { tag: 'T', title: '外部价格战' },
      { tag: 'S', title: '核心自研引擎' },
      { tag: 'O', title: '信创替代红利' },
      { tag: 'W', title: '渠道伙伴较少' },
    ],
  }, 'zh')
  assert.deepEqual(swot.quadrants.map((q) => q.key), ['S', 'W', 'O', 'T'])
  assert.equal(swot.quadrants[0].title, '核心自研引擎')
  assert.equal(swot.anchorText, '战略锚点')
  assert.equal(swot.strategies.length, 4)
})

test('端到端 OOXML 结构校验、HTML MathML/SVG 同构与 LibreOffice 零缺字真实渲染验证', async (t) => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-p4-e2e-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const deckSlides = [
    {
      layout: 'marimekko',
      kicker: '01 · MARKET MAP',
      title: '不等宽市场竞争格局图（Marimekko）',
      rows: [
        ['份额 \\ 赛道', '华东政务 (450亿)', '金融信创 (320亿)', '高端制造 (230亿)', '医疗健康 (150亿)'],
        ['本方案 / Ours', '42%', '36%', '28%', '24%'],
        ['传统厂商 A', '33%', '39%', '37%', '38%'],
        ['其他厂商', '25%', '25%', '35%', '38%'],
      ],
      takeaway: '两大主力赛道占据 **67%** 市场空间',
    },
    {
      layout: 'sankey',
      kicker: '02 · EARNINGS FLOW',
      title: '营收与营业利润多层桑基流向图（Sankey）',
      bullets: [
        '总营收 -> 毛利润: 68.5亿 (+24% YoY) [positive]',
        '总营收 -> 营业成本: 31.5亿 [negative]',
        '毛利润 -> 营业利润: 34.5亿 (+38% YoY) [positive]',
        '毛利润 -> 研发投入: 22.0亿 [negative]',
        '毛利润 -> 营销及管理: 12.0亿 [negative]',
      ],
    },
    {
      layout: 'value-chain',
      kicker: '03 · PORTER VALUE CHAIN',
      title: '波特价值链重构与利润池释放',
      text: '利润池\n+28% EBIT',
      items: [
        { tag: '辅助活动', title: '企业级安全合规与多云治理底座', text: 'SOC2 审计与统一权限管控' },
        { tag: '辅助活动', title: '核心推理引擎研发与专家人才赋能', text: '算子融合加速与行业交付方法论' },
        { tag: '01', title: '数据接入', value: '99.9%', unit: 'SLA', text: '多模态实时清洗' },
        { tag: '02', title: '知识蒸馏', conversion: '3.2x 提效', text: '垂直领域精调对齐' },
        { tag: '03', title: '工作流编排', conversion: '48h 上线', text: '低代码多智能体协同' },
        { tag: '04', title: '持续增购', conversion: '118% NRR', text: '高价值场景扩席闭环' },
      ],
    },
    {
      layout: 'swot',
      kicker: '04 · SWOT MATRIX',
      title: '平台化战略转型 SWOT 十字矩阵',
      text: '破局核心',
      items: [
        { tag: 'S', title: '自研推理吞吐领先', bullets: ['单卡性能领先 **2.4x**', '标杆客户高留存'] },
        { tag: 'W', title: '海外生态尚处早期', bullets: ['本地 ISV 伙伴待拓展'] },
        { tag: 'O', title: '政企私有化升级潮', bullets: ['年度预算增速超 **40%**'] },
        { tag: 'T', title: '公有云基础层补贴', bullets: ['低端通用场景同质化'] },
      ],
    },
    {
      layout: 'matrix',
      variant: 'swot',
      title: 'matrix[swot] 变体同构兼容校验',
      bullets: ['S：核心专利储备', 'W：交付人力瓶颈', 'O：行业标准制定', 'T：供应链波动'],
    },
    {
      layout: 'callout',
      variant: 'formula',
      kicker: '06 · NATIVE OMML MATH',
      title: '原生可编辑 Office Math 核心方程',
      formula: '\\text{Attention}(Q,K,V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V + \\sum_{i=1}^{n} \\alpha_i \\begin{pmatrix} 1 & \\lambda_i \\\\ 0 & \\hat{\\sigma}_i \\end{pmatrix}',
      text: '融合全局缩放点积注意力与谱正则矩阵变换',
      items: [
        { tag: '$Q, K, V$', title: '查询、键、值投影矩阵', text: '缩放因子 $\\sqrt{d_k}$ 稳定梯度方差' },
        { tag: '$\\alpha_i$', title: '自适应门控权重', text: '满足归一化约束 $\\sum_{i=1}^n \\alpha_i = 1$' },
      ],
    },
  ]

  const created = await buildDeckAsync({
    title: 'Phase 4 Pinnacle & Math Verification',
    theme: 'consulting',
    lang: 'zh',
    slides: deckSlides,
    outputDir: dir,
    fileName: 'p4-verify',
  })
  assert.equal(created.ok, true)

  // 验证 editDeck 可无损更新 slide.formula
  const edited = await editDeck({
    deckPath: created.jsonPath,
    expectedRevision: 0,
    edits: [{
      slide: 6,
      patch: {
        formula: '\\mathcal{L}(\\theta) = -\\frac{1}{N}\\sum_{i=1}^{N} \\log p_\\theta(y_i \\mid x_i) + \\lambda \\left\\| \\vec{\\theta} \\right\\|^2',
      },
    }],
  })
  assert.equal(edited.revision, 1)

  const html = readFileSync(edited.htmlPath, 'utf8')
  assert.match(html, /class="mekko-board"/)
  assert.match(html, /class="sankey-svg"/)
  assert.match(html, /class="sankey-ribbon"/)
  assert.match(html, /class="porter-board"/)
  assert.match(html, /class="porter-margin-wedge"/)
  assert.match(html, /class="swot-board"/)
  assert.match(html, /class="swot-anchor"/)
  assert.match(html, /<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML" display="block" class="deck-math is-block">/)

  const pptxBytes = readFileSync(edited.pptxPath)
  const pres = await loadPresentation(pptxBytes)
  const validationErrors = validatePresentation(pres).filter((i) => i.severity === 'error')
  assert.deepEqual(validationErrors, [], '生成的 PPTX 必须 0 OOXML 结构错误')

  const entries = unzipPptxXml(pptxBytes)
  assert.match(entries['ppt/slides/slide1.xml'], /Mekko Cell 1-1/)
  assert.match(entries['ppt/slides/slide1.xml'], /Mekko Width Axis/)
  assert.match(entries['ppt/slides/slide2.xml'], /<a:custGeom>[\s\S]*?<a:cubicBezTo>[\s\S]*?<a:close\/>/)
  assert.match(entries['ppt/slides/slide3.xml'], /Porter Support Beam 1/)
  assert.match(entries['ppt/slides/slide3.xml'], /Porter Primary Chevron 1/)
  assert.match(entries['ppt/slides/slide3.xml'], /Porter Margin Wedge/)
  assert.match(entries['ppt/slides/slide4.xml'], /SWOT Strategic Anchor/)
  assert.match(entries['ppt/slides/slide4.xml'], /SWOT Strategy SO/)
  assert.match(entries['ppt/slides/slide5.xml'], /SWOT Strategic Anchor/)
  assert.match(entries['ppt/slides/slide6.xml'], /<a14:m xmlns:a14="http:\/\/schemas\.microsoft\.com\/office\/drawing\/2010\/main"><m:oMathPara/)
  assert.match(entries['ppt/slides/slide6.xml'], /<m:f>/)
  assert.match(entries['ppt/slides/slide6.xml'], /<m:nary>/)

  // 校验每页形状 cNvPr id 唯一
  for (const [name, xml] of Object.entries(entries)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue
    const ids = [...xml.matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)].map((m) => m[1])
    assert.equal(new Set(ids).size, ids.length, name + ' 存在重复形状 ID')
  }

  // 调用真实 LibreOffice 渲染引擎验证零缺字与全页出图
  const renderResult = await renderDeck({
    pptxPath: edited.pptxPath,
    outputDir: join(dir, 'lo-render'),
    width: 1280,
  })
  if (renderResult.status !== 'unavailable') {
    assert.equal(renderResult.ok, true)
    assert.equal(renderResult.slideCount, 6)
    assert.deepEqual(renderResult.missingFonts, [], 'LibreOffice 渲染必须保持 missingFonts 为空')
    for (const pngPath of renderResult.pngPaths) {
      assert.equal(existsSync(pngPath), true)
      const pngBytes = readFileSync(pngPath)
      assert.ok(Math.abs(pngBytes.readUInt32BE(16) - 1280) <= 2)
      assert.ok(Math.abs(pngBytes.readUInt32BE(20) - 720) <= 2)
    }
  }

  // 同时验证 buildDeck 同步模式默认保持 3 文件契约，显式传 handout: true 时额外生成 .handout.md
  const syncDefault = buildDeck({
    title: 'Sync Default',
    slides: [{ layout: 'callout', variant: 'formula', title: '欧拉公式', formula: 'e^{i\\pi} + 1 = 0' }],
    outputDir: join(dir, 'sync-3'),
  })
  assert.equal(syncDefault.handoutPath, undefined)

  const syncWithHandout = buildDeck({
    title: 'Sync Handout',
    slides: [{ layout: 'callout', variant: 'formula', title: '欧拉公式', formula: 'e^{i\\pi} + 1 = 0' }],
    outputDir: join(dir, 'sync-4'),
    handout: true,
  })
  assert.ok(syncWithHandout.handoutPath && existsSync(syncWithHandout.handoutPath))
})

test('deck-math: 非 BMP 花体与黑板粗体零 SMP 码位输出（彻底杜绝 LibreOffice □ 豆腐块）', () => {
  const smpPlane1Re = /[\u{1D400}-\u{1D7FF}]/u
  const expr = '\\mathcal{J}(\\theta) = \\mathbb{E}_{\\tau \\sim \\pi_\\theta}[r_t] + \\mathcal{D} + \\mathcal{O}(n) + \\mathbb{A} + \\mathbb{1} + \\mathbb{R}^d + \\mathcal{L}'

  const omml = latexToOmml(expr, { wrapDrawingMl: false })
  assert.equal(smpPlane1Re.test(omml), false, 'OMML 绝不可包含 U+1D400..U+1D7FF SMP 字符')
  assert.match(omml, /<m:rPr><m:scr m:val="double-struck"\/><m:sty m:val="b"\/><\/m:rPr><m:t>E<\/m:t>/)
  assert.match(omml, /<m:rPr><m:scr m:val="script"\/><\/m:rPr><m:t>D<\/m:t>/)
  assert.ok(omml.includes('ℝ') && omml.includes('ℒ'), '标准字体具备的 BMP 类字母符号应保留')

  const mathml = latexToMathMl(expr)
  assert.equal(smpPlane1Re.test(mathml), false, 'MathML 绝不可包含 SMP 豆腐块高危码位')
  assert.match(mathml, /<mi mathvariant="double-struck">E<\/mi>/)
  assert.match(mathml, /<mi mathvariant="script">D<\/mi>/)

  const pptxBuf = buildPptx({
    title: 'Zero SMP Tofu',
    theme: 'consulting',
    lang: 'zh',
    slides: normalizeSlides([{
      layout: 'bullets',
      title: '行内非 BMP 符号防护',
      bullets: ['后验推断满足 $P(\\theta \\mid \\mathcal{D}) \\propto \\mathbb{E}_{z \\in \\mathbb{R}^d}[\\mathcal{O}(z)]$'],
    }]),
  })
  const slideXml = unzipPptxXml(pptxBuf)['ppt/slides/slide1.xml']
  assert.equal(smpPlane1Re.test(slideXml), false, '行内 DrawingML <a:r> 绝不可包含 SMP 码位')
  assert.match(slideXml, /<a:rPr[^>]*b="1"[^>]*>[\s\S]*?<a:t>E<\/a:t>/)
  assert.match(slideXml, /<a:rPr[^>]*b="1"[^>]*i="1"[^>]*>[\s\S]*?<a:t>D<\/a:t>/)
})

test('deck-math: 转义百分号 \\% 在行内与块级公式中完整保留，未转义 % 行尾注释正常剥离', () => {
  const inlineHtml = renderInlineHtml('保留 $99.4\\% + \\alpha$ 信息熵且显著优于基线')
  assert.ok(inlineHtml.includes('99.4') && inlineHtml.includes('%') && inlineHtml.includes('α'))
  assert.ok(inlineHtml.includes('信息熵且显著优于基线'))

  const withComment = 'x_1 + 99.4\\% % 这里是 LaTeX 行尾注释不应泄露\n + \\beta'
  const omml = latexToOmml(withComment, { wrapDrawingMl: false })
  assert.ok(omml.includes('99.4'))
  assert.ok(omml.includes('%'))
  assert.ok(omml.includes('β'))
  assert.equal(omml.includes('行尾注释'), false)
})

test('deck-math: 行内重音符号（\\hat{\\omega}_i、\\vec{u}_j、\\hat{u}_k）NFC 预组与负字距居中不挤压下标', () => {
  const pptxBuf = buildPptx({
    title: 'Inline Accents',
    theme: 'consulting',
    lang: 'zh',
    slides: normalizeSlides([{
      layout: 'bullets',
      title: '行内重音与向量符号',
      bullets: ['谱更新 $\\hat{\\omega}_i = \\eta \\vec{u}_j + \\hat{u}_k + \\vec{x}_j$ 稳定收敛'],
    }]),
  })
  const slideXml = unzipPptxXml(pptxBuf)['ppt/slides/slide1.xml']
  assert.equal(slideXml.includes('\u20D7'), false, '行内 <a:r> 不得输出 CJK/基础字体缺失的 U+20D7')
  assert.ok(slideXml.includes('ū'), '\\vec{u} 应合成为 NFC 单码位 ū')
  assert.ok(slideXml.includes('û'), '\\hat{u} 应合成为 NFC 单码位 û')
  assert.match(slideXml, /spc="-\d+"[^>]*>[\s\S]*?<a:t>ωˆ<\/a:t>/, '\\hat{\\omega} 应通过负字距回退居中叠印顶标')
  assert.match(slideXml, /lang="en-US"/, '纯数学 Run 应标记 en-US 以启用西文数学排版')
})

test('Porter value-chain: 辅助活动导轨双段居中与基本活动 Chevron 双行无孤字排版', async () => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')
  const pptxBuf = buildPptx({
    title: 'Porter Layout Polish',
    theme: 'consulting',
    lang: 'zh',
    slides: normalizeSlides([{
      layout: 'value-chain',
      title: '企业级大模型全链路波特价值链',
      text: '利润池\n+28% EBIT',
      items: [
        { tag: '辅助活动', title: '统一异构算力调度与多云治理', text: '零信任审计' },
        { tag: '辅助活动', title: '预训练基础模型研发与知识库', text: '算子融合加速' },
        { tag: '01 · 接入', title: '多源异构接入', conversion: '99.95% SLA', text: '实时脱敏入湖' },
        { tag: '02 · 精调', title: '垂直领域蒸馏', conversion: '3.4x 吞吐', text: '强化对齐路由' },
        { tag: '03 · 编排', title: '多智能体协同', conversion: '48h 交付', text: '工具沙箱调用' },
        { tag: '04 · 运营', title: '高价值场景增购', conversion: '122% NRR', text: '业务飞轮扩席' },
      ],
    }]),
  })
  const pres = await loadPresentation(pptxBuf)
  assert.deepEqual(validatePresentation(pres).filter((i) => i.severity === 'error'), [])

  const xml = unzipPptxXml(pptxBuf)['ppt/slides/slide1.xml']
  const railMatch = /name="Porter Support Rail"[\s\S]*?<\/p:sp>/.exec(xml)
  assert.ok(railMatch, '应包含 Porter Support Rail')
  assert.equal([...railMatch[0].matchAll(/<a:p>/g)].length, 2, '辅助活动导轨应拆分为 2 个独立居中段落')

  const chevMatch = /name="Porter Primary Chevron 1"[\s\S]*?<\/p:sp>/.exec(xml)
  assert.ok(chevMatch, '应包含 Porter Primary Chevron 1')
  assert.equal([...chevMatch[0].matchAll(/<a:p>/g)].length, 2, '基本活动 Chevron 应拆分为标签+标题 2 个居中段落')
  assert.ok(chevMatch[0].includes('01 · 接入') && chevMatch[0].includes('多源异构接入'))
})

test('SWOT 十字矩阵：四象限标题统一左对齐、下排锚点避让与中央战略锚点双行均衡切分', async () => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')
  const normalized = normalizeSlides([{
    layout: 'swot',
    title: '战略定位十字矩阵',
    text: '破局核心\n行业智能底座',
    items: [
      { tag: 'S', title: '全栈自研护城河', bullets: ['单卡吞吐提升 **2.4x**'] },
      { tag: 'W', title: '生态渠道待拓宽', bullets: ['腰部地市伙伴待覆盖'] },
      { tag: 'O', title: '信创替代黄金期', bullets: ['核心系统国产化提速'] },
      { tag: 'T', title: '低价同质化冲击', bullets: ['通用场景补贴加剧'] },
    ],
  }])
  const model = computeSwotModel(normalized[0], 'zh')
  assert.equal(model.anchorText, '破局核心\n行业智能底座', '换行折叠为空格后仍应智能还原为均衡双行')

  const unbrokenModel = computeSwotModel({ layout: 'swot', text: '全域智能算力底座' }, 'zh')
  assert.equal(unbrokenModel.anchorText, '全域智能\n算力底座', '长连续中文锚点应自动对半均衡分行')

  const pptxBuf = buildPptx({ title: 'SWOT Polish', theme: 'consulting', lang: 'zh', slides: normalized })
  const pres = await loadPresentation(pptxBuf)
  assert.deepEqual(validatePresentation(pres).filter((i) => i.severity === 'error'), [])

  const xml = unzipPptxXml(pptxBuf)['ppt/slides/slide1.xml']
  for (const key of ['S', 'W', 'O', 'T']) {
    const hm = new RegExp('name="SWOT Header ' + key + '"[\\s\\S]*?<\\/p:sp>').exec(xml)
    assert.ok(hm, '应存在 SWOT Header ' + key)
    assert.doesNotMatch(hm[0], /algn="r"/, 'SWOT Header ' + key + ' 必须左对齐，不得右对齐悬空')
  }
  const tHead = /name="SWOT Header T"[\s\S]*?<\/p:sp>/.exec(xml)[0]
  const lInsMatch = /lIns="(\d+)"/.exec(tHead)
  assert.ok(lInsMatch && Number(lInsMatch[1]) >= 850000, '右下 T 标题栏左内边距必须避让中央战略锚点')

  const anchorXml = /name="SWOT Strategic Anchor"[\s\S]*?<\/p:sp>/.exec(xml)[0]
  const cxMatch = /<a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(anchorXml)
  assert.ok(cxMatch && Number(cxMatch[1]) >= Math.round(2.10 * 914400), '中央战略锚点宽度应 >= 2.10 英寸')
  assert.equal([...anchorXml.matchAll(/<a:p>/g)].length, 2, '中央战略锚点应渲染均衡双行段落')
})

test('Marimekko 窄列顶栏（6.9% 中东及拉美）自动收敛 8pt 零内边距单行排版', async () => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')
  const slides = normalizeSlides([{
    layout: 'marimekko',
    title: '全球区域份额地图',
    rows: [
      ['份额 \\ 区域', '华东政务 (480亿)', '华北金融 (340亿)', '华南制造 (260亿)', '中东及拉美 (80亿)'],
      ['本方案 / Ours', '44%', '38%', '31%', '28%'],
      ['其他厂商', '56%', '62%', '69%', '72%'],
    ],
  }])
  const pptxBuf = buildPptx({ title: 'Narrow Mekko', theme: 'consulting', lang: 'zh', slides })
  const pres = await loadPresentation(pptxBuf)
  assert.deepEqual(validatePresentation(pres).filter((i) => i.severity === 'error'), [])

  const xml = unzipPptxXml(pptxBuf)['ppt/slides/slide1.xml']
  const narrowHead = /name="Mekko Col Header 4"[\s\S]*?<\/p:sp>/.exec(xml)
  assert.ok(narrowHead)
  assert.match(narrowHead[0], /lIns="0"[^>]*rIns="0"/, '窄列顶栏必须采用零左右内边距')
  assert.match(narrowHead[0], /sz="800"/, '窄列 5 字标题应自动降为 8pt (sz=800) 保单行')
})

test('四层 Sankey 能量守恒拓扑与深色主题 LibreOffice PNG 零缺字真实渲染验证', async (t) => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-p4-dark-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const sankeySlide = normalizeSlides([{
    layout: 'sankey',
    title: '四层营收至净利润桑基流向图',
    bullets: [
      '总营收 -> 毛利润: 68.5亿 [positive]',
      '总营收 -> 营业成本: 31.5亿 [negative]',
      '毛利润 -> 营业利润: 34.5亿 [positive]',
      '毛利润 -> 研发投入: 22.0亿 [negative]',
      '毛利润 -> 营销费用: 12.0亿 [negative]',
      '营业利润 -> 净利润: 28.2亿 (+41% YoY) [positive]',
      '营业利润 -> 所得税费: 6.3亿 [negative]',
    ],
  }])[0]

  const layout = computeSankeyLayout(sankeySlide)
  assert.equal(layout.layerCount, 4, '四级流向链路应生成 4 列拓扑层')
  const gp = layout.nodes.find((n) => n.name === '毛利润')
  const op = layout.nodes.find((n) => n.name === '营业利润')
  const np = layout.nodes.find((n) => n.name === '净利润')
  assert.ok(gp.layer === 1 && op.layer === 2 && np.layer === 3)
  assert.ok(gp.h > op.h && op.h > np.h, '四层节点高度必须严格遵循流量单调守恒')

  const darkBuilt = buildDeck({
    outputDir: dir,
    fileName: 'dark-pinnacle-math',
    title: 'Dark Theme Math & 4-Layer Sankey',
    theme: 'obsidian-amber',
    lang: 'zh',
    slides: [
      {
        layout: 'bullets',
        title: '深色主题象牙瓷板方程与行内重音零缺字验证',
        formula: '\\mathbb{E}_{x \\sim \\mathcal{D}}\\left[\\frac{\\|\\nabla_\\theta \\mathcal{L}(\\theta)\\|_2}{\\sqrt{d_k + \\epsilon}}\\right] \\leq 99.4\\% \\cdot \\sigma_{\\max}',
        bullets: [
          '**先验与后验：**满足 $P(\\theta \\mid \\mathcal{D}) \\in \\mathbb{R}^d$ 且期望 $\\mathbb{E}[r_t]$ 收敛率达 $99.4\\%$',
          '**谱方向更新：**参数 $\\hat{\\omega}_i = \\lambda \\vec{u}_j + \\hat{e}_k$ 严格正交且无重音漂移',
        ],
      },
      sankeySlide,
    ],
  })

  const darkBytes = readFileSync(darkBuilt.pptxPath)
  const pres = await loadPresentation(darkBytes)
  assert.deepEqual(validatePresentation(pres).filter((i) => i.severity === 'error'), [])

  const entries = unzipPptxXml(darkBytes)
  assert.equal(/[\u{1D400}-\u{1D7FF}]/u.test(entries['ppt/slides/slide1.xml']), false)
  assert.match(entries['ppt/slides/slide1.xml'], /val="F8FAFC"/, '深色主题公式应自动铺设高对比度象牙白衬板')

  const rendered = await renderDeck({
    pptxPath: darkBuilt.pptxPath,
    outputDir: join(dir, 'lo-dark'),
    width: 1280,
  })
  if (rendered.status !== 'unavailable') {
    assert.equal(rendered.ok, true)
    assert.equal(rendered.slideCount, 2)
    assert.deepEqual(rendered.missingFonts, [], '深色主题 LibreOffice 渲染必须保持零缺字')
    for (const pngPath of rendered.pngPaths) {
      assert.equal(existsSync(pngPath), true)
    }
  }
})

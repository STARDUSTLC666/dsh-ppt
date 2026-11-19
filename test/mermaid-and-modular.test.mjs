import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'

import * as deckChrome from '../skills/dsh-ppt/scripts/deck-chrome.mjs'
import * as deckDiagrams from '../skills/dsh-ppt/scripts/deck-diagrams.mjs'
import * as deckMermaid from '../skills/dsh-ppt/scripts/deck-mermaid.mjs'
import * as deckLayouts from '../skills/dsh-ppt/scripts/deck-layouts.mjs'
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
  detectMermaidMode,
  parseMermaidFlowchart,
  layoutMermaidFlowchart,
  parseMermaidSequence,
  layoutMermaidSequence,
  compileMermaidSlide,
  ooxmlConnector,
} from '../skills/dsh-ppt/scripts/deck-core.mjs'
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

test('模块化版式架构：deck-chrome / deck-diagrams / deck-mermaid / deck-layouts 职责清晰且 100% 兼容原有公共导出', () => {
  const scriptsDir = 'skills/dsh-ppt/scripts'
  const chromeBytes = statSync(join(scriptsDir, 'deck-chrome.mjs')).size
  const diagramsBytes = statSync(join(scriptsDir, 'deck-diagrams.mjs')).size
  const mermaidBytes = statSync(join(scriptsDir, 'deck-mermaid.mjs')).size
  const layoutsBytes = statSync(join(scriptsDir, 'deck-layouts.mjs')).size

  assert.ok(chromeBytes > 10000 && chromeBytes < 110000, 'deck-chrome.mjs 体积应紧凑模块化: ' + chromeBytes)
  assert.ok(diagramsBytes > 20000 && diagramsBytes < 155000, 'deck-diagrams.mjs 体积应受控模块化: ' + diagramsBytes)
  assert.ok(mermaidBytes > 15000 && mermaidBytes < 120000, 'deck-mermaid.mjs 体积应紧凑模块化: ' + mermaidBytes)
  assert.ok(layoutsBytes > 15000 && layoutsBytes < 120000, 'deck-layouts.mjs 入口文件应远低于 120 KB: ' + layoutsBytes)

  const expectedSymbols = [
    'CANVAS_IN', 'EMU_PER_IN', 'EMU_PER_PT', 'EMU_W', 'EMU_H',
    'CORE_LAYOUTS', 'LAYOUT_ALIASES', 'inToEmu', 'ptToEmu', 'boxToEmu', 'boxToCssPct', 'roundRectAdj',
    'escapeXml', 'escapeHtml', 'stripInlineMarkdown', 'cleanRichText', 'parseInlineRuns', 'renderInlineHtml',
    'measureEmWidth', 'computeTextFit', 'normalizeSlideItems', 'resolveEffectiveItems',
    'ooxmlSolidFill', 'ooxmlLinearGradientFill', 'ooxmlRichParagraph', 'ooxmlShape',
    'ooxmlCustGeomShape', 'ooxmlMathShape', 'ooxmlLine', 'ooxmlConnector', 'ooxmlTable',
    'formatSourceLine', 'computeBadgePillWidth', 'getChromeConfig', 'renderSlideChromePptx',
    'parseHarveyValue', 'computeMarimekkoModel', 'computeSankeyLayout', 'partitionValueChainItems', 'computeSwotModel',
    'renderCoreSlidePptx', 'renderCoreSlideHtml', 'LAYOUT_CSS',
    'detectMermaidMode', 'parseMermaidFlowchart', 'layoutMermaidFlowchart',
    'parseMermaidSequence', 'layoutMermaidSequence', 'compileMermaidSlide',
    'renderMermaidPptx', 'renderMermaidHtml',
  ]
  for (const sym of expectedSymbols) {
    assert.notEqual(deckLayouts[sym], undefined, 'deck-layouts.mjs 必须重导出公共符号: ' + sym)
  }

  assert.equal(typeof deckChrome.getChromeConfig, 'function')
  assert.equal(typeof deckChrome.renderSlideChromePptx, 'function')
  assert.equal(typeof deckDiagrams.renderDiagramSlideBodyPptx, 'function')
  assert.equal(typeof deckMermaid.renderMermaidPptx, 'function')
  assert.equal(typeof ooxmlConnector, 'function')

  assert.ok(CORE_LAYOUTS.has('mermaid'))
  assert.deepEqual(LAYOUT_ALIASES.flowchart, { layout: 'mermaid', variant: 'flowchart' })
  assert.deepEqual(LAYOUT_ALIASES.sequence, { layout: 'mermaid', variant: 'sequence' })
})

test('Markdown 围栏 ```mermaid 代码块自动识别与 normalizeSlides 无损保留方括号、花括号与箭头语法', () => {
  const md = [
    '# 云原生网关架构汇报',
    '全链路零信任编排与跨插件引文核验',
    '',
    '## 请求风控决策拓扑',
    '```mermaid',
    'flowchart TD',
    '  A([客户端接入]) --> B{Token 合法?}',
    '  B -->|是| C[[路由网关]]',
    '  B -.->|否| D([拒绝并返回 401])',
    '  C <--> E[(Redis 会话库)]',
    '```',
    '> [!TAKEAWAY] 毫秒级拦截异常流量并保持会话强一致',
    '<!-- source: 网关SRE架构组 -->',
    '<!-- notes: 重点讲解风控分支与 Redis 双活会话。 -->',
    '',
    '## 鉴权与核验时序',
    '```mermaid',
    'sequenceDiagram',
    '  participant Client as Web 客户端',
    '  participant Auth as 鉴权中心',
    '  Client->>+Auth: POST /oauth/token',
    '  Auth-->>-Client: 200 JWT + RefreshToken',
    '```',
  ].join('\n')

  const parsed = parseMarkdownDeck('', md, 'zh')
  assert.equal(parsed.slides.length, 4)
  assert.equal(parsed.slides[0].layout, 'cover')
  assert.equal(parsed.slides[1].layout, 'mermaid')
  assert.equal(parsed.slides[1].variant, 'flowchart')
  assert.match(parsed.slides[1].mermaid, /A\(\[客户端接入\]\) --> B\{Token 合法\?\}/)
  assert.match(parsed.slides[1].mermaid, /C <--> E\[\(Redis 会话库\)\]/)
  assert.equal(parsed.slides[1].takeaway, '毫秒级拦截异常流量并保持会话强一致')
  assert.equal(parsed.slides[1].source, '网关SRE架构组')
  assert.match(parsed.slides[1].notes, /Redis 双活会话/)

  assert.equal(parsed.slides[2].layout, 'mermaid')
  assert.equal(parsed.slides[2].variant, 'sequence')
  assert.match(parsed.slides[2].mermaid, /Client->>\+Auth: POST \/oauth\/token/)
  assert.equal(parsed.slides[3].layout, 'closing')

  // normalizeSlides 支持省略 layout 自动提升、flowchart/sequence 别名以及原样保留特殊符号
  const normalized = normalizeSlides([
    { title: '自动推断页', mermaid: 'flowchart LR\nX[Input & Filter] -->|a > 0| Y((Output))' },
    { layout: 'flowchart', title: '流程图别名页', mermaid: 'graph TB\nM --> N' },
    { layout: 'sequence', title: '时序图别名页', mermaid: 'sequenceDiagram\nA->>B: ping' },
  ])
  assert.equal(normalized[0].layout, 'mermaid')
  assert.equal(normalized[0].mermaid, 'flowchart LR\nX[Input & Filter] -->|a > 0| Y((Output))')
  assert.equal(normalized[1].layout, 'mermaid')
  assert.equal(normalized[1].variant, 'flowchart')
  assert.equal(normalized[2].layout, 'mermaid')
  assert.equal(normalized[2].variant, 'sequence')
})

test('Mode A Flowchart：7 种节点几何、subgraph 簇容器、链式/并发边、回环破环与确定性 Sugiyama 坐标求解', () => {
  const code = `flowchart TD
    %% 初始化与注释应被安全忽略
    Start([入口网关]) --> Pre[[协议解包]]
    subgraph ClusterA [核心推理与存储层]
      Pre --> Check{命中缓存?}
      Check -- 命中 --> Fast((内存直出))
      Check -->|未命中| Work(推理引擎) --> Store[(向量数据库)]
      Work -.->|异步重试| Pre
    end
    Fast & Store ==> Done([响应完成])
    Work <--> Audit[合规审计]`

  assert.equal(detectMermaidMode(code), 'flowchart')
  const ast = parseMermaidFlowchart(code)
  assert.equal(ast.direction, 'TD')
  assert.equal(ast.subgraphs.length, 1)
  assert.equal(ast.subgraphs[0].id, 'ClusterA')
  assert.equal(ast.subgraphs[0].title, '核心推理与存储层')

  const shapeById = Object.fromEntries(ast.nodes.map((n) => [n.id, n.shape]))
  assert.equal(shapeById.Start, 'stadium')
  assert.equal(shapeById.Pre, 'subroutine')
  assert.equal(shapeById.Check, 'diamond')
  assert.equal(shapeById.Fast, 'circle')
  assert.equal(shapeById.Work, 'round')
  assert.equal(shapeById.Store, 'cylinder')
  assert.equal(shapeById.Audit, 'rect')

  // 验证链式边 Work --> Store、并发边 Fast & Store ==> Done、内联标签 -- 命中 --> 与双向边 <-->
  assert.ok(ast.edges.some((e) => e.from === 'Check' && e.to === 'Fast' && e.label === '命中'))
  assert.ok(ast.edges.some((e) => e.from === 'Work' && e.to === 'Store'))
  assert.ok(ast.edges.some((e) => e.from === 'Fast' && e.to === 'Done' && e.thick === true))
  assert.ok(ast.edges.some((e) => e.from === 'Store' && e.to === 'Done' && e.thick === true))
  assert.ok(ast.edges.some((e) => e.from === 'Work' && e.to === 'Pre' && e.dash === 'dash' && e.label === '异步重试'))
  assert.ok(ast.edges.some((e) => e.from === 'Work' && e.to === 'Audit' && e.headArrow === true && e.tailArrow === true))

  const area = { x: 0.62, y: 1.86, w: 12.09, h: 4.22 }
  const layout1 = layoutMermaidFlowchart(ast, area)
  const layout2 = layoutMermaidFlowchart(ast, area)
  assert.deepEqual(layout1, layout2, 'Sugiyama 分层布局必须 100% 确定性幂等')

  for (const node of layout1.nodes) {
    assert.ok(node.fontPt >= 10, `节点 ${node.id} 字号必须 >= 10pt，实际 ${node.fontPt}`)
    assert.ok(node.x >= area.x - 0.01 && node.x + node.w <= area.x + area.w + 0.01, `节点 ${node.id} X 越界`)
    assert.ok(node.y >= area.y - 0.01 && node.y + node.h <= area.y + area.h + 0.01, `节点 ${node.id} Y 越界`)
  }
  for (let i = 0; i < layout1.nodes.length; i += 1) {
    for (let j = i + 1; j < layout1.nodes.length; j += 1) {
      const a = layout1.nodes[i]
      const b = layout1.nodes[j]
      const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
      const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
      assert.ok(overlapX <= 0.01 || overlapY <= 0.01, `节点 ${a.id} 与 ${b.id} 不得发生几何碰撞`)
    }
  }
})

test('Mode A Flowchart 原生 OOXML 校验：真实 <p:sp> 节点 + <p:cxnSp> <a:stCxn>/<a:endCxn> 锚点连接 + HTML SVG 同构', async () => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')

  const slides = normalizeSlides([
    {
      layout: 'mermaid',
      title: 'LR 横向流水线原生连接符校验',
      takeaway: '拖动任意节点框时 PowerPoint 连接线自动跟随移动',
      mermaid: `flowchart LR
        subgraph S1 [接入层]
          A([API 接入]) --> B{鉴权校验}
        end
        B -->|通过| C[[任务编排]]
        B -.->|拒绝| D((告警队列))
        C ==> E[(主数据库)]
        E <--> F[分析看板]`,
    },
    {
      layout: 'mermaid',
      title: 'RL 与 BT 反向流布局校验',
      mermaid: `graph RL
        RightNode([源集群]) --> MidNode{主从切换?}
        MidNode -->|切换| LeftNode[(灾备库)]`,
    },
  ])

  const manifest = { title: 'Mermaid OOXML Flowchart', theme: 'consulting', language: 'zh', motion: true, slides }
  const pptxBuf = buildPptx(manifest, resolveTheme('consulting'), resolveLanguage('zh'))
  const pres = await loadPresentation(pptxBuf)
  assert.deepEqual(validatePresentation(pres).filter((i) => i.severity === 'error'), [])

  const entries = unzipPptxXml(pptxBuf)
  const slide1Xml = entries['ppt/slides/slide1.xml']

  // 提取全部 <p:sp> 的 id 与名称，确认每个节点均生成原生 <p:sp> 且预设几何准确
  const spIdByName = new Map()
  for (const m of slide1Xml.matchAll(/<p:sp><p:nvSpPr><p:cNvPr id="(\d+)" name="([^"]+)"/g)) {
    spIdByName.set(m[2], m[1])
  }
  for (const nid of ['A', 'B', 'C', 'D', 'E', 'F']) {
    assert.ok(spIdByName.has('Mermaid Node ' + nid), '应生成原生节点图形 Mermaid Node ' + nid)
  }
  assert.ok(spIdByName.has('Mermaid Subgraph S1'), '应生成原生 Subgraph 簇容器')
  assert.match(slide1Xml, /prst="flowChartTerminator"/)
  assert.match(slide1Xml, /prst="diamond"/)
  assert.match(slide1Xml, /prst="flowChartPredefinedProcess"/)
  assert.match(slide1Xml, /prst="ellipse"/)
  assert.match(slide1Xml, /prst="can"/)

  // 提取全部 Mermaid Edge <p:cxnSp>，确认每条边均带有真实 <a:stCxn> 与 <a:endCxn> 且指向真实节点 spid
  const edgeConnectors = [...slide1Xml.matchAll(/<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="\d+" name="(Mermaid Edge [^"]+)"\/>([\s\S]*?)<\/p:cxnSp>/g)]
  assert.equal(edgeConnectors.length, 5, '5 条业务边应生成 5 个原生 <p:cxnSp> 连接符')
  for (const [, edgeName, bodyXml] of edgeConnectors) {
    const [, fromId, toId] = /^Mermaid Edge (.+)-(?:>|&gt;)(.+)$/.exec(edgeName)
    const expectedSrcSpid = spIdByName.get('Mermaid Node ' + fromId)
    const expectedDstSpid = spIdByName.get('Mermaid Node ' + toId)
    const stMatch = /<a:stCxn id="(\d+)" idx="(\d+)"\/>/.exec(bodyXml)
    const endMatch = /<a:endCxn id="(\d+)" idx="(\d+)"\/>/.exec(bodyXml)
    assert.ok(stMatch, edgeName + ' 必须包含 <a:stCxn>')
    assert.ok(endMatch, edgeName + ' 必须包含 <a:endCxn>')
    assert.equal(stMatch[1], expectedSrcSpid, edgeName + ' stCxn 必须绑定源节点真实 spid')
    assert.equal(endMatch[1], expectedDstSpid, edgeName + ' endCxn 必须绑定目标节点真实 spid')
    assert.match(bodyXml, /prst="(?:straightConnector1|bentConnector3)"/)
  }

  // 验证边标签位于全部 Mermaid 连接符之后（顶层 Z 序不穿字）
  const lastMermaidEdgePos = slide1Xml.indexOf('name="Mermaid Edge E-&gt;F"')
  const firstLabelPos = slide1Xml.indexOf('name="Mermaid Edge Label ')
  assert.ok(lastMermaidEdgePos > 0 && firstLabelPos > lastMermaidEdgePos, '边标签胶囊必须置于全部连接符上层以防线条穿字')

  const html = renderHtml(manifest, resolveTheme('consulting'), resolveLanguage('zh'))
  assert.match(html, /<svg class="deck-mermaid-svg"/)
  assert.match(html, /data-mermaid-mode="flowchart"/)
  assert.match(html, /data-subgraph="S1"/)
})

test('Mode B SequenceDiagram：参与者/角色、6 种消息箭头、激活条、Note 与 loop/alt/else/opt/par 组合片段原生编译', async () => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')

  const seqCode = `sequenceDiagram
    autonumber
    actor U as 终端用户
    participant G as 统一网关
    participant S as 订单服务
    participant DB as 账务库
    U->>+G: 发起下单请求
    Note over U,G: TLS 1.3 双向认证
    G->S: 内部风控预检
    activate S
    loop 库存锁定重试
      S->>+DB: 预扣减库存
      alt 库存充足
        DB-->>-S: 锁定成功
      else 库存不足
        DB--xS: 返回售罄异常
      end
    end
    opt 开启审计回执
      S--)G: 异步投递审计事件
    end
    S->>S: 计算幂等签名
    deactivate S
    G-->>-U: 返回订单号`

  assert.equal(detectMermaidMode(seqCode), 'sequence')
  const ast = parseMermaidSequence(seqCode)
  assert.equal(ast.participants.length, 4)
  assert.equal(ast.participants[0].kind, 'actor')
  assert.equal(ast.participants[0].label, '终端用户')
  assert.equal(ast.frames.length, 3)
  assert.ok(ast.activations.length >= 3)

  const seqModel = compileMermaidSlide(seqCode)
  assert.equal(seqModel.mode, 'sequence')
  assert.equal(seqModel.messages.length, 8)
  assert.equal(seqModel.notes.length, 1)

  const slides = normalizeSlides([{
    layout: 'sequence',
    title: '核心交易下单与库存核销时序图',
    takeaway: '全量生成顶底参与者框、附着虚线生命线、激活条与组合片段框',
    mermaid: seqCode,
  }])
  const manifest = { title: 'Mermaid Sequence OOXML', theme: 'linear-dark', language: 'zh', motion: true, slides }
  const pptxBuf = buildPptx(manifest, resolveTheme('linear-dark'), resolveLanguage('zh'))
  const pres = await loadPresentation(pptxBuf)
  assert.deepEqual(validatePresentation(pres).filter((i) => i.severity === 'error'), [])

  const slideXml = unzipPptxXml(pptxBuf)['ppt/slides/slide1.xml']
  for (const pid of ['U', 'G', 'S', 'DB']) {
    assert.ok(slideXml.includes('name="Sequence Participant Top ' + pid + '"'))
    assert.ok(slideXml.includes('name="Sequence Participant Bottom ' + pid + '"'))
    assert.ok(slideXml.includes('name="Sequence Lifeline ' + pid + '"'))
  }
  assert.match(slideXml, /name="Sequence Frame LOOP"/)
  assert.match(slideXml, /name="Sequence Frame ALT"/)
  assert.match(slideXml, /name="Sequence Frame OPT"/)
  assert.match(slideXml, /name="Sequence Frame Else 1"/)
  assert.match(slideXml, /name="Sequence Activation act_1"/)
  assert.match(slideXml, /name="Sequence Note 1"[\s\S]*?prst="foldedCorner"/)

  // 生命线必须通过 stCxn(idx=2) 与 endCxn(idx=0) 附着到顶底参与者卡片
  const lifelineMatch = /name="Sequence Lifeline U"\/>([\s\S]*?)<\/p:cxnSp>/.exec(slideXml)
  assert.ok(lifelineMatch)
  assert.match(lifelineMatch[1], /<a:stCxn id="\d+" idx="2"\/><a:endCxn id="\d+" idx="0"\/>/)

  const html = renderHtml(manifest, resolveTheme('linear-dark'), resolveLanguage('zh'))
  assert.match(html, /<svg class="deck-mermaid-svg"/)
  assert.match(html, /data-mermaid-mode="sequence"/)
  assert.match(html, /class="mm-lifeline"/)
  assert.match(html, /class="mm-seq-act"/)
})

test('端到端 buildDeck + LibreOffice 零缺字真实渲染验证（含 --no-optional CI 环境自动守卫）', async (t) => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-mermaid-e2e-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const built = buildDeck({
    outputDir: dir,
    fileName: 'mermaid-e2e',
    title: 'Mermaid Native OOXML E2E',
    theme: 'obsidian-amber',
    lang: 'zh',
    targetMinutes: 6,
    slides: [
      {
        layout: 'cover',
        title: '原生可编辑 Mermaid 架构与时序交付',
        subtitle: '100% OOXML 几何节点与附着连接线',
      },
      {
        layout: 'mermaid',
        title: '高可用智能体执行拓扑',
        takeaway: '深色主题下节点、子图簇与胶囊标签保持高对比度清晰可读',
        mermaid: `flowchart TD
          In([请求接入]) --> Gate[[安全网关]]
          subgraph Engine [执行内核]
            Gate --> Judge{策略路由}
            Judge -->|工具调用| Run[沙箱执行器]
            Judge -->|知识问答| KB[(向量知识库)]
          end
          Run & KB ==> Out([结构化输出])`,
      },
      {
        layout: 'sequence',
        title: '双屏提词与文献核验协同流',
        mermaid: `sequenceDiagram
          actor Speaker as 主讲人
          participant Studio as Workbench
          participant Cite as dsh-cite
          Speaker->>+Studio: 导入研报并开启核验
          Note right of Studio: 自动提取 [@key]
          loop 逐条核验
            Studio->>+Cite: 查询真实 DOI
            Cite-->>-Studio: 返回期刊元数据
          end
          Studio-->>-Speaker: 导出可编辑 PPTX`,
      },
    ],
  })

  assert.equal(built.ok, true)
  assert.deepEqual(Object.keys(built.files).sort(), ['html', 'json', 'pptx'])
  assert.equal(JSON.parse(readFileSync(built.jsonPath, 'utf8')).targetMinutes, 6)

  const pres = await loadPresentation(readFileSync(built.pptxPath))
  assert.deepEqual(validatePresentation(pres).filter((i) => i.severity === 'error'), [])

  const rendered = await renderDeck({
    pptxPath: built.pptxPath,
    outputDir: join(dir, 'lo-out'),
    width: 1280,
  })
  if (rendered.status !== 'unavailable') {
    assert.equal(rendered.ok, true)
    assert.equal(rendered.slideCount, 3)
    assert.deepEqual(rendered.missingFonts, [], 'LibreOffice 渲染 Mermaid 幻灯片必须零缺字')
    for (const pngPath of rendered.pngPaths) {
      assert.equal(existsSync(pngPath), true)
      assert.ok(statSync(pngPath).size > 8000, '渲染 PNG 应包含有效像素内容')
    }
  }
})

test('Flowchart BT 自底向上方向：层级纵坐标严格单调递减且连接站点 outIdx=0 -> inIdx=2', () => {
  const model = compileMermaidSlide('flowchart BT\nLeaf([底层采集]) --> Mid[中台清洗] --> Top([高层驾驶舱])')
  assert.equal(model.direction, 'BT')
  const byId = Object.fromEntries(model.nodes.map((n) => [n.id, n]))
  assert.ok(byId.Leaf.cy > byId.Mid.cy && byId.Mid.cy > byId.Top.cy, 'BT 方向应自底向上排列')
  assert.ok(model.edges.every((e) => e.outIdx === 0 && e.inIdx === 2))
})

test('Flowchart RL 自右向左方向：层级横坐标严格单调递减且连接站点 outIdx=1 -> inIdx=3', () => {
  const model = compileMermaidSlide('graph RL\nSrc([海外源站]) --> Edge[边缘节点] --> Origin[(中心源站)]')
  assert.equal(model.direction, 'RL')
  const byId = Object.fromEntries(model.nodes.map((n) => [n.id, n]))
  assert.ok(byId.Src.cx > byId.Edge.cx && byId.Edge.cx > byId.Origin.cx, 'RL 方向应自右向左排列')
  assert.ok(model.edges.every((e) => e.outIdx === 1 && e.inIdx === 3))
})

test('Flowchart 自环边（A --> A）与无箭头实线/虚线/粗线语法解析', () => {
  const ast = parseMermaidFlowchart('flowchart LR\nA[状态机] -->|自检| A\nA --- B(对端)\nB -.- C[旁路]\nC === D[主干]')
  const selfEdge = ast.edges.find((e) => e.from === 'A' && e.to === 'A')
  assert.ok(selfEdge && selfEdge.label === '自检')
  assert.equal(ast.edges.find((e) => e.to === 'B').tailArrow, false)
  assert.equal(ast.edges.find((e) => e.to === 'C').dash, 'dash')
  assert.equal(ast.edges.find((e) => e.to === 'D').thick, true)
})

test('Flowchart classDef / class / style 自定义节点十六进制色彩与对比度字色推导', () => {
  const code = [
    'flowchart LR',
    '  A[告警节点]:::hot --> B[常驻服务]',
    '  classDef hot fill:#B91C1C,stroke:#7F1D1D',
    '  style B fill:#E0F2FE,stroke:#0284C7,color:#0C4A6E',
  ].join('\n')
  const slides = normalizeSlides([{ layout: 'mermaid', title: '自定义着色', mermaid: code }])
  const xml = unzipPptxXml(buildPptx({ title: 'Styled', slides }, resolveTheme('consulting'), resolveLanguage('zh')))['ppt/slides/slide1.xml']
  assert.match(xml, /val="B91C1C"/)
  assert.match(xml, /val="E0F2FE"/)
  assert.match(xml, /val="0C4A6E"/)
})

test('Flowchart 节点内含引号、& 符号、箭头字符与 <br/> 换行时不误切分边链', () => {
  const ast = parseMermaidFlowchart('flowchart TD\nA["R&D --> Alpha<br/>v2.0"] -- "p < 0.05" --> B{"Score >= 90?"}')
  assert.equal(ast.nodes.length, 2)
  assert.equal(ast.nodes[0].label, 'R&D --> Alpha\nv2.0')
  assert.equal(ast.nodes[1].label, 'Score >= 90?')
  assert.equal(ast.edges.length, 1)
  assert.equal(ast.edges[0].label, 'p < 0.05')
})

test('Flowchart 多子图并列隔离：同层不同 subgraph 节点自动预留外框防碰撞间距', () => {
  const model = compileMermaidSlide(`flowchart TD
    Root([总控入口]) --> A1[计算节点1] & B1[存储节点1]
    subgraph SG_Compute [弹性计算域]
      A1 --> A2[计算节点2]
    end
    subgraph SG_Storage [持久存储域]
      B1 --> B2[(分布式存储)]
    end`)
  assert.equal(model.subgraphs.length, 2)
  const [sg1, sg2] = model.subgraphs
  const overlapX = Math.min(sg1.x + sg1.w, sg2.x + sg2.w) - Math.max(sg1.x, sg2.x)
  assert.ok(overlapX <= 0.02, '并列子图外框在水平方向不得重叠')
})

test('Flowchart cylinder(can) 与 circle(ellipse) 精确映射 ECMA-376 多站点连接索引', () => {
  const slides = normalizeSlides([{
    layout: 'flowchart',
    title: '圆柱与椭圆多站点映射',
    mermaid: 'flowchart LR\nCircle((源点)) --> DB[(主库)] --> Out([终点])',
  }])
  const xml = unzipPptxXml(buildPptx({ title: 'Sites', slides }, resolveTheme('consulting'), resolveLanguage('zh')))['ppt/slides/slide1.xml']
  // ellipse 右侧站点在 ECMA-376 8 站点中为 idx="6"；can 左侧站点为 idx="2"、右侧站点为 idx="4"
  const e1 = /name="Mermaid Edge Circle-&gt;DB"\/>([\s\S]*?)<\/p:cxnSp>/.exec(xml)[1]
  const e2 = /name="Mermaid Edge DB-&gt;Out"\/>([\s\S]*?)<\/p:cxnSp>/.exec(xml)[1]
  assert.match(e1, /<a:stCxn id="\d+" idx="6"\/><a:endCxn id="\d+" idx="2"\/>/)
  assert.match(e2, /<a:stCxn id="\d+" idx="4"\/><a:endCxn id="\d+" idx="1"\/>/)
})

test('ooxmlConnector：竖向 bentConnector3 自动应用 rot=5400000 与正交宽高互换', () => {
  const xml = ooxmlConnector(42, 'Test Vertical Elbow', { x: 2.0, y: 2.0 }, { x: 5.0, y: 3.5 }, {
    preset: 'bentConnector3',
    orientation: 'vertical',
    stCxn: { id: 11, idx: 2 },
    endCxn: { id: 12, idx: 0 },
  })
  assert.match(xml, /rot="5400000"/)
  assert.match(xml, /flipV="1"/)
  assert.match(xml, /<a:stCxn id="11" idx="2"\/><a:endCxn id="12" idx="0"\/>/)
})

test('Markdown ::: mermaid 与 ::: sequence 指令块支持无反引号裸 Mermaid 源码解析', () => {
  const md = [
    '# 指令块测试',
    '',
    '## 裸指令流程图',
    '::: flowchart',
    'flowchart LR',
    '  P[需求评审] --> Q{架构签核} --> R([上线])',
    ':::',
    '',
    '## 裸指令时序图',
    '::: sequence',
    'sequenceDiagram',
    '  Alice->>Bob: 发起评审',
    '  Bob-->>Alice: 评审通过',
    ':::',
  ].join('\n')
  const deck = parseMarkdownDeck('', md, 'zh')
  assert.equal(deck.slides[1].layout, 'mermaid')
  assert.match(deck.slides[1].mermaid, /P\[需求评审\] --> Q\{架构签核\}/)
  assert.equal(deck.slides[2].layout, 'mermaid')
  assert.equal(deck.slides[2].variant, 'sequence')
})

test('Markdown 仅含一级标题与 ```mermaid 代码块时自动提升为独立正文图示页', () => {
  const md = '# 单页极简架构\n\n```mermaid\nflowchart LR\nA([输入]) --> B([输出])\n```'
  const deck = parseMarkdownDeck('', md, 'zh')
  assert.equal(deck.slides.length, 3)
  assert.equal(deck.slides[0].layout, 'cover')
  assert.equal(deck.slides[1].layout, 'mermaid')
  assert.equal(deck.slides[2].layout, 'closing')
})

test('SequenceDiagram Note left of / right of / over 跨参与者批注坐标边界安全', () => {
  const model = compileMermaidSlide(`sequenceDiagram
    participant A as 前端门户
    participant B as 交易中台
    participant C as 清算引擎
    Note left of A: 浏览器指纹采集
    A->>B: 提交订单
    Note over A,C: 全链路 TraceID 透传
    B->>C: 清算指令
    Note right of C: 异步落盘归档`)
  assert.equal(model.notes.length, 3)
  for (const n of model.notes) {
    assert.ok(n.x >= model.areaBox.x && n.x + n.w <= model.areaBox.x + model.areaBox.w, 'Note 卡片不得越出画布安全区')
  }
  assert.ok(model.notes[1].w > model.notes[0].w, '跨参与者 Note over A,C 应宽于单侧批注')
})

test('SequenceDiagram par ... and ... end 并发组合片段与未闭合块容错收敛', () => {
  const model = compileMermaidSlide(`sequenceDiagram
    participant GW as 网关
    participant S1 as 推荐服务
    participant S2 as 风控服务
    par 并发召回与风控
      GW->>S1: 召回候选集
    and 风控实时评分
      GW->>S2: 欺诈评分查询
    end`)
  assert.equal(model.frames.length, 1)
  assert.equal(model.frames[0].kind, 'PAR')
  assert.equal(model.frames[0].dividers.length, 1)
  assert.equal(model.frames[0].dividers[0].kind, 'and')
})

test('SequenceDiagram 未闭合 loop / activate 输入具备确定性容错且通过 OOXML 校验', async () => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')
  const partial = 'sequenceDiagram\nA->>+B: 请求\nloop 重试窗口\nB-->>A: 心跳'
  const slides = normalizeSlides([{ layout: 'sequence', title: '容错测试', mermaid: partial }])
  const buf = buildPptx({ title: 'Resilient', slides }, resolveTheme('consulting'), resolveLanguage('zh'))
  const pres = await loadPresentation(buf)
  assert.deepEqual(validatePresentation(pres).filter((i) => i.severity === 'error'), [])
})

test('空或退化 Mermaid 源码安全回退为可编辑默认节点且零崩溃', async () => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')
  const slides = normalizeSlides([
    { layout: 'mermaid', title: '空流程图兜底', mermaid: 'flowchart TD' },
    { layout: 'sequence', title: '空时序图兜底', mermaid: 'sequenceDiagram' },
  ])
  const buf = buildPptx({ title: 'Fallback', slides }, resolveTheme('swiss'), resolveLanguage('en'))
  const pres = await loadPresentation(buf)
  assert.deepEqual(validatePresentation(pres).filter((i) => i.severity === 'error'), [])
})

test('6 套母版骨架（Chrome Skeletons）全部兼容 Mermaid 版式渲染且单页 spid 唯一', async () => {
  const { loadPresentation, validatePresentation } = await import('@office-kit/pptx')
  const chromes = ['consulting-classic', 'keynote-spatial', 'editorial-folio', 'academic-minimal', 'gov-ceremonial', 'saas-bento']
  const slides = normalizeSlides(chromes.map((chrome, i) => ({
    layout: 'mermaid',
    chrome,
    kicker: 'CHROME ' + (i + 1),
    title: '骨架兼容性 ' + chrome,
    takeaway: '底部结论条与图示区互不遮挡',
    source: '架构测试集',
    mermaid: 'flowchart LR\nA([输入]) --> B{判断} -->|OK| C[(落库)]',
  })))
  const manifest = { title: 'All Chromes Mermaid', theme: 'consulting', language: 'zh', motion: true, slides }
  const buf = buildPptx(manifest, resolveTheme('consulting'), resolveLanguage('zh'))
  const pres = await loadPresentation(buf)
  assert.deepEqual(validatePresentation(pres).filter((i) => i.severity === 'error'), [])

  const entries = unzipPptxXml(buf)
  for (let s = 1; s <= chromes.length; s += 1) {
    const xml = entries['ppt/slides/slide' + s + '.xml']
    const ids = [...xml.matchAll(/<p:cNvPr id="(\d+)"/g)].map((m) => m[1])
    assert.equal(new Set(ids).size, ids.length, `第 ${s} 页 (${chromes[s - 1]}) spid 必须全局唯一`)
  }
})

test('Mermaid HTML SVG 对恶意节点文案与边标签具备完整 XSS 转义防护', () => {
  const slides = normalizeSlides([{
    layout: 'mermaid',
    title: 'XSS 防护',
    mermaid: 'flowchart LR\nA["<script>alert(1)</script>"] -->|"<img src=x onerror=alert(2)>"| B([Safe])',
  }])
  const html = renderHtml({ title: 'XSS Guard', slides }, resolveTheme('data'), resolveLanguage('en'))
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/)
  assert.doesNotMatch(html, /<img src=x onerror=alert\(2\)>/)
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
})

test('高密度 12 节点多分支流程图仍严格收敛在画布安全区内且字号 >= 10pt', () => {
  const dense = [
    'flowchart TD',
    '  N1([接入]) --> N2[解析] --> N3{分流}',
    '  N3 -->|A| N4[分支1] --> N7[汇聚前1]',
    '  N3 -->|B| N5[分支2] --> N8[汇聚前2]',
    '  N3 -->|C| N6[分支3] --> N9[汇聚前3]',
    '  N7 & N8 & N9 --> N10{终审}',
    '  N10 -->|通过| N11[(归档库)] --> N12([完成])',
  ].join('\n')
  const area = { x: 0.62, y: 1.80, w: 12.09, h: 4.28 }
  const model = compileMermaidSlide(dense, area)
  assert.equal(model.nodes.length, 12)
  for (const n of model.nodes) {
    assert.ok(n.fontPt >= 10)
    assert.ok(n.y >= area.y - 0.01 && n.y + n.h <= area.y + area.h + 0.01, `高密度节点 ${n.id} 纵向不得越出安全框`)
  }
})

test('buildDeck 支持 onePager: true 按需落盘且保持默认 files 三键契约不变', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-onepager-opt-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const res = buildDeck({
    outputDir: dir,
    fileName: 'exec-brief',
    title: '高管简报测试',
    onePager: true,
    handout: true,
    slides: [
      { layout: 'cover', title: '高管简报测试', subtitle: 'Q4 经营复盘' },
      { layout: 'mermaid', title: '核心业务链路', mermaid: 'flowchart LR\nA([获客]) --> B([转化]) --> C([留存])' },
    ],
  })
  assert.deepEqual(Object.keys(res.files).sort(), ['html', 'json', 'pptx'])
  assert.ok(res.onePagerPath && existsSync(res.onePagerPath))
  assert.ok(res.handoutPath && existsSync(res.handoutPath))
})

test('Round-1 视觉回归：Mermaid HTML 终点 stadium 对比度保护与 SVG 容器防溢出', () => {
  const slides = normalizeSlides([{
    layout: 'mermaid',
    title: '端到端编排链路',
    takeaway: '底部结论条不得被流程图覆盖',
    mermaid: 'flowchart LR\nStart([请求接入]) --> Core[核心调度] --> End([高保真交付])',
  }])
  const html = renderHtml({ title: 'Mermaid Contrast', slides }, resolveTheme('consulting'), resolveLanguage('zh'))
  assert.match(html, /\.mm-node\.is-sink:not\(\.mm-shape-stadium\):not\(\.is-root\)/)
  assert.match(html, /\.mermaid-board\{[^}]*overflow:hidden/)
  assert.match(html, /svg\.deck-mermaid-svg\{[^}]*height:100%;max-height:100%/)
})

test('Round-1 视觉回归：LR 互斥兄弟子图外框严格不相交且边标签不遮挡节点', () => {
  const code = [
    'flowchart LR',
    '  subgraph Gate [接入与安全网关]',
    '    Client([客户端 SDK 接入]) --> Auth[边缘网关鉴权] --> Check{配额与风控}',
    '    Check -.->|超限拦截| Reject([返回 429 降级])',
    '  end',
    '  subgraph Core [智能编排与推理内核]',
    '    Check -->|放行| Router[[语义路由与负载均衡]] --> Worker[多模型推理池]',
    '    Worker <-->|毫秒读写| Cache[(分布式 KV 缓存)]',
    '  end',
    '  Worker ==> Out([签发高保真交付物])',
  ].join('\n')
  const model = compileMermaidSlide(code)
  const sgById = Object.fromEntries(model.subgraphs.map((s) => [s.id, s]))
  assert.ok(sgById.Gate && sgById.Core)
  assert.ok(
    sgById.Gate.x + sgById.Gate.w <= sgById.Core.x + 0.02,
    `兄弟子图 Gate (right=${(sgById.Gate.x + sgById.Gate.w).toFixed(2)}) 不得侵入 Core (left=${sgById.Core.x.toFixed(2)})`,
  )
  const rejectEdge = model.edges.find((e) => e.label === '超限拦截')
  assert.ok(rejectEdge && rejectEdge.labelBox)
})

test('Round-1 视觉回归：Sequence Diagram 长 Note 自动换行且与下条消息留出安全净空', () => {
  const code = [
    'sequenceDiagram',
    '  autonumber',
    '  actor U as 业务负责人',
    '  participant S as 工作台',
    '  participant E as 引擎',
    '  U->>+S: 提交经营数据与讲稿要求',
    '  Note over S,E: 一键导出高管一页纸与 Remotion 视频分镜包并核验时长预算',
    '  S->>+E: 触发双端同构编译',
    '  E-->>-S: 返回可编辑 PPTX 与 HTML',
    '  S-->>-U: 交付成品',
  ].join('\n')
  const model = compileMermaidSlide(code)
  assert.equal(model.notes.length, 1)
  const note = model.notes[0]
  const nextMsg = model.messages.find((m) => m.text.includes('触发双端同构编译'))
  assert.ok(nextMsg)
  assert.ok(
    nextMsg.y - 0.26 >= note.y + note.h + 0.04,
    `下条消息标签底边 (${(nextMsg.y - 0.26).toFixed(3)}) 须在 Note 底边 (${(note.y + note.h).toFixed(3)}) 下方`,
  )
  const slides = normalizeSlides([{ layout: 'sequence', title: '时序协同', mermaid: code }])
  const html = renderHtml({ title: 'Seq Note', slides }, resolveTheme('consulting'), resolveLanguage('zh'))
  assert.match(html, /<text class="mm-note-txt"[^>]*><tspan/)
})

test('Round-1 视觉回归：callout(formula) 仅渲染显式 bullets 且不重复 caption 或截断前缀', () => {
  const slides = normalizeSlides([{
    layout: 'callout',
    variant: 'formula',
    title: '缩放点积注意力公式',
    formula: '\\text{Attention}(Q,K,V)=\\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V',
    text: '在长上下文场景下通过根号维度缩放避免梯度饱和并稳定数值分布',
    bullets: ['采用原生 Office Math (OMML) 与 W3C MathML 双端同构输出，确保零乱码'],
  }])
  const html = renderHtml({ title: 'Formula Callout', slides }, resolveTheme('consulting'), resolveLanguage('zh'))
  const captionMatches = html.match(/避免梯度饱和并稳定数值分布/g) ?? []
  assert.equal(captionMatches.length, 1, 'formula caption 不得重复出现在下方列表项中')
  assert.doesNotMatch(html, /采用原生 Office Math…/, '无冒号/加粗前缀的 callout 要点不得被截断成省略号标题')
})



import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { buildDeck } from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { computeTextFit } from '../skills/dsh-ppt/scripts/deck-chrome.mjs'
import { layoutMermaidFlowchart, renderMermaidHtml } from '../skills/dsh-ppt/scripts/deck-mermaid.mjs'

function readZipEntryText(buf, entryName) {
  let pos = 0
  while (pos < buf.length - 30) {
    if (buf.readUInt32LE(pos) !== 0x04034b50) break
    const comp = buf.readUInt16LE(pos + 8)
    const cSize = buf.readUInt32LE(pos + 18)
    const nLen = buf.readUInt16LE(pos + 26)
    const eLen = buf.readUInt16LE(pos + 28)
    const name = buf.subarray(pos + 30, pos + 30 + nLen).toString('utf8')
    const dataStart = pos + 30 + nLen + eLen
    if (name === entryName) {
      const raw = buf.subarray(dataStart, dataStart + cSize)
      return (comp === 8 ? inflateRawSync(raw) : raw).toString('utf8')
    }
    pos = dataStart + cSize
  }
  return ''
}

test('v1.0.0: HTML removes Latin-only ch max-width traps and adapts CJK & Western typography', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v100-cjk-'))
  try {
    const zhBuilt = buildDeck({
      title: '当智能体成为组织，而不是工具',
      theme: 'stripe-craft',
      lang: 'zh',
      outputDir: dir,
      baseName: 'zh-cjk',
      slides: [
        { layout: 'cover', variant: 'keynote-glow', kicker: '2026 白皮书', title: '当智能体成为组织，而不是工具', subtitle: '让 1,000 个专业智能体像一个团队协作' },
        { layout: 'statement', title: '瓶颈已从单个模型多聪明转移到一堆智能体能否对齐' },
        { layout: 'bullets', title: '交付周期从 16 天压缩到 3.5 天，四项协作改造贡献了全部降幅', bullets: ['任务自动拆解缩短人工排期等待时间', '共享记忆减少跨角色重复上下文切换'] },
      ],
    })
    const zhHtml = readFileSync(zhBuilt.files.html, 'utf8')

    assert.match(zhHtml, /<html lang="zh-CN">/)
    assert.doesNotMatch(zhHtml, /max-width:\s*(?:22|24|26|28|34|52|64)ch\b/, 'Latin-only ch caps must be removed')
    assert.match(zhHtml, /:is\(html:lang\(zh\),html:lang\(ja\),html:lang\(ko\)\)\s+\.slide-header h2/)
    assert.match(zhHtml, /line-break:strict/)
    assert.match(zhHtml, /text-wrap:balance/)
    assert.match(zhHtml, /\.slide-header h2\{[^}]*max-width:100%/)

    const enBuilt = buildDeck({
      title: 'Agent Mesh Architecture',
      theme: 'stripe-craft',
      lang: 'en',
      outputDir: dir,
      baseName: 'en-west',
      slides: [
        { layout: 'cover', variant: 'keynote-glow', kicker: '2026 WHITEPAPER', title: 'When Agents Become an Organization', subtitle: 'Coordinating 1,000 specialists as one team' },
        { layout: 'bullets', title: 'Four orchestration upgrades cut delivery lead time by 78%', bullets: ['Task decomposition', 'Shared semantic memory'] },
      ],
    })
    const enHtml = readFileSync(enBuilt.files.html, 'utf8')
    assert.match(enHtml, /<html lang="en-US">/)
    assert.match(enHtml, /max-width:min\(100%,20em\)/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v1.0.0: PPTX & HTML code slides use exact <a:spcPts> line spacing, CJK column width, and zero overflow up to 22 lines', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v100-code-'))
  try {
    const yaml12 = [
      'agent:',
      '  name: contract-reviewer',
      '  role: 法务 · 合同风险审阅',
      '  model: reasoning-high',
      '  memory: shared.legal-corpus',
      '  tools: [retrieve, redline, compare]',
      '  guardrails:',
      '    - block_on: [missing_liability_clause]',
      '    - escalate_to: human.legal-lead',
      '  sla: { p95_seconds: 45, max_cost: 0.12 }',
      '  retry: { attempts: 2, on: [timeout, schema_mismatch] }',
      '  audit: append_only',
    ].join('\n')

    const yaml22 = Array.from({ length: 22 }, (_, i) => `  step_${String(i + 1).padStart(2, '0')}: 协作校验节点_${i + 1} # timeout=45s`).join('\n')

    const built = buildDeck({
      title: 'Code Overflow Regression',
      theme: 'stripe-craft',
      lang: 'zh',
      outputDir: dir,
      baseName: 'code-check',
      slides: [
        {
          layout: 'code',
          title: '一个专业智能体，只需要 12 行声明式配置就能进入编排',
          language: 'yaml',
          filename: 'agents/contract-reviewer.yaml',
          code: yaml12,
          takeaway: '声明式定义让智能体可审查、可版本化、可回滚。',
        },
        {
          layout: 'code',
          title: '22 行高密度中英混排配置同样不溢出暗色代码窗',
          language: 'yaml',
          filename: 'agents/pipeline-22.yaml',
          code: yaml22,
          takeaway: '即使 22 行也严格收束在圆角窗口内部。',
        },
      ],
    })

    const html = readFileSync(built.files.html, 'utf8')
    assert.match(html, /--code-fs:\d+(?:\.\d+)?px;--code-lh:\d+(?:\.\d+)?/)
    assert.match(html, /\.code-window\{[^}]*min-height:0/)

    const pptxBuf = readFileSync(built.files.pptx)
    for (const [slideIdx, expectedLines] of [[1, 12], [2, 22]]) {
      const xml = readZipEntryText(pptxBuf, `ppt/slides/slide${slideIdx}.xml`)
      const shellMatch = xml.match(/name="Code Window Shell"[\s\S]*?<a:ext cx="\d+" cy="(\d+)"/)
      const contentMatch = xml.match(/name="Code Content"[\s\S]*?<a:off x="\d+" y="(\d+)"\/><a:ext cx="\d+" cy="(\d+)"[\s\S]*?<\/p:sp>/)
      assert.ok(shellMatch && contentMatch, `slide ${slideIdx} must emit Code Window Shell and Code Content`)

      const contentXml = contentMatch[0]
      const contentHPt = Number(contentMatch[2]) / 12700
      assert.doesNotMatch(contentXml, /<a:spcPct\b/, `slide ${slideIdx} code must NOT use renderer-drifting <a:spcPct>`)

      const spcMatches = [...contentXml.matchAll(/<a:spcPts val="(\d+)"\/>/g)]
      assert.equal(spcMatches.length, expectedLines, `slide ${slideIdx} must emit ${expectedLines} <a:spcPts> paragraphs`)
      const lineHPt = Number(spcMatches[0][1]) / 100
      const totalCodeHPt = lineHPt * expectedLines
      assert.ok(
        totalCodeHPt <= contentHPt,
        `slide ${slideIdx}: totalCodeH (${totalCodeHPt.toFixed(1)}pt) must fit within Code Content box (${contentHPt.toFixed(1)}pt)`,
      )
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v1.0.0: computeTextFit applies subtle CJK vertical safety for dense multi-line Chinese blocks without shrinking single-line titles', () => {
  const singleTitle = computeTextFit('四层参考架构：把谁来决定和怎么执行彻底分开', { w: 12.09, h: 0.95 }, 'slideTitle')
  assert.equal(singleTitle.lines, 1)
  assert.equal(singleTitle.fontPt, 27)

  const denseCjk = computeTextFit(
    ['第一条较长的中文业务治理规则说明用于验证多行行高余量', '第二条较长的中文业务治理规则说明用于验证多行行高余量', '第三条较长的中文业务治理规则说明用于验证多行行高余量'],
    { w: 4.5, h: 1.55 },
    'cardBody',
  )
  assert.ok(denseCjk.lines >= 3)
  assert.ok(denseCjk.fontPt <= 15)
})

test('v1.0.0: Mermaid flowchart LR & TD back-edges route via outer U-channels with zero intermediate node crossings', () => {
  const lrSrc = [
    'flowchart LR',
    '  A[需求进入] --> B[目标拆解] --> C[能力匹配] --> D[并行执行] --> E[结果校验]',
    '  E -->|不通过| F[异常诊断] --> G[重试策略]',
    '  G -->|自动回流| D',
    '  E -->|通过| H[集成上线] --> I[写入记忆]',
    '  I -->|经验沉淀| B',
  ].join('\n')

  const model = layoutMermaidFlowchart(lrSrc, { x: 0.62, y: 1.86, w: 12.09, h: 4.4 })
  const backEdges = model.edges.filter((e) => (e.from === 'G' && e.to === 'D') || (e.from === 'I' && e.to === 'B'))
  assert.equal(backEdges.length, 2, 'both feedback back-edges must be present')

  for (const edge of backEdges) {
    assert.equal(edge.connectorPreset, 'routedPolyline')
    assert.ok(Array.isArray(edge.waypoints) && edge.waypoints.length === 4, `${edge.from}->${edge.to} must route via 4 U-channel waypoints`)
    const chanY = edge.waypoints[1].y
    const minX = Math.min(edge.waypoints[1].x, edge.waypoints[2].x)
    const maxX = Math.max(edge.waypoints[1].x, edge.waypoints[2].x)
    for (const node of model.nodes) {
      if (node.id === edge.from || node.id === edge.to) continue
      const overlapsX = node.x < maxX - 0.02 && node.x + node.w > minX + 0.02
      const hitsY = chanY >= node.y - 0.02 && chanY <= node.y + node.h + 0.02
      assert.ok(!(overlapsX && hitsY), `back-edge ${edge.from}->${edge.to} channelY=${chanY} must NOT cross node ${node.id} [${node.y}, ${node.y + node.h}]`)
    }
  }
  assert.notEqual(backEdges[0].outIdx, backEdges[1].outIdx, 'upper & lower feedback loops should separate into top and bottom channels')

  const svg = renderMermaidHtml({ layout: 'mermaid', title: '编排回路', mermaid: lrSrc }, 0)
  assert.match(svg, /<path[^>]*d="M [^"]*Q [^"]*Q /, 'SVG should draw rounded-corner U-channel paths for back-edges')

  const tdSrc = [
    'flowchart TD',
    '  S[开始] --> P[规划] --> X[执行] --> V[校验]',
    '  V -->|重试| P',
  ].join('\n')
  const tdModel = layoutMermaidFlowchart(tdSrc, { x: 0.62, y: 1.86, w: 12.09, h: 4.4 })
  const tdBack = tdModel.edges.find((e) => e.from === 'V' && e.to === 'P')
  assert.ok(tdBack && tdBack.waypoints?.length === 4, 'TD back-edge should route via 4-point side U-channel')
})

test('routed Mermaid feedback connectors stay attached to their PowerPoint nodes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-mermaid-anchors-'))
  try {
    const built = buildDeck({
      title: 'Feedback routing',
      theme: 'stripe-craft',
      outputDir: dir,
      slides: ['LR', 'TD'].map(direction => ({
        layout: 'mermaid',
        title: direction + ' workflow',
        mermaid: [
          'flowchart ' + direction,
          '  A[Start] --> B[Plan] --> C[Build] --> D[Review] --> E[Release]',
          '  D -->|Revise| B',
        ].join('\n'),
      })),
    })
    const pptx = readFileSync(built.files.pptx)
    for (const page of [1, 2]) {
      const xml = readZipEntryText(pptx, 'ppt/slides/slide' + page + '.xml')
      const sourceId = /<p:cNvPr id="(\d+)" name="Mermaid Node D"/.exec(xml)?.[1]
      const targetId = /<p:cNvPr id="(\d+)" name="Mermaid Node B"/.exec(xml)?.[1]
      assert.ok(sourceId && targetId)
      const segments = [...xml.matchAll(/name="Mermaid Edge D-&gt;B Seg [123]"\/>([\s\S]*?)<\/p:cxnSp>/g)]
      assert.equal(segments.length, 3)
      assert.match(segments[0][1], new RegExp('<a:stCxn id="' + sourceId + '" idx="[0-3]"/>'))
      assert.doesNotMatch(segments[0][1], /<a:endCxn\b/)
      assert.doesNotMatch(segments[1][1], /<a:(?:stCxn|endCxn)\b/)
      assert.doesNotMatch(segments[2][1], /<a:stCxn\b/)
      assert.match(segments[2][1], new RegExp('<a:endCxn id="' + targetId + '" idx="[0-3]"/>'))
      assert.match(segments[2][1], /<a:tailEnd type="triangle"/)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

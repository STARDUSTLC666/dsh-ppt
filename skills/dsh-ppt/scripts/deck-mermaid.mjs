/**
 * deck-mermaid.mjs —— dsh-ppt 的零依赖确定性 Mermaid 编译器：
 * 支持 Mode A（flowchart / graph TD/TB/BT/LR/RL，含 7+ 节点几何、subgraph 簇容器、链式/并发边与多线型标签）
 * 与 Mode B（sequenceDiagram，含 participant/actor、同步/异步/返回/终止消息、activate 激活条、Note 与 alt/loop/opt/par 组合片段）。
 *
 * 双后端同构输出：
 *   1. PPTX：100% 原生可编辑 PowerPoint 几何图形 <p:sp> 与真实锚点附着连接线 <p:cxnSp>（<a:stCxn> / <a:endCxn>，0=top,1=left,2=bottom,3=right）
 *   2. HTML：语义化响应式主题自适应矢量图 <svg class="deck-mermaid-svg">
 *
 * 零外部运行时依赖，仅使用 Node 内置模块。
 */

import { mixHex, relativeLuminance } from './deck-themes.mjs'
import {
  roundRectAdj,
  escapeXml,
  escapeHtml,
  stripInlineMarkdown,
  measureEmWidth,
  computeTextFit,
  ooxmlRichParagraph,
  ooxmlShape,
  ooxmlLine,
  ooxmlConnector,
} from './deck-chrome.mjs'

// ---------------------------------------------------------------------------
// 1. 源码提取与模式自动识别
// ---------------------------------------------------------------------------

export function extractMermaidSource(slideOrText) {
  let raw = ''
  if (typeof slideOrText === 'string') {
    raw = slideOrText
  } else if (slideOrText && typeof slideOrText === 'object') {
    raw = typeof slideOrText.mermaid === 'string' && slideOrText.mermaid.trim() !== ''
      ? slideOrText.mermaid
      : typeof slideOrText.text === 'string'
        ? slideOrText.text
        : ''
  }
  let text = String(raw ?? '').replace(/\r\n?/g, '\n').trim()
  const fenceMatch = /^(`{3,}|~{3,})\s*(?:mermaid)?[ \t]*\n([\s\S]*?)\n\1\s*$/i.exec(text)
  if (fenceMatch) {
    text = fenceMatch[2].trim()
  }
  // 移除 %%{init: ...}%% 指令块与整行 %% 注释
  text = text.replace(/%%\{[\s\S]*?\}%%/g, '')
  const cleanedLines = text
    .split('\n')
    .map((ln) => ln.replace(/\s*%%.*$/, ''))
    .filter((ln) => ln.trim() !== '')
  return cleanedLines.join('\n').trim()
}

export function detectMermaidMode(slideOrText, fallbackVariant = '') {
  const src = extractMermaidSource(slideOrText)
  const firstLine = (src.split('\n')[0] ?? '').trim()
  if (/^sequenceDiagram\b/i.test(firstLine)) return 'sequence'
  if (/^(?:flowchart|graph)\b/i.test(firstLine)) return 'flowchart'
  const v = String(fallbackVariant ?? '').trim().toLowerCase()
  if (v === 'sequence' || v === 'sequencediagram') return 'sequence'
  if (/(?:^|\n)\s*(?:participant|actor)\s+\S+/i.test(src) || /--?>>/.test(src)) return 'sequence'
  return 'flowchart'
}

// ---------------------------------------------------------------------------
// 2. Mode A：Mermaid Flowchart / Graph 词法与语法解析器
// ---------------------------------------------------------------------------

function unquoteMermaidText(raw) {
  let s = String(raw ?? '').trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1)
  }
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\n/g, '\n')
    .split('\n')
    .map((part) =>
      part
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n')
}

function splitTopLevelStatements(sourceText) {
  const out = []
  for (const rawLine of sourceText.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    let cur = ''
    let quote = null
    let sq = 0
    let pr = 0
    let cu = 0
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (quote) {
        cur += ch
        if (ch === quote && line[i - 1] !== '\\') quote = null
        continue
      }
      if (ch === '"' || ch === "'") {
        quote = ch
        cur += ch
        continue
      }
      if (ch === '[') sq += 1
      else if (ch === ']') sq = Math.max(0, sq - 1)
      else if (ch === '(') pr += 1
      else if (ch === ')') pr = Math.max(0, pr - 1)
      else if (ch === '{') cu += 1
      else if (ch === '}') cu = Math.max(0, cu - 1)
      if (ch === ';' && sq === 0 && pr === 0 && cu === 0) {
        if (cur.trim()) out.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    if (cur.trim()) out.push(cur.trim())
  }
  return out
}

function splitParallelAmpersand(groupStr) {
  const parts = []
  let cur = ''
  let quote = null
  let sq = 0
  let pr = 0
  let cu = 0
  for (let i = 0; i < groupStr.length; i += 1) {
    const ch = groupStr[i]
    if (quote) {
      cur += ch
      if (ch === quote && groupStr[i - 1] !== '\\') quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      cur += ch
      continue
    }
    if (ch === '[') sq += 1
    else if (ch === ']') sq = Math.max(0, sq - 1)
    else if (ch === '(') pr += 1
    else if (ch === ')') pr = Math.max(0, pr - 1)
    else if (ch === '{') cu += 1
    else if (ch === '}') cu = Math.max(0, cu - 1)
    if (ch === '&' && sq === 0 && pr === 0 && cu === 0) {
      if (cur.trim()) parts.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

const EDGE_INLINE_PATTERNS = [
  { re: /^<--\s*("[^"\n]+"|'[^'\n]+'|[^-\n]+?)\s*-->/, headArrow: true, tailArrow: true, dash: '', thick: false },
  { re: /^<==\s*("[^"\n]+"|'[^'\n]+'|[^=\n]+?)\s*==>/, headArrow: true, tailArrow: true, dash: '', thick: true },
  { re: /^<-\.\s*([\s\S]+?)\s*\.->/, headArrow: true, tailArrow: true, dash: 'dash', thick: false },
  { re: /^-\.\s*([\s\S]+?)\s*\.->/, headArrow: false, tailArrow: true, dash: 'dash', thick: false },
  { re: /^-\.\s*([\s\S]+?)\s*-\.-/, headArrow: false, tailArrow: false, dash: 'dash', thick: false },
  { re: /^==\s*("[^"\n]+"|'[^'\n]+'|[^=\n]+?)\s*==>/, headArrow: false, tailArrow: true, dash: '', thick: true },
  { re: /^==\s*("[^"\n]+"|'[^'\n]+'|[^=\n]+?)\s*===/, headArrow: false, tailArrow: false, dash: '', thick: true },
  { re: /^--\s*("[^"\n]+"|'[^'\n]+'|[^-=><|\n]+?)\s*-->/, headArrow: false, tailArrow: true, dash: '', thick: false },
  { re: /^--\s*("[^"\n]+"|'[^'\n]+'|[^-=><|\n]+?)\s*---/, headArrow: false, tailArrow: false, dash: '', thick: false },
]

const EDGE_DIRECT_PATTERNS = [
  { re: /^<-\.+->/, headArrow: true, tailArrow: true, dash: 'dash', thick: false },
  { re: /^<==+>/, headArrow: true, tailArrow: true, dash: '', thick: true },
  { re: /^<--+>/, headArrow: true, tailArrow: true, dash: '', thick: false },
  { re: /^-\.+->/, headArrow: false, tailArrow: true, dash: 'dash', thick: false },
  { re: /^-\.+-/, headArrow: false, tailArrow: false, dash: 'dash', thick: false },
  { re: /^==+>/, headArrow: false, tailArrow: true, dash: '', thick: true },
  { re: /^===+/, headArrow: false, tailArrow: false, dash: '', thick: true },
  { re: /^--+>/, headArrow: false, tailArrow: true, dash: '', thick: false },
  { re: /^---+/, headArrow: false, tailArrow: false, dash: '', thick: false },
]

function matchEdgeOperatorAt(str, pos) {
  const slice = str.slice(pos)
  for (const pat of EDGE_INLINE_PATTERNS) {
    const m = pat.re.exec(slice)
    if (m) {
      return {
        length: m[0].length,
        edge: {
          headArrow: pat.headArrow,
          tailArrow: pat.tailArrow,
          dash: pat.dash,
          thick: pat.thick,
          label: unquoteMermaidText(m[1]),
        },
      }
    }
  }
  for (const pat of EDGE_DIRECT_PATTERNS) {
    const m = pat.re.exec(slice)
    if (m) {
      let consumed = m[0].length
      let label = ''
      const after = slice.slice(consumed)
      const pipeMatch = /^\s*\|\s*([^|]*?)\s*\|/.exec(after)
      if (pipeMatch) {
        consumed += pipeMatch[0].length
        label = unquoteMermaidText(pipeMatch[1])
      }
      return {
        length: consumed,
        edge: {
          headArrow: pat.headArrow,
          tailArrow: pat.tailArrow,
          dash: pat.dash,
          thick: pat.thick,
          label,
        },
      }
    }
  }
  return null
}

function tokenizeFlowChain(stmt) {
  const nodeGroups = []
  const edgeOps = []
  let cur = ''
  let quote = null
  let sq = 0
  let pr = 0
  let cu = 0
  let i = 0
  while (i < stmt.length) {
    const ch = stmt[i]
    if (quote) {
      cur += ch
      if (ch === quote && stmt[i - 1] !== '\\') quote = null
      i += 1
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      cur += ch
      i += 1
      continue
    }
    if (ch === '[') { sq += 1; cur += ch; i += 1; continue }
    if (ch === ']') { sq = Math.max(0, sq - 1); cur += ch; i += 1; continue }
    if (ch === '(') { pr += 1; cur += ch; i += 1; continue }
    if (ch === ')') { pr = Math.max(0, pr - 1); cur += ch; i += 1; continue }
    if (ch === '{') { cu += 1; cur += ch; i += 1; continue }
    if (ch === '}') { cu = Math.max(0, cu - 1); cur += ch; i += 1; continue }

    if (sq === 0 && pr === 0 && cu === 0 && (ch === '-' || ch === '=' || ch === '<')) {
      const hit = matchEdgeOperatorAt(stmt, i)
      if (hit && cur.trim() !== '') {
        nodeGroups.push(cur.trim())
        edgeOps.push(hit.edge)
        cur = ''
        i += hit.length
        continue
      }
    }
    cur += ch
    i += 1
  }
  if (cur.trim() !== '') nodeGroups.push(cur.trim())
  return { nodeGroups, edgeOps }
}

function parseNodeToken(rawToken) {
  let token = String(rawToken ?? '').trim()
  if (!token) return null
  let className = ''
  const clsMatch = /^(.*?):::([A-Za-z0-9_-]+)\s*$/.exec(token)
  if (clsMatch) {
    token = clsMatch[1].trim()
    className = clsMatch[2].trim()
  }
  const idMatch = /^([A-Za-z0-9_\u4E00-\u9FFF.-]+)\s*([\s\S]*)$/.exec(token)
  if (!idMatch) return null
  const id = idMatch[1]
  const rest = idMatch[2].trim()
  if (!rest) return { id, shape: null, label: null, className }

  const shapeRules = [
    { re: /^\(\[([\s\S]*)\]\)$/, shape: 'stadium' },
    { re: /^\[\(([\s\S]*)\)\]$/, shape: 'cylinder' },
    { re: /^\[\[([\s\S]*)\]\]$/, shape: 'subroutine' },
    { re: /^\(\(\(([\s\S]*)\)\)\)$/, shape: 'circle' },
    { re: /^\(\(([\s\S]*)\)\)$/, shape: 'circle' },
    { re: /^\{\{([\s\S]*)\}\}$/, shape: 'hexagon' },
    { re: /^\{([\s\S]*)\}$/, shape: 'diamond' },
    { re: /^\(([\s\S]*)\)$/, shape: 'round' },
    { re: /^\[\/([\s\S]*)\/\]$/, shape: 'parallelogram' },
    { re: /^\[([\s\S]*)\]$/, shape: 'rect' },
  ]
  for (const rule of shapeRules) {
    const m = rule.re.exec(rest)
    if (m) {
      return {
        id,
        shape: rule.shape,
        label: unquoteMermaidText(m[1]) || id,
        className,
      }
    }
  }
  return { id, shape: 'rect', label: unquoteMermaidText(rest) || id, className }
}

function parseStyleProps(styleStr) {
  const out = {}
  for (const part of String(styleStr ?? '').split(',')) {
    const kv = /^([a-zA-Z-]+)\s*:\s*(.+)$/.exec(part.trim())
    if (!kv) continue
    const k = kv[1].toLowerCase()
    const v = kv[2].trim()
    if ((k === 'fill' || k === 'stroke' || k === 'color') && /^#[0-9a-fA-F]{3,6}$/.test(v)) {
      out[k] = v.length === 4 ? '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3] : v.slice(0, 7).toUpperCase()
    }
  }
  return out
}

export function parseMermaidFlowchart(slideOrText) {
  const src = extractMermaidSource(slideOrText)
  const statements = splitTopLevelStatements(src)
  let direction = 'TD'
  const nodesMap = new Map()
  const edges = []
  const subgraphs = []
  const subgraphById = new Map()
  const subgraphStack = []
  const classDefs = new Map()
  const nodeStyles = new Map()
  let sgAutoIdx = 0

  const upsertNode = (parsed) => {
    if (!parsed || !parsed.id) return null
    const activeSg = subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1] : null
    let existing = nodesMap.get(parsed.id)
    if (!existing) {
      existing = {
        id: parsed.id,
        label: parsed.label || parsed.id,
        shape: parsed.shape || 'rect',
        subgraphId: activeSg ? activeSg.id : null,
        className: parsed.className || '',
        order: nodesMap.size,
      }
      nodesMap.set(parsed.id, existing)
    } else {
      if (parsed.label) existing.label = parsed.label
      if (parsed.shape) existing.shape = parsed.shape
      if (parsed.className) existing.className = parsed.className
      if (!existing.subgraphId && activeSg) existing.subgraphId = activeSg.id
    }
    if (activeSg && existing.subgraphId === activeSg.id) {
      for (const sg of subgraphStack) {
        if (!sg.nodeIds.includes(parsed.id)) sg.nodeIds.push(parsed.id)
      }
    }
    return existing
  }

  statements.forEach((stmt, idx) => {
    if (idx === 0) {
      const headMatch = /^(?:flowchart|graph)(?:\s+(TD|TB|BT|LR|RL))?\s*$/i.exec(stmt)
      if (headMatch) {
        const dir = (headMatch[1] || 'TD').toUpperCase()
        direction = dir === 'TB' ? 'TD' : dir
        return
      }
      const inlineHead = /^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\s+([\s\S]+)$/i.exec(stmt)
      if (inlineHead) {
        const dir = inlineHead[1].toUpperCase()
        direction = dir === 'TB' ? 'TD' : dir
        stmt = inlineHead[2].trim()
      }
    }

    if (/^direction\s+(?:TD|TB|BT|LR|RL)\s*$/i.test(stmt)) return
    if (/^(?:linkStyle|click)\b/i.test(stmt)) return

    const classDefMatch = /^classDef\s+([A-Za-z0-9_-]+)\s+(.+)$/i.exec(stmt)
    if (classDefMatch) {
      classDefs.set(classDefMatch[1], parseStyleProps(classDefMatch[2]))
      return
    }
    const classAssignMatch = /^class\s+([^\s]+)\s+([A-Za-z0-9_-]+)\s*$/i.exec(stmt)
    if (classAssignMatch) {
      for (const nid of classAssignMatch[1].split(',').map((x) => x.trim()).filter(Boolean)) {
        const n = nodesMap.get(nid)
        if (n) n.className = classAssignMatch[2]
      }
      return
    }
    const styleMatch = /^style\s+([A-Za-z0-9_.-]+)\s+(.+)$/i.exec(stmt)
    if (styleMatch) {
      nodeStyles.set(styleMatch[1], parseStyleProps(styleMatch[2]))
      return
    }

    const sgMatch = /^subgraph\s+([\s\S]+)$/i.exec(stmt)
    if (sgMatch) {
      const rest = sgMatch[1].trim()
      let sgId = ''
      let sgTitle = ''
      const bracketForm = /^([A-Za-z0-9_.-]+)\s*\[\s*([\s\S]+?)\s*\]\s*$/.exec(rest)
      const quotedForm = /^"([^"]+)"\s*$/.exec(rest)
      const twoPartForm = /^([A-Za-z0-9_.-]+)\s+([\s\S]+)$/.exec(rest)
      if (bracketForm) {
        sgId = bracketForm[1]
        sgTitle = unquoteMermaidText(bracketForm[2])
      } else if (quotedForm) {
        sgAutoIdx += 1
        sgId = 'sg_' + sgAutoIdx
        sgTitle = unquoteMermaidText(quotedForm[1])
      } else if (twoPartForm) {
        sgId = twoPartForm[1]
        sgTitle = unquoteMermaidText(twoPartForm[2])
      } else {
        sgId = rest.replace(/[^A-Za-z0-9_.-]/g, '_') || ('sg_' + (++sgAutoIdx))
        sgTitle = unquoteMermaidText(rest)
      }
      let sg = subgraphById.get(sgId)
      if (!sg) {
        sg = {
          id: sgId,
          title: sgTitle || sgId,
          parentId: subgraphStack.length > 0 ? subgraphStack[subgraphStack.length - 1].id : null,
          nodeIds: [],
          order: subgraphs.length,
        }
        subgraphs.push(sg)
        subgraphById.set(sgId, sg)
      }
      subgraphStack.push(sg)
      return
    }

    if (/^end\s*$/i.test(stmt)) {
      subgraphStack.pop()
      return
    }

    const { nodeGroups, edgeOps } = tokenizeFlowChain(stmt)
    if (nodeGroups.length === 0) return
    if (edgeOps.length === 0) {
      for (const item of splitParallelAmpersand(nodeGroups[0])) {
        upsertNode(parseNodeToken(item))
      }
      return
    }

    const resolvedGroups = nodeGroups.map((grp) =>
      splitParallelAmpersand(grp)
        .map((tok) => upsertNode(parseNodeToken(tok)))
        .filter(Boolean),
    )

    for (let g = 0; g < edgeOps.length; g += 1) {
      const leftNodes = resolvedGroups[g] ?? []
      const rightNodes = resolvedGroups[g + 1] ?? []
      const op = edgeOps[g]
      for (const srcNode of leftNodes) {
        for (const dstNode of rightNodes) {
          // 若源或目标其实是一个 subgraph id，将其重定向到该子图的首/末节点
          const actualSrc = subgraphById.has(srcNode.id) && subgraphById.get(srcNode.id).nodeIds.length > 0
            ? (nodesMap.get(subgraphById.get(srcNode.id).nodeIds[subgraphById.get(srcNode.id).nodeIds.length - 1]) || srcNode)
            : srcNode
          const actualDst = subgraphById.has(dstNode.id) && subgraphById.get(dstNode.id).nodeIds.length > 0
            ? (nodesMap.get(subgraphById.get(dstNode.id).nodeIds[0]) || dstNode)
            : dstNode
          edges.push({
            id: 'e' + (edges.length + 1),
            from: actualSrc.id,
            to: actualDst.id,
            label: op.label || '',
            headArrow: Boolean(op.headArrow),
            tailArrow: op.tailArrow !== false,
            dash: op.dash || '',
            thick: Boolean(op.thick),
          })
        }
      }
    }
  })

  // 移除误作为独立节点插入的空 subgraph 占位名
  for (const sg of subgraphs) {
    if (sg.nodeIds.length > 0 && nodesMap.has(sg.id)) {
      const candidate = nodesMap.get(sg.id)
      const usedDirectly = edges.some((e) => e.from === sg.id || e.to === sg.id)
      if (!usedDirectly && candidate.label === sg.id) {
        nodesMap.delete(sg.id)
      }
    }
  }

  const nodes = [...nodesMap.values()].map((n) => {
    const clsStyle = n.className && classDefs.has(n.className) ? classDefs.get(n.className) : {}
    const directStyle = nodeStyles.get(n.id) ?? {}
    return {
      ...n,
      customStyle: { ...clsStyle, ...directStyle },
    }
  })

  return {
    mode: 'flowchart',
    direction,
    nodes,
    edges,
    subgraphs: subgraphs.filter((sg) => sg.nodeIds.some((id) => nodesMap.has(id))),
  }
}

// ---------------------------------------------------------------------------
// 3. Mode A：确定性 Sugiyama 分层有向图几何布局求解器
// ---------------------------------------------------------------------------

function wrapNodeLabelLines(label, maxEmPerLine = 12.5) {
  const explicitLines = String(label ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
  const out = []
  for (const line of explicitLines) {
    const em = measureEmWidth(line, true)
    if (em <= maxEmPerLine || line.length <= 6) {
      out.push(line)
      continue
    }
    const words = line.includes(' ') ? line.split(/\s+/) : [...line]
    let cur = ''
    for (const unit of words) {
      const sep = line.includes(' ') && cur ? ' ' : ''
      const next = cur + sep + unit
      if (cur && measureEmWidth(next, true) > maxEmPerLine) {
        out.push(cur)
        cur = unit
      } else {
        cur = next
      }
    }
    if (cur) out.push(cur)
  }
  return out.length > 0 ? out.slice(0, 3) : ['Node']
}

function estimateNaturalNodeSize(node, nodeCount, isHoriz = false) {
  const maxEmWrap = node.shape === 'diamond' ? 10.5 : nodeCount >= 9 ? 11.5 : 13.5
  const lines = wrapNodeLabelLines(node.label, maxEmWrap)
  const basePt = nodeCount >= 11 ? 10.5 : nodeCount >= 7 ? 11.5 : 12.5
  const maxLineEm = Math.max(2.6, ...lines.map((l) => measureEmWidth(l, true)))
  const textWIn = (maxLineEm * basePt) / 72
  const textHIn = (lines.length * basePt * 1.24) / 72
  const compactV = !isHoriz && nodeCount >= 7

  if (node.shape === 'diamond') {
    return {
      lines,
      basePt,
      w: Math.min(3.30, Math.max(1.88, textWIn * 2.12 + 0.56)),
      h: Math.min(1.34, Math.max(compactV ? 0.76 : 0.86, textHIn * 2.10 + 0.30)),
    }
  }
  if (node.shape === 'circle') {
    const d = Math.min(1.56, Math.max(compactV ? 0.72 : 0.84, Math.max(textWIn * 1.32 + 0.38, textHIn * 1.30 + 0.28)))
    return { lines, basePt, w: d * 1.24, h: d }
  }
  if (node.shape === 'cylinder') {
    return {
      lines,
      basePt,
      w: Math.min(2.75, Math.max(1.56, textWIn + 0.68)),
      h: Math.min(1.16, Math.max(compactV ? 0.68 : 0.78, textHIn + 0.36)),
    }
  }
  if (node.shape === 'subroutine') {
    return {
      lines,
      basePt,
      w: Math.min(2.90, Math.max(1.66, textWIn * 1.18 + 0.76)),
      h: Math.min(1.04, Math.max(compactV ? 0.52 : 0.60, textHIn + 0.26)),
    }
  }
  if (node.shape === 'stadium') {
    const h = Math.min(0.98, Math.max(compactV ? 0.50 : 0.56, textHIn + 0.24))
    return {
      lines,
      basePt,
      w: Math.min(2.85, Math.max(1.54, textWIn + h * 0.78 + 0.44)),
      h,
    }
  }
  return {
    lines,
    basePt,
    w: Math.min(2.85, Math.max(1.52, textWIn + 0.64)),
    h: Math.min(1.04, Math.max(compactV ? 0.50 : 0.58, textHIn + 0.26)),
  }
}

function portCoordinates(nodeBox, siteIdx) {
  const cx = nodeBox.x + nodeBox.w / 2
  const cy = nodeBox.y + nodeBox.h / 2
  if (siteIdx === 0) return { x: cx, y: nodeBox.y }
  if (siteIdx === 1) return { x: nodeBox.x, y: cy }
  if (siteIdx === 2) return { x: cx, y: nodeBox.y + nodeBox.h }
  return { x: nodeBox.x + nodeBox.w, y: cy }
}

export function layoutMermaidFlowchart(astInput, areaBox = { x: 0.62, y: 1.86, w: 12.09, h: 4.78 }) {
  const ast = astInput?.mode === 'flowchart' ? astInput : parseMermaidFlowchart(astInput)
  const rawNodes = ast.nodes.length > 0
    ? ast.nodes
    : [
        { id: 'Start', label: 'Start', shape: 'stadium', subgraphId: null, order: 0, customStyle: {} },
        { id: 'End', label: 'End', shape: 'stadium', subgraphId: null, order: 1, customStyle: {} },
      ]
  const rawEdges = ast.nodes.length > 0
    ? ast.edges
    : [{ id: 'e1', from: 'Start', to: 'End', label: '', headArrow: false, tailArrow: true, dash: '', thick: false }]

  const nodeById = new Map(rawNodes.map((n) => [n.id, n]))
  const nCount = rawNodes.length
  const direction = ast.direction || 'TD'
  const isHoriz = direction === 'LR' || direction === 'RL'

  // Step 1：DFS 破环（Cycle Breaking）
  const adjRaw = new Map(rawNodes.map((n) => [n.id, []]))
  rawEdges.forEach((e, idx) => {
    if (e.from !== e.to && adjRaw.has(e.from) && adjRaw.has(e.to)) {
      adjRaw.get(e.from).push({ to: e.to, idx })
    }
  })
  const visitState = new Map(rawNodes.map((n) => [n.id, 0]))
  const reversedEdgeIdx = new Set()
  const dfsCycle = (u) => {
    visitState.set(u, 1)
    for (const { to, idx } of adjRaw.get(u) ?? []) {
      const st = visitState.get(to)
      if (st === 1) reversedEdgeIdx.add(idx)
      else if (st === 0) dfsCycle(to)
    }
    visitState.set(u, 2)
  }
  for (const n of rawNodes) {
    if (visitState.get(n.id) === 0) dfsCycle(n.id)
  }

  const dagEdges = rawEdges
    .map((e, idx) => {
      if (e.from === e.to) return null
      const rev = reversedEdgeIdx.has(idx)
      return {
        origIdx: idx,
        u: rev ? e.to : e.from,
        v: rev ? e.from : e.to,
        reversed: rev,
        label: e.label,
      }
    })
    .filter(Boolean)

  // Step 2：最长路径层级分配（Longest-Path Rank Assignment）+ 源点紧致化
  const inDeg = new Map(rawNodes.map((n) => [n.id, 0]))
  const outAdj = new Map(rawNodes.map((n) => [n.id, []]))
  const inAdj = new Map(rawNodes.map((n) => [n.id, []]))
  for (const de of dagEdges) {
    inDeg.set(de.v, (inDeg.get(de.v) ?? 0) + 1)
    outAdj.get(de.u).push(de.v)
    inAdj.get(de.v).push(de.u)
  }

  const rank = new Map(rawNodes.map((n) => [n.id, 0]))
  const queue = rawNodes.filter((n) => (inDeg.get(n.id) ?? 0) === 0).map((n) => n.id)
  const remIn = new Map(inDeg)
  const topo = []
  while (queue.length > 0) {
    const u = queue.shift()
    topo.push(u)
    const ru = rank.get(u) ?? 0
    for (const v of outAdj.get(u) ?? []) {
      if (ru + 1 > (rank.get(v) ?? 0)) rank.set(v, ru + 1)
      remIn.set(v, (remIn.get(v) ?? 1) - 1)
      if (remIn.get(v) === 0) queue.push(v)
    }
  }
  for (const n of rawNodes) {
    if (!topo.includes(n.id)) topo.push(n.id)
  }

  // 将无入边但下游最小层级 > 1 的辅助输入源拉近至 minSuccRank - 1
  for (const n of rawNodes) {
    if ((inAdj.get(n.id)?.length ?? 0) === 0 && (outAdj.get(n.id)?.length ?? 0) > 0) {
      const minSucc = Math.min(...outAdj.get(n.id).map((v) => rank.get(v) ?? 1))
      if (minSucc > 1) rank.set(n.id, minSucc - 1)
    }
  }

  // 同级互斥子图（Disjoint Sibling Subgraphs）单向流主轴隔离：
  // 若子图 A 存在单向有向边指向互斥子图 B（且 B 不可达 A），将 B 的最小层级推至 maxRank(A) + 1 并向下游传播，避免兄弟子图外框相交
  if (ast.subgraphs.length >= 2) {
    const sgById = new Map(ast.subgraphs.map((sg) => [sg.id, sg]))
    const sgMemberSets = new Map(ast.subgraphs.map((sg) => [sg.id, new Set(sg.nodeIds)]))
    const isAncestorSg = (anc, desc) => {
      let cur = sgById.get(desc)?.parentId ?? null
      const seen = new Set()
      while (cur && !seen.has(cur)) {
        if (cur === anc) return true
        seen.add(cur)
        cur = sgById.get(cur)?.parentId ?? null
      }
      return false
    }
    const disjointPairs = []
    for (let i = 0; i < ast.subgraphs.length; i += 1) {
      for (let j = i + 1; j < ast.subgraphs.length; j += 1) {
        const a = ast.subgraphs[i]
        const b = ast.subgraphs[j]
        if (isAncestorSg(a.id, b.id) || isAncestorSg(b.id, a.id)) continue
        const setA = sgMemberSets.get(a.id)
        const setB = sgMemberSets.get(b.id)
        let shares = false
        for (const nid of setA) {
          if (setB.has(nid)) { shares = true; break }
        }
        if (!shares && setA.size > 0 && setB.size > 0) disjointPairs.push([a.id, b.id])
      }
    }
    const sgDirectEdges = new Map(ast.subgraphs.map((sg) => [sg.id, new Set()]))
    for (const de of dagEdges) {
      for (const [idA, idB] of disjointPairs) {
        const setA = sgMemberSets.get(idA)
        const setB = sgMemberSets.get(idB)
        if (setA.has(de.u) && setB.has(de.v)) sgDirectEdges.get(idA).add(idB)
        if (setB.has(de.u) && setA.has(de.v)) sgDirectEdges.get(idB).add(idA)
      }
    }
    const sgReach = (start, target) => {
      const visited = new Set([start])
      const st = [start]
      while (st.length > 0) {
        const cur = st.pop()
        for (const nxt of sgDirectEdges.get(cur) ?? []) {
          if (nxt === target) return true
          if (!visited.has(nxt)) {
            visited.add(nxt)
            st.push(nxt)
          }
        }
      }
      return false
    }
    const orderedPairs = []
    for (const [idA, idB] of disjointPairs) {
      const aToB = sgReach(idA, idB)
      const bToA = sgReach(idB, idA)
      if (aToB && !bToA) orderedPairs.push([idA, idB])
      else if (bToA && !aToB) orderedPairs.push([idB, idA])
    }
    for (let iter = 0; iter < orderedPairs.length + 2; iter += 1) {
      let changed = false
      for (const [idA, idB] of orderedPairs) {
        const membersA = [...sgMemberSets.get(idA)]
        const membersB = [...sgMemberSets.get(idB)]
        const maxA = Math.max(...membersA.map((nid) => rank.get(nid) ?? 0))
        const minB = Math.min(...membersB.map((nid) => rank.get(nid) ?? 0))
        if (minB <= maxA) {
          const delta = maxA + 1 - minB
          for (const nid of membersB) {
            rank.set(nid, (rank.get(nid) ?? 0) + delta)
          }
          changed = true
        }
      }
      // 传播 DAG 下游层级约束（rank[v] >= rank[u] + 1）
      for (const u of topo) {
        const ru = rank.get(u) ?? 0
        for (const v of outAdj.get(u) ?? []) {
          if (ru + 1 > (rank.get(v) ?? 0)) {
            rank.set(v, ru + 1)
            changed = true
          }
        }
      }
      if (!changed) break
    }
  }

  const minR = Math.min(...rawNodes.map((n) => rank.get(n.id) ?? 0))
  if (minR > 0) {
    for (const n of rawNodes) rank.set(n.id, (rank.get(n.id) ?? 0) - minR)
  }
  const maxRank = Math.max(0, ...rawNodes.map((n) => rank.get(n.id) ?? 0))
  const layerCount = maxRank + 1

  // Step 3：构造跨层虚拟节点并执行 4 轮双向重心交叉最小化（4-Pass Barycenter Crossing Reduction）
  const sgOrderMap = new Map(ast.subgraphs.map((sg, i) => [sg.id, i + 1]))
  const vertices = new Map()
  for (const n of rawNodes) {
    const sz = estimateNaturalNodeSize(n, nCount, isHoriz)
    vertices.set(n.id, {
      id: n.id,
      isDummy: false,
      rank: rank.get(n.id) ?? 0,
      subgraphId: n.subgraphId,
      order: n.order,
      w: sz.w,
      h: sz.h,
      lines: sz.lines,
      basePt: sz.basePt,
      node: n,
    })
  }

  const unitPred = new Map([...vertices.keys()].map((k) => [k, []]))
  const unitSucc = new Map([...vertices.keys()].map((k) => [k, []]))
  let dummySeq = 0
  for (const de of dagEdges) {
    const ru = rank.get(de.u) ?? 0
    const rv = rank.get(de.v) ?? 0
    if (rv <= ru) continue
    let prev = de.u
    for (let r = ru + 1; r < rv; r += 1) {
      dummySeq += 1
      const did = '__dummy_' + dummySeq
      vertices.set(did, {
        id: did,
        isDummy: true,
        rank: r,
        subgraphId: nodeById.get(de.u)?.subgraphId === nodeById.get(de.v)?.subgraphId ? nodeById.get(de.u)?.subgraphId : null,
        order: 1000 + dummySeq,
        w: isHoriz ? 0.10 : 0.14,
        h: isHoriz ? 0.14 : 0.10,
        lines: [],
        basePt: 10,
        node: null,
      })
      unitPred.set(did, [prev])
      unitSucc.set(did, [])
      unitSucc.get(prev).push(did)
      prev = did
    }
    unitSucc.get(prev).push(de.v)
    unitPred.get(de.v).push(prev)
  }

  const layers = Array.from({ length: layerCount }, () => [])
  for (const v of vertices.values()) {
    layers[v.rank].push(v.id)
  }
  layers.forEach((layer) => {
    layer.sort((a, b) => {
      const va = vertices.get(a)
      const vb = vertices.get(b)
      const sga = sgOrderMap.get(va.subgraphId) ?? 0
      const sgb = sgOrderMap.get(vb.subgraphId) ?? 0
      if (sga !== sgb) return sga - sgb
      return va.order - vb.order
    })
  })

  const posInLayer = new Map()
  const refreshPos = (r) => {
    layers[r].forEach((vid, idx) => posInLayer.set(vid, idx))
  }
  for (let r = 0; r < layerCount; r += 1) refreshPos(r)

  for (let pass = 0; pass < 4; pass += 1) {
    // Top-Down Sweep
    for (let r = 1; r < layerCount; r += 1) {
      const bary = new Map()
      layers[r].forEach((vid, idx) => {
        const preds = unitPred.get(vid) ?? []
        if (preds.length === 0) bary.set(vid, idx)
        else bary.set(vid, preds.reduce((s, p) => s + (posInLayer.get(p) ?? 0), 0) / preds.length)
      })
      layers[r].sort((a, b) => {
        const diff = (bary.get(a) ?? 0) - (bary.get(b) ?? 0)
        if (Math.abs(diff) > 0.05) return diff
        const sga = sgOrderMap.get(vertices.get(a).subgraphId) ?? 0
        const sgb = sgOrderMap.get(vertices.get(b).subgraphId) ?? 0
        if (sga !== sgb) return sga - sgb
        return vertices.get(a).order - vertices.get(b).order
      })
      refreshPos(r)
    }
    // Bottom-Up Sweep
    for (let r = layerCount - 2; r >= 0; r -= 1) {
      const bary = new Map()
      layers[r].forEach((vid, idx) => {
        const succs = unitSucc.get(vid) ?? []
        if (succs.length === 0) bary.set(vid, idx)
        else bary.set(vid, succs.reduce((s, c) => s + (posInLayer.get(c) ?? 0), 0) / succs.length)
      })
      layers[r].sort((a, b) => {
        const diff = (bary.get(a) ?? 0) - (bary.get(b) ?? 0)
        if (Math.abs(diff) > 0.05) return diff
        const sga = sgOrderMap.get(vertices.get(a).subgraphId) ?? 0
        const sgb = sgOrderMap.get(vertices.get(b).subgraphId) ?? 0
        if (sga !== sgb) return sga - sgb
        return vertices.get(a).order - vertices.get(b).order
      })
      refreshPos(r)
    }
  }

  // 若仍有同级兄弟子图共享同一层级，强制按子图顺序分组以保证跨轴条带互不交叉
  if (ast.subgraphs.length >= 2) {
    const sgRankRanges = new Map()
    for (const sg of ast.subgraphs) {
      const rs = sg.nodeIds.map((nid) => rank.get(nid)).filter((r) => r !== undefined)
      if (rs.length > 0) sgRankRanges.set(sg.id, [Math.min(...rs), Math.max(...rs)])
    }
    const overlappingSgs = new Set()
    for (let i = 0; i < ast.subgraphs.length; i += 1) {
      for (let j = i + 1; j < ast.subgraphs.length; j += 1) {
        const a = ast.subgraphs[i]
        const b = ast.subgraphs[j]
        if (a.parentId === b.id || b.parentId === a.id) continue
        const ra = sgRankRanges.get(a.id)
        const rb = sgRankRanges.get(b.id)
        if (ra && rb && ra[0] <= rb[1] && rb[0] <= ra[1]) {
          overlappingSgs.add(a.id)
          overlappingSgs.add(b.id)
        }
      }
    }
    if (overlappingSgs.size > 0) {
      for (let r = 0; r < layerCount; r += 1) {
        layers[r].sort((a, b) => {
          const va = vertices.get(a)
          const vb = vertices.get(b)
          const sga = overlappingSgs.has(va.subgraphId) ? (sgOrderMap.get(va.subgraphId) ?? 0) : 0
          const sgb = overlappingSgs.has(vb.subgraphId) ? (sgOrderMap.get(vb.subgraphId) ?? 0) : 0
          if (sga !== sgb) return sga - sgb
          return (posInLayer.get(a) ?? 0) - (posInLayer.get(b) ?? 0)
        })
        refreshPos(r)
      }
    }
  }

  // Step 4：自适应盒尺寸与子图感知均衡坐标求解
  const hasSubgraphs = ast.subgraphs.length > 0
  const hasBackEdge = rawEdges.some((e) => e.from !== e.to && (rank.get(e.from) ?? 0) > (rank.get(e.to) ?? 0))
  const padOuterX = Math.max(hasSubgraphs ? 0.18 : 0.06, !isHoriz && hasBackEdge ? 0.46 : 0)
  const padOuterTop = Math.max(hasSubgraphs ? (isHoriz ? 0.40 : 0.34) : 0.05, isHoriz && hasBackEdge ? 0.44 : 0)
  const padOuterBot = Math.max(hasSubgraphs ? 0.14 : 0.05, isHoriz && hasBackEdge ? 0.44 : 0)
  const innerBox = {
    x: areaBox.x + padOuterX,
    y: areaBox.y + padOuterTop,
    w: Math.max(2.0, areaBox.w - padOuterX * 2),
    h: Math.max(1.6, areaBox.h - padOuterTop - padOuterBot),
  }

  const orderedRanks = Array.from({ length: layerCount }, (_, r) =>
    direction === 'BT' || direction === 'RL' ? layerCount - 1 - r : r,
  )

  const realLayers = orderedRanks.map((r) =>
    layers[r].map((vid) => vertices.get(vid)).filter((v) => !v.isDummy),
  )

  // 计算主轴（Primary Axis）各层厚度与层间间距
  const rawLayerThickness = realLayers.map((items) =>
    items.length > 0 ? Math.max(...items.map((v) => (isHoriz ? v.w : v.h))) : 0.50,
  )
  const rawLayerGaps = []
  const layerLabelWidths = []
  for (let i = 0; i < layerCount - 1; i += 1) {
    const rA = orderedRanks[i]
    const rB = orderedRanks[i + 1]
    const labeledEdges = dagEdges.filter((de) => {
      const ru = rank.get(de.u) ?? 0
      const rv = rank.get(de.v) ?? 0
      return de.label && ((ru === rA && rv === rB) || (ru === rB && rv === rA))
    })
    const hasLabeledEdge = labeledEdges.length > 0
    const maxEdgeLabelW = hasLabeledEdge
      ? Math.max(...labeledEdges.map((de) => Math.min(1.65, Math.max(0.50, (measureEmWidth(de.label, true) * 10) / 72 + 0.20))))
      : 0
    layerLabelWidths.push(maxEdgeLabelW)
    const sgSetA = new Set(realLayers[i].map((v) => v.subgraphId).filter(Boolean))
    const sgSetB = new Set(realLayers[i + 1].map((v) => v.subgraphId).filter(Boolean))
    const opensSubgraph = hasSubgraphs && [...sgSetB].some((s) => !sgSetA.has(s))
    const closesSubgraph = hasSubgraphs && [...sgSetA].some((s) => !sgSetB.has(s))
    let gap = isHoriz
      ? (hasLabeledEdge ? Math.max(0.76, maxEdgeLabelW + 0.16) : 0.54)
      : (hasLabeledEdge ? 0.56 : 0.38)
    if (opensSubgraph && closesSubgraph) gap += isHoriz ? 0.36 : 0.44
    else if (opensSubgraph) gap += isHoriz ? 0.24 : 0.36
    else if (closesSubgraph) gap += isHoriz ? 0.18 : 0.22
    rawLayerGaps.push(gap)
  }

  const availPrimary = isHoriz ? innerBox.w : innerBox.h
  const availCross = isHoriz ? innerBox.h : innerBox.w
  const sumThick = rawLayerThickness.reduce((a, b) => a + b, 0)
  const sumGaps = rawLayerGaps.reduce((a, b) => a + b, 0)

  let layerThickness = [...rawLayerThickness]
  let layerGaps = [...rawLayerGaps]
  let thickScale = 1
  if (sumThick + sumGaps > availPrimary) {
    const minGaps = rawLayerGaps.map((g, i) => {
      const sgA = new Set(realLayers[i].map((v) => v.subgraphId).filter(Boolean))
      const sgB = new Set(realLayers[i + 1].map((v) => v.subgraphId).filter(Boolean))
      const opensSg = hasSubgraphs && [...sgB].some((s) => !sgA.has(s))
      const closesSg = hasSubgraphs && [...sgA].some((s) => !sgB.has(s))
      const labelW = layerLabelWidths[i] ?? 0
      const labelFloor = isHoriz && labelW > 0 ? Math.min(1.08, Math.max(0.76, labelW + 0.16)) : 0
      const sgFloor = opensSg && closesSg ? (isHoriz ? 0.56 : 0.54) : opensSg ? (isHoriz ? 0.42 : 0.44) : 0
      const baseFloor = Math.min(g, (isHoriz ? 0.34 : 0.30) + (g > 0.50 ? 0.08 : 0))
      return Math.min(g, Math.max(baseFloor, sgFloor, labelFloor))
    })
    const minGapsTotal = minGaps.reduce((a, b) => a + b, 0)
    if (sumThick + minGapsTotal <= availPrimary && sumGaps > 0) {
      const extraAvail = availPrimary - sumThick - minGapsTotal
      const flexSum = rawLayerGaps.reduce((s, g, i) => s + Math.max(0, g - minGaps[i]), 0)
      layerGaps = rawLayerGaps.map((g, i) => minGaps[i] + (flexSum > 0 ? extraAvail * (Math.max(0, g - minGaps[i]) / flexSum) : 0))
    } else if (availPrimary - minGapsTotal >= sumThick * 0.62) {
      thickScale = (availPrimary - minGapsTotal) / Math.max(0.1, sumThick)
      layerThickness = rawLayerThickness.map((t) => t * thickScale)
      layerGaps = minGaps
    } else {
      const uniformScale = availPrimary / Math.max(0.1, sumThick + minGapsTotal)
      thickScale = uniformScale
      layerThickness = rawLayerThickness.map((t) => t * uniformScale)
      layerGaps = minGaps.map((g) => g * uniformScale)
    }
  }

  for (const items of realLayers) {
    for (const v of items) {
      if (isHoriz) v.w *= thickScale
      else v.h *= thickScale
    }
  }

  const totalPrimaryUsed = layerThickness.reduce((a, b) => a + b, 0) + layerGaps.reduce((a, b) => a + b, 0)
  let cursorPrimary = (isHoriz ? innerBox.x : innerBox.y) + Math.max(0, (availPrimary - totalPrimaryUsed) / 2)
  const layerPrimaryCenters = []
  for (let i = 0; i < layerCount; i += 1) {
    layerPrimaryCenters.push(cursorPrimary + layerThickness[i] / 2)
    cursorPrimary += layerThickness[i] + (layerGaps[i] ?? 0)
  }

  // 计算副轴（Cross Axis）每层节点位置（跨子图边界自动插入隔离间距）
  const placedBoxes = new Map()
  realLayers.forEach((items, layerIdx) => {
    if (items.length === 0) return
    const baseCrossGap = isHoriz ? 0.34 : 0.36
    const sgBoundaryExtra = hasSubgraphs ? (isHoriz ? 0.44 : 0.34) : 0
    const gaps = []
    for (let j = 0; j < items.length - 1; j += 1) {
      const diffSg = items[j].subgraphId !== items[j + 1].subgraphId && (items[j].subgraphId || items[j + 1].subgraphId)
      gaps.push(baseCrossGap + (diffSg ? sgBoundaryExtra : 0))
    }
    const rawCrossSizes = items.map((v) => (isHoriz ? v.h : v.w))
    const sumCross = rawCrossSizes.reduce((a, b) => a + b, 0)
    const sumCrossGaps = gaps.reduce((a, b) => a + b, 0)
    let cGapScale = 1
    let cSizeScale = 1
    if (sumCross + sumCrossGaps > availCross) {
      const floorGapSum = gaps.reduce((s, g) => s + Math.min(g, 0.20 + (g > baseCrossGap ? 0.18 : 0)), 0)
      if (sumCross + floorGapSum <= availCross && sumCrossGaps > 0) {
        cGapScale = (availCross - sumCross) / sumCrossGaps
      } else {
        if (sumCrossGaps > 0) cGapScale = floorGapSum / sumCrossGaps
        cSizeScale = Math.max(0.52, (availCross - floorGapSum) / Math.max(0.1, sumCross))
      }
    }
    const effSizes = rawCrossSizes.map((s) => s * cSizeScale)
    const effGaps = gaps.map((g) => g * cGapScale)
    const usedCross = effSizes.reduce((a, b) => a + b, 0) + effGaps.reduce((a, b) => a + b, 0)
    let cursorCross = (isHoriz ? innerBox.y : innerBox.x) + Math.max(0, (availCross - usedCross) / 2)
    const pCenter = layerPrimaryCenters[layerIdx]

    items.forEach((v, j) => {
      if (isHoriz) {
        v.h = effSizes[j]
        const x = pCenter - v.w / 2
        const y = cursorCross
        placedBoxes.set(v.id, { x, y, w: v.w, h: v.h, cx: x + v.w / 2, cy: y + v.h / 2 })
      } else {
        v.w = effSizes[j]
        const x = cursorCross
        const y = pCenter - v.h / 2
        placedBoxes.set(v.id, { x, y, w: v.w, h: v.h, cx: x + v.w / 2, cy: y + v.h / 2 })
      }
      cursorCross += effSizes[j] + (effGaps[j] ?? 0)
    })
  })

  // 单节点层向相邻层父子重心微调对齐（使主干保持笔直直线）
  for (let sweep = 0; sweep < 3; sweep += 1) {
    for (let i = 0; i < layerCount; i += 1) {
      const items = realLayers[i]
      if (items.length !== 1) continue
      const v = items[0]
      const box = placedBoxes.get(v.id)
      if (!box) continue
      const sameSgNeighbors = [
        ...(inAdj.get(v.id) ?? []),
        ...(outAdj.get(v.id) ?? []),
      ].filter((nid) => placedBoxes.has(nid) && (!hasSubgraphs || nodeById.get(nid)?.subgraphId === v.subgraphId || !v.subgraphId))
      const allNeighbors = [
        ...(inAdj.get(v.id) ?? []),
        ...(outAdj.get(v.id) ?? []),
      ].filter((nid) => placedBoxes.has(nid))
      const neighbors = sameSgNeighbors.length > 0 ? sameSgNeighbors : allNeighbors
      if (neighbors.length === 0) continue
      const targetCenter = neighbors.reduce((s, nid) => {
        const nb = placedBoxes.get(nid)
        return s + (isHoriz ? nb.cy : nb.cx)
      }, 0) / neighbors.length
      if (isHoriz) {
        const ny = Math.max(innerBox.y, Math.min(innerBox.y + innerBox.h - box.h, targetCenter - box.h / 2))
        box.y = ny
        box.cy = ny + box.h / 2
      } else {
        const nx = Math.max(innerBox.x, Math.min(innerBox.x + innerBox.w - box.w, targetCenter - box.w / 2))
        box.x = nx
        box.cx = nx + box.w / 2
      }
    }
  }

  // 多节点层中入度为 1 的叶子节点在不碰撞相邻节点的前提下向唯一父节点对齐（消除微小错位折线）
  for (let i = 1; i < layerCount; i += 1) {
    const items = realLayers[i]
    if (items.length < 2) continue
    items.forEach((v, j) => {
      const preds = (inAdj.get(v.id) ?? []).filter((pid) => placedBoxes.has(pid))
      if (preds.length !== 1) return
      const box = placedBoxes.get(v.id)
      const pBox = placedBoxes.get(preds[0])
      if (!box || !pBox) return
      const prevGap = j > 0 && items[j].subgraphId !== items[j - 1].subgraphId && (items[j].subgraphId || items[j - 1].subgraphId)
        ? 0.44
        : 0.24
      const nextGap = j < items.length - 1 && items[j].subgraphId !== items[j + 1].subgraphId && (items[j].subgraphId || items[j + 1].subgraphId)
        ? 0.44
        : 0.24
      const minAllow = j === 0
        ? (isHoriz ? innerBox.y : innerBox.x)
        : (isHoriz
            ? placedBoxes.get(items[j - 1].id).y + placedBoxes.get(items[j - 1].id).h + prevGap
            : placedBoxes.get(items[j - 1].id).x + placedBoxes.get(items[j - 1].id).w + prevGap)
      const maxAllow = j === items.length - 1
        ? (isHoriz ? innerBox.y + innerBox.h - box.h : innerBox.x + innerBox.w - box.w)
        : (isHoriz
            ? placedBoxes.get(items[j + 1].id).y - box.h - nextGap
            : placedBoxes.get(items[j + 1].id).x - box.w - nextGap)
      if (minAllow > maxAllow) return
      if (isHoriz) {
        const ny = Math.max(minAllow, Math.min(maxAllow, pBox.cy - box.h / 2))
        box.y = ny
        box.cy = ny + box.h / 2
      } else {
        const nx = Math.max(minAllow, Math.min(maxAllow, pBox.cx - box.w / 2))
        box.x = nx
        box.cx = nx + box.w / 2
      }
    })
  }

  // 计算 Subgraph 容器外框（按嵌套深度从浅到深绘制在底层）
  const subgraphBoxes = ast.subgraphs
    .map((sg) => {
      const memberBoxes = sg.nodeIds.map((nid) => placedBoxes.get(nid)).filter(Boolean)
      if (memberBoxes.length === 0) return null
      const minX = Math.min(...memberBoxes.map((b) => b.x))
      const minY = Math.min(...memberBoxes.map((b) => b.y))
      const maxX = Math.max(...memberBoxes.map((b) => b.x + b.w))
      const maxY = Math.max(...memberBoxes.map((b) => b.y + b.h))
      const padL = Math.min(0.16, Math.max(0.08, 0.16 * thickScale))
      const padR = Math.min(0.16, Math.max(0.08, 0.16 * thickScale))
      const padT = 0.36
      const padB = Math.min(0.12, Math.max(0.08, 0.12 * thickScale))
      const x = Math.max(areaBox.x + 0.02, minX - padL)
      const y = Math.max(areaBox.y + 0.02, minY - padT)
      const right = Math.min(areaBox.x + areaBox.w - 0.02, maxX + padR)
      const bottom = Math.min(areaBox.y + areaBox.h - 0.02, maxY + padB)
      return {
        id: sg.id,
        title: sg.title,
        parentId: sg.parentId,
        x,
        y,
        w: Math.max(0.8, right - x),
        h: Math.max(0.6, bottom - y),
      }
    })
    .filter(Boolean)

  // 缩放后按实际可用 fitBox 宽度重排节点文本（带防单字孤行均衡，杜绝 PowerPoint/LibreOffice 自动拆出 1 字尾行）
  const tokenizeForBalancedWrap = (str) => {
    const tokens = []
    let cur = ''
    for (const ch of str) {
      if (/\s/.test(ch)) {
        if (cur) { tokens.push(cur); cur = '' }
      } else if (/[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch)) {
        if (cur) { tokens.push(cur); cur = '' }
        tokens.push(ch)
      } else {
        cur += ch
      }
    }
    if (cur) tokens.push(cur)
    return tokens
  }
  const joinWrappedTokens = (toks) => {
    let s = ''
    for (const tok of toks) {
      if (!s) {
        s = tok
      } else {
        const prevAscii = /[A-Za-z0-9]$/.test(s)
        const nextAscii = /^[A-Za-z0-9]/.test(tok)
        const prevCjk = /[\u3400-\u9fff]$/.test(s)
        const nextCjk = /^[\u3400-\u9fff]/.test(tok)
        s += (prevAscii && nextAscii) || (prevAscii && nextCjk) || (prevCjk && nextAscii) ? ' ' + tok : tok
      }
    }
    return s
  }
  const rewrapLinesForFitBox = (label, currentLines, fitBoxW, refPt = 10) => {
    const availEm = Math.max(2.8, (((fitBoxW - 0.08) * 72) / refPt) * 0.90)
    const needsRewrap = currentLines.some((ln) => measureEmWidth(ln, true) > availEm)
    if (!needsRewrap) return currentLines
    const explicit = String(label ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
    const out = []
    for (const para of explicit) {
      if (measureEmWidth(para, true) <= availEm) {
        out.push(para)
        continue
      }
      const toks = tokenizeForBalancedWrap(para)
      if (toks.length <= 1) {
        out.push(para)
        continue
      }
      const lineToks = []
      let cur = []
      for (const tok of toks) {
        const candidate = joinWrappedTokens([...cur, tok])
        if (cur.length > 0 && measureEmWidth(candidate, true) > availEm) {
          lineToks.push(cur)
          cur = [tok]
        } else {
          cur.push(tok)
        }
      }
      if (cur.length > 0) lineToks.push(cur)
      // 防单字孤行：若末行仅 1 个短字符（< 1.85 em）且上一行 >= 2 个 token，将上一行末尾 token 下移以消除单字尾行
      if (lineToks.length >= 2) {
        const last = lineToks[lineToks.length - 1]
        const prev = lineToks[lineToks.length - 2]
        const lastStr = joinWrappedTokens(last)
        if (last.length === 1 && measureEmWidth(lastStr, true) < 1.85 && prev.length >= 2) {
          const moved = prev.pop()
          last.unshift(moved)
        }
      }
      for (const lt of lineToks) out.push(joinWrappedTokens(lt))
    }
    return out.length > 0 ? out.slice(0, 3) : currentLines
  }

  // 生成带精确字号拟合（>= 10pt 硬底线）的节点列表（按 ECMA-376 内缩文本框扣减 + 全节点粗体宽度测量）
  const positionedNodes = rawNodes.map((n) => {
    const b = placedBoxes.get(n.id)
    const v = vertices.get(n.id)
    const fitBox = n.shape === 'diamond'
      ? { w: Math.max(0.55, b.w * 0.58), h: Math.max(0.32, b.h * 0.58) }
      : n.shape === 'stadium'
        ? { w: Math.max(0.55, b.w - b.h * 0.50 - 0.08), h: Math.max(0.32, b.h * 0.82) }
        : n.shape === 'subroutine'
          ? { w: Math.max(0.55, b.w * 0.70 - 0.08), h: Math.max(0.32, b.h * 0.82) }
          : n.shape === 'cylinder'
            ? { w: Math.max(0.55, b.w * 0.82 - 0.08), h: Math.max(0.32, b.h * 0.68) }
            : n.shape === 'circle'
              ? { w: Math.max(0.55, b.w * 0.72), h: Math.max(0.32, b.h * 0.72) }
              : { w: Math.max(0.55, b.w - 0.20), h: Math.max(0.32, b.h * 0.82) }
    const effectiveLines = rewrapLinesForFitBox(n.label, v.lines, fitBox.w, 10)
    const fit = computeTextFit(effectiveLines, fitBox, 'cardBody', {
      maxPt: Math.min(13.5, v.basePt + 0.5),
      minPt: 10,
      padXPt: 3,
      padYPt: 2,
      lineHeight: 1.18,
      spaceAfterPt: 1,
      bold: true,
    })
    return {
      id: n.id,
      label: n.label,
      lines: effectiveLines,
      shape: n.shape,
      subgraphId: n.subgraphId,
      customStyle: n.customStyle,
      rank: v.rank,
      isRoot: (inAdj.get(n.id)?.length ?? 0) === 0,
      isSink: (outAdj.get(n.id)?.length ?? 0) === 0,
      x: +b.x.toFixed(4),
      y: +b.y.toFixed(4),
      w: +b.w.toFixed(4),
      h: +b.h.toFixed(4),
      cx: +b.cx.toFixed(4),
      cy: +b.cy.toFixed(4),
      fontPt: Math.max(10, fit.fontPt),
    }
  })

  const posNodeMap = new Map(positionedNodes.map((n) => [n.id, n]))

  // 计算每条边的精确连接站点（0=top, 1=left, 2=bottom, 3=right）与路由几何（含反馈回路/跨层遮挡的外圈 U 型槽道避障）
  const usedLabelAnchors = []
  let topChannelLane = 0
  let botChannelLane = 0
  let leftChannelLane = 0
  let rightChannelLane = 0

  const positionedEdges = rawEdges
    .map((e, idx) => {
      const src = posNodeMap.get(e.from)
      const dst = posNodeMap.get(e.to)
      if (!src || !dst) return null

      let outIdx = 2
      let inIdx = 0
      let orientation = isHoriz ? 'horizontal' : 'vertical'
      let waypoints = null
      let channelAnchor = null

      const isHorizBackEdge = isHoriz && src.id !== dst.id && (
        (direction === 'LR' && src.x >= dst.x + dst.w - 0.06) ||
        (direction === 'RL' && dst.x >= src.x + src.w - 0.06)
      )
      const isVertBackEdge = !isHoriz && src.id !== dst.id && (
        (direction !== 'BT' && src.y >= dst.y + dst.h - 0.06) ||
        (direction === 'BT' && dst.y >= src.y + src.h - 0.06)
      )

      // 检查是否属于跨层直穿障碍边（例如 LR 同行跳层直连穿过中间节点）
      const minSpanXRaw = Math.min(src.x, dst.x)
      const maxSpanXRaw = Math.max(src.x + src.w, dst.x + dst.w)
      const minSpanYRaw = Math.min(src.y, dst.y)
      const maxSpanYRaw = Math.max(src.y + src.h, dst.y + dst.h)
      const hasInlineHorizBlocker = isHoriz && src.id !== dst.id && !isHorizBackEdge && Math.abs(src.cy - dst.cy) < 0.22 &&
        positionedNodes.some((n) =>
          n.id !== src.id && n.id !== dst.id &&
          n.x < maxSpanXRaw - 0.06 && n.x + n.w > minSpanXRaw + 0.06 &&
          src.cy >= n.y - 0.06 && src.cy <= n.y + n.h + 0.06,
        )
      const hasInlineVertBlocker = !isHoriz && src.id !== dst.id && !isVertBackEdge && Math.abs(src.cx - dst.cx) < 0.22 &&
        positionedNodes.some((n) =>
          n.id !== src.id && n.id !== dst.id &&
          n.y < maxSpanYRaw - 0.06 && n.y + n.h > minSpanYRaw + 0.06 &&
          src.cx >= n.x - 0.06 && src.cx <= n.x + n.w + 0.06,
        )

      if (isHorizBackEdge || hasInlineHorizBlocker) {
        const spanned = positionedNodes.filter((n) =>
          n.x < maxSpanXRaw + 0.04 && n.x + n.w > minSpanXRaw - 0.04,
        )
        const minSpanY = Math.min(...spanned.map((n) => n.y))
        const maxSpanY = Math.max(...spanned.map((n) => n.y + n.h))
        const midSpanY = (minSpanY + maxSpanY) / 2
        const blockedAboveEndpoint = (ptNode) => positionedNodes.some((n) =>
          n.id !== ptNode.id && n.x < ptNode.cx + 0.04 && n.x + n.w > ptNode.cx - 0.04 && n.y + n.h <= ptNode.y + 0.04,
        )
        const blockedBelowEndpoint = (ptNode) => positionedNodes.some((n) =>
          n.id !== ptNode.id && n.x < ptNode.cx + 0.04 && n.x + n.w > ptNode.cx - 0.04 && n.y >= ptNode.y + ptNode.h - 0.04,
        )
        const topBlocked = blockedAboveEndpoint(src) || blockedAboveEndpoint(dst)
        const botBlocked = blockedBelowEndpoint(src) || blockedBelowEndpoint(dst)
        let useTop = ((src.cy + dst.cy) / 2) <= midSpanY
        if (useTop && topBlocked && !botBlocked) useTop = false
        else if (!useTop && botBlocked && !topBlocked) useTop = true

        outIdx = useTop ? 0 : 2
        inIdx = useTop ? 0 : 2
        orientation = 'horizontal'
        const channelY = useTop
          ? Math.max(areaBox.y + 0.08, minSpanY - 0.24 - topChannelLane * 0.20)
          : Math.min(areaBox.y + areaBox.h - 0.08, maxSpanY + 0.24 + botChannelLane * 0.20)
        if (useTop) topChannelLane += 1
        else botChannelLane += 1
        const fp = portCoordinates(src, outIdx)
        const tp = portCoordinates(dst, inIdx)
        waypoints = [
          { x: +fp.x.toFixed(4), y: +fp.y.toFixed(4) },
          { x: +fp.x.toFixed(4), y: +channelY.toFixed(4) },
          { x: +tp.x.toFixed(4), y: +channelY.toFixed(4) },
          { x: +tp.x.toFixed(4), y: +tp.y.toFixed(4) },
        ]
        channelAnchor = { x: (fp.x + tp.x) / 2, y: channelY }
      } else if (isVertBackEdge || hasInlineVertBlocker) {
        const spanned = positionedNodes.filter((n) =>
          n.y < maxSpanYRaw + 0.04 && n.y + n.h > minSpanYRaw - 0.04,
        )
        const minSpanX = Math.min(...spanned.map((n) => n.x))
        const maxSpanX = Math.max(...spanned.map((n) => n.x + n.w))
        const midSpanX = (minSpanX + maxSpanX) / 2
        const useLeft = ((src.cx + dst.cx) / 2) <= midSpanX
        outIdx = useLeft ? 1 : 3
        inIdx = useLeft ? 1 : 3
        orientation = 'vertical'
        const channelX = useLeft
          ? Math.max(areaBox.x + 0.08, minSpanX - 0.26 - leftChannelLane * 0.22)
          : Math.min(areaBox.x + areaBox.w - 0.08, maxSpanX + 0.26 + rightChannelLane * 0.22)
        if (useLeft) leftChannelLane += 1
        else rightChannelLane += 1
        const fp = portCoordinates(src, outIdx)
        const tp = portCoordinates(dst, inIdx)
        waypoints = [
          { x: +fp.x.toFixed(4), y: +fp.y.toFixed(4) },
          { x: +channelX.toFixed(4), y: +fp.y.toFixed(4) },
          { x: +channelX.toFixed(4), y: +tp.y.toFixed(4) },
          { x: +tp.x.toFixed(4), y: +tp.y.toFixed(4) },
        ]
        channelAnchor = { x: channelX, y: (fp.y + tp.y) / 2 }
      } else if (src.id === dst.id) {
        outIdx = 3
        inIdx = 0
        orientation = 'horizontal'
      } else if (!isHoriz) {
        if (dst.y >= src.y + src.h - 0.06) {
          outIdx = 2
          inIdx = 0
          orientation = 'vertical'
        } else if (src.y >= dst.y + dst.h - 0.06) {
          if (src.x + src.w + 0.08 < dst.x) {
            outIdx = 3
            inIdx = 1
            orientation = 'horizontal'
          } else if (dst.x + dst.w + 0.08 < src.x) {
            outIdx = 1
            inIdx = 3
            orientation = 'horizontal'
          } else {
            outIdx = 0
            inIdx = 2
            orientation = 'vertical'
          }
        } else {
          outIdx = dst.cx >= src.cx ? 3 : 1
          inIdx = dst.cx >= src.cx ? 1 : 3
          orientation = 'horizontal'
        }
      } else {
        if (dst.x >= src.x + src.w - 0.06) {
          outIdx = 3
          inIdx = 1
          orientation = 'horizontal'
        } else if (src.x >= dst.x + dst.w - 0.06) {
          if (src.y + src.h + 0.08 < dst.y) {
            outIdx = 2
            inIdx = 0
            orientation = 'vertical'
          } else if (dst.y + dst.h + 0.08 < src.y) {
            outIdx = 0
            inIdx = 2
            orientation = 'vertical'
          } else {
            outIdx = 1
            inIdx = 3
            orientation = 'horizontal'
          }
        } else {
          outIdx = dst.cy >= src.cy ? 2 : 0
          inIdx = dst.cy >= src.cy ? 0 : 2
          orientation = 'vertical'
        }
      }

      const fromPt = portCoordinates(src, outIdx)
      const toPt = portCoordinates(dst, inIdx)
      const dx = toPt.x - fromPt.x
      const dy = toPt.y - fromPt.y
      const isCollinear = !waypoints && (
        (orientation === 'vertical' && Math.abs(dx) < 0.035) ||
        (orientation === 'horizontal' && Math.abs(dy) < 0.035)
      )
      const connectorPreset = waypoints
        ? 'routedPolyline'
        : src.id === dst.id
          ? 'bentConnector3'
          : isCollinear
            ? 'straightConnector1'
            : 'bentConnector3'

      // 跨层折线避障：若 horizontal bentConnector3 默认中点折弯穿过了中间层节点，将折弯位置 adj1 移至中间节点之前/之后的净空槽道
      let adj1 = 50000
      let avoidedBlocker = null
      if (!waypoints && connectorPreset === 'bentConnector3' && orientation === 'horizontal' && Math.abs(dx) > 0.35 && Math.abs(dy) > 0.15) {
        const minX = Math.min(fromPt.x, toPt.x)
        const maxX = Math.max(fromPt.x, toPt.x)
        const blockersOnStartRay = positionedNodes.filter((n) =>
          n.id !== src.id &&
          n.id !== dst.id &&
          n.x < maxX - 0.04 &&
          n.x + n.w > minX + 0.04 &&
          fromPt.y >= n.y - 0.08 &&
          fromPt.y <= n.y + n.h + 0.08,
        )
        if (blockersOnStartRay.length > 0) {
          if (dx > 0) {
            const firstBlk = blockersOnStartRay.reduce((a, b) => (a.x <= b.x ? a : b))
            const bendX = Math.max(fromPt.x + 0.12, Math.min(firstBlk.x - 0.12, (fromPt.x + firstBlk.x) / 2))
            if (bendX > fromPt.x + 0.05 && bendX < toPt.x - 0.15) {
              adj1 = Math.max(10000, Math.min(90000, Math.round(((bendX - fromPt.x) / dx) * 100000)))
              avoidedBlocker = { side: 'start', bendX, blocker: firstBlk }
            }
          } else {
            const firstBlk = blockersOnStartRay.reduce((a, b) => (a.x + a.w >= b.x + b.w ? a : b))
            const bendX = Math.min(fromPt.x - 0.12, Math.max(firstBlk.x + firstBlk.w + 0.12, (fromPt.x + firstBlk.x + firstBlk.w) / 2))
            if (bendX < fromPt.x - 0.05 && bendX > toPt.x + 0.15) {
              adj1 = Math.max(10000, Math.min(90000, Math.round(((bendX - fromPt.x) / dx) * 100000)))
              avoidedBlocker = { side: 'start', bendX, blocker: firstBlk }
            }
          }
        }
      }

      // 计算标签胶囊坐标并避让已有标签与节点框（外圈槽道边直接置于槽道中段；短竖直直线边右移；水平净空不足时上抬至连线上方避免盖住节点文字）
      let labelBox = null
      if (e.label) {
        const labelFontPt = 10
        const lw = Math.min(2.1, Math.max(0.50, (measureEmWidth(e.label, true) * labelFontPt) / 72 + 0.20))
        const lh = 0.23
        let lx = (fromPt.x + toPt.x) / 2 - lw / 2
        let ly = (fromPt.y + toPt.y) / 2 - lh / 2
        if (channelAnchor) {
          lx = channelAnchor.x - lw / 2
          ly = channelAnchor.y - lh / 2
        } else if (avoidedBlocker && avoidedBlocker.side === 'start') {
          lx = (avoidedBlocker.bendX + toPt.x) / 2 - lw / 2
          ly = toPt.y - lh / 2
        } else if (connectorPreset === 'straightConnector1' && orientation === 'vertical' && Math.abs(dy) < 0.62) {
          lx = fromPt.x + 0.10
        } else if (connectorPreset === 'bentConnector3' && orientation === 'vertical' && Math.abs(dx) > 0.35) {
          lx = fromPt.x + dx * 0.62 - lw / 2
        } else if (connectorPreset === 'bentConnector3' && orientation === 'horizontal' && Math.abs(dy) > 0.35) {
          ly = fromPt.y + dy * 0.62 - lh / 2
        }
        const horizClearSpan = Math.abs(toPt.x - fromPt.x)
        if (!channelAnchor && !avoidedBlocker && orientation === 'horizontal' && horizClearSpan < lw + 0.08) {
          const liftedY = Math.min(fromPt.y, toPt.y) - lh - 0.06
          ly = liftedY >= areaBox.y + 0.02 ? liftedY : Math.max(fromPt.y, toPt.y) + 0.06
        }
        // 避免标签胶囊压到非端点节点盒
        for (const n of positionedNodes) {
          if (n.id === src.id || n.id === dst.id) continue
          const hitX = lx < n.x + n.w + 0.03 && lx + lw > n.x - 0.03
          const hitY = ly < n.y + n.h + 0.03 && ly + lh > n.y - 0.03
          if (hitX && hitY) {
            const belowY = n.y + n.h + 0.05
            const aboveY = n.y - lh - 0.05
            ly = belowY + lh <= areaBox.y + areaBox.h - 0.02 ? belowY : Math.max(areaBox.y + 0.02, aboveY)
          }
        }
        for (const prev of usedLabelAnchors) {
          if (Math.abs(lx - prev.x) < lw * 0.78 && Math.abs(ly - prev.y) < lh * 0.92) {
            ly += lh + 0.04
          }
        }
        lx = Math.max(areaBox.x + 0.02, Math.min(areaBox.x + areaBox.w - lw - 0.02, lx))
        ly = Math.max(areaBox.y + 0.02, Math.min(areaBox.y + areaBox.h - lh - 0.02, ly))
        usedLabelAnchors.push({ x: lx, y: ly })
        labelBox = { x: +lx.toFixed(4), y: +ly.toFixed(4), w: +lw.toFixed(4), h: lh, fontPt: labelFontPt }
      }

      return {
        ...e,
        index: idx,
        outIdx,
        inIdx,
        orientation,
        connectorPreset,
        adj1,
        waypoints,
        fromPt: { x: +fromPt.x.toFixed(4), y: +fromPt.y.toFixed(4) },
        toPt: { x: +toPt.x.toFixed(4), y: +toPt.y.toFixed(4) },
        labelBox,
      }
    })
    .filter(Boolean)

  return {
    mode: 'flowchart',
    direction,
    areaBox,
    subgraphs: subgraphBoxes,
    nodes: positionedNodes,
    edges: positionedEdges,
  }
}

// ---------------------------------------------------------------------------
// 4. Mode B：Mermaid SequenceDiagram 解析器与确定性时序几何求解器
// ---------------------------------------------------------------------------

export function parseMermaidSequence(slideOrText) {
  const src = extractMermaidSource(slideOrText)
  const rawLines = src.split('\n')
  const participants = []
  const partMap = new Map()
  const events = []
  const frames = []
  const frameStack = []
  const activeStacks = new Map()
  const activations = []
  let autonumber = false
  let msgCount = 0

  const ensureActor = (rawId, explicitLabel = '', kind = 'participant') => {
    const id = unquoteMermaidText(rawId).replace(/\s+/g, ' ').trim()
    if (!id) return null
    let p = partMap.get(id)
    if (!p) {
      p = {
        id,
        label: explicitLabel ? unquoteMermaidText(explicitLabel) : id,
        kind,
        index: participants.length,
      }
      participants.push(p)
      partMap.set(id, p)
    } else {
      if (explicitLabel) p.label = unquoteMermaidText(explicitLabel)
      if (kind === 'actor') p.kind = 'actor'
    }
    return p
  }

  const pushActivation = (actorId, stepIdx) => {
    if (!activeStacks.has(actorId)) activeStacks.set(actorId, [])
    const st = activeStacks.get(actorId)
    st.push({ actorId, startStep: stepIdx, depth: st.length })
  }

  const popActivation = (actorId, stepIdx) => {
    const st = activeStacks.get(actorId)
    if (!st || st.length === 0) return
    const item = st.pop()
    activations.push({
      actorId,
      startStep: item.startStep,
      endStep: Math.max(item.startStep + 0.6, stepIdx),
      depth: item.depth,
    })
  }

  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i].trim()
    if (!line) continue
    if (i === 0 && /^sequenceDiagram\b/i.test(line)) continue
    if (/^autonumber\b/i.test(line)) {
      autonumber = true
      continue
    }
    if (/^(?:title|links|link|box)\b/i.test(line)) continue

    const actorDecl = /^(participant|actor)\s+(.+?)(?:\s+as\s+(.+))?$/i.exec(line)
    if (actorDecl) {
      ensureActor(actorDecl[2], actorDecl[3] ?? '', actorDecl[1].toLowerCase())
      continue
    }

    const actCmd = /^(activate|deactivate)\s+(.+)$/i.exec(line)
    if (actCmd) {
      const p = ensureActor(actCmd[2])
      if (p) {
        const curStep = Math.max(0, events.length - 0.25)
        if (actCmd[1].toLowerCase() === 'activate') pushActivation(p.id, curStep)
        else popActivation(p.id, curStep)
      }
      continue
    }

    const noteSingle = /^Note\s+(left of|right of|over)\s+([^:]+?)\s*:\s*(.+)$/i.exec(line)
    if (noteSingle) {
      const placement = noteSingle[1].toLowerCase().startsWith('left')
        ? 'left'
        : noteSingle[1].toLowerCase().startsWith('right')
          ? 'right'
          : 'over'
      const actorTokens = noteSingle[2].split(',').map((s) => ensureActor(s.trim())).filter(Boolean)
      if (actorTokens.length > 0) {
        events.push({
          type: 'note',
          step: events.length,
          placement,
          actors: actorTokens.map((a) => a.id),
          text: unquoteMermaidText(noteSingle[3]),
        })
      }
      continue
    }

    const frameOpen = /^(loop|alt|opt|par|critical|break)\b\s*(.*)$/i.exec(line)
    if (frameOpen) {
      const frame = {
        kind: frameOpen[1].toLowerCase(),
        label: unquoteMermaidText(frameOpen[2]),
        startStep: events.length,
        endStep: events.length,
        dividers: [],
        depth: frameStack.length,
      }
      frames.push(frame)
      frameStack.push(frame)
      events.push({ type: 'frame-start', step: events.length, frame })
      continue
    }

    const frameDiv = /^(else|and|option)\b\s*(.*)$/i.exec(line)
    if (frameDiv && frameStack.length > 0) {
      const top = frameStack[frameStack.length - 1]
      const div = { kind: frameDiv[1].toLowerCase(), label: unquoteMermaidText(frameDiv[2]), step: events.length }
      top.dividers.push(div)
      events.push({ type: 'frame-divider', step: events.length, divider: div })
      continue
    }

    if (/^end\s*$/i.test(line)) {
      const closed = frameStack.pop()
      if (closed) {
        closed.endStep = Math.max(closed.startStep, events.length - 1)
      }
      continue
    }

    const msgMatch = /^([^-=:>]+?)\s*(--?>>|--?>|--?[xX]|--?\))([+-])?\s*([^:]+?)\s*:\s*(.*)$/.exec(line)
    if (msgMatch) {
      const srcActor = ensureActor(msgMatch[1])
      const arrowToken = msgMatch[2]
      const actMod = msgMatch[3] || ''
      const dstActor = ensureActor(msgMatch[4])
      if (!srcActor || !dstActor) continue
      msgCount += 1
      const rawText = unquoteMermaidText(msgMatch[5])
      const text = autonumber ? msgCount + '. ' + rawText : rawText
      const isDash = arrowToken.startsWith('--')
      const head = arrowToken.endsWith('>>')
        ? 'filled'
        : /[xX]$/.test(arrowToken)
          ? 'cross'
          : arrowToken.endsWith(')')
            ? 'async'
            : 'open'
      const stepIdx = events.length
      events.push({
        type: 'message',
        step: stepIdx,
        from: srcActor.id,
        to: dstActor.id,
        arrow: arrowToken,
        dash: isDash ? 'dash' : '',
        head,
        text,
      })
      if (actMod === '+') pushActivation(dstActor.id, stepIdx)
      else if (actMod === '-') popActivation(srcActor.id, stepIdx)
    }
  }

  const finalStep = Math.max(0, events.length - 1)
  while (frameStack.length > 0) {
    const f = frameStack.pop()
    f.endStep = Math.max(f.startStep, finalStep)
  }
  for (const [actorId, st] of activeStacks.entries()) {
    while (st.length > 0) {
      const item = st.pop()
      activations.push({
        actorId,
        startStep: item.startStep,
        endStep: Math.max(item.startStep + 0.6, finalStep),
        depth: item.depth,
      })
    }
  }

  return {
    mode: 'sequence',
    autonumber,
    participants,
    events,
    frames,
    activations,
  }
}

export function layoutMermaidSequence(astInput, areaBox = { x: 0.62, y: 1.86, w: 12.09, h: 4.78 }) {
  const ast = astInput?.mode === 'sequence' ? astInput : parseMermaidSequence(astInput)
  const rawParts = ast.participants.length > 0
    ? ast.participants
    : [
        { id: 'Client', label: 'Client', kind: 'participant', index: 0 },
        { id: 'Server', label: 'Server', kind: 'participant', index: 1 },
      ]

  const pCount = rawParts.length
  const firstId = rawParts[0].id
  const lastId = rawParts[pCount - 1].id
  const hasLeftNote = ast.events.some((e) => e.type === 'note' && e.placement === 'left' && e.actors[0] === firstId)
  const hasRightExtra = ast.events.some(
    (e) =>
      (e.type === 'note' && e.placement === 'right' && e.actors[e.actors.length - 1] === lastId) ||
      (e.type === 'message' && e.from === lastId && e.to === lastId),
  )

  const leftPad = hasLeftNote ? 1.55 : 0.24
  const rightPad = hasRightExtra ? 1.55 : 0.24
  const usableW = Math.max(2.4, areaBox.w - leftPad - rightPad)

  const headH = 0.48
  const footH = 0.42
  const topY = areaBox.y + 0.02
  const botY = areaBox.y + areaBox.h - footH - 0.02

  const colSpan = pCount === 1 ? usableW : usableW / pCount
  const boxW = Math.min(2.10, Math.max(0.96, colSpan * 0.74))
  const participants = rawParts.map((p, idx) => {
    const cx = pCount === 1
      ? areaBox.x + leftPad + usableW / 2
      : areaBox.x + leftPad + boxW / 2 + idx * ((usableW - boxW) / Math.max(1, pCount - 1))
    const fit = computeTextFit(p.label, { w: boxW - 0.14, h: headH - 0.08 }, 'cardTitle', {
      maxPt: 12.5,
      minPt: 10,
      padXPt: 3,
      padYPt: 2,
    })
    return {
      ...p,
      cx: +cx.toFixed(4),
      w: +boxW.toFixed(4),
      fontPt: Math.max(10, fit.fontPt),
      topBox: { x: +(cx - boxW / 2).toFixed(4), y: +topY.toFixed(4), w: +boxW.toFixed(4), h: headH },
      bottomBox: { x: +(cx - boxW / 2).toFixed(4), y: +botY.toFixed(4), w: +boxW.toFixed(4), h: footH },
      lifelineTopY: +(topY + headH).toFixed(4),
      lifelineBottomY: +botY.toFixed(4),
    }
  })

  const partById = new Map(participants.map((p) => [p.id, p]))

  // 计算每条时序事件的纵向刻度 Y
  const bandTop = topY + headH + 0.22
  const bandBottom = botY - 0.18
  const bandH = Math.max(0.8, bandBottom - bandTop)

  const weights = ast.events.map((ev) => {
    if (ev.type === 'frame-start') return 0.78
    if (ev.type === 'frame-divider') return 0.64
    if (ev.type === 'note') return 1.32
    if (ev.type === 'message' && ev.from === ev.to) return 1.12
    return 0.88
  })
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1
  const unitH = Math.min(0.62, bandH / totalWeight)
  const usedBandH = totalWeight * unitH
  let cursorY = bandTop + Math.max(0, (bandH - usedBandH) * 0.28)

  const stepYs = []
  ast.events.forEach((ev, idx) => {
    const slotH = weights[idx] * unitH
    stepYs.push(cursorY + slotH * 0.54)
    cursorY += slotH
  })

  const yAtStep = (s) => {
    if (stepYs.length === 0) return (bandTop + bandBottom) / 2
    const lo = Math.max(0, Math.min(stepYs.length - 1, Math.floor(s)))
    const hi = Math.max(0, Math.min(stepYs.length - 1, Math.ceil(s)))
    const frac = s - Math.floor(s)
    return stepYs[lo] * (1 - frac) + stepYs[hi] * frac
  }

  // 布局组合片段框（loop / alt / opt / par）
  const positionedFrames = ast.frames.map((f, fIdx) => {
    const y1 = Math.max(topY + headH + 0.06, (stepYs[f.startStep] ?? bandTop) - unitH * 0.20)
    const y2 = Math.min(botY - 0.06, (stepYs[f.endStep] ?? bandBottom) + unitH * 0.44)
    const inset = f.depth * 0.14
    const minCx = Math.min(...participants.map((p) => p.topBox.x))
    const maxCx = Math.max(...participants.map((p) => p.topBox.x + p.w))
    const fx = Math.max(areaBox.x + 0.04, minCx - 0.18 + inset)
    const fw = Math.min(areaBox.x + areaBox.w - 0.04 - fx, maxCx - minCx + 0.36 - inset * 2)
    return {
      id: 'frame_' + (fIdx + 1),
      kind: f.kind.toUpperCase(),
      label: f.label,
      x: +fx.toFixed(4),
      y: +y1.toFixed(4),
      w: +Math.max(1.6, fw).toFixed(4),
      h: +Math.max(0.52, y2 - y1).toFixed(4),
      dividers: f.dividers.map((d) => ({
        kind: d.kind,
        label: d.label,
        y: +((stepYs[d.step] ?? (y1 + y2) / 2) - unitH * 0.06).toFixed(4),
      })),
    }
  })

  // 布局激活条（Activation Bars）
  const actW = 0.15
  const positionedActivations = ast.activations
    .map((act, idx) => {
      const p = partById.get(act.actorId)
      if (!p) return null
      const ay1 = Math.max(topY + headH + 0.08, yAtStep(act.startStep) - 0.04)
      const ay2 = Math.min(botY - 0.08, Math.max(ay1 + 0.24, yAtStep(act.endStep) + 0.06))
      const ax = p.cx - actW / 2 + act.depth * 0.05
      return {
        id: 'act_' + (idx + 1),
        actorId: act.actorId,
        x: +ax.toFixed(4),
        y: +ay1.toFixed(4),
        w: actW,
        h: +(ay2 - ay1).toFixed(4),
      }
    })
    .filter(Boolean)

  // 布局消息箭头与 Note 批注卡片（保障 Note 与后续消息标签之间留有安全间距）
  const positionedMessages = []
  const positionedNotes = []
  const msgFontPt = ast.events.filter((e) => e.type === 'message').length >= 9 ? 10 : 10.5
  let prevNoteBottom = -Infinity

  ast.events.forEach((ev, idx) => {
    const rawY = stepYs[idx] ?? bandTop
    if (ev.type === 'message') {
      const y = Number.isFinite(prevNoteBottom)
        ? Math.min(bandBottom - 0.04, Math.max(rawY, prevNoteBottom + 0.33))
        : rawY
      prevNoteBottom = -Infinity
      const src = partById.get(ev.from)
      const dst = partById.get(ev.to)
      if (!src || !dst) return
      const isSelf = src.id === dst.id
      if (isSelf) {
        const loopW = Math.min(0.68, Math.max(0.42, colSpan * 0.30))
        const loopH = Math.min(0.32, Math.max(0.20, unitH * 0.46))
        const startX = src.cx + 0.08
        const lblW = Math.min(2.4, Math.max(0.9, (measureEmWidth(ev.text, false) * msgFontPt) / 72 + 0.24))
        positionedMessages.push({
          ...ev,
          isSelf: true,
          y: +y.toFixed(4),
          x1: +startX.toFixed(4),
          x2: +(startX + loopW).toFixed(4),
          loopH: +loopH.toFixed(4),
          fontPt: msgFontPt,
          labelBox: {
            x: +Math.min(areaBox.x + areaBox.w - lblW - 0.04, startX + loopW + 0.08).toFixed(4),
            y: +(y - loopH * 0.55).toFixed(4),
            w: +lblW.toFixed(4),
            h: 0.26,
          },
        })
      } else {
        const dirSign = dst.cx >= src.cx ? 1 : -1
        const x1 = src.cx + dirSign * 0.08
        const x2 = dst.cx - dirSign * 0.08
        const spanW = Math.max(0.7, Math.abs(x2 - x1) - 0.14)
        const textW = Math.min(spanW, Math.max(0.65, (measureEmWidth(ev.text, false) * msgFontPt) / 72 + 0.22))
        const midX = (x1 + x2) / 2
        positionedMessages.push({
          ...ev,
          isSelf: false,
          y: +y.toFixed(4),
          x1: +x1.toFixed(4),
          x2: +x2.toFixed(4),
          fontPt: msgFontPt,
          labelBox: {
            x: +(midX - textW / 2).toFixed(4),
            y: +(y - 0.26).toFixed(4),
            w: +textW.toFixed(4),
            h: 0.23,
          },
        })
      }
    } else if (ev.type === 'note') {
      const y = rawY
      const actors = ev.actors.map((id) => partById.get(id)).filter(Boolean)
      if (actors.length === 0) return
      const minC = Math.min(...actors.map((a) => a.cx))
      const maxC = Math.max(...actors.map((a) => a.cx))
      let nw = Math.min(3.6, Math.max(1.45, (measureEmWidth(ev.text, false) * 10) / 72 + 0.42))
      let nx = minC - nw / 2
      if (ev.placement === 'left') {
        const availLeft = Math.max(1.35, minC - actors[0].w / 2 - 0.10 - (areaBox.x + 0.03))
        nw = Math.min(2.65, availLeft, nw)
        nx = Math.max(areaBox.x + 0.03, minC - actors[0].w / 2 - nw - 0.10)
      } else if (ev.placement === 'right') {
        const availRight = Math.max(1.35, (areaBox.x + areaBox.w - 0.03) - (maxC + actors[actors.length - 1].w / 2 + 0.10))
        nw = Math.min(2.65, availRight, nw)
        nx = Math.min(areaBox.x + areaBox.w - nw - 0.03, maxC + actors[actors.length - 1].w / 2 + 0.10)
      } else if (actors.length >= 2) {
        nw = Math.min(areaBox.w - 0.12, Math.max(nw, maxC - minC + 0.90))
        nx = (minC + maxC) / 2 - nw / 2
      } else {
        nw = Math.min(2.65, areaBox.w - 0.12, nw)
        nx = minC - nw / 2
      }
      nx = Math.max(areaBox.x + 0.03, Math.min(areaBox.x + areaBox.w - nw - 0.03, nx))
      const maxCharsPerLine = Math.max(8, Math.floor(((nw - 0.22) * 72) / 10.2))
      const noteLines = wrapNodeLabelLines(ev.text, maxCharsPerLine)
      const noteH = Math.min(0.56, Math.max(noteLines.length > 1 ? 0.44 : 0.34, unitH * (noteLines.length > 1 ? 0.82 : 0.68)))
      const noteFit = computeTextFit(noteLines, { w: Math.max(0.8, nw - 0.20), h: Math.max(0.24, noteH - 0.06) }, 'cardBody', {
        maxPt: 10,
        minPt: 8.5,
        padXPt: 2,
        padYPt: 1,
        lineHeight: 1.15,
        spaceAfterPt: 0,
        bold: false,
      })
      const ny = Math.max(bandTop - 0.06, Math.min(bandBottom - noteH, y - noteH / 2))
      prevNoteBottom = ny + noteH
      positionedNotes.push({
        ...ev,
        lines: noteLines,
        x: +nx.toFixed(4),
        y: +ny.toFixed(4),
        w: +nw.toFixed(4),
        h: +noteH.toFixed(4),
        fontPt: Math.max(8.5, noteFit.fontPt),
      })
    }
  })

  return {
    mode: 'sequence',
    areaBox,
    participants,
    frames: positionedFrames,
    activations: positionedActivations,
    messages: positionedMessages,
    notes: positionedNotes,
  }
}

export function compileMermaidSlide(slideOrText, areaBox = { x: 0.62, y: 1.86, w: 12.09, h: 4.78 }, fallbackVariant = '') {
  const mode = detectMermaidMode(slideOrText, fallbackVariant || slideOrText?.variant)
  if (mode === 'sequence') {
    const ast = parseMermaidSequence(slideOrText)
    return layoutMermaidSequence(ast, areaBox)
  }
  const ast = parseMermaidFlowchart(slideOrText)
  return layoutMermaidFlowchart(ast, areaBox)
}

// ---------------------------------------------------------------------------
// 5. PPTX 原生 OOXML 渲染器（100% <p:sp> 节点 + <p:cxnSp> <a:stCxn>/<a:endCxn> 连接线）
// ---------------------------------------------------------------------------

function resolveFlowNodePreset(shape, box, chromeCfg) {
  if (shape === 'stadium') return { preset: 'flowChartTerminator', marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 } }
  if (shape === 'diamond') return { preset: 'diamond', marginsIn: { l: 0.02, r: 0.02, t: 0.02, b: 0.02 } }
  if (shape === 'cylinder') return { preset: 'can', adjs: { adj: 20000 }, marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 } }
  if (shape === 'circle') return { preset: 'ellipse', marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 } }
  if (shape === 'subroutine') return { preset: 'flowChartPredefinedProcess', marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 } }
  if (shape === 'hexagon') return { preset: 'hexagon', marginsIn: { l: 0.10, r: 0.10, t: 0.03, b: 0.03 } }
  if (shape === 'parallelogram') return { preset: 'parallelogram', marginsIn: { l: 0.12, r: 0.12, t: 0.03, b: 0.03 } }
  if (shape === 'round') {
    const rPx = Math.max(14, chromeCfg.cardRadiusPx || 14)
    return { preset: 'roundRect', adj: roundRectAdj(box.w, box.h, rPx), marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 } }
  }
  const radius = chromeCfg.cardRadiusPx > 0 ? Math.min(10, chromeCfg.cardRadiusPx) : 6
  return {
    preset: radius > 0 ? 'roundRect' : 'rect',
    adj: roundRectAdj(box.w, box.h, radius),
    marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
  }
}

/**
 * 将逻辑四向连接点（0=top, 1=left, 2=bottom, 3=right）映射为特定 OOXML 预设几何体的精确 <cxnLst> 索引：
 * - rect / roundRect / diamond / flowChartTerminator / flowChartPredefinedProcess：4 站点 [0, 1, 2, 3]
 * - can（数据库圆柱）：ECMA-376 定义 5 站点（0=顶后缘, 1=顶前缘, 2=左, 3=底, 4=右） -> [0, 2, 3, 4]
 * - ellipse（椭圆）：ECMA-376 定义 8 站点（0=顶, 2=左, 4=底, 6=右） -> [0, 2, 4, 6]
 */
function resolveOoxmlConnectionSite(shape, cardinalIdx) {
  const idx = ((cardinalIdx % 4) + 4) % 4
  if (shape === 'cylinder') return [0, 2, 3, 4][idx]
  if (shape === 'circle') return [0, 2, 4, 6][idx]
  return idx
}

function resolveFlowNodePalette(node, theme) {
  const tk = theme.tokens
  const cs = node.customStyle || {}
  if (cs.fill) {
    const lum = relativeLuminance(cs.fill)
    return {
      fill: cs.fill,
      stroke: cs.stroke || tk.accentPrimary,
      textColor: cs.color || (lum < 0.38 ? '#FFFFFF' : '#0F172A'),
      strokePt: 1.25,
      bold: true,
    }
  }
  if (node.shape === 'stadium' || (node.isRoot && node.shape !== 'diamond')) {
    return {
      fill: tk.accentPrimary,
      stroke: tk.accentPrimary,
      textColor: tk.inkOnAccent,
      strokePt: 1.25,
      bold: true,
    }
  }
  if (node.shape === 'diamond') {
    return {
      fill: tk.accentSoft,
      stroke: tk.accentPrimary,
      textColor: tk.accentText,
      strokePt: 1.35,
      bold: true,
    }
  }
  if (node.shape === 'cylinder') {
    return {
      fill: tk.surface2,
      stroke: tk.accentSecondary,
      textColor: tk.inkPrimary,
      strokePt: 1.15,
      bold: true,
    }
  }
  if (node.shape === 'subroutine' || node.shape === 'circle') {
    return {
      fill: tk.accentSoft,
      stroke: tk.accentSecondary,
      textColor: tk.inkPrimary,
      strokePt: 1.1,
      bold: true,
    }
  }
  if (node.isSink) {
    return {
      fill: tk.accentSoft,
      stroke: tk.accentPrimary,
      textColor: tk.inkPrimary,
      strokePt: 1.15,
      bold: true,
    }
  }
  return {
    fill: tk.surface1,
    stroke: tk.hairline,
    textColor: tk.inkPrimary,
    strokePt: 1.0,
    bold: false,
  }
}

function renderFlowchartPptx(model, nextIdFn, chromeCfg, theme, langAttr) {
  const tk = theme.tokens
  const shapes = []

  // 1. Subgraph 容器簇（置于底层，带粗体簇标题）
  model.subgraphs.forEach((sg, idx) => {
    const sgFill = theme.dark
      ? mixHex(tk.surface1, tk.accentPrimary, 0.12)
      : mixHex(tk.surface1, tk.accentSoft, 0.42)
    shapes.push(ooxmlShape(nextIdFn(), 'Mermaid Subgraph ' + sg.id, sg, {
      preset: 'roundRect',
      adj: roundRectAdj(sg.w, sg.h, Math.max(8, chromeCfg.cardRadiusPx)),
      fill: sgFill,
      stroke: idx % 2 === 0 ? tk.accentPrimary : tk.accentSecondary,
      strokePt: 1.0,
      dash: 'dash',
      anchor: 't',
      marginsIn: { l: 0.14, r: 0.14, t: 0.06, b: 0.04 },
      paragraphs: [
        ooxmlRichParagraph(sg.title, {
          sizePt: 10.5,
          color: tk.accentText,
          bold: true,
          lang: langAttr,
          align: 'l',
          font: theme.fonts.heading,
          lineHeight: 1.15,
        }),
      ],
    }))
  })

  // 2. 先分配确定性节点 spid，再先绘制底层边连接线或后绘制节点？
  // 注意：为确保连接线箭头不被节点遮挡且与节点边缘精确相接，先为每个节点分配确定性 spid，发射节点 <p:sp>，再发射绑定到真实 spid 的 <p:cxnSp>
  const nodeSpids = new Map()
  model.nodes.forEach((node) => {
    nodeSpids.set(node.id, nextIdFn())
  })

  const nodeById = new Map(model.nodes.map((n) => [n.id, n]))
  model.nodes.forEach((node) => {
    const spid = nodeSpids.get(node.id)
    const geom = resolveFlowNodePreset(node.shape, node, chromeCfg)
    const pal = resolveFlowNodePalette(node, theme)
    const paras = node.lines.map((line, lIdx) =>
      ooxmlRichParagraph(line, {
        sizePt: node.fontPt,
        color: pal.textColor,
        bold: pal.bold || lIdx === 0,
        lang: langAttr,
        align: 'ctr',
        font: pal.bold ? theme.fonts.heading : theme.fonts.body,
        lineHeight: 1.16,
      }),
    )
    shapes.push(ooxmlShape(spid, 'Mermaid Node ' + node.id, node, {
      preset: geom.preset,
      adj: geom.adj,
      adjs: geom.adjs,
      fill: pal.fill,
      stroke: pal.stroke,
      strokePt: pal.strokePt,
      shadow: theme.shadow && !chromeCfg.cardBorderless,
      anchor: 'ctr',
      autofit: false,
      marginsIn: geom.marginsIn,
      paragraphs: paras,
    }))
  })

  // 3. 原生附着连接线 <p:cxnSp>（带 <a:stCxn> / <a:endCxn>），随后在顶层统一绘制边标签胶囊 <p:sp> 以防线条穿字
  const labelShapes = []
  model.edges.forEach((edge) => {
    const srcSpid = nodeSpids.get(edge.from)
    const dstSpid = nodeSpids.get(edge.to)
    const srcNode = nodeById.get(edge.from)
    const dstNode = nodeById.get(edge.to)
    const outOoxmlIdx = resolveOoxmlConnectionSite(srcNode?.shape, edge.outIdx)
    const inOoxmlIdx = resolveOoxmlConnectionSite(dstNode?.shape, edge.inIdx)
    const strokeColor = edge.thick ? tk.accentPrimary : (theme.dark ? tk.inkSecondary : mixHex(tk.inkSecondary, tk.accentPrimary, 0.32))
    const widthPt = edge.thick ? 2.25 : 1.4

    if (Array.isArray(edge.waypoints) && edge.waypoints.length >= 3) {
      for (let wi = 0; wi < edge.waypoints.length - 1; wi += 1) {
        const segFrom = edge.waypoints[wi]
        const segTo = edge.waypoints[wi + 1]
        const first = wi === 0
        const last = wi === edge.waypoints.length - 2
        // Attach only the outer ends. The intermediate bends retain the obstacle-avoiding route.
        shapes.push(ooxmlConnector(nextIdFn(), 'Mermaid Edge ' + edge.from + '->' + edge.to + ' Seg ' + (wi + 1), segFrom, segTo, {
          stCxn: first ? { id: srcSpid, idx: outOoxmlIdx } : null,
          endCxn: last ? { id: dstSpid, idx: inOoxmlIdx } : null,
          color: strokeColor,
          widthPt,
          dash: edge.dash,
          headArrow: first && Boolean(edge.headArrow),
          tailArrow: last && Boolean(edge.tailArrow),
        }))
      }
    } else {
      shapes.push(ooxmlConnector(nextIdFn(), 'Mermaid Edge ' + edge.from + '->' + edge.to, edge.fromPt, edge.toPt, {
        preset: edge.connectorPreset,
        orientation: edge.orientation,
        adj1: edge.adj1 ?? 50000,
        stCxn: { id: srcSpid, idx: outOoxmlIdx },
        endCxn: { id: dstSpid, idx: inOoxmlIdx },
        color: strokeColor,
        widthPt,
        dash: edge.dash,
        headArrow: edge.headArrow,
        tailArrow: edge.tailArrow,
      }))
    }

    if (edge.label && edge.labelBox) {
      labelShapes.push(ooxmlShape(nextIdFn(), 'Mermaid Edge Label ' + edge.id, edge.labelBox, {
        preset: 'roundRect',
        adj: 50000,
        fill: tk.canvas,
        stroke: tk.accentPrimary,
        strokePt: 0.75,
        anchor: 'ctr',
        autofit: false,
        marginsIn: { l: 0.04, r: 0.04, t: 0.01, b: 0.01 },
        paragraphs: [
          ooxmlRichParagraph(edge.label, {
            sizePt: edge.labelBox.fontPt,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.body,
            lineHeight: 1.05,
          }),
        ],
      }))
    }
  })

  shapes.push(...labelShapes)
  return shapes.join('')
}

function renderSequencePptx(model, nextIdFn, chromeCfg, theme, langAttr) {
  const tk = theme.tokens
  const shapes = []
  const cardPreset = chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect'

  // 1. 组合片段框（loop / alt / opt / par）与 else 分隔虚线
  model.frames.forEach((frame) => {
    const frameFill = theme.dark
      ? mixHex(tk.surface1, tk.accentPrimary, 0.10)
      : mixHex(tk.surface1, tk.accentSoft, 0.36)
    shapes.push(ooxmlShape(nextIdFn(), 'Sequence Frame ' + frame.kind, frame, {
      preset: 'rect',
      fill: frameFill,
      fillAlpha: 0.85,
      stroke: tk.accentPrimary,
      strokePt: 1.0,
    }))
    const tagW = Math.min(0.86, Math.max(0.56, frame.kind.length * 0.12 + 0.24))
    shapes.push(ooxmlShape(nextIdFn(), 'Sequence Frame Tag ' + frame.kind, { x: frame.x, y: frame.y, w: tagW, h: 0.24 }, {
      preset: 'homePlate',
      adjs: { adj: 22000 },
      fill: tk.accentPrimary,
      anchor: 'ctr',
      marginsIn: { l: 0.04, r: 0.08, t: 0.01, b: 0.01 },
      paragraphs: [
        ooxmlRichParagraph(frame.kind, {
          sizePt: 9.5,
          color: tk.inkOnAccent,
          bold: true,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.heading,
          lineHeight: 1.0,
        }),
      ],
    }))
    if (frame.label) {
      shapes.push(ooxmlShape(nextIdFn(), 'Sequence Frame Cond ' + frame.kind, {
        x: frame.x + tagW + 0.08,
        y: frame.y + 0.01,
        w: Math.max(0.6, frame.w - tagW - 0.14),
        h: 0.23,
      }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0.02, r: 0.02, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph('[' + frame.label + ']', {
            sizePt: 10,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            align: 'l',
            font: theme.fonts.body,
            lineHeight: 1.05,
          }),
        ],
      }))
    }
    frame.dividers.forEach((div, dIdx) => {
      shapes.push(ooxmlLine(nextIdFn(), 'Sequence Frame Divider ' + (dIdx + 1), { x: frame.x, y: div.y }, { x: frame.x + frame.w, y: div.y }, {
        color: tk.accentPrimary,
        widthPt: 0.85,
        dash: 'dash',
      }))
      const divText = '[' + (div.label ? div.kind + ' ' + div.label : div.kind) + ']'
      shapes.push(ooxmlShape(nextIdFn(), 'Sequence Frame Else ' + (dIdx + 1), { x: frame.x + 0.10, y: div.y + 0.02, w: Math.max(0.8, frame.w - 0.20), h: 0.22 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0.02, r: 0.02, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(divText, {
            sizePt: 9.5,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            align: 'l',
            font: theme.fonts.body,
            lineHeight: 1.05,
          }),
        ],
      }))
    })
  })

  // 2. 顶/底参与者卡片 <p:sp> 与附着生命线虚线 <p:cxnSp>
  model.participants.forEach((p, idx) => {
    const topSpid = nextIdFn()
    const botSpid = nextIdFn()
    const isPrimary = idx === 0
    const displayLabel = p.kind === 'actor' ? '◈ ' + p.label : p.label

    shapes.push(ooxmlShape(topSpid, 'Sequence Participant Top ' + p.id, p.topBox, {
      preset: cardPreset,
      adj: roundRectAdj(p.topBox.w, p.topBox.h, Math.min(8, chromeCfg.cardRadiusPx)),
      fill: isPrimary ? tk.accentPrimary : tk.surface2,
      stroke: tk.accentPrimary,
      strokePt: isPrimary ? 1.25 : 1.0,
      anchor: 'ctr',
      marginsIn: { l: 0.08, r: 0.08, t: 0.04, b: 0.04 },
      paragraphs: [
        ooxmlRichParagraph(displayLabel, {
          sizePt: p.fontPt,
          color: isPrimary ? tk.inkOnAccent : tk.inkPrimary,
          bold: true,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.heading,
          lineHeight: 1.15,
        }),
      ],
    }))

    shapes.push(ooxmlShape(botSpid, 'Sequence Participant Bottom ' + p.id, p.bottomBox, {
      preset: cardPreset,
      adj: roundRectAdj(p.bottomBox.w, p.bottomBox.h, Math.min(8, chromeCfg.cardRadiusPx)),
      fill: tk.surface1,
      stroke: tk.hairline,
      strokePt: 0.85,
      anchor: 'ctr',
      marginsIn: { l: 0.08, r: 0.08, t: 0.03, b: 0.03 },
      paragraphs: [
        ooxmlRichParagraph(displayLabel, {
          sizePt: Math.max(10, p.fontPt - 0.5),
          color: tk.inkSecondary,
          bold: true,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.heading,
          lineHeight: 1.1,
        }),
      ],
    }))

    shapes.push(ooxmlConnector(nextIdFn(), 'Sequence Lifeline ' + p.id, { x: p.cx, y: p.lifelineTopY }, { x: p.cx, y: p.lifelineBottomY }, {
      preset: 'straightConnector1',
      stCxn: { id: topSpid, idx: 2 },
      endCxn: { id: botSpid, idx: 0 },
      color: tk.inkMuted,
      widthPt: 1.0,
      dash: 'dash',
      tailArrow: false,
    }))
  })

  // 3. 生命线激活条（Activation Bars）
  model.activations.forEach((act) => {
    shapes.push(ooxmlShape(nextIdFn(), 'Sequence Activation ' + act.id, act, {
      preset: 'rect',
      fill: tk.accentSoft,
      stroke: tk.accentPrimary,
      strokePt: 1.0,
    }))
  })

  // 4. 横向/自环消息连接线 <p:cxnSp> 与上方文本胶囊
  model.messages.forEach((msg, idx) => {
    const strokeCol = msg.dash ? tk.accentSecondary : tk.accentPrimary
    const endType = msg.head === 'cross' ? 'oval' : msg.head === 'open' || msg.head === 'async' ? 'arrow' : 'triangle'
    if (msg.isSelf) {
      const yTop = msg.y - msg.loopH / 2
      const yBot = msg.y + msg.loopH / 2
      shapes.push(ooxmlLine(nextIdFn(), 'Sequence Self Out ' + (idx + 1), { x: msg.x1, y: yTop }, { x: msg.x2, y: yTop }, {
        color: strokeCol,
        widthPt: 1.35,
        dash: msg.dash,
      }))
      shapes.push(ooxmlLine(nextIdFn(), 'Sequence Self Down ' + (idx + 1), { x: msg.x2, y: yTop }, { x: msg.x2, y: yBot }, {
        color: strokeCol,
        widthPt: 1.35,
        dash: msg.dash,
      }))
      shapes.push(ooxmlConnector(nextIdFn(), 'Sequence Message ' + (idx + 1), { x: msg.x2, y: yBot }, { x: msg.x1, y: yBot }, {
        preset: 'straightConnector1',
        color: strokeCol,
        widthPt: 1.35,
        dash: msg.dash,
        tailArrow: true,
        tailEndType: endType,
      }))
    } else {
      shapes.push(ooxmlConnector(nextIdFn(), 'Sequence Message ' + (idx + 1), { x: msg.x1, y: msg.y }, { x: msg.x2, y: msg.y }, {
        preset: 'straightConnector1',
        color: strokeCol,
        widthPt: 1.4,
        dash: msg.dash,
        tailArrow: true,
        tailEndType: endType,
      }))
    }

    if (msg.text) {
      shapes.push(ooxmlShape(nextIdFn(), 'Sequence Label ' + (idx + 1), msg.labelBox, {
        preset: 'roundRect',
        adj: 24000,
        fill: tk.canvas,
        fillAlpha: 0.92,
        anchor: 'ctr',
        marginsIn: { l: 0.04, r: 0.04, t: 0.01, b: 0.01 },
        paragraphs: [
          ooxmlRichParagraph(msg.text, {
            sizePt: msg.fontPt,
            color: tk.inkPrimary,
            bold: !msg.dash,
            lang: langAttr,
            align: msg.isSelf ? 'l' : 'ctr',
            font: theme.fonts.body,
            lineHeight: 1.08,
          }),
        ],
      }))
    }
  })

  // 5. Note 批注卡片
  model.notes.forEach((note, idx) => {
    const noteFill = theme.dark
      ? mixHex(tk.surface2, tk.warning, 0.18)
      : mixHex(tk.surface1, '#FEF3C7', 0.65)
    const noteLines = Array.isArray(note.lines) && note.lines.length > 0 ? note.lines : [note.text]
    shapes.push(ooxmlShape(nextIdFn(), 'Sequence Note ' + (idx + 1), note, {
      preset: 'foldedCorner',
      fill: noteFill,
      stroke: tk.accentSecondary,
      strokePt: 0.85,
      anchor: 'ctr',
      marginsIn: { l: 0.07, r: 0.09, t: 0.03, b: 0.03 },
      paragraphs: noteLines.map((ln) =>
        ooxmlRichParagraph(ln, {
          sizePt: note.fontPt,
          color: tk.inkPrimary,
          bold: false,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.body,
          lineHeight: 1.14,
        }),
      ),
    }))
  })

  return shapes.join('')
}

export function renderMermaidPptx(slide, area, nextIdFn, chromeCfg, theme, langAttr) {
  const model = compileMermaidSlide(slide, area, slide.variant)
  if (model.mode === 'sequence') {
    return renderSequencePptx(model, nextIdFn, chromeCfg, theme, langAttr)
  }
  return renderFlowchartPptx(model, nextIdFn, chromeCfg, theme, langAttr)
}

// ---------------------------------------------------------------------------
// 6. HTML 语义化矢量图渲染器（<svg class="deck-mermaid-svg">）
// ---------------------------------------------------------------------------

function svgFlowShapeMarkup(node, px) {
  const x = px(node.x)
  const y = px(node.y)
  const w = px(node.w)
  const h = px(node.h)
  const cls = 'mm-node mm-shape-' + escapeHtml(node.shape) + (node.isRoot ? ' is-root' : node.isSink ? ' is-sink' : '')
  const styleAttr = node.customStyle?.fill
    ? ' style="fill:' + escapeHtml(node.customStyle.fill) + ';stroke:' + escapeHtml(node.customStyle.stroke || 'var(--accent)') + '"'
    : ''

  if (node.shape === 'diamond') {
    const pts = `${(x + w / 2).toFixed(1)},${y.toFixed(1)} ${(x + w).toFixed(1)},${(y + h / 2).toFixed(1)} ${(x + w / 2).toFixed(1)},${(y + h).toFixed(1)} ${x.toFixed(1)},${(y + h / 2).toFixed(1)}`
    return `<polygon class="${cls}" points="${pts}"${styleAttr}/>`
  }
  if (node.shape === 'circle') {
    return `<ellipse class="${cls}" cx="${(x + w / 2).toFixed(1)}" cy="${(y + h / 2).toFixed(1)}" rx="${(w / 2).toFixed(1)}" ry="${(h / 2).toFixed(1)}"${styleAttr}/>`
  }
  if (node.shape === 'stadium') {
    const r = (h / 2).toFixed(1)
    return `<rect class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${r}" ry="${r}"${styleAttr}/>`
  }
  if (node.shape === 'cylinder') {
    const ry = Math.min(11, h * 0.16)
    const x1 = x.toFixed(1)
    const x2 = (x + w).toFixed(1)
    const yTop = (y + ry).toFixed(1)
    const yBot = (y + h - ry).toFixed(1)
    const rx = (w / 2).toFixed(1)
    const ryStr = ry.toFixed(1)
    return (
      `<path class="${cls}" d="M ${x1} ${yTop} A ${rx} ${ryStr} 0 0 1 ${x2} ${yTop} L ${x2} ${yBot} A ${rx} ${ryStr} 0 0 1 ${x1} ${yBot} Z"${styleAttr}/>` +
      `<path class="mm-cyl-cap" d="M ${x1} ${yTop} A ${rx} ${ryStr} 0 0 0 ${x2} ${yTop}"/>`
    )
  }
  if (node.shape === 'subroutine') {
    const inset = Math.max(8, w * 0.09)
    return (
      `<rect class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="6"${styleAttr}/>` +
      `<line class="mm-sub-rail" x1="${(x + inset).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + inset).toFixed(1)}" y2="${(y + h).toFixed(1)}"/>` +
      `<line class="mm-sub-rail" x1="${(x + w - inset).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + w - inset).toFixed(1)}" y2="${(y + h).toFixed(1)}"/>`
    )
  }
  const rx = node.shape === 'round' ? 14 : 8
  return `<rect class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${rx}"${styleAttr}/>`
}

function buildEdgePathSvg(edge, px) {
  if (Array.isArray(edge.waypoints) && edge.waypoints.length >= 3) {
    const pts = edge.waypoints.map((pt) => ({ x: px(pt.x), y: px(pt.y) }))
    const r = 10
    const parts = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`]
    for (let i = 1; i < pts.length - 1; i += 1) {
      const prev = pts[i - 1]
      const cur = pts[i]
      const next = pts[i + 1]
      const d1 = Math.hypot(cur.x - prev.x, cur.y - prev.y)
      const d2 = Math.hypot(next.x - cur.x, next.y - cur.y)
      const cr = Math.min(r, d1 / 2, d2 / 2)
      if (cr < 2) {
        parts.push(`L ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}`)
      } else {
        const ax = cur.x - ((cur.x - prev.x) / d1) * cr
        const ay = cur.y - ((cur.y - prev.y) / d1) * cr
        const bx = cur.x + ((next.x - cur.x) / d2) * cr
        const by = cur.y + ((next.y - cur.y) / d2) * cr
        parts.push(`L ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${cur.x.toFixed(1)} ${cur.y.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`)
      }
    }
    const last = pts[pts.length - 1]
    parts.push(`L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`)
    return parts.join(' ')
  }
  const x1 = px(edge.fromPt.x)
  const y1 = px(edge.fromPt.y)
  const x2 = px(edge.toPt.x)
  const y2 = px(edge.toPt.y)
  if (edge.connectorPreset === 'straightConnector1') {
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`
  }
  const r = 8
  const bendFrac = Math.max(0.1, Math.min(0.9, (edge.adj1 ?? 50000) / 100000))
  if (edge.orientation === 'vertical') {
    const my = y1 + (y2 - y1) * bendFrac
    const sx = x2 >= x1 ? 1 : -1
    const sy = y2 >= y1 ? 1 : -1
    const er = Math.min(r, Math.abs(x2 - x1) / 2, Math.abs(my - y1), Math.abs(y2 - my))
    if (er < 2) return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x1.toFixed(1)} ${my.toFixed(1)} L ${x2.toFixed(1)} ${my.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`
    return (
      `M ${x1.toFixed(1)} ${y1.toFixed(1)} ` +
      `L ${x1.toFixed(1)} ${(my - sy * er).toFixed(1)} ` +
      `Q ${x1.toFixed(1)} ${my.toFixed(1)} ${(x1 + sx * er).toFixed(1)} ${my.toFixed(1)} ` +
      `L ${(x2 - sx * er).toFixed(1)} ${my.toFixed(1)} ` +
      `Q ${x2.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${(my + sy * er).toFixed(1)} ` +
      `L ${x2.toFixed(1)} ${y2.toFixed(1)}`
    )
  }
  const mx = x1 + (x2 - x1) * bendFrac
  const sx = x2 >= x1 ? 1 : -1
  const sy = y2 >= y1 ? 1 : -1
  const er = Math.min(r, Math.abs(mx - x1), Math.abs(x2 - mx), Math.abs(y2 - y1) / 2)
  if (er < 2) return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${mx.toFixed(1)} ${y1.toFixed(1)} L ${mx.toFixed(1)} ${y2.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`
  return (
    `M ${x1.toFixed(1)} ${y1.toFixed(1)} ` +
    `L ${(mx - sx * er).toFixed(1)} ${y1.toFixed(1)} ` +
    `Q ${mx.toFixed(1)} ${y1.toFixed(1)} ${mx.toFixed(1)} ${(y1 + sy * er).toFixed(1)} ` +
    `L ${mx.toFixed(1)} ${(y2 - sy * er).toFixed(1)} ` +
    `Q ${mx.toFixed(1)} ${y2.toFixed(1)} ${(mx + sx * er).toFixed(1)} ${y2.toFixed(1)} ` +
    `L ${x2.toFixed(1)} ${y2.toFixed(1)}`
  )
}

export function renderMermaidHtml(slide, index = 0) {
  const area = { x: 0, y: 0, w: 12.09, h: 4.78 }
  const model = compileMermaidSlide(slide, area, slide.variant)
  const scale = 100 // 1 inch -> 100 SVG units => 1209 × 478 viewBox
  const px = (v) => v * scale
  const uid = 'mm-' + (index + 1)
  const ariaLabel = escapeHtml(slide.title || (model.mode === 'sequence' ? 'Sequence Diagram' : 'Flowchart'))

  const defs = (
    `<defs>` +
    `<marker id="${uid}-arrow" viewBox="0 0 10 10" refX="8.8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1.2 L 9 5 L 0 8.8 z" fill="var(--accent)"/></marker>` +
    `<marker id="${uid}-arrow-muted" viewBox="0 0 10 10" refX="8.8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="var(--ink-secondary)"/></marker>` +
    `<marker id="${uid}-cross" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 1.5 1.5 L 8.5 8.5 M 8.5 1.5 L 1.5 8.5" stroke="var(--negative)" stroke-width="2"/></marker>` +
    `</defs>`
  )

  if (model.mode === 'sequence') {
    const framesSvg = model.frames.map((f) => {
      const x = px(f.x).toFixed(1)
      const y = px(f.y).toFixed(1)
      const w = px(f.w).toFixed(1)
      const h = px(f.h).toFixed(1)
      const tagW = Math.max(54, f.kind.length * 11 + 22)
      const divs = f.dividers.map((d) =>
        `<line class="mm-seq-div" x1="${x}" y1="${px(d.y).toFixed(1)}" x2="${(px(f.x + f.w)).toFixed(1)}" y2="${px(d.y).toFixed(1)}"/>` +
        `<text class="mm-seq-cond" x="${(px(f.x) + 12).toFixed(1)}" y="${(px(d.y) + 17).toFixed(1)}">[${escapeHtml(d.label ? d.kind + ' ' + d.label : d.kind)}]</text>`,
      ).join('')
      return (
        `<g class="mm-seq-frame">` +
        `<rect class="mm-frame-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>` +
        `<polygon class="mm-frame-tag" points="${x},${y} ${(Number(x) + tagW).toFixed(1)},${y} ${(Number(x) + tagW).toFixed(1)},${(Number(y) + 15).toFixed(1)} ${(Number(x) + tagW - 9).toFixed(1)},${(Number(y) + 24).toFixed(1)} ${x},${(Number(y) + 24).toFixed(1)}"/>` +
        `<text class="mm-frame-tag-txt" x="${(Number(x) + (tagW - 4) / 2).toFixed(1)}" y="${(Number(y) + 16).toFixed(1)}" text-anchor="middle">${escapeHtml(f.kind)}</text>` +
        (f.label ? `<text class="mm-seq-cond" x="${(Number(x) + tagW + 10).toFixed(1)}" y="${(Number(y) + 17).toFixed(1)}">[${escapeHtml(f.label)}]</text>` : '') +
        divs +
        `</g>`
      )
    }).join('')

    const partsSvg = model.participants.map((p, idx) => {
      const label = p.kind === 'actor' ? '◈ ' + p.label : p.label
      const tx = px(p.topBox.x).toFixed(1)
      const ty = px(p.topBox.y).toFixed(1)
      const tw = px(p.topBox.w).toFixed(1)
      const th = px(p.topBox.h).toFixed(1)
      const by = px(p.bottomBox.y).toFixed(1)
      const bh = px(p.bottomBox.h).toFixed(1)
      const cx = px(p.cx).toFixed(1)
      return (
        `<g class="mm-seq-participant${idx === 0 ? ' is-primary' : ''}" data-participant="${escapeHtml(p.id)}">` +
        `<line class="mm-lifeline" x1="${cx}" y1="${px(p.lifelineTopY).toFixed(1)}" x2="${cx}" y2="${px(p.lifelineBottomY).toFixed(1)}"/>` +
        `<rect class="mm-part-top${idx === 0 ? ' is-primary' : ''}" x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="7"/>` +
        `<text class="mm-part-txt${idx === 0 ? ' is-primary' : ''}" x="${cx}" y="${(px(p.topBox.y + p.topBox.h / 2) + 5).toFixed(1)}" text-anchor="middle">${escapeHtml(label)}</text>` +
        `<rect class="mm-part-bot" x="${tx}" y="${by}" width="${tw}" height="${bh}" rx="7"/>` +
        `<text class="mm-part-bot-txt" x="${cx}" y="${(px(p.bottomBox.y + p.bottomBox.h / 2) + 4.5).toFixed(1)}" text-anchor="middle">${escapeHtml(label)}</text>` +
        `</g>`
      )
    }).join('')

    const actsSvg = model.activations.map((a) =>
      `<rect class="mm-seq-act" x="${px(a.x).toFixed(1)}" y="${px(a.y).toFixed(1)}" width="${px(a.w).toFixed(1)}" height="${px(a.h).toFixed(1)}" rx="2"/>`,
    ).join('')

    const msgsSvg = model.messages.map((m) => {
      const markerEnd = m.head === 'cross' ? `url(#${uid}-cross)` : `url(#${uid}-arrow)`
      const dashClass = m.dash ? ' is-dash' : ''
      const lineMarkup = m.isSelf
        ? `<path class="mm-seq-msg${dashClass}" d="M ${px(m.x1).toFixed(1)} ${px(m.y - m.loopH / 2).toFixed(1)} L ${px(m.x2).toFixed(1)} ${px(m.y - m.loopH / 2).toFixed(1)} L ${px(m.x2).toFixed(1)} ${px(m.y + m.loopH / 2).toFixed(1)} L ${px(m.x1).toFixed(1)} ${px(m.y + m.loopH / 2).toFixed(1)}" fill="none" marker-end="${markerEnd}"/>`
        : `<line class="mm-seq-msg${dashClass}" x1="${px(m.x1).toFixed(1)}" y1="${px(m.y).toFixed(1)}" x2="${px(m.x2).toFixed(1)}" y2="${px(m.y).toFixed(1)}" marker-end="${markerEnd}"/>`
      const lb = m.labelBox
      return (
        `<g class="mm-seq-msg-grp">` +
        lineMarkup +
        (m.text
          ? `<rect class="mm-edge-pill" x="${px(lb.x).toFixed(1)}" y="${px(lb.y).toFixed(1)}" width="${px(lb.w).toFixed(1)}" height="${px(lb.h).toFixed(1)}" rx="5"/>` +
            `<text class="mm-seq-msg-txt" x="${px(lb.x + lb.w / 2).toFixed(1)}" y="${(px(lb.y + lb.h / 2) + 4.5).toFixed(1)}" text-anchor="middle">${escapeHtml(m.text)}</text>`
          : '') +
        `</g>`
      )
    }).join('')

    const notesSvg = model.notes.map((n) => {
      const noteLines = Array.isArray(n.lines) && n.lines.length > 0 ? n.lines : [n.text]
      const cx = px(n.x + n.w / 2)
      const cy = px(n.y + n.h / 2)
      const maxLineEm = Math.max(1, ...noteLines.map((ln) => measureEmWidth(ln, false)))
      const boxInnerPx = Math.max(40, px(n.w) - 16)
      const fontSize = Math.max(9.5, Math.min(12, (n.fontPt || 10) * 1.16, boxInnerPx / maxLineEm))
      const lineStep = fontSize * 1.24
      const startY = cy - ((noteLines.length - 1) * lineStep) / 2 + fontSize * 0.35
      const tspans = noteLines.map((ln, i) =>
        `<tspan x="${cx.toFixed(1)}" y="${(startY + i * lineStep).toFixed(1)}">${escapeHtml(ln)}</tspan>`,
      ).join('')
      return (
        `<g class="mm-seq-note">` +
        `<rect class="mm-note-box" x="${px(n.x).toFixed(1)}" y="${px(n.y).toFixed(1)}" width="${px(n.w).toFixed(1)}" height="${px(n.h).toFixed(1)}" rx="6"/>` +
        `<text class="mm-note-txt" font-size="${fontSize.toFixed(1)}" text-anchor="middle">${tspans}</text>` +
        `</g>`
      )
    }).join('')

    return (
      `<div class="mermaid-board is-sequence" data-mermaid-mode="sequence">` +
      `<svg class="deck-mermaid-svg" viewBox="0 0 1209 478" role="img" aria-label="${ariaLabel}">` +
      defs + framesSvg + partsSvg + actsSvg + msgsSvg + notesSvg +
      `</svg></div>`
    )
  }

  // Flowchart SVG
  const sgSvg = model.subgraphs.map((sg) =>
    `<g class="mm-subgraph" data-subgraph="${escapeHtml(sg.id)}">` +
    `<rect class="mm-sg-box" x="${px(sg.x).toFixed(1)}" y="${px(sg.y).toFixed(1)}" width="${px(sg.w).toFixed(1)}" height="${px(sg.h).toFixed(1)}" rx="10"/>` +
    `<text class="mm-sg-title" x="${(px(sg.x) + 14).toFixed(1)}" y="${(px(sg.y) + 21).toFixed(1)}">${escapeHtml(sg.title)}</text>` +
    `</g>`,
  ).join('')

  const edgesSvg = model.edges.map((e) => {
    const d = buildEdgePathSvg(e, px)
    const cls = 'mm-edge' + (e.dash ? ' is-dash' : '') + (e.thick ? ' is-thick' : '')
    const mStart = e.headArrow ? ` marker-start="url(#${uid}-arrow)"` : ''
    const mEnd = e.tailArrow ? ` marker-end="url(#${uid}-${e.thick ? 'arrow' : 'arrow-muted'})"` : ''
    return `<g class="mm-edge-grp" data-from="${escapeHtml(e.from)}" data-to="${escapeHtml(e.to)}"><path class="${cls}" d="${d}" fill="none"${mStart}${mEnd}/></g>`
  }).join('')

  const edgeLabelsSvg = model.edges.map((e) => {
    const lb = e.labelBox
    if (!e.label || !lb) return ''
    return (
      `<g class="mm-edge-lbl">` +
      `<rect class="mm-edge-pill is-bordered" x="${px(lb.x).toFixed(1)}" y="${px(lb.y).toFixed(1)}" width="${px(lb.w).toFixed(1)}" height="${px(lb.h).toFixed(1)}" rx="12"/>` +
      `<text class="mm-edge-txt" x="${px(lb.x + lb.w / 2).toFixed(1)}" y="${(px(lb.y + lb.h / 2) + 4.5).toFixed(1)}" text-anchor="middle">${escapeHtml(e.label)}</text>` +
      `</g>`
    )
  }).join('')

  const nodesSvg = model.nodes.map((n) => {
    const cx = px(n.cx)
    const cy = px(n.cy) + (n.shape === 'cylinder' ? 5 : 0)
    const fontSize = Math.max(12.5, n.fontPt * 1.18)
    const lineStep = fontSize * 1.24
    const startY = cy - ((n.lines.length - 1) * lineStep) / 2 + fontSize * 0.35
    const textCls = 'mm-node-txt' + ((n.shape === 'stadium' || (n.isRoot && n.shape !== 'diamond')) && !n.customStyle?.fill ? ' is-on-accent' : '')
    const tspans = n.lines.map((ln, i) =>
      `<tspan x="${cx.toFixed(1)}" y="${(startY + i * lineStep).toFixed(1)}">${escapeHtml(ln)}</tspan>`,
    ).join('')
    return (
      `<g class="mm-node-grp" data-node="${escapeHtml(n.id)}">` +
      svgFlowShapeMarkup(n, px) +
      `<text class="${textCls}" font-size="${fontSize.toFixed(1)}" text-anchor="middle">${tspans}</text>` +
      `</g>`
    )
  }).join('')

  return (
    `<div class="mermaid-board is-flowchart" data-mermaid-mode="flowchart" data-direction="${escapeHtml(model.direction)}">` +
    `<svg class="deck-mermaid-svg" viewBox="0 0 1209 478" role="img" aria-label="${ariaLabel}">` +
    defs + sgSvg + edgesSvg + nodesSvg + edgeLabelsSvg +
    `</svg></div>`
  )
}

export const MERMAID_CSS = `
.mermaid-board{width:100%;flex:1 1 0;min-height:0;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
svg.deck-mermaid-svg{width:100%;height:100%;max-height:100%;display:block;font-family:var(--font-body)}
.mm-sg-box{fill:color-mix(in srgb, var(--surface1) 62%, var(--accent-soft));stroke:var(--accent);stroke-width:1.4;stroke-dasharray:6 4}
.mm-sg-title{fill:var(--accent-text);font-family:var(--font-heading);font-weight:800;font-size:13.5px;letter-spacing:.03em}
.mm-node{fill:var(--surface1);stroke:var(--hairline);stroke-width:1.4}
.mm-node.mm-shape-stadium,.mm-node.is-root:not(.mm-shape-diamond){fill:var(--accent);stroke:var(--accent)}
.mm-node.mm-shape-diamond{fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.8}
.mm-node.mm-shape-cylinder{fill:var(--surface2);stroke:var(--accent2);stroke-width:1.5}
.mm-node.mm-shape-subroutine,.mm-node.mm-shape-circle,.mm-node.is-sink:not(.mm-shape-stadium):not(.is-root){fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.5}
.mm-cyl-cap,.mm-sub-rail{fill:none;stroke:var(--accent2);stroke-width:1.3}
.mm-node-txt{fill:var(--fg);font-family:var(--font-heading);font-weight:700}
.mm-node-txt.is-on-accent{fill:var(--ink-on-accent)}
.mm-edge{stroke:var(--ink-secondary);stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}
.mm-edge.is-dash{stroke-dasharray:6 4}
.mm-edge.is-thick{stroke:var(--accent);stroke-width:2.8}
.mm-edge-pill{fill:var(--bg);opacity:.95}
.mm-edge-pill.is-bordered{stroke:var(--accent);stroke-width:1.1}
.mm-edge-txt{fill:var(--accent-text);font-size:12px;font-weight:700}
.mm-frame-box{fill:color-mix(in srgb, var(--surface1) 70%, var(--accent-soft));stroke:var(--accent);stroke-width:1.3}
.mm-frame-tag{fill:var(--accent)}
.mm-frame-tag-txt{fill:var(--ink-on-accent);font-family:var(--font-heading);font-size:11px;font-weight:800;letter-spacing:.06em}
.mm-seq-cond{fill:var(--accent-text);font-size:12px;font-weight:700}
.mm-seq-div{stroke:var(--accent);stroke-width:1.15;stroke-dasharray:5 4}
.mm-lifeline{stroke:var(--muted);stroke-width:1.3;stroke-dasharray:5 4}
.mm-part-top{fill:var(--surface2);stroke:var(--accent);stroke-width:1.4}
.mm-part-top.is-primary{fill:var(--accent);stroke:var(--accent)}
.mm-part-txt{fill:var(--fg);font-family:var(--font-heading);font-size:13.5px;font-weight:800}
.mm-part-txt.is-primary{fill:var(--ink-on-accent)}
.mm-part-bot{fill:var(--surface1);stroke:var(--hairline);stroke-width:1.1}
.mm-part-bot-txt{fill:var(--ink-secondary);font-family:var(--font-heading);font-size:12.5px;font-weight:700}
.mm-seq-act{fill:var(--accent-soft);stroke:var(--accent);stroke-width:1.3}
.mm-seq-msg{stroke:var(--accent);stroke-width:1.85}
.mm-seq-msg.is-dash{stroke:var(--accent2);stroke-dasharray:6 4}
.mm-seq-msg-txt{fill:var(--fg);font-size:12.5px;font-weight:600}
.mm-note-box{fill:color-mix(in srgb, var(--surface2) 72%, var(--warning));stroke:var(--accent2);stroke-width:1.2}
.mm-note-txt{fill:var(--fg);font-size:12px;font-weight:600}
`

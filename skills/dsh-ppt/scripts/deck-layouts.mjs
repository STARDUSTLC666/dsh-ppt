/**
 * deck-layouts.mjs —— dsh-ppt 模块化版式总入口与核心基础版式渲染器。
 *
 * 子模块职责划分：
 *   - deck-chrome.mjs   ：16:9 几何/富文本基元、OOXML 基础图元/连接线、6 套母版骨架（Chrome Skeletons）
 *   - deck-diagrams.mjs ：10 套重型咨询与工程图示（gantt/architecture/harvey/tam/org/marimekko/sankey/value-chain/swot/process）
 *   - deck-mermaid.mjs  ：确定性 Mermaid（flowchart & sequenceDiagram）→ 100% 原生可编辑 OOXML 图形/附着连接线 + HTML SVG 编译器
 *   - deck-layouts.mjs  ：开场/过场/金句/议程/KPI/Bento 卡片/对比/2x2 矩阵/原生公式标注/表格/要点版式与全量公共符号重导出
 *
 * 零外部运行时依赖，仅使用 Node 内置模块。
 */

import { relativeLuminance, resolveChromeStyle, mixHex } from './deck-themes.mjs'
import {
  normalizeIconName,
  resolveSemanticIcon,
  renderIconBadgePptx,
  renderIconBadgeHtml,
} from './deck-icons.mjs'
import { resolveActiveTaste } from './deck-taste.mjs'
import {
  POSTER_COVER_VARIANTS,
  renderPosterCoverPptx,
  renderPosterCoverHtml,
  resolveSectionAgendaChapters,
  renderSectionAgendaPptx,
  renderSectionAgendaHtml,
  AESTHETIC_STUDIO_CSS,
} from './deck-covers.mjs'
import {
  containsLatexMath,
  looksLikeRawLatex,
  unwrapOuterMathDelimiters,
  splitMathSegments,
  parseLatexMath,
  latexToMathMl,
  has2dMathConstruct,
  fitFormulaBoxIn,
} from './deck-math.mjs'
import {
  CANVAS_IN,
  EMU_PER_IN,
  EMU_PER_PT,
  EMU_W,
  EMU_H,
  inToEmu,
  ptToEmu,
  boxToEmu,
  boxToCssPct,
  roundRectAdj,
  hexToRgbaSafeHex,
  escapeXml,
  escapeHtml,
  stripInlineMarkdown,
  cleanRichText,
  parseInlineRuns,
  renderInlineHtml,
  measureEmWidth,
  computeTextFit,
  normalizeSlideItems,
  resolveEffectiveItems,
  statusPalette,
  isNumericCell,
  ooxmlSolidFill,
  ooxmlLinearGradientFill,
  ooxmlRichParagraph,
  ooxmlShape,
  ooxmlCustGeomShape,
  ooxmlMathShape,
  renderMathCardPptx,
  ooxmlLine,
  ooxmlConnector,
  formatSourceLine,
  computeBadgePillWidth,
  getChromeConfig,
  renderSurfaceCardPptx,
  renderSlideChromePptx,
  renderStandardHeaderPptx,
  renderSlideHeaderHtml,
  renderSlideChromeHtml,
  CHROME_CSS,
} from './deck-chrome.mjs'
import {
  DIAGRAM_LAYOUTS,
  parseHarveyValue,
  renderHarveyMatrixPptx,
  renderHarveyTableHtml,
  computeMarimekkoModel,
  computeSankeyLayout,
  partitionValueChainItems,
  computeSwotModel,
  renderDiagramSlideBodyPptx,
  renderDiagramSlideBodyHtml,
  DIAGRAMS_CSS,
} from './deck-diagrams.mjs'
import {
  extractMermaidSource,
  detectMermaidMode,
  parseMermaidFlowchart,
  layoutMermaidFlowchart,
  parseMermaidSequence,
  layoutMermaidSequence,
  compileMermaidSlide,
  renderMermaidPptx,
  renderMermaidHtml,
  MERMAID_CSS,
} from './deck-mermaid.mjs'

export {
  CANVAS_IN,
  EMU_PER_IN,
  EMU_PER_PT,
  EMU_W,
  EMU_H,
  inToEmu,
  ptToEmu,
  boxToEmu,
  boxToCssPct,
  roundRectAdj,
  escapeXml,
  escapeHtml,
  stripInlineMarkdown,
  cleanRichText,
  parseInlineRuns,
  renderInlineHtml,
  measureEmWidth,
  computeTextFit,
  normalizeSlideItems,
  resolveEffectiveItems,
  ooxmlSolidFill,
  ooxmlLinearGradientFill,
  ooxmlRichParagraph,
  ooxmlShape,
  ooxmlCustGeomShape,
  ooxmlMathShape,
  ooxmlLine,
  ooxmlConnector,
  formatSourceLine,
  computeBadgePillWidth,
  getChromeConfig,
  renderSlideChromePptx,
  DIAGRAM_LAYOUTS,
  parseHarveyValue,
  computeMarimekkoModel,
  computeSankeyLayout,
  partitionValueChainItems,
  computeSwotModel,
  CHROME_CSS,
  DIAGRAMS_CSS,
  extractMermaidSource,
  detectMermaidMode,
  parseMermaidFlowchart,
  layoutMermaidFlowchart,
  parseMermaidSequence,
  layoutMermaidSequence,
  compileMermaidSlide,
  renderMermaidPptx,
  renderMermaidHtml,
  MERMAID_CSS,
  POSTER_COVER_VARIANTS,
  resolveSectionAgendaChapters,
  AESTHETIC_STUDIO_CSS,
}

export const CORE_LAYOUTS = new Set([
  'cover',
  'agenda',
  'section',
  'bullets',
  'statement',
  'quote',
  'kpi',
  'cards',
  'comparison',
  'matrix',
  'swot',
  'process',
  'value-chain',
  'marimekko',
  'sankey',
  'mermaid',
  'callout',
  'gantt',
  'architecture',
  'harvey',
  'tam',
  'org',
  'table',
  'closing',
])

export const LAYOUT_ALIASES = Object.freeze({
  'kpi-grid': { layout: 'kpi', variant: 'grid' },
  scorecard: { layout: 'kpi', variant: 'grid' },
  bento: { layout: 'cards', variant: 'bento' },
  pillars: { layout: 'cards', variant: 'pillars' },
  'exec-summary': { layout: 'cards', variant: 'exec-summary' },
  timeline: { layout: 'process', variant: 'timeline' },
  steps: { layout: 'process', variant: 'steps' },
  layers: { layout: 'process', variant: 'layers' },
  funnel: { layout: 'process', variant: 'funnel' },
  flywheel: { layout: 'process', variant: 'flywheel' },
  chevron: { layout: 'process', variant: 'chevron' },
  porter: { layout: 'value-chain' },
  mekko: { layout: 'marimekko' },
  'swot-matrix': { layout: 'swot' },
  flowchart: { layout: 'mermaid', variant: 'flowchart' },
  sequence: { layout: 'mermaid', variant: 'sequence' },
  'sequence-diagram': { layout: 'mermaid', variant: 'sequence' },
  'issue-action': { layout: 'comparison', variant: 'issue-action' },
  'before-after': { layout: 'comparison', variant: 'before-after' },
  'matrix-2x2': { layout: 'matrix', variant: '2x2' },
  'formula-callout': { layout: 'callout', variant: 'formula' },
  takeaways: { layout: 'callout', variant: 'takeaways' },
  roadmap: { layout: 'gantt', variant: 'quarters' },
  swimlane: { layout: 'gantt', variant: 'swimlane' },
  team: { layout: 'org', variant: 'team' },
  gallery: { layout: 'image', variant: 'gallery' },
  'gallery-grid': { layout: 'image', variant: 'gallery' },
  'ablation-compare': { layout: 'chart-split', variant: 'chart-right' },
  waterfall: { layout: 'chart', chartKind: 'waterfall' },
})

/**
 * 原生可编辑 OOXML 表格（支持 consulting / booktabs 学术三线表 / minimal / banded，
 * 智能按内容宽度分配列宽，数值列自动右对齐，支持单元格 **粗体** 高亮）。
 */
export function ooxmlTable(id, name, boxIn, rows, theme, langAttr, tableStyleInput) {
  const tk = theme.tokens
  const style = tableStyleInput || theme.defaultTableStyle || 'consulting'
  const safeRows = Array.isArray(rows) && rows.length > 0 ? rows : [['']]
  const cols = Math.max(1, ...safeRows.map((r) => r.length))
  const fontSizePt = cols <= 5 ? 15 : cols === 6 ? 14 : 12.5

  // 智能按列最大视觉宽度分配列宽（钳制最小占比 9%，最大占比 44%）
  const weights = Array.from({ length: cols }, (_, c) => {
    const maxEm = Math.max(3, ...safeRows.map((r) => measureEmWidth(r[c] ?? '', true)))
    return Math.min(24, Math.max(4, maxEm + 2))
  })
  const weightSum = weights.reduce((a, b) => a + b, 0) || cols
  const totalWEmu = inToEmu(boxIn.w)
  const colWidths = weights.map((w) => Math.floor((w / weightSum) * totalWEmu))
  const remainder = totalWEmu - colWidths.reduce((a, b) => a + b, 0)
  colWidths[0] += remainder
  const gridXml = colWidths.map((w) => '<a:gridCol w="' + w + '"/>').join('')

  // 判断数值列（除表头外 >=60% 非空单元格为数值）
  const numericCols = Array.from({ length: cols }, (_, c) => {
    const bodyCells = safeRows.slice(1).map((r) => String(r[c] ?? '').trim()).filter(Boolean)
    return bodyCells.length > 0 && bodyCells.filter(isNumericCell).length / bodyCells.length >= 0.6
  })

  const rowCount = safeRows.length
  const maxRowHIn = Math.min(0.56, Math.max(0.38, boxIn.h / Math.max(rowCount, 1)))
  const rowHEmu = inToEmu(maxRowHIn)

  const borderXml = (side, ptWidth, colorHex) =>
    colorHex && ptWidth > 0
      ? '<a:' + side + ' w="' + ptToEmu(ptWidth) + '" cap="flat" cmpd="sng" algn="ctr">' + ooxmlSolidFill(colorHex) + '<a:prstDash val="solid"/></a:' + side + '>'
      : '<a:' + side + '><a:noFill/></a:' + side + '>'

  const trsXml = safeRows.map((row, rIdx) => {
    const isHeader = rIdx === 0
    const isLast = rIdx === rowCount - 1
    const padded = Array.from({ length: cols }, (_, c) => String(row[c] ?? ''))

    const cellsXml = padded.map((cellText, cIdx) => {
      const align = (numericCols[cIdx] || (!isHeader && isNumericCell(cellText))) ? 'r' : 'l'
      let fillHex = ''
      let textColor = tk.inkPrimary
      let lnT = ''
      let lnB = ''

      if (style === 'booktabs') {
        // 学术三线表：顶线 1.5pt，表头下线 0.75pt，底线 1.5pt，零底色，零竖线
        fillHex = ''
        textColor = tk.inkPrimary
        lnT = isHeader ? borderXml('lnT', 1.5, tk.inkPrimary) : borderXml('lnT', 0, '')
        lnB = isHeader
          ? borderXml('lnB', 0.75, tk.inkPrimary)
          : isLast
            ? borderXml('lnB', 1.5, tk.inkPrimary)
            : borderXml('lnB', 0, '')
      } else if (style === 'minimal') {
        fillHex = ''
        textColor = isHeader ? tk.accentText : tk.inkPrimary
        lnT = borderXml('lnT', 0, '')
        lnB = isHeader
          ? borderXml('lnB', 1.25, tk.accentPrimary)
          : borderXml('lnB', 0.5, tk.hairline)
      } else if (style === 'banded') {
        fillHex = isHeader ? tk.accentPrimary : (rIdx % 2 === 1 ? tk.surface1 : '')
        textColor = isHeader ? tk.inkOnAccent : tk.inkPrimary
        lnT = borderXml('lnT', 0, '')
        lnB = borderXml('lnB', 0.5, tk.hairline)
      } else {
        // consulting（默认）：表头微表面底色 + 主强调底线，行间细发丝线，隔行微弱衬底
        fillHex = isHeader ? tk.surface2 : (rIdx % 2 === 0 && rIdx > 0 ? tk.surface1 : '')
        textColor = isHeader ? tk.inkPrimary : tk.inkPrimary
        lnT = isHeader ? borderXml('lnT', 1.25, tk.accentPrimary) : borderXml('lnT', 0, '')
        lnB = isHeader
          ? borderXml('lnB', 1.25, tk.accentPrimary)
          : isLast
            ? borderXml('lnB', 1.0, tk.inkMuted)
            : borderXml('lnB', 0.5, tk.hairline)
      }

      const para = ooxmlRichParagraph(cellText, {
        sizePt: fontSizePt,
        color: textColor,
        secondaryColor: tk.inkSecondary,
        accentColor: tk.accentText,
        codeHighlight: tk.surface2,
        bold: isHeader,
        lang: langAttr,
        align,
        font: theme.fonts.body,
        lineHeight: 1.25,
      })

      return (
        '<a:tc>' +
        '<a:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/>' + para + '</a:txBody>' +
        '<a:tcPr marL="109728" marR="109728" marT="54864" marB="54864" anchor="ctr">' +
        borderXml('lnL', 0, '') +
        borderXml('lnR', 0, '') +
        lnT +
        lnB +
        (fillHex ? ooxmlSolidFill(fillHex) : '<a:noFill/>') +
        '</a:tcPr></a:tc>'
      )
    }).join('')

    return '<a:tr h="' + rowHEmu + '">' + cellsXml + '</a:tr>'
  }).join('')

  const totalHEmu = Math.max(1, rowCount) * rowHEmu
  return (
    '<p:graphicFrame>' +
    '<p:nvGraphicFramePr><p:cNvPr id="' + id + '" name="' + escapeXml(name) + '"/>' +
    '<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>' +
    '<p:xfrm><a:off x="' + inToEmu(boxIn.x) + '" y="' + inToEmu(boxIn.y) + '"/>' +
    '<a:ext cx="' + totalWEmu + '" cy="' + totalHEmu + '"/></p:xfrm>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">' +
    '<a:tbl><a:tblPr firstRow="1" bandRow="' + (style === 'booktabs' || style === 'minimal' ? '0' : '1') + '"/>' +
    '<a:tblGrid>' + gridXml + '</a:tblGrid>' + trsXml + '</a:tbl>' +
    '</a:graphicData></a:graphic></p:graphicFrame>'
  )
}

export function renderCoreSlidePptx(slide, index, total, theme, langAttr, manifest = {}) {
  const tk = theme.tokens
  const chromeStyle = resolveChromeStyle(theme, slide, manifest.brand)
  const chromeCfg = getChromeConfig(chromeStyle, theme)
  const idBase = (index + 1) * 10
  let dynCounter = (index + 1) * 100 + 10
  const nextId = () => { dynCounter += 1; return dynCounter }

  const layout = slide.layout || 'bullets'
  const variant = slide.variant || ''
  const taste = resolveActiveTaste(manifest, slide)
  const cardMaterial = variant === 'frameless' ? 'frameless' : taste.cardMaterial
  const resolveItemIcon = (it, idx) => {
    const explicit = normalizeIconName(it?.icon)
    if (explicit) return explicit
    if (it?.icon === 'auto' || taste.iconMode === 'auto') return resolveSemanticIcon(it, idx)
    return ''
  }
  const title = slide.title || ''
  const subtitle = slide.subtitle || ''
  const kicker = slide.kicker || ''
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
  const hasTakeaway = typeof slide.takeaway === 'string' && slide.takeaway.trim() !== ''
  const bodyBottomY = hasTakeaway ? 6.08 : 6.72
  const bodyTopY = chromeCfg.bodyTopY
  const bodyH = bodyBottomY - bodyTopY
  const cardPreset = chromeCfg.cardRadiusPx > 0 ? 'roundRect' : 'rect'

  const shapes = []

  if (layout === 'cover') {
    const coverVariant = variant || taste.recipe?.coverVariant || ''
    const metaParts = [slide.text, slide.source, manifest.brand?.footer].filter(Boolean)
    const metaText = metaParts.join('  ·  ')

    const posterCover = renderPosterCoverPptx(slide, {
      coverVariant,
      title,
      subtitle,
      kicker,
      metaText,
      total,
      theme,
      langAttr,
      manifest,
      idBase,
      nextId,
    })
    if (posterCover !== null) return posterCover

    const inverted = coverVariant === 'inverted' || (!coverVariant && tk.coverMode === 'inverted-accent')
    const coverFill = inverted ? tk.coverBg : tk.canvas
    const coverDark = relativeLuminance(coverFill) < 0.36
    const fg = inverted ? (coverDark ? '#F8FAFC' : '#0F172A') : tk.inkPrimary
    const subColor = inverted ? (coverDark ? '#E2E8F0' : '#334155') : tk.inkSecondary
    const accentRule = inverted ? (theme.id === 'exec-jilan' || theme.id === 'exec-palace' ? '#D4AF37' : tk.accentSecondary) : tk.accentPrimary
    const kickerColor = inverted ? accentRule : tk.accentText

    if (inverted) {
      shapes.push(ooxmlShape(nextId(), 'Cover backdrop', { x: 0, y: 0, w: CANVAS_IN.w, h: CANVAS_IN.h }, {
        preset: 'rect',
        fill: coverFill,
      }))
    } else if (coverVariant === 'monolith') {
      shapes.push(ooxmlShape(nextId(), 'Cover monolith band', { x: 0, y: 0, w: 0.42, h: CANVAS_IN.h }, {
        preset: 'rect',
        fill: tk.accentPrimary,
      }))
    } else {
      // 精致顶栏结构线与右侧微弱几何装饰块
      shapes.push(ooxmlShape(nextId(), 'Cover top accent', { x: 0, y: 0, w: CANVAS_IN.w, h: 0.08 }, {
        preset: 'rect',
        fill: tk.accentPrimary,
      }))
      shapes.push(ooxmlShape(nextId(), 'Cover architectural panel', { x: 9.65, y: 0.08, w: 3.6833, h: 7.42 }, {
        preset: 'rect',
        fill: tk.surface1,
      }))
      shapes.push(ooxmlLine(nextId(), 'Cover vertical hairline', { x: 9.65, y: 0.08 }, { x: 9.65, y: 7.5 }, {
        color: tk.hairline,
        widthPt: 0.75,
      }))
    }

    // 精确对齐标题 + 副标题总高度的左侧结构竖线（彻底修复旧版红条悬空问题）
    const lockupTop = 1.95
    const lockupHeight = subtitle !== '' ? 3.15 : 2.05
    shapes.push(ooxmlShape(idBase + 1, 'Accent bar', { x: 0.88, y: lockupTop, w: 0.09, h: lockupHeight }, {
      preset: 'rect',
      fill: accentRule,
    }))

    if (kicker !== '') {
      shapes.push(ooxmlShape(idBase + 4, 'Kicker', { x: 1.22, y: 1.42, w: 8.1, h: 0.36 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), {
            sizePt: 12,
            color: kickerColor,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            spc: 180,
          }),
        ],
      }))
    }

    const titleBox = { x: 1.22, y: lockupTop, w: inverted ? 10.6 : 8.1, h: 1.95 }
    const titleFit = computeTextFit(title, titleBox, 'coverTitle', { padXPt: 2, padYPt: 4 })
    shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: titleFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(title, {
          sizePt: titleFit.fontPt,
          color: fg,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: titleFit.lineHeight,
        }),
      ],
    }))

    if (subtitle !== '') {
      const subBox = { x: 1.22, y: 4.05, w: inverted ? 9.8 : 7.9, h: 1.05 }
      const subFit = computeTextFit(subtitle, subBox, 'body', { maxPt: 20, minPt: 14, padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', subBox, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: subFit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(subtitle, {
            sizePt: subFit.fontPt,
            color: subColor,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.42,
          }),
        ],
      }))
    }

    // 底部元数据线与页脚说明（绝不印 01 / 01 页码）
    shapes.push(ooxmlLine(nextId(), 'Cover footer rule', { x: 0.88, y: 6.48 }, { x: inverted ? 12.45 : 9.2, y: 6.48 }, {
      color: inverted ? hexToRgbaSafeHex(accentRule, coverFill, 0.45) : tk.hairline,
      widthPt: 0.75,
    }))
    if (metaText) {
      shapes.push(ooxmlShape(nextId(), 'Cover meta', { x: 0.88, y: 6.62, w: 8.3, h: 0.36 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(metaText, {
            sizePt: 11,
            color: subColor,
            lang: langAttr,
            font: theme.fonts.body,
          }),
        ],
      }))
    }
    return shapes.join('')
  }

  if (layout === 'closing') {
    const inverted = variant === 'inverted' || (!variant && tk.coverMode === 'inverted-accent')
    const closeFill = inverted ? tk.coverBg : tk.canvas
    const closeDark = relativeLuminance(closeFill) < 0.36
    const fg = inverted ? (closeDark ? '#F8FAFC' : '#0F172A') : tk.inkPrimary
    const accent = inverted ? (theme.id === 'exec-jilan' || theme.id === 'exec-palace' ? '#D4AF37' : '#F8FAFC') : tk.accentText
    if (inverted) {
      shapes.push(ooxmlShape(nextId(), 'Closing backdrop', { x: 0, y: 0, w: CANVAS_IN.w, h: CANVAS_IN.h }, {
        preset: 'rect',
        fill: closeFill,
      }))
    } else {
      shapes.push(ooxmlShape(nextId(), 'Closing top bar', { x: 0, y: 0, w: CANVAS_IN.w, h: 0.08 }, {
        preset: 'rect',
        fill: tk.accentPrimary,
      }))
    }

    const items = resolveEffectiveItems(slide)
    const hasCards = (variant === 'cta-cards' || items.length >= 2) && (slide.items?.length || bullets.length >= 2)
    const titleY = hasCards ? 1.35 : 2.25
    shapes.push(ooxmlShape(idBase + 2, 'Title', { x: 1.0, y: titleY, w: 11.33, h: 1.45 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(title || (langAttr === 'en-US' ? 'Thank You' : '谢谢'), {
          sizePt: hasCards ? 40 : 48,
          color: fg,
          bold: true,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.heading,
          lineHeight: 1.15,
        }),
      ],
    }))

    shapes.push(ooxmlShape(nextId(), 'Closing divider', { x: 5.92, y: titleY + 1.56, w: 1.5, h: 0.05 }, {
      preset: 'rect',
      fill: inverted ? accent : tk.accentPrimary,
    }))

    if (subtitle !== '') {
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', { x: 1.5, y: titleY + 1.78, w: 10.33, h: 0.78 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(subtitle, {
            sizePt: 19,
            color: accent,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.body,
          }),
        ],
      }))
    }

    if (hasCards) {
      const cols = Math.min(3, items.length)
      const gap = 0.26
      const cardW = (10.8 - gap * (cols - 1)) / cols
      const startX = (CANVAS_IN.w - (cardW * cols + gap * (cols - 1))) / 2
      items.slice(0, cols).forEach((it, idx) => {
        const box = { x: startX + idx * (cardW + gap), y: 4.35, w: cardW, h: 1.75 }
        shapes.push(ooxmlShape(nextId(), 'CTA Card ' + (idx + 1), box, {
          preset: cardPreset,
          adj: roundRectAdj(box.w, box.h, theme.radiusPx),
          fill: inverted ? hexToRgbaSafeHex('#FFFFFF', closeFill, 0.1) : tk.surface1,
          stroke: inverted ? hexToRgbaSafeHex('#FFFFFF', closeFill, 0.22) : tk.hairline,
          strokePt: 0.75,
          anchor: 'ctr',
          marginsIn: { l: 0.18, r: 0.18, t: 0.12, b: 0.12 },
          paragraphs: [
            ...(it.title ? [ooxmlRichParagraph(it.title, { sizePt: 15, color: fg, bold: true, lang: langAttr, align: 'ctr', font: theme.fonts.heading, spaceAfterPt: 4 })] : []),
            ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: 13.5, color: inverted ? '#CBD5E1' : tk.inkSecondary, lang: langAttr, align: 'ctr', font: theme.fonts.body })] : []),
          ],
        }))
      })
    }
    return shapes.join('')
  }

  if (layout === 'section') {
    const secVariant = variant || taste.recipe?.sectionVariant || ''
    if (secVariant === 'agenda') {
      const agendaPptx = renderSectionAgendaPptx(slide, {
        index,
        total,
        title,
        subtitle,
        kicker,
        theme,
        langAttr,
        manifest,
        chromeCfg,
        idBase,
        nextId,
      })
      if (agendaPptx !== null) return agendaPptx
    }

    shapes.push(ooxmlShape(nextId(), 'Section side band', { x: 0, y: 0, w: 0.16, h: CANVAS_IN.h }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
    const sectionNum = /^\d+$/.test(kicker.trim()) ? kicker.trim().padStart(2, '0') : kicker
    if (sectionNum !== '' && sectionNum !== title) {
      shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 1.05, y: 1.85, w: 10.5, h: 0.75 }, {
        txBox: true,
        anchor: 'b',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(sectionNum.toUpperCase(), {
            sizePt: /^\d+$/.test(sectionNum) ? 36 : 14,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            spc: 140,
          }),
        ],
      }))
    }
    shapes.push(ooxmlShape(nextId(), 'Accent bar', { x: 1.05, y: 2.74, w: 1.45, h: 0.07 }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
    const tBox = { x: 1.05, y: 3.0, w: 10.8, h: 1.55 }
    const tFit = computeTextFit(title, tBox, 'sectionTitle')
    shapes.push(ooxmlShape(idBase + 2, 'Title', tBox, {
      txBox: true,
      anchor: 't',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: tFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(title, {
          sizePt: tFit.fontPt,
          color: tk.inkPrimary,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: tFit.lineHeight,
        }),
      ],
    }))
    if (subtitle !== '') {
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', { x: 1.05, y: 4.68, w: 9.8, h: 0.9 }, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(subtitle, {
            sizePt: 18,
            color: tk.inkSecondary,
            lang: langAttr,
            font: theme.fonts.body,
          }),
        ],
      }))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'statement') {
    if (kicker !== '') {
      shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 1.05, y: 1.35, w: 10.5, h: 0.34 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), {
            sizePt: 12,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            spc: 160,
          }),
        ],
      }))
    }
    const stmtText = title || slide.text || ''
    const cardBox = { x: 0.88, y: 1.92, w: 11.57, h: subtitle ? 2.95 : 3.45 }
    shapes.push(ooxmlShape(nextId(), 'Statement surface', cardBox, {
      preset: cardPreset,
      adj: roundRectAdj(cardBox.w, cardBox.h, theme.radiusPx),
      fill: tk.surface1,
      stroke: tk.hairline,
      strokePt: 0.75,
    }))
    shapes.push(ooxmlShape(nextId(), 'Accent bar', { x: 0.88, y: 1.92, w: 0.10, h: cardBox.h }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
    const sBox = { x: 1.32, y: 2.12, w: 10.8, h: cardBox.h - 0.4 }
    const sFit = computeTextFit(stmtText, sBox, 'statement')
    shapes.push(ooxmlShape(idBase + 2, 'Statement', sBox, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: sFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(stmtText, {
          sizePt: sFit.fontPt,
          color: tk.inkPrimary,
          secondaryColor: tk.inkSecondary,
          accentColor: tk.accentText,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: sFit.lineHeight,
        }),
      ],
    }))
    if (subtitle !== '') {
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', { x: 1.32, y: 5.12, w: 10.5, h: 0.85 }, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(subtitle, {
            sizePt: 17,
            color: tk.inkSecondary,
            lang: langAttr,
            font: theme.fonts.body,
          }),
        ],
      }))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'quote') {
    const quoteText = title || slide.text || ''
    shapes.push(ooxmlShape(nextId(), 'Quote card', { x: 0.88, y: 1.25, w: 11.57, h: 4.85 }, {
      preset: cardPreset,
      adj: roundRectAdj(11.57, 4.85, theme.radiusPx),
      fill: tk.surface1,
      stroke: tk.hairline,
      strokePt: 0.75,
    }))
    shapes.push(ooxmlShape(idBase + 1, 'Quote mark', { x: 1.25, y: 1.38, w: 1.5, h: 1.15 }, {
      txBox: true,
      anchor: 't',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph('\u201C', {
          sizePt: 72,
          color: tk.accentPrimary,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: 0.9,
        }),
      ],
    }))
    const qBox = { x: 1.38, y: 2.38, w: 10.5, h: 2.45 }
    const qFit = computeTextFit(quoteText, qBox, 'quote')
    shapes.push(ooxmlShape(idBase + 2, 'Quote', qBox, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: qFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(quoteText, {
          sizePt: qFit.fontPt,
          color: tk.inkPrimary,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: qFit.lineHeight,
        }),
      ],
    }))
    if (subtitle !== '') {
      shapes.push(ooxmlLine(nextId(), 'Quote rule', { x: 1.38, y: 5.08 }, { x: 3.2, y: 5.08 }, {
        color: tk.accentPrimary,
        widthPt: 1.25,
      }))
      shapes.push(ooxmlShape(idBase + 3, 'Attribution', { x: 1.38, y: 5.22, w: 9.8, h: 0.55 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph('\u2014\u2014 ' + subtitle, {
            sizePt: 15,
            color: tk.inkMuted,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
          }),
        ],
      }))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }


  // 所有常规内容版式共享 6 套母版骨架页眉
  shapes.push(renderStandardHeaderPptx(slide, idBase, nextId, theme, langAttr, chromeCfg))

  if (layout === 'mermaid') {
    shapes.push(renderMermaidPptx(slide, { x: 0.62, y: bodyTopY + 0.04, w: 12.09, h: bodyH - 0.10 }, nextId, chromeCfg, theme, langAttr))
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  const diagramShapes = renderDiagramSlideBodyPptx(slide, {
    theme,
    langAttr,
    chromeCfg,
    nextId,
    bodyTopY,
    bodyBottomY,
    bodyH,
    cardPreset,
  })
  if (diagramShapes !== null) {
    shapes.push(diagramShapes)
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'table') {
    const rows = Array.isArray(slide.rows) ? slide.rows : [['']]
    const tStyle = slide.tableStyle || slide.visual?.tableStyle
    if (tStyle === 'harvey') {
      shapes.push(renderHarveyMatrixPptx(slide, { x: 0.62, y: bodyTopY + 0.06, w: 12.09, h: bodyH - 0.14 }, nextId, chromeCfg, theme, langAttr))
    } else {
      shapes.push(ooxmlTable(idBase + 3, 'Table', { x: 0.62, y: bodyTopY + 0.08, w: 12.09, h: bodyH - 0.16 }, rows, theme, langAttr, tStyle))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'agenda') {
    const items = resolveEffectiveItems(slide)
    const n = Math.max(1, items.length)
    const twoCol = n > 4
    const cols = twoCol ? 2 : 1
    const rowsPerCol = Math.ceil(n / cols)
    const gapX = 0.34
    const gapY = 0.18
    const colW = (12.09 - gapX * (cols - 1)) / cols
    const rowH = Math.min(0.95, (bodyH - gapY * (rowsPerCol - 1)) / rowsPerCol)
    const startY = bodyTopY + Math.max(0, (bodyH - (rowH * rowsPerCol + gapY * (rowsPerCol - 1))) / 2)

    items.forEach((it, idx) => {
      const col = twoCol ? Math.floor(idx / rowsPerCol) : 0
      const row = twoCol ? idx % rowsPerCol : idx
      const x = 0.62 + col * (colW + gapX)
      const y = startY + row * (rowH + gapY)
      const isActive = slide.activeIndex === idx + 1 || it.status === 'accent'
      const badgeText = it.tag || String(idx + 1).padStart(2, '0')
      const badgeW = chromeCfg.useDisplayNumeral
        ? 0.74
        : computeBadgePillWidth(badgeText, 13.5, Math.min(2.4, colW * 0.38), 0.58)

      shapes.push(renderSurfaceCardPptx('Agenda Card ' + (idx + 1), { x, y, w: colW, h: rowH }, {
        fill: isActive ? tk.accentSoft : tk.surface1,
        focal: isActive,
      }, nextId, chromeCfg, theme))
      if (chromeCfg.useDisplayNumeral) {
        shapes.push(ooxmlShape(nextId(), 'Agenda Badge ' + (idx + 1), { x: x + 0.18, y: y + (rowH - 0.54) / 2, w: badgeW, h: 0.54 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(badgeText, {
              sizePt: 22,
              color: tk.accentText,
              bold: true,
              lang: langAttr,
              font: theme.fonts.heading,
            }),
          ],
        }))
      } else {
        shapes.push(ooxmlShape(nextId(), 'Agenda Badge ' + (idx + 1), { x: x + 0.18, y: y + (rowH - 0.44) / 2, w: badgeW, h: 0.44 }, {
          preset: cardPreset,
          adj: roundRectAdj(badgeW, 0.44, Math.min(8, chromeCfg.cardRadiusPx)),
          fill: isActive ? tk.accentPrimary : tk.surface2,
          anchor: 'ctr',
          marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
          paragraphs: [
            ooxmlRichParagraph(badgeText, {
              sizePt: 13.5,
              color: isActive ? tk.inkOnAccent : tk.accentText,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.heading,
            }),
          ],
        }))
      }
      const textLeftOffset = 0.18 + badgeW + 0.18
      const textBox = { x: x + textLeftOffset, y: y + 0.08, w: Math.max(1.2, colW - textLeftOffset - 0.18), h: rowH - 0.16 }
      shapes.push(ooxmlShape(nextId(), 'Card ' + (idx + 1), textBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(it.title || it.text || '', {
            sizePt: 16,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            spaceAfterPt: it.text && it.title ? 2 : 0,
          }),
          ...(it.text && it.title ? [ooxmlRichParagraph(it.text, { sizePt: 13.5, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body })] : []),
        ],
      }))
    })
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'kpi') {
    const items = resolveEffectiveItems(slide).slice(0, 4)
    const kpiVariant = variant || taste.recipe?.kpiVariant || ''
    const n = Math.max(1, items.length)
    const cardH = Math.min(3.75, bodyH - 0.24)
    const cardY = bodyTopY + (bodyH - cardH) / 2

    // 非对称 Spotlight 主次聚光灯变体（Hero 50% + 右侧无框细线副指标栈 —— 破除等宽三联框疲劳）
    if (kpiVariant === 'spotlight' && items.length >= 2) {
      const hero = items[0]
      const sats = items.slice(1, 4)
      const heroBox = { x: 0.62, y: cardY, w: 5.82, h: cardH }
      const heroMat = cardMaterial === 'glass' ? 'glass' : (cardMaterial === 'solid' ? 'solid' : 'editorial-rule')
      shapes.push(renderSurfaceCardPptx('KPI Hero Surface', heroBox, {
        fill: tk.surface2,
        focal: true,
        cardMaterial: heroMat,
      }, nextId, chromeCfg, theme))

      const heroIcon = resolveItemIcon(hero, 0)
      let labelX = heroBox.x + 0.30
      if (heroIcon) {
        shapes.push(renderIconBadgePptx('KPI Hero Badge', { x: heroBox.x + 0.30, y: heroBox.y + 0.28, w: 0.44, h: 0.44 }, heroIcon, nextId, theme, {
          style: taste.iconBadgeStyle,
        }))
        labelX += 0.56
      }
      const heroLabel = hero.value ? (hero.title || '') : ''
      if (heroLabel) {
        shapes.push(ooxmlShape(nextId(), 'KPI Hero Label', { x: labelX, y: heroBox.y + 0.30, w: heroBox.x + heroBox.w - labelX - 0.26, h: 0.40 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(heroLabel, {
              sizePt: 15,
              color: tk.inkSecondary,
              bold: true,
              lang: langAttr,
              font: theme.fonts.body,
            }),
          ],
        }))
      }
      const heroValText = (hero.value || hero.title || '—') + (hero.unit ? ' ' + hero.unit : '')
      const hvBox = { x: heroBox.x + 0.30, y: heroBox.y + 0.88, w: heroBox.w - 0.60, h: 1.38 }
      const hvFit = computeTextFit(heroValText, hvBox, 'kpiValue', { maxPt: 60, minPt: 30, padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(nextId(), 'KPI Hero Value', hvBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: hvFit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(heroValText, {
            sizePt: hvFit.fontPt,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            lineHeight: 1.02,
          }),
        ],
      }))
      const heroSt = statusPalette(hero.status, tk)
      if (hero.delta) {
        const pw = computeBadgePillWidth(hero.delta, 12.5, heroBox.w - 0.60, 1.25)
        shapes.push(ooxmlShape(nextId(), 'KPI Hero Delta', { x: heroBox.x + 0.30, y: heroBox.y + 2.34, w: pw, h: 0.38 }, {
          preset: 'roundRect',
          adj: 50000,
          fill: heroSt.bg,
          stroke: tk.accentPrimary,
          strokePt: 0.6,
          anchor: 'ctr',
          marginsIn: { l: 0.06, r: 0.06, t: 0.02, b: 0.02 },
          paragraphs: [
            ooxmlRichParagraph(hero.delta, {
              sizePt: 12.5,
              color: heroSt.fg,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.body,
            }),
          ],
        }))
      }
      if (hero.text) {
        const dy = hero.delta ? heroBox.y + 2.84 : heroBox.y + 2.40
        shapes.push(ooxmlShape(nextId(), 'Card 1', { x: heroBox.x + 0.30, y: dy, w: heroBox.w - 0.60, h: Math.max(0.55, heroBox.y + heroBox.h - dy - 0.16) }, {
          txBox: true,
          anchor: 't',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(hero.text, {
              sizePt: 14.5,
              color: tk.inkSecondary,
              lang: langAttr,
              font: theme.fonts.body,
              lineHeight: 1.4,
            }),
          ],
        }))
      }

      // 右侧副指标栈（无框细线通透分层）
      const rightX = 6.86
      const rightW = 5.85
      const satGap = 0.18
      const satH = (cardH - satGap * (sats.length - 1)) / sats.length
      sats.forEach((it, si) => {
        const sy = cardY + si * (satH + satGap)
        const sIcon = resolveItemIcon(it, si + 1)
        const st = statusPalette(it.status, tk)
        shapes.push(ooxmlLine(nextId(), 'KPI Sat Top ' + (si + 1), { x: rightX, y: sy }, { x: rightX + rightW, y: sy }, {
          color: si === 0 ? tk.accentPrimary : tk.hairline,
          widthPt: si === 0 ? 1.5 : 0.75,
        }))
        if (si === sats.length - 1) {
          shapes.push(ooxmlLine(nextId(), 'KPI Sat Bot', { x: rightX, y: sy + satH }, { x: rightX + rightW, y: sy + satH }, {
            color: tk.hairline,
            widthPt: 0.6,
          }))
        }
        let infoX = rightX + 0.04
        if (sIcon) {
          shapes.push(renderIconBadgePptx('KPI Sat Icon ' + (si + 1), { x: rightX + 0.04, y: sy + (satH - 0.38) / 2, w: 0.38, h: 0.38 }, sIcon, nextId, theme, {
            style: taste.iconBadgeStyle,
          }))
          infoX += 0.50
        }
        const valText = (it.value || it.title || '—') + (it.unit ? ' ' + it.unit : '')
        const lblText = it.value ? (it.title || '') : ''
        const valW = Math.min(2.35, Math.max(1.55, rightW * 0.38))
        const leftW = Math.max(1.8, rightX + rightW - valW - infoX - 0.16)
        shapes.push(ooxmlShape(nextId(), 'Card ' + (si + 2), { x: infoX, y: sy + 0.10, w: leftW, h: satH - 0.18 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ...(lblText ? [ooxmlRichParagraph(lblText, { sizePt: 14, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: it.text ? 3 : 0 })] : []),
            ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: 12.5, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.3 })] : []),
          ],
        }))
        const valX = rightX + rightW - valW
        shapes.push(ooxmlShape(nextId(), 'KPI Sat Val ' + (si + 1), { x: valX, y: sy + 0.08, w: valW, h: satH - (it.delta ? 0.38 : 0.14) }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(valText, {
              sizePt: sats.length >= 3 ? 26 : 32,
              color: tk.inkPrimary,
              bold: true,
              lang: langAttr,
              align: 'r',
              font: theme.fonts.heading,
              lineHeight: 1.05,
            }),
          ],
        }))
        if (it.delta) {
          shapes.push(ooxmlShape(nextId(), 'KPI Sat Delta ' + (si + 1), { x: valX, y: sy + satH - 0.34, w: valW, h: 0.28 }, {
            txBox: true,
            anchor: 'ctr',
            marginsIn: { l: 0, r: 0, t: 0, b: 0 },
            paragraphs: [
              ooxmlRichParagraph(it.delta, {
                sizePt: 11.5,
                color: st.fg,
                bold: true,
                lang: langAttr,
                align: 'r',
                font: theme.fonts.body,
              }),
            ],
          }))
        }
      })
      shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
      return shapes.join('')
    }

    const gap = 0.28
    const cardW = (12.09 - gap * (n - 1)) / n
    const effKpiMat = kpiVariant === 'frameless' ? 'frameless' : cardMaterial

    items.forEach((it, idx) => {
      const x = 0.62 + idx * (cardW + gap)
      const st = statusPalette(it.status, tk)
      const valText = (it.value || it.title || '—') + (it.unit ? ' ' + it.unit : '')
      const labelText = it.value ? (it.title || '') : ''
      const iconName = resolveItemIcon(it, idx)

      shapes.push(renderSurfaceCardPptx('KPI Surface ' + (idx + 1), { x, y: cardY, w: cardW, h: cardH }, {
        fill: tk.surface1,
        focal: idx === 0,
        cardMaterial: effKpiMat,
      }, nextId, chromeCfg, theme))

      const padX = effKpiMat === 'frameless' || effKpiMat === 'editorial-rule' ? 0.04 : 0.24
      let lblLeft = x + padX
      if (iconName) {
        shapes.push(renderIconBadgePptx('KPI Icon ' + (idx + 1), { x: lblLeft, y: cardY + 0.22, w: 0.38, h: 0.38 }, iconName, nextId, theme, {
          style: taste.iconBadgeStyle,
        }))
        lblLeft += 0.48
      }
      if (labelText) {
        shapes.push(ooxmlShape(nextId(), 'KPI Label ' + (idx + 1), { x: lblLeft, y: cardY + 0.24, w: Math.max(0.8, x + cardW - padX - lblLeft), h: 0.38 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(labelText, {
              sizePt: 13.5,
              color: tk.inkMuted,
              bold: true,
              lang: langAttr,
              font: theme.fonts.body,
            }),
          ],
        }))
      }

      const vBox = { x: x + padX, y: cardY + 0.72, w: cardW - padX * 2, h: 1.15 }
      const vFit = computeTextFit(valText, vBox, 'kpiValue', { maxPt: effKpiMat === 'frameless' ? (n >= 4 ? 42 : 52) : (n >= 4 ? 38 : 46), minPt: 24, padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(nextId(), 'KPI Value ' + (idx + 1), vBox, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: vFit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(valText, {
            sizePt: vFit.fontPt,
            color: idx === 0 ? tk.accentText : tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.heading,
            lineHeight: 1.05,
          }),
        ],
      }))

      if (it.delta) {
        const pillW = computeBadgePillWidth(it.delta, 12, cardW - padX * 2, 1.15)
        shapes.push(ooxmlShape(nextId(), 'KPI Delta ' + (idx + 1), { x: x + padX, y: cardY + 1.98, w: pillW, h: 0.36 }, {
          preset: 'roundRect',
          adj: 50000,
          fill: st.bg,
          stroke: chromeCfg.cardBorderless ? '' : tk.hairline,
          strokePt: 0.5,
          anchor: 'ctr',
          marginsIn: { l: 0.05, r: 0.05, t: 0.02, b: 0.02 },
          paragraphs: [
            ooxmlRichParagraph(it.delta, {
              sizePt: 12,
              color: st.fg,
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.body,
            }),
          ],
        }))
      }

      if (it.text) {
        const descY = it.delta ? cardY + 2.46 : cardY + 2.02
        const descBox = { x: x + padX, y: descY, w: cardW - padX * 2, h: Math.max(0.5, cardY + cardH - descY - 0.18) }
        const dFit = computeTextFit(it.text, descBox, 'cardBody', { maxPt: 14.5, minPt: 13.5, padXPt: 2, padYPt: 2 })
        shapes.push(ooxmlShape(nextId(), 'Card ' + (idx + 1), descBox, {
          txBox: true,
          anchor: 't',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          fontScale: dFit.fontScale,
          paragraphs: [
            ooxmlRichParagraph(it.text, {
              sizePt: dFit.fontPt,
              color: tk.inkSecondary,
              lang: langAttr,
              font: theme.fonts.body,
              lineHeight: 1.38,
            }),
          ],
        }))
      }
    })
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'cards') {
    const items = resolveEffectiveItems(slide)
    const cardsVariant = variant || taste.recipe?.cardsVariant || ''
    const isBentoHero = cardsVariant === 'bento-hero' && items.length >= 2 && items.length <= 4
    const isFramelessCards = cardsVariant === 'frameless'
    const effCardMat = isFramelessCards ? 'frameless' : cardMaterial
    const n = Math.max(1, items.length)
    const gap = isFramelessCards ? 0.34 : 0.24
    let topOffset = bodyTopY
    let availH = bodyH

    // exec-summary 变体：顶部通栏核心论断横幅 + 下方支柱卡
    if (cardsVariant === 'exec-summary' && (subtitle || slide.text)) {
      const thesisText = slide.text || subtitle
      const bannerBox = { x: 0.62, y: bodyTopY, w: 12.09, h: 0.96 }
      shapes.push(ooxmlShape(nextId(), 'Exec thesis banner', bannerBox, {
        preset: cardPreset,
        adj: roundRectAdj(bannerBox.w, bannerBox.h, chromeCfg.cardRadiusPx),
        fill: tk.accentSoft,
        stroke: chromeCfg.cardBorderless ? '' : tk.accentPrimary,
        strokePt: 0.75,
        anchor: 'ctr',
        marginsIn: { l: 0.22, r: 0.22, t: 0.08, b: 0.08 },
        paragraphs: [
          ooxmlRichParagraph(thesisText, {
            sizePt: 15.5,
            color: tk.inkPrimary,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.35,
          }),
        ],
      }))
      topOffset = bodyTopY + 1.18
      availH = bodyBottomY - topOffset
    }

    // 计算每张卡片的几何坐标（支持 bento / bento-hero 非对称网格与 pillars/frameless 等分网格）
    const cardBoxes = isBentoHero
      ? (() => {
          const leftW = 12.09 * 0.43 - gap / 2
          const rightW = 12.09 - leftW - gap
          const rightCount = items.length - 1
          const rH = (availH - gap * (rightCount - 1)) / rightCount
          return [
            { x: 0.62, y: topOffset, w: leftW, h: availH },
            ...Array.from({ length: rightCount }, (_, ri) => ({
              x: 0.62 + leftW + gap,
              y: topOffset + ri * (rH + gap),
              w: rightW,
              h: rH,
            })),
          ]
        })()
      : computeCardGridBoxes(n, cardsVariant, { x: 0.62, y: topOffset, w: 12.09, h: availH }, gap)

    items.slice(0, cardBoxes.length).forEach((it, idx) => {
      const box = cardBoxes[idx]
      const isInvertedHero = isBentoHero && idx === 0
      const isHero = (cardsVariant === 'bento' || isBentoHero) && idx === 0
      const iconName = resolveItemIcon(it, idx)

      if (isInvertedHero) {
        const heroGradA = tk.coverBg || tk.accentPrimary
        const heroGradB = mixHex(heroGradA, tk.accentSecondary, 0.35)
        shapes.push(ooxmlShape(nextId(), 'Card Hero Surface', box, {
          preset: 'roundRect',
          adj: roundRectAdj(box.w, box.h, Math.max(10, chromeCfg.cardRadiusPx)),
          gradientStops: [
            { offset: 0, color: heroGradA },
            { offset: 1, color: heroGradB },
          ],
          gradientAngle: 140,
          shadow: theme.shadow,
        }))
      } else {
        shapes.push(renderSurfaceCardPptx('Card Surface ' + (idx + 1), box, {
          fill: isHero ? tk.surface2 : tk.surface1,
          focal: isHero || idx === 0,
          cardMaterial: effCardMat,
        }, nextId, chromeCfg, theme))
        if (isFramelessCards && idx > 0 && box.y === cardBoxes[idx - 1].y) {
          shapes.push(ooxmlLine(nextId(), 'Frameless Divider ' + idx, { x: box.x - gap / 2, y: box.y + 0.10 }, { x: box.x - gap / 2, y: box.y + box.h - 0.10 }, {
            color: tk.hairline,
            widthPt: 0.5,
          }))
        }
      }

      const padX = !isInvertedHero && (effCardMat === 'frameless' || effCardMat === 'editorial-rule') ? 0.04 : 0.24
      const badge = it.tag || String(idx + 1).padStart(2, '0')
      const titleColor = isInvertedHero ? '#F8FAFC' : tk.inkPrimary
      const bodyColor = isInvertedHero ? '#E2E8F0' : tk.inkSecondary
      const statColor = isInvertedHero ? '#FDE68A' : tk.accentText

      let headerRowH = 0.42
      if (iconName) {
        shapes.push(renderIconBadgePptx('Card Icon ' + (idx + 1), { x: box.x + padX, y: box.y + 0.20, w: 0.40, h: 0.40 }, iconName, nextId, theme, {
          style: isInvertedHero ? 'ring' : taste.iconBadgeStyle,
          color: isInvertedHero ? '#FFFFFF' : tk.accentPrimary,
          stroke: isInvertedHero ? '#FFFFFF' : tk.accentPrimary,
        }))
        if (it.tag) {
          shapes.push(ooxmlShape(nextId(), 'Card Tag ' + (idx + 1), { x: box.x + padX + 0.50, y: box.y + 0.22, w: Math.max(0.8, box.w - padX * 2 - 0.50), h: 0.34 }, {
            txBox: true,
            anchor: 'ctr',
            marginsIn: { l: 0, r: 0, t: 0, b: 0 },
            paragraphs: [
              ooxmlRichParagraph(it.tag.toUpperCase(), {
                sizePt: 10.5,
                color: isInvertedHero ? '#CBD5E1' : tk.accentText,
                bold: true,
                lang: langAttr,
                font: theme.fonts.body,
                spc: 120,
              }),
            ],
          }))
        }
        headerRowH = 0.52
      } else if (chromeCfg.useDisplayNumeral || isFramelessCards) {
        shapes.push(ooxmlShape(nextId(), 'Card Badge ' + (idx + 1), { x: box.x + padX, y: box.y + 0.16, w: Math.min(2.8, box.w - padX * 2), h: 0.44 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          paragraphs: [
            ooxmlRichParagraph(badge, {
              sizePt: /^\d+$/.test(badge) ? 24 : 12,
              color: isInvertedHero ? '#FDE68A' : tk.accentText,
              bold: true,
              lang: langAttr,
              font: theme.fonts.heading,
              spc: /^\d+$/.test(badge) ? 0 : 120,
            }),
          ],
        }))
        headerRowH = 0.50
      } else {
        const badgeW = computeBadgePillWidth(badge, 11, box.w - padX * 2, 0.54)
        shapes.push(ooxmlShape(nextId(), 'Card Badge ' + (idx + 1), { x: box.x + padX, y: box.y + 0.20, w: badgeW, h: 0.30 }, {
          preset: cardPreset,
          adj: roundRectAdj(badgeW, 0.30, Math.min(6, chromeCfg.cardRadiusPx)),
          fill: isInvertedHero ? '#FFFFFF' : (isHero ? tk.accentPrimary : tk.accentSoft),
          fillAlpha: isInvertedHero ? 0.16 : 1,
          anchor: 'ctr',
          marginsIn: { l: 0.04, r: 0.04, t: 0.01, b: 0.01 },
          paragraphs: [
            ooxmlRichParagraph(badge, {
              sizePt: 11,
              color: isInvertedHero ? '#FFFFFF' : (isHero ? tk.inkOnAccent : tk.accentText),
              bold: true,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.body,
            }),
          ],
        }))
        headerRowH = 0.42
      }

      const innerTop = box.y + 0.20 + headerRowH
      const innerBox = { x: box.x + padX, y: innerTop, w: box.w - padX * 2, h: Math.max(0.5, box.y + box.h - innerTop - 0.16) }
      const bodyLines = [
        ...(it.text ? [it.text] : []),
        ...(it.bullets ?? []),
      ]
      const fit = computeTextFit([it.title || '', ...bodyLines], innerBox, 'cardBody', { maxPt: isInvertedHero ? 16 : 15.5, minPt: 13.5, padXPt: 2, padYPt: 2 })
      const paras = []
      if (it.title) {
        paras.push(ooxmlRichParagraph(it.title, {
          sizePt: Math.min(isInvertedHero ? 21 : 18, fit.fontPt + (isInvertedHero ? 4 : 2)),
          color: titleColor,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: 1.25,
          spaceAfterPt: bodyLines.length || it.value ? 6 : 0,
        }))
      }
      if (it.value) {
        paras.push(ooxmlRichParagraph(it.value + (it.unit ? ' ' + it.unit : ''), {
          sizePt: isInvertedHero ? 30 : 24,
          color: statColor,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          spaceAfterPt: 4,
        }))
      }
      if (it.text) {
        paras.push(ooxmlRichParagraph(it.text, {
          sizePt: fit.fontPt,
          color: bodyColor,
          accentColor: statColor,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.42,
          spaceAfterPt: it.bullets?.length ? 5 : 0,
        }))
      }
      for (const b of it.bullets ?? []) {
        paras.push(ooxmlRichParagraph(b, {
          sizePt: fit.fontPt,
          color: bodyColor,
          accentColor: statColor,
          bullet: true,
          bulletColor: isInvertedHero ? '#FDE68A' : tk.accentPrimary,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.38,
          spaceAfterPt: 4,
          autoLeadBold: true,
        }))
      }
      shapes.push(ooxmlShape(nextId(), 'Card ' + (idx + 1), innerBox, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: fit.fontScale,
        paragraphs: paras,
      }))
    })
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'comparison') {
    const items = resolveEffectiveItems(slide)
    if (variant === 'issue-action') {
      const pairs = items.slice(0, 4)
      const rowCount = Math.max(1, pairs.length)
      const gapY = 0.18
      const rowH = Math.min(1.12, (bodyH - gapY * (rowCount - 1)) / rowCount)
      const startY = bodyTopY + (bodyH - (rowH * rowCount + gapY * (rowCount - 1))) / 2
      const colW = 5.56

      pairs.forEach((it, idx) => {
        const y = startY + idx * (rowH + gapY)
        const leftText = it.title || ''
        const rightText = it.text || (it.bullets ?? []).join('；') || ''

        shapes.push(ooxmlShape(nextId(), 'Issue Card ' + (idx + 1), { x: 0.62, y, w: colW, h: rowH }, {
          preset: cardPreset,
          adj: roundRectAdj(colW, rowH, chromeCfg.cardRadiusPx),
          fill: tk.surface1,
          stroke: chromeCfg.cardBorderless ? '' : tk.hairline,
          strokePt: 0.75,
          anchor: 'ctr',
          marginsIn: { l: 0.22, r: 0.16, t: 0.08, b: 0.08 },
          paragraphs: [
            ooxmlRichParagraph(leftText, {
              sizePt: 15,
              color: tk.inkPrimary,
              bold: true,
              lang: langAttr,
              font: theme.fonts.body,
            }),
          ],
        }))
        shapes.push(ooxmlShape(nextId(), 'Issue Bar ' + (idx + 1), { x: 0.62, y, w: 0.07, h: rowH }, {
          preset: 'rect',
          fill: tk.negative,
        }))

        shapes.push(ooxmlShape(nextId(), 'Bridge Arrow ' + (idx + 1), { x: 6.40, y: y + (rowH - 0.28) / 2, w: 0.52, h: 0.28 }, {
          preset: 'rightArrow',
          fill: tk.accentPrimary,
        }))

        shapes.push(ooxmlShape(nextId(), 'Action Card ' + (idx + 1), { x: 7.15, y, w: colW, h: rowH }, {
          preset: cardPreset,
          adj: roundRectAdj(colW, rowH, chromeCfg.cardRadiusPx),
          fill: tk.accentSoft,
          stroke: chromeCfg.cardBorderless ? '' : tk.accentPrimary,
          strokePt: 0.75,
          anchor: 'ctr',
          marginsIn: { l: 0.22, r: 0.16, t: 0.08, b: 0.08 },
          paragraphs: [
            ooxmlRichParagraph(rightText, {
              sizePt: 15,
              color: tk.inkPrimary,
              secondaryColor: tk.inkSecondary,
              bold: false,
              lang: langAttr,
              font: theme.fonts.body,
              autoLeadBold: true,
            }),
          ],
        }))
      })
    } else {
      // 双栏对比（versus / before-after / do-dont）
      const twoSides = items.length <= 2
        ? items
        : [
            { title: items[0]?.title || '方案 A', bullets: items.slice(0, Math.ceil(items.length / 2)).map((x) => [x.title, x.text].filter(Boolean).join('：')) },
            { title: items[Math.ceil(items.length / 2)]?.title || '方案 B', bullets: items.slice(Math.ceil(items.length / 2)).map((x) => [x.title, x.text].filter(Boolean).join('：')) },
          ]
      const colW = 5.86
      const gap = 0.37
      ;[0, 1].forEach((side) => {
        const it = twoSides[side] ?? { title: side === 0 ? '对照项' : '推荐项', text: '' }
        const x = 0.62 + side * (colW + gap)
        const isDoDont = variant === 'do-dont'
        const headerFill = isDoDont
          ? (side === 0 ? tk.negative : tk.positive)
          : (side === 0 ? tk.surface2 : tk.accentPrimary)
        const headerFg = isDoDont || side === 1 ? '#FFFFFF' : tk.inkPrimary
        const box = { x, y: bodyTopY, w: colW, h: bodyH }

        shapes.push(ooxmlShape(nextId(), 'Comparison Card ' + (side + 1), box, {
          preset: cardPreset,
          adj: roundRectAdj(box.w, box.h, chromeCfg.cardRadiusPx),
          fill: side === 1 && !isDoDont ? tk.accentSoft : tk.surface1,
          stroke: chromeCfg.cardBorderless ? '' : (side === 1 ? tk.accentPrimary : tk.hairline),
          strokePt: side === 1 ? 1.0 : 0.75,
        }))
        shapes.push(ooxmlShape(nextId(), 'Comparison Header ' + (side + 1), { x, y: bodyTopY, w: colW, h: 0.62 }, {
          preset: 'rect',
          fill: headerFill,
          anchor: 'ctr',
          marginsIn: { l: 0.24, r: 0.24, t: 0.04, b: 0.04 },
          paragraphs: [
            ooxmlRichParagraph((isDoDont ? (side === 0 ? '✗  ' : '✓  ') : '') + (it.title || (side === 0 ? '现状 / 对照' : '方案 / 目标')), {
              sizePt: 16.5,
              color: headerFg,
              bold: true,
              lang: langAttr,
              font: theme.fonts.heading,
            }),
          ],
        }))

        const contentBox = { x: x + 0.24, y: bodyTopY + 0.80, w: colW - 0.48, h: bodyH - 1.0 }
        const lines = [...(it.text ? [it.text] : []), ...(it.bullets ?? [])]
        const fit = computeTextFit(lines, contentBox, 'cardBody', { maxPt: 16, minPt: 13.5 })
        const paras = []
        if (it.text) {
          paras.push(ooxmlRichParagraph(it.text, {
            sizePt: fit.fontPt,
            color: tk.inkPrimary,
            secondaryColor: tk.inkSecondary,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.44,
            spaceAfterPt: 6,
            autoLeadBold: true,
          }))
        }
        for (const b of it.bullets ?? []) {
          paras.push(ooxmlRichParagraph(b, {
            sizePt: fit.fontPt,
            color: tk.inkPrimary,
            secondaryColor: tk.inkSecondary,
            bullet: true,
            bulletColor: side === 1 ? tk.accentPrimary : tk.inkMuted,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.42,
            spaceAfterPt: 6,
            autoLeadBold: true,
          }))
        }
        shapes.push(ooxmlShape(nextId(), 'Comparison ' + (side + 1), contentBox, {
          txBox: true,
          anchor: 't',
          marginsIn: { l: 0, r: 0, t: 0, b: 0 },
          fontScale: fit.fontScale,
          paragraphs: paras,
        }))
      })
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'matrix') {
    const items = resolveEffectiveItems(slide).slice(0, 4)
    const plotX = 1.18
    const plotY = bodyTopY + 0.08
    const plotW = 11.45
    const plotH = bodyH - 0.36
    const gap = 0.28
    const qW = (plotW - gap) / 2
    const qH = (plotH - gap) / 2

    // X / Y 坐标轴带箭头
    const midX = plotX + plotW / 2
    const midY = plotY + plotH / 2
    shapes.push(ooxmlLine(nextId(), 'Matrix X axis', { x: plotX - 0.16, y: midY }, { x: plotX + plotW + 0.16, y: midY }, {
      color: tk.inkMuted,
      widthPt: 1.25,
      tailArrow: true,
    }))
    shapes.push(ooxmlLine(nextId(), 'Matrix Y axis', { x: midX, y: plotY + plotH + 0.14 }, { x: midX, y: plotY - 0.14 }, {
      color: tk.inkMuted,
      widthPt: 1.25,
      tailArrow: true,
    }))

    for (let idx = 0; idx < 4; idx += 1) {
      const it = items[idx] ?? { title: '象限 ' + (idx + 1), text: '' }
      const col = idx % 2
      const row = Math.floor(idx / 2)
      const isTarget = idx === 1 // 右上战略核心象限高亮
      const box = {
        x: plotX + col * (qW + gap),
        y: plotY + row * (qH + gap),
        w: qW,
        h: qH,
      }
      shapes.push(ooxmlShape(nextId(), 'Matrix Quadrant ' + (idx + 1), box, {
        preset: cardPreset,
        adj: roundRectAdj(box.w, box.h, chromeCfg.cardRadiusPx),
        fill: isTarget ? tk.accentSoft : tk.surface1,
        stroke: chromeCfg.cardBorderless ? '' : (isTarget ? tk.accentPrimary : tk.hairline),
        strokePt: isTarget ? 1.25 : 0.75,
        anchor: 'ctr',
        marginsIn: { l: 0.22, r: 0.22, t: 0.14, b: 0.14 },
        paragraphs: [
          ...(it.tag ? [ooxmlRichParagraph(it.tag.toUpperCase(), { sizePt: 10.5, color: isTarget ? tk.accentText : tk.inkMuted, bold: true, lang: langAttr, font: theme.fonts.body, spc: 120, spaceAfterPt: 3 })] : []),
          ooxmlRichParagraph(it.title || '', { sizePt: 16, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.heading, spaceAfterPt: 4 }),
          ...(it.text ? [ooxmlRichParagraph(it.text, { sizePt: 13.5, color: tk.inkSecondary, lang: langAttr, font: theme.fonts.body, lineHeight: 1.38 })] : []),
          ...(it.bullets ?? []).map((b) => ooxmlRichParagraph(b, { sizePt: 13.5, color: tk.inkSecondary, bullet: true, bulletColor: tk.accentPrimary, lang: langAttr, font: theme.fonts.body, spaceAfterPt: 2 })),
        ],
      }))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  if (layout === 'callout') {
    const heroText = slide.text || subtitle || ''
    const explicitFormula = typeof slide.formula === 'string' ? slide.formula.trim() : ''
    const items = Array.isArray(slide.items) && slide.items.length > 0
      ? slide.items
      : (normalizeSlideItems(slide.bullets, 'callout') ?? [])
    const heroSegs = splitMathSegments(heroText)
    const isSingleMathHero = heroSegs.length === 1 && heroSegs[0].type === 'math'
    const formulaSource = explicitFormula
      || (isSingleMathHero ? heroSegs[0].latex : '')
      || (variant === 'formula' && looksLikeRawLatex(heroText) ? unwrapOuterMathDelimiters(heroText) : '')

    let cursorY = bodyTopY + 0.06
    if (formulaSource !== '') {
      const hasDistinctCaption = explicitFormula !== '' && heroText !== '' && unwrapOuterMathDelimiters(heroText) !== unwrapOuterMathDelimiters(explicitFormula)
      const calloutH = items.length > 0
        ? (hasDistinctCaption ? 1.54 : 1.76)
        : Math.min(3.10, bodyH - (hasDistinctCaption ? 0.68 : 0.16))
      const box = { x: 0.62, y: cursorY, w: 12.09, h: calloutH }
      shapes.push(renderMathCardPptx('Callout Formula', box, formulaSource, nextId, chromeCfg, theme, {
        emIn: items.length > 0 ? 0.28 : 0.34,
        sizePt: 20,
      }))
      cursorY += calloutH + 0.14
      if (hasDistinctCaption) {
        shapes.push(ooxmlShape(nextId(), 'Callout Formula Caption', { x: 0.62, y: cursorY, w: 12.09, h: 0.42 }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0.12, r: 0.12, t: 0.02, b: 0.02 },
          paragraphs: [
            ooxmlRichParagraph(heroText, {
              sizePt: 14.5,
              color: tk.inkSecondary,
              lang: langAttr,
              align: 'ctr',
              font: theme.fonts.body,
            }),
          ],
        }))
        cursorY += 0.50
      }
    } else if (heroText !== '') {
      const calloutH = items.length > 0 ? 1.55 : 2.85
      const box = { x: 0.62, y: cursorY, w: 12.09, h: calloutH }
      shapes.push(ooxmlShape(nextId(), 'Callout surface', box, {
        preset: cardPreset,
        adj: roundRectAdj(box.w, box.h, chromeCfg.cardRadiusPx),
        fill: tk.surface2,
        stroke: chromeCfg.cardBorderless ? '' : tk.accentPrimary,
        strokePt: 1.0,
        anchor: 'ctr',
        marginsIn: { l: 0.32, r: 0.28, t: 0.16, b: 0.16 },
        paragraphs: [
          ooxmlRichParagraph(heroText, {
            sizePt: variant === 'formula' ? 20 : 18,
            color: tk.inkPrimary,
            accentColor: tk.accentText,
            bold: true,
            lang: langAttr,
            align: variant === 'formula' ? 'ctr' : 'l',
            font: variant === 'formula' ? 'Georgia' : theme.fonts.heading,
            lineHeight: 1.38,
          }),
        ],
      }))
      cursorY += calloutH + 0.20
    }

    if (items.length > 0) {
      const listTop = Math.max(cursorY, bodyTopY + 0.08)
      const listBox = { x: 0.62, y: listTop, w: 12.09, h: Math.max(1.0, bodyBottomY - listTop) }
      const normalizeLegendPart = (val) => {
        const s = String(val ?? '').trim()
        if (!s) return ''
        if (variant === 'formula' && looksLikeRawLatex(s) && !containsLatexMath(s)) return '$' + s + '$'
        return s
      }
      const lines = items.map((it, idx) => (it.tag || (idx + 1) + '.') + ' ' + [it.title, it.text].filter(Boolean).join('：'))
      const fit = computeTextFit(lines, listBox, 'body', { maxPt: 16.5, minPt: 13.5 })
      shapes.push(ooxmlShape(nextId(), 'Callout 1', listBox, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0.08, r: 0.08, t: 0.04, b: 0.04 },
        fontScale: fit.fontScale,
        paragraphs: items.map((it, idx) => {
          const tagPart = normalizeLegendPart(it.tag || String(idx + 1).padStart(2, '0'))
          const titlePart = normalizeLegendPart(it.title || '')
          return ooxmlRichParagraph(
            '**' + tagPart + (titlePart ? '  ' + titlePart : '') + '**' + (it.text ? (titlePart ? '：' : '  ') + it.text : ''),
            {
              sizePt: fit.fontPt,
              color: tk.inkPrimary,
              secondaryColor: tk.inkSecondary,
              lang: langAttr,
              font: theme.fonts.body,
              lineHeight: 1.44,
              spaceAfterPt: 8,
            },
          )
        }),
      }))
    }
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  // 默认版式：bullets（若带 slide.formula 先渲染顶部原生公式条；保留 idBase + 3 Body 兼容逐条点击动画 spid）
  let bulletsAreaTopY = bodyTopY + 0.06
  if (typeof slide.formula === 'string' && slide.formula.trim() !== '') {
    const fBox = { x: 0.62, y: bulletsAreaTopY, w: 12.09, h: 1.42 }
    shapes.push(renderMathCardPptx('Bullets Formula', fBox, slide.formula.trim(), nextId, chromeCfg, theme, {
      emIn: 0.27,
      sizePt: 19,
    }))
    bulletsAreaTopY += 1.56
  }

  const surfaceBox = { x: 0.62, y: bulletsAreaTopY, w: 12.09, h: Math.max(1.4, bodyBottomY - bulletsAreaTopY - 0.06) }
  shapes.push(ooxmlShape(nextId(), 'Bullets container', surfaceBox, {
    preset: cardPreset,
    adj: roundRectAdj(surfaceBox.w, surfaceBox.h, chromeCfg.cardRadiusPx),
    fill: tk.surface1,
    stroke: chromeCfg.cardBorderless ? '' : tk.hairline,
    strokePt: 0.75,
  }))
  if (chromeCfg.cardLeftBar || chromeCfg.chrome === 'saas-bento' || chromeCfg.chrome === 'gov-ceremonial') {
    shapes.push(ooxmlShape(nextId(), 'Bullets accent rail', { x: 0.62, y: bulletsAreaTopY, w: 0.07, h: surfaceBox.h }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
  }

  const has2dMathBullets = bullets.length > 0 && bullets.some((b) => {
    const segs = splitMathSegments(b)
    return segs.some((s) => s.type === 'math' && (s.display || has2dMathConstruct(parseLatexMath(s.latex))))
  })

  if (has2dMathBullets) {
    const innerTop = bulletsAreaTopY + 0.16
    const innerH = surfaceBox.h - 0.32
    const rowGap = 0.10
    const nRows = Math.min(6, bullets.length)
    const rowH = Math.max(0.52, (innerH - rowGap * (nRows - 1)) / nRows)
    bullets.slice(0, nRows).forEach((b, bIdx) => {
      const ry = innerTop + bIdx * (rowH + rowGap)
      const segs = splitMathSegments(b)
      const firstMathIdx = segs.findIndex((s) => s.type === 'math' && (s.display || has2dMathConstruct(parseLatexMath(s.latex))))
      if (firstMathIdx >= 0) {
        const prefixText = segs.slice(0, firstMathIdx).map((s) => s.type === 'text' ? s.value : ('$' + s.latex + '$')).join('').trim()
        const suffixText = segs.slice(firstMathIdx + 1).map((s) => s.type === 'text' ? s.value : ('$' + s.latex + '$')).join('').trim()
        const mathSeg = segs[firstMathIdx]
        if (!prefixText && !suffixText) {
          const eqBox = { x: 0.98, y: ry, w: 11.42, h: rowH }
          if (theme.dark) {
            shapes.push(ooxmlShape(nextId(), 'Bullet Math Plate ' + (bIdx + 1), eqBox, {
              preset: cardPreset,
              adj: roundRectAdj(eqBox.w, eqBox.h, Math.min(6, chromeCfg.cardRadiusPx)),
              fill: '#F8FAFC',
            }))
          }
          shapes.push(ooxmlMathShape(nextId(), 'Bullet Equation ' + (bIdx + 1), eqBox, mathSeg.latex, {
            emIn: Math.min(0.28, rowH * 0.34),
            sizePt: 18,
            align: 'ctr',
          }))
        } else {
          const labelStr = [prefixText, suffixText].filter(Boolean).join(' ')
          const labelW = Math.min(4.6, Math.max(2.4, measureEmWidth(labelStr, true) * 0.24 + 0.45))
          shapes.push(ooxmlShape(nextId(), 'Bullet Math Label ' + (bIdx + 1), { x: 0.94, y: ry, w: labelW, h: rowH }, {
            txBox: true,
            anchor: 'ctr',
            marginsIn: { l: 0.04, r: 0.06, t: 0.02, b: 0.02 },
            paragraphs: [
              ooxmlRichParagraph(prefixText || labelStr, {
                sizePt: 14.5,
                color: tk.inkPrimary,
                secondaryColor: tk.inkSecondary,
                bullet: true,
                bulletChar: '▪',
                bulletColor: tk.accentPrimary,
                lang: langAttr,
                font: theme.fonts.body,
                autoLeadBold: true,
              }),
            ],
          }))
          const eqBox = { x: 0.94 + labelW + 0.12, y: ry, w: Math.max(2.4, 12.42 - (0.94 + labelW + 0.12)), h: rowH }
          if (theme.dark) {
            const astPreview = parseLatexMath(mathSeg.latex)
            const fittedEq = fitFormulaBoxIn(astPreview, eqBox, {
              padXIn: 0.24,
              padYIn: 0.10,
              emIn: Math.min(0.27, rowH * 0.34),
              align: 'l',
            })
            const plateW = Math.min(eqBox.w, Math.max(2.2, fittedEq.w + 0.48))
            shapes.push(ooxmlShape(nextId(), 'Bullet Math Plate ' + (bIdx + 1), { x: eqBox.x, y: ry + 0.04, w: plateW, h: rowH - 0.08 }, {
              preset: cardPreset,
              adj: roundRectAdj(plateW, rowH - 0.08, Math.min(8, chromeCfg.cardRadiusPx)),
              fill: '#F8FAFC',
              stroke: tk.accentPrimary,
              strokePt: 0.75,
            }))
          }
          shapes.push(ooxmlMathShape(nextId(), 'Bullet Equation ' + (bIdx + 1), eqBox, mathSeg.latex, {
            emIn: Math.min(0.27, rowH * 0.34),
            sizePt: 18,
            align: 'l',
          }))
        }
      } else {
        shapes.push(ooxmlShape(nextId(), 'Bullet Row ' + (bIdx + 1), { x: 0.94, y: ry, w: 11.46, h: rowH }, {
          txBox: true,
          anchor: 'ctr',
          marginsIn: { l: 0.04, r: 0.04, t: 0.02, b: 0.02 },
          paragraphs: [
            ooxmlRichParagraph(b, {
              sizePt: 15.5,
              color: tk.inkPrimary,
              secondaryColor: tk.inkSecondary,
              bullet: true,
              bulletChar: '▪',
              bulletColor: tk.accentPrimary,
              lang: langAttr,
              font: theme.fonts.body,
              autoLeadBold: true,
            }),
          ],
        }))
      }
    })
    shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
    return shapes.join('')
  }

  const bodyBox = { x: 0.98, y: bulletsAreaTopY + 0.18, w: 11.42, h: surfaceBox.h - 0.36 }
  const sourceLines = bullets.length > 0 ? bullets : [subtitle || slide.text || '']
  const bodyFit = computeTextFit(sourceLines, bodyBox, 'body', { maxPt: bullets.length <= 4 ? 19 : 17.5, minPt: 13.5 })
  const bodyParagraphs = bullets.length > 0
    ? bullets.map((b) =>
        ooxmlRichParagraph(b, {
          sizePt: bodyFit.fontPt,
          color: tk.inkPrimary,
          secondaryColor: tk.inkSecondary,
          accentColor: tk.accentText,
          codeHighlight: tk.surface2,
          bullet: true,
          bulletChar: '▪',
          bulletColor: tk.accentPrimary,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: bodyFit.lineHeight,
          spaceAfterPt: bullets.length <= 4 ? 12 : 7,
          autoLeadBold: true,
        }),
      )
    : [
        ooxmlRichParagraph(subtitle || slide.text || '', {
          sizePt: bodyFit.fontPt,
          color: tk.inkPrimary,
          secondaryColor: tk.inkSecondary,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: bodyFit.lineHeight,
        }),
      ]

  shapes.push(ooxmlShape(idBase + 3, 'Body', bodyBox, {
    txBox: true,
    anchor: bullets.length > 0 && bullets.length <= 4 ? 'ctr' : 't',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    fontScale: bodyFit.fontScale,
    paragraphs: bodyParagraphs,
  }))
  shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
  return shapes.join('')
}

function computeCardGridBoxes(count, variant, area, gap) {
  const n = Math.max(1, Math.min(6, count))
  const { x, y, w, h } = area

  if (variant === 'bento' && n === 3) {
    const leftW = w * 0.43 - gap / 2
    const rightW = w - leftW - gap
    const halfH = (h - gap) / 2
    return [
      { x, y, w: leftW, h },
      { x: x + leftW + gap, y, w: rightW, h: halfH },
      { x: x + leftW + gap, y: y + halfH + gap, w: rightW, h: halfH },
    ]
  }
  if (variant === 'bento' && n === 4) {
    const topLeftW = w * 0.58 - gap / 2
    const topRightW = w - topLeftW - gap
    const halfH = (h - gap) / 2
    return [
      { x, y, w: topLeftW, h: halfH },
      { x: x + topLeftW + gap, y, w: topRightW, h: halfH },
      { x, y: y + halfH + gap, w: topRightW, h: halfH },
      { x: x + topRightW + gap, y: y + halfH + gap, w: topLeftW, h: halfH },
    ]
  }
  if (n <= 4 && variant !== 'bento') {
    const cardW = (w - gap * (n - 1)) / n
    return Array.from({ length: n }, (_, i) => ({ x: x + i * (cardW + gap), y, w: cardW, h }))
  }
  // 5 或 6 张卡片：2 行等高排布
  const topCols = Math.ceil(n / 2)
  const botCols = n - topCols
  const rowH = (h - gap) / 2
  const topW = (w - gap * (topCols - 1)) / topCols
  const botW = (w - gap * (Math.max(1, botCols) - 1)) / Math.max(1, botCols)
  return [
    ...Array.from({ length: topCols }, (_, i) => ({ x: x + i * (topW + gap), y, w: topW, h: rowH })),
    ...Array.from({ length: botCols }, (_, i) => ({ x: x + i * (botW + gap), y: y + rowH + gap, w: botW, h: rowH })),
  ]
}

export function renderCoreSlideHtml(slide, index, total, ui, langId, manifest = {}, theme) {
  const layout = slide.layout || 'bullets'
  const variant = slide.variant || ''
  const taste = resolveActiveTaste(manifest, slide)
  const cardMaterial = variant === 'frameless' ? 'frameless' : taste.cardMaterial
  const matClass = cardMaterial && cardMaterial !== 'solid' ? ' mat-' + cardMaterial : ''
  const resolveItemIcon = (it, idx) => {
    const explicit = normalizeIconName(it?.icon)
    if (explicit) return explicit
    if (it?.icon === 'auto' || taste.iconMode === 'auto') return resolveSemanticIcon(it, idx)
    return ''
  }
  const kicker = slide.kicker || (layout === 'cover' ? ui.coverKicker : '')
  const title = slide.title || ''
  const subtitle = slide.subtitle || ''
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
  const isFraming = layout === 'cover' || layout === 'closing'
  const coverVariant = layout === 'cover' ? (variant || taste.recipe?.coverVariant || '') : variant
  const inverted = isFraming && (coverVariant === 'inverted' || (!coverVariant && theme.tokens.coverMode === 'inverted-accent'))
  const chromeStyle = resolveChromeStyle(theme, slide, manifest.brand)
  const folioText = String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0')
  const renderHeader = (fallbackKicker = '') =>
    renderSlideHeaderHtml({ ...slide, kicker }, chromeStyle, folioText, isFraming, fallbackKicker)

  let inner = ''
  const diagramHtml = renderDiagramSlideBodyHtml(slide, { theme, langId, chromeStyle })

  if (layout === 'cover') {
    const meta = [slide.text, slide.source, !manifest.brand?.footer ? ui.generatedBy : ''].filter(Boolean)[0] || ''
    const posterHtml = renderPosterCoverHtml(slide, {
      coverVariant,
      title,
      subtitle,
      kicker,
      meta,
      total,
      langId,
      manifest,
      theme,
    })
    if (posterHtml !== null) {
      inner = posterHtml
    } else {
      inner =
        '<div class="cover-shell' + (inverted ? ' is-inverted' : '') + '">' +
        '<div class="cover-lockup">' +
        (kicker !== '' ? '<div class="kicker">' + escapeHtml(kicker) + '</div>' : '') +
        '<h1>' + renderInlineHtml(title) + '</h1>' +
        (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
        '</div>' +
        (meta !== '' ? '<div class="meta">' + escapeHtml(meta) + '</div>' : '') +
        '</div>'
    }
  } else if (layout === 'closing') {
    const items = resolveEffectiveItems(slide)
    const showCtaCards = (variant === 'cta-cards' || items.length >= 2) && (slide.items?.length || bullets.length >= 2)
    inner =
      '<div class="closing-shell' + (inverted ? ' is-inverted' : '') + '">' +
      '<h1>' + renderInlineHtml(title || ui.closingTitle) + '</h1>' +
      '<div class="closing-rule"></div>' +
      (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
      (showCtaCards
        ? '<div class="layout-grid cols-' + Math.min(3, items.length) + ' closing-cards">' +
          items.slice(0, 3).map((it) =>
            '<div class="surface-card' + matClass + '"><div class="card-title">' + renderInlineHtml(it.title || '') + '</div>' +
            (it.text ? '<div class="card-body">' + renderInlineHtml(it.text) + '</div>' : '') + '</div>',
          ).join('') +
          '</div>'
        : '') +
      (!manifest.brand?.footer ? '<div class="meta">' + escapeHtml(ui.generatedBy) + '</div>' : '') +
      '</div>'
  } else if (layout === 'section') {
    const secVariant = variant || taste.recipe?.sectionVariant || ''
    const agendaHtml = secVariant === 'agenda'
      ? renderSectionAgendaHtml(slide, { index, title, subtitle, kicker, langId, manifest })
      : null
    if (agendaHtml !== null) {
      inner = agendaHtml
    } else {
      inner =
        (chromeStyle === 'editorial-folio'
          ? '<div class="editorial-folio-bar"><span class="kicker">' + escapeHtml(kicker || '') + '</span><span class="slide-folio">' + folioText + '</span></div>'
          : '') +
        (kicker !== '' && kicker !== title ? '<div class="kicker section-index">' + escapeHtml(kicker) + '</div>' : '') +
        '<div class="accent-line"></div>' +
        '<h2>' + renderInlineHtml(title) + '</h2>' +
        (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '')
    }
  } else if (layout === 'statement') {
    inner =
      (chromeStyle === 'editorial-folio'
        ? '<div class="editorial-folio-bar"><span class="kicker">' + escapeHtml(kicker || '') + '</span><span class="slide-folio">' + folioText + '</span></div>'
        : (kicker !== '' ? '<div class="kicker">' + escapeHtml(kicker) + '</div>' : '')) +
      '<div class="statement-card"><div class="statement-title">' + renderInlineHtml(title || slide.text || '') + '</div></div>' +
      (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '')
  } else if (layout === 'quote') {
    inner =
      (chromeStyle === 'editorial-folio'
        ? '<div class="editorial-folio-bar"><span class="kicker">' + escapeHtml(kicker || ui.quoteKicker) + '</span><span class="slide-folio">' + folioText + '</span></div>'
        : (kicker !== '' ? '<div class="kicker">' + escapeHtml(kicker || ui.quoteKicker) + '</div>' : '')) +
      '<div class="quote-card">' +
      '<div class="quote-mark" aria-hidden="true">\u201C</div>' +
      '<blockquote class="quote-text">' + escapeHtml(title || slide.text || '') + '</blockquote>' +
      (subtitle !== '' ? '<div class="quote-attr">\u2014\u2014 ' + escapeHtml(subtitle) + '</div>' : '') +
      '</div>'
  } else if (layout === 'mermaid') {
    inner = renderHeader() + renderMermaidHtml(slide, index)
  } else if (diagramHtml !== null) {
    inner = renderHeader(layout === 'harvey' ? ui.tableKicker : '') + diagramHtml
  } else if (layout === 'table' && (slide.tableStyle || slide.visual?.tableStyle) === 'harvey') {
    inner = renderHeader(ui.tableKicker) + renderHarveyTableHtml(slide)
  } else if (layout === 'table') {
    const rows = Array.isArray(slide.rows) ? slide.rows : []
    const head = rows[0] ?? []
    const body = rows.slice(1)
    inner =
      renderHeader(ui.tableKicker) +
      '<table class="deck-table"><thead><tr>' +
      head.map((cell) => '<th' + (isNumericCell(cell) ? ' class="num"' : '') + '>' + renderInlineHtml(cell) + '</th>').join('') +
      '</tr></thead><tbody>' +
      body.map((row) => '<tr>' + row.map((cell) => '<td' + (isNumericCell(cell) ? ' class="num"' : '') + '>' + renderInlineHtml(cell) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>'
  } else if (layout === 'agenda') {
    const items = resolveEffectiveItems(slide)
    const badgeClass = chromeStyle === 'editorial-folio' ? 'item-badge is-editorial-num' : 'item-badge'
    inner =
      renderHeader() +
      '<ol class="layout-grid agenda-grid ' + (items.length > 4 ? 'cols-2' : 'cols-1') + '">' +
      items.map((it, idx) => {
        const active = slide.activeIndex === idx + 1 || it.status === 'accent'
        return (
          '<li class="surface-card agenda-item' + (active ? ' is-active' : '') + '" data-item-index="' + idx + '">' +
          '<span class="' + badgeClass + '">' + escapeHtml(it.tag || String(idx + 1).padStart(2, '0')) + '</span>' +
          '<div class="agenda-copy"><div class="card-title" data-item-field="title">' + renderInlineHtml(it.title || it.text || '') + '</div>' +
          (it.text && it.title ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
          '</div></li>'
        )
      }).join('') +
      '</ol>'
  } else if (layout === 'kpi') {
    const items = resolveEffectiveItems(slide).slice(0, 4)
    const kpiVariant = variant || taste.recipe?.kpiVariant || ''
    const effKpiMatClass = kpiVariant === 'frameless' ? ' mat-frameless' : matClass
    if (kpiVariant === 'spotlight' && items.length >= 2) {
      const hero = items[0]
      const heroIcon = resolveItemIcon(hero, 0)
      const heroHeadMarkup = heroIcon
        ? '<div class="kpi-head-row">' + renderIconBadgeHtml(heroIcon, { style: taste.iconBadgeStyle, size: 20 }) +
          (hero.value && hero.title ? '<div class="kpi-label" data-item-field="title">' + renderInlineHtml(hero.title) + '</div>' : '') +
          '</div>'
        : (hero.value && hero.title ? '<div class="kpi-label" data-item-field="title">' + renderInlineHtml(hero.title) + '</div>' : '')
      const sats = items.slice(1, 4)
      inner =
        renderHeader() +
        '<div class="kpi-spotlight">' +
        '<div class="surface-card kpi-card kpi-hero is-focal' + effKpiMatClass + '" data-item-index="0">' +
        heroHeadMarkup +
        '<div class="kpi-value is-hero-val"><span data-item-field="value">' + escapeHtml(hero.value || hero.title || '—') + '</span>' +
        (hero.unit ? '<small class="kpi-unit" data-item-field="unit">' + escapeHtml(hero.unit) + '</small>' : '') + '</div>' +
        (hero.delta ? '<span class="kpi-delta tone-' + escapeHtml(hero.status || 'positive') + '" data-item-field="delta">' + escapeHtml(hero.delta) + '</span>' : '') +
        (hero.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(hero.text) + '</div>' : '') +
        '</div>' +
        '<div class="kpi-sat-stack">' +
        sats.map((it, si) => {
          const sIcon = resolveItemIcon(it, si + 1)
          return (
            '<div class="kpi-sat-row" data-item-index="' + (si + 1) + '">' +
            (sIcon ? renderIconBadgeHtml(sIcon, { style: taste.iconBadgeStyle, size: 18 }) : '') +
            '<div class="kpi-sat-copy">' +
            (it.value && it.title ? '<div class="card-title" data-item-field="title">' + renderInlineHtml(it.title) + '</div>' : '') +
            (it.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
            '</div>' +
            '<div class="kpi-sat-metric">' +
            '<div class="kpi-sat-val"><span data-item-field="value">' + escapeHtml(it.value || it.title || '—') + '</span>' +
            (it.unit ? '<small class="kpi-unit" data-item-field="unit">' + escapeHtml(it.unit) + '</small>' : '') + '</div>' +
            (it.delta ? '<span class="kpi-sat-delta tone-' + escapeHtml(it.status || 'positive') + '" data-item-field="delta">' + escapeHtml(it.delta) + '</span>' : '') +
            '</div></div>'
          )
        }).join('') +
        '</div></div>'
    } else {
      inner =
        renderHeader() +
        '<div class="layout-grid kpi-grid cols-' + Math.max(1, items.length) + '">' +
        items.map((it, idx) => {
          const iconName = resolveItemIcon(it, idx)
          const headMarkup = iconName
            ? '<div class="kpi-head-row">' + renderIconBadgeHtml(iconName, { style: taste.iconBadgeStyle, size: 18 }) +
              (it.value && it.title ? '<div class="kpi-label" data-item-field="title">' + renderInlineHtml(it.title) + '</div>' : '') +
              '</div>'
            : (it.value && it.title ? '<div class="kpi-label" data-item-field="title">' + renderInlineHtml(it.title) + '</div>' : '')
          return (
            '<div class="surface-card kpi-card' + (idx === 0 ? ' is-focal' : '') + effKpiMatClass + '" data-item-index="' + idx + '">' +
            headMarkup +
            '<div class="kpi-value"><span data-item-field="value">' + escapeHtml(it.value || it.title || '—') + '</span>' +
            (it.unit ? '<small class="kpi-unit" data-item-field="unit">' + escapeHtml(it.unit) + '</small>' : '') + '</div>' +
            (it.delta ? '<span class="kpi-delta tone-' + escapeHtml(it.status || 'positive') + '" data-item-field="delta">' + escapeHtml(it.delta) + '</span>' : '') +
            (it.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
            '</div>'
          )
        }).join('') +
        '</div>'
    }
  } else if (layout === 'cards') {
    const items = resolveEffectiveItems(slide)
    const cardsVariant = variant || taste.recipe?.cardsVariant || ''
    const isBentoHero = cardsVariant === 'bento-hero' && items.length >= 2 && items.length <= 4
    const isFramelessCards = cardsVariant === 'frameless'
    const effMatClass = isFramelessCards ? ' mat-frameless' : matClass
    const thesis = cardsVariant === 'exec-summary' && (slide.text || subtitle)
      ? '<div class="exec-thesis">' + renderInlineHtml(slide.text || subtitle) + '</div>'
      : ''
    const gridClass = isBentoHero
      ? 'bento-hero-grid bento-hero-' + items.length
      : cardsVariant === 'bento'
        ? 'bento-grid bento-' + Math.min(6, Math.max(2, items.length))
        : 'cols-' + Math.min(4, Math.max(2, items.length <= 4 ? items.length : 3)) + (isFramelessCards ? ' is-frameless-grid' : '')
    const badgeClass = chromeStyle === 'editorial-folio' || isFramelessCards ? 'item-badge is-editorial-num' : 'item-badge'
    inner =
      renderHeader() +
      thesis +
      '<div class="layout-grid cards-grid ' + gridClass + '">' +
      items.slice(0, 6).map((it, idx) => {
        const isInvHero = isBentoHero && idx === 0
        const iconName = resolveItemIcon(it, idx)
        const badgeMarkup = iconName
          ? '<div class="card-icon-row">' + renderIconBadgeHtml(iconName, { style: isInvHero ? 'ring' : taste.iconBadgeStyle, size: 19 }) +
            (it.tag ? '<span class="card-icon-tag">' + escapeHtml(it.tag) + '</span>' : '') + '</div>'
          : '<span class="' + badgeClass + '">' + escapeHtml(it.tag || String(idx + 1).padStart(2, '0')) + '</span>'
        return (
          '<article class="surface-card' + (isInvHero ? ' is-inverted-hero' : ((cardsVariant === 'bento' && idx === 0) ? ' is-hero' : '') + effMatClass) + '" data-item-index="' + idx + '">' +
          badgeMarkup +
          (it.title ? '<h3 class="card-title" data-item-field="title">' + renderInlineHtml(it.title) + '</h3>' : '') +
          (it.value ? '<div class="card-stat" data-item-field="value">' + escapeHtml(it.value + (it.unit ? ' ' + it.unit : '')) + '</div>' : '') +
          (it.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
          (it.bullets?.length
            ? '<ul class="card-bullets">' + it.bullets.map((b) => '<li>' + renderInlineHtml(b, { autoLeadBold: true }) + '</li>').join('') + '</ul>'
            : '') +
          '</article>'
        )
      }).join('') +
      '</div>'
  } else if (layout === 'comparison') {
    const items = resolveEffectiveItems(slide)
    if (variant === 'issue-action') {
      inner =
        renderHeader() +
        '<div class="layout-grid issue-action-list">' +
        items.slice(0, 4).map((it, idx) =>
          '<div class="issue-action-row" data-item-index="' + idx + '">' +
          '<div class="surface-card issue-box"><span class="card-title" data-item-field="title">' + renderInlineHtml(it.title || '') + '</span></div>' +
          '<span class="bridge-arrow" aria-hidden="true">→</span>' +
          '<div class="surface-card action-box"><span class="card-body" data-item-field="text">' + renderInlineHtml(it.text || (it.bullets ?? []).join('；'), { autoLeadBold: true }) + '</span></div>' +
          '</div>',
        ).join('') +
        '</div>'
    } else {
      const twoSides = items.length <= 2
        ? items
        : [
            { title: items[0]?.title || '方案 A', bullets: items.slice(0, Math.ceil(items.length / 2)).map((x) => [x.title, x.text].filter(Boolean).join('：')) },
            { title: items[Math.ceil(items.length / 2)]?.title || '方案 B', bullets: items.slice(Math.ceil(items.length / 2)).map((x) => [x.title, x.text].filter(Boolean).join('：')) },
          ]
      const isDoDont = variant === 'do-dont'
      inner =
        renderHeader() +
        '<div class="layout-grid cols-2 comparison-grid">' +
        [0, 1].map((side) => {
          const it = twoSides[side] ?? { title: side === 0 ? '对照项' : '推荐项' }
          const headPrefix = isDoDont ? (side === 0 ? '✗ ' : '✓ ') : ''
          return (
            '<div class="surface-card comp-card side-' + side + (isDoDont ? ' is-dodont' : '') + '" data-item-index="' + side + '">' +
            '<div class="comp-head" data-item-field="title">' + escapeHtml(headPrefix) + renderInlineHtml(it.title || '') + '</div>' +
            '<div class="comp-body">' +
            (it.text ? '<p class="card-body" data-item-field="text">' + renderInlineHtml(it.text, { autoLeadBold: true }) + '</p>' : '') +
            (it.bullets?.length ? '<ul class="card-bullets">' + it.bullets.map((b) => '<li>' + renderInlineHtml(b, { autoLeadBold: true }) + '</li>').join('') + '</ul>' : '') +
            '</div></div>'
          )
        }).join('') +
        '</div>'
    }
  } else if (layout === 'matrix') {
    const items = resolveEffectiveItems(slide).slice(0, 4)
    inner =
      renderHeader() +
      '<div class="layout-grid cols-2 matrix-grid">' +
      Array.from({ length: 4 }, (_, idx) => {
        const it = items[idx] ?? { title: '象限 ' + (idx + 1) }
        return (
          '<div class="surface-card matrix-cell' + (idx === 1 ? ' is-target' : '') + '" data-item-index="' + idx + '">' +
          (it.tag ? '<div class="kicker matrix-tag">' + escapeHtml(it.tag) + '</div>' : '') +
          '<div class="card-title" data-item-field="title">' + renderInlineHtml(it.title || '') + '</div>' +
          (it.text ? '<div class="card-body" data-item-field="text">' + renderInlineHtml(it.text) + '</div>' : '') +
          '</div>'
        )
      }).join('') +
      '</div>'
  } else if (layout === 'callout') {
    const heroText = slide.text || subtitle || ''
    const explicitFormula = typeof slide.formula === 'string' ? slide.formula.trim() : ''
    const heroSegs = splitMathSegments(heroText)
    const isSingleMathHero = heroSegs.length === 1 && heroSegs[0].type === 'math'
    const formulaSource = explicitFormula
      || (isSingleMathHero ? heroSegs[0].latex : '')
      || (variant === 'formula' && looksLikeRawLatex(heroText) ? unwrapOuterMathDelimiters(heroText) : '')
    const hasDistinctCaption = explicitFormula !== '' && heroText !== '' && unwrapOuterMathDelimiters(heroText) !== unwrapOuterMathDelimiters(explicitFormula)
    const items = Array.isArray(slide.items) && slide.items.length > 0
      ? slide.items
      : (normalizeSlideItems(slide.bullets, 'callout') ?? [])
    const renderLegendBadge = (rawBadge) => {
      if (variant === 'formula' && looksLikeRawLatex(rawBadge) && !containsLatexMath(rawBadge)) {
        return latexToMathMl(rawBadge, { display: false, className: 'deck-math is-inline' })
      }
      return containsLatexMath(rawBadge) ? renderInlineHtml(rawBadge) : escapeHtml(rawBadge)
    }
    inner =
      renderHeader() +
      (formulaSource !== ''
        ? '<div class="callout-hero is-formula is-omath callout-formula formula-plate">' + latexToMathMl(formulaSource, { display: true, className: 'deck-math is-block' }) + '</div>' +
          (hasDistinctCaption ? '<div class="formula-caption">' + renderInlineHtml(heroText) + '</div>' : '')
        : (heroText ? '<div class="callout-hero' + (variant === 'formula' ? ' is-formula callout-formula' : '') + '">' + renderInlineHtml(heroText) + '</div>' : '')) +
      (items.length
        ? '<ul class="layout-grid callout-list">' +
          items.map((it, idx) =>
            '<li class="surface-card callout-row" data-item-index="' + idx + '">' +
            '<span class="item-badge">' + renderLegendBadge(it.tag || String(idx + 1).padStart(2, '0')) + '</span>' +
            '<div class="card-body">' +
            (it.title ? '<strong data-item-field="title">' + renderInlineHtml(it.title) + '</strong>' : '') +
            (it.text ? (it.title ? ' ' : '') + '<span data-item-field="text">' + renderInlineHtml(it.text) + '</span>' : '') +
            '</div></li>',
          ).join('') +
          '</ul>'
        : '')
  } else {
    // bullets 默认版式（严格保持 <li style="--i:0">纯文本</li> 无多余包裹，兼容 test/features.test.mjs:202）
    const topFormulaBanner = typeof slide.formula === 'string' && slide.formula.trim() !== ''
      ? '<div class="callout-hero is-formula is-omath callout-formula formula-plate">' + latexToMathMl(slide.formula.trim(), { display: true, className: 'deck-math is-block' }) + '</div>'
      : ''
    inner =
      renderHeader() +
      topFormulaBanner +
      (subtitle !== '' && bullets.length === 0 ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
      (bullets.length > 0
        ? '<ul class="bullets-list' + (variant === 'two-column' ? ' cols-2' : '') + '">' +
          bullets.map((bullet, bulletIndex) => '<li style="--i:' + bulletIndex + '">' + renderInlineHtml(bullet, { autoLeadBold: true }) + '</li>').join('') +
          '</ul>'
        : '')
  }

  return inner + renderSlideChromeHtml(slide, chromeStyle, folioText, langId, manifest, isFraming)
}

export const LAYOUT_CSS = `
.slide-inner{display:flex;flex-direction:column;justify-content:center;width:100%;max-width:1560px;margin:0 auto;height:100%;gap:clamp(16px,2vw,28px)}
.slide--cover .slide-inner,.slide--closing .slide-inner,.slide--section .slide-inner,.slide--statement .slide-inner,.slide--quote .slide-inner{justify-content:center}
.slide-header{border-bottom:1px solid var(--hairline);padding-bottom:clamp(12px,1.5vw,20px)}
.slide-header .kicker{margin-bottom:8px}
.slide-header h2{font-size:clamp(26px,3.1vw,46px);max-width:34ch;line-height:1.18}
.cover-shell{display:flex;flex-direction:column;justify-content:center;gap:clamp(24px,3.5vw,44px);min-height:72%}
.cover-shell.is-inverted,.closing-shell.is-inverted{
  background:var(--cover-bg);color:#F8FAFC;padding:clamp(36px,5vw,76px);
  border-radius:calc(var(--radius) * 1.4);box-shadow:0 24px 60px rgba(0,0,0,.18);
}
.cover-shell.is-inverted h1,.closing-shell.is-inverted h1{color:#F8FAFC}
.cover-shell.is-inverted .subtitle,.closing-shell.is-inverted .subtitle{color:#E2E8F0}
.cover-shell.is-inverted .kicker{color:#FDE68A}
.cover-shell.is-inverted .meta,.closing-shell.is-inverted .meta{color:#CBD5E1;border-top-color:rgba(255,255,255,.2)}
.cover-lockup{border-left:5px solid var(--accent);padding-left:clamp(20px,2.6vw,38px)}
.cover-shell.is-inverted .cover-lockup{border-left-color:#D4AF37}
.cover-shell .meta{margin-top:auto;padding-top:16px;border-top:1px solid var(--hairline)}
.closing-shell{display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px}
.closing-rule{width:96px;height:4px;background:var(--accent);border-radius:2px}
.closing-cards{width:100%;margin-top:14px;text-align:center}
.section-index{font-size:clamp(22px,3vw,44px);letter-spacing:.08em}
.statement-card,.quote-card{
  background:var(--surface1);border:1px solid var(--hairline);border-left:6px solid var(--accent);
  border-radius:var(--radius);padding:clamp(24px,3.6vw,52px);
}
.statement-card .statement-title{border-left:0;padding-left:0}
.inline-code{background:var(--surface2);border:1px solid var(--hairline);border-radius:5px;padding:.08em .38em;font-size:.9em}
.ink-sec{color:var(--ink-secondary)}
.bullets-list{
  margin:0;padding:clamp(18px,2.4vw,34px) clamp(22px,2.8vw,40px);list-style:none;
  display:grid;gap:clamp(12px,1.5vw,20px);background:var(--surface1);
  border:1px solid var(--hairline);border-left:4px solid var(--accent);border-radius:var(--radius);
}
.bullets-list.cols-2{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:32px}
.bullets-list li{position:relative;padding-left:clamp(22px,2vw,32px);font-size:clamp(17px,1.8vw,26px);line-height:1.48;max-width:52ch}
.bullets-list li::before{
  content:"";position:absolute;left:0;top:.56em;width:.42em;height:.42em;
  background:var(--accent);border-radius:2px;
}
.layout-grid{display:grid;gap:clamp(14px,1.6vw,22px);margin:0;padding:0;list-style:none;width:100%}
.cols-1{grid-template-columns:1fr}
.cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}
.cols-5{grid-template-columns:repeat(5,minmax(0,1fr))}
.cols-6{grid-template-columns:repeat(6,minmax(0,1fr))}
.surface-card{
  background:var(--surface1);border:1px solid var(--hairline);border-radius:var(--radius);
  padding:clamp(16px,2vw,28px);display:flex;flex-direction:column;gap:10px;min-width:0;
}
.surface-card.is-hero,.surface-card.is-focal,.surface-card.is-target,.surface-card.is-active{
  background:var(--accent-soft);border-color:var(--accent);
}
.item-badge{
  display:inline-flex;align-items:center;justify-content:center;align-self:flex-start;
  min-width:34px;height:26px;padding:0 9px;border-radius:calc(var(--radius) * .6);
  background:var(--accent-soft);color:var(--accent-text);font-weight:700;font-size:13px;
  font-variant-numeric:tabular-nums;
}
.item-badge.is-editorial-num{
  background:transparent;padding:0;min-width:auto;height:auto;border-radius:0;
  font-family:var(--font-heading);font-size:clamp(22px,2.2vw,34px);font-weight:800;line-height:1;
}
.card-title{margin:0;font-family:var(--font-heading);font-size:clamp(17px,1.6vw,23px);font-weight:700;line-height:1.3;color:var(--fg)}
.card-stat{font-family:var(--font-heading);font-size:clamp(24px,2.6vw,38px);font-weight:800;color:var(--accent-text);font-variant-numeric:tabular-nums}
.card-body{margin:0;font-size:clamp(14px,1.35vw,19px);line-height:1.5;color:var(--ink-secondary)}
.card-bullets{margin:4px 0 0;padding-left:1.15em;display:grid;gap:6px;color:var(--ink-secondary);font-size:clamp(14px,1.3vw,18px);line-height:1.45}
.kpi-card{justify-content:space-between}
.kpi-label{font-size:clamp(13px,1.15vw,16px);font-weight:600;color:var(--muted)}
.kpi-value{font-family:var(--font-heading);font-size:clamp(34px,4.4vw,68px);font-weight:800;line-height:1.04;letter-spacing:-.025em;color:var(--fg);font-variant-numeric:tabular-nums}
.kpi-card.is-focal .kpi-value{color:var(--accent-text)}
.kpi-unit{font-size:.42em;font-weight:600;color:var(--muted);margin-left:.22em}
.kpi-delta{display:inline-flex;align-self:flex-start;padding:3px 10px;border-radius:99px;font-size:13px;font-weight:700;background:var(--surface2);border:1px solid var(--hairline);font-variant-numeric:tabular-nums}
.kpi-delta.tone-positive{color:var(--positive)}
.kpi-delta.tone-negative{color:var(--negative)}
.kpi-delta.tone-warning{color:var(--warning)}
.kpi-delta.tone-accent{color:var(--accent-text)}
.bento-grid.bento-3{grid-template-columns:5fr 7fr;grid-template-rows:repeat(2,minmax(0,1fr))}
.bento-grid.bento-3 > :first-child{grid-row:1 / span 2}
.bento-grid.bento-4{grid-template-columns:repeat(12,minmax(0,1fr))}
.bento-grid.bento-4 > :nth-child(1){grid-column:span 7}
.bento-grid.bento-4 > :nth-child(2){grid-column:span 5}
.bento-grid.bento-4 > :nth-child(3){grid-column:span 5}
.bento-grid.bento-4 > :nth-child(4){grid-column:span 7}
.bento-grid.bento-5,.bento-grid.bento-6{grid-template-columns:repeat(3,minmax(0,1fr))}
.exec-thesis{background:var(--accent-soft);border:1px solid var(--accent);border-radius:var(--radius);padding:14px 20px;font-weight:600;font-size:clamp(15px,1.45vw,21px);line-height:1.4}
.agenda-item{flex-direction:row;align-items:center;gap:16px;padding:14px 20px}
.comp-card{padding:0;overflow:hidden}
.comp-head{padding:14px 22px;font-family:var(--font-heading);font-weight:700;font-size:clamp(16px,1.55vw,22px);background:var(--surface2);color:var(--fg)}
.comp-card.side-1 .comp-head{background:var(--accent);color:var(--ink-on-accent)}
.comp-card.is-dodont.side-0 .comp-head{background:var(--negative);color:#FFF}
.comp-card.is-dodont.side-1 .comp-head{background:var(--positive);color:#FFF}
.comp-body{padding:18px 22px;display:flex;flex-direction:column;gap:8px}
.issue-action-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px}
.issue-box{border-left:4px solid var(--negative)}
.action-box{background:var(--accent-soft);border-color:var(--accent)}
.bridge-arrow{color:var(--accent-text);font-weight:800;font-size:22px}
.matrix-grid{position:relative}
.callout-hero{background:var(--surface2);border:1px solid var(--accent);border-left:5px solid var(--accent);border-radius:var(--radius);padding:20px 26px;font-size:clamp(17px,1.8vw,26px);font-weight:700;line-height:1.4}
.callout-hero.is-formula{font-family:Georgia,"Times New Roman",serif;text-align:center}
.callout-row{flex-direction:row;align-items:center;padding:12px 18px}
.slide[data-table-style="booktabs"] .deck-table th{background:transparent;border-top:2px solid var(--fg);border-bottom:1px solid var(--fg)}
.slide[data-table-style="booktabs"] .deck-table td{background:transparent !important;border-bottom:0}
.slide[data-table-style="booktabs"] .deck-table tbody tr:last-child td{border-bottom:2px solid var(--fg)}
.slide[data-table-style="minimal"] .deck-table th{background:transparent;color:var(--accent-text);border-bottom:2px solid var(--accent)}
.slide[data-table-style="minimal"] .deck-table tbody tr:nth-child(even){background:transparent}
/* Phase 4 MathML & 4 Pinnacle Consulting Layouts CSS */
math.deck-math{font-family:"Cambria Math","Latin Modern Math",Georgia,serif}
math.deck-math.is-block{display:block;font-size:clamp(20px,2.2vw,32px);margin:4px auto;overflow-x:auto}
math.deck-math.is-inline{font-size:1.06em;vertical-align:middle}
.callout-hero.is-omath{padding:22px 30px;display:flex;align-items:center;justify-content:center}
.formula-caption{text-align:center;color:var(--ink-secondary);font-size:clamp(14px,1.35vw,18px);margin-top:-6px}
${AESTHETIC_STUDIO_CSS}
${DIAGRAMS_CSS}
${CHROME_CSS}
${MERMAID_CSS}
@media (max-width:900px){
  .cols-3,.cols-4,.cols-5,.cols-6,.bento-grid.bento-3,.bento-grid.bento-4,.bento-grid.bento-5,.bento-grid.bento-6,.bento-hero-grid,.kpi-spotlight,.section-agenda-shell,.cover-shell.is-architectural,.ed-main-grid,.ed-meta-strip,.tam-board,.arch-board.has-sidecar,.org-children,.flywheel-stage,.mekko-board,.porter-board,.swot-cross{grid-template-columns:1fr}
  .bento-grid.bento-3 > :first-child,.bento-grid.bento-4 > *,.bento-hero-grid > :first-child{grid-row:auto;grid-column:auto}
  .issue-action-row,.gantt-head,.gantt-row,.arch-tier,.porter-support-zone{grid-template-columns:1fr}
  .flywheel-hub,.swot-anchor{position:static;transform:none;margin:0 auto}
}
`

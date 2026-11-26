/**
 * deck-covers.mjs —— dsh-ppt 海报级封面变体、实时章节议程过场与 Aesthetic Studio 材质/光影样式模块。
 *
 * 包含：
 *   - 4 套海报级封面（keynote-glow / editorial-grid / architectural / split-bleed）HTML + 原生 OOXML 双端同构渲染
 *   - section[agenda] 实时多章节议程追踪过场页（自动汇总全套 section 章节并高亮当前章）
 *   - AESTHETIC_STUDIO_CSS（海报封面、议程过场、Spotlight KPI、Bento-Hero、4 种卡片材质与矢量图标徽章样式）
 *
 * 零外部运行时依赖。
 */

import { relativeLuminance, mixHex } from './deck-themes.mjs'
import {
  CANVAS_IN,
  roundRectAdj,
  escapeHtml,
  renderInlineHtml,
  computeTextFit,
  ooxmlRichParagraph,
  ooxmlShape,
  ooxmlCustGeomShape,
  ooxmlLine,
  computeBadgePillWidth,
  renderSlideChromePptx,
} from './deck-chrome.mjs'

export const POSTER_COVER_VARIANTS = new Set([
  'keynote-glow',
  'editorial-grid',
  'architectural',
  'split-bleed',
])

export const COVER_PATTERNS = new Set(['dots', 'grid', 'rings', 'waves', 'isometric-mesh', 'editorial-arcs'])

/**
 * 标准浅色/社论封面右侧建筑感视觉面板（告别光秃秃的空白色块，叠加克制同心弧线、极细坐标线与版次标引）。
 */
export function renderEditorialCoverArtPptx(theme, nextId, opts = {}) {
  const tk = theme.tokens
  const { coverPattern = '', total = 1, langAttr = 'zh-CN' } = opts
  const out = []
  const panelX = 9.55
  const panelW = CANVAS_IN.w - panelX
  const panelFill = theme.dark ? tk.surface2 : mixHex(tk.canvas, tk.accentPrimary, 0.045)
  out.push(ooxmlShape(nextId(), 'Cover top accent', { x: 0, y: 0, w: CANVAS_IN.w, h: 0.08 }, {
    preset: 'rect',
    fill: tk.accentPrimary,
  }))
  out.push(ooxmlShape(nextId(), 'Cover architectural panel', { x: panelX, y: 0.08, w: panelW, h: CANVAS_IN.h - 0.08 }, {
    preset: 'rect',
    fill: panelFill,
  }))
  out.push(ooxmlLine(nextId(), 'Cover vertical hairline', { x: panelX, y: 0.08 }, { x: panelX, y: CANVAS_IN.h }, {
    color: tk.hairline,
    widthPt: 0.75,
  }))
  if (coverPattern && COVER_PATTERNS.has(String(coverPattern).toLowerCase())) {
    out.push(renderCoverPatternPptx(coverPattern, theme, nextId))
  } else {
    // 克制建筑感同心圆弧 + 极细黄金比例十字标线 + 右下角版次签（使用预混不透明色避免 LibreOffice 半透明椭圆方框伪影）
    const cx = panelX + panelW * 0.56
    const cy = 3.55
    const innerFill = mixHex(panelFill, tk.accentPrimary, 0.07)
    const ringStrokes = [
      mixHex(panelFill, tk.accentPrimary, 0.28),
      mixHex(panelFill, tk.accentPrimary, 0.19),
      mixHex(panelFill, tk.accentPrimary, 0.12),
    ]
    ;[1.55, 2.55, 3.55].forEach((d, idx) => {
      out.push(ooxmlShape(nextId(), `Cover Editorial Ring ${idx + 1}`, { x: cx - d / 2, y: cy - d / 2, w: d, h: d }, {
        preset: 'ellipse',
        fill: idx === 0 ? innerFill : '',
        stroke: ringStrokes[idx],
        strokePt: idx === 0 ? 1.1 : 0.75,
      }))
    })
    out.push(ooxmlLine(nextId(), 'Cover Editorial Axis V', { x: cx, y: 1.05 }, { x: cx, y: 6.05 }, {
      color: tk.hairline,
      widthPt: 0.55,
      dash: 'dot',
    }))
    out.push(ooxmlLine(nextId(), 'Cover Editorial Axis H', { x: panelX + 0.38, y: cy }, { x: CANVAS_IN.w - 0.36, y: cy }, {
      color: tk.hairline,
      widthPt: 0.55,
      dash: 'dot',
    }))
    out.push(ooxmlShape(nextId(), 'Cover Editorial Core Dot', { x: cx - 0.09, y: cy - 0.09, w: 0.18, h: 0.18 }, {
      preset: 'ellipse',
      fill: tk.accentPrimary,
    }))
    const issueLabel = (langAttr === 'en-US' ? 'EDITION  ·  ' : '图谱篇幅  ·  ') + String(total).padStart(2, '0') + (langAttr === 'en-US' ? ' SLIDES' : ' 页')
    out.push(ooxmlShape(nextId(), 'Cover Editorial Colophon', { x: panelX + 0.35, y: 6.56, w: panelW - 0.65, h: 0.36 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(issueLabel, {
          sizePt: 9.5,
          color: tk.inkMuted,
          bold: true,
          align: 'r',
          lang: langAttr,
          font: theme.fonts.body,
          spc: 140,
        }),
      ],
    }))
  }
  return out.join('')
}

/**
 * 封面高定程序化矢量底纹（dots / grid / rings / waves / isometric-mesh / editorial-arcs）—— 零外部依赖，低透明度克制点缀。
 */
export function renderCoverPatternPptx(pattern, theme, nextId) {
  const p = String(pattern || '').trim().toLowerCase()
  if (!COVER_PATTERNS.has(p)) return ''
  const tk = theme.tokens
  const col = theme.dark ? '#FFFFFF' : tk.accentPrimary
  const col2 = theme.dark ? tk.accentPrimary : (tk.accentSecondary || tk.accentPrimary)
  const out = []
  if (p === 'grid') {
    for (let gx = 0.8; gx <= 12.6; gx += 1.18) {
      out.push(ooxmlLine(nextId(), 'Cover Pattern V', { x: gx, y: 0 }, { x: gx, y: CANVAS_IN.h }, { color: tk.hairline, widthPt: 0.4 }))
    }
    for (let gy = 0.75; gy <= 6.8; gy += 1.15) {
      out.push(ooxmlLine(nextId(), 'Cover Pattern H', { x: 0, y: gy }, { x: CANVAS_IN.w, y: gy }, { color: tk.hairline, widthPt: 0.4 }))
    }
  } else if (p === 'rings') {
    ;[3.6, 5.4, 7.2].forEach((d, ri) => {
      out.push(ooxmlShape(nextId(), `Cover Pattern Ring ${ri + 1}`, { x: 10.6 - d / 2, y: 3.75 - d / 2, w: d, h: d }, {
        preset: 'ellipse',
        fill: '',
        stroke: col,
        strokeAlpha: theme.dark ? 0.10 : 0.12,
        strokePt: 0.75,
      }))
    })
  } else if (p === 'dots') {
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 6; c += 1) {
        out.push(ooxmlShape(nextId(), `Cover Dot ${r}-${c}`, { x: 9.8 + c * 0.54, y: 0.9 + r * 0.54, w: 0.06, h: 0.06 }, {
          preset: 'ellipse',
          fill: col,
          fillAlpha: theme.dark ? 0.16 : 0.18,
        }))
      }
    }
  } else if (p === 'waves') {
    // 4 flowing cubic-Bezier topographic waves across the lower-right horizon
    for (let wi = 0; wi < 4; wi += 1) {
      const yOff = 4.55 + wi * 0.52
      const box = { x: 4.8, y: yOff, w: 8.55, h: 2.15 }
      const pathXml =
        `<a:moveTo><a:pt x="0" y="7400"/></a:moveTo>` +
        `<a:cubicBezTo><a:pt x="2800" y="${2200 + wi * 450}"/><a:pt x="5600" y="${9600 - wi * 380}"/><a:pt x="10000" y="${1600 + wi * 520}"/></a:cubicBezTo>`
      out.push(ooxmlCustGeomShape(nextId(), `Cover Wave ${wi + 1}`, box, pathXml, {
        pathW: 10000,
        pathH: 10000,
        fill: '',
        stroke: wi % 2 === 0 ? col : col2,
        strokeAlpha: theme.dark ? (0.18 - wi * 0.025) : (0.20 - wi * 0.028),
        strokePt: wi === 0 ? 1.4 : 0.9,
      }))
    }
  } else if (p === 'isometric-mesh') {
    // Architectural isometric diamond lattice cascading across the right margin
    const rx = 0.62, ry = 0.34
    const cells = [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2], [2, 2], [1.5, 3]]
    cells.forEach(([gx, gy], ci) => {
      const bx = 9.2 + gx * (rx * 1.95) - rx
      const by = 0.75 + gy * (ry * 2.05) - ry
      const pathXml = '<a:moveTo><a:pt x="5000" y="0"/></a:moveTo><a:lnTo><a:pt x="10000" y="5000"/></a:lnTo><a:lnTo><a:pt x="5000" y="10000"/></a:lnTo><a:lnTo><a:pt x="0" y="5000"/></a:lnTo><a:close/>'
      out.push(ooxmlCustGeomShape(nextId(), `Cover Iso Tile ${ci + 1}`, { x: bx, y: by, w: rx * 2, h: ry * 2 }, pathXml, {
        pathW: 10000,
        pathH: 10000,
        fill: ci % 3 === 0 ? col : '',
        fillAlpha: ci % 3 === 0 ? (theme.dark ? 0.08 : 0.09) : 0,
        stroke: ci % 2 === 0 ? col : col2,
        strokeAlpha: theme.dark ? 0.16 : 0.18,
        strokePt: 0.75,
      }))
    })
  } else if (p === 'editorial-arcs') {
    // Swiss concentric quarter-arcs + golden-ratio crosshair rules on the right edge
    ;[4.2, 6.2, 8.2].forEach((d, ri) => {
      out.push(ooxmlShape(nextId(), `Cover Editorial Arc ${ri + 1}`, { x: 12.8 - d / 2, y: 6.9 - d / 2, w: d, h: d }, {
        preset: 'ellipse',
        fill: '',
        stroke: ri === 0 ? col2 : col,
        strokeAlpha: theme.dark ? (0.14 - ri * 0.025) : (0.16 - ri * 0.03),
        strokePt: ri === 0 ? 1.1 : 0.65,
      }))
    })
    out.push(ooxmlLine(nextId(), 'Editorial Crosshair V', { x: 9.75, y: 0.4 }, { x: 9.75, y: 7.1 }, { color: tk.hairline, widthPt: 0.5 }))
    out.push(ooxmlLine(nextId(), 'Editorial Crosshair H', { x: 8.1, y: 4.85 }, { x: 13.0, y: 4.85 }, { color: tk.hairline, widthPt: 0.5 }))
  }
  return out.join('')
}

export function renderCoverPatternSvgHtml(pattern, theme) {
  const p = String(pattern || '').trim().toLowerCase()
  if (!['waves', 'isometric-mesh', 'editorial-arcs', 'rings'].includes(p)) return ''
  const tk = theme?.tokens || {}
  const col = theme?.dark ? '#FFFFFF' : (tk.accentPrimary || '#0057B8')
  const col2 = theme?.dark ? (tk.accentPrimary || '#60A5FA') : (tk.accentSecondary || col)
  if (p === 'rings') {
    const rings = [170, 255, 340].map((r, ri) =>
      `<circle cx="1018" cy="360" r="${r}" fill="none" stroke="${ri === 0 ? col2 : col}" stroke-opacity="${(theme?.dark ? 0.14 - ri * 0.025 : 0.15 - ri * 0.025).toFixed(3)}" stroke-width="${ri === 0 ? 1.5 : 1}"/>`
    ).join('')
    return `<svg class="cover-pat-svg" viewBox="0 0 1280 720" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">${rings}</svg>`
  }
  if (p === 'waves') {
    const paths = [0, 1, 2, 3].map((wi) => {
      const y0 = 260 + wi * 38
      return `<path d="M 380 ${y0 + 70} C 640 ${y0 - 30 + wi * 12}, 860 ${y0 + 110 - wi * 10}, 1280 ${y0 - 20 + wi * 16}" fill="none" stroke="${wi % 2 === 0 ? col : col2}" stroke-opacity="${(0.22 - wi * 0.03).toFixed(2)}" stroke-width="${wi === 0 ? 2 : 1.3}"/>`
    }).join('')
    return `<svg class="cover-pat-svg" viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`
  }
  if (p === 'isometric-mesh') {
    const rx = 60, ry = 32
    const cells = [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2], [2, 2], [1.5, 3]]
    const polys = cells.map(([gx, gy], ci) => {
      const cx = 880 + gx * (rx * 1.95)
      const cy = 74 + gy * (ry * 2.05)
      const pts = `${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`
      return `<polygon points="${pts}" fill="${ci % 3 === 0 ? col : 'none'}" fill-opacity="0.08" stroke="${ci % 2 === 0 ? col : col2}" stroke-opacity="0.18" stroke-width="1.2"/>`
    }).join('')
    return `<svg class="cover-pat-svg" viewBox="0 0 1280 720" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">${polys}</svg>`
  }
  const arcs = [210, 310, 410].map((r, ri) =>
    `<circle cx="1220" cy="660" r="${r}" fill="none" stroke="${ri === 0 ? col2 : col}" stroke-opacity="${(0.16 - ri * 0.03).toFixed(2)}" stroke-width="${ri === 0 ? 1.6 : 1}"/>`
  ).join('')
  return `<svg class="cover-pat-svg" viewBox="0 0 1280 720" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">${arcs}<line x1="940" y1="40" x2="940" y2="680" stroke="${tk.hairline || '#CBD5E1'}" stroke-opacity="0.45"/><line x1="780" y1="465" x2="1260" y2="465" stroke="${tk.hairline || '#CBD5E1'}" stroke-opacity="0.45"/></svg>`
}

export function renderPosterCoverPptx(slide, ctx) {
  const { coverVariant, title, subtitle, kicker, metaText, total, theme, langAttr, manifest, idBase, nextId } = ctx
  const tk = theme.tokens
  const hasHeroPhoto = Boolean(slide?.image?.assetId || slide?.image?.src)

  // Poster Cover 0：封面真图混排（左侧深邃渐变排版区 + 右侧全出血高清视觉图，0 遮挡 + WCAG AAA 对比）
  if (hasHeroPhoto) {
    const shapes = []
    const panelW = 6.65
    const darkBase = tk.coverBg && relativeLuminance(tk.coverBg) < 0.25
      ? tk.coverBg
      : mixHex(tk.accentPrimary, '#070B14', 0.62)
    const darkEnd = mixHex(darkBase, tk.accentSecondary, 0.22)
    shapes.push(ooxmlShape(nextId(), 'Photo Cover Left Panel', { x: 0, y: 0, w: panelW, h: CANVAS_IN.h }, {
      preset: 'rect',
      gradientStops: [
        { offset: 0, color: darkBase },
        { offset: 1, color: darkEnd },
      ],
      gradientAngle: 145,
    }))
    shapes.push(ooxmlShape(nextId(), 'Photo Cover Top Accent', { x: 0, y: 0, w: panelW, h: 0.08 }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
    if (kicker !== '') {
      shapes.push(ooxmlShape(idBase + 4, 'Kicker', { x: 0.76, y: 1.38, w: panelW - 1.32, h: 0.36 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), { sizePt: 11, color: '#FDE68A', bold: true, lang: langAttr, font: theme.fonts.body, spc: 180 }),
        ],
      }))
    }
    const titleBox = { x: 0.76, y: 1.88, w: panelW - 1.32, h: 2.38 }
    const titleFit = computeTextFit(title, titleBox, 'coverTitle', { maxPt: 38, minPt: 24, padXPt: 2, padYPt: 4 })
    shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: titleFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(title, { sizePt: titleFit.fontPt, color: '#F8FAFC', bold: true, lang: langAttr, font: theme.fonts.heading, lineHeight: titleFit.lineHeight }),
      ],
    }))
    shapes.push(ooxmlShape(nextId(), 'Photo Cover Rule', { x: 0.76, y: 4.38, w: 1.10, h: 0.055 }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
    if (subtitle !== '') {
      const subBox = { x: 0.76, y: 4.62, w: panelW - 1.32, h: 1.35 }
      const subFit = computeTextFit(subtitle, subBox, 'body', { maxPt: 16.5, minPt: 13, padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', subBox, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: subFit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(subtitle, { sizePt: subFit.fontPt, color: '#CBD5E1', lang: langAttr, font: theme.fonts.body, lineHeight: 1.44 }),
        ],
      }))
    }
    if (metaText) {
      shapes.push(ooxmlShape(nextId(), 'Cover meta', { x: 0.76, y: 6.46, w: panelW - 1.32, h: 0.42 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(metaText, { sizePt: 10.5, color: '#94A3B8', lang: langAttr, font: theme.fonts.body }),
        ],
      }))
    }
    return shapes.join('')
  }

  if (!POSTER_COVER_VARIANTS.has(coverVariant)) return null
  const shapes = []
  const patXml = renderCoverPatternPptx(slide?.coverPattern, theme, nextId)

  // Poster Cover 1：Apple / Linear Keynote 光晕剧场封面
  if (coverVariant === 'keynote-glow') {
    const darkGlow = theme.dark || relativeLuminance(tk.canvas) < 0.36
    const gradStops = darkGlow
      ? [
          { offset: 0, color: mixHex(tk.canvas, '#020617', 0.45) },
          { offset: 0.55, color: tk.canvas },
          { offset: 1, color: mixHex(tk.canvas, tk.accentPrimary, 0.16) },
        ]
      : [
          { offset: 0, color: tk.canvas },
          { offset: 0.65, color: mixHex(tk.canvas, tk.surface1, 0.55) },
          { offset: 1, color: mixHex(tk.canvas, tk.accentSoft, 0.48) },
        ]
    shapes.push(ooxmlShape(nextId(), 'Keynote Backdrop', { x: 0, y: 0, w: CANVAS_IN.w, h: CANVAS_IN.h }, {
      preset: 'rect',
      gradientStops: gradStops,
      gradientAngle: 135,
    }))
    if (patXml) shapes.push(patXml)
    // 右上主氛围径向光斑 + 左下辅氛围径向光斑（4段柔滑过渡避免 LibreOffice 椭圆边界断层）
    shapes.push(ooxmlShape(nextId(), 'Ambient Glow Primary', { x: 6.7, y: -2.2, w: 8.8, h: 8.8 }, {
      preset: 'ellipse',
      radialGradientStops: [
        { offset: 0, color: tk.accentPrimary, alpha: darkGlow ? 0.28 : 0.15 },
        { offset: 0.42, color: tk.accentPrimary, alpha: darkGlow ? 0.11 : 0.05 },
        { offset: 0.75, color: tk.accentPrimary, alpha: darkGlow ? 0.025 : 0.01 },
        { offset: 1, color: tk.accentPrimary, alpha: 0 },
      ],
    }))
    shapes.push(ooxmlShape(nextId(), 'Ambient Glow Secondary', { x: -2.4, y: 2.5, w: 7.4, h: 7.4 }, {
      preset: 'ellipse',
      radialGradientStops: [
        { offset: 0, color: tk.accentSecondary, alpha: darkGlow ? 0.22 : 0.11 },
        { offset: 0.44, color: tk.accentSecondary, alpha: darkGlow ? 0.08 : 0.04 },
        { offset: 0.76, color: tk.accentSecondary, alpha: darkGlow ? 0.02 : 0.01 },
        { offset: 1, color: tk.accentSecondary, alpha: 0 },
      ],
    }))
    if (kicker !== '') {
      const kw = computeBadgePillWidth(kicker.toUpperCase(), 10.5, 6.2, 1.8)
      shapes.push(ooxmlShape(idBase + 4, 'Kicker Pill', { x: (CANVAS_IN.w - kw) / 2, y: 1.56, w: kw, h: 0.36 }, {
        preset: 'roundRect',
        adj: 50000,
        fill: darkGlow ? tk.accentPrimary : tk.accentSoft,
        fillAlpha: darkGlow ? 0.18 : 0.9,
        stroke: tk.accentPrimary,
        strokeAlpha: darkGlow ? 0.45 : 0.35,
        strokePt: 0.75,
        anchor: 'ctr',
        marginsIn: { l: 0.10, r: 0.10, t: 0.02, b: 0.02 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), {
            sizePt: 10.5,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.body,
            spc: 160,
          }),
        ],
      }))
    }
    const titleBox = { x: 1.15, y: 2.15, w: 11.03, h: 2.15 }
    const titleFit = computeTextFit(title, titleBox, 'coverTitle', { maxPt: 48, minPt: 28, padXPt: 4, padYPt: 4 })
    shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: titleFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(title, {
          sizePt: titleFit.fontPt,
          color: tk.inkPrimary,
          bold: true,
          lang: langAttr,
          align: 'ctr',
          font: theme.fonts.heading,
          lineHeight: titleFit.lineHeight,
        }),
      ],
    }))
    shapes.push(ooxmlShape(nextId(), 'Keynote Divider', { x: (CANVAS_IN.w - 1.35) / 2, y: 4.44, w: 1.35, h: 0.05 }, {
      preset: 'roundRect',
      adj: 50000,
      gradientStops: [
        { offset: 0, color: tk.accentPrimary },
        { offset: 1, color: tk.accentSecondary },
      ],
      gradientAngle: 0,
    }))
    if (subtitle !== '') {
      const subBox = { x: 1.85, y: 4.68, w: 9.63, h: 1.1 }
      const subFit = computeTextFit(subtitle, subBox, 'body', { maxPt: 19, minPt: 14, padXPt: 4, padYPt: 2 })
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', subBox, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: subFit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(subtitle, {
            sizePt: subFit.fontPt,
            color: tk.inkSecondary,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.body,
            lineHeight: 1.45,
          }),
        ],
      }))
    }
    if (metaText) {
      shapes.push(ooxmlShape(nextId(), 'Cover meta', { x: 1.5, y: 6.52, w: 10.33, h: 0.36 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(metaText, {
            sizePt: 11,
            color: tk.inkMuted,
            lang: langAttr,
            align: 'ctr',
            font: theme.fonts.body,
            spc: 80,
          }),
        ],
      }))
    }
    return shapes.join('')
  }

  // Poster Cover 2：瑞士杂志网格封面（Monocle / FT / Nature）
  if (coverVariant === 'editorial-grid') {
    if (patXml) shapes.push(patXml)
    shapes.push(ooxmlShape(nextId(), 'Editorial Top Rule', { x: 0.62, y: 0.42, w: 12.09, h: 0.04 }, {
      preset: 'rect',
      fill: tk.inkPrimary,
    }))
    shapes.push(ooxmlLine(nextId(), 'Editorial Header Rule', { x: 0.62, y: 0.92 }, { x: 12.71, y: 0.92 }, {
      color: tk.hairline,
      widthPt: 0.75,
    }))
    if (kicker !== '') {
      shapes.push(ooxmlShape(idBase + 4, 'Kicker', { x: 0.62, y: 0.52, w: 8.2, h: 0.34 }, {
        txBox: true,
        anchor: 'ctr',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(kicker.toUpperCase(), {
            sizePt: 10.5,
            color: tk.accentText,
            bold: true,
            lang: langAttr,
            font: theme.fonts.body,
            spc: 200,
          }),
        ],
      }))
    }
    const rightTag = manifest.brand?.name || (langAttr === 'en-US' ? 'SPECIAL REPORT' : '专题深度报告')
    shapes.push(ooxmlShape(nextId(), 'Editorial Edition Tag', { x: 9.2, y: 0.52, w: 3.51, h: 0.34 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(rightTag.toUpperCase(), {
          sizePt: 10,
          color: tk.inkMuted,
          bold: true,
          lang: langAttr,
          align: 'r',
          font: theme.fonts.body,
          spc: 160,
        }),
      ],
    }))
    shapes.push(ooxmlLine(nextId(), 'Editorial Grid Spine', { x: 9.75, y: 0.92 }, { x: 9.75, y: 6.12 }, {
      color: tk.hairline,
      widthPt: 0.75,
    }))
    const yearMark = /\b(20\d{2})\b/.exec([kicker, title, subtitle, metaText].join(' '))?.[1] || '01'
    shapes.push(ooxmlShape(nextId(), 'Editorial Watermark', { x: 9.95, y: 1.55, w: 2.75, h: 2.2 }, {
      txBox: true,
      anchor: 't',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(yearMark, {
          sizePt: yearMark.length > 2 ? 64 : 92,
          color: theme.dark ? tk.surface2 : tk.hairline,
          bold: true,
          lang: 'en-US',
          align: 'r',
          font: theme.fonts.heading,
          lineHeight: 0.95,
        }),
      ],
    }))
    shapes.push(ooxmlShape(nextId(), 'Editorial Accent Rule', { x: 0.62, y: 1.48, w: 0.95, h: 0.06 }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
    const titleBox = { x: 0.62, y: 1.72, w: 8.75, h: 2.35 }
    const titleFit = computeTextFit(title, titleBox, 'coverTitle', { maxPt: 46, minPt: 26, padXPt: 2, padYPt: 4 })
    shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: titleFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(title, {
          sizePt: titleFit.fontPt,
          color: tk.inkPrimary,
          bold: true,
          lang: langAttr,
          font: theme.fonts.heading,
          lineHeight: titleFit.lineHeight,
        }),
      ],
    }))
    if (subtitle !== '') {
      const subBox = { x: 0.62, y: 4.25, w: 8.55, h: 1.35 }
      const subFit = computeTextFit(subtitle, subBox, 'body', { maxPt: 19, minPt: 14, padXPt: 2, padYPt: 2 })
      shapes.push(ooxmlShape(idBase + 3, 'Subtitle', subBox, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        fontScale: subFit.fontScale,
        paragraphs: [
          ooxmlRichParagraph(subtitle, {
            sizePt: subFit.fontPt,
            color: tk.inkSecondary,
            lang: langAttr,
            font: theme.fonts.body,
            lineHeight: 1.45,
          }),
        ],
      }))
    }
    shapes.push(ooxmlLine(nextId(), 'Editorial Footer Top', { x: 0.62, y: 6.12 }, { x: 12.71, y: 6.12 }, {
      color: tk.inkPrimary,
      widthPt: 1.0,
    }))
    const colsMeta = [
      { lbl: langAttr === 'en-US' ? 'BRIEFING' : '报告主题', val: slide.text || manifest.brand?.name || kicker || title.slice(0, 18) },
      { lbl: langAttr === 'en-US' ? 'SOURCE / ORG' : '发布机构', val: slide.source || manifest.brand?.footer || (langAttr === 'en-US' ? 'Executive Research' : '战略研究与交付组') },
      { lbl: langAttr === 'en-US' ? 'DECK SCOPE' : '文档规格', val: `${total} ${langAttr === 'en-US' ? 'Slides · 16:9' : '页 · 16:9 精排版'}` },
    ]
    const colW = 12.09 / 3
    colsMeta.forEach((cm, ci) => {
      const cx = 0.62 + ci * colW
      if (ci > 0) {
        shapes.push(ooxmlLine(nextId(), 'Editorial Meta Div ' + ci, { x: cx - 0.14, y: 6.22 }, { x: cx - 0.14, y: 7.06 }, {
          color: tk.hairline,
          widthPt: 0.6,
        }))
      }
      shapes.push(ooxmlShape(nextId(), 'Editorial Meta ' + (ci + 1), { x: cx, y: 6.24, w: colW - 0.24, h: 0.82 }, {
        txBox: true,
        anchor: 't',
        marginsIn: { l: 0, r: 0, t: 0, b: 0 },
        paragraphs: [
          ooxmlRichParagraph(cm.lbl, { sizePt: 9, color: tk.inkMuted, bold: true, lang: langAttr, font: theme.fonts.body, spc: 120, spaceAfterPt: 3 }),
          ooxmlRichParagraph(cm.val, { sizePt: 11.5, color: tk.inkPrimary, bold: true, lang: langAttr, font: theme.fonts.body }),
        ],
      }))
    })
    return shapes.join('')
  }

  // Poster Cover 3 & 4：建筑感非对称封面（architectural / split-bleed —— 麦肯锡/东方极简）
  if (patXml) shapes.push(patXml)
  const isSplitBleed = coverVariant === 'split-bleed'
  const wingW = isSplitBleed ? 5.25 : 4.25
  const wingX = CANVAS_IN.w - wingW
  const wingFillA = tk.coverBg && relativeLuminance(tk.coverBg) < 0.28
    ? tk.coverBg
    : mixHex(tk.accentPrimary, '#081226', 0.42)
  const wingFillB = mixHex(wingFillA, tk.accentSecondary, 0.28)
  shapes.push(ooxmlShape(nextId(), 'Architectural Top Rule', { x: 0, y: 0, w: wingX, h: 0.07 }, {
    preset: 'rect',
    fill: tk.accentPrimary,
  }))
  shapes.push(ooxmlShape(nextId(), 'Architectural Wing', { x: wingX, y: 0, w: wingW, h: CANVAS_IN.h }, {
    preset: 'rect',
    gradientStops: [
      { offset: 0, color: wingFillA },
      { offset: 1, color: wingFillB },
    ],
    gradientAngle: 155,
  }))
  shapes.push(ooxmlShape(nextId(), 'Wing Geo Band 1', { x: wingX + 0.42, y: 0.72, w: wingW - 0.84, h: 0.03 }, {
    preset: 'rect',
    fill: '#FFFFFF',
    fillAlpha: 0.35,
  }))
  const yearWing = /\b(20\d{2})\b/.exec([kicker, title, subtitle, metaText].join(' '))?.[1] || String(total).padStart(2, '0')
  shapes.push(ooxmlShape(nextId(), 'Wing Watermark', { x: wingX + 0.35, y: 1.65, w: wingW - 0.70, h: 2.3 }, {
    txBox: true,
    anchor: 'ctr',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    paragraphs: [
      ooxmlRichParagraph(yearWing, {
        sizePt: yearWing.length > 2 ? 76 : 112,
        color: '#FFFFFF',
        bold: true,
        lang: 'en-US',
        align: 'r',
        font: theme.fonts.heading,
      }),
    ],
  }))
  if (metaText) {
    shapes.push(ooxmlShape(nextId(), 'Wing Geo Block', { x: wingX + 0.42, y: 4.85, w: wingW - 0.84, h: 1.95 }, {
      preset: 'roundRect',
      adj: roundRectAdj(wingW - 0.84, 1.95, 10),
      fill: '#FFFFFF',
      fillAlpha: 0.09,
      stroke: '#FFFFFF',
      strokeAlpha: 0.22,
      strokePt: 0.75,
    }))
    shapes.push(ooxmlShape(nextId(), 'Wing Meta', { x: wingX + 0.62, y: 5.15, w: wingW - 1.24, h: 1.35 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(langAttr === 'en-US' ? 'EXECUTIVE BRIEFING' : '深度决策交付稿', {
          sizePt: 9.5,
          color: '#FDE68A',
          bold: true,
          lang: langAttr,
          font: theme.fonts.body,
          spc: 160,
          spaceAfterPt: 6,
        }),
        ooxmlRichParagraph(metaText, {
          sizePt: 11.5,
          color: '#E2E8F0',
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.4,
        }),
      ],
    }))
  }
  const leftContentW = wingX - 1.45
  if (kicker !== '') {
    shapes.push(ooxmlShape(idBase + 4, 'Kicker', { x: 0.78, y: 1.42, w: leftContentW, h: 0.36 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(kicker.toUpperCase(), {
          sizePt: 11.5,
          color: tk.accentText,
          bold: true,
          lang: langAttr,
          font: theme.fonts.body,
          spc: 180,
        }),
      ],
    }))
  }
  const titleBox = { x: 0.78, y: 1.92, w: leftContentW, h: 2.3 }
  const titleFit = computeTextFit(title, titleBox, 'coverTitle', { maxPt: 42, minPt: 26, padXPt: 2, padYPt: 4 })
  shapes.push(ooxmlShape(idBase + 2, 'Title', titleBox, {
    txBox: true,
    anchor: 'ctr',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    fontScale: titleFit.fontScale,
    paragraphs: [
      ooxmlRichParagraph(title, {
        sizePt: titleFit.fontPt,
        color: tk.inkPrimary,
        bold: true,
        lang: langAttr,
        font: theme.fonts.heading,
        lineHeight: titleFit.lineHeight,
      }),
    ],
  }))
  shapes.push(ooxmlShape(nextId(), 'Architectural Rule', { x: 0.78, y: 4.38, w: 1.15, h: 0.06 }, {
    preset: 'rect',
    fill: tk.accentPrimary,
  }))
  if (subtitle !== '') {
    const subBox = { x: 0.78, y: 4.62, w: leftContentW, h: 1.35 }
    const subFit = computeTextFit(subtitle, subBox, 'body', { maxPt: 18.5, minPt: 13.5, padXPt: 2, padYPt: 2 })
    shapes.push(ooxmlShape(idBase + 3, 'Subtitle', subBox, {
      txBox: true,
      anchor: 't',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      fontScale: subFit.fontScale,
      paragraphs: [
        ooxmlRichParagraph(subtitle, {
          sizePt: subFit.fontPt,
          color: tk.inkSecondary,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.44,
        }),
      ],
    }))
  }
  return shapes.join('')
}

export function renderPosterCoverHtml(slide, ctx) {
  const { coverVariant, title, subtitle, kicker, meta, total, langId, manifest, theme } = ctx
  const rawAsset = slide?.image?.assetId && manifest?.assets?.[slide.image.assetId]
  const photoData = rawAsset
    ? (String(rawAsset.data || '').startsWith('data:') ? rawAsset.data : `data:${rawAsset.mime};base64,${rawAsset.data}`)
    : (typeof slide?.image?.src === 'string' && slide.image.src.startsWith('data:image/') ? slide.image.src : '')

  if (photoData) {
    const tk = theme?.tokens
    const darkBase = tk?.coverBg && relativeLuminance(tk.coverBg) < 0.25
      ? tk.coverBg
      : mixHex(tk?.accentPrimary || '#0057B8', '#070B14', 0.62)
    const darkEnd = mixHex(darkBase, tk?.accentSecondary || '#0E7490', 0.22)
    return (
      '<div class="cover-shell is-photo-split">' +
      `<div class="photo-cover-left" style="background:linear-gradient(145deg,${darkBase},${darkEnd})">` +
      (kicker !== '' ? '<div class="kicker">' + escapeHtml(kicker) + '</div>' : '') +
      '<h1>' + renderInlineHtml(title) + '</h1>' +
      '<div class="arch-rule"></div>' +
      (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
      (meta !== '' ? '<div class="meta">' + escapeHtml(meta) + '</div>' : '') +
      '</div>' +
      `<div class="photo-cover-right"><img src="${photoData}" alt="${escapeHtml(slide.image?.alt || title)}"/></div>` +
      '</div>'
    )
  }

  if (!POSTER_COVER_VARIANTS.has(coverVariant)) return null
  const patClass = COVER_PATTERNS.has(String(slide?.coverPattern || '').toLowerCase())
    ? ' cover-pat-' + String(slide.coverPattern).toLowerCase()
    : ''
  const patSvg = renderCoverPatternSvgHtml(slide?.coverPattern, theme)

  if (coverVariant === 'keynote-glow') {
    return (
      '<div class="cover-shell is-keynote-glow' + patClass + '">' +
      patSvg +
      '<div class="cover-glow-orb orb-a" aria-hidden="true"></div>' +
      '<div class="cover-glow-orb orb-b" aria-hidden="true"></div>' +
      '<div class="cover-center-stack">' +
      (kicker !== '' ? '<div class="kicker cover-pill-kicker">' + escapeHtml(kicker) + '</div>' : '') +
      '<h1>' + renderInlineHtml(title) + '</h1>' +
      '<div class="cover-glow-rule" aria-hidden="true"></div>' +
      (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
      '</div>' +
      (meta !== '' ? '<div class="meta">' + escapeHtml(meta) + '</div>' : '') +
      '</div>'
    )
  }

  if (coverVariant === 'editorial-grid') {
    const yearMark = /\b(20\d{2})\b/.exec([kicker, title, subtitle, meta].join(' '))?.[1] || '01'
    const rightTag = manifest.brand?.name || (langId === 'en' ? 'SPECIAL REPORT' : '专题深度报告')
    return (
      '<div class="cover-shell is-editorial-grid' + patClass + '">' +
      patSvg +
      '<div class="ed-top-bar"><span class="kicker">' + escapeHtml(kicker) + '</span><span class="ed-edition">' + escapeHtml(rightTag) + '</span></div>' +
      '<div class="ed-main-grid">' +
      '<div class="ed-copy"><div class="ed-accent-bar"></div><h1>' + renderInlineHtml(title) + '</h1>' +
      (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
      '</div>' +
      '<div class="ed-watermark" aria-hidden="true">' + escapeHtml(yearMark) + '</div>' +
      '</div>' +
      '<div class="ed-meta-strip">' +
      '<div><span>' + (langId === 'en' ? 'BRIEFING' : '报告主题') + '</span><strong>' + escapeHtml(slide.text || manifest.brand?.name || kicker || title.slice(0, 18)) + '</strong></div>' +
      '<div><span>' + (langId === 'en' ? 'SOURCE / ORG' : '发布机构') + '</span><strong>' + escapeHtml(slide.source || manifest.brand?.footer || (langId === 'en' ? 'Executive Research' : '战略研究与交付组')) + '</strong></div>' +
      '<div><span>' + (langId === 'en' ? 'DECK SCOPE' : '文档规格') + '</span><strong>' + total + (langId === 'en' ? ' Slides · 16:9' : ' 页 · 16:9 精排版') + '</strong></div>' +
      '</div>' +
      '</div>'
    )
  }

  const yearWing = /\b(20\d{2})\b/.exec([kicker, title, subtitle, meta].join(' '))?.[1] || String(total).padStart(2, '0')
  const tk = theme?.tokens
  const wingStyle = tk
    ? (() => {
        const a = tk.coverBg && relativeLuminance(tk.coverBg) < 0.28
          ? tk.coverBg
          : mixHex(tk.accentPrimary, '#081226', 0.42)
        const b = mixHex(a, tk.accentSecondary, 0.28)
        return ` style="background:linear-gradient(155deg,${a},${b})"`
      })()
    : ''
  return (
    '<div class="cover-shell is-architectural' + (coverVariant === 'split-bleed' ? ' is-split-bleed' : '') + patClass + '">' +
    patSvg +
    '<div class="arch-left">' +
    (kicker !== '' ? '<div class="kicker">' + escapeHtml(kicker) + '</div>' : '') +
    '<h1>' + renderInlineHtml(title) + '</h1>' +
    '<div class="arch-rule"></div>' +
    (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
    '</div>' +
    '<aside class="arch-wing"' + wingStyle + '>' +
    '<div class="arch-wing-num" aria-hidden="true">' + escapeHtml(yearWing) + '</div>' +
    (meta !== '' ? '<div class="arch-wing-card"><span>' + (langId === 'en' ? 'EXECUTIVE BRIEFING' : '深度决策交付稿') + '</span><p>' + escapeHtml(meta) + '</p></div>' : '') +
    '</aside>' +
    '</div>'
  )
}

export function resolveSectionAgendaChapters(slide, index, manifest) {
  if (Array.isArray(slide.items) && slide.items.length >= 2) {
    return slide.items.slice(0, 6).map((it, ci) => ({
      num: it.tag || String(ci + 1).padStart(2, '0'),
      title: it.title || it.text || `Chapter ${ci + 1}`,
      active: it.status === 'accent' || slide.activeIndex === ci + 1 || (ci === 0 && !slide.activeIndex && !slide.items.some((x) => x.status === 'accent')),
    }))
  }
  const allSections = Array.isArray(manifest.slides)
    ? manifest.slides
        .map((s, si) => ({ slide: s, slideIndex: si }))
        .filter((entry) => entry.slide?.layout === 'section')
    : []
  if (allSections.length >= 2) {
    return allSections.slice(0, 6).map((entry, ci) => ({
      num: /^\d+$/.test((entry.slide.kicker || '').trim())
        ? entry.slide.kicker.trim().padStart(2, '0')
        : String(ci + 1).padStart(2, '0'),
      title: entry.slide.title || `Section ${ci + 1}`,
      active: entry.slideIndex === index || entry.slide === slide,
    }))
  }
  return []
}

export function renderSectionAgendaPptx(slide, ctx) {
  const { index, total, title, subtitle, kicker, theme, langAttr, manifest, chromeCfg, idBase, nextId, yieldChrome = false } = ctx
  const agendaChapters = resolveSectionAgendaChapters(slide, index, manifest)
  if (agendaChapters.length < 2) return null

  const tk = theme.tokens
  const shapes = []
  const activeChapter = agendaChapters.find((c) => c.active) || agendaChapters[0]
  const chapNum = activeChapter.num

  if (!yieldChrome) {
    shapes.push(ooxmlShape(nextId(), 'Section side band', { x: 0, y: 0, w: 0.14, h: CANVAS_IN.h }, {
      preset: 'rect',
      fill: tk.accentPrimary,
    }))
  }
  shapes.push(ooxmlShape(nextId(), 'Section Watermark', { x: 0.68, y: 1.05, w: 3.4, h: 1.65 }, {
    txBox: true,
    anchor: 'b',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    paragraphs: [
      ooxmlRichParagraph(chapNum, {
        sizePt: 88,
        color: theme.dark ? tk.surface2 : tk.hairline,
        bold: true,
        lang: 'en-US',
        font: theme.fonts.heading,
        lineHeight: 0.9,
      }),
    ],
  }))
  const kickerClean = kicker.trim()
  const secKickerText = (!kickerClean || /^\d+$/.test(kickerClean))
    ? (langAttr === 'en-US' ? `SECTION ${chapNum}` : `第 ${chapNum} 部分`)
    : kickerClean
  shapes.push(ooxmlShape(idBase + 1, 'Kicker', { x: 0.72, y: 2.74, w: 5.8, h: 0.34 }, {
    txBox: true,
    anchor: 'ctr',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    paragraphs: [
      ooxmlRichParagraph(secKickerText.toUpperCase(), {
        sizePt: 11,
        color: tk.accentText,
        bold: true,
        lang: langAttr,
        font: theme.fonts.body,
        spc: 180,
      }),
    ],
  }))
  shapes.push(ooxmlShape(nextId(), 'Accent bar', { x: 0.72, y: 3.16, w: 1.1, h: 0.06 }, {
    preset: 'rect',
    fill: tk.accentPrimary,
  }))
  const tBox = { x: 0.72, y: 3.36, w: 6.14, h: 1.75 }
  const tFit = computeTextFit(title, tBox, 'sectionTitle', { maxPt: 31, minPt: 22 })
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
    shapes.push(ooxmlShape(idBase + 3, 'Subtitle', { x: 0.72, y: 5.22, w: 5.85, h: 1.1 }, {
      txBox: true,
      anchor: 't',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(subtitle, {
          sizePt: 15.5,
          color: tk.inkSecondary,
          lang: langAttr,
          font: theme.fonts.body,
          lineHeight: 1.42,
        }),
      ],
    }))
  }
  shapes.push(ooxmlLine(nextId(), 'Section Agenda Spine', { x: 7.04, y: 1.15 }, { x: 7.04, y: 6.35 }, {
    color: tk.hairline,
    widthPt: 0.75,
  }))
  shapes.push(ooxmlShape(nextId(), 'Agenda Tracker Heading', { x: 7.45, y: 1.15, w: 5.2, h: 0.34 }, {
    txBox: true,
    anchor: 'ctr',
    marginsIn: { l: 0, r: 0, t: 0, b: 0 },
    paragraphs: [
      ooxmlRichParagraph(langAttr === 'en-US' ? 'AGENDA · PRESENTATION ROADMAP' : '汇报议程 · 章节进度', {
        sizePt: 10,
        color: tk.inkMuted,
        bold: true,
        lang: langAttr,
        font: theme.fonts.body,
        spc: 160,
      }),
    ],
  }))
  const listTop = 1.66
  const rowGap = 0.16
  const rowH = Math.min(0.76, (4.65 - rowGap * (agendaChapters.length - 1)) / agendaChapters.length)
  agendaChapters.forEach((ch, ci) => {
    const ry = listTop + ci * (rowH + rowGap)
    if (ch.active) {
      shapes.push(ooxmlShape(nextId(), 'Agenda Active Row', { x: 7.42, y: ry, w: 5.25, h: rowH }, {
        preset: 'roundRect',
        adj: roundRectAdj(5.25, rowH, Math.max(6, chromeCfg.cardRadiusPx)),
        fill: tk.accentSoft,
        stroke: tk.accentPrimary,
        strokePt: 1.0,
      }))
      shapes.push(ooxmlShape(nextId(), 'Agenda Active Rail', { x: 7.42, y: ry, w: 0.06, h: rowH }, {
        preset: 'rect',
        fill: tk.accentPrimary,
      }))
    } else {
      shapes.push(ooxmlLine(nextId(), 'Agenda Row Hairline ' + ci, { x: 7.45, y: ry + rowH }, { x: 12.65, y: ry + rowH }, {
        color: tk.hairline,
        widthPt: 0.5,
      }))
    }
    shapes.push(ooxmlShape(nextId(), 'Agenda Num ' + (ci + 1), { x: 7.62, y: ry + (rowH - 0.34) / 2, w: 0.58, h: 0.34 }, {
      preset: 'roundRect',
      adj: roundRectAdj(0.58, 0.34, 6),
      fill: ch.active ? tk.accentPrimary : '',
      anchor: 'ctr',
      marginsIn: { l: 0.02, r: 0.02, t: 0.01, b: 0.01 },
      paragraphs: [
        ooxmlRichParagraph(ch.num, {
          sizePt: 12.5,
          color: ch.active ? tk.inkOnAccent : tk.inkMuted,
          bold: true,
          lang: 'en-US',
          align: 'ctr',
          font: theme.fonts.heading,
        }),
      ],
    }))
    shapes.push(ooxmlShape(nextId(), 'Agenda Title ' + (ci + 1), { x: 8.34, y: ry + 0.04, w: 4.22, h: rowH - 0.08 }, {
      txBox: true,
      anchor: 'ctr',
      marginsIn: { l: 0, r: 0, t: 0, b: 0 },
      paragraphs: [
        ooxmlRichParagraph(ch.title, {
          sizePt: ch.active ? 15.5 : 14,
          color: ch.active ? tk.inkPrimary : tk.inkMuted,
          bold: ch.active,
          lang: langAttr,
          font: ch.active ? theme.fonts.heading : theme.fonts.body,
        }),
      ],
    }))
  })
  shapes.push(renderSlideChromePptx(slide, index, total, theme, langAttr, manifest, nextId))
  return shapes.join('')
}

export function renderSectionAgendaHtml(slide, ctx) {
  const { index, title, subtitle, kicker, langId, manifest } = ctx
  const agendaChapters = resolveSectionAgendaChapters(slide, index, manifest)
  if (agendaChapters.length < 2) return null
  const activeChap = agendaChapters.find((c) => c.active) || agendaChapters[0]
  const kickerClean = kicker.trim()
  const secKickerHtml = (!kickerClean || /^\d+$/.test(kickerClean))
    ? (langId === 'en' ? `SECTION ${activeChap.num}` : `第 ${activeChap.num} 部分`)
    : kickerClean
  return (
    '<div class="section-agenda-shell">' +
    '<div class="section-agenda-left">' +
    '<div class="section-watermark" aria-hidden="true">' + escapeHtml(activeChap.num) + '</div>' +
    '<div class="kicker">' + escapeHtml(secKickerHtml) + '</div>' +
    '<div class="accent-line"></div>' +
    '<h2>' + renderInlineHtml(title) + '</h2>' +
    (subtitle !== '' ? '<div class="subtitle">' + renderInlineHtml(subtitle) + '</div>' : '') +
    '</div>' +
    '<div class="section-agenda-right">' +
    '<div class="section-agenda-head">' + (langId === 'en' ? 'AGENDA · ROADMAP' : '汇报议程 · 章节进度') + '</div>' +
    '<ol class="section-agenda-list">' +
    agendaChapters.map((ch) =>
      '<li class="' + (ch.active ? 'is-active' : '') + '"><span class="chap-num">' + escapeHtml(ch.num) + '</span><span class="chap-title">' + renderInlineHtml(ch.title) + '</span></li>',
    ).join('') +
    '</ol></div></div>'
  )
}

export const AESTHETIC_STUDIO_CSS = `
/* Phase 6 Aesthetic Studio: Poster Covers, Agenda Sections, Spotlight KPIs, Glass/Frameless Materiality & Vector Icons */
.cover-shell.is-keynote-glow{position:relative;overflow:hidden;align-items:center;text-align:center;padding:clamp(36px,5vw,72px);border-radius:calc(var(--radius) * 1.4);background:linear-gradient(135deg,color-mix(in srgb,var(--bg) 88%,#020617),var(--bg) 58%,color-mix(in srgb,var(--bg) 84%,var(--accent)))}
.cover-glow-orb{position:absolute;border-radius:50%;filter:blur(56px);pointer-events:none;opacity:.28}
.cover-glow-orb.orb-a{width:440px;height:440px;top:-140px;right:-90px;background:radial-gradient(circle,var(--accent),transparent 70%)}
.cover-glow-orb.orb-b{width:380px;height:380px;bottom:-140px;left:-80px;background:radial-gradient(circle,var(--accent2),transparent 70%)}
.cover-center-stack{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:18px;max-width:min(100%,1080px)}
.cover-pill-kicker{display:inline-flex;padding:5px 16px;border-radius:999px;background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 42%,transparent)}
.cover-glow-rule{width:96px;height:4px;border-radius:999px;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.cover-shell.is-editorial-grid{display:grid;grid-template-rows:auto 1fr auto;gap:22px;height:100%;padding:8px 0}
.ed-top-bar{display:flex;justify-content:space-between;align-items:center;border-top:3px solid var(--fg);border-bottom:1px solid var(--hairline);padding:10px 0}
.ed-edition{font-size:12px;font-weight:700;letter-spacing:.14em;color:var(--muted)}
.ed-main-grid{display:grid;grid-template-columns:1fr 220px;gap:28px;align-items:center}
.ed-accent-bar{width:68px;height:4px;background:var(--accent);margin-bottom:18px}
.ed-watermark{border-left:1px solid var(--hairline);padding-left:24px;text-align:right;font-family:var(--font-heading);font-size:clamp(54px,7vw,108px);font-weight:800;line-height:.95;color:var(--hairline)}
.ed-meta-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;border-top:1.5px solid var(--fg);padding-top:14px}
.ed-meta-strip > div{display:flex;flex-direction:column;gap:4px;padding-left:14px;border-left:1px solid var(--hairline)}
.ed-meta-strip > div:first-child{border-left:0;padding-left:0}
.ed-meta-strip span{font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--muted)}
.ed-meta-strip strong{font-size:14px;color:var(--fg)}
.cover-shell.is-architectural{display:grid;grid-template-columns:1.55fr 1fr;gap:0;height:100%;border-radius:calc(var(--radius) * 1.2);overflow:hidden;border:1px solid var(--hairline)}
.cover-shell.is-architectural.is-split-bleed{grid-template-columns:1.25fr 1fr}
.arch-left{padding:clamp(32px,4.2vw,60px);display:flex;flex-direction:column;justify-content:center;gap:16px;background:var(--bg);border-top:5px solid var(--accent)}
.arch-rule{width:76px;height:4px;background:var(--accent)}
.arch-wing{background:linear-gradient(155deg,var(--cover-bg),color-mix(in srgb,var(--cover-bg) 68%,var(--accent2)));color:#F8FAFC;padding:clamp(26px,3.2vw,44px);display:flex;flex-direction:column;justify-content:space-between}
.arch-wing-num{text-align:right;font-family:var(--font-heading);font-size:clamp(60px,7vw,108px);font-weight:800;line-height:.92;opacity:.92}
.arch-wing-card{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);border-radius:10px;padding:16px 18px}
.arch-wing-card span{display:block;font-size:11px;font-weight:700;letter-spacing:.14em;color:#FDE68A;margin-bottom:6px}
.arch-wing-card p{margin:0;font-size:13px;line-height:1.45;color:#E2E8F0}
.section-agenda-shell{display:grid;grid-template-columns:1.15fr 1fr;gap:clamp(24px,3.5vw,48px);align-items:center;height:100%}
.section-agenda-left{display:flex;flex-direction:column;gap:12px}
.section-watermark{font-family:var(--font-heading);font-size:clamp(64px,7.5vw,112px);font-weight:800;line-height:.9;color:var(--hairline)}
.section-agenda-right{border-left:1px solid var(--hairline);padding-left:clamp(20px,3vw,40px)}
.section-agenda-head{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--muted);margin-bottom:14px}
.section-agenda-list{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.section-agenda-list li{display:flex;align-items:center;gap:14px;padding:10px 14px;border-radius:8px;border-bottom:1px solid var(--hairline);color:var(--muted)}
.section-agenda-list li.is-active{background:var(--accent-soft);border:1px solid var(--accent);border-left:4px solid var(--accent);color:var(--fg);font-weight:700}
.section-agenda-list .chap-num{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:26px;border-radius:6px;font-family:var(--font-heading);font-size:13px;font-weight:800}
.section-agenda-list li.is-active .chap-num{background:var(--accent);color:var(--ink-on-accent)}
.surface-card.mat-frameless{background:transparent !important;border:0 !important;border-top:1px solid var(--hairline) !important;border-bottom:1px solid var(--hairline) !important;border-radius:0 !important;padding:16px 4px !important;box-shadow:none !important}
.surface-card.mat-frameless.is-focal,.surface-card.mat-frameless.is-hero{border-top:2.5px solid var(--accent) !important}
.surface-card.mat-editorial-rule{background:transparent !important;border:0 !important;border-top:3px double var(--fg) !important;border-bottom:1px solid var(--hairline) !important;border-radius:0 !important;padding:16px 4px !important;box-shadow:none !important}
.surface-card.mat-editorial-rule.is-focal,.surface-card.mat-editorial-rule.is-hero{border-top-color:var(--accent) !important}
.surface-card.mat-glass{background:color-mix(in srgb,var(--surface1) 72%,transparent) !important;backdrop-filter:blur(12px);border:1px solid color-mix(in srgb,var(--fg) 14%,transparent) !important;box-shadow:inset 0 1px 0 color-mix(in srgb,#FFFFFF 22%,transparent),0 14px 36px rgba(0,0,0,.14) !important}
.surface-card.mat-glass.is-focal,.surface-card.mat-glass.is-hero{border-color:color-mix(in srgb,var(--accent) 62%,transparent) !important}
.kpi-spotlight{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(22px,2.8vw,40px);align-items:stretch;width:100%}
.kpi-hero .kpi-value.is-hero-val{font-size:clamp(44px,5.6vw,82px)}
.kpi-head-row,.card-icon-row{display:flex;align-items:center;gap:10px}
.card-icon-tag{font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent-text)}
.kpi-sat-stack{display:flex;flex-direction:column;justify-content:space-between}
.kpi-sat-row{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding:14px 2px;border-top:1px solid var(--hairline)}
.kpi-sat-row:first-child{border-top:2px solid var(--accent)}
.kpi-sat-row:last-child{border-bottom:1px solid var(--hairline)}
.kpi-sat-metric{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.kpi-sat-val{font-family:var(--font-heading);font-size:clamp(24px,2.6vw,38px);font-weight:800;color:var(--fg);font-variant-numeric:tabular-nums}
.kpi-sat-delta{font-size:12.5px;font-weight:700}
.kpi-sat-delta.tone-positive{color:var(--positive)}
.kpi-sat-delta.tone-negative{color:var(--negative)}
.kpi-sat-delta.tone-warning{color:var(--warning)}
.kpi-sat-delta.tone-accent{color:var(--accent-text)}
.bento-hero-grid{display:grid;grid-template-columns:5fr 6.5fr;gap:clamp(14px,1.8vw,24px);align-items:stretch}
.bento-hero-grid.bento-hero-2 > :first-child{grid-row:1}
.bento-hero-grid.bento-hero-3 > :first-child{grid-row:1 / span 2}
.bento-hero-grid.bento-hero-4 > :first-child{grid-row:1 / span 3}
.surface-card.is-inverted-hero{background:linear-gradient(140deg,color-mix(in srgb,var(--accent) 82%,#0F172A),color-mix(in srgb,var(--accent) 55%,#0B1120)) !important;border:0 !important;color:#F8FAFC !important}
.surface-card.is-inverted-hero .card-title{color:#F8FAFC}
.surface-card.is-inverted-hero .card-body,.surface-card.is-inverted-hero .card-bullets{color:#E2E8F0}
.surface-card.is-inverted-hero .card-stat{color:#FDE68A}
.surface-card.is-inverted-hero .card-icon-tag{color:#CBD5E1}
.surface-card.is-inverted-hero .deck-icon-badge{color:#FFFFFF;border-color:rgba(255,255,255,.45)}
.deck-icon-badge{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;color:var(--accent);flex:0 0 auto}
.deck-icon-badge--soft{background:var(--accent-soft)}
.deck-icon-badge--ring{border:1.25px solid var(--accent);background:transparent}
.deck-icon-badge--solid{background:var(--accent);color:var(--ink-on-accent)}
.deck-icon-badge--bare{width:auto;height:auto;padding:2px;background:transparent}
.cover-shell.is-photo-split{display:grid;grid-template-columns:1fr 1fr;height:100%;border-radius:calc(var(--radius) * 1.2);overflow:hidden}
.photo-cover-left{padding:clamp(32px,4.2vw,58px);display:flex;flex-direction:column;justify-content:center;gap:16px;color:#F8FAFC;border-top:5px solid var(--accent)}
.photo-cover-left .kicker{color:#FDE68A}.photo-cover-left h1{color:#F8FAFC}.photo-cover-left .subtitle{color:#CBD5E1}.photo-cover-left .meta{color:#94A3B8;margin-top:auto;border-top:1px solid rgba(255,255,255,.15);padding-top:12px}
.photo-cover-right{position:relative;overflow:hidden;background:#0F172A}
.photo-cover-right img{width:100%;height:100%;object-fit:cover;display:block}
.cover-pat-grid{background-image:linear-gradient(to right,color-mix(in srgb,var(--hairline) 42%,transparent) 1px,transparent 1px),linear-gradient(to bottom,color-mix(in srgb,var(--hairline) 42%,transparent) 1px,transparent 1px);background-size:48px 48px}
.cover-pat-dots{background-image:radial-gradient(color-mix(in srgb,var(--accent) 26%,transparent) 1.5px,transparent 1.5px);background-size:24px 24px}
.cover-pat-rings{background-image:radial-gradient(circle at 80% 50%,transparent 18%,color-mix(in srgb,var(--accent) 16%,transparent) 18.4%,transparent 18.8%,transparent 30%,color-mix(in srgb,var(--accent) 12%,transparent) 30.4%,transparent 30.8%,transparent 42%,color-mix(in srgb,var(--accent) 9%,transparent) 42.4%,transparent 42.8%)}
.cover-shell.is-editorial-grid,.cover-shell.is-architectural,.cover-shell.is-keynote-glow,.cover-shell.is-inverted{position:relative}
.cover-pat-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
.cover-shell.is-editorial-grid > :not(.cover-pat-svg),.cover-shell.is-architectural > :not(.cover-pat-svg),.cover-shell.is-keynote-glow > :not(.cover-pat-svg):not(.cover-glow-orb),.cover-shell.is-inverted > :not(.cover-pat-svg){position:relative;z-index:1}
`

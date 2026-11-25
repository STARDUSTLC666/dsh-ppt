import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync, inflateRawSync } from 'node:zlib'

import {
  bestContrastInk,
  contrastRatio,
  pptxFontName,
  resolveTheme,
} from '../skills/dsh-ppt/scripts/deck-themes.mjs'
import {
  cleanRichText,
  stripInlineMarkdown,
  normalizeSlideItems,
} from '../skills/dsh-ppt/scripts/deck-chrome.mjs'
import {
  parseMarkdownDeck,
  renderHtml,
  buildPptx,
  resolveLanguage,
} from '../skills/dsh-ppt/scripts/deck-core.mjs'
import { buildDeckAsync } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import {
  computeWaterfallGeometry,
  renderChartSvg,
} from '../skills/dsh-ppt/scripts/deck-media.mjs'
import {
  renderMermaidHtml,
  compileMermaidSlide,
} from '../skills/dsh-ppt/scripts/deck-mermaid.mjs'
import { DIAGRAMS_CSS } from '../skills/dsh-ppt/scripts/deck-diagrams.mjs'
import { computeGaugeModel } from '../skills/dsh-ppt/scripts/deck-charts-exec.mjs'

// Minimal zero-dependency ZIP entry reader for inspecting generated PPTX XML
function unzipEntries(buf) {
  const out = new Map()
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65558); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  assert.ok(eocd >= 0, 'Valid ZIP EOCD not found')
  const cdCount = buf.readUInt16LE(eocd + 10)
  let pos = buf.readUInt32LE(eocd + 16)
  for (let i = 0; i < cdCount; i++) {
    assert.equal(buf.readUInt32LE(pos), 0x02014b50)
    const compMethod = buf.readUInt16LE(pos + 10)
    const compSize = buf.readUInt32LE(pos + 20)
    const nameLen = buf.readUInt16LE(pos + 28)
    const extraLen = buf.readUInt16LE(pos + 30)
    const commentLen = buf.readUInt16LE(pos + 32)
    const localOff = buf.readUInt32LE(pos + 42)
    const name = buf.subarray(pos + 46, pos + 46 + nameLen).toString('utf8')
    pos += 46 + nameLen + extraLen + commentLen
    const lNameLen = buf.readUInt16LE(localOff + 26)
    const lExtraLen = buf.readUInt16LE(localOff + 28)
    const dataStart = localOff + 30 + lNameLen + lExtraLen
    const raw = buf.subarray(dataStart, dataStart + compSize)
    out.set(name, compMethod === 8 ? inflateRawSync(raw) : raw)
  }
  return out
}

function parseSpBoxes(slideXml) {
  const shapes = []
  const re = /<p:sp\b[^>]*>[\s\S]*?<p:cNvPr\s+id="(\d+)"\s+name="([^"]*)"[\s\S]*?<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"\s*\/>\s*<a:ext\s+cx="(\d+)"\s+cy="(\d+)"\s*\/>[\s\S]*?<\/p:sp>/g
  for (const m of slideXml.matchAll(re)) {
    const texts = [...m[0].matchAll(/<a:t>([^<]*)<\/a:t>/g)]
      .map((t) => t[1].replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'))
      .join('')
    const solidFill = /<p:spPr>[\s\S]*?<a:solidFill><a:srgbClr\s+val="([0-9A-Fa-f]{6})"/.exec(m[0])?.[1] || ''
    const runColor = /<a:rPr[^>]*>[\s\S]*?<a:solidFill><a:srgbClr\s+val="([0-9A-Fa-f]{6})"/.exec(m[0])?.[1] || ''
    shapes.push({
      id: m[1],
      name: m[2],
      x: Number(m[3]) / 914400,
      y: Number(m[4]) / 914400,
      w: Number(m[5]) / 914400,
      h: Number(m[6]) / 914400,
      text: texts,
      fill: solidFill ? '#' + solidFill.toUpperCase() : '',
      fg: runColor ? '#' + runColor.toUpperCase() : '',
    })
  }
  return shapes
}

function makeTinyPng() {
  const crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    crcTable[n] = c >>> 0
  }
  const crc32 = (b) => {
    let c = 0xffffffff
    for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
    const t = Buffer.from(type, 'ascii')
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
    return Buffer.concat([len, t, data, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(4, 0); ihdr.writeUInt32BE(4, 4); ihdr[8] = 8; ihdr[9] = 2
  const raw = Buffer.alloc(4 * (1 + 4 * 3), 120)
  for (let y = 0; y < 4; y++) raw[y * 13] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

test('P0-1 & #128-8: 2D-math bullets preserve suffixText in PPTX and emit split-shape click timing; regular bullets emit pRg + build="p"', () => {
  const theme = resolveTheme('aurora-stage')
  const lang = resolveLanguage('en')
  const manifest = {
    title: 'Math & Timing Test',
    theme: 'aurora-stage',
    language: 'en',
    motion: true,
    slides: [
      {
        layout: 'bullets',
        title: 'Standard Click Bullets',
        bullets: ['First point', 'Second point', 'Third point'],
      },
      {
        layout: 'bullets',
        title: '2D Math Bullets',
        bullets: [
          'Prefix trie executes in $O(L \\log K)$ time',
          'Expected batch cost $\\frac{1}{N}\\sum_{i=1}^{N} L_i(\\theta)$ stays below 18ms across all 64 tensor shards',
          'Threshold $\\rho = \\frac{\\lambda_{\\text{req}}}{\\mu_{\\text{gpu}}} < 0.82$ prevents queue divergence',
        ],
      },
    ],
  }
  const pptxBuf = buildPptx(manifest, theme, lang)
  const zip = unzipEntries(pptxBuf)

  const slide1Xml = zip.get('ppt/slides/slide1.xml').toString('utf8')
  assert.match(slide1Xml, /<p:bldP spid="13" grpId="0"\/>/)
  assert.match(slide1Xml, /<p:txEl><p:pRg st="0" end="0"\/><\/p:txEl>/)
  assert.match(slide1Xml, /<p:txEl><p:pRg st="2" end="2"\/><\/p:txEl>/)

  const slide2Xml = zip.get('ppt/slides/slide2.xml').toString('utf8')
  assert.match(slide2Xml, /Expected batch cost/)
  assert.match(slide2Xml, /stays below 18ms across all 64 tensor shards/)
  assert.match(slide2Xml, /prevents queue divergence/)
  assert.match(slide2Xml, /<m:oMath/)
  assert.match(slide2Xml, /<p:timing>[\s\S]*<p:bldLst>/)
})

test('#128-8, #125-5, #125-6, #128-10: angle brackets preserved, 年 unit extracted, bare Markdown closing unmasked, PingFang SC mapped on win32', () => {
  assert.equal(cleanRichText('Use Map<K,V> and <angles> with <b>bold</b>'), 'Use Map<K,V> and <angles> with bold')
  assert.equal(stripInlineMarkdown('Promise<Array<T>> and <script>x</script>'), 'Promise<Array<T>> and x')

  const kpis = normalizeSlideItems(['10 年：核心团队行业深耕', '交付周期稳定在 3 年以上'], 'kpi')
  assert.equal(kpis[0].value, '10 年')
  assert.equal(kpis[1].value, '3 年')

  const mdDeck = parseMarkdownDeck('年度复盘', '# 年度复盘\n\n## 进度\n- 一期顺利上线', 'zh')
  const closing = mdDeck.slides.at(-1)
  assert.equal(closing.layout, 'closing')
  assert.equal(closing.subtitle, undefined)

  assert.equal(pptxFontName('PingFang SC', 'win32'), 'Microsoft YaHei')
  assert.equal(pptxFontName('PingFang SC', 'darwin'), 'PingFang SC')
})

test('P0-3: waterfall auto-detects final running sum total bar even with domain labels like "2026 EBITDA"', () => {
  const chart = {
    kind: 'waterfall',
    unit: '亿元',
    categories: ['2025 EBITDA', '规模放量', '产品提价', 'AI 降本', '渠道补贴', '研发投入', '2026 EBITDA'],
    series: [{ name: 'EBITDA', values: [8.2, 4.1, 1.5, 2.3, -2.8, -1.7, 11.6] }],
  }
  const geom = computeWaterfallGeometry(chart)
  const last = geom.bars.at(-1)
  assert.equal(last.isTotal, true)
  assert.equal(last.start, 0)
  assert.equal(last.end, 11.6)
  assert.equal(last.label, '11.6')

  const svg = renderChartSvg(chart, resolveTheme('consulting'))
  assert.doesNotMatch(svg, /\+11\.6/)
  assert.match(svg, />11\.6</)
})

test('P0-3: China map gives YRD/GBA cities distinct coordinates and places non-overlapping badges in both PPTX and HTML SVG', () => {
  const theme = resolveTheme('exec-jilan')
  const lang = resolveLanguage('zh')
  const manifest = {
    title: '算力枢纽',
    theme: 'exec-jilan',
    language: 'zh',
    motion: false,
    slides: [
      {
        layout: 'map',
        variant: 'china',
        title: '长三角与粤港澳枢纽分布',
        items: [
          { title: '上海', value: '68 EFLOPS', status: 'accent' },
          { title: '杭州', value: '45 EFLOPS' },
          { title: '南京', value: '31 EFLOPS' },
          { title: '武汉', value: '28 EFLOPS' },
          { title: '深圳', value: '54 EFLOPS' },
          { title: '香港', value: '22 EFLOPS' },
          { title: '北京', value: '74 EFLOPS', status: 'accent' },
        ],
      },
    ],
  }
  const pptxBuf = buildPptx(manifest, theme, lang)
  const zip = unzipEntries(pptxBuf)
  const shapes = parseSpBoxes(zip.get('ppt/slides/slide1.xml').toString('utf8'))
  const tags = shapes.filter((s) => s.name.startsWith('Map Tag '))
  assert.equal(tags.length, 7)
  for (let i = 0; i < tags.length; i++) {
    for (let j = i + 1; j < tags.length; j++) {
      const a = tags[i], b = tags[j]
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
      assert.ok(ox <= 0.02 || oy <= 0.02, `PPTX Map tags overlap: ${a.text} vs ${b.text} (${ox.toFixed(2)}x${oy.toFixed(2)})`)
    }
  }

  const html = renderHtml(manifest, theme, lang)
  const svgRects = [...html.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="1\d\.\d"/g)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) }))
  assert.equal(svgRects.length, 7)
  for (let i = 0; i < svgRects.length; i++) {
    for (let j = i + 1; j < svgRects.length; j++) {
      const a = svgRects[i], b = svgRects[j]
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
      assert.ok(ox <= 1 || oy <= 1, `HTML Map pills overlap: #${i} vs #${j}`)
    }
  }
})

test('P1-1: WCAG contrast across dark-theme comparison, chevron, gantt, treemap, isometric & Mermaid custom fill', () => {
  assert.equal(bestContrastInk('#FFD60A'), '#0F172A')
  assert.equal(bestContrastInk('#CA9006'), '#0F172A')
  assert.equal(bestContrastInk('#94A3B8'), '#0F172A')
  assert.equal(bestContrastInk('#34D399'), '#0F172A')
  assert.equal(bestContrastInk('#0057B8'), '#FFFFFF')

  const aurora = resolveTheme('aurora-stage')
  const langEn = resolveLanguage('en')
  const manifest = {
    title: 'Dark Contrast',
    theme: 'aurora-stage',
    language: 'en',
    motion: false,
    slides: [
      {
        layout: 'comparison',
        variant: 'do-dont',
        title: 'Guardrails',
        items: [
          { title: 'DO · Bounded Hashing', bullets: ['Pin prompts'] },
          { title: "DON'T · Round Robin", bullets: ['Spray prompts'] },
        ],
      },
      {
        layout: 'comparison',
        variant: 'versus',
        title: 'Benchmark',
        items: [
          { title: 'Legacy v2', bullets: ['184ms'] },
          { title: 'NovaCloud v4', bullets: ['38ms'] },
        ],
      },
    ],
  }
  const pptxBuf = buildPptx(manifest, aurora, langEn)
  const zip = unzipEntries(pptxBuf)
  const s1 = parseSpBoxes(zip.get('ppt/slides/slide1.xml').toString('utf8'))
  const h1 = s1.find((s) => s.name === 'Comparison Header 1')
  const h2 = s1.find((s) => s.name === 'Comparison Header 2')
  assert.match(h1.text, /^✓\s+DO/)
  assert.match(h2.text, /^✗\s+DON'T/)
  assert.ok(contrastRatio(h1.fill, h1.fg) >= 4.5, `Header 1 contrast ${contrastRatio(h1.fill, h1.fg)}`)
  assert.ok(contrastRatio(h2.fill, h2.fg) >= 4.5, `Header 2 contrast ${contrastRatio(h2.fill, h2.fg)}`)

  const s2 = parseSpBoxes(zip.get('ppt/slides/slide2.xml').toString('utf8'))
  const v2 = s2.find((s) => s.name === 'Comparison Header 2')
  assert.ok(contrastRatio(v2.fill, v2.fg) >= 4.5, `Versus header 2 contrast ${contrastRatio(v2.fill, v2.fg)}`)

  const mermaidHtml = renderMermaidHtml({
    layout: 'mermaid',
    mermaid: 'flowchart LR\n  A{{Gateway}} --> B[/Stream/]\n  style B fill:#FEF08A,stroke:#CA8A04',
  })
  assert.match(mermaidHtml, /<polygon class="mm-node mm-shape-hexagon/)
  assert.match(mermaidHtml, /<polygon class="mm-node mm-shape-parallelogram/)
  assert.match(mermaidHtml, /style="fill:#0F172A"/)

  assert.match(DIAGRAMS_CSS, /\.chevron-arrow\.is-last\{background:var\(--accent2\);color:var\(--ink-on-accent2,#FFF\)\}/)
  assert.match(DIAGRAMS_CSS, /\.process-grid\.is-timeline::before/)
  assert.match(DIAGRAMS_CSS, /\.process-grid\.is-steps \.process-step:not\(:last-child\)::after/)
})

test('P0-2, P1-2, P1-3, P1-4, P2-1, #128-9: footer/source/Beamer/gallery parity, nice ticks, legend spacing, Treemap clip, Radar/Sequence PPTX non-overlap, EN gauge', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-vis-opt-'))
  try {
    const img1 = join(dir, 'a.png')
    const img2 = join(dir, 'b.png')
    writeFileSync(img1, makeTinyPng())
    writeFileSync(img2, makeTinyPng())

    const built = await buildDeckAsync({
      title: 'Parity & Layout Verification',
      theme: 'swiss',
      lang: 'en',
      motion: 'off',
      brand: { name: 'Lab', footer: 'Lab Technical Report', chromeStyle: 'academic-minimal' },
      outputDir: dir,
      fileName: 'verify',
      overwrite: true,
      smartLayout: false,
      autoUpgrade: false,
      selfRepair: false,
      slides: [
        { layout: 'cover', variant: 'architectural', coverPattern: 'waves', title: 'Cover Without Meta', subtitle: 'Testing empty Wing Geo Block' },
        {
          layout: 'matrix',
          title: 'Priority Matrix',
          xLabel: 'Feasibility →',
          yLabel: 'Value ↑',
          items: [
            { title: 'Q2', bullets: ['Long-horizon R&D'] },
            { title: 'Q1', bullets: ['Immediate win'] },
            { title: 'Q3', bullets: ['Watchlist'] },
            { title: 'Q4', bullets: ['Optimize'] },
          ],
        },
        {
          layout: 'table',
          tableStyle: 'banded',
          title: 'Metrics Table',
          rows: [
            ['Track', 'Score (%)', 'Latency (s)'],
            ['Baseline', '41.5%', '4.2'],
            ['Swarm', '85.3%', '41.8'],
          ],
        },
        {
          layout: 'radar',
          title: 'Capability Radar',
          rows: [
            ['Dim', 'Agent-X v4', 'AlphaCode Pro', 'Baseline LLM'],
            ['Planning', '92', '81', '54'],
            ['Code Edit', '94', '88', '68'],
            ['Debugging', '89', '76', '49'],
            ['Recovery', '91', '72', '38'],
            ['Verify', '87', '79', '45'],
            ['Cost', '85', '64', '78'],
          ],
        },
        {
          layout: 'treemap',
          title: 'Token Spend',
          items: [
            { title: 'Tool Output', value: 44 },
            { title: 'File Reads', value: 22 },
            { title: 'Reasoning', value: 14 },
            { title: 'System & Skills', value: 8 },
            { title: 'Diff Gen', value: 5 },
            { title: 'Test Execution Logs', value: 3 },
            { title: 'Retry Overhead', value: 2 },
            { title: 'Metadata', value: 1.2 },
            { title: 'Misc', value: 0.8 },
          ],
        },
        {
          layout: 'gauge',
          title: 'EN OKR Gauge',
          items: [
            { title: 'Pass@1', value: 86, target: 80, max: 100, unit: '%' },
            { title: 'Zero-Regression', value: 96, target: 100, max: 100, unit: '%' },
          ],
        },
        {
          layout: 'chart',
          title: 'Nice Ticks & Legend',
          chart: {
            kind: 'column',
            unit: 'Pass@1 (%)',
            categories: ['SWE', 'Term', 'Ref', 'SQL'],
            series: [
              { name: 'Single-Turn Baseline', values: [42, 35, 38, 51] },
              { name: 'Autonomous ReAct Agent', values: [68, 61, 64, 74] },
              { name: 'Swarm + Verifier Architecture', values: [86, 79, 84, 92] },
            ],
          },
          source: 'Eval Harness v3',
        },
        {
          layout: 'image',
          variant: 'gallery',
          title: 'Two-Image Gallery',
          images: [
            { src: img1, alt: 'First', caption: 'Gallery Cap A' },
            { src: img2, alt: 'Second', caption: 'Gallery Cap B' },
          ],
        },
        {
          layout: 'image',
          variant: 'full-bleed',
          title: 'Full Bleed Hero',
          subtitle: 'Subtitle preserved over dark scrim',
          image: { src: img1, alt: 'Hero' },
          source: 'Aerial Archive',
        },
        {
          layout: 'mermaid',
          title: 'Sequence Frame Clearance',
          mermaid: `sequenceDiagram
  autonumber
  actor Client
  participant API as Edge Router
  participant GPU as Tensor Worker
  Client->>API: POST /v1/completions
  alt Warm Hit
    API->>GPU: Route to affinity shard
    Note right of GPU: Reuses 84% blocks
    GPU-->>Client: Stream 28ms
  else Cold Miss
    API->>GPU: Dispatch prefill
    GPU-->>Client: Stream 74ms
  end`,
        },
      ],
    })

    const html = readFileSync(built.files.html, 'utf8')
    const zip = unzipEntries(readFileSync(built.files.pptx))

    // Cover: waves SVG present in architectural HTML; Wing Geo Block omitted when cover has no meta/footer
    assert.match(html, /cover-shell is-architectural cover-pat-waves/)
    assert.match(html, /class="cover-pat-svg"/)
    const emptyCoverPptx = unzipEntries(buildPptx({
      title: 'Empty Meta Cover',
      theme: 'swiss',
      language: 'en',
      motion: false,
      slides: [{ layout: 'cover', variant: 'architectural', title: 'No Meta' }],
    }, resolveTheme('swiss'), resolveLanguage('en')))
    assert.doesNotMatch(emptyCoverPptx.get('ppt/slides/slide1.xml').toString('utf8'), /name="Wing Geo Block"/)

    // Matrix HTML: bullets + axes + labels present
    assert.match(html, /Long-horizon R&amp;D/)
    assert.match(html, /matrix-cross-h/)
    assert.match(html, /Feasibility →/)

    // Table HTML: numeric column headers aligned right + banded CSS present
    assert.match(html, /<th class="num">Score \(%\)<\/th>/)
    assert.match(html, /\[data-table-style="banded"\]/)

    // Radar PPTX: Legend label bottom strictly above Axis 1 top
    const s4Shapes = parseSpBoxes(zip.get('ppt/slides/slide4.xml').toString('utf8'))
    const leg2 = s4Shapes.find((s) => s.name === 'Radar Legend Label 2')
    const ax1 = s4Shapes.find((s) => s.name === 'Radar Axis 1')
    assert.ok(leg2 && ax1)
    assert.ok(ax1.y >= leg2.y + leg2.h - 0.01, `Radar axis (${ax1.y}) overlaps legend bottom (${leg2.y + leg2.h})`)

    // Treemap HTML: clipPath emitted
    assert.match(html, /<clipPath id="tm-/)

    // EN Gauge: zero Chinese characters in HTML or PPTX
    const s6Xml = zip.get('ppt/slides/slide6.xml').toString('utf8')
    assert.doesNotMatch(s6Xml, /目标|达标/)
    assert.match(s6Xml, /Target 80%/)
    assert.match(s6Xml, /108% of goal/)
    assert.equal(computeGaugeModel({ items: [{ title: 'OKR', value: 86, target: 80 }] }, true)[0].delta, '108% of goal')

    // Chart SVG: round nice ticks (no 26.22 / 104.88), Beamer media exclusion + min-height
    assert.doesNotMatch(html, />26\.22</)
    assert.doesNotMatch(html, />104\.88</)
    assert.match(html, /not\(\.slide--chart\)/)
    assert.match(html, /\.media-beamer-band\{[^}]*min-height:17%;height:auto/)
    assert.match(html, /\.chart-data\{[^}]*top:0;left:0/)

    // Gallery: Gallery Cap A appears once (not duplicated as single-image Caption)
    const s8Xml = zip.get('ppt/slides/slide8.xml').toString('utf8')
    assert.equal((s8Xml.match(/Gallery Cap A/g) || []).length, 1)
    assert.doesNotMatch(s8Xml, /name="Caption"/)

    // Full-bleed: subtitle rendered in both HTML and PPTX
    assert.match(html, /media-subtitle--bleed">Subtitle preserved over dark scrim/)
    const s9Xml = zip.get('ppt/slides/slide9.xml').toString('utf8')
    assert.match(s9Xml, /Subtitle preserved over dark scrim/)

    // Mermaid sequence PPTX: ALT / else condition boxes clear first branch message labels
    const s10Shapes = parseSpBoxes(zip.get('ppt/slides/slide10.xml').toString('utf8'))
    const altCond = s10Shapes.find((s) => s.name === 'Sequence Frame Cond ALT')
    const elseCond = s10Shapes.find((s) => s.name === 'Sequence Frame Else 1')
    const msg2 = s10Shapes.find((s) => s.text.includes('Route to affinity shard'))
    const msg4 = s10Shapes.find((s) => s.text.includes('Dispatch prefill'))
    assert.ok(altCond && elseCond && msg2 && msg4)
    assert.ok(altCond.y + altCond.h <= msg2.y + 0.03, `ALT cond bottom (${(altCond.y + altCond.h).toFixed(2)}) overlaps msg (${msg2.y.toFixed(2)})`)
    assert.ok(elseCond.y + elseCond.h <= msg4.y + 0.03, `Else cond bottom (${(elseCond.y + elseCond.h).toFixed(2)}) overlaps msg (${msg4.y.toFixed(2)})`)

    // No standalone duplicate .brand-footer on Beamer slides
    assert.doesNotMatch(html, /<div class="brand-footer">Lab Technical Report<\/div>/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

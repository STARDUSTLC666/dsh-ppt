import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import zlib from 'node:zlib'
import { unzipSync } from 'fflate'

import { buildDeck, buildDeckAsync } from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import {
  tokenizeCodeLine,
  computeMockupGeometry,
} from '../skills/dsh-ppt/scripts/deck-showcase.mjs'
import {
  computeQuadrantModel,
  computeRadarModel,
  computeDumbbellModel,
  computeHeatmapModel,
} from '../skills/dsh-ppt/scripts/deck-charts-pro.mjs'
import { CORE_LAYOUTS, LAYOUT_ALIASES } from '../skills/dsh-ppt/scripts/deck-layouts.mjs'
import { PptWorkbench, PPT_DOWNLOAD_ROUTE } from '../lib/workbench.js'
import { buildPptTools } from '../lib/tools.js'

function makePngBytes(w = 64, h = 64, rgb = [32, 96, 180]) {
  const raw = Buffer.alloc(h * (1 + w * 3))
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0
    for (let x = 0; x < w; x++) {
      const p = y * (1 + w * 3) + 1 + x * 3
      raw[p] = rgb[0]; raw[p + 1] = rgb[1]; raw[p + 2] = rgb[2]
    }
  }
  const crcTable = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    crcTable[i] = c >>> 0
  }
  const crc32 = (buf) => {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii')
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
    return Buffer.concat([len, t, data, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function readPptxSlides(pptxPath) {
  const zip = unzipSync(readFileSync(pptxPath))
  const out = {}
  for (const [k, v] of Object.entries(zip)) {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(k)) {
      out[k] = Buffer.from(v).toString('utf8')
    }
  }
  return out
}

test('v0.28: all 6 new layouts & aliases registered in CORE_LAYOUTS', () => {
  for (const id of ['mockup', 'code', 'quadrant', 'radar', 'dumbbell', 'heatmap']) {
    assert.ok(CORE_LAYOUTS.has(id), `CORE_LAYOUTS missing ${id}`)
  }
  assert.equal(LAYOUT_ALIASES.device.layout, 'mockup')
  assert.equal(LAYOUT_ALIASES.browser.layout, 'mockup')
  assert.equal(LAYOUT_ALIASES.snippet.layout, 'code')
  assert.equal(LAYOUT_ALIASES['magic-quadrant'].layout, 'quadrant')
  assert.equal(LAYOUT_ALIASES.spider.layout, 'radar')
  assert.equal(LAYOUT_ALIASES.slope.layout, 'dumbbell')
  assert.equal(LAYOUT_ALIASES['heat-matrix'].layout, 'heatmap')
})

test('v0.28: zero-dep code tokenizer highlights TS/Python/SQL/Bash/JSON/Rust & Markdown fenced code promotes to code layout', () => {
  const tsToks = tokenizeCodeLine('export const count = 42 // answer', 'typescript')
  assert.ok(tsToks.some((t) => t.kind === 'keyword' && t.value === 'export'))
  assert.ok(tsToks.some((t) => t.kind === 'number' && t.value === '42'))
  assert.ok(tsToks.some((t) => t.kind === 'comment' && t.value.includes('answer')))

  const pyToks = tokenizeCodeLine('def score(x): return "ok" # py', 'python')
  assert.ok(pyToks.some((t) => t.kind === 'keyword' && t.value === 'def'))
  assert.ok(pyToks.some((t) => t.kind === 'string' && t.value === '"ok"'))
  assert.ok(pyToks.some((t) => t.kind === 'comment'))

  const sqlToks = tokenizeCodeLine("SELECT count(*) FROM decks WHERE status = 'ok'", 'sql')
  assert.ok(sqlToks.some((t) => t.kind === 'keyword' && t.value === 'SELECT'))
  assert.ok(sqlToks.some((t) => t.kind === 'string' && t.value === "'ok'"))

  const dir = mkdtempSync(join(tmpdir(), 'dsh-v28-md-'))
  try {
    const md = '# Title\n\n## API Example\n\n```python\ndef hello(name):\n  return f"hi {name}"\n```\n\n- Zero dependencies\n\n## Flow\n\n```mermaid\nflowchart LR\n  A --> B\n```'
    const built = buildDeck({ title: 'Title', content: md, outputDir: dir, cwd: dir })
    const manifest = JSON.parse(readFileSync(built.jsonPath, 'utf8'))
    const codeSlide = manifest.slides.find((s) => s.title === 'API Example')
    const mermaidSlide = manifest.slides.find((s) => s.title === 'Flow')
    assert.equal(codeSlide?.layout, 'code')
    assert.equal(codeSlide?.language, 'python')
    assert.match(codeSlide?.code || '', /def hello/)
    assert.equal(mermaidSlide?.layout, 'mermaid')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.28: mockup (browser/mobile/screenshot), code, coverPattern & Hero Photo Split build valid HTML + OOXML without double data-URI prefix', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v28-showcase-'))
  try {
    const imgPath = join(dir, 'sample.png')
    writeFileSync(imgPath, makePngBytes(120, 120, [20, 80, 160]))
    const res = await buildDeckAsync({
      title: 'v0.28 Showcase Verification',
      theme: 'stripe-craft',
      outputDir: dir,
      cwd: dir,
      slides: [
        { layout: 'cover', variant: 'keynote-glow', coverPattern: 'grid', title: 'Grid Pattern Cover', subtitle: 'Micro blueprint grid' },
        { layout: 'cover', title: 'Hero Photo Split Cover', subtitle: 'Full-bleed right photo', image: { src: imgPath, alt: 'Hero photo', fit: 'cover' } },
        { layout: 'mockup', variant: 'browser', title: 'Browser Mockup with Screenshot', url: 'https://app.example.com', image: { src: imgPath, alt: 'App screenshot' } },
        { layout: 'mockup', variant: 'mobile', title: 'Mobile App Companion', items: [{ tag: '01', value: '99%', title: 'Uptime', text: 'Global edge' }] },
        { layout: 'code', variant: 'split', title: 'Code Window', language: 'rust', filename: 'src/main.rs', code: 'fn main() {\n  println!("ok");\n}', items: [{ tag: '01', title: 'Fast', text: 'Zero overhead' }] },
      ],
    })

    const html = readFileSync(res.htmlPath, 'utf8')
    assert.ok(html.includes('is-photo-split'), 'cover photo split class missing')
    assert.ok(html.includes('cover-pat-grid'), 'cover pattern grid class missing')
    assert.ok(html.includes('mockup-browser'), 'browser mockup missing in HTML')
    assert.ok(html.includes('mockup-phone'), 'mobile mockup missing in HTML')
    assert.ok(html.includes('code-window'), 'code window missing in HTML')
    assert.ok(!html.includes('data:image/png;base64,data:image/'), 'must never double-prefix data URI')

    const xmlMap = readPptxSlides(res.pptxPath)
    assert.equal(Object.keys(xmlMap).length, 5)
    assert.ok(xmlMap['ppt/slides/slide1.xml'].includes('Cover Pattern'), 'coverPattern XML missing')
    assert.ok(xmlMap['ppt/slides/slide2.xml'].includes('<p:pic>'), 'cover hero photo pic missing')
    assert.ok(xmlMap['ppt/slides/slide3.xml'].includes('<p:pic>'), 'mockup screenshot pic missing')
    assert.ok(xmlMap['ppt/slides/slide5.xml'].includes('typeface="Consolas"'), 'code Consolas runs missing')

    const geom = computeMockupGeometry({ layout: 'mockup', variant: 'browser', image: { src: imgPath } }, 1.8, 4.8)
    assert.equal(geom.kind, 'browser')
    assert.ok(geom.screenBox.w > 8 && geom.screenBox.h > 3)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.28: 4 Pinnacle Analyst Charts (quadrant, radar, dumbbell, heatmap) emit clean OOXML (no double <a:path>, vert270 Y-axis, nice ticks, WCAG contrast)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-v28-charts-'))
  try {
    const dbModel = computeDumbbellModel({
      items: [
        { title: 'Pass Rate', before: 54, after: 96, unit: '%' },
        { title: 'Rework', before: 44, after: 6, unit: '%' },
      ],
    }, true)
    assert.deepEqual(dbModel.ticks, [0, 25, 50, 75, 100])

    const hmDiv = computeHeatmapModel({ rows: [['M', 'A', 'B'], ['R1', -20, 40], ['R2', -5, 15]] }, true)
    assert.equal(hmDiv.diverging, true)

    const qm = computeQuadrantModel({
      quadrants: ['Challengers', 'Leaders', 'Niche', 'Visionaries'],
      items: [{ title: 'Ours', x: 85, y: 90, size: 30, status: 'positive' }],
    }, true)
    assert.deepEqual(qm.quadrants, ['Challengers', 'Leaders', 'Niche', 'Visionaries'])

    const rm = computeRadarModel({
      chart: {
        categories: ['Speed', 'Quality', 'Cost', 'Scale'],
        series: [{ name: 'Ours', values: [95, 92, 88, 90] }],
      },
    }, true)
    assert.equal(rm.axes.length, 4)
    assert.equal(rm.series[0].values[0], 95)

    const built = buildDeck({
      title: 'Pinnacle Charts Test',
      theme: 'stripe-craft',
      outputDir: dir,
      cwd: dir,
      slides: [
        {
          layout: 'quadrant',
          title: 'Magic Quadrant',
          xLabel: 'Vision →',
          yLabel: 'Execution →',
          quadrants: ['Challengers', 'Leaders', 'Niche', 'Visionaries'],
          items: [
            { title: 'Ours', x: 86, y: 88, size: 36, status: 'positive' },
            { title: 'Comp A', x: 35, y: 40, size: 20, status: 'neutral' },
          ],
        },
        {
          layout: 'radar',
          title: 'Capability Radar',
          rows: [
            ['Axis', 'Ours', 'Avg'],
            ['Editability', 98, 62],
            ['Polish', 95, 68],
            ['Charts', 94, 54],
            ['Speed', 91, 70],
            ['Governance', 89, 60],
          ],
        },
        {
          layout: 'dumbbell',
          title: 'Before vs After',
          items: [
            { title: 'QA Pass Rate', before: 54, after: 96, unit: '%', status: 'positive' },
            { title: 'Rework Rate', before: 44, after: 6, unit: '%', status: 'positive' },
          ],
        },
        {
          layout: 'heatmap',
          title: 'Regional Heatmap',
          rows: [
            ['Region', 'Q1', 'Q2', 'Q3'],
            ['APAC', 98, 84, 72],
            ['EMEA', 43, 62, 88],
          ],
        },
      ],
    })

    const html = readFileSync(built.htmlPath, 'utf8')
    assert.ok(html.includes('quadrant-svg'))
    assert.ok(html.includes('radar-svg'))
    assert.ok(html.includes('dumbbell-svg'))
    assert.ok(html.includes('hm-grid'))

    const xmlMap = readPptxSlides(built.pptxPath)
    // Quadrant vertical Y-axis
    assert.ok(xmlMap['ppt/slides/slide1.xml'].includes('vert="vert270"'), 'quadrant Y-axis must use vert270')
    // Radar must NEVER have double-nested <a:path><a:path>
    const radarXml = xmlMap['ppt/slides/slide2.xml']
    assert.ok(radarXml.includes('<a:custGeom>'), 'radar custGeom missing')
    assert.ok(!radarXml.includes('<a:path w="10000" h="10000"><a:path'), 'radar must not double-nest <a:path>')
    assert.ok(radarXml.includes('<a:close/>'), 'radar closed polygon path missing')
    // Dumbbell clean ticks
    assert.ok(xmlMap['ppt/slides/slide3.xml'].includes('>25<') && xmlMap['ppt/slides/slide3.xml'].includes('>75<'))
    // Heatmap WCAG white text on dark cell + dark text on light cell
    const hmXml = xmlMap['ppt/slides/slide4.xml']
    assert.ok(hmXml.includes('FFFFFF') && hmXml.includes('0F172A'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.28: Workbench starterSlide append, patch validation, PDF/PNG-ZIP exports & client direct-manipulation markers', async () => {
  const work = resolve('.test-output')
  mkdirSync(work, { recursive: true })
  const dir = mkdtempSync(join(work, 'v28-wb-'))
  try {
    const created = await buildDeckAsync({
      title: 'Workbench v0.28 Studio',
      theme: 'stripe-craft',
      outputDir: dir,
      cwd: dir,
      slides: [
        { layout: 'cover', title: 'Cover Slide', subtitle: 'Initial' },
        { layout: 'bullets', title: 'Slide 2', bullets: ['Point A'] },
      ],
    })
    const wb = new PptWorkbench({ catalogPath: join(dir, 'catalog.jsonl') })
    await wb.remember(created, {})
    const list = await wb.action({ operation: 'list' })
    const id = list.projects[0].id
    let rev = list.projects[0].revision

    // Append all 6 new layouts via starterSlide
    for (const arch of ['mockup', 'code', 'quadrant', 'radar', 'dumbbell', 'heatmap']) {
      const appended = await wb.action({ operation: 'append', id, expectedRevision: rev, archetype: arch })
      assert.equal(appended.ok, true)
      assert.equal(appended.project.slides.at(-1).layout, arch)
      rev = appended.project.revision
    }

    // Patch coverPattern & code fields
    const opened = await wb.action({ operation: 'open', id })
    const coverId = opened.project.slides[0].id
    const codeSlideId = opened.project.slides.find((s) => s.layout === 'code').id
    const patchedCover = await wb.action({
      operation: 'edit',
      id,
      expectedRevision: rev,
      slide: coverId,
      patch: { coverPattern: 'rings', title: 'Inline Edited Cover' },
    })
    assert.equal(patchedCover.project.slides[0].coverPattern, 'rings')
    assert.equal(patchedCover.project.slides[0].title, 'Inline Edited Cover')
    rev = patchedCover.project.revision

    const patchedCode = await wb.action({
      operation: 'edit',
      id,
      expectedRevision: rev,
      slide: codeSlideId,
      patch: { language: 'go', filename: 'main.go', code: 'package main\nfunc main() {}' },
    })
    const updatedCodeSlide = patchedCode.project.slides.find((s) => s.id === codeSlideId)
    assert.equal(updatedCodeSlide.language, 'go')
    assert.equal(updatedCodeSlide.filename, 'main.go')
    rev = patchedCode.project.revision

    // Reject stale revision on pdf & png-zip download
    const stalePdf = await wb.fetchDownload(new Request(`http://dsh.internal${PPT_DOWNLOAD_ROUTE}?id=${id}&kind=pdf&revision=0`))
    assert.equal(stalePdf.status, 409)

    // Test real PDF & PNG-ZIP export (passes whether LibreOfficeKit renders real bytes OR returns clean 503 unavailable)
    const pdfRes = await wb.fetchDownload(new Request(`http://dsh.internal${PPT_DOWNLOAD_ROUTE}?id=${id}&kind=pdf&revision=${rev}`))
    if (pdfRes.status === 200) {
      assert.match(pdfRes.headers.get('content-type') || '', /application\/pdf/)
      const pdfBytes = Buffer.from(await pdfRes.arrayBuffer())
      assert.equal(pdfBytes.subarray(0, 5).toString('ascii'), '%PDF-')
    } else {
      assert.equal(pdfRes.status, 503)
    }

    const pngZipRes = await wb.fetchDownload(new Request(`http://dsh.internal${PPT_DOWNLOAD_ROUTE}?id=${id}&kind=png-zip&revision=${rev}`))
    if (pngZipRes.status === 200) {
      assert.match(pngZipRes.headers.get('content-type') || '', /application\/zip/)
      const zipEntries = unzipSync(new Uint8Array(await pngZipRes.arrayBuffer()))
      const pngKeys = Object.keys(zipEntries).filter((k) => k.endsWith('.png'))
      assert.ok(pngKeys.length >= 8, `expected >= 8 rendered PNGs in zip, got ${pngKeys.length}`)
    } else {
      assert.equal(pngZipRes.status, 503)
    }

    // Verify client bundle contains v0.28 direct-manipulation & export markers
    const clientJs = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
    for (const marker of ['dsh-ppt-inline-edit', 'dblclick', 'onReorderSlide', 'draggable', "download('pdf')", "download('png-zip')", 'coverPattern', "'quadrant'", "'radar'", "'dumbbell'", "'heatmap'", "'mockup'", "'code'"]) {
      assert.ok(clientJs.includes(marker), `lib/client.js missing v0.28 marker: ${marker}`)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.28: all 13 registered Agent tools emit 0 JSON Schema wire type arrays', () => {
  const tools = buildPptTools({ outputDir: '', maxSlides: 60, defaultTheme: '', defaultLang: '' })
  assert.equal(tools.length, 13)

  const badPaths = []
  function walk(node, pathStr) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node.type)) badPaths.push(pathStr)
    for (const [k, v] of Object.entries(node)) {
      if (v && typeof v === 'object') walk(v, `${pathStr}.${k}`)
    }
  }
  for (const tool of tools) {
    walk(tool.parameters, tool.name)
  }
  assert.deepEqual(badPaths, [], `Wire type arrays found: ${badPaths.join(', ')}`)
})

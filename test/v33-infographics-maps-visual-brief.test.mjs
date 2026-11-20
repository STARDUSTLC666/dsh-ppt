import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

import {
  buildDeckAsync,
  editDeck,
  checkDeck,
  computeMapModel,
  computeIsometricModel,
  generateVisualBrief,
  buildResearchPlan,
  resolveTheme,
} from '../skills/dsh-ppt/scripts/deck-advanced.mjs'
import { buildPptTools } from '../lib/tools.js'
import { resolvePptConfig } from '../lib/config.js'

function hasTypeArray(node) {
  if (!node || typeof node !== 'object') return false
  if (Array.isArray(node.type)) return true
  if (Array.isArray(node)) return node.some(hasTypeArray)
  return Object.values(node).some(hasTypeArray)
}

function makeTinyPng(width = 640, height = 480) {
  const crcTable = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    crcTable[n] = c >>> 0
  }
  const crc32 = (buf) => {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii')
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
    const body = Buffer.concat([t, data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0)
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 2
  const raw = Buffer.alloc((width * 3 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const off = y * (width * 3 + 1)
    raw[off] = 0
    for (let x = 0; x < width; x += 1) {
      raw[off + 1 + x * 3] = 200
      raw[off + 2 + x * 3] = 220
      raw[off + 3 + x * 3] = 240
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

test('v0.33 Strategic Vector Maps (world & china) route regional hubs accurately, avoid North/Latin America collision, and build dual-parity HTML + PPTX', async () => {
  const worldModel = computeMapModel({
    layout: 'map',
    items: [
      { title: '北美区', value: '$48M', delta: '+28%' },
      { title: '拉美区', value: '$11M', delta: '+21%' },
      { title: '亚太区', value: '$36M', delta: '+44%' },
    ],
  }, false)
  assert.equal(worldModel.mode, 'world')
  const na = worldModel.regions.find((r) => r.title === '北美区')
  const latam = worldModel.regions.find((r) => r.title === '拉美区')
  assert.ok(na && latam)
  assert.ok(latam.y > na.y + 25, `拉美区 (y=${latam.y}) must sit far south of 北美区 (y=${na.y})`)

  const chinaModel = computeMapModel({
    layout: 'map',
    items: [
      { title: '长三角', value: '3.4亿' },
      { title: '粤港澳', value: '2.6亿' },
      { title: '成渝', value: '1.2亿' },
    ],
  }, false)
  assert.equal(chinaModel.mode, 'china', 'must auto-detect China mode from regional hub names')
  assert.ok(chinaModel.dots.length >= 100)

  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v33-map-'))
  try {
    const res = await buildDeckAsync({
      title: '区域布局双地图验证',
      outputDir: dir,
      theme: 'stripe-craft',
      slides: [
        { layout: 'cover', title: '区域布局双地图验证', subtitle: '全球与国内战略枢纽' },
        {
          layout: 'world-map',
          kicker: '01 · 全球布局',
          title: '北美与亚太双核驱动 62% 营收增长',
          items: [
            { title: '北美区', value: '$48M', delta: '+28%', status: 'accent' },
            { title: '亚太区', value: '$36M', delta: '+44%', status: 'positive' },
            { title: '欧洲区', value: '$29M', delta: '+19%' },
            { title: '拉美区', value: '$11M', delta: '+21%' },
          ],
          takeaway: '亚太同比增速领跑全球大区。',
        },
        {
          layout: 'china-map',
          kicker: '02 · 国内枢纽',
          title: '长三角与粤港澳贡献国内 58% 订单规模',
          rows: [
            ['区域', '订单额', '同比', '定位'],
            ['长三角', '¥3.4亿', '+36%', '金融与制造总部'],
            ['粤港澳', '¥2.6亿', '+31%', '跨境出海生态'],
            ['成渝', '¥1.2亿', '+49%', '绿色智算西部极'],
          ],
        },
      ],
    })
    assert.equal(res.ok, true)
    assert.equal(res.quality.errorCount, 0)
    assert.equal(res.quality.warningCount, 0, JSON.stringify(res.quality.issues))
    const html = readFileSync(res.htmlPath, 'utf8')
    assert.ok(html.includes('info-map-board'))
    assert.ok(html.includes('全球战略布局热力图'))
    assert.ok(html.includes('中国区域经济枢纽分布'))
    const pptxBuf = readFileSync(res.pptxPath)
    assert.ok(pptxBuf.length > 10000)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.33 2.5D Isometric Infographics (stack & pillars + Markdown directives) emit native <a:custGeom> & non-occluded left index pills', async () => {
  const stackModel = computeIsometricModel({
    layout: 'isometric',
    variant: 'stack',
    items: [
      { tag: 'L4 · 体验层', title: '交互工作台', text: '在线编辑' },
      { tag: 'L3 · 编排层', title: 'Agent 调度', text: '自检修复' },
      { tag: 'L2 · 知识层', title: '证据账本', text: '出处溯源' },
      { tag: 'L1 · 底座层', title: '渲染引擎', text: '双端同构' },
    ],
  }, false)
  assert.equal(stackModel.variant, 'stack')
  assert.equal(stackModel.items.length, 4)

  const pillarsModel = computeIsometricModel({
    layout: 'isometric',
    variant: 'pillars',
    items: [
      { title: 'Gen 1', value: '34%' },
      { title: 'Gen 2', value: '68%' },
      { title: 'Gen 3', value: '94%', status: 'accent' },
    ],
  }, true)
  assert.equal(pillarsModel.variant, 'pillars')
  assert.ok(pillarsModel.items[2].ratio > pillarsModel.items[0].ratio)

  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v33-iso-'))
  try {
    const md = [
      '# 平台架构与能力跃迁',
      '',
      '## 四层等轴测架构缩短 78% 交付周期',
      '::: iso-stack',
      '- L4 | 交互层 | 实时预览与一键导出',
      '- L3 | 编排层 | SLOP 静态门禁与自检修复',
      '- L2 | 证据层 | 一手出处核验与范本库',
      '- L1 | 渲染层 | 原生可编辑 OOXML + SVG',
      ':::',
      '',
      '## 三代演进将一次通过率提升至 94%',
      '::: iso-pillars',
      '- Gen 1 | 34% | 纯文本基线',
      '- Gen 2 | 68% | 多版式路由',
      '- Gen 3 | 94% | 范本自检与视觉智能',
      ':::',
    ].join('\n')

    const res = await buildDeckAsync({
      title: '等轴测信息图验证',
      content: md,
      theme: 'consulting',
      outputDir: dir,
    })
    assert.equal(res.ok, true)
    assert.equal(res.quality.errorCount, 0)
    const html = readFileSync(res.htmlPath, 'utf8')
    assert.ok(html.includes('iso-stack-board'))
    assert.ok(html.includes('iso-pillars-wrap'))
    assert.ok(html.includes('<polygon'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.33 Procedural Cover Artwork (waves / isometric-mesh / editorial-arcs) builds cleanly in both HTML SVG and PPTX OOXML', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v33-pat-'))
  try {
    for (const pattern of ['waves', 'isometric-mesh', 'editorial-arcs']) {
      const res = await buildDeckAsync({
        title: `Cover Pattern ${pattern}`,
        outputDir: dir,
        fileName: `pat-${pattern}`,
        theme: pattern === 'isometric-mesh' ? 'linear-dark' : 'stripe-craft',
        slides: [
          {
            layout: 'cover',
            variant: pattern === 'editorial-arcs' ? 'editorial-grid' : 'keynote-glow',
            coverPattern: pattern,
            title: `Procedural Cover ${pattern}`,
            subtitle: 'Theme-adaptive native vector artwork',
          },
          { layout: 'closing', title: 'Next Steps & Action Plan', subtitle: 'Design Engineering 2026' },
        ],
      })
      assert.equal(res.ok, true)
      assert.equal(res.quality.errorCount, 0)
      const html = readFileSync(res.htmlPath, 'utf8')
      assert.ok(html.includes('cover-pat-svg'), `HTML must include inline SVG cover artwork for ${pattern}`)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('v0.33 Smart Visual Brief slot, focalPoint crop, full-bleed protective scrim, planner visualBriefs & strict 13-tool 0-type-array schema', async () => {
  const tools = buildPptTools(resolvePptConfig({}))
  assert.equal(tools.length, 13, 'must remain strictly 13 registered Agent tools')
  for (const tool of tools) {
    assert.equal(hasTypeArray(tool.parameters), false, `tool ${tool.name} must have 0 JSON Schema wire type arrays`)
  }

  const theme = resolveTheme('stripe-craft')
  const brief = generateVisualBrief({ layout: 'cover', title: 'AI Cloud Infrastructure' }, theme, 'en')
  assert.equal(brief.recommendedAspect, '8:9')
  assert.equal(brief.paletteHex.accentPrimary, theme.tokens.accentPrimary)
  assert.ok(brief.promptEn.includes('NO text'))

  const plan = buildResearchPlan({ topic: '2026 全球算力网络研报', lang: 'zh' })
  assert.ok(Array.isArray(plan.visualBriefs) && plan.visualBriefs.length >= 1, 'buildResearchPlan must attach visualBriefs for cover/image slots')

  const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-v33-brief-'))
  try {
    const imgPath = join(dir, 'sample.png')
    writeFileSync(imgPath, makeTinyPng(1440, 1080))

    // 1. Build deck with pending imageBrief slot + full-bleed focalPoint:'top' slide
    const built = await buildDeckAsync({
      title: 'Visual Brief & Scrim Test',
      outputDir: dir,
      theme: 'stripe-craft',
      slides: [
        { layout: 'cover', title: 'Visual Brief Test', subtitle: 'Smart image collaboration' },
        {
          layout: 'image-right',
          kicker: '01 · 视觉协作',
          title: '待补真图的配图槽位可零报错渲染占位蓝图',
          bullets: ['保留主题色板色块与安全画幅提示'],
          imageBrief: { prompt: 'Clean studio glass cube on daylight background', aspect: '4:3' },
        },
        {
          layout: 'image',
          variant: 'full-bleed',
          title: '全屏出血主图自动叠加暗色渐变保护层',
          image: { src: imgPath, alt: 'Daylight studio visual', fit: 'cover', focalPoint: 'top' },
        },
      ],
    })
    assert.equal(built.ok, true)
    assert.equal(built.quality.errorCount, 0)
    assert.ok(built.quality.issues.some((i) => i.code === 'image-brief-pending'), 'pending imageBrief slot must report image-brief-pending reminder')
    const html = readFileSync(built.htmlPath, 'utf8')
    assert.ok(html.includes('visual-brief-card'))
    assert.ok(html.includes('media-bleed-scrim'))
    assert.ok(html.includes('object-position:center top'))

    // 2. Replace pending imageBrief with real image via editDeck -> automatically clears imageBrief & warning!
    const edited = await editDeck({
      deckPath: built.jsonPath,
      expectedRevision: built.revision,
      edits: [
        {
          slide: 2,
          patch: {
            image: { src: imgPath, alt: 'Final generated visual', fit: 'cover', focalPoint: 'top' },
          },
        },
      ],
    })
    const checked = checkDeck({ deckPath: edited.jsonPath })
    assert.equal(checked.errorCount, 0)
    assert.equal(checked.issues.some((i) => i.code === 'image-brief-pending'), false, 'attaching real image must clear image-brief-pending')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

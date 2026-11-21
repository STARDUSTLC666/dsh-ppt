/**
 * deck-compose.mjs —— 企业金页组件库（.dsh-ppt/slide-bank.json）与多工程无损拼装引擎（mergeDecks）。
 *
 * 零新增运行时依赖：
 *   1. Workspace Slide Bank：将任意高质量单页（连同嵌入图片资产与关联证据）收藏至 `.dsh-ppt/slide-bank.json` 跨项目复用；
 *   2. Multi-Deck Composer（`mergeDecks`）：从多个 `.json` 工程和/或金页库中精选指定页，
 *      自动按 SHA-256 资产去重，并将跨工程的 `[E1..En]` 证据编号无冲突重映射，统一主题与母版后直接产出新三件套。
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeWorkspaceJson } from './deck-store.mjs'
import { extractSlideEvidenceRefs } from './deck-evidence.mjs'

const BANK_REL_PATH = join('.dsh-ppt', 'slide-bank.json')
const MAX_BANK_ENTRIES = 100
const INLINE_REF_RE = /\[([Ee]\d{1,3})\]/g

function fail(msg) {
  throw new Error('dsh-ppt：' + msg)
}

function cleanStr(val, max = 120) {
  return String(val ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function slideBankPathFor(cwd = '.') {
  return join(resolve(String(cwd || '.')), BANK_REL_PATH)
}

export function loadSlideBank(cwd = '.') {
  const file = slideBankPathFor(cwd)
  if (!existsSync(file)) return { schemaVersion: 1, entries: [] }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    if (parsed && Array.isArray(parsed.entries)) {
      return { schemaVersion: 1, entries: parsed.entries }
    }
  } catch { /* ignore corrupt bank */ }
  return { schemaVersion: 1, entries: [] }
}

function collectSlideAssets(slide, assetsMap = {}) {
  const out = {}
  if (slide?.image?.assetId && assetsMap[slide.image.assetId]) {
    out[slide.image.assetId] = structuredClone(assetsMap[slide.image.assetId])
  }
  if (Array.isArray(slide?.images)) {
    for (const img of slide.images) {
      if (img?.assetId && assetsMap[img.assetId]) {
        out[img.assetId] = structuredClone(assetsMap[img.assetId])
      }
    }
  }
  return out
}

function hydrateSlideImageDataUris(slide, assetsMap = {}) {
  const copy = structuredClone(slide)
  delete copy.id
  delete copy.dataTemplate
  if (copy.image?.assetId && assetsMap[copy.image.assetId]?.data) {
    const { assetId, ...rest } = copy.image
    copy.image = { ...rest, src: assetsMap[assetId].data }
  }
  if (Array.isArray(copy.images)) {
    copy.images = copy.images.map((img) => {
      if (img?.assetId && assetsMap[img.assetId]?.data) {
        const { assetId, ...rest } = img
        return { ...rest, src: assetsMap[assetId].data }
      }
      return img
    })
  }
  return copy
}

export function saveSlideToBank(cwd = '.', manifest, slideRef, meta = {}) {
  if (!manifest || !Array.isArray(manifest.slides) || manifest.slides.length === 0) {
    fail('无法保存金页：工程缺少有效 slides')
  }
  const idx = typeof slideRef === 'number' && Number.isInteger(slideRef)
    ? slideRef - 1
    : manifest.slides.findIndex(s => s.id === slideRef)
  if (idx < 0 || idx >= manifest.slides.length) {
    fail('找不到要收藏的页面：' + slideRef)
  }
  const slide = manifest.slides[idx]
  const bank = loadSlideBank(cwd)
  const bankId = cleanStr(meta.bankId || meta.id || `bank-${randomUUID().slice(0, 8)}`, 48)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-') || `bank-${randomUUID().slice(0, 8)}`
  const name = cleanStr(meta.name || slide.title || `Slide ${idx + 1}`, 80)
  const tags = [...new Set(
    (Array.isArray(meta.tags) ? meta.tags : (typeof meta.tags === 'string' ? meta.tags.split(/[,，\s]+/) : []))
      .map(t => cleanStr(t, 28).toLowerCase())
      .filter(Boolean),
  )].slice(0, 10)

  const refs = extractSlideEvidenceRefs(slide)
  const evById = new Map((Array.isArray(manifest.evidence) ? manifest.evidence : []).map(e => [String(e.id || '').toUpperCase(), e]))
  const boundEvidence = refs.map(id => evById.get(id)).filter(Boolean).map(e => structuredClone(e))

  const entry = {
    bankId,
    name,
    tags,
    layout: slide.layout || 'bullets',
    variant: slide.variant || undefined,
    sourceDeckTitle: cleanStr(manifest.title || '', 100),
    savedAt: new Date().toISOString(),
    slide: structuredClone(slide),
    assets: collectSlideAssets(slide, manifest.assets || {}),
    ...(boundEvidence.length > 0 ? { evidence: boundEvidence } : {}),
  }

  const nextEntries = [
    ...bank.entries.filter(e => e.bankId !== bankId),
    entry,
  ].slice(-MAX_BANK_ENTRIES)

  const file = slideBankPathFor(cwd)
  writeWorkspaceJson(file, { schemaVersion: 1, entries: nextEntries })
  return {
    ok: true,
    path: file,
    bankId,
    name,
    tags,
    layout: entry.layout,
    totalCount: nextEntries.length,
  }
}

export function listSlideBank(cwd = '.', tag = '') {
  const bank = loadSlideBank(cwd)
  const needle = cleanStr(tag, 40).toLowerCase()
  const filtered = needle
    ? bank.entries.filter(e =>
        (Array.isArray(e.tags) && e.tags.some(t => t.toLowerCase().includes(needle))) ||
        String(e.name || '').toLowerCase().includes(needle) ||
        String(e.layout || '').toLowerCase().includes(needle)
      )
    : bank.entries
  return {
    ok: true,
    path: slideBankPathFor(cwd),
    count: filtered.length,
    entries: filtered.map(e => ({
      bankId: e.bankId,
      name: e.name,
      layout: e.layout,
      ...(e.variant ? { variant: e.variant } : {}),
      tags: e.tags || [],
      sourceDeckTitle: e.sourceDeckTitle || '',
      savedAt: e.savedAt || '',
      evidenceCount: Array.isArray(e.evidence) ? e.evidence.length : 0,
    })),
  }
}

export function removeBankSlide(cwd = '.', bankId) {
  const id = cleanStr(bankId, 48).toLowerCase()
  const bank = loadSlideBank(cwd)
  const next = bank.entries.filter(e => String(e.bankId || '').toLowerCase() !== id)
  if (next.length === bank.entries.length) fail('金页库中找不到条目：' + bankId)
  const file = slideBankPathFor(cwd)
  writeWorkspaceJson(file, { schemaVersion: 1, entries: next })
  return { ok: true, removed: id, totalCount: next.length }
}

// ---------------------------------------------------------------------------
// Multi-Deck Composer with SHA-256 Asset Dedup & Collision-Free [E#] Remapping
// ---------------------------------------------------------------------------

function rewriteInlineRefs(text, idMap) {
  if (typeof text !== 'string' || !text.includes('[')) return text
  return text.replace(INLINE_REF_RE, (full, rawId) => {
    const mapped = idMap.get(String(rawId).toUpperCase())
    return mapped ? `[${mapped}]` : full
  })
}

function stripAutoProvenanceBlock(notes) {
  if (typeof notes !== 'string') return notes
  return notes.split(/\n{1,2}\[(?:证据溯源|Evidence Provenance)\]/)[0].trim()
}

function remapSlideEvidence(slide, idMap) {
  if (!idMap || idMap.size === 0) return slide
  const next = structuredClone(slide)
  if (Array.isArray(next.evidenceIds)) {
    next.evidenceIds = [...new Set(next.evidenceIds.map(id => idMap.get(String(id).toUpperCase()) || String(id).toUpperCase()))]
  }
  for (const key of ['title', 'subtitle', 'takeaway', 'source', 'text']) {
    if (typeof next[key] === 'string') next[key] = rewriteInlineRefs(next[key], idMap)
  }
  if (typeof next.notes === 'string') {
    const cleaned = stripAutoProvenanceBlock(next.notes)
    next.notes = cleaned ? rewriteInlineRefs(cleaned, idMap) : undefined
    if (next.notes === undefined) delete next.notes
  }
  if (Array.isArray(next.bullets)) {
    next.bullets = next.bullets.map(b => rewriteInlineRefs(b, idMap))
  }
  if (Array.isArray(next.items)) {
    next.items = next.items.map(it => {
      if (!it || typeof it !== 'object') return it
      const copy = { ...it }
      for (const k of ['tag', 'title', 'value', 'delta', 'text']) {
        if (typeof copy[k] === 'string') copy[k] = rewriteInlineRefs(copy[k], idMap)
      }
      if (Array.isArray(copy.bullets)) copy.bullets = copy.bullets.map(b => rewriteInlineRefs(b, idMap))
      return copy
    })
  }
  if (Array.isArray(next.rows)) {
    next.rows = next.rows.map(r => (Array.isArray(r) ? r.map(c => rewriteInlineRefs(c, idMap)) : r))
  }
  if (next.chart?.caption) next.chart.caption = rewriteInlineRefs(next.chart.caption, idMap)
  return next
}

/**
 * 跨工程拼装器：从 2+ 份 `.json` 工程和/或 `.dsh-ppt/slide-bank.json` 金页库中精选指定页，
 * 自动完成图片资产 SHA-256 去重与跨来源 `[E1..En]` 证据无冲突重映射，统一母版后重建完整三件套。
 */
export async function mergeDecks(options = {}) {
  options.signal?.throwIfAborted?.()
  const cwd = resolve(String(options.cwd || '.'))
  const sources = Array.isArray(options.sources) ? options.sources : []
  if (sources.length === 0) {
    fail('mergeDecks 至少需要提供 1 个 sources 来源（deckPath 或 bankIds）')
  }

  const bank = loadSlideBank(cwd)
  const bankMap = new Map(bank.entries.map(e => [String(e.bankId).toLowerCase(), e]))

  const mergedSlides = []
  const mergedEvidence = []
  const evidenceDedupKey = new Map()
  let evCounter = 0
  let firstTheme = ''
  let firstLang = ''
  const mergedAssetHashes = new Set()
  const sourceStats = []

  const registerEvidenceEntry = (ev) => {
    const dedup = `${cleanStr(ev.claim, 200).toLowerCase()}||${cleanStr(ev.source, 120).toLowerCase()}`
    if (evidenceDedupKey.has(dedup)) return evidenceDedupKey.get(dedup)
    evCounter += 1
    const newId = `E${evCounter}`
    const normalized = { ...structuredClone(ev), id: newId }
    mergedEvidence.push(normalized)
    evidenceDedupKey.set(dedup, newId)
    return newId
  }

  for (let sIdx = 0; sIdx < sources.length; sIdx += 1) {
    const spec = sources[sIdx]
    if (!spec || typeof spec !== 'object') continue

    // Source Kind A: Slide Bank entries
    if (Array.isArray(spec.bankIds) && spec.bankIds.length > 0) {
      let pickedCount = 0
      for (const bid of spec.bankIds) {
        const entry = bankMap.get(String(bid || '').trim().toLowerCase())
        if (!entry) fail('金页库中找不到条目：' + bid)
        const idMap = new Map()
        for (const ev of (entry.evidence || [])) {
          idMap.set(String(ev.id || '').toUpperCase(), registerEvidenceEntry(ev))
        }
        Object.keys(entry.assets || {}).forEach(h => mergedAssetHashes.add(h))
        const hydrated = hydrateSlideImageDataUris(entry.slide, entry.assets || {})
        mergedSlides.push(remapSlideEvidence(hydrated, idMap))
        pickedCount += 1
      }
      sourceStats.push({ kind: 'slide-bank', count: pickedCount })
      continue
    }

    // Source Kind B: Project JSON deck
    if (typeof spec.deckPath === 'string' && spec.deckPath.trim()) {
      const fullPath = resolve(cwd, spec.deckPath.trim())
      if (!existsSync(fullPath)) fail('找不到待拼装工程：' + fullPath)
      let doc
      try { doc = JSON.parse(readFileSync(fullPath, 'utf8')) } catch { fail('无法解析待拼装工程 JSON：' + fullPath) }
      if (!doc || !Array.isArray(doc.slides) || doc.slides.length === 0) fail('无效的 dsh-ppt 工程文件：' + fullPath)
      if (!firstTheme && doc.theme) firstTheme = doc.theme
      if (!firstLang && doc.language) firstLang = doc.language

      const explicitRange = Array.isArray(spec.slides) && spec.slides.length > 0
      const chosenSlides = explicitRange
        ? spec.slides.map((ref) => {
            const sl = typeof ref === 'number' && Number.isInteger(ref) ? doc.slides[ref - 1] : doc.slides.find(x => x.id === ref)
            if (!sl) fail(`工程 ${spec.deckPath} 中找不到第 ${ref} 页`)
            return sl
          })
        : doc.slides.filter((sl) => {
            if (sIdx > 0 && (sl.layout === 'cover' || sl.layout === 'closing')) return false
            if (sIdx === 0 && sources.length > 1 && sl.layout === 'closing') return false
            if (sl.kicker && /附录 · 事实溯源|APPENDIX · SOURCES/i.test(sl.kicker)) return false
            return true
          })

      const idMap = new Map()
      const docEvById = new Map((Array.isArray(doc.evidence) ? doc.evidence : []).map(e => [String(e.id || '').toUpperCase(), e]))
      for (const sl of chosenSlides) {
        for (const oldId of extractSlideEvidenceRefs(sl)) {
          const ev = docEvById.get(oldId)
          if (ev && !idMap.has(oldId)) {
            idMap.set(oldId, registerEvidenceEntry(ev))
          }
        }
      }

      for (const sl of chosenSlides) {
        if (sl.image?.assetId) mergedAssetHashes.add(sl.image.assetId)
        if (Array.isArray(sl.images)) sl.images.forEach(im => { if (im?.assetId) mergedAssetHashes.add(im.assetId) })
        const hydrated = hydrateSlideImageDataUris(sl, doc.assets || {})
        mergedSlides.push(remapSlideEvidence(hydrated, idMap))
      }
      sourceStats.push({ kind: 'deck', deckPath: fullPath, count: chosenSlides.length })
    }
  }

  if (mergedSlides.length === 0) {
    fail('拼装结果为空，请检查 sources 指定的页码或 bankIds')
  }

  const lang = options.lang || firstLang || 'zh'
  const en = lang === 'en'
  const title = cleanStr(options.title || (en ? 'Composed Presentation' : '跨工程融合演示文稿'), 120)

  // Ensure clean cover & closing framing when composing body slides
  if (mergedSlides[0]?.layout !== 'cover') {
    mergedSlides.unshift({
      layout: 'cover',
      kicker: en ? 'COMPOSED DECK' : '多工程融合汇编',
      title,
      subtitle: en
        ? `Curated from ${sourceStats.length} source(s) · ${mergedSlides.length} core slides`
        : `精选拼装自 ${sourceStats.length} 组来源 · 共 ${mergedSlides.length} 页核心内容`,
    })
  } else if (options.title) {
    mergedSlides[0] = { ...mergedSlides[0], title }
  }

  if (mergedSlides[mergedSlides.length - 1]?.layout !== 'closing') {
    mergedSlides.push({
      layout: 'closing',
      kicker: en ? 'NEXT STEPS' : '总结与行动',
      title: en ? 'Align priorities and kick off execution' : '共识确认与下一步推进计划',
      subtitle: title,
    })
  }

  const { buildDeckAsync } = await import('./deck-advanced.mjs')
  const built = await buildDeckAsync({
    title,
    slides: mergedSlides,
    theme: options.theme || firstTheme || 'consulting',
    lang,
    motion: options.motion,
    motionProfile: options.motionProfile,
    brand: options.brand,
    ...(mergedEvidence.length > 0 ? { evidence: mergedEvidence, evidenceAppendix: options.evidenceAppendix !== false } : {}),
    outputDir: options.outputDir || '.',
    fileName: options.fileName || title,
    overwrite: options.overwrite === true,
    smartLayout: false,
    autoUpgrade: false,
    selfRepair: false,
    ...(Array.isArray(options.exports) && options.exports.length > 0 ? { exports: options.exports } : {}),
    cwd,
    signal: options.signal,
  })

  return {
    ...built,
    composedFrom: sourceStats,
    dedupedAssetCount: mergedAssetHashes.size,
    remappedEvidenceCount: mergedEvidence.length,
  }
}

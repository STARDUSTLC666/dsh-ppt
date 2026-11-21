/**
 * deck-i18n.mjs —— 100% 版式无损翻译提取与双语化引擎（零新增运行时依赖）。
 *
 * 解决痛点：
 *   把一整套做好的中文 PPT 翻译成英文（或做中英双语版）时，直接让 AI 重写 JSON 极易丢图表、乱坐标、破坏配图与 `[E#]` 溯源。
 *   本模块提供确定性双步接口：
 *     1. `extractTranslationBundle(manifest)` —— 只抽离可翻译文案槽位（标题/副标题/kicker/takeaway/source/bullets/items/rows/notes）；
 *     2. `applyTranslationBundle(manifest, translations, { mode: 'replace' | 'bilingual', targetLang })` ——
 *        按槽位精确回填（支持纯替换或中英双语安全拼排），100% 锁死原版式、图表数值、嵌入图片、品牌与证据溯源！
 */

function cleanStr(val) {
  return String(val ?? '').replace(/\s+/g, ' ').trim()
}

function trimSafe(str, maxChars) {
  const s = cleanStr(str)
  if (s.length <= maxChars) return s
  return s.slice(0, Math.max(4, maxChars - 1)).trim() + '…'
}

function combineBilingual(orig, trans, sep = ' / ', maxTotal = 160) {
  const a = cleanStr(orig)
  const b = cleanStr(trans)
  if (!b) return a
  if (!a || a.toLowerCase() === b.toLowerCase()) return b
  const joined = `${a}${sep}${b}`
  if (joined.length <= maxTotal) return joined
  const half = Math.max(12, Math.floor((maxTotal - sep.length) / 2))
  return `${trimSafe(a, half)}${sep}${trimSafe(b, half)}`
}

/**
 * 提取工程内所有可翻译文本槽位，返回精简、可直接交给 AI 翻译的 JSON Bundle。
 * @param {object} manifest
 */
export function extractTranslationBundle(manifest) {
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  return {
    schemaVersion: 1,
    deckTitle: String(manifest?.title || ''),
    sourceLanguage: String(manifest?.language || 'zh'),
    slideCount: slides.length,
    slides: slides.map((s, idx) => {
      const fields = {}
      for (const k of ['kicker', 'title', 'subtitle', 'text', 'takeaway', 'source', 'notes']) {
        if (typeof s[k] === 'string' && s[k].trim()) fields[k] = s[k]
      }
      if (Array.isArray(s.bullets) && s.bullets.length > 0) {
        fields.bullets = [...s.bullets]
      }
      if (Array.isArray(s.items) && s.items.length > 0) {
        fields.items = s.items.map((it) => {
          const out = {}
          for (const k of ['tag', 'title', 'text', 'delta']) {
            if (typeof it?.[k] === 'string' && it[k].trim()) out[k] = it[k]
          }
          if (Array.isArray(it?.bullets) && it.bullets.length > 0) out.bullets = [...it.bullets]
          return out
        })
      }
      if (Array.isArray(s.rows) && s.rows.length > 0) {
        fields.rows = s.rows.map(r => (Array.isArray(r) ? r.map(c => String(c ?? '')) : [String(r ?? '')]))
      }
      return {
        slide: idx + 1,
        id: s.id,
        layout: s.layout || 'bullets',
        fields,
      }
    }),
  }
}

/**
 * 将翻译结果无损回填至工程 manifest，100% 保留版式、图表、图片、品牌、证据与 dataModel。
 * @param {object} manifest
 * @param {object|Array} translations
 * @param {{ mode?: 'replace' | 'bilingual', targetLang?: string }} [options]
 */
export function applyTranslationBundle(manifest, translations, options = {}) {
  if (!manifest || !Array.isArray(manifest.slides)) {
    throw new Error('dsh-ppt：applyTranslationBundle 需要有效的工程 manifest')
  }
  const mode = String(options.mode || 'replace').toLowerCase() === 'bilingual' ? 'bilingual' : 'replace'
  const next = structuredClone(manifest)
  const slideEntries = Array.isArray(translations)
    ? translations
    : (Array.isArray(translations?.slides) ? translations.slides : [])

  if (translations && !Array.isArray(translations) && typeof translations.deckTitle === 'string' && translations.deckTitle.trim()) {
    next.title = mode === 'bilingual'
      ? combineBilingual(next.title, translations.deckTitle, ' · ', 110)
      : cleanStr(translations.deckTitle)
  }

  const resolveField = (orig, translated, maxTotal = 160, sep = ' / ') => {
    if (typeof translated !== 'string' || !translated.trim()) return orig
    return mode === 'bilingual' ? combineBilingual(orig, translated, sep, maxTotal) : translated
  }

  for (let i = 0; i < slideEntries.length; i += 1) {
    const entry = slideEntries[i]
    if (!entry || typeof entry !== 'object') continue
    let targetIdx = -1
    if (typeof entry.id === 'string') {
      targetIdx = next.slides.findIndex(s => s.id === entry.id)
    }
    if (targetIdx < 0 && Number.isInteger(entry.slide) && entry.slide >= 1 && entry.slide <= next.slides.length) {
      targetIdx = entry.slide - 1
    }
    if (targetIdx < 0 && i < next.slides.length) {
      targetIdx = i
    }
    if (targetIdx < 0) continue

    const slide = next.slides[targetIdx]
    const f = entry.fields && typeof entry.fields === 'object' ? entry.fields : entry

    if (typeof f.kicker === 'string') slide.kicker = resolveField(slide.kicker, f.kicker, 64, ' · ')
    if (typeof f.title === 'string') slide.title = resolveField(slide.title, f.title, 76, ' · ')
    if (typeof f.subtitle === 'string') slide.subtitle = resolveField(slide.subtitle, f.subtitle, 130, ' / ')
    if (typeof f.text === 'string') slide.text = resolveField(slide.text, f.text, 180, ' / ')
    if (typeof f.takeaway === 'string') slide.takeaway = resolveField(slide.takeaway, f.takeaway, 150, ' / ')
    if (typeof f.source === 'string') slide.source = resolveField(slide.source, f.source, 110, ' / ')
    if (typeof f.notes === 'string') slide.notes = resolveField(slide.notes, f.notes, 2000, '\n\n')

    if (Array.isArray(f.bullets) && Array.isArray(slide.bullets)) {
      slide.bullets = slide.bullets.map((orig, bi) => resolveField(orig, f.bullets[bi], 120, ' / '))
    }

    if (Array.isArray(f.items) && Array.isArray(slide.items)) {
      slide.items = slide.items.map((origItem, ii) => {
        const patchItem = f.items[ii]
        if (!patchItem || typeof patchItem !== 'object') return origItem
        const updated = { ...origItem }
        if (typeof patchItem.tag === 'string') updated.tag = resolveField(origItem.tag, patchItem.tag, 36, ' · ')
        if (typeof patchItem.title === 'string') updated.title = resolveField(origItem.title, patchItem.title, 54, ' / ')
        if (typeof patchItem.text === 'string') updated.text = resolveField(origItem.text, patchItem.text, 110, ' / ')
        if (typeof patchItem.delta === 'string') updated.delta = resolveField(origItem.delta, patchItem.delta, 40, ' / ')
        if (Array.isArray(patchItem.bullets) && Array.isArray(origItem.bullets)) {
          updated.bullets = origItem.bullets.map((b, bi) => resolveField(b, patchItem.bullets[bi], 96, ' / '))
        }
        return updated
      })
    }

    if (Array.isArray(f.rows) && Array.isArray(slide.rows)) {
      slide.rows = slide.rows.map((origRow, ri) => {
        const patchRow = f.rows[ri]
        if (!Array.isArray(origRow) || !Array.isArray(patchRow)) return origRow
        return origRow.map((cell, ci) => {
          const translated = patchRow[ci]
          if (typeof translated !== 'string' || !translated.trim()) return cell
          // Preserve pure numeric cells untouched in bilingual mode
          if (/^[+-]?[\d,.$¥€£%％]+$/.test(cleanStr(cell)) && cleanStr(cell) === cleanStr(translated)) return cell
          return mode === 'bilingual' ? combineBilingual(cell, translated, ' / ', 42) : translated
        })
      })
    }
  }

  if (mode === 'bilingual') {
    next.language = 'bilingual'
  } else if (options.targetLang && ['zh', 'en', 'bilingual'].includes(options.targetLang)) {
    next.language = options.targetLang
  }

  return next
}

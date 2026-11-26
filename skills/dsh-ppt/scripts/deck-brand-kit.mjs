/**
 * deck-brand-kit.mjs —— 企业级品牌宪章锁（.dsh-ppt/brand-kit.json）、保密水印与 SLOP-14 合规门禁。
 *
 * 零外部运行时依赖，复用了 deck-store.mjs 的原子写盘保护：
 *   1. 支持通过 `saveWorkspaceBrandKit` 或 `ppt_absorb({ ..., saveBrandKit: true })` 将企业母版规范永久锁定；
 *   2. 自动注入锁定色板、字体、页脚、保密水印（如 "CONFIDENTIAL · 内部资料"）与官方固定封底；
 *   3. `SLOP-14` 合规静态审计：自动扫描全篇标题/要点/卡片/表格/备注中的企业禁用词（`forbidden-brand-term`）与主色漂移（`brand-palette-drift`）。
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { stripInlineMarkdown } from './deck-layouts.mjs'
import { writeWorkspaceJson } from './deck-store.mjs'
import { normalizeTemplateMaster, collectTemplateMasterAssetIds } from './deck-template-master.mjs'

const BRAND_KIT_REL_PATH = join('.dsh-ppt', 'brand-kit.json')
const MAX_FORBIDDEN_TERMS = 40
const HEX_RE = /^#[0-9A-Fa-f]{6}$/

function cleanStr(value, maxLen = 160) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLen)
}

function cleanHex(value, field) {
  if (value === undefined || value === null || value === '') return undefined
  const s = String(value).trim()
  if (!HEX_RE.test(s)) throw new Error(`dsh-ppt：brandKit.brand.${field} 需为 #RRGGBB 格式颜色：${s}`)
  return s.toUpperCase()
}

export function normalizeBrandKit(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('dsh-ppt：brandKit 必须是对象')
  }
  const name = cleanStr(raw.name || raw.orgName || 'Corporate Brand Kit', 80)
  const enforce = raw.enforce !== false
  const theme = raw.theme ? cleanStr(raw.theme, 40) : undefined
  const watermark = raw.watermark ? cleanStr(raw.watermark, 48) : undefined

  const rawBrand = (raw.brand && typeof raw.brand === 'object' && !Array.isArray(raw.brand)) ? raw.brand : {}
  const brand = {}
  for (const ck of ['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'coverBg']) {
    const h = cleanHex(rawBrand[ck], ck)
    if (h) brand[ck] = h
  }
  for (const sk of ['name', 'fontFamily', 'headingFont', 'coverMode', 'footer', 'chromeStyle', 'cardMaterial', 'iconMode', 'taste', 'logo']) {
    if (typeof rawBrand[sk] === 'string' && rawBrand[sk].trim()) {
      brand[sk] = sk === 'logo' ? rawBrand[sk].trim() : cleanStr(rawBrand[sk], 160)
    }
  }
  if (watermark) brand.watermark = watermark

  const rawTerms = Array.isArray(raw.forbiddenTerms) ? raw.forbiddenTerms : []
  const forbiddenTerms = [...new Set(
    rawTerms
      .map((t) => cleanStr(t, 48))
      .filter((t) => t.length >= 2),
  )].slice(0, MAX_FORBIDDEN_TERMS)

  const normalizeSourceList = (arr) => [...new Set(
    (Array.isArray(arr) ? arr : [])
      .map((s) => cleanStr(s, 96).replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase())
      .filter((s) => s.length >= 2),
  )].slice(0, MAX_FORBIDDEN_TERMS)

  const preferredSources = normalizeSourceList(raw.preferredSources)
  const blockedDomains = normalizeSourceList(raw.blockedDomains)

  let mandatoryClosing
  if (raw.mandatoryClosing && typeof raw.mandatoryClosing === 'object' && !Array.isArray(raw.mandatoryClosing)) {
    const mcTitle = cleanStr(raw.mandatoryClosing.title, 120)
    const mcSub = cleanStr(raw.mandatoryClosing.subtitle, 200)
    const mcKicker = cleanStr(raw.mandatoryClosing.kicker, 48)
    if (mcTitle) {
      mandatoryClosing = {
        title: mcTitle,
        ...(mcSub ? { subtitle: mcSub } : {}),
        ...(mcKicker ? { kicker: mcKicker } : {}),
      }
    }
  }

  let templateMasterAssets
  if (raw.templateMasterAssets && typeof raw.templateMasterAssets === 'object' && !Array.isArray(raw.templateMasterAssets)) {
    const cleanedAssets = {}
    for (const [id, asset] of Object.entries(raw.templateMasterAssets)) {
      if (!/^img-[a-f0-9]{64}$/.test(id) || !asset || typeof asset !== 'object') continue
      if (typeof asset.data !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(asset.data)) continue
      if (!Number.isInteger(asset.width) || !Number.isInteger(asset.height) || asset.width <= 0 || asset.height <= 0) continue
      cleanedAssets[id] = { width: asset.width, height: asset.height, mime: String(asset.mime || 'image/png'), data: asset.data }
    }
    if (Object.keys(cleanedAssets).length > 0) templateMasterAssets = cleanedAssets
  }

  let templateMaster
  const rawTm = raw.templateMaster || rawBrand.templateMaster
  if (rawTm && typeof rawTm === 'object' && !Array.isArray(rawTm)) {
    templateMaster = normalizeTemplateMaster(rawTm, templateMasterAssets || null)
    // Trim unreferenced templateMasterAssets
    if (templateMasterAssets && templateMaster) {
      const used = collectTemplateMasterAssetIds(templateMaster)
      const trimmed = {}
      for (const id of used) {
        if (templateMasterAssets[id]) trimmed[id] = templateMasterAssets[id]
      }
      templateMasterAssets = Object.keys(trimmed).length > 0 ? trimmed : undefined
    }
  }

  return {
    schemaVersion: 1,
    name,
    enforce,
    ...(theme ? { theme } : {}),
    ...(Object.keys(brand).length > 0 ? { brand } : {}),
    ...(watermark ? { watermark } : {}),
    ...(forbiddenTerms.length > 0 ? { forbiddenTerms } : {}),
    ...(preferredSources.length > 0 ? { preferredSources } : {}),
    ...(blockedDomains.length > 0 ? { blockedDomains } : {}),
    ...(mandatoryClosing ? { mandatoryClosing } : {}),
    ...(templateMaster ? { templateMaster } : {}),
    ...(templateMasterAssets ? { templateMasterAssets } : {}),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  }
}

export function brandKitPathFor(cwd = '.') {
  return join(resolve(cwd || '.'), BRAND_KIT_REL_PATH)
}

export function loadWorkspaceBrandKit(cwd = '.') {
  const file = brandKitPathFor(cwd)
  if (!existsSync(file)) return null
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    return normalizeBrandKit(parsed)
  } catch {
    return null
  }
}

export function saveWorkspaceBrandKit(cwd = '.', rawKit = {}) {
  const file = brandKitPathFor(cwd)
  const kit = normalizeBrandKit(rawKit)
  writeWorkspaceJson(file, kit)
  return { ok: true, path: file, brandKit: kit }
}

export function buildBrandKitFromAbsorbed(absorbed, options = {}) {
  if (!absorbed || typeof absorbed !== 'object') {
    throw new Error('dsh-ppt：缺少吸收结果，无法生成企业品牌宪章')
  }
  const sb = absorbed.sanitizedBrand || {}
  return normalizeBrandKit({
    name: options.name || sb.name || 'Corporate Brand Kit',
    enforce: options.enforce !== false,
    theme: absorbed.recommendedTheme || 'consulting',
    brand: {
      ...sb,
      ...(absorbed.recommendedChrome && !sb.chromeStyle ? { chromeStyle: absorbed.recommendedChrome } : {}),
      ...(options.footer ? { footer: options.footer } : {}),
    },
    ...(options.watermark ? { watermark: options.watermark } : {}),
    ...(Array.isArray(options.forbiddenTerms) ? { forbiddenTerms: options.forbiddenTerms } : {}),
    ...(Array.isArray(options.preferredSources) ? { preferredSources: options.preferredSources } : {}),
    ...(Array.isArray(options.blockedDomains) ? { blockedDomains: options.blockedDomains } : {}),
    ...(options.mandatoryClosing ? { mandatoryClosing: options.mandatoryClosing } : {}),
    ...(absorbed.templateMaster ? { templateMaster: absorbed.templateMaster } : {}),
    ...(absorbed.templateMasterAssets ? { templateMasterAssets: absorbed.templateMasterAssets } : {}),
  })
}

/**
 * 将企业品牌宪章应用到建稿配置与幻灯片：
 * - 品牌字段与水印合并（`enforce: true` 时锁定企业主色、字体、页脚与水印）；
 * - 若品牌宪章已开启 `templateMaster` 且本次未显式禁用（`useTemplateMaster !== false`），同步挂载企业母版与去重资产；
 * - 若配置了 `mandatoryClosing` 且文稿末尾缺少封底或仅为空洞致谢页，自动补齐官方封底。
 */
export function applyBrandKitToSlidesAndBrand(slides, brandInput, kit, options = {}) {
  if (!kit) return { slides, brandInput, templateMasterAssets: null }
  const kitBrand = kit.brand && typeof kit.brand === 'object' ? { ...kit.brand } : {}
  if (kit.watermark && !kitBrand.watermark) kitBrand.watermark = kit.watermark

  let attachedTmAssets = null
  const allowTemplateMaster = options.useTemplateMaster !== false
  if (allowTemplateMaster && kit.templateMaster?.enabled === true && !brandInput?.templateMaster) {
    kitBrand.templateMaster = kit.templateMaster
    if (kit.templateMasterAssets) attachedTmAssets = kit.templateMasterAssets
  }

  let nextBrand = brandInput
  if (brandInput !== null) {
    nextBrand = kit.enforce
      ? { ...(brandInput || {}), ...kitBrand }
      : { ...kitBrand, ...(brandInput || {}) }
  }

  let nextSlides = Array.isArray(slides) ? slides : []
  if (kit.mandatoryClosing && nextSlides.length > 0) {
    const last = nextSlides[nextSlides.length - 1]
    const isBare = last?.layout === 'closing' && /^(?:谢谢|感谢(?:聆听|观看)?|thanks?|thank\s*you|q\s*&\s*a)[!！。.\s]*$/i.test(String(last.title || '').trim())
    if (last?.layout !== 'closing') {
      nextSlides = [
        ...nextSlides,
        {
          layout: 'closing',
          kicker: kit.mandatoryClosing.kicker || kit.name,
          title: kit.mandatoryClosing.title,
          ...(kit.mandatoryClosing.subtitle ? { subtitle: kit.mandatoryClosing.subtitle } : {}),
        },
      ]
    } else if (isBare) {
      nextSlides = [
        ...nextSlides.slice(0, -1),
        {
          ...last,
          kicker: last.kicker || kit.mandatoryClosing.kicker || kit.name,
          title: kit.mandatoryClosing.title,
          subtitle: last.subtitle || kit.mandatoryClosing.subtitle || '',
        },
      ]
    }
  }

  return { slides: nextSlides, brandInput: nextBrand, templateMasterAssets: attachedTmAssets }
}

function collectSlidePlainText(slide) {
  const parts = [
    slide?.kicker,
    slide?.title,
    slide?.subtitle,
    slide?.text,
    slide?.takeaway,
    slide?.source,
    slide?.notes,
    ...(Array.isArray(slide?.bullets) ? slide.bullets : []),
  ]
  if (Array.isArray(slide?.items)) {
    for (const it of slide.items) {
      if (!it || typeof it !== 'object') continue
      parts.push(it.tag, it.title, it.value, it.delta, it.text)
      if (Array.isArray(it.bullets)) parts.push(...it.bullets)
    }
  }
  if (Array.isArray(slide?.rows)) {
    for (const r of slide.rows) {
      if (Array.isArray(r)) parts.push(...r)
    }
  }
  return parts.filter((v) => v !== undefined && v !== null).map((v) => stripInlineMarkdown(String(v))).join(' ')
}

/**
 * SLOP-14 企业品牌宪章与合规禁用词静态门禁（零误报）。
 */
export function auditBrandCompliance(manifest, explicitKit = null) {
  const issues = []
  const kit = explicitKit || manifest?.brandKit || null
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  if (!kit || slides.length === 0) return issues

  const forbidden = Array.isArray(kit.forbiddenTerms) ? kit.forbiddenTerms.filter((t) => typeof t === 'string' && t.trim().length >= 2) : []
  if (forbidden.length > 0) {
    slides.forEach((slide, i) => {
      const hay = collectSlidePlainText(slide)
      if (!hay) return
      const hayLower = hay.toLowerCase()
      const hits = forbidden.filter((term) => hayLower.includes(term.toLowerCase()))
      if (hits.length > 0) {
        issues.push({
          slide: i + 1,
          slideId: slide?.id,
          severity: 'warning',
          code: 'forbidden-brand-term',
          message: `页面命中企业合规禁用词：${hits.map((h) => `「${h}」`).join('、')}（SLOP-14）`,
          suggestion: '请替换为符合企业法务/品牌宪章的审慎表述（如将绝对化用语改为带口径范围的客观描述）',
        })
      }
    })
  }

  if (kit.enforce && kit.brand?.primaryColor && manifest?.brand?.primaryColor) {
    if (String(manifest.brand.primaryColor).toUpperCase() !== String(kit.brand.primaryColor).toUpperCase()) {
      issues.push({
        slide: 1,
        slideId: slides[0]?.id,
        severity: 'warning',
        code: 'brand-palette-drift',
        message: `当前主色 ${manifest.brand.primaryColor} 偏离企业品牌宪章锁定主色 ${kit.brand.primaryColor}（SLOP-14）`,
        suggestion: `请将 brand.primaryColor 恢复为 ${kit.brand.primaryColor} 或显式关闭品牌宪章锁`,
      })
    }
  }

  return issues
}

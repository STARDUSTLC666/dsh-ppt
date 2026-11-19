import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import type { ResolvedPptConfig } from './config.js'
import { attachCitationsToDeck, exportRemotionBundle } from './ecosystem.js'
import type {
  DeckEngine,
  PptAbsorbResult,
  PptCiteArgs,
  PptCiteResult,
  PptCreateArgs,
  PptCreateResult,
  PptRemotionArgs,
  PptRemotionResult,
  PptThemesResult,
} from './types.js'

/** The Harness execution fields used by this plugin; optional for direct callers. */
export interface PptExecution {
  readonly signal?: AbortSignal
  readonly agent?: { readonly session: { readonly header: { readonly cwd?: string }; requestContext?(): any; requestHeader?(): any } }
}

let enginePromise: Promise<DeckEngine> | null = null
export function getEngine(): Promise<DeckEngine> {
  if (enginePromise === null) {
    const engineUrl = new URL('../skills/dsh-ppt/scripts/deck-advanced.mjs', import.meta.url)
    enginePromise = import(engineUrl.href).then((module: Record<string, unknown>) => module as unknown as DeckEngine)
      .catch((error: unknown) => {
        enginePromise = null
        throw error
      })
  }
  return enginePromise
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function resolveImportTarget(rawProjectId: string, cwd: string): { targetProjectDir: string; targetDeckPath?: string } {
  const value = rawProjectId.trim()
  if (/^[0-9a-f]{64}$/.test(value)) {
    const catalogPath = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'plugins', 'dsh-ppt', 'projects.jsonl')
    if (existsSync(catalogPath)) {
      let matchedPath: string | undefined
      for (const line of readFileSync(catalogPath, 'utf8').split('\n')) {
        try {
          const row = JSON.parse(line)
          if (row?.id === value && typeof row?.path === 'string' && row.path.endsWith('.json')) matchedPath = row.path
        } catch { /* ignore malformed trailing line */ }
      }
      if (matchedPath) return { targetProjectDir: dirname(matchedPath), targetDeckPath: matchedPath }
    }
    throw new Error('dsh-ppt：未在工作台索引中找到该 projectId，请传入工程 .json 路径或目录')
  }
  const abs = resolve(cwd, value)
  if (value.toLowerCase().endsWith('.json')) return { targetProjectDir: dirname(abs), targetDeckPath: abs }
  return { targetProjectDir: abs }
}

/** Build executors with a shared engine loader; resolve paths separately for each call. */
export function createPptExecutors(config: ResolvedPptConfig, loadEngine: () => Promise<DeckEngine> = getEngine) {
  return {
    async themes(rawArgs: unknown, exec?: PptExecution): Promise<PptThemesResult> {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs)
      const lang = typeof args.lang === 'string' && args.lang.trim() !== '' ? args.lang.trim() : 'zh'
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      const themes = engine.listThemes(lang)
      if (args.preview === true) {
        const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
        const requested = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? args.outputDir.trim() : config.outputDir || '.'
        const preview = engine.buildThemePreview({
          outputDir: resolve(cwd, requested),
          lang,
          overwrite: args.overwrite === true,
        })
        return { ok: true, themes, preview }
      }
      return { ok: true, themes }
    },
    async create(rawArgs: unknown, exec?: PptExecution) {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs) as unknown as PptCreateArgs
      if (typeof args.title !== 'string' || args.title.trim() === '') throw new Error('dsh-ppt：title 不能为空')
      const hasContent = typeof args.content === 'string' && args.content.trim() !== ''
      const hasSlides = Array.isArray(args.slides) && args.slides.length > 0
      if (!hasContent && !hasSlides && !args.template) throw new Error('dsh-ppt：content 不能为空（或用 slides / template 传结构化幻灯片）')
      const engine = await loadEngine()
      // Check cancellation after loading and before artifact commit inside the async engine.
      exec?.signal?.throwIfAborted()
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      const outputDir = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? args.outputDir.trim() : config.outputDir
      return (engine.buildDeckAsync ?? engine.buildDeck)({
        title: args.title.trim(),
        content: typeof args.content === 'string' ? args.content : '',
        slides: hasSlides ? args.slides : undefined,
        theme: typeof args.theme === 'string' && args.theme.trim() !== '' ? args.theme.trim() : (config.defaultTheme || (typeof engine.absorbPptx === 'function' ? 'auto' : undefined)),
        persona: typeof args.persona === 'string' && args.persona.trim() !== '' ? args.persona.trim() : undefined,
        referencePptx: typeof args.referencePptx === 'string' && args.referencePptx.trim() !== '' ? args.referencePptx.trim() : undefined,
        cloneStructure: typeof args.cloneStructure === 'boolean' ? args.cloneStructure : undefined,
        smartLayout: typeof args.smartLayout === 'boolean' ? args.smartLayout : undefined,
        lang: typeof args.lang === 'string' && args.lang.trim() !== '' ? args.lang.trim() : (config.defaultLang || undefined),
        motion: args.motion,
        outputDir: resolve(cwd, outputDir || '.'),
        fileName: typeof args.fileName === 'string' && args.fileName.trim() !== '' ? args.fileName.trim() : undefined,
        overwrite: args.overwrite === true,
        maxSlides: config.maxSlides,
        template: args.template,
        brand: args.brand,
        ...(typeof args.targetMinutes === 'number' && Number.isFinite(args.targetMinutes) ? { targetMinutes: args.targetMinutes } : {}),
        dataModel: args.dataModel,
        cwd,
        signal: exec?.signal,
      })
    },
    async absorb(rawArgs: unknown, exec?: PptExecution): Promise<PptAbsorbResult> {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs)
      if (typeof args.pptxPath !== 'string' || args.pptxPath.trim() === '') {
        throw new Error('dsh-ppt：pptxPath 不能为空')
      }
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      return engine.absorbPptx({
        pptxPath: args.pptxPath.trim(),
        extractLogo: args.extractLogo !== false,
        cwd,
        signal: exec?.signal,
      })
    },
    async templates(rawArgs: unknown, exec?: PptExecution) {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs)
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      return { ok: true, templates: engine.listTemplates(typeof args.lang === 'string' ? args.lang : config.defaultLang || 'zh') }
    },
    async edit(rawArgs: unknown, exec?: PptExecution) {
      exec?.signal?.throwIfAborted()
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      return engine.editDeck({ ...asRecord(rawArgs), cwd: exec?.agent?.session.header.cwd ?? process.cwd(), signal: exec?.signal })
    },
    async undo(rawArgs: unknown, exec?: PptExecution) {
      exec?.signal?.throwIfAborted()
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      return engine.undoDeck({ ...asRecord(rawArgs), cwd: exec?.agent?.session.header.cwd ?? process.cwd(), signal: exec?.signal })
    },
    async check(rawArgs: unknown, exec?: PptExecution) {
      exec?.signal?.throwIfAborted()
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      return (engine.checkDeckAsync ?? engine.checkDeck)({ ...asRecord(rawArgs), cwd: exec?.agent?.session.header.cwd ?? process.cwd(), signal: exec?.signal })
    },
    async render(rawArgs: unknown, exec?: PptExecution) {
      exec?.signal?.throwIfAborted()
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      return engine.renderDeck({ ...asRecord(rawArgs), cwd: exec?.agent?.session.header.cwd ?? process.cwd(), signal: exec?.signal })
    },
    async data(rawArgs: unknown, exec?: PptExecution) {
      exec?.signal?.throwIfAborted()
      const engine = await loadEngine(), args = asRecord(rawArgs)
      const options = { ...args, cwd:exec?.agent?.session.header.cwd ?? process.cwd(), signal:exec?.signal, allowFiles:true }
      if(args.action === 'preview') return engine.previewDeckData(options)
      if(args.action === 'apply') return engine.updateDeckData(options)
      throw new Error('dsh-ppt：action 需为 preview 或 apply / Use preview or apply')
    },
    async importPptx(rawArgs: unknown, exec?: PptExecution): Promise<PptCreateResult> {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs)
      if (typeof args.pptxPath !== 'string' || args.pptxPath.trim() === '') {
        throw new Error('dsh-ppt：pptxPath 不能为空')
      }
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      const rawOut = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? args.outputDir.trim() : config.outputDir
      const resolvedOut = resolve(cwd, rawOut || '.')
      const target = typeof args.projectId === 'string' && args.projectId.trim() !== ''
        ? resolveImportTarget(args.projectId, cwd)
        : undefined
      return engine.importPptxDeck({
        pptxPath: args.pptxPath.trim(),
        cwd,
        outDir: resolvedOut,
        outputDir: resolvedOut,
        ...(target ? { targetProjectDir: target.targetProjectDir, ...(target.targetDeckPath ? { deckPath: target.targetDeckPath } : {}) } : {}),
        ...(typeof args.projectId === 'string' && args.projectId.trim() !== '' ? { projectId: args.projectId.trim() } : {}),
        theme: typeof args.theme === 'string' && args.theme.trim() !== '' ? args.theme.trim() : (config.defaultTheme || 'auto'),
        persona: typeof args.persona === 'string' && args.persona.trim() !== '' ? args.persona.trim() : 'auto',
        ...(typeof args.chromeStyle === 'string' && args.chromeStyle.trim() !== '' ? { chromeStyle: args.chromeStyle.trim() } : {}),
        modernize: args.modernize !== false,
        preserveSourceTheme: args.preserveSourceTheme === true,
        signal: exec?.signal,
      })
    },
    async fromOffice(rawArgs: unknown, exec?: PptExecution): Promise<PptCreateResult> {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs)
      if (typeof args.filePath !== 'string' || args.filePath.trim() === '') {
        throw new Error('dsh-ppt：filePath 不能为空')
      }
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      if (typeof engine.importOfficeDeck !== 'function') {
        throw new Error('dsh-ppt：当前引擎版本暂不支持导入 Excel / Word 文档')
      }
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      const rawOut = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? args.outputDir.trim() : config.outputDir
      const resolvedOut = resolve(cwd, rawOut || '.')
      return engine.importOfficeDeck({
        filePath: args.filePath.trim(),
        cwd,
        outDir: resolvedOut,
        outputDir: resolvedOut,
        ...(typeof args.fileName === 'string' && args.fileName.trim() !== '' ? { fileName: args.fileName.trim() } : {}),
        theme: typeof args.theme === 'string' && args.theme.trim() !== '' ? args.theme.trim() : (config.defaultTheme || 'auto'),
        persona: typeof args.persona === 'string' && args.persona.trim() !== '' ? args.persona.trim() : 'auto',
        ...(typeof args.chromeStyle === 'string' && args.chromeStyle.trim() !== '' ? { chromeStyle: args.chromeStyle.trim() } : {}),
        ...(typeof args.targetMinutes === 'number' && Number.isFinite(args.targetMinutes) ? { targetMinutes: args.targetMinutes } : {}),
        lang: typeof args.lang === 'string' && args.lang.trim() !== '' ? args.lang.trim() : (config.defaultLang || undefined),
        overwrite: args.overwrite === true,
        signal: exec?.signal,
      })
    },
    async cite(rawArgs: unknown, exec?: PptExecution): Promise<PptCiteResult & { jsonPath?: string }> {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs) as unknown as PptCiteArgs
      if (typeof args.deckPath !== 'string' || args.deckPath.trim() === '') {
        throw new Error('dsh-ppt：deckPath 不能为空')
      }
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      const result = await attachCitationsToDeck({
        ...args,
        deckPath: args.deckPath.trim(),
        cwd,
        signal: exec?.signal,
        engine,
      })
      return {
        ...result,
        ...(result.deck?.jsonPath ? { jsonPath: result.deck.jsonPath } : {}),
      }
    },
    async remotion(rawArgs: unknown, exec?: PptExecution): Promise<PptRemotionResult> {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs) as unknown as PptRemotionArgs
      if (typeof args.deckPath !== 'string' || args.deckPath.trim() === '') {
        throw new Error('dsh-ppt：deckPath 不能为空')
      }
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      return exportRemotionBundle({
        ...args,
        deckPath: args.deckPath.trim(),
        cwd,
        signal: exec?.signal,
        engine,
      })
    },
  }
}

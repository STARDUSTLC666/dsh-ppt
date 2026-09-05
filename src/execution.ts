import { resolve } from 'node:path'
import type { ResolvedPptConfig } from './config.js'
import type { DeckEngine, PptCreateArgs, PptThemesResult } from './types.js'

/** The Harness execution fields used by this plugin; optional for direct callers. */
export interface PptExecution {
  readonly signal?: AbortSignal
  readonly agent?: { readonly session: { readonly header: { readonly cwd?: string } } }
}

let enginePromise: Promise<DeckEngine> | null = null
function getEngine(): Promise<DeckEngine> {
  if (enginePromise === null) {
    const engineUrl = new URL('../skills/dsh-ppt/scripts/deck-core.mjs', import.meta.url)
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

/** Build executors with a shared engine loader; resolve paths separately for each call. */
export function createPptExecutors(config: ResolvedPptConfig, loadEngine: () => Promise<DeckEngine> = getEngine) {
  return {
    async themes(rawArgs: unknown, exec?: PptExecution): Promise<PptThemesResult> {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs)
      const lang = typeof args.lang === 'string' && args.lang.trim() !== '' ? args.lang.trim() : 'zh'
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      return { ok: true, themes: engine.listThemes(lang) }
    },
    async create(rawArgs: unknown, exec?: PptExecution) {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs) as unknown as PptCreateArgs
      if (typeof args.title !== 'string' || args.title.trim() === '') throw new Error('dsh-ppt：title 不能为空')
      const hasContent = typeof args.content === 'string' && args.content.trim() !== ''
      const hasSlides = Array.isArray(args.slides) && args.slides.length > 0
      if (!hasContent && !hasSlides) throw new Error('dsh-ppt：content 不能为空（或用 slides 传结构化幻灯片）')
      const engine = await loadEngine()
      // Loading can yield to cancellation. Rendering/writing then runs synchronously.
      exec?.signal?.throwIfAborted()
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      const outputDir = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? args.outputDir.trim() : config.outputDir
      return engine.buildDeck({
        title: args.title.trim(),
        content: typeof args.content === 'string' ? args.content : '',
        slides: hasSlides ? args.slides : undefined,
        theme: typeof args.theme === 'string' && args.theme.trim() !== '' ? args.theme.trim() : (config.defaultTheme || undefined),
        lang: typeof args.lang === 'string' && args.lang.trim() !== '' ? args.lang.trim() : (config.defaultLang || undefined),
        motion: args.motion,
        outputDir: resolve(cwd, outputDir || '.'),
        fileName: typeof args.fileName === 'string' && args.fileName.trim() !== '' ? args.fileName.trim() : undefined,
        overwrite: args.overwrite === true,
        maxSlides: config.maxSlides,
      })
    },
  }
}

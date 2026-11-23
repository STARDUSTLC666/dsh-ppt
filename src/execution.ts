import { existsSync, readFileSync, statSync } from 'node:fs'
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
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      const tasteRecipes = typeof engine.listAllTasteRecipes === 'function' ? engine.listAllTasteRecipes(cwd) : undefined
      if (args.preview === true) {
        const requested = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? args.outputDir.trim() : config.outputDir || '.'
        const preview = engine.buildThemePreview({
          outputDir: resolve(cwd, requested),
          lang,
          overwrite: args.overwrite === true,
        })
        return { ok: true, themes, ...(tasteRecipes ? { tasteRecipes } : {}), preview }
      }
      return { ok: true, themes, ...(tasteRecipes ? { tasteRecipes } : {}) }
    },
    async create(rawArgs: unknown, exec?: PptExecution) {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs) as unknown as PptCreateArgs
      if (typeof args.title !== 'string' || args.title.trim() === '') throw new Error('dsh-ppt：title 不能为空')
      const hasContent = typeof args.content === 'string' && args.content.trim() !== ''
      const hasSlides = Array.isArray(args.slides) && args.slides.length > 0
      const hasMerge = Array.isArray(args.mergeSources) && args.mergeSources.length > 0
      if (!hasContent && !hasSlides && !args.template && !hasMerge) throw new Error('dsh-ppt：content 不能为空（或用 slides / template / mergeSources 传结构化幻灯片）')
      const engine = await loadEngine()
      // Check cancellation after loading and before artifact commit inside the async engine.
      exec?.signal?.throwIfAborted()
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      const outputDir = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? args.outputDir.trim() : config.outputDir
      return (engine.buildDeckAsync ?? engine.buildDeck)({
        title: args.title.trim(),
        content: typeof args.content === 'string' ? args.content : '',
        slides: hasSlides ? args.slides : undefined,
        ...(hasMerge ? { mergeSources: args.mergeSources } : {}),
        theme: typeof args.theme === 'string' && args.theme.trim() !== '' ? args.theme.trim() : ((args.taste || args.exemplar) ? undefined : (config.defaultTheme || (typeof engine.absorbPptx === 'function' ? 'auto' : undefined))),
        ...(args.taste ? { taste: args.taste } : {}),
        ...(typeof args.exemplar === 'string' && args.exemplar.trim() !== '' ? { exemplar: args.exemplar.trim() } : {}),
        ...(typeof args.alignOrder === 'boolean' ? { alignOrder: args.alignOrder } : {}),
        ...(typeof args.autoUpgrade === 'boolean' ? { autoUpgrade: args.autoUpgrade } : {}),
        persona: typeof args.persona === 'string' && args.persona.trim() !== '' ? args.persona.trim() : undefined,
        referencePptx: typeof args.referencePptx === 'string' && args.referencePptx.trim() !== '' ? args.referencePptx.trim() : undefined,
        cloneStructure: typeof args.cloneStructure === 'boolean' ? args.cloneStructure : undefined,
        smartLayout: typeof args.smartLayout === 'boolean' ? args.smartLayout : undefined,
        lang: typeof args.lang === 'string' && args.lang.trim() !== '' ? args.lang.trim() : (config.defaultLang || undefined),
        motion: args.motion,
        ...(typeof args.motionProfile === 'string' && args.motionProfile.trim() ? { motionProfile: args.motionProfile.trim() } : {}),
        ...(Array.isArray(args.exports) && args.exports.length > 0 ? { exports: args.exports } : {}),
        outputDir: resolve(cwd, outputDir || '.'),
        fileName: typeof args.fileName === 'string' && args.fileName.trim() !== '' ? args.fileName.trim() : undefined,
        overwrite: args.overwrite === true,
        maxSlides: config.maxSlides,
        template: args.template,
        brand: args.brand,
        ...(typeof args.targetMinutes === 'number' && Number.isFinite(args.targetMinutes) ? { targetMinutes: args.targetMinutes } : {}),
        dataModel: args.dataModel,
        ...(Array.isArray(args.evidence) ? { evidence: args.evidence } : {}),
        ...(args.evidenceAppendix === true ? { evidenceAppendix: true } : {}),
        ...(typeof args.useBrandKit === 'boolean' ? { useBrandKit: args.useBrandKit } : {}),
        cwd,
        signal: exec?.signal,
      })
    },
    async absorb(rawArgs: unknown, exec?: PptExecution): Promise<PptAbsorbResult> {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs)
      const explicitCorpusDir = typeof args.corpusDir === 'string' && args.corpusDir.trim() !== '' ? args.corpusDir.trim() : ''
      const pptxPath = typeof args.pptxPath === 'string' && args.pptxPath.trim() !== '' ? args.pptxPath.trim() : ''
      if (!explicitCorpusDir && !pptxPath) {
        throw new Error('dsh-ppt：pptxPath 不能为空（批量吸收目录也可直接传入目录路径或 corpusDir）')
      }
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      let corpusDir = explicitCorpusDir
      if (!corpusDir && pptxPath) {
        const candidate = resolve(cwd, pptxPath)
        try {
          if (existsSync(candidate) && statSync(candidate).isDirectory()) corpusDir = pptxPath
        } catch { /* fall through to single-file absorb */ }
      }
      if (corpusDir) {
        if (typeof engine.ingestExemplarCorpus !== 'function') {
          throw new Error('dsh-ppt：当前引擎版本暂不支持批量吸收目录语料')
        }
        return engine.ingestExemplarCorpus({
          dirPath: corpusDir,
          cwd,
          ...(typeof args.limit === 'number' && Number.isFinite(args.limit) ? { limit: args.limit } : {}),
          signal: exec?.signal,
        })
      }
      return engine.absorbPptx({
        pptxPath,
        extractLogo: args.extractLogo !== false,
        ...(typeof args.saveTasteAs === 'string' && args.saveTasteAs.trim() ? { saveTasteAs: args.saveTasteAs.trim() } : {}),
        ...(typeof args.tasteName === 'string' && args.tasteName.trim() ? { tasteName: args.tasteName.trim() } : {}),
        ...(typeof args.saveExemplarAs === 'string' && args.saveExemplarAs.trim() ? { saveExemplarAs: args.saveExemplarAs.trim() } : {}),
        ...(typeof args.exemplarName === 'string' && args.exemplarName.trim() ? { exemplarName: args.exemplarName.trim() } : {}),
        ...(args.saveBrandKit === true ? { saveBrandKit: true } : {}),
        ...(typeof args.brandKitName === 'string' && args.brandKitName.trim() ? { brandKitName: args.brandKitName.trim() } : {}),
        ...(typeof args.watermark === 'string' && args.watermark.trim() ? { watermark: args.watermark.trim() } : {}),
        ...(Array.isArray(args.forbiddenTerms) ? { forbiddenTerms: args.forbiddenTerms } : {}),
        ...(Array.isArray(args.preferredSources) ? { preferredSources: args.preferredSources } : {}),
        ...(Array.isArray(args.blockedDomains) ? { blockedDomains: args.blockedDomains } : {}),
        cwd,
        signal: exec?.signal,
      })
    },
    async templates(rawArgs: unknown, exec?: PptExecution) {
      exec?.signal?.throwIfAborted()
      const args = asRecord(rawArgs)
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      const lang = typeof args.lang === 'string' && args.lang.trim() ? args.lang.trim() : config.defaultLang || 'zh'
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      const templates = engine.listTemplates(lang)
      const workspaceExemplars = typeof engine.loadWorkspaceExemplars === 'function' ? engine.loadWorkspaceExemplars(cwd) : {}
      const exemplars = typeof engine.listCuratedExemplars === 'function' ? engine.listCuratedExemplars(workspaceExemplars) : undefined
      const exemplarId = typeof args.exemplarId === 'string' ? args.exemplarId.trim() : ''
      const topic = typeof args.topic === 'string' ? args.topic.trim() : ''
      const persona = typeof args.persona === 'string' ? args.persona.trim() : 'auto'
      const artDirector = typeof engine.buildArtDirectorPrompt === 'function'
        ? engine.buildArtDirectorPrompt({ topic, persona, lang })
        : undefined
      if (topic && typeof engine.buildResearchPlan === 'function') {
        const kit = typeof engine.loadWorkspaceBrandKit === 'function' ? engine.loadWorkspaceBrandKit(cwd) : null
        const researchPlan = engine.buildResearchPlan({
          topic,
          persona: typeof args.persona === 'string' ? args.persona.trim() : undefined,
          exemplarId: exemplarId || undefined,
          evidence: Array.isArray(args.evidence) ? args.evidence : undefined,
          lang,
          workspaceExemplars,
          ...(Array.isArray(kit?.preferredSources) ? { preferredSources: kit.preferredSources } : {}),
          ...(Array.isArray(kit?.blockedDomains) ? { blockedDomains: kit.blockedDomains } : {}),
        })
        return {
          ok: true,
          templates,
          ...(exemplars ? { exemplars } : {}),
          ...(artDirector ? { artDirector, directorPrompt: artDirector.directorPrompt } : {}),
          researchPlan,
          planMarkdown: typeof researchPlan.planMarkdown === 'string' ? researchPlan.planMarkdown : '',
          ...(Array.isArray(researchPlan.fewShotSlides) ? { fewShotSlides: researchPlan.fewShotSlides } : {}),
        }
      }
      if (exemplarId && typeof engine.resolveExemplar === 'function') {
        const exemplar = engine.resolveExemplar(exemplarId, workspaceExemplars)
        if (!exemplar) {
          const ids = (exemplars || []).map(item => item.id).join(', ')
          throw new Error('dsh-ppt：未找到标杆范本 ' + exemplarId + (ids ? '（可用：' + ids + '）' : ''))
        }
        const promptGuide = typeof engine.renderExemplarPromptGuide === 'function' ? engine.renderExemplarPromptGuide(exemplar, lang) : ''
        const fewShotSlides = typeof engine.getExemplarFewShotSlides === 'function' ? engine.getExemplarFewShotSlides(exemplar.id, lang) : undefined
        return { ok: true, templates, ...(exemplars ? { exemplars } : {}), ...(artDirector ? { artDirector, directorPrompt: artDirector.directorPrompt } : {}), exemplar, ...(fewShotSlides ? { fewShotSlides } : {}), promptGuide }
      }
      return { ok: true, templates, ...(exemplars ? { exemplars } : {}), ...(artDirector ? { artDirector, directorPrompt: artDirector.directorPrompt } : {}) }
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
      const rawFilePath = typeof args.filePath === 'string' ? args.filePath.trim() : ''
      const rawFilePaths = Array.isArray(args.filePaths)
        ? args.filePaths.map((p) => String(p ?? '').trim()).filter(Boolean)
        : []
      if (!rawFilePath && rawFilePaths.length === 0) {
        throw new Error('dsh-ppt：filePath 不能为空')
      }
      const engine = await loadEngine()
      exec?.signal?.throwIfAborted()
      if (typeof engine.importOfficeDeck !== 'function') {
        throw new Error('dsh-ppt：当前引擎版本暂不支持导入 Excel / Word / PDF 文档')
      }
      const cwd = exec?.agent?.session.header.cwd ?? process.cwd()
      const rawOut = typeof args.outputDir === 'string' && args.outputDir.trim() !== '' ? args.outputDir.trim() : config.outputDir
      const resolvedOut = resolve(cwd, rawOut || '.')
      const mergedPaths = rawFilePaths.length > 0
        ? [...new Set([rawFilePath, ...rawFilePaths].filter(Boolean))]
        : undefined
      return engine.importOfficeDeck({
        filePath: rawFilePath,
        ...(mergedPaths ? { filePaths: mergedPaths } : {}),
        ...(args.inspectOnly === true ? { inspectOnly: true } : {}),
        ...(typeof args.instructions === 'string' && args.instructions.trim() !== '' ? { instructions: args.instructions.trim() } : {}),
        ...(typeof args.maxSlides === 'number' && Number.isInteger(args.maxSlides) ? { maxSlides: args.maxSlides } : {}),
        ...(Array.isArray(args.includeSheets) ? { includeSheets: args.includeSheets } : {}),
        ...(args.photoRoles && typeof args.photoRoles === 'object' && !Array.isArray(args.photoRoles) ? { photoRoles: args.photoRoles } : {}),
        ...(args.bindDataModel === true ? { bindDataModel: true } : {}),
        ...(Array.isArray(args.evidence) ? { evidence: args.evidence } : {}),
        ...(Array.isArray(args.exports) && args.exports.length > 0 ? { exports: args.exports } : {}),
        ...(typeof args.motionProfile === 'string' && args.motionProfile.trim() ? { motionProfile: args.motionProfile.trim() } : {}),
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

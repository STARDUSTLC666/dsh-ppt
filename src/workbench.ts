/** Operator-only workbench. Paths come from successful tools, never browser input. */
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { getEngine, type PptExecution } from './execution.js'
import type { DeckEngine } from './types.js'

export const PPT_WORKBENCH_ROUTE = '/api/dsh-ppt/workbench'
export const PPT_DOWNLOAD_ROUTE = '/api/dsh-ppt/download'
const REQUEST_LIMIT = 12 * 1024 * 1024
const FILE_LIMIT = 64 * 1024 * 1024
type Project = { id: string; path: string; title: string; updatedAt: string }
type Render = { revision: number; pngPaths: string[]; pngHashes: string[]; missingFonts?: string[]; sourceSha256: string }
type WorkbenchEngine = DeckEngine & { readDeckProject(options: Record<string, unknown>): { manifest: any; path: string } }
type Options = { catalogPath?: string; loadEngine?: () => Promise<WorkbenchEngine> }
const digest = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex')

function ordinaryFile(path: string): Buffer {
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > FILE_LIMIT) throw new Error('文件不是普通文件或超过 64 MiB')
  return readFileSync(path)
}
function pathsFor(path: string) { const base = path.slice(0, -5); return { json: path, html: base + '.html', pptx: base + '.pptx' } }
function json(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}
function fail(status: number, message: string): Response { return json(status, { ok: false, message }) }
function originVerdict(request: Request): Response | undefined {
  const site = request.headers.get('sec-fetch-site'), origin = request.headers.get('origin')
  if (site && !['same-origin', 'none'].includes(site)) return fail(403, '拒绝跨站操作')
  if (origin && /^https?:/i.test(origin)) {
    try { if (new URL(origin).host !== (request.headers.get('host') || new URL(request.url).host)) return fail(403, '拒绝跨源操作') } catch { return fail(403, '无效来源') }
  }
}

export class PptWorkbench {
  readonly catalogPath: string
  private readonly loadEngine: () => Promise<WorkbenchEngine>
  private readonly renders = new Map<string, Render>()
  constructor(options: Options = {}) {
    this.catalogPath = options.catalogPath ?? join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'plugins', 'dsh-ppt', 'projects.jsonl')
    this.loadEngine = options.loadEngine ?? (getEngine as () => Promise<WorkbenchEngine>)
  }
  private catalog(): Project[] {
    if (!existsSync(this.catalogPath)) return []
    if (lstatSync(this.catalogPath).size > 8 * 1024 * 1024) throw new Error('项目索引超过 8 MiB，请备份后整理 projects.jsonl')
    const rows = new Map<string, Project>()
    for (const line of readFileSync(this.catalogPath, 'utf8').split('\n')) {
      try {
        const row = JSON.parse(line)
        if (typeof row.path === 'string' && row.path.endsWith('.json') && row.id === digest(row.path) && typeof row.title === 'string' && typeof row.updatedAt === 'string') { rows.delete(row.id); rows.set(row.id, row) }
      } catch { /* A crash may leave an incomplete last append; keep older rows. */ }
    }
    return [...rows.values()].reverse().slice(0, 100)
  }
  /** Recording a completed tool never turns a successful generation into an error. */
  async remember(result: any, args: unknown, exec?: PptExecution): Promise<void> {
    const file = result?.jsonPath ?? result?.deckPath
    if (typeof file !== 'string') return
    exec?.signal?.throwIfAborted()
    const path = realpathSync(resolve(exec?.agent?.session.header.cwd ?? process.cwd(), file))
    ordinaryFile(path)
    const engine = await this.loadEngine()
    const { manifest } = engine.readDeckProject({ deckPath: path })
    // Versioned generator projects only; arbitrary JSON and externally edited PPTX cannot enter.
    if (manifest.schemaVersion !== 1 || typeof manifest.deckId !== 'string' || manifest.slides.some((s: any) => typeof s.id !== 'string')) return
    const row = { id: digest(path), path, title: manifest.title, updatedAt: new Date().toISOString() }
    mkdirSync(dirname(this.catalogPath), { recursive: true })
    if (existsSync(this.catalogPath) && lstatSync(this.catalogPath).size >= 8 * 1024 * 1024) throw new Error('项目索引已满，请备份后整理 projects.jsonl')
    appendFileSync(this.catalogPath, JSON.stringify(row) + '\n')
  }
  private async project(id: unknown) {
    if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) throw new Error('请选择已有项目')
    const entry = this.catalog().find(row => row.id === id)
    if (!entry) throw new Error('项目不在本机索引中，请先在对话中创建或检查演示文稿')
    if (realpathSync(entry.path) !== entry.path) throw new Error('项目位置已改变，请在对话中重新检查')
    ordinaryFile(entry.path)
    const engine = await this.loadEngine()
    const { manifest } = engine.readDeckProject({ deckPath: entry.path })
    return { entry, engine, manifest, files: pathsFor(entry.path) }
  }
  private async view(id: unknown) {
    const { entry, engine, manifest, files } = await this.project(id)
    const check = engine.checkDeck({ deckPath: entry.path })
    let html = ''
    try { html = ordinaryFile(files.html).toString('utf8') } catch { /* A check can register an older JSON-only project. */ }
    const render = this.renders.get(entry.id)
    const currentRender = render && render.revision === manifest.revision && digest(ordinaryFile(files.pptx)) === render.sourceSha256 ? render : undefined
    return { ok: true, project: { ...entry, deckId: manifest.deckId, revision: manifest.revision, slides: manifest.slides,
      undoAvailable: manifest.history.length, quality: check, html,
      assets: Object.fromEntries(Object.entries(manifest.assets ?? {}).map(([key, value]: [string, any]) => [key, { data: value.data, mime: value.mime }])),
      render: currentRender ? { pageCount: currentRender.pngPaths.length, missingFonts: currentRender.missingFonts ?? [] } : null } }
  }
  private revision(body: Record<string, unknown>, manifest: any) {
    if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision !== manifest.revision) throw new Error('项目已被修改，请重新打开后再编辑；当前输入保留')
  }
  private patch(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('修改内容无效')
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) {
      if (['title', 'subtitle', 'kicker', 'text', 'notes'].includes(key)) {
        if (typeof item !== 'string' || item.length > 8000) throw new Error('文字字段过长或无效')
      } else if (key === 'bullets') {
        if (!Array.isArray(item) || item.length > 50 || item.some(v => typeof v !== 'string' || v.length > 2000)) throw new Error('要点内容无效')
      } else if (key === 'image') {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('请选择 PNG 或 JPEG 图片')
        const image = item as Record<string, unknown>
        if (Object.keys(image).some(k => !['src', 'alt', 'fit', 'caption'].includes(k)) || typeof image.src !== 'string' || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(image.src)) throw new Error('图片必须从面板上传，不能读取其他本地文件')
        if (['alt', 'caption'].some(k => image[k] !== undefined && (typeof image[k] !== 'string' || (image[k] as string).length > 2000)) || (image.fit !== undefined && !['contain', 'cover'].includes(String(image.fit)))) throw new Error('图片说明或适应方式无效')
      } else throw new Error('面板不支持修改此字段：' + key)
      result[key] = item
    }
    return result
  }
  async action(body: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
    signal?.throwIfAborted()
    if (body.operation === 'list') return { ok: true, projects: this.catalog() }
    if (body.operation === 'open') return this.view(body.id)
    const { entry, engine, manifest, files } = await this.project(body.id)
    signal?.throwIfAborted()
    if (body.operation === 'download') {
      if (!['html', 'pptx', 'json'].includes(String(body.kind))) throw new Error('不支持此文件类型')
      const path = files[body.kind as keyof typeof files]
      return { ok: true, name: basename(path), data: ordinaryFile(path).toString('base64') }
    }
    if (body.operation === 'page') {
      const render = this.renders.get(entry.id)
      if (!render || render.revision !== manifest.revision || digest(ordinaryFile(files.pptx)) !== render.sourceSha256) throw new Error('请先渲染当前版本的 PPTX')
      if (!Number.isSafeInteger(body.page) || Number(body.page) < 1 || Number(body.page) > render.pngPaths.length) throw new Error('页码无效')
      const bytes = ordinaryFile(render.pngPaths[Number(body.page) - 1])
      if (digest(bytes) !== render.pngHashes[Number(body.page) - 1]) throw new Error('渲染图片已变化，请重新渲染当前 PPTX')
      return { ok: true, data: 'data:image/png;base64,' + bytes.toString('base64') }
    }
    this.revision(body, manifest)
    if (body.operation === 'render') {
      const result = await engine.renderDeck({ pptxPath: files.pptx, format: 'png', signal })
      if (result.ok) this.renders.set(entry.id, { revision: manifest.revision, pngPaths: result.pngPaths ?? [], pngHashes: (result.pngPaths ?? []).map(path => digest(ordinaryFile(path))), missingFonts: result.missingFonts, sourceSha256: result.sourceSha256! })
      const view = await this.view(entry.id)
      if (result.ok && !view.project.render) throw new Error('项目已被修改，请重新渲染')
      return { ...result, project: view.project }
    }
    if (body.operation === 'edit') {
      if (body.slide !== undefined && (typeof body.slide !== 'string' || !manifest.slides.some((s: any) => s.id === body.slide))) throw new Error('页面不存在')
      const args = { deckPath: entry.path, expectedRevision: body.expectedRevision, signal,
        ...(body.slide === undefined ? {} : { edits: [{ slide: body.slide, patch: this.patch(body.patch) }] }),
        ...(body.order === undefined ? {} : { order: body.order }) }
      const result = await engine.editDeck(args)
      await this.remember(result, args)
      return { ...await this.view(entry.id), changed: (result as any).changed }
    }
    if (body.operation === 'undo') {
      await engine.undoDeck({ deckPath: entry.path, expectedRevision: body.expectedRevision, signal })
      return this.view(entry.id)
    }
    throw new Error('不支持此操作')
  }
  async fetchDownload(request: Request): Promise<Response> {
    if (request.method !== 'GET') return fail(405, '请使用 GET')
    const denied = originVerdict(request)
    if (denied) return denied
    try {
      const params = new URL(request.url).searchParams, kind = params.get('kind')
      if (!['html', 'pptx', 'json'].includes(String(kind))) return fail(400, '不支持此文件类型')
      const { entry, manifest, files } = await this.project(params.get('id'))
      if (String(manifest.revision) !== params.get('revision')) return fail(409, '项目已被修改，请重新打开后下载')
      request.signal.throwIfAborted()
      const path = files[kind as keyof typeof files], bytes = ordinaryFile(path)
      if ((await this.project(entry.id)).manifest.revision !== manifest.revision) return fail(409, '项目已被修改，请重新打开后下载')
      const type = kind === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : kind === 'html' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8'
      return new Response(new Uint8Array(bytes), { headers: {
        'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
        'content-disposition': `attachment; filename="presentation.${kind}"; filename*=UTF-8''${encodeURIComponent(basename(path))}`,
      } })
    } catch (error) { return fail(400, error instanceof Error ? error.message : String(error)) }
  }
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return fail(405, '请使用 POST')
    if (request.headers.get('x-dsh-ppt-action') !== '1' || request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail(403, '请从演示文稿面板操作')
    const denied = originVerdict(request)
    if (denied) return denied
    try {
      const reader = request.body?.getReader()
      if (!reader) return fail(400, '缺少请求内容')
      let size = 0; const chunks: Uint8Array[] = []
      try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > REQUEST_LIMIT) { await reader.cancel(); return fail(413, '图片或请求超过 12 MiB，请压缩后重试') } chunks.push(value) } } finally { reader.releaseLock() }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, '请求必须是对象')
      return json(200, await this.action(body, request.signal))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return fail(/修订号冲突|已被修改|正在被另一次|其他操作修改/.test(message) ? 409 : 400, message)
    }
  }
}

export function installPptWorkbench(ctx: any, workbench: PptWorkbench): void {
  ctx.inject?.(['connection'], (host: any) => {
    host.connection?.fetch?.register({ path: PPT_WORKBENCH_ROUTE, methods: ['POST'], requestBody: 'buffered', fetch: (request: Request) => workbench.fetch(request) })
    host.connection?.fetch?.register({ path: PPT_DOWNLOAD_ROUTE, methods: ['GET'], requestBody: 'buffered', fetch: (request: Request) => workbench.fetchDownload(request) })
  })
}

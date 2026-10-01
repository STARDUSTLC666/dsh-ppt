#! /usr/bin/env node
/**
 * build-deck.mjs —— dsh-ppt 的跨 harness 裸 CLI。
 *
 * DSH 插件内请优先使用 ppt_create 工具；把 skills/dsh-ppt 目录复制到
 * Claude Code / Cursor / Gemini CLI / Codex 等 agent 时，用本脚本生成三件套。
 *
 * 示例：
 *   node build-deck.mjs --title "产品发布" --content "deck.md" --theme data --lang zh --out dist/deck
 *   node build-deck.mjs --title "Pitch" --content "一句话介绍我们的产品。" --theme velvet --lang bilingual
 *   node build-deck.mjs --list-themes
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import { listThemes, THEME_IDS, DEFAULT_THEME } from './deck-core.mjs'
import { buildDeckAsync, listTemplates, editDeck, undoDeck, checkDeckAsync, renderDeck } from './deck-advanced.mjs'

const HELP = `dsh-ppt —— 一句话 / 一篇文档 → HTML 放映 + PPTX 导出

用法：
  node build-deck.mjs --title <标题> --content <Markdown 或文件路径> [选项]

选项：
  --title <text>      演示文稿标题（必填）
  --content <text|@path>  Markdown 正文；或文件路径（自动读取）；或 @- 从 stdin 读
  --slides <json>     结构化 slides JSON（可选，与 --content 二选一）
  --template <id>    weekly / defense / project / pitch；仅模板会生成草稿
  --brand <json|@path> 品牌颜色、字体、Logo、页脚
  --edit <deck.json> 修改指定页，配合 --edits <json|@path>
  --undo <deck.json> 撤销最近一次修改
  --check <deck.json> 查看质量报告和页码 / ID
  --render <deck.pptx> 用可选官方引擎生成逐页 PNG / PDF
  --format <png|pdf|both> 渲染格式，默认 png
  --width <n>        PNG 目标宽度，默认 1440
  --timeout <ms>     渲染整体期限，默认 120000 毫秒
  --render-receipt <path> 配合 --check 核验当前渲染收据
  --revision <n>     编辑 / 撤销预期修订号，防止覆盖他人修改
  --list-templates  列出场景结构参考
  --theme <id>        视觉主题：${THEME_IDS.join(' / ')}（默认 ${DEFAULT_THEME}）
  --lang <id>         界面语言：zh / en / bilingual（默认 zh）
  --motion <on|off>   页间转场与要点入场动画（默认 on；off 产出纯静态）
  --out <dir>         输出目录（默认当前目录）
  --file <name>       文件名前缀（默认取标题）
  --overwrite         显式覆盖同名三件套（默认自动追加 -1/-2…）
  --list-themes       列出内置主题
  --help              显示本帮助

输出：
  <file>.html   独立网页放映（无外链，可直接双击打开）
  <file>.pptx   可编辑 PPTX（16:9）
  <file>.json   deck manifest
`

export function parseArgv(argv) {
  const args = { content: '', slides: null, lang: 'zh', theme: undefined, motion: undefined, out: '.', file: '', title: '', overwrite: false }
  const positional = []
  for (let i = 0; i < argv.length; i += 1) {
    const raw = String(argv[i])
    const eq = raw.indexOf('=')
    const key = eq >= 0 ? raw.slice(0, eq) : raw
    const inline = eq >= 0 ? raw.slice(eq + 1) : null
    const nextValue = () => {
      if (inline !== null) return inline
      if (i + 1 >= argv.length) throw new Error('dsh-ppt CLI：' + key + ' 需要一个值')
      i += 1
      return String(argv[i])
    }
    if (key === '--help' || key === '-h') args.help = true
    else if (key === '--list-themes') args.listThemes = true
    else if (key === '--list-templates') args.listTemplates = true
    else if (key === '--overwrite') args.overwrite = true
    else if (key === '--title') args.title = nextValue()
    else if (key === '--content') args.content = nextValue()
    else if (key === '--slides') args.slides = readJson(nextValue())
    else if (key === '--template') args.template = nextValue()
    else if (key === '--brand') args.brand = readJson(nextValue())
    else if (key === '--edit') args.edit = nextValue()
    else if (key === '--edits') args.edits = readJson(nextValue())
    else if (key === '--undo') args.undo = nextValue()
    else if (key === '--check') args.check = nextValue()
    else if (key === '--render') args.render = nextValue()
    else if (key === '--format') args.format = nextValue()
    else if (key === '--width') args.width = Number(nextValue())
    else if (key === '--timeout') args.timeoutMs = Number(nextValue())
    else if (key === '--render-receipt') args.renderReceipt = nextValue()
    else if (key === '--revision') args.revision = Number(nextValue())
    else if (key === '--theme') args.theme = nextValue()
    else if (key === '--lang') args.lang = nextValue()
    else if (key === '--motion') args.motion = nextValue()
    else if (key === '--out') { args.out = nextValue(); args.explicitOut = true }
    else if (key === '--file') args.file = nextValue()
    else positional.push(raw)
  }
  args.positional = positional
  return args
}

function readJson(value) { return JSON.parse(value.startsWith('@') ? readFileSync(resolvePath(value.slice(1)), 'utf8') : value) }

async function readStdin(stream) {
  let text = ''
  stream.setEncoding('utf8')
  for await (const chunk of stream) text += chunk
  return text
}

export async function main(argv = process.argv.slice(2), io = {}) {
  const log = io.log ?? ((message) => console.log(message))
  const args = parseArgv(argv)

  if (args.help) {
    log(HELP.trim())
    return 0
  }
  if (args.listThemes) {
    for (const theme of listThemes('zh')) {
      log('- ' + theme.id.padEnd(8) + theme.name + '｜' + theme.mood + '｜适合：' + theme.bestFor)
    }
    return 0
  }
  if (args.listTemplates) { log(JSON.stringify({ templates: listTemplates(args.lang) }, null, 2)); return 0 }
  if ([args.edit, args.undo, args.check, args.render].filter(Boolean).length > 1) throw new Error('dsh-ppt CLI：--edit / --undo / --check / --render 只能选择一项')
  if (args.renderReceipt !== undefined && !args.check) throw new Error('dsh-ppt CLI：--render-receipt 需配合 --check')
  if (!args.render && [args.format, args.width, args.timeoutMs].some(v => v !== undefined)) throw new Error('dsh-ppt CLI：--format / --width / --timeout 需配合 --render')
  if (args.check) {
    const report = await checkDeckAsync({ deckPath: args.check, renderReceipt: args.renderReceipt })
    log(JSON.stringify(report, null, 2)); return report.ok && (args.renderReceipt === undefined || report.render?.status === 'rendered') ? 0 : 1
  }
  if (args.render) {
    const rendered = await (io.renderDeck ?? renderDeck)({ pptxPath: args.render, ...(args.explicitOut ? { outputDir: args.out } : {}), format: args.format, width: args.width, timeoutMs: args.timeoutMs })
    log(JSON.stringify(rendered, null, 2)); return rendered.ok ? 0 : 1
  }
  if (args.edit || args.undo) {
    const result = args.edit ? await editDeck({ deckPath: args.edit, edits: args.edits, brand: args.brand, expectedRevision: args.revision })
      : await undoDeck({ deckPath: args.undo, expectedRevision: args.revision })
    log(JSON.stringify(result, null, 2)); return 0
  }

  let content = String(args.content ?? '')
  let slides = args.slides
  if (content === '@-') {
    content = await readStdin(io.stdin ?? process.stdin)
  } else if (content.startsWith('@')) {
    content = readFileSync(resolvePath(content.slice(1)), 'utf8')
  } else if (content.trim() !== '' && existsSync(resolvePath(content.trim()))) {
    // README / SKILL.md 的示例直接传文件路径（不带 @）时也按文件读取
    content = readFileSync(resolvePath(content.trim()), 'utf8')
  } else if (content.trim() === '' && slides === null && !args.template) {
    throw new Error('dsh-ppt CLI：--content 不能为空（或用 --slides 传结构化幻灯片）')
  }

  const options = {
    title: args.title,
    content,
    slides,
    theme: args.theme,
    lang: args.lang,
    motion: args.motion,
    outputDir: resolvePath(args.out || '.'),
    fileName: args.file,
    overwrite: args.overwrite,
    template: args.template,
    brand: args.brand,
  }
  const result = await buildDeckAsync(options)
  log('dsh-ppt 已生成 ' + result.slideCount + ' 页演示文稿：')
  log('  HTML 放映：' + result.htmlPath)
  log('  PPTX 导出：' + result.pptxPath)
  log('  Manifest ：' + result.jsonPath)
  if (result.deliveryStatus === 'draft') log('  草稿：还有待填写内容，不可作为成品交付。')
  log('  质量检查：' + result.quality.errorCount + ' 个错误 / ' + result.quality.warningCount + ' 个提醒；修订号 ' + result.revision)
  return 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then((code) => {
    process.exitCode = code ?? 0
  }).catch((err) => {
    console.error('[dsh-ppt] ' + (err instanceof Error ? err.message : String(err)))
    process.exitCode = 1
  })
}

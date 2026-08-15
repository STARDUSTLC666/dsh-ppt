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

import { readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildDeck, listThemes, THEME_IDS, DEFAULT_THEME } from './deck-core.mjs'

const HELP = `dsh-ppt v0.1.0 —— 一句话 / 一篇文档 → HTML 放映 + PPTX 导出

用法：
  node build-deck.mjs --title <标题> --content <Markdown 或文件路径> [选项]

选项：
  --title <text>      演示文稿标题（必填）
  --content <text|@path>  Markdown 正文；或文件路径（自动读取）；或 @- 从 stdin 读
  --slides <json>     结构化 slides JSON（可选，与 --content 二选一）
  --theme <id>        视觉主题：${THEME_IDS.join(' / ')}（默认 ${DEFAULT_THEME}）
  --lang <id>         界面语言：zh / en / bilingual（默认 zh）
  --out <dir>         输出目录（默认当前目录）
  --file <name>       文件名前缀（默认取标题）
  --list-themes       列出内置主题
  --help              显示本帮助

输出：
  <file>.html   独立网页放映（无外链，可直接双击打开）
  <file>.pptx   可编辑 PPTX（16:9）
  <file>.json   deck manifest
`

export function parseArgv(argv) {
  const args = { content: '', slides: null, lang: 'zh', theme: DEFAULT_THEME, out: '.', file: '', title: '' }
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
    else if (key === '--title') args.title = nextValue()
    else if (key === '--content') args.content = nextValue()
    else if (key === '--slides') args.slides = JSON.parse(nextValue())
    else if (key === '--theme') args.theme = nextValue()
    else if (key === '--lang') args.lang = nextValue()
    else if (key === '--out') args.out = nextValue()
    else if (key === '--file') args.file = nextValue()
    else positional.push(raw)
  }
  args.positional = positional
  return args
}

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

  let content = String(args.content ?? '')
  let slides = args.slides
  if (content === '@-') {
    content = await readStdin(io.stdin ?? process.stdin)
  } else if (content.startsWith('@')) {
    content = readFileSync(resolvePath(content.slice(1)), 'utf8')
  } else if (content.trim() === '' && slides === null) {
    throw new Error('dsh-ppt CLI：--content 不能为空（或用 --slides 传结构化幻灯片）')
  }

  const options = {
    title: args.title,
    content,
    slides,
    theme: args.theme,
    lang: args.lang,
    outputDir: resolvePath(args.out || '.'),
    fileName: args.file,
  }
  const result = buildDeck(options)
  log('dsh-ppt 已生成 ' + result.slideCount + ' 页演示文稿：')
  log('  HTML 放映：' + result.htmlPath)
  log('  PPTX 导出：' + result.pptxPath)
  log('  Manifest ：' + result.jsonPath)
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

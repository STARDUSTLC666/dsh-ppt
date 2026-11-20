#! /usr/bin/env node
/**
 * build-deck.mjs —— dsh-ppt 的跨 harness 裸 CLI。
 *
 * DSH 插件内请优先使用 ppt_create 工具；把 skills/dsh-ppt 目录复制到
 * Claude Code / Cursor / Gemini CLI / Codex 等 agent 时，用本脚本生成三件套。
 *
 * 示例：
 *   node build-deck.mjs --title "Q3 经营复盘" --content "deck.md" --theme auto --lang zh --out dist/deck
 *   node build-deck.mjs --title "年度工作汇报" --content "deck.md" --reference-pptx "corp-template.pptx"
 *   node build-deck.mjs --absorb "corp-template.pptx"
 *   node build-deck.mjs --list-themes
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { pathToFileURL } from 'node:url'
import { listThemes, THEME_IDS, DEFAULT_THEME } from './deck-themes.mjs'
import { CHROME_STYLE_IDS } from './deck-absorb.mjs'
import { buildDeckAsync, listTemplates, editDeck, undoDeck, checkDeckAsync, renderDeck, absorbPptx, importPptxDeck, importOfficeDeck, listAllTasteRecipes, listCuratedExemplars, loadWorkspaceExemplars, ingestExemplarCorpus } from './deck-advanced.mjs'

const HELP = `dsh-ppt —— 一句话 / 一篇文档 → HTML 放映 + PPTX 导出

用法：
  node build-deck.mjs --title <标题> --content <Markdown 或文件路径> [选项]

选项：
  --title <text>          演示文稿标题（必填）
  --content <text|@path>  Markdown 正文；或文件路径（自动读取）；或 @- 从 stdin 读
  --slides <json>         结构化 slides JSON（可选，与 --content 二选一）
  --template <id>         20 套行业结构蓝图 ID（可用 --list-templates 查看全部）
  --persona <id>          auto / consulting / tech-pitch / academic / gov-exec / education / editorial
  --reference-pptx <path> 只读吸收本地参考 .pptx 的净化双色板、双字体、封面反白、母版 Logo 与骨架
  --clone-structure       配合 --reference-pptx 使用，克隆参考文稿的逐页版式骨架与母版 chrome
  --chrome <style>        母版骨架风格：${CHROME_STYLE_IDS.join(' / ')}
  --taste <id>            大师审美配方 ID（mckinsey-partner / apple-keynote-dark / apple-keynote-light / swiss-editorial / linear-craft / ft-data-journal / nature-academic / oriental-zen 或已吸收自定义 ID）
  --exemplar <id>         标杆范本槽位契约 ID（8 套内置满分范本或 .dsh-ppt/exemplars.json 已吸收范本，锁定叙事节奏与版式升维）
  --list-exemplars        列出内置 8 套满分标杆范本及工作区已吸收的标杆 .pptx 范本
  --ingest-exemplars <dir> 批量吸收目录下所有优质 .pptx 语料并持久化至 .dsh-ppt/exemplars.json 与 taste-recipes.json
  --save-exemplar <id>    配合 --absorb 将单份标杆 .pptx 同步保存为可复用范本契约
  --no-auto-upgrade       关闭弱模型自动兜底升维与反文字墙拆分
  --save-taste <id>       配合 --absorb 将标杆 .pptx 深度提炼并保存为可复用品味配方
  --list-tastes           列出内置 8 套大师审美配方及当前工作区已吸收的标杆配方
  --absorb <deck.pptx>    只读检查并输出参考 .pptx 的净化主题、推荐内置主题/骨架、深度审美配方 styleRecipe 与逐页分布 JSON
  --import-pptx <path>    导入外部 .pptx 全量内容（标题/要点/表格/图表/图片/备注）并一键翻新为 dsh-ppt 工程
  --from-office <path>    直吞 .xlsx / .csv / .tsv / .docx 数据表或 Word 报告，自动画像并生成全套文稿
  --sync-pptx <path>      将 Office 修改后的 .pptx 内容回导同步至已有工程（自动写入 .history/ 支持撤销）
  --target-project <dir>  配合 --sync-pptx 指定目标工程目录（或传 --edit <deck.json>）
  --preserve-theme        配合 --import-pptx 使用，保留原 .pptx 净化后的品牌配色与 Logo
  --no-modernize          配合 --import-pptx/--sync-pptx 关闭自动版式升维
  --handout               同时生成 <file>.handout.md 演讲者讲义与逐字稿文件
  --one-pager             同时生成 <file>.onepager.html 高管一页纸战报（默认不额外写盘，可在检查面板离线导出）
  --target-minutes <n>    指定演讲目标总时长（分钟），计算逐页配速预算并标记超预算页
  --smart-layout          显式开启多版式叙事节奏自动升维（配合 --no-smart-layout 可关闭）
  --brand <json|@path>    品牌主辅颜色、标题/正文字体、封面反白、Logo、页脚、chromeStyle
  --data-model <json|@path> 可选数字来源、公式与推演假设；配合 --slides
  --edit <deck.json>      修改指定页或整套换肤，配合 --edits / --theme / --reference-pptx / --brand / --target-minutes
  --edits <json|@path>    页面修改指令数组
  --undo <deck.json>      撤销最近一次修改
  --check <deck.json>     查看质量报告和页码 / ID
  --render <deck.pptx>    用可选官方引擎生成逐页 PNG / PDF
  --format <png|pdf|both> 渲染格式，默认 png
  --width <n>             PNG 目标宽度，默认 1440
  --timeout <ms>          渲染整体期限，默认 120000 毫秒
  --render-receipt <path> 配合 --check 核验当前渲染收据
  --revision <n>          编辑 / 撤销预期修订号，防止覆盖他人修改
  --list-templates        列出 20 套行业结构蓝图
  --theme <id>            视觉主题：auto / ${THEME_IDS.join(' / ')}（裸 CLI 缺省为 ${DEFAULT_THEME}，推荐显式传 auto）
  --lang <id>             界面语言：zh / en / bilingual（默认 zh）
  --motion <on|off>       页间转场与要点入场动画（默认 on；off 产出纯静态）
  --out <dir>             输出目录（默认当前目录）
  --file <name>           文件名前缀（默认取标题）
  --overwrite             显式覆盖同名三件套（默认自动追加 -1/-2…）
  --list-themes           列出内置主题
  --help                  显示本帮助

输出：
  <file>.html          独立网页放映（无外链，支持按 P 启动双屏演讲者提词台、按 L 开启虚拟激光笔）
  <file>.pptx          可编辑 PPTX（16:9）
  <file>.json          deck manifest
  <file>.handout.md    演讲者讲义（传 --handout 时同步落盘，HTML 检查面板随时可下载）
  <file>.onepager.html 高管一页纸战报（传 --one-pager 时同步落盘，HTML 检查面板随时可下载）
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
    else if (key === '--list-tastes') args.listTastes = true
    else if (key === '--list-exemplars') args.listExemplars = true
    else if (key === '--exemplar') args.exemplar = nextValue()
    else if (key === '--ingest-exemplars') args.ingestExemplars = nextValue()
    else if (key === '--save-exemplar') args.saveExemplar = nextValue()
    else if (key === '--no-auto-upgrade') args.autoUpgrade = false
    else if (key === '--overwrite') args.overwrite = true
    else if (key === '--smart-layout') args.smartLayout = true
    else if (key === '--no-smart-layout') args.smartLayout = false
    else if (key === '--clone-structure') args.cloneStructure = true
    else if (key === '--chrome') args.chrome = nextValue()
    else if (key === '--taste') args.taste = nextValue()
    else if (key === '--save-taste') args.saveTaste = nextValue()
    else if (key === '--title') args.title = nextValue()
    else if (key === '--content') args.content = nextValue()
    else if (key === '--slides') args.slides = readJson(nextValue())
    else if (key === '--template') args.template = nextValue()
    else if (key === '--persona') args.persona = nextValue()
    else if (key === '--reference-pptx') args.referencePptx = nextValue()
    else if (key === '--absorb') args.absorb = nextValue()
    else if (key === '--import-pptx') args.importPptx = nextValue()
    else if (key === '--from-office') args.fromOffice = nextValue()
    else if (key === '--sync-pptx') args.syncPptx = nextValue()
    else if (key === '--target-project') args.targetProject = nextValue()
    else if (key === '--preserve-theme') args.preserveTheme = true
    else if (key === '--no-modernize') args.modernize = false
    else if (key === '--handout') args.handout = true
    else if (key === '--one-pager') args.onePager = true
    else if (key === '--target-minutes') args.targetMinutes = Number(nextValue())
    else if (key === '--brand') args.brand = readJson(nextValue())
    else if (key === '--data-model') args.dataModel = readJson(nextValue())
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
      log('- ' + theme.id.padEnd(18) + theme.name + '｜' + theme.mood + '｜适合：' + theme.bestFor)
    }
    return 0
  }
  if (args.listTemplates) { log(JSON.stringify({ templates: listTemplates(args.lang) }, null, 2)); return 0 }
  if (args.listTastes) { log(JSON.stringify({ tasteRecipes: listAllTasteRecipes(process.cwd()) }, null, 2)); return 0 }
  if (args.listExemplars) { log(JSON.stringify({ exemplars: listCuratedExemplars(loadWorkspaceExemplars(process.cwd())) }, null, 2)); return 0 }
  if (args.ingestExemplars) {
    const report = await ingestExemplarCorpus({ dirPath: args.ingestExemplars, cwd: process.cwd() })
    log(JSON.stringify(report, null, 2))
    return 0
  }
  if ([args.edit && !args.syncPptx ? args.edit : null, args.undo, args.check, args.render, args.absorb, args.importPptx, args.syncPptx, args.fromOffice].filter(Boolean).length > 1) {
    throw new Error('dsh-ppt CLI：--edit / --undo / --check / --render / --absorb / --import-pptx / --sync-pptx / --from-office 只能选择一项')
  }
  if (args.renderReceipt !== undefined && !args.check) throw new Error('dsh-ppt CLI：--render-receipt 需配合 --check')
  if (!args.render && [args.format, args.width, args.timeoutMs].some(v => v !== undefined)) throw new Error('dsh-ppt CLI：--format / --width / --timeout 需配合 --render')
  if (args.fromOffice) {
    const imported = await importOfficeDeck({
      filePath: args.fromOffice,
      outDir: resolvePath(args.out || '.'),
      outputDir: resolvePath(args.out || '.'),
      ...(args.title ? { title: args.title } : {}),
      ...(args.file ? { fileName: args.file } : {}),
      ...(args.theme ? { theme: args.theme } : {}),
      ...(args.persona ? { persona: args.persona } : {}),
      ...(args.chrome ? { chromeStyle: args.chrome } : {}),
      ...(args.lang ? { lang: args.lang } : {}),
      ...(args.motion ? { motion: args.motion } : {}),
      ...(args.targetMinutes !== undefined ? { targetMinutes: args.targetMinutes } : {}),
      overwrite: args.overwrite === true,
      handout: args.handout === true,
      onePager: args.onePager === true,
    })
    log(JSON.stringify(imported, null, 2))
    return 0
  }
  if (args.importPptx || args.syncPptx) {
    const imported = await importPptxDeck({
      pptxPath: args.importPptx || args.syncPptx,
      outDir: resolvePath(args.out || '.'),
      outputDir: resolvePath(args.out || '.'),
      ...(args.syncPptx ? {
        ...(args.edit ? { deckPath: args.edit } : {}),
        ...(args.targetProject ? { targetProjectDir: args.targetProject } : (!args.edit ? { targetProjectDir: resolvePath(args.out || '.') } : {})),
      } : {}),
      ...(args.title ? { title: args.title } : {}),
      ...(args.file ? { fileName: args.file } : {}),
      ...(args.theme ? { theme: args.theme } : {}),
      ...(args.persona ? { persona: args.persona } : {}),
      ...(args.chrome ? { chromeStyle: args.chrome } : {}),
      ...(args.lang ? { lang: args.lang } : {}),
      ...(args.motion ? { motion: args.motion } : {}),
      modernize: args.modernize !== false,
      preserveSourceTheme: args.preserveTheme === true,
      overwrite: args.overwrite === true,
      handout: args.handout === true,
    })
    log(JSON.stringify(imported, null, 2))
    return 0
  }
  if (args.absorb) {
    const absorbed = await absorbPptx({
      pptxPath: args.absorb,
      ...(args.saveTaste ? { saveTasteAs: args.saveTaste } : {}),
      ...(args.saveExemplar ? { saveExemplarAs: args.saveExemplar } : {}),
    })
    log(JSON.stringify(absorbed, null, 2))
    return 0
  }
  if (args.check) {
    const report = await checkDeckAsync({ deckPath: args.check, renderReceipt: args.renderReceipt })
    log(JSON.stringify(report, null, 2)); return report.ok && (args.renderReceipt === undefined || report.render?.status === 'rendered') ? 0 : 1
  }
  if (args.render) {
    const rendered = await (io.renderDeck ?? renderDeck)({ pptxPath: args.render, ...(args.explicitOut ? { outputDir: args.out } : {}), format: args.format, width: args.width, timeoutMs: args.timeoutMs })
    log(JSON.stringify(rendered, null, 2)); return rendered.ok ? 0 : 1
  }
  const effectiveBrand = args.chrome
    ? { ...(args.brand && typeof args.brand === 'object' ? args.brand : {}), chromeStyle: args.chrome }
    : args.brand

  if (args.edit || args.undo) {
    const result = args.edit
      ? await editDeck({
          deckPath: args.edit,
          edits: args.edits,
          theme: args.theme,
          ...(args.taste ? { taste: args.taste } : {}),
          referencePptx: args.referencePptx,
          brand: effectiveBrand,
          ...(args.targetMinutes !== undefined ? { targetMinutes: args.targetMinutes } : {}),
          expectedRevision: args.revision,
        })
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
    ...(args.taste ? { taste: args.taste } : {}),
    ...(args.exemplar ? { exemplar: args.exemplar } : {}),
    ...(args.autoUpgrade !== undefined ? { autoUpgrade: args.autoUpgrade } : {}),
    persona: args.persona,
    referencePptx: args.referencePptx,
    cloneStructure: args.cloneStructure,
    smartLayout: args.smartLayout,
    lang: args.lang,
    motion: args.motion,
    outputDir: resolvePath(args.out || '.'),
    fileName: args.file,
    overwrite: args.overwrite,
    template: args.template,
    brand: effectiveBrand,
    dataModel: args.dataModel,
    ...(args.handout ? { handout: true } : {}),
    ...(args.onePager ? { onePager: true } : {}),
    ...(args.targetMinutes !== undefined ? { targetMinutes: args.targetMinutes } : {}),
  }
  const result = await buildDeckAsync(options)
  log('dsh-ppt 已生成 ' + result.slideCount + ' 页演示文稿：')
  log('  HTML 放映：' + result.htmlPath)
  log('  PPTX 导出：' + result.pptxPath)
  log('  Manifest ：' + result.jsonPath)
  if (result.handoutPath) log('  讲义 Handout：' + result.handoutPath)
  if (result.onePagerPath) log('  高管一页纸：' + result.onePagerPath)
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

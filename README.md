[English](README.en.md)

# dsh-ppt

## 0.6.0 更新（2026-10-01）

加入图文排版、四类原生可编辑图表、按页编辑和撤销、具体到页面的质量报告、四种场景结构参考与共享品牌。可选官方 LibreOffice Kit 可读取最终 PPTX，生成逐页 PNG / PDF 并报告缺失字体。修正网页总览缩略图重叠、PPTX 表格标题太小、图文说明间距和图表标签显示。

原来的目标保持一致：Agent 整理内容和事实，插件生成可用成品。仅选择模板会生成明确标注的**待填写草稿**；生成器不会调查事实或编造缺失内容。应补齐正文、检查输出后再交付。

默认 PPTX 字体与 HTML 的 CSS 字体栈分开处理，使用平台字体并明确东亚字体，避免把未安装的西文字体写成中文字体。缺失字体必须先替换、重新生成并检查；未解决时标注字体问题，不声称已验收。

本次验证：Windows / Node 24.16.0，100项测试通过；官方源码构建 Harness 0.2.0-rc.2（639ed01539）中18组件共同加载，104工具/35技能契约通过。默认无品牌五主题15页已通过官方原生PNG/PDF渲染和逐页视觉检查；另有11页图片/图表/品牌示例经浏览器、Microsoft PowerPoint与官方Kit检查。此为这些样例的证据，不代表任意文稿自动通过。

## 0.5.0 更新（2026-09-27）

包含新的演讲者预览、缩略图和计时控件。浏览器不支持或拒绝全屏时显示操作提示，不再无声失败。

验证宿主：官方源码构建的 Harness `0.2.0-rc.1`（commit `407e65c8`）+ Node `24.16.0`（2026-09-28）。70 项插件测试在隔离环境全部通过；同一个宿主里 18 个插件共同加载，注册 1 个技能、2 个工具，工具 schema 与健康检查契约通过。本轮未启用真实端口与外部服务。

> **一句话 / 一篇文档 → 完整演示文稿**：HTML 网页放映 + PPTX 导出，5 套视觉主题，页间转场 + 要点入场动画，中英双语。

![npm version](https://img.shields.io/npm/v/dsh-ppt?label=npm&color=blue) ![npm downloads](https://img.shields.io/npm/dm/dsh-ppt) ![license](https://img.shields.io/npm/l/dsh-ppt) ![stars](https://img.shields.io/github/stars/STARDUSTLC666/dsh-ppt?style=social)

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

DSH（DeepSeek Harness）演示文稿技能 + 工具插件：Agent 根据需求准备内容，再生成离线 **HTML 网页**、可编辑 **PPTX** 和 **JSON 工程**。图片与图表采用精确版本 `@office-kit/pptx@0.21.0`，共享 Node 生成流程支持 Windows / macOS / Linux。

## 能力一览

| 能力 | 说明 |
| --- | --- |
| `ppt_create` 工具 | Markdown / 结构化 slides → `*.html` + `*.pptx` + `*.json` 三件套 |
| `ppt_themes` 工具 | 列出 5 套内置主题与适用场景；传 `preview: true, outputDir: "dist"` 生成主题对比页 + 每套一张 SVG 色板卡（可直接进 README/npm 首屏） |
| 11 种页型 | 封面 / 章节 / 要点 / 核心观点 / 金句 / 表格 / 结束 / 整页图片 / 左图右文 / 左文右图 / 图表 |
| `ppt_templates` | 周报、论文答辩、项目汇报、路演的大纲和草稿结构参考 |
| `ppt_edit` / `ppt_undo` | 修改指定页、保留其他页，支持最多 20 次历史与修订号冲突保护 |
| `ppt_check` | 只读质量检查，定位具体页的问题；可复核当前渲染收据 |
| `ppt_render` | 可选官方引擎生成 PNG / PDF，保留源 PPTX，报告缺失字体 |
| 品牌 | 共享颜色、字体、Logo、页脚，同步到 HTML 与 PPTX |
| 演讲者备注 | `<!-- 备注: ... -->` 或 `notes` 字段：HTML 按 `S` 呼出，PPTX 原生备注页（演示者视图） |
| 动效（motion） | 默认开：HTML 页间淡入 + 要点逐条入场；PPTX 原生转场 + 要点逐条点击显现；`motion: 'off'` / `--motion off` 产出纯静态 |
| Markdown 进阶 | 表格（`\| ... \|`）、引用金句（`>`）、备注注释自动识别成对应页型 |
| `dsh-ppt` 技能 | 完整 SOP 注册进 DSH：从一句话到成品 deck 的六步流水线 |
| 裸 SKILL.md | 把 `skills/dsh-ppt/` 复制到 Claude Code / Cursor / Gemini CLI / Codex 即可跨 harness 使用 |
| 视觉引擎 | 复用 hyperframes 视觉风格库，5 套主题 HTML 与 PPTX 同源同色 |

示例对话：

> 把这句话做成 PPT：「AI 客服把首次响应时间压缩到 8 秒」，主题用科技感深色。
>
> 把 `docs/季度汇报.md` 做成双语演示文稿，导出 PPTX。

## 兼容性

插件和独立技能均要求 Node `^22.19.0 || >=24.0.0`。插件无需密钥或必填配置，可选渲染引擎缺失不会阻止普通启动与生成。Windows 示例已通过浏览器操作、真实 Microsoft PowerPoint 打开/逐页导出，以及官方 Kit 原生渲染；具体产物仍需逐页检查。

## 安装

```bash
dsh plugin --profile web add dsh-ppt
```

桌面版可在插件管理中安装 `dsh-ppt`。更新后重启对应宿主，加载七个工具与 `dsh-ppt` 技能。无需手写 JSON，可直接要求 Agent「加入这两张截图和销售图表」「只修改第三页」「撤销上次修改」。

## 快速开始

### DSH 内（推荐）

```
1. ppt_themes { preview: true, outputDir: "dist" }   # 看 5 套主题 + 生成对比页
2. ppt_create {
     title: "把会议减半",
     content: "# 问题\n- 周会太多\n\n# 方案\n- 异步决策",
     theme: "data",
     lang: "zh"
   }
3. 打开返回的 HTML 路径（浏览器放映），PPTX 用 PowerPoint / WPS / Keynote 编辑
```

### 任意 harness（裸 SKILL.md）

把整个 `skills/dsh-ppt/` 复制到任意 Agent Skills 目录，在技能目录运行 `npm install --ignore-scripts`，然后：

```bash
node <skill-dir>/scripts/build-deck.mjs \
  --title "产品发布" \
  --content deck.md \
  --theme data \
  --lang zh \
  --out dist/deck
```

输出三件套：

默认不会覆盖已有同名产物：三件套中任一文件存在时会整组追加 `-1`、`-2`… 后缀；只有显式传 `overwrite: true`（CLI 为 `--overwrite`）才会覆盖。

| 文件 | 用途 |
| --- | --- |
| `*.html` | 独立网页放映：← → 翻页，V 演讲者视图（独立窗口：真实当前页/下一页预览、缩略图跳页、备注、计时、进度、暂停、字号、黑/白屏），S 备注，G 缩略图总览，F 全屏，P 打印，? 快捷键，Esc 关闭 |
| `*.pptx` | 16:9 原生可编辑文字、表格、图片和图表，保留备注与转场 |
| `*.json` | 工程、图片资产、页面 ID、修订号、最多 20 次修改历史和质量报告 |

## 图片、图表、编辑与交付

结构化 slides 新增 `image | image-left | image-right | chart`。图文页示例：

```json
{ "layout": "image-left", "title": "新版流程减少操作步骤", "image": { "src": "assets/screenshot.png", "alt": "新版流程截图", "fit": "contain" }, "bullets": ["填写内容后即可生成", "修改指定页保留其他页"] }
```

图片只接受本地 PNG/JPEG 或对应 data URI；相对路径按会话工作目录解析。图片嵌入三件套，原文件移走后仍可使用并撤销修改。每张最多 5 MiB / 3200 万像素，工程图片总量最多 32 MiB。不自动下载外链或转换 SVG。`fit` 为 `contain`（完整显示）或 `cover`（居中裁切）。

图表示例：

```json
{ "layout": "chart", "title": "完成量逐月增加", "chart": { "kind": "column", "categories": ["七月", "八月", "九月"], "series": [{ "name": "完成量", "values": [3, 5, 9] }], "unit": "项" } }
```

支持 `column | bar | line | pie`，也可传 `rows`（首行为类别列和系列名）。数值必须有限、数据长度一致；饼图要求一个非负系列且总和大于零。HTML 使用 SVG 与读屏数据表，PPTX 使用原生图表与可编辑工作簿。

`brand` 支持 `name`、`primaryColor`、`backgroundColor`、`textColor`、`fontFamily`、`logo`、`footer`。颜色用 `#RRGGBB`，字体选择接收方电脑可用的字体。`template` 为 `weekly | defense | project | pitch`，提供正文时不会替换原大纲。

编辑示例：`ppt_edit { deckPath: "report.json", expectedRevision: 0, edits: [{ slide: 3, patch: { title: "新的结论", bullets: ["依据一", "下一步"] } }] }`。先用 `ppt_check` 获取页码/ID/修订号，再修改；`ppt_undo` 撤销最近一次修改，恢复图片、图表和品牌。编辑和撤销更新整套文件，失败会回滚。

`deliveryStatus: draft` 表示模板未填完；`ready-for-review` 表示可开始检查。静态估算、PPTX 渲染和视觉检查分开记录。生成或渲染成功不会自动代表视觉验收通过，应查看 HTML 和每页图片，修正问题后交付。

## 可选 PNG / PDF 渲染

在插件所在项目或独立技能目录安装：

```bash
npm install --ignore-scripts @deepseek-ai/libreoffice-kit@0.1.3
```

声明为精确版本可选 peer，普通消费者安装不要求引擎。Windows 还需与 Node 架构匹配的 Microsoft Visual C++ v14 运行库。缺失时 `ppt_render` 返回 `unavailable` 和安装提示。

`ppt_render { pptxPath: "report.pptx", format: "both" }` 读取最终 PPTX，生成逐页 PNG、PDF 和 `render-receipt.json`，不重新保存可编辑源文稿。`ppt_check` 可携带返回的 `receiptPath` 作为 `renderReceipt`，核验源文件和每个输出的摘要；编辑源文稿或修改输出后旧收据失效。静态产物不保留动画；LibreOffice 与 PowerPoint/WPS 的排版可能不同。字体诊断不保证每个字符，也不自动安装字体。更多细节见 [渲染说明](docs/LIBREOFFICE-INTEGRATION-2026-10-01.md)。

CLI 支持 `--slides @slides.json`、`--brand @brand.json`、`--template weekly`、`--edit report.json --edits @edits.json --revision 0`、`--undo report.json --revision 1`、`--check report.json`、`--render report.pptx --format both`。收据核验用 `--check report.json --render-receipt path/to/render-receipt.json`；失败返回非零退出码。

## 内置主题

| ID | 名称 | 情绪 | 适用 |
| --- | --- | --- | --- |
| `data` | 数据漂移（默认） | 未来 / 沉浸 | AI、技术发布、研究 |
| `swiss` | 瑞士脉冲 | 精准 / 理性 | 数据、SaaS、开发者工具 |
| `velvet` | 天鹅绒标准 | 高级 / 克制 | 高管汇报、品牌、融资路演 |
| `soft` | 柔和信号 | 温暖 / 人本 | 品牌故事、培训、个人分享 |
| `bold` | 极繁大字 | 大声 / 动能 | 产品发布、活动、大事件 |

主题灵感来自 [hyperframes](https://github.com/STARDUSTLC666/dsh-hyperframes) 的 `visual-styles.md`，完整色板见 `skills/dsh-ppt/references/themes.md`。也可运行 `ppt_themes { preview: true, outputDir: "dist" }` 生成并排对比页与 SVG 色板卡。

## Markdown 输入规则

- 第一个 `# 标题` → 封面标题；其下第一段 → 封面副标题。
- 每个 `## 小节` → 一页：有列表生成 `bullets` 页，无内容生成 `section` 过渡页。
- 没有标题的纯文本 → 第一段作封面，后续每 5 句一页。
- 只有一句话 → 自动生成「封面 → 核心观点 → 结束页」三页完整结构。
- 长表格自动分页：每页重复表头，最多 8 行数据；备注只放第一页。最多 8 列、每格 60 字符，超限会提示拆分。短行补空白，三种产物保留相同数据。
- `maxSlides` 计算分页后的总页数；超过限制时先报错，不落盘、不静默删掉中间页。可提高配置上限（最多 120）或拆分文稿。
- 需要精确控制时用结构化 `slides`（`cover | section | bullets | statement | quote | table | closing`），表格使用 `rows`，备注使用 `notes`。

## 配置

插件无必填配置。可选：

```yaml
- id: dsh-ppt
  config:
    outputDir: E:\decks   # 可选；默认会话工作目录
    maxSlides: 40         # 可选；默认 60（3–120）
    defaultTheme: data    # 可选；ppt_create 未指定 theme 时使用
    defaultLang: zh       # 可选；ppt_create 未指定 lang 时使用（zh/en/bilingual）
```

也可用环境变量 `DSH_PPT_OUTPUT_DIR` 指定默认输出目录；`ppt_create` 的 `outputDir`/`theme`/`lang` 参数优先级最高。

输出目录按每次调用的会话 cwd 解析，相对路径与插件配置保持一致，不修改进程 cwd。生成阶段及提交前检查取消，三件套一起提交或回滚。可选渲染默认写入 PPTX 旁的 `<名称>-render`，已有目录会追加后缀。


## 卸载

```bash
dsh plugin --profile web remove dsh-ppt
```

卸载后重启 Web 服务。如需彻底清理，可再手动删除自己 profile `cordis.patch.yml` 中的对应插件行。

## 中英双语

- `lang` 参数：`zh`（默认）/ `en` / `bilingual`，控制播放器界面、页码与结束页默认文案。
- 内容语言由你撰写：双语 deck 推荐「中文标题 + 英文副标题」，或同一大纲分别生成中英两份。
- 插件文档提供中英两版（README.md / README.en.md）；CLI 与技能的报错提示为中文。

## 工程质量

- 技能和工具共用异步生成器；纯文本的旧同步 API 保留，媒体输入会明确要求 `buildDeckAsync`。
- 图片与原生图表采用 MIT 的 `@office-kit/pptx@0.21.0`；可选渲染引擎按需加载。
- 单元测试覆盖注册契约、JSON Schema、主题解析、Markdown 解析、三件套落盘、PPTX 部件完整性、CLI。
- 无 `eval` / `child_process` / 密钥；产物只写用户指定的本地目录。

## 开发

```sh
pnpm install
pnpm run build      # tsc → lib/
pnpm test           # 构建 + node --test（注册/配置/引擎/CLI）
pnpm run smoke:cli  # 裸 CLI 冒烟，生成 .smoke-deck
```

## 已知限制

- PPTX 采用空白版式 + 文本框实现：PowerPoint / WPS 中可正常编辑文字，但暂不生成智能母版占位符。
- 一句话输入自动生成三页最小结构；更丰富的内容需要先扩写成 Markdown 大纲再调用 `ppt_create`。
- `bilingual` 只双语化播放器界面，不自动翻译内容。
- 按页编辑仅支持本插件 JSON 工程，不导入任意外部 PPTX 编辑。
- 文字大小与溢出检查是静态估算；实际裁切和字体替换必须查看渲染画面。

## 协议

插件 MIT；Office Kit MIT；可选官方 LibreOffice Kit 及其引擎保留各自许可、来源与第三方声明。使用官方库不表示本插件由 DeepSeek 官方维护。

## 相关项目

- [dsh-hyperframes](https://github.com/STARDUSTLC666/dsh-hyperframes) — HTML 视频创作技能（本插件视觉风格来源）
- [dsh-remotion](https://github.com/STARDUSTLC666/dsh-remotion) — React 编程式视频技能
- [dsh-email](https://github.com/STARDUSTLC666/dsh-email) — 邮件六件套

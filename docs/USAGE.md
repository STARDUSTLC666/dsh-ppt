# dsh-ppt 使用说明

[返回简介](../README.md) · [更新记录](../CHANGELOG.md) · [验证记录](VALIDATION.md)

## 本次改进

- **0.30.0 GitHub 开源优质 `.pptx` 实机蒸馏语料库（内置 20 套范本）、Few-Shot JSON 样板与 `exemplar: "auto"` 路由**：新增零外部依赖 `deck-exemplars-corpus.mjs`，从 **25 份**真实 Apache-2.0 / MIT / CC0-1.0 / CC-BY-4.0 开源 GitHub `.pptx` 经实机渲染筛查蒸馏出 **12 套**新标杆范本（`mckinsey-evolution`、`luxury-budget-review`、`swiss-bauhaus-workshop`、`dark-stage-investor`、`blueprint-ai-factory`、`warm-brand-story`、`ted-storytelling-keynote`、`msft-enterprise-discovery`、`daylight-earnings-research`、`okr-performance-review`、`quiet-canvas-keynote`、`medical-clinical-course`），与原有 8 套合共 **20 套内置标杆**；`ppt_templates({ exemplarId })` 新增双语 **Few-Shot 满分 JSON 样板（`fewShotSlides`）** 供弱模型直接仿写；`ppt_create` / CLI `--exemplar auto` / 工作台新增 `exemplar: "auto"` 智能语义匹配；同步加固 `deck-absorb.mjs` 杜绝边缘装饰圆点、背景光晕圆、默认 `PowerPoint Presentation` 标题碰撞与 macOS 独占字体泄漏。
- **0.29.0 8 套标杆范本槽位契约、批量 `.pptx` 语料吸收与确定性弱模型升维补偿器**：新增零外部依赖 `deck-exemplars.mjs` 与 `deck-upgrader.mjs`，内置 8 套高审美标杆范本（`mckinsey-strategy` / `sequoia-pitch` / `stripe-product-launch` / `quarterly-exec-review` / `tech-arch-rfc` / `academic-defense` / `enterprise-proposal` / `gov-institutional`），支持 `ppt_templates({ exemplarId })` / `--list-exemplars` 返回逐页槽位填空契约；`ppt_absorb` 支持单份存范本（`saveExemplarAs`）或直接传 `.pptx` 文件夹（`corpusDir` / `--ingest-exemplars`）批量投喂沉淀至 `.dsh-ppt/exemplars.json`（自动跳过 `<p:sld show="0">` 隐藏页）；`ppt_create` 新增 `exemplar` 与默认开启的确定性弱模型补偿器 `autoUpgrade`（0 额外模型调用、100% 文本无损自动晋升 `kpi[spotlight]` / `dumbbell` / `radar` / `quadrant` / `heatmap` / `code[split]` / `mockup`、拆分超长文字墙、抢救空洞标题与裸封底）；同步修复亮色主题 `cards[bento-hero]` 反白英雄卡对比度与 `dumbbell` 近零轴数值防撞排版，并在工作台新建向导开放标杆范本选择器。
- **0.28.0 科技产品展示、四大顶级商业分析矢量图谱与直接操纵工作台**：新增零外部依赖 `deck-showcase.mjs` 与 `deck-charts-pro.mjs`，全面扩展至 **35+ 原生可编辑版式**：支持矢量设备原型 `mockup`（`browser` / `mobile` 灵动岛 / `split`，支持原生截图嵌入或内建 UI 卡片）、9 语言零依赖语法高亮代码窗 `code`（自动识别 Markdown 非 Mermaid 代码围栏，PPTX 输出多色可编辑 Consolas `<a:r>` 文本流）、封面 Hero Photo Split（`cover` 传 `slide.image` 自动左深渐变排印 + 右全出血主图）与程序化封面几何肌理（`coverPattern: 'dots' | 'grid' | 'rings'`）；新增四大咨询级分析图谱——**魔力象限 `quadrant`**、**多维雷达图 `radar`**、**麦肯锡哑铃跃迁图 `dumbbell`**（1-2-5 规整刻度）与 **WCAG 自适应热力图 `heatmap`**；工作台支持左侧页面 **HTML5 拖拽调序**、画布 **双击文字原地改写并同步 PPTX**，导出面板新增 **「导出高精 PDF (.pdf)」**（`kind=pdf`）与 **「导出逐页 PNG 图包 (.zip)」**（`kind=png-zip`）。
- **0.27.0 全栈审美工坊、8 套大师品味配方、61 枚原生矢量图标与标杆 PPTX 审美 DNA 学习**：新增 `deck-taste.mjs`、`deck-covers.mjs` 与 `deck-icons.mjs`（零新增依赖），内置 8 套精选品味配方（`mckinsey-partner` / `apple-keynote-dark` / `apple-keynote-light` / `swiss-editorial` / `linear-craft` / `ft-data-journal` / `nature-academic` / `oriental-zen`），一键协同驱动 4 套海报级封面（`keynote-glow` / `editorial-grid` / `architectural` / `split-bleed`）、`section[agenda]` 自动章节进度过场、4 种卡片材质（`solid` / `frameless` / `glass` / `editorial-rule`）、反单调构图（`kpi[spotlight]` / `cards[bento-hero]`）、61 枚双端矢量图标（HTML `<svg>` + PPTX 原生 `<a:custGeom>`）、出版级图表精修（`spotlight` / `referenceLine` / `showGrowthCallout`）以及 `optimizeVisualRhythm` + `SLOP-11`/`SLOP-12` 门禁；`ppt_absorb`（CLI `--save-taste`）支持从任意优秀 `.pptx` 提取 6 维审美 DNA 生成 `styleRecipe` 持久化至 `.dsh-ppt/taste-recipes.json` 复用。
- **0.26.0 全谱系多源直吞、原生可编辑 Mermaid 与生态联动**：新增 `deck-mermaid.mjs` 支持 `layout: 'mermaid'`（别名 `flowchart`/`sequence`）及 Markdown ```` ```mermaid ```` 代码块，把 `flowchart` 与 `sequenceDiagram` 编译为 100% 原生可编辑 PPTX 形状与吸附连接线（`<p:cxnSp>`）；新增 `ppt_from_office`（CLI `--from-office`、工作台 `import-office`）零新增依赖直吞 `.xlsx`/`.csv`/`.tsv` 与 `.docx`；新增 `ppt_cite` 对接 `dsh-cite` 核验文献并生成 `References` 页，以及 `ppt_remotion` 导出 `dsh-remotion` 30fps 视频分镜包；新增演讲时长预算器（`computePaceBudget` / `targetMinutes`）、高管一页纸（`.onepager.html`）、工作台 `? 引导` 四步聚光灯交互导览与「一键体验旗舰示例」。
- **智能审美托管、6 套母版骨架与深度 PPTX 吸收**：`ppt_create` 默认启用 `theme: "auto"` 按语境与受众自动选定最优主题与母版骨架（裸 CLI 不传 `--theme` 时保持兼容默认 `data`，显式传 `--theme auto` 启用自动选型）；`ppt_absorb` 与 `referencePptx`（支持 `cloneStructure: true` / `--clone-structure`）可纯本地解析 OOXML `lumMod`/`tint`/`shade` 修饰色板、字体、母版 Logo、骨架几何（`extractedSkeleton` / `recommendedChrome`）与逐页版式序列（`slideSkeleton[]`），自动执行 WCAG ≥4.5:1 对比度净化。
- **24 套内置主题、6 套差异化母版骨架、29+ 种页型与 20 套行业蓝图**：覆盖 16 套明亮主题与 8 套深色主题，匹配 6 套结构差异化的母版骨架（`consulting-classic` / `keynote-spatial` / `editorial-folio` / `saas-bento` / `academic-minimal` / `gov-ceremonial`）；覆盖 `mermaid`、`marimekko`、`sankey`、`value-chain`、`swot`、原生 `<m:oMath>` 公式、`gantt`、`architecture`、`harvey`、`tam`、`org` 及 `process` 飞轮/漏斗变体，支持 `tableStyle: consulting | booktabs | minimal | banded | harvey`、单页 `chrome`、`columns`、`takeaway` 结论栏与 `source` 来源脚注；图表覆盖 13 类出版级图表与矢量瀑布桥。
- **风格与母版工作台（Style Studio）**：工作台支持 24 套主题、8 套名家范本预设与 **6 套母版骨架（`brand.chromeStyle`）**一键切换、单页一键切换 29+ 种版式原型与甘特图/哈维球/Mermaid/公式编辑、「+ 新建页面」、目标演讲时长预算、拖拽 `.pptx` 展示 `recommendedChrome` 与 `extractedSkeleton` 摘要、HTML ↔ PPTX 并排分屏对照、画布级 AI 视觉修复前后对比（上限 24 页与 12 种无损动作）及最多 8 条叙事金字塔/结论句预审建议。
- **产物校验与交付包保护**：每次生成保存 HTML / PPTX 校验值。外部修改过成品或旧工程缺少校验记录时，`ppt_edit`、`ppt_undo` 和面板保存会拒绝覆盖。保留 Office 修改后的原件，点击「另存副本」或调用 `ppt_edit({deckPath, saveAs:true})` 从 JSON 重建不同文件名的三件套；副本不导入 Office 修改，使用新工程 ID 和修订号 0。在工作台保存修改后可下载「分享成品包 ZIP」「完整工程包 ZIP」、高管一页纸（`.onepager.html`）或 Remotion 分镜包（`.zip`），单文件 ≤64 MiB、合计 ≤128 MiB，不包含配置、密钥或工作区其他文件。

## 能力一览

| 能力 | 说明 |
| --- | --- |
| `ppt_create` 工具 | Markdown / 结构化 `slides` → `*.html` + `*.pptx` + `*.json` 三件套；默认 `theme: "auto"` 自动匹配主题与骨架，支持 `referencePptx`、`cloneStructure: true` 与 `targetMinutes` 演讲时长预算 |
| `ppt_from_office` 工具 | 零新增依赖直吞 `.xlsx` 多工作表、`.csv`/`.tsv` 与 `.docx` Word 报告，自动识别流向/排期/份额/增减桥/组合指标并生成高颜值全套工程 |
| `ppt_import` 工具 | 导入外部 `.pptx`（正文、表格、原生图表、图片、备注）一键翻新为可编辑工程，或传入 `projectId` 将 Office 修改稿导回既有工程更新（支持撤销） |
| `ppt_cite` 工具 | 联动 `dsh-cite` 文献库/BibTeX，核验并替换 `[@citeKey]` / `[doi:...]` 为真实 `slide.source` 学术尾注并生成 `References` 文献页（零捏造 DOI） |
| `ppt_remotion` 工具 | 按 `computePaceBudget` 时长预算导出 `dsh-remotion` 30fps 视频分镜包（`DeckVideo.tsx` + `slides-data.json` + `remotion-storyboard.json`） |
| `ppt_absorb` 工具 | 本地只读解析参考 `.pptx` 的主题修饰色板、字体、画幅比例、母版骨架几何（`extractedSkeleton` / `recommendedChrome`）、逐页序列（`slideSkeleton`）与可选嵌入 Logo |
| `ppt_themes` 工具 | 列出 24 套内置主题（16 明亮 + 8 深色）与 6 套母版骨架；传 `preview: true, outputDir: "dist"` 生成主题对比页 + 每套 SVG 色板卡 |
| 29+ 种页型与图示 | `cover` / `agenda` / `section` / `bullets` / `statement` / `quote` / `kpi` / `cards` / `comparison` / `matrix` / `process` / `callout`（支持原生 `<m:oMath>` `formula`） / `mermaid`（原生可编辑流程图与时序图） / `gantt` / `architecture` / `harvey` / `tam` / `org` / `marimekko` / `sankey` / `swot` / `value-chain` / `table` / `closing` / `image` / `image-left` / `image-right` / `chart` / `chart-split`（兼容 `flowchart`、`sequence`、`chevron`、`waterfall`、`gallery`、`flywheel` 别名） |
| 13 类原生图表 | `column` / `bar` / `stacked-column` / `stacked-bar` / `percent-column` / `percent-bar` / `line` / `area` / `pie` / `doughnut` / `scatter` / `combo` / `waterfall`，支持 `highlight` 焦点项染色 |
| `ppt_templates` | 20 套场景蓝图：`weekly`、`defense`、`project`、`pitch`、`consulting`、`keynote`、`gov-report`、`workshop`、`architecture-review`、`financial-earnings`、`medical-case`、`postmortem`、`marketing-campaign`、`promotion-review`、`legal-compliance`、`creative-lookbook`、`quarterly-okr`、`product-prd`、`vc-daylight`、`industry-research` |
| `ppt_edit` / `ppt_undo` | 按页或整套切换主题/品牌/参考 `.pptx`、增删改排页面，支持最多 20 次历史与修订号冲突保护 |
| `ppt_check` | 只读版面与信息密度检查（含标题动作化、密度过载、连续同构页等提醒），定位具体页；可复核当前渲染收据 |
| `ppt_render` | 可选官方引擎生成逐页 PNG / PDF，保留源 PPTX，报告缺失字体 |
| `ppt_data` | 可选来源更新与假设推演，先预览差异再确认保存；见[数据说明](DATA.md) |
| AI 看图修复 | 可选实际 PPTX 图片检查（最多 24 页）、12 种无损排版动作、可撤销副本与重新渲染复查；见[看图修复](VISUAL.md) |
| AI 预审与模拟答辩 | 可选叙事主线（SCQA / 金字塔 / 动作标题）、表达、逻辑与证据缺口预审（最多 8 条）及 7 类听众模拟答辩；见[预审与答辩](COACHING.md) |
| 品牌与母版 | 共享主色、背景色、文字色、字体、Logo、页脚，HTML 与 PPTX 同源同步 |
| 演讲者提词台、讲义与动效 | `<!-- 备注: ... -->` 或 `notes` 字段同步至 HTML 双屏演讲者提词台（`P` 开启、`L` 激光笔）与 PPTX 原生备注页，支持导出 `.handout.md` 讲义；`motion` 默认开启，`motion: 'off'` / `--motion off` 产出纯静态 |
| `dsh-ppt` 技能 & 裸 CLI | 完整自动审美指导 SOP 注册进 DSH；也可将 `skills/dsh-ppt/` 复制到 Claude Code / Cursor / Gemini CLI / Codex 跨环境独立运行 |

示例对话：

> 把这句话做成 PPT：「AI 客服把首次响应时间压缩到 8 秒」，自动挑一套最稳重的商业汇报风格。
>
> 参考 `assets/company-template.pptx` 的配色和字体，把 `docs/季度经营复盘.md` 做成带 KPI 卡片、瀑布图和三线表的可编辑 PPTX。

## 安装

```bash
dsh plugin --profile web add dsh-ppt
```

桌面版可在插件管理中安装 `dsh-ppt`。更新后重启对应宿主，加载九个工具与 `dsh-ppt` 技能。无需手写 JSON，可直接要求 Agent「按管理层汇报风格自动排版」「参考我的模板 PPTX」「把第三页改成三栏卡片」「撤销上次修改」。

## 快速开始

### DSH 内（推荐）

```
1. ppt_themes { preview: true, outputDir: "dist" }   # 预览 18 套主题 + 生成对比页
2. ppt_create {
     title: "季度经营复盘与下阶段重点",
     content: "# 核心结论\n> [!TAKEAWAY] 首次响应时间降至 8 秒，续费率提升 4.2 个百分点\n\n::: kpi\n- 8s | 首次响应时长 | 环比 -64%\n- 98.5% | 服务达成率 | +4.2%\n:::",
     theme: "auto",
     lang: "zh"
   }
3. 打开返回的 HTML 路径（浏览器放映），PPTX 用 PowerPoint / WPS / Keynote 编辑，或在左侧栏打开演示文稿工作台微调
```

### 任意 harness（裸 SKILL.md）

把整个 `skills/dsh-ppt/` 复制到任意 Agent Skills 目录，在技能目录运行 `npm install --ignore-scripts`，然后：

```bash
node <skill-dir>/scripts/build-deck.mjs \
  --title "产品发布" \
  --content deck.md \
  --theme auto \
  --lang zh \
  --out dist/deck
```

裸 CLI 也可使用 `--absorb ref.pptx` 提取参考模板 JSON，或在构建/编辑时传 `--reference-pptx ref.pptx`、`--clone-structure` 与 `--chrome consulting-classic`；未显式传 `--theme` 时 CLI 保持兼容默认 `data`。

输出三件套（默认不覆盖同名产物，存在同名文件时整组追加 `-1`、`-2`… 后缀；仅显式传 `overwrite: true` 或 `--overwrite` 时覆盖）：

| 文件 | 用途 |
| --- | --- |
| `*.html` | 独立网页放映：← → 翻页，V 演讲者视图（独立窗口：真实当前页/下一页预览、缩略图跳页、备注、计时、进度、暂停、字号、黑/白屏），S 备注，G 缩略图总览，D 数据推演，F 全屏，P 打印，? 快捷键，Esc 关闭 |
| `*.pptx` | 16:9 原生可编辑文字、结构化卡片、表格、图片和原生图表（含可编辑工作簿），保留备注与转场 |
| `*.json` | 工程清单、主题/品牌配置、嵌入资产、稳定页面 ID、修订号、最多 20 次修改历史和质量报告 |

## 工作台、结构化版式、图表与交付

### 演示文稿工作台与风格母版（Style Studio）

打开左侧栏「演示文稿工作台」（或「设置 → 演示文稿」），选择由 `ppt_create`、`ppt_edit` 或 `ppt_check` 登记的本插件工程：

- **内容编辑与一键换版式**：左侧页面栏展示每页版式标签与质量状态圆点，支持「+ 新建页面」按版式原型插入起始页（含甘特图、系统架构、哈维球、TAM/SAM/SOM、组织图谱等），以及上移/下移、复制、删除（保留 1–120 页，均支持撤销）。右侧顶部提供 **24 种版式原型切换器**、变体（`variant`）、单页母版骨架（`chrome`）与疏密（`compact | balanced | airy`）选择，切换版式时自动在要点列表、结构化卡片（`items`）与表格（`rows`）之间无损映射草稿；支持结构化编辑卡片数值/甘特图时间跨度/标签/状态、切换表格样式（咨询表 / 学术三线表 `booktabs` / 极简 / 条纹 / 哈维球 `harvey`）以及编辑底部结论栏（`takeaway`）与来源脚注（`source`）。
- **风格与母版（Style Studio）**：按「明亮主题（12 套）」与「深色主题（6 套）」分区浏览实时色板与适用场景，一键切换整套文稿主题或 **6 套母版骨架（`brand.chromeStyle`）**；支持自定义品牌色、字体、页脚与 PNG/JPEG Logo；支持拖拽上传自有 `.pptx`（≤10 MiB，浏览器端转交内存解析，绝不读取宿主机任意本地路径）预览 `recommendedChrome`、`extractedSkeleton` 与 `slideSkeleton` 摘要并一键应用。
- **并排对比与质量定位**：画布区支持「HTML 预览」「PPTX 渲染页」「HTML + PPTX 并排对比」三种视图；点击质量提示行可直接跳转到对应问题页。
- **并发与资产保护**：保存会原子更新 HTML、PPTX 和 JSON。若助手同时修改了工程，旧修订返回 409 冲突保护，点击「载入最新版本，保留我的输入」核对后再保存。面板上传 PNG/JPEG 每张最多 5 MiB（读取期间切页或取消会自动中止读取）。保存后可单独下载「讲稿 Markdown」（按当前页序生成，不含撤销历史旧备注）。面板仅编辑本插件生成的 JSON 工程，不直接改写外部手工编辑的任意 PPTX。

### 结构化页型、媒体与图表

结构化 `slides` 支持全部 24 种标准版式与专业图示：

- **结构化卡片 / KPI / 对比 / 矩阵 / 流程 / 甘特图 / 架构 / TAM / 组织图谱**：通过 `items` 数组传入最多 8 项，每项支持 `{ tag, title, text, value, unit, delta, start, span, milestone, role, conversion, status, bullets }`，甘特图支持 `columns: ["Q1","Q2","Q3","Q4"]`，并可搭配 `chrome`、`takeaway`（核心结论条）与 `source`（数据来源角注）。
- **哈维球矩阵与表格**（`harvey | table`）：支持 `tableStyle: "consulting" | "booktabs" | "minimal" | "banded" | "harvey"`；`harvey` 矩阵支持在单元格中使用 `●` / `◕` / `◑` / `◔` / `○` / `✓` / `✗` 渲染原生矢量哈维球与状态符号。
- **图文页**（`image | image-left | image-right`）：
  ```json
  { "layout": "image-left", "title": "新版流程减少 40% 手工核对步骤", "image": { "src": "assets/screenshot.png", "alt": "新版流程截图", "fit": "contain" }, "bullets": ["填写内容后即可同源生成", "修改指定页保留其他页"], "takeaway": "上线首周人工返工率下降至 1.2%" }
  ```
  图片只接受本地 PNG/JPEG 或对应 data URI（相对路径按会话 cwd 解析），嵌入三件套后原文件移走仍可编辑与撤销；单张 ≤5 MiB / 3200 万像素，整套资产 ≤32 MiB，不自动联网下载外链或转换 SVG。
- **原生图表页**（`chart | chart-split`）：
  ```json
  { "layout": "chart-split", "title": "三季度自动化处理量翻倍增长", "chart": { "kind": "column", "categories": ["七月", "八月", "九月"], "series": [{ "name": "处理量", "values": [32, 54, 96] }], "unit": "万单", "highlight": 2 }, "bullets": ["九月峰值突破 96 万单", "自动化分流占比达 78%"], "source": "来源：运营中心月报（2026 Q3）" }
  ```
  支持 `column | bar | stacked-column | stacked-bar | percent-column | percent-bar | line | area | pie | doughnut | scatter | combo | waterfall`（也可传表头 + 数据行的 `rows`）。数值须有限且系列长度一致；饼图/环形图要求单个非负系列且总和大于零。HTML 输出无障碍 SVG 与读屏数据表，PPTX 写入原生可编辑图表与工作簿。

`brand` 支持 `name`、`primaryColor`、`backgroundColor`、`textColor`、`fontFamily`、`logo`、`footer`、`chromeStyle`（颜色为 `#RRGGBB`，字体请选接收方设备常见字体）。`template` 支持 `weekly | defense | project | pitch | consulting | keynote | gov-report | workshop | architecture-review | financial-earnings | medical-case | postmortem | marketing-campaign | promotion-review | legal-compliance | creative-lookbook` 共 16 套行业蓝图，提供正文时不会覆盖用户原有叙事。

编辑与结构操作示例：
- 单页与整套主题更新：`ppt_edit { deckPath: "report.json", expectedRevision: 0, theme: "consulting", edits: [{ slide: 3, patch: { layout: "kpi", title: "关键经营指标全面达标", takeaway: "三大核心指标均超季度目标" } }] }`
- 结构调整：`ppt_edit { deckPath: "report.json", expectedRevision: 0, duplicate: [2], remove: [4], append: [{ layout: "callout", title: "下一步行动" }] }`（引用按修改前页码或稳定 ID 解析，最终保留 1–120 页，可与文字编辑合并为一次可撤销操作）。

`deliveryStatus: draft` 表示模板槽位尚未填完；`ready-for-review` 表示可进入复核。静态估算、PPTX 渲染与 AI 视觉检查分开记录；生成或渲染成功不自动代表人工视觉验收通过，交付前请核对 HTML 与实际渲染页。

## 可选 PNG / PDF 渲染

在插件所在项目或独立技能目录安装：

```bash
npm install --ignore-scripts @deepseek-ai/libreoffice-kit@0.2.3
```

声明为精确版本可选 peer，普通消费者安装不要求引擎。Windows 还需与 Node 架构匹配的 Microsoft Visual C++ v14 运行库。缺失时 `ppt_render` 返回 `unavailable` 和安装提示。

本仓库的 pnpm 依赖覆盖不会传递到消费项目。安装引擎后如审计提示其 `fflate@0.8.2`，在消费项目根配置 `overrides: { "@deepseek-ai/libreoffice-kit": { "fflate": "0.8.3" } }`（npm），或在根 `pnpm-workspace.yaml` 配置 `overrides: { "@deepseek-ai/libreoffice-kit>fflate": "0.8.3" }`，然后重新安装。插件渲染前另有 PPTX/ZIP64 边界校验，但不替代底层依赖更新。

`ppt_render { pptxPath: "report.pptx", format: "both" }` 读取最终 PPTX，生成逐页 PNG、PDF 和 `render-receipt.json`，不重新保存可编辑源文稿。`ppt_check` 可携带返回的 `receiptPath` 作为 `renderReceipt`，核验源文件和每个输出的摘要；编辑源文稿或修改输出后旧收据失效。静态产物不保留动画；LibreOffice 与 PowerPoint/WPS 的排版可能不同。字体诊断不保证每个字符，也不自动安装字体。更多细节见 [渲染说明](../docs/LIBREOFFICE-INTEGRATION-2026-10-01.md)。

CLI 支持 `--slides @slides.json`、`--brand @brand.json`、`--from-office report.xlsx`、`--import-pptx legacy.pptx`、`--one-pager`、`--target-minutes 15`、`--handout`、`--reference-pptx ref.pptx`、`--absorb ref.pptx`、`--template consulting`、`--edit report.json --edits @edits.json --revision 0`、`--undo report.json --revision 1`、`--check report.json`、`--render report.pptx --format both`。收据核验用 `--check report.json --render-receipt path/to/render-receipt.json`；失败返回非零退出码。

## 内置主题（18 套）与 6 套母版骨架

### 6 套差异化母版骨架（`chromeStyle`）

| ID | 名称 | 结构特征 | 默认绑定主题 |
| --- | --- | --- | --- |
| `consulting-classic` | 麦肯锡直角 | 0px 直角卡片 + 左侧强调竖线 + 右上章节胶囊 + 0.75pt 页眉线 | `consulting`、`cobalt-cream`、`financial-ft` |
| `keynote-spatial` | Apple 空间留白 | 无顶部分隔线 + 16pt 留白无边框浮卡 + 极简底栏结论 | `keynote-light`、`bold` |
| `editorial-folio` | 杂志社论书脊 | 顶栏刊号 + 页码移至右上角 + 0px 锐利边线 + 衬线大序号 | `editorial-forest`、`cartesian`、`velvet`、`luxury-noir` |
| `saas-bento` | 黑曜石 Bento | 10pt 圆角 `surface1` 描边网格 + 主卡强调高亮 + 等宽标签 | `linear-dark`、`swiss`、`data`、`soft` |
| `academic-minimal` | 学术顶栏横幅 | Beamer 通栏色带页眉 + 三段学术底栏（来源 \| 章节 \| 页码） | `academic`、`course-sage`、`medical-clean` |
| `gov-ceremonial` | 东方政务双线 | 主金双线页眉 + `【01 · 章节】` 标识 + 对称暖纸卡片 | `exec-jilan`、`exec-palace` |

### 明亮主题（12 套，推荐日常投影、打印、咨询、政务、医疗与学术答辩）

| ID | 名称 | 情绪 | 适用场景 |
| --- | --- | --- | --- |
| `consulting` | 蔚蓝战略（`auto` 商务默认） | 权威 / 清晰 | 管理咨询、商业分析、经营汇报、项目复盘 |
| `cobalt-cream` | 钴蓝简报 | 理性纸感 / 现代简报 | 产品方案、B2B 提案、研究简报、技术方案 |
| `exec-jilan` | 霁蓝政务 | 沉稳 / 权威 | 集团汇报、政企沟通、重大立项 |
| `exec-palace` | 故宫丹宸 | 庄重 / 典雅 | 政务总结、年度述职、庆典与典礼汇报 |
| `academic` | 清澄学术 | 克制 / 规范 | 论文答辩、基金申报、学术研讨会 |
| `editorial-forest` | 森系社论 | 知性 / 叙事 | 行业研究报告、ESG 与趋势白皮书 |
| `cartesian` | 暖石极简 | 极简 / 几何 | 架构评审、工程复盘、设计方法论 |
| `course-sage` | 知行讲义 | 清爽 / 易读 | 课程培训、工作坊、教学讲义 |
| `soft` | 柔和信号 | 温暖 / 人本 | 品牌故事、内部赋能、团队分享 |
| `keynote-light` | 库比蒂诺留白 | 纯净 / 空间留白 | 苹果风产品发布、高端品牌简报 |
| `financial-ft` | 金融时报 | 权威 / 财经纸感 | 财报发布、投研路演、宏观分析 |
| `medical-clean` | 仁心临床 | 洁净 / 严谨 | 临床病例汇报、医药研发、生物健康评审 |

### 深色主题（6 套，推荐大屏发布会、科技路演、奢侈策展与沉浸式演示）

| ID | 名称 | 情绪 | 适用场景 |
| --- | --- | --- | --- |
| `data` | 数据漂移（CLI 兼容默认） | 未来 / 沉浸 | AI、技术发布、实时数据大屏 |
| `swiss` | 瑞士脉冲 | 精准 / 理性 | 数据汇报、SaaS 产品、开发者工具 |
| `velvet` | 天鹅绒标准 | 高级 / 克制 | 高端品牌、投资人闭门路演 |
| `bold` | 极繁大字 | 大声 / 动能 | 发布会金句、活动开场、大事件宣言 |
| `linear-dark` | 黑曜石路演 | 锐利 / 现代 | 现代软件发布、创业融资 Pitch |
| `luxury-noir` | 黑金策展 | 奢雅 / 社论暗调 | 创意 Lookbook、奢侈品牌策展、高端发布 |

完整色板与排版令牌见 `skills/dsh-ppt/references/themes.md`。也可运行 `ppt_themes { preview: true, outputDir: "dist" }` 生成 18 套并排对比页与 SVG 色板卡。

## Markdown 输入规则

- 第一个 `# 标题` → 封面标题；其下第一段 → 封面副标题。
- 每个 `## 小节` → 一页：支持标准 Markdown 列表、引用、表格，也支持语义化指令块自动生成高级版式与专业图示：
  - `::: kpi` / `::: cards` / `::: comparison` / `::: matrix` / `::: process` / `::: callout` / `::: agenda` / `::: gantt` / `::: architecture` / `::: harvey` / `::: tam` / `::: org` → 自动解析为对应结构化卡片、专业图示或哈维球矩阵页。
  - `> [!TAKEAWAY] 一句话核心结论` → 提取为当前页底部强调结论栏（`takeaway`）。
  - `<!-- 来源: ... -->` 或 `<!-- source: ... -->` → 提取为页面来源角注（`source`）；`<!-- 备注: ... -->` → 提取为演讲者备注（`notes`）。
- 没有标题的纯文本 → 第一段作封面，后续每 5 句一页；只有一句话 → 自动生成「封面 → 核心观点 → 结束页」三页完整结构。
- 长表格自动分页：每页重复表头，最多 8 行数据；备注只放第一页。支持 `tableStyle`（`consulting | booktabs | minimal | banded | harvey`），超限会明确提示拆分，短行自动补齐，三种产物数据一致。
- `maxSlides` 计算分页后的总页数；超过限制时先报错，不落盘、不静默删掉中间页。可提高配置上限（最多 120）或拆分文稿。
- 需要精确控制时直接传结构化 `slides`，支持全部 24 种 `layout`、`chrome`、`columns`、`items`、`rows`、`chart`、`image`、`takeaway`、`source` 与 `notes`。

## 配置

插件无必填配置。可选：

```yaml
- id: dsh-ppt
  config:
    outputDir: E:\decks   # 可选；默认会话工作目录
    maxSlides: 40         # 可选；默认 60（3–120）
    defaultTheme: auto    # 可选；ppt_create 未指定 theme 时使用（支持 auto 或 18 套主题 ID）
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
- 图片与原生图表采用 MIT 的 `@office-kit/pptx@0.21.0`；参考 `.pptx` 吸收基于本地 `fflate` + OOXML 安全解析（防 ZIP 炸弹与路径穿越）；可选渲染引擎按需加载。
- 单元测试覆盖注册契约、JSON Schema、18 套主题、6 套母版骨架与自动选型、24 种版式与专业图示、16 套行业蓝图、13 类图表、深度参考 `.pptx` 吸收（`cloneStructure`）、三件套落盘、PPTX 部件完整性、工作台安全边界与 CLI。
- 无 `eval` / `child_process` / 密钥；产物只写用户指定的本地目录。

## 开发

```sh
pnpm install
pnpm run build      # tsc + 客户端工作台打包 → lib/
pnpm test           # 构建 + node --test（注册/配置/引擎/图表/吸收/工作台/CLI）
pnpm run smoke:cli  # 裸 CLI 冒烟，生成 .smoke-deck
```

## 已知限制

- PPTX 采用精确定位原生形状、表格、图表与文本框生成：PowerPoint / WPS / Keynote 中可正常编辑文字与图表数据，但暂不绑定复杂动态母版占位符继承链。
- `ppt_absorb` / `referencePptx`（含 `cloneStructure`）提取参考 `.pptx` 的配色、字体、画幅比例、母版骨架几何与版式序列，不原样复制外部幻灯片的正文文案。
- `bilingual` 只双语化播放器与工作台界面，不自动翻译用户正文内容。
- 按页编辑仅支持本插件 JSON 工程，不直接导入任意外部 PPTX 编辑。
- 静态质量检查包含版面估算与信息密度建议；实际字体替换与像素级排版核验请结合渲染图与视觉检查。

## 协议

插件 MIT；Office Kit MIT；可选官方 LibreOffice Kit 及其引擎保留各自许可、来源与第三方声明。使用官方库不表示本插件由 DeepSeek 官方维护。

## 相关项目

- [dsh-hyperframes](https://github.com/STARDUSTLC666/dsh-hyperframes) — HTML 视频创作技能（本插件视觉风格来源）
- [dsh-remotion](https://github.com/STARDUSTLC666/dsh-remotion) — React 编程式视频技能
- [dsh-email](https://github.com/STARDUSTLC666/dsh-email) — 邮件六件套

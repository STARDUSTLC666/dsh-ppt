# dsh-ppt 工作台 / Workbench

演示文稿主工作台，提供默认 16:9 **实体胶片灯箱总览（Lightbox）** 与三栏 **单页精修（Slide Studio）**、顶栏 **`? 引导`** 四步聚光灯交互导览、空态 **「一键体验旗舰示例」**、`import-office`（直吞 `.xlsx`/`.csv`/`.tsv`/`.docx`/`.pdf`）、自助「新建演示文稿」与「导入 PPTX 翻新」向导、页面栏、画布区与五栏属性面板（内容编辑、风格与母版、视觉检查、演练、数据与推演）；支持一键切换 24 套主题、8 套名家范本预设、6 套母版骨架与 41 种标准版式原型（含 `issue-tree` 议题树、`treemap` 矩形树图、`gauge` OKR 达标仪、`pricing` 报价矩阵、地图、2.5D 等轴测、**Mermaid 流程图/时序图**、`marimekko`、`sankey`、`value-chain`、`swot` 与 LaTeX 原生公式）、**演讲时长预算器（`targetMinutes` 目标时长与超预算标记）**、上传 Office 修改稿导回更新工程（保留撤销历史）、拖拽深度吸收参考 `.pptx`（≤24 MiB）并收藏到「我的品牌库」、导出 **Excel 数据工作簿（`.xlsx`）**、**Word 报告文档（`.docx`）**、**高管质询预案（`.qa-prep.md`）**、**高管一页纸（`.onepager.html`）**、**Remotion 视频分镜包（`.zip`）**、`.handout.md` 演讲讲义、HTML ↔ PPTX 并排对比及画布级视觉修复前后对照，保留跨栏推演联动、未保存保护和画面内全屏退出。

Presentation workbench with default 16:9 **Physical Slide Lightbox** and 3-pane **Slide Studio**, header **`? Guide`** 4-step interactive spotlight tour (`templates/panels/tour.js`), 1-click **Load Flagship Demo** (`create-demo`), **Import Office** (`.xlsx`/`.csv`/`.tsv`/`.docx`/`.pdf` ≤24 MiB), self-service **New presentation** and **Import & Modernize .pptx** wizards, slide rail, split-capable canvas, and five inspector tabs (Edit content, Style Studio, Visual review, Rehearsal, Data and what-if); supports 1-click switching across 24 themes, 8 World-Class Reference Presets, 6 master chrome skeletons, and 41 canonical slide archetypes (including `issue-tree`, `treemap`, `gauge`, `pricing`, `map`, `isometric`, **Mermaid `flowchart`/`sequenceDiagram`**, `marimekko`, `sankey`, Porter `value-chain`, `swot`, and LaTeX `formula` editing), **Speaking-Pace Budgeter (`targetMinutes` & live overrun badges)**, round-trip **Sync Edited .pptx** with undo history, in-memory `.pptx` style & skeleton absorption (`≤24 MiB`) with **My Brand Library**, **Excel Workbook (`.xlsx`)**, **Word Report (`.docx`)**, **Executive Q&A Prep (`.qa-prep.md`)**, **Executive One-Pager (`.onepager.html`)**, **Remotion Storyboard (`.zip`)**, and `.handout.md` downloads, HTML ↔ PPTX side-by-side comparison, and full-width Vision QA diffs.

## 使用 / Use

更新插件并重启 DSH，在原生左侧栏打开工作台；没有固定时可在“更多”中找到。原有“设置”入口继续可用。侧栏排序和固定由 DSH 管理。

Update the plugin, restart DSH and open its native sidebar panel (or More if it is not pinned). The existing Settings entry remains available. DSH owns sidebar order and pinning.

界面跟随宿主中英文和深浅色，保留用户内容原文。窄窗口中先显示列表，打开详情后可返回；编辑器按可用宽度分栏或顺序排列。危险操作需要明确确认，未保存内容不会因切页而静默丢失。

The UI follows host language and theme without translating user content. Narrow master/detail views have a Back action; editors adapt their columns to available space. Destructive actions require confirmation and edits are protected.

## 五栏能力与风格母版 / Inspector tabs and Style Studio

- **页面栏与新建页面 / Slide rail & New slide**：每张页面卡片显示当前版式标签与质量状态圆点；点击「+ 新建页面 / + New slide」可按 KPI、多栏卡片、双栏对比、四象限、流程、甘特图路线图、分层系统架构、哈维球竞品矩阵、TAM/SAM/SOM 同心圆、组织/团队图谱、三线表、核心结论等原型直接追加起始页（上限 120 页，支持排序、复制、删除与撤销）。
  Each slide card shows its layout badge and quality status dot; **+ New slide** appends a localized starter slide for the chosen archetype (up to 120 slides, undoable alongside reorder, duplicate, and delete).
- **内容编辑与一键换版式 / Content inspector & archetype switcher**：顶部一键切换 41 种标准版式原型、变体、单页母版骨架（`chrome`）与疏密模式（`compact | balanced | airy`），自动在要点列表、结构化卡片（`items`，含达标仪 `actual`/`target`/`max`、甘特图 `start`/`span`、时间轴列头 `columns`、团队 `role`、漏斗 `conversion`）和表格（`rows`）之间无损映射草稿；支持切换表格样式（咨询表 `consulting` / 学术三线表 `booktabs` / 极简 `minimal` / 条纹 `banded` / 哈维球矩阵 `harvey`）以及底部结论栏（`takeaway`）和来源角注（`source`）。
  Switch across all 41 canonical archetypes, variants, per-slide `chrome` skeleton, and density modes with lossless draft projection between bullets, structured `items` (including gauge `actual`/`target`/`max`, Gantt `start`/`span`, `columns`, `role`, `conversion`), and table `rows`; edit card fields, `tableStyle` (including `harvey`), `takeaway`, and `source` directly.
- **风格与母版 / Style Studio**：按明亮主题（16 套）与深色主题（8 套）分区展示实时色板和场景标签，支持整套一键换肤、**6 套母版骨架（`brand.chromeStyle`：麦肯锡直角 / Apple 空间留白 / 杂志社论书脊 / 黑曜石 Bento / 学术顶栏横幅 / 东方政务双线）**一键切换、品牌色/字体/页脚/Logo（PNG/JPEG 面板上传）定制，以及拖拽上传参考 `.pptx`（≤24 MiB，仅在内存中解析色板、字体、嵌入 Logo、骨架几何 `extractedSkeleton`、推荐骨架 `recommendedChrome` 与逐页 `slideSkeleton`，绝不读取浏览器传入的任意宿主机本地路径）并一键应用。
  Browse 16 daylight and 8 dark themes with live palette swatches, switch across **6 Master Chrome Skeletons** (`brand.chromeStyle`), edit brand tokens and uploaded PNG/JPEG logos, or drop a reference `.pptx` (`≤24 MiB`, parsed strictly in memory with zero host path access) to preview `extractedSkeleton`, `recommendedChrome`, `slideSkeleton`, and apply extracted colors and recommended styles in 1 click.
- **画布并排对比与问题定位 / Split canvas & clickable findings**：画布顶部支持切换「HTML 预览」「PPTX 渲染页」与「HTML + PPTX 并排对比」；视觉检查记录可在画布中央展开大尺寸「修复前 / 修复后」对照图；点击底部质量问题行可直接跳到对应页码。
  Toggle HTML preview, rendered PPTX pages, or **HTML + PPTX side-by-side** split view; inspect full-width Vision QA before/after comparisons in the center canvas, and click any quality finding row to jump directly to its slide.

## 下载与分享 / Download and share

在项目右上角点击「下载成品」。先保存修改，再选择需要的文件：

- **分享成品包 ZIP**：当前 PPTX、可离线放映的 HTML、逐页 Markdown 讲稿与使用说明；不含 JSON 工程和完整导入材料。分享版 HTML 保留 PPTX 下载入口，移除工程下载入口。原文件不会改变。
- **完整工程包 ZIP**：PPTX、HTML、JSON 工程与使用说明，方便备份或继续编辑。JSON 可能含完整导入材料。
- 也可分别下载 PPTX、HTML、**Excel 数据工作簿（`kind: 'xlsx'`，导出 `.xlsx`）**、**Word 报告文档（`kind: 'docx'`，导出 `.docx`）**、**高管质询预案（`kind: 'qa-prep'`，导出 `.qa-prep.md`）**、**高管一页纸（`kind: 'onepager'`，导出 `.onepager.html`，支持 A4 打印 PDF 与长图战报切换）**、**Remotion 视频分镜包（`kind: 'remotion'`，导出 `.zip` 含 `DeckVideo.tsx` / `slides-data.json` / `remotion-storyboard.json`）**、演讲讲义（`kind: 'handout'`，导出 `.handout.md`）、讲稿 Markdown 或工程。未保存时先保存，旧修订的下载会被拒绝。
- 独立打开导出的 HTML 放映页时，按 **`P`** 可开启双屏演讲者提词台（支持下一页预览、提词字号缩放、单页演讲时长预算、计时器与 **`L` 键虚拟激光笔**）。

分享包里的 HTML、PPTX 备注和讲稿仍保留已绑定的来源摘录与用户填写内容。分包不等于自动脱敏，请按收件人需要选择内容。

Open **Download output** and save edits first. **Share bundle ZIP** contains the current PPTX, offline HTML, Markdown speaker notes and instructions; it omits the project JSON and complete imported materials. **Project bundle ZIP** includes the editable JSON for backup. Original files are preserved. Share output still contains bound source excerpts and authored notes. These downloads never require AI review or a model call.

## 源码 / Source

编辑 `templates/client.js`、`templates/panels/*.js`（含 `editor.js`、`library.js`、`style-studio.js`）与 `templates/workbench-ui.js`，运行 `pnpm run build`。`lib/client.js` 是确定性产物，请随源码提交。公共组件的规范源位于 `dsh-suite/ui/workbench-ui.js`，Suite 的同步脚本显式分发副本；单个仓库可独立构建和安装。

Edit the template sources (`templates/client.js`, `templates/panels/*.js`, `templates/workbench-ui.js`) and run `pnpm run build`. Commit generated `lib/client.js` with source changes. The vendored UI has no Suite runtime dependency.

## 验收范围 / Validation boundary

2026-10-25：Windows、官方 DSH 0.2.1-rc.3 Web，后台 Chrome/Playwright 实际点击和输入；覆盖中英文、浅深色、1536px 与 390px、状态读回与控制台。Browser plugin 不可用，因此使用本地 Playwright。

邮件使用受控 AgentMail HTTP 服务，日历使用受控 CalDAV 协议传输；插件处理器、存储、校验和原生宿主均实际运行。未使用真实邮箱、真实日历账号或付费模型。RSS 访问 Node.js 官方公开来源。PPT 实际生成并渲染 PPTX、下载 ZIP；两个视频插件实际运行官方引擎并播放 MP4。

这些是 Web 共用界面的验收结果，不代表已验收 Electron 专属菜单、系统权限、真实账号、全部外部来源或所有可选模型/引擎。Docker、Slack、钉钉继续按用户约定搁置。

## 工程查找 / Find projects

工程列表可按关键词筛选，并按最近更新、最早更新或自然标题顺序排列；多个词需要同时匹配。PPT 只查目录中的标题和工程路径（目录同时缓存主题、页数与修订号供快速预览）；视频查标题、正文和模板，当前列表与归档列表各自保留筛选条件。清空搜索会恢复完整列表，返回工程库会保留刚才的搜索和排序。筛选只在本机列表中执行，不读取未选工程的完整文件，也不修改工程内容。

Search the local project list and sort by newest update, oldest update or natural title. Multiple terms must all match. PPT searches catalog titles and paths (while caching theme, slide count, and revision metadata in the catalog); video searches titles, text and templates, with separate active/archive filters. Clear restores the full list; returning from editing preserves filters. Filtering does not load unselected project files or change project contents.

---
name: dsh-ppt
description: "Turn one sentence, a zero-material research topic, a Markdown document, structured slides, Office files (.xlsx/.csv/.docx), or a benchmark .pptx corpus into a world-class presentation deck: standalone HTML web slideshow (with Dual-Screen Presenter Console & Executive One-Pager) + 100% native-editable PPTX (with 20 Curated Gold Exemplars & Slot-Filling Contracts, Zero-Material Research-to-Deck Planner, Verified Evidence Ledger & SLOP-13 Fact-Grounding Gate, Deterministic Weak-LLM Compensator & Zero-LLM Self-Repair Loop, Visual & Map Intelligence: World/China Dotted Strategic Maps, 2.5D Isometric Stack & Pillars, Procedural Cover Artwork waves/isometric-mesh/editorial-arcs, Smart Visual Brief slots, Focal-Point Crop & Full-Bleed Contrast Scrim, 8 Curated Taste Recipes, 61 native <a:custGeom> vector icons, device mockups, 9-language syntax-highlighted code terminals, Magic Quadrant, Radar, Dumbbell, Heatmap, native <m:oMath> formulas, Mermaid flowcharts/sequences, Marimekko, Sankey, Porter Value Chain, SWOT) + project manifest + Speaker Handout. Supports batch .pptx exemplar ingestion, 24 themes, 6 Master Chrome Skeletons, 37+ native-editable layouts, 20 industry blueprints, 13 publication-grade charts, and bilingual ZH/EN support. 中文：内置 20 套标杆范本、零资料深度调研与 SLOP-13 事实出处门禁、全球/中国矢量点阵地图、2.5D 等轴测信息图、高定封面矢量底纹与智能配图协作槽位，让任意模型稳定输出出版级可编辑演示文稿。"
compatibility: "Node ^22.19.0 or >=24.0.0. Images/charts/PPTX absorption use @office-kit/pptx@0.21.0; optional data models use jsep@1.4.0 and csv-parse@6.1.0. Optional PNG/PDF renderer: @deepseek-ai/libreoffice-kit@0.2.3 (bundled by DSH 0.2.2+; 0.1.5 also supported). Cross-harness: copy the full directory and run npm install --ignore-scripts there."
allowed-tools: "Bash, Read, Write, Edit"
---

# dsh-ppt

一句话、一篇文档、一组数据或一份参考 `.pptx` → **大师级可交付演示文稿（独立 HTML 网页放映 + 100% 原生可编辑 PPTX + 工程 JSON）**。本文件负责审美总纲、路由与交付纪律；具体语法与色板按需读取 `references/`。

## 触发条件

用户要做 PPT / 幻灯片 / 演示文稿 / deck / keynote / 汇报 / 述职 / 提案 / 路演 / 答辩 / 课件 / 培训材料，或希望吸收某份参考 `.pptx` 的母版配色与风格来制作新文稿。

## 核心审美哲学：品味内建（零品味负担）

普通用户无法分辨底层版式栅格、对比度或图表噪音——**你就是首席艺术总监，默认输出必须直接达到麦肯锡咨询 / Apple 发布会 / Nature 学术答辩 / 现代故宫霁蓝政务水准**：

1. **零追问场景定调（Zero-Question Auto-Director）**：用户说“帮我做个汇报 PPT”时，**不要反问一堆设计参数**。直接根据内容语义识别六大画像（商业咨询、政务述职、学术答辩、科技路演、教育讲义、人文品牌），传 `theme: 'auto'` 或显式匹配 24 套大师主题（含 `bcg-emerald`、`economist-brief`、`venture-daylight`、`stripe-craft`、`aurora-stage`、`obsidian-amber`、`keynote-light`、`financial-ft`、`medical-clean`、`luxury-noir`）。**明亮投影优先**：会议室汇报、政企述职、学术答辩、教学课件一律优先选用 16 套浅底主题（通用默认 `consulting` 蔚蓝战略），绝不在常规办公场景盲目套用纯黑赛博风 `data`！并按场景自动匹配 **6 套差异化母版骨架（`chromeStyle`：`consulting-classic` / `keynote-spatial` / `editorial-folio` / `saas-bento` / `academic-minimal` / `gov-ceremonial`）**，彻底告别「一套模板换颜色」。
2. **结论先行（Action Titles）**：除封面、目录与章节页外，每页标题必须是**完整的结论判断句**（如「异步评审将工程师周均例会耗时压缩 75%」），严禁使用「项目背景」「数据分析」「周末到馆人次」等空洞名词标签。
3. **版式节奏与反要点墙（Anti-Bullet-Wall）**：优先传**结构化 `slides`**（或使用 `::: kpi / cards / comparison / process / chevron / matrix / callout / gantt / architecture / harvey / tam / org` 指令）充分利用 **24+ 套原生版式与专业图示**。**整套文稿严禁连续超过 2 页使用普通 `bullets` 要点列表**；8 页以上文稿须有节奏地交替视觉密度（指标用 `kpi`、端到端价值链用 `chevron`、排期用 `gantt`、系统分层用 `architecture`、竞品能力用 `harvey`、市场空间用 `tam`、组织团队用 `org`、并列支柱用 `cards[pillars/bento]`、痛点整改用 `comparison[issue-action]`、演进/闭环用 `process[timeline/steps/flywheel/funnel]`、四象限用 `matrix`、数据配洞察用 `chart-split`、学术对比用 `table[booktabs]` 三线表）。
4. **出版级图表与三线表**：单系列图表自动隐藏冗余图例，使用 `spotlight: true` / `highlight: 'max' | 'last'` 突出焦点色柱、其余灰阶退后，按需叠加 `referenceLine` 基准虚线与 `showGrowthCallout: true` 麦肯锡增长飞线批注，左下角附 `source` 数据来源；学术与严谨数据对比使用无竖线的 `booktabs` 三线表。
5. **20 套标杆范本槽位填空 + 标杆弧线重排（`alignOrder: true`）+ 零模型自检修复闭环**：不要从零发明排版！直接传 `exemplar: 'auto'` 智能匹配或从内置 **20 套标杆范本**（8 套核心场景 + 12 套源自 Apache-2.0 / MIT / CC-BY-4.0 开源 GitHub 优质 `.pptx` 经实机渲染甄选蒸馏的标杆：`mckinsey-evolution` / `luxury-budget-review` / `swiss-bauhaus-workshop` / `dark-stage-investor` / `blueprint-ai-factory` / `warm-brand-story` / `ted-storytelling-keynote` / `msft-enterprise-discovery` / `daylight-earnings-research` / `okr-performance-review` / `quiet-canvas-keynote` / `medical-clinical-course`）中择一，先调 `ppt_templates({ exemplarId })` 获取逐页槽位契约、满分标题示范与 **Few-Shot JSON 样板**，再按槽位调用 `ppt_create({ exemplar, alignOrder: true, ... })`；引擎内置 **确定性弱模型补偿器 + 落盘前两轮 `checkManifest`/`SLOP-01..12` 零模型自检修复闭环（`autoUpgrade`，默认开启）**，即使输入为乱序粗糙 `bullets` / 碎块饼图 / 超载指标 / 刺眼配色也能以 0 额外模型开销 100% 无损升维并修复至零告警成品。用户手头有优质 GitHub / 企业 `.pptx` 目录时，直接调 `ppt_absorb({ pptxPath: "<目录路径>" })`（或 CLI `--ingest-exemplars <dir>`）批量投喂至 `.dsh-ppt/exemplars.json` 与 `.dsh-ppt/taste-recipes.json` 持久化复用。
6. **8 套大师品味配方（Taste Recipes）与单份母版吸收**：无外部模板时也可独立选用 `taste: 'mckinsey-partner' | 'apple-keynote-dark' | 'apple-keynote-light' | 'swiss-editorial' | 'linear-craft' | 'ft-data-journal' | 'nature-academic' | 'oriental-zen'` 驱动 4 套海报封面、4 种卡片材质与 61 枚原生矢量图标；单份标杆 `.pptx` 用 `ppt_absorb`（`saveTasteAs` / `saveExemplarAs`）或 `referencePptx` + `cloneStructure: true` 吸收。

## 执行纪律（每次都要遵守）

- **默认零额外模型开销直接交付**：不自动触发 AI 预审、模拟答辩或视觉看图修复。用户可在 DSH 设置页主动开启可选 AI 预审/答辩或「视觉检查与修复」（支持最高 24 页全量审查与 12 种无损版式/字号修复）；AI 演练不等于事实核验，不编造实验、数据或引用；采纳建议默认另存副本，原件保留。模型失败、截断、停止或未检查页面必须如实说明，不能声称视觉通过。
- **数字溯源与推演纪律**：需要解释数字来源或现场滑块推演时，提供 `dataModel` 并在 `slides`（含 `items`、`takeaway`、`source`、`chart`）绑定 `{{metricId}}`；先读 `references/data.md`。`source` 必须对应真实材料行或单元格，假设用 `kind: 'input'` 标注，禁止虚构来源。修改数据先 `ppt_data(action: 'preview')`，展示差异并获确认后带凭证 `apply`（默认 `saveAs: true`）。
- **工程安全与版本锁**：修改已有工程先 `ppt_check` 获取当前 `revision` 与页面 ID。外部手工改过的 HTML/PPTX 或缺少校验记录的旧工程不可被 `ppt_edit` 静默覆盖；若用户在 PowerPoint / WPS 中修改了 `.pptx` 并希望同步回工程，请使用 **`ppt_import`（传 `projectId`）或 CLI `--sync-pptx`**，自动在 `.history/` 留存快照并用 `ppt_undo` 可逆回导；需要全新翻新外部 `.pptx` 时使用 `ppt_import`（CLI `--import-pptx`）。风格提取仍可使用只读 `ppt_absorb` / `referencePptx`。
- **字体与跨平台零缺字**：正文最小字号硬底线 `13.5pt`，超长内容必须拆页而非强行缩字。若 `ppt_render` 报告 `missingFonts` 非空，必须替换为环境与接收方可用字体（Windows `Microsoft YaHei`、macOS `PingFang SC`/`Songti SC`、Linux `Noto Sans/Serif CJK SC`），重新生成并逐页复核；未解决前不得声称已验收。CLI 与工具报错信息统一为中文。
- **语言分工**：`lang`（`zh | en | bilingual`）仅控制播放器界面与默认标签；正文与双语表达由你在写作阶段完成。

## 核心流水线（双模路由）

- **Mode A（有资料直出）**：用户已给出文档、大纲、表格、数据或参考 `.pptx` 时，零追问自动定调并直接生成可交付三件套。
- **Mode B（零资料深研策划）**：用户**没有资料**、只给主题或明确要求「你去搜索资料、核验准确性、先策划 PPT 方案再生成」时，**严禁凭训练记忆编造具体统计数字**！必须先读 `references/research-plan.md`，按四步闭环执行：① 调 `ppt_templates({ topic })`（或 CLI `--plan`）获取标杆分镜与 3 轮检索指南 → ② 用宿主 Agent 联网搜索工具开展 3 轮一手源检索与双源交叉核验，沉淀 `evidence[]` 账本（冲突报区间、缺数改定性图示）→ ③ 向用户展示策划方案（含核验事实摘要与逐页分镜表）并获确认（除非用户明示跳过确认直出）→ ④ 带 `evidence[]` + `evidenceAppendix: true` + `slides[].evidenceIds` 调 `ppt_create` 出稿并通过 `SLOP-13` 事实出处门禁。

1. **Probe & Auto-Direct 定调**：读入用户句子/文档/数据（或 Mode B 核验后的证据账本），静默判定听众与六大画像（见 `references/themes.md`）。若用户给了参考 `.pptx`，调 `ppt_absorb` 查看提取结果或在创建时传 `referencePptx`。Mode A 一句话输入不反问，直接推断并生成完整成品。
2. **Storyline & Choreography 叙事与排布**：先读 `references/copywriting.md`。按金字塔原理 / SCQA 组织 5–16 页大纲，为每页撰写结论先行 Action Title、章节面包屑 `kicker`（如 `01 · 市场诊断`，禁止满屏重复「要点」）、底栏核心结论 `takeaway` 与数据出处 `source`，并规划多版式交替节奏。可调 `ppt_templates` 参考 **20 套行业结构蓝图**（`weekly | defense | project | pitch | consulting | keynote | gov-report | workshop | architecture-review | financial-earnings | medical-case | postmortem | marketing-campaign | promotion-review | legal-compliance | creative-lookbook | quarterly-okr | product-prd | vc-daylight | industry-research`）。
3. **Theme 选主题与骨架**：不确定时在 `ppt_create` 传 `theme: 'auto'`（自动路由至明亮高质感场景主题与匹配骨架），或从 **24 套内置主题**中精确指定（调 `ppt_themes` 查看），并可通过 `brand.chromeStyle` 或单页 `chrome` 覆盖 6 套母版骨架。
   - **重要 CLI 差异**：跨 harness 直接运行 `build-deck.mjs` 时，裸 CLI 缺省 `--theme` 为兼容旧脚本仍回退 `data`，因此 **CLI 调用请务必显式传 `--theme auto` 或具体场景主题 ID（如 `--theme consulting` / `--theme exec-jilan`）**！
4. **Build 生成**：先读 `references/syntax.md`（用到图表/多图/外源母版/编辑时读 `references/advanced.md`）。
   - **推荐方式（DSH 内）**：调 `ppt_create`，优先传结构化 `slides`（精确控制 **24 种原生版式**含 `gantt / architecture / harvey / tam / org / kpi / cards / comparison / matrix / process / chart-split / table[booktabs] / callout`），或传带 `:::` 指令与 `**加粗引导词**：说明` 的 Markdown `content`。
   - **跨 harness CLI**：`node <skill-dir>/scripts/build-deck.mjs --title "标题" --slides @slides.json --theme auto --lang zh --out dist`（直吞 Excel/CSV/Word 可用 `--from-office report.xlsx --theme auto --target-minutes 10 --one-pager --out dist`；吸收参考模板并克隆结构可加 `--reference-pptx ref.pptx --clone-structure`；显式骨架用 `--chrome academic-minimal`；仅提取风格用 `--absorb ref.pptx`）。
   - 动效默认 `motion: 'on'`（HTML 页间淡入 + PPTX 要点点击逐条出现）；严肃政企公文、学术打印或归档传 `motion: 'off'`。
5. **Verify 校验与看图修正**：调 `ppt_check` 检查结构、字数密度、WCAG 对比度与 `SLOP-01..10` 审美告警。若安装了 `@deepseek-ai/libreoffice-kit`，调 `ppt_render` 生成逐页 PNG/PDF 并附 `renderReceipt` 复检，逐张用看图工具核查画面（0 缺字、0 溢出、0 遮挡、0 冗余图例）。微调文字、切换主题、更新 `mermaid` 或调整 `targetMinutes` 配速预算用 `ppt_edit`（带 `expectedRevision`），需要时 `ppt_undo`。静态估算、渲染成功与视觉验收必须分开如实陈述。
6. **Deliver 交付**：向用户提供 `.html`、`.pptx`、`.json`（默认严格保持三件套，仅在传 `--handout` / `--one-pager` 时同步落盘 `.handout.md` / `.onepager.html`）绝对路径，说明 HTML 快捷键（`← →` 翻页 · **`P` 开启双屏演讲者提词台含逐页配速预算** · **`L` 开启虚拟激光笔** · `F` 全屏 · `G` 总览 · `S` 顶部备注 · `Ctrl/Cmd+P` 打印）及检查面板内置「下载讲义 (.md)」与「下载一页纸战报 (.html)」（支持 A4 打印与长图战报切换）离线导出；说明 PPTX 100% 原生可编辑特性（含 `<m:oMath>` 原生公式、Marimekko、桑基流向图、波特价值链、SWOT、Mermaid 原生流程图/时序图、三线表与图表工作簿），以及支持 `ppt_import` / `--sync-pptx` 从 Office 改稿回导同步工程、`ppt_from_office` / `--from-office` 直吞 `.xlsx/.csv/.tsv/.docx`。

## 按需装载索引

| 何时必读 | 参考文件 | 核心内容 |
| --- | --- | --- |
| **零资料联网调研、核验准确性与先策划再出稿** | `references/research-plan.md` | 双模路由、3 轮定向检索法、Tier 1/2/3 交叉核验红线、`evidence[]` 账本、分镜策划确认与 `SLOP-13` 门禁 |
| 按标杆范本槽位填空或批量投喂 `.pptx` 语料 | `references/exemplars.md` | 20 套标杆范本槽位契约、`ppt_templates(exemplarId)`、批量 `--ingest-exemplars` 与弱模型升维补偿器 |
| 写大纲、标题与正文前 | `references/copywriting.md` | 六大画像叙事骨架、Action Title 写法、字数预算、反空话与双语规范 |
| 选主题、配色、骨架或吸收母版 | `references/themes.md` | 18 套大师主题色板（12 浅 6 深）、6 套母版骨架（Chrome）、18 语义 Token、六大画像选型树 |
| 写结构化 `slides` 或扩展 Markdown | `references/syntax.md` | 24 套原生版式与专业图示 + `variant`、统一 `items` 结构、`:::` 容器指令、三线表与 `takeaway` |
| 图表、图片、吸收 `.pptx`、编辑与渲染 | `references/advanced.md` | 13 类出版级图表、瀑布图、`ppt_absorb`/`referencePptx`/`cloneStructure`、16 套蓝图、Vision QA 与 CLI |
| 数字溯源、公式与现场推演 | `references/data.md` | `dataModel` 源绑定、公式约束、全字段 `{{metricId}}` 联动与预览确认流 |
| 遇到报错或渲染异常 | `references/troubleshooting.md` | 症状 → 根因与处理速查表 |

## 质量与反土味门禁（SLOP-01..13，交付前逐项核对）

- [ ] **SLOP-01 结论标题**：内容页与图表页标题均为完整判断句（Action Title），无「项目背景 / 数据图表 / 总结」等纯名词短标题。
- [ ] **SLOP-02 章节面包屑**：`kicker` 体现章节脉络（如 `01 · 增长引擎`），未连续多页硬编码重复「要点 / Point」。
- [ ] **SLOP-03 拒绝要点墙**：单页普通 bullets ≤ 5 条；无连续 > 2 页 `bullets` 版式，并列信息已升格为 `kpi / cards / comparison / process / matrix`。
- [ ] **SLOP-04 字号与字数底线**：正文绝不低于 `13.5pt`；单条要点中文 ≤ 24 字（英文 ≤ 14 词），卡片正文中文 ≤ 40 字，引导词使用 `**关键词**：说明` 形成层级。
- [ ] **SLOP-05 图文对齐与呼吸感**：配图采用圆角细框对齐或 `split-bleed` 半屏出血，正文列垂直居中，无「左上角两行字 + 大片死白」。
- [ ] **SLOP-06 出版级图表与三线表**：单系列图表无冗余图例，网格线 ≤ 5 条细灰线，关键柱已用 `highlight` 聚焦并带直接数值标签；学术表格采用 `booktabs` 无竖线三线表；数据页左下角有真实 `source` 说明（未虚构出处）。
- [ ] **SLOP-07 投影安全与对比度**：会议/政务/学术/培训优先浅底主题；政务风杜绝刺眼纯红底配黄字；正文与背景对比度 ≥ 4.5:1，HTML 与 PPTX 主题完全一致。
- [ ] **SLOP-08 版式多样性**：≥ 6 页的文稿至少组合 4 种不同版式原型，封面与封底不误印页码。
- [ ] **SLOP-09 可执行收尾**：`closing` 页包含明确的下一步行动号召（CTA / 里程碑 / 联络方式），绝不仅写两个字「谢谢」。
- [ ] **SLOP-10 真实性与跨平台完备**：无未填占位草稿（除非用户明确要求空模板并标注 `draft`），全部产物为工作区绝对路径；若已运行渲染，确认 `missingFonts: []` 且收据匹配最新 PPTX。
- [ ] **SLOP-11/12 卡片材质节奏与图表聚光灯**：长篇文稿避免连续 ≥ 4 页等宽方框卡片；单系列 ≥ 5 项柱状/条形图须通过 `highlight` / `spotlight` / `referenceLine` 聚焦核心主角。
- [ ] **SLOP-13 事实出处与证据账本卫生**：严禁「数据来源：网络整理 / 公开资料 / 综合整理」等空洞假出处；零资料调研模式下所有量化数据页均须绑定已核验 `evidenceIds`（或一手 `source`），无悬空 `[E#]` 引用，`unverified` / `conflicting` 证据必须在画面可见文案中如实注明口径差异或区间。

## 跨 harness 安装

把整个 `skills/dsh-ppt` 目录复制到目标 Agent 的技能目录，在 Node `^22.19.0 || >=24.0.0` 下执行 `npm install --ignore-scripts`。18 套主题与 19 套零依赖原生版式/图示纯 Node 内置模块即可运行；图片、13 类图表与外部 `.pptx` 吸收使用已声明的 `@office-kit/pptx@0.21.0`；PNG/PDF 渲染按需安装 `@deepseek-ai/libreoffice-kit`：

| Agent | 技能目录 / 安装命令 |
| --- | --- |
| DeepSeek Harness | `dsh plugin --profile desktop add dsh-ppt`（网页版用 `web`） |
| Claude Code | `~/.claude/skills/dsh-ppt` |
| Cursor | `.cursor/skills/dsh-ppt` |
| Gemini CLI | `~/.gemini/skills/dsh-ppt` |
| OpenAI Codex | `~/.codex/skills/dsh-ppt` |

一次编写，处处交付大师级品味。

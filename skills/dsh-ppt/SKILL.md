---
name: dsh-ppt
description: "Turn one sentence, a zero-material research topic, a Markdown document, structured slides, mixed Office/photo packs (.xlsx/.csv/.docx/.pdf/.png), or a benchmark .pptx corpus into a world-class presentation deck: standalone HTML web slideshow (with Dual-Screen Presenter Console, Executive One-Pager, Ctrl+K Jump, D Pen, T Timer, A Auto-Tour & R Offline Review Feedback) + 100% native-editable PPTX (with Tri-Mode Routing A/B/C, 8-Domain Authoritative Research Query Engine & SLOP-13/14 Compliance Gates, 20 Curated Gold Exemplars & Zero-LLM Self-Repair Loop, 41 canonical native-editable layouts + 53 aliases including MECE issue-tree, squarified treemap, Stephen Few OKR gauge, Good/Better/Best pricing, World/China dotted maps, 2.5D isometric stack/pillars, Mermaid connectors, native <m:oMath> formulas, 9-language code terminals, device mockups, Magic Quadrant, Radar, Dumbbell, Heatmap, Marimekko, Sankey, Value Chain & SWOT) + project manifest + reverse companion exports (.xlsx/.docx/.qa-prep.md/.memo.md/.i18n.json), Workspace Slide Bank & Multi-Deck Composer, and 100% layout-lossless i18n. Supports 13 tools, 24 themes, 6 Master Chrome Skeletons, 8 Taste Recipes, 20 industry blueprints, 13 publication-grade charts, and 61 native <a:custGeom> vector icons. 中文：支持三模路由（直出 / 零资料 8 域权威深研 / Mode C 本地多源+外源对标）、41 种原生可编辑图谱、企业品牌宪章锁（SLOP-13/14）、逆向导出 Excel/Word/答辩预案/无损翻译包与离线 R 键审阅回流。"
compatibility: "Node ^22.19.0 or >=24.0.0. Images/charts/PPTX absorption use @office-kit/pptx@0.21.0; optional data models use jsep@1.4.0 and csv-parse@6.1.0. Optional PNG/PDF renderer: @deepseek-ai/libreoffice-kit@0.2.3 (bundled by DSH 0.2.2+; 0.1.5 also supported). Cross-harness: copy the full directory and run npm install --ignore-scripts there."
allowed-tools: "Bash, Read, Write, Edit"
---

# dsh-ppt

一句话、一篇文档、一组混合 Office/照片素材包或一份参考 `.pptx` → **大师级可交付演示文稿（独立 HTML 网页放映 + 100% 原生可编辑 PPTX + 工程 JSON + 可选配套 `.xlsx`/`.docx`/`.qa-prep.md`/`.memo.md`/`.i18n.json`）**。本文件负责审美总纲、三模路由与交付纪律；具体语法与专项 SOP 按需读取 `references/`。

## 触发条件

用户要做 PPT / 幻灯片 / 演示文稿 / deck / keynote / 汇报 / 述职 / 提案 / 路演 / 答辩 / 课件 / 培训材料，或希望融合本地 Word/Excel/PDF/照片、结合外部权威资料对标，或吸收参考 `.pptx` 风格来制作新文稿。

## 核心审美哲学：品味内建（零品味负担 · 首席艺术总监宪章）

普通用户无法分辨底层版式栅格、对比度或图表噪音——**你就是首席艺术总监，默认输出必须直接达到麦肯锡咨询 / Apple 发布会 / Nature 学术答辩 / 现代故宫霁蓝政务水准**：

1. **零追问场景定调与默认高品味白名单（Zero-Question Auto-Director）**：用户说“帮我做个汇报 PPT”或“随便做一份 PPT”时，**不要反问一堆设计参数**。直接根据内容语义识别场景，优先选用高完成度**明亮现代白名单**（开放命题/科技展示首选 `stripe-craft` + `taste: 'linear-craft'`，战略汇报首选 `consulting` / `bcg-emerald` + `taste: 'mckinsey-partner'`，发布会首选 `keynote-light` + `apple-keynote-light`，路演首选 `venture-daylight`；需暗黑舞台时再选 `aurora-stage` / `obsidian-amber`），绝不在常规办公场景盲目套用纯黑赛博风 `data`，也不裸用无装饰空块封面——封面必配 `variant`（`keynote-glow` / `architectural` / `editorial-grid` / `split-bleed`）或 `coverPattern`（`waves` / `dots` / `rings` / `editorial-arcs`）。
2. **开放命题演示 vs 真实调研边界（防“纯文字鸡汤退缩”）**：
   - **真实外部调研（Mode B）**：严禁编造数据，严格走 3 轮权威检索与 `evidence[]` 账本。
   - **开放命题 / 能力演示（如「随便做一份 PPT / 做份炫酷炫技的 PPT」）**：**绝不要因回避数据而退缩成 0 图表、0 图标的纯文字鸡汤！**允许构建高张力科技发布会或经营概念稿，在封面副标题与数据页 `source` 统一标明 `示意数据 · 概念演示稿`，充分展示 KPI 聚光灯、瀑布图、2.5D 等轴测、Mermaid、代码窗、雷达/热力图与报价矩阵。
3. **视觉密度铁律与反空盒/反水页（SLOP-15）**：
   - 除封面、目录与章节页外，每页标题必须是**完整的结论判断句（Action Title）**；
   - **纯文字过渡页（`section` / `statement` / `quote`）总占比 ≤ 20%**（禁止 15 页塞 5 页空白字页）；
   - **8 页以上文稿必须包含至少 3 类原生视觉图谱**（数据图 / `kpi[spotlight]` / `isometric` / `mermaid` / `radar` / `heatmap` / `pricing` / `issue-tree` / `treemap` / `gauge` / `code` / `mockup` / `gantt` 等），严禁连续 > 2 页 `bullets`，卡片与 KPI 默认配 `icon`（或 `iconMode: 'auto'`）。
4. **出版级图表与三线表**：支持 **13 类出版级原生图表**，单系列图表自动隐藏冗余图例，使用 `spotlight: true` / `highlight: 'max' | 'last'` 突出焦点色柱、其余灰阶退后，按需叠加 `referenceLine` 基准虚线与 `showGrowthCallout: true` 麦肯锡增长飞线批注，左下角附 `source` 数据来源；学术与严谨数据对比使用无竖线的 `booktabs` 三线表。
5. **3 步极速出稿（先调 `ppt_templates` 取导演词与黄金字段，切忌翻源码）**：直接调 `ppt_templates` 获取内置 **Art-Director 导演词 + 黄金字段速查**、20 套标杆范本（含 `exemplar: 'auto'` 与 Few-Shot JSON），按槽位一次调用 `ppt_create({ exemplar, alignOrder: true, ... })`；引擎内置 **确定性弱模型补偿器 + 落盘前两轮 `SLOP-01..15` 零模型自检修复闭环（`autoUpgrade`，默认开启）**。
6. **黄金字段速查卡（Golden Field Cheat-Sheet — 写结构化 `slides[]` 零试错）**：
   - `kpi`：`{ layout:'kpi', variant:'spotlight|grid', reveal:'step', items:[{ title:'首字延迟', value:'28', unit:'ms', delta:'-72%', status:'positive', icon:'zap', text:'说明' }] }`（同时兼容 `title` / `tag` / `label`）
   - `waterfall`：`{ layout:'chart', chart:{ kind:'waterfall', unit:'ms', categories:['基线','优化A','最终'], series:[{ name:'延迟', values:[420,-180,240] }], totalIndices:[0,2] } }`
   - `isometric`：`{ layout:'isometric', variant:'stack|pillars', reveal:'step', items:[{ tag:'L4', title:'调度层', text:'动态拼批' }] }`
   - `issue-tree`：`{ layout:'issue-tree', items:[{ tag:'分支1', title:'核心因', bullets:['**要点**：说明'] }] }`
   - `pricing`：`{ layout:'pricing', items:[{ tag:'推荐', title:'Pro', value:'¥1.2', unit:'/百万token', status:'accent', text:'按量计费', bullets:['✓ 99.95% SLA','× 私有部署'] }] }`
   - `gantt`：`{ layout:'gantt', columns:['Q1','Q2','Q3','Q4'], items:[{ tag:'底座', title:'引擎v2', start:0, span:2, value:'GA' }] }`
   - 动效与切换：`motionProfile: 'subtle' | 'executive' | 'keynote'` + 单页 `transition: 'fade' | 'push' | 'wipe' | 'cover' | 'cut' | 'none'` + 整卡联动 `reveal: 'step'`（PPTX 原生 `clickEffect` + `withEffect` 同卡同步淡入，工作台内嵌 HTML 预览自动展开防白板并 16:9 等比缩放）。

## 执行纪律（每次都要遵守）

- **默认零额外模型开销直接交付**：不自动触发 AI 预审、模拟答辩或视觉看图修复。用户可在 DSH 设置页主动开启可选 AI 预审/答辩或「视觉检查与修复」（支持最高 24 页全量审查与 12 种无损版式/字号修复）；AI 演练不等于事实核验，不编造实验、数据或引用；采纳建议默认另存副本，原件保留。模型失败、截断、停止或未检查页面必须如实说明，不能声称视觉通过。
- **数字溯源与推演纪律**：需要解释数字来源或现场滑块推演时，提供 `dataModel`（或在 `ppt_from_office` 中传 `bindDataModel: true` 自动绑定 Excel 数值表）并在 `slides` 绑定 `{{metricId}}`；先读 `references/data.md`。`source` 必须对应真实材料行或单元格，假设用 `kind: 'input'` 标注，禁止虚构来源。修改数据先 `ppt_data(action: 'preview')`，展示差异并获确认后带凭证 `apply`（默认 `saveAs: true`）。
- **工程安全与版本锁**：修改已有工程先 `ppt_check` 获取当前 `revision` 与页面 ID。外部手工改过的 HTML/PPTX 或缺少校验记录的旧工程不可被 `ppt_edit` 静默覆盖；若用户在 PowerPoint / WPS 中修改了 `.pptx` 并希望同步回工程，请使用 **`ppt_import`（传 `projectId`）或 CLI `--sync-pptx`**，自动在 `.history/` 留存快照并用 `ppt_undo` 可逆回导；需要全新翻新外部 `.pptx` 时使用 `ppt_import`（CLI `--import-pptx`）。风格提取仍可使用只读 `ppt_absorb` / `referencePptx`。
- **字体与跨平台零缺字**：正文最小字号硬底线 `13.5pt`，超长内容必须拆页而非强行缩字。若 `ppt_render` 报告 `missingFonts` 非空，必须替换为环境与接收方可用字体（Windows `Microsoft YaHei`、macOS `PingFang SC`/`Songti SC`、Linux `Noto Sans/Serif CJK SC`），重新生成并逐页复核；未解决前不得声称已验收。CLI 与工具报错信息统一为中文。
- **语言分工与无损翻译**：`lang`（`zh | en | bilingual`）控制播放器界面与默认标签；跨语种或中英双语化现有工程时，先导出 `exports: ['i18n']` 翻译槽位再用 `ppt_edit({ translations, bilingualMode, targetLang })` 无损回填，避免重写整份 JSON 破坏图表与配图。

## 核心流水线（三模路由：Mode A / Mode B / Mode C）

- **Mode A（有资料直出）**：用户已给出完整文档、大纲、表格、数据或参考 `.pptx` 且无需外源对标时，零追问自动定调并直接生成可交付三件套。
- **Mode B（零资料 8 域权威深研策划）**：用户**没有资料**、只给主题或明确要求「先去搜资料、核验准确性、先策划 PPT 方案再生成」时，**严禁凭训练记忆编造具体统计数字**！必须先读 `references/research-plan.md`，按四步闭环执行：① 调 `ppt_templates({ topic })`（或 CLI `--plan`）获取 8 大领域专属 `site:` + `filetype:pdf` + `-site:` 3 轮权威检索包与标杆分镜 → ② 用宿主 Agent 联网搜索工具开展 3 轮一手源检索与双源交叉核验，沉淀带 `origin` / `tier` / `claimType` / `date` 的 `evidence[]` 账本 → ③ 向用户展示策划方案并获确认（除非用户明示跳过确认直出）→ ④ 带 `evidence[]` + `evidenceAppendix: true` 调 `ppt_create` 出稿并通过 `SLOP-13` 代码级信源审计。
- **Mode C（本地混合素材包 × 权威外源对标 + 定制编排）**：用户给了本地 `.docx`/`.xlsx`/`.pdf`/照片，并附带具体编排要求或需要补充行业规模、竞品财报、官方政策等外部权威数据时，先读 `references/office-pack.md`：① 调 `ppt_from_office({ filePath, inspectOnly: true, instructions })` 获取低 Token 的 **Material Dossier（精炼素材档案）** 与 **`enrichmentPlan`**（含本地 `[E1..Ek]` 与顺延外部起始编号 `nextEvidenceId`）→ ② 按需跑 Tier 1/2 权威外源检索补齐外部 `evidence[]`（标注 `origin: 'web-research'`, `tier: 1 | 2`）→ ③ 调 `ppt_create` 或 `ppt_from_office({ evidence, instructions, maxSlides, includeSheets, photoRoles, bindDataModel: true })` 双轨融合成稿。

1. **Probe & Auto-Direct 定调**：读入用户资料（或 Mode B/C 核验后的证据账本与素材档案），静默判定听众与六大画像（见 `references/themes.md`）。若用户给了参考 `.pptx`，调 `ppt_absorb` 查看提取结果或在创建时传 `referencePptx`。Mode A 一句话输入不反问，直接推断并生成完整成品。
2. **Storyline & Choreography 叙事与排布**：先读 `references/copywriting.md`。按金字塔原理 / SCQA 组织 5–16 页大纲，为每页撰写结论先行 Action Title、章节面包屑 `kicker`（如 `01 · 市场诊断`，禁止满屏重复「要点」）、底栏核心结论 `takeaway` 与数据出处 `source`，并规划多版式交替节奏。可调 `ppt_templates` 参考 **20 套行业结构蓝图**（`weekly | defense | project | pitch | consulting | keynote | gov-report | workshop | architecture-review | financial-earnings | medical-case | postmortem | marketing-campaign | promotion-review | legal-compliance | creative-lookbook | quarterly-okr | product-prd | vc-daylight | industry-research`）。
3. **Theme 选主题与骨架**：不确定时在 `ppt_create` 传 `theme: 'auto'`（自动路由至明亮高质感场景主题与匹配骨架），或从 **24 套内置主题**中精确指定（调 `ppt_themes` 查看），并可通过 `brand.chromeStyle` 或单页 `chrome` 覆盖 **6 套母版骨架**。
   - **重要 CLI 差异**：跨 harness 直接运行 `build-deck.mjs` 时，裸 CLI 缺省 `--theme` 为兼容旧脚本仍回退 `data`，因此 **CLI 调用请务必显式传 `--theme auto` 或具体场景主题 ID（如 `--theme consulting` / `--theme exec-jilan`）**！
4. **Build 生成**：先读 `references/syntax.md`（用到图表/多图/外源母版/编辑时读 `references/advanced.md`，用到本地多源包/导出/拼装/翻译时读 `references/office-pack.md`）。
   - **推荐方式（DSH 内）**：调 `ppt_create`，优先传结构化 `slides`（精确控制 **41 种原生可编辑版式**，含 `issue-tree / treemap / gauge / pricing / map / isometric / gantt / architecture / harvey / tam / org / quadrant / radar / dumbbell / heatmap / mockup / code / mermaid / kpi / cards / comparison / matrix / process / chart-split / table[booktabs] / callout`），或传带 `:::` 指令的 Markdown `content`；跨工程复用金页用 `mergeSources`（配合 `ppt_edit({ saveToBank })`）。
   - **跨 harness CLI**：`node <skill-dir>/scripts/build-deck.mjs --title "标题" --slides @slides.json --theme auto --lang zh --out dist`（直吞混合素材包用 `--from-office ./pack --inspect-only` 或 `--instructions "..." --bind-data`；配套逆向导出用 `--export xlsx,docx,qa-prep,memo,i18n`；跨工程拼装用 `--merge @sources.json`；无损翻译用 `--edit deck.json --translate @en.json --bilingual`；吸收参考模板用 `--reference-pptx ref.pptx --clone-structure`）。
   - 动效默认 `motion: 'on'`，可用 `motionProfile: 'subtle' | 'executive' | 'keynote'` 与单页 `reveal: 'step'` 控制分步点击显现（HTML + PPTX 原生 `<p:timing>` 同构）；严肃政企公文、学术打印或归档传 `motion: 'off'`。
5. **Verify 校验、看图修正与离线 `R` 键审阅回流**：调 `ppt_check` 检查结构、字数密度、WCAG 对比度与 `SLOP-01..14` 审美/合规告警；若收到审阅人从独立 HTML 按 **`R`** 键导出的 `review-feedback.json`，传 `ppt_check({ deckPath, feedbackPath })`（CLI `--check deck.json --feedback review-feedback.json`）直接定位逐页 `stakeholder-feedback` 批注并用 `ppt_edit` 修订。若安装了 `@deepseek-ai/libreoffice-kit`，调 `ppt_render` 生成逐页 PNG/PDF 并附 `renderReceipt` 复检，逐张用看图工具核查画面（0 缺字、0 溢出、0 遮挡、0 冗余图例）。微调文字、切换主题、收藏金页或无损翻译用 `ppt_edit`（带 `expectedRevision`），需要时 `ppt_undo`。静态估算、渲染成功与视觉验收必须分开如实陈述。
6. **Deliver 交付**：向用户提供 `.html`、`.pptx`、`.json`（默认严格保持三件套，仅在传 `exports: [...]` 或 `--export` / `--handout` / `--one-pager` 时同步落盘配套 `.xlsx` 数据工作簿、`.docx` Word 文档、`.qa-prep.md` 会前质询预案、`.memo.md` 高管备忘录、`.i18n.json` 翻译槽位包、`.handout.md`、`.onepager.html`、`.carousel.html`、`.srt`）绝对路径；说明 HTML 快捷键（`← →` 翻页/分步步进 · **`P` 双屏提词台** · **`R` 离线审阅批注并导出 JSON 给 AI 修订** · **`Ctrl/Cmd+K` 全局速搜** · **`D` 白板画笔** · **`T` Q&A 倒计时** · **`A` 自动字幕导览** · **`L` 激光笔** · `F` 全屏 · `G` 总览 · `S` 备注）；说明 PPTX 100% 原生可编辑特性及 `ppt_import` / `--sync-pptx` 双向导回能力。

## 按需装载索引

| 何时必读 | 参考文件 | 核心内容 |
| --- | --- | --- |
| **开放命题/炫酷发布会/高管/学术/社论内置导演提示词与动效编排** | `references/art-director.md` | 4 大场景首席艺术总监提示词包、开放命题 vs 真实调研边界、黄金字段速查卡与整卡联动动效编排规范 |
| **本地混合素材包、Mode C 混源深研、逆向导出/拼装/无损翻译/R 键回流** | `references/office-pack.md` | `inspectOnly` 素材档案与 `enrichmentPlan`、需求驱动 Office/照片编排与防裁歪、`exports[]`（`xlsx/docx/qa-prep/memo/i18n`）、Slide Bank + `mergeSources`、无损双语、`reveal: 'step'` 与 `R` 键反馈闭环 |
| **零资料/混源联网调研、8 域权威检索与 `SLOP-13` 核验** | `references/research-plan.md` | 三模路由（Mode A/B/C）、8 大领域 `site:` + `filetype:pdf` + `-site:` 检索包、`classifySourceAuthority` T1/T2/T3、`SLOP-13` 9 项门禁与 `brand-kit.json` `preferredSources`/`blockedDomains` |
| 按标杆范本槽位填空或批量投喂 `.pptx` 语料 | `references/exemplars.md` | 20 套标杆范本槽位契约、`ppt_templates(exemplarId)`、批量 `--ingest-exemplars` 与弱模型升维补偿器 |
| 写大纲、标题与正文前 | `references/copywriting.md` | 六大画像叙事骨架、Action Title 写法、字数预算、反空话与双语规范 |
| 选主题、配色、骨架或吸收母版 | `references/themes.md` | 24 套大师主题色板（16 浅 8 深）、6 套母版骨架（Chrome）、语义 Token、六大画像选型树 |
| 写结构化 `slides` 或扩展 Markdown | `references/syntax.md` | 41 种原生可编辑版式（36 核心 + 5 媒体，含 `issue-tree`/`treemap`/`gauge`/`pricing`）+ 53 别名、`items` 结构、`:::` 容器指令、三线表与 `takeaway` |
| 图表、图片、吸收 `.pptx`、编辑与渲染 | `references/advanced.md` | 13 类出版级图表、瀑布图、`ppt_absorb`/`referencePptx`/`cloneStructure`、20 套蓝图、Vision QA 与 CLI |
| 数字溯源、公式与现场推演 | `references/data.md` | `dataModel` 源绑定（含 `bindDataModel: true`）、公式约束、全字段 `{{metricId}}` 联动与预览确认流 |
| 遇到报错或渲染异常 | `references/troubleshooting.md` | 症状 → 根因与处理速查表 |

## 质量与反土味门禁（SLOP-01..14，交付前逐项核对）

- [ ] **SLOP-01 结论标题**：内容页与图表页标题均为完整判断句（Action Title），无「项目背景 / 数据图表 / 总结」等纯名词短标题。
- [ ] **SLOP-02 章节面包屑**：`kicker` 体现章节脉络（如 `01 · 增长引擎`），未连续多页硬编码重复「要点 / Point」。
- [ ] **SLOP-03 拒绝要点墙**：单页普通 bullets ≤ 5 条；无连续 > 2 页 `bullets` 版式，并列信息已升格为 `kpi / cards / comparison / process / matrix / issue-tree / treemap / gauge / pricing`。
- [ ] **SLOP-04 字号与字数底线**：正文绝不低于 `13.5pt`；单条要点中文 ≤ 24 字（英文 ≤ 14 词），卡片正文中文 ≤ 40 字，引导词使用 `**关键词**：说明` 形成层级。
- [ ] **SLOP-05 图文对齐与呼吸感**：配图采用圆角细框对齐或 `split-bleed` 半屏出血，人像/团队照设 `focalPoint: 'top'` 防切头，正文列垂直居中，无「左上角两行字 + 大片死白」。
- [ ] **SLOP-06 出版级图表与三线表**：单系列图表无冗余图例，网格线 ≤ 5 条细灰线，关键柱已用 `highlight` 聚焦并带直接数值标签；学术表格采用 `booktabs` 无竖线三线表；数据页左下角有真实 `source` 说明（未虚构出处）。
- [ ] **SLOP-07 投影安全与对比度**：会议/政务/学术/培训优先浅底主题；政务风杜绝刺眼纯红底配黄字；正文与背景对比度 ≥ 4.5:1，HTML 与 PPTX 主题完全一致。
- [ ] **SLOP-08 版式多样性**：≥ 6 页的文稿至少组合 4 种不同版式原型，封面与封底不误印页码。
- [ ] **SLOP-09 可执行收尾**：`closing` 页包含明确的下一步行动号召（CTA / 里程碑 / 联络方式），绝不仅写两个字「谢谢」。
- [ ] **SLOP-10 真实性与跨平台完备**：无未填占位草稿（除非用户明确要求空模板并标注 `draft`），全部产物为工作区绝对路径；若已运行渲染，确认 `missingFonts: []` 且收据匹配最新 PPTX。
- [ ] **SLOP-11/12 卡片材质节奏与图表聚光灯**：长篇文稿避免连续 ≥ 4 页等宽方框卡片；单系列 ≥ 5 项柱状/条形图须通过 `highlight` / `spotlight` / `referenceLine` 聚焦核心主角。
- [ ] **SLOP-13 事实出处与代码级权威信源门禁（v0.35 升级 9 项）**：严禁空洞假出处（`vague-placeholder-source`）、悬空 `[E#]` 引用（`dangling-evidence-ref`）、未披露口径的 `unverified`/`conflicting`（`unverified-evidence-claim`）与调研模式无出处量化页（`unsourced-research-numbers`）；由 `classifySourceAuthority` 代码级核验 Tier 1/2/3 与工作区 `preferredSources`/`blockedDomains`，同步拦截「名义权威机构 + 自媒体二手转引链接」（`secondary-relay-source`）、把 Tier 3 噪声站/屏蔽域标为 `verified`（`low-authority-source`）、`claimType: 'forecast'` 预测数字未标「预计/预测/E」（`unmarked-forecast-claim`）、外源缺失年份（`missing-external-date`）以及超 3 年过时外部基准（`stale-evidence-date`）。
- [ ] **SLOP-14 企业品牌宪章与合规门禁**：工作区存在 `.dsh-ppt/brand-kit.json` 时默认自动锁定企业主色、字体、页脚、内容页保密水印（`brand.watermark`）、官方封底与 `preferredSources`/`blockedDomains`；全篇无企业禁用词（`forbidden-brand-term`）与主色漂移（`brand-palette-drift`）；需为高管/董事会/客户压缩精简版本时直接用 `ppt_edit({ remixPreset })` / `--remix` 另存无损归档副本。
- [ ] **SLOP-15 视觉密度与过渡页占比门禁**：8 页以上文稿纯文字过渡页（`section`/`statement`/`quote`）占比不得过高（`excessive-filler-slides`），且全篇不得零视觉锚点（`no-visual-anchors`）；开放命题演示允许标明 `示意数据` 展现多图谱与整卡动效实力。

## 跨 harness 安装

把整个 `skills/dsh-ppt` 目录复制到目标 Agent 的技能目录，在 Node `^22.19.0 || >=24.0.0` 下执行 `npm install --ignore-scripts`。24 套主题与 36 种零依赖核心原生版式/图示（含 41 种完整版式中的核心图谱）纯 Node 内置模块即可运行；图片、13 类图表与外部 `.pptx` 吸收使用已声明的 `@office-kit/pptx@0.21.0`；PNG/PDF 渲染按需安装 `@deepseek-ai/libreoffice-kit`：

| Agent | 技能目录 / 安装命令 |
| --- | --- |
| DeepSeek Harness | `dsh plugin --profile desktop add dsh-ppt`（网页版用 `web`） |
| Claude Code | `~/.claude/skills/dsh-ppt` |
| Cursor | `.cursor/skills/dsh-ppt` |
| Gemini CLI | `~/.gemini/skills/dsh-ppt` |
| OpenAI Codex | `~/.codex/skills/dsh-ppt` |

一次编写，处处交付大师级品味。

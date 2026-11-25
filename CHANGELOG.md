# 更新记录

## 1.0.5 (2026-11-26)

- **视觉工艺、HTML/PPTX 同构与图表精度**：修复跨主题 WCAG 对比度（深浅色标签与 Mermaid 节点反白可读性）、瀑布图基线对齐与标签避让、中国 7 枢纽地图标注防碰撞、Mermaid 六边形/平行四边形原样渲染、英文版 `gauge` 达标仪本地化、封面/母版 Logo 去重以及 `reveal: 'step'` 分步点击显现编组精度。
- **AI 生成链路、Auto-Director、`SLOP-15` 与工具瘦身**：修复数值被误改写（如千分位 `3,850` 完整保留）、Prompt/范本边界异常与 `splitLead()` 误截断 `$...$` 公式问题，保护含二维 LaTeX 公式的 `bullets` 页不被误升格；显式主题同步支持 `autoUpgrade`/`smartLayout`/`selfRepair`；精简 `ppt_templates` Schema 与响应体积，并同步校准 `SLOP-15` 门禁、视觉/教练评估及 `SKILL.md`/`references/*` 文档。
- **工作台 UI/UX、布局自适应与双语补全**：修复切页签卸载丢状态与灯箱未保存直存横幅，补齐 Sankey/KPI `value`/`unit` 等结构化字段与上限控制、品牌色/Logo 清除防复生、单页 `Alt+←/→` 快捷键直达、新建弹窗内联报错、1120px 顶栏标签与设置预览置顶对齐、4 分组下载弹窗（含英文宽版零裁切）及 20+ 项英文翻译与 `' / '` 双语切分。
- **Office 导入、Mode B 双向同步、Remotion 与逆向 `.docx` 加固**：加固 PPTX/DOCX/XLSX/CSV/PDF 导入与 WebP 兼容，完善 Mode B 分页表格与 `dataModel` 回流同步、Remotion `.tsx` 导出包零语法错编译、逆向 `.docx` `<w:tblGrid>` 列宽网格及放映 HUD 自动隐藏。
- **Visual Craft & HTML↔PPTX Parity**: improves WCAG contrast across themes and Mermaid shapes (preserving hexagon/parallelogram geometry), waterfall baseline grounding, collision-free China 7-hub map labels, EN `gauge` localization, logo deduplication, and `reveal: 'step'` click-group accuracy.
- **AI Generation, Auto-Director, `SLOP-15` & Schema Slimming**: prevents numeric corruption (e.g. `3,850`), prompt/exemplar crashes, and `$...$` math-span splitting in `splitLead()` (preserving 2D LaTeX `bullets` slides); enables `autoUpgrade`/`smartLayout`/`selfRepair` with explicit themes; slims `ppt_templates` tool schema/payload; and aligns `SLOP-15`, coaching/visual QA, and `SKILL.md` / `references/*`.
- **Workbench UI/UX, Layout & i18n**: eliminates tab-switch unmount loss, adds Lightbox dirty-save banner, wires missing archetype `value`/`unit` inputs, fixes brand color/logo clearing, restores immediate `Alt+←/→` navigation, surfaces inline Create modal errors, anchors Settings preview, introduces a 4-section Download dialog (zero EN clipping), and adds 20+ EN translations.
- **Office Import, Mode B Sync, Remotion & Reverse `.docx`**: hardens PPTX/DOCX/XLSX/CSV/PDF & WebP ingestion, paginated Mode B `dataModel` round-trip sync, clean Remotion `.tsx` bundling, reverse `.docx` `<w:tblGrid>` widths, and presenter HUD auto-hide.

## 1.0.4 (2026-11-25)

- 修复新建/导入工程弹窗的双列表单排版：为 `.ppt-create-grid` 补充 `align-items: start`，避免下拉选择与数字输入框纵向拉伸错位。
- Fix two-column form alignment in the create/import wizard dialog by adding `align-items: start` to `.ppt-create-grid`.

## 1.0.3 (2026-11-24)

- **移入前文件预览 + 被占用一键回退 + 批量整理**：移除弹窗实时扫描并列出将移入系统回收站的 `.pptx` / `.html` / `.json` 文件，同时标明保留不动的 `.handout.md` 与 `.history/`；文件被 PowerPoint / WPS 占用或位于网络共享盘时弹窗保持打开并高亮 **「改用仅移出列表（保留文件）」**；列表页新增 **「批量整理」** 多选勾选模式，支持批量移出列表或批量移入系统回收站（中途遇占用自动保护剩余未移入工程）。
- **Windows 单进程批量回收站加速与网络盘拦截**：`movePathsToTrash` 在 Windows 下通过单次 `powershell.exe` 进程解析对象列表批量移入回收站（3–6 文件总耗时约 0.7 秒），遇被占用文件立即中止并明确拒绝 `\\server\share` UNC 网络路径；同时修复回退模态框在 `container-type: inline-size` 下宽度塌缩问题。
- **File preview, locked-file 1-click fallback, and batch cleanup**: the Remove dialog lists exact `.pptx`/`.html`/`.json` files and untouched `.handout.md`/`.history/` extras, promotes a 1-click **Use remove from list only** fallback on Recycle Bin errors, and adds a multi-select **Batch organize** mode (`remove-projects`, `trash-projects`).
- **Single-process Windows Recycle Bin batching & modal layout fix**: batch multiple paths in one PowerShell invocation with UNC path rejection, and prevent fallback modal `0px` inline-size collapse.

## 1.0.2 (2026-11-24)

- 解决 Issue #11：项目列表每行新增「移除」弹窗，支持 **「仅移出列表（保留文件）」** 与 **「移入系统回收站」** 双选项；移入回收站采用零依赖跨平台系统原生回收站（Windows / macOS / Linux），拒绝符号链接并按 `.pptx → .html → .json` 安全顺序移入，避免文件被占用时孤立工程记录。
- 外部删除原文件自动同步：列表刷新自动隐藏缺失 `.json` 的记录，窗口切回（`focus` / `visibilitychange`）与列表页 8 秒轻量静默扫描自动让缺失条目消失；未扫到前点击打开返回结构化 `404 project_missing` 并自动移除，未扫到前手动点击移除/移入回收站可 0 报错干净清理。
- Resolve #11: add a row Remove dialog with two choices — **Remove from list only (keep files)** and **Move to system Recycle Bin / Trash** (zero-dep native OS trash on Windows/macOS/Linux, symlink refusal, safe `.pptx → .html → .json` order).
- Auto-hide externally deleted projects on refresh, window focus/visibility return, and lightweight 8s background sync; return structured `404 project_missing` on stale open and allow clean zero-error manual removal before the next scan.

## 1.0.1 (2026-11-24)

- 修复 Mermaid 流程图导出 PPTX 后，绕线的回路与节点脱离的问题。回路线保留绕开节点的路径，两端连接到对应的节点形状。
- Restore node attachments on routed Mermaid feedback connectors in exported PPTX while preserving the route around intervening nodes.

## 1.0.0 (2026-11-24)

首个正式稳定大版本发布，整合全部 41 种原生可编辑图谱、24 主题、20 标杆范本、三层内置艺术总监提示词与 `SLOP-15` 视觉门禁、整卡联动 PPTX 动效、16:9 灯箱工作台及全套逆向 Office 导出，并重点补齐实机验证暴露的中西文排版同构与关键渲染精度问题：

- **中西文 HTML/PPTX 排版全面适配（`deck-core.mjs` / `deck-layouts.mjs` / `deck-covers.mjs` / `deck-delivery.mjs` / `deck-chrome.mjs`）**：
  - 彻底移除 HTML 样式中按西文半角 `0` 宽度计算的 `max-width: 22ch/24ch/26ch/28ch/34ch/52ch/64ch` 截断陷阱（此前中文封面仅 ~11 字、页标题仅 ~17 字即被迫提前折行），统一改为自适应百分比 / `em` 宽度与 `text-wrap: balance`，并新增 `:is(html:lang(zh),html:lang(ja),html:lang(ko))` 中日韩专属字阶、`line-break: strict` 与内嵌 `is-scaled-stage` 比例对齐；西文文稿继续保持平衡排版与宽阔版面。
  - 在 PPTX `computeTextFit()` 中为多行 CJK 文本（≥3 行）补充 `1.07×` 纵向行高安全余量，兼顾 Windows PowerPoint/WPS 微软雅黑真实字框高度而不压缩单双行标题。
- **代码页跨渲染器零溢出修复（`deck-showcase.mjs`）**：
  - 修复 PowerPoint/WPS 下 `<a:spcPct>` 乘以 `Consolas (1.17×)` 与 `微软雅黑 (1.32×)` 真实字框导致 12 行代码末行溢出暗色圆角代码窗底边的错位问题：全面切换为绝对磅值行距 `<a:spcPts>`，新增 CJK 双宽列数测算（`measureCodeColumns`）与安全高度预算，确保 1–22 行中英混排代码在 PowerPoint、WPS、Keynote 与 LibreOffice 中完全对齐且零溢出；
  - 同步为 HTML `.code-stage` / `.code-window` 补充 `min-height: 0` 与按行数/列宽动态下发的 `--code-fs` / `--code-lh`，杜绝 16:9 舞台下代码区挤出底部结论栏。
- **Mermaid 流程图外圈 U 型回路避障路由（`deck-mermaid.mjs`）**：
  - 修复 `flowchart LR/RL/TD/BT` 中反馈回路边（及跨层直穿遮挡边）横向穿过中间节点框的问题：检测到回路边时自动预留外圈净空槽道并按上/下（或左/右）独立泳道生成 4 点正交 U 型路径（PPTX 原生 `<p:cxnSp>` 圆帽线段 + HTML 平滑圆角 SVG `<path>`），边标签精准落于外圈通道中段，零穿框、零叠字。
- **v1.0.0 General Availability — Bilingual CJK/Western Parity, Code-Window Overflow Fix & Mermaid Loop Routing**:
  - Replaces Latin-biased `ch` max-width caps (`22ch–64ch`) across HTML decks & one-pagers with `em`/`100%` measures, `text-wrap: balance`, and dedicated `:is(html:lang(zh),html:lang(ja),html:lang(ko))` CJK scaling rules (for both fullscreen and `is-scaled-stage` preview), plus subtle multi-line CJK vertical safety in PPTX `computeTextFit()`.
  - Switches PPTX `code` slides from renderer-drifting `<a:spcPct>` to deterministic absolute `<a:spcPts>` line spacing with CJK double-width column calculation (`measureCodeColumns`), eliminating bottom-border overflow in PowerPoint/WPS for 1–22 lines of mixed code, and adds adaptive `--code-fs`/`--code-lh` + `min-height: 0` in HTML.
  - Adds non-overlapping outer U-channel obstacle-avoiding routing for Mermaid `flowchart` back-edges and inline skip-rank blockers across both PPTX and HTML SVG.

## 0.37.0 (2026-11-24)

- **三层按需内置「首席艺术总监」提示词体系与 `SLOP-15` 视觉密度门禁（0 非 PPT 对话 Token 开销）**：
  - **工具描述微提示（`src/tools.ts`）**：在 `ppt_create` / `ppt_templates` 描述中注入默认审美白名单与开放命题直出提示，防模型跳过 Skill 退化成纯文字要点墙或光秃秃默认封面；
  - **首席艺术总监宪章 + 20 行黄金字段速查（`SKILL.md`）**：明确划分「Mode B 真实调研（严禁编数）」与「开放命题 / 能力演示（允许标明『示意数据 · 概念演示稿』充分展示多图谱视觉实力）」，内联 6 大高频图谱黄金字段速查，消除模型反复翻源码试错；
  - **场景导演提示词包（`references/art-director.md` + `buildArtDirectorPrompt`）**：`ppt_templates` 自动返回按 `showcase` / `consulting` / `academic` / `editorial` 匹配的高品味导演词 `directorPrompt` 与 `goldenFields`；新增 **`SLOP-15`** 门禁拦截纯字过渡页占比过高（`excessive-filler-slides`）与长稿零视觉锚点（`no-visual-anchors`）。
- **整卡联动 PPTX 原生动效 + 单页级切换过渡（`deck-core.mjs` / `src/types.ts` / `src/tools.ts`）**：
  - 升级 `reveal: 'step'` 的 PPTX `<p:timing>` 引擎（`extractStepRevealGroups`）：按卡片包围盒自动将底框、图标、指标名、大数字、徽章与说明归组为同一点击批次（主卡片 `clickEffect` + 同卡子元素 `withEffect` 并行淡入），彻底修复此前「文字悬空、点击只弹底框」的动效割裂问题；
  - 新增单页 `transition`（`'fade' | 'push' | 'wipe' | 'cover' | 'cut' | 'none'`）与 `motionProfile: 'keynote'` 智能混合过渡编排（封面/章节柔和 `fade`、图表 `wipe`、正文 `push`），HTML 与 PPTX 双端同构。
- **默认品味升级、空盒版式重构与 5 项实机视觉 Bug 修复**：
  - **`kpi` 双端兼容 `title || tag || label`**（`deck-layouts.mjs`）：修复仅传 `tag` 时 `kpi[grid]` 与 `kpi[spotlight]` 指标标题在 HTML 与 PPTX 同时丢失的问题，并收紧卡片垂直留白；
  - **`waterfall` 近零负值防撞轴**（`deck-media.mjs` + `deck-advanced.mjs`）：修复贴近 0 轴的负柱数据标签压穿 X 轴线与分类文字的问题（柱体足够高则内嵌反白，短柱自动上翻至柱顶）；
  - **圆角高光卡边角精修**（`deck-chrome.mjs` + `deck-infographics.mjs` + `deck-media.mjs`）：收紧圆角卡片顶栏、`isometric[stack]` 侧轨与圆角 `Takeaway` 胶囊左轨的内缩半径，消除边角露尖与顶侧重影；
  - **工作台内嵌 HTML 预览零白板 + 16:9 等比缩放**（`deck-core.mjs` + `deck-layouts.mjs`）：检测 `iframe` / `?preview=1` 自动挂 `body.is-embedded` 展开 `reveal: 'step'` 防止首屏白板，窄视口（`<1040px` 或内嵌框）自动启用 `body.is-scaled-stage` 按 1280×720 等比缩放，彻底解决窄侧边栏 Mermaid 缩扁、`callout`/`code`/`closing` 纵排溢出的问题；
  - **重塑 `editorial-forest` 质感与空盒版式**（`deck-themes.mjs` + `deck-covers.mjs` + `deck-layouts.mjs` + `deck-diagrams.mjs`）：升级为 Kinfolk 暖纸白 `#FAF8F3` + 纯白画廊卡片 `#FFFFFF` + 松木绿/暖雪松青铜；默认浅色/社论封面右侧自动绘制无 LibreOffice 半透明方框伪影的同心几何环与版次签；`statement`、`quote`、`process[steps]` 改为按内容长度动态定高消除 70% 死白，`gantt` 左栏胶囊提对比度并统一色系，`closing[cta-cards]` 扩宽并消除 1 字孤字断行；`deck-absorb.mjs` 自动忽略封面装饰图元保持 100% 母版识别精度。
- **3-Layer Built-in Art-Director Prompts, `SLOP-15` Density Gates, Whole-Card PPTX Animations, Embedded 16:9 HTML Preview & Real-World Rendering Fixes**:
  - Adds zero-overhead 3-layer built-in art-director prompts (`src/tools.ts` hints, `SKILL.md` Art-Director Constitution + 20-line Golden Field Cheat-Sheet, and `references/art-director.md` + `buildArtDirectorPrompt` auto-returned by `ppt_templates`), clearly distinguishing Mode B strict sourcing from open-ended capability showcases (`Illustrative Data`), plus `SLOP-15` (`excessive-filler-slides`, `no-visual-anchors`).
  - Upgrades PPTX `reveal: 'step'` to group each card's surface + child text/value/icon shapes via `clickEffect` + `withEffect`, and adds per-slide `transition` (`fade|push|wipe|cover|cut|none`) with smart `keynote` transition choreography across HTML and PPTX.
  - Fixes 5 real-world visual bugs: `kpi` `title || tag || label` fallback (HTML + PPTX), near-zero negative `waterfall` label collision, rounded card top-bar & `isometric` rail corner bleed, embedded HTML preview `is-embedded` step auto-reveal + `is-scaled-stage` 16:9 proportional scaling, and `editorial-forest` ivory/white facelift + architectural cover rings + compact `statement`/`quote`/`process[steps]`/`gantt`/`closing` proportions.

## 0.36.1 (2026-11-23)

- **工作台逆向 Office 导出与 4 套高管图谱全链路接线**：
  - GET `/api/dsh-ppt/download` 与下载弹窗完整接入 `.xlsx`（Excel 数据工作簿）、`.docx`（Word 报告文档）与 `.qa-prep.md`（高管质询预案），并补充正确 MIME 类型与双语报错映射。
  - 修复 `itemsPatch()` 与前端 `save()` 静默丢弃 `gauge` 达标仪 `actual`/`target`/`max` 数值字段的问题；补齐 `issue-tree`、`treemap`、`gauge`、`pricing` 后端 `starterSlide()` 及前端 41 种版式目录（`PPT_LAYOUT_CATALOG`）、35 项快速加页菜单与结构化编辑器控件；加固 `originVerdict` 对桌面端 `dsh-app://app` 的 `Sec-Fetch-Site` 与伪造 Origin 校验。
- **离线 HTML 快捷键协调、技能包版本对齐与文档同步**：协调含 `dataModel` 离线 HTML 中的 `D` 键冲突（`D` 打开数据推演、`Shift+D` 切换白板标注；普通文稿保持 `D` 切换白板标注），更新内置快捷键提示（`V/P` 演讲者提词台）；同步 `skills/dsh-ppt/package.json` 至 `0.36.1`，刷新 `cordis.patch.yml`、`src/tools.ts`、旗舰示例文案及 `REFERENCE`/`WORKBENCH`/`USAGE`/`README.en.md`。
- **Workbench Reverse Office Exports, Complete 41-Layout Executive Chart Wiring & Hotkey Fix**:
  - Wired `.xlsx`, `.docx`, and `.qa-prep.md` reverse exports end-to-end into GET `/api/dsh-ppt/download` (with OOXML/Markdown MIME types) and the workbench Download dialog.
  - Fixed `itemsPatch()` and client `save()` dropping `actual`/`target`/`max` on `gauge` slides; added `issue-tree`, `treemap`, `gauge`, and `pricing` to `starterSlide()`, the 41-layout `PPT_LAYOUT_CATALOG`, `pptSlideAddOptions()`, and structured editors; hardened `originVerdict` for DSH Desktop `dsh-app://app`.
  - Resolved offline HTML `D` hotkey conflict when `dataModel` is bound (`D` for Data What-If, `Shift+D` for Whiteboard Pen; unchanged `D` without `dataModel`), synced `skills/dsh-ppt/package.json` to `0.36.1`, and refreshed bilingual docs and unit tests.

## 0.36.0 (2026-11-22)

- **实体胶片灯箱工作台（`灯箱总览` 默认进入 + `单页精修` 一键切换）**：
  - 打开任意演示文稿工程默认进入发光桌面级 **16:9 实体胶片灯箱（`灯箱总览`）**：每页幻灯片以透光 16:9 胶片卡片呈现，带胶片页码印章、版式徽标、质量指示点、拖拽 / `← →` 一键调序、原地复制与 `+16:9` 全部 31 种版式快速加页卡片；点击任意胶片卡片即可平滑跃入 **`单页精修`**（`document.startViewTransition`，完整尊重 `prefers-reduced-motion`）。
  - 完整保留 `0.35.0` 的全部能力（8 大领域权威信源检索、`SLOP-13/14`、三模路由、41 种图谱、逆向 Office 导出、企业金页库、无损翻译、离线 `R` 键审阅及 `@stardustlc/dsh-updates 0.2.10` 更新条）。
- **交互引导、英文顶栏适配与文档焕新**：同步升级工程库与灯箱/单页双态 4 步「? 引导」聚光灯导览，优化英文工程顶栏标签排布避免截断，并刷新双语 README、使用说明、8 张浅深色流程示意图与最新工作台实景截图。
- **Physical Slide Lightbox Workbench (`Lightbox` default + 1-click `Slide Studio` toggle)**: opening any deck lands on an illuminated 16:9 drafting-table Lightbox with slide stamps, layout badges, quality dots, drag/`←→` reorder, duplicate, and `+16:9` 31-archetype starter card; clicking any transparency transitions smoothly into `Slide Studio` (with `prefers-reduced-motion` support). Includes updated 4-step `? Tour`, crisp English header layout, and refreshed bilingual docs, workflow SVGs, and screenshots while preserving 100% of `0.35.0` capabilities.

## 0.35.0 (2026-11-22)

- **8 大领域权威信源检索引擎、代码级信源审计（`SLOP-13` 升级 9 项）与三模路由（`deck-evidence.mjs` + `deck-brand-kit.mjs`）**：
  - 内置 8 大专业领域权威域名白名单（`AUTHORITATIVE_DOMAINS`：`gov-macro`、`finance-filings`、`ai-tech`、`medical-clinical`、`energy-climate`、`academic-science`、`consumer-retail`、`general-business`）与 25 站噪声/二手转引黑名单（`NOISE_DOMAINS`）；`detectResearchDomain` 与 `buildAuthoritativeQueryPack` 按选题自动产出自带 `site:` + `filetype:pdf` + `-site:` 排除营销号的 3 轮定向权威检索包；
  - 新增 `classifySourceAuthority` 代码级自动定级 Tier 1/2/3 并扩展 `evidence[]` 治理字段（`origin: 'local-file' | 'web-research'`、`tier: 1 | 2 | 3`、`claimType: 'actual' | 'forecast' | 'policy' | 'benchmark'`）；`SLOP-13` 升级为 9 项零误报审计，新增拦截名义权威机构却挂自媒体二手转引链接（`secondary-relay-source`）、Tier 3 噪声站或工作区屏蔽域冒充已核验（`low-authority-source`）、预测口径未标「预计/预测/E」（`unmarked-forecast-claim`）、外源缺失年份（`missing-external-date`）及超 3 年过时外部基准（`stale-evidence-date`）；`.dsh-ppt/brand-kit.json` 新增 `preferredSources`（自动提级 T1）与 `blockedDomains`（自动拦截并注入 `-site:`）；
  - 技能协议升级为 **三模路由（Mode A 有资料直出 / Mode B 零资料 8 域深研 / Mode C 本地混合素材包 × 权威外源对标）**，新增 `skills/dsh-ppt/references/office-pack.md` 并全面刷新 `research-plan.md` 与 `SKILL.md`。
- **Mode C 本地素材包精炼体检（`inspectOnly`）与需求驱动 Office / 照片智能编排（`deck-office.mjs`）**：
  - `ppt_from_office({ inspectOnly: true })`（CLI `--inspect-only`）以极低 Token 输出 **Material Dossier**（Excel 极值统计与推荐图型、Word/PDF 章节提纲与 `.docx` 内嵌图缓存、照片像素/方向/焦距建议、本地 `[E1..Ek]` 账本）与 **`enrichmentPlan`**（外部权威支柱缺口诊断、顺延编号 `nextEvidenceId` 与精准检索式），配合 `mergeHybridEvidence` 实现本地与外源双轨零冲突溯源；
  - 新增 `instructions` 自然语言编排（页数预算/跳过目录/指定封面或样机图/焦点词加权）、`maxSlides` 权重预算、`includeSheets` 工作表筛选、`photoRoles` 显式照片角色映射，以及 `bindDataModel: true`（CLI `--bind-data`）自动将 Excel 数值表绑定至 `dataModel` `{{metricId}}` 供 `ppt_data` 实时刷新；零依赖 PNG/JPEG/WebP 二进制头解析自动为竖屏/人像/团队照设 `focalPoint: 'top'` 防切头，移动端与浏览器/看板截图自动归位 `mockup[mobile|browser]`。
- **4 套高管咨询级原生矢量图谱（`deck-charts-exec.mjs` — 41 种标准版式 + 53 别名）与 HTML CSS 按需 Tree-Shaking**：
  - 100% 零新增依赖、HTML/SVG 与 PPTX 原生可编辑 OOXML 双端同构新增 **`issue-tree`**（别名 `mece` / `logic-tree`，麦肯锡 MECE 逻辑议题树 + 正交连接线）、**`treemap`**（别名 `rect-map` / `budget-map`，Squarified 比例矩形树图 + WCAG 自动反白）、**`gauge`**（别名 `bullet-chart` / `okr-gauge`，Stephen Few 水平子弹图 / OKR 达标仪 + 三段定性区间底带与目标垂线）与 **`pricing`**（别名 `tiers` / `packages`，Good / Better / Best 三档商业报价选型矩阵）；
  - 新增 `buildLayoutCss` 按文稿实际使用的版式按需裁剪注入 HTML 样式表，保持离线 HTML 精简轻快。
- **逆向 Office 配套导出、企业金页库拼装、无损双语翻译、分步动画与离线 `R` 键审阅闭环（`deck-export.mjs` / `deck-compose.mjs` / `deck-i18n.mjs` / `deck-delivery.mjs`）**：
  - **逆向配套导出（`exports[]` / CLI `--export` / 工作台下载）**：零新增依赖支持按需生成标准 OOXML **`.xlsx` Excel 数据工作簿**（总览页 + 各图表/表格/KPI/Treemap/Gauge/Pricing `<c t="n">` 真数值工作表 + 证据台账）、**`.docx` Word 正式文档**（标题层级 + 原生 `<w:tbl>` 表格 + 溯源附录）、**`.qa-prep.md` 会前高管质询预案**、**`.memo.md` 高管阅读备忘录** 与 **`.i18n.json` 翻译槽位包**；工作台新增直接下载 `.xlsx` / `.docx` / `.qa-prep.md`；
  - **企业金页库与跨工程拼装（`deck-compose.mjs`）**：`ppt_edit({ saveToBank })` / `--save-to-bank` 将任意优质单页连同图片资产与关联证据收藏至 `.dsh-ppt/slide-bank.json`（上限 100 条，`--list-bank` 查看）；`ppt_create({ mergeSources })` / `--merge` 从多份工程和/或金页库一键拼装新稿，自动 SHA-256 图片去重与跨工程 `[E1..En]` 证据编号无冲突重映射；
  - **100% 版式无损翻译与双语化（`deck-i18n.mjs`）**：`ppt_edit({ translations, bilingualMode, targetLang })`（CLI `--translate` / `--bilingual`）按槽位无损回填译文或中英双语对照，100% 锁死原版式、图表数值、嵌入图片、品牌宪章与 `[E#]` 溯源；
  - **分步点击显现与离线 `R` 键审阅回流**：新增单页 `reveal: 'step'`（HTML 步进 + PPTX 原生 `<p:timing>` 多对象点击构建）与 `motionProfile: 'subtle' | 'executive' | 'keynote'`（`--motion-profile`）；独立离线 HTML 新增 **`R` 键审阅批注面板**（按页记录审阅人意见并导出 `review-feedback.json`），经 `ppt_check({ feedbackPath })`（CLI `--feedback`）直接映射为精确页码的 `stakeholder-feedback` 告警，形成离线审阅 → AI 自动修订闭环。
- **8-Domain Authoritative Research Engine, Code-Level `SLOP-13` Source Governance, Mode C Hybrid Office Packs, 4 Executive Diagrams (41 Canonical Layouts + 53 Aliases), Reverse Office Exports, Slide Bank Composer, Lossless i18n & Offline `R`-Key Review Loop (Zero New Runtime Dependencies, Strictly 13 Registered Tools)**:
  - **8-Domain Authoritative Query Engine & Upgraded `SLOP-13` (`deck-evidence.mjs` + `deck-brand-kit.mjs`)**: Built-in 8-domain whitelist (`gov-macro`, `finance-filings`, `ai-tech`, `medical-clinical`, `energy-climate`, `academic-science`, `consumer-retail`, `general-business`) and 25-site noise blacklist (`NOISE_DOMAINS`) powering `site:` + `filetype:pdf` + `-site:` 3-round query packs; adds `classifySourceAuthority` (T1/T2/T3), `origin` (`local-file` | `web-research`), `tier`, `claimType` (`actual` | `forecast` | `policy` | `benchmark`), workspace `brand-kit.json` `preferredSources` / `blockedDomains`, and 5 new `SLOP-13` gates (`secondary-relay-source`, `low-authority-source`, `unmarked-forecast-claim`, `missing-external-date`, `stale-evidence-date`).
  - **Mode C Material Dossier (`inspectOnly`) & Requirement-Driven Office/Photo Choreography (`deck-office.mjs`)**: `ppt_from_office({ inspectOnly: true })` emits a token-efficient Material Dossier + `enrichmentPlan` (`nextEvidenceId`, authoritative queries) for hybrid local + external decks; adds `instructions`, `maxSlides`, `includeSheets`, `photoRoles`, `bindDataModel: true` (live Excel → `dataModel` `{{metricId}}`), and zero-dep PNG/JPEG/WebP dimension parsing (auto `focalPoint: 'top'` for portrait/team shots, `mockup[mobile|browser]` for app/dashboard screenshots).
  - **4 Executive Consulting Diagrams (`deck-charts-exec.mjs`) & Layout CSS Tree-Shaking**: Expands to **41 canonical layouts (36 core + 5 media) + 53 aliases** with 100% native editable OOXML + HTML/SVG `issue-tree` (`mece`/`logic-tree`), `treemap` (`rect-map`/`budget-map`), `gauge` (`bullet-chart`/`okr-gauge`), and `pricing` (`tiers`/`packages`), plus on-demand `buildLayoutCss` HTML CSS tree-shaking.
  - **Reverse Exports, Slide Bank & Composer, Lossless i18n, Step Reveal & `R`-Key Review Loop (`deck-export.mjs`, `deck-compose.mjs`, `deck-i18n.mjs`, `deck-delivery.mjs`)**: Adds `exports: ['xlsx', 'docx', 'qa-prep', 'memo', 'i18n', ...]` (plus Workbench `.xlsx`/`.docx`/`.qa-prep.md` downloads), `.dsh-ppt/slide-bank.json` (`saveToBank`) + `mergeSources` (SHA-256 asset dedup + collision-free `[E#]` remapping), layout-lossless `translations` + `bilingualMode`, `reveal: 'step'` (HTML + PPTX `<p:timing>`) & `motionProfile`, and offline HTML `R`-key comment export (`review-feedback.json`) → `ppt_check({ feedbackPath })` stakeholder revision loop.

## 0.34.0 (2026-11-21)

- **企业级品牌宪章锁（`deck-brand-kit.mjs` + `SLOP-14`）与多源素材包直吞（含纯 Node `.pdf` 解析）**：
  - **品牌宪章锁（`.dsh-ppt/brand-kit.json`）**：通过 `ppt_absorb({ saveBrandKit: true, watermark, forbiddenTerms })` 或 CLI `--save-brand-kit` 原子持久化企业锁定配色、双字体、Logo、统一页脚、内容页右上角保密水印（如 `CONFIDENTIAL · 内部资料`，双端 HTML + PPTX 同构渲染且自动避让 Logo/页码/章节标）与官方固定封底（`mandatoryClosing`）；后续工作区建稿自动继承（传 `useBrandKit: false` / `--no-brand-kit` 可跳过），并由 **`SLOP-14`** 静态门禁自动拦截企业禁用词（`forbidden-brand-term`）与锁定主色漂移（`brand-palette-drift`）；同步修复核心版式存在 `slide.source` 时左下角 `Brand footer` 缺席问题，实现左下企业页脚 + 中部出处 + 右下页码三区精准共存。
  - **纯 Node 零依赖 `.pdf` 抽取与多源素材包一键融合（`deck-office.mjs`）**：新增零新增依赖 `extractPdfText`（原生 `node:zlib` `FlateDecode` 流解压 + `BT/ET`/`Tj`/`TJ` + UTF-16BE 中英文及 `/ToUnicode` CMap 解析）；`ppt_from_office`（支持目录路径或 `filePaths[]`）与工作台上传新增 `.pdf` 与多源融合能力——将同一目录下的 `.docx` + `.xlsx`/`.csv`/`.tsv` + `.pdf` + `.png`/`.jpg`/`.webp` 一键融合为单套演示文稿，并自动生成绑定每页出处的已核验 **`[E1..En]` Evidence Ledger** 溯源台账与附录页。
- **多受众智能压缩改编（`deck-remix.mjs`）与 4:5 / 1:1 社媒长图卡片导出**：
  - **一键受众改编（`remixDeck` / `ppt_edit({ remixPreset })` / CLI `--remix --preset` / 工作台一键改编）**：内置 **`exec-5min`（高管 5 分钟 6 页）**、**`board-brief`（董事会 8 页）**、**`sales-pitch`（客户路演 7 页）**三大预设，按数据密度、视觉图示与证据信号确定性筛选高价值页面并保持原叙事顺序，默认另存副本保护原稿，且将被折叠页的核心结论与要点无损归档至邻近保留页的演讲者备注（`[压缩归档]`，Zero-Data-Loss）。
  - **自包含社媒长图卡片（`renderSocialCarouselHtml` / CLI `--social-carousel` / HTML 检查面板 / 工作台导出）**：将任意 16:9 演示文稿重排为适配小红书 / LinkedIn / 微信的 **4:5 竖版**与 **1:1 方形**可实时切换画幅、可打印导出 PDF 的自包含社媒轮播卡片 HTML。
- **HTML 现场演示增强套件与多格式时间轴字幕（`deck-delivery.mjs` + `dsh-remotion`）**：
  - 独立离线 HTML 放映内置 **`Ctrl/Cmd+K` 全局速搜跳页**（同时检索页面标题/正文/备注与 `[E#]` 证据账本，方向键 + Enter 直达）、**`D` 键实时白板画笔/荧光笔**（红/黄荧光/青三色、逐页持久化笔迹、`Z` 撤销、`C` 清屏）、**`T` 键 Q&A 现场倒计时器**（1/3/5/10 分钟预设，最后 30 秒琥珀色提醒）以及 **`A` 键自动字幕导览模式**（按 `computePaceBudget` 节奏自动翻页并展示底部实时字幕条，支持 `1×/2×` 调速与暂停）；检查面板同步提供零体积膨胀的离线 **社媒长图卡片（`.carousel.html`）**与 **配音字幕（`.srt`）**下载；修复 `initDelivery` 内联脚本中局部 HTML `escape` 遮蔽浏览器原生 `window.escape` 的隐患。
  - 新增 `renderSubtitlesSrt` / `renderSubtitlesVtt`（CLI `--subtitles [srt|vtt]`、工作台 `kind=subtitles`），并在 **`dsh-remotion`** 导出包（工具 + 工作台 ZIP）中自动随附 `captions.srt` 与 `captions.vtt`。
- **工作台全量功能对齐（`src/workbench.ts` + `templates/client.js` + `templates/panels/`，零触碰 `templates/workbench-ui.js`）**：
  - 全面同步 `map`（世界/中国地图）与 `isometric`（2.5D 堆叠/柱碑）新增页与编辑器、`coverPattern` 新增 `waves` / `isometric-mesh` / `editorial-arcs`、**一键形态变形（Layout Morph）**快捷变体按钮、企业保密水印 `brand.watermark`、**`image.focalPoint`** 焦距裁切选择器、待替换 **`imageBrief`** 智能配图槽位高亮提示、**证据溯源账本抽屉**（高亮冲突/待核验条目并一键跳页）、**修订差异对照面板（`revisionDiff`）**、**多受众一键改编**、`.pdf` 上传导入，以及 **社媒长图卡片** 与 **`.srt` 字幕** 下载。
- **Enterprise Brand Kit Lock (`SLOP-14`), Pure-Node `.pdf` & Multi-Source Pack Ingestion, Multi-Audience Deck Remix & Social Carousel, HTML Live Presenter Power Pack, Subtitles & Workbench Power-User Sync (Zero New Runtime Dependencies, Strictly 13 Registered Tools)**:
  - **Brand Kit Lock & Watermark (`deck-brand-kit.mjs`)**: Persist corporate palette, fonts, logo, footer, subtle content-slide classification watermark (`CONFIDENTIAL · 内部资料` rendered across both HTML & PPTX), `mandatoryClosing`, and `SLOP-14` compliance gates (`forbidden-brand-term` + `brand-palette-drift`) to `.dsh-ppt/brand-kit.json` via `ppt_absorb({ saveBrandKit: true })` or `--save-brand-kit`.
  - **Zero-Dep `.pdf` & Multi-Source Pack (`deck-office.mjs`)**: Native `FlateDecode` + `BT/ET` + UTF-16BE `.pdf` text extractor; pass a folder or `filePaths[]` to `ppt_from_office` to fuse `.docx` + `.xlsx`/`.csv`/`.tsv` + `.pdf` + `.png`/`.jpg`/`.webp` into one unified deck with auto-generated `[E1..En]` Evidence Ledger provenance.
  - **Deck Remix & Social Carousel (`deck-remix.mjs`)**: Deterministically compress decks into `exec-5min` (6p), `board-brief` (8p), or `sales-pitch` (7p) undoable copies while archiving omitted takeaways into speaker notes; export self-contained `4:5` / `1:1` printable Social Carousel HTML.
  - **Live Presenter Power Pack & Subtitles (`deck-delivery.mjs` + `src/ecosystem.ts`)**: Adds `Ctrl/Cmd+K` slide & `[E#]` evidence jump search, `D` whiteboard pen/highlighter canvas (`Z` undo / `C` clear), `T` Q&A countdown timer pill, `A` narrated Auto-Tour with live captions, `.srt`/`.vtt` timed subtitle export (also bundled into `dsh-remotion`), and full Workbench UI sync (`map`, `isometric`, `waves`/`isometric-mesh`/`editorial-arcs`, Layout Morph pills, `focalPoint`, `imageBrief`, Evidence Ledger & Revision Diff drawers, Remix buttons, PDF upload, and Carousel/Subtitle downloads).

## 0.33.0 (2026-11-20)

- **视觉与信息图智能引擎（`deck-infographics.mjs` — 零新增依赖、100% 原生可编辑 OOXML + SVG 双端同构）**：全面补齐战略地理分布、3D 架构概念展示与智能配图协作的「视觉最后一公里」，原生版式扩展至 **37+**：
  - **主题自适应战略矢量点阵地图（`layout: 'map'`，别名 `world-map` / `china-map` / `geo-map`，支持 Markdown `::: map`）**：内置 Economist 风格**全球点阵轮廓（`variant: 'world'`）**与**中国区域经济枢纽点阵轮廓（`variant: 'china'`）**，中英文区域词自动精准定位坐标（北美/欧洲/亚太/中东非/拉美及长三角/粤港澳/京津冀/成渝/华中/东北/西北，支持 `{ x, y }` 自定义坐标），叠加主枢纽脉冲光晕、互联虚线、2D 防碰撞标签胶囊与右侧按数值降序排列的比例条排行侧栏，随 24 套深浅主题自动换色。
  - **2.5D 等轴测立体矢量信息图（`layout: 'isometric'`，别名 `iso-stack` / `iso-layers` / `3d-stack` / `iso-pillars`，支持 Markdown `::: iso-stack` / `::: iso-pillars`）**：纯数学 30° 等轴测三面明暗立体投影（顶面 + 左暗面 + 右深暗面，全部编译为原生可编辑 PowerPoint `<a:custGeom>` 多边形 + HTML `<svg>`）——`stack` 渲染 3–5 层悬浮技术/业务平台架构堆叠 + 左侧防遮挡层号胶囊 + 右侧精准引线解析卡；`pillars` 渲染 3–4 根比例 3D 立体柱碑 + 落地投影菱形 + 顶部悬浮大指标与底部对齐说明卡。
  - **高定封面程序化矢量底纹升级（`coverPattern` 新增 `waves` / `isometric-mesh` / `editorial-arcs`）**：在 `dots` / `grid` / `rings` 基础上新增 3 套原生矢量封面装饰底纹——流动三次贝塞尔地形波纹（`waves`）、建筑等轴测菱形晶格（`isometric-mesh`）与瑞士杂志同心弧线十字标尺（`editorial-arcs`），在 HTML SVG 与 PPTX `<a:custGeom>` 中双端同构、零文字遮挡。
  - **智能配图协作槽位（`imageBrief` / `generateVisualBrief`）、焦距安全裁切（`image.focalPoint`）与全屏出血暗色渐变护眼层**：`ppt_templates({ topic })` 规划阶段自动为封面/图文槽位输出匹配当前主题主辅色与画幅比例的 `visualBriefs[]` 生图提示词；暂缺真图时可在 `image` / `image-left` / `image-right` 上声明 `imageBrief` 渲染零报错视觉蓝图占位卡（附 `image-brief-pending` 提醒，后续通过 `ppt_edit` 填入 `image.src` 自动热替换并清零提醒）；新增 `image.focalPoint: 'center' | 'top' | 'bottom' | 'left' | 'right'` 防止人像头顶或界面顶栏被裁切；修复并升级 `image[full-bleed]` PPTX 图层顺序（`sendShapeToBack`）与底部 0%→88% 暗色渐变压暗层，亮底实拍图上白字依然保持 WCAG AAA 可读性。
- **Visual & Map Intelligence Engine (`deck-infographics.mjs` — Zero New Dependencies, 100% Native Editable OOXML + SVG Parity)**: Expands native layouts to **37+**, closing the "visual last mile" for strategic geography, 2.5D architecture storytelling, procedural cover artwork, and host image-gen collaboration:
  - **Theme-Adaptive Strategic Dotted Vector Maps (`layout: 'map'`, `variant: 'world' | 'china'`, aliases `world-map`/`china-map`/`geo-map`, Markdown `::: map`)**: Economist-style world & China economic-hub dotted silhouettes with bilingual hub geocoding, proportional pulse halos, hub-to-hub dashed links, 2D badge/hub collision avoidance, and a ranked right-hand progress-bar sidecar adapting across all 24 themes.
  - **2.5D Isometric Vector Infographics (`layout: 'isometric'`, `variant: 'stack' | 'pillars'`, aliases `iso-stack`/`iso-pillars`/`3d-stack`)**: Exact 30° isometric 3-face shaded `<a:custGeom>` prisms in PPTX + `<svg>` in HTML — `stack` pairs 3–5 floating platform slabs with non-occluded left layer pills and right leader-connected cards; `pillars` renders 3–4 sculptural 3D bars with ground shadows, floating KPIs, and aligned caption cards.
  - **Procedural Editorial Cover Artwork (`coverPattern`)**: Expands `coverPattern` with native vector `waves` (cubic-Bezier `<a:cubicBezTo>`), `isometric-mesh`, and `editorial-arcs` across both HTML SVG and PPTX OOXML.
  - **Smart Visual Brief Collaboration (`imageBrief` / `generateVisualBrief`), `focalPoint` Smart Crop & Full-Bleed Contrast Scrim**: Auto-generates theme-harmonized `visualBriefs[]` in `buildResearchPlan` / `ppt_templates({ topic })`; supports graceful editorial placeholder cards for `imageBrief` slides awaiting real imagery (auto-cleared via `ppt_edit` once `image.src` is attached); adds `image.focalPoint` (`center | top | bottom | left | right`) across CSS `object-position` and PPTX `setShapeImageCrop`; upgrades `image[full-bleed]` with `sendShapeToBack` z-order fix and a bottom-up 0%→88% dark gradient scrim for WCAG AAA white typography over bright photography.

## 0.32.1 (2026-11-20)

- 修复预览 iframe 编辑脚本的正则转义及单击字段聚焦与双击原地编辑的竞争，恢复文字录入、Enter 提交与 Escape 取消。
- 撤销后同步记录项目索引修订号与页数，刷新和重启后的工程列表保持正确；索引半行不再吞掉下一条完整记录。
- 批量吸收在取消后停止处理和保存；损坏的范本/配方 JSON 在保存前保留原文件，成功完整写入后原子替换。
- 升级共享更新组件至 0.2.10，移除全局浮动提醒，保留工作台及插件详情页的更新控制。保留 0.32.0 的调研策划、Evidence Ledger 与 0.31.0 叙事重排/静态修复功能。

## 0.32.0 (2026-11-20)

- **零资料深度调研、事实核验与策划出稿引擎（`deck-evidence.mjs` + `references/research-plan.md`）**：专为「用户手头无现成文档/数据，仅给主题要求 Agent 自主检索资料、交叉核验准确性、先策划 PPT 方案再出稿」场景构建确定性离线引擎（0 新增依赖、0 引擎内联外网，严格保持 13 个注册工具）：
  - **调研与分镜策划器（`buildResearchPlan` / `ppt_templates({ topic, evidence })` / CLI `--plan`）**：按主题自动匹配 20 套标杆范本，生成 3 轮定向检索指南（权威基线 → 竞品实测 → 最新进展与反方风险）、量化槽位证据缺口诊断（`evidenceAudit.gaps`）、逐页分镜蓝图（`storyboard`）及可直接供用户确认的 `planMarkdown`。
  - **结构化证据账本绑定（`evidence[]` + `slides[].evidenceIds` + `evidenceAppendix: true`）**：严格校验 `E1..En` 条目（含 `claim`/`source`/`date`/`scope`/`http(s)://` URL 防护/`confidence: verified|estimated|conflicting|unverified`）；自动为引用 `[E#]` 的页面生成单行精简 `source` 脚注，将完整原文 URL 与口径说明写入演讲备注 `notes` 与讲义 `.handout.md` 证据总表；开启 `evidenceAppendix: true` 时在封底前自动插入零溢出、按编号自然排序的 4 列 `booktabs` 三线表核验清单页，并在 `editDeck` / `undoDeck` 中完整保留 `manifest.evidence`。
  - **`SLOP-13` 事实出处与证据卫生静态门禁（`auditEvidenceAndSourcing`）**：零误报拦截 4 类事实风险——悬空 `[E99]` 引用（`dangling-evidence-ref`）、将 `unverified`/`conflicting` 证据当作无声明定论展示（`unverified-evidence-claim`，严格要求画面可见文案声明口径/区间）、空洞假出处如「数据来源：网络整理 / 公开资料 / Internet」（`vague-placeholder-source`），以及调研模式下无出处的量化数据页（`unsourced-research-numbers`）。
  - **Skill 双模路由 SOP（`SKILL.md` + `references/research-plan.md`）**：明确划分 **Mode A（有资料直出）** 与 **Mode B（零资料 4 步深研 → Tier 1/2/3 双源核验 → 方案确认 → 带证据成稿）**，严禁凭记忆编造数据。
- **Zero-Material Research-to-Deck Planner, Verified Evidence Ledger & `SLOP-13` Fact-Grounding Gate (`deck-evidence.mjs` + `references/research-plan.md`)**: Adds a 100%-offline, zero-new-dependency research & fact-grounding engine (strictly preserving 13 registered Agent tools and 0 wire JSON Schema `type` arrays):
  - **Storyboard & Retrieval Planner (`buildResearchPlan` / `ppt_templates({ topic, evidence })` / CLI `--plan`)**: Matches the best of 20 Gold Exemplars, generates a 3-round retrieval & fact-check rubric, diagnoses missing quantitative evidence slots, and produces a user-ready `planMarkdown` storyboard before generation.
  - **Verified Evidence Ledger (`evidence[]` + `slides[].evidenceIds` + `evidenceAppendix: true`)**: Validates `E1..En` entries (`claim`, `source`, `date`, `scope`, `http(s)://` URL sanitization, `confidence`), auto-injects single-line compact `source` footers, writes full provenance cards + URLs to speaker `notes` & `.handout.md`, optionally appends a naturally sorted zero-overflow 4-column `booktabs` Sources & Fact-Verification Ledger slide before `closing`, and preserves `manifest.evidence` across `editDeck` / `undoDeck`.
  - **`SLOP-13` Grounding & Fact-Hygiene Audit (`auditEvidenceAndSourcing`)**: Deterministically intercepts `dangling-evidence-ref`, `unverified-evidence-claim` (requiring visible on-slide caveat/range disclosure), `vague-placeholder-source` (e.g. `"internet"`, `"网络整理"`), and `unsourced-research-numbers` in research mode with zero false positives on ordinary decks.
  - **Dual-Mode Skill Protocol (`SKILL.md` + `references/research-plan.md`)**: Routes between Mode A (material provided → direct build) and Mode B (zero-material topic → 3-round search → Tier 1/2/3 dual-source cross-check → user plan gate → grounded build).

## 0.31.0 (2026-11-20)

- **标杆叙事弧线自动重排与槽位亲和投影（`resequenceSlidesToExemplar` / `alignOrder: true`）**：针对中弱模型（如 DeepSeek）输出页序散乱、把排期表塞在开篇或将核心 KPI 埋在末尾的痛点，`ppt_create` / CLI `--align-order` / 工作台新建向导新增 **`alignOrder: true`**，按目标标杆范本的经典叙事弧线（封面 → 核心判断/摘要 → 关键 KPI → 痛点对比 → 方案图谱 → 量化证明 → 排期路线 → 行动封底）确定性重排草稿页序，完整保留显式 `section` 分章边界并消除相邻同版式撞车。
- **证据锚定式 Action-Title 提炼器与 Grounded Takeaway 合成（`synthesizeActionTitle`）**：全面扩展弱名词标题识别范围（覆盖 `财务数据`、`工作总结`、`季度总结`、`市场分析`、`下一步计划`、`Financials`、`Key Metrics`、`Roadmap` 等），按 `kpi` / `dumbbell` / `chart` / `table` / `quadrant` / `radar` 各自原生数据结构提取真实量化主结论与底部 `takeaway`（100% 源自原文零编造，严格控制字宽不溢出，且对 `{{metricId}}` 数据绑定页零篡改）。
- **零模型调用确定性自检修复闭环（`selfRepairDeck`）**：在 `buildDeckAsync` 落盘渲染前自动执行最多 2 轮 `checkManifest` + `SLOP-01..12` 静态复检与无损修复——自动把超长标题拆分至 `subtitle`/`takeaway`、将超载 `kpi(>4)` / `cards(>6)` / `table(>9行)` 与长文本墙无损分页、把 >6 扇区碎块饼图转为聚光灯横向条形图、为单系列长柱状图补齐焦点聚光灯与增长结论条、打破连续方框疲劳、自动净化刺眼高饱和与 WCAG < 4.5:1 低对比画布，并在 `upgradeReport.selfRepair` 中透明报告修复前后告警数（如 `15 → 0`）。
- **Exemplar Narrative-Arc Re-sequencing (`alignOrder: true` / `--align-order`)**: Deterministically reorders scrambled weak-LLM drafts to match the active exemplar's narrative cadence (`cover → thesis/KPI → problem → solution → proof → roadmap → closing`) while preserving explicit `section` chapter boundaries and alternating adjacent visual archetypes across Engine, Tools, CLI, and Workbench.
- **Evidence-Anchored Action-Title & Grounded Takeaway Synthesizer (`synthesizeActionTitle`)**: Upgrades generic topic labels across `kpi`, `dumbbell`, `chart`, `table`, `quadrant`, and `radar` using 100% verbatim source metrics within strict title width budgets (zero hallucinated numbers; preserves `{{metricId}}` data bindings untouched) and synthesizes grounded chart/dumbbell `takeaway` bars.
- **Zero-LLM Self-Repair Loop (`selfRepairDeck`)**: Runs a bounded pre-commit `checkManifest` + `SLOP-01..12` check→repair→recheck loop (0 LLM calls, 100% lossless) fixing `title-overflow`, `wall-of-text`, `card-count-overflow`, `table-overload`, `chart-spaghetti` (>6-slice pie → horizontal bar), `chart-density`, `chart-emphasis-missing` (`SLOP-12`), `missing-chart-callout` (`SLOP-10`), `visual-card-monotony` (`SLOP-11`), `bare-closing` (`SLOP-09`), and `saturated-canvas`/`low-contrast` before writing HTML/PPTX/JSON artifacts.

## 0.30.0 (2026-11-20)

- **精选 GitHub 开源优质 PPTX 实机蒸馏语料库（内置标杆范本 8 → 20 套，`deck-exemplars-corpus.mjs`）**：从高星 Apache-2.0 / MIT / CC0-1.0 / CC-BY-4.0 开源 GitHub 仓库（`likaku/Mck-ppt-design-skill`、`iOfficeAI/OfficeCLI`、`microsoft/dstoolkit-DiscoveryEnvisioning`、`hustcer/pptx-nova`、`grotyx/medical-ppt-design`、`coder/presentations`、`JinnyWong/FudanPPT`、`zouchenzhen/thesis-defense-pptx-skill`、`ClickHouse/clickhouse-presentations`）两轮甄选 **25 份**真实 `.pptx` 并经 `absorbPptx` 与 LibreOffice 逐页目视筛查，将最具代表性的 **12 套零重叠视觉流派** 蒸馏为内置开箱即用范本（不打包任何第三方二进制 `.pptx`）：`mckinsey-evolution`（麦肯锡阶梯演进）、`luxury-budget-review`（黑金高管财务预算）、`swiss-bauhaus-workshop`（瑞士包豪斯设计工作坊）、`dark-stage-investor`（暗夜舞台 Demo Day 路演）、`blueprint-ai-factory`（工程蓝图网格 AI 平台）、`warm-brand-story`（暖宣纸撞色品牌焕新）、`ted-storytelling-keynote`（暗夜极简主题演讲）、`msft-enterprise-discovery`（微软企业级 AI 场景发现）、`daylight-earnings-research`（浅色投行研报与上市公司财报）、`okr-performance-review`（中文大厂述职与 OKR 季度复盘）、`quiet-canvas-keynote`（极简静谧画布与浅色设计发布）与 `medical-clinical-course`（医学临床汇报与循证科研课件）。
- **面向中弱模型的 Few-Shot 满分 JSON 样板 + `exemplar: "auto"` 智能语义路由**：`ppt_templates({ exemplarId })` 除逐页槽位契约外，现直接附带 2 页可直接仿写结构与结论标题写法的双语 **Few-Shot 满分 JSON 样板（`fewShotSlides`）**，覆盖全量 20 套标杆，显著降低中弱模型生成结构化 `slides` 的幻觉率；`ppt_create` / CLI `--exemplar auto` / 工作台新建向导新增 **`exemplar: "auto"`** 一键语义路由，按标题与正文自动从 20 套标杆 + 工作区吸收范本中匹配最优范本与配色 DNA。
- **野生 `.pptx` 骨架吸收精度与批处理零碰撞加固（`deck-absorb.mjs` & `deck-upgrader.mjs`）**：修复实测 25 份真实 GitHub `.pptx` 时暴露的四处真实痛点——左侧装饰点阵不再误触发 `harvey`、四角氛围光晕圆不再误触发 `tam[concentric]`、默认 `<dc:title>PowerPoint Presentation</dc:title>` 不再导致批量吸收 ID 互相覆盖（自动回退至文件名词干）、`Songti SC` / `PingFang SC` / `Arial Unicode MS` / `Pretendard` / `Menlo` 等平台锁死字体自动剥离避免 Windows/Linux 缺字乱码；同步扩展 `upgradeWeakDeck` 哑铃图对中文「升至/分/例/临床疼痛与障碍指标」的精准识别。
- **Curated GitHub OSS `.pptx` Distilled Corpus (8 → 20 Built-in Gold Exemplars, `deck-exemplars-corpus.mjs`)**: Audited and LibreOffice-vetted **25 real Apache-2.0 / MIT / CC0-1.0 / CC-BY-4.0 GitHub `.pptx` decks**, distilling **12 distinct, zero-overlap aesthetic schools** into built-in zero-binary exemplars with full SPDX provenance and extracted `styleRecipe` DNA (`mckinsey-evolution`, `luxury-budget-review`, `swiss-bauhaus-workshop`, `dark-stage-investor`, `blueprint-ai-factory`, `warm-brand-story`, `ted-storytelling-keynote`, `msft-enterprise-discovery`, `daylight-earnings-research`, `okr-performance-review`, `quiet-canvas-keynote`, `medical-clinical-course`).
- **Few-Shot Gold Slide JSON (`fewShotSlides`) & `exemplar: "auto"` Routing**: `ppt_templates({ exemplarId })` appends compact, copy-ready bilingual Few-Shot JSON slide examples directly inside `promptGuide` & `fewShotSlides` across all 20 built-in exemplars to boost weak-LLM structural accuracy; `ppt_create`, CLI `--exemplar auto`, and Workbench `PptCreateDialog` support `exemplar: "auto"` semantic routing across all 20 built-in + workspace exemplars.
- **Wild `.pptx` Absorption & Upgrader Hardening (`deck-absorb.mjs`, `deck-upgrader.mjs`)**: Prevents decorative margin dot strips from false-triggering `harvey`, scattered corner ambient circles from false-triggering `tam`, generic `<dc:title>PowerPoint Presentation</dc:title>` metadata from colliding on batch ingestion IDs, and platform-locked macOS/Korean fonts (`Songti SC`, `Arial Unicode MS`, `Pretendard`, `Menlo`) from leaking into `sanitizedBrand`; expands Chinese/clinical before-after dumbbell auto-promotion.

## 0.29.1 (2026-11-20)

- 升级共享更新组件至 `@stardustlc/dsh-updates@0.2.7`：对话页「有新版本」提醒浮卡支持无交互 15 秒自动收起（悬停、聚焦、查看记录或确认弹窗时自动暂停，安装成功提示 6 秒收起，安装中/失败/需要重启仍保持常驻不隐藏）。
- Upgrade `@stardustlc/dsh-updates` to `0.2.7`: auto-dismiss idle update reminder cards after 15s and silent complete cards after 6s while pausing on hover/focus/notes/dialogs and keeping active, failed, or restart-required cards pinned.

## 0.29.0 (2026-11-20)

- **8 套标杆范本槽位契约与批量 `.pptx` 语料投喂引擎（`deck-exemplars.mjs`）**：针对中弱模型（如 DeepSeek 等）开放式规划 PPT 易退化为连续文字墙的痛点，新增零外部依赖 `deck-exemplars.mjs`，内置 **8 套满分标杆范本**（`mckinsey-strategy` 麦肯锡战略、`sequoia-pitch` 红杉/YC 融资、`stripe-product-launch` Stripe/Apple 产品发布、`quarterly-exec-review` 季度经营复盘、`tech-arch-rfc` 架构 RFC、`academic-defense` 顶会学术答辩、`enterprise-proposal` 政企竞标提案、`gov-institutional` 现代东方政务），将开放设计降维为逐页机器可读的 **Slot-Filling 槽位填空契约**（通过 `ppt_templates({ exemplarId })` / `--list-exemplars` 获取）；同时支持 **`ppt_absorb` 直接传入 `.pptx` 目录（或 `corpusDir` / CLI `--ingest-exemplars <dir>`）** 离线批量吸收 GitHub 开源或企业内部优质 `.pptx` 语料，自动过滤 `<p:sld show="0">` / `(hidden)` 隐藏说明页与 1 页母版兜底，统一沉淀至 `.dsh-ppt/exemplars.json` 与 `.dsh-ppt/taste-recipes.json` 持久复用。
- **确定性弱模型升维补偿器（`deck-upgrader.mjs`，0 额外模型开销、100% 文本无损）**：新增 `upgradeWeakDeck`（`ppt_create` / `buildDeckAsync` 默认开启，传 `autoUpgrade: false` 或 CLI `--no-auto-upgrade` 可精确关闭），自动对粗糙 `bullets` / 普通 `table` 执行四重无损升维：
  - **高阶视觉语义升维**：自动识别嵌入式代码块 → `code[split]`、前后数值跃迁 → `dumbbell`、多维评分 → `radar`、坐标/象限分布 → `quadrant`、区域/季度数值表 → `heatmap`、界面/URL 描述 → `mockup[browser|mobile]`、量化指标 → `kpi[spotlight]`（严格排除 `SOC2`/`Q4` 等字母数字混合标识，100% 保留原文零截断）；
  - **标杆范本节奏投影 & 反文字墙**：按所选 `exemplar` 继承最佳主题、品味配方与封面变体；单页 `>6` 条 bullets 自动无损拆分为 `cards` + `callout`；自动打断 `>=2` 页连续 bullets 并补全加粗引导词；
  - **反 AI 土味标题与封底救援（`SLOP-01 / 02 / 09`）**：自动把「核心指标 / 性能提升 / 技术实现」等空洞名词标题提炼为带数据结论的 Action Title、修复重复「要点」面包屑 `kicker`，并将裸「谢谢！」封底升级为去重 3 卡片 `closing[cta-cards]`。
- **实机渲染视觉精修与工作台集成**：通过真实 LibreOffice 零缺字逐页目视巡检，一并修复亮色主题下 `cards[bento-hero]` 反白英雄卡沿用浅色 `coverBg` 导致低对比度的问题（改为基于相对亮度强制锚定深色品牌强调渐变，确保 WCAG ≥5:1 对比度），以及 `dumbbell` 靠近 `0` 轴边界数值标签与左侧行标题碰撞的问题（边界自动上移至圆点正上方）；工作台新建向导新增「标杆范本契约」选择器，风格面板上传参考 `.pptx` 时同步沉淀为可复用范本。
- **8 Curated Gold Exemplars, Slot-Filling Contracts & Batch `.pptx` Corpus Ingestion (`deck-exemplars.mjs`)**: Ships 8 machine-readable scenario exemplars (`mckinsey-strategy`, `sequoia-pitch`, `stripe-product-launch`, `quarterly-exec-review`, `tech-arch-rfc`, `academic-defense`, `enterprise-proposal`, `gov-institutional`) with per-slide slot contracts and bilingual `renderExemplarPromptGuide` exposed via `ppt_templates({ exemplarId })` and `--list-exemplars`; upgrades `ppt_absorb` (supporting single `.pptx` with `saveExemplarAs` OR directory path / `corpusDir` / CLI `--ingest-exemplars <dir>`) to batch-ingest GitHub/corporate `.pptx` folders offline into `.dsh-ppt/exemplars.json` & `.dsh-ppt/taste-recipes.json` while filtering hidden `<p:sld show="0">` / `(hidden)` template instruction slides.
- **Deterministic Weak-LLM Compensator & Anti-Slop Upgrader (`deck-upgrader.mjs`)**: Zero-extra-LLM, 100%-lossless 4-pass compensator (`autoUpgrade`, opt-out via `autoUpgrade: false` / `--no-auto-upgrade`) that promotes buried code/before→after/radar/quadrant/heatmap/mockup/KPI bullets into rich native layouts (safely ignoring alphanumeric IDs like `SOC2`), projects onto chosen `exemplar` cadence, splits `>6`-bullet text walls, breaks monotonous bullet streaks, rescues `SLOP-01` generic headings, repairs `SLOP-02` kickers, and upgrades bare `SLOP-09` thank-you slides into deduplicated `closing[cta-cards]`.
- **Visual Contrast & Collision Fixes + Workbench Exemplar Picker**: Fixes `cards[bento-hero]` inverted hero surface contrast on light themes (e.g. `stripe-craft`) in both OOXML and HTML CSS by guaranteeing a dark accent gradient (`luminance < 0.25`), adds edge-boundary collision avoidance for `dumbbell` near-zero / near-max value labels, and adds the Gold Exemplar selector to Workbench `PptCreateDialog` plus automatic exemplar persistence in Style Studio.

## 0.28.0 (2026-11-20)

- **科技与产品发布会专属展示模块（`deck-showcase.mjs` + 封面主图分屏与几何肌理）**：新增零外部依赖 `deck-showcase.mjs`，支持原生矢量设备样机 **`layout: 'mockup'`**（`browser` 浏览器窗口 / `mobile` 移动端灵动岛真机 / `split` 双端协同，支持原生截图注入或内置 SaaS/移动 UI 卡片，100% 原生可编辑 OOXML + HTML 同构）与原生语法高亮代码展示 **`layout: 'code'`**（内置零依赖多语言词法高亮引擎，覆盖 TS/JS、Python、SQL、Bash、JSON、YAML、Go、Rust 等 9 大语言，自动识别 Markdown 非 Mermaid 代码围栏 ```` ```lang ```` 晋升为 macOS 暗色终端窗口 + 行号 + 多色 Consolas 可编辑 `<a:r>` 文本流 + 右侧批注卡片）；升级 `deck-covers.mjs` 支持封面主图分屏（**Hero Photo Split**：`cover` 传 `slide.image` 自动左深渐变 WCAG AAA 排印 + 右全出血贴边主图）及程序化几何肌理（`coverPattern: 'dots' | 'grid' | 'rings'`）。
- **四大顶级商业分析与咨询矢量图表（`deck-charts-pro.mjs`）**：新增零外部依赖 `deck-charts-pro.mjs`，全部输出 100% 原生可编辑 OOXML 矢量图形（`<p:sp>` / `<a:custGeom>` / `<p:cxnSp>`）+ HTML SVG 双端同构，内置：
  - **`quadrant`**（魔力象限 / 波士顿 BCG 战略气泡矩阵，内置安全边距防撞、四象限角标与 `vert270` 单行竖排 Y 轴标题）；
  - **`radar`**（多维能力雷达图，4 层同心正多边形蛛网、半透明多系列叠加多边形、刻度标注与白环顶点）；
  - **`dumbbell`**（麦肯锡 Before→After 哑铃跃迁对比图，1-2-5 规整刻度、方向连接桥与右侧增减徽章）；
  - **`heatmap`**（顺序/发散色阶矩阵热力图，基于相对亮度自动切换 WCAG 反白/深墨字色并附色阶图例）。
- **工作台直接操纵体验与一键高精 PDF / PNG 图包导出**：升级工作台（`templates/client.js`、`templates/panels/editor.js`、`templates/panels/style-studio.js`、`src/workbench.ts`）：左侧页面目录支持 **HTML5 拖拽调序（Drag-and-Drop Reorder）**，预览画布支持 **双击文字原地编辑（Inline Direct Edit）并原子同步 HTML 与 PPTX**，导出面板新增 **「导出高精 PDF (.pdf)」**（`kind=pdf`）与 **「导出逐页 PNG 图包 (.zip)」**（`kind=png-zip`），并在版式切换器与新增页菜单完整开放全部 6 套新版式与 `coverPattern` 控件。
- **README 旗舰视觉画廊刷新与发布链路加固**：使用真实 LibreOffice 零缺字渲染的 `v0.27`/`v0.28` 双语高精画廊全面刷新 `README.md` / `README.en.md` 风格预览；同时将 `.github/scripts/npm-registry-verification.mjs` 元数据传播等待阈值由 5 分钟提升至 10 分钟（`publish.yml` 同步放宽至 15 分钟），彻底消除 npm CDN 同步延迟导致的假超时。
- **Tech & Product Showcase (`deck-showcase.mjs`) + Cover Hero Photo Split & Patterns**: Add zero-dependency native vector device mockups (`layout: 'mockup'`, variants `browser` | `mobile` | `split` with viewport screenshot embedding or built-in SaaS/mobile cards) and native syntax-highlighted code slides (`layout: 'code'`, 9-language zero-dep lexer, automatic Markdown ```` ```lang ```` fence promotion, macOS dark window + multi-color editable Consolas OOXML runs + split annotations); upgrade `deck-covers.mjs` with full-bleed right-half Hero Photo Split (`slide.image` on `cover`) and procedural `coverPattern: 'dots' | 'grid' | 'rings'`.
- **4 Pinnacle Analyst & Consulting Vector Charts (`deck-charts-pro.mjs`)**: Ship 100% native editable OOXML + HTML SVG implementations for `quadrant` (Magic Quadrant / BCG bubble matrix with safe inset padding and `vert270` vertical Y-axis), `radar` (multi-series polygonal spider web with concentric rings & scale ticks), `dumbbell` (McKinsey Before→After slope comparison with 1-2-5 nice ticks and delta pills), and `heatmap` (sequential/diverging color-ramp matrix with automatic WCAG text contrast).
- **Direct-Manipulation Workbench & Direct PDF / PNG-ZIP Exports**: Add HTML5 drag-and-drop slide reordering in the left rail, canvas double-click inline text editing synced directly to HTML + PPTX, 1-click **Export High-DPI PDF (`.pdf`)** (`kind=pdf`) and **Export Slide PNG Pack (`.zip`)** (`kind=png-zip`), and full editor/archetype support for all 6 new layouts and `coverPattern` (all 13 Agent tools retain 0 JSON Schema wire `type` arrays).
- **README Gallery Refresh & CI Publish Hardening**: Refresh `README.md` / `README.en.md` Style Previews with LibreOffice-rendered bilingual `v28-*.webp` showcases and bump npm propagation verification deadline from 5 min to 10 min (`release` job timeout 15 min) to prevent npm CDN latency false timeouts.

## 0.27.2 (2026-11-20)

- 升级共享更新组件至 `@stardustlc/dsh-updates@0.2.6`：端到端验收修复浮卡与日历按钮重叠、详情页/工作台挂载时瞬时让位及 `package-moved` / 包管理器报错诊断文案，继续保持过期检查自动刷新与 `bundle-in-use` 指导。
- Upgrade `@stardustlc/dsh-updates` to `0.2.6`: E2E-verified fixes for floating Calendar FAB clearance, immediate reminder yield on native detail/workbench mount, and clearer `package-moved` / package-manager error messages, alongside auto-refresh and `bundle-in-use` guidance.

## 0.27.1 (2026-11-20)

- 修复工作台控件反复重挂载导致的焦点丢失；备用弹窗让内层控件优先处理 Escape。
- Preserve workbench control identity and let nested controls consume Escape before closing a fallback dialog.

## 0.27.0 (2026-11-20)

- **全栈审美工坊与 8 套大师品味配方（Aesthetic Studio & Curated Taste Recipes）**：新增零外部依赖 `deck-taste.mjs` 与 8 套向世界顶级演示流派致敬的结构化品味配方（`mckinsey-partner` 麦肯锡合伙人精修、`apple-keynote-dark` Apple 发布会暗夜、`apple-keynote-light` Apple 极简纯白、`swiss-editorial` 瑞士杂志 Monocle、`linear-craft` Linear 玻璃工艺、`ft-data-journal` Financial Times 研报、`nature-academic` Nature/NeurIPS 学术、`oriental-zen` 东方极简宋韵），通过 `taste` 参数 / CLI `--taste` / `--list-tastes` / 工作台风格面板一键协同驱动封面形态、材质、节奏、图标语言与图表精修。
- **材质光影层次、4 套海报级封面与实时议程章节页**：新增 `deck-covers.mjs` 与原生 OOXML 径向光斑渐变（`<a:gradFill><a:path path="circle">`）、半透明描边（`strokeAlpha`）及 4 种卡片材质（`solid` 实心、`frameless` 细线无框、`glass` 发布会玻璃拟态、`editorial-rule` 出版物双发丝）；新增 4 套海报级封面（`keynote-glow` 光晕剧场、`editorial-grid` 瑞士三栏网格、`architectural` 建筑深色侧翼、`split-bleed` 半屏出血）与 `section[agenda]` 自动多章节实时进度追踪过场页，HTML 与 PPTX 1:1 双端同构。
- **反单调主次构图引擎、61 枚原生矢量图标与出版级图表精修**：新增 `kpi[spotlight]`（左侧 50% 主指标英雄位 + 右侧无框副指标栈）、`kpi[frameless]`、`cards[frameless]`、`cards[bento-hero]`（深色渐变反色锚点卡 + 右侧副卡），`deck-director.mjs` 新增视觉节奏优化器 `optimizeVisualRhythm` 与 `SLOP-11`（连续方框疲劳）/`SLOP-12`（图表缺焦点强调）审美门禁；新增 `deck-icons.mjs` 内置 **61 枚零依赖线性矢量图标**（HTML `<svg>` + PPTX 100% 原生可编辑 `<a:custGeom>` 多路径矢量图形，支持中英语义自动匹配 `iconMode: 'auto'`）；`deck-media.mjs` 升级图表 `spotlight` 焦点配色、`referenceLine` 基准目标虚线、`showGrowthCallout` 麦肯锡增长飞线与独立顶部注释条（零遮挡），组合图标签智能防碰撞。
- **标杆 PPTX 深层审美 DNA 吸收与持久品味库**：升级 `deck-absorb.mjs` 自动测算任意外部 `.pptx` 的留白率（`whitespaceRatio`）、卡片材质（`cardMaterial`）、字阶比（`typeScaleRatio`）、封面/章节形态与视觉节奏分（`rhythmScore`），生成可复用 `styleRecipe` 并支持 `--save-taste` / `saveTasteAs` 持久化至 `.dsh-ppt/taste-recipes.json`，后续新稿与工作台风格面板直接复用吸收的标杆品味。
- **Aesthetic Studio & 8 Curated Taste Recipes (`deck-taste.mjs`)**: Ship 8 world-class Taste Recipes (`mckinsey-partner`, `apple-keynote-dark`, `apple-keynote-light`, `swiss-editorial`, `linear-craft`, `ft-data-journal`, `nature-academic`, `oriental-zen`) across `ppt_create` / `ppt_edit` / `ppt_themes`, CLI (`--taste`, `--list-tastes`, `--save-taste`), and Workbench Style Studio (with atomic `undo` support).
- **Materiality, Radial Lighting, 4 Poster Covers & Live Agenda Sections (`deck-covers.mjs`)**: Add native OOXML radial gradients (`<a:path path="circle">`), `strokeAlpha`, 4 card surface materials (`solid` | `frameless` | `glass` | `editorial-rule`), 4 poster cover variants (`keynote-glow`, `editorial-grid`, `architectural`, `split-bleed`), and automatic multi-chapter `section[agenda]` tracker slides with 1:1 HTML/PPTX parity.
- **Anti-Monotony Layouts, 61 Native Vector Icons (`deck-icons.mjs`) & Publication-Grade Chart Finishing**: Add `kpi[spotlight]`, `kpi[frameless]`, `cards[frameless]`, `cards[bento-hero]`, `optimizeVisualRhythm`, and `SLOP-11`/`SLOP-12` aesthetic checks; embed 61 zero-dependency geometric vector icons compiled to both HTML `<svg>` and 100% native editable OOXML `<a:custGeom>` with bilingual semantic auto-matching; upgrade charts with `spotlight`, `referenceLine`, `showGrowthCallout` / `callout`, dedicated non-clipping PPTX annotation strips, and smart combo anti-collision.
- **Benchmark `.pptx` Aesthetic DNA Learning (`deck-absorb.mjs`)**: Extract 6-signal aesthetic DNA (`whitespaceRatio`, `cardMaterial`, `typeScaleRatio`, `coverVariant`, `sectionVariant`, `rhythmScore` -> `styleRecipe`) from any reference `.pptx` and persist custom recipes in `.dsh-ppt/taste-recipes.json` for 1-click reuse in future decks.

## 0.26.0 (2026-11-20)

- **原生可编辑 Mermaid 流程图 / 时序图与 `deck-layouts.mjs` 模块化拆分**：零外部依赖新增 `deck-mermaid.mjs`，支持 `layout: 'mermaid'`（别名 `flowchart` / `sequence`）及 Markdown 代码块 ```` ```mermaid ```` 自动识别，将 `flowchart TD/TB/LR/RL`（含 `subgraph`、判断菱形、终端胶囊、数据库圆柱及多样式连线）与 `sequenceDiagram`（含参与者生命线、激活条、消息箭头、批注与 `alt/loop` 框）编译为 100% 原生可编辑 PowerPoint 形状（`<p:sp>`）与吸附连接线（`<p:cxnSp>` + `<a:stCxn>`/`<a:endCxn>`）及高精 HTML SVG；同步将 `deck-layouts.mjs` 模块化拆分为 `deck-chrome.mjs`、`deck-diagrams.mjs` 与精简核心入口，零破坏保留全部导出。
- **Word / Excel / CSV 直吞建稿（`ppt_from_office`）**：新增零新增依赖 `deck-office.mjs` 与 Agent 工具 `ppt_from_office`（CLI `--from-office`、工作台 `import-office` 上传），直接解析 `.xlsx` 多工作表、`.csv`/`.tsv` 与 `.docx` Word 报告；内置 Data-to-Visual 画像器自动把流向表转 `sankey`、排期转 `gantt`、份额转 `marimekko`、增减桥转 `waterfall`、双量纲转 `combo` 并附三线表，将 `.docx` 标题/表格/内嵌图片/公式送入智能导演生成全套工程。
- **`dsh-cite` 文献核验与 `dsh-remotion` 视频分镜联动**：新增 `src/ecosystem.ts` 与工具 `ppt_cite`（读取工作区 `.dsh-cite` 库、JSON/JSONL 或 BibTeX，替换 `[@citeKey]` / `[doi:...]` 为真实学术尾注与 `References` 页，零捏造 DOI）及 `ppt_remotion`（按演讲时长预算导出 30fps `DeckVideo.tsx` + `slides-data.json` + `remotion-storyboard.json` 视频分镜包）。
- **演讲时长预算器、高管一页纸与工作台 `? 引导`**：新增 `computePaceBudget`（按中文 220 字/分、英文 145 词/分与图示理解时长预算每页用时，支持 `targetMinutes` 与超时提醒）、`renderOnePagerHtml`（高管一页纸：支持 A4 打印 PDF 与长图战报切换，HTML 放映面板与工作台 `kind: 'onepager'` 可直接导出）、工作台 **`? 引导`** 四步聚光灯交互导览（`templates/panels/tour.js`）与 **「一键体验旗舰示例」**（`create-demo`），并清理 GitHub Actions `package-manager-cache` 警告与刷新 8 张双语流程 SVG。
- **Zero-dependency Mermaid-to-Native-OOXML & Modular Layout Split**: Add `deck-mermaid.mjs` (`layout: 'mermaid'` / `'flowchart'` / `'sequence'`, plus automatic ```` ```mermaid ```` Markdown fence detection) compiling `flowchart` (subgraphs, decision diamonds, stadium terminals, cylinder DBs, labeled edges) and `sequenceDiagram` (lifelines, activations, notes, `alt/loop` frames) into 100% native editable PowerPoint shapes (`<p:sp>`) with attached `<p:cxnSp>` connectors (`<a:stCxn>`/`<a:endCxn>`) and crisp HTML SVGs; modularize `deck-layouts.mjs` into `deck-chrome.mjs`, `deck-diagrams.mjs`, and a lean core index with zero API breakage.
- **Direct `.xlsx` / `.csv` / `.tsv` & `.docx` Ingestion (`ppt_from_office`)**: Add `deck-office.mjs` (`extractOfficeSource`, `importOfficeDeck`, CLI `--from-office`, tool `ppt_from_office`, Workbench `import-office` `≤24 MiB`) using only Node built-ins + `csv-parse`; automatically profiles spreadsheets into `sankey`, `gantt`, `marimekko`, `waterfall`, `combo` `chart-split`, and `table` slides, and extracts Word headings, tables, embedded images, and formulas through Scenario Auto-Director.
- **Cross-Plugin `dsh-cite` & `dsh-remotion` Bridges (`src/ecosystem.ts`)**: Add `ppt_cite` (`attachCitationsToDeck`) to resolve `[@citeKey]` / `[doi:...]` markers from `.dsh-cite` / JSON / BibTeX into verified `slide.source` footers and a `References` slide, and `ppt_remotion` (`exportRemotionBundle`) to export 30fps Remotion storyboard packages (`DeckVideo.tsx`, `slides-data.json`, `remotion-storyboard.json`, `kind: 'remotion'` ZIP).
- **Speaking-Pace Budgeter, Executive One-Pager & `? Guide` Spotlight Tour**: Add `computePaceBudget(manifest, targetMinutes)` with live per-slide overrun diagnostics, `renderOnePagerHtml(manifest, lang)` (A4 print + mobile long-card toggle via `#download-onepager` / `kind: 'onepager'` / `--one-pager`), Workbench **`? Guide`** 4-step spotlight tour (`templates/panels/tour.js`) and 1-click **Load Flagship Demo** (`create-demo`), zero-warning GitHub Actions workflows, and refreshed bilingual workflow SVGs.

## 0.25.0 (2026-11-18)

- **工作台 UI v3、13 套明亮风格与 8 套中英双层字体搭配**：全新升级 48px 单行顶栏（含演示文稿编辑器紧凑单行顶栏）、滑动标签指示器、可拖拽分栏（`DshSplitResizer`）、微光骨架屏（`DshSkeleton`）与悬停快捷操作条；工作台主题扩展至 13 套明亮风格（新增「工程晒图 / Blueprint」「波普孔版 / Risograph」「千禧复古 / Win98」「宋韵朱砂 / Song Xuan」「晴空水晶 / Frutiger」「铅字晨报 / Gazette」等，移除旧版樱粉/抹茶），并新增独立字体切换器（`FontSwitcher` `字`/`Aa`，支持 8 套中英文双层字体搭配，默认「幼圆等宽 / YouYuan Mono」）。
- Upgrade to Workbench UI v3 with unified 48px single-row header (including compact deck-editor action bar), sliding tab indicator, resizable split panes (`DshSplitResizer`), shimmer skeletons (`DshSkeleton`), row hover quick-actions, 13 bright `[data-dsh-style]` themes (adding `blueprint`, `risograph`, `win98`, `songhui`, `frutiger`, and `gazette`), and 8 dual-layer Chinese/Latin `[data-dsh-font]` pairings via `FontSwitcher` (defaulting to `arcade` YouYuan Mono).

## 0.24.2 (2026-11-18)

- 升级共享更新组件至 `@stardustlc/dsh-updates@0.2.5`：独立安装插件详情页底栏去重（保留组合包组件委派与对话页热更新卡片），补齐 `bundle-in-use` 组合包占用提示说明，并在检查结果过期或远端版本变更时自动刷新元数据，彻底消除 `check-first` 卡顿。
- Upgrade `@stardustlc/dsh-updates` to `0.2.5`: deduplicate standalone native plugin detail footers while keeping Suite delegation and in-chat reminder cards, surface clear `bundle-in-use` guidance, and automatically refresh expired update checks without `check-first` stalls.

## 0.24.1 (2026-11-18)

- 升级共享更新组件至 `@stardustlc/dsh-updates@0.2.4`：对话页新增一键热更新提醒卡片，自动检查周期缩短至 6 小时，手动热更新后可顺手开启包含兼容功能小版本的空闲自动更新。
- Upgrade `@stardustlc/dsh-updates` to `0.2.4`: add an actionable in-chat hot-update reminder card, 6-hour background update checks, compatible minor+patch idle auto-updates, and a post-update opt-in prompt.

## 0.24.0 (2026-11-18)

- **原生 Office Math（`<m:oMath>` + MathML）公式引擎与四大巅峰商业图示**：新增零外部依赖 `deck-math.mjs`，支持将 `slide.formula` 与行内 `$...$` / `$$...$$` LaTeX 公式确定性编译为原生可编辑 ECMA-376 `<m:oMath>` / `<m:oMathPara>` 与 HTML W3C MathML（覆盖分式 `\frac`、上下标、根式 `\sqrt`、大型求和积分 `\sum`/`\int`、矩阵与希腊字母）；新增 **麦肯锡不等宽市场图（`marimekko`）**、**Apple/NVIDIA 财报级多层级桑基流向图（`sankey`）**、**真·波特价值链（`value-chain`，顶部辅助活动横梁 + 底部咬合基本活动箭头 + 右侧利润楔）** 与 **SWOT 战略十字矩阵（`swot`，含中心破局锚点）**，HTML 与原生 OOXML 100% 同源对齐。
- **第 10 个 Agent 工具 `ppt_import`、存量 `.pptx` 一键翻新与 Office 双向导回**：支持导入任意外部 `.pptx`（提取文字/加粗重点、表格、原生 `<c:chart>` 图表、嵌入图片与演讲备注）一键翻新为全新可编辑 `dsh-ppt` 工程（可选自动现代焕新主题或保留原稿品牌配色），或将 PowerPoint / WPS 修改后的 `.pptx` 导回既有工程更新（自动保留 `.history/` 撤销历史，支持 `ppt_undo` / 工作台「撤销上次修改」）。
- **独立双屏演讲者提词台与演讲讲义导出**：HTML 放映内置 **`P` 键双屏演讲者提词台**（`BroadcastChannel` + `postMessage` 双向同步当前页、下一页预览、可调字号提词器、计时器与 **`L` 键虚拟激光笔**），并新增结构化演讲讲义 `.handout.md` 客户端/工作台下载（`kind: 'handout'`）。
- **工作台同步升级**：首页工程库与新建向导新增「导入 PPTX 翻新 / Import & Modernize .pptx」，打开工程顶栏与「风格与母版」新增「导入 Office 修改稿 / Sync Edited .pptx」，内容编辑器新增 `marimekko` / `sankey` / `swot` / `value-chain` 与 LaTeX `formula` 编辑框，下载面板新增「下载演讲讲义 (.md) / Download Handout」。
- Ship a zero-dependency LaTeX math engine (`deck-math.mjs`) compiling `slide.formula` and `$...$` / `$$...$$` expressions into native editable Office Math (`<m:oMath>`) in PPTX and W3C MathML in HTML, alongside 4 pinnacle consulting/financial layouts: variable-width **Marimekko (`marimekko`)**, multi-layer cubic-Bezier **Sankey (`sankey`)**, authentic **Porter Value Chain (`value-chain`)**, and **SWOT Cross Matrix (`swot`)**.
- Add the **10th agent tool `ppt_import`** (`importPptxDeck`, CLI `--import-pptx` / `--sync-pptx`) and Workbench `import-pptx` action (`≤24 MiB` in-memory upload) to extract slides, tables, live native charts, images, and speaker notes from external `.pptx` files — either creating a modernized editable project or syncing Office-edited `.pptx` changes back into an existing project with full undo history.
- Add **Dual-Screen Presenter View** (`P` shortcut / `#presenter-toggle` with next-slide preview, resizable teleprompter, pace timer, and `L`-key virtual laser pointer) and **Speaker Handout (`.handout.md`)** export across standalone HTML (`#download-handout`) and Workbench (`kind: 'handout'`).

## 0.23.1 (2026-11-18)

- 同步 `@stardustlc/dsh-updates` 0.2.3：侧边栏工作台平时默认隐藏底部更新栏（零高度占用），仅在检测到兼容新版本或执行更新时浮现单行精简提示条；完整更新设置与检查入口统一保留在 DSH「插件」详情页底部。
- Sync `@stardustlc/dsh-updates` 0.2.3: keep the sidebar workbench update footer hidden by default when up-to-date, surfacing a single-line compact strip only for actionable updates or active jobs while retaining full controls in native Plugin Details.

## 0.23.0 (2026-11-18)

- **24 套大师主题、8 套名家范本预设与 20 套行业蓝图**：新增 `bcg-emerald`（翡翠战略）、`economist-brief`（经济学人简报）、`venture-daylight`（红杉日间备忘录）、`stripe-craft`（云靛工坊）、`aurora-stage`（极光发布会）、`obsidian-amber`（黑曜终端）6 套主题（共 16 浅 + 8 深），内置 8 套免上传一键直吸名家范本预设；场景蓝图扩展至 20 套（新增 `quarterly-okr`、`product-prd`、`vc-daylight`、`industry-research`），并新增咨询价值链咬合五边形箭头（`chevron` / `value-chain`）原生可编辑图示。
- **深度 `.pptx` 吸收引擎升级**：支持递归拆解嵌套组合形状（`<p:grpSp>`）并换算子图元坐标，补全 `<a:sysClr>`、`<a:prstClr>` 与 `hueMod`/`hueOff` 修饰色解析，自动识别「深色庄重封面 + 浅色正文」双极性（`coverMode: "inverted-accent"`）、主辅双品牌强调色（`secondaryColor`）、中英标题/正文字体配对（`headingFont`）、表格风格提示及 24+ 版式序列诊断（`narrativeProfile`），面板上传上限提升至 24 MiB。
- **工作台自助起稿与品牌库沉淀**：工作台新增自助「新建演示文稿」向导（支持选蓝图、填大纲或传参考 `.pptx` 复刻骨架）、`localStorage` 持久化「我的品牌库」跨工程一键复用、预览画面文字/卡片/表格点击直达编辑框、哈维球 `● ◕ ◑ ◔ ○` 快捷填入按钮、原生取色器、顶栏直出下载 PPTX 与可折叠四步人类使用指引。
- Add 6 curated themes (`bcg-emerald`, `economist-brief`, `venture-daylight`, `stripe-craft`, `aurora-stage`, `obsidian-amber` for 24 total), 8 1-click World-Class Reference Presets, 4 scenario blueprints (`quarterly-okr`, `product-prd`, `vc-daylight`, `industry-research` for 20 total), and interlocking native-editable `chevron` (`value-chain`) diagrams.
- Upgrade `.pptx` absorption (up to 24 MiB in Workbench) to recursively unwrap nested `<p:grpSp>` group shapes, resolve `sysClr`/`prstClr`/`hueMod` color transforms, detect dark-cover + daylight-body polarity (`coverMode: "inverted-accent"`), extract `secondaryColor` and `headingFont` pairings, classify all 24+ slide archetypes, and report `narrativeProfile`.
- Add a self-serve **New presentation** wizard, persistent **My Brand Library**, expanded click-to-focus preview targets, 1-click Harvey ball insertion chips, color pickers, direct PPTX download, and a collapsible 4-step workflow guide.

## 0.22.1 (2026-11-18)

- 更新区底部新增克制、无打扰的 GitHub 点赞与问题反馈快捷链接，并完善中英文检索关键词。
- Add subtle, non-intrusive GitHub Star and issue feedback links in the update footer, and expand search keywords.

## 0.22.0 (2026-11-18)

- **18 套大师主题与 6 套差异化母版骨架**：在保留原有 14 套主题的基础上新增 `keynote-light`（库比蒂诺留白）、`financial-ft`（金融时报）、`medical-clean`（仁心临床）、`luxury-noir`（黑金策展），共 12 套明亮 + 6 套深色主题；引入 6 套结构差异化的母版骨架（`consulting-classic`、`keynote-spatial`、`editorial-folio`、`saas-bento`、`academic-minimal`、`gov-ceremonial`），支持 `brand.chromeStyle` 整稿覆盖与 `slide.chrome` 单页覆盖，HTML 与 PPTX 原生 OOXML 100% 同源对齐。
- Add 4 curated themes (`keynote-light`, `financial-ft`, `medical-clean`, `luxury-noir`) for 18 built-in themes total (12 daylight + 6 dark), paired with 6 structurally distinct Master Chrome Skeletons (`consulting-classic`, `keynote-spatial`, `editorial-folio`, `saas-bento`, `academic-minimal`, `gov-ceremonial`) via `brand.chromeStyle` and per-slide `slide.chrome` with full HTML + native OOXML parity.
- **24 种原生可编辑版式与专业图示**：新增 5 大零外部依赖原生可编辑图示——`gantt`（甘特图路线图，支持 `columns` 时间轴、`start`/`span` 进度条与 `diamond` 里程碑）、`architecture`（分层系统架构与跨层安全侧栏及数据流箭头）、`harvey`（`● ◕ ◑ ◔ ○` 哈维球竞品能力矩阵，支持 `tableStyle: 'harvey'`）、`tam`（底部相切 TAM/SAM/SOM 同心圆与右栏拆解卡）、`org`（`tree` 汇报树状图与 `team` 首字母头像卡）；`process` 新增 `flywheel` 增长飞轮变体与 `funnel` 阶段转化率徽章；并支持 `kpi`、`cards`、`comparison`、`matrix`、`callout`、`booktabs` 学术三线表、`chart-split` 与矢量 `waterfall` 瀑布桥。
- Expand to 24 canonical native-editable layouts and pro diagrams: `gantt` roadmaps (with `columns`, `start`/`span`, and `diamond` milestones), `architecture` layered diagrams with cross-cutting sidecars and flow arrows, `harvey`-ball competitor matrices (`tableStyle: 'harvey'`), concentric `tam` (TAM/SAM/SOM) circles, and `org` (`tree` / `team`) charts, alongside `process` `flywheel` / `funnel` conversion badges, Bento/pillar `cards`, `kpi`, `comparison`, `matrix`, `callout`, `booktabs` 3-line tables, `chart-split`, and vector `waterfall` bridges.
- **深度 `.pptx` 骨架吸收与智能导演 16 套行业蓝图**：`ppt_absorb` 与 `referencePptx` 升级支持 DrawingML `lumMod`/`tint`/`shade`/`satMod` 修饰色解析、母版骨架几何提取（`extractedSkeleton`）、`recommendedChrome` 推荐与逐页版式序列（`slideSkeleton[]`），`ppt_create` 新增 `cloneStructure: true`（CLI `--clone-structure` / `--chrome`）自动将生成文稿映射至参考结构，内置 WCAG ≥4.5:1 对比度净化与刺眼背景/位图字体降级；零提问自动导演扩展至 16 套行业场景蓝图（新增架构评审、财报发布、临床病例、故障复盘、营销战役、晋升述职、法务合规、创意 Lookbook），`deck-data` 数字溯源全面延伸至新图示字段。
- Upgrade `ppt_absorb`, `referencePptx`, and `ppt_create` (`cloneStructure: true`, CLI `--clone-structure` / `--chrome`) to resolve DrawingML color transforms (`lumMod`/`tint`/`shade`/`satMod`), extract `extractedSkeleton`, `recommendedChrome`, and per-slide `slideSkeleton[]` with WCAG ≥4.5:1 sanitization; expand Scenario Auto-Director to 16 industry blueprints (`architecture-review`, `financial-earnings`, `medical-case`, `postmortem`, `marketing-campaign`, `promotion-review`, `legal-compliance`, `creative-lookbook`) and extend `{{metricId}}` lineage bindings across all new diagram fields.
- **风格与母版工作台、24 页双层视觉检查与高管叙事预审**：新增「风格与母版（Style Studio）」与 6 套母版骨架选择器，支持 18 套主题、24 种版式、甘特图/哈维球编辑器、拖拽 `.pptx` 预览骨架摘要、HTML ↔ PPTX 并排对比与全宽视觉修复前后对照（最多 24 页、12 种无损动作）；叙事教练升级 SCQA / 金字塔 / Action Title 把关（最多 8 条建议，覆盖 7 类听众）；同步共享 `workbench-ui` v2 原语与宿主主题 token。
- Ship the **Style Studio** tab with a 6-Chrome Master Skeleton picker, 24-layout archetype switcher, Gantt/Harvey editors, drag-and-drop `.pptx` skeleton preview, HTML ↔ PPTX split comparison, 24-slide two-tier Vision QA (12 lossless actions + full-width diff), and SCQA/Action-Title storyline coaching (up to 8 findings across 7 personas), synced with `workbench-ui` v2 primitives and host theme tokens.

## 0.21.1 (2026-11-18)

- 同步 `@stardustlc/dsh-updates` 0.2.1：恢复 Suite 整包统一更新（移除独立拆包迁移），保留整包与独立插件的原地热更新与失败自动回滚。
- Sync `@stardustlc/dsh-updates` 0.2.1: restore unified Suite bundle updates (removing standalone conversion) while retaining in-place hot reload and automatic rollback.

## 0.21.0 (2026-11-18)

- 升级至 Workbench UI v2 并深度适配 DeepSeek Harness `>=0.2.2-rc.3`：按需接入 `@deepseek-ai/dsh-client-ui-primitives` 宿主组件（含独立测试语义回退与弹窗/菜单 Portal 风格同步）、顶部窗口避让与拖拽排除标记。
- 新增 5 套明亮主题切换（原生清透 / 米白纸感 / Claude 暖书卷 / 8-Bit 像素 / 晴空薄荷），跨工作台同步存储，暗色模式与全屏预览采用柔和板岩灰避免压抑纯黑；补齐微交互动效、无障碍减少动态支持与 Cordis 4 `ctx.effect` 卸载清理。
- Upgrade to Workbench UI v2 for DeepSeek Harness `>=0.2.2-rc.3`: lazy host UI primitives with standalone semantic fallbacks and portaled Menu/Modal style sync, 5 synced `[data-dsh-style]` studio presets with soft-slate dark mode, tactile button/icon micro-animations (`prefers-reduced-motion` aware), and Cordis 4 `ctx.effect` unload cleanup.

## 0.20.8 (2026-11-17)

- 在工作台单独检查和安装兼容版本。自动安装默认关闭，可为该插件开启空闲时的稳定补丁更新。
- Check and install compatible versions separately from the workbench. Automatic installation is off by default. Enable it for this plugin to apply stable patches while idle.

## 0.20.7 (2026-11-16)

- 修复 Windows 版 DeepSeek Harness 中 `ppt_render` 导出 PNG 和 PDF 时找不到 `dsoffice.exe` 的问题。使用桌面版已解包的 LibreOffice 引擎即可导出，无需另外安装（#8）。
- Fix PNG and PDF export in the packaged Windows desktop app by resolving the bundled LibreOffice native engine from `app.asar.unpacked` (#8).

## 0.20.6 (2026-11-14)

- 适配 DSH 0.2.2-rc.3：PPTX 渲染器接受宿主内置的 @deepseek-ai/libreoffice-kit 0.2.3（0.1.5 继续可用），并实测其 createConverter / renderImages / convert 接口；最低 Harness 声明提升至 0.2.2-rc.3。
- Support DSH 0.2.2-rc.3: accept the host-bundled @deepseek-ai/libreoffice-kit 0.2.3 (0.1.5 keeps working) and verify its createConverter / renderImages / convert API; raise the minimum Harness declaration to 0.2.2-rc.3.

## 0.20.5 (2026-11-04)

- 同步共享界面：嵌入设置时继承宿主底色，输入框跟随主题，空状态保持可读宽度；新版 DSH 可显示插件设置图标。
- Align embedded surfaces, themed inputs, readable empty states and optional native settings icons.


## 0.20.4 (2026-11-03)

- 工作台改用宿主主题 token（暗色不再写死浅色）；错误恢复改用共享 Status/Button 与重试，首次空态复用 Empty，退出全屏按钮仅在全屏显示。
- The workbench follows host theme tokens, uses shared status/retry and empty states, and only shows the exit-fullscreen control in fullscreen.
- 同步共享 workbench-ui v1.1：Page 外的 Empty / Dialog / Status 自带样式与 `.dshw` 主题作用域，Status 新增 warn 色调。
- Sync workbench-ui v1.1: Empty / Dialog / Status now carry their own styles and `.dshw` theme scope outside Page, and Status gains a warn tone.

## 0.20.3 (2026-10-30)

- 重整中英文首页：用途、三步流程图、安装入口与操作示例；详细配置与边界集中到完整说明。
- 保留下载统计、独立更新选择、问题反馈和贡献入口；原封面与运行功能保留。
- Refresh bilingual landing pages, workflow artwork, quick starts and reference navigation.


## 0.20.2 (2026-10-30)

- 原生插件列表与详情新增专门生成的鲸鱼娘图标：大头像、独立功能符号、透明留白，适合 30 / 36 px 显示；原封面保留。
- Add purpose-made whale-girl artwork with a distinct function emblem, transparent padding and small-size readability; preserve the original cover.


[返回简介](README.md) · [使用说明](docs/USAGE.md) · [验证记录](docs/VALIDATION.md)

[历史英文记录](docs/CHANGELOG.en.md)

## 0.20.1 (2026-10-29)

- 补齐中英文使用流程：准备、入口、具体操作与结果核对；新增累计 npm 下载徽章并保留月统计。
- Add practical getting-started workflows and lifetime npm download badges alongside monthly counts.

## 0.20.0 (2026-10-29)

- 工程库新增关键词搜索和最近 / 最早更新、自然标题排序；保留返回列表时的筛选条件，提供无匹配提示和清空搜索。
- Add project search and updated / oldest / natural-title sorting, retained filters on return, and a clear no-results state.

## 0.19.1 (2026-10-29)

- 同步仓库与 npm 的简明介绍、中英文 README 和反馈入口；本次为文档与包元数据更新。
- Sync npm descriptions and both README guides with the repository, including issue and pull-request links.

## 0.19.0 (2026-10-28)

- 下载面板区分分享成品包与完整工程包。分享包包含当前 PPTX、离线 HTML 和逐页讲稿，不打包 JSON 工程；工程备份入口继续保留。
- 分享 HTML 移除缺失工程文件的下载入口；不覆盖原文件，沿用修订校验与未保存保护，下载无需调用模型。
- Add separate share and project bundles, with current speaker notes and clear content boundaries. Preserve revision guards and original files; ordinary downloads require no model calls.

## 0.18.3 (2026-10-27)

- 修复分批更新时的新旧更新控件混用：保留原页面、草稿与安装保护，空闲后接管旧控制器，兼容旧入口。

## 0.18.2 (2026-10-27)

- 更新控件移至原有工作台或原生插件详情页底部；更新记录与选项原地展开，移除独立更新菜单与页面。
- 保留原页面操作与草稿，自动安装默认关闭；安装前确认，遇到未保存修改或运行任务时暂停。

## 0.18.1 (2026-10-27)

- Keep this component's own update entry visible when installed transitively through Suite. Confirm whole-Suite update scope before opening its controls.
- Keep automatic installation off by default and preserve independent installation behavior.

## 0.18.0 (2026-10-26)

- Add this plugin’s own update controls and independent preferences. Automatic installation stays off until explicitly enabled.
- Confirm manual installs, preserve local sources and disabled state, pause for tasks or unsaved changes, and use native DSH recovery without forced restarts.
- Require the public DSH 0.2.1-rc.3 update APIs; Suite components remain managed through Suite.

## 0.17.0（2026-10-25）

- 演示文稿主工作台，页面、画布与属性分栏；数据推演切页保留预览联动，未保存保护和画面内全屏退出更完整。
- 提供 DSH 原生侧栏入口，保留设置页；统一中英、深浅色、窄屏、键盘焦点与真实空/失败状态。
- 浏览器源码移至 templates/client.js、templates/panels/ 与共享组件，独立构建为 lib/client.js；移除重复的首次引导。
- 官方 DSH 0.2.1-rc.3 Web 逐项实际操作验收，账户模拟和未验收范围见 [工作台说明](docs/WORKBENCH.md)。

## 0.16.1（2026-10-24）

- 适配 DSH 0.2.1-rc.3 的动态模型目录：视觉检查、AI 预审与模拟答辩按提供方和模型 ID 保留选择，刷新或重排目录不会悄悄更换模型。
- 已选模型下线时清空选择并禁用开始按钮，等待重新选择。首次仅沿用仍然可用的工程模型，不自动选择目录里的第一个模型。
- Windows 测试、官方 RC.3 发布包安装和实际浏览器范围见 [0.16.1 验证记录](docs/validation-0.16.1.md)。

## 0.16.0（2026-10-23）

- 新增可选 AI 看图检查与排版修复：通过官方 DSH 图片附件和预备模型接口检查最终 PPTX 渲染图片，记录页面与问题区域。
- 修复仅使用字号、要点 / 表格拆页、柱图转横向条形图、图片完整显示等受限操作；不让模型重写原文、数值或公式。每轮另存可撤销副本，并重新渲染后复查新增页面。
- 工作台提供调用上限、停止、前后实际画面对比、未解决问题、历史与 Markdown 记录。旧工程、变化的 PPTX、渲染图片或副本不能误用。
- 普通成品生成不启动视觉模型；需自行配置支持图片输入的 DSH 模型和可选官方渲染引擎。范围与边界见[看图修复](docs/VISUAL.md)。
- Windows 测试、真实 DSH Web、真实模型样例、原生 PPTX 渲染和全新安装范围见 [0.16.0 验证记录](docs/validation-0.16.0.md)。

## 0.15.0（2026-10-23）

- 新增可选数据模型：数字绑定原始材料行、CSV / TSV 单元格或受限算术公式；点击 HTML 数字逐层追问来源，未绑定数字明确提示。
- 工作台与离线 HTML 支持假设滑杆，文字、表格和图表联动；不修改来源事实。离线参数可导回 DSH，确认后生成相符的静态 PPTX。
- 来源更新和推演先显示指标、页面及字段差异，再确认保存；默认新副本保留原稿，支持撤销。旧预览、其他工程参数与外部 Office 修改受保护。
- PPTX 备注与 Markdown 报告附上来源摘录、定位、快照校验值、公式和假设。HTML 不嵌入完整材料；JSON 工程保留导入材料供后续编辑。
- 修复离线放映中隐藏页外框拦截数字点击的问题。验收范围见 [0.15.0 验证记录](docs/validation-0.15.0.md)。

## 0.14.0（2026-10-22）

- 成品页新增按需开启的 AI 预审与人机模拟答辩，复用宿主已有模型，不影响直接交付。
- 预审区分表达、逻辑与证据问题；引用必须匹配所提供的原文。仅表达建议可选中改稿，新增数字没有匹配来源时不提供采纳按钮。
- 采纳所选修改或备用问答页时另存副本，原稿保留，副本可撤销。旧修订的报告可查看，禁止继续调用和套用。
- 提供中英文配置、回答输入、取消与提前结束、报告历史和 Markdown 问答 / 材料清单。预审最多 3 次插件调用，答辩最多 5 题、6 次调用；失败不自动重试。
- 演练只发送选定页面的文字、图表数据、备注及用户补充材料，不带工具或图片文件。验收范围见 [0.14.0 验证记录](docs/validation-0.14.0.md)。
- PPT 工作台使用当前 DSH 的主题变量，修复深色主题下仍显示浅色面板的问题。

## 0.13.0（2026-10-20）

- **设置面板体验**：新增 Ctrl/⌘+S 保存、Esc 取消或返回、Alt+←/→ 切换页面；HTML 预览 iframe 内同样生效。
- **未保存保护**：标题旁显示「未保存」徽标；刷新/关闭页面前提示；Esc 取消修改前先确认。
- **错误恢复**：错误提示旁新增「重试」按钮；空状态支持一键复制示例提示词。
- **无障碍**：补充 aria-busy、aria-keyshortcuts、role=status；焦点在 SELECT 上时不再劫持 Esc。
- 中英文案与 README 同步；131 项测试通过。
## 0.12.1（2026-10-20）

- 修复 #4：记录 HTML / PPTX 的 SHA-256；检测外部修改或旧工程缺少记录时拒绝覆盖，新增「另存副本」与 `ppt_edit.saveAs`，原文件保留。副本从 JSON 重建，不导入 Office 手工修改。
- 读入当前工程和撤销历史时验证品牌颜色、字体及图片适应方式，拒绝不合规工程；纯文字 PPTX 清理 XML 禁止字符，保留中文与 emoji。

## 0.12.0（2026-10-20）

- 新增逐页 Markdown 讲稿下载，使用当前页序、标题与备注，保留空备注提示和修订保护。
- 修复图片读取中切页或返回项目时图片可能落到另一页的问题；可取消读取，读取期间暂缓保存、结构修改与下载。
- 面板图片上限与引擎统一为 5 MiB，提前提示超限。
- 首次使用引导跟随宿主中文 / English，完成或跳过的状态继续保留。

## 0.11.0（2026-10-17）

- 设置面板顶部新增「首次使用」分步引导：一次只讲一步，支持上一步/下一步/跳过，看完记在本机不再出现。
- 引导内容与该插件的实际用法一致；可在开发者工具里清掉 `dsh-first-run:dsh-ppt:v1` 重新查看。
## 0.10.0 (2026-10-15)

实际操作、最终 PPTX 渲染与未测范围见 [验收记录](docs/validation-0.10.0.md)。

- 设置页可复制、删除当前页，复制时保留图片、原生图表与备注；副本拥有独立页面 ID。
- `ppt_edit` 增加 `duplicate` / `remove`，支持与文字修改、排序合并成一次原子修改，整步可撤销。
- 保留至少一页并限制 120 页；未保存输入或修订冲突时阻止结构修改，避免覆盖正在编辑的内容。

## 0.9.0 (2026-10-05)

- 增加成品 ZIP 下载：一次交付 HTML、可编辑 PPTX、工程 JSON 和使用说明；只打包本项目登记的当前修订，未保存或产物缺失时阻止交付。

## 0.8.1 (2026-10-03)

- 演示文稿工作台、质量提醒和后台失败引导跟随宿主中文 / English 切换；正文、成品语言与工程内容保持原样。
- 验收范围见 [中英文界面检查](docs/validation-language-2026-10-03.md)。

## 0.8.0 (2026-10-02)

- Add an authenticated DSH presentation workbench: click-to-focus text, edit fields/notes, replace uploaded PNG/JPEG, reorder pages, undo and download regenerated artifacts.
- Add `order` to `ppt_edit`, validating a complete permutation of stable slide IDs and combining text edits/order into one atomic undo record.
- Track only tool-created/checked JSON projects in a bounded local catalog. Browser requests cannot supply arbitrary file paths or image paths.
- Keep HTML playback separate from optional final PPTX rendering, display missing fonts and invalidate images after source/revision changes.
- Preserve unsaved input after failed saves; prevent embedded player navigation from desynchronizing the selected slide.

## 0.7.0 (2026-10-02)

- Add offline delivery controls: editable PPTX/project downloads, previous/next buttons, page-number navigation, quality findings and a clickable outline.
- Mark incomplete drafts, localize controls for Chinese/English/bilingual output, and support narrow viewports without requiring a DSH server.
- Render HTML links after collision-resolved paths are selected, preserving the atomic three-file commit and project revision guard.
- Escape display text and link only to encoded sibling filenames. Add delivery, revision-refresh and injection regression tests.
- Windows: 103 tests passed; browser interaction covers navigation, review, draft labeling, English controls and 390px layout.

## 0.6.0 (2026-10-01)

- 新增离线嵌入图片的三种布局、四类原生可编辑图表及数据工作簿；精确使用 MIT Office Kit 0.21.0，保留备注和原有动效。
- 新增 ppt_templates、ppt_edit、ppt_undo、ppt_check、ppt_render；四种场景结构参考、品牌、稳定页面ID、修订冲突保护和最多20次原子撤销。
- 质量报告定位具体页面；未填模板明确标注草稿，静态估算、渲染、视觉检查分开说明。
- 可选官方 LibreOffice Kit 0.1.3 读取最终PPTX生成PNG/PDF，报告缺失字体并写入完整性收据；不修改可编辑源文件。
- 修正总览缩略图重叠、PPTX表格标题字号、正文段间距、图片说明间距和图表坐标/比例标签。
- CLI覆盖全部流程，显式收据失效返回非零，默认渲染目录位于PPTX旁。
- 修正默认主题PPTX字体映射：CSS可选字体与本机Office字体分离，明确东亚字体，避免官方渲染时中文字符重叠；工具schema使用官方宿主支持的oneOf。

## 0.5.1 (2026-09-28)

- 兼容验证更新到 Harness 0.2.0-rc.1：70 项测试与 18 插件共同加载检查通过（`ppt_create` / `ppt_themes` 与 `dsh-ppt` 技能注册正常）。
- 运行时代码未变；同步中英文兼容性声明。

## 0.5.0 (2026-09-24)

- 包含新的演讲者预览、缩略图和计时控件。浏览器不支持或拒绝全屏时显示操作提示，不再无声失败。

- **演讲者视图升级**：独立窗口内显示真实当前页与下一页预览（复用幻灯片渲染）、全片缩略图条（点击跳页）、wall clock + 计时（P 暂停 / T 重置）、备注字号 +/-、黑屏 / 白屏（B / W）、结束放映一键退出。
- **通信更稳**：演讲者窗口改用 Blob URL + postMessage 同步，不再依赖同源 document 直连，file:// 打开的 deck 也能正常联动；窗口被直接关闭后 0.8 秒内自动恢复普通模式。
- **观众端**：黑屏 / 白屏时隐藏 HUD；观众端备注与 HUD 默认隐藏逻辑保持不变。
- 播放器保留 0.4.5 的全部修复，70 项测试通过。

## 0.4.5 (2026-09-24)

- **播放器交互修复（由合成用户复测驱动）**：备注面板不再遮挡页脚 HUD，新增关闭按钮并支持 Esc；无备注页显示「本页无备注」占位；`G` 改为缩略图网格总览（当前页高亮、页码同步、点击跳页、Esc 退出、页码角标）；`?` 打开快捷键帮助；表格页补页面标题、数字列右对齐、表格边界与内容列对齐、表头对比度达标；窄屏字号下限 14px、HUD 按钮 44px；新增环绕提示、ArrowUp/Down 翻页、数字 1-9 跳页、focus-visible 与 reduced-motion 处理。
- **演讲者视图（V）**：独立窗口显示当前页 / 下一页 / 备注 / 计时 / 进度，支持 +/- 字号、T 重置计时、P 暂停、方向键翻页、Esc 关闭；打开后主窗口隐藏备注与 HUD，观众端不泄露备注，关闭后状态自动恢复。
- **主题预览**：`ppt_themes { preview: true, outputDir: "..." }` 生成 `themes-preview.html`（5 套主题并排对比）与每套主题一张 `theme-<id>.svg` 色板卡，可直接用于 README / npm 首屏。
- 测试 70 项通过；三个合成用户（非技术运营 / 键盘党 / 培训讲师）真实浏览器复测通过，无 P0/P1。

## 0.4.4 (2026-09-21)

- Markdown 与结构化长表格自动按每页 8 行数据分页，续页重复表头，备注仅放第一页；修复无小标题、首个 H1 下表格被丢弃。
- 不再静默裁掉中间幻灯片、额外列或长单元格：总页数超过 maxSlides、超过 8 列或单元格超过 60 字符时，生成前提示调整。短行补空白，HTML 与 PPTX 保留同一份数据。
- 续页标题跟随中文、英文或双语设置。新增 7 项回归，67 项测试通过；生成产物检查覆盖全部 17 行数据。

## 0.4.3 (2026-09-19)

- 修复：中文分句导致正文丢内容；`--content deck.md` 不读文件；>8 条要点静默丢弃；`deck.json` 版本写死；英文 deck 被标 zh-CN。
- 稳健性：三件套改为 tmp + rename 原子提交（失败回滚）；过滤 Windows 保留名；文件名探测改一次目录快照。
- 测试 48 → 60 项。

## 0.4.2 (2026-09-12)

- 适配并验证官方 Harness 0.1.5-rc.1：整套同载、工具/技能契约与 Web 鉴权检查通过。
- Node 要求与宿主统一为 `^22.19.0 || >=24.0.0`；更新中英文兼容性说明。

## 0.4.1 (2026-09-05)

- 修复中文正文分页：中英文标点都作为句子边界，无标题纯文本严格按「每 5 句一页」分页，不再把整段中文当一句而截断丢正文。
- CLI `--content <path>` 与 `--content @<path>` 行为一致：路径存在即读取文件，README / SKILL.md 示例可直接复制运行。
- 单节要点超过 8 条时自动续页（第二页起标题带「（续）」），不再静默丢弃第 9 条之后的要点。
- manifest `version` 改从 `package.json` 读取，消除与发版号的漂移；测试同步改为动态断言。
- PPTX 文本与备注 run 的语言跟随 `lang`（zh-CN / en-US），英文 deck 不再被 PowerPoint 标成中文。

## 0.4.0 (2026-09-01)

- **动效（motion，默认开）**：HTML 放映页间淡入 + 要点按序逐条入场（打印自动兜底为静态）；PPTX 每页原生淡入转场，`bullets` 页按段落构建、放映时点击一次出现一条要点（PowerPoint「出现，按段落」标准时序）。
- **`motion` 开关**：`ppt_create` 新增 `motion: 'on' | 'off'`，CLI 新增 `--motion on|off`；`off` 时产物不含任何动画代码，适合严肃/打印场景。manifest 记录该开关。
- **技能文件瘦身**：SKILL.md 收敛为触发条件 + 执行纪律 + 六步流水线 + 按需装载索引 + 质量门禁；新增 `references/syntax.md`（Markdown 解析、表格/金句/备注语法、结构化 slides、motion）与 `references/troubleshooting.md`；写作规则去重归口 `references/copywriting.md`，hyperframes 视觉联动并入 `references/themes.md`。
- 动效相关测试 8 例（转场/时序树/点击节点计数/静态开关/CLI/工具层），全套 42/42 通过。

## 0.3.0 (2026-09-01)

- **演讲者备注**：结构化 `slides` 的 `notes` 字段与 Markdown `<!-- 备注: ... -->` 注释都会成为该页备注；HTML 放映按 `S` 键（或右下角「备注」按钮）呼出备注面板；PPTX 生成原生 `notesSlide` + `notesMaster` 部件，PowerPoint 演示者视图直接可用。
- **新增 `quote` 金句版式**：`>` 引用块自动识别，末行 `—— 出处` 识别为署名；HTML 与 PPTX 双端实现。
- **新增 `table` 表格版式**：Markdown 表格（`| ... |`）自动识别，PPTX 用原生 `a:tbl` 图形帧（主题色表头 + 隔行着色），限 9 行 8 列。
- 版式集合扩为 `cover | section | bullets | statement | quote | table | closing`；结构化 `slides` 增加 `rows` 字段。
- 无表格数据的 `table` 页自动退化为要点页，避免空白版式。
- 新特性测试 8 例（解析/规范化/HTML/PPTX 部件/端到端）。

## 0.2.1 (2026-09-01)

- 修复 PPTX zip 中央目录 local header 偏移恒为 0 导致 PowerPoint 提示修复的问题（issue #1/#3，社区 PR #2 同修法）。

## 0.2.0 (2026-08-16)

- 新增 `defaultTheme` / `defaultLang` 配置，作为 `ppt_create` 未显式传参时的默认值。
- 配置校验：`defaultLang` 仅接受 `zh` / `en` / `bilingual`。
- 更新测试覆盖与双语文档。

## 0.1.0 (2026-08-16)

- 首发：`dsh-ppt` 技能 + 工具插件。
- `ppt_create`：Markdown / 结构化 slides → HTML 网页放映 + PPTX 导出 + manifest。
- `ppt_themes`：5 套内置视觉主题（Swiss Pulse / Velvet Standard / Data Drift / Soft Signal / Maximalist Type）。
- 中英双语界面（zh / en / bilingual）。
- 裸 SKILL.md + `build-deck.mjs` CLI，跨 Claude Code / Cursor / Gemini CLI / Codex / DSH。
- 零运行时依赖：OOXML 与 zip 由 `node:zlib` 手写生成。

## 更早的改动

完整历史可查阅 [GitHub 提交记录](https://github.com/STARDUSTLC666/dsh-ppt/commits/master)。

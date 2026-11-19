# 出版级图表、图文精裱、母版吸收、编辑与视觉核验（高级参考）

Agent 先提炼真实内容与数据结论，再通过结构化参数生成可放映 HTML 与 100% 原生可编辑 PPTX。用户无需手写 JSON。

---

## 一、20 套高品味行业结构蓝图（`ppt_templates`）

调 `ppt_templates` 可查看 20 套内置叙事与版式骨架（前 8 套兼容经典场景，后 12 套为高频垂直行业与现代职场蓝图）：
- **经典 8 套**：`weekly`（周报复盘）、`defense`（学术答辩）、`project`（项目汇报 · 含 `gantt` 排期）、`pitch`（创业路演 · 含 `tam` + `harvey`）、`consulting`（战略咨询）、`keynote`（产品发布）、`gov-report`（政务述职）、`workshop`（培训工坊）
- **垂直行业 8 套**：`architecture-review`（技术架构评审）、`financial-earnings`（季度财报与业绩会）、`medical-case`（临床病例研讨）、`postmortem`（线上故障复盘）、`marketing-campaign`（品牌营销与增长战役）、`promotion-review`（个人述职与晋升答辩）、`legal-compliance`（法务合规与风控审计）、`creative-lookbook`（高端品牌策展与画册）
- **新增高频 4 套**：`quarterly-okr`（季度 OKR 复盘与规划 · 含 `chevron` 价值链）、`product-prd`（产品需求与方案评审 PRD）、`vc-daylight`（阅读版融资商业计划书 · 明亮投资备忘录风）、`industry-research`（行业深度研究与洞察 · 经济学人风）

> 注意：`ppt_create` 仅传 `template` 而不提供实际 `content` / `slides` 时，仅生成带占位的待填草稿（返回 `deliveryStatus: "draft"`）；必须组织好真实业务内容再生成，方能进入成品验收（`ready`）。

---

## 二、13 类出版级图表与图表洞察分栏（`chart` & `chart-split`）

支持 **13 种 `chart.kind`**：
1. **柱条对比**：`column`（簇状柱形）、`bar`（横向条形）、`stacked-column`（堆积柱形）、`stacked-bar`（堆积条形）、`percent-column`（百分比堆积柱形）、`percent-bar`（百分比堆积条形）
2. **趋势面积**：`line`（折线图）、`area`（面积图）
3. **份额结构**：`doughnut`（**推荐**：62% 内径环形图，中心展示汇总指标）、`pie`（饼图，仅限单一非负系列且正总和）
4. **相关性与双轴**：`scatter`（散点图）、`combo`（柱线复合双轴图：在 `series[i]` 上指定 `chartKind: 'column' | 'line'` 与 `secondaryAxis: true`）
5. **咨询瀑布桥**：`waterfall`（财务/增长增减拆解桥：HTML 输出高精 SVG + 读屏数据表，PPTX 输出 **100% 原生可编辑矢量圆角柱 + 虚线连接桥 + 正负号数值标签**，跨 PowerPoint / WPS / LibreOffice 零兼容死角；可通过 `totalIndices: [0, 4]` 指定起止汇总柱）

### 经济学人 / 麦肯锡图表造型法则（内置默认生效）
```json
{
  "layout": "chart-split",
  "variant": "chart-left",
  "kicker": "02 · 渠道增长归因",
  "title": "Q4 到馆人次较 Q1 翻倍，社区亲子活动贡献核心跃升",
  "chart": {
    "kind": "column",
    "subtitle": "单位：人次 · 2026 年第 1–4 周实测",
    "categories": ["第 1 周", "第 2 周", "第 3 周", "第 4 周"],
    "series": [{ "name": "到馆人次", "values": [42, 55, 63, 78] }],
    "unit": "人次",
    "highlight": "max",
    "showValues": true
  },
  "items": [
    { "tag": "核心驱动", "title": "第 4 周峰值达 78 人次", "text": "周末亲子共读专场带动单周环比增长 **+23.8%**" },
    { "tag": "复购留存", "title": "旧书流转率 68%", "text": "二次到馆家庭占比突破六成" }
  ],
  "takeaway": "建议将亲子共读固定为双周常设栏目，支撑下季度场均 85 人次目标。",
  "source": "数据来源：社区图书馆门禁签到统计（2026.03）"
}
```
- **去冗余图例**：`series.length === 1` 时自动隐藏单系列图例，彻底告别多余色块说明。
- **一主多灰聚焦（`highlight`）**：支持传索引（如 `3` 或 `[0, 3]`）或 `'max' | 'last'`；焦点柱使用主题 `chartFocal` 高亮色，其余对照柱自动退为柔和 `chartNeutral` 灰阶。
- **直接数值标签与淡化网格**：≤ 8 个类别默认开启柱顶直接数值标签（`showValues: true`），水平网格线精简至 ≤ 5 条 `0.75pt hairline` 细线。
- **长标签防歪头**：当类别文字过长（中文 > 6 字 / 英文 > 10 字符）或类别数 > 7 时，自动或优先使用横向 `bar` 条形图，拒绝 45° 斜排字。

---

## 三、图文精裱与多图画册（`image` / `image-left` / `image-right`）

- **本地嵌入与尺寸边界**：PNG / JPEG 本地路径按会话 `cwd` 解析（亦支持 `data:` URI）；单张 ≤ 5 MiB / 3200 万像素，全稿合计 ≤ 32 MiB。图片直接打包进 HTML 与 PPTX，移动原文件后仍可独立放映。外链或 SVG 请先用经授权的工具转为本地 PNG/JPEG，引擎不自动联网下载。
- **版式变体**：
  - `image-left` / `image-right`：`variant: 'framed'`（默认圆角细框精裱，正文列自动垂直居中）或 `'split-bleed'`（50% 半屏无边距出血大图，杂志大片感）。
  - `image`：`variant: 'framed' | 'full-bleed' | 'gallery'`；传 `images: [{ src, alt, caption }, ...]`（2–3 张）可排版并列作品集或实验定性对比图。

---

## 四、外部 `.pptx` 风格吸收、全量导入翻新与 Office 双向同步（`ppt_absorb` / `ppt_import`）

1. **提取外部 `.pptx` 母版风格与骨架（`ppt_absorb`）**：
   - 调用：`ppt_absorb { pptxPath: "corp-template.pptx" }`（CLI：`--absorb corp-template.pptx`）。
   - 纯离线读取主题 12 色槽（含 DrawingML `lumMod / lumOff / tint / shade / satMod` 子变换解析）、西文与东亚字体族、母版背景、内嵌 Logo、母版骨架特征（`extractedSkeleton: { cornerStyle, hasTopBanner, hasSideSpine, masterShapeCount }`）、推荐母版骨架（`recommendedChrome`）与逐页版式推演（`slideSkeleton[]`），经 `sanitizeAbsorbedTheme()` 自动完成 WCAG 对比度净化与刺眼大红底降级。
2. **外部 `.pptx` 全量内容导入与老旧 PPT 一键翻新（`ppt_import` / `--import-pptx`）**：
   - 调用：`ppt_import { pptxPath: "legacy.pptx", theme: "auto", modernize: true }`（CLI：`--import-pptx legacy.pptx --theme auto --out dist`；保留原品牌色与 Logo 可加 `preserveSourceTheme: true` / `--preserve-theme`）。
   - 自动解析每页真实内容：标题、Kicker、副标题、正文与要点（保留粗体引导词为 `**bold**`）、原生表格（`<a:tbl>`）、原生图表（`ppt/charts/chart*.xml` `<c:cat>/<c:val>` 保留为可编辑图表）、嵌入位图（PNG/JPEG/WebP 安全导出至 `assets/imported-sN-M.<ext>`）及演讲者备注（自动剥离页码占位符），并智能映射为 `dsh-ppt` 原生版式，输出完整可放映 HTML（含按 `P` 启动的双屏演讲者提词台、按 `L` 激光笔与讲义下载）、可编辑 PPTX 与 JSON 工程。
3. **Office 改稿双向回导同步（`ppt_import` + `projectId` / `--sync-pptx`）**：
   - 在 PowerPoint / WPS 微调 `.pptx` 后，传 `projectId`（CLI：`--sync-pptx edited.pptx --edit dist/deck.json` 或 `--target-project dist`）即可将最新文字、表格、图表、图片与备注导回工程；同步前自动把原 `project.json` 快照写入 `.history/` 并压入撤回栈（`ppt_undo` 可完整恢复），同时保留原主题、品牌与匹配的数据溯源。
4. **一键套用参考 `.pptx` 与结构克隆（`referencePptx` & `cloneStructure`）**：
   - 在 `ppt_create` 或 `ppt_edit` 中直接传 `referencePptx: "corp-template.pptx"`（CLI：`--reference-pptx corp.pptx`），自动将该模板净化后的色板、字体与母版 Logo 应用到整套文稿。
   - 若同时传 `cloneStructure: true`（CLI：`--clone-structure`），将把 `recommendedChrome` 写入 `brand.chromeStyle`，并把 Markdown 正文页面直接映射到吸收出的 `slideSkeleton` 版式序列！
5. **显式共享品牌（`brand`）**：
   - `brand: { name: "星尘科技", primaryColor: "#0057B8", backgroundColor: "#FFFFFF", textColor: "#0F172A", chromeStyle: "consulting-classic", fontFamily: "Microsoft YaHei", logo: "assets/logo.png", footer: "战略规划部 · 内部资料" }`。
   - 引擎通过 `deriveBrandedTheme()` 自动重算表面层级、淡网格线与次级墨色，杜绝浅底黑网格线冲突。

---

## 五、双屏演讲者提词台、配速预算、高管一页纸战报与按页编辑

- **双屏演讲者提词台与配速预算（`computePaceBudget`）**：按 **`P`** 或点击 `#presenter-toggle` 打开双屏控制窗口（通过 `BroadcastChannel` + `postMessage` 双向实时同步），支持当前页与下一页预览、大字号提词器（`A+ / A-` 缩放，无手写备注时自动回退为 `takeaway` 与要点提示）、正计时与目标配速倒计时、逐页演讲预算徽章（按中文 `220 字/分`、英文 `145 词/分` + 图表/图示 `+12s` 理解缓冲测算，超 `1.45x` 目标切片或 `>150s` 自动标红 `over-budget`），以及按 **`L`** 在观众主屏同步投射虚拟激光笔！
- **演讲讲义与高管一页纸战报（`.handout.md` / `.onepager.html`）**：HTML 检查面板内置「下载讲义 (.md)」与「下载一页纸战报 (.html)」离线 `Blob` 下载按钮（默认仍严格保持 3 件套落盘不变）；CLI 传 `--handout` / `--one-pager`（或 API `handout: true` / `onePager: true`）可同步落盘，其中高管一页纸支持 **A4 打印版 ↔ 移动端长图战报（Mobile Long-Card）** 一键切换，浓缩展示核心结论、KPI 条、关键图表/表格/流程图摘要、支柱行动与逐页配速预算。
- **Office 文件直吞引擎（`ppt_from_office` / `--from-office`）**：零新增依赖直读 `.xlsx` / `.csv` / `.tsv`（自动识别 `[Source, Target, Amount]` 桑基图、任务排期甘特图、市场份额 Marimekko、增减桥瀑布图、>10x 量纲差双轴组合图、通用 `chart-split` + 明细附录表）与 `.docx` Word 报告（标题/中文编号标题、加粗导语、Word 表格、嵌入图片、Mermaid 代码块与 `$...$` 公式），直出完整 5–20 页演示工程。

1. **先查后改**：调 `ppt_check { deckPath: "report.json" }` 获取当前 `revision` 与稳定页面 `id`。
2. **原子编辑（`ppt_edit`）**：
   - **单页局部补丁 `edits`**：支持修改 `title, subtitle, kicker, takeaway, source, formula, mermaid, layout, variant, chrome, tableStyle, bullets, items, columns, rows, image, images, chart, notes, visual`（`slide` 传 1 起始页码或稳定 ID）。
   - **整套换肤、目标时长与品牌更新**：顶层可传 `theme: "exec-jilan"`、`targetMinutes: 12`、`referencePptx: "ref.pptx"` 或 `brand`（`brand: null` 清空品牌，`logo: null` 清空 Logo）。
   - **追加、复制、排序与删除**：`append: [slide1, ...]`（单次追加 1–5 页新页面）、`duplicate: [2]`、`remove: [4]`、`order: [id1, id2, ...]`（包含全部原始页面 ID 各一次；执行顺序：先编辑/排序，再复制/删除/追加，最终保留 1–120 页）。
   - 每次修改原子重写 HTML / PPTX / JSON，失败自动回滚，保留最近 20 步历史。
3. **一键撤销（`ppt_undo`）**：`ppt_undo { deckPath: "report.json", expectedRevision: 1 }` 完整恢复上一状态（含主题、页面结构、图表、图片与数据模型），`revision` 单调递增。

---

## 六、渲染核验与双层 AI 视觉/叙事闭环（`ppt_check` & `ppt_render`）

1. **静态与审美门禁（`ppt_check`）**：自动检测字数溢出估算、表格列宽、图片完整性、WCAG 对比度以及 `SLOP-01..10` 审美规范（名词弱标题、版式单一、冗余图例等）。
2. **LibreOffice 真实画面渲染（`ppt_render`）**：
   - 调用 `ppt_render { pptxPath: "report.pptx", format: "both" }` 输出逐页 PNG（默认宽 `1440px`）、PDF 与 `render-receipt.json`，不改动源 PPTX，并检查 `missingFonts`（验收要求 `missingFonts: []`）。
   - 将 `receiptPath` 回传给 `ppt_check { deckPath: "report.json", renderReceipt: "..." }` 校验源文件与渲染图哈希一致；任何后续编辑都会使旧收据失效，必须重新渲染。
3. **可选双层 Vision QA 与高管叙事教练（DSH 工作台按需开启）**：
   - **Vision QA（最高 24 页全量看图修复）**：不仅检测溢出/裁切，还审查层级、留白、对比度与版式节奏，并通过 **12 种零文本篡改动作**（`title-size, body-size, chart-label-size, chart-horizontal, chart-highlight, image-contain, swap-image-side, density-mode, table-style, switch-layout, split-bullets, split-table`）自动另存精修副本，100% 不改动任何业务文字与数字。
   - **AI 预审与答辩教练**：针对 `executive | investor | academic | technical | client | management | general` 听众画像，审查 `storyline`（Action Title 与金字塔逻辑）、`expression`、`logic` 与 `evidence`，严格遵守数字 Token 守恒锁。

---

## 七、CLI 速查（`scripts/build-deck.mjs`）

```bash
# 智能场景导演一键生成（CLI 建议显式传 --theme auto 或具体主题 ID）
node scripts/build-deck.mjs --title "年度述职" --content deck.md --theme auto --lang zh --out dist

# 结构化 slides + 吸收外部参考 PPTX 母版并克隆骨架与 chromeStyle
node scripts/build-deck.mjs --title "战略规划" --content deck.md --reference-pptx corp.pptx --clone-structure --out dist
node scripts/build-deck.mjs --title "学术答辩" --slides @slides.json --chrome academic-minimal --theme academic --out dist

# 仅解析并查看外部 PPTX 的净化色板、字体与版式摘要
node scripts/build-deck.mjs --absorb corp.pptx

# 全量导入旧 PPTX 并一键翻新（支持 --preserve-theme 与 --handout）
node scripts/build-deck.mjs --import-pptx legacy.pptx --theme auto --handout --out dist

# 直吞 Excel/CSV/TSV/Word 生成全套演示文稿（可选 --target-minutes 与 --one-pager）
node scripts/build-deck.mjs --from-office financials.xlsx --theme auto --target-minutes 10 --one-pager --out dist
node scripts/build-deck.mjs --from-office annual-report.docx --theme consulting --handout --out dist

# 将 Office 修改后的 PPTX 导回已有工程（自动快照至 .history/ 支持撤销）
node scripts/build-deck.mjs --sync-pptx dist/deck.pptx --edit dist/deck.json

# 编辑、撤销、静态检查与渲染收据核验
node scripts/build-deck.mjs --edit dist/deck.json --edits @edits.json --revision 0
node scripts/build-deck.mjs --undo dist/deck.json --revision 1
node scripts/build-deck.mjs --render dist/deck.pptx --format both
node scripts/build-deck.mjs --check dist/deck.json --render-receipt dist/deck-render/render-receipt.json
```

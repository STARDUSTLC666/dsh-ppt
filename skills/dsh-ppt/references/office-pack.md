# 本地素材包编排、Mode C 混合深研与双向交付协议（Office Pack & Enterprise Workflow SOP）

当用户交付本地混合素材（`.docx` / `.xlsx` / `.csv` / `.tsv` / `.pdf` / 照片截图 `.png`/`.jpg`/`.webp`），并附带特定呈现要求，或同时要求「结合外部权威资料补充对标」时，按本协议执行。

> **架构红线**：引擎保持 100% 离线、零新增依赖；外部权威检索由宿主 Agent（或 `dsh-cite`）完成，核验后的外部证据通过 `evidence[]` 与本地资料双轨融合并经 `SLOP-13` 审计。

---

## 一、Mode C 混合模式：本地资料 × 外部权威对标

适用场景：用户提供了内部文档/财务表格/产品截图，但需要补充行业 TAM 规模、上市竞品财报、国家政策标准或第三方风险口径，或者给出了复杂定制编排指令（页数上限、重点章节、指定配图位置）。

### 四步确定性流水线

1. **先体检不盲出（`inspectOnly: true`）**：
   调用 `ppt_from_office({ filePath: "<文件或目录>", filePaths: [...], inspectOnly: true, instructions: "<用户原话要求>" })`（或 CLI `--from-office <path> --inspect-only`）。
   引擎以极低 Token 消耗返回 **Material Dossier（精炼素材档案）** 与 **`enrichmentPlan`**：
   - `excelSheets[]`：每张表的行列维度、极值统计（`topMetrics`）、推荐图型（`recommendedLayout` / `recommendedChartKind`）与前 6 行预览；
   - `docSections[]`：Word/PDF 章节提纲、表格维度、Mermaid/公式标记，以及 `.docx` 内嵌图片落盘缓存路径（`.dsh-ppt/office-media-cache/`）；
   - `photos[]`：每张图片的像素宽高、画幅方向、推荐角色与防裁歪 `recommendedFocalPoint`；
   - `localEvidence[]`：本地文件自动编目为 `E1..Ek`（`origin: "local-file"`）；
   - `enrichmentPlan`：自动诊断已覆盖维度与缺失的外部支柱（`macro-market-tam` / `peer-benchmark` / `policy-standards` / `risk-counter-evidence`），给出带 `site:` / `filetype:pdf` / `-site:` 的权威检索式，以及**顺延起始编号 `nextEvidenceId`**（如 `E5`）。
2. **宿主 Agent 开展 Tier 1/2 权威补充检索**：
   直接运行 `enrichmentPlan.recommendedQueries` / `missingPillars[].query`，只采信 Tier 1（政府/监管/财报/顶刊）与交叉印证的 Tier 2（权威咨询/行业机构），绝不将 Tier 3 自媒体/论坛标为 `verified`。
3. **双轨标注证据账本（Zero-Conflict Hybrid Evidence）**：
   每条证据明确标清三大治理字段：
   - `origin`: `'local-file'`（内部文件/报表） | `'web-research'`（外部权威检索）
   - `tier`: `1`（一手官方/财报/顶刊） | `2`（主流研报/权威财经） | `3`（自媒体/二手转引，禁止单独作已核验定论）
   - `claimType`: `'actual'`（历史实绩） | `'forecast'`（前瞻预测，上屏必须带「预计/预测/E」） | `'policy'`（政策/标准） | `'benchmark'`（行业对标基准）
4. **精准建稿（两条路径）**：
   - **定制编排（推荐）**：结合 Dossier 与外部 `evidence[]` 直接调 `ppt_create({ slides, evidence, evidenceAppendix: true, ... })`；
   - **快速融合**：调 `ppt_from_office({ filePath, instructions, evidence: externalEvidence, evidenceAppendix: true, ... })`，引擎自动通过 `mergeHybridEvidence` 顺延外部 `[E#]` 编号避免冲突。

> 引擎自动在混源页脚注区分 `内部` 与 `外源T1/T2`（英文 `Internal` / `Ext·T1/T2`），演讲备注写入完整 URL 与口径，封底前 `evidenceAppendix: true` 自动生成双轨 `booktabs` 核验附录页。

```json
{
  "filePath": "materials/q3-review-pack",
  "instructions": "控制 10 页，跳过目录，hero-factory.png 放封面，重点讲毛利率提升与竞品对标",
  "bindDataModel": true,
  "evidenceAppendix": true,
  "evidence": [
    {
      "id": "E5",
      "origin": "web-research",
      "tier": 1,
      "claimType": "benchmark",
      "claim": "2025 年全球头部同行平均毛利率维持在 28.4%",
      "source": "SEC 10-K Annual Filings",
      "date": "2026-02",
      "scope": "全球头部上市同行中位数",
      "url": "https://www.sec.gov/edgar/example",
      "confidence": "verified"
    }
  ]
}
```

---

## 二、需求驱动的 Office / 照片智能编排

`ppt_from_office`（及 CLI `--from-office`）支持细粒度编排参数，避免「原样堆砌所有工作表与散落图片」：

| 参数（Tool / CLI） | 作用 | 示例 |
| --- | --- | --- |
| `instructions` / `--instructions` | 解析页数预算、跳过目录（`跳过目录`/`no agenda`）、指定图片归位与关键词加权 | `"控制 8 页，跳过目录，product.png 放封面，聚焦成本下降"` |
| `maxSlides` | 硬性页数上限：保留封面、封底，按 KPI/图表/焦点词权重精选核心页并保持原叙事顺序 | `maxSlides: 10` |
| `includeSheets` | 按工作表名或子串精准筛选 Excel 工作表 | `includeSheets: ["核心KPI", "毛利桥"]` |
| `photoRoles` | 显式覆盖每张照片的视觉角色（`cover` / `mockup` / `mockup-mobile` / `mockup-browser` / `gallery` / `full-bleed` / `section`） | `{"hero.png": "cover", "app.png": "mockup-mobile"}` |
| `bindDataModel: true` / `--bind-data` | 将 Excel/CSV 数值工作表自动注入 `dataModel` 并把主图表/KPI 绑定为 `{{metricId}}`，后续可直接用 `ppt_data` 无损刷新数字 | `bindDataModel: true` |

### 照片画幅与焦距防裁歪规则（零依赖二进制头解析）

引擎纯本地读取 `PNG` IHDR / `JPEG` SOF / `WebP` VP8 头部分析像素尺寸与宽高比（`landscape ≥ 1.15`、`portrait ≤ 0.85`、`square`）：

- **人像 / 团队照防切头**：凡 `orientation === 'portrait'` 或文件名命中 `portrait / team / founder / ceo / speaker / avatar / 人像 / 团队 / 合影 / 头像 / 嘉宾`，一律自动设为 `focalPoint: 'top'`；手写 `slides` 编排人物照时同样必须显式设置 `image.focalPoint: 'top'`。
- **移动端截图 → `mockup[mobile]`**：文件名含 `mobile / phone / ios / android / app / 手机 / 移动端 / 小程序` 或窄竖屏（`aspectRatio ≤ 0.68`），自动套入灵动岛真机样机框。
- **桌面/看板截图 → `mockup[browser]`**：文件名含 `ui / screen / screenshot / dashboard / web / browser / console / 界面 / 截图 / 看板 / 工作台`，自动套入矢量浏览器样机框。
- **封面横图 → Hero Photo Split**：文件名含 `cover / hero / banner / 封面 / 主图` 且非竖屏，优先注入封面右半屏全出血主图。
- **其余实景图**：先按文件名关键词匹配正文页升级为 `image-right[framed]`，未匹配的多张图每 2–4 张聚合为 `image[gallery]` 整洁图集。

---

## 三、逆向 Office 导出、金页拼装、无损翻译与审阅回流

### 1. 配套逆向导出（`exports[]` / CLI `--export`）

在 `ppt_create`、`ppt_from_office`、`ppt_edit` 中传入 `exports` 数组（默认不额外落盘，严格保持三件套整洁）：

| 导出 ID | 产物后缀 | 用途（零新增依赖） |
| --- | --- | --- |
| `'xlsx'` | `.xlsx` | 逆向 Excel 数据工作簿：含 `Summary` 总览页 + 各图表/表格/KPI/`treemap`/`gauge`/`pricing` 真数值工作表（`<c t="n">`）+ `Evidence_Ledger` 台账 |
| `'docx'` | `.docx` | 正式 Word 汇报文档：标准标题层级、正文要点、原生 `<w:tbl>` 表格与 `[E1..En]` 溯源附录 |
| `'qa-prep'` | `.qa-prep.md` | 会前高管质询与答辩预案：基于真实 KPI、超时页、冲突/估算/预测证据自动生成高频尖锐提问与作答思路 |
| `'memo'` | `.memo.md` | 高管散文体阅读备忘录（Amazon 6-Page 风格） |
| `'i18n'` | `.i18n.json` | 版式无损翻译槽位包（仅抽离可翻译文本，锁死版式/图表数值/嵌入图片与 `[E#]` 引用） |
| 其它已有交付物 | `'handout'` / `'one-pager'` / `'social-carousel'` / `'subtitles'` | 演讲讲义 `.handout.md`、高管一页纸 `.onepager.html`、4:5/1:1 社媒长图 `.carousel.html`、`.srt` 时间轴字幕 |

工作台下载菜单同步支持直接下载 `.xlsx`、`.docx` 与 `.qa-prep.md`。

### 2. 企业金页库（Slide Bank）与跨工程无损拼装（`mergeSources`）

- **收藏金页**：`ppt_edit({ deckPath, expectedRevision, saveToBank: { slide: 3, bankId: "q3-kpi", name: "核心经营大盘", tags: ["kpi", "board"] } })`（CLI `--edit deck.json --save-to-bank 3`），连同该页嵌入图片资产与关联 `[E#]` 证据持久化至 `.dsh-ppt/slide-bank.json`（上限 100 条；CLI `--list-bank` 列表）。
- **跨工程拼装**：`ppt_create({ title: "董事会汇报", mergeSources: [{ deckPath: "dept-a.json", slides: [2, 4] }, { bankIds: ["q3-kpi"] }], theme: "consulting" })`（CLI `--merge @sources.json`），自动完成图片 SHA-256 去重、跨工程 `[E1..En]` 证据编号无冲突重映射，并统一母版主题与品牌宪章。

### 3. 100% 版式无损翻译与双语化（`translations` / `bilingualMode`）

避免让 LLM 重写整份 `slides` JSON 导致丢图表或错位，严格按两步执行：
1. 导出文案槽位：`ppt_edit({ deckPath, expectedRevision, exports: ['i18n'] })` → 读取 `.i18n.json`；
2. 仅翻译 `fields` 中的自然语言后无损回填：
   - **纯替换目标语**：`ppt_edit({ deckPath, expectedRevision, translations, targetLang: 'en', saveAs: true })`（CLI `--translate @en.json`）；
   - **中英双语安全对照**：附加 `bilingualMode: true`（CLI `--bilingual`），自动锁死纯数字单元格与字符上限，100% 保留原版式、图表、图片、品牌与 `[E#]` 证据。

### 4. 分步动画（`reveal: 'step'`）与动效档位（`motionProfile`）

- 单页设置 `reveal: 'step'`（默认 `'all'`）：HTML 放映按方向键/空格逐项显现卡片/条目，PPTX 同步写入原生 `<p:timing>` 多对象点击构建序列；
- 整套设置 `motionProfile: 'subtle' | 'executive' | 'keynote'`（CLI `--motion-profile`）调节动效节奏；严肃打印/归档仍传 `motion: 'off'`。

### 5. 离线 `R` 键审阅批注 → AI 自动修订闭环

1. 审阅人（老板/CFO/客户）在任意浏览器离线打开交付的 `.html` → 翻到目标页按 **`R`**（或点顶栏「批注 (R)」）输入审阅人名称与修改意见 → 点击 **「导出 Feedback JSON」** 下载 `review-feedback.json`；
2. 将该文件交给 Agent，执行 `ppt_check({ deckPath: "deck.json", feedbackPath: "review-feedback.json" })`（CLI `--check deck.json --feedback review-feedback.json`）；
3. `ppt_check` 自动把每条批注转换为定位到精确页码与 `slideId` 的 `stakeholder-feedback` 告警，Agent 逐条用 `ppt_edit` 修订并复检交付。

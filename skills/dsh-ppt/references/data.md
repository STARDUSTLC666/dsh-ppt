# 数据来源溯源、公式引擎与全版式现场推演（`dataModel`）

默认直接交付成品。当用户需要对关键经营/科研数字保留**可核查来源链**，或在汇报现场通过**交互滑块实时推演不同假设情景**时，在 `ppt_create` 中同时提供 `dataModel` 与结构化 `slides`。**铁律：绝不从相同数值倒推猜测来源，绝不虚构单元格、行号或外部文件。**

---

## 一、最小完整示例（覆盖 KPI 指标卡 + 瀑布/柱状图 + 底栏结论联动）

```json
{
  "title": "2026 经营情景推演",
  "theme": "consulting",
  "slides": [
    {
      "layout": "cover",
      "kicker": "经营推演",
      "title": "存量增购驱动下的年度营收敏感性测算",
      "subtitle": "基期核定收入 {{base}}"
    },
    {
      "layout": "kpi",
      "variant": "grid",
      "kicker": "01 · 核心假设与产出",
      "title": "当增购率达到 {{growth}} 时，全年营收预计跃升至 {{revenue}}",
      "items": [
        { "tag": "基期事实", "value": "{{base}}", "text": "源自财务核定台账" },
        { "tag": "讨论假设", "value": "{{growth}}", "status": "accent", "text": "现场可调增购率参数" },
        { "tag": "推演营收", "value": "{{revenue}}", "delta": "净增 {{deltaRev}}", "status": "positive", "text": "实时公式联动重算" }
      ],
      "takeaway": "敏感性结论：在 {{growth}} 增购假设下，净增贡献达 {{deltaRev}}（仅作经营讨论，非业绩承诺）。",
      "source": "数据来源：经营数据.csv（单元格 B2）及现场推演模型"
    },
    {
      "layout": "chart",
      "kicker": "02 · 情景对比",
      "title": "推演情景较基期实现 {{deltaRev}} 增量突破",
      "chart": {
        "kind": "waterfall",
        "categories": ["基期收入", "增购净增", "情景总收入"],
        "series": [{ "name": "收入", "values": ["{{base}}", "{{deltaRev}}", "{{revenue}}"] }],
        "totalIndices": [0, 2],
        "unit": "万元"
      },
      "source": "数据来源：经营数据.csv"
    }
  ],
  "dataModel": {
    "schemaVersion": 1,
    "sources": [
      { "id": "sales", "name": "经营数据.csv", "format": "csv", "content": "项目,收入\n基期,1000" }
    ],
    "metrics": [
      { "id": "base", "label": "基期收入", "kind": "source", "source": { "sourceId": "sales", "cell": "B2" }, "format": { "digits": 0, "unit": "万元" } },
      { "id": "growth", "label": "增购增长率", "kind": "input", "value": 0.3, "min": 0, "max": 1, "step": 0.05, "note": "用于管理层讨论的敏感性假设，非业绩承诺", "format": { "style": "percent", "digits": 0 } },
      { "id": "deltaRev", "label": "净增收入", "kind": "formula", "formula": "base * growth", "format": { "digits": 0, "unit": "万元" } },
      { "id": "revenue", "label": "情景总收入", "kind": "formula", "formula": "base + deltaRev", "format": { "digits": 0, "unit": "万元" } }
    ]
  }
}
```

---

## 二、绑定范围与格式规则（全版式通用）

1. **三类指标（`metrics`）**：
   - `source`：真实材料中的客观事实数值。
   - `input`：汇报现场可通过滑块调节的敏感性假设（必须如实标注 `note` 说明假设性质）。
   - `formula`：由前两者推导出的确定性算术结果。
2. **全字段 `{{metricId}}` 占位绑定**：
   - 文本类绑定：支持在 `title`、`subtitle`、`kicker`、`formula`、`bullets[]`、**`items[]`（含 `gantt / tam / architecture / org / kpi / cards / marimekko / sankey / swot / value-chain` 的 `tag / value / title / text / delta / bullets`）**、**`columns[]`（`gantt` 时间列）**、**`takeaway`**、**`source`**、`rows[][]`（含 `table`、`harvey` 与 `marimekko` 矩阵）与 `notes` 中嵌入一个或多个 `{{metricId}}`（保留内联 `**加粗**` 富文本样式，HTML 放映中渲染为可点击溯源与实时联动更新的数字徽章）。
   - 图表数值绑定：`chart.series[i].values` 中的绑定项必须是完整独立的 `"{{metricId}}"` 字符串（计算与绘图仍使用未舍入的精确原始数值，支持全部 13 类图表及矢量 `waterfall` 实时重绘）。
   - 格式约定：百分比在模型中以比例存储（`30%` 存为 `0.3`）；`format.style` 支持 `'number'`（默认）或 `'percent'`，`digits` 为 `0–6` 位小数，可选 `unit`。指标 ID 以字母开头，仅含字母与数字，最长 48 字符。

---

## 三、数据来源（`sources`）与算术安全边界

- **结构化表格来源**：`format: 'csv' | 'tsv'` + `content`（或 `kind: 'table'` + `rows`），单元格地址 `A1–Z500`（首行表头计为第 1 行），被引用格须为单一数值（支持千分位逗号或百分号）。
- **纯文本/文档来源**：`format: 'text'` + `content`（或 `kind: 'text'` + `text`），通过 `{ sourceId, line: 1, numberIndex: 0 }` 定位（行号从 1 起算，行内数字序号从 0 起算；务必核对日期或版本号以免误取）。
- **文件读取边界**：工具调用可显式传本地相对会话 `cwd` 的普通文件 `path`（读取一次后内嵌进工程，不后台监听源文件）；浏览器网页端仅允许用户主动粘贴或选取内容，严禁请求读取任意本地路径。支持 UTF-8 CSV / TSV / TXT / Markdown，最多 8 个来源、合计 ≤ 1 MiB，表格 ≤ 500 行 × 26 列，不支持直接自动提取 XLSX 或 PDF 二进制表。
- **确定性公式沙箱**：最多 80 个指标、12 个可调假设（`value / min / max / step` 有限且对齐步长网格，≤ 100,000 步，结果绝对值 ≤ `1e15`）。允许括号、`+ - * / % **`、一元正负及内置函数 `min / max / sum / abs / floor / ceil / round(val, 0..6)`（最多 256 个 AST 节点、32 层表达式、40 层依赖；循环依赖、除零、未知指标立即报中文错误；零 `eval`、零网络或文件副作用）。

---

## 四、两阶段预览确认更新与离线 `scenario.json` 回存

```js
// 1. 先 preview 预览（零文件改动），拿到差异明细与 previewToken
const preview = await ppt_data({
  action: 'preview',
  deckPath,
  expectedRevision: 0,
  parameters: { growth: 0.45 }
})

// 2. 向用户清晰展示 changes、affectedSlides 与前后字段对比，获明确确认后 apply
await ppt_data({
  action: 'apply',
  deckPath,
  expectedRevision: 0,
  parameters: { growth: 0.45 },
  confirmed: true,
  previewToken: preview.token
})
```

- `apply` 默认 `saveAs: true` 另存新副本，原稿安全保留，且支持 `ppt_undo` 同步回退数据模型与页面内容。`ppt_edit` 修改其他字段时会自动保留未改动字段的 `{{metricId}}` 绑定（若用纯文本覆盖某字段则解除该字段绑定）。
- 离线 HTML 放映器调节滑块后可导出 `scenario.json`（含 `deckId / revision / fingerprint / parameters`），导回同一 DSH 工程执行 `preview` → 用户确认 `apply` 后，即可导出数值完全匹配的静态可编辑 PPTX（备注与交付说明自动附带完整数据引用链）。
- 跨 harness CLI：`node scripts/build-deck.mjs --title "..." --slides @slides.json --data-model @model.json --theme consulting --out dist`（JS 编程调用请使用 `deck-advanced.mjs` 的 `buildDeckAsync`）。

## Dependencies

CSV parsing uses [csv-parse](https://csv.js.org/parse/api/sync/) 6.1.0 ([MIT](https://github.com/adaltas/node-csv/blob/master/LICENSE)). Formulas are parsed with [jsep](https://github.com/EricSmekens/jsep) 1.4.0 ([MIT](https://github.com/EricSmekens/jsep/blob/main/LICENSE)); the plugin supplies its own restricted evaluator. Dependencies retain their own license notices. Offline HTML embeds the plugin's validated arithmetic representation and runtime, not those parser implementations.

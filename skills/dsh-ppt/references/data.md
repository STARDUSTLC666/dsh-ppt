# 数据来源、公式和推演

默认直接交付成品。需要解释数字或现场推演时，才在 `ppt_create` 提供 `dataModel` 和结构化 `slides`。不从相同数值猜来源，不虚构单元格、原文或文件。

## 最小完整示例

```json
{
  "title": "经营情景",
  "slides": [
    { "layout": "cover", "title": "经营情景", "subtitle": "基期收入 {{base}}" },
    { "layout": "bullets", "title": "增长 {{growth}}", "bullets": ["推演收入 {{revenue}}", "以上增长率是讨论假设"] },
    { "layout": "chart", "title": "收入对比", "chart": { "kind": "column", "categories": ["基期", "情景"], "series": [{"name": "收入", "values": ["{{base}}", "{{revenue}}"]}], "unit": "万元" } }
  ],
  "dataModel": {
    "schemaVersion": 1,
    "sources": [{ "id": "sales", "name": "经营数据.csv", "format": "csv", "content": "项目,收入\n基期,1000" }],
    "metrics": [
      { "id": "base", "label": "基期收入", "kind": "source", "source": { "sourceId": "sales", "cell": "B2" }, "format": { "digits": 0, "unit": "万元" } },
      { "id": "growth", "label": "增长率", "kind": "input", "value": 0.3, "min": 0, "max": 1, "step": 0.1, "note": "用于讨论的假设，不是业绩承诺", "format": { "style": "percent", "digits": 0 } },
      { "id": "revenue", "label": "情景收入", "kind": "formula", "formula": "base * (1 + growth)", "format": { "digits": 0, "unit": "万元" } }
    ]
  }
}
```

`source` 是材料中的事实，`input` 是可调假设，`formula` 是推导。百分比以比例计算：30% 是 `0.3`。数字格式为 `number`（默认）或 `percent`、0–6 位小数及可选 `unit`。显示舍入不改变计算输入。

文本、要点、表格、备注和图表标签用 `{{metricId}}`；图表数值必须是完整占位符，计算仍使用原始数值。ID 使用字母开头的字母和数字，最多 48 字符。

## 来源

- 表格：`format:csv/tsv` + `content`，或 `kind:table` + `rows`。地址 `A1–Z500`，首行表头也算第 1 行。引用格必须是单一数值，可含千位逗号或百分号。
- 材料：`format:text` + `content`，或 `kind:text` + `text`。引用 `{sourceId,line:1,numberIndex:0}`；行号从 1 开始，该行数值序号从 0 开始。日期、版本号也可能被识别为数字，必须检查截取位置。
- 工具调用可显式给 `path` 读取本地普通文件，按会话 cwd 解析；只读取一次并嵌入，不监视源文件。网页只能使用用户选取或粘贴的内容，不能让浏览器请求读取任意路径。
- UTF-8 CSV / TSV / TXT / Markdown；最多 8 个来源、合计 1 MiB，表格最多 500 行 / 26 列，各行等宽，每格最多 2000 字符。文本引用行最多 8000 字符。无 XLSX / PDF 数字自动提取。

## 算术与范围

最多 80 个指标和 12 个假设。假设必须提供有限的 `value/min/max/step`，处于范围和步长网格内，最多 100000 步。计算结果绝对值不超过 1e15。

公式允许指标 ID、括号、`+ - * / % **`、一元正负，以及 `min/max/sum/abs/floor/ceil/round`。`round(value,digits)` 的 digits 为 0–6。最多 256 个 AST 节点、32 层表达式和 40 层指标依赖。循环、除零、未知指标、非有限结果会报错。没有 `eval`、属性访问、赋值、网络或文件执行。

## 更新与确认

```js
// 1. 先预览，不修改任何成品。
ppt_data({ action: 'preview', deckPath, expectedRevision: 0,
  parameters: { growth: 0.5 } })
// 或替换已有来源：sourceUpdates:[{id:'sales',format:'csv',content:'项目,收入\n基期,1200'}]

// 2. 向用户展示 changes、affectedSlides 与字段前后差异，确认后再保存。
ppt_data({ action: 'apply', deckPath, expectedRevision: 0,
  parameters: { growth: 0.5 }, confirmed: true, previewToken: preview.token })
```

应用默认 `saveAs:true`，原稿不变，新副本可撤销；`saveAs:false` 仍执行外部成品修改保护。预览凭证绑定完整工程状态、数据与修订，任一变化都应重新预览。`ppt_undo` 同步恢复来源、参数、公式和页面。

`ppt_edit` 会保留未修改字段的绑定。用普通文字替换绑定字段会解除该字段绑定；需要继续联动时保留占位符。确认后的静态 PPTX 备注和下载报告附上引用链。可选 AI 预审也会获得页面相关的公式与假设说明，不把来源关联当作事实核验。

离线 HTML 的 `scenario.json` 包含 `schemaVersion/deckId/revision/fingerprint/parameters`。导回相同 DSH 工程后预览、确认，再下载匹配的静态 PPTX；也可作为 `ppt_data.scenario` 传入。不可将旧工程参数强套到新副本。

跨 harness：在技能目录 `npm install --ignore-scripts` 后，使用 `node scripts/build-deck.mjs --title ... --slides @slides.json --data-model @model.json --out ...`。直接 JS 调用使用 `deck-advanced.mjs` 的 `buildDeckAsync`；同步 `deck-core.buildDeck` 不支持数据模型。

## Dependencies

CSV parsing uses [csv-parse](https://csv.js.org/parse/api/sync/) 6.1.0 ([MIT](https://github.com/adaltas/node-csv/blob/master/LICENSE)). Formulas are parsed with [jsep](https://github.com/EricSmekens/jsep) 1.4.0 ([MIT](https://github.com/EricSmekens/jsep/blob/main/LICENSE)); the plugin supplies its own restricted evaluator. Dependencies retain their own license notices. Offline HTML embeds the plugin's validated arithmetic representation and runtime, not those parser implementations.

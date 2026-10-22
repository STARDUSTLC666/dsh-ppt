# 数字溯源与现场推演

这两个功能按需启用。只需要成品时，照常给材料并下载，不必配置数据模型或开启演练。

## 怎么用

可以对 DSH 说：“用这份经营数据做汇报，给数字关联出处，并把增长率设为可调整的假设。”助手使用真实材料建立绑定后，打开「设置 → 演示文稿」：

1. 点击预览中带点状下划线的数字，查看材料行、CSV 单元格或计算公式。公式中的输入可继续点开。灰色下划线表示没有关联来源，不会因数值相同自动认定来源相同。
2. 调整「现场推演参数」中的滑杆或数值，预览文字、表格和图表的变化。只有明确声明的假设可调，原始事实保持只读。
3. 点击「预览差异」，核对指标、受影响页面及字段的之前 / 之后。默认「保存为新副本」保留原稿，确认后才更新三件套，副本也可撤销。
4. 来源有更新时，在「更新来源材料」选择已有来源，导入或粘贴新材料，再走同样的预览和确认流程。不会监视文件，也不会回写源文件。

指标还没有绑定到页面时，预览会说明仅更新数据模型；来源摘录变了但数值没变，也会提示受影响页面。

## 离线放映和静态 PPTX

离线 HTML 保留推演面板（快捷键 D）、数字来源及公式，调整参数无需模型或网络。推演尚未保存时，旧 PPTX / JSON 的下载被暂缓。

要交付对应的可编辑 PPTX，在 HTML 中「保存推演参数」，再回到同一 DSH 工程导入该 JSON、预览并确认保存。其他工程、旧修订的参数会被拒绝；新副本有自己的工程身份，不能继续套用原稿参数文件。

PPTX 保留确认后的静态数值及原生可编辑图表。每页的演讲备注附上该页用到的来源摘录、定位、快照校验值、公式及假设；也可单独下载 Markdown 溯源报告。它不是在 PowerPoint 中运行网页滑杆。

## 材料与分享

支持 UTF-8 CSV、TSV、TXT、Markdown 或内嵌表格。Excel 可先导出 CSV。本版不直接解析 XLSX，不自动联网寻找来源。

来源只能说明“这个数字如何得到”，不代表材料真实或结论正确。JSON 工程包含导入的完整材料；HTML / PPTX 包含指标引用的材料行摘录和来源名称，摘录可能包含同一行的其他字段，分享前应核对。

开发者示例、工具参数和范围见[数据模型参考](../skills/dsh-ppt/references/data.md)。

## English

Both features are optional. Ordinary finished-deck delivery does not require a data model or rehearsal.

- Supply actual material and ask DSH to link its numbers and expose selected assumptions. In Settings → Presentations, click a linked number to inspect its source row, CSV cell or formula. Follow formula inputs to their origins. Unlinked numbers are labelled explicitly.
- Adjust declared assumptions; text, tables and charts change together. Source facts are read-only in what-if mode. Preview metric and slide differences before confirming. The default is an undoable new copy, preserving the original.
- Replace an existing source by importing or pasting UTF-8 CSV, TSV, TXT or Markdown. Excel tables can be exported as CSV. Nothing watches or writes the original source file; XLSX parsing and automatic online research are not included.
- Offline HTML retains controls and lineage (D opens the panel). Export scenario parameters, import them into the same DSH project, preview and confirm to create a matching static PPTX. Foreign or stale packets are rejected. Downloads of older PPTX/JSON files are blocked while the HTML has unsaved values.
- PPTX contains confirmed static values and native editable charts, with formulas, assumptions, source excerpts/locators and checksums in speaker notes. Download the Markdown lineage report separately. It does not execute HTML controls inside PowerPoint.
- A source link is not factual verification. JSON retains full imported material; HTML/PPTX include metric-referenced row excerpts, which may contain other fields from that row. Review before sharing.

See the [model reference](../skills/dsh-ppt/references/data.md) for schema, limits and tool examples.

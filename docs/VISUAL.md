# AI 视觉检查与排版修复

[返回简介](../README.md) · [English](#english)

普通生成仍直接提供 PPTX、HTML 和工程文件。需要进一步检查版面质量与视觉美感时，可在工作台打开工程后切换至 **视觉检查（Visual review）** 分栏（或通过 **设置 → 演示文稿 → 打开工程 → 视觉检查与修复**）主动开启。

模型目录可随 DSH 更新。点击“刷新视觉模型”会保留仍然可用的原选择；原模型下线时清空选择，重新选定后才能开始，不会自动换成另一个模型。

## 怎么用

1. 选择 DSH 已配置、明确声明支持图片输入的视觉模型。选当前页，或一次检查最多 **24 页**原始页面。
2. 选择“仅看图检查”，或最多自动修复 1 / 2 轮。开始前会显示发送范围与调用上限。
3. 插件读取当前实际 PPTX，用官方 LibreOffice Kit 渲染逐页 PNG，然后按**双层审美与版面标尺**（硬性裁切/重叠/溢出 + 留白呼吸感、信息密度、字号层级、图表与表格可读性）把所选页图片和页面文字交给模型。
4. 模型发现可处理的版面或层级问题后，插件保留原稿，生成可撤销副本，执行受控无损修复动作，再读取副本的 PPTX 重新渲染、复查。拆出的新页也会纳入复查。
5. 在画布中央查看大尺寸「修复前 / 修复后」并排画面，橙框表示模型定位的问题区域。点击“采用修复副本”即可打开复查后的工程；仍有问题时会明确标注。可以随时撤销、下载最新成品或导出 Markdown 检查记录。

**一轮修复包括“检查 → 修改 → 再渲染检查”，不是一次模型调用。** 每次调用最多两张图片，每张渲染图最多 4 MiB；若选定页面全部发生拆页，后续轮次调用上限按 `min(120, 页数 × 2^轮次)` 受控收敛。24 个原始页面、两轮修复的最坏调用上限为 **84 次**（`12 + 24 + 48`），开始前会明确展示。服务商自身的重试、计费规则仍然适用。

## 能自动改什么（12 种无损动作）

| 动作 | 保留的内容与效果 |
| --- | --- |
| `title-size`（标题字号 24–60 pt） | 收敛折行或放大弱标题，原文不改写，PPTX 与 HTML 同步 |
| `body-size`（正文字号 14–28 pt） | 缓解拥挤或过小字号，原文与要点顺序不变 |
| `chart-label-size`（图表标签字号 12–24 pt） | 改善坐标轴与数据标签拥挤，分类、系列、数值、单位和公式不改 |
| `chart-horizontal`（柱状图转横向条形图） | 解决长类别名斜排或重叠，保留全部数据与数字绑定 |
| `chart-highlight`（突出关键数据项） | 高亮图表焦点柱/序列以强化视觉重心，不改动任何数值 |
| `image-contain`（图片改为完整显示） | 消除关键截图裁切，使用已有嵌入图片，不新增或读取外部文件 |
| `swap-image-side`（左右图文对调） | 平衡图文重心与视线流向，保留原图与说明文字 |
| `density-mode`（页面疏密 `compact` / `balanced` / `airy`） | 调整留白、行距与内边距，缓解呼吸感不足或版面松散 |
| `switch-layout`（兼容版式无损切换） | 将单调或失衡的列表页映射为更匹配的卡片/对比/分栏版式，不丢字 |
| `table-style`（表格样式切换） | 在咨询表（`consulting`）、学术三线表（`booktabs`）、极简（`minimal`）与条纹（`banded`）间切换以提升易读性 |
| `split-bullets`（过密要点拆页） | 自动拆分为连续两页，保留顺序、原文、备注和数字绑定 |
| `split-table`（过密表格拆页） | 重复表头拆页，保留全部单元格数据、备注与数字绑定 |

不能用这 12 种无损动作解决的问题会明确列出说明。插件绝不会根据模型意见捏造内容、重写业务结论、替换数字、安装系统字体或联网下载图片，也不会把“未发现明显问题”当作人工最终验收通过。缺失字体会单独报告。

## 模型与渲染条件

- 模型必须通过 DSH 的原生模型服务声明 `text` 和 `image` 输入；不会根据模型名字猜测视觉能力。对于自定义 pi-ai 模型，需要在宿主模型配置中明确相应的 `input: [text, image]` 能力，且实际服务必须支持。
- 使用 DSH 原生图片附件与绑定模型版本的 `prepareCall`，不给模型文件、终端或其他工具。插件不保存单独的 API Key。
- 可选渲染器为 `@deepseek-ai/libreoffice-kit@0.2.3`（DSH 0.2.2 起内置；0.1.5 亦受支持），普通成品生成不依赖它。安装与字体说明见[使用说明](USAGE.md#可选-png--pdf-渲染)。
- 不满足条件、调用失败或输出截断时会停止，保留已有结果，不自动重新发起插件调用。可修正条件后主动新建检查。

## 停止、版本和本地记录

运行时可随时停止。已完成的副本会保留，尚未复查的页面不会被标成完成；已发起的服务请求仍可能计费。中断记录不会自动续跑。

检查绑定原工程、JSON 内容、实际 PPTX 与逐页渲染校验值。检查中或检查后文件变化，会保留旧报告并拒绝继续或误采纳。Office 手工修改过的 PPTX 不能套用旧 JSON 的自动修改；需先保留 Office 原件，再决定是否从 JSON 另存工程副本。

每个工程最多 20 次、本机最多 200 次记录。删除检查记录会删除该次插件预览图片，保留原稿和已生成的 PPT 副本。DSH 附件服务本身的存储与清理由宿主管理，不在插件删除范围内。检查图片会发送至所选模型服务；完整源材料和历史不会作为额外材料发送，但图片及所选页面文字中出现的内容会发送。

## English

Open the **Visual review** tab in the Presentations workbench (or **Settings → Presentations → a project → Visual review and repair**). Choose a configured image-capable model, the current slide or up to **24** original slides, and inspection only or up to two repair rounds.

Refreshing the catalog preserves an available selection by provider and model ID. If that route disappears, selection is cleared and Start stays disabled until you choose again; another model is never substituted automatically.

The plugin renders the actual PPTX using the optional official LibreOffice Kit, evaluates both hard layout defects (clipping, overlap, overflow) and visual hierarchy (whitespace, density, typography contrast, chart/table legibility) through native DSH model and attachment services, and records localized findings. Twelve lossless formatting actions may create an undoable copy: `title-size`, `body-size`, `chart-label-size`, `chart-horizontal`, `chart-highlight`, `image-contain`, `swap-image-side`, `density-mode`, `switch-layout`, `table-style`, `split-bullets`, and `split-table`. Original wording, values, formulas, and source bindings remain intact.

Each repaired PPTX is rendered and inspected again, including newly split pages. Inspect the full-width before/after comparison in the center canvas before adopting the copy. AI findings are not human verification. Unsupported issues and missing fonts remain explicit; errors, truncated output, or cancellation stop the run without automatic plugin retries. The source presentation is preserved.

Each request carries at most two images. Splitting can increase the scope up to the per-round cap `min(120, count * 2^round)`; the maximum number of requests is shown before starting (at most **84** for 24 original slides and two repair rounds: `12 + 24 + 48`). Providers may have separate retries or billing. Ordinary generation never starts this optional flow.

Records are local and tied to exact project/render hashes. A changed project, PPTX, image, or copy cannot be reused as a current review. Deleting a record removes its plugin preview images, not presentation files or the host-managed DSH attachment store.

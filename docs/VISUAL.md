# AI 视觉检查与排版修复

[返回简介](../README.md) · [English](#english)

普通生成仍直接提供 PPTX、HTML 和工程文件。需要进一步检查时，在 **设置 → 演示文稿 → 打开工程 → 视觉检查与修复** 主动开启。

模型目录可随 DSH 更新。点击“刷新视觉模型”会保留仍然可用的原选择；原模型下线时清空选择，重新选定后才能开始，不会自动换成另一个模型。

## 怎么用

1. 选择 DSH 已配置、明确声明支持图片输入的视觉模型。选当前页，或一次检查最多 12 页。
2. 选择“仅看图检查”，或最多自动修复 1 / 2 轮。开始前会显示发送范围与调用上限。
3. 插件读取当前实际 PPTX，用官方 LibreOffice Kit 渲染，然后把所选页的图片和页面文字交给模型。
4. 模型发现可处理的排版问题后，插件保留原稿，生成可撤销副本，再读取副本的 PPTX 重新渲染、复查。拆出的新页也会检查。
5. 查看前后画面，橙框表示模型定位的区域。“采用修复副本”打开复查后的工程；仍有问题时会明确标注。可以撤销、下载最新成品或导出检查记录。

**一轮修复包括“检查 → 修改 → 再渲染检查”，不是一次模型调用。** 每次调用最多两张图片，每张渲染图最多 4 MiB；若所有选定页面都拆分，最多两轮修复会检查原来的四倍页数。12 个原始页面、两轮修复的最坏调用上限为 42 次，开始前会展示。服务商自身的重试、计费规则仍然适用。

## 能自动改什么

| 操作 | 保留的内容 |
| --- | --- |
| 标题字号 24–60 pt、正文字号 16–28 pt | 原文不改写，PPTX 与 HTML 同步 |
| 图表标签字号 14–24 pt | 分类、系列、数值、单位和公式不改 |
| 柱状图改为横向条形图 | 保留全部数据与数字绑定 |
| 过密要点或表格拆页 | 保留顺序、原文、表头、备注和数字绑定 |
| 图片改为完整显示 | 使用已有嵌入图片，不新增图片或读取文件 |

不能用这些操作解决的问题会留下说明。不会根据模型意见捏造内容、重写结论、替换数字、安装字体或下载图片，也不会把“未发现明显问题”当作人工验收通过。缺失字体会单独报告。

## 模型与渲染条件

- 模型必须通过 DSH 的原生模型服务声明 `text` 和 `image` 输入；不会根据模型名字猜测视觉能力。对于自定义 pi-ai 模型，需要在宿主模型配置中明确相应的 `input: [text, image]` 能力，且实际服务必须支持。
- 使用 DSH 原生图片附件与绑定模型版本的 `prepareCall`，不给模型文件、终端或其他工具。插件不保存单独的 API Key。
- 可选渲染器为 `@deepseek-ai/libreoffice-kit@0.1.5`，普通成品生成不依赖它。安装与字体说明见[使用说明](USAGE.md#可选-png--pdf-渲染)。
- 不满足条件、调用失败或输出截断时会停止，保留已有结果，不自动重新发起插件调用。可修正条件后主动新建检查。

## 停止、版本和本地记录

运行时可随时停止。已完成的副本会保留，尚未复查的页面不会被标成完成；已发起的服务请求仍可能计费。中断记录不会自动续跑。

检查绑定原工程、JSON 内容、实际 PPTX 与逐页渲染校验值。检查中或检查后文件变化，会保留旧报告并拒绝继续或误采纳。Office 手工修改过的 PPTX 不能套用旧 JSON 的自动修改；需先保留 Office 原件，再决定是否从 JSON 另存工程副本。

每个工程最多 20 次、本机最多 200 次记录。删除检查记录会删除该次插件预览图片，保留原稿和已生成的 PPT 副本。DSH 附件服务本身的存储与清理由宿主管理，不在插件删除范围内。检查图片会发送至所选模型服务；完整源材料和历史不会作为额外材料发送，但图片及所选页面文字中出现的内容会发送。

## English

Open **Settings → Presentations → a project → Visual review and repair**. Choose a configured image-capable model, the current slide or up to 12 original slides, and inspection only or up to two repair rounds.

Refreshing the catalog preserves an available selection by provider and model ID. If that route disappears, selection is cleared and Start stays disabled until you choose again; another model is never substituted automatically.

The plugin renders the actual PPTX using the optional official LibreOffice Kit, sends the selected images and visible slide content through native DSH model and attachment services, and records image-based findings. A small formatting vocabulary may create an undoable copy: font sizes, bullet/table splits, horizontal bars or uncropped images. Original wording, values, formulas and source bindings remain intact.

Each repaired PPTX is rendered and inspected again, including newly split pages. Compare actual before/after images before adopting the copy. AI findings are not human verification. Unsupported issues and missing fonts remain explicit; errors, truncated output or cancellation stop the run without automatic plugin retries. The source presentation is preserved.

Each request carries at most two images. Splitting can increase the scope; the maximum number of requests is shown before starting (at most 42 for 12 original slides and two repair rounds). Providers may have separate retries or billing. Ordinary generation never starts this optional flow.

Records are local and tied to exact project/render hashes. A changed project, PPTX, image or copy cannot be reused as a current review. Deleting a record removes its plugin preview images, not presentation files or the host-managed DSH attachment store.

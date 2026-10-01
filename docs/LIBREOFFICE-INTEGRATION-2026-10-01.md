# PPT 成品渲染与 PDF 导出方案

目标是在现有 HTML 放映稿与可编辑 PPTX 交付流程中，补上真实 PPTX 静态渲染、PDF 导出和缺失字体报告。生成、编辑和撤销仍以本插件 JSON 工程为准。

## 库的分工

- 现有生成器与 `@office-kit/pptx@0.21.0` 负责主题、文字、图片、原生图表、备注、转场和可编辑 PPTX。
- 可选的 `@deepseek-ai/libreoffice-kit@0.1.3` 读取保存后的 PPTX，直接生成每页 PNG，或导出 PDF。两种静态产物方便检查和分享。
- 引擎渲染成功只证明生成了该输入版本的静态产物。内容准确、文字裁切、图表可读性和设计质量仍由视觉检查判断。

## 安装和平台

插件声明精确版本的 optional peer，不让普通安装默认下载重型引擎。需要渲染时，在插件所在项目或独立技能目录运行：

```bash
npm install --ignore-scripts @deepseek-ai/libreoffice-kit@0.1.3
```

官方要求 Node.js >=22.19.0，与插件现有约束一致。Windows x64/ARM64 和 macOS 使用匹配原生引擎；Linux 使用 WASM。Windows 另需匹配 Node 架构的 Microsoft Visual C++ v14 运行库。依赖或引擎缺失时，`ppt_render` 返回 `unavailable` 与安装提示，正常生成 HTML/PPTX 的流程仍可使用。

2026-10-01 npm 元数据显示 Windows x64 引擎解包载荷为 190,877,547 字节，约191MB，不包含 API 的其他依赖。这是解包体积，不是下载体积。运行时无需额外下载引擎或字体。

## API 与输出

`deck-render.mjs` 导出：

```js
await renderDeck({
  pptxPath: '/absolute/path/deck.pptx',
  outputDir: '/absolute/path/deck-render', // 可选
  format: 'both',                       // png（默认）/ pdf / both
  width: 1440,                          // 320–3840，近似目标宽度
  timeoutMs: 120000,                     // 1000–300000，整次渲染期限
  signal,
})
readRenderReceipt(pptxPath, receiptPath)
```

宽度通过 PPTX 的实际页面尺寸换算 DPI，输出因像素取整可能相差少量像素。适配器使用 Kit 的全部页面模式，最多120页，不截断页面。输入上限64MiB，输出 PNG/PDF 与 manifest 总量128MiB，单图最多16,777,216像素。PDF-only 的 `slideCount` 来自输入 PPTX 的页数，PNG/both 的页数来自真实引擎。

成功返回 `ok:true, status:'rendered'`、真实 `backend`（native/wasm）、`rendererVersion`、`slideCount`、`pngPaths` / `pdfPath`、`missingFonts`、`sourceSha256` 和 `receiptPath`。`visual` 固定为 `not-verified`，不会自动声称视觉验收通过。依赖/引擎缺失返回 `ok:false, status:'unavailable'`；参数、文件和运行失败抛错；取消原样保留 `signal.reason`。

默认目录为 `<PPTX-basename>-render`，已存在时追加后缀。目录由独占 mkdir 预留，产物先写私有 staging，等待引擎退出、验证原文件摘要仍匹配后，再提交 `artifacts/` 子目录。PNG、PDF 和收据随同提交；取消、超时或任一步失败都清理本次 staging。不会递归删除预先存在的输出目录。

## 收据与检查状态

收据 `render-receipt.json` 包含 `schemaVersion:1`、`producer:'dsh-ppt-render'`、引擎包名/版本/backend、源 PPTX SHA256/长度、格式、页数、缺失字体和每个输出的相对路径/长度/SHA256。

`readRenderReceipt()` 验证源文件和输出的实际内容、精确引擎版本、完整页码以及路径范围。源 PPTX 编辑后、图片/PDF被修改或删除后，旧收据返回 `not-verified`，需要重新渲染。收据是本地完整性记录，不是签名证明。

`ppt_check` 分别展示静态估算、源文件匹配的渲染证据和视觉检查状态。PNG 或 PDF 成功生成后，视觉检查仍需查看每一页并修正发现的问题。LibreOffice 输出不保证与 PowerPoint/WPS 完全一致，真实 Office 打开、备注、动画与可编辑图表的验收另行保留。

## 字体和许可

Kit 使用环境中可用的字体，OOXML 的 `missingFonts` 只报告缺失的声明字体，不是完整缺字报告，也不自动安装字体。依赖使用 MPL-2.0；发布和打包时保留其及原生引擎携带的来源、许可和第三方声明。插件自身和 Office Kit 的许可保持各自声明。

默认主题的 PPTX 分别指定西文和东亚字体，避免把 CSS 字体栈第一项同时当作中文字体。Windows 使用 Segoe UI / Georgia / Impact 等主题回退，中文使用 Microsoft YaHei 或 SimSun；macOS 和 Linux 使用对应平台的字体映射。显式品牌字体保留请求的西文字体，中文按可用的东亚字体家族映射。平台映射不等于检测字体已安装；实际缺失仍由引擎报告。HTML 使用原有 CSS 字体栈。

缺失字体可能导致替代后的文字重叠，即使引擎成功返回且 PDF/PNG 收据有效，也需要换用可用字体、重新生成并逐页检查。自定义不存在字体的真实负例已确认这一限制。渲染器不会修改源 PPTX 字体或自动宣称画面合格。

## 当前验证证据

2026-10-01 在 Windows x64、Node 24.16.0、Kit 0.1.3 原生引擎上运行完整11页样例，包含3种图片布局、4种原生图表、中文、备注、表格与品牌字体/页脚。成功生成11张 PNG 和 PDF，约6.13秒，`missingFonts:[]`，源 PPTX 摘要未变化，收据复核通过。逐页查看11张PNG，样例中的标题、正文、图片和图表均可读，无明显裁切或对象遮挡；这是该样例的验证，不是所有文件的兼容保证。

随后对默认无品牌设置的五个主题做字体回归，每主题生成封面、要点页和中文原生柱形图，合计15页。修复前五主题均声明本环境缺失的默认字体，已检查的正文页均出现中文重叠。修复 PPTX 西文/东亚字体映射后，同一探针重新生成15张PNG和5份PDF，全部原生渲染成功，`missingFonts:[]`，源文件匹配的收据复核通过；逐页查看15张PNG，中文与英文标题、正文、图表标签和图例均可读，无明显文字重叠或裁切。证据为 `theme-font-matrix-1790862328203/font-matrix-result.json`；修复前证据单独保留。这项实际渲染回归在Windows完成，macOS/Linux未在本次运行中实测。

独立证据目录：`E:\deepseek\.harness-validation\libreoffice-kit-probe-20261001`。主流程工具/CLI、打包安装与发布验收由整合会话继续执行。

官方资料：[API 与限制](https://github.com/deepseek-ai/dsh-libreoffice-kit/blob/master/packages/entry/README.md)、[字体与平台](https://github.com/deepseek-ai/dsh-libreoffice-kit/blob/master/README.zh.md)、[分发和许可](https://github.com/deepseek-ai/dsh-libreoffice-kit/blob/master/docs/packaging.md)。

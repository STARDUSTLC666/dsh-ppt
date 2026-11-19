# dsh-ppt 验证记录

[0.8.1 中英文界面验收](validation-language-2026-10-03.md)。

本页整理原 README 的历史验证说明，保留当时的版本、日期与范围。自动测试、启动检查、浏览器操作和真实服务验收分别记录，不能相互替代。更详细的版本验收文件仍保留在仓库中。

## 最新记录

**0.26.0 全谱系多源直吞、原生可编辑 Mermaid、生态联动与零警告发布验收（2026-11-20）**：全量 `tsc`、客户端打包、`npm test` 全部通过（0 失败，13 个注册工具 Wire Schema 0 `type` 数组，基于 Workbench UI v3 `templates/workbench-ui.js` 字节锁保持）；`deck-layouts.mjs` 完成模块化拆分；`@office-kit/pptx` `validatePresentation()` 0 错误；实机 `@deepseek-ai/libreoffice-kit` 无头渲染（`missingFonts: []`）逐页目视核验 Mermaid `flowchart` / `sequenceDiagram` 原生吸附连线、`.xlsx` 多工作表与 `.docx` 直吞建稿、`dsh-cite` 文献页、`dsh-remotion` 分镜包、高管一页纸预览与 8 张双语 SVG。

- **0.26.0 Bilingual Validation Record (2026-11-20)**: Full `tsc`, client bundle build, and `npm test` suite passed with 0 failures, 0 `type` arrays across all 13 registered tools, and Workbench UI v3 `templates/workbench-ui.js` byte lock intact; modular `deck-layouts.mjs` split verified; `@office-kit/pptx` `validatePresentation()` passed with 0 errors; real `@deepseek-ai/libreoffice-kit` rendering (`missingFonts: []`) and browser preview visually verified native-connector Mermaid `flowchart` / `sequenceDiagram`, direct `.xlsx`/`.docx` ingestion, `dsh-cite` References slides, `dsh-remotion` bundles, Executive One-Pager HTML, and all 8 workflow SVGs.

**0.24.0 原生公式、巅峰图示、PPTX 双向往返与双屏提词台验收（2026-11-18）**：全量 `tsc`、客户端打包、`test/*.test.mjs` 全部通过（0 失败，Wire Schema 0 `type` 数组）；`@office-kit/pptx` `validatePresentation()` 0 错误；实机 `@deepseek-ai/libreoffice-kit` 无头渲染（`missingFonts: []`）逐页目视核验 `marimekko` 不等宽市场图、`sankey` 多层流向桑基图、`value-chain` 波特价值链、`swot` 十字矩阵、原生 `<m:oMath>` 数学公式、老旧 `.pptx` 一键翻新导入与 `.handout.md` / 双屏提词台脚本。

- **0.24.0 Bilingual Validation Record (2026-11-18)**: Full `tsc`, client bundle build, and `test/*.test.mjs` suite passed with 0 failures and 0 `type` arrays on tool wire schemas; `@office-kit/pptx` `validatePresentation()` passed with 0 errors; real `@deepseek-ai/libreoffice-kit` headless rendering (`missingFonts: []`) visually verified `marimekko`, `sankey`, Porter `value-chain`, `swot`, native `<m:oMath>` equations, legacy `.pptx` round-trip refurbishment, `.handout.md`, and Dual-Screen Presenter Console.

**0.22.0 深度换骨与实机渲染验收（2026-11-18）**：311 / 311 项自动化测试全部通过；`tsc` 与客户端打包 0 错误；`@office-kit/pptx` `validatePresentation()` 0 错误；实机 `@deepseek-ai/libreoffice-kit` 无头渲染（`missingFonts: []`）逐页目视核验全部 6 套母版骨架、5 大新增原生专业图示（`gantt`、`architecture`、`harvey`、`tam`、`org`）、`flywheel`/`funnel` 及 7 份野生 `.pptx` 深度骨架吸收（`cloneStructure: true`）。

[0.19.0 分享成品包验收](validation-0.19.0.md)：208 项 Windows 测试、官方 DSH Web 实际保存与两种 ZIP 下载、离线 HTML、三页最终 PPTX 原生渲染及逐页目视检查、中英文与深色窄屏。Electron 专属行为与真实 Office 应用本轮未测。

[0.16.0 看图检查与排版修复验收](validation-0.16.0.md)：200 项测试、真实 DSH 图片与模型接口、实际模型样例、修复副本复查、中文操作与英文深色窄屏、官方 CLI 全新安装。AI 检查结果与人工 / 桌面原生验收分开记录。

[0.15.0 数字溯源与推演验收](validation-0.15.0.md)：自动测试、真实 DSH Web / 离线 HTML 操作、来源更新、参数回存、复制撤销、四页最终 PPTX 原生渲染及画面核对。桌面原生窗口内逐项操作另行验收。

[0.14.0 可选 AI 预审与答辩验收](validation-0.14.0.md)：151 项测试、真实 DSH Web 及原生模拟模型、复制 / 撤销 / 下载 / 取消 / 旧修订保护、中文与英文深色窄屏。真实模型效果、桌面原生窗口和完整 Office 视觉比对本次未测。

[0.8.0 Windows 与浏览器操作验收](validation/0.8.0.md)：113 项测试、编辑/冲突恢复、三种实际下载、五页官方引擎渲染及 390px 布局。桌面窗口内的新功能逐项操作待验收。

## 原中文记录

插件和独立技能均要求 Node `^22.19.0 || >=24.0.0`。插件无需密钥或必填配置，可选渲染引擎缺失不会阻止普通启动与生成。Windows 示例已通过浏览器操作、真实 Microsoft PowerPoint 打开/逐页导出，以及官方 Kit 原生渲染；具体产物仍需逐页检查。

## Original English record

Plugin and standalone skill require Node `^22.19.0 || >=24.0.0`. No API key or mandatory configuration. The optional renderer is loaded on demand and its absence does not prevent startup or ordinary creation. Windows samples have been exercised in the browser, opened/exported in Microsoft PowerPoint, and rendered using the official Kit; review the actual pages for each new deck.

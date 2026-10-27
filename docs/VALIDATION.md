# dsh-ppt 验证记录

[0.8.1 中英文界面验收](validation-language-2026-10-03.md)。

本页整理原 README 的历史验证说明，保留当时的版本、日期与范围。自动测试、启动检查、浏览器操作和真实服务验收分别记录，不能相互替代。更详细的版本验收文件仍保留在仓库中。

## 最新记录

[0.19.0 分享成品包验收](validation-0.19.0.md)：208 项 Windows 测试、官方 DSH Web 实际保存与两种 ZIP 下载、离线 HTML、三页最终 PPTX 原生渲染及逐页目视检查、中英文与深色窄屏。Electron 专属行为与真实 Office 应用本轮未测。

[0.16.0 看图检查与排版修复验收](validation-0.16.0.md)：200 项测试、真实 DSH 图片与模型接口、实际模型样例、修复副本复查、中文操作与英文深色窄屏、官方 CLI 全新安装。AI 检查结果与人工 / 桌面原生验收分开记录。

[0.15.0 数字溯源与推演验收](validation-0.15.0.md)：自动测试、真实 DSH Web / 离线 HTML 操作、来源更新、参数回存、复制撤销、四页最终 PPTX 原生渲染及画面核对。桌面原生窗口内逐项操作另行验收。

[0.14.0 可选 AI 预审与答辩验收](validation-0.14.0.md)：151 项测试、真实 DSH Web 及原生模拟模型、复制 / 撤销 / 下载 / 取消 / 旧修订保护、中文与英文深色窄屏。真实模型效果、桌面原生窗口和完整 Office 视觉比对本次未测。

[0.8.0 Windows 与浏览器操作验收](validation/0.8.0.md)：113 项测试、编辑/冲突恢复、三种实际下载、五页官方引擎渲染及 390px 布局。桌面窗口内的新功能逐项操作待验收。

## 原中文记录

插件和独立技能均要求 Node `^22.19.0 || >=24.0.0`。插件无需密钥或必填配置，可选渲染引擎缺失不会阻止普通启动与生成。Windows 示例已通过浏览器操作、真实 Microsoft PowerPoint 打开/逐页导出，以及官方 Kit 原生渲染；具体产物仍需逐页检查。

## Original English record

Plugin and standalone skill require Node `^22.19.0 || >=24.0.0`. No API key or mandatory configuration. The optional renderer is loaded on demand and its absence does not prevent startup or ordinary creation. Windows samples have been exercised in the browser, opened/exported in Microsoft PowerPoint, and rendered using the official Kit; review the actual pages for each new deck.

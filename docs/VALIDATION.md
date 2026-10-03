# dsh-ppt 验证记录

[0.8.1 中英文界面验收](validation-language-2026-10-03.md)。

本页整理原 README 的历史验证说明，保留当时的版本、日期与范围。自动测试、启动检查、浏览器操作和真实服务验收分别记录，不能相互替代。更详细的版本验收文件仍保留在仓库中。

## 最新记录

[0.8.0 Windows 与浏览器操作验收](validation/0.8.0.md)：113 项测试、编辑/冲突恢复、三种实际下载、五页官方引擎渲染及 390px 布局。桌面窗口内的新功能逐项操作待验收。

## 原中文记录

插件和独立技能均要求 Node `^22.19.0 || >=24.0.0`。插件无需密钥或必填配置，可选渲染引擎缺失不会阻止普通启动与生成。Windows 示例已通过浏览器操作、真实 Microsoft PowerPoint 打开/逐页导出，以及官方 Kit 原生渲染；具体产物仍需逐页检查。

## Original English record

Plugin and standalone skill require Node `^22.19.0 || >=24.0.0`. No API key or mandatory configuration. The optional renderer is loaded on demand and its absence does not prevent startup or ordinary creation. Windows samples have been exercised in the browser, opened/exported in Microsoft PowerPoint, and rendered using the official Kit; review the actual pages for each new deck.

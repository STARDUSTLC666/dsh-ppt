# 0.19.0 分享成品包验收

2026-10-28，Windows，Node 24.16，官方 DSH 0.2.1-rc.3 Web，后台 Chrome / Playwright。Browser plugin 不可用，因此使用本地 Playwright，不切换用户前台窗口。

- 208 项测试通过，包括旧修订拒绝、原文件字节不变、工程/分享包内容边界、最新讲稿、异常 HTML 拒绝与零模型调用。
- 真实工作台编辑讲稿、保存，未保存时下载按钮禁用。原生认证下载路由分别下载分享 ZIP 与工程 ZIP，确认均为修订 1，PPTX 字节与保存结果一致。
- 分享 ZIP 恰含 PPTX、HTML、Markdown 与 README；工程 ZIP 保留 JSON。分享 HTML 离线打开并切页，移除 JSON 下载入口，PPTX 下载入口保留。
- 中文浅色、英文深色、390px 窄屏实际点击与截图检查，弹窗未越出视口，用户内容保持原文。
- 下载得到的三页 PPTX 用官方 LibreOffice Kit 0.1.5 原生后端渲染，逐页查看 PNG，未发现缺字或溢出；引擎未报告缺失字体。

未测试：Electron 专属窗口/菜单、真实 PowerPoint/WPS 手工编辑、全部主题与输入组合。此次下载流程无需真实模型，未调用付费模型。

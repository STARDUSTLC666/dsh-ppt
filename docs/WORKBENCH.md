# dsh-ppt 工作台 / Workbench

演示文稿主工作台，页面、画布与属性分栏；数据推演切页保留预览联动，未保存保护和画面内全屏退出更完整。

Presentation workbench with slide outline, canvas and inspector; preserves live what-if previews across tabs, dirty navigation and visible fullscreen exit.

## 使用 / Use

更新插件并重启 DSH，在原生左侧栏打开工作台；没有固定时可在“更多”中找到。原有“设置”入口继续可用。侧栏排序和固定由 DSH 管理。

Update the plugin, restart DSH and open its native sidebar panel (or More if it is not pinned). The existing Settings entry remains available. DSH owns sidebar order and pinning.

界面跟随宿主中英文和深浅色，保留用户内容原文。窄窗口中先显示列表，打开详情后可返回；编辑器按可用宽度分栏或顺序排列。危险操作需要明确确认，未保存内容不会因切页而静默丢失。

The UI follows host language and theme without translating user content. Narrow master/detail views have a Back action; editors adapt their columns to available space. Destructive actions require confirmation and edits are protected.

## 源码 / Source

编辑 templates/client.js、templates/panels/*.js 与 templates/workbench-ui.js，运行 pnpm run build。lib/client.js 是确定性产物，请随源码提交。公共组件的规范源位于 dsh-suite/ui/workbench-ui.js，Suite 的同步脚本显式分发副本；单个仓库可独立构建和安装。

Edit the template sources and run pnpm run build. Commit generated lib/client.js with source changes. The vendored UI has no Suite runtime dependency.

## 验收范围 / Validation boundary

2026-10-25：Windows、官方 DSH 0.2.1-rc.3 Web，后台 Chrome/Playwright 实际点击和输入；覆盖中英文、浅深色、1536px 与 390px、状态读回与控制台。Browser plugin 不可用，因此使用本地 Playwright。

邮件使用受控 AgentMail HTTP 服务，日历使用受控 CalDAV 协议传输；插件处理器、存储、校验和原生宿主均实际运行。未使用真实邮箱、真实日历账号或付费模型。RSS 访问 Node.js 官方公开来源。PPT 实际生成并渲染 PPTX、下载 ZIP；两个视频插件实际运行官方引擎并播放 MP4。

这些是 Web 共用界面的验收结果，不代表已验收 Electron 专属菜单、系统权限、真实账号、全部外部来源或所有可选模型/引擎。Docker、Slack、钉钉继续按用户约定搁置。

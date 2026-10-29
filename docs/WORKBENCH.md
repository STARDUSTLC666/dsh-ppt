# dsh-ppt 工作台 / Workbench

演示文稿主工作台，页面、画布与属性分栏；数据推演切页保留预览联动，未保存保护和画面内全屏退出更完整。

Presentation workbench with slide outline, canvas and inspector; preserves live what-if previews across tabs, dirty navigation and visible fullscreen exit.

## 使用 / Use

更新插件并重启 DSH，在原生左侧栏打开工作台；没有固定时可在“更多”中找到。原有“设置”入口继续可用。侧栏排序和固定由 DSH 管理。

Update the plugin, restart DSH and open its native sidebar panel (or More if it is not pinned). The existing Settings entry remains available. DSH owns sidebar order and pinning.

界面跟随宿主中英文和深浅色，保留用户内容原文。窄窗口中先显示列表，打开详情后可返回；编辑器按可用宽度分栏或顺序排列。危险操作需要明确确认，未保存内容不会因切页而静默丢失。

The UI follows host language and theme without translating user content. Narrow master/detail views have a Back action; editors adapt their columns to available space. Destructive actions require confirmation and edits are protected.

## 下载与分享 / Download and share

在项目右上角点击「下载成品」。先保存修改，再选择需要的文件：

- **分享成品包 ZIP**：当前 PPTX、可离线放映的 HTML、逐页 Markdown 讲稿与使用说明；不含 JSON 工程和完整导入材料。分享版 HTML 保留 PPTX 下载入口，移除工程下载入口。原文件不会改变。
- **完整工程包 ZIP**：PPTX、HTML、JSON 工程与使用说明，方便备份或继续编辑。JSON 可能含完整导入材料。
- 也可分别下载 PPTX、HTML、讲稿或工程。未保存时先保存，旧修订的下载会被拒绝。

分享包里的 HTML、PPTX 备注和讲稿仍保留已绑定的来源摘录与用户填写内容。分包不等于自动脱敏，请按收件人需要选择内容。

Open **Download output** and save edits first. **Share bundle ZIP** contains the current PPTX, offline HTML, Markdown speaker notes and instructions; it omits the project JSON and complete imported materials. **Project bundle ZIP** includes the editable JSON for backup. Original files are preserved. Share output still contains bound source excerpts and authored notes. These downloads never require AI review or a model call.

## 源码 / Source

编辑 templates/client.js、templates/panels/*.js 与 templates/workbench-ui.js，运行 pnpm run build。lib/client.js 是确定性产物，请随源码提交。公共组件的规范源位于 dsh-suite/ui/workbench-ui.js，Suite 的同步脚本显式分发副本；单个仓库可独立构建和安装。

Edit the template sources and run pnpm run build. Commit generated lib/client.js with source changes. The vendored UI has no Suite runtime dependency.

## 验收范围 / Validation boundary

2026-10-25：Windows、官方 DSH 0.2.1-rc.3 Web，后台 Chrome/Playwright 实际点击和输入；覆盖中英文、浅深色、1536px 与 390px、状态读回与控制台。Browser plugin 不可用，因此使用本地 Playwright。

邮件使用受控 AgentMail HTTP 服务，日历使用受控 CalDAV 协议传输；插件处理器、存储、校验和原生宿主均实际运行。未使用真实邮箱、真实日历账号或付费模型。RSS 访问 Node.js 官方公开来源。PPT 实际生成并渲染 PPTX、下载 ZIP；两个视频插件实际运行官方引擎并播放 MP4。

这些是 Web 共用界面的验收结果，不代表已验收 Electron 专属菜单、系统权限、真实账号、全部外部来源或所有可选模型/引擎。Docker、Slack、钉钉继续按用户约定搁置。

## 工程查找 / Find projects

工程列表可按关键词筛选，并按最近更新、最早更新或自然标题顺序排列；多个词需要同时匹配。PPT 只查目录中的标题和工程路径；视频查标题、正文和模板，当前列表与归档列表各自保留筛选条件。清空搜索会恢复完整列表，返回工程库会保留刚才的搜索和排序。筛选只在本机列表中执行，不读取未选工程的完整文件，也不修改工程内容。

Search the local project list and sort by newest update, oldest update or natural title. Multiple terms must all match. PPT searches catalog titles and paths; video searches titles, text and templates, with separate active/archive filters. Clear restores the full list; returning from editing preserves filters. Filtering does not load unselected project files or change project contents.

# dsh-ppt

[English](README.en.md)

![dsh-ppt 鲸鱼娘插件封面](https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/cover-whale-girl.png)

把材料制作成可直接交付的 HTML 放映、可编辑 PPTX 与工程包。可在 DSH 工作台轻量编辑、核对数字来源和现场推演；AI 预审、模拟答辩与看图修复均按需选择，也可直接下载成品。

[![npm](https://img.shields.io/npm/v/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt) [![downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-downloads.svg)](https://www.npmjs.com/package/dsh-ppt)

欢迎使用，遇到问题或有改进建议，请提交 [issues](https://github.com/STARDUSTLC666/dsh-ppt/issues) 和 [PR](https://github.com/STARDUSTLC666/dsh-ppt/pulls)。

从 DSH 原生侧栏打开工作台；配置与操作边界见[工作台说明](docs/WORKBENCH.md)。

## 功能

- 生成图文、表格、原生图表和品牌化演示文稿。
- 可选数字溯源与现场推演：点击数字追到原始材料、CSV 单元格或公式；调整假设、预览影响并确认保存。HTML 保留交互，PPTX 保存静态结果及公式 / 假设，见[数据说明](docs/DATA.md)。
- 在设置页编辑文字和图片、调整顺序、复制或删除页面，并支持撤销。
- 提供质量检查与可选的最终 PPTX 图片 / PDF 渲染。
- 可选 AI 视觉检查：看实际 PPTX 图片，标记问题区域，调整排版并另存副本，重新渲染复查；支持前后对比、停止、撤销与检查记录。见[看图修复](docs/VISUAL.md)。
- 下载按页整理的 Markdown 讲稿，保留当前版本的标题与演讲备注。
- 下载时可选「分享成品包」（PPTX、离线 HTML、当前讲稿）或「完整工程包」（含 JSON 工程）。分享包仍保留已绑定的来源摘录与用户填写内容，详见[下载说明](docs/WORKBENCH.md#下载与分享--download-and-share)。
- 可选 AI 预审与模拟答辩：复用 DSH 已配置模型，按需提问、比较改稿、另存可撤销副本，并导出问答与待补充材料清单。默认关闭，直接下载成品无需预审。
- 键盘操作：Ctrl/⌘+S 保存、Esc 取消或返回、Alt+←/→ 切换页面；有未保存修改时离开会提示。

## 安装

桌面版可在「插件」面板按包名 `dsh-ppt` 安装。已配置 dsh 命令时也可使用：

```bash
dsh plugin --profile desktop add dsh-ppt
```

网页版把命令中的 `desktop` 改为 `web`。安装后重启 DSH。

## 开始使用

可说：“把这份材料做成可直接交付的演示文稿，生成 HTML、PPTX 和工程文件。”0.8.0 起可在「设置 → 演示文稿」轻量修改自产工程，也可在 PowerPoint / WPS 中继续编辑 PPTX。

Office 中的修改不会同步回 JSON。插件检测到成品在外部修改，或旧工程没有校验记录时，会拒绝直接覆盖；可用面板「另存副本」或 `ppt_edit(saveAs:true)` 从 JSON 生成新文件，保留原成品。副本不包含 Office 手工修改。

成品页下方可主动开启「AI 预审」或「模拟答辩」。前者根据材料模拟质疑与回答，后者由 AI 一次问一题、你来回答。可以先选模型、听众、强度和范围，再决定是否发送。具体流程与调用上限见[演练说明](docs/COACHING.md)。AI 建议不等于事实核验；普通成品生成、编辑和下载仍不要求配置模型。

## 依赖与配置

普通生成不需要 Office。最终 PPTX 渲染使用可选的官方 LibreOffice Kit；依赖版本、字体环境和安装方法见使用说明。

详细配置、工具参数与排错见[使用说明](docs/USAGE.md)。从源码独立开发时，Node 要求以 [package.json](package.json) 为准。

## 文档

- [使用与排错](docs/USAGE.md)
- [更新记录](CHANGELOG.md)
- [验证范围与历史记录](docs/VALIDATION.md)
- [问题反馈与功能建议](https://github.com/STARDUSTLC666/dsh-ppt/issues)

## 插件更新

需要 DSH 0.2.1-rc.3 或更新版本。更新控件直接位于原有工作台内容末尾；没有工作台的插件，位于原生插件详情页底部。检查、更新记录和偏好在原地展开，不增加独立更新页面或设置菜单。自动检查默认开启；**自动安装默认关闭**，明确授权后才会在空闲且没有未保存修改时安装兼容的稳定补丁。开关按插件独立保存，可关闭、推迟或忽略提醒；不会强制重启 DSH、升级 DSH 本体或替换本地源码安装。Suite 组件在当前页面底部明确说明并操作 Suite 整包更新。

旧版用户先在官方插件管理中手动更新一次，之后才会获得此入口。发布到 npm 不会直接替换用户已经安装的版本。

## License

[MIT](LICENSE)

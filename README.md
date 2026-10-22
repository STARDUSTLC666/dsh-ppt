# dsh-ppt

[English](README.en.md)

![dsh-ppt 鲸鱼娘插件封面](https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/cover-whale-girl.png)

把材料制作成 HTML 放映、可编辑 PPTX 和可继续修改的工程文件。

[![npm](https://img.shields.io/npm/v/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt) [![downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-downloads.svg)](https://www.npmjs.com/package/dsh-ppt)

欢迎使用，遇到问题或有改进建议，请提交 [issues](https://github.com/STARDUSTLC666/dsh-ppt/issues) 和 [PR](https://github.com/STARDUSTLC666/dsh-ppt/pulls)。

## 功能

- 生成图文、表格、原生图表和品牌化演示文稿。
- 在设置页编辑文字和图片、调整顺序、复制或删除页面，并支持撤销。
- 提供质量检查与可选的最终 PPTX 图片 / PDF 渲染。
- 下载按页整理的 Markdown 讲稿，保留当前版本的标题与演讲备注。
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

## License

[MIT](LICENSE)

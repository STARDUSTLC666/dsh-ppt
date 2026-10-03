# dsh-ppt

[English](README.en.md)

![dsh-ppt 鲸鱼娘插件封面](https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/cover-whale-girl.png)

把材料制作成 HTML 放映、可编辑 PPTX 和可继续修改的工程文件。

[![npm](https://img.shields.io/npm/v/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt) [![downloads](https://img.shields.io/npm/dm/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt)

## 功能

- 生成图文、表格、原生图表和品牌化演示文稿。
- 在设置页编辑文字和图片、调整页面顺序，并支持撤销。
- 提供质量检查与可选的最终 PPTX 图片 / PDF 渲染。

## 安装

桌面版可在「插件」面板按包名 `dsh-ppt` 安装。已配置 dsh 命令时也可使用：

```bash
dsh plugin --profile desktop add dsh-ppt
```

网页版把命令中的 `desktop` 改为 `web`。安装后重启 DSH。

## 开始使用

可说：“把这份材料做成可直接交付的演示文稿，生成 HTML、PPTX 和工程文件。”0.8.0 起可在「设置 → 演示文稿」轻量修改自产工程，也可在 PowerPoint / WPS 中继续编辑 PPTX。

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

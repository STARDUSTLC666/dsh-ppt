**简体中文** · [English](README.en.md)

# PPT

**给出材料，拿到可以交付的演示文稿。**

[![npm](https://img.shields.io/npm/v/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt) [![downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-downloads.svg)](https://www.npmjs.com/package/dsh-ppt) [![total downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-total-downloads.svg)](https://www.npmjs.com/package/dsh-ppt)

**[安装使用](#安装) · [使用流程](#开始使用) · [完整说明](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/REFERENCE.zh.md)**

<picture>
  <source media="(prefers-color-scheme: dark) and (max-width: 640px)" srcset="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-zh-mobile-dark.svg">
  <source media="(max-width: 640px)" srcset="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-zh-mobile-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-zh-dark.svg">
  <img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-zh-light.svg" alt="给出材料，拿到可以交付的演示文稿。 · 流程示意" width="100%">
</picture>

## 功能

- 生成 HTML 放映、可编辑 PPTX 与工程包。
- 只给一个主题/一句话，一键生成课件（HTML + PPTX + 教案 Markdown）。
- 按需编辑文字、图片与页序，支持撤销。
- 可选数字溯源、现场推演、AI 预审与答辩演练。

## 一键课件

只给一个主题，`ppt_lesson_create` 一次调用就产出「HTML 放映 + 可编辑 PPTX + 工程 JSON + 教案 Markdown」。例如：

> 帮我做一个「如何做一次有效的用户访谈」的课件，工作坊形式，45 分钟，面向零基础学员。

它会自动完成教学设计（7 种模式 × 4 类受众、布鲁姆分类学目标、互动与形成性评价、时间轴），产出的是**可编辑的教学结构骨架**，`[待填写：…]` 处由你或 AI 补全真实内容后再交付。想要先看/改教案结构，可用 `ppt_lesson_generate` 拿到结构化 slides 再交给 `ppt_create`。详见 [使用说明](docs/USAGE.md)。

<details>
<summary>查看实际示例</summary>

![workbench example](https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/screen-zh.webp)

图片来自验证环境的真实界面或示例 PPTX 渲染，使用示例数据。

</details>

## 课程包转课件

给一个视频课程文件夹（录屏讲解 + 每课作业素材压缩包），先 `ppt_course_scan` 看清单，再 `ppt_course_build` 一键拆成精讲课件 + 作业。例如：

> 把这个课程文件夹拆成精讲课件，deep 模式，配好每课作业。

它会自动扫描→抽音轨→转写（ASR 三级探测，优雅降级）→分课→提炼→成稿，产出每课三件套 + `homework.md` + 课程总览 + 转写 + 生成报告；可选配音（`voice.enabled`）与去水印（`watermark.enabled`）。详见 [课程包转课件](skills/dsh-ppt/references/course.md)。

## 安装

在 DSH 桌面版「插件」面板安装 `dsh-ppt`。已配置命令行时也可使用：

```bash
dsh plugin --profile desktop add dsh-ppt
```

网页版把 `desktop` 改为 `web`；安装后重启对应的 DSH。宿主要求以包声明 `>=0.2.1-rc.3` 为准。

## 开始使用

1. 在目标工作区提供材料、用途、听众和页数，例如“做成可交付的演示文稿，生成 HTML、PPTX 和工程文件”。
2. 从左侧栏打开“演示文稿”，在工程库搜索或选择生成的项目。
3. 选择页面编辑文字、图片或顺序，保存后核对预览；需要时渲染当前 PPTX 检查实际画面。
4. 按需要主动开启 AI 预审、模拟答辩或看图修复；直接下载成品不要求这些步骤。
5. 下载“分享成品包”交付，或下载“完整工程包”保留编辑能力；在目标播放器或 Office 中再核对一次。

可以这样说：

> 根据这些材料制作演示文稿，提供 HTML、可编辑 PPTX 和工程包，先确认听众与页数。

## 开始前要知道

可直接下载成品；AI 预审与演练按需开启。Office 修改不会自动同步回工程。

配置、完整工具与排错见[详细使用说明](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/REFERENCE.zh.md)。

## 插件更新

在工作台或原生插件详情页底部检查更新。默认自动检查，**默认不自动安装**；是否安装、何时重启由你决定。Suite 管理的组件随整包更新。[查看更新规则](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/REFERENCE.zh.md)。

## 文档

- [详细使用、配置与边界](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/REFERENCE.zh.md)
- [更新记录](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/CHANGELOG.md)
- [验证范围与历史](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/VALIDATION.md)

## 反馈与贡献

如果插件帮到了你，欢迎 Star，让更多人发现它。问题和建议请提交 [Issues](https://github.com/STARDUSTLC666/dsh-ppt/issues)，也欢迎代码与文档 [PR](https://github.com/STARDUSTLC666/dsh-ppt/pulls)。反馈时附上版本与复现步骤，并移除凭据。

## License

[MIT](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/LICENSE)

<a id="依赖与配置"></a>

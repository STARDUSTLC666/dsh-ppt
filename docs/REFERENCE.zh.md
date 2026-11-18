> 完整使用说明。首页已按用途、安装和操作流程重新整理；这里保留详细参数、限制、更新规则与历史验证链接。

# dsh-ppt

[English](../README.en.md)

![dsh-ppt 鲸鱼娘插件封面](https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/cover-whale-girl.png)

把材料制作成高审美品味、可直接交付的 HTML 放映、100% 原生可编辑 PPTX 与工程包。无需懂设计参数，自动导演会匹配合适的明暗主题与丰富版式；也可在 DSH 工作台一键换肤、吸收外部 `.pptx` 风格、编辑卡片/三线表、核对数字来源和现场推演。AI 预审、模拟答辩与看图修复均按需选择，也可直接下载成品。

[![npm](https://img.shields.io/npm/v/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt) [![downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-downloads.svg)](https://www.npmjs.com/package/dsh-ppt) [![total downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-total-downloads.svg)](https://www.npmjs.com/package/dsh-ppt)

[下载统计说明](https://github.com/STARDUSTLC666/dsh-suite/blob/npm-downloads/README.md)

欢迎使用，遇到问题或有改进建议，请提交 [issues](https://github.com/STARDUSTLC666/dsh-ppt/issues) 和 [PR](https://github.com/STARDUSTLC666/dsh-ppt/pulls)。

从 DSH 原生侧栏打开工作台；配置与操作边界见[工作台说明](WORKBENCH.md)。

## 功能

- **零品味负担自动导演、24 套大师主题与 6 套母版骨架**：内建 16 套明亮投影友好主题（含新增翡翠战略 `bcg-emerald`、经济学人简报 `economist-brief`、红杉创投简报 `venture-daylight`、云靛工坊 `stripe-craft`，以及 `consulting`、`cobalt-cream`、`exec-jilan`、`exec-palace`、`academic`、`editorial-forest`、`cartesian`、`course-sage`、`soft`、`keynote-light`、`financial-ft`、`medical-clean`）与 8 套深色舞台主题（含新增极光发布会 `aurora-stage`、黑曜终端 `obsidian-amber`，以及 `linear-dark`、`swiss`、`velvet`、`data`、`bold`、`luxury-noir`），匹配 **6 套差异化母版骨架**与 **20 套行业场景蓝图**。未指定主题时 `ppt_create` 默认启用 `auto` 场景导演。
- **深度吸收外部 `.pptx` 骨架与名家范本**：内置 **8 套名家范本一键直吸**，并支持 `ppt_absorb` 工具、`referencePptx`（含 `cloneStructure: true` 结构复刻）或工作台「风格与母版」面板直接上传参考 `.pptx`（≤24 MiB），自动递归拆解嵌套组合形状 `<p:grpSp>`、解析 OOXML `sysClr`/`prstClr`/`hueMod` 修饰色板、主辅双强调色、标题/正文字体配对、深色封面+浅色正文极性、母版 Logo、骨架几何（`extractedSkeleton` / `recommendedChrome`）与 24 版式逐页序列（`slideSkeleton[]`），支持收藏到工作台品牌库复用。
- **28+ 种原生可编辑版式/专业图示与原生 `<m:oMath>` 数学公式**：新增 **不等宽市场图（`marimekko`）**、**多层桑基流向图（`sankey`）**、**真·波特价值链（`value-chain`）**、**SWOT 战略十字矩阵（`swot`）** 及基于 `deck-math.mjs` 的原生 Office Math（`<m:oMath>`）+ W3C MathML LaTeX 公式编译（`slide.formula` / `$...$`），覆盖咨询价值链五边形咬合箭头（`chevron`）、Bento/支柱卡片（`cards`）、大数字指标（`kpi`）、双栏/痛点举措对比（`comparison`）、四象限矩阵（`matrix`）、流程/里程碑轴/漏斗/飞轮（`process`）、定理/行动清单（`callout`）、甘特图路线图（`gantt`）、分层系统架构（`architecture`）、哈维球竞品矩阵（`harvey`）、TAM/SAM/SOM 同心圆（`tam`）、组织架构/团队图谱（`org`）、咨询表与学术三线表（`table` `booktabs` `harvey`）、图表+洞察分栏（`chart-split`）及矢量瀑布桥（`waterfall`）等。
- **第 10 个工具 `ppt_import`、PPTX 一键翻新与 Office 双向导回**：支持通过 `ppt_import`（或工作台「导入 PPTX 翻新 / 导入 Office 修改稿」）从任意 `.pptx` 提取正文、表格、原生 `<c:chart>` 图表、嵌入图片与演讲备注，既可全新翻新为高颜值工程，也可在 PowerPoint / WPS 微调后导回既有工程更新（保留 `.history/` 撤销历史）；同时支持双屏演讲者提词台（HTML 按 `P` 开启、`L` 键虚拟激光笔）与 `.handout.md` 演讲讲义导出。
- **工程库与增强工作台**：按关键词/主题搜索排序，展示主题与页数标签；支持单页版式与单页母版骨架一键无损切换、结构化卡片/甘特图时间轴/哈维球与表格编辑、新增页面、HTML ↔ PPTX 并排分屏对比、点击质量提醒直接跳页，以及最多 20 步撤销。
- **可选数字溯源与现场推演**：点击数字追到原始材料、CSV 单元格或公式（全面支持 `items`、甘特图、`tam`、架构、哈维球矩阵、`takeaway`、`source` 与图表绑定）；调整假设、预览影响并确认保存。见[数据说明](DATA.md)。
- **可选双层 AI 视觉检查（最多 24 页）**：看实际 PPTX 渲染图，兼顾排版溢出检测与审美层级把关，支持 12 种零文本篡改排版动作、全宽画布前后对比、停止与撤销。见[看图修复](VISUAL.md)。
- **可选高管叙事预审与模拟答辩**：把关结论先行 Action Title、SCQA 金字塔叙事与论据缺口（单轮最多 8 条建议，支持高管/投资人/学术评委/技术评审等 7 类听众画像），导出问答与待补充材料清单。见[演练说明](COACHING.md)。
- **分享成品包与工程包下载**：可选「分享成品包」（PPTX、离线 HTML、逐页 Markdown 讲稿）或「完整工程包」（含 JSON 工程），见[下载说明](WORKBENCH.md#下载与分享--download-and-share)。

## 安装

桌面版可在「插件」面板按包名 `dsh-ppt` 安装。已配置 dsh 命令时也可使用：

```bash
dsh plugin --profile desktop add dsh-ppt
```

网页版把命令中的 `desktop` 改为 `web`。安装后重启 DSH。

## 开始使用

1. 在目标工作区提供材料、用途、听众或参考 `.pptx`，例如“做成可交付的季度汇报演示文稿，生成 HTML、PPTX 和工程文件”。
2. 从左侧栏打开“演示文稿”，在工程库搜索或选择生成的项目。
3. 在「内容编辑」切换 24 种单页版式与单页母版骨架、编辑文字/甘特图/哈维球/卡片/表格/图片或新增页面；在「风格与母版」一键切换 18 套主题、6 套母版骨架或拖拽 `.pptx` 吸收企业风格与骨架；需要时渲染当前 PPTX 并开启并排对比。
4. 按需要主动开启 AI 预审、模拟答辩或看图修复；直接下载成品不要求这些步骤。
5. 下载“分享成品包”交付，或下载“完整工程包”保留编辑能力；在目标播放器或 Office 中再核对一次。

支持通过 `ppt_import` 或工作台「导入 Office 修改稿」将 PowerPoint / WPS 中的修改导回工程（保留撤销历史）。若外部直接修改成品且未走导回，可用面板「另存副本」或 `ppt_edit(saveAs:true)` 从 JSON 重建新文件，保留原成品。

## 依赖与配置

普通生成与 `.pptx` 风格吸收均不需要安装 Office 或 LibreOffice。最终 PPTX 逐页 PNG / PDF 渲染使用可选的官方 LibreOffice Kit；依赖版本、跨平台零缺字字体环境和安装方法见[使用说明](USAGE.md)。从源码独立开发时，Node 要求以 [package.json](../package.json) 为准。

## 文档

- [使用与排错](USAGE.md)
- [工作台与风格工作室](WORKBENCH.md)
- [AI 看图修复](VISUAL.md)
- [AI 叙事预审与答辩演练](COACHING.md)
- [数字溯源与现场推演](DATA.md)
- [更新记录](../CHANGELOG.md)
- [验证范围与历史记录](VALIDATION.md)
- [问题反馈与功能建议](https://github.com/STARDUSTLC666/dsh-ppt/issues)

## 插件更新

需要 DSH 0.2.2-rc.3 或更新版本。更新控件直接位于原有工作台内容末尾；没有工作台的插件，位于原生插件详情页底部。检查、更新记录和偏好在原地展开，不增加独立更新页面或设置菜单。自动检查默认开启；**自动安装默认关闭**，明确授权后才会在空闲且没有未保存修改时安装兼容的稳定补丁。开关按插件独立保存，可关闭、推迟或忽略提醒；不会强制重启 DSH、升级 DSH 本体或替换本地源码安装。Suite 组件在当前页面底部明确说明并操作 Suite 整包更新。

旧版用户先在官方插件管理中手动更新一次，之后才会获得此入口。发布到 npm 不会直接替换用户已经安装的版本。

## License

[MIT](../LICENSE)

> 完整使用说明。首页已按用途、安装和操作流程重新整理；这里保留详细参数、限制、更新规则与历史验证链接。

# dsh-ppt

[English](./REFERENCE.en.md)

![dsh-ppt 鲸鱼娘插件封面](https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/cover-whale-girl.png)

把材料制作成高审美品味、可直接交付的 HTML 放映、100% 原生可编辑 PPTX 与工程包。无需懂设计参数，自动导演会匹配合适的明暗主题与丰富版式；也可在 DSH 工作台一键换肤、吸收外部 `.pptx` 风格、编辑卡片/三线表、核对数字来源和现场推演。AI 预审、模拟答辩与看图修复均按需选择，也可直接下载成品。

[![npm](https://img.shields.io/npm/v/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt) [![downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-downloads.svg)](https://www.npmjs.com/package/dsh-ppt) [![total downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-total-downloads.svg)](https://www.npmjs.com/package/dsh-ppt)

[下载统计说明](https://github.com/STARDUSTLC666/dsh-suite/blob/npm-downloads/README.md)

欢迎使用，遇到问题或有改进建议，请提交 [issues](https://github.com/STARDUSTLC666/dsh-ppt/issues) 和 [PR](https://github.com/STARDUSTLC666/dsh-ppt/pulls)。

从 DSH 原生侧栏打开工作台；配置与操作边界见[工作台说明](WORKBENCH.md)。

## 功能

- **零品味负担自动导演、24 套大师主题与 6 套母版骨架**：内建 16 套明亮投影友好主题（含新增翡翠战略 `bcg-emerald`、经济学人简报 `economist-brief`、红杉创投简报 `venture-daylight`、云靛工坊 `stripe-craft`，以及 `consulting`、`cobalt-cream`、`exec-jilan`、`exec-palace`、`academic`、`editorial-forest`、`cartesian`、`course-sage`、`soft`、`keynote-light`、`financial-ft`、`medical-clean`）与 8 套深色舞台主题（含新增极光发布会 `aurora-stage`、黑曜终端 `obsidian-amber`，以及 `linear-dark`、`swiss`、`velvet`、`data`、`bold`、`luxury-noir`），匹配 **6 套差异化母版骨架**与 **20 套行业场景蓝图**。未指定主题时 `ppt_create` 默认启用 `auto` 场景导演。
- **1:1 公司固定模板原生母版直出、深度 `.pptx` 吸收与名家范本**：支持显式开启 **企业固定模板母版模式（`useTemplateMaster: true` / `extractMaster: true`）**，按 **封面 / 章节 / 正文 / 封底** 4 角色完整提取公司 `.pptx` 模板的原生 `slideMaster` / `slideLayout` 矢量母版与底图（支持 `native-master` 原生母版直出——在 PowerPoint「幻灯片母版视图」中仍可编辑——与 `overlay` 轻量同构双模式），自动计算占位符安全留白区（`safeInsets`）、按页型反转深浅 WCAG 对比度、让位冲突内置装饰/重复 Logo/页脚、全局 SHA-256 媒体去重，并在 HTML 放映与 16:9 灯箱中 1:1 所见即所得，可一键锁定到 `.dsh-ppt/brand-kit.json` 长期沿用；同时保留 **8 套名家范本一键直吸**与默认风格吸收（`ppt_absorb` / `referencePptx` / `cloneStructure`）。
- **41 种标准原生可编辑版式（+ 53 个别名）、高管战略图谱、Mermaid 流程图与 `<m:oMath>` 数学公式**：内置零外部依赖 **`deck-mermaid.mjs`**（支持 `layout: 'mermaid'`、`'flowchart'` / `'sequence'` 别名及 Markdown ```` ```mermaid ```` 代码块自动识别），将 `flowchart` 与 `sequenceDiagram` 编译为 100% 原生可编辑 PowerPoint `<p:sp>` 形状与吸附连接线（`<p:cxnSp>`）及高精 HTML SVG；同源涵盖 **MECE 逻辑议题树（`issue-tree`）**、**比例矩形树图（`treemap`）**、**OKR 达标仪 / 子弹图（`gauge`）**、**三档商业报价矩阵（`pricing`）**、**全球/中国点阵地图（`map`）**、**2.5D 等轴测立体图（`isometric`）**、**设备原型（`mockup`）**、**语法高亮代码（`code`）**、**魔力象限（`quadrant`）**、**多维雷达图（`radar`）**、**哑铃跃迁图（`dumbbell`）**、**矩阵热力图（`heatmap`）**、**不等宽市场图（`marimekko`）**、**多层桑基流向图（`sankey`）**、**真·波特价值链（`value-chain`）**、**SWOT 战略十字矩阵（`swot`）**、原生 Office Math（`<m:oMath>`）+ W3C MathML LaTeX 公式编译、价值链五边形咬合箭头（`chevron`）、Bento/支柱卡片（`cards`）、大数字指标（`kpi`）、双栏对比（`comparison`）、四象限矩阵（`matrix`）、流程/里程碑轴/漏斗/飞轮（`process`）、定理/行动清单（`callout`）、甘特图路线图（`gantt`）、分层系统架构（`architecture`）、哈维球竞品矩阵（`harvey`）、TAM/SAM/SOM 同心圆（`tam`）、组织图谱（`org`）、咨询表与学术三线表（`table` `booktabs` `harvey`）、图表+洞察分栏（`chart-split`）及矢量瀑布桥（`waterfall`）等。
- **双向 Office 引擎、品牌宪章锁、8 域权威研究与生态工具（`ppt_from_office`、`ppt_import`、`ppt_cite`、`ppt_remotion`）**：支持 **`ppt_from_office`** 直吞 `.xlsx`/`.csv`/`.tsv`/`.docx`/`.pdf` 及混合多源资料包，并支持将任意工程逆向导出为 **Excel 可运算工作簿（`.xlsx`）**、**Word 深度报告（`.docx`）**、**高管会前质询预案（`.qa-prep.md`）**、叙事备忘录与多语言翻译包；保留 **`ppt_import`** 导入旧 `.pptx` 一键翻新或导回 Office 修改稿；内置工作区 **品牌宪章锁（`brand-kit.json` + SLOP-14）**、**8 域权威研究溯源（SLOP-13）**、**`ppt_cite`** 文献桥接与 **`ppt_remotion`** 30fps 视频分镜导出；内置双屏演讲者提词台（HTML 按 `P`/`V` 开启、`L` 键虚拟激光笔、`D` 白板标注 / 含数据模型时 `D` 推演 + `Shift+D` 标注）、**演讲时长预算器（`targetMinutes`）**、**高管一页纸（`.onepager.html`）**、社媒长图（`social-carousel`）、配音字幕（`.srt`/`.vtt`）与 `.handout.md` 演讲讲义导出。
- **实体胶片灯箱总览与单页精修工作台**：打开工程默认进入 16:9 **实体胶片灯箱总览（Lightbox）**，支持拖拽或 `←/→` 调序、1 键复制与插页；单击胶片切入三栏 **单页精修（Slide Studio）**，内置顶栏 **`? 引导`** 四步聚光灯交互导览、13 套设计风格 × 8 套字体、空态 **「一键体验旗舰示例」**、拖拽上传 `.xlsx`/`.csv`/`.docx`/`.pdf`/`.pptx`、41 种版式原型与单页母版骨架一键无损切换、结构化卡片/达标仪（`actual`/`target`/`max`）/甘特图/哈维球/Mermaid/LaTeX 公式编辑、HTML ↔ PPTX 并排分屏对比、点击质量提醒直接跳页，以及最多 20 步撤销。
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

1. 在目标工作区提供材料（Word/Excel/CSV/Markdown/Mermaid）、用途、听众或参考 `.pptx`，例如“把这份季报 Excel 做成可交付的汇报演示文稿，导出 HTML、PPTX、高管一页纸与工程文件”。
2. 从左侧栏打开“演示文稿”（可点右上角 **`? 引导`** 快速上手或点击 **「一键体验旗舰示例」**），在工程库搜索或选择生成的项目。
3. 在灯箱总览拖拽排片或进入「内容编辑」切换 41 种标准单页版式（含议题树/树图/达标仪/报价矩阵/地图/等轴测/Mermaid）与单页母版骨架、编辑文字/达标仪（`actual`/`target`/`max`）/甘特图/哈维球/卡片/表格/公式/图片、设置目标演讲时长（`targetMinutes`）检查节奏，或新增页面；在「风格与母版」一键切换 24 套主题、6 套母版骨架或拖拽 `.pptx` 吸收企业风格与骨架；需要时渲染当前 PPTX 并开启并排对比。
4. 按需要主动开启 AI 预审、模拟答辩、看图修复、`ppt_cite` 文献核验或 `ppt_remotion` 视频分镜导出；直接下载成品不要求这些步骤。
5. 下载“分享成品包”、**Excel 工作簿（`.xlsx`）**、**Word 报告（`.docx`）**、**高管质询预案（`.qa-prep.md`）**、**高管一页纸（`.onepager.html`）**、**Remotion 分镜包（`.zip`）**、演讲讲义（`.handout.md`）交付，或下载“完整工程包”保留编辑能力；在目标播放器或 Office 中再核对一次。

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

需要 DSH 0.2.2-rc.3 或更新版本。更新控件直接位于原有工作台内容末尾；没有工作台的插件，位于原生插件详情页底部。检查、更新记录和偏好在原地展开，不增加独立更新页面或设置菜单。自动检查默认开启；**自动安装默认关闭**，明确授权后才会在空闲且没有未保存修改时安装兼容的稳定更新（默认允许兼容的次版本与补丁，也可限定为仅补丁）。开关按插件独立保存，可关闭、推迟或忽略提醒；不会强制重启 DSH、升级 DSH 本体或替换本地源码安装。Suite 组件在当前页面底部明确说明并操作 Suite 整包更新。

旧版用户先在官方插件管理中手动更新一次，之后才会获得此入口。发布到 npm 不会直接替换用户已经安装的版本。

## License

[MIT](../LICENSE)

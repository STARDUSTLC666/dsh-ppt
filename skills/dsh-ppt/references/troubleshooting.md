# dsh-ppt 故障排查与审美修复速查

只在交付异常、测试告警或画面不符合预期时读取本文件。注意：CLI 与技能层报错信息统一为中文。

| 症状 / 告警 | 根因与标准处理方式 |
| --- | --- |
| `ppt_create` 等工具不存在 | 当前处于跨 harness 裸技能环境；改用 `node <skill-dir>/scripts/build-deck.mjs` 生成完全一致的 HTML + PPTX + JSON 三件套 |
| CLI 生成出来默认是黑紫色 `data` 主题 | 裸 CLI 缺省 `--theme` 为兼容旧脚本保留 `data`；**CLI 调用请显式加 `--theme auto` 或具体场景主题（如 `--theme consulting` / `--theme exec-jilan`）** |
| 会议室/教室投影画面发暗、字迹不清 | 暗底主题在开灯投影下易泛白；用 `ppt_edit` 切换为 12 套浅底主题之一（`consulting`、`exec-jilan`、`academic`、`course-sage`、`cobalt-cream`、`keynote-light`、`financial-ft`、`medical-clean`） |
| 未知主题报错 | 调 `ppt_themes` 或 `--list-themes` 查看 18 套合法主题 ID（或传 `'auto'`），切勿臆造主题名 |
| 外部参考 `.pptx` 是刺眼大红底或黄字看不清 | 直接传 `ppt_absorb` 或 `referencePptx`；内置 `sanitizeAbsorbedTheme()` 会自动把高饱和红底降级为庄重深红封面 + 宣纸暖白内页，并将低对比文字钳制到 WCAG AA ≥ 4.6:1 |
| `ppt_check` 提示 `SLOP-01`（弱标题）或 `SLOP-02`（重复 Kicker） | 将「项目背景 / 数据统计」等名词标签改写为结论判断句（Action Title），并把每页 `kicker` 设为 `01 · 章节名` 面包屑 |
| `ppt_check` 提示 `SLOP-03` / `SLOP-08`（要点墙 / 版式单一） | 禁止连续 > 2 页 `bullets`；用 `ppt_edit` 将并列指标改为 `kpi`、并列模块改为 `cards`（`pillars/bento`）、对比改为 `comparison`、流程改为 `process` |
| 学术答辩表格带竖线、像粗糙 Excel 表 | 将表格页设 `tableStyle: "booktabs"`（或选 `academic` 主题），自动输出顶底粗线、表头细线、零竖线的标准学术三线表，数值列自动右对齐 |
| 图表类别文字重叠或歪斜难读 | 当类别名较长（中文 > 6 字）或类别数 > 7 时，将 `chart.kind` 设为横向条形图 `"bar"`；单系列图表已自动隐藏冗余图例 |
| 单张图表页显得空旷单薄 | 改用 `layout: "chart-split"`（62% 图表 + 38% 右侧洞察卡片 `items`），并在底部补充一句话 `takeaway` 与左下角 `source` |
| 内容超过 `maxSlides`（默认 60，硬上限 120） | 提炼合并次要论点，或按章节拆分为多套文稿；单页正文绝不低于 `13.5pt`，超长列表/表格应合理分页 |
| 图片、图表或 `.pptx` 吸收报缺少依赖 | 在独立技能目录执行 `npm install --ignore-scripts` 安装已声明的 `@office-kit/pptx@0.21.0` |
| `ppt_render` 返回 `unavailable` | 按需安装可选渲染引擎 `@deepseek-ai/libreoffice-kit@0.2.3`（DSH 0.2.2+ 已内置；0.1.5 亦兼容）；Windows 环境确认已安装对应架构 VC++ v14 运行库 |
| 渲染报告 `missingFonts` 非空 | 将自定义品牌字体替换为跨平台安全字体（Windows `Microsoft YaHei`、macOS `PingFang SC`/`Songti SC`、Linux `Noto Sans CJK SC`），重新生成并复查至 `missingFonts: []`；未解决前必须如实说明，不得声称视觉已验收 |
| 收据校验为 `not-verified` | 源 PPTX 在渲染后又被编辑或输出图片缺失；对最新 PPTX 重新运行 `ppt_render` 获取新 `renderReceipt`，切勿沿用旧收据 |
| `expectedRevision` 修订号冲突（409） | 重新调用 `ppt_check` 读取最新 `revision` 与页面结构，再基于最新修订号提交 `ppt_edit` |
| 外部手工修改过 PPTX 无法直接覆盖 | 为保护用户在 PowerPoint/WPS 中的手工编辑，不可强行覆盖原文件；使用 `saveAs: true` 另存新副本并告知用户手工修改不会自动回导 |
| 模板仍处于 `deliveryStatus: "draft"` | 当前仅生成了空框架草稿；必须填入材料中的真实事实、数据与可执行行动号召，不得将未填占位的草稿当作正式成品交付 |

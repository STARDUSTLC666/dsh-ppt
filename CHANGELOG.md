# 更新记录

[返回简介](README.md) · [使用说明](docs/USAGE.md) · [验证记录](docs/VALIDATION.md)

[历史英文记录](docs/CHANGELOG.en.md)

## 0.9.0 (2026-10-05)

- 增加成品 ZIP 下载：一次交付 HTML、可编辑 PPTX、工程 JSON 和使用说明；只打包本项目登记的当前修订，未保存或产物缺失时阻止交付。

## 0.8.1 (2026-10-03)

- 演示文稿工作台、质量提醒和后台失败引导跟随宿主中文 / English 切换；正文、成品语言与工程内容保持原样。
- 验收范围见 [中英文界面检查](docs/validation-language-2026-10-03.md)。

## 0.8.0 (2026-10-02)

- Add an authenticated DSH presentation workbench: click-to-focus text, edit fields/notes, replace uploaded PNG/JPEG, reorder pages, undo and download regenerated artifacts.
- Add `order` to `ppt_edit`, validating a complete permutation of stable slide IDs and combining text edits/order into one atomic undo record.
- Track only tool-created/checked JSON projects in a bounded local catalog. Browser requests cannot supply arbitrary file paths or image paths.
- Keep HTML playback separate from optional final PPTX rendering, display missing fonts and invalidate images after source/revision changes.
- Preserve unsaved input after failed saves; prevent embedded player navigation from desynchronizing the selected slide.

## 0.7.0 (2026-10-02)

- Add offline delivery controls: editable PPTX/project downloads, previous/next buttons, page-number navigation, quality findings and a clickable outline.
- Mark incomplete drafts, localize controls for Chinese/English/bilingual output, and support narrow viewports without requiring a DSH server.
- Render HTML links after collision-resolved paths are selected, preserving the atomic three-file commit and project revision guard.
- Escape display text and link only to encoded sibling filenames. Add delivery, revision-refresh and injection regression tests.
- Windows: 103 tests passed; browser interaction covers navigation, review, draft labeling, English controls and 390px layout.

## 0.6.0 (2026-10-01)

- 新增离线嵌入图片的三种布局、四类原生可编辑图表及数据工作簿；精确使用 MIT Office Kit 0.21.0，保留备注和原有动效。
- 新增 ppt_templates、ppt_edit、ppt_undo、ppt_check、ppt_render；四种场景结构参考、品牌、稳定页面ID、修订冲突保护和最多20次原子撤销。
- 质量报告定位具体页面；未填模板明确标注草稿，静态估算、渲染、视觉检查分开说明。
- 可选官方 LibreOffice Kit 0.1.3 读取最终PPTX生成PNG/PDF，报告缺失字体并写入完整性收据；不修改可编辑源文件。
- 修正总览缩略图重叠、PPTX表格标题字号、正文段间距、图片说明间距和图表坐标/比例标签。
- CLI覆盖全部流程，显式收据失效返回非零，默认渲染目录位于PPTX旁。
- 修正默认主题PPTX字体映射：CSS可选字体与本机Office字体分离，明确东亚字体，避免官方渲染时中文字符重叠；工具schema使用官方宿主支持的oneOf。

## 0.5.1 (2026-09-28)

- 兼容验证更新到 Harness 0.2.0-rc.1：70 项测试与 18 插件共同加载检查通过（`ppt_create` / `ppt_themes` 与 `dsh-ppt` 技能注册正常）。
- 运行时代码未变；同步中英文兼容性声明。

## 0.5.0 (2026-09-24)

- 包含新的演讲者预览、缩略图和计时控件。浏览器不支持或拒绝全屏时显示操作提示，不再无声失败。

- **演讲者视图升级**：独立窗口内显示真实当前页与下一页预览（复用幻灯片渲染）、全片缩略图条（点击跳页）、wall clock + 计时（P 暂停 / T 重置）、备注字号 +/-、黑屏 / 白屏（B / W）、结束放映一键退出。
- **通信更稳**：演讲者窗口改用 Blob URL + postMessage 同步，不再依赖同源 document 直连，file:// 打开的 deck 也能正常联动；窗口被直接关闭后 0.8 秒内自动恢复普通模式。
- **观众端**：黑屏 / 白屏时隐藏 HUD；观众端备注与 HUD 默认隐藏逻辑保持不变。
- 播放器保留 0.4.5 的全部修复，70 项测试通过。

## 0.4.5 (2026-09-24)

- **播放器交互修复（由合成用户复测驱动）**：备注面板不再遮挡页脚 HUD，新增关闭按钮并支持 Esc；无备注页显示「本页无备注」占位；`G` 改为缩略图网格总览（当前页高亮、页码同步、点击跳页、Esc 退出、页码角标）；`?` 打开快捷键帮助；表格页补页面标题、数字列右对齐、表格边界与内容列对齐、表头对比度达标；窄屏字号下限 14px、HUD 按钮 44px；新增环绕提示、ArrowUp/Down 翻页、数字 1-9 跳页、focus-visible 与 reduced-motion 处理。
- **演讲者视图（V）**：独立窗口显示当前页 / 下一页 / 备注 / 计时 / 进度，支持 +/- 字号、T 重置计时、P 暂停、方向键翻页、Esc 关闭；打开后主窗口隐藏备注与 HUD，观众端不泄露备注，关闭后状态自动恢复。
- **主题预览**：`ppt_themes { preview: true, outputDir: "..." }` 生成 `themes-preview.html`（5 套主题并排对比）与每套主题一张 `theme-<id>.svg` 色板卡，可直接用于 README / npm 首屏。
- 测试 70 项通过；三个合成用户（非技术运营 / 键盘党 / 培训讲师）真实浏览器复测通过，无 P0/P1。

## 0.4.4 (2026-09-21)

- Markdown 与结构化长表格自动按每页 8 行数据分页，续页重复表头，备注仅放第一页；修复无小标题、首个 H1 下表格被丢弃。
- 不再静默裁掉中间幻灯片、额外列或长单元格：总页数超过 maxSlides、超过 8 列或单元格超过 60 字符时，生成前提示调整。短行补空白，HTML 与 PPTX 保留同一份数据。
- 续页标题跟随中文、英文或双语设置。新增 7 项回归，67 项测试通过；生成产物检查覆盖全部 17 行数据。

## 0.4.3 (2026-09-19)

- 修复：中文分句导致正文丢内容；`--content deck.md` 不读文件；>8 条要点静默丢弃；`deck.json` 版本写死；英文 deck 被标 zh-CN。
- 稳健性：三件套改为 tmp + rename 原子提交（失败回滚）；过滤 Windows 保留名；文件名探测改一次目录快照。
- 测试 48 → 60 项。

## 0.4.2 (2026-09-12)

- 适配并验证官方 Harness 0.1.5-rc.1：整套同载、工具/技能契约与 Web 鉴权检查通过。
- Node 要求与宿主统一为 `^22.19.0 || >=24.0.0`；更新中英文兼容性说明。

## 0.4.1 (2026-09-05)

- 修复中文正文分页：中英文标点都作为句子边界，无标题纯文本严格按「每 5 句一页」分页，不再把整段中文当一句而截断丢正文。
- CLI `--content <path>` 与 `--content @<path>` 行为一致：路径存在即读取文件，README / SKILL.md 示例可直接复制运行。
- 单节要点超过 8 条时自动续页（第二页起标题带「（续）」），不再静默丢弃第 9 条之后的要点。
- manifest `version` 改从 `package.json` 读取，消除与发版号的漂移；测试同步改为动态断言。
- PPTX 文本与备注 run 的语言跟随 `lang`（zh-CN / en-US），英文 deck 不再被 PowerPoint 标成中文。

## 0.4.0 (2026-09-01)

- **动效（motion，默认开）**：HTML 放映页间淡入 + 要点按序逐条入场（打印自动兜底为静态）；PPTX 每页原生淡入转场，`bullets` 页按段落构建、放映时点击一次出现一条要点（PowerPoint「出现，按段落」标准时序）。
- **`motion` 开关**：`ppt_create` 新增 `motion: 'on' | 'off'`，CLI 新增 `--motion on|off`；`off` 时产物不含任何动画代码，适合严肃/打印场景。manifest 记录该开关。
- **技能文件瘦身**：SKILL.md 收敛为触发条件 + 执行纪律 + 六步流水线 + 按需装载索引 + 质量门禁；新增 `references/syntax.md`（Markdown 解析、表格/金句/备注语法、结构化 slides、motion）与 `references/troubleshooting.md`；写作规则去重归口 `references/copywriting.md`，hyperframes 视觉联动并入 `references/themes.md`。
- 动效相关测试 8 例（转场/时序树/点击节点计数/静态开关/CLI/工具层），全套 42/42 通过。

## 0.3.0 (2026-09-01)

- **演讲者备注**：结构化 `slides` 的 `notes` 字段与 Markdown `<!-- 备注: ... -->` 注释都会成为该页备注；HTML 放映按 `S` 键（或右下角「备注」按钮）呼出备注面板；PPTX 生成原生 `notesSlide` + `notesMaster` 部件，PowerPoint 演示者视图直接可用。
- **新增 `quote` 金句版式**：`>` 引用块自动识别，末行 `—— 出处` 识别为署名；HTML 与 PPTX 双端实现。
- **新增 `table` 表格版式**：Markdown 表格（`| ... |`）自动识别，PPTX 用原生 `a:tbl` 图形帧（主题色表头 + 隔行着色），限 9 行 8 列。
- 版式集合扩为 `cover | section | bullets | statement | quote | table | closing`；结构化 `slides` 增加 `rows` 字段。
- 无表格数据的 `table` 页自动退化为要点页，避免空白版式。
- 新特性测试 8 例（解析/规范化/HTML/PPTX 部件/端到端）。

## 0.2.1 (2026-09-01)

- 修复 PPTX zip 中央目录 local header 偏移恒为 0 导致 PowerPoint 提示修复的问题（issue #1/#3，社区 PR #2 同修法）。

## 0.2.0 (2026-08-16)

- 新增 `defaultTheme` / `defaultLang` 配置，作为 `ppt_create` 未显式传参时的默认值。
- 配置校验：`defaultLang` 仅接受 `zh` / `en` / `bilingual`。
- 更新测试覆盖与双语文档。

## 0.1.0 (2026-08-16)

- 首发：`dsh-ppt` 技能 + 工具插件。
- `ppt_create`：Markdown / 结构化 slides → HTML 网页放映 + PPTX 导出 + manifest。
- `ppt_themes`：5 套内置视觉主题（Swiss Pulse / Velvet Standard / Data Drift / Soft Signal / Maximalist Type）。
- 中英双语界面（zh / en / bilingual）。
- 裸 SKILL.md + `build-deck.mjs` CLI，跨 Claude Code / Cursor / Gemini CLI / Codex / DSH。
- 零运行时依赖：OOXML 与 zip 由 `node:zlib` 手写生成。

## 更早的改动

完整历史可查阅 [GitHub 提交记录](https://github.com/STARDUSTLC666/dsh-ppt/commits/master)。

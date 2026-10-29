# 更新记录

[返回简介](README.md) · [使用说明](docs/USAGE.md) · [验证记录](docs/VALIDATION.md)

[历史英文记录](docs/CHANGELOG.en.md)

## 0.20.0 (2026-10-29)

- 工程库新增关键词搜索和最近 / 最早更新、自然标题排序；保留返回列表时的筛选条件，提供无匹配提示和清空搜索。
- Add project search and updated / oldest / natural-title sorting, retained filters on return, and a clear no-results state.

## 0.19.1 (2026-10-29)

- 同步仓库与 npm 的简明介绍、中英文 README 和反馈入口；本次为文档与包元数据更新。
- Sync npm descriptions and both README guides with the repository, including issue and pull-request links.

## 0.19.0 (2026-10-28)

- 下载面板区分分享成品包与完整工程包。分享包包含当前 PPTX、离线 HTML 和逐页讲稿，不打包 JSON 工程；工程备份入口继续保留。
- 分享 HTML 移除缺失工程文件的下载入口；不覆盖原文件，沿用修订校验与未保存保护，下载无需调用模型。
- Add separate share and project bundles, with current speaker notes and clear content boundaries. Preserve revision guards and original files; ordinary downloads require no model calls.

## 0.18.3 (2026-10-27)

- 修复分批更新时的新旧更新控件混用：保留原页面、草稿与安装保护，空闲后接管旧控制器，兼容旧入口。

## 0.18.2 (2026-10-27)

- 更新控件移至原有工作台或原生插件详情页底部；更新记录与选项原地展开，移除独立更新菜单与页面。
- 保留原页面操作与草稿，自动安装默认关闭；安装前确认，遇到未保存修改或运行任务时暂停。

## 0.18.1 (2026-10-27)

- Keep this component's own update entry visible when installed transitively through Suite. Confirm whole-Suite update scope before opening its controls.
- Keep automatic installation off by default and preserve independent installation behavior.

## 0.18.0 (2026-10-26)

- Add this plugin’s own update controls and independent preferences. Automatic installation stays off until explicitly enabled.
- Confirm manual installs, preserve local sources and disabled state, pause for tasks or unsaved changes, and use native DSH recovery without forced restarts.
- Require the public DSH 0.2.1-rc.3 update APIs; Suite components remain managed through Suite.

## 0.17.0（2026-10-25）

- 演示文稿主工作台，页面、画布与属性分栏；数据推演切页保留预览联动，未保存保护和画面内全屏退出更完整。
- 提供 DSH 原生侧栏入口，保留设置页；统一中英、深浅色、窄屏、键盘焦点与真实空/失败状态。
- 浏览器源码移至 templates/client.js、templates/panels/ 与共享组件，独立构建为 lib/client.js；移除重复的首次引导。
- 官方 DSH 0.2.1-rc.3 Web 逐项实际操作验收，账户模拟和未验收范围见 [工作台说明](docs/WORKBENCH.md)。

## 0.16.1（2026-10-24）

- 适配 DSH 0.2.1-rc.3 的动态模型目录：视觉检查、AI 预审与模拟答辩按提供方和模型 ID 保留选择，刷新或重排目录不会悄悄更换模型。
- 已选模型下线时清空选择并禁用开始按钮，等待重新选择。首次仅沿用仍然可用的工程模型，不自动选择目录里的第一个模型。
- Windows 测试、官方 RC.3 发布包安装和实际浏览器范围见 [0.16.1 验证记录](docs/validation-0.16.1.md)。

## 0.16.0（2026-10-23）

- 新增可选 AI 看图检查与排版修复：通过官方 DSH 图片附件和预备模型接口检查最终 PPTX 渲染图片，记录页面与问题区域。
- 修复仅使用字号、要点 / 表格拆页、柱图转横向条形图、图片完整显示等受限操作；不让模型重写原文、数值或公式。每轮另存可撤销副本，并重新渲染后复查新增页面。
- 工作台提供调用上限、停止、前后实际画面对比、未解决问题、历史与 Markdown 记录。旧工程、变化的 PPTX、渲染图片或副本不能误用。
- 普通成品生成不启动视觉模型；需自行配置支持图片输入的 DSH 模型和可选官方渲染引擎。范围与边界见[看图修复](docs/VISUAL.md)。
- Windows 测试、真实 DSH Web、真实模型样例、原生 PPTX 渲染和全新安装范围见 [0.16.0 验证记录](docs/validation-0.16.0.md)。

## 0.15.0（2026-10-23）

- 新增可选数据模型：数字绑定原始材料行、CSV / TSV 单元格或受限算术公式；点击 HTML 数字逐层追问来源，未绑定数字明确提示。
- 工作台与离线 HTML 支持假设滑杆，文字、表格和图表联动；不修改来源事实。离线参数可导回 DSH，确认后生成相符的静态 PPTX。
- 来源更新和推演先显示指标、页面及字段差异，再确认保存；默认新副本保留原稿，支持撤销。旧预览、其他工程参数与外部 Office 修改受保护。
- PPTX 备注与 Markdown 报告附上来源摘录、定位、快照校验值、公式和假设。HTML 不嵌入完整材料；JSON 工程保留导入材料供后续编辑。
- 修复离线放映中隐藏页外框拦截数字点击的问题。验收范围见 [0.15.0 验证记录](docs/validation-0.15.0.md)。

## 0.14.0（2026-10-22）

- 成品页新增按需开启的 AI 预审与人机模拟答辩，复用宿主已有模型，不影响直接交付。
- 预审区分表达、逻辑与证据问题；引用必须匹配所提供的原文。仅表达建议可选中改稿，新增数字没有匹配来源时不提供采纳按钮。
- 采纳所选修改或备用问答页时另存副本，原稿保留，副本可撤销。旧修订的报告可查看，禁止继续调用和套用。
- 提供中英文配置、回答输入、取消与提前结束、报告历史和 Markdown 问答 / 材料清单。预审最多 3 次插件调用，答辩最多 5 题、6 次调用；失败不自动重试。
- 演练只发送选定页面的文字、图表数据、备注及用户补充材料，不带工具或图片文件。验收范围见 [0.14.0 验证记录](docs/validation-0.14.0.md)。
- PPT 工作台使用当前 DSH 的主题变量，修复深色主题下仍显示浅色面板的问题。

## 0.13.0（2026-10-20）

- **设置面板体验**：新增 Ctrl/⌘+S 保存、Esc 取消或返回、Alt+←/→ 切换页面；HTML 预览 iframe 内同样生效。
- **未保存保护**：标题旁显示「未保存」徽标；刷新/关闭页面前提示；Esc 取消修改前先确认。
- **错误恢复**：错误提示旁新增「重试」按钮；空状态支持一键复制示例提示词。
- **无障碍**：补充 aria-busy、aria-keyshortcuts、role=status；焦点在 SELECT 上时不再劫持 Esc。
- 中英文案与 README 同步；131 项测试通过。
## 0.12.1（2026-10-20）

- 修复 #4：记录 HTML / PPTX 的 SHA-256；检测外部修改或旧工程缺少记录时拒绝覆盖，新增「另存副本」与 `ppt_edit.saveAs`，原文件保留。副本从 JSON 重建，不导入 Office 手工修改。
- 读入当前工程和撤销历史时验证品牌颜色、字体及图片适应方式，拒绝不合规工程；纯文字 PPTX 清理 XML 禁止字符，保留中文与 emoji。

## 0.12.0（2026-10-20）

- 新增逐页 Markdown 讲稿下载，使用当前页序、标题与备注，保留空备注提示和修订保护。
- 修复图片读取中切页或返回项目时图片可能落到另一页的问题；可取消读取，读取期间暂缓保存、结构修改与下载。
- 面板图片上限与引擎统一为 5 MiB，提前提示超限。
- 首次使用引导跟随宿主中文 / English，完成或跳过的状态继续保留。

## 0.11.0（2026-10-17）

- 设置面板顶部新增「首次使用」分步引导：一次只讲一步，支持上一步/下一步/跳过，看完记在本机不再出现。
- 引导内容与该插件的实际用法一致；可在开发者工具里清掉 `dsh-first-run:dsh-ppt:v1` 重新查看。
## 0.10.0 (2026-10-15)

实际操作、最终 PPTX 渲染与未测范围见 [验收记录](docs/validation-0.10.0.md)。

- 设置页可复制、删除当前页，复制时保留图片、原生图表与备注；副本拥有独立页面 ID。
- `ppt_edit` 增加 `duplicate` / `remove`，支持与文字修改、排序合并成一次原子修改，整步可撤销。
- 保留至少一页并限制 120 页；未保存输入或修订冲突时阻止结构修改，避免覆盖正在编辑的内容。

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

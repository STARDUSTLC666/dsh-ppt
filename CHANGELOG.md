# Changelog

## 0.4.4（2026-09-21）

- Markdown 与结构化长表格自动按每页 8 行数据分页，续页重复表头，备注仅放第一页；修复无小标题、首个 H1 下表格被丢弃。
- 不再静默裁掉中间幻灯片、额外列或长单元格：总页数超过 maxSlides、超过 8 列或单元格超过 60 字符时，生成前提示调整。短行补空白，HTML 与 PPTX 保留同一份数据。
- 续页标题跟随中文、英文或双语设置。新增 7 项回归，67 项测试通过；生成产物检查覆盖全部 17 行数据。

## 0.4.3（2026-09-18）

- 修复：中文分句导致正文丢内容；`--content deck.md` 不读文件；>8 条要点静默丢弃；`deck.json` 版本写死；英文 deck 被标 zh-CN。
- 稳健性：三件套改为 tmp + rename 原子提交（失败回滚）；过滤 Windows 保留名；文件名探测改一次目录快照。
- 测试 48 → 60 项。
## 0.4.2（2026-09-11）

- 适配并验证官方 Harness 0.1.5-rc.1：整套同载、工具/技能契约与 Web 鉴权检查通过。
- Node 要求与宿主统一为 `^22.19.0 || >=24.0.0`；更新中英文兼容性说明。

## 0.4.1

- 修复中文正文分页：中英文标点都作为句子边界，无标题纯文本严格按「每 5 句一页」分页，不再把整段中文当一句而截断丢正文。
- CLI `--content <path>` 与 `--content @<path>` 行为一致：路径存在即读取文件，README / SKILL.md 示例可直接复制运行。
- 单节要点超过 8 条时自动续页（第二页起标题带「（续）」），不再静默丢弃第 9 条之后的要点。
- manifest `version` 改从 `package.json` 读取，消除与发版号的漂移；测试同步改为动态断言。
- PPTX 文本与备注 run 的语言跟随 `lang`（zh-CN / en-US），英文 deck 不再被 PowerPoint 标成中文。

## 0.4.0

- **动效（motion，默认开）**：HTML 放映页间淡入 + 要点按序逐条入场（打印自动兜底为静态）；PPTX 每页原生淡入转场，`bullets` 页按段落构建、放映时点击一次出现一条要点（PowerPoint「出现，按段落」标准时序）。
- **`motion` 开关**：`ppt_create` 新增 `motion: 'on' | 'off'`，CLI 新增 `--motion on|off`；`off` 时产物不含任何动画代码，适合严肃/打印场景。manifest 记录该开关。
- **技能文件瘦身**：SKILL.md 收敛为触发条件 + 执行纪律 + 六步流水线 + 按需装载索引 + 质量门禁；新增 `references/syntax.md`（Markdown 解析、表格/金句/备注语法、结构化 slides、motion）与 `references/troubleshooting.md`；写作规则去重归口 `references/copywriting.md`，hyperframes 视觉联动并入 `references/themes.md`。
- 动效相关测试 8 例（转场/时序树/点击节点计数/静态开关/CLI/工具层），全套 42/42 通过。

## 0.3.0

- **演讲者备注**：结构化 `slides` 的 `notes` 字段与 Markdown `<!-- 备注: ... -->` 注释都会成为该页备注；HTML 放映按 `S` 键（或右下角「备注」按钮）呼出备注面板；PPTX 生成原生 `notesSlide` + `notesMaster` 部件，PowerPoint 演示者视图直接可用。
- **新增 `quote` 金句版式**：`>` 引用块自动识别，末行 `—— 出处` 识别为署名；HTML 与 PPTX 双端实现。
- **新增 `table` 表格版式**：Markdown 表格（`| ... |`）自动识别，PPTX 用原生 `a:tbl` 图形帧（主题色表头 + 隔行着色），限 9 行 8 列。
- 版式集合扩为 `cover | section | bullets | statement | quote | table | closing`；结构化 `slides` 增加 `rows` 字段。
- 无表格数据的 `table` 页自动退化为要点页，避免空白版式。
- 新特性测试 8 例（解析/规范化/HTML/PPTX 部件/端到端）。

## 0.2.1

- 修复 PPTX zip 中央目录 local header 偏移恒为 0 导致 PowerPoint 提示修复的问题（issue #1/#3，社区 PR #2 同修法）。

## 0.2.0

- 新增 `defaultTheme` / `defaultLang` 配置，作为 `ppt_create` 未显式传参时的默认值。
- 配置校验：`defaultLang` 仅接受 `zh` / `en` / `bilingual`。
- 更新测试覆盖与双语文档。

## 0.1.0

- 首发：`dsh-ppt` 技能 + 工具插件。
- `ppt_create`：Markdown / 结构化 slides → HTML 网页放映 + PPTX 导出 + manifest。
- `ppt_themes`：5 套内置视觉主题（Swiss Pulse / Velvet Standard / Data Drift / Soft Signal / Maximalist Type）。
- 中英双语界面（zh / en / bilingual）。
- 裸 SKILL.md + `build-deck.mjs` CLI，跨 Claude Code / Cursor / Gemini CLI / Codex / DSH。
- 零运行时依赖：OOXML 与 zip 由 `node:zlib` 手写生成。

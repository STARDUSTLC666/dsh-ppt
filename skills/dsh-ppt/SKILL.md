---
name: dsh-ppt
description: "Turn one sentence or a Markdown document into a complete, presentation-ready deck: a standalone HTML web slideshow plus an editable PPTX export, with 5 built-in visual themes (Swiss Pulse / Velvet Standard / Data Drift / Soft Signal / Maximalist Type), slide transitions + bullet entrance animations (motion, on by default), and bilingual Chinese/English support. Use when the user asks for a PPT, slides, deck, keynote, 演示文稿, 幻灯片, 汇报, 提案, 路演, 培训材料, or wants to turn a document into a presentation. 中文：把一句话或一篇文档变成完整演示文稿（HTML 网页放映 + PPTX 导出），内置 5 套视觉主题、页间转场与要点入场动画，中英双语。"
compatibility: "DSH plugin runs in-process with zero runtime dependencies. The standalone CLI needs Node.js >= 20. Cross-harness: copy this skill directory into any Agent Skills directory."
allowed-tools: "Bash, Read, Write, Edit"
---

# dsh-ppt

一句话或一篇文档 → 完整演示文稿：**独立 HTML 网页放映 + 可编辑 PPTX**。本文件只做路由与纪律；具体规则按需读取 `references/`。

## 触发条件

用户要做 PPT / 幻灯片 / 演示文稿 / deck / 汇报 / 提案 / 路演 / 培训材料，或给一句话、一段文字、一篇 Markdown 想变成可放映的演示。

## 执行纪律（每次都要遵守）

- 一页一个观点；标题是判断句，不是名词短语。
- 内容语言由你撰写；`lang` 只决定界面文字。
- 先选主题再构建；不确定就用默认 `data`。
- 交付前逐项过一遍文末「质量门禁」。

## 核心流水线

1. **Probe 需求**：读入用户的句子/文档，确定听众、目标、语气。一句话输入不要反问，直接按发布场景推断。
2. **Outline 大纲**：产出 5–12 页大纲（封面 → 问题/背景 → 方案/论点 3–6 页 → 证据 → 行动号召 → 结束页）。
   → 写大纲与正文前先读 `references/copywriting.md`。
3. **Theme 主题**：调 `ppt_themes`（DSH）或 `node scripts/build-deck.mjs --list-themes`（跨 harness）。
   → 拿不准选哪套时读 `references/themes.md` 的情绪决策树。
4. **Build 生成**：
   - DSH 内：调 `ppt_create`，大纲写成 Markdown 传 `content`（推荐），或传结构化 `slides`。
   - 跨 harness：`node <skill-dir>/scripts/build-deck.mjs --title "标题" --content deck.md --theme data --lang zh --out dist`。
   - 动效默认开（页间转场 + 要点逐条入场）；严肃/打印场景传 `motion: 'off'`。
   → 用表格 / 金句 / 备注 / 结构化 slides 前读 `references/syntax.md`。
5. **Verify 校验**：确认 HTML 页数与大纲一致、标题无截断、PPTX 文件头为 `PK`。
6. **Deliver 交付**：给用户三个绝对路径，说明 HTML 直接放映（← → 翻页 · F 全屏 · G 总览 · S 备注 · P 打印），PPTX 用 PowerPoint / WPS / Keynote 打开（备注在演示者视图可见，bullets 页放映时逐条点击出现）。

## 按需装载索引

| 何时读 | 文件 | 内容 |
| --- | --- | --- |
| 写大纲 / 正文前 | `references/copywriting.md` | 叙事骨架、单页规则、双语规则 |
| 选主题拿不准 | `references/themes.md` | 5 套主题色板 + 情绪决策树 |
| 用表格/金句/备注/结构化 slides | `references/syntax.md` | Markdown 解析、进阶语法、slides JSON、motion 开关 |
| 交付异常 | `references/troubleshooting.md` | 症状 → 处理对照表 |

## 质量门禁（交付前逐项确认）

- [ ] 页数 3–60，首屏是封面，末屏是结束页。
- [ ] 每页有明确标题；bullets 页 1–8 条，中文每条 ≤ 20 字、英文 ≤ 12 词。
- [ ] HTML 与 PPTX 使用同一主题，配色一致。
- [ ] 主题色对比度足够（深底浅字或浅底深字）。
- [ ] 中文内容无错别字；英文标题用 Title Case。
- [ ] 最后一页有可执行的行动号召，不只是「谢谢」。
- [ ] 文件已写到用户工作区，路径为绝对路径。

## 跨 harness 安装

把整个 `dsh-ppt` 技能目录复制到目标 agent 的技能目录即可（只依赖 Node 20+）：

| Agent | 技能目录 |
| --- | --- |
| DeepSeek Harness | `dsh plugin --profile web add dsh-ppt` |
| Claude Code | `~/.claude/skills/` |
| Cursor | `.cursor/skills/` |
| Gemini CLI | `~/.gemini/skills/` |
| OpenAI Codex | `~/.codex/skills/` |

一次编写，处处可用。

---
name: dsh-ppt
description: "Turn one sentence or a Markdown document into a complete, presentation-ready deck: a standalone HTML web slideshow plus an editable PPTX export, with 5 built-in visual themes (Swiss Pulse / Velvet Standard / Data Drift / Soft Signal / Maximalist Type) and bilingual Chinese/English support. Use when the user asks for a PPT, slides, deck, keynote, 演示文稿, 幻灯片, 汇报, 提案, 路演, 培训材料, or wants to turn a document into a presentation. 中文：把一句话或一篇文档变成完整演示文稿（HTML 网页放映 + PPTX 导出），内置 5 套视觉主题，中英双语。"
compatibility: "DSH plugin runs in-process with zero runtime dependencies. The standalone CLI needs Node.js >= 20. Cross-harness: copy this skill directory into any Agent Skills directory."
allowed-tools: "Bash, Read, Write, Edit"
---

# dsh-ppt

一句话或一篇文档 → 完整演示文稿：**独立 HTML 网页放映 + 可编辑 PPTX**。这是从内容到成品的完整 SOP；DSH 内安装插件后调用 `ppt_create` / `ppt_themes` 工具，其他 harness 复制本目录并运行 `scripts/build-deck.mjs`。

## 触发条件

- 用户要求做 PPT、幻灯片、演示文稿、deck、keynote、汇报、提案、路演、培训材料。
- 用户给了一句话、一段文字或一篇 Markdown 文档，希望变成可放映/可分享的演示。
- 用户提到导出 PPTX 或网页版幻灯片。

## 核心流水线（每次执行）

1. **Probe 需求**：读入用户的句子/文档。确定听众、目标（说服/汇报/教学/发布）、语气与情绪基调。一句话输入不要反问，直接按发布场景推断并产出完整内容。
2. **Outline 大纲**：产出 5–12 页大纲。每页只讲一个观点；页型组合固定为：封面 → 问题/背景 → 方案/论点（3–6 页）→ 证据/案例 → 行动号召 → 结束页。每页要点不超过 6 条，每条不超过 20 字（中文）或 12 词（英文）。
3. **Theme 主题**：调用 `ppt_themes`（DSH）或 `node scripts/build-deck.mjs --list-themes`（跨 harness）选择视觉主题。情绪 → 主题映射见 `references/themes.md`；默认 `data`（技术/AI），高管汇报用 `velvet`，数据报表用 `swiss`，温暖叙事用 `soft`，大声量发布用 `bold`。
4. **Build 生成**：
   - DSH 内：调用 `ppt_create`，把大纲写成 Markdown 传 `content`（推荐），或直接传结构化 `slides`。
   - 跨 harness：`node <skill-dir>/scripts/build-deck.mjs --title "标题" --content deck.md --theme data --lang zh --out dist`
   - 输出三件套：`*.html`（双击即放映）、`*.pptx`（可编辑）、`*.json`（manifest）。
5. **Verify 校验**：确认 HTML 页数与大纲一致、标题/要点无截断；PPTX 文件头为 `PK`（zip）。DSH 内用文件工具读取确认；跨 harness 用 `unzip -l deck.pptx | grep presentation.xml` 或 PowerShell `Expand-Archive` 抽查。
6. **Deliver 交付**：给用户三个绝对路径，并说明：HTML 浏览器直接打开（方向键翻页、F 全屏、G 总览、S 演讲者备注、P 打印/另存 PDF）；PPTX 用 PowerPoint / WPS / Keynote 打开（备注在演示者视图可见）。

## 内容写作规则

- 一句话输入也要「完整」：封面 = 标题 + 那句话；核心观点页 = 原句放大；结束页 = 谢谢/行动号召。若用户要求更丰富，先自行扩写成 6–10 页大纲再构建。
- 一页一个观点；标题是判断句，不是名词短语。
- 正文用短句；先结论后理由；数字和对比比形容词更有说服力。
- 中英双语：`lang` 只决定界面文字（页码/主题标签/结束页），**内容语言由你撰写**。要求双语时，优先每页中文标题 + 英文副标题，或直接生成两份 deck（`--lang zh` 与 `--lang en`）。
- 更多规则见 `references/copywriting.md`。

## Markdown 进阶语法（自动识别）

- **表格**：`| 列 | 列 |` 连续行（第二行 `| --- | --- |` 分隔线）→ 独立 `table` 页（主题色表头，限 9 行 8 列）。数据对比优先用表格，别堆要点。
- **金句**：`>` 引用块 → 独立 `quote` 页；最后一行写 `—— 出处` 会成为署名。
- **演讲者备注**：`<!-- 备注: 这页要讲的内容 -->`（或 `<!-- note: ... -->`）附着到该页。备注不进正文：HTML 放映按 `S` 呼出备注面板，PPTX 写入原生备注（演示者视图可见）。为汇报/演讲类 deck 主动写备注（口径、数据出处、应答预案）。

## 主题选择

内置 5 套主题（源自 hyperframes 视觉风格库）：

| 主题 ID | 名称 | 情绪 | 适用 |
| --- | --- | --- | --- |
| `data` | 数据漂移 | 未来/沉浸 | AI、技术发布、研究（默认） |
| `swiss` | 瑞士脉冲 | 精准/理性 | 数据、SaaS、开发者工具 |
| `velvet` | 天鹅绒标准 | 高级/克制 | 高管汇报、品牌、融资路演 |
| `soft` | 柔和信号 | 温暖/人本 | 品牌故事、培训、个人分享 |
| `bold` | 极繁大字 | 大声/动能 | 产品发布、活动、大事件 |

完整色板与反模式见 `references/themes.md`。

## 视觉引擎复用（hyperframes）

如果 `hyperframes` 技能已安装，生成前先读它的 `visual-styles.md` / `house-style.md` 作为视觉判断依据；本技能的 5 套主题就是把其中 Swiss Pulse / Velvet Standard / Data Drift / Soft Signal / Maximalist Type 五套风格落成确定性 HTML+PPTX 实现。需要高级动画视频版时，才转用 hyperframes；普通演示不要上视频引擎。

## 结构化 slides（高级用法）

`ppt_create` 的 `slides` 与 CLI `--slides` 接受 JSON 数组：

```json
[
  { "layout": "cover", "title": "标题", "subtitle": "副标题", "kicker": "开场", "notes": "开场先自我介绍 30 秒" },
  { "layout": "section", "kicker": "01", "title": "背景" },
  { "layout": "bullets", "title": "三个论点", "bullets": ["论点一", "论点二", "论点三"] },
  { "layout": "table", "title": "业绩对比", "rows": [["大区", "营收"], ["华东", "1.2 亿"]], "notes": "强调华东增速" },
  { "layout": "quote", "title": "慢就是快。", "subtitle": "创始人" },
  { "layout": "statement", "title": "核心观点一句话", "subtitle": "支撑说明" },
  { "layout": "closing", "title": "谢谢", "subtitle": "行动号召" }
]
```

`layout` 仅限 `cover | section | bullets | statement | quote | table | closing`；每页可选 `notes`（演讲者备注），`table` 页用 `rows`（首行为表头）。Markdown 输入不够精确时，用结构化 slides 重写。

## 质量门禁（交付前逐项确认）

- [ ] 页数 3–60，首屏是封面，末屏是结束页。
- [ ] 每页有明确标题；bullets 页 1–8 条。
- [ ] HTML 与 PPTX 使用同一主题，配色一致。
- [ ] 主题色对比度足够（深底浅字或浅底深字）。
- [ ] 中文内容无错别字；英文标题用 Title Case。
- [ ] 文件已写到用户工作区，路径为绝对路径。

## 故障排查

| 症状 | 处理 |
| --- | --- |
| `ppt_create` 不存在 | 本插件未安装；用 `node <skill-dir>/scripts/build-deck.mjs` 裸 CLI 生成同样三件套 |
| 未知主题 | `ppt_themes` 或 `--list-themes` 看可用 ID；不要猜 |
| 内容超过 60 页 | 合并论点，或拆成多个 deck；`maxSlides` 默认 60 |
| PPTX 打不开 | 确认文件完整（zip 头 `PK`）；Office 首次打开空白版式属正常，编辑视图可用 |
| 双语界面 | `lang: bilingual` 只双语化界面；内容双语由 agent 在写作阶段完成 |

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

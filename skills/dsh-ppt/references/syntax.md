# dsh-ppt 输入语法参考（Markdown / 结构化 slides / 动效）

只在需要查具体语法时读本文件；常规流程在 SKILL.md。

## Markdown 解析规则

`ppt_create` 与 `build-deck.mjs` 按以下规则解析 Markdown：

- 第一个 `# 标题` 会成为封面标题；其后的段落/列表成为封面副标题来源。
- 每个 `## 小节`（或更深标题）生成一页：
  - 有 `- ` / `* ` / `1.` 列表 → `bullets` 页；
  - 无列表且无正文 → `section` 过渡页；
  - 有正文段落 → 正文拆句后作为 bullets。
- 没有标题的纯文本：第一段第一句为封面副标题，后续段落按 5 句一组拆成要点页。
- 只有一句话：自动生成「封面 → 核心观点 → 结束页」三页。
- 需要更精细控制时使用结构化 `slides` JSON，不要和 Markdown 混用。

## 进阶语法（自动识别）

- **表格**：`| 列 | 列 |` 连续行（第二行 `| --- | --- |` 分隔线）→ 独立 `table` 页（主题色表头，限 9 行 8 列）。数据对比优先用表格，别堆要点。
- **金句**：`>` 引用块 → 独立 `quote` 页；最后一行写 `—— 出处` 会成为署名。
- **演讲者备注**：`<!-- 备注: 这页要讲的内容 -->`（或 `<!-- note: ... -->`）附着到该页。备注不进正文：HTML 放映按 `S` 呼出备注面板，PPTX 写入原生备注（演示者视图可见）。为汇报/演讲类 deck 主动写备注（口径、数据出处、应答预案）。

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

## 动效（motion）

默认 `motion: on`：HTML 放映有页间淡入与要点逐条入场；PPTX 每页原生淡入转场，`bullets` 页的要点按「点击一次出现一条」放映。交付严肃/打印场景或用户明确要静态时传 `motion: 'off'`（CLI `--motion off`），产物不含任何动画代码。

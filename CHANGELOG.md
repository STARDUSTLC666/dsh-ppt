# Changelog

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

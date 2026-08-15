# Changelog

## 0.1.0

- 首发：`dsh-ppt` 技能 + 工具插件。
- `ppt_create`：Markdown / 结构化 slides → HTML 网页放映 + PPTX 导出 + manifest。
- `ppt_themes`：5 套内置视觉主题（Swiss Pulse / Velvet Standard / Data Drift / Soft Signal / Maximalist Type）。
- 中英双语界面（zh / en / bilingual）。
- 裸 SKILL.md + `build-deck.mjs` CLI，跨 Claude Code / Cursor / Gemini CLI / Codex / DSH。
- 零运行时依赖：OOXML 与 zip 由 `node:zlib` 手写生成。

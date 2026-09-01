# dsh-ppt 故障排查

只在交付异常时读本文件。

| 症状 | 处理 |
| --- | --- |
| `ppt_create` 不存在 | 本插件未安装；用 `node <skill-dir>/scripts/build-deck.mjs` 裸 CLI 生成同样三件套 |
| 未知主题 | `ppt_themes` 或 `--list-themes` 看可用 ID；不要猜 |
| 内容超过 60 页 | 合并论点，或拆成多个 deck；`maxSlides` 默认 60 |
| PPTX 打不开 | 确认文件完整（zip 头 `PK`）；Office 首次打开空白版式属正常，编辑视图可用 |
| 双语界面 | `lang: bilingual` 只双语化界面；内容双语由 agent 在写作阶段完成 |
| 放映没有动画 | `motion` 被设为 `off`；默认 `on` 时 HTML 有转场、PPTX 要点逐条点击出现 |
| HTML 打印要点缺失 | 打印样式已强制显示全部要点；若仍缺失检查浏览器是否屏蔽了动画样式 |

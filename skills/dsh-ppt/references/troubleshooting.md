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
| 图片、图表或品牌导出缺少依赖 | 插件重新安装；独立技能目录运行 npm install --ignore-scripts 安装 Office Kit 0.21.0 |
| ppt_render 返回 unavailable | 在插件项目或技能目录安装可选官方 Kit 0.1.3；Windows检查相应VC++v14运行库 |
| 收据 not-verified | 源PPTX或输出发生变化、缺失、版本不同；用当前PPTX重新渲染，不沿用旧结论 |
| 修订号冲突 | 重新用ppt_check读取当前工程，再按新revision编辑 |
| 模板还有待填写 | 补充实际事实/依据/行动；按草稿说明，不作为成品交付 |
| 渲染报告缺失字体 | 替换为环境和目标机器可用字体，重新生成并逐页检查；未解决需标注字体问题，不能声称已验收 |

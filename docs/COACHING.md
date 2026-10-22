# 可选 AI 预审与模拟答辩

常规流程仍是「提供材料 → 生成 HTML、可编辑 PPTX 和工程 → 预览与下载」。演练不是交付前置条件，也不会自动启动。

在「设置 → 演示文稿」打开工程，成品下载区下方有两个次级入口：

| 入口 | 适合做什么 | 调用上限 |
| --- | --- | --- |
| AI 预审 | AI 根据所给材料模拟质疑与回答，整理最多 5 条值得处理的问题 | 选择 1–3 轮，最多 3 次插件调用 |
| 模拟答辩 | AI 一次提一个问题，用户回答后获取反馈及下一题 | 选择 1–5 题，首次出题加每题反馈，最多 6 次插件调用 |

先选择 DSH 已配置的文字模型、听众、温和 / 普通 / 严格的提问强度，以及整个工程或当前页。需要时粘贴补充材料，或导入 TXT / Markdown（最多 20,000 字符，文件最多 100 KB）。开始按钮说明将发送哪些内容和最多调用几次；点击后才发起生成。可用时优先选中生成工程时的模型；旧工程需要自行核对模型。

只发送所选页面的文字、表格 / 图表数据、备注及主动提供的补充材料，不发送图片文件、密钥或工作区文件。模型调用不附带文件、终端等工具。请在开始前检查输入是否适合交给所选模型服务。供应商自身的重试和计费规则仍然适用，次数上限指插件主动发起的调用。

## 如何使用结果

- **表达建议**：查看对应页、材料原文和修改前后比较，自行勾选采纳。程序核对原文引用，并阻止缺少数字来源的表达改稿；这不证明内容真实，也不能保证 AI 保留了所有含义。
- **逻辑问题与证据缺口**：作为待办整理，不会由 AI 自动填入杜撰的实验、数据或引用。请补充真实材料后重跑。
- **模拟答辩**：输入你的回答，再提交下一步。难度只影响提问方式，不能预测真实评委或客户会如何提问。
- **备用问答页**：自行选中需要的问答，追加到新副本末尾。页面及备注标明来自演练、需要核对；不会默默扩充原稿。
- **下载问答与材料清单**：输出 Markdown，包含问题、回答、建议、来源、缺口及模型和调用次数，不导出全部补充材料。

采纳总是另存新副本，原 HTML / PPTX / JSON 的字节保持原样。在副本点击「撤销上次修改」，可一次撤回本次采纳和新增备用页。副本从工程 JSON 生成，不包含 Office 中的手动编辑。

## 取消、历史与恢复

点击「停止」会向模型发送取消信号，保留已完成的结果。被停止或失败的尝试仍占本次调用额度，也可能已产生费用；插件不会自动重试。模型生成最长等待 120 秒。答辩可以点击「结束并整理已有结果」，该操作不调用模型。

报告保存在当前 `DSH_HOME/plugins/dsh-ppt/rehearsals/`，绑定本机工程、稳定页面 ID 和修订内容。每个工程最多保留 20 次，本机共 200 次；到上限后请在历史中删除旧记录，不会自动删除。工程修改后旧报告仍保留，可重新打开最新工程后导出；不能继续旧演练或套用旧建议。丢失响应时可从历史重新打开记录。删除记录不会删除幻灯片成品。

未配置模型时显示配置引导，普通生成与下载照常可用。模型不输出有效 JSON、尝试调用工具、超出输出上限或被中断时，本次记录会暂停，已完成结果保留。历史文件损坏时不覆盖它，其他可读报告仍可访问。

## English

Finished files remain the primary output. AI review and rehearsal are optional and never start automatically.

Choose a configured DSH text model, audience, difficulty, scope and optional supporting material. Click Start to send selected slide text, table/chart data, notes and the supplied material; image files are excluded. No file or shell tools are offered to the model. No additional account is needed beyond the chosen DSH provider.

Review makes up to three plugin calls. Practice asks one question at a time and accepts human answers: one initial question plus feedback for up to five questions, at most six plugin calls. Provider retries and billing rules still apply. You can stop a call or finish early; stopping may still incur a charge, and failed attempts use the current budget. There is no automatic retry.

Compare source quotes and proposed edits before adopting them. Only eligible expression suggestions can directly change wording; logic and evidence gaps remain preparation tasks. Exact quote and numeric checks are limited safeguards, not factual certification. Save selected edits and Q&A backup slides to a new copy; the original artifacts remain intact and Undo restores the copy to its pre-adoption content. Copies are generated from JSON and do not import Office edits.

Export Q&A, feedback and the evidence checklist as Markdown. Local reports are bound to the source revision. Changed presentations require a new rehearsal; old reports remain readable and exportable after reopening the current project. Keep up to 20 reports per project and 200 total, then delete old reports explicitly. Deleting a report keeps the presentation files.

# 标杆范本库与槽位填空契约（Curated Exemplar Corpus & Weak-LLM Compensator）

本参考面向两类高频需求：
1. **将自由规划降维为「槽位填空（Slot-Filling）」**：直接按内置 **8 套满分标杆范本**（或工作区批量吸收的优质 `.pptx` 范本）逐页填空，让任意能力层级的模型稳定产出麦肯锡 / 红杉 / Stripe / Nature 级排版。
2. **向工作区投喂外部优质 PPT 语料**：把本地或开源社区收集的高颜值 `.pptx` 目录批量吸收为持久化范本库（`.dsh-ppt/exemplars.json` + `.dsh-ppt/taste-recipes.json`），零额外运行时依赖、100% 离线提取且自动过滤隐藏说明页。

---

## 1. 内置 8 套标杆范本速查表

| Exemplar ID | 场景名称 | 继承主题 | 继承品味配方 | 骨架 | 页数与版式节奏 |
| --- | --- | --- | --- | --- | --- |
| `mckinsey-strategy` | 麦肯锡战略诊断与破局报告 | `consulting` | `mckinsey-partner` | `consulting-classic` | 10 页：architectural 封面 → exec-summary → spotlight KPI → agenda → Marimekko → 魔力象限 → agenda → 哑铃跃迁 → 甘特图 → cta-cards |
| `sequoia-pitch` | 红杉 / YC 创投融资路演 BP | `venture-daylight` | `apple-keynote-light` | `keynote-spatial` | 10 页：keynote-glow 封面 → 金句宣言 → 痛点对比 → browser 原型 → spotlight KPI → TAM 同心圆 → 魔力象限 → 桑基盈利流 → 团队图谱 → cta-cards |
| `stripe-product-launch` | Stripe / Apple 科技产品与开发者发布 | `stripe-craft` | `linear-craft` | `saas-bento` | 10 页：grid 光晕封面 → 无框大数字 → bento-hero → browser 原型 → mobile 原型 → 语法高亮代码 → 6 维雷达图 → 哑铃提速 → 甘特图 → cta-cards |
| `quarterly-exec-review` | 季度经营复盘与董事会汇报 | `financial-ft` | `ft-data-journal` | `editorial-folio` | 9 页：editorial-grid 封面 → spotlight KPI → 区域热力图 → 瀑布利润桥 → 桑基资金流 → 价值链箭头 → 痛点对策 → 甘特图 → cta-cards |
| `tech-arch-rfc` | 核心技术架构评审与系统重构 RFC | `stripe-craft` | `linear-craft` | `saas-bento` | 9 页：grid 光晕封面 → 新旧对比 → 分层拓扑 → Mermaid 流程图 → Mermaid 时序图 → 语法高亮代码 → 6 维权衡雷达 → 灰度甘特 → 准出清单 |
| `academic-defense` | Nature / 顶会学术答辩与实验报告 | `academic` | `nature-academic` | `academic-minimal` | 9 页：editorial-grid 封面 → 动机与贡献 → 原生公式定理框 → 方法流程图 → booktabs 三线表 → 消融哑铃图 → 泛化热力图 → 边界对比 → 总结致谢 |
| `enterprise-proposal` | 政企大客户解决方案与竞标提案 | `bcg-emerald` | `mckinsey-partner` | `consulting-classic` | 9 页：architectural 封面 → 价值摘要 → 痛点对策 → 私有化部署架构 → 哈维球盲测 → ROI 指标 → 12 周甘特 → SLA 团队 → POC 行动卡 |
| `gov-institutional` | 现代东方政务述职与年度工作报告 | `exec-jilan` | `oriental-zen` | `gov-ceremonial` | 8 页：inverted 封面 → spotlight KPI → 重点成果卡片 → 区域热力图 → 阶段推进时间轴 → 问题与整改 → 下阶段部署甘特 → 结语 |

---

## 2. 弱/中等模型标准两步出稿法（推荐）

### Step 1：拉取目标范本的逐页槽位契约

```json
// Agent 工具调用：
ppt_templates({ "exemplarId": "mckinsey-strategy", "lang": "zh" })
```

或 CLI 查看全部范本：

```bash
node skills/dsh-ppt/scripts/build-deck.mjs --list-exemplars
```

### Step 2：按槽位填空并传 `exemplar` 生成

```json
// Agent 工具调用（传结构化 slides 或粗纲 Markdown 均可）：
ppt_create({
  "title": "2026 华东区企业级增长破局战略",
  "exemplar": "mckinsey-strategy",
  "content": "# 2026 华东区企业级增长破局战略\n..."
})
```

或 CLI：

```bash
node skills/dsh-ppt/scripts/build-deck.mjs \
  --title "2026 华东区企业级增长破局战略" \
  --exemplar mckinsey-strategy \
  --content @notes.md \
  --out dist
```

---

## 3. 批量向工作区投喂外部优质 `.pptx`（如开源 GitHub / 企业模板）

把你收集的优质 `.pptx`（例如 MIT / CC0 开源模板或公司设计部标准模板）放入任意本地目录，一条命令或工具调用即可批量扫描、过滤隐藏说明页、提取色板/双字体/母版骨架/逐页版式序列，自动持久化至 `.dsh-ppt/exemplars.json` 与 `.dsh-ppt/taste-recipes.json`：

### Agent 工具（`ppt_absorb`）

```json
// 批量吸收整个文件夹（最多 40 份）
ppt_absorb({ "corpusDir": "./my-reference-decks", "limit": 20 })

// 或单份深度吸收并保存为可复用范本
ppt_absorb({
  "pptxPath": "./company-q4-master.pptx",
  "saveTasteAs": "corp-master",
  "saveExemplarAs": "corp-q4",
  "exemplarName": "公司 Q4 经营汇报标杆"
})
```

### CLI 命令

```bash
# 批量吸收目录
node skills/dsh-ppt/scripts/build-deck.mjs --ingest-exemplars ./my-reference-decks

# 单份吸收并存为范本
node skills/dsh-ppt/scripts/build-deck.mjs --absorb ./company-q4-master.pptx --save-exemplar corp-q4

# 立即使用刚吸收的范本生成新文稿
node skills/dsh-ppt/scripts/build-deck.mjs --title "2026 Q1 汇报" --exemplar corp-q4 --content @notes.md --out dist
```

---

## 4. 确定性防退化升维器（Weak-LLM Compensator，`autoUpgrade`）

即使模型输出了粗糙的连续 `bullets` 文字墙或平庸标题，只要未显式设置 `autoUpgrade: false`（或 CLI `--no-auto-upgrade`），引擎会在落盘前以 **0 额外模型调用、100% 文本无损** 确定性执行四重修复：

1. **高阶视觉语义自动升维**：
   - 含代码块/函数声明 → 自动升格 `code[split]` 语法高亮代码页；
   - 含多组「旧值 → 新值 / 改造前→后」数值跃迁 → 自动升格 `dumbbell` 哑铃图；
   - 含 4–6 维评分（如「性能 94 vs 行业 70」）→ 自动升格 `radar` 多维雷达图；
   - 含坐标/象限分布信号 → 自动升格 `quadrant` 魔力象限；
   - 含区域/季度纯数值矩阵表 → 自动升格 `heatmap` 热力图；
   - 含 URL / Web / App 界面特性 → 自动升格 `mockup[browser|mobile]` 设备原型；
   - 含 3+ 核心指标大数字 → 自动升格 `kpi[spotlight]` 聚光灯指标卡。
2. **范本槽位节奏投影**：传 `exemplar` 时，把兼容的普通 `bullets` 页按标杆范本对应页序投影为 `cards[exec-summary/bento-hero]`、`comparison[issue-action]`、`process[steps/chevron]`、`closing[cta-cards]`，继承封面/章节变体。
3. **防文字墙与防单调连页**：
   - 单页 `>6` 条 bullets 自动拆分为两页（`（续）` / `(Cont.)`），杜绝挤压溢出；
   - 连续 `>=2` 页 `bullets` 自动打断为 `cards` / `comparison` / `process`；
   - 无加粗引导词的长要点自动切分加粗 `**主语**：说明`，提升扫视效率。
4. **反 AI 土味标题与结尾兜底（`SLOP-01 / 02 / 09`）**：
   - 「项目背景 / 核心指标 / 竞品分析 / 性能提升 / 总结」等空洞标签自动结合正文首条核心结论提炼为 Action Title；
   - 自动补齐有意义的章节面包屑 `kicker`；
   - 仅写「谢谢 / Thank you」的裸结尾自动补齐可执行行动副标题与下一步指引。

# dsh-ppt 大师级幻灯片叙事与写作规范（金字塔原理 · 六大画像 · 双语）

用户把材料交给你时，指望你不仅做排版，更要把零散素材提炼成**逻辑严密、结论先行、视觉张弛有度**的演示叙事。动笔组织大纲与单页文案前，必须遵守本规范。

---

## 一、铁律一：结论先行标题（Action Titles · 断言-证据模型）

**普通 PPT 与麦肯锡 / Nature 级 PPT 最大的分水岭就在标题。**
除 `cover`（封面）、`agenda`（目录）和 `section`（章节过渡页）外，**每一张内容页、卡片页、表格页和图表页的 `title` 都必须是完整的结论判断句（主谓宾齐全，优先带核心量化结果或因果驱动力），绝不能写空洞的名词分类标签！**

| 劣质名词标签（严禁 ❌） | 大师级 Action Title（必须 ✅） |
| --- | --- |
| 项目背景 / 痛点分析 | 工程师每周耗费 6 小时同步开会，且 80% 决策缺乏书面留痕 |
| 周末到馆人次 | 周末到馆人次四周内翻倍，第 4 周达 78 人次峰值 |
| 核心技术架构 | 三层解耦推理管线将首包延迟压至 140ms，吞吐提升 3.2 倍 |
| 实验结果与消融对比 | 本方法在三项基准全面超越 SOTA，边界约束贡献 +4.8% 增益 |
| 存在不足与下一步计划 | 针对跨部门协同滞后短板，Q3 将上线统一台账实现闭环督办 |

- **字数与行数控制**：中文标题 **14–32 字**（英文 **8–16 词**），严格控制在 **1–2 行内**；绝不把整段正文塞进标题。
- **页眉面包屑（`kicker`）与底栏结论条（`takeaway`）配合**：
  - `kicker` 写所属章节或维度（如 `01 · 市场诊断`、`实验验证 · SOTA 对比`），**严禁全篇偷懒写「要点 / Point」**。
  - 复杂图表页、矩阵页或对比页底部可加一行 `takeaway`（如 `核心启示：华东政企客群贡献了 68% 的净增毛利，应优先倾斜交付资源`），让听众 5 秒抓到决策抓手。

---

## 二、铁律二：六大用户画像叙事骨架与版式编排

根据用户材料自动套用对应画像的叙事脊梁（亦可调 `ppt_templates` 查看 16 套行业结构蓝图，含 `consulting | gov-report | defense | pitch | keynote | workshop | weekly | project | architecture-review | financial-earnings | medical-case | postmortem | marketing-campaign | promotion-review | legal-compliance | creative-lookbook`）：

### 1. 商业战略与管理咨询（`consulting` · 推荐主题 `consulting` / `cobalt-cream`）
- **叙事骨架（SCQA + 金字塔原理）**：封面 → 执行摘要（`cards[exec-summary]`：顶部总论断 + 下方三大 MECE 支柱） → 现状与核心矛盾（`comparison` 或 `chart-split`） → 战略支柱拆解（`matrix[2x2]`、`chart[waterfall]` 利润/增长拆解桥、`cards[pillars]`） → 财务测算与风险控制（`table[consulting]`） → 实施路线图与行动要求（`process[timeline]` + `closing[cta-cards]`）。
- **写作调性**：克制、量化、因果清晰；数据页左下角务必注明 `source`（如 `数据来源：销售台账 2026Q1–Q3（脱敏）`；仅填真实来源，严禁编造机构署名）。

### 2. 政企汇报、年度总结与党建述职（`gov-exec` · 推荐主题 `exec-jilan` / `exec-palace`）
- **叙事骨架**：庄重封面 → 年度目录（`agenda`） → 数说总体成效（`kpi[grid]`：3–4 项核心指标完成率与同比增幅） → 重点工作推进（`cards[pillars]` 四梁八柱 / 三大攻坚工程） → 典型亮点与专项突破（`chart-split` 或 `image-right`） → 问题剖析与整改举措（`comparison[issue-action]`：**左列短板痛点 ──▶ 右列整改实招，一一对应**） → 下一阶段工作部署（`process[steps]` + `closing`）。
- **写作调性**：对仗工整、数据扎实、举措可核查；动效建议设为 `motion: 'off'` 或稳重淡入。

### 3. 学术科研、论文汇报与毕业答辩（`academic` · 推荐主题 `academic`）
- **叙事骨架（Assertion-Evidence）**：学术封面（含论文题目、作者/导师/单位信息） → 研究背景与现有方法局限（`comparison[versus]`） → 本文核心贡献（`cards[numbered]`，严格 ≤ 3 条） → 方法总体框架与推导（`process[steps]` 管线 + `callout[formula]` 核心公式/定理定义） → 主实验对比（`table` 设 `tableStyle: 'booktabs'` **无竖线学术三线表**，最优指标用 `**加粗**` 标出） → 消融实验与案例可视化（`chart-split` / `image[gallery]`） → 结论与未来展望（`callout[takeaways]` + `closing`）。
- **写作调性**：严谨客观，保留材料中的真实误差范围（如 `82.1 ± 0.3`）与文献引用标记（`[1] Author et al., 2025`），绝不捏造 baseline 数值。

### 4. 科技产品发布与融资路演（`tech-pitch` · 推荐主题 `linear-dark` / `cobalt-cream`）
- **叙事骨架（Sequoia Pitch Arc）**：高张力价值封面 → 行业剧变与真实痛点（`statement` + `kpi`） → 产品亮相与核心交互（`image-left` 边框样机 / `cards[bento]` 非对称特性网格） → 技术壁垒与架构分层（`process[layers]`） → 商业化增长牵引力 Traction（`chart` 设 `highlight: 'last'`） → 竞品差异化矩阵（`matrix[2x2]` 或 `table`） → 里程碑路线图与合作/融资诉求（`process[timeline]` + `closing[cta-cards]`）。

### 5. 教育培训、知识科普与课程讲义（`education` · 推荐主题 `course-sage` / `soft`）
- **叙事骨架（Mayer 多媒体认知原则）**：课程封面 → 本节学习目标（`agenda[cards]`） → 核心概念引入与定义（`callout[definition]`） → 分步拆解演练（`process[steps]`，每步不超过 1 个新概念） → 正误做法对照（`comparison[do-dont]`：左列 ✓ 推荐做法 vs 右列 ✗ 常见误区） → 课堂小结与课后行动清单（`callout[takeaways]` + `closing`）。

### 6. 人文创意、品牌提案与杂志风视觉（`editorial` · 推荐主题 `editorial-forest` / `cartesian`）
- **叙事骨架**：杂志扉页封面（`cover[editorial]`） → 时代情绪洞察（`statement[editorial-asymmetric]` 大留白宣言） → 受众人物画像与核心主张（`quote` 金句页 + `cards[bento]`） → 视觉大片与触点呈现（`image-right[split-bleed]` 半屏无边距出血大图 + `image[gallery]` 画册联排） → 传播节奏与合作落地（`process[timeline]` + `closing`）。

---

## 三、铁律三：版式节奏状态机与字数预算（拒绝文字墙）

### 1. 节奏交替硬规则（Pacing Engine）
- **禁止连续单调**：同一具体 `layout` 不得连续出现 2 次（长表格自动续页除外）；普通 `bullets` 版式全篇占比应 `< 25%`，**绝不允许连续出现超过 2 页 `bullets`**。
- **视觉呼吸交替**：高密度页（`table`、`matrix`、4 卡 `bento`、`chart-split`）之后，优先衔接中低密度视觉锚点页（`kpi`、`section`、`statement`、`quote`、`image-left/right`、`process`）。
- **一句话极简输入**：仅有一句话时，保持「`cover` 封面 → `statement` 核心观点宣言 → `closing` 行动号召」精炼 3 页闭环，不强行注水凑页数。

### 2. 结构化引导词与各版式字数上限
列表与卡片正文统一采用 **`**加粗短引导词**：具体事实说明`** 格式（如 `- **首响提速 93%**：AI 预分流将平均等待从 120 秒压至 8 秒`），引擎会在 HTML 与 PPTX 中自动渲染为「主色粗体引导词 + 次级色正文」双层级：

| 元素 / 版式槽位 | 中文预算上限 | 英文预算上限 | 超限处理原则 |
| --- | --- | --- | --- |
| `cover.title`（封面主标题） | ≤ 18 字/行，最多 2 行 | ≤ 10 词/行，最多 2 行 | 提炼主标题，修饰语移入 `subtitle` |
| `slide.title`（Action Title） | 14–32 字（≤ 2 行） | 8–16 词（≤ 2 行） | 删去铺垫套话，直接保留核心判断 |
| `bullets`（单页要点列表） | 3–5 条，每条 ≤ 24 字 | 3–5 条，每条 ≤ 14 词 | > 5 条拆成两页或升格为 `cards` / `process` |
| `kpi`（大数字指标卡，2–4 张） | `value` ≤ 8 字符；说明 ≤ 22 字 | `value` ≤ 8 chars；说明 ≤ 14 词 | 单位拆入 `unit`，同比拆入 `delta`（如 `+34% YoY`） |
| `cards` / `matrix`（卡片与象限） | 标题 ≤ 10 字；正文 ≤ 40 字 | 标题 ≤ 6 词；正文 ≤ 24 词 | 提炼关键词短句，严禁在卡片里塞长自然段 |
| `table`（对比表格） | 每页 ≤ 8 行数据、≤ 6 列最佳（硬上限 8 列、60 字符/格） | 同左 | 数值列带明确单位，> 8 行由引擎自动续页并重复表头 |

---

## 四、反空话黑名单与中英双语规范

1. **禁用互联网黑话与公文废话**：删掉无信息量的「赋能、抓手、闭环、颗粒度、组合拳、生态化反、全方位多维度」，全部替换为**可观测的动作、对象与变化量**（例如把「全方位赋能客服闭环」改为「覆盖售前询价与售后退换 2 大链路，人工转接率下降 41%」）。
2. **双语写作规则**：
   - 插件 `lang: 'zh' | 'en' | 'bilingual'` 只决定界面控件与页码标签语言，**幻灯片内容语言完全由你撰写**。
   - **单页双语推荐结构**：中文 Action Title + 精炼英文 `kicker` 或 `subtitle`；专业术语首次出现采用「中文全称（English Acronym）」，如「检索增强生成（RAG）」。
   - **纯英文文稿规则**：标题采用 Sentence case（现代科技/学术，如 * Edge caching cuts p99 latency by 62%*）或规范 Title Case（正式商业封面），切忌生硬逐字机翻。

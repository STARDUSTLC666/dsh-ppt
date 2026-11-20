# 标杆范本库与槽位填空契约（Curated Exemplar Corpus & Weak-LLM Compensator）

本参考面向两类高频需求：
1. **将自由规划降维为「槽位填空（Slot-Filling）」**：直接按内置 **20 套满分标杆范本**（或工作区批量吸收的优质 `.pptx` 范本）逐页填空，让任意能力层级的模型稳定产出麦肯锡 / 红杉 / Stripe / 投行研报 / 临床医学级排版。
2. **向工作区投喂外部优质 PPT 语料**：把本地或开源社区收集的高颜值 `.pptx` 目录批量吸收为持久化范本库（`.dsh-ppt/exemplars.json` + `.dsh-ppt/taste-recipes.json`），零额外运行时依赖、100% 离线提取且自动过滤隐藏说明页。

---

## 1. 内置 20 套标杆范本速查表（8 套核心场景 + 12 套 GitHub 开源优质 `.pptx` 蒸馏）

> 支持传入 `exemplar: "auto"` 自动根据标题与正文字面语义路由到最佳标杆范本；调 `ppt_templates({ exemplarId })` 同步返回逐页槽位契约、满分标题示范与 **Few-Shot JSON 填空样板**。

### A. 8 套核心场景标杆

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

### B. 12 套 GitHub 开源优质 `.pptx` 实机甄选蒸馏标杆（Apache-2.0 / MIT / CC-BY-4.0）

| Exemplar ID | 场景名称 | 视觉 DNA（实测提取） | 开源溯源 | 协议 |
| --- | --- | --- | --- | --- |
| `mckinsey-evolution` | 麦肯锡阶梯演进与宏观趋势诊断 | `#FFFFFF` 底 + `#062337` 深墨蓝 + `#C0504D` 批注红 · `editorial-rule` | `likaku/Mck-ppt-design-skill` | Apache-2.0 |
| `luxury-budget-review` | 黑金高管财务预算与资金复盘 | `#080A0E` 曜石黑 + `#C9A84C` 香槟金 + `#5A9E48` 翡翠绿 · `glass` | `iOfficeAI/OfficeCLI` | Apache-2.0 |
| `swiss-bauhaus-workshop` | 瑞士包豪斯设计评审与创新工作坊 | `#E63322` 包豪斯红 + `#E6B319` 明黄 · `editorial-folio` | `iOfficeAI/OfficeCLI` | Apache-2.0 |
| `dark-stage-investor` | 暗夜舞台 Demo Day 高张力融资路演 | `#0A0A12` 深空蓝黑 + `#E94560` 珊瑚红 + `#3B82F6` 电光蓝 · `glass` | `iOfficeAI/OfficeCLI` | Apache-2.0 |
| `blueprint-ai-factory` | 工程蓝图网格 AI 基础设施与智能体平台 | `#090E13` 工程深蓝 + `#4A90D9` 蓝图青 + `#E97E35` 警示橙 · `grid` | `iOfficeAI/OfficeCLI` | Apache-2.0 |
| `warm-brand-story` | 暖宣纸撞色品牌焕新与市场增长提案 | `#F6F2EA` 暖宣纸 + `#101B3B` 藏青 + `#EC7442` 珊瑚橘 · `editorial-rule` | `iOfficeAI/OfficeCLI` | Apache-2.0 |
| `ted-storytelling-keynote` | 暗夜极简主题演讲与观点叙事 | `#090C13` 剧场黑 + `#2BE4A8` 薄荷青 + `#E9A936` 琥珀金 · `glass` | `iOfficeAI/OfficeCLI` | Apache-2.0 |
| `msft-enterprise-discovery` | 微软企业级 AI 场景发现与价值评估工作坊 | `#FFFFFF` 白底 + `#1376C0` Azure 蓝 + `#0E7490` · 哈维球 + 四象限 | `microsoft/dstoolkit-DiscoveryEnvisioning` | MIT |
| `daylight-earnings-research` | 浅色投行研报与上市公司财报 | `#FAF9F6` 暖米纸 + `#1D6E6B` 机构深青 + `#9B4E23` 铜褐 · `editorial-rule` | `hustcer/pptx-nova` (`clear-value`) | Apache-2.0 |
| `okr-performance-review` | 中文大厂述职与 OKR 季度复盘 | `#FFFFFF` 极净白 + `#1277BA` 航标蓝 + `#137B43` 达标绿 · 目标实际表 | `hustcer/pptx-nova` (`sky-compass`) | Apache-2.0 |
| `quiet-canvas-keynote` | 极简静谧画布与浅色设计发布会 | `#EBE8E2` 暖宣麻 + `#AA6E53` 陶土红 + `#587F8A` 灰石蓝 · 54% 高留白 | `hustcer/pptx-nova` (`D1-Quiet-Canvas`) | Apache-2.0 |
| `medical-clinical-course` | 医学临床汇报与循证科研课件 | `#F1F0EC` 暖临床石 + `#0B6A48` 医学深绿 + `#EA613E` 珊瑚标 · 队列三线表 | `grotyx/medical-ppt-design` & `hustcer/pptx-nova` | CC-BY-4.0 / Apache-2.0 |

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
4. **证据锚定 Action-Title 与结尾兜底（`SLOP-01 / 02 / 09 / 10`）**：
   - 「财务数据 / 工作总结 / 核心指标 / 市场分析 / 性能提升 / Financials / Key Metrics」等空洞标签按各版式原生数据（KPI 数值、哑铃最大改善项、图表峰值/涨幅、表格领跑行）100% 依据原文提炼控宽 Action Title，绝不编造数字、绝不篡改 `{{metricId}}` 绑定；
   - 自动补齐有意义的章节面包屑 `kicker` 与图表/哑铃页底部量化 `takeaway`；
   - 仅写「谢谢 / Thank you」的裸结尾自动补齐 3 卡片行动封底 `closing[cta-cards]`。
5. **标杆叙事弧线自动重排（`alignOrder: true` / CLI `--align-order`）**：
   - 当草稿页序散乱（如把甘特排期塞在开篇、把核心 KPI 放到末尾）时，传 `alignOrder: true` 自动按标杆范本经典弧线（封面 → 核心判断 → 关键 KPI → 痛点对比 → 方案图谱 → 量化证明 → 排期路线 → 行动封底）确定性重排，完整保留显式 `section` 分章边界。
6. **零模型落盘前自检修复闭环（`selfRepairDeck`）**：
   - 渲染落盘前自动执行最多 2 轮 `checkManifest` + `SLOP-01..12` 复检与无损修复：自动拆分超长标题至 `subtitle`、无损分页 `kpi(>4)` / `cards(>6)` / `table(>9行)` 与长文本墙、把 >6 扇区碎块饼图转为聚光灯横向 `bar`、为单系列长柱图补聚光灯焦点、打破连续方框疲劳并净化高饱和/低对比画布，确保落盘即零告警成品（传 `--no-self-repair` 或 `autoUpgrade: false` 可关闭）。

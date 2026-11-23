# 首席艺术总监内置提示词包（Art-Director Prompt Packs · v0.37+）

> 本文件供模型在制作开放命题、高管汇报、学术答辩或人文画册时按需装载；`ppt_templates` 工具也会在返回体中自动附带精炼版 `artDirector` / `directorPrompt` 与 `goldenFields`，无需去翻底层 `.mjs` 源码。

---

## 一、核心边界：开放命题演示 vs Mode B 真实调研

| 场景 | 用户口吻示例 | 正确策略 | 严禁犯的错 |
| --- | --- | --- | --- |
| **开放命题 / 能力演示（Showcase）** | 「随便做一份 PPT 给我」「做一份炫酷/炫技的 PPT」「秀一下你的排版能力」 | 主动挑选有张力的科技产品发布会、经营复盘或行业蓝图主题，**放开使用 KPI 聚光灯、瀑布图、2.5D 等轴测、Mermaid、代码窗、雷达/热力图与报价矩阵**；在封面副标题与数据页 `source` 统一标明 **`示意数据 · 概念演示稿`** | 因害怕触发 Mode B 防造假门禁而退缩成 0 图表、0 图标、满屏空框的纯文字时间管理鸡汤 |
| **Mode B 真实外部调研** | 「帮我调研 2026 固态电池市场规模做份行研」「先搜权威资料再做汇报」 | 严格走 `references/research-plan.md` 3 轮一手源检索与双源交叉核验，落盘带 `origin`/`tier`/`date` 的 `evidence[]` 并通过 `SLOP-13` | 凭训练记忆编造统计数字或引用营销号二手转述 |

---

## 二、四大高频场景导演提示词（Director Prompts）

### 1. 炫酷发布会 / 开放命题（`showcase` · 默认首选）
- **默认推荐**：明亮高级系 `theme: "stripe-craft"`（需暗黑舞台时选 `aurora-stage`）+ `taste: "linear-craft"` + `motionProfile: "keynote"`。
- **封面铁律**：必用 `variant: "keynote-glow"`（或 `architectural` / `split-bleed`）+ `coverPattern: "waves"`（或 `"dots"` / `"rings"`），绝不留光秃秃的无装饰空白封面。
- **推荐 10–14 页节奏**：`cover[keynote-glow]` → `statement`（1 页破题）→ `kpi[spotlight]`（`reveal: "step"`）→ `chart[waterfall]` → `chart-split[line/column]` → `isometric[stack]`（`reveal: "step"`）→ `mermaid` → `code` 或 `mockup` → `radar` / `heatmap` → `pricing` → `closing[cta-cards]`。
- **视觉底线**：纯文字过渡页（`section`/`statement`/`quote`）总占比 **≤ 20%**；至少 4 类不同原生图谱；所有卡片/步骤优先补 `icon`（或设 `iconMode: "auto"`）。

### 2. 高管战略汇报 / 商业提案（`consulting`）
- **默认推荐**：`theme: "consulting"` 或 `"bcg-emerald"` + `taste: "mckinsey-partner"` + `motionProfile: "executive"`。
- **封面铁律**：`variant: "architectural"` + `coverPattern: "dots"`。
- **推荐节奏**：`cover` → `kpi[spotlight]` → `issue-tree`（MECE 因果拆解）→ `chart[waterfall]` → `chart-split` → `comparison[issue-action]` → `gauge`（OKR 子弹仪）→ `gantt` → `table[booktabs]` → `closing[cta-cards]`。

### 3. 学术答辩 / 深度行研（`academic`）
- **默认推荐**：`theme: "academic"` 或 `"economist-brief"` + `taste: "nature-academic"` + `motionProfile: "subtle"`。
- **封面铁律**：`variant: "editorial-grid"` + `coverPattern: "grid"`。
- **推荐节奏**：`cover` → `callout[formula]`（原生 `<m:oMath>`）→ `chart-split` → `table[booktabs]`（无竖线三线表）→ `comparison` → `booktabs` 混合证据附录（`evidenceAppendix: true`）→ `closing`。

### 4. 人文品牌 / 杂志社论（`editorial`）
- **默认推荐**：升级版 `theme: "editorial-forest"`（纸白卡片 + 松木青铜）或 `"editorial-warm"` + `taste: "swiss-editorial"` + `motionProfile: "subtle"`。
- **封面铁律**：`variant: "editorial-grid"` + `coverPattern: "editorial-arcs"`（或高分辨率全出血照片 `split-bleed`）。
- **视觉底线**：善用 `cards[bento-hero]`、`kpi[spotlight]`、`image-right`、`process[timeline]` 营造杂志留白张力，拒绝满屏同款矩形纯文字框与超过 2 页的空白章节页。

---

## 三、3 步极速出稿：黄金字段速查卡（Golden Field Cheat-Sheet）

> 直接按下列最小合法结构写 `slides[]`，3~5 次工具调用即可完成高质量交付，无需翻源码。

```jsonc
// 1. KPI 大数字（title 与 tag 均可作为指标名，推荐 title + value + unit + delta + icon）
{ "layout": "kpi", "variant": "spotlight", "reveal": "step", "items": [
  { "title": "首字延迟", "value": "28", "unit": "ms", "delta": "-72%", "status": "positive", "icon": "zap", "text": "较基线压低 72%" }
]}

// 2. 瀑布桥接图（贴近 0 轴的负值标签自动防撞轴）
{ "layout": "chart", "chart": { "kind": "waterfall", "unit": "ms", "categories": ["基线", "排队优化", "冷启动", "最终"], "series": [{ "name": "延迟", "values": [420, -180, -130, 110] }], "totalIndices": [0, 3] } }

// 3. 2.5D 等轴测分层架构（支持整卡联动 step 显现）
{ "layout": "isometric", "variant": "stack", "reveal": "step", "items": [
  { "tag": "L4", "title": "自适应调度层", "text": "按 SLA 动态拼批，消除队头阻塞" }
]}

// 4. MECE 逻辑议题树
{ "layout": "issue-tree", "items": [
  { "tag": "驱动 01", "title": "获客转化提效", "bullets": ["**渠道聚焦**：头部 3 渠道贡献 74%", "**落地页改版**：留资率提升 2.1pp"] }
]}

// 5. 三档商业报价矩阵
{ "layout": "pricing", "items": [
  { "tag": "推荐", "title": "Standard", "value": "¥1.2", "unit": "/百万 token", "status": "accent", "text": "公有云弹性计费", "bullets": ["✓ 99.95% SLA", "✓ 自动扩容", "× 无私有部署"] }
]}

// 6. 甘特路线图（0-based start + span；span:0 或 milestone:true 画菱形里程碑）
{ "layout": "gantt", "columns": ["Q1", "Q2", "Q3", "Q4"], "items": [
  { "tag": "底座", "title": "拼批引擎 v2", "start": 0, "span": 2, "value": "GA" },
  { "tag": "里程碑", "title": "成本降半达成", "start": 3, "span": 0, "milestone": true }
]}
```

---

## 四、PPTX + HTML 原生动效编排规范

1. **整稿过渡档位（`motionProfile`）**：
   - `subtle`：极速克制淡入（学术答辩 / 严肃公文 / 社论）；
   - `executive`（默认）：稳健淡入（高管汇报 / 董事会）；
   - `keynote`：智能混合编排——封面/章节/金句柔和 `fade`，图表/数据页 `wipe` 擦除，内容页 `push` 推入。
2. **单页精细覆盖（`slide.transition`）**：支持 `'fade' | 'push' | 'wipe' | 'cover' | 'cut' | 'none'`，同步写入 PPTX `<p:transition>` 与 HTML `data-transition`。
3. **整卡联动逐条点击显现（`slide.reveal: 'step'`）**：
   - 适用于 `kpi`、`cards`、`comparison`、`process`、`isometric`、`matrix`、`issue-tree`、`pricing`、`gauge`；
   - PPTX 端自动按卡片包围盒将底框 + 图标 + 标题 + 数值 + 说明归组（首元素 `clickEffect`，同卡子元素 `withEffect` 同步淡入），彻底告别「文字悬空、只弹底框」；
   - HTML 独立放映按空格/方向键逐卡显现；工作台内嵌预览（`iframe`）自动全部展开防首屏白板，并按 16:9 固定画布等比缩放防窄侧边栏溢出。

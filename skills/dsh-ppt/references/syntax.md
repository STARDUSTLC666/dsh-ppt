# dsh-ppt 输入语法与 24 套原生版式参考（结构化 slides · 5 套专业图示 · 扩展 Markdown · 动效）

`ppt_create` 与 `build-deck.mjs` 支持**结构化 `slides` JSON（大师级精细控制首选）**或**Markdown `content`**（两者二选一，勿混用）。所有版式（含 5 套全新零依赖专业图示）在独立 HTML 与 PPTX 中均编译为 **100% 原生可编辑文本、矢量形状、表格与图表**。

---

## 一、24 套标准版式（`layout` + `variant`）全景速查

### A. 19 套零依赖原生版式与专业图示（核心引擎直出）

| `layout` | 可选 `variant` / `tableStyle` | 核心槽位 | 典型视觉形态与适用场景 |
| --- | --- | --- | --- |
| `cover` | `standard \| monolith \| editorial \| swiss-grid \| inverted` | `kicker, title, subtitle` | 演示封面（自动隐藏页码；`exec-jilan`/`exec-palace` 自动深色描金压轴） |
| `agenda` | `list \| cards`（可选 `activeIndex`） | `kicker, title, items / bullets` | 结构化目录 / 章节导航（支持当前章节高亮） |
| `section` | `minimal \| number-hero \| inverted` | `kicker, title, subtitle` | 章节过渡页（超大章节编号 + 章节核心命题） |
| `bullets` | `clean \| accent-rail \| ruled \| two-column` | `kicker, title, subtitle, bullets, takeaway` | 精炼要点页（自动识别 `**加粗引导词**：说明`；建议 ≤ 5 条） |
| `statement` | `rail \| editorial-asymmetric \| centered` | `kicker, title, subtitle` | 单页核心宣言 / 价值主张留白页 |
| `quote` | `editorial \| card` | `kicker, title, subtitle` | 金句引述页（`title` 为引文，`subtitle` 为署名/出处） |
| `kpi` | `grid \| hero-left \| banner` | `kicker, title, items`（2–4 项）, `takeaway, source` | 大数字指标卡（等宽核心数值 `value` + `unit` + 涨跌胶囊 `delta`） |
| `cards` | `pillars \| bento \| exec-summary \| numbered` | `kicker, title, subtitle, items`（2–6 项）, `takeaway` | **主力去要点墙版式**：并列支柱卡、Apple/Linear 非对称 Bento 网格、麦肯锡顶部总论断+三支柱 `exec-summary` |
| `comparison` | `versus \| before-after \| do-dont \| issue-action` | `kicker, title, items`（2 列或 2–4 对配对行）, `takeaway` | A/B 方案对比、改造前后、✓ 推荐 vs ✗ 误区、政企「痛点 ──▶ 整改举措」原生箭头配对 |
| `matrix` | `2x2 \| grid` | `kicker, title, items`（4 象限）, `takeaway` | 咨询四象限矩阵（带原生 X/Y 坐标轴箭头与象限卡片） |
| `process` | `steps \| timeline \| chevron \| layers \| funnel \| flywheel` | `kicker, title, items`（3–6 步）, `takeaway` | 方法管线步骤、里程碑时间轴、咬合五边形箭头（`chevron`）、技术分层、转化漏斗、4 节点增长飞轮 |
| **`value-chain`** | — | `kicker, title, items[]`（支持辅助活动 + 基本活动 + 右侧利润池 Wedge）, `takeaway` | **正宗波特价值链（Porter Value Chain）**：顶部横向支撑活动（`Support Activities`）横梁 + 底部咬合基本活动（`Primary Activities`）五边形箭头 + 右侧利润池三角楔形 |
| **`marimekko`** | — | `kicker, title, rows[][]` 或 `items[]`（`value` 权重 + `bullets[]` 份额）, `takeaway, source` | **麦肯锡不等宽市场地图（Marimekko）**：按各赛道规模比例切分列宽 + 100% 堆叠份额块 + 顶部规模标签 + 底部 0%–100% 标尺 |
| **`sankey`** | — | `kicker, title, items[]`（`tag -> title, value, status`）或 `bullets[]`（`"A -> B: 68.5亿"`）, `takeaway, source` | **财报级桑基流向图（Sankey）**：多层拓扑守恒节点柱 + 原生三次贝塞尔丝带（`<a:custGeom>` / SVG），清晰呈现营收拆分与资金流向 |
| **`swot`** | — | `kicker, title, items[]`（4 项 S/W/O/T）, `takeaway` | **咨询级 SWOT 十字矩阵**：四象限语义色卡（优势/短板/机遇/威胁）+ 中央「破局核心」战略锚点 + 底部 `SO/WO/ST/WT` 行动洞察 |
| `callout` | `formula \| definition \| takeaways` | `kicker, title, subtitle, formula?, items / bullets, source` | **原生公式（`<m:oMath>` + MathML，支持 `formula` 或 `$...$`/`$$...$$` LaTeX）**、算法定理框、核心概念定义卡与复盘清单 |
| `table` | `tableStyle`: `consulting \| booktabs \| minimal \| banded \| harvey` | `kicker, title, rows`（首行表头）, `takeaway, source` | 原生可编辑对比表（`booktabs` 为**无竖线学术三线表**；`harvey` 支持哈维球；数值列右对齐；> 8 行自动分页） |
| **`gantt`** | `quarters \| months \| weeks \| swimlane` | `kicker, title, columns[], items[]`（`start, span, milestone?`）, `takeaway` | **原生甘特排期图**：自动时间刻度栅格、泳道标签、比例条形块与菱形里程碑节点 |
| **`architecture`** | `layered \| platform` | `kicker, title, items[]`（`bullets[]` 子模块，`status:'accent'` 侧边纵列） | **原生系统架构图**：多层技术栈横向模块 + 右侧跨层安全/治理纵栏 + 双向数据流箭头 |
| **`harvey`** | `matrix` | `kicker, title, rows[][]`（支持 `● ◕ ◑ ◔ ○ ✓ ✗` 或 `100%/75%/50%/25%/0%`） | **麦肯锡式哈维球竞品/能力矩阵**：自动高亮「本方案 / Ours」列并将符号渲染为精确矢量圆球 |
| **`tam`** | `concentric` | `kicker, title, items[]`（3 项 TAM/SAM/SOM，含 `value, title, text`） | **同心圆市场空间测算图**：左侧 3 个底切原生同心椭圆 + 右侧 3 张规模与口径说明卡 |
| **`org`** | `tree \| team` | `kicker, title, items[]`（`tree` 首项为根节点，2–5 项为子节点；`team` 2–4 人） | **组织架构树 / 核心管理团队介绍**：`tree` 带正交直角连接线；`team` 带圆标首字母头像与履历标签 |
| **`mermaid`** | `flowchart \| sequence`（亦支持顶层别名） | `kicker, title, mermaid`（Mermaid 代码串）, `takeaway` | **原生可编辑 Mermaid 流程图与时序图**：Markdown 中 ```` ```mermaid ```` 自动识别，PPTX 编译为带附着连接点（`stCxn`/`endCxn`）的原生矢量图形与箭头 |
| **`map`** | `world \| china`（别名 `world-map` / `china-map` / `geo-map`） | `kicker, title, items[]` 或 `rows[][]`（自动匹配全球/中国区域坐标）, `takeaway, source` | **零依赖战略矢量点阵地图**：左侧 Economist 风格全球/中国点阵轮廓 + 枢纽脉冲圈与互联虚线，右侧按数值排行的比例条卡片栏，随 24 主题自动配色 |
| **`isometric`** | `stack \| pillars`（别名 `iso-stack` / `iso-pillars` / `3d-stack`） | `kicker, title, items[]` 或 `rows[][]`, `takeaway` | **2.5D 等轴测矢量信息图**：`stack` 为 3–5 层立体菱形平台架构堆叠 + 左侧非遮挡层号胶囊 + 右侧引线解析卡；`pillars` 为 3–4 根 3D 立体柱碑对比 + 顶部悬浮指标 |
| `closing` | `standard \| cta-cards \| inverted` | `kicker, title, subtitle, items / bullets` | 结束与行动号召页（自动隐藏页码；支持下一步行动卡片，拒绝孤立「谢谢」） |

### B. 5 套媒体与出版级图表版式（`@office-kit/pptx` 增强）

| `layout` | 可选 `variant` | 核心槽位 | 典型视觉形态与适用场景 |
| --- | --- | --- | --- |
| `image` | `framed \| full-bleed \| gallery` | `title, subtitle, image`（支持 `focalPoint: center\|top\|bottom\|left\|right`）或 `images[]` 或 `imageBrief` | 单图精裱画框、**全屏出血自动叠加底部暗色渐变护眼层（WCAG AAA 白字）**、多图画册，或暂缺真图时的 **Visual Brief 智能配图占位蓝图** |
| `image-left` | `framed \| split-bleed` | `kicker, title, subtitle, image, items / bullets` | 左图右文（正文列垂直居中 + 导语分层；`split-bleed` 为左半屏无边距出血大图） |
| `image-right` | `framed \| split-bleed` | `kicker, title, subtitle, image, items / bullets` | 左文右图（同上） |
| `chart` | — | `kicker, title, subtitle, chart, takeaway, source` | 全幅出版级图表（13 种图表含矢量 `waterfall` 瀑布桥；亦兼容别名 `layout: "waterfall"`） |
| `chart-split` | `chart-left \| chart-right` | `kicker, title, chart, items / bullets, takeaway, source` | **62% 图表 + 38% 结构化洞察卡**（消除单图空旷感，最适合经营归因与消融实验对比） |

---

## 二、统一结构化 `slides` JSON 规范（推荐）

所有卡片/指标/步骤/象限类版式统一使用 **`items` 数组**（引擎同时兼容别名 `cards / metrics / columns / steps / quadrants`，并支持在未传 `items` 时从 `bullets` 自动投影）：

```json
[
  {
    "layout": "cover",
    "variant": "standard",
    "kicker": "2026 年度战略复盘",
    "title": "聚焦高价值政企客群，实现高质量盈利增长",
    "subtitle": "商业战略部 · 2026 Q4",
    "notes": "开场 30 秒点明全年核心战略转向。"
  },
  {
    "layout": "kpi",
    "variant": "grid",
    "kicker": "01 · 总体成效",
    "title": "核心经营指标全面超额达成，净留存率创历史新高",
    "items": [
      { "tag": "年度营收", "value": "1.84", "unit": "亿元", "delta": "+38% YoY", "status": "positive", "text": "政企续费贡献 64% 增量" },
      { "tag": "净收入留存", "value": "126%", "delta": "+11pp", "status": "positive", "text": "头部 50 客户零流失" },
      { "tag": "交付周期", "value": "4.5", "unit": "天", "delta": "-62%", "status": "accent", "text": "标准化模板自动装配" }
    ],
    "takeaway": "核心启示：规模增长已由新客驱动平稳切换为存量增购与交付提效双轮驱动。",
    "source": "数据来源：财务审计报表 2026Q1–Q4"
  },
  {
    "layout": "cards",
    "variant": "bento",
    "kicker": "02 · 增长引擎",
    "title": "三大产品工程能力构筑下一阶段竞争壁垒",
    "items": [
      { "tag": "引擎 01", "title": "母版智能吸收", "text": "**零手工调色**：秒级提取外部 PPTX 色板与字体并自动完成 WCAG 对比度净化。" },
      { "tag": "引擎 02", "title": "19 套原生版式", "text": "**100% 可编辑**：所有卡片、矩阵与三线表均为 PowerPoint 原生形状与表格。" },
      { "tag": "引擎 03", "title": "数字溯源联动", "text": "**一改全改**：CSV 单元格绑定与现场滑块推演同步刷新图表与正文。" }
    ]
  },
  {
    "layout": "comparison",
    "variant": "issue-action",
    "kicker": "03 · 短板与攻坚",
    "title": "针对三大交付堵点制定闭环整改举措",
    "items": [
      { "tag": "痛点 01", "title": "手工排版耗时过长", "text": "单份汇报平均耗费 4.2 小时调对齐 → **上线智能审美导演一键定稿**", "status": "accent" },
      { "tag": "痛点 02", "title": "跨平台投影缺字变形", "text": "Linux/Mac 打开字号错位 → **内置双语安全字体矩阵与 13.5pt 底线锁**", "status": "positive" }
    ]
  },
  {
    "layout": "table",
    "tableStyle": "booktabs",
    "kicker": "04 · 基准评测",
    "title": "新引擎在三项核心评测指标上全面领先传统工作流",
    "rows": [
      ["评测维度", "传统手工模板", "通用 AI 生成", "本方案 (Ours)"],
      ["平均成稿耗时", "240 min", "15 min", "**3.5 min**"],
      ["原生形状可编辑率", "100%", "42%", "**100%**"],
      ["WCAG AA 对比度达标率", "68%", "55%", "**100%**"]
    ],
    "source": "注：基于 30 份真实业务汇报双盲测试均值，加粗为最优项。"
  },
  {
    "layout": "closing",
    "variant": "cta-cards",
    "kicker": "下一步行动",
    "title": "Q1 启动三大标杆部门试点，两周内完成母版入库",
    "subtitle": "联系团队：strategy@example.com",
    "items": [
      { "tag": "第 1 周", "title": "母版归集", "text": "导入集团标准 PPTX 模板生成统一品牌预设" },
      { "tag": "第 2 周", "title": "全员赋能", "text": "覆盖战略、销售与研发三线周报与述职场景" }
    ]
  }
]
```

### `items[]` 单项字段说明
- `tag`（别名 `badge`）：顶部小标签/序号（如 `"01"`、`"痛点"`、`"Q3"`）。
- `title`：卡片/步骤/象限主标题。
- `text`（别名 `body`）：说明正文，支持内联 `**加粗**`、`*斜体*`、`` `代码` ``。
- `value` / `unit` / `delta`：`kpi` 指标卡专用核心大数字、单位与涨跌标签。
- `bullets`：卡片内部短要点数组（适用于 `comparison[versus]`、`cards`、`architecture` 子模块）。
- `start` / `span` / `milestone`：`gantt` 甘特图专用起止列索引与里程碑标记（`0` 起始整数）。
- `columns`：`gantt` 顶部时间刻度列数组（如 `["Q1", "Q2", "Q3", "Q4"]`）。
- `chrome`：单页可选覆盖母版骨架（`'consulting-classic' | 'keynote-spatial' | 'editorial-folio' | 'saas-bento' | 'academic-minimal' | 'gov-ceremonial'`）。
- `status`（别名 `tone`）：语义色调 `'positive' | 'negative' | 'warning' | 'neutral' | 'accent'`。

---

## 三、Markdown 解析与扩展容器语法（`content` 模式）

### 1. 基础确定性规则
- 首个 `# 标题` 作为封面主标题，紧随其后的首段或首条作为封面副标题。
- 每个 `## 章节标题` 生成独立页面：含列表生成要点页，纯标题无正文生成 `section` 章节过渡页，含连续 `| 列 | 列 |` 生成 `table` 页（最多 8 列、单格 ≤ 60 字符），含 `>` 引用块生成 `quote` 金句页（末行 `—— 署名` 自动识别为署名）。
- **内联富文本保留**：列表、表格与正文中的 `**加粗**`、`*斜体*`、`` `code` `` 原生保留；形如 `- **关键词**：具体说明` 的条目在 HTML 与 PPTX 中自动渲染为粗体主色引导词 + 次级色说明。
- **底栏核心结论条**：章节内写 `> [!TAKEAWAY] 一句话核心结论` 会提取为该页底部的 `takeaway` 横幅，而非单独拆成金句页。
- **演讲者备注**：`<!-- 备注: 讲解口径与数据出处 -->`（或 `<!-- note: ... -->`）写入 HTML 演讲者面板（按 `S` 呼出）与 PPTX 原生演示者备注，不出现在画面正文。

### 2. 显式版式容器指令（`:::` Fence Directives）
在 Markdown 中无需手写 JSON 即可直接调用高级原生版式：

````markdown
## 核心增长指标全面提速
::: kpi
- **1.84 亿元** | 年度营收 | +38% YoY | 政企续费贡献主力增量
- **126%** | 净收入留存 | +11pp | 头部客户零流失
- **4.5 天** | 平均交付周期 | -62% | 自动化流水线就绪
:::
> [!TAKEAWAY] 增长动力已切换为高留存增购驱动。

## 四阶段演进路线图
::: process timeline
- **Q1 筑基**：完成 14 套大师主题与跨平台字体门禁
- **Q2 扩展**：上线外部 PPTX 风格吸收器与出版级图表
- **Q3 闭环**：接入 24 页全量视觉检查与叙事教练
- **Q4 规模化**：覆盖全集团述职、答辩与客户提案
:::
````

支持指令：`::: kpi`、`::: cards [pillars|bento|exec-summary|numbered]`、`::: comparison [versus|before-after|do-dont|issue-action]`、`::: process [steps|timeline|layers|funnel]`、`::: matrix [2x2|grid]`、`::: callout [formula|definition|takeaways]`。

### 3. 高层智能版式升格（`smartLayout`）
当通过 `ppt_create`（`theme` 省略或设为 `'auto'`）处理 ≥ 4 节的常规 Markdown 文档时，智能导演会自动识别含显著指标百分比的列表升格为 `kpi`、含时间/阶段前缀的列表升格为 `process`、含对比语义的小节升格为 `comparison`，并将连续并列要点交替升格为 `cards`，自动消除单调要点墙（底层裸调 `parseMarkdownDeck` 默认不自动改版，确保精确脚本控制）。

---

## 四、动效控制（`motion`）

- 默认 `motion: 'on'`：HTML 放映启用平滑页间过渡与列表分步入场；PPTX 每页带原生淡入切换，`bullets` 页要点按鼠标点击逐条出现。
- 政企公文汇报、学术打印审阅或用户要求静态交付时，传 `motion: 'off'`（CLI `--motion off`），输出的 HTML 与 PPTX 不含任何入场动画代码。

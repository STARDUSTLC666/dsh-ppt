/**
 * deck-exemplars.mjs —— 优质标杆 PPT 范本库（Curated Exemplar Corpus）、槽位填空契约（Slot-Filling Contract）
 * 与外部优质 .pptx 批量吸收引擎（零外部运行时依赖）。
 *
 * 解决核心痛点：弱/中等模型（如 DeepSeek）开放式规划 PPT 时容易退化为连续 bullets 文字墙与空洞标题。
 * 本模块将世界顶级演示流派（麦肯锡、红杉/YC、Stripe/Apple、FT 经营复盘、技术架构 RFC、Nature 学术答辩、
 * 政企竞标提案、现代东方政务）抽象为结构化、机器可读的「标杆范本槽位契约」，并支持批量吸收工作区任意优质 .pptx，
 * 把“自由设计 PPT”降维为“按标杆槽位精准填空”。
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { GITHUB_DISTILLED_EXEMPLARS, getExemplarFewShotSlides } from './deck-exemplars-corpus.mjs'
import { writeWorkspaceJson } from './deck-store.mjs'

export { GITHUB_DISTILLED_EXEMPLARS, getExemplarFewShotSlides }

const EXEMPLAR_STORE_REL = '.dsh-ppt/exemplars.json'
const MAX_WORKSPACE_EXEMPLARS = 48

function slugifyId(raw, fallback = 'custom-exemplar') {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.pptx$/i, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return s || fallback
}

function slot(index, role, layout, opts = {}) {
  return Object.freeze({
    index,
    role,
    layout,
    variant: opts.variant || '',
    ...(opts.coverPattern ? { coverPattern: opts.coverPattern } : {}),
    ...(opts.tableStyle ? { tableStyle: opts.tableStyle } : {}),
    titleBudgetZh: opts.titleBudgetZh ?? 24,
    titleBudgetEn: opts.titleBudgetEn ?? 12,
    maxItems: opts.maxItems ?? 4,
    requiredFields: Object.freeze(opts.requiredFields || ['title', 'items']),
    exampleTitleZh: opts.exampleTitleZh || '',
    exampleTitleEn: opts.exampleTitleEn || '',
    fillGuideZh: opts.fillGuideZh || '',
    fillGuideEn: opts.fillGuideEn || '',
  })
}

/**
 * 8 套面向真实高价值场景的满分标杆范本（Curated Exemplars）。
 * 每份范本锁定：主题、品味配方、母版骨架、视觉密度节奏与逐页槽位契约（Slot Contract）。
 */
export const CURATED_EXEMPLARS = Object.freeze({
  'mckinsey-strategy': Object.freeze({
    id: 'mckinsey-strategy',
    name: '麦肯锡战略诊断与破局报告',
    enName: 'McKinsey Strategic Diagnosis & Turnaround',
    persona: 'consulting',
    theme: 'consulting',
    taste: 'mckinsey-partner',
    chromeStyle: 'consulting-classic',
    description: 'SCQA 结论先行 + 10 页高管节奏：执行摘要、聚光灯 KPI、不等宽市场图、魔力象限、哑铃跃迁与四季度甘特路线图',
    enDescription: 'SCQA action-title storyline across 10 executive slides: exec summary, spotlight KPI, Marimekko, Magic Quadrant, dumbbell leap & Gantt',
    keywords: ['战略', '咨询', '破局', '诊断', '增长战略', '董事会', '麦肯锡', 'bcg', 'strategy', 'board', 'turnaround', 'consulting', 'market'],
    slots: Object.freeze([
      slot(1, 'cover', 'cover', { variant: 'architectural', requiredFields: ['title', 'subtitle', 'kicker'], exampleTitleZh: '2026 华东区企业级增长破局战略规划', exampleTitleEn: '2026 Enterprise Growth & Turnaround Strategy', fillGuideZh: '简洁战略主题 + 时间/汇报对象副标题', fillGuideEn: 'Crisp strategic headline + date/audience subtitle' }),
      slot(2, 'exec-summary', 'cards', { variant: 'exec-summary', maxItems: 3, requiredFields: ['title', 'takeaway', 'items'], exampleTitleZh: '核心结论：聚焦高毛利大客户与自动化交付，12 个月内将净利提升 8pp', exampleTitleEn: 'Executive Summary: Enterprise focus + delivery automation lifts EBIT +8pp in 12 months', fillGuideZh: '1 句总结论标题 + 3 个 MECE 核心战略支柱', fillGuideEn: '1 governing conclusion title + 3 MECE strategic pillars' }),
      slot(3, 'headline-metrics', 'kpi', { variant: 'spotlight', maxItems: 4, requiredFields: ['title', 'items', 'source'], exampleTitleZh: '核心经营现状：营收增速放缓至 14%，但头部客群 NRR 逆势达 124%', exampleTitleEn: 'Baseline Metrics: Growth slowed to 14%, while enterprise NRR reached 124%', fillGuideZh: '1 个主锚点大数字 + 2-3 个支撑指标与同比 delta', fillGuideEn: '1 hero metric + 2-3 supporting KPIs with YoY deltas' }),
      slot(4, 'chapter-1', 'section', { variant: 'agenda', requiredFields: ['title', 'kicker'], exampleTitleZh: '市场结构与竞争格局诊断', exampleTitleEn: 'Market Structure & Competitive Diagnosis', fillGuideZh: '第 1 章节议程过场页', fillGuideEn: 'Chapter 1 live agenda divider' }),
      slot(5, 'market-share', 'marimekko', { maxItems: 4, requiredFields: ['title', 'rows', 'takeaway', 'source'], exampleTitleZh: '市场结构：金融与高端制造贡献 77% 利润池，我方在制造赛道仅占 18%', exampleTitleEn: 'Profit Pool: Finance & Manufacturing drive 77% of margin, yet our share is 18%', fillGuideZh: '首行为「厂商/赛道 + 各赛道规模」，后续行为各厂商份额百分比', fillGuideEn: 'Header row with segment sizes + player share percentages' }),
      slot(6, 'competitive-map', 'quadrant', { maxItems: 6, requiredFields: ['title', 'items', 'xLabel', 'yLabel', 'quadrants'], exampleTitleZh: '竞品魔力象限：我方产品完备度领先，但规模化交付执行力落后头部 15 分', exampleTitleEn: 'Magic Quadrant: Leading in vision, trailing top peer by 15pts in execution', fillGuideZh: '4-6 个竞品气泡，每项含 title / x(0-100) / y(0-100) / size', fillGuideEn: '4-6 competitor bubbles with title, x(0-100), y(0-100), size' }),
      slot(7, 'chapter-2', 'section', { variant: 'agenda', requiredFields: ['title', 'kicker'], exampleTitleZh: '三年破局举措与效能跃迁目标', exampleTitleEn: 'Strategic Initiatives & Performance Targets', fillGuideZh: '第 2 章节议程过场页', fillGuideEn: 'Chapter 2 live agenda divider' }),
      slot(8, 'before-after-leap', 'dumbbell', { maxItems: 5, requiredFields: ['title', 'items', 'takeaway'], exampleTitleZh: '改革目标：关键运营指标在 4 个季度内实现跨越式跃迁', exampleTitleEn: 'Target State: Step-change gains across 5 core operational metrics', fillGuideZh: '4-5 项改造前后对比指标，每项含 title / before / after / unit', fillGuideEn: '4-5 metrics with title, before, after, unit' }),
      slot(9, 'roadmap', 'gantt', { variant: 'quarters', maxItems: 5, requiredFields: ['title', 'columns', 'items'], exampleTitleZh: '四季度落地路线图：Q2 完成核心模块切换，Q4 实现全网规模复制', exampleTitleEn: '4-Quarter Rollout: Core cutover in Q2, full-scale expansion by Q4', fillGuideZh: '4 季度 columns + 4-5 条泳道任务（start 0-3, span 1-3）', fillGuideEn: '4 quarter columns + 4-5 workstreams with start/span' }),
      slot(10, 'closing-cta', 'closing', { variant: 'cta-cards', maxItems: 3, requiredFields: ['title', 'subtitle', 'items'], exampleTitleZh: '今日董事会需拍板的 3 项关键资源决议', exampleTitleEn: 'Three Decisions Requested from the Board Today', fillGuideZh: '3 张可执行决策/行动卡片，明确责任人与时间节点', fillGuideEn: '3 actionable decision cards with owner and due date' }),
    ]),
  }),

  'sequoia-pitch': Object.freeze({
    id: 'sequoia-pitch',
    name: '红杉 / YC 创投融资路演 BP',
    enName: 'Sequoia / YC Investor Pitch Deck',
    persona: 'tech-pitch',
    theme: 'venture-daylight',
    taste: 'apple-keynote-light',
    chromeStyle: 'keynote-spatial',
    description: '适合投资人屏幕直读的 10 页黄金路演弧线：一句话定位、痛点重构、产品原型、增长 KPI、TAM 同心圆、魔力象限、桑基利润流与核心团队',
    enDescription: 'Screen-first 10-slide investor arc: thesis statement, pain→shift, browser mockup, traction KPI, TAM/SAM/SOM, quadrant, unit-economics Sankey & team',
    keywords: ['融资', '路演', '商业计划', 'bp', '创投', '投资人', '估值', '天使轮', 'a轮', 'pitch', 'investor', 'fundraising', 'startup', 'seed', 'series'],
    slots: Object.freeze([
      slot(1, 'cover', 'cover', { variant: 'keynote-glow', coverPattern: 'dots', requiredFields: ['title', 'subtitle', 'kicker'], exampleTitleZh: 'NovaFlow：下一代企业级自主工作流操作系统', exampleTitleEn: 'NovaFlow: Autonomous Workflow OS for Global Enterprises', fillGuideZh: '品牌名 + 一句话品类定义 + 轮次标识', fillGuideEn: 'Brand + crisp category definition + round kicker' }),
      slot(2, 'thesis', 'statement', { variant: 'editorial-asymmetric', requiredFields: ['title', 'subtitle'], exampleTitleZh: '每年有 420 亿美元企业研发人力消耗在重复手工数据粘合上', exampleTitleEn: '$42B of engineering capacity is wasted every year on manual glue code', fillGuideZh: '1 句震撼行业洞察金句 + 简短佐证副标题', fillGuideEn: '1 memorable category thesis + concise proof point' }),
      slot(3, 'problem-solution', 'comparison', { variant: 'issue-action', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '从脆弱手工脚本跃迁至可验证 AI 编排底座，交付周期压缩 80%', exampleTitleEn: 'Replacing brittle scripts with verified AI orchestration cuts cycle time 80%', fillGuideZh: '左栏现状痛点 vs 右栏产品颠覆性解法', fillGuideEn: 'Left legacy pain points vs right product breakthrough' }),
      slot(4, 'product-demo', 'mockup', { variant: 'browser', maxItems: 4, requiredFields: ['title', 'url', 'items', 'takeaway'], exampleTitleZh: '零代码实时编排工作台：3 分钟打通多源数据并输出可审计成品', exampleTitleEn: 'Live Studio: Connect data sources and ship audited workflows in 3 minutes', fillGuideZh: '浏览器原型框展示产品 URL 与 3-4 个核心界面指标/功能块', fillGuideEn: 'Browser mockup with product URL & 3-4 live UI metric tiles' }),
      slot(5, 'traction', 'kpi', { variant: 'spotlight', maxItems: 4, requiredFields: ['title', 'items', 'source'], exampleTitleZh: '强劲商业化验证：上线 14 个月 ARR 突破 1,850 万美元，NRR 达 132%', exampleTitleEn: 'Explosive Traction: $18.5M ARR in 14 months with 132% net dollar retention', fillGuideZh: 'ARR / 增速 / 留存率 / 付费标杆客户数', fillGuideEn: 'ARR, YoY growth, NRR, enterprise logo count' }),
      slot(6, 'market-sizing', 'tam', { variant: 'concentric', maxItems: 3, requiredFields: ['title', 'items', 'source'], exampleTitleZh: '千亿级全球智能自动化市场，首期切入 48 亿美元高意愿软件客群', exampleTitleEn: '$112B global automation TAM, starting with $4.8B high-intent SaaS SOM', fillGuideZh: '3 项同心圆：TAM / SAM / SOM（含数值与测算逻辑）', fillGuideEn: '3 concentric rings: TAM, SAM, SOM with bottom-up math' }),
      slot(7, 'competitive-moat', 'quadrant', { maxItems: 5, requiredFields: ['title', 'items', 'xLabel', 'yLabel', 'quadrants'], exampleTitleZh: '竞争壁垒：唯一同时实现高自动化深度与企业级零幻觉审计的领航方案', exampleTitleEn: 'Unfair Advantage: Only platform combining deep autonomy with enterprise auditability', fillGuideZh: '我方位于右上领航者象限 + 4 家典型竞品坐标', fillGuideEn: 'Ours in top-right Leaders + 4 competitors' }),
      slot(8, 'unit-economics', 'sankey', { maxItems: 4, requiredFields: ['title', 'items', 'takeaway'], exampleTitleZh: '健康 SaaS 盈利模型：84% 软件毛利率支撑 11 个月 CAC 快速回本', exampleTitleEn: 'Best-in-Class Economics: 84% gross margin powers an 11-month CAC payback', fillGuideZh: '4 条以上收入→毛利→研发/获客→净利流向（tag源→title目标+value）', fillGuideEn: 'Revenue→Gross Margin→R&D/S&M→EBITDA flow links' }),
      slot(9, 'team', 'org', { variant: 'team', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '核心创始团队兼具顶级 AI 基础设施研发与十亿级 B2B 商业化经验', exampleTitleEn: 'Founding Team: Builders of hyperscale AI infra and $100M+ B2B engines', fillGuideZh: '3-4 位核心创始人（title 姓名, role 职级, text 代表履历）', fillGuideEn: '3-4 founders with title, role, and standout track record' }),
      slot(10, 'the-ask', 'closing', { variant: 'cta-cards', maxItems: 3, requiredFields: ['title', 'subtitle', 'items'], exampleTitleZh: '本轮拟融资 2,500 万美元，全力冲刺 18 个月 ARR 翻三倍目标', exampleTitleEn: 'Raising $25M Series A to 3× ARR Over the Next 18 Months', fillGuideZh: '资金用途配比 + 18 个月核心里程碑 + 联系方式', fillGuideEn: 'Use of funds + 18-month milestones + contact' }),
    ]),
  }),

  'stripe-product-launch': Object.freeze({
    id: 'stripe-product-launch',
    name: 'Stripe / Apple 科技产品与开发者发布',
    enName: 'Stripe / Apple Product & Dev Launch',
    persona: 'tech-pitch',
    theme: 'stripe-craft',
    taste: 'linear-craft',
    chromeStyle: 'saas-bento',
    description: '现代科技发布会与产研路演标杆：光晕网格封面、无框大数字、反白 Bento 图标卡、桌面/移动双端原型、语法高亮代码终端、雷达与哑铃提速对比',
    enDescription: 'Modern tech keynote & developer launch: grid-glow cover, monumental KPIs, hero Bento + vector icons, desktop/mobile mockups, code terminal, radar & dumbbell gains',
    keywords: ['产品发布', '发布会', '开发者', 'sdk', 'api', 'saas', '新品', '功能升级', 'launch', 'keynote', 'release', 'developer', 'product', 'stripe', 'apple'],
    slots: Object.freeze([
      slot(1, 'cover', 'cover', { variant: 'keynote-glow', coverPattern: 'grid', requiredFields: ['title', 'subtitle', 'kicker'], exampleTitleZh: 'Studio Engine 3.0：极速全栈原生矢量构建平台', exampleTitleEn: 'Studio Engine 3.0: Zero-Latency Native Vector Platform', fillGuideZh: '产品代号 + 核心突破副标题 + 版本角标', fillGuideEn: 'Product release name + breakthrough subtitle + version pill' }),
      slot(2, 'hero-numbers', 'kpi', { variant: 'frameless', maxItems: 3, requiredFields: ['title', 'items'], exampleTitleZh: '三大突破指标：构建提速 6 倍、首轮过检率 99.4%、零外部依赖', exampleTitleEn: 'Three Launch Benchmarks: 6× Faster Builds, 99.4% First-Pass QA, Zero Deps', fillGuideZh: '3 个极简超大字号震撼数字', fillGuideEn: '3 monumental frameless launch numbers' }),
      slot(3, 'capabilities-bento', 'cards', { variant: 'bento-hero', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '四大核心能力协同，重塑端到端产研体验', exampleTitleEn: 'Four Core Capabilities Redefining End-to-End Developer Craft', fillGuideZh: '第 1 项为主推核心能力，后 3 项为配套特性（自动匹配矢量图标）', fillGuideEn: '1 hero flagship pillar + 3 supporting features with vector icons' }),
      slot(4, 'web-mockup', 'mockup', { variant: 'browser', maxItems: 4, requiredFields: ['title', 'url', 'items'], exampleTitleZh: '全新 Web 工作台：实时协同预览与零延迟直接操纵', exampleTitleEn: 'Reimagined Web Studio: Real-Time Preview & Direct Manipulation', fillGuideZh: 'Web 端地址栏 + 4 项实时状态/界面模块', fillGuideEn: 'Browser URL + 4 live dashboard tiles' }),
      slot(5, 'mobile-mockup', 'mockup', { variant: 'mobile', maxItems: 3, requiredFields: ['title', 'items'], exampleTitleZh: '移动端随身协同：随时审批、远程提词与一键分享', exampleTitleEn: 'Mobile Companion: Approve, Present & Share Anywhere', fillGuideZh: '手机端展示 + 右侧 3 项移动核心卖点', fillGuideEn: 'Phone frame + 3 right-hand mobile value cards' }),
      slot(6, 'code-quickstart', 'code', { variant: 'split', maxItems: 3, requiredFields: ['title', 'language', 'filename', 'code', 'items'], exampleTitleZh: '开发者 10 行代码快速集成，零样板配置即刻上线', exampleTitleEn: 'Ship in 10 Lines of TypeScript with Zero Boilerplate', fillGuideZh: '真实精简代码片段（≤14行）+ 右侧 3 条工程亮点批注', fillGuideEn: 'Clean ≤14-line code snippet + 3 right-side architectural notes' }),
      slot(7, 'benchmark-radar', 'radar', { maxItems: 6, requiredFields: ['title', 'rows', 'source'], exampleTitleZh: '六维综合基准评测全面超越行业均值 30+ 分', exampleTitleEn: 'Outperforms Industry Baseline by +30pts Across All 6 Dimensions', fillGuideZh: '表头含「维度 + 我方 + 行业均值」，5-6 项评分（0-100）', fillGuideEn: '5-6 dimensions comparing Our Platform vs Industry Avg (0-100)' }),
      slot(8, 'velocity-leap', 'dumbbell', { maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '升级前后实测：端到端时延下降 64%，研发吞吐提升 2.8 倍', exampleTitleEn: 'Before vs After: 64% Lower Latency & 2.8× Shipping Velocity', fillGuideZh: '4 项升级前后真实数值对比（before → after）', fillGuideEn: '4 concrete before→after performance deltas' }),
      slot(9, 'closing-cta', 'closing', { variant: 'cta-cards', maxItems: 3, requiredFields: ['title', 'subtitle', 'items'], exampleTitleZh: '即日起全量开放公测，3 分钟开启体验', exampleTitleEn: 'Generally Available Today — Start Building in 3 Minutes', fillGuideZh: '安装命令、文档入口与迁移支持卡片', fillGuideEn: 'Install CLI, docs link & migration support cards' }),
    ]),
  }),

  'quarterly-exec-review': Object.freeze({
    id: 'quarterly-exec-review',
    name: '高管季度经营 / OKR 深度复盘',
    enName: 'Executive Quarterly Business / OKR Review',
    persona: 'consulting',
    theme: 'consulting',
    taste: 'ft-data-journal',
    chromeStyle: 'editorial-folio',
    description: '杂志级经营复盘节奏：网格封面、北极星 KPI、大区×业务线热力矩阵、利润驱动拆分、痛点整改对照、价值链复盘、环比哑铃与下季甘特',
    enDescription: 'Editorial QBR/OKR review: grid cover, North-Star KPIs, regional heatmap, driver breakdown, issue→action, value chain, QoQ dumbbell & next-Q Gantt',
    keywords: ['复盘', '季报', '季度', 'okr', 'kpi', '月报', '经营', '业绩', '财报', '周报', 'qbr', 'quarterly', 'review', 'earnings', 'revenue', 'weekly'],
    slots: Object.freeze([
      slot(1, 'cover', 'cover', { variant: 'editorial-grid', requiredFields: ['title', 'subtitle', 'kicker'], exampleTitleZh: '2026 Q3 核心业务经营复盘与 Q4 攻坚计划', exampleTitleEn: 'Q3 2026 Business Performance Review & Q4 Plan', fillGuideZh: '季度标题 + 汇报部门与日期', fillGuideEn: 'Quarter title + business unit & date' }),
      slot(2, 'scorecard', 'kpi', { variant: 'spotlight', maxItems: 4, requiredFields: ['title', 'items', 'source'], exampleTitleZh: 'Q3 整体营收达成率 106%，经营现金流创近六个季度新高', exampleTitleEn: 'Q3 Revenue Hit 106% of Plan with Record Operating Cash Flow', fillGuideZh: '1 个核心北极星指标 + 3 个关键经营指标', fillGuideEn: '1 North-Star metric + 3 headline financial/OKR metrics' }),
      slot(3, 'regional-heatmap', 'heatmap', { maxItems: 5, requiredFields: ['title', 'rows', 'takeaway'], exampleTitleZh: '大区 × 产品线达成率热力矩阵：华东与 SaaS 领跑，西南交付需增援', exampleTitleEn: 'Region × Product Achievement Heatmap: APAC & SaaS Lead, EMEA Trails', fillGuideZh: '3-5 行 × 3-5 列达成率数值矩阵', fillGuideEn: '3-5 row × 3-5 col achievement percentage matrix' }),
      slot(4, 'key-wins', 'cards', { variant: 'frameless', maxItems: 3, requiredFields: ['title', 'items'], exampleTitleZh: '三大增长引擎超额兑现，驱动毛利率环比提升 3.4pp', exampleTitleEn: 'Three Growth Engines Outperformed, Expanding Gross Margin +3.4pp QoQ', fillGuideZh: '3 个核心增长亮点与量化贡献', fillGuideEn: '3 major wins with quantified revenue/margin impact' }),
      slot(5, 'misses-actions', 'comparison', { variant: 'issue-action', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '未达标项根因复盘与 Q4 专项纠偏动作（责任到人）', exampleTitleEn: 'Misses Root-Cause Analysis & Q4 Corrective Owners', fillGuideZh: '左栏未达标/痛点根因 → 右栏 Q4 硬举措与截止时间', fillGuideEn: 'Left misses/root causes → right Q4 corrective actions' }),
      slot(6, 'value-chain', 'value-chain', { maxItems: 6, requiredFields: ['title', 'items'], exampleTitleZh: '端到端业务价值链提效：中台自动化支撑前线人效提升 38%', exampleTitleEn: 'End-to-End Value Chain: Platform Automation Lifted Frontline Productivity +38%', fillGuideZh: '2 条辅助支撑活动 + 4 条主流程活动', fillGuideEn: '2 support activities + 4 primary operational stages' }),
      slot(7, 'qoq-shift', 'dumbbell', { maxItems: 5, requiredFields: ['title', 'items'], exampleTitleZh: 'Q2 → Q3 关键效能指标跃迁：线索转化与一次交付率同步突破', exampleTitleEn: 'Q2 → Q3 Operational Shift: Conversion & First-Pass Yield Surged', fillGuideZh: '4-5 项环比改善指标（before Q2 → after Q3）', fillGuideEn: '4-5 QoQ operational metrics (Q2 before → Q3 after)' }),
      slot(8, 'next-quarter-plan', 'gantt', { variant: 'months', maxItems: 5, requiredFields: ['title', 'columns', 'items'], exampleTitleZh: 'Q4 三个月冲刺排期：10 月封板关键需求，12 月冲刺年度目标', exampleTitleEn: 'Q4 Monthly Execution Plan: Lock Scope in Oct, Close Annual Target in Dec', fillGuideZh: '3 个月时间轴 + 4-5 条 P0 冲刺工作流', fillGuideEn: '3 monthly columns + 4-5 P0 sprint streams' }),
      slot(9, 'closing-cta', 'closing', { variant: 'cta-cards', maxItems: 3, requiredFields: ['title', 'subtitle', 'items'], exampleTitleZh: 'Q4 需管理层协同拍板的资源与预算清单', exampleTitleEn: 'Q4 Leadership Approvals & Resource Requests', fillGuideZh: '3 项需拍板的预算/编制/跨部门事项', fillGuideEn: '3 concrete budget, headcount, or cross-team decisions' }),
    ]),
  }),

  'tech-arch-rfc': Object.freeze({
    id: 'tech-arch-rfc',
    name: '核心技术架构评审与系统重构 RFC',
    enName: 'Technical Architecture Review & System RFC',
    persona: 'tech-pitch',
    theme: 'stripe-craft',
    taste: 'linear-craft',
    chromeStyle: 'saas-bento',
    description: '工程总监级架构评审范本：新旧对比、分层系统拓扑、Mermaid 流程与时序图、核心代码契约、六维权衡雷达与分阶段灰度甘特',
    enDescription: 'Staff-engineer RFC deck: legacy vs target, layered architecture, Mermaid flow & sequence diagrams, code interface, 6-axis trade-off radar & rollout Gantt',
    keywords: ['架构', '重构', '技术方案', 'rfc', '系统设计', '微服务', '云原生', '后端', '高可用', '性能优化', 'architecture', 'rfc', 'system design', 'engineering', 'migration', 'infra'],
    slots: Object.freeze([
      slot(1, 'cover', 'cover', { variant: 'keynote-glow', coverPattern: 'grid', requiredFields: ['title', 'subtitle', 'kicker'], exampleTitleZh: '核心交易引擎云原生解耦架构评审（RFC-042）', exampleTitleEn: 'Core Transaction Engine Decoupling RFC-042', fillGuideZh: 'RFC 标题 + 负责团队与评审日期', fillGuideEn: 'RFC title + authoring team & date' }),
      slot(2, 'before-after', 'comparison', { variant: 'before-after', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '现状瓶颈与目标架构对比：彻底消除单点锁与跨区同步延迟', exampleTitleEn: 'Current Bottlenecks vs Target State: Eliminating Global Lock Contention', fillGuideZh: '现有架构痛点 vs 目标解耦收益', fillGuideEn: 'Legacy pain points vs target architectural outcomes' }),
      slot(3, 'layered-topology', 'architecture', { variant: 'layered', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '三层解耦平台拓扑与全域零信任可观测侧翼', exampleTitleEn: 'Three-Tier Decoupled Platform Topology & Zero-Trust Observability Sidecar', fillGuideZh: '3 层主架构（每层含 bullets 子模块）+ 1 项安全/监控侧翼', fillGuideEn: '3 core horizontal tiers (with sub-module bullets) + 1 observability/security sidecar' }),
      slot(4, 'data-flow', 'mermaid', { variant: 'flowchart', requiredFields: ['title', 'mermaid', 'takeaway'], exampleTitleZh: '核心请求处理与异步事件总线数据流', exampleTitleEn: 'Core Request Path & Async Event Bus Data Flow', fillGuideZh: '6-8 节点的 flowchart LR/TD 源码', fillGuideEn: 'Clean 6-8 node Mermaid flowchart LR/TD' }),
      slot(5, 'critical-sequence', 'mermaid', { variant: 'sequence', requiredFields: ['title', 'mermaid'], exampleTitleZh: '分布式幂等写与故障自动降级时序链路', exampleTitleEn: 'Idempotent Write & Automated Failover Sequence', fillGuideZh: '3-5 参与者的 sequenceDiagram 时序图', fillGuideEn: '3-5 participant Mermaid sequenceDiagram' }),
      slot(6, 'code-contract', 'code', { variant: 'split', maxItems: 3, requiredFields: ['title', 'language', 'filename', 'code', 'items'], exampleTitleZh: '核心接口契约与幂等状态机实现示例', exampleTitleEn: 'Core Interface Contract & Idempotent State Machine', fillGuideZh: '核心类型/API 签名代码 + 3 条设计约束说明', fillGuideEn: 'Core interface/handler snippet + 3 design invariants' }),
      slot(7, 'tradeoff-radar', 'radar', { maxItems: 6, requiredFields: ['title', 'rows'], exampleTitleZh: '三种备选方案六维架构权衡评估（选定方案 B）', exampleTitleEn: 'Six-Attribute Trade-off Evaluation Across 3 Architecture Options', fillGuideZh: '吞吐/时延/一致性/运维复杂度/成本/扩展性对比评分', fillGuideEn: 'Throughput, latency, consistency, ops, cost, scalability scores' }),
      slot(8, 'rollout-plan', 'gantt', { variant: 'months', maxItems: 5, requiredFields: ['title', 'columns', 'items'], exampleTitleZh: '四阶段零停机灰度迁移与双跑校验排期', exampleTitleEn: 'Zero-Downtime Shadow Traffic & Phased Cutover Schedule', fillGuideZh: '双跑、1%灰度、50%切流、全量下线时间排期', fillGuideEn: 'Shadow, 1% canary, 50% shift, legacy retirement timeline' }),
      slot(9, 'signoff', 'closing', { variant: 'cta-cards', maxItems: 3, requiredFields: ['title', 'subtitle', 'items'], exampleTitleZh: '架构评审准出清单与一键回滚门禁确认', exampleTitleEn: 'RFC Sign-Off Checklist & Rollback Gates', fillGuideZh: '压测门禁、安全评审与回滚预案责任人', fillGuideEn: 'Load-test gate, security sign-off & rollback owner' }),
    ]),
  }),

  'academic-defense': Object.freeze({
    id: 'academic-defense',
    name: 'Nature / 顶会学术答辩与实验报告',
    enName: 'Nature / Conference Academic Defense',
    persona: 'academic',
    theme: 'academic',
    taste: 'nature-academic',
    chromeStyle: 'academic-minimal',
    description: '严谨顶会/学位答辩范本：Beamer 通栏页眉、动机与贡献、原生 LaTeX 核心公式、方法流程图、无竖线学术三线表、消融哑铃图与泛化热力图',
    enDescription: 'Rigorous thesis/conference defense: Beamer header, contributions, native LaTeX equation, method flowchart, booktabs 3-line table, ablation dumbbell & generalization heatmap',
    keywords: ['论文', '答辩', '学术', '实验', '消融', '算法', '模型', '硕士', '博士', '毕业', '顶会', 'thesis', 'defense', 'paper', 'academic', 'research', 'ablation', 'neurips', 'icml'],
    slots: Object.freeze([
      slot(1, 'cover', 'cover', { variant: 'editorial-grid', requiredFields: ['title', 'subtitle', 'kicker'], exampleTitleZh: '基于稀疏注意力的长上下文高效推理框架研究', exampleTitleEn: 'Efficient Long-Context Inference via Sparse Attention', fillGuideZh: '论文题目 + 作者/导师/院系信息', fillGuideEn: 'Paper title + author, advisor & affiliation' }),
      slot(2, 'contributions', 'cards', { variant: 'frameless', maxItems: 3, requiredFields: ['title', 'items'], exampleTitleZh: '研究动机与三大核心学术贡献：精度无损下显存降低 68%', exampleTitleEn: 'Motivation & Three Core Contributions: 68% Less Memory with Zero Accuracy Loss', fillGuideZh: '1 个痛点缺口 + 2-3 条核心理论/方法/实验贡献', fillGuideEn: 'Problem gap + 2-3 novel theoretical & empirical contributions' }),
      slot(3, 'formulation', 'callout', { variant: 'formula', requiredFields: ['title', 'formula', 'bullets'], exampleTitleZh: '核心目标函数与误差上界收敛定理', exampleTitleEn: 'Core Objective Formulation & Convergence Bound', fillGuideZh: '纯 LaTeX 数学公式（自动渲染原生 oMath）+ 2-3 条符号与物理意义说明', fillGuideEn: 'LaTeX equation (native oMath) + 2-3 variable definitions' }),
      slot(4, 'methodology', 'mermaid', { variant: 'flowchart', requiredFields: ['title', 'mermaid', 'takeaway'], exampleTitleZh: '端到端方法架构：动态路由剪枝与 KV 缓存重排流水线', exampleTitleEn: 'Method Pipeline: Dynamic Routing & KV-Cache Compaction', fillGuideZh: '方法总体框图 flowchart LR', fillGuideEn: 'Methodology architecture flowchart LR' }),
      slot(5, 'main-results', 'table', { tableStyle: 'booktabs', requiredFields: ['title', 'rows', 'takeaway', 'source'], exampleTitleZh: '主实验定量对比（学术三线表）：在 4 个公开基准上全部取得 SOTA', exampleTitleEn: 'Main Quantitative Results (Booktabs): SOTA Across 4 Public Benchmarks', fillGuideZh: '无竖线三线表，本方法最佳指标用 **加粗** 突出', fillGuideEn: 'Booktabs 3-line table with **bold** SOTA metrics' }),
      slot(6, 'ablation', 'dumbbell', { maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '消融实验跃迁：每项核心模块均带来稳定正向增益（累计 +9.4%）', exampleTitleEn: 'Ablation Study: Every Module Yields Consistent Gains (+9.4% Cumulative)', fillGuideZh: '基线 vs 加入各模块后的指标提升哑铃对比', fillGuideEn: 'Baseline vs component-augmented accuracy/latency deltas' }),
      slot(7, 'generalization', 'heatmap', { maxItems: 5, requiredFields: ['title', 'rows'], exampleTitleZh: '跨领域与超参敏感性热力矩阵：在宽参数区间保持稳健最优', exampleTitleEn: 'Cross-Domain & Hyperparameter Sensitivity Heatmap', fillGuideZh: '数据集 × 超参/配置准确率热力矩阵', fillGuideEn: 'Dataset × hyperparameter accuracy heatmap' }),
      slot(8, 'limitations', 'comparison', { variant: 'do-dont', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '误差案例分析、适用边界与未来研究方向', exampleTitleEn: 'Error Analysis, Scope Limitations & Future Work', fillGuideZh: '左栏优势适用边界 vs 右栏已知局限与后续改进', fillGuideEn: 'Verified strengths vs explicit limitations & next steps' }),
      slot(9, 'closing', 'closing', { variant: 'standard', requiredFields: ['title', 'subtitle', 'bullets'], exampleTitleZh: '总结与致谢：代码与评测基准已全面开源', exampleTitleEn: 'Conclusions & Q&A — Code & Benchmarks Open-Sourced', fillGuideZh: '3 条结论回顾 + 开源仓库链接/致谢答辩委', fillGuideEn: '3 key takeaways + repo link & committee thanks' }),
    ]),
  }),

  'enterprise-proposal': Object.freeze({
    id: 'enterprise-proposal',
    name: '政企大客户解决方案与竞标提案',
    enName: 'Enterprise Solution & RFP Winning Proposal',
    persona: 'consulting',
    theme: 'bcg-emerald',
    taste: 'mckinsey-partner',
    chromeStyle: 'consulting-classic',
    description: 'BCG 翡翠战略商机赢单架构：价值摘要、客户痛点→定制方案、部署拓扑、哈维球竞品盲测、量化 ROI、实施甘特与专属交付团队',
    enDescription: 'BCG emerald enterprise RFP winner: value summary, client pain→solution, deployment topology, Harvey-ball matrix, ROI KPIs, implementation Gantt & SLA team',
    keywords: ['方案', '提案', '竞标', '投标', '客户', '售前', '解决方案', 'poc', 'roi', 'proposal', 'rfp', 'client', 'solution', 'enterprise', 'sales'],
    slots: Object.freeze([
      slot(1, 'cover', 'cover', { variant: 'architectural', requiredFields: ['title', 'subtitle', 'kicker'], exampleTitleZh: '某大型金融集团智能知识底座一体化建设方案', exampleTitleEn: 'Enterprise AI Knowledge Platform Proposal', fillGuideZh: '客户定制方案名 + 提案团队与日期', fillGuideEn: 'Tailored client proposal title + date' }),
      slot(2, 'value-summary', 'cards', { variant: 'exec-summary', maxItems: 3, requiredFields: ['title', 'takeaway', 'items'], exampleTitleZh: '核心合作价值：90 天快速上线、首年降本 1,400 万、100% 私有化合规', exampleTitleEn: 'Value Proposition: 90-Day Go-Live, $2M Year-1 Savings & Full On-Prem Compliance', fillGuideZh: '1 句客户收益总承诺 + 3 大核心交付保障', fillGuideEn: 'Headline client outcome + 3 delivery guarantees' }),
      slot(3, 'pain-solution', 'comparison', { variant: 'issue-action', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '精准对标贵司 4 大业务痛点，提供开箱即用模块化解法', exampleTitleEn: 'Mapping Directly to Your 4 Core Operational Pain Points', fillGuideZh: '客户痛点 → 对应产品能力与预期效果', fillGuideEn: 'Client pain point → tailored module & measurable result' }),
      slot(4, 'deployment-arch', 'architecture', { variant: 'platform', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '全栈信创私有化部署架构：数据不出内网、权限细粒度审计', exampleTitleEn: 'Private Cloud / Air-Gapped Deployment & Security Topology', fillGuideZh: '接入层/应用层/底座层 + 等保合规安全侧翼', fillGuideEn: 'Access, application, core layers + compliance sidecar' }),
      slot(5, 'harvey-compare', 'harvey', { tableStyle: 'harvey', requiredFields: ['title', 'rows', 'takeaway'], exampleTitleZh: '竞品能力客观盲测（哈维球矩阵）：在安全合规与原生交付全面领跑', exampleTitleEn: 'Objective Capability Comparison (Harvey Matrix)', fillGuideZh: '5-6 项客户核心评分项 × 本方案/竞品A/竞品B（● ◕ ◑ ◔ ○）', fillGuideEn: '5-6 RFP criteria across Ours vs Competitors using ● ◕ ◑ ◔ ○' }),
      slot(6, 'roi-kpi', 'kpi', { variant: 'spotlight', maxItems: 4, requiredFields: ['title', 'items', 'source'], exampleTitleZh: '测算投资回报：7.5 个月收回全部投入，三年累计净收益 3.6 倍', exampleTitleEn: 'Quantified ROI: 7.5-Month Payback & 3.6× Three-Year Net Return', fillGuideZh: 'ROI / 回收期 / 年化降本 / 人效提升指标', fillGuideEn: 'ROI, payback months, annual savings & productivity gain' }),
      slot(7, 'delivery-gantt', 'gantt', { variant: 'weeks', maxItems: 5, requiredFields: ['title', 'columns', 'items'], exampleTitleZh: '12 周标准交付与平滑切换计划（零业务中断）', exampleTitleEn: '12-Week Zero-Disruption Implementation & Training Plan', fillGuideZh: 'W1-W12 周期 + 环境部署/数据迁移/联调/培训/验收', fillGuideEn: 'W1-W12 timeline across setup, migration, UAT, training & go-live' }),
      slot(8, 'sla-team', 'org', { variant: 'tree', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '专属项目治理结构与 7×24 金牌 SLA 响应机制', exampleTitleEn: 'Dedicated Delivery Governance & 7×24 Gold SLA Team', fillGuideZh: '项目总监 + 架构/研发/客户成功三组保障', fillGuideEn: 'Project Director + Architecture, Engineering & Success pods' }),
      slot(9, 'poc-next-step', 'closing', { variant: 'cta-cards', maxItems: 3, requiredFields: ['title', 'subtitle', 'items'], exampleTitleZh: '建议下周启动 2 周免费沙箱 POC 实测验证', exampleTitleEn: 'Recommended Next Step: Launch 2-Week Sandbox POC Next Monday', fillGuideZh: 'POC 验收标准、双方接口人与启动时间', fillGuideEn: 'POC success criteria, counterparts & kickoff date' }),
    ]),
  }),

  'gov-institutional': Object.freeze({
    id: 'gov-institutional',
    name: '现代东方政务与集团年度述职汇报',
    enName: 'Modern Institutional & Annual Governance Briefing',
    persona: 'gov-exec',
    theme: 'exec-jilan',
    taste: 'oriental-zen',
    chromeStyle: 'gov-ceremonial',
    description: '庄重大气霁蓝双线政务母版：同心环封面、目录卡片、年度重点成效 KPI、价值链推进流程、区域落实热力图、SWOT 研判与年度部署甘特',
    enDescription: 'Dignified institutional briefing: concentric cover, card agenda, annual impact KPIs, execution chevrons, regional fulfillment heatmap, SWOT & annual Gantt',
    keywords: ['政务', '政府', '述职', '年度汇报', '工作总结', '集团', '党委', '国企', '央企', '机关', '治理', 'government', 'institutional', 'annual', 'ministry', 'governance'],
    slots: Object.freeze([
      slot(1, 'cover', 'cover', { variant: 'architectural', coverPattern: 'rings', requiredFields: ['title', 'subtitle', 'kicker'], exampleTitleZh: '2026 年度数字化治理提质增效专题汇报', exampleTitleEn: '2026 Annual Digital Governance & Public Impact Briefing', fillGuideZh: '正式汇报标题 + 汇报单位与日期', fillGuideEn: 'Formal briefing title + department & date' }),
      slot(2, 'agenda', 'agenda', { variant: 'cards', maxItems: 4, requiredFields: ['title', 'bullets'], exampleTitleZh: '汇报提纲：回顾成效、研判形势、明晰举措、抓实保障', exampleTitleEn: 'Briefing Outline: Results, Diagnosis, Initiatives & Governance', fillGuideZh: '4 大汇报章节主干', fillGuideEn: '4 structured briefing chapters' }),
      slot(3, 'achievements', 'kpi', { variant: 'spotlight', maxItems: 4, requiredFields: ['title', 'items', 'source'], exampleTitleZh: '年度核心成效：民生事项一网通办率跃升至 96.8%，群众满意度创新高', exampleTitleEn: 'Annual Impact: Online Service Fulfillment Reached 96.8%', fillGuideZh: '4 项权威量化年度成绩单', fillGuideEn: '4 quantified annual public/institutional achievements' }),
      slot(4, 'execution-chain', 'process', { variant: 'chevron', maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '全流程闭环治理体系：统筹规划—标准落地—督导考核—长效优化', exampleTitleEn: 'End-to-End Governance Loop: Plan, Standardize, Audit & Optimize', fillGuideZh: '4 个环环相扣的推进环节', fillGuideEn: '4 interlocking execution stages' }),
      slot(5, 'regional-heatmap', 'heatmap', { maxItems: 5, requiredFields: ['title', 'rows'], exampleTitleZh: '各下属单位 × 重点指标落实完成度分布矩阵', exampleTitleEn: 'Regional Units × Key Mandate Fulfillment Matrix', fillGuideZh: '各片区/单位核心任务完成百分比矩阵', fillGuideEn: 'Unit × mandate fulfillment percentage matrix' }),
      slot(6, 'swot-analysis', 'swot', { maxItems: 4, requiredFields: ['title', 'items'], exampleTitleZh: '当前形势综合研判（SWOT）：放大基础优势，严防基层薄弱环节风险', exampleTitleEn: 'Strategic Assessment (SWOT): Leveraging Strengths While Mitigating Risks', fillGuideZh: '优势(S) / 短板(W) / 机遇(O) / 挑战(T) 四维研判', fillGuideEn: 'Strengths, Weaknesses, Opportunities, Threats' }),
      slot(7, 'annual-roadmap', 'gantt', { variant: 'quarters', maxItems: 5, requiredFields: ['title', 'columns', 'items'], exampleTitleZh: '下一年度四季度重点工作节点与压茬推进表', exampleTitleEn: 'Next-Year Quarterly Milestones & Delivery Schedule', fillGuideZh: 'Q1-Q4 重点工作进度排期', fillGuideEn: 'Q1-Q4 major milestone schedule' }),
      slot(8, 'closing-cta', 'closing', { variant: 'cta-cards', maxItems: 3, requiredFields: ['title', 'subtitle', 'items'], exampleTitleZh: '下一步重点抓落实事项与恳请协调支持清单', exampleTitleEn: 'Key Implementation Commitments & Requested Support', fillGuideZh: '3 项具体落实承诺与请示事项', fillGuideEn: '3 concrete execution commitments & support items' }),
    ]),
  }),
  ...GITHUB_DISTILLED_EXEMPLARS,
})

export const CURATED_EXEMPLAR_IDS = Object.freeze(Object.keys(CURATED_EXEMPLARS))

/**
 * 读取工作区 .dsh-ppt/exemplars.json 中通过真实优质 .pptx 吸收持久化的标杆范本。
 */
function readWorkspaceExemplars(cwd, strict = false) {
  const filePath = resolve(cwd, EXEMPLAR_STORE_REL)
  if (!existsSync(filePath)) return {}
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'))
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid exemplar store')
    if (Object.hasOwn(raw, 'exemplars') && !Array.isArray(raw.exemplars)) throw new Error('Invalid exemplar entries')
    const list = Array.isArray(raw?.exemplars) ? raw.exemplars : (raw && typeof raw === 'object' ? Object.values(raw) : [])
    const map = {}
    for (const item of list) {
      if (!item || typeof item !== 'object' || !item.id || !Array.isArray(item.slots) || item.slots.length === 0) continue
      map[String(item.id)] = item
    }
    return map
  } catch (error) {
    if (strict) throw new Error('dsh-ppt：范本库格式无效或无法读取，已保留原文件，请备份并修复后重试', { cause: error })
    return {}
  }
}

export function loadWorkspaceExemplars(cwd = '.') { return readWorkspaceExemplars(cwd) }

/**
 * 持久化单份吸收自外部优质 .pptx 的标杆范本至工作区 .dsh-ppt/exemplars.json。
 */
export function saveWorkspaceExemplar(cwd = '.', exemplar) {
  if (!exemplar || typeof exemplar !== 'object' || !Array.isArray(exemplar.slots) || exemplar.slots.length === 0) {
    throw new Error('dsh-ppt：无效的范本对象（需包含至少 1 个 slots 槽位）')
  }
  const id = slugifyId(exemplar.id || exemplar.name || exemplar.sourceFile, 'custom-exemplar')
  const normalized = {
    id,
    name: String(exemplar.name || id).slice(0, 80),
    enName: String(exemplar.enName || exemplar.name || id).slice(0, 80),
    persona: String(exemplar.persona || 'consulting'),
    theme: String(exemplar.theme || 'consulting'),
    ...(exemplar.taste ? { taste: exemplar.taste } : {}),
    ...(exemplar.chromeStyle ? { chromeStyle: exemplar.chromeStyle } : {}),
    description: String(exemplar.description || `吸收自外部标杆 PPTX（${exemplar.slots.length} 页骨架）`).slice(0, 240),
    enDescription: String(exemplar.enDescription || `Absorbed benchmark PPTX exemplar (${exemplar.slots.length} slots)`).slice(0, 240),
    keywords: Array.isArray(exemplar.keywords) ? exemplar.keywords.slice(0, 16).map(String) : [],
    ...(exemplar.sourceFile ? { sourceFile: String(exemplar.sourceFile) } : {}),
    ...(exemplar.styleRecipe ? { styleRecipe: exemplar.styleRecipe } : {}),
    slots: exemplar.slots.slice(0, 30).map((s, idx) => ({
      index: idx + 1,
      role: String(s.role || s.layout || 'content'),
      layout: String(s.layout || 'cards'),
      ...(s.variant ? { variant: String(s.variant) } : {}),
      ...(s.coverPattern ? { coverPattern: String(s.coverPattern) } : {}),
      ...(s.tableStyle ? { tableStyle: String(s.tableStyle) } : {}),
      titleBudgetZh: Number(s.titleBudgetZh) || 24,
      titleBudgetEn: Number(s.titleBudgetEn) || 12,
      maxItems: Number(s.maxItems) || 4,
      requiredFields: Array.isArray(s.requiredFields) ? s.requiredFields.slice(0, 6).map(String) : ['title', 'items'],
      ...(s.exampleTitleZh ? { exampleTitleZh: String(s.exampleTitleZh).slice(0, 80) } : {}),
      ...(s.exampleTitleEn ? { exampleTitleEn: String(s.exampleTitleEn).slice(0, 100) } : {}),
      ...(s.fillGuideZh ? { fillGuideZh: String(s.fillGuideZh).slice(0, 120) } : {}),
      ...(s.fillGuideEn ? { fillGuideEn: String(s.fillGuideEn).slice(0, 140) } : {}),
    })),
    savedAt: new Date().toISOString(),
  }

  const existing = readWorkspaceExemplars(cwd, true)
  existing[id] = normalized
  const trimmed = Object.values(existing).slice(-MAX_WORKSPACE_EXEMPLARS)
  const outPath = resolve(cwd, EXEMPLAR_STORE_REL)
  writeWorkspaceJson(outPath, { schemaVersion: 1, exemplars: trimmed })
  return { exemplar: normalized, path: outPath }
}

/**
 * 列出所有内置标杆范本 + 工作区吸收范本。
 */
export function listCuratedExemplars(workspaceExemplars = {}) {
  const curated = Object.values(CURATED_EXEMPLARS).map((ex) => ({
    id: ex.id,
    name: ex.name,
    enName: ex.enName,
    persona: ex.persona,
    theme: ex.theme,
    taste: ex.taste,
    chromeStyle: ex.chromeStyle,
    slideCount: ex.slots.length,
    description: ex.description,
    enDescription: ex.enDescription,
    source: ex.provenance ? 'github-curated' : 'curated',
    ...(ex.provenance ? { provenance: ex.provenance } : {}),
    hasFewShot: true,
    layoutCadence: ex.slots.map((s) => (s.variant ? `${s.layout}[${s.variant}]` : s.layout)),
  }))
  const custom = Object.values(workspaceExemplars || {})
    .filter((ex) => ex && ex.id && !CURATED_EXEMPLARS[ex.id])
    .map((ex) => ({
      id: ex.id,
      name: ex.name || ex.id,
      enName: ex.enName || ex.name || ex.id,
      persona: ex.persona || 'consulting',
      theme: ex.theme || 'consulting',
      taste: typeof ex.taste === 'string' ? ex.taste : ex.styleRecipe?.id,
      chromeStyle: ex.chromeStyle || ex.styleRecipe?.chromeStyle,
      slideCount: Array.isArray(ex.slots) ? ex.slots.length : 0,
      description: ex.description || '',
      enDescription: ex.enDescription || ex.description || '',
      source: 'workspace',
      sourceFile: ex.sourceFile,
      layoutCadence: (ex.slots || []).map((s) => (s.variant ? `${s.layout}[${s.variant}]` : s.layout)),
    }))
  return [...curated, ...custom]
}

/**
 * 解析指定 ID 的标杆范本（支持内置 8 套与工作区吸收范本）。
 */
export function resolveExemplar(idOrObj, workspaceExemplars = {}) {
  if (!idOrObj) return null
  if (typeof idOrObj === 'object' && Array.isArray(idOrObj.slots)) return idOrObj
  const key = String(idOrObj).trim().toLowerCase()
  if (!key) return null
  if (CURATED_EXEMPLARS[key]) return CURATED_EXEMPLARS[key]
  if (workspaceExemplars && workspaceExemplars[key]) return workspaceExemplars[key]
  for (const [k, v] of Object.entries(workspaceExemplars || {})) {
    if (k.toLowerCase() === key) return v
  }
  return null
}

/**
 * 从 absorbPptx() 解析结果构建可复用的机器可读 Exemplar 槽位契约。
 */
export function extractExemplarFromAbsorbed(absorbed, options = {}) {
  if (!absorbed || typeof absorbed !== 'object') {
    throw new Error('dsh-ppt：extractExemplarFromAbsorbed 需要有效的 absorbPptx 结果')
  }
  const rawSkeleton = Array.isArray(absorbed.slideSkeleton) ? absorbed.slideSkeleton : []
  const visible = rawSkeleton.filter((s) => s && s.hidden !== true)
  const sourceFile = absorbed.sourceFile ? basename(absorbed.sourceFile) : ''
  const id = slugifyId(options.id || absorbed.styleRecipe?.id || absorbed.sanitizedBrand?.name || sourceFile, 'absorbed-exemplar')
  const name = String(options.name || absorbed.sanitizedBrand?.name || sourceFile.replace(/\.pptx$/i, '') || id).trim()

  // 当原始模板仅包含 1 页封面模板（如某些官方 .pptx 母版文件）时，以吸收的视觉 DNA 结合标准 7 页平衡骨架兜底
  const slots = visible.length >= 3
    ? visible.slice(0, 20).map((s, idx) => {
        const lay = s.inferredLayout || (idx === 0 ? 'cover' : idx === visible.length - 1 ? 'closing' : 'cards')
        const variant = s.variant || (lay === 'cover' ? (absorbed.styleRecipe?.coverVariant || 'default') : lay === 'kpi' ? (absorbed.styleRecipe?.kpiVariant || 'spotlight') : lay === 'cards' ? (absorbed.styleRecipe?.cardsVariant || 'pillars') : '')
        return {
          index: idx + 1,
          role: idx === 0 ? 'cover' : idx === visible.length - 1 && lay === 'closing' ? 'closing' : lay,
          layout: lay,
          ...(variant ? { variant } : {}),
          titleBudgetZh: lay === 'cover' ? 22 : 26,
          titleBudgetEn: lay === 'cover' ? 10 : 13,
          maxItems: lay === 'kpi' ? 4 : lay === 'matrix' || lay === 'swot' ? 4 : 4,
          requiredFields: lay === 'table' || lay === 'harvey' || lay === 'heatmap' || lay === 'marimekko' ? ['title', 'rows'] : lay === 'cover' ? ['title', 'subtitle'] : ['title', 'items'],
          ...(s.titleSample ? { exampleTitleZh: String(s.titleSample).slice(0, 64), exampleTitleEn: String(s.titleSample).slice(0, 80) } : {}),
        }
      })
    : [
        { index: 1, role: 'cover', layout: 'cover', variant: absorbed.styleRecipe?.coverVariant || 'keynote-glow', titleBudgetZh: 22, titleBudgetEn: 10, maxItems: 0, requiredFields: ['title', 'subtitle'] },
        { index: 2, role: 'exec-summary', layout: 'cards', variant: absorbed.styleRecipe?.cardsVariant || 'bento-hero', titleBudgetZh: 24, titleBudgetEn: 12, maxItems: 3, requiredFields: ['title', 'items', 'takeaway'] },
        { index: 3, role: 'metrics', layout: 'kpi', variant: absorbed.styleRecipe?.kpiVariant || 'spotlight', titleBudgetZh: 24, titleBudgetEn: 12, maxItems: 4, requiredFields: ['title', 'items'] },
        { index: 4, role: 'comparison', layout: 'comparison', variant: 'issue-action', titleBudgetZh: 24, titleBudgetEn: 12, maxItems: 4, requiredFields: ['title', 'items'] },
        { index: 5, role: 'analysis', layout: 'quadrant', titleBudgetZh: 24, titleBudgetEn: 12, maxItems: 5, requiredFields: ['title', 'items'] },
        { index: 6, role: 'roadmap', layout: 'gantt', variant: 'quarters', titleBudgetZh: 24, titleBudgetEn: 12, maxItems: 4, requiredFields: ['title', 'columns', 'items'] },
        { index: 7, role: 'closing', layout: 'closing', variant: 'cta-cards', titleBudgetZh: 22, titleBudgetEn: 10, maxItems: 3, requiredFields: ['title', 'subtitle', 'items'] },
      ]

  return {
    id,
    name,
    enName: name,
    persona: absorbed.recommendedChrome === 'academic-minimal' ? 'academic' : absorbed.recommendedChrome === 'gov-ceremonial' ? 'gov-exec' : absorbed.recommendedChrome === 'keynote-spatial' ? 'tech-pitch' : 'consulting',
    theme: absorbed.recommendedTheme || 'consulting',
    taste: absorbed.styleRecipe?.id || '',
    chromeStyle: absorbed.recommendedChrome || 'consulting-classic',
    description: `吸收自真实标杆 PPTX（${sourceFile || id} · ${visible.length} 页骨架 · ${absorbed.recommendedChrome || 'consulting-classic'}）`,
    enDescription: `Absorbed real benchmark PPTX (${sourceFile || id} · ${visible.length} slots · ${absorbed.recommendedChrome || 'consulting-classic'})`,
    keywords: [id, name.toLowerCase()],
    sourceFile,
    ...(absorbed.styleRecipe ? { styleRecipe: absorbed.styleRecipe } : {}),
    slots,
  }
}

/**
 * 批量扫描并吸收指定目录下的优质 .pptx 语料，统一写入 .dsh-ppt/exemplars.json 与 .dsh-ppt/taste-recipes.json。
 */
export async function ingestExemplarDirectory({ dirPath, cwd = '.', limit = 20, absorbFn, saveTasteFn, signal }) {
  signal?.throwIfAborted()
  if (!dirPath || typeof dirPath !== 'string') {
    throw new Error('dsh-ppt：请提供包含 .pptx 文件的目录路径 dirPath')
  }
  const absDir = resolve(cwd, dirPath)
  if (!existsSync(absDir) || !statSync(absDir).isDirectory()) {
    throw new Error('dsh-ppt：找不到目录：' + absDir)
  }
  const maxFiles = Math.max(1, Math.min(40, Math.trunc(Number(limit) || 20)))
  const files = readdirSync(absDir)
    .filter((f) => extname(f).toLowerCase() === '.pptx' && !f.startsWith('~$'))
    .sort()
    .slice(0, maxFiles)

  const absorbedList = []
  const failed = []
  for (const file of files) {
    signal?.throwIfAborted()
    const fullPath = join(absDir, file)
    try {
      const absorbed = await absorbFn({ pptxPath: fullPath, cwd: absDir, extractLogo: true, signal })
      signal?.throwIfAborted()
      const exemplar = extractExemplarFromAbsorbed(absorbed)
      const savedEx = saveWorkspaceExemplar(cwd, exemplar)
      let tastePath = ''
      if (typeof saveTasteFn === 'function' && absorbed.styleRecipe) {
        const savedTaste = saveTasteFn(cwd, absorbed.styleRecipe)
        tastePath = savedTaste?.path || ''
      }
      absorbedList.push({
        file,
        id: savedEx.exemplar.id,
        name: savedEx.exemplar.name,
        theme: savedEx.exemplar.theme,
        chromeStyle: savedEx.exemplar.chromeStyle,
        slotCount: savedEx.exemplar.slots.length,
        rhythmScore: absorbed.styleRecipe?.rhythmScore ?? null,
        exemplarPath: savedEx.path,
        tastePath,
      })
    } catch (err) {
      signal?.throwIfAborted()
      failed.push({ file, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return {
    ok: true,
    dirPath: absDir,
    scanned: files.length,
    ingestedCount: absorbedList.length,
    failedCount: failed.length,
    exemplars: absorbedList,
    failed,
  }
}

/**
 * 按用户输入语义（title / content / persona / template）自动推荐最佳标杆范本。
 */
export function matchBestExemplar({ title = '', content = '', persona = '', template = '' } = {}, workspaceExemplars = {}) {
  const tplMap = {
    pitch: 'sequoia-pitch',
    'vc-daylight': 'sequoia-pitch',
    keynote: 'stripe-product-launch',
    'product-prd': 'stripe-product-launch',
    defense: 'academic-defense',
    'medical-case': 'medical-clinical-course',
    course: 'medical-clinical-course',
    consulting: 'mckinsey-strategy',
    'industry-research': 'mckinsey-strategy',
    'quarterly-okr': 'okr-performance-review',
    weekly: 'quarterly-exec-review',
    'financial-earnings': 'daylight-earnings-research',
    'architecture-review': 'tech-arch-rfc',
    postmortem: 'tech-arch-rfc',
    'gov-report': 'gov-institutional',
    project: 'enterprise-proposal',
    workshop: 'swiss-bauhaus-workshop',
    'marketing-campaign': 'warm-brand-story',
    'creative-lookbook': 'quiet-canvas-keynote',
  }
  if (template && tplMap[template]) return CURATED_EXEMPLARS[tplMap[template]]

  const hay = `${title} ${String(content).slice(0, 1200)}`.toLowerCase()
  let best = null
  let bestScore = 0
  for (const ex of [...Object.values(CURATED_EXEMPLARS), ...Object.values(workspaceExemplars || {})]) {
    let score = 0
    if (persona && persona !== 'auto' && ex.persona === persona) score += 2
    for (const kw of ex.keywords || []) {
      if (kw && hay.includes(String(kw).toLowerCase())) score += 3
    }
    if (score > bestScore) {
      bestScore = score
      best = ex
    }
  }
  if (best && bestScore >= 3) return best
  if (persona === 'academic') return CURATED_EXEMPLARS['academic-defense']
  if (persona === 'gov-exec') return CURATED_EXEMPLARS['gov-institutional']
  if (persona === 'tech-pitch') return CURATED_EXEMPLARS['stripe-product-launch']
  if (persona === 'editorial') return CURATED_EXEMPLARS['warm-brand-story']
  return CURATED_EXEMPLARS['mckinsey-strategy']
}

/**
 * 为弱/中等模型生成极简、可直接照抄填空的「标杆范本槽位契约指南 + Few-Shot 满分 JSON 样板」（Slot-Filling Prompt Pack）。
 */
export function renderExemplarPromptGuide(exemplar, lang = 'zh') {
  if (!exemplar) return ''
  const en = lang === 'en'
  const provLine = exemplar.provenance
    ? (en
        ? `Distilled from OSS benchmark: ${exemplar.provenance.repo} (${exemplar.provenance.license})\n`
        : `开源标杆溯源：${exemplar.provenance.repo}（${exemplar.provenance.license}）\n`)
    : ''
  const tasteParam = exemplar.styleRecipe
    ? (en ? ' (custom palette & taste DNA auto-inherited from exemplar; do not pass taste unless overriding)' : '（自定义色板与品味 DNA 已由 exemplar 自动继承，无需额外传 taste）')
    : (exemplar.taste ? `, taste: "${exemplar.taste}"` : '')
  const header = en
    ? `Exemplar: ${exemplar.enName || exemplar.name} (id: "${exemplar.id}")\n${provLine}Recommended params: exemplar: "${exemplar.id}", theme: "${exemplar.theme}"${tasteParam}\nRule: Fill each slot below with a crisp Action Title (complete claim with fact/number) and structured items/rows. Do NOT collapse slots back into long bullet walls.\n`
    : `标杆范本：${exemplar.name}（id: "${exemplar.id}"）\n${provLine}推荐参数：exemplar: "${exemplar.id}", theme: "${exemplar.theme}"${tasteParam}\n填空铁律：严格按以下逐页槽位输出结构化 slides，每页标题必须为带结论/数字的 Action Title，严禁退化为连续 bullets 长文本墙。\n`

  const rows = (exemplar.slots || []).map((s) => {
    const lay = s.variant ? `${s.layout}[${s.variant}]` : s.layout
    const fields = (s.requiredFields || ['title', 'items']).join(', ')
    const exTitle = en ? (s.exampleTitleEn || s.exampleTitleZh || '') : (s.exampleTitleZh || s.exampleTitleEn || '')
    const guide = en ? (s.fillGuideEn || s.fillGuideZh || '') : (s.fillGuideZh || s.fillGuideEn || '')
    return en
      ? `  ${String(s.index).padStart(2, '0')}. [${lay}] role=${s.role} | fields: ${fields} | maxItems=${s.maxItems} | e.g. "${exTitle}"${guide ? ` — ${guide}` : ''}`
      : `  ${String(s.index).padStart(2, '0')}. [${lay}] 角色=${s.role} | 必填=${fields} | 项数≤${s.maxItems} | 标题示范：「${exTitle}」${guide ? `（${guide}）` : ''}`
  })

  const fewShots = getExemplarFewShotSlides(exemplar.id, en ? 'en' : 'zh')
  const fewShotBlock = fewShots.length > 0
    ? (en
        ? `\nFew-Shot Gold Slide JSON (mirror this exact schema & Action-Title quality with your real data):\n${JSON.stringify(fewShots, null, 2)}`
        : `\n满分 JSON 填空样板（直接仿写结构与结论标题写法，替换为真实业务数据）：\n${JSON.stringify(fewShots, null, 2)}`)
    : ''

  return header + rows.join('\n') + fewShotBlock
}

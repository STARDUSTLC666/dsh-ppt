/**
 * deck-director.mjs —— 零追问智能艺术指导（Scenario Auto-Director）、16 套行业结构蓝图、
 * Markdown 叙事节奏自动升维器（smartLayout）与 SLOP-01..10 审美门禁。
 *
 * Phase 3 升级：
 *   - 16 套场景蓝图（保留前 8 套顺序，升级 project/pitch 用上 gantt/tam/harvey，新增 8 套行业蓝图）
 *   - inferThemeFromContent 全面覆盖 18 套主题（含 keynote-light / financial-ft / medical-clean / luxury-noir）
 *   - promoteMarkdownSlides 支持自动升维 gantt / architecture / tam / org / harvey 专业图示
 *
 * 零外部运行时依赖，仅使用 Node 内置模块与同目录纯函数。
 */

import { SMART_DEFAULT_THEME, hexToHsl, relativeLuminance } from './deck-themes.mjs'
import { stripInlineMarkdown } from './deck-layouts.mjs'

export const PERSONAS = Object.freeze([
  'auto',
  'consulting',
  'tech-pitch',
  'academic',
  'gov-exec',
  'education',
  'editorial',
])

const PERSONA_SET = new Set(PERSONAS)

function fail(zh, en) {
  throw new Error('dsh-ppt：' + zh + (en ? ' / ' + en : ''))
}

/**
 * 16 套场景结构蓝图。
 * 前 8 个 ID 严格保持 ['weekly', 'defense', 'project', 'pitch', 'consulting', 'keynote', 'gov-report', 'workshop'] 向后兼容，
 * 后 8 个为 Phase 3 新增高频行业专业蓝图。
 */
export const SCENARIO_TEMPLATES = Object.freeze([
  {
    id: 'weekly',
    persona: 'consulting',
    theme: 'consulting',
    name: { zh: '工作周报', en: 'Weekly report' },
    sections: [
      {
        title: ['本周核心结果与关键指标', 'Key results and metrics this week'],
        kicker: ['01 · 核心结果', '01 · Key Results'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**核心目标达成率**：待填写本周关键指标数值与环比变化', '**里程碑按期交付**：待填写已完成上线或验收的事项数量'],
          ['**Goal attainment**: To fill: key metric value and WoW delta', '**Milestones delivered**: To fill: completed deliverables count'],
        ],
      },
      {
        title: ['重点工作进展与交付成果', 'Major workstreams and deliverables'],
        kicker: ['02 · 重点进展', '02 · Workstreams'],
        layout: 'cards',
        variant: 'pillars',
        bullets: [
          ['**主线项目推进**：待填写具体交付物、上线节点与验证数据', '**跨团队协同事项**：待填写联调结果与关键决议'],
          ['**Core workstream**: To fill: concrete outputs and verification facts', '**Cross-team sync**: To fill: integration status and decisions'],
        ],
      },
      {
        title: ['当前问题风险与应对措施', 'Risks, blockers and mitigations'],
        kicker: ['03 · 风险应对', '03 · Risks & Actions'],
        layout: 'comparison',
        variant: 'issue-action',
        bullets: [
          ['**待填写核心阻塞项或风险点**：待填写应对方案、协同方与预计解除时间'],
          ['**To fill: primary risk or blocker**: To fill: mitigation plan, owner and target date'],
        ],
      },
      {
        title: ['下周优先计划与关键节点', 'Next week priorities and milestones'],
        kicker: ['04 · 下周计划', '04 · Next Week'],
        layout: 'process',
        variant: 'steps',
        bullets: [
          ['**P0 关键交付**：待填写具体动作、负责人与截止日期', '**P1 推进事项**：待填写验证目标与资源需求'],
          ['**P0 deliverable**: To fill: specific action, owner and deadline', '**P1 initiative**: To fill: validation target and dependencies'],
        ],
      },
    ],
    closing: {
      title: ['下一步行动与责任确认', 'Next actions and owners'],
      subtitle: ['待填写：负责人和时间', 'To fill: owner and deadline'],
    },
  },
  {
    id: 'defense',
    persona: 'academic',
    theme: 'academic',
    tableStyle: 'booktabs',
    name: { zh: '论文答辩', en: 'Thesis defense' },
    sections: [
      {
        title: ['研究问题、动机与核心贡献', 'Research question, motivation and contributions'],
        kicker: ['01 · 研究问题', '01 · Motivation'],
        layout: 'cards',
        variant: 'pillars',
        bullets: [
          ['**现实痛点与理论缺口**：待填写现有方法的局限性与核心科学问题', '**本文核心贡献**：待填写理论/算法创新点与主要实验提升幅度'],
          ['**Problem & gap**: To fill: limitations of prior work and core question', '**Contributions**: To fill: methodological novelty and empirical gains'],
        ],
      },
      {
        title: ['相关研究演进与技术对比', 'Related work and positioning'],
        kicker: ['02 · 文献综述', '02 · Related Work'],
        layout: 'comparison',
        variant: 'versus',
        bullets: [
          ['**既有主流路线**：待填写代表性方法及其适用边界', '**本文方法定位**：待填写关键差异化机制与理论优势'],
          ['**Prior approaches**: To fill: representative baselines and limits', '**Proposed approach**: To fill: key architectural advantages'],
        ],
      },
      {
        title: ['研究方法与总体技术框架', 'Methodology and framework'],
        kicker: ['03 · 研究方法', '03 · Methodology'],
        layout: 'process',
        variant: 'steps',
        bullets: [
          ['**问题建模与输入表征**：待填写形式化定义与核心假设', '**核心算法模块**：待填写关键推导或模块协同机制', '**优化与复杂度保证**：待填写训练目标与收敛性说明'],
          ['**Formulation**: To fill: formal problem definition and representations', '**Core module**: To fill: algorithmic mechanism', '**Optimization**: To fill: objective and complexity bounds'],
        ],
      },
      {
        title: ['实验结果与消融分析证据', 'Experimental results and ablation study'],
        kicker: ['04 · 实验验证', '04 · Evaluation'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**主实验核心指标提升**：待填写在基准数据集上的精确数值与对比增益', '**消融实验验证结论**：待填写移除关键模块后的性能变化依据'],
          ['**Benchmark gain**: To fill: exact metric improvement over SOTA baselines', '**Ablation finding**: To fill: isolated contribution of key components'],
        ],
      },
      {
        title: ['研究结论、局限性与未来展望', 'Conclusions, limitations and future work'],
        kicker: ['05 · 结论展望', '05 · Conclusion'],
        layout: 'bullets',
        bullets: [
          ['**核心研究结论**：待填写已被实验与理论证实的关键发现', '**边界条件与未来工作**：待填写当前局限性与后续拓展方向'],
          ['**Summary of findings**: To fill: verified claims and takeaways', '**Limitations & future work**: To fill: boundary conditions and next steps'],
        ],
      },
    ],
    closing: {
      title: ['敬请各位专家评委批评指正', 'Questions and discussion'],
      subtitle: ['待填写：答辩人、导师与日期', 'To fill: candidate, advisor and date'],
    },
  },
  {
    id: 'project',
    persona: 'consulting',
    theme: 'cobalt-cream',
    name: { zh: '项目汇报', en: 'Project update' },
    sections: [
      {
        title: ['项目目标范围与核心成功指标', 'Goals, scope and success metrics'],
        kicker: ['01 · 目标范围', '01 · Goals & Scope'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**业务北极星目标**：待填写量化验收指标与基线对比', '**本期交付范围**：待填写覆盖模块与关键边界'],
          ['**North-star target**: To fill: quantitative acceptance metric', '**In-scope deliverables**: To fill: covered modules and boundaries'],
        ],
      },
      {
        title: ['阶段甘特排期与里程碑进度', 'Milestone Gantt roadmap and delivery status'],
        kicker: ['02 · 甘特排期', '02 · Gantt Roadmap'],
        layout: 'gantt',
        variant: 'months',
        columns: [
          ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
          ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
        ],
        items: [
          [
            { tag: '阶段一', title: '架构冻结与契约评审', text: '待填写完成状态', start: 0, span: 2, status: 'accent' },
            { tag: '阶段二', title: '核心研发与联调测试', text: '待填写当前进度', start: 1, span: 3 },
            { tag: '阶段三', title: '灰度发布与全量验收', text: '待填写上线目标', start: 4, span: 2 },
            { tag: '里程碑', title: '全量正式上线节点', text: '待填写验收日期', start: 5, span: 0, milestone: true, status: 'warning' },
          ],
          [
            { tag: 'Phase 1', title: 'Architecture sign-off', text: 'To fill: sign-off status', start: 0, span: 2, status: 'accent' },
            { tag: 'Phase 2', title: 'Core build & integration', text: 'To fill: build progress', start: 1, span: 3 },
            { tag: 'Phase 3', title: 'Canary & GA rollout', text: 'To fill: launch criteria', start: 4, span: 2 },
            { tag: 'Milestone', title: 'GA Launch Sign-off', text: 'To fill: target date', start: 5, span: 0, milestone: true, status: 'warning' },
          ],
        ],
        bullets: [
          ['**阶段一（方案冻结）**：待填写完成状态与评审结论', '**阶段二（研发联调）**：待填写当前进度与核心产出'],
          ['**Phase 1 (Design)**: To fill: sign-off status', '**Phase 2 (Build)**: To fill: integration progress'],
        ],
      },
      {
        title: ['关键验证数据与业务成效证据', 'Validation metrics and empirical evidence'],
        kicker: ['03 · 数据证据', '03 · Evidence'],
        layout: 'cards',
        variant: 'bento',
        bullets: [
          ['**性能与质量表现**：待填写压测/线上实测数值与数据源', '**用户或业务反馈**：待填写试点验证结论与案例依据'],
          ['**System performance**: To fill: measured latency, quality or adoption data', '**Pilot feedback**: To fill: verified user or business impact'],
        ],
      },
      {
        title: ['关键风险识别与待拍板事项', 'Risks and required decisions'],
        kicker: ['04 · 风险决策', '04 · Decisions'],
        layout: 'comparison',
        variant: 'issue-action',
        bullets: [
          ['**待填写跨部门依赖或风险项**：待填写建议决策方案与拍板时点'],
          ['**To fill: dependency or risk**: To fill: recommended option and decision deadline'],
        ],
      },
      {
        title: ['下一步行动路线与资源保障', 'Next steps and resource plan'],
        kicker: ['05 · 下一步', '05 · Next Steps'],
        layout: 'bullets',
        bullets: [
          ['**近期关键动作**：待填写具体执行项、责任人与完成时间'],
          ['**Immediate next step**: To fill: concrete action, owner and date'],
        ],
      },
    ],
    closing: {
      title: ['关键决策确认与推进时间表', 'Decision sign-off and timeline'],
      subtitle: ['待填写：项目负责人与汇报日期', 'To fill: project lead and date'],
    },
  },
  {
    id: 'pitch',
    persona: 'tech-pitch',
    theme: 'linear-dark',
    name: { zh: '项目路演', en: 'Pitch deck' },
    sections: [
      {
        title: ['目标客户面临的高频刚性痛点', 'High-frequency customer pain point'],
        kicker: ['01 · 用户痛点', '01 · Problem'],
        layout: 'cards',
        variant: 'pillars',
        bullets: [
          ['**存量方案效率瓶颈**：待填写客户当前付出的时间或资金成本事实', '**未被满足的结构机会**：待填写技术或市场拐点依据'],
          ['**Incumbent bottleneck**: To fill: quantified time/cost pain today', '**Why now**: To fill: structural market or technology catalyst'],
        ],
      },
      {
        title: ['核心产品方案与代际体验优势', 'Product solution and 10x advantage'],
        kicker: ['02 · 解决方案', '02 · Solution'],
        layout: 'comparison',
        variant: 'before-after',
        bullets: [
          ['**传统工作流**：待填写多步割裂流程与高昂交付门槛', '**我们的新范式**：待填写核心产品机制与端到端提效结果'],
          ['**Legacy workflow**: To fill: fragmented manual steps', '**Our solution**: To fill: core product workflow and speedup'],
        ],
      },
      {
        title: ['产品验证指标与早期增长证据', 'Traction, retention and proof points'],
        kicker: ['03 · 增长证据', '03 · Traction'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**核心活跃或留存指标**：待填写实测留存率、ARR 或标杆客户数', '**单位经济与交付效率**：待填写毛利率、CAC 回收期或交互转化率'],
          ['**Core traction**: To fill: verified ARR, retention or design partners', '**Unit economics**: To fill: gross margin or payback period'],
        ],
      },
      {
        title: ['可触达市场空间 TAM / SAM / SOM 测算', 'Addressable market sizing (TAM / SAM / SOM)'],
        kicker: ['04 · 市场空间', '04 · Market Sizing'],
        layout: 'tam',
        variant: 'concentric',
        items: [
          [
            { tag: 'TAM', value: '待填写规模', title: '全球总体可触达市场', text: '待填写行业总支出测算口径' },
            { tag: 'SAM', value: '待填写规模', title: '核心可服务目标市场', text: '待填写聚焦行业与区域细分' },
            { tag: 'SOM', value: '待填写规模', title: '三年可获取目标份额', text: '待填写自下而上客户转化目标' },
          ],
          [
            { tag: 'TAM', value: 'To fill', title: 'Total addressable market', text: 'To fill: global category spend' },
            { tag: 'SAM', value: 'To fill', title: 'Serviceable addressable market', text: 'To fill: target segments and geographies' },
            { tag: 'SOM', value: 'To fill', title: 'Serviceable obtainable market', text: 'To fill: 3-year bottom-up capture' },
          ],
        ],
        bullets: [
          ['**TAM**：待填写总体市场测算', '**SAM**：待填写可服务市场', '**SOM**：待填写近期可获取份额'],
          ['**TAM**: To fill: total market', '**SAM**: To fill: serviceable market', '**SOM**: To fill: obtainable share'],
        ],
      },
      {
        title: ['竞争格局评估与核心技术壁垒', 'Competitive landscape and differentiation'],
        kicker: ['05 · 竞争矩阵', '05 · Competition'],
        layout: 'harvey',
        rows: [
          [
            ['评估维度', '本方案', '传统软件', '通用点工具'],
            ['端到端自动化', '●', '◔', '◑'],
            ['企业级合规部署', '●', '●', '○'],
            ['实施交付周期', '●', '○', '◕'],
            ['待填写核心优势', '●', '◑', '◔'],
          ],
          [
            ['Capability', 'Ours', 'Legacy Suite', 'Point Tools'],
            ['End-to-end automation', '●', '◔', '◑'],
            ['Enterprise compliance', '●', '●', '○'],
            ['Deployment velocity', '●', '○', '◕'],
            ['To fill: differentiator', '●', '◑', '◔'],
          ],
        ],
        bullets: [
          ['**本方案差异化**：待填写相对传统厂商与点工具的核心优势'],
          ['**Our moat**: To fill: core advantages vs incumbents'],
        ],
      },
      {
        title: ['里程碑路线图与本轮融资规划', 'Roadmap and financing plan'],
        kicker: ['06 · 融资规划', '06 · Roadmap & Ask'],
        layout: 'process',
        variant: 'timeline',
        bullets: [
          ['**未来 6 个月目标**：待填写产品迭代与商业化关键指标', '**未来 12–18 个月目标**：待填写规模化扩张节点与资金用途分配'],
          ['**6-month milestone**: To fill: product & revenue targets', '**12–18 month milestone**: To fill: scale targets and use of funds'],
        ],
      },
    ],
    closing: {
      title: ['携手共建下一代行业基础设施', 'Partner with us'],
      subtitle: ['待填写：创始人联系方式与本轮需求', 'To fill: founder contact and ask'],
    },
  },
  {
    id: 'consulting',
    persona: 'consulting',
    theme: 'consulting',
    name: { zh: '战略咨询方案', en: 'Executive strategy' },
    sections: [
      {
        title: ['管理层核心结论与三大战略抓手', 'Executive summary and strategic pillars'],
        kicker: ['01 · 核心结论', '01 · Executive Summary'],
        layout: 'cards',
        variant: 'exec-summary',
        bullets: [
          ['**第一战略支柱**：待填写关键举措与预期量化收益', '**第二战略支柱**：待填写组织或产品结构升级抓手', '**第三战略支柱**：待填写风险控制与底线保障机制'],
          ['**Pillar 1**: To fill: core lever and quantified impact', '**Pillar 2**: To fill: operating or product transformation', '**Pillar 3**: To fill: governance and risk guardrails'],
        ],
      },
      {
        title: ['经营现状诊断与核心差距拆解', 'Current-state diagnosis and gap analysis'],
        kicker: ['02 · 现状诊断', '02 · Diagnosis'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**核心经营差距**：待填写当前基线指标与行业标杆差值', '**关键利润/效率漏损点**：待填写归因拆解数据与来源'],
          ['**Benchmark gap**: To fill: current baseline vs top-quartile peer', '**Value leakage**: To fill: root-cause driver quantification'],
        ],
      },
      {
        title: ['战略机会优先级评估四象限', 'Initiative prioritization matrix'],
        kicker: ['03 · 优先级矩阵', '03 · Prioritization'],
        layout: 'matrix',
        variant: '2x2',
        bullets: [
          ['**速赢举措（高收益·低难度）**：待填写 90 天内可兑现项目', '**战略攻坚（高收益·高难度）**：待填写中长期核心投入项', '**选择性优化（低收益·低难度）**：待填写标准化微调事项', '**暂缓投入（低收益·高难度）**：待填写明确收缩边界'],
          ['**Quick wins**: To fill: high-impact 90-day actions', '**Strategic bets**: To fill: multi-quarter investments', '**Tactical fixes**: To fill: low-effort improvements', '**Deprioritize**: To fill: explicitly paused scope'],
        ],
      },
      {
        title: ['分阶段落地路线图与治理机制', 'Phased implementation roadmap'],
        kicker: ['04 · 落地路线', '04 · Roadmap'],
        layout: 'process',
        variant: 'timeline',
        bullets: [
          ['**第一阶段（止血速赢）**：待填写关键里程碑与责任部门', '**第二阶段（体系扩面）**：待填写机制固化与指标跃升目标', '**第三阶段（规模兑现）**：待填写全面财务与经营产出'],
          ['**Wave 1 (Quick wins)**: To fill: 0–3 month deliverables', '**Wave 2 (Scale)**: To fill: 3–9 month operating rollout', '**Wave 3 (Capture)**: To fill: full run-rate impact'],
        ],
      },
    ],
    closing: {
      title: ['近期拍板事项与百日行动起点', 'Immediate decisions and 100-day kickoff'],
      subtitle: ['待填写：项目组与汇报日期', 'To fill: engagement team and date'],
    },
  },
  {
    id: 'keynote',
    persona: 'tech-pitch',
    theme: 'linear-dark',
    name: { zh: '产品发布会', en: 'Product keynote' },
    sections: [
      {
        title: ['重新定义行业核心体验标准', 'Redefining the category standard'],
        kicker: ['01 · 时代命题', '01 · The Shift'],
        layout: 'statement',
        bullets: [
          ['待填写：用一句振聋发聩的核心主张概括本次发布的变革意义'],
          ['To fill: one bold, verifiable thesis statement defining this launch'],
        ],
      },
      {
        title: ['三大核心特性带来代际跃迁', 'Three breakthrough capabilities'],
        kicker: ['02 · 核心特性', '02 · Capabilities'],
        layout: 'cards',
        variant: 'bento',
        bullets: [
          ['**旗舰能力一**：待填写核心技术突破与直观用户收益', '**旗舰能力二**：待填写工作流自动化或体验细节', '**旗舰能力三**：待填写安全、生态或跨端协同能力'],
          ['**Capability 1**: To fill: flagship breakthrough and user benefit', '**Capability 2**: To fill: workflow speed or craft detail', '**Capability 3**: To fill: ecosystem, security or reliability'],
        ],
      },
      {
        title: ['实测性能与生产效率跃升表现', 'Verified benchmark performance'],
        kicker: ['03 · 实测表现', '03 · Benchmarks'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**端到端速度提升**：待填写实测倍率与测试基准说明', '**综合成本下降**：待填写资源节省比例与真实场景验证'],
          ['**Throughput gain**: To fill: measured speedup and benchmark setup', '**Cost reduction**: To fill: verified efficiency improvement'],
        ],
      },
      {
        title: ['开放路线图与正式上线计划', 'Availability and release timeline'],
        kicker: ['04 · 发布计划', '04 · Availability'],
        layout: 'process',
        variant: 'steps',
        bullets: [
          ['**今日开放体验**：待填写立即可用的版本范围与接入方式', '**下阶段生态扩展**：待填写企业版/API/插件开放时间表'],
          ['**Available today**: To fill: GA scope and onboarding entry', '**Coming next**: To fill: SDK/enterprise rollout schedule'],
        ],
      },
    ],
    closing: {
      title: ['立即开启全新体验', 'Available starting today'],
      subtitle: ['待填写：访问地址、发布团队与日期', 'To fill: URL, product team and date'],
    },
  },
  {
    id: 'gov-report',
    persona: 'gov-exec',
    theme: 'exec-jilan',
    name: { zh: '政务与述职汇报', en: 'Executive & public-sector report' },
    sections: [
      {
        title: ['年度总体履职成效与核心指标完成情况', 'Overall performance and key target completion'],
        kicker: ['第一部分 · 总体成效', 'Part I · Overall Results'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**年度重点任务完成率**：待填写考核指标达成数值与同比增幅', '**专项攻坚标志性成果**：待填写获批示范、惠及范围或节约成效'],
          ['**Target completion**: To fill: annual KPI attainment and YoY change', '**Flagship outcome**: To fill: verified service or governance impact'],
        ],
      },
      {
        title: ['重点专项工作推进举措与制度建设', 'Key initiatives and institutional mechanisms'],
        kicker: ['第二部分 · 重点举措', 'Part II · Key Initiatives'],
        layout: 'cards',
        variant: 'pillars',
        bullets: [
          ['**主责主业扎实落地**：待填写核心业务推进台账与典型案例', '**机制创新与数字赋能**：待填写流程精简成效与跨部门协同做法', '**作风建设与风险防控**：待填写合规督查、安全生产与底线保障情况'],
          ['**Core mandate delivery**: To fill: key program execution facts', '**Process modernization**: To fill: service streamlining outcomes', '**Compliance & safety**: To fill: audit and risk control measures'],
        ],
      },
      {
        title: ['检视查摆突出问题与整改落实台账', 'Identified gaps and rectification ledger'],
        kicker: ['第三部分 · 检视整改', 'Part III · Rectification'],
        layout: 'comparison',
        variant: 'issue-action',
        bullets: [
          ['**待填写基层调研或考核反映的薄弱环节**：待填写立行立改措施、责任处室与办结时限'],
          ['**To fill: identified bottleneck**: To fill: corrective measure, responsible unit and deadline'],
        ],
      },
      {
        title: ['下一阶段重点工作部署与保障措施', 'Next-phase priorities and safeguards'],
        kicker: ['第四部分 · 下步部署', 'Part IV · Work Plan'],
        layout: 'process',
        variant: 'steps',
        bullets: [
          ['**抓牢首要任务落实**：待填写一季度起步冲刺目标与量化抓手', '**深化重点领域改革**：待填写攻坚清单与时间节点', '**压实责任闭环督办**：待填写考核评价与跟踪问效机制'],
          ['**Priority 1**: To fill: Q1 execution targets', '**Priority 2**: To fill: key reform milestones', '**Safeguards**: To fill: accountability and tracking cadence'],
        ],
      },
    ],
    closing: {
      title: ['凝心聚力抓落实 · 实干担当促发展', 'Committed execution for measurable impact'],
      subtitle: ['待填写：汇报单位与日期', 'To fill: reporting department and date'],
    },
  },
  {
    id: 'workshop',
    persona: 'education',
    theme: 'course-sage',
    name: { zh: '培训与课程工坊', en: 'Training & workshop' },
    sections: [
      {
        title: ['本节学习目标与核心能力收获', 'Learning objectives and takeaways'],
        kicker: ['01 · 学习目标', '01 · Objectives'],
        layout: 'callout',
        variant: 'takeaways',
        bullets: [
          ['**核心概念掌握**：待填写学员课后能够准确辨析的关键原理', '**实操技能迁移**：待填写学员能够独立完成的标准动作或工具应用'],
          ['**Conceptual mastery**: To fill: core principle learners will explain', '**Practical skill**: To fill: hands-on workflow learners will execute'],
        ],
      },
      {
        title: ['核心知识框架与关键概念拆解', 'Core framework and concept breakdown'],
        kicker: ['02 · 知识精讲', '02 · Core Concepts'],
        layout: 'cards',
        variant: 'pillars',
        bullets: [
          ['**模块一（基础认知）**：待填写定义、适用前提与典型示例', '**模块二（进阶方法）**：待填写判断标准与组合策略'],
          ['**Module 1 (Foundation)**: To fill: definition and real-world example', '**Module 2 (Method)**: To fill: decision criteria and patterns'],
        ],
      },
      {
        title: ['常见误区辨析与标准实践对照', 'Common pitfalls vs best practices'],
        kicker: ['03 · 误区辨析', '03 · Do & Don’t'],
        layout: 'comparison',
        variant: 'do-dont',
        bullets: [
          ['**高频错误做法**：待填写新手容易踩坑的操作及其后果', '**推荐标准范式**：待填写经过验证的高效步骤与检查清单'],
          ['**Common mistake**: To fill: anti-pattern and failure mode', '**Best practice**: To fill: recommended repeatable checklist'],
        ],
      },
      {
        title: ['现场实战演练步骤与复盘清单', 'Hands-on exercise and review steps'],
        kicker: ['04 · 实战演练', '04 · Exercise'],
        layout: 'process',
        variant: 'steps',
        bullets: [
          ['**第一步（情境输入）**：待填写练习任务背景与给定素材', '**第二步（分组实操）**：待填写限时产出要求与协作规则', '**第三步（点评复盘）**：待填写自检标准与课后作业安排'],
          ['**Step 1 (Setup)**: To fill: scenario prompt and materials', '**Step 2 (Practice)**: To fill: timeboxed deliverable', '**Step 3 (Debrief)**: To fill: rubric and follow-up assignment'],
        ],
      },
    ],
    closing: {
      title: ['课后实践行动与答疑交流', 'Action checklist & Q&A'],
      subtitle: ['待填写：讲师姓名与课程日期', 'To fill: instructor and session date'],
    },
  },

  // --- Phase 3: 8 New High-Taste Industry Blueprints (indices 8..15) ---
  {
    id: 'architecture-review',
    persona: 'tech-pitch',
    theme: 'cobalt-cream',
    name: { zh: '技术架构评审', en: 'Architecture review' },
    sections: [
      {
        title: ['系统非功能目标与 SLA 核心约束', 'Non-functional targets and SLA constraints'],
        kicker: ['01 · 架构目标', '01 · Architecture Goals'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**可用性与 P99 延迟**：待填写 SLA 目标与峰值 QPS 基线', '**单请求成本与扩展比**：待填写资源利用率目标'],
          ['**Availability & P99**: To fill: target SLA and peak QPS', '**Unit cost & scale**: To fill: efficiency target'],
        ],
      },
      {
        title: ['分层系统架构拓扑与横切治理底座', 'Layered system architecture and cross-cutting governance'],
        kicker: ['02 · 总体架构', '02 · System Architecture'],
        layout: 'architecture',
        variant: 'layered',
        items: [
          [
            { tag: '接入层', title: '统一 API 网关与流量调度', bullets: ['多活路由', '限流熔断', '待填写协议适配'] },
            { tag: '领域层', title: '核心业务微服务集群', bullets: ['事件驱动总线', 'CQRS 读写分离', '状态机引擎'] },
            { tag: '数据层', title: '分布式存储与实时数仓', bullets: ['多级缓存', '列式分析', '冷热分层'] },
            { tag: '横切面', title: '可观测性与零信任安全', status: 'accent', bullets: ['全链路追踪', 'RBAC 鉴权', '合规审计'] },
          ],
          [
            { tag: 'Edge', title: 'API Gateway & Traffic Routing', bullets: ['Multi-region failover', 'Rate limiting', 'To fill: ingress'] },
            { tag: 'Domain', title: 'Core Microservices Mesh', bullets: ['Event bus', 'CQRS read/write split', 'Workflow engine'] },
            { tag: 'Data', title: 'Distributed Storage & Lakehouse', bullets: ['Tiered cache', 'Columnar OLAP', 'Hot/cold tiering'] },
            { tag: 'Cross-cutting', title: 'Observability & Zero-Trust', status: 'accent', bullets: ['Distributed tracing', 'mTLS & RBAC', 'Audit log'] },
          ],
        ],
        bullets: [
          ['**核心架构分层**：待填写网关、领域服务与存储选型依据'],
          ['**Architecture layers**: To fill: gateway, domain and storage decisions'],
        ],
      },
      {
        title: ['关键技术选型对比与权衡矩阵', 'Technology trade-off matrix'],
        kicker: ['03 · 选型权衡', '03 · Trade-offs'],
        layout: 'harvey',
        rows: [
          [
            ['评估维度', '推荐方案 A', '备选方案 B', '存量方案'],
            ['高并发吞吐表现', '●', '◕', '◑'],
            ['跨区容灾一致性', '●', '◑', '○'],
            ['研发与运维复杂度', '◕', '◑', '●'],
            ['待填写关键约束', '●', '◔', '○'],
          ],
          [
            ['Criterion', 'Option A (Recommended)', 'Option B', 'Legacy'],
            ['Peak throughput', '●', '◕', '◑'],
            ['Multi-region consistency', '●', '◑', '○'],
            ['Operational simplicity', '◕', '◑', '●'],
            ['To fill: key constraint', '●', '◔', '○'],
          ],
        ],
        bullets: [
          ['**选型结论**：待填写最终采纳方案与回退边界'],
          ['**Decision**: To fill: selected stack and rollback guardrails'],
        ],
      },
      {
        title: ['平滑演进排期与灰度切换计划', 'Migration Gantt and cutover schedule'],
        kicker: ['04 · 演进排期', '04 · Cutover Plan'],
        layout: 'gantt',
        variant: 'weeks',
        columns: [
          ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
          ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
        ],
        items: [
          [
            { tag: '双写验证', title: '影子流量压测与对账', text: '待填写负责人', start: 0, span: 2, status: 'accent' },
            { tag: '灰度切流', title: '按租户分批切流 10%→50%', text: '待填写监控指标', start: 2, span: 2 },
            { tag: '全量下线', title: '旧链路摘除与容量收敛', text: '待填写验收日期', start: 4, span: 2 },
          ],
          [
            { tag: 'Shadow', title: 'Shadow traffic & reconciliation', text: 'To fill: owner', start: 0, span: 2, status: 'accent' },
            { tag: 'Canary', title: 'Tenant-scoped cutover 10%→50%', text: 'To fill: SLO gates', start: 2, span: 2 },
            { tag: 'Decommission', title: 'Legacy teardown & cost trim', text: 'To fill: target date', start: 4, span: 2 },
          ],
        ],
        bullets: [
          ['**灰度切换**：待填写影子验证与回滚 SLO 阈值'],
          ['**Cutover**: To fill: shadow validation and rollback thresholds'],
        ],
      },
    ],
    closing: {
      title: ['架构评审决议与风险备忘确认', 'ARB sign-off and action items'],
      subtitle: ['待填写：架构师姓名与评审委员会日期', 'To fill: lead architect and review date'],
    },
  },
  {
    id: 'financial-earnings',
    persona: 'consulting',
    theme: 'financial-ft',
    name: { zh: '季度财报与业绩会', en: 'Quarterly earnings' },
    sections: [
      {
        title: ['核心财务表现全面超预期，盈利质量持续改善', 'Financial highlights beat consensus with expanding margins'],
        kicker: ['01 · 业绩摘要', '01 · Financial Highlights'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**季度总营收**：待填写营收规模与 YoY/QoQ 增速', '**Non-GAAP 营业利润率**：待填写利润率变化 bps', '**自由现金流 FCF**：待填写现金流表现与转化率'],
          ['**Total Revenue**: To fill: revenue and YoY/QoQ growth', '**Operating Margin**: To fill: Non-GAAP margin bps expansion', '**Free Cash Flow**: To fill: FCF and conversion rate'],
        ],
      },
      {
        title: ['分业务板块收入结构与增长驱动拆解', 'Segment revenue mix and growth drivers'],
        kicker: ['02 · 板块拆解', '02 · Segment Breakdown'],
        layout: 'cards',
        variant: 'bento',
        bullets: [
          ['**核心主业引擎**：待填写贡献占比与高毛利订阅/复购表现', '**新兴增长曲线**：待填写同比翻倍业务与商业化里程碑', '**区域市场贡献**：待填写重点区域增速与客单价提升'],
          ['**Core franchise**: To fill: share of revenue and retention', '**Growth engine**: To fill: scaling products and attach rate', '**Geographic mix**: To fill: regional momentum and ASP'],
        ],
      },
      {
        title: ['损益表关键科目同比与环比明细', 'Consolidated P&L summary'],
        kicker: ['03 · 财务明细', '03 · P&L Summary'],
        layout: 'table',
        rows: [
          [
            ['财务科目', '本期实际', '去年同期', '同比变动', '指引达成'],
            ['总营收', '待填写', '待填写', '待填写', '超预期'],
            ['毛利 / 毛利率', '待填写', '待填写', '待填写', '改善'],
            ['研发与营销费用率', '待填写', '待填写', '待填写', '收敛'],
            ['净利润 / EPS', '待填写', '待填写', '待填写', '达标'],
          ],
          [
            ['Line Item', 'Actual', 'Prior Year', 'YoY Delta', 'vs Guidance'],
            ['Total Revenue', 'To fill', 'To fill', 'To fill', 'Beat'],
            ['Gross Profit / Margin', 'To fill', 'To fill', 'To fill', 'Expanded'],
            ['OpEx Ratio', 'To fill', 'To fill', 'To fill', 'Leveraged'],
            ['Net Income / EPS', 'To fill', 'To fill', 'To fill', 'Beat'],
          ],
        ],
        bullets: [
          ['**费用率杠杆**：待填写研发与销售费用率优化幅度'],
          ['**Operating leverage**: To fill: OpEx discipline highlights'],
        ],
      },
      {
        title: ['下一季度与全年财务指引更新', 'Q+1 and full-year financial guidance'],
        kicker: ['04 · 业绩指引', '04 · Guidance'],
        layout: 'comparison',
        variant: 'before-after',
        bullets: [
          ['**此前全年指引区间**：待填写原营收与利润率预期口径', '**上调后最新指引**：待填写新指引区间与核心增长假设'],
          ['**Prior FY guidance**: To fill: previous revenue and margin range', '**Updated FY guidance**: To fill: raised outlook and key assumptions'],
        ],
      },
    ],
    closing: {
      title: ['投资者关系答疑与前瞻性声明', 'Investor Q&A and safe harbor'],
      subtitle: ['待填写：CFO / IR 联系方式与财报季日期', 'To fill: CFO / IR contact and quarter'],
    },
  },
  {
    id: 'medical-case',
    persona: 'academic',
    theme: 'medical-clean',
    tableStyle: 'booktabs',
    name: { zh: '临床病例与学术研讨', en: 'Clinical case review' },
    sections: [
      {
        title: ['患者主诉、基线体征与关键检验指标', 'Patient presentation and baseline clinical metrics'],
        kicker: ['01 · 病例基线', '01 · Presentation'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**基线生理与评分**：待填写年龄性别、主诉病程与核心临床评分', '**关键影像/实验室异常**：待填写阳性指标与参考区间对比'],
          ['**Baseline profile**: To fill: demographics, onset and clinical score', '**Key biomarkers**: To fill: abnormal labs and imaging findings'],
        ],
      },
      {
        title: ['鉴别诊断思路与循证排除路径', 'Differential diagnosis and workup pathway'],
        kicker: ['02 · 鉴别诊断', '02 · Differential'],
        layout: 'process',
        variant: 'steps',
        bullets: [
          ['**初筛核心假设**：待填写首要怀疑病因与病理机制', '**关键检查排除**：待填写影像学/病理/基因检测排除依据', '**最终确诊结论**：待填写明确分期分级与危险度分层'],
          ['**Initial hypothesis**: To fill: primary suspected etiology', '**Diagnostic workup**: To fill: imaging, biopsy or biomarker exclusion', '**Confirmed diagnosis**: To fill: staging and risk stratification'],
        ],
      },
      {
        title: ['治疗方案选择与随访疗效对照表', 'Treatment regimen and longitudinal outcomes'],
        kicker: ['03 · 疗效评估', '03 · Outcomes'],
        layout: 'table',
        rows: [
          [
            ['随访阶段', '主要干预措施', '关键生化/影像指标', '不良反应'],
            ['基线期 (W0)', '待填写初始方案', '待填写基线数值', '无'],
            ['中期评估 (W12)', '待填写剂量调整', '待填写改善幅度', '待填写分级'],
            ['终点随访 (W24)', '待填写维持治疗', '待填写缓解结论', '可耐受'],
          ],
          [
            ['Timepoint', 'Intervention', 'Primary Endpoint', 'Safety / AE'],
            ['Baseline (W0)', 'To fill: initial regimen', 'To fill: baseline value', 'None'],
            ['Interim (W12)', 'To fill: titration', 'To fill: response delta', 'To fill: grade'],
            ['Endpoint (W24)', 'To fill: maintenance', 'To fill: remission status', 'Tolerable'],
          ],
        ],
        bullets: [
          ['**疗效结论**：待填写主要终点达成情况与指南对照'],
          ['**Clinical outcome**: To fill: primary endpoint vs guideline benchmark'],
        ],
      },
      {
        title: ['病例临床启示与规范化诊疗建议', 'Clinical pearls and practice recommendations'],
        kicker: ['04 · 临床启示', '04 · Clinical Pearls'],
        layout: 'callout',
        variant: 'takeaways',
        bullets: [
          ['**早诊早治关键窗口**：待填写高危预警信号与误诊防范要点', '**多学科 MDT 协同经验**：待填写药学/影像/外科联合决策收获'],
          ['**Early recognition**: To fill: red-flag signs and diagnostic pitfalls', '**MDT coordination**: To fill: multidisciplinary takeaways'],
        ],
      },
    ],
    closing: {
      title: ['病例讨论总结与专家点评交流', 'Discussion and peer review'],
      subtitle: ['待填写：主治医师、科室与研讨日期', 'To fill: attending physician, department and date'],
    },
  },
  {
    id: 'postmortem',
    persona: 'tech-pitch',
    theme: 'consulting',
    name: { zh: '线上故障复盘', en: 'Incident postmortem' },
    sections: [
      {
        title: ['故障定级、影响面与恢复时长核心指标', 'Incident severity, blast radius and MTTR metrics'],
        kicker: ['01 · 影响概览', '01 · Impact Summary'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**影响时长与 MTTR**：待填写故障持续分钟数与发现/止血耗时', '**受影响请求与客户面**：待填写错误率峰值与 SLA 扣减评估'],
          ['**Duration & MTTR**: To fill: total minutes and TTD/TTM', '**Blast radius**: To fill: impacted requests and customer tier'],
        ],
      },
      {
        title: ['故障演进时间线与关键处置节点', 'Incident timeline and response milestones'],
        kicker: ['02 · 事件时间线', '02 · Timeline'],
        layout: 'process',
        variant: 'timeline',
        bullets: [
          ['**T+00 变更触发**：待填写发布/配置变更或流量异常起点', '**T+XX 告警发现**：待填写监控告警触发与值班响应', '**T+YY 止血恢复**：待填写回滚/限流措施与全量恢复验证'],
          ['**T+00 Trigger**: To fill: deployment or traffic anomaly onset', '**T+XX Detection**: To fill: alert firing and triage start', '**T+YY Mitigation**: To fill: rollback and full recovery'],
        ],
      },
      {
        title: ['故障传播链路与架构单点根因定位', 'Failure propagation and root-cause architecture'],
        kicker: ['03 · 根因链路', '03 · Root Cause'],
        layout: 'architecture',
        variant: 'layered',
        items: [
          [
            { tag: '触发层', title: '上游变更或突发流量注入', bullets: ['待填写直接诱因'] },
            { tag: '放大层', title: '重试风暴与连接池耗尽', bullets: ['缺少熔断隔离', '超时配置放大'] },
            { tag: '受损层', title: '核心数据库或下游依赖雪崩', bullets: ['待填写瓶颈资源'] },
            { tag: '盲区', title: '监控与变更门禁缺失', status: 'accent', bullets: ['待填写可观测盲区'] },
          ],
          [
            { tag: 'Trigger', title: 'Upstream change or traffic spike', bullets: ['To fill: immediate trigger'] },
            { tag: 'Amplifier', title: 'Retry storm & pool exhaustion', bullets: ['Missing circuit breaker', 'Unbounded timeout'] },
            { tag: 'Impact', title: 'Core DB or downstream saturation', bullets: ['To fill: bottleneck'] },
            { tag: 'Gap', title: 'Guardrail & telemetry blindspot', status: 'accent', bullets: ['To fill: detection gap'] },
          ],
        ],
        bullets: [
          ['**5-Why 根因结论**：待填写深层制度与架构诱因'],
          ['**5-Why summary**: To fill: systemic root cause'],
        ],
      },
      {
        title: ['暴露短板与永久性工程改进举措', 'Identified gaps and corrective action items'],
        kicker: ['04 · 整改闭环', '04 · Action Items'],
        layout: 'comparison',
        variant: 'issue-action',
        bullets: [
          ['**待填写暴露出的工程隐患**：待填写 P0/P1 永久整改项、负责人与 DDL'],
          ['**To fill: systemic weakness**: To fill: P0/P1 permanent fix, owner and due date'],
        ],
      },
    ],
    closing: {
      title: ['以无指责文化筑牢系统高可用防线', 'Blameless learning into resilient systems'],
      subtitle: ['待填写：复盘负责人、SRE 团队与日期', 'To fill: incident commander, team and date'],
    },
  },
  {
    id: 'marketing-campaign',
    persona: 'editorial',
    theme: 'bold',
    name: { zh: '品牌营销与增长战役', en: 'Marketing campaign' },
    sections: [
      {
        title: ['战役核心主张与用户心智穿透点', 'Campaign thesis and audience hook'],
        kicker: ['01 · 创意主张', '01 · Core Hook'],
        layout: 'statement',
        bullets: [
          ['待填写：用一句话提炼本次品牌/增长战役打动目标人群的核心情感与利益点'],
          ['To fill: one memorable campaign positioning hook for the target audience'],
        ],
      },
      {
        title: ['目标客群规模与高潜人群分层定位', 'Audience sizing and priority segment focus'],
        kicker: ['02 · 受众分层', '02 · Audience Sizing'],
        layout: 'tam',
        variant: 'concentric',
        items: [
          [
            { tag: '泛触达', value: '待填写人群量级', title: '品类潜在关注受众', text: '待填写媒介触达基数' },
            { tag: '核心群', value: '待填写人群量级', title: '高匹配核心消费群', text: '待填写痛点强共鸣人群' },
            { tag: '种子池', value: '待填写转化目标', title: '首波转化与裂变种子', text: '待填写老客与精准线索' },
          ],
          [
            { tag: 'Broad', value: 'To fill', title: 'Category-aware reach', text: 'To fill: paid & social universe' },
            { tag: 'Core', value: 'To fill', title: 'High-intent target segment', text: 'To fill: ICP demographic' },
            { tag: 'Seed', value: 'To fill', title: 'Launch conversion cohort', text: 'To fill: advocates & warm leads' },
          ],
        ],
        bullets: [
          ['**人群聚焦**：待填写各圈层人群画像与媒介触达策略'],
          ['**Targeting**: To fill: segment personas and channel mix'],
        ],
      },
      {
        title: ['全链路投放转化漏斗与 ROI 目标', 'Full-funnel conversion targets and ROI'],
        kicker: ['03 · 转化漏斗', '03 · Conversion Funnel'],
        layout: 'process',
        variant: 'funnel',
        items: [
          [
            { tag: '曝光触达', title: '多渠道声量引爆', value: '待填写目标', delta: 'CTR 预期' },
            { tag: '留资互动', title: '落地页与内容种草', value: '待填写目标', delta: '转化率' },
            { tag: '下单成交', title: '限时权益促成转化', value: '待填写目标', delta: 'ROI 目标' },
          ],
          [
            { tag: 'Awareness', title: 'Omnichannel reach', value: 'To fill', delta: 'Target CTR' },
            { tag: 'Engagement', title: 'Landing page & leads', value: 'To fill', delta: 'CVR target' },
            { tag: 'Conversion', title: 'Launch offer & revenue', value: 'To fill', delta: 'Target ROAS' },
          ],
        ],
        bullets: [
          ['**漏斗转化**：待填写曝光到成交各环节预期转化率'],
          ['**Funnel math**: To fill: stage-to-stage conversion targets'],
        ],
      },
      {
        title: ['战役节奏波段与多渠道上线甘特图', 'Campaign flighting and launch Gantt'],
        kicker: ['04 · 节奏排期', '04 · Flighting'],
        layout: 'gantt',
        variant: 'weeks',
        columns: [
          ['预热 W1', '预热 W2', '爆发 W3', '延续 W4', '复盘 W5'],
          ['Tease W1', 'Warm W2', 'Peak W3', 'Sustain W4', 'Recap W5'],
        ],
        items: [
          [
            { tag: '预热造势', title: '悬念海报与 KOL 首轮种草', text: '待填写渠道', start: 0, span: 2 },
            { tag: '引爆高峰', title: '主视觉发布与直播事件营销', text: '待填写预算占比', start: 2, span: 1, status: 'accent' },
            { tag: '长尾转化', title: '口碑证言二创与再营销收割', text: '待填写 KPI', start: 3, span: 2 },
          ],
          [
            { tag: 'Tease', title: 'Creator seeding & teaser assets', text: 'To fill: channels', start: 0, span: 2 },
            { tag: 'Hero', title: 'Launch film & flagship activation', text: 'To fill: budget share', start: 2, span: 1, status: 'accent' },
            { tag: 'Retarget', title: 'Social proof & conversion push', text: 'To fill: target KPI', start: 3, span: 2 },
          ],
        ],
        bullets: [
          ['**波段排期**：待填写预热、爆发与长尾收割节点'],
          ['**Flighting**: To fill: tease, hero and retargeting waves'],
        ],
      },
    ],
    closing: {
      title: ['预算批准与创意物料上线倒计时', 'Budget sign-off and launch readiness'],
      subtitle: ['待填写：市场负责人、预算总额与上线日', 'To fill: marketing lead, budget and launch date'],
    },
  },
  {
    id: 'promotion-review',
    persona: 'consulting',
    theme: 'consulting',
    name: { zh: '个人述职与晋升答辩', en: 'Promotion review' },
    sections: [
      {
        title: ['任期内核心业务产出与量化绩效亮点', 'Core impact and quantified performance highlights'],
        kicker: ['01 · 绩效总览', '01 · Impact Summary'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**主导项目业务贡献**：待填写收入增量/成本节约/效率提升数值', '**跨团队影响力覆盖**：待填写协同团队数或采纳标准数'],
          ['**Flagship impact**: To fill: revenue, cost or velocity outcome', '**Scope & leverage**: To fill: cross-team adoption metrics'],
        ],
      },
      {
        title: ['三大代表性战役攻坚与个人关键贡献', 'Three flagship initiatives and personal ownership'],
        kicker: ['02 · 代表项目', '02 · Key Initiatives'],
        layout: 'cards',
        variant: 'bento',
        bullets: [
          ['**攻坚项目一（架构/业务突破）**：待填写情境、个人决策与最终结果', '**攻坚项目二（机制/效能建设）**：待填写从零到一落地的方法论', '**攻坚项目三（复杂协同/救火）**：待填写跨部门推进与风险化解'],
          ['**Project 1 (Breakthrough)**: To fill: context, decision and result', '**Project 2 (Platform)**: To fill: reusable system or process built', '**Project 3 (Execution)**: To fill: ambiguity resolved under pressure'],
        ],
      },
      {
        title: ['带队赋能架构与跨角色协同影响力', 'Team leverage and organizational influence'],
        kicker: ['03 · 团队影响', '03 · Leadership & Org'],
        layout: 'org',
        variant: 'tree',
        items: [
          [
            { tag: 'Owner', title: '待填写汇报人角色', text: '技术规划与跨组对齐' },
            { tag: '方向一', title: '核心交付小组', text: '待填写带教与产出' },
            { tag: '方向二', title: '平台基建协同', text: '待填写标准输出' },
            { tag: '方向三', title: '人才培养导师', text: '待填写辅导新人人数' },
          ],
          [
            { tag: 'Lead', title: 'To fill: candidate role', text: 'Strategy & cross-org alignment' },
            { tag: 'Pod A', title: 'Core delivery stream', text: 'To fill: mentored output' },
            { tag: 'Pod B', title: 'Platform standards', text: 'To fill: shared tooling' },
            { tag: 'Mentorship', title: 'Talent development', text: 'To fill: mentees grown' },
          ],
        ],
        bullets: [
          ['**组织沉淀**：待填写带教新人、制度规范与方法论推广成果'],
          ['**Org leverage**: To fill: mentoring and standard adoption'],
        ],
      },
      {
        title: ['下一职级能力对标与未来一年规划', 'Next-level expectations and 12-month plan'],
        kicker: ['04 · 未来规划', '04 · Next-Level Plan'],
        layout: 'gantt',
        variant: 'quarters',
        columns: [
          ['Q1', 'Q2', 'Q3', 'Q4'],
          ['Q1', 'Q2', 'Q3', 'Q4'],
        ],
        items: [
          [
            { tag: '深化主线', title: '核心业务指标再突破', text: '待填写目标', start: 0, span: 2, status: 'accent' },
            { tag: '横向拓面', title: '跨部门标准体系推广', text: '待填写里程碑', start: 1, span: 2 },
            { tag: '前瞻布局', title: '新赛道探索与梯队搭建', text: '待填写成果', start: 2, span: 2 },
          ],
          [
            { tag: 'Deepen', title: 'Core metric step-change', text: 'To fill: target', start: 0, span: 2, status: 'accent' },
            { tag: 'Scale', title: 'Org-wide standard rollout', text: 'To fill: milestone', start: 1, span: 2 },
            { tag: 'Horizon', title: 'Next-gen bet & succession', text: 'To fill: deliverable', start: 2, span: 2 },
          ],
        ],
        bullets: [
          ['**自驱规划**：待填写晋升后重点承担的更大职责边界'],
          ['**12-month scope**: To fill: expanded ownership targets'],
        ],
      },
    ],
    closing: {
      title: ['持续创造可复用的组织与业务价值', 'Committed to compounding team & business impact'],
      subtitle: ['待填写：答辩人姓名、现职级与答辩日期', 'To fill: candidate name, current level and date'],
    },
  },
  {
    id: 'legal-compliance',
    persona: 'gov-exec',
    theme: 'exec-jilan',
    name: { zh: '法务合规与风控审计', en: 'Legal & compliance' },
    sections: [
      {
        title: ['监管新规核心变化与企业合规底线', 'Regulatory shifts and mandatory compliance guardrails'],
        kicker: ['第一部分 · 法规要点', 'Part I · Regulatory Scope'],
        layout: 'callout',
        variant: 'takeaways',
        bullets: [
          ['**核心强制条款**：待填写适用法规名称、生效日期与处罚上限', '**本次审计覆盖范围**：待填写业务线、数据域与跨境/第三方接口'],
          ['**Mandatory scope**: To fill: regulation, effective date and penalty ceiling', '**Audit boundary**: To fill: covered entities, data flows and vendors'],
        ],
      },
      {
        title: ['各业务线合规条款达标现状矩阵', 'Compliance readiness across business units'],
        kicker: ['第二部分 · 达标矩阵', 'Part II · Readiness Matrix'],
        layout: 'harvey',
        rows: [
          [
            ['合规控制项', '核心交易线', '数据中台', '第三方生态'],
            ['最小必要授权收集', '●', '●', '◑'],
            ['敏感数据加密与脱敏', '●', '◕', '◔'],
            ['用户撤回与删除闭环', '◕', '◑', '○'],
            ['待填写专项审计项', '●', '◑', '◔'],
          ],
          [
            ['Control Area', 'Core Commerce', 'Data Platform', 'Third-Party'],
            ['Consent & minimization', '●', '●', '◑'],
            ['Encryption & masking', '●', '◕', '◔'],
            ['Deletion & DSAR SLA', '◕', '◑', '○'],
            ['To fill: audit control', '●', '◑', '◔'],
          ],
        ],
        bullets: [
          ['**重点缺口**：待填写第三方接口与历史存量数据整改清单'],
          ['**Key gap**: To fill: vendor & legacy data remediation items'],
        ],
      },
      {
        title: ['合规风险严重度与整改优先级四象限', 'Risk severity and remediation prioritization'],
        kicker: ['第三部分 · 风险评估', 'Part III · Risk Matrix'],
        layout: 'matrix',
        variant: '2x2',
        bullets: [
          ['**红线阻断项（高后果·即刻改）**：待填写上线前必须清零事项', '**结构治理项（高后果·限期改）**：待填写制度与技术底座改造', '**流程规范项（低后果·常规改）**：待填写台账补齐与审批优化', '**持续监测项（低后果·定期查）**：待填写季度抽检事项'],
          ['**Blocker (Critical · Immediate)**: To fill: pre-launch mandatory fixes', '**Structural (High · Scheduled)**: To fill: architecture & policy updates', '**Procedural (Low · Routine)**: To fill: documentation updates', '**Watchlist (Low · Periodic)**: To fill: quarterly sampling'],
        ],
      },
      {
        title: ['整改闭环路线与监督问责机制', 'Remediation workflow and governance cadence'],
        kicker: ['第四部分 · 整改闭环', 'Part IV · Governance'],
        layout: 'process',
        variant: 'steps',
        bullets: [
          ['**台账建档与双周督办**：待填写责任法务与业务接口人', '**技术卡点与自动化巡检**：待填写上线前合规门禁脚本', '**复验销号与审计留痕**：待填写最终归档凭证要求'],
          ['**Ledger & biweekly tracking**: To fill: legal & business owners', '**Automated gates**: To fill: CI/CD compliance checks', '**Sign-off & evidence**: To fill: audit trail archival'],
        ],
      },
    ],
    closing: {
      title: ['合规护航业务行稳致远', 'Compliance as an enabler of sustainable growth'],
      subtitle: ['待填写：法务风控负责人与汇报日期', 'To fill: general counsel / risk lead and date'],
    },
  },
  {
    id: 'creative-lookbook',
    persona: 'editorial',
    theme: 'luxury-noir',
    name: { zh: '高端品牌策展与画册', en: 'Creative lookbook' },
    sections: [
      {
        title: ['美学宣言：以材质、光影与比例重塑当代空间叙事', 'Manifesto: sculpting contemporary narrative through material, light and proportion'],
        kicker: ['01 · 策展宣言', '01 · Manifesto'],
        layout: 'statement',
        bullets: [
          ['待填写：用一句富有文化质感与克制张力的核心策展词定调本季系列'],
          ['To fill: one evocative curatorial thesis anchoring this seasonal collection'],
        ],
      },
      {
        title: ['真正的奢华不在于繁复堆砌，而在于每一毫米克制的工艺留白', 'True luxury lives not in excess, but in the quiet discipline of every millimeter'],
        kicker: ['02 · 设计哲学', '02 · Philosophy'],
        layout: 'quote',
        subtitle: ['待填写：主创设计师 / 品牌典藏引言', 'To fill: Creative Director / Maison Archive'],
        bullets: [
          ['待填写：设计理念来源与材质考据'],
          ['To fill: provenance of craft and material inspiration'],
        ],
      },
      {
        title: ['三大核心系列篇章与工艺灵感图谱', 'Three signature chapters and craft pillars'],
        kicker: ['03 · 系列篇章', '03 · Chapters'],
        layout: 'cards',
        variant: 'pillars',
        bullets: [
          ['**第一章 · 材质溯源**：待填写天然材质、产地工艺与触感肌理', '**第二章 · 结构廓形**：待填写建筑感剪裁比例与细节语言', '**第三章 · 空间体验**：待填写旗舰展陈、灯光叙事与限量编号'],
          ['**Chapter I · Provenance**: To fill: raw materials and atelier heritage', '**Chapter II · Silhouette**: To fill: architectural proportion and detailing', '**Chapter III · Exhibition**: To fill: flagship staging and editioning'],
        ],
      },
      {
        title: ['高端客群圈层扩展与旗舰渠道布局', 'Collector universe and flagship distribution'],
        kicker: ['04 · 市场版图', '04 · Collector Reach'],
        layout: 'tam',
        variant: 'concentric',
        items: [
          [
            { tag: '全球美学圈', value: '待填写规模', title: '高净值审美消费总体空间', text: '待填写全球重点都会圈' },
            { tag: '核心藏家', value: '待填写规模', title: '高频复购与私享沙龙客群', text: '待填写会员转化目标' },
            { tag: '典藏限量', value: '待填写规模', title: '年度联名与高定特别系列', text: '待填写首季发售配额' },
          ],
          [
            { tag: 'Global', value: 'To fill', title: 'Global design-conscious audience', text: 'To fill: flagship metro markets' },
            { tag: 'Collectors', value: 'To fill', title: 'Private salon & repeat patrons', text: 'To fill: clienteling goals' },
            { tag: 'Atelier', value: 'To fill', title: 'Numbered bespoke editions', text: 'To fill: seasonal allocation' },
          ],
        ],
        bullets: [
          ['**渠道策展**：待填写全球旗舰店与私享预览排期'],
          ['**Distribution**: To fill: flagship openings and private previews'],
        ],
      },
    ],
    closing: {
      title: ['诚邀莅临私享预览与典藏品鉴', 'Private preview & bespoke inquiries'],
      subtitle: ['待填写：策展机构、预约通道与展览日期', 'To fill: atelier, RSVP contact and exhibition dates'],
    },
  },
  {
    id: 'quarterly-okr',
    persona: 'consulting',
    theme: 'bcg-emerald',
    name: { zh: '季度经营与 OKR 复盘', en: 'Quarterly OKR review' },
    sections: [
      {
        title: ['本季 OKR 核心目标打分与经营指标总览', 'Quarterly OKR scorecards and headline metrics'],
        kicker: ['01 · OKR 总览', '01 · OKR Scorecard'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**O1 核心增长达成**：待填写 KR 完成率与关键量化结果', '**O2 产品体验升级**：待填写留存/NPS 变化与里程碑状态', '**O3 组织与效率**：待填写人效或成本优化幅度'],
          ['**O1 Growth target**: To fill: KR score and headline metric', '**O2 Product quality**: To fill: retention/NPS delta', '**O3 Operational efficiency**: To fill: unit economics gain'],
        ],
      },
      {
        title: ['端到端业务价值链各环节转化与协同复盘', 'End-to-end value-chain execution review'],
        kicker: ['02 · 价值链拆解', '02 · Value Chain'],
        layout: 'process',
        variant: 'chevron',
        items: [
          [
            { tag: '01', title: '需求洞察与立项', text: '待填写商机/需求命中率', conversion: '待填写转化率' },
            { tag: '02', title: '敏捷研发与交付', text: '待填写按期上线率', conversion: '待填写周期' },
            { tag: '03', title: '标杆落地与验证', text: '待填写客户采纳成效', conversion: '待填写留存' },
            { tag: '04', title: '规模化续费增购', text: '待填写净留存贡献', conversion: '待填写 NRR' },
          ],
          [
            { tag: '01', title: 'Discovery & Intake', text: 'To fill: hit rate', conversion: 'To fill' },
            { tag: '02', title: 'Agile Delivery', text: 'To fill: on-time ship rate', conversion: 'To fill' },
            { tag: '03', title: 'Pilot Adoption', text: 'To fill: activation impact', conversion: 'To fill' },
            { tag: '04', title: 'Expansion & NRR', text: 'To fill: upsell contribution', conversion: 'To fill' },
          ],
        ],
        bullets: [
          ['**价值链瓶颈**：待填写本季最关键的漏损环节与提效抓手'],
          ['**Chain bottleneck**: To fill: primary conversion drop-off and fix'],
        ],
      },
      {
        title: ['未达预期项根因剖析与跨部门纠偏动作', 'Misses, root causes and corrective actions'],
        kicker: ['03 · 差距纠偏', '03 · Gap & Action'],
        layout: 'comparison',
        variant: 'issue-action',
        bullets: [
          ['**待填写未达标 KR 与核心根因**：待填写下季改进举措、责任人与量化验收线'],
          ['**To fill: missed KR and root cause**: To fill: corrective action, owner and target'],
        ],
      },
      {
        title: ['下季度 OKR 关键战役排期与里程碑', 'Next-quarter OKR roadmap and milestones'],
        kicker: ['04 · 下季排期', '04 · Next Quarter'],
        layout: 'gantt',
        variant: 'quarters',
        columns: [
          ['M1', 'M2', 'M3'],
          ['M1', 'M2', 'M3'],
        ],
        items: [
          [
            { tag: '战役一', title: '核心增长引擎攻坚', text: '待填写 KR 目标', start: 0, span: 2, status: 'accent' },
            { tag: '战役二', title: '关键能力底座补齐', text: '待填写交付物', start: 1, span: 2, status: 'positive' },
            { tag: '里程碑', title: '季度末经营验收节点', text: '待填写日期', start: 2, span: 0, milestone: true, status: 'warning' },
          ],
          [
            { tag: 'Bet 1', title: 'Primary growth initiative', text: 'To fill: KR target', start: 0, span: 2, status: 'accent' },
            { tag: 'Bet 2', title: 'Platform capability upgrade', text: 'To fill: deliverable', start: 1, span: 2, status: 'positive' },
            { tag: 'Gate', title: 'QBR Sign-off Milestone', text: 'To fill: date', start: 2, span: 0, milestone: true, status: 'warning' },
          ],
        ],
        bullets: [
          ['**资源锁定**：待填写下季度预算与编制需求'],
          ['**Resource lock**: To fill: headcount and budget dependencies'],
        ],
      },
    ],
    closing: {
      title: ['对齐下季北极星指标，立即启动首周拆解', 'Align on next-quarter north star and kick off Week 1'],
      subtitle: ['待填写：团队负责人与复盘日期', 'To fill: team lead and review date'],
    },
  },
  {
    id: 'product-prd',
    persona: 'tech-pitch',
    theme: 'stripe-craft',
    name: { zh: '产品需求与方案评审（PRD）', en: 'Product PRD & design review' },
    sections: [
      {
        title: ['真实用户场景痛点与新旧交互路径对比', 'User friction and before/after workflow'],
        kicker: ['01 · 用户痛点', '01 · User Friction'],
        layout: 'comparison',
        variant: 'before-after',
        bullets: [
          ['**改版前操作断点**：待填写用户在旧流程中的步骤耗时与流失率数据', '**改版后顺滑路径**：待填写新交互如何消除断点并缩短完成时长'],
          ['**Current friction**: To fill: drop-off rate and manual steps today', '**Proposed flow**: To fill: streamlined interaction and time saved'],
        ],
      },
      {
        title: ['本期核心功能模块与优先级范围边界', 'Core feature scope and Bento breakdown'],
        kicker: ['02 · 功能范围', '02 · Feature Scope'],
        layout: 'cards',
        variant: 'bento',
        bullets: [
          ['**P0 核心体验闭环**：待填写首期必须上线的主路径能力与验收口径', '**P1 效率增强项**：待填写批处理、快捷键或推荐辅助能力', '**明确不做（Out of Scope）**：待填写延后至二期的非核心诉求'],
          ['**P0 Core loop**: To fill: must-ship user journey and acceptance criteria', '**P1 Power UX**: To fill: shortcuts, presets and assistive defaults', '**Non-goals**: To fill: explicitly deferred items'],
        ],
      },
      {
        title: ['前后端系统交互与数据埋点分层方案', 'System integration and telemetry architecture'],
        kicker: ['03 · 技术与埋点', '03 · Architecture & Metrics'],
        layout: 'architecture',
        variant: 'layered',
        items: [
          [
            { tag: '交互层', title: '客户端组件与状态反馈', bullets: ['待填写关键视图', '异常兜底态'] },
            { tag: '服务层', title: '接口契约与权限校验', bullets: ['待填写核心 API', '幂等与限流'] },
            { tag: '数据层', title: '核心漏斗埋点与实验归因', bullets: ['待填写北极星指标', 'A/B 实验分组'] },
          ],
          [
            { tag: 'UI Layer', title: 'Client components & states', bullets: ['To fill: key views', 'Error recovery'] },
            { tag: 'API Layer', title: 'Contracts & permissions', bullets: ['To fill: endpoints', 'Rate limits'] },
            { tag: 'Telemetry', title: 'Funnel events & A/B flags', bullets: ['To fill: success metric', 'Experiment cohorts'] },
          ],
        ],
        bullets: [
          ['**上线衡量标准**：待填写发布后 14 天核心转化或留存验收阈值'],
          ['**Success threshold**: To fill: 14-day post-launch metric target'],
        ],
      },
      {
        title: ['设计走查、联调提测与灰度放量排期', 'Design QA, engineering build and rollout plan'],
        kicker: ['04 · 交付排期', '04 · Rollout Plan'],
        layout: 'gantt',
        variant: 'weeks',
        columns: [
          ['W1', 'W2', 'W3', 'W4'],
          ['W1', 'W2', 'W3', 'W4'],
        ],
        items: [
          [
            { tag: '设计定稿', title: '交互走查与视觉交付', start: 0, span: 1, status: 'accent' },
            { tag: '研发联调', title: '前后端开发与埋点自测', start: 1, span: 2 },
            { tag: '灰度全量', title: '10% 灰度验证与全量发布', start: 3, span: 1, status: 'positive' },
          ],
          [
            { tag: 'Design', title: 'Figma sign-off & copy review', start: 0, span: 1, status: 'accent' },
            { tag: 'Build', title: 'Implementation & integration', start: 1, span: 2 },
            { tag: 'Rollout', title: '10% canary to 100% GA', start: 3, span: 1, status: 'positive' },
          ],
        ],
        bullets: [
          ['**评审待决项**：待填写需产研测当场拍板的边界问题'],
          ['**Open decisions**: To fill: edge cases requiring sign-off today'],
        ],
      },
    ],
    closing: {
      title: ['确认 P0 范围与排期，进入研发排期锁定', 'Sign off P0 scope and lock sprint schedule'],
      subtitle: ['待填写：产品经理、设计及研发接口人', 'To fill: PM, design and engineering leads'],
    },
  },
  {
    id: 'vc-daylight',
    persona: 'tech-pitch',
    theme: 'venture-daylight',
    name: { zh: '创投融资简报（明亮阅读版）', en: 'Daylight investor deck' },
    sections: [
      {
        title: ['结构性市场拐点与刚性未被满足的痛点', 'Structural catalyst and urgent customer pain'],
        kicker: ['01 · 痛点与拐点', '01 · Why Now'],
        layout: 'cards',
        variant: 'pillars',
        bullets: [
          ['**存量方案高昂代价**：待填写目标客户当前损耗的真实成本数据', '**技术与供给侧拐点**：待填写使 10 倍体验跃迁成为可能的关键变化', '**切入楔子（Wedge）**：待填写高频、高留存的首发刚需场景'],
          ['**Incumbent tax**: To fill: quantified time & cost pain today', '**Why now**: To fill: enabling technology or regulatory shift', '**Initial wedge**: To fill: high-frequency entry workflow'],
        ],
      },
      {
        title: ['早期商业化验证：高增速与健康单位经济模型', 'Early traction and unit economics proof'],
        kicker: ['02 · 增长验证', '02 · Traction'],
        layout: 'kpi',
        variant: 'grid',
        bullets: [
          ['**核心营收 / ARR**：待填写当前规模与月/季复合增速', '**净收入留存（NRR）**：待填写付费留存与扩购表现', '**毛利率与回收期**：待填写毛利水平与 CAC Payback 月数'],
          ['**ARR / GMV**: To fill: current run-rate and MoM/QoQ growth', '**Net retention**: To fill: cohort retention and expansion', '**Payback & margin**: To fill: gross margin and CAC payback'],
        ],
      },
      {
        title: ['从首发细分市场向百亿级可触达空间扩张', 'Bottom-up market sizing from SOM to TAM'],
        kicker: ['03 · 市场空间', '03 · Market Size'],
        layout: 'tam',
        variant: 'concentric',
        items: [
          [
            { tag: 'TAM', value: '待填写总额', title: '全球目标行业总体潜在市场', text: '待填写自下而上测算口径' },
            { tag: 'SAM', value: '待填写规模', title: '核心产品线可服务市场空间', text: '待填写目标客群数量 × 客单价' },
            { tag: 'SOM', value: '待填写目标', title: '未来 24 个月可拿下份额', text: '待填写标杆渠道转化路径' },
          ],
          [
            { tag: 'TAM', value: 'To fill', title: 'Total addressable spend', text: 'To fill: bottom-up sizing formula' },
            { tag: 'SAM', value: 'To fill', title: 'Serviceable target segment', text: 'To fill: account count × ACV' },
            { tag: 'SOM', value: 'To fill', title: '24-month obtainable target', text: 'To fill: GTM wedge capture' },
          ],
        ],
        bullets: [
          ['**测算依据**：待填写客单价与目标客户基数的核验来源'],
          ['**Sizing basis**: To fill: verified account count and ACV assumptions'],
        ],
      },
      {
        title: ['核心技术护城河与主流竞品全维度对比', 'Defensibility and competitive landscape'],
        kicker: ['04 · 竞争壁垒', '04 · Moat & Matrix'],
        layout: 'harvey',
        rows: [
          [
            ['关键能力', '我们', '传统巨头', '同类初创'],
            ['开箱即用交付速度', '●', '◔', '◑'],
            ['数据飞轮与专有壁垒', '●', '◑', '◔'],
            ['总体拥有成本优势', '●', '○', '◑'],
          ],
          [
            ['Capability', 'Us', 'Incumbents', 'Point Startups'],
            ['Time-to-value', '●', '◔', '◑'],
            ['Proprietary data moat', '●', '◑', '◔'],
            ['TCO advantage', '●', '○', '◑'],
          ],
        ],
        bullets: [
          ['**复利壁垒**：待填写随规模扩大而增强的网络效应或切换成本'],
          ['**Compounding moat**: To fill: switching costs or data network effects'],
        ],
      },
    ],
    closing: {
      title: ['本轮融资规划与未来 18 个月关键里程碑', 'Fundraising terms & 18-month milestones'],
      subtitle: ['待填写：融资金额、资金用途比例与创始人联系方式', 'To fill: round size, use of proceeds and founder contact'],
    },
  },
  {
    id: 'industry-research',
    persona: 'consulting',
    theme: 'economist-brief',
    tableStyle: 'booktabs',
    name: { zh: '行业研究与宏观洞察', en: 'Macro & industry research' },
    sections: [
      {
        title: ['核心研判：技术成本曲线下移正触发产业链利润池重分配', 'Core thesis: falling cost curves are redistributing value-chain profit pools'],
        kicker: ['01 · 核心研判', '01 · Core Thesis'],
        layout: 'statement',
        bullets: [
          ['待填写：一句话浓缩本篇行研最具洞察力的非共识结论与时间窗口'],
          ['To fill: one non-consensus analytical thesis with timeframe and magnitude'],
        ],
      },
      {
        title: ['产业链上中下游价值分布与议价权演进', 'Value-chain profit pool and bargaining power'],
        kicker: ['02 · 产业链图谱', '02 · Value Chain'],
        layout: 'process',
        variant: 'chevron',
        items: [
          [
            { tag: '上游', title: '核心原材料与算力底座', text: '待填写集中度与毛利带', conversion: '毛利 待填写' },
            { tag: '中游', title: '模组平台与系统集成', text: '待填写规模效应拐点', conversion: '毛利 待填写' },
            { tag: '下游', title: '垂直场景与品牌终端', text: '待填写渠道壁垒与复购', conversion: '毛利 待填写' },
          ],
          [
            { tag: 'Upstream', title: 'Core inputs & infrastructure', text: 'To fill: concentration', conversion: 'GM: To fill' },
            { tag: 'Midstream', title: 'Platform & integration', text: 'To fill: scale economics', conversion: 'GM: To fill' },
            { tag: 'Downstream', title: 'Vertical apps & distribution', text: 'To fill: customer lock-in', conversion: 'GM: To fill' },
          ],
        ],
        bullets: [
          ['**利润迁移方向**：待填写未来三年高毛利环节转移证据'],
          ['**Profit migration**: To fill: where margin expansion accrues next'],
        ],
      },
      {
        title: ['主要玩家战略定位与竞争格局四象限', 'Competitive positioning 2x2 matrix'],
        kicker: ['03 · 竞争格局', '03 · Landscape'],
        layout: 'matrix',
        variant: '2x2',
        bullets: [
          ['**全栈领军者（高壁垒·广覆盖）**：待填写代表企业与份额', '**垂直隐形冠军（高壁垒·深场景）**：待填写高利基玩家', '**规模挑战者（成本领先·标准化）**：待填写价格带玩家', '**长尾出清区（同质化·低毛利）**：待填写整合趋势'],
          ['**Full-stack leaders**: To fill: share & moat', '**Vertical specialists**: To fill: high-margin niche winners', '**Scale challengers**: To fill: cost-curve disruptors', '**Consolidation zone**: To fill: commoditized tail'],
        ],
      },
      {
        title: ['关键跟踪指标、情景假设与下行风险提示', 'Key signposts, scenarios and downside risks'],
        kicker: ['04 · 风险与跟踪', '04 · Signposts & Risks'],
        layout: 'comparison',
        variant: 'issue-action',
        bullets: [
          ['**待填写核心宏观/政策/技术证伪风险**：待填写高频先行观察指标与应对配置建议'],
          ['**To fill: primary thesis-falsifying risk**: To fill: leading indicator signpost and hedge'],
        ],
      },
    ],
    closing: {
      title: ['研究结论摘要与重点跟踪标的清单', 'Summary takeaways & coverage watchlist'],
      subtitle: ['待填写：研究团队、数据截止日期与免责声明', 'To fill: research team, data cutoff date and disclosures'],
    },
  },
])

export function findScenarioTemplate(id) {
  if (typeof id !== 'string' || !id.trim()) return undefined
  return SCENARIO_TEMPLATES.find((s) => s.id === id.trim())
}

export function buildScenarioSlides(scenarioOrId, title, lang = 'zh') {
  const scenario = typeof scenarioOrId === 'string' ? findScenarioTemplate(scenarioOrId) : scenarioOrId
  if (!scenario) fail('未知 template，请使用 ' + SCENARIO_TEMPLATES.map((s) => s.id).join(' / '))
  const en = lang === 'en'
  const idx = en ? 1 : 0
  return [
    {
      layout: 'cover',
      title: String(title || scenario.name[en ? 'en' : 'zh']),
      subtitle: en ? 'To fill: presenter and date' : '待填写：汇报人和日期',
    },
    ...scenario.sections.map((section) => ({
      layout: section.layout || 'bullets',
      ...(section.variant ? { variant: section.variant } : {}),
      ...(section.kicker ? { kicker: section.kicker[idx] } : {}),
      title: section.title[idx],
      ...(Array.isArray(section.columns) ? { columns: [...section.columns[idx]] } : {}),
      ...(Array.isArray(section.items) ? { items: section.items[idx].map((it) => ({ ...it })) } : {}),
      ...(Array.isArray(section.rows) ? { rows: section.rows[idx].map((r) => [...r]) } : {}),
      ...(Array.isArray(section.bullets) ? { bullets: [...section.bullets[idx]] } : {}),
      ...(scenario.tableStyle ? { tableStyle: scenario.tableStyle } : {}),
    })),
    {
      layout: 'closing',
      title: scenario.closing.title[idx],
      subtitle: scenario.closing.subtitle[idx],
    },
  ]
}

export function listScenarioTemplates(lang = 'zh') {
  const language = lang === 'en' ? 'en' : 'zh'
  const idx = language === 'en' ? 1 : 0
  return SCENARIO_TEMPLATES.map((s) => ({
    id: s.id,
    name: s.name[language],
    theme: s.theme,
    persona: s.persona,
    outline: s.sections.map((sec) => sec.title[idx]),
    slides: buildScenarioSlides(s, s.name[language], language),
  }))
}

/**
 * 零追问智能艺术指导：根据标题、正文、结构化幻灯片或显式 persona，确定最匹配的受众人格与 18 套大师主题。
 * 通用模糊输入永远回退至投影友好的浅色商务主题 SMART_DEFAULT_THEME（'consulting'），绝不误落入纯黑主题。
 */
export function inferThemeFromContent(input = {}) {
  const rawPersona = typeof input.persona === 'string' && input.persona.trim() ? input.persona.trim().toLowerCase() : 'auto'
  if (!PERSONA_SET.has(rawPersona)) {
    fail('未知 persona "' + rawPersona + '"，可选：' + PERSONAS.join(' / '))
  }

  const tpl = input.template ? findScenarioTemplate(input.template) : undefined
  if (tpl && rawPersona === 'auto') {
    return {
      persona: tpl.persona,
      theme: tpl.theme,
      tableStyle: tpl.tableStyle || 'consulting',
      chartHighlight: 'max',
    }
  }

  const slideText = Array.isArray(input.slides)
    ? input.slides
        .slice(0, 24)
        .map((s) => [s?.title, s?.subtitle, s?.kicker, s?.takeaway, ...(s?.bullets ?? [])].filter(Boolean).join(' '))
        .join('\n')
    : ''
  const corpus = [input.title, input.content, slideText].filter(Boolean).join('\n').slice(0, 24000)

  const pickForPersona = (persona) => {
    if (persona === 'gov-exec') {
      const palaceHit = /党建|党政|支部|主题教育|学习贯彻|表彰|庆典|周年|喜报|红色|精神文明|不忘初心|二十大|党课/.test(corpus)
      return { persona: 'gov-exec', theme: palaceHit ? 'exec-palace' : 'exec-jilan', tableStyle: 'consulting', chartHighlight: 'max' }
    }
    if (persona === 'academic') {
      const medicalHit = /临床|病例|诊疗|病理|临床试验|患者|院内|药代|肿瘤|随访|clinical|patient|medical|diagnosis|hospital|oncology|trial/i.test(corpus)
      return {
        persona: 'academic',
        theme: medicalHit ? 'medical-clean' : 'academic',
        tableStyle: 'booktabs',
        chartHighlight: 'max',
      }
    }
    if (persona === 'education') {
      return { persona: 'education', theme: 'course-sage', tableStyle: 'consulting', chartHighlight: 'max' }
    }
    if (persona === 'editorial') {
      const luxuryHit = /奢侈品|高定|黑金|画册|珠宝|腕表|美术馆|时尚|品牌大秀|lookbook|luxury|atelier|couture|maison|bespoke/i.test(corpus)
      if (luxuryHit) {
        return { persona: 'editorial', theme: 'luxury-noir', tableStyle: 'minimal', chartHighlight: 'max' }
      }
      const cartesianHit = /建筑|工业设计|极简|空间设计|作品集|摄影集|monograph|bauhaus|brutalist|architectural/i.test(corpus)
      return { persona: 'editorial', theme: cartesianHit ? 'cartesian' : 'editorial-forest', tableStyle: 'minimal', chartHighlight: 'max' }
    }
    if (persona === 'tech-pitch') {
      const keynoteLightHit = /苹果风|极简白|空间留白|消费电子|硬件生态|cupertino|spatial\s*keynote|keynote\s*light/i.test(corpus)
      const ventureDaylightHit = /创投简报|明亮路演|阅读版\s*BP|投资备忘录|日间路演|partner\s*memo|daylight\s*pitch|investor\s*memo/i.test(corpus)
      const stripeCraftHit = /PRD评审|需求评审|产品需求文档|开发者平台|产品迭代评审|SaaS\s*方案|product\s*review|\bprd\b|developer\s*platform|stripe\s*craft/i.test(corpus)
      const auroraStageHit = /极光发布|算力底座|芯片发布|大模型训练集群|AI基础设施发布|aurora\s*keynote|gpu\s*cluster|ai\s*infra\s*launch/i.test(corpus)
      const stageHit = /路演|融资|商业计划|种子轮|天使轮|[ABC]\s*轮|产品发布|新品发布|发布会|开发者大会|大模型|智能体|算力|keynote|pitch\s*deck|seed\s*round|series\s*[abc]|product\s*launch|developer/i.test(corpus)
      const b2bHit = /技术方案|架构设计|系统重构|工程效能|云原生|微服务|中台|数字化转型|安全合规|接口规范|运维|选型评审|故障复盘/i.test(corpus)
      const theme = keynoteLightHit
        ? 'keynote-light'
        : ventureDaylightHit
          ? 'venture-daylight'
          : stripeCraftHit
            ? 'stripe-craft'
            : auroraStageHit
              ? 'aurora-stage'
              : (b2bHit && !stageHit ? 'cobalt-cream' : 'linear-dark')
      return {
        persona: 'tech-pitch',
        theme,
        tableStyle: 'consulting',
        chartHighlight: 'last',
      }
    }
    const terminalAmberHit = /彭博终端|量化交易|安全态势|攻防演练|SRE作战室|高频风控|quant\s*trading|threat\s*intel|war\s*room|bloomberg/i.test(corpus)
    if (terminalAmberHit) {
      return { persona: 'consulting', theme: 'obsidian-amber', tableStyle: 'consulting', chartHighlight: 'max' }
    }
    const economistHit = /经济学人|行业研究|宏观洞察|地缘政治|通胀展望|智库报告|并购尽调|产业白皮书|产业链图谱|economist|macro\s*research|geopolitic|industry\s*research|think\s*tank|due\s*diligence/i.test(corpus)
    if (economistHit) {
      return { persona: 'consulting', theme: 'economist-brief', tableStyle: 'booktabs', chartHighlight: 'max' }
    }
    const bcgEmeraldHit = /\bBCG\b|波士顿咨询|OKR\s*复盘|绿色转型|双碳战略|低碳转型|翡翠战略|增长转型|green\s*transformation|okr\s*review|emerald\s*strategy|decarbonization/i.test(corpus)
    if (bcgEmeraldHit) {
      return { persona: 'consulting', theme: 'bcg-emerald', tableStyle: 'consulting', chartHighlight: 'max' }
    }
    const financialFtHit = /财报|业绩会|季报业绩|IPO|二级市场|投研|资产配置|宏观经济|金融时报|净值|估值模型|earnings|financial\s*report|investor\s*relations|ebitda|valuation|consensus/i.test(corpus)
    if (financialFtHit) {
      return { persona: 'consulting', theme: 'financial-ft', tableStyle: 'consulting', chartHighlight: 'max' }
    }
    const techConsultingHit = /技术方案|架构设计|系统重构|工程效能|云原生|微服务|技术选型|API\s*网关|故障复盘/i.test(corpus)
    return {
      persona: 'consulting',
      theme: techConsultingHit ? 'cobalt-cream' : SMART_DEFAULT_THEME,
      tableStyle: 'consulting',
      chartHighlight: 'max',
    }
  }

  if (rawPersona !== 'auto') {
    return pickForPersona(rawPersona)
  }

  const scores = {
    'gov-exec': 0,
    academic: 0,
    education: 0,
    editorial: 0,
    'tech-pitch': 0,
    consulting: 0,
  }

  const addMatches = (persona, regex, weight) => {
    const matches = corpus.match(regex)
    if (matches) scores[persona] += Math.min(4, matches.length) * weight
  }

  addMatches('gov-exec', /党建|党政|支部|主题教育|学习贯彻|表彰|庆典|政务|政府|机关|事业单位|国企|央企|述职|专项整治|工作总结|年度工作|督导|巡视|十四五|十五五|实施方案|合规|法务/g, 3.2)
  addMatches('academic', /论文|答辩|综述|实验结果|消融实验|基线模型|定理|假设检验|显著性|参考文献|学位|导师|课题组|自然科学基金|临床|病例|诊疗|病理|患者|thesis|dissertation|ablation|methodology|empirical|et\s+al\.|arxiv|clinical|medical|diagnosis/gi, 3.2)
  addMatches('education', /课程|教学|培训|讲义|课堂|学习目标|知识点|课后练习|随堂|章节导读|实训|工坊|新员工|onboarding|workshop|syllabus|curriculum|lesson/gi, 3.0)
  addMatches('editorial', /品牌故事|人文|策展|可持续发展|碳中和|社会责任|非遗|文化洞察|建筑设计|工业设计|作品集|摄影集|奢侈品|高定|画册|黑金|ESG|sustainability|editorial|monograph|bauhaus|lookbook|luxury|atelier/gi, 2.9)
  addMatches('tech-pitch', /路演|融资|商业计划|种子轮|天使轮|[ABC]\s*轮|产品发布|新品发布|发布会|开发者大会|大模型|智能体|算力|苹果风|消费电子|创投简报|PRD评审|需求评审|开发者平台|极光发布|keynote|pitch\s*deck|product\s*launch|partner\s*memo|\bprd\b|developer\s*platform/gi, 3.1)
  addMatches('consulting', /战略|咨询|\bBCG\b|波士顿咨询|双碳战略|绿色转型|低碳转型|经营分析|商业复盘|周报|月报|季报|财报|业绩会|投研|预算|利润率|成本拆解|ROI|同比|环比|项目汇报|矩阵|漏斗|里程碑|OKR\s*复盘|行业研究|宏观洞察|地缘政治|通胀展望|智库报告|并购尽调|量化交易|安全态势|earnings|ebitda|okr\s*review|industry\s*research|macro\s*research/gi, 2.6)

  let bestPersona = 'consulting'
  let bestScore = 0
  for (const [persona, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestPersona = persona
    }
  }

  if (bestScore < 2.5) {
    return pickForPersona('consulting')
  }
  return pickForPersona(bestPersona)
}

// ---------------------------------------------------------------------------
// Markdown 叙事节奏自动升维器（smartLayout）—— 100% 保留原文文字，零删改升维版式
// ---------------------------------------------------------------------------

const METRIC_BULLET_RE = /(?:^|[^\d])[-+]?\d+(?:,\d{3})*(?:\.\d+)?\s*(?:[%％倍xX万亿千百元美元刀kKmMbB+]|个月|月|天|周|年|小时|分钟|秒|人|家|项|次|分|pp\b|bps\b|ms\b|pts?\b)/i
const STEP_BULLET_RE = /^(?:\*\*)?(?:第[一二三四五六七八1-8][步阶段期周月季年]|阶段\s*[一二三四五六1-6]|步骤\s*[1-8]|Step\s*\d+|Phase\s*\d+|Stage\s*\d+|Q[1-4]\b|20\d{2}\s*[年Q./-]|0?[1-6][\s.、:：-])/i
const COMPARE_TITLE_RE = /对比|比较|优劣|前后|现状与|问题与(?:对策|整改|方案|措施)|痛点与|挑战与|风险与(?:应对|措施|对策)|vs\.?\b|versus|before\s*(?:&|and)\s*after|pros?\s*(?:&|and)\s*cons?/i
const MATRIX_TITLE_RE = /矩阵|四象限|象限|优先级评估|SWOT|matrix|quadrant/i
const GANTT_TITLE_RE = /甘特|排期|时间表|交付计划|实施周期|进度排期|gantt|schedule|sprint\s*plan|delivery\s*plan/i
const ARCH_TITLE_RE = /技术架构|系统架构|平台架构|总体架构|分层架构|架构拓扑|system\s*architecture|platform\s*architecture|layered\s*architecture|tech\s*stack/i
const TAM_TITLE_RE = /市场规模|市场空间|可触达市场|\bTAM\b|\bSAM\b|\bSOM\b|addressable\s*market|market\s*sizing/i
const ORG_TITLE_RE = /组织架构|团队介绍|治理架构|汇报线|核心团队|管理团队|org\s*chart|organization|leadership\s*team|team\s*structure/i
const HARVEY_TITLE_RE = /竞品对比|能力矩阵|选型对比|能力评估|competitor\s*matrix|capability\s*matrix|feature\s*matrix|harvey/i
const MARIMEKKO_TITLE_RE = /marimekko|不等宽|市场地图|市场格局|竞争版图|赛道份额|market\s*map/i
const SANKEY_TITLE_RE = /sankey|桑基|流向图|资金流向|营收拆解|利润分配|营收转化|flow\s*diagram|revenue\s*bridge/i
const SWOT_TITLE_RE = /\bswot\b|优劣势与机会威胁/i
const PORTER_VALUE_CHAIN_RE = /波特价值链|porter\s*value\s*chain|辅助活动.*基本活动/i

function splitLeadAndBody(bullet) {
  const raw = String(bullet ?? '').trim()
  const boldMatch = /^\*\*([^*]+)\*\*\s*[:：—-]?\s*([\s\S]*)$/.exec(raw)
  if (boldMatch) {
    return { title: boldMatch[1].trim(), text: boldMatch[2].trim() }
  }
  const colonMatch = /^([^:：]{1,18})[:：]\s*([\s\S]+)$/.exec(raw)
  if (colonMatch) {
    return { title: stripInlineMarkdown(colonMatch[1]), text: colonMatch[2].trim() }
  }
  return { title: stripInlineMarkdown(raw), text: '' }
}

function extractMermaidFromSlide(slide) {
  if (typeof slide?.mermaid === 'string' && slide.mermaid.trim()) {
    return slide.mermaid.trim()
  }
  const textRaw = typeof slide?.text === 'string' ? slide.text : ''
  const fenceMatch = /```mermaid\s*\n([\s\S]*?)```/i.exec(textRaw)
  if (fenceMatch && fenceMatch[1].trim()) {
    return fenceMatch[1].trim()
  }
  const bullets = Array.isArray(slide?.bullets) ? slide.bullets : []
  const joined = [textRaw, ...bullets].filter(Boolean).join('\n')
  const joinedFence = /```mermaid\s*\n([\s\S]*?)```/i.exec(joined)
  if (joinedFence && joinedFence[1].trim()) {
    return joinedFence[1].trim()
  }
  if (bullets.length >= 2) {
    const first = String(bullets[0] ?? '').trim()
    const isMermaidHeader = /^(?:flowchart\s+(?:TD|TB|LR|RL)|graph\s+(?:TD|TB|LR|RL)|sequenceDiagram)\b/i.test(first)
    const hasEdges = bullets.slice(1).some((b) => /(?:-->|-.->|==>|---|<-->|->>|-->>)/.test(String(b)))
    if (isMermaidHeader && hasEdges) {
      return bullets.map((b) => String(b).trim()).join('\n')
    }
  }
  if (/^(?:flowchart\s+(?:TD|TB|LR|RL)|graph\s+(?:TD|TB|LR|RL)|sequenceDiagram)\b/i.test(textRaw.trim()) && /(?:-->|-.->|==>|->>|-->>)/.test(textRaw)) {
    return textRaw.trim()
  }
  return ''
}

export function promoteMarkdownSlides(slides, options = {}) {
  if (!Array.isArray(slides) || slides.length === 0) return slides

  const result = slides.map((s) => {
    const copy = { ...s }
    const mermaidCode = extractMermaidFromSlide(copy)
    if (mermaidCode && (!copy.layout || copy.layout === 'bullets' || copy.layout === 'mermaid' || copy.layout === 'flowchart' || copy.layout === 'sequence')) {
      copy.layout = 'mermaid'
      copy.mermaid = mermaidCode
    }
    return copy
  })

  const minBodySlides = options.explicitSmartLayout ? 2 : 4
  const bodyIndices = result
    .map((s, idx) => (!['cover', 'section', 'closing', 'agenda'].includes(s.layout) ? idx : -1))
    .filter((idx) => idx >= 0)

  if (bodyIndices.length < minBodySlides) return result

  let chapterIndex = 0
  let consecutiveBullets = 0
  let cardStyleToggle = 0

  for (let i = 0; i < result.length; i += 1) {
    const slide = result[i]
    if (['cover', 'closing', 'section', 'agenda'].includes(slide.layout)) {
      if (slide.layout === 'section') chapterIndex += 1
      consecutiveBullets = 0
      continue
    }

    chapterIndex += 1
    const curKicker = String(slide.kicker ?? '').trim()
    const curTitle = String(slide.title ?? '').trim()
    if (/^(?:要点|Key\s*point)$/i.test(curKicker) || (curKicker && curTitle && curKicker === curTitle)) {
      slide.kicker = String(chapterIndex).padStart(2, '0')
    }

    if (slide.layout === 'mermaid' || (typeof slide.mermaid === 'string' && slide.mermaid.trim())) {
      slide.layout = 'mermaid'
      slide.mermaid = String(slide.mermaid).trim()
      consecutiveBullets = 0
      continue
    }

    if (slide.layout !== 'bullets' || !Array.isArray(slide.bullets) || slide.bullets.length === 0) {
      consecutiveBullets = 0
      continue
    }

    const bullets = slide.bullets
    const n = bullets.length
    const plainLengths = bullets.map((b) => stripInlineMarkdown(b).length)
    const maxLen = Math.max(...plainLengths)
    const avgLen = plainLengths.reduce((a, b) => a + b, 0) / n
    const metricHits = bullets.filter((b) => METRIC_BULLET_RE.test(stripInlineMarkdown(b))).length
    const stepHits = bullets.filter((b) => STEP_BULLET_RE.test(String(b).trim())).length
    const titleText = String(slide.title ?? '')

    // Phase 3 Pro Diagrams auto-promotion (100% text-preserving)
    if (n >= 2 && n <= 6 && GANTT_TITLE_RE.test(titleText) && maxLen <= 80) {
      const useQuarters = /Q[1-4]|季度/i.test(titleText + ' ' + bullets.join(' '))
      const cols = useQuarters ? ['Q1', 'Q2', 'Q3', 'Q4'] : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6']
      slide.layout = 'gantt'
      slide.variant = useQuarters ? 'quarters' : 'months'
      slide.columns = cols
      slide.items = bullets.map((b, idx) => {
        const { title, text } = splitLeadAndBody(b)
        const span = Math.max(1, Math.min(cols.length, Math.ceil(cols.length / Math.max(2, n))))
        const start = Math.min(cols.length - span, Math.floor((idx * (cols.length - span)) / Math.max(1, n - 1)))
        return {
          tag: `T${idx + 1}`,
          title,
          ...(text ? { text } : {}),
          start,
          span,
          ...(idx === 0 ? { status: 'accent' } : {}),
        }
      })
      consecutiveBullets = 0
      continue
    }

    if (n >= 2 && n <= 5 && ARCH_TITLE_RE.test(titleText) && maxLen <= 90) {
      slide.layout = 'architecture'
      slide.variant = 'layered'
      slide.items = bullets.map((b, idx) => {
        const { title, text } = splitLeadAndBody(b)
        const subMods = text
          ? text.split(/[、，,;；/]+/).map((p) => stripInlineMarkdown(p).trim()).filter(Boolean).slice(0, 4)
          : []
        return {
          tag: `L${idx + 1}`,
          title,
          ...(subMods.length > 0 ? { bullets: subMods } : (text ? { text } : {})),
          ...(idx === n - 1 && /安全|治理|观测|监控|security|governance|observability/i.test(b) ? { status: 'accent' } : {}),
        }
      })
      consecutiveBullets = 0
      continue
    }

    if (n >= 2 && n <= 4 && TAM_TITLE_RE.test(titleText) && maxLen <= 84) {
      const tamTags = ['TAM', 'SAM', 'SOM', 'Target']
      slide.layout = 'tam'
      slide.variant = 'concentric'
      slide.items = bullets.slice(0, 3).map((b, idx) => {
        const { title, text } = splitLeadAndBody(b)
        const valMatch = /(\$?\s*\d+(?:[.,]\d+)?\s*(?:[万亿千百kKmMbBtT]+|亿元|亿美元|美元|元)?)/.exec(b)
        return {
          tag: tamTags[idx] || `L${idx + 1}`,
          ...(valMatch ? { value: valMatch[1].trim() } : {}),
          title,
          ...(text ? { text } : {}),
        }
      })
      consecutiveBullets = 0
      continue
    }

    if (n >= 2 && n <= 6 && ORG_TITLE_RE.test(titleText) && maxLen <= 80) {
      const isTeam = /团队|管理层|核心成员|bios?|leadership|team/i.test(titleText)
      slide.layout = 'org'
      slide.variant = isTeam ? 'team' : 'tree'
      slide.items = bullets.map((b, idx) => {
        const { title, text } = splitLeadAndBody(b)
        return {
          tag: idx === 0 && !isTeam ? 'Lead' : `0${idx + 1}`,
          title,
          ...(text ? { text } : {}),
        }
      })
      consecutiveBullets = 0
      continue
    }

    if (n >= 2 && n <= 5 && HARVEY_TITLE_RE.test(titleText) && maxLen <= 84) {
      const rows = [['维度 / Dimension', '本方案 / Ours', '传统方案 / Legacy']]
      bullets.forEach((b) => {
        const { title, text } = splitLeadAndBody(b)
        const hasSignal = /[●◕◑◔○✓✗]/.exec(text || b)
        rows.push([
          title,
          hasSignal ? hasSignal[0] : '●',
          text ? text.slice(0, 22) : '◑',
        ])
      })
      slide.layout = 'harvey'
      slide.rows = rows
      consecutiveBullets = 0
      continue
    }

    if (n >= 2 && n <= 8 && (SANKEY_TITLE_RE.test(titleText) || bullets.filter((b) => /(?:->|→)/.test(b) && /\d/.test(b)).length / n >= 0.66) && maxLen <= 96) {
      slide.layout = 'sankey'
      consecutiveBullets = 0
      continue
    }

    if (n >= 2 && n <= 6 && MARIMEKKO_TITLE_RE.test(titleText) && maxLen <= 96) {
      slide.layout = 'marimekko'
      consecutiveBullets = 0
      continue
    }

    if (n === 4 && SWOT_TITLE_RE.test(titleText) && maxLen <= 80) {
      slide.layout = 'swot'
      consecutiveBullets = 0
      continue
    }

    if (n === 4 && MATRIX_TITLE_RE.test(titleText) && maxLen <= 68) {
      slide.layout = 'matrix'
      slide.variant = '2x2'
      consecutiveBullets = 0
      continue
    }

    if (n >= 2 && n <= 6 && COMPARE_TITLE_RE.test(titleText) && maxLen <= 76) {
      slide.layout = 'comparison'
      slide.variant = /问题|痛点|风险|挑战|阻塞/.test(titleText) ? 'issue-action' : 'versus'
      consecutiveBullets = 0
      continue
    }

    if (n >= 3 && n <= 8 && PORTER_VALUE_CHAIN_RE.test(titleText + ' ' + bullets.join(' ')) && maxLen <= 90) {
      slide.layout = 'value-chain'
      consecutiveBullets = 0
      continue
    }

    if (n >= 3 && n <= 6 && /价值链|端到端|全链路|研产销|产业链|业务链路|value\s*chain|end-to-end/i.test(titleText) && maxLen <= 74) {
      slide.layout = 'process'
      slide.variant = 'chevron'
      consecutiveBullets = 0
      continue
    }

    if (n >= 3 && n <= 6 && /转化漏斗|销售漏斗|获客漏斗|漏斗转化|conversion\s*funnel|sales\s*funnel/i.test(titleText) && maxLen <= 74) {
      slide.layout = 'process'
      slide.variant = 'funnel'
      consecutiveBullets = 0
      continue
    }

    if (n >= 3 && n <= 6 && stepHits / n >= 0.66 && maxLen <= 68) {
      slide.layout = 'process'
      slide.variant = /Q[1-4]\b|20\d{2}|月|周|年|季度/.test(bullets.join(' ')) ? 'timeline' : 'steps'
      consecutiveBullets = 0
      continue
    }

    if (n >= 2 && n <= 4 && metricHits / n >= 0.75 && avgLen <= 46 && maxLen <= 64) {
      slide.layout = 'kpi'
      slide.variant = 'grid'
      consecutiveBullets = 0
      continue
    }

    // 节奏破冰：严禁连续超过 2 页纯列表页，同时保证多章节演示具备卡片/重点提炼呼吸感
    const distinctLayoutsSoFar = new Set(result.map((s) => s.layout)).size
    const needsDiversity = bodyIndices.length >= 4 && distinctLayoutsSoFar < 3 && i >= 2
    if ((consecutiveBullets >= 2 || needsDiversity) && n >= 2 && n <= 6 && maxLen <= 74) {
      if (cardStyleToggle % 3 === 2 && n <= 4) {
        slide.layout = 'callout'
        slide.variant = 'takeaways'
      } else {
        slide.layout = 'cards'
        slide.variant = (n === 3 || n === 4) && cardStyleToggle % 2 === 0 ? 'bento' : 'pillars'
      }
      cardStyleToggle += 1
      consecutiveBullets = 0
      continue
    }

    if (consecutiveBullets >= 2 && n > 6) {
      slide.layout = 'bullets'
      slide.variant = 'two-column'
      consecutiveBullets = 1
      continue
    }

    consecutiveBullets += 1
  }

  return result
}

// ---------------------------------------------------------------------------
// SLOP-01..10 审美门禁（校准零误报边界，精准拦截平庸排版反模式）
// ---------------------------------------------------------------------------

const WEAK_TOPIC_TITLE_RE = /^(?:第?[一二三四五六七八九十\d]+[章节部分页、.\s-]*)?(?:项目背景|研究背景|背景介绍|关于我们|目录页|数据分析|图表展示|相关内容|内容介绍|情况说明|总结汇报|Overview|Introduction|Background|Data\s*Analysis|Chart|Slide\s*\d+)$/i
const BARE_CLOSING_RE = /^(?:谢谢|感谢(?:聆听|观看|大家|指导)?|Thank\s*You|Thanks|Q\s*&\s*A)[!！.。?？\s]*$/i
const ACTION_SIGNAL_RE = /\d|提升|增长|下降|降低|突破|领跑|加速|驱动|重构|翻倍|缩减|达成|优于|显著|超预期|关键|核心|原因|差距|拐点|集中|贡献|increase|decrease|grow|drop|drive|outperform|lead|double|cut|key|top|why|how/i

export function auditSlideAesthetics(manifest, theme, textWidthFn) {
  const issues = []
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  if (slides.length === 0) return issues

  const push = (index, code, message, suggestion, severity = 'warning') => {
    issues.push({
      slide: index + 1,
      slideId: slides[index]?.id,
      severity,
      code,
      message,
      suggestion,
    })
  }

  // SLOP-07: 高饱和刺眼内容底色检查
  if (theme?.palette?.bg) {
    const bgHsl = hexToHsl(theme.palette.bg)
    const bgLum = relativeLuminance(theme.palette.bg)
    if (bgHsl.s > 0.38 && bgLum > 0.06 && bgLum < 0.80) {
      push(
        0,
        'saturated-canvas',
        '内容页背景饱和度过高（' + theme.palette.bg + '），长时间投影易造成视觉疲劳（SLOP-07）',
        '建议改用浅色护眼画布（如 consulting / exec-jilan / exec-palace），仅将高饱和品牌色用于封面与强调点缀',
      )
    }
  }

  let genericKickerCount = 0
  let firstGenericKickerSlide = -1
  let maxConsecutiveBullets = 0
  let curConsecutiveBullets = 0
  let streakSlideIndex = 0

  slides.forEach((slide, i) => {
    const layout = slide.layout || 'bullets'
    const isFraming = ['cover', 'section', 'closing', 'agenda', 'quote'].includes(layout)
    const title = String(slide.title ?? '').trim()

    // SLOP-01: 空洞目录式标题
    if (!isFraming && title && WEAK_TOPIC_TITLE_RE.test(title)) {
      push(
        i,
        'weak-topic-title',
        '标题「' + title + '」属于纯话题标签，缺少核心结论主张（SLOP-01）',
        '将标题改写为包含事实或判断的观点句（Action Title），例如「Q3 华东区复购率提升 18% 驱动整体超额达成」',
      )
    }

    // SLOP-02: 机械重复页眉 Kicker 统计
    if (!isFraming && /^(?:要点|Key\s*point)(?:\s*\d+)?$/i.test(String(slide.kicker ?? '').trim())) {
      genericKickerCount += 1
      if (firstGenericKickerSlide < 0) firstGenericKickerSlide = i
    }

    // SLOP-03: 整页文字墙（单条过长或单页总字宽过载）
    const bullets = Array.isArray(slide.bullets) ? slide.bullets : []
    if (['bullets', 'cards', 'kpi', 'process', 'comparison'].includes(layout) && bullets.length > 0) {
      const widths = bullets.map((b) => textWidthFn(stripInlineMarkdown(b)))
      const totalWidth = widths.reduce((a, b) => a + b, 0)
      if (widths.some((w) => w > 72) || totalWidth > 270) {
        push(
          i,
          'wall-of-text',
          '单页文字密度过高，存在大段长句堆砌（SLOP-03）',
          '采用「**加粗核心词**：精炼论据」结构，每条控制在 36 字以内，或拆分为卡片页 / 图表页',
        )
      }
    }

    // SLOP-04: 结构化组件数量越界
    const explicitCount = Array.isArray(slide.items) && slide.items.length > 0 ? slide.items.length : 0
    if (
      (layout === 'kpi' && explicitCount > 4) ||
      (layout === 'cards' && explicitCount > 6) ||
      (layout === 'process' && explicitCount > 6) ||
      (layout === 'matrix' && explicitCount > 0 && explicitCount !== 4)
    ) {
      push(
        i,
        'card-count-overflow',
        layout + ' 版式包含 ' + explicitCount + ' 个子项，超出最佳视觉承载上限（SLOP-04）',
        'KPI 建议 2–4 项、卡片与流程建议 3–6 项、四象限矩阵固定 4 项；多余条目请拆页展示',
      )
    }

    // SLOP-05: 意面折线图与碎块饼图
    if (slide.chart) {
      const kind = slide.chart.kind || 'column'
      const seriesCount = slide.chart.series?.length ?? 0
      const catCount = slide.chart.categories?.length ?? 0
      if ((kind === 'line' || kind === 'area') && seriesCount > 4) {
        push(
          i,
          'chart-spaghetti',
          '折线/面积图叠加了 ' + seriesCount + ' 个系列，线条交叉易成视觉乱麻（SLOP-05）',
          '保留最多 3–4 条关键序列，或改用分面卡片 / chart-split 聚焦主序列对比',
        )
      } else if ((kind === 'pie' || kind === 'doughnut') && catCount > 6) {
        push(
          i,
          'chart-spaghetti',
          '饼图/环形图包含 ' + catCount + ' 个扇区，细小扇区难以辨认（SLOP-05）',
          '将尾部细项合并为「其他」（控制在 5 项以内），或改用排序后的横向条形图 bar',
        )
      }
    }

    // SLOP-06: 单页超长密集表格
    if (layout === 'table' && (slide.rows?.length ?? 0) > 9) {
      push(
        i,
        'table-overload',
        '单页表格达到 ' + slide.rows.length + ' 行，远距投影阅读吃力（SLOP-06）',
        '提炼前 5–7 行核心条目并配合 takeaway 结论条，明细表建议放入附录或拆页',
      )
    }

    // SLOP-08 连续纯列表计数
    if (layout === 'bullets') {
      curConsecutiveBullets += 1
      if (curConsecutiveBullets > maxConsecutiveBullets) {
        maxConsecutiveBullets = curConsecutiveBullets
        streakSlideIndex = i
      }
    } else if (!['section', 'agenda'].includes(layout)) {
      curConsecutiveBullets = 0
    }

    // SLOP-09: 空洞收尾页
    if (layout === 'closing') {
      const hasDetail =
        Boolean(String(slide.subtitle ?? '').trim()) ||
        (Array.isArray(slide.bullets) && slide.bullets.length > 0) ||
        (Array.isArray(slide.items) && slide.items.length > 0) ||
        Boolean(String(slide.takeaway ?? '').trim())
      if (BARE_CLOSING_RE.test(title) && !hasDetail) {
        push(
          i,
          'bare-closing',
          '收尾页仅有礼貌致谢词，缺少可执行的下一步行动或联系信息（SLOP-09）',
          '补充具体的下一步决策事项、责任人时间表或联系方式（subtitle / items）',
        )
      }
    }

    // SLOP-10: 图表页无核心发现解读
    if (slides.length >= 5 && layout === 'chart' && slide.chart) {
      const hasTakeaway = Boolean(String(slide.takeaway ?? '').trim() || String(slide.chart.caption ?? '').trim() || String(slide.subtitle ?? '').trim())
      if (!hasTakeaway && !ACTION_SIGNAL_RE.test(title)) {
        push(
          i,
          'missing-chart-callout',
          '图表页缺少趋势结论句或底部 takeaway 洞察（SLOP-10）',
          '在标题中直接点明核心数值变化，或补充 takeaway / chart-split 解读卡片',
        )
      }
    }
  })

  if (genericKickerCount >= 3) {
    push(
      firstGenericKickerSlide,
      'repetitive-kicker',
      '全篇有 ' + genericKickerCount + ' 页重复使用机械页眉「要点 / Key point」（SLOP-02）',
      '将 kicker 替换为章节脉络标签（如「01 · 市场洞察」「02 · 增长引擎」）以建立叙事方位感',
    )
  }

  if (slides.length >= 8) {
    const distinctLayouts = new Set(slides.map((s) => s.layout || 'bullets')).size
    if (maxConsecutiveBullets >= 4 || distinctLayouts < 3) {
      push(
        maxConsecutiveBullets >= 4 ? streakSlideIndex : 1,
        'layout-monotony',
        '长篇演示版式单一（连续 ' + maxConsecutiveBullets + ' 页纯列表，全篇仅 ' + distinctLayouts + ' 种版式）（SLOP-08）',
        '穿插使用 kpi 指标页、cards 卡片页、process 流程页、comparison 对比页或 chart-split 图文解读页打破单调',
      )
    }
  }

  return issues
}

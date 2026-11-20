/** Operator-only workbench. Paths come from successful tools, never browser input. */
import { createHash, randomUUID } from 'node:crypto'
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { getEngine, type PptExecution } from './execution.js'
import { buildRemotionBundleFiles, computePaceBudgetFallback, renderOnePagerHtmlFallback } from './ecosystem.js'
import type { DeckEngine } from './types.js'
import { bilingualQuality, englishWorkbenchMessage } from './workbench-language.js'
import { zipSync, strToU8 } from 'fflate'
import { PptCoaching } from './coaching.js'
import type { CoachingModel, ModelRoute } from './coaching-model.js'
import { PptVisual } from './visual.js'
import type { VisualModel } from './visual-model.js'

export const PPT_WORKBENCH_ROUTE = '/api/dsh-ppt/workbench'
export const PPT_DOWNLOAD_ROUTE = '/api/dsh-ppt/download'
const REQUEST_LIMIT = 36 * 1024 * 1024
const ABSORB_PPTX_LIMIT = 24 * 1024 * 1024
const FILE_LIMIT = 64 * 1024 * 1024
const BUNDLE_LIMIT = 128 * 1024 * 1024

const ALLOWED_LAYOUTS = new Set([
  'cover', 'agenda', 'section', 'bullets', 'statement', 'quote',
  'kpi', 'cards', 'comparison', 'matrix', 'process', 'callout',
  'gantt', 'architecture', 'harvey', 'tam', 'org',
  'marimekko', 'sankey', 'swot',
  'mockup', 'code', 'quadrant', 'radar', 'dumbbell', 'heatmap',
  'table', 'closing', 'image', 'image-left', 'image-right', 'chart', 'chart-split',
  'waterfall', 'gallery', 'flywheel', 'chevron', 'value-chain',
  'mermaid', 'flowchart', 'sequence',
])
const ALLOWED_TABLE_STYLES = new Set(['consulting', 'booktabs', 'minimal', 'banded', 'harvey'])
const ALLOWED_DENSITIES = new Set(['compact', 'balanced', 'airy'])
const ALLOWED_ITEM_STATUS = new Set(['neutral', 'accent', 'positive', 'negative', 'warning'])
const ALLOWED_CHROME_STYLES = new Set(['consulting-classic', 'keynote-spatial', 'editorial-folio', 'saas-bento', 'academic-minimal', 'gov-ceremonial'])
const ALLOWED_CARD_MATERIALS = new Set(['solid', 'frameless', 'glass', 'editorial-rule'])
const ALLOWED_ICON_MODES = new Set(['off', 'explicit', 'auto'])
const ALLOWED_COVER_PATTERNS = new Set(['dots', 'grid', 'rings'])
const ITEM_KEYS = new Set(['tag', 'badge', 'title', 'text', 'body', 'value', 'unit', 'delta', 'start', 'span', 'milestone', 'role', 'conversion', 'icon', 'avatar', 'x', 'y', 'size', 'before', 'after', 'status', 'tone', 'bullets'])
const BRAND_KEYS = new Set(['name', 'primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'fontFamily', 'headingFont', 'coverMode', 'coverBg', 'logo', 'footer', 'chromeStyle', 'cardMaterial', 'iconMode', 'taste'])
const VISUAL_KEYS = new Set(['titleSize', 'bodySize', 'chartLabelSize', 'density', 'tableStyle', 'chrome'])

/** Sharing keeps the offline deck, but omits the control for a project not in the ZIP. */
function shareHtml(bytes: Buffer): Uint8Array {
  const html = bytes.toString('utf8'), marker = '<a id="download-project"'
  const start = html.indexOf(marker)
  if (start < 0) return bytes
  const end = html.indexOf('</a>', start + marker.length)
  if (end < 0 || end - start > 4096 || html.indexOf(marker, end + 4) >= 0) throw new Error('HTML 工程下载入口异常，请保存副本后重试')
  return strToU8(html.slice(0, start) + html.slice(end + 4))
}
type Project = { id: string; path: string; title: string; updatedAt: string; theme?: string; slideCount?: number; revision?: number; modelRoute?: ModelRoute }
type Render = { revision: number; pngPaths: string[]; pngHashes: string[]; missingFonts?: string[]; sourceSha256: string }
type WorkbenchEngine = DeckEngine & {
  readDeckProject(options: Record<string, unknown>): { manifest: any; path: string }
  absorbPptx?(options: any): Promise<any>
}
type Options = { catalogPath?: string; loadEngine?: () => Promise<WorkbenchEngine>; coachingModel?: CoachingModel; visualModel?: VisualModel }
const digest = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex')

function ordinaryFile(path: string): Buffer {
  const stat = lstatSync(path)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > FILE_LIMIT) throw new Error('文件不是普通文件或超过 64 MiB')
  return readFileSync(path)
}
function pathsFor(path: string) { const base = path.slice(0, -5); return { json: path, html: base + '.html', pptx: base + '.pptx' } }
function speakerNotes(manifest: any): string {
  const label = (zh: string, en: string): string => manifest.language === 'en' ? en : manifest.language === 'bilingual' ? zh + ' / ' + en : zh
  const heading = (value: unknown): string => String(value ?? '').replace(/[\r\n]+/g, ' ').trim()
  const sections = manifest.slides.map((slide: any, index: number) => {
    const title = heading(slide.title) || label('第 ' + (index + 1) + ' 页', 'Slide ' + (index + 1))
    const notes = typeof slide.notes === 'string' && slide.notes.trim() ? slide.notes : label('（本页未填写演讲备注。）', '(No speaker notes for this slide.)')
    return '## ' + (index + 1) + '. ' + title + '\n\n' + notes
  })
  return '# ' + heading(manifest.title) + '\n\n' + sections.join('\n\n---\n\n') + '\n'
}
function starterSlide(archetype: unknown, language: unknown): Record<string, unknown> {
  const en = language === 'en'
  const kind = typeof archetype === 'string' && ALLOWED_LAYOUTS.has(archetype) ? archetype : 'bullets'
  if (kind === 'kpi') {
    return {
      layout: 'kpi',
      variant: 'grid',
      title: en ? 'Key metrics show clear momentum' : '核心指标呈现稳健增长态势',
      items: [
        { value: '98.5%', title: en ? 'Completion rate' : '关键任务达成率', delta: en ? '+4.2% QoQ' : '环比 +4.2%', status: 'positive' },
        { value: '2.4x', title: en ? 'Efficiency gain' : '协同交付效率', delta: en ? 'Verified' : '阶段核验', status: 'accent' },
        { value: '12', unit: en ? 'wks' : '周', title: en ? 'Lead cycle' : '端到端交付周期', delta: en ? '-30%' : '缩短 30%', status: 'positive' },
      ],
    }
  }
  if (kind === 'cards') {
    return {
      layout: 'cards',
      variant: 'pillars',
      title: en ? 'Three strategic pillars drive execution' : '三大核心支柱支撑目标落地',
      items: [
        { tag: '01', title: en ? 'Clear focus' : '聚焦核心场景', text: en ? 'Concentrate resources on high-impact deliverables.' : '围绕高频刚需场景集中投入，避免战线分散。' },
        { tag: '02', title: en ? 'Standardized flow' : '标准化工作流', text: en ? 'Unify templates, review gates, and handoff criteria.' : '统一输入规范、质量门禁与跨团队交接标准。' },
        { tag: '03', title: en ? 'Measurable loop' : '量化闭环复盘', text: en ? 'Track leading indicators and iterate weekly.' : '按周追踪先行指标，及时纠偏并沉淀经验。' },
      ],
    }
  }
  if (kind === 'comparison') {
    return {
      layout: 'comparison',
      variant: 'versus',
      title: en ? 'Upgraded workflow removes manual bottlenecks' : '新方案消除人工瓶颈并提升交付确定性',
      items: [
        { tag: en ? 'Before' : '调整前', title: en ? 'Fragmented handoffs' : '流程分散、口径不一', text: en ? 'Repeated manual formatting and late quality checks.' : '依赖人工反复改版，交付前才发现遗漏。', status: 'neutral' },
        { tag: en ? 'After' : '调整后', title: en ? 'Integrated delivery' : '同源构建、闭环核验', text: en ? 'Synchronized outputs with traceable metrics and checks.' : '多端产物一次同步生成，关键数字可追溯。', status: 'positive' },
      ],
    }
  }
  if (kind === 'matrix') {
    return {
      layout: 'matrix',
      variant: '2x2',
      title: en ? 'Prioritize high-impact, quick-win initiatives' : '按价值与实施难度划分四象限优先级',
      items: [
        { tag: 'Q1', title: en ? 'Quick wins' : '优先速赢项', text: en ? 'High impact, low complexity — ship first.' : '高价值、低阻力，本阶段优先落地。', status: 'positive' },
        { tag: 'Q2', title: en ? 'Strategic bets' : '战略攻坚项', text: en ? 'High impact, staged milestones required.' : '高价值、长周期，分阶段里程碑推进。', status: 'accent' },
        { tag: 'Q3', title: en ? 'Routine upkeep' : '常规维护项', text: en ? 'Automate and keep lightweight.' : '保持自动化轻量运转，控制投入。', status: 'neutral' },
        { tag: 'Q4', title: en ? 'Defer / prune' : '暂缓或精简', text: en ? 'Low return — avoid resource dilution.' : '收益有限，避免分散核心团队精力。', status: 'warning' },
      ],
    }
  }
  if (kind === 'chevron') {
    return {
      layout: 'process',
      variant: 'chevron',
      title: en ? 'End-to-end value chain and stage conversion' : '端到端业务价值链与阶段转化效能',
      items: [
        { tag: '01', title: en ? 'Discovery' : '需求洞察', text: en ? 'Capture high-intent demand and scope.' : '聚焦高频刚需痛点与准入标准。', conversion: '100%' },
        { tag: '02', title: en ? 'Build & Pilot' : '敏捷验证', text: en ? 'Ship MVP benchmark with fast feedback.' : '快速交付标杆样板并完成实测。', conversion: '68%' },
        { tag: '03', title: en ? 'Scale Rollout' : '规模推广', text: en ? 'Standardize playbooks across teams.' : '沉淀标准手册，多业务线铺开。', conversion: '45%' },
        { tag: '04', title: en ? 'Compounding' : '复购续费', text: en ? 'Drive net retention and expansion.' : '持续复盘成效，驱动高净留存。', conversion: '118% NRR' },
      ],
    }
  }
  if (kind === 'value-chain') {
    return {
      layout: 'value-chain',
      title: en ? 'Porter value chain drives sustainable margin expansion' : '波特价值链：辅助底座赋能基本活动持续扩大利润空间',
      items: [
        { tag: en ? 'Support' : '辅助活动', title: en ? 'Firm Infrastructure & Governance' : '企业基础设施与敏捷治理', text: en ? 'Unified metrics, compliance, and cross-org alignment.' : '统一经营口径、合规风控与跨部门资源协同。' },
        { tag: en ? 'Support' : '辅助活动', title: en ? 'R&D & Technology Platform' : '技术研发与数字化中台', text: en ? 'AI workflow engine, automated QA, and telemetry.' : '智能编排引擎、自动化测试与全链路可观测。' },
        { tag: en ? 'Primary' : '基本活动', title: en ? 'Inbound Supply' : '需求洞察与准入', text: en ? 'High-intent capture' : '聚焦高价值需求', status: 'neutral' },
        { tag: en ? 'Primary' : '基本活动', title: en ? 'Core Operations' : '标准化交付', text: en ? 'Automated build' : '同源构建零返工', status: 'accent' },
        { tag: en ? 'Primary' : '基本活动', title: en ? 'Go-to-Market' : '市场拓展与转化', text: en ? 'Benchmark rollout' : '标杆样板规模复制', status: 'accent' },
        { tag: en ? 'Primary' : '基本活动', title: en ? 'Service & Retention' : '全周期运营复购', text: en ? '118% net retention' : '驱动高净留存增长', status: 'positive' },
      ],
    }
  }
  if (kind === 'marimekko') {
    return {
      layout: 'marimekko',
      title: en ? 'Market sizing & share across key verticals (Marimekko)' : '细分赛道规模与竞争份额分布（不等宽市场图）',
      rows: en
        ? [['Player / Segment', 'Enterprise (45B)', 'Financial (32B)', 'Industrial (23B)'], ['Ours', '42%', '35%', '28%'], ['Vendor B', '33%', '40%', '32%'], ['Others', '25%', '25%', '40%']]
        : [['厂商 / 赛道', '华东政务 (450亿)', '金融信创 (320亿)', '工业制造 (230亿)'], ['本方案', '42%', '35%', '28%'], ['厂商 B', '33%', '40%', '32%'], ['其他', '25%', '25%', '40%']],
    }
  }
  if (kind === 'sankey') {
    return {
      layout: 'sankey',
      title: en ? 'Revenue-to-operating-income flow attribution (Sankey)' : '总营收至营业利润全链路流向拆解（桑基图）',
      items: en
        ? [
            { tag: 'Total Revenue', title: 'Gross Profit', value: '68.5', unit: 'B', status: 'positive' },
            { tag: 'Total Revenue', title: 'Cost of Revenue', value: '31.5', unit: 'B', status: 'neutral' },
            { tag: 'Gross Profit', title: 'R&D Investment', value: '22.0', unit: 'B', status: 'accent' },
            { tag: 'Gross Profit', title: 'Sales & Ops', value: '12.0', unit: 'B', status: 'warning' },
            { tag: 'Gross Profit', title: 'Operating Income', value: '34.5', unit: 'B', status: 'positive' },
          ]
        : [
            { tag: '总营收', title: '毛利润', value: '68.5', unit: '亿', status: 'positive' },
            { tag: '总营收', title: '营业成本', value: '31.5', unit: '亿', status: 'neutral' },
            { tag: '毛利润', title: '研发投入', value: '22.0', unit: '亿', status: 'accent' },
            { tag: '毛利润', title: '营销与管理', value: '12.0', unit: '亿', status: 'warning' },
            { tag: '毛利润', title: '营业利润', value: '34.5', unit: '亿', status: 'positive' },
          ],
    }
  }
  if (kind === 'swot') {
    return {
      layout: 'swot',
      title: en ? 'SWOT strategic matrix and positioning anchor' : 'SWOT 战略矩阵与破局定位锚点',
      items: en
        ? [
            { tag: 'S · Strengths', title: 'Core moat', bullets: ['HTML & native OOXML parity', 'Zero-dep deterministic layout'], status: 'positive' },
            { tag: 'W · Weaknesses', title: 'Current gaps', bullets: ['Custom legacy templates need mapping', 'Optional render engine setup'], status: 'warning' },
            { tag: 'O · Opportunities', title: 'Market tailwinds', bullets: ['Enterprise slide automation demand', 'Legacy .pptx refurbishment market'], status: 'accent' },
            { tag: 'T · Threats', title: 'External risks', bullets: ['Strict brand compliance lock-in', 'Browser sandbox constraints'], status: 'negative' },
          ]
        : [
            { tag: 'S · 核心优势', title: '技术与交付壁垒', bullets: ['HTML 与原生 OOXML 双向同源', '零外部运行时依赖确定性排版'], status: 'positive' },
            { tag: 'W · 关键短板', title: '待补齐环节', bullets: ['复杂存量模板首次梳理需微调', '高清渲染核验依赖可选引擎'], status: 'warning' },
            { tag: 'O · 外部机遇', title: '行业增长空间', bullets: ['政企与咨询智能制图需求爆发', '老旧 PPTX 一键翻新刚需'], status: 'accent' },
            { tag: 'T · 潜在威胁', title: '外部风险挑战', bullets: ['客户既有母版规范约束多', '内网离线受限环境部署门槛'], status: 'negative' },
          ],
    }
  }
  if (kind === 'process') {
    return {
      layout: 'process',
      variant: 'steps',
      title: en ? 'Four-stage execution roadmap' : '分四阶段推进方案落地与验收',
      items: [
        { tag: '01', title: en ? 'Align scope' : '明确边界', text: en ? 'Confirm goals, metrics, and constraints.' : '对齐业务目标、考核口径与资源边界。' },
        { tag: '02', title: en ? 'Pilot build' : '样板试点', text: en ? 'Validate core workflow on one benchmark.' : '跑通首个标杆样板，验证端到端闭环。' },
        { tag: '03', title: en ? 'Scale rollout' : '全面推广', text: en ? 'Expand coverage with standard playbooks.' : '沉淀标准手册，向全业务线有序铺开。' },
        { tag: '04', title: en ? 'Audit & refine' : '复盘固化', text: en ? 'Review outcomes and lock best practices.' : '核验量化成效，将最佳实践固化为制度。' },
      ],
    }
  }
  if (kind === 'callout') {
    return {
      layout: 'callout',
      variant: 'takeaways',
      title: en ? 'Core takeaways and immediate actions' : '核心结论与下一步行动清单',
      text: en ? 'Confirm owner assignments and milestone dates before the kick-off review.' : '请在启动评审前确认各项任务负责人与关键时间节点。',
      bullets: en ? ['Confirm baseline metrics and target thresholds', 'Assign milestone owners and weekly check-ins'] : ['确认基线数据与阶段目标阈值', '明确各模块负责人与周度跟进机制'],
    }
  }
  if (kind === 'table') {
    return {
      layout: 'table',
      tableStyle: 'consulting',
      title: en ? 'Milestone ownership and delivery schedule' : '关键里程碑、负责人与交付节点一览',
      rows: en
        ? [['Workstream', 'Owner', 'Target', 'Status'], ['Core architecture', 'Platform', 'Q2', 'On track'], ['Validation suite', 'QA', 'Q3', 'Planned']]
        : [['工作模块', '负责人', '目标节点', '当前状态'], ['核心方案搭建', '研发组', 'Q2', '按计划推进'], ['全量验收交付', '质量组', 'Q3', '待启动']],
    }
  }
  if (kind === 'gantt') {
    return {
      layout: 'gantt',
      variant: 'quarters',
      title: en ? 'Quarterly execution roadmap and key milestones' : '季度推进甘特图与关键里程碑节点',
      columns: ['Q1', 'Q2', 'Q3', 'Q4'],
      items: [
        { tag: en ? 'Foundation' : '底座建设', title: en ? 'Core platform & schema' : '核心架构与协议落地', start: 0, span: 2, status: 'accent' },
        { tag: en ? 'Rollout' : '试点推广', title: en ? 'Pilot deployment & review' : '标杆场景试点与验证', start: 1, span: 2, status: 'positive' },
        { tag: en ? 'Launch' : '正式验收', title: en ? 'Production GA sign-off' : '全量上线验收里程碑', start: 3, span: 0, milestone: true, status: 'warning' },
      ],
    }
  }
  if (kind === 'architecture') {
    return {
      layout: 'architecture',
      variant: 'layered',
      title: en ? 'Layered system architecture and governance backbone' : '分层系统架构与跨层安全治理底座',
      items: [
        { tag: en ? 'Experience' : '交互层', title: en ? 'Portal & Workbench' : '多端工作台与交互入口', bullets: en ? ['Web Studio', 'CLI & SDK'] : ['可视化工作台', 'CLI 与插件接口'] },
        { tag: en ? 'Orchestration' : '编排层', title: en ? 'Workflow & Agent Engine' : '智能编排与推理引擎', bullets: en ? ['Task Router', 'Policy Guard'] : ['任务路由', '规则门禁'] },
        { tag: en ? 'Foundation' : '底座层', title: en ? 'Storage & Audit Ledger' : '同源存储与审计追踪', bullets: en ? ['Atomic Store', 'Telemetry'] : ['原子落盘', '全链路可观测'] },
        { tag: en ? 'Cross-cutting' : '横切保障', title: en ? 'Security & Compliance' : '安全合规与权限隔离', status: 'accent', bullets: en ? ['Zero Trust', 'Audit Trail'] : ['最小权限', '审计留痕'] },
      ],
    }
  }
  if (kind === 'harvey') {
    return {
      layout: 'harvey',
      tableStyle: 'harvey',
      title: en ? 'Capability matrix highlights full-stack differentiation' : '核心能力哈维球评估矩阵凸显差异化优势',
      rows: en
        ? [['Capability', 'Ours', 'Vendor A', 'Vendor B'], ['Native Editability', '●', '◑', '○'], ['Contrast Guardrails', '●', '◕', '◑'], ['Offline Delivery', '●', '○', '◑']]
        : [['评估维度', '本方案', '竞品 A', '竞品 B'], ['原生可编辑输出', '●', '◑', '○'], ['自动对比度净化', '●', '◕', '◑'], ['离线安全交付', '●', '○', '◑']],
    }
  }
  if (kind === 'tam') {
    return {
      layout: 'tam',
      variant: 'concentric',
      title: en ? 'Addressable market sizing from TAM to near-term SOM' : '目标市场空间拆解：从 TAM 到近期可触达 SOM',
      items: [
        { tag: 'TAM', value: '$18B', title: en ? 'Total Addressable Market' : '潜在市场总规模', text: en ? 'Global enterprise workflow automation spend.' : '全球企业级智能化办公与协作总支出。', status: 'neutral' },
        { tag: 'SAM', value: '$4.2B', title: en ? 'Serviceable Addressable Market' : '可服务市场规模', text: en ? 'Regulated knowledge-worker teams.' : '对数据合规与本地交付有强需求的中大型机构。', status: 'accent' },
        { tag: 'SOM', value: '$380M', title: en ? 'Serviceable Obtainable Market' : '近期可获取市场', text: en ? '3-year target across flagship verticals.' : '未来三年重点行业标杆客户可实现营收空间。', status: 'positive' },
      ],
    }
  }
  if (kind === 'org') {
    return {
      layout: 'org',
      variant: 'tree',
      title: en ? 'Cross-functional governance and delivery organization' : '跨职能组织架构与关键职责分工',
      items: [
        { tag: 'LEAD', role: en ? 'Program Sponsor' : '项目总负责人', title: en ? 'Steering Lead' : '统筹决策与资源协调', text: en ? 'Owns strategic alignment and quarterly gates.' : '负责跨部门协同、里程碑拍板与预算保障。', status: 'accent' },
        { tag: 'ENG', role: en ? 'Platform Lead' : '核心研发组', title: en ? 'Architecture & Build' : '底层引擎与稳定性保障', text: en ? 'Delivers core runtime and automated checks.' : '负责核心链路研发、性能与自动化测试。' },
        { tag: 'PROD', role: en ? 'Product Lead' : '产品与交付组', title: en ? 'Experience & Rollout' : '场景打磨与试点落地', text: en ? 'Drives customer validation and playbook ops.' : '负责客户需求闭环、标杆试点与交付培训。' },
        { tag: 'QA', role: en ? 'Quality Lead' : '质量与合规组', title: en ? 'Verification & Security' : '验收门禁与安全审计', text: en ? 'Enforces release gates and audit readiness.' : '负责质量门禁把关与合规审计留痕。' },
      ],
    }
  }
  if (kind === 'statement') {
    return { layout: 'statement', title: en ? 'Focus on measurable user outcomes over raw output volume.' : '以可验证的实际成效衡量交付，而非堆砌表面工作量。', subtitle: en ? 'Core principle' : '核心准则' }
  }
  if (kind === 'quote') {
    return { layout: 'quote', title: en ? 'Clarity comes from disciplined structure and honest evidence.' : '清晰的结构与扎实的证据，是说服力的唯一来源。', subtitle: en ? 'Project note' : '项目纪要' }
  }
  if (kind === 'section') {
    return { layout: 'section', kicker: '01', title: en ? 'Next Chapter' : '新章节标题', subtitle: en ? 'Key focus of this section' : '本章节核心议题说明' }
  }
  if (kind === 'agenda') {
    return { layout: 'agenda', title: en ? 'Agenda' : '汇报目录', bullets: en ? ['Context & objectives', 'Key findings & solution', 'Execution plan & next steps'] : ['背景与核心目标', '关键发现与总体方案', '推进计划与下一步安排'] }
  }
  if (kind === 'closing') {
    return { layout: 'closing', title: en ? 'Thank You · Next Steps' : '感谢聆听 · 下一步行动', subtitle: en ? 'Confirm pilot scope this week and review initial metrics next Friday.' : '本周内确认试点范围，下周五同步首轮评估结果。' }
  }
  if (kind === 'mermaid' || kind === 'flowchart') {
    return {
      layout: 'mermaid',
      variant: 'flowchart',
      title: en ? 'End-to-end automated pipeline flow' : '端到端自动化构建与流转架构',
      mermaid: en
        ? 'flowchart LR\n  A([Inputs]) --> B{Auto-Director}\n  B -->|Data| C[Sankey & KPI]\n  B -->|Docs| D[24+ Layouts]\n  C --> E[(HTML & PPTX)]\n  D --> E'
        : 'flowchart LR\n  A([多源输入]) --> B{智能导演}\n  B -->|数据表| C[桑基与指标卡]\n  B -->|文稿| D[24+ 版式]\n  C --> E[(同源交付)]\n  D --> E',
    }
  }
  if (kind === 'sequence') {
    return {
      layout: 'mermaid',
      variant: 'sequence',
      title: en ? 'Agent & workbench synchronization sequence' : '智能编排与工作台协同交互时序',
      mermaid: en
        ? 'sequenceDiagram\n  participant User\n  participant Studio\n  participant Engine\n  User->>Studio: Upload .xlsx / .docx\n  Studio->>Engine: Profile & choreograph\n  Engine-->>User: HTML + Native PPTX'
        : 'sequenceDiagram\n  participant 用户\n  participant 工作台\n  participant 引擎\n  用户->>工作台: 上传 .xlsx / .docx\n  工作台->>引擎: 智能剖析与编排\n  引擎-->>用户: HTML + 原生 PPTX',
    }
  }
  if (kind === 'mockup') {
    return {
      layout: 'mockup',
      variant: 'browser',
      title: en ? 'Unified studio delivers live preview & native export' : '一体化工作台实时联动预览与原生导出',
      url: 'https://studio.dsh-ppt.dev/workspace',
      items: [
        { tag: 'LIVE', value: '60 fps', title: en ? 'Zero-latency canvas' : '实时同源预览', text: en ? 'Double-click any heading to edit inline.' : '画布双击标题或要点即刻原地改字。' },
        { tag: 'NATIVE', value: '100%', title: en ? 'Editable OOXML' : '原生可编辑 PPTX', text: en ? 'Charts, Mermaid, math & 61 vector icons.' : '图表、流程图、公式与 61 枚矢量图标原生可改。' },
      ],
    }
  }
  if (kind === 'code') {
    return {
      layout: 'code',
      language: 'typescript',
      filename: 'src/pipeline.ts',
      title: en ? 'Declarative pipeline compiles slides deterministically' : '声明式流水线一行生成高审美同源三件套',
      code: "import { buildDeckAsync } from 'dsh-ppt/deck-advanced'\n\nexport async function shipExecutiveDeck(notes: string) {\n  return buildDeckAsync({\n    title: '2026 Annual Strategy Review',\n    taste: 'mckinsey-partner',\n    content: notes,\n    outputDir: './dist',\n  })\n}",
      items: [
        { tag: '01', icon: 'sparkles', title: en ? 'Curated Taste Recipe' : '大师品味配方驱动', text: en ? 'Orchestrates cover, materiality & chart spotlight.' : '自动联动封面、材质、图标与图表聚光灯。' },
        { tag: '02', icon: 'shield', title: en ? 'Zero-Dep Compiler' : '零外部依赖确定性编译', text: en ? 'Validates OOXML schema before writing files.' : '落盘前自动校验 OOXML 结构，确保零报错。' },
      ],
    }
  }
  if (kind === 'quadrant') {
    return {
      layout: 'quadrant',
      title: en ? 'Competitive positioning leads on execution & vision' : '竞品魔力象限：我们在执行力与产品前瞻性双双领跑',
      xLabel: en ? 'Completeness of Vision →' : '产品前瞻性与生态完整度 →',
      yLabel: en ? 'Ability to Execute ↑' : '工程交付与规模化执行力 ↑',
      items: [
        { title: en ? 'Our Platform' : '本平台', x: 84, y: 86, size: 80, status: 'accent' },
        { title: en ? 'Vendor A' : '竞品 A', x: 64, y: 68, size: 58, status: 'neutral' },
        { title: en ? 'Vendor B' : '竞品 B', x: 32, y: 74, size: 46, status: 'neutral' },
        { title: en ? 'Vendor C' : '竞品 C', x: 74, y: 34, size: 40, status: 'neutral' },
        { title: en ? 'Legacy Suite' : '传统工具', x: 24, y: 26, size: 50, status: 'negative' },
      ],
    }
  }
  if (kind === 'radar') {
    return {
      layout: 'radar',
      title: en ? 'Six-dimension capability benchmark outperforms market average' : '六维核心能力评估全面领先行业基线',
      rows: en
        ? [['Dimension', 'Our Platform', 'Industry Avg'], ['Throughput', 94, 70], ['Latency', 91, 68], ['Reliability', 96, 76], ['Security', 92, 72], ['Efficiency', 88, 64], ['Ecosystem', 86, 74]]
        : [['能力维度', '本平台', '行业均值'], ['推理吞吐', 94, 70], ['响应延迟', 91, 68], ['高可用性', 96, 76], ['安全合规', 92, 72], ['成本效率', 88, 64], ['生态兼容', 86, 74]],
    }
  }
  if (kind === 'dumbbell') {
    return {
      layout: 'dumbbell',
      title: en ? 'Automation upgrade delivers step-change gains across KPIs' : '智能化升级驱动核心运营指标全面跃迁（Before → After）',
      items: [
        { title: en ? 'Automation Rate' : '流程自动化率', before: 38, after: 84, unit: '%', delta: '+46pp', status: 'positive' },
        { title: en ? 'First-Pass Yield' : '一次交付达标率', before: 64, after: 93, unit: '%', delta: '+29pp', status: 'positive' },
        { title: en ? 'Unit Cost Index' : '单笔成本指数', before: 92, after: 54, unit: '', delta: '-41%', status: 'accent' },
        { title: en ? 'Team Adoption' : '团队活跃渗透率', before: 45, after: 89, unit: '%', delta: '+44pp', status: 'positive' },
      ],
    }
  }
  if (kind === 'heatmap') {
    return {
      layout: 'heatmap',
      title: en ? 'Regional attainment heatmap highlights Q4 acceleration' : '各大区季度目标达成率热力图凸显 Q4 全面冲刺',
      rows: en
        ? [['Region \\ Qtr', 'Q1', 'Q2', 'Q3', 'Q4'], ['North America', 74, 82, 89, 96], ['Europe', 65, 72, 80, 88], ['APAC', 60, 76, 86, 94], ['LatAm', 44, 52, 61, 73]]
        : [['区域 \\ 季度', 'Q1', 'Q2', 'Q3', 'Q4'], ['华东大区', 78, 84, 91, 97], ['华南大区', 68, 75, 83, 90], ['华北大区', 62, 69, 77, 85], ['海外新兴', 44, 56, 71, 88]],
    }
  }
  return {
    layout: 'bullets',
    title: en ? 'New slide key takeaway' : '请填写本页核心结论句',
    bullets: en ? ['First supporting point with concrete evidence', 'Second supporting point and next action'] : ['第一条支撑论据（建议附具体事实或数字）', '第二条支撑论据与下一步动作'],
  }
}
function json(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}
function fail(status: number, message: string): Response {
  const display = /[\u3400-\u9fff]/.test(message) && message.includes(' / ') ? message.slice(0, message.indexOf(' / ')) : message
  return json(status, { ok: false, message: display, messageEn: englishWorkbenchMessage(message) })
}
function originVerdict(request: Request): Response | undefined {
  const site = request.headers.get('sec-fetch-site'), origin = request.headers.get('origin')
  if (site && !['same-origin', 'none'].includes(site)) return fail(403, '拒绝跨站操作')
  if (origin && /^https?:/i.test(origin)) {
    try { if (new URL(origin).host !== (request.headers.get('host') || new URL(request.url).host)) return fail(403, '拒绝跨源操作') } catch { return fail(403, '无效来源') }
  }
}

export class PptWorkbench {
  readonly catalogPath: string
  readonly coaching: PptCoaching
  readonly visual: PptVisual
  private readonly loadEngine: () => Promise<WorkbenchEngine>
  private readonly renders = new Map<string, Render>()
  constructor(options: Options = {}) {
    this.catalogPath = options.catalogPath ?? join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'plugins', 'dsh-ppt', 'projects.jsonl')
    this.loadEngine = options.loadEngine ?? (getEngine as () => Promise<WorkbenchEngine>)
    this.coaching = new PptCoaching(join(dirname(this.catalogPath), 'rehearsals'), options.coachingModel)
    this.visual = new PptVisual(join(dirname(this.catalogPath), 'visual-reviews'), options.visualModel)
  }
  private catalog(): Project[] {
    if (!existsSync(this.catalogPath)) return []
    if (lstatSync(this.catalogPath).size > 8 * 1024 * 1024) throw new Error('项目索引超过 8 MiB，请备份后整理 projects.jsonl')
    const rows = new Map<string, Project>()
    for (const line of readFileSync(this.catalogPath, 'utf8').split('\n')) {
      try {
        const row = JSON.parse(line)
        if (typeof row.path === 'string' && row.path.endsWith('.json') && row.id === digest(row.path) && typeof row.title === 'string' && typeof row.updatedAt === 'string') {
          const clean: Project = {
            id: row.id,
            path: row.path,
            title: row.title,
            updatedAt: row.updatedAt,
            ...(typeof row.theme === 'string' ? { theme: row.theme } : {}),
            ...(Number.isInteger(row.slideCount) ? { slideCount: row.slideCount } : {}),
            ...(Number.isInteger(row.revision) ? { revision: row.revision } : {}),
            ...(row.modelRoute && typeof row.modelRoute.provider === 'string' && typeof row.modelRoute.model === 'string'
              ? { modelRoute: { provider: row.modelRoute.provider, model: row.modelRoute.model } }
              : {}),
          }
          rows.delete(row.id); rows.set(row.id, clean)
        }
      } catch { /* A crash may leave an incomplete last append; keep older rows. */ }
    }
    return [...rows.values()].reverse().slice(0, 100)
  }
  /** Recording a completed tool never turns a successful generation into an error. */
  async remember(result: any, args: unknown, exec?: PptExecution): Promise<void> {
    const file = result?.jsonPath ?? result?.deckPath
    if (typeof file !== 'string') return
    exec?.signal?.throwIfAborted()
    const path = realpathSync(resolve(exec?.agent?.session.header.cwd ?? process.cwd(), file))
    ordinaryFile(path)
    const engine = await this.loadEngine()
    const { manifest } = engine.readDeckProject({ deckPath: path })
    // Versioned generator projects only; arbitrary JSON and externally edited PPTX cannot enter.
    if (manifest.schemaVersion !== 1 || typeof manifest.deckId !== 'string' || manifest.slides.some((s: any) => typeof s.id !== 'string')) return
    let route = exec?.agent?.session.requestContext?.()
    if (!route?.provider || !route?.model) route = exec?.agent?.session.requestHeader?.()?.config
    const modelRoute = typeof route?.provider === 'string' && typeof route?.model === 'string' ? { provider: route.provider, model: route.model } : this.catalog().find(p => p.path === path)?.modelRoute
    const row = {
      id: digest(path),
      path,
      title: manifest.title,
      updatedAt: new Date().toISOString(),
      ...(typeof manifest.theme === 'string' ? { theme: manifest.theme } : {}),
      ...(Array.isArray(manifest.slides) ? { slideCount: manifest.slides.length } : {}),
      ...(Number.isInteger(manifest.revision) ? { revision: manifest.revision } : {}),
      ...(modelRoute ? { modelRoute } : {}),
    }
    mkdirSync(dirname(this.catalogPath), { recursive: true })
    if (existsSync(this.catalogPath) && lstatSync(this.catalogPath).size >= 8 * 1024 * 1024) throw new Error('项目索引已满，请备份后整理 projects.jsonl')
    appendFileSync(this.catalogPath, JSON.stringify(row) + '\n')
  }
  private async project(id: unknown) {
    if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) throw new Error('请选择已有项目')
    const entry = this.catalog().find(row => row.id === id)
    if (!entry) throw new Error('项目不在本机索引中，请先在对话中创建或检查演示文稿')
    if (realpathSync(entry.path) !== entry.path) throw new Error('项目位置已改变，请在对话中重新检查')
    ordinaryFile(entry.path)
    const engine = await this.loadEngine()
    const { manifest } = engine.readDeckProject({ deckPath: entry.path })
    return { entry, engine, manifest, files: pathsFor(entry.path) }
  }
  private async view(id: unknown) {
    const { entry, engine, manifest, files } = await this.project(id)
    const check = bilingualQuality(engine.checkDeck({ deckPath: entry.path }))
    let html = ''
    try { html = ordinaryFile(files.html).toString('utf8') } catch { /* A check can register an older JSON-only project. */ }
    const render = this.renders.get(entry.id)
    const currentRender = render && render.revision === manifest.revision && digest(ordinaryFile(files.pptx)) === render.sourceSha256 ? render : undefined
    const langCode = manifest.language === 'en' ? 'en' : 'zh'
    const themes = typeof engine.listThemes === 'function' ? engine.listThemes(langCode) : []
    const presets = typeof engine.listMasterPresets === 'function' ? engine.listMasterPresets(langCode) : []
    const tasteRecipes = typeof engine.listAllTasteRecipes === 'function' ? engine.listAllTasteRecipes(dirname(entry.path)) : []
    const rawPace = typeof engine.computePaceBudget === 'function'
      ? engine.computePaceBudget(manifest, manifest.targetMinutes)
      : computePaceBudgetFallback(manifest, manifest.targetMinutes)
    const overrunSlides = Array.isArray(rawPace?.overrunSlides)
      ? rawPace.overrunSlides
      : Array.isArray(rawPace?.overBudgetSlides)
        ? rawPace.overBudgetSlides
        : []
    const overBudget = typeof rawPace?.overBudget === 'boolean'
      ? rawPace.overBudget
      : rawPace?.status === 'over-budget' || overrunSlides.length > 0
    const deltaMinutes = typeof rawPace?.deltaMinutes === 'number'
      ? rawPace.deltaMinutes
      : typeof rawPace?.deltaSeconds === 'number'
        ? Math.round((rawPace.deltaSeconds / 60) * 10) / 10
        : 0
    const paceBudget = {
      ...rawPace,
      slideCount: typeof rawPace?.slideCount === 'number' ? rawPace.slideCount : (Array.isArray(manifest.slides) ? manifest.slides.length : 0),
      overBudget,
      overrunSlides,
      deltaMinutes,
    }
    return { ok: true, project: { ...entry, deckId: manifest.deckId, revision: manifest.revision, theme: manifest.theme ?? 'data',
      taste: manifest.taste ?? null,
      brand: manifest.brand ?? null, targetMinutes: manifest.targetMinutes ?? null, paceBudget, themes, presets, tasteRecipes, slides: manifest.slides,
      undoAvailable: manifest.history.length, quality: check, html, dataModel: manifest.dataModel ?? null,
      assets: Object.fromEntries(Object.entries(manifest.assets ?? {}).map(([key, value]: [string, any]) => [key, { data: value.data, mime: value.mime }])),
      render: currentRender ? { pageCount: currentRender.pngPaths.length, missingFonts: currentRender.missingFonts ?? [] } : null } }
  }
  private revision(body: Record<string, unknown>, manifest: any) {
    if (!Number.isSafeInteger(body.expectedRevision) || body.expectedRevision !== manifest.revision) throw new Error('项目已被修改，请重新打开后再编辑；当前输入保留')
  }
  private themeId(value: unknown): string {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{1,31}$/.test(value.trim())) throw new Error('主题名称无效')
    return value.trim()
  }
  private brandPatch(value: unknown): Record<string, unknown> | null {
    if (value === null) return null
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('品牌设置无效：请检查 #RRGGBB 颜色、安全字体名称、页脚长度或面板上传的 PNG/JPEG Logo')
    const raw = value as Record<string, unknown>, out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(raw)) {
      if (!BRAND_KEYS.has(key)) throw new Error('品牌设置无效：请检查 #RRGGBB 颜色、安全字体名称、页脚长度或面板上传的 PNG/JPEG Logo')
      if (item === undefined) continue
      if (['primaryColor', 'secondaryColor', 'backgroundColor', 'textColor', 'coverBg'].includes(key)) {
        if (item === '' || item === null) continue
        if (typeof item !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(item.trim())) throw new Error('品牌设置无效：请检查 #RRGGBB 颜色、安全字体名称、页脚长度或面板上传的 PNG/JPEG Logo')
        out[key] = item.trim().toUpperCase()
      } else if (key === 'fontFamily' || key === 'headingFont') {
        if (item === '' || item === null) continue
        if (typeof item !== 'string' || !/^[A-Za-z0-9\u4e00-\u9fff ,.'_-]{1,80}$/.test(item.trim())) throw new Error('品牌设置无效：请检查 #RRGGBB 颜色、安全字体名称、页脚长度或面板上传的 PNG/JPEG Logo')
        out[key] = item.trim()
      } else if (key === 'coverMode') {
        if (item === '' || item === null) continue
        if (item !== 'standard' && item !== 'inverted-accent') throw new Error('品牌设置无效：请检查 #RRGGBB 颜色、安全字体名称、页脚长度或面板上传的 PNG/JPEG Logo')
        out.coverMode = item
      } else if (key === 'name' || key === 'footer') {
        if (typeof item !== 'string' || item.length > 200 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(item)) throw new Error('品牌设置无效：请检查 #RRGGBB 颜色、安全字体名称、页脚长度或面板上传的 PNG/JPEG Logo')
        out[key] = item
      } else if (key === 'logo') {
        if (item === null) out.logo = null
        else if (typeof item === 'string' && item.length <= 7_000_000 && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(item)) out.logo = item
        else throw new Error('图片必须从面板上传，不能读取其他本地文件')
      } else if (key === 'chromeStyle') {
        if (item === null) { out.chromeStyle = null; continue }
        if (typeof item !== 'string' || !ALLOWED_CHROME_STYLES.has(item)) throw new Error('母版骨架名称无效 / Invalid chrome skeleton style')
        out.chromeStyle = item
      } else if (key === 'cardMaterial') {
        if (item === null || item === '') { out.cardMaterial = null; continue }
        if (typeof item !== 'string' || !ALLOWED_CARD_MATERIALS.has(item)) throw new Error('卡片材质名称无效 / Invalid cardMaterial')
        out.cardMaterial = item
      } else if (key === 'iconMode') {
        if (item === null || item === '') { out.iconMode = null; continue }
        if (typeof item !== 'string' || !ALLOWED_ICON_MODES.has(item)) throw new Error('图标模式无效 / Invalid iconMode')
        out.iconMode = item
      } else if (key === 'taste') {
        if (item === null || item === '') { out.taste = null; continue }
        if (typeof item !== 'string' || item.length > 64) throw new Error('品味配方 ID 无效')
        out.taste = item.trim()
      }
    }
    return out
  }
  private itemsPatch(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value) || value.length > 8) throw new Error('结构化卡片内容无效')
    return value.map(entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('结构化卡片内容无效')
      const raw = entry as Record<string, unknown>
      if (Object.keys(raw).some(k => !ITEM_KEYS.has(k))) throw new Error('结构化卡片内容无效')
      const tag = raw.tag ?? raw.badge
      const title = raw.title
      const text = raw.text ?? raw.body
      const val = raw.value
      const unit = raw.unit
      const delta = raw.delta
      const status = raw.status ?? raw.tone
      const bullets = raw.bullets
      if (tag !== undefined && (typeof tag !== 'string' || tag.length > 120)) throw new Error('结构化卡片内容无效')
      if (title !== undefined && (typeof title !== 'string' || title.length > 300)) throw new Error('结构化卡片内容无效')
      if (text !== undefined && (typeof text !== 'string' || text.length > 1500)) throw new Error('结构化卡片内容无效')
      if (val !== undefined && !((typeof val === 'string' && val.length <= 120) || (typeof val === 'number' && Number.isFinite(val)))) throw new Error('结构化卡片内容无效')
      if (unit !== undefined && (typeof unit !== 'string' || unit.length > 120)) throw new Error('结构化卡片内容无效')
      if (delta !== undefined && (typeof delta !== 'string' || delta.length > 120)) throw new Error('结构化卡片内容无效')
      if (status !== undefined && status !== '' && (typeof status !== 'string' || !ALLOWED_ITEM_STATUS.has(status))) throw new Error('结构化卡片内容无效')
      if (bullets !== undefined && (!Array.isArray(bullets) || bullets.length > 8 || bullets.some(b => typeof b !== 'string' || b.length > 500))) throw new Error('结构化卡片内容无效')
      const clean: Record<string, unknown> = {}
      if (typeof tag === 'string' && tag.trim()) clean.tag = tag.trim()
      if (typeof title === 'string' && title.trim()) clean.title = title.trim()
      if (typeof text === 'string' && text.trim()) clean.text = text.trim()
      if (val !== undefined && String(val).trim() !== '') clean.value = String(val).trim()
      if (typeof unit === 'string' && unit.trim()) clean.unit = unit.trim()
      if (typeof delta === 'string' && delta.trim()) clean.delta = delta.trim()
      if (typeof status === 'string' && status) clean.status = status
      if (Array.isArray(bullets)) {
        const lines = bullets.map(b => b.trim()).filter(Boolean)
        if (lines.length) clean.bullets = lines
      }
      const start = raw.start
      const span = raw.span
      const milestone = raw.milestone
      const role = raw.role
      const conversion = raw.conversion
      const icon = raw.icon
      const avatar = raw.avatar
      for (const nk of ['x', 'y', 'size', 'before', 'after'] as const) {
        const nv = raw[nk]
        if (nv !== undefined && (typeof nv !== 'number' || !Number.isFinite(nv))) throw new Error('结构化卡片内容无效')
        if (typeof nv === 'number') clean[nk] = nv
      }
      if (start !== undefined && (typeof start !== 'number' || !Number.isFinite(start) || start < 0 || start > 999)) throw new Error('结构化卡片内容无效')
      if (span !== undefined && (typeof span !== 'number' || !Number.isFinite(span) || span < 0 || span > 999)) throw new Error('结构化卡片内容无效')
      if (milestone !== undefined && typeof milestone !== 'boolean') throw new Error('结构化卡片内容无效')
      if (role !== undefined && (typeof role !== 'string' || role.length > 120)) throw new Error('结构化卡片内容无效')
      if (conversion !== undefined && (typeof conversion !== 'string' || conversion.length > 120)) throw new Error('结构化卡片内容无效')
      if (icon !== undefined && (typeof icon !== 'string' || icon.length > 48)) throw new Error('结构化卡片内容无效')
      if (avatar !== undefined && (typeof avatar !== 'string' || avatar.length > 64)) throw new Error('结构化卡片内容无效')
      if (typeof start === 'number') clean.start = start
      if (typeof span === 'number') clean.span = span
      if (milestone === true) clean.milestone = true
      if (typeof role === 'string' && role.trim()) clean.role = role.trim()
      if (typeof conversion === 'string' && conversion.trim()) clean.conversion = conversion.trim()
      if (typeof icon === 'string' && icon.trim()) clean.icon = icon.trim()
      if (typeof avatar === 'string' && avatar.trim()) clean.avatar = avatar.trim()
      return clean
    })
  }
  private patch(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('修改内容无效')
    const raw = value as Record<string, unknown>
    if (Object.hasOwn(raw, 'items') && Object.hasOwn(raw, 'cards')) throw new Error('结构化卡片内容无效')
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(raw)) {
      if (['title', 'subtitle', 'kicker', 'takeaway', 'source', 'text', 'formula', 'notes', 'language', 'filename', 'url', 'xLabel', 'yLabel'].includes(key)) {
        if (typeof item !== 'string' || item.length > 8000) throw new Error('文字字段过长或无效')
        result[key] = item
      } else if (key === 'code') {
        if (typeof item !== 'string' || item.length > 16000) throw new Error('代码片段无效或超过 16,000 字符')
        result.code = item
      } else if (key === 'coverPattern') {
        if (item !== null && item !== '' && (typeof item !== 'string' || !ALLOWED_COVER_PATTERNS.has(item))) throw new Error('封面底纹名称无效')
        result.coverPattern = item ? item : undefined
      } else if (key === 'quadrants') {
        if (item === null) { result.quadrants = undefined; continue }
        if (!Array.isArray(item) || item.length !== 4 || item.some(q => typeof q !== 'string' || q.length > 80)) throw new Error('象限名称需为 4 项字符串')
        result.quadrants = item
      } else if (key === 'mermaid') {
        if (typeof item !== 'string' || item.length > 16000) throw new Error('Mermaid 代码无效或超过 16,000 字符')
        result.mermaid = item
      } else if (key === 'bullets') {
        if (!Array.isArray(item) || item.length > 50 || item.some(v => typeof v !== 'string' || v.length > 2000)) throw new Error('要点内容无效')
        result[key] = item
      } else if (key === 'layout') {
        if (typeof item !== 'string' || !ALLOWED_LAYOUTS.has(item)) throw new Error('版式名称无效')
        result.layout = item
      } else if (key === 'variant') {
        if (item !== null && item !== '' && (typeof item !== 'string' || !/^[a-z0-9-]{1,40}$/.test(item))) throw new Error('版式变体名称过长或无效')
        result.variant = item ? item : undefined
      } else if (key === 'chrome') {
        if (item !== null && item !== '' && (typeof item !== 'string' || !ALLOWED_CHROME_STYLES.has(item))) throw new Error('母版骨架名称无效 / Invalid chrome skeleton style')
        result.chrome = item ? item : undefined
      } else if (key === 'cardMaterial') {
        if (item !== null && item !== '' && (typeof item !== 'string' || !ALLOWED_CARD_MATERIALS.has(item))) throw new Error('卡片材质名称无效 / Invalid cardMaterial')
        result.cardMaterial = item ? item : undefined
      } else if (key === 'iconMode') {
        if (item !== null && item !== '' && (typeof item !== 'string' || !ALLOWED_ICON_MODES.has(item))) throw new Error('图标模式无效 / Invalid iconMode')
        result.iconMode = item ? item : undefined
      } else if (key === 'tableStyle') {
        if (item !== null && item !== '' && (typeof item !== 'string' || !ALLOWED_TABLE_STYLES.has(item))) throw new Error('表格样式无效')
        result.tableStyle = item ? item : undefined
      } else if (key === 'items' || key === 'cards') {
        result.items = this.itemsPatch(item)
      } else if (key === 'rows') {
        if (!Array.isArray(item) || item.length < 1 || item.length > 50 || !Array.isArray(item[0]) || item[0].length < 1 || item[0].length > 12 ||
          item.some(r => !Array.isArray(r) || r.length !== item[0].length || r.some(c => !((typeof c === 'string' && c.length <= 500) || (typeof c === 'number' && Number.isFinite(c)))))) {
          throw new Error('表格内容需为 1–50 行、1–12 列的文字或有限数字，且每行格数一致')
        }
        result.rows = item
      } else if (key === 'visual') {
        if (item === null) { result.visual = undefined; continue }
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('排版设置无效或字号超出允许范围')
        const v = item as Record<string, unknown>, out: Record<string, unknown> = {}
        if (Object.keys(v).some(k => !VISUAL_KEYS.has(k))) throw new Error('排版设置无效或字号超出允许范围')
        const ranges: Record<string, [number, number]> = { titleSize: [24, 60], bodySize: [14, 28], chartLabelSize: [12, 24] }
        for (const [vk, vv] of Object.entries(v)) {
          if (vv === undefined) continue
          if (ranges[vk]) {
            const [min, max] = ranges[vk]
            if (typeof vv !== 'number' || !Number.isInteger(vv) || vv < min || vv > max) throw new Error('排版设置无效或字号超出允许范围')
            out[vk] = vv
          } else if (vk === 'density') {
            if (typeof vv !== 'string' || !ALLOWED_DENSITIES.has(vv)) throw new Error('排版设置无效或字号超出允许范围')
            out.density = vv
          } else if (vk === 'tableStyle') {
            if (typeof vv !== 'string' || !ALLOWED_TABLE_STYLES.has(vv)) throw new Error('表格样式无效')
            out.tableStyle = vv
          } else if (vk === 'chrome') {
            if (vv === null) continue
            if (typeof vv !== 'string' || !ALLOWED_CHROME_STYLES.has(vv)) throw new Error('母版骨架名称无效 / Invalid chrome skeleton style')
            out.chrome = vv
          }
        }
        result.visual = out
      } else if (key === 'columns') {
        if (item === null) { result.columns = undefined; continue }
        if (!Array.isArray(item) || item.length < 1 || item.length > 52 || item.some(c => typeof c !== 'string' || c.length > 120)) throw new Error('甘特图列头无效')
        result.columns = item
      } else if (key === 'image') {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('请选择 PNG 或 JPEG 图片')
        const image = item as Record<string, unknown>
        if (Object.keys(image).some(k => !['src', 'alt', 'fit', 'caption'].includes(k)) || typeof image.src !== 'string' || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(image.src)) throw new Error('图片必须从面板上传，不能读取其他本地文件')
        if (['alt', 'caption'].some(k => image[k] !== undefined && (typeof image[k] !== 'string' || (image[k] as string).length > 2000)) || (image.fit !== undefined && !['contain', 'cover'].includes(String(image.fit)))) throw new Error('图片说明或适应方式无效')
        result.image = item
      } else throw new Error('面板不支持修改此字段：' + key)
    }
    return result
  }
  private pptxBytes(raw: unknown): Uint8Array {
    if (typeof raw !== 'string' || raw.length < 120) throw new Error('请选择有效的参考 PPTX 文件（24 MiB 以内）')
    const clean = raw.replace(/^data:[^;,]+;base64,/, '').replace(/\s+/g, '')
    if (!clean || clean.length > 34_000_000 || clean.length % 4 === 1 || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
      throw new Error('请选择有效的参考 PPTX 文件（24 MiB 以内）')
    }
    const bytes = Buffer.from(clean, 'base64')
    if (bytes.byteLength < 100 || bytes.byteLength > ABSORB_PPTX_LIMIT || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
      throw new Error('请选择有效的参考 PPTX 文件（24 MiB 以内）')
    }
    return new Uint8Array(bytes)
  }
  private officeBytes(raw: unknown, fileName: unknown): { bytes: Uint8Array; ext: string } {
    const name = typeof fileName === 'string' ? fileName.trim() : ''
    const match = /\.(xlsx|csv|tsv|docx)$/i.exec(name)
    if (!match || typeof raw !== 'string' || raw.length < 4) {
      throw new Error('请选择 24 MiB 以内的 .xlsx、.csv、.tsv 或 .docx 文件')
    }
    const ext = '.' + match[1].toLowerCase()
    const clean = raw.replace(/^data:[^;,]+(?:;[^;,]+)*;base64,/, '').replace(/\s+/g, '')
    if (!clean || clean.length > 34_000_000 || clean.length % 4 === 1 || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
      throw new Error('请选择 24 MiB 以内的 .xlsx、.csv、.tsv 或 .docx 文件')
    }
    const bytes = Buffer.from(clean, 'base64')
    if (bytes.byteLength === 0 || bytes.byteLength > ABSORB_PPTX_LIMIT) {
      throw new Error('请选择 24 MiB 以内的 .xlsx、.csv、.tsv 或 .docx 文件')
    }
    if ((ext === '.xlsx' || ext === '.docx') && (bytes.byteLength < 100 || bytes[0] !== 0x50 || bytes[1] !== 0x4b)) {
      throw new Error('请选择 24 MiB 以内的 .xlsx、.csv、.tsv 或 .docx 文件')
    }
    return { bytes: new Uint8Array(bytes), ext }
  }
  private flagshipDemoSlides(lang: 'zh' | 'en' | 'bilingual', includeMermaid: boolean): Array<Record<string, unknown>> {
    const en = lang === 'en'
    const slides: Array<Record<string, unknown>> = [
      {
        layout: 'cover',
        kicker: en ? 'FLAGSHIP SHOWCASE · 0.25' : '旗舰功能全景示例 · 0.25',
        title: en ? 'Enterprise AI Delivery & Financial Telemetry' : '企业级智能交付平台：效能跃迁与经营全景',
        subtitle: en ? 'Native PPTX + Interactive HTML + Verified Data & Diagrams' : '同源构建可编辑 PPTX · 交互放映 · 原生公式与专业图示',
        notes: en
          ? 'Welcome everyone. In the next eight minutes we will walk through our flagship delivery telemetry, system architecture, quarterly roadmap, and capital efficiency.'
          : '各位领导同事好，接下来用八分钟为大家汇报本季度企业级智能交付平台的核心成效、系统架构、路线图与资金流向全景。',
      },
      {
        layout: 'kpi',
        variant: 'grid',
        kicker: 'EXECUTIVE SUMMARY',
        title: en ? 'Headline metrics surpassed annual targets ahead of schedule' : '三大核心指标提前达成全年基准并实现正向复利',
        items: [
          { tag: 'ARR', value: '1.85', unit: en ? 'B' : '亿', delta: en ? '+42% YoY' : '同比 +42%', title: en ? 'Annual Recurring Revenue' : '年度经常性收入', status: 'positive' },
          { tag: 'NRR', value: '118%', delta: en ? '+6 pts' : '提升 6 pct', title: en ? 'Net Dollar Retention' : '核心客户净收入留存', status: 'accent' },
          { tag: 'CYCLE', value: '5', unit: en ? 'days' : '天', delta: en ? '-64% lead time' : '交付周期缩短 64%', title: en ? 'End-to-End Delivery' : '端到端平均交付周期', status: 'positive' },
        ],
        takeaway: en ? 'Platform standardization drove 42% revenue expansion while cutting deployment lead time by 64%.' : '标准化工程底座驱动营收同比增长 42%，同时将客户上线周期从 14 天压缩至 5 天。',
        source: en ? 'Source: Q4 Audited Financial & Ops Ledger' : '数据来源：Q4 经核验财务与交付运营台账',
        notes: en ? 'First, look at our headline KPIs: ARR reached 1.85 billion with 42 percent year-over-year growth and 118 percent net retention.' : '首先看核心经营指标：年度经常性收入突破 1.85 亿，同比增长 42%，净收入留存达 118%。',
      },
      {
        layout: 'architecture',
        variant: 'layered',
        kicker: 'SYSTEM ARCHITECTURE',
        title: en ? 'Three-tier deterministic engine guarantees zero-drift multi-format output' : '三层确定性构建架构保障多端同源交付零漂移',
        items: [
          { tag: en ? 'Experience' : '交互与工作台', title: en ? 'Studio & Presenter Console' : '工作台预览与双屏提词台', bullets: en ? ['Click-to-focus editing', 'Dual-screen P / Laser L'] : ['点击画布直达编辑', 'P 键双屏提词 / L 激光笔'] },
          { tag: en ? 'Orchestration' : '智能编排层', title: en ? 'Director, Mermaid & Office Bridge' : '导演引擎 · Office 直吞 · 文献桥接', bullets: en ? ['XLSX/DOCX profiling', 'dsh-cite & Remotion'] : ['Excel/Word 自动成稿', 'dsh-cite 文献与视频分镜'] },
          { tag: en ? 'Foundation' : '原生底层', title: en ? 'Dual-Target OOXML & HTML Compiler' : 'OOXML 原生图形与离线 HTML 编译器', bullets: en ? ['Native <m:oMath> & charts', 'WCAG >= 4.5:1 guard'] : ['原生公式与可编辑图表', 'WCAG >= 4.5:1 对比度门禁'] },
          { tag: en ? 'Cross-cutting' : '安全合规', title: en ? 'Zero-Exfiltration & Atomic Undo' : '离线安全沙箱与 20 步原子撤销', status: 'accent', bullets: en ? ['Zero external network', 'Revision-guarded store'] : ['零外链纯净交付', '修订号防并发覆盖'] },
        ],
        notes: en ? 'Our architecture separates experience, orchestration, and deterministic OOXML emission so edits stay synchronized across HTML and PowerPoint.' : '系统采用交互层、编排层与原生编译器三层解耦设计，任何微调均可原子级同步至 HTML 与 PPTX。',
      },
      {
        layout: 'gantt',
        variant: 'quarters',
        kicker: 'DELIVERY ROADMAP',
        title: en ? 'Four-quarter rollout moves from core engine to full ecosystem' : '全年四季度路线图：从底层双模引擎迈向全生态闭环',
        columns: ['Q1', 'Q2', 'Q3', 'Q4'],
        items: [
          { tag: en ? 'Core' : '核心底座', title: en ? 'Native charts & 24 curated themes' : '原生可编辑图表与 24 套大师主题', start: 0, span: 1.5, status: 'accent' },
          { tag: en ? 'Import' : '文档翻新', title: en ? 'Round-trip .pptx & Excel/Word ingestion' : 'PPTX 双向导回与 Excel/Word 直吞', start: 1, span: 1.5, status: 'positive' },
          { tag: en ? 'Ecosystem' : '生态协同', title: en ? 'dsh-cite bibliography & Remotion video pack' : 'dsh-cite 学术文献与 Remotion 视频分镜', start: 2, span: 1.5, status: 'accent' },
          { tag: en ? 'GA' : '全量验收', title: en ? 'v0.25 Enterprise Flagship Release' : 'v0.25 旗舰版全面验收发布', start: 3, span: 0, milestone: true, status: 'warning' },
        ],
        notes: en ? 'On the timeline, Q1 and Q2 established native charts and Office ingestion, while Q3 and Q4 completed ecosystem bridges.' : '从推进节奏看，上半年夯实了原生图表与文档解析能力，下半年打通了文献与视频分镜全生态。',
      },
      {
        layout: 'sankey',
        kicker: 'CAPITAL FLOW',
        title: en ? 'Revenue-to-operating-income flow shows 34.5% operating leverage' : '总营收至营业利润全链路流向拆解展现 34.5% 经营杠杆',
        items: en
          ? [
              { tag: 'Total Revenue', title: 'Gross Profit', value: '68.5', unit: 'M', status: 'positive' },
              { tag: 'Total Revenue', title: 'Cost of Revenue', value: '31.5', unit: 'M', status: 'neutral' },
              { tag: 'Gross Profit', title: 'R&D Investment', value: '22.0', unit: 'M', status: 'accent' },
              { tag: 'Gross Profit', title: 'Sales & Ops', value: '12.0', unit: 'M', status: 'warning' },
              { tag: 'Gross Profit', title: 'Operating Income', value: '34.5', unit: 'M', status: 'positive' },
            ]
          : [
              { tag: '总营收', title: '毛利润', value: '68.5', unit: '百万', status: 'positive' },
              { tag: '总营收', title: '交付成本', value: '31.5', unit: '百万', status: 'neutral' },
              { tag: '毛利润', title: '研发投入', value: '22.0', unit: '百万', status: 'accent' },
              { tag: '毛利润', title: '市场与运营', value: '12.0', unit: '百万', status: 'warning' },
              { tag: '毛利润', title: '营业利润', value: '34.5', unit: '百万', status: 'positive' },
            ],
        takeaway: en ? 'Strong gross margin (68.5%) funds sustained R&D while yielding 34.5% operating profit.' : '68.5% 的高毛利空间支撑了 22% 的研发强度，并沉淀出 34.5% 的健康营业利润。',
        notes: en ? 'This Sankey diagram traces every dollar from top-line revenue through gross profit into R&D, operations, and operating income.' : '这张桑基图清晰展示了从总营收扣除交付成本后，毛利润在研发、运营与营业利润之间的精确分配。',
      },
      {
        layout: 'marimekko',
        kicker: 'MARKET LANDSCAPE',
        title: en ? 'Segment sizing & share show leadership across high-value verticals' : '细分市场规模与份额矩阵凸显高价值赛道领先身位',
        rows: en
          ? [['Vendor / Segment', 'Enterprise (45B)', 'Financial (32B)', 'Industrial (23B)'], ['Flagship', '44%', '38%', '31%'], ['Vendor B', '32%', '36%', '34%'], ['Others', '24%', '26%', '35%']]
          : [['厂商 / 赛道', '政企数字化 (450亿)', '金融信创 (320亿)', '工业智造 (230亿)'], ['本平台', '44%', '38%', '31%'], ['厂商 B', '32%', '36%', '34%'], ['其他', '24%', '26%', '35%']],
        notes: en ? 'Across the three major verticals sized proportionally by column width, we lead in both Enterprise and Financial sectors.' : '不等宽市场图按各赛道体量比例切分列宽，我们在政企数字化与金融信创两大核心市场份额稳居第一。',
      },
      {
        layout: 'callout',
        variant: 'formula',
        kicker: 'QUANTITATIVE OBJECTIVE',
        title: en ? 'Regularized scoring objective balances accuracy and visual sparsity' : '量化目标函数：以原生 Office 公式精确表达准确率与稀疏正则项',
        formula: '\\mathcal{L}(\\theta) = \\frac{1}{N}\\sum_{i=1}^{N} \\left(y_i - \\hat{y}_i(\\theta)\\right)^2 + \\lambda \\|\\theta\\|_2^2',
        text: en
          ? 'Compiled into native PowerPoint Office Math (OMML) equations and HTML MathML — directly editable in Word/PowerPoint equation tools.'
          : '同时编译为 PowerPoint 原生 Office Math (OMML) 公式对象与 HTML MathML，在 Office 公式编辑器中可直接双击修改。',
        notes: en ? 'Notice the equation is rendered natively as Office Math rather than a static bitmap.' : '页面中的公式为原生 Office Math 对象，而非静态截图，导出后可无损放大与二次编辑。',
      },
    ]
    if (includeMermaid) {
      slides.push({
        layout: 'mermaid',
        variant: 'flowchart',
        kicker: 'NATIVE MERMAID FLOW',
        title: en ? 'Mermaid diagram compiles into editable PowerPoint shapes & connectors' : 'Mermaid 流程图直接编译为可拖拽连接的原生 PPT 矢量形状',
        mermaid: en
          ? 'flowchart LR\n  A([Raw Sources]) --> B{Auto-Director}\n  B -->|Excel / CSV| C[Charts & Sankey]\n  B -->|Markdown / DOCX| D[24+ Layouts]\n  C --> E[(Editable PPTX)]\n  D --> E'
          : 'flowchart LR\n  A([多源材料输入]) --> B{智能导演引擎}\n  B -->|Excel / CSV| C[桑基与原生图表]\n  B -->|Word / 大纲| D[24+ 专业版式]\n  C --> E[(原生可编辑 PPTX)]\n  D --> E',
        takeaway: en ? 'Moving any node box in PowerPoint automatically keeps attached <p:cxnSp> connectors linked.' : '在 PowerPoint 中拖动任意节点方框，相连的矢量连接线会自动跟随联动。',
        notes: en ? 'This flowchart is generated directly from Mermaid syntax into native PowerPoint shapes and attached connectors.' : '该流程图由 Mermaid 语法直接编译为原生 PPT 形状与绑定连接器，非静态贴图。',
      })
    }
    slides.push({
      layout: 'closing',
      kicker: 'NEXT STEPS',
      title: en ? 'Ready to customize, export One-Pager, or render Video Storyboard' : '即刻体验：编辑本页、导出高管一页纸或生成 Remotion 视频分镜',
      subtitle: en ? 'Try clicking any text on the canvas, switching themes in Style Studio, or pressing P in standalone HTML.' : '点击左侧画布文字即可定位修改，也可前往“风格与母版”一键换肤，或点击“下载成品”导出多种交付物。',
      notes: en ? 'Thank you! Feel free to explore editing, Style Studio, One-Pager HTML, and Remotion video export.' : '感谢体验旗舰示例工程！欢迎继续试用页面编辑、换肤、高管一页纸与 Remotion 视频导出。',
    })
    return slides
  }
  async action(body: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
    signal?.throwIfAborted()
    if (body.operation === 'list') return { ok: true, projects: this.catalog() }
    if (body.operation === 'catalog-meta') {
      const engine = await this.loadEngine()
      signal?.throwIfAborted()
      const langCode = body.lang === 'en' ? 'en' : 'zh'
      const storeDir = dirname(this.catalogPath)
      const workspaceExemplars = typeof engine.loadWorkspaceExemplars === 'function' ? engine.loadWorkspaceExemplars(storeDir) : {}
      return {
        ok: true,
        themes: typeof engine.listThemes === 'function' ? engine.listThemes(langCode) : [],
        presets: typeof engine.listMasterPresets === 'function' ? engine.listMasterPresets(langCode) : [],
        tasteRecipes: typeof engine.listAllTasteRecipes === 'function' ? engine.listAllTasteRecipes(storeDir) : [],
        exemplars: typeof engine.listCuratedExemplars === 'function' ? engine.listCuratedExemplars(workspaceExemplars) : [],
        templates: typeof engine.listTemplates === 'function' ? engine.listTemplates(langCode) : [],
      }
    }
    if (body.operation === 'create') {
      if (['referencePptx', 'pptxPath', 'path', 'outputDir'].some(k => Object.hasOwn(body, k))) {
        throw new Error('图片必须从面板上传，不能读取其他本地文件')
      }
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      if (!title || title.length > 200 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(title)) {
        throw new Error('请输入演示文稿标题（1–200 字符）')
      }
      const content = typeof body.content === 'string' ? body.content : ''
      if (content.length > 200_000) throw new Error('大纲正文超过 200,000 字符上限，请精简后重试')
      const lang = body.lang === 'en' || body.lang === 'bilingual' ? body.lang : 'zh'
      const theme = typeof body.theme === 'string' && body.theme.trim() ? (body.theme.trim() === 'auto' ? 'auto' : this.themeId(body.theme)) : 'auto'
      const template = typeof body.template === 'string' && body.template.trim() ? body.template.trim() : undefined
      let exemplar: string | undefined
      if (body.exemplar !== undefined && body.exemplar !== null && body.exemplar !== '') {
        if (typeof body.exemplar !== 'string' || !/^[a-z0-9\u4e00-\u9fff-]{1,64}$/i.test(body.exemplar.trim())) {
          throw new Error('标杆范本 ID 无效')
        }
        exemplar = body.exemplar.trim()
      }
      const autoUpgrade = typeof body.autoUpgrade === 'boolean' ? body.autoUpgrade : undefined
      const alignOrder = body.alignOrder === true
      const brand = body.brand !== undefined ? this.brandPatch(body.brand) : undefined
      const cloneStructure = body.cloneStructure === true
      const engine = await this.loadEngine()
      signal?.throwIfAborted()
      const storeDir = dirname(this.catalogPath)
      const decksDir = join(storeDir, 'workbench-decks')
      mkdirSync(decksDir, { recursive: true })
      let tmpRefPath: string | undefined
      let skeletonSlides: Array<Record<string, unknown>> | undefined
      try {
        if (body.referencePptxData !== undefined && body.referencePptxData !== null && body.referencePptxData !== '') {
          if (typeof engine.absorbPptx !== 'function') throw new Error('当前引擎版本暂不支持参考 PPTX 吸收')
          const refBytes = this.pptxBytes(body.referencePptxData)
          tmpRefPath = join(decksDir, '.absorb-' + randomUUID() + '.pptx')
          writeFileSync(tmpRefPath, refBytes)
          if (cloneStructure && !content.trim() && !template) {
            const absorbed = await engine.absorbPptx({ bytes: refBytes, extractLogo: true, signal })
            const rawSeq = Array.isArray(absorbed?.slideSkeleton) ? absorbed.slideSkeleton.slice(0, 20) : []
            if (rawSeq.length > 0) {
              skeletonSlides = rawSeq.map((entry, idx) => {
                const want = entry?.inferredLayout || 'bullets'
                if (idx === 0 || want === 'cover') {
                  return { layout: 'cover', title, subtitle: lang === 'en' ? 'Cloned from reference deck structure' : '已吸收参考演示文稿视觉与骨架节奏' }
                }
                if (want === 'closing') return starterSlide('closing', lang)
                if (['chart', 'chart-split', 'waterfall'].includes(want)) return starterSlide('kpi', lang)
                if (['image', 'image-left', 'image-right', 'gallery'].includes(want)) return starterSlide('cards', lang)
                const baseSlide = starterSlide(ALLOWED_LAYOUTS.has(want) ? want : 'cards', lang)
                if (entry?.variant && typeof entry.variant === 'string' && /^[a-z0-9-]{1,40}$/.test(entry.variant)) {
                  baseSlide.variant = entry.variant
                }
                return baseSlide
              })
            }
          }
        }
        const fallbackContent = !content.trim() && !template && !skeletonSlides
          ? (lang === 'en'
              ? `# ${title}\n\n## Key Headline Metrics\n- **Target attainment**: 98.5% (+4.2% QoQ)\n- **Delivery velocity**: 2.4x faster cycle\n- **Customer adoption**: 118% net retention\n\n## Core Execution Pillars\n- **Focused scope**: Prioritize highest-value workflows\n- **Standardized quality**: Automated checks before handoff\n- **Closed-loop review**: Weekly metric tracking\n\n## Next Steps & Milestones\n- Phase 1: Finalize pilot sign-off this week\n- Phase 2: Roll out across priority teams\n- Phase 3: Lock next-quarter targets`
              : `# ${title}\n\n## 核心结果与关键指标\n- **关键目标达成率**：98.5%（环比提升 +4.2%）\n- **协同交付提效**：端到端周期缩短至原来的 2.4 倍速\n- **核心场景采纳率**：标杆团队留存率达 118%\n\n## 三大核心推进支柱\n- **聚焦高频刚需**：围绕最具价值的业务主链路集中投入\n- **标准化质量门禁**：统一输入规范与交付前核验清单\n- **量化闭环复盘**：按周追踪先行指标并快速纠偏\n\n## 推进排期与下一步行动\n- 第一阶段：本周完成试点方案确认与责任分工\n- 第二阶段：下月完成重点业务团队推广落地\n- 第三阶段：季度末完成量化成效复盘与沉淀`)
          : content
        const created = await (engine.buildDeckAsync ?? engine.buildDeck)({
          title,
          ...(skeletonSlides ? { slides: skeletonSlides } : {}),
          ...(fallbackContent ? { content: fallbackContent } : {}),
          ...(template ? { template } : {}),
          ...(exemplar ? { exemplar } : {}),
          ...(alignOrder ? { alignOrder: true } : {}),
          ...(autoUpgrade !== undefined ? { autoUpgrade } : {}),
          theme,
          lang,
          ...(tmpRefPath ? { referencePptx: tmpRefPath, cloneStructure } : {}),
          ...(brand ? { brand } : {}),
          outputDir: decksDir,
          cwd: storeDir,
          signal,
        })
        await this.remember(created, {})
        return { ...await this.view(digest(created.jsonPath)), created: true }
      } finally {
        if (tmpRefPath) rmSync(tmpRefPath, { force: true })
      }
    }
    if (body.operation === 'create-demo') {
      if (['referencePptx', 'pptxPath', 'path', 'outputDir', 'filePath'].some(k => Object.hasOwn(body, k))) {
        throw new Error('图片必须从面板上传，不能读取其他本地文件')
      }
      const lang: 'zh' | 'en' | 'bilingual' = body.lang === 'en' || body.lang === 'bilingual' ? body.lang : 'zh'
      const theme = typeof body.theme === 'string' && body.theme.trim() ? this.themeId(body.theme) : 'consulting'
      const engine = await this.loadEngine()
      signal?.throwIfAborted()
      const decksDir = join(dirname(this.catalogPath), 'workbench-decks')
      mkdirSync(decksDir, { recursive: true })
      const hasMermaidModule = existsSync(new URL('../skills/dsh-ppt/scripts/deck-mermaid.mjs', import.meta.url))
      const demoSlides = this.flagshipDemoSlides(lang, hasMermaidModule)
      const demoTitle = lang === 'en' ? 'DSH-PPT Flagship Showcase Deck' : 'DSH-PPT 旗舰能力全景示例'
      const created = await (engine.buildDeckAsync ?? engine.buildDeck)({
        title: demoTitle,
        slides: demoSlides,
        theme,
        lang,
        targetMinutes: 8,
        outputDir: decksDir,
        cwd: decksDir,
        signal,
      })
      await this.remember(created, {})
      return { ...await this.view(digest(created.jsonPath)), created: true, demo: true }
    }
    if (body.operation === 'import-office') {
      if (['filePath', 'pptxPath', 'path', 'outputDir', 'targetProjectDir', 'referencePptx'].some(k => Object.hasOwn(body, k))) {
        throw new Error('图片必须从面板上传，不能读取其他本地文件')
      }
      const { bytes, ext } = this.officeBytes(body.data, body.fileName)
      const engine = await this.loadEngine()
      signal?.throwIfAborted()
      if (typeof engine.importOfficeDeck !== 'function') {
        throw new Error('当前引擎版本暂不支持导入 Excel / Word 文档')
      }
      const theme = typeof body.theme === 'string' && body.theme.trim() ? (body.theme.trim() === 'auto' ? 'auto' : this.themeId(body.theme)) : 'auto'
      const lang = body.lang === 'en' || body.lang === 'bilingual' ? body.lang : 'zh'
      let chromeStyle: string | undefined
      if (body.chromeStyle !== undefined && body.chromeStyle !== null && body.chromeStyle !== '') {
        if (typeof body.chromeStyle !== 'string' || !ALLOWED_CHROME_STYLES.has(body.chromeStyle)) {
          throw new Error('母版骨架名称无效 / Invalid chrome skeleton style')
        }
        chromeStyle = body.chromeStyle
      }
      let targetMinutes: number | undefined
      if (body.targetMinutes !== undefined && body.targetMinutes !== null && body.targetMinutes !== '') {
        const mins = Number(body.targetMinutes)
        if (!Number.isFinite(mins) || mins < 1 || mins > 240) throw new Error('目标演讲时长需为 1–240 分钟的数字')
        targetMinutes = mins
      }
      const decksDir = join(dirname(this.catalogPath), 'workbench-decks')
      mkdirSync(decksDir, { recursive: true })
      const tmpOfficePath = join(decksDir, '.office-' + randomUUID() + ext)
      writeFileSync(tmpOfficePath, bytes)
      try {
        const cleanBase = typeof body.fileName === 'string'
          ? basename(body.fileName.trim(), extname(body.fileName.trim())).replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80)
          : ''
        const imported = await engine.importOfficeDeck({
          filePath: tmpOfficePath,
          cwd: decksDir,
          outDir: decksDir,
          outputDir: decksDir,
          ...(cleanBase ? { fileName: cleanBase } : {}),
          theme,
          lang,
          ...(chromeStyle ? { chromeStyle } : {}),
          ...(targetMinutes !== undefined ? { targetMinutes } : {}),
          signal,
        })
        await this.remember(imported, {})
        return { ...await this.view(digest(imported.jsonPath)), imported: true, created: true }
      } finally {
        rmSync(tmpOfficePath, { force: true })
      }
    }
    if (body.operation === 'import-pptx') {
      if (['pptxPath', 'path', 'outputDir', 'targetProjectDir', 'referencePptx'].some(k => Object.hasOwn(body, k))) {
        throw new Error('图片必须从面板上传，不能读取其他本地文件')
      }
      const bytes = this.pptxBytes(body.data)
      const engine = await this.loadEngine()
      signal?.throwIfAborted()
      if (typeof engine.importPptxDeck !== 'function') throw new Error('当前引擎版本暂不支持导入 PPTX')
      const theme = typeof body.theme === 'string' && body.theme.trim() ? (body.theme.trim() === 'auto' ? 'auto' : this.themeId(body.theme)) : 'auto'
      const modernize = body.modernize !== false
      const preserveSourceTheme = body.preserveSourceTheme === true
      let chromeStyle: string | undefined
      if (body.chromeStyle !== undefined && body.chromeStyle !== null && body.chromeStyle !== '') {
        if (typeof body.chromeStyle !== 'string' || !ALLOWED_CHROME_STYLES.has(body.chromeStyle)) {
          throw new Error('母版骨架名称无效 / Invalid chrome skeleton style')
        }
        chromeStyle = body.chromeStyle
      }
      if (body.id !== undefined && body.id !== null && body.id !== '') {
        const { entry, manifest } = await this.project(body.id)
        this.revision(body, manifest)
        const projectDir = dirname(entry.path)
        const tmpImportPath = join(projectDir, '.import-' + randomUUID() + '.pptx')
        writeFileSync(tmpImportPath, bytes)
        try {
          const synced = await engine.importPptxDeck({
            bytes,
            pptxPath: tmpImportPath,
            targetProjectDir: projectDir,
            deckPath: entry.path,
            theme,
            ...(chromeStyle ? { chromeStyle } : {}),
            modernize,
            preserveSourceTheme,
            signal,
          })
          await this.remember(synced, {})
          return { ...await this.view(digest(synced.jsonPath || entry.path)), imported: true, syncedProject: true }
        } finally {
          rmSync(tmpImportPath, { force: true })
        }
      }
      const decksDir = join(dirname(this.catalogPath), 'workbench-decks')
      mkdirSync(decksDir, { recursive: true })
      const tmpImportPath = join(decksDir, '.import-' + randomUUID() + '.pptx')
      writeFileSync(tmpImportPath, bytes)
      try {
        const imported = await engine.importPptxDeck({
          bytes,
          pptxPath: tmpImportPath,
          outDir: decksDir,
          outputDir: decksDir,
          cwd: decksDir,
          theme,
          ...(chromeStyle ? { chromeStyle } : {}),
          modernize,
          preserveSourceTheme,
          signal,
        })
        await this.remember(imported, {})
        return { ...await this.view(digest(imported.jsonPath)), imported: true, created: true }
      } finally {
        rmSync(tmpImportPath, { force: true })
      }
    }
    if (body.operation === 'open') return this.view(body.id)
    const { entry, engine, manifest, files } = await this.project(body.id)
    signal?.throwIfAborted()
    const context = { id: entry.id, manifest, ...(manifest.dataModel?{dataNotes:Object.fromEntries(manifest.slides.map((s:any)=>[s.id,engine.dataNotes(manifest,s)]))}:{}) }
    const visualContext = { id: entry.id, path: entry.path, manifest, engine }
    if (body.operation === 'visual-options') return { ok: true, ...await this.visual.options(signal) }
    if (body.operation === 'visual-list') return { ok: true, runs: this.visual.list(visualContext) }
    if (body.operation === 'visual-get') return { ok: true, run: this.visual.get(visualContext, body.runId) }
    if (body.operation === 'visual-stop') return { ok: true, run: this.visual.stop(visualContext, body.runId) }
    if (body.operation === 'visual-delete') return { ok: true, ...this.visual.remove(visualContext, body.runId) }
    if (body.operation === 'visual-page') return this.visual.page(visualContext, body.runId, body.round, body.slideId)
    if (body.operation === 'coach-options') return { ok: true, ...await this.coaching.options(signal) }
    if (body.operation === 'coach-list') return { ok: true, runs: this.coaching.list(context) }
    if (body.operation === 'coach-get') return { ok: true, run: this.coaching.get(context, body.runId) }
    if (body.operation === 'coach-stop') return { ok: true, run: this.coaching.stop(context, body.runId) }
    if (body.operation === 'coach-finish') return { ok: true, run: this.coaching.finish(context, body.runId) }
    if (body.operation === 'coach-delete') return { ok: true, ...this.coaching.remove(context, body.runId) }
    if (body.operation === 'absorb-upload') {
      if (body.expectedRevision !== undefined) this.revision(body, manifest)
      if (Object.hasOwn(body, 'pptxPath') || Object.hasOwn(body, 'path')) throw new Error('图片必须从面板上传，不能读取其他本地文件')
      if (typeof engine.absorbPptx !== 'function') throw new Error('当前引擎版本暂不支持参考 PPTX 吸收')
      const bytes = this.pptxBytes(body.data)
      const saveExemplarAs = typeof body.saveExemplarAs === 'string' && /^[a-z0-9\u4e00-\u9fff-]{1,64}$/i.test(body.saveExemplarAs.trim())
        ? body.saveExemplarAs.trim()
        : undefined
      const exemplarName = typeof body.exemplarName === 'string' && body.exemplarName.trim()
        ? body.exemplarName.trim().slice(0, 80)
        : undefined
      const storeDir = dirname(this.catalogPath)
      const absorbed = await engine.absorbPptx({
        bytes,
        extractLogo: body.extractLogo !== false,
        ...(saveExemplarAs ? { saveExemplarAs, ...(exemplarName ? { exemplarName } : {}), cwd: storeDir } : {}),
        signal,
      })
      return {
        ok: true,
        absorbed: {
          slideCount: absorbed?.slideCount ?? 0,
          slideSize: absorbed?.slideSize ?? null,
          extractedPalette: absorbed?.extractedPalette ?? null,
          extractedFonts: absorbed?.extractedFonts ?? null,
          extractedSkeleton: absorbed?.extractedSkeleton ?? null,
          sanitizedBrand: absorbed?.sanitizedBrand ?? null,
          sanitizedTokens: absorbed?.sanitizedTokens ?? null,
          recommendedTheme: absorbed?.recommendedTheme ?? null,
          recommendedChrome: absorbed?.recommendedChrome ?? null,
          recommendedTableStyle: absorbed?.recommendedTableStyle ?? null,
          narrativeProfile: absorbed?.narrativeProfile ?? null,
          styleRecipe: absorbed?.styleRecipe ?? null,
          savedExemplarPath: absorbed?.savedExemplarPath ?? null,
          exemplar: absorbed?.exemplar ?? null,
          warnings: absorbed?.warnings ?? [],
          slideSkeleton: absorbed?.slideSkeleton ?? null,
          layoutSummary: absorbed?.layoutSummary ?? null,
        },
      }
    }
    if (body.operation === 'download') {
      if (!['html', 'pptx', 'json', 'handout', 'onepager', 'remotion'].includes(String(body.kind))) throw new Error('不支持此文件类型')
      if (body.kind === 'handout') {
        const handoutPath = files.json.slice(0, -5) + '.handout.md'
        if (existsSync(handoutPath)) return { ok: true, name: basename(handoutPath), data: ordinaryFile(handoutPath).toString('base64') }
        const md = typeof engine.renderHandoutMarkdown === 'function' ? engine.renderHandoutMarkdown(manifest, manifest.language) : speakerNotes(manifest)
        return { ok: true, name: basename(entry.path, '.json') + '.handout.md', data: Buffer.from(md, 'utf8').toString('base64') }
      }
      if (body.kind === 'onepager') {
        const html = typeof engine.renderOnePagerHtml === 'function'
          ? engine.renderOnePagerHtml(manifest, manifest.language)
          : renderOnePagerHtmlFallback(manifest, manifest.language)
        return { ok: true, name: basename(entry.path, '.json') + '-onepager.html', data: Buffer.from(html, 'utf8').toString('base64') }
      }
      if (body.kind === 'remotion') {
        const themeObj = typeof engine.resolveTheme === 'function' ? engine.resolveTheme(manifest.theme) : undefined
        const pace = typeof engine.computePaceBudget === 'function'
          ? engine.computePaceBudget(manifest, manifest.targetMinutes)
          : computePaceBudgetFallback(manifest, manifest.targetMinutes)
        const bundle = buildRemotionBundleFiles(manifest, {
          fps: 30,
          format: 'landscape',
          themeTokens: (themeObj?.palette ?? {}) as Record<string, string>,
          paceBudget: pace as any,
        })
        const zipEntries = Object.fromEntries(Object.entries(bundle.files).map(([k, v]) => [k, strToU8(v)]))
        const zipped = zipSync(zipEntries, { level: 0 })
        return { ok: true, name: basename(entry.path, '.json') + '-remotion.zip', data: Buffer.from(zipped).toString('base64') }
      }
      const path = files[body.kind as keyof typeof files]
      return { ok: true, name: basename(path), data: ordinaryFile(path).toString('base64') }
    }
    if (body.operation === 'page') {
      const render = this.renders.get(entry.id)
      if (!render || render.revision !== manifest.revision || digest(ordinaryFile(files.pptx)) !== render.sourceSha256) throw new Error('请先渲染当前版本的 PPTX')
      if (!Number.isSafeInteger(body.page) || Number(body.page) < 1 || Number(body.page) > render.pngPaths.length) throw new Error('页码无效')
      const bytes = ordinaryFile(render.pngPaths[Number(body.page) - 1])
      if (digest(bytes) !== render.pngHashes[Number(body.page) - 1]) throw new Error('渲染图片已变化，请重新渲染当前 PPTX')
      return { ok: true, data: 'data:image/png;base64,' + bytes.toString('base64') }
    }
    this.revision(body, manifest)
    if (body.operation === 'visual-create') return { ok: true, run: await this.visual.create(visualContext, body, signal) }
    if (body.operation === 'visual-step') return { ok: true, run: await this.visual.step(visualContext, body.runId, body, signal) }
    if (body.operation === 'visual-adopt') {
      if (body.confirmed !== true) throw new Error('请确认采用修复副本 / Confirm adopting the repaired copy')
      const { path, render } = this.visual.adoption(visualContext, body.runId)
      await this.remember({ jsonPath: path }, {}, undefined)
      const copy = await this.project(digest(path))
      this.renders.set(copy.entry.id, { revision: copy.manifest.revision, sourceSha256: render.sourceSha256!, pngPaths: render.pngPaths!, pngHashes: render.pngPaths!.map(p => digest(ordinaryFile(p))), missingFonts: render.missingFonts })
      return { ...await this.view(digest(path)), originalId: entry.id }
    }
    if(body.operation === 'data-preview' || body.operation === 'data-apply') {
      // Always force file reads off, including nested source updates and scenario packets.
      const args = { deckPath:entry.path, expectedRevision:body.expectedRevision, parameters:body.parameters, sourceUpdates:body.sourceUpdates,
        scenario:body.scenario, previewToken:body.previewToken, confirmed:body.confirmed, saveAs:body.saveAs!==false, allowFiles:false, signal }
      if(body.operation === 'data-preview') return engine.previewDeckData(args)
      const result=await engine.updateDeckData(args)
      await this.remember(result,args)
      return { ...await this.view(digest(result.jsonPath)), originalId:entry.id }
    }
    if (body.operation === 'coach-create') return { ok: true, run: await this.coaching.create(context, body, signal) }
    if (body.operation === 'coach-step') {
      await this.coaching.step(context, body.runId, body, signal)
      const current = await this.project(entry.id)
      return { ok: true, run: this.coaching.get({ id: entry.id, manifest: current.manifest }, body.runId) }
    }
    if (body.operation === 'coach-apply') {
      if (body.confirmed !== true) throw new Error('请确认采纳所选建议 / Confirm selected suggestions')
      const { edits, append } = this.coaching.application(context, body.runId, body.selected, body.backup)
      const args = { deckPath: entry.path, expectedRevision: manifest.revision, signal, saveAs: true, preserveUndo: true,
        ...(edits.length ? { edits } : {}), ...(append.length ? { append } : {}) }
      const result = await engine.editDeck(args)
      await this.remember(result, args)
      return { ...await this.view(digest(result.jsonPath)), originalId: entry.id }
    }
    if (body.operation === 'render') {
      const result = await engine.renderDeck({ pptxPath: files.pptx, format: 'png', signal })
      if (result.ok) this.renders.set(entry.id, { revision: manifest.revision, pngPaths: result.pngPaths ?? [], pngHashes: (result.pngPaths ?? []).map(path => digest(ordinaryFile(path))), missingFonts: result.missingFonts, sourceSha256: result.sourceSha256! })
      const view = await this.view(entry.id)
      if (result.ok && !view.project.render) throw new Error('项目已被修改，请重新渲染')
      return { ...result, ...(result.ok ? {} : {
        messageEn: englishWorkbenchMessage(result.message || 'PPTX rendering failed.'),
        installationHintEn: 'Optional renderer: @deepseek-ai/libreoffice-kit@0.2.3 (bundled by DSH 0.2.2+), or 0.1.5. Install it in this DSH profile and restart DSH.',
      }), project: view.project }
    }
    if (body.operation === 'edit') {
      if (body.slide !== undefined && (typeof body.slide !== 'string' || !manifest.slides.some((s: any) => s.id === body.slide))) throw new Error('页面不存在')
      if (Object.hasOwn(body, 'referencePptx')) throw new Error('图片必须从面板上传，不能读取其他本地文件')
      let targetMinutesPatch: { targetMinutes?: number | null } = {}
      if (body.targetMinutes !== undefined) {
        if (body.targetMinutes === null || body.targetMinutes === '') {
          targetMinutesPatch = { targetMinutes: null }
        } else {
          const mins = Number(body.targetMinutes)
          if (!Number.isFinite(mins) || mins < 1 || mins > 240) throw new Error('目标演讲时长需为 1–240 分钟的数字')
          targetMinutesPatch = { targetMinutes: mins }
        }
      }
      let tastePatch: { taste?: unknown } = {}
      if (body.taste !== undefined) {
        if (body.taste === null || body.taste === '') {
          tastePatch = { taste: null }
        } else if (typeof body.taste === 'string' && /^[a-z0-9\u4e00-\u9fff-]{1,64}$/i.test(body.taste.trim())) {
          tastePatch = { taste: body.taste.trim() }
        } else if (body.taste && typeof body.taste === 'object' && !Array.isArray(body.taste)) {
          tastePatch = { taste: body.taste }
        } else {
          throw new Error('品味配方参数无效')
        }
      }
      const args = { deckPath: entry.path, expectedRevision: body.expectedRevision, signal,
        saveAs: body.saveAs === true,
        ...(body.slide === undefined ? {} : { edits: [{ slide: body.slide, patch: this.patch(body.patch) }] }),
        ...(body.order === undefined ? {} : { order: body.order }),
        ...(body.theme === undefined ? {} : { theme: this.themeId(body.theme) }),
        ...(body.brand === undefined ? {} : { brand: this.brandPatch(body.brand) }),
        ...tastePatch,
        ...targetMinutesPatch }
      const result = await engine.editDeck(args)
      await this.remember(result, args)
      return { ...await this.view(digest(result.jsonPath)), changed: (result as any).changed }
    }
    if (body.operation === 'append') {
      if (manifest.slides.length >= 120) throw new Error('页数已达 120 页上限，无法继续新增页面')
      const starter = starterSlide(body.archetype, manifest.language)
      const args = { deckPath: entry.path, expectedRevision: body.expectedRevision, signal, saveAs: body.saveAs === true, append: [starter] }
      const result = await engine.editDeck(args)
      await this.remember(result, args)
      const view = await this.view(digest(result.jsonPath))
      return { ...view, selected: view.project.slides.at(-1)?.id }
    }
    if (body.operation === 'duplicate' || body.operation === 'remove') {
      if (typeof body.slide !== 'string' || !manifest.slides.some((s: any) => s.id === body.slide)) throw new Error('页面不存在')
      const args = { deckPath: entry.path, expectedRevision: body.expectedRevision, signal, [body.operation]: [body.slide] }
      const result = await engine.editDeck(args)
      await this.remember(result, args)
      const view = await this.view(entry.id)
      const originalIndex = manifest.slides.findIndex((s: any) => s.id === body.slide)
      const selected = view.project.slides[Math.min(originalIndex + (body.operation === 'duplicate' ? 1 : 0), view.project.slides.length - 1)].id
      return { ...view, selected }
    }
    if (body.operation === 'undo') {
      await engine.undoDeck({ deckPath: entry.path, expectedRevision: body.expectedRevision, signal })
      return this.view(entry.id)
    }
    throw new Error('不支持此操作')
  }
  async fetchDownload(request: Request): Promise<Response> {
    if (request.method !== 'GET') return fail(405, '请使用 GET')
    const denied = originVerdict(request)
    if (denied) return denied
    try {
      const params = new URL(request.url).searchParams, kind = params.get('kind')
      if (!['html', 'pptx', 'json', 'bundle', 'share', 'notes', 'handout', 'onepager', 'remotion', 'pdf', 'png-zip', 'coaching', 'data', 'visual'].includes(String(kind))) return fail(400, '不支持此文件类型')
      const { entry, manifest, files, engine } = await this.project(params.get('id'))
      if (String(manifest.revision) !== params.get('revision')) return fail(409, '项目已被修改，请重新打开后下载')
      request.signal.throwIfAborted()
      let name: string, bytes: Uint8Array
      if(kind === 'visual') {
        bytes = strToU8(this.visual.markdown({ id: entry.id, path: entry.path, manifest, engine }, params.get('run'))); name = basename(entry.path,'.json') + '-visual-review.md'
      } else if(kind === 'data') {
        bytes=strToU8(engine.dataReport(manifest));name=basename(entry.path,'.json')+'-data-lineage.md'
      } else if (kind === 'coaching') {
        bytes = strToU8(this.coaching.markdown({ id: entry.id, manifest }, params.get('run')))
        name = basename(entry.path, '.json') + '-rehearsal.md'
      } else if (kind === 'notes') {
        bytes = strToU8(speakerNotes({...manifest,slides:manifest.slides.map((slide:any)=>({...slide,notes:engine.dataNotes(manifest,slide)}))}))
        name = basename(entry.path, '.json') + '-speaker-notes.md'
      } else if (kind === 'handout') {
        const handoutPath = entry.path.slice(0, -5) + '.handout.md'
        if (existsSync(handoutPath)) {
          bytes = ordinaryFile(handoutPath)
          name = basename(handoutPath)
        } else {
          const md = typeof engine.renderHandoutMarkdown === 'function' ? engine.renderHandoutMarkdown(manifest, manifest.language) : speakerNotes(manifest)
          bytes = strToU8(md)
          name = basename(entry.path, '.json') + '.handout.md'
        }
      } else if (kind === 'onepager') {
        const html = typeof engine.renderOnePagerHtml === 'function'
          ? engine.renderOnePagerHtml(manifest, manifest.language)
          : renderOnePagerHtmlFallback(manifest, manifest.language)
        bytes = strToU8(html)
        name = basename(entry.path, '.json') + '-onepager.html'
      } else if (kind === 'remotion') {
        const themeObj = typeof engine.resolveTheme === 'function' ? engine.resolveTheme(manifest.theme) : undefined
        const pace = typeof engine.computePaceBudget === 'function'
          ? engine.computePaceBudget(manifest, manifest.targetMinutes)
          : computePaceBudgetFallback(manifest, manifest.targetMinutes)
        const bundle = buildRemotionBundleFiles(manifest, {
          fps: 30,
          format: 'landscape',
          themeTokens: (themeObj?.palette ?? {}) as Record<string, string>,
          paceBudget: pace as any,
        })
        const zipEntries = Object.fromEntries(Object.entries(bundle.files).map(([k, v]) => [k, strToU8(v)]))
        bytes = zipSync(zipEntries, { level: 0 })
        name = basename(entry.path, '.json') + '-remotion.zip'
      } else if (kind === 'pdf' || kind === 'png-zip') {
        if (!existsSync(files.pptx)) return fail(400, 'PPTX 文件不存在，请先保存一次再导出')
        const tmpOut = join(dirname(this.catalogPath), `.export-${randomUUID()}`)
        try {
          const rendered = await engine.renderDeck({
            pptxPath: files.pptx,
            outputDir: tmpOut,
            format: kind === 'pdf' ? 'pdf' : 'png',
            width: 1440,
            signal: request.signal,
          })
          if (!rendered.ok) {
            return fail(rendered.status === 'unavailable' ? 503 : 500, rendered.message || '导出失败：当前环境未安装 @deepseek-ai/libreoffice-kit 渲染引擎 / PDF/PNG export requires @deepseek-ai/libreoffice-kit')
          }
          if (kind === 'pdf') {
            if (!rendered.pdfPath || !existsSync(rendered.pdfPath)) return fail(400, 'PDF 渲染产物缺失')
            bytes = ordinaryFile(rendered.pdfPath)
            name = basename(entry.path, '.json') + '.pdf'
          } else {
            const pngList = Array.isArray(rendered.pngPaths) ? rendered.pngPaths : []
            if (pngList.length === 0) return fail(400, 'PNG 渲染产物缺失')
            const zipEntries: Record<string, Uint8Array> = {}
            let totalBytes = 0
            pngList.forEach((pPath, pi) => {
              const buf = ordinaryFile(pPath)
              totalBytes += buf.byteLength
              if (totalBytes > BUNDLE_LIMIT) throw new Error('PNG 图包超过 128 MiB 上限')
              zipEntries[`slide-${String(pi + 1).padStart(2, '0')}.png`] = buf
            })
            bytes = zipSync(zipEntries, { level: 0 })
            name = basename(entry.path, '.json') + '-slides-png.zip'
          }
        } finally {
          try { rmSync(tmpOut, { recursive: true, force: true }) } catch { /* ignore */ }
        }
      } else if (kind === 'bundle' || kind === 'share') {
        const entries: Record<string, Uint8Array> = {}
        let total = 0
        const selected = kind === 'share' ? [files.html, files.pptx] : Object.values(files)
        const add = (name: string, content: Uint8Array) => { total += total >= 0 ? content.byteLength : 0; if (total > BUNDLE_LIMIT) return false; entries[name] = content; return true }
        for (const path of selected) {
          if (!existsSync(path)) return fail(400, '成品文件不完整，请先保存一次再下载成品包')
          const content = ordinaryFile(path), exported = kind === 'share' && path === files.html ? shareHtml(content) : content
          if (!add(basename(path), exported)) return fail(413, '成品包超过 128 MiB，请分别下载文件')
        }
        // An allowlist of registered sibling files; never walk project directories.
        if (kind === 'share') {
          const notes = speakerNotes({...manifest,slides:manifest.slides.map((slide:any)=>({...slide,notes:engine.dataNotes(manifest,slide)}))})
          if (!add(basename(entry.path, '.json') + '-speaker-notes.md', strToU8(notes))) return fail(413, '成品包超过 128 MiB，请分别下载文件')
        }
        const details = kind === 'share'
          ? '演示文稿分享包 / Presentation share bundle\n\nPPTX: 在 PowerPoint / WPS 中打开。 / Open in PowerPoint or WPS.\nHTML: 解压后用浏览器离线放映。 / Extract and open in a browser for offline playback.\nMarkdown: 当前修订的逐页讲稿。 / Speaker notes for this revision.\n\n此包不含 JSON 工程或完整导入材料。HTML、PPTX 备注和讲稿保留已绑定的来源摘录及用户填写内容。\nThe project JSON and complete imported materials are not included. HTML, PPTX notes and speaker notes retain bound source excerpts and authored content.\n'
          : '演示文稿工程包 / Presentation project bundle\n\nPPTX: 在 PowerPoint / WPS 中编辑。 / Edit in PowerPoint or WPS.\nHTML: 解压后用浏览器打开，支持离线放映。 / Extract and open in a browser for offline playback.\nJSON: 保留以便继续在 DSH 中编辑；其中可能包含完整导入材料。 / Keep for future DSH edits; this project may contain complete imported materials.\n'
        if (!add('README.txt', strToU8(details + '\n修订 / Revision: ' + manifest.revision + '\n'))) return fail(413, '成品包超过 128 MiB，请分别下载文件')
        // PPTX and embedded images are already compressed; store to avoid a large
        // synchronous recompression on the host's event loop.
        bytes = zipSync(entries, { level: 0 })
        name = basename(entry.path, '.json') + (kind === 'share' ? '-share.zip' : '-delivery.zip')
      } else {
        const path = files[kind as keyof typeof files]
        bytes = ordinaryFile(path); name = basename(path)
      }
      request.signal.throwIfAborted()
      if ((await this.project(entry.id)).manifest.revision !== manifest.revision) return fail(409, '项目已被修改，请重新打开后下载')
      const archive = kind === 'bundle' || kind === 'share' || kind === 'remotion' || kind === 'png-zip'
      const type = ['notes', 'handout', 'coaching', 'data', 'visual'].includes(String(kind)) ? 'text/markdown; charset=utf-8' : archive ? 'application/zip' : kind === 'pdf' ? 'application/pdf' : kind === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : (kind === 'html' || kind === 'onepager') ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8'
      return new Response(new Uint8Array(bytes), { headers: {
        'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
        'content-disposition': `attachment; filename="presentation.${archive ? 'zip' : ['notes', 'handout', 'coaching', 'data', 'visual'].includes(String(kind)) ? 'md' : kind === 'onepager' ? 'html' : kind}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      } })
    } catch (error) { return fail(400, error instanceof Error ? error.message : String(error)) }
  }
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return fail(405, '请使用 POST')
    if (request.headers.get('x-dsh-ppt-action') !== '1' || request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail(403, '请从演示文稿面板操作')
    const denied = originVerdict(request)
    if (denied) return denied
    try {
      const reader = request.body?.getReader()
      if (!reader) return fail(400, '缺少请求内容')
      let size = 0; const chunks: Uint8Array[] = []
      try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > REQUEST_LIMIT) { await reader.cancel(); return fail(413, '图片或请求超过 36 MiB，请压缩后重试') } chunks.push(value) } } finally { reader.releaseLock() }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400, '请求必须是对象')
      return json(200, await this.action(body, request.signal))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return fail(/修订号冲突|已被修改|工程已被修改|正在被另一次|其他操作修改/.test(message) ? 409 : 400, message)
    }
  }
}

export function installPptWorkbench(ctx: any, workbench: PptWorkbench): void {
  ctx.inject?.(['connection'], (host: any) => {
    host.connection?.fetch?.register({ path: PPT_WORKBENCH_ROUTE, methods: ['POST'], requestBody: 'buffered', fetch: (request: Request) => workbench.fetch(request) })
    host.connection?.fetch?.register({ path: PPT_DOWNLOAD_ROUTE, methods: ['GET'], requestBody: 'buffered', fetch: (request: Request) => workbench.fetchDownload(request) })
  })
}

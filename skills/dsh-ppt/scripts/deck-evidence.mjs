/**
 * deck-evidence.mjs —— 权威信源导航、混合资料溯源与 SLOP-13 事实核验引擎。
 *
 * 设计边界：
 * - 100% 离线、零新增运行时依赖、绝不在引擎内部发起网络请求（检索由宿主 Agent / dsh-cite 完成）；
 * - 内置 8 大领域权威信源白名单（`AUTHORITATIVE_DOMAINS`）与垃圾/二手转引域名黑名单（`NOISE_DOMAINS`）：
 *   1. `detectResearchDomain` + `buildAuthoritativeQueryPack`：按主题自动输出带 `site:` / `filetype:pdf` / `-site:` 排除营销号的精准权威检索式；
 *   2. `classifySourceAuthority`：代码级自动定级 Tier 1/2/3、检测「名义权威机构 + 实际二手转引链接」（`secondary-relay-source`）；
 *   3. 完整支持 **Mode C 混合模式**（`origin: 'local-file' | 'web-research'`、`tier: 1 | 2 | 3`、`claimType: 'actual' | 'forecast' | 'policy' | 'benchmark'`）：
 *      `buildHybridEnrichmentPlan` 诊断本地 Word/Excel/照片已有内容与外部权威对标缺口，输出不冲突的顺延编号 `nextEvidenceId`；
 *   4. `[E1]` / `evidenceIds` 自动注入规范左下角 `source` 脚注、演讲者备注 `notes` 完整溯源卡与封底前 `booktabs` 附录页；
 *   5. `SLOP-13` 升级门禁：拦截悬空引用、空洞假出处、未说明口径的 `unverified`/`conflicting`、把 T3/黑名单自媒体当已核验权威事实、
 *      二手转引冒充一手原链接、预测数据未标预测口径、外源缺失年份及过时基准；并自动尊重 `.dsh-ppt/brand-kit.json` 的 `preferredSources` / `blockedDomains`。
 */

import { stripInlineMarkdown } from './deck-layouts.mjs'
import { resolveTheme } from './deck-themes.mjs'
import { generateVisualBrief } from './deck-infographics.mjs'
import { CURATED_EXEMPLARS, resolveExemplar, matchBestExemplar, getExemplarFewShotSlides } from './deck-exemplars.mjs'

const MAX_EVIDENCE_ITEMS = 60
const CONFIDENCE_SET = new Set(['verified', 'estimated', 'conflicting', 'unverified'])
const ORIGIN_SET = new Set(['local-file', 'web-research'])
const CLAIM_TYPE_SET = new Set(['actual', 'forecast', 'policy', 'benchmark'])
const INLINE_REF_RE = /\[([Ee]\d{1,3})\]/g
const VAGUE_SOURCE_RE = /^(?:(?:数据|资料|信息)?来源\s*[:：]\s*|sources?\s*[:：]\s*)?(?:网络(?:整理|搜集|公开资料|资料|收集)?|互联网(?:整理|公开资料|资料)?|公开资料(?:整理)?|网上(?:资料|整理)?|综合整理|内部估算|估算|整理自网络|public\s+internet|online\s+sources?|web\s+search|various\s+sources?|internet|google|baidu|ai\s+generated?)[。.\s]*$/i
const QUANT_LAYOUTS = new Set(['kpi', 'chart', 'chart-split', 'waterfall', 'marimekko', 'tam', 'dumbbell', 'heatmap', 'treemap', 'gauge'])
const LOCAL_SOURCE_RE = /\.(?:xlsx|xls|csv|tsv|docx|doc|pdf|png|jpe?g|webp|pptx?)(?:\s|$|[）)》」】])/i
const LOCAL_SOURCE_LABEL_RE = /(?:^|[\s（(])(?:工作表|本地|内部资料|内部报表|原始台账|Sheet\s*["'])/i

// ---------------------------------------------------------------------------
// 8-Domain Authoritative Source Knowledge Base & Noise-Domain Blacklist
// ---------------------------------------------------------------------------

export const AUTHORITATIVE_DOMAINS = Object.freeze({
  'gov-macro': {
    id: 'gov-macro',
    nameZh: '宏观政务与政策规划',
    nameEn: 'Government, Policy & Macro Statistics',
    keywords: /政策|规划|政务|宏观|GDP|十四五|十五五|监管|部委|财政|央行|统计局|国办|低空经济|基础设施|乡村振兴|城镇化|白皮书|regulation|policy|macro|gdp|ministry|government|public sector|fiscal/i,
    tier1Domains: ['gov.cn', 'stats.gov.cn', 'miit.gov.cn', 'ndrc.gov.cn', 'pbc.gov.cn', 'mof.gov.cn', 'worldbank.org', 'imf.org', 'oecd.org'],
    tier2Domains: ['caixin.com', 'reuters.com', 'ft.com', 'economist.com', 'mckinsey.com'],
    tier1LabelsZh: '国家统计局、国务院/工信部/发改委/央行公报、IMF、世界银行、OECD',
    tier1LabelsEn: 'National Bureau of Statistics, Ministries/Central Banks, IMF, World Bank, OECD',
  },
  'finance-filings': {
    id: 'finance-filings',
    nameZh: '金融财报与资本市场',
    nameEn: 'Finance, Earnings & Capital Markets',
    keywords: /财报|年报|季报|营收|毛利|净利|估值|IPO|融资|并购|债券|基金|银行|券商|保险|ARR|EBITDA|earnings|10-k|10-q|annual report|valuation|revenue|margin|banking|fintech|capital market|sec|hkex/i,
    tier1Domains: ['sec.gov', 'hkexnews.hk', 'cninfo.com.cn', 'sse.com.cn', 'szse.cn', 'pbc.gov.cn', 'bis.org', 'federalreserve.gov', 'imf.org'],
    tier2Domains: ['bloomberg.com', 'reuters.com', 'ft.com', 'wsj.com', 'spglobal.com', 'caixin.com', 'mckinsey.com', 'pwc.com', 'deloitte.com'],
    tier1LabelsZh: 'SEC EDGAR、港交所披露易、巨潮资讯/沪深交易所年报、央行/BIS/IMF',
    tier1LabelsEn: 'SEC EDGAR, HKEXnews, CNINFO/Exchange Filings, BIS, Federal Reserve, IMF',
  },
  'ai-tech': {
    id: 'ai-tech',
    nameZh: 'AI、云计算与硬科技',
    nameEn: 'AI, Cloud, SaaS & Deep Tech',
    keywords: /AI|大模型|LLM|Agent|智能体|算力|芯片|半导体|云计算|SaaS|软件|架构|数据库|安全|量子|机器人|自动驾驶|人工智能|artificial intelligence|cloud|semiconductor|chip|gpu|robotics|cybersecurity|software|devtools/i,
    tier1Domains: ['caict.ac.cn', 'miit.gov.cn', 'nist.gov', 'arxiv.org', 'ieee.org', 'acm.org', 'nature.com', 'sec.gov'],
    tier2Domains: ['gartner.com', 'idc.com', 'forrester.com', 'mckinsey.com', 'semi.org', 'yolegroup.com', 'canalys.com', 'counterpointresearch.com'],
    tier1LabelsZh: '中国信通院（CAICT）、工信部、NIST、IEEE/ACM/arXiv、头部厂商财报与官方技术报告',
    tier1LabelsEn: 'NIST, IEEE/ACM/arXiv, CAICT, Listed Tech 10-K Filings, Gartner/IDC/SEMI',
  },
  'medical-clinical': {
    id: 'medical-clinical',
    nameZh: '医疗健康与临床医药',
    nameEn: 'Healthcare, Clinical & Life Sciences',
    keywords: /医疗|医药|临床|患者|医院|新药|生物|基因|肿瘤|疫苗|慢病|医保|器械|FDA|NMPA|clinical|medical|pharma|biotech|patient|hospital|drug|oncology|genome|healthcare|who/i,
    tier1Domains: ['who.int', 'pubmed.ncbi.nlm.nih.gov', 'nih.gov', 'fda.gov', 'nhc.gov.cn', 'nmpa.gov.cn', 'nejm.org', 'thelancet.com', 'nature.com', 'bmj.com'],
    tier2Domains: ['iqvia.com', 'mckinsey.com', 'deloitte.com', 'reuters.com', 'statnews.com'],
    tier1LabelsZh: 'WHO、PubMed/NIH、NEJM/Lancet/BMJ、国家卫健委/NMPA、FDA 官方评审文件',
    tier1LabelsEn: 'WHO, PubMed/NIH, FDA, NEJM, The Lancet, BMJ, National Health Commissions',
  },
  'energy-climate': {
    id: 'energy-climate',
    nameZh: '新能源、双碳与汽车制造',
    nameEn: 'Energy, EV, Battery & Climate',
    keywords: /新能源|电池|固态|锂电|光伏|风电|储能|氢能|碳中和|双碳|ESG|电动车|汽车|智驾|eVTOL|能源|电力|energy|battery|ev|solar|wind|storage|climate|carbon|esg|grid|automotive|mobility/i,
    tier1Domains: ['iea.org', 'irena.org', 'nea.gov.cn', 'miit.gov.cn', 'energy.gov', 'ipcc.ch', 'unep.org'],
    tier2Domains: ['cpcaauto.com', 'caam.org.cn', 'trendforce.com', 'bnef.com', 'woodmac.com', 'spglobal.com', 'reuters.com'],
    tier1LabelsZh: '国际能源署（IEA）、IRENA、国家能源局、工信部、IPCC、中汽协/乘联会',
    tier1LabelsEn: 'IEA, IRENA, DOE, IPCC, National Energy Administrations, BNEF/TrendForce',
  },
  'academic-science': {
    id: 'academic-science',
    nameZh: '学术科研与工程基准',
    nameEn: 'Academic Research & Peer-Reviewed Science',
    keywords: /论文|实验|答辩|基准|算法|模型训练|消融|综述|研究|科学|物理|化学|材料|定理|paper|thesis|defense|benchmark|ablation|survey|peer-reviewed|experiment|research|science|university/i,
    tier1Domains: ['nature.com', 'science.org', 'arxiv.org', 'ieee.org', 'acm.org', 'springer.com', 'sciencedirect.com', 'pnas.org', 'pubmed.ncbi.nlm.nih.gov'],
    tier2Domains: ['mit.edu', 'stanford.edu', 'edu.cn', 'iso.org'],
    tier1LabelsZh: 'Nature、Science、IEEE、ACM、arXiv、Springer/Elsevier 顶刊与高校实验室',
    tier1LabelsEn: 'Nature, Science, IEEE, ACM, arXiv, Springer, ScienceDirect, Top University Labs',
  },
  'consumer-retail': {
    id: 'consumer-retail',
    nameZh: '消费零售、品牌与电商',
    nameEn: 'Consumer, Retail, Brand & E-Commerce',
    keywords: /消费|零售|电商|品牌|出海|渠道|GMV|复购|客单价|快消|餐饮|文旅|社媒|营销|retail|consumer|ecommerce|brand|gmv|omnichannel|fmcg|marketing|dtc/i,
    tier1Domains: ['stats.gov.cn', 'mofcom.gov.cn', 'census.gov', 'sec.gov', 'hkexnews.hk', 'cninfo.com.cn'],
    tier2Domains: ['nielseniq.com', 'kantar.com', 'euromonitor.com', 'mckinsey.com', 'bain.com', 'bcg.com', 'statista.com', 'questmobile.com.cn'],
    tier1LabelsZh: '国家统计局/商务部社零数据、美国普查局、龙头零售上市财报、尼尔森/凯度/欧睿',
    tier1LabelsEn: 'Census/Commerce Retail Data, Listed Retailer Filings, NielsenIQ, Kantar, Euromonitor',
  },
  'general-business': {
    id: 'general-business',
    nameZh: '商业战略与行业研究',
    nameEn: 'Enterprise Strategy & Industry Benchmarks',
    keywords: /.*/,
    tier1Domains: ['stats.gov.cn', 'gov.cn', 'sec.gov', 'hkexnews.hk', 'cninfo.com.cn', 'worldbank.org', 'oecd.org', 'imf.org'],
    tier2Domains: ['mckinsey.com', 'bcg.com', 'bain.com', 'gartner.com', 'idc.com', 'pwc.com', 'deloitte.com', 'reuters.com', 'ft.com', 'caixin.com'],
    tier1LabelsZh: '政府统计公报、上市公司年报、IMF/世界银行/OECD、麦肯锡/BCG/Gartner/IDC',
    tier1LabelsEn: 'Official Statistics, Listed Filings, IMF/World Bank/OECD, McKinsey/BCG/Gartner/IDC',
  },
})

export const NOISE_DOMAINS = Object.freeze([
  'baijiahao.baidu.com',
  'sohu.com',
  '163.com',
  'sina.com.cn',
  'zhihu.com',
  'csdn.net',
  'toutiao.com',
  'mp.weixin.qq.com',
  'medium.com',
  'reddit.com',
  'quora.com',
  'jianshu.com',
  'bilibili.com',
  'douyin.com',
  'xiaohongshu.com',
  'weibo.com',
  'xueqiu.com',
  'tieba.baidu.com',
  'blogspot.com',
  'wordpress.com',
  '36kr.com',
  'huxiu.com',
  'tmtpost.com',
  'cyzone.cn',
  'eastmoney.com',
])

const ALL_TIER1_DOMAINS = new Set([
  ...Object.values(AUTHORITATIVE_DOMAINS).flatMap((d) => d.tier1Domains),
  'gov', 'gov.cn', 'edu', 'edu.cn', 'ac.uk', 'ac.cn', 'europa.eu', 'un.org', 'iso.org', 'wto.org', 'ecb.europa.eu', 'cdc.gov', 'ema.europa.eu', 'csrc.gov.cn', 'cbirc.gov.cn', 'samr.gov.cn',
])

const ALL_TIER2_DOMAINS = new Set([
  ...Object.values(AUTHORITATIVE_DOMAINS).flatMap((d) => d.tier2Domains),
  'ey.com', 'kpmg.com', 'moodys.com', 'fitchratings.com', 'pitchbook.com', 'cbinsights.com', 'iresearch.cn', 'gg-lb.com', 'gaogong123.com',
])

const TIER1_PUBLISHER_RE = /(?:国家统计局|国务院|工信部|发改委|人民银行|央行|财政部|商务部|卫健委|药监局|能源局|证监会|交易所|信通院|CAICT|SEC|EDGAR|HKEX|港交所|巨潮|年报|季报|10-K|10-Q|财报|WHO|IEA|IRENA|IMF|World\s*Bank|世界银行|OECD|IPCC|NIST|FDA|NMPA|EMA|ISO|Nature|Science|NEJM|Lancet|BMJ|IEEE|ACM|PubMed|NIH|arXiv)/i
const TIER2_PUBLISHER_RE = /(?:Gartner|IDC|Forrester|McKinsey|麦肯锡|BCG|波士顿咨询|Bain|贝恩|PwC|普华永道|Deloitte|德勤|EY|安永|KPMG|毕马威|Bloomberg|彭博|Reuters|路透|Financial\s*Times|FT|WSJ|Economist|财新|Caixin|TrendForce|集邦|GGII|高工|艾瑞|iResearch|QuestMobile|Canalys|Counterpoint|Nielsen|尼尔森|Kantar|凯度|Euromonitor|欧睿|Statista|SEMI|Yole|中汽协|乘联会|CPCA|BNEF|S&P\s*Global)/i
const TIER3_PUBLISHER_RE = /(?:百家号|知乎|小红书|抖音|头条|公众号|自媒体|博客|论坛|贴吧|CSDN|搜狐|网易号|新浪博客|行业博客|Industry\s*Blog|Medium|Reddit|Quora|匿名)/i

function cleanText(value, maxLen = 240) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLen)
}

function estimateTextWidth(text) {
  let w = 0
  for (const ch of stripInlineMarkdown(String(text ?? ''))) {
    w += /[^\x00-\xff]/.test(ch) ? 1 : 0.55
  }
  return w
}

function trimCellByWidth(text, maxWidth = 22.5) {
  const s = cleanText(text, 160)
  if (!s || estimateTextWidth(s) <= maxWidth) return s
  let out = ''
  let w = 0
  const limit = Math.max(4, maxWidth - 1.1)
  let cutIdx = s.length
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]
    const cw = /[^\x00-\xff]/.test(ch) ? 1 : 0.55
    if (w + cw > limit) {
      cutIdx = i
      break
    }
    out += ch
    w += cw
  }
  // Avoid mid-ASCII-word chopping when cutting before an ASCII alphanumeric character
  if (cutIdx < s.length && /[A-Za-z0-9]/.test(s[cutIdx]) && /[A-Za-z0-9._-]$/.test(out)) {
    const backed = out.replace(/[A-Za-z0-9._-]+$/, '')
    if (estimateTextWidth(backed) >= 5) {
      out = backed
    }
  }
  out = out.replace(/[\s,，、；;：:(\[（【《「『&.-]+$/, '')
  // Drop an unclosed opening title/paren fragment if cut mid-phrase (e.g. "GGII《2025" -> "GGII")
  out = out.replace(/[《（(「『【][^》）)」』】]*$/, '').replace(/[\s,，、；;：:&-]+$/, '')
  return (out || s.slice(0, 6)) + '…'
}

function sanitizeHttpUrl(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return ''
  try {
    const parsed = new URL(s)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('dsh-ppt：evidence.url 仅支持 http:// 或 https:// 链接：' + s)
    }
    return parsed.toString()
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('dsh-ppt：')) throw err
    throw new Error('dsh-ppt：evidence.url 格式无效：' + s)
  }
}

function extractHost(url) {
  if (!url) return ''
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return ''
  }
}

function hostMatchesDomain(host, domain) {
  if (!host || !domain) return false
  const cleanDom = String(domain).toLowerCase().replace(/^www\./, '').trim()
  if (!cleanDom) return false
  return host === cleanDom || host.endsWith('.' + cleanDom)
}

function normalizeOriginToken(raw) {
  const s = cleanText(raw, 32).toLowerCase()
  if (!s) return ''
  if (s === 'local-file' || s === 'local' || s === 'internal' || s === 'file') return 'local-file'
  if (s === 'web-research' || s === 'web' || s === 'external' || s === 'research' || s === 'online') return 'web-research'
  return ''
}

function normalizeTierToken(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 3) return raw
  const m = /^t?([123])$/i.exec(String(raw).trim())
  if (m) return Number(m[1])
  throw new Error(`dsh-ppt：evidence.tier 仅支持 1 / 2 / 3（或 T1 / T2 / T3）：${raw}`)
}

/**
 * 自动识别调研选题所属 8 大专业领域，用于路由权威信源白名单。
 */
export function detectResearchDomain(topic, context = '') {
  const hay = `${topic || ''} ${context || ''}`.trim()
  const order = ['medical-clinical', 'energy-climate', 'finance-filings', 'ai-tech', 'academic-science', 'consumer-retail', 'gov-macro']
  for (const id of order) {
    if (AUTHORITATIVE_DOMAINS[id].keywords.test(hay)) return AUTHORITATIVE_DOMAINS[id]
  }
  return AUTHORITATIVE_DOMAINS['general-business']
}

/**
 * 代码级权威信源自动定级器：
 * - 区分 `local-file`（本地资料）与 `web-research`（外部权威检索）；
 * - 按域名与机构名判定 Tier 1 / Tier 2 / Tier 3，并尊重工作区 `preferredSources` / `blockedDomains`；
 * - 精准捕获「名义 T1/T2 机构 + 实际 T3 媒体转引链接」（`isSecondaryRelay: true`）。
 */
export function classifySourceAuthority(input = {}, options = {}) {
  const source = cleanText(input.source, 160)
  const url = typeof input.url === 'string' ? input.url.trim() : ''
  const host = extractHost(url)
  const preferred = (Array.isArray(options.preferredSources) ? options.preferredSources : [])
    .map((s) => String(s).toLowerCase().trim())
    .filter(Boolean)
  const blocked = (Array.isArray(options.blockedDomains) ? options.blockedDomains : [])
    .map((s) => String(s).toLowerCase().trim())
    .filter(Boolean)

  const explicitOrigin = normalizeOriginToken(input.origin)
  let origin = explicitOrigin
  if (!origin) {
    if (url) origin = 'web-research'
    else if (LOCAL_SOURCE_RE.test(source) || LOCAL_SOURCE_LABEL_RE.test(source)) origin = 'local-file'
  }

  let urlTier
  let isBlockedDomain = false
  let matchedDomain = ''

  if (host) {
    const hitBlocked = blocked.find((d) => hostMatchesDomain(host, d))
    if (hitBlocked) {
      urlTier = 3
      isBlockedDomain = true
      matchedDomain = hitBlocked
    } else {
      const hitPref = preferred.find((d) => d.includes('.') && hostMatchesDomain(host, d))
      if (hitPref) {
        urlTier = 1
        matchedDomain = hitPref
      } else {
        const hitNoise = NOISE_DOMAINS.find((d) => hostMatchesDomain(host, d))
        if (hitNoise) {
          urlTier = 3
          matchedDomain = hitNoise
        } else {
          const hitT1 = [...ALL_TIER1_DOMAINS].find((d) => hostMatchesDomain(host, d))
          if (hitT1) {
            urlTier = 1
            matchedDomain = hitT1
          } else {
            const hitT2 = [...ALL_TIER2_DOMAINS].find((d) => hostMatchesDomain(host, d))
            if (hitT2) {
              urlTier = 2
              matchedDomain = hitT2
            }
          }
        }
      }
    }
  }

  let sourceTier
  if (source) {
    const hitPrefLabel = preferred.find((p) => !p.includes('.') && source.toLowerCase().includes(p))
    if (hitPrefLabel) sourceTier = 1
    else if (TIER1_PUBLISHER_RE.test(source)) sourceTier = 1
    else if (TIER2_PUBLISHER_RE.test(source)) sourceTier = 2
    else if (TIER3_PUBLISHER_RE.test(source)) sourceTier = 3
  }

  const isSecondaryRelay = Boolean(
    origin !== 'local-file' &&
    urlTier === 3 &&
    (sourceTier === 1 || sourceTier === 2),
  )

  let inferredTier
  if (origin === 'local-file') {
    inferredTier = 1
  } else if (isBlockedDomain || urlTier === 3) {
    inferredTier = 3
  } else if (urlTier !== undefined) {
    inferredTier = urlTier
  } else if (sourceTier !== undefined) {
    inferredTier = sourceTier
  }

  const explicitTier = input.tier !== undefined ? normalizeTierToken(input.tier) : undefined
  const effectiveTier = isBlockedDomain ? 3 : (explicitTier ?? inferredTier)

  return {
    origin: origin || undefined,
    tier: effectiveTier,
    urlTier,
    sourceTier,
    isSecondaryRelay,
    isBlockedDomain,
    matchedDomain: matchedDomain || host || undefined,
  }
}

/**
 * 为指定选题生成「8 大领域权威信源精准检索包」：
 * 直接带 `site:` 权威白名单、`filetype:pdf` 官方报告指令，以及 `-site:` 营销号排除清单。
 */
export function buildAuthoritativeQueryPack(options = {}) {
  const topic = cleanText(options.topic ?? options.title, 140)
  const langEn = String(options.lang || 'zh').toLowerCase() === 'en'
  const domain = options.domain && AUTHORITATIVE_DOMAINS[options.domain]
    ? AUTHORITATIVE_DOMAINS[options.domain]
    : detectResearchDomain(topic, options.context || '')

  const preferredDomains = (Array.isArray(options.preferredSources) ? options.preferredSources : [])
    .map((s) => String(s).toLowerCase().trim())
    .filter((s) => s.includes('.'))
  const blockedDomains = (Array.isArray(options.blockedDomains) ? options.blockedDomains : [])
    .map((s) => String(s).toLowerCase().trim())
    .filter((s) => s.includes('.'))

  const t1List = [...new Set([...preferredDomains, ...domain.tier1Domains])].slice(0, 6)
  const t2List = [...new Set(domain.tier2Domains)].slice(0, 5)
  const excludeList = [...new Set([
    ...blockedDomains,
    ...(langEn
      ? ['medium.com', 'reddit.com', 'quora.com']
      : ['baijiahao.baidu.com', 'sohu.com', 'zhihu.com', '163.com']),
  ])].slice(0, 5)

  const t1SiteClause = t1List.slice(0, 4).map((d) => `site:${d}`).join(' OR ')
  const t2SiteClause = t2List.slice(0, 4).map((d) => `site:${d}`).join(' OR ')
  const excludeClause = excludeList.map((d) => `-site:${d}`).join(' ')
  const yr = new Date().getFullYear()
  const yrs = `${yr - 1} ${yr}`

  const rounds = langEn
    ? [
        {
          round: 1,
          tierTarget: 'Tier 1 (Official / Regulatory / Listed Filings)',
          goal: 'Primary Official & Authoritative Baseline',
          queries: [
            `"${topic}" (${t1SiteClause}) ${yrs}`,
            `"${topic}" filetype:pdf (report OR whitepaper OR statistics) ${yrs} ${excludeClause}`,
          ],
          requirement: `Anchor headline market size, policy milestones, exact year & geographic scope in Tier 1 sources (${domain.tier1LabelsEn}).`,
        },
        {
          round: 2,
          tierTarget: 'Tier 1–2 (Analyst Benchmarks & Peer Filings)',
          goal: 'Competitive Landscape & Quantitative Benchmarks',
          queries: [
            `"${topic}" (${t2SiteClause}) benchmark OR "market share" ${yrs}`,
            `"${topic}" "annual report" OR "10-K" OR case study efficiency cost ${yrs} ${excludeClause}`,
          ],
          requirement: 'Verify peer metrics under identical units & geographic scope; never rely on a media relay URL without tracing the original report.',
        },
        {
          round: 3,
          tierTarget: 'Tier 1–2 (Independent Risks & Forecast Range)',
          goal: 'Latest Milestones, Bottlenecks & Counter-Evidence',
          queries: [
            `"${topic}" bottleneck OR risk OR limitation OR forecast ${yr} ${yr + 1} ${excludeClause}`,
            `"${topic}" (${t1SiteClause}) roadmap OR compliance OR outlook ${yr}`,
          ],
          requirement: 'Tag forward projections with claimType:"forecast" and record conflicting estimates as ranges; downgrade unsourced dimensions to qualitative diagrams.',
        },
      ]
    : [
        {
          round: 1,
          tierTarget: 'Tier 1（官方部委 / 统计公报 / 上市财报 / 顶刊）',
          goal: '一手官方与权威基线数据（市场/政策/年报）',
          queries: [
            `${topic} (${t1SiteClause}) ${yrs}`,
            `${topic} filetype:pdf (白皮书 OR 年报 OR 统计公报) ${yrs} ${excludeClause}`,
          ],
          requirement: `核心规模、增速与关键口径须直击 Tier 1 一手源（${domain.tier1LabelsZh}），记清年份与地域口径，拒收百家号/搜狐等二手软文。`,
        },
        {
          round: 2,
          tierTarget: 'Tier 1–2（权威研报机构 / 同业上市财报）',
          goal: '行业标杆对比与量化实绩（竞品/成本/提效）',
          queries: [
            `${topic} (${t2SiteClause}) 市场份额 OR 对比 OR 基准 ${yrs}`,
            `${topic} 上市公司年报 OR 招股书 成本 提效 实测 ${yrs} ${excludeClause}`,
          ],
          requirement: '收集同单位、同地域口径竞品基准；若发现媒体转引某机构报告，须继续顺藤摸瓜核对原官网链接或标明转引。',
        },
        {
          round: 3,
          tierTarget: 'Tier 1–2（最新进展 / 政策风险 / 预测区间）',
          goal: '最新进展、落地瓶颈与反方风险（避免一边倒）',
          queries: [
            `${topic} 痛点 OR 瓶颈 OR 风险 OR 预测 ${yr} ${yr + 1} ${excludeClause}`,
            `${topic} (${t1SiteClause}) 路线图 OR 政策 OR 标准 ${yr}`,
          ],
          requirement: '预测性数字须标记 claimType:"forecast" 并在画面注明“预计/E”；多机构口径分歧须如实展示区间；无确凿数字一律改定性图示。',
        },
      ]

  return {
    domain: {
      id: domain.id,
      name: langEn ? domain.nameEn : domain.nameZh,
      tier1Domains: t1List,
      tier2Domains: t2List,
      excludedDomains: excludeList,
      tier1Summary: langEn ? domain.tier1LabelsEn : domain.tier1LabelsZh,
    },
    rounds,
  }
}

/**
 * 校验并规范化外部传入的 `evidence[]` 证据账本（支持 Mode B 零资料与 Mode C 混合资料）。
 * @param {Array<object>} rawEvidence
 * @param {object} [options]
 * @returns {Array<object>}
 */
export function normalizeEvidenceLedger(rawEvidence, options = {}) {
  if (rawEvidence === undefined || rawEvidence === null) return []
  if (!Array.isArray(rawEvidence)) {
    throw new Error('dsh-ppt：evidence 必须是证据条目数组')
  }
  if (rawEvidence.length > MAX_EVIDENCE_ITEMS) {
    throw new Error(`dsh-ppt：evidence 最多支持 ${MAX_EVIDENCE_ITEMS} 条证据`)
  }
  const seen = new Set()
  const out = []
  for (let i = 0; i < rawEvidence.length; i += 1) {
    const item = rawEvidence[i]
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`dsh-ppt：evidence[${i}] 必须是对象`)
    }
    const rawId = cleanText(item.id || `E${i + 1}`, 24).toUpperCase()
    if (!/^[A-Z][A-Z0-9_-]{0,23}$/.test(rawId)) {
      throw new Error(`dsh-ppt：evidence[${i}].id 无效（请使用如 E1、E2 格式）：${rawId}`)
    }
    if (seen.has(rawId)) {
      throw new Error(`dsh-ppt：evidence 存在重复编号 ${rawId}`)
    }
    seen.add(rawId)

    const rawOriginToken = normalizeOriginToken(item.origin)
    if (item.origin !== undefined && item.origin !== null && item.origin !== '' && !rawOriginToken && (item.source || item.publisher)) {
      throw new Error(`dsh-ppt：evidence ${rawId} 的 origin 仅支持 local-file / web-research`)
    }

    const claim = cleanText(item.claim ?? item.fact ?? item.summary, 320)
    // Backwards compatibility: only fall back to item.origin as publisher name if it is NOT a reserved origin keyword
    const fallbackOriginSource = rawOriginToken ? '' : item.origin
    const source = cleanText(item.source ?? item.publisher ?? fallbackOriginSource, 160)
    if (!claim) {
      throw new Error(`dsh-ppt：evidence ${rawId} 缺少事实描述 claim`)
    }
    if (!source) {
      throw new Error(`dsh-ppt：evidence ${rawId} 缺少一手出处 source`)
    }
    const date = cleanText(item.date ?? item.year ?? item.period, 40)
    const scope = cleanText(item.scope ?? item.region, 80)
    const url = item.url ? sanitizeHttpUrl(item.url) : ''
    const rawConf = cleanText(item.confidence || 'verified', 24).toLowerCase()
    if (!CONFIDENCE_SET.has(rawConf)) {
      throw new Error(`dsh-ppt：evidence ${rawId} 的 confidence 仅支持 verified / estimated / conflicting / unverified`)
    }
    const explicitTier = normalizeTierToken(item.tier)
    const rawClaimType = cleanText(item.claimType ?? item.kind, 24).toLowerCase()
    if (rawClaimType && !CLAIM_TYPE_SET.has(rawClaimType)) {
      throw new Error(`dsh-ppt：evidence ${rawId} 的 claimType 仅支持 actual / forecast / policy / benchmark`)
    }
    const note = cleanText(item.note ?? item.caveat, 240)

    const auth = classifySourceAuthority({
      source,
      url,
      origin: rawOriginToken || undefined,
      tier: explicitTier,
    }, options)

    const finalOrigin = rawOriginToken || auth.origin
    const finalTier = explicitTier ?? (auth.tier !== undefined && (finalOrigin === 'web-research' || auth.isBlockedDomain) ? auth.tier : undefined)

    out.push({
      id: rawId,
      claim,
      source,
      ...(date ? { date } : {}),
      ...(scope ? { scope } : {}),
      ...(url ? { url } : {}),
      confidence: rawConf,
      ...(finalOrigin ? { origin: finalOrigin } : {}),
      ...(finalTier !== undefined ? { tier: finalTier } : {}),
      ...(rawClaimType ? { claimType: rawClaimType } : {}),
      ...(note ? { note } : {}),
    })
  }
  return out
}

/**
 * 合并本地资料证据与外部权威检索证据，自动顺延外部证据编号（避免 ID 冲突），并返回映射表。
 */
export function mergeHybridEvidence(localEvidence = [], externalEvidence = [], options = {}) {
  const localNorm = normalizeEvidenceLedger(localEvidence.map((e) => ({ ...e, origin: e.origin || 'local-file' })), options)
  const usedIds = new Set(localNorm.map((e) => e.id))
  let maxNum = 0
  for (const id of usedIds) {
    const m = /^E(\d+)$/.exec(id)
    if (m) maxNum = Math.max(maxNum, Number(m[1]))
  }
  const remappedIds = {}
  const extRaw = Array.isArray(externalEvidence) ? externalEvidence : []
  const extPrepared = extRaw.map((item) => {
    const origId = cleanText(item?.id || '', 24).toUpperCase()
    let nextId = origId
    if (!nextId || usedIds.has(nextId)) {
      maxNum += 1
      nextId = `E${maxNum}`
    } else {
      const m = /^E(\d+)$/.exec(nextId)
      if (m) maxNum = Math.max(maxNum, Number(m[1]))
    }
    usedIds.add(nextId)
    if (origId && origId !== nextId) remappedIds[origId] = nextId
    return {
      ...item,
      id: nextId,
      origin: item?.origin || 'web-research',
    }
  })
  const extNorm = normalizeEvidenceLedger(extPrepared, options)
  return {
    evidence: [...localNorm, ...extNorm],
    localCount: localNorm.length,
    externalCount: extNorm.length,
    remappedIds,
    nextEvidenceId: `E${maxNum + 1}`,
  }
}

/**
 * 提取单页显式 `evidenceIds` 与正文内联 `[E1]` 引用编号（去重保序）。
 */
export function extractSlideEvidenceRefs(slide) {
  if (!slide || typeof slide !== 'object') return []
  const refs = []
  const seen = new Set()
  const add = (id) => {
    const norm = String(id ?? '').trim().toUpperCase()
    if (!norm || seen.has(norm)) return
    seen.add(norm)
    refs.push(norm)
  }
  if (Array.isArray(slide.evidenceIds)) {
    for (const id of slide.evidenceIds) add(id)
  }
  const scanText = (val) => {
    if (typeof val !== 'string' || !val.includes('[')) return
    for (const m of val.matchAll(INLINE_REF_RE)) {
      add(m[1])
    }
  }
  scanText(slide.title)
  scanText(slide.subtitle)
  scanText(slide.takeaway)
  scanText(slide.source)
  scanText(slide.text)
  if (Array.isArray(slide.bullets)) slide.bullets.forEach(scanText)
  if (Array.isArray(slide.items)) {
    for (const it of slide.items) {
      if (!it || typeof it !== 'object') continue
      scanText(it.tag); scanText(it.title); scanText(it.value); scanText(it.delta); scanText(it.text)
      if (Array.isArray(it.bullets)) it.bullets.forEach(scanText)
    }
  }
  if (Array.isArray(slide.rows)) {
    for (const row of slide.rows) {
      if (Array.isArray(row)) row.forEach(scanText)
    }
  }
  if (slide.chart?.caption) scanText(slide.chart.caption)
  return refs
}

function originShortTag(e, langEn) {
  if (e.origin === 'local-file') return langEn ? 'Internal' : '内部'
  if (e.origin === 'web-research') {
    const t = e.tier ? `T${e.tier}` : ''
    return langEn ? `Ext${t ? '·' + t : ''}` : `外源${t}`
  }
  return ''
}

function formatCompactEvidenceSource(entries, langEn) {
  const hasMixedOrigins = entries.some((e) => e.origin === 'local-file') && entries.some((e) => e.origin === 'web-research')
  const parts = entries.slice(0, 2).map((e) => {
    const shortSrc = trimCellByWidth(e.source, 15)
    const metaBits = []
    if (e.date) metaBits.push(e.date)
    if (hasMixedOrigins || e.tier) {
      const tag = originShortTag(e, langEn)
      if (tag) metaBits.push(tag)
    }
    const metaStr = metaBits.length ? ` (${metaBits.join('·')})` : ''
    return `${shortSrc}${metaStr} [${e.id}]`
  })
  const suffix = entries.length > 2 ? (langEn ? ` +${entries.length - 2} more` : ` 等 ${entries.length} 项`) : ''
  return parts.join(langEn ? '; ' : '；') + suffix
}

function compareEvidenceId(a, b) {
  const ma = /^([A-Z]+)(\d+)$/.exec(String(a?.id || ''))
  const mb = /^([A-Z]+)(\d+)$/.exec(String(b?.id || ''))
  if (ma && mb && ma[1] === mb[1]) return Number(ma[2]) - Number(mb[2])
  return String(a?.id || '').localeCompare(String(b?.id || ''))
}

function confidenceLabel(conf, langEn) {
  const mapZh = { verified: '已核验', estimated: '口径估算', conflicting: '存在口径差异', unverified: '待核实' }
  const mapEn = { verified: 'Verified', estimated: 'Estimated', conflicting: 'Conflicting', unverified: 'Unverified' }
  return (langEn ? mapEn[conf] : mapZh[conf]) || conf
}

function formatNotesProvenanceBlock(entries, langEn) {
  const header = langEn ? '[Evidence Provenance]' : '[证据溯源]'
  const lines = entries.map((e) => {
    const originTag = originShortTag(e, langEn)
    const claimKind = e.claimType === 'forecast' ? (langEn ? 'Forecast' : '预测口径') : (e.claimType === 'policy' ? (langEn ? 'Policy' : '政策口径') : '')
    const meta = [originTag, e.source, e.date, e.scope, claimKind, confidenceLabel(e.confidence, langEn)].filter(Boolean).join(' · ')
    const urlPart = e.url ? ` | ${e.url}` : ''
    const notePart = e.note ? ` (${e.note})` : ''
    return `- [${e.id}] ${e.claim} — ${meta}${notePart}${urlPart}`
  })
  return `${header}\n${lines.join('\n')}`
}

/**
 * 将核验后的证据账本绑定至幻灯片：
 * - 自动为引用 `[E#]` / `evidenceIds` 的页面注入干净的 `slide.source` 脚注；
 * - 将完整出处、统计口径、内部/外源 Tier 级别、核验状态与原始 URL 写入演讲备注 `notes`；
 * - 若 `evidenceAppendix: true`，在封底前自动插入「数据来源与事实核验清单」三线表附录页（混源时自动区隔内部资料与权威外源）。
 */
export function applyEvidenceLedgerToSlides(slides, ledger, options = {}) {
  const list = Array.isArray(slides) ? slides : []
  const items = Array.isArray(ledger) ? ledger : []
  if (list.length === 0 || items.length === 0) {
    return { slides: list, citedIds: [], appendixAdded: false }
  }
  const langEn = String(options.lang || 'zh').toLowerCase() === 'en'
  const byId = new Map(items.map((e) => [e.id, e]))
  const citedOrder = []
  const citedSet = new Set()

  const enriched = list.map((rawSlide) => {
    if (!rawSlide || typeof rawSlide !== 'object') return rawSlide
    const refs = extractSlideEvidenceRefs(rawSlide)
    const matched = refs.map((id) => byId.get(id)).filter(Boolean)
    if (matched.length === 0) return rawSlide

    for (const e of matched) {
      if (!citedSet.has(e.id)) {
        citedSet.add(e.id)
        citedOrder.push(e.id)
      }
    }

    const next = { ...rawSlide }
    const existingSource = String(next.source ?? '').trim()
    if (!existingSource || VAGUE_SOURCE_RE.test(existingSource)) {
      next.source = formatCompactEvidenceSource(matched, langEn)
    }

    const existingNotes = String(next.notes ?? '').trim()
    const marker = langEn ? '[Evidence Provenance]' : '[证据溯源]'
    if (!existingNotes.includes(marker)) {
      const provBlock = formatNotesProvenanceBlock(matched, langEn)
      next.notes = existingNotes ? `${existingNotes}\n\n${provBlock}` : provBlock
    }
    return next
  })

  let appendixAdded = false
  if (options.evidenceAppendix === true) {
    const rawAppendixEntries = citedOrder.length > 0
      ? citedOrder.map((id) => byId.get(id)).filter(Boolean)
      : items
    const appendixEntries = [...rawAppendixEntries].sort(compareEvidenceId)
    const maxRows = 6
    const localCount = appendixEntries.filter((e) => e.origin === 'local-file').length
    const externalCount = appendixEntries.filter((e) => e.origin === 'web-research').length
    const isHybrid = localCount > 0 && externalCount > 0

    const shortStatus = (e) => {
      if (isHybrid) {
        if (e.origin === 'local-file') return langEn ? 'Internal' : '内部资料'
        const t = e.tier ? `T${e.tier}` : 'OK'
        return langEn ? `Ext·${t}` : `外源·${t}`
      }
      if (langEn) return confidenceLabel(e.confidence, true)
      const compactZh = { verified: '已核验', estimated: '口径估算', conflicting: '口径差异', unverified: '待核实' }
      return compactZh[e.confidence] || e.confidence
    }

    const rows = [
      langEn
        ? ['ID', 'Key Verified Fact', 'Primary Source & Year', isHybrid ? 'Origin' : 'Status']
        : ['编号', '核心核验事实', '一手出处与年份', isHybrid ? '来源类别' : '核验状态'],
      ...appendixEntries.slice(0, maxRows).map((e) => {
        const datePart = e.date ? ` (${e.date})` : ''
        const srcBudget = Math.max(10, 22.5 - estimateTextWidth(datePart))
        const srcWithDate = `${trimCellByWidth(e.source, srcBudget)}${datePart}`
        return [
          trimCellByWidth(e.id, 6),
          trimCellByWidth(e.claim, 21.5),
          srcWithDate,
          trimCellByWidth(shortStatus(e), 6.4),
        ]
      }),
    ]
    const verifiedCount = appendixEntries.filter((e) => e.confidence === 'verified').length
    const allVerified = verifiedCount === appendixEntries.length
    const shownCount = Math.min(maxRows, appendixEntries.length)
    const appendixTitle = isHybrid
      ? (langEn
          ? `Hybrid Evidence Ledger: ${localCount} Internal + ${externalCount} External Sources`
          : `全篇双轨溯源清单：内部资料 ${localCount} 项 × 权威外源 ${externalCount} 项`)
      : (langEn
          ? (allVerified
              ? `All ${appendixEntries.length} Core Claims Verified Against Primary Sources`
              : `Evidence Ledger: ${verifiedCount}/${appendixEntries.length} Core Claims Verified`)
          : (allVerified
              ? `全篇 ${appendixEntries.length} 项核心论据均已完成一手出处核验`
              : `全篇 ${appendixEntries.length} 项核心论据溯源清单（已核验 ${verifiedCount} 项）`))

    const appendixSlide = {
      layout: 'table',
      tableStyle: 'booktabs',
      kicker: langEn ? 'APPENDIX · SOURCES' : '附录 · 事实溯源',
      title: appendixTitle,
      rows,
      takeaway: langEn
        ? `${shownCount < appendixEntries.length ? `Showing ${shownCount} of ${appendixEntries.length}` : `All ${appendixEntries.length}`} ledger entries carry provenance metadata; full claims and URLs are preserved in speaker notes and handout.`
        : `${shownCount < appendixEntries.length ? `表内列出 ${shownCount}/${appendixEntries.length} 条` : `共列出全部 ${appendixEntries.length} 条`}核心证据，完整原文链接、口径说明与备注已同步保存在演讲备注与讲义中。`,
      notes: formatNotesProvenanceBlock(appendixEntries, langEn),
    }
    const lastIdx = enriched.length - 1
    if (lastIdx >= 0 && enriched[lastIdx]?.layout === 'closing') {
      enriched.splice(lastIdx, 0, appendixSlide)
    } else {
      enriched.push(appendixSlide)
    }
    appendixAdded = true
  }

  return { slides: enriched, citedIds: citedOrder, appendixAdded }
}

function slideHasNumericClaims(slide) {
  const parts = [
    slide?.title,
    ...(Array.isArray(slide?.bullets) ? slide.bullets : []),
    ...(Array.isArray(slide?.items) ? slide.items.flatMap((it) => [it?.value, it?.delta, it?.before, it?.after, it?.text]) : []),
    ...(Array.isArray(slide?.rows) ? slide.rows.slice(1).flat() : []),
  ]
  if (slide?.chart?.series?.length) return true
  const text = parts.filter((v) => v !== undefined && v !== null).map((v) => stripInlineMarkdown(String(v))).join(' ')
  return /\d+(?:\.\d+)?\s*(?:%|％|亿|万|M|B|GWh|GW|TB|ms|倍|x|元|美元|\$|¥)/i.test(text)
}

function visibleSlideContext(slide) {
  const rawNotes = String(slide?.notes || '')
  const authorNotes = rawNotes.split(/\[(?:证据溯源|Evidence Provenance)\]/)[0] || ''
  const itemText = Array.isArray(slide?.items)
    ? slide.items.flatMap((it) => [it?.tag, it?.title, it?.value, it?.delta, it?.text]).filter(Boolean).join(' ')
    : ''
  const bulletText = Array.isArray(slide?.bullets) ? slide.bullets.join(' ') : ''
  return `${slide?.title || ''} ${slide?.subtitle || ''} ${slide?.takeaway || ''} ${slide?.source || ''} ${itemText} ${bulletText} ${authorNotes}`
}

/**
 * SLOP-13 事实出处与权威信源静态门禁（100% 确定性、零误报）。
 * 1. 拦截悬空 `[E99]` 引用；
 * 2. 拦截将 `unverified` / `conflicting` 证据当作无说明定论展示；
 * 3. 拦截「数据来源：网络整理 / 公开资料」等空洞占位假出处；
 * 4. 调研模式下拦截无出处且未绑定 `[E#]` 的量化数据页；
 * 5. v0.35 权威信源深度审计：
 *    - `low-authority-source`：把 T3 噪声/营销号/黑名单站点标成 `verified` 且未加口径说明；
 *    - `secondary-relay-source`：名义 T1/T2 权威机构但实际 URL 为自媒体/资讯站二手转引；
 *    - `unmarked-forecast-claim`：`claimType: 'forecast'` 预测数据上屏却未标注“预计/预测/E/Forecast”；
 *    - `missing-external-date` / `stale-evidence-date`：外部权威数据缺失年份或基准过旧（≥4年前且非历史回顾）。
 */
export function auditEvidenceAndSourcing(manifest) {
  const issues = []
  const slides = Array.isArray(manifest?.slides) ? manifest.slides : []
  if (slides.length === 0) return issues

  const ledger = Array.isArray(manifest?.evidence) ? manifest.evidence : []
  const hasLedger = ledger.length > 0
  const byId = new Map(ledger.map((e) => [String(e?.id ?? '').toUpperCase(), e]))
  const brandKit = manifest?.brandKit || {}
  const authOpts = {
    preferredSources: brandKit.preferredSources,
    blockedDomains: brandKit.blockedDomains,
  }
  const currentYear = new Date().getFullYear()

  const push = (index, code, message, suggestion) => {
    issues.push({
      slide: index + 1,
      slideId: slides[index]?.id,
      severity: 'warning',
      code,
      message,
      suggestion,
    })
  }

  slides.forEach((slide, i) => {
    if (!slide || typeof slide !== 'object') return
    const lay = slide.layout || 'bullets'
    const isFraming = ['cover', 'section', 'closing', 'agenda', 'quote'].includes(lay)
    const rawSource = String(slide.source ?? '').trim()

    // 1. 拦截空洞假出处
    if (rawSource && VAGUE_SOURCE_RE.test(rawSource)) {
      push(
        i,
        'vague-placeholder-source',
        `来源标注「${rawSource}」属于空洞占位词，无法追溯真实发布方与年份（SLOP-13）`,
        '请替换为具体机构、报告名与年份（如「IEA Global EV Outlook 2025」），或标注为「内部口径估算」',
      )
    }

    // 2. 检查 `[E#]` / `evidenceIds` 悬空引用、未核验/冲突状态、T3 权威度与二手转引
    const refs = extractSlideEvidenceRefs(slide)
    if (refs.length > 0) {
      const missing = refs.filter((id) => !byId.has(id))
      if (missing.length > 0) {
        push(
          i,
          'dangling-evidence-ref',
          `页面引用了证据账本中不存在的编号 ${missing.join('、')}（SLOP-13）`,
          '请在 evidence[] 中补齐对应核验条目与原始出处，或移除悬空引用编号',
        )
      }

      const matchedEntries = refs.map((id) => byId.get(id)).filter(Boolean)
      const caveatContext = visibleSlideContext(slide)

      const risky = matchedEntries.filter((e) => e.confidence === 'unverified' || e.confidence === 'conflicting')
      if (risky.length > 0) {
        const hasCaveat = /待核实|未核实|冲突|差异|区间|口径|估算|约\s*\d|caveat|conflict|unverified|range|estimate|approx/i.test(caveatContext)
        if (!hasCaveat) {
          push(
            i,
            'unverified-evidence-claim',
            `页面引用了标记为 ${risky.map((e) => `${e.id}(${e.confidence})`).join('、')} 的证据，但未在页面中说明口径差异或待核实状态（SLOP-13）`,
            '请先完成双源交叉核验，或在页面 takeaway / subtitle / 正文中明确标注数据区间与核验口径',
          )
        }
      }

      // 2B. 代码级权威信源分级 & 二手转引审计
      const relayEntries = []
      const lowAuthEntries = []
      const unmarkedForecasts = []
      const missingDateEntries = []
      const staleEntries = []

      for (const e of matchedEntries) {
        const auth = classifySourceAuthority(e, authOpts)
        if (auth.isSecondaryRelay) {
          const relayAcknowledged = /转引|转述|媒体|via\b|cited\s+by|secondary|relay/i.test(`${e.source} ${e.note || ''} ${caveatContext}`)
          if (!relayAcknowledged) relayEntries.push(`${e.id}(${auth.matchedDomain || 'T3'})`)
        } else if ((auth.tier === 3 || auth.isBlockedDomain) && e.confidence === 'verified') {
          const hasCaveat = /估算|参考|媒体|二手|转引|待核实|仅供参考|estimate|media|secondary|blog|approx/i.test(`${e.note || ''} ${caveatContext}`)
          if (!hasCaveat || auth.isBlockedDomain) {
            lowAuthEntries.push(`${e.id}(${auth.matchedDomain || 'Tier 3'})`)
          }
        }

        if (e.claimType === 'forecast') {
          const hasForecastLabel = /预计|预测|展望|估算|预期|\b20\d{2}\s*E\b|forecast|projected|projection|outlook|est\.|estimated/i.test(caveatContext)
          if (!hasForecastLabel) unmarkedForecasts.push(e.id)
        }

        if (auth.origin === 'web-research' && e.confidence === 'verified' && !e.date) {
          missingDateEntries.push(e.id)
        } else if (auth.origin === 'web-research' && e.date && (e.claimType === 'benchmark' || QUANT_LAYOUTS.has(lay))) {
          const ym = /\b(19\d{2}|20\d{2})\b/.exec(e.date)
          const year = ym ? Number(ym[1]) : NaN
          if (Number.isFinite(year) && year <= currentYear - 4) {
            const isHistorical = /历史|演变|历程|基线|回溯|十年|history|historical|evolution|since\s+\d{4}|baseline/i.test(`${caveatContext} ${e.note || ''}`)
            if (!isHistorical) staleEntries.push(`${e.id}(${year})`)
          }
        }
      }

      if (relayEntries.length > 0) {
        push(
          i,
          'secondary-relay-source',
          `证据 ${relayEntries.join('、')} 声称权威机构但链接指向自媒体/资讯站二手转引（SLOP-13）`,
          '请顺藤摸瓜核对原始机构官网/PDF 报告链接，或在 source/note 中明确注明「媒体转引」',
        )
      }
      if (lowAuthEntries.length > 0) {
        push(
          i,
          'low-authority-source',
          `证据 ${lowAuthEntries.join('、')} 属于 Tier 3 自媒体/论坛/屏蔽站点，却以已核验定论呈现（SLOP-13）`,
          '请替换为 Tier 1/2 政府公报、上市财报、顶刊或权威研报，或改为 estimated 并在画面说明口径',
        )
      }
      if (unmarkedForecasts.length > 0) {
        push(
          i,
          'unmarked-forecast-claim',
          `证据 ${unmarkedForecasts.join('、')} 属于预测口径（forecast），但画面文案未标注「预计 / 预测 / E」（SLOP-13）`,
          '请在标题、指标或 takeaway 中明确区分预测值与历史实绩（如标注「2028E 预计」）',
        )
      }
      if (missingDateEntries.length > 0) {
        push(
          i,
          'missing-external-date',
          `外部权威证据 ${missingDateEntries.join('、')} 缺少发布年份/统计周期 date（SLOP-13）`,
          '请在 evidence[].date 中补齐准确年份或季度（如 "2026-Q1" / "2025"）以确保时效可追溯',
        )
      }
      if (staleEntries.length > 0) {
        push(
          i,
          'stale-evidence-date',
          `外部基准证据 ${staleEntries.join('、')} 距今已超过 3 年，可能存在数据时效过期（SLOP-13）`,
          `请优先检索 ${currentYear - 1}–${currentYear} 最新年度数据，或在页面中注明为历史基线对比`,
        )
      }
    }

    // 3. 调研模式（存在 evidence[] 账本时）要求所有高密度量化数据页给出真实出处或绑定 [E#]
    if (hasLedger && !isFraming && QUANT_LAYOUTS.has(lay) && slideHasNumericClaims(slide)) {
      const hasBoundSource = refs.length > 0 || (rawSource.length > 0 && !VAGUE_SOURCE_RE.test(rawSource))
      const hasDataModel = Boolean(manifest?.dataModel)
      if (!hasBoundSource && !hasDataModel) {
        push(
          i,
          'unsourced-research-numbers',
          `${lay} 量化数据页未绑定任何已核验证据 [E#] 且缺少有效 source 出处（SLOP-13）`,
          '请从 evidence[] 绑定对应证据编号（如 evidenceIds: ["E1"]）或填写具体出处与口径；若无确凿数据请改用定性版式',
        )
      }
    }
  })

  return issues
}

/**
 * 在演讲讲义 (.handout.md) 末尾追加结构化「事实核验与证据账本」总表。
 */
export function renderEvidenceHandoutSection(manifest, language) {
  const ledger = Array.isArray(manifest?.evidence) ? manifest.evidence : []
  if (ledger.length === 0) return ''
  const en = (language || manifest?.language || 'zh') === 'en'
  const hasOriginOrTier = ledger.some((e) => e.origin || e.tier)
  const lines = [
    '',
    `## ${en ? 'Verified Evidence Ledger & Fact-Check Sources' : '事实核验与证据账本（Evidence Ledger）'}`,
    '',
    hasOriginOrTier
      ? (en
          ? '| ID | Origin / Tier | Verified Claim | Source | Period / Scope | Confidence | URL |'
          : '| 编号 | 来源级别 | 核验事实与数据 | 一手出处 | 时间 / 口径 | 核验状态 | 原文链接 |')
      : (en
          ? '| ID | Verified Claim | Source | Period / Scope | Confidence | URL |'
          : '| 编号 | 核验事实与数据 | 一手出处 | 时间 / 口径 | 核验状态 | 原文链接 |'),
    hasOriginOrTier
      ? '| --- | --- | --- | --- | --- | --- | --- |'
      : '| --- | --- | --- | --- | --- | --- |',
  ]
  for (const e of ledger) {
    const esc = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()
    const periodScope = [e.date, e.scope].filter(Boolean).join(' · ') || '—'
    const link = e.url ? `[link](${e.url})` : '—'
    if (hasOriginOrTier) {
      const tag = originShortTag(e, en) || (e.tier ? `T${e.tier}` : '—')
      lines.push(`| ${esc(e.id)} | ${esc(tag)} | ${esc(e.claim)} | ${esc(e.source)} | ${esc(periodScope)} | ${esc(confidenceLabel(e.confidence, en))} | ${link} |`)
    } else {
      lines.push(`| ${esc(e.id)} | ${esc(e.claim)} | ${esc(e.source)} | ${esc(periodScope)} | ${esc(confidenceLabel(e.confidence, en))} | ${link} |`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

/**
 * Mode C 混合资料包 × 外部权威对标补充策划器：
 * 诊断用户本地 Word / Excel / PDF / 照片已覆盖维度与缺失的外部权威基准（行业规模、竞品财报、政策标准、风险反方），
 * 自动产出带 `site:` 的精准权威检索式与不冲突的顺延编号 `nextEvidenceId`。
 */
export function buildHybridEnrichmentPlan(options = {}) {
  const topic = cleanText(options.topic ?? options.title ?? 'Business Report', 140)
  const instructions = cleanText(options.instructions || '', 400)
  const langEn = String(options.lang || 'zh').toLowerCase() === 'en'
  const localAssets = options.localAssets || {}
  const localEvidence = Array.isArray(options.localEvidence) ? options.localEvidence : []

  const sheets = Array.isArray(localAssets.excelSheets) ? localAssets.excelSheets : []
  const docs = Array.isArray(localAssets.docSections) ? localAssets.docSections : []
  const photos = Array.isArray(localAssets.photos) ? localAssets.photos : []

  const localText = [
    topic,
    instructions,
    ...sheets.map((s) => `${s.sheetName || ''} ${(s.headers || []).join(' ')}`),
    ...docs.map((d) => `${d.heading || ''} ${(d.summaryBullets || []).join(' ')}`),
  ].join(' ')

  const queryPack = buildAuthoritativeQueryPack({
    topic,
    context: localText,
    lang: langEn ? 'en' : 'zh',
    preferredSources: options.preferredSources,
    blockedDomains: options.blockedDomains,
  })

  const hasFinancials = sheets.length > 0 || /营收|收入|毛利|成本|预算|财报|ARR|revenue|cost|margin|budget|kpi/i.test(localText)
  const hasRoadmap = sheets.some((s) => s.recommendedChartKind === 'gantt') || /排期|路线图|里程碑|Q[1-4]|roadmap|timeline|milestone/i.test(localText)
  const hasMarketSize = /TAM|SAM|SOM|市场规模|渗透率|CAGR|market size|penetration/i.test(localText)
  const hasCompetitors = /竞品|对手|友商|市场份额|competitor|peer|benchmark|market share/i.test(localText)
  const hasPolicy = /政策|法规|标准|合规|监管|policy|regulation|standard|compliance/i.test(localText)

  const localCoverage = {
    internalFinancialOrOpsData: hasFinancials,
    internalRoadmap: hasRoadmap,
    internalPhotos: photos.length,
    internalDocSections: docs.length,
    internalSheets: sheets.length,
    localEvidenceCount: localEvidence.length,
  }

  const missingPillars = []
  if (!hasMarketSize) {
    missingPillars.push({
      pillar: 'macro-market-tam',
      priority: 'high',
      title: langEn ? 'Authoritative Industry TAM / CAGR Baseline' : '权威行业市场规模与增速基线（宏观对标）',
      targetTier: 'Tier 1–2',
      recommendedLayout: 'tam / chart-split',
      query: queryPack.rounds[0].queries[0],
    })
  }
  if (!hasCompetitors) {
    missingPillars.push({
      pillar: 'peer-benchmark',
      priority: 'high',
      title: langEn ? 'Listed Peer & Competitive Benchmark' : '头部竞品财报与同口径行业基准对比',
      targetTier: 'Tier 1–2',
      recommendedLayout: 'harvey / dumbbell / comparison',
      query: queryPack.rounds[1].queries[0],
    })
  }
  if (!hasPolicy) {
    missingPillars.push({
      pillar: 'policy-standards',
      priority: 'medium',
      title: langEn ? 'Official Policy, Standards & Compliance Catalysts' : '官方政策文件、行业标准与合规催化节点',
      targetTier: 'Tier 1',
      recommendedLayout: 'process[timeline] / callout',
      query: queryPack.rounds[0].queries[1],
    })
  }
  missingPillars.push({
    pillar: 'risk-counter-evidence',
    priority: 'medium',
    title: langEn ? 'Independent Bottlenecks, Risks & Consensus Range' : '独立第三方瓶颈分析、风险与预测区间',
    targetTier: 'Tier 1–2',
    recommendedLayout: 'comparison[issue-action] / matrix',
    query: queryPack.rounds[2].queries[0],
  })

  let maxNum = 0
  for (const e of localEvidence) {
    const m = /^E(\d+)$/i.exec(String(e?.id || ''))
    if (m) maxNum = Math.max(maxNum, Number(m[1]))
  }
  const nextEvidenceId = `E${maxNum + 1}`

  const lines = langEn
    ? [
        `### Hybrid Enrichment Plan (${queryPack.domain.name})`,
        `- **Local Assets Indexed**: ${sheets.length} Excel/CSV sheet(s), ${docs.length} Word/PDF section(s), ${photos.length} photo(s) → \`E1..E${localEvidence.length}\` (\`origin: "local-file"\`).`,
        `- **Next External Evidence ID**: Start authoritative web evidence from **\`${nextEvidenceId}\`** (\`origin: "web-research"\`, \`tier: 1 | 2\`).`,
        `- **Authoritative Domains**: ${queryPack.domain.tier1Summary}`,
        `- **Suggested External Queries**:`,
        ...missingPillars.map((p, idx) => `  ${idx + 1}. **${p.title}** (${p.targetTier}): \`${p.query}\``),
      ]
    : [
        `### 混合资料权威外源补充计划（领域：${queryPack.domain.name}）`,
        `- **本地资料已编目**：${sheets.length} 张数据表、${docs.length} 组文档章节、${photos.length} 张照片 → 已绑定 \`E1..E${localEvidence.length}\`（\`origin: "local-file"\`）。`,
        `- **外部权威顺延编号**：搜索核验后的外部权威数据请从 **\`${nextEvidenceId}\`** 开始编号（\`origin: "web-research"\`, \`tier: 1 | 2\`），零冲突双轨溯源。`,
        `- **推荐一手权威源**：${queryPack.domain.tier1Summary}`,
        `- **优先补齐的外部权威检索式**：`,
        ...missingPillars.map((p, idx) => `  ${idx + 1}. **${p.title}**（${p.targetTier}）：\`${p.query}\``),
      ]

  return {
    mode: 'hybrid-enrichment',
    domain: queryPack.domain,
    localCoverage,
    missingPillars,
    recommendedQueries: queryPack.rounds,
    nextEvidenceId,
    mergeContract: langEn
      ? `Pass local slides/files plus external verified evidence[] (starting at ${nextEvidenceId}, origin:"web-research", tier:1|2) into ppt_create or ppt_from_office({ evidence: [...] }).`
      : `将核验后的外部权威 evidence[]（从 ${nextEvidenceId} 起编，标注 origin:"web-research" 与 tier:1|2）直接传入 ppt_create 或 ppt_from_office({ evidence: [...] })，即可与本地资料无缝双轨融合。`,
    planMarkdown: lines.join('\n'),
  }
}

/**
 * 零资料调研策划器：给定选题（与可选已搜集的 evidence[] 账本），输出：
 * 1. 最佳匹配的标杆范本（20 套内置 + 工作区已吸收）与配色骨架；
 * 2. 按 8 大专业领域自动生成的 3 轮权威 `site:` 定向检索清单（含排除营销号指令）；
 * 3. 逐页分镜策划表（Storyboard）与证据绑定缺口诊断；
 * 4. 可直接展示给用户确认的 Markdown 策划方案（`planMarkdown`）。
 */
export function buildResearchPlan(options = {}) {
  const topic = cleanText(options.topic ?? options.title, 160)
  if (!topic) {
    throw new Error('dsh-ppt：buildResearchPlan 需要提供选题 topic')
  }
  const langEn = String(options.lang || 'zh').toLowerCase() === 'en'
  const workspaceExemplars = options.workspaceExemplars || {}
  const explicitId = cleanText(options.exemplarId || options.exemplar, 64)
  let exemplar = null
  if (explicitId && explicitId.toLowerCase() !== 'auto') {
    exemplar = resolveExemplar(explicitId, workspaceExemplars)
  }
  if (!exemplar) {
    exemplar = matchBestExemplar({
      title: topic,
      content: String(options.context || options.audience || ''),
      persona: options.persona || '',
    }, workspaceExemplars) || CURATED_EXEMPLARS['mckinsey-strategy']
  }

  const evidence = normalizeEvidenceLedger(options.evidence || [], {
    preferredSources: options.preferredSources,
    blockedDomains: options.blockedDomains,
  })
  const verified = evidence.filter((e) => e.confidence === 'verified')
  const estimated = evidence.filter((e) => e.confidence === 'estimated')
  const conflicting = evidence.filter((e) => e.confidence === 'conflicting')
  const unverified = evidence.filter((e) => e.confidence === 'unverified')

  const queryPack = buildAuthoritativeQueryPack({
    topic,
    context: `${options.context || ''} ${options.audience || ''} ${options.persona || ''}`,
    lang: langEn ? 'en' : 'zh',
    preferredSources: options.preferredSources,
    blockedDomains: options.blockedDomains,
  })
  const researchRounds = queryPack.rounds

  let evCursor = 0
  const gaps = []
  const resolvedThemeObj = resolveTheme(exemplar.theme || 'consulting')
  const visualBriefs = []
  const storyboard = (exemplar.slots || []).map((slot) => {
    const needsQuant = QUANT_LAYOUTS.has(slot.layout) || slot.layout === 'table' || slot.layout === 'sankey' || slot.layout === 'map'
    const assigned = []
    if (needsQuant && evidence.length > 0 && evCursor < evidence.length) {
      assigned.push(evidence[evCursor].id)
      evCursor += 1
      if (slot.layout === 'kpi' && evCursor < evidence.length) {
        assigned.push(evidence[evCursor].id)
        evCursor += 1
      }
    }
    const gap = needsQuant && assigned.length === 0
      ? (langEn
          ? `Needs verified primary data for [${slot.layout}]; search first or downgrade to qualitative cards/comparison.`
          : `本页 [${slot.layout}] 尚缺已核验量化证据，请先检索补充或降级为定性卡片/对比页，严禁编造数字`)
      : ''
    if (gap) gaps.push({ slide: slot.index, role: slot.role, layout: slot.layout, gap })

    const wantsVisual = slot.layout === 'cover' || ['image', 'image-left', 'image-right'].includes(slot.layout)
    const visualBrief = wantsVisual
      ? generateVisualBrief({
          layout: slot.layout,
          variant: slot.variant || '',
          title: slot.layout === 'cover' ? topic : `${topic} — ${slot.role}`,
        }, resolvedThemeObj, langEn ? 'en' : 'zh')
      : undefined
    if (visualBrief) {
      visualBriefs.push({ slide: slot.index, role: slot.role, layout: slot.layout, ...visualBrief })
    }

    return {
      slide: slot.index,
      role: slot.role,
      layout: slot.variant ? `${slot.layout}[${slot.variant}]` : slot.layout,
      needsQuantitativeEvidence: needsQuant,
      boundEvidenceIds: assigned,
      titleGuide: langEn ? (slot.exampleTitleEn || slot.fillGuideEn || slot.role) : (slot.exampleTitleZh || slot.fillGuideZh || slot.role),
      fillGuide: langEn ? (slot.fillGuideEn || '') : (slot.fillGuideZh || ''),
      ...(visualBrief ? { visualBrief } : {}),
      ...(gap ? { gap } : {}),
    }
  })

  const lines = langEn
    ? [
        `# Research & Storyboard Plan: ${topic}`,
        '',
        `- **Matched Gold Exemplar**: \`${exemplar.id}\` (${exemplar.enName || exemplar.name}) · Theme: \`${exemplar.theme}\` · Chrome: \`${exemplar.chromeStyle}\``,
        `- **Authoritative Domain Pack**: \`${queryPack.domain.id}\` (${queryPack.domain.name}) · Tier 1 Priorities: ${queryPack.domain.tier1Summary}`,
        `- **Evidence Ledger Status**: ${evidence.length} total (${verified.length} verified, ${estimated.length} estimated, ${conflicting.length} conflicting, ${unverified.length} unverified) · **Data Gaps**: ${gaps.length} quantitative slot(s)`,
        '',
        '## 1. 3-Round Retrieval & Authoritative Fact-Check Checklist',
        ...researchRounds.map((r) => `- **Round ${r.round} — ${r.goal}** (${r.tierTarget}): ${r.requirement} (Queries: \`${r.queries.join('` / `')}\`)`),
        '',
        '## 2. Slide-by-Slide Storyboard Blueprint',
        '| # | Role | Layout | Bound Evidence | Action-Title & Fill Direction |',
        '| --- | --- | --- | --- | --- |',
        ...storyboard.map((s) => `| ${s.slide} | ${s.role} | \`${s.layout}\` | ${s.boundEvidenceIds.length ? s.boundEvidenceIds.map((id) => `[${id}]`).join(' ') : (s.needsQuantitativeEvidence ? '⚠️ Needs data' : 'Qualitative')} | ${s.titleGuide} |`),
        '',
        '## 3. Generation Rule',
        `Once confirmed, call \`ppt_create({ title: ${JSON.stringify(topic)}, exemplar: ${JSON.stringify(exemplar.id)}, alignOrder: true, evidence: [...], evidenceAppendix: true, slides: [...] })\`.`,
      ]
    : [
        `# PPT 调研与分镜策划方案：${topic}`,
        '',
        `- **匹配标杆范本**：\`${exemplar.id}\`（${exemplar.name}）｜推荐主题 \`${exemplar.theme}\` ｜母版骨架 \`${exemplar.chromeStyle}\``,
        `- **权威信源导航**：\`${queryPack.domain.id}\`（${queryPack.domain.name}）｜Tier 1 首选源：${queryPack.domain.tier1Summary}`,
        `- **证据账本现状**：共 ${evidence.length} 条（已核验 ${verified.length} · 估算 ${estimated.length} · 口径差异 ${conflicting.length} · 待核实 ${unverified.length}）｜**待补量化缺口**：${gaps.length} 页`,
        '',
        '## 一、三轮定向检索与交叉核验清单',
        ...researchRounds.map((r) => `- **第 ${r.round} 轮 · ${r.goal}**（${r.tierTarget}）：${r.requirement}（精准检索式：\`${r.queries.join('` / `')}\`）`),
        '',
        '## 二、逐页分镜策划表（Storyboard）',
        '| 页码 | 叙事角色 | 推荐版式 | 绑定证据 | 结论标题方向与填空要点 |',
        '| --- | --- | --- | --- | --- |',
        ...storyboard.map((s) => `| P${s.slide} | ${s.role} | \`${s.layout}\` | ${s.boundEvidenceIds.length ? s.boundEvidenceIds.map((id) => `[${id}]`).join(' ') : (s.needsQuantitativeEvidence ? '⚠️ 待补核验数据' : '定性叙事')} | ${s.titleGuide} |`),
        '',
        '## 三、确认后出稿参数',
        `方案确认并补齐证据账本后，调用 \`ppt_create({ title: ${JSON.stringify(topic)}, exemplar: ${JSON.stringify(exemplar.id)}, alignOrder: true, evidence: [...], evidenceAppendix: true, slides: [...] })\` 生成带完整出处与零告警校验的三件套。`,
      ]

  return {
    ok: true,
    topic,
    domain: queryPack.domain,
    exemplar: {
      id: exemplar.id,
      name: exemplar.name,
      enName: exemplar.enName || exemplar.name,
      theme: exemplar.theme,
      chromeStyle: exemplar.chromeStyle,
      slotCount: exemplar.slots?.length ?? 0,
    },
    evidenceAudit: {
      total: evidence.length,
      verified: verified.length,
      estimated: estimated.length,
      conflicting: conflicting.length,
      unverified: unverified.length,
      gapCount: gaps.length,
      gaps,
    },
    researchRounds,
    storyboard,
    visualBriefs,
    fewShotSlides: getExemplarFewShotSlides(exemplar.id, langEn ? 'en' : 'zh'),
    planMarkdown: lines.join('\n'),
  }
}

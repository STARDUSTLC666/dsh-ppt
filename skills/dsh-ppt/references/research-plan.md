# 深度调研、权威信源导航与事实核验协议（Research & Authority Protocol）

当用户**没有现成文档/数据**（Mode B），或**有本地文件但要求补充行业规模/竞品财报/官方政策等外部权威对标**（Mode C）时，必须按本协议执行。

> **架构红线**：`dsh-ppt` 引擎保持 100% 离线、零网络外联与零新增依赖；实时联网检索与一手网页阅读由**宿主 Agent 的联网搜索/浏览器工具**完成（学术场景可叠加 `dsh-cite`），校验后的结构化证据通过 `evidence[]` 账本交给 `dsh-ppt` 进行代码级信源定级（`classifySourceAuthority`）、`SLOP-13` 深度审计与双轨溯源渲染。

---

## 一、三模路由判定（Tri-Mode Routing：Mode A / Mode B / Mode C）

| 模式 | 触发条件 | 核心动作 |
| --- | --- | --- |
| **Mode A：有资料直出** | 用户已给出完整大纲、文档、表格、参考 `.pptx` 或明确数据且无需外源对标 | 零追问自动定调（`theme: 'auto'` / `exemplar: 'auto'`），直接出稿并复核 |
| **Mode B：零资料深研策划** | 用户只给主题且无资料，或明确要求「先去搜资料、查准数据、出方案再做 PPT」 | 严格走 **4 步闭环**：调 `ppt_templates({ topic })` 拿 8 域权威检索式 → 3 轮定向检索与双源交叉核验 → 展示策划方案确认 → 带 `evidence[]` 成稿过 `SLOP-13` |
| **Mode C：混合资料 × 权威外源** | 用户给了本地 `.docx/.xlsx/.pdf/照片`，并要求结合外部权威行业数据、竞品或政策对标（或复杂编排要求） | 先调 `ppt_from_office({ inspectOnly: true })` 获取素材档案与 `enrichmentPlan`（详见 `references/office-pack.md`）→ 按顺延编号 `nextEvidenceId` 补齐 Tier 1/2 外源 `evidence[]` → 双轨融合出稿 |

---

## 二、v0.35 八大领域权威信源检索引擎（`buildAuthoritativeQueryPack`）

`ppt_templates({ topic })` / CLI `--plan` 与 `ppt_from_office({ inspectOnly: true })` 内置 `detectResearchDomain` + `buildAuthoritativeQueryPack`，自动将选题路由至 **8 大专业领域**，输出自带 **`site:` 权威白名单 + `filetype:pdf` 官方报告指令 + `-site:` 营销号排除清单** 的 3 轮检索式：

| 领域 ID | 覆盖场景 | Tier 1 一手权威域名白名单（示例） |
| --- | --- | --- |
| `gov-macro` | 宏观政务、规划与监管政策 | `gov.cn`, `stats.gov.cn`, `miit.gov.cn`, `ndrc.gov.cn`, `pbc.gov.cn`, `worldbank.org`, `imf.org`, `oecd.org` |
| `finance-filings` | 金融财报、估值与资本市场 | `sec.gov`, `hkexnews.hk`, `cninfo.com.cn`, `sse.com.cn`, `szse.cn`, `bis.org`, `federalreserve.gov` |
| `ai-tech` | AI、大模型、云计算与硬科技 | `caict.ac.cn`, `miit.gov.cn`, `nist.gov`, `arxiv.org`, `ieee.org`, `acm.org`, `nature.com`, `sec.gov` |
| `medical-clinical` | 医疗健康、临床与生物医药 | `who.int`, `pubmed.ncbi.nlm.nih.gov`, `nih.gov`, `fda.gov`, `nhc.gov.cn`, `nmpa.gov.cn`, `nejm.org`, `thelancet.com`, `bmj.com` |
| `energy-climate` | 新能源、电池、双碳与汽车 | `iea.org`, `irena.org`, `nea.gov.cn`, `miit.gov.cn`, `energy.gov`, `ipcc.ch`, `unep.org` |
| `academic-science` | 学术科研、答辩与工程基准 | `nature.com`, `science.org`, `arxiv.org`, `ieee.org`, `acm.org`, `springer.com`, `sciencedirect.com`, `pnas.org` |
| `consumer-retail` | 消费零售、品牌出海与电商 | `stats.gov.cn`, `mofcom.gov.cn`, `census.gov`, `sec.gov`, `hkexnews.hk`, `cninfo.com.cn` |
| `general-business` | 通用商业战略与行业研究 | `stats.gov.cn`, `gov.cn`, `sec.gov`, `hkexnews.hk`, `cninfo.com.cn`, `worldbank.org`, `oecd.org`, `imf.org` |

- **默认排除噪声域名（`NOISE_DOMAINS`，25 站）**：中文自动加 `-site:baijiahao.baidu.com -site:sohu.com -site:zhihu.com -site:163.com`（英文 `-site:medium.com -site:reddit.com -site:quora.com`），审计阶段同步覆盖 `mp.weixin.qq.com`、`toutiao.com`、`csdn.net`、`36kr.com`、`huxiu.com`、`tmtpost.com`、`xiaohongshu.com`、`weibo.com`、`eastmoney.com` 等 25 个自媒体/论坛/二手资讯域名。
- **工作区企业级信源治理（`.dsh-ppt/brand-kit.json`）**：
  通过 `ppt_absorb({ saveBrandKit: true, preferredSources: ["caict.ac.cn", "公司研究院"], blockedDomains: ["example-blog.com"] })` 持久化后：
  - `preferredSources` 自动注入第 1 轮 `site:` 检索优先级，并在 `classifySourceAuthority` 中直接定级为 **Tier 1**；
  - `blockedDomains` 自动追加至 `-site:` 排除列表，且在 `SLOP-13` 中强制按 `low-authority-source` 拦截。

---

## 三、四阶段执行协议（Mode B）

### Step 1：先调策划器定骨架 + 3 轮权威定向检索

1. 调 `ppt_templates({ topic: "<用户主题>", persona: "<可选画像>", lang: "zh" })`（或 CLI `--plan "<主题>"`），获取匹配标杆范本（20 套内置 + 工作区）、领域识别结果、`researchRounds`（含精准 `site:`/`filetype:pdf`/`-site:` 检索词）、`visualBriefs[]` 与逐页分镜蓝图（`storyboard`）。
2. 用宿主 Agent 联网工具执行 **3 轮递进检索**：
   - **Round 1（Tier 1 权威基线）**：部委/统计公报、SEC/港交所/巨潮年报、IEA/IMF/WHO/顶刊与 `filetype:pdf` 白皮书，锁定核心规模、增速、年份与地域口径。
   - **Round 2（Tier 1–2 竞品与实测）**：同单位/同地域口径的头部上市同行财报、权威咨询机构（Gartner/IDC/McKinsey/TrendForce/GGII）基准；遇到媒体转引必须顺藤摸瓜核对原始官网链接。
   - **Round 3（Tier 1–2 最新节点与反方风险）**：最新政策标准、落地瓶颈、失败案例与机构预测分歧；预测数字标 `claimType: "forecast"`。

### Step 2：代码级信源定级（`classifySourceAuthority`）与核验红线

每条拟上屏证据整理为结构化 `evidence[]` 条目（完整字段见下例），引擎通过 `classifySourceAuthority` 自动定级：

- **Tier 1（直接采信）**：`local-file` 本地一手原件、政府/监管/央行/统计局、SEC/港交所/交易所财报、国际组织（WHO/IEA/IMF/World Bank/OECD/IPCC）、顶刊论文与工作区 `preferredSources`。
- **Tier 2（须交叉印证）**：主流咨询/行研机构（Gartner/IDC/McKinsey/BCG/Bain/PwC/Deloitte/TrendForce/GGII/Nielsen/Kantar/BNEF）与权威财经媒体（FT/Reuters/Bloomberg/Economist/财新）。
- **Tier 3（禁止单独作为 `verified` 依据）**：25 个 `NOISE_DOMAINS` 自媒体/论坛/二手资讯站及工作区 `blockedDomains`。
- **四条核验红线**：
  1. **关键大数字双源或一手定位**：严禁混拼全球与中国口径、出货量与装机量；外源必须带准确 `date`（如 `"2026-01"` / `"2025"`）。
  2. **预测与实绩清晰分轨**：前瞻预测必须传 `claimType: "forecast"` 并在画面可见文案标注 `预计 / 预测 / 2028E / Forecast`。
  3. **冲突报区间、缺数改定性**：多方口径差异设为 `confidence: "conflicting"` 并在画面写区间；查无确凿数字一律降级为定性图示（`comparison` / `issue-tree` / `architecture` / `process` / `matrix`），严禁编造小数。
  4. **禁用空洞假出处与二手冒充一手**：禁止「网络整理 / 公开资料 / 综合整理 / Internet」，且禁止名义写权威机构却挂自媒体转引 URL。

### Step 3：向用户展示策划方案并确认（Plan Gate）

检索核验后先输出结构化策划方案待确认（除非用户明确指示直接出稿）：
1. 核心叙事主线、目标受众、推荐标杆范本、主题与页数/时长预算；
2. 核验后的核心证据账本摘要（`E1..En`，含来源级别 `T1/T2`、年份口径与冲突说明）；
3. 逐页分镜策划表（可调 `ppt_templates({ topic, evidence })` 自动诊断缺口并生成 `planMarkdown`）。

### Step 4：带证据账本成稿与 `SLOP-13` 深度门禁交付

```json
{
  "title": "2026 固态电池商业化进展与产业研报",
  "exemplar": "daylight-earnings-research",
  "alignOrder": true,
  "evidenceAppendix": true,
  "evidence": [
    {
      "id": "E1",
      "origin": "web-research",
      "tier": 1,
      "claimType": "actual",
      "claim": "2025 年全球动力电池装车量达 894 GWh，固态路线进入中试放量期",
      "source": "IEA Global EV Outlook",
      "date": "2026-01",
      "scope": "全球动力电池口径",
      "url": "https://www.iea.org/reports/global-ev-outlook-2026",
      "confidence": "verified"
    },
    {
      "id": "E2",
      "origin": "web-research",
      "tier": 2,
      "claimType": "forecast",
      "claim": "预计 2030E 全固态电芯规模化成本区间为 0.55–0.72 元/Wh",
      "source": "TrendForce 集邦咨询研究报告",
      "date": "2026-02",
      "scope": "全固态硫化物路线",
      "url": "https://www.trendforce.com/presscenter/example",
      "confidence": "conflicting",
      "note": "车企官方规划偏乐观（2027），供应链预计平价窗口在 2030E"
    }
  ],
  "slides": [
    {
      "layout": "kpi",
      "kicker": "01 · 产业拐点",
      "title": "全球装车迈过 894 GWh，2030E 全固态平价预计落在 0.55–0.72 元/Wh 区间",
      "evidenceIds": ["E1", "E2"],
      "items": [
        { "tag": "2025 全球装车", "value": "894 GWh", "delta": "IEA 一手年报 [E1]" },
        { "tag": "2030E 预计成本区间", "value": "0.55–0.72 元/Wh", "delta": "多机构口径区间 [E2]" }
      ],
      "takeaway": "实绩数据源自 IEA [E1]；全固态 2030E 成本为预测口径区间 [E2]，需持续跟踪硫化物良率。"
    }
  ]
}
```

---

## 四、`SLOP-13` 事实出处与权威信源静态门禁（9 项确定性审计）

`ppt_check` 与生成前审计自动执行以下 9 项零误报检查：

| 规则代码 | 拦截场景 | 修复动作 |
| --- | --- | --- |
| `dangling-evidence-ref` | 页面引用了 `evidence[]` 中不存在的 `[E99]` | 补齐对应条目或移除悬空引用 |
| `unverified-evidence-claim` | 引用 `unverified`/`conflicting` 证据，但画面未说明口径差异/区间/待核实 | 完成双源核验，或在标题/`takeaway`/正文中显式标注区间与口径 |
| `vague-placeholder-source` | 出现「网络整理 / 公开资料 / 综合整理 / Internet」等空洞假出处 | 替换为真实机构、报告名与年份 |
| `unsourced-research-numbers` | 启用 `evidence[]` 时，量化页（含 `kpi`/`chart`/`treemap`/`gauge` 等）既无 `[E#]` 也无有效 `source` | 绑定 `evidenceIds` 或改用定性版式 |
| `secondary-relay-source` | **v0.35**：`source` 声称 T1/T2 权威机构，但 `url` 实际指向自媒体/资讯站等 T3 二手转引域名 | 追溯原机构官网/PDF 链接，或在 `source`/`note` 中注明「媒体转引」 |
| `low-authority-source` | **v0.35**：属于 Tier 3 噪声站或工作区 `blockedDomains` 却标成 `verified` 且无口径免责 | 替换为 Tier 1/2 一手权威源，或改为 `estimated` 并如实标注 |
| `unmarked-forecast-claim` | **v0.35**：`claimType: 'forecast'` 预测数据上屏，却未在可见文案标注「预计 / 预测 / E / Forecast」 | 在标题、指标或 `takeaway` 中显式区分预测值与历史实绩 |
| `missing-external-date` | **v0.35**：`origin: 'web-research'` 且 `confidence: 'verified'` 的外部权威数据缺少 `date` | 补齐准确年份或季度（如 `"2026-Q1"` / `"2025"`） |
| `stale-evidence-date` | **v0.35**：外部基准数据年份距今 ≥ 4 年，且未注明「历史基线 / 演变回溯」 | 替换为近 2 年最新数据，或在页面中注明历史基线对比 |

> 引擎同时自动完成：单行精简脚注注入（混源时标注 `内部` vs `外源T1/T2`）、演讲备注完整 URL/口径溯源卡、封底前零溢出 4 列 `booktabs` 附录页（`evidenceAppendix: true`）以及讲义 `.handout.md` / `.xlsx` / `.docx` 同步附带完整证据台账。

---

## 五、裸 CLI 用法速查

```bash
# 1. Mode B：按选题自动识别 8 大领域并生成 3 轮权威 site: 检索包 + 分镜策划表
node skills/dsh-ppt/scripts/build-deck.mjs --plan "2026 固态电池商业化进展与产业研报" --lang zh

# 2. Mode C：先体检本地素材包，拿 Material Dossier + 外部权威顺延检索计划
node skills/dsh-ppt/scripts/build-deck.mjs --from-office ./materials --inspect-only --instructions "控制10页，补充行业规模与竞品对标"

# 3. 核验确认后带证据账本 + 附录三线表 + 配套逆向导出出稿
node skills/dsh-ppt/scripts/build-deck.mjs \
  --title "2026 固态电池商业化进展与产业研报" \
  --slides @slides.json \
  --exemplar daylight-earnings-research \
  --align-order \
  --evidence @evidence.json \
  --evidence-appendix \
  --export xlsx,docx,qa-prep,handout \
  --out dist
```

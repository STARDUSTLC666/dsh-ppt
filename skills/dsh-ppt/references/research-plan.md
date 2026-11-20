# 零资料深度调研、事实核验与策划出稿协议（Zero-Material Research-to-Deck）

当用户**没有现成文档、表格或数据**，只给出一个主题并要求「你去搜资料、核对准确性、先策划 PPT 方案再生成」时，必须走本协议的四阶段流水线。

> **架构红线**：`dsh-ppt` 引擎本身保持 100% 离线、零网络外联与零新增依赖；实时联网检索与一手网页阅读由**宿主 Agent 的联网搜索/浏览器工具**完成（学术场景可叠加 `dsh-cite`），校验后的结构化证据通过 `evidence[]` 证据账本交给 `dsh-ppt` 确定性绑定、审计（`SLOP-13`）并渲染成稿。

---

## 一、双模路由判定（Mode A vs Mode B）

| 模式 | 触发条件 | 动作 |
| --- | --- | --- |
| **Mode A：有资料直出** | 用户已提供大纲、文档、Excel/CSV/Word、参考 `.pptx` 或明确数字 | 零追问自动定调（`theme: 'auto'` / `exemplar: 'auto'`），直接出稿并做视觉验收 |
| **Mode B：零资料深研策划** | 用户只给主题且无资料，或明确要求「先搜索资料 / 查准数据 / 出方案再做 PPT」 | 严格执行下方 **4 步闭环**：定向检索 → 双源交叉核验 → 策划方案确认 → 证据溯源成稿 |

---

## 二、四阶段执行协议

### Step 1：先调策划器定骨架 + 三轮定向检索（Research）

1. 先调用 `ppt_templates({ topic: "<用户主题>", persona: "<可选画像>", lang: "zh" })`（或裸 CLI `--plan "<主题>"`），获取：
   - 最佳匹配的 20 套内置标杆范本（`exemplar.id`、`theme`、`chromeStyle`）；
   - 三轮定向检索词建议（`researchRounds`）；
   - 逐页分镜蓝图与需要量化证据的槽位清单（`storyboard`、`evidenceAudit.gaps`）。
2. 使用宿主 Agent 的联网搜索工具按**三轮递进法**采集一手资料（避免只搜一轮把营销软文当权威数据）：
   - **Round 1（权威基线）**：政府公报、监管机构、上市公司年报/财报、IEA/Gartner/IDC/麦肯锡/学术顶刊白皮书，确认核心规模、增速、年份与地域口径。
   - **Round 2（竞品与实测）**：头部厂商官方发布、同口径市场份额、改造前后实测性能/成本数据。
   - **Round 3（最新进展与反方风险）**：2025–2026 最新量产/政策节点、技术瓶颈、失败案例与机构预测分歧（避免一边倒的宣传稿）。

### Step 2：一手优先与双源交叉核验（Fact-Check & Evidence Ledger）

将搜集到的每条拟上屏事实整理为 `evidence[]` 账本，执行**三层信源分级与四条核验红线**：

- **信源可信度分级**：
  - **Tier 1（直接采信）**：政府统计局/部委、央行/SEC/港交所财报、权威国际组织（IEA/IMF/WHO/ISO）、Peer-reviewed 学术期刊、厂商官方技术文档与财报。
  - **Tier 2（须交叉验证）**：主流咨询/研究机构（Gartner/IDC/TrendForce/高工锂电等）报告、权威财经/科技媒体（FT/Reuters/Bloomberg/财新）转引。
  - **Tier 3（禁止单独作为上屏数字依据）**：自媒体公众号、无原始出处二手榜单、匿名论坛贴、营销公关软文。
- **四条核验红线**：
  1. **关键大数字双源核验**：封面/KPI/核心图表中的决定性数字，须由至少 2 个独立可信来源相互印证，或直接定位至 Tier 1 原始发布文件；记清**时间窗口（`date`）与统计口径（`scope`）**，禁止把全球口径与中国口径、出货量与装机量混在同一张图里。
  2. **冲突不拍脑袋**：不同权威机构预测存在明显差异时，将 `confidence` 设为 `"conflicting"`，在 `note` 中写明双方口径，并在幻灯片展示**区间**（如 `18–25 GWh`）而非单点断言。
  3. **查不到就诚实降级**：某页规划为 `kpi` / `chart` 但检索后确实缺乏可靠量化数据时，**严禁凭训练记忆估算编造精确小数**！立刻将该页降级为定性图示（`comparison` / `architecture` / `process` / `matrix` / `cards`），或在 `evidence[]` 中明确标为 `estimated` / `unverified` 并在画面显眼处说明口径。
  4. **禁用空洞假出处**：绝对禁止写 `数据来源：网络整理` / `公开资料` / `综合整理` / `Internet`（会被 `SLOP-13` 自动拦截）。

### Step 3：向用户展示策划方案并确认（Plan Gate）

在搜集并核验完毕后，**先向用户输出结构化策划方案，再生成 PPT**（除非用户已明确指示「搜完直接出稿，不用问我」）：

1. **核心叙事主线与风格定位**：目标听众、推荐标杆范本（如 `daylight-earnings-research` / `mckinsey-strategy`）、主题色与预计页数/演讲时长；
2. **核验后的核心事实账本摘要（`E1..En`）**：列出关键数字、一手出处、年份口径及核验状态（含任何已发现的口径分歧或待补项）；
3. **逐页分镜策划表（Storyboard）**：页码、叙事角色、结论先行标题（Action Title）、拟用版式、绑定证据 `[E#]`（可直接调用 `ppt_templates({ topic, evidence })` 自动生成 `planMarkdown` 并补齐真实标题）。

等待用户确认或微调页数/口径/侧重点后，进入 Step 4。

### Step 4：带证据账本成稿与 SLOP-13 门禁交付（Grounded Build）

调用 `ppt_create`（或 CLI `build-deck.mjs`），一次性传入核验后的 `evidence[]`、`evidenceAppendix: true`、`exemplar`、`alignOrder: true` 与带 `evidenceIds: ["E1", ...]`（或内联 `[E1]`）的 `slides[]`：

```json
{
  "title": "2026 固态电池商业化进展与产业研报",
  "exemplar": "daylight-earnings-research",
  "alignOrder": true,
  "evidenceAppendix": true,
  "evidence": [
    {
      "id": "E1",
      "claim": "2025 年全球半固态电池出货量突破 12 GWh，中国车企装车贡献超 75%",
      "source": "GGII 高工产研《2025 固态电池产业蓝皮书》",
      "date": "2026-01",
      "scope": "全球出货口径",
      "url": "https://example.org/ggii-solid-state-2025",
      "confidence": "verified"
    },
    {
      "id": "E2",
      "claim": "全固态电芯小批量装车验证集中于 2027 年，规模化降本至 <0.6 元/Wh 预计需至 2030 年前后",
      "source": "中汽协 & TrendForce 联合口径对比",
      "date": "2026-02",
      "scope": "全固态硫化物路线",
      "confidence": "conflicting",
      "note": "车企官方规划偏乐观（2027），供应链普遍预计量产平价在 2030 年"
    }
  ],
  "slides": [
    {
      "layout": "kpi",
      "kicker": "01 · 产业拐点",
      "title": "半固态已跨越 12 GWh 商用门槛，全固态平价仍需 3–4 年攻坚",
      "evidenceIds": ["E1", "E2"],
      "items": [
        { "tag": "2025 全球出货", "value": "12+ GWh", "delta": "中国占 >75% [E1]" },
        { "tag": "全固态验证窗口", "value": "2027–2030", "delta": "多机构预测区间 [E2]" }
      ],
      "takeaway": "半固态率先贡献出货增量；全固态在车企与供应链口径间存在 2–3 年量产预期差。"
    }
  ]
}
```

### 引擎自动为你完成的 4 件事（零模型确定性保障）

1. **清爽页面脚注自动注入**：凡带 `evidenceIds` 或内联 `[E#]` 的页面，若未手工写 `source`（或写了空洞占位词），引擎自动生成紧凑规范的 `source` 底栏（如 `GGII 高工产研 (2026-01) [E1]；TrendForce (2026-02) [E2]`），不把冗长 URL 塞进正文污染排版。
2. **演讲者备注完整溯源卡**：自动将完整 `claim`、发布方、年份、口径、核验状态与原文 `url` 写入对应页的 `notes`（在 HTML 按 `P` 进提词台或 PowerPoint 备注区答辩随时可查）。
3. **封底前自动三线表附录页**：开启 `evidenceAppendix: true` 时，自动在 `closing` 页之前生成符合 `booktabs` 规范且零溢出（0 `table-density` 告警）的「核心论据溯源清单」页；若同步输出 `.handout.md`，末尾还会附带含可点击 Markdown 链接的完整《事实核验与证据账本》总表。
4. **`SLOP-13` 事实出处门禁**：`ppt_check` 与生成阶段自动扫描 4 类事实卫生问题：
   - `dangling-evidence-ref`：页面引用了 `evidence[]` 中不存在的 `[E99]`；
   - `unverified-evidence-claim`：页面引用了 `unverified` 或 `conflicting` 证据，但未在页面可见文案中声明「待核实 / 口径差异 / 区间 / 估算」；
   - `vague-placeholder-source`：出现「数据来源：网络整理 / 公开资料 / 综合整理 / Internet」等空洞假出处；
   - `unsourced-research-numbers`：在启用 `evidence[]` 调研账本时，存在含数字的 `kpi / chart / chart-split / waterfall / marimekko / tam / dumbbell / heatmap` 页面既未绑定 `[E#]` 也无有效 `source` 出处。

---

## 三、裸 CLI 用法速查

```bash
# 1. 先按主题生成 3 轮调研清单 + 逐页分镜策划表
node skills/dsh-ppt/scripts/build-deck.mjs --plan "2026 固态电池商业化进展与产业研报" --lang zh

# 2. 检索并核验后，带已核验 evidence.json 重新检查量化槽位缺口
node skills/dsh-ppt/scripts/build-deck.mjs --plan "2026 固态电池商业化进展与产业研报" --evidence @evidence.json --lang zh

# 3. 确认方案后，带证据账本 + 附录三线表 + 讲义一键出稿
node skills/dsh-ppt/scripts/build-deck.mjs \
  --title "2026 固态电池商业化进展与产业研报" \
  --slides @slides.json \
  --exemplar daylight-earnings-research \
  --align-order \
  --evidence @evidence.json \
  --evidence-appendix \
  --handout \
  --out dist
```

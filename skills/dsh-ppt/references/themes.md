# dsh-ppt 大师主题系统、6 套母版骨架与色彩字体规范（24 套内置主题 + 8 套名家预设 + 外源母版吸收）

每套主题在独立 HTML 与可编辑 PPTX 中共用同一套 **18 语义设计 Token（`theme.tokens`）**、**6 套差异化母版骨架（`chromeStyle`）** 与跨平台零缺字字体映射，确保屏幕放映、会议室投影仪与打印件视觉完全一致。

> 预览全部 24 套主题：运行 `ppt_themes { preview: true, outputDir: "dist" }`（或 CLI `--theme-preview --out dist`），生成 `themes-preview.html` 对比页与 24 张 `theme-<id>.svg` 色板卡。

---

## 一、零追问选型决策树（Scenario Auto-Director）

当用户未指定主题时，传 `theme: 'auto'`（或在构建前按以下规则选定具体 ID）。**核心原则：80% 的真实职场、学术与政务场景发生在开灯会议室或教室投影下，默认优先选用明亮高对比度浅底主题，切勿盲目回退暗黑赛博风 `data`！**

1. **商业战略、管理咨询、经营分析、周报复盘、通用模糊汇报** → **`consulting`**（蔚蓝战略）或 **`cobalt-cream`**（钴蓝简报）；**季度财报、投行路演、宏观研究** → **`financial-ft`**（金融时报粉）
2. **政企汇报、国企述职、年度总结、专项行动** → **`exec-jilan`**（霁蓝政务 · 庄重深蓝封面 + 宣纸暖白正文）；党政表彰、盛会总结 → **`exec-palace`**（故宫丹宸 · 丹红描金封面 + 暖白正文）
3. **学术科研、论文汇报、开题/毕业答辩** → **`academic`**（清澄学术 · ETH 青 + 默认学术三线表）；**临床病例、生物医药、医院研讨** → **`medical-clean`**（循证医学蓝绿）
4. **教育培训、课程讲义、知识科普、新人入职工作坊** → **`course-sage`**（知行讲义 · 护眼鼠尾草绿）或 **`soft`**（柔和信号 · 亲和暖米色）
5. **品牌提案、人文策展、画册设计**：
   - 森系文化 / ESG → **`editorial-forest`**（森系社论）
   - 建筑 / 极简画册 → **`cartesian`**（暖石极简）
   - 高奢品牌 / 黑金典藏 → **`luxury-noir`**（黑金典藏）
6. **科技产品发布、AI/SaaS 融资路演、Keynote 演讲**：
   - Apple 极简空间白场 → **`keynote-light`**（苹果极简白 · 无框留白）
   - 现代线性层级暗色（首选）→ **`linear-dark`**（黑曜石路演 · `1px` 微表面层级）
   - 开发者工具 / 精准指标 → **`swiss`**（瑞士脉冲）
   - 前沿 AI / 沉浸数据流 → **`data`**（数据漂移）
   - 奢品高管 / 私享晚宴路演 → **`velvet`**（天鹅绒标准 · 黑金衬线）
   - 高能量活动 / 先锋大字宣言 → **`bold`**（极繁先锋）
7. **用户提供了单位母版或参考 `.pptx`** → 调 `ppt_absorb` 或在 `ppt_create` 传 `referencePptx`（加 `cloneStructure: true` 可同步克隆逐页骨架与母版 `chromeStyle`）！

---

## 二、6 套差异化母版骨架（`CHROME_STYLES`）

打破「14 套主题同一套卡片布局」，可通过 `brand.chromeStyle` 整套切换，或通过单页 `slide.chrome` 局部覆写：

| `chromeStyle` | 默认关联主题 | 几何与页眉页脚签名特征 |
| --- | --- | --- |
| **`consulting-classic`** | `consulting`, `cobalt-cream`, `financial-ft` | `0px` 锐利直角、卡片左侧 `2.5pt` 竖条、右上角章节追踪胶囊、底栏横线 `Key Takeaway:` |
| **`keynote-spatial`** | `keynote-light`, `bold` | **无顶部分割线**、通透空间留白、`16pt` 无描边软圆角卡、浮动 Kicker 胶囊、居中无框摘要 |
| **`editorial-folio`** | `editorial-forest`, `cartesian`, `velvet`, `luxury-noir` | 顶部通栏 `0.5pt` 杂志眉栏（**页码移至右上角**）、`0px` 建筑硬边框、超大衬线序号 |
| **`saas-bento`** | `linear-dark`, `swiss`, `data`, `soft` | `10pt` 圆角微描边卡、首卡强调高亮、现代等宽数据胶囊 |
| **`academic-minimal`** | `academic`, `course-sage`, `medical-clean` | **Beamer Metropolis 通栏着色页眉带**（`1.5pt` 底边强调线）+ **底部三段式学术状态栏** |
| **`gov-ceremonial`** | `exec-jilan`, `exec-palace` | **双线庄重页眉**（`1.5pt` 主色线 + `0.5pt` 辅色金线）、`【01 · 章节】` 绶带标签、宣纸对称卡片 |

---

## 三、24 套内置大师主题速查表（16 浅 + 8 深，全部通过 WCAG AA）

前 18 套保持向后兼容，第 18–23 项新增 6 套世界级标杆演示主题（BCG 翡翠战略、经济学人社论简报、红杉日间创投、Stripe 工程工坊、极光舞台、彭博黑曜终端）：

| ID | 中文名 | English | 明暗 | 画布 `canvas` | 卡片表面 `surface1` | 主文字 `inkPrimary` | 主强调 `accent` | 默认 `chromeStyle` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `swiss` | 瑞士脉冲 | Swiss Pulse | 暗 | `#10151B` | `#161D26` | `#F5F7FA` | `#2F6BFF` | `saas-bento` |
| `velvet` | 天鹅绒标准 | Velvet Standard | 暗 | `#111316` | `#191C21` | `#F4EFE6` | `#C9A84C` | `editorial-folio` |
| `data` | 数据漂移 | Data Drift | 暗 | `#070B14` | `#0D1424` | `#E8F1FF` | `#7C3AED` | `saas-bento` |
| `soft` | 柔和信号 | Soft Signal | 亮 | `#FFF8EC` | `#F6EDE0` | `#3B2F2A` | `#E58A2F` | `saas-bento` |
| `bold` | 极繁大字 | Maximalist Type | 暗 | `#0D0D0D` | `#16161A` | `#FFFFFF` | `#E63946` | `keynote-spatial` |
| **`consulting`** | **蔚蓝战略** | **Strategy Navy** | **亮** | `#FFFFFF` | `#F4F6F9` | `#0F172A` | `#0057B8` | `consulting-classic` |
| **`cobalt-cream`** | **钴蓝简报** | **Blue Professional** | **亮** | `#FDFAE7` | `#F3F1E8` | `#111111` | `#1E2BFA` | `consulting-classic` |
| **`exec-jilan`** | **霁蓝政务** | **Imperial Slate** | **亮\*** | `#F7F6F2` | `#EFECE6` | `#16243E` | `#1A2B4C` | `gov-ceremonial` |
| **`exec-palace`** | **故宫丹宸** | **Palace Vermilion** | **亮\*** | `#F9F6F1` | `#F1ECE3` | `#231916` | `#9E1B1E` | `gov-ceremonial` |
| **`academic`** | **清澄学术** | **ETH & Nature** | **亮** | `#FFFFFF` | `#F5F7FA` | `#111827` | `#006980` | `academic-minimal` |
| **`editorial-forest`** | **森系社论** | **Editorial Forest** | **亮** | `#F4EFE4` | `#EAE2D3` | `#1A1A17` | `#2E4A2A` | `editorial-folio` |
| **`cartesian`** | **暖石极简** | **Cartesian Stone** | **亮** | `#F5F1EB` | `#EAE4DB` | `#1A1A1A` | `#734B2F` | `editorial-folio` |
| **`course-sage`** | **知行讲义** | **Workshop Sage** | **亮** | `#FAFBF9` | `#F0F4F1` | `#182420` | `#0F6E56` | `academic-minimal` |
| **`linear-dark`** | **黑曜石路演** | **Obsidian Keynote** | **暗** | `#090B10` | `#11151F` | `#F3F6FC` | `#5E81F4` | `saas-bento` |
| **`keynote-light`** | **苹果极简白** | **Keynote Spatial Light** | **亮** | `#FFFFFF` | `#F5F5F7` | `#1D1D1F` | `#0066CC` | `keynote-spatial` |
| **`financial-ft`** | **金融时报粉** | **FT Salmon Financial** | **亮** | `#FFF1E5` | `#F6E3D2` | `#1A1817` | `#0D3D56` | `consulting-classic` |
| **`medical-clean`** | **循证医学蓝绿** | **Clinical Evidence Teal** | **亮** | `#F8FAFC` | `#EEF5F7` | `#0F172A` | `#0F766E` | `academic-minimal` |
| **`luxury-noir`** | **黑金典藏** | **Luxury Noir Gold** | **暗** | `#0B0B0D` | `#151519` | `#F5F2EB` | `#D4AF37` | `editorial-folio` |
| **`bcg-emerald`** | **翡翠战略** | **Emerald Strategy** | **亮** | `#FFFFFF` | `#F1F7F4` | `#0D1F18` | `#006B54` | `consulting-classic` |
| **`economist-brief`** | **经济学人简报** | **Economist Crimson** | **亮** | `#FBF9F5` | `#F3EEE6` | `#161616` | `#C8102E` | `editorial-folio` |
| **`venture-daylight`** | **红杉创投简报** | **Venture Memo Light** | **亮** | `#FCFCFA` | `#F4F3EE` | `#141413` | `#155EEF` | `saas-bento` |
| **`stripe-craft`** | **云靛工坊** | **Indigo Craft** | **亮** | `#F8FAFC` | `#EEF2F8` | `#0A2540` | `#533AFD` | `saas-bento` |
| **`aurora-stage`** | **极光发布会** | **Aurora Keynote** | **暗** | `#070C12` | `#0E1621` | `#F0F6FC` | `#10B981` | `keynote-spatial` |
| **`obsidian-amber`** | **黑曜终端** | **Terminal Amber** | **暗** | `#0C0D10` | `#15171D` | `#F4F4F5` | `#F59E0B` | `consulting-classic` |

> **政务汇报反土味铁律（`exec-jilan` & `exec-palace`）**：彻底告别 `#FF0000` 刺眼荧光红满屏底色与 `#FFFF00` 土味黄字！两套东方政务主题均采用 `coverMode: 'inverted-accent'`——仅封面/章节过渡页使用深邃霁蓝（`#1A2B4C`）或沉淀故宫红（`#9E1B1E`）配描金细线镇场，**90% 的正文与数据页回归宣纸暖白浅底（`#F7F6F2` / `#F9F6F1`）**，既符合正式站位又确保会议室投影清晰锐利。

---

## 三、18 语义设计 Token 规范（`theme.tokens`）

引擎内部不再只用 6 个扁平色值，而是为每套主题及每次 `brand` / `.pptx` 吸收自动求解完整的 18 语义 Token：

- **背景与表面层级**：`canvas`（主画布）、`surface1`（一级卡片底衬）、`surface2`（二级嵌套/表头底衬）、`hairline`（`1px` 边框与图表淡网格线，`CR ≈ 1.3:1`，绝不抢戏）。
- **三级墨色阶梯**：`inkPrimary`（主标题与核心数字，`CR ≥ 10:1` AAA）、`inkSecondary`（正文段落，`CR ≥ 7:1` AAA）、`inkMuted`（页眉面包屑、坐标轴刻度、左下角 `Source:` 脚注，`CR ≥ 4.6:1` AA）、`inkOnAccent`（主色实心块上的反白/深色字）。
- **双轨强调色（图形 vs 文字分离）**：`accentPrimary` / `accentSecondary` 用于色柱、徽章底衬、几何分割线（对画布 `CR ≥ 3.2:1`）；`accentText` / `accent2Text` 专用于小字号标签、Kicker 与行内高亮数字（对卡片表面强制 `CR ≥ 4.6:1` AA，彻底解决浅底橙字或暗底深紫字发虚问题）；`accentSoft` 为浅色高亮底衬。
- **语义状态与出版级图表色**：`positive`（正向增长绿）、`negative`（负向警示红）、`warning`（注意琥珀色）；`chartFocal`（图表唯一焦点柱主色）、`chartNeutral`（非焦点对照灰阶柱，践行麦肯锡/经济学人「一主多灰」克制法则）、`chartSeries[6]`（多系列色盲友好高区分度序列）。

---

## 四、跨平台零缺字双语字体规范（HTML ↔ PPTX ↔ LibreOffice）

为杜绝跨操作系统打开 PPTX 或无头 LibreOffice 渲染出现豆腐块（`□□□`）、日文字形误替或 Windows `SimSun`（宋体）大字号发虚锯齿，引擎严格执行分平台原生映射：

| 字体角色 `fontRole` | 适用主题 | Windows (`<a:latin>` / `<a:ea>`) | macOS (`<a:latin>` / `<a:ea>`) | Linux (`<a:latin>` / `<a:ea>`) |
| --- | --- | --- | --- | --- |
| **`sans`**（现代无衬线） | `consulting, swiss, data, soft, bold, exec-jilan, academic, course-sage, linear-dark` | `Segoe UI` / `Microsoft YaHei` | `Helvetica Neue` / `PingFang SC` | `Liberation Sans` / `Noto Sans CJK SC` |
| **`geometric-sans`**（几何数字） | `cobalt-cream` | `Segoe UI` / `Microsoft YaHei` | `Avenir Next` / `PingFang SC` | `Liberation Sans` / `Noto Sans CJK SC` |
| **`editorial-serif`**（仅大标题衬线，正文仍用 Sans） | `velvet, exec-palace, editorial-forest, cartesian` | `Georgia` / `Microsoft YaHei`（Bold，禁用大字号锯齿 `SimSun`） | `Georgia` / `Songti SC` | `Liberation Serif` / `Noto Serif CJK SC` |

- **语言标签纯净性**：`lang: 'en'` 生成的 PPTX 仅写入 `lang="en-US"`（不混入 `zh-CN`）；`lang: 'zh'` 或 `'bilingual'` 写入 `lang="zh-CN"` 锁定简体中文字形。
- **等宽数字对齐**：HTML 的 KPI 大数字、表格数值列与图表标签默认启用 `tabular-nums`，避免数字跳动与列错位。

---

## 五、外源 `.pptx` 风格吸收与自动审美净化（`ppt_absorb`）

当用户提供企业 VI 模板、高校答辩模板或过往优秀 `.pptx` 时：

1. 调用 `ppt_absorb { pptxPath: "template.pptx" }`（或在 `ppt_create` / `ppt_edit` 直接传 `referencePptx: "template.pptx"`，工作台亦支持浏览器直接拖拽 `.pptx`）。
2. 引擎基于 `@office-kit/pptx` 纯本地解析 `ppt/theme/theme1.xml`（`clrScheme` 12 色槽 + `fontScheme` 西文/东亚字体）、母版背景、内嵌 Logo 与版式留白分布，无需联网、无需调用大模型。
3. **`sanitizeAbsorbedTheme()` 自动品味兜底**：
   - 若外部模板母版为高饱和大红/深蓝底（`S > 0.35`），自动将其降级为 `coverMode: 'inverted-accent'`（仅封面深色镇场，内页自动转为柔和浅底），防止全篇红底伤眼。
   - 若外部模板强调色或文字色对比度不足（如白底配 `#FFFF00` 明黄字），自动二分求解亮度并压制荧光饱和度（`S ≤ 0.82`），确保全部 18 个 Token 100% 满足 WCAG AA 可读性标准。

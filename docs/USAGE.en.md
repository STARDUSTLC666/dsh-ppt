# dsh-ppt usage guide

[Overview](../README.en.md) · [Changelog](../CHANGELOG.md) · [Validation](VALIDATION.md)

## Current improvements

- **0.36.0 Physical Slide Lightbox Workbench**: Opening any presentation deck now launches into an illuminated 16:9 **Lightbox** drafting table displaying slide stamps, layout badges, and quality dots, with drag or 1-click `←/→` reordering, inline duplication, and a trailing `+16:9` insert card for 31+ starter archetypes; click any transparency (or toggle **Slide Studio**) to smoothly transition into the 3-pane slide canvas, with refreshed `? Guide` spotlight tour steps and workflow docs while preserving 100% of 0.35.0 features, 13 styles, and 8 fonts.
- **0.35.0 8-Domain Authoritative Research Engine, Mode C Hybrid Office Packs (`inspectOnly`), 4 Executive Diagrams (41 Canonical Layouts + 53 Aliases), Reverse Office Exports, Slide Bank Composer, Lossless i18n & Offline `R`-Key Review Loop**: `deck-evidence.mjs` adds an 8-domain whitelist + 25-site noise blacklist (`site:` + `filetype:pdf` + `-site:` queries), code-level `classifySourceAuthority` (T1/T2/T3), and 5 new `SLOP-13` gates (`secondary-relay-source`, `low-authority-source`, `unmarked-forecast-claim`, `missing-external-date`, `stale-evidence-date`), with workspace `.dsh-ppt/brand-kit.json` `preferredSources` & `blockedDomains`; `deck-office.mjs` adds Mode C `inspectOnly: true` (Material Dossier + `enrichmentPlan` + `nextEvidenceId`), `instructions`, `maxSlides`, `includeSheets`, `photoRoles`, `bindDataModel: true`, and zero-dep PNG/JPEG/WebP header parsing (portrait/team → `focalPoint: 'top'`, app/dashboard screenshots → `mockup`); `deck-charts-exec.mjs` adds **`issue-tree`** (MECE logic tree), **`treemap`** (squarified area map), **`gauge`** (Stephen Few OKR bullet chart), and **`pricing`** (Good/Better/Best tiers) plus on-demand `buildLayoutCss` HTML CSS tree-shaking; zero-dep `deck-export.mjs` (`exports: ['xlsx', 'docx', 'qa-prep', 'memo', 'i18n', ...]`, Workbench downloads for `.xlsx`/`.docx`/`.qa-prep.md`), `deck-compose.mjs` (`.dsh-ppt/slide-bank.json` `saveToBank` + `mergeSources`), `deck-i18n.mjs` (100% layout-lossless `translations` / `bilingualMode`), `reveal: 'step'` + `motionProfile`, and offline HTML `R`-key comment export (`review-feedback.json`) → `ppt_check({ feedbackPath })`.
- **0.34.0 Enterprise Brand Kit Lock (`SLOP-14`), Pure-Node `.pdf` & Multi-Source Pack Ingestion, Multi-Audience Remix & Social Carousel, Live Presenter Power Pack & Workbench Sync**: Adds zero-dependency `deck-brand-kit.mjs` (`.dsh-ppt/brand-kit.json` persistence, HTML/PPTX content-slide confidentiality watermarks, `mandatoryClosing`, `SLOP-14` forbidden-term & palette-drift audit via `ppt_absorb({ saveBrandKit: true })` / `--save-brand-kit` / `--no-brand-kit`) and `deck-remix.mjs` (`exec-5min` / `board-brief` / `sales-pitch` lossless backup-notes remixing + `4:5`/`1:1` printable Social Carousel HTML); upgrades `deck-office.mjs` with zero-dep `FlateDecode`/UTF-16BE `.pdf` extraction and whole-folder / `filePaths[]` multi-source pack fusion with automatic `[E1..En]` Evidence Ledger binding; upgrades `deck-delivery.mjs` with `Ctrl/Cmd+K` jump search (slides + `[E#]` evidence), `D` whiteboard pen, `T` Q&A countdown timer, `A` narrated Auto-Tour, and `.srt`/`.vtt` timed subtitles (also bundled into `dsh-remotion`); syncs the Workbench UI with `map`/`isometric`, `waves`/`isometric-mesh`/`editorial-arcs`, Layout Morph pills, `focalPoint`, `imageBrief`, Evidence Ledger & Revision Diff drawers, Remix actions, `.pdf` uploads, and Carousel/Subtitle downloads.
- **0.33.0 Visual & Map Intelligence (World/China Dotted Maps, 2.5D Isometric Infographics, Procedural Cover Artwork & Smart Visual Briefs)**: Adds zero-dependency `deck-infographics.mjs` expanding native editable layouts to **37+** — Economist-style **World & China Dotted Strategic Maps (`map`: `world` | `china`)** with bilingual hub routing, collision-free tags, and ranked sidebars; **2.5D Isometric Infographics (`isometric`: `stack` | `pillars`)** rendered via native 3-face `<a:custGeom>` prisms in PPTX + `<svg>` in HTML; procedural cover patterns **`waves`**, **`isometric-mesh`**, and **`editorial-arcs`**; **Smart Visual Brief slots (`imageBrief` / `visualBriefs[]`)**, **`image.focalPoint`** smart cropping, and automatic bottom-up dark gradient scrims (`sendShapeToBack`) on **`image[full-bleed]`**.
- **0.32.0 Zero-Material Research-to-Deck Planner, Verified Evidence Ledger & `SLOP-13` Fact-Grounding Gate**: Adds zero-dependency `deck-evidence.mjs` and the Dual-Mode research skill protocol (`skills/dsh-ppt/references/research-plan.md`, keeping strictly 13 registered tools and 100% offline engine execution); `ppt_templates({ topic, evidence })` and CLI `--plan` match the best Gold Exemplar and emit a 3-round retrieval checklist, quantitative gap diagnostics, and user-ready `planMarkdown` storyboard; `ppt_create({ evidence, evidenceAppendix: true })` and CLI `--evidence @file.json --evidence-appendix` bind verified `E1..En` entries into compact single-line `source` footers, full URL/scope speaker notes, a naturally sorted zero-overflow 4-column `booktabs` Sources Appendix slide before `closing`, and `.handout.md` ledger tables; `SLOP-13` intercepts dangling refs, undisclosed `unverified`/`conflicting` claims, vague placeholder sources, and unsourced research numbers with 0 false positives.
- **0.31.0 Exemplar Narrative-Arc Re-sequencing, Evidence-Anchored Action Titles & Zero-LLM Self-Repair Loop**: Upgrades `deck-upgrader.mjs` with `resequenceSlidesToExemplar` (`ppt_create({ alignOrder: true })` / CLI `--align-order` / Workbench toggle) to align scrambled draft slides to the active exemplar's cadence while keeping `section` chapter groupings intact; enhances `synthesizeActionTitle` to synthesize width-safe, verbatim evidence-backed Action Titles and grounded `takeaway` bars across KPI, dumbbell, chart, table, and quadrant slides without hallucinating numbers or mutating `{{metricId}}` bindings; adds pre-commit `selfRepairDeck` (bounded 2-pass `checkManifest` + `SLOP-01..12` check→repair→recheck loop with 0 LLM calls) losslessly fixing overflowing titles, bullet walls, KPI/table overloads, >6-slice pie spaghetti (to horizontal bar), missing chart spotlights/callouts, and low-contrast/saturated canvases before saving.
- **0.30.0 GitHub OSS `.pptx` Distilled Corpus (20 Built-in Exemplars), Few-Shot JSON & `exemplar: "auto"` Routing**: Adds zero-dependency `deck-exemplars-corpus.mjs` distilling **12 top Apache-2.0/MIT/CC-BY-4.0 GitHub `.pptx` benchmarks** (selected from 25 real vetted decks: `mckinsey-evolution`, `luxury-budget-review`, `swiss-bauhaus-workshop`, `dark-stage-investor`, `blueprint-ai-factory`, `warm-brand-story`, `ted-storytelling-keynote`, `msft-enterprise-discovery`, `daylight-earnings-research`, `okr-performance-review`, `quiet-canvas-keynote`, `medical-clinical-course`) alongside the original 8 (**20 built-in exemplars total**); appends bilingual **Few-Shot Gold Slide JSON (`fewShotSlides`)** in `ppt_templates({ exemplarId })`; adds `exemplar: "auto"` semantic routing across `ppt_create`, CLI (`--exemplar auto`), and Workbench; hardens `deck-absorb.mjs` against decorative margin dots, non-concentric ambient circles, generic `PowerPoint Presentation` `dc:title` ID collisions, and platform-locked macOS/Korean fonts.
- **0.29.0 8 Curated Gold Exemplars, Batch `.pptx` Corpus Ingestion & Deterministic Weak-LLM Compensator**: Adds zero-dependency `deck-exemplars.mjs` and `deck-upgrader.mjs` shipping 8 curated exemplars (`mckinsey-strategy`, `sequoia-pitch`, `stripe-product-launch`, `quarterly-exec-review`, `tech-arch-rfc`, `academic-defense`, `enterprise-proposal`, `gov-institutional`) with per-slide slot contracts via `ppt_templates({ exemplarId })` / `--list-exemplars`; upgrades `ppt_absorb` (`saveExemplarAs` / folder path / `corpusDir` / `--ingest-exemplars`) to batch-ingest GitHub/corporate `.pptx` folders into `.dsh-ppt/exemplars.json` while filtering hidden slides (`show="0"`); adds `exemplar` and deterministic `autoUpgrade` (0 extra LLM calls, 100% lossless promotion of buried `code[split]`/`dumbbell`/`radar`/`quadrant`/`heatmap`/`mockup`/`kpi[spotlight]`, `>6`-bullet wall splitting, streak breaking, and `SLOP-01`/`02`/`09` rescue); fixes `cards[bento-hero]` light-theme contrast and `dumbbell` edge-label collisions, and adds the Gold Exemplar selector to Workbench `PptCreateDialog`.
- **0.28.0 Tech/Product Showcase, 4 Pinnacle Analyst Charts & Direct-Manipulation Workbench**: Adds zero-dependency `deck-showcase.mjs` and `deck-charts-pro.mjs`, expanding native editable layouts to **35+**: native vector device mockups (`mockup`: `browser` | `mobile` | `split` with screenshot injection or live UI tiles), 9-language zero-dep syntax-highlighted code terminal (`code`, auto-promoting Markdown ```` ```lang ```` fences into editable Consolas OOXML color runs), Cover Hero Photo Split (`slide.image` on `cover`) & procedural `coverPattern` (`dots` | `grid` | `rings`), plus 4 consulting vector charts — **Magic Quadrant (`quadrant`)**, **Multi-Series Radar (`radar`)**, **McKinsey Dumbbell Slope (`dumbbell` with 1-2-5 nice ticks)**, and **WCAG Auto-Contrast Heatmap (`heatmap`)**; upgrades the Workbench with **HTML5 drag-and-drop slide reordering**, **canvas double-click inline text editing synced to HTML + PPTX**, and 1-click **High-DPI PDF (`.pdf`)** (`kind=pdf`) and **Slide PNG Pack (`.zip`)** (`kind=png-zip`) exports.
- **0.27.0 Aesthetic Studio, 8 Curated Taste Recipes, 61 Native Vector Icons & Benchmark `.pptx` Taste Learning**: Adds zero-dependency `deck-taste.mjs`, `deck-covers.mjs`, and `deck-icons.mjs` shipping 8 Curated Taste Recipes (`mckinsey-partner`, `apple-keynote-dark`, `apple-keynote-light`, `swiss-editorial`, `linear-craft`, `ft-data-journal`, `nature-academic`, `oriental-zen`), 4 poster covers (`keynote-glow`, `editorial-grid`, `architectural`, `split-bleed`), automatic multi-chapter `section[agenda]` trackers, 4 card surface materials (`solid`, `frameless`, `glass`, `editorial-rule`), anti-monotony asymmetric layouts (`kpi[spotlight]`, `cards[bento-hero]`), 61 native vector icons (HTML `<svg>` + editable OOXML `<a:custGeom>` with bilingual auto-matching), publication-grade chart finishing (`spotlight`, `referenceLine`, `showGrowthCallout` with dedicated non-clipping PPTX annotation strips), `optimizeVisualRhythm` + `SLOP-11`/`SLOP-12` checks, and deep 6-signal `.pptx` aesthetic DNA extraction (`styleRecipe`, persisted to `.dsh-ppt/taste-recipes.json` via `saveTasteAs` / `--save-taste`).
- **0.26.0 Direct Office Ingestion, Native Editable Mermaid & Ecosystem Bridges**: Adds zero-dependency `deck-mermaid.mjs` (`layout: 'mermaid'`, aliases `'flowchart'`/`'sequence'`, and automatic ```` ```mermaid ```` Markdown fences) compiling `flowchart` and `sequenceDiagram` into 100% native editable PPTX shapes (`<p:sp>`) and attached `<p:cxnSp>` connectors; adds **`ppt_from_office`** (CLI `--from-office`, Workbench `import-office`) to ingest `.xlsx`/`.csv`/`.tsv` and `.docx` directly with zero new dependencies; adds **`ppt_cite`** (`dsh-cite` verified citations + `References` slide) and **`ppt_remotion`** (`dsh-remotion` 30fps storyboard export); adds **Speaking-Pace Budgeter (`computePaceBudget` / `targetMinutes`)**, **Executive One-Pager (`.onepager.html`)**, Workbench **`? Guide`** 4-step spotlight tour, and 1-click **Load Flagship Demo**.
- **Zero-taste-burden Auto-Director, 6 Chrome Skeletons & Deep `.pptx` Absorption**: `ppt_create` defaults to `theme: "auto"` to match topic, audience, and master chrome skeleton automatically (standalone CLI keeps `data` by default for backward compatibility unless `--theme auto` is passed). `ppt_absorb` and `referencePptx` (with `cloneStructure: true` / `--clone-structure`) resolve OOXML `lumMod`/`tint`/`shade` color modifiers, CJK/Latin fonts, master logos, skeleton geometry (`extractedSkeleton`, `recommendedChrome`), and slide-by-slide layout sequences (`slideSkeleton[]`) locally with WCAG ≥4.5:1 contrast sanitization.
- **24 built-in themes, 6 Master Chrome Skeletons, 29+ canonical layouts & 20 industry blueprints**: 16 daylight-first themes and 8 dark themes mapped to 6 structurally distinct chrome skeletons (`consulting-classic`, `keynote-spatial`, `editorial-folio`, `saas-bento`, `academic-minimal`, `gov-ceremonial`), covering `mermaid`, `marimekko`, `sankey`, `value-chain`, `swot`, native `<m:oMath>` equations, `gantt`, `architecture`, `harvey`, `tam`, `org`, `flywheel`/`funnel` process variants, `tableStyle` (`consulting | booktabs | minimal | banded | harvey`), per-slide `chrome`, `columns`, `takeaway` bars, `source` footnotes, and 13 publication-grade chart kinds including vector `waterfall` bridges.
- **Style Studio & visual workbench**: Switch across 24 themes, 8 Reference Presets, and **6 Master Chrome Skeletons (`brand.chromeStyle`)**, drag-and-drop `.xlsx`/`.csv`/`.docx`/`.pptx` (`≤24 MiB`, parsed in memory with zero host path reads), switch across 29+ slide archetypes (including Mermaid & LaTeX formulas), set **Target Duration (`targetMinutes`)** with live pace diagnostics, compare HTML ↔ PPTX side-by-side, inspect full-width Vision QA before/after diffs (up to 24 slides, 12 lossless actions), and run storyline/action-title coaching (up to 8 findings across 7 audience personas).
- **Artifact integrity & safe delivery bundles**: Every build records HTML/PPTX digests so external Office edits are never silently overwritten; save a copy (`saveAs: true`) when needed. Save workbench edits, then download the **Share bundle ZIP**, **Project bundle ZIP**, **Executive One-Pager (`.onepager.html`)**, or **Remotion Storyboard (`.zip`)** (each file ≤64 MiB, total ≤128 MiB; excludes config, secrets, and unrelated workspace files).

## Capabilities

| Capability | Description |
| --- | --- |
| `ppt_create` tool | Markdown / structured `slides` → `*.html` + `*.pptx` + `*.json`; defaults to `theme: "auto"` and supports `exemplar`, `alignOrder`, `evidence[]`, `mergeSources` multi-deck composer, `exports[]` companions, `motionProfile`, `referencePptx`, `cloneStructure`, and `targetMinutes` |
| `ppt_from_office` tool | Zero-new-dep ingestion of `.xlsx`/`.csv`/`.tsv`/`.docx`/`.pdf`/photo packs; supports Mode C `inspectOnly: true` (Material Dossier + `enrichmentPlan`), `instructions`, `maxSlides`, `includeSheets`, `photoRoles`, `bindDataModel: true`, hybrid `evidence[]`, and `exports[]` |
| `ppt_import` tool | Import an external `.pptx` (text, tables, native charts, images, speaker notes) into a modernized editable project, or pass `projectId` to sync Office-edited `.pptx` changes back with undo history |
| `ppt_cite` tool | Link verified `dsh-cite` / JSON / BibTeX citations (`[@citeKey]`, `[doi:...]`) into `slide.source` footers and an auto-generated `References` slide |
| `ppt_remotion` tool | Export a 30fps `dsh-remotion` animated video storyboard pack (`DeckVideo.tsx`, `slides-data.json`, `captions.srt`/`.vtt`) timed from `computePaceBudget` |
| `ppt_absorb` tool | Read-only local extraction of single `.pptx` or whole `.pptx` folders (`--ingest-exemplars`) into `.dsh-ppt/taste-recipes.json`, `.dsh-ppt/exemplars.json`, and `.dsh-ppt/brand-kit.json` (including `watermark`, `forbiddenTerms`, `preferredSources`, `blockedDomains`) |
| `ppt_themes` tool | Lists all 24 built-in themes (16 daylight + 8 dark) paired with 6 chrome skeletons; pass `preview: true` with `outputDir` to generate a side-by-side HTML gallery and SVG palette cards |
| 41 canonical layouts + 53 aliases | **36 core**: `cover` / `agenda` / `section` / `bullets` / `statement` / `quote` / `kpi` / `cards` / `comparison` / `matrix` / `swot` / `process` / `value-chain` / `marimekko` / `sankey` / `mermaid` / `callout` (native `<m:oMath>` `formula`) / `gantt` / `architecture` / `harvey` / `tam` / `org` / `mockup` / `code` / `quadrant` / `radar` / `dumbbell` / `heatmap` / `map` / `isometric` / **`issue-tree`** / **`treemap`** / **`gauge`** / **`pricing`** / `table` / `closing`; **5 media**: `image` / `image-left` / `image-right` / `chart` / `chart-split` (plus 53 aliases including `mece`, `logic-tree`, `rect-map`, `budget-map`, `bullet-chart`, `okr-gauge`, `tiers`, `packages`, `world-map`, `china-map`, `iso-stack`, `flowchart`, `sequence`, `chevron`, `waterfall`, `gallery`) |
| 13 chart kinds | `column` / `bar` / `stacked-column` / `stacked-bar` / `percent-column` / `percent-bar` / `line` / `area` / `pie` / `doughnut` / `scatter` / `combo` / `waterfall` with `spotlight` / `highlight` / `referenceLine` / `showGrowthCallout` |
| `ppt_templates` | 20 industry blueprints + 20 Gold Exemplars (with Few-Shot JSON) + Mode B 8-Domain Authoritative Research Planner (`topic` + `evidence` → 3-round `site:` query pack & `planMarkdown`) |
| `ppt_edit` / `ppt_undo` | Edit slides, switch `theme`/`taste`/`brand`/`motionProfile`/`referencePptx`, reorder/duplicate/remove/append, `remixPreset` multi-audience remix, `saveToBank` golden slides, layout-lossless `translations`/`bilingualMode`, and `exports[]` (20-step undo + revision lock) |
| `ppt_check` | Read-only layout & `SLOP-01..14` aesthetic/authority/brand audit; supports `renderReceipt` digest verification and `feedbackPath` ingestion of offline HTML `R`-key `review-feedback.json` (`stakeholder-feedback`) |
| `ppt_render` | Optional official LibreOffice Kit PNG / PDF page rendering with missing-font diagnostics |
| `ppt_data` | Optional source lineage updates and what-if simulation (`bindDataModel: true` auto-binds Excel sheets) with diff preview before saving; see [data guide](DATA.md#english) |
| Reverse exports & Slide Bank | `exports: ['xlsx', 'docx', 'qa-prep', 'memo', 'i18n', 'handout', 'one-pager', 'social-carousel', 'subtitles']`; Workbench direct `.xlsx`/`.docx`/`.qa-prep.md`/`.pdf`/`.zip` downloads; `.dsh-ppt/slide-bank.json` cross-deck reuse |
| Visual review & repair | Optional rendered-PPTX inspection (up to 24 original slides) with 12 lossless repair actions and re-render verification; see [visual guide](VISUAL.md#english) |
| Coaching & rehearsal | Optional storyline (SCQA / Pyramid / Action Titles), expression, logic & evidence pre-review (up to 8 findings) and 7-persona Q&A rehearsal; see [coaching guide](COACHING.md#english) |
| Presenter Power Pack & motion | Standalone HTML supports `P` Dual-Screen Presenter Console, `L` laser, `Ctrl/Cmd+K` jump search, `R` offline review comments JSON export, `D` pen, `T` Q&A timer, `A` Auto-Tour; supports `reveal: 'step'`, `motionProfile`, and `motion: 'off'` |
| `dsh-ppt` skill & CLI | Tri-Mode (Mode A/B/C) SOP registered in DSH (13 tools total), or copy `skills/dsh-ppt/` into Claude Code / Cursor / Gemini CLI / Codex for standalone cross-harness builds |

Example:

> Turn this sentence into a deck: "AI support cuts first response time to 8 seconds", and automatically pick an executive-ready daylight theme.
>
> Match the palette and fonts of `assets/company-template.pptx`, and turn `docs/quarterly-review.md` into an editable PPTX with KPI cards, a waterfall chart, and booktabs tables.

## Installation

```bash
dsh plugin --profile web add dsh-ppt
```

On desktop, install `dsh-ppt` through plugin management. Restart the host after updating to load all 13 tools and the `dsh-ppt` skill. Ask naturally to match a reference template, include screenshots/charts, switch slide 3 to a 3-pillar card layout, or undo the last edit; users never need to hand-write JSON.

## Uninstall

```bash
dsh plugin --profile web remove dsh-ppt
```

Then restart the web service. To clean up fully, also remove the plugin entry from your profile `cordis.patch.yml` if you overrode it.

## Quick start

### Inside DSH (recommended)

```
1. ppt_themes { preview: true, outputDir: "dist" }   # inspect 24 themes + gallery
2. ppt_create {
     title: "Q3 Operations Review & Next Steps",
     content: "# Executive Summary\n> [!TAKEAWAY] First-response time dropped to 8s while net retention rose +4.2 pts\n\n::: kpi\n- 8s | First response | -64% QoQ\n- 98.5% | SLA attainment | +4.2 pts\n:::",
     theme: "auto",
     lang: "en"
   }
3. Open the returned HTML path in a browser, edit the PPTX in PowerPoint / WPS / Keynote, or refine in the Presentations workbench
```

### Any harness (standalone SKILL.md)

Copy `skills/dsh-ppt/` to any Agent Skills directory, run `npm install --ignore-scripts` inside it, then:

```bash
node <skill-dir>/scripts/build-deck.mjs \
  --title "Product Launch" \
  --content deck.md \
  --theme auto \
  --lang en \
  --out dist/deck
```

The standalone CLI also supports `--absorb ref.pptx`, `--reference-pptx ref.pptx`, `--clone-structure`, and `--chrome consulting-classic` (when `--theme` is omitted on the bare CLI, `data` remains the backward-compatible default).

Artifacts (existing files are never overwritten by default; colliding sets receive `-1`, `-2`, ... suffixes unless `overwrite: true` or `--overwrite` is passed):

| File | Purpose |
| --- | --- |
| `*.html` | Standalone slideshow: arrow keys, V presenter view (separate window with current/next previews, thumbnail strip, notes, timer, progress, pause, font size, blank screen), S notes, G thumbnail overview, D what-if data panel, F fullscreen, P print, ? shortcuts, Esc close |
| `*.pptx` | Editable 16:9 presentation with native shapes, structured cards, tables, embedded images, and native editable OOXML charts + workbooks |
| `*.json` | Structured project manifest (schemaVersion, theme, brand, assets, stable slide IDs, up to 20 undo steps, quality report) |

## Workbench, structured layouts, charts and review

### Presentations Workbench & Style Studio

Open the native sidebar **Presentations** workbench (or **Settings → Presentations**) and select a project registered by `ppt_create`, `ppt_edit` or `ppt_check`:

- **Physical Slide Lightbox (default) & Slide Studio**: Opening a deck lands on the illuminated 16:9 **Lightbox** overview with drag or `←/→` reordering, inline duplication, and a trailing `+16:9` card to insert 31+ starter archetypes. Click any transparency (or toggle **Slide Studio**) for the 3-pane editor: slide cards in the left rail show layout badges and quality dots with drag-and-drop reorder, duplicate, delete (1–120 slides), and undo; at the top of the inspector, switch across all 41 canonical archetypes, variants, per-slide `chrome` skeletons, and density modes (`compact | balanced | airy`) with lossless draft projection across bullets, structured `items` (including `actual`/`target`/`max`, Gantt `start`/`span`, `columns`, `role`, `conversion`), and `rows`; edit KPI/card fields, switch `tableStyle` (`consulting | booktabs | minimal | banded | harvey`), and edit `takeaway` callouts and `source` footnotes.
- **Style Studio**: Browse Daylight (16) vs Dark (8) themes with live palette swatches and scenario tags, switch across **8 Taste Recipes** and **6 Master Chrome Skeletons** (`brand.chromeStyle`), apply a new deck theme in 1 click, customize brand colors/fonts/footer/watermark/PNG-or-JPEG logo, or drag-and-drop a `.pptx` (`≤10 MiB`, decoded in memory with zero host path reads) to preview `recommendedChrome`, `extractedSkeleton`, `slideSkeleton`, and apply its extracted palette and recommended theme.
- **Side-by-side split & clickable findings**: Toggle between HTML preview, rendered PPTX PNGs, and **HTML + PPTX side-by-side** comparison; click any quality finding row to jump straight to that slide.
- **Concurrency & asset safety**: Saving regenerates HTML, PPTX, and JSON atomically. Stale revisions return HTTP 409 so another writer's edits are never overwritten; choose “Load latest, keep my input” to reconcile before saving. Uploaded PNG/JPEG images are capped at 5 MiB each (switching slides or cancelling aborts in-flight reads). The workbench edits this plugin's own JSON projects and does not import arbitrary external PPTX slides for text editing.

### Structured slides, media and charts

Structured `slides` support all **41 canonical layouts (36 core + 5 media) + 53 aliases**:

- **Executive diagrams (`issue-tree | treemap | gauge | pricing | map | isometric | quadrant | radar | dumbbell | heatmap | mockup | code | mermaid | gantt | architecture | tam | org | marimekko | sankey | value-chain | swot`) & structured cards (`kpi | cards | comparison | matrix | process`)**: Supply up to 8 `items` (`{ tag, title, text, value, unit, delta, actual, target, max, before, after, x, y, size, start, span, milestone, role, conversion, icon, status, bullets }`), Gantt `columns: ["Q1","Q2","Q3","Q4"]`, plus optional `chrome`, `reveal: 'step'`, `takeaway`, and `source`.
- **Harvey-ball matrix & tables** (`harvey | table`): Supports `tableStyle: "consulting" | "booktabs" | "minimal" | "banded" | "harvey"`; `harvey` renders crisp Harvey-ball / check indicators for `●`, `◕`, `◑`, `◔`, `○`, `✓`, `✗`.
- **Image slides** (`image | image-left | image-right`): Accept `image: { src, alt, fit: "contain" | "cover", caption }` using local PNG/JPEG paths relative to session cwd or matching data URIs. Assets are embedded in all outputs (limits: 5 MiB / 32 megapixels per image, 32 MiB total project assets; remote URLs and SVGs are not fetched or converted).
- **Native chart slides** (`chart | chart-split`): Accept `chart: { kind, categories, series: [{ name, values }], unit, highlight, caption }` or `rows` with headers across all 13 chart kinds (`column`, `bar`, `stacked-column`, `stacked-bar`, `percent-column`, `percent-bar`, `line`, `area`, `pie`, `doughnut`, `scatter`, `combo`, `waterfall`). Values must be finite with matching lengths; `pie`/`doughnut` require one nonnegative series with a positive sum. HTML renders accessible SVG + screen-reader tables; PPTX embeds native editable charts and workbooks.

`brand` supports `name`, `primaryColor`, `backgroundColor`, `textColor`, `fontFamily`, `logo`, `footer`, `watermark`, and `chromeStyle` (`#RRGGBB` colors; choose recipient-safe fonts). `template` supports all 20 industry blueprints (`weekly | defense | project | pitch | consulting | keynote | gov-report | workshop | architecture-review | financial-earnings | medical-case | postmortem | marketing-campaign | promotion-review | legal-compliance | creative-lookbook | quarterly-okr | product-prd | vc-daylight | industry-research`) without overwriting supplied narratives.

Edit & structure examples:
- Content + theme update: `{ deckPath: "report.json", expectedRevision: 0, theme: "consulting", edits: [{ slide: 3, patch: { layout: "kpi", title: "All core SLA targets exceeded plan", takeaway: "Net retention improved +4.2 pts QoQ" } }] }`
- Structural edit: `{ deckPath: "report.json", expectedRevision: 0, duplicate: [2], remove: [4], append: [{ layout: "callout", title: "Immediate next actions" }] }` (keeps 1–120 slides, up to 20 undo steps, atomic trio commit with rollback on failure).

`deliveryStatus: draft` indicates unfilled template slots; `ready-for-review` means review can start. Static estimates, rendering, and visual inspection are recorded separately—always inspect HTML and rendered page images before final delivery.

## Optional PNG/PDF renderer

Install in the plugin's project or standalone skill directory:

```bash
npm install --ignore-scripts @deepseek-ai/libreoffice-kit@0.2.3
```

The exact optional peer is not a mandatory engine download for ordinary consumers. Windows also needs the Microsoft Visual C++ v14 runtime matching Node's architecture. Missing dependency/engine returns `unavailable` with guidance.

`ppt_render {pptxPath:"report.pptx",format:"both"}` reads the final PPTX without resaving it and returns page PNGs, PDF and `receiptPath`. Pass that path as `renderReceipt` to `ppt_check` to recheck the current PPTX and every output's digest. Editing the source or outputs invalidates the receipt. Static artifacts do not retain animation. LibreOffice/PowerPoint/WPS may lay out files differently; font diagnostics do not guarantee every glyph or install fonts. See [integration details](../docs/LIBREOFFICE-INTEGRATION-2026-10-01.md).

This repository's pnpm overrides are not inherited by consumers. If an installed renderer's audit reports `fflate@0.8.2`, set `overrides: { "@deepseek-ai/libreoffice-kit": { "fflate": "0.8.3" } }` in the consumer's root package.json (npm), or `overrides: { "@deepseek-ai/libreoffice-kit>fflate": "0.8.3" }` in its root pnpm-workspace.yaml, then reinstall. The plugin also validates PPTX/ZIP64 bounds before rendering; that check does not replace updating the underlying dependency.

CLI supports `--slides @slides.json`, `--brand @brand.json`, `--from-office report.xlsx` (combinable with `--inspect-only`, `--instructions "..."`, `--bind-data`), `--export xlsx,docx,qa-prep,memo,i18n`, `--merge @sources.json`, `--save-to-bank 3`, `--list-bank`, `--translate @en.json --bilingual`, `--motion-profile executive`, `--plan "topic"`, `--evidence @evidence.json --evidence-appendix`, `--import-pptx legacy.pptx`, `--sync-pptx edited.pptx`, `--one-pager`, `--target-minutes 15`, `--handout`, `--reference-pptx ref.pptx`, `--absorb ref.pptx`, `--template consulting`, `--edit report.json --edits @edits.json --revision 0`, `--undo report.json --revision 1`, `--check report.json --feedback review-feedback.json`, and `--render report.pptx --format both`. Explicit receipt validation uses `--check report.json --render-receipt path/to/render-receipt.json`; failure returns a nonzero exit code.

For standalone usage copy the entire skill directory and run `npm install --ignore-scripts` there. Plain text remains usable without Office Kit; image/chart/logo/footer PPTX export needs Office Kit 0.21.0. `dsh-ppt/deck-advanced` exports `buildDeckAsync`, `editDeck`, `undoDeck`, `checkDeckAsync`, `renderDeck`, and `absorbPptx`. The legacy synchronous `deck-core` API supports plain text and explicitly rejects unsupported media inputs.

## Built-in themes (24 palettes) & 6 Chrome Skeletons

### 6 Master Chrome Skeletons (`chromeStyle`)

| ID | Name | Structural geometry | Default themes |
| --- | --- | --- | --- |
| `consulting-classic` | Consulting Classic | 0px sharp cards, left vertical accent rule, top-right section tracker, 0.75pt header rule | `consulting`, `cobalt-cream`, `financial-ft`, `bcg-emerald`, `obsidian-amber` |
| `keynote-spatial` | Keynote Spatial | Divider-free header, airy margins, 16pt borderless surface cards, minimal takeaway caption | `keynote-light`, `bold`, `venture-daylight`, `aurora-stage` |
| `editorial-folio` | Editorial Folio | Full-width top running folio, page number top-right, 0px borders, display serif numerals | `editorial-forest`, `cartesian`, `velvet`, `luxury-noir`, `economist-brief` |
| `saas-bento` | SaaS Bento | 10pt rounded `surface1` cards with hairline stroke, primary accent focus, monospace pills | `linear-dark`, `swiss`, `data`, `soft`, `stripe-craft` |
| `academic-minimal` | Academic Beamer | Full-width Beamer tinted header band (`13.333"`) + 3-zone academic footer status bar | `academic`, `course-sage`, `medical-clean` |
| `gov-ceremonial` | Gov Ceremonial | Double-rule header (`1.5pt` + `0.5pt`), bracketed chapter tag, symmetric warm-paper cards | `exec-jilan`, `exec-palace` |

### Daylight themes (16 — recommended for bright rooms, print, consulting, medical, academic & executive reviews)

| ID | Name | Mood | Best for |
| --- | --- | --- | --- |
| `consulting` | Strategy Navy (`auto` business default) | Authoritative / crisp | Management consulting, strategy reviews, board & operations decks |
| `cobalt-cream` | Blue Professional | Paper-warm / modern | Product proposals, B2B pitches, research & technical briefs |
| `bcg-emerald` | Emerald Strategy | Crisp / executive | Strategy consulting, growth reviews, transformation decks |
| `economist-brief` | Economist Briefing | Sharp / editorial | Macro research, policy briefs, industry analysis |
| `venture-daylight` | Venture Daylight | Bright / modern VC | Startup fundraising pitches, investment memos, board briefs |
| `stripe-craft` | Product Indigo | Crafted / modern | SaaS product launches, PRDs, engineering & product reviews |
| `exec-jilan` | Imperial Slate | Poised / institutional | Enterprise briefings, public-sector reviews, formal alignments |
| `exec-palace` | Palace Vermilion | Ceremonial / dignified | Institutional summaries, annual reviews, keynote ceremonies |
| `academic` | ETH & Nature | Clean / scholarly | Thesis defenses, grant proposals, research seminars |
| `editorial-forest` | Editorial Forest | Thoughtful / narrative | Industry whitepapers, ESG reports, research essays |
| `cartesian` | Cartesian Stone | Minimal / geometric | Architecture reviews, engineering postmortems, methodology decks |
| `course-sage` | Workshop Sage | Calm / legible | Workshops, lectures, training handouts |
| `soft` | Soft Signal | Warm / human | Brand stories, enablement, team talks |
| `keynote-light` | Keynote Spatial Light | Pure / airy | Product keynotes, flagship launches, Apple-inspired briefs |
| `financial-ft` | FT Salmon Financial | Editorial / financial | Earnings releases, investor briefings, macro research |
| `medical-clean` | Clinical Evidence Teal | Crisp / clinical | Clinical case reviews, biotech/pharma R&D, healthcare boards |

### Dark themes (8 — recommended for keynotes, dark venues, luxury curation & technical demos)

| ID | Name | Mood | Best for |
| --- | --- | --- | --- |
| `data` | Data Drift (CLI fallback default) | Futuristic / immersive | AI launches, live telemetry, technical showcases |
| `swiss` | Swiss Pulse | Precise / rational | Data reports, SaaS products, developer tools |
| `velvet` | Velvet Standard | Premium / restrained | Investor pitches, luxury brand briefings |
| `bold` | Maximalist Type | Loud / kinetic | Keynotes, big announcements, event openers |
| `linear-dark` | Obsidian Keynote | Sharp / modern | Modern software launches, startup pitch decks |
| `luxury-noir` | Luxury Noir Gold | Opulent / editorial | Creative lookbooks, luxury curation, flagship showcases |
| `aurora-stage` | Aurora Keynote | Theatrical / stage | Flagship launches, annual conference keynotes |
| `obsidian-amber` | Terminal Amber | High-contrast / terminal | Quant finance, data engineering, telemetry command decks |

Full palettes and typography tokens live in `skills/dsh-ppt/references/themes.md`. Run `ppt_themes { preview: true, outputDir: "dist" }` for a 24-theme side-by-side HTML gallery and SVG palette cards.

## Markdown input rules

- The first `# heading` becomes the cover title; its first paragraph becomes the cover subtitle.
- Each `## section` becomes a slide: standard lists, quotes, and tables are recognized automatically, alongside fenced semantic directives:
  - `::: kpi`, `::: cards`, `::: comparison`, `::: matrix`, `::: process`, `::: callout`, `::: agenda`, `::: gantt`, `::: architecture`, `::: harvey`, `::: tam`, `::: org` → parsed directly into structured cards, pro diagrams, or Harvey-ball matrices.
  - `> [!TAKEAWAY] Single-sentence conclusion` → extracted into the slide's bottom `takeaway` callout bar.
  - `<!-- source: ... -->` / `<!-- 来源: ... -->` → extracted as `source` footnote; `<!-- note: ... -->` → extracted as speaker `notes`.
- Plain text without headings: the first paragraph is the cover, then every 5 sentences become one slide; a single sentence produces a complete 3-slide structure (cover → statement → closing).
- Long tables paginate automatically with repeated headers and up to 8 data rows per page (`notes` stay on the first page; `tableStyle` supports `consulting | booktabs | minimal | banded | harvey`). Short rows are padded consistently across all artifacts.
- `maxSlides` counts pages after expansion. Exceeding it fails before writing files; raise the limit (up to 120) or split the deck. Middle slides are never silently discarded.
- For exact per-slide control, pass structured `slides` using any of the 41 canonical `layout` values (+ 53 aliases), `chrome`, `reveal`, `columns`, `items`, `rows`, `chart`, `image`, `takeaway`, `source`, and `notes`.

## Configuration

No required configuration. Optional:

```yaml
- id: dsh-ppt
  config:
    outputDir: E:\decks   # optional; defaults to the session working directory
    maxSlides: 40         # optional; default 60 (3–120)
    defaultTheme: auto    # optional; used when ppt_create has no theme (auto or any of the 24 theme IDs)
    defaultLang: en       # optional; used when ppt_create has no lang (zh/en/bilingual)
```

The `DSH_PPT_OUTPUT_DIR` env var can also set the default output directory; the `ppt_create` `outputDir`/`theme`/`lang` arguments have the highest priority.

Relative paths and configured output directories resolve per session cwd without changing process cwd. Cancellation is checked during generation and before atomic commit of the trio. Optional rendering defaults to a unique `<deck>-render` directory beside the PPTX.

## Bilingual support

- `lang` argument: `zh` (default) / `en` / `bilingual` controls the player UI, page numbers, and closing defaults.
- Content language is up to the author: for a bilingual deck, prefer "Chinese title + English subtitle" or generate two decks from the same outline.
- Plugin docs come in Chinese (README.md) and English (this file); CLI and skill error messages are in Chinese.

## Engineering quality

- Tools and the skill share an asynchronous generator. The legacy synchronous plain-text API remains available.
- Images and native charts use MIT-licensed `@office-kit/pptx@0.21.0`; reference `.pptx` absorption uses safe local `fflate` + OOXML parsing with ZIP-bomb and path-traversal guards; optional rendering is loaded on demand.
- Unit tests cover registration contracts (13 tools), JSON Schema, 24 themes, 6 chrome skeletons, 8 taste recipes, 20 Gold Exemplars, 41 canonical layouts + 53 aliases, 20 industry blueprints, 13 chart kinds, 61 vector icons, deep `.pptx` absorption, 8-domain authoritative research & `SLOP-13/14`, Mode C hybrid Office packs, reverse exports / Slide Bank / lossless i18n, artifact generation, PPTX part integrity, workbench security bounds, and the CLI.
- No `eval` / `child_process` / secrets; artifacts are only written to the user-specified local directory.

## Development

```sh
pnpm install
pnpm run build      # tsc + client workbench bundle → lib/
pnpm test           # build + node --test (registration/config/engine/charts/absorb/workbench/CLI)
pnpm run smoke:cli  # bare CLI smoke test, generates .smoke-deck
```

## Known limitations

- PPTX slides use positioned native shapes, tables, charts, and text boxes: text and chart workbooks are editable in PowerPoint / WPS / Keynote, without complex master-placeholder inheritance chains.
- `ppt_absorb` and `referencePptx` (including `cloneStructure`) extract colors, fonts, slide aspect ratio, chrome geometry, and slide layout skeletons; they do not copy third-party slide copy verbatim.
- `bilingual` localizes the player and workbench UI; it does not translate authored slide content.
- Selected-page editing supports this plugin's JSON project, not arbitrary external PPTX editing.
- Static checks estimate text fit and visual density; inspect rendered page images for exact font substitution and clipping.

## License

Plugin: MIT. Office Kit: MIT. Optional official LibreOffice Kit and its engine retain their own source/license/third-party notices. This community plugin is not officially maintained by DeepSeek.

## Related projects

- [dsh-hyperframes](https://github.com/STARDUSTLC666/dsh-hyperframes) — HTML video skills (source of this plugin's visual styles)
- [dsh-remotion](https://github.com/STARDUSTLC666/dsh-remotion) — React programmatic video skills
- [dsh-email](https://github.com/STARDUSTLC666/dsh-email) — Email toolset

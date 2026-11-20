[简体中文](README.md) · **English**

# PPT

**Publication-grade presentation engine & workbench for DeepSeek Harness: zero-material research & SLOP-13 fact-grounding, 20 Gold Exemplars & zero-LLM self-repair, 24 themes / 35+ native editable layouts & charts, direct Office ingestion, and offline HTML + 100% editable PPTX / PDF / PNG exports.**

[![npm](https://img.shields.io/npm/v/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt) [![downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-downloads.svg)](https://www.npmjs.com/package/dsh-ppt) [![total downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-total-downloads.svg)](https://www.npmjs.com/package/dsh-ppt)

**[Install](#install) · [Workflow](#start-using-it) · [Full guide](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/REFERENCE.en.md)**

<picture>
  <source media="(prefers-color-scheme: dark) and (max-width: 640px)" srcset="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-en-mobile-dark.svg?v=0.28.0">
  <source media="(max-width: 640px)" srcset="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-en-mobile-light.svg?v=0.28.0">
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-en-dark.svg?v=0.28.0">
  <img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-en-light.svg?v=0.28.0" alt="Turn docs, spreadsheets, Mermaid diagrams, or legacy decks into deliverables. · workflow illustration" width="100%">
</picture>

## Features

- **Visual & Map Intelligence (World/China Dotted Maps, 2.5D Isometric Infographics, Procedural Cover Artwork & Smart Visual Briefs)**: Expands zero-dependency native editable layouts to **37+** — Economist-style **World & China Strategic Dotted Maps (`map`: `world` | `china`)** with bilingual hub geocoding, pulse rings, collision-free callouts & ranked progress sidebars; **2.5D Isometric Vector Infographics (`isometric`: `stack` | `pillars`)** rendered as true 3-face `<a:custGeom>` prisms in PPTX + `<svg>` in HTML; procedural cover artwork (**`coverPattern`**: `waves` | `isometric-mesh` | `editorial-arcs`); **Smart Visual Brief slots (`imageBrief` / `visualBriefs`)**, **`image.focalPoint`** smart cropping, and automatic bottom-up dark gradient scrims on **`image[full-bleed]`** for WCAG AAA contrast over bright photography.
- **Zero-Material Research-to-Deck Planner, Verified Evidence Ledger & `SLOP-13` Fact-Grounding Gate**: When a user supplies only a topic with zero source material, `ppt_templates({ topic })` / CLI `--plan` matches the best Gold Exemplar, generates a 3-round retrieval & fact-check rubric, diagnoses missing quantitative slots, and outputs a user-ready storyboard plan (`planMarkdown`); once researched and confirmed, `ppt_create({ evidence, evidenceAppendix: true })` / CLI `--evidence --evidence-appendix` binds verified `E1..En` entries to single-line `source` footers, full URL/scope speaker notes, a naturally sorted zero-overflow 4-column `booktabs` Sources Appendix slide, and `.handout.md` ledger tables while **`SLOP-13`** flags dangling refs, undisclosed unverified/conflicting claims, vague `"internet"`/`"网络整理"` placeholders, and unsourced research numbers.
- **20 Curated Gold Exemplars (incl. 12 GitHub OSS-Distilled), Few-Shot JSON, Narrative Re-sequencing & Zero-LLM Self-Repair Loop**: Ships **20 scenario exemplars** (8 core + 12 distilled from visually-vetted Apache-2.0/MIT/CC-BY-4.0 GitHub `.pptx` decks: `mckinsey-evolution`, `luxury-budget-review`, `swiss-bauhaus-workshop`, `dark-stage-investor`, `blueprint-ai-factory`, `warm-brand-story`, `ted-storytelling-keynote`, `msft-enterprise-discovery`, `daylight-earnings-research`, `okr-performance-review`, `quiet-canvas-keynote`, `medical-clinical-course`) with **`exemplar: "auto"` semantic routing**, **`alignOrder: true`** exemplar narrative-arc re-sequencing, and ready-to-mirror **Few-Shot Gold Slide JSON** via `ppt_templates({ exemplarId })`; batch-ingest local/GitHub `.pptx` folders offline via `ppt_absorb` / `--ingest-exemplars <dir>` into `.dsh-ppt/exemplars.json`; built-in **Deterministic Weak-LLM Super-Upgrader & Zero-LLM Self-Repair Loop (`autoUpgrade` / `selfRepairDeck`)** runs pre-commit `checkManifest` + `SLOP-01..12` check→repair→recheck with 0 extra LLM calls, losslessly fixing overflowing titles, bullet walls, KPI/table overloads, pie spaghetti, missing chart spotlights/takeaways, and low-contrast/neon canvases before saving.
- **Aesthetic Studio (8 Curated Taste Recipes, 61 Native Vector Icons, Cover Photo Split & Geometric Patterns)**: Ships **8 world-class Taste Recipes** (`mckinsey-partner`, `apple-keynote-dark`, `apple-keynote-light`, `swiss-editorial`, `linear-craft`, `ft-data-journal`, `nature-academic`, `oriental-zen`) orchestrating **4 poster covers** (`keynote-glow`, `editorial-grid`, `architectural`, `split-bleed`), **Hero Photo Split covers** (`slide.image` on `cover`) & procedural **`coverPattern`** (`dots` | `grid` | `rings`), **live multi-chapter `section[agenda]` trackers**, **4 card surface materials** (`solid`, `frameless`, `glass`, `editorial-rule`), **anti-monotony asymmetric layouts** (`kpi[spotlight]`, `cards[bento-hero]`), **61 zero-dependency geometric vector icons** (HTML `<svg>` + editable OOXML `<a:custGeom>`), and **publication-grade chart finishing**; `ppt_absorb` extracts 6-signal aesthetic DNA (`styleRecipe`) from any benchmark `.pptx` into `.dsh-ppt/taste-recipes.json`.
- **Tech/Product Showcase & 35+ Native Editable Consulting Layouts & Charts**: Auto-matches **24 curated themes**, **6 Master Chrome Skeletons**, and **20 industry blueprints**; adds native vector **Device Mockups (`mockup`: `browser` | `mobile` | `split` with screenshot injection or live UI tiles)**, **9-language Zero-Dep Syntax-Highlighted Code (`code`, auto-promoting Markdown ```` ```lang ```` fences into macOS terminals + editable multi-color Consolas OOXML runs)**, and **4 Pinnacle Analyst Charts**: **Magic Quadrant (`quadrant`)**, **Multi-Series Radar (`radar`)**, **McKinsey Dumbbell Slope (`dumbbell`)**, and **WCAG Auto-Contrast Heatmap (`heatmap`)** — alongside native `<m:oMath>` equations, Mermaid-to-OOXML connectors, Marimekko, Sankey, Porter Value Chain, SWOT, Gantt, Architecture, Harvey balls, TAM concentric circles, academic 3-line tables, and 13 publication-grade charts.
- **Direct Word/Excel/CSV Ingestion, `.pptx` Modernization & `dsh-cite` / `dsh-remotion` Bridges**: `ppt_from_office` ingests `.xlsx` workbooks, `.csv`/`.tsv`, and `.docx` reports directly with zero new dependencies; `ppt_import` refurbishes legacy `.pptx` files and syncs Office round-trip edits (`≤24 MiB`, undoable); `ppt_cite` links verified **`dsh-cite`** references and `ppt_remotion` exports animated **`dsh-remotion`** storyboard packs.
- **Direct-Manipulation Workbench & 1-Click PDF / PNG-ZIP Delivery**: Adapted for DeepSeek Harness `>=0.2.2-rc.3`; features **HTML5 Drag-and-Drop Slide Reordering** in the left rail, **Canvas Double-Click Inline Editing** synced atomically to HTML + PPTX, **`? Guide`** spotlight tour, 1-click **Load Flagship Demo**, **Speaking-Pace Budgeter**, **Dual-Screen Presenter View** (`P` key + `L` laser), and direct downloads for **PPTX**, **High-DPI PDF (`.pdf`)**, **Slide PNG Pack (`.zip`)**, **Executive One-Pager (`.onepager.html`)**, **Speaker Handout (`.handout.md`)**, and **Remotion Storyboard (`.zip`)**.
- **Optional verification & coaching**: Traceable numbers with live what-if sliders, 24-slide two-tier Vision QA (12 lossless formatting actions + full-width before/after canvas diff), and executive storyline coaching / defense rehearsal.

## Style previews

Every preview below is LibreOffice-rendered directly from **100% native editable `.pptx`** files built by `dsh-ppt` (`missingFonts: []`). Select any image to enlarge.

<table>
<tr>
  <th>Keynote Glow Poster Cover</th>
  <th>Glass Bento + Native Vector Icons</th>
  <th>Syntax-Highlighted Code Terminal</th>
</tr>
<tr>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-cover-keynote-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-cover-keynote-en.webp" alt="Apple Keynote Dark cover with radial ambient orbs, geometric dot pattern, and crisp typography" width="100%"></a></td>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-bento-glass-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-bento-glass-en.webp" alt="Asymmetric Hero Bento pairing translucent glass surfaces with native OOXML custom-geometry vector icons" width="100%"></a></td>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-code-showcase-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-code-showcase-en.webp" alt="macOS dark terminal frame with zero-dependency syntax-highlighted editable Consolas runs and split annotations" width="100%"></a></td>
</tr>
<tr>
  <th>SaaS Browser Device Mockup</th>
  <th>Magic Quadrant Matrix</th>
  <th>Six-Dimension Radar Benchmark</th>
</tr>
<tr>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-mockup-browser-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-mockup-browser-en.webp" alt="Native vector browser window frame featuring address bar, navigation rail, and editable SaaS KPI cards" width="100%"></a></td>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-quadrant-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-quadrant-en.webp" alt="Gartner-style Magic Quadrant bubble matrix with Leaders spotlight zone and vertical Y-axis title" width="100%"></a></td>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-radar-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v28-radar-en.webp" alt="Multi-series hexagonal capability radar chart with concentric spider web rings and translucent series overlays" width="100%"></a></td>
</tr>
</table>

All previews are LibreOffice-rendered from native OOXML `.pptx` outputs using sample metrics.

<details>
<summary>View the workbench</summary>

![workbench example](https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/screen-en.webp?v=0.22.0)

Actual interface with controlled validation data; the PPTX image is a rendered sample when shown.

</details>

## Install

Open **Plugins** in the DSH desktop app and install `dsh-ppt`. If the CLI is available:

```bash
dsh plugin --profile desktop add dsh-ppt
```

For the web profile, replace `desktop` with `web`. Restart that DSH profile after installation. The package’s DSH requirement is `>=0.2.2-rc.3`.

## Start using it

Four intuitive steps — start either in chat or directly inside the workbench:

1. **Draft in seconds (three ways)**:
   - **Self-serve in the Workbench**: Open **Presentations** in the sidebar (click **`? Guide`** anytime for the 4-step spotlight tour), click **Load Flagship Demo** for an instant showcase, click **New presentation** to pick from 20 scenario blueprints, or drag-and-drop **`.xlsx` / `.csv` / `.docx` / `.pptx`** directly.
   - **Ask in Chat**: Share Word/Excel/CSV files, Markdown (including ```` ```mermaid ```` flowcharts or sequence diagrams), or a reference `.pptx` path — Auto-Director picks a projector-safe theme and varied layouts automatically, and `ppt_cite` links verified `dsh-cite` references.
2. **Click-to-edit, layouts & speaking-pace budget**: Click any title, card, or table in the live preview to focus its editor field; switch bullets into **Mermaid flowcharts/sequence diagrams, KPI metrics, Marimekko market maps, Sankey flows, Porter Value Chains, SWOT matrices, Gantt timelines, Architecture diagrams, Harvey-ball matrices, or academic 3-line tables** (plus native LaTeX `formula`s), set **Target Duration (min)** to spot over-budget slides live, then press `Ctrl/⌘+S` or **Save slide**.
3. **Import Office/.pptx, round-trip edits & save your brand**: Import `.xlsx`/`.csv`/`.docx` or refurbish legacy `.pptx` files in one click, or sync PowerPoint/WPS edits back via **Sync Edited .pptx** as an undoable revision; in **Style Studio**, apply 8 Master Presets or save a corporate `.pptx` style into **My Brand Library**.
4. **Present, verify & deliver everywhere**: Render the current PPTX for **side-by-side HTML & PPTX inspection** (or run optional AI storyline coaching, rehearsal, or 24-slide visual repair); press `P` during standalone HTML playback for **Dual-Screen Presenter View** (`L` for laser pointer), and download PPTX, **Executive One-Pager (`.onepager.html`)**, **Remotion Storyboard (`.zip`)**, **Handout (`.md`)**, or Share ZIP.

Ready-to-copy chat prompts:

- **Quarterly / OKR review**: `Turn these notes into a Quarterly OKR review deck with action titles, KPI cards, value-chain chevrons, and issue-action comparisons (HTML + editable PPTX).`
- **Clone a corporate `.pptx`**: `Absorb the palette, logo, chrome skeleton, and slide cadence of company-template.pptx, and turn this document into an executive presentation.`

## Before you start

Download the finished deck directly; AI review, rehearsal and visual repair are optional. Import external `.pptx` decks for one-click modernization or sync Office-edited `.pptx` changes back into your workbench project with undo history; press `P` during HTML playback for Dual-Screen Presenter View and export structured `.handout.md` speaker handouts.

Configuration, detailed tools and troubleshooting: [full reference](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/REFERENCE.en.md).

## Plugin updates

Check updates at the bottom of the workbench or native plugin details. Automatic checks are on by default; **automatic installation is off**. You choose whether to install and when to restart. Suite-managed components update with their bundle. [Update behavior](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/REFERENCE.en.md).

## Documentation

- [Full usage, configuration and limits](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/REFERENCE.en.md)
- [Release notes](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/CHANGELOG.md)
- [Validation scope and history](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/VALIDATION.md)

## Feedback and contributions

If the plugin helps, a Star makes it easier for others to discover. Report problems or suggest improvements in [Issues](https://github.com/STARDUSTLC666/dsh-ppt/issues); code and documentation [PRs](https://github.com/STARDUSTLC666/dsh-ppt/pulls) are welcome. Include versions and reproduction steps, and remove credentials from reports.

## License

[MIT](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/LICENSE)

<a id="what-it-does"></a>
<a id="requirements-and-configuration"></a>

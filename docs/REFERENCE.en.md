> Full usage reference. The landing page focuses on outcomes, installation and workflows; detailed parameters, limits, update rules and historical validation links remain here.

# dsh-ppt

[中文](../README.md)

![dsh-ppt whale girl plugin cover](https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/cover-whale-girl.png)

Turn source material into a publication-grade HTML slideshow, 100% native editable PPTX and reusable project bundle. Scenario Auto-Director automatically pairs your content with curated daylight/dark themes and varied slide archetypes — or use DSH's Style Studio to switch themes in one click, absorb a corporate `.pptx` template, edit structured cards and academic 3-line tables, trace numeric lineage, and run live what-if scenarios. AI review, rehearsal and visual repair remain optional so you can download finished files directly.

[![npm](https://img.shields.io/npm/v/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt) [![downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-downloads.svg)](https://www.npmjs.com/package/dsh-ppt) [![total downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-total-downloads.svg)](https://www.npmjs.com/package/dsh-ppt)

[Download statistics](https://github.com/STARDUSTLC666/dsh-suite/blob/npm-downloads/README.md)

Feedback and contributions are welcome: report [issues](https://github.com/STARDUSTLC666/dsh-ppt/issues) or submit [pull requests](https://github.com/STARDUSTLC666/dsh-ppt/pulls).

Open the workbench from the native DSH sidebar. See the [workbench guide](WORKBENCH.md) for configuration and operating boundaries.

## What it does

- **Zero-taste-burden Auto-Director, 24 Master Themes & 6 Chrome Skeletons**: Ships 16 projector-safe daylight themes (including `bcg-emerald`, `economist-brief`, `venture-daylight`, `stripe-craft`, `consulting`, `cobalt-cream`, `exec-jilan`, `exec-palace`, `academic`, `editorial-forest`, `cartesian`, `course-sage`, `soft`, `keynote-light`, `financial-ft`, `medical-clean`) and 8 stage dark themes (including `aurora-stage`, `obsidian-amber`, `linear-dark`, `swiss`, `velvet`, `data`, `bold`, `luxury-noir`), paired with **6 Master Chrome Skeletons** and **20 industry scenario blueprints**. When `theme` is omitted in `ppt_create`, `auto` routes content to the best-fit persona theme and chrome.
- **Deep Reference `.pptx` Absorption & Master Presets**: Includes **8 World-Class Reference Presets** plus external `.pptx` absorption via `ppt_absorb`, `referencePptx` (`cloneStructure: true`), or drag-and-drop (`≤24 MiB`) in **Style Studio** — unwrapping nested `<p:grpSp>` group shapes and resolving OOXML `sysClr`/`prstClr`/`hueMod` modifiers, dual brand accents, heading/body font pairings, dark-cover + daylight-body polarity, master logos, `recommendedChrome`, and 24-layout `slideSkeleton[]` sequences with WCAG ≥4.5:1 clamping.
- **29+ Native Editable Layouts, Native Mermaid Diagrams & `<m:oMath>` Equations**: Ships zero-dependency **`deck-mermaid.mjs`** (`layout: 'mermaid'`, aliases `'flowchart'` / `'sequence'`, plus automatic ```` ```mermaid ```` Markdown block detection) compiling `flowchart` (subgraphs, diamonds, stadium terminals, cylinder DBs, labeled edges) and `sequenceDiagram` (lifelines, activations, message arrows, notes, `alt/loop` frames) into 100% native editable OOXML `<p:sp>` shapes with attached `<p:cxnSp>` connectors and crisp HTML SVGs; alongside variable-width **Marimekko (`marimekko`)**, multi-layer **Sankey (`sankey`)**, authentic **Porter Value Chain (`value-chain`)**, **SWOT Cross Matrix (`swot`)**, LaTeX-to-OOXML `<m:oMath>` + MathML equations (`slide.formula` / `$...$`), interlocking Chevrons (`chevron`), Bento/pillar `cards`, hero `kpi` grids, `comparison`, `matrix`, `process`, `callout`, `gantt`, `architecture`, `harvey`, `tam`, `org`, `table` (`consulting | booktabs | minimal | banded | harvey`), `chart-split`, and 13 Economist/FT chart variants.
- **Direct Word/Excel/CSV Ingestion & Cross-Plugin Bridges (`ppt_from_office`, `ppt_import`, `ppt_cite`, `ppt_remotion`)**: Adds **`ppt_from_office`** (zero new dependencies) to convert `.xlsx` multi-sheet workbooks, `.csv`/`.tsv`, and `.docx` Word reports directly into multi-slide decks (auto-profiling sheets into Sankey, Gantt, Marimekko, Waterfall, Combo charts, and tables); retains **`ppt_import`** for legacy `.pptx` refurbishment and Office round-trip sync (`≤24 MiB`, undoable); adds **`ppt_cite`** to link verified **`dsh-cite`** / BibTeX citations into `slide.source` and a `References` slide, and **`ppt_remotion`** to export 30fps **`dsh-remotion`** storyboard packages; includes **Dual-Screen Presenter View** (`P` / `L` laser), **Speaking-Pace Budgeter (`targetMinutes`)**, **Executive One-Pager (`.onepager.html`)**, and **`.handout.md`** speaker handouts.
- **Rich Workbench, `? Guide` Spotlight Tour & Style Studio**: Search and filter projects with theme/page metadata; launch the 4-step **`? Guide`** interactive spotlight tour, click **Load Flagship Demo** (`create-demo`), drag-and-drop `.xlsx`/`.csv`/`.docx`/`.pptx`, switch slide archetypes (including Mermaid) and per-slide chrome skeletons in one click, set **Target Duration (`targetMinutes`)** with live overrun badges, edit Gantt timelines, Harvey matrices, structured `items`, `formula`s, `mermaid` code, and tables, compare HTML ↔ rendered PPTX side-by-side, jump directly from quality findings to slides, and undo up to 20 revisions.
- **Traceable Data & What-If Scenarios**: Bind `{{metricId}}` across titles, bullets, `items` (including `gantt`, `tam`, `architecture`, `org`), `harvey`/table `rows`, `takeaway`, `source`, and charts; adjust declared assumptions live in HTML and save confirmed snapshots to PPTX. See [the data guide](DATA.md#english).
- **Optional 24-Slide Two-Tier Vision QA**: Inspect rendered PPTX images for both layout bugs and aesthetic hierarchy, apply 12 lossless formatting actions on a copy, and compare full-width before/after renders on the canvas. See [visual review](VISUAL.md#english).
- **Optional Executive Storyline Review & Rehearsal**: Critique Action Titles, SCQA narrative flow, and missing evidence (up to 8 findings across 7 audience personas) or practice live Q&A. See [the rehearsal guide](COACHING.md#english).
- **Share & Project Bundles**: Export a share ZIP (PPTX, offline HTML, Markdown speaker notes) or full project ZIP (including editable JSON), plus keyboard shortcuts (`Ctrl/⌘+S`, `Esc`, `Alt+←/→`). See [download details](WORKBENCH.md#下载与分享--download-and-share).

## Install

In DSH Desktop, install `dsh-ppt` from the Plugins panel. If the bundled dsh command is available:

```bash
dsh plugin --profile desktop add dsh-ppt
```

For the web version, replace `desktop` with `web`. Restart DSH after installation.

## Start using it

1. Provide source material (`.docx`/`.xlsx`/`.csv`/Markdown/Mermaid), purpose, audience, or a reference `.pptx` in the target workspace; request HTML, PPTX, Executive One-Pager, and project files.
2. Open **Presentations** in the sidebar (click **`? Guide`** for the 4-step spotlight tour or **Load Flagship Demo** for an instant showcase) and search for or select the generated project.
3. Edit 29+ slide archetypes (including Mermaid code and LaTeX `formula`s), per-slide chrome skeletons, Gantt timelines, Harvey matrices, structured cards/tables, images, order, or **Target Duration (`targetMinutes`)** in **Edit content**, or switch across 24 themes & 6 master skeletons and absorb a `.pptx` in **Style Studio**; render the current PPTX for side-by-side inspection when needed.
4. Explicitly start optional AI storyline review, rehearsal, 24-slide visual repair, `ppt_cite` citation linking, or `ppt_remotion` storyboard export when needed; direct download does not require them.
5. Deliver the share bundle, **Executive One-Pager (`.onepager.html`)**, **Remotion Storyboard (`.zip`)**, or `.handout.md` handout, or retain editability with the project bundle; check the result in the target browser or Office application.

Sync Office-edited `.pptx` changes back into an open project via `ppt_import` or **Sync Edited .pptx** (undoable). When outputs were altered directly outside the project without syncing, use **Save a copy** or `ppt_edit(saveAs:true)` to rebuild a new trio from JSON while preserving the originals.

## Requirements and configuration

Normal generation and `.pptx` style extraction do not require Office or LibreOffice. Final PPTX page PNG/PDF rendering uses the optional official LibreOffice Kit; see the [usage guide](USAGE.en.md) for dependencies, cross-platform CJK/Latin font safety, and installation. For standalone development, follow the Node requirement in [package.json](../package.json).

## Documentation

- [Usage and troubleshooting](USAGE.en.md)
- [Workbench & Style Studio](WORKBENCH.md)
- [Visual review and repair](VISUAL.md#english)
- [AI storyline review & rehearsal](COACHING.md#english)
- [Data lineage & what-if](DATA.md#english)
- [Changelog](../CHANGELOG.md)
- [Validation scope and history](VALIDATION.md)
- [Report a problem or suggest a feature](https://github.com/STARDUSTLC666/dsh-ppt/issues)

## Plugin updates

Requires DSH 0.2.2-rc.3 or newer. Update controls sit at the bottom of the existing workbench, or native plugin details for plugins without a workbench. Checks, release notes and preferences expand in place, with no separate update page or settings menu. Automatic checks are on by default; **automatic installation is off by default**. Only explicit opt-in permits compatible stable patches while idle with no unsaved changes. Preferences are independent, with per-plugin disable, deferral and ignore controls. No forced DSH restart or upgrade, and local-source installations stay unchanged. Suite components explain and operate on the whole Suite in the same footer.

Older releases need one manual update in native plugin management to acquire these controls. Publishing to npm does not replace an existing user installation.

## License

[MIT](../LICENSE)

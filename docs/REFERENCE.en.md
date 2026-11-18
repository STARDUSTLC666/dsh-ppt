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
- **28+ Native Editable Layouts, Pinnacle Diagrams & Native `<m:oMath>` Equations**: Adds variable-width **Marimekko (`marimekko`)**, multi-layer **Sankey (`sankey`)**, authentic **Porter Value Chain (`value-chain`)**, **SWOT Cross Matrix (`swot`)**, and zero-dependency LaTeX-to-OOXML `<m:oMath>` + HTML MathML math compilation (`slide.formula` / `$...$`), alongside interlocking Chevrons (`chevron`), Bento/pillar `cards`, hero `kpi` grids, `comparison`, `matrix` (2×2), `process` (steps / timeline / chevron / layers / funnel / flywheel), `callout`, `gantt` roadmaps, `architecture` layered diagrams, `harvey`-ball competitor matrices, `tam` concentric circles, `org`/team charts, `table` (`consulting | booktabs | minimal | banded | harvey`), `chart-split`, and 13 Economist/FT chart variants.
- **10th Tool `ppt_import`, Legacy `.pptx` Refurbishment, Dual-Screen Presenter & Handouts**: Import external `.pptx` decks (text, tables, live native `<c:chart>` charts, images, and speaker notes) via `ppt_import` or Workbench **Import & Modernize .pptx** / **Sync Edited .pptx** with full undo history; launch **Dual-Screen Presenter View** (`P` key / `L` laser pointer) during HTML playback and export structured `.handout.md` speaker handouts.
- **Rich Workbench & Style Studio**: Search and filter projects with theme/page metadata; switch slide archetypes and per-slide chrome skeletons in one click, edit Gantt timelines, Harvey matrices, structured `items`, and tables, add/duplicate/reorder slides, compare HTML ↔ rendered PPTX side-by-side, jump directly from quality findings to slides, and undo up to 20 revisions.
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

1. Provide material, purpose, audience, or a reference `.pptx` in the target workspace; request HTML, PPTX and project files.
2. Open Presentations in the sidebar and search for or select the generated project.
3. Edit 24 slide archetypes, per-slide chrome skeletons, Gantt timelines, Harvey matrices, structured cards/tables, images or order in **Edit content**, or switch across 18 themes & 6 master skeletons and absorb a `.pptx` in **Style Studio**; render the current PPTX for side-by-side inspection when needed.
4. Explicitly start optional AI storyline review, rehearsal or 24-slide visual repair when needed; direct download does not require them.
5. Deliver the share bundle or retain editability with the project bundle; check the result in the target browser or Office application.

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

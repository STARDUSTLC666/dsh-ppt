[简体中文](README.md) · **English**

# PPT

**Turn source material into publication-grade, deliverable presentations in DeepSeek Harness—HTML playback, editable PPTX, and project bundles—in a 5-theme light workbench.**

[![npm](https://img.shields.io/npm/v/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt) [![downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-downloads.svg)](https://www.npmjs.com/package/dsh-ppt) [![total downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-total-downloads.svg)](https://www.npmjs.com/package/dsh-ppt)

**[Install](#install) · [Workflow](#start-using-it) · [Full guide](https://github.com/STARDUSTLC666/dsh-ppt/blob/master/docs/REFERENCE.en.md)**

<picture>
  <source media="(prefers-color-scheme: dark) and (max-width: 640px)" srcset="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-en-mobile-dark.svg">
  <source media="(max-width: 640px)" srcset="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-en-mobile-light.svg">
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-en-dark.svg">
  <img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/docs/assets/intro/workflow-en-light.svg" alt="Bring your material. Leave with a presentation you can deliver. · workflow illustration" width="100%">
</picture>

## Features

- **Zero-taste-burden Auto-Director**: Automatically selects from **24 curated themes** (16 projector-safe daylight + 8 stage dark — spanning McKinsey, BCG Emerald, Economist Brief, FT Salmon, Sequoia Daylight Memo, Stripe Craft, Apple Spatial Light, and Gov Ceremonial), **6 distinct Master Chrome Skeletons**, **20 industry blueprints**, **native `<m:oMath>` + MathML equations**, and **28+ native editable layouts & pro diagrams** (including **Marimekko** variable-width market maps, multi-layer **Sankey** flow diagrams, **Porter Value Chain**, **SWOT** cross matrix with strategic anchor, interlocking Chevrons, Bento cards, KPI metrics, 2×2 matrices, comparisons, flywheel/funnel flows, Gantt roadmaps, layered architecture diagrams, Harvey-ball matrices, concentric TAM/SAM/SOM, org/team charts, academic 3-line tables, and 13 publication-grade chart types including vector waterfall bridges).
- **One-Click `.pptx` Modernization & Office Round-Trip Sync**: Ships the **10th agent tool `ppt_import`** and Workbench **Import & Modernize .pptx** / **Sync Edited .pptx** (`≤24 MiB` in-memory upload) — extract text, tables, live native charts, images, and speaker notes from legacy `.pptx` decks into a brand-new editable project, or sync PowerPoint/WPS edits back into an open project with full undo support; also includes **8 1-click Reference Presets** and deep `.pptx` brand/skeleton absorption (`ppt_absorb`).
- **Human-first Workbench, Dual-Screen Presenter View & Handouts**: Adapted for DeepSeek Harness `>=0.2.2-rc.3` with 5 light UI themes; click **New presentation** or **Import & Modernize .pptx** directly in the workbench, click text/cards/tables in the preview to edit fields or LaTeX `formula`s, insert Harvey balls (`● ◕ ◑ ◔ ○`) in 1 click, compare HTML ↔ rendered PPTX side-by-side, export **Speaker Handout (`.handout.md`)**, and press **`P`** in standalone HTML playback to launch **Dual-Screen Presenter View** (with next-slide preview, timer & **`L`** virtual laser pointer).
- **Optional verification & coaching**: Traceable numbers with live what-if sliders across diagrams and tables, 24-slide two-tier Vision QA (12 lossless formatting actions + full-width before/after canvas diff), and executive storyline coaching / defense rehearsal.

## Style previews

Rendered from native editable PPTX files made with dsh-ppt across distinct master chrome skeletons and domain diagrams. Select an image to enlarge it.

<table>
<tr>
  <th>Layered Architecture + Sidecar</th>
  <th>Multi-Quarter PMO Gantt</th>
  <th>Phase-III Clinical Booktabs</th>
</tr>
<tr>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-arch-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-arch-en.webp" alt="Three-tier decoupled AI platform architecture diagram with full-height zero-trust observability sidecar" width="100%"></a></td>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-gantt-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-gantt-en.webp" alt="Four-quarter five-swimlane cloud-native migration Gantt roadmap with bar-end and standalone diamond milestones" width="100%"></a></td>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-clinical-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-clinical-en.webp" alt="Medical Clean Beamer header band with NEJM-grade three-line booktabs clinical endpoint table and 3-zone footer" width="100%"></a></td>
</tr>
<tr>
  <th>CFO EBIT Waterfall (FT Salmon)</th>
  <th>Enterprise Harvey Matrix</th>
  <th>Governance &amp; Org Tree (Gov Chrome)</th>
</tr>
<tr>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-finance-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-finance-en.webp" alt="Financial FT Salmon theme pairing vector EBIT waterfall bridge with dense driver attribution cards" width="100%"></a></td>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-harvey-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-harvey-en.webp" alt="6x4 enterprise procurement Harvey ball capability matrix with highlighted Ours column and native vector symbols" width="100%"></a></td>
  <td width="33%"><a href="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-gov-org-en.webp"><img src="https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/gallery/v22-gov-org-en.webp" alt="Gov Ceremonial double-rule header with bracketed ribbon kicker and CDO four-center organizational tree" width="100%"></a></td>
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

1. **Draft in seconds (two ways)**:
   - **Self-serve in the Workbench**: Open **Presentations** in the sidebar and click **New presentation** to start from any of the 20 scenario blueprints (Quarterly OKR, Product PRD, Investor Memo, Industry Research, Project Update, Defense, etc.), paste rough Markdown notes, or upload a reference `.pptx`.
   - **Ask in Chat**: Share your notes, data, or reference `.pptx` path (or copy a ready-made prompt from the workbench guide) — Auto-Director picks a projector-safe theme and varied layouts automatically.
2. **Click-to-edit & upgrade layouts**: Click any title, card, or table in the live preview to focus its editor field; switch bullets into **KPI metrics, Marimekko market maps, Sankey flows, Porter Value Chains, SWOT matrices, Gantt timelines, Architecture diagrams, Harvey-ball matrices, or academic 3-line tables** (plus native LaTeX `formula`s) in one click, then press `Ctrl/⌘+S` or **Save slide**.
3. **Import `.pptx`, round-trip Office edits & save your brand**: Click **Import & Modernize .pptx** to refurbish legacy `.pptx` files into modern decks, or upload polished PowerPoint/WPS changes via **Sync Edited .pptx** as an undoable revision; in **Style Studio**, apply 8 Master Presets or save a corporate `.pptx` style into **My Brand Library**.
4. **Present, verify & deliver**: Render the current PPTX for **side-by-side HTML & PPTX inspection** (or run optional AI storyline coaching, rehearsal, or 24-slide visual repair); press `P` during standalone HTML playback for **Dual-Screen Presenter View** (`L` for laser pointer), and download PPTX, **Handout (`.md`)**, or Share ZIP.

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

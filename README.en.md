# dsh-ppt

[中文](README.md)

![dsh-ppt whale girl plugin cover](https://raw.githubusercontent.com/STARDUSTLC666/dsh-ppt/master/assets/cover-whale-girl.png)

Turn source material into a finished HTML slideshow, editable PPTX and reusable project bundle. Edit in DSH, trace numeric sources and explore live scenarios; AI review, rehearsal and visual repair are optional, so you can download the finished deck directly.

[![npm](https://img.shields.io/npm/v/dsh-ppt)](https://www.npmjs.com/package/dsh-ppt) [![downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-downloads.svg)](https://www.npmjs.com/package/dsh-ppt) [![total downloads](https://raw.githubusercontent.com/STARDUSTLC666/dsh-suite/npm-downloads/assets/dsh-ppt-total-downloads.svg)](https://www.npmjs.com/package/dsh-ppt)

[Download statistics](https://github.com/STARDUSTLC666/dsh-suite/blob/npm-downloads/README.md)

Feedback and contributions are welcome: report [issues](https://github.com/STARDUSTLC666/dsh-ppt/issues) or submit [pull requests](https://github.com/STARDUSTLC666/dsh-ppt/pulls).

Open the workbench from the native DSH sidebar. See the [workbench guide](docs/WORKBENCH.md) for configuration and operating boundaries.

## What it does

- Search projects and sort by update time or natural title; keep filters when returning to the library.
Optional **visual review and repair** inspects images rendered from the actual PPTX, highlights problem regions, creates a formatting-only copy and renders it again for rechecking. The original stays intact. See [visual review](docs/VISUAL.md#english).

Optional **AI review** and **rehearsal** reuse models configured in DSH. Both are off by default: download the finished presentation directly, or explicitly start a bounded rehearsal. Compare proposed wording edits, save selected changes and backup Q&A slides to an undoable copy, and export Q&A with an evidence checklist. See [the rehearsal guide](docs/COACHING.md#english). AI suggestions are not fact checks.

- Create branded decks with text, images, tables and native charts.
- Optionally trace numbers to material, CSV cells or formulas; adjust assumptions, preview affected slides, and save an undoable copy. HTML stays interactive; PPTX includes confirmed static values with formulas and assumptions. See the [data guide](docs/DATA.md#english).
- Edit text and images in Settings, reorder, duplicate or delete slides, and undo changes.
- Check quality and optionally render the final PPTX as images or PDF.
- Download Markdown speaker notes with each slide's current title and notes.
- Choose a share bundle (PPTX, offline HTML and current speaker notes) or a project bundle (including the editable JSON). Share bundles retain bound source excerpts and authored content. See [download details](docs/WORKBENCH.md#下载与分享--download-and-share).
- Keyboard support: Ctrl/⌘+S save, Esc cancel or go back, Alt+←/→ switch slides; leaving with unsaved edits prompts first.

## Install

In DSH Desktop, install `dsh-ppt` from the Plugins panel. If the bundled dsh command is available:

```bash
dsh plugin --profile desktop add dsh-ppt
```

For the web version, replace `desktop` with `web`. Restart DSH after installation.

## Start using it

1. Provide material, purpose, audience and slide count in the target workspace; request HTML, PPTX and project files.
2. Open Presentations in the sidebar and search for or select the generated project.
3. Edit slide text, images or order, save and inspect the preview; render the current PPTX when you need to inspect its actual output.
4. Explicitly start optional AI review, rehearsal or visual repair when needed; direct download does not require them.
5. Deliver the share bundle or retain editability with the project bundle; check the result in the target browser or Office application.

Office changes do not sync back to JSON. Externally changed outputs and legacy projects without integrity records cannot be overwritten. Use **Save a copy** or `ppt_edit(saveAs:true)` to rebuild a new trio from JSON while preserving the originals. The copy does not import Office edits.

## Requirements and configuration

Normal generation does not require Office. Final PPTX rendering uses the optional official LibreOffice Kit; see the guide for dependencies, fonts and installation.

Detailed configuration, tool arguments and troubleshooting are in the [usage guide](docs/USAGE.en.md). For standalone development, follow the Node requirement in [package.json](package.json).

## Documentation

- [Usage and troubleshooting](docs/USAGE.en.md)
- [Changelog](CHANGELOG.md)
- [Validation scope and history](docs/VALIDATION.md)
- [Report a problem or suggest a feature](https://github.com/STARDUSTLC666/dsh-ppt/issues)

## Plugin updates

Requires DSH 0.2.1-rc.3 or newer. Update controls sit at the bottom of the existing workbench, or native plugin details for plugins without a workbench. Checks, release notes and preferences expand in place, with no separate update page or settings menu. Automatic checks are on by default; **automatic installation is off by default**. Only explicit opt-in permits compatible stable patches while idle with no unsaved changes. Preferences are independent, with per-plugin disable, deferral and ignore controls. No forced DSH restart or upgrade, and local-source installations stay unchanged. Suite components explain and operate on the whole Suite in the same footer.

Older releases need one manual update in native plugin management to acquire these controls. Publishing to npm does not replace an existing user installation.

## License

[MIT](LICENSE)

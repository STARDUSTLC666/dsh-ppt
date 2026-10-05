# dsh-ppt usage guide

[Overview](../README.en.md) · [Changelog](../CHANGELOG.md) · [Validation](VALIDATION.md)

## Current improvements

Save workbench edits, then choose Download delivery ZIP. Individual downloads remain available. The ZIP excludes configuration, secrets and other workspace files; each file is limited to 64 MiB and the total to 128 MiB.

## Capabilities

| Capability | Description |
| --- | --- |
| `ppt_create` tool | Markdown / structured slides → `*.html` + `*.pptx` + `*.json` |
| `ppt_themes` tool | Lists the 5 built-in themes and their best use cases; pass `preview: true` with `outputDir` to write a side-by-side gallery plus one SVG palette card per theme |
| 11 layouts | cover / section / bullets / statement / quote / table / closing / image / image-left / image-right / chart |
| Speaker notes | `<!-- note: ... -->` comments or the `notes` field: press `S` in the HTML player; native PPTX notes slides (presenter view) |
| Motion | On by default: HTML slide-in transitions + staggered bullet entrances; native PPTX fade transitions + click-to-reveal bullets. `motion: 'off'` / `--motion off` for a fully static deck |
| Markdown extras | Tables (`\| ... \|`), blockquotes (`>`), and note comments are auto-detected into matching layouts |
| `dsh-ppt` skill | A complete six-step SOP registered into DSH |
| Standalone SKILL.md | Copy `skills/dsh-ppt/` into Claude Code / Cursor / Gemini CLI / Codex for cross-harness use |
| Visual engine | Reuses the hyperframes visual style library; HTML and PPTX share the same theme source |

Example:

> Turn this sentence into a deck: "AI support cuts first response time to 8 seconds", with a dark tech theme.
>
> Turn `docs/quarterly-review.md` into a bilingual presentation and export PPTX.

## Installation

```bash
dsh plugin --profile web add dsh-ppt
```

On desktop, install `dsh-ppt` through plugin management. Restart the host after updating to load seven tools and the skill. Ask naturally to include screenshots/charts, edit only slide three, or undo the last edit; users do not need to write JSON.

## Uninstall

```bash
dsh plugin --profile web remove dsh-ppt
```

Then restart the web service. To clean up fully, also remove the plugin entry from your profile `cordis.patch.yml` if you overrode it.

## Quick start

### Inside DSH (recommended)

```
1. ppt_themes { preview: true, outputDir: "dist" }   # themes + gallery
2. ppt_create {
     title: "Fewer Meetings",
     content: "# Problem\n- Too many meetings\n\n# Solution\n- Async decisions",
     theme: "data",
     lang: "en"
   }
3. Open the returned HTML path in a browser; edit the PPTX in PowerPoint / WPS / Keynote
```

### Any harness (standalone SKILL.md)

Copy `skills/dsh-ppt/` to any Agent Skills directory, then:

```bash
node <skill-dir>/scripts/build-deck.mjs \
  --title "Product Launch" \
  --content deck.md \
  --theme data \
  --lang en \
  --out dist/deck
```

Artifacts:

Existing artifacts are not overwritten by default: if any member of the trio already exists, the whole set receives a shared `-1`, `-2`, ... suffix. Replacement requires explicit `overwrite: true` (or `--overwrite` in the CLI).

| File | Purpose |
| --- | --- |
| `*.html` | Standalone slideshow: arrow keys, V presenter view (separate window with real current/next previews, thumbnail strip, notes, timer, progress, pause, font size, blank screen), S notes, G thumbnail overview, F fullscreen, P print, ? shortcuts, Esc close |
| `*.pptx` | Editable 16:9 presentation (hand-written OOXML, zip via `node:zlib`, no third-party deps) |
| `*.json` | Structured manifest (version, theme, language, slides) |

## Images, charts, editing and review

### Lightweight Settings editor (0.8.0)

Open Settings → Presentations and choose a project registered by `ppt_create`, `ppt_edit` or `ppt_check`. Select a page to edit text, bullets and speaker notes; clicking text in the HTML preview focuses its field. Upload PNG/JPEG images, reorder pages and undo changes. Saving regenerates HTML, PPTX and JSON together.

Save or cancel pending changes before switching pages, reordering, downloading or rendering. A stale revision cannot overwrite another writer's changes. Use “Load latest, keep my input”, review overlapping fields, then explicitly save. The HTML preview and actual PPTX rendering are separate; edits invalidate previous renders. Review every rendered page and font diagnostics before downloading the latest files. The editor works with this plugin's own JSON projects; it does not import arbitrary external PPTX files, and ordinary generation/editing does not need the optional renderer.

The additional tools are `ppt_templates`, `ppt_edit`, `ppt_undo`, `ppt_check`, and `ppt_render`. New layouts are `image`, `image-left`, `image-right` and `chart`, alongside the seven existing layouts.

An image slide accepts `image: {src, alt, fit: "contain"|"cover", caption}`. Use local PNG/JPEG paths relative to session cwd or matching data URIs. Assets are embedded in all outputs and undo works after original files move. Limits: 5 MiB / 32 megapixels per image, 32 MiB total project assets. Remote links and SVG are not automatically downloaded or converted.

A chart accepts `chart: {kind:"column"|"bar"|"line"|"pie", categories, series:[{name,values}], unit, caption}` or `rows` with a category/series header. Values must be finite with matching lengths. Pie requires one nonnegative series with a positive total. HTML uses accessible SVG and data tables; PPTX contains native charts and embedded editable workbooks.

`brand` supports `name`, `primaryColor`, `backgroundColor`, `textColor`, `fontFamily`, `logo` and `footer`. Colors are `#RRGGBB`; select a font available on the recipient computer. `template` is `weekly|defense|project|pitch` and does not overwrite a supplied narrative.

Edit example: `{deckPath:"report.json",expectedRevision:0,edits:[{slide:3,patch:{title:"A clearer conclusion",bullets:["Evidence","Next action"]}}]}`. Use `ppt_check` to obtain stable IDs and the revision; `ppt_undo` restores the latest edit including assets/brand. Keeps up to 20 edits and rejects stale revisions. The artifact trio is regenerated atomically with rollback on commit failure.

`deliveryStatus: draft` means unfilled slots; `ready-for-review` means review can start. Static estimates, rendering and visual inspection are recorded separately. Generation/rendering never automatically certifies visual quality. Inspect HTML and every page image before delivery.

## Optional PNG/PDF renderer

Install in the plugin's project or standalone skill directory:

```bash
npm install --ignore-scripts @deepseek-ai/libreoffice-kit@0.1.5
```

The exact optional peer is not a mandatory engine download for ordinary consumers. Windows also needs the Microsoft Visual C++ v14 runtime matching Node's architecture. Missing dependency/engine returns `unavailable` with guidance.

`ppt_render {pptxPath:"report.pptx",format:"both"}` reads the final PPTX without resaving it and returns page PNGs, PDF and `receiptPath`. Pass that path as `renderReceipt` to `ppt_check` to recheck the current PPTX and every output's digest. Editing the source or outputs invalidates the receipt. Static artifacts do not retain animation. LibreOffice/PowerPoint/WPS may lay out files differently; font diagnostics do not guarantee every glyph or install fonts. See [integration details](../docs/LIBREOFFICE-INTEGRATION-2026-10-01.md).

This repository's pnpm overrides are not inherited by consumers. If an installed renderer's audit reports `fflate@0.8.2`, set `overrides: { "@deepseek-ai/libreoffice-kit": { "fflate": "0.8.3" } }` in the consumer's root package.json (npm), or `overrides: { "@deepseek-ai/libreoffice-kit>fflate": "0.8.3" }` in its root pnpm-workspace.yaml, then reinstall. The plugin also validates PPTX/ZIP64 bounds before rendering; that check does not replace updating the underlying dependency.

CLI supports `--slides @slides.json`, `--brand @brand.json`, `--template weekly`, `--edit report.json --edits @edits.json --revision 0`, `--undo report.json --revision 1`, `--check report.json`, and `--render report.pptx --format both`. Explicit receipt validation uses `--check report.json --render-receipt path/to/render-receipt.json`; failure returns a nonzero exit code.

For standalone usage copy the entire skill directory and run `npm install --ignore-scripts` there. Plain text remains usable without Office Kit; image/chart/logo/footer PPTX export needs Office Kit 0.21.0. `dsh-ppt/deck-advanced` exports `buildDeckAsync`, `editDeck`, `undoDeck`, `checkDeckAsync` and `renderDeck`. The legacy synchronous `deck-core` API supports plain text and explicitly rejects unsupported media inputs.

## Theme palette

| ID | Name | Mood | Best for |
| --- | --- | --- | --- |
| `data` | Data Drift (default) | Futuristic / immersive | AI, tech launches, research |
| `swiss` | Swiss Pulse | Precise / rational | Data, SaaS, developer tools |
| `velvet` | Velvet Standard | Premium / restrained | Executive decks, brand, investor pitches |
| `soft` | Soft Signal | Warm / human | Brand stories, training, personal talks |
| `bold` | Maximalist Type | Loud / kinetic | Product launches, events, big moments |

Themes are derived from [dsh-hyperframes](https://github.com/STARDUSTLC666/dsh-hyperframes) `visual-styles.md`. Full palettes: `skills/dsh-ppt/references/themes.md`. Run `ppt_themes { preview: true, outputDir: "dist" }` for a side-by-side gallery and SVG palette cards.

## Markdown input rules

- The first `# heading` becomes the cover title; its first paragraph becomes the cover subtitle.
- Each `## section` becomes one slide: lists produce `bullets` slides; empty sections produce `section` dividers.
- Plain text without headings: the first paragraph is the cover, then every 5 sentences become one slide.
- A single sentence automatically produces a complete 3-slide structure: cover → core idea → closing.
- Long tables paginate automatically with repeated headers and up to 8 data rows per page. Notes stay on the first page. Tables support 8 columns and 60 characters per cell; oversized input returns an actionable error. Short rows are padded consistently in all artifacts.
- `maxSlides` counts pages after expansion. Exceeding it fails before writing files; raise the limit (up to 120) or split the deck. Middle slides are never silently discarded.
- For precise control, use structured `slides` (`cover | section | bullets | statement | quote | table | closing`), with `rows` for tables and `notes` for speaker notes.

## Configuration

No required configuration. Optional:

```yaml
- id: dsh-ppt
  config:
    outputDir: E:\decks   # optional; defaults to the session working directory
    maxSlides: 40         # optional; default 60 (3–120)
    defaultTheme: data    # optional; used when ppt_create has no theme
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
- Images and native charts use MIT-licensed `@office-kit/pptx@0.21.0`; optional rendering is loaded on demand.
- Unit tests cover registration contracts, JSON Schema, theme resolution, Markdown parsing, artifact generation, PPTX part integrity, and the CLI.
- No `eval` / `child_process` / secrets; artifacts are only written to the user-specified local directory.

## Development

```sh
pnpm install
pnpm run build      # tsc → lib/
pnpm test           # build + node --test (registration/config/engine/CLI)
pnpm run smoke:cli  # bare CLI smoke test, generates .smoke-deck
```

## Known limitations

- The PPTX uses a blank layout plus text boxes: text is editable in PowerPoint / WPS, but no smart master placeholders yet.
- A one-sentence input produces a minimal 3-slide structure; for richer decks, expand the content into a Markdown outline first.
- `bilingual` only localizes the player UI; it does not translate content.
- Selected-page editing supports this plugin's JSON project, not arbitrary external PPTX editing.
- Text fit checks are static estimates; inspect actual rendered output for clipping and font substitution.

## License

Plugin: MIT. Office Kit: MIT. Optional official LibreOffice Kit and its engine retain their own source/license/third-party notices. This community plugin is not officially maintained by DeepSeek.

## Related projects

- [dsh-hyperframes](https://github.com/STARDUSTLC666/dsh-hyperframes) — HTML video skills (source of this plugin's visual styles)
- [dsh-remotion](https://github.com/STARDUSTLC666/dsh-remotion) — React programmatic video skills
- [dsh-email](https://github.com/STARDUSTLC666/dsh-email) — Email toolset

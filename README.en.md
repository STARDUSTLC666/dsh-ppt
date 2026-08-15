# dsh-ppt

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)

> **One sentence or one document → a complete presentation**: HTML web slideshow + PPTX export, 5 visual themes, bilingual Chinese/English.

DeepSeek Harness (DSH) presentation skill + tool plugin: turns a sentence, a paragraph, or a Markdown document into a ready-to-present **HTML slideshow** and an editable **PPTX**. Pure Node, **zero runtime dependencies**, one codebase for Windows / macOS / Linux.

## Capabilities

| Capability | Description |
| --- | --- |
| `ppt_create` tool | Markdown / structured slides → `*.html` + `*.pptx` + `*.json` |
| `ppt_themes` tool | Lists the 5 built-in themes and their best use cases |
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

After restart, the `ppt_create` / `ppt_themes` tools and the `dsh-ppt` skill are available. The plugin ships with an empty config and **won't crash startup**.

## Quick start

### Inside DSH (recommended)

```
1. ppt_themes                        # inspect the 5 themes
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

| File | Purpose |
| --- | --- |
| `*.html` | Standalone web slideshow: arrow keys/wheel/touch navigation, F fullscreen, G overview, P print/save as PDF |
| `*.pptx` | Editable 16:9 presentation (hand-written OOXML, zip via `node:zlib`, no third-party deps) |
| `*.json` | Structured manifest (version, theme, language, slides) |

## Built-in themes

| ID | Name | Mood | Best for |
| --- | --- | --- | --- |
| `data` | Data Drift (default) | Futuristic / immersive | AI, tech launches, research |
| `swiss` | Swiss Pulse | Precise / rational | Data, SaaS, developer tools |
| `velvet` | Velvet Standard | Premium / restrained | Executive decks, brand, investor pitches |
| `soft` | Soft Signal | Warm / human | Brand stories, training, personal talks |
| `bold` | Maximalist Type | Loud / kinetic | Product launches, events, big moments |

Themes are derived from [dsh-hyperframes](https://github.com/STARDUSTLC666/dsh-hyperframes) `visual-styles.md`. Full palettes: `skills/dsh-ppt/references/themes.md`.

## Markdown input rules

- The first `# heading` becomes the cover title; its first paragraph becomes the cover subtitle.
- Each `## section` becomes one slide: lists produce `bullets` slides; empty sections produce `section` dividers.
- Plain text without headings: the first paragraph is the cover, then every 5 sentences become one slide.
- A single sentence automatically produces a complete 3-slide structure: cover → core idea → closing.
- For precise control, use structured `slides` (`cover | section | bullets | statement | closing`).

## Configuration

No required configuration. Optional:

```yaml
- id: dsh-ppt
  config:
    outputDir: E:\decks   # optional; defaults to the session working directory
    maxSlides: 40         # optional; default 60 (3–120)
```

The `DSH_PPT_OUTPUT_DIR` env var can also set the default output directory; the `ppt_create` `outputDir` argument has the highest priority.

## Bilingual support

- `lang` argument: `zh` (default) / `en` / `bilingual` controls the player UI, page numbers, and closing defaults.
- Content language is up to the author: for a bilingual deck, prefer "Chinese title + English subtitle" or generate two decks from the same outline.
- Plugin docs, skill content, and error messages are bilingual.

## Engineering quality

- Pure Node, zero runtime dependencies: HTML template, OOXML, and zip are hand-written using only `node:fs` / `node:path` / `node:zlib`.
- The skill and tools share one engine (`skills/dsh-ppt/scripts/deck-core.mjs`), so DSH and bare-skill output are identical.
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
- Charts, images, speaker notes, and PPT animations are planned for v0.2+.

## License

MIT. Community plugin, not affiliated with DeepSeek; `@deepseek-ai/*` is an officially reserved namespace.

## Related projects

- [dsh-hyperframes](https://github.com/STARDUSTLC666/dsh-hyperframes) — HTML video skills (source of this plugin's visual styles)
- [dsh-remotion](https://github.com/STARDUSTLC666/dsh-remotion) — React programmatic video skills
- [dsh-email](https://github.com/STARDUSTLC666/dsh-email) — Email toolset

# Historical release notes

[Current changelog](../CHANGELOG.md) · [Overview](../README.en.md)

These English notes preserve the earlier translations. The main changelog contains the consolidated version history.

## 0.7.0 (2026-10-02)

- Generated HTML decks now have previous/next buttons and page-number navigation, with keyboard, touch and a usable 390px layout.
- A Review and export panel shows quality findings and the outline, links findings to their slides, and offers editable PPTX and project JSON downloads.
- Incomplete drafts are clearly labeled. Static checks are guidance and require visual review before delivery; layout editing remains available through Agent project tools or PowerPoint/WPS.
- Download links target the actual sibling files, including Unicode filenames and collision renaming. The existing three-file offline delivery format is preserved.
- All 103 tests pass on Windows, with Chinese and English browser interaction checks. Native Office and the DSH desktop window were not verified in this round.

## 0.6.0 (2026-10-01)

Adds image/text layouts, four native editable chart types, selected-page edits and undo, page-specific quality reports, four scenario outlines and shared branding. Optional official LibreOffice Kit rendering reads the final PPTX to produce PNG/PDF with font diagnostics. Fixes overlapping overview thumbnails, undersized table titles, image-caption spacing and chart labels.

The goal remains a usable finished deck. The agent prepares actual facts and content; the deterministic generator does not research or invent missing facts. Template-only output is explicitly an unfilled **draft** and must not be delivered as a finished presentation.

Default PPTX fonts use platform fallbacks and explicit East Asian families separately from HTML's CSS font stacks. Replace missing fonts, regenerate and review the pages; unresolved font problems must be disclosed instead of claiming acceptance.

Validation: Windows / Node 24.16.0, 100 passing tests; 18 components mount together on official-source Harness 0.2.0-rc.2 (639ed01539) with 104 tools and 35 skills. Fifteen default-theme pages without brand overrides passed native PNG/PDF rendering and individual visual review; an eleven-page image/chart/brand sample was checked in the browser, Microsoft PowerPoint and the official Kit. This covers those samples, not automatic acceptance of arbitrary decks.

## 0.5.0 (2026-09-24)

Includes presenter previews, thumbnails and timer controls. Unsupported or rejected fullscreen requests now show an actionable message instead of silently failing.

Validation host: Harness `0.2.0-rc.1` built from official sources (commit `407e65c8`) with Node `24.16.0` on 2026-09-28. All 70 plugin tests pass in an isolated environment; all 18 plugins mount together in one host registering 1 skills and 2 tools, with tool schemas and health-check contracts passing. No live ports or external services were exercised in this round.

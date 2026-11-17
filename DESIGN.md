# apibldr Design System

## Intent and reference

Developers create API contracts through visual forms and editable source, then
export portable specifications. Preserve imported fields and unfinished drafts.
The visual reference is the current [apibldr.com](https://apibldr.com/) designer:
its cyan-to-slate header, ApiBldr logo, dark navigation rail, tabbed sidebar, and
compact form controls. The refreshed UI keeps that identity while improving
readability and action priority. Use the local `public/apibldr-logo.png` brand asset.

## Layout

```text
ApiBldr   New API · Change specification      Theme · GitHub · Help · Fullscreen
----------------------------------------------------------------------
Menu     | API Designer                   Saved  Undo Redo Import Export
Designer |------------------------------------------------------------
         | General Paths Components | Design / Information
Code     | API Details              | API TITLE       API VERSION
Source   | API Security             | DESCRIPTION
         | API Documentation        | TERMS OF SERVICE
Validate | Servers / Tags           | LOGO URL
Validation                          | Operations / document checks
----------------------------------------------------------------------
         | OpenAPI version                              Action feedback
```

Designer, Source, and Validation are separate views. Source and Validation use
the full content width. At 768px and wider, toolbars stay visible while forms and
navigation scroll independently; the rail is 80px and sidebar 280px (300px at
1280px). Below 768px the rail becomes horizontal, forms stack, and navigation
height is bounded. All navigation links perform a real action. Component categories stay in Designer with guidance and quick adds. Complex fields use scoped JSON editors; Source remains available for the complete contract.

## Type, color, and spacing

- Bundled Source Sans Pro 400/600 for interface text; JetBrains Mono for source,
  paths, and status codes. Type scale: 13, 14, 16, 20, 24px.
- Light surfaces: `--bg #f3f6fa`, `--surface #ffffff`, `--subtle #f0f4f8`.
  Text `#26364a`, muted `#61738a`, accent `#2869b2`, borders `#dce4ee`.
- Dark surfaces: `#121923`, `#1b2533`, `#243246`; text `#e9eff7`, muted
  `#a8b7c9`, accent `#86c5ff`, borders `#33445a`.
- Brand gradient: `#20b4d4` to `#383d4e` in light; `#087d9d` to `#262d3b`
  in dark. Rail: `#383d4e` / `#171d29`.
- Spacing: 4, 8, 12, 16, 24, 32px. One-pixel borders, 6px radii, no decorative
  shadows. Hover transitions 120ms; respect reduced motion.
- Export is the filled blue primary action. Import is neutral outlined; New API
  and history controls are quiet. Apply source takes priority for an unfinished
  source draft.
  HTTP methods use text labels and color. Status must never rely on color alone.

## Interaction and state rules

Light/Dark/System is always available. Persist the preference; System follows
live OS changes. Theme both forms and CodeMirror. Explicit labels, visible focus,
and native controls support keyboard access. All interactive targets are at least 44px.

Import shows pending/error/success and retains the current API on failure. Empty
and filtered operation lists explain the next action. Invalid source stays
editable and blocks conflicting visual changes/export until applied or undone.
Autosave failures offer retry and recovery. Undo restores replacements and
removals. Distinguish basic authoring checks from on-demand specification schema checks;
report unchecked external references. If CodeMirror
fails to load, retain source in an editable plain-text fallback.

## Autocomplete

Source suggestions follow the current OpenAPI or AsyncAPI context and reuse the theme's
surface, text, border, and selected-state tokens. Show the keyboard shortcut
next to the editor. Enter accepts and Escape dismisses; suggestions never apply
the draft or export it. Avoid suggestions inside comments or prose. Form fields
use native datalists with visible labels and retain free-text entry. Generate
operation IDs from method/path while avoiding existing IDs. Exclude response
codes already present; offer descriptions without changing the user's text.

## Usability refinement

Keep Source Sans Pro and JetBrains Mono; use 24px/600 content headings, 20px/600
section headings, 16px form text, and 14px supporting text. The workbench stays
dense in navigation with 24–32px separation between editing sections.

Use the existing blue accent for the primary action and selected navigation;
neutral tabs have a strong underline on the selected item. Counts are neutral
badges, with warning colors reserved for problems. Control borders use
`--control-border: #7c8fa7` (light) / `#657b96` (dark). Selected navigation uses
`--selected: #eaf2fc` / `#2c4058`. Keep cool gray surfaces and borders as the
separation language.

Labels sit above fields. Title/version and summary/operation ID share a row
on wide screens and stack on narrow screens. Limit form content to 960px.
Additional metadata is behind a native disclosure; reveal it initially if it
already contains values. Keep response forms and source shortcuts easy to find.
Use sentence case for navigation and explain the source-only sections.

## Form and workspace refinement

Keep the low-contrast type scale of an expert tool: 24px/600 content headings,
20px/600 workspace headings, 16px inputs, and 14px helper text. Source Sans Pro
and JetBrains Mono remain the only font families.

Use a cool canvas behind bordered form panels. In dark mode, the canvas is
`#121923`, panels `#1b2533`, secondary surfaces `#243246`, and inputs `#152030`.
Text is `#e9eff7`, muted text `#a8b7c9`, dividers `#33445a`, and control borders
`#657b96`. The existing blue accent identifies the primary action and selection.
Light mode uses `#f3f6fa` canvas, white panels/inputs, and `#f0f4f8` secondary
surfaces. All values belong in the stylesheet token layer.

Align form content to the left of the editor, capped at 960px. Use 24px inside
panels and between field groups, 8px between labels and controls, and 32px at
editor edges. Panels use the existing 6px radius and one-pixel borders. Join the
Markdown toolbar and text area into one control. Keep toolbar buttons quiet,
with visible hover and focus states. On narrow screens, reduce outer padding to
16px and stack title/version fields. Preserve 44px interactive targets.

Group document actions beside the brand and utilities at the right. Keep the
navigation toggle above the left rail's workspace views. GitHub resources and
feedback use the same header control dimensions; the footer clock stays secondary.

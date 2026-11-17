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
ApiBldr / Visual API Designer                         Light Dark System
----------------------------------------------------------------------
Design   | API Designer          New API  Saved  Undo Redo Import Export
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
- Light surfaces: `--bg #f5f7fa`, `--surface #ffffff`, `--subtle #f1f3f6`.
  Text `#414852`, muted `#687681`, accent `#2869b2`, borders `#dce1e7`.
- Dark surfaces: `#1c2230`, `#252d3b`, `#2e3849`; text `#e4e9f0`, muted
  `#b3bfce`, accent `#86c5ff`, borders `#465267`.
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
removals. Label checks as basic, never full OpenAPI validation. If CodeMirror
fails to load, retain source in an editable plain-text fallback.

## Autocomplete

Source suggestions follow the current OpenAPI context and reuse the theme's
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
`--control-border: #8493a3` (light) / `#71839a` (dark). Selected navigation uses
`--selected: #eaf2fc` / `#2c4058`. Keep cool gray surfaces and borders as the
separation language.

Labels sit above fields. Title/version and summary/operation ID share a row
on wide screens and stack on narrow screens. Limit form content to 960px.
Additional metadata is behind a native disclosure; reveal it initially if it
already contains values. Keep response forms and source shortcuts easy to find.
Use sentence case for navigation and explain the source-only sections.

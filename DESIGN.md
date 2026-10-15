# Design system

The page is a working tool, and its visual world is a radio studio. A voice reading your text is a broadcast, so the playback state is shown the way a studio shows it: with a cue lamp. The world contributes type, palette, density and that one signature. Layout and controls stay standard web controls. All tokens live at the top of `src/style.css`.

## Signature: the cue lamp

`#playback-caption` (`.lamp`) sits beside the running time, directly above Listen/Stop. Its text is the existing playback caption, and its colour follows `form[data-playback]`. Its shape is a pill with a 10px bulb, never the 6px-radius rectangle the buttons use, so it never reads as a control. The caption stays on one line (it may wrap only below 380px).


| State | Look |
|-------|------|
| `idle` (ready, stopped, finished, unsupported) | Unlit: dark `--lamp-off` lens, `--lamp-bulb` bulb, `--lamp-off-ink` text, 1px inner edge |
| `starting` | `--standby` amber, pulsing to `--standby-dim` (900ms alternate) |
| `speaking` | `--live` red, white bulb and text; a 700ms over-bright flash as it lights, then light cast below it |

The rule is one colour per state. Red and amber appear nowhere else on the page. Lamp colours change over 450ms with `--ease-out`. Under `prefers-reduced-motion`, every animation and transition is off.

## Colour

Light and dark themes are set by `html[data-theme]`, which an inline head script resolves (saved choice first, then the system preference) before first paint. The console is the one committed colour field and stays studio blue in both themes.

| Token | Dark | Light | Use |
|-------|------|-------|-----|
| `--ground` | `#0b1020` | `#e7ebf2` | Page background, `theme-color` |
| `--paper` | `#121a2c` | `#ffffff` | Editor, dialog |
| `--paper-locked` | `#0f1626` | `#f3f5f9` | Editor while playback locks it |
| `--ink` | `#e8ecf5` | `#131a2c` | Text |
| `--muted` | `#a0abc4` | `#4b5672` | Secondary text (≥ 7:1 on paper) |
| `--line` / `--line-strong` | `#243049` / `#3a4766` | `#d3d9e4` / `#b5bfd0` | Hairlines, panel border |
| `--accent-text` | `#9db4f0` | `#26407f` | Second headline line, wordmark dot |
| `--focus` | `#8fb0ff` | `#2348b8` | Focus ring (white inside the console) |
| `--console` | `#24366a` | same | Voice settings and transport panel |
| `--console-deep` | `#1b2a55` | same | Select field |
| `--console-ink` / `--console-muted` | `#f2f5fb` / `#b9c4de` | same | Text on the console (≥ 6.6:1) |
| `--track` | `#7486b4` | same | Empty slider track (≥ 3.2:1) |
| `--lamp-off`, `--lamp-bulb`, `--standby`, `--live` | `#16224a`, `#3b4a76`, `#f4a93b`, `#d02b22` | same | Cue lamp only |

## Type

One family: **Archivo** (variable, weight 100–900, width 62–125%), self-hosted through `@fontsource-variable/archivo/wdth.css` and set as `--font-sans` in Tailwind's `@theme`. Width carries the signage character, and weight carries rank.

| Token | Size | Where |
|-------|------|-------|
| `--text-display` | `clamp(2.5rem, 1.45rem + 3vw, 4.25rem)` | `h1`: "Your words." 820 weight at 118% width; "A little more alive." 340 weight in `--accent-text` |
| `--text-time` | 1.625rem | Running time, tabular numerals, 88% width |
| `--text-title` | 1.5rem | Dialog title |
| `--text-editor` | `clamp(1.125rem, 1.05rem + 0.3vw, 1.25rem)` | Textarea, line-height 1.6 |
| `--text-action` | 1.125rem | Listen/Stop |
| `--text-ui` | 1.0625rem | Pane headings, field labels, readouts |
| `--text-body` | 1rem | Select, base |
| `--text-small` | 0.9375rem | Help, meta, status. **The floor: nothing smaller.** |

Lamp text: `--text-small`, weight 720, width 72%, tracking 0.04em, uppercase. Condensed caps belong to the lamp alone.

## Space, shape, layout

- Spacing: `--space-1` to `--space-12` on a 4px base. `--gutter` is `clamp(1rem, 4vw, 4rem)` and `--pane-pad` is `clamp(1rem, 2.2vw, 1.75rem)`.
- Radii: `--radius-field` 6px (fields, buttons) and `--radius-panel` 12px (workspace, dialog). The lamp and the theme toggle are pills.
- Workspace: a grid that clips its corners with `overflow: clip`, not `hidden`, so sticky positioning still works.
  - 760px and up: editor on the left, spanning two rows; console top-right; transport bottom-right, at a width of `clamp(19.5rem, 30vw, 25rem)`.
  - Below 760px: one column, and `.transport` is `position: sticky; bottom: 0`. The lamp and time share a row, with the full-width Listen/Stop and then the status line under them.
  - Below 380px: the logo square is hidden.
- The intro sits side by side from 960px: the headline on the left, the supporting text in a column up to 25rem wide on the right.

## Components

- **Text button** (`.text-btn`): 44px tall, `--text-small` at 600 weight, muted, with an underline that appears on hover.
- **Primary button** (`.play-btn`): `--console-ink` fill on the console, ink text, 56px tall (52/48px on phones). Play and stop icons switch through CSS on `data-playback`.
- **Solid button** (`.btn-solid`): `--solid` fill. Used in the dialog.
- **Select**: native `<select>` with `appearance: none`, `--console-deep` fill and a chevron icon.
- **Slider**: native range input. The track is drawn with three background layers: a 1× notch at `--default`, the fill up to `--pct` (set by `main.js`), and the empty track. The thumb is a 22px white disc with a 4px ring in the console colour.
- **Icons**: inline SVG on a 24px grid, 1.75px stroke, round caps. Play and stop are filled.
- **Hover**: styles apply only under `@media (hover: hover)`.

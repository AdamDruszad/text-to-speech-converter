# Audit and redesign notes

Audited version: branch `codex/frontend-fixes-20261007-141014` at `a372d60` (Vite 8, Tailwind CSS 4, vanilla JS, Web Speech API, no backend).
Screenshots (kept out of git, see `.git/info/exclude`):

- Baseline: `docs/redesign-screenshots/before/dark-home-{390,1440}.png`
- Every UI state at both widths: `docs/redesign-screenshots/before/states/<state>-{390,1440}.png` (`default`, `light`, `filled`, `empty-error`, `starting`, `speaking`, `speaking-light`, `finished`, `play-error`, `unsupported`, `no-voices`)

States were captured with `.claude/tools/tts-states.mjs`, which stubs `window.speechSynthesis` per scenario (three fake voices, or none, or no API) without touching app code. Headless Edge itself exposes one real voice (Microsoft Szabolcs, hu-HU).

## Scores before the redesign

| Area | Score | Evidence |
|------|------:|----------|
| Visual design & consistency | 6/10 | Coherent palette, spacing and borders; polished at 1440px. But 14 distinct font sizes from 8px to 44px with no scale (`src/style.css`, 8px ×3, 9px ×11, 10px ×10, 11px ×8 …). Decorative section numbers repeat "01" twice (`index.html:46`, `:56`). External-link arrows "↗" on controls that are not links: "Try an example" (`index.html:58`) and the Listen button (`index.html:101`). The look (near-black ground, one neon-lime accent, italic display serif, tiny tracked caps labels) is the most common generated-UI default and says nothing about speech. |
| UX & navigation | 5/10 | On a 390px phone the Listen button sits ~1,150px down a 1,409px page, below the 844px fold (`before/dark-home-390.png`); once playback starts, Stop scrolls away as soon as you go back up to the text. The empty-text check opens a modal titled "Playback unavailable" (`index.html:22`, `src/main.js:206`). The starting state differs from idle only by a 8px caption (`src/style.css:110`); `btn-playing` is toggled (`src/main.js:147`) but has no style; the read-only editor during playback has no visual cue. |
| Responsiveness / mobile | 6/10 | No horizontal overflow at 390 or 1440. Layout stacks correctly at 640px. But mobile text drops to 8–10px (`src/style.css:144`), the editor hint and the "No account" note are removed below 1100px (`:142`), the theme toggle is 38×40px (`:144`), and the voice name is truncated in the select at 390px. |
| Accessibility | 6/10 | Strong base: labelled controls, `role="status"` live region, `aria-valuetext` on sliders, native `<dialog>` with focus return, skip link, reduced-motion rule. Problems: the live status text is 9px (`src/style.css:124`), voice help 9px (`:99`), slider end labels 9px (`:104`). Contrast below 4.5:1 for small text: dark `#858f7e` on `#272c24` 4.23:1 (voice count, slider labels), light `#6b7463` on `#eeefe7` 4.21:1, light `#6b7463` on `#f5f4ef` 4.43:1 (notes under the workspace). The light-theme Listen button is `#d4f65b` on `#eeefe7`, 1.1:1 against its panel. OS colour preference is ignored: `data-theme="dark"` is hard-coded (`index.html:2`, `:13`, `src/main.js:47`). `aria-label` on a plain `<span>` (`index.html:95`) is not reliably announced. |
| Performance | 7/10 | Tiny bundle: JS 9.7 kB, CSS 16.5 kB (4.5 kB gzip). But a render-blocking stylesheet from a third-party origin (`index.html:9–11`): 12.5 kB CSS + 47 kB of WOFF2 from fonts.googleapis.com / fonts.gstatic.com (`.claude/tools/tts-perf.mjs`). `public/icons.svg` (5 kB of Vite template social icons) is copied into every build and never used; `src/assets/logo.png` (1.4 MB) is unused repository weight. |
| Code quality & structure | 6/10 | `src/speech-controller.js` is well designed (one owner per attempt, stale events ignored, injectable timers) and covered by 19 deterministic tests. `src/main.js` takes its dependencies by injection and disposes listeners. Weak spots: the stylesheet is hand-minified, with media queries written as single lines of 400–1,700 characters (`src/style.css:142–144`); no tokens beyond colours; dead rules (`.pitch-field { margin-top: 0 }`, `.btn-playing` toggled with no rule); icons swapped with `innerHTML` (`src/main.js:149`); Tailwind is imported but no utility or theme token is used (only its reset). |
| SEO basics | 5/10 | Has `<title>`, meta description, `lang`, one `<h1>`, `theme-color`, SVG favicon. Missing Open Graph and Twitter card tags, canonical URL, social image, and a PNG/apple-touch icon for platforms that ignore SVG favicons. |
| Security red flags | 8/10 | No secrets, keys or backend; no `.env` in the repo; external links use `rel="noopener noreferrer"`; `innerHTML` only receives constant strings. Report-only: third-party font requests send every visitor's IP to Google (a GDPR complaint risk for EU visitors); no Content-Security-Policy; voices that "need an internet connection" are provided by Google/Microsoft cloud services, so the text is sent to them, and the page does not say so; the committed lockfile carried three `npm audit` advisories (nanoid, postcss, source-map-js), fixed by the pre-existing lockfile update now committed on this branch. |

## Top 10 problems, ranked by impact

1. **Status and help text at 8–10px.** The live status line (`src/style.css:124`, 9px) is where the app reports which voice is starting, retries and failures; voice help and slider labels are 9px too. A listening tool is used by people resting their eyes or with low vision, so the most important feedback is the hardest to read.
2. **Listen/Stop out of reach on phones.** At 390px the primary button is below the fold, ~1,150px down, and Stop disappears as soon as you scroll up to check the text. Playing and stopping are the product.
3. **Small-text contrast below 4.5:1** in four places (see Accessibility), plus a 1.1:1 lime-on-grey primary button in light mode. Fails WCAG 1.4.3 and weakens the one control that matters.
4. **Playback state is barely visible.** Idle, starting and speaking differ only in an 8px caption and a decorative waveform; the "starting" state, which can last up to 6 s per voice, has no visual of its own. People press Listen twice when they can't tell the engine is starting.
5. **Generic identity with misleading signals.** The page looks like many generated tools, and "↗" (meaning "opens elsewhere") sits on the Listen button and on "Try an example". Repeated "01" numbering suggests a sequence that isn't there.
6. **OS light/dark preference ignored.** Everyone gets the dark theme until they find the toggle, including people whose system is set to light.
7. **Third-party, render-blocking fonts.** 59 kB from Google on two extra origins before text renders, and a privacy cost the app otherwise avoids ("No account", no backend).
8. **No social or canonical metadata.** Links shared from the portfolio, chat apps or social networks render as bare URLs.
9. **Unmaintainable stylesheet.** One-line media queries, 14 ad-hoc font sizes, no spacing or type tokens; every change risks a regression on another breakpoint.
10. **Dead weight.** Unused `public/icons.svg` ships in every build; a 1.4 MB unused PNG sits in `src/assets/`; a toggled class with no style.

Not changed on purpose: the empty-text check still opens the modal dialog. Its focus behaviour is covered by `tests/ui.test.js` ("empty text opens an accessible dialog and returns focus to the input"), and the brief keeps behaviour as it is. An inline message would interrupt less; that's a decision for the owner.

## Redesign direction: the broadcast studio

**Idea.** A voice reading your script is broadcasting, so the page borrows from the radio studio, not the radio. The world contributes four things only: type, palette, density and one signature move. Layout and controls stay those of a normal web tool: a text editor, a select, two sliders, one primary button.

- **Signature move: the cue lamp.** The panel's playback caption becomes a studio cue light, the sign above a studio door: a pill with a bulb, deliberately a different shape from the buttons. It's unlit when idle, amber "FINDING YOUR VOICE…" while a voice is starting (it pulses unless reduced motion is on), and lit red "A MOMENT TO LISTEN" while speaking. It uses the existing captions and the existing `data-playback` state, so it adds no new copy and needs no extra JavaScript. Red is reserved for "live" and is used nowhere else on the page.
- **Palette.** A deep studio-blue console panel holds the voice settings and transport in both themes. It is the one committed colour field. The editor is a sheet of white paper (light) or blue-black paper (dark) on a pale blue-grey or deep blue-black ground. Amber means standby and red means live; there are no other accents.
- **Type.** One family, Archivo, self-hosted, variable in weight and width. Width does the work signage needs: the lamp is set condensed and the headline is set wide and heavy. The editor text is 18–20px, because people use this to listen to and proof long text.
- **Density.** The console reads like a timing sheet: label on the left, value on the right, tabular numerals. The estimated listening time is the panel's headline number, next to the lamp. Ruled rows were considered and dropped: three numbers don't need a table.
- **Phone.** The lamp, the time and Listen/Stop form a transport bar that sticks to the bottom of the screen while the workspace is in view, so Stop is always one tap away.
- **Finish review.** An independent reviewer (fresh context, no access to this session) returned "fix". It flagged six items: the lamp drawn like a button, lamp text wrapping on phones, the console colour differing between themes, condensed caps reused on the dialog label, a promised "ruled rows" detail that was never built (now struck), and a seed-reference formality. All six were fixed in one batch.

Disciplines borrowed from the directions this one beat (`impeccable concept-seed`, which picked the direction from a ranked list; each challenger was declined, and only its discipline was kept):

- From a split-flap departure board: values sit in fixed cells and never move; only their contents change.
- From a cassette J-card: the running time is a first-class number, right-aligned and always visible.
- From a design annual: one typeface carries display and UI alike, and rank comes from weight and width.
- From a one-size pocket timetable: one element per screen goes to a reversed plate, and that element is the lit lamp.
- From a transit diagram: one colour per state, never reused for decoration.

## Scores after the redesign

Evidence: `docs/redesign-screenshots/after/` (`dark-home-*`, `light-home-*`, `states/`, `phone/` viewport captures at four scroll positions, `extra/` at 320, 768, 1024, 1280 and 1920px), `REDESIGN_INVENTORY.md` (66/66 scripted checks), `npm test` 21/21, `npm run build` clean.

| Area | Before | After | What changed |
|------|------:|------:|--------------|
| Visual design & consistency | 6 | 8 | One family on a named type scale of 8 tokens plus 3 one-off sizes for the wordmark and the phone time readout. Nothing is below 15px (before: 14 ad-hoc sizes from 8px). The studio-blue console and the cue lamp give the tool an identity tied to what it does. Red means live and amber means standby, and neither colour is used for anything else. Misleading "↗" arrows and repeated "01" numbering are gone. |
| UX & navigation | 5 | 8 | Playback state is visible at a glance: the lamp is unlit, amber or red. The editor tints while it is locked. On phones Listen/Stop stays on screen at every scroll position (`after/phone/*`). Kept as-is: the modal for empty text (tested behaviour). |
| Responsiveness / mobile | 6 | 9 | No overflow from 320 to 1920px (the 44px overflow at 320px found during verification is fixed). The sticky transport bar works on phones. Hint and note text are no longer hidden on smaller screens. Every target is at least 44×44px. |
| Accessibility | 6 | 9 | All text is at least 15px. Every small-text pair is ≥ 6:1 (muted on paper 7.31:1 light / 7.44:1 dark; console help 7.22:1; lit lamp 5.18:1). The slider track is ≥ 3.2:1. The theme follows the OS preference. Read time has a real text label instead of `aria-label` on a span. Focus rings are themed per surface and verified on every control. Hover styles apply only on pointers that can hover. |
| Performance | 7 | 8 | No third-party requests (was 3 requests and 59 kB from Google, render-blocking). The font is now one first-party 90 kB variable WOFF2 (the width axis carries the design), and other subsets load only when their characters appear. JS is unchanged at 9.8 kB; CSS is 22.6 kB (6.0 kB gzip). The unused `icons.svg` is no longer shipped. Trade-off: about 30 kB more font bytes than before, in exchange for two fewer origins and no blocking stylesheet. |
| Code quality & structure | 6 | 8 | The stylesheet is readable, in `@layer base` and `@layer components` with named tokens, and Tailwind's `@theme` defines the font. Icons switch in CSS (no `innerHTML`). The dead toggle and rules are removed. Two new tests cover the theme default and the slider fill. `src/speech-controller.js` is untouched. |
| SEO basics | 5 | 9 | Canonical URL, Open Graph and Twitter card tags, a 1200×630 social image and an apple-touch icon. Title, description, `lang` and a single `h1` are kept. |
| Security red flags | 8 | 8 | No change to the logic; the Google Fonts IP leak is removed. The remaining items are for the owner (below). |

### Detector and review notes

- `impeccable detect` flagged `cramped-padding` on `.console`. It is a false positive: the console's children carry their own 16–28px inset.
- It also flagged `dark-glow` for the red shadow under the lit lamp. That is the light a lit cue lamp casts (offset 10px, negative spread, only while speaking), and it is kept on purpose.

### Still open (owner's call)

1. **Network voices and privacy.** Voices that "need an internet connection" (Google voices in Chrome, Microsoft "Online (Natural)" voices in Edge) send the text to that vendor. `SpeechSynthesisVoice.localService` tells you which voices these are. Consider marking them in the voice list, or saying so in the help text.
2. **No Content-Security-Policy.** The app now loads nothing from other origins, so a strict policy is easy, for example a header in `vercel.json`: `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self' 'sha256-…'` (the inline theme script needs its hash).
3. **Empty-text modal.** An inline message next to the editor would interrupt less than the current dialog. That changes tested behaviour, so it was left alone.
4. **`src/assets/logo.png`** (1.4 MB) is not used anywhere and is not bundled. Delete it, or use it, for example as the portfolio thumbnail.

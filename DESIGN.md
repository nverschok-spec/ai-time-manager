---
name: AI Time Manager
description: A dark, quiet personal command center for tasks, family scheduling, and AI-assisted planning.
colors:
  bg: "#12141C"
  card: "#181B26"
  card-muted: "#232840"
  muted-text: "#9AA3B8"
  accent-default: "rgb(46 204 145)"
  accent-foreground-default: "rgb(8 11 15)"
  brand-gradient-start: "#00C2A8"
  brand-gradient-end: "#3DDC97"
  priority-high: "#FF6B6B"
  priority-medium: "#F4B740"
  priority-low: "#8B93A7"
typography:
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "normal"
  label:
    fontFamily: "{typography.body.fontFamily}"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "normal"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  "2xl": "20px"
  "3xl": "24px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
components:
  button-primary:
    backgroundColor: "{colors.accent-default}"
    textColor: "{colors.accent-foreground-default}"
    rounded: "{rounded.md}"
    padding: "6px 0"
  button-secondary:
    backgroundColor: "{colors.card-muted}"
    textColor: "#CBD5E1"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "#F1F5F9"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "#F1F5F9"
    rounded: "{rounded.2xl}"
    padding: "12px"
  fab:
    backgroundColor: "{colors.accent-default}"
    textColor: "{colors.accent-foreground-default}"
    rounded: "{rounded.full}"
    height: "56px"
    width: "56px"
---

# Design System: AI Time Manager

## Overview

**Creative North Star: "The Night Console"**

*(Proposed from the evidence below — rename freely if you have a different mental picture.)*

The app reads as a dim instrument panel, not a productivity dashboard. Almost the entire surface sits in near-black navy; the single accent color — mint-teal by default, but recomputed per logged-in person (see `lib/color.js`) — only ever lights up the one thing that matters on screen: the active tab, the primary button, a focused input's ring. Priority reds and ambers are the only other colors allowed to interrupt, and only as status signals (overdue badges, high-priority markers), never as decoration.

Nothing here uses depth for its own sake. Panels step up in tone (background → card → muted card) instead of casting shadows; real shadows are reserved for the handful of elements that are genuinely floating above the console — the AI input FAB, the undo snackbar, an avatar ring. Motion is quick and physical (0.16–0.28s), presses register as a tactile scale-down, and everything resolves with a confident deceleration curve, never a spring or bounce.

**Key Characteristics:**
- Near-black tonal canvas with one live, personalizable accent color
- Flat by default; shadow means "this is floating," nothing else
- Hairline dividers (`white/6%`), never solid gray borders or boxed cards
- System font stack — no imported webfont
- Fast, deceleration-only motion; presses scale down, nothing overshoots

## Colors

The palette is almost monochrome on purpose — one accent, one status trio, everything else is a step of near-black navy.

### Primary
- **Signal Mint** (`rgb(46 204 145)` / `#2ECC91`): the default interactive accent — active nav tab, primary buttons, focus rings. **Not fixed**: recomputed per logged-in person at runtime (`--accent` CSS variable, `App.jsx` + `lib/color.js`), together with a matching **Accent Foreground** (`rgb(8 11 15)` by default) chosen for contrast against whatever accent is active.
- **Teal-to-Mint** (`#00C2A8` → `#3DDC97`, vertical gradient): brand-mark identity only (`Logo.jsx`). Not used as an interactive or surface color — do not apply it to buttons, backgrounds, or text.

### Neutral
- **Midnight Ink** (`#12141C`): app background (`html`, `body`, `bg-app-bg`) and the base bottom-nav fill.
- **Panel Navy** (`#181B26`): the standard card/row/form surface, one step up from the background.
- **Muted Indigo** (`#232840`): secondary controls sitting on a card — quick-add pills, secondary buttons, chip backgrounds.
- **Cool Slate** (`#9AA3B8`, the `muted` token): secondary/tertiary text and icons where a dedicated hue reads better than a plain gray.
- Alongside `muted`, plain Tailwind slate steps are used directly for text hierarchy: `slate-100`/`slate-200` (primary text on dark surfaces), `slate-300` (secondary text, hovered nav labels), `slate-500` (placeholders, inactive nav/icons), `slate-600` (the quietest icon state).

### Semantic (status)
- **Coral Alert** (`#FF6B6B`) — high priority, overdue/error badges.
- **Warm Amber** (`#F4B740`) — medium priority.
- **Slate Low** (`#8B93A7`) — low priority.

### Person Identity (exception)
`src/lib/people.js` defines a fixed 8-swatch palette (`PEOPLE_COLORS`, incl. sky `#60A5FA`, violet `#C084FC`, pink `#F472B6`) used **only** to give each family member a distinct, stable identity color (avatars, per-person filters). This is a separate semantic category from the interactive accent and is exempt from the One Signal Rule below — don't "fix" it into the accent/priority palette.

### Named Rules
**The One Signal Rule.** The accent color is reserved for exactly one thing per view — the current tab, the primary action, or an active focus ring. It never fills a background or decorates a static element. If a screen needs a second attention-getter, reach for a priority color, not a second use of the accent. (Person-identity colors above are a distinct category and don't count against this rule.)

## Typography

**Body Font:** system UI stack (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`) — no webfont is imported; the app intentionally renders in the OS's native face (SF Pro on iOS, Roboto/Segoe elsewhere).

**Character:** plain and utilitarian by design — type is not a personality carrier here, color and motion are. Don't introduce a display/serif font or a second family "for character."

### Hierarchy
- **Body** (400, `text-sm` / 14px): the default size for almost all UI text — labels, row titles, form fields.
- **Label** (400, 11px): bottom-nav tab labels, the smallest text in the app.
- Form inputs render at 16px specifically to stop iOS Safari's auto-zoom on focus (`index.css`) — this is a platform workaround, not a typographic choice; don't "fix" it back to 14px.

### Named Rules
**The No-Import Rule.** Never add a Google Fonts (or any webfont) `<link>`/`@import`. The system-font choice is deliberate, not an oversight.

## Layout

Mobile-first, single-column, `max-w-md`-constrained content (see `BottomNav`) — this is a phone-shaped PWA, not a responsive marketing site. Spacing is tight and dense: rows and form fields pad at 6–12px (`py-1.5`/`p-3`), gaps between stacked elements run 4–6px (`gap-1`/`gap-1.5`). There is no defined breakpoint system beyond what a single narrow column needs; don't introduce a desktop-grid layout without discussing it first.

Safe-area handling is explicit and load-bearing: `.pt-safe` pads the header for the iOS notch/status bar, and `html`/`body` carry the dark background directly so nothing white ever shows through the translucent status bar. Preserve both when touching header/layout code.

## Elevation & Depth

Flat by default, tonal layering for hierarchy: background → card → muted-card, each a lighter step of the same near-black navy, with no border or shadow needed to separate them. Real `box-shadow` appears in exactly three places in the whole app — the AI-input FAB, the undo snackbar, and an avatar ring — because those elements are genuinely floating above the console, not sitting flush with it.

### Shadow Vocabulary
- **Floating** (`shadow-lg shadow-black/30`): the only shadow treatment in use. Reserved for elements that visually float over content (FAB, snackbar, popover-like avatar states).

### Named Rules
**The Flat-By-Default Rule.** A static card, row, or panel never gets a shadow — tone-stepping is the only depth cue. Add a shadow only when the element is meant to read as floating above everything else.

## Shapes

Corners scale from tight to generous as elements get more prominent: `rounded-md` (6px) for buttons/inputs, `rounded-lg` (8px) for grouped/pill containers (segmented-control tab groups, dropdown menu items, small preview thumbnails), `rounded-xl` (12px) for compact list rows, `rounded-2xl`/`rounded-3xl` (20/24px, custom scale) for cards, forms, and sheets, and `rounded-full` for circular/pill elements (FAB, avatars, badge counters, pill buttons). Borders, where used at all, are 1px hairlines at `white/[0.06]` opacity — never a solid gray (`border-gray-*`) line. Don't box plain content in a bordered rectangle; let the tonal background do the separating.

## Components

### Buttons
- **Shape:** `rounded-md` (6px), consistent across every variant.
- **Primary:** `bg-brand-cta` (the live accent) with `text-brand-ctaForeground`; `hover:brightness-110`, `active:scale-[0.97]`.
- **Secondary/Ghost:** `bg-app-cardMuted` with `hover:bg-white/10`, same `active:scale-[0.97]` press.
- No bounce, spring, or elastic easing on any button state — press feedback is a plain scale-down, release is instant.

### Inputs / Fields
- **Style:** `bg-app-bg` (drops one tone below its `bg-app-card` container), no visible border at rest.
- **Focus:** `outline-none` with a thin `focus:ring-1 focus:ring-brand-cta` — a hairline accent ring, never a glow, halo, or thick ring.
- Font size is forced to 16px specifically to defeat iOS zoom-on-focus (platform constraint, see Typography).

### Cards / Containers
- **Corner Style:** `rounded-2xl` (forms) or `rounded-xl` (compact rows).
- **Background:** `bg-app-card`, with an optional `border-white/[0.06]` hairline for forms that need to read as a distinct sheet.
- **Shadow:** none (see Elevation).

### Navigation (Bottom Tab Bar)
- Fixed bottom bar, `bg-app-bg/95` with `backdrop-blur`, a single `border-t border-white/[0.06]` hairline — no shadow.
- Active tab: icon + label in the live accent color. Inactive: `slate-500`, hovering to `slate-300`. No active-tab pill or background fill.
- Icon press feedback: `active:scale-90` (slightly deeper than the buttons' `0.97`, since icons are smaller touch targets).
- Unread/overdue counts render as a small `priority-high` circular badge with `tabular-nums`, positioned at the icon's top-right corner.

### Floating Action Button (AI input)
- 56×56px circle, live accent background, `shadow-lg shadow-black/30` — the one persistently-floating element in the app.
- `active:scale-90` on press.

## Do's and Don'ts

### Do:
- **Do** reserve the accent color for exactly one focal element per screen (The One Signal Rule).
- **Do** use tonal steps (`app-bg` → `app-card` → `app-cardMuted`) for hierarchy instead of borders or shadows.
- **Do** give every pressable element a plain `active:scale-*` press state and a `transition-colors`/`transition-transform` — no unanimated state changes.
- **Do** keep hairline dividers at `white/[0.06]`, not a solid gray border.
- **Do** add new user-facing strings to all three locale files (`src/i18n/{ru,en,de}.json`), matching this dense, utilitarian tone.

### Don't:
- **Don't** import a webfont (Inter or otherwise) — the OS system font is the deliberate choice.
- **Don't** use flat gray cards (`bg-gray-100`/`bg-gray-800`-style neutrals) — every surface color here is a navy/indigo tone, never true gray.
- **Don't** add gradient text, neon/purple glow effects, or decorative box-shadows on static cards — this system is flat-by-default and one-accent-only.
- **Don't** use a left-side accent border as a "card highlight" pattern — it doesn't appear anywhere in the existing system.
- **Don't** give buttons or sheets a bounce/elastic/spring easing — motion here always decelerates and stops (`cubic-bezier(0.16,1,0.3,1)` or `ease-out`), matching `prefers-reduced-motion` when the user has it set.
- **Don't** apply the brand gradient (`Teal-to-Mint`) to anything other than the logo mark.

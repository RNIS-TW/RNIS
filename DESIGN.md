# DESIGN.md

Design system reference for the RNIS website. This documents how visual
design is implemented in code — tokens, components, and conventions — not
a general style guide.

## Stack

- **Astro** (`output: "server"`, `@astrojs/node` standalone adapter)
- **Tailwind CSS v4** via `@tailwindcss/vite` — theme is authored in CSS
  (`@theme` block), not `tailwind.config.js`
- **GSAP** / **anime.js** for animation, **Lenis** for smooth scroll
- Traditional Chinese (`zh-Hant`) as the primary locale

## Theming

Theme (`dark` / `light`) is set on `<html data-theme>` before paint via an
inline script in [Layout.astro](src/layouts/Layout.astro), reading a
`rnis-theme` localStorage key and falling back to
`prefers-color-scheme`. Design currently targets dark as the primary
surface (`--color-surface-base: #151c2a`).

## Design tokens (`src/styles/global.css`)

Two layers:

1. **Raw palette** — defined in `@theme`, generates Tailwind utilities
   (`bg-amber-100`, etc.):
   - `surface-base` / `surface-raised` — dark neutral surfaces
   - `amber-100` → `amber-500` — the accent scale, gold not blue;
     `100` is lightest/dominant, `500` darkest
   - `coral`, `jasmine`, `sage` — standalone status/marker accents
     (danger / warn / success), not part of the amber scale
   - `font-sans`, `font-display`, `font-mono`, `font-line-seed` — font
     stacks (see Fonts below)

2. **Semantic tokens** — hand-authored CSS variables + classes
   (`.border-primary`, `.button-primary`, `.text-danger`, …), *not*
   Tailwind's auto-generated color utilities. This is deliberate:
   Tailwind ties `bg-X` / `text-X` / `border-X` to one shared value per
   color name `X`, but here "primary" needs a different literal value
   per property (e.g. button-primary's background and text are two
   different tokens). Add new semantic roles the same way: a
   `--role-property` variable in `:root`, plus a matching utility class.

When changing a color, decide first whether it's a new raw palette value
(add to `@theme`) or a new semantic role (add to the `:root` block +
class) — don't reach for arbitrary Tailwind values (`bg-[#...]`) for
anything reused more than once.

## Fonts

Loaded as local files under `src/assets/font/` and declared in
`src/styles/font/font.css` / `genyo-gothic.css`:

- **Satoshi** — primary sans, preloaded in `<head>` (critical path)
- **GenYo Gothic TW** — CJK companion to Satoshi in `--font-sans`
- **New Title** — display font
- **LINE Seed TW** — secondary sans stack (`--font-line-seed`)
- **Source Code Pro** — mono

## Structure

```
src/
  components/
    common/   Header, Footer, Loading — global chrome
    home/     Hero, About, Services, Projects, QA, Contact — page sections
    about/    Team, Team-Card
    svg/      one-off inline SVG shapes (heroCut, trapezoid)
    utils/    Background, SmoothScroll, NotchButton, easingGradient
  config/     link.json, projects.json, sitemeta.json, ui.json — structured data
  content/    per-section copy as JSON (header/footer/home/about/contact/blog)
  layouts/    Layout.astro — the single page shell
  styles/     global.css (tokens) + font/
```

Copy lives in `src/content/*.json`, structural/link data in
`src/config/*.json` — components stay presentational and import both
rather than hardcoding text or URLs.

## Conventions

- New reusable visual primitives go in `components/utils/`; page-specific
  sections go under `components/home/` or the relevant page folder.
- Prefer the semantic classes (`button-primary`, `text-paragraph`, …)
  over re-deriving colors from the raw palette in component markup.
- `button-shadow` (a flat 4px offset box-shadow using `--button-shadow`)
  is the standard button depth treatment — reuse it rather than
  inventing new shadow values.

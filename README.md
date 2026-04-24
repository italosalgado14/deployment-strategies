# Deployment Strategies Guide

A static reference site covering **10 deployment strategies** (Recreate, Rolling Update, Blue-Green, Canary, A/B, Shadow, Feature Flags, MAB, Interleaving, Champion/Challenger) with a special focus on **MLOps** contexts.

The content source is [`deployment-strategies.md`](deployment-strategies.md); the site is a hand-written HTML/CSS/JS rendering of that content, built to be hosted on GitHub Pages.

---

## Purpose

Engineering teams repeatedly re-answer the same questions when shipping code or ML models:

- *Do we risk downtime? How fast can we roll back? How much extra infra?*
- *Is this a technical-safety problem (canary) or a business-metric problem (A/B)?*
- *How do we validate an ML model against real traffic before it affects users?*

This guide consolidates those trade-offs into one place with **side-by-side tables, diagrams, and a decision flow**, so the answer can be picked in minutes instead of rediscovered per project.

---

## Live site

Once GitHub Pages is enabled (see *Deployment* below), the site will be available at:

```
https://<your-github-username>.github.io/deployment-strategies/
```

---

## Project structure

```
deployment-strategies/
├── index.html                 # Single-page site — all sections, TOC, hero
├── deployment-strategies.md   # Source-of-truth content (plain markdown)
├── assets/
│   ├── style.css              # Theming (light + dark), layout, components
│   └── main.js                # Theme toggle + TOC scroll-spy
├── .nojekyll                  # Disables Jekyll on GitHub Pages (serve as-is)
├── .gitignore
└── README.md
```

---

## How the site is built

### HTML (`index.html`)
A single page split into semantic sections — one `<section class="card">` per strategy, plus Quick Comparison, Decision Guide, and Glossary. The page loads **Mermaid.js** from a CDN for the architectural diagrams and uses **Google Fonts** (Inter + JetBrains Mono) for typography. No build step, no framework, no package manager.

### CSS (`assets/style.css`)
- **CSS custom properties** drive the theme. `:root` defines the light palette; `[data-theme="dark"]` overrides for dark mode.
- **Layout** is a CSS Grid with a sticky left-side TOC (220px) and fluid main content, collapsing to a single column below 960px.
- **Visualizations** are built with pure CSS where Mermaid doesn't render cleanly:
  - Rolling Update → colored `v1`/`v2` boxes across 5 rows
  - Canary phases → gradient progress bars per phase
  - MAB → bar chart showing traffic adapting over time
  - Interleaving → tiled result rows mixing two models
  - MLOps stack → numbered vertical flow
- **Tables** use color pills (`.pill-good`, `.pill-warn`, `.pill-bad`) for at-a-glance scanning and pros/cons tables add `✓`/`✕` icons via pseudo-elements.

### JavaScript (`assets/main.js`)
Two small, dependency-free modules:

1. **Theme toggle** — reads `localStorage.theme`, falls back to the OS `prefers-color-scheme`, flips the `data-theme` attribute on click, and re-renders Mermaid diagrams in the matching theme.
2. **TOC scroll-spy** — uses `IntersectionObserver` to highlight the current section in the sidebar as the user scrolls.

### Diagrams (Mermaid)
Mermaid is used for the flow-style diagrams (Blue-Green switch, A/B split, Shadow mirroring, MLOps flow, Champion/Challenger). The Mermaid source lives inline inside `<div class="mermaid">` blocks, so editing a diagram is a plain text edit — no image regeneration.

---

## Running locally

No build step. Serve the directory with any static server:

```bash
# Python (already installed on most systems)
python3 -m http.server 8000
# then open http://127.0.0.1:8000
```

```bash
# Node alternative
npx serve .
```

Opening `index.html` with `file://` directly mostly works but will fail to load the Mermaid ESM module in some browsers — use a local server.

---

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, choose:
   - **Source:** *Deploy from a branch*
   - **Branch:** `main` (or your default), folder `/ (root)`
4. Save. The site publishes within ~1 minute at `https://<user>.github.io/<repo>/`.

The `.nojekyll` file tells GitHub Pages to skip Jekyll processing and serve files as-is, which keeps paths predictable for the `assets/` folder.

---

## Editing content

- **Text, tables, lists** — edit the relevant `<section>` in `index.html`. Markdown source lives in `deployment-strategies.md` for reference.
- **Diagrams** — edit the Mermaid source inside `<div class="mermaid">`. See the [Mermaid docs](https://mermaid.js.org/).
- **Colors, spacing, typography** — change the custom properties at the top of `assets/style.css`.
- **Add a new strategy** — copy an existing `<section class="card">` block, add an entry to the sticky TOC (`<aside class="toc">`) and to the Quick Comparison table.

---

## Credits

- Typography: [Inter](https://rsms.me/inter/), [JetBrains Mono](https://www.jetbrains.com/lp/mono/)
- Diagrams: [Mermaid.js](https://mermaid.js.org/)
- Color palette inspired by the GitHub Primer design system.

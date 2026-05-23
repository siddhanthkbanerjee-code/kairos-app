# CLAUDE.md — Kairos Operating Manual

This file is read at the start of every Claude Code session. It contains standing rules, design tokens, and the current task. Do not delete or summarise away any section unless explicitly instructed.

---

## What Kairos is

Kairos is an AI-powered cultural event discovery platform for London, framed as "Spotify for live culture." The user takes an 8-question taste quiz, gets a personalised event feed with match scores, and sees AI-generated explanations for why each event was picked.

The name is Greek for "the perfect moment." The product's emotional promise: your perfect event, your perfect night, looks different from someone else's.

This is a portfolio project, not a product going to market. Goal: make it look genuinely beautiful, work flawlessly, and showcase taste and craft.

---

## CRITICAL STANDING RULES

These rules override anything else. Violating them causes real damage to other projects or to the build.

### 1. Do not modify framework dependencies

**Next.js, React, and any framework-level dependency is locked at the current installed version.** Do not upgrade, downgrade, or modify any of the following without explicit approval from Siddhanth:

- next
- react
- react-dom
- typescript
- tailwindcss

If a fix appears to require a framework version change, surface it as a question. Do not act.

**Why**: Siddhanth runs PRIZERV on the same machine, pinned to Next.js 15.5.14. Cross-contamination via global packages, Node version changes, or Turbopack cache corruption is unacceptable.

### 2. No global npm installs

If a package is needed, install it locally in this project only (`npm install`, not `npm install -g`).

### 3. Do not touch other projects

Do not read, write, or reference files outside the Kairos project root. Specifically: PRIZERV lives elsewhere on this machine and must remain untouched.

### 4. Confirm before destructive operations

Before any `git reset --hard`, force push, branch deletion, file deletion of more than 5 files, or schema migration, surface what you're about to do and wait for confirmation.

### 5. PowerShell environment

This is Windows with PowerShell. Do not use `&&` to chain commands. Run commands one at a time. Use `Set-Content -LiteralPath` for paths with special characters.

### 6. Build before push

Every session must end with `npm run build` confirming zero errors before any `git push`.

### 7. No em dashes anywhere

Not in code comments, not in commit messages, not in user-facing text. Use commas, periods, colons, or parentheses.

---

## Design system (HARD CONSTRAINTS)

These tokens are the brand. Do not introduce new colours, fonts, or radii without surfacing them first.

### Brand identity

Aesthetic direction: **dark nightclub poster, fluidic and alive**. Editorial typography over dynamic gradient blobs. The blobs are the soul of the product. They breathe, drift, and shift colour based on the user's taste profile.

Reference points: Resident Advisor (typography), Luma (card layout), Boiler Room (energy), Apple Music's recent moody artwork (motion). Anti-references: generic SaaS startup gradients on white, corporate AI product sites, anything that looks like a Vercel template.

### Colours

```
Background base:     #0a0a12   (deep navy, near-black)
Background elevated: #14141f   (cards, panels)
Surface glass:       rgba(255,255,255,0.04) with 0.5px border at rgba(255,255,255,0.10)

Primary accent:      #a855f7   (purple — match scores, primary buttons, key UI)
Secondary accent:    #f472b6   (rose — hero badges, highlights)
Tertiary accent:     #6366f1   (indigo — used sparingly)

Text primary:        #f0f0f0
Text secondary:      rgba(255,255,255,0.55)
Text muted:          rgba(255,255,255,0.35)
Text label/caps:     #a855f7   (uppercase tracking labels)
```

The dynamic palette system already in the codebase (6 palettes shifting per quiz answer) is preserved and amplified. The blobs use the active palette. The accents above are the default state before any quiz personalisation.

### Typography

Two fonts only:

- **Playfair Display** (display, headlines, event titles, hero copy). Weights 400, 700, 900. Used for anything that should feel editorial.
- **DM Sans** (body, UI, labels, metadata, buttons). Weights 300, 400, 500, 600.

No Inter. No Roboto. No system fonts. No Space Grotesk. No Helvetica.

### Radii and spacing

```
border-radius-sm:  8px    (inputs, small pills)
border-radius-md:  12px   (buttons, filter chips)
border-radius-lg:  16px   (event cards)
border-radius-xl:  20px   (hero card, modals)
```

### Motion

Motion is part of the brand, not decoration. Specifically:

- **Blobs**: slow drift (15 to 25 second cycles), gentle scale pulse (4 to 6 second cycles), no snap or bounce. They feel like breath.
- **Quiz transitions**: questions fade and slide up gently when the user advances. Selected answer pulses once.
- **Card reveals**: event cards stagger-fade in on scroll using IntersectionObserver. Delay 50ms between cards.
- **Match score**: a subtle glow animation when first revealed.
- **Page transitions**: dissolve, never slide.

No spring physics that bounce. No flashing. No instant snaps. Default easing: `cubic-bezier(0.4, 0, 0.2, 1)` for most, `cubic-bezier(0.16, 1, 0.3, 1)` for reveals.

### What to avoid (anti-patterns)

- Light backgrounds anywhere
- White text on white (obviously) but also any text on a coloured fill that isn't a darker shade of the same colour family
- Generic neon glow effects
- Drop shadows on dark backgrounds (they don't work, use border or glow instead)
- Emoji as decorative elements (use SVG icons or nothing)
- Any UI that looks like a Vercel template

---

## Tech stack (FROZEN unless explicitly changed)

- Next.js (current installed version, do not change)
- React (current installed version, do not change)
- TypeScript
- Tailwind CSS 4
- OpenAI (text-embedding-3-large, 3072 dimensions)
- Anthropic Claude SDK (match explanations)
- Pinecone (vector DB, kairos-events index)
- Supabase (to be added during this brief for persistence)

Pinecone index: ~828 events. Fabricated niche events carry a 1.20 score multiplier to prevent mainstream Ticketmaster events dominating recommendations.

---

## Workflow rules

### Tool roles

- **Claude AI chat** (where Siddhanth comes from): strategy, product, briefs. Don't ask Claude Code to do strategy.
- **Claude Code** (you): all building, all bug fixing, all git operations.
- **Cowork**: backup. Used only when Claude Code gets stuck in a loop or needs cross-cutting audits.

### Session structure

Every session:
1. Read this file in full.
2. Read CURRENT_TASK.md for the active brief.
3. Confirm understanding before acting.
4. End with `npm run build` and `git push`.
5. Append a SESSIONS.md entry summarising what shipped.

### Prompting style Siddhanth prefers

- Direct and brief.
- Outputs ready to use, not multiple options to choose from.
- No sycophantic openers ("Great question," "Of course").
- Plain-language explanations of bugs, not jargon.

---

## Current build status

Updated by Claude Code at the end of each session.

### Phase 1 complete (2026-05-05)

- Repo consolidated. Single canonical folder: `C:\Users\rb110\Documents\CafeCursor\kairos\`
- Git repo root is `CafeCursor\` (one level up), tracking `origin/master` at `https://github.com/siddhanthkbanerjee-code/Kairos.git`
- All in-progress work committed in three logical commits (be8862e, 6b5a680, ae98a08) and pushed to `origin/master`
- Vercel project (`kairos-deploy-sigma.vercel.app`) watches `master` branch. Live URL confirmed serving. Auto-deploy trigger needs manual verification in Vercel dashboard (MCP had no access).
- Parent-level files (`kairos-deploy/`, `index.html`, `script.js`, `style.css`) archived to `C:\Users\rb110\Documents\CafeCursor\_archive\`. Not deleted.
- `npm run build` passes with zero errors (Next.js 16.1.7, Turbopack).
- CLAUDE.md and CURRENT_TASK.md are currently untracked (not yet committed). Stage and commit these when ready.
- Next: Phase 2 (image loading bug fix).

---

## Current session task

See `CURRENT_TASK.md` in the project root.

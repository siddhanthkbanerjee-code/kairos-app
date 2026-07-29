# CURRENT_TASK_design_polish.md — Kairos "Stop Looking Vibe-Coded" Pass

## Start here

Open Claude Code at `C:\Users\rb110\Documents\CafeCursor\` — the folder one level above `kairos`, not the `kairos` folder itself. That's where the actual git repo root (`.git`) lives; the `kairos` folder is just the app code inside it. Opening scoped to `kairos\` only means Claude Code can edit files but can't commit or push. GitHub remote: `https://github.com/siddhanthkbanerjee-code/kairos-app.git`, remote name `kairos-app`, branch `main`.

No new API keys or secrets are needed for this brief, it's a frontend-only pass using data and services already configured.

This brief exists because the previous full design overhaul (2026-07-07, see SESSIONS.md) already added a lot: film grain, cursor spotlight, luminous blobs, marquee, Ken Burns, masked reveals, skeleton shimmer, editorial typography. The site is not under-designed. What's still missing is not more atmosphere, it's rigor: consistency, complete interaction states, and a fast path to the payoff screen. This is a restraint pass, not an additions pass. Do not add new visual effects, colours, or fonts without explicit approval.

To use this: paste this whole file in as the active `CURRENT_TASK.md`, or tell Claude Code "work from CURRENT_TASK_design_polish.md." Read CLAUDE.md in full first. All standing rules apply, especially rule 1 (no framework/dependency changes) and the existing design tokens in CLAUDE.md (colours, fonts, radii) are locked, this brief is about applying them consistently, not changing them.

---

## Goal

Make Kairos read as a shipped product, not a scrappy build, by fixing the things that actually signal "vibe-coded" to a trained eye: inconsistent spacing and type, missing interaction states, a broken-looking link preview, and a slow path to the app's best screen. Scope is deliberately narrow: homepage, quiz, feed, and the shared chrome (nav, footer). Event detail, passport, saved, about get only what's needed for consistency, not a rebuild.

---

## Scope

**In scope:**
1. A strict, documented spacing and type scale, enforced across home, quiz, feed
2. Full interaction states (hover, active, focus-visible, disabled) on every interactive element on those three pages
3. A real Open Graph image and complete per-page metadata, so shared links look intentional
4. An instant "sample feed" path that doesn't require completing the 8-question quiz
5. A first-load / layout-shift audit on home, quiz entry, feed entry

**Out of scope:**
- The blob system, film grain, spotlight, marquee, motion vocabulary — these are already good, per the 2026-07-07 session. Do not touch unless something is provably broken.
- New colours, fonts, radii, or component types not already in CLAUDE.md's design system section
- Passport, saved, settings, help, about pages beyond a quick consistency check (Phase 1 grep can touch them if trivial, no dedicated redesign time)
- Any algorithm, quiz-question, or copy rewrite beyond what's specified below

---

## Phase 1: Spacing and type scale audit (90 min)

The single highest-leverage fix. Inconsistent spacing and type sizing is the most reliable tell of an unpolished build, more than any missing effect.

1. In `tailwind.config.ts`, define an explicit scale if one isn't already enforced: spacing on a strict 4px base (4, 8, 12, 16, 24, 32, 48, 64, 96), and a 6-step type scale (e.g. 12/14/16/20/28/40px, mapped to Tailwind's `text-xs` through `text-4xl` or custom named tokens). Document the scale in CLAUDE.md under the existing "Radii and spacing" section, extend it rather than replacing it.
2. Grep `app/page.tsx`, `app/quiz/page.tsx`, `app/feed/page.tsx`, `app/globals.css`, and the shared components (`EventCard`, `KairosChrome`, `KairosFooter`, `FilterPill`, `MatchBadge`) for one-off pixel values in padding, margin, gap, and font-size that don't map to the scale. Replace with the nearest scale value. Where a one-off value is load-bearing (a specific animation offset, a blob position), leave it, this pass is about layout spacing and type, not motion parameters.
3. Confirm heading sizes are consistent for equivalent semantic weight across pages, e.g. a page's main H1 should be the same scale step everywhere it appears, not 32px on home and 30px on feed.
4. Confirm card padding, button padding, and pill padding are identical wherever the same component type is reused.

**Surface:** if the audit turns up more than a handful of genuinely inconsistent spots, list them for Siddhanth before mass-editing, in case any were intentional.

---

## Phase 2: Interaction states (90 min)

Every interactive element gets hover, active, focus-visible, and (where applicable) disabled states. Missing states are the second most reliable "unfinished" tell, louder than aesthetics.

1. **Buttons** (primary, secondary, tertiary per CLAUDE.md's button component): confirm all four states exist and are visually distinct but restrained (per the existing motion rules: scale 0.98 on active, brightness boost on hover, no bounce). Disabled state needed on the quiz "Continue" button (already partially specified in the old brief, confirm it's actually wired, not just described).
2. **Cards** (EventCard compact and hero variants): hover state exists per SESSIONS.md (glow + slow zoom), confirm focus-visible exists too for keyboard users, not just mouse hover. A card reachable by Tab should show a visible focus ring in the brand's purple accent, not the browser default blue outline and not nothing.
3. **Filter pills**: confirm hover, active/selected, and focus-visible are all distinct states, not just active vs. inactive.
4. **Quiz answer cards**: confirm hover (gradient border per old brief), selected (filled background), and focus-visible (keyboard navigation, since CLAUDE.md's Phase 7 accessibility pass called for keyboard nav on the quiz, confirm it actually works, don't just assume).
5. **Save button (heart icon)** on event detail and cards: hover, active (saved/unsaved toggle animation), and a loading micro-state if the save action has any network latency (Supabase write).
6. **Error states**: if `/api/recommend` fails, the feed should show a branded error component (use the existing dark/purple/rose palette, plain-language copy, a retry button) instead of a blank screen or a raw Next.js error boundary. Same for any Supabase read/write failure on save.
7. **Empty states**: confirm the saved page's empty state (already noted as done per old brief) matches the same visual language as any new error states, they should feel like siblings, not two different design systems.

---

## Phase 3: Link preview and metadata (45 min)

This is the highest-return, lowest-effort item on this list, because the primary way this app gets seen is a URL pasted into LinkedIn, a recruiter DM, or Siddhanth's own portfolio site. If that unfurls as a bare title on grey, the app has already lost before anyone clicks.

1. Design and export a static 1200x630 Open Graph image using the existing hero card composition and brand tokens (dark background, blobs, Playfair headline, purple/rose accent). Save to `public/og-image.png` (or `.jpg`, whichever compresses better at that size without visible artifacting).
2. Wire it into `app/layout.tsx`'s `metadata.openGraph.images` and `metadata.twitter.images` (currently missing entirely, confirmed by reading the file, `twitter.card` is set to `"summary"` which doesn't even support a large image, consider `"summary_large_image"` once the image exists).
3. For `app/event/[id]/page.tsx`, add dynamic per-event OG metadata (event title, venue, and the event's own image) if the Next.js route supports `generateMetadata`, so sharing a specific event link looks as intentional as sharing the homepage.
4. Confirm title and description are set on every route that's missing them (About, Passport, Saved, Help), reusing the pattern already established in `layout.tsx`.

---

## Phase 4: Instant sample path (60 min)

A recruiter will not complete an 8-question quiz. The best screen in the product (the feed, with real events and match explanations) is currently gated behind the highest-friction screen. Fix the ordering.

1. Add a secondary CTA on the homepage, visually subordinate to "Start the taste quiz" (the primary conversion path stays primary), something like "See a sample night" or "Skip to the feed."
2. This routes to the feed using a fixed, curated "editor's taste" profile (a hand-picked set of quiz answers that produces a genuinely good, diverse-feeling feed) rather than requiring a real quiz submission. Store this as a constant, not a live API round-trip through the quiz UI.
3. On that feed, show a small, dismissible banner or label indicating this is a sample profile and inviting the visitor to take the real quiz for their own picks, so it's honest about what they're looking at without undercutting the moment.
4. This should feel like a real shortcut, not a degraded experience, same feed component, same match badges, same AI explanations (generated against the fixed profile).

**Surface:** show Siddhanth the sample profile's resulting feed before shipping, since this is effectively a permanent "demo mode" that represents the product to anyone in a hurry.

---

## Phase 5: First-load audit (30 min)

1. Check `app/page.tsx`, `app/quiz/page.tsx`, and `app/feed/page.tsx` for layout shift on first paint (font swap, image pop-in, late-arriving skeleton). `next/font` with `display: "swap"` is already in use, confirm it's not causing a visible jump by reserving space correctly.
2. Run Lighthouse on all three pages specifically for Cumulative Layout Shift, not just the overall score. Fix anything scoring outside "good" before moving on, this is cheap to fix early and expensive to debug later.
3. Confirm the feed's skeleton shimmer (already built) actually appears before the real content on a throttled connection, not just on fast local dev.

---

## How to handle problems

- If a fix requires a framework version change: stop, surface it, per CLAUDE.md standing rule 1.
- If the spacing/type audit reveals the existing system is more inconsistent than expected and a full rebuild seems tempting: don't. Surface the scope creep, get explicit sign-off before expanding beyond this brief.
- If new states conflict with the existing motion rules (no bounce, no snap, specific easing curves): match the existing motion vocabulary exactly, don't introduce a second animation style.

---

## Definition of done

- Every interactive element on home, quiz, and feed has hover, active, focus-visible, and (where relevant) disabled and loading states, all visually consistent with each other.
- Spacing and type scale documented in CLAUDE.md and applied consistently across the three in-scope pages.
- A pasted Kairos link (homepage or an event page) shows a real image and correct title/description in a link preview (test via a Slack or iMessage paste, or a link-preview debugger).
- A visitor can reach a fully populated feed within one click from the homepage, no quiz required.
- Lighthouse CLS is "good" on home, quiz, and feed.
- `npm run build` clean, pushed to main, Vercel deploy confirmed, Siddhanth has clicked through all three pages on desktop and mobile width.

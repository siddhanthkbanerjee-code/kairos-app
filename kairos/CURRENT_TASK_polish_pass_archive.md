# CURRENT_TASK.md — Kairos Polish Pass

This is the master brief for the Kairos rebuild. It runs across multiple Claude Code sessions, sequenced in phases. Do not skip ahead. Each phase ends with a working build, a push to main, and a SESSIONS.md entry.

If you encounter anything that requires a framework version change, surface it and stop. See CLAUDE.md standing rule #1.

---

## Goal

Take Kairos from "working MVP with rough edges" to "portfolio piece a senior designer would respect." The product stays the same. The visible quality changes dramatically.

End state: Siddhanth can send the URL to anyone at Anthropic, AWS, or any AI startup and feel proud.

---

## Scope

**In scope:**
1. Environment hygiene (move out of OneDrive)
2. Repo and deployment cleanup (single repo, working auto-deploy)
3. Image loading bug fix
4. Supabase persistence for taste profiles and saved events
5. Full design pass on: homepage, quiz, feed, event detail, passport, saved
6. Dynamic blob system as a reusable component, palette-aware
7. Typography overhaul (Playfair Display + DM Sans)
8. Motion pass (blob drift, card stagger reveals, transitions)
9. Empty states and loading states
10. Mobile responsiveness audit

**Out of scope** (do not work on these without explicit approval):
- Spotify integration
- Taste map visualisation
- Post-event ratings
- Stripe or any payments
- Venue onboarding
- New event sources beyond what exists
- Any algorithm changes beyond bug fixes
- Marketing site or landing page additions

---

## Phase 0: Environment hygiene (15 min)

**Why first**: OneDrive sync on dev folders causes silent file lock errors that look like random build failures hours later. Fix this before any other work.

### Tasks

1. Confirm current project path. Expected: `C:\Users\rb110\OneDrive\Documents\CafeCursor\kairos\`
2. Move the entire project out of OneDrive sync. Recommended new location: `C:\Users\rb110\Projects\kairos\`
3. Update any IDE or shortcut paths.
4. Run `npm install` and `npm run build` from the new location to confirm nothing broke.
5. Report the new path back to Siddhanth before proceeding.

**Surface**: confirm Node version (`node --version`) and current Next.js version (`grep next package.json` or equivalent). Report both. Do not change either.

---

## Phase 1: Repo and deployment cleanup (45 min)

**Current state** (per Siddhanth's notes): there are two folders, `kairos` (Cursor edits here) and `kairos-deploy` (Vercel deploys from here). Manual `Copy-Item` step between them. Auto-deploy broken due to `master` vs `main` branch mismatch. Deployments forced via `npx vercel --prod` from `kairos-deploy`.

### Goal state

One repo. One branch (main). Auto-deploy works on every push to main. No manual copy step.

### Tasks

1. Inventory both folders. Confirm they're in sync (or identify what differs).
2. Choose `kairos` as the canonical folder.
3. Update Vercel project settings to:
   - Point at the `kairos` GitHub repo (not `kairos-deploy`)
   - Watch the `main` branch
   - Confirm framework preset is "Next.js" (not "Other")
4. Test auto-deploy with a trivial change (update a comment in README, push, watch Vercel build).
5. Once auto-deploy works, archive the `kairos-deploy` folder locally (rename to `kairos-deploy-archive`) but do not delete the GitHub repo until Siddhanth confirms.
6. Update CLAUDE.md current build status section.

**Surface before acting**: any change to Vercel project settings. Show Siddhanth what you intend to change before clicking.

---

## Phase 2: Image loading bug fix (30 min)

**Current state**: Ticketmaster event images load as empty rather than erroring. The `onError` fallback doesn't trigger because the image technically loads, just with zero content. Fix in progress uses `naturalWidth === 0` check with 3-second timeout.

### Tasks

1. Locate the event card image component(s). Likely in `app/feed/` or a shared component.
2. Implement a robust image loader that:
   - Sets a fallback gradient placeholder (purple-to-rose, matching brand) immediately
   - Attempts to load the real image
   - On `onLoad`, checks `naturalWidth === 0` and falls back if true
   - Has a 3-second timeout that triggers fallback
   - Logs failures to console with the failing URL (helps Siddhanth audit which sources are broken)
3. Test with at least 5 events: 2 working images, 2 known-broken Ticketmaster URLs, 1 fabricated event.
4. Confirm fallback gradients look intentional (use brand colours, not generic grey).

---

## Phase 3: Supabase persistence (60 min)

**Current state**: state lives in sessionStorage and external APIs. Refresh = lose taste profile. Close tab = lose saved events.

### Goal state

Taste profile and saved events persist across sessions, anonymously (no auth), via a lightweight Supabase setup.

### Tasks

1. Confirm Supabase project exists for Kairos. If not, create one. Use the existing Supabase account; do not create a new organisation.
2. Create two tables:
   - `taste_profiles`: id (uuid, pk), session_id (text, unique), quiz_answers (jsonb), embedding (vector or text), created_at (timestamptz), updated_at (timestamptz)
   - `saved_events`: id (uuid, pk), session_id (text), event_id (text), event_data (jsonb), saved_at (timestamptz)
3. Generate an anonymous session ID on first visit (UUID), store in localStorage. This is the user's "identity" until they explicitly sign in (out of scope for now).
4. On quiz completion: write taste profile to Supabase keyed by session_id. Continue to use sessionStorage for fast reads, treat Supabase as source of truth.
5. On save event: write to saved_events. The saved page reads from Supabase.
6. On page load: hydrate sessionStorage from Supabase if session_id exists.
7. Add `.env.local` entries for Supabase URL and anon key. Do not commit these.

**Surface**: confirm with Siddhanth which Supabase project to use. Do not create new infrastructure without confirmation.

---

## Phase 4: Design system foundation (90 min)

This phase establishes the reusable design primitives that Phase 5 will use everywhere. Build once, use across all pages.

### Tasks

1. **Tailwind config**: extend with the brand tokens from CLAUDE.md. Custom colours, font families, border radii, animation timings.
2. **Typography**:
   - Add Playfair Display and DM Sans via `next/font/google`
   - Create CSS variables `--font-display` and `--font-body`
   - Apply globally in root layout
3. **Dynamic blob component** (`components/Blobs.tsx`):
   - Three blobs at different scales and positions
   - Each blob takes a colour prop from the active palette
   - Slow drift animation (CSS-based, GPU-accelerated transforms only, no JS rAF)
   - Gentle scale pulse
   - `blur(80px)` for the glow effect
   - Opacity 0.3 to 0.4 default, configurable
   - Reads from a global palette context (which is already palette-aware per quiz)
4. **MatchBadge component** (`components/MatchBadge.tsx`):
   - Pill with backdrop-blur, semi-transparent dark fill, purple accent border
   - Score number prominent, "match" label small
   - Subtle glow when first appearing (one-shot animation, not looping)
   - Three sizes: sm (cards), md (hero), lg (event detail)
5. **EventCard component**: rebuild from scratch.
   - Two variants: `compact` (used in feeds) and `hero` (featured tonight).
   - Compact: image with gradient fallback, match badge top-right, category label tiny uppercase, title in Playfair, venue and date in DM Sans, price subtle.
   - Hero: full-width image, larger match badge, AI explanation visible directly on the card in a frosted glass pill (don't bury this, it's the product's differentiator).
6. **FilterPill component**: replace generic chips. Active state uses purple accent fill at 20% opacity with bright border.
7. **Button component**: primary (purple-to-rose gradient), secondary (transparent with border), tertiary (text only). All with consistent hover and active states.

### Surface before acting

Show Siddhanth a Storybook-style preview page (route at `/styleguide`, leave it in the codebase) with all primitives rendered. Get his sign-off before Phase 5.

---

## Phase 5: Page-level redesign (3 hours, can split across sessions)

Apply the design system to every page. Order matters: do them in the order users encounter them.

### 5a. Homepage

Current state is actually decent. Light touch only:
- Confirm Playfair Display is applied to "Discover the nights..."
- Add the dynamic blob component as the background
- Refine the "Start the taste quiz" button (gradient fill, subtle scale-up on hover)
- Footer: tighten typography, add a subtle "v0.1" version mark

### 5b. Quiz

Larger lift. Current state feels like a form. Should feel like a deliberate sequence of choices.

- Each answer option becomes a tactile card, not a list item. Generous padding, hover state with gradient border, selected state with filled background.
- "Continue" button only enables once an answer is selected. Animates in.
- Progress bar at top: thin line, purple, fills smoothly between questions.
- Question count "1 of 8" stays small and unobtrusive.
- Background blobs shift colour subtly between questions, hinting at the personalisation happening.
- Question transitions: previous question fades up and out, next fades up and in. Total transition 400ms.

### 5c. Feed

This is the most important page. Current state is the weakest. Full rebuild.

Structure:
- Hero card at top: "Featured Tonight" — single best match, full-width, large image, prominent AI explanation
- Filter row below hero: pills for "All / Music / Arts / Nightlife / Food", plus secondary filters (when, category, price)
- "For You" carousel: horizontal scroll, the user's strongest matches, compact cards
- "Happening This Week" carousel: same structure, slightly smaller cards
- Optional: "By Category" section if there's room

Design notes:
- Card images use the new fallback system from Phase 2
- Match badges always visible
- Stagger-reveal on scroll using IntersectionObserver
- Horizontal scrolls hide scrollbars, show fade gradients on left/right edges
- Background blobs shift to match the user's palette

### 5d. Event detail page

Current state: unknown, likely barebones. Build properly.

- Large hero image at top
- Title in Playfair, large
- Match score and AI explanation prominent below title
- Event details in clean two-column layout (left: when, where, price; right: description)
- "Save" button (heart icon, fills purple when saved)
- "Get tickets" button (primary CTA, opens Ticketmaster link)
- "Why this matches you" expanded section: bullet list of taste signals that drove the match
- Related events at the bottom: 3 to 4 compact cards

### 5e. Passport (taste profile page)

- Show the user's taste profile visually: a radial chart or constellation showing their preferences across the 8 quiz dimensions
- "Retake the quiz" CTA at the bottom
- "Reset profile" with confirmation modal

### 5f. Saved page

- Grid of saved events using the compact card variant
- Empty state if nothing saved yet: encouraging copy, link back to feed

---

## Phase 6: Motion pass (60 min)

Now that the visual layer is in place, layer in motion. Some of this overlaps with earlier phases; this is the consolidation step.

### Tasks

1. **Blob motion**: confirm drift and pulse animations work on every page. Performance check: 60fps on mid-range laptop.
2. **Card stagger reveals**: IntersectionObserver hook (`useStaggerReveal`), apply to all card grids and carousels.
3. **Page transitions**: use Next.js layouts to fade between routes. 200ms dissolve, no slide.
4. **Quiz transitions**: confirm the question fade-up works, selected answer pulses once.
5. **Match badge glow**: one-shot animation when first revealed, never loops.
6. **Button interactions**: subtle scale (0.98) on active, brightness boost on hover.
7. **Loading states**: replace any spinner with a skeleton shimmer using brand colours.

Test on a real mobile device, not just Chrome DevTools.

---

## Phase 7: Polish and audit (60 min)

The catch-all phase. Don't skip it.

### Tasks

1. **Empty states**: every list, feed, and grid has a designed empty state. No "No data" raw text.
2. **Error states**: API failures show a branded error component, not a Next.js error page.
3. **Loading states**: every async action has a loading state. No frozen UI.
4. **Mobile audit**: open every page on mobile width (375px). Fix anything cramped, off-screen, or hard to tap. Tap targets minimum 44x44.
5. **Accessibility quick pass**: alt text on images, aria-labels on icon buttons, keyboard navigation on the quiz.
6. **Lighthouse run**: target 90+ on Performance, Accessibility, Best Practices. Document any issues that can't be fixed without framework changes (out of scope per CLAUDE.md rule #1).
7. **404 page**: branded, not the Next.js default.
8. **Favicon and metadata**: proper favicon, OG image (the hero card design works), title and description on every page.

---

## Phase 8: Final QA (30 min)

1. Full user journey: arrive at homepage → take quiz → land on feed → click event → save it → check saved page → return to feed.
2. Test in Chrome, Safari (via BrowserStack or borrowed Mac), mobile Safari.
3. Lighthouse scores documented.
4. SESSIONS.md updated with the full arc.
5. Push to main, confirm Vercel deploys, click around the live URL.
6. Notify Siddhanth: ready to share.

---

## How to handle problems

- **If a fix requires a framework version change**: stop, surface to Siddhanth.
- **If you're stuck in a loop**: stop, summarise what you tried, hand off to Cowork or back to Claude AI chat.
- **If scope expands**: stop, add to a "future work" section in SESSIONS.md, do not start it.
- **If Supabase or Pinecone are down**: continue with the design work, mock the data layer.
- **If you discover something broken that wasn't in the brief**: surface it, don't silently fix it.

---

## Definition of done

- All phases complete.
- Live URL works end-to-end on desktop and mobile.
- Lighthouse 90+ on the four core metrics.
- Zero console errors on any page.
- SESSIONS.md is current.
- Siddhanth has clicked through every page and signed off.

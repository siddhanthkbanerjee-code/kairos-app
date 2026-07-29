# CURRENT_TASK_real_events.md — Kairos Real Events Pipeline

## Start here

Open Claude Code at `C:\Users\rb110\Documents\CafeCursor\` — the folder one level above `kairos`, not the `kairos` folder itself. That's where the actual git repo root (`.git`) lives; the `kairos` folder is just the app code inside it. Opening scoped to `kairos\` only means Claude Code can edit files but can't commit or push. GitHub remote: `https://github.com/siddhanthkbanerjee-code/kairos-app.git`, remote name `kairos-app`, branch `main`.

Once open: read `CLAUDE.md` in full first (standing rules, design tokens). Then use this file as the active task, either paste its contents in as `CURRENT_TASK.md` or tell Claude Code directly "work from CURRENT_TASK_real_events.md." All CLAUDE.md standing rules apply: no framework/dependency version changes, no em dashes, PowerShell one command at a time, confirm before destructive operations, `npm run build` clean before any push.

This brief replaces the Ticketmaster-dependent parts of the old CURRENT_TASK.md. It exists because the previous live integration kept breaking (stale dates, dead images) and got replaced with a fully fabricated dataset. That solved reliability but killed the "wow" factor: a recruiter can tell a fabricated event apart from a real one they'd actually consider going to. This brief brings back real events, structured so nothing at runtime depends on a live third-party call, and refreshing the dataset is a script that runs itself.

---

## Secrets and access checklist (read this before starting)

**Already in place, no action needed.** `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`, `ANTHROPIC_API_KEY` already exist in `.env.local` and in Vercel's production environment. Reuse them as-is.

**Event-source keys: at least one required, both supported, use whichever are present.** Do not hardcode either one as "the" required source, treat this as a set that grows as keys become available:
- `TICKETMASTER_API_KEY` — free, developer.ticketmaster.com. Default quota 5,000 calls/day at 5 requests/second.
- `SKIDDLE_API_KEY` — free, skiddle.com/api/join.php, approval usually comes back same-day. Account starts rate-limited; email dev@skiddle.com if that becomes a problem, and before any commercial use.

As of this brief's last update, `SKIDDLE_API_KEY` is confirmed present in `.env.local`. `TICKETMASTER_API_KEY` is in progress (Siddhanth is logging in to retrieve it) and may or may not be present yet when you read this, check `.env.local` rather than assuming either way. **The rule: if at least one of the two keys is present, proceed.** The ingestion script (Phase 2) should check both independently at runtime, query whichever key exists, merge results if both are present, and skip a source cleanly (no error) if its key is absent. Do not block the whole pipeline waiting on the second key, whichever one that turns out to be. When the missing key lands, dropping it into `.env.local` (and later GitHub Actions secrets) is the only change needed, no code changes, no re-running earlier phases.

Other sources were evaluated and ruled out for now: Eventbrite's public API no longer supports third-party cross-organizer search, Dice.fm has no open self-serve API, Resident Advisor has no official API (only unofficial scrapers, the exact fragility this brief exists to avoid), Bandsintown's API only looks up events for a named artist rather than searching a city, Songkick requires up to a 30 working day manual approval, and Ents24 (which does have a usable free API) forbids caching data for more than an hour under its non-commercial licence, which conflicts with the twice-weekly refresh model this whole pipeline is built around. None of these are worth blocking on. Revisit only if Ticketmaster plus anchors genuinely proves too thin after real curation, not preemptively.

**Settled: image storage is Vercel Blob**, not Supabase Storage. Rationale: Hobby plan includes 5GB storage and 100GB data transfer free every month, no card required. This dataset (a few hundred small WebP images) sits well under 100MB total, so this costs nothing. It also avoids reopening the Supabase intake decision, which explicitly said "no Storage" when the `kairos` schema was provisioned in the shared `fuel-tracker` project. Action needed: enable Blob storage on the `kairos` Vercel project (Vercel dashboard → project → Storage tab → Create Database → Blob, or `vercel blob store add` via CLI). This auto-generates and injects `BLOB_READ_WRITE_TOKEN` into the project's env vars, no manual key copying needed for local dev, run `vercel env pull` after enabling it.

**Once the pipeline works end to end**, duplicate all of the above into the GitHub repo's secrets (Settings → Secrets and variables → Actions), since GitHub Actions runs in its own environment, separate from Vercel: `TICKETMASTER_API_KEY`, `SKIDDLE_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`, `ANTHROPIC_API_KEY`.

---

## Goal

Replace the fabricated event dataset with a curated set of real London events and real recurring venue nights, self-hosted (images and data) so the live site never depends on a third-party call at runtime, and set up an automated refresh that runs twice a week without Siddhanth touching anything.

End state: every event on the site is either a real upcoming event from Ticketmaster and/or Skiddle (whichever keys are live), or a real recurring night at a real venue with a real ticket link. Nothing is invented. Nothing breaks between refreshes. Shipping on a single source plus anchors is a complete, correct v1, not a partial one, each additional source is additive coverage, not a dependency.

---

## Scope

**In scope:**
1. New ingestion script that pulls real events from Ticketmaster's Discovery API and Skiddle's Events API
2. A curated seed file of real recurring London venues/nights (evergreen anchors), verified and expanded from the starter list in Phase 1
3. Self-hosted images via Vercel Blob (download at ingestion time, convert to WebP, upload, never rely on the source CDN at runtime)
4. Curation logic to go from "thousands of API results" down to a few hundred well-chosen events
5. Dedup logic across the two sources
6. Pinecone re-embed and upsert for new/changed events only
7. A GitHub Actions workflow that runs the pipeline twice a week automatically
8. Retiring `scripts/build-events.mjs` as the production data source (keep the file, do not delete, just stop calling it in production)

**Out of scope:**
- Any change to `/api/recommend/route.ts`'s query, scoring, or boost logic (see the schema note in Phase 2, this is designed to need zero route changes)
- Any new event categories or sources beyond Ticketmaster + Skiddle + curated anchors
- Payments, auth, venue onboarding — unchanged from the old brief's out-of-scope list
- Algorithm changes beyond what's needed to keep past-event filtering working

---

## Phase 0: Confirm accounts and keys (15 min)

1. Check `.env.local` for `TICKETMASTER_API_KEY` and `SKIDDLE_API_KEY` independently. Note which are present, don't assume either one specifically.
2. Confirm Vercel Blob is enabled on the `kairos` project and `BLOB_READ_WRITE_TOKEN` is present after `vercel env pull`. Not a blocker for Phase 0 or Phase 1, needed before Phase 3.
3. Proceed to Phase 1 (recurring anchors) regardless of key status, that phase needs neither key.

**Surface:** stop and ask only if **both** `TICKETMASTER_API_KEY` and `SKIDDLE_API_KEY` are missing, that's the actual hard prerequisite, at least one real event source. If exactly one is present, say which, and continue, don't wait for the other.

---

## Phase 1: Curated recurring anchors seed (45 min)

These are the evergreen backbone: real venues with real, ongoing programming, so the feed always has recognizable, iconic nights even in a quiet API week. Their dates roll forward automatically at each pipeline run, so they need almost zero maintenance once seeded correctly.

**Starter list, verified as currently operating (confirm again at build time, venue programming can change):**
- **Fabric** (77a Charterhouse Street, Farringdon) — Friday and Saturday nights, multi-room electronic/dance, confirmed actively running events through 2026 via fabriclondon.com/whats-on.
- **Ronnie Scott's** (Frith Street, Soho) — live jazz every night since 1959, main show plus late set plus Upstairs at Ronnie's, confirmed actively booking through December 2026 via ronniescotts.co.uk/find-a-show.
- **Tate Modern Lates** — Friday and Saturday late openings until 21:00, confirmed as an established ongoing weekend program via tate.org.uk.

**Tasks:**
1. Verify each starter entry's current details (exact hours, current ticket/info URL) before adding it. Search each venue's own site, don't trust a cached snapshot.
2. Expand to 15 to 25 total entries by researching and verifying additional real, currently-operating recurring London nights across categories: more music/nightlife (consider Southbank Centre's regular series, Corsica Studios, EartH Hackney — verify each is currently operating before including), comedy club residencies (Top Secret Comedy Club, Angel Comedy Club — verify), dance/theatre (Sadler's Wells' regular programme — verify), immersive or late-museum programming beyond Tate if any other institution runs one currently. Do not include a venue without confirming via its own current website that it's operating and has the recurring pattern claimed. A closed or defunct venue is worse than no anchor at all.
3. Create `data/recurring-anchors.json`. Each entry needs: venue name, a real recurring pattern (day of week, or "first Friday of the month," etc.), a real ticket/info URL pointing at the venue's actual listings page (not a specific past event, since the exact lineup changes week to week), a genre/category, vibe tags, and a description written to stay true regardless of that week's specific lineup (e.g. "Fabric's Friday night is London's most enduring warehouse rave, multiple rooms, till late" rather than naming a specific DJ who may not still be booked).
4. Write `scripts/lib/resolve-anchor-dates.mjs`: takes today's date and a recurring pattern, returns the next 1 to 2 upcoming absolute dates (ISO). Runs fresh every pipeline execution, so an anchor's date is never stale.
5. Anchor images: use your own photography or venue-provided press images if rights allow, or fall back to the existing branded gradient + icon system in `EventImageWithFallback.tsx`. Do not use an AI-generated image of a real, named venue, that undercuts the "this is real" premise the whole brief exists to deliver.

**Surface:** show Siddhanth the final anchor list before it goes live. This is the one hand-curated part of the dataset and should reflect venues he'd personally vouch for.

---

## Phase 2: Ingestion script (2 hours)

Build `scripts/build-real-events.mjs`, structured as a resumable pipeline similar to the existing `build-events.mjs` (checkpoint file, phases, safely re-runnable).

1. **Fetch.** Check `TICKETMASTER_API_KEY` and `SKIDDLE_API_KEY` independently and query whichever are present, this must never error or block on either one being absent. If `TICKETMASTER_API_KEY` is set, query Discovery API for London events in the next 6 to 8 weeks across the categories Kairos cares about (music, nightlife, arts, comedy, food, sports), respecting its rate limit (5 rps). If `SKIDDLE_API_KEY` is set, query Skiddle similarly for club nights and gigs. If both are present, merge results in the dedup step below. If only one is present, proceed on that source plus the recurring anchors alone, and note in the run summary which source was skipped and why, so it's visible when the second key gets added later.
2. **Normalize.** Map both sources into the shape Pinecone metadata already expects: `name`, `venue_name`, `start_date` (absolute ISO, see note below), `price_display`, `image_url` (source URL for now, replaced in Phase 3), `url` (real ticket link), `vibe_tags`, `event_dna` (object with at minimum `genre` and `source: "ticketmaster" | "skiddle" | "recurring_anchor"`).

   **Schema note:** `computeEventDate()` in `route.ts` already reads `metadata.start_date` as an absolute ISO string whenever `date_offset_days`/`date_offset_hours` aren't present. Real events naturally have absolute dates, populate `start_date` directly. Recurring anchors get `start_date` recomputed fresh by `resolve-anchor-dates.mjs` on every run. **This means `route.ts` needs zero changes.** Leave the offset-based logic alone, it's harmless legacy code.
3. **Dedup.** Fuzzy-match on venue name + date + normalized event name (lowercase, strip punctuation, similarity compare). Prefer the Ticketmaster copy when both sources have the same event.
4. **Curate.** The step that matters most. London returns thousands of matches, not a shortage. Filter and rank to roughly 250 to 400 total events (real + anchors) via a scoring pass: prioritize recognizable/branded venues, enforce category diversity, drop anything missing critical fields, drop anything that clearly doesn't fit "cultural event discovery." Log what was dropped and why, don't silently discard.
5. **Verify ticket links.** HEAD request against `url` for every event (or a large sample if budget-constrained), drop anything returning 404 or 5xx. A dead "Get tickets" button is the fastest way to break the "this is real" premise for anyone who actually clicks.

**Surface:** run once against a small batch (10 to 20 events) first, show Siddhanth the output shape and a couple of example descriptions/images before running the full set.

---

## Phase 3: Self-hosted images via Vercel Blob (45 min)

The old failure mode was Ticketmaster's CDN serving technically-200 but empty images. Nothing at runtime should depend on any external image URL, ever.

1. For every new or changed event, download the source image and convert to WebP using the same approach as the existing `scripts/convert-to-webp.mjs`, reuse that logic, target similar quality/size to what's already in `public/events/`.
2. Upload to Vercel Blob using `@vercel/blob`'s `put()`. Use public access so images serve directly from Blob's CDN without a Function round-trip. Do not commit rotating images into git, a twice-weekly rotating dataset committed that way bloats repo history within months.
3. Write the resulting Blob URL into `image_url`, replacing the source URL from step 1.
4. Keep `EventImageWithFallback.tsx`'s existing fallback logic exactly as-is (branded gradient + category icon, 3-second timeout, `naturalWidth === 0` check). Good safety net even for self-hosted images, storage outages happen too, and it needs no changes.

---

## Phase 4: Embed and upsert (30 min)

1. For new events only, generate a short, honest description via the existing Claude Sonnet call pattern from `build-events.mjs` (batches of 5). Stick to what's true: venue, vibe, genre, kind of night. Do not fabricate details the source data doesn't support.
2. Embed new/changed events with `text-embedding-3-large`, reuse existing embeddings for anything unchanged (compare a hash of the normalized event data against the last run's checkpoint).
3. Pinecone upsert: delete-then-upsert by ID, scoped to events that changed or have now passed their date, not a full index wipe every run.
4. Write the final set to `data/events.json` for local reference and debugging.

---

## Phase 5: Automation (45 min)

1. Add `.github/workflows/refresh-events.yml`. Cron: twice a week, suggest Monday and Thursday, early UK morning (GitHub Actions cron runs in UTC, convert accordingly).
2. Workflow: checkout, install deps, run `node scripts/build-real-events.mjs`, commit `data/events.json` and checkpoint file if changed, push to `main`. Pushing triggers the existing Vercel auto-deploy, no separate deploy step.
3. Confirm all secrets from the checklist at the top of this brief are added to the GitHub repo before enabling the schedule. Claude Code cannot add these itself, list exactly which ones are still missing and stop.
4. Add a run summary step logging: events fetched, events after curation, events dropped and why, dead links removed, images processed, estimated run cost. This becomes Siddhanth's twice-weekly at-a-glance health check.

**Surface:** show Siddhanth the workflow file and the exact secret list before enabling the schedule. Recommend a first manual trigger (`workflow_dispatch`) to test end-to-end before trusting the cron.

---

## Cost note (for reference, not a task)

Ticketmaster and Skiddle APIs are free. Vercel Blob is free at this dataset size. The old $24 DALL-E image bill goes away entirely. Remaining cost is embeddings (a full re-embed of ~350 events is roughly one cent at $0.13/million tokens) and Claude description calls for new events only (low single-digit dollars a month at most). Expect total ongoing cost in the $2 to $5/month range.

---

## How to handle problems

- If Ticketmaster or Skiddle changes their API shape or rate limits: surface it, do not silently work around it with scraping. Scraping is what broke the last attempt.
- If an API is down during a scheduled run: fail loudly (non-zero exit, visible in GitHub Actions), don't silently publish a partial or empty dataset. The site should keep serving the last good state if a run fails.
- If curation can't find enough good events in a quiet week: keep the previous run's still-upcoming events rather than padding with lower-quality matches. Never fall back to fabrication silently, if real coverage genuinely runs thin, ask.
- If this requires a framework version change: stop, surface it, per CLAUDE.md standing rule 1.

---

## Definition of done

- Every event visible on the live site traces back to a real Ticketmaster/Skiddle event or a real, verified curated recurring venue night.
- No event card shows a broken image or a dead ticket link when spot-checked.
- `route.ts` unchanged.
- GitHub Actions workflow runs successfully on a manual trigger end to end, secrets confirmed in place, cron enabled.
- CLAUDE.md and SESSIONS.md updated to reflect the new pipeline as the production source, replacing references to the fabricated dataset.
- `npm run build` clean, pushed to main, Vercel deploy confirmed.

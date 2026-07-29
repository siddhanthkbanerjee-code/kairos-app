# Kairos: Supabase Consolidation Brief Reply

## 1. Tables and data model

Two tables, both new (greenfield, per CURRENT_TASK.md Phase 3):

- `taste_profiles`: id (uuid, pk), session_id (text, unique), quiz_answers (jsonb), embedding (text or vector), created_at, updated_at
- `saved_events`: id (uuid, pk), session_id (text), event_id (text), event_data (jsonb), saved_at

Nothing here needs to be hidden from other builds beyond standard schema isolation. No PII, no payment data, no credentials. Event content itself (title, venue, description) lives in Pinecone and `events.json`, not Supabase. Supabase only stores the user's taste profile and their save-list.

## 2. Auth

None. No Supabase Auth. Identity is an anonymous UUID generated client-side on first visit, stored in localStorage, sent as `session_id`. No sign-in, no OAuth, no magic link. Not shared with any other build's user base since there's no real user concept yet.

## 3. Storage

Not needed. Event images are pre-generated (DALL-E 3) and served from `public/events/` as WebP, or from Ticketmaster URLs. No user uploads.

## 4. Realtime

Not needed. No live subscriptions.

## 5. Edge Functions

None currently, none planned in this brief.

## 6. Expected load

Trivial. Portfolio project, not live traffic. Low tens of rows in each table during dev/demo use, effectively single-digit concurrent users (just me testing). Won't touch the 500MB DB or 5GB bandwidth caps.

## 7. Sensitivity

Low. No real user PII, no payments, no auth credentials. Fine to share infrastructure with schema isolation. Doesn't need a dedicated project slot.

## 8. Migration status

Greenfield, not yet connected. Phase 3 of the current build brief (Supabase persistence) hasn't been executed yet. No existing Supabase project tied to Kairos.

## Anything else

Whatever schema name and scoped role you provision, I'll need the connection string, schema name, and role credentials to drop into `.env.local` (not committed). No other requirements.

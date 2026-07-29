// scripts/build-real-events.mjs
// Test run:  node --env-file=.env.local scripts/build-real-events.mjs --sample=15
// Full run:  node --env-file=.env.local scripts/build-real-events.mjs
// Resume:    same command. Reads checkpoint and skips completed work.
// Images:    add --skip-images to skip Phase 3 (image hosting); add --images-limit=N
//            to cap how many images are processed this run (for testing).
// Pinecone:  add --skip-pinecone to skip Phase 4 (descriptions/embed/upsert).
//
// Pipeline: Fetch (Ticketmaster + Skiddle + recurring anchors) -> Normalize ->
// Dedup -> Curate -> Verify ticket links -> Host images on Vercel Blob ->
// Generate descriptions -> Embed -> Pinecone upsert -> write data/events.json.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { put } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { resolveAnchorDates } from "./lib/resolve-anchor-dates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ANCHORS_PATH = path.join(ROOT, "data", "recurring-anchors.json");
const CHECKPOINT_PATH = path.join(ROOT, "data", "real-events-checkpoint.json");

const VALID_CATEGORIES = new Set(["music", "nightlife", "comedy", "food", "arts", "sports", "wellness", "misc"]);
const CATEGORY_CAP_SHARE = 0.35; // no single category may exceed this share of the curated set
const TARGET_MIN = 250;
const TARGET_MAX = 400;
const WINDOW_WEEKS_MIN = 6;
const WINDOW_WEEKS_MAX = 8;

const args = process.argv.slice(2);
const sampleArg = args.find((a) => a.startsWith("--sample="));
const SAMPLE_SIZE = sampleArg ? Number(sampleArg.split("=")[1]) : null;
const SKIP_IMAGES = args.includes("--skip-images");
const imagesLimitArg = args.find((a) => a.startsWith("--images-limit="));
const IMAGES_LIMIT = imagesLimitArg ? Number(imagesLimitArg.split("=")[1]) : null;
const SKIP_PINECONE = args.includes("--skip-pinecone");
const descLimitArg = args.find((a) => a.startsWith("--desc-limit="));
const DESC_LIMIT = descLimitArg ? Number(descLimitArg.split("=")[1]) : null;

const EVENTS_JSON_PATH = path.join(ROOT, "data", "events.json");

function priceTierToDisplay(tier) {
  return { free: "Free", low: "£5-15", mid: "£15-35", premium: "£35+" }[tier] ?? "Price TBA";
}

// CLAUDE.md rule 7: no em dashes anywhere, in generated copy included. LLM
// instruction-following on this isn't 100% reliable at 400-event scale, so
// enforce it deterministically rather than trusting the prompt alone.
function stripEmDashes(text) {
  if (!text) return text;
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function contentHash(event) {
  const payload = JSON.stringify({
    title: event.title,
    venue: event.venue,
    venueArea: event.venueArea,
    category: event.category,
    startDate: event.startDate,
    priceTier: event.priceTier,
    vibeDescriptors: event.vibeDescriptors,
    url: event.url,
    sourceDescription: event.sourceDescription ?? null,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function loadCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf-8"));
  } catch {
    return { runs: [], events: {} };
  }
}

export function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Transient network errors (a real one hit mid-run during testing) shouldn't
// kill an unattended twice-weekly cron run outright; retry a few times with
// backoff before giving up and letting the batch fail through to next run.
async function withRetry(fn, { retries = 3, baseDelayMs = 2000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = baseDelayMs * 2 ** attempt;
        console.warn(`\n  Transient error (${err.message}), retrying in ${delay}ms (attempt ${attempt + 1}/${retries})...`);
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeForDedup(str) {
  return (str ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSetSimilarity(a, b) {
  const setA = new Set(normalizeForDedup(a).split(" ").filter(Boolean));
  const setB = new Set(normalizeForDedup(b).split(" ").filter(Boolean));
  if (!setA.size || !setB.size) return 0;
  let overlap = 0;
  for (const t of setA) if (setB.has(t)) overlap++;
  return overlap / Math.max(setA.size, setB.size);
}

function windowDates() {
  const now = new Date();
  const start = new Date(now);
  const endMin = new Date(now);
  endMin.setDate(endMin.getDate() + WINDOW_WEEKS_MIN * 7);
  const endMax = new Date(now);
  endMax.setDate(endMax.getDate() + WINDOW_WEEKS_MAX * 7);
  return { start, endMin, endMax };
}

// ---------------------------------------------------------------------------
// Fetch: Ticketmaster
// ---------------------------------------------------------------------------

const TM_SEGMENT_TO_CATEGORY = {
  music: "music",
  sports: "sports",
  "arts & theatre": "arts",
  film: "arts",
  miscellaneous: "misc",
};

function categorizeTicketmaster(classification) {
  const segment = (classification?.segment?.name ?? "").toLowerCase();
  const genre = (classification?.genre?.name ?? "").toLowerCase();
  const subGenre = (classification?.subGenre?.name ?? "").toLowerCase();
  const hay = `${genre} ${subGenre}`;

  if (segment.includes("arts") && hay.includes("comedy")) return "comedy";
  if (segment === "music" && /(dance|electronic|house|techno|club)/.test(hay)) return "nightlife";
  return TM_SEGMENT_TO_CATEGORY[segment] ?? "misc";
}

function bestTicketmasterImage(images) {
  const candidates = (images ?? []).filter((im) => im.ratio === "16_9" && im.width >= 1000);
  return candidates[0]?.url ?? images?.[0]?.url ?? null;
}

async function fetchTicketmasterEvents(apiKey, { maxPages = 10 } = {}) {
  const { start, endMax } = windowDates();
  const startDateTime = start.toISOString().slice(0, 19) + "Z";
  const endDateTime = endMax.toISOString().slice(0, 19) + "Z";

  const raw = [];
  for (let page = 0; page < maxPages; page++) {
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&city=London&countryCode=GB&startDateTime=${startDateTime}&endDateTime=${endDateTime}&size=50&page=${page}`;
    const res = await fetch(url);
    if (res.status === 429) {
      console.warn("  Ticketmaster rate limited, backing off 2s...");
      await sleep(2000);
      page--;
      continue;
    }
    if (!res.ok) {
      console.warn(`  Ticketmaster page ${page} failed: HTTP ${res.status}`);
      break;
    }
    const json = await res.json();
    const events = json._embedded?.events ?? [];
    raw.push(...events);
    process.stdout.write(`\r  Ticketmaster: fetched ${raw.length} raw events (page ${page + 1})`);
    if (events.length < 50) break; // last page
    await sleep(210); // stay under 5 rps
  }
  console.log();
  return raw;
}

function normalizeTicketmasterEvent(e) {
  const venue = e._embedded?.venues?.[0];
  const category = categorizeTicketmaster(e.classifications?.[0]);
  const price = e.priceRanges?.[0];
  return {
    id: `tm-${e.id}`,
    title: e.name,
    category,
    venue: venue?.name ?? null,
    venueArea: venue?.city?.name ?? "London",
    vibeDescriptors: [e.classifications?.[0]?.genre?.name, e.classifications?.[0]?.subGenre?.name]
      .filter((v) => v && v.toLowerCase() !== "undefined")
      .map((v) => slugify(v)),
    priceTier: price ? priceToTier(price.min, price.max) : "mid",
    startDate: e.dates?.start?.dateTime ?? (e.dates?.start?.localDate ? `${e.dates.start.localDate}T20:00:00Z` : null),
    sourceImageUrl: bestTicketmasterImage(e.images),
    url: e.url ?? null,
    isFabricated: false,
    source: "ticketmaster",
  };
}

function priceToTier(min, max) {
  const mid = ((min ?? 0) + (max ?? min ?? 0)) / 2;
  if (mid <= 0) return "free";
  if (mid <= 15) return "low";
  if (mid <= 35) return "mid";
  return "premium";
}

// ---------------------------------------------------------------------------
// Fetch: Skiddle
// ---------------------------------------------------------------------------

const SKIDDLE_EVENTCODE_TO_CATEGORY = {
  CLUB: "nightlife",
  LIVE: "music",
  COMEDY: "comedy",
  THEATRE: "arts",
  EXHIB: "arts",
  KIDS: "misc",
  BARPUB: "nightlife",
  LGB: "nightlife",
  SPORT: "sports",
  ARTS: "arts",
  FEST: "misc",
  DATE: "misc",
};

async function fetchSkiddleEvents(apiKey, { maxPages = 10 } = {}) {
  const { start, endMax } = windowDates();
  const minDate = start.toISOString().slice(0, 10);
  const maxDate = endMax.toISOString().slice(0, 10);

  const raw = [];
  for (let page = 0; page < maxPages; page++) {
    const offset = page * 100;
    const url = `https://www.skiddle.com/api/v1/events/search/?api_key=${apiKey}&country=GB&keyword=London&description=1&minDate=${minDate}&maxDate=${maxDate}&limit=100&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  Skiddle page ${page} failed: HTTP ${res.status}`);
      break;
    }
    const json = await res.json();
    if (json.error) {
      console.warn(`  Skiddle API error: ${JSON.stringify(json).slice(0, 200)}`);
      break;
    }
    const events = (json.results ?? []).filter((e) => e.cancelled !== "1" && e.venue?.town === "London");
    raw.push(...events);
    process.stdout.write(`\r  Skiddle: fetched ${raw.length} raw events (page ${page + 1})`);
    if ((json.results ?? []).length < 100) break;
    await sleep(150);
  }
  console.log();
  return raw;
}

function skiddlePriceTier(e) {
  const min = e.ticketpricing?.minPrice;
  if (min === undefined || min === null) return "mid";
  return priceToTier(min, e.ticketpricing?.maxPrice ?? min);
}

function validUrlOrNull(value) {
  if (!value) return null;
  // Skiddle's ticketUrl field is sometimes percent-encoded (e.g. "https%3A%2F%2F...").
  const decoded = value.includes("%3A%2F%2F") ? decodeURIComponent(value) : value;
  try {
    const u = new URL(decoded);
    return u.protocol === "http:" || u.protocol === "https:" ? decoded : null;
  } catch {
    return null;
  }
}

function normalizeSkiddleEvent(e) {
  return {
    id: `sk-${e.id}`,
    title: e.eventname,
    category: SKIDDLE_EVENTCODE_TO_CATEGORY[e.EventCode] ?? "misc",
    venue: e.venue?.name ?? null,
    venueArea: e.venue?.town ?? "London",
    vibeDescriptors: (e.genres ?? []).map((g) => slugify(typeof g === "string" ? g : g?.name ?? "")).filter(Boolean),
    priceTier: skiddlePriceTier(e),
    startDate: e.startdate ?? (e.date ? `${e.date}T22:00:00Z` : null),
    sourceImageUrl: e.xlargeimageurl ?? e.largeimageurl ?? e.imageurl ?? null,
    url: validUrlOrNull(e.ticketUrl) ?? validUrlOrNull(e.link),
    isFabricated: false,
    source: "skiddle",
    sourceDescription: e.description ?? null,
  };
}

// ---------------------------------------------------------------------------
// Fetch: recurring anchors
// ---------------------------------------------------------------------------

function loadAnchorEvents() {
  const anchors = JSON.parse(fs.readFileSync(ANCHORS_PATH, "utf-8"));
  const events = [];
  for (const a of anchors) {
    const dates = resolveAnchorDates(a.pattern, new Date(), 2);
    for (const [i, isoDate] of dates.entries()) {
      events.push({
        id: `anchor-${a.id}-${isoDate.slice(0, 10)}`,
        title: a.venue,
        category: a.category,
        venue: a.venue,
        venueArea: a.venueArea,
        vibeDescriptors: a.vibeDescriptors,
        priceTier: a.priceTier,
        startDate: isoDate,
        sourceImageUrl: null,
        url: a.url,
        isFabricated: false,
        source: "recurring_anchor",
        sourceDescription: a.description,
        anchorOccurrence: i + 1,
      });
    }
  }
  return events;
}

// ---------------------------------------------------------------------------
// Normalize validation
// ---------------------------------------------------------------------------

function hasCriticalFields(e) {
  return Boolean(e.title && e.venue && e.startDate && e.url && VALID_CATEGORIES.has(e.category));
}

// ---------------------------------------------------------------------------
// Dedup
// ---------------------------------------------------------------------------

function dedupEvents(events) {
  const SOURCE_PRIORITY = { ticketmaster: 3, recurring_anchor: 2, skiddle: 1 };
  const buckets = new Map();

  for (const e of events) {
    const dateKey = (e.startDate ?? "").slice(0, 10);
    const venueKey = normalizeForDedup(e.venue ?? "");
    const key = `${venueKey}|${dateKey}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(e);
  }

  const kept = [];
  let dropped = 0;
  for (const bucket of buckets.values()) {
    const groups = [];
    for (const e of bucket) {
      const group = groups.find((g) => tokenSetSimilarity(g[0].title, e.title) > 0.6);
      if (group) group.push(e);
      else groups.push([e]);
    }
    for (const group of groups) {
      if (group.length === 1) {
        kept.push(group[0]);
        continue;
      }
      group.sort((a, b) => (SOURCE_PRIORITY[b.source] ?? 0) - (SOURCE_PRIORITY[a.source] ?? 0));
      kept.push(group[0]);
      dropped += group.length - 1;
    }
  }

  return { kept, dropped };
}

// ---------------------------------------------------------------------------
// Collapse recurring production runs
// ---------------------------------------------------------------------------

// Long West End-style runs list every performance as a separate Ticketmaster
// event ("...Sat 14:00 & 19:00", "...Sun 13:00 & 18:00", etc). Same-day dedup
// above doesn't catch these since each performance is a different date. Strip
// the showtime/weekday noise and collapse anything with more than a handful
// of distinct dates down to its single nearest upcoming performance.
function coreTitle(title) {
  return (title ?? "")
    .replace(/\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(day)?\b/gi, "")
    .replace(/\d{1,2}[:.]\d{2}\s*(am|pm)?/gi, "")
    .replace(/\b\d{1,2}\s*(am|pm)\b/gi, "")
    .replace(/[-–—]\s*parts?\s*\d[\s&\d]*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function collapseRecurringRuns(events, { maxDatesPerRun = 3 } = {}) {
  const groups = new Map();
  for (const e of events) {
    const key = `${normalizeForDedup(e.venue)}|${normalizeForDedup(coreTitle(e.title))}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }

  const kept = [];
  let collapsed = 0;
  for (const group of groups.values()) {
    if (group.length <= maxDatesPerRun) {
      kept.push(...group);
      continue;
    }
    group.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    kept.push(group[0]);
    collapsed += group.length - 1;
  }
  return { kept, collapsed };
}

// ---------------------------------------------------------------------------
// Curate
// ---------------------------------------------------------------------------

function scoreEvent(e) {
  let score = 5;
  if (e.source === "ticketmaster") score += 2;
  if (e.source === "recurring_anchor") score += 1;
  if (e.sourceImageUrl) score += 1;
  if (e.priceTier && e.priceTier !== "mid") score += 0.5;
  return score;
}

function curateEvents(events, targetMax) {
  const dropped = { missingFields: 0, categoryOverflow: 0 };
  const valid = [];
  for (const e of events) {
    if (!hasCriticalFields(e)) {
      dropped.missingFields++;
      continue;
    }
    valid.push({ ...e, score: scoreEvent(e) });
  }

  if (valid.length <= targetMax) {
    return { curated: valid, dropped };
  }

  // Anchors are the hand-curated, evergreen backbone (Phase 1) and are few in
  // number (well under targetMax): always keep all of them, uncapped and
  // unscored against the API pool, so a thin real-time category (food, at the
  // time of writing) still shows up rather than losing a global score fight
  // against high-volume categories like nightlife.
  const anchors = valid.filter((e) => e.source === "recurring_anchor");
  const apiEvents = valid.filter((e) => e.source !== "recurring_anchor");
  const remaining = Math.max(0, targetMax - anchors.length);

  const cap = Math.floor(targetMax * CATEGORY_CAP_SHARE);
  const byCategory = new Map();
  for (const e of apiEvents) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category).push(e);
  }

  const cappedPool = [];
  for (const [, list] of byCategory) {
    list.sort((a, b) => b.score - a.score);
    const capped = list.slice(0, cap);
    dropped.categoryOverflow += list.length - capped.length;
    cappedPool.push(...capped);
  }

  cappedPool.sort((a, b) => b.score - a.score);
  dropped.categoryOverflow += Math.max(0, cappedPool.length - remaining);
  return { curated: [...anchors, ...cappedPool.slice(0, remaining)], dropped };
}

// ---------------------------------------------------------------------------
// Verify ticket links
// ---------------------------------------------------------------------------

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Per the brief: only 404 and 5xx count as "dead". Ticketing sites routinely
// return 401/403 to bot-detected script requests (confirmed live against real,
// genuinely-on-sale Ticketmaster events) so those are treated as unverifiable,
// not broken, and the event is kept.
function isDeadStatus(status) {
  return status === 404 || (status >= 500 && status < 600);
}

async function verifyLink(url, { timeoutMs = 6000 } = {}) {
  const headers = { "User-Agent": BROWSER_UA };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: "HEAD", redirect: "follow", headers, signal: controller.signal });
    clearTimeout(timer);
    if (!isDeadStatus(res.status)) return { ok: true, status: res.status };
    // Some venue sites reject HEAD specifically (405) rather than the URL being
    // dead; retry with GET before condemning the link.
    const getRes = await fetch(url, { method: "GET", redirect: "follow", headers });
    return { ok: !isDeadStatus(getRes.status), status: getRes.status };
  } catch (err) {
    // Network failure / timeout / unparseable URL: treat as dead, no status to fall back on.
    return { ok: false, status: null, error: err.message };
  }
}

async function verifyLinks(events, { concurrency = 8 } = {}) {
  const results = new Array(events.length);
  let cursor = 0;

  async function worker() {
    while (cursor < events.length) {
      const idx = cursor++;
      results[idx] = await verifyLink(events[idx].url);
      process.stdout.write(`\r  Verified ${idx + 1}/${events.length} links`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, events.length) }, worker));
  console.log();

  const alive = [];
  const dead = [];
  events.forEach((e, i) => {
    if (results[i].ok) alive.push(e);
    else dead.push({ id: e.id, title: e.title, url: e.url, status: results[i].status, error: results[i].error });
  });
  if (dead.length) {
    console.log(`  Dead links:`);
    for (const d of dead) console.log(`    [${d.status ?? "ERR"}] ${d.title} -> ${d.url} ${d.error ? `(${d.error})` : ""}`);
  }
  return { alive, deadCount: dead.length };
}

// ---------------------------------------------------------------------------
// Phase 3: Self-hosted images via Vercel Blob
// ---------------------------------------------------------------------------

async function downloadImageBuffer(url) {
  const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  if (buf.length < 1000) throw new Error(`Source image too small (${buf.length}B)`);
  return buf;
}

async function hostEventImage(event) {
  if (!event.sourceImageUrl) return null; // no source image; EventImageWithFallback covers this
  const sourceBuf = await downloadImageBuffer(event.sourceImageUrl);
  const webpBuf = await sharp(sourceBuf).webp({ quality: 85 }).toBuffer();
  if (webpBuf.length < 1000) throw new Error(`Converted WebP too small (${webpBuf.length}B)`);
  const blob = await put(`events/${event.id}.webp`, webpBuf, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
    allowOverwrite: true,
    // BLOB_STORE_ID in env pushes the SDK toward Vercel-runtime OIDC auth, which
    // has no token outside an actual Vercel deployment; force the plain
    // read/write token instead for local script runs.
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
}

async function runImageHostingPhase(cp, { concurrency = 5, limit = null } = {}) {
  console.log("\n--- Phase 3: Self-hosted images via Vercel Blob ---");
  const ids = Object.keys(cp.events);
  const needsImage = ids.filter((id) => {
    const e = cp.events[id];
    return e.sourceImageUrl && e.hostedImageUrl !== e.sourceImageUrl && !e.hostedImageUrl;
  });
  const toProcess = limit ? needsImage.slice(0, limit) : needsImage;
  console.log(`  ${ids.length} events total, ${needsImage.length} need hosting${limit ? ` (capped to ${toProcess.length} this run)` : ""}.`);

  let done = 0;
  let failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < toProcess.length) {
      const id = toProcess[cursor++];
      const event = cp.events[id];
      try {
        const url = await hostEventImage(event);
        event.hostedImageUrl = url; // null if event had no sourceImageUrl to begin with
        event.hostedImageSourceUrl = event.sourceImageUrl;
        done++;
      } catch (err) {
        console.warn(`\n  Image failed for "${event.title}" (${id}): ${err.message}`);
        event.hostedImageUrl = null;
        event.hostedImageError = err.message;
        failed++;
      }
      process.stdout.write(`\r  Hosted ${done + failed}/${toProcess.length} (${failed} failed)`);
      if ((done + failed) % 25 === 0) saveCheckpoint(cp);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, toProcess.length || 1) }, worker));
  console.log();
  saveCheckpoint(cp);
  console.log(`  Images hosted: ${done}, failed (fallback will render): ${failed}.`);
}

// ---------------------------------------------------------------------------
// Phase 4a: Descriptions (Claude)
// ---------------------------------------------------------------------------

function eventsNeedingRefresh(cp) {
  return Object.values(cp.events).filter((e) => e.contentHash !== contentHash(e));
}

export async function runDescriptionPhase(cp, client) {
  console.log("\n--- Phase 4a: Descriptions (Claude Sonnet 4.5) ---");
  const allNeeded = eventsNeedingRefresh(cp).filter((e) => !e.description);
  const needed = DESC_LIMIT ? allNeeded.slice(0, DESC_LIMIT) : allNeeded;
  console.log(`  ${allNeeded.length} events need a description${DESC_LIMIT ? ` (capped to ${needed.length} this run)` : ""}.`);
  const BATCH = 5;

  for (let i = 0; i < needed.length; i += BATCH) {
    const batch = needed.slice(i, i + BATCH);
    const end = Math.min(i + BATCH, needed.length);
    process.stdout.write(`  [${i + 1}-${end}/${needed.length}] generating... `);

    const response = await withRetry(() => client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: `You write event listings for Kairos, a cultural event discovery app for London. These are REAL events. You are given ONLY: title, venue, area, category, vibe tags, price tier, and sometimes a source note. That is the complete set of facts you have. You have no other knowledge about this specific event, no matter how famous the artist or venue is.

Hard rule: do not mention any specific song, album, setlist, era, past tour, guest, collaborator, or catalogue detail unless it is written in the source note given to you. If you were about to write something like "expect classics from X and Y" or "his 2019 tour" or name a specific track, stop, that is invented, delete it. This applies even to artists you recognize. A description with fewer specifics is correct. A description with an invented specific is a failure regardless of how plausible it sounds.

What you may describe: the venue and area, the category and vibe tags, the price tier, and the source note if given, described in an editorial, sensory, restrained voice. Reference: Resident Advisor listings, Boiler Room copy, The Quietus. Like a knowledgeable friend, not marketing copy. No em dashes. No emoji. No exclamation points. Never: amazing, incredible, unforgettable.

The "ai_explanation_template" field is user-facing copy explaining to a visitor why this event suits their taste. It is never a description of your own writing process or compliance with these rules.`,
      messages: [
        {
          role: "user",
          content: `Return a JSON array of exactly ${batch.length} objects. Each object has:
- "description": 2-3 sentences in brand voice, grounded only in the facts given
- "ai_explanation_template": 1-2 sentences of user-facing copy in Kairos AI voice, explaining to a visitor why this event suits their taste. Start with a specific sensory or contextual observation, not "This event". Never describe your own writing choices.

Events:
${batch
  .map(
    (e, j) =>
      `${j + 1}. "${e.title}" | ${e.venue}, ${e.venueArea} | category: ${e.category} | vibes: ${(e.vibeDescriptors ?? []).join(", ")} | price: ${e.priceTier}${e.sourceDescription ? ` | source note: ${e.sourceDescription.slice(0, 300)}` : ""}`
  )
  .join("\n")}

Return only the raw JSON array. No markdown fences, no extra text.`,
        },
      ],
    }));

    const raw = response.content[0].text
      .trim()
      .replace(/^```json?\n?/, "")
      .replace(/\n?```$/, "");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error(`\n  JSON parse error for batch ${i}-${end}. Skipping batch, will retry next run.`);
      continue;
    }
    if (!Array.isArray(parsed) || parsed.length !== batch.length) {
      console.error(`\n  Unexpected array length for batch ${i}-${end}: got ${parsed?.length}, expected ${batch.length}. Skipping.`);
      continue;
    }

    batch.forEach((e, j) => {
      e.description = stripEmDashes(parsed[j]?.description ?? "");
      e.ai_explanation_template = stripEmDashes(parsed[j]?.ai_explanation_template ?? "");
    });
    saveCheckpoint(cp);
    console.log("ok");
  }
  console.log("  Descriptions complete.");
}

// ---------------------------------------------------------------------------
// Phase 4b: Embeddings (OpenAI)
// ---------------------------------------------------------------------------

export async function runEmbeddingPhase(cp, client) {
  console.log("\n--- Phase 4b: Embeddings (text-embedding-3-large) ---");
  // Only events that already have a real description: embedding text includes
  // e.description, and contentHash gets marked "current" once embedded, so an
  // event embedded before its description exists would never get one (the
  // description-phase gate checks contentHash too).
  const needed = eventsNeedingRefresh(cp).filter((e) => e.description);
  const stillWaitingOnDescription = eventsNeedingRefresh(cp).filter((e) => !e.description).length;
  console.log(`  ${needed.length} events need embedding${stillWaitingOnDescription ? ` (${stillWaitingOnDescription} still waiting on a description)` : ""}.`);
  let count = 0;

  for (const e of needed) {
    const input = `${e.title}. ${e.category} event at ${e.venue} in ${e.venueArea}, London. ${e.description ?? ""} Vibes: ${(e.vibeDescriptors ?? []).join(", ")}.`;
    try {
      const res = await withRetry(() => client.embeddings.create({ model: "text-embedding-3-large", input }));
      e.embedding = res.data[0].embedding;
      e.contentHash = contentHash(e); // mark this event's content as up to date
      count++;
      if (count % 25 === 0 || count === needed.length) {
        saveCheckpoint(cp);
        console.log(`  ${count}/${needed.length} embedded`);
      }
    } catch (err) {
      console.error(`\n  Embedding error for "${e.title}": ${err.message}. Will retry next run.`);
    }
  }
  saveCheckpoint(cp);
  console.log("  Embeddings complete.");
}

// ---------------------------------------------------------------------------
// Phase 4c: Pinecone snapshot + delta upsert
// ---------------------------------------------------------------------------

async function snapshotPinecone(index, label) {
  const ARCHIVE_DIR = path.join(ROOT, "data", "_archive");
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  console.log(`  Snapshotting existing Pinecone index before ${label}...`);

  const stats = await index.describeIndexStats();
  const count = stats.totalRecordCount ?? 0;
  console.log(`  Existing vectors: ${count}`);
  if (count === 0) return { ids: [], snapPath: null };

  const allIds = [];
  let paginationToken;
  do {
    const result = await index.listPaginated(paginationToken ? { paginationToken } : {});
    allIds.push(...(result.vectors ?? []).map((v) => v.id));
    paginationToken = result.pagination?.next;
  } while (paginationToken);

  const records = [];
  const BATCH = 200;
  for (let i = 0; i < allIds.length; i += BATCH) {
    const batch = allIds.slice(i, i + BATCH);
    const res = await index.fetch({ ids: batch });
    for (const [id, v] of Object.entries(res.records ?? {})) records.push({ id, metadata: v.metadata ?? {} });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapPath = path.join(ARCHIVE_DIR, `real-events-pinecone-snapshot-${timestamp}.json`);
  fs.writeFileSync(snapPath, JSON.stringify({ vectorCount: records.length, snapshotAt: new Date().toISOString(), records }, null, 2));
  console.log(`  Snapshot saved: ${snapPath} (${records.length} records)`);
  return { ids: allIds, snapPath };
}

function buildMetadata(e) {
  return {
    name: e.title,
    venue_name: e.venue,
    venue_area: e.venueArea,
    category: e.category,
    start_date: e.startDate,
    price_display: priceTierToDisplay(e.priceTier),
    price_tier: e.priceTier,
    image_url: e.hostedImageUrl ?? "",
    url: e.url ?? "",
    vibe_tags: e.vibeDescriptors ?? [],
    is_fabricated: false,
    event_dna: JSON.stringify({
      source: e.source,
      genre: e.category,
      ai_explanation: e.ai_explanation_template ?? "",
      discovery_score: e.source === "recurring_anchor" ? 7 : 6,
    }),
  };
}

export async function runPineconeUpsertPhase(cp, pinecone) {
  console.log("\n--- Phase 4c: Pinecone upsert ---");
  const index = pinecone.Index(process.env.PINECONE_INDEX);

  const { ids: existingIds } = await snapshotPinecone(index, "real-events upsert");

  const currentEvents = Object.values(cp.events).filter((e) => Array.isArray(e.embedding) && e.embedding.length);
  const currentIds = new Set(currentEvents.map((e) => e.id));

  const toDelete = existingIds.filter((id) => !currentIds.has(id));
  if (toDelete.length) {
    console.log(`  Deleting ${toDelete.length} stale/superseded vectors (old fabricated events and events no longer in this run's curated set)...`);
    const DEL_BATCH = 500;
    for (let i = 0; i < toDelete.length; i += DEL_BATCH) {
      await index.deleteMany({ ids: toDelete.slice(i, i + DEL_BATCH) });
    }
  } else {
    console.log("  Nothing to delete.");
  }

  console.log(`  Upserting ${currentEvents.length} vectors...`);
  const BATCH = 100;
  for (let i = 0; i < currentEvents.length; i += BATCH) {
    const batch = currentEvents.slice(i, i + BATCH);
    const vectors = batch.map((e) => ({ id: e.id, values: e.embedding, metadata: buildMetadata(e) }));
    await index.upsert({ records: vectors });
    console.log(`  Upserted ${Math.min(i + BATCH, currentEvents.length)}/${currentEvents.length}`);
  }

  const finalStats = await index.describeIndexStats();
  console.log(`  Final vector count: ${finalStats.totalRecordCount}`);
}

// ---------------------------------------------------------------------------
// Phase 4d: Write data/events.json
// ---------------------------------------------------------------------------

export function writeEventsJson(cp) {
  console.log("\n--- Phase 4d: Writing data/events.json ---");
  const ARCHIVE_DIR = path.join(ROOT, "data", "_archive");
  if (fs.existsSync(EVENTS_JSON_PATH)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    fs.copyFileSync(EVENTS_JSON_PATH, path.join(ARCHIVE_DIR, `events-${ts}.json`));
    console.log("  Archived previous events.json");
  }

  const events = Object.values(cp.events).map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    venue: e.venue,
    venueArea: e.venueArea,
    description: e.description ?? "",
    vibeDescriptors: e.vibeDescriptors ?? [],
    priceTier: e.priceTier,
    startDate: e.startDate,
    image: e.hostedImageUrl ?? "",
    url: e.url,
    ai_explanation_template: e.ai_explanation_template ?? "",
    isFabricated: false,
    source: e.source,
  }));

  fs.writeFileSync(EVENTS_JSON_PATH, JSON.stringify(events, null, 2));
  console.log(`  Wrote ${events.length} events to data/events.json`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const tmKey = process.env.TICKETMASTER_API_KEY;
  const skiddleKey = process.env.SKIDDLE_API_KEY;

  if (!tmKey && !skiddleKey) {
    console.error("Both TICKETMASTER_API_KEY and SKIDDLE_API_KEY are missing. At least one is required.");
    console.error("Run with: node --env-file=.env.local scripts/build-real-events.mjs");
    process.exit(1);
  }
  if (!tmKey) console.log("TICKETMASTER_API_KEY not set, proceeding with Skiddle + anchors only.");
  if (!skiddleKey) console.log("SKIDDLE_API_KEY not set, proceeding with Ticketmaster + anchors only.");

  const cp = loadCheckpoint();
  const maxPages = SAMPLE_SIZE ? 1 : 10;

  console.log(`\n--- Phase 2a: Fetch ${SAMPLE_SIZE ? `(sample mode, ${SAMPLE_SIZE} events)` : ""} ---`);
  const rawTm = tmKey ? await fetchTicketmasterEvents(tmKey, { maxPages }) : [];
  const rawSkiddle = skiddleKey ? await fetchSkiddleEvents(skiddleKey, { maxPages }) : [];
  const anchorEvents = loadAnchorEvents();
  console.log(`  Ticketmaster: ${rawTm.length} | Skiddle: ${rawSkiddle.length} | Anchors: ${anchorEvents.length}`);

  console.log("\n--- Phase 2b: Normalize ---");
  const normalized = [
    ...rawTm.map(normalizeTicketmasterEvent),
    ...rawSkiddle.map(normalizeSkiddleEvent),
    ...anchorEvents,
  ];
  console.log(`  Normalized ${normalized.length} events total.`);

  console.log("\n--- Phase 2c: Dedup ---");
  const { kept, dropped: dedupDropped } = dedupEvents(normalized);
  console.log(`  Kept ${kept.length}, dropped ${dedupDropped} duplicates.`);

  console.log("\n--- Phase 2c2: Collapse recurring production runs ---");
  const { kept: collapsedKept, collapsed } = collapseRecurringRuns(kept);
  console.log(`  Kept ${collapsedKept.length}, collapsed ${collapsed} repeat performances down to their nearest date.`);

  console.log("\n--- Phase 2d: Curate ---");
  const targetMax = SAMPLE_SIZE ?? TARGET_MAX;
  const { curated, dropped: curateDropped } = curateEvents(collapsedKept, targetMax);
  console.log(`  Curated to ${curated.length} events.`);
  console.log(`  Dropped: ${curateDropped.missingFields} missing critical fields, ${curateDropped.categoryOverflow} category overflow.`);

  const catCounts = {};
  for (const e of curated) catCounts[e.category] = (catCounts[e.category] ?? 0) + 1;
  console.log(`  Category breakdown: ${JSON.stringify(catCounts)}`);

  console.log("\n--- Phase 2e: Verify ticket links ---");
  const { alive, deadCount } = await verifyLinks(curated);
  console.log(`  ${alive.length} live links, ${deadCount} dead links dropped.`);

  // Replace with this run's alive set (drops stale/expired events rather than
  // accumulating forever), but carry forward an already-hosted Blob image URL
  // for events that persist run-over-run with an unchanged source image, so
  // re-running doesn't force re-hosting all 400 images every time.
  const previousEvents = cp.events ?? {};
  const newEvents = {};
  for (const e of alive) {
    const prev = previousEvents[e.id];
    if (prev?.hostedImageUrl && prev.hostedImageSourceUrl === e.sourceImageUrl) {
      e.hostedImageUrl = prev.hostedImageUrl;
      e.hostedImageSourceUrl = prev.hostedImageSourceUrl;
    }
    // Carry forward description/embedding too when nothing meaningful changed,
    // otherwise every run regenerates all 400 descriptions and embeddings from
    // scratch, defeating the whole point of a resumable, twice-weekly pipeline.
    if (prev?.contentHash && prev.contentHash === contentHash(e)) {
      e.description = prev.description;
      e.ai_explanation_template = prev.ai_explanation_template;
      e.embedding = prev.embedding;
      e.contentHash = prev.contentHash;
    }
    newEvents[e.id] = e;
  }
  cp.events = newEvents;
  cp.runs = cp.runs ?? [];
  cp.runs.push({
    at: new Date().toISOString(),
    mode: SAMPLE_SIZE ? `sample-${SAMPLE_SIZE}` : "full",
    fetched: { ticketmaster: rawTm.length, skiddle: rawSkiddle.length, anchors: anchorEvents.length },
    afterDedup: kept.length,
    afterCurate: curated.length,
    finalAliveCount: alive.length,
    deadLinksDropped: deadCount,
  });
  saveCheckpoint(cp);

  console.log(`\n--- Sample output (first ${Math.min(5, alive.length)}) ---`);
  for (const e of alive.slice(0, 5)) {
    console.log(JSON.stringify(e, null, 2));
  }

  console.log(`\n${alive.length} events written to checkpoint: ${CHECKPOINT_PATH}`);

  if (SKIP_IMAGES) {
    console.log("Skipping Phase 3 (--skip-images).");
  } else if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("BLOB_READ_WRITE_TOKEN not set, skipping Phase 3 (image hosting).");
  } else {
    await runImageHostingPhase(cp, { limit: IMAGES_LIMIT });
  }

  const missingDescEmbed = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"].filter((k) => !process.env[k]);
  if (missingDescEmbed.length) {
    console.log(`\nSkipping Phase 4 (descriptions/embeddings): missing env vars ${missingDescEmbed.join(", ")}.`);
    return;
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  await runDescriptionPhase(cp, anthropic);
  await runEmbeddingPhase(cp, openai);

  if (SKIP_PINECONE) {
    console.log("\nSkipping Pinecone upsert (--skip-pinecone). Writing events.json from generated descriptions.");
    writeEventsJson(cp);
    return;
  }

  const missingPinecone = ["PINECONE_API_KEY", "PINECONE_INDEX"].filter((k) => !process.env[k]);
  if (missingPinecone.length) {
    console.log(`\nSkipping Pinecone upsert: missing env vars ${missingPinecone.join(", ")}. Writing events.json anyway.`);
    writeEventsJson(cp);
    return;
  }

  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  await runPineconeUpsertPhase(cp, pinecone);
  writeEventsJson(cp);

  console.log("\nAll done.");
}

// Only auto-run when executed directly (`node build-real-events.mjs`), not when
// its phase functions are imported by another script (e.g. finish-real-events.mjs).
if (path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error("Fatal:", err.message ?? err);
    process.exitCode = 1;
  });
}

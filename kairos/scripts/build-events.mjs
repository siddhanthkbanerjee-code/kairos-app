// scripts/build-events.mjs
// Run:    node --env-file=.env.local scripts/build-events.mjs
// Resume: same command. Reads checkpoint and skips completed work.
// Halfway pause: exits after image 150. Re-run to continue from 151.

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SEEDS_PATH = path.join(ROOT, "data", "event-seeds.json");
const CHECKPOINT_PATH = path.join(ROOT, "data", "events-checkpoint.json");
const EVENTS_PATH = path.join(ROOT, "data", "events.json");
const IMAGES_DIR = path.join(ROOT, "public", "events");
const ARCHIVE_DIR = path.join(ROOT, "data", "_archive");

const DALLE_STYLE =
  "Dark moody atmosphere, editorial nightclub poster aesthetic, deep navy and purple colour palette, absolutely no text or lettering anywhere in image, cinematic lighting, film grain texture, 35mm film photography feel, no identifiable human faces, intimate venue scale, low key";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function validateEnv() {
  const required = [
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "PINECONE_API_KEY",
    "PINECONE_INDEX",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("Missing env vars:", missing.join(", "));
    console.error(
      "Run with: node --env-file=.env.local scripts/build-events.mjs"
    );
    process.exit(1);
  }
}

function loadCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
}

function priceTierToDisplay(tier) {
  return (
    { free: "Free", low: "£5-15", mid: "£15-35", premium: "£35+" }[tier] ??
    "Price TBA"
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destPath);
    proto
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            try {
              const stat = fs.statSync(destPath);
              if (stat.size < 1000) {
                reject(
                  new Error(
                    `Image too small (${stat.size} bytes): ${destPath}`
                  )
                );
              } else {
                resolve();
              }
            } catch (e) {
              reject(e);
            }
          });
        });
      })
      .on("error", (err) => {
        file.close();
        try { fs.unlinkSync(destPath); } catch {}
        reject(err);
      });
  });
}

function isContentPolicyError(err) {
  const msg = (err?.message ?? "").toLowerCase();
  return (
    err?.status === 400 &&
    (msg.includes("safety") || msg.includes("content_policy") || msg.includes("rejected"))
  );
}

// ---------------------------------------------------------------------------
// Phase 1: Descriptions (Claude)
// ---------------------------------------------------------------------------

async function runDescriptionPhase(seeds, cp, client) {
  console.log("\n--- Phase 1: Descriptions (Claude Sonnet 4.5) ---");
  const BATCH = 5;
  const completedTitles = seeds
    .filter((e) => cp[e.id]?.description)
    .map((e) => e.title);
  let generated = completedTitles.length;

  for (let i = 0; i < seeds.length; i += BATCH) {
    const batch = seeds.slice(i, i + BATCH);
    const needed = batch.filter((e) => !cp[e.id]?.description);

    if (!needed.length) {
      const end = Math.min(i + BATCH, seeds.length);
      console.log(`  [${i + 1}-${end}] skip (done)`);
      continue;
    }

    const end = Math.min(i + BATCH, seeds.length);
    process.stdout.write(`  [${i + 1}-${end}] generating... `);

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: `You write event listings for Kairos, an AI-powered cultural event discovery app for London. Voice: editorial, specific, sensory, restrained. Reference: Resident Advisor listings, Boiler Room copy, The Quietus. Like a knowledgeable friend, not marketing copy. Use specific sensory details about the room, sound, crowd, light. Never: amazing, incredible, unforgettable. No em dashes. No emoji. No exclamation points.`,
      messages: [
        {
          role: "user",
          content: `Return a JSON array of exactly ${needed.length} objects. Each object has:
- "description": 2-3 sentences in brand voice
- "ai_explanation_template": 1-2 sentences, Kairos AI voice, explaining to a user why this matches their taste. Start with a specific sensory or contextual observation, not "This event".

Events:
${needed
  .map(
    (e, j) =>
      `${j + 1}. "${e.title}" | ${e.venue}, ${e.venueArea} | category: ${e.category} | vibes: ${e.vibeDescriptors.join(", ")} | price: ${e.priceTier} | fabricated: ${e.isFabricated}`
  )
  .join("\n")}

Anti-duplication context (already written): ${completedTitles.slice(-15).join(", ") || "none yet"}

Return only the raw JSON array. No markdown fences, no extra text.`,
        },
      ],
    });

    const raw = response.content[0].text
      .trim()
      .replace(/^```json?\n?/, "")
      .replace(/\n?```$/, "");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("\nJSON parse error. Raw:\n", raw.slice(0, 400));
      process.exit(1);
    }

    if (!Array.isArray(parsed) || parsed.length !== needed.length) {
      console.error(
        `\nUnexpected array length: got ${parsed?.length}, expected ${needed.length}`
      );
      process.exit(1);
    }

    needed.forEach((e, j) => {
      cp[e.id] = cp[e.id] ?? {};
      cp[e.id].description = parsed[j]?.description ?? "";
      cp[e.id].ai_explanation_template =
        parsed[j]?.ai_explanation_template ?? "";
      completedTitles.push(e.title);
      generated++;
    });

    saveCheckpoint(cp);
    console.log(`ok (${generated}/${seeds.length})`);
  }

  console.log(`Descriptions complete. ${generated} total.`);
}

// ---------------------------------------------------------------------------
// Phase 2: Images (DALL-E 3)
// ---------------------------------------------------------------------------

async function generateImageWithFallback(client, event, prompt, fallbackPrompt) {
  async function attempt(p) {
    const res = await client.images.generate({
      model: "gpt-image-1",
      prompt: p,
      n: 1,
      size: "1536x1024",
      quality: "medium",
    });
    const b64 = res.data[0].b64_json;
    if (!b64) throw new Error("No image data in response");
    return b64;
  }

  try {
    const b64 = await attempt(prompt);
    return { b64, usedFallback: false, skipped: false };
  } catch (err) {
    if (isContentPolicyError(err)) {
      console.warn(`\n  Content policy on main prompt. Trying fallback...`);
      try {
        const b64 = await attempt(fallbackPrompt);
        return { b64, usedFallback: true, skipped: false };
      } catch (err2) {
        if (isContentPolicyError(err2)) {
          console.warn(`  Fallback also rejected. Skipping image for "${event.title}".`);
          return { b64: null, usedFallback: true, skipped: true };
        }
        throw err2;
      }
    }
    throw err;
  }
}

async function runImagePhase(seeds, cp, client) {
  console.log(
    "\n--- Phase 2: Images (gpt-image-1 medium 1536x1024, ~$0.063 each) ---"
  );

  const skipped = [];
  let count = seeds.filter((e) => cp[e.id]?.imagePath || cp[e.id]?.imageSkipped).length;
  let spend = seeds.filter((e) => cp[e.id]?.imagePath).length * 0.063;

  for (let i = 0; i < seeds.length; i++) {
    const e = seeds[i];

    if (cp[e.id]?.imagePath || cp[e.id]?.imageSkipped) continue;

    const mainPrompt = `${e.title}. ${e.category} event in ${e.venueArea}, London. Atmosphere: ${e.vibeDescriptors.join(", ")}. ${DALLE_STYLE}.`;
    const fallbackPrompt = `${e.category} event at night in London. Dark moody venue, deep navy and purple colour palette, cinematic lighting, film grain, no text, no identifiable faces, intimate scale.`;

    process.stdout.write(`  [${i + 1}/300] "${e.title}"... `);

    try {
      const result = await generateImageWithFallback(client, e, mainPrompt, fallbackPrompt);

      if (result.skipped) {
        cp[e.id] = cp[e.id] ?? {};
        cp[e.id].imageSkipped = true;
        cp[e.id].imagePath = null;
        skipped.push(e.id);
        count++;
        saveCheckpoint(cp);
        console.log(`SKIPPED (policy rejection)`);
      } else {
        const dest = path.join(IMAGES_DIR, `${e.id}.png`);
        const buf = Buffer.from(result.b64, "base64");
        fs.writeFileSync(dest, buf);
        const stat = fs.statSync(dest);
        if (stat.size < 1000) {
          throw new Error(`Image too small (${stat.size} bytes): ${dest}`);
        }

        cp[e.id] = cp[e.id] ?? {};
        cp[e.id].imagePath = `/events/${e.id}.png`;
        cp[e.id].imageSkipped = false;
        if (result.usedFallback) cp[e.id].imageFallback = true;
        count++;
        spend += 0.063;
        saveCheckpoint(cp);

        const flag = result.usedFallback ? " (fallback prompt)" : "";
        console.log(`ok ($${spend.toFixed(2)} total)${flag}`);
      }

      // Pause at 150 images for sanity check
      const generated = seeds.filter((e) => cp[e.id]?.imagePath).length;
      if (generated === 150) {
        console.log(`\n${"=".repeat(60)}`);
        console.log(`HALFWAY PAUSE: 150 / 300 images generated`);
        console.log(`${"=".repeat(60)}`);
        console.log(`DALL-E spend so far:  $${spend.toFixed(2)}`);
        console.log(`Policy rejections:    ${skipped.length}`);
        if (skipped.length) console.log(`  Skipped IDs: ${skipped.join(", ")}`);
        console.log(`\nSample images (open locally to review):`);
        const sampleSeeds = seeds.filter((s) => cp[s.id]?.imagePath);
        const indices = [0, 30, 60, 90, 120, 149];
        for (const idx of indices) {
          const s = sampleSeeds[idx];
          if (s) {
            console.log(
              `  [${idx + 1}] ${s.title} (${s.category}, ${s.venueArea})`
            );
            console.log(
              `       ${path.join(ROOT, "public", cp[s.id].imagePath)}`
            );
          }
        }
        console.log(`\nTo continue: re-run the script.`);
        console.log(
          `To abort: stop here. Pinecone has NOT been touched yet.`
        );
        console.log(`${"=".repeat(60)}\n`);
        return "HALFWAY_PAUSE";
      }

      // DALL-E rate limit: 5 hd images/min. 13s gap is safe.
      if (i < seeds.length - 1) {
        await sleep(13000);
      }
    } catch (err) {
      console.error(`\nImage error for "${e.title}": ${err.message}`);
      console.error("Re-run to resume.");
      throw err;
    }
  }

  const totalGenerated = seeds.filter((e) => cp[e.id]?.imagePath).length;
  console.log(`Images complete. ${totalGenerated} generated, ${skipped.length} skipped.`);
  console.log(`Total image spend (est.): $${spend.toFixed(3)}`);
  if (skipped.length) console.log(`Policy rejections: ${skipped.join(", ")}`);
}

// ---------------------------------------------------------------------------
// Phase 3: Embeddings (OpenAI)
// ---------------------------------------------------------------------------

async function runEmbeddingPhase(seeds, cp, client) {
  console.log("\n--- Phase 3: Embeddings (text-embedding-3-large) ---");
  let count = seeds.filter((e) => cp[e.id]?.embeddingDone).length;

  for (let i = 0; i < seeds.length; i++) {
    const e = seeds[i];
    if (cp[e.id]?.embeddingDone) continue;

    const data = cp[e.id] ?? {};
    const input = `${e.title}. ${e.category} event at ${e.venue} in ${e.venueArea}, London. ${data.description ?? ""} Vibes: ${e.vibeDescriptors.join(", ")}.`;

    try {
      const res = await client.embeddings.create({
        model: "text-embedding-3-large",
        input,
      });
      cp[e.id].embedding = res.data[0].embedding;
      cp[e.id].embeddingDone = true;
      count++;
      saveCheckpoint(cp);

      if (count % 25 === 0 || count === seeds.length) {
        console.log(`  ${count}/${seeds.length} embedded`);
      }
    } catch (err) {
      console.error(`\nEmbedding error for "${e.title}": ${err.message}`);
      process.exit(1);
    }
  }

  console.log("Embeddings complete.");
}

// ---------------------------------------------------------------------------
// Phase 4a: Pinecone snapshot
// ---------------------------------------------------------------------------

async function snapshotPinecone(index) {
  console.log("\n--- Phase 4a: Pinecone snapshot (before deletion) ---");
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  const stats = await index.describeIndexStats();
  const count = stats.totalRecordCount ?? 0;
  console.log(`  Existing vectors: ${count}`);

  if (count === 0) {
    console.log("  Index empty, skipping snapshot.");
    return null;
  }

  // List all IDs using pagination
  const allIds = [];
  let paginationToken = undefined;
  let page = 0;

  try {
    do {
      const result = await index.listPaginated(
        paginationToken ? { paginationToken } : {}
      );
      const ids = (result.vectors ?? []).map((v) => v.id);
      allIds.push(...ids);
      paginationToken = result.pagination?.next;
      page++;
      process.stdout.write(`\r  Listed ${allIds.length} IDs...`);
    } while (paginationToken);
    console.log(`\n  Total IDs listed: ${allIds.length}`);
  } catch (err) {
    console.warn(`  listPaginated failed (${err.message}). Saving stats only.`);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const snapPath = path.join(
      ARCHIVE_DIR,
      `pinecone-snapshot-${timestamp}.json`
    );
    fs.writeFileSync(
      snapPath,
      JSON.stringify(
        {
          note: "listPaginated unavailable. Stats only.",
          snapshotAt: new Date().toISOString(),
          stats,
        },
        null,
        2
      )
    );
    console.log(`  Stats snapshot: ${snapPath}`);
    return snapPath;
  }

  // Fetch metadata in batches (omit embeddings to keep file small)
  const records = [];
  const BATCH = 200;
  for (let i = 0; i < allIds.length; i += BATCH) {
    const batch = allIds.slice(i, i + BATCH);
    try {
      const res = await index.fetch(batch);
      for (const [id, v] of Object.entries(res.records ?? {})) {
        records.push({ id, metadata: v.metadata ?? {} });
      }
    } catch (err) {
      console.warn(`  Fetch failed for batch ${i}: ${err.message}. Skipping batch.`);
    }
    process.stdout.write(`\r  Fetched metadata: ${records.length}/${allIds.length}`);
  }
  console.log();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapPath = path.join(
    ARCHIVE_DIR,
    `pinecone-snapshot-${timestamp}.json`
  );
  fs.writeFileSync(
    snapPath,
    JSON.stringify(
      {
        vectorCount: records.length,
        snapshotAt: new Date().toISOString(),
        records,
      },
      null,
      2
    )
  );
  console.log(`  Snapshot saved: ${snapPath} (${records.length} records, no embeddings)`);
  return snapPath;
}

// ---------------------------------------------------------------------------
// Phase 4b: Pinecone upsert
// ---------------------------------------------------------------------------

async function runPineconePhase(seeds, cp, client) {
  console.log("\n--- Phase 4b: Pinecone upsert ---");
  const index = client.Index(process.env.PINECONE_INDEX);

  // Snapshot first
  await snapshotPinecone(index);

  console.log("Deleting all existing vectors...");
  await index.deleteAll();
  await sleep(5000);
  console.log("Deleted.");

  const BATCH = 100;
  for (let i = 0; i < seeds.length; i += BATCH) {
    const batch = seeds.slice(i, i + BATCH);

    const vectors = batch
      .filter((e) => cp[e.id]?.embedding)
      .map((e) => {
        const data = cp[e.id];
        return {
          id: e.id,
          values: data.embedding,
          metadata: {
            name: e.title,
            venue_name: e.venue,
            venue_area: e.venueArea,
            category: e.category,
            date_offset_days: e.dateOffsetDays,
            date_offset_hours: e.dateOffsetHours,
            duration_hours: e.durationHours,
            price_display: priceTierToDisplay(e.priceTier),
            price_tier: e.priceTier,
            image_url: data.imagePath ?? "",
            vibe_tags: e.vibeDescriptors,
            is_fabricated: e.isFabricated,
            event_dna: JSON.stringify({
              source: e.isFabricated ? "fabricated" : "real",
              genre: e.category,
              ai_explanation: data.ai_explanation_template ?? "",
              discovery_score: e.isFabricated ? 8 : 6,
            }),
          },
        };
      });

    if (vectors.length === 0) {
      console.warn(`  Batch ${i}-${i + BATCH}: no embeddings found, skipping`);
      continue;
    }

    await index.upsert({ records: vectors });
    console.log(`  Upserted ${Math.min(i + BATCH, seeds.length)}/${seeds.length}`);
  }

  await sleep(2000);
  const finalStats = await index.describeIndexStats();
  console.log(`Final vector count: ${finalStats.totalRecordCount}`);
}

// ---------------------------------------------------------------------------
// Phase 5: Write events.json
// ---------------------------------------------------------------------------

function writeEventsJson(seeds, cp) {
  console.log("\n--- Phase 5: Writing data/events.json ---");

  if (fs.existsSync(EVENTS_PATH)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    fs.copyFileSync(EVENTS_PATH, path.join(ARCHIVE_DIR, `events-${ts}.json`));
    console.log("  Archived old events.json");
  }

  const events = seeds.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    venue: e.venue,
    venueArea: e.venueArea,
    description: cp[e.id]?.description ?? "",
    vibeDescriptors: e.vibeDescriptors,
    priceTier: e.priceTier,
    dateOffsetDays: e.dateOffsetDays,
    dateOffsetHours: e.dateOffsetHours,
    durationHours: e.durationHours,
    image: cp[e.id]?.imagePath ?? "",
    ai_explanation_template: cp[e.id]?.ai_explanation_template ?? "",
    isFabricated: e.isFabricated,
  }));

  fs.writeFileSync(EVENTS_PATH, JSON.stringify(events, null, 2));
  console.log(`  Wrote ${events.length} events to data/events.json`);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(seeds, cp) {
  console.log("\n--- Validation ---");
  let ok = true;
  let missing = 0;
  let skippedCount = 0;

  for (const e of seeds) {
    const data = cp[e.id] ?? {};

    if (!data.description) {
      console.error(`  MISSING description: ${e.id}`);
      ok = false;
    }

    if (data.imageSkipped) {
      skippedCount++;
      continue;
    }

    if (!data.imagePath) {
      console.error(`  MISSING image (not skipped): ${e.id}`);
      ok = false;
      missing++;
      continue;
    }

    const absPath = path.join(ROOT, "public", data.imagePath);
    if (!fs.existsSync(absPath)) {
      console.error(`  IMAGE FILE MISSING on disk: ${absPath}`);
      ok = false;
      missing++;
    } else {
      const stat = fs.statSync(absPath);
      if (stat.size < 1000) {
        console.error(`  IMAGE TOO SMALL (${stat.size}B): ${absPath}`);
        ok = false;
      }
    }

    if (!data.embeddingDone) {
      console.error(`  MISSING embedding: ${e.id}`);
      ok = false;
    }
  }

  if (skippedCount) {
    console.log(`  ${skippedCount} events have skipped images (policy rejections).`);
  }

  if (ok) {
    console.log(`  All ${seeds.length} events validated (${skippedCount} policy skips).`);
  } else {
    console.error(`  Validation failed. Missing images: ${missing}. Fix and re-run.`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  validateEnv();
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  if (!fs.existsSync(SEEDS_PATH)) {
    console.error("Missing data/event-seeds.json");
    process.exit(1);
  }

  const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf-8"));
  console.log(`Loaded ${seeds.length} seeds`);

  const cp = loadCheckpoint();
  const descDone = seeds.filter((e) => cp[e.id]?.description).length;
  const imgDone = seeds.filter((e) => cp[e.id]?.imagePath).length;
  const imgSkipped = seeds.filter((e) => cp[e.id]?.imageSkipped).length;
  const embDone = seeds.filter((e) => cp[e.id]?.embeddingDone).length;
  console.log(
    `Checkpoint: ${descDone} descriptions | ${imgDone} images | ${imgSkipped} skipped | ${embDone} embeddings`
  );

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

  await runDescriptionPhase(seeds, cp, anthropic);
  const imageResult = await runImagePhase(seeds, cp, openai);
  if (imageResult === "HALFWAY_PAUSE") {
    console.log("Paused at image 150. Re-run the script to continue.");
    return;
  }

  await runEmbeddingPhase(seeds, cp, openai);
  validate(seeds, cp);
  await runPineconePhase(seeds, cp, pinecone);
  writeEventsJson(seeds, cp);

  const totalImgSpend =
    seeds.filter((e) => cp[e.id]?.imagePath).length * 0.063;
  console.log(`\nAll done.`);
  console.log(`Image spend (est.): $${totalImgSpend.toFixed(3)}`);
  console.log(`Run npm run build to verify.`);
}

main().catch((err) => {
  console.error("Fatal:", err.message ?? err);
  process.exitCode = 1;
});

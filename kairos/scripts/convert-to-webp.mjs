// scripts/convert-to-webp.mjs
// Run: node --env-file=.env.local scripts/convert-to-webp.mjs
// Steps:
//   1. Backup 300 PNGs to kairos-image-backup (outside repo)
//   2. Convert each PNG to WebP quality 85 in public/events/
//   3. Delete PNGs only after all WebPs verified
//   4. Update data/events.json (.png -> .webp)
//   5. Update data/events-checkpoint.json (.png -> .webp)
//   6. Re-upsert all 300 Pinecone vectors with updated image_url metadata
//   7. Report final disk size

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pinecone } from "@pinecone-database/pinecone";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EVENTS_DIR = path.join(ROOT, "public", "events");
const EVENTS_JSON = path.join(ROOT, "data", "events.json");
const CHECKPOINT_PATH = path.join(ROOT, "data", "events-checkpoint.json");
const SEEDS_PATH = path.join(ROOT, "data", "event-seeds.json");
const BACKUP_DIR = "C:\\Users\\rb110\\Documents\\CafeCursor\\kairos-image-backup";

function priceTierToDisplay(tier) {
  return (
    { free: "Free", low: "£5-15", mid: "£15-35", premium: "£35+" }[tier] ??
    "Price TBA"
  );
}

// ---------------------------------------------------------------------------
// Step 1: Backup
// ---------------------------------------------------------------------------
console.log("--- Step 1: Backup PNGs ---");
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const pngs = fs.readdirSync(EVENTS_DIR).filter((f) => f.endsWith(".png"));
console.log(`Found ${pngs.length} PNGs in public/events/`);

if (pngs.length !== 300) {
  console.error(`Expected 300 PNGs, found ${pngs.length}. Aborting.`);
  process.exitCode = 1;
  process.exit();
}

for (const png of pngs) {
  fs.copyFileSync(path.join(EVENTS_DIR, png), path.join(BACKUP_DIR, png));
}

const backupCount = fs
  .readdirSync(BACKUP_DIR)
  .filter((f) => f.endsWith(".png")).length;
console.log(`Backup confirmed: ${backupCount} PNGs at ${BACKUP_DIR}`);

if (backupCount !== 300) {
  console.error(`Backup count mismatch (${backupCount}). Aborting.`);
  process.exitCode = 1;
  process.exit();
}

// ---------------------------------------------------------------------------
// Step 2: Convert PNGs to WebP at quality 85
// ---------------------------------------------------------------------------
console.log("\n--- Step 2: Convert to WebP (quality 85) ---");
let converted = 0;

for (const png of pngs) {
  const pngPath = path.join(EVENTS_DIR, png);
  const webpPath = path.join(EVENTS_DIR, png.replace(".png", ".webp"));

  await sharp(pngPath).webp({ quality: 85 }).toFile(webpPath);

  const stat = fs.statSync(webpPath);
  if (stat.size < 1000) {
    console.error(`WebP too small (${stat.size}B): ${webpPath}. Aborting.`);
    process.exitCode = 1;
    process.exit();
  }

  converted++;
  if (converted % 50 === 0 || converted === 300) {
    console.log(`  ${converted}/300 converted`);
  }
}

const webpCount = fs
  .readdirSync(EVENTS_DIR)
  .filter((f) => f.endsWith(".webp")).length;
if (webpCount !== 300) {
  console.error(`WebP count mismatch: ${webpCount}/300. Aborting.`);
  process.exitCode = 1;
  process.exit();
}
console.log("All 300 WebPs written and verified.");

// ---------------------------------------------------------------------------
// Step 3: Delete PNGs from public/events/
// ---------------------------------------------------------------------------
console.log("\n--- Step 3: Remove source PNGs ---");
for (const png of pngs) {
  fs.unlinkSync(path.join(EVENTS_DIR, png));
}
const remaining = fs
  .readdirSync(EVENTS_DIR)
  .filter((f) => f.endsWith(".png")).length;
if (remaining !== 0) {
  console.error(`${remaining} PNGs still present after delete. Aborting.`);
  process.exitCode = 1;
  process.exit();
}
console.log("300 PNGs removed. public/events/ now contains only WebPs.");

// ---------------------------------------------------------------------------
// Step 4: Update data/events.json
// ---------------------------------------------------------------------------
console.log("\n--- Step 4: Update data/events.json ---");
const events = JSON.parse(fs.readFileSync(EVENTS_JSON, "utf-8"));
let eventsUpdated = 0;
for (const e of events) {
  if (e.image && e.image.endsWith(".png")) {
    e.image = e.image.replace(".png", ".webp");
    eventsUpdated++;
  }
}
fs.writeFileSync(EVENTS_JSON, JSON.stringify(events, null, 2));
console.log(`Updated ${eventsUpdated} image paths in events.json.`);

// ---------------------------------------------------------------------------
// Step 5: Update data/events-checkpoint.json
// ---------------------------------------------------------------------------
console.log("\n--- Step 5: Update events-checkpoint.json ---");
const cp = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, "utf-8"));
let cpUpdated = 0;
for (const id of Object.keys(cp)) {
  if (cp[id].imagePath && cp[id].imagePath.endsWith(".png")) {
    cp[id].imagePath = cp[id].imagePath.replace(".png", ".webp");
    cpUpdated++;
  }
}
fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2));
console.log(`Updated ${cpUpdated} imagePaths in checkpoint.`);

// ---------------------------------------------------------------------------
// Step 6: Update Pinecone metadata (re-upsert with existing embeddings)
// ---------------------------------------------------------------------------
console.log("\n--- Step 6: Update Pinecone image_url metadata ---");
const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf-8"));
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index(process.env.PINECONE_INDEX);

const BATCH = 100;
let pineconeUpdated = 0;

for (let i = 0; i < seeds.length; i += BATCH) {
  const batch = seeds.slice(i, i + BATCH);
  const records = batch
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

  if (records.length === 0) {
    console.warn(`  Batch ${i}: no embeddings found, skipping`);
    continue;
  }

  await index.upsert({ records });
  pineconeUpdated += records.length;
  console.log(`  Upserted ${Math.min(i + BATCH, seeds.length)}/300`);
}

const finalStats = await index.describeIndexStats();
console.log(
  `Pinecone updated. Final vector count: ${finalStats.totalRecordCount}`
);

// ---------------------------------------------------------------------------
// Step 7: Final size report
// ---------------------------------------------------------------------------
console.log("\n--- Final size report ---");
const webps = fs.readdirSync(EVENTS_DIR).filter((f) => f.endsWith(".webp"));
const totalBytes = webps.reduce(
  (sum, f) => sum + fs.statSync(path.join(EVENTS_DIR, f)).size,
  0
);
const totalMB = (totalBytes / 1024 / 1024).toFixed(1);
const avgKB = Math.round(totalBytes / webps.length / 1024);
console.log(`WebP files: ${webps.length}`);
console.log(`Total size: ${totalMB} MB (avg ${avgKB} KB/image)`);
if (parseFloat(totalMB) < 250) {
  console.log(`Within 250MB Vercel limit.`);
} else {
  console.error(`WARNING: ${totalMB} MB exceeds 250MB Vercel limit.`);
}
console.log("\nDone. Run npm run build to verify, then push when ready.");

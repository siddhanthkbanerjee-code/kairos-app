// scripts/finish-real-events.mjs
// Run: node --env-file=.env.local scripts/finish-real-events.mjs
//
// Completes descriptions/embeddings/Pinecone upsert for whatever is already in
// data/real-events-checkpoint.json, WITHOUT re-running Phase 2's live fetch.
// Use this to converge after an interrupted build-real-events.mjs run instead
// of re-fetching (each fetch pulls a slightly different live snapshot from
// Ticketmaster/Skiddle, which otherwise keeps moving the target).

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import {
  loadCheckpoint,
  saveCheckpoint,
  runDescriptionPhase,
  runEmbeddingPhase,
  runPineconeUpsertPhase,
  writeEventsJson,
} from "./build-real-events.mjs";

async function main() {
  const required = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "PINECONE_API_KEY", "PINECONE_INDEX"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  const cp = loadCheckpoint();
  const total = Object.keys(cp.events ?? {}).length;
  if (!total) {
    console.error("No events in checkpoint. Run build-real-events.mjs first.");
    process.exit(1);
  }
  console.log(`Loaded checkpoint: ${total} events.`);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

  await runDescriptionPhase(cp, anthropic);
  await runEmbeddingPhase(cp, openai);
  await runPineconeUpsertPhase(cp, pinecone);
  writeEventsJson(cp);
  saveCheckpoint(cp);

  console.log("\nAll done.");
}

main().catch((err) => {
  console.error("Fatal:", err.message ?? err);
  process.exitCode = 1;
});

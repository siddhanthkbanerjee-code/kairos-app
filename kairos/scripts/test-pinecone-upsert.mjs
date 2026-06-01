import { Pinecone } from "@pinecone-database/pinecone";
import fs from "fs";

const cp = JSON.parse(fs.readFileSync("./data/events-checkpoint.json", "utf-8"));
const id = Object.keys(cp)[0];
const entry = cp[id];

console.log("Testing upsert with id:", id);
console.log("Embedding type:", typeof entry.embedding);
console.log("Embedding is array:", Array.isArray(entry.embedding));
console.log("Embedding length:", entry.embedding?.length);
console.log("First 3 values:", entry.embedding?.slice(0, 3));

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index(process.env.PINECONE_INDEX);

try {
  await index.upsert({
    records: [{
      id,
      values: entry.embedding,
      metadata: { name: "test", test: true },
    }],
  });
  console.log("Upsert SUCCESS");
  await index.deleteOne(id);
  console.log("Cleanup done");
} catch (err) {
  console.error("Upsert FAILED:", err.message);
  console.error("Error name:", err.constructor.name);
  console.error("Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
}

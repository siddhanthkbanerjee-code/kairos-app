// scripts/test-image-api.mjs
// Run: node --env-file=.env.local scripts/test-image-api.mjs
// Purpose: surface the raw OpenAI error for image generation diagnosis

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

console.log("Testing model: gpt-image-1, quality: high, size: 1536x1024\n");

try {
  const res = await client.images.generate({
    model: "gpt-image-1",
    prompt: "Dark moody jazz venue interior, London, deep navy lighting, no text, no faces",
    n: 1,
    size: "1536x1024",
    quality: "high",
  });
  console.log("SUCCESS");
  console.log("data[0] keys:", Object.keys(res.data[0]));
  console.log("b64_json present:", !!res.data[0].b64_json);
  console.log("url present:", !!res.data[0].url);
  console.log("b64_json length:", res.data[0].b64_json?.length ?? "n/a");
} catch (err) {
  console.error("=== FULL ERROR OBJECT ===");
  console.error("err.constructor.name:", err.constructor.name);
  console.error("err.status:", err.status);
  console.error("err.message:", err.message);
  console.error("err.code:", err.code);
  console.error("err.type:", err.type);
  console.error("err.param:", err.param);
  console.error("err.error (raw body):", JSON.stringify(err.error, null, 2));
  console.error("err.headers (selected):", JSON.stringify({
    "x-ratelimit-limit-requests": err.headers?.["x-ratelimit-limit-requests"],
    "x-ratelimit-remaining-requests": err.headers?.["x-ratelimit-remaining-requests"],
    "x-ratelimit-reset-requests": err.headers?.["x-ratelimit-reset-requests"],
    "x-request-id": err.headers?.["x-request-id"],
    "www-authenticate": err.headers?.["www-authenticate"],
  }, null, 2));
}

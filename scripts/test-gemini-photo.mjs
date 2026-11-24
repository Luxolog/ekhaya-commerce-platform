#!/usr/bin/env node
// Local-only Gemini vision test. Does not call Supabase, ReefAPI, or Ekhaya services.
// Usage: node scripts/test-gemini-photo.mjs ./photos/*.jpg
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY. Set it in your local terminal; never commit it or paste it into chat.");
  process.exit(1);
}
const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: node scripts/test-gemini-photo.mjs "photos/*.jpg"');
  process.exit(1);
}

const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const mimeByExt = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".heic": "image/heic", ".heif": "image/heif",
};
const prompt = `You are identifying a physical retail product for a South African marketplace seller.
Inspect the image visually, not just by reading text. Use the product's shape, packaging, visible logo, label and text.
Return valid JSON only with: identified (boolean), brand (string or null), product_name (string or null), model_or_variant (string or null), search_query (string), category (string or null), confidence (number 0 to 1), visual_evidence (array of visible facts), message (string).
Never invent a brand, model, capacity, size or variant. If the product cannot be identified confidently, set identified=false, confidence below 0.5 and search_query="". If brand/model is uncertain, leave it null and use only a reliable generic product description. Keep search_query concise for Takealot, Amazon South Africa and Makro.`;

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const mimeType = mimeByExt[ext];
  if (!mimeType) {
    console.log(JSON.stringify({ file: basename(file), error: "Unsupported image extension" }));
    continue;
  }
  try {
    const bytes = await readFile(file);
    if (!bytes.length || bytes.length > 18 * 1024 * 1024) {
      console.log(JSON.stringify({ file: basename(file), error: "Image must be between 1 byte and 18 MB" }));
      continue;
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { inline_data: { mime_type: mimeType, data: bytes.toString("base64") } },
          { text: prompt },
        ] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 600 },
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      console.log(JSON.stringify({ file: basename(file), http_status: response.status, error: payload?.error?.message ?? "Gemini request failed" }));
      continue;
    }
    const raw = (payload?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    try {
      const result = JSON.parse(raw);
      console.log(JSON.stringify({
        file: basename(file),
        identified: result.identified === true,
        brand: result.brand ?? null,
        product_name: result.product_name ?? null,
        model_or_variant: result.model_or_variant ?? null,
        search_query: result.search_query ?? "",
        confidence: result.confidence ?? 0,
        visual_evidence: result.visual_evidence ?? [],
        message: result.message ?? "",
      }));
    } catch {
      console.log(JSON.stringify({ file: basename(file), error: "Gemini returned invalid JSON", raw: raw.slice(0, 500) }));
    }
  } catch (error) {
    console.log(JSON.stringify({ file: basename(file), error: String(error?.message ?? error) }));
  }
}

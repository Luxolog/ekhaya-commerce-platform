const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i;

function jsonResult(body, status = 200) {
  return { body, status };
}

export async function identifyProductFromImage({ imageDataUrl, env = process.env, fetchImpl = fetch }) {
  if (typeof imageDataUrl !== "string") {
    return jsonResult({ error: "Take or upload a clear product photo first.", code: "IMAGE_REQUIRED" }, 400);
  }

  const match = imageDataUrl.match(IMAGE_DATA_URL);
  if (!match) {
    return jsonResult({ error: "Use a JPEG, PNG or WebP product image.", code: "INVALID_IMAGE" }, 400);
  }

  const estimatedBytes = Math.floor(match[2].length * 3 / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    return jsonResult({ error: "The compressed photo must be 5 MB or smaller.", code: "IMAGE_TOO_LARGE" }, 413);
  }

  if (!env.OPENAI_API_KEY) {
    return jsonResult({
      error: "Photo identification is not configured yet. Please try again later.",
      code: "VISION_NOT_CONFIGURED",
    }, 503);
  }

  try {
    const upstream = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        temperature: 0,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You identify retail products from photos for a South African marketplace price comparison tool. Read visible packaging text and brand/model carefully. If a barcode is visible, transcribe its digits exactly; never guess missing digits. Return JSON only with keys: product_name (string or empty), brand (string or empty), model (string or empty), description (short string or empty), barcode (digits string or empty), barcode_type (EAN-13, UPC-A, EAN-8, UPC-E, or unknown), confidence (number 0 to 1), notes (short string). If the image is not a retail product or the text is unreadable, return empty fields and explain in notes. Do not invent details."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify this product. Read the brand, model and product description, and inspect the packaging for a visible barcode. Be exact; do not infer barcode digits." },
              { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } }
            ]
          }
        ]
      }),
      signal: AbortSignal.timeout(25000),
    });

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = payload?.error?.message || `Vision provider returned HTTP ${upstream.status}.`;
      if (upstream.status === 401 || upstream.status === 403) {
        return jsonResult({ error: "Photo identification credentials are not valid.", code: "VISION_AUTH_FAILED" }, 503);
      }
      throw new Error(detail);
    }

    const raw = payload?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") throw new Error("Vision provider returned no product description.");
    const parsed = JSON.parse(raw);
    const barcode = typeof parsed.barcode === "string" ? parsed.barcode.replace(/\D/g, "").slice(0, 14) : "";
    const product = {
      product_name: typeof parsed.product_name === "string" ? parsed.product_name.slice(0, 160) : "",
      brand: typeof parsed.brand === "string" ? parsed.brand.slice(0, 100) : "",
      model: typeof parsed.model === "string" ? parsed.model.slice(0, 100) : "",
      description: typeof parsed.description === "string" ? parsed.description.slice(0, 300) : "",
      barcode,
      barcode_type: typeof parsed.barcode_type === "string" ? parsed.barcode_type.slice(0, 20) : "unknown",
      confidence: Number.isFinite(Number(parsed.confidence)) ? Math.max(0, Math.min(1, Number(parsed.confidence))) : 0,
      notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 240) : "",
    };
    const searchQuery = barcode || [product.brand, product.product_name, product.model, product.description].filter(Boolean).join(" ").trim();
    if (searchQuery.length < 2) {
      return jsonResult({ error: product.notes || "We could not identify enough information. Try a clearer photo showing the product label.", code: "PRODUCT_NOT_RECOGNISED", product }, 422);
    }
    return jsonResult({ ok: true, product, search_query: searchQuery, matched_by: barcode ? "barcode" : "product_details" });
  } catch (error) {
    return jsonResult({
      error: "We could not analyse that photo. Please try a clearer image.",
      code: "VISION_REQUEST_FAILED",
      detail: env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined,
    }, 502);
  }
}

import test from "node:test";
import assert from "node:assert/strict";
import { identifyProductFromImage } from "./product-identification.js";

const image = "data:image/jpeg;base64,AAAA";

test("rejects missing or unsupported image data", async () => {
  assert.equal((await identifyProductFromImage({ imageDataUrl: "" })).status, 400);
  assert.equal((await identifyProductFromImage({ imageDataUrl: "data:text/plain;base64,AAAA" })).status, 400);
});

test("requires a server-side vision API key", async () => {
  const result = await identifyProductFromImage({ imageDataUrl: image, env: {} });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "VISION_NOT_CONFIGURED");
});

test("identifies product details and uses a decoded barcode as the preferred search query", async () => {
  const fetchImpl = async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.model, "gpt-4o-mini");
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          product_name: "Wireless Mouse",
          brand: "Logitech",
          model: "M171",
          description: "2.4 GHz wireless optical mouse",
          barcode: "6001234567890",
          barcode_type: "EAN-13",
          confidence: 0.94,
          notes: ""
        }) } }]
      })
    };
  };
  const result = await identifyProductFromImage({ imageDataUrl: image, env: { OPENAI_API_KEY: "test-key" }, fetchImpl });
  assert.equal(result.status, 200);
  assert.equal(result.body.search_query, "6001234567890");
  assert.equal(result.body.matched_by, "barcode");
  assert.equal(result.body.product.brand, "Logitech");
});

test("does not invent a barcode when the model returns none", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify({
      product_name: "Dishwashing Liquid", brand: "Example", model: "", description: "1 litre bottle",
      barcode: "", barcode_type: "unknown", confidence: 0.7, notes: ""
    }) } }] })
  });
  const result = await identifyProductFromImage({ imageDataUrl: image, env: { OPENAI_API_KEY: "test-key" }, fetchImpl });
  assert.equal(result.body.matched_by, "product_details");
  assert.equal(result.body.search_query, "Example Dishwashing Liquid 1 litre bottle");
});

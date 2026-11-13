import test from "node:test";
import assert from "node:assert/strict";
import { extractAmazonZarPrice, normalizeAmazonSearchResults } from "../src/marketplace-search.js";

test("extracts an explicit rand buy-box price from an Amazon snippet", () => {
  assert.equal(extractAmazonZarPrice('Price: R 719.96 · FREE delivery'), 719.96);
});

test("extracts a structured priceAmount when Amazon embeds buy-box data", () => {
  assert.equal(extractAmazonZarPrice('{"priceAmount": 799.16, "currencySymbol":"R"}'), 799.16);
});

test("does not invent a price when Amazon hides the price until basket", () => {
  assert.equal(extractAmazonZarPrice("To see our price, add these items to your basket."), null);
});

test("does not mistake a category price band for a product price", () => {
  assert.equal(extractAmazonZarPrice("R 500 to 780 - Lip Balms / Lip Care"), null);
});

test("keeps only Amazon.co.za results and labels indexed prices as not live", () => {
  const products = normalizeAmazonSearchResults({
    data: {
      organic_results: [
        {
          title: "Vaseline Lip Therapy : Amazon.co.za: Beauty",
          url: "https://www.amazon.co.za/Vaseline-Lip-Therapy/dp/B012345678",
          snippet: 'Buy now R 249.00 · In stock',
        },
        {
          title: "Wrong marketplace",
          url: "https://www.amazon.com/dp/B012345678",
          snippet: "R 10.00",
        },
        {
          title: "Amazon category page",
          url: "https://www.amazon.co.za/Lip-Balms-12-Care/s?rh=n%3A123",
          snippet: "R 1 169.87 · FREE delivery",
        },
      ],
    },
  }, "2026-11-13T10:00:00.000Z");

  assert.equal(products.length, 1);
  assert.equal(products[0].id, "B012345678");
  assert.equal(products[0].price, 249);
  assert.equal(products[0].currency, "ZAR");
  assert.equal(products[0].price_is_live, false);
  assert.equal(products[0].price_source, "amazon_search_index");
  assert.equal(products[0].in_stock, true);
});

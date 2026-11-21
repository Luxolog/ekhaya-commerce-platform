# Image-first similar product discovery

## Release intent

When an exact marketplace listing cannot be found, help a seller identify comparable products from a photograph of the item or its retail packaging. The primary workflow is image-first: read the barcode and packaging, extract product attributes, then search marketplaces using those attributes. A generic text-only fallback is secondary.

## Identification pipeline

1. Accept a clear photograph of the product, front/back of packaging, barcode label, or specification label.
2. Attempt barcode decoding locally (EAN/UPC/GTIN). If decoded, call the existing `product-identify` ReefAPI barcode lookup.
3. If no usable barcode is found, call the existing ReefAPI OCR endpoint through `product-identify`.
4. Extract visible facts from OCR text: brand, product type, model/SKU, connector/interface, power/wattage, capacity, dimensions, length, compatibility, quantity/pack size, and other category-specific attributes.
5. Show the extracted facts to the seller for confirmation/correction before marketplace search. Preserve unknown values as unknown; never infer them as facts.
6. Search the exact identifier/model first. If no credible exact listing is returned, run a separate similar-product discovery search using the product category and confirmed attributes.
7. Rank comparable listings by category and feature compatibility. Clearly show matching and differing attributes and the reason for the similarity score.
8. Retrieve dimensions and packed weight from each marketplace/API listing when available, with source and retrieval time. Do not transfer dimensions or weight from a different listing.
9. Keep exact-match, similar-product, accessory, and unrelated classifications distinct.

## Example: USB-C to USB-C superfast charging cable

Extract and compare, where available:
- product type: cable (not a wall charger / power adapter)
- connector at each end: USB-C to USB-C
- supported charging power: e.g. 25W, 45W, 65W, 100W
- cable length
- charging protocol / compatibility claims
- data-transfer support and speed
- pack quantity

Do not treat a 25W cable as equivalent to a 100W cable. Do not compare a cable with a complete wall charger. Unknown wattage or protocol must be displayed as unconfirmed.

## Ranking and safeguards

- Barcode/GTIN or exact manufacturer model match has priority over visual similarity.
- Category mismatch is a hard exclusion (e.g. laptop accessories must not be returned as laptop alternatives).
- Mandatory compatibility attributes must match or be explicitly flagged as different.
- Use a weighted, category-specific feature score only after category validation; show the matched/mismatched features so the score is explainable.
- Similar listings are market benchmarks only. Never calculate the seller's actual product profit using another model's selling price.
- Accessory listings are not comparable resale products unless the seller's submitted product is itself that accessory category.
- Deduplicate listings across queries and marketplaces.
- Preserve marketplace attribution, canonical listing URL, source timestamp, and confidence/provenance for every extracted attribute.

## Dimensions and weight

For each exact or comparable marketplace listing, request product dimensions and weight from the authorised API response where available. Distinguish product dimensions from packed/shipping dimensions. Record units and source. If missing, ask the seller to measure/enter them and label those values as seller supplied. Do not silently reuse default dimensions or weight for fee estimates. Use packed dimensions and packed weight for fulfilment fee estimates when the marketplace fee schedule requires them.

## Provider and capability boundary

The current `product-identify` Edge Function uses ReefAPI barcode lookup and OCR. OCR is not image understanding: it can read visible text but cannot reliably infer unprinted attributes from a photograph. The current repository does not establish a configured visual-language model or image-embedding search provider. Do not claim AI visual feature recognition is active until an approved provider, credentials, data handling, cost limits, and tests are configured. The first deployable stage can use barcode + OCR + seller-confirmed attributes + ReefAPI text search. A later visual-understanding stage can be added behind the same identification contract.

## Acceptance tests before release

- Barcode found: barcode lookup takes precedence and returns source/provenance.
- No barcode: OCR runs and extracted text is editable/confirmable.
- OCR unreadable: user is asked for a clearer image or manual details; no invented specs.
- Similar search only runs when exact search has no credible result.
- USB-C cable examples distinguish connector type, cable vs charger, wattage, and length.
- Laptop examples exclude batteries, keyboards, chargers, screens, hinges, and other accessories.
- Different model/brand listings are labelled similar, never exact.
- Similar listing prices never feed the seller's actual profit calculation.
- Dimensions/weight are listing-specific, unit-aware, source-labelled, and may remain unavailable.
- API/provider failure, timeout, empty OCR, empty barcode lookup, and stale cache are handled without charging for a failed search.
- Image size/type validation, authenticated seller access, rate limits, and safe handling of uploaded images are verified.

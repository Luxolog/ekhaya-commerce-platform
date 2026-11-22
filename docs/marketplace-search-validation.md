# Marketplace Search Validation

## Branch and environment

- Repository: `Luxolog/ekhaya-commerce-platform`
- Branch: `feature/saechamber-public-showcase`
- PR: #33 (open; do not merge as part of this work)
- Validation mode: GitHub-only source changes and mocked automated tests.
- No production Supabase writes, migrations, Edge Function deployments, Vercel deployments or paid live provider requests were performed.

## Implemented in this change set

- Expanded brand and laptop-family vocabulary, including Google/Pixel, ProBook, Vostro, XPS, Aspire and additional common spelling corrections.
- Added bounded, deduplicated query-plan generation and a conditional follow-up selection helper.
- Rebalanced product scoring to use exact/model match, brand, category, model-token coverage and description-token similarity, with existing wrong-category, accessory, model-conflict, brand and condition penalties retained.
- Added regression cases for additional product families, spelling corrections, accessory separation and discovery planning.

## Not yet verified

- Deno regression tests on the final commit: GitHub Actions queued at time of writing.
- ESLint, TypeScript and Next.js production build on the final commit: GitHub Actions queued at time of writing.
- Dependency audit, Gitleaks, CodeQL and complete Edge Function type-check on the final commit: pending workflow completion.
- Conditional discovery is not yet integrated into live provider orchestration.
- Provider request counts, cross-variation listing deduplication and per-response provider cost accounting are not implemented end-to-end.
- Provider timeout/partial failure behaviour has not been expanded or integration-tested.
- Seller-credit reserve/complete/refund paths have not received new mocked integration tests.
- Isolated non-production Supabase and safe ReefAPI credentials have not been established for controlled live validation.
- No real marketplace calls were made; actual provider costs are unknown.

## Existing operational constraints

- Takealot, Amazon South Africa and Makro are the only enabled marketplace options in the current source; Bob Shop and Leroy Merlin remain disabled.
- Existing seller-credit and pilot reservation lifecycle remains unchanged by these changes.
- Production marketplace-search Edge Function source is known to differ from this branch and has not been redeployed.

## Readiness

**NOT READY** for controlled marketplace testing or production release. Complete provider orchestration integration, request accounting, cache/deduplication, seller-credit regression coverage, and final green CI first.

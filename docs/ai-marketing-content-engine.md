# Ekhaya AI Marketing content generation

## Content engine
The `ai-marketing-generate` Edge Function authenticates the existing seller session, requires an active Marketing add-on subscription, validates the requested feature and inputs, calls the OpenAI API using a server-side `OPENAI_API_KEY`, and returns generated content.

Set optional `OPENAI_MARKETING_MODEL` to select an approved model; the default is `gpt-4o-mini`. Never expose the API key in the browser or commit it to GitHub.

## Quota protection
The companion migration adds `consume_marketing_usage` and `release_marketing_usage` RPCs. They use a per-user transaction advisory lock to serialize quota consumption, enforce the active billing period and plan allowance, and support idempotency keys. Only the service role can execute them. The Edge Function reserves one unit before calling the model and releases the reservation if generation fails.

## Initial features
- AI social post: one generated post for the selected social platform.
- Campaign idea: one campaign concept with a hook and suggested call to action.
- Research query: a concise seller-focused research brief based on the seller's supplied question; it does not claim live web research.
- Trend report: a structured trend-planning brief based on the seller's supplied category and market context; it does not claim real-time trend data.

## Release gates
This is GitHub-only code. Apply migrations only to a non-production environment first. Configure `OPENAI_API_KEY` as a Supabase Edge Function secret. Deploy the function only after security review, build checks and quota tests. Marketing checkout remains hard-disabled until Paystack approval and acceptance tests are complete.

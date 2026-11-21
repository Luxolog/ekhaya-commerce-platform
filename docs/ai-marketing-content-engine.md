# Ekhaya AI Marketing content generation

## Content engine
The `ai-marketing-generate` Edge Function authenticates the existing seller session, requires an active Marketing add-on subscription, validates the requested feature and inputs, calls the OpenAI API using a server-side `OPENAI_API_KEY`, and returns generated content.

Set optional `OPENAI_MARKETING_MODEL` to select an approved model; the default is `gpt-4o-mini`. Never expose the API key in the browser or commit it to GitHub.

## Quota protection
The companion migration adds `consume_marketing_usage` and `release_marketing_usage` RPCs. They use a per-user transaction advisory lock to serialize quota consumption, enforce the active billing period and plan allowance, and support idempotency keys. Only the service role can execute them. The Edge Function reserves one unit before calling the model and releases the reservation if generation fails.

## Creative formats
All creative formats use the existing `ai_post` allowance; no new quota category or paid API is introduced:
- Social posts and Instagram captions for Facebook, Instagram, TikTok, LinkedIn and other.
- TikTok short-form video scripts.
- Product descriptions based only on supplied product facts.
- Promotional messages, without invented prices or discounts.
- Email marketing copy with subject and preview text.
- Campaign headline options.
- Calls to action.
- Hashtag suggestions.

Optional generation context includes a target audience, seller-verified product facts and a brand voice description. These fields are length-limited, sent to the authenticated Edge Function and used only as additional prompt context; they do not create new quota categories or expose secrets. Product facts remain seller-supplied and the model is instructed not to invent missing specifications.

The dashboard also retains the existing campaign idea, research brief and trend-planning generation features.
- Campaign idea: one campaign concept with a hook and suggested call to action.
- Research query: a concise seller-focused research brief based on the seller's supplied question; it does not claim live web research.
- Trend report: a structured trend-planning brief based on the seller's supplied category and market context; it does not claim real-time trend data.

## Release gates
This is GitHub-only code. Apply migrations only to a non-production environment first. Configure `OPENAI_API_KEY` as a Supabase Edge Function secret. Deploy the function only after security review, build checks and quota tests. Marketing checkout remains hard-disabled until Paystack approval and acceptance tests are complete.


## Saved brand and product context

The seller can save one business brand profile and multiple product profiles in the Marketing workspace. The generation Edge Function loads the brand profile using the authenticated seller ID and, when a product ID is supplied, loads that product using both the product ID and seller ID. The resulting context is passed to the existing OpenAI request; it does not create additional provider calls or quota categories.

New content formats include Facebook ad copy, WhatsApp Business messages, marketplace listings, product launch packs and three-variation output. Platform choices include WhatsApp Business and marketplace preparation. These are content-preparation tools only: they do not publish listings, launch advertisements or send WhatsApp messages.

Product images are currently stored as optional references only; no upload pipeline is configured. Prices, stock and specifications are only included when the seller supplies them.

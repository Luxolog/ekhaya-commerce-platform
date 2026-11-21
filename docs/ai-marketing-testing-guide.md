# AI Marketing testing guide

## Current verification boundary

Automated GitHub Actions validate the Next.js application and selected Edge Function TypeScript. They do not prove live Supabase RLS behaviour, provider delivery, Vercel runtime behaviour or real seller acceptance. Those checks remain pending until a non-production Supabase project and authorised seller accounts are available.

## Seller journey

Use two authorised non-production seller accounts (Seller A and Seller B), with synthetic contacts only.

1. Sign in and open AI Marketing.
2. Save a brand profile and at least one product.
3. Generate each supported content format and confirm no unsupplied facts are invented.
4. Save, edit, archive and approve a campaign draft.
5. Create calendar drafts and verify no external publishing occurs.
6. Create a marketing automation rule; confirm new rules are paused and sellers cannot activate them.
7. In an isolated environment only, configure the worker secret and invoke the worker with an authorised scheduler request. Confirm due-run claiming, one-time completion, daily/weekly/monthly timezone-aware schedule advancement, idempotent action-event creation and persisted retry backoff.
8. Confirm invalid worker secrets receive 401, unauthenticated seller roles cannot execute worker RPCs, and no email or social post is sent/published.
9. Confirm a malformed action config is recorded as skipped with a clear run result.
7. Record seller-entered performance data and verify it is labelled as seller-entered.
8. Import synthetic contacts, including duplicates and unknown-consent rows.
9. Confirm unknown, withdrawn and opted-out contacts cannot be included in an email draft.
10. Confirm no email is sent in test mode.
11. Verify subscription and quota exhaustion behaviour.

## Seller isolation

For every seller-owned resource (brand, products, contacts, email drafts, campaigns, calendar posts, automations, automation runs, performance metrics and delivery events), attempt SELECT, INSERT, UPDATE and DELETE using the other seller's JWT. Reads must return no foreign rows and writes must be rejected.

Also test unauthenticated requests, malformed UUIDs, oversized payloads, invalid status transitions, quota RPC invocation from anon/authenticated roles, duplicate idempotency keys and concurrent quota requests.

## Email safety

- Verify consent status, recorded basis, consent timestamp, email address and opt-out state immediately before any provider call.
- Verify unsubscribe/suppression is honoured after a draft was created.
- Use only synthetic recipients and a provider sandbox/test mode.
- Do not enable live sends until sender-domain verification, provider credentials, rate limits, bounce handling and explicit release approval are confirmed.

## Browser coverage

Run the journey at desktop and mobile viewport sizes. Check navigation, loading/empty/error states, keyboard access, long content, CSV import/export and timezone display.

## Evidence template

For each case record: test ID, environment, seller account alias (never email), steps, expected result, actual result, PASS/FAIL/BLOCKED, date and relevant CI run or redacted screenshot. Never store credentials or personal contact data in test evidence.

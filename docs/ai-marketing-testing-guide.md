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
8. Confirm invalid worker secrets receive 401; GET/PUT requests receive 405; malformed JSON, arrays, oversized bodies and limits outside 1–25 are rejected; no external email or social post is sent/published.
9. Simulate a worker crash after claiming a run. After the 15-minute lease expires, verify the next claim safely requeues the run while attempts remain and marks it failed when the maximum attempts have been consumed.
10. Force retry-state persistence to fail and verify the worker returns HTTP 503; verify lease recovery prevents the run from remaining stuck indefinitely.
11. Confirm a malformed action config is recorded as skipped with a clear run result.
12. Record seller-entered performance data and verify it is labelled as seller-entered.
13. Import synthetic contacts, including duplicates and unknown-consent rows.
14. Confirm unknown, withdrawn and opted-out contacts cannot be included in an email draft.
15. Confirm no email is sent in test mode.
16. Verify subscription and quota exhaustion behaviour.

## Seller isolation

For every seller-owned resource (brand, products, contacts, email drafts, campaigns, calendar posts, automations, automation runs, action events, performance metrics and delivery events), attempt SELECT, INSERT, UPDATE and DELETE using the other seller's JWT. Reads must return no foreign rows and writes must be rejected.

Also test unauthenticated requests, malformed UUIDs, oversized payloads, invalid status transitions, quota RPC invocation from anon/authenticated roles, duplicate idempotency keys and concurrent quota requests. Specifically attempt to activate a paused automation by direct API update and direct RPC invocation; the seller role must not be able to do so.

## Scheduling edge cases

- One-time rules complete after one run and do not create a second run.
- Daily, weekly and monthly rules advance in the seller's timezone.
- Test daylight-saving gaps and repeated wall-clock times in a DST-observing timezone.
- Test month-end dates (including the 29th, 30th and 31st) and document the intended clamp/rollover policy.
- Invalid timezone names pause the affected rule without aborting other due rules.
- Missed schedules do not create uncontrolled duplicate backlogs.
- Concurrent worker invocations do not claim the same run.
- A duplicate action invocation does not create a second calendar post or action event.

## Email safety

- Verify consent status, recorded basis, consent timestamp, email address and opt-out state immediately before any provider call.
- Verify unsubscribe/suppression is honoured after a draft was created.
- Use only synthetic recipients and a provider sandbox/test mode.
- Do not enable live sends until sender-domain verification, provider credentials, rate limits, bounce handling and explicit release approval are confirmed.

## Browser coverage

Run the journey at desktop and mobile viewport sizes. Check navigation, loading/empty/error states, keyboard access, long content, CSV import/export and timezone display.

## Evidence template

For each case record: test ID, environment, seller account alias (never email), steps, expected result, actual result, PASS/FAIL/BLOCKED, date and relevant CI run or redacted screenshot. Never store credentials or personal contact data in test evidence.

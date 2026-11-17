# Ekhaya Support Desk — Commercial and Department Model

## Confirmed commercial decisions

- Trial: 30 calendar days from organisation creation.
- Included seats: 2 user accounts per organisation.
- Additional seats: ZAR 75 per additional user per month.
- Departments: unlimited; department count does not affect subscription price.
- Billing interval: monthly only.
- Currency: ZAR.

## Pricing decision still required

The monthly base subscription amount covering the first two seats has not yet been approved. The database stores this as `base_monthly_price_cents = NULL` until confirmed. Do not publish a final subscription total, charge customers, or activate recurring billing until this amount is set.

Monthly total once approved:

`base monthly fee + (paid additional seats × R75)`

During the 30-day trial, two seats are included. Paid add-on seats and post-trial access require an active paid subscription.

## Organisation, user and department model

- An organisation is the customer account and billing boundary.
- Each organisation has one subscription record.
- Each human staff member has an individual Supabase Auth identity and an organisation membership.
- The first two active or invited memberships consume the included seats.
- Each additional active or invited membership consumes one paid seat.
- A person may be assigned to one or more departments without consuming additional seats.
- Departments are unlimited and belong to exactly one organisation.
- Tickets may be routed to a department and an eligible agent/supervisor within the same organisation.

## Roles and responsibilities

- Owner: organisation control, subscription visibility, team and department administration.
- Admin: operational administration, team and department management, subscription visibility.
- Supervisor: department workflow and ticket routing; department create/update according to current database policies.
- Agent: works assigned tickets and conversations.
- Viewer: read-only access permitted by tenant policies.

Billing writes must be performed by a trusted server-side billing integration (for example, a verified payment webhook), not by browser clients. Authenticated clients receive read-only access to subscription and subscription-event records. Never expose a payment secret or Supabase service-role key to the browser.

## Trial lifecycle

1. New organisation is created.
2. Database trigger creates a `trialing` subscription with a start timestamp and end timestamp 30 days later.
3. Two seats are available during the trial.
4. Trial reminders should be sent before expiry (recommended at 7 days, 3 days and 1 day remaining).
5. At expiry, the subscription should transition to `expired` unless a verified monthly payment subscription is active.
6. After expiry, block new invitations and new ticket work according to an agreed grace-period policy; do not delete customer or ticket data.
7. Reactivation must preserve historical records and audit events.

Existing organisations created before this commercial migration are marked `setup_required`. They are not silently enrolled in a trial that may already have expired. Their commercial onboarding must be explicitly decided.

## Department workflow

- Create, rename, describe and archive departments.
- Assign eligible agents and supervisors to departments.
- Assign tickets to a department, then to an agent/supervisor.
- Provide department queues, workload counts, overdue counts and response-time reporting.
- A department may have multiple agents; an agent may belong to multiple departments.
- Department membership must be represented separately from organisation membership.
- Every query and mutation must be scoped by organisation and protected by RLS.

## Current implementation boundary

This change adds the subscription entitlement schema, trial creation for new organisations, seat-limit enforcement for invited/active memberships, and owner/admin read access to subscription records. It does not connect a payment gateway, collect card/payment details, send trial reminders, run billing webhooks, or complete a production billing portal. Those require a selected payment provider and verified server-side integration.

The current department table already supports organisation-owned departments and ticket routing. A full agent-to-department membership model, department management UI, invitation flow, and departmental reporting remain follow-up implementation work.

## Safety and deployment

- Additive `sd_*` objects only; do not alter Price Checker tables.
- Do not replay migrations already applied to the shared Supabase project.
- This migration is committed to GitHub for review; it has not been applied to Supabase.
- Do not deploy to Vercel until explicitly authorised.

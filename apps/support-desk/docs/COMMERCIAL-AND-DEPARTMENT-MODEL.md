# Ekhaya Support Desk — Commercial and Department Model

## Confirmed commercial decisions

- Trial: 30 calendar days from organisation creation.
- Included seats: 2 user accounts per organisation.
- Base monthly subscription fee: awaiting confirmation; do not quote or calculate a total until approved.
- Additional seats: ZAR 75 per additional user per month.
- Departments: unlimited; department count does not affect subscription price.
- Billing interval: monthly only.
- Currency: ZAR.

## Pricing formula

Once the base monthly fee is approved:

`approved base monthly fee + (paid additional seats × ZAR 75)`

The first two seats are included in the base monthly fee. Each additional user account costs ZAR 75 per month. The base fee is intentionally nullable in the database until approved; the interface must not substitute an assumed amount.

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

This change adds the subscription entitlement schema, trial creation for new organisations, seat-limit enforcement for invited/active memberships, owner/admin read access to subscription records, a subscription overview screen, and the department membership schema and management screen. It does not connect a payment gateway, collect card/payment details, send trial reminders, run billing webhooks, or complete a production billing portal. Those require selection of a payment provider and a verified server-side integration.

The current department table supports organisation-owned departments and ticket routing. The commercial branch adds a separate department-membership table with same-organisation validation and a department management screen for creating departments and assigning/removing active agents and supervisors. It also adds a team roster, staff invitation actions, role changes/removal, a Supabase Auth invitation callback and password setup screen. A verified invite callback activates only the authenticated user's pending organisation membership through a narrowly scoped RPC. The migrations are committed but have not been applied to Supabase. Existing Auth users can be added to another organisation by creating a pending membership for their existing Auth identity and sending a Supabase email sign-in link with account creation disabled. The callback accepts only the pending membership belonging to the authenticated user and requested organisation. New users continue through the Auth invitation and password-setup flow. Department queues and departmental reporting remain follow-up implementation work.

## Safety and deployment

- Additive `sd_*` objects only; do not alter Price Checker tables.
- Do not replay migrations already applied to the shared Supabase project.
- This migration is committed to GitHub for review; it has not been applied to Supabase.
- Do not deploy to Vercel until explicitly authorised.

## Staff invitation environment requirements

The team invitation workflow uses the Supabase Auth Admin API only from server-side code. Configure these environment variables in the Support Desk server environment before enabling invitations:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only; never expose it to client bundles.
- `SUPPORT_DESK_APP_URL` — canonical Support Desk origin used for invite redirects.

Add the canonical `/auth/callback` URL to the Supabase Auth redirect URL allowlist. Invitees authenticate through the emailed link, accept their pending membership, and set a password. Invited memberships reserve seats. Invitation creation checks available seats and the database seat trigger enforces the final limit. If the membership insert fails after the Auth invite is sent, the temporary Auth user is deleted; test the email delivery and cleanup behavior in a non-production project before launch.

For an email address already registered in Supabase Auth, the workflow creates a pending membership against that existing user ID and sends a sign-in link with automatic account creation disabled. The callback calls the invitation-acceptance RPC; the RPC verifies that the authenticated user owns the pending membership for the specified organisation. For a new email address, Supabase Auth sends a normal invitation and the recipient sets a password. Paid additional-seat purchasing is not implemented, so invitations stop when all included/purchased seats are allocated. Test both invitation paths and email-template redirects in an isolated Supabase project before launch.

# Ekhaya Technologies — Unified Modular Platform

## Product direction

Build one interconnected business platform with independently deployable or evolvable modules, one identity/workspace, shared business records where appropriate, and subscription-controlled access. This is inspired by the unified-app experience of Zoho One, but tailored to South African entrepreneurs and commerce workflows.

## Core principles

- One account and organization/workspace model.
- Modular product areas with explicit boundaries.
- Subscription entitlements are enforced server-side, not only hidden in the UI.
- Shared core entities have stable IDs and organization/tenant ownership.
- Each module owns its domain behavior and may expose events/APIs to other modules.
- No fabricated marketplace data; price comparisons must carry source, observation time, and match confidence.
- Existing Ekhaya Scents WooCommerce storefront remains independent and must not be disrupted.

## Proposed modules

1. **Price Checker / Sourcing Intelligence** — barcode and text search, comparisons, sourcing lists, estimated fees and margins.
2. **Marketplace** — vendor onboarding, listings, orders, marketplace fees/commissions.
3. **Inventory** — product catalog, SKUs, stock locations, stock movement.
4. **Business Suite** — customers/CRM, quotes, invoices, basic reports.
5. **Future modules** — campaigns, supplier management, recruitment, support/tickets, vendor VoIP, workflow automation.

## Shared platform services

- Identity and authentication.
- Organizations, members, roles, and permissions.
- Subscription plans, billing records, module entitlements, usage limits.
- Product identity/catalog normalization (distinct from a tenant's own listing).
- Notifications and audit trail.
- Integration credentials and webhooks.
- Admin and support tooling.

## Subscription model

Support both:
- **Standalone module subscriptions:** customer pays for only Price Checker or another individual module.
- **Bundles:** combined module plans with a consolidated invoice.
- **Add-ons/usage:** optional quotas, seats, additional lookups, or premium data access.

An entitlement should include organization, module, state, plan, limits, effective dates, and source subscription. On expiry or failed payment, access follows a documented grace/suspension policy; data should not be silently deleted.

## Data ownership and tenant safety

Every customer-owned record must be scoped to an organization/workspace. Enforce organization membership and role authorization in backend routes and data access layers. Shared public catalog entities must be separated from private organization records and secrets.

## Integration example

Price Checker product candidate -> user confirms match -> sourcing list -> inventory item -> marketplace listing. The handoff should use stable product and organization IDs and explicit user action; avoid duplicate records and accidental publication.

## One-week MVP scope

A seven-day target is a focused demonstrable MVP, not the complete suite:
- Price Calculator / Price Checker user journey.
- Search interface and product result model.
- At least one confirmed, permitted source integration if access is available.
- Comparison result details with source URL and observed-at timestamp.
- Basic responsive UI, test coverage for calculations, honest empty/error states.
- Documented limitations and demo deployment.

Full multi-module billing, complete marketplace, inventory, CRM, and all integrations are staged follow-on work. The architecture should allow them without promising all modules in the first week.

## Delivery sequence

1. Agree module map, user journey, and subscription entitlements.
2. Implement the first Price Checker vertical slice in the existing repository/branch.
3. Add core organization and entitlement abstractions before introducing paid module gating.
4. Integrate the first data source only after confirming permitted access and technical viability.
5. Expand module-by-module with API contracts, migration strategy, tests, and observability.

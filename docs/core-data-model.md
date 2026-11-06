# Core data model

This first migration establishes the tenant-aware data layer for Ekhaya Commerce Platform.

## Tables

- **stores** — one merchant storefront / tenant, with a URL slug, status, and currency.
- **store_memberships** — connects authenticated users to stores with owner, admin, or staff access.
- **store_domains** — hostnames mapped to a store; primary domain is unique per store.
- **categories** and **products** — store-scoped catalog, inventory count, product status, and pricing.
- **customers** — store-scoped customer records.
- **orders** and **order_items** — order totals and line-item snapshots, with composite foreign keys ensuring records cannot point across stores.

## Tenant safety

Every merchant-owned record carries a `store_id`. Row Level Security is enabled on all tenant tables. Policies check store membership, while domain administration and membership administration are restricted to store owners/admins. A database trigger automatically assigns the authenticated creator as the first store owner.

The composite foreign keys on product categories, customers, and order items provide a second boundary against cross-store references.

## Apply the migration

1. Create a separate Supabase project for this platform (do not use Ekhaya Scents' live WooCommerce hosting/database).
2. Open Supabase **SQL Editor**.
3. Run `supabase/migrations/0001_core_schema.sql`.
4. Confirm the tables and policies appear in the database.
5. Keep the Supabase service-role key server-only; never place it in client-side code or commit it to GitHub.

This is a starting schema, not yet the live app database. Payment processing, guest checkout policies, customer account ownership, stock reservation, refunds, and verified custom-domain routing still need dedicated implementation and testing.

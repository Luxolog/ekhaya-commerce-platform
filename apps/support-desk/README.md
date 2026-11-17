# Ekhaya Support Desk

A standalone multi-tenant customer support workspace for Ekhaya Technologies.

## Architecture

- Runs independently from the Price Checker app in this repository.
- Uses the shared Supabase project `ekhaya-commerce-platform`.
- Reads and writes only `sd_*` tables.
- Tenant access is enforced by PostgreSQL Row Level Security.
- Uses Supabase SSR cookie-based authentication.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set the Supabase project URL and publishable key from the Supabase Connect dialog.
3. Install dependencies in this folder with `npm install`.
4. Start with `npm run dev`.

## Database migrations

Versioned SQL migrations are stored in `supabase/migrations/`. The initial platform administrator is bootstrapped separately in the shared project; the current administrator has owner membership in Ekhaya Technologies and Ekhaya Scents. Attachment object paths must begin with the organisation UUID, followed by the ticket UUID and filename, so Storage RLS can enforce tenant boundaries.

## Deployment

Configure the hosting project root directory as `apps/support-desk`. Do not change the existing Price Checker deployment's root directory or build settings.

Never place a Supabase secret/service-role key in browser environment variables or commit credentials.

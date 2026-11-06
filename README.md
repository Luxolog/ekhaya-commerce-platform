# Ekhaya Commerce Platform

A custom multi-store commerce platform for Ekhaya Scents and future independent merchants.

## Phase 1 — foundation

This repository establishes the application structure and tenancy-first architecture. It is intentionally not connected to production hosting, payment credentials, or customer data yet.

### Planned foundation
- Store-aware routing and configuration
- Separate merchant/store records
- Domain mapping and verification workflow
- Tenant-scoped catalog and orders
- Role-based access and server-side authorization
- PostgreSQL/Supabase integration after schema and access policies are reviewed

## Development

Install Node.js 20+ and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Safety

Never commit API keys, payment secrets, database credentials, customer data, or `.env` files. Production tenant isolation must be enforced in the database—not only in the UI.

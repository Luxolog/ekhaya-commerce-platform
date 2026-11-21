# Ekhaya AI Marketing Intelligence

## Seller workspace
The seller workspace is available at `/account/marketing/intelligence/` and is linked from the AI Marketing dashboard.

It supports six planning report types:
- Competitor analysis
- Product positioning
- Target audience and customer personas
- SWOT analysis
- Monthly marketing strategy
- Trend-planning report

## Evidence boundary
Reports are generated through the existing `ai-marketing-generate` Edge Function and consume the existing Marketing research or trend allowance. No separate research API or paid data provider is introduced.

The seller supplies product, category, market, competitor and observation context. The model must distinguish seller-supplied statements from assumptions and recommendations. Reports are not live web research, verified competitor intelligence, verified market share, real-time pricing or confirmed trends.

## Saved report library
The migration `20261122020000_add_marketing_research_reports.sql` adds `public.marketing_research_reports`.

The table stores the report type, seller context, generated report, seller notes and evidence mode. RLS limits read, insert, update and delete to the owning authenticated seller. The seller workspace supports report history, editing, notes, export to text and deletion.

## Release requirements
- Apply the migration only to an isolated non-production Supabase environment first.
- Verify seller A cannot read, edit or delete seller B's reports.
- Verify unauthenticated users have no access.
- Test each report type with representative inputs and quota exhaustion.
- Verify generated content clearly labels assumptions and seller-provided information.
- No production migration or Edge Function deployment has been performed by this implementation.

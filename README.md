# MEMECYCLE Platform — MVP foundation

A Vite-based public website and archive explorer for MEMECYCLE. It uses the existing Supabase project only for the dedicated `mc_*` tables.

## Requirements
- Node.js 20+
- npm
- Supabase project URL and publishable key

## Local development
```bash
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
npm install
npm run dev
```

## Production build
```bash
npm run build
npm run preview
```

## Vercel deployment
1. Push this repository to a GitHub repository.
2. Import it into Vercel as a Vite project.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables.
4. Deploy. The included `vercel.json` configures the Vite build and SPA fallback.
5. Add a custom domain in Vercel only after confirming domain ownership and DNS access.

The Supabase publishable key is designed for browser use. Never put a Supabase service-role key, Helius private key, RPC secret or any wallet secret in `VITE_*` variables.

## Current MVP scope
- Public marketing website and product explanation.
- Search of published MEMECYCLE token records.
- Classification filters.
- Community reclamation submission UI.
- RLS-protected Supabase data access.
- No fabricated token data or demo metrics.

## Not yet implemented
- Automated Solana discovery workers and historical backfill.
- Helius / market-data ingestion credentials.
- Admin review console and authenticated moderation.
- Wallet message-signature verification.
- Paid subscriptions, billing and dataset/API entitlements.
- Automated collectible issuance or revival transactions.

The database schema is created separately in the existing Supabase project. Review `supabase/migrations/202611010001_memecycle_foundation.sql` as the source migration record.

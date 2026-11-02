# MEMECYCLE Platform

A Vite-based public website and Solana token history archive backed by a dedicated Supabase project.

## Requirements
- Node.js 20+
- npm
- Supabase project URL and publishable key for the browser archive

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

## Environment security
The browser uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never put a Supabase service-role key, Helius private key, RPC secret or wallet secret in a `VITE_*` variable.

The scheduled server-side discovery runner additionally requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` in Vercel Production. These must remain server-only.

## Implemented
- Public archive search and classification filters.
- Community reclamation submission UI with database RLS.
- Phase 2 discovery worker using DexScreener and GeckoTerminal public endpoints.
- Phase 3 historical vault: market snapshots, pool state, provenance, ingestion runs, events and data-gap tracking.
- Phase 4 versioned, explainable lifecycle classification and reclamation research scoring.
- Daily Vercel Cron runner at 07:00 UTC; it remains inactive until the three server-only variables are configured.
- New discovery records are private by default and require human review before publication.

See [docs/PHASES_2_4.md](docs/PHASES_2_4.md) for worker operation, scoring limits and setup instructions.

## Classification safeguards
Public market data cannot prove that a token is abandoned or dormant. The worker only assigns market-observation states (`active`, `declining`, `illiquid`, `unverified`). It does not infer on-chain inactivity, community strength, cultural significance or ownership authority. No records are automatically published.

## Not yet implemented
- Helius-backed historical transaction/holder backfill.
- Authenticated admin moderation console using trusted app_metadata role claims.
- Wallet message-signature verification.
- Paid subscriptions, billing and dataset/API entitlements.
- Automated collectible issuance or revival transactions.

Database migrations live in `supabase/migrations/`. Edge Function source lives in `supabase/functions/memecycle-worker/`.

## Stage 2/3
See [docs/PHASES_2_4.md](docs/PHASES_2_4.md) for the historical archive detail view, data-quality evidence, reclamation review queue, and admin role setup.

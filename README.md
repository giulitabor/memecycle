# MEMECYCLE Platform

A Vite-based public website and Solana token history archive backed by Supabase.

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

The scheduled server-side discovery and monitor runners require `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` in Vercel Production. These remain server-only.

## Automated engine
- Daily discovery at 07:00 UTC from DexScreener token profiles, boosts and GeckoTerminal trending pools.
- Daily lifecycle monitoring at 08:00 UTC across the oldest-updated archive records (up to 50 per run; rows rotate as they are updated).
- Limited on-chain activity sampling on up to five tokens per monitor run, using the configured Helius RPC URL and inspecting the three largest token accounts per mint. This is explicitly partial coverage, not an exhaustive transaction history.
- Each monitor pass records a fresh market snapshot, reassesses market-state classification and logs changes.
- GeckoTerminal OHLCV backfill adds up to 90 real daily candles per pool where available. The public API is rate-limited, so at most eight new pools are backfilled per run.
- Market states (active, declining, illiquid, unverified) describe market observations only. Missing DEX data is not treated as proof of inactivity.
- New discovery records remain private until review. The monitor never auto-labels a token abandoned or publishes it based solely on liquidity or price data.
- All discovery and monitor runs are recorded in `mc_ingestion_runs`, with errors and summaries in the audit log.

## Implemented
- Public archive search, filters and public-only token detail.
- Community reclamation submissions and RLS-enforced authenticated moderation.
- Discovery ingestion, market snapshots, pool observations, provenance, classification history and data-gap tracking.
- Scheduled monitoring and historical daily OHLCV backfill.
- Manual administrator publication of private discovery candidates.

## Still requires additional data access / product work
- Comprehensive indexed holder and transaction activity history (current RPC sampling is limited to the top three token accounts for five tokens per run; it is not exhaustive).
- Evidence-backed abandonment adjudication and its publication criteria. Market inactivity alone is insufficient.
- Wallet message-signature verification for reclamation authority.
- Paid subscriptions, billing, API keys and dataset entitlements.
- Automated collectible issuance or revival transactions.

## Classification safeguards
Public market data cannot prove that a token is abandoned or dormant. MEMECYCLE separates observable market states from on-chain activity, community status and ownership authority. It does not infer or promise any of those facts from price or liquidity data.

Database migrations live in `supabase/migrations/`. Edge Function source lives in `supabase/functions/`.

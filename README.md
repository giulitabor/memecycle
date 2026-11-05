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
- A preliminary abandonment research queue flags only low-confidence leads when a pool is at least 90 days old, liquidity and 24-hour volume are very low, and all three sampled top-holder accounts show no transaction in 90 days. Every lead remains unverified and private.
- Each monitor pass records a fresh market snapshot, reassesses market-state classification and logs changes.
- GeckoTerminal OHLCV backfill adds up to 90 real daily candles per pool where available. The public API is rate-limited, so at most eight new pools are backfilled per run.
- Market states (active, declining, illiquid, unverified) describe market observations only. Missing DEX data is not treated as proof of inactivity.
- New discovery records remain private until review. The monitor never auto-labels a token abandoned or publishes it based solely on liquidity or price data.
- All discovery and monitor runs are recorded in `mc_ingestion_runs`, with errors and summaries in the audit log.

## Implemented
- Read-only Solana rent-recovery analysis in the revival investigator: compares the mint and sampled largest token accounts against the live rent-exempt minimum, records possible excess and zero-balance close candidates, and never builds or sends transactions.
- Reference-first archive and recovery design: retain canonical addresses, external source locators, hashes, provenance, licences and retrieval status instead of mirroring entire external datasets or media.
- Public archive search, filters and public-only token detail.
- Community reclamation submissions and RLS-enforced authenticated moderation.
- Discovery ingestion, market snapshots, pool observations, provenance, classification history and data-gap tracking.
- Scheduled monitoring and historical daily OHLCV backfill.
- Manual administrator publication of private discovery candidates.

## Still requires additional data access / product work
- Comprehensive indexed holder and transaction activity history (current RPC sampling is limited to the top three token accounts for five tokens per run; it is not exhaustive).
- Comprehensive abandonment adjudication and publication criteria. The current research queue is only a preliminary lead generator; market inactivity and a three-account sample are insufficient for automatic public publication.
- Wallet message-signature verification for reclamation authority.
- Paid subscriptions, billing, API keys and dataset entitlements.
- Automated collectible issuance or revival transactions.

## Classification safeguards
Public market data cannot prove that a token is abandoned or dormant. MEMECYCLE separates observable market states from on-chain activity, community status and ownership authority. It does not infer or promise any of those facts from price or liquidity data.

Database migrations live in `supabase/migrations/`. Edge Function source lives in `supabase/functions/`.

## Expanded discovery and research sources
- DexScreener profiles/boosts and GeckoTerminal trending pools remain the baseline discovery feeds.
- Pump.fun launch history is ingested from the independent pumpdata.fun launch cursor endpoint once per daily discovery run. It is a best-effort external dataset, not an official pump.fun API. The worker samples at most the 25 newest launch rows from that feed per run, stores creator/deployer/bundle/migration facts with provenance, and makes no Solana RPC calls for this source. The free endpoint documents 300 calls/day per IP; MEMECYCLE uses one call per run.
- Jupiter Tokens API v2 provides a single batch metadata/enrichment request per discovery run, including verification, organic score, holder count and audit flags. Keyless access is limited to 0.5 requests/second; the worker makes one request per run and no RPC calls.
- The official pump.fun Developer API is a separate approved, keyed, read-only social/profile API. It is not required for the current launch-history integration and may be added later if MEMECYCLE obtains approval and a server-side key.

## Evidence-based automatic publication
- The monitor makes at most three Solana RPC calls per run. Each call asks for the latest signature on one primary DEX pool account; there is no broad account scan or holder-wallet crawl.
- One batched Jupiter Tokens API lookup is made per monitor run. Research dossiers combine DEX market age/liquidity/volume, Jupiter verification/organic/audit signals, Pump.fun launch provenance when available, and the sampled pool-account signature.
- Records may be automatically published only as **dormant market records** when the primary pool is at least 180 days old, its latest sampled pool-account signature is at least 90 days old, liquidity is below $1,000, 24-hour volume below $500, Jupiter marks it unverified with organic score at or below 10, and there is no pending community case.
- Automatic publication never sets classification to `abandoned`. A dormant pool is a market-history observation, not proof that a project, token or community has ceased to exist.

## Community verification
- Community submissions now require a one-time Ed25519 wallet message signature. Challenges expire after five minutes, are single-use, and are rate-limited per wallet.
- The signature proves control of the submitting wallet only. It does not prove token ownership, creator identity or authority to revive a project. Those claims remain subject to independent review.

## Research synthesis
- The current research dossier is deterministic and explainable (rules-based v1), not a generative-AI verdict. It records research coverage, a community follow-up priority score, provider evidence and risk flags. The priority score is not a probability of revival or a financial recommendation.

## Operator controls
- Administrators can trigger discovery and monitoring immediately from the Archive administration workspace. The server verifies the Supabase Auth user's trusted `app_metadata.role=admin` claim; service-role credentials remain server-side.
- Manual runs are rate-limited to one per run type every five minutes. Manual monitoring checks up to 10 records and backfills at most two pools to stay within serverless execution limits. Scheduled monitoring retains its larger daily batch.

## Free organic launch

The launch does not depend on Metricool or a paid scheduler. Use native free publishing on existing social accounts, with no paid ads or boosts. The channel strategy, profile copy, seven ready-to-post messages, manual publishing checklist, measurement plan and spending guardrails are in [marketing/ORGANIC_LAUNCH_PLAN.md](marketing/ORGANIC_LAUNCH_PLAN.md).

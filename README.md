# MEMECYCLE — MVP foundation

Vite-based public website and archive explorer for MEMECYCLE. Connects to the existing Supabase project through the browser-safe publishable key. Never place service-role keys, private RPC keys, or wallet secrets in VITE_ variables.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Build

```bash
npm run build
```

## MVP scope
- Public marketing site and product explanation
- Search of published token records
- Classification filters
- Community reclamation submission UI
- RLS-protected Supabase data access

Automated Solana ingestion, historical backfill, admin moderation, wallet-signature verification, paid subscriptions, and automated collectible issuance are not yet implemented.
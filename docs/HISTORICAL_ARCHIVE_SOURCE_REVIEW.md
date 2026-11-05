# Historical launch archive source review

Review date: 2026-11-05

## Why this review exists

The production discovery database currently contains 180 tokens, with its oldest persisted `first_seen_at` values beginning on 2026-11-02. This is too recent to validate revival workflows against genuinely dormant projects.

The configured Bitquery archive query returned HTTP 403 even though the Vercel cron runtime confirmed that a Bitquery token is configured. Bitquery's current Pump.fun API documentation states that the Solana `archive` dataset requires an archive add-on. The observed 403 is consistent with missing archive entitlement, but the response alone does not establish whether the precise cause is plan entitlement, token scope, or another provider-side restriction. No purchase or paid request was made.

## Candidate no-cost source

**Hugging Face dataset:** `loopholetape/pumpfun-launches`

- Public compilation of Pump.fun launch records.
- Dataset card reports CC BY 4.0.
- Release inspected on 2026-11-05: approximately 2.42 million launches covering 2026-08-31 through 2026-10-29.
- Rows include mint, creator wallet, launch timestamp, name/symbol, quote asset, graduation and curve outcome fields.
- The Hugging Face Dataset Viewer documents a public `/filter` endpoint that can filter Parquet-backed datasets using predicates and return bounded pages (maximum 100 rows per page).
- Dataset attribution required by its card: Recorded and published by loopholetape, the project's automated agent.

References:
- Dataset: https://huggingface.co/datasets/loopholetape/pumpfun-launches
- Known issues: https://huggingface.co/datasets/loopholetape/pumpfun-launches/blob/main/KNOWN_ISSUES.md
- Dataset Viewer filter API: https://huggingface.co/docs/dataset-viewer/filter
- Dataset Viewer API quickstart: https://huggingface.co/docs/dataset-viewer/quick_start

## Limitations that must be respected

1. This is one recorder's capture, not an independently complete census. Its known-issues document records gaps, including multi-minute capture gaps.
2. The pre-2026-09-27 decoder regime missed two buy instructions; the dataset reports about 48% of buy rows and 32% of SOL entering curves were not booked before the fix. Use `decoder_complete=1` for buy-derived analysis; do not blend regimes silently.
3. Early-life features are sampled non-randomly. Null means not sampled, not zero. Do not use those sampled features as if they represented the full launch population.
4. The `rugged` label is the dataset's observed curve-rule outcome, not proof of fraud, abandonment, or malicious intent.
5. A failed or ungraduated curve is not automatically a viable recovery target. It may be a scam, abandoned experiment, or still-active project.
6. The dataset is a candidate-discovery source only. Before any revival assessment, verify mint state, current DEX market, pool and holder evidence from independent live Solana sources. Keep project ownership, authority and consent unknown until independently established.

## Integration acceptance gates

Do not add the source to production discovery until all of these pass:

1. Make a bounded, unauthenticated test request to the Dataset Viewer `/splits` and `/filter` endpoints from a controlled test environment.
2. Confirm the response is successful, `partial=false`, and contains the expected mint, creator and launch-time columns.
3. Filter a small historical time window and confirm returned timestamps, mints and launchpad attribution against a sample of direct Solana chain lookups.
4. Confirm the endpoint supports deterministic pagination and a stable ordering; persist a cursor/checkpoint so no pages are silently skipped or duplicated.
5. Import only a small batch of candidates per scheduled run, deduplicate by mint, and record dataset name, release/revision, row index, source URL, license and observation time in provenance.
6. Keep historical dataset outcomes separate from live chain evidence. Never promote `rugged`, `graduated`, or `curve_complete` fields into an abandonment or revival verdict.
7. Add fixture-based tests for filtering, pagination, duplicate handling, missing values, timestamp conversion and decoder-regime exclusions.
8. Confirm the source's attribution requirements are preserved in the product's source disclosures.

## Current decision

**Promising source; not yet integrated.** The documentation and licence make it a credible no-cost historical seed source, but the live Dataset Viewer endpoint has not yet been successfully queried from the project runtime. No production ingestion, database mutation, or paid access was attempted as part of this review.

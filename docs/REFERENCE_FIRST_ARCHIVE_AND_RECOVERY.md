# MEMECYCLE Reference-First Archive and Recovery Engine

## Product decision

MEMECYCLE will not mirror the whole Solana ledger or bulk-copy every abandoned project's media. It will maintain a searchable **reference graph**: canonical on-chain addresses, transaction signatures, source-record identifiers, metadata URIs, content hashes, provenance, rights/licence information, observation timestamps and coverage limits. Original data remains with its authoritative source whenever practical.

The database is the index and evidence ledger, not a duplicate of the internet.

## What a reference record should contain

A future `mc_archive_references` table should use a stable identity of `(network, subject_type, subject_address, source_id, external_record_id)` and retain:

- canonical subject: cluster, mint/account/wallet/program address, transaction signature;
- source locator: provider, dataset/version, row key, canonical URL or content URI (IPFS/Arweave/HTTP);
- integrity: content hash when available, source revision, first-seen and last-checked timestamps;
- provenance: source method, collection time, licence/terms URL, attribution and known coverage gaps;
- retrieval status: available, missing, changed, rate-limited, access-restricted, or unknown;
- evidence role: observed fact, provider-reported claim, inference, or unresolved lead.

Store only small normalized facts needed for search and scoring. Do not fetch or mirror large images, JSON blobs, transaction archives or Parquet partitions by default. Fetch on demand, cache only where terms permit, and verify hashes when available. If a source disappears, preserve the locator, last-seen timestamp and content fingerprint so the record still documents what was once observed.

## Candidate source strategy

1. **Solana itself:** mint/account addresses and transaction signatures are durable identifiers; use RPC for current state and indexed providers or public archives for historical reconstruction. Standard RPC alone is not a complete historical index.
2. **SolArchive:** evaluate its public Parquet indexes for transactions, account snapshots and token metadata. Treat coverage, availability, checksums and licence as unverified until an ingestion pilot validates actual files and provenance.
3. **Hugging Face Pump.fun launch dataset:** the `loopholetape/pumpfun-launches` dataset is CC BY 4.0 and publishes `launches`, `launches_legacy`, `graduation_pools` and `features` configurations. Its Dataset Viewer `/filter` endpoint can query a mint without downloading the full dataset. MEMECYCLE now stores exact-mint lookup URLs for each configuration in the revival evidence manifest, alongside attribution and the dataset URL. These are pointers only: rows are not fetched or copied. The dataset covers 2026-08-31 through 2026-10-29 in this snapshot and has documented decoder gaps, sampled early-life features and rule-based `rugged` labels. Independently verify high-value claims against chain evidence.
4. **SolArchive:** the SolArchive dataset advertises CC BY 4.0, but its current Hugging Face viewer reports that the full viewer is unavailable because its Parquet files could not be read. Do not integrate it until a reproducible sample download, checksum and schema validation succeeds.
5. **Bitquery:** keep as an optional indexed archive provider; previous archive access returned HTTP 403. Do not buy a plan or assume access until entitlement and cost are confirmed.
6. **IPFS / Arweave / metadata URIs:** store the original URI, gateway-independent content identifier where possible, hash, creator/authority evidence and retrieval status. A URI is not proof of ownership or a guarantee of availability.

No single provider's label such as "rugged", "dead", "bundled" or "abandoned" is a verdict. Provider assertions remain explicitly attributed.

## Value classification

For each token/project, the engine should independently score whether it has:

- **Historical value:** launch chronology, market lifecycle, transactions and creator/deployer links.
- **Research value:** bundled-launch patterns, holder distribution, liquidity evolution, wallet relationships and risk/outcome datasets.
- **Cultural value:** memes, artwork, names, community links and provenance, subject to rights and consent.
- **Technical value:** reusable metadata, open-source code, program integrations or public documentation.
- **Recovery value:** potentially recoverable account deposits, excess lamports, or assets controlled by an identifiable authority.
- **Community value:** a recoverable identity/community only where authority and consent can be established.

Keep value, evidence confidence, legal/rights status, authority and consent as separate dimensions. A high research score is not a claim that an asset is legally reusable or financially valuable.

## Solana rent-recovery lane

The revival investigator now performs a read-only estimate on the mint account and the largest token-account sample it already inspects:

1. Read account lamports and data size from RPC.
2. Ask the cluster for the current rent-exempt minimum for each observed account size; never hard-code a rent amount.
3. Calculate only the balance above that current minimum as a **potential excess**.
4. Separately flag zero-token-balance token accounts as possible close candidates.
5. Record account address, token authority, close authority, owning program, token amount, current minimum, gross potential excess and coverage limitations as evidence.

This is only a lead generator. The largest-account RPC sample is not a wallet-wide scan and cannot find every account. A close candidate requires zero token balance and the correct owner/close-authority signature. An excess-withdrawal candidate depends on support in the account's owning Token Program and the required authority signature. The new `WithdrawExcessLamports` instruction can move surplus above the current rent floor without closing an account, where supported. Mint closure is a different operation and requires the Token-2022 close-mint extension, zero supply and its close authority.

MEMECYCLE must never:
- request or store seed phrases/private keys;
- infer that a token account belongs to the user merely because it is associated with a token;
- burn tokens to make an account closable;
- close accounts, submit transactions, transfer SOL or take a fee without a separate, explicit product authorization and user signature;
- count the original rent deposit as guaranteed recoverable value;
- claim a third party's rent or assets as MEMECYCLE's property.

The future user flow is: scan connected wallet -> show each candidate and exact authority -> refresh live balances/minimums -> show gross estimate, network fee and any service fee -> explain close versus excess-withdrawal effects -> user selects destination -> wallet displays the transaction -> user signs -> verify the confirmed signature and actual amount. No action occurs on scan alone.

## AI role

The AI should not invent a "value" from a dead token label. It should assemble a dossier from referenced evidence and answer:

- What still exists, and where?
- What is retrievable now, and what is only a stale reference?
- Who appears to control the relevant authority, and how strong is that evidence?
- What reuse rights or consent are known, missing or restricted?
- What recovery route is technically possible, and what conditions block it?
- What is the confidence and what evidence would most improve it?

Deterministic parsers and scoring produce measurements. AI explains, connects and proposes uses, always with citations back to source records. Human review remains mandatory for rights, identity, consent, publication and any asset-recovery action.

## Acceptance gates for the next archive milestone

- At least two historical sources pass a reproducible sample download/query test.
- Every ingested row has a stable source locator, source revision, observation time and provenance.
- Duplicate source rows resolve to one canonical subject without losing provider-specific references.
- Missing or restricted source data is recorded as a data gap, not silently discarded.
- No bulk media mirroring occurs.
- Every rent estimate uses a live RPC rent minimum and clearly reports sample coverage.
- Unit tests cover zero balance, positive balance, excess above rent floor, missing rent response and authority-not-verified cases.
- A production smoke test remains read-only and creates evidence only; it must not construct or submit a transaction.


## Implemented reference pointers

The revival evidence manifest now stores canonical Solana Explorer links, DexScreener token/pair links, the launch transaction link when available, and exact-mint Hugging Face Dataset Viewer filter URLs for the four dataset configurations. The manifest also records the CC BY 4.0 attribution and explicitly marks the dataset lookup as `reference_only_not_fetched`. This keeps MEMECYCLE's database as a searchable index rather than a mirror of the dataset. The links are generated, not yet fetched; a later source-query pilot must validate actual row matches and capture the dataset revision before using provider fields as evidence.

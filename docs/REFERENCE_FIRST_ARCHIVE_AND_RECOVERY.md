# MEMECYCLE Reference-First Archive and Recovery Engine

## Product decision

MEMECYCLE will not mirror the whole Solana ledger or bulk-copy every abandoned project's media. It will maintain a searchable **reference graph**: canonical on-chain addresses, transaction signatures, source-record identifiers, metadata URIs, content hashes, provenance, rights/licence information, observation timestamps and coverage limits. Original data remains with its authoritative source whenever practical.

The database is the index and evidence ledger, not a duplicate of the internet.

## What a reference record should contain

The `mc_archive_references` table now uses a stable identity of `(network, subject_type, subject_address, source_id, external_record_id)` and retains:

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
3. **Hugging Face Pump.fun launch dataset:** `loopholetape/pumpfun-launches` is CC BY 4.0 and publishes `launches`, `launches_legacy`, `graduation_pools` and `features`. On 2026-11-05 the Hub API returned revision `00d98ac1eca7b5377798ac15b82d46db87109300`; the Dataset Viewer reported 1,562,689 `launches` rows, 859,208 `launches_legacy` rows, 4,702,805 `features` rows and 41,545 `graduation_pools` rows. `/rows` successfully returned bounded slices (maximum 100 rows). An exact-mint `/filter` request returned HTTP 500 with a provider-side authentication-check error, so production ingestion uses bounded `/rows` sampling rather than relying on `/filter`. MEMECYCLE samples evenly across 100 deterministic strata per config and stores only selected facts, content hashes, source revision and row locators; it does not mirror the dataset. Independently verify high-value claims against chain evidence.
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

## Implemented historical-source pilot

- A real `launches` row was retrieved from the Dataset Viewer `/rows` endpoint at `row_idx=0`, with the dataset revision and a SHA-256 content fingerprint recorded. The sample is `how come i never win` (`win`), mint `8pdHR6UEDUDbopDHdP3sMZ3ivD6WSCKSYHMEkxikys7e`, launch time 2026-09-27 00:00:02.844 UTC. Its `decoder_complete=0` and `features_basis=harness_sample` limitations were preserved.
- Independent Solana mainnet JSON-RPC returned the mint account and the launch transaction. The oldest returned mint signature was a successful mint-creation transaction at slot 450829364. The fee payer was a signer and matched the dataset's creator field. This verifies the launch attribution for that transaction only, not real-world identity or project ownership.
- The on-chain Token-2022 metadata URI returned HTTP 404. The original URI is retained as a missing reference; no metadata or artwork was copied.
- The mint account held 2,656,840 lamports, equal to the live rent-exempt minimum for its 395-byte size; no mint-account excess was identified in this sample.
- The sample token remains private and unverified. The dataset's `rugged=1` provider flag is not treated as proof of fraud or abandonment.

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

The revival evidence manifest now stores canonical Solana Explorer links, DexScreener token/pair links, the launch transaction link when available, and exact-mint Hugging Face Dataset Viewer filter URLs for the four dataset configurations. The manifest also records the CC BY 4.0 attribution and explicitly marks the dataset lookup as `reference_only_not_fetched`. This keeps MEMECYCLE's database as a searchable index rather than a mirror of the dataset. The source-query pilot has now retrieved one real row and independently corroborated its launch transaction. The daily stratified sampler is implemented on the working branch; after CI and deployment it will index bounded pages, retain selected facts and links, and leave all imported candidates private and unverified.


## AI dossier integration

The administrator-triggered AI dossier now includes the token's archive references, linked transaction references and latest value assessments in its evidence packet. Its output includes a dedicated reuse-and-recovery section with historical, research, cultural, technical, recovery and community findings, recommended second uses, candidate recovery leads, and explicit rights/consent/authority gates. The dossier remains on-demand and evidence-constrained; it does not initiate outreach, publish media, relaunch tokens or execute transactions. Evidence IDs are validated against the supplied manifest before the report is saved.

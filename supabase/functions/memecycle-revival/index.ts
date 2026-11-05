import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { scoreRevival } from "./scoring.js";
import { nextAttemptNumber, selectRevivalBatch } from "./queue-policy.ts";
import { aggregateNonPoolHolders } from "./holder-distribution.js";
import { assessRentRecovery } from "./rent-recovery.js";
import { buildArchiveReferences } from "./archive-references.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });
const VERSION = "memecycle-revival-0.4.0";
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" }
});
const asNumber = (v: unknown): number | null => v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);
const validMint = (v: unknown): v is string => typeof v === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);

function rpcEndpoint(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !(
    url.hostname === "mainnet.helius-rpc.com" ||
    url.hostname.endsWith(".helius-rpc.com") ||
    url.hostname === "api.mainnet-beta.solana.com"
  )) throw new Error("RPC endpoint host is not on the MEMECYCLE allowlist.");
  return url.href;
}
async function rpc(url: string, method: string, params: unknown[]) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "MEMECYCLE-revival/0.1" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(12000)
  });
  if (!r.ok) throw new Error(`RPC HTTP ${r.status}`);
  const payload = await r.json();
  if (payload.error) throw new Error(String(payload.error.message || "Solana RPC error"));
  return payload.result;
}
function mintInfo(account: any) {
  const parsed = account?.value?.data?.parsed?.info;
  if (!parsed || account?.value?.data?.program !== "spl-token" && account?.value?.data?.program !== "spl-token-2022") {
    throw new Error("Mint account was not returned in parsed SPL Token format.");
  }
  return parsed;
}
function extractCreator(tx: any) {
  if (!tx?.transaction?.message) return null;
  const instructions = [
    ...(tx.transaction.message.instructions || []),
    ...((tx.meta?.innerInstructions || []).flatMap((group: any) => group.instructions || []))
  ];
  const init = instructions.find((item: any) =>
    item?.parsed?.type === "initializeMint" || item?.parsed?.type === "initializeMint2"
  );
  if (!init) return null;
  const first = tx.transaction.message.accountKeys?.[0];
  const payer = typeof first === "string" ? first : first?.pubkey;
  return payer ? { wallet: payer, evidence: "fee_payer_of_transaction_containing_initializeMint", confidence: "candidate" } : null;
}
async function storeEvidence(mint: string, type: string, source: string, confidence: string, coverage: string, evidence: any, subject?: string | null) {
  const { error } = await db.from("mc_onchain_evidence").insert({
    mint, evidence_type: type, source, confidence, coverage, evidence, subject_address: subject || null, observed_at: new Date().toISOString()
  });
  if (error) throw error;
}
async function investigateToken(token: any, endpoint: string) {
  const mint = token.mint;
  const [mintAccount, largest, poolPair] = await Promise.all([
    rpc(endpoint, "getAccountInfo", [mint, { encoding: "jsonParsed", commitment: "confirmed" }]),
    rpc(endpoint, "getTokenLargestAccounts", [mint, { commitment: "confirmed" }]),
    token.primary_pair_address
      ? db.from("mc_token_pairs").select("pair_created_at,liquidity_usd,volume_24h_usd").eq("pair_address", token.primary_pair_address).maybeSingle()
      : Promise.resolve({ data: null, error: null })
  ]);
  if (poolPair.error) throw poolPair.error;
  const info = mintInfo(mintAccount);
  const supplyRaw = String(info.supply ?? "");
  const supply = asNumber(supplyRaw);
  const topAccounts = largest?.value ?? [];
  let owners: any[] = [];
  let accountRows: any[] = [];
  if (topAccounts.length) {
    const accountInfo = await rpc(endpoint, "getMultipleAccounts", [
      topAccounts.map((row: any) => row.address), { encoding: "jsonParsed", commitment: "confirmed" }
    ]);
    accountRows = (accountInfo?.value ?? []).map((account: any, i: number) => ({
      address: topAccounts[i]?.address,
      account
    }));
    owners = accountRows.map(({ address, account }) => ({
      account: address,
      owner: account?.data?.parsed?.info?.owner ?? null,
      amount: String(account?.data?.parsed?.info?.tokenAmount?.amount ?? "0")
    }));
  }
  // Compare observed lamports with the cluster's current rent floor. The RPC
  // sample is intentionally bounded to the mint and largest token accounts.
  const rentSizes = [...new Set([
    mintAccount?.value?.space ?? mintAccount?.value?.data?.space,
    ...accountRows.map((row: any) => row.account?.space ?? row.account?.data?.space)
  ].map(Number).filter((space) => Number.isSafeInteger(space) && space >= 0))];
  const rentPairs: Array<[string, string]> = await Promise.all(rentSizes.map(async (space) => {
    try {
      return [
        String(space),
        String(await rpc(endpoint, "getMinimumBalanceForRentExemption", [space]))
      ];
    } catch {
      // A rent RPC failure must not discard the rest of the research dossier.
      return [String(space), ""];
    }
  }));
  const rentMinimumBySpace = Object.fromEntries(rentPairs);
  const rentRecovery = assessRentRecovery({
    mintAddress: mint,
    mintAccount,
    tokenAccounts: accountRows as any[],
    rentMinimumBySpace
  });
  // Exclude the known primary DEX pool address from beneficial-holder concentration.
  // A pool's token reserve is market liquidity, not proof of a single person's ownership.
  const holderDistribution = aggregateNonPoolHolders(
    owners,
    supplyRaw,
    token.primary_pair_address ? [token.primary_pair_address] : []
  );
  const { holders, top20SupplyPct } = holderDistribution;

  let poolActivityAt: string | null = null;
  if (token.primary_pair_address) {
    const signatures = await rpc(endpoint, "getSignaturesForAddress", [token.primary_pair_address, { limit: 1, commitment: "confirmed" }]);
    const blockTime = signatures?.[0]?.blockTime;
    if (blockTime) poolActivityAt = new Date(Number(blockTime) * 1000).toISOString();
  }
  const mintSignatures = await rpc(endpoint, "getSignaturesForAddress", [mint, { limit: 1000, commitment: "confirmed" }]);
  let creatorCandidate: any = null;
  let creationHistoryComplete = false;
  if (Array.isArray(mintSignatures) && mintSignatures.length > 0 && mintSignatures.length < 1000) {
    creationHistoryComplete = true;
    const oldest = mintSignatures[mintSignatures.length - 1];
    if (oldest?.signature) {
      const tx = await rpc(endpoint, "getTransaction", [oldest.signature, { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 }]);
      creatorCandidate = extractCreator(tx);
    }
  }

  const source = "solana_rpc";
  const pumpfunMetadataUri = token.source_provenance?.pumpfun?.uri
    ?? token.source_provenance?.pumpfun?.metadata_uri
    ?? token.metadata_uri
    ?? null;
  const archiveReferences = buildArchiveReferences({
    mint,
    primaryPairAddress: token.primary_pair_address ?? null,
    metadataUri: pumpfunMetadataUri,
    launchSignature: mintSignatures?.[mintSignatures.length - 1]?.signature ?? null
  });
  await storeEvidence(mint, "supply", source, "observed", "Parsed mint account; supply is raw base units and decimals are recorded.", {
    supply_raw: supplyRaw, decimals: Number(info.decimals), initialized: Boolean(info.isInitialized), largest_account_count: topAccounts.length
  });
  await storeEvidence(mint, "mint_authority", source, "observed", "Authority field read from the parsed mint account at observation time.", {
    mint_authority: info.mintAuthority ?? null, revoked: info.mintAuthority == null
  }, info.mintAuthority);
  await storeEvidence(mint, "freeze_authority", source, "observed", "Freeze authority field read from the parsed mint account at observation time.", {
    freeze_authority: info.freezeAuthority ?? null, revoked: info.freezeAuthority == null
  }, info.freezeAuthority);
  await storeEvidence(mint, "holder_distribution", source, holderDistribution.includedAccountCount ? "partial" : "observed",
    "Largest token accounts returned by Solana RPC, grouped by parsed token owner. The known primary DEX pool address is excluded from beneficial-holder concentration. This is not a complete holder census and may still include custodians, burn or other program accounts.", {
      top_account_count: topAccounts.length,
      included_non_pool_token_account_count: holderDistribution.includedAccountCount,
      excluded_primary_pool_account_count: holderDistribution.excludedPoolAccountCount,
      invalid_account_amount_count: holderDistribution.invalidAccountCount,
      distinct_non_pool_owner_count: holderDistribution.distinctOwnerCount,
      top20_supply_pct: top20SupplyPct,
      largest_non_pool_accounts: holders.slice(0,20)
    });
  await storeEvidence(mint, "rent_recovery", source, "partial",
    "Read-only comparison of observed mint/largest-token-account lamports with getMinimumBalanceForRentExemption at the current cluster rent parameters. This is not a wallet-wide scan, authority verification, transaction quote or promise of recoverability.",
    rentRecovery);
  await storeEvidence(mint, "archive_references", "memecycle_reference_index", "observed",
    "External source locators and canonical on-chain links only. The referenced dataset rows and metadata payloads were not downloaded or copied.",
    archiveReferences);
  if (poolActivityAt) await storeEvidence(mint, "pool_activity", source, "partial",
    "Latest signature on the recorded primary DEX pool account only; this does not represent all token transfers, holders or community activity.", {
      pair_address: token.primary_pair_address, latest_signature_at: poolActivityAt
    }, token.primary_pair_address);
  if (creatorCandidate) await storeEvidence(mint, "creator_candidate", source, "partial",
    "Fee payer from the oldest available mint-account signature transaction containing initializeMint. Candidate attribution only; fee payer is not necessarily the project creator.", {
      ...creatorCandidate, mint_history_signatures_returned: mintSignatures.length, history_complete_under_1000: creationHistoryComplete
    }, creatorCandidate.wallet);

  const provenance = token.source_provenance || {};
  const pump = provenance.pumpfun;
  if (pump && (pump.bundle_supply_share != null || pump.buyers_first_10s != null)) {
    await storeEvidence(mint, "bundle_launch", "pumpdata.fun", "provider_reported",
      "Third-party Pump.fun launch feed fields; not an on-chain bundle reconstruction or signature-level proof.", {
        bundle_supply_share: pump.bundle_supply_share ?? null,
        buyers_first_10s: pump.buyers_first_10s ?? null,
        deployer_launches_before: pump.deployer_launches_before ?? null,
        deployer_graduations_before: pump.deployer_graduations_before ?? null,
        provider: "pumpdata.fun"
      });
  }

  const pairCreatedAt = poolPair.data?.pair_created_at ? new Date(poolPair.data.pair_created_at).getTime() : null;
  const pairAgeDays = pairCreatedAt ? Math.max(0, (Date.now() - pairCreatedAt) / 86400000) : null;
  const poolActivityAgeDays = poolActivityAt ? Math.max(0, (Date.now() - new Date(poolActivityAt).getTime()) / 86400000) : null;
  const jupiter = provenance.jupiter || {};
  const identity = await db.from("mc_project_identities").select("identity_status,authority_status,consent_status").eq("mint", mint).maybeSingle();
  if (identity.error) throw identity.error;
  const scores = scoreRevival({
    pairAgeDays, poolActivityAgeDays,
    liquidityUsd: asNumber(token.liquidity_usd), volume24hUsd: asNumber(token.volume_24h_usd),
    mintAuthorityActive: info.mintAuthority != null, freezeAuthorityActive: info.freezeAuthority != null,
    top20SupplyPct, jupiterOrganicScore: asNumber(jupiter.organic_score),
    jupiterSuspicious: typeof jupiter.audit?.isSus === "boolean" ? jupiter.audit.isSus : null,
    holderCount: asNumber(token.holder_count), identityStatus: identity.data?.identity_status || "unverified",
    authorityStatus: identity.data?.authority_status || "unknown", consentStatus: identity.data?.consent_status || "not_requested"
  });
  const evidenceManifest = {
    providers: ["Solana JSON-RPC", ...(pump ? ["pumpdata.fun"] : []), ...(Object.keys(jupiter).length ? ["Jupiter Tokens API v2"] : [])],
    mint, observed_at: new Date().toISOString(), mint_authority: info.mintAuthority ?? null,
    freeze_authority: info.freezeAuthority ?? null, supply_raw: supplyRaw, decimals: Number(info.decimals),
    top20_supply_pct: top20SupplyPct, top20_scope: "largest non-pool token accounts grouped by parsed owner; known primary DEX pool address excluded; not a full beneficial-owner distribution",
    rent_recovery: rentRecovery,
    archive_references: archiveReferences,
    excluded_primary_pool_account_count: holderDistribution.excludedPoolAccountCount,
    included_non_pool_token_account_count: holderDistribution.includedAccountCount,
    pool_activity_at: poolActivityAt, pair_age_days: pairAgeDays, pool_activity_age_days: poolActivityAgeDays,
    creator_candidate: creatorCandidate, pumpfun_provider_evidence: pump ?? null,
    jupiter_provider_evidence: jupiter,
    limitations: [
      "This investigation is not a complete holder census or full transaction-history reconstruction.",
      "Pool-account inactivity does not prove token or community inactivity.",
      "A fee payer is only a candidate creator attribution, not verified project ownership.",
      "Third-party bundle statistics are provider-reported, not independently reconstructed.",
      "Wallet signature verification proves wallet control only; project authority and relaunch consent require independent verification."
    ]
  };
  const { data: assessment, error: assessmentError } = await db.from("mc_revival_assessments").insert({
    mint, assessor_version: VERSION,
    dormancy_score: scores.dormancyScore, revival_viability_score: scores.viabilityScore,
    authority_clarity_score: scores.authorityScore, community_signal_score: scores.communityScore,
    data_confidence_score: scores.dataConfidenceScore, risk_score: scores.riskScore,
    opportunity_score: scores.opportunityScore, assessment_status: scores.assessmentStatus,
    evidence_manifest: evidenceManifest, limitations: evidenceManifest.limitations,
    rationale: "Deterministic evidence-weighted research triage. This is not an abandonment finding, investment recommendation, or authorisation to relaunch."
  }).select("id,assessment_status,opportunity_score").single();
  if (assessmentError) throw assessmentError;
  return { mint, assessment_id: assessment.id, ...scores, creator_candidate_found: Boolean(creatorCandidate), top20_supply_pct: top20SupplyPct };
}

async function run(limit: number, suppliedRpc: string | null) {
  const endpointValue = suppliedRpc || Deno.env.get("HELIUS_RPC") || Deno.env.get("SOLANA_RPC_URL") || "";
  if (!endpointValue) throw new Error("No Helius/Solana RPC endpoint was supplied to the revival investigator.");
  const endpoint = rpcEndpoint(endpointValue);
  const { data: runRow, error: runError } = await db.from("mc_ingestion_runs")
    .insert({ run_type: "revival_intelligence", status: "running", source_provider: "solana-rpc+jupiter+pumpdata" })
    .select("id").single();
  if (runError) throw runError;
  const { data: tokens, error: tokenError } = await db.from("mc_tokens")
    .select("mint,name,symbol,primary_pair_address,liquidity_usd,volume_24h_usd,holder_count,source_provenance,first_seen_at")
    .order("first_seen_at", { ascending: true }).limit(500);
  if (tokenError) throw tokenError;
  const [{ data: assessments, error: assessmentReadError }, { data: jobs, error: jobReadError }] = await Promise.all([
    db.from("mc_revival_assessments").select("mint,assessed_at").order("assessed_at", { ascending: false }).limit(5000),
    db.from("mc_research_jobs").select("mint,status,attempts,max_attempts,updated_at,locked_at,available_at")
      .eq("job_type", "onchain_investigation").order("updated_at", { ascending: false }).limit(5000)
  ]);
  if (assessmentReadError) throw assessmentReadError;
  if (jobReadError) throw jobReadError;

  const queueTokens = (tokens || []).map((row: any) => {
    const provenance = row.source_provenance || {};
    const bitqueryCreatedAt = provenance.bitquery_launch?.created_at;
    const pumpCreatedAt = provenance.pumpfun?.created ?? provenance.pumpfun?.launch_at ?? null;
    let launchAt: string | null = null;
    if (typeof bitqueryCreatedAt === "string" && Number.isFinite(Date.parse(bitqueryCreatedAt))) {
      launchAt = new Date(bitqueryCreatedAt).toISOString();
    } else if (pumpCreatedAt != null) {
      const numeric = Number(pumpCreatedAt);
      if (Number.isFinite(numeric)) {
        launchAt = new Date(numeric > 1e12 ? numeric : numeric * 1000).toISOString();
      } else if (typeof pumpCreatedAt === "string" && Number.isFinite(Date.parse(pumpCreatedAt))) {
        launchAt = new Date(pumpCreatedAt).toISOString();
      }
    }
    return { ...row, research_priority_at: launchAt || row.first_seen_at || null };
  });
  const { batch, latestJobByMint } = selectRevivalBatch({
    tokens: queueTokens, assessments: assessments || [], jobs: jobs || [], nowMs: Date.now(), limit
  });
  const results: any[] = [];
  const errors: any[] = [];
  for (const token of batch) {
    const priorJob = latestJobByMint.get(token.mint);
    const attemptNumber = nextAttemptNumber(priorJob);
    const { data: job, error: jobError } = await db.from("mc_research_jobs").insert({
      mint: token.mint, job_type: "onchain_investigation", status: "running", priority: 60,
      attempts: attemptNumber, max_attempts: 3, locked_at: new Date().toISOString(), locked_by: VERSION
    }).select("id").single();
    if (jobError) { errors.push({ mint: token.mint, error: jobError.message }); continue; }
    try {
      const result = await investigateToken(token, endpoint);
      results.push(result);
      await db.from("mc_research_jobs").update({ status: "succeeded", result, finished_at: new Date().toISOString(), updated_at: new Date().toISOString(), locked_at: null, locked_by: null }).eq("id", job.id);
    } catch (error) {
      const message = String(error).slice(0, 400);
      errors.push({ mint: token.mint, error: message });
      await db.from("mc_research_jobs").update({ status: "partial", error_message: message, result: { partial: true }, updated_at: new Date().toISOString(), locked_at: null, locked_by: null }).eq("id", job.id);
      await db.from("mc_audit_events").insert({ event_type: "revival_investigation_error", actor: VERSION, subject_ref: token.mint, details: { error: message } });
    }
  }
  const status = errors.length ? (results.length ? "partial" : "failed") : "succeeded";
  const summary = {
    worker_version: VERSION, selected: batch.length, completed: results.length, errors: errors.length,
    rpc_calls_budget: "maximum 3 tokens per run; per-token calls are bounded",
    assessment_cooldown_days: 90, retry_backoff_hours: 6, maximum_attempts_per_token: 3,
    no_publication: true, no_outreach: true, no_wallet_actions: true
  };
  await db.from("mc_ingestion_runs").update({
    status, candidates_seen: tokens?.length ?? 0, tokens_upserted: results.length,
    snapshots_inserted: 0, classifications_written: results.length, error_count: errors.length,
    summary: { ...summary, results, error_samples: errors.slice(0, 5) }, finished_at: new Date().toISOString()
  }).eq("id", runRow.id);
  await db.from("mc_audit_events").insert({ event_type: "revival_investigation_completed", actor: VERSION, subject_ref: runRow.id, details: { status, ...summary } });
  return { run_id: runRow.id, status, ...summary, results, errors };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({ error: "POST required" }, 405);
  if (!KEY) return response({ error: "Worker database credentials are missing." }, 503);
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  let claims: any = null;
  try {
    const part = token.split(".")[1];
    if (part) {
      const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
      claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    }
  } catch { /* invalid token */ }
  if (claims?.role !== "service_role") return response({ error: "Unauthorized" }, 401);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "health") {
      const { data, error } = await db.from("mc_ingestion_runs").select("id,status,started_at,finished_at,summary")
        .eq("run_type", "revival_intelligence").order("started_at", { ascending: false }).limit(5);
      if (error) throw error;
      return response({ ok: true, version: VERSION, recent_runs: data || [] });
    }
    if (body.action && body.action !== "investigate" && body.action !== "run") return response({ error: "Unknown action" }, 400);
    return response(await run(Number(body.limit ?? 3), typeof body.rpc_url === "string" ? body.rpc_url : null));
  } catch (error) {
    return response({ error: String(error).slice(0, 500), version: VERSION }, 500);
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import bs58 from "npm:bs58@6.0.0";
import nacl from "npm:tweetnacl@1.0.3";
import { assessWalletTokenAccounts } from "./account-assessment.js";

const URL = Deno.env.get("SUPABASE_URL") ?? "";
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RPC_URL = Deno.env.get("HELIUS_RPC") ?? Deno.env.get("SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com";
const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const MAX_ACCOUNTS = 2500;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};
const out = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: cors });
const validWallet = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  try { return bs58.decode(value).length === 32; } catch { return false; }
};
function solString(raw: string) {
  const value = BigInt(raw), whole = value / 1_000_000_000n, fraction = (value % 1_000_000_000n).toString().padStart(9, "0");
  return whole.toString() + "." + fraction;
}
async function rpc(method: string, params: unknown[]) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("Solana RPC HTTP " + response.status);
  const payload = await response.json();
  if (payload?.error) throw new Error("Solana RPC " + String(payload.error.message ?? "request failed").slice(0, 200));
  return payload.result;
}
async function currentUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  const { data, error } = await db.auth.getUser(authorization.slice(7));
  if (error || !data.user) return null;
  return data.user;
}
async function issueChallenge(userId: string, wallet: string) {
  const now = new Date(), expires = new Date(now.getTime() + 5 * 60_000), nonce = crypto.randomUUID() + crypto.randomUUID();
  const origin = "https://memecycle.vercel.app";
  const message = [
    "MEMECYCLE READ-ONLY WALLET RECOVERY SCAN",
    "Origin: " + origin,
    "User: " + userId,
    "Wallet: " + wallet,
    "Nonce: " + nonce,
    "Issued At: " + now.toISOString(),
    "Expires At: " + expires.toISOString(),
    "Purpose: prove control of this wallet for a read-only Solana token-account rent scan.",
    "This signature does not authorize a transaction, account closure, token burn, SOL transfer or fee."
  ].join("\n");
  const { data, error } = await db.from("mc_wallet_scan_challenges").insert({
    user_id: userId, wallet_address: wallet, nonce, message, expires_at: expires.toISOString()
  }).select("id,expires_at").single();
  if (error) throw error;
  return { challenge_id: data.id, wallet_address: wallet, message, expires_at: data.expires_at, signature_type: "message_only_no_transaction" };
}
async function verifyChallenge(userId: string, wallet: string, challengeId: string, signature: string) {
  const { data: challenge, error } = await db.from("mc_wallet_scan_challenges")
    .select("id,wallet_address,message,expires_at,used_at")
    .eq("id", challengeId).eq("user_id", userId).eq("wallet_address", wallet).is("used_at", null).maybeSingle();
  if (error) throw error;
  if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now()) throw new Error("Challenge is missing, expired or already used. Request a new signature message.");
  let signatureBytes: Uint8Array;
  try { signatureBytes = bs58.decode(signature); } catch { throw new Error("Wallet signature is not valid base58."); }
  if (signatureBytes.length !== 64) throw new Error("Wallet signature must be 64 bytes.");
  const publicKey = bs58.decode(wallet);
  const messageBytes = new TextEncoder().encode(challenge.message);
  if (!nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey)) throw new Error("Wallet signature did not verify for this account and challenge.");
  const now = new Date().toISOString();
  const { data: used, error: useError } = await db.from("mc_wallet_scan_challenges")
    .update({ used_at: now }).eq("id", challengeId).eq("user_id", userId).is("used_at", null).gt("expires_at", now)
    .select("id").maybeSingle();
  if (useError) throw useError;
  if (!used) throw new Error("Challenge was already consumed. Request a new signature message.");
}
async function scanWallet(userId: string, wallet: string) {
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const { count, error: rateError } = await db.from("mc_wallet_recovery_scans")
    .select("id", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", since);
  if (rateError) throw rateError;
  if ((count ?? 0) > 0) throw new Error("A wallet scan was run recently. Please wait five minutes before scanning again.");

  const { data: scan, error: scanError } = await db.from("mc_wallet_recovery_scans").insert({
    user_id: userId, wallet_address: wallet, network: "solana-mainnet", status: "running",
    limitations: ["Read-only scan. No transaction is constructed, signed or submitted."]
  }).select("id").single();
  if (scanError) throw scanError;

  const errors: string[] = [], accountRows: any[] = [];
  for (const programId of [TOKEN_PROGRAM, TOKEN_2022_PROGRAM]) {
    try {
      const result = await rpc("getTokenAccountsByOwner", [
        wallet, { programId }, { encoding: "jsonParsed", commitment: "confirmed" }
      ]);
      for (const entry of result?.value ?? []) accountRows.push({ ...entry, programId });
    } catch (error) {
      errors.push((programId === TOKEN_PROGRAM ? "Legacy Token Program: " : "Token-2022: ") + String(error).slice(0, 180));
    }
  }
  if (accountRows.length === 0 && errors.length === 2) {
    await db.from("mc_wallet_recovery_scans").update({
      status: "failed", finished_at: new Date().toISOString(), limitations: errors
    }).eq("id", scan.id);
    throw new Error("Both Solana token-account queries failed: " + errors.join(" | "));
  }

  const truncated = accountRows.length > MAX_ACCOUNTS;
  const sampled = accountRows.slice(0, MAX_ACCOUNTS);
  const sizes = [...new Set(sampled.map((entry) => Number(entry.account?.space)).filter((space) => Number.isSafeInteger(space) && space >= 0))];
  const rentPairs = await Promise.all(sizes.map(async (space) => {
    try { return [String(space), String(await rpc("getMinimumBalanceForRentExemption", [space, { commitment: "confirmed" }]))] as [string, string]; }
    catch (error) { errors.push("Rent minimum lookup for " + space + " bytes failed: " + String(error).slice(0, 100)); return [String(space), ""] as [string, string]; }
  }));
  const assessment = assessWalletTokenAccounts(sampled, Object.fromEntries(rentPairs), wallet);
  const limitations = [
    "Scans SPL Token and Token-2022 accounts owned by the signed wallet only; it does not scan arbitrary program accounts, mint authorities or every possible rent deposit.",
    "Token-2022 extension and account-specific constraints require review before any close or withdrawal transaction.",
    "Potential amounts are gross, before network fees, and can change with account balances or rent parameters.",
    "Zero-balance close candidates are separate from excess-lamport withdrawals; closing destroys the token account.",
    "No transaction was built, signed or submitted."
  ];
  if (errors.length) limitations.push(...errors);
  if (truncated) limitations.push("RPC returned more than " + MAX_ACCOUNTS + " token accounts; only the first " + MAX_ACCOUNTS + " were assessed.");
  if (assessment.missingRentCount) limitations.push(assessment.missingRentCount + " accounts lacked valid size, balance or rent-minimum data and were excluded.");

  const candidateRows = assessment.candidates.map((item: any) => ({
    scan_id: scan.id, account_address: item.accountAddress, token_program_id: item.tokenProgramId,
    mint_address: item.mintAddress, token_amount_raw: item.tokenAmountRaw, lamports_raw: item.lamportsRaw,
    rent_minimum_lamports_raw: item.rentMinimumLamportsRaw,
    potential_excess_lamports_raw: item.potentialExcessLamportsRaw,
    potential_close_lamports_raw: item.potentialCloseLamportsRaw,
    owner_address: item.ownerAddress, close_authority: item.closeAuthority,
    can_withdraw_excess: item.canWithdrawExcess, can_close_zero_balance: item.canCloseZeroBalance,
    review_required: item.reviewRequired, limitations: item.limitations
  }));
  if (candidateRows.length) {
    const { error } = await db.from("mc_wallet_recovery_candidates").upsert(candidateRows, { onConflict: "scan_id,account_address" });
    if (error) {
      await db.from("mc_wallet_recovery_scans").update({ status: "failed", finished_at: new Date().toISOString(), limitations: [...limitations, error.message] }).eq("id", scan.id);
      throw error;
    }
  }

  const status = errors.length || truncated || assessment.missingRentCount ? "partial" : "completed";
  const { error: updateError } = await db.from("mc_wallet_recovery_scans").update({
    status, scanned_account_count: sampled.length,
    potential_excess_lamports: assessment.potentialExcessLamportsRaw,
    potential_excess_sol: solString(assessment.potentialExcessLamportsRaw),
    potential_close_lamports: assessment.potentialCloseLamportsRaw,
    zero_balance_close_candidates: assessment.candidates.filter((x: any) => x.canCloseZeroBalance).length,
    limitations, finished_at: new Date().toISOString()
  }).eq("id", scan.id);
  if (updateError) throw updateError;

  return {
    scan_id: scan.id, wallet_address: wallet, status, scanned_account_count: sampled.length,
    potential_excess_lamports: assessment.potentialExcessLamportsRaw,
    potential_excess_sol: solString(assessment.potentialExcessLamportsRaw),
    potential_close_lamports: assessment.potentialCloseLamportsRaw,
    potential_close_sol: solString(assessment.potentialCloseLamportsRaw),
    zero_balance_close_candidates: assessment.candidates.filter((x: any) => x.canCloseZeroBalance).length,
    candidate_count: assessment.candidateCount, candidates: assessment.candidates, limitations
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return out({ error: "POST required" }, 405);
  if (!URL || !KEY) return out({ error: "Wallet recovery scanner is not configured." }, 503);
  const user = await currentUser(request);
  if (!user) return out({ error: "Sign in before scanning a wallet." }, 401);
  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (!validWallet(body?.wallet_address)) return out({ error: "Provide a valid Solana wallet address." }, 400);
  try {
    if (action === "challenge") return out(await issueChallenge(user.id, body.wallet_address));
    if (action !== "scan") return out({ error: "Choose challenge or scan." }, 400);
    if (typeof body.challenge_id !== "string" || typeof body.signature !== "string") return out({ error: "A challenge ID and wallet message signature are required." }, 400);
    await verifyChallenge(user.id, body.wallet_address, body.challenge_id, body.signature);
    return out(await scanWallet(user.id, body.wallet_address));
  } catch (error) {
    const message = String(error).slice(0, 500);
    const status = /recently|wait five minutes/i.test(message) ? 429 : /signature|challenge|expired|consumed/i.test(message) ? 401 : 500;
    return out({ error: message }, status);
  }
});

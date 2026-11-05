import test from "node:test";
import assert from "node:assert/strict";
import { assessWalletTokenAccounts } from "../supabase/functions/memecycle-wallet-recovery/account-assessment.js";

const wallet = "11111111111111111111111111111111";
const token2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const legacy = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

test("only offers Token-2022 excess above the current rent floor", () => {
  const result = assessWalletTokenAccounts([
    { pubkey: "A", programId: token2022, account: { lamports: 3000000, space: 170, data: { parsed: { info: { owner: wallet, mint: "MintA", tokenAmount: { amount: "5" }, extensions: [{ extension: "immutableOwner" }] } } } } },
    { pubkey: "B", programId: legacy, account: { lamports: 3000000, space: 165, data: { parsed: { info: { owner: wallet, mint: "MintB", tokenAmount: { amount: "5" } } } } } }
  ], { "170": "2000000", "165": "2000000" }, wallet);
  assert.equal(result.potentialExcessLamportsRaw, "1000000");
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].canWithdrawExcess, true);
  assert.equal(result.candidates[0].reviewRequired, true);
});

test("zero-balance accounts are close candidates only when wallet has close authority", () => {
  const result = assessWalletTokenAccounts([
    { pubkey: "Closeable", programId: legacy, account: { lamports: 2000000, space: 165, data: { parsed: { info: { owner: wallet, mint: "MintA", tokenAmount: { amount: "0" } } } } } },
    { pubkey: "OtherAuthority", programId: legacy, account: { lamports: 2000000, space: 165, data: { parsed: { info: { owner: wallet, closeAuthority: "OtherWallet", mint: "MintB", tokenAmount: { amount: "0" } } } } } }
  ], { "165": "2000000" }, wallet);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].canCloseZeroBalance, true);
  assert.equal(result.potentialCloseLamportsRaw, "2000000");
});

test("does not offer native wrapped SOL or accounts with missing rent data", () => {
  const result = assessWalletTokenAccounts([
    { pubkey: "Native", programId: token2022, account: { lamports: 3000000, space: 170, data: { parsed: { info: { owner: wallet, isNative: true, tokenAmount: { amount: "0" } } } } } },
    { pubkey: "Unknown", programId: token2022, account: { lamports: 3000000, space: 999, data: { parsed: { info: { owner: wallet, tokenAmount: { amount: "1" } } } } } }
  ], { "170": "2000000" }, wallet);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.missingRentCount, 1);
});

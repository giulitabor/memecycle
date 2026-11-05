import test from "node:test";
import assert from "node:assert/strict";
import { assessRentRecovery } from "../supabase/functions/memecycle-revival/rent-recovery.js";

test("reports only lamports above the current rent floor", () => {
  const result = assessRentRecovery({
    mintAddress: "Mint",
    mintAccount: { value: { lamports: 2_000_000, space: 82, owner: "TokenProgram" } },
    rentMinimumBySpace: { "82": "1000000", "165": "2000000" }
  });
  assert.equal(result.mint.potential_excess_lamports_raw, "1000000");
  assert.equal(result.total_potential_excess_lamports_raw, "1000000");
  assert.equal(result.mint.transaction_sent, false);
});

test("separates zero-balance close candidates from excess withdrawals", () => {
  const result = assessRentRecovery({
    mintAddress: "Mint",
    tokenAccounts: [
      { address: "Empty", account: { lamports: 3_000_000, space: 165, owner: "TokenProgram", data: { parsed: { info: { owner: "WalletA", tokenAmount: { amount: "0" } } } } } },
      { address: "Held", account: { lamports: 2_000_000, space: 165, owner: "TokenProgram", data: { parsed: { info: { owner: "WalletB", tokenAmount: { amount: "5" } } } } } }
    ],
    rentMinimumBySpace: { "165": "2000000" }
  });
  assert.equal(result.token_accounts[0].potential_close_candidate, true);
  assert.equal(result.token_accounts[0].potential_excess_lamports_raw, "1000000");
  assert.equal(result.token_accounts[1].potential_close_candidate, false);
  assert.equal(result.token_accounts[1].potential_excess_withdrawal_candidate, false);
});

test("missing rent data stays unknown rather than becoming zero recovery", () => {
  const result = assessRentRecovery({
    mintAddress: "Mint",
    mintAccount: { value: { lamports: 900000, space: 82, owner: "TokenProgram" } }
  });
  assert.equal(result.mint.potential_excess_lamports_raw, null);
  assert.equal(result.total_potential_excess_lamports_raw, "0");
});

import test from "node:test";
import assert from "node:assert/strict";
import { aggregateNonPoolHolders } from "../supabase/functions/memecycle-revival/holder-distribution.js";

test("excludes the known primary DEX pool owner from holder concentration", () => {
  const result = aggregateNonPoolHolders([
    { account: "pool-token-account", owner: "primary-pool", amount: "900" },
    { account: "holder-token-account", owner: "holder-a", amount: "100" }
  ], "1000", ["primary-pool"]);

  assert.equal(result.excludedPoolAccountCount, 1);
  assert.equal(result.includedAccountCount, 1);
  assert.equal(result.top20SupplyPct, 10);
  assert.deepEqual(result.holders.map((holder) => holder.owner), ["holder-a"]);
});

test("excludes an account address when parsed owner is unavailable", () => {
  const result = aggregateNonPoolHolders([
    { account: "primary-pool", owner: null, amount: "1000" }
  ], "1000", ["primary-pool"]);

  assert.equal(result.excludedPoolAccountCount, 1);
  assert.equal(result.top20SupplyPct, null);
  assert.equal(result.distinctOwnerCount, 0);
});

test("aggregates multiple token accounts for the same owner", () => {
  const result = aggregateNonPoolHolders([
    { account: "holder-a-1", owner: "holder-a", amount: "200" },
    { account: "holder-a-2", owner: "holder-a", amount: "300" },
    { account: "holder-b-1", owner: "holder-b", amount: "100" }
  ], "1000");

  assert.equal(result.distinctOwnerCount, 2);
  assert.equal(result.holders[0].owner, "holder-a");
  assert.equal(result.holders[0].amount, "500");
  assert.equal(result.top20SupplyPct, 60);
});

test("keeps holder percentage unknown when supply is invalid or zero", () => {
  for (const supply of ["", "0", "not-a-number"]) {
    const result = aggregateNonPoolHolders([
      { account: "holder-a", owner: "holder-a", amount: "100" }
    ], supply);
    assert.equal(result.top20SupplyPct, null);
    assert.equal(result.holders[0].supply_pct, null);
  }
});

test("does not turn a pool-only sample into a 100 percent holder concentration", () => {
  const result = aggregateNonPoolHolders([
    { account: "pool-token-account", owner: "primary-pool", amount: "1000000" }
  ], "1000000", ["primary-pool"]);

  assert.equal(result.top20SupplyPct, null);
  assert.equal(result.holders.length, 0);
});

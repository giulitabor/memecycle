/**
 * Aggregate the largest token accounts into owner-level balances while excluding
 * explicitly identified infrastructure addresses (currently the primary DEX pool).
 *
 * This deliberately does not claim a complete beneficial-owner census: Solana's
 * getTokenLargestAccounts returns only a bounded top-account sample.
 */
export function aggregateNonPoolHolders(owners, supplyRaw, excludedAddresses = []) {
  const excluded = new Set(
    excludedAddresses.filter((value) => typeof value === "string" && value.length > 0)
  );
  const grouped = new Map();
  let includedAccountCount = 0;
  let excludedPoolAccountCount = 0;
  let invalidAccountCount = 0;

  for (const row of owners || []) {
    const account = typeof row?.account === "string" ? row.account : null;
    const owner = typeof row?.owner === "string" && row.owner.length > 0
      ? row.owner
      : account;
    if (!owner) {
      invalidAccountCount += 1;
      continue;
    }
    if (excluded.has(account) || excluded.has(owner)) {
      excludedPoolAccountCount += 1;
      continue;
    }
    const amountText = String(row?.amount ?? "");
    if (!/^\\d+$/.test(amountText)) {
      invalidAccountCount += 1;
      continue;
    }
    grouped.set(owner, (grouped.get(owner) || 0n) + BigInt(amountText));
    includedAccountCount += 1;
  }

  const supplyText = String(supplyRaw ?? "");
  const validSupply = /^\\d+$/.test(supplyText) && BigInt(supplyText) > 0n;
  const supply = validSupply ? BigInt(supplyText) : null;
  const holders = [...grouped.entries()]
    .map(([owner, amount]) => ({
      owner,
      amount: amount.toString(),
      supply_pct: supply ? Number(amount * 1000000n / supply) / 10000 : null
    }))
    .sort((a, b) => {
      const left = BigInt(a.amount);
      const right = BigInt(b.amount);
      return left === right ? 0 : left > right ? -1 : 1;
    });

  let sampledNonPoolRaw = 0n;
  for (const holder of holders) sampledNonPoolRaw += BigInt(holder.amount);

  return {
    holders,
    top20SupplyPct: supply && holders.length
      ? Number(sampledNonPoolRaw * 1000000n / supply) / 10000
      : null,
    includedAccountCount,
    excludedPoolAccountCount,
    invalidAccountCount,
    distinctOwnerCount: grouped.size
  };
}

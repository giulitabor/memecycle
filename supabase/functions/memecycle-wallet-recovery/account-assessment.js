const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

function uint(value) {
  if (typeof value === "number" && !Number.isSafeInteger(value)) return null;
  const raw = String(value ?? "");
  return /^\d+$/.test(raw) ? BigInt(raw) : null;
}

export function assessWalletTokenAccounts(entries = [], rentMinimumBySpace = {}, walletAddress) {
  const candidates = [];
  let potentialExcess = 0n;
  let potentialClose = 0n;
  let missingRentCount = 0;

  for (const entry of entries) {
    const account = entry?.account ?? {};
    const info = account?.data?.parsed?.info ?? {};
    const amount = uint(info?.tokenAmount?.amount);
    const lamports = uint(account?.lamports);
    const space = Number(account?.space);
    const minimum = Number.isSafeInteger(space) && space >= 0
      ? uint(rentMinimumBySpace[String(space)])
      : null;
    if (amount === null || lamports === null || minimum === null) {
      missingRentCount++;
      continue;
    }

    const excess = lamports > minimum ? lamports - minimum : 0n;
    const ownerMatches = info?.owner === walletAddress;
    const closeAuthority = info?.closeAuthority ?? null;
    const isNative = info?.isNative === true;
    const isToken2022 = entry?.programId === TOKEN_2022_PROGRAM;
    const extensions = Array.isArray(info?.extensions) ? info.extensions : [];
    const canWithdrawExcess = isToken2022 && !isNative && ownerMatches && excess > 0n;
    const canCloseZeroBalance = amount === 0n && !isNative && ownerMatches &&
      (!closeAuthority || closeAuthority === walletAddress);
    if (!canWithdrawExcess && !canCloseZeroBalance) continue;

    const closeLamports = canCloseZeroBalance ? lamports : 0n;
    if (canWithdrawExcess) potentialExcess += excess;
    if (canCloseZeroBalance) potentialClose += closeLamports;

    const limitations = [
      "Estimate uses one RPC observation and the current rent-exempt minimum; balance and minimum may change.",
      "Gross amount excludes network fees and is not a guarantee that a transaction will succeed.",
      "No transaction is built, signed or submitted."
    ];
    if (isToken2022 || extensions.length) limitations.push("Token-2022 extensions or account-specific constraints require transaction-level review.");
    if (isNative) limitations.push("Native wrapped-SOL accounts are not offered as candidates by this scanner.");

    candidates.push({
      accountAddress: entry.pubkey,
      tokenProgramId: entry.programId,
      mintAddress: info?.mint ?? null,
      tokenAmountRaw: amount.toString(),
      lamportsRaw: lamports.toString(),
      rentMinimumLamportsRaw: minimum.toString(),
      potentialExcessLamportsRaw: canWithdrawExcess ? excess.toString() : null,
      potentialCloseLamportsRaw: canCloseZeroBalance ? closeLamports.toString() : null,
      ownerAddress: info?.owner ?? null,
      closeAuthority,
      canWithdrawExcess,
      canCloseZeroBalance,
      reviewRequired: isToken2022 || extensions.length > 0,
      limitations
    });
  }

  candidates.sort((a, b) => {
    const av = BigInt(a.potentialExcessLamportsRaw ?? "0") + BigInt(a.potentialCloseLamportsRaw ?? "0");
    const bv = BigInt(b.potentialExcessLamportsRaw ?? "0") + BigInt(b.potentialCloseLamportsRaw ?? "0");
    return av === bv ? 0 : av > bv ? -1 : 1;
  });

  return {
    scannedAccountCount: entries.length,
    candidateCount: candidates.length,
    missingRentCount,
    potentialExcessLamportsRaw: potentialExcess.toString(),
    potentialCloseLamportsRaw: potentialClose.toString(),
    candidates
  };
}

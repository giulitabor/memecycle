/**
 * Read-only estimate of SOL that may be recoverable from inspected token accounts.
 * This does not prove instruction support, signing authority, ownership, or consent.
 */
const UINT = /^\d+$/;

function validUInt(value) {
  return UINT.test(String(value ?? ""));
}

export function assessRentRecovery({ mintAddress, mintAccount, tokenAccounts = [], rentMinimumBySpace = {} }) {
  const inspect = (address, account, kind, parsedInfo = {}) => {
    const space = Number(account?.space ?? account?.data?.space);
    const lamports = String(account?.lamports ?? "");
    const minimum = Number.isSafeInteger(space) && space >= 0
      ? String(rentMinimumBySpace[String(space)] ?? "")
      : "";
    const valid = validUInt(lamports) && validUInt(minimum);
    const balance = valid ? BigInt(lamports) : 0n;
    const floor = valid ? BigInt(minimum) : 0n;
    const excess = valid && balance > floor ? balance - floor : 0n;
    const amount = kind === "token_account"
      ? String(parsedInfo?.tokenAmount?.amount ?? "")
      : null;
    const zeroBalance = kind === "token_account" && amount === "0";
    return {
      address,
      account_kind: kind,
      owner_program_id: account?.owner ?? null,
      data_size_bytes: Number.isSafeInteger(space) && space >= 0 ? space : null,
      lamports_raw: validUInt(lamports) ? lamports : null,
      current_rent_exempt_minimum_lamports_raw: validUInt(minimum) ? minimum : null,
      potential_excess_lamports_raw: valid ? excess.toString() : null,
      token_authority: parsedInfo?.owner ?? null,
      close_authority: parsedInfo?.closeAuthority ?? null,
      token_amount_raw: amount,
      zero_token_balance: zeroBalance,
      potential_close_candidate: zeroBalance,
      potential_excess_withdrawal_candidate: valid && excess > 0n,
      authority_verified: false,
      transaction_built: false,
      transaction_sent: false,
      limitations: [
        "Read-only estimate from one RPC observation; balances and rent parameters can change.",
        "Potential excess does not prove the owning program currently supports WithdrawExcessLamports.",
        "A candidate does not prove the required authority can sign or that the user consents.",
        "Closing a token account destroys that account; only a zero-balance account may be considered, subject to authority and extension checks."
      ]
    };
  };

  const mint = mintAccount?.value
    ? inspect(mintAddress, mintAccount.value, "mint", mintAccount.value?.data?.parsed?.info ?? {})
    : null;
  const accounts = tokenAccounts.map((row) => inspect(
    row.address,
    row.account,
    "token_account",
    row.account?.data?.parsed?.info ?? {}
  ));
  const total = [...(mint ? [mint] : []), ...accounts].reduce((sum, row) => {
    return sum + (validUInt(row.potential_excess_lamports_raw)
      ? BigInt(row.potential_excess_lamports_raw)
      : 0n);
  }, 0n);
  return {
    method: "current_rent_floor_comparison",
    source: "Solana JSON-RPC",
    mint,
    token_accounts: accounts,
    sampled_token_account_count: accounts.length,
    potential_excess_account_count: [...(mint ? [mint] : []), ...accounts]
      .filter((row) => row.potential_excess_withdrawal_candidate).length,
    zero_balance_close_candidate_count: accounts.filter((row) => row.potential_close_candidate).length,
    total_potential_excess_lamports_raw: total.toString(),
    total_potential_excess_sol: Number(total) / 1_000_000_000,
    coverage: "Mint account plus at most the RPC-returned largest token-account sample for this mint; not a wallet-wide or complete account scan.",
    status: "read_only_candidates_only"
  };
}

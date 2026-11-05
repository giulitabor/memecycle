function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function base58Encode(bytes) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) + BigInt(byte);
  let output = "";
  while (value > 0n) {
    const remainder = Number(value % 58n);
    output = alphabet[remainder] + output;
    value /= 58n;
  }
  let zeros = 0;
  for (const byte of bytes) { if (byte === 0) zeros++; else break; }
  return "1".repeat(zeros) + output;
}
function sol(raw) {
  const value = Number(raw || 0) / 1_000_000_000;
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 9 }) + " SOL";
}
function short(value = "") { return value.length > 16 ? value.slice(0, 7) + "…" + value.slice(-6) : value; }

export function initWalletRecovery(db) {
  const host = document.querySelector("#wallet-recovery-root");
  if (!host) return;
  host.innerHTML = `
    <div class="wallet-scan-card">
      <div class="wallet-scan-intro">
        <div class="eyebrow">READ-ONLY · SIGNATURE VERIFIED</div>
        <h3>Find rent you may be able to reclaim.</h3>
        <p>Scan the SPL Token and Token-2022 accounts owned by your connected wallet. MEMECYCLE checks the current rent floor and separates excess-lamport withdrawals from empty accounts that may be closable.</p>
        <div class="privacy-note">Your wallet signs a one-time message only. No transaction is created, no token is burned, no account is closed and no SOL is moved.</div>
      </div>
      <div class="wallet-scan-actions">
        <button class="button primary" id="wallet-scan-start" type="button">Connect wallet & scan</button>
        <div id="wallet-scan-message" class="form-message" aria-live="polite">Sign in to your MEMECYCLE account before scanning.</div>
      </div>
      <div id="wallet-scan-results" class="wallet-scan-results" hidden></div>
    </div>`;

  const button = host.querySelector("#wallet-scan-start");
  const message = host.querySelector("#wallet-scan-message");
  const results = host.querySelector("#wallet-scan-results");

  async function signedIn() {
    if (!db) return false;
    const { data } = await db.auth.getSession();
    return Boolean(data.session?.user);
  }

  function renderResult(result) {
    const candidates = result.candidates || [];
    const excess = candidates.filter((x) => x.canWithdrawExcess);
    const close = candidates.filter((x) => x.canCloseZeroBalance);
    results.hidden = false;
    results.innerHTML = `
      <div class="wallet-scan-summary">
        <div><small>ACCOUNTS SCANNED</small><b>${Number(result.scanned_account_count || 0).toLocaleString()}</b></div>
        <div><small>POTENTIAL EXCESS WITHDRAWAL</small><b>${esc(sol(result.potential_excess_lamports))}</b></div>
        <div><small>POTENTIAL EMPTY-ACCOUNT CLOSE</small><b>${esc(sol(result.potential_close_lamports))}</b></div>
      </div>
      <p class="wallet-scan-status">${esc(result.status)} · ${Number(result.candidate_count || 0)} candidate accounts · estimates are gross before network fees</p>
      ${candidates.length ? candidates.map((item) => `
        <article class="wallet-candidate">
          <div class="wallet-candidate-head"><b>${item.canWithdrawExcess ? "Potential excess withdrawal" : "Potential empty-account close"}</b><span>${item.reviewRequired ? "REVIEW REQUIRED" : "STANDARD TOKEN ACCOUNT"}</span></div>
          <small>Account: <code>${esc(short(item.accountAddress))}</code> · Mint: <code>${esc(short(item.mintAddress || ""))}</code></small>
          <div class="wallet-candidate-values">
            ${item.canWithdrawExcess ? `<span>Potential excess: <b>${esc(sol(item.potentialExcessLamportsRaw))}</b></span>` : ""}
            ${item.canCloseZeroBalance ? `<span>Lamports returned on close: <b>${esc(sol(item.potentialCloseLamportsRaw))}</b></span>` : ""}
            <span>Token balance: <b>${esc(item.tokenAmountRaw)}</b></span>
          </div>
          ${item.reviewRequired ? "<p>Token-2022 extensions or account-specific conditions need checking before preparing any transaction.</p>" : ""}
        </article>`).join("") : "<p>No eligible excess-withdrawal or zero-balance close candidates were found in the scanned token accounts.</p>"}
      <details class="wallet-scan-limitations"><summary>Coverage and safety limitations</summary><ul>${(result.limitations || []).map((item) => `<li>${esc(item)}</li>`).join("")}</ul></details>
      <small class="wallet-scan-id">Scan reference: ${esc(result.scan_id)}</small>`;
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    results.hidden = true;
    try {
      if (!await signedIn()) throw new Error("Sign in to your MEMECYCLE account before scanning a wallet.");
      const provider = window.phantom?.solana || window.solflare || window.backpack || window.solana;
      if (!provider?.connect || !provider?.signMessage) throw new Error("A Solana wallet with message-signing support is required. Connect Phantom, Solflare or another compatible wallet.");
      message.textContent = "Connecting to your wallet…";
      const connected = await provider.connect();
      const wallet = connected.publicKey?.toString?.() || provider.publicKey?.toString?.();
      if (!wallet) throw new Error("Your wallet did not return a public address.");

      message.textContent = "Preparing a one-time message. No transaction will be requested.";
      const challengeResponse = await db.functions.invoke("memecycle-wallet-recovery", {
        body: { action: "challenge", wallet_address: wallet }
      });
      if (challengeResponse.error || !challengeResponse.data?.challenge_id) {
        throw new Error(challengeResponse.data?.error || challengeResponse.error?.message || "Could not prepare the wallet challenge.");
      }

      message.textContent = "Please approve the message signature in your wallet. Check that it says read-only and does not request a transaction.";
      const signed = await provider.signMessage(new TextEncoder().encode(challengeResponse.data.message), "utf8");
      const signatureBytes = signed?.signature || signed;
      if (!(signatureBytes instanceof Uint8Array) || signatureBytes.length !== 64) throw new Error("Wallet returned an unsupported message signature.");
      const signature = base58Encode(signatureBytes);

      message.textContent = "Verifying wallet control and scanning token accounts…";
      const scanResponse = await db.functions.invoke("memecycle-wallet-recovery", {
        body: { action: "scan", wallet_address: wallet, challenge_id: challengeResponse.data.challenge_id, signature }
      });
      if (scanResponse.error || !scanResponse.data?.scan_id) {
        throw new Error(scanResponse.data?.error || scanResponse.error?.message || "Wallet scan failed.");
      }
      renderResult(scanResponse.data);
      message.textContent = "Scan complete. These are candidates for your review, not approved transactions.";
    } catch (error) {
      message.textContent = String(error?.message || "Wallet scan failed.").slice(0, 260);
    } finally {
      button.disabled = false;
    }
  });

  db?.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      message.textContent = "Sign in to your MEMECYCLE account before scanning.";
      button.disabled = true;
    } else {
      message.textContent = "Your account is ready. Connect your Solana wallet to begin a read-only scan.";
      button.disabled = false;
    }
  });
  db?.auth.getSession().then(({ data }) => {
    button.disabled = !data.session?.user;
    message.textContent = data.session?.user
      ? "Your account is ready. Connect your Solana wallet to begin a read-only scan."
      : "Sign in to your MEMECYCLE account before scanning.";
  });
}

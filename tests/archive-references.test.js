import test from "node:test";
import assert from "node:assert/strict";
import { buildArchiveReferences } from "../supabase/functions/memecycle-revival/archive-references.js";

const mint = "8pdHR6UEDUDbopDHdP3sMZ3ivD6WSCKSYHMEkxikys7e";

test("creates exact-mint links to the external dataset without copying its rows", () => {
  const result = buildArchiveReferences({ mint });
  assert.equal(result.external_archives.length, 4);
  assert.ok(result.external_archives.every((item) => item.lookup_url.includes(encodeURIComponent(mint))));
  assert.ok(result.external_archives.every((item) => item.retrieval_status === "reference_only_not_fetched"));
  assert.match(result.storage_policy, /locators and provenance only/);
});

test("preserves on-chain, pair and launch-signature references", () => {
  const result = buildArchiveReferences({
    mint,
    primaryPairAddress: "PairAddress",
    launchSignature: "TransactionSignature"
  });
  assert.match(result.subject.explorer_url, /explorer\.solana\.com\/address/);
  assert.match(result.market_references.primary_pair_url, /dexscreener\.com\/solana\/PairAddress/);
  assert.match(result.launch_transaction_reference.explorer_url, /explorer\.solana\.com\/tx/);
});

test("keeps supported content identifiers as pointers and rejects unsafe URI schemes", () => {
  const ipfs = buildArchiveReferences({ mint, metadataUri: "ipfs://QmExample" });
  const unsafe = buildArchiveReferences({ mint, metadataUri: "javascript:alert(1)" });
  assert.equal(ipfs.metadata_reference.uri, "ipfs://QmExample");
  assert.equal(unsafe.metadata_reference.uri, null);
});

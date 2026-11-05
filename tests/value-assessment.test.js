import test from "node:test";
import assert from "node:assert/strict";
import { assessDigitalValue } from "../supabase/functions/memecycle-revival/value-assessment.js";

test("separates historical and research value from financial recovery", () => {
  const result = assessDigitalValue({
    datasetRecord: true, datasetFeatures: true, chainLaunchVerified: true,
    transactionCount: 94, marketSnapshotCount: 0, metadataOnchain: true,
    metadataUriStatus: "missing", tokenProgram: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    token2022: true, authorityDataAvailable: true, rentScanComplete: false,
    identityStatus: "unverified", authorityStatus: "unknown", consentStatus: "not_requested"
  });
  assert.ok(result.historicalScore >= 80);
  assert.ok(result.researchScore >= 80);
  assert.equal(result.recoveryScore, null);
  assert.equal(result.communityScore, null);
  assert.equal(result.rightsStatus, "unknown");
  assert.equal(result.evidenceConfidence, "high");
});

test("does not award community or recovery value without evidence", () => {
  const result = assessDigitalValue({});
  assert.equal(result.communityScore, null);
  assert.equal(result.recoveryScore, null);
  assert.equal(result.overallValueBand, "insufficient_evidence");
});

test("requires a complete wallet scan before scoring a zero-recovery result", () => {
  const incomplete = assessDigitalValue({ rentPotentialLamports: "0", rentScanComplete: false });
  const complete = assessDigitalValue({ rentPotentialLamports: "0", rentScanComplete: true });
  assert.equal(incomplete.recoveryScore, null);
  assert.equal(complete.recoveryScore, 0);
});

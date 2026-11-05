import test from "node:test";
import assert from "node:assert/strict";
import { scoreRevival } from "../supabase/functions/memecycle-revival/scoring.js";

test("unknown evidence never becomes a revival candidate", () => {
  const result = scoreRevival({});
  assert.equal(result.assessmentStatus, "insufficient_evidence");
  assert.equal(result.dormancyScore, null);
  assert.equal(result.opportunityScore, null);
});

test("dormant market evidence creates a research candidate, not an abandoned finding", () => {
  const result = scoreRevival({
    pairAgeDays: 400, poolActivityAgeDays: 150, liquidityUsd: 100, volume24hUsd: 20,
    mintAuthorityActive: false, freezeAuthorityActive: false, top20SupplyPct: 35,
    jupiterOrganicScore: 8, jupiterSuspicious: false, holderCount: 150
  });
  assert.equal(result.assessmentStatus, "research_candidate");
  assert.ok(result.dormancyScore >= 50);
  assert.notEqual(result.assessmentStatus, "revival_candidate");
});

test("wallet control alone cannot establish authority or consent", () => {
  const result = scoreRevival({
    pairAgeDays: 300, poolActivityAgeDays: 120, liquidityUsd: 2000, volume24hUsd: 1200,
    mintAuthorityActive: false, freezeAuthorityActive: false, top20SupplyPct: 25,
    jupiterOrganicScore: 45, jupiterSuspicious: false, holderCount: 800,
    authorityStatus: "wallet_control_verified", consentStatus: "not_requested"
  });
  assert.notEqual(result.assessmentStatus, "revival_candidate");
  assert.equal(result.authorityScore, 25);
});

test("revival candidate requires independently verified authority and granted consent", () => {
  const result = scoreRevival({
    pairAgeDays: 300, poolActivityAgeDays: 120, liquidityUsd: 5000, volume24hUsd: 15000,
    mintAuthorityActive: false, freezeAuthorityActive: false, top20SupplyPct: 25,
    jupiterOrganicScore: 70, jupiterSuspicious: false, holderCount: 2500,
    authorityStatus: "independently_verified", consentStatus: "granted"
  });
  assert.equal(result.assessmentStatus, "revival_candidate");
  assert.equal(result.authorityScore, 100);
});

test("suspicious provider signal increases risk and lowers viability", () => {
  const clean = scoreRevival({mintAuthorityActive:false,freezeAuthorityActive:false,top20SupplyPct:20,jupiterSuspicious:false,liquidityUsd:5000,jupiterOrganicScore:60});
  const risky = scoreRevival({mintAuthorityActive:true,freezeAuthorityActive:true,top20SupplyPct:85,jupiterSuspicious:true,liquidityUsd:100,jupiterOrganicScore:5});
  assert.ok(risky.riskScore > clean.riskScore);
  assert.ok(risky.viabilityScore < clean.viabilityScore);
});

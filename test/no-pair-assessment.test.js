import test from "node:test";
import assert from "node:assert/strict";
import { buildNoPairAssessment } from "../supabase/functions/memecycle-monitor/no-pair-assessment.js";

test("records a no-pair result as insufficient evidence, never abandonment", () => {
  const row = buildNoPairAssessment({
    mint: "11111111111111111111111111111111",
    observedAt: "2026-11-05T21:00:00.000Z",
    assessorVersion: "memecycle-monitor-0.4.0"
  });

  assert.equal(row.assessment_status, "insufficient_evidence");
  assert.equal(row.eligible_for_publication, false);
  assert.equal(row.auto_publish_eligible, false);
  assert.equal(row.auto_published, false);
  assert.equal(row.market_pair_address, null);
  assert.equal(row.liquidity_usd, null);
  assert.equal(row.volume_24h_usd, null);
  assert.equal(row.research_coverage, 0);
  assert.match(row.research_summary, /not proof/i);
});

test("uses only the observed source and timestamp without fabricating chain evidence", () => {
  const row = buildNoPairAssessment({
    mint: "11111111111111111111111111111111",
    observedAt: "2026-11-05T21:00:00.000Z",
    assessorVersion: "memecycle-monitor-0.4.0"
  });

  assert.deepEqual(row.corroborating_sources, ["dexscreener"]);
  assert.equal(row.evidence[0].provider, "DexScreener");
  assert.equal(row.evidence[0].observed_at, "2026-11-05T21:00:00.000Z");
  assert.equal(row.sampled_holder_accounts, 0);
  assert.equal(row.pool_last_activity_at, null);
});

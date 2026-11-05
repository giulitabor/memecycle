import { assertEquals } from "jsr:@std/assert@1";
import { nextAttemptNumber, selectRevivalBatch } from "./queue-policy.ts";

const now = Date.parse("2026-11-05T12:00:00.000Z");
const mintA = "11111111111111111111111111111111";
const mintB = "So11111111111111111111111111111111111111112";
const mintC = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

Deno.test("unassessed tokens are prioritised over old assessments", () => {
  const { batch } = selectRevivalBatch({
    nowMs: now, limit: 3,
    tokens: [{ mint: mintA, first_seen_at: "2026-11-01T00:00:00Z" }, { mint: mintB, first_seen_at: "2026-11-02T00:00:00Z" }],
    assessments: [{ mint: mintA, assessed_at: "2026-07-01T00:00:00Z" }],
    jobs: []
  });
  assertEquals(batch.map(x => x.mint), [mintB, mintA]);
});

Deno.test("fresh assessments are held until the 90-day cooldown expires", () => {
  const { batch } = selectRevivalBatch({
    nowMs: now, limit: 3,
    tokens: [{ mint: mintA }, { mint: mintB }],
    assessments: [{ mint: mintA, assessed_at: "2026-10-01T00:00:00Z" }],
    jobs: []
  });
  assertEquals(batch.map(x => x.mint), [mintB]);
});

Deno.test("partial jobs are retried only after the six-hour backoff", () => {
  const token = { mint: mintA };
  const job = { mint: mintA, status: "partial", attempts: 1, max_attempts: 3, updated_at: "2026-11-05T05:00:00Z" };
  assertEquals(selectRevivalBatch({ nowMs: now, limit: 3, tokens: [token], assessments: [], jobs: [job] }).batch.length, 1);
  assertEquals(selectRevivalBatch({ nowMs: Date.parse("2026-11-05T07:00:00Z"), limit: 3, tokens: [token], assessments: [], jobs: [job] }).batch.length, 0);
});

Deno.test("jobs at their attempt limit are not retried", () => {
  const { batch } = selectRevivalBatch({
    nowMs: now, limit: 3, tokens: [{ mint: mintA }], assessments: [],
    jobs: [{ mint: mintA, status: "failed", attempts: 3, max_attempts: 3, updated_at: "2026-11-04T00:00:00Z" }]
  });
  assertEquals(batch.length, 0);
});

Deno.test("stale running jobs can be reclaimed after twenty minutes", () => {
  const { batch } = selectRevivalBatch({
    nowMs: now, limit: 3, tokens: [{ mint: mintA }], assessments: [],
    jobs: [{ mint: mintA, status: "running", attempts: 1, max_attempts: 3, locked_at: "2026-11-05T11:30:00Z" }]
  });
  assertEquals(batch.length, 1);
});

Deno.test("successful jobs can be reassessed after cooldown and reset attempts", () => {
  const job = { mint: mintA, status: "succeeded", attempts: 1, max_attempts: 3 };
  const { batch } = selectRevivalBatch({
    nowMs: now, limit: 3, tokens: [{ mint: mintA }],
    assessments: [{ mint: mintA, assessed_at: "2026-07-01T00:00:00Z" }], jobs: [job]
  });
  assertEquals(batch.length, 1);
  assertEquals(nextAttemptNumber(job), 1);
});

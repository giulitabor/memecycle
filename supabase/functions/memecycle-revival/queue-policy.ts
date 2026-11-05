export type QueueToken = { mint: string; first_seen_at?: string | null; research_priority_at?: string | null };
export type QueueAssessment = { mint: string; assessed_at: string };
export type QueueJob = {
  mint: string | null;
  status: string;
  attempts: number;
  max_attempts: number;
  updated_at?: string | null;
  locked_at?: string | null;
  available_at?: string | null;
};

const ASSESSMENT_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
const RETRY_BACKOFF_MS = 6 * 60 * 60 * 1000;
const STALE_LOCK_MS = 20 * 60 * 1000;

export function nextAttemptNumber(priorJob?: QueueJob | null): number {
  if (!priorJob || priorJob.status === "succeeded") return 1;
  return Number(priorJob.attempts || 0) + 1;
}

export function selectRevivalBatch<T extends QueueToken>(input: {
  tokens: T[];
  assessments: QueueAssessment[];
  jobs: QueueJob[];
  nowMs: number;
  limit: number;
}): { batch: T[]; latestJobByMint: Map<string, QueueJob> } {
  const latestAssessmentByMint = new Map<string, QueueAssessment>();
  for (const row of input.assessments) {
    if (row.mint && !latestAssessmentByMint.has(row.mint)) latestAssessmentByMint.set(row.mint, row);
  }

  const latestJobByMint = new Map<string, QueueJob>();
  for (const row of input.jobs) {
    if (row.mint && !latestJobByMint.has(row.mint)) latestJobByMint.set(row.mint, row);
  }

  const eligible = input.tokens.filter((token) => {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(token.mint)) return false;
    const assessment = latestAssessmentByMint.get(token.mint);
    const assessedAt = assessment ? Date.parse(assessment.assessed_at) : Number.NaN;
    if (Number.isFinite(assessedAt) && input.nowMs - assessedAt < ASSESSMENT_COOLDOWN_MS) return false;

    const job = latestJobByMint.get(token.mint);
    if (!job) return true;
    if (job.status === "cancelled") return false;
    if (job.status === "succeeded") return Number.isFinite(assessedAt) && input.nowMs - assessedAt >= ASSESSMENT_COOLDOWN_MS;

    const attempts = Number(job.attempts || 0);
    const maxAttempts = Number(job.max_attempts || 3);
    if (attempts >= maxAttempts) return false;

    if (job.status === "partial" || job.status === "failed") {
      const updatedAt = job.updated_at ? Date.parse(job.updated_at) : Number.NaN;
      return Number.isFinite(updatedAt) && input.nowMs - updatedAt >= RETRY_BACKOFF_MS;
    }
    if (job.status === "running") {
      const lockedAt = job.locked_at ? Date.parse(job.locked_at) : Number.NaN;
      return !Number.isFinite(lockedAt) || input.nowMs - lockedAt >= STALE_LOCK_MS;
    }
    if (job.status === "queued") {
      const availableAt = job.available_at ? Date.parse(job.available_at) : Number.NaN;
      return !Number.isFinite(availableAt) || availableAt <= input.nowMs;
    }
    return false;
  });

  // Unassessed tokens always come first. Once the initial archive pass is
  // complete, the oldest assessments are refreshed first after the cooldown.
  eligible.sort((a, b) => {
    const aa = latestAssessmentByMint.get(a.mint)?.assessed_at;
    const bb = latestAssessmentByMint.get(b.mint)?.assessed_at;
    const aPriority = a.research_priority_at || a.first_seen_at || "";
    const bPriority = b.research_priority_at || b.first_seen_at || "";
    if (!aa && !bb) return Date.parse(aPriority) - Date.parse(bPriority);
    if (!aa) return -1;
    if (!bb) return 1;
    if (aa && bb) return Date.parse(aa) - Date.parse(bb);
    return Date.parse(aPriority) - Date.parse(bPriority);
  });

  return {
    batch: eligible.slice(0, Math.max(1, Math.min(input.limit, 3))),
    latestJobByMint
  };
}

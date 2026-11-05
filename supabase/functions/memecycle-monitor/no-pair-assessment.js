/**
 * Build a conservative monitor assessment when DexScreener returns no current pair.
 * Missing market data is a data gap, not proof of dormancy or abandonment.
 */
export function buildNoPairAssessment({ mint, observedAt, assessorVersion }) {
  return {
    mint,
    market_pair_address: null,
    market_pair_age_days: null,
    liquidity_usd: null,
    volume_24h_usd: null,
    pool_last_activity_at: null,
    pool_activity_age_days: null,
    sampled_holder_accounts: 0,
    sampled_accounts_without_recent_activity: 0,
    newest_sampled_holder_activity_at: null,
    jupiter_is_verified: null,
    jupiter_organic_score: null,
    jupiter_audit: null,
    corroborating_sources: ["dexscreener"],
    research_summary: "DexScreener returned no current Solana pair for this mint at the observation time. Market, pool and holder activity were not established by this monitor run. A missing pair response is not proof of token inactivity, project abandonment or lack of community. Further independent on-chain research is required.",
    risk_flags: [],
    research_coverage: 0,
    community_research_priority: 0,
    assessment_status: "insufficient_evidence",
    eligible_for_publication: false,
    auto_publish_eligible: false,
    auto_published: false,
    evidence: [{
      provider: "DexScreener",
      observed_at: observedAt,
      pair_found: false,
      coverage: "One token-pairs lookup for the Solana mint returned no current pair.",
      limitation: "No pair result is not proof of on-chain inactivity, project abandonment or community inactivity."
    }],
    assessor_version: assessorVersion
  };
}

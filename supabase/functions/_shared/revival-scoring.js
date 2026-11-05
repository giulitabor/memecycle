export function scoreRevival(input = {}) {
  const measured = [
    input.pairAgeDays, input.poolActivityAgeDays, input.liquidityUsd, input.volume24hUsd,
    input.mintAuthorityActive, input.freezeAuthorityActive, input.top20SupplyPct,
    input.jupiterOrganicScore, input.jupiterSuspicious, input.holderCount
  ].filter(value => value !== null && value !== undefined).length;

  const dormancyParts = [];
  if (Number.isFinite(input.pairAgeDays)) dormancyParts.push(input.pairAgeDays >= 365 ? 40 : input.pairAgeDays >= 180 ? 30 : input.pairAgeDays >= 90 ? 20 : input.pairAgeDays >= 30 ? 10 : 0);
  if (Number.isFinite(input.poolActivityAgeDays)) dormancyParts.push(input.poolActivityAgeDays >= 180 ? 40 : input.poolActivityAgeDays >= 90 ? 30 : input.poolActivityAgeDays >= 30 ? 20 : 0);
  if (Number.isFinite(input.liquidityUsd)) dormancyParts.push(input.liquidityUsd < 1000 ? 10 : 0);
  if (Number.isFinite(input.volume24hUsd)) dormancyParts.push(input.volume24hUsd < 500 ? 10 : 0);
  const dormancyScore = dormancyParts.length ? Math.min(100, dormancyParts.reduce((a,b)=>a+b,0)) : null;

  const viabilityParts = [];
  if (typeof input.mintAuthorityActive === "boolean") viabilityParts.push(input.mintAuthorityActive ? 0 : 20);
  if (typeof input.freezeAuthorityActive === "boolean") viabilityParts.push(input.freezeAuthorityActive ? 0 : 20);
  if (Number.isFinite(input.top20SupplyPct)) viabilityParts.push(input.top20SupplyPct <= 30 ? 20 : input.top20SupplyPct <= 50 ? 12 : input.top20SupplyPct <= 70 ? 5 : 0);
  if (typeof input.jupiterSuspicious === "boolean") viabilityParts.push(input.jupiterSuspicious ? 0 : 20);
  if (Number.isFinite(input.liquidityUsd)) viabilityParts.push(input.liquidityUsd >= 1000 ? 10 : 0);
  if (Number.isFinite(input.jupiterOrganicScore)) viabilityParts.push(input.jupiterOrganicScore >= 60 ? 10 : input.jupiterOrganicScore >= 30 ? 7 : input.jupiterOrganicScore >= 10 ? 3 : 0);
  const viabilityScore = viabilityParts.length ? Math.round(viabilityParts.reduce((a,b)=>a+b,0) / viabilityParts.reduce((a,b)=>a+1,0) * 6) : null;

  let communityScore = null;
  const communityParts = [];
  if (Number.isFinite(input.holderCount)) communityParts.push(input.holderCount >= 1000 ? 30 : input.holderCount >= 100 ? 20 : input.holderCount >= 25 ? 10 : 0);
  if (Number.isFinite(input.jupiterOrganicScore)) communityParts.push(input.jupiterOrganicScore >= 60 ? 30 : input.jupiterOrganicScore >= 30 ? 20 : input.jupiterOrganicScore >= 10 ? 10 : 0);
  if (Number.isFinite(input.poolActivityAgeDays)) communityParts.push(input.poolActivityAgeDays < 7 ? 20 : input.poolActivityAgeDays < 30 ? 15 : input.poolActivityAgeDays < 90 ? 5 : 0);
  if (Number.isFinite(input.volume24hUsd)) communityParts.push(input.volume24hUsd >= 10000 ? 20 : input.volume24hUsd >= 1000 ? 10 : 0);
  if (communityParts.length) communityScore = Math.min(100, communityParts.reduce((a,b)=>a+b,0));

  const identity = input.identityStatus;
  const authorityScore = input.authorityStatus === "independently_verified" ? 100
    : input.authorityStatus === "candidate_authority" ? 50
    : input.authorityStatus === "wallet_control_verified" ? 25
    : identity === "verified" ? 40
    : identity === "corroborated" ? 20 : 0;

  const riskParts = [];
  if (typeof input.jupiterSuspicious === "boolean") riskParts.push(input.jupiterSuspicious ? 40 : 0);
  if (typeof input.mintAuthorityActive === "boolean") riskParts.push(input.mintAuthorityActive ? 15 : 0);
  if (typeof input.freezeAuthorityActive === "boolean") riskParts.push(input.freezeAuthorityActive ? 15 : 0);
  if (Number.isFinite(input.top20SupplyPct)) riskParts.push(input.top20SupplyPct > 70 ? 20 : input.top20SupplyPct > 50 ? 10 : 0);
  if (Number.isFinite(input.liquidityUsd)) riskParts.push(input.liquidityUsd < 500 ? 10 : 0);
  const riskScore = riskParts.length ? Math.min(100, riskParts.reduce((a,b)=>a+b,0)) : null;

  const dataConfidenceScore = Math.round(measured / 10 * 100);
  const opportunityInputs = [viabilityScore, communityScore, dormancyScore, riskScore];
  const known = opportunityInputs.filter(value => value !== null);
  const opportunityScore = known.length >= 3
    ? Math.max(0, Math.min(100, Math.round((viabilityScore ?? 0) * 0.35 + (communityScore ?? 0) * 0.25 + (dormancyScore ?? 0) * 0.15 + authorityScore * 0.15 + (100 - (riskScore ?? 100)) * 0.10)))
    : null;

  let assessmentStatus = "insufficient_evidence";
  if (dataConfidenceScore >= 40 && dormancyScore !== null && dormancyScore >= 50) assessmentStatus = "research_candidate";
  if (dataConfidenceScore >= 60 && viabilityScore !== null && viabilityScore < 20 && riskScore !== null && riskScore >= 70) assessmentStatus = "not_viable";
  if (dataConfidenceScore >= 70 && viabilityScore !== null && viabilityScore >= 50 && communityScore !== null && communityScore >= 20 &&
      input.authorityStatus === "independently_verified" && input.consentStatus === "granted") assessmentStatus = "revival_candidate";

  return { dormancyScore, viabilityScore, communityScore, authorityScore, riskScore, dataConfidenceScore, opportunityScore, assessmentStatus };
}

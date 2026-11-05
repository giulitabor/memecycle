const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

export function assessDigitalValue(input = {}) {
  const datasetRecord = input.datasetRecord === true;
  const datasetFeatures = input.datasetFeatures === true;
  const chainLaunchVerified = input.chainLaunchVerified === true;
  const transactionCount = Math.max(0, Number(input.transactionCount) || 0);
  const marketSnapshotCount = Math.max(0, Number(input.marketSnapshotCount) || 0);
  const metadataOnchain = input.metadataOnchain === true;
  const metadataAvailable = input.metadataUriStatus === "available";
  const metadataDescriptionAvailable = input.metadataDescriptionAvailable === true;
  const communityEvidenceCount = Math.max(0, Number(input.communityEvidenceCount) || 0);
  const tokenProgram = String(input.tokenProgram ?? "");
  const token2022 = input.token2022 === true || tokenProgram.includes("TokenzQd");
  const authorityDataAvailable = input.authorityDataAvailable === true;
  const rentScanComplete = input.rentScanComplete === true;
  const rentPotential = BigInt(String(input.rentPotentialLamports ?? "0").replace(/[^0-9]/g, "") || "0");
  const identityStatus = String(input.identityStatus ?? "unverified");
  const authorityStatus = String(input.authorityStatus ?? "unknown");
  const consentStatus = String(input.consentStatus ?? "not_requested");

  const historical = clamp((datasetRecord ? 30 : 0) + (chainLaunchVerified ? 40 : 0) +
    (transactionCount >= 20 ? 20 : transactionCount > 0 ? 10 : 0) +
    (marketSnapshotCount >= 3 ? 10 : marketSnapshotCount > 0 ? 5 : 0));
  const research = clamp((datasetRecord ? 25 : 0) + (datasetFeatures ? 25 : 0) +
    (chainLaunchVerified ? 25 : 0) + (transactionCount > 0 ? 15 : 0) +
    (marketSnapshotCount > 0 ? 10 : 0));
  const cultural = clamp((metadataOnchain ? 20 : 0) + (metadataAvailable ? 30 : 0) +
    (metadataDescriptionAvailable ? 20 : 0) + (communityEvidenceCount > 0 ? 30 : 0));
  const technical = clamp((tokenProgram ? 25 : 0) + (token2022 ? 20 : 0) +
    (authorityDataAvailable ? 25 : 0) + (metadataOnchain ? 15 : 0) + (datasetRecord ? 15 : 0));
  const recovery = rentScanComplete ? (rentPotential > 0n ? 85 : 0) : null;
  const community = identityStatus === "verified"
    ? clamp(40 + (authorityStatus === "independently_verified" ? 30 : 0) + (consentStatus === "granted" ? 30 : 0))
    : communityEvidenceCount > 0 ? 20 : null;

  const measured = [historical, research, cultural, technical, recovery, community].filter((x) => x !== null);
  const mean = measured.length ? measured.reduce((sum, x) => sum + x, 0) / measured.length : 0;
  const overallValueBand = !measured.length || mean < 15 ? "insufficient_evidence"
    : mean >= 70 ? "high_potential" : mean >= 40 ? "moderate_potential" : "low_potential";
  const evidenceConfidence = chainLaunchVerified && datasetRecord ? "high"
    : chainLaunchVerified || datasetRecord || transactionCount > 0 ? "medium" : "low";

  return {
    assessorVersion: "memecycle-value-0.1.0",
    historicalScore: historical,
    researchScore: research,
    culturalScore: cultural,
    technicalScore: technical,
    recoveryScore: recovery,
    communityScore: community,
    overallValueBand,
    evidenceConfidence,
    rightsStatus: "unknown",
    authorityStatus,
    consentStatus,
    findings: {
      historical: { score: historical, evidence: { datasetRecord, chainLaunchVerified, transactionCount, marketSnapshotCount } },
      research: { score: research, evidence: { datasetRecord, datasetFeatures, chainLaunchVerified, transactionCount, marketSnapshotCount } },
      cultural: { score: cultural, evidence: { metadataOnchain, metadataUriStatus: input.metadataUriStatus ?? "unknown", metadataDescriptionAvailable, communityEvidenceCount } },
      technical: { score: technical, evidence: { tokenProgram: tokenProgram || null, token2022, authorityDataAvailable, metadataOnchain } },
      recovery: { score: recovery, potentialExcessLamportsRaw: rentScanComplete ? rentPotential.toString() : null, scanComplete: rentScanComplete },
      community: { score: community, identityStatus, authorityStatus, consentStatus }
    },
    limitations: [
      "Scores describe evidence-backed reuse potential, not token price, financial value, investment merit or a promise of recovery.",
      "Dataset outcomes such as rugged are provider-defined labels and are not treated as proof of fraud or abandonment.",
      "A dataset licence covers the dataset's own material; rights in linked artwork, metadata or third-party content remain unknown unless separately verified.",
      "A launch fee payer or wallet signer is not proof of real-world identity, project authority or permission to reuse community material.",
      "Rent recovery remains unassessed until a wallet-specific, signature-verified scan is completed; mint and largest-account samples are not wallet-wide."
    ]
  };
}

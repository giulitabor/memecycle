export const transitions = {
  research: ["identity_check", "on_hold", "rejected"],
  identity_check: ["research", "awaiting_consent", "on_hold", "rejected"],
  awaiting_consent: ["identity_check", "consent_confirmed", "on_hold", "rejected"],
  consent_confirmed: ["planning", "on_hold", "rejected"],
  planning: ["approved", "on_hold", "closed"],
  approved: ["on_hold", "closed"],
  on_hold: ["research", "identity_check", "awaiting_consent", "consent_confirmed", "planning", "closed", "rejected"],
  closed: [],
  rejected: []
};

export function canTransition(from, to) {
  return Array.isArray(transitions[from]) && transitions[from].includes(to);
}

export function hasIndependentAuthorityEvidence(evidence) {
  if (!Array.isArray(evidence)) return false;
  const allowed = new Set(["authority", "project_control", "official_announcement", "legal_or_governance"]);
  const urls = new Set(evidence.filter(item => allowed.has(item?.type) && typeof item?.url === "string" && item.url.startsWith("https://")).map(item => item.url));
  return urls.size >= 2;
}

export function hasExplicitConsentEvidence(evidence, authorityStatus) {
  return authorityStatus === "independently_verified" &&
    Array.isArray(evidence) &&
    evidence.some(item => item?.type === "explicit_project_consent" && typeof item.url === "string" && item.url.startsWith("https://"));
}

export function hasAuthorityAndConsent(identity) {
  return identity?.authority_status === "independently_verified" && identity?.consent_status === "granted";
}

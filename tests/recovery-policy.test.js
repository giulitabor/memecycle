import test from "node:test";
import assert from "node:assert/strict";
import {canTransition,hasIndependentAuthorityEvidence,hasExplicitConsentEvidence,hasAuthorityAndConsent,canAttestAuthority,canAttestConsent} from "../api/lib/recovery-policy.js";

test("only documented case transitions are allowed",()=>{
 assert.equal(canTransition("research","identity_check"),true);
 assert.equal(canTransition("research","approved"),false);
 assert.equal(canTransition("closed","research"),false);
 assert.equal(canTransition("on_hold","planning"),true);
});
test("authority requires two distinct HTTPS evidence sources",()=>{
 assert.equal(hasIndependentAuthorityEvidence([{type:"authority",url:"https://a.example"},{type:"project_control",url:"https://a.example"}]),false);
 assert.equal(hasIndependentAuthorityEvidence([{type:"authority",url:"https://a.example"},{type:"official_announcement",url:"https://b.example"}]),true);
 assert.equal(hasIndependentAuthorityEvidence([{type:"authority",url:"http://a.example"},{type:"official_announcement",url:"https://b.example"}]),false);
});
test("explicit consent requires independently verified authority",()=>{
 const evidence=[{type:"explicit_project_consent",url:"https://project.example/consent"}];
 assert.equal(hasExplicitConsentEvidence(evidence,"wallet_control_verified"),false);
 assert.equal(hasExplicitConsentEvidence(evidence,"independently_verified"),true);
});
test("recovery planning gate requires independent authority and consent",()=>{
 assert.equal(hasAuthorityAndConsent({authority_status:"wallet_control_verified",consent_status:"granted"}),false);
 assert.equal(hasAuthorityAndConsent({authority_status:"independently_verified",consent_status:"requested"}),false);
 assert.equal(hasAuthorityAndConsent({authority_status:"independently_verified",consent_status:"granted"}),true);
});

test("independent authority status requires an explicit human attestation",()=>{
 const e=[{type:"authority",url:"https://a.example"},{type:"official_announcement",url:"https://b.example"}];
 assert.equal(canAttestAuthority("independently_verified",e,false),false);
 assert.equal(canAttestAuthority("independently_verified",e,true),true);
 assert.equal(canAttestAuthority("candidate_authority",[],false),true);
});
test("granted consent requires explicit evidence and a separate human attestation",()=>{
 const e=[{type:"explicit_project_consent",url:"https://project.example/consent"}];
 assert.equal(canAttestConsent("granted","independently_verified",e,false),false);
 assert.equal(canAttestConsent("granted","independently_verified",e,true),true);
 assert.equal(canAttestConsent("granted","wallet_control_verified",e,true),false);
});

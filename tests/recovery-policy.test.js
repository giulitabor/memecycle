import test from "node:test";
import assert from "node:assert/strict";
import {canTransition,hasIndependentAuthorityEvidence,hasExplicitConsentEvidence,hasAuthorityAndConsent} from "../api/lib/recovery-policy.js";

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

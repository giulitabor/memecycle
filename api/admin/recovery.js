import { createClient } from "@supabase/supabase-js";
import { canTransition, hasIndependentAuthorityEvidence, hasExplicitConsentEvidence, hasAuthorityAndConsent, canAttestAuthority, canAttestConsent } from "../lib/recovery-policy.js";

const json=(res,status,body)=>res.status(status).json(body);
const trim=(v,n=500)=>String(v??"").slice(0,n);
const validMint=v=>typeof v==="string"&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
const identityStates=new Set(["unverified","candidate","corroborated","verified","disputed","unreachable"]);
const authorityStates=new Set(["unknown","wallet_control_verified","candidate_authority","independently_verified","disputed","revoked"]);
const consentStates=new Set(["not_requested","requested","granted","declined","withdrawn"]);
const caseStates=new Set(["research","identity_check","awaiting_consent","consent_confirmed","planning","approved","on_hold","closed","rejected"]);

function cleanUrls(value,max=10){
 if(!Array.isArray(value))return[];
 return value.slice(0,max).flatMap(item=>{
  const url=String(item?.url??item?.source_url??"");
  try{const u=new URL(url);if(u.protocol!=="https:"||u.href.length>1200)return[];return[{type:trim(item.type||"source",60),url:u.href,notes:trim(item.notes,500),observed_at:item.observed_at||new Date().toISOString()}]}catch{return[]}
 });
}
function cleanChannels(value){
 if(!Array.isArray(value))return[];
 return value.slice(0,10).flatMap(item=>{
  const value=trim(item?.value,300),type=trim(item?.type,40),sourceUrl=String(item?.source_url??"");
  if(!value||!type)return[];
  try{const u=new URL(sourceUrl);if(u.protocol!=="https:")return[];return[{type,value,source_url:u.href,verified:Boolean(item.verified),observed_at:item.observed_at||new Date().toISOString()}]}catch{return[]}
 });
}
async function requireAdmin(req){
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Object.assign(new Error("Recovery service is not configured."),{status:503});
 const auth=String(req.headers.authorization||"");
 if(!auth.startsWith("Bearer "))throw Object.assign(new Error("Sign in as an administrator."),{status:401});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.auth.getUser(auth.slice(7));
 if(error||!data.user)throw Object.assign(new Error("Administrator session could not be verified."),{status:401});
 if(data.user.app_metadata?.role!=="admin")throw Object.assign(new Error("Administrator access required."),{status:403});
 return{db,user:data.user};
}
async function logEvent(db,caseId,eventType,user,details){
 const actor=user.email||user.id;
 const {error}=await db.from("mc_revival_case_events").insert({case_id:caseId,event_type:eventType,actor,details});
 if(error)throw error;
}
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return json(res,405,{error:"Method not allowed"})}
 let db,user;
 try{({db,user}=await requireAdmin(req))}catch(e){return json(res,e.status||500,{error:e.message||"Admin authorization failed."})}
 const body=req.body||{},action=body.action;
 try{
  if(action==="list"){
   const limit=Math.max(1,Math.min(Number(body.limit)||30,100));
   const {data:cases,error}=await db.from("mc_revival_cases").select("*").order("updated_at",{ascending:false}).limit(limit);
   if(error)throw error;
   const mints=[...new Set((cases||[]).map(x=>x.mint))];
   const [tokens,identities]=await Promise.all([
    mints.length?db.from("mc_tokens").select("mint,name,symbol,classification,liquidity_usd,volume_24h_usd,visibility").in("mint",mints):Promise.resolve({data:[],error:null}),
    mints.length?db.from("mc_project_identities").select("mint,project_name,website_url,identity_status,authority_status,consent_status,last_verified_at").in("mint",mints):Promise.resolve({data:[],error:null})
   ]);
   if(tokens.error)throw tokens.error;if(identities.error)throw identities.error;
   const tokenMap=new Map((tokens.data||[]).map(x=>[x.mint,x])),identityMap=new Map((identities.data||[]).map(x=>[x.mint,x]));
   return json(res,200,{cases:(cases||[]).map(x=>({...x,token:tokenMap.get(x.mint)||null,identity:identityMap.get(x.mint)||null}))});
  }

  if(action==="opportunities"){
   const limit=Math.max(1,Math.min(Number(body.limit)||30,100));
   const {data:assessments,error}=await db.from("mc_revival_assessments")
    .select("id,mint,assessed_at,assessor_version,dormancy_score,revival_viability_score,authority_clarity_score,community_signal_score,data_confidence_score,risk_score,opportunity_score,assessment_status,rationale")
    .neq("assessment_status","insufficient_evidence").order("opportunity_score",{ascending:false,nullsFirst:false}).limit(limit);
   if(error)throw error;
   const mints=[...new Set((assessments||[]).map(x=>x.mint))];
   const [tokens,identities,cases]=await Promise.all([
    mints.length?db.from("mc_tokens").select("mint,name,symbol,classification,liquidity_usd,volume_24h_usd,visibility").in("mint",mints):Promise.resolve({data:[],error:null}),
    mints.length?db.from("mc_project_identities").select("mint,project_name,identity_status,authority_status,consent_status").in("mint",mints):Promise.resolve({data:[],error:null}),
    mints.length?db.from("mc_revival_cases").select("id,mint,case_status").in("mint",mints):Promise.resolve({data:[],error:null})
   ]);
   if(tokens.error)throw tokens.error;if(identities.error)throw identities.error;if(cases.error)throw cases.error;
   const tm=new Map((tokens.data||[]).map(x=>[x.mint,x])),im=new Map((identities.data||[]).map(x=>[x.mint,x])),cm=new Map((cases.data||[]).map(x=>[x.mint,x]));
   return json(res,200,{opportunities:(assessments||[]).map(x=>({...x,token:tm.get(x.mint)||null,identity:im.get(x.mint)||null,case:cm.get(x.mint)||null}))});
  }

  if(action==="create_case"){
   const mint=String(body.mint||"").trim();if(!validMint(mint))return json(res,400,{error:"A valid Solana mint address is required."});
   const {data:token,error:tokenError}=await db.from("mc_tokens").select("mint").eq("mint",mint).maybeSingle();
   if(tokenError)throw tokenError;if(!token)return json(res,404,{error:"Token is not in the MEMECYCLE archive."});
   const {data:existing,error:existingError}=await db.from("mc_revival_cases").select("id,case_status").eq("mint",mint).in("case_status",["research","identity_check","awaiting_consent","consent_confirmed","planning","approved","on_hold"]).limit(1);
   if(existingError)throw existingError;if(existing?.length)return json(res,409,{error:"An open revival case already exists for this token.",case_id:existing[0].id});
   let assessmentId=null;
   if(body.assessment_id){
    const {data:assessment,error}=await db.from("mc_revival_assessments").select("id,mint").eq("id",body.assessment_id).maybeSingle();
    if(error)throw error;if(!assessment||assessment.mint!==mint)return json(res,400,{error:"Assessment does not belong to this token."});assessmentId=assessment.id;
   }
   const {data:created,error}=await db.from("mc_revival_cases").insert({
    mint,assessment_id:assessmentId,case_status:"research",requires_human_approval:true,created_by:user.id
   }).select("*").single();
   if(error)throw error;
   await logEvent(db,created.id,"case_created",user,{assessment_id:assessmentId,guardrails:["no_outreach","no_wallet_actions","explicit_consent_required","human_approval_required"]});
   await db.from("mc_audit_events").insert({event_type:"revival_case_created",actor:user.email||user.id,subject_ref:mint,details:{case_id:created.id}});
   return json(res,201,{case:created});
  }

  if(action==="update_identity"){
   const mint=String(body.mint||"").trim();if(!validMint(mint))return json(res,400,{error:"A valid Solana mint address is required."});
   const identityStatus=body.identity_status,authorityStatus=body.authority_status,consentStatus=body.consent_status;
   if(identityStatus&&!identityStates.has(identityStatus))return json(res,400,{error:"Invalid identity status."});
   if(authorityStatus&&!authorityStates.has(authorityStatus))return json(res,400,{error:"Invalid authority status."});
   if(consentStatus&&!consentStates.has(consentStatus))return json(res,400,{error:"Invalid consent status."});
   const {data:current,error:readError}=await db.from("mc_project_identities").select("*").eq("mint",mint).maybeSingle();
   if(readError)throw readError;
   const evidence=body.evidence===undefined?(current?.evidence||[]):cleanUrls(body.evidence,20);
   const authority=authorityStatus||current?.authority_status||"unknown";
   const consent=consentStatus||current?.consent_status||"not_requested";
   if(!canAttestAuthority(authority,evidence,body.human_review_confirmed))return json(res,400,{error:"Independent authority requires two distinct HTTPS evidence sources and explicit human-review confirmation."});
   if(!canAttestConsent(consent,authority,evidence,body.consent_review_confirmed))return json(res,400,{error:"Granted consent requires independently verified authority, explicit-consent evidence and human confirmation."});
   const {data:saved,error}=await db.from("mc_project_identities").upsert({
    mint,project_name:body.project_name===undefined?(current?.project_name??null):trim(body.project_name,180)||null,
    website_url:body.website_url===undefined?(current?.website_url??null):cleanUrls([{url:body.website_url,type:"website"}],1)[0]?.url??null,
    social_links:body.social_links===undefined?(current?.social_links??[]):cleanUrls(body.social_links,10),
    contact_channels:body.contact_channels===undefined?(current?.contact_channels??[]):cleanChannels(body.contact_channels),
    identity_status:identityStatus||current?.identity_status||"unverified",
    authority_status:authority,consent_status:consent,evidence,
    last_verified_at:identityStatus==="verified"||authority==="independently_verified"?new Date().toISOString():(current?.last_verified_at??null),
    updated_at:new Date().toISOString()
   },{onConflict:"mint"}).select("*").single();
   if(error)throw error;
   const {data:cases}=await db.from("mc_revival_cases").select("id").eq("mint",mint).in("case_status",["research","identity_check","awaiting_consent","consent_confirmed","planning","approved","on_hold"]);
   for(const item of cases||[])await logEvent(db,item.id,"project_identity_updated",user,{identity_status:saved.identity_status,authority_status:saved.authority_status,consent_status:saved.consent_status});
   await db.from("mc_audit_events").insert({event_type:"project_identity_updated",actor:user.email||user.id,subject_ref:mint,details:{identity_status:saved.identity_status,authority_status:saved.authority_status,consent_status:saved.consent_status}});
   return json(res,200,{identity:saved});
  }

  if(action==="transition_case"){
   const caseId=String(body.case_id||"");const next=body.next_status;
   if(!caseId||!caseStates.has(next))return json(res,400,{error:"A case ID and valid next status are required."});
   const {data:current,error}=await db.from("mc_revival_cases").select("*").eq("id",caseId).maybeSingle();
   if(error)throw error;if(!current)return json(res,404,{error:"Revival case not found."});
   if(!canTransition(current.case_status,next))return json(res,409,{error:`Transition from ${current.case_status} to ${next} is not allowed.`});
   const {data:identity, error:identityError}=await db.from("mc_project_identities").select("authority_status,consent_status").eq("mint",current.mint).maybeSingle();
   if(identityError)throw identityError;
   if(["consent_confirmed","planning","approved"].includes(next)){
    if(!hasAuthorityAndConsent(identity))return json(res,409,{error:"Independent project authority verification and explicit consent are both required before recovery planning."});
   }
   if(next==="approved"&&(!body.confirm_approval||trim(body.approval_note,1000).length<20))return json(res,400,{error:"Approval requires an explicit admin confirmation and a meaningful approval note."});
   const patch={case_status:next,authority_status:identity?.authority_status||"unknown",consent_status:identity?.consent_status||"not_requested",updated_at:new Date().toISOString()};
   if(next==="approved"){patch.approved_by=user.id;patch.approved_at=new Date().toISOString()}
   if(next==="closed"||next==="rejected")patch.closed_at=new Date().toISOString();
   const {data:saved,error:updateError}=await db.from("mc_revival_cases").update(patch).eq("id",caseId).select("*").single();
   if(updateError)throw updateError;
   await logEvent(db,caseId,"case_status_changed",user,{from:current.case_status,to:next,approval_note:next==="approved"?trim(body.approval_note,1000):null});
   await db.from("mc_audit_events").insert({event_type:"revival_case_status_changed",actor:user.email||user.id,subject_ref:current.mint,details:{case_id:caseId,from:current.case_status,to:next}});
   return json(res,200,{case:saved});
  }

  if(action==="update_plan"){
   const caseId=String(body.case_id||"");
   const {data:current,error}=await db.from("mc_revival_cases").select("*").eq("id",caseId).maybeSingle();
   if(error)throw error;if(!current)return json(res,404,{error:"Revival case not found."});
   if(!["consent_confirmed","planning","on_hold"].includes(current.case_status))return json(res,409,{error:"A recovery plan can only be edited after explicit consent has been recorded."});
   const {data:identity,error:identityError}=await db.from("mc_project_identities").select("authority_status,consent_status").eq("mint",current.mint).maybeSingle();
   if(identityError)throw identityError;
   if(!hasAuthorityAndConsent(identity))return json(res,409,{error:"Authority and explicit consent gates are not satisfied."});
   const plan=body.plan&&typeof body.plan==="object"&&!Array.isArray(body.plan)?body.plan:{};
   const risks=Array.isArray(body.risk_register)?body.risk_register.slice(0,30):[];
   const {data:saved,error:updateError}=await db.from("mc_revival_cases").update({proposed_recovery_plan:plan,risk_register:risks,updated_at:new Date().toISOString()}).eq("id",caseId).select("*").single();
   if(updateError)throw updateError;
   await logEvent(db,caseId,"recovery_plan_updated",user,{plan,risks_count:risks.length});
   return json(res,200,{case:saved});
  }

  if(action==="add_note"){
   const caseId=String(body.case_id||""),note=trim(body.note,2000);
   if(!caseId||note.length<5)return json(res,400,{error:"A case ID and note are required."});
   const {data:current,error}=await db.from("mc_revival_cases").select("id,mint").eq("id",caseId).maybeSingle();
   if(error)throw error;if(!current)return json(res,404,{error:"Revival case not found."});
   await logEvent(db,caseId,"admin_note",user,{note});
   return json(res,201,{ok:true});
  }
  return json(res,400,{error:"Unknown recovery action."});
 }catch(error){return json(res,error.status||500,{error:trim(error.message||"Recovery workflow failed.",500)})}
}

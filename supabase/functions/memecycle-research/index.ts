import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!,KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(SUPABASE_URL,KEY,{auth:{persistSession:false}});
const VERSION="memecycle-research-0.1.0",PROMPT_VERSION="memecycle-revival-dossier-v1";
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const systemPrompt=`You are MEMECYCLE's evidence-bound digital project research analyst. Use only the supplied evidence manifest. Do not invent project history, creator identity, holder intent, community activity, token ownership, authority, contact details, legal status, market data or revival permission. Distinguish observed facts, provider-reported facts, inference and unknowns. A wallet signature proves control of a wallet only. Dormant liquidity or pool inactivity does not prove a project is abandoned. Never recommend buying, selling, trading, transferring funds, taking over a token or deploying a replacement token. Return a JSON object with keys: executive_summary, historical_context, market_status, creator_and_authority, holder_and_launch_risk, revival_opportunity, recommended_next_steps, blockers, risk_register (array of {risk, severity, explanation, evidence_refs}), evidence_refs (array of evidence IDs), unknowns (array), and confidence_note. Every factual statement must cite one or more evidence IDs from the manifest; if none support it, label it unknown or hypothesis. Include explicit consent and authority requirements.`;
function deterministicReport(token:any,assessment:any,evidence:any[]){
 const refs=evidence.map((e:any)=>e.id);
 const byType=(type:string)=>evidence.filter((e:any)=>e.evidence_type===type).map((e:any)=>({id:e.id,source:e.source,confidence:e.confidence,coverage:e.coverage,evidence:e.evidence}));
 return {
  executive_summary:"Insufficient verified information for a revival decision. This dossier records the evidence currently available and the work still required.",
  historical_context:{token_name:token.name??null,symbol:token.symbol??null,discovery_sources:token.discovery_sources??[],pumpfun_launch:token.source_provenance?.bitquery_launch??token.source_provenance?.pumpfun??null},
  market_status:{classification:token.classification??"unverified",liquidity_usd:token.liquidity_usd??null,volume_24h_usd:token.volume_24h_usd??null,last_activity_at:token.last_activity_at??null},
  creator_and_authority:{candidate_creator:byType("creator_candidate"),authority_status:"unknown",wallet_control_is_not_project_authority:true},
  holder_and_launch_risk:{holder_distribution:byType("holder_distribution"),bundle_evidence:byType("bundle_launch"),risk_flags:token.risk_flags??[]},
  revival_opportunity:{assessment_status:assessment?.assessment_status??"insufficient_evidence",opportunity_score:assessment?.opportunity_score??null,viability_score:assessment?.revival_viability_score??null,community_signal_score:assessment?.community_signal_score??null,authority_clarity_score:assessment?.authority_clarity_score??null},
  recommended_next_steps:["Complete historical on-chain transaction and holder analysis.","Identify project representatives using independently corroborated public evidence.","Obtain explicit consent from an independently verified authority before planning any relaunch."],
  blockers:["No independently verified project authority.","No recorded revival consent.","Current evidence does not establish abandonment or community intent."],
  risk_register:[],evidence_refs:refs,unknowns:["Original project status and history beyond indexed sources.","Beneficial ownership and complete holder distribution.","Current community activity and willingness to participate.","Whether any person has authority to authorise a revival."],
  confidence_note:"Deterministic evidence inventory; not an AI opinion, abandonment finding, investment recommendation or authorisation."
 };
}
function cleanAiReport(parsed:any,validIds:Set<string>){
 const refs=Array.isArray(parsed?.evidence_refs)?parsed.evidence_refs.filter((id:any)=>typeof id==="string"&&validIds.has(id)):[];
 const risks=Array.isArray(parsed?.risk_register)?parsed.risk_register.slice(0,20).map((r:any)=>({...r,evidence_refs:Array.isArray(r.evidence_refs)?r.evidence_refs.filter((id:any)=>validIds.has(id)):[]})):[];
 return {...parsed,evidence_refs:refs,risk_register:risks,authority_and_consent_gate:"No revival action is authorised by this report.",validation:{unknown_evidence_references_removed:true,all_evidence_refs_valid:refs.length===(parsed?.evidence_refs??[]).length}};
}
async function buildReport(mint:string,deepseekKey?:string){
 const {data:token,error:tokenError}=await db.from("mc_tokens").select("mint,name,symbol,classification,lifecycle_status,price_usd,market_cap_usd,liquidity_usd,volume_24h_usd,holder_count,last_activity_at,discovery_sources,source_provenance,risk_flags").eq("mint",mint).maybeSingle();
 if(tokenError)throw tokenError;if(!token)throw new Error("Token not found.");
 const [a,e]=await Promise.all([
  db.from("mc_revival_assessments").select("*").eq("mint",mint).order("assessed_at",{ascending:false}).limit(1).maybeSingle(),
  db.from("mc_onchain_evidence").select("id,evidence_type,source,confidence,coverage,observed_at,evidence").eq("mint",mint).order("observed_at",{ascending:false}).limit(60)
 ]);
 if(a.error)throw a.error;if(e.error)throw e.error;
 const evidence=e.data??[],manifest={mint,token:{name:token.name,symbol:token.symbol,classification:token.classification,liquidity_usd:token.liquidity_usd,volume_24h_usd:token.volume_24h_usd,holder_count:token.holder_count,discovery_sources:token.discovery_sources,source_provenance:token.source_provenance,risk_flags:token.risk_flags},assessment:a.data??null,evidence};
 let report:any=deterministicReport(token,a.data,evidence),model="memecycle-deterministic-v1",inputTokens:number|null=null,outputTokens:number|null=null,errorMessage:string|null=null;
 if(deepseekKey){
  try{
   const r=await fetch("https://api.deepseek.com/chat/completions",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+deepseekKey},body:JSON.stringify({
    model:"deepseek-chat",temperature:0.1,max_tokens:1800,response_format:{type:"json_object"},
    messages:[{role:"system",content:systemPrompt},{role:"user",content:"Create a MEMECYCLE revival research dossier from this evidence manifest. Do not fill gaps with outside knowledge.\n"+JSON.stringify(manifest)}]
   }),signal:AbortSignal.timeout(45000)});
   if(!r.ok)throw new Error("DeepSeek HTTP "+r.status);
   const payload:any=await r.json(),content=payload.choices?.[0]?.message?.content;
   if(typeof content!=="string")throw new Error("DeepSeek returned no report content.");
   const parsed=JSON.parse(content);
   const validIds=new Set(evidence.map((row:any)=>row.id));
   report=cleanAiReport(parsed,validIds);model=payload.model??"deepseek-chat";
   inputTokens=Number.isFinite(payload.usage?.prompt_tokens)?payload.usage.prompt_tokens:null;
   outputTokens=Number.isFinite(payload.usage?.completion_tokens)?payload.usage.completion_tokens:null;
  }catch(error){errorMessage=String(error).slice(0,300);report={...report,ai_generation_error:errorMessage,ai_fallback_used:true};}
 }
 const summary=String(report.executive_summary??"Evidence dossier generated.").slice(0,1200);
 const {data:saved,error:saveError}=await db.from("mc_ai_research_reports").insert({
  mint,status:"completed",model,prompt_version:PROMPT_VERSION,summary,report,evidence_manifest:{
   mint,evidence_ids:evidence.map((row:any)=>row.id),evidence_count:evidence.length,
   assessment_id:a.data?.id??null,generated_at:new Date().toISOString(),
   source_provenance:token.source_provenance??{},fallback_used:model==="memecycle-deterministic-v1"||Boolean(errorMessage)
  },generation_id:crypto.randomUUID(),input_tokens:inputTokens,output_tokens:outputTokens,
  estimated_cost_usd:null,error_message:errorMessage
 }).select("id,mint,status,model,created_at").single();
 if(saveError)throw saveError;
 return {report:saved,model,fallback_used:model==="memecycle-deterministic-v1"||Boolean(errorMessage),evidence_count:evidence.length,assessment_status:a.data?.assessment_status??"insufficient_evidence"};
}
async function run(mint:string|null,deepseekKey?:string){
 let target=mint;
 if(target&&!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(target))throw new Error("Invalid Solana mint.");
 if(!target){
  const {data:assessments,error}=await db.from("mc_revival_assessments").select("mint").order("assessed_at",{ascending:false}).limit(20);
  if(error)throw error;
  for(const item of assessments??[]){
   const {data:existing}=await db.from("mc_ai_research_reports").select("id").eq("mint",item.mint).limit(1);
   if(!existing?.length){target=item.mint;break;}
  }
 }
 if(!target)return {status:"no_candidates",message:"No assessed token is waiting for a first dossier."};
 const {data:job,error:jobError}=await db.from("mc_research_jobs").insert({mint:target,job_type:"ai_dossier",status:"running",priority:70,attempts:1,max_attempts:3,locked_at:new Date().toISOString(),locked_by:VERSION}).select("id").single();
 if(jobError)throw jobError;
 try{
  const result=await buildReport(target,deepseekKey);
  await db.from("mc_research_jobs").update({status:"succeeded",result,finished_at:new Date().toISOString(),updated_at:new Date().toISOString(),locked_at:null,locked_by:null}).eq("id",job.id);
  await db.from("mc_audit_events").insert({event_type:"revival_dossier_generated",actor:VERSION,subject_ref:target,details:result});
  return {status:"succeeded",...result};
 }catch(error){
  const message=String(error).slice(0,400);
  await db.from("mc_research_jobs").update({status:"failed",error_message:message,updated_at:new Date().toISOString(),locked_at:null,locked_by:null}).eq("id",job.id);
  throw error;
 }
}
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return out({error:"POST required"},405);
 if(!KEY)return out({error:"Research service credentials missing."},503);
 const auth=req.headers.get("authorization")??"",token=auth.startsWith("Bearer ")?auth.slice(7):"";
 let claims:any=null;try{const part=token.split(".")[1];if(part){const x=part.replace(/-/g,"+").replace(/_/g,"/");claims=JSON.parse(atob(x.padEnd(Math.ceil(x.length/4)*4,"=")));}}catch{}
 if(claims?.role!=="service_role")return out({error:"Unauthorized"},401);
 try{
  const body=await req.json().catch(()=>({}));
  if(body.action==="health"){
   const {data,error}=await db.from("mc_ai_research_reports").select("id,mint,status,model,created_at").order("created_at",{ascending:false}).limit(5);
   if(error)throw error;return out({ok:true,version:VERSION,recent_reports:data??[]});
  }
  if(body.action&&body.action!=="generate"&&body.action!=="run")return out({error:"Unknown action"},400);
  const mint=typeof body.mint==="string"?body.mint:null;
  return out(await run(mint,req.headers.get("x-deepseek-key")??undefined));
 }catch(error){return out({error:String(error).slice(0,500),version:VERSION},500);}
});

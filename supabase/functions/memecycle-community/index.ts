import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!,KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(URL,KEY,{auth:{persistSession:false}});
const allowed=new Set(["https://memecycle.vercel.app","http://localhost:5173"]);
const headers=(origin:string|null)=>({
 "content-type":"application/json","cache-control":"no-store",
 "access-control-allow-origin":origin&&allowed.has(origin)?origin:"https://memecycle.vercel.app",
 "access-control-allow-headers":"authorization, apikey, content-type, x-client-info",
 "access-control-allow-methods":"POST, OPTIONS","vary":"Origin"
});
const out=(body:unknown,status=200,origin:string|null=null)=>new Response(JSON.stringify(body),{status,headers:headers(origin)});
const validMint=(s:unknown)=>typeof s==="string"&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const allowedTypes=new Set(["historical_archive","community_revival","metadata_correction","collectible_certificate","research_contribution"]);
const alphabet="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function decode58(s:string){let n=0n;for(const c of s){const v=alphabet.indexOf(c);if(v<0)throw new Error("Invalid base58");n=n*58n+BigInt(v);}const bytes:number[]=[];while(n>0n){bytes.unshift(Number(n&255n));n>>=8n;}for(let i=0;i<s.length&&s[i]==="1";i++)bytes.unshift(0);return new Uint8Array(bytes);}
function decode64(s:string){const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
function cleanEvidence(value:unknown){if(!Array.isArray(value))return[];return value.slice(0,10).flatMap((x:any)=>{try{const u=new URL(String(x?.url??""));if((u.protocol==="https:"||u.protocol==="http:")&&u.href.length<=1000)return[{type:"url",url:u.href}];}catch{}return[];});}
Deno.serve(async req=>{
 const origin=req.headers.get("origin");
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=="POST")return out({error:"POST required"},405,origin);
 if(origin&&!allowed.has(origin))return out({error:"Origin not allowed"},403,origin);
 if(!KEY)return out({error:"Community verification is not configured"},503,origin);
 try{
  const body=await req.json(),action=body.action;
  if(action==="challenge"){
   const wallet=String(body.wallet??""),mint=body.mint,caseType=body.case_type,description=String(body.description??"").slice(0,3000);
   if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)||!validMint(mint)||!allowedTypes.has(caseType))return out({error:"Invalid wallet, mint or submission type"},400,origin);
   if(description.length<5)return out({error:"Please provide a little more context"},400,origin);
   const since=new Date(Date.now()-60*60*1000).toISOString();
   const {count}=await db.from("mc_wallet_challenges").select("id",{count:"exact",head:true}).eq("wallet",wallet).gte("created_at",since);
   if((count??0)>=5)return out({error:"Please wait before requesting another wallet challenge"},429,origin);
   const evidence=cleanEvidence(body.evidence),id=crypto.randomUUID(),issued=new Date(),expires=new Date(Date.now()+5*60*1000),domain="memecycle.vercel.app";
   const message=[ "MEMECYCLE COMMUNITY SUBMISSION",`Domain: ${domain}`,`Wallet: ${wallet}`,`Token mint: ${mint}`,`Submission type: ${caseType}`,`Challenge: ${id}`,`Issued at: ${issued.toISOString()}`,`Expires at: ${expires.toISOString()}`,"This signature proves control of the submitting wallet only. It does not prove ownership or authority over the token." ].join("\n");
   const {error}=await db.from("mc_wallet_challenges").insert({id,wallet,mint,case_type:caseType,title:"Community submission",description,evidence,message,expires_at:expires.toISOString()});
   if(error)throw error;
   return out({challenge_id:id,message,expires_at:expires.toISOString()},200,origin);
  }
  if(action==="submit"){
   const id=String(body.challenge_id??""),signature=String(body.signature??"");
   if(!/^[0-9a-f-]{36}$/i.test(id)||signature.length<80||signature.length>100)return out({error:"Invalid challenge or signature"},400,origin);
   const {data:c,error}=await db.from("mc_wallet_challenges").select("*").eq("id",id).maybeSingle();
   if(error)throw error;
   if(!c||c.consumed_at||new Date(c.expires_at).getTime()<Date.now())return out({error:"Challenge expired or already used. Please sign a new request."},409,origin);
   let verified=false;
   try{
    const key=await crypto.subtle.importKey("raw",decode58(c.wallet),{name:"Ed25519"},false,["verify"]);
    verified=await crypto.subtle.verify("Ed25519",key,decode64(signature),new TextEncoder().encode(c.message));
   }catch{verified=false;}
   if(!verified)return out({error:"Wallet signature could not be verified"},401,origin);
   const now=new Date().toISOString();
   const {data:consumed,error:consumeError}=await db.from("mc_wallet_challenges").update({consumed_at:now,signature}).eq("id",id).is("consumed_at",null).gt("expires_at",now).select("id").maybeSingle();
   if(consumeError)throw consumeError;
   if(!consumed)return out({error:"Challenge was already used"},409,origin);
   const {data:created,error:insertError}=await db.from("mc_reclamation_cases").insert({
    mint:c.mint,case_type:c.case_type,title:c.title,description:c.description,evidence:c.evidence,
    submitter_wallet:c.wallet,submitter_wallet_verified_at:now,submitter_wallet_signature:signature
   }).select("id,mint,review_status,submitter_wallet").single();
   if(insertError)throw insertError;
   return out({ok:true,case:created,verification:"wallet_control_verified",authority:"not_established"},201,origin);
  }
  return out({error:"Unknown action"},400,origin);
 }catch(e){return out({error:"Could not process community submission",detail:String(e).slice(0,240)},500,origin);}
});
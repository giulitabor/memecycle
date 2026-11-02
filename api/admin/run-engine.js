export const config={maxDuration:60};
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!service)return res.status(503).json({error:"Admin engine runner is not configured."});
 const auth=String(req.headers.authorization||"");
 if(!auth.startsWith("Bearer "))return res.status(401).json({error:"Sign in as an administrator."});
 const {createClient}=await import("@supabase/supabase-js");
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:userData,error:userError}=await admin.auth.getUser(auth.slice(7));
 if(userError)return res.status(401).json({error:"Your administrator session could not be verified. Please sign out and sign in again."});
 if(userData.user?.app_metadata?.role!=="admin")return res.status(403).json({error:"Administrator access required."});
 const action=req.body?.action;
 if(action!=="discover"&&action!=="monitor")return res.status(400).json({error:"Choose discovery or monitor."});
 const since=new Date(Date.now()-5*60*1000).toISOString();
 const runType=action==="discover"?"discovery":"monitor";
 const {count,error:countError}=await admin.from("mc_ingestion_runs").select("id",{count:"exact",head:true}).eq("run_type",runType).gte("started_at",since);
 if(countError)return res.status(500).json({error:"Could not check recent run limits."});
 if((count||0)>0)return res.status(429).json({error:"A run of this type started in the last five minutes. Please wait before retrying."});
 try{
  const body={action:action==="discover"?"discover":"monitor",limit:action==="discover"?30:10,backfill_limit:2};
  if(action==="monitor"&&process.env.HELIUS_RPC)body.rpc_url=process.env.HELIUS_RPC;
  const response=await fetch(`${(url.endsWith('/')?url.slice(0,-1):url)}/functions/v1/memecycle-${action==="discover"?"worker":"monitor"}`,{
   method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${service}`,"apikey":service},
   body:JSON.stringify(body),signal:AbortSignal.timeout(55000)
  });
  const result=await response.json().catch(()=>({error:"Worker returned a non-JSON response."}));
  return res.status(response.status).json(result);
 }catch(e){return res.status(502).json({error:"Could not complete the MEMECYCLE engine run.",detail:String(e).slice(0,240)});}
}
export const config={maxDuration:60};
export default async function handler(req,res){
 if(req.method!=="GET"&&req.method!=="POST"){res.setHeader("Allow","GET, POST");return res.status(405).json({error:"Method not allowed"});}
 const secret=process.env.CRON_SECRET,service=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
 if(!secret||!service||!url)return res.status(503).json({error:"Historical archive worker is not configured.",required_environment:["CRON_SECRET","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_URL"]});
 if(req.headers.authorization!==`Bearer ${secret}`)return res.status(401).json({error:"Unauthorized"});
 try{
  const {createClient}=await import("@supabase/supabase-js");
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const since=new Date(Date.now()-6*60*60*1000).toISOString();
  const {count,error}=await admin.from("mc_ingestion_runs").select("id",{count:"exact",head:true}).eq("run_type","backfill").gte("started_at",since);
  if(error)return res.status(500).json({error:"Could not check historical backfill run limits."});
  if((count||0)>0)return res.status(429).json({error:"A historical archive backfill has already started in the last six hours."});
  const response=await fetch(`${url.replace(/\/$/,"")}/functions/v1/memecycle-worker`,{
   method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${service}`,"apikey":service},
   body:JSON.stringify({action:"archive_backfill",pages_per_config:2}),signal:AbortSignal.timeout(55000)
  });
  const result=await response.json().catch(()=>({error:"Worker returned a non-JSON response."}));
  return res.status(response.status).json(result);
 }catch(error){return res.status(502).json({error:"Could not reach the historical archive worker.",detail:String(error).slice(0,260)});}
}

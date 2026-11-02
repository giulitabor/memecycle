export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const secret=process.env.CRON_SECRET,serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY,supabaseUrl=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
  if(!secret||!serviceRoleKey||!supabaseUrl) return res.status(503).json({error:"Monitoring worker is not configured.",required_environment:["CRON_SECRET","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_URL"]});
  if(req.headers.authorization!==`Bearer ${secret}`) return res.status(401).json({error:"Unauthorized"});
  try {
    const r=await fetch(`${supabaseUrl.replace(/\\/$/,"")}/functions/v1/memecycle-monitor`,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${serviceRoleKey}`,"apikey":serviceRoleKey},body:JSON.stringify({action:"monitor",limit:50,rpc_url:process.env.HELIUS_RPC||null})});
    const body=await r.json().catch(()=>({})); return res.status(r.status).json(body);
  } catch(e) { return res.status(502).json({error:"Could not reach MEMECYCLE monitor.",detail:String(e).slice(0,300)}); }
}
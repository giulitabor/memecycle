export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Method not allowed" }); }
  const secret=process.env.CRON_SECRET,serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY,supabaseUrl=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
  if(!secret||!serviceRoleKey||!supabaseUrl) return res.status(503).json({error:"Discovery worker is not configured.",required_environment:["CRON_SECRET","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_URL"]});
  if(req.headers.authorization!==`Bearer ${secret}`) return res.status(401).json({error:"Unauthorized"});
  try {
    const r=await fetch(`${supabaseUrl.replace(/\/$/,"")}/functions/v1/memecycle-worker`,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${serviceRoleKey}`,"apikey":serviceRoleKey,"x-bitquery-token":process.env.BITQUERY_TOKEN||""},body:JSON.stringify({action:"discover",limit:30})});
    const body=await r.json().catch(()=>({})); return res.status(r.status).json(body);
  } catch(e) { return res.status(502).json({error:"Could not reach MEMECYCLE worker.",detail:String(e).slice(0,300)}); }
}
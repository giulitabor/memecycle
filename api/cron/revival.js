export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const secret = process.env.CRON_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const rpcUrl = process.env.HELIUS_RPC;
  if (!secret || !serviceRoleKey || !supabaseUrl || !rpcUrl) {
    return res.status(503).json({
      error: "Revival investigator is not configured.",
      required_environment: ["CRON_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL", "HELIUS_RPC"]
    });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const baseUrl = new URL(supabaseUrl);
    if (baseUrl.protocol !== "https:" || !baseUrl.hostname.endsWith(".supabase.co")) {
      return res.status(500).json({ error: "SUPABASE_URL must be a valid HTTPS Supabase project URL." });
    }
    const endpoint = `${baseUrl.origin}/functions/v1/memecycle-revival`;
    const workerResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey
      },
      body: JSON.stringify({ action: "investigate", limit: 3, rpc_url: rpcUrl }),
      signal: AbortSignal.timeout(250000)
    });
    const body = await workerResponse.json().catch(() => ({ error: "Revival investigator returned a non-JSON response." }));
    return res.status(workerResponse.status).json({
      ...body,
      cron_triggered_at: new Date().toISOString(),
      cron_route: "revival"
    });
  } catch (error) {
    return res.status(502).json({
      error: "Could not reach MEMECYCLE revival investigator.",
      detail: String(error).slice(0, 300)
    });
  }
}

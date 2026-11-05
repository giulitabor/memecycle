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
      error: "Pipeline verification is not configured.",
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
    const invoke = async (slug, body, extraHeaders = {}) => {
      const response = await fetch(`${baseUrl.origin}/functions/v1/${slug}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
          ...extraHeaders
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90000)
      });
      const payload = await response.json().catch(() => ({ error: "Worker returned a non-JSON response." }));
      return { http_status: response.status, ok: response.ok, payload };
    };

    const discovery = await invoke("memecycle-worker", { action: "discover", limit: 30 }, {
      "x-bitquery-token": process.env.BITQUERY_TOKEN || ""
    });
    if (!discovery.ok) return res.status(502).json({ pipeline_status: "stopped", failed_stage: "discovery", discovery });

    const monitoring = await invoke("memecycle-monitor", {
      action: "monitor", limit: 1, backfill_limit: 0, rpc_url: rpcUrl
    });
    if (!monitoring.ok) return res.status(502).json({ pipeline_status: "stopped", failed_stage: "monitor", discovery, monitoring });

    const revival = await invoke("memecycle-revival", {
      action: "investigate", limit: 1, rpc_url: rpcUrl
    });
    if (!revival.ok) return res.status(502).json({ pipeline_status: "stopped", failed_stage: "revival", discovery, monitoring, revival });

    const statuses = [discovery.payload?.status, monitoring.payload?.status, revival.payload?.status];
    const pipelineStatus = statuses.every(status => status === "succeeded") ? "succeeded" : "completed_with_warnings";
    return res.status(200).json({
      pipeline_status: pipelineStatus,
      cron_route: "verify-pipeline",
      triggered_at: new Date().toISOString(),
      safety: { publication: false, outreach: false, wallet_actions: false },
      stages: { discovery, monitoring, revival }
    });
  } catch (error) {
    return res.status(502).json({
      error: "MEMECYCLE pipeline verification failed.",
      detail: String(error).slice(0, 400)
    });
  }
}

const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const short=m=>m&&m.length>18?m.slice(0,8)+"…"+m.slice(-6):m||"—";
export function initAdminConsole(db){
 const app=document.querySelector("#app");
 if(!db){app.innerHTML='<main class="admin-shell"><section class="admin-card"><h1>MEMECYCLE Admin</h1><p>Database connection is not configured.</p></section></main>';return;}
 let session=null,cases=[];
 app.innerHTML=`<main class="admin-shell">
  <header class="admin-top"><a class="brand" href="/"><span class="brand-mark">M</span><span>MEME<span class="green">CYCLE</span><small>RESEARCH OPERATIONS</small></span></a><span class="admin-badge">PRIVATE ADMIN CONSOLE</span></header>
  <section id="admin-login" class="admin-card"><div class="eyebrow">SECURE WORKSPACE</div><h1>Research & recovery</h1><p>Sign in with an authorised MEMECYCLE administrator account. No wallet connection is required.</p>
   <form id="admin-login-form" class="admin-form"><label>Email<input id="admin-email" type="email" autocomplete="username" required></label><label>Password<input id="admin-password" type="password" autocomplete="current-password" required></label><button class="button primary" type="submit">Sign in</button></form><p id="admin-login-message" class="admin-message" role="status"></p>
  </section>
  <section id="admin-workspace" hidden>
   <div class="admin-heading"><div><div class="eyebrow">MEMECYCLE / OPERATIONS</div><h1>Research & recovery desk</h1><p>Evidence-led investigation. Authority and consent gates enforced.</p></div><button id="admin-signout" class="button ghost">Sign out</button></div>
   <div class="admin-grid">
    <section class="admin-card"><div class="eyebrow">01 — RESEARCH</div><h2>Generate token dossier</h2><p>Runs the evidence-grounded analyst on the selected archive token.</p><form id="admin-research-form" class="admin-form"><label>Solana mint<input id="research-mint" required maxlength="44" placeholder="Token mint address"></label><button class="button primary" type="submit">Run research</button></form><p id="research-message" class="admin-message" role="status"></p></section>
    <section class="admin-card"><div class="eyebrow">02 — RECOVERY</div><h2>Open a revival case</h2><p>Creates an internal case. It does not contact anyone or perform on-chain actions.</p><form id="admin-case-form" class="admin-form"><label>Solana mint<input id="case-mint" required maxlength="44" placeholder="Token mint address"></label><button class="button primary" type="submit">Create case</button></form><p id="case-message" class="admin-message" role="status"></p></section>
   </div>
   <section class="admin-card"><div class="admin-section-head"><div><div class="eyebrow">03 — OPPORTUNITY QUEUE</div><h2>Ranked revival research candidates</h2></div><button id="admin-refresh-opportunities" class="button ghost">Refresh</button></div><div id="admin-opportunities" class="admin-list">Loading opportunities…</div></section>
   <section class="admin-card"><div class="admin-section-head"><div><div class="eyebrow">03 — CASE REGISTER</div><h2>Recovery cases</h2></div><button id="admin-refresh-cases" class="button ghost">Refresh</button></div><div id="admin-cases" class="admin-list">Loading cases…</div></section>
   <div class="admin-grid">
    <section class="admin-card"><div class="eyebrow">04 — IDENTITY & CONSENT</div><h2>Update project verification</h2><form id="admin-identity-form" class="admin-form">
     <label>Token mint<input id="identity-mint" required maxlength="44"></label><label>Project name<input id="identity-name" maxlength="180"></label><label>Official website<input id="identity-website" type="url" placeholder="https://…"></label>
     <label>Identity status<select id="identity-status"><option>unverified</option><option>candidate</option><option>corroborated</option><option>verified</option><option>disputed</option><option>unreachable</option></select></label>
     <label>Authority status<select id="identity-authority"><option>unknown</option><option>wallet_control_verified</option><option>candidate_authority</option><option>independently_verified</option><option>disputed</option><option>revoked</option></select></label>
     <label class="admin-check"><input id="authority-human-confirm" type="checkbox"> I have reviewed the evidence and independently verified project authority</label>
     <label>Consent status<select id="identity-consent"><option>not_requested</option><option>requested</option><option>granted</option><option>declined</option><option>withdrawn</option></select></label>
     <label class="admin-check"><input id="consent-human-confirm" type="checkbox"> I have reviewed the explicit consent evidence from the verified authority</label>
     <label>Evidence JSON<textarea id="identity-evidence" rows="5" placeholder='[{"type":"authority","url":"https://…","notes":"…"},{"type":"explicit_project_consent","url":"https://…","notes":"…"}]'></textarea></label>
     <label>Public contact channels JSON<textarea id="identity-contacts" rows="3" placeholder='[{"type":"official_email","value":"public contact","source_url":"https://…","verified":false}]'></textarea></label>
     <button class="button primary" type="submit">Save verification record</button></form><p id="identity-message" class="admin-message" role="status"></p></section>
    <section class="admin-card"><div class="eyebrow">05 — CASE GOVERNANCE</div><h2>Move a case forward</h2><form id="admin-transition-form" class="admin-form">
     <label>Case ID<input id="transition-case-id" required></label><label>Next status<select id="transition-status"><option>identity_check</option><option>awaiting_consent</option><option>consent_confirmed</option><option>planning</option><option>approved</option><option>on_hold</option><option>closed</option><option>rejected</option></select></label>
     <label>Approval note (required for approval)<textarea id="approval-note" rows="3"></textarea></label><label class="admin-check"><input id="confirm-approval" type="checkbox"> I explicitly approve this recovery plan</label>
     <button class="button primary" type="submit">Update case status</button></form><p id="transition-message" class="admin-message" role="status"></p>
     <div class="admin-divider"></div><h3>Recovery plan (consent-gated)</h3><form id="admin-plan-form" class="admin-form"><label>Case ID<input id="plan-case-id" required></label><label>Plan JSON<textarea id="recovery-plan" rows="4" placeholder='{"workstreams":[],"success_criteria":[],"dependencies":[]} '></textarea></label><label>Risk register JSON<textarea id="recovery-risks" rows="3" placeholder='[{"risk":"...","mitigation":"..."}]'></textarea></label><button class="button ghost" type="submit">Save recovery plan</button></form><p id="plan-message" class="admin-message" role="status"></p>
     <div class="admin-divider"></div><h3>Add internal case note</h3><form id="admin-note-form" class="admin-form"><label>Case ID<input id="note-case-id" required></label><label>Note<textarea id="case-note" rows="3" required></textarea></label><button class="button ghost" type="submit">Save note</button></form><p id="note-message" class="admin-message" role="status"></p>
    </section>
   </div>
   <section class="admin-card"><div class="admin-section-head"><div><div class="eyebrow">06 — RESEARCH LIBRARY</div><h2>Latest dossiers</h2></div><button id="admin-refresh-reports" class="button ghost">Refresh</button></div><div id="admin-reports" class="admin-list">Loading reports…</div></section>
   <p class="admin-footnote">Wallet control is not project authority. Revival planning requires independent authority verification and explicit project consent. Approval here records an internal decision only; it does not execute transactions, contact third parties, deploy tokens or transfer funds.</p>
  </section>
 </main>`;
 const login=app.querySelector("#admin-login"),workspace=app.querySelector("#admin-workspace");
 const msg=id=>app.querySelector("#"+id);
 const say=(id,value,error=false)=>{const el=msg(id);el.textContent=value;el.classList.toggle("error",error)};
 async function api(path,payload){
  const {data}=await db.auth.getSession();const token=data.session?.access_token;if(!token)throw new Error("Your session has expired. Sign in again.");
  const r=await fetch(path,{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+token},body:JSON.stringify(payload)});
  const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||"Admin request failed.");return body;
 }
 async function verifyAndShow(next){
  session=next;
  if(!session?.user){login.hidden=false;workspace.hidden=true;return;}
  const {data,error}=await db.auth.getUser();if(error||data.user?.app_metadata?.role!=="admin"){login.hidden=false;workspace.hidden=true;say("admin-login-message","This account does not have the MEMECYCLE admin role.",true);return;}
  login.hidden=true;workspace.hidden=false;await Promise.all([loadOpportunities(),loadCases(),loadReports()]);
 }
 async function loadOpportunities(){
  const host=msg("admin-opportunities");host.textContent="Loading opportunities…";
  try{const r=await api("/api/admin/recovery",{action:"opportunities",limit:50});const rows=r.opportunities||[];
   if(!rows.length){host.innerHTML='<p class="admin-empty">No revival assessments have been recorded yet. The queue fills after the on-chain investigator completes its first runs.</p>';return;}
   host.innerHTML=rows.map(x=>`<article class="admin-case"><div><b>${esc(x.token?.name||short(x.mint))}</b><small>${esc(x.token?.symbol||"")} · ${esc(short(x.mint))}</small></div><span class="admin-state">${esc(x.assessment_status)} · opportunity ${x.opportunity_score??"—"}/100</span><div class="admin-case-meta"><span>Dormancy: ${x.dormancy_score??"—"}</span><span>Viability: ${x.revival_viability_score??"—"}</span><span>Community: ${x.community_signal_score??"—"}</span><span>Authority: ${x.authority_clarity_score??"—"}</span><span>Confidence: ${x.data_confidence_score??"—"}%</span></div><small>Authority: ${esc(x.identity?.authority_status||"unknown")} · Consent: ${esc(x.identity?.consent_status||"not_requested")}</small><button class="button ghost" data-open-opportunity="${esc(x.mint)}" data-assessment="${esc(x.id)}" ${x.case?"disabled":""}>${x.case?"Case already open":"Open recovery case"}</button></article>`).join("");
  }catch(e){host.textContent=e.message;}
 }
 async function loadCases(){
  const host=msg("admin-cases");host.textContent="Loading cases…";
  try{const r=await api("/api/admin/recovery",{action:"list",limit:50});cases=r.cases||[];
   if(!cases.length){host.innerHTML='<p class="admin-empty">No recovery cases yet. Research candidates can be opened above.</p>';return;}
   host.innerHTML=cases.map(c=>`<article class="admin-case"><div><b>${esc(c.token?.name||short(c.mint))}</b><small>${esc(c.token?.symbol||"")} · ${esc(short(c.mint))}</small></div><span class="admin-state">${esc(c.case_status)}</span><div class="admin-case-meta"><span>Authority: ${esc(c.identity?.authority_status||"unknown")}</span><span>Consent: ${esc(c.identity?.consent_status||"not_requested")}</span><span>Liquidity: ${c.token?.liquidity_usd==null?"—":"$"+Number(c.token.liquidity_usd).toLocaleString()}</span></div><code>${esc(c.id)}</code><button class="button ghost" data-use-case="${esc(c.id)}" data-mint="${esc(c.mint)}">Use this case</button></article>`).join("");
  }catch(e){host.textContent=e.message;}
 }
 async function loadReports(){
  const host=msg("admin-reports");host.textContent="Loading reports…";
  try{const r=await api("/api/admin/research",{action:"list",limit:20});const reports=r.reports||[];
   if(!reports.length){host.innerHTML='<p class="admin-empty">No research dossiers saved yet.</p>';return;}
   host.innerHTML=reports.map(x=>`<article class="admin-report"><div><b>${esc(x.report?.token_identity?.name||x.mint)}</b><small>${esc(x.model)} · ${esc(new Date(x.created_at).toLocaleString())}</small></div><span class="admin-state">${esc(x.report?.overall_assessment||x.status)}</span><p>${esc(x.summary)}</p><details><summary>Open evidence report</summary><pre>${esc(JSON.stringify(x.report,null,2))}</pre></details></article>`).join("");
  }catch(e){host.textContent=e.message;}
 }
 app.querySelector("#admin-login-form").addEventListener("submit",async e=>{e.preventDefault();const b=e.currentTarget.querySelector("button");b.disabled=true;try{const {data,error}=await db.auth.signInWithPassword({email:msg("admin-email").value.trim(),password:msg("admin-password").value});if(error)throw error;await verifyAndShow(data.session);}catch(err){say("admin-login-message",err.message,true);}finally{b.disabled=false;}});
 app.querySelector("#admin-signout").addEventListener("click",async()=>{await db.auth.signOut();await verifyAndShow(null);});
 app.querySelector("#admin-research-form").addEventListener("submit",async e=>{e.preventDefault();const b=e.currentTarget.querySelector("button");b.disabled=true;say("research-message","Generating evidence dossier…");try{const r=await api("/api/admin/research",{action:"research",mint:msg("research-mint").value.trim()});say("research-message","Research saved: "+r.report.id);await loadReports();}catch(err){say("research-message",err.message,true);}finally{b.disabled=false;}});
 app.querySelector("#admin-case-form").addEventListener("submit",async e=>{e.preventDefault();const b=e.currentTarget.querySelector("button");b.disabled=true;try{const r=await api("/api/admin/recovery",{action:"create_case",mint:msg("case-mint").value.trim()});say("case-message","Case created: "+r.case.id);await loadCases();}catch(err){say("case-message",err.message,true);}finally{b.disabled=false;}});
 app.querySelector("#admin-identity-form").addEventListener("submit",async e=>{e.preventDefault();const b=e.currentTarget.querySelector("button");b.disabled=true;try{const raw=msg("identity-evidence").value.trim(),evidence=raw?JSON.parse(raw):undefined;if(evidence!==undefined&&!Array.isArray(evidence))throw new Error("Evidence must be a JSON array.");const contactRaw=msg("identity-contacts").value.trim(),contact_channels=contactRaw?JSON.parse(contactRaw):undefined;if(contact_channels!==undefined&&!Array.isArray(contact_channels))throw new Error("Public contact channels must be a JSON array.");const payload={action:"update_identity",mint:msg("identity-mint").value.trim(),project_name:msg("identity-name").value.trim(),website_url:msg("identity-website").value.trim(),identity_status:msg("identity-status").value,authority_status:msg("identity-authority").value,consent_status:msg("identity-consent").value,human_review_confirmed:msg("authority-human-confirm").checked,consent_review_confirmed:msg("consent-human-confirm").checked};if(evidence!==undefined)payload.evidence=evidence;if(contact_channels!==undefined)payload.contact_channels=contact_channels;const r=await api("/api/admin/recovery",payload);say("identity-message","Verification record saved. Authority and consent remain separate gates.");await loadCases();}catch(err){say("identity-message",err.message,true);}finally{b.disabled=false;}});
 app.querySelector("#admin-transition-form").addEventListener("submit",async e=>{e.preventDefault();const b=e.currentTarget.querySelector("button");b.disabled=true;try{const next=msg("transition-status").value;const r=await api("/api/admin/recovery",{action:"transition_case",case_id:msg("transition-case-id").value.trim(),next_status:next,confirm_approval:msg("confirm-approval").checked,approval_note:msg("approval-note").value.trim()});say("transition-message","Case updated to "+r.case.case_status);await loadCases();}catch(err){say("transition-message",err.message,true);}finally{b.disabled=false;}});
 app.querySelector("#admin-plan-form").addEventListener("submit",async e=>{e.preventDefault();try{const planRaw=msg("recovery-plan").value.trim(),riskRaw=msg("recovery-risks").value.trim(),plan=planRaw?JSON.parse(planRaw):{},risk_register=riskRaw?JSON.parse(riskRaw):[];if(!Array.isArray(risk_register))throw new Error("Risk register must be a JSON array.");const r=await api("/api/admin/recovery",{action:"update_plan",case_id:msg("plan-case-id").value.trim(),plan,risk_register});say("plan-message","Recovery plan saved for case "+r.case.id);}catch(err){say("plan-message",err.message,true);}});
 app.querySelector("#admin-note-form").addEventListener("submit",async e=>{e.preventDefault();try{await api("/api/admin/recovery",{action:"add_note",case_id:msg("note-case-id").value.trim(),note:msg("case-note").value.trim()});say("note-message","Internal note saved.");e.currentTarget.reset();}catch(err){say("note-message",err.message,true);}});
 app.querySelector("#admin-cases").addEventListener("click",e=>{const b=e.target.closest("[data-use-case]");if(!b)return;msg("transition-case-id").value=b.dataset.useCase;msg("note-case-id").value=b.dataset.useCase;msg("plan-case-id").value=b.dataset.useCase;msg("identity-mint").value=b.dataset.mint;});
 app.querySelector("#admin-opportunities").addEventListener("click",async e=>{const b=e.target.closest("[data-open-opportunity]");if(!b)return;b.disabled=true;try{const r=await api("/api/admin/recovery",{action:"create_case",mint:b.dataset.openOpportunity,assessment_id:b.dataset.assessment});say("case-message","Case created: "+r.case.id);await Promise.all([loadOpportunities(),loadCases()]);}catch(err){say("case-message",err.message,true);b.disabled=false;}});
 app.querySelector("#admin-refresh-opportunities").addEventListener("click",loadOpportunities);
 app.querySelector("#admin-refresh-cases").addEventListener("click",loadCases);app.querySelector("#admin-refresh-reports").addEventListener("click",loadReports);
 db.auth.getSession().then(({data})=>verifyAndShow(data.session));db.auth.onAuthStateChange((_event,next)=>queueMicrotask(()=>verifyAndShow(next)));
}

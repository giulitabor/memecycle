const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const compact = value => value == null ? '—' : new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(Number(value));
const date = value => value ? new Date(value).toLocaleString() : '—';
const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''; } catch { return ''; } };

export function initArchiveExperience(db) {
  const results = document.querySelector('#results');
  if (!results) return;

  const detail = document.createElement('section');
  detail.id = 'token-detail';
  detail.className = 'token-detail';
  detail.hidden = true;
  results.after(detail);

  async function openToken(mint) {
    detail.hidden = false;
    detail.innerHTML = '<div class="detail-loading">Loading verified archive history…</div>';
    detail.scrollIntoView({behavior:'smooth',block:'nearest'});
    const [token, snapshots, pairs, events, gaps, classifications] = await Promise.all([
      db.from('mc_tokens').select('mint,name,symbol,image_url,classification,price_usd,market_cap_usd,fdv_usd,liquidity_usd,volume_24h_usd,holder_count,data_completeness,reclamation_score,score_breakdown,score_version,discovery_sources,source_provenance,first_seen_at,last_activity_at,updated_at').eq('mint',mint).eq('visibility','public').maybeSingle(),
      db.from('mc_snapshots').select('observed_at,price_usd,market_cap_usd,liquidity_usd,volume_24h_usd,source').eq('mint',mint).order('observed_at',{ascending:false}).limit(60),
      db.from('mc_token_pairs').select('pair_address,dex_id,url,price_usd,liquidity_usd,volume_24h_usd,observed_at').eq('mint',mint).order('observed_at',{ascending:false}).limit(10),
      db.from('mc_token_events').select('event_type,event_at,source,confidence,details').eq('mint',mint).order('event_at',{ascending:false}).limit(20),
      db.from('mc_data_gaps').select('field_name,reason,first_detected_at,resolved_at').eq('mint',mint).order('first_detected_at',{ascending:false}).limit(20),
      db.from('mc_classifications').select('classifier_version,classification,score,explanation,evidence,created_at').eq('mint',mint).order('created_at',{ascending:false}).limit(10)
    ]);
    if (token.error || !token.data) { detail.innerHTML = '<div class="detail-error">This record is not currently published or could not be loaded.</div>'; return; }
    const t=token.data, ss=snapshots.data||[], pp=pairs.data||[], ee=events.data||[], gg=gaps.data||[], cc=classifications.data||[];
    const vals=[...ss].reverse().map(x=>Number(x.price_usd)).filter(Number.isFinite);
    const min=Math.min(...vals), max=Math.max(...vals), range=max-min||1;
    const points=vals.map((v,i)=>`${(i/Math.max(vals.length-1,1))*100},${36-((v-min)/range)*30}`).join(' ');
    const score= t.reclamation_score == null ? 'Not scored' : `${t.reclamation_score}/100`;
    detail.innerHTML=`
      <div class="detail-head"><div><div class="eyebrow">PUBLIC ARCHIVE RECORD</div><h3>${esc(t.name||'Unknown token')} <span>${esc(t.symbol||'')}</span></h3><code>${esc(t.mint)}</code><button type="button" class="filter" data-watchlist-add="${esc(t.mint)}">Save to my watchlist</button></div><button class="detail-close" type="button" aria-label="Close details">×</button></div>
      <div class="detail-metrics"><div><small>CLASSIFICATION</small><b>${esc(t.classification)}</b></div><div><small>RESEARCH SCORE</small><b>${score}</b></div><div><small>LIQUIDITY</small><b>$${compact(t.liquidity_usd)}</b></div><div><small>DATA COVERAGE</small><b>${Number(t.data_completeness||0)}%</b></div></div>
      <div class="detail-grid">
        <article class="detail-card"><h4>Price observations</h4><p>Recorded snapshots only. No interpolation or fabricated historical values.</p>${vals.length>1?`<svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Price observation trend"><polyline points="${points}" fill="none" stroke="#7ce3a2" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`:'<div class="detail-muted">Not enough price observations to plot a trend.</div>'}<div class="detail-list">${ss.slice(0,8).map(x=>`<div><span>${date(x.observed_at)}</span><b>${x.price_usd==null?'—':'$'+Number(x.price_usd).toPrecision(6)}</b></div>`).join('')||'<p>No snapshots recorded.</p>'}</div></article>
        <article class="detail-card"><h4>Classification history</h4>${cc.map(x=>`<div class="history-item"><b>${esc(x.classification)} · ${x.score??'—'}/100</b><small>${esc(x.classifier_version)} · ${date(x.created_at)}</small><p>${esc(x.explanation||'')}</p></div>`).join('')||'<p>No classification history.</p>'}<h4>Score evidence</h4><pre>${esc(JSON.stringify(t.score_breakdown||{},null,2))}</pre></article>
        <article class="detail-card"><h4>Market pairs</h4>${pp.map(x=>`<div class="history-item"><b>${esc(x.dex_id||'DEX')} · $ ${compact(x.liquidity_usd)} liquidity</b><small>${date(x.observed_at)} · ${esc(x.pair_address)}</small>${safeUrl(x.url)?`<a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener noreferrer">Open market pair ↗</a>`:''}</div>`).join('')||'<p>No pair records.</p>'}</article>
        <article class="detail-card"><h4>Events & data gaps</h4>${ee.map(x=>`<div class="history-item"><b>${esc(x.event_type)}</b><small>${date(x.event_at)} · ${esc(x.confidence)} · ${esc(x.source)}</small></div>`).join('')||'<p>No recorded events.</p>'}${gg.map(x=>`<div class="gap-item"><b>Missing: ${esc(x.field_name)}</b><small>${esc(x.reason)} · ${x.resolved_at?'Resolved':'Unresolved'}</small></div>`).join('')||'<p>No outstanding data gaps recorded.</p>'}</article>
      </div>
      <div class="detail-foot">First observed: ${date(t.first_seen_at)} · Last updated: ${date(t.updated_at)} · Sources: ${esc((t.discovery_sources||[]).join(', ')||'Not recorded')}<br>Market observations do not prove abandonment, ownership, community status or last on-chain activity.</div>`;
    detail.querySelector('.detail-close').addEventListener('click',()=>{detail.hidden=true;});
  }

  results.addEventListener('click', event => {
    const row=event.target.closest('[data-mint]');
    if(row) openToken(row.dataset.mint);
  });
  results.addEventListener('keydown', event => {
    if((event.key==='Enter'||event.key===' ') && event.target.matches('[data-mint]')) {event.preventDefault();openToken(event.target.dataset.mint);}
  });

  if (!db) return;
  const admin=document.createElement('section');
  admin.className='admin-section wrap';
  admin.innerHTML=`
    <details class="admin-shell"><summary>Archive administration <span>RESTRICTED · STAFF ACCESS</span></summary>
      <div class="admin-content"><p>Sign in with a Supabase Auth account that has the trusted <code>app_metadata.role = admin</code> claim. Public user metadata cannot grant access.</p>
        <form id="admin-login" class="admin-login"><input id="admin-email" type="email" autocomplete="username" placeholder="Admin email" required><input id="admin-password" type="password" autocomplete="current-password" placeholder="Password" required><button class="button primary">Sign in</button></form>
        <div id="admin-status" class="form-message" aria-live="polite"></div>
        <div id="admin-workspace" hidden><div class="admin-toolbar"><b>Review queue</b><div><button data-run-engine="discover" class="filter">Run discovery now</button><button data-run-engine="monitor" class="filter">Run monitor now</button><button data-run-engine="archive_backfill" class="filter">Sample historical archive (400 rows)</button><button id="admin-logout" class="filter">Sign out</button></div></div><div id="admin-cases"></div><h3>AI research desk</h3><p>On-demand AI analysis grounded in stored history and live provider evidence. Reports distinguish observations, provider claims, inferences and unknowns.</p><div id="admin-research-reports"></div><h3>Private discovery candidates</h3><div id="admin-tokens"></div><h3>Discovery sources</h3><p>Provider health and last successful fetch. Pump.fun launch history and Jupiter metadata are best-effort external sources.</p><div id="admin-sources"></div><h3>Automation activity</h3><p>Scheduled discovery and monitoring runs, including errors and historical backfill progress.</p><div id="admin-runs"></div><h3>Potential abandonment candidates</h3><p>Low-confidence leads from old pools, low market activity and sampled holder-account observations. These are not confirmed abandoned tokens.</p><div id="admin-abandonment"></div></div>
      </div>
    </details>`;
  document.querySelector('.footer')?.before(admin);

  const status=admin.querySelector('#admin-status'), workspace=admin.querySelector('#admin-workspace');let adminAccessToken=null;
  const login=admin.querySelector('#admin-login');
  async function loadAdminQueue(){
    const [cases,tokens,runs,abandonment,sources]=await Promise.all([
      db.from('mc_reclamation_cases').select('id,mint,case_type,title,description,evidence,review_status,created_at,submitter_wallet,submitter_wallet_verified_at').in('review_status',['pending','under_review']).order('created_at',{ascending:true}).limit(50),
      db.from('mc_tokens').select('mint,name,symbol,classification,liquidity_usd,updated_at').eq('visibility','private').order('updated_at',{ascending:false}).limit(50),
      db.from('mc_ingestion_runs').select('run_type,status,source_provider,candidates_seen,tokens_upserted,snapshots_inserted,classifications_written,error_count,summary,started_at,finished_at').order('started_at',{ascending:false}).limit(10),
      db.from('mc_abandonment_assessments').select('mint,assessed_at,market_pair_age_days,pool_last_activity_at,pool_activity_age_days,liquidity_usd,volume_24h_usd,jupiter_is_verified,jupiter_organic_score,corroborating_sources,research_summary,research_coverage,community_research_priority,risk_flags,auto_publish_eligible,auto_published,assessment_status').eq('assessment_status','candidate_for_review').order('assessed_at',{ascending:false}).limit(25),
      db.from('mc_discovery_sources').select('source_key,provider,endpoint,enabled,last_success_at,last_error_at,last_error,records_seen').order('provider')
    ]);
    const caseHost=admin.querySelector('#admin-cases'), tokenHost=admin.querySelector('#admin-tokens');
    caseHost.innerHTML=cases.error?`<p class="detail-error">${esc(cases.error.message)}</p>`:(cases.data||[]).map(c=>`<article class="admin-item"><div><b>${esc(c.case_type)} · ${esc(c.mint)}</b><small>${date(c.created_at)} · ${esc(c.review_status)}</small><p>${esc(c.description)}</p><small>${c.submitter_wallet_verified_at?'WALLET SIGNATURE VERIFIED · ': 'WALLET NOT VERIFIED · '}${esc(c.submitter_wallet||'No wallet supplied')} · Signature proves submitter control only, not token ownership</small><small>${(c.evidence||[]).map(e=>safeUrl(e.url)?`<a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener noreferrer">Evidence link ↗</a>`:esc(e.note||'')).join(' · ')}</small></div><div class="admin-actions"><button data-case="${esc(c.id)}" data-status="under_review" class="filter">Take review</button><button data-case="${esc(c.id)}" data-status="approved" class="filter">Approve</button><button data-case="${esc(c.id)}" data-status="rejected" class="filter">Reject</button></div></article>`).join('')||'<p>No pending submissions.</p>';
    tokenHost.innerHTML=tokens.error?`<p class="detail-error">${esc(tokens.error.message)}</p>`:(tokens.data||[]).map(t=>`<article class="admin-item"><div><b>${esc(t.name||'Unknown')} (${esc(t.symbol||'—')})</b><small>${esc(t.mint)} · ${esc(t.classification)} · liquidity ${compact(t.liquidity_usd)}</small></div><div class="admin-actions"><button class="filter" data-research="${esc(t.mint)}">Research with AI</button><button class="button primary" data-publish="${esc(t.mint)}">Publish record</button></div></article>`).join('')||'<p>No private candidates waiting.</p>';
    const researchHost=admin.querySelector('#admin-research-reports');
    try{
      const rr=await fetch('/api/admin/research',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${adminAccessToken||''}`},body:JSON.stringify({action:'list',limit:15})});
      const rd=await rr.json();
      researchHost.innerHTML=!rr.ok?`<p class="detail-error">${esc(rd.error||'Could not load AI research reports.')}</p>`:(rd.reports||[]).map(r=>{
        const report=r.report||{}, findings=Array.isArray(report.findings)?report.findings:[];
        return `<article class="admin-item"><div><b>${esc(report.token_identity?.name||r.mint)} (${esc(report.token_identity?.symbol||'—')}) · ${esc(report.overall_assessment||r.status)}</b><small>${date(r.created_at)} · ${esc(r.model)} · confidence ${esc(report.confidence||'—')}</small><p>${esc(r.summary||'')}</p><small>${findings.length} cited findings · ${(report.data_gaps||[]).length} data gaps · prompt ${esc(r.prompt_version)}</small></div><details><summary>Open full research report</summary><pre>${esc(JSON.stringify(report,null,2))}</pre></details></article>`;
      }).join('')||'<p>No AI research reports yet. Select Research with AI on a private candidate to create the first report.</p>';
    }catch(e){researchHost.innerHTML='<p class="detail-error">AI research reports could not be loaded.</p>';}
    const sourceHost=admin.querySelector('#admin-sources');
    sourceHost.innerHTML=sources.error?`<p class='detail-error'>${esc(sources.error.message)}</p>`:(sources.data||[]).map(x=>`<article class='admin-item'><div><b>${esc(x.source_key)} · ${esc(x.enabled?'enabled':'disabled')}</b><small>${esc(x.provider)} · ${date(x.last_success_at)} · ${x.records_seen??0} records last seen</small><small>${esc(x.endpoint)}</small><small>${x.last_error?esc(x.last_error):'No recorded source error'}</small></div></article>`).join('')||'<p>No discovery sources configured.</p>';
    const runHost=admin.querySelector('#admin-runs');
    runHost.innerHTML=runs.error?`<p class='detail-error'>${esc(runs.error.message)}</p>`:(runs.data||[]).map(r=>`<article class='admin-item'><div><b>${esc(r.run_type)} · ${esc(r.status)}</b><small>${date(r.started_at)} · finished ${date(r.finished_at)}</small><p>${r.tokens_upserted??0} tokens · ${r.snapshots_inserted??0} snapshots · ${r.classifications_written??0} classification changes · ${r.error_count??0} errors</p><small>${esc(r.source_provider||'')}</small></div><small>${esc(JSON.stringify(r.summary||{}))}</small></article>`).join('')||'<p>No automation runs recorded yet.</p>';
    const abandonmentHost=admin.querySelector('#admin-abandonment');
    abandonmentHost.innerHTML=abandonment.error?`<p class='detail-error'>${esc(abandonment.error.message)}</p>`:(abandonment.data||[]).map(a=>`<article class='admin-item'><div><b>${esc(a.mint)}</b><small>${date(a.assessed_at)} · ${esc(a.assessment_status)}</small><p>Pool age ${a.market_pair_age_days==null?'unknown':Math.round(Number(a.market_pair_age_days))+' days'} · last pool activity ${a.pool_activity_age_days==null?'not sampled':Math.round(Number(a.pool_activity_age_days))+' days ago'}</p><p>Liquidity ${compact(a.liquidity_usd)} · 24h volume ${compact(a.volume_24h_usd)} · Jupiter organic score ${a.jupiter_organic_score??'—'} · verified ${a.jupiter_is_verified==null?'unknown':a.jupiter_is_verified?'yes':'no'}</p><p>Evidence coverage ${a.research_coverage??0}/100 · community follow-up priority ${a.community_research_priority??0}/100 (priority score, not a revival probability)</p><small>Sources: ${esc((a.corroborating_sources||[]).join(', '))}</small><p>${esc(a.research_summary||'')}</p><small>Risk flags: ${esc((a.risk_flags||[]).join(' · ')||'None recorded')}</small></div><span class='classification ${a.auto_published?'dormant':'unverified'}'>${a.auto_published?'AUTO-PUBLISHED DORMANT':a.auto_publish_eligible?'ELIGIBLE · NOT PUBLISHED':'REVIEW REQUIRED'}</span></article>`).join('')||'<p>No potential abandonment candidates have met the preliminary research threshold.</p>';
  }
  async function checkSession(session){
    const user=session?.user;
    if(!user){workspace.hidden=true;login.hidden=false;return;}
    if(user.app_metadata?.role!=='admin'){await db.auth.signOut();status.textContent='This account is not authorised for archive administration.';workspace.hidden=true;login.hidden=false;return;}
    adminAccessToken=session.access_token;login.hidden=true;workspace.hidden=false;status.textContent='Authenticated administrator.';await loadAdminQueue();
  }
  login.addEventListener('submit',async e=>{e.preventDefault();status.textContent='Signing in…';const {data,error}=await db.auth.signInWithPassword({email:admin.querySelector('#admin-email').value,password:admin.querySelector('#admin-password').value});if(error){status.textContent='Sign-in failed. Check the account and password.';return;}await checkSession(data.session);});
  admin.querySelector('#admin-logout').addEventListener('click',async()=>{await db.auth.signOut();adminAccessToken=null;status.textContent='Signed out.';workspace.hidden=true;login.hidden=false;});
  admin.addEventListener('click',async e=>{
    const runButton=e.target.closest('[data-run-engine]');
    if(runButton){
      const action=runButton.dataset.runEngine;runButton.disabled=true;status.textContent=action==="discover"?"Running token discovery…":action==="monitor"?"Running lifecycle monitor…":"Sampling historical Pump.fun launch records and storing source references…";
      try{
        const response=await fetch('/api/admin/run-engine',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${adminAccessToken||''}`},body:JSON.stringify({action})});
        const result=await response.json().catch(()=>({error:'The engine returned an unreadable response.'}));
        if(!response.ok)throw new Error(result.error||'Engine run failed.');
        status.textContent=action==="archive_backfill"?`Historical archive sample completed: ${result.total_rows_sampled??0} rows examined, ${result.unique_tokens_upserted??0} token references indexed, ${result.references_upserted??0} source links stored.`:`${action==="discover"?"Discovery":"Monitoring"} completed: ${result.tokens_upserted??result.records_checked??0} tokens checked, ${result.snapshots_inserted??0} snapshots, ${result.errors??result.error_count??result.source_errors?.length??0} errors.`;
        await loadAdminQueue();
      }catch(error){status.textContent=String(error?.message||'Engine run failed.').slice(0,240);}
      finally{runButton.disabled=false;}
      return;
    }
    const researchButton=e.target.closest('[data-research]');
    if(researchButton){
      researchButton.disabled=true;status.textContent='Collecting evidence and running AI research…';
      try{
        const response=await fetch('/api/admin/research',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${adminAccessToken||''}`},body:JSON.stringify({action:'research',mint:researchButton.dataset.research})});
        const result=await response.json().catch(()=>({error:'AI research returned an unreadable response.'}));
        if(!response.ok)throw new Error(result.error||'AI research failed.');
        status.textContent=`AI research saved for ${result.report?.mint||researchButton.dataset.research}. Model: ${result.model}. Evidence coverage: ${result.report?.report?.coverage_score??'not scored'}.`;
        await loadAdminQueue();
      }catch(error){status.textContent=String(error?.message||'AI research failed.').slice(0,260);}
      finally{researchButton.disabled=false;}
      return;
    }
    const caseButton=e.target.closest('[data-case]');
    const publishButton=e.target.closest('[data-publish]');
    if(caseButton){caseButton.disabled=true;const {error}=await db.from('mc_reclamation_cases').update({review_status:caseButton.dataset.status,reviewed_at:new Date().toISOString()}).eq('id',caseButton.dataset.case);status.textContent=error?'Could not update review status.':'Review status saved.';await loadAdminQueue();}
    if(publishButton){publishButton.disabled=true;const {error}=await db.from('mc_tokens').update({visibility:'public'}).eq('mint',publishButton.dataset.publish).eq('visibility','private');status.textContent=error?'Could not publish this record.':'Record published.';await loadAdminQueue();}
  });
  db.auth.getSession().then(({data})=>checkSession(data.session));
  db.auth.onAuthStateChange((_event,session)=>{queueMicrotask(()=>checkSession(session));});
}

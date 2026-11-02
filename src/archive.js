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
      <div class="detail-head"><div><div class="eyebrow">PUBLIC ARCHIVE RECORD</div><h3>${esc(t.name||'Unknown token')} <span>${esc(t.symbol||'')}</span></h3><code>${esc(t.mint)}</code></div><button class="detail-close" type="button" aria-label="Close details">×</button></div>
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
        <div id="admin-workspace" hidden><div class="admin-toolbar"><b>Review queue</b><button id="admin-logout" class="filter">Sign out</button></div><div id="admin-cases"></div><h3>Private discovery candidates</h3><div id="admin-tokens"></div><h3>Automation activity</h3><p>Scheduled discovery and monitoring runs, including errors and historical backfill progress.</p><div id="admin-runs"></div></div>
      </div>
    </details>`;
  document.querySelector('.footer')?.before(admin);

  const status=admin.querySelector('#admin-status'), workspace=admin.querySelector('#admin-workspace');
  const login=admin.querySelector('#admin-login');
  async function loadAdminQueue(){
    const [cases,tokens,runs]=await Promise.all([
      db.from('mc_reclamation_cases').select('id,mint,case_type,title,description,evidence,review_status,created_at').in('review_status',['pending','under_review']).order('created_at',{ascending:true}).limit(50),
      db.from('mc_tokens').select('mint,name,symbol,classification,liquidity_usd,updated_at').eq('visibility','private').order('updated_at',{ascending:false}).limit(50),
      db.from('mc_ingestion_runs').select('run_type,status,source_provider,candidates_seen,tokens_upserted,snapshots_inserted,classifications_written,error_count,summary,started_at,finished_at').order('started_at',{ascending:false}).limit(10)
    ]);
    const caseHost=admin.querySelector('#admin-cases'), tokenHost=admin.querySelector('#admin-tokens');
    caseHost.innerHTML=cases.error?`<p class="detail-error">${esc(cases.error.message)}</p>`:(cases.data||[]).map(c=>`<article class="admin-item"><div><b>${esc(c.case_type)} · ${esc(c.mint)}</b><small>${date(c.created_at)} · ${esc(c.review_status)}</small><p>${esc(c.description)}</p><small>${(c.evidence||[]).map(e=>safeUrl(e.url)?`<a href="${esc(safeUrl(e.url))}" target="_blank" rel="noopener noreferrer">Evidence link ↗</a>`:esc(e.note||'')).join(' · ')}</small></div><div class="admin-actions"><button data-case="${esc(c.id)}" data-status="under_review" class="filter">Take review</button><button data-case="${esc(c.id)}" data-status="approved" class="filter">Approve</button><button data-case="${esc(c.id)}" data-status="rejected" class="filter">Reject</button></div></article>`).join('')||'<p>No pending submissions.</p>';
    tokenHost.innerHTML=tokens.error?`<p class="detail-error">${esc(tokens.error.message)}</p>`:(tokens.data||[]).map(t=>`<article class="admin-item"><div><b>${esc(t.name||'Unknown')} (${esc(t.symbol||'—')})</b><small>${esc(t.mint)} · ${esc(t.classification)} · liquidity ${compact(t.liquidity_usd)}</small></div><button class="button primary" data-publish="${esc(t.mint)}">Publish record</button></article>`).join('')||'<p>No private candidates waiting.</p>';
    const runHost=admin.querySelector('#admin-runs');
    runHost.innerHTML=runs.error?`<p class='detail-error'>${esc(runs.error.message)}</p>`:(runs.data||[]).map(r=>`<article class='admin-item'><div><b>${esc(r.run_type)} · ${esc(r.status)}</b><small>${date(r.started_at)} · finished ${date(r.finished_at)}</small><p>${r.tokens_upserted??0} tokens · ${r.snapshots_inserted??0} snapshots · ${r.classifications_written??0} classification changes · ${r.error_count??0} errors</p><small>${esc(r.source_provider||'')}</small></div><small>${esc(JSON.stringify(r.summary||{}))}</small></article>`).join('')||'<p>No automation runs recorded yet.</p>';
  }
  async function checkSession(session){
    const user=session?.user;
    if(!user){workspace.hidden=true;login.hidden=false;return;}
    if(user.app_metadata?.role!=='admin'){await db.auth.signOut();status.textContent='This account is not authorised for archive administration.';workspace.hidden=true;login.hidden=false;return;}
    login.hidden=true;workspace.hidden=false;status.textContent='Authenticated administrator.';await loadAdminQueue();
  }
  login.addEventListener('submit',async e=>{e.preventDefault();status.textContent='Signing in…';const {data,error}=await db.auth.signInWithPassword({email:admin.querySelector('#admin-email').value,password:admin.querySelector('#admin-password').value});if(error){status.textContent='Sign-in failed. Check the account and password.';return;}await checkSession(data.session);});
  admin.querySelector('#admin-logout').addEventListener('click',async()=>{await db.auth.signOut();status.textContent='Signed out.';workspace.hidden=true;login.hidden=false;});
  admin.addEventListener('click',async e=>{
    const caseButton=e.target.closest('[data-case]');
    const publishButton=e.target.closest('[data-publish]');
    if(caseButton){caseButton.disabled=true;const {error}=await db.from('mc_reclamation_cases').update({review_status:caseButton.dataset.status,reviewed_at:new Date().toISOString()}).eq('id',caseButton.dataset.case);status.textContent=error?'Could not update review status.':'Review status saved.';await loadAdminQueue();}
    if(publishButton){publishButton.disabled=true;const {error}=await db.from('mc_tokens').update({visibility:'public'}).eq('mint',publishButton.dataset.publish).eq('visibility','private');status.textContent=error?'Could not publish this record.':'Record published.';await loadAdminQueue();}
  });
  db.auth.getSession().then(({data})=>checkSession(data.session));
  db.auth.onAuthStateChange((_event,session)=>{queueMicrotask(()=>checkSession(session));});
}

import { createClient } from '@supabase/supabase-js';
import './style.css';
import { initArchiveExperience } from './archive.js';

const env = import.meta.env;
const configured = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
const db = configured ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY) : null;

const icons = {
  leaf:'✳', search:'⌕', archive:'▤', brain:'◈', recycle:'⟳', database:'▦',
  shield:'⬡', arrow:'↗', menu:'☰', pulse:'⌁', lock:'◉'
};

document.querySelector('#app').innerHTML = `
  <div class="ambient ambient-a"></div><div class="ambient ambient-b"></div>
  <header class="nav wrap">
    <a class="brand" href="#"><span class="brand-mark">M</span><span>MEME<span class="green">CYCLE</span><small>THE DIGITAL AFTERLIFE</small></span></a>
    <nav><a href="#graveyard">Graveyard</a><a href="#intelligence">Intelligence</a><a href="#reclamation">Reclamation</a><a href="#marketplace">Data marketplace</a></nav>
    <a class="nav-cta" href="#graveyard">Explore archive <span>↗</span></a>
  </header>

  <main>
    <section class="hero wrap">
      <div class="eyebrow"><span class="live-dot"></span> A NEW LIFE FOR DIGITAL HISTORY <span class="eyebrow-line"></span> SOLANA FIRST</div>
      <div class="hero-grid">
        <div>
          <h1>Nothing digital<br>should <em>disappear.</em></h1>
          <p class="hero-copy">The market may move on. The data remains. MEMECYCLE preserves abandoned tokens, turns their histories into intelligence, and gives communities tools to reclaim their digital legacy.</p>
          <div class="hero-actions"><a class="button primary" href="#graveyard">Explore the graveyard <span>↗</span></a><a class="button ghost" href="#how">How it works <span>↓</span></a></div>
          <div class="trust-row"><span>◈ SOLANA NATIVE</span><span>◈ DATA WITH PROVENANCE</span><span>◈ PLATFORM FIRST</span></div>
        </div>
        <div class="orbit-card">
          <div class="orbit-top"><span>MEMECYCLE / SYSTEM MAP</span><span class="status">● INITIALISING</span></div>
          <div class="orbit-visual">
            <div class="orbit orbit-1"></div><div class="orbit orbit-2"></div><div class="orbit orbit-3"></div>
            <div class="core"><span> M </span><small>RECLAIM<br>THE DATA</small></div>
            <div class="orbit-node n1">01 <b>DISCOVER</b></div><div class="orbit-node n2">02 <b>PRESERVE</b></div>
            <div class="orbit-node n3">03 <b>UNDERSTAND</b></div><div class="orbit-node n4">04 <b>RECLAIM</b></div>
          </div>
          <div class="orbit-bottom"><span>ARCHIVE LAYER</span><span>INTELLIGENCE LAYER</span><span>COMMUNITY LAYER</span></div>
        </div>
      </div>
      <div class="hero-foot"><span>01 / THE AFTERLIFE ECONOMY</span><span>TURNING ABANDONED DATA INTO USEFUL KNOWLEDGE</span><span>SCROLL TO EXPLORE ↓</span></div>
    </section>

    <section class="ticker"><div>THE CHAIN REMEMBERS <b>✳</b> HISTORY HAS VALUE <b>✳</b> DATA OUTLIVES HYPE <b>✳</b> THE CHAIN REMEMBERS <b>✳</b> HISTORY HAS VALUE <b>✳</b> DATA OUTLIVES HYPE <b>✳</b></div></section>

    <section class="section wrap" id="how">
      <div class="section-head"><div><div class="eyebrow">01 — THE PROCESS</div><h2>From forgotten<br><em>to understood.</em></h2></div><p>We don't promise to make a token valuable. We make its history useful, searchable and verifiable.</p></div>
      <div class="steps">
        <article class="step"><div class="step-icon">⌕</div><span class="step-no">01 / DISCOVER</span><h3>Find what remains</h3><p>Identify dormant and abandoned assets across Solana. Capture mint identity, market traces, holders and available metadata.</p></article>
        <article class="step"><div class="step-icon">▤</div><span class="step-no">02 / PRESERVE</span><h3>Protect the record</h3><p>Build a provenance-aware historical archive. Keep observations, timestamps, sources and gaps intact.</p></article>
        <article class="step"><div class="step-icon">◈</div><span class="step-no">03 / UNDERSTAND</span><h3>Extract intelligence</h3><p>Analyse observable market conditions, source coverage and lifecycle evidence with versioned, explainable rules. On-chain activity and community signals are added only when independently evidenced.</p></article>
        <article class="step"><div class="step-icon">⟳</div><span class="step-no">04 / RECLAIM</span><h3>Create a second life</h3><p>Support historical collectibles, research datasets and community-led revival projects with proper permissions.</p></article>
      </div>
    </section>

    <section class="graveyard-section" id="graveyard">
      <div class="wrap">
        <div class="section-head"><div><div class="eyebrow">02 — THE PUBLIC ARCHIVE</div><h2>The token<br><em>graveyard.</em></h2></div><p>Search the archive by name, symbol or Solana mint address. Only verified records are displayed as indexed assets.</p></div>
        <div class="search-panel">
          <div class="search-title"><span>⌕</span><div><b>Search the archive</b><small>Explore recorded digital asset histories</small></div><span class="source-pill">DATABASE CONNECTIVITY: <i id="db-status">NOT CONFIGURED</i></span></div>
          <form id="search-form"><input id="search-input" placeholder="Enter token name, symbol or mint address…" autocomplete="off"><button class="button primary" type="submit">Search archive <span>↗</span></button></form>
          <div class="filters"><span>QUICK FILTERS</span><button data-filter="all" class="filter active">All records</button><button data-filter="active" class="filter">Active</button><button data-filter="declining" class="filter">Declining</button><button data-filter="illiquid" class="filter">Illiquid</button><button data-filter="unverified" class="filter">Unverified</button></div>
          <div id="results" class="results"><div class="empty-state"><div class="empty-symbol">▤</div><b>Archive awaiting its first verified records</b><p>MEMECYCLE's database is connected when configured. No sample tokens or fabricated statistics are shown here.</p></div></div>
          <div class="result-foot"><span id="result-count">0 RECORDS DISPLAYED</span><span>DATA MAY BE INCOMPLETE · LAST OBSERVATION SHOWN PER RECORD</span></div>
        </div>
      </div>
    </section>

    <section class="section wrap" id="intelligence">
      <div class="section-head"><div><div class="eyebrow">03 — INTELLIGENCE ENGINE</div><h2>Beyond price.<br><em>Into the pattern.</em></h2></div><p>A token's last price is only one fragment of its story. MEMECYCLE looks at the lifecycle, the evidence and the gaps.</p></div>
      <div class="intel-grid">
        <div class="intel-main"><div class="intel-label">MEMECYCLE INTELLIGENCE / RULES V0.1</div><div class="intel-score"><span>100</span><small>POINT<br>FRAMEWORK</small></div><h3>Evidence-weighted research score</h3><p>Versioned rule-based score built from observable market and data-quality evidence. It is not a valuation, investment signal or proof of abandonment. Community strength and cultural significance are not yet measured.</p><div class="score-bars"><div><span>Data quality</span><b>30</b><i style="--w:100%"></i></div><div><span>Market observability</span><b>10</b><i style="--w:33%"></i></div><div><span>Liquidity signal</span><b>15</b><i style="--w:50%"></i></div><div><span>Age evidence</span><b>15</b><i style="--w:50%"></i></div><div><span>Source corroboration</span><b>15</b><i style="--w:50%"></i></div><div><span>Freshness</span><b>15</b><i style="--w:50%"></i></div></div></div>
        <div class="intel-side"><div class="mini-card"><span class="mini-icon">⌁</span><small>LIFECYCLE CLASSIFICATION</small><h3>Context, not a label.</h3><p>Active, declining, dormant, illiquid, abandoned, historical or unverified — with evidence behind each assessment.</p></div><div class="mini-card"><span class="mini-icon">⬡</span><small>RISK & PROVENANCE</small><h3>Show your sources.</h3><p>Authority status, liquidity changes, supply concentration and observation coverage are recorded separately from AI opinions.</p></div></div>
      </div>
    </section>

    <section class="reclaim-section" id="reclamation"><div class="wrap reclaim-grid"><div><div class="eyebrow">04 — RECLAMATION CENTRE</div><h2>Every story<br>deserves a <em>record.</em></h2><p>Help document the history of an abandoned project, correct its metadata or propose a community-led archive. Ownership and revival permissions are checked — never assumed.</p><a class="button primary" href="#contribute">Contribute a history <span>↗</span></a></div><div class="reclaim-list"><div><span>01</span><b>Historical archive</b><small>Preserve the project's public record</small><i>↗</i></div><div><span>02</span><b>Metadata correction</b><small>Submit evidence and source links</small><i>↗</i></div><div><span>03</span><b>Community revival</b><small>Propose an authorised second life</small><i>↗</i></div><div><span>04</span><b>Collectible certificate</b><small>Document provenance, not financial value</small><i>↗</i></div></div></div></section>

    <section class="section wrap" id="marketplace">
      <div class="section-head"><div><div class="eyebrow">05 — DATA MARKETPLACE</div><h2>History becomes<br><em>intelligence.</em></h2></div><p>Structured research products for traders, analysts, developers and AI teams. Start with transparent data access; expand as the archive grows.</p></div>
      <div class="plans"><article><span class="plan-tag">OPEN ACCESS</span><h3>Explorer</h3><p>Search published token histories and explore the public archive.</p><b>Free</b><small>Public records · Basic filters</small></article><article class="featured"><span class="plan-tag">RESEARCH</span><h3>Research Pro</h3><p>Deeper lifecycle analysis, downloadable research and advanced filtering.</p><b>Coming soon</b><small>Pricing and availability to be validated</small></article><article><span class="plan-tag">BUILDERS</span><h3>Data API</h3><p>Programmatic access to provenance-aware historical token datasets.</p><b>Coming soon</b><small>Usage-based access · Licensing</small></article></div>
    </section>

    <section class="contribute-section" id="contribute"><div class="wrap contribute-grid"><div><div class="eyebrow">06 — ADD TO THE RECORD</div><h2>Know a story<br>we should <em>preserve?</em></h2><p>Submit a token and the evidence behind its history. Submissions are reviewed before becoming public archive records.</p><div class="privacy-note">⬡ Never share a seed phrase or private key. Wallet signatures verify the submitting wallet only — they do not prove ownership or authority over a token.</div></div>
      <form id="contribute-form" class="contribute-form"><label>Solana mint address<input required id="mint" placeholder="Paste token mint address"></label><label>What should we document?<select id="case-type"><option value="historical_archive">Historical archive</option><option value="metadata_correction">Metadata correction</option><option value="community_revival">Community revival proposal</option><option value="research_contribution">Research contribution</option></select></label><label>Evidence / context<textarea id="evidence" rows="3" placeholder="Share links, dates or context that can be independently checked…"></textarea></label><button class="button primary" type="submit">Sign & submit for review <span>↗</span></button><div id="submit-message" class="form-message"></div></form>
    </div></section>
  </main>
  <footer class="footer"><div class="wrap footer-top"><a class="brand" href="#"><span class="brand-mark">M</span><span>MEME<span class="green">CYCLE</span><small>THE DIGITAL AFTERLIFE</small></span></a><p>Preserve the past. Understand the present.<br>Build a more useful digital future.</p><span class="footer-status"><i></i> PLATFORM FOUNDATION</span></div><div class="wrap footer-bottom"><span>© 2026 MEMECYCLE. PLATFORM-FIRST. SOLANA FIRST.</span><span>Digital asset data is not a guarantee of value. No investment advice.</span></div></footer>
`;

let activeFilter = 'all';
let tokens = [];

function esc(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function shortMint(m='') { return m.length > 15 ? `${m.slice(0,7)}…${m.slice(-5)}` : m; }
function money(v) { if (v == null) return '—'; return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(Number(v)); }
function empty(msg, sub='') { return `<div class="empty-state"><div class="empty-symbol">▤</div><b>${esc(msg)}</b><p>${esc(sub)}</p></div>`; }

async function loadTokens(search='') {
  const results = document.querySelector('#results');
  if (!db) {
    document.querySelector('#db-status').textContent = 'NOT CONFIGURED';
    results.innerHTML = empty('Archive connection not configured','Add the Supabase public URL and publishable key to the deployment environment. The archive will never substitute invented sample records.');
    return;
  }
  document.querySelector('#db-status').textContent = 'CONNECTED';
  results.innerHTML = empty('Searching verified records…');
  let q = db.from('mc_tokens').select('mint,name,symbol,classification,market_cap_usd,liquidity_usd,volume_24h_usd,holder_count,data_completeness,reclamation_score,last_activity_at,updated_at').eq('visibility','public').order('updated_at',{ascending:false}).limit(50);
  if (activeFilter !== 'all') q = q.eq('classification',activeFilter);
  if (search) {
    const safe = search.replace(/[,%()]/g,' ').trim();
    q = q.or(`name.ilike.%${safe}%,symbol.ilike.%${safe}%,mint.eq.${safe}`);
  }
  const {data,error} = await q;
  if (error) { results.innerHTML = empty('Archive temporarily unavailable',error.message); return; }
  tokens = data || [];
  document.querySelector('#result-count').textContent = `${tokens.length} RECORDS DISPLAYED`;
  if (!tokens.length) { results.innerHTML = empty(search ? 'No matching published records' : 'No published records yet',search ? 'Try a different name, symbol or mint address.' : 'The archive is ready for its first reviewed and verified records.'); return; }
  results.innerHTML = `<div class="token-table"><div class="token-row token-head"><span>ASSET</span><span>CLASSIFICATION</span><span>LIQUIDITY</span><span>HOLDERS</span><span>DATA COVERAGE</span></div>${tokens.map(t=>`<div class="token-row" data-mint="${esc(t.mint)}" role="button" tabindex="0" aria-label="Open archive record for ${esc(t.name||t.symbol||t.mint)}"><div class="asset"><span class="token-avatar">${esc((t.symbol||t.name||'?').slice(0,1).toUpperCase())}</span><span><b>${esc(t.name||'Unknown token')}</b><small>${esc(t.symbol||'—')} · ${esc(shortMint(t.mint))}</small></span></div><span><i class="classification ${esc(t.classification)}">${esc(t.classification.replaceAll('_',' '))}</i></span><span>${money(t.liquidity_usd)}</span><span>${t.holder_count ?? '—'}</span><span><div class="coverage"><i style="width:${Number(t.data_completeness||0)}%"></i></div><small>${Number(t.data_completeness||0)}%</small></span></div>`).join('')}</div>`;
}

document.querySelector('#search-form').addEventListener('submit', e => {e.preventDefault(); loadTokens(document.querySelector('#search-input').value.trim());});
document.querySelectorAll('.filter').forEach(b => b.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeFilter=b.dataset.filter;loadTokens(document.querySelector('#search-input').value.trim());}));
document.querySelector('#contribute-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const msg=document.querySelector('#submit-message');
  if(!db){msg.textContent='Submission is unavailable until the database is configured.';return;}
  const mint=document.querySelector('#mint').value.trim();
  if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)){msg.textContent='Please enter a valid-looking Solana mint address.';return;}
  const provider=window.phantom?.solana||window.solana;
  if(!provider?.connect||!provider?.signMessage){msg.textContent='A Solana wallet with message-signing support is required. Connect Phantom or another compatible wallet.';return;}
  const caseType=document.querySelector('#case-type').value;
  const description=document.querySelector('#evidence').value.trim()||'Submitted for historical review.';
  const evidence=document.querySelector('#evidence').value.split(/\\s+/).filter(value=>{try{const u=new URL(value);return u.protocol==='https:'||u.protocol==='http:';}catch{return false;}}).slice(0,10).map(url=>({type:'url',url})).filter(item=>item.url.length<=1000);
  const button=e.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
  try{
    msg.textContent='Connect your wallet…';
    const connected=await provider.connect();
    const wallet=connected.publicKey?.toString?.()||provider.publicKey?.toString?.();
    if(!wallet)throw new Error('Wallet did not return a public address.');
    msg.textContent='Preparing a one-time verification message…';
    const challenge=await db.functions.invoke('memecycle-community',{body:{action:'challenge',wallet,mint,case_type:caseType,description,evidence}});
    if(challenge.error||!challenge.data?.challenge_id)throw new Error(challenge.data?.error||'Could not prepare wallet verification.');
    msg.textContent='Approve the message signature in your wallet. No transaction or token transfer is involved.';
    const signed=await provider.signMessage(new TextEncoder().encode(challenge.data.message),'utf8');
    const bytes=signed.signature||signed;
    const signature=btoa(String.fromCharCode(...bytes));
    msg.textContent='Verifying signature and submitting…';
    const submitted=await db.functions.invoke('memecycle-community',{body:{action:'submit',challenge_id:challenge.data.challenge_id,signature}});
    if(submitted.error||!submitted.data?.ok)throw new Error(submitted.data?.error||'Signature verification or submission failed.');
    msg.textContent='Submission received. Your wallet signature is verified; this does not establish ownership or authority over the token. The record remains private pending review.';
    e.currentTarget.reset();
  }catch(error){msg.textContent=String(error?.message||'Submission failed. You can try again.').slice(0,240);}
  finally{button.disabled=false;}
});
loadTokens();
initArchiveExperience(db);

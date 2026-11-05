const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short = mint => mint.length > 18 ? mint.slice(0,8)+'…'+mint.slice(-6) : mint;
export function initAccountExperience(db) {
  if (!db) return;
  const nav = document.querySelector('.nav');
  if (!nav || document.querySelector('#account-toggle')) return;
  const toggle = document.createElement('button');
  toggle.id = 'account-toggle'; toggle.className = 'account-toggle'; toggle.type = 'button'; toggle.textContent = 'Sign in / Join free';
  nav.append(toggle);
  const panel = document.createElement('section');
  panel.id = 'account-panel'; panel.className = 'account-panel'; panel.hidden = true;
  panel.innerHTML = `
    <div class="account-panel-head"><div><span class="eyebrow">MEMECYCLE ACCOUNT</span><h3>Your research workspace</h3></div><button type="button" id="account-close" aria-label="Close">×</button></div>
    <div id="account-auth"><div class="account-tabs"><button type="button" data-mode="signin" class="active">Sign in</button><button type="button" data-mode="signup">Create free account</button></div>
      <form id="account-form"><label>Email address<input id="account-email" type="email" autocomplete="email" required maxlength="254"></label><label>Password<input id="account-password" type="password" autocomplete="current-password" minlength="10" required></label><button class="button primary" id="account-submit" type="submit">Sign in</button></form>
      <p class="account-note">Free accounts can save token mints to a private watchlist. We never ask for wallet keys or seed phrases.</p></div>
    <div id="account-user" hidden><p id="account-identity"></p><form id="watchlist-form"><label>Add a Solana mint to your watchlist<input id="watchlist-mint" placeholder="Paste mint address" required maxlength="44"></label><button class="button primary" type="submit">Add to watchlist</button></form><div id="watchlist-items"></div><button type="button" id="account-signout" class="button ghost">Sign out</button></div>
    <p id="account-message" class="form-message" role="status" aria-live="polite"></p>`;
  document.body.append(panel);
  let mode='signin', currentUser=null;
  const message=panel.querySelector('#account-message'), authArea=panel.querySelector('#account-auth'), userArea=panel.querySelector('#account-user');
  const setMessage=(value,error=false)=>{message.textContent=value;message.classList.toggle('error',error);};
  function setMode(next){mode=next;panel.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));panel.querySelector('#account-submit').textContent=mode==='signup'?'Create free account':'Sign in';panel.querySelector('#account-password').autocomplete=mode==='signup'?'new-password':'current-password';setMessage('');}
  async function loadWatchlist(){
    if(!currentUser)return;
    const host=panel.querySelector('#watchlist-items');host.innerHTML='<p class="account-note">Loading saved tokens…</p>';
    const {data,error}=await db.from('mc_user_watchlists').select('id,mint,created_at').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(100);
    if(error){host.innerHTML='<p class="account-note">Could not load your watchlist.</p>';return;}
    if(!data?.length){host.innerHTML='<p class="account-note">Your watchlist is empty. Add a mint address above to start tracking it.</p>';return;}
    host.innerHTML='<h4>Saved tokens ('+data.length+')</h4>'+data.map(item=>'<div class="watchlist-item"><code>'+esc(short(item.mint))+'</code><button type="button" data-remove-watch="'+esc(item.id)+'">Remove</button></div>').join('');
  }
  async function addMint(mintOverride){
    if(!currentUser){panel.hidden=false;setMessage('Sign in or create a free account to save tokens.');return;}
    const value=String(mintOverride || panel.querySelector('#watchlist-mint').value).trim();
    if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)){setMessage('Enter a valid-looking Solana mint address.',true);return;}
    const {error}=await db.from('mc_user_watchlists').upsert({user_id:currentUser.id,mint:value},{onConflict:'user_id,mint',ignoreDuplicates:true});
    if(error){setMessage('Could not save this token. Please try again.',true);return;}
    panel.querySelector('#watchlist-mint').value='';setMessage('Token saved to your private watchlist.');await loadWatchlist();
  }
  async function renderSession(session){
    currentUser=session?.user||null;authArea.hidden=Boolean(currentUser);userArea.hidden=!currentUser;toggle.textContent=currentUser?'My account':'Sign in / Join free';
    if(currentUser){panel.querySelector('#account-identity').textContent='Signed in as '+(currentUser.email||'MEMECYCLE member');await loadWatchlist();}
  }
  toggle.addEventListener('click',async()=>{panel.hidden=!panel.hidden;if(currentUser)await loadWatchlist();});
  panel.querySelector('#account-close').addEventListener('click',()=>{panel.hidden=true;});
  panel.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  panel.querySelector('#account-form').addEventListener('submit',async event=>{
    event.preventDefault();const email=panel.querySelector('#account-email').value.trim(),password=panel.querySelector('#account-password').value,submit=panel.querySelector('#account-submit');submit.disabled=true;
    try{
      if(mode==='signup'){
        const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});if(error)throw error;
        if(data.session){await renderSession(data.session);setMessage('Your free account is ready.');}else setMessage('Check your email to confirm your account, then sign in here.');
      }else{
        const {data,error}=await db.auth.signInWithPassword({email,password});if(error)throw error;await renderSession(data.session);setMessage('You are signed in.');
      }
    }catch(error){setMessage(error.message||'Account action failed.',true);}finally{submit.disabled=false;}
  });
  panel.querySelector('#watchlist-form').addEventListener('submit',event=>{event.preventDefault();addMint();});
  panel.querySelector('#watchlist-items').addEventListener('click',async event=>{
    const button=event.target.closest('[data-remove-watch]');if(!button||!currentUser)return;
    const {error}=await db.from('mc_user_watchlists').delete().eq('id',button.dataset.removeWatch).eq('user_id',currentUser.id);
    if(error)setMessage('Could not remove that token.',true);else{setMessage('Token removed.');await loadWatchlist();}
  });
  panel.querySelector('#account-signout').addEventListener('click',async()=>{const {error}=await db.auth.signOut();if(error)setMessage('Sign out failed.',true);else{await renderSession(null);setMessage('Signed out.');}});
  db.auth.getSession().then(({data})=>renderSession(data.session));
  db.auth.onAuthStateChange((_event,session)=>{renderSession(session);});
}

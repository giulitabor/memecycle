import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!,KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,db=createClient(SUPABASE_URL,KEY,{auth:{persistSession:false}}),VERSION="memecycle-rules-0.3.0";
const PUMP_PROGRAM="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const SOURCES=[["dexscreener_profiles","https://api.dexscreener.com/token-profiles/latest/v1"],["dexscreener_boosts","https://api.dexscreener.com/token-boosts/latest/v1"],["geckoterminal_trending","https://api.geckoterminal.com/api/v2/networks/solana/trending_pools"]] as const;
const out=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const valid=(v:unknown):v is string=>typeof v==="string"&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v),num=(v:unknown):number|null=>v==null||v===""||!Number.isFinite(Number(v))?null:Number(v);
async function get(url:string){const r=await fetch(url,{headers:{accept:"application/json","user-agent":"MEMECYCLE/0.1"},signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(`${r.status} ${new URL(url).hostname}`);return await r.json();}
type C={mint:string;name?:string;symbol?:string;image?:string;creator?:string;launchAt?:string;pumpfun?:any;jupiter?:any;sources:Set<string>;pools:any[]};
function add(m:Map<string,C>,mint:string,source:string){if(!valid(mint))return null;let c=m.get(mint);if(!c){c={mint,sources:new Set(),pools:[]};m.set(mint,c);}c.sources.add(source);return c;}
function analyse(x:any,p:any,providers:string[]){const liq=num(p?.liquidity?.usd??p?.reserve_in_usd),vol=num(p?.volume?.h24??p?.volume_usd?.h24),fdv=num(p?.fdv??p?.fdv_usd),cap=num(p?.marketCap??p?.market_cap_usd),created=p?.pairCreatedAt?Number(p.pairCreatedAt):p?.pool_created_at?Date.parse(p.pool_created_at):null,age=created&&Number.isFinite(created)?Math.max(0,(Date.now()-created)/86400000):null;
 const complete=(x.name?10:0)+(x.symbol?10:0)+(p?20:0)+(liq!==null?15:0)+(vol!==null?15:0)+(fdv!==null||cap!==null?10:0)+(providers.length>1?10:0)+(p?.url||p?.pairAddress||p?.address?10:0);
 const breakdown={data_quality:Math.round(complete*.30),market_observability:p?10:0,liquidity_signal:liq===null?0:liq>=25000?15:liq>=5000?10:liq>=1000?5:1,age_evidence:age===null?0:age>=365?15:age>=180?10:age>=30?5:1,source_corroboration:providers.length>1?15:providers.length===1?7:0,freshness:p?15:0,not_measured:["community_strength","cultural_significance","ownership_authority","last_on_chain_activity"]};
 const total=Math.min(100,Object.entries(breakdown).filter(([k])=>k!=="not_measured").reduce((s,[,v])=>s+Number(v),0));let label="unverified";if(p&&liq!==null&&liq<1000)label="illiquid";else if(p&&liq!==null&&vol!==null&&liq>=10000&&vol>=10000)label="active";else if(p&&(liq!==null||vol!==null))label="declining";return{liq,vol,fdv,cap,complete,breakdown,total,label};}
async function discover(limit:number,bitqueryToken?:string){const {data:run,error:runErr}=await db.from("mc_ingestion_runs").insert({run_type:"discovery",status:"running",source_provider:"dexscreener+geckoterminal+pumpdata+jupiter"}).select("id").single();if(runErr)throw runErr;
 const map=new Map<string,C>(),counts:Record<string,any>={},sourceErrors:string[]=[];
 for(const [key,url] of SOURCES){try{const payload:any=await get(url),rows:any[]=key==="geckoterminal_trending"?(payload?.data??[]):(Array.isArray(payload)?payload:[]);counts[key]=rows.length;for(const row of rows){if(key==="geckoterminal_trending"){const base=row.relationships?.base_token?.data?.id??"",mint=String(base).startsWith("solana_")?String(base).slice(7):row.attributes?.base_token_address,c=add(map,mint,key);if(c)c.pools.push({...row.attributes,address:row.attributes?.address,raw:row});}else if(row.chainId==="solana"){const c=add(map,row.tokenAddress,key);if(c)c.image??=row.icon??row.header;}}await db.from("mc_discovery_sources").update({last_success_at:new Date().toISOString(),records_seen:rows.length,last_error:null,updated_at:new Date().toISOString()}).eq("source_key",key);}catch(e){sourceErrors.push(key+": "+String(e).slice(0,180));await db.from("mc_discovery_sources").update({last_error_at:new Date().toISOString(),last_error:String(e).slice(0,500),updated_at:new Date().toISOString()}).eq("source_key",key);}}
 // Pump.fun historical launch feed: one free HTTP request per discovery run, cursor-based; no Solana RPC calls.
 try{
  const {data:src}=await db.from("mc_discovery_sources").select("cursor_value,enabled").eq("source_key","pumpfun_launch_history").maybeSingle();
  if(src?.enabled!==false){
   const cursor=Number(src?.cursor_value)||Math.floor(Date.now()/1000)-86400;
   const payload:any=await get(`https://pumpdata.fun/launches/since.json?t=${cursor}`);
   const columns:string[]=payload.columns??[];
   const rows:any[]=(payload.launches??[]).map((row:any)=>Array.isArray(row)?Object.fromEntries(columns.map((name,i)=>[name,row[i]])):row),sampledRows=rows.slice(-25);
   counts.pumpfun_launch_history=rows.length;counts.pumpfun_sampled=sampledRows.length;
   for(const row of sampledRows){const mint=row.mint??row.mint_address??row.token_mint??row.address,c=add(map,String(mint??""),"pumpfun_launch_history");if(c){c.creator??=row.creator??row.deployer;c.launchAt??=row.created?new Date(Number(row.created)*1000).toISOString():row.created_at??null;c.pumpfun={creator:c.creator??null,created:row.created??null,deployer_launches_before:row.deployer_launches_before??null,deployer_graduations_before:row.deployer_graduations_before??null,deployer_gap_s:row.deployer_gap_s??null,deployer_launches_last_day:row.deployer_launches_last_day??null,buyers_first_10s:row.buyers_first_10s??null,bundle_supply_share:row.bundle_supply_share??null,migrated_at:row.migrated_at??null,source:row.source??null};}}
   const next=Number(payload.next_since)||cursor;
   await db.from("mc_discovery_sources").update({last_success_at:new Date().toISOString(),cursor_value:next,records_seen:rows.length,last_error:null,updated_at:new Date().toISOString()}).eq("source_key","pumpfun_launch_history");
  }
 }catch(e){sourceErrors.push("pumpfun_launch_history: "+String(e).slice(0,180));await db.from("mc_discovery_sources").update({last_error_at:new Date().toISOString(),last_error:String(e).slice(0,500),updated_at:new Date().toISOString()}).eq("source_key","pumpfun_launch_history");}
 // Historical Pump.fun launch sampling via Bitquery archive. One bounded UTC day per run.
 // Archive access is plan-gated by Bitquery; no paid add-on is purchased or assumed.
 if(bitqueryToken){
  try{
   const sourceKey="pumpfun_bitquery_history",nowSeconds=Math.floor(Date.now()/1000);
   const {data:src}=await db.from("mc_discovery_sources").select("cursor_value,enabled").eq("source_key",sourceKey).maybeSingle();
   if(src?.enabled!==false){
    const cursor=Number(src?.cursor_value)||nowSeconds-365*86400;
    if(cursor<nowSeconds){
     const since=new Date(cursor*1000).toISOString(),till=new Date(Math.min(cursor+86400,nowSeconds)*1000).toISOString();
     const query=`query MemecyclePumpfunHistory {
      Solana(dataset: archive) {
       TokenSupplyUpdates(
        limit: { count: ${Math.max(1,Math.min(limit,100))} }
        orderBy: { descending: Block_Time }
        where: {
         Block: { Time: { since: "${since}", till: "${till}" } }
         Instruction: { Program: { Address: { is: "${PUMP_PROGRAM}" }, Method: { in: ["create", "create_v2"] } } }
         Transaction: { Result: { Success: true } }
        }
       ) {
        Block { Time }
        Transaction { Signer Signature }
        TokenSupplyUpdate { Currency { MintAddress Name Symbol Uri UpdateAuthority Decimals } PostBalance }
       }
      }
     }`;
     const r=await fetch("https://streaming.bitquery.io/graphql",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+bitqueryToken,"user-agent":"MEMECYCLE/0.2"},body:JSON.stringify({query}),signal:AbortSignal.timeout(20000)});
     if(!r.ok)throw new Error("Bitquery HTTP "+r.status);
     const payload:any=await r.json();if(payload.errors?.length)throw new Error("Bitquery GraphQL: "+String(payload.errors[0]?.message??"query failed").slice(0,180));
     const rows:any[]=payload?.data?.Solana?.TokenSupplyUpdates??[],mints=rows.map(row=>row.TokenSupplyUpdate?.Currency?.MintAddress).filter(valid);
     const {data:old}=mints.length?await db.from("mc_tokens").select("mint,name,symbol,discovery_sources,source_provenance,first_seen_at").in("mint",mints):{data:[]};
     const prior=new Map((old??[]).map((x:any)=>[x.mint,x]));
     for(const row of rows){
      const currency=row.TokenSupplyUpdate?.Currency??{},mint=currency.MintAddress;
      if(!valid(mint))continue;
      const prev:any=prior.get(mint)??{},signer=Array.isArray(row.Transaction?.Signer)?row.Transaction.Signer[0]:row.Transaction?.Signer,createdAt=row.Block?.Time??null;
      const providers=[...new Set([...(prev.discovery_sources??[]),sourceKey])];
      const launch={provider:"Bitquery Solana archive",program:PUMP_PROGRAM,method:"create/create_v2",creator_candidate:signer??null,signature:row.Transaction?.Signature??null,created_at:createdAt,metadata_uri:currency.Uri??null,update_authority:currency.UpdateAuthority??null,decimals:currency.Decimals??null,supply:row.TokenSupplyUpdate?.PostBalance??null,coverage:"Bounded one-day archive query; result capped at 100 rows per run. This is a sample, not a complete launch census."};
      const {error:up}=await db.from("mc_tokens").upsert({mint,chain:"solana",name:currency.Name??prev.name??null,symbol:currency.Symbol??prev.symbol??null,metadata_uri:currency.Uri??null,discovery_sources:providers,source_provenance:{...(prev.source_provenance??{}),providers,bitquery_launch:launch},first_seen_at:prev.first_seen_at??new Date().toISOString()},{onConflict:"mint"});
      if(up)throw up;
      add(map,mint,sourceKey);
      const {data:existing}=await db.from("mc_token_events").select("id").eq("mint",mint).eq("event_type","pumpfun_historical_launch").limit(1);
      if(!existing?.length)await db.from("mc_token_events").insert({mint,event_type:"pumpfun_historical_launch",source:"bitquery.solana.archive",confidence:"provider_reported",event_at:createdAt??new Date().toISOString(),details:launch});
     }
     const next=Math.min(cursor+86400,nowSeconds);
     await db.from("mc_discovery_sources").upsert({source_key:sourceKey,provider:"Bitquery",endpoint:"https://streaming.bitquery.io/graphql (Solana archive)",enabled:true,last_success_at:new Date().toISOString(),records_seen:rows.length,cursor_value:next,last_error:null,updated_at:new Date().toISOString()},{onConflict:"source_key"});
     counts.pumpfun_bitquery_history=rows.length;counts.pumpfun_history_window={since,till,rows:rows.length,limit:Math.max(1,Math.min(limit,100))};
    }
   }
  }catch(e){sourceErrors.push("pumpfun_bitquery_history: "+String(e).slice(0,180));await db.from("mc_discovery_sources").upsert({source_key:"pumpfun_bitquery_history",provider:"Bitquery",endpoint:"https://streaming.bitquery.io/graphql (Solana archive)",enabled:true,last_error_at:new Date().toISOString(),last_error:String(e).slice(0,500),updated_at:new Date().toISOString()},{onConflict:"source_key"});}
 }else{counts.pumpfun_bitquery_history=0;counts.pumpfun_bitquery_history_status="BITQUERY_TOKEN not supplied; historical archive backfill paused.";}
 // Jupiter Tokens API: one keyless request per run (0.5 requests/second limit); enriches metadata, organic score and audit flags.
 try{
  const payload:any=await get("https://api.jup.ag/tokens/v2/recent?limit=50"),rows:any[]=Array.isArray(payload)?payload:(payload.data??payload.tokens??[]);
  counts.jupiter_recent=rows.length;
  for(const row of rows){const c=add(map,String(row.id??row.address??row.mint??""),"jupiter_recent");if(c){c.name??=row.name;c.symbol??=row.symbol;c.image??=row.icon;c.jupiter=row;}}
  await db.from("mc_discovery_sources").update({last_success_at:new Date().toISOString(),records_seen:rows.length,last_error:null,updated_at:new Date().toISOString()}).eq("source_key","jupiter_recent");
 }catch(e){sourceErrors.push("jupiter_recent: "+String(e).slice(0,180));await db.from("mc_discovery_sources").update({last_error_at:new Date().toISOString(),last_error:String(e).slice(0,500),updated_at:new Date().toISOString()}).eq("source_key","jupiter_recent");}
 const allCandidates=[...map.values()],
  historyCandidates=allCandidates.filter(c=>c.sources.has("pumpfun_bitquery_history")),
  pumpCandidates=allCandidates.filter(c=>c.sources.has("pumpfun_launch_history")).slice(-10),
  otherCandidates=allCandidates.filter(c=>!c.sources.has("pumpfun_launch_history")&&!c.sources.has("pumpfun_bitquery_history")),
  // Reserve up to half of the daily snapshot budget for historic launches.
  batch=[...historyCandidates.slice(0,15),...pumpCandidates,...otherCandidates].slice(0,Math.max(1,Math.min(limit,50))),mints=batch.map(c=>c.mint),{data:oldRows}=mints.length?await db.from("mc_tokens").select("mint,name,symbol,discovery_sources,source_provenance").in("mint",mints):{data:[]},old=new Map((oldRows??[]).map((x:any)=>[x.mint,x]));let tokenCount=0,snapshotCount=0,classCount=0,errors=0;
 for(const c of batch){try{let pools=c.pools;if(!pools.length||!pools.some(p=>p.baseToken?.name)){try{const extra:any[]=await get("https://api.dexscreener.com/token-pairs/v1/solana/"+c.mint);pools=[...pools,...extra.filter(p=>p.chainId==="solana")];}catch{}}pools.sort((a,b)=>(num(b.liquidity?.usd??b.reserve_in_usd)??0)-(num(a.liquidity?.usd??a.reserve_in_usd)??0));const p=pools[0]??null,prev:any=old.get(c.mint)??{};c.name??=p?.baseToken?.name??p?.base_token?.name;c.symbol??=p?.baseToken?.symbol??p?.base_token?.symbol;c.image??=p?.info?.imageUrl;const providers=[...new Set([...(prev.discovery_sources??[]),...c.sources])],s=analyse({name:c.name??prev.name,symbol:c.symbol??prev.symbol},p,providers),pair=p?.pairAddress??p?.address??null,price=num(p?.priceUsd??p?.base_token_price_usd);
 const {error:upErr}=await db.from("mc_tokens").upsert({mint:c.mint,chain:"solana",name:c.name??prev.name??null,symbol:c.symbol??prev.symbol??null,image_url:c.image??null,price_usd:price,fdv_usd:s.fdv,market_cap_usd:s.cap,liquidity_usd:s.liq,volume_24h_usd:s.vol,primary_pair_address:pair,dex_url:p?.url??p?.pool_url??null,discovery_sources:providers,data_completeness:s.complete,source_provenance:{providers,discovered_at:new Date().toISOString(),worker_version:VERSION,pumpfun:c.pumpfun??prev.source_provenance?.pumpfun??(c.creator||c.launchAt?{creator:c.creator??null,launch_at:c.launchAt??null}:null),jupiter:c.jupiter?{is_verified:c.jupiter.isVerified??null,organic_score:c.jupiter.organicScore??null,organic_score_label:c.jupiter.organicScoreLabel??null,audit:c.jupiter.audit??null,holder_count:c.jupiter.holderCount??null}:prev.source_provenance?.jupiter??null}},{onConflict:"mint"});if(upErr)throw upErr;tokenCount++;await db.from("mc_tokens").update({first_seen_at:new Date().toISOString()}).eq("mint",c.mint).is("first_seen_at",null);if(!prev.mint)await db.from("mc_token_events").insert({mint:c.mint,event_type:"candidate_discovered",source:"memecycle-worker",confidence:"observed",details:{providers}});
 if((c.creator||c.launchAt)&&!(prev.discovery_sources??[]).includes("pumpfun_launch_history"))await db.from("mc_token_events").insert({mint:c.mint,event_type:"pumpfun_launch_record",source:"pumpdata.fun",confidence:"provider_reported",details:{...(c.pumpfun??{}),creator:c.creator??null,launch_at:c.launchAt??null,provider:"pumpdata.fun",note:"Third-party Pump.fun launch history; not an on-chain signature proof."}});
 if(c.jupiter&&!(prev.discovery_sources??[]).includes("jupiter_recent"))await db.from("mc_token_events").insert({mint:c.mint,event_type:"jupiter_token_enrichment",source:"jupiter_tokens_v2",confidence:"provider_reported",details:{is_verified:c.jupiter.isVerified??null,organic_score:c.jupiter.organicScore??null,organic_score_label:c.jupiter.organicScoreLabel??null,holder_count:c.jupiter.holderCount??null,audit:c.jupiter.audit??null,provider:"Jupiter Tokens API v2"}});
 if(p&&pair){await db.from("mc_token_pairs").upsert({pair_address:pair,mint:c.mint,dex_id:p.dexId??p.dex_id??"geckoterminal",pair_created_at:p.pairCreatedAt?new Date(p.pairCreatedAt).toISOString():p.pool_created_at??null,url:p.url??p.pool_url??null,quote_token_address:p.quoteToken?.address??null,price_usd:price,fdv_usd:s.fdv,market_cap_usd:s.cap,liquidity_usd:s.liq,volume_24h_usd:s.vol,price_change_24h_pct:num(p.priceChange?.h24??p.price_change_percentage?.h24),observed_at:new Date().toISOString(),raw_pair:p.raw??p},{onConflict:"pair_address"});const observed=new Date().toISOString(),{error:snapErr}=await db.from("mc_snapshots").insert({mint:c.mint,observed_at:observed,price_usd:price,market_cap_usd:s.cap,fdv_usd:s.fdv,liquidity_usd:s.liq,volume_24h_usd:s.vol,price_change_24h_pct:num(p.priceChange?.h24??p.price_change_percentage?.h24),pair_address:pair,dex_id:p.dexId??p.dex_id??"geckoterminal",source:"market:"+(p.dexId??p.dex_id??"pool")+":"+pair,raw_observation:p.raw??p});if(snapErr)throw snapErr;snapshotCount++;}
 await db.from("mc_tokens").update({reclamation_score:s.total,score_breakdown:s.breakdown,score_version:VERSION,classified_at:new Date().toISOString(),classification:s.label,lifecycle_status:s.label}).eq("mint",c.mint).not("classification","in",'("historical","community_revival")');
 const {error:ce}=await db.from("mc_classifications").insert({mint:c.mint,classifier_version:VERSION,classification:s.label,score:s.total,explanation:"Rule-based market observability and data-quality assessment; not a valuation or proof of abandonment.",evidence:[{providers},{market:{liquidity_usd:s.liq,volume_24h_usd:s.vol,pair_address:pair}},{limitations:"Dormant/abandoned labels require historical on-chain activity evidence and are not inferred from market data alone."}]});if(!ce)classCount++;if(!c.name)await db.from("mc_data_gaps").upsert({mint:c.mint,field_name:"name",reason:"No verified token name in discovery response"},{onConflict:"mint,field_name,reason"});if(!c.symbol)await db.from("mc_data_gaps").upsert({mint:c.mint,field_name:"symbol",reason:"No verified token symbol in discovery response"},{onConflict:"mint,field_name,reason"});
 }catch(e){errors++;await db.from("mc_audit_events").insert({event_type:"discovery_record_error",actor:"memecycle-worker",subject_ref:c.mint,details:{error:String(e).slice(0,400)}});}}
 const status=(errors||sourceErrors.length)?(tokenCount?"partial":"failed"):"succeeded",summary={worker_version:VERSION,source_counts:counts,source_errors:sourceErrors,selected:batch.length,privacy:"new records remain private pending evidence-based review",source_limits:"Pump.fun launch feed and Jupiter recent are each one HTTP request per daily discovery run; no additional Solana RPC calls."};await db.from("mc_ingestion_runs").update({status,candidates_seen:map.size,tokens_upserted:tokenCount,snapshots_inserted:snapshotCount,classifications_written:classCount,error_count:errors+sourceErrors.length,summary,finished_at:new Date().toISOString()}).eq("id",run.id);await db.from("mc_audit_events").insert({event_type:"discovery_run_completed",actor:"memecycle-worker",subject_ref:run.id,details:{status,candidates:map.size,tokens:tokenCount,snapshots:snapshotCount,classifications:classCount,errors}});return{run_id:run.id,status,candidates_seen:map.size,tokens_upserted:tokenCount,snapshots_inserted:snapshotCount,classifications_written:classCount,source_errors:sourceErrors};}

async function backfillHuggingFace(pagesPerConfig:number){
 const runResult=await db.from("mc_ingestion_runs").insert({run_type:"backfill",status:"running",source_provider:"huggingface:loopholetape/pumpfun-launches"}).select("id").single();
 if(runResult.error)throw runResult.error;
 const runId=runResult.data.id,dataset="loopholetape/pumpfun-launches";
 const datasetInfo:any=await get("https://huggingface.co/api/datasets/"+dataset);
 const datasetSize:any=await get("https://datasets-server.huggingface.co/size?dataset=loopholetape%2Fpumpfun-launches");
 const revision=String(datasetInfo.sha??"");
 if(!/^[a-f0-9]{40}$/.test(revision))throw new Error("Hugging Face did not return a valid dataset revision.");
 if(String(datasetInfo.cardData?.license??"").toLowerCase()!=="cc-by-4.0")throw new Error("Unexpected dataset licence; archive ingestion stopped for rights review.");
 const totals=new Map<string,number>((datasetSize.size?.splits??[]).map((x:any)=>[x.config,Number(x.num_rows)||0]));
 const configs=["launches_legacy","launches"],keys=configs.map(config=>({source_key:"hf_pumpfun_"+config,provider:"huggingface",endpoint:"https://datasets-server.huggingface.co/rows",enabled:true,cursor_value:0,records_seen:0}));
 const {error:seedError}=await db.from("mc_discovery_sources").upsert(keys,{onConflict:"source_key",ignoreDuplicates:true});if(seedError)throw seedError;
 const {data:sourceRows,error:sourceError}=await db.from("mc_discovery_sources").select("source_key,enabled,cursor_value,records_seen").in("source_key",keys.map(x=>x.source_key));if(sourceError)throw sourceError;
 const sourceMap=new Map((sourceRows??[]).map((x:any)=>[x.source_key,x]));
 const summary:any={dataset,revision,last_modified:datasetInfo.lastModified??null,license:"CC BY 4.0",strategy:"deterministic 100-stratum sample; 100 rows per sampled page; pointers and selected facts only",pages:[],limitations:[
  "This is a stratified sample, not a full mirror or complete token census.",
  "The launches_legacy configuration predates the 2026-09-27 decoder fix; early buy-derived metrics are incomplete.",
  "The launches configuration's first 620 rows may have decoder_complete=0.",
  "The rugged field is a dataset rule label, not proof of fraud or abandonment.",
  "Early feature snapshots are sampled; null means not sampled, not zero."
 ]};
 let totalRows=0,totalTokens=0,totalRefs=0,errorCount=0;
 for(const config of configs){
  const sourceKey="hf_pumpfun_"+config,src:any=sourceMap.get(sourceKey),total=totals.get(config)??0;
  if(!src||src.enabled===false||total<=0)continue;
  let cursor=Math.max(0,Number(src.cursor_value)||0),sourceRowsSeen=Number(src.records_seen)||0;
  for(let page=0;page<pagesPerConfig&&cursor<100;page++){
   const pageIndex=cursor,offset=Math.floor(pageIndex*total/100),url=new URL("https://datasets-server.huggingface.co/rows");
   url.searchParams.set("dataset",dataset);url.searchParams.set("config",config);url.searchParams.set("split","train");url.searchParams.set("offset",String(offset));url.searchParams.set("length","100");
   try{
    const payload:any=await get(url.toString()),rows:any[]=Array.isArray(payload.rows)?payload.rows:[];
    if(payload.error)throw new Error(String(payload.error).slice(0,200));
    if(!rows.length)throw new Error("Dataset Viewer returned an empty page before the expected sample range.");
    const unique=new Map<string,any>();
    for(const item of rows){const row=item?.row??{},mint=String(row.mint??"");if(valid(mint))unique.set(mint,{row,rowIdx:Number(item.row_idx??offset)});}
    const mints=[...unique.keys()];
    const {data:existing,error:existingError}=mints.length?await db.from("mc_tokens").select("mint,name,symbol,metadata_uri,discovery_sources,source_provenance,classification,lifecycle_status,visibility,first_seen_at,data_completeness").in("mint",mints):{data:[],error:null};
    if(existingError)throw existingError;
    const old=new Map((existing??[]).map((x:any)=>[x.mint,x])),now=new Date().toISOString(),tokenRows:any[]=[],referenceRows:any[]=[];
    for(const [mint,item] of unique){
     const row=item.row,prev:any=old.get(mint)??{},providers=[...new Set([...(prev.discovery_sources??[]),"huggingface:"+dataset])];
     const launchedAt=typeof row.launched_at==="string"?row.launched_at:(Number.isFinite(Number(row.t0))?new Date(Number(row.t0)*1000).toISOString():null);
     const metadataUri=typeof row.uri==="string"&&/^(https?:\/\/|ipfs:\/\/|ar:\/\/)/i.test(row.uri)?row.uri:null;
     const claims={rugged_provider_flag:row.rugged??null,graduated_provider_flag:row.graduated??null,rugged_not_graduated:row.rugged_not_graduated??null,rug_branch_inferred:row.rug_branch_inferred??null,decoder_complete:row.decoder_complete??null,features_basis:row.features_basis??null,dev_share:row.dev_share??null,f10_dev_share:row.f10_dev_share??null,f10_insider_share:row.f10_insider_share??null,f10_bundle_wallets:row.f10_bundle_wallets??null,f10_rep_n:row.f10_rep_n??null,f10_rep_rug:row.f10_rep_rug??null,f10_rep_grad:row.f10_rep_grad??null,f10_n_buys:row.f10_n_buys??null,peak_rs:row.peak_rs??null,terminal_rs:row.terminal_rs??null,quote_asset:row.quote_asset??null,quote_basis:row.quote_basis??null};
     const rowLocator="https://datasets-server.huggingface.co/rows?dataset="+encodeURIComponent(dataset)+"&config="+config+"&split=train&offset="+item.rowIdx+"&length=1";
     const sourceRecord={dataset,config,split:"train",row_idx:item.rowIdx,source_revision:revision,launch_at:launchedAt,creator_candidate:valid(row.creator)?row.creator:null,metadata_uri:metadataUri,provider_claims:claims,license:"CC BY 4.0",attribution:"loopholetape, pump.fun launches with outcomes",row_locator:rowLocator};
     tokenRows.push({mint,chain:"solana",name:row.name??prev.name??null,symbol:row.symbol??prev.symbol??null,metadata_uri:metadataUri??prev.metadata_uri??null,classification:prev.classification??"unverified",lifecycle_status:prev.lifecycle_status??"unverified",visibility:prev.visibility??"private",first_seen_at:prev.first_seen_at??now,data_completeness:prev.data_completeness??20,discovery_sources:providers,source_provenance:{...(prev.source_provenance??{}),providers,huggingface_launch:sourceRecord},updated_at:now});
     const hashBytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(row))),hash=[...new Uint8Array(hashBytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
     referenceRows.push({network:"solana-mainnet",subject_type:"token_mint",subject_address:mint,source_id:"huggingface:"+dataset,external_record_id:config+":train:"+item.rowIdx,locator_url:rowLocator,source_revision:revision,content_hash:hash,licence_id:"CC-BY-4.0",attribution:sourceRecord.attribution,retrieval_status:"available",evidence_role:"provider_claim",observed_at:now,last_checked_at:now,normalized_facts:{dataset,config,split:"train",row_idx:item.rowIdx,launch_at:launchedAt,creator_candidate:sourceRecord.creator_candidate,metadata_uri:metadataUri,provider_claims:claims,viewer_url:"https://huggingface.co/datasets/"+dataset+"/viewer/"+config+"/train?row="+item.rowIdx},coverage_notes:summary.limitations.join(" ")});
    }
    if(tokenRows.length){const {error:upsertTokens}=await db.from("mc_tokens").upsert(tokenRows,{onConflict:"mint"});if(upsertTokens)throw upsertTokens;}
    if(referenceRows.length){const {error:upsertRefs}=await db.from("mc_archive_references").upsert(referenceRows,{onConflict:"network,subject_type,subject_address,source_id,external_record_id"});if(upsertRefs)throw upsertRefs;}
    totalRows+=rows.length;totalTokens+=tokenRows.length;totalRefs+=referenceRows.length;cursor=pageIndex+1;sourceRowsSeen+=rows.length;
    const {error:sourceUpdate}=await db.from("mc_discovery_sources").update({cursor_value:cursor,records_seen:sourceRowsSeen,last_success_at:now,last_error:null,enabled:cursor<100,updated_at:now}).eq("source_key",sourceKey);
    if(sourceUpdate)throw sourceUpdate;
    summary.pages.push({config,page_index:pageIndex,offset,rows:rows.length,unique_mints:tokenRows.length,references:referenceRows.length,next_sample_page:cursor});
   }catch(error){
    errorCount++;const message=String(error).slice(0,400);await db.from("mc_discovery_sources").update({last_error_at:new Date().toISOString(),last_error:message,updated_at:new Date().toISOString()}).eq("source_key",sourceKey);
    summary.pages.push({config,page_index:pageIndex,offset,error:message});break;
   }
  }
 }
 const status=errorCount?(totalRows?"partial":"failed"):"succeeded";
 summary.total_rows_sampled=totalRows;summary.unique_tokens_upserted=totalTokens;summary.reference_rows_upserted=totalRefs;summary.error_count=errorCount;
 summary.page_policy="Up to 5 pages per configuration per run; each page is at most 100 rows; cursor advances through 100 evenly spaced strata.";
 await db.from("mc_ingestion_runs").update({status,candidates_seen:totalRows,tokens_upserted:totalTokens,snapshots_inserted:0,classifications_written:0,error_count:errorCount,summary,finished_at:new Date().toISOString()}).eq("id",runId);
 await db.from("mc_audit_events").insert({event_type:"historical_archive_backfill_completed",actor:VERSION,subject_ref:runId,details:{status,total_rows:totalRows,tokens:totalTokens,references:totalRefs,error_count:errorCount,revision}});
 return{run_id:runId,status,dataset_revision:revision,total_rows_sampled:totalRows,unique_tokens_upserted:totalTokens,references_upserted:totalRefs,pages:summary.pages,limitations:summary.limitations};
}

Deno.serve(async req=>{if(req.method!=="POST")return out({error:"POST required"},405);if(!KEY)return out({error:"Worker database credentials are not configured."},503);const auth=req.headers.get("authorization")??"";const token=auth.startsWith("Bearer ")?auth.slice(7):"";let claims:any=null;try{const part=token.split(".")[1];if(part){const normalized=part.replace(/-/g,"+").replace(/_/g,"/");claims=JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,"=")));}}catch{}if(claims?.role!=="service_role")return out({error:"Unauthorized"},401);try{const body=await req.json().catch(()=>({}));if(body.action==="health"){const [t,s,r]=await Promise.all([db.from("mc_tokens").select("mint",{count:"exact",head:true}),db.from("mc_snapshots").select("id",{count:"exact",head:true}),db.from("mc_ingestion_runs").select("id,status,started_at,finished_at").order("started_at",{ascending:false}).limit(5)]);return out({ok:true,version:VERSION,tokens:t.count??0,snapshots:s.count??0,recent_runs:r.data??[]});}if(body.action==="archive_backfill")return out(await backfillHuggingFace(Math.max(1,Math.min(Number(body.pages_per_config??5),5))));if(body.action&&body.action!=="discover"&&body.action!=="run")return out({error:"Unknown action"},400);return out(await discover(Number(body.limit??30),req.headers.get("x-bitquery-token")??undefined));}catch(e){return out({error:String(e).slice(0,500),version:VERSION},500);}});

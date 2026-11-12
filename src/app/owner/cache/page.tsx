"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const URL = "https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search";
const KEY = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";

export default function OwnerCachePage() {
  const [ttl,setTtl]=useState("360");
  const [enabled,setEnabled]=useState(true);
  const [status,setStatus]=useState("Sign in with the Ekhaya owner account to manage shared cache refresh.");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{try{const s=JSON.parse(localStorage.getItem("ekhaya_session")??"null");if(s?.access_token){fetch("https://itxxnhcjjiynrmivexcb.supabase.co/rest/v1/marketplace_cache_settings?id=eq.true&select=refresh_enabled,cache_ttl_minutes",{headers:{apikey:KEY,Authorization:"Bearer "+s.access_token}}).then(r=>r.ok?r.json():[]).then(rows=>{if(rows?.[0]){setEnabled(rows[0].refresh_enabled);setTtl(String(rows[0].cache_ttl_minutes));}}).catch(()=>{});}}catch{}},[]);
  async function save(){setBusy(true);setStatus("");try{const s=JSON.parse(localStorage.getItem("ekhaya_session")??"null");if(!s?.access_token)throw new Error("Please sign in first.");const r=await fetch(URL,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+s.access_token,"Content-Type":"application/json"},body:JSON.stringify({action:"configure_cache",cache_ttl_minutes:Number(ttl),refresh_enabled:enabled})});const d=await r.json();if(!r.ok)throw new Error(d.error??"Unable to save settings.");setStatus("Cache policy saved. New live lookups will use this refresh policy.");}catch(e){setStatus(e instanceof Error?e.message:"Could not save cache policy.");}finally{setBusy(false);}}
  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"32px 6%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <header style={{maxWidth:760,margin:"0 auto",display:"flex",justifyContent:"space-between",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}><b>EKHAYA TECHNOLOGIES</b><Link href="/price-checker/" style={{color:"#079BD3"}}>Price checker →</Link></header>
    <section style={{maxWidth:620,margin:"70px auto",padding:30,background:"#fff",border:"1px solid #DCE8F1",borderRadius:14}}>
      <p style={{color:"#079BD3",fontSize:10,fontWeight:800,letterSpacing:2}}>OWNER CONTROLS</p><h1 style={{fontSize:30,margin:"8px 0 12px"}}>Shared marketplace cache</h1>
      <p style={{fontSize:13,color:"#60758A",lineHeight:1.7}}>Control how long Takealot and Amazon search results remain shared before Ekhaya makes another live provider request. Sellers reopening fresh cached results do not trigger a provider call or consume a search credit.</p>
      <label style={{display:"flex",gap:10,alignItems:"center",margin:"22px 0",fontWeight:700,fontSize:13}}><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Allow automatic refresh when cache expires</label>
      <label style={{display:"block",fontSize:12,fontWeight:700,marginBottom:8}}>Cache lifetime (minutes)</label>
      <input type="number" min="5" max="10080" step="5" value={ttl} onChange={e=>setTtl(e.target.value)} style={{width:"100%",height:46,padding:"0 12px",boxSizing:"border-box",border:"1px solid #DCE8F1",borderRadius:7}}/>
      <p style={{fontSize:11,color:"#71869A"}}>Allowed range: 5 minutes to 7 days. If automatic refresh is paused, expired cached results are served as stale data and clearly labelled.</p>
      <button disabled={busy||Number(ttl)<5||Number(ttl)>10080} onClick={save} style={{width:"100%",padding:14,marginTop:14,border:0,borderRadius:8,background:"#079BD3",color:"#fff",fontWeight:700}}>{busy?"Saving…":"Save cache policy"}</button>
      {status&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#304B63",padding:12,background:"#F4F8FC",borderRadius:8,marginTop:16}}>{status}</p>}
    </section>
  </main>;
}

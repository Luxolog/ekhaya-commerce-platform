"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const URL = "https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search";
const KEY = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";
type Seller = { email: string | null; user_id: string; started_at: string; ends_at: string; status: string; daily_limit: number; pilot_label: string | null };

export default function OwnerPilotPage() {
  const [email,setEmail]=useState("");
  const [limit,setLimit]=useState("15");
  const [label,setLabel]=useState("");
  const [status,setStatus]=useState("Sign in with the Ekhaya owner account to manage the 10-day seller pilot.");
  const [sellers,setSellers]=useState<Seller[]>([]);
  const [busy,setBusy]=useState(false);
  const [installPrompt,setInstallPrompt]=useState<any>(null);
  const [installed,setInstalled]=useState(false);

  useEffect(()=>{
    const handler=(event:Event)=>{event.preventDefault();setInstallPrompt(event);};
    const onInstalled=()=>{setInstalled(true);setInstallPrompt(null);};
    window.addEventListener("beforeinstallprompt",handler);
    window.addEventListener("appinstalled",onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/owner-pilot-sw.js").catch(()=>{});
    return ()=>{window.removeEventListener("beforeinstallprompt",handler);window.removeEventListener("appinstalled",onInstalled);};
  },[]);

  async function installDesktop(){
    if(installPrompt){const prompt=installPrompt;await prompt.prompt();const choice=await prompt.userChoice;if(choice?.outcome==="accepted")setInstallPrompt(null);return;}
    setStatus("To install on Windows: open this page in Chrome or Edge, select the install icon in the address bar (or browser menu → Cast, save and share → Install page as app), then choose Install.");
  }

  async function call(action:string,extra:Record<string,unknown>={}) {
    const session=JSON.parse(localStorage.getItem("ekhaya_session")??"null");
    if(!session?.access_token) throw new Error("Please sign in with the Ekhaya owner account first.");
    const response=await fetch(URL,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify({action,...extra})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error??"Request failed.");
    return data;
  }
  async function refresh() {
    try { const data=await call("list_seller_pilots"); setSellers(data.sellers??[]); }
    catch(e) { setStatus(e instanceof Error?e.message:"Could not load pilot sellers."); }
  }
  useEffect(()=>{refresh();},[]);
  async function activate() {
    setBusy(true);setStatus("");
    try {
      const data=await call("activate_seller_pilot",{email,daily_limit:Number(limit),pilot_label:label});
      const result=data.result;
      setStatus("Pilot activated for "+data.email+". "+result.daily_limit+" Takealot searches per day until "+new Date(result.ends_at).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"})+".");
      setEmail("");await refresh();
    } catch(e) { setStatus(e instanceof Error?e.message:"Could not activate seller."); }
    finally { setBusy(false); }
  }
  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"32px 6%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <link rel="manifest" href="/owner-pilot.webmanifest" /><meta name="theme-color" content="#071B31" /><header style={{maxWidth:820,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}><b>EKHAYA TECHNOLOGIES</b><div style={{display:"flex",alignItems:"center",gap:14}}><button onClick={installDesktop} disabled={installed} style={{background:"#071B31",color:"#fff",border:0,borderRadius:7,padding:"10px 13px",fontWeight:700,cursor:"pointer"}}>{installed?"Installed on this desktop":"Install desktop app"}</button><Link href="/price-checker/" style={{color:"#079BD3"}}>Price Checker →</Link></div></header>
    <section style={{maxWidth:760,margin:"55px auto",padding:28,background:"#fff",border:"1px solid #DCE8F1",borderRadius:14}}>
      <p style={{color:"#079BD3",fontSize:10,fontWeight:800,letterSpacing:2}}>OWNER CONTROLS · PRIVATE PILOT</p>
      <h1 style={{fontSize:30,margin:"8px 0 12px"}}>10-day seller testing</h1>
      <p style={{fontSize:13,color:"#60758A",lineHeight:1.7}}>Activate a seller after they have registered. Their 10-day clock starts at activation. Only Takealot live searches are available during this pilot. Five seller seats receive 15 searches per South African calendar day; the Beyond Shopping seat receives 20.</p>
      <div style={{display:"grid",gap:12,marginTop:22}}>
        <label style={{fontSize:12,fontWeight:700}}>Registered seller email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="seller@example.co.za" style={{display:"block",width:"100%",height:44,marginTop:7,padding:"0 12px",boxSizing:"border-box",border:"1px solid #DCE8F1",borderRadius:7}}/></label>
        <label style={{fontSize:12,fontWeight:700}}>Daily search allowance<select value={limit} onChange={e=>{setLimit(e.target.value);setLabel(e.target.value==="20"?"Beyond Shopping":"");}} style={{display:"block",width:"100%",height:44,marginTop:7,padding:"0 12px",border:"1px solid #DCE8F1",borderRadius:7}}><option value="15">15 searches · one of five seller seats</option><option value="20">20 searches · Beyond Shopping only</option></select></label>
        <label style={{fontSize:12,fontWeight:700}}>Pilot label<input value={label} onChange={e=>setLabel(e.target.value)} placeholder="Seller name (optional)" disabled={limit==="20"} style={{display:"block",width:"100%",height:44,marginTop:7,padding:"0 12px",boxSizing:"border-box",border:"1px solid #DCE8F1",borderRadius:7}}/></label>
        <button disabled={busy||!email.trim()||(limit==="20"&&label.toLowerCase()!=="beyond shopping")} onClick={activate} style={{padding:14,border:0,borderRadius:8,background:"#079BD3",color:"#fff",fontWeight:700,opacity:busy?0.6:1}}>{busy?"Activating…":"Activate 10-day pilot"}</button>
      </div>
      {status&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#304B63",padding:12,background:"#F4F8FC",borderRadius:8,marginTop:16}}>{status}</p>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:30}}><h2 style={{fontSize:18}}>Pilot seller records</h2><button onClick={refresh} style={{border:"1px solid #DCE8F1",borderRadius:7,padding:"8px 12px",background:"#fff"}}>Refresh</button></div>
      <div style={{display:"grid",gap:9,marginTop:12}}>
        {sellers.length===0?<p style={{fontSize:12,color:"#71869A"}}>No sellers have been activated yet. Sellers must register before activation.</p>:sellers.map(s=><article key={s.user_id} style={{border:"1px solid #E1EAF2",borderRadius:9,padding:13,display:"grid",gap:5}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><b style={{fontSize:13}}>{s.pilot_label??s.email??s.user_id}</b><strong style={{fontSize:11,color:s.status==="active"?"#16845B":"#71869A"}}>{s.status.toUpperCase()}</strong></div>
          <small style={{color:"#60758A"}}>{s.email} · {s.daily_limit} searches/day · {new Date(s.ends_at).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"})} expiry</small>
        </article>)}
      </div>
    </section>
  </main>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const URL = "https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search";
const KEY = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";
type Seller = { email:string|null; user_id:string; started_at:string; ends_at:string; status:string; daily_limit:number; pilot_label:string|null };
type Activity = { user_id:string; marketplace:string; query:string; result_count:number; result_status:string; source:string|null; created_at:string };
type Feedback = { id:number; user_id:string; category:string; rating:number|null; message:string; status:string; created_at:string };
type Analytics = { totals:{searches:number;failures:number;feedback:number;open_feedback:number}; by_seller:Record<string,{searches:number;failures:number;last_search:string|null}>; popular_queries:{query:string;count:number}[]; activity:Activity[]; feedback:Feedback[] };

const card:React.CSSProperties={background:"#fff",border:"1px solid #DCE8F1",borderRadius:12,padding:18};
const button:React.CSSProperties={border:"1px solid #DCE8F1",borderRadius:7,padding:"9px 12px",background:"#fff",color:"#071B31",fontWeight:700,cursor:"pointer"};
const primary:React.CSSProperties={...button,background:"#079BD3",borderColor:"#079BD3",color:"#fff"};
const small:React.CSSProperties={fontSize:12,color:"#60758A"};
const fmt=(value:string)=>new Date(value).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"});

export default function OwnerPilotPage(){
  const [email,setEmail]=useState(""); const [limit,setLimit]=useState("15"); const [label,setLabel]=useState("");
  const [status,setStatus]=useState("Sign in with the Ekhaya owner account to manage the seller pilot.");
  const [sellers,setSellers]=useState<Seller[]>([]); const [analytics,setAnalytics]=useState<Analytics|null>(null);
  const [busy,setBusy]=useState(false); const [tab,setTab]=useState("overview");
  const [installPrompt,setInstallPrompt]=useState<any>(null); const [installed,setInstalled]=useState(false);
  const [feedbackCategory,setFeedbackCategory]=useState("product_feedback"); const [feedbackRating,setFeedbackRating]=useState("5"); const [feedbackMessage,setFeedbackMessage]=useState("");
  const [extendDays,setExtendDays]=useState<Record<string,string>>({});
  const [searchFilter,setSearchFilter]=useState("");
  useEffect(()=>{
    const handler=(event:Event)=>{event.preventDefault();setInstallPrompt(event);};
    const onInstalled=()=>{setInstalled(true);setInstallPrompt(null);};
    window.addEventListener("beforeinstallprompt",handler); window.addEventListener("appinstalled",onInstalled);
    if(window.matchMedia("(display-mode: standalone)").matches)setInstalled(true);
    if("serviceWorker" in navigator)navigator.serviceWorker.register("/owner-pilot-sw.js").catch(()=>{});
    return()=>{window.removeEventListener("beforeinstallprompt",handler);window.removeEventListener("appinstalled",onInstalled);};
  },[]);
  async function installDesktop(){
    if(installPrompt){const p=installPrompt;await p.prompt();const choice=await p.userChoice;if(choice?.outcome==="accepted")setInstallPrompt(null);return;}
    setStatus("In Chrome or Edge, use the install icon in the address bar or browser menu → Install page as app.");
  }
  async function call(action:string,extra:Record<string,unknown>={}){
    const session=JSON.parse(localStorage.getItem("ekhaya_session")??"null");
    if(!session?.access_token)throw new Error("Please sign in with the Ekhaya owner account first.");
    const response=await fetch(URL,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify({action,...extra})});
    const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error??"Request failed."); return data;
  }
  async function refresh(){
    try{const [s,a]=await Promise.all([call("list_seller_pilots"),call("owner_pilot_analytics")]);setSellers(s.sellers??[]);setAnalytics(a);}
    catch(e){setStatus(e instanceof Error?e.message:"Could not load pilot operations.");}
  }
  useEffect(()=>{refresh();},[]);
  async function run(action:string,extra:Record<string,unknown>,success:string){
    setBusy(true);setStatus("");
    try{await call(action,extra);setStatus(success);await refresh();}
    catch(e){setStatus(e instanceof Error?e.message:"The operation could not be completed.");}
    finally{setBusy(false);}
  }
  async function activate(){
    setBusy(true);setStatus("");
    try{const data=await call("activate_seller_pilot",{email,daily_limit:Number(limit),pilot_label:label});setStatus("Pilot activated for "+data.email+". "+data.result.daily_limit+" searches/day.");setEmail("");await refresh();}
    catch(e){setStatus(e instanceof Error?e.message:"Could not activate seller.");}finally{setBusy(false);}
  }
  async function submitFeedback(){
    setBusy(true);
    try{await call("submit_pilot_feedback",{category:feedbackCategory,rating:Number(feedbackRating),message:feedbackMessage});setFeedbackMessage("");setStatus("Thank you. Your feedback has been submitted.");}
    catch(e){setStatus(e instanceof Error?e.message:"Could not submit feedback.");}finally{setBusy(false);}
  }
  const totalSearches=analytics?.totals.searches??0;
  const activeCount=sellers.filter(s=>s.status==="active"&&new Date(s.ends_at)>new Date()).length;
  const filteredActivity=useMemo(()=> (analytics?.activity??[]).filter(a=>!searchFilter||a.query.toLowerCase().includes(searchFilter.toLowerCase())||a.user_id.includes(searchFilter)),[analytics,searchFilter]);
  function exportCsv(){
    const rows=[["Seller ID","Marketplace","Search","Results","Status","Source","Date"],...filteredActivity.map(a=>[a.user_id,a.marketplace,a.query,a.result_count,a.result_status,a.source??"",fmt(a.created_at)])];
    const csv=rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ekhaya-pilot-activity.csv";a.click();URL.revokeObjectURL(url);
  }
  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 4%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <link rel="manifest" href="/owner-pilot.webmanifest"/><meta name="theme-color" content="#071B31"/>
    <header style={{maxWidth:1180,margin:"0 auto 24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}>
      <div><b>EKHAYA TECHNOLOGIES</b><div style={small}>PRICE CHECKER · PILOT OPERATIONS</div></div>
      <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap"}}><button onClick={installDesktop} disabled={installed} style={primary}>{installed?"Desktop app installed":"Install desktop app"}</button><Link href="/price-checker/" style={{color:"#079BD3",fontWeight:700,textDecoration:"none"}}>Open Price Checker →</Link></div>
    </header>
    <div style={{maxWidth:1180,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,flexWrap:"wrap",marginBottom:20}}><div><div style={{fontSize:11,color:"#079BD3",fontWeight:800,letterSpacing:2}}>PRIVATE TEST PROGRAMME</div><h1 style={{fontSize:30,margin:"6px 0"}}>Pilot Operations Dashboard</h1><p style={small}>Manage seller access, monitor usage and collect product feedback.</p></div><button style={button} onClick={refresh}>↻ Refresh dashboard</button></div>
      <nav style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>{[["overview","Overview"],["sellers","Seller management"],["activity","Search activity"],["feedback","Feedback centre"]].map(([id,name])=><button key={id} onClick={()=>setTab(id)} style={{...button,background:tab===id?"#071B31":"#fff",color:tab===id?"#fff":"#071B31",borderColor:tab===id?"#071B31":"#DCE8F1"}}>{name}</button>)}</nav>
      {status&&<div role="status" style={{...card,marginBottom:16,fontSize:13,color:"#304B63"}}>{status}</div>}
      {tab==="overview"&&<div style={{display:"grid",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
          {[["Active sellers",activeCount+"/6"],["Searches recorded",totalSearches],["Failed searches",analytics?.totals.failures??0],["Open feedback",analytics?.totals.open_feedback??0]].map(([label,value])=><div key={String(label)} style={card}><div style={small}>{label}</div><div style={{fontSize:28,fontWeight:800,marginTop:7}}>{value}</div></div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14}}>
          <section style={card}><h2 style={{fontSize:17,marginTop:0}}>Pilot capacity</h2><p style={small}>Five standard seats · 15 searches/day each</p><p style={small}>Beyond Shopping · 20 searches/day</p><div style={{fontSize:27,fontWeight:800}}>95 searches/day</div><p style={small}>950 possible searches over the full 10-day pilot, if every allowance is used.</p></section>
          <section style={card}><h2 style={{fontSize:17,marginTop:0}}>Most searched products</h2>{(analytics?.popular_queries??[]).length===0?<p style={small}>No search activity has been recorded yet.</p>:(analytics?.popular_queries??[]).map(x=><div key={x.query} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #EEF2F6",fontSize:13}}><span>{x.query}</span><b>{x.count}</b></div>)}</section>
        </div>
        <section style={card}><h2 style={{fontSize:17,marginTop:0}}>Seller snapshot</h2>{sellers.length===0?<p style={small}>No seller pilot records yet.</p>:sellers.map(s=><div key={s.user_id} style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap",padding:"10px 0",borderBottom:"1px solid #EEF2F6"}}><div><b style={{fontSize:13}}>{s.pilot_label??s.email??s.user_id}</b><div style={small}>{s.email??s.user_id}</div></div><div style={{textAlign:"right"}}><b style={{fontSize:12}}>{analytics?.by_seller?.[s.user_id]?.searches??0} searches</b><div style={small}>{s.status} · {s.daily_limit}/day</div></div></div>)}</section>
      </div>}
      {tab==="sellers"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14,alignItems:"start"}}>
        <section style={card}><h2 style={{fontSize:18,marginTop:0}}>Activate a seller</h2><p style={small}>The 10-day countdown starts only when you activate a registered account.</p>
          <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:14}}>Registered seller email<input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="seller@example.co.za" style={{display:"block",width:"100%",height:42,boxSizing:"border-box",marginTop:6,padding:"0 10px",border:"1px solid #DCE8F1",borderRadius:7}}/></label>
          <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:12}}>Daily allowance<select value={limit} onChange={e=>{setLimit(e.target.value);setLabel(e.target.value==="20"?"Beyond Shopping":"");}} style={{display:"block",width:"100%",height:42,boxSizing:"border-box",marginTop:6,padding:"0 10px",border:"1px solid #DCE8F1",borderRadius:7}}><option value="15">15 searches · standard seller</option><option value="20">20 searches · Beyond Shopping only</option></select></label>
          <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:12}}>Pilot label<input value={label} onChange={e=>setLabel(e.target.value)} disabled={limit==="20"} placeholder="Optional seller label" style={{display:"block",width:"100%",height:42,boxSizing:"border-box",marginTop:6,padding:"0 10px",border:"1px solid #DCE8F1",borderRadius:7}}/></label>
          <button disabled={busy||!email.trim()||(limit==="20"&&label.toLowerCase()!=="beyond shopping")} onClick={activate} style={{...primary,width:"100%",marginTop:16,opacity:busy ? 0.6 : 1}}>Activate 10-day pilot</button>
        </section>
        <section style={card}><h2 style={{fontSize:18,marginTop:0}}>Seller controls</h2>{sellers.length===0?<p style={small}>Seller records will appear here after activation.</p>:sellers.map(s=><article key={s.user_id} style={{border:"1px solid #E5EDF4",borderRadius:9,padding:12,marginTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{fontSize:13}}>{s.pilot_label??s.email??s.user_id}</b><span style={{fontSize:11,fontWeight:700,color:s.status==="active"?"#16845B":"#A15C19"}}>{s.status.toUpperCase()}</span></div>
          <p style={small}>{s.email} · {s.daily_limit} searches/day</p><p style={small}>Expires: {fmt(s.ends_at)}</p><p style={small}>Usage: {analytics?.by_seller?.[s.user_id]?.searches??0} searches · {analytics?.by_seller?.[s.user_id]?.failures??0} failures</p>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:10}}>
            {s.status==="active"?<button disabled={busy} style={button} onClick={()=>run("owner_update_pilot",{target_user_id:s.user_id,operation:"suspend"},"Seller access suspended.")}>Suspend</button>:<button disabled={busy} style={button} onClick={()=>run("owner_update_pilot",{target_user_id:s.user_id,operation:"resume"},"Seller access reactivated.")}>Reactivate</button>}
            <select aria-label="Extension days" value={extendDays[s.user_id]??"3"} onChange={e=>setExtendDays(v=>({...v,[s.user_id]:e.target.value}))} style={{...button,padding:"8px"}}><option value="1">+1 day</option><option value="3">+3 days</option><option value="5">+5 days</option><option value="10">+10 days</option><option value="30">+30 days</option></select>
            <button disabled={busy} style={button} onClick={()=>run("owner_update_pilot",{target_user_id:s.user_id,operation:"extend",days:Number(extendDays[s.user_id]??3)},"Seller pilot period extended.")}>Extend</button>
          </div>
        </article>)}</section>
      </div>}
      {tab==="activity"&&<section style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div><h2 style={{fontSize:18,margin:"0 0 4px"}}>Search activity</h2><p style={small}>Recorded successful pilot searches, including cached results.</p></div><button style={primary} onClick={exportCsv}>Export CSV</button></div>
        <input value={searchFilter} onChange={e=>setSearchFilter(e.target.value)} placeholder="Filter by product or seller ID" style={{width:"100%",boxSizing:"border-box",height:40,margin:"12px 0",padding:"0 10px",border:"1px solid #DCE8F1",borderRadius:7}}/>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:650}}><thead><tr>{["When","Seller","Marketplace","Search","Results","Source"].map(x=><th key={x} style={{textAlign:"left",padding:9,borderBottom:"1px solid #DCE8F1",color:"#60758A"}}>{x}</th>)}</tr></thead><tbody>{filteredActivity.map((a,i)=><tr key={i}>{[fmt(a.created_at),a.user_id.slice(0,8),a.marketplace,a.query,a.result_count,a.source??a.result_status].map((x,j)=><td key={j} style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{x}</td>)}</tr>)}</tbody></table></div>
        {filteredActivity.length===0&&<p style={small}>No matching search records.</p>}
      </section>}
      {tab==="feedback"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14,alignItems:"start"}}>
        <section style={card}><h2 style={{fontSize:18,marginTop:0}}>Submit tester feedback</h2><p style={small}>Sellers can use this form while signed in to report issues or share suggestions.</p>
          <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:12}}>Category<select value={feedbackCategory} onChange={e=>setFeedbackCategory(e.target.value)} style={{display:"block",width:"100%",height:42,marginTop:6,padding:"0 10px",border:"1px solid #DCE8F1",borderRadius:7}}><option value="product_feedback">Product feedback</option><option value="bug">Bug report</option><option value="data_quality">Price/data quality</option><option value="other">Other</option></select></label>
          <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:12}}>Rating<select value={feedbackRating} onChange={e=>setFeedbackRating(e.target.value)} style={{display:"block",width:"100%",height:42,marginTop:6,padding:"0 10px",border:"1px solid #DCE8F1",borderRadius:7}}><option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3">3 · Average</option><option value="2">2 · Poor</option><option value="1">1 · Very poor</option></select></label>
          <textarea value={feedbackMessage} onChange={e=>setFeedbackMessage(e.target.value)} rows={5} placeholder="Tell us what happened or what should improve..." style={{display:"block",width:"100%",boxSizing:"border-box",marginTop:12,padding:10,border:"1px solid #DCE8F1",borderRadius:7}}/>
          <button disabled={busy||feedbackMessage.trim().length<5} style={{...primary,width:"100%",marginTop:10}} onClick={submitFeedback}>Submit feedback</button>
        </section>
        <section style={card}><h2 style={{fontSize:18,marginTop:0}}>Feedback inbox</h2>{(analytics?.feedback??[]).length===0?<p style={small}>No feedback has been submitted yet.</p>:(analytics?.feedback??[]).map(f=><article key={f.id} style={{borderBottom:"1px solid #EEF2F6",padding:"12px 0"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{fontSize:12}}>{f.category.replace("_"," ")}</b><span style={small}>{f.rating?f.rating+"/5":""} · {f.status}</span></div><p style={{fontSize:13,lineHeight:1.5}}>{f.message}</p><p style={small}>{fmt(f.created_at)} · {f.user_id.slice(0,8)}</p><div style={{display:"flex",gap:7}}><button style={button} onClick={()=>run("owner_update_feedback",{feedback_id:f.id,status:"reviewing"},"Feedback marked as under review.")}>Reviewing</button><button style={button} onClick={()=>run("owner_update_feedback",{feedback_id:f.id,status:"resolved"},"Feedback marked resolved.")}>Resolve</button></div></article>)}</section>
      </div>}
      <footer style={{...small,textAlign:"center",padding:"28px 0"}}>Ekhaya Technologies · Private Seller Pilot · Owner access only</footer>
    </div>
  </main>;
}

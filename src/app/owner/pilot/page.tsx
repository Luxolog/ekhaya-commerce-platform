/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const EDGE_URL = "https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search";
const KEY = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";
type PortalUser = {user_id:string;email:string|null;display_name:string|null;created_at:string|null;last_sign_in_at:string|null;email_confirmed_at:string|null;role:string;account_status:"pending"|"active"|"inactive"|"suspended";plan_code:string;pilot:Seller|null};
type Seller = { email:string|null; user_id:string; started_at:string; ends_at:string; status:string; daily_limit:number; pilot_label:string|null };
type Activity = { user_id:string; marketplace:string; query:string; result_count:number; result_status:string; source:string|null; created_at:string };
type Feedback = { id:number; user_id:string; category:string; rating:number|null; message:string; status:string; created_at:string };
type Analytics = { totals:{searches:number;failures:number;feedback:number;open_feedback:number}; by_seller:Record<string,{searches:number;failures:number;last_search:string|null}>; popular_queries:{query:string;count:number}[]; activity:Activity[]; feedback:Feedback[] };

const card:React.CSSProperties={background:"#fff",border:"1px solid #DCE8F1",borderRadius:12,padding:18};
const button:React.CSSProperties={border:"1px solid #DCE8F1",borderRadius:7,padding:"9px 12px",background:"#fff",color:"#071B31",fontWeight:700,cursor:"pointer"};
const primary:React.CSSProperties={...button,background:"#079BD3",borderColor:"#079BD3",color:"#fff"};
const small:React.CSSProperties={fontSize:12,color:"#60758A"};
const fmt=(value:string)=>new Date(value).toLocaleString("en-ZA",{timeZone:"Africa/Johannesburg"});
let sessionRefreshPromise:Promise<any>|null=null;

export default function OwnerPilotPage(){
  const [email,setEmail]=useState(""); const [limit,setLimit]=useState("15"); const [label,setLabel]=useState("");
  const [status,setStatus]=useState("Sign in with the Ekhaya owner account to manage the seller pilot.");
  const [sellers,setSellers]=useState<Seller[]>([]); const [users,setUsers]=useState<PortalUser[]>([]); const [analytics,setAnalytics]=useState<Analytics|null>(null);
  const [busy,setBusy]=useState(false); const [tab,setTab]=useState("overview");
  const [installPrompt,setInstallPrompt]=useState<any>(null); const [installed,setInstalled]=useState(false);
  const [feedbackCategory,setFeedbackCategory]=useState("product_feedback"); const [feedbackRating,setFeedbackRating]=useState("5"); const [feedbackMessage,setFeedbackMessage]=useState("");
  const [extendDays,setExtendDays]=useState<Record<string,string>>({});
  const [searchFilter,setSearchFilter]=useState("");
  const [statusFilter,setStatusFilter]=useState("all");
  const [security,setSecurity]=useState<{events:any[];identities:any[];blocked_domains:any[]}>({events:[],identities:[],blocked_domains:[]});
  const [financial,setFinancial]=useState<any|null>(null);
  const [blockedDomain,setBlockedDomain]=useState(""); const [blockedReason,setBlockedReason]=useState("");
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
  async function getOwnerSession(){
    const session=JSON.parse(localStorage.getItem("ekhaya_session")??"null");
    if(!session?.access_token)throw new Error("Please sign in with the Ekhaya owner account first.");
    if(Number(session.expires_at??0)>Date.now()+60000)return session;
    if(!session.refresh_token){localStorage.removeItem("ekhaya_session");throw new Error("Your owner session expired. Please sign in again.");}
    if(!sessionRefreshPromise){
      sessionRefreshPromise=(async()=>{
        const response=await fetch("https://itxxnhcjjiynrmivexcb.supabase.co/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({refresh_token:session.refresh_token})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok||!data.access_token){localStorage.removeItem("ekhaya_session");throw new Error("Your owner session expired. Please sign in again.");}
        const next={...data,expires_at:Date.now()+Number(data.expires_in??3600)*1000};
        localStorage.setItem("ekhaya_session",JSON.stringify(next));return next;
      })().finally(()=>{sessionRefreshPromise=null;});
    }
    return await sessionRefreshPromise;
  }
  async function call(action:string,extra:Record<string,unknown>={}){
    const session=await getOwnerSession();
    const response=await fetch(EDGE_URL,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify({action,...extra})});
    const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error??"Request failed."); return data;
  }
  async function refresh(){
    const results=await Promise.allSettled([call("list_seller_pilots"),call("owner_pilot_analytics"),call("owner_list_users"),call("owner_security_dashboard"),call("owner_financial_analytics")]);
    if(results[0].status==="fulfilled")setSellers(results[0].value.sellers??[]);
    if(results[1].status==="fulfilled")setAnalytics(results[1].value);
    if(results[2].status==="fulfilled")setUsers(results[2].value.users??[]);
    if(results[3].status==="fulfilled")setSecurity(results[3].value);
    if(results[4].status==="fulfilled")setFinancial(results[4].value);
    const failed=results.find(x=>x.status==="rejected") as PromiseRejectedResult|undefined;
    if(failed)setStatus(failed.reason instanceof Error?failed.reason.message:"Some dashboard data could not be refreshed.");
    else setStatus("Dashboard updated · "+new Date().toLocaleTimeString("en-ZA"));
  }
  useEffect(()=>{if(!localStorage.getItem("ekhaya_session")){window.location.replace("/owner/login/");return;}void refresh();const timer=window.setInterval(()=>void refresh(),30000);return()=>window.clearInterval(timer);},[]);
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
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,flexWrap:"wrap",marginBottom:20}}><div><div style={{fontSize:11,color:"#079BD3",fontWeight:800,letterSpacing:2}}>PRIVATE TEST PROGRAMME</div><h1 style={{fontSize:30,margin:"6px 0"}}>Pilot Operations Dashboard</h1><p style={small}>Manage seller access, monitor usage and collect product feedback.</p></div><div style={{display:"flex",gap:8}}><button style={button} onClick={refresh}>↻ Refresh dashboard</button><button style={button} onClick={()=>{localStorage.removeItem("ekhaya_session");window.location.replace("/owner/login/");}}>Sign out</button></div></div>
      <nav style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:18}}>{[["overview","Overview"],["profitability","Profitability"],["users","Users & sellers"],["sellers","Seller management"],["security","Security & Fraud"],["activity","Search activity"],["feedback","Feedback centre"]].map(([id,name])=><button key={id} onClick={()=>setTab(id)} style={{...button,background:tab===id?"#071B31":"#fff",color:tab===id?"#fff":"#071B31",borderColor:tab===id?"#071B31":"#DCE8F1"}}>{name}</button>)}</nav>
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
      {tab==="profitability"&&<div style={{display:"grid",gap:14}}>
        {(()=>{const f=financial??{};const plans=f.plans??[];const profiles=f.profiles??[];const payments=f.payments??[];const subs=f.subscriptions??[];const api=f.api_usage??[];const paid=payments.filter((p:any)=>p.status==="complete");const collected=paid.reduce((n:number,p:any)=>n+Number(p.amount??0),0);const activeSubs=subs.filter((s:any)=>s.status==="active");const mrr=activeSubs.reduce((n:number,s:any)=>n+Number(plans.find((p:any)=>p.code===s.plan_code)?.monthly_price??0),0);const apiCalls=api.filter((a:any)=>a.request_status==="success");const credits=apiCalls.reduce((n:number,a:any)=>n+Number(a.credits_charged??0),0);const reefCredits=apiCalls.filter((a:any)=>a.provider==="reefapi").reduce((n:number,a:any)=>n+Number(a.credits_charged??0),0);const estimatedApiCost=reefCredits*0.02535;const gross=collected-estimatedApiCost;const byUser=new Map<string,any>();for(const p of paid){const row=byUser.get(p.user_id)??{user_id:p.user_id,revenue:0};row.revenue+=Number(p.amount??0);byUser.set(p.user_id,row);}for(const a of apiCalls){if(a.actor_id){const row=byUser.get(a.actor_id)??{user_id:a.actor_id,revenue:0};row.apiCost=(row.apiCost??0)+(a.provider==="reefapi"?Number(a.credits_charged??0)*0.02535:0);row.calls=(row.calls??0)+1;byUser.set(a.actor_id,row);}}return <><div style={{...card,background:"#FFF8E8",borderColor:"#E9D9B3"}}><b style={{fontSize:14}}>Important: estimates, not audited accounts</b><p style={{...small,marginBottom:0}}>ReefAPI is estimated at R0.02535 per credit using the Pro-tier reference rate. Replace this with your actual provider invoice/rate. Unattributed API usage is shown separately; payment records only count when marked complete.</p></div>
        <section style={{...card,borderColor:"#B8D8E8"}}>
          <h2 style={{fontSize:17,margin:"0 0 8px"}}>ReefAPI provider-credit policy</h2>
          <p style={{...small,margin:"0 0 12px"}}>These terms apply to Ekhaya Technologies' ReefAPI account, not to seller subscription allowances.</p>
          <ul style={{...small,paddingLeft:20,margin:"0 0 12px",lineHeight:1.9}}>
            <li>Paid-plan ReefAPI credits do not expire.</li>
            <li>Unused provider credits carry over; they are not forfeited at month-end.</li>
            <li>Credits already received remain usable after subscription cancellation.</li>
            <li>Failed or blocked provider requests should not be charged; verify the provider-reported credit amount in the usage ledger.</li>
          </ul>
          <p style={{...small,margin:0}}>Ekhaya records provider-reported credit usage and failed attempts. ReefAPI controls its account balance, billing and credit validity; this dashboard does not change or override ReefAPI's terms.</p>
        </section>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>
          {[[ "Cash recorded", "R"+collected.toFixed(2) ],["Active subscription MRR","R"+mrr.toFixed(2)],["Estimated ReefAPI cost","R"+estimatedApiCost.toFixed(2)],["Recorded gross after API","R"+gross.toFixed(2)],["Successful provider calls",apiCalls.length],["Credits consumed",credits]].map(([label,value])=><div key={label} style={card}><div style={small}>{label}</div><div style={{fontSize:25,fontWeight:800,marginTop:7}}>{value}</div></div>)}
        </div>
        <section style={card}><h2 style={{fontSize:17,marginTop:0}}>Plan economics</h2><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Plan","Monthly price","Accounts","Active subscriptions","Status"].map(x=><th key={x} style={{textAlign:"left",padding:9,borderBottom:"1px solid #DCE8F1"}}>{x}</th>)}</tr></thead><tbody>{plans.map((p:any)=><tr key={p.code}><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{p.name}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>R{Number(p.monthly_price).toFixed(2)}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{profiles.filter((u:any)=>u.plan_code===p.code).length}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{activeSubs.filter((s:any)=>s.plan_code===p.code).length}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{p.is_active?"Available":"Inactive"}</td></tr>)}</tbody></table></div></section>
        <section style={card}><h2 style={{fontSize:17,marginTop:0}}>Per-user recorded economics</h2><p style={small}>Revenue is based on completed payment transactions. API cost is attributed only where the ledger contains an actor ID. Missing attribution is not treated as zero cost.</p><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["User ID","Recorded revenue","Attributed API cost","Calls","Gross after attributed API"].map(x=><th key={x} style={{textAlign:"left",padding:9,borderBottom:"1px solid #DCE8F1"}}>{x}</th>)}</tr></thead><tbody>{[...byUser.values()].map((u:any)=><tr key={u.user_id}><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{u.user_id.slice(0,8)}…</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>R{u.revenue.toFixed(2)}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{u.apiCost===undefined?"Not attributed":"R"+u.apiCost.toFixed(2)}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{u.calls??"—"}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{u.apiCost===undefined?"Unknown":"R"+(u.revenue-u.apiCost).toFixed(2)}</td></tr>)}</tbody></table>{byUser.size===0&&<p style={small}>No completed payments are recorded yet.</p>}</div></section>
        <section style={card}><h2 style={{fontSize:17,marginTop:0}}>Provider usage & cost estimate</h2><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Provider","Marketplace","Successful calls","Credits","Estimated cost"].map(x=><th key={x} style={{textAlign:"left",padding:9,borderBottom:"1px solid #DCE8F1"}}>{x}</th>)}</tr></thead><tbody>{[...new Set(api.map((a:any)=>a.provider+"|"+a.marketplace))].map((key:any)=>{const [provider,market]=key.split("|");const rows=api.filter((a:any)=>a.provider===provider&&a.marketplace===market&&a.request_status==="success");const c=rows.reduce((n:number,a:any)=>n+Number(a.credits_charged??0),0);return <tr key={key}><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{provider}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{market}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{rows.length}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{c}</td><td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{provider==="reefapi"?"R"+(c*0.02535).toFixed(2):"Rate not configured"}</td></tr>})}</tbody></table></div></section>
        <div style={small}>Generated {f.generated_at?fmt(f.generated_at):"—"} · Excludes payment processing fees, hosting, support, refunds, taxes and other overheads. Gross here is not net profit.</div></>;})()}
      </div>}
      {tab==="users"&&<section style={card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div><h2 style={{fontSize:18,margin:"0 0 4px"}}>All registered accounts</h2><p style={small}>Every Supabase account is listed, including pending, inactive and suspended users. Only approved active accounts can search.</p></div>
          <b>{users.length} total accounts</b>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(115px,1fr))",gap:8,marginTop:14}}>
          {(["pending","active","inactive","suspended"] as const).map(s=><button key={s} onClick={()=>setStatusFilter(statusFilter===s?"all":s)} style={{...button,textAlign:"left",borderColor:statusFilter===s?"#079BD3":"#DCE8F1",background:statusFilter===s?"#EAF7FC":"#fff"}}><div style={{fontSize:11,color:"#60758A",textTransform:"capitalize"}}>{s}</div><div style={{fontSize:22,fontWeight:800}}>{users.filter(u=>u.role!=="owner"&&u.account_status===s).length}</div></button>)}
        </div>
        <div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:12}}>
          <input value={searchFilter} onChange={e=>setSearchFilter(e.target.value)} placeholder="Search name, email or account ID" style={{flex:"1 1 260px",boxSizing:"border-box",height:40,padding:"0 10px",border:"1px solid #DCE8F1",borderRadius:7}}/>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{height:40,padding:"0 10px",border:"1px solid #DCE8F1",borderRadius:7}}><option value="all">All statuses</option><option value="pending">Pending</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select>
        </div>
        <div style={{overflowX:"auto",marginTop:12}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1050}}>
          <thead><tr>{["User","Email","Account","Status","Pilot access","Searches","Registered","Last sign-in","Actions"].map(x=><th key={x} style={{textAlign:"left",padding:9,borderBottom:"1px solid #DCE8F1",color:"#60758A"}}>{x}</th>)}</tr></thead>
          <tbody>{users.filter(u=>(statusFilter==="all"||u.account_status===statusFilter)&&(u.role==="owner"||[u.email,u.display_name,u.user_id].some(v=>String(v??"").toLowerCase().includes(searchFilter.toLowerCase())))).map(u=><tr key={u.user_id}>
            <td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{u.display_name??u.user_id.slice(0,8)}</td>
            <td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{u.email??"—"}</td>
            <td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{u.role==="owner"?"Owner":u.plan_code}</td>
            <td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}><span style={{fontWeight:800,color:u.account_status==="active"?"#16845B":u.account_status==="suspended"?"#B42318":u.account_status==="inactive"?"#A15C19":"#60758A"}}>{u.role==="owner"?"OWNER":u.account_status.toUpperCase()}</span></td>
            <td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{u.pilot?.status??"Not enrolled"}</td>
            <td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{analytics?.by_seller?.[u.user_id]?.searches??0}</td>
            <td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{u.created_at?fmt(u.created_at):"—"}</td>
            <td style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{u.last_sign_in_at?fmt(u.last_sign_in_at):"Never"}</td>
            <td style={{padding:9,borderBottom:"1px solid #EEF2F6",whiteSpace:"nowrap"}}>
              {u.role==="owner"?"—":<div style={{display:"flex",gap:6}}>
                {u.account_status!=="active"&&<button disabled={busy} style={primary} onClick={()=>run("owner_set_user_status",{target_user_id:u.user_id,status:"active",reason:"Approved by Ekhaya owner"},"Account approved and activated for searches.")}>Approve / restore</button>}
                {u.account_status!=="suspended"&&<button disabled={busy} style={{...button,color:"#B42318",borderColor:"#E7B7B4"}} onClick={()=>{const reason=window.prompt("Reason for suspending this account (required):");if(reason&&reason.trim().length>=5)void run("owner_set_user_status",{target_user_id:u.user_id,status:"suspended",reason},"Account suspended. Search access blocked.");else if(reason!==null)setStatus("Please enter a suspension reason of at least five characters.");}}>Suspend</button>}
              </div>}
            </td>
          </tr>)}</tbody>
        </table></div>
        {users.filter(u=>(statusFilter==="all"||u.account_status===statusFilter)&&(u.role==="owner"||[u.email,u.display_name,u.user_id].some(v=>String(v??"").toLowerCase().includes(searchFilter.toLowerCase())))).length===0&&<p style={small}>No accounts match this filter.</p>}
      </section>}
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
      {tab==="security"&&<div style={{display:"grid",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
          <section style={card}><div style={small}>Unreviewed alerts</div><div style={{fontSize:28,fontWeight:800}}>{security.events.filter(e=>!e.reviewed).length}</div></section>
          <section style={card}><div style={small}>Pending seller IDs</div><div style={{fontSize:28,fontWeight:800}}>{security.identities.filter(i=>i.status==="pending").length}</div></section>
          <section style={card}><div style={small}>Blocked email domains</div><div style={{fontSize:28,fontWeight:800}}>{security.blocked_domains.filter(d=>d.active).length}</div></section>
        </div>
        <section style={card}>
          <h2 style={{fontSize:18,marginTop:0}}>Marketplace seller identity verification</h2>
          <p style={small}>Seller IDs are unique per marketplace. Only verified IDs can use the matching marketplace search service.</p>
          {security.identities.length===0?<p style={small}>No seller IDs submitted yet.</p>:security.identities.map(i=><article key={i.id} style={{padding:"12px 0",borderBottom:"1px solid #EEF2F6",display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div><b style={{fontSize:13}}>{String(i.marketplace).replace("_"," ").toUpperCase()}</b><div style={small}>Seller ID: {i.seller_id}</div><div style={small}>Account: {i.user_id} · Submitted {fmt(i.submitted_at)}</div><div style={{fontSize:11,fontWeight:800,marginTop:4,color:i.status==="verified"?"#16845B":i.status==="rejected"?"#B42318":"#A15C19"}}>{i.status.toUpperCase()}</div></div>
            {i.status==="pending"&&<div style={{display:"flex",gap:7,alignItems:"center"}}><button disabled={busy} style={primary} onClick={()=>run("owner_review_seller_identity",{identity_id:i.id,status:"verified",note:"Seller identity verified by Ekhaya"},"Seller identity verified.")}>Verify</button><button disabled={busy} style={{...button,color:"#B42318"}} onClick={()=>run("owner_review_seller_identity",{identity_id:i.id,status:"rejected",note:"Seller identity could not be verified"},"Seller identity rejected.")}>Reject</button></div>}
          </article>)}
        </section>
        <section style={card}>
          <h2 style={{fontSize:18,marginTop:0}}>Security & Fraud Monitor</h2>
          <p style={small}>Registration spam, blocked search attempts, suspicious queries and high-frequency search patterns. Review alerts before taking action.</p>
          {security.events.length===0?<p style={small}>No security events recorded.</p>:security.events.map(e=><article key={e.id} style={{padding:"12px 0",borderBottom:"1px solid #EEF2F6",display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{minWidth:240,flex:"1 1 280px"}}><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><b style={{fontSize:13}}>{String(e.event_type).replaceAll("_"," ")}</b><span style={{fontSize:10,fontWeight:800,color:e.severity==="critical"?"#B42318":e.severity==="high"?"#C05621":"#8A6500"}}>{String(e.severity).toUpperCase()} · RISK {e.risk_score}</span></div><div style={small}>{e.email??e.user_id??"Unknown account"} · {fmt(e.created_at)}</div><pre style={{whiteSpace:"pre-wrap",fontSize:11,color:"#60758A",margin:"6px 0"}}>{JSON.stringify(e.details??{},null,2)}</pre></div>
            {!e.reviewed&&<button disabled={busy} style={button} onClick={()=>run("owner_mark_fraud_reviewed",{event_id:e.id},"Security alert marked reviewed.")}>Mark reviewed</button>}
            {e.reviewed&&<span style={{fontSize:11,color:"#16845B",fontWeight:700}}>REVIEWED</span>}
          </article>)}
        </section>
        <section style={card}>
          <h2 style={{fontSize:18,marginTop:0}}>Email domain blocklist</h2>
          <p style={small}>Block known spam/disposable domains. Use exact domains rather than blocking entire common providers such as Gmail or Outlook.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8}}>
            <input value={blockedDomain} onChange={e=>setBlockedDomain(e.target.value)} placeholder="example-spam.com" style={{height:40,padding:"0 10px",border:"1px solid #DCE8F1",borderRadius:7}}/>
            <input value={blockedReason} onChange={e=>setBlockedReason(e.target.value)} placeholder="Reason for blocking" style={{height:40,padding:"0 10px",border:"1px solid #DCE8F1",borderRadius:7}}/>
            <button disabled={busy||!blockedDomain.trim()||!blockedReason.trim()} style={primary} onClick={async()=>{await run("owner_block_email_domain",{domain:blockedDomain,reason:blockedReason},"Email domain added to blocklist.");setBlockedDomain("");setBlockedReason("");}}>Block domain</button>
          </div>
          <div style={{marginTop:12}}>{security.blocked_domains.map(d=><div key={d.domain} style={{padding:"7px 0",borderBottom:"1px solid #EEF2F6",fontSize:12}}><b>{d.domain}</b> · {d.reason} · {d.active?"Active":"Disabled"}</div>)}</div>
        </section>
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

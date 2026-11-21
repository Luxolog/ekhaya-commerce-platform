"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
type ActionEvent = { id:string; action_type:string; title:string; body:string; created_at:string; calendar_post_id:string|null };
type Rule = { id:string; name:string; description:string; trigger_type:string; action_type:string; schedule_timezone:string; next_run_at:string|null; recurrence_rule:string|null; status:string; created_at:string };
type Session = { access_token?:string; refresh_token?:string; expires_at?:number; [key:string]:unknown };

export default function MarketingAutomationsPage(){
 const [rules,setRules]=useState<Rule[]>([]),[events,setEvents]=useState<ActionEvent[]>([]),[name,setName]=useState(""),[trigger,setTrigger]=useState("scheduled_once"),[action,setAction]=useState("create_draft"),[runAt,setRunAt]=useState(""),[recurrence,setRecurrence]=useState("weekly"),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const headers=useCallback(async()=>{
  if(!API||!KEY)throw new Error("Supabase environment variables are not configured.");
  let s:Session|null=null;try{s=JSON.parse(localStorage.getItem("ekhaya_session")||"null")}catch{}
  if(!s?.access_token||!s.refresh_token)throw new Error("Sign in to manage marketing automations.");
  let token=s.access_token;
  if(Number(s.expires_at)<=Date.now()/1000+60){
   const r=await fetch(API+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({refresh_token:s.refresh_token})});
   const d=await r.json().catch(()=>({}));if(!r.ok||!d.access_token||!d.refresh_token)throw new Error("Your seller session expired. Sign in again.");
   s={...s,...d,expires_at:Math.floor(Date.now()/1000)+Number(d.expires_in||3600)};localStorage.setItem("ekhaya_session",JSON.stringify(s));token=String(d.access_token);
  }
  return {apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"};
 },[]);
 const request=useCallback(async(path:string,init:RequestInit={})=>{
  const h=await headers(),r=await fetch(API+"/rest/v1/"+path,{...init,headers:{...h,Prefer:"return=representation",...(init.headers||{})},cache:"no-store"});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.msg||"Marketing automation request failed.");return d;
 },[headers]);
 const load=useCallback(async()=>{setLoading(true);setError("");try{const [ruleRows,eventRows]=await Promise.all([request("marketing_automations?select=id,name,description,trigger_type,action_type,schedule_timezone,next_run_at,recurrence_rule,status,created_at&order=created_at.desc"),request("marketing_automation_action_events?select=id,action_type,title,body,created_at,calendar_post_id&order=created_at.desc&limit=50")]);setRules(ruleRows);setEvents(eventRows);}catch(e){setError(e instanceof Error?e.message:"Unable to load automations.");}finally{setLoading(false);}},[request]);
 useEffect(()=>{void load()},[load]);
 async function create(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   if(!name.trim())throw new Error("Enter an automation name.");
   if(trigger!=="campaign_reminder"&&!runAt)throw new Error("Choose the first run date and time.");
   if(trigger==="recurring"&&!recurrence.trim())throw new Error("Choose a recurrence rule.");
   await request("marketing_automations",{method:"POST",body:JSON.stringify({name:name.trim(),trigger_type:trigger,action_type:action,next_run_at:runAt?new Date(runAt).toISOString():null,recurrence_rule:trigger==="recurring"?recurrence:null,schedule_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Africa/Johannesburg",status:"paused"})});
   setName("");setNotice("Automation saved as paused. Scheduling will remain inactive until the approved worker is deployed.");await load();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save automation.");}finally{setBusy(false);}
 }
 async function setStatus(rule:Rule,status:"paused"|"cancelled"){
  if(status!=="paused"&&status!=="cancelled")return;
  setBusy(true);setError("");try{await request("marketing_automations?id=eq."+encodeURIComponent(rule.id),{method:"PATCH",body:JSON.stringify({status})});await load();}catch(e){setError(e instanceof Error?e.message:"Unable to update automation.");}finally{setBusy(false);}
 }
 return <main style={{maxWidth:1120,margin:"0 auto",padding:"28px 18px 64px",color:"#17364D"}}>
  <Link href="/account/marketing/" style={{color:"#0789BE",textDecoration:"none",fontWeight:800,fontSize:13}}>← AI Marketing</Link>
  <h1 style={{fontSize:28,margin:"14px 0 6px"}}>Marketing automations</h1>
  <p style={{color:"#60758A",fontSize:14,lineHeight:1.6}}>Create reusable marketing rules with a schedule, trigger and action. New rules are saved paused; no background worker or external publishing is active yet.</p>
  <div role="note" style={{padding:14,border:"1px solid #E8C98B",background:"#FFFBF2",borderRadius:10,fontSize:13,color:"#76501A",margin:"18px 0"}}><strong>Deployment boundary:</strong> the database-backed rule and run-history foundation is being prepared. Seller activation is disabled at both the interface and database-policy levels until the Supabase worker/scheduler has been configured and tested.</div>
  {error&&<p role="alert" style={{background:"#FFF0ED",padding:12,borderRadius:8,color:"#A43B2B"}}>{error}</p>}
  {notice&&<p role="status" style={{background:"#EDF8F2",padding:12,borderRadius:8,color:"#216644"}}>{notice}</p>}
  <form onSubmit={create} style={{background:"#fff",border:"1px solid #DCE6EE",borderRadius:12,padding:18,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:12}}>
   <label style={{display:"grid",gap:6,fontSize:12,fontWeight:700}}>Automation name<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} placeholder="Weekly product content" style={input}/></label>
   <label style={{display:"grid",gap:6,fontSize:12,fontWeight:700}}>Trigger<select value={trigger} onChange={e=>setTrigger(e.target.value)} style={input}><option value="scheduled_once">Scheduled once</option><option value="recurring">Recurring schedule</option><option value="campaign_reminder">Campaign reminder</option><option value="draft_generation">Generate draft</option></select></label>
   <label style={{display:"grid",gap:6,fontSize:12,fontWeight:700}}>Action<select value={action} onChange={e=>setAction(e.target.value)} style={input}><option value="create_draft">Create draft</option><option value="request_approval">Request approval</option><option value="send_reminder">Send reminder</option></select></label>
   {trigger!=="campaign_reminder"&&<label style={{display:"grid",gap:6,fontSize:12,fontWeight:700}}>First run (your local time)<input type="datetime-local" value={runAt} onChange={e=>setRunAt(e.target.value)} style={input}/></label>}
   {trigger==="recurring"&&<label style={{display:"grid",gap:6,fontSize:12,fontWeight:700}}>Recurrence rule<select value={recurrence} onChange={e=>setRecurrence(e.target.value)} style={input}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>}
   <div style={{display:"flex",alignItems:"end"}}><button disabled={busy} style={button}>{busy?"Saving…":"Save paused automation"}</button></div>
  </form>
  <section style={{marginTop:24}}>
   <h2 style={{fontSize:18}}>Your rules</h2>
   {loading?<p style={{color:"#60758A"}}>Loading…</p>:rules.length===0?<p style={{color:"#60758A"}}>No automations created yet.</p>:<div style={{display:"grid",gap:10}}>{rules.map(rule=><article key={rule.id} style={{border:"1px solid #DCE6EE",borderRadius:10,padding:14,display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
    <div><strong>{rule.name}</strong><p style={{fontSize:12,color:"#60758A",margin:"5px 0"}}>{rule.trigger_type.replaceAll("_"," ")} · {rule.action_type.replaceAll("_"," ")} · {rule.schedule_timezone}</p><small style={{color:"#60758A"}}>Next run: {rule.next_run_at?new Date(rule.next_run_at).toLocaleString():"Not scheduled"}</small></div>
    <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,fontWeight:800,color:rule.status==="active"?"#21734A":"#60758A"}}>{rule.status}</span>{rule.status==="active"&&<button disabled={busy} onClick={()=>void setStatus(rule,"paused")} style={smallButton}>Pause</button>}{rule.status!=="cancelled"&&<button disabled={busy} onClick={()=>void setStatus(rule,"cancelled")} style={smallButton}>Cancel</button>}</div>
   </article>)}</div>}
  </section>
  <section style={{marginTop:26}}>
   <h2 style={{fontSize:18}}>Automation activity</h2>
   <p style={{fontSize:13,color:"#60758A"}}>Internal actions recorded by the worker. Draft creation appears in your content calendar. No email or external publishing is performed.</p>
   {loading?<p style={{color:"#60758A"}}>Loading activity…</p>:events.length===0?<p style={{color:"#60758A"}}>No automation activity yet. Events appear after a reviewed worker has been configured and run.</p>:<div style={{display:"grid",gap:9}}>{events.map(event=><article key={event.id} style={{border:"1px solid #DCE6EE",borderRadius:10,padding:13}}><strong>{event.title}</strong><p style={{fontSize:12,color:"#60758A",margin:"5px 0"}}>{event.action_type.replaceAll("_"," ")} · {new Date(event.created_at).toLocaleString()}</p><p style={{fontSize:13,whiteSpace:"pre-wrap",margin:"6px 0"}}>{event.body}</p>{event.calendar_post_id&&<Link href="/account/marketing/" style={{fontSize:12,color:"#0789BE",fontWeight:700}}>Open content calendar →</Link>}</article>)}</div>}
  </section>
  <p style={{fontSize:12,color:"#71869A",marginTop:22}}>Sellers can pause or cancel rules; activation is reserved for the trusted worker after release approval.</p>
 </main>;
}
const input:React.CSSProperties={padding:10,border:"1px solid #D5E1EA",borderRadius:8,fontSize:13,minWidth:0};
const button:React.CSSProperties={background:"#075477",color:"#fff",border:0,borderRadius:8,padding:"11px 15px",fontWeight:800,cursor:"pointer"};
const smallButton:React.CSSProperties={background:"#F2F6F9",color:"#075477",border:"1px solid #D5E1EA",borderRadius:7,padding:"7px 10px",fontWeight:700,cursor:"pointer"};

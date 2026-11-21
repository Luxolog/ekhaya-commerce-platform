"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import Link from "next/link";

const API=process.env.NEXT_PUBLIC_SUPABASE_URL??"",KEY=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??"";
type Session={access_token?:string;refresh_token?:string;expires_at?:number;[key:string]:unknown};
type Usage={feature_code:string;quantity:number;created_at:string};
type Campaign={id:string;title:string;status:string;platform:string|null;budget_zar:number|null;updated_at:string};
type Metric={id:string;campaign_id:string|null;platform:string;metric_date:string;impressions:number|null;reach:number|null;clicks:number|null;conversions:number|null;sales_zar:number|null;spend_zar:number|null;source:string;notes:string};
type Contact={id:string;consent_status:string;created_at:string};
type Delivery={event_type:string;occurred_at:string};
const card:React.CSSProperties={background:"#fff",border:"1px solid #DCE6EE",borderRadius:11,padding:16};
const muted:React.CSSProperties={fontSize:12,color:"#60758A",margin:"5px 0"};
const fmt=(n:number)=>new Intl.NumberFormat("en-ZA").format(n);
const zar=(n:number)=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(n);
export default function MarketingAnalyticsPage(){
 const [usage,setUsage]=useState<Usage[]>([]),[campaigns,setCampaigns]=useState<Campaign[]>([]),[metrics,setMetrics]=useState<Metric[]>([]),[contacts,setContacts]=useState<Contact[]>([]),[delivery,setDelivery]=useState<Delivery[]>([]),[from,setFrom]=useState(()=>{const d=new Date();d.setDate(1);return d.toLocaleDateString("en-CA")}),[to,setTo]=useState(()=>new Date().toLocaleDateString("en-CA")),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const headers=useCallback(async()=>{
  if(!API||!KEY)throw new Error("Supabase environment variables are not configured.");
  let s:Session|null=null;try{s=JSON.parse(localStorage.getItem("ekhaya_session")||"null")}catch{}
  if(!s?.access_token||!s.refresh_token)throw new Error("Sign in to view marketing analytics.");
  let token=s.access_token;
  if(Number(s.expires_at)<=Date.now()/1000+60){const r=await fetch(API+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({refresh_token:s.refresh_token})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.access_token||!d.refresh_token)throw new Error("Your seller session expired.");s={...s,...d,expires_at:Math.floor(Date.now()/1000)+Number(d.expires_in||3600)};localStorage.setItem("ekhaya_session",JSON.stringify(s));token=String(d.access_token)}
  return {apikey:KEY,Authorization:"Bearer "+token};
 },[]);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{const h=await headers();const get=async<T,>(table:string,select:string,filter:string=""):Promise<{data:T[]}>=>{const r=await fetch(API+"/rest/v1/"+table+"?select="+select+filter,{headers:h,cache:"no-store"});const d=await r.json().catch(()=>[]);if(!r.ok)throw new Error(d.message||d.msg||"Unable to load analytics.");return {data:d as T[]}};
   const range="&metric_date=gte."+from+"&metric_date=lte."+to;
   const [u,c,m,ct,de]=await Promise.all([
    get<Usage>("marketing_usage_events","feature_code,quantity,created_at","&created_at=gte."+encodeURIComponent(new Date(from+"T00:00:00").toISOString())+"&created_at=lte."+encodeURIComponent(new Date(to+"T23:59:59").toISOString())),
    get<Campaign>("marketing_campaigns","id,title,status,platform,budget_zar,updated_at"),
    get<Metric>("marketing_campaign_performance","id,campaign_id,platform,metric_date,impressions,reach,clicks,conversions,sales_zar,spend_zar,source,notes",range),
    get<Contact>("seller_marketing_contacts","id,consent_status,created_at","&created_at=gte."+encodeURIComponent(new Date(from+"T00:00:00").toISOString())+"&created_at=lte."+encodeURIComponent(new Date(to+"T23:59:59").toISOString())),
    get<Delivery>("marketing_email_delivery_events","event_type,occurred_at","&occurred_at=gte."+encodeURIComponent(new Date(from+"T00:00:00").toISOString())+"&occurred_at=lte."+encodeURIComponent(new Date(to+"T23:59:59").toISOString()))
   ]);
   setUsage(u.data);setCampaigns(c.data);setMetrics(m.data);setContacts(ct.data);setDelivery(de.data);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load marketing analytics.");}finally{setLoading(false)}
 },[headers,from,to]);
 useEffect(()=>{void load()},[load]);
 const totals=useMemo(()=>metrics.reduce((a,m)=>({impressions:a.impressions+(m.impressions??0),reach:a.reach+(m.reach??0),clicks:a.clicks+(m.clicks??0),conversions:a.conversions+(m.conversions??0),sales:a.sales+(Number(m.sales_zar)||0),spend:a.spend+(Number(m.spend_zar)||0)}),{impressions:0,reach:0,clicks:0,conversions:0,sales:0,spend:0}),[metrics]);
 const campaignStatus=useMemo(()=>campaigns.reduce((a,c)=>({...a,[c.status]:(a[c.status]||0)+1}),{} as Record<string,number>),[campaigns]);
 const usageCount=usage.reduce((a,u)=>a+Number(u.quantity||0),0);
 const exportCsv=()=>{const rows=[["date","platform","impressions","reach","clicks","conversions","sales_zar","spend_zar","source"],...metrics.map(m=>[m.metric_date,m.platform,m.impressions??"",m.reach??"",m.clicks??"",m.conversions??"",m.sales_zar??"",m.spend_zar??"",m.source])];const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));const a=document.createElement("a");a.href=url;a.download="ekhaya-marketing-performance.csv";a.click();URL.revokeObjectURL(url)};
 return <main style={{maxWidth:1120,margin:"0 auto",padding:"28px 18px 64px",color:"#17364D"}}>
  <Link href="/account/marketing/" style={{color:"#0789BE",textDecoration:"none",fontWeight:800,fontSize:13}}>← AI Marketing</Link>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,flexWrap:"wrap"}}><div><h1 style={{fontSize:28,margin:"14px 0 5px"}}>Marketing analytics</h1><p style={muted}>Actual data recorded for your seller account. Missing metrics are not estimated or invented.</p></div><button onClick={exportCsv} disabled={!metrics.length} style={{padding:"10px 14px",borderRadius:8,border:"1px solid #D5E1EA",background:"#fff",fontWeight:800,color:"#075477"}}>Export performance CSV</button></div>
  <section style={{display:"flex",gap:10,flexWrap:"wrap",margin:"18px 0"}}><label style={muted}>From <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{display:"block",padding:8,border:"1px solid #D5E1EA",borderRadius:7}}/></label><label style={muted}>To <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={{display:"block",padding:8,border:"1px solid #D5E1EA",borderRadius:7}}/></label><button onClick={()=>void load()} style={{alignSelf:"end",padding:"9px 14px",border:0,borderRadius:7,background:"#075477",color:"#fff",fontWeight:800}}>Refresh</button></section>
  {error&&<p role="alert" style={{background:"#FFF0ED",padding:12,borderRadius:8,color:"#A43B2B"}}>{error}</p>}
  {loading?<p>Loading your reports…</p>:<>
   <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10}}>
    {[[ "Campaign drafts",campaigns.length ],["Content usage",usageCount],["Impressions",totals.impressions],["Clicks",totals.clicks],["Conversions",totals.conversions],["Sales recorded",zar(totals.sales)],["Spend recorded",zar(totals.spend)],["New contacts",contacts.length]].map(([k,v])=><article key={String(k)} style={card}><p style={muted}>{k}</p><strong style={{fontSize:23}}>{typeof v==="number"?fmt(v):v}</strong></article>)}
   </section>
   <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginTop:14}}>
    <article style={card}><h2 style={{fontSize:16}}>Campaign status</h2>{Object.entries(campaignStatus).map(([k,v])=><p key={k} style={muted}>{k.replaceAll("_"," ")}: <strong>{v}</strong></p>)}</article>
    <article style={card}><h2 style={{fontSize:16}}>Contact consent</h2><p style={muted}>New contacts in selected period: {contacts.length}</p><p style={muted}>Recorded as consented: {contacts.filter(c=>c.consent_status==="consented").length}</p><p style={muted}>Unknown or withdrawn: {contacts.filter(c=>c.consent_status!=="consented").length}</p></article>
    <article style={card}><h2 style={{fontSize:16}}>Email delivery events</h2><p style={muted}>Events received: {delivery.length}</p><p style={muted}>Delivered: {delivery.filter(d=>d.event_type==="delivered").length}</p><p style={muted}>Bounced: {delivery.filter(d=>d.event_type==="bounced").length}</p><p style={muted}>No provider is connected unless these events exist.</p></article>
   </section>
   <section style={{...card,marginTop:14}}><h2 style={{fontSize:17,marginTop:0}}>Recorded performance</h2><p style={muted}>Seller-entered or provider-imported data only. Source is shown for each row.</p>{metrics.length?<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr>{["Date","Platform","Impressions","Clicks","Conversions","Sales","Spend","Source"].map(x=><th key={x} style={{textAlign:"left",padding:9,borderBottom:"1px solid #DCE6EE"}}>{x}</th>)}</tr></thead><tbody>{metrics.map(m=><tr key={m.id}>{[m.metric_date,m.platform,m.impressions??"—",m.clicks??"—",m.conversions??"—",m.sales_zar==null?"—":zar(Number(m.sales_zar)),m.spend_zar==null?"—":zar(Number(m.spend_zar)),m.source.replaceAll("_"," ")].map((v,i)=><td key={i} style={{padding:9,borderBottom:"1px solid #EEF2F6"}}>{v}</td>)}</tr>)}</tbody></table></div>:<p style={muted}>No performance metrics recorded in this date range. Platform metrics remain unavailable until entered or imported from a verified provider.</p>}</section>
  </>}
 </main>;
}

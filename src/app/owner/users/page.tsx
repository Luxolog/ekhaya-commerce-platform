"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
const API="https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search";
const KEY=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
type Seller={user_id:string;email?:string|null;display_name?:string|null;created_at?:string|null;last_sign_in_at?:string|null;email_confirmed_at?:string|null;role?:string;account_status?:string;plan_code?:string;pilot?:{status?:string;daily_limit?:number;pilot_label?:string}|null};
export default function OwnerUsersPage(){
 const [users,setUsers]=useState<Seller[]>([]),[filter,setFilter]=useState(""),[status,setStatus]=useState("Loading seller accounts…"),[busyId,setBusyId]=useState<string|null>(null);
 const callOwner=useCallback(async(action:string,extra:Record<string,unknown>={})=>{
  let session:{access_token?:string}|null=null;try{session=JSON.parse(localStorage.getItem("ekhaya_session")??"null")}catch{}
  if(!session?.access_token)throw new Error("Please sign in with the Ekhaya owner account first.");
  if(!KEY)throw new Error("Owner controls are not configured. Please contact the platform administrator.");
  const response=await fetch(API,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:JSON.stringify({action,...extra})});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error??"Owner request failed.");return data;
 },[]);
 const loadUsers=useCallback(async()=>{setStatus("Loading seller accounts…");try{const data=await callOwner("owner_list_users");setUsers(Array.isArray(data.users)?data.users:[]);setStatus((data.users?.length??0)+" registered accounts loaded.");}catch(e){setStatus(e instanceof Error?e.message:"Could not load seller accounts.");}},[callOwner]);
 useEffect(()=>{void loadUsers()},[loadUsers]);
 async function changeStatus(user:Seller,nextStatus:"active"|"inactive"|"suspended"|"pending"){
  if(!user.user_id||user.role==="owner")return;const reason=nextStatus==="active"?"Seller account approved by owner review.":nextStatus==="suspended"?"Seller account suspended following owner review.":nextStatus==="inactive"?"Seller account set inactive by owner review.":"Seller account returned to pending owner review.";
  setBusyId(user.user_id);setStatus("Updating "+(user.email??"seller account")+"…");
  try{await callOwner("owner_set_user_status",{target_user_id:user.user_id,status:nextStatus,reason});setUsers(old=>old.map(item=>item.user_id===user.user_id?{...item,account_status:nextStatus}:item));setStatus("Account status updated to "+nextStatus+".");}
  catch(e){setStatus(e instanceof Error?e.message:"Could not update account status.");}finally{setBusyId(null)}
 }
 const visible=useMemo(()=>users.filter(u=>[u.email,u.display_name,u.account_status].some(v=>String(v??"").toLowerCase().includes(filter.toLowerCase()))),[users,filter]);
 return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 5%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
 <header style={{maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}><b>EKHAYA TECHNOLOGIES · OWNER</b><nav style={{display:"flex",gap:18,fontSize:13}}><Link href="/owner/" style={{color:"#079BD3"}}>Dashboard</Link><Link href="/owner/cache/" style={{color:"#079BD3"}}>Cache controls</Link><Link href="/price-checker/" style={{color:"#079BD3"}}>Price checker</Link></nav></header>
 <section style={{maxWidth:1100,margin:"36px auto",background:"#fff",border:"1px solid #DCE8F1",borderRadius:14,padding:26,boxShadow:"0 8px 30px #071b3108"}}>
 <p style={{color:"#079BD3",fontSize:10,fontWeight:800,letterSpacing:2}}>OWNER CONTROLS</p><h1 style={{fontSize:30,margin:"8px 0"}}>Seller account management</h1><p style={{fontSize:13,color:"#60758A",lineHeight:1.6}}>Review registrations, confirm email-verification status and manage seller approval. Owner accounts cannot be changed from seller controls.</p>
 <div style={{display:"flex",gap:10,margin:"22px 0",flexWrap:"wrap"}}><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search name, email or status" style={{flex:1,minWidth:220,height:44,padding:"0 12px",border:"1px solid #DCE8F1",borderRadius:7}}/><button onClick={()=>void loadUsers()} disabled={!!busyId} style={{padding:"0 18px",height:44,border:0,borderRadius:7,background:"#071B31",color:"#fff",fontWeight:700}}>Refresh accounts</button></div>
 <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:850}}><thead><tr style={{textAlign:"left",color:"#60758A",borderBottom:"1px solid #DCE8F1"}}>{["Seller","Email verification","Account status","Registered","Last sign in","Actions"].map(x=><th key={x} style={{padding:12}}>{x}</th>)}</tr></thead><tbody>{visible.map(u=><tr key={u.user_id} style={{borderBottom:"1px solid #EDF2F7"}}>
 <td style={{padding:12}}><b>{u.display_name||"Seller"}</b><div style={{color:"#71869A",marginTop:4}}>{u.email??"No email"}</div></td>
 <td style={{padding:12}}>{u.email_confirmed_at?<span style={{color:"#16804A",fontWeight:700}}>Confirmed</span>:<span style={{color:"#A15C00",fontWeight:700}}>Awaiting confirmation</span>}</td>
 <td style={{padding:12}}><b>{u.account_status??"pending"}</b>{u.pilot?.status?<div style={{color:"#71869A",marginTop:4}}>Pilot: {u.pilot.status}</div>:null}</td>
 <td style={{padding:12,color:"#60758A"}}>{u.created_at?new Date(u.created_at).toLocaleDateString():"—"}</td><td style={{padding:12,color:"#60758A"}}>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString():"Never"}</td>
 <td style={{padding:12,minWidth:220}}>{u.role==="owner"?<span style={{color:"#60758A"}}>Owner account</span>:<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button disabled={!!busyId||!u.email_confirmed_at} title={!u.email_confirmed_at?"Seller must confirm email before approval":"Approve seller"} onClick={()=>void changeStatus(u,"active")} style={{padding:"7px 9px",border:0,borderRadius:6,background:"#E7F5EC",color:"#17643B",fontWeight:700}}>Approve</button><button disabled={!!busyId} onClick={()=>void changeStatus(u,"pending")} style={{padding:"7px 9px",border:"1px solid #DCE8F1",borderRadius:6,background:"#fff",color:"#304B63"}}>Pending</button><button disabled={!!busyId} onClick={()=>void changeStatus(u,"suspended")} style={{padding:"7px 9px",border:0,borderRadius:6,background:"#FCEEEE",color:"#9A3030",fontWeight:700}}>Suspend</button></div>}</td>
 </tr>)}</tbody></table></div>
 {visible.length===0&&<p style={{padding:20,textAlign:"center",color:"#71869A"}}>No matching accounts found.</p>}
 {status&&<p role="status" aria-live="polite" style={{fontSize:12,lineHeight:1.6,color:"#304B63",background:"#F4F8FC",padding:12,borderRadius:8,marginTop:18}}>{status}</p>}
 </section></main>;
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API = "https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search";
const KEY = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";

type UserRow = { id: string; email?: string; created_at?: string; last_sign_in_at?: string; email_confirmed_at?: string; role?: string };

export default function OwnerUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("Loading user accounts…");
  const [busy, setBusy] = useState(false);

  async function callOwner(action: string, extra: Record<string, unknown> = {}) {
    const session = JSON.parse(localStorage.getItem("ekhaya_session") ?? "null");
    if (!session?.access_token) throw new Error("Please sign in with the Ekhaya owner account first.");
    const response = await fetch(API, {
      method: "POST",
      headers: { apikey: KEY, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Owner request failed.");
    return data;
  }

  async function loadUsers() {
    setBusy(true);
    try {
      const data = await callOwner("list_users");
      setUsers(data.users ?? []);
      setStatus((data.users?.length ?? 0) + " accounts loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load accounts.");
    } finally { setBusy(false); }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function savePassword() {
    if (!selected) return;
    if (password.length < 12) { setStatus("Use at least 12 characters for the new password."); return; }
    if (password !== confirm) { setStatus("The passwords do not match."); return; }
    setBusy(true); setStatus("");
    try {
      await callOwner("set_user_password", { user_id: selected.id, password });
      setStatus("Password successfully updated for " + (selected.email ?? "the selected user") + ". No email was sent.");
      setSelected(null); setPassword(""); setConfirm("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Password update failed.");
    } finally { setBusy(false); }
  }

  const visibleUsers = users.filter(user => (user.email ?? "").toLowerCase().includes(filter.toLowerCase()));

  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 5%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <header style={{maxWidth:980,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}>
      <b style={{letterSpacing:1}}>EKHAYA TECHNOLOGIES</b>
      <nav style={{display:"flex",gap:18,fontSize:13}}><Link href="/owner/cache/" style={{color:"#079BD3"}}>Cache controls</Link><Link href="/price-checker/" style={{color:"#079BD3"}}>Price checker →</Link></nav>
    </header>
    <section style={{maxWidth:980,margin:"42px auto",background:"#fff",border:"1px solid #DCE8F1",borderRadius:14,padding:26,boxShadow:"0 8px 30px #071b3108"}}>
      <p style={{color:"#079BD3",fontSize:10,fontWeight:800,letterSpacing:2}}>OWNER CONTROLS</p>
      <h1 style={{fontSize:30,margin:"8px 0"}}>User management</h1>
      <p style={{fontSize:13,color:"#60758A",lineHeight:1.6}}>View seller accounts and assign a new password directly. Password changes are restricted to authenticated Ekhaya owners and are processed securely on the server.</p>
      <div style={{display:"flex",gap:10,margin:"22px 0",flexWrap:"wrap"}}>
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search by email address" style={{flex:1,minWidth:220,height:44,padding:"0 12px",border:"1px solid #DCE8F1",borderRadius:7}}/>
        <button onClick={()=>void loadUsers()} disabled={busy} style={{padding:"0 18px",border:0,borderRadius:7,background:"#071B31",color:"#fff",fontWeight:700}}>Refresh users</button>
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead><tr style={{textAlign:"left",color:"#60758A",borderBottom:"1px solid #DCE8F1"}}><th style={{padding:12}}>Email</th><th style={{padding:12}}>Role</th><th style={{padding:12}}>Last sign in</th><th style={{padding:12}}>Action</th></tr></thead>
          <tbody>{visibleUsers.map(user=><tr key={user.id} style={{borderBottom:"1px solid #EDF2F7"}}><td style={{padding:12,fontWeight:700}}>{user.email ?? "No email"}</td><td style={{padding:12}}>{user.role ?? "seller"}</td><td style={{padding:12,color:"#60758A"}}>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"}</td><td style={{padding:12}}><button onClick={()=>{setSelected(user);setPassword("");setConfirm("");setStatus("");}} style={{padding:"9px 13px",border:0,borderRadius:7,background:"#079BD3",color:"#fff",fontWeight:700}}>Set password</button></td></tr>)}</tbody>
        </table>
      </div>
      {visibleUsers.length===0&&<p style={{padding:20,textAlign:"center",color:"#71869A"}}>No matching accounts found.</p>}
      {selected&&<section style={{marginTop:24,padding:20,border:"1px solid #DCE8F1",borderRadius:10,background:"#F8FBFE"}}>
        <h2 style={{fontSize:19,margin:"0 0 6px"}}>Set password</h2>
        <p style={{fontSize:13,color:"#60758A"}}>Account: <b>{selected.email}</b></p>
        <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:14}}>New password</label>
        <input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 12 characters" style={{boxSizing:"border-box",width:"100%",height:44,padding:"0 12px",marginTop:6,border:"1px solid #DCE8F1",borderRadius:7}}/>
        <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:12}}>Confirm new password</label>
        <input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter the password again" style={{boxSizing:"border-box",width:"100%",height:44,padding:"0 12px",marginTop:6,border:"1px solid #DCE8F1",borderRadius:7}}/>
        <p style={{fontSize:11,color:"#71869A",lineHeight:1.5}}>Use a unique password of at least 12 characters. The password is never displayed again after saving, and no email is sent.</p>
        <div style={{display:"flex",gap:10,marginTop:14}}><button disabled={busy||password.length<12||password!==confirm} onClick={()=>void savePassword()} style={{padding:"12px 18px",border:0,borderRadius:7,background:"#079BD3",color:"#fff",fontWeight:700}}>Save password</button><button disabled={busy} onClick={()=>setSelected(null)} style={{padding:"12px 18px",border:"1px solid #DCE8F1",borderRadius:7,background:"#fff",color:"#071B31"}}>Cancel</button></div>
      </section>}
      {status&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#304B63",background:"#F4F8FC",padding:12,borderRadius:8,marginTop:18}}>{status}</p>}
    </section>
  </main>;
}

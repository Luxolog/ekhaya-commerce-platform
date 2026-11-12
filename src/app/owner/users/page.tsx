"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API = "https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/marketplace-search";
const KEY = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";

type UserRow = { id: string; email?: string; created_at?: string; last_sign_in_at?: string; email_confirmed_at?: string; role?: string; marketplace_access?: ("takealot"|"amazon")[] };

export default function OwnerUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [marketplaceEdits, setMarketplaceEdits] = useState<Record<string,("takealot"|"amazon")[]>>({});
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
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
      setMarketplaceEdits(Object.fromEntries((data.users ?? []).map((user: UserRow) => [user.id, user.marketplace_access?.length ? user.marketplace_access : ["takealot","amazon"]])));
      setStatus((data.users?.length ?? 0) + " accounts loaded.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not load accounts.");
    } finally { setBusy(false); }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function saveMarketplaceAccess(user: UserRow) {
    const access = marketplaceEdits[user.id] ?? [];
    if (!access.length) { setStatus("Each seller must have at least one marketplace enabled."); return; }
    setBusy(true); setStatus("");
    try {
      await callOwner("set_user_marketplaces", { user_id: user.id, marketplace_access: access });
      setUsers(old => old.map(item => item.id === user.id ? { ...item, marketplace_access: access } : item));
      setStatus("Marketplace access updated for " + (user.email ?? "the selected seller") + ".");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Marketplace access update failed.");
    } finally { setBusy(false); }
  }

  function makeTemporaryPassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*_-";
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, value => alphabet[value % alphabet.length]).join("");
  }

  async function generateAndSetPassword() {
    if (!selected) return;
    const generated = makeTemporaryPassword();
    setBusy(true); setStatus(""); setPasswordCopied(false); setPasswordVisible(false);
    try {
      await callOwner("set_user_password", { user_id: selected.id, password: generated });
      setPassword(generated);
      setPasswordVisible(true);
      setStatus("Temporary password set for " + (selected.email ?? "the selected user") + ". Copy it and share it privately. It is held only in this page session and is not saved to the database.");
    } catch (error) {
      setPassword("");
      setStatus(error instanceof Error ? error.message : "Password update failed.");
    } finally { setBusy(false); }
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setPasswordCopied(true);
      setStatus("Temporary password copied. Share it with the user through a private channel.");
    } catch {
      setStatus("Clipboard access was blocked. Select and copy the password manually.");
    }
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
          <thead><tr style={{textAlign:"left",color:"#60758A",borderBottom:"1px solid #DCE8F1"}}><th style={{padding:12}}>Email</th><th style={{padding:12}}>Role</th><th style={{padding:12}}>Marketplace access</th><th style={{padding:12}}>Last sign in</th><th style={{padding:12}}>Action</th></tr></thead>
          <tbody>{visibleUsers.map(user=><tr key={user.id} style={{borderBottom:"1px solid #EDF2F7"}}><td style={{padding:12,fontWeight:700}}>{user.email ?? "No email"}</td><td style={{padding:12}}>{user.role ?? "seller"}</td><td style={{padding:12,minWidth:220}}><div style={{display:"flex",gap:10,flexWrap:"wrap"}}>{(["takealot","amazon"] as const).map(m=><label key={m} style={{display:"flex",alignItems:"center",gap:4,fontSize:11}}><input type="checkbox" checked={(marketplaceEdits[user.id] ?? user.marketplace_access ?? ["takealot","amazon"]).includes(m)} onChange={e=>setMarketplaceEdits(old=>({...old,[user.id]:e.target.checked?[...(old[user.id] ?? user.marketplace_access ?? ["takealot","amazon"]),m]: (old[user.id] ?? user.marketplace_access ?? ["takealot","amazon"]).filter(value=>value!==m)}))}/>{m==="takealot"?"Takealot":"Amazon"}</label>)}</div><button disabled={busy||!(marketplaceEdits[user.id] ?? user.marketplace_access ?? ["takealot","amazon"]).length} onClick={()=>void saveMarketplaceAccess(user)} style={{marginTop:7,padding:"6px 9px",border:0,borderRadius:6,background:"#E7F5FB",color:"#075B80",fontSize:11,fontWeight:700}}>Save access</button></td><td style={{padding:12,color:"#60758A"}}>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"}</td><td style={{padding:12}}><button onClick={()=>{setSelected(user);setPassword("");setPasswordVisible(false);setPasswordCopied(false);setStatus("");}} style={{padding:"9px 13px",border:0,borderRadius:7,background:"#079BD3",color:"#fff",fontWeight:700}}>Set password</button></td></tr>)}</tbody>
        </table>
      </div>
      {visibleUsers.length===0&&<p style={{padding:20,textAlign:"center",color:"#71869A"}}>No matching accounts found.</p>}
      {selected&&<section style={{marginTop:24,padding:20,border:"1px solid #DCE8F1",borderRadius:10,background:"#F8FBFE"}}>
        <h2 style={{fontSize:19,margin:"0 0 6px"}}>Temporary password</h2>
        <p style={{fontSize:13,color:"#60758A"}}>Account: <b>{selected.email}</b></p>
        <p style={{fontSize:12,color:"#60758A",lineHeight:1.6}}>Generate a strong temporary password and set it immediately. You can view and copy it while this page remains open. It is never written to the database or application logs.</p>
        {password&&<div style={{display:"flex",gap:8,alignItems:"center",marginTop:14}}>
          <input readOnly type={passwordVisible?"text":"password"} value={password} aria-label="Generated temporary password" style={{boxSizing:"border-box",flex:1,minWidth:0,height:46,padding:"0 12px",border:"1px solid #DCE8F1",borderRadius:7,fontFamily:"monospace"}}/>
          <button onClick={()=>setPasswordVisible(value=>!value)} style={{padding:"12px 14px",border:"1px solid #DCE8F1",borderRadius:7,background:"#fff",color:"#071B31"}}>{passwordVisible?"Hide":"View"}</button>
          <button onClick={()=>void copyPassword()} style={{padding:"12px 14px",border:0,borderRadius:7,background:"#E7F5FB",color:"#075B80",fontWeight:700}}>{passwordCopied?"Copied":"Copy"}</button>
        </div>}
        <p style={{fontSize:11,color:"#71869A",lineHeight:1.5,marginTop:12}}>The password is kept only in this page session. Refreshing or closing the page clears it. Generate another password to replace the current one. Ask the user to change it after signing in.</p>
        <div style={{display:"flex",gap:10,marginTop:14,flexWrap:"wrap"}}><button disabled={busy} onClick={()=>void generateAndSetPassword()} style={{padding:"12px 18px",border:0,borderRadius:7,background:"#079BD3",color:"#fff",fontWeight:700}}>{busy?"Generating…":password?"Generate another password":"Generate & set password"}</button><button disabled={busy} onClick={()=>{setSelected(null);setPassword("");setPasswordVisible(false);setPasswordCopied(false);}} style={{padding:"12px 18px",border:"1px solid #DCE8F1",borderRadius:7,background:"#fff",color:"#071B31"}}>Close</button></div>
      </section>}
      {status&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#304B63",background:"#F4F8FC",padding:12,borderRadius:8,marginTop:18}}>{status}</p>}
    </section>
  </main>;
}

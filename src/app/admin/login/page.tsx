"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const supabaseUrl = "https://itxxnhcjjiynrmivexcb.supabase.co";
const anonKey = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";

export default function AdminLoginPage() {
  const [email,setEmail] = useState("gozongo@live.com");
  const [password,setPassword] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);

  async function signIn() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(supabaseUrl + "/auth/v1/token?grant_type=password", {
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":anonKey},
        body:JSON.stringify({email,password})
      });
      const data = await response.json().catch(()=>({}));
      if (!response.ok || !data.access_token) throw new Error(data.msg ?? data.message ?? "Sign-in failed. Check the administrator email and password.");
      const userResponse = await fetch(supabaseUrl + "/auth/v1/user", {
        headers:{"apikey":anonKey,"Authorization":"Bearer "+data.access_token}
      });
      const user = await userResponse.json().catch(()=>({}));
      if (!userResponse.ok) throw new Error("Could not verify administrator permissions.");
      const app = user.app_metadata ?? {};
      if (app.role !== "owner" && app.is_owner !== true && app.superuser !== true) {
        await fetch(supabaseUrl + "/auth/v1/logout", {method:"POST",headers:{"apikey":anonKey,"Authorization":"Bearer "+data.access_token}});
        throw new Error("This account is not an Ekhaya administrator. Please use the owner account.");
      }
      localStorage.setItem("ekhaya_session",JSON.stringify({...data,user}));
      window.location.href = "/admin/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Administrator sign-in failed.");
    } finally { setBusy(false); }
  }

  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 5%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <header style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={190} height={110} style={{width:165,height:"auto"}}/></Link>
      <span style={{color:"#079BD3",fontWeight:800,fontSize:12,letterSpacing:2}}>ADMINISTRATOR ACCESS</span>
    </header>
    <section style={{maxWidth:470,margin:"70px auto",background:"#fff",border:"1px solid #DCE8F1",borderRadius:16,padding:32,boxShadow:"0 12px 40px #071b310d"}}>
      <p style={{color:"#079BD3",fontWeight:800,fontSize:12,letterSpacing:3}}>EKHAYA TECHNOLOGIES</p>
      <h1 style={{fontSize:34,margin:"10px 0"}}>Administrator sign in</h1>
      <p style={{color:"#60758A",lineHeight:1.6}}>This secure area is separate from seller accounts. Only authorised Ekhaya owners can continue.</p>
      <label style={{display:"block",fontSize:13,fontWeight:700,marginTop:24}}>Administrator email</label>
      <input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} style={field}/>
      <label style={{display:"block",fontSize:13,fontWeight:700,marginTop:16}}>Password</label>
      <input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void signIn();}} style={field}/>
      <button onClick={signIn} disabled={busy||!email||!password} style={{width:"100%",padding:15,marginTop:22,border:0,borderRadius:9,background:"#079BD3",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer",opacity:busy||!email||!password ? .85 : 1}}>{busy?"Verifying access…":"Sign in to admin"}</button>
      {message&&<p role="alert" style={{background:"#FFF4F2",color:"#9C2F20",padding:14,borderRadius:8,lineHeight:1.5}}>{message}</p>}
      <p style={{fontSize:12,color:"#71869A",marginTop:22}}>Seller account? <Link href="/account/" style={{color:"#079BD3",fontWeight:700}}>Go to seller sign in</Link></p>
    </section>
  </main>;
}
const field: React.CSSProperties = {boxSizing:"border-box",width:"100%",height:50,padding:"0 14px",border:"1px solid #DCE8F1",borderRadius:8,marginTop:8,fontSize:15};

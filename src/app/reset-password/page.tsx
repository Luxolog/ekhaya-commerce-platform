"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const supabaseUrl = "https://itxxnhcjjiynrmivexcb.supabase.co";
const anonKey = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";

export default function ResetPasswordPage() {
  const [accessToken,setAccessToken] = useState("");
  const [password,setPassword] = useState("");
  const [confirmPassword,setConfirmPassword] = useState("");
  const [message,setMessage] = useState("Checking your password reset link…");
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);

  useEffect(()=>{
    const hash = new URLSearchParams(window.location.hash.replace(/^#/,""));
    const token = hash.get("access_token");
    const type = hash.get("type");
    if(token && type === "recovery") {
      setAccessToken(token);
      setReady(true);
      setMessage("Choose a new password for your Ekhaya seller account.");
      window.history.replaceState(null,"",window.location.pathname+window.location.search);
    } else {
      setMessage("This reset link is missing or has expired. Return to Seller Account and request a new one.");
    }
  },[]);

  async function updatePassword() {
    if(password.length<8){setMessage("Your new password must contain at least 8 characters.");return;}
    if(password!==confirmPassword){setMessage("The passwords do not match.");return;}
    setBusy(true);setMessage("");
    try {
      const response=await fetch(supabaseUrl+"/auth/v1/user",{
        method:"PUT",
        headers:{"Content-Type":"application/json","apikey":anonKey,"Authorization":"Bearer "+accessToken},
        body:JSON.stringify({password})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.msg??data.message??data.error_description??"Could not update your password. Request a new reset link and try again.");
      setReady(false);
      setMessage("Your password has been updated. You can now sign in with your new password.");
    } catch(e) {
      setMessage(e instanceof Error?e.message:"Password update failed.");
    } finally {setBusy(false);}
  }

  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 5%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <section style={{maxWidth:460,margin:"70px auto",background:"#fff",border:"1px solid #DCE8F1",borderRadius:14,padding:28,boxShadow:"0 8px 30px #071b3108"}}>
      <p style={{color:"#079BD3",fontSize:10,fontWeight:800,letterSpacing:2}}>EKHAYA SELLER ACCESS</p>
      <h1 style={{fontSize:28,fontWeight:700,margin:"8px 0 12px"}}>Reset your password</h1>
      {ready&&<>
        <input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password (at least 8 characters)" style={field}/>
        <input type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Confirm new password" style={field}/>
        <button onClick={updatePassword} disabled={busy||password.length<8||!confirmPassword} style={{width:"100%",padding:14,background:"#079BD3",border:0,borderRadius:8,color:"#fff",fontWeight:700,marginTop:14,cursor:"pointer"}}>{busy?"Updating…":"Update password"}</button>
      </>}
      <p role="status" style={{fontSize:13,lineHeight:1.6,color:"#304B63",background:"#F4F8FC",padding:12,borderRadius:8,marginTop:16}}>{message}</p>
      <Link href="/account/" style={{display:"block",marginTop:18,color:"#079BD3",fontWeight:700,fontSize:13}}>← Back to Seller Account</Link>
    </section>
  </main>;
}
const field: React.CSSProperties = {boxSizing:"border-box",width:"100%",height:46,padding:"0 12px",border:"1px solid #DCE8F1",borderRadius:7,marginTop:12,fontSize:14};

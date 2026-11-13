"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const supabaseUrl = "https://itxxnhcjjiynrmivexcb.supabase.co";
const anonKey = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";
const passwordResetUrl = "https://ekhayatech.co.za/reset-password/";

export default function AccountPage() {
  const [mode,setMode] = useState<"signin"|"signup">("signup");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [name,setName] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const endpoint = mode === "signup" ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
      const response = await fetch(supabaseUrl+endpoint,{method:"POST",headers:{"Content-Type":"application/json","apikey":anonKey},body:JSON.stringify(mode==="signup"?{email,password,data:{display_name:name}}:{email,password})});
      const data = await response.json();
      if(!response.ok) throw new Error(data.msg??data.message??data.error_description??"Unable to process your account request.");
      if(data.access_token) {
        localStorage.setItem("ekhaya_session",JSON.stringify(data));
        setMessage("You're signed in. You can now use marketplace searches.");
      } else {
        setMessage("Account created. Check your email to confirm your address, then sign in.");
        setMode("signin");
      }
    } catch(e) { setMessage(e instanceof Error?e.message:"Account request failed."); }
    finally { setBusy(false); }
  }
  async function sendResetEmail() {
    setMessage("");
    if (!email.trim()) {
      setMessage("Enter your account email address above, then tap Forgot password again.");
      return;
    }
    setBusy(true);
    try {
      const redirectTo = passwordResetUrl;
      const response = await fetch(supabaseUrl+"/auth/v1/recover?redirect_to="+encodeURIComponent(redirectTo),{
        method:"POST",
        headers:{"Content-Type":"application/json","apikey":anonKey},
        body:JSON.stringify({email:email.trim()})
      });
      const data = await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.msg??data.message??data.error_description??"Unable to send the password reset email.");
      setMessage("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
    } catch(e) { setMessage(e instanceof Error?e.message:"Password reset request failed."); }
    finally { setBusy(false); }
  }
  function signOut(){localStorage.removeItem("ekhaya_session");setMessage("You have been signed out.");}
  const signedIn = typeof window !== "undefined" && !!localStorage.getItem("ekhaya_session");
  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 5%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:760,margin:"0 auto",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={170} height={100} style={{width:150,height:"auto"}}/></Link>
      <Link href="/price-checker/" style={{color:"#079BD3",fontWeight:700,fontSize:13}}>Price checker →</Link>
    </header>
    <section style={{maxWidth:480,margin:"70px auto",background:"#fff",border:"1px solid #DCE8F1",borderRadius:14,padding:28,boxShadow:"0 8px 30px #071b3108"}}>
      <p style={{color:"#079BD3",fontSize:10,fontWeight:800,letterSpacing:2}}>EKHAYA SELLER ACCESS</p>
      <h1 style={{fontSize:30,fontWeight:700,margin:"8px 0 10px"}}>{mode==="signup"?"Create your seller account":"Welcome back"}</h1>
      <p style={{color:"#60758A",fontSize:13,lineHeight:1.6}}>Your account keeps your monthly live marketplace search allowance separate from other sellers.</p>
      {mode==="signup"&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={field}/>}
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" style={field}/>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (at least 8 characters)" style={field}/>
      <button onClick={submit} disabled={busy||!email||password.length<8} style={{width:"100%",padding:14,background:"#079BD3",border:0,borderRadius:8,color:"#fff",fontWeight:700,marginTop:12,cursor:"pointer"}}>{busy?"Please wait…":mode==="signup"?"Create account":"Sign in"}</button>
      <button type="button" onClick={sendResetEmail} disabled={busy} style={{display:"block",position:"relative",zIndex:2,width:"100%",minHeight:44,padding:12,marginTop:4,background:"#fff",border:"1px solid #DCE8F1",borderRadius:8,color:"#079BD3",fontWeight:700,cursor:busy?"wait":"pointer",touchAction:"manipulation"}}>{busy?"Please wait…":"Forgot password?"}</button>
      <button onClick={()=>{setMode(mode==="signup"?"signin":"signup");setMessage("");}} style={{width:"100%",padding:12,background:"transparent",border:0,color:"#079BD3",fontWeight:700,cursor:"pointer"}}>{mode==="signup"?"Already registered? Sign in":"New to Ekhaya? Create an account"}</button>
      {signedIn&&<button onClick={signOut} style={{width:"100%",padding:10,border:"1px solid #DCE8F1",borderRadius:8,background:"#fff",color:"#071B31"}}>Sign out</button>}
      {message&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#304B63",background:"#F4F8FC",padding:12,borderRadius:8}}>{message}</p>}
      <p style={{fontSize:10,color:"#71869A",lineHeight:1.6,marginTop:16}}>Use a unique password. Ekhaya never asks for your marketplace Seller Central password here.</p>
    </section>
  </main>;
}
const field: React.CSSProperties = {boxSizing:"border-box",width:"100%",height:46,padding:"0 12px",border:"1px solid #DCE8F1",borderRadius:7,marginTop:10,fontSize:14};

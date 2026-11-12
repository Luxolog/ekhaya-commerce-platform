"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const supabaseUrl = "https://itxxnhcjjiynrmivexcb.supabase.co";
const anonKey = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";

export default function AccountPage() {
  const [mode,setMode] = useState<"signin"|"signup"|"reset"|"new-password">("signup");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [name,setName] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [recoveryToken,setRecoveryToken] = useState("");
  useEffect(()=>{
    const params = new URLSearchParams(window.location.hash.replace(/^#/,""));
    const token = params.get("access_token");
    if(params.get("type")==="recovery" && token){
      setRecoveryToken(token);
      setMode("new-password");
      setPassword("");
      setMessage("Choose a new password for your seller account.");
      window.history.replaceState({},document.title,window.location.pathname+window.location.search);
    } else if(params.get("error_description")){
      setMessage((params.get("error_description") || "").replace(/\+/g," "));
    }
  },[]);
  async function submit() {
    setBusy(true); setMessage("");
    try {
      if(mode==="reset"){
        const response=await fetch(supabaseUrl+"/auth/v1/recover?redirect_to="+encodeURIComponent(window.location.origin+"/account/"),{method:"POST",headers:{"Content-Type":"application/json","apikey":anonKey},body:JSON.stringify({email})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.msg??data.message??data.error_description??"Unable to send password reset email.");
        setMessage("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
        return;
      }
      if(mode==="new-password"){
        if(!recoveryToken) throw new Error("Your password reset link is missing or expired. Request a new reset email.");
        const response=await fetch(supabaseUrl+"/auth/v1/user",{method:"PUT",headers:{"Content-Type":"application/json","apikey":anonKey,"Authorization":"Bearer "+recoveryToken},body:JSON.stringify({password})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(data.msg??data.message??data.error_description??"Unable to update password.");
        setRecoveryToken("");
        setPassword("");
        setMode("signin");
        setMessage("Your password has been updated. Sign in using your new password.");
        return;
      }
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
  function signOut(){localStorage.removeItem("ekhaya_session");setMessage("You have been signed out.");}
  const signedIn = typeof window !== "undefined" && !!localStorage.getItem("ekhaya_session");
  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 5%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:760,margin:"0 auto",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={170} height={100} style={{width:150,height:"auto"}}/></Link>
      <Link href="/price-checker/" style={{color:"#079BD3",fontWeight:700,fontSize:13}}>Price checker →</Link>
    </header>
    <section style={{maxWidth:480,margin:"70px auto",background:"#fff",border:"1px solid #DCE8F1",borderRadius:14,padding:28,boxShadow:"0 8px 30px #071b3108"}}>
      <p style={{color:"#079BD3",fontSize:10,fontWeight:800,letterSpacing:2}}>EKHAYA SELLER ACCESS</p>
      <h1 style={{fontSize:30,fontWeight:700,margin:"8px 0 10px"}}>{mode==="signup"?"Create your seller account":mode==="reset"?"Reset your password":mode==="new-password"?"Choose a new password":"Welcome back"}</h1>
      <p style={{color:"#60758A",fontSize:13,lineHeight:1.6}}>Your account keeps your monthly live marketplace search allowance separate from other sellers.</p>
      {mode==="signup"&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={field}/>}
      {mode!=="new-password"&&<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" style={field}/>}
      {mode!=="reset"&&<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="new-password"?"New password (at least 8 characters)":"Password (at least 8 characters)"} style={field}/>}
      <button onClick={submit} disabled={busy||(mode!=="new-password"&&!email)||(mode!=="reset"&&password.length<8)} style={{width:"100%",padding:14,background:"#079BD3",border:0,borderRadius:8,color:"#fff",fontWeight:700,marginTop:12,cursor:"pointer"}}>{busy?"Please wait…":mode==="signup"?"Create account":mode==="reset"?"Send reset link":mode==="new-password"?"Update password":"Sign in"}</button>
      {mode==="signin"&&<button onClick={()=>{setMode("reset");setMessage("");}} style={{width:"100%",padding:10,background:"transparent",border:0,color:"#079BD3",fontWeight:700,cursor:"pointer"}}>Forgot password?</button>}
      <button onClick={()=>{setMode(mode==="signup"?"signin":mode==="signin"?"signup":"signin");setMessage("");}} style={{width:"100%",padding:12,background:"transparent",border:0,color:"#079BD3",fontWeight:700,cursor:"pointer"}}>{mode==="signup"?"Already registered? Sign in":mode==="reset"||mode==="new-password"?"Back to sign in":"New to Ekhaya? Create an account"}</button>
      {signedIn&&<button onClick={signOut} style={{width:"100%",padding:10,border:"1px solid #DCE8F1",borderRadius:8,background:"#fff",color:"#071B31"}}>Sign out</button>}
      {message&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#304B63",background:"#F4F8FC",padding:12,borderRadius:8}}>{message}</p>}
      <p style={{fontSize:10,color:"#71869A",lineHeight:1.6,marginTop:16}}>Use a unique password. Ekhaya never asks for your marketplace Seller Central password here.</p>
    </section>
  </main>;
}
const field: React.CSSProperties = {boxSizing:"border-box",width:"100%",height:46,padding:"0 12px",border:"1px solid #DCE8F1",borderRadius:7,marginTop:10,fontSize:14};

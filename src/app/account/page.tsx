"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";

const supabaseUrl = "https://itxxnhcjjiynrmivexcb.supabase.co";
const anonKey = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";
const passwordResetUrl = "https://ekhayatech.co.za/reset-password/";

export default function AccountPage() {
  const [mode,setMode] = useState<"signin"|"signup">("signup");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [name,setName] = useState("");
  const [sellerMarketplace,setSellerMarketplace] = useState("takealot");
  const [sellerId,setSellerId] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [signedIn,setSignedIn] = useState(false);
  useEffect(() => { setSignedIn(!!localStorage.getItem("ekhaya_session")); }, []);
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const endpoint = mode === "signup" ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
      const response = await fetch(supabaseUrl+endpoint,{method:"POST",headers:{"Content-Type":"application/json","apikey":anonKey},body:JSON.stringify(mode==="signup"?{email,password,data:{display_name:name,seller_marketplace:sellerMarketplace,seller_id:sellerId.trim(),marketplace_access:[sellerMarketplace]}}:{email,password})});
      const data = await response.json();
      if(!response.ok) throw new Error(data.msg??data.message??data.error_description??"Unable to process your account request.");
      if(data.access_token) {
        const session={...data,expires_at:Date.now()+Number(data.expires_in??3600)*1000};
        localStorage.setItem("ekhaya_session",JSON.stringify(session));
        setSignedIn(true);
        setMessage("You're signed in. You can now use marketplace searches.");
      } else {
        setMessage("Account created. Your Seller ID has been submitted for verification. Confirm your email; Ekhaya must approve your account before searches are enabled.");
        setMode("signin");
      }
    } catch(e) { setMessage(e instanceof Error?e.message:"Account request failed."); }
    finally { setBusy(false); }
  }
  async function submitAdditionalSellerIdentity() {
    if(!sellerId.trim()){setMessage("Enter your marketplace Seller ID.");return;}
    setBusy(true);setMessage("");
    try {
      const session=JSON.parse(localStorage.getItem("ekhaya_session")??"null");
      if(!session?.access_token) throw new Error("Please sign in first.");
      const response=await fetch(supabaseUrl+"/functions/v1/marketplace-search",{method:"POST",headers:{"Content-Type":"application/json",apikey:anonKey,Authorization:"Bearer "+session.access_token},body:JSON.stringify({action:"seller_submit_identity",marketplace:sellerMarketplace,seller_id:sellerId.trim()})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error??"Could not submit seller identity.");
      setSellerId("");setMessage("Seller ID submitted. It is pending Ekhaya verification.");
    } catch(e) {setMessage(e instanceof Error?e.message:"Could not submit seller ID.");}
    finally {setBusy(false);}
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
  function signOut(){localStorage.removeItem("ekhaya_session");setSignedIn(false);setMessage("You have been signed out.");}
  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 5%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <SiteHeader active="account" />
    <section style={{maxWidth:480,margin:"70px auto",background:"#fff",border:"1px solid #DCE8F1",borderRadius:14,padding:28,boxShadow:"0 8px 30px #071b3108"}}>
      <p style={{color:"#079BD3",fontSize:10,fontWeight:800,letterSpacing:2}}>EKHAYA SELLER ACCESS</p>
      <h1 style={{fontSize:30,fontWeight:700,margin:"8px 0 10px"}}>{mode==="signup"?"Create your seller account":"Welcome back"}</h1>
      <p style={{color:"#60758A",fontSize:13,lineHeight:1.6}}>Your account keeps your monthly live marketplace search allowance separate from other sellers.</p>
      {mode==="signup"&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name (no links or promotions)" style={field}/>}
      {mode==="signup"&&<><label style={{display:"block",fontSize:12,fontWeight:700,marginTop:12}}>Marketplace you sell on<select value={sellerMarketplace} onChange={e=>setSellerMarketplace(e.target.value)} style={{...field,display:"block"}}><option value="takealot">Takealot</option><option value="amazon">Amazon South Africa</option><option value="makro">Makro</option><option value="bobshop">Bob Shop</option><option value="leroy_merlin">Leroy Merlin</option></select></label><input value={sellerId} onChange={e=>setSellerId(e.target.value)} placeholder="Marketplace Seller ID" style={field}/></>}
      <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" style={field}/>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (at least 8 characters)" style={field}/>
      <button onClick={submit} disabled={busy||!email||password.length<8||(mode==="signup"&&(!name.trim()||!sellerId.trim()))} style={{width:"100%",padding:14,background:"#079BD3",border:0,borderRadius:8,color:"#fff",fontWeight:700,marginTop:12,cursor:"pointer"}}>{busy?"Please wait…":mode==="signup"?"Create account":"Sign in"}</button>
      <button type="button" onClick={sendResetEmail} disabled={busy} style={{display:"block",position:"relative",zIndex:2,width:"100%",minHeight:44,padding:12,marginTop:4,background:"#fff",border:"1px solid #DCE8F1",borderRadius:8,color:"#079BD3",fontWeight:700,cursor:busy?"wait":"pointer",touchAction:"manipulation"}}>{busy?"Please wait…":"Forgot password?"}</button>
      <button onClick={()=>{setMode(mode==="signup"?"signin":"signup");setMessage("");}} style={{width:"100%",padding:12,background:"transparent",border:0,color:"#079BD3",fontWeight:700,cursor:"pointer"}}>{mode==="signup"?"Already registered? Sign in":"New to Ekhaya? Create an account"}</button>
      {signedIn&&<section style={{marginTop:18,paddingTop:16,borderTop:"1px solid #DCE8F1"}}>
        <h2 style={{fontSize:16}}>Add another marketplace Seller ID</h2>
        <p style={{fontSize:12,color:"#60758A",lineHeight:1.5}}>Submit one Seller ID for every marketplace you operate on. Each identity is reviewed separately.</p>
        <select value={sellerMarketplace} onChange={e=>setSellerMarketplace(e.target.value)} style={field}><option value="takealot">Takealot</option><option value="amazon">Amazon South Africa</option><option value="makro">Makro</option><option value="bobshop">Bob Shop</option><option value="leroy_merlin">Leroy Merlin</option></select>
        <input value={sellerId} onChange={e=>setSellerId(e.target.value)} placeholder="Marketplace Seller ID" style={field}/>
        <button type="button" disabled={busy||!sellerId.trim()} onClick={submitAdditionalSellerIdentity} style={{width:"100%",padding:12,marginTop:10,background:"#071B31",border:0,borderRadius:8,color:"#fff",fontWeight:700}}>Submit Seller ID for verification</button>
      </section>}
      {signedIn&&<button onClick={signOut} style={{width:"100%",padding:10,border:"1px solid #DCE8F1",borderRadius:8,background:"#fff",color:"#071B31"}}>Sign out</button>}
      {message&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#304B63",background:"#F4F8FC",padding:12,borderRadius:8}}>{message}</p>}
      <p style={{fontSize:10,color:"#71869A",lineHeight:1.6,marginTop:16}}>Use a unique password. Ekhaya never asks for your marketplace Seller Central password here.</p>
    </section>
  </main>;
}
const field: React.CSSProperties = {boxSizing:"border-box",width:"100%",height:46,padding:"0 12px",border:"1px solid #DCE8F1",borderRadius:7,marginTop:10,fontSize:14};

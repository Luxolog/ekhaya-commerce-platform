"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const supabaseUrl = "https://itxxnhcjjiynrmivexcb.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export default function AccountPage() {
  const [mode,setMode] = useState<"signin"|"signup"|"reset"|"new-password"|"accept-partner">("signin");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [name,setName] = useState("");
  const [privacyAccepted,setPrivacyAccepted] = useState(false);
  const [marketingOptIn,setMarketingOptIn] = useState(false);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [recoveryToken,setRecoveryToken] = useState("");
  const [referralCode,setReferralCode] = useState("");
  const [partnerInvitationId,setPartnerInvitationId] = useState("");
  const [partnerLinkCode,setPartnerLinkCode] = useState("SAECHAMBER");
  const [accountType,setAccountType] = useState<"seller"|"partner"|"owner">("seller");
  const [signedIn,setSignedIn] = useState(false);
  const [availableRoles,setAvailableRoles] = useState<string[]>([]);
  const [checkingAccess,setCheckingAccess] = useState(false);
  const [otpPending,setOtpPending] = useState(false);
  const [otpCode,setOtpCode] = useState("");
  const [otpEmailHint,setOtpEmailHint] = useState("");
  const [otpBusy,setOtpBusy] = useState(false);
  const destinations = { seller: "/price-checker/", partner: "/partner/saechamber/", owner: "/owner/" } as const;
  async function emailOtpRequest(accessToken: string, payload: Record<string, unknown>) {
    const response = await fetch(supabaseUrl+"/functions/v1/partner-admin-email-otp", {
      method: "POST",
      headers: {"Content-Type":"application/json", apikey:anonKey, Authorization:"Bearer "+accessToken},
      body: JSON.stringify(payload),
      cache: "no-store"
    });
    const result = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(result.error ?? "Email verification could not be completed.");
    return result;
  }
  async function requireEmailOtp(accessToken: string, roles: string[]) {
    if(!roles.includes("partner") && !roles.includes("owner")) return false;
    const status = await emailOtpRequest(accessToken, {action:"status"});
    if(!status.enabled || status.verified) return false;
    const challenge = await emailOtpRequest(accessToken, {action:"start"});
    setOtpEmailHint(String(challenge.email_hint ?? "your registered email"));
    setOtpCode("");
    setOtpPending(true);
    setSignedIn(true);
    setMessage("We sent a six-digit verification code to "+String(challenge.email_hint ?? "your registered email")+". Enter it to continue.");
    return true;
  }
  async function verifyEmailOtp() {
    setOtpBusy(true); setMessage("");
    try {
      const raw = localStorage.getItem("ekhaya_session");
      const session = raw ? JSON.parse(raw) : null;
      if(!session?.access_token) throw new Error("Your sign-in session has expired. Please sign in again.");
      await emailOtpRequest(session.access_token, {action:"verify", code:otpCode});
      setOtpPending(false);
      setMessage("Email verified. Opening your authorised workspace…");
      window.location.replace(destinations[accountType]);
    } catch(e) {
      setMessage(e instanceof Error ? e.message : "Could not verify the email code.");
    } finally { setOtpBusy(false); }
  }
  const destinations
  async function loadAccountRoles(accessToken: string) {
    const headers={apikey:anonKey,Authorization:"Bearer "+accessToken};
    const userResponse=await fetch(supabaseUrl+"/auth/v1/user",{headers,cache:"no-store"});
    if(!userResponse.ok) throw new Error("Your sign-in session has expired. Please sign in again.");
    const user=await userResponse.json();
    const partnerResponse=await fetch(supabaseUrl+"/rest/v1/partner_programs?select=id&partner_user_id=eq."+encodeURIComponent(user.id)+"&limit=1",{headers,cache:"no-store"});
    if(!partnerResponse.ok) throw new Error("Could not verify your partner permissions. Please contact Ekhaya support.");
    const partners=await partnerResponse.json();
    const roles=["seller"];
    if(Array.isArray(partners)&&partners.length) roles.push("partner");
    const app=user.app_metadata??{};
    if(app.role==="owner"||app.is_owner===true) roles.push("owner");
    return roles;
  }
  useEffect(()=>{
    const searchParams = new URLSearchParams(window.location.search);
    const referral = searchParams.get("ref");
    const requestedAccount = searchParams.get("account");
    if(requestedAccount === "seller" || requestedAccount === "partner" || requestedAccount === "owner") {
      setAccountType(requestedAccount);
    }
    if(referral) setReferralCode(referral.toUpperCase().replace(/[^A-Z0-9_-]/g,""));
    const params = new URLSearchParams(window.location.hash.replace(/^#/,""));
    const token = params.get("access_token");
    const inviteId = new URLSearchParams(window.location.search).get("partner_invite");
    if(params.get("type")==="invite" && token && inviteId){
      setRecoveryToken(token);
      setPartnerInvitationId(inviteId);
      setMode("accept-partner");
      setMessage("Welcome. Create your password and choose the unique code for your SA eChamber seller referral link.");
      window.history.replaceState({},document.title,window.location.pathname+window.location.search);
      return;
    }
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
  useEffect(()=>{
    let active=true;
    try {
      const raw=localStorage.getItem("ekhaya_session");
      if(raw){
        const session=JSON.parse(raw);
        if(session?.access_token){
          setSignedIn(true); setMode("signin"); setCheckingAccess(true);
          loadAccountRoles(session.access_token).then(async roles=>{
            if(!active) return;
            setAvailableRoles(roles);
            if(await requireEmailOtp(session.access_token, roles)) return;
            const requested = new URLSearchParams(window.location.search).get("account");
            if(requested === "partner" && roles.includes("partner")) window.location.replace(destinations.partner);
            else if(requested === "owner" && roles.includes("owner")) window.location.replace(destinations.owner);
            else if(requested === "seller" && roles.includes("seller")) window.location.replace(destinations.seller);
            else if(requested === "partner" || requested === "owner") setMessage("This account does not have access to the requested workspace. Choose an authorised account or contact Ekhaya support.");
          })
            .catch(e=>{if(active)setMessage(e instanceof Error?e.message:"Could not verify account access.");})
            .finally(()=>{if(active)setCheckingAccess(false);});
        }
      }
    } catch { localStorage.removeItem("ekhaya_session"); }
    return ()=>{active=false;};
  },[]);
  async function submit() {
    setBusy(true); setMessage("");
    try {
      if(!anonKey) throw new Error("Account services are not configured. Please contact Ekhaya support.");
      if(mode==="signup" && !privacyAccepted) throw new Error("Please read and acknowledge the Privacy Notice before creating an account.");
      if(mode==="reset"){
        const response=await fetch(supabaseUrl+"/auth/v1/recover?redirect_to="+encodeURIComponent(window.location.origin+"/account/"),{method:"POST",headers:{"Content-Type":"application/json","apikey":anonKey},body:JSON.stringify({email})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.msg??data.message??data.error_description??"Unable to send password reset email.");
        setMessage("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
        return;
      }
      if(mode==="accept-partner"){
        if(!recoveryToken || !partnerInvitationId) throw new Error("Your invitation link is missing or expired. Ask Ekhaya to send another invitation.");
        if(password.length<8) throw new Error("Choose a password with at least 8 characters.");
        const passwordResponse=await fetch(supabaseUrl+"/auth/v1/user",{method:"PUT",headers:{"Content-Type":"application/json","apikey":anonKey,"Authorization":"Bearer "+recoveryToken},body:JSON.stringify({password})});
        const passwordData=await passwordResponse.json().catch(()=>({}));
        if(!passwordResponse.ok) throw new Error(passwordData.msg??passwordData.message??"Unable to set your password.");
        const acceptResponse=await fetch(supabaseUrl+"/functions/v1/accept-saechamber-partner-invitation",{method:"POST",headers:{"Content-Type":"application/json","apikey":anonKey,"Authorization":"Bearer "+recoveryToken},body:JSON.stringify({invitation_id:partnerInvitationId,referral_code:partnerLinkCode})});
        const accepted=await acceptResponse.json().catch(()=>({}));
        if(!acceptResponse.ok) throw new Error(accepted.error??"Unable to accept partner invitation.");
        const session={access_token:recoveryToken,token_type:"bearer",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:accepted.user};
        localStorage.setItem("ekhaya_session",JSON.stringify(session));
        setMessage("Your SA eChamber partner account is ready. Opening your partner dashboard…");
        window.location.href="/partner/saechamber/";
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
      const response = await fetch(supabaseUrl+endpoint,{method:"POST",headers:{"Content-Type":"application/json","apikey":anonKey},body:JSON.stringify(mode==="signup"?{email,password,data:{display_name:name,privacy_notice_acknowledged_at:new Date().toISOString(),privacy_notice_version:"2026-11-16",marketing_opt_in:marketingOptIn,...(referralCode?{referral_code:referralCode}:{})}}:{email,password})});
      const data = await response.json();
      if(!response.ok) throw new Error(data.msg??data.message??data.error_description??"Unable to process your account request.");
      if(data.access_token) {
        const session={...data,expires_at:Math.floor(Date.now()/1000)+Number(data.expires_in??3600)};
        localStorage.setItem("ekhaya_session",JSON.stringify(session));
        setSignedIn(true);
        if(mode==="signin"){
          const roles=await loadAccountRoles(session.access_token);
          setAvailableRoles(roles);
          if(await requireEmailOtp(session.access_token, roles)) return;
          if(!roles.includes(accountType)) throw new Error("This login is not authorised for the selected "+(accountType==="owner"?"Admin/Owner":accountType)+" account. Contact Ekhaya support if you believe this is incorrect.");
          window.location.href=destinations[accountType];
          return;
        }
        window.location.href=destinations.seller;
        return;
      } else {
        setMessage("Account created. Check your email to confirm your address, then sign in.");
        setMode("signin");
      }
    } catch(e) { setMessage(e instanceof Error?e.message:"Account request failed."); }
    finally { setBusy(false); }
  }
  function signOut(){localStorage.removeItem("ekhaya_session");setSignedIn(false);setAvailableRoles([]);setMessage("You have been signed out.");}
  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 5%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:760,margin:"0 auto",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={170} height={100} style={{width:150,height:"auto"}}/></Link>
      <nav aria-label="Account access" style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",fontSize:12}}>
        <Link href="/partner/account/" style={{color:"#087EAC",fontWeight:700,textDecoration:"none"}}>Partner access</Link>
        <Link href="/admin/account/" style={{color:"#087EAC",fontWeight:700,textDecoration:"none"}}>Admin access</Link>
        <Link href="/price-checker/" style={{color:"#079BD3",fontWeight:700,textDecoration:"none"}}>Price checker →</Link>
      </nav>
    </header>
    <section style={{maxWidth:480,margin:"70px auto",background:"#fff",border:"1px solid #DCE8F1",borderRadius:14,padding:28,boxShadow:"0 8px 30px #071b3108"}}>
      <p style={{color:"#079BD3",fontSize:10,fontWeight:800,letterSpacing:2}}>EKHAYA ACCOUNT ACCESS</p>
      <h1 style={{fontSize:30,fontWeight:700,margin:"8px 0 10px"}}>{signedIn?"Your Ekhaya accounts":mode==="signup"?"Create your seller account":mode==="reset"?"Reset your password":mode==="new-password"?"Choose a new password":mode==="accept-partner"?"Accept partner invitation":"Sign in to your account"}</h1>
      <p style={{color:"#60758A",fontSize:13,lineHeight:1.6}}>Sign in to continue to your Ekhaya workspace. New to Ekhaya? You can create a seller account below.</p>
      {!signedIn&&mode!=="accept-partner"&&mode!=="reset"&&mode!=="new-password"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(115px,1fr))",gap:9,margin:"18px 0"}}>
        {([{id:"seller",title:"Seller Account",desc:"Marketplace searches",icon:"🛍️"},{id:"partner",title:"Partner Account",desc:"SA eChamber dashboard",icon:"🤝"},{id:"owner",title:"Admin Account",desc:"Owner controls & analytics",icon:"🔐"}] as const).map(item=><button key={item.id} type="button" onClick={()=>{setAccountType(item.id);setMessage("");if(item.id!=="seller"&&mode==="signup")setMode("signin");}} style={{textAlign:"left",padding:12,borderRadius:10,border:accountType===item.id?"2px solid #079BD3":"1px solid #DCE8F1",background:accountType===item.id?"#EFF9FE":"#fff",color:"#071B31",cursor:"pointer"}}>
          <span style={{fontSize:21}}>{item.icon}</span><strong style={{display:"block",fontSize:13,marginTop:6}}>{item.title}</strong><span style={{display:"block",fontSize:10,color:"#60758A",lineHeight:1.4,marginTop:4}}>{item.desc}</span>
        </button>)}
      </div>}
      {otpPending&&<div style={{background:"#EFF9FE",border:"1px solid #B9DDED",borderRadius:10,padding:16,margin:"18px 0"}}>
        <strong style={{fontSize:14}}>Verify your email address</strong>
        <p style={{fontSize:12,color:"#40566B",lineHeight:1.6}}>Enter the six-digit code sent to {otpEmailHint}. The code expires in five minutes.</p>
        <input inputMode="numeric" autoComplete="one-time-code" value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit verification code" style={field}/>
        <button onClick={verifyEmailOtp} disabled={otpBusy||otpCode.length!==6} style={{width:"100%",padding:14,background:"#079BD3",border:0,borderRadius:8,color:"#fff",fontWeight:700,marginTop:12,cursor:"pointer"}}>{otpBusy?"Verifying…":"Verify and continue"}</button>
      </div>}
      {signedIn&&!otpPending&&<div style={{background:"#F4F8FC",border:"1px solid #DCE8F1",borderRadius:10,padding:14,marginBottom:14}}>
        <strong style={{fontSize:13}}>Your available accounts</strong>
        {checkingAccess?<p style={{fontSize:12,color:"#60758A",marginBottom:0}}>Checking your account permissions…</p>:<div style={{display:"grid",gap:8,marginTop:10}}>
          {([{id:"seller",title:"Seller account",href:"/price-checker/"},{id:"partner",title:"Partner account",href:"/partner/saechamber/"},{id:"owner",title:"Admin / Owner account",href:"/owner/"}] as const).filter(item=>availableRoles.includes(item.id)).map(item=><Link key={item.id} href={item.href} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#fff",border:"1px solid #DCE8F1",borderRadius:8,padding:"10px 12px",color:"#087EAC",fontSize:13,fontWeight:700,textDecoration:"none"}}>{item.title}<span>Open →</span></Link>)}
          {!availableRoles.length&&<p style={{fontSize:12,color:"#60758A",margin:0}}>Your account permissions could not be confirmed. Please sign in again.</p>}
        </div>}
      </div>}
      {!signedIn&&mode==="signup"&&accountType==="seller"&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={field}/>}
      {!signedIn&&mode==="signup"&&accountType==="seller"&&<div style={{fontSize:12,lineHeight:1.6,color:"#40566B",marginTop:14}}><label style={{display:"flex",gap:9,alignItems:"flex-start"}}><input type="checkbox" checked={privacyAccepted} onChange={e=>setPrivacyAccepted(e.target.checked)} style={{marginTop:3}}/><span>I have read and acknowledge the <Link href="/privacy/" target="_blank">Ekhaya Privacy Notice</Link>. I understand how my account information will be processed. *</span></label><label style={{display:"flex",gap:9,alignItems:"flex-start",marginTop:10}}><input type="checkbox" checked={marketingOptIn} onChange={e=>setMarketingOptIn(e.target.checked)} style={{marginTop:3}}/><span>Optional: Send me product news and offers. I can opt out at any time.</span></label></div>}
      {mode==="accept-partner"&&<><p style={{fontSize:13,color:"#40566B",lineHeight:1.6}}>Create your own secure password and choose a unique referral code. Your link will be yours to share with prospective sellers.</p><input value={partnerLinkCode} onChange={e=>setPartnerLinkCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,20))} placeholder="Your unique link code (5–20 letters/numbers)" style={field}/></>}
      {!signedIn&&mode!=="new-password"&&mode!=="accept-partner"&&<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" style={field}/>}
      {(!signedIn||mode==="new-password"||mode==="accept-partner")&&mode!=="reset"&&<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="new-password"?"New password (at least 8 characters)":"Password (at least 8 characters)"} style={field}/>}
      {!signedIn&&<button onClick={submit} disabled={busy||(mode!=="new-password"&&mode!=="accept-partner"&&!email)||(mode!=="reset"&&password.length<8)||(mode==="accept-partner"&&partnerLinkCode.length<5)||(mode==="signup"&&accountType!=="seller")} style={{width:"100%",padding:14,background:"#079BD3",border:0,borderRadius:8,color:"#fff",fontWeight:700,marginTop:12,cursor:"pointer"}}>{busy?"Please wait…":mode==="signup"?"Create seller account":mode==="reset"?"Send reset link":mode==="new-password"?"Update password":mode==="accept-partner"?"Accept invitation & create account":"Sign in"}</button>}
      {!signedIn&&mode==="signin"&&<button onClick={()=>{setMode("reset");setMessage("");}} style={{width:"100%",padding:10,background:"transparent",border:0,color:"#079BD3",fontWeight:700,cursor:"pointer"}}>Forgot password?</button>}
      {!signedIn&&mode!=="accept-partner"&&<button onClick={()=>{setMode(mode==="signup"?"signin":mode==="signin"?"signup":"signin");setMessage("");}} style={{width:"100%",padding:12,background:"transparent",border:0,color:"#079BD3",fontWeight:700,cursor:"pointer"}}>{mode==="signup"?"Already registered? Sign in":mode==="reset"||mode==="new-password"?"Back to sign in":accountType==="seller"?"New to Ekhaya? Create a seller account":"Partner and Admin/Owner access are invitation-only"}</button>}
      {signedIn&&<button onClick={signOut} style={{width:"100%",padding:10,border:"1px solid #DCE8F1",borderRadius:8,background:"#fff",color:"#071B31"}}>Sign out</button>}
      {message&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#304B63",background:"#F4F8FC",padding:12,borderRadius:8}}>{message}</p>}
      <p style={{fontSize:10,color:"#71869A",lineHeight:1.6,marginTop:16}}>Use a unique password. Ekhaya never asks for your marketplace Seller Central password here.</p>
    </section>
  </main>;
}
const field: React.CSSProperties = {boxSizing:"border-box",width:"100%",height:46,padding:"0 12px",border:"1px solid #DCE8F1",borderRadius:7,marginTop:10,fontSize:14};

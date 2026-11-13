"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { account, currentUser, ID, signOutAppwrite } from "@/lib/appwrite-client";

type Mode = "signup" | "signin" | "reset" | "new-password";

export default function AccountPage() {
  const [mode,setMode] = useState<Mode>("signin");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [name,setName] = useState("");
  const [oldPassword,setOldPassword] = useState("");
  const [marketplaceAccess,setMarketplaceAccess] = useState<("takealot"|"amazon")[]>(["takealot","amazon"]);
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [signedInEmail,setSignedInEmail] = useState("");
  const [recovery,setRecovery] = useState<{userId:string;secret:string}|null>(null);

  useEffect(()=>{
    let active=true;
    void currentUser().then(user=>{if(active&&user)setSignedInEmail(user.email);});
    const params=new URLSearchParams(window.location.search);
    const userId=params.get("userId");
    const secret=params.get("secret");
    if(userId&&secret){setRecovery({userId,secret});setMode("new-password");setMessage("Choose a new password for your account.");}
    return ()=>{active=false;};
  },[]);

  async function submit() {
    setBusy(true);setMessage("");
    try {
      if(mode==="reset"){
        await account.createRecovery(email,window.location.origin+"/account/");
        setMessage("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
      } else if(mode==="new-password"){
        if(!recovery)throw new Error("The password reset link is missing or expired. Request a new one.");
        await account.updateRecovery(recovery.userId,recovery.secret,password);
        window.history.replaceState({},document.title,window.location.pathname);
        setRecovery(null);setPassword("");setMode("signin");
        setMessage("Password updated successfully. Sign in with your new password.");
      } else if(mode==="signup"){
        await account.create(ID.unique(),email,password,name);
        await account.createEmailPasswordSession(email,password);
        const user=await account.get();
        setSignedInEmail(user.email);
        setMessage("Your account has been created and you are signed in. Marketplace access will be enabled by the Ekhaya owner.");
      } else {
        await account.createEmailPasswordSession(email,password);
        const user=await account.get();
        setSignedInEmail(user.email);
        setMessage("You are signed in successfully.");
      }
    } catch(e) {
      setMessage(e instanceof Error?e.message:"Account request failed. Please try again.");
    } finally {setBusy(false);}
  }

  async function changePassword(){
    setBusy(true);setMessage("");
    try{
      await account.updatePassword(password,oldPassword);
      setOldPassword("");setPassword("");
      setMessage("Your password has been changed successfully.");
    }catch(e){setMessage(e instanceof Error?e.message:"Password change failed.");}
    finally{setBusy(false);}
  }

  async function signOut(){
    await signOutAppwrite();setSignedInEmail("");setPassword("");setOldPassword("");
    setMessage("You have been signed out.");
  }

  const field:React.CSSProperties={boxSizing:"border-box",width:"100%",height:46,padding:"0 12px",border:"1px solid #DCE8F1",borderRadius:7,marginTop:10,fontSize:14};
  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 5%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:760,margin:"0 auto",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={170} height={100} style={{width:150,height:"auto"}}/></Link>
      <nav style={{display:"flex",gap:16,alignItems:"center"}}><Link href="/admin/login/" style={{color:"#079BD3",fontWeight:700,fontSize:13}}>Owner login</Link><Link href="/price-checker/" style={{color:"#079BD3",fontWeight:700,fontSize:13}}>Price checker →</Link></nav>
    </header>
    <section style={{maxWidth:480,margin:"60px auto",background:"#fff",border:"1px solid #DCE8F1",borderRadius:14,padding:28,boxShadow:"0 8px 30px #071b3108"}}>
      <p style={{color:"#079BD3",fontSize:10,fontWeight:800,letterSpacing:2}}>EKHAYA SELLER ACCESS · APPWRITE</p>
      <h1 style={{fontSize:30,fontWeight:700,margin:"8px 0 10px"}}>{signedInEmail?"Your seller account":mode==="signup"?"Create your seller account":mode==="reset"?"Reset your password":mode==="new-password"?"Choose a new password":"Welcome back"}</h1>
      {signedInEmail ? <>
        <p style={{color:"#60758A",fontSize:13}}>Signed in as <b>{signedInEmail}</b></p>
        <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:16}}>Current password</label>
        <input type="password" autoComplete="current-password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} placeholder="Current password" style={field}/>
        <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:12}}>New password</label>
        <input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="New password (at least 8 characters)" style={field}/>
        <button onClick={changePassword} disabled={busy||oldPassword.length<8||password.length<8} style={{width:"100%",padding:14,background:"#079BD3",border:0,borderRadius:8,color:"#fff",fontWeight:700,marginTop:12}}>Change password</button>
        <button onClick={signOut} style={{width:"100%",padding:12,background:"transparent",border:0,color:"#079BD3",fontWeight:700}}>Sign out</button>
      </> : <>
        {mode==="signup"&&<><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={field}/><fieldset style={{border:"1px solid #DCE8F1",borderRadius:8,padding:14,margin:"14px 0 4px"}}><legend style={{fontSize:12,fontWeight:700,padding:"0 6px"}}>Marketplace interests</legend><p style={{fontSize:11,color:"#60758A"}}>The owner will approve marketplace access for your account.</p>{(["takealot","amazon"] as const).map(value=><label key={value} style={{display:"flex",alignItems:"center",gap:9,fontSize:13,padding:"7px 0"}}><input type="checkbox" checked={marketplaceAccess.includes(value)} onChange={e=>setMarketplaceAccess(old=>e.target.checked?[...old,value]:old.filter(item=>item!==value))}/>{value==="takealot"?"Takealot":"Amazon South Africa"}</label>)}</fieldset></>}
        {mode!=="new-password"&&<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" style={field}/>}
        {mode!=="reset"&&<input type="password" autoComplete={mode==="new-password"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="new-password"?"New password (at least 8 characters)":"Password (at least 8 characters)"} style={field}/>}
        <button onClick={submit} disabled={busy||(mode!=="new-password"&&!email)||(mode!=="reset"&&password.length<8)||(mode==="signup"&&(!name.trim()||marketplaceAccess.length===0))} style={{width:"100%",padding:14,background:"#079BD3",border:0,borderRadius:8,color:"#fff",fontWeight:700,marginTop:12}}>{busy?"Please wait…":mode==="signup"?"Create seller account":mode==="reset"?"Send reset link":mode==="new-password"?"Update password":"Sign in"}</button>
        {mode==="signin"&&<button onClick={()=>{setMode("reset");setMessage("");}} style={{width:"100%",padding:10,background:"transparent",border:0,color:"#079BD3",fontWeight:700}}>Forgot password?</button>}
        <button onClick={()=>{setMode(mode==="signup"?"signin":mode==="signin"?"signup":"signin");setMessage("");}} style={{width:"100%",padding:12,background:"transparent",border:0,color:"#079BD3",fontWeight:700}}>{mode==="signup"?"Already registered? Sign in":mode==="reset"||mode==="new-password"?"Back to sign in":"New to Ekhaya? Create an account"}</button>
      </>}
      {message&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#304B63",background:"#F4F8FC",padding:12,borderRadius:8}}>{message}</p>}
      <p style={{fontSize:10,color:"#71869A",lineHeight:1.6,marginTop:16}}>Ekhaya uses Appwrite authentication. Never share your marketplace Seller Portal password.</p>
    </section>
  </main>;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { account } from "@/lib/appwrite-client";

export default function AdminLoginPage() {
  const [email,setEmail]=useState("gozongo@live.com");
  const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);

  async function signIn(){
    setBusy(true);setMessage("");
    try{
      await account.createEmailPasswordSession(email,password);
      const user=await account.get();
      if(!Array.isArray(user.labels)||!user.labels.includes("owner")){
        await account.deleteSession("current");
        throw new Error("This Appwrite account is not yet assigned the Ekhaya owner role. Contact the project administrator to provision owner access.");
      }
      window.location.href="/admin/";
    }catch(e){setMessage(e instanceof Error?e.message:"Administrator sign-in failed.");}
    finally{setBusy(false);}
  }

  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"28px 5%",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
    <header style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={190} height={110} style={{width:165,height:"auto"}}/></Link>
      <span style={{color:"#079BD3",fontWeight:800,fontSize:12,letterSpacing:2}}>OWNER ACCESS · APPWRITE</span>
    </header>
    <section style={{maxWidth:470,margin:"70px auto",background:"#fff",border:"1px solid #DCE8F1",borderRadius:16,padding:32,boxShadow:"0 12px 40px #071b310d"}}>
      <p style={{color:"#079BD3",fontWeight:800,fontSize:12,letterSpacing:3}}>EKHAYA TECHNOLOGIES</p>
      <h1 style={{fontSize:34,margin:"10px 0"}}>Owner sign in</h1>
      <p style={{color:"#60758A",lineHeight:1.6}}>Only accounts carrying the verified Appwrite owner label can enter the control centre.</p>
      <label style={{display:"block",fontSize:13,fontWeight:700,marginTop:24}}>Owner email</label>
      <input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} style={field}/>
      <label style={{display:"block",fontSize:13,fontWeight:700,marginTop:16}}>Password</label>
      <input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void signIn();}} style={field}/>
      <button onClick={signIn} disabled={busy||!email||!password} style={{width:"100%",padding:15,marginTop:22,border:0,borderRadius:9,background:"#079BD3",color:"#fff",fontSize:16,fontWeight:800}}>{busy?"Verifying access…":"Sign in to owner centre"}</button>
      {message&&<p role="alert" style={{background:"#FFF4F2",color:"#9C2F20",padding:14,borderRadius:8,lineHeight:1.5}}>{message}</p>}
      <p style={{fontSize:12,color:"#71869A",marginTop:22}}>Seller account? <Link href="/account/" style={{color:"#079BD3",fontWeight:700}}>Go to seller sign in</Link></p>
    </section>
  </main>;
}
const field:React.CSSProperties={boxSizing:"border-box",width:"100%",height:50,padding:"0 14px",border:"1px solid #DCE8F1",borderRadius:8,marginTop:8,fontSize:15};

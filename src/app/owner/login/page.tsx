"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";

const supabaseUrl="https://itxxnhcjjiynrmivexcb.supabase.co";
const anonKey="sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";
const edgeUrl=supabaseUrl+"/functions/v1/marketplace-search";

export default function OwnerLoginPage(){
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  const router=useRouter();
  async function submit(){
    setBusy(true);setMessage("");
    try{
      const response=await fetch(supabaseUrl+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"Content-Type":"application/json","apikey":anonKey},body:JSON.stringify({email:email.trim(),password})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.access_token)throw new Error(data.msg??data.message??data.error_description??"Email or password is incorrect.");
      const check=await fetch(edgeUrl,{method:"POST",headers:{"Content-Type":"application/json","apikey":anonKey,"Authorization":"Bearer "+data.access_token},body:JSON.stringify({action:"owner_list_users"})});
      const result=await check.json().catch(()=>({}));
      if(check.status===403)throw new Error("This account does not have Ekhaya owner access. Use your designated owner account.");
      if(!check.ok)throw new Error(result.error??"Could not verify owner permissions. Please try again.");
      localStorage.setItem("ekhaya_session",JSON.stringify({...data,expires_at:Date.now()+Number(data.expires_in??3600)*1000}));
      router.replace("/owner/pilot/");
    }catch(e){setMessage(e instanceof Error?e.message:"Unable to sign in.");}
    finally{setBusy(false);}
  }
  return <main style={{minHeight:"100vh",background:"#F4F8FC",padding:"32px 5%",fontFamily:"Arial,sans-serif",color:"#071B31"}}>
    <header style={{maxWidth:900,margin:"0 auto",paddingBottom:18,borderBottom:"1px solid #DCE8F1"}}><b>EKHAYA TECHNOLOGIES</b><div style={{fontSize:11,color:"#60758A",marginTop:5}}>PRIVATE OWNER PORTAL</div></header>
    <section style={{maxWidth:430,margin:"70px auto",padding:30,background:"#fff",border:"1px solid #DCE8F1",borderRadius:14,boxShadow:"0 8px 30px #071b3108"}}>
      <div style={{fontSize:10,color:"#079BD3",fontWeight:800,letterSpacing:2}}>SECURE ADMINISTRATION</div>
      <h1 style={{fontSize:29,margin:"9px 0"}}>Owner sign in</h1>
      <p style={{fontSize:13,color:"#60758A",lineHeight:1.6}}>Sign in with your existing Ekhaya owner account. Seller accounts cannot access this portal.</p>
      <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:18}}>Owner email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your owner email" style={field}/></label>
      <label style={{display:"block",fontSize:12,fontWeight:700,marginTop:14}}>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submit();}} placeholder="Your password" style={field}/></label>
      <button disabled={busy||!email.trim()||!password} onClick={submit} style={{width:"100%",marginTop:20,padding:13,border:0,borderRadius:8,background:"#071B31",color:"#fff",fontWeight:700,cursor:"pointer",opacity:busy?0.6:1}}>{busy?"Verifying owner access…":"Sign in to Owner Portal"}</button>
      {message&&<p role="alert" style={{fontSize:12,lineHeight:1.5,color:"#A13A35",background:"#FFF5F4",padding:11,borderRadius:7}}>{message}</p>}
      <p style={{fontSize:12,marginTop:18}}><Link href="/account/" style={{color:"#079BD3"}}>Go to seller account sign in</Link></p>
    </section>
  </main>;
}
const field:React.CSSProperties={display:"block",width:"100%",height:44,boxSizing:"border-box",padding:"0 12px",marginTop:7,border:"1px solid #DCE8F1",borderRadius:7,fontSize:14};

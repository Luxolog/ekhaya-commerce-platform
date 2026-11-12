"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const supabaseUrl = "https://itxxnhcjjiynrmivexcb.supabase.co";
const anonKey = "sb_publishable_FnosMonQeHC4jso8Jv5tcA_AU_59M7t";

type AdminUser = { email?: string; app_metadata?: Record<string,unknown> };

export default function AdminDashboardPage() {
  const [user,setUser] = useState<AdminUser|null>(null);
  const [status,setStatus] = useState("Verifying administrator session…");

  useEffect(()=>{
    let active = true;
    async function verify(){
      try{
        const session = JSON.parse(localStorage.getItem("ekhaya_session") ?? "null");
        if(!session?.access_token){window.location.replace("/admin/login/");return;}
        const response = await fetch(supabaseUrl+"/auth/v1/user",{headers:{"apikey":anonKey,"Authorization":"Bearer "+session.access_token}});
        const data = await response.json();
        if(!response.ok) throw new Error("Your session has expired. Please sign in again.");
        const app = data.app_metadata ?? {};
        if(app.role!=="owner" && app.is_owner!==true && app.superuser!==true){
          localStorage.removeItem("ekhaya_session");
          window.location.replace("/admin/login/");
          return;
        }
        if(active){setUser(data);setStatus("");}
      }catch(error){
        localStorage.removeItem("ekhaya_session");
        if(active)setStatus(error instanceof Error?error.message:"Unable to verify administrator access.");
      }
    }
    void verify();
    return ()=>{active=false;};
  },[]);

  function signOut(){localStorage.removeItem("ekhaya_session");window.location.href="/admin/login/";}

  const cards = [
    {title:"User management",description:"View seller accounts, manage marketplace permissions and issue temporary passwords.",href:"/owner/users/",icon:"♙"},
    {title:"Cache controls",description:"Review and manage shared marketplace price-cache behaviour.",href:"/owner/cache/",icon:"◷"},
    {title:"Price Checker",description:"Open the seller-facing marketplace price comparison workspace.",href:"/price-checker/",icon:"⌕"},
    {title:"Plans & pricing",description:"Review the subscription tiers and search allowances.",href:"/pricing/",icon:"R"}
  ];

  return <main style={{minHeight:"100vh",background:"#F4F8FC",color:"#071B31",fontFamily:"Arial,sans-serif",padding:"24px 5%"}}>
    <header style={{maxWidth:1120,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #DCE8F1",paddingBottom:18}}>
      <Link href="/"><Image src="/ekhaya-technologies-logo.svg" alt="Ekhaya Technologies" width={190} height={110} style={{width:165,height:"auto"}}/></Link>
      <div style={{display:"flex",alignItems:"center",gap:18}}><span style={{fontSize:13,color:"#60758A"}}>{user?.email}</span><button onClick={signOut} style={{border:"1px solid #DCE8F1",background:"#fff",borderRadius:8,padding:"10px 14px",fontWeight:700,color:"#071B31"}}>Sign out</button></div>
    </header>
    <section style={{maxWidth:1120,margin:"54px auto 28px"}}>
      <p style={{fontSize:12,fontWeight:800,letterSpacing:3,color:"#079BD3"}}>OWNER CONTROL CENTRE</p>
      <h1 style={{fontSize:clampTitle,margin:"8px 0 10px"}}>Administrator dashboard</h1>
      <p style={{color:"#60758A",fontSize:17,lineHeight:1.6}}>Manage Ekhaya Price Checker, seller access and marketplace operations from one place.</p>
    </section>
    {!user ? <section style={{maxWidth:1120,margin:"24px auto",padding:18,background:"#fff",borderRadius:12,color:"#60758A"}}>{status}</section> :
      <section style={{maxWidth:1120,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(235px,1fr))",gap:18}}>
        {cards.map(card=><Link key={card.href} href={card.href} style={{textDecoration:"none",color:"#071B31",background:"#fff",border:"1px solid #DCE8F1",borderRadius:14,padding:24,minHeight:160,boxShadow:"0 8px 24px #071b3108"}}>
          <div style={{fontSize:25,color:"#079BD3",fontWeight:800}}>{card.icon}</div><h2 style={{fontSize:19,margin:"18px 0 8px"}}>{card.title} →</h2><p style={{fontSize:14,lineHeight:1.6,color:"#60758A",margin:0}}>{card.description}</p>
        </Link>)}
      </section>}
  </main>;
}
const clampTitle = "clamp(30px,5vw,46px)";

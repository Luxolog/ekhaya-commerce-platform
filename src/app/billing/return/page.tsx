"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BillingReturnPage() {
  const [reference, setReference] = useState("");
  useEffect(() => { setReference(new URLSearchParams(window.location.search).get("reference") ?? ""); }, []);

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#F4F8FC",color:"#071B31",fontFamily:"Arial,sans-serif"}}>
      <section style={{width:"100%",maxWidth:560,background:"#fff",border:"1px solid #DCE8F1",borderRadius:16,padding:32,boxShadow:"0 8px 30px #071b3108"}}>
        <p style={{color:"#079BD3",fontSize:11,fontWeight:800,letterSpacing:2}}>EKHAYA PRICE CHECKER</p>
        <h1 style={{fontSize:28,margin:"10px 0"}}>We&apos;re confirming your payment</h1>
        <p style={{color:"#60758A",fontSize:15,lineHeight:1.7}}>
          Thank you. Paystack has returned you to Ekhaya. Your subscription and search credits are activated only after our server verifies the payment directly with Paystack.
        </p>
        {reference && <p style={{fontSize:12,color:"#60758A",overflowWrap:"anywhere"}}>Payment reference: <strong>{reference}</strong></p>}
        <p style={{color:"#60758A",fontSize:13,lineHeight:1.7}}>If your plan does not update immediately, allow a short time for payment confirmation and then check your seller dashboard. Do not make another payment while this one is being confirmed.</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:24}}>
          <Link href="/" style={{padding:"12px 18px",background:"#079BD3",color:"#fff",borderRadius:8,textDecoration:"none",fontWeight:800,fontSize:13}}>GO TO SELLER DASHBOARD</Link>
          <Link href="/pricing/" style={{padding:"12px 18px",border:"1px solid #DCE8F1",color:"#071B31",borderRadius:8,textDecoration:"none",fontWeight:700,fontSize:13}}>VIEW PLANS</Link>
        </div>
      </section>
    </main>
  );
}

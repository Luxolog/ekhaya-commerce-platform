import SiteHeader from "@/components/SiteHeader";

export default function PricingPage() {
  return <main style={{minHeight:"100vh",background:"#F4F8FC",color:"#071B31",padding:"28px clamp(20px,6vw,88px) 70px"}}>
    <SiteHeader active="pricing" />
    <section style={{maxWidth:1000,margin:"68px auto 0"}}>
      <p style={{color:"#079BD3",fontSize:11,fontWeight:800,letterSpacing:2}}>EKHAYA TECHNOLOGIES</p>
      <h1 style={{fontFamily:"Manrope,sans-serif",fontSize:"clamp(38px,6vw,64px)",letterSpacing:"-.05em",lineHeight:1.08,margin:"14px 0"}}>Plans & pricing</h1>
      <p style={{color:"#60758A",fontSize:17,lineHeight:1.8,maxWidth:760}}>Every business has different requirements. We scope projects around the features, integrations and support you actually need, then provide a clear quotation before work begins.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,260px),1fr))",gap:18,marginTop:34}}>
        {[["Project development","A defined once-off project fee based on agreed scope, milestones and deliverables."],["Monthly hosting & support","Recurring fees where hosting, maintenance or ongoing support are required."],["Custom business solutions","A tailored quotation for larger applications, integrations and business intelligence work."]].map(([title,detail])=><article key={title} style={{background:"#fff",border:"1px solid #DCE8F1",borderRadius:16,padding:26}}><h2 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"0 0 10px"}}>{title}</h2><p style={{color:"#60758A",fontSize:14,lineHeight:1.75,margin:0}}>{detail}</p></article>)}
      </div>
      <div style={{marginTop:26,background:"#071B31",color:"#fff",padding:28,borderRadius:16}}><h2 style={{fontFamily:"Manrope,sans-serif",fontSize:26,margin:"0 0 8px"}}>Request a quotation</h2><p style={{color:"#C5D7E5",fontSize:14,lineHeight:1.7}}>Tell us about your project and we’ll come back with a practical scope and pricing proposal.</p><a href="mailto:support@ekhayatech.co.za?subject=Pricing%20Enquiry" style={{display:"inline-block",marginTop:8,padding:"13px 18px",borderRadius:8,background:"#079BD3",color:"#fff",fontSize:12,fontWeight:800}}>CONTACT EKHAYA →</a></div>
    </section>
  </main>;
}

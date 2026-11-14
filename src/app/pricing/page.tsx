import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";

const checkerPlans = [
  {name:"Starter",price:"R99",searches:"50 product comparisons / month",description:"For sellers getting started with regular product research."},
  {name:"Growth",price:"R149",searches:"100 product comparisons / month",description:"For active sellers comparing more products as their catalogue grows.",featured:true},
  {name:"Pro",price:"R199",searches:"150–250 product comparisons / month",description:"For high-volume sellers who need a larger monthly comparison allowance."},
];

const card = {background:"#fff",border:"1px solid #DCE8F1",borderRadius:16,padding:26};
const muted = {color:"#60758A",fontSize:14,lineHeight:1.75};

export default function PricingPage() {
  return <main style={{minHeight:"100vh",background:"#F4F8FC",color:"#071B31",padding:"28px clamp(20px,6vw,88px) 70px"}}>
    <SiteHeader active="pricing" />
    <section style={{maxWidth:1120,margin:"64px auto 0"}}>
      <p style={{color:"#079BD3",fontSize:11,fontWeight:800,letterSpacing:2}}>CLEAR PRICING · NO HIDDEN ALLOWANCES</p>
      <h1 style={{fontFamily:"Manrope,sans-serif",fontSize:"clamp(38px,6vw,64px)",letterSpacing:"-.05em",lineHeight:1.08,margin:"14px 0"}}>Plans & pricing</h1>
      <p style={{...muted,fontSize:17,maxWidth:780}}>Explore Ekhaya Technologies services and the separate subscription plans for Ekhaya Price Checker. Price Checker allowances are per seller account and reset monthly.</p>
    </section>

    <section id="price-checker-plans" style={{maxWidth:1120,margin:"54px auto 0",scrollMarginTop:24}}>
      <p style={{color:"#079BD3",fontSize:11,fontWeight:800,letterSpacing:2}}>EKHAYA PRICE CHECKER</p>
      <h2 style={{fontFamily:"Manrope,sans-serif",fontSize:"clamp(30px,4vw,44px)",letterSpacing:"-.04em",margin:"10px 0"}}>Price Checker plans & pricing</h2>
      <p style={{...muted,fontSize:15,maxWidth:800}}>Choose a monthly search allowance that suits your business. Each successful product comparison uses one search from that seller’s own allowance. Failed searches do not use a search credit. Takealot is the first live marketplace; other marketplace connections will be enabled when ready.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:18,marginTop:28}}>
        {checkerPlans.map(plan=><article key={plan.name} style={{...card,border:plan.featured?"2px solid #079BD3":"1px solid #DCE8F1",position:"relative"}}>
          {plan.featured&&<span style={{display:"inline-block",fontSize:10,fontWeight:800,letterSpacing:1,color:"#079BD3",marginBottom:8}}>POPULAR PLAN</span>}
          <h3 style={{fontFamily:"Manrope,sans-serif",fontSize:23,margin:"0 0 8px"}}>{plan.name}</h3>
          <p style={{margin:"0 0 4px"}}><strong style={{fontFamily:"Manrope,sans-serif",fontSize:36}}>{plan.price}</strong><span style={{color:"#60758A",fontSize:13}}>/ month</span></p>
          <p style={{color:"#079BD3",fontSize:14,fontWeight:800,margin:"8px 0 12px"}}>{plan.searches}</p>
          <p style={{...muted,margin:0}}>{plan.description}</p>
        </article>)}
        <article style={{...card,background:"#071B31",color:"#fff",borderColor:"#071B31"}}>
          <h3 style={{fontFamily:"Manrope,sans-serif",fontSize:23,margin:"0 0 8px"}}>Custom</h3>
          <p style={{fontFamily:"Manrope,sans-serif",fontSize:29,fontWeight:800,margin:"10px 0"}}>Let's talk</p>
          <p style={{color:"#C5D7E5",fontSize:14,lineHeight:1.75}}>Need a tailored allowance or business arrangement? Contact Ekhaya Technologies to discuss a custom plan.</p>
          <a href="mailto:support@ekhayatech.co.za?subject=Ekhaya%20Price%20Checker%20Custom%20Plan" style={{display:"inline-block",marginTop:12,color:"#fff",fontWeight:800,fontSize:12}}>REQUEST A CUSTOM PLAN →</a>
        </article>
      </div>
      <p style={{...muted,fontSize:12,marginTop:14}}>New accounts may receive 5 welcome searches once per account. Search allowances apply per seller account and are not shared between sellers.</p>
      <Link href="/account/" style={{display:"inline-block",marginTop:8,padding:"13px 19px",background:"#079BD3",color:"#fff",borderRadius:8,textDecoration:"none",fontWeight:800,fontSize:12}}>CREATE SELLER ACCOUNT →</Link>
    </section>

    <section style={{maxWidth:1120,margin:"68px auto 0"}}>
      <p style={{color:"#079BD3",fontSize:11,fontWeight:800,letterSpacing:2}}>EKHAYA TECHNOLOGIES SERVICES</p>
      <h2 style={{fontFamily:"Manrope,sans-serif",fontSize:"clamp(30px,4vw,44px)",letterSpacing:"-.04em",margin:"10px 0"}}>Business solutions & pricing</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:18,marginTop:24}}>
        <article style={card}><h3 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"0 0 8px"}}>Online store</h3><p style={{margin:"0 0 6px"}}><strong style={{fontSize:32}}>R99</strong><span style={{color:"#60758A",fontSize:13}}>/ month</span></p><p style={{...muted,margin:0}}>Online store service. Hosting and domain are excluded and must be arranged and paid for separately.</p></article>
        <article style={card}><h3 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"0 0 8px"}}>Web hosting + 2 business emails</h3><p style={{margin:"0 0 6px"}}><strong style={{fontSize:32}}>R99</strong><span style={{color:"#60758A",fontSize:13}}>/ month</span></p><p style={{...muted,margin:0}}>Website hosting with two business email accounts included.</p></article>
        <article style={card}><h3 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"0 0 8px"}}>Custom business applications</h3><p style={{...muted,margin:0}}>Quoted according to agreed features, integrations, scope and delivery milestones.</p></article>
        <article style={card}><h3 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"0 0 8px"}}>Business systems & integrations</h3><p style={{...muted,margin:0}}>Pricing depends on the workflows, systems and support required.</p></article>
        <article style={card}><h3 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"0 0 8px"}}>Business intelligence & analytics</h3><p style={{...muted,margin:0}}>Scoped quotations for reporting, dashboards and data tools.</p></article>
      </div>
      <div style={{marginTop:26,background:"#071B31",color:"#fff",padding:28,borderRadius:16}}>
        <h2 style={{fontFamily:"Manrope,sans-serif",fontSize:26,margin:"0 0 8px"}}>Need a tailored solution?</h2>
        <p style={{color:"#C5D7E5",fontSize:14,lineHeight:1.7}}>Tell us what your business needs. We will discuss the scope and provide a clear quotation before work begins.</p>
        <a href="mailto:support@ekhayatech.co.za?subject=Ekhaya%20Technologies%20Enquiry" style={{display:"inline-block",marginTop:8,padding:"13px 18px",borderRadius:8,background:"#079BD3",color:"#fff",fontSize:12,fontWeight:800,textDecoration:"none"}}>CONTACT EKHAYA →</a>
      </div>
    </section>
  </main>;
}

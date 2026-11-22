import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";

const checkerPlans = [
  {name:"Beginner",price:"R49",searches:"25 searches / month",description:"For new sellers starting product research.",features:["Search by product name or barcode","Marketplace listing comparisons","Estimated marketplace fees and potential profit","Photograph search not included"]},
  {name:"Starter",price:"R99",searches:"50 searches / month",description:"For individual sellers researching products regularly.",features:["Everything in Beginner","Photograph-based product search","More monthly product comparisons"]},
  {name:"Growth",price:"R149",searches:"100 searches / month",description:"For growing sellers researching a wider catalogue.",features:["Everything in Starter","Photograph-based product search","Double the Starter monthly allowance"],featured:true},
  {name:"Pro",price:"R199",searches:"250 searches / month",description:"For established sellers with higher research needs.",features:["Everything in Growth","Photograph-based product search","Highest standard monthly allowance"]},
];

const card = {background:"#fff",border:"1px solid #DCE8F1",borderRadius:16,padding:26};
const muted = {color:"#60758A",fontSize:14,lineHeight:1.75};

export default function PricingPage() {
  return <main style={{minHeight:"100vh",background:"#F4F8FC",color:"#071B31",padding:"28px clamp(20px,6vw,88px) 70px"}}>
    <SiteHeader active="pricing" />
    <section style={{maxWidth:1120,margin:"64px auto 0"}}>
      <p style={{color:"#079BD3",fontSize:11,fontWeight:800,letterSpacing:2}}>CLEAR PRICING · NO HIDDEN ALLOWANCES</p>
      <h1 style={{fontFamily:"Manrope,sans-serif",fontSize:"clamp(38px,6vw,64px)",letterSpacing:"-.05em",lineHeight:1.08,margin:"14px 0"}}>Plans & pricing</h1>
      <p style={{...muted,fontSize:17,maxWidth:780}}>Explore Ekhaya Technologies services and the separate subscription plans for Ekhaya Price Checker. Price Checker allowances apply per seller account and reset monthly.</p>
    </section>
    <section id="price-checker-plans" style={{maxWidth:1120,margin:"54px auto 0",scrollMarginTop:24}}>
      <p style={{color:"#079BD3",fontSize:11,fontWeight:800,letterSpacing:2}}>EKHAYA PRICE CHECKER</p>
      <h2 style={{fontFamily:"Manrope,sans-serif",fontSize:"clamp(30px,4vw,44px)",letterSpacing:"-.04em",margin:"10px 0"}}>Price Checker plans & pricing</h2>
      <p style={{...muted,fontSize:15,maxWidth:800}}>Choose a monthly search allowance that suits your business. Each successful product search uses one search from your allowance, including searches served from our shared cache. Searches with no product results do not use a search. Photograph search is available on Starter, Growth and Pro, but not Beginner. Takealot is the first live marketplace; other marketplace connections will be enabled when ready.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,230px),1fr))",gap:18,marginTop:28}}>
        {checkerPlans.map(plan=><article key={plan.name} style={{...card,border:plan.featured?"2px solid #079BD3":"1px solid #DCE8F1",position:"relative"}}>
          {plan.featured&&<span style={{display:"inline-block",fontSize:10,fontWeight:800,letterSpacing:1,color:"#079BD3",marginBottom:8}}>POPULAR PLAN</span>}
          <h3 style={{fontFamily:"Manrope,sans-serif",fontSize:23,margin:"0 0 8px"}}>{plan.name}</h3>
          <p style={{margin:"0 0 4px"}}><strong style={{fontFamily:"Manrope,sans-serif",fontSize:36}}>{plan.price}</strong><span style={{color:"#60758A",fontSize:13}}>/ month</span></p>
          <p style={{color:"#079BD3",fontSize:14,fontWeight:800,margin:"8px 0 12px"}}>{plan.searches}</p>
          <p style={{...muted,margin:"0 0 14px"}}>{plan.description}</p>
          <ul style={{...muted,paddingLeft:19,margin:0}}>{plan.features.map(feature=><li key={feature} style={{marginBottom:7}}>{feature}</li>)}</ul>
        </article>)}
      </div>
      <section aria-labelledby="custom-plan-title" style={{marginTop:22,padding:"clamp(26px,4vw,42px)",borderRadius:18,background:"linear-gradient(125deg,#071B31 0%,#123B59 100%)",color:"#fff",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,300px),1fr))",gap:28,alignItems:"center",boxShadow:"0 16px 38px #071B3118"}}>
        <div>
          <p style={{color:"#78D5F5",fontSize:10,fontWeight:800,letterSpacing:2,margin:"0 0 10px"}}>BUILT AROUND YOUR OPERATION</p>
          <h3 id="custom-plan-title" style={{fontFamily:"Manrope,sans-serif",fontSize:"clamp(23px,3vw,32px)",lineHeight:1.2,letterSpacing:"-.03em",margin:"0 0 12px",color:"#fff"}}>Need more room to research and grow?</h3>
          <p style={{color:"#D3E1EC",fontSize:14,lineHeight:1.8,maxWidth:650,margin:"0 0 18px"}}>If your team needs a higher monthly search allowance or a tailored Price Checker arrangement, speak to Ekhaya. We’ll understand your workflow first and recommend a suitable option before any agreement is made.</p>
          <a href="mailto:support@ekhayatech.co.za?subject=Ekhaya%20Price%20Checker%20Custom%20Plan&body=Hello%20Ekhaya%20Technologies%2C%0A%0AI%27d%20like%20to%20discuss%20a%20custom%20Price%20Checker%20plan.%0A%0ABusiness%20name%3A%0AEstimated%20monthly%20searches%3A%0ANumber%20of%20team%20members%3A%0AAdditional%20requirements%3A%0A%0AThank%20you." style={{display:"inline-flex",alignItems:"center",gap:10,padding:"13px 18px",borderRadius:9,background:"#079BD3",color:"#fff",fontSize:13,fontWeight:800,textDecoration:"none"}}>DISCUSS A CUSTOM PLAN <span aria-hidden="true">→</span></a>
        </div>
        <div style={{background:"#FFFFFF10",border:"1px solid #FFFFFF2B",borderRadius:14,padding:20}}>
          <h4 style={{fontSize:14,margin:"0 0 14px",color:"#fff"}}>A conversation about your needs</h4>
          {["Higher monthly search volumes","Product and photograph search requirements","Business-specific arrangements by agreement"].map((item,index)=><div key={item} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"11px 0",borderTop:index===0?"0":"1px solid #FFFFFF24",color:"#E1ECF4",fontSize:12,lineHeight:1.6}}><span style={{color:"#78D5F5",fontWeight:900}}>✓</span><span>{item}</span></div>)}
          <p style={{color:"#AFC5D6",fontSize:11,lineHeight:1.6,margin:"12px 0 0"}}>No commitment. We’ll confirm scope and pricing with you before proceeding.</p>
        </div>
      </section>
      <p style={{...muted,fontSize:12,marginTop:14}}>New accounts receive 5 welcome searches once per account. Monthly plan allowances reset each billing month. When your searches are used, you must upgrade to continue; search top-ups are not available. Search allowances apply per seller account and are not shared between sellers.</p>
      <p role="note" style={{...muted,fontSize:13,marginTop:18,padding:16,background:"#FFF7E6",border:"1px solid #F2D9A6",borderRadius:10}}>
        Paid-plan online checkout is not enabled yet. Contact Ekhaya Technologies to request paid-plan activation. Do not send payment details by email or use unofficial payment links.
      </p>
      <p style={{...muted,fontSize:12,marginTop:8}}>For plan enquiries, use Ekhaya Technologies&apos; official published contact details.</p>
      <Link href="/account/" style={{display:"inline-block",marginTop:8,padding:"13px 19px",background:"#079BD3",color:"#fff",borderRadius:8,textDecoration:"none",fontWeight:800,fontSize:12}}>CREATE SELLER ACCOUNT →</Link>
    </section>
    <section style={{maxWidth:1120,margin:"68px auto 0"}}>
      <p style={{color:"#079BD3",fontSize:11,fontWeight:800,letterSpacing:2}}>EKHAYA TECHNOLOGIES SERVICES</p>
      <h2 style={{fontFamily:"Manrope,sans-serif",fontSize:"clamp(30px,4vw,44px)",letterSpacing:"-.04em",margin:"10px 0"}}>Business solutions & pricing</h2>
      <p style={{...muted,fontSize:15,maxWidth:800}}>These are separate Ekhaya Technologies services, not Price Checker subscription tiers. Each service has its own scope and inclusions.</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:18,marginTop:24}}>
        <article style={card}><h3 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"0 0 8px"}}>Online store</h3><p style={{margin:"0 0 6px"}}><strong style={{fontSize:32}}>R99</strong><span style={{color:"#60758A",fontSize:13}}>/ month</span></p><p style={{...muted,margin:"0 0 10px"}}>Store service subscription. Hosting and domain are excluded and arranged separately.</p><ul style={muted}><li>Product catalogue and category setup</li><li>Shopping cart and checkout configuration</li><li>Payment and delivery integration scope</li><li>Store maintenance within the agreed plan</li></ul></article>
        <article style={card}><h3 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"0 0 8px"}}>Web hosting + 2 business emails</h3><p style={{margin:"0 0 6px"}}><strong style={{fontSize:32}}>R99</strong><span style={{color:"#60758A",fontSize:13}}>/ month</span></p><p style={{...muted,margin:"0 0 10px"}}>Website hosting with two business email accounts included.</p><ul style={muted}><li>Website hosting allocation</li><li>Two business email mailboxes</li><li>Domain connection support</li><li>Basic hosting support and maintenance</li></ul></article>
        <article style={card}><h3 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"0 0 8px"}}>Custom business applications</h3><p style={{...muted,margin:"0 0 10px"}}>Custom quotation after requirements review.</p><ul style={muted}><li>Discovery and requirements definition</li><li>Role-based workflows and dashboards</li><li>Database and authentication design</li><li>Third-party API and payment integrations</li><li>Testing, handover and support options</li></ul></article>
        <article style={card}><h3 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"0 0 8px"}}>Business systems, integrations & intelligence</h3><p style={{...muted,margin:"0 0 10px"}}>Custom project quotation based on your integration, automation and reporting requirements.</p><ul style={muted}><li>Connect existing business tools and synchronise approved data</li><li>Automate repeatable workflows and monitor integrations</li><li>Business performance dashboards and operational reporting</li><li>Data consolidation, visualisation and decision-support insights</li><li>Reporting exports and ongoing support options</li></ul></article>
      </div>
      <div style={{marginTop:26,background:"#071B31",color:"#fff",padding:"38px clamp(24px,3vw,42px)",borderRadius:22,display:"flex",alignItems:"flex-start",justifyContent:"flex-start",minHeight:220}}>
        <div style={{maxWidth:760,display:"flex",flexDirection:"column",alignItems:"flex-start"}}>
          <h2 style={{fontFamily:"Manrope,sans-serif",fontSize:26,margin:"0 0 12px"}}>Need a tailored solution?</h2>
          <p style={{color:"#C5D7E5",fontSize:14,lineHeight:1.7,margin:"0 0 18px"}}>Tell us what your business needs. We will discuss the scope and provide a clear quotation before work begins.</p>
          <a href="mailto:support@ekhayatech.co.za?subject=Ekhaya%20Technologies%20Enquiry" style={{display:"inline-block",marginTop:0,padding:"16px 24px",borderRadius:10,background:"#079BD3",color:"#fff",fontSize:13,fontWeight:800,textDecoration:"none"}}>CONTACT EKHAYA →</a>
        </div>
      </div>
    </section>
    <SiteFooter />
  </main>;
}

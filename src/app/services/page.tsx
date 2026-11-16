import SiteHeader from "@/components/SiteHeader";

const services = [
  ["💻", "Custom Business Applications", "Purpose-built web and mobile applications designed around the way your business works."],
  ["📊", "Business Intelligence & Analytics", "Useful reporting, data visibility and insights to support better business decisions."],
  ["🛒", "E-commerce & Marketplaces", "Online stores, marketplace platforms and product sourcing tools."],
  ["🧩", "Business Systems & Integrations", "Connected tools and workflows that reduce repetitive work and keep information organised."],
  ["🛠️", "Ongoing Support & Maintenance", "Practical technical support, improvements and maintenance as your business grows."],
];

export default function ServicesPage() {
  return <main style={{ minHeight:"100vh", padding:"24px clamp(20px,6vw,88px) 64px", color:"#071B31", background:"#F4F8FC" }}>
    <SiteHeader active="services" />
    <section style={{ maxWidth:1050, margin:"68px auto 42px" }}>
      <p style={{ color:"#079BD3", fontSize:12, letterSpacing:".18em", fontWeight:800 }}>EKHAYA TECHNOLOGIES · DIGITAL SOLUTIONS. BUILT AROUND YOU.</p>
      <h1 style={{ fontFamily:"Manrope,sans-serif", fontSize:"clamp(42px,6.5vw,76px)", lineHeight:1.06, letterSpacing:"-.055em", margin:"18px 0" }}>Technology built around <span style={{color:"#079BD3"}}>your business.</span></h1>
      <p style={{ color:"#60758A", fontSize:"clamp(16px,2vw,19px)", lineHeight:1.8, maxWidth:780 }}>We develop custom applications, business systems and digital tools that help businesses work smarter, serve customers and create new opportunities.</p>
    </section>
    <section style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))", gap:18 }}>
      {services.map(([icon,title,description])=><article key={title} style={{background:"#fff",border:"1px solid #DCE8F1",borderRadius:16,padding:26,boxShadow:"0 10px 30px rgba(7,27,49,.04)"}}>
        <div style={{fontSize:32}}>{icon}</div><h2 style={{fontFamily:"Manrope,sans-serif",fontSize:21,margin:"16px 0 8px"}}>{title}</h2><p style={{color:"#60758A",fontSize:14,lineHeight:1.75,margin:0}}>{description}</p>
      </article>)}
    </section>
    <section style={{maxWidth:1200,margin:"56px auto 0",background:"#071B31",color:"#fff",borderRadius:18,padding:"clamp(26px,5vw,48px)"}}>
      <p style={{color:"#00A9E8",fontSize:11,letterSpacing:".16em",fontWeight:800}}>LET'S BUILD SOMETHING USEFUL</p><h2 style={{fontFamily:"Manrope,sans-serif",fontSize:"clamp(28px,4vw,42px)",margin:"10px 0"}}>Tell us what your business needs.</h2><p style={{color:"#C5D7E5",fontSize:15,lineHeight:1.75,maxWidth:720}}>Share the challenge you want to solve and we can discuss a practical solution and scope.</p><a href="mailto:support@ekhayatech.co.za?subject=Ekhaya%20Technologies%20Enquiry" style={{display:"inline-block",marginTop:10,padding:"13px 19px",background:"#079BD3",color:"#fff",borderRadius:8,fontWeight:800,fontSize:12}}>MAKE AN ENQUIRY →</a>
    </section>
    <footer style={{maxWidth:1200,margin:"48px auto 0",paddingTop:18,borderTop:"1px solid #DCE8F1",color:"#60758A",fontSize:12}}>© {new Date().getFullYear()} Ekhaya Technologies</footer>
  </main>;
}

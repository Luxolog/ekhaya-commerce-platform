export default function PrivacyPage() {
  return <main style={{maxWidth:820,margin:"40px auto",padding:"0 22px",fontFamily:"Arial,sans-serif",lineHeight:1.7,color:"#14283D"}}>
    <a href="/account/">← Seller account</a>
    <h1>Ekhaya Technologies Privacy Notice</h1>
    <p>Version 1.0 · 16 November 2026</p>
    <p style={{padding:14,background:"#fff7df",border:"1px solid #e8c86c",borderRadius:8}}><strong>Implementation notice:</strong> Before public launch, confirm the legal entity responsible for this service, the Information Officer contact, retention periods, all marketplace/API providers and any cross-border processing. This notice is an operational draft, not a legal certification.</p>
    <h2>1. Who is responsible?</h2>
    <p>Ekhaya Technologies operates the seller account and price-checking service. The legal entity name and verified privacy contact must be published here before live collection. Where the platform processes information for a marketplace, seller or other client on that client's instructions, the client may be the responsible party and Ekhaya may act as its operator.</p>
    <h2>2. Information collected</h2>
    <p>The account flow may collect your name, email address, account credentials and account/session identifiers. Product searches may also process the search terms and technical information needed to provide the service. Do not submit marketplace passwords, payment card details or unrelated sensitive personal information.</p>
    <h2>3. Purposes and lawful basis</h2>
    <p>Information is used to create and secure your account, authenticate you, administer service allowances, provide requested product searches, support the service, prevent abuse and meet legal obligations. The responsible party must document the lawful basis for each purpose. Acknowledging this notice confirms that you have been informed; it is not blanket consent for unrelated processing.</p>
    <h2>4. Optional marketing</h2>
    <p>Marketing is optional and separate from account registration. Leaving the marketing choice unticked does not prevent account creation. You may withdraw a marketing preference at any time.</p>
    <h2>5. Providers and transfers</h2>
    <p>The current account implementation uses Supabase authentication and stores a session in the browser. Before production, document all database, hosting, analytics, marketplace and support providers, their security safeguards, access permissions, processing locations and any cross-border transfers. Put appropriate operator agreements and transfer safeguards in place.</p>
    <h2>6. Security and retention</h2>
    <p>We must apply access controls, encryption where appropriate, secure credential handling, vulnerability management and breach response procedures. Account and service data must be retained only for a documented period necessary for the stated purposes or legal obligations, then securely deleted or de-identified.</p>
    <h2>7. Your rights</h2>
    <p>Subject to POPIA, you may request access to or correction of your personal information, object to certain processing, withdraw consent where consent is the basis, and request deletion where legally permitted. The verified privacy request contact must be published here before launch. You may complain to the <a href="https://inforegulator.org.za/">Information Regulator of South Africa</a>.</p>
    <h2>8. Updates</h2>
    <p>This notice will be updated when processing purposes, providers or services change. The current version must remain available from every account and data-collection form.</p>
  </main>;
}
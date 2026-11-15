import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Inbox, Users, MessageSquare, Building2, ArrowUpRight, Clock3, CircleCheck, AlertCircle, Plus, Search, Settings, LayoutDashboard, Radio, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

type OrgMembership = {
  role: string;
  organisation: { id: string; name: string; slug: string; brand_primary: string | null; brand_secondary: string | null } | null;
};

export default async function DashboardPage() {
  const todayLabel = new Intl.DateTimeFormat("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const [{ data: memberships }, { count: tickets }, { count: openTickets }, { count: customers }, { count: conversations }] = await Promise.all([
    supabase.from("sd_organisation_members").select("role, organisation:sd_organisations(id,name,slug,brand_primary,brand_secondary)").eq("user_id", claims.claims.sub).eq("status", "active"),
    supabase.from("sd_tickets").select("*", { count: "exact", head: true }),
    supabase.from("sd_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress", "waiting_on_customer"]),
    supabase.from("sd_customers").select("*", { count: "exact", head: true }),
    supabase.from("sd_conversations").select("*", { count: "exact", head: true }).in("status", ["open", "pending"])
  ]);

  const orgs = (memberships ?? []) as unknown as OrgMembership[];
  const orgNames = orgs.map(m => m.organisation?.name).filter(Boolean);
  const { data: recentTickets } = await supabase.from("sd_tickets").select("id,ticket_number,subject,status,priority,source,created_at,organisation:sd_organisations(name)").order("created_at", { ascending: false }).limit(6);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup"><span className="brand-mark small">E</span><span><b>EKHAYA</b><small>SUPPORT DESK</small></span></Link>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switch"><Building2 size={17}/><span>{orgNames[0] ?? "Your workspace"}</span><span className="chevron">⌄</span></div>
        <nav className="nav-list">
          <a className="nav-item active" href="#"><LayoutDashboard size={18}/> Overview</a>
          <Link className="nav-item" href="/tickets"><Inbox size={18}/> Tickets <span className="nav-count">{openTickets ?? 0}</span></Link>
          <a className="nav-item" href="#inbox"><MessageSquare size={18}/> Unified inbox</a>
          <a className="nav-item" href="#customers"><Users size={18}/> Customers</a>
          <a className="nav-item" href="#channels"><Radio size={18}/> Channels</a>
          <a className="nav-item" href="#usage"><CreditCard size={18}/> WhatsApp usage</a>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-item" href="#settings"><Settings size={18}/> Settings</a>
          <div className="profile-row"><div className="avatar">L</div><div><b>{String(claims.claims.email ?? "Workspace admin")}</b><small>Platform administrator</small></div></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="top-actions"><span className="status-dot"/> All systems operational <button className="icon-button" aria-label="Search"><Search size={18}/></button><form action="/auth/signout" method="post"><button className="text-button">Sign out</button></form></div>
        </header>

        <section className="welcome-row">
          <div><p className="eyebrow">{todayLabel}</p><h1>Good day. <span>Welcome back.</span></h1><p className="muted">Here’s what’s happening across your support workspaces.</p></div>
          <Link href="/tickets?new=1" className="primary-button compact"><Plus size={16}/> Create ticket</Link>
        </section>

        <section className="stat-grid">
          <article className="stat-card"><div className="stat-top"><span>Total tickets</span><Inbox size={18}/></div><strong>{tickets ?? 0}</strong><small>Across your workspaces</small></article>
          <article className="stat-card"><div className="stat-top"><span>Open tickets</span><AlertCircle size={18}/></div><strong>{openTickets ?? 0}</strong><small>Awaiting action</small></article>
          <article className="stat-card"><div className="stat-top"><span>Active conversations</span><MessageSquare size={18}/></div><strong>{conversations ?? 0}</strong><small>Across connected channels</small></article>
          <article className="stat-card"><div className="stat-top"><span>Customers</span><Users size={18}/></div><strong>{customers ?? 0}</strong><small>In your customer directory</small></article>
        </section>

        <section className="content-grid">
          <article className="panel ticket-panel" id="tickets">
            <div className="panel-heading"><div><h2>Recent tickets</h2><p>Latest support requests from your teams</p></div><Link href="/tickets">View all <ArrowUpRight size={15}/></Link></div>
            <div className="ticket-table">
              <div className="table-head"><span>Ticket</span><span>Workspace</span><span>Priority</span><span>Status</span></div>
              {(recentTickets ?? []).length === 0 ? <div className="empty-state"><div className="empty-icon"><Inbox size={22}/></div><b>No tickets yet</b><p>New support requests will appear here.</p></div> :
                recentTickets?.map((ticket: any) => <div className="ticket-row" key={ticket.id}><div><b>#{ticket.ticket_number}</b><span>{ticket.subject}</span></div><span>{ticket.organisation?.name ?? "Workspace"}</span><span className={"priority " + ticket.priority}>{ticket.priority}</span><span className={"ticket-status " + ticket.status}>{ticket.status.replaceAll("_", " ")}</span></div>)}
            </div>
          </article>
          <article className="panel workspace-panel">
            <div className="panel-heading"><div><h2>Your workspaces</h2><p>Organisations you administer</p></div><Building2 size={18}/></div>
            <div className="workspace-list">
              {orgs.map((m, index) => m.organisation && <div className="workspace-card" key={m.organisation.id}><div className={"workspace-icon tone-" + index}><Building2 size={19}/></div><div><b>{m.organisation.name}</b><small>{m.role} · Active</small></div><ArrowUpRight size={16}/></div>)}
              {orgs.length === 0 && <div className="empty-mini">No organisation memberships found.</div>}
            </div>
            <div className="workspace-note"><CircleCheck size={16}/> Organisation data is isolated by database security policies.</div>
          </article>
        </section>

        <section className="bottom-grid">
          <article className="panel quick-panel" id="inbox"><div className="panel-heading"><div><h2>Unified inbox</h2><p>Bring every customer conversation together</p></div><MessageSquare size={18}/></div><div className="channel-pills"><span><i className="channel-dot email"/> Email</span><span><i className="channel-dot chat"/> Live chat</span><span><i className="channel-dot meta"/> Meta channels</span></div><p className="muted small-copy">Connect each organisation’s own accounts to start receiving messages in one shared team inbox.</p><a href="#channels" className="inline-link">Configure channels <ArrowUpRight size={14}/></a></article>
          <article className="panel quick-panel" id="usage"><div className="panel-heading"><div><h2>WhatsApp usage monitor</h2><p>Keep messaging costs under control</p></div><CreditCard size={18}/></div><div className="usage-empty"><Clock3 size={19}/><span>Waiting for a WhatsApp Business account connection.</span></div><p className="muted small-copy">Usage records, actual provider costs and monthly spending alerts will appear here.</p></article>
        </section>
        <footer className="footer">Ekhaya Support Desk <span>·</span> Built by Ekhaya Technologies</footer>
      </main>
    </div>
  );
}

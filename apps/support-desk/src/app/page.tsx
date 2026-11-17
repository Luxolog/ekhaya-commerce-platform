import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Inbox, Users, MessageSquare, Building2, ArrowUpRight, Clock3,
  CircleCheck, AlertCircle, Plus, Search, Settings, LayoutDashboard,
  Radio, CreditCard,
} from "lucide-react";

export const dynamic = "force-dynamic";

type OrgMembership = {
  organisation_id: string;
  role: string;
  organisation: {
    id: string;
    name: string;
    slug: string;
    brand_primary: string | null;
    brand_secondary: string | null;
  } | null;
};

type DashboardProps = {
  searchParams: Promise<{ workspace?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const todayLabel = new Intl.DateTimeFormat("en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date()).toUpperCase();

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const [{ data: memberships }, { data: platformAdmin }] = await Promise.all([
    supabase
      .from("sd_organisation_members")
      .select("organisation_id,role,organisation:sd_organisations(id,name,slug,brand_primary,brand_secondary)")
      .eq("user_id", String(userId))
      .eq("status", "active"),
    supabase
      .from("sd_platform_admins")
      .select("user_id")
      .eq("user_id", String(userId))
      .maybeSingle(),
  ]);

  const orgs = (memberships ?? []) as unknown as OrgMembership[];
  const isPlatformAdmin = Boolean(platformAdmin);
  const requestedWorkspace = params.workspace;
  const selectedMembership = requestedWorkspace
    ? orgs.find((membership) => membership.organisation_id === requestedWorkspace)
    : orgs[0];

  // Never trust a workspace ID from the URL by itself. It must match an active
  // membership; platform admins can also inspect a workspace they administer.
  let selectedOrganisation = selectedMembership?.organisation ?? null;
  if (requestedWorkspace && !selectedMembership && isPlatformAdmin) {
    const { data: adminOrganisation } = await supabase
      .from("sd_organisations")
      .select("id,name,slug,brand_primary,brand_secondary")
      .eq("id", requestedWorkspace)
      .maybeSingle();
    selectedOrganisation = adminOrganisation;
  }

  const workspaceId = selectedOrganisation?.id ?? null;
  const workspaceRole = selectedMembership?.role
    ?? (isPlatformAdmin && workspaceId ? "platform admin" : null);
  const scopeLabel = selectedOrganisation?.name ?? "All accessible workspaces";

  let ticketQuery = supabase.from("sd_tickets").select("*", { count: "exact", head: true });
  let openQuery = supabase.from("sd_tickets").select("*", { count: "exact", head: true })
    .in("status", ["open", "in_progress", "waiting_on_customer"]);
  let customerQuery = supabase.from("sd_customers").select("*", { count: "exact", head: true });
  let conversationQuery = supabase.from("sd_conversations").select("*", { count: "exact", head: true })
    .in("status", ["open", "pending"]);
  let recentQuery = supabase.from("sd_tickets")
    .select("id,ticket_number,subject,status,priority,source,created_at,organisation:sd_organisations(name)")
    .order("created_at", { ascending: false })
    .limit(6);

  if (workspaceId) {
    ticketQuery = ticketQuery.eq("organisation_id", workspaceId);
    openQuery = openQuery.eq("organisation_id", workspaceId);
    customerQuery = customerQuery.eq("organisation_id", workspaceId);
    conversationQuery = conversationQuery.eq("organisation_id", workspaceId);
    recentQuery = recentQuery.eq("organisation_id", workspaceId);
  }

  const [
    { count: tickets },
    { count: openTickets },
    { count: customers },
    { count: conversations },
    { data: recentTickets },
  ] = await Promise.all([
    ticketQuery,
    openQuery,
    customerQuery,
    conversationQuery,
    recentQuery,
  ]);

  const workspaceHref = (id?: string) => id ? `/?workspace=${encodeURIComponent(id)}` : "/";
  const roleLabel = workspaceRole
    ? workspaceRole.replaceAll("_", " ")
    : isPlatformAdmin ? "Platform administrator" : "No active workspace role";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark small">E</span>
          <span><b>EKHAYA</b><small>SUPPORT DESK</small></span>
        </Link>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switch">
          <Building2 size={17} />
          <span>{scopeLabel}</span>
        </div>
        <nav className="workspace-options" aria-label="Choose workspace">
          <Link className={!workspaceId ? "workspace-option selected" : "workspace-option"} href={workspaceHref()}>
            All accessible workspaces
          </Link>
          {orgs.map((membership) => membership.organisation && (
            <Link
              className={workspaceId === membership.organisation.id ? "workspace-option selected" : "workspace-option"}
              href={workspaceHref(membership.organisation.id)}
              key={membership.organisation.id}
            >
              {membership.organisation.name}
            </Link>
          ))}
        </nav>

        <nav className="nav-list">
          <Link className="nav-item active" href={workspaceId ? workspaceHref(workspaceId) : "/"}><LayoutDashboard size={18} /> Overview</Link>
          <Link className="nav-item" href="/tickets"><Inbox size={18} /> Tickets <span className="nav-count">{openTickets ?? 0}</span></Link>
          <a className="nav-item" href="#inbox"><MessageSquare size={18} /> Unified inbox</a>
          <a className="nav-item" href="#customers"><Users size={18} /> Customers</a>
          <a className="nav-item" href="#channels"><Radio size={18} /> Channels</a>
          <a className="nav-item" href="#usage"><CreditCard size={18} /> WhatsApp usage</a>
        </nav>

        <div className="sidebar-bottom">
          <a className="nav-item" href="#settings"><Settings size={18} /> Settings</a>
          <div className="profile-row">
            <div className="avatar">{String(claims.claims.email ?? "U").slice(0, 1).toUpperCase()}</div>
            <div>
              <b>{String(claims.claims.email ?? "Signed-in user")}</b>
              <small>{roleLabel}</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">{scopeLabel} <span>/</span> Overview</div>
          <div className="top-actions">
            <span className="status-dot" /> Workspace data protected
            <button className="icon-button" aria-label="Search"><Search size={18} /></button>
            <form action="/auth/signout" method="post"><button className="text-button">Sign out</button></form>
          </div>
        </header>

        <section className="welcome-row">
          <div>
            <p className="eyebrow">{todayLabel}</p>
            <h1>Good day. <span>Welcome back.</span></h1>
            <p className="muted">Here’s what’s happening in {scopeLabel.toLowerCase()}.</p>
          </div>
          <Link href="/tickets?new=1" className="primary-button compact"><Plus size={16} /> Create ticket</Link>
        </section>

        <section className="stat-grid">
          <article className="stat-card"><div className="stat-top"><span>Total tickets</span><Inbox size={18} /></div><strong>{tickets ?? 0}</strong><small>{scopeLabel}</small></article>
          <article className="stat-card"><div className="stat-top"><span>Open tickets</span><AlertCircle size={18} /></div><strong>{openTickets ?? 0}</strong><small>Awaiting action</small></article>
          <article className="stat-card"><div className="stat-top"><span>Active conversations</span><MessageSquare size={18} /></div><strong>{conversations ?? 0}</strong><small>Across connected channels</small></article>
          <article className="stat-card"><div className="stat-top"><span>Customers</span><Users size={18} /></div><strong>{customers ?? 0}</strong><small>In this workspace scope</small></article>
        </section>

        <section className="content-grid">
          <article className="panel ticket-panel" id="tickets">
            <div className="panel-heading">
              <div><h2>Recent tickets</h2><p>Latest support requests in this view</p></div>
              <Link href="/tickets">View all <ArrowUpRight size={15} /></Link>
            </div>
            <div className="ticket-table">
              <div className="table-head"><span>Ticket</span><span>Workspace</span><span>Priority</span><span>Status</span></div>
              {(recentTickets ?? []).length === 0 ? (
                <div className="empty-state"><div className="empty-icon"><Inbox size={22} /></div><b>No tickets yet</b><p>New support requests will appear here.</p></div>
              ) : recentTickets?.map((ticket: any) => (
                <Link className="ticket-row" href={"/tickets?id=" + ticket.id} key={ticket.id}>
                  <div><b>#{ticket.ticket_number}</b><span>{ticket.subject}</span></div>
                  <span>{ticket.organisation?.name ?? "Workspace"}</span>
                  <span className={"priority " + ticket.priority}>{ticket.priority}</span>
                  <span className={"ticket-status " + ticket.status}>{ticket.status.replaceAll("_", " ")}</span>
                </Link>
              ))}
            </div>
          </article>

          <article className="panel workspace-panel">
            <div className="panel-heading"><div><h2>Your workspaces</h2><p>Your active organisation memberships</p></div><Building2 size={18} /></div>
            <div className="workspace-list">
              {orgs.map((membership, index) => membership.organisation && (
                <Link href={workspaceHref(membership.organisation.id)} className="workspace-card" key={membership.organisation.id}>
                  <div className={"workspace-icon tone-" + index}><Building2 size={19} /></div>
                  <div><b>{membership.organisation.name}</b><small>{membership.role} · Active</small></div>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
              {orgs.length === 0 && <div className="empty-mini">No active organisation memberships found.</div>}
            </div>
            <div className="workspace-note"><CircleCheck size={16} /> Workspace access is enforced by database security policies.</div>
          </article>
        </section>

        <section className="bottom-grid">
          <article className="panel quick-panel" id="inbox">
            <div className="panel-heading"><div><h2>Unified inbox</h2><p>Bring every customer conversation together</p></div><MessageSquare size={18} /></div>
            <div className="channel-pills"><span><i className="channel-dot email" /> Email</span><span><i className="channel-dot chat" /> Live chat</span><span><i className="channel-dot meta" /> Meta channels</span></div>
            <p className="muted small-copy">Connect each organisation’s own accounts to start receiving messages in one shared team inbox.</p>
            <a href="#channels" className="inline-link">Configure channels <ArrowUpRight size={14} /></a>
          </article>
          <article className="panel quick-panel" id="usage">
            <div className="panel-heading"><div><h2>WhatsApp usage monitor</h2><p>Keep messaging costs under control</p></div><CreditCard size={18} /></div>
            <div className="usage-empty"><Clock3 size={19} /><span>Waiting for a WhatsApp Business account connection.</span></div>
            <p className="muted small-copy">Usage records, actual provider costs and monthly spending alerts will appear here.</p>
          </article>
        </section>
        <footer className="footer">Ekhaya Support Desk <span>·</span> Built by Ekhaya Technologies</footer>
      </main>
    </div>
  );
}
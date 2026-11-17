import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createTicket,
  addTicketMessage,
  updateTicketStatus,
  assignTicket,
} from "./actions";
import {
  ArrowLeft, Plus, Inbox, MessageSquare, UserRound, Clock3, Users,
} from "lucide-react";

type Membership = {
  organisation_id: string;
  role: string;
  organisation: { name: string } | null;
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; id?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: memberships } = await supabase
    .from("sd_organisation_members")
    .select("organisation_id,role,organisation:sd_organisations(name)")
    .eq("user_id", String(userId))
    .eq("status", "active");

  const orgs = (memberships ?? []) as unknown as Membership[];
  const top = (
    <header className="page-topbar">
      <Link href="/" className="back-link"><ArrowLeft size={16} /> Dashboard</Link>
      <span className="page-brand">EKHAYA <b>SUPPORT DESK</b></span>
    </header>
  );

  if (params.id) {
    const { data: ticket, error } = await supabase
      .from("sd_tickets")
      .select("id,ticket_number,organisation_id,subject,status,priority,source,assigned_to,department_id,created_at,updated_at,customer:sd_customers(full_name,email,phone),organisation:sd_organisations(name)")
      .eq("id", params.id)
      .maybeSingle();

    if (error || !ticket) notFound();

    const [{ data: messages }, { data: currentMembership }] = await Promise.all([
      supabase
        .from("sd_ticket_messages")
        .select("id,body,is_internal_note,created_at,author_customer_id")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("sd_organisation_members")
        .select("role")
        .eq("organisation_id", ticket.organisation_id)
        .eq("user_id", String(userId))
        .eq("status", "active")
        .maybeSingle(),
    ]);

    const role = currentMembership?.role ?? "";
    const canRoute = ["owner", "admin", "supervisor"].includes(role);
    // Agents may work only tickets assigned to them; RLS remains the final enforcement layer.
    const canWorkTicket = canRoute || (role === "agent" && ticket.assigned_to === String(userId));
    const customer = ticket.customer as any;
    const organisation = ticket.organisation as any;

    let agents: { user_id: string; role: string }[] = [];
    let departments: { id: string; name: string }[] = [];
    if (canRoute) {
      const [{ data: roster }, { data: departmentRows }] = await Promise.all([
        supabase
          .from("sd_organisation_members")
          .select("user_id,role")
          .eq("organisation_id", ticket.organisation_id)
          .eq("status", "active")
          .in("role", ["agent", "supervisor"])
          .order("role"),
        supabase
          .from("sd_departments")
          .select("id,name")
          .eq("organisation_id", ticket.organisation_id)
          .order("name"),
      ]);
      agents = roster ?? [];
      departments = departmentRows ?? [];
    }

    return (
      <main className="page-shell">
        {top}
        <section className="detail-heading">
          <div>
            <p className="eyebrow">{organisation?.name ?? "WORKSPACE"} · TICKET #{ticket.ticket_number}</p>
            <h1>{ticket.subject}</h1>
            <p className="muted">Created {new Date(ticket.created_at).toLocaleString("en-ZA")}</p>
          </div>
          {canWorkTicket ? (
            <form action={updateTicketStatus} className="status-update">
              <input type="hidden" name="ticket_id" value={ticket.id} />
              <label>Status</label>
              <select name="status" defaultValue={ticket.status}>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="waiting_on_customer">Waiting on customer</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button className="secondary-button">Update</button>
            </form>
          ) : (
            <p className="muted small-copy">Ticket updates are available to the assigned agent and workspace managers.</p>
          )}
        </section>

        <div className="ticket-detail-grid">
          <section className="panel conversation-panel">
            <div className="panel-title">
              <MessageSquare size={18} />
              <div><b>Ticket conversation</b><small>Messages and internal team notes</small></div>
            </div>
            <div className="message-timeline">
              {(messages ?? []).map((message: any) => (
                <article className={"message-card " + (message.is_internal_note ? "internal" : "")} key={message.id}>
                  <div className="message-meta">
                    <b>{message.is_internal_note ? "Internal note" : message.author_customer_id ? "Customer" : "Support team"}</b>
                    <time>{new Date(message.created_at).toLocaleString("en-ZA")}</time>
                  </div>
                  <p>{message.body}</p>
                </article>
              ))}
            </div>
            {canWorkTicket ? (
              <form action={addTicketMessage} className="reply-form">
                <input type="hidden" name="ticket_id" value={ticket.id} />
                <input type="hidden" name="organisation_id" value={ticket.organisation_id} />
                <label>Reply or note</label>
                <textarea name="body" rows={4} required maxLength={20000} placeholder="Write an update…" />
                <div className="reply-actions">
                  <label className="check-label"><input type="checkbox" name="is_internal_note" /> Internal note only</label>
                  <button className="primary-button">Add message</button>
                </div>
              </form>
            ) : (
              <p className="muted small-copy">You can view this ticket, but only its assigned agent or workspace managers can reply.</p>
            )}
          </section>

          <aside className="panel detail-sidebar">
            <div className="panel-title">
              <UserRound size={18} />
              <div><b>Requester</b><small>Customer information</small></div>
            </div>
            <div className="customer-profile">
              <div className="customer-avatar">{(customer?.full_name ?? "C").slice(0, 1).toUpperCase()}</div>
              <b>{customer?.full_name ?? "Customer"}</b>
              <span>{customer?.email ?? "No email"}</span>
              <span>{customer?.phone ?? "No phone"}</span>
            </div>

            <div className="detail-divider" />
            <div className="panel-title"><Users size={17} /><div><b>Assignment</b><small>Team ownership and routing</small></div></div>
            {canRoute ? (
              <form action={assignTicket} className="assignment-form">
                <input type="hidden" name="ticket_id" value={ticket.id} />
                <input type="hidden" name="organisation_id" value={ticket.organisation_id} />
                <label>Assigned agent
                  <select name="assigned_to" defaultValue={ticket.assigned_to ?? ""}>
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.user_id} value={agent.user_id}>
                        {agent.role} · {agent.user_id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>Department
                  <select name="department_id" defaultValue={ticket.department_id ?? ""}>
                    <option value="">No department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </label>
                {!agents.length && <p className="muted small-copy">No active agents or supervisors are available in this workspace yet.</p>}
                {!departments.length && <p className="muted small-copy">No departments have been created for this workspace yet.</p>}
                <button className="secondary-button">Save assignment</button>
              </form>
            ) : (
              <p className="muted small-copy">Assignment is managed by workspace owners, admins and supervisors.</p>
            )}

            <div className="detail-divider" />
            <div className="detail-fact"><span>Priority</span><i className={"priority-pill " + ticket.priority}>{ticket.priority}</i></div>
            <div className="detail-fact"><span>Source</span><b>{ticket.source}</b></div>
            <div className="detail-fact"><span>Updated</span><b><Clock3 size={13} /> {new Date(ticket.updated_at).toLocaleDateString("en-ZA")}</b></div>
          </aside>
        </div>
      </main>
    );
  }

  if (params.new) {
    return (
      <main className="page-shell">
        {top}
        <section className="page-heading">
          <div><p className="eyebrow">NEW SUPPORT REQUEST</p><h1>Create ticket</h1><p className="muted">Capture the requester and describe the issue.</p></div>
        </section>
        <form action={createTicket} className="ticket-form panel">
          <label>Organisation workspace *
            <select name="organisation_id" required defaultValue={orgs[0]?.organisation_id ?? ""}>
              {orgs.map((membership) => (
                <option key={membership.organisation_id} value={membership.organisation_id}>
                  {membership.organisation?.name ?? "Workspace"}
                </option>
              ))}
            </select>
          </label>
          <label>Subject *<input name="subject" required maxLength={180} /></label>
          <label>Description *<textarea name="description" rows={5} required /></label>
          <div className="form-two-col">
            <label>Priority<select name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
            <label>Requester name *<input name="customer_name" required /></label>
          </div>
          <div className="form-two-col">
            <label>Requester email *<input name="customer_email" type="email" required /></label>
            <label>Phone<input name="customer_phone" type="tel" /></label>
          </div>
          {!orgs.length && <p className="form-warning">No active workspace membership found.</p>}
          <div className="form-actions">
            <Link href="/tickets" className="secondary-button">Cancel</Link>
            <button className="primary-button" disabled={!orgs.length}>Create ticket</button>
          </div>
        </form>
      </main>
    );
  }

  const { data: tickets, error } = await supabase
    .from("sd_tickets")
    .select("id,ticket_number,subject,status,priority,created_at,customer:sd_customers(full_name,email),organisation:sd_organisations(name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const rows = tickets ?? [];

  return (
    <main className="page-shell">
      {top}
      <section className="page-heading">
        <div><p className="eyebrow">WORKSPACE OPERATIONS</p><h1>Tickets</h1><p className="muted">Manage and resolve customer support requests.</p></div>
        <Link href="/tickets?new=1" className="primary-button"><Plus size={16} /> Create ticket</Link>
      </section>
      <section className="panel ticket-list-panel">
        <div className="list-toolbar"><div><h2>All tickets</h2><p>{rows.length} recent requests</p></div></div>
        {!rows.length ? (
          <div className="empty-state"><div className="empty-icon"><Inbox size={22} /></div><b>No tickets yet</b><p>Create the first support request.</p></div>
        ) : (
          <div className="ticket-list">
            <div className="ticket-list-head"><span>Ticket</span><span>Requester</span><span>Workspace</span><span>Priority</span><span>Status</span><span>Created</span></div>
            {rows.map((ticket: any) => (
              <Link className="ticket-list-row" href={"/tickets?id=" + ticket.id} key={ticket.id}>
                <span><b>#{ticket.ticket_number}</b><small>{ticket.subject}</small></span>
                <span>{ticket.customer?.full_name ?? "—"}<small>{ticket.customer?.email ?? ""}</small></span>
                <span>{ticket.organisation?.name ?? "Workspace"}</span>
                <span><i className={"priority-pill " + ticket.priority}>{ticket.priority}</i></span>
                <span><i className={"status-pill " + ticket.status}>{ticket.status.replaceAll("_", " ")}</i></span>
                <span>{new Date(ticket.created_at).toLocaleDateString("en-ZA")}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <p className="page-foot">Ekhaya Technologies · Support operations</p>
    </main>
  );
}
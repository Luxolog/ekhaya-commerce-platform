import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inviteStaffMember, updateStaffRole, removeStaffMember } from "./actions";
import { listAllAuthUsers } from "@/lib/supabase/admin";
import { ArrowLeft, UserPlus, Users } from "lucide-react";

export default async function TeamPage({searchParams}:{searchParams:Promise<{workspace?:string;invited?:string}>}) {
  const params=await searchParams;
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId) redirect("/login");
  const {data:memberships}=await supabase.from("sd_organisation_members")
    .select("organisation_id,role,organisation:sd_organisations(name)")
    .eq("user_id",String(userId)).eq("status","active");
  const eligible=(memberships ?? []).filter((m:any)=>["owner","admin"].includes(m.role));
  const workspace=eligible.find((m:any)=>m.organisation_id===params.workspace) ?? eligible[0];
  if(!workspace) return <main className="page-shell"><header className="page-topbar"><Link href="/">← Dashboard</Link><b>EKHAYA SUPPORT DESK</b></header><section className="page-heading"><div><h1>Team</h1><p className="muted">Only workspace owners and admins can manage team accounts.</p></div></section></main>;
  const orgId=workspace.organisation_id;
  const [{data:subscription},{data:staff},{count:used}] = await Promise.all([
    supabase.from("sd_subscriptions").select("status,included_seats,paid_additional_seats,trial_ends_at")
      .eq("organisation_id",orgId).maybeSingle(),
    supabase.from("sd_organisation_members").select("id,user_id,role,status,created_at")
      .eq("organisation_id",orgId).order("created_at"),
    supabase.from("sd_organisation_members").select("id",{count:"exact",head:true})
      .eq("organisation_id",orgId).in("status",["active","invited"])
  ]);
  const total=(subscription?.included_seats ?? 2)+(subscription?.paid_additional_seats ?? 0);
  const remaining=Math.max(0,total-(used ?? 0));
  const canInvite=["trialing","active"].includes(subscription?.status ?? "") && remaining>0;
  const authUsers=await listAllAuthUsers();
  const emailByUserId=new Map(authUsers.map(user=>[user.id,user.email ?? ""]));
  return <main className="page-shell">
    <header className="page-topbar"><Link href="/" className="back-link"><ArrowLeft size={16}/> Dashboard</Link><span className="page-brand">EKHAYA <b>SUPPORT DESK</b></span></header>
    <section className="page-heading"><div><p className="eyebrow">WORKSPACE ADMINISTRATION · {workspace.organisation?.name}</p><h1>Team members</h1><p className="muted">Invite staff, manage roles and monitor your user-seat allowance.</p></div></section>
    {params.invited==="1" && <div className="success-banner">Invitation sent. The new member will appear as invited until they accept and complete account setup.</div>}
    <section className="team-summary-grid">
      <article className="panel"><span>Seats in use</span><strong>{used ?? 0} / {total}</strong><small>{remaining} available · invited accounts count as seats</small></article>
      <article className="panel"><span>Subscription</span><strong>{subscription?.status ?? "Not configured"}</strong><small>Base monthly fee awaiting confirmation · R75 per additional user</small></article>
      <article className="panel"><span>Departments</span><strong>Unlimited</strong><small>Department assignments do not consume seats</small></article>
    </section>
    <section className="team-layout">
      <article className="panel invite-panel"><div className="panel-title"><UserPlus size={18}/><div><b>Invite a team member</b><small>Each person uses one account seat</small></div></div>
        <form action={inviteStaffMember} className="ticket-form compact-form">
          <input type="hidden" name="organisation_id" value={orgId}/>
          <label>Email address<input type="email" name="email" required maxLength={254} placeholder="colleague@example.com"/></label>
          <label>Role<select name="role" defaultValue="agent"><option value="agent">Agent</option><option value="supervisor">Supervisor</option><option value="admin">Admin</option><option value="viewer">Viewer</option></select></label>
          <p className="muted small-copy">The invitation email is sent through Supabase Auth. The recipient sets their own password.</p>
          <button className="primary-button" disabled={!canInvite}><UserPlus size={15}/> Send invitation</button>
          {!canInvite && <p className="form-warning">No available seats or the trial/subscription is not active. Additional-seat purchasing is not available yet.</p>}
          <p className="muted small-copy">The server requires SUPABASE_SERVICE_ROLE_KEY and SUPPORT_DESK_APP_URL. These must be configured as server-only environment variables before invitations can be sent.</p>
        </form>
      </article>
      <article className="panel"><div className="panel-title"><Users size={18}/><div><b>Workspace roster</b><small>{staff?.length ?? 0} memberships</small></div></div>
        <div className="staff-list">{(staff ?? []).map((person:any)=><div className="staff-row" key={person.id}>
          <div className="staff-avatar">{person.role.slice(0,1).toUpperCase()}</div>
          <div className="staff-identity"><b>{person.role==="owner" ? "Workspace owner" : "Team member"}</b><small>{emailByUserId.get(person.user_id) || person.user_id.slice(0,8)} · {person.status}</small></div>
          {person.role!=="owner" && <><form action={updateStaffRole} className="role-form"><input type="hidden" name="organisation_id" value={orgId}/><input type="hidden" name="membership_id" value={person.id}/><select name="role" defaultValue={person.role}><option value="admin">Admin</option><option value="supervisor">Supervisor</option><option value="agent">Agent</option><option value="viewer">Viewer</option></select><button className="secondary-button">Save</button></form><form action={removeStaffMember}><input type="hidden" name="organisation_id" value={orgId}/><input type="hidden" name="membership_id" value={person.id}/><button className="quiet-button">Remove</button></form></>}
        </div>)}</div>
      </article>
    </section>
    <p className="page-foot">Invitation delivery and password setup are handled by Supabase Auth. Do not expose the service-role key in browser code.</p>
  </main>;
}

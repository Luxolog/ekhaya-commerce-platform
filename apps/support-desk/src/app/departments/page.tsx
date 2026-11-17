import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createDepartment, assignDepartmentMember, removeDepartmentMember } from "./actions";
import { ArrowLeft, Building2, Users, Plus } from "lucide-react";

type Membership = { organisation_id: string; role: string; organisation: { name: string } | null };

export default async function DepartmentsPage({searchParams}:{searchParams:Promise<{workspace?:string}>}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: rows } = await supabase.from("sd_organisation_members")
    .select("organisation_id,role,organisation:sd_organisations(name)")
    .eq("user_id",String(userId)).eq("status","active");
  const memberships = (rows ?? []) as unknown as Membership[];
  const available = memberships.filter(m => ["owner","admin","supervisor"].includes(m.role));
  const selected = available.find(m => m.organisation_id === params.workspace) ?? available[0];
  if (!selected) return <main className="page-shell"><header className="page-topbar"><Link href="/">← Dashboard</Link><b>EKHAYA SUPPORT DESK</b></header><section className="page-heading"><div><p className="eyebrow">TEAM OPERATIONS</p><h1>Departments</h1><p className="muted">You need an owner, admin or supervisor role to manage departments.</p></div></section></main>;

  const orgId = selected.organisation_id;
  const [{data: departments},{data: staff},{data: assignments}] = await Promise.all([
    supabase.from("sd_departments").select("id,name,description,created_at").eq("organisation_id",orgId).order("name"),
    supabase.from("sd_organisation_members").select("id,user_id,role").eq("organisation_id",orgId).eq("status","active").in("role",["agent","supervisor"]).order("role"),
    supabase.from("sd_department_members").select("id,department_id,organisation_member_id").eq("organisation_id",orgId)
  ]);
  return <main className="page-shell">
    <header className="page-topbar"><Link href="/" className="back-link"><ArrowLeft size={16}/> Dashboard</Link><span className="page-brand">EKHAYA <b>SUPPORT DESK</b></span></header>
    <section className="page-heading"><div><p className="eyebrow">TEAM OPERATIONS · {selected.organisation?.name}</p><h1>Departments</h1><p className="muted">Create unlimited departments and assign agents or supervisors to more than one team.</p></div></section>
    <section className="management-grid">
      <article className="panel"><h2>Create a department</h2><p className="muted">Departments do not add to your user-seat bill.</p>
        <form action={createDepartment} className="ticket-form compact-form">
          <input type="hidden" name="organisation_id" value={orgId}/>
          <label>Department name<input name="name" required maxLength={80} placeholder="e.g. Customer Care"/></label>
          <label>Description<textarea name="description" rows={3} maxLength={500} placeholder="What does this team handle?"/></label>
          <button className="primary-button"><Plus size={15}/> Create department</button>
        </form>
      </article>
      <article className="panel"><h2>Team assignments</h2><p className="muted">Active agents and supervisors can belong to multiple departments.</p>
        {(departments ?? []).length === 0 ? <div className="empty-state"><Building2 size={22}/><p>Create your first department to begin assigning staff.</p></div> :
          (departments ?? []).map((department:any)=><div className="department-card" key={department.id}>
            <div className="department-heading"><div><b>{department.name}</b><small>{department.description || "No description"}</small></div><span>{(assignments ?? []).filter((a:any)=>a.department_id===department.id).length} assigned</span></div>
            <form action={assignDepartmentMember} className="inline-assignment">
              <input type="hidden" name="organisation_id" value={orgId}/><input type="hidden" name="department_id" value={department.id}/>
              <select name="organisation_member_id" required defaultValue=""><option value="" disabled>Add agent or supervisor…</option>
                {(staff ?? []).filter((person:any)=>!(assignments ?? []).some((a:any)=>a.department_id===department.id && a.organisation_member_id===person.id)).map((person:any)=><option key={person.id} value={person.id}>{person.role} · {person.user_id.slice(0,8)}</option>)}
              </select><button className="secondary-button">Assign</button>
            </form>
            <div className="assignment-list">{(assignments ?? []).filter((a:any)=>a.department_id===department.id).map((assignment:any)=>{
              const person=(staff ?? []).find((s:any)=>s.id===assignment.organisation_member_id);
              return <div className="assignment-person" key={assignment.id}><span><Users size={14}/> {person ? person.role+" · "+person.user_id.slice(0,8) : "Team member"}</span><form action={removeDepartmentMember}><input type="hidden" name="organisation_id" value={orgId}/><input type="hidden" name="assignment_id" value={assignment.id}/><button className="quiet-button">Remove</button></form></div>;
            })}</div>
          </div>)
        }
      </article>
    </section>
    <p className="page-foot">Department count is unlimited · Staff seats are billed separately</p>
  </main>;
}

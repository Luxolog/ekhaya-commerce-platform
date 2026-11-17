import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Users, Clock3 } from "lucide-react";

export default async function SubscriptionPage({searchParams}:{searchParams:Promise<{workspace?:string}>}) {
  const params=await searchParams;
  const supabase=await createClient();
  const {data:claims}=await supabase.auth.getClaims();
  const userId=claims?.claims?.sub;
  if(!userId) redirect("/login");
  const {data:membershipRows}=await supabase.from("sd_organisation_members")
    .select("organisation_id,role,organisation:sd_organisations(name)")
    .eq("user_id",String(userId)).eq("status","active");
  const memberships=(membershipRows ?? []) as any[];
  const chosen=memberships.find(m=>m.organisation_id===params.workspace) ?? memberships.find(m=>["owner","admin"].includes(m.role));
  if(!chosen || !["owner","admin"].includes(chosen.role)) return <main className="page-shell"><header className="page-topbar"><Link href="/">← Dashboard</Link><b>EKHAYA SUPPORT DESK</b></header><section className="page-heading"><div><h1>Subscription</h1><p className="muted">Subscription details are available to workspace owners and admins.</p></div></section></main>;
  const orgId=chosen.organisation_id;
  const [{data:subscription},{count:seatCount},{data:members}] = await Promise.all([
    supabase.from("sd_subscriptions").select("status,trial_started_at,trial_ends_at,base_monthly_price_cents,included_seats,paid_additional_seats,additional_seat_price_cents,currency,billing_interval").eq("organisation_id",orgId).maybeSingle(),
    supabase.from("sd_organisation_members").select("id",{count:"exact",head:true}).eq("organisation_id",orgId).in("status",["active","invited"]),
    supabase.from("sd_organisation_members").select("id,role,status").eq("organisation_id",orgId).in("status",["active","invited"])
  ]);
  const included=subscription?.included_seats ?? 2;
  const paid=subscription?.paid_additional_seats ?? 0;
  const base=subscription?.base_monthly_price_cents ?? null;
  const extra=subscription?.additional_seat_price_cents ?? 7500;
  const used=seatCount ?? 0;
  const amount=base===null ? null : (base/100)+(paid*extra/100);
  const trialEnd=subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const daysLeft=trialEnd ? Math.max(0,Math.ceil((trialEnd.getTime()-Date.now())/86400000)) : null;
  return <main className="page-shell">
    <header className="page-topbar"><Link href="/" className="back-link"><ArrowLeft size={16}/> Dashboard</Link><span className="page-brand">EKHAYA <b>SUPPORT DESK</b></span></header>
    <section className="page-heading"><div><p className="eyebrow">BILLING · {chosen.organisation?.name}</p><h1>Subscription</h1><p className="muted">Your plan, trial and user-seat allowance.</p></div></section>
    <section className="subscription-grid">
      <article className="panel plan-card"><p className="eyebrow">MONTHLY WORKSPACE PLAN</p><div className="plan-price">{base===null ? "Awaiting confirmation" : `R${(base/100).toFixed(2)}`} {base!==null && <small>/ month</small>}</div><p className="muted">Includes the first {included} user accounts.</p><div className="plan-line"><span>Base monthly fee</span><b>{base===null ? "Awaiting confirmation" : `R${(base/100).toFixed(2)}`}</b></div><div className="plan-line"><span>Additional user</span><b>R{(extra/100).toFixed(2)} / month</b></div><div className="plan-line"><span>Departments</span><b>Unlimited</b></div><div className="plan-line"><span>Billing interval</span><b>Monthly</b></div><div className="plan-line"><span>Currency</span><b>{subscription?.currency ?? "ZAR"}</b></div></article>
      <article className="panel"><div className="panel-title"><Users size={18}/><div><b>Seat usage</b><small>Active and invited accounts count</small></div></div><div className="seat-number">{used}<small> / {included+paid} seats allocated</small></div><div className="seat-bar"><span style={{width:Math.min(100,((used/(included+paid||1))*100))+"%"}}/></div><p className="muted">{Math.max(0,included+paid-used)} available seats · {included} included + {paid} paid add-on seats</p><div className="plan-line"><span>Trial status</span><b>{subscription?.status ?? "Not configured"}</b></div>{daysLeft !== null && <div className="plan-line"><span>Trial remaining</span><b>{daysLeft} days</b></div>}<div className="plan-line"><span>Estimated monthly total</span><b>{amount===null ? "Unavailable until base fee is confirmed" : `R${amount.toFixed(2)}`}</b></div><p className="muted small-copy">No payment collection or additional-seat purchasing is enabled. The base monthly fee must be confirmed before a total can be quoted.</p></article>
    </section>
    <section className="panel members-panel"><div className="panel-title"><Clock3 size={18}/><div><b>Account allowance</b><small>{members?.length ?? 0} active or invited memberships</small></div></div><p className="muted">Each human staff account uses one seat, regardless of how many departments they join. Department membership is free.</p></section>
  </main>;
}

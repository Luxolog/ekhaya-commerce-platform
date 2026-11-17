"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, listAllAuthUsers } from "@/lib/supabase/admin";

const allowedRoles = ["admin","supervisor","agent","viewer"] as const;

async function requireWorkspaceAdmin(organisationId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: membership } = await supabase.from("sd_organisation_members")
    .select("id,role").eq("organisation_id",organisationId)
    .eq("user_id",String(userId)).eq("status","active").maybeSingle();
  if (!membership || !["owner","admin"].includes(membership.role)) {
    throw new Error("Only workspace owners and admins can manage staff invitations.");
  }
  return { supabase, userId: String(userId) };
}

export async function inviteStaffMember(fd: FormData) {
  const organisationId = String(fd.get("organisation_id") || "");
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const role = String(fd.get("role") || "agent");
  if (!organisationId || !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (!allowedRoles.includes(role as typeof allowedRoles[number])) throw new Error("Choose a permitted staff role.");

  const { supabase } = await requireWorkspaceAdmin(organisationId);
  const [{ data: subscription }, { count: usedSeats }] = await Promise.all([
    supabase.from("sd_subscriptions").select("status,included_seats,paid_additional_seats,trial_ends_at")
      .eq("organisation_id",organisationId).maybeSingle(),
    supabase.from("sd_organisation_members").select("id",{count:"exact",head:true})
      .eq("organisation_id",organisationId).in("status",["active","invited"]),
  ]);
  if (!subscription || !["trialing","active"].includes(subscription.status)) {
    throw new Error("This workspace does not have an active trial or subscription.");
  }
  if (subscription.status === "trialing" && subscription.trial_ends_at && new Date(subscription.trial_ends_at) <= new Date()) {
    throw new Error("The free trial has expired. Contact the workspace owner about subscription activation.");
  }
  const seatLimit = (subscription.included_seats ?? 2) + (subscription.paid_additional_seats ?? 0);
  if ((usedSeats ?? 0) >= seatLimit) {
    throw new Error("All included and purchased seats are in use. Additional-seat purchasing is not enabled yet.");
  }

  const admin = createAdminClient();
  const allUsers = await listAllAuthUsers();
  const existingUser = allUsers.find(user => user.email?.toLowerCase() === email);
  if (existingUser) {
    const { data: existingMembership } = await supabase.from("sd_organisation_members")
      .select("id,status").eq("organisation_id",organisationId).eq("user_id",existingUser.id).maybeSingle();
    if (existingMembership) throw new Error("This person already has a membership in this workspace.");

    const appUrl = process.env.SUPPORT_DESK_APP_URL;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!appUrl || !supabaseUrl || !publishableKey) {
      throw new Error("Set SUPPORT_DESK_APP_URL and the public Supabase URL/key before sending invitations.");
    }
    const callbackUrl = new URL("/auth/callback", appUrl);
    callbackUrl.searchParams.set("organisation", organisationId);
    const { error: membershipError } = await supabase.from("sd_organisation_members").insert({
      organisation_id: organisationId, user_id: existingUser.id, role, status: "invited",
    });
    if (membershipError) throw new Error("The existing account could not be added to the workspace: " + membershipError.message);

    const emailClient = createSupabaseClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: emailError } = await emailClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl.toString(), shouldCreateUser: false },
    });
    if (emailError) {
      await supabase.from("sd_organisation_members").delete()
        .eq("organisation_id",organisationId).eq("user_id",existingUser.id).eq("status","invited");
      throw new Error("The sign-in invitation email could not be sent; the pending membership was rolled back. " + emailError.message);
    }
    revalidatePath("/team");
    revalidatePath("/subscription");
    revalidatePath("/");
    redirect("/team?workspace=" + encodeURIComponent(organisationId) + "&invited=1");
  }

  const appUrl = process.env.SUPPORT_DESK_APP_URL;
  if (!appUrl) throw new Error("Set SUPPORT_DESK_APP_URL in the server environment before sending invitations.");
  const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: new URL("/auth/callback", appUrl).toString(),
    data: { invited_to_organisation: organisationId, invited_role: role },
  });
  if (inviteError || !invitation.user) throw new Error(inviteError?.message ?? "Supabase did not return an invited user.");

  const { error: membershipError } = await supabase.from("sd_organisation_members").insert({
    organisation_id: organisationId, user_id: invitation.user.id, role, status: "invited",
  });
  if (membershipError) {
    await admin.auth.admin.deleteUser(invitation.user.id);
    throw new Error("The invitation could not be recorded, so the temporary auth account was removed. No membership was created. " + membershipError.message);
  }

  revalidatePath("/team");
  revalidatePath("/subscription");
  revalidatePath("/");
  redirect("/team?workspace=" + encodeURIComponent(organisationId) + "&invited=1");
}

export async function updateStaffRole(fd: FormData) {
  const organisationId = String(fd.get("organisation_id") || "");
  const membershipId = String(fd.get("membership_id") || "");
  const role = String(fd.get("role") || "");
  if (!organisationId || !membershipId || !allowedRoles.includes(role as typeof allowedRoles[number])) {
    throw new Error("Choose a valid staff role.");
  }
  const { supabase, userId } = await requireWorkspaceAdmin(organisationId);
  const { data: target } = await supabase.from("sd_organisation_members")
    .select("id,role,user_id,status").eq("id",membershipId).eq("organisation_id",organisationId).maybeSingle();
  if (!target || target.role === "owner") throw new Error("The workspace owner role cannot be changed here.");
  if (target.user_id === userId) throw new Error("You cannot change your own role. Ask another workspace admin or the owner.");
  if (target.role === "admin" && role !== "admin" && target.status === "active") {
    const { count } = await supabase.from("sd_organisation_members").select("id",{count:"exact",head:true})
      .eq("organisation_id",organisationId).eq("role","admin").eq("status","active");
    if ((count ?? 0) <= 1) throw new Error("This is the last active admin. Promote another member to admin before changing this role.");
  }
  const { error } = await supabase.from("sd_organisation_members").update({ role }).eq("id",membershipId).eq("organisation_id",organisationId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function removeStaffMember(fd: FormData) {
  const organisationId = String(fd.get("organisation_id") || "");
  const membershipId = String(fd.get("membership_id") || "");
  if (!organisationId || !membershipId) throw new Error("Staff membership is required.");
  const { supabase, userId } = await requireWorkspaceAdmin(organisationId);
  const { data: target } = await supabase.from("sd_organisation_members")
    .select("id,role,user_id,status").eq("id",membershipId).eq("organisation_id",organisationId).maybeSingle();
  if (!target || target.role === "owner") throw new Error("The workspace owner cannot be removed here.");
  if (target.user_id === userId) throw new Error("You cannot remove your own workspace membership.");
  if (target.role === "admin" && target.status === "active") {
    const { count } = await supabase.from("sd_organisation_members").select("id",{count:"exact",head:true})
      .eq("organisation_id",organisationId).eq("role","admin").eq("status","active");
    if ((count ?? 0) <= 1) throw new Error("This is the last active admin. Promote another member to admin before removing this account.");
  }
  const { error } = await supabase.from("sd_organisation_members").delete().eq("id",membershipId).eq("organisation_id",organisationId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
  revalidatePath("/subscription");
  revalidatePath("/");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function workspaceAccess(organisationId: string) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: membership } = await supabase
    .from("sd_organisation_members")
    .select("id,role")
    .eq("organisation_id", organisationId)
    .eq("user_id", String(userId))
    .eq("status", "active")
    .maybeSingle();
  if (!membership || !["owner","admin","supervisor"].includes(membership.role)) {
    throw new Error("You do not have permission to manage departments.");
  }
  return { supabase, role: membership.role };
}

export async function createDepartment(fd: FormData) {
  const organisationId = String(fd.get("organisation_id") || "");
  const name = String(fd.get("name") || "").trim();
  const description = String(fd.get("description") || "").trim();
  if (!organisationId || !name || name.length > 80 || description.length > 500) {
    throw new Error("Enter a department name (maximum 80 characters) and a description up to 500 characters.");
  }
  const { supabase } = await workspaceAccess(organisationId);
  const { error } = await supabase.from("sd_departments").insert({
    organisation_id: organisationId, name, description: description || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments");
  revalidatePath("/");
  redirect("/departments?workspace=" + encodeURIComponent(organisationId));
}

export async function assignDepartmentMember(fd: FormData) {
  const organisationId = String(fd.get("organisation_id") || "");
  const departmentId = String(fd.get("department_id") || "");
  const memberId = String(fd.get("organisation_member_id") || "");
  if (!organisationId || !departmentId || !memberId) throw new Error("Select a department and an active team member.");
  const { supabase } = await workspaceAccess(organisationId);
  const { error } = await supabase.from("sd_department_members").insert({
    organisation_id: organisationId,
    department_id: departmentId,
    organisation_member_id: memberId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/departments");
}

export async function removeDepartmentMember(fd: FormData) {
  const organisationId = String(fd.get("organisation_id") || "");
  const assignmentId = String(fd.get("assignment_id") || "");
  if (!organisationId || !assignmentId) throw new Error("Department assignment is required.");
  const { supabase } = await workspaceAccess(organisationId);
  const { error } = await supabase.from("sd_department_members")
    .delete().eq("id", assignmentId).eq("organisation_id", organisationId);
  if (error) throw new Error(error.message);
  revalidatePath("/departments");
}

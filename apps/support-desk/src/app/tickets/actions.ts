"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function session() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/login");
  return { supabase, userId: String(userId) };
}

export async function createTicket(fd: FormData) {
  const { supabase } = await session();
  const organisationId = String(fd.get("organisation_id") || "");
  const subject = String(fd.get("subject") || "").trim();
  const description = String(fd.get("description") || "").trim();
  const customerName = String(fd.get("customer_name") || "").trim();
  const customerEmail = String(fd.get("customer_email") || "").trim().toLowerCase();
  const customerPhone = String(fd.get("customer_phone") || "").trim();
  const priority = String(fd.get("priority") || "normal");

  if (!organisationId || !subject || !description || !customerName || !customerEmail) {
    throw new Error("Complete all required fields.");
  }
  if (subject.length > 180 || description.length > 20000 || customerName.length > 160 || customerEmail.length > 254 || customerPhone.length > 40) {
    throw new Error("One or more ticket fields exceed the allowed length.");
  }
  if (!["low", "normal", "high", "urgent"].includes(priority)) {
    throw new Error("Invalid ticket priority.");
  }

  // Customer lookup/create, ticket, first message and audit event are atomic in PostgreSQL.
  const { data: ticketId, error } = await supabase.rpc(
    "sd_create_ticket_with_first_message",
    {
      p_organisation_id: organisationId,
      p_subject: subject,
      p_description: description,
      p_priority: priority,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone || null,
    },
  );

  if (error) throw new Error(error.message);
  if (!ticketId) throw new Error("Ticket creation did not return a ticket reference.");

  revalidatePath("/");
  revalidatePath("/tickets");
  redirect("/tickets?id=" + ticketId);
}

export async function assignTicket(fd: FormData) {
  const { supabase } = await session();
  const organisationId = String(fd.get("organisation_id") || "");
  const ticketId = String(fd.get("ticket_id") || "");
  const assignee = String(fd.get("assigned_to") || "").trim();
  const department = String(fd.get("department_id") || "").trim();

  if (!organisationId || !ticketId) {
    throw new Error("Workspace and ticket are required.");
  }

  const { error } = await supabase.rpc("sd_assign_ticket", {
    p_organisation_id: organisationId,
    p_ticket_id: ticketId,
    p_assigned_to: assignee || null,
    p_department_id: department || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/tickets");
  revalidatePath("/tickets?id=" + ticketId);
}

export async function addTicketMessage(fd: FormData) {
  const { supabase, userId } = await session();
  const ticketId = String(fd.get("ticket_id") || "");
  const organisationId = String(fd.get("organisation_id") || "");
  const body = String(fd.get("body") || "").trim();
  const isInternalNote = fd.get("is_internal_note") === "on";

  if (!ticketId || !organisationId || !body) {
    throw new Error("Message is required.");
  }
  if (body.length > 20000) throw new Error("Messages cannot exceed 20,000 characters.");

  const { error } = await supabase.from("sd_ticket_messages").insert({
    organisation_id: organisationId,
    ticket_id: ticketId,
    author_user_id: userId,
    body,
    is_internal_note: isInternalNote,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/tickets");
  revalidatePath("/tickets?id=" + ticketId);
}

export async function updateTicketStatus(fd: FormData) {
  const { supabase } = await session();
  const ticketId = String(fd.get("ticket_id") || "");
  const status = String(fd.get("status") || "");

  if (
    !ticketId ||
    !["open", "in_progress", "waiting_on_customer", "resolved", "closed"].includes(status)
  ) {
    throw new Error("Invalid ticket status.");
  }

  const { error } = await supabase
    .from("sd_tickets")
    .update({
      status,
      resolved_at: ["resolved", "closed"].includes(status) ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) throw new Error(error.message);
  revalidatePath("/tickets");
  revalidatePath("/tickets?id=" + ticketId);
}
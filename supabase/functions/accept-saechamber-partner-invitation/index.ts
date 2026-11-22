import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInvitationForUser, isPendingAndUnexpiredInvitation, isVerifiedInvitationUser, parseInvitationRequestBody } from "./invitation-guards.ts";

const isAllowedOrigin = (origin: string) =>
  origin === "https://ekhayatech.co.za" ||
  origin === "https://www.ekhayatech.co.za" ||
  origin === "https://pricechecker.ekhayatech.co.za" ||
  /^https:\/\/ekhaya-commerce-platform-[a-z0-9-]+-luxolog\.vercel\.app$/.test(origin);
const corsFor = (req: Request) => {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : "https://pricechecker.ekhayatech.co.za",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
};

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Sign-in required" }), { status: 401, headers: cors });
  const client = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !isVerifiedInvitationUser(user)) return new Response(JSON.stringify({ error: "A verified email invitation session is required" }), { status: 401, headers: cors });
  let body: ReturnType<typeof parseInvitationRequestBody>;
  try { body = parseInvitationRequestBody(await req.json()); } catch { return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: cors }); }
  if (!body) return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: cors });
  const admin = createClient(url, service);
  if (body.action === "lookup_pending") {
    const { data: pending, error: pendingError } = await admin.from("partner_invitations")
      .select("id,partner_id,invited_email,status,expires_at,partner:partner_programs!partner_invitations_partner_id_fkey(partner_name,partner_slug,referral_code)")
      .eq("invited_email", user.email.toLowerCase())
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("invited_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pendingError) return new Response(JSON.stringify({ error: "Could not check pending partner invitations" }), { status: 500, headers: cors });
    const partner = Array.isArray(pending?.partner) ? pending.partner[0] : pending?.partner;
    if (!pending || !partner || !isInvitationForUser(pending, user.email) || !isPendingAndUnexpiredInvitation(pending)) return new Response(JSON.stringify({ invitation: null }), { status: 200, headers: cors });
    return new Response(JSON.stringify({ invitation: {
      id: pending.id,
      partner_name: partner.partner_name,
      partner_slug: partner.partner_slug,
      referral_code: partner.referral_code
    }}), { status: 200, headers: cors });
  }
  const invitationId = body.invitation_id || "";
  const code = (body.referral_code || "").trim().toUpperCase();
  if (!isValidInvitationId(invitationId))
    return new Response(JSON.stringify({ error: "Invalid invitation reference" }), { status: 400, headers: cors });
  if (!isValidReferralCode(code)) return new Response(JSON.stringify({ error: "Choose a link code using 5–20 letters or numbers" }), { status: 400, headers: cors });
  const { data: invitation, error: inviteError } = await admin.from("partner_invitations")
    .select("id,partner_id,invited_email,status,expires_at").eq("id", invitationId).single();
  if (inviteError || !invitation || !isPendingAndUnexpiredInvitation(invitation))
    return new Response(JSON.stringify({ error: "This invitation is invalid, expired or already used" }), { status: 410, headers: cors });
  if (!isInvitationForUser(invitation, user.email))
    return new Response(JSON.stringify({ error: "Please sign in using the email address that received this partner invitation" }), { status: 403, headers: cors });
  const { data: duplicate } = await admin.from("partner_programs").select("id").eq("referral_code", code).neq("id", invitation.partner_id).maybeSingle();
  if (duplicate) return new Response(JSON.stringify({ error: "That referral code is already in use. Choose another." }), { status: 409, headers: cors });
  const { data: linked, error: linkError } = await admin.from("partner_programs")
    .update({ partner_user_id: user.id, referral_code: code, updated_at: new Date().toISOString() })
    .eq("id", invitation.partner_id).is("partner_user_id", null)
    .select("id,partner_name,partner_slug,referral_code,status").maybeSingle();
  if (linkError || !linked) return new Response(JSON.stringify({ error: "This partner programme has already been linked. Contact Ekhaya support if you need help." }), { status: 409, headers: cors });
  const { error: acceptedError } = await admin.from("partner_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invitationId).eq("status", "pending");
  if (acceptedError) return new Response(JSON.stringify({ error: "Partner access was linked, but the invitation status could not be updated. Contact Ekhaya support." }), { status: 500, headers: cors });
  return new Response(JSON.stringify({ success: true, partner: linked, user_id: user.id }), { status: 200, headers: cors });
});

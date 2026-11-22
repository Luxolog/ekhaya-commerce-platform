import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
type ProviderResponse = {
  ok?: boolean;
  error?: { message?: string; detail?: string; retryable?: boolean } | null;
  data?: { products?: Record<string, unknown>[]; results?: Record<string, unknown>[] } | null;
  meta?: Record<string, unknown> | null;
};
const validMarketplaces = ["takealot", "amazon", "makro"]
const testingMarketplaces: Record<string, string> = {
  bobshop: "Bob Shop is in testing and is not available for live searches yet.",
  leroy_merlin: "Leroy Merlin is in testing and is not available for live searches yet.",
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const reefKey = Deno.env.get("REEFAPI_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server configuration incomplete" }, 503);
  }
  const authorization = req.headers.get("authorization") ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  if (!accessToken || accessToken === authorization) {
    return json({ error: "Sign in to search marketplace listings.", code: "AUTH_REQUIRED" }, 401);
  }

  const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const recordProviderUsage = async (entry: {
    marketplace: string; lookupKey: string; credits: number; status: "success" | "failed";
    responseCount?: number; providerRequestId?: string | null; actorId?: string | null;
  }) => {
    try {
      await fetch(new URL("/rest/v1/api_usage_ledger", supabaseUrl), {
        method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          provider: "reefapi", action: "search", marketplace: entry.marketplace, lookup_key: entry.lookupKey,
          credits_charged: Math.max(0, Number(entry.credits) || 0), request_status: entry.status,
          response_count: entry.responseCount ?? 0, request_id: entry.providerRequestId ?? null,
          actor_id: entry.actorId ?? null,
        }),
      });
    } catch (error) {
      console.error("Could not write ReefAPI usage ledger:", error);
    }
  };
  let user: Record<string, unknown>;
  try {
    const userResponse = await fetch(new URL("/auth/v1/user", supabaseUrl), {
      headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) return json({ error: "Your session is invalid or expired. Please sign in again.", code: "INVALID_SESSION" }, 401);
    user = await userResponse.json();
  } catch {
    return json({ error: "Could not verify your seller session." }, 503);
  }
  const userId = typeof user.id === "string" ? user.id : "";
  if (!userId) return json({ error: "Authentication required." }, 401);
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  const isOwner = appMetadata.role === "owner" || appMetadata.is_owner === true;

  let body: { marketplace?: string; query?: string; request_id?: string; action?: string; cache_ttl_minutes?: number; refresh_enabled?: boolean; force_refresh?: boolean; [key: string]: unknown };
  try { body = await req.json(); } catch { return json({ error: "Valid JSON required" }, 400); }
  // Backward-compatible action names used by the current owner dashboard.
  if (body.action === "list_users") body.action = "owner_list_users";
  if (body.action === "set_user_status") {
    body.action = "owner_set_user_status";
    body.target_user_id = body.target_user_id ?? body.user_id;
  }

  if (typeof body.action === "string" && body.action.startsWith("owner_")) {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    let sessionId = "";
    try {
      const jwtPart = accessToken.split(".")[1] ?? "";
      const normalized = jwtPart.replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
      sessionId = typeof claims.session_id === "string" ? claims.session_id : "";
    } catch { /* invalid claims fail closed below */ }
    if (!sessionId) return json({ error: "A valid owner session is required." }, 401);
    const securityUrl = new URL("/rest/v1/account_security_settings", supabaseUrl);
    securityUrl.searchParams.set("user_id", "eq." + userId);
    securityUrl.searchParams.set("select", "email_otp_enabled");
    securityUrl.searchParams.set("limit", "1");
    const securityResponse = await fetch(securityUrl, { headers: adminHeaders });
    if (!securityResponse.ok) return json({ error: "Could not verify owner security settings." }, 503);
    const securityRows = await securityResponse.json();
    if (securityRows?.[0]?.email_otp_enabled === true) {
      const verifiedUrl = new URL("/rest/v1/email_otp_verified_sessions", supabaseUrl);
      verifiedUrl.searchParams.set("user_id", "eq." + userId);
      verifiedUrl.searchParams.set("session_id", "eq." + sessionId);
      verifiedUrl.searchParams.set("expires_at", "gt." + new Date().toISOString());
      verifiedUrl.searchParams.set("select", "session_id");
      verifiedUrl.searchParams.set("limit", "1");
      const verifiedResponse = await fetch(verifiedUrl, { headers: adminHeaders });
      if (!verifiedResponse.ok) return json({ error: "Could not verify owner OTP status." }, 503);
      const verifiedRows = await verifiedResponse.json();
      if (!verifiedRows?.length) return json({ error: "Email verification is required to access Admin controls.", code: "EMAIL_OTP_REQUIRED" }, 403);
    }
  }

  if (body.action === "owner_list_users") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const [usersResponse, pilotResponse, profilesResponse] = await Promise.all([
      fetch(new URL("/auth/v1/admin/users?page=1&per_page=1000", supabaseUrl), { headers: adminHeaders }),
      fetch(new URL("/rest/v1/seller_pilot_access?select=user_id,started_at,ends_at,status,daily_limit,total_limit,pilot_label", supabaseUrl), { headers: adminHeaders }),
      fetch(new URL("/rest/v1/profiles?select=id,display_name,plan_code,account_status", supabaseUrl), { headers: adminHeaders })
    ]);
    if (!usersResponse.ok || !pilotResponse.ok || !profilesResponse.ok) {
      return json({ error: "Could not load registered users.", details: { auth: usersResponse.status, pilots: pilotResponse.status, profiles: profilesResponse.status } }, 502);
    }
    const usersPayload = await usersResponse.json();
    const authUsers = Array.isArray(usersPayload) ? usersPayload : usersPayload.users ?? [];
    const pilots = await pilotResponse.json();
    const profiles = await profilesResponse.json();
    const pilotById = new Map<string, Record<string, unknown>>(pilots.map((p: Record<string, unknown>) => [String(p.user_id), p]));
    const profileById = new Map<string, Record<string, unknown>>(profiles.map((p: Record<string, unknown>) => [String(p.id), p]));
    return json({ ok: true, users: authUsers.map((u: Record<string, unknown>) => {
      const meta = asRecord(u.user_metadata);
      const app = asRecord(u.app_metadata);
      const profile = profileById.get(String(u.id)) ?? {};
      return {
        id: u.id,
        user_id: u.id,
        email: u.email ?? null,
        display_name: profile.display_name ?? meta.display_name ?? meta.full_name ?? meta.name ?? null,
        created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        role: app.role ?? (app.is_owner === true ? "owner" : "seller"),
        account_status: profile.account_status ?? "pending",
        plan_code: profile.plan_code ?? "free",
        pilot: pilotById.get(String(u.id)) ?? null
      };
    }) });
  }
  if (body.action === "owner_security_dashboard") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const [eventsResponse, identitiesResponse, domainsResponse] = await Promise.all([
      fetch(new URL("/rest/v1/security_fraud_events?select=id,user_id,email,event_type,severity,risk_score,details,reviewed,created_at&order=created_at.desc&limit=200", supabaseUrl), { headers: adminHeaders }),
      fetch(new URL("/rest/v1/marketplace_seller_identities?select=id,user_id,marketplace,seller_id,status,submitted_at,reviewed_at,review_note&order=submitted_at.desc&limit=200", supabaseUrl), { headers: adminHeaders }),
      fetch(new URL("/rest/v1/security_blocked_email_domains?select=domain,reason,added_at,active&order=added_at.desc", supabaseUrl), { headers: adminHeaders })
    ]);
    if (!eventsResponse.ok || !identitiesResponse.ok || !domainsResponse.ok) {
      return json({ error: "Could not load security dashboard.", details: { events: eventsResponse.status, identities: identitiesResponse.status, domains: domainsResponse.status } }, 502);
    }
    const [events, identities, blocked_domains] = await Promise.all([eventsResponse.json(), identitiesResponse.json(), domainsResponse.json()]);
    return json({ ok: true, events, identities, blocked_domains });
  }
  if (body.action === "owner_set_user_status") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const targetId = typeof body.target_user_id === "string" ? body.target_user_id : "";
    const nextStatus = String(body.status ?? "");
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (!targetId || !["active", "suspended", "inactive", "pending"].includes(nextStatus) || reason.length < 5) {
      return json({ error: "Choose a valid account status and provide a reason of at least five characters." }, 400);
    }
    if (targetId === userId) return json({ error: "You cannot change your own owner account status here." }, 403);
    const authTarget = await fetch(new URL("/auth/v1/admin/users/" + encodeURIComponent(targetId), supabaseUrl), { headers: adminHeaders });
    if (!authTarget.ok) return json({ error: "Registered account not found." }, 404);
    const targetUser = await authTarget.json();
    const targetApp = targetUser.app_metadata ?? {};
    if (targetApp.role === "owner" || targetApp.is_owner === true) return json({ error: "Owner accounts cannot be changed from seller management." }, 403);
    const previousResponse = await fetch(new URL("/rest/v1/profiles?id=eq." + encodeURIComponent(targetId) + "&select=account_status", supabaseUrl), { headers: adminHeaders });
    if (!previousResponse.ok) return json({ error: "Could not read current account status." }, 502);
    const previousRows = await previousResponse.json();
    if (!previousRows?.[0]) return json({ error: "Seller profile not found." }, 404);
    const previousStatus = previousRows[0].account_status;
    if (nextStatus === "active" && !targetUser.email_confirmed_at) {
      return json({ error: "Verify the seller's email address before approval." }, 409);
    }
    const updateResponse = await fetch(new URL("/rest/v1/profiles?id=eq." + encodeURIComponent(targetId), supabaseUrl), {
      method: "PATCH",
      headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ account_status: nextStatus, updated_at: new Date().toISOString() })
    });
    if (!updateResponse.ok) return json({ error: "Could not update account status.", detail: await updateResponse.text() }, 500);

    let pilotResult: Record<string, unknown> | null = null;
    let approvalEmail: "sent" | "queued" | "already_queued" | "dispatch_failed" | "not_applicable" = "not_applicable";
    if (nextStatus === "active") {
      const activated = await fetch(new URL("/rest/v1/rpc/activate_seller_pilot", supabaseUrl), {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ p_user_id: targetId, p_admin_id: userId, p_daily_limit: 10, p_label: "Six-Seller Pilot" })
      });
      const activation = activated.ok ? await activated.json() : null;
      if (!activated.ok || activation?.ok !== true) {
        await fetch(new URL("/rest/v1/profiles?id=eq." + encodeURIComponent(targetId), supabaseUrl), {
          method: "PATCH",
          headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ account_status: previousStatus, updated_at: new Date().toISOString() })
        });
        const reasonCode = activation?.reason ?? "PILOT_ACTIVATION_FAILED";
        const message = reasonCode === "PILOT_CAPACITY_REACHED"
          ? "All six pilot seats are occupied. This seller has not been approved."
          : "Could not activate the seller's five-day pilot. The account approval was reverted.";
        return json({ error: message, code: reasonCode, detail: activated.ok ? activation : await activated.text() }, 409);
      }
      pilotResult = activation;

      if (previousStatus !== "active") {
        const notification = await fetch(new URL("/rest/v1/user_notifications?on_conflict=user_id,event_key", supabaseUrl), {
          method: "POST",
          headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" },
          body: JSON.stringify({
            user_id: targetId,
            event_key: "seller_pilot_approved_v1",
            notification_type: "account",
            title: "Your Ekhaya Price Checker pilot access is approved",
            message: "Good news — your Ekhaya Price Checker seller pilot application has been approved.\n\nYour five-day pilot starts now. You can make up to 10 successful Takealot searches per day, with a maximum of 50 successful searches during the pilot. Your daily allowance resets at midnight South African time.\n\nFailed, blocked or rejected searches do not consume your allowance. Unused daily searches do not roll over. Your pilot access ends automatically after five days.\n\nSign in to Ekhaya Price Checker to get started. If you need help, contact support@ekhayatech.co.za.\n\nWelcome to the Ekhaya Price Checker pilot — Ekhaya Technologies.",
            action_url: "https://pricechecker.ekhayatech.co.za/price-checker/",
            email_status: "pending"
          })
        });
        if (!notification.ok) {
          approvalEmail = "dispatch_failed";
        } else {
          const queuedRows = await notification.json();
          approvalEmail = queuedRows?.length ? "queued" : "already_queued";
          if (queuedRows?.length) {
            try {
              const sent = await fetch(new URL("/functions/v1/notification-worker", supabaseUrl), {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
                body: JSON.stringify({ notification_id: queuedRows[0].id })
              });
              const delivery = sent.ok ? await sent.json().catch(() => ({})) : {};
              if (sent.ok && Number(delivery.sent) === 1 && Number(delivery.failed) === 0) approvalEmail = "sent";
              else approvalEmail = "dispatch_failed";
            } catch {
              approvalEmail = "dispatch_failed";
            }
          }
        }
      }
    } else {
      await fetch(new URL("/rest/v1/seller_pilot_access?user_id=eq." + encodeURIComponent(targetId), supabaseUrl), {
        method: "PATCH",
        headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ status: "suspended" })
      });
    }

    const eventResponse = await fetch(new URL("/rest/v1/user_status_events", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ target_user_id: targetId, actor_user_id: userId, previous_status: previousStatus, new_status: nextStatus, reason })
    });
    if (!eventResponse.ok) return json({ error: "Account status changed, but the audit event could not be recorded.", detail: await eventResponse.text() }, 500);
    return json({ ok: true, user: (await updateResponse.json())[0], pilot: pilotResult, approval_email: approvalEmail });
  }
  if (body.action === "owner_review_seller_identity") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const identityId = Number(body.identity_id);
    const reviewStatus = String(body.status ?? "");
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    if (!Number.isSafeInteger(identityId) || identityId < 1 || !["verified", "rejected"].includes(reviewStatus)) return json({ error: "Invalid seller identity review." }, 400);
    const review = await fetch(new URL("/rest/v1/rpc/owner_review_seller_identity", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ p_identity_id: identityId, p_status: reviewStatus, p_note: note, p_actor: userId })
    });
    if (!review.ok) return json({ error: "Could not review seller identity.", detail: await review.text() }, 500);
    return json({ ok: true, identity: await review.json() });
  }
  if (body.action === "owner_mark_fraud_reviewed") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const eventId = Number(body.event_id);
    if (!Number.isSafeInteger(eventId) || eventId < 1) return json({ error: "Invalid security event." }, 400);
    const update = await fetch(new URL("/rest/v1/security_fraud_events?id=eq." + eventId, supabaseUrl), {
      method: "PATCH",
      headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ reviewed: true })
    });
    if (!update.ok) return json({ error: "Could not mark security event reviewed.", detail: await update.text() }, 500);
    return json({ ok: true, event: (await update.json())[0] ?? null });
  }
  if (body.action === "owner_block_email_domain") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const domain = String(body.domain ?? "").trim().toLowerCase().replace(/^@/, "");
    const reason = String(body.reason ?? "").trim().slice(0, 500);
    if (!/^(?=.{3,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain) || reason.length < 5) {
      return json({ error: "Enter a valid email domain and a reason of at least five characters." }, 400);
    }
    const saved = await fetch(new URL("/rest/v1/security_blocked_email_domains?on_conflict=domain", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ domain, reason, active: true })
    });
    if (!saved.ok) return json({ error: "Could not add email domain to blocklist.", detail: await saved.text() }, 500);
    return json({ ok: true, domain: (await saved.json())[0] ?? null });
  }
  if (body.action === "owner_update_pilot") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const targetId = typeof body.target_user_id === "string" ? body.target_user_id : "";
    const operation = body.operation;
    if (!targetId || !["suspend","resume","extend"].includes(String(operation))) return json({ error: "Choose a seller and a valid management action." }, 400);
    const lookup = await fetch(new URL("/rest/v1/seller_pilot_access?user_id=eq."+encodeURIComponent(targetId)+"&select=user_id,status,ends_at,daily_limit,pilot_label",supabaseUrl), {headers:adminHeaders});
    const rows = lookup.ok ? await lookup.json() : [];
    if (!lookup.ok || !rows?.[0]) return json({error:"Pilot seller record not found."},404);
    const row = rows[0];
    const patch: Record<string,unknown> = {};
    if (operation === "suspend") patch.status = "suspended";
    if (operation === "resume") {
      if (new Date(row.ends_at) <= new Date()) return json({error:"This pilot has expired. A new activation is required."},409);
      patch.status = "active";
    }
    if (operation === "extend") {
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > 30) return json({error:"Extension must be between 1 and 30 days."},400);
      const base = new Date(Math.max(Date.now(),new Date(row.ends_at).getTime()));
      patch.ends_at = new Date(base.getTime()+days*86400000).toISOString();
      patch.status = "active";
    }
    const saved = await fetch(new URL("/rest/v1/seller_pilot_access?user_id=eq."+encodeURIComponent(targetId),supabaseUrl), {
      method:"PATCH",headers:{...adminHeaders,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(patch)
    });
    if (!saved.ok) return json({error:"Could not update pilot seller.",detail:await saved.text()},500);
    return json({ok:true,seller:(await saved.json())[0]});
  }
  if (body.action === "owner_pilot_analytics") {
    if (!isOwner) return json({error:"Owner permission required."},403);
    const [activityResponse,feedbackResponse] = await Promise.all([
      fetch(new URL("/rest/v1/seller_pilot_activity?select=user_id,marketplace,query,result_count,result_status,source,created_at&order=created_at.desc&limit=10000",supabaseUrl),{headers:adminHeaders}),
      fetch(new URL("/rest/v1/seller_pilot_feedback?select=id,user_id,category,rating,message,status,created_at&order=created_at.desc&limit=500",supabaseUrl),{headers:adminHeaders})
    ]);
    if(!activityResponse.ok || !feedbackResponse.ok) return json({error:"Could not load pilot analytics."},502);
    const activity=await activityResponse.json();
    const feedback=await feedbackResponse.json();
    const bySeller:Record<string,{searches:number;failures:number;last_search:string|null}>={};
    const popular:Record<string,number>={};
    for(const item of activity){
      const entry=bySeller[item.user_id]??{searches:0,failures:0,last_search:null};
      entry.searches++; if(item.result_status!=="success") entry.failures++;
      if(!entry.last_search || item.created_at>entry.last_search) entry.last_search=item.created_at;
      bySeller[item.user_id]=entry;
      const key=String(item.query??"").trim(); if(key) popular[key]=(popular[key]??0)+1;
    }
    return json({ok:true,totals:{searches:activity.length,failures:activity.filter((x:Record<string,unknown>)=>x.result_status!=="success").length,feedback:feedback.length,open_feedback:feedback.filter((x:Record<string,unknown>)=>x.status==="open").length},by_seller:bySeller,popular_queries:Object.entries(popular).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([query,count])=>({query,count})),feedback,activity:activity.slice(0,200)});
  }
  if (body.action === "owner_create_partner") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const partnerName = typeof body.partner_name === "string" ? body.partner_name.trim().replace(/\\s+/g, " ") : "";
    const requestedSlug = typeof body.partner_slug === "string" ? body.partner_slug.trim().toLowerCase() : "";
    const requestedCode = typeof body.referral_code === "string" ? body.referral_code.trim().toUpperCase() : "";
    const slug = (requestedSlug || partnerName.toLowerCase())
      .normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    const referralCode = (requestedCode || slug.replace(/-/g, "").toUpperCase()).replace(/[^A-Z0-9]/g, "").slice(0, 24);
    if (partnerName.length < 2 || partnerName.length > 120) {
      return json({ error: "Enter a partner organisation name between 2 and 120 characters." }, 400);
    }
    if (!slug || slug.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return json({ error: "Enter a valid partner slug using letters, numbers and hyphens." }, 400);
    }
    if (referralCode.length < 4 || referralCode.length > 24) {
      return json({ error: "Referral codes must contain 4 to 24 letters or numbers." }, 400);
    }
    const existing = await fetch(new URL("/rest/v1/partner_programs?select=id,partner_name,partner_slug,referral_code&or=(partner_slug.eq." + encodeURIComponent(slug) + ",referral_code.eq." + encodeURIComponent(referralCode) + ")", supabaseUrl), { headers: adminHeaders });
    if (!existing.ok) return json({ error: "Could not check existing partner names and referral codes." }, 502);
    const matches = await existing.json();
    if (matches.length) {
      const slugTaken = matches.some((p: Record<string, unknown>) => p.partner_slug === slug);
      const codeTaken = matches.some((p: Record<string, unknown>) => p.referral_code === referralCode);
      return json({ error: slugTaken ? "That partner slug is already in use." : codeTaken ? "That referral code is already in use." : "A partner with those details already exists." }, 409);
    }
    const created = await fetch(new URL("/rest/v1/partner_programs", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ partner_name: partnerName, partner_slug: slug, referral_code: referralCode, status: "pending" })
    });
    if (!created.ok) {
      const detail = await created.text();
      if (created.status === 409) return json({ error: "The partner slug or referral code is already registered. Refresh the dashboard and try a different value." }, 409);
      console.error("Partner programme creation failed:", created.status, detail);
      return json({ error: "Could not register the partner programme." }, 502);
    }
    const rows = await created.json();
    const partner = rows?.[0];
    if (!partner) return json({ error: "Partner registration returned no record." }, 502);
    return json({ ok: true, partner, message: "Partner programme registered in pending status. It will not attribute referrals until activated." }, 201);
  }
  if (body.action === "owner_partner_analytics") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    // This is the central owner view: all registered users, all seller searches,
    // provider usage, subscriptions, payments and partner programme records.
    const paths = [
      "/rest/v1/partner_programs?select=id,partner_name,partner_slug,referral_code,partner_user_id,status,program_live_at,created_at&order=created_at.desc",
      "/rest/v1/partner_referrals?select=id,partner_id,referred_user_id,referral_code,registered_at,first_paid_at&order=registered_at.desc&limit=10000",
      "/rest/v1/partner_commission_ledger?select=id,partner_id,referral_id,referred_user_id,payment_month,plan_code,qualifying_amount,active_referred_sellers,commission_band,commission_rate,commission_amount,status,paid_at,created_at&order=created_at.desc&limit=10000",
      "/rest/v1/partner_monthly_statements?select=id,partner_id,statement_month,active_referred_sellers,qualifying_revenue,commission_total,adjustment_total,payment_due_date,status,paid_at&order=statement_month.desc&limit=5000",
      "/rest/v1/seller_pilot_activity?select=user_id,marketplace,query,result_count,result_status,source,created_at&order=created_at.desc&limit=10000",
      "/rest/v1/profiles?select=id,display_name,plan_code,account_status,created_at",
      "/rest/v1/plan_search_allowances?select=plan_code,monthly_search_credits",
      "/rest/v1/user_monthly_search_usage?select=user_id,period_start,searches_used&order=period_start.desc&limit=20000",
      "/rest/v1/user_free_search_usage?select=user_id,searches_used&limit=20000",
      "/rest/v1/subscriptions?select=user_id,plan_code,status,current_period_start,current_period_end,created_at&order=created_at.desc&limit=10000",
      "/rest/v1/payment_transactions?select=user_id,amount,currency,status,payment_kind,paid_at,created_at&order=created_at.desc&limit=10000",
      "/rest/v1/api_usage_ledger?select=provider,action,marketplace,lookup_key,credits_charged,request_status,response_count,actor_id,created_at&order=created_at.desc&limit=20000"
    ];
    const [authResponse, ...responses] = await Promise.all([
      fetch(new URL("/auth/v1/admin/users?page=1&per_page=1000", supabaseUrl), { headers: adminHeaders }),
      ...paths.map(path => fetch(new URL(path, supabaseUrl), { headers: adminHeaders }))
    ]);
    const failed = responses.findIndex(response => !response.ok);
    if (!authResponse.ok || failed >= 0) return json({
      error: "Could not load the complete owner dashboard data.",
      source: failed >= 0 ? paths[failed] : "auth users",
      status: failed >= 0 ? responses[failed].status : authResponse.status
    }, 502);
    const authPayload = await authResponse.json();
    const authUsers = Array.isArray(authPayload) ? authPayload : authPayload.users ?? [];
    const [partners, referrals, commissions, statements, allActivity, profiles, planAllowances, monthlyUsage, freeUsage, subscriptions, payments, apiUsage] =
      await Promise.all(responses.map(response => response.json()));
    const partnerById = new Map<string, Record<string, unknown>>(partners.map((p: Record<string, unknown>) => [String(p.id), p]));
    const referralByUser = new Map<string, Record<string, unknown>>(referrals.map((r: Record<string, unknown>) => [String(r.referred_user_id), r]));
    const profileById = new Map<string, Record<string, unknown>>(profiles.map((p: Record<string, unknown>) => [String(p.id), p]));
    const latestSubscription = new Map<string, Record<string, unknown>>();
    for (const sub of subscriptions) if (!latestSubscription.has(String(sub.user_id))) latestSubscription.set(String(sub.user_id), sub);
    const userPayments = new Map<string, Record<string, unknown>[]>();
    for (const payment of payments) {
      const key = String(payment.user_id);
      userPayments.set(key, [...(userPayments.get(key) ?? []), payment]);
    }
    const sellerSearchCounts = new Map<string, { searches: number; failures: number; last_search: string | null }>();
    for (const item of allActivity) {
      const key = String(item.user_id);
      const entry = sellerSearchCounts.get(key) ?? { searches: 0, failures: 0, last_search: null };
      entry.searches++;
      if (item.result_status !== "success") entry.failures++;
      if (!entry.last_search || String(item.created_at) > entry.last_search) entry.last_search = String(item.created_at);
      sellerSearchCounts.set(key, entry);
    }
    const currentPeriodStart = `${new Date().toISOString().slice(0, 7)}-01`;
    const allowanceByPlan = new Map<string, number>(planAllowances.map((row: Record<string, unknown>) => [String(row.plan_code), Number(row.monthly_search_credits ?? 0)]));
    allowanceByPlan.set("free", 5);
    const freeUsageByUser = new Map<string, number>(freeUsage.map((row: Record<string, unknown>) => [String(row.user_id), Number(row.searches_used ?? 0)]));
    const usageByUser = new Map<string, number>();
    for (const row of monthlyUsage) {
      if (String(row.period_start) === currentPeriodStart) usageByUser.set(String(row.user_id), Number(row.searches_used ?? 0));
    }
    const providerCallsByUser = new Map<string, number>();
    for (const row of apiUsage) if (row.actor_id) providerCallsByUser.set(String(row.actor_id), (providerCallsByUser.get(String(row.actor_id)) ?? 0) + 1);
    const sellers = authUsers.map((u: Record<string, unknown>) => {
      const profile = profileById.get(String(u.id));
      const referral = referralByUser.get(String(u.id));
      const partner = referral ? partnerById.get(String(referral.partner_id)) : undefined;
      const sellerPayments = userPayments.get(String(u.id)) ?? [];
      const successfulPayments = sellerPayments.filter(p => p.status === "paid" || p.status === "success");
      const searchStats = sellerSearchCounts.get(String(u.id)) ?? { searches: 0, failures: 0, last_search: null };
      const sub = latestSubscription.get(String(u.id));
      return {
        id: u.id, email: u.email ?? null,
        display_name: profile?.display_name ?? asRecord(u.user_metadata).display_name ?? asRecord(u.user_metadata).full_name ?? null,
        created_at: u.created_at ?? null, last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        role: asRecord(u.app_metadata).role ?? (asRecord(u.app_metadata).is_owner === true ? "owner" : "seller"),
        account_status: profile?.account_status ?? "pending",
        plan_code: sub?.plan_code ?? profile?.plan_code ?? "free",
        subscription_status: sub?.status ?? "none",
        subscription_period_end: sub?.current_period_end ?? null,
        partner_name: partner?.partner_name ?? null,
        referral_code: referral?.referral_code ?? null,
        searches: searchStats.searches, search_failures: searchStats.failures, last_search: searchStats.last_search,
        payments_count: successfulPayments.length,
        payments_total: successfulPayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
        monthly_search_allowance: Number(allowanceByPlan.get(String(sub?.plan_code ?? profile?.plan_code ?? "free")) ?? 0),
        monthly_searches_used: String(sub?.plan_code ?? profile?.plan_code ?? "free") === "free" ? (freeUsageByUser.get(String(u.id)) ?? 0) : (usageByUser.get(String(u.id)) ?? 0),
        monthly_searches_remaining: Math.max(0, Number(allowanceByPlan.get(String(sub?.plan_code ?? profile?.plan_code ?? "free")) ?? 0) - (String(sub?.plan_code ?? profile?.plan_code ?? "free") === "free" ? (freeUsageByUser.get(String(u.id)) ?? 0) : (usageByUser.get(String(u.id)) ?? 0))),
        provider_api_calls: providerCallsByUser.get(String(u.id)) ?? 0
      };
    });
    const partnerActivity = allActivity
      .filter((item: Record<string, unknown>) => referralByUser.has(String(item.user_id)))
      .map((item: Record<string, unknown>) => {
        const referral = referralByUser.get(String(item.user_id)) as Record<string, unknown>;
        const partner = partnerById.get(String(referral.partner_id));
        const profile = profileById.get(String(item.user_id));
        return { ...item, partner_id: referral.partner_id, partner_name: partner?.partner_name ?? "Unknown partner",
          referral_code: referral.referral_code, seller_display_name: profile?.display_name ?? null,
          seller_plan: profile?.plan_code ?? "free", seller_account_status: profile?.account_status ?? "unknown" };
      });
    const allSearchActivity = allActivity.map((item: Record<string, unknown>) => {
      const seller = sellers.find((s: Record<string, unknown>) => s.id === item.user_id) as Record<string, unknown> | undefined;
      const referral = referralByUser.get(String(item.user_id));
      const partner = referral ? partnerById.get(String(referral.partner_id)) as Record<string, unknown> | undefined : undefined;
      return { ...item, seller_email: seller?.email ?? null, seller_display_name: seller?.display_name ?? null,
        seller_plan: seller?.plan_code ?? "free", partner_name: partner?.partner_name ?? null, event_type: "seller_search" };
    });
    const providerActivity = apiUsage.map((item: Record<string, unknown>) => {
      const seller = item.actor_id ? sellers.find((s: Record<string, unknown>) => s.id === item.actor_id) as Record<string, unknown> | undefined : undefined;
      return { ...item, user_id: item.actor_id ?? null, seller_email: seller?.email ?? null,
        seller_display_name: seller?.display_name ?? null, seller_plan: seller?.plan_code ?? "unknown",
        query: item.lookup_key ?? "", result_count: item.response_count ?? 0, result_status: item.request_status ?? "unknown",
        event_type: "provider_usage" };
    });
    const allPlatformActivity = [...allSearchActivity, ...providerActivity]
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => String(b.created_at).localeCompare(String(a.created_at)));
    const totalCommission = (rows: Record<string, unknown>[]) => rows
      .filter(row => row.status !== "reversed")
      .reduce((sum, row) => sum + Number(row.commission_amount ?? 0), 0);
    return json({
      ok: true, generated_at: new Date().toISOString(),
      totals: {
        users: authUsers.length, sellers: sellers.filter((s: Record<string, unknown>) => s.role !== "owner").length,
        active_sellers: sellers.filter((s: Record<string, unknown>) => s.role !== "owner" && s.account_status === "active").length,
        paying_sellers: sellers.filter((s: Record<string, unknown>) => s.role !== "owner" && ["active","trialing"].includes(String(s.subscription_status))).length,
        total_searches: allActivity.length, total_search_failures: allActivity.filter((a: Record<string, unknown>) => a.result_status !== "success").length,
        provider_api_events: apiUsage.length, total_payments: payments.filter((p: Record<string, unknown>) => p.status === "paid" || p.status === "success").length,
        partners: partners.length, active_partners: partners.filter((p: Record<string, unknown>) => p.status === "active").length,
        registered_referred_sellers: referrals.length, paying_referred_sellers: referrals.filter((r: Record<string, unknown>) => Boolean(r.first_paid_at)).length,
        total_commission_recorded: totalCommission(commissions),
        pending_commission: commissions.filter((c: Record<string, unknown>) => c.status === "pending" || c.status === "approved").reduce((sum: number, c: Record<string, unknown>) => sum + Number(c.commission_amount ?? 0), 0),
        commission_paid: commissions.filter((c: Record<string, unknown>) => c.status === "paid").reduce((sum: number, c: Record<string, unknown>) => sum + Number(c.commission_amount ?? 0), 0),
        partner_searches: partnerActivity.length,
        partner_search_failures: partnerActivity.filter((a: Record<string, unknown>) => a.result_status !== "success").length,
        monthly_search_allowance: sellers.filter((s: Record<string, unknown>) => s.role !== "owner").reduce((sum: number, s: Record<string, unknown>) => sum + Number(s.monthly_search_allowance ?? 0), 0),
        monthly_searches_used: sellers.filter((s: Record<string, unknown>) => s.role !== "owner").reduce((sum: number, s: Record<string, unknown>) => sum + Number(s.monthly_searches_used ?? 0), 0),
        monthly_searches_remaining: sellers.filter((s: Record<string, unknown>) => s.role !== "owner").reduce((sum: number, s: Record<string, unknown>) => sum + Number(s.monthly_searches_remaining ?? 0), 0)
      },
      sellers, all_activity: allPlatformActivity.slice(0, 20000), api_usage: apiUsage,
      partners, referrals: referrals.map((r: Record<string, unknown>) => {
        const partner = partnerById.get(String(r.partner_id)) as Record<string, unknown> | undefined;
        const profile = profileById.get(String(r.referred_user_id)) as Record<string, unknown> | undefined;
        return { ...r, partner_name: partner?.partner_name ?? "Unknown partner", seller_display_name: profile?.display_name ?? null,
          seller_plan: profile?.plan_code ?? "free", seller_account_status: profile?.account_status ?? "unknown" };
      }),
      commissions, statements, activity: partnerActivity.slice(0, 500)
    });
  }
  if (body.action === "owner_financial_analytics") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const paths = [
      "/rest/v1/billing_plans?select=code,name,monthly_price,currency,is_active&order=display_order",
      "/rest/v1/profiles?select=id,plan_code,account_status,created_at",
      "/rest/v1/payment_transactions?select=user_id,amount,currency,status,payment_kind,paid_at,created_at&order=created_at.desc&limit=5000",
      "/rest/v1/subscriptions?select=user_id,plan_code,status,current_period_start,current_period_end&order=created_at.desc&limit=5000",
      "/rest/v1/api_usage_ledger?select=provider,action,marketplace,credits_charged,request_status,actor_id,created_at&order=created_at.desc&limit=10000"
    ];
    const responses = await Promise.all(paths.map(path => fetch(new URL(path, supabaseUrl), { headers: adminHeaders })));
    const failed = responses.findIndex(response => !response.ok);
    if (failed >= 0) return json({ error: "Could not load financial analytics.", source: paths[failed] }, 502);
    const [plans, profiles, payments, subscriptions, apiUsage] = await Promise.all(responses.map(response => response.json()));
    return json({ ok: true, plans, profiles, payments, subscriptions, api_usage: apiUsage, generated_at: new Date().toISOString() });
  }
  if (body.action === "submit_pilot_feedback") {
    if (typeof body.message !== "string" || body.message.trim().length < 5 || body.message.trim().length > 2000) return json({error:"Feedback must be between 5 and 2,000 characters."},400);
    const category = ["bug","product_feedback","data_quality","other"].includes(String(body.category)) ? body.category : "other";
    const rating = body.rating == null ? null : Number(body.rating);
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return json({error:"Rating must be between 1 and 5."},400);
    const saved=await fetch(new URL("/rest/v1/seller_pilot_feedback",supabaseUrl),{method:"POST",headers:{...adminHeaders,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({user_id:userId,category,rating,message:body.message.trim()})});
    if(!saved.ok) return json({error:"Could not submit feedback."},500);
    return json({ok:true,feedback:(await saved.json())[0]});
  }
  if (body.action === "owner_update_feedback") {
    if (!isOwner) return json({error:"Owner permission required."},403);
    const id=Number(body.feedback_id); const status=body.status;
    if(!Number.isInteger(id) || !["open","reviewing","resolved"].includes(String(status))) return json({error:"Invalid feedback update."},400);
    const saved=await fetch(new URL("/rest/v1/seller_pilot_feedback?id=eq."+id,supabaseUrl),{method:"PATCH",headers:{...adminHeaders,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({status})});
    if(!saved.ok) return json({error:"Could not update feedback."},500);
    return json({ok:true,feedback:(await saved.json())[0]});
  }
  if (body.action === "get_pilot_status") {
    const accessResponse = await fetch(new URL("/rest/v1/seller_pilot_access?user_id=eq." + encodeURIComponent(userId) + "&select=started_at,ends_at,status,daily_limit,total_limit,pilot_label", supabaseUrl), { headers: adminHeaders });
    if (!accessResponse.ok) return json({ error: "Could not load your pilot allowance." }, 502);
    const accessRows = await accessResponse.json();
    const access = accessRows?.[0] ?? null;
    if (!access || access.status !== "active" || new Date(access.ends_at) <= new Date()) return json({ active: false, status: access?.status ?? "not_enrolled", ends_at: access?.ends_at ?? null });
    const usageDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
    const usageResponse = await fetch(new URL("/rest/v1/seller_pilot_daily_usage?user_id=eq." + encodeURIComponent(userId) + "&usage_date=eq." + usageDate + "&select=searches_used", supabaseUrl), { headers: adminHeaders });
    if (!usageResponse.ok) return json({ error: "Could not load today's pilot usage." }, 502);
    const usageRows = await usageResponse.json();
    const used = Number(usageRows?.[0]?.searches_used ?? 0);
    const totalResponse = await fetch(new URL("/rest/v1/seller_pilot_daily_usage?user_id=eq." + encodeURIComponent(userId) + "&select=searches_used", supabaseUrl), { headers: adminHeaders });
    if (!totalResponse.ok) return json({ error: "Could not load total pilot usage." }, 502);
    const totalRows = await totalResponse.json();
    const totalUsed = (totalRows ?? []).reduce((sum: number, row: Record<string, unknown>) => sum + Number(row.searches_used ?? 0), 0);
    return json({ active: true, ...access, usage_date: usageDate, searches_used: used, remaining: Math.max(0, Number(access.daily_limit)-used), total_searches_used: totalUsed, total_remaining: Math.max(0, Number(access.total_limit)-totalUsed) });
  }
  if (body.action === "activate_seller_pilot") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const dailyLimit = Number(body.daily_limit ?? 10);
    const label = typeof body.pilot_label === "string" ? body.pilot_label.trim().slice(0,80) : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid seller email address." }, 400);
    if (dailyLimit !== 10) return json({ error: "Every pilot seller receives exactly 10 searches per day." }, 400);
    const usersResponse = await fetch(new URL("/auth/v1/admin/users?page=1&per_page=1000", supabaseUrl), { headers: adminHeaders });
    if (!usersResponse.ok) return json({ error: "Could not look up registered seller accounts." }, 502);
    const usersPayload = await usersResponse.json();
    const users = Array.isArray(usersPayload) ? usersPayload : usersPayload.users ?? [];
    const seller = users.find((candidate: Record<string, unknown>) => String(candidate.email ?? "").toLowerCase() === email);
    if (!seller || typeof seller.id !== "string") return json({ error: "No registered seller account was found for that email. Ask the seller to create their account first." }, 404);
    const activated = await fetch(new URL("/rest/v1/rpc/activate_seller_pilot", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: seller.id, p_admin_id: userId, p_daily_limit: dailyLimit, p_label: label || null }),
    });
    const result = activated.ok ? await activated.json() : null;
    if (!activated.ok) return json({ error: "Could not activate the seller pilot.", detail: await activated.text() }, 500);
    if (result?.ok !== true) {
      const messages: Record<string,string> = {
        PILOT_CAPACITY_REACHED: "All six pilot seats are occupied.",
        USER_NOT_FOUND: "No registered seller account was found.",
      };
      return json({ error: messages[result?.reason] ?? "Pilot activation was not completed.", result }, 409);
    }
    return json({ ok: true, email, result });
  }
  if (body.action === "list_seller_pilots") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const [accessResponse, usersResponse] = await Promise.all([
      fetch(new URL("/rest/v1/seller_pilot_access?select=user_id,started_at,ends_at,status,daily_limit,total_limit,pilot_label&order=created_at.desc", supabaseUrl), { headers: adminHeaders }),
      fetch(new URL("/auth/v1/admin/users?page=1&per_page=1000", supabaseUrl), { headers: adminHeaders }),
    ]);
    if (!accessResponse.ok || !usersResponse.ok) return json({ error: "Could not load pilot seller records." }, 502);
    const access = await accessResponse.json();
    const usersPayload = await usersResponse.json();
    const users = Array.isArray(usersPayload) ? usersPayload : usersPayload.users ?? [];
    const byId = new Map(users.map((candidate: Record<string, unknown>) => [candidate.id, candidate.email]));
    return json({ sellers: (access ?? []).map((row: Record<string, unknown>) => ({ ...row, email: byId.get(row.user_id) ?? null })) });
  }
  if (body.action === "get_cache_settings") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const response = await fetch(new URL("/rest/v1/marketplace_cache_settings?id=eq.true&select=refresh_enabled,cache_ttl_minutes,updated_at", supabaseUrl), { headers: adminHeaders });
    if (!response.ok) return json({ error: "Could not load cache policy." }, 500);
    return json({ ok: true, settings: (await response.json())[0] ?? null });
  }
  if (body.action === "configure_cache") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const ttl = body.cache_ttl_minutes;
    if (ttl !== undefined && (!Number.isInteger(ttl) || ttl < 5 || ttl > 10080)) {
      return json({ error: "Cache TTL must be between 5 and 10,080 minutes." }, 400);
    }
    const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: userId };
    if (ttl !== undefined) update.cache_ttl_minutes = ttl;
    if (body.refresh_enabled !== undefined) update.refresh_enabled = body.refresh_enabled;
    const saved = await fetch(new URL("/rest/v1/marketplace_cache_settings?id=eq.true", supabaseUrl), {
      method: "PATCH",
      headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(update),
    });
    if (!saved.ok) return json({ error: "Could not save cache policy.", detail: await saved.text() }, 500);
    return json({ ok: true, settings: (await saved.json())[0] });
  }

  const marketplace = typeof body.marketplace === "string" ? body.marketplace : "";
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 160) : "";
  if (query.length < 2) {
    return json({ error: "Enter at least 2 search characters." }, 400);
  }
  if (testingMarketplaces[marketplace ?? ""]) {
    return json({ error: testingMarketplaces[marketplace ?? ""], code: "MARKETPLACE_TESTING", marketplace }, 501);
  }
  if (!validMarketplaces.includes(marketplace ?? "")) {
    return json({ error: "Choose a supported marketplace." }, 400);
  }
  if (body.force_refresh && !isOwner) return json({ error: "Only the Ekhaya owner can force a live cache refresh." }, 403);

  let pilotCharged = false;
  const pilotUsageDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  if (!isOwner) {
    const pilotReserve = await fetch(new URL("/rest/v1/rpc/reserve_seller_pilot_search", supabaseUrl), {
      method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: userId, p_marketplace: marketplace }),
    });
    const pilot = pilotReserve.ok ? await pilotReserve.json() : null;
    if (!pilotReserve.ok) return json({ error: "Could not verify pilot search allowance. Please try again." }, 503);
    if (pilot?.allowed === true) pilotCharged = true;
    else if (pilot?.reason === "PILOT_DAILY_LIMIT") return json({ error: "You have used all your marketplace searches for today. Your allowance resets at midnight South African time.", code: "PILOT_DAILY_LIMIT", usage: pilot }, 429);
    else if (pilot?.reason === "PILOT_TOTAL_LIMIT") return json({ error: "You have used all 50 searches included in your five-day pilot.", code: "PILOT_TOTAL_LIMIT", usage: pilot }, 402);
    else if (pilot?.reason === "PILOT_EXPIRED") return json({ error: "Your five-day seller pilot has ended.", code: "PILOT_EXPIRED", usage: pilot }, 402);
    else if (pilot?.reason !== "PILOT_NOT_ACTIVE") return json({ error: "Your seller pilot access is not available for this marketplace.", code: pilot?.reason ?? "PILOT_ACCESS_ERROR", usage: pilot }, 403);
  }

  const postalCode = typeof body.postal_code === "string" ? body.postal_code.trim() : "";
  if (marketplace === "makro" && postalCode && !/^\d{4}$/.test(postalCode)) return json({ error: "Enter a valid four-digit South African postal code.", code: "INVALID_POSTAL_CODE" }, 400);
  const requestId = body.request_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id)
    ? body.request_id : crypto.randomUUID();
  const lookupKey = query.toLowerCase().replace(/\s+/g, " ") + (marketplace === "makro" && postalCode ? `:postal:${postalCode}` : "");
  const cacheUrl = new URL("/rest/v1/marketplace_price_cache", supabaseUrl);
  cacheUrl.searchParams.set("marketplace", `eq.${marketplace}`);
  cacheUrl.searchParams.set("lookup_key", `eq.search:${lookupKey}`);
  cacheUrl.searchParams.set("select", "*");

  try {
    const [cachedResponse, settingsResponse] = await Promise.all([
      fetch(cacheUrl, { headers: adminHeaders }),
      fetch(new URL("/rest/v1/marketplace_cache_settings?id=eq.true&select=refresh_enabled,cache_ttl_minutes", supabaseUrl), { headers: adminHeaders }),
    ]);
    const cachedRows = cachedResponse.ok ? await cachedResponse.json() : [];
    const cache = Array.isArray(cachedRows) ? cachedRows[0] : null;
    const settingsRows = settingsResponse.ok ? await settingsResponse.json() : [];
    const settings = settingsRows?.[0] ?? { refresh_enabled: true, cache_ttl_minutes: 360 };
    const fresh = cache && new Date(cache.expires_at) > new Date();
    if (cache && !body.force_refresh && (fresh || settings.refresh_enabled === false)) {
      const cachedProducts = cache.source_payload?.products ?? [];
      let cacheCreditCharged = false;
      if (!isOwner && !pilotCharged) {
        const reserve = await fetch(new URL("/rest/v1/rpc/reserve_monthly_search_credit", supabaseUrl), {
          method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_marketplace: marketplace, p_request_id: requestId }),
        });
        const reservation = reserve.ok ? await reserve.json() : null;
        if (!reserve.ok || reservation?.allowed !== true) return json({ error: "You have used all your available marketplace search credits. Purchase another allocation to continue.", code: reservation?.reason ?? "CREDIT_RESERVATION_FAILED", usage: reservation }, 402);
        if (reservation.duplicate) return json({ error: "This search request has already been processed. Please start a new search.", code: "DUPLICATE_REQUEST" }, 409);
        cacheCreditCharged = true;
      }
      if (cachedProducts.length === 0 && cacheCreditCharged) {
        await fetch(new URL("/rest/v1/rpc/refund_monthly_search_credit", supabaseUrl), {
          method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_request_id: requestId, p_marketplace: marketplace }),
        });
        cacheCreditCharged = false;
      }
      if (cachedProducts.length > 0 && cacheCreditCharged) {
        await fetch(new URL("/rest/v1/rpc/complete_monthly_search_credit", supabaseUrl), {
          method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_request_id: requestId, p_marketplace: marketplace }),
        });
      }
      if (cachedProducts.length === 0 && pilotCharged) {
        await fetch(new URL("/rest/v1/rpc/refund_seller_pilot_search", supabaseUrl), {
          method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_usage_date: pilotUsageDate }),
        });
        pilotCharged = false;
      }
      if (!isOwner) await fetch(new URL("/rest/v1/seller_pilot_activity",supabaseUrl), {method:"POST",headers:{...adminHeaders,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({user_id:userId,marketplace,query,result_count:cachedProducts.length,result_status:"success",source:fresh?"cache":"stale-cache"})});
      return json({
        source: fresh ? "cache" : "stale-cache",
        marketplace,
        fetched_at: cache.fetched_at,
        products: cachedProducts,
        refresh_paused: !fresh,
        credit_charged: cacheCreditCharged,
      });
    }

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await sha256(forwarded);
    const quotaResponse = await fetch(new URL("/rest/v1/rpc/consume_price_search_quota", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ p_ip_hash: ipHash, p_limit: 30 }),
    });
    if (!quotaResponse.ok || await quotaResponse.json() !== true) {
      if (pilotCharged) {
        await fetch(new URL("/rest/v1/rpc/refund_seller_pilot_search", supabaseUrl), { method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ p_user_id: userId, p_usage_date: pilotUsageDate }) });
        pilotCharged = false;
      }
      return json({ error: "Search limit reached. Please try again in an hour." }, 429);
    }

    let charged = !isOwner && !pilotCharged;
    if (charged) {
      const reserve = await fetch(new URL("/rest/v1/rpc/reserve_monthly_search_credit", supabaseUrl), {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ p_user_id: userId, p_marketplace: marketplace, p_request_id: requestId }),
      });
      const reservation = reserve.ok ? await reserve.json() : null;
      if (!reserve.ok || reservation?.allowed !== true) {
        const reason = reservation?.reason ?? "CREDIT_RESERVATION_FAILED";
        return json({ error: reason === "MONTHLY_SEARCH_LIMIT" || reason === "PAID_CREDITS_EXHAUSTED" ? "You have used all your available paid marketplace search credits. Purchase another allocation to continue. Your existing paid credits do not expire." : "Your account or plan is not enabled for live searches.", code: reason, usage: reservation }, 402);
      }
      if (reservation.duplicate) {
        return json({ error: "This search request has already been processed. Please start a new search.", code: "DUPLICATE_REQUEST" }, 409);
      }
    }

    let providerAttempted = false;
    let providerPayload: ProviderResponse | null = null;
    let providerUsageLogged = false;
    try {
      let payload: ProviderResponse;
      let raw: Record<string, unknown>[];
      if (marketplace === "makro") {
        if (!reefKey) throw new Error("Makro search is not configured. Add REEFAPI_KEY to Supabase Edge Function secrets.");
        providerAttempted = true;
        const upstream = await fetch("https://api.reefapi.com/makro/v1/search", {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${reefKey}` },
          body: JSON.stringify({ query, page: 1, ...(postalCode ? { postal_code: postalCode } : {}) }),
          signal: AbortSignal.timeout(15000),
        });
        payload = await upstream.json() as ProviderResponse;
        providerPayload = payload;
        if (!upstream.ok || payload?.ok === false) throw new Error(payload?.error?.message ?? payload?.error?.detail ?? upstream.statusText ?? "ReefAPI Makro search failed");
        raw = payload?.data?.products ?? [];
      } else if (marketplace === "amazon") {
        if (!reefKey) throw new Error("Amazon search is not configured. Add REEFAPI_KEY to Supabase Edge Function secrets.");
        const searchParams = { query, marketplace: "co.za", page: 1 };
        const callAmazon = async () => {
          providerAttempted = true;
          const upstream = await fetch("https://api.reefapi.com/amazon/v1/search", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${reefKey}` },
            body: JSON.stringify(searchParams),
            signal: AbortSignal.timeout(15000),
          });
          const result = await upstream.json() as ProviderResponse;
          providerPayload = result;
          if (!upstream.ok || result?.ok === false) {
            const providerError = result?.error ?? {};
            const failure = new Error(String(providerError.message ?? providerError.detail ?? upstream.statusText ?? "ReefAPI Amazon search failed"));
            (failure as Error & { retryable?: boolean }).retryable =
              providerError.retryable === true || upstream.status === 429 || upstream.status >= 500;
            throw failure;
          }
          return result;
        };
        try {
          payload = await callAmazon();
        } catch (firstError) {
          if (!(firstError instanceof Error) || !(firstError as Error & { retryable?: boolean }).retryable) throw firstError;
          await new Promise((resolve) => setTimeout(resolve, 2000));
          payload = await callAmazon();
        }
        const marketplaceCode = String(payload?.meta?.marketplace ?? "").toLowerCase();
        const currencyCode = String(payload?.meta?.currency_code ?? "").toUpperCase();
        if (marketplaceCode !== "co.za" || currencyCode !== "ZAR") {
          throw new Error("ReefAPI returned a marketplace or currency other than Amazon South Africa (ZAR); results were rejected.");
        }
        raw = (payload?.data?.results ?? []).map((p: Record<string, unknown>) => ({
          asin: p.asin,
          product_title: p.title,
          product_price: p.price,
          product_original_price: p.original_price ?? null,
          product_photo: p.image,
          product_url: p.url,
          product_star_rating: p.rating,
          product_num_ratings: p.rating_count,
          in_stock: p.in_stock,
          seller_name: p.seller_name ?? null,
          delivery: p.delivery ?? null,
          product_badge: p.campaign ?? null,
          is_prime: p.is_prime ?? null,
        })) as Record<string, unknown>[];
      } else {
        if (!reefKey) throw new Error("Takealot search is not configured. Add REEFAPI_KEY to Supabase Edge Function secrets.");
        providerAttempted = true;
        const upstream = await fetch("https://api.reefapi.com/takealot/v1/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${reefKey}` },
          body: JSON.stringify({ query, country: "za" }),
          signal: AbortSignal.timeout(9000),
        });
        payload = await upstream.json();
        providerPayload = payload;
        if (!upstream.ok || payload?.ok === false) throw new Error(payload?.error?.message ?? upstream.statusText ?? "Provider lookup failed");
        raw = payload?.data?.results ?? [];
      }

      const parsePrice = (value: unknown): number | null => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value !== "string") return null;
        const cleaned = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
        if (!cleaned) return null;
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const products = raw.map((p: Record<string, unknown>) => {
        const isAmazon = marketplace === "amazon";
        const isMakro = marketplace === "makro";
        const asin = typeof p.asin === "string" ? p.asin : null;
        return {
          id: isAmazon ? asin : isMakro ? p.product_id ?? p.item_id : p.plid,
          title: (isAmazon ? p.product_title : p.title) ?? "Untitled product",
          brand: p.brand ?? null,
          price: parsePrice(isAmazon ? p.product_price : p.price),
          original_price: parsePrice(isAmazon ? p.product_original_price : p.original_price),
          discount_percent: isMakro ? p.discount_percent ?? null : null,
          pack_size: isMakro ? p.pack_size ?? null : null,
          sold_by_makro: isMakro ? p.sold_by_makro ?? null : null,
          seller_id: isMakro ? p.seller_id ?? null : null,
          availability: isMakro ? p.availability ?? null : null,
          key_specs: isMakro ? p.key_specs ?? [] : [],
          currency: "ZAR",
          image: (isAmazon ? p.product_photo : p.image) ?? null,
          url: (isAmazon ? p.product_url : p.url) ?? (asin ? `https://www.amazon.co.za/dp/${asin}` : null),
          in_stock: p.in_stock ?? null,
          rating: isAmazon ? p.product_star_rating ?? null : p.rating ?? null,
          review_count: isAmazon ? p.product_num_ratings ?? null : p.review_count ?? p.rating_count ?? null,
          seller: isMakro ? (p.sold_by_makro ? "Makro" : p.seller_id ? `Marketplace seller (${p.seller_id})` : null) : p.seller_name ?? null,
          delivery: p.delivery ?? null,
          sales_volume: p.sales_volume ?? null,
          product_badge: p.product_badge ?? null,
          is_prime: p.is_prime ?? null,
          is_best_seller: p.is_best_seller ?? null,
          weight_grams: typeof p.weight_grams === "number" ? p.weight_grams : typeof p.weight === "number" ? p.weight : null,
          length_cm: typeof p.length_cm === "number" ? p.length_cm : null,
          width_cm: typeof p.width_cm === "number" ? p.width_cm : null,
          height_cm: typeof p.height_cm === "number" ? p.height_cm : null,
          variant_selection_required: p.variant_selection_required ?? p.has_variations ?? false,
        };
      });
      await recordProviderUsage({
        marketplace, lookupKey: `search:${lookupKey}`, credits: Number(payload.meta?.charged_credits ?? 0),
        status: "success", responseCount: products.length, providerRequestId: typeof payload.meta?.request_id === "string" ? payload.meta.request_id : null,
        actorId: charged ? userId : null,
      });
      providerUsageLogged = true;
      const now = new Date();
      const ttl = Math.max(5, Math.min(10080, Number(settings.cache_ttl_minutes) || 360));
      const expires = new Date(now.getTime() + ttl * 60 * 1000);
      const cacheRow = {
        marketplace, lookup_key: `search:${lookupKey}`, product_title: `Search: ${query}`,
        price: null, currency: "ZAR", fetched_at: now.toISOString(), expires_at: expires.toISOString(),
        source_payload: { products, provider_meta: payload.meta ?? null }, last_error: null,
      };
      const cacheWrite = await fetch(new URL("/rest/v1/marketplace_price_cache?on_conflict=marketplace,lookup_key", supabaseUrl), {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(cacheRow),
      });
      if (!cacheWrite.ok) throw new Error("Marketplace data was found but could not be saved to shared cache.");

      if (products.length === 0) {
        if (pilotCharged) {
          await fetch(new URL("/rest/v1/rpc/refund_seller_pilot_search", supabaseUrl), {
            method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ p_user_id: userId, p_usage_date: pilotUsageDate }),
          });
          pilotCharged = false;
        }
        if (charged) {
          await fetch(new URL("/rest/v1/rpc/refund_monthly_search_credit", supabaseUrl), {
            method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ p_user_id: userId, p_request_id: requestId, p_marketplace: marketplace }),
          });
          charged = false;
        }
      }
      if (charged) {
        await fetch(new URL("/rest/v1/rpc/complete_monthly_search_credit", supabaseUrl), {
          method: "POST",
          headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_request_id: requestId, p_marketplace: marketplace }),
        });
      }
      if (!isOwner) await fetch(new URL("/rest/v1/seller_pilot_activity",supabaseUrl), {method:"POST",headers:{...adminHeaders,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({user_id:userId,marketplace,query,result_count:products.length,result_status:"success",source:"live"})});
      return json({ source: "live", marketplace, fetched_at: now.toISOString(), products, provider_meta: payload.meta ?? null, credit_charged: charged });
    } catch (error) {
      if (providerAttempted && !providerUsageLogged) {
        await recordProviderUsage({
          marketplace, lookupKey: `search:${lookupKey}`,
          credits: Number(providerPayload?.meta?.charged_credits ?? 0), status: "failed",
          responseCount: 0, providerRequestId: typeof providerPayload?.meta?.request_id === "string" ? providerPayload.meta.request_id : null,
          actorId: charged ? userId : null,
        });
        providerUsageLogged = true;
      }
      if (pilotCharged) {
        await fetch(new URL("/rest/v1/rpc/refund_seller_pilot_search", supabaseUrl), {
          method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_usage_date: pilotUsageDate }),
        });
        pilotCharged = false;
      }
      if (charged) {
        await fetch(new URL("/rest/v1/rpc/refund_monthly_search_credit", supabaseUrl), {
          method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_request_id: requestId, p_marketplace: marketplace }),
        });
        charged = false;
      }
      if (marketplace === "takealot" && cache && Array.isArray(cache.source_payload?.products) && cache.source_payload.products.length > 0) {
        return json({ source: "stale-cache", marketplace, fetched_at: cache.fetched_at, products: cache.source_payload.products, refresh_paused: false, warning: "Live Takealot refresh failed; showing the last successfully cached results instead. No seller search credit was used." });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return json({ error: "Marketplace timed out. Your search credit has been refunded.", code: "PROVIDER_TIMEOUT" }, 504);
    }
    return json({ error: "Unable to complete marketplace lookup. Your search credit has been refunded if it was reserved.", detail: String(error) }, 502);
  }
});

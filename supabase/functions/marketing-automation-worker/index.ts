import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";

type Automation = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  action_type: "create_draft" | "request_approval" | "send_reminder";
  action_config: Record<string, unknown>;
  max_attempts: number;
  status: string;
};
type Run = {
  id: string;
  automation_id: string;
  user_id: string;
  attempt_count: number;
  scheduled_for: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const expectedSecret = Deno.env.get("MARKETING_AUTOMATION_WORKER_SECRET") ?? "";
  const suppliedSecret = req.headers.get("x-marketing-worker-secret") ?? "";
  if (!expectedSecret || !suppliedSecret || !safeEqual(expectedSecret, suppliedSecret)) {
    return json({ error: "Unauthorized worker request." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Worker server configuration is incomplete." }, 503);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const body = await req.json().catch(() => ({}));
  const requestedLimit = Number(body?.limit ?? 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(25, Math.max(1, requestedLimit)) : 10;

  const { error: scheduleError } = await admin.rpc("claim_due_marketing_automations", { p_limit: limit });
  if (scheduleError) {
    console.error("Due automation scheduling failed:", scheduleError.message);
    return json({ error: "Unable to schedule due automation runs." }, 503);
  }

  const { data: runs, error: claimError } = await admin.rpc("claim_ready_marketing_automation_runs", {
    p_limit: limit,
  });
  if (claimError) {
    console.error("Automation run claim failed:", claimError.message);
    return json({ error: "Unable to claim automation runs." }, 503);
  }

  let succeeded = 0;
  let retried = 0;
  let failed = 0;
  let skipped = 0;

  for (const run of (runs ?? []) as Run[]) {
    const { data: result, error: executeError } = await admin.rpc("execute_marketing_automation_action", {
      p_run_id: run.id,
    });

    if (executeError) {
      const { data: rule } = await admin.from("marketing_automations")
        .select("max_attempts")
        .eq("id", run.automation_id)
        .eq("user_id", run.user_id)
        .maybeSingle();
      const maxAttempts = Math.min(5, Math.max(1, Number(rule?.max_attempts ?? 3)));
      const isFinal = run.attempt_count >= maxAttempts;
      const delaySeconds = Math.min(3600, 30 * (2 ** Math.max(0, run.attempt_count - 1)));
      const { error: retryError } = await admin.from("marketing_automation_runs").update({
        status: isFinal ? "failed" : "queued",
        available_at: isFinal ? new Date().toISOString() : new Date(Date.now() + delaySeconds * 1000).toISOString(),
        completed_at: isFinal ? new Date().toISOString() : null,
        error_code: "automation_action_failed",
        result_summary: isFinal
          ? "The action failed after the maximum retry attempts."
          : "The action failed and was queued for a delayed retry.",
      }).eq("id", run.id).eq("user_id", run.user_id);
      if (retryError) console.error("Unable to persist automation retry:", retryError.message);
      if (isFinal) failed++;
      else retried++;
      console.error("Automation action execution failed:", executeError.message);
      continue;
    }

    const status = result?.status;
    if (status === "succeeded") succeeded++;
    else if (status === "skipped") skipped++;
    else {
      failed++;
      console.error("Automation executor returned an unexpected result for run:", run.id);
    }
  }

  return json({ claimed: (runs ?? []).length, succeeded, retried, failed, skipped });
});

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const invitedOrganisation = request.nextUrl.searchParams.get("organisation");
  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      const { data: userData } = await supabase.auth.getUser();
      const metadataOrganisation = userData.user?.user_metadata?.invited_to_organisation;
      // Prefer the organisation bound to this email link. Auth user_metadata is mutable and may be stale from an earlier invitation.\n      const organisationId = invitedOrganisation || metadataOrganisation;
      if (organisationId) {
        const { error: acceptError } = await supabase.rpc("sd_accept_organisation_invitation", {
          p_organisation_id: organisationId,
        });
        if (acceptError) {
          return NextResponse.redirect(new URL("/login?error=invite_acceptance_failed", request.url));
        }
        return NextResponse.redirect(new URL("/?workspace=" + encodeURIComponent(organisationId), request.url));
      }
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/set-password";
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=invite_link_invalid", request.url));
}

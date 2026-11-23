import { assertEquals } from "jsr:@std/assert";
import {
  isInvitationForUser,
  isPendingAndUnexpiredInvitation,
  isValidInvitationId,
  isValidReferralCode,
  isVerifiedInvitationUser,
  parseInvitationRequestBody,
} from "../functions/accept-saechamber-partner-invitation/invitation-guards.ts";

Deno.test("requires a signed-in user with a verified email", () => {
  assertEquals(isVerifiedInvitationUser({ email: "partner@example.com", email_confirmed_at: "2026-11-22T08:00:00Z" }), true);
  assertEquals(isVerifiedInvitationUser({ email: "partner@example.com", email_confirmed_at: null }), false);
  assertEquals(isVerifiedInvitationUser({ email: null, email_confirmed_at: "2026-11-22T08:00:00Z" }), false);
  assertEquals(isVerifiedInvitationUser(null), false);
});

Deno.test("accepts only the documented pending lookup action and string fields", () => {
  assertEquals(parseInvitationRequestBody({ action: "lookup_pending" }), { action: "lookup_pending" });
  assertEquals(parseInvitationRequestBody({ invitation_id: "abc", referral_code: "PARTNER" }), { invitation_id: "abc", referral_code: "PARTNER" });
  assertEquals(parseInvitationRequestBody({ action: "admin_lookup" }), null);
  assertEquals(parseInvitationRequestBody({ invitation_id: 42 }), null);
  assertEquals(parseInvitationRequestBody(null), null);
  assertEquals(parseInvitationRequestBody([]), null);
});

Deno.test("matches an invitation only to the authenticated user's email", () => {
  const invitation = { invited_email: "Partner@Example.com" };
  assertEquals(isInvitationForUser(invitation, "partner@example.com"), true);
  assertEquals(isInvitationForUser(invitation, "other@example.com"), false);
  assertEquals(isInvitationForUser(invitation, null), false);
});

Deno.test("returns only pending invitations whose expiry is in the future", () => {
  const now = new Date("2026-11-22T10:00:00Z");
  assertEquals(isPendingAndUnexpiredInvitation({ status: "pending", expires_at: "2026-11-23T10:00:00Z" }, now), true);
  assertEquals(isPendingAndUnexpiredInvitation({ status: "pending", expires_at: "2026-11-21T10:00:00Z" }, now), false);
  assertEquals(isPendingAndUnexpiredInvitation({ status: "pending", expires_at: "2026-11-22T10:00:00Z" }, now), false);
  assertEquals(isPendingAndUnexpiredInvitation({ status: "accepted", expires_at: "2026-11-23T10:00:00Z" }, now), false);
  assertEquals(isPendingAndUnexpiredInvitation({ status: "revoked", expires_at: "2026-11-23T10:00:00Z" }, now), false);
  assertEquals(isPendingAndUnexpiredInvitation({ status: "pending", expires_at: "not-a-date" }, now), false);
});

Deno.test("validates invitation UUID and referral code formats", () => {
  assertEquals(isValidInvitationId("123e4567-e89b-42d3-a456-426614174000"), true);
  assertEquals(isValidInvitationId("not-a-uuid"), false);
  assertEquals(isValidReferralCode("SAECHAMBER"), true);
  assertEquals(isValidReferralCode("BAD CODE"), false);
  assertEquals(isValidReferralCode("AB"), false);
});

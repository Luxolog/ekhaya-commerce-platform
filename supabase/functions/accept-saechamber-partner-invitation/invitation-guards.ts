export type InvitationRequestBody = {
  action?: "lookup_pending";
  invitation_id?: string;
  referral_code?: string;
};

export type VerifiedInvitationUser = {
  email: string;
  email_confirmed_at: string;
};

export function parseInvitationRequestBody(value: unknown): InvitationRequestBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (body.action !== undefined && body.action !== "lookup_pending") return null;
  if (body.invitation_id !== undefined && typeof body.invitation_id !== "string") return null;
  if (body.referral_code !== undefined && typeof body.referral_code !== "string") return null;
  return {
    ...(body.action === "lookup_pending" ? { action: "lookup_pending" as const } : {}),
    ...(typeof body.invitation_id === "string" ? { invitation_id: body.invitation_id } : {}),
    ...(typeof body.referral_code === "string" ? { referral_code: body.referral_code } : {}),
  };
}

export function isVerifiedInvitationUser(
  user: { email?: string | null; email_confirmed_at?: string | null } | null | undefined,
): user is VerifiedInvitationUser {
  return Boolean(user?.email?.trim() && user.email_confirmed_at);
}

export function isInvitationForUser(
  invitation: { invited_email?: string | null } | null | undefined,
  email: string | null | undefined,
): boolean {
  return Boolean(invitation?.invited_email && email &&
    invitation.invited_email.trim().toLowerCase() === email.trim().toLowerCase());
}

export function isPendingAndUnexpiredInvitation(
  invitation: { status?: string | null; expires_at?: string | null } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (invitation?.status !== "pending" || !invitation.expires_at) return false;
  const expiry = Date.parse(invitation.expires_at);
  return Number.isFinite(expiry) && expiry > now.getTime();
}

export function isValidInvitationId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isValidReferralCode(value: string): boolean {
  return /^[A-Z0-9]{5,20}$/.test(value);
}

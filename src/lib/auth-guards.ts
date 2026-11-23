export type ReferralPartner = {
  id: string;
  partner_name: string;
  partner_slug: string;
  referral_code: string;
};

/** Normalise referral input using the same safe character set as signup capture. */
export function normalizeReferralCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

/** Match only a referral code returned by the active-partner lookup. */
export function findReferralPartner(
  code: string,
  partners: ReferralPartner[],
): ReferralPartner | undefined {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return undefined;
  return partners.find((partner) =>
    normalizeReferralCode(partner.referral_code) === normalized
  );
}

/** Return the blocking signup acknowledgement message, if any. */
export function signupAcknowledgementError(
  mode: string,
  privacyAccepted: boolean,
  marketplaceFeesAccepted: boolean,
): string | null {
  if (mode !== "signup") return null;
  if (!privacyAccepted) {
    return "Please read and acknowledge the Privacy Notice before creating an account.";
  }
  if (!marketplaceFeesAccepted) {
    return "Please acknowledge the Marketplace Fees and Estimated Profit disclaimer before creating an account.";
  }
  return null;
}

/** Require at least one supported seller marketplace during registration. */
export function signupMarketplaceSelectionError(
  mode: string,
  marketplaces: string[],
): string | null {
  if (mode !== "signup") return null;
  const supported = new Set(["takealot", "amazon", "makro"]);
  if (!marketplaces.some((marketplace) => supported.has(marketplace))) {
    return "Choose at least one marketplace before creating your seller account.";
  }
  return null;
}

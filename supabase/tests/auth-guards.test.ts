import {
  findReferralPartner,
  normalizeReferralCode,
  signupAcknowledgementError,
  signupMarketplaceSelectionError,
  type ReferralPartner,
} from "../../src/lib/auth-guards.ts";

const activePartners: ReferralPartner[] = [{
  id: "partner-1",
  partner_name: "SA eChamber",
  partner_slug: "sa-echamber",
  referral_code: "SAECHAMBER",
}];

Deno.test("normalises referral codes without accepting unsafe characters", () => {
  if (normalizeReferralCode(" saechamber!  ") !== "SAECHAMBER") {
    throw new Error("Referral code normalisation did not match expected output.");
  }
});

Deno.test("matches an exact active referral code case-insensitively", () => {
  const match = findReferralPartner("saechamber", activePartners);
  if (match?.id !== "partner-1") throw new Error("Expected the active partner to match.");
});

Deno.test("rejects unknown, inactive/not-returned and empty referral codes", () => {
  if (findReferralPartner("UNKNOWN", activePartners)) throw new Error("Unknown referral matched.");
  if (findReferralPartner("", activePartners)) throw new Error("Empty referral matched.");
  if (findReferralPartner("INACTIVE", activePartners)) throw new Error("Unlisted partner matched.");
});

Deno.test("blocks signup when the privacy acknowledgement is missing", () => {
  if (!signupAcknowledgementError("signup", false, true)?.includes("Privacy Notice")) {
    throw new Error("Missing privacy acknowledgement was not blocked.");
  }
});

Deno.test("blocks signup when the marketplace estimate disclaimer is missing", () => {
  if (!signupAcknowledgementError("signup", true, false)?.includes("Marketplace Fees")) {
    throw new Error("Missing marketplace disclaimer was not blocked.");
  }
});

Deno.test("allows signup only after both acknowledgements", () => {
  if (signupAcknowledgementError("signup", true, true) !== null) {
    throw new Error("Both acknowledgements should permit signup.");
  }
});

Deno.test("does not apply signup acknowledgements to sign-in or recovery", () => {
  if (signupAcknowledgementError("signin", false, false) !== null) {
    throw new Error("Sign-in must not require signup acknowledgements.");
  }
  if (signupAcknowledgementError("reset", false, false) !== null) {
    throw new Error("Password recovery must not require signup acknowledgements.");
  }
});

Deno.test("blocks seller signup when no marketplace is selected", () => {
  if (!signupMarketplaceSelectionError("signup", [])?.includes("at least one marketplace")) {
    throw new Error("Signup without a marketplace selection was not blocked.");
  }
});

Deno.test("accepts one or more supported marketplace selections", () => {
  if (signupMarketplaceSelectionError("signup", ["takealot", "amazon"]) !== null) {
    throw new Error("Supported marketplace selections should be accepted.");
  }
});

Deno.test("does not require marketplace selection outside seller signup", () => {
  if (signupMarketplaceSelectionError("signin", []) !== null) {
    throw new Error("Sign-in must not require marketplace selection.");
  }
});

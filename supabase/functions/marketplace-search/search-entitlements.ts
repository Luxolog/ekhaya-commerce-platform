export type SearchEntitlementContext = {
  isOwner: boolean;
  isLinkedPartner: boolean;
  isActivePartner: boolean;
  cacheHit: boolean;
};

export type SearchEntitlement =
  | "free_cache"
  | "owner"
  | "partner_support"
  | "seller_pilot_or_monthly";

export function resolveSearchEntitlement(
  context: SearchEntitlementContext,
): SearchEntitlement {
  if (context.cacheHit) return "free_cache";
  if (context.isOwner) return "owner";
  if (context.isActivePartner) return "partner_support";
  return "seller_pilot_or_monthly";
}


export function canSearchAccount(context: {
  isOwner: boolean;
  accountStatus: string | null | undefined;
}): boolean {
  return context.isOwner || context.accountStatus === "active";
}

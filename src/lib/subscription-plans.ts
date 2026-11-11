export const PRICE_CHECKER_PLAN_LIMITS = {
  basic: { name: "Basic", monthlyPriceZar: 99, productComparisons: 50 },
  standard: { name: "Standard", monthlyPriceZar: 149, productComparisons: 100 },
  advanced: { name: "Advanced", monthlyPriceZar: 199, productComparisons: 150 },
  premium: { name: "Premium", monthlyPriceZar: 249, productComparisons: 250 },
} as const;

/** One customer comparison fans out to Amazon SA, Takealot and Makro. */
export const MARKETPLACE_SEARCHES_PER_COMPARISON = 3;

export type PriceCheckerPlanId = keyof typeof PRICE_CHECKER_PLAN_LIMITS;

export function getMonthlyApiCallAllowance(planId: PriceCheckerPlanId): number {
  return PRICE_CHECKER_PLAN_LIMITS[planId].productComparisons * MARKETPLACE_SEARCHES_PER_COMPARISON;
}

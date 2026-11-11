export const PRICE_CHECKER_PLAN_LIMITS = {
  basic: {
    name: "Basic",
    monthlyPriceZar: 99,
    introductoryFirstMonthPriceZar: 49,
    productComparisons: 50,
  },
  standard: { name: "Standard", monthlyPriceZar: 149, productComparisons: 100 },
  advanced: { name: "Advanced", monthlyPriceZar: 199, productComparisons: 150 },
  premium: { name: "Premium", monthlyPriceZar: 249, productComparisons: 250 },
} as const;

/** One new account receives this one-time welcome allowance before subscribing. */
export const WELCOME_FREE_COMPARISONS = 5;

/** One customer comparison fans out to Amazon SA, Takealot and Makro. */
export const MARKETPLACE_SEARCHES_PER_COMPARISON = 3;

/** Paid subscriptions renew on the first day of each calendar month. */
export const SUBSCRIPTION_BILLING_DAY = 1;

export type PriceCheckerPlanId = keyof typeof PRICE_CHECKER_PLAN_LIMITS;

export function getMonthlyApiCallAllowance(planId: PriceCheckerPlanId): number {
  return PRICE_CHECKER_PLAN_LIMITS[planId].productComparisons * MARKETPLACE_SEARCHES_PER_COMPARISON;
}

export function getWelcomeApiCallAllowance(): number {
  return WELCOME_FREE_COMPARISONS * MARKETPLACE_SEARCHES_PER_COMPARISON;
}

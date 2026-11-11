export type PriceInputs = {
  buyingCost: number;
  sellingPrice: number;
  marketplaceFeePercent: number;
  fixedFee: number;
  otherCosts: number;
  targetMarginPercent: number;
};

export type PriceResult = {
  marketplaceFee: number;
  profit: number;
  marginPercent: number;
  suggestedPrice: number | null;
};

/**
 * Calculates a transparent estimate using only costs and fee assumptions
 * entered by the user. This must not be presented as official marketplace fees.
 */
export function calculatePrice(input: PriceInputs): PriceResult {
  const buyingCost = Math.max(0, Number(input.buyingCost) || 0);
  const sellingPrice = Math.max(0, Number(input.sellingPrice) || 0);
  const feePercent = Math.min(100, Math.max(0, Number(input.marketplaceFeePercent) || 0));
  const fixedFee = Math.max(0, Number(input.fixedFee) || 0);
  const otherCosts = Math.max(0, Number(input.otherCosts) || 0);
  const targetMargin = Math.min(95, Math.max(0, Number(input.targetMarginPercent) || 0)) / 100;

  const marketplaceFee = sellingPrice * (feePercent / 100) + fixedFee;
  const profit = sellingPrice - buyingCost - marketplaceFee - otherCosts;
  const marginPercent = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  // A target margin cannot be solved when fee rate + target margin reaches 100%.
  const denominator = 1 - feePercent / 100 - targetMargin;
  const suggestedPrice = denominator > 0
    ? (buyingCost + fixedFee + otherCosts) / denominator
    : null;

  return { marketplaceFee, profit, marginPercent, suggestedPrice };
}

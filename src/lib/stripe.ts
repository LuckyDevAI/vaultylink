// Stripe product/price mapping for VaultLink plans
export const PLANS = {
  yearly: {
    priceId: "price_1TBkipCRiYFDB9U6JvyCLg2K",
    productId: "prod_UA4sfi1uPvB1AN",
    mode: "subscription" as const,
  },
  lifetime: {
    priceId: "price_1UWb3VCRiYFDB9U6SGxRYVUk",
    productId: "prod_UA4sxOEr0mEKOy",
    mode: "payment" as const,
  },
} as const;

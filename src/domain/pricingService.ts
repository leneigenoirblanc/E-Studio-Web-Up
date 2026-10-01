/**
 * Pricing Domain Service (Pure business logic)
 * Centralizes all pricing mathematics, unit-price computations, tier discounts,
 * promo badge rules, and currency formatting.
 */

export interface PriceBreakdown {
  rawPrice: number;
  promoPrice?: number | null;
  hasPromo: boolean;
  discountPercent?: number;
  discountAmount?: number;
  formattedRegular: string;
  formattedPromo?: string;
  formattedIntegerPart: string;
  formattedCentsPart: string;
  unitPriceString?: string;
}

export interface UnitPriceInput {
  price: number;
  netWeightGrams?: number;
  netVolumeMl?: number;
  unitType?: 'kg' | 'l' | 'piece' | '100g';
}

export class PricingService {
  /**
   * Formats a monetary amount into French / European retail standard (e.g., 2,99 €)
   */
  public static formatCurrency(amount: number, currency: string = '€'): string {
    if (isNaN(amount) || amount === null || amount === undefined) return `0,00 ${currency}`;
    const formatted = amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${currency}`;
  }

  /**
   * Splits a price into integer part and cents for large supermarket pricing typography
   * e.g., 12.99 -> { integer: "12", cents: "99" }
   */
  public static splitPriceParts(price: number): { integer: string; cents: string } {
    if (isNaN(price) || price === null || price === undefined) {
      return { integer: '0', cents: '00' };
    }
    const fixed = price.toFixed(2);
    const [integer, cents] = fixed.split('.');
    return { integer, cents: cents || '00' };
  }

  /**
   * Computes promo economics: discount percentage, absolute saving, and validity
   */
  public static calculatePromoDetails(regularPrice: number, promoPrice?: number | null): {
    hasPromo: boolean;
    discountPercent: number;
    discountAmount: number;
    promoPrice: number;
  } {
    if (
      promoPrice !== null &&
      promoPrice !== undefined &&
      !isNaN(promoPrice) &&
      promoPrice > 0 &&
      promoPrice < regularPrice
    ) {
      const discountAmount = regularPrice - promoPrice;
      const discountPercent = Math.round((discountAmount / regularPrice) * 100);
      return {
        hasPromo: true,
        discountPercent,
        discountAmount,
        promoPrice,
      };
    }
    return {
      hasPromo: false,
      discountPercent: 0,
      discountAmount: 0,
      promoPrice: regularPrice,
    };
  }

  /**
   * Computes legal mandatory unit price (Prix au kilo / au litre)
   */
  public static calculateUnitPrice(input: UnitPriceInput): string | null {
    const { price, netWeightGrams, netVolumeMl, unitType } = input;
    if (price <= 0) return null;

    if (netWeightGrams && netWeightGrams > 0) {
      if (unitType === '100g') {
        const pricePer100g = (price / netWeightGrams) * 100;
        return `${this.formatCurrency(pricePer100g)} / 100g`;
      }
      const pricePerKg = (price / netWeightGrams) * 1000;
      return `${this.formatCurrency(pricePerKg)} / kg`;
    }

    if (netVolumeMl && netVolumeMl > 0) {
      const pricePerLiter = (price / netVolumeMl) * 1000;
      return `${this.formatCurrency(pricePerLiter)} / L`;
    }

    return null;
  }

  /**
   * Evaluates Wholesale / Cash & Carry volume tier discounts
   */
  public static calculateTierDiscount(
    basePrice: number,
    quantity: number,
    tiers: Array<{ minQty: number; discountPercent: number }>
  ): { finalPrice: number; appliedTier: { minQty: number; discountPercent: number } | null } {
    if (!tiers || tiers.length === 0) return { finalPrice: basePrice, appliedTier: null };

    // Sort descending by minQty
    const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
    const matched = sorted.find((t) => quantity >= t.minQty);

    if (matched) {
      const discounted = basePrice * (1 - matched.discountPercent / 100);
      return {
        finalPrice: Math.round(discounted * 100) / 100,
        appliedTier: matched,
      };
    }

    return { finalPrice: basePrice, appliedTier: null };
  }

  /**
   * Generates a complete comprehensive price breakdown for label rendering
   */
  public static getCompleteBreakdown(regularPrice: number, promoPrice?: number | null): PriceBreakdown {
    const promo = this.calculatePromoDetails(regularPrice, promoPrice);
    const activePrice = promo.hasPromo ? promo.promoPrice : regularPrice;
    const parts = this.splitPriceParts(activePrice);

    return {
      rawPrice: regularPrice,
      promoPrice: promo.hasPromo ? promo.promoPrice : null,
      hasPromo: promo.hasPromo,
      discountPercent: promo.hasPromo ? promo.discountPercent : undefined,
      discountAmount: promo.hasPromo ? promo.discountAmount : undefined,
      formattedRegular: this.formatCurrency(regularPrice),
      formattedPromo: promo.hasPromo ? this.formatCurrency(promo.promoPrice) : undefined,
      formattedIntegerPart: parts.integer,
      formattedCentsPart: parts.cents,
    };
  }
}

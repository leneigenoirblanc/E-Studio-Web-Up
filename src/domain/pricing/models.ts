/**
 * E-Studio Composable Pricing Models (Sections 21 à 45, 59)
 * Modèle métier tarifaire totalement découplé de la présentation visuelle.
 */

import { Money, Measurement } from '../canvas/formatting/types';
export type { Money, Measurement };

export type PriceValueSource<T = Money> = T | string; // Valeur fixe ou expression de binding

// 1. PRIX SIMPLE (Section 25)
export interface SinglePriceModel {
  kind: 'single';
  amount: PriceValueSource<Money>;
}

// 2. PROMOTION (Section 26)
export interface PromotionalPriceModel {
  kind: 'promotion';
  regularPrice: PriceValueSource<Money>;
  promotionalPrice: PriceValueSource<Money>;
  discount?: DiscountModel;
  validity?: PriceValidity;
}

export interface DiscountModel {
  type: 'percent' | 'fixed_amount';
  value?: number;
  label?: string;
}

export interface PriceValidity {
  startsAt?: string;
  endsAt?: string;
  label?: string;
}

// 3. PRIX MEMBRE (Section 27)
export interface MemberPriceModel {
  kind: 'member';
  regularPrice: PriceValueSource<Money>;
  memberPrice: PriceValueSource<Money>;
  membershipLabel?: PriceValueSource<string>;
}

// 4. PRIX PAR SEGMENT (Section 28)
export interface CustomerSegmentPrice {
  segmentId: string;
  segmentName: string; // "Retail", "Wholesale", "VIP", "Distributor"
  price: Money;
}

export interface SegmentPriceModel {
  kind: 'segment';
  prices: PriceValueSource<CustomerSegmentPrice[]>;
}

// 5. PRIX À L'UNITÉ DE MESURE (Section 29)
export interface UnitPricingModel {
  kind: 'unit_price';
  sourcePrice: PriceValueSource<Money>;
  measure: PriceValueSource<Measurement>;
  targetUnit: string; // "kg", "L", "100g", "100ml"
  targetQuantity: number;
  calculationMode: 'normalized' | 'custom_factor';
  customFactor?: number;
  prefix?: string; // "Soit "
  suffixPattern?: string; // "{price} / {unit}"
}

// 6. PRODUIT À MESURE VARIABLE (Section 30)
export interface VariableMeasurePriceModel {
  kind: 'variable_measure';
  unitPrice: PriceValueSource<Money>; // ex: 3500 FCFA / kg
  actualMeasure: PriceValueSource<Measurement>; // ex: 1.247 kg
  measureType: 'weight' | 'volume' | 'length' | 'area' | 'count';
  totalPrice?: PriceValueSource<Money>; // ex: 4364 FCFA
  calculationMode: 'multiply' | 'source';
}

// 7. CONDITIONNEMENT & PACKAGING (Section 31)
export type PackagingLevel = 'piece' | 'pack' | 'box' | 'case' | 'pallet';

export interface PackagingPriceModel {
  kind: 'packaging';
  level: PriceValueSource<PackagingLevel>;
  price: PriceValueSource<Money>;
  unitPrice?: PriceValueSource<Money>;
}

// 8. PALIERS DÉGRESSIFS / QUANTITY TIERS (Section 32)
export interface QuantityBreak {
  minimumQuantity: number;
  maximumQuantity?: number;
  price: Money;
  unitPrice?: Money;
  label?: string;
  discountPercent?: number;
}

export interface TierPricingModel {
  kind: 'quantity_break';
  tiers: PriceValueSource<QuantityBreak[]>;
  basis: 'unit' | 'pack' | 'case' | 'carton' | 'pallet';
}

// 9. MULTI-BUY (Section 33)
export interface MultiBuyModel {
  kind: 'multi_buy';
  quantity: number;
  offerPrice: PriceValueSource<Money>; // ex: 2 pour 5000 FCFA
}

// 10. BUY X GET Y (Section 34)
export interface BuyXGetYModel {
  kind: 'buy_x_get_y';
  buyQuantity: number;
  freeQuantity: number;
  label?: string; // "2 achetés = 1 offert"
}

// 11. BUNDLE / LOT (Section 35)
export interface BundleModel {
  kind: 'bundle';
  bundlePrice: PriceValueSource<Money>;
  regularTotal?: PriceValueSource<Money>;
  savings?: PriceValueSource<Money>;
  itemsCount?: number;
}

// 12. PRIX À PARTIR DE (Section 36)
export interface StartingPriceModel {
  kind: 'starting_price';
  minimumPrice: PriceValueSource<Money>;
  label?: string; // "À partir de"
}

// 13. FOURCHETTE DE PRIX (Section 37)
export interface RangePriceModel {
  kind: 'range';
  minimum: PriceValueSource<Money>;
  maximum: PriceValueSource<Money>;
  separator: string; // " – " ou " à "
}

// 14. PRIX SUR DEMANDE / DEVIS (Section 38)
export interface QuotePriceModel {
  kind: 'quote';
  label: 'on_request' | 'contact' | 'quotation_required' | 'custom';
  customLabel?: string;
}

// 15. PRÉSENTATION FISCALE & TAXES (Section 39)
export interface TaxPresentation {
  mode: 'included' | 'excluded' | 'rate' | 'amount' | 'both';
  rate?: PriceValueSource<number>; // ex: 19.25%
  amount?: PriceValueSource<Money>;
  label?: PriceValueSource<string>; // "TTC", "HT"
}

// 16. CHARGES & REDEVANCES (Section 40)
export type PriceChargeType = 'deposit' | 'eco_fee' | 'service_fee' | 'shipping' | 'surcharge' | 'other';

export interface PriceCharge {
  type: PriceChargeType;
  amount: PriceValueSource<Money>;
  label: PriceValueSource<string>; // "Dont 0,20 € d'éco-part"
  includedInDisplayedPrice: boolean;
}

// 17. DÉCOMPOSITION DE PRIX / BREAKDOWN (Section 41)
export type PriceBreakdownRole = 'base' | 'discount' | 'surcharge' | 'tax' | 'deposit' | 'fee' | 'total';

export interface PriceBreakdownLine {
  role: PriceBreakdownRole;
  label: PriceValueSource<string>;
  amount: PriceValueSource<Money>;
  sign: 'positive' | 'negative' | 'neutral';
}

export interface PriceBreakdownModel {
  kind: 'breakdown';
  lines: PriceValueSource<PriceBreakdownLine[]>;
}

// 18. DEVISE SECONDAIRE / DOUBLE AFFICHAGE
export interface SecondaryCurrencyModel {
  currency: string;
  exchangeRate: number; // Taux de conversion
  conversionMode: 'multiply' | 'divide';
  labelPattern?: string; // "(~ {price} {currency})"
}

// ============================================================================
// 19. COMPOSABLE PRICING MODEL CENTRAL (Section 23)
// ============================================================================

export interface PricingModel {
  primary?: SinglePriceModel | PriceValueSource<Money>;
  reference?: PriceValueSource<Money>;
  promotional?: PromotionalPriceModel;
  member?: MemberPriceModel;
  segment?: SegmentPriceModel;
  unit?: UnitPricingModel;
  tiers?: TierPricingModel;
  multiBuy?: MultiBuyModel;
  buyXGetY?: BuyXGetYModel;
  bundle?: BundleModel;
  variableMeasure?: VariableMeasurePriceModel;
  packaging?: PackagingPriceModel;
  startingPrice?: StartingPriceModel;
  range?: RangePriceModel;
  quote?: QuotePriceModel;
  discount?: DiscountModel;
  breakdown?: PriceBreakdownModel;
  charges?: PriceCharge[];
  taxes?: TaxPresentation;
  secondaryCurrency?: SecondaryCurrencyModel;
  validity?: PriceValidity;
}

// ============================================================================
// 20. RESOLVED PRICE (Section 59)
// Modèle canonique produit par PricingEngine et consommé par le renderer
// ============================================================================

export interface ResolvedTier {
  minQuantity: number;
  maxQuantity?: number;
  price: Money;
  unitPrice?: Money;
  label?: string;
  discountPercent?: number;
}

export interface ResolvedCharge {
  type: PriceChargeType;
  amount: Money;
  label: string;
  includedInDisplayedPrice: boolean;
}

export interface ResolvedTax {
  mode: 'included' | 'excluded' | 'rate' | 'amount' | 'both';
  rate?: number;
  amount?: Money;
  label: string;
}

export interface ResolvedPrice {
  primary?: Money;
  reference?: Money;
  promotional?: Money;
  member?: Money;
  unit?: Money;
  measure?: Measurement;
  targetUnitLabel?: string;
  discount?: {
    percent?: number;
    amount?: Money;
    label?: string;
  };
  savings?: Money;
  tiers?: ResolvedTier[];
  charges?: ResolvedCharge[];
  taxes?: ResolvedTax[];
  secondaryCurrency?: Money;
  validity?: PriceValidity;
  quoteText?: string;
  range?: {
    minimum: Money;
    maximum: Money;
    separator: string;
  };
}

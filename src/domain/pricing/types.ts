/**
 * E-Studio Pricing Subsystem — Architecture Complète & Avancée des Éléments de Prix
 *
 * Famille spécialisée d'éléments tarifaires :
 * 1. PriceAmount : Montant monétaire pur décomposé par slots typographiques
 * 2. PriceBlock : Bloc composite complet (Entier, Décimale, Devise, Unité, Préfixe, Suffixe)
 * 3. PromoPrice : Double affichage Prix Barré Réglementaire + Prix Promo Choc + Badge Remise
 * 4. ComparePrice : Prix de référence conseillé / prix catalogue
 * 5. UnitPrice : Prix au kilo/litre/100g légal obligatoire ("Soit X,XX €/kg")
 * 6. TierPrice : Grille tarifaire dégressive par volume/quantité (Grossiste / Demi-Gros)
 * 7. DiscountBadge : Macaron géométrique dynamique (-20%, Économisez X FCFA)
 * 8. DualCurrencyPrice : Double affichage monétaire avec taux de change (ex: FCFA / EUR)
 */

import { TypographyStyle, NumberFormat, CurrencyDisplayConfig } from '../elements/v2/types';

// ============================================================================
// 1. TYPES D'ÉLÉMENTS TARIFAIRES
// ============================================================================

export type PricingElementType =
  | 'price_amount'
  | 'price_block'
  | 'promo_price'
  | 'compare_price'
  | 'unit_price'
  | 'tier_price'
  | 'discount_badge'
  | 'dual_currency_price'
  | 'price_range';

// ============================================================================
// 2. TYPOGRAPHIE GRANULAIRE PAR SLOTS
// ============================================================================

export interface PriceSlotTypography {
  prefix?: TypographyStyle;
  sign?: TypographyStyle;
  integer: TypographyStyle;
  decimalSeparator: TypographyStyle;
  fraction: TypographyStyle;
  currency: TypographyStyle;
  unit?: TypographyStyle;
  suffix?: TypographyStyle;
}

// ============================================================================
// 3. PAYLOADS AVANCÉS POUR CHAQUE ÉLÉMENT TARIFAIRE
// ============================================================================

/**
 * 1. PriceAmount : Affichage direct d'un montant
 */
export interface PriceAmountElementPayload {
  valueBinding: string; // Clé de donnée (ex: "SELLING_PRICE")
  format: NumberFormat;
  typography: PriceSlotTypography;
  currency: CurrencyDisplayConfig;
  prefixText?: string;
  suffixText?: string;
}

/**
 * 2. PriceBlock : Bloc composite tout-en-un
 */
export interface PriceBlockElementPayload {
  valueBinding: string; // ex: "SELLING_PRICE" ou "pricing.finalPrice"
  format: NumberFormat;
  display: {
    showInteger: boolean;
    showFraction: boolean;
    showCurrency: boolean;
    showUnit: boolean;
    showDecimalIfZero: boolean;
  };
  typography: PriceSlotTypography;
  currency: CurrencyDisplayConfig;
  prefixText?: string;
  suffixText?: string;
  unitBinding?: string; // ex: "PACK_UNIT", "SELLING_UNIT"
  unitDefaultText?: string; // ex: "la pièce", "le kg"
  boxAppearance?: {
    fillColor?: string;
    borderColor?: string;
    borderWidthMm?: number;
    cornerRadiusMm?: number;
    paddingMm?: { top: number; right: number; bottom: number; left: number };
  };
}

/**
 * 3. PromoPrice : Affichage promotionnel avec prix barré et remise
 */
export interface PromoPriceElementPayload {
  regularPriceBinding: string; // ex: "SELLING_PRICE"
  promoPriceBinding: string; // ex: "PROMOPRICE"
  format: NumberFormat;
  regularPriceStyle: {
    typography: TypographyStyle;
    strikethrough: {
      enabled: boolean;
      type: 'diagonal' | 'horizontal' | 'double_cross';
      color: string;
      thicknessPt: number;
    };
    prefixText?: string; // ex: "Ancien prix :"
  };
  promoPriceStyle: {
    typography: PriceSlotTypography;
    currency: CurrencyDisplayConfig;
    prefixText?: string; // ex: "Prix Choc :"
  };
  discountBadge?: {
    enabled: boolean;
    mode: 'percent' | 'amount_saved';
    shape: 'pill' | 'circle' | 'ribbon' | 'starburst' | 'rectangle';
    backgroundColor: string;
    textColor: string;
    typography: TypographyStyle;
    prefix?: string; // "-"
  };
  layoutDirection: 'stacked' | 'side_by_side';
  gapMm: number;
}

/**
 * 4. ComparePrice : Prix de comparaison non promotionnel
 */
export interface ComparePriceElementPayload {
  priceBinding: string;
  label: string; // ex: "Prix conseillé", "Prix d'origine", "Prix moyen constaté"
  format: NumberFormat;
  crossedOut: boolean;
  typography: TypographyStyle;
  labelTypography: TypographyStyle;
  currencySymbol?: string;
}

/**
 * 5. UnitPrice : Prix unitaire légal obligatoire
 */
export interface UnitPriceElementPayload {
  priceBinding: string; // ex: "SELLING_PRICE"
  weightVolumeBinding: string; // ex: "UNIT_WEIGHT_VALUE", "CASE_SIZE"
  measureUnit: 'kg' | 'g' | 'L' | 'cl' | 'ml' | 'piece' | 'carton';
  calculationMode: 'per_kg' | 'per_liter' | 'per_100g' | 'per_100ml' | 'custom_multiplier';
  customMultiplier?: number;
  format: NumberFormat;
  typography: TypographyStyle;
  prefixText: string; // "Soit "
  suffixPattern: string; // "{price} / {unit}"
}

/**
 * 6. TierPrice : Paliers dégressifs B2B / Gros
 */
export interface PriceTierStep {
  minQuantity: number;
  unitPrice?: number;
  discountPercent?: number;
  label?: string; // ex: "Par lot de 12", "Dès 5 cartons"
}

export interface TierPriceElementPayload {
  tiersBinding?: string;
  staticTiers: PriceTierStep[];
  format: NumberFormat;
  currencySymbol: string;
  tableLayout: {
    rowHeightMm: number;
    showHeaders: boolean;
    headerBackgroundColor?: string;
    alternateRowColor?: string;
    borderColor?: string;
    borderWidthMm?: number;
  };
  headerTypography?: TypographyStyle;
  rowTypography: TypographyStyle;
  priceTypography: TypographyStyle;
}

/**
 * 7. DiscountBadge : Badge géométrique de réduction
 */
export interface DiscountBadgeElementPayload {
  calculationMode: 'auto_from_promo' | 'fixed_value';
  fixedValue?: string; // "-20%", "PROMO"
  regularPriceBinding?: string;
  promoPriceBinding?: string;
  displayFormat: 'percent' | 'amount_saved';
  shape: 'pill' | 'circle' | 'starburst' | 'ribbon' | 'rounded_rectangle';
  badgeColor: string;
  borderColor?: string;
  borderWidthMm?: number;
  typography: TypographyStyle;
  rotationDeg?: number;
}

/**
 * 8. DualCurrencyPrice : Double affichage monétaire
 */
export interface DualCurrencyPriceElementPayload {
  primaryPriceBinding: string;
  primaryCurrency: string; // ex: "FCFA"
  secondaryCurrency: string; // ex: "EUR"
  exchangeRate: number; // ex: 655.957 (FCFA -> EUR: divide by 655.957)
  conversionMode: 'divide' | 'multiply';
  primaryFormat: NumberFormat;
  secondaryFormat: NumberFormat;
  primaryTypography: PriceSlotTypography;
  secondaryTypography: TypographyStyle;
  layout: 'stacked' | 'side_by_side';
  secondaryPattern: string; // "(~ {price} {currency})"
}

/**
 * 9. PriceRange : Fourchette de prix (ex: "2 500 – 3 500 FCFA" ou "À partir de 2 500 FCFA")
 */
export interface PriceRangeElementPayload {
  minPriceBinding: string;
  maxPriceBinding?: string;
  prefixText: string; // ex: "À partir de", "De"
  separatorText: string; // ex: " – ", " à "
  format: NumberFormat;
  typography: PriceSlotTypography;
  currency: CurrencyDisplayConfig;
}


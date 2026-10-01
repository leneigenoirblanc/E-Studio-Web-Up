/**
 * E-Studio Price Presentation & PriceElement Model V2 (Sections 21, 42-45)
 */

import { BaseCanvasElement } from '../canvas/core/types';
import { TypographyStyle } from '../canvas/typography/types';
import { NumberFormat } from '../canvas/formatting/types';
import { PricingModel } from './models';

// ============================================================================
// 1. SLOTS DU PRIX (Section 43)
// ============================================================================

export type PriceSlotRole =
  | 'label'
  | 'prefix'
  | 'sign'
  | 'reference'
  | 'regular'
  | 'promo'
  | 'member'
  | 'integer'
  | 'groupSeparator'
  | 'decimalSeparator'
  | 'fraction'
  | 'currency'
  | 'unit'
  | 'quantity'
  | 'minimumQuantity'
  | 'discountPercent'
  | 'discountAmount'
  | 'savings'
  | 'tax'
  | 'taxAmount'
  | 'deposit'
  | 'fee'
  | 'tierLabel'
  | 'tierQuantity'
  | 'tierPrice'
  | 'secondaryCurrency'
  | 'suffix';

// ============================================================================
// 2. TYPOGRAPHIE PAR SLOTS AVEC POLICES ILLIMITÉES (Sections 44-45)
// ============================================================================

export interface PriceTypography {
  default: TypographyStyle;
  slots: Partial<Record<PriceSlotRole, TypographyStyle>>;
}

// ============================================================================
// 3. AFFICHAGE DES PRIX (Section 42)
// ============================================================================

export type PriceDisplayMode =
  | 'single'
  | 'stacked'
  | 'inline'
  | 'comparison'
  | 'breakdown'
  | 'tier_table'
  | 'custom';

export interface PriceDisplaySlot {
  role: PriceSlotRole;
  visible: boolean;
  order: number;
}

export interface PriceSeparator {
  beforeRole: PriceSlotRole;
  text: string;
}

export interface PriceDisplayModel {
  mode: PriceDisplayMode;
  slots: PriceDisplaySlot[];
  separators?: PriceSeparator[];
  visibility?: Record<string, string>;
  currencyPosition: 'before' | 'after' | 'superscript' | 'subscript' | 'stacked';
  currencySpacing: boolean;
  strikethroughStyle?: 'diagonal' | 'horizontal' | 'double_cross';
  strikethroughColor?: string;
}

// ============================================================================
// 4. LAYOUT & APPEARANCE DE PRIX
// ============================================================================

export interface PriceLayout {
  direction: 'row' | 'column';
  align: 'start' | 'center' | 'end' | 'baseline';
  gapMm: number;
  wrap: boolean;
}

export interface PriceAppearance {
  fillColor?: string;
  borderColor?: string;
  borderWidthMm?: number;
  cornerRadiusMm?: number;
  paddingMm?: { top: number; right: number; bottom: number; left: number };
  badgeColor?: string;
  badgeTextColor?: string;
  badgeShape?: 'pill' | 'circle' | 'ribbon' | 'starburst' | 'rectangle';
}

export interface PriceBindings {
  primary?: string; // ex: "SELLING_PRICE"
  reference?: string; // ex: "RECOMMENDED_PRICE"
  promotional?: string; // ex: "PROMOPRICE"
  member?: string; // ex: "MEMBER_PRICE"
  weightOrVolume?: string; // ex: "UNIT_WEIGHT_VALUE"
  currency?: string; // ex: "CURRENCY"
}

export interface PriceRules {
  hideIfZero?: boolean;
  hideIfPromoInactive?: boolean;
  highlightPromo?: boolean;
}

// ============================================================================
// 5. NOUVEL ÉLÉMENT CANVAS : PriceElement (Section 21)
// ============================================================================

export interface PriceElement extends BaseCanvasElement<PricingModel, any, PriceBindings, PriceRules> {
  type: 'price';
  x_mm: number;
  y_mm: number;
  w_mm: number;
  h_mm: number;
  preset?: PricePreset;
  pricing: PricingModel;
  display: PriceDisplayModel;
  formatting: NumberFormat;
  typography: PriceTypography;
  layout: PriceLayout;
  appearance: PriceAppearance & { visible?: boolean; opacity?: number; zIndex?: number; locked?: boolean };
  bindings: PriceBindings;
  rules?: PriceRules;
  binding_key?: string;
  conditional_display?: any;
  anchor?: any;
  semantic_snap?: any;
  finish_effect?: any;
}

// ============================================================================
// 6. PRESETS UX (Sections 47-48)
// ============================================================================

export type PricePreset =
  | 'simple'
  | 'promotion'
  | 'unit_price'
  | 'wholesale_tiers'
  | 'member'
  | 'bundle'
  | 'variable_measure'
  | 'range'
  | 'quote'
  | 'custom';

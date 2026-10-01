/**
 * E-Studio Pricing Calculation & Resolution Engine V2 (Sections 21-45, 59)
 *
 * Moteur mathématique et typographique dédié pour tous les éléments de prix :
 * - Décomposition granulaire en sous-parties (slots)
 * - Résolution complète PricingModel -> ResolvedPrice
 * - Gestion des presets composables sans perte de propriétés communes
 * - Calculs de prix au kilo/litre réglementaires via UnitPriceEngine
 * - Calculs de remises (% et montants économisés) via DiscountEngine
 * - Calculs fiscaux (TTC / HT) via TaxEngine
 * - Conversion multi-devises via CurrencyEngine
 */

import {
  PriceBlockElementPayload,
  PromoPriceElementPayload,
  UnitPriceElementPayload,
  PriceSlotTypography,
} from './types';
import {
  PricingModel,
  ResolvedPrice,
  Money,
  QuantityBreak,
} from './models';
import {
  PriceElement,
  PricePreset,
  PriceTypography,
  PriceDisplayModel,
  PriceLayout,
  PriceAppearance,
} from './presentation';
import { fontRegistry } from '../elements/v2/fontRegistry';
import { numberFormatter, FormattedPriceSlots } from '../elements/v2/numberFormatter';
import { enterpriseNumberFormatter } from '../canvas/formatting/numberFormatter';
import { ProductRecord } from '../../types';
import {
  TaxEngine,
  UnitPriceEngine,
  DiscountEngine,
  CurrencyEngine,
  ChargesEngine,
} from './businessEngines';

export class PricingEngine {
  private static instance: PricingEngine | null = null;

  public static getInstance(): PricingEngine {
    if (!this.instance) {
      this.instance = new PricingEngine();
    }
    return this.instance;
  }

  // ==========================================================================
  // 1. TYPOGRAPHIE PAR DÉFAUT
  // ==========================================================================

  public createDefaultPriceTypography(overrides: Partial<PriceSlotTypography> = {}): PriceSlotTypography {
    const oswald = fontRegistry.createFontReference('Oswald');
    const roboto = fontRegistry.createFontReference('Roboto');

    return {
      integer: fontRegistry.createDefaultTypography({
        font: oswald,
        sizePt: 36,
        weight: '700',
        color: '#0f172a',
        openTypeFeatures: { tnum: true, lnum: true },
      }),
      decimalSeparator: fontRegistry.createDefaultTypography({
        font: oswald,
        sizePt: 22,
        weight: '700',
        color: '#0f172a',
        baselineShiftPt: 10,
      }),
      fraction: fontRegistry.createDefaultTypography({
        font: oswald,
        sizePt: 20,
        weight: '700',
        color: '#0f172a',
        baselineShiftPt: 10,
        openTypeFeatures: { tnum: true, lnum: true },
      }),
      currency: fontRegistry.createDefaultTypography({
        font: roboto,
        sizePt: 14,
        weight: '600',
        color: '#475569',
      }),
      unit: fontRegistry.createDefaultTypography({
        font: roboto,
        sizePt: 11,
        weight: '500',
        color: '#64748b',
      }),
      prefix: fontRegistry.createDefaultTypography({
        font: roboto,
        sizePt: 10,
        weight: '500',
        color: '#64748b',
      }),
      suffix: fontRegistry.createDefaultTypography({
        font: roboto,
        sizePt: 10,
        weight: '500',
        color: '#64748b',
      }),
      ...overrides,
    };
  }

  public createFullPriceTypography(defaultFont: string = 'Oswald'): PriceTypography {
    const baseStyle = fontRegistry.createDefaultTypography({}, defaultFont);
    const slots = this.createDefaultPriceTypography();

    return {
      default: baseStyle as any,
      slots: {
        integer: slots.integer as any,
        decimalSeparator: slots.decimalSeparator as any,
        fraction: slots.fraction as any,
        currency: slots.currency as any,
        unit: slots.unit as any,
        prefix: slots.prefix as any,
        suffix: slots.suffix as any,
      },
    };
  }

  // ==========================================================================
  // 2. EXTRACTION DE VALEUR MONÉTAIRE DEPUIS LE PRODUIT
  // ==========================================================================

  private extractAmount(valueSource: any, product?: ProductRecord, fallbackField: string = 'SELLING_PRICE'): number {
    if (typeof valueSource === 'number') return valueSource;
    if (typeof valueSource === 'object' && valueSource && 'amount' in valueSource) {
      return Number(valueSource.amount) || 0;
    }
    if (typeof valueSource === 'string' && product) {
      const bindingKey = valueSource.replace(/^product\./, '');
      const val = product[bindingKey];
      if (val !== undefined && val !== null && val !== '') {
        const parsed = Number(val);
        if (!isNaN(parsed)) return parsed;
      }
    }
    if (product) {
      const fallback = Number(product[fallbackField]);
      if (!isNaN(fallback)) return fallback;
    }
    return 0;
  }

  private extractCurrency(product?: ProductRecord, preferred: string = 'FCFA'): string {
    if (product?.CURRENCY) return String(product.CURRENCY).trim();
    if (product?.currency) return String(product.currency).trim();
    return preferred;
  }

  // ==========================================================================
  // 3. RÉSOLUTION DOMAINE : PRICING MODEL -> RESOLVED PRICE (Section 59)
  // ==========================================================================

  public resolvePrice(
    elementOrModel: PriceElement | PricingModel,
    product?: ProductRecord
  ): ResolvedPrice {
    const model: PricingModel = 'pricing' in elementOrModel ? elementOrModel.pricing : elementOrModel;
    const currency = this.extractCurrency(product);

    const resolved: ResolvedPrice = {};

    // 1. Primary Price
    let rawPrimary = 0;
    if (model.primary) {
      if (typeof model.primary === 'object' && 'kind' in model.primary && model.primary.kind === 'single') {
        rawPrimary = this.extractAmount(model.primary.amount, product, 'SELLING_PRICE');
      } else {
        rawPrimary = this.extractAmount(model.primary, product, 'SELLING_PRICE');
      }
    } else {
      rawPrimary = this.extractAmount(undefined, product, 'SELLING_PRICE');
    }
    resolved.primary = { amount: rawPrimary, currency };

    // 2. Promotional Price
    if (model.promotional) {
      const reg = this.extractAmount(model.promotional.regularPrice, product, 'SELLING_PRICE');
      const promo = this.extractAmount(model.promotional.promotionalPrice, product, 'PROMOPRICE');

      if (reg > 0) resolved.reference = { amount: reg, currency };
      if (promo > 0) {
        resolved.promotional = { amount: promo, currency };
        // Calcul automatique de réduction
        const discountCalc = DiscountEngine.calculateDiscount(
          { amount: reg, currency },
          { amount: promo, currency }
        );
        if (discountCalc) {
          resolved.discount = {
            percent: discountCalc.percent,
            amount: discountCalc.savings,
            label: discountCalc.percentLabel,
          };
          resolved.savings = discountCalc.savings;
        }
      }
      resolved.validity = model.promotional.validity;
    } else if (model.reference) {
      const ref = this.extractAmount(model.reference, product, 'RECOMMENDED_PRICE');
      if (ref > 0) resolved.reference = { amount: ref, currency };
    }

    // 3. Member Price
    if (model.member) {
      const memberAmt = this.extractAmount(model.member.memberPrice, product, 'MEMBER_PRICE');
      if (memberAmt > 0) {
        resolved.member = { amount: memberAmt, currency };
      }
    }

    // 4. Unit Price (per kg / L)
    if (model.unit) {
      const priceToUse = resolved.promotional?.amount ? resolved.promotional : resolved.primary;
      const weightVol = this.extractAmount(model.unit.measure, product, 'UNIT_WEIGHT_VALUE') || 1;
      const sourceUnit = product?.UNIT_WEIGHT_UNIT || product?.SELLING_UNIT || 'kg';

      const unitCalc = UnitPriceEngine.calculateUnitPrice(
        priceToUse,
        { value: weightVol, unit: String(sourceUnit) },
        model.unit.targetUnit || 'kg',
        model.unit.customFactor
      );

      if (unitCalc) {
        resolved.unit = unitCalc.unitPrice;
        resolved.targetUnitLabel = unitCalc.targetUnit;
      }
    }

    // 5. Quantity Tiers
    if (model.tiers) {
      let rawTiers: QuantityBreak[] = [];
      if (Array.isArray(model.tiers.tiers)) {
        rawTiers = model.tiers.tiers;
      } else if (typeof model.tiers.tiers === 'string' && product) {
        try {
          const val = product[model.tiers.tiers];
          if (Array.isArray(val)) rawTiers = val;
          else if (typeof val === 'string') rawTiers = JSON.parse(val);
        } catch {}
      }

      if (rawTiers.length > 0) {
        resolved.tiers = rawTiers.map((t) => ({
          minQuantity: t.minimumQuantity,
          maxQuantity: t.maximumQuantity,
          price: t.price || { amount: 0, currency },
          unitPrice: t.unitPrice,
          label: t.label || `≥ ${t.minimumQuantity} ${model.tiers?.basis || 'unités'}`,
          discountPercent: t.discountPercent,
        }));
      }
    }

    // 6. Variable Measure
    if (model.variableMeasure) {
      const unitP = this.extractAmount(model.variableMeasure.unitPrice, product, 'SELLING_PRICE');
      const actualM = this.extractAmount(model.variableMeasure.actualMeasure, product, 'UNIT_WEIGHT_VALUE') || 1;
      const unitSymbol = product?.UNIT_WEIGHT_UNIT || 'kg';

      resolved.unit = { amount: unitP, currency };
      resolved.measure = { value: actualM, unit: String(unitSymbol) };
      resolved.primary = { amount: Math.round(unitP * actualM * 100) / 100, currency };
    }

    // 7. Taxes
    if (model.taxes) {
      const taxResolved = TaxEngine.calculateTax(resolved.primary, model.taxes);
      if (taxResolved) {
        resolved.taxes = [taxResolved];
      }
    }

    // 8. Charges & Eco-fees
    if (model.charges && model.charges.length > 0) {
      resolved.charges = ChargesEngine.resolveCharges(model.charges, currency);
    }

    // 9. Secondary Currency
    if (model.secondaryCurrency) {
      const conv = CurrencyEngine.convert(
        resolved.promotional || resolved.primary,
        model.secondaryCurrency.currency,
        model.secondaryCurrency.exchangeRate,
        model.secondaryCurrency.conversionMode
      );
      resolved.secondaryCurrency = conv;
    }

    // 10. Quote / Range
    if (model.quote) {
      resolved.quoteText = model.quote.customLabel || 'Sur Devis';
    } else if (model.range) {
      const minA = this.extractAmount(model.range.minimum, product);
      const maxA = this.extractAmount(model.range.maximum, product);
      resolved.range = {
        minimum: { amount: minA, currency },
        maximum: { amount: maxA, currency },
        separator: model.range.separator || ' – ',
      };
    }

    return resolved;
  }

  // ==========================================================================
  // 4. PRÉSETS UX COMPOSABLES SANS PERTE DE PROPRIÉTÉS (Section 48)
  // ==========================================================================

  public switchPreset(current: PriceElement, newPreset: PricePreset): PriceElement {
    const updatedPricing: PricingModel = { ...current.pricing };
    const updatedDisplay: PriceDisplayModel = { ...current.display };

    const getPrimarySource = (): any => {
      if (!updatedPricing.primary) return 'product.SELLING_PRICE';
      if (
        typeof updatedPricing.primary === 'object' &&
        'kind' in updatedPricing.primary &&
        (updatedPricing.primary as any).kind === 'single'
      ) {
        return (updatedPricing.primary as any).amount;
      }
      return updatedPricing.primary;
    };
    const primarySource = getPrimarySource();

    // Conserve : geometry, transform, formatting, typography, colors, layout
    switch (newPreset) {
      case 'simple':
        updatedDisplay.mode = 'single';
        delete updatedPricing.promotional;
        delete updatedPricing.member;
        delete updatedPricing.tiers;
        break;

      case 'promotion':
        updatedDisplay.mode = 'stacked';
        updatedPricing.promotional = {
          kind: 'promotion',
          regularPrice: primarySource,
          promotionalPrice: 'product.PROMOPRICE',
          discount: { type: 'percent' },
        };
        break;

      case 'unit_price':
        updatedDisplay.mode = 'stacked';
        updatedPricing.unit = {
          kind: 'unit_price',
          sourcePrice: primarySource,
          measure: 'product.UNIT_WEIGHT_VALUE',
          targetUnit: 'kg',
          targetQuantity: 1,
          calculationMode: 'normalized',
          prefix: 'Soit ',
          suffixPattern: '{price} / {unit}',
        };
        break;

      case 'wholesale_tiers':
        updatedDisplay.mode = 'tier_table';
        updatedPricing.tiers = {
          kind: 'quantity_break',
          basis: 'carton',
          tiers: [
            { minimumQuantity: 5, price: { amount: 2200, currency: 'FCFA' }, label: 'Dès 5 cartons' },
            { minimumQuantity: 10, price: { amount: 2000, currency: 'FCFA' }, label: 'Dès 10 cartons' },
            { minimumQuantity: 50, price: { amount: 1850, currency: 'FCFA' }, label: 'Dès 50 cartons' },
          ],
        };
        break;

      case 'member':
        updatedDisplay.mode = 'stacked';
        updatedPricing.member = {
          kind: 'member',
          regularPrice: primarySource,
          memberPrice: 'product.MEMBER_PRICE',
          membershipLabel: 'Prix Club / Fidélité',
        };
        break;

      case 'bundle':
        updatedDisplay.mode = 'stacked';
        updatedPricing.bundle = {
          kind: 'bundle',
          bundlePrice: { amount: 5000, currency: 'FCFA' },
          regularTotal: { amount: 6500, currency: 'FCFA' },
          savings: { amount: 1500, currency: 'FCFA' },
          itemsCount: 3,
        };
        break;

      case 'variable_measure':
        updatedDisplay.mode = 'stacked';
        updatedPricing.variableMeasure = {
          kind: 'variable_measure',
          unitPrice: 'product.SELLING_PRICE',
          actualMeasure: 'product.UNIT_WEIGHT_VALUE',
          measureType: 'weight',
          calculationMode: 'multiply',
        };
        break;

      case 'range':
        updatedDisplay.mode = 'inline';
        updatedPricing.range = {
          kind: 'range',
          minimum: { amount: 2000, currency: 'FCFA' },
          maximum: { amount: 3500, currency: 'FCFA' },
          separator: ' – ',
        };
        break;

      case 'quote':
        updatedDisplay.mode = 'single';
        updatedPricing.quote = {
          kind: 'quote',
          label: 'on_request',
          customLabel: 'Sur Devis',
        };
        break;

      default:
        break;
    }

    return {
      ...current,
      preset: newPreset,
      pricing: updatedPricing,
      display: updatedDisplay,
    };
  }

  // ==========================================================================
  // 5. FACTORY DE CRÉATION DE PRICE ELEMENT (Section 21)
  // ==========================================================================

  public createDefaultPriceElement(
    preset: PricePreset = 'simple',
    overrides: Partial<PriceElement> = {}
  ): PriceElement {
    const oswald = fontRegistry.createFontReference('Oswald');
    const roboto = fontRegistry.createFontReference('Roboto');

    const baseDisplay: PriceDisplayModel = {
      mode: preset === 'wholesale_tiers' ? 'tier_table' : preset === 'promotion' ? 'stacked' : 'single',
      slots: [
        { role: 'integer', visible: true, order: 1 },
        { role: 'decimalSeparator', visible: true, order: 2 },
        { role: 'fraction', visible: true, order: 3 },
        { role: 'currency', visible: true, order: 4 },
      ],
      currencyPosition: 'after',
      currencySpacing: true,
      strikethroughStyle: 'diagonal',
      strikethroughColor: '#ef4444',
    };

    const baseFormatting = enterpriseNumberFormatter.createDefaultFormat({
      decimalSeparator: ',',
      thousandsSeparator: 'space',
      maximumFractionDigits: 2,
      trimTrailingZeros: true,
    });

    const baseLayout: PriceLayout = {
      direction: 'column',
      align: 'baseline',
      gapMm: 1,
      wrap: false,
    };

    const baseAppearance: PriceAppearance = {
      badgeColor: '#dc2626',
      badgeTextColor: '#ffffff',
      badgeShape: 'pill',
    };

    const initialElement: PriceElement = {
      id: `price_${Date.now()}`,
      type: 'price',
      preset,
      geometry: { xMm: 5, yMm: 5, widthMm: 45, heightMm: 22 },
      transform: { rotationDeg: 0, scaleX: 1, scaleY: 1, origin: { x: 0.5, y: 0.5 } },
      appearance: { ...baseAppearance, visible: true, opacity: 1, zIndex: 10, locked: false },
      x_mm: 5,
      y_mm: 5,
      w_mm: 45,
      h_mm: 22,
      rotation: 0,
      z_index: 10,
      locked: false,
      visible: true,
      opacity: 1,
      pricing: {
        primary: 'product.SELLING_PRICE',
      },
      display: baseDisplay,
      formatting: baseFormatting,
      typography: this.createFullPriceTypography('Oswald'),
      layout: baseLayout,
      bindings: {
        primary: 'SELLING_PRICE',
        promotional: 'PROMOPRICE',
        currency: 'CURRENCY',
      },
      ...overrides,
    };

    return this.switchPreset(initialElement, preset);
  }

  // ==========================================================================
  // 6. MÉTHODES HISTORIQUES POUR RÉTROCOMPATIBILITÉ PARFAITE
  // ==========================================================================

  public resolvePriceSlots(
    payload: PriceBlockElementPayload,
    product: ProductRecord
  ): FormattedPriceSlots {
    const rawValue = product[payload.valueBinding] || product.SELLING_PRICE || 0;
    const currency = payload.currency?.symbol || product.CURRENCY || 'FCFA';
    const position = payload.currency?.position || 'after';

    return numberFormatter.formatPrice(rawValue, payload.format, currency, position);
  }

  public calculateUnitPrice(
    payload: UnitPriceElementPayload,
    product: ProductRecord
  ): { unitPriceFormatted: string; rawUnitPrice: number } | null {
    const price = Number(product[payload.priceBinding] || product.SELLING_PRICE);
    const weightVol = Number(product[payload.weightVolumeBinding] || product.UNIT_WEIGHT_VALUE || product.CASE_SIZE);

    if (isNaN(price) || price <= 0 || isNaN(weightVol) || weightVol <= 0) {
      return null;
    }

    let multiplier = 1;
    let targetUnit: string = payload.measureUnit;

    switch (payload.calculationMode) {
      case 'per_kg':
        multiplier = payload.measureUnit === 'g' ? 1000 : 1;
        targetUnit = 'kg';
        break;
      case 'per_liter':
        multiplier = payload.measureUnit === 'cl' ? 100 : payload.measureUnit === 'ml' ? 1000 : 1;
        targetUnit = 'L';
        break;
      case 'per_100g':
        multiplier = payload.measureUnit === 'g' ? 100 : 0.1;
        targetUnit = '100g';
        break;
      case 'per_100ml':
        multiplier = payload.measureUnit === 'ml' ? 100 : payload.measureUnit === 'cl' ? 10 : 0.1;
        targetUnit = '100ml';
        break;
      case 'custom_multiplier':
        multiplier = payload.customMultiplier || 1;
        break;
    }

    const rawUnitPrice = (price / weightVol) * multiplier;
    const formattedSlots = numberFormatter.formatPrice(
      rawUnitPrice,
      payload.format,
      product.CURRENCY || 'FCFA'
    );

    const pricePart = formattedSlots.fullFormatted;
    const unitPriceFormatted = payload.suffixPattern
      .replace('{price}', pricePart)
      .replace('{unit}', targetUnit);

    return {
      rawUnitPrice,
      unitPriceFormatted: `${payload.prefixText || ''}${unitPriceFormatted}`.trim(),
    };
  }

  public calculatePromoDiscount(
    regularPrice: number,
    promoPrice: number
  ): { percent: number; percentFormatted: string; amountSaved: number } | null {
    if (regularPrice <= 0 || promoPrice <= 0 || promoPrice >= regularPrice) {
      return null;
    }

    const amountSaved = regularPrice - promoPrice;
    const percent = Math.round((amountSaved / regularPrice) * 100);

    return {
      percent,
      percentFormatted: `-${percent}%`,
      amountSaved,
    };
  }

  public createDefaultPriceBlockPayload(overrides: Partial<PriceBlockElementPayload> = {}): PriceBlockElementPayload {
    return {
      valueBinding: 'SELLING_PRICE',
      format: numberFormatter.createDefaultFormat({ decimalSeparator: ',', maximumFractionDigits: 2 }),
      display: {
        showInteger: true,
        showFraction: true,
        showCurrency: true,
        showUnit: false,
        showDecimalIfZero: false,
      },
      typography: this.createDefaultPriceTypography(),
      currency: {
        code: 'XAF',
        symbol: 'FCFA',
        position: 'after',
        spacingSpace: true,
      },
      prefixText: '',
      suffixText: '',
      ...overrides,
    };
  }

  public createDefaultPromoPricePayload(): PromoPriceElementPayload {
    const roboto = fontRegistry.createFontReference('Roboto');
    const oswald = fontRegistry.createFontReference('Oswald');

    return {
      regularPriceBinding: 'SELLING_PRICE',
      promoPriceBinding: 'PROMOPRICE',
      format: numberFormatter.createDefaultFormat({ decimalSeparator: ',' }),
      regularPriceStyle: {
        typography: fontRegistry.createDefaultTypography({
          font: roboto,
          sizePt: 16,
          weight: '600',
          color: '#94a3b8',
        }),
        strikethrough: {
          enabled: true,
          type: 'diagonal',
          color: '#ef4444',
          thicknessPt: 2,
        },
        prefixText: 'Au lieu de :',
      },
      promoPriceStyle: {
        typography: this.createDefaultPriceTypography({
          integer: fontRegistry.createDefaultTypography({
            font: oswald,
            sizePt: 42,
            weight: '800',
            color: '#dc2626',
          }),
        }),
        currency: {
          code: 'XAF',
          symbol: 'FCFA',
          position: 'after',
          spacingSpace: true,
        },
        prefixText: '',
      },
      discountBadge: {
        enabled: true,
        mode: 'percent',
        shape: 'pill',
        backgroundColor: '#dc2626',
        textColor: '#ffffff',
        typography: fontRegistry.createDefaultTypography({
          font: oswald,
          sizePt: 14,
          weight: '700',
          color: '#ffffff',
        }),
        prefix: '-',
      },
      layoutDirection: 'stacked',
      gapMm: 1.5,
    };
  }

  public createDefaultUnitPricePayload(): UnitPriceElementPayload {
    const roboto = fontRegistry.createFontReference('Roboto');
    return {
      priceBinding: 'SELLING_PRICE',
      weightVolumeBinding: 'UNIT_WEIGHT_VALUE',
      measureUnit: 'kg',
      calculationMode: 'per_kg',
      format: numberFormatter.createDefaultFormat({ maximumFractionDigits: 2 }),
      typography: fontRegistry.createDefaultTypography({
        font: roboto,
        sizePt: 9,
        weight: '500',
        color: '#64748b',
      }),
      prefixText: 'Soit ',
      suffixPattern: '{price} / {unit}',
    };
  }
}

export const pricingEngine = PricingEngine.getInstance();

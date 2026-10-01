/**
 * E-Studio Dedicated Business Engines (Section 4)
 * - PricingEngine
 * - TaxEngine
 * - UnitPriceEngine
 * - DiscountEngine
 * - CurrencyEngine
 * - PackagingEngine
 */

import { Money, Measurement } from '../canvas/formatting/types';
import { unitRegistry } from '../canvas/formatting/unitRegistry';
import { TaxPresentation, PriceCharge, ResolvedTax, ResolvedCharge } from './models';

// ============================================================================
// 1. TAX ENGINE
// ============================================================================

export class TaxEngine {
  public static calculateTax(
    basePrice: Money,
    taxConfig?: TaxPresentation
  ): ResolvedTax | undefined {
    if (!taxConfig) return undefined;

    const rate = typeof taxConfig.rate === 'number' ? taxConfig.rate : 0;
    const mode = taxConfig.mode || 'included';

    let amountValue = 0;
    if (typeof taxConfig.amount === 'object' && taxConfig.amount && 'amount' in taxConfig.amount) {
      amountValue = taxConfig.amount.amount;
    } else if (rate > 0) {
      if (mode === 'included') {
        // Prix TTC -> Montant TVA = PrixTTC - (PrixTTC / (1 + rate/100))
        amountValue = basePrice.amount - basePrice.amount / (1 + rate / 100);
      } else {
        // Prix HT -> Montant TVA = PrixHT * (rate / 100)
        amountValue = basePrice.amount * (rate / 100);
      }
    }

    const label = typeof taxConfig.label === 'string' ? taxConfig.label : mode === 'included' ? 'TTC' : 'HT';

    return {
      mode,
      rate,
      amount: { amount: Math.round(amountValue * 100) / 100, currency: basePrice.currency },
      label,
    };
  }
}

// ============================================================================
// 2. UNIT PRICE ENGINE
// ============================================================================

export class UnitPriceEngine {
  public static calculateUnitPrice(
    price: Money,
    measure: Measurement,
    targetUnitId: string = 'kg',
    customFactor?: number
  ): { unitPrice: Money; targetUnit: string } | null {
    if (price.amount <= 0 || measure.value <= 0) return null;

    let targetQuantity = 1;
    let targetUnitSymbol = targetUnitId;

    if (customFactor && customFactor > 0) {
      const rawPrice = (price.amount / measure.value) * customFactor;
      return {
        unitPrice: { amount: Math.round(rawPrice * 100) / 100, currency: price.currency },
        targetUnit: targetUnitSymbol,
      };
    }

    // Utilisation de UnitRegistry pour la conversion automatique
    const targetDef = unitRegistry.getUnit(targetUnitId);
    if (targetDef) {
      targetUnitSymbol = targetDef.symbol;
      const convertedVal = unitRegistry.convert(measure.value, measure.unit, targetDef.id);
      if (convertedVal && convertedVal > 0) {
        const rawPrice = price.amount / convertedVal;
        return {
          unitPrice: { amount: Math.round(rawPrice * 100) / 100, currency: price.currency },
          targetUnit: targetUnitSymbol,
        };
      }
    }

    // Repli direct par défaut
    const rawPrice = price.amount / measure.value;
    return {
      unitPrice: { amount: Math.round(rawPrice * 100) / 100, currency: price.currency },
      targetUnit: targetUnitSymbol,
    };
  }
}

// ============================================================================
// 3. DISCOUNT ENGINE
// ============================================================================

export class DiscountEngine {
  public static calculateDiscount(
    regularPrice: Money,
    promotionalPrice: Money
  ): { percent: number; savings: Money; percentLabel: string } | null {
    if (regularPrice.amount <= 0 || promotionalPrice.amount <= 0) return null;
    if (promotionalPrice.amount >= regularPrice.amount) return null;

    const diff = regularPrice.amount - promotionalPrice.amount;
    const percent = Math.round((diff / regularPrice.amount) * 100);

    return {
      percent,
      savings: { amount: Math.round(diff * 100) / 100, currency: regularPrice.currency },
      percentLabel: `-${percent}%`,
    };
  }
}

// ============================================================================
// 4. CURRENCY ENGINE
// ============================================================================

export class CurrencyEngine {
  public static convert(
    sourcePrice: Money,
    targetCurrency: string,
    exchangeRate: number,
    mode: 'multiply' | 'divide' = 'divide'
  ): Money {
    if (exchangeRate <= 0) return { amount: sourcePrice.amount, currency: targetCurrency };
    const converted = mode === 'multiply' ? sourcePrice.amount * exchangeRate : sourcePrice.amount / exchangeRate;
    return {
      amount: Math.round(converted * 100) / 100,
      currency: targetCurrency,
    };
  }
}

// ============================================================================
// 5. PACKAGING ENGINE
// ============================================================================

export class PackagingEngine {
  public static calculatePackagingPrice(
    basePiecePrice: Money,
    piecesPerPack: number
  ): Money {
    return {
      amount: Math.round(basePiecePrice.amount * piecesPerPack * 100) / 100,
      currency: basePiecePrice.currency,
    };
  }
}

// ============================================================================
// 6. CHARGES ENGINE
// ============================================================================

export class ChargesEngine {
  public static resolveCharges(
    charges: PriceCharge[],
    currency: string
  ): ResolvedCharge[] {
    return charges.map((c) => {
      const amt = typeof c.amount === 'object' && c.amount && 'amount' in c.amount ? c.amount.amount : 0;
      const lbl = typeof c.label === 'string' ? c.label : '';
      return {
        type: c.type,
        amount: { amount: amt, currency },
        label: lbl,
        includedInDisplayedPrice: c.includedInDisplayedPrice ?? true,
      };
    });
  }
}

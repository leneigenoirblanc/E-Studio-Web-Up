/**
 * E-Studio Semantic Pricing Model & Context Resolution (Sections 5-29, 95-97, 108)
 *
 * SÉPARATION STRICTE :
 * Le Pricing Engine décide CE QUE SIGNIFIE le prix (valeur, promotion, unité, taxes, règles).
 * Il ne connaît ni le Canvas, ni React, ni les pixels, ni le CSS.
 */

import { Money, Measurement } from '../canvas/formatting/types';
import { unitRegistry } from '../canvas/formatting/unitRegistry';

// ============================================================================
// 1. PRICING CONTEXT (Section 7)
// ============================================================================

export type CustomerSegment = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR' | 'VIP' | 'MEMBER';
export type SalesChannel = 'STORE' | 'ECOMMERCE' | 'ESL' | 'B2B';

export interface PricingContext {
  product: Record<string, any>;
  store?: {
    id: string;
    name: string;
  };
  customerSegment?: CustomerSegment;
  channel?: SalesChannel;
  quantity?: number;
  dateTime?: string; // ISO 8601
  currency?: string;
  taxContext?: {
    defaultRate: number; // e.g. 19.25 or 20
    defaultMode: 'included' | 'excluded';
  };
}

// ============================================================================
// 2. PRICING INTENT (Section 8)
// Déclaration d'intention portée par le gabarit, sans calcul préalable
// ============================================================================

export interface PricingIntent {
  primarySource?: string; // e.g. "SELLING_PRICE"
  referenceSource?: string; // e.g. "RECOMMENDED_PRICE"
  promotionalSource?: string; // e.g. "PROMOPRICE"
  memberSource?: string; // e.g. "MEMBER_PRICE"
  unitPricingEnabled?: boolean;
  measureSource?: string; // e.g. "UNIT_WEIGHT_VALUE"
  measureUnitSource?: string; // e.g. "UNIT_WEIGHT_UNIT"
  targetUnit?: string; // e.g. "kg", "L"
  tierPricingEnabled?: boolean;
  tiersSource?: string; // e.g. "TIERS"
  secondaryCurrencyEnabled?: boolean;
  targetCurrency?: string; // e.g. "EUR"
  exchangeRate?: number; // e.g. 655.957
  conversionMode?: 'multiply' | 'divide';
  taxRate?: number;
  taxMode?: 'included' | 'excluded';
  ecoFeeSource?: string; // e.g. "ECO_TAX"
}

// ============================================================================
// 3. EXPLANATIONS & PROVENANCE (Sections 28-29, 95, 97)
// Audit trail transparent : "Pourquoi ce prix est-il affiché à ce montant ?"
// ============================================================================

export interface PricingExplanation {
  step: string;
  description: string;
  sourceField?: string;
  impactValue?: number | string;
}

export interface PriceProvenance {
  field: string;
  source: 'IMPORT' | 'REFERENCE' | 'USER' | 'RULE' | 'COMPUTED';
  sourceKey?: string;
}

// ============================================================================
// 4. RESOLVED SEMANTIC PRICE (Section 27)
// ============================================================================

export interface SemanticTier {
  minQuantity: number;
  maxQuantity?: number;
  price: Money;
  unitPrice?: Money;
  label: string;
  discountPercent?: number;
}

export interface SemanticTax {
  mode: 'included' | 'excluded';
  rate: number;
  amount: Money;
  label: string;
}

export interface SemanticCharge {
  type: 'deposit' | 'eco_fee' | 'service' | 'shipping' | 'surcharge';
  amount: Money;
  label: string;
  includedInDisplayedPrice: boolean;
}

export interface SemanticPriceResult {
  status: 'VALID' | 'PROMOTIONAL' | 'WHOLESALE' | 'NOT_AVAILABLE' | 'ERROR';
  primary: Money;
  effectivePrice: Money;
  reference?: Money;
  promotional?: Money;
  member?: Money;
  unitPrice?: {
    price: Money;
    targetUnit: string;
    basisMeasurement: Measurement;
  };
  discount?: {
    percent: number;
    amountSaved: Money;
    label: string;
  };
  tiers?: SemanticTier[];
  taxes?: SemanticTax[];
  charges?: SemanticCharge[];
  secondaryCurrency?: Money;
  explanations: PricingExplanation[];
  provenance: PriceProvenance[];
}

// ============================================================================
// 5. SEMANTIC PRICING RESOLUTION ENGINE (Sections 4, 74)
// ============================================================================

export class SemanticPricingEngine {
  private static instance: SemanticPricingEngine | null = null;

  public static getInstance(): SemanticPricingEngine {
    if (!this.instance) {
      this.instance = new SemanticPricingEngine();
    }
    return this.instance;
  }

  /**
   * Résout sémantiquement un prix selon l'intention et le contexte métier complet
   */
  public resolve(intent: PricingIntent, context: PricingContext): SemanticPriceResult {
    const { product, customerSegment = 'RETAIL', quantity = 1 } = context;
    const currency = context.currency || product.CURRENCY || product.currency || 'FCFA';

    const explanations: PricingExplanation[] = [];
    const provenance: PriceProvenance[] = [];

    // 1. Extraction du prix primaire de base
    const primaryKey = intent.primarySource || 'SELLING_PRICE';
    const rawPrimary = Number(product[primaryKey] || product.SELLING_PRICE || product.price || 0);

    const basePrimary: Money = {
      amount: rawPrimary,
      currency,
    };

    provenance.push({
      field: 'primary',
      source: 'IMPORT',
      sourceKey: primaryKey,
    });

    explanations.push({
      step: 'Prix de Base',
      description: `Lecture de la colonne "${primaryKey}" : ${rawPrimary} ${currency}`,
      sourceField: primaryKey,
      impactValue: rawPrimary,
    });

    let effectivePrice = { ...basePrimary };
    let status: SemanticPriceResult['status'] = rawPrimary > 0 ? 'VALID' : 'NOT_AVAILABLE';

    // 2. Gestion du prix promotionnel
    const promoKey = intent.promotionalSource || 'PROMOPRICE';
    const rawPromo = Number(product[promoKey] || product.PROMOPRICE || product.promo_price || 0);
    let promotional: Money | undefined = undefined;
    let reference: Money | undefined = undefined;
    let discount: SemanticPriceResult['discount'] = undefined;

    if (rawPromo > 0 && rawPromo < rawPrimary) {
      promotional = { amount: rawPromo, currency };
      reference = { amount: rawPrimary, currency };
      effectivePrice = { amount: rawPromo, currency };
      status = 'PROMOTIONAL';

      const diff = rawPrimary - rawPromo;
      const pct = Math.round((diff / rawPrimary) * 100);

      discount = {
        percent: pct,
        amountSaved: { amount: diff, currency },
        label: `-${pct}%`,
      };

      provenance.push({ field: 'promotional', source: 'IMPORT', sourceKey: promoKey });
      provenance.push({ field: 'discount', source: 'COMPUTED' });

      explanations.push({
        step: 'Promotion Active',
        description: `Prix promo détecté sur "${promoKey}" (${rawPromo} ${currency}) inférieur au prix normal (${rawPrimary} ${currency}). Remise calculée : -${pct}%.`,
        sourceField: promoKey,
        impactValue: rawPromo,
      });
    } else if (intent.referenceSource && product[intent.referenceSource]) {
      const refVal = Number(product[intent.referenceSource]);
      if (refVal > 0) {
        reference = { amount: refVal, currency };
        provenance.push({ field: 'reference', source: 'IMPORT', sourceKey: intent.referenceSource });
      }
    }

    // 3. Gestion du Segment Client (B2B, Membre, Grossiste)
    let member: Money | undefined = undefined;
    if (customerSegment === 'MEMBER' && intent.memberSource && product[intent.memberSource]) {
      const memberVal = Number(product[intent.memberSource]);
      if (memberVal > 0) {
        member = { amount: memberVal, currency };
        effectivePrice = { amount: memberVal, currency };
        explanations.push({
          step: 'Tarif Membre / Fidélité',
          description: `Application du segment "MEMBER" via "${intent.memberSource}" : ${memberVal} ${currency}`,
          sourceField: intent.memberSource,
          impactValue: memberVal,
        });
      }
    }

    // 4. Paliers Dégressifs & Volume (Wholesale / Tiers)
    let tiers: SemanticTier[] | undefined = undefined;
    if (intent.tierPricingEnabled || product.TIERS || product.TIER_1_PRICE) {
      tiers = this.resolveTiers(product, currency);
      if (tiers.length > 0) {
        // Sélection du palier applicable selon la quantité du contexte
        const matchedTier = tiers.slice().reverse().find((t) => quantity >= t.minQuantity);
        if (matchedTier && matchedTier.price.amount > 0 && customerSegment === 'WHOLESALE') {
          effectivePrice = matchedTier.price;
          status = 'WHOLESALE';
          explanations.push({
            step: 'Palier Volume Grossiste',
            description: `Quantité commandée = ${quantity} unités. Application du palier "${matchedTier.label}" (${matchedTier.price.amount} ${currency})`,
            impactValue: matchedTier.price.amount,
          });
        }
      }
    }

    // 5. Calcul du Prix Unitaire Légal (Prix au kilo / litre)
    let unitPriceResult: SemanticPriceResult['unitPrice'] = undefined;
    if (intent.unitPricingEnabled !== false) {
      const measureVal = Number(
        product[intent.measureSource || 'UNIT_WEIGHT_VALUE'] ||
        product.UNIT_WEIGHT_VALUE ||
        product.NET_WEIGHT ||
        product.CASE_SIZE ||
        0
      );
      const measureUnit = String(
        product[intent.measureUnitSource || 'UNIT_WEIGHT_UNIT'] ||
        product.UNIT_WEIGHT_UNIT ||
        product.SELLING_UNIT ||
        'g'
      ).trim();

      if (measureVal > 0 && effectivePrice.amount > 0) {
        const targetUnitId = intent.targetUnit || 'kg';
        const converted = unitRegistry.convert(measureVal, measureUnit, targetUnitId);
        if (converted && converted > 0) {
          const rawUnitAmount = effectivePrice.amount / converted;
          unitPriceResult = {
            price: { amount: Math.round(rawUnitAmount * 100) / 100, currency },
            targetUnit: targetUnitId,
            basisMeasurement: { value: measureVal, unit: measureUnit },
          };

          explanations.push({
            step: 'Prix Unitaire Légal',
            description: `Conversion de ${measureVal} ${measureUnit} vers ${targetUnitId}. Prix unitaire calculé : ${unitPriceResult.price.amount} ${currency} / ${targetUnitId}`,
            impactValue: unitPriceResult.price.amount,
          });
        }
      }
    }

    // 6. Fiscalité (TVA TTC / HT)
    let taxes: SemanticTax[] | undefined = undefined;
    if (intent.taxRate || context.taxContext?.defaultRate) {
      const rate = intent.taxRate || context.taxContext?.defaultRate || 20;
      const mode = intent.taxMode || context.taxContext?.defaultMode || 'included';

      const taxAmount =
        mode === 'included'
          ? effectivePrice.amount - effectivePrice.amount / (1 + rate / 100)
          : effectivePrice.amount * (rate / 100);

      taxes = [
        {
          mode,
          rate,
          amount: { amount: Math.round(taxAmount * 100) / 100, currency },
          label: mode === 'included' ? 'TVA incluse' : 'TVA en sus',
        },
      ];

      explanations.push({
        step: 'Régime Fiscal',
        description: `${mode === 'included' ? 'Prix TTC' : 'Prix HT'} avec taux de ${rate}%. Part fiscale : ${taxes[0].amount.amount} ${currency}`,
        impactValue: rate,
      });
    }

    // 7. Charges & Éco-redevances
    let charges: SemanticCharge[] | undefined = undefined;
    const ecoFeeVal = Number(product[intent.ecoFeeSource || 'ECO_TAX'] || product.ECO_TAX || 0);
    if (ecoFeeVal > 0) {
      charges = [
        {
          type: 'eco_fee',
          amount: { amount: ecoFeeVal, currency },
          label: `Dont ${ecoFeeVal} ${currency} d'éco-part`,
          includedInDisplayedPrice: true,
        },
      ];
      explanations.push({
        step: 'Éco-contribution',
        description: `Montant d'éco-participation inclus : ${ecoFeeVal} ${currency}`,
        impactValue: ecoFeeVal,
      });
    }

    // 8. Conversion Deuxième Devise
    let secondaryCurrency: Money | undefined = undefined;
    if (intent.secondaryCurrencyEnabled && intent.targetCurrency && intent.exchangeRate) {
      const rate = intent.exchangeRate;
      const converted =
        intent.conversionMode === 'multiply'
          ? effectivePrice.amount * rate
          : effectivePrice.amount / rate;

      secondaryCurrency = {
        amount: Math.round(converted * 100) / 100,
        currency: intent.targetCurrency,
      };

      explanations.push({
        step: 'Conversion Multi-Devise',
        description: `Taux de conversion : 1 ${intent.targetCurrency} = ${rate} ${currency}. Montant converti : ${secondaryCurrency.amount} ${intent.targetCurrency}`,
        impactValue: secondaryCurrency.amount,
      });
    }

    return {
      status,
      primary: basePrimary,
      effectivePrice,
      reference,
      promotional,
      member,
      unitPrice: unitPriceResult,
      discount,
      tiers,
      taxes,
      charges,
      secondaryCurrency,
      explanations,
      provenance,
    };
  }

  private resolveTiers(product: Record<string, any>, currency: string): SemanticTier[] {
    const tiers: SemanticTier[] = [];

    // Détection de colonnes TIER_1_QTY, TIER_1_PRICE, etc.
    for (let i = 1; i <= 5; i++) {
      const qtyKey = `TIER_${i}_QTY`;
      const priceKey = `TIER_${i}_PRICE`;
      if (product[qtyKey] && product[priceKey]) {
        const minQty = Number(product[qtyKey]);
        const priceVal = Number(product[priceKey]);
        if (minQty > 0 && priceVal > 0) {
          tiers.push({
            minQuantity: minQty,
            price: { amount: priceVal, currency },
            label: `Dès ${minQty} pièces`,
          });
        }
      }
    }

    // Détection si TIERS est un JSON pré-enregistré
    if (tiers.length === 0 && product.TIERS) {
      try {
        const parsed = typeof product.TIERS === 'string' ? JSON.parse(product.TIERS) : product.TIERS;
        if (Array.isArray(parsed)) {
          parsed.forEach((t: any) => {
            if (t.minQuantity && t.price) {
              tiers.push({
                minQuantity: t.minQuantity,
                maxQuantity: t.maxQuantity,
                price: typeof t.price === 'number' ? { amount: t.price, currency } : t.price,
                label: t.label || `≥ ${t.minQuantity}`,
              });
            }
          });
        }
      } catch {}
    }

    return tiers;
  }
}

export const semanticPricingEngine = SemanticPricingEngine.getInstance();

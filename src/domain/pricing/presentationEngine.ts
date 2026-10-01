/**
 * E-Studio Price Presentation Engine (Sections 30-42, 75-76)
 *
 * Transforme le résultat métier sémantique (SemanticPriceResult / ResolvedPrice)
 * en un arbre visuel prêt pour le rendu (ResolvedPricePresentation), sans recalculer aucun prix.
 */

import { SemanticPriceResult } from './semanticPricing';
import { PriceElement, PriceDisplaySlot } from './presentation';
import { enterpriseNumberFormatter } from '../canvas/formatting/numberFormatter';
import { fontRegistry } from '../elements/v2/fontRegistry';

export interface FormattedSlotPart {
  text: string;
  cssStyle: React.CSSProperties;
  visible: boolean;
}

export interface ResolvedPricePresentation {
  mode: string;
  // Composants du prix principal
  primary: {
    sign: FormattedSlotPart;
    integer: FormattedSlotPart;
    decimalSeparator: FormattedSlotPart;
    fraction: FormattedSlotPart;
    currency: FormattedSlotPart;
    unit?: FormattedSlotPart;
    prefix?: FormattedSlotPart;
    fullFormatted: string;
  };
  // Prix de référence / Ancien prix barré
  reference?: {
    fullText: string;
    strikethrough: boolean;
    cssStyle: React.CSSProperties;
  };
  // Badge de remise promotionnelle
  discount?: {
    label: string;
    backgroundColor: string;
    textColor: string;
    shape: string;
    cssStyle: React.CSSProperties;
  };
  // Prix unitaire légal (au kilo / litre)
  unitPrice?: {
    fullText: string;
    cssStyle: React.CSSProperties;
  };
  // Prix membre / fidélité
  member?: {
    fullText: string;
    badgeLabel: string;
    cssStyle: React.CSSProperties;
  };
  // Grille dégressive volume B2B
  tierRows?: Array<{
    label: string;
    priceFormatted: string;
  }>;
  // Deuxième devise
  secondaryCurrency?: {
    fullText: string;
    cssStyle: React.CSSProperties;
  };
  // Fiscalité & charges
  taxSummary?: string;
  chargeSummary?: string;
}

export class PricePresentationEngine {
  private static instance: PricePresentationEngine | null = null;

  public static getInstance(): PricePresentationEngine {
    if (!this.instance) {
      this.instance = new PricePresentationEngine();
    }
    return this.instance;
  }

  /**
   * Construit la représentation visuelle canonique à partir des données sémantiques et de la configuration de présentation
   */
  public buildPresentation(
    semantic: SemanticPriceResult,
    element: PriceElement
  ): ResolvedPricePresentation {
    const formatting = element.formatting || enterpriseNumberFormatter.createDefaultFormat();
    const typography = element.typography;
    const display = element.display || { mode: 'single', slots: [], currencyPosition: 'after', currencySpacing: true };
    const appearance = element.appearance || {};

    const activeAmount = semantic.effectivePrice.amount;
    const currencySym = semantic.effectivePrice.currency;
    const parts = enterpriseNumberFormatter.format(activeAmount, formatting);

    // Styles typographiques par slot
    const defaultCss = fontRegistry.toCssProperties(typography.default as any);
    const intCss = typography.slots?.integer ? fontRegistry.toCssProperties(typography.slots.integer as any) : defaultCss;
    const decSepCss = typography.slots?.decimalSeparator ? fontRegistry.toCssProperties(typography.slots.decimalSeparator as any) : defaultCss;
    const fracCss = typography.slots?.fraction ? fontRegistry.toCssProperties(typography.slots.fraction as any) : defaultCss;
    const currCss = typography.slots?.currency ? fontRegistry.toCssProperties(typography.slots.currency as any) : defaultCss;
    const unitCss = typography.slots?.unit ? fontRegistry.toCssProperties(typography.slots.unit as any) : defaultCss;
    const prefixCss = typography.slots?.prefix ? fontRegistry.toCssProperties(typography.slots.prefix as any) : defaultCss;

    const hasFraction = parts.fraction.length > 0;

    // 1. Prix Principal Décomposé
    const primary = {
      sign: { text: parts.sign, cssStyle: intCss, visible: Boolean(parts.sign) },
      integer: { text: parts.integer, cssStyle: intCss, visible: true },
      decimalSeparator: { text: parts.decimalSeparator, cssStyle: decSepCss, visible: hasFraction },
      fraction: { text: parts.fraction, cssStyle: fracCss, visible: hasFraction },
      currency: { text: currencySym, cssStyle: currCss, visible: true },
      unit: semantic.unitPrice
        ? { text: `/ ${semantic.unitPrice.targetUnit}`, cssStyle: unitCss, visible: true }
        : undefined,
      prefix: undefined,
      fullFormatted: `${parts.fullFormatted} ${currencySym}`,
    };

    // 2. Prix de Référence Barré
    let reference: ResolvedPricePresentation['reference'] = undefined;
    if (semantic.reference && semantic.reference.amount > 0) {
      const refParts = enterpriseNumberFormatter.format(semantic.reference.amount, formatting);
      reference = {
        fullText: `${refParts.fullFormatted} ${semantic.reference.currency}`,
        strikethrough: true,
        cssStyle: {
          color: '#64748b',
          fontSize: '0.85em',
          textDecoration: 'line-through',
          textDecorationColor: display.strikethroughColor || '#ef4444',
        },
      };
    }

    // 3. Badge de Remise
    let discount: ResolvedPricePresentation['discount'] = undefined;
    if (semantic.discount) {
      discount = {
        label: semantic.discount.label,
        backgroundColor: appearance.badgeColor || '#dc2626',
        textColor: appearance.badgeTextColor || '#ffffff',
        shape: appearance.badgeShape || 'pill',
        cssStyle: {
          backgroundColor: appearance.badgeColor || '#dc2626',
          color: appearance.badgeTextColor || '#ffffff',
          fontWeight: 800,
          borderRadius: appearance.badgeShape === 'pill' ? '9999px' : '4px',
        },
      };
    }

    // 4. Prix Unitaire Légal
    let unitPrice: ResolvedPricePresentation['unitPrice'] = undefined;
    if (semantic.unitPrice) {
      const uParts = enterpriseNumberFormatter.format(semantic.unitPrice.price.amount, formatting);
      unitPrice = {
        fullText: `Soit ${uParts.fullFormatted} ${semantic.unitPrice.price.currency} / ${semantic.unitPrice.targetUnit}`,
        cssStyle: {
          fontSize: '0.75em',
          color: '#64748b',
          ...unitCss,
        },
      };
    }

    // 5. Prix Membre
    let member: ResolvedPricePresentation['member'] = undefined;
    if (semantic.member) {
      const mParts = enterpriseNumberFormatter.format(semantic.member.amount, formatting);
      member = {
        fullText: `${mParts.fullFormatted} ${semantic.member.currency}`,
        badgeLabel: 'Club',
        cssStyle: {
          color: '#047857',
          fontWeight: 700,
        },
      };
    }

    // 6. Paliers de Volume B2B
    let tierRows: ResolvedPricePresentation['tierRows'] = undefined;
    if (semantic.tiers && semantic.tiers.length > 0) {
      tierRows = semantic.tiers.map((t) => ({
        label: t.label,
        priceFormatted: `${enterpriseNumberFormatter.format(t.price.amount, formatting).fullFormatted} ${t.price.currency}`,
      }));
    }

    // 7. Seconde Devise
    let secondaryCurrency: ResolvedPricePresentation['secondaryCurrency'] = undefined;
    if (semantic.secondaryCurrency) {
      const sParts = enterpriseNumberFormatter.format(semantic.secondaryCurrency.amount, formatting);
      secondaryCurrency = {
        fullText: `(~ ${sParts.fullFormatted} ${semantic.secondaryCurrency.currency})`,
        cssStyle: {
          fontSize: '0.75em',
          color: '#64748b',
        },
      };
    }

    // 8. Fiscalité & Éco-redevances
    const taxSummary = semantic.taxes?.map((t) => `${t.label} ${t.rate}%`).join(', ');
    const chargeSummary = semantic.charges?.map((c) => c.label).join(', ');

    return {
      mode: display.mode || 'single',
      primary,
      reference,
      discount,
      unitPrice,
      member,
      tierRows,
      secondaryCurrency,
      taxSummary,
      chargeSummary,
    };
  }
}

export const pricePresentationEngine = PricePresentationEngine.getInstance();

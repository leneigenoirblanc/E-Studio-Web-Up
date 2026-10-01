/**
 * E-Studio High-Fidelity Price Element Renderer V2 (Sections 21-45, 59, 71)
 *
 * Moteur de rendu unifié pour l'élément composable `PriceElement` (type: 'price') :
 * - Rendu slot-par-slot avec polices illimitées (Integer, Decimal, Fraction, Currency, Unit, etc.)
 * - Résolution complète via `PricingEngine.resolvePrice()`
 * - Modes d'affichage : single, stacked, inline, comparison, breakdown, tier_table, custom
 * - Support complet des sous-modèles : Promo, Unitaire, Membre, Paliers B2B, Devis, Fourchette, Éco-taxes, Multi-devises
 * - Maintien de la compatibilité ascendante avec les sous-types historiques
 */

import React from 'react';
import {
  PriceBlockElementPayload,
  PromoPriceElementPayload,
  UnitPriceElementPayload,
  DiscountBadgeElementPayload,
} from '../domain/pricing/types';
import { PriceElement } from '../domain/pricing/presentation';
import { pricingEngine } from '../domain/pricing/pricingEngine';
import { fontRegistry } from '../domain/elements/v2/fontRegistry';
import { enterpriseNumberFormatter } from '../domain/canvas/formatting/numberFormatter';
import { ProductRecord } from '../types';

interface PriceElementRendererProps {
  type: string;
  payload: any;
  product?: ProductRecord;
  className?: string;
  style?: React.CSSProperties;
}

export const PriceElementRenderer: React.FC<PriceElementRendererProps> = ({
  type,
  payload,
  product = {} as ProductRecord,
  className = '',
  style = {},
}) => {
  // ==========================================================================
  // A. NOUVEAU RENDU COMPOSABLE : TYPE === 'PRICE' (Section 21)
  // ==========================================================================
  if (type === 'price') {
    const el = payload as PriceElement;
    const resolved = pricingEngine.resolvePrice(el, product);
    const formatting = el.formatting || enterpriseNumberFormatter.createDefaultFormat();
    const typography = el.typography;
    const display = el.display || {
      mode: 'single',
      slots: [],
      currencyPosition: 'after',
      currencySpacing: true,
    };
    const appearance = el.appearance || {};

    // Résolution des montants principaux
    const activePrice = resolved.promotional || resolved.primary || { amount: 0, currency: 'FCFA' };
    const priceParts = enterpriseNumberFormatter.format(activePrice.amount, formatting);

    // Typographies par slot résolues de manière robuste avec héritage
    const defaultRaw = typography?.default || (typography as any)?.integer || {
      fontFamily: 'Plus Jakarta Sans',
      sizePt: 28,
      weight: '800',
      color: '#0f172a',
    };
    const defaultStyle = fontRegistry.toCssProperties(defaultRaw);

    const resolveSlotStyle = (slotObj: any) => {
      if (!slotObj) return defaultStyle;
      const merged = { ...defaultRaw, ...slotObj };
      return fontRegistry.toCssProperties(merged);
    };

    const intStyle = resolveSlotStyle(typography?.slots?.integer);
    const decSepStyle = resolveSlotStyle(typography?.slots?.decimalSeparator);
    const fracStyle = resolveSlotStyle(typography?.slots?.fraction);
    const currStyle = resolveSlotStyle(typography?.slots?.currency);
    const unitStyle = resolveSlotStyle(typography?.slots?.unit);
    const prefixStyle = resolveSlotStyle(typography?.slots?.prefix);

    const hasFraction = priceParts.fraction.length > 0;
    const isPromoActive = Boolean(resolved.promotional && resolved.reference);

    return (
      <div
        className={`flex flex-col select-none overflow-hidden ${className}`}
        style={{
          backgroundColor: appearance.fillColor,
          borderColor: appearance.borderColor,
          borderWidth: appearance.borderWidthMm ? `${appearance.borderWidthMm}mm` : undefined,
          borderRadius: appearance.cornerRadiusMm ? `${appearance.cornerRadiusMm}mm` : undefined,
          padding: appearance.paddingMm
            ? `${appearance.paddingMm.top}mm ${appearance.paddingMm.right}mm ${appearance.paddingMm.bottom}mm ${appearance.paddingMm.left}mm`
            : undefined,
          ...style,
        }}
      >
        {/* 1. Ligne Supérieure : Prix de Référence Barré & Badge Remise (Mode Promo) */}
        {isPromoActive && resolved.reference && (
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="relative inline-block opacity-70">
              <span className="text-sm line-through text-slate-500 font-semibold">
                {enterpriseNumberFormatter.format(resolved.reference.amount, formatting).fullFormatted}{' '}
                {resolved.reference.currency}
              </span>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderTop: `2px solid ${display.strikethroughColor || '#ef4444'}`,
                  top: '50%',
                  transform: display.strikethroughStyle === 'diagonal' ? 'rotate(-12deg)' : undefined,
                }}
              />
            </div>

            {resolved.discount && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: appearance.badgeColor || '#dc2626' }}
              >
                {resolved.discount.label || `-${resolved.discount.percent}%`}
              </span>
            )}
          </div>
        )}

        {/* 2. Prix Devis / Fourchette */}
        {resolved.quoteText ? (
          <div className="text-2xl font-bold tracking-tight text-slate-800" style={defaultStyle}>
            {resolved.quoteText}
          </div>
        ) : resolved.range ? (
          <div className="flex items-baseline gap-1" style={defaultStyle}>
            <span style={intStyle}>
              {enterpriseNumberFormatter.format(resolved.range.minimum.amount, formatting).fullFormatted}
            </span>
            <span className="text-slate-400 font-medium">{resolved.range.separator}</span>
            <span style={intStyle}>
              {enterpriseNumberFormatter.format(resolved.range.maximum.amount, formatting).fullFormatted}
            </span>
            <span style={currStyle}>{resolved.range.minimum.currency}</span>
          </div>
        ) : (
          /* 3. Bloc Prix Principal Composite (Slot-par-slot) */
          <div className="inline-flex items-baseline flex-nowrap whitespace-nowrap leading-none">
            {/* Devise Avant */}
            {display.currencyPosition === 'before' && (
              <span style={currStyle} className="mr-1.5">
                {activePrice.currency}
              </span>
            )}

            {/* Partie Entière */}
            <span style={intStyle} className="tracking-tight">
              {priceParts.sign}
              {priceParts.integer}
            </span>

            {/* Séparateur & Fraction */}
            {hasFraction && (
              <div className="inline-flex items-baseline ml-0.5">
                <span style={decSepStyle}>{priceParts.decimalSeparator}</span>
                <span style={fracStyle}>{priceParts.fraction}</span>
              </div>
            )}

            {/* Devise Après / Exposant */}
            {display.currencyPosition === 'after' && (
              <span style={currStyle} className="ml-1.5">
                {activePrice.currency}
              </span>
            )}
            {display.currencyPosition === 'superscript' && (
              <span
                style={{ ...currStyle, verticalAlign: 'super', fontSize: '0.6em' }}
                className="ml-0.5"
              >
                {activePrice.currency}
              </span>
            )}
          </div>
        )}

        {/* 4. Prix Unitaire Légal (au kg / L) */}
        {resolved.unit && (
          <div className="text-[11px] text-slate-500 font-medium mt-0.5" style={unitStyle}>
            Soit{' '}
            {enterpriseNumberFormatter.format(resolved.unit.amount, formatting).fullFormatted}{' '}
            {resolved.unit.currency} / {resolved.targetUnitLabel || 'kg'}
          </div>
        )}

        {/* 5. Prix Membre / Fidélité */}
        {resolved.member && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mt-1">
            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[10px]">
              Club
            </span>
            <span>
              {enterpriseNumberFormatter.format(resolved.member.amount, formatting).fullFormatted}{' '}
              {resolved.member.currency}
            </span>
          </div>
        )}

        {/* 6. Grille Dégressive B2B (Tier Table) */}
        {resolved.tiers && resolved.tiers.length > 0 && (
          <div className="mt-1.5 border border-slate-200 rounded text-[10px] overflow-hidden">
            <table className="w-full border-collapse">
              <tbody>
                {resolved.tiers.map((t, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="px-2 py-0.5 text-slate-600 font-medium">{t.label}</td>
                    <td className="px-2 py-0.5 text-right font-bold text-slate-900">
                      {enterpriseNumberFormatter.format(t.price.amount, formatting).fullFormatted}{' '}
                      {t.price.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. Taxes & Éco-redevances */}
        <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-400">
          {resolved.taxes?.map((tax, i) => (
            <span key={i}>
              {tax.label} {tax.rate ? `(${tax.rate}%)` : ''}
            </span>
          ))}
          {resolved.charges?.map((c, i) => (
            <span key={i}>{c.label}</span>
          ))}
          {resolved.secondaryCurrency && (
            <span className="font-medium text-slate-500">
              (~{' '}
              {
                enterpriseNumberFormatter.format(resolved.secondaryCurrency.amount, formatting)
                  .fullFormatted
              }{' '}
              {resolved.secondaryCurrency.currency})
            </span>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // B. COMPATIBILITÉ HISTORIQUE : TYPE === 'PRICE_BLOCK'
  // ==========================================================================
  if (type === 'price_block') {
    const p = payload as PriceBlockElementPayload;
    const slots = pricingEngine.resolvePriceSlots(p, product);
    const unitText = product[p.unitBinding || ''] || p.unitDefaultText || '';

    const integerStyle = fontRegistry.toCssProperties(p.typography.integer);
    const decSepStyle = fontRegistry.toCssProperties(p.typography.decimalSeparator);
    const fractionStyle = fontRegistry.toCssProperties(p.typography.fraction);
    const currencyStyle = fontRegistry.toCssProperties(p.typography.currency);
    const unitStyle = p.typography.unit ? fontRegistry.toCssProperties(p.typography.unit) : {};
    const prefixStyle = p.typography.prefix ? fontRegistry.toCssProperties(p.typography.prefix) : {};

    const hasFraction = slots.fraction.length > 0;
    const showDecimals = p.display.showFraction && (hasFraction || p.display.showDecimalIfZero);

    return (
      <div
        className={`inline-flex items-baseline flex-wrap ${className}`}
        style={{
          ...style,
          backgroundColor: p.boxAppearance?.fillColor,
          borderColor: p.boxAppearance?.borderColor,
          borderWidth: p.boxAppearance?.borderWidthMm ? `${p.boxAppearance.borderWidthMm}mm` : undefined,
          borderRadius: p.boxAppearance?.cornerRadiusMm ? `${p.boxAppearance.cornerRadiusMm}mm` : undefined,
          padding: p.boxAppearance?.paddingMm
            ? `${p.boxAppearance.paddingMm.top}mm ${p.boxAppearance.paddingMm.right}mm ${p.boxAppearance.paddingMm.bottom}mm ${p.boxAppearance.paddingMm.left}mm`
            : undefined,
        }}
      >
        {p.prefixText && (
          <span style={prefixStyle} className="mr-1">
            {p.prefixText}
          </span>
        )}

        {p.currency?.position === 'before' && p.display?.showCurrency && (
          <span style={currencyStyle} className="mr-1">
            {slots.currency}
          </span>
        )}

        {p.display?.showInteger && (
          <span style={integerStyle}>
            {slots.sign}
            {slots.integer}
          </span>
        )}

        {showDecimals && (
          <>
            <span style={decSepStyle}>{slots.decimalSeparator}</span>
            <span style={fractionStyle}>{slots.fraction || '00'}</span>
          </>
        )}

        {p.currency?.position === 'after' && p.display?.showCurrency && (
          <span style={currencyStyle} className="ml-1.5">
            {slots.currency}
          </span>
        )}

        {p.currency?.position === 'superscript' && p.display?.showCurrency && (
          <span
            style={{ ...currencyStyle, verticalAlign: 'super', fontSize: '0.6em' }}
            className="ml-0.5"
          >
            {slots.currency}
          </span>
        )}

        {p.display?.showUnit && unitText && (
          <span style={unitStyle} className="ml-2">
            / {unitText}
          </span>
        )}

        {p.suffixText && <span className="ml-1 text-slate-500 text-xs">{p.suffixText}</span>}
      </div>
    );
  }

  // ==========================================================================
  // C. COMPATIBILITÉ HISTORIQUE : TYPE === 'PROMO_PRICE'
  // ==========================================================================
  if (type === 'promo_price') {
    const p = payload as PromoPriceElementPayload;
    const regularVal = Number(product[p.regularPriceBinding] || product.SELLING_PRICE || 0);
    const promoVal = Number(product[p.promoPriceBinding] || product.PROMOPRICE || 0);
    const hasPromo = promoVal > 0 && promoVal < regularVal;

    const discount = pricingEngine.calculatePromoDiscount(regularVal, promoVal);
    const regularFormatted = pricingEngine.resolvePriceSlots(
      {
        valueBinding: p.regularPriceBinding,
        format: p.format,
        typography: p.promoPriceStyle.typography,
        currency: p.promoPriceStyle.currency,
        display: { showInteger: true, showFraction: true, showCurrency: true, showUnit: false, showDecimalIfZero: false },
      },
      product
    ).fullFormatted;

    const promoBlockPayload: PriceBlockElementPayload = {
      valueBinding: p.promoPriceBinding,
      format: p.format,
      display: { showInteger: true, showFraction: true, showCurrency: true, showUnit: false, showDecimalIfZero: false },
      typography: p.promoPriceStyle.typography,
      currency: p.promoPriceStyle.currency,
    };

    return (
      <div
        className={`flex ${p.layoutDirection === 'stacked' ? 'flex-col' : 'items-center'} gap-1.5 ${className}`}
        style={style}
      >
        {hasPromo && (
          <div className="flex items-center gap-2">
            {p.regularPriceStyle.prefixText && (
              <span className="text-[10px] text-slate-400 font-semibold">
                {p.regularPriceStyle.prefixText}
              </span>
            )}
            <div className="relative inline-block">
              <span
                style={fontRegistry.toCssProperties(p.regularPriceStyle.typography)}
                className="opacity-75"
              >
                {regularFormatted}
              </span>
              {p.regularPriceStyle.strikethrough.enabled && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderTop: `${p.regularPriceStyle.strikethrough.thicknessPt}px solid ${p.regularPriceStyle.strikethrough.color}`,
                    top: '50%',
                    transform:
                      p.regularPriceStyle.strikethrough.type === 'diagonal' ? 'rotate(-10deg)' : undefined,
                  }}
                />
              )}
            </div>

            {p.discountBadge?.enabled && discount && (
              <span
                style={{
                  ...fontRegistry.toCssProperties(p.discountBadge.typography),
                  backgroundColor: p.discountBadge.backgroundColor,
                  color: p.discountBadge.textColor,
                }}
                className={`px-2 py-0.5 font-bold shadow-xs ${
                  p.discountBadge.shape === 'pill'
                    ? 'rounded-full'
                    : p.discountBadge.shape === 'circle'
                    ? 'rounded-full w-8 h-8 flex items-center justify-center'
                    : 'rounded-md'
                }`}
              >
                {p.discountBadge.mode === 'percent'
                  ? discount.percentFormatted
                  : `-${discount.amountSaved} ${p.promoPriceStyle.currency.symbol || 'FCFA'}`}
              </span>
            )}
          </div>
        )}

        <PriceElementRenderer
          type="price_block"
          payload={hasPromo ? promoBlockPayload : { ...promoBlockPayload, valueBinding: p.regularPriceBinding }}
          product={product}
        />
      </div>
    );
  }

  // ==========================================================================
  // D. COMPATIBILITÉ HISTORIQUE : TYPE === 'UNIT_PRICE'
  // ==========================================================================
  if (type === 'unit_price') {
    const p = payload as UnitPriceElementPayload;
    const res = pricingEngine.calculateUnitPrice(p, product);
    if (!res) return null;

    return (
      <span style={{ ...fontRegistry.toCssProperties(p.typography), ...style }} className={className}>
        {res.unitPriceFormatted}
      </span>
    );
  }

  // ==========================================================================
  // E. COMPATIBILITÉ HISTORIQUE : TYPE === 'DISCOUNT_BADGE'
  // ==========================================================================
  if (type === 'discount_badge') {
    const p = payload as DiscountBadgeElementPayload;
    const regularVal = Number(product[p.regularPriceBinding || 'SELLING_PRICE'] || 0);
    const promoVal = Number(product[p.promoPriceBinding || 'PROMOPRICE'] || 0);
    const discount = pricingEngine.calculatePromoDiscount(regularVal, promoVal);

    const label =
      p.calculationMode === 'fixed_value' ? p.fixedValue || '-20%' : discount?.percentFormatted || '-20%';

    return (
      <div
        style={{
          ...fontRegistry.toCssProperties(p.typography),
          backgroundColor: p.badgeColor,
          borderColor: p.borderColor,
          borderWidth: p.borderWidthMm ? `${p.borderWidthMm}mm` : undefined,
          transform: p.rotationDeg ? `rotate(${p.rotationDeg}deg)` : undefined,
          ...style,
        }}
        className={`inline-flex items-center justify-center px-3 py-1 font-bold shadow-sm ${
          p.shape === 'pill'
            ? 'rounded-full'
            : p.shape === 'circle'
            ? 'rounded-full w-12 h-12'
            : 'rounded-lg'
        } ${className}`}
      >
        {label}
      </div>
    );
  }

  return null;
};

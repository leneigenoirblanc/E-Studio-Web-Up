/**
 * E-Studio Enterprise Number & Currency Formatter
 * Gère le formatage des montants monétaires et numériques avec groupement occidental/indien,
 * séparateurs configurables, arrondis stricts et découpage en sous-parties (slots) pour la typographie.
 */

import { NumberFormat, RoundingMode } from './types';

export interface FormattedPriceSlots {
  sign: string; // "+" ou "-" ou ""
  prefix: string;
  integer: string; // ex: "2 500"
  decimalSeparator: string; // ex: "," ou "." ou ""
  fraction: string; // ex: "00" ou "99" ou ""
  currency: string; // ex: "FCFA" ou "€"
  suffix: string;
  fullFormatted: string; // ex: "2 500,00 FCFA"
}

export class NumberFormatter {
  private static instance: NumberFormatter | null = null;

  public static getInstance(): NumberFormatter {
    if (!this.instance) {
      this.instance = new NumberFormatter();
    }
    return this.instance;
  }

  public createDefaultFormat(overrides: Partial<NumberFormat> = {}): NumberFormat {
    return {
      grouping: 'western',
      thousandsSeparator: 'space',
      decimalSeparator: ',',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      trimTrailingZeros: true,
      roundingMode: 'half_up',
      showPlusSign: false,
      negativeStyle: 'minus',
      zeroDisplay: 'zero',
      ...overrides,
    };
  }

  /**
   * Applique le mode d'arrondi sur un nombre décimal
   */
  public round(value: number, decimals: number, mode: RoundingMode): number {
    const factor = Math.pow(10, decimals);
    switch (mode) {
      case 'floor':
        return Math.floor(value * factor) / factor;
      case 'ceil':
        return Math.ceil(value * factor) / factor;
      case 'up':
        return value >= 0 ? Math.ceil(value * factor) / factor : Math.floor(value * factor) / factor;
      case 'down':
        return value >= 0 ? Math.floor(value * factor) / factor : Math.ceil(value * factor) / factor;
      case 'half_up':
      default:
        return Math.round(value * factor) / factor;
    }
  }

  /**
   * Formate la partie entière selon la stratégie de groupement (Western 3 par 3 ou Indien 3 puis 2 par 2)
   */
  private formatIntegerPart(
    intStr: string,
    grouping: NumberFormat['grouping'],
    sep: string
  ): string {
    if (grouping === 'none' || !sep) return intStr;

    if (grouping === 'indian') {
      // Format indien: 12,34,567
      if (intStr.length <= 3) return intStr;
      const lastThree = intStr.slice(-3);
      const otherDigits = intStr.slice(0, -3);
      const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, sep);
      return formattedOther + sep + lastThree;
    }

    // Format occidental standard : 1 234 567
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }

  /**
   * Formate un montant et produit les sous-parties décomposées pour le rendu par slots
   */
  public formatPrice(
    amount: number | string | undefined | null,
    format: NumberFormat,
    currencySymbol: string = 'FCFA',
    currencyPosition: 'before' | 'after' | 'superscript' | 'subscript' | 'stacked' = 'after'
  ): FormattedPriceSlots {
    const num = Number(amount);

    if (isNaN(num)) {
      return {
        sign: '',
        prefix: '',
        integer: '--',
        decimalSeparator: '',
        fraction: '',
        currency: currencySymbol,
        suffix: '',
        fullFormatted: `-- ${currencySymbol}`,
      };
    }

    if (num === 0) {
      if (format.zeroDisplay === 'empty') {
        return {
          sign: '',
          prefix: '',
          integer: '',
          decimalSeparator: '',
          fraction: '',
          currency: '',
          suffix: '',
          fullFormatted: '',
        };
      }
      if (format.zeroDisplay === 'dash') {
        return {
          sign: '',
          prefix: '',
          integer: '—',
          decimalSeparator: '',
          fraction: '',
          currency: currencySymbol,
          suffix: '',
          fullFormatted: `— ${currencySymbol}`,
        };
      }
    }

    const isNegative = num < 0;
    const absVal = Math.abs(num);
    const rounded = this.round(absVal, format.maximumFractionDigits, format.roundingMode);

    // Résolution du séparateur de milliers
    let thousandsSep = ' ';
    if (format.thousandsSeparator === 'none') thousandsSep = '';
    else if (format.thousandsSeparator === 'nbsp') thousandsSep = '\u00A0';
    else if (format.thousandsSeparator === 'nnbsp') thousandsSep = '\u202F';
    else if (format.thousandsSeparator === 'space') thousandsSep = ' ';
    else if (format.thousandsSeparator === ',') thousandsSep = ',';
    else if (format.thousandsSeparator === '.') thousandsSep = '.';
    else if (format.thousandsSeparator === "'") thousandsSep = "'";
    else if (format.thousandsSeparator === 'custom' && format.customThousandsSeparator) {
      thousandsSep = format.customThousandsSeparator;
    }

    // Résolution du séparateur décimal
    let decimalSep = ',';
    if (format.decimalSeparator === '.') decimalSep = '.';
    else if (format.decimalSeparator === ',') decimalSep = ',';
    else if (format.decimalSeparator === 'custom' && format.customDecimalSeparator) {
      decimalSep = format.customDecimalSeparator;
    }

    // Découpage entier / décimales
    const fixedStr = rounded.toFixed(format.maximumFractionDigits);
    const [rawInt, rawFrac = ''] = fixedStr.split('.');

    const formattedInt = this.formatIntegerPart(rawInt, format.grouping, thousandsSep);

    let formattedFrac = rawFrac;
    if (format.trimTrailingZeros) {
      formattedFrac = formattedFrac.replace(/0+$/, '');
    }
    // Remplir jusqu'au minimum de décimales requis
    while (formattedFrac.length < format.minimumFractionDigits) {
      formattedFrac += '0';
    }

    const activeDecSep = formattedFrac.length > 0 ? decimalSep : '';
    const sign = isNegative ? '-' : format.showPlusSign ? '+' : '';

    const priceCore = activeDecSep ? `${formattedInt}${activeDecSep}${formattedFrac}` : formattedInt;
    const fullFormatted =
      currencyPosition === 'before'
        ? `${sign}${currencySymbol} ${priceCore}`.trim()
        : `${sign}${priceCore} ${currencySymbol}`.trim();

    return {
      sign,
      prefix: '',
      integer: formattedInt,
      decimalSeparator: activeDecSep,
      fraction: formattedFrac,
      currency: currencySymbol,
      suffix: '',
      fullFormatted,
    };
  }
}

export const numberFormatter = NumberFormatter.getInstance();

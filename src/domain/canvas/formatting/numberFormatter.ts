/**
 * E-Studio Enterprise Number Formatter V2 (Section 19)
 * Gère le formatage complet avec groupements occidental/indien,
 * séparateurs d'espaces insécables (nbsp, nnbsp), arrondis stricts
 * et découpage des slots pour la typographie fine.
 */

import { NumberFormat, RoundingMode } from './types';

export interface FormattedPriceParts {
  sign: string;
  integer: string;
  decimalSeparator: string;
  fraction: string;
  fullFormatted: string;
}

export class EnterpriseNumberFormatter {
  private static instance: EnterpriseNumberFormatter | null = null;

  public static getInstance(): EnterpriseNumberFormatter {
    if (!this.instance) {
      this.instance = new EnterpriseNumberFormatter();
    }
    return this.instance;
  }

  public createDefaultFormat(overrides: Partial<NumberFormat> = {}): NumberFormat {
    return {
      useGrouping: true,
      groupingStyle: 'western',
      thousandsSeparator: 'space',
      decimalSeparator: ',',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      roundingMode: 'half_up',
      trimTrailingZeros: true,
      ...overrides,
    };
  }

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
      case 'half_even': {
        const temp = value * factor;
        const floor = Math.floor(temp);
        const diff = temp - floor;
        if (Math.abs(diff - 0.5) < 1e-9) {
          return (floor % 2 === 0 ? floor : floor + 1) / factor;
        }
        return Math.round(temp) / factor;
      }
      case 'half_down': {
        const temp = value * factor;
        const diff = temp - Math.floor(temp);
        return (diff <= 0.5 ? Math.floor(temp) : Math.ceil(temp)) / factor;
      }
      case 'half_up':
      default:
        return Math.round(value * factor) / factor;
    }
  }

  public format(amount: number | string | undefined | null, format?: Partial<NumberFormat>): FormattedPriceParts {
    const activeFormat = { ...this.createDefaultFormat(), ...format };
    const num = Number(amount);

    if (isNaN(num)) {
      return {
        sign: '',
        integer: '--',
        decimalSeparator: '',
        fraction: '',
        fullFormatted: '--',
      };
    }

    const isNegative = num < 0;
    const absVal = Math.abs(num);
    const rounded = this.round(absVal, activeFormat.maximumFractionDigits, activeFormat.roundingMode);

    // Résolution du séparateur de milliers
    let thousandsSep = ' ';
    if (!activeFormat.useGrouping || activeFormat.thousandsSeparator === 'none') {
      thousandsSep = '';
    } else if (activeFormat.thousandsSeparator === 'space') {
      thousandsSep = ' ';
    } else if (activeFormat.thousandsSeparator === 'nbsp') {
      thousandsSep = '\u00A0';
    } else if (activeFormat.thousandsSeparator === 'nnbsp') {
      thousandsSep = '\u202F';
    } else if (activeFormat.thousandsSeparator === ',') {
      thousandsSep = ',';
    } else if (activeFormat.thousandsSeparator === '.') {
      thousandsSep = '.';
    } else if (activeFormat.thousandsSeparator === "'") {
      thousandsSep = "'";
    } else if (activeFormat.thousandsSeparator === 'custom' && activeFormat.customThousandsSeparator) {
      thousandsSep = activeFormat.customThousandsSeparator;
    }

    // Résolution du séparateur décimal
    let decimalSep = ',';
    if (activeFormat.decimalSeparator === '.') {
      decimalSep = '.';
    } else if (activeFormat.decimalSeparator === ',') {
      decimalSep = ',';
    } else if (activeFormat.decimalSeparator === 'custom' && activeFormat.customDecimalSeparator) {
      decimalSep = activeFormat.customDecimalSeparator;
    }

    // Découpage entier / décimal
    const fixedStr = rounded.toFixed(activeFormat.maximumFractionDigits);
    const [rawInt, rawFrac = ''] = fixedStr.split('.');

    // Groupement de l'entier
    let formattedInt = rawInt;
    if (activeFormat.useGrouping && thousandsSep) {
      if (activeFormat.groupingStyle === 'indian') {
        if (formattedInt.length > 3) {
          const lastThree = formattedInt.slice(-3);
          const others = formattedInt.slice(0, -3);
          formattedInt = others.replace(/\B(?=(\d{2})+(?!\d))/g, thousandsSep) + thousandsSep + lastThree;
        }
      } else {
        formattedInt = formattedInt.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
      }
    }

    // Gestion des décimales
    let formattedFrac = rawFrac;
    if (activeFormat.trimTrailingZeros) {
      formattedFrac = formattedFrac.replace(/0+$/, '');
    }
    while (formattedFrac.length < activeFormat.minimumFractionDigits) {
      formattedFrac += '0';
    }

    const activeDecSep = formattedFrac.length > 0 ? decimalSep : '';
    const sign = isNegative ? '-' : activeFormat.showPlusSign ? '+' : '';
    const fullFormatted = activeDecSep ? `${sign}${formattedInt}${activeDecSep}${formattedFrac}` : `${sign}${formattedInt}`;

    return {
      sign,
      integer: formattedInt,
      decimalSeparator: activeDecSep,
      fraction: formattedFrac,
      fullFormatted,
    };
  }
}

export const enterpriseNumberFormatter = EnterpriseNumberFormatter.getInstance();

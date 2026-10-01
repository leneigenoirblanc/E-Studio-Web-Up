/**
 * E-Studio Number Formatting, Units & Currency Types (Sections 19, 20, 24)
 */

export type RoundingMode = 'half_up' | 'half_down' | 'half_even' | 'ceil' | 'floor' | 'up' | 'down';

export interface NumberFormat {
  locale?: string;
  useGrouping: boolean;
  groupingStyle: 'locale' | 'western' | 'indian' | 'custom';
  thousandsSeparator: 'locale' | 'none' | 'space' | 'nbsp' | 'nnbsp' | ',' | '.' | "'" | 'custom';
  customThousandsSeparator?: string;
  decimalSeparator: 'locale' | '.' | ',' | 'custom';
  customDecimalSeparator?: string;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  roundingMode: RoundingMode;
  trimTrailingZeros: boolean;
  showPlusSign?: boolean;
}

export type MeasurementCategory =
  | 'mass'
  | 'volume'
  | 'length'
  | 'area'
  | 'count'
  | 'packaging'
  | 'custom';

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  category: MeasurementCategory;
  baseUnit?: string;
  conversionFactor?: number; // Multiply by this to get base unit
}

export interface Measurement {
  value: number;
  unit: string;
}

export interface Money {
  amount: number;
  currency: string;
}

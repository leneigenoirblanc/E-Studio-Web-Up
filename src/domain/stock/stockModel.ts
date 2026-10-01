/**
 * E-Studio Stock & Physical Medium Model
 * 
 * Stock is the physical medium:
 * - A4 sheet grid (label size, gaps, margins, known part code like Avery)
 * - Thermal roll (media width, label length, gap or black mark, DPI 203/300/600, darkness, origin offset)
 */

export type StockType = 'sheet' | 'roll';

export type ThermalDPI = 203 | 300 | 600;

export interface SheetStockProfile {
  id: string;
  type: 'sheet';
  name: string;
  partNumber?: string; // e.g. "Avery L7163"
  manufacturer?: string;
  sheetWidthMm: number; // usually 210 for A4
  sheetHeightMm: number; // usually 297 for A4
  labelWidthMm: number;
  labelHeightMm: number;
  columns: number;
  rows: number;
  labelsPerSheet: number;
  marginTopMm: number;
  marginLeftMm: number;
  gapHorizontalMm: number;
  gapVerticalMm: number;
  cornerRadiusMm?: number;
}

export interface RollStockProfile {
  id: string;
  type: 'roll';
  name: string;
  partNumber?: string;
  mediaWidthMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
  sensorType: 'gap' | 'black_mark' | 'continuous';
  gapLengthMm: number;
  dpi: ThermalDPI;
  darkness: number; // 0 to 30
  originOffsetXmm: number;
  originOffsetYmm: number;
  speedIps?: number; // inches per second
}

export type StockProfile = SheetStockProfile | RollStockProfile;

// ============================================================================
// Standard Stock Catalog Preloads
// ============================================================================

export const PRELOADED_STOCKS: StockProfile[] = [
  // A4 Sheet Profiles
  {
    id: 'avery-l7163',
    type: 'sheet',
    name: 'Avery L7163 (99.1 × 38.1 mm)',
    partNumber: 'L7163',
    manufacturer: 'Avery',
    sheetWidthMm: 210,
    sheetHeightMm: 297,
    labelWidthMm: 99.1,
    labelHeightMm: 38.1,
    columns: 2,
    rows: 7,
    labelsPerSheet: 14,
    marginTopMm: 15.1,
    marginLeftMm: 4.6,
    gapHorizontalMm: 2.5,
    gapVerticalMm: 0,
    cornerRadiusMm: 2,
  },
  {
    id: 'avery-l7160',
    type: 'sheet',
    name: 'Avery L7160 (63.5 × 38.1 mm)',
    partNumber: 'L7160',
    manufacturer: 'Avery',
    sheetWidthMm: 210,
    sheetHeightMm: 297,
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    columns: 3,
    rows: 7,
    labelsPerSheet: 21,
    marginTopMm: 15.1,
    marginLeftMm: 7.2,
    gapHorizontalMm: 2.5,
    gapVerticalMm: 0,
    cornerRadiusMm: 2,
  },
  {
    id: 'retail-promo-100x50',
    type: 'sheet',
    name: 'Planche Retail 10-up (100 × 50 mm)',
    partNumber: 'RET-10050',
    manufacturer: 'E-Studio Standard',
    sheetWidthMm: 210,
    sheetHeightMm: 297,
    labelWidthMm: 100,
    labelHeightMm: 50,
    columns: 2,
    rows: 5,
    labelsPerSheet: 10,
    marginTopMm: 15,
    marginLeftMm: 4,
    gapHorizontalMm: 2,
    gapVerticalMm: 3,
    cornerRadiusMm: 1.5,
  },
  {
    id: 'avery-l7165',
    type: 'sheet',
    name: 'Avery L7165 (99.1 × 67.7 mm)',
    partNumber: 'L7165',
    manufacturer: 'Avery',
    sheetWidthMm: 210,
    sheetHeightMm: 297,
    labelWidthMm: 99.1,
    labelHeightMm: 67.7,
    columns: 2,
    rows: 4,
    labelsPerSheet: 8,
    marginTopMm: 13.1,
    marginLeftMm: 4.6,
    gapHorizontalMm: 2.5,
    gapVerticalMm: 0,
    cornerRadiusMm: 2,
  },
  // Thermal Roll Profiles
  {
    id: 'roll-zebra-100x150',
    type: 'roll',
    name: 'Rouleau Logistique 100 × 150 mm (203 DPI)',
    partNumber: 'Z-PERFORM-100150',
    mediaWidthMm: 104,
    labelWidthMm: 100,
    labelHeightMm: 150,
    sensorType: 'gap',
    gapLengthMm: 3,
    dpi: 203,
    darkness: 18,
    originOffsetXmm: 0,
    originOffsetYmm: 0,
    speedIps: 4,
  },
  {
    id: 'roll-zebra-100x50',
    type: 'roll',
    name: 'Rouleau Gondole 100 × 50 mm (203 DPI)',
    partNumber: 'Z-SELECT-10050',
    mediaWidthMm: 104,
    labelWidthMm: 100,
    labelHeightMm: 50,
    sensorType: 'gap',
    gapLengthMm: 3,
    dpi: 203,
    darkness: 20,
    originOffsetXmm: 0,
    originOffsetYmm: 0,
    speedIps: 6,
  },
  {
    id: 'roll-zebra-58x40',
    type: 'roll',
    name: 'Rouleau Prix Rayon 58 × 40 mm (300 DPI)',
    partNumber: 'Z-SELECT-5840',
    mediaWidthMm: 62,
    labelWidthMm: 58,
    labelHeightMm: 40,
    sensorType: 'gap',
    gapLengthMm: 2.5,
    dpi: 300,
    darkness: 22,
    originOffsetXmm: 0,
    originOffsetYmm: 0,
    speedIps: 4,
  },
];

// ============================================================================
// Thermal Dot Conversion Math
// ============================================================================

export function mmToDots(mm: number, dpi: ThermalDPI = 203): number {
  // 1 inch = 25.4 mm
  const dotsPerMm = dpi / 25.4;
  return Math.round(mm * dotsPerMm);
}

export function dotsToMm(dots: number, dpi: ThermalDPI = 203): number {
  const mmPerDot = 25.4 / dpi;
  return Number((dots * mmPerDot).toFixed(3));
}

export function snapMmToThermalDots(mm: number, dpi: ThermalDPI = 203): number {
  return dotsToMm(mmToDots(mm, dpi), dpi);
}

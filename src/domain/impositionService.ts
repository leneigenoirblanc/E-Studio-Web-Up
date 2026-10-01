/**
 * Imposition Domain Service
 * Pure mathematical calculation engine for print imposition:
 * sheet dimensions, rows/cols calculation, margin & gutter distribution,
 * crop marks, cut guides, and page layout plans.
 */

export interface SheetDimensions {
  widthMm: number;
  heightMm: number;
  name: string;
}

export const STANDARD_SHEETS: Record<string, SheetDimensions> = {
  A4: { widthMm: 210, heightMm: 297, name: 'A4 (210 x 297 mm)' },
  A3: { widthMm: 297, heightMm: 420, name: 'A3 (297 x 420 mm)' },
  LETTER: { widthMm: 215.9, heightMm: 279.4, name: 'US Letter (8.5 x 11 in)' },
  ROLL_100: { widthMm: 100, heightMm: 150, name: 'Rouleau Thermique 100 mm' },
  SHELF_STRIP: { widthMm: 950, heightMm: 38, name: 'Bande de Rive Rayon 950x38 mm' },
};

export interface ImpositionConfig {
  sheetType: 'A4' | 'A3' | 'LETTER' | 'CUSTOM' | 'ROLL';
  sheetWidthMm: number;
  sheetHeightMm: number;
  orientation: 'portrait' | 'landscape';
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  gutterHorizontalMm: number;
  gutterVerticalMm: number;
  showCropMarks: boolean;
  showCutLines: boolean;
  bleedMm: number;
}

export interface LabelSlotCoordinates {
  colIndex: number;
  rowIndex: number;
  slotIndex: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface ImpositionPlan {
  labelsPerRow: number;
  labelsPerCol: number;
  labelsPerPage: number;
  totalPages: number;
  effectiveWidthMm: number;
  effectiveHeightMm: number;
  printableWidthMm: number;
  printableHeightMm: number;
  slotsPerPage: LabelSlotCoordinates[];
}

export class ImpositionService {
  /**
   * Calculates the exact imposition matrix for a given label size and target sheet
   */
  public static calculatePlan(
    labelWidthMm: number,
    labelHeightMm: number,
    config: ImpositionConfig,
    totalItemsCount: number
  ): ImpositionPlan {
    const isLandscape = config.orientation === 'landscape';
    const effectiveSheetWidth = isLandscape
      ? Math.max(config.sheetWidthMm, config.sheetHeightMm)
      : Math.min(config.sheetWidthMm, config.sheetHeightMm);
    const effectiveSheetHeight = isLandscape
      ? Math.min(config.sheetWidthMm, config.sheetHeightMm)
      : Math.max(config.sheetWidthMm, config.sheetHeightMm);

    const printableWidth = effectiveSheetWidth - (config.marginLeftMm + config.marginRightMm);
    const printableHeight = effectiveSheetHeight - (config.marginTopMm + config.marginBottomMm);

    // Calculate how many labels fit horizontally and vertically
    // Formula: N * labelWidth + (N - 1) * gutter <= printableWidth
    const labelsPerRow = Math.max(
      1,
      Math.floor((printableWidth + config.gutterHorizontalMm) / (labelWidthMm + config.gutterHorizontalMm))
    );

    const labelsPerCol = Math.max(
      1,
      Math.floor((printableHeight + config.gutterVerticalMm) / (labelHeightMm + config.gutterVerticalMm))
    );

    const labelsPerPage = labelsPerRow * labelsPerCol;
    const totalPages = Math.max(1, Math.ceil(totalItemsCount / labelsPerPage));

    // Calculate slots coordinates for a single sheet
    const slotsPerPage: LabelSlotCoordinates[] = [];
    let slotIdx = 0;

    for (let row = 0; row < labelsPerCol; row++) {
      for (let col = 0; col < labelsPerRow; col++) {
        const xMm = config.marginLeftMm + col * (labelWidthMm + config.gutterHorizontalMm);
        const yMm = config.marginTopMm + row * (labelHeightMm + config.gutterVerticalMm);

        slotsPerPage.push({
          colIndex: col,
          rowIndex: row,
          slotIndex: slotIdx++,
          xMm: Math.round(xMm * 100) / 100,
          yMm: Math.round(yMm * 100) / 100,
          widthMm: labelWidthMm,
          heightMm: labelHeightMm,
        });
      }
    }

    return {
      labelsPerRow,
      labelsPerCol,
      labelsPerPage,
      totalPages,
      effectiveWidthMm: effectiveSheetWidth,
      effectiveHeightMm: effectiveSheetHeight,
      printableWidthMm: printableWidth,
      printableHeightMm: printableHeight,
      slotsPerPage,
    };
  }

  /**
   * Distributes items across page sheets, returning slice indexes
   */
  public static paginateItems<T>(items: T[], labelsPerPage: number): T[][] {
    if (!items || items.length === 0) return [];
    const pages: T[][] = [];
    for (let i = 0; i < items.length; i += labelsPerPage) {
      pages.push(items.slice(i, i + labelsPerPage));
    }
    return pages;
  }
}

import { TemplateItem, LayoutAnchor } from '../types';

export interface DimensionChange {
  oldWidthMm: number;
  oldHeightMm: number;
  newWidthMm: number;
  newHeightMm: number;
}

/**
 * Responsive Gabarit Auto-Adaptation Engine
 * Recalculates element positions and dimensions when a template's physical dimensions change,
 * strictly honoring anchor constraints or automatically inferring quadrant anchors.
 */
export class ResponsiveLayoutEngine {
  /**
   * Infers the natural anchor constraint for an item based on its position within the template
   */
  public static inferNaturalAnchor(
    item: TemplateItem,
    templateWidthMm: number,
    templateHeightMm: number
  ): LayoutAnchor {
    if (item.anchor) return item.anchor;

    const centerX = item.x_mm + item.w_mm / 2;
    const centerY = item.y_mm + item.h_mm / 2;
    const isFullWidth = item.w_mm >= templateWidthMm * 0.75;

    if (isFullWidth) {
      return 'stretch-x';
    }

    const isLeft = centerX < templateWidthMm * 0.35;
    const isRight = centerX > templateWidthMm * 0.65;
    const isTop = centerY < templateHeightMm * 0.35;
    const isBottom = centerY > templateHeightMm * 0.65;

    if (isTop && isLeft) return 'top-left';
    if (isTop && isRight) return 'top-right';
    if (isTop) return 'top-center';
    if (isBottom && isLeft) return 'bottom-left';
    if (isBottom && isRight) return 'bottom-right';
    if (isBottom) return 'bottom-center';

    return 'center';
  }

  /**
   * Adapts all items in a template to new dimensions
   */
  public static adaptItemsToNewDimensions(
    items: TemplateItem[],
    change: DimensionChange
  ): TemplateItem[] {
    const { oldWidthMm, oldHeightMm, newWidthMm, newHeightMm } = change;

    if (oldWidthMm <= 0 || oldHeightMm <= 0 || (oldWidthMm === newWidthMm && oldHeightMm === newHeightMm)) {
      return items;
    }

    const deltaW = newWidthMm - oldWidthMm;
    const deltaH = newHeightMm - oldHeightMm;

    return items.map((item) => {
      const anchor = item.anchor || this.inferNaturalAnchor(item, oldWidthMm, oldHeightMm);

      let newX = item.x_mm;
      let newY = item.y_mm;
      let newW = item.w_mm;
      let newH = item.h_mm;

      switch (anchor) {
        case 'top-left':
          // Remains locked to top-left margin
          break;

        case 'top-center':
          newX = (item.x_mm + item.w_mm / 2) * (newWidthMm / oldWidthMm) - item.w_mm / 2;
          break;

        case 'top-right':
          // Maintain right margin
          const rightMargin = oldWidthMm - (item.x_mm + item.w_mm);
          newX = newWidthMm - rightMargin - item.w_mm;
          break;

        case 'bottom-left':
          // Maintain bottom margin
          const bottomMarginBL = oldHeightMm - (item.y_mm + item.h_mm);
          newY = newHeightMm - bottomMarginBL - item.h_mm;
          break;

        case 'bottom-center':
          newX = (item.x_mm + item.w_mm / 2) * (newWidthMm / oldWidthMm) - item.w_mm / 2;
          const bottomMarginBC = oldHeightMm - (item.y_mm + item.h_mm);
          newY = newHeightMm - bottomMarginBC - item.h_mm;
          break;

        case 'bottom-right':
          // Maintain both right and bottom margins
          const rightMarginBR = oldWidthMm - (item.x_mm + item.w_mm);
          const bottomMarginBR = oldHeightMm - (item.y_mm + item.h_mm);
          newX = newWidthMm - rightMarginBR - item.w_mm;
          newY = newHeightMm - bottomMarginBR - item.h_mm;
          break;

        case 'center':
          newX = (item.x_mm + item.w_mm / 2) * (newWidthMm / oldWidthMm) - item.w_mm / 2;
          newY = (item.y_mm + item.h_mm / 2) * (newHeightMm / oldHeightMm) - item.h_mm / 2;
          break;

        case 'stretch-x':
          const leftMargin = item.x_mm;
          const rightMarginSX = oldWidthMm - (item.x_mm + item.w_mm);
          newX = leftMargin;
          newW = Math.max(8, newWidthMm - leftMargin - rightMarginSX);
          break;

        case 'stretch-y':
          const topMargin = item.y_mm;
          const bottomMarginSY = oldHeightMm - (item.y_mm + item.h_mm);
          newY = topMargin;
          newH = Math.max(4, newHeightMm - topMargin - bottomMarginSY);
          break;

        case 'stretch-both':
          const lMargin = item.x_mm;
          const rMargin = oldWidthMm - (item.x_mm + item.w_mm);
          const tMargin = item.y_mm;
          const bMargin = oldHeightMm - (item.y_mm + item.h_mm);
          newX = lMargin;
          newY = tMargin;
          newW = Math.max(8, newWidthMm - lMargin - rMargin);
          newH = Math.max(4, newHeightMm - tMargin - bMargin);
          break;
      }

      // Keep coordinates bounded within positive space
      newX = Math.max(0, Math.min(newWidthMm - 2, Number(newX.toFixed(2))));
      newY = Math.max(0, Math.min(newHeightMm - 2, Number(newY.toFixed(2))));
      newW = Math.max(2, Math.min(newWidthMm, Number(newW.toFixed(2))));
      newH = Math.max(2, Math.min(newHeightMm, Number(newH.toFixed(2))));

      return {
        ...item,
        x_mm: newX,
        y_mm: newY,
        w_mm: newW,
        h_mm: newH,
        anchor,
      };
    });
  }
}

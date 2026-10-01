import { TemplateItem, LabelTemplate } from '../types';

export type AlignmentDirection =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom'
  | 'center_canvas_h'
  | 'center_canvas_v';

export function alignTemplateItems(
  items: TemplateItem[],
  direction: AlignmentDirection,
  template?: LabelTemplate
): TemplateItem[] {
  if (items.length === 0) return items;

  // Single item canvas centering
  if (items.length === 1 && template) {
    const item = items[0];
    if (direction === 'center_canvas_h') {
      return [{ ...item, x_mm: (template.width_mm - item.w_mm) / 2 }];
    }
    if (direction === 'center_canvas_v') {
      return [{ ...item, y_mm: (template.height_mm - item.h_mm) / 2 }];
    }
  }

  if (items.length < 2) return items;

  switch (direction) {
    case 'left': {
      const minX = Math.min(...items.map((i) => i.x_mm));
      return items.map((i) => ({ ...i, x_mm: minX }));
    }
    case 'center': {
      const centers = items.map((i) => i.x_mm + i.w_mm / 2);
      const avgCenter = centers.reduce((a, b) => a + b, 0) / items.length;
      return items.map((i) => ({ ...i, x_mm: avgCenter - i.w_mm / 2 }));
    }
    case 'right': {
      const maxRight = Math.max(...items.map((i) => i.x_mm + i.w_mm));
      return items.map((i) => ({ ...i, x_mm: maxRight - i.w_mm }));
    }
    case 'top': {
      const minY = Math.min(...items.map((i) => i.y_mm));
      return items.map((i) => ({ ...i, y_mm: minY }));
    }
    case 'middle': {
      const centers = items.map((i) => i.y_mm + i.h_mm / 2);
      const avgCenter = centers.reduce((a, b) => a + b, 0) / items.length;
      return items.map((i) => ({ ...i, y_mm: avgCenter - i.h_mm / 2 }));
    }
    case 'bottom': {
      const maxBottom = Math.max(...items.map((i) => i.y_mm + i.h_mm));
      return items.map((i) => ({ ...i, y_mm: maxBottom - i.h_mm }));
    }
    default:
      return items;
  }
}

export function distributeTemplateItems(
  items: TemplateItem[],
  axis: 'horizontal' | 'vertical'
): TemplateItem[] {
  if (items.length < 3) return items;

  if (axis === 'horizontal') {
    const sorted = [...items].sort((a, b) => a.x_mm - b.x_mm);
    const minX = sorted[0].x_mm;
    const last = sorted[sorted.length - 1];
    const maxX = last.x_mm + last.w_mm;
    const totalItemW = sorted.reduce((sum, item) => sum + item.w_mm, 0);
    const totalGap = maxX - minX - totalItemW;
    const gap = totalGap / (sorted.length - 1);

    let currentX = minX;
    return sorted.map((item) => {
      const res = { ...item, x_mm: currentX };
      currentX += item.w_mm + gap;
      return res;
    });
  } else {
    const sorted = [...items].sort((a, b) => a.y_mm - b.y_mm);
    const minY = sorted[0].y_mm;
    const last = sorted[sorted.length - 1];
    const maxY = last.y_mm + last.h_mm;
    const totalItemH = sorted.reduce((sum, item) => sum + item.h_mm, 0);
    const totalGap = maxY - minY - totalItemH;
    const gap = totalGap / (sorted.length - 1);

    let currentY = minY;
    return sorted.map((item) => {
      const res = { ...item, y_mm: currentY };
      currentY += item.h_mm + gap;
      return res;
    });
  }
}

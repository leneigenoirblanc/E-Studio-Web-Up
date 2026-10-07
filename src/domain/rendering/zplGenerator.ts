/**
 * E-Studio Canonical ZPL II Generator
 * Conforms to SECTION 10 & 11: ONE LAYOUT TRUTH
 * 
 * Derives Zebra Programming Language (ZPL) instructions directly from RenderList geometry.
 * Strictly uses physical millimetres converted to dots at specified DPI (203, 300, 600).
 */

import { RenderList, RenderPrimitive, TextPrimitive, PriceBlockPrimitive, RectPrimitive, BarcodePrimitive, LinePrimitive } from './renderList';

export interface ZplGeneratorOptions {
  dpi: 203 | 300 | 600;
  darkness?: number; // 0-30
  horizontalOffsetMm?: number;
  verticalOffsetMm?: number;
  copies?: number;
}

/**
 * Millimetre to Printer Dots converter
 * 203 DPI = 8 dots/mm (203 / 25.4)
 * 300 DPI = 11.81 dots/mm (300 / 25.4)
 */
export function mmToDots(mm: number, dpi: 203 | 300 | 600): number {
  return Math.round((mm * dpi) / 25.4);
}

/**
 * Generate ZPL II stream for a single RenderList label
 */
export function generateSingleLabelZpl(list: RenderList, options: ZplGeneratorOptions): string {
  const dpi = options.dpi || 203;
  const hOffset = options.horizontalOffsetMm || 0;
  const vOffset = options.verticalOffsetMm || 0;

  const widthDots = mmToDots(list.widthMm, dpi);
  const heightDots = mmToDots(list.heightMm, dpi);

  const lines: string[] = [];

  // 1. Label Start
  lines.push('^XA');
  lines.push('^CI28'); // UTF-8 Encoding

  // 2. Set Print Width & Label Length
  lines.push(`^PW${widthDots}`);
  lines.push(`^LL${heightDots}`);
  lines.push(`^LH0,0`); // Label Home position

  // 3. Print Darkness if specified
  if (options.darkness !== undefined && options.darkness >= 0) {
    lines.push(`~SD${Math.min(30, Math.max(0, Math.round(options.darkness)))}`);
  }

  // 4. Render Each Primitive
  for (const p of list.primitives) {
    const xDots = mmToDots(p.xMm + hOffset, dpi);
    const yDots = mmToDots(p.yMm + vOffset, dpi);
    const wDots = mmToDots(p.widthMm, dpi);
    const hDots = mmToDots(p.heightMm, dpi);

    if (p.type === 'rect') {
      const rect = p as RectPrimitive;
      const borderDots = mmToDots(rect.strokeWidthMm || 0.3, dpi);
      if (rect.fillColor && !rect.strokeColor) {
        // Solid black box
        lines.push(`^FO${xDots},${yDots}^GB${wDots},${hDots},${hDots},B^FS`);
      } else {
        // Outlined box
        lines.push(`^FO${xDots},${yDots}^GB${wDots},${hDots},${Math.max(1, borderDots)},B,0^FS`);
      }
    } else if (p.type === 'line') {
      const line = p as LinePrimitive;
      const thickDots = Math.max(1, mmToDots(line.strokeWidthMm || 0.3, dpi));
      const lineWDots = mmToDots(Math.abs(line.x2Mm - p.xMm), dpi);
      const lineHDots = mmToDots(Math.abs(line.y2Mm - p.yMm), dpi);
      lines.push(`^FO${xDots},${yDots}^GB${Math.max(1, lineWDots)},${Math.max(1, lineHDots)},${thickDots},B^FS`);
    } else if (p.type === 'text') {
      const textP = p as TextPrimitive;
      // ZPL scalable smooth vector font (Font 0)
      const fontHeightDots = Math.round((textP.fontSizePt * dpi) / 72);
      const fontWidthDots = Math.round(fontHeightDots * 0.85);

      lines.push(`^FO${xDots},${yDots}`);
      lines.push(`^A0N,${fontHeightDots},${fontWidthDots}`);
      // Clean string for ZPL safe transmission
      const safeText = (textP.text || '').replace(/\\/g, '\\\\').replace(/\^/g, '');
      lines.push(`^FD${safeText}^FS`);
    } else if (p.type === 'price_block') {
      const priceP = p as PriceBlockPrimitive;
      const slots = priceP.slots;

      // Draw Promo banner if applicable
      if (priceP.hasDiscount) {
        const badgeWDots = mmToDots(18, dpi);
        const badgeHDots = mmToDots(5, dpi);
        lines.push(`^FO${xDots},${yDots}^GB${badgeWDots},${badgeHDots},${badgeHDots},B^FS`);
        lines.push(`^FO${xDots + 4},${yDots + 2}^A0N,${Math.round(badgeHDots * 0.7)},${Math.round(badgeHDots * 0.5)}^FR^FDPROMO^FS`);
      }

      // Large Integer Part
      const mainFontH = Math.round((priceP.fontSizePt * dpi) / 72);
      const mainFontW = Math.round(mainFontH * 0.85);
      const mainYDots = yDots + (priceP.hasDiscount ? mmToDots(6, dpi) : 0);

      lines.push(`^FO${xDots},${mainYDots}`);
      lines.push(`^A0N,${mainFontH},${mainFontW}`);
      lines.push(`^FD${slots.integerPart}^FS`);

      // Fractional & Currency
      const decFontH = Math.round(mainFontH * 0.45);
      const decFontW = Math.round(decFontH * 0.85);
      const approxIntWidthDots = slots.integerPart.length * (mainFontW * 0.7);

      const decText = slots.decimalPart ? `${slots.separator}${slots.decimalPart} ${slots.currencySymbol}` : ` ${slots.currencySymbol}`;
      lines.push(`^FO${xDots + Math.round(approxIntWidthDots) + 8},${mainYDots}`);
      lines.push(`^A0N,${decFontH},${decFontW}`);
      lines.push(`^FD${decText}^FS`);

      // Strikethrough Reference price if present
      if (slots.strikethroughPrice) {
        const strikeFontH = Math.round(mainFontH * 0.32);
        const strikeY = mainYDots + mainFontH + 4;
        lines.push(`^FO${xDots},${strikeY}^A0N,${strikeFontH},${Math.round(strikeFontH * 0.8)}^FD${slots.strikethroughPrice}^FS`);
        // Strike line
        const strikeWDots = slots.strikethroughPrice.length * Math.round(strikeFontH * 0.6);
        lines.push(`^FO${xDots},${strikeY + Math.round(strikeFontH * 0.5)}^GB${strikeWDots},2,2,B^FS`);
      }
    } else if (p.type === 'barcode') {
      const barP = p as BarcodePrimitive;
      const cleanVal = barP.value.replace(/\D/g, '');
      const barHeightDots = hDots - (barP.showHumanReadable ? mmToDots(4, dpi) : 0);
      const moduleWidthDots = Math.max(2, Math.round(wDots / 95));

      if (barP.symbology === 'EAN13' && cleanVal.length === 13) {
        // EAN-13 native Zebra command: ^BEo,h,f,g
        lines.push(`^FO${xDots},${yDots}`);
        lines.push(`^BY${moduleWidthDots},2.5,${barHeightDots}`);
        lines.push(`^BEN,${barHeightDots},${barP.showHumanReadable ? 'Y' : 'N'},N`);
        lines.push(`^FD${cleanVal}^FS`);
      } else {
        // Code 128 fallback: ^BCo,h,f,g,e,m
        lines.push(`^FO${xDots},${yDots}`);
        lines.push(`^BY${moduleWidthDots},2.5,${barHeightDots}`);
        lines.push(`^BCN,${barHeightDots},${barP.showHumanReadable ? 'Y' : 'N'},N,N`);
        lines.push(`^FD${barP.value}^FS`);
      }
    } else if (p.type === 'qr') {
      // Native ZPL QR Code: ^BQN,2,<magnification>
      const mag = Math.max(2, Math.min(10, Math.round(wDots / 35)));
      lines.push(`^FO${xDots},${yDots}`);
      lines.push(`^BQN,2,${mag}`);
      lines.push(`^FDLA,${p.value}^FS`);
    }
  }

  // 5. Copies per label if specified
  if (options.copies && options.copies > 1) {
    lines.push(`^PQ${options.copies},0,1,Y`);
  }

  // 6. Label End
  lines.push('^XZ\n');

  return lines.join('\n');
}

/**
 * Generate complete ZPL batch for a list of RenderLists
 */
export function generateZplBatch(renderLists: RenderList[], options: ZplGeneratorOptions): string {
  return renderLists.map((list) => generateSingleLabelZpl(list, options)).join('\n');
}

/**
 * E-Studio IR Compiler
 * 
 * Compiles a raw LabelTemplate + ProductRecord into a fully resolved RenderScene.
 * Evaluates conditional visibility, field substitutions, barcode patterns,
 * and price components into a pure, renderer-agnostic Scene Graph.
 */

import { LabelTemplate, ProductRecord, TemplateItem } from '../../types';
import { RenderScene, IRNode, IRBarcodeBar } from './renderIR';
import { generateCode128Bars, generateEAN13Bars } from '../../utils/barcodeGenerator';
import { generateQrMatrix } from '../../utils/qrGenerator';
import { PricingEngine } from '../../utils/pricingEngine';

export interface CompileOptions {
  dpi?: number;
  bleedMm?: number;
  evaluateRules?: boolean;
}

export function compileTemplateToIR(
  template: LabelTemplate,
  product?: ProductRecord,
  options?: CompileOptions
): RenderScene {
  const dpi = options?.dpi || 300;
  const bleedMm = options?.bleedMm || 0;
  const record = product || ({} as Record<string, any>);

  const hasPromo = Boolean(
    record.PROMOPRICE &&
    Number(record.PROMOPRICE) > 0 &&
    Number(record.PROMOPRICE) < Number(record.SELLING_PRICE)
  );

  const nodes: IRNode[] = [];

  for (const item of template.items || []) {
    // 1. Evaluate Conditional Visibility
    if (!shouldDisplayItem(item, record, hasPromo)) {
      continue;
    }

    const irNode = compileItemToIRNode(item, record, hasPromo);
    if (irNode) {
      nodes.push(irNode);
    }
  }

  // Sort by z-index
  nodes.sort((a, b) => a.zIndex - b.zIndex);

  return {
    id: `scene_${template.name}_${record.id || 'preview'}_${Date.now()}`,
    templateName: template.name,
    dimensionsMm: {
      widthMm: template.width_mm,
      heightMm: template.height_mm,
    },
    bleedMm,
    dpi,
    backgroundColor: '#ffffff',
    productId: record.id,
    productName: record.ITEMNAME || 'Article Démo',
    nodes,
    metadata: {
      createdAt: Date.now(),
      hasPromo,
      ruleMutationsCount: 0,
    },
  };
}

function shouldDisplayItem(
  item: TemplateItem,
  record: Record<string, any>,
  hasPromo: boolean
): boolean {
  const cond = (item as any).conditional_display;
  if (!cond || !cond.enabled) return true;

  switch (cond.rule) {
    case 'has_promo':
      return hasPromo;
    case 'has_barcode':
      return Boolean(record.PRODUCT_SCAN && String(record.PRODUCT_SCAN).trim().length > 0);
    case 'has_tiers':
      return Boolean(record.TIER1_PRICE || record.TIER_PRICING);
    case 'field_gt_zero': {
      const val = Number(record[cond.field_key || ''] || 0);
      return val > 0;
    }
    case 'field_not_empty': {
      const val = record[cond.field_key || ''];
      return val !== undefined && val !== null && String(val).trim() !== '';
    }
    default:
      return true;
  }
}

function resolveBindingValue(
  bindingKey: string | undefined,
  record: Record<string, any>,
  fallback: string = ''
): string {
  if (!bindingKey) return fallback;
  const val = record[bindingKey];
  if (val !== undefined && val !== null && String(val).trim() !== '') {
    return String(val);
  }
  return fallback;
}

function compileItemToIRNode(
  item: TemplateItem,
  record: Record<string, any>,
  hasPromo: boolean
): IRNode | null {
  const baseBounds = {
    xMm: item.x_mm,
    yMm: item.y_mm,
    widthMm: item.w_mm,
    heightMm: item.h_mm,
  };

  const baseProps = {
    id: item.id,
    bounds: baseBounds,
    rotationDeg: item.rotation || 0,
    opacity: 1,
    zIndex: item.z_index || 0,
  };

  switch (item.type) {
    case 'text': {
      const textItem = item as any;
      let rawText = textItem.content || '';
      if (textItem.binding_key) {
        rawText = resolveBindingValue(textItem.binding_key, record, rawText);
      }

      // Variable interpolation {FIELD}
      rawText = rawText.replace(/\{(\w+)\}/g, (_: string, key: string) => {
        return record[key] !== undefined ? String(record[key]) : `{${key}}`;
      });

      return {
        ...baseProps,
        type: 'text',
        text: rawText,
        fontFamily: textItem.font_family || 'Inter, sans-serif',
        fontSizePt: textItem.font_size_pt || 10,
        fontWeight: textItem.font_weight || 'normal',
        fontStyle: textItem.font_style || 'normal',
        textAlign: textItem.alignment || 'left',
        verticalAlign: textItem.valign || 'top',
        color: textItem.text_color || '#000000',
        letterSpacingMm: textItem.letter_spacing_mm,
        autoShrink: textItem.auto_shrink,
        minFontSizePt: textItem.min_font_size_pt || 6,
        maxLines: textItem.max_lines,
        textDecoration: textItem.text_decoration || 'none',
      };
    }

    case 'price_block':
    case 'price': {
      const priceItem = item as any;
      const effectivePrice = hasPromo && record.PROMOPRICE
        ? Number(record.PROMOPRICE)
        : Number(record.SELLING_PRICE || priceItem.fallback_price || 0);

      const intPart = Math.floor(effectivePrice).toString();
      const decPart = Math.round((effectivePrice - Math.floor(effectivePrice)) * 100)
        .toString()
        .padStart(2, '0');

      const originalPriceStr = hasPromo && record.SELLING_PRICE
        ? Number(record.SELLING_PRICE).toFixed(2)
        : undefined;

      const discountPercent = hasPromo && record.SELLING_PRICE
        ? Math.round(((Number(record.SELLING_PRICE) - effectivePrice) / Number(record.SELLING_PRICE)) * 100)
        : undefined;

      return {
        ...baseProps,
        type: 'price_block',
        integerPart: intPart,
        decimalPart: decPart,
        currencySymbol: priceItem.currency_symbol || '€',
        originalPrice: originalPriceStr,
        hasPromo,
        discountPercent,
        unitPriceLegal: record.UNIT_PRICE_LEGAL,
        primaryColor: hasPromo ? '#dc2626' : (priceItem.integer_style?.text_color || '#000000'),
        accentColor: '#dc2626',
        layoutVariant: hasPromo ? 'promotional' : 'standard',
      };
    }

    case 'barcode': {
      const barcodeItem = item as any;
      const rawCode = resolveBindingValue(barcodeItem.binding_key || 'PRODUCT_SCAN', record, barcodeItem.code || '1234567890128');
      const cleanCode = rawCode.replace(/[^0-9A-Za-z]/g, '') || '123456789012';

      const isEan13 = barcodeItem.barcode_type === 'ean13' || (cleanCode.length === 13 && /^\d+$/.test(cleanCode));
      let booleanBars: boolean[] = [];

      try {
        if (isEan13) {
          const eanResult = generateEAN13Bars(cleanCode);
          booleanBars = eanResult.bars;
        } else {
          booleanBars = generateCode128Bars(cleanCode);
        }
      } catch {
        booleanBars = generateCode128Bars('123456789012');
      }

      // Convert continuous boolean array to run-length bar descriptors
      const bars: IRBarcodeBar[] = [];
      let currentBarStart = -1;

      for (let i = 0; i < booleanBars.length; i++) {
        if (booleanBars[i]) {
          if (currentBarStart === -1) currentBarStart = i;
        } else {
          if (currentBarStart !== -1) {
            bars.push({ x: currentBarStart, width: i - currentBarStart });
            currentBarStart = -1;
          }
        }
      }
      if (currentBarStart !== -1) {
        bars.push({ x: currentBarStart, width: booleanBars.length - currentBarStart });
      }

      return {
        ...baseProps,
        type: 'barcode',
        format: isEan13 ? 'EAN13' : 'CODE128',
        value: cleanCode,
        displayValue: cleanCode,
        showText: barcodeItem.show_text ?? true,
        quietZoneMm: 2.0,
        barColor: barcodeItem.bar_color || '#000000',
        bars,
        totalUnits: booleanBars.length || 95,
      };
    }

    case 'qrcode': {
      const qrItem = item as any;
      const content = resolveBindingValue(qrItem.binding_key, record, qrItem.content || 'https://e-studio.local');
      const matrix = generateQrMatrix(content);

      return {
        ...baseProps,
        type: 'qrcode',
        content,
        matrix,
        sizeModules: matrix.length,
        darkColor: qrItem.module_color || '#000000',
        lightColor: qrItem.background_color || '#ffffff',
      };
    }

    case 'shape':
    case 'ellipse': {
      const shapeItem = item as any;
      const isEllipse = item.type === 'ellipse';

      return {
        ...baseProps,
        type: 'shape',
        shapeVariant: isEllipse ? 'ellipse' : 'rectangle',
        fillColor: shapeItem.fill_color || '#f1f5f9',
        strokeColor: shapeItem.border_color,
        strokeWidthMm: shapeItem.border_width || 0,
        borderRadiusMm: shapeItem.corner_radius || 0,
      };
    }

    case 'line': {
      const lineItem = item as any;
      return {
        ...baseProps,
        type: 'line',
        x2Mm: item.x_mm + item.w_mm,
        y2Mm: item.y_mm,
        strokeColor: lineItem.color || '#000000',
        strokeWidthMm: lineItem.thickness || 0.3,
      };
    }

    case 'pictogram': {
      const pictoItem = item as any;
      return {
        ...baseProps,
        type: 'pictogram',
        iconKey: pictoItem.pictogram_type || 'origin_france',
        label: pictoItem.custom_label,
        color: '#000000',
      };
    }

    case 'image': {
      const imgItem = item as any;
      return {
        ...baseProps,
        type: 'image',
        src: imgItem.source || '',
        objectFit: imgItem.keep_aspect_ratio ? 'contain' : 'fill',
      };
    }

    default:
      return null;
  }
}

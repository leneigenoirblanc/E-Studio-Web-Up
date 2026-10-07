/**
 * E-Studio Canonical Intermediate Representation: RenderList
 * Conforms to SECTION 10 & 11: ONE LAYOUT TRUTH
 * 
 * Pipeline: Template + Row Data + Stock Profile -> RenderList -> [SVG Preview | PDF Generator | ZPL Generator]
 * All geometry is calculated deterministically in physical millimetres (mm).
 */

import { LabelTemplate, TemplateItem } from '../../types';
import { PreflightIssue } from '../workflow/types';

export type PrimitiveType =
  | 'text'
  | 'price_block'
  | 'rect'
  | 'line'
  | 'barcode'
  | 'qr'
  | 'image'
  | 'zone';

export interface BasePrimitive {
  id: string;
  type: PrimitiveType;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotation?: number; // degrees
  opacity?: number;
  clip?: boolean;
}

export interface TextPrimitive extends BasePrimitive {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSizePt: number;
  fontWeight: 'normal' | 'bold' | '500' | '600' | '700' | '800';
  fontStyle?: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  color: string;
  maxLines?: number;
  lineHeight?: number;
}

export interface PriceSlotData {
  integerPart: string;
  separator: string;
  decimalPart: string;
  currencySymbol: string;
  unitText?: string;
  strikethroughPrice?: string;
  discountPercentage?: string;
}

export interface PriceBlockPrimitive extends BasePrimitive {
  type: 'price_block';
  rawPrice: number;
  promoPrice?: number | null;
  slots: PriceSlotData;
  currency: string;
  primaryColor: string;
  accentColor: string;
  fontSizePt: number;
  badgeText?: string;
  hasDiscount: boolean;
}

export interface RectPrimitive extends BasePrimitive {
  type: 'rect';
  fillColor?: string;
  strokeColor?: string;
  strokeWidthMm?: number;
  borderRadiusMm?: number;
}

export interface LinePrimitive extends BasePrimitive {
  type: 'line';
  x2Mm: number;
  y2Mm: number;
  strokeColor: string;
  strokeWidthMm: number;
  strokeDash?: 'solid' | 'dashed' | 'dotted';
}

export interface BarcodePrimitive extends BasePrimitive {
  type: 'barcode';
  value: string;
  symbology: 'EAN13' | 'CODE128' | 'UPCA' | 'CODE39';
  showHumanReadable: boolean;
  quietZoneMm: number;
  barColor: string;
  backgroundColor: string;
  isValidChecksum: boolean;
}

export interface QrPrimitive extends BasePrimitive {
  type: 'qr';
  value: string;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  foregroundColor: string;
  backgroundColor: string;
}

export interface ImagePrimitive extends BasePrimitive {
  type: 'image';
  source: string; // url, data:image, or assetId
  fit: 'contain' | 'cover' | 'fill';
}

export interface ZonePrimitive extends BasePrimitive {
  type: 'zone';
  zoneType: 'NO_PRINT' | 'PEEL_ZONE' | 'MAGNETIC_ZONE';
  label: string;
}

export type RenderPrimitive =
  | TextPrimitive
  | PriceBlockPrimitive
  | RectPrimitive
  | LinePrimitive
  | BarcodePrimitive
  | QrPrimitive
  | ImagePrimitive
  | ZonePrimitive;

export interface RenderList {
  labelIndex: number;
  widthMm: number;
  heightMm: number;
  primitives: RenderPrimitive[];
  issues: PreflightIssue[];
}

/**
 * Standard EAN-13 Checksum validator
 */
export function validateEan13(code: string): { valid: boolean; calculatedChecksum?: number } {
  const digits = code.replace(/\D/g, '');
  if (digits.length !== 13) {
    return { valid: false };
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const remainder = sum % 10;
  const calculatedChecksum = remainder === 0 ? 0 : 10 - remainder;
  const givenChecksum = parseInt(digits[12], 10);

  return {
    valid: calculatedChecksum === givenChecksum,
    calculatedChecksum,
  };
}

/**
 * Deterministic Price Decomposer
 * Splits price into typography slots with currency exponent and integer minor unit logic
 */
export function decomposePrice(
  amount: number,
  currency = 'EUR',
  decimals = 2,
  separator = ','
): PriceSlotData {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return {
      integerPart: '0',
      separator,
      decimalPart: decimals > 0 ? '00' : '',
      currencySymbol: currency === 'EUR' ? '€' : currency === 'XAF' ? 'FCFA' : currency === 'USD' ? '$' : currency,
    };
  }

  const fixed = amount.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');

  // Thousands separator formatting (space)
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const symbolMap: Record<string, string> = {
    EUR: '€',
    XAF: 'FCFA',
    XOF: 'FCFA',
    USD: '$',
    GBP: '£',
    CHF: 'CHF',
  };

  return {
    integerPart: formattedInt,
    separator: decimals > 0 ? separator : '',
    decimalPart: decimals > 0 ? (decPart || '00') : '',
    currencySymbol: symbolMap[currency] || currency,
  };
}

/**
 * Safely resolves dynamic binding paths (e.g. "ITEMNAME", "SELLING_PRICE", "vendor.name")
 */
export function resolveBindingValue(binding: string | undefined, data: Record<string, any>): any {
  if (!binding || !data) return undefined;
  
  // Direct key lookup
  if (data[binding] !== undefined) return data[binding];
  
  // Case-insensitive lookup fallback
  const lowerBinding = binding.toLowerCase();
  for (const key of Object.keys(data)) {
    if (key.toLowerCase() === lowerBinding) {
      return data[key];
    }
  }

  // Nested path traversal: "a.b"
  if (binding.includes('.')) {
    const parts = binding.split('.');
    let curr = data;
    for (const part of parts) {
      if (curr && typeof curr === 'object') {
        curr = curr[part];
      } else {
        return undefined;
      }
    }
    return curr;
  }

  return undefined;
}

/**
 * Canonical Builder: Template + Row Data -> RenderList
 * Computes exact physical geometries and runs preflight checks on the fly.
 */
export function buildRenderList(
  template: LabelTemplate,
  rowData: Record<string, any> = {},
  labelIndex = 0,
  options: { targetDpi?: number } = {}
): RenderList {
  const widthMm = Number(template.width_mm) || 70;
  const heightMm = Number(template.height_mm) || 38;
  const primitives: RenderPrimitive[] = [];
  const issues: PreflightIssue[] = [];

  const elements = (template.items || (template as any).elements || []) as any[];

  for (const el of elements) {
    const xMm = Number(el.x) || 0;
    const yMm = Number(el.y) || 0;
    const wMm = Number(el.width) || 10;
    const hMm = Number(el.height) || 10;

    // Boundary check
    if (xMm < 0 || yMm < 0 || xMm + wMm > widthMm + 0.1 || yMm + hMm > heightMm + 0.1) {
      issues.push({
        id: `overflow-${el.id}-${labelIndex}`,
        severity: 'WARNING',
        category: 'GEOMETRY',
        field: el.name || el.id,
        message: `L'élément "${el.name || el.type}" dépasse les marges physiques du gabarit (${widthMm}x${heightMm} mm).`,
        recommendation: `Repositionner l'élément pour qu'il soit entièrement contenu dans la zone imprimable.`,
      });
    }

    // Process by element type
    if (el.type === 'text') {
      let resolvedText = el.content || '';
      if (el.binding) {
        const val = resolveBindingValue(el.binding, rowData);
        if (val !== undefined && val !== null) {
          resolvedText = String(val);
        } else {
          issues.push({
            id: `unbound-${el.id}-${labelIndex}`,
            severity: 'WARNING',
            category: 'DATA_INTEGRITY',
            field: el.binding,
            message: `Champ lié "${el.binding}" introuvable dans la ligne ${labelIndex + 1}.`,
            recommendation: `Vérifiez le mapping des colonnes ou la présence du champ dans le catalogue.`,
          });
        }
      }

      primitives.push({
        id: el.id,
        type: 'text',
        xMm,
        yMm,
        widthMm: wMm,
        heightMm: hMm,
        text: resolvedText,
        fontFamily: el.font_family || 'Plus Jakarta Sans',
        fontSizePt: Number(el.font_size) || 10,
        fontWeight: (el.font_weight as any) || 'normal',
        textAlign: (el.align as any) || 'left',
        verticalAlign: 'top',
        color: el.color || '#0f172a',
      });
    } else if (el.type === 'price') {
      let sellingPrice = Number(el.price_value) || 0;
      let promoPrice: number | null = null;

      // Extract from data row if bound
      const boundRegular = resolveBindingValue(el.binding || 'SELLING_PRICE', rowData);
      if (boundRegular !== undefined && boundRegular !== null) {
        sellingPrice = Number(boundRegular);
      }
      const boundPromo = resolveBindingValue('PROMOPRICE', rowData) ?? resolveBindingValue('promo_price', rowData);
      if (boundPromo !== undefined && boundPromo !== null && boundPromo !== '' && Number(boundPromo) > 0) {
        promoPrice = Number(boundPromo);
      }

      // Preflight check for prices
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        issues.push({
          id: `invalid-price-${el.id}-${labelIndex}`,
          severity: 'BLOCKING',
          category: 'PRICING',
          field: el.binding || 'SELLING_PRICE',
          message: `Prix de vente manquant ou égal à zéro (${sellingPrice}) pour l'article en ligne ${labelIndex + 1}.`,
          recommendation: `Renseignez un prix de vente valide avant de lancer la production.`,
        });
      }

      if (promoPrice !== null && promoPrice >= sellingPrice) {
        issues.push({
          id: `inverted-promo-${el.id}-${labelIndex}`,
          severity: 'BLOCKING',
          category: 'PRICING',
          field: 'PROMOPRICE',
          message: `Prix promo (${promoPrice}) supérieur ou égal au prix normal (${sellingPrice}) sur la ligne ${labelIndex + 1}.`,
          recommendation: `Corriger le montant promotionnel pour qu'il soit strictement inférieur au prix de référence.`,
        });
      }

      const activeAmount = promoPrice !== null && promoPrice > 0 ? promoPrice : sellingPrice;
      const currency = el.currency || 'EUR';
      const slots = decomposePrice(activeAmount, currency, currency === 'XAF' ? 0 : 2);

      if (promoPrice !== null && promoPrice > 0 && sellingPrice > 0) {
        const discountPercent = Math.round(((sellingPrice - promoPrice) / sellingPrice) * 100);
        slots.strikethroughPrice = `${sellingPrice.toFixed(currency === 'XAF' ? 0 : 2)} ${slots.currencySymbol}`;
        slots.discountPercentage = `-${discountPercent}%`;
      }

      primitives.push({
        id: el.id,
        type: 'price_block',
        xMm,
        yMm,
        widthMm: wMm,
        heightMm: hMm,
        rawPrice: sellingPrice,
        promoPrice,
        slots,
        currency,
        primaryColor: promoPrice ? '#dc2626' : el.color || '#0f172a',
        accentColor: '#dc2626',
        fontSizePt: Number(el.font_size) || 24,
        badgeText: promoPrice ? 'PROMO' : undefined,
        hasDiscount: promoPrice !== null && promoPrice > 0,
      });
    } else if (el.type === 'barcode') {
      let barcodeVal = el.content || '3250390123456';
      if (el.binding) {
        const val = resolveBindingValue(el.binding, rowData);
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          barcodeVal = String(val).trim();
        }
      }

      const isEan13 = (el.barcode_type || 'EAN13').toUpperCase() === 'EAN13';
      let isValidChecksum = true;

      if (isEan13) {
        const eanCheck = validateEan13(barcodeVal);
        isValidChecksum = eanCheck.valid;
        if (!isValidChecksum) {
          issues.push({
            id: `invalid-ean-${el.id}-${labelIndex}`,
            severity: 'BLOCKING',
            category: 'BARCODE',
            field: el.binding || 'PRODUCT_SCAN',
            message: `Code EAN-13 invalide "${barcodeVal}" (clé de contrôle erronée, attendue: ${eanCheck.calculatedChecksum ?? '?'}).`,
            recommendation: `Corrigez le code-barres dans la fiche article pour garantir la lisibilité en caisse.`,
          });
        }
      }

      // Barcode module width check at target DPI (minimum 2 dots at 203 DPI = ~0.25mm)
      const targetDpi = options.targetDpi || 203;
      const minModuleMm = (2 / targetDpi) * 25.4;
      const estimatedModuleMm = wMm / 95; // ~95 modules in EAN13
      if (estimatedModuleMm < minModuleMm * 0.8) {
        issues.push({
          id: `narrow-barcode-${el.id}-${labelIndex}`,
          severity: 'WARNING',
          category: 'THERMAL',
          field: el.name || 'barcode',
          message: `Largeur du code-barres potentiellement trop fine pour un rendu thermique fiable à ${targetDpi} DPI.`,
          recommendation: `Élargissez la zone du code-barres (largeur actuelle: ${wMm} mm).`,
        });
      }

      primitives.push({
        id: el.id,
        type: 'barcode',
        xMm,
        yMm,
        widthMm: wMm,
        heightMm: hMm,
        value: barcodeVal,
        symbology: isEan13 ? 'EAN13' : 'CODE128',
        showHumanReadable: el.show_text !== false,
        quietZoneMm: 2.5,
        barColor: el.color || '#000000',
        backgroundColor: '#ffffff',
        isValidChecksum,
      });
    } else if (el.type === 'qr') {
      let qrVal = el.content || 'https://e-studio.local';
      if (el.binding) {
        const val = resolveBindingValue(el.binding, rowData);
        if (val) qrVal = String(val);
      }

      primitives.push({
        id: el.id,
        type: 'qr',
        xMm,
        yMm,
        widthMm: wMm,
        heightMm: hMm,
        value: qrVal,
        errorCorrection: 'M',
        foregroundColor: el.color || '#000000',
        backgroundColor: '#ffffff',
      });
    } else if (el.type === 'rect') {
      primitives.push({
        id: el.id,
        type: 'rect',
        xMm,
        yMm,
        widthMm: wMm,
        heightMm: hMm,
        fillColor: el.bg_color || undefined,
        strokeColor: el.border_color || '#cbd5e1',
        strokeWidthMm: Number(el.border_width) || 0.5,
        borderRadiusMm: Number(el.border_radius) || 0,
      });
    } else if (el.type === 'line') {
      primitives.push({
        id: el.id,
        type: 'line',
        xMm,
        yMm,
        widthMm: wMm,
        heightMm: hMm,
        x2Mm: xMm + wMm,
        y2Mm: yMm + hMm,
        strokeColor: el.border_color || '#94a3b8',
        strokeWidthMm: Number(el.border_width) || 0.5,
      });
    } else if (el.type === 'image') {
      primitives.push({
        id: el.id,
        type: 'image',
        xMm,
        yMm,
        widthMm: wMm,
        heightMm: hMm,
        source: el.image_src || '',
        fit: 'contain',
      });
    }
  }

  return {
    labelIndex,
    widthMm,
    heightMm,
    primitives,
    issues,
  };
}

/**
 * E-Studio Legacy Adapter & Migration V1 -> V2 (Sections 64, 79, 93, 94)
 * Assure la compatibilité ascendante transparente des gabarits et éléments historiques.
 */

import { TemplateItem, LabelTemplate } from '../../types';
import { BaseCanvasElement } from '../canvas/core/types';
import { PriceElement } from '../pricing/presentation';
import { pricingEngine } from '../pricing/pricingEngine';
import { fontRegistry } from '../elements/v2/fontRegistry';
import { enterpriseNumberFormatter } from '../canvas/formatting/numberFormatter';

export class LegacyAdapter {
  /**
   * Convertit un élément historique en élément V2 standardisé
   */
  public static adaptItem(item: TemplateItem): BaseCanvasElement | PriceElement {
    const isPrice =
      item.type === 'price_block' ||
      (item.type === 'text' && (item.is_price || item.binding_key === 'SELLING_PRICE' || item.binding_key === 'PROMOPRICE'));

    if (isPrice) {
      return this.adaptToPriceElement(item);
    }

    // Élément généraliste V2
    return {
      id: item.id,
      type: item.type as any,
      name: (item as any).name || (item as any).label || item.type,
      geometry: {
        xMm: item.x_mm,
        yMm: item.y_mm,
        widthMm: item.w_mm,
        heightMm: item.h_mm,
      },
      transform: {
        rotationDeg: item.rotation || 0,
        scaleX: 1,
        scaleY: 1,
        origin: { x: 0.5, y: 0.5 },
      },
      appearance: {
        visible: (item as any).visible !== false,
        opacity: (item as any).opacity ?? 1,
        zIndex: item.z_index || 1,
        locked: Boolean(item.locked),
      },
      bindings: item.binding_key
        ? [{ target: 'content', expression: `product.${item.binding_key}` }]
        : undefined,
      payload: item,
    };
  }

  /**
   * Convertit un item historique text/price_block en PriceElement composable V2
   */
  public static adaptToPriceElement(item: TemplateItem): PriceElement {
    const isPromo = Boolean((item as any).promo_badge_type || (item as any).promo_price_style || item.binding_key === 'PROMOPRICE');
    const isUnit = Boolean((item as any).unit_price_config?.enabled);
    const hasTiers = item.type === 'tier_price';

    let preset: PriceElement['preset'] = 'simple';
    if (isPromo) preset = 'promotion';
    else if (isUnit) preset = 'unit_price';
    else if (hasTiers) preset = 'wholesale_tiers';

    const basePriceElement = pricingEngine.createDefaultPriceElement(preset, {
      id: item.id,
      geometry: {
        xMm: item.x_mm,
        yMm: item.y_mm,
        widthMm: item.w_mm,
        heightMm: item.h_mm,
      },
      transform: {
        rotationDeg: item.rotation || 0,
        scaleX: 1,
        scaleY: 1,
        origin: { x: 0.5, y: 0.5 },
      },
      appearance: {
        visible: (item as any).visible !== false,
        opacity: (item as any).opacity ?? 1,
        zIndex: item.z_index || 1,
        locked: Boolean(item.locked),
      },
    });

    // Report des polices et tailles
    const itemAny = item as any;
    if (itemAny.font_family) {
      basePriceElement.typography.default.font = fontRegistry.createFontReference(itemAny.font_family);
    }
    if (itemAny.font_size_pt) {
      basePriceElement.typography.default.sizePt = itemAny.font_size_pt;
      if (basePriceElement.typography.slots?.integer) {
        basePriceElement.typography.slots.integer.sizePt = itemAny.font_size_pt;
      }
    }
    if (itemAny.text_color && basePriceElement.typography.slots?.integer) {
      basePriceElement.typography.slots.integer.color = itemAny.text_color;
    }

    // Report du séparateur décimal
    if (itemAny.decimal_separator) {
      basePriceElement.formatting.decimalSeparator = itemAny.decimal_separator;
    }

    return basePriceElement;
  }

  /**
   * Convertit l'ensemble d'un gabarit historique
   */
  public static adaptTemplate(template: LabelTemplate): {
    dimensions: { widthMm: number; heightMm: number };
    elements: (BaseCanvasElement | PriceElement)[];
  } {
    return {
      dimensions: {
        widthMm: template.width_mm,
        heightMm: template.height_mm,
      },
      elements: template.items.map((it) => this.adaptItem(it)),
    };
  }
}

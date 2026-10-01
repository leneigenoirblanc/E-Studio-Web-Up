/**
 * E-Studio Live-Bound Stress Rows Service
 * 
 * Provides live product rows for on-canvas design:
 * - Stress Row 1: Longest product name / description (tests autofit & wrapping)
 * - Stress Row 2: Widest price value (tests slot alignment & max monetary length)
 * - Stress Row 3: Promotion with volume tiers and discount badge
 * 
 * Also detects real-time overflows of template items against the active row.
 */

import { ProductRecord, LabelTemplate, TemplateItem } from '../../types';

export interface StressRowResult {
  longestNameRow: ProductRecord;
  widestPriceRow: ProductRecord;
  promoWithTiersRow: ProductRecord;
  allRows: ProductRecord[];
}

export interface ItemOverflowAnalysis {
  itemId: string;
  isOverflowing: boolean;
  message?: string;
  severity: 'none' | 'warning' | 'error';
}

export class StressRowsEngine {
  private static instance: StressRowsEngine | null = null;

  public static getInstance(): StressRowsEngine {
    if (!this.instance) {
      this.instance = new StressRowsEngine();
    }
    return this.instance;
  }

  /**
   * Identifies the three stress rows from a product list, or generates realistic fallback stress data
   */
  public extractStressRows(products: ProductRecord[]): StressRowResult {
    const list = products.length > 0 ? products : this.getDefaultStressProducts();

    // 1. Longest Name
    let longestNameRow = list[0];
    let maxNameLen = 0;
    for (const p of list) {
      const len = (p.ITEMNAME || '').length + (p.ITEMDESCRIPTION || '').length;
      if (len > maxNameLen) {
        maxNameLen = len;
        longestNameRow = p;
      }
    }

    // 2. Widest Price
    let widestPriceRow = list[0];
    let maxPrice = -Infinity;
    for (const p of list) {
      const price = Number(p.SELLING_PRICE) || 0;
      if (price > maxPrice) {
        maxPrice = price;
        widestPriceRow = p;
      }
    }

    // 3. Promo with Tiers
    let promoWithTiersRow = list.find(
      (p) => p.PROMOPRICE && Number(p.PROMOPRICE) > 0 && Number(p.PROMOPRICE) < Number(p.SELLING_PRICE)
    );
    if (!promoWithTiersRow) {
      promoWithTiersRow = {
        id: 'STRESS-PROMO-TIERS',
        STORE_NAME: 'E-STUDIO HYPERMARCHÉ',
        PRODUCT_SCAN: '3250390998877',
        PARTNO: 'REF-PROMO-001',
        ITEMNAME: 'Chocolat Noir Grand Cru Équateur 72% Pur Beurre',
        ITEMDESCRIPTION: 'Offre exclusive avec remise immédiate et prix dégressif par 3 tablettes',
        DIV_NAME: 'ÉPICERIE FINE',
        DEPT_NAME: 'CONFISERIE',
        CATEGORY_NAME: 'CHOCOLATS',
        BRAND_INFO: 'Maître Chocolatier',
        PACK_UNIT: 'Lot 3 × 100g',
        SELLING_PRICE: 3450,
        PROMOPRICE: 2490,
        DISCOUNT_PCT: 28,
        PROMO_LABEL: '-28% IMMÉDIAT',
        UNIT_PRICE_TEXT: '8.30 € / kg',
        TAX: 'TVA 5.5%',
        SOH: 150,
      };
    }

    return {
      longestNameRow,
      widestPriceRow,
      promoWithTiersRow,
      allRows: list,
    };
  }

  /**
   * Analyzes whether an item overflows with the given product record
   */
  public checkItemOverflow(item: TemplateItem, record: ProductRecord, template: LabelTemplate): ItemOverflowAnalysis {
    // Check barcode width
    if (item.type === 'barcode') {
      const code = record.PRODUCT_SCAN || (item as any).code || '';
      // EAN-13 requires at least ~25mm width to scan reliably
      if (item.w_mm < 25 && code.length >= 12) {
        return {
          itemId: item.id,
          isOverflowing: true,
          message: 'Code-barres trop étroit (< 25 mm) : risque de non-lecture thermique',
          severity: 'warning',
        };
      }
    }

    // Check text bounds against bound content
    if (item.type === 'text') {
      const textProp = item as any;
      let text = textProp.text || '';
      if (textProp.binding_key && record[textProp.binding_key] !== undefined) {
        text = String(record[textProp.binding_key]);
      }

      // Approximate text length in mm: charCount * (fontSizePt * 0.3528 * 0.55)
      const approxCharWidthMm = (textProp.font_size_pt || 10) * 0.3528 * 0.52;
      const singleLineWidthMm = text.length * approxCharWidthMm;

      if (!textProp.wrap && singleLineWidthMm > item.w_mm && textProp.overflow === 'clip') {
        return {
          itemId: item.id,
          isOverflowing: true,
          message: `Texte tronqué (${Math.round(singleLineWidthMm)} mm requis pour ${item.w_mm} mm disponible)`,
          severity: 'warning',
        };
      }
    }

    // Check bounds outside template printable area
    if (item.x_mm < 0 || item.y_mm < 0 || item.x_mm + item.w_mm > template.width_mm || item.y_mm + item.h_mm > template.height_mm) {
      return {
        itemId: item.id,
        isOverflowing: true,
        message: 'Élément hors zone d’impression du gabarit',
        severity: 'error',
      };
    }

    return {
      itemId: item.id,
      isOverflowing: false,
      severity: 'none',
    };
  }

  public getDefaultStressProducts(): ProductRecord[] {
    return [
      {
        id: 'STRESS-MAX-NAME',
        STORE_NAME: 'HYPER GÉANT 24/7',
        PRODUCT_SCAN: '3250390112233',
        PARTNO: 'ART-998822',
        ITEMNAME: 'Café Arabica d’Altitude 100% Pur Terroir Éthiopie Yirgacheffe Torréfaction Lente Artisanale 500g',
        ITEMDESCRIPTION: 'Grains sélectionnés à la main, emballage hermétique avec valve de fraîcheur unidirectionnelle sous atmosphère protectrice.',
        DIV_NAME: 'ÉPICERIE SUCRÉE',
        DEPT_NAME: 'BOISSONS CHAUDES',
        CATEGORY_NAME: 'CAFÉ GRAINS & MOULU',
        BRAND_INFO: 'Torréfacteur Traditionnel',
        PACK_UNIT: 'Sachet 500g',
        SELLING_PRICE: 4890,
        PROMOPRICE: 3990,
        DISCOUNT_PCT: 18,
        PROMO_LABEL: 'OFFRE DÉCOUVERTE',
        UNIT_PRICE_TEXT: '7.98 € / kg',
        TAX: 'TVA 5.5%',
        SOH: 85,
      },
      {
        id: 'STRESS-MAX-PRICE',
        STORE_NAME: 'HYPER GÉANT 24/7',
        PRODUCT_SCAN: '3250390445566',
        PARTNO: 'ART-LUX-001',
        ITEMNAME: 'Grand Champagne Millésimé Cuvée Prestige Coffret Bois 75cl',
        ITEMDESCRIPTION: 'Vieillissement prolongé en cave crayeuse, notes de fruits confits et de brioche.',
        DIV_NAME: 'LIQUIDES',
        DEPT_NAME: 'VINS & CHAMPAGNES',
        CATEGORY_NAME: 'CHAMPAGNES PRESTIGE',
        BRAND_INFO: 'Maison Fondée en 1845',
        PACK_UNIT: 'Bouteille 75cl',
        SELLING_PRICE: 1450000,
        UNIT_PRICE_TEXT: '1 933 333 FCFA / L',
        TAX: 'TVA 18%',
        SOH: 12,
      },
      {
        id: 'STRESS-PROMO-TIERS',
        STORE_NAME: 'HYPER GÉANT 24/7',
        PRODUCT_SCAN: '3250390778899',
        PARTNO: 'ART-TIER-003',
        ITEMNAME: 'Huile d’Olive Vierge Extra Bio Première Pression à Froid 1L',
        ITEMDESCRIPTION: 'Origine Crète AOP, récolte précoce à la main.',
        DIV_NAME: 'ÉPICERIE SALÉE',
        DEPT_NAME: 'CONDIMENTS & HUILES',
        CATEGORY_NAME: 'HUILES D’OLIVE BIO',
        BRAND_INFO: 'Domaine Crétois',
        PACK_UNIT: 'Bouteille verre 1L',
        SELLING_PRICE: 11950,
        PROMOPRICE: 8950,
        DISCOUNT_PCT: 25,
        PROMO_LABEL: '-25% IMMÉDIAT',
        UNIT_PRICE_TEXT: '8.95 € / L',
        TAX: 'TVA 5.5%',
        SOH: 220,
      },
    ];
  }
}

export const stressRowsEngine = StressRowsEngine.getInstance();

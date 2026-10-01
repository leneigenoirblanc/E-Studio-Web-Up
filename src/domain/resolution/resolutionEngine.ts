/**
 * Product Resolution Engine
 * Résout les lignes d'un fichier importé contre le catalogue de référence.
 * Construit l'EffectiveProduct avec traçabilité de provenance (sourceMap)
 * et fige le ProductionDataset destiné exclusivement à la génération d'étiquettes.
 */

import {
  EffectiveProduct,
  ProductionDataset,
  ResolutionPolicy,
  DEFAULT_RESOLUTION_POLICY,
  ResolutionConflict,
  ResolutionIssue,
  CanonicalProduct,
  MatchMethod,
} from './types';
import { referenceCatalogRepository } from './referenceCatalogRepository';

export class ResolutionEngine {
  private static instance: ResolutionEngine | null = null;

  public static getInstance(): ResolutionEngine {
    if (!this.instance) {
      this.instance = new ResolutionEngine();
    }
    return this.instance;
  }

  /**
   * Résout une liste de lignes brutes importées en un ProductionDataset
   */
  public resolveImportBatch(
    rawRows: any[],
    options: {
      fileName?: string;
      batchName?: string;
      policy?: ResolutionPolicy;
    } = {}
  ): ProductionDataset {
    const policy = options.policy || DEFAULT_RESOLUTION_POLICY;
    const effectiveProducts: EffectiveProduct[] = [];

    let exactMatches = 0;
    let aliasMatches = 0;
    let conflictsCount = 0;
    let unresolvedCount = 0;
    let newProductsCount = 0;

    rawRows.forEach((row, index) => {
      // 1. Extraction des clés principales
      const scanCode = (row.PRODUCT_SCAN || row.SCAN_CODE || row.EAN || row.BARCODE || '').toString().trim();
      const partNumber = (row.PARTNO || row.PART_NUMBER || row.SKU || '').toString().trim();
      const itemName = (row.ITEMNAME || row.NAME || row.DESIGNATION || '').toString().trim();
      const brand = (row.BRAND_INFO || row.BRAND || '').toString().trim();
      const sellingPrice = row.SELLING_PRICE !== undefined && row.SELLING_PRICE !== '' ? Number(row.SELLING_PRICE) : undefined;
      const promoPrice = row.PROMOPRICE !== undefined && row.PROMOPRICE !== '' ? Number(row.PROMOPRICE) : undefined;
      const storeName = (row.STORE_NAME || '').toString().trim();
      const category = (row.CATEGORY_NAME || row.CATEGORY || '').toString().trim();
      const department = (row.DEPT_NAME || row.DEPARTMENT || '').toString().trim();

      // 2. Recherche dans le Catalogue de Référence
      let matchResult = scanCode ? referenceCatalogRepository.findByIdentifier(scanCode) : null;
      let matchMethod: MatchMethod = 'EXACT_SCAN_CODE';

      if (!matchResult && partNumber) {
        matchResult = referenceCatalogRepository.findByIdentifier(partNumber);
        matchMethod = 'EXACT_PART_NUMBER';
      }

      const conflicts: ResolutionConflict[] = [];
      const issues: ResolutionIssue[] = [];

      let canonical: CanonicalProduct | null = null;
      let isAlias = false;

      if (matchResult) {
        canonical = matchResult.product;
        isAlias = matchResult.isAlias;

        if (isAlias) {
          aliasMatches++;
          matchMethod = 'ALIAS_IDENTIFIER';
        } else {
          exactMatches++;
        }

        // 3. Détection de Conflits (Import vs Référence)
        if (brand && canonical.brand && brand.toLowerCase() !== canonical.brand.toLowerCase()) {
          conflicts.push({
            field: 'brand',
            referenceValue: canonical.brand,
            importValue: brand,
            resolutionChoice: policy.onConflict === 'PREFER_IMPORT' ? 'USE_IMPORT' : 'USE_REFERENCE',
          });
          conflictsCount++;
        }

        if (itemName && canonical.name && itemName.toLowerCase() !== canonical.name.toLowerCase()) {
          // Si le nom diffère légèrement, on note l'écart
          conflicts.push({
            field: 'name',
            referenceValue: canonical.name,
            importValue: itemName,
            resolutionChoice: 'USE_REFERENCE',
          });
        }
      } else {
        if (!scanCode && !partNumber) {
          issues.push({ type: 'error', message: 'Aucun code-barres ni référence pièce trouvé' });
          unresolvedCount++;
        } else {
          unresolvedCount++;
        }
      }

      // 4. Construction de l'EffectiveProduct avec traçabilité de provenance (sourceMap)
      const resolvedName = canonical?.name || itemName || `Article ${index + 1}`;
      const resolvedBrand = canonical?.brand || brand || '';
      const resolvedCategory = canonical?.category || category || '';
      const resolvedDept = canonical?.department || department || '';

      const discountPercent =
        sellingPrice && promoPrice && promoPrice < sellingPrice
          ? Math.round(((sellingPrice - promoPrice) / sellingPrice) * 100)
          : undefined;

      const effectiveProd: EffectiveProduct = {
        id: `EFF-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        canonicalProductId: canonical ? canonical.id : `PROVISIONAL-${index + 1}`,
        matchMethod: canonical ? matchMethod : undefined,
        resolutionStatus: canonical
          ? conflicts.length > 0
            ? 'CONFLICT'
            : isAlias
            ? 'ALIAS_MATCH'
            : 'EXACT_MATCH'
          : 'UNRESOLVED',

        identifiers: {
          primaryScan: scanCode || canonical?.id || '',
          aliases: [],
          partNumber: partNumber || undefined,
          namespace: storeName || undefined,
        },

        identity: {
          name: resolvedName,
          brand: resolvedBrand || undefined,
          description: canonical?.description || row.ITEMDESCRIPTION || undefined,
          category: resolvedCategory || undefined,
          department: resolvedDept || undefined,
          subCategory: canonical?.subCategory || row.SUB_CATEGORY_NAME || undefined,
        },

        packaging: {
          packUnit: canonical?.packUnit || row.PACK_UNIT || undefined,
          caseSize: canonical?.caseSize || (row.CASE_SIZE ? Number(row.CASE_SIZE) : undefined),
          caseUnit: canonical?.caseUnit || row.CASE_UNIT || undefined,
          unitWeightValue: canonical?.unitWeightValue || (row.UNIT_WEIGHT_VALUE ? Number(row.UNIT_WEIGHT_VALUE) : undefined),
          unitWeightUnit: canonical?.unitWeightUnit || row.UNIT_WEIGHT_UNIT || undefined,
        },

        commercial: {
          storeName: storeName || undefined,
          sellingUnit: row.SELLING_UNIT || undefined,
          sellingPrice: sellingPrice,
          promoPrice: promoPrice,
          discountPercent,
          unitPriceMode: row.UNIT_PRICE_MODE || undefined,
          currency: row.CURRENCY || 'FCFA',
          taxRate: row.TAX_RATE ? Number(row.TAX_RATE) : undefined,
          taxType: row.TAX_TYPE || undefined,
        },

        operational: {
          soh: row.SOH ? Number(row.SOH) : undefined,
          lastSoldDate: row.LAST_SOLD_DATE || undefined,
          qtySold30Days: row.QTYSOLDINLAST30DAYS ? Number(row.QTYSOLDINLAST30DAYS) : undefined,
        },

        sourceMap: {
          name: { source: canonical ? 'REFERENCE' : 'IMPORT', confidence: canonical ? 1.0 : 0.8 },
          brand: { source: canonical?.brand ? 'REFERENCE' : 'IMPORT', confidence: canonical?.brand ? 1.0 : 0.7 },
          description: { source: canonical?.description ? 'REFERENCE' : 'IMPORT', confidence: 0.9 },
          sellingPrice: { source: 'IMPORT', confidence: 1.0 },
          promoPrice: { source: 'IMPORT', confidence: 1.0 },
          discountPercent: { source: 'COMPUTED', confidence: 1.0 },
          weight: { source: canonical?.unitWeightValue ? 'REFERENCE' : 'IMPORT', confidence: 0.9 },
        },

        conflicts,
        issues,
      };

      effectiveProducts.push(effectiveProd);
    });

    const dataset: ProductionDataset = {
      id: `PDS-${Date.now()}`,
      name: options.batchName || options.fileName || `Tirage du ${new Date().toLocaleDateString('fr-FR')}`,
      sourceFileName: options.fileName,
      sourceRowCount: rawRows.length,
      status: 'ready',
      products: effectiveProducts,
      stats: {
        total: rawRows.length,
        exactMatches,
        aliasMatches,
        conflicts: conflictsCount,
        unresolved: unresolvedCount,
        newProducts: newProductsCount,
      },
      createdAt: new Date().toISOString(),
    };

    return dataset;
  }

  /**
   * Fige le ProductionDataset pour garantir qu'aucune modification ultérieure
   * de la base de référence ne vienne altérer un travail en cours de production.
   */
  public freezeDataset(dataset: ProductionDataset): ProductionDataset {
    return {
      ...dataset,
      status: 'frozen',
      frozenAt: new Date().toISOString(),
    };
  }

  /**
   * Convertit un EffectiveProduct en format ProductRecord standard pour
   * les moteurs de rendu (LabelRenderer, ZplExporter, PptxExporter, jsPDF)
   */
  public toProductRecord(effective: EffectiveProduct): any {
    return {
      id: effective.id,
      STORE_NAME: effective.commercial.storeName || '',
      PRODUCT_SCAN: effective.identifiers.primaryScan,
      PARTNO: effective.identifiers.partNumber || '',
      ITEMNAME: effective.identity.name,
      ITEMDESCRIPTION: effective.identity.description || '',
      CATEGORY_NAME: effective.identity.category || effective.identity.department || '',
      BRAND_INFO: effective.identity.brand || '',
      SELLING_UNIT: effective.commercial.sellingUnit || 'Pièce',
      SELLING_PRICE: effective.commercial.sellingPrice ?? 0,
      PROMOPRICE: effective.commercial.promoPrice ? String(effective.commercial.promoPrice) : '',
      DISCOUNT_PERCENT: effective.commercial.discountPercent,
      CASE_SIZE: effective.packaging?.caseSize ? String(effective.packaging.caseSize) : '',
      UNIT_WEIGHT_VALUE: effective.packaging?.unitWeightValue,
      UNIT_WEIGHT_UNIT: effective.packaging?.unitWeightUnit,
      UNIT_PRICE_MODE: effective.commercial.unitPriceMode,
      // Metadata de résolution
      _canonicalId: effective.canonicalProductId,
      _resolutionStatus: effective.resolutionStatus,
      _sourceMap: effective.sourceMap,
    };
  }
}

export const resolutionEngine = ResolutionEngine.getInstance();

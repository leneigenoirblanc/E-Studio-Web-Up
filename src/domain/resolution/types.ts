/**
 * E-Studio Data Resolution & Reference Catalog — Types & Spécifications
 * Conforme au modèle industriel à 3 couches :
 * 1. Identité Canonique & Multi-Identifiants
 * 2. Données Contextuelles Commerciales
 * 3. Dataset de Production Résolu & Figé
 */

export type FieldSource = 'REFERENCE' | 'IMPORT' | 'USER' | 'RULE' | 'COMPUTED';

export type ResolutionStatus =
  | 'EXACT_MATCH'
  | 'ALIAS_MATCH'
  | 'MULTI_MATCH'
  | 'PARTIAL_MATCH'
  | 'UNRESOLVED'
  | 'NEW_PRODUCT'
  | 'CONFLICT';

export type MatchMethod =
  | 'EXACT_PRODUCT_ID'
  | 'EXACT_SCAN_CODE'
  | 'EXACT_EAN'
  | 'EXACT_PART_NUMBER'
  | 'ALIAS_IDENTIFIER'
  | 'SCOPED_PARTNO'
  | 'USER_MAPPING'
  | 'MANUAL_MATCH';

export interface ProductIdentifier {
  id: string;
  productId: string;
  type: 'EAN13' | 'GTIN' | 'SCAN_CODE' | 'SUPPLIER_PARTNO' | 'STORE_PARTNO' | 'CUSTOM';
  value: string;
  normalizedValue: string;
  namespace?: string; // ex: SUPPLIER_X, STORE_A, HYPER_Y
  isPrimary: boolean;
  status: 'active' | 'inactive' | 'archived';
  source?: string;
  validFrom?: string;
  validTo?: string;
}

export interface CanonicalProduct {
  id: string; // ex: EST-PROD-000001
  status: 'active' | 'inactive' | 'archived';
  name: string;
  brand?: string;
  description?: string;
  manufacturer?: string;
  hsCode?: string;
  productionItem?: boolean;
  itemType?: string;
  // Packaging
  packUnit?: string;
  caseSize?: number;
  caseUnit?: string;
  unitWeightValue?: number;
  unitWeightUnit?: string;
  // Taxonomie par défaut
  division?: string;
  department?: string;
  category?: string;
  subCategory?: string;
  // Fournisseur principal
  vendorName?: string;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttributeHistory {
  id: string;
  productId: string;
  attributeKey: string;
  previousValue: any;
  newValue: any;
  source: FieldSource;
  changedBy: string;
  changedAt: string;
}

export interface ResolvedField<T = any> {
  value: T;
  source: FieldSource;
  confidence: number; // 0 à 1
  originalImportValue?: T;
  referenceValue?: T;
}

export interface ResolutionConflict {
  field: string;
  referenceValue: any;
  importValue: any;
  chosenValue?: any;
  resolutionChoice: 'USE_REFERENCE' | 'USE_IMPORT' | 'CUSTOM' | 'KEEP_BOTH_ALIAS';
  appliedToAllMatching?: boolean;
}

export interface ResolutionIssue {
  type: 'info' | 'warning' | 'error';
  message: string;
  field?: string;
}

export interface EffectiveProduct {
  id: string;
  canonicalProductId: string;
  matchMethod?: MatchMethod;
  resolutionStatus: ResolutionStatus;
  
  identifiers: {
    primaryScan: string;
    aliases: string[];
    partNumber?: string;
    namespace?: string;
  };

  identity: {
    name: string;
    brand?: string;
    description?: string;
    category?: string;
    department?: string;
    subCategory?: string;
  };

  packaging?: {
    packUnit?: string;
    caseSize?: number;
    caseUnit?: string;
    unitWeightValue?: number;
    unitWeightUnit?: string;
  };

  commercial: {
    storeName?: string;
    sellingUnit?: string;
    sellingPrice?: number;
    promoPrice?: number;
    discountPercent?: number;
    unitPriceMode?: string;
    currency?: string;
    taxRate?: number;
    taxType?: string;
  };

  operational?: {
    soh?: number;
    lastSoldDate?: string;
    qtySold30Days?: number;
  };

  sourceMap: Record<string, {
    source: FieldSource;
    confidence: number;
  }>;

  conflicts: ResolutionConflict[];
  issues: ResolutionIssue[];
}

export interface ProductionDataset {
  id: string; // ex: PDS-2026-09-30-001
  name: string;
  sourceFileName?: string;
  sourceRowCount: number;
  status: 'resolving' | 'ready' | 'frozen' | 'processed';
  products: EffectiveProduct[];
  stats: {
    total: number;
    exactMatches: number;
    aliasMatches: number;
    conflicts: number;
    unresolved: number;
    newProducts: number;
  };
  createdAt: string;
  frozenAt?: string;
}

export type ImportMode =
  | 'READ_ONLY_ENRICH' // Consultation de la base de référence sans mise à jour
  | 'ENRICH_AND_SAVE'  // Complète la base de référence avec les nouveaux articles validés
  | 'SYNCHRONIZE'      // Compare et met à jour les données divergentes
  | 'REPLACE_SCOPE';   // Remplace les données pour un rayon/fournisseur/magasin précis

export interface ResolutionPolicy {
  matchScanCode: boolean;
  matchEan: boolean;
  matchPartNumber: boolean;
  matchHistoricalAliases: boolean;
  onMissingData: 'LEAVE_EMPTY' | 'ENRICH_FROM_REFERENCE' | 'ASK_USER';
  onConflict: 'ASK_USER' | 'PREFER_IMPORT' | 'PREFER_REFERENCE';
  referenceUpdates: 'ASK_BEFORE_SAVING' | 'AUTO_SAVE' | 'NEVER_SAVE';
  importMode: ImportMode;
  scopeFilter?: {
    storeName?: string;
    department?: string;
    supplier?: string;
  };
}

export const DEFAULT_RESOLUTION_POLICY: ResolutionPolicy = {
  matchScanCode: true,
  matchEan: true,
  matchPartNumber: true,
  matchHistoricalAliases: true,
  onMissingData: 'ENRICH_FROM_REFERENCE',
  onConflict: 'ASK_USER',
  referenceUpdates: 'ASK_BEFORE_SAVING',
  importMode: 'ENRICH_AND_SAVE',
};

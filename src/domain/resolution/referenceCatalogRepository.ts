/**
 * Reference Catalog Repository
 * Gère le catalogue canonique permanent de référence, les multi-identifiants
 * et l'historique d'audit des attributs.
 */

import {
  CanonicalProduct,
  ProductIdentifier,
  ProductAttributeHistory,
  FieldSource,
} from './types';

const STORAGE_KEY_CANONICAL = 'estudio_canonical_products_v1';
const STORAGE_KEY_IDENTIFIERS = 'estudio_product_identifiers_v1';
const STORAGE_KEY_HISTORY = 'estudio_attribute_history_v1';

export const SEED_CANONICAL_PRODUCTS: CanonicalProduct[] = [
  {
    id: 'EST-PROD-000001',
    status: 'active',
    name: 'Lait en Poudre Nido Instantané',
    brand: 'Nestlé',
    description: 'Lait entier en poudre enrichi en fer et vitamines A & D',
    manufacturer: 'Nestlé S.A.',
    packUnit: 'Boîte métal',
    caseSize: 12,
    caseUnit: 'Carton',
    unitWeightValue: 400,
    unitWeightUnit: 'g',
    division: 'ALIMENTAIRE',
    department: 'Épicerie',
    category: 'Produits Laitiers',
    subCategory: 'Laits de longue conservation',
    vendorName: 'Nestlé Cameroun',
    supplier: 'SUPPLIER_NESTLE',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'EST-PROD-000002',
    status: 'active',
    name: 'Boisson Gazeuse Coca-Cola Original Taste',
    brand: 'Coca-Cola',
    description: 'Soda rafraîchissant aux extraits végétaux',
    manufacturer: 'The Coca-Cola Company',
    packUnit: 'Bouteille PET',
    caseSize: 24,
    caseUnit: 'Pack',
    unitWeightValue: 1500,
    unitWeightUnit: 'ml',
    division: 'LIQUIDES',
    department: 'Boissons',
    category: 'Sodas & Boissons Gazeuses',
    subCategory: 'Colas',
    vendorName: 'SABC Brasseries',
    supplier: 'SUPPLIER_SABC',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'EST-PROD-000003',
    status: 'active',
    name: 'Riz Parfumé Jasponic Super Extra',
    brand: 'Le Forban',
    description: 'Riz blanc parfumé 100% brisures fines, origine Cambodge',
    manufacturer: 'Rizière Du Sud',
    packUnit: 'Sac plastique',
    caseSize: 5,
    caseUnit: 'Balle',
    unitWeightValue: 5,
    unitWeightUnit: 'kg',
    division: 'ALIMENTAIRE',
    department: 'Épicerie',
    category: 'Féculents & Céréales',
    subCategory: 'Riz Parfumé',
    vendorName: 'Importateur Général',
    supplier: 'SUPPLIER_RICE',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'EST-PROD-000004',
    status: 'active',
    name: 'Chocolat au Lait Tablette Extra Fins',
    brand: 'Milka',
    description: 'Chocolat au lait du pays alpin aux noisettes entières',
    manufacturer: 'Mondelēz International',
    packUnit: 'Tablette',
    caseSize: 20,
    caseUnit: 'Carton',
    unitWeightValue: 100,
    unitWeightUnit: 'g',
    division: 'ALIMENTAIRE',
    department: 'Confiserie',
    category: 'Chocolats',
    subCategory: 'Tablettes Pâtissières',
    vendorName: 'Mondelēz Distribution',
    supplier: 'SUPPLIER_MONDELEZ',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
  },
];

export const SEED_PRODUCT_IDENTIFIERS: ProductIdentifier[] = [
  // Nido (Possède 2 EAN actifs et un part number fournisseur)
  {
    id: 'ID-001',
    productId: 'EST-PROD-000001',
    type: 'EAN13',
    value: '7613031584992',
    normalizedValue: '7613031584992',
    isPrimary: true,
    status: 'active',
    source: 'CATALOG_SEED',
  },
  {
    id: 'ID-002',
    productId: 'EST-PROD-000001',
    type: 'SCAN_CODE',
    value: '1234567890124',
    normalizedValue: '1234567890124',
    isPrimary: false,
    status: 'active',
    source: 'ERP_ALIAS',
  },
  {
    id: 'ID-003',
    productId: 'EST-PROD-000001',
    type: 'SUPPLIER_PARTNO',
    value: 'NIDO-400-CAN',
    normalizedValue: 'NIDO-400-CAN',
    namespace: 'NESTLE_DISTRIB',
    isPrimary: false,
    status: 'active',
  },
  // Coca Cola
  {
    id: 'ID-004',
    productId: 'EST-PROD-000002',
    type: 'EAN13',
    value: '5449000000996',
    normalizedValue: '5449000000996',
    isPrimary: true,
    status: 'active',
  },
  {
    id: 'ID-005',
    productId: 'EST-PROD-000002',
    type: 'STORE_PARTNO',
    value: 'COCA-150-PET',
    normalizedValue: 'COCA-150-PET',
    namespace: 'STORE_YAOUNDE',
    isPrimary: false,
    status: 'active',
  },
  // Riz Le Forban
  {
    id: 'ID-006',
    productId: 'EST-PROD-000003',
    type: 'EAN13',
    value: '3183280001552',
    normalizedValue: '3183280001552',
    isPrimary: true,
    status: 'active',
  },
  // Milka
  {
    id: 'ID-007',
    productId: 'EST-PROD-000004',
    type: 'EAN13',
    value: '7622210708571',
    normalizedValue: '7622210708571',
    isPrimary: true,
    status: 'active',
  },
];

export class ReferenceCatalogRepository {
  private static instance: ReferenceCatalogRepository | null = null;
  private products: CanonicalProduct[] = [];
  private identifiers: ProductIdentifier[] = [];
  private history: ProductAttributeHistory[] = [];

  private constructor() {
    this.load();
  }

  public static getInstance(): ReferenceCatalogRepository {
    if (!this.instance) {
      this.instance = new ReferenceCatalogRepository();
    }
    return this.instance;
  }

  private load(): void {
    if (typeof window === 'undefined') {
      this.products = [...SEED_CANONICAL_PRODUCTS];
      this.identifiers = [...SEED_PRODUCT_IDENTIFIERS];
      return;
    }

    try {
      const savedProds = localStorage.getItem(STORAGE_KEY_CANONICAL);
      if (savedProds) {
        this.products = JSON.parse(savedProds);
      } else {
        this.products = [...SEED_CANONICAL_PRODUCTS];
        this.persistProducts();
      }

      const savedIds = localStorage.getItem(STORAGE_KEY_IDENTIFIERS);
      if (savedIds) {
        this.identifiers = JSON.parse(savedIds);
      } else {
        this.identifiers = [...SEED_PRODUCT_IDENTIFIERS];
        this.persistIdentifiers();
      }

      const savedHist = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedHist) {
        this.history = JSON.parse(savedHist);
      }
    } catch {
      this.products = [...SEED_CANONICAL_PRODUCTS];
      this.identifiers = [...SEED_PRODUCT_IDENTIFIERS];
    }
  }

  private persistProducts(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_CANONICAL, JSON.stringify(this.products));
    } catch (e) {
      console.error('Error persisting canonical products:', e);
    }
  }

  private persistIdentifiers(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_IDENTIFIERS, JSON.stringify(this.identifiers));
    } catch (e) {
      console.error('Error persisting product identifiers:', e);
    }
  }

  private persistHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(this.history.slice(0, 1000)));
    } catch (e) {
      console.error('Error persisting attribute history:', e);
    }
  }

  public getAll(): CanonicalProduct[] {
    return [...this.products];
  }

  public getById(id: string): CanonicalProduct | undefined {
    return this.products.find((p) => p.id === id);
  }

  public getIdentifiersForProduct(productId: string): ProductIdentifier[] {
    return this.identifiers.filter((i) => i.productId === productId);
  }

  public getAllIdentifiers(): ProductIdentifier[] {
    return [...this.identifiers];
  }

  /**
   * Recherche un produit par valeur d'identifiant (scan code, EAN, SKU) et namespace optionnel
   */
  public findByIdentifier(
    value: string,
    namespace?: string
  ): { product: CanonicalProduct; identifier: ProductIdentifier; isAlias: boolean } | null {
    if (!value || value.trim() === '') return null;
    const clean = value.trim();

    // 1. Recherche exacte avec namespace
    if (namespace) {
      const matchWithNs = this.identifiers.find(
        (i) => i.normalizedValue.toLowerCase() === clean.toLowerCase() && i.namespace === namespace && i.status === 'active'
      );
      if (matchWithNs) {
        const prod = this.getById(matchWithNs.productId);
        if (prod) return { product: prod, identifier: matchWithNs, isAlias: !matchWithNs.isPrimary };
      }
    }

    // 2. Recherche par valeur brute
    const match = this.identifiers.find(
      (i) => i.normalizedValue.toLowerCase() === clean.toLowerCase() && i.status === 'active'
    );
    if (match) {
      const prod = this.getById(match.productId);
      if (prod) return { product: prod, identifier: match, isAlias: !match.isPrimary };
    }

    return null;
  }

  /**
   * Enregistre ou met à jour un produit canonique
   */
  public saveCanonicalProduct(
    product: CanonicalProduct,
    identifiers?: ProductIdentifier[],
    source: FieldSource = 'USER'
  ): void {
    const existingIndex = this.products.findIndex((p) => p.id === product.id);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const old = this.products[existingIndex];
      // Log des modifications d'attributs
      ['name', 'brand', 'description', 'unitWeightValue', 'unitWeightUnit'].forEach((k) => {
        if ((old as any)[k] !== (product as any)[k]) {
          this.history.unshift({
            id: `HIST-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            productId: product.id,
            attributeKey: k,
            previousValue: (old as any)[k],
            newValue: (product as any)[k],
            source,
            changedBy: 'Operator',
            changedAt: now,
          });
        }
      });
      this.products[existingIndex] = { ...product, updatedAt: now };
    } else {
      this.products.unshift({ ...product, createdAt: now, updatedAt: now });
    }

    if (identifiers && identifiers.length > 0) {
      identifiers.forEach((idDef) => {
        const exists = this.identifiers.findIndex(
          (i) => i.normalizedValue === idDef.normalizedValue && i.type === idDef.type && i.namespace === idDef.namespace
        );
        if (exists >= 0) {
          this.identifiers[exists] = { ...idDef, productId: product.id };
        } else {
          this.identifiers.push({
            ...idDef,
            id: idDef.id || `ID-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            productId: product.id,
          });
        }
      });
      this.persistIdentifiers();
    }

    this.persistProducts();
    this.persistHistory();
  }

  /**
   * Ajoute un nouvel identifiant (ex: nouvel EAN ou alias) à un produit existant
   */
  public addIdentifierToProduct(
    productId: string,
    identifier: Omit<ProductIdentifier, 'id' | 'productId'>
  ): ProductIdentifier {
    const newId: ProductIdentifier = {
      ...identifier,
      id: `ID-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId,
    };
    this.identifiers.push(newId);
    this.persistIdentifiers();
    return newId;
  }

  /**
   * Historique d'audit des attributs d'un produit
   */
  public getHistoryForProduct(productId: string): ProductAttributeHistory[] {
    return this.history.filter((h) => h.productId === productId);
  }
}

export const referenceCatalogRepository = ReferenceCatalogRepository.getInstance();

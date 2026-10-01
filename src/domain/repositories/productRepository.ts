/**
 * Product Repository
 * Abstraction de persistance pour les produits et prix de vente
 */

import { Product } from '../persistenceTypes';
import { databaseService } from '../../services/databaseService';
import { ProductRecord } from '../../types';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findByBarcode(barcode: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  save(product: Product): Promise<void>;
  update(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
  bulkSave(products: Product[]): Promise<void>;
}

function recordToProduct(r: ProductRecord): Product {
  return {
    id: r.id || r.PARTNO || r.PRODUCT_SCAN || `PROD-${Date.now()}`,
    barcode: r.PRODUCT_SCAN,
    partNumber: r.PARTNO,
    itemName: r.ITEMNAME || 'Article sans nom',
    sellingPrice: r.SELLING_PRICE,
    promoPrice: r.PROMOPRICE,
    unitWeight: r.UNIT_WEIGHT,
    unitWeightUnit: (r.WEIGHT_UNIT as any) || 'piece',
    currency: 'XAF',
    category: r.CATEGORY_NAME,
    department: r.DEPT_NAME,
    brand: r.BRAND_INFO,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function productToRecord(p: Product): ProductRecord {
  return {
    id: p.id,
    PRODUCT_SCAN: p.barcode || '',
    PARTNO: p.partNumber || '',
    ITEMNAME: p.itemName,
    SELLING_PRICE: p.sellingPrice || 0,
    PROMOPRICE: p.promoPrice,
    UNIT_WEIGHT: p.unitWeight,
    WEIGHT_UNIT: p.unitWeightUnit,
    CATEGORY_NAME: p.category,
    DEPT_NAME: p.department,
    BRAND_INFO: p.brand,
  };
}

export class ProductRepository implements IProductRepository {
  private static instance: ProductRepository | null = null;

  public static getInstance(): ProductRepository {
    if (!this.instance) {
      this.instance = new ProductRepository();
    }
    return this.instance;
  }

  public async findById(id: string): Promise<Product | null> {
    const list = await this.findAll();
    return list.find((p) => p.id === id || p.partNumber === id) || null;
  }

  public async findByBarcode(barcode: string): Promise<Product | null> {
    const list = await this.findAll();
    return list.find((p) => p.barcode === barcode) || null;
  }

  public async findAll(): Promise<Product[]> {
    const records = databaseService.getProducts();
    return records.map(recordToProduct);
  }

  public async save(product: Product): Promise<void> {
    const current = databaseService.getProducts();
    const record = productToRecord(product);
    const idx = current.findIndex(
      (r) => r.id === product.id || (product.partNumber && r.PARTNO === product.partNumber)
    );
    if (idx >= 0) {
      current[idx] = record;
      databaseService.setProducts([...current]);
    } else {
      databaseService.setProducts([record, ...current]);
    }
  }

  public async update(product: Product): Promise<void> {
    return this.save(product);
  }

  public async delete(id: string): Promise<void> {
    const current = databaseService.getProducts();
    databaseService.setProducts(current.filter((r) => r.id !== id && r.PARTNO !== id));
  }

  public async bulkSave(products: Product[]): Promise<void> {
    const newRecords = products.map(productToRecord);
    const current = databaseService.getProducts();
    const map = new Map<string, ProductRecord>();
    current.forEach((r) => map.set(r.id || r.PARTNO || r.PRODUCT_SCAN || '', r));
    newRecords.forEach((r) => map.set(r.id || r.PARTNO || r.PRODUCT_SCAN || '', r));
    databaseService.setProducts(Array.from(map.values()));
  }
}

export const productRepository = ProductRepository.getInstance();

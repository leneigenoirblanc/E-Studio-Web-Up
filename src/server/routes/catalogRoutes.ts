import { Router } from 'express';
import type { Request, Response } from 'express';
import { serverStateManager, serverState, AVAILABLE_TEMPLATES } from '../state.ts';
import { broadcastLiveEvent } from '../sse.ts';
import type { CatalogItem } from '../types.ts';

export const catalogRouter = Router();

// 1. Catalog Download / Sync (GET /api/v2/catalog/sync)
catalogRouter.get('/catalog/sync', (_req: Request, res: Response) => {
  res.json({
    version: serverState.stationConfig.catalogVersion,
    storeId: serverState.stationConfig.storeId,
    storeName: serverState.stationConfig.storeName,
    totalItems: serverState.catalogItems.length,
    items: serverState.catalogItems,
    templates: AVAILABLE_TEMPLATES,
    timestamp: Date.now(),
  });
});

// 2. Update Server Master Catalog (POST /api/v2/catalog/update)
catalogRouter.post('/catalog/update', (req: Request, res: Response) => {
  const { items } = req.body || {};
  if (Array.isArray(items)) {
    serverState.catalogItems = items.map((it: any): CatalogItem => ({
      sku: String(it.PARTNO || it.sku || it.PRODUCT_SCAN || `SKU-${Math.random().toString(36).substring(2, 6)}`),
      barcode: String(it.PRODUCT_SCAN || it.barcode || ''),
      designation: String(it.ITEMNAME || it.designation || 'Article'),
      department: String(it.CATEGORY_NAME || it.DEPT_NAME || 'Épicerie'),
      category: String(it.CATEGORY_NAME || 'Général'),
      regularPrice: Number(it.SELLING_PRICE || it.regularPrice || 0),
      promoPrice: it.PROMOPRICE !== undefined ? Number(it.PROMOPRICE) : it.promoPrice !== undefined ? Number(it.promoPrice) : null,
      unit: 'pièce',
      stock: Number(it.stock ?? 50),
    }));
    serverState.stationConfig.catalogVersion = `CAT-${Date.now().toString(36).toUpperCase()}`;
    serverStateManager.schedulePersistence();

    broadcastLiveEvent('CATALOG_UPDATED', {
      version: serverState.stationConfig.catalogVersion,
      totalItems: serverState.catalogItems.length,
    });
    return res.json({
      success: true,
      version: serverState.stationConfig.catalogVersion,
      totalItems: serverState.catalogItems.length,
    });
  }
  return res.status(400).json({ success: false, error: 'Invalid items array' });
});

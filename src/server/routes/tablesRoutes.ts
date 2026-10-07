import { Router } from 'express';
import type { Request, Response } from 'express';
import { serverStateManager, serverState } from '../state.ts';
import { broadcastLiveEvent } from '../sse.ts';
import type { ImportedTable, PrintJob } from '../types.ts';

export const tablesRouter = Router();

// Import Tables & Scan Lots Handler
const handleImport = (req: Request, res: Response) => {
  const tableData = req.body;

  if (!tableData || typeof tableData !== 'object') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PAYLOAD',
      error: 'Request body must be a valid JSON object',
    });
  }

  const rawItems = Array.isArray(tableData.items) ? tableData.items : [];
  if (rawItems.length === 0) {
    return res.status(400).json({
      success: false,
      code: 'EMPTY_BATCH',
      error: 'La table importée ne contient aucun article à imprimer',
    });
  }

  // Sanitize items array
  const sanitizedItems = rawItems.map((it: any) => ({
    sku: String(it.sku || it.PARTNO || it.PRODUCT_SCAN || `SKU-${Date.now()}`),
    barcode: String(it.barcode || it.PRODUCT_SCAN || ''),
    designation: String(it.designation || it.ITEMNAME || 'Article').substring(0, 150),
    regularPrice: Number(it.regularPrice || it.SELLING_PRICE || 0),
    promoPrice: it.promoPrice !== undefined ? Number(it.promoPrice) : null,
    quantity: Math.max(1, parseInt(it.quantity || it.copies || 1, 10)),
    department: String(it.department || it.DEPT_NAME || 'Général').substring(0, 80),
  }));

  const tableId = String(tableData.tableId || tableData.id || `TB-${Date.now()}`);
  const tableName = String(tableData.tableName || tableData.name || 'Table Scans Mobile').substring(0, 100);
  const operatorName = String(tableData.operatorName || 'Opérateur Mobile').substring(0, 80);

  const itemsCount = sanitizedItems.length;
  const totalLabelsCount = sanitizedItems.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

  const importedTable: ImportedTable = {
    tableId,
    tableName,
    colorTag: tableData.colorTag || 'BLUE',
    department: tableData.department || 'Tous Rayons',
    operatorName,
    isLocked: tableData.isLocked ?? true,
    createdAt: tableData.createdAt || Date.now(),
    exportedAt: tableData.exportedAt || Date.now(),
    receivedAt: Date.now(),
    itemsCount,
    totalLabelsCount,
    status: 'QUEUED',
    items: sanitizedItems,
  };

  // Upsert table
  const existingIdx = serverState.importedTables.findIndex((t) => t.tableId === tableId);
  if (existingIdx >= 0) {
    serverState.importedTables[existingIdx] = importedTable;
  } else {
    serverState.importedTables.unshift(importedTable);
  }

  // Create corresponding Print Job
  const printJob: PrintJob = {
    id: `JOB-${tableId}`,
    tableId,
    tableName,
    status: 'QUEUED',
    progress: 0,
    totalLabels: totalLabelsCount,
    createdAt: Date.now(),
  };
  serverState.printQueue.unshift(printJob);
  serverStateManager.schedulePersistence();

  // Broadcast to all connected clients & desktop UI
  broadcastLiveEvent('TABLE_IMPORTED', {
    table: importedTable,
    job: printJob,
  });

  return res.json({
    success: true,
    importedTableId: tableId,
    importedItemsCount: itemsCount,
    totalLabelsCount,
    printJobStatus: 'QUEUED',
    message: "Table intégrée avec succès dans la file d'impression PC",
  });
};

tablesRouter.post('/tables/import', handleImport);
tablesRouter.post('/lots/import', handleImport);

// Get all imported tables
tablesRouter.get('/tables', (_req: Request, res: Response) => {
  res.json({
    tables: serverState.importedTables,
    total: serverState.importedTables.length,
  });
});

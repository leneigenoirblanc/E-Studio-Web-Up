export interface StationConfig {
  protocol: string;
  stationId: string;
  stationName: string;
  storeName: string;
  storeId: string;
  host: string;
  port: number;
  token: string;
  pin: string;
  version: string;
  catalogVersion: string;
  status: string;
}

export interface DeviceRecord {
  deviceId: string;
  deviceName: string;
  operatorName: string;
  sessionToken: string;
  registeredAt: number;
  lastSeen: number;
  status: 'ACTIVE' | 'DISCONNECTED';
}

export interface ImportedTableItem {
  sku: string;
  barcode: string;
  designation: string;
  regularPrice: number;
  promoPrice?: number | null;
  quantity: number;
  department: string;
}

export interface ImportedTable {
  tableId: string;
  tableName: string;
  colorTag: string;
  department: string;
  operatorName: string;
  isLocked: boolean;
  createdAt: number;
  exportedAt: number;
  receivedAt: number;
  itemsCount: number;
  totalLabelsCount: number;
  status: string;
  items: ImportedTableItem[];
}

export interface PrintJob {
  id: string;
  tableId: string;
  tableName: string;
  status: 'QUEUED' | 'PRINTING' | 'DONE' | 'ERROR';
  progress: number;
  totalLabels: number;
  createdAt: number;
}

export interface CatalogItem {
  sku: string;
  barcode: string;
  designation: string;
  department: string;
  category: string;
  regularPrice: number;
  promoPrice?: number | null;
  unit: string;
  stock: number;
}

export interface PersistedServerState {
  stationConfig: StationConfig;
  registeredDevices: Record<string, DeviceRecord>;
  importedTables: ImportedTable[];
  printQueue: PrintJob[];
  catalogItems: CatalogItem[];
}

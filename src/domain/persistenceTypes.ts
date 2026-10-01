/**
 * E-Studio — Types & Modèles du Domaine de Persistance
 * Conformes à PERSISTENCE_ARCHITECTURE.md
 */

// ============================================================================
// 1. Paramètres Applicatifs (Settings / Preferences)
// ============================================================================

export interface AppSettings {
  version: number;

  general: {
    language: 'fr' | 'en';
    theme: 'light' | 'dark' | 'system';
    autosave: boolean;
    autosaveIntervalSeconds: number;
  };

  editor: {
    gridEnabled: boolean;
    gridSizeMm: number;
    snapEnabled: boolean;
    smartGuidesEnabled: boolean;
    showRulers: boolean;
    showBleed: boolean;
  };

  scanner: {
    confirmationMode: 'manual' | 'automatic';
    soundEnabled: boolean;
    hapticFeedback: boolean;
  };

  pricing: {
    currency: string;
    exchangeRate: number;
  };

  printing: {
    defaultPrinterId: string | null;
    defaultPaperSize: 'A4' | 'A3' | 'LETTER';
    orientation: 'portrait' | 'landscape';
  };
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  version: 1,

  general: {
    language: 'fr',
    theme: 'system',
    autosave: true,
    autosaveIntervalSeconds: 30,
  },

  editor: {
    gridEnabled: true,
    gridSizeMm: 2,
    snapEnabled: true,
    smartGuidesEnabled: true,
    showRulers: true,
    showBleed: true,
  },

  scanner: {
    confirmationMode: 'automatic',
    soundEnabled: true,
    hapticFeedback: false,
  },

  pricing: {
    currency: 'XAF',
    exchangeRate: 1,
  },

  printing: {
    defaultPrinterId: null,
    defaultPaperSize: 'A4',
    orientation: 'portrait',
  },
};

/**
 * Migration automatique et versionnée des préférences
 */
export function migrateSettings(raw: any): AppSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_APP_SETTINGS };
  }

  let current = { ...raw };

  // Initial version fallback
  if (!current.version || current.version < 1) {
    current = {
      ...DEFAULT_APP_SETTINGS,
      ...current,
      version: 1,
    };
  }

  // Deep merge avec les valeurs par défaut pour combler les champs manquants
  return {
    version: current.version || 1,
    general: {
      ...DEFAULT_APP_SETTINGS.general,
      ...(current.general || {}),
    },
    editor: {
      ...DEFAULT_APP_SETTINGS.editor,
      ...(current.editor || {}),
    },
    scanner: {
      ...DEFAULT_APP_SETTINGS.scanner,
      ...(current.scanner || {}),
    },
    pricing: {
      ...DEFAULT_APP_SETTINGS.pricing,
      ...(current.pricing || {}),
    },
    printing: {
      ...DEFAULT_APP_SETTINGS.printing,
      ...(current.printing || {}),
    },
  };
}

// ============================================================================
// 2. Produits & Tarification Métier
// ============================================================================

export interface ProductTier {
  id?: string;
  minQuantity: number;
  unitPrice: number;
  label?: string;
}

export interface Product {
  id: string;
  barcode?: string;
  partNumber?: string;
  itemName: string;

  sellingPrice?: number;
  promoPrice?: number;
  referencePrice?: number;

  unitWeight?: number;
  unitWeightUnit?: 'kg' | 'g' | 'l' | 'cl' | 'ml' | 'piece';

  upTo?: number;
  tiers?: ProductTier[];

  currency?: string;
  category?: string;
  department?: string;
  brand?: string;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 3. Imprimantes
// ============================================================================

export type PrinterType = 'zebra' | 'citizen' | 'tsc' | 'windows' | 'pdf';
export type PrinterProtocol = 'zpl' | 'raw' | 'windows' | 'pdf';
export type PrinterConnectionType = 'network' | 'usb' | 'windows' | 'file';

export interface PrinterConnection {
  type: PrinterConnectionType;
  host?: string;
  port?: number;
  devicePath?: string;
}

export interface PrinterCapabilities {
  dpi?: number;
  thermal?: boolean;
  color?: boolean;
  maxWidthMm?: number;
}

export interface Printer {
  id: string;
  name: string;
  type: PrinterType;
  protocol: PrinterProtocol;
  connection: PrinterConnection;
  capabilities?: PrinterCapabilities;
  isDefault: boolean;
  status?: 'online' | 'offline' | 'busy' | 'error';
  lastSeenAt?: string;
}

// ============================================================================
// 4. Importation & Mapping
// ============================================================================

export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ImportError {
  row: number;
  column?: string;
  message: string;
  rawValue?: string;
}

export interface ImportJob {
  id: string;
  fileName: string;
  fileType: 'xlsx' | 'xlsm' | 'csv';
  startedAt: string;
  completedAt?: string;
  status: ImportJobStatus;
  totalRows: number;
  importedRows: number;
  errorRows: number;
  mappingId?: string;
  errors?: ImportError[];
}

// ============================================================================
// 5. Spooler & Travaux d'Impression (Print Jobs)
// ============================================================================

export type PrintJobStatus =
  | 'pending'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface PrintJob {
  id: string;
  projectId?: string;
  templateId?: string;
  printerId: string;
  printerName?: string;
  status: PrintJobStatus;
  totalLabels: number;
  printedLabels: number;
  failedLabels: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

// ============================================================================
// 6. Audit & Traçabilité
// ============================================================================

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  operator?: string;
}

// ============================================================================
// 7. Sauvegarde & Restauration (Backup / Restore)
// ============================================================================

export interface BackupManifest {
  manifestVersion: number;
  appVersion: string;
  schemaVersion: number;
  exportedAt: string;
  itemCounts: {
    products: number;
    templates: number;
    printers: number;
    printJobs: number;
    importJobs: number;
    auditEvents: number;
  };
}

export interface BackupArchive {
  manifest: BackupManifest;
  settings: AppSettings;
  products: Product[];
  templates: any[];
  printers: Printer[];
  printJobs: PrintJob[];
  importJobs: ImportJob[];
  auditEvents: AuditEvent[];
}

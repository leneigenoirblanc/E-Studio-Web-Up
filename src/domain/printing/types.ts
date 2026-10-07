/**
 * E-Studio — Printing Domain Models
 * Strict Separation: LabelFormat ≠ LabelTemplate ≠ MediaProfile ≠ PrinterModel ≠ PrinterInstance ≠ PrintJob
 */

export type MeasurementUnit = 'mm' | 'in' | 'dots';

export type MediaType =
  | 'DIE_CUT'
  | 'CONTINUOUS'
  | 'BLACK_MARK'
  | 'NOTCH'
  | 'FANFOLD'
  | 'LINERLESS'
  | 'SHEET';

export type LabelShape = 'Rectangle' | 'Rounded Rectangle';

export type FormatCategory =
  | 'Small'
  | 'Standard Retail'
  | 'Shelf / Supermarket'
  | 'Large / Product'
  | 'Continuous'
  | 'Sheet';

export interface LabelFormat {
  id: string;
  name: string;
  description: string;
  category: FormatCategory;
  width: number; // in mm
  height: number; // in mm
  unit: MeasurementUnit;
  orientation: 'portrait' | 'landscape';
  topMargin: number;
  bottomMargin: number;
  leftMargin: number;
  rightMargin: number;
  horizontalGap: number;
  verticalGap: number;
  columns: number;
  rows: number;
  mediaTypeId: MediaType;
  shape: LabelShape;
  cornerRadius: number;
  printableWidth: number;
  printableHeight: number;
  isBuiltIn: boolean;
  isCustom: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
  // Sheet specific metadata
  sheetConfig?: {
    pageSize: 'A4' | 'A5' | 'LETTER' | 'CUSTOM';
    customPageWidth?: number;
    customPageHeight?: number;
    labelsPerPage: number;
  };
}

export interface MediaProfile {
  id: string;
  name: string;
  rollWidth: number; // mm
  coreDiameter: number; // mm (e.g. 25.4mm / 1 inch or 76mm / 3 inch)
  mediaType: MediaType;
  blackMarkOffset?: number;
  adhesiveType: 'permanent' | 'removable' | 'deep_freeze' | 'repositionable';
  compatibleLabelFormatIds: string[];
}

export type PrinterType =
  | 'Label Printer'
  | 'POS-Receipt Printer'
  | 'Office Printer'
  | 'Industrial Printer';

export type PrintTechnology =
  | 'Direct Thermal'
  | 'Thermal Transfer'
  | 'Laser/Inkjet';

export type PrinterConnectionType =
  | 'USB'
  | 'Ethernet'
  | 'Wi-Fi'
  | 'Bluetooth'
  | 'Serial'
  | 'Windows Driver'
  | 'Network Share';

export type CommandLanguage =
  | 'ZPL'
  | 'TSPL'
  | 'EPL'
  | 'ESC/POS'
  | 'CPCL'
  | 'SATO'
  | 'SystemDriver'
  | 'Generic';

export interface PrinterCapabilities {
  cutter: boolean;
  peeler: boolean;
  tearOff: boolean;
  linerless: boolean;
  supportedSymbologies: string[];
  maxPrintSpeedIps?: number;
}

export interface PrinterModel {
  id: string;
  manufacturer: string;
  model: string;
  family: string;
  printerType: PrinterType;
  technology: PrintTechnology;
  resolutionOptions: number[]; // e.g. [203, 300]
  maxMediaWidth: number; // mm
  minMediaWidth?: number; // mm
  maxMediaHeight?: number; // mm
  supportedConnectionTypes: PrinterConnectionType[];
  commandLanguage: CommandLanguage;
  supportedMediaTypes: MediaType[];
  capabilities: PrinterCapabilities;
  isLiveQueried?: boolean;
}

export type PrinterStatus =
  | 'READY'
  | 'BUSY'
  | 'PRINTING'
  | 'PAUSED'
  | 'OFFLINE'
  | 'ERROR'
  | 'UNKNOWN';

export interface CalibrationOffsets {
  horizontal: number; // mm (-10 to +10)
  vertical: number; // mm (-10 to +10)
  rotation: 0 | 90 | 180 | 270;
  scale: number; // 0.8 to 1.2, default 1.0
}

export interface ConnectionDetails {
  address?: string;
  port?: number;
  usbDeviceName?: string;
  serialPort?: string;
  baudRate?: number;
  bluetoothAddress?: string;
}

export interface PrinterInstance {
  id: string;
  name: string;
  printerModelId: string | null; // null for Generic
  connectionType: PrinterConnectionType;
  connectionDetails: ConnectionDetails;
  selectedDpi: number;
  calibrationOffsets: CalibrationOffsets;
  darkness?: number; // 0-30
  printSpeedIps?: number; // 2-14
  defaultLabelFormatId?: string;
  defaultTemplateId?: string;
  isDefault?: boolean;
  status: PrinterStatus;
  statusMessage?: string;
  createdAt: number;
  lastUsedAt?: number;
}

export type PrintJobStatus =
  | 'QUEUED'
  | 'PREPARING'
  | 'PRINTING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export interface PrintJobLog {
  timestamp: number;
  message: string;
  type: 'info' | 'warn' | 'error';
}

export interface PrintJob {
  id: string;
  templateId: string;
  templateName: string;
  labelFormatId: string;
  labelFormatName: string;
  printerInstanceId: string;
  printerName: string;
  dataSource: string;
  quantity: number;
  copies: number;
  totalLabels: number;
  renderingMode: 'native' | 'raster';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: PrintJobStatus;
  lastCompletedIndex: number; // Resumable batch index (0 to totalLabels - 1)
  failedIndices: number[];
  error?: string;
  logs: PrintJobLog[];
}

export type CompatibilityStatus = 'Compatible' | 'Attention' | 'Incompatible';

export interface CompatibilityIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  recommendation?: string;
  canAutoFix?: boolean;
}

export interface CompatibilityReport {
  status: CompatibilityStatus;
  recommendedRenderingMode: 'native' | 'raster';
  issues: CompatibilityIssue[];
  printerDpi: number;
  labelDimensionsMm: { width: number; height: number };
  printableDimensionsMm: { width: number; height: number };
  labelDimensionsDots: { width: number; height: number };
}

export interface CurrencyConfig {
  code: string; // 'EUR', 'USD', 'INR', 'XOF', etc.
  symbol: string; // '€', '$', '₹', 'FCFA'
  position: 'prefix' | 'suffix';
  decimalSeparator: '.' | ',';
  thousandsSeparator: ' ' | ',' | '.';
  decimals: number;
}

export interface PrintingSettings {
  defaultPrinterId?: string;
  defaultFormatId?: string;
  defaultTemplateName?: string;
  measurementUnit: 'mm' | 'in';
  showDualUnits: boolean;
  currency: CurrencyConfig;
  batchConfirmationThreshold: number; // default 500
  autoPreview: boolean;
  strictBarcodeValidation: boolean;
  defaultCopies: number;
}

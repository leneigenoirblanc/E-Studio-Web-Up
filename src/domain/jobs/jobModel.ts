/**
 * E-Studio Canonical Production Job Model
 * Conforms to SECTION 5 & 6 (Core Domain Entities), 12 (Real Output), 13 (Resumable Printing), 17 (Freeze Dataset)
 */

import { LabelTemplate } from '../../types';
import { EffectiveProduct } from '../resolution/types';
import { PreflightIssue, ImpositionConfig } from '../workflow/types';

export type JobStatus =
  | 'DRAFT'
  | 'STAGED'
  | 'RESOLVED'
  | 'VALIDATED'
  | 'FROZEN'
  | 'OUTPUT'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'ARCHIVED';

export type OutputOutcome =
  | 'PREPARED'
  | 'HANDED_TO_SYSTEM'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'FAILED'
  | 'PARTIAL';

export interface OutputAttempt {
  id: string;
  jobId: string;
  timestamp: string;
  outputFormat: 'PDF_SHEET' | 'PDF_THERMAL' | 'ZPL_RAW' | 'PRINT_DIALOG';
  printerName: string;
  transport: 'BROWSER_DIALOG' | 'FILE_DOWNLOAD' | 'NETWORK_RAW_SOCKET' | 'TAURI_RAW_BRIDGE';
  startIndex: number; // 0-based
  endIndex: number;
  totalQuantity: number;
  completedQuantity: number;
  outcome: OutputOutcome;
  acknowledgementMessage?: string;
  errorMessage?: string;
  operator: string;
}

export interface StockProfile {
  id: string;
  name: string;
  mediaType: 'SHEET' | 'THERMAL_ROLL';
  labelWidthMm: number;
  labelHeightMm: number;
  paperFormat?: 'A4' | 'A3' | 'Letter';
  gapHorizontalMm?: number;
  gapVerticalMm?: number;
  marginMm?: number;
  rows?: number;
  columns?: number;
  dpi?: 203 | 300 | 600;
  darkness?: number;
}

export interface ProductionJob {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  templateVersionId: string;
  templateSnapshot: LabelTemplate;
  status: JobStatus;
  stockProfile: StockProfile;
  imposition: ImpositionConfig;
  rawRows: any[];
  columnMappings: Record<string, string>;
  resolvedRows: EffectiveProduct[];
  frozenAt?: string;
  frozenHash?: string;
  preflightSummary: {
    blockingCount: number;
    warningCount: number;
    issues: PreflightIssue[];
  };
  outputAttempts: OutputAttempt[];
  totalLabels: number;
  lastCompletedIndex: number; // Resumable index tracking (0 to totalLabels)
  operator: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export function createDefaultJob(
  template: LabelTemplate,
  initialRows: any[] = [],
  operator = 'Opérateur Caisse'
): ProductionJob {
  const now = new Date().toISOString();
  const id = `JOB-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const isThermal = template.width_mm <= 110 && template.height_mm <= 80;

  const stockProfile: StockProfile = {
    id: `STOCK-${template.name.replace(/\s+/g, '-').toLowerCase()}`,
    name: isThermal ? `Rouleau Thermique ${template.width_mm}x${template.height_mm} mm` : `Planche A4 (${template.width_mm}x${template.height_mm} mm)`,
    mediaType: isThermal ? 'THERMAL_ROLL' : 'SHEET',
    labelWidthMm: template.width_mm,
    labelHeightMm: template.height_mm,
    paperFormat: 'A4',
    gapHorizontalMm: 2,
    gapVerticalMm: 0,
    marginMm: 10,
    rows: Math.max(1, Math.floor(277 / template.height_mm)),
    columns: Math.max(1, Math.floor(190 / template.width_mm)),
    dpi: 203,
  };

  const imposition: ImpositionConfig = {
    layoutType: isThermal ? 'single_thermal' : 'grid',
    rows: stockProfile.rows || 1,
    columns: stockProfile.columns || 1,
    marginMm: 10,
    gapHorizontalMm: 2,
    gapVerticalMm: 0,
    startSlotOffset: 0,
    showCropMarks: false,
    paperFormat: 'A4',
  };

  return {
    id,
    name: `Tirage ${template.name} — ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
    templateId: template.name,
    templateName: template.name,
    templateVersionId: `v1.0-${Date.now().toString(36)}`,
    templateSnapshot: JSON.parse(JSON.stringify(template)),
    status: initialRows.length > 0 ? 'STAGED' : 'DRAFT',
    stockProfile,
    imposition,
    rawRows: initialRows,
    columnMappings: {},
    resolvedRows: [],
    preflightSummary: { blockingCount: 0, warningCount: 0, issues: [] },
    outputAttempts: [],
    totalLabels: initialRows.length,
    lastCompletedIndex: 0,
    operator,
    createdAt: now,
    updatedAt: now,
  };
}

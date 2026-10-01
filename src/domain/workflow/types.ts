/**
 * E-Studio Production Workflow — Types & Spécifications Officielles
 * Modèle en 5 Étapes Industrielles :
 * 1. INGESTION & STAGING
 * 2. RÉSOLUTION & ARBITRAGE (Snapshot Immuable)
 * 3. ORCHESTRATION & CALCULS DOMAINE (Rule Engine + Pricing Engine + Template Resolver)
 * 4. PREFLIGHT, DOUBLE BÀT & IMPOSITION (Unitaire + Planche)
 * 5. PRODUCTION, SPOOLER LOCAL-FIRST & AUDIT TAMPER-EVIDENT
 */

import { EffectiveProduct, ProductionDataset } from '../resolution/types';
import { RuleDefinition } from '../orchestration/types';
import { LabelTemplate } from '../../types';

export type WorkflowStageId =
  | 'STAGE_1_INGESTION'
  | 'STAGE_2_RESOLUTION'
  | 'STAGE_3_ORCHESTRATION'
  | 'STAGE_4_PREFLIGHT_BAT'
  | 'STAGE_5_PRODUCTION';

export type WorkflowStepStatus =
  | 'NOT_STARTED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'REQUIRES_ATTENTION'
  | 'BLOCKED';

export type WorkflowMode = 'EXPRESS' | 'STANDARD' | 'EXPERT';

export interface WorkflowStageState {
  id: WorkflowStageId;
  label: string;
  subtitle: string;
  status: WorkflowStepStatus;
  details?: string;
  blockingIssuesCount: number;
  warningsCount: number;
}

export interface DataContractField {
  targetKey: string;
  label: string;
  type: 'string' | 'decimal' | 'identifier' | 'boolean' | 'date';
  required: boolean;
  sourcePriority: 'IMPORT' | 'REFERENCE' | 'COMPUTED' | 'USER';
  validationRule?: string;
}

export interface MappingProfile {
  id: string;
  name: string;
  version: number;
  sourceType: 'EXCEL' | 'CSV' | 'SAP_ERP' | 'POS_WINCOR' | 'GENERIC';
  columnMapping: Record<string, string>; // ex: "Code Barre": "PRODUCT_SCAN"
  dataContracts: DataContractField[];
  createdAt: string;
  updatedAt: string;
}

export type PreflightSeverity = 'INFO' | 'WARNING' | 'BLOCKING';

export interface PreflightIssue {
  id: string;
  productId?: string;
  productName?: string;
  barcode?: string;
  field?: string;
  severity: PreflightSeverity;
  category: 'BARCODE' | 'PRICING' | 'GEOMETRY' | 'DATA_INTEGRITY' | 'THERMAL' | 'IMPOSITION';
  message: string;
  recommendation?: string;
}

export interface PreflightReport {
  timestamp: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  totalChecked: number;
  blockingCount: number;
  warningCount: number;
  infoCount: number;
  issues: PreflightIssue[];
  thermalAnalysisIncluded: boolean;
}

export interface ImpositionConfig {
  layoutType: 'grid' | 'single_thermal' | 'multi_slot';
  rows: number;
  columns: number;
  marginMm: number;
  gapHorizontalMm: number;
  gapVerticalMm: number;
  startSlotOffset: number; // 0 à N-1 pour réutiliser les planches entamées
  showCropMarks: boolean;
  paperFormat: 'A4' | 'A3' | 'Letter' | 'Roll_Thermal';
}

export interface ProductionJobPackage {
  formatVersion: '1.0.0';
  jobId: string;
  jobName: string;
  mode: WorkflowMode;
  createdAt: string;
  frozenAt: string;
  
  // Snapshots immuables
  manifest: {
    appVersion: string;
    totalProducts: number;
    totalLabelsToPrint: number;
    author: string;
    hashSignature: string;
  };
  
  datasetSnapshot: ProductionDataset;
  referenceCatalogVersion: string;
  mappingProfileSnapshot?: MappingProfile;
  rulesSnapshot: RuleDefinition[];
  pricingRulesVersion: string;
  templateSnapshot: LabelTemplate;
  impositionSnapshot: ImpositionConfig;
  preflightReportSnapshot: PreflightReport;
  
  // Audit Tamper-evident
  auditChain: {
    previousEventHash: string;
    currentHash: string;
    loggedAt: string;
  };
}

/**
 * GenerationWorkspace (Refactored Phase 1 & Phase 2 Pipeline Studio)
 * 
 * Unified 5-Stage Production Cockpit:
 * 1. Ingestion (Staging & file drag-and-drop)
 * 2. Resolution (Canonical matching & conflict arbitration)
 * 3. Orchestration (Hybrid rules & dynamic pricing engine)
 * 4. Imposition & Preflight BAT (Avery presets, zero-waste offset slot, calibration)
 * 5. Production & Spooling (Vector PDF, ZPL II, PPTX, .estudio-job)
 * 
 * Powered by the Persistent Production Tray and the Unified Render IR.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  LabelTemplate,
  ProductRecord,
  ImpositionConfig,
  PdfExportConfig,
} from '../types';
import { databaseService } from '../services/databaseService';
import { ImpositionCalculator } from '../utils/impositionCalculator';
import { useAppStore } from '../store/useAppStore';
import { useToast } from './ToastNotification';
import { resolutionEngine } from '../domain/resolution/resolutionEngine';
import { ProductionDataset } from '../domain/resolution/types';
import { preflightEngine } from '../domain/workflow/preflightEngine';
import { jobPackageService } from '../domain/workflow/jobPackageService';
import {
  WorkflowStageId,
  WorkflowStageState,
  WorkflowMode,
  PreflightReport,
} from '../domain/workflow/types';

// Stages Components
import { Stage1Ingestion } from './workspace/stages/Stage1Ingestion';
import { Stage2Resolution } from './workspace/stages/Stage2Resolution';
import { Stage3Orchestration } from './workspace/stages/Stage3Orchestration';
import { Stage4ImpositionPreflight } from './workspace/stages/Stage4ImpositionPreflight';
import { Stage5Production } from './workspace/stages/Stage5Production';
import { PersistentProductionTray } from './workspace/PersistentProductionTray';

// Navigation & Modals
import { WorkflowStepperBar } from './WorkflowStepperBar';
import { PreflightReportModal } from './PreflightReportModal';
import { ProductionPrintModal } from './ProductionPrintModal';
import { DataResolutionCenterModal } from './DataResolutionCenterModal';

// Specialized Studios
import { MultiSlotSignageStudio } from './MultiSlotSignageStudio';
import { TierPricingStudio } from './TierPricingStudio';
import { ProductClusteringStudio } from './ProductClusteringStudio';

import {
  ArrowLeft,
  Settings2,
  Layers,
  Sparkles,
  Grid,
  TrendingDown,
  Boxes,
  LayoutGrid,
} from 'lucide-react';

interface GenerationWorkspaceProps {
  template: LabelTemplate;
  onBack: () => void;
  initialProducts?: ProductRecord[];
  initialBatchName?: string;
}

const STAGE_ORDER: WorkflowStageId[] = [
  'STAGE_1_INGESTION',
  'STAGE_2_RESOLUTION',
  'STAGE_3_ORCHESTRATION',
  'STAGE_4_PREFLIGHT_BAT',
  'STAGE_5_PRODUCTION',
];

export const GenerationWorkspace: React.FC<GenerationWorkspaceProps> = ({
  template,
  onBack,
  initialProducts,
  initialBatchName,
}) => {
  const toast = useToast();
  const { modals, openModal, closeModal, navigateTo } = useAppStore();

  // 1. Production Dataset State
  const [products, setProducts] = useState<ProductRecord[]>(() => {
    if (initialProducts && initialProducts.length > 0) return initialProducts;
    return databaseService.getProducts().slice(0, 5);
  });

  const [productionDataset, setProductionDataset] = useState<ProductionDataset | null>(() => {
    return resolutionEngine.resolveImportBatch(products, {
      batchName: initialBatchName || 'Jeu de production actif',
    });
  });

  // Keep resolution dataset updated when products change
  const handleUpdateProducts = (updated: ProductRecord[]) => {
    setProducts(updated);
    const resolved = resolutionEngine.resolveImportBatch(updated, {
      batchName: initialBatchName || 'Jeu de production actif',
    });
    setProductionDataset(resolved);
  };

  // 2. Active Stage & Sub-Studio View
  const [currentStageId, setCurrentStageId] = useState<WorkflowStageId>('STAGE_1_INGESTION');
  const [activeSpecialView, setActiveSpecialView] = useState<'none' | 'tiers' | 'clustering' | 'multislot'>('none');
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('STANDARD');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 3. Imposition & Preflight State
  const [impositionConfig, setImpositionConfig] = useState<ImpositionConfig>({
    page_size: 'A4',
    orientation: 'portrait',
    gap_mm: 2.0,
    gap_x_mm: 2.0,
    gap_y_mm: 2.0,
    margin_top_mm: 10,
    margin_bottom_mm: 10,
    margin_left_mm: 10,
    margin_right_mm: 10,
    show_cut_marks: true,
    start_offset_slot: 0,
  });

  const imposition = useMemo(() => {
    return ImpositionCalculator.calculate(
      template.width_mm,
      template.height_mm,
      template.outer_margins_mm || { top: 0, bottom: 0, left: 0, right: 0 },
      impositionConfig
    );
  }, [template, impositionConfig]);

  const [pdfConfig] = useState<PdfExportConfig>({
    dpi: 300,
    bleed_mm: 2.0,
    show_crop_marks: true,
    show_registration_marks: false,
    include_calibration_layer: false,
    color_mode: 'cmyk_sim',
  });

  // 4. Preflight Report Calculation
  const preflightReport = useMemo<PreflightReport | null>(() => {
    if (!products.length) return null;
    return preflightEngine.runPreflightCheck(products, template, {
      impositionConfig: {
        layoutType: 'grid',
        rows: imposition?.rows || 1,
        columns: imposition?.cols || 1,
        marginMm: impositionConfig.margin_top_mm || 10,
        gapHorizontalMm: impositionConfig.gap_x_mm ?? impositionConfig.gap_mm ?? 2,
        gapVerticalMm: impositionConfig.gap_y_mm ?? impositionConfig.gap_mm ?? 2,
        startSlotOffset: impositionConfig.start_offset_slot || 0,
        showCropMarks: Boolean(impositionConfig.show_cut_marks),
        paperFormat: impositionConfig.page_size === 'A3' ? 'A3' : impositionConfig.page_size === 'LETTER' ? 'Letter' : 'A4',
      },
    });
  }, [template, products, imposition, impositionConfig]);

  // 5. Modals State
  const [isPreflightModalOpen, setIsPreflightModalOpen] = useState(false);
  const [isProductionPrintOpen, setIsProductionPrintOpen] = useState(false);
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);

  // Workflow Stages Telemetry
  const stageStates = useMemo<WorkflowStageState[]>(() => {
    const errorCount = preflightReport?.blockingCount || 0;
    const warningCount = preflightReport?.warningCount || 0;

    return [
      {
        id: 'STAGE_1_INGESTION',
        label: '1. Ingestion',
        subtitle: `${products.length} articles`,
        status: currentStageId === 'STAGE_1_INGESTION' ? 'ACTIVE' : products.length > 0 ? 'COMPLETED' : 'REQUIRES_ATTENTION',
        blockingIssuesCount: products.length === 0 ? 1 : 0,
        warningsCount: 0,
      },
      {
        id: 'STAGE_2_RESOLUTION',
        label: '2. Résolution',
        subtitle: 'Réconciliation',
        status: currentStageId === 'STAGE_2_RESOLUTION' ? 'ACTIVE' : 'COMPLETED',
        blockingIssuesCount: 0,
        warningsCount: 0,
      },
      {
        id: 'STAGE_3_ORCHESTRATION',
        label: '3. Orchestration',
        subtitle: 'Règles & Tarifs',
        status: currentStageId === 'STAGE_3_ORCHESTRATION' ? 'ACTIVE' : 'COMPLETED',
        blockingIssuesCount: 0,
        warningsCount: 0,
      },
      {
        id: 'STAGE_4_PREFLIGHT_BAT',
        label: '4. Imposition & BÀT',
        subtitle: `${imposition?.total_per_page || 0} poses/pl.`,
        status: currentStageId === 'STAGE_4_PREFLIGHT_BAT' ? 'ACTIVE' : errorCount > 0 ? 'BLOCKED' : warningCount > 0 ? 'REQUIRES_ATTENTION' : 'COMPLETED',
        blockingIssuesCount: errorCount,
        warningsCount: warningCount,
      },
      {
        id: 'STAGE_5_PRODUCTION',
        label: '5. Production',
        subtitle: 'Tirage multi-format',
        status: currentStageId === 'STAGE_5_PRODUCTION' ? 'ACTIVE' : 'NOT_STARTED',
        blockingIssuesCount: 0,
        warningsCount: 0,
      },
    ];
  }, [currentStageId, products.length, imposition, preflightReport]);

  const currentStageIndex = STAGE_ORDER.indexOf(currentStageId);

  const handlePrevStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageId(STAGE_ORDER[currentStageIndex - 1]);
      setActiveSpecialView('none');
    }
  };

  const handleNextStage = () => {
    if (currentStageIndex < STAGE_ORDER.length - 1) {
      setCurrentStageId(STAGE_ORDER[currentStageIndex + 1]);
      setActiveSpecialView('none');
    }
  };

  const handleAddEmptyRow = () => {
    const newProd: ProductRecord = {
      id: `PROD-${Date.now()}`,
      PARTNO: `REF-${products.length + 1}`,
      ITEMNAME: 'Nouvel article',
      SELLING_PRICE: 9.99,
      CATEGORY_NAME: 'Épicerie',
      ORIGIN: 'France',
    };
    handleUpdateProducts([...products, newProd]);
    toast.info('Ligne ajoutée', 'Nouvel article inséré dans le lot de travail.');
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Precision Top Sub-Header: Back & Stepper */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-medium border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour Accueil</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Quick Sub-Studio Toggles */}
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveSpecialView('none')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                activeSpecialView === 'none'
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pipeline Officiel
            </button>
            <button
              type="button"
              onClick={() => setActiveSpecialView('tiers')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                activeSpecialView === 'tiers'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-3 h-3 text-purple-400" />
              <span>Studio Paliers</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSpecialView('clustering')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                activeSpecialView === 'clustering'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Boxes className="w-3 h-3 text-amber-400" />
              <span>Clustering Rayon</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSpecialView('multislot')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                activeSpecialView === 'multislot'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3 h-3 text-emerald-400" />
              <span>Balisage Multi-Slots</span>
            </button>
          </div>
        </div>

        {/* Global Rules shortcut */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openModal('isRulesModalOpen')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="hidden sm:inline">Plateforme de Règles</span>
          </button>
        </div>
      </div>

      {/* Official 5-Stage Stepper Ribbon */}
      {activeSpecialView === 'none' && (
        <WorkflowStepperBar
          stages={stageStates}
          currentStageId={currentStageId}
          mode={workflowMode}
          onSelectStage={(stageId) => setCurrentStageId(stageId)}
          onChangeMode={(mode) => setWorkflowMode(mode)}
          preflightReport={preflightReport}
          onOpenPreflight={() => setIsPreflightModalOpen(true)}
          onExportJobPackage={() => {
            const pkg = jobPackageService.createJobPackage({
              jobName: `Lot_${template.name}`,
              mode: workflowMode,
              dataset: productionDataset || {
                id: `DS-${Date.now()}`,
                name: 'Jeu de production',
                sourceRowCount: products.length,
                status: 'ready',
                products: [],
                stats: { total: products.length, exactMatches: products.length, aliasMatches: 0, conflicts: 0, unresolved: 0, newProducts: 0 },
                createdAt: new Date().toISOString(),
              },
              template,
              rules: [],
              imposition: {
                layoutType: 'grid',
                rows: imposition?.rows || 1,
                columns: imposition?.cols || 1,
                marginMm: impositionConfig.margin_top_mm || 10,
                gapHorizontalMm: impositionConfig.gap_x_mm ?? impositionConfig.gap_mm ?? 2,
                gapVerticalMm: impositionConfig.gap_y_mm ?? impositionConfig.gap_mm ?? 2,
                startSlotOffset: impositionConfig.start_offset_slot || 0,
                showCropMarks: Boolean(impositionConfig.show_cut_marks),
                paperFormat: impositionConfig.page_size === 'A3' ? 'A3' : impositionConfig.page_size === 'LETTER' ? 'Letter' : 'A4',
              },
              preflightReport: preflightReport || {
                timestamp: new Date().toISOString(),
                status: 'PASS',
                totalChecked: products.length,
                blockingCount: 0,
                warningCount: 0,
                infoCount: 0,
                issues: [],
                thermalAnalysisIncluded: false,
              },
            });
            jobPackageService.exportJobFile(pkg);
            toast.success('Paquet .estudio-job téléchargé');
          }}
          onImportJobPackage={() => {
            toast.info('Import Job', 'Sélectionnez un fichier .estudio-job depuis l\'accueil.');
          }}
        />
      )}

      {/* Main Dynamic Viewport */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Render Specialized Studios if selected */}
        {activeSpecialView === 'tiers' && (
          <TierPricingStudio
            products={products}
            onUpdateProduct={(updated) => handleUpdateProducts(products.map((p) => (p.id === updated.id ? updated : p)))}
            onBatchUpdateProducts={handleUpdateProducts}
          />
        )}

        {activeSpecialView === 'clustering' && (
          <ProductClusteringStudio
            products={products}
            onAddVirtualAssortment={(virtualItem) => handleUpdateProducts([...products, virtualItem])}
            onRemoveProduct={(id) => handleUpdateProducts(products.filter((p) => p.id !== id))}
            onUpdateProduct={(updated) => handleUpdateProducts(products.map((p) => (p.id === updated.id ? updated : p)))}
          />
        )}

        {activeSpecialView === 'multislot' && (
          <MultiSlotSignageStudio
            products={products}
            templates={useAppStore.getState().templates}
            onUpdateProduct={(updated) => handleUpdateProducts(products.map((p) => (p.id === updated.id ? updated : p)))}
            onSelectTemplateForCanvas={() => {}}
          />
        )}

        {/* Otherwise, render the active Stage from Pipeline */}
        {activeSpecialView === 'none' && (
          <>
            {currentStageId === 'STAGE_1_INGESTION' && (
              <Stage1Ingestion
                products={products}
                onUpdateProducts={handleUpdateProducts}
                onOpenMasterCatalog={() => navigateTo('database')}
                onAddEmptyRow={handleAddEmptyRow}
                onSelectProductForPreview={setSelectedIndex}
                selectedIndex={selectedIndex}
              />
            )}

            {currentStageId === 'STAGE_2_RESOLUTION' && (
              <Stage2Resolution
                products={products}
                onUpdateProducts={handleUpdateProducts}
                dataset={productionDataset}
                onRefreshResolution={() => {
                  const res = resolutionEngine.resolveImportBatch(products, {
                    batchName: initialBatchName || 'Jeu actualisé',
                  });
                  setProductionDataset(res);
                  toast.success('Données réconciliées', 'Catalogue maître croisé avec succès.');
                }}
              />
            )}

            {currentStageId === 'STAGE_3_ORCHESTRATION' && (
              <Stage3Orchestration
                products={products}
                onUpdateProducts={handleUpdateProducts}
                onOpenRulesManagerModal={() => openModal('isRulesModalOpen')}
              />
            )}

            {currentStageId === 'STAGE_4_PREFLIGHT_BAT' && (
              <Stage4ImpositionPreflight
                template={template}
                products={products}
                imposition={imposition}
                impositionConfig={impositionConfig}
                onUpdateImpositionConfig={(patch) =>
                  setImpositionConfig((prev) => ({ ...prev, ...patch }))
                }
                preflightReport={preflightReport}
                onOpenPreflightModal={() => setIsPreflightModalOpen(true)}
              />
            )}

            {currentStageId === 'STAGE_5_PRODUCTION' && (
              <Stage5Production
                template={template}
                products={products}
                imposition={imposition}
                impositionConfig={impositionConfig}
                pdfConfig={pdfConfig}
                preflightReport={preflightReport}
                onOpenPhysicalPrintModal={() => setIsProductionPrintOpen(true)}
                onExportSuccess={(msg) => toast.success('Export réussi', msg)}
                onError={(err) => toast.error('Erreur', err)}
              />
            )}
          </>
        )}
      </div>

      {/* Persistent Bottom Production Tray */}
      <PersistentProductionTray
        template={template}
        totalProducts={products.length}
        imposition={imposition}
        startOffsetSlot={impositionConfig.start_offset_slot || 0}
        currentStageId={currentStageId}
        stagesCount={STAGE_ORDER.length}
        currentStageIndex={currentStageIndex}
        hasErrors={(preflightReport?.blockingCount || 0) > 0}
        warningsCount={preflightReport?.warningCount || 0}
        onPrevStage={handlePrevStage}
        onNextStage={handleNextStage}
        onQuickProduce={() => setCurrentStageId('STAGE_5_PRODUCTION')}
      />

      {/* Modals */}
      <PreflightReportModal
        isOpen={isPreflightModalOpen}
        onClose={() => setIsPreflightModalOpen(false)}
        report={preflightReport}
        onSelectProduct={(prodId) => {
          const idx = products.findIndex((p) => p.id === prodId);
          if (idx >= 0) setSelectedIndex(idx);
          setCurrentStageId('STAGE_1_INGESTION');
        }}
      />

      <ProductionPrintModal
        isOpen={isProductionPrintOpen}
        onClose={() => setIsProductionPrintOpen(false)}
        template={template}
        products={products}
        onOpenPrintJobs={() => navigateTo('jobs')}
      />

      <DataResolutionCenterModal
        isOpen={isResolutionModalOpen}
        onClose={() => setIsResolutionModalOpen(false)}
        dataset={productionDataset}
        onApplyResolvedDataset={(updatedDataset) => {
          setProductionDataset(updatedDataset);
          const mapped: ProductRecord[] = updatedDataset.products.map((p) => {
            const existing = products.find((pr) => pr.id === p.id);
            return {
              id: p.id,
              PARTNO: p.identifiers.partNumber || existing?.PARTNO || 'REF',
              ITEMNAME: p.identity.name || existing?.ITEMNAME || 'Article',
              SELLING_PRICE: p.commercial.sellingPrice ?? existing?.SELLING_PRICE ?? 0,
              PROMOPRICE: p.commercial.promoPrice ?? existing?.PROMOPRICE,
              CATEGORY_NAME: p.identity.category || existing?.CATEGORY_NAME || 'Général',
              PRODUCT_SCAN: p.identifiers.primaryScan || existing?.PRODUCT_SCAN || '',
              BRAND_INFO: p.identity.brand || existing?.BRAND_INFO || '',
              ORIGIN: existing?.ORIGIN || 'France',
              UNIT_PRICE_LEGAL: existing?.UNIT_PRICE_LEGAL || '',
            };
          });
          setProducts(mapped);
          setIsResolutionModalOpen(false);
          toast.success('Arbitrage appliqué', 'Le lot de production a été mis à jour.');
        }}
      />
    </div>
  );
};

export default GenerationWorkspace;

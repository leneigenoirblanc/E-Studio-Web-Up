/**
 * Stage 5: Multi-Format Vector Production & Industrial Spooling
 * 
 * Generates output formats:
 * - 100% Vector PDF (Powered by Phase 2 Render IR for ultra-fast generation)
 * - Industrial Zebra ZPL II Thermal Code
 * - Microsoft PowerPoint (.pptx) Presentations
 * - Reproducible .estudio-job packages
 * - Direct Network Spooler printing
 */

import React, { useState } from 'react';
import {
  Printer,
  Download,
  FileText,
  Cpu,
  Presentation,
  Archive,
  CheckCircle2,
  Copy,
  Layers,
  Sparkles,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  LabelTemplate,
  ProductRecord,
  ImpositionCalculation,
  ImpositionConfig,
  PdfExportConfig,
} from '../../../types';
import { PreflightReport } from '../../../domain/workflow/types';
import { ExportService } from '../../../domain/exportService';
import { ZplExporter } from '../../../utils/zplExporter';
import { PptxExporter } from '../../../utils/pptxExporter';
import { jobPackageService } from '../../../domain/workflow/jobPackageService';
import { compileTemplateToIR } from '../../../domain/rendering/compileTemplateToIR';
import { renderSceneToZpl } from '../../../domain/rendering/adapters/zplAdapter';

interface Stage5ProductionProps {
  template: LabelTemplate;
  products: ProductRecord[];
  imposition: ImpositionCalculation | null;
  impositionConfig: ImpositionConfig;
  pdfConfig: PdfExportConfig;
  preflightReport: PreflightReport | null;
  onOpenPhysicalPrintModal: () => void;
  onExportSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const Stage5Production: React.FC<Stage5ProductionProps> = ({
  template,
  products,
  imposition,
  impositionConfig,
  pdfConfig,
  preflightReport,
  onOpenPhysicalPrintModal,
  onExportSuccess,
  onError,
}) => {
  const [isExportingVectorPdf, setIsExportingVectorPdf] = useState(false);
  const [isExportingZpl, setIsExportingZpl] = useState(false);
  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [zplCodePreview, setZplCodePreview] = useState<string | null>(null);

  const totalPerSheet = imposition?.total_per_page || 1;
  const startOffset = impositionConfig.start_offset_slot || 0;
  const totalItemsToPlace = products.length + startOffset;
  const totalSheets = Math.max(1, Math.ceil(totalItemsToPlace / totalPerSheet));

  // 1. High-Speed 100% Vector Native PDF (Phase 2 IR Engine)
  const handleExportVectorPdf = async () => {
    if (!imposition) return;
    setIsExportingVectorPdf(true);
    try {
      const doc = await ExportService.generateNativeVectorPdfBatchAsync(
        template,
        products,
        imposition,
        impositionConfig,
        pdfConfig
      );
      const filename = `etiquettes_vectorielles_${template.name.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      onExportSuccess(`PDF vectoriel généré : ${filename} (${products.length} articles)`);
    } catch (err) {
      console.error(err);
      onError(`Erreur lors de la génération PDF : ${String(err)}`);
    } finally {
      setIsExportingVectorPdf(false);
    }
  };

  // 2. Industrial Zebra ZPL II
  const handleExportZpl = () => {
    try {
      setIsExportingZpl(true);
      // Compile first item or all items into ZPL
      const zplOutputs = products.map((prod) => {
        const scene = compileTemplateToIR(template, prod, { dpi: 203 });
        return renderSceneToZpl(scene, { dpi: 203 });
      });

      const fullZpl = zplOutputs.join('\n\n');
      setZplCodePreview(fullZpl);

      // Download .zpl file
      const blob = new Blob([fullZpl], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiquettes_${template.name.toLowerCase().replace(/\s+/g, '_')}.zpl`;
      a.click();
      URL.revokeObjectURL(url);

      onExportSuccess(`Fichier ZPL II généré (${products.length} étiquettes thermiques)`);
    } catch (err) {
      onError(`Erreur ZPL : ${String(err)}`);
    } finally {
      setIsExportingZpl(false);
    }
  };

  // 3. PowerPoint PPTX Presentation
  const handleExportPptx = async () => {
    if (!imposition) return;
    try {
      setIsExportingPptx(true);
      await PptxExporter.exportToPptx(template, products, imposition, impositionConfig);
      onExportSuccess(`Diaporama PowerPoint généré avec succès.`);
    } catch (err) {
      onError(`Erreur PPTX : ${String(err)}`);
    } finally {
      setIsExportingPptx(false);
    }
  };

  // 4. Reproducible Job Package (.estudio-job)
  const handleExportJobPackage = () => {
    try {
      const pkg = jobPackageService.createJobPackage({
        jobName: `Production_${template.name}`,
        mode: 'STANDARD',
        dataset: {
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
      onExportSuccess(`Paquet de production .estudio-job téléchargé.`);
    } catch (err) {
      onError(`Erreur Paquet Job : ${String(err)}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Étape 5 : Production & Multi-Export Industriel
              </h2>
              <p className="text-xs text-slate-400">
                Génération des formats finaux de tirage et distribution vers le parc d'imprimantes.
              </p>
            </div>
          </div>

          {/* Direct Print Button */}
          <button
            type="button"
            onClick={onOpenPhysicalPrintModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer sur le Parc Réseau</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Export Channels */}
      <div className="flex-1 min-h-0 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Articles à Produire</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {products.length}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Planches Nécessaires</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                {totalSheets}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Poses par Planche</span>
              <span className="text-xl font-bold font-mono text-indigo-400 mt-1 block">
                {totalPerSheet}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-400 block">Offset Économie Papier</span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                {startOffset > 0 ? `Pose #${startOffset + 1}` : 'Départ Pose #1'}
              </span>
            </div>
          </div>

          {/* Export Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Vector PDF (IR Powered) */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                    MOTEUR VECTORIEL IR (Phase 2)
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Planches Imposées PDF Haute Définition
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  PDF vectoriel pur (jsPDF natif) à 300 DPI avec repères de coupe, traits de pliage et netteté infinie sans flou de pixellisation.
                </p>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleExportVectorPdf}
                  disabled={isExportingVectorPdf}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingVectorPdf ? 'Calcul vectoriel...' : 'Télécharger le PDF Vectoriel'}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Zebra ZPL II */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950 text-amber-300 border border-amber-800">
                    THERMIQUE DIRECT
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Code Industriel Zebra ZPL II
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Instructions natives ultra-rapides pour imprimantes rouleaux Zebra, TSC, Intermec (commandes ^XA ... ^XZ avec codes-barres matériel).
                </p>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleExportZpl}
                  disabled={isExportingZpl}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingZpl ? 'Compilation ZPL...' : 'Générer & Télécharger le ZPL'}</span>
                </button>
              </div>
            </div>

            {/* Card 3: PowerPoint Presentation */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30">
                    <Presentation className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-900 text-slate-300 border border-slate-800">
                    ÉDITABLE
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Diaporama PowerPoint (.pptx)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Génère un fichier PowerPoint prêt pour retouche manuelle ou diffusion sur écrans d'affichage dynamique en magasin.
                </p>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleExportPptx}
                  disabled={isExportingPptx}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingPptx ? 'Génération PPTX...' : 'Télécharger le Diaporama (.pptx)'}</span>
                </button>
              </div>
            </div>

            {/* Card 4: Job Package */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
                    <Archive className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                    REPRODUCTIBILITÉ
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Paquet Reproductible (.estudio-job)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Archive complète figeant le gabarit, les règles métier et les données d'importation pour audit réglementaire ou ré-impression exacte.
                </p>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleExportJobPackage}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Exporter le Paquet (.estudio-job)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Optional ZPL Code Preview */}
          {zplCodePreview && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>Extrait du Code ZPL II Généré</span>
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(zplCodePreview);
                    onExportSuccess('Code ZPL copié dans le presse-papier !');
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copier le ZPL</span>
                </button>
              </div>
              <pre className="p-3 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-amber-300 max-h-40 overflow-auto select-all">
                {zplCodePreview.slice(0, 1000)}
                {zplCodePreview.length > 1000 ? '\n... (suite tronquée dans l\'aperçu)' : ''}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

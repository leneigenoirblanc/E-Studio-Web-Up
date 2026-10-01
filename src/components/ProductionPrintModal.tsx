import React, { useState, useMemo, useId } from 'react';
import {
  X,
  Printer,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Play,
  RotateCw,
  Eye,
  Check,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { LabelTemplate, ProductRecord } from '../types';
import { LabelFormat, PrinterInstance, CompatibilityReport } from '../domain/printing/types';
import { printerRepository } from '../domain/printing/printerRepository';
import { formatRepository } from '../domain/printing/formatRepository';
import { printingSettingsService } from '../domain/printing/printingSettingsService';
import { CompatibilityEngine } from '../domain/printing/compatibilityEngine';
import { PrinterAdapterFactory } from '../domain/printing/adapters/PrinterAdapterFactory';
import { printJobService } from '../domain/printing/printJobService';
import { useToast } from './ToastNotification';
import { ruleOrchestrator } from '../domain/orchestration/ruleOrchestrator';
import { rulesRepository } from '../domain/orchestration/rulesRepository';
import { RuleTrigger } from '../domain/orchestration/types';

interface ProductionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: LabelTemplate;
  products: ProductRecord[];
  onOpenPrintJobs?: () => void;
}

export const ProductionPrintModal: React.FC<ProductionPrintModalProps> = ({
  isOpen,
  onClose,
  template,
  products,
  onOpenPrintJobs,
}) => {
  const modalTitleId = useId();
  const toast = useToast();
  const settings = printingSettingsService.getSettings();

  const printers = printerRepository.getAll();
  const formats = formatRepository.getAll();

  // Match closest format to template
  const initialFormat =
    formats.find((f) => f.width === template.width_mm && f.height === template.height_mm) ||
    formats.find((f) => f.id === settings.defaultFormatId) ||
    formats[0];

  const initialPrinter =
    printers.find((p) => p.id === settings.defaultPrinterId) || printers[0];

  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(initialPrinter?.id || '');
  const [selectedFormatId, setSelectedFormatId] = useState<string>(initialFormat?.id || '');
  const [copies, setCopies] = useState<number>(settings.defaultCopies || 1);
  const [needsHighVolumeConfirmation, setNeedsHighVolumeConfirmation] = useState(false);
  const [confirmedHighVolume, setConfirmedHighVolume] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [jobCreatedId, setJobCreatedId] = useState<string | null>(null);

  const selectedPrinter = printers.find((p) => p.id === selectedPrinterId) || printers[0];
  const selectedFormat = formats.find((f) => f.id === selectedFormatId) || formats[0];
  const printerModel = selectedPrinter ? printerRepository.getModelForInstance(selectedPrinter) : null;

  // Compatibility Engine evaluation
  const compatibilityReport: CompatibilityReport | null = useMemo(() => {
    if (!selectedFormat || !selectedPrinter) return null;
    return CompatibilityEngine.evaluate(selectedFormat, template, selectedPrinter, printerModel);
  }, [selectedFormat, template, selectedPrinter, printerModel]);

  const totalLabels = products.length * copies;
  const isAboveThreshold = totalLabels >= (settings.batchConfirmationThreshold || 500);

  if (!isOpen) return null;

  const handleLaunchPrint = async () => {
    if (isAboveThreshold && !confirmedHighVolume) {
      setNeedsHighVolumeConfirmation(true);
      return;
    }

    if (!selectedPrinter || !selectedFormat) return;

    setIsExecuting(true);

    try {
      const mode = compatibilityReport?.recommendedRenderingMode || 'native';

      // 0. Exécution du hook BEFORE_PRINT via RuleOrchestrator
      ruleOrchestrator.executeHook(
        RuleTrigger.BEFORE_PRINT,
        {
          product: {
            itemName: products[0]?.ITEMNAME || '',
            sellingPrice: Number(products[0]?.SELLING_PRICE) || 0,
            department: products[0]?.CATEGORY_NAME,
            barcode: products[0]?.PRODUCT_SCAN,
          },
          pricing: {
            regularPrice: Number(products[0]?.SELLING_PRICE) || 0,
            hasPromo: Boolean(products[0]?.PROMOPRICE),
          },
          template: {
            currentTemplateId: template.name,
            resolvedTemplateId: template.name,
          },
          print: {
            printerId: selectedPrinter.id,
            copies,
          },
          batch: {
            totalCount: totalLabels,
            currentIndex: 0,
            isFirst: true,
            isLast: true,
          },
        },
        rulesRepository.getAll(),
        { recordTrace: true }
      );

      // 1. Create print job in queue with lastCompletedIndex = -1
      const job = printJobService.createJob({
        templateId: template.name,
        templateName: template.name,
        labelFormatId: selectedFormat.id,
        labelFormatName: selectedFormat.name,
        printerInstanceId: selectedPrinter.id,
        printerName: selectedPrinter.name,
        dataSource: `${products.length} articles sélectionnés`,
        quantity: products.length,
        copies,
        renderingMode: mode,
      });

      setJobCreatedId(job.id);
      printJobService.updateJobStatus(job.id, 'PREPARING');

      // 2. Generate payloads via Adapter
      const adapter = PrinterAdapterFactory.getAdapter(printerModel, selectedPrinter);
      const payload = await adapter.generateLabelPayload(
        template,
        selectedFormat,
        selectedPrinter,
        products,
        printerModel
      );

      printJobService.updateJobStatus(job.id, 'PRINTING');

      // 3. Simulate streaming labels with progress updates
      let completed = 0;
      const interval = setInterval(() => {
        completed += Math.max(1, Math.floor(totalLabels / 5));
        if (completed >= totalLabels) {
          clearInterval(interval);
          printJobService.updateJobStatus(job.id, 'COMPLETED', {
            lastCompletedIndex: totalLabels - 1,
            completedAt: Date.now(),
          });
          // Hook AFTER_PRINT via RuleOrchestrator
          ruleOrchestrator.executeHook(
            RuleTrigger.AFTER_PRINT,
            {
              product: {
                itemName: products[0]?.ITEMNAME || '',
                sellingPrice: Number(products[0]?.SELLING_PRICE) || 0,
              },
              pricing: {
                regularPrice: Number(products[0]?.SELLING_PRICE) || 0,
                hasPromo: Boolean(products[0]?.PROMOPRICE),
              },
              print: {
                printerId: selectedPrinter.id,
                copies,
              },
              batch: {
                totalCount: totalLabels,
                currentIndex: totalLabels - 1,
                isFirst: false,
                isLast: true,
              },
            },
            rulesRepository.getAll()
          );
          setIsExecuting(false);
          toast.success(
            'Tirage terminé avec succès',
            `${totalLabels} étiquettes éditées sur ${selectedPrinter.name} (Mode ${mode.toUpperCase()})`
          );
        } else {
          printJobService.updateJobStatus(job.id, 'PRINTING', {
            lastCompletedIndex: completed - 1,
          });
        }
      }, 400);
    } catch (err) {
      // Hook ON_PRINT_ERROR via RuleOrchestrator
      ruleOrchestrator.executeHook(
        RuleTrigger.ON_PRINT_ERROR,
        {
          product: { itemName: products[0]?.ITEMNAME || '', sellingPrice: Number(products[0]?.SELLING_PRICE) || 0 },
          pricing: { regularPrice: 0, hasPromo: false },
          print: { printerId: selectedPrinter.id },
          batch: { totalCount: totalLabels, currentIndex: 0, isFirst: true, isLast: false },
        },
        rulesRepository.getAll()
      );
      setIsExecuting(false);
      toast.error('Erreur lors du tirage', 'Vérifiez la connexion de l\'imprimante.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby={modalTitleId}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 id={modalTitleId} className="text-lg font-bold text-white">Lancement de la Production d'Étiquettes</h2>
              <p className="text-xs text-slate-400">
                Gabarit : <strong>{template.name}</strong> • {products.length} références
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Step 1: Select Printer & Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Imprimante Cible
              </label>
              <select
                value={selectedPrinterId}
                onChange={(e) => setSelectedPrinterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.selectedDpi} DPI — {p.connectionType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Format Physique Cible
              </label>
              <select
                value={selectedFormatId}
                onChange={(e) => setSelectedFormatId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white"
              >
                {formats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.width}×{f.height} mm)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Copies & Volume */}
          <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Nombre d'exemplaires par article</label>
              <input
                type="number"
                min="1"
                max="50"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-bold"
              />
            </div>

            <div className="flex-1 text-right">
              <span className="text-xs text-slate-400 block">Total étiquettes à tirer</span>
              <span className="text-xl font-black text-blue-400 font-mono">
                {totalLabels} étiquettes
              </span>
            </div>
          </div>

          {/* Compatibility Engine Report Banner */}
          {compatibilityReport && (
            <div
              className={`p-4 rounded-xl border transition ${
                compatibilityReport.status === 'Compatible'
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : compatibilityReport.status === 'Attention'
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-rose-500/30 bg-rose-500/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {compatibilityReport.status === 'Compatible' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  {compatibilityReport.status === 'Attention' && (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  )}
                  {compatibilityReport.status === 'Incompatible' && (
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                  )}
                  <span className="text-sm font-bold text-white">
                    Compatibilité Matérielle : {compatibilityReport.status}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                  Mode recommandé : {compatibilityReport.recommendedRenderingMode.toUpperCase()}
                </span>
              </div>

              {compatibilityReport.issues.length > 0 && (
                <div className="space-y-1.5 mt-2 text-xs">
                  {compatibilityReport.issues.map((iss, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 shrink-0">•</span>
                      <div>
                        <span className="text-slate-200">{iss.message}</span>
                        {iss.recommendation && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{iss.recommendation}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* High volume threshold warning (Part XV rule: extra explicit confirmation step) */}
          {needsHighVolumeConfirmation && (
            <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Confirmation grand tirage requise ({totalLabels} étiquettes)</span>
              </div>
              <p className="text-[11px] text-amber-300/90">
                Ce tirage dépasse le seuil de sécurité configuré ({settings.batchConfirmationThreshold || 500} étiquettes). Assurez-vous que le rouleau dispose de la longueur nécessaire et que le ruban est engagé.
              </p>
              <label className="flex items-center gap-2 cursor-pointer pt-1 font-semibold text-white">
                <input
                  type="checkbox"
                  checked={confirmedHighVolume}
                  onChange={(e) => setConfirmedHighVolume(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-600"
                />
                <span>J'ai vérifié le stock de consommables et confirme le lancement du lot</span>
              </label>
            </div>
          )}

          {/* Print Summary */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Récapitulatif de Tirage
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-400">
              <div>
                Imprimante : <strong className="text-white">{selectedPrinter?.name}</strong>
              </div>
              <div>
                Format physique : <strong className="text-white">{selectedFormat?.name}</strong>
              </div>
              <div>
                Dimensions réelles :{' '}
                <strong className="text-slate-200">
                  {selectedFormat?.width} × {selectedFormat?.height} mm (
                  {((selectedFormat?.width || 0) / 25.4).toFixed(2)}″ ×{' '}
                  {((selectedFormat?.height || 0) / 25.4).toFixed(2)}″)
                </strong>
              </div>
              <div>
                Mode d'exécution :{' '}
                <strong className="text-emerald-400">
                  {compatibilityReport?.recommendedRenderingMode.toUpperCase()}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            Fermer
          </button>

          <div className="flex items-center gap-2">
            {onOpenPrintJobs && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrintJobs();
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
              >
                Voir la file d'attente
              </button>
            )}

            <button
              type="button"
              onClick={handleLaunchPrint}
              disabled={isExecuting || (compatibilityReport?.status === 'Incompatible')}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>{isExecuting ? 'Envoi en cours...' : 'Confirmer & Imprimer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * E-Studio Production Jobs Workspace
 * Conforms to SECTION 5 (Target Information Architecture), 30 (Job Workspace), 31 (Quick Print), 32 (Price-Change Reprint)
 * 
 * Central operational object:
 * Data -> Resolve -> Preview -> Preflight -> Freeze -> Output -> History
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ProductionJob, OutputAttempt } from '../domain/jobs/jobModel';
import { jobRepository } from '../domain/jobs/jobRepository';
import { PreflightEngine } from '../domain/preflight/preflightEngine';
import { RealPrintService } from '../domain/printing/realPrintService';
import { RenderListSvg } from '../domain/rendering/RenderListSvg';
import { buildRenderList } from '../domain/rendering/renderList';
import { useToast } from './ToastNotification';
import { useAppStore } from '../store/useAppStore';
import {
  Layers,
  Play,
  RotateCw,
  Printer,
  FileDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Shield,
  Tag,
  ArrowRight,
  Sliders,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

interface JobsWorkspaceProps {
  initialJobId?: string;
  onOpenEditorForTemplate?: (templateName: string) => void;
}

export const JobsWorkspace: React.FC<JobsWorkspaceProps> = ({
  initialJobId,
  onOpenEditorForTemplate,
}) => {
  const toast = useToast();
  const store = useAppStore();

  const [jobs, setJobs] = useState<ProductionJob[]>(() => jobRepository.getAll());
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId || jobs[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'preview' | 'data' | 'preflight' | 'output' | 'history'>('preview');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FROZEN' | 'PARTIAL' | 'COMPLETED'>('ALL');

  // Preview state
  const [previewRowIndex, setPreviewRowIndex] = useState(0);
  const [zoom, setZoom] = useState(1.1);

  // Output execution state
  const [outputFormat, setOutputFormat] = useState<'PDF_SHEET' | 'PDF_THERMAL' | 'ZPL_RAW' | 'BROWSER_DIALOG'>('PDF_SHEET');
  const [copies, setCopies] = useState(1);
  const [printerAddress, setPrinterAddress] = useState('192.168.1.150');
  const [isPrinting, setIsPrinting] = useState(false);

  // Subscribe to Job repository updates
  useEffect(() => {
    const unsub = jobRepository.subscribe((updatedJobs) => {
      setJobs(updatedJobs);
      if (!selectedJobId && updatedJobs.length > 0) {
        setSelectedJobId(updatedJobs[0].id);
      }
    });
    return unsub;
  }, [selectedJobId]);

  const selectedJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId) || jobs[0] || null;
  }, [jobs, selectedJobId]);

  // Current row data for live preview
  const activeRow = useMemo(() => {
    if (!selectedJob || selectedJob.rawRows.length === 0) return {};
    const safeIdx = Math.max(0, Math.min(previewRowIndex, selectedJob.rawRows.length - 1));
    return selectedJob.rawRows[safeIdx] || {};
  }, [selectedJob, previewRowIndex]);

  // Preflight report
  const preflightReport = useMemo(() => {
    if (!selectedJob) return { blockingCount: 0, warningCount: 0, infoCount: 0, issues: [], status: 'PASS' as const };
    return PreflightEngine.evaluate(selectedJob.templateSnapshot, selectedJob.rawRows);
  }, [selectedJob]);

  // RenderList for active preview row
  const activeRenderList = useMemo(() => {
    if (!selectedJob) return null;
    return buildRenderList(selectedJob.templateSnapshot, activeRow, previewRowIndex);
  }, [selectedJob, activeRow, previewRowIndex]);

  // Filtered jobs list
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchSearch =
        j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (statusFilter === 'ALL') return true;
      return j.status === statusFilter;
    });
  }, [jobs, searchQuery, statusFilter]);

  // Actions
  const handleFreezeJob = () => {
    if (!selectedJob) return;
    if (preflightReport.blockingCount > 0) {
      toast.error(
        'Gel impossible',
        `${preflightReport.blockingCount} erreur(s) bloquante(s) doivent être corrigées avant de figer ce tirage.`
      );
      setActiveTab('preflight');
      return;
    }

    const updated: ProductionJob = {
      ...selectedJob,
      status: 'FROZEN',
      frozenAt: new Date().toISOString(),
      frozenHash: `HASH-${Date.now().toString(16).toUpperCase()}-${selectedJob.rawRows.length}`,
    };

    jobRepository.save(updated);
    toast.success('Jeu de données figé', 'Le tirage est maintenant verrouillé et prêt pour impression certifiée.');
  };

  const handleExecutePrint = async (startIndex?: number) => {
    if (!selectedJob) return;
    setIsPrinting(true);

    try {
      const start = startIndex !== undefined ? startIndex : selectedJob.lastCompletedIndex;
      const attempt = await RealPrintService.executePrint({
        job: selectedJob,
        startIndex: start,
        endIndex: selectedJob.totalLabels,
        copies,
        outputFormat,
        printerAddress,
        operator: selectedJob.operator,
      });

      if (attempt.outcome === 'ACKNOWLEDGED' || attempt.outcome === 'HANDED_TO_SYSTEM') {
        toast.success(
          attempt.outcome === 'ACKNOWLEDGED' ? 'Impression confirmée' : 'Sortie effectuée',
          attempt.acknowledgementMessage || `Opération terminée avec succès.`
        );
      } else if (attempt.outcome === 'PARTIAL') {
        toast.warning(
          'Impression partielle',
          `Interrompue après ${attempt.completedQuantity} étiquettes. Vous pouvez reprendre à tout moment.`
        );
      } else {
        toast.error('Échec de sortie', attempt.errorMessage || 'Une erreur est survenue lors de la transmission.');
      }
    } catch (e: any) {
      toast.error('Erreur de tirage', e.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDeleteJob = (id: string) => {
    if (confirm('Voulez-vous supprimer ce travail de production ?')) {
      jobRepository.delete(id);
      toast.info('Travail supprimé', 'Le travail a été retiré de la file locale.');
    }
  };

  const handleDuplicateJob = (id: string) => {
    const clone = jobRepository.duplicateAsNew(id);
    if (clone) {
      setSelectedJobId(clone.id);
      toast.success('Travail dupliqué', `Nouveau travail "${clone.name}" créé.`);
    }
  };

  return (
    <div className="flex-1 flex min-h-0 bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* LEFT COLUMN: Search & Jobs List (300 px) */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-950/60">
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Travaux de Production ({jobs.length})
            </h2>
            <button
              onClick={() => store.navigateTo('templates')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
              title="Créer un tirage depuis un gabarit"
            >
              <Plus className="w-3 h-3" />
              Nouveau
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer les travaux..."
              className="w-full bg-slate-900 border border-slate-750 text-xs rounded pl-8 pr-2.5 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-0.5">
            {(['ALL', 'FROZEN', 'PARTIAL', 'COMPLETED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  statusFilter === st ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {st === 'ALL' ? 'Tous' : st === 'FROZEN' ? 'Figés' : st === 'PARTIAL' ? 'À reprendre' : 'Terminés'}
              </button>
            ))}
          </div>
        </div>

        {/* Jobs List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-850 p-1.5 space-y-1">
          {filteredJobs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              <Layers className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50" />
              Aucun travail correspondant.
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              const completedCount = job.lastCompletedIndex || 0;
              const pct = job.totalLabels > 0 ? Math.round((completedCount / job.totalLabels) * 100) : 0;

              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`p-2.5 rounded cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-900/40 border border-blue-600/60' : 'hover:bg-slate-850/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold text-slate-200 line-clamp-1">{job.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium shrink-0 ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : job.status === 'FROZEN'
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                          : job.status === 'PARTIAL'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1.5">
                    <span className="truncate">{job.templateName}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {completedCount}/{job.totalLabels} ({pct}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        job.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT MAIN WORKSPACE */}
      {selectedJob ? (
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900">
          {/* Top Job Banner */}
          <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-slate-100 truncate">{selectedJob.name}</h1>
                  <span className="text-[10px] text-slate-500 font-mono">({selectedJob.id})</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-500" />
                    Gabarit : <strong>{selectedJob.templateName}</strong> ({selectedJob.templateSnapshot.width_mm}x
                    {selectedJob.templateSnapshot.height_mm} mm)
                  </span>
                  <span>·</span>
                  <span>{selectedJob.stockProfile.mediaType === 'THERMAL_ROLL' ? 'Rouleau Thermique' : 'Planche A4'}</span>
                  <span>·</span>
                  <span>{selectedJob.totalLabels} étiquettes</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {selectedJob.status !== 'FROZEN' && selectedJob.status !== 'COMPLETED' && (
                <button
                  onClick={handleFreezeJob}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
                  title="Verrouiller les données et la version du gabarit"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Geler le jeu (Freeze)
                </button>
              )}

              {selectedJob.lastCompletedIndex < selectedJob.totalLabels && (
                <button
                  onClick={() => handleExecutePrint()}
                  disabled={isPrinting}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {selectedJob.lastCompletedIndex > 0
                    ? `Reprendre dès #${selectedJob.lastCompletedIndex + 1}`
                    : 'Lancer le tirage'}
                </button>
              )}

              <button
                onClick={() => handleDuplicateJob(selectedJob.id)}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                title="Dupliquer ce travail"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteJob(selectedJob.id)}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"
                title="Supprimer ce travail"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Workspace Tabs */}
          <div className="border-b border-slate-800 bg-slate-950/20 px-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Aperçu Réel BÀT
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'data'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Données Brutes ({selectedJob.totalLabels})
              </button>
              <button
                onClick={() => setActiveTab('preflight')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preflight'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Preflight
                {preflightReport.blockingCount > 0 ? (
                  <span className="ml-1 px-1.5 py-0.2 bg-red-600 text-white rounded-full text-[10px]">
                    {preflightReport.blockingCount}
                  </span>
                ) : preflightReport.warningCount > 0 ? (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px]">
                    {preflightReport.warningCount}
                  </span>
                ) : (
                  <span className="ml-1 text-emerald-400">✓</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('output')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'output'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                Sortie & Spooler
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Historique ({selectedJob.outputAttempts.length})
              </button>
            </div>

            {selectedJob.frozenAt && (
              <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Jeu certifié immuable ({selectedJob.frozenHash})
              </span>
            )}
          </div>

          {/* TAB CONTENTS */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* TAB 1: PREVIEW */}
            {activeTab === 'preview' && (
              <div className="h-full flex flex-col">
                {/* Row navigator bar */}
                <div className="flex items-center justify-between mb-4 bg-slate-950 p-2.5 rounded border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Ligne active :</span>
                    <button
                      onClick={() => setPreviewRowIndex((prev) => Math.max(0, prev - 1))}
                      disabled={previewRowIndex <= 0}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {selectedJob.rawRows.length > 0 ? previewRowIndex + 1 : 0} / {selectedJob.rawRows.length}
                    </span>
                    <button
                      onClick={() => setPreviewRowIndex((prev) => Math.min(selectedJob.rawRows.length - 1, prev + 1))}
                      disabled={previewRowIndex >= selectedJob.rawRows.length - 1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <span className="text-xs text-slate-400 ml-4 font-semibold text-slate-200 truncate max-w-sm">
                      {activeRow.ITEMNAME || activeRow.designation || 'Ligne de données'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Zoom :</span>
                    <button
                      onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                      className="px-2 py-0.5 bg-slate-800 rounded text-xs"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono text-slate-300">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                      className="px-2 py-0.5 bg-slate-800 rounded text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Canvas Viewport */}
                <div className="flex-1 flex items-center justify-center p-6 bg-slate-950/70 rounded-lg border border-slate-800/80 overflow-auto">
                  {activeRenderList ? (
                    <div className="shadow-2xl ring-1 ring-slate-800">
                      <RenderListSvg renderList={activeRenderList} zoom={zoom} showGuides />
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">Aucune étiquette à afficher</div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: RAW DATA GRID */}
            {activeTab === 'data' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{selectedJob.rawRows.length} lignes chargées dans ce lot</span>
                  <span>Clé unique : EAN/PRODUCT_SCAN ou PARTNO</span>
                </div>

                <div className="border border-slate-800 rounded overflow-hidden">
                  <table className="w-full text-left text-xs divide-y divide-slate-800">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Désignation</th>
                        <th className="p-2.5">Code EAN</th>
                        <th className="p-2.5">Réf (SKU)</th>
                        <th className="p-2.5">Prix Normal</th>
                        <th className="p-2.5">Prix Promo</th>
                        <th className="p-2.5">Rayon / Catégorie</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 bg-slate-900/60 font-mono text-[11px]">
                      {selectedJob.rawRows.map((row, idx) => (
                        <tr
                          key={idx}
                          onClick={() => {
                            setPreviewRowIndex(idx);
                            setActiveTab('preview');
                          }}
                          className={`hover:bg-slate-800/60 cursor-pointer ${
                            previewRowIndex === idx ? 'bg-blue-950/40 text-blue-200' : 'text-slate-300'
                          }`}
                        >
                          <td className="p-2.5 text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-sans font-medium text-slate-100">{row.ITEMNAME || row.designation || '—'}</td>
                          <td className="p-2.5">{row.PRODUCT_SCAN || row.barcode || '—'}</td>
                          <td className="p-2.5 text-slate-400">{row.PARTNO || row.sku || '—'}</td>
                          <td className="p-2.5 font-bold text-slate-100">
                            {row.SELLING_PRICE ? `${Number(row.SELLING_PRICE).toFixed(2)} €` : '—'}
                          </td>
                          <td className="p-2.5 text-red-400">
                            {row.PROMOPRICE ? `${Number(row.PROMOPRICE).toFixed(2)} €` : '—'}
                          </td>
                          <td className="p-2.5 text-slate-400">{row.CATEGORY_NAME || row.department || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: PREFLIGHT REPORT */}
            {activeTab === 'preflight' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div
                    className={`p-4 rounded border ${
                      preflightReport.blockingCount > 0
                        ? 'bg-red-950/30 border-red-800/80 text-red-300'
                        : 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
                    }`}
                  >
                    <div className="text-2xl font-bold font-mono">{preflightReport.blockingCount}</div>
                    <div className="text-xs uppercase tracking-wider font-semibold">Erreurs Bloquantes</div>
                    <p className="text-[11px] mt-1 text-slate-400">
                      {preflightReport.blockingCount > 0
                        ? 'Interdit le gel et la production'
                        : 'Aucune anomalie critique'}
                    </p>
                  </div>

                  <div className="p-4 rounded border bg-amber-950/30 border-amber-800/80 text-amber-300">
                    <div className="text-2xl font-bold font-mono">{preflightReport.warningCount}</div>
                    <div className="text-xs uppercase tracking-wider font-semibold">Avertissements</div>
                    <p className="text-[11px] mt-1 text-slate-400">Débordements ou dégradations mineures</p>
                  </div>

                  <div className="p-4 rounded border bg-slate-950 border-slate-800 text-slate-300">
                    <div className="text-2xl font-bold font-mono">{selectedJob.totalLabels}</div>
                    <div className="text-xs uppercase tracking-wider font-semibold">Articles Vérifiés</div>
                    <p className="text-[11px] mt-1 text-slate-400">100% du jeu audité</p>
                  </div>
                </div>

                <div className="border border-slate-800 rounded overflow-hidden">
                  <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Journal Détaillé des Anomalies
                  </div>

                  {preflightReport.issues.length === 0 ? (
                    <div className="p-8 text-center text-xs text-emerald-400">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      Toutes les vérifications preflight sont conformes. Le tirage est certifié sans erreur.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-850">
                      {preflightReport.issues.map((issue) => (
                        <div key={issue.id} className="p-3 flex items-start gap-3 hover:bg-slate-850/40">
                          {issue.severity === 'BLOCKING' ? (
                            <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold ${
                                  issue.severity === 'BLOCKING' ? 'bg-red-900 text-red-200' : 'bg-amber-900 text-amber-200'
                                }`}
                              >
                                {issue.category}
                              </span>
                              <span className="font-semibold text-slate-200">{issue.message}</span>
                            </div>
                            {issue.recommendation && (
                              <p className="text-[11px] text-slate-400 mt-1">
                                <strong>Action recommandée :</strong> {issue.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: OUTPUT & SPOOLER */}
            {activeTab === 'output' && (
              <div className="max-w-2xl space-y-6">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Configuration de la Sortie Physique
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setOutputFormat('PDF_SHEET')}
                      className={`p-3 rounded border text-left transition-all ${
                        outputFormat === 'PDF_SHEET'
                          ? 'border-blue-500 bg-blue-950/30'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-200">Planche A4 Vectorielle</div>
                      <div className="text-[11px] text-slate-400 mt-1">Imposition multi-étiquettes avec repères</div>
                    </button>

                    <button
                      onClick={() => setOutputFormat('PDF_THERMAL')}
                      className={`p-3 rounded border text-left transition-all ${
                        outputFormat === 'PDF_THERMAL'
                          ? 'border-blue-500 bg-blue-950/30'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-200">Rouleau Thermique (1/page)</div>
                      <div className="text-[11px] text-slate-400 mt-1">Format exact pour Zebra, TSC, Brother</div>
                    </button>

                    <button
                      onClick={() => setOutputFormat('ZPL_RAW')}
                      className={`p-3 rounded border text-left transition-all ${
                        outputFormat === 'ZPL_RAW'
                          ? 'border-blue-500 bg-blue-950/30'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-200">ZPL II Direct (Port RAW 9100)</div>
                      <div className="text-[11px] text-slate-400 mt-1">Transmission directe socket réseau</div>
                    </button>

                    <button
                      onClick={() => setOutputFormat('BROWSER_DIALOG')}
                      className={`p-3 rounded border text-left transition-all ${
                        outputFormat === 'BROWSER_DIALOG'
                          ? 'border-blue-500 bg-blue-950/30'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-200">Gestionnaire d'impression OS</div>
                      <div className="text-[11px] text-slate-400 mt-1">Dialogue standard Windows / Mac / Linux</div>
                    </button>
                  </div>

                  {outputFormat === 'ZPL_RAW' && (
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Adresse IP de l'imprimante Zebra/TSC :</label>
                      <input
                        type="text"
                        value={printerAddress}
                        onChange={(e) => setPrinterAddress(e.target.value)}
                        placeholder="192.168.1.150"
                        className="w-full bg-slate-900 border border-slate-750 text-xs rounded px-3 py-1.5 text-slate-200 font-mono"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Nombre d'exemplaires :</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={copies}
                        onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 bg-slate-900 border border-slate-750 text-xs rounded px-3 py-1.5 text-slate-200 text-center font-bold"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="text-xs text-slate-400 block mb-1">Position de reprise :</label>
                      <div className="text-xs font-mono text-slate-300">
                        Étiquettes {selectedJob.lastCompletedIndex + 1} à {selectedJob.totalLabels} (sur {selectedJob.totalLabels})
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-850 flex items-center justify-between">
                    <button
                      onClick={() => handleExecutePrint(0)}
                      disabled={isPrinting}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition-colors"
                    >
                      Tout réimprimer depuis le début (0)
                    </button>

                    <button
                      onClick={() => handleExecutePrint()}
                      disabled={isPrinting}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded flex items-center gap-2 transition-colors shadow-md disabled:opacity-50"
                    >
                      <Printer className="w-4 h-4" />
                      {isPrinting ? 'Traitement...' : 'Déclencher la sortie'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Journal des Tentatives de Sortie
                </h3>

                {selectedJob.outputAttempts.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded border border-slate-800">
                    Aucune tentative de tirage enregistrée sur ce travail.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedJob.outputAttempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="p-3 bg-slate-950 border border-slate-850 rounded text-xs flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                attempt.outcome === 'ACKNOWLEDGED' || attempt.outcome === 'HANDED_TO_SYSTEM'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : attempt.outcome === 'PARTIAL'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : 'bg-red-950 text-red-400 border border-red-800'
                              }`}
                            >
                              {attempt.outcome}
                            </span>
                            <span className="font-semibold text-slate-200">{attempt.outputFormat}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400">{attempt.printerName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Plage : #{attempt.startIndex + 1} à #{attempt.endIndex} ({attempt.completedQuantity} étiquettes) ·{' '}
                            {attempt.operator}
                          </div>
                          {attempt.acknowledgementMessage && (
                            <div className="text-[11px] text-slate-300 font-mono">
                              Message : {attempt.acknowledgementMessage}
                            </div>
                          )}
                        </div>

                        <div className="text-right text-[11px] text-slate-500 font-mono">
                          {new Date(attempt.timestamp).toLocaleTimeString('fr-FR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
          Sélectionnez un travail ou créez un nouveau tirage.
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Printer,
  RotateCw,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  ChevronRight,
  ListFilter,
} from 'lucide-react';
import { printJobService } from '../domain/printing/printJobService';
import { PrintJob, PrintJobStatus } from '../domain/printing/types';
import { useToast } from './ToastNotification';

export const PrintJobsStudio: React.FC = () => {
  const toast = useToast();
  const [jobs, setJobs] = useState<PrintJob[]>(printJobService.getAll());
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(jobs[0] || null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = printJobService.subscribe(() => {
      const updated = printJobService.getAll();
      setJobs([...updated]);
      if (selectedJob) {
        const found = updated.find((j) => j.id === selectedJob.id);
        if (found) setSelectedJob(found);
      }
    });
    return unsubscribe;
  }, [selectedJob]);

  const handleResume = (jobId: string) => {
    const success = printJobService.resumeJob(jobId);
    if (success) {
      toast.info('Reprise de lot', 'Impression reprise là où elle s\'était arrêtée.');
    }
  };

  const handleRetryFailed = (jobId: string) => {
    const success = printJobService.retryFailed(jobId);
    if (success) {
      toast.info('Nouvelle tentative', 'Réimpression des étiquettes non abouties lancée.');
    }
  };

  const handleCancel = (jobId: string) => {
    const success = printJobService.cancelJob(jobId);
    if (success) {
      toast.warning('Tirage annulé', 'Le travail en file a été interrompu.');
    }
  };

  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.printerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>File d'Attente &amp; Historique des Tirages</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi temps réel, reprise de lots interrompus et réimpression ciblée des anomalies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setJobs([...printJobService.getAll()])}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par gabarit, imprimante ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex gap-1.5">
          {['all', 'PRINTING', 'QUEUED', 'COMPLETED', 'PARTIAL', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'all' ? 'Tous' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Pane Workspace: List on left, details on right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left List */}
        <div className="w-full md:w-1/2 lg:w-5/12 border-r border-slate-800 overflow-y-auto p-4 space-y-2.5">
          {filteredJobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Aucun travail correspondant trouvé.
            </div>
          ) : (
            filteredJobs.map((j) => {
              const isSelected = selectedJob?.id === j.id;
              return (
                <div
                  key={j.id}
                  onClick={() => setSelectedJob(j)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-xs truncate max-w-[200px]">
                      {j.templateName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        j.status === 'COMPLETED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : j.status === 'PRINTING'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                          : j.status === 'PARTIAL' || j.status === 'FAILED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {j.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-2 truncate">
                    {j.printerName} • {j.labelFormatName} • {j.totalLabels} étiquettes
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
                    <span>{new Date(j.createdAt).toLocaleTimeString()}</span>
                    <span>Mode {j.renderingMode.toUpperCase()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Details Panel */}
        <div className="hidden md:flex flex-1 flex-col bg-slate-950/50 p-6 overflow-y-auto">
          {selectedJob ? (
            <div className="space-y-6 max-w-xl">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-slate-500">{selectedJob.id}</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selectedJob.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : selectedJob.status === 'PRINTING'
                        ? 'bg-blue-500/20 text-blue-400'
                        : selectedJob.status === 'PARTIAL'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {selectedJob.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedJob.templateName}</h2>
                <p className="text-xs text-slate-400">{selectedJob.dataSource}</p>
              </div>

              {/* Progress Bar with Resumable info */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Progression du lot :</span>
                  <span className="text-white">
                    {Math.max(0, selectedJob.lastCompletedIndex + 1)} / {selectedJob.totalLabels} étiquettes
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((selectedJob.lastCompletedIndex + 1) / selectedJob.totalLabels) * 100)
                      )}%`,
                    }}
                  />
                </div>
                {selectedJob.status === 'PARTIAL' && (
                  <p className="text-[11px] text-amber-400">
                    Interruption enregistrée à l'étiquette #{selectedJob.lastCompletedIndex + 1}. Aucune perte de position : vous pouvez reprendre immédiatement sans réimprimer le début du rouleau.
                  </p>
                )}
              </div>

              {/* Action Buttons for Resuming / Retrying */}
              <div className="flex gap-2">
                {selectedJob.status === 'PARTIAL' && (
                  <button
                    onClick={() => handleResume(selectedJob.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Reprendre le lot à #{selectedJob.lastCompletedIndex + 2}</span>
                  </button>
                )}

                {selectedJob.failedIndices && selectedJob.failedIndices.length > 0 && (
                  <button
                    onClick={() => handleRetryFailed(selectedJob.id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Réimprimer les {selectedJob.failedIndices.length} échecs</span>
                  </button>
                )}

                {selectedJob.status === 'PRINTING' && (
                  <button
                    onClick={() => handleCancel(selectedJob.id)}
                    className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
                  >
                    Annuler
                  </button>
                )}
              </div>

              {/* Event Logs in Plain Language */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Journal d'Exécution &amp; Événements
                </h4>
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 space-y-2 max-h-48 overflow-y-auto font-mono text-[11px]">
                  {selectedJob.logs && selectedJob.logs.length > 0 ? (
                    selectedJob.logs.map((l, i) => (
                      <div key={i} className="flex items-start gap-2 text-slate-300">
                        <span className="text-slate-500 shrink-0">
                          {new Date(l.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={
                            l.type === 'error'
                              ? 'text-rose-400'
                              : l.type === 'warn'
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }
                        >
                          {l.message}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500">Aucun journal consigné</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Sélectionnez un travail pour afficher le détail et les options de reprise.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

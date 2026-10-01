/**
 * Workflow Stepper Bar
 * Ruban de progression interactif du workflow officiel en 5 étapes E-Studio.
 * Intègre les états (✓, ●, ⚠, ✕, ○), le sélecteur de mode (Express, Standard, Expert)
 * et le déclencheur de Preflight & export de snapshot .estudio-job.
 */

import React from 'react';
import {
  WorkflowStageId,
  WorkflowStageState,
  WorkflowMode,
  PreflightReport,
} from '../domain/workflow/types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Download,
  Upload,
  Settings2,
  Zap,
  Layers,
  Sparkles,
  Eye,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';

interface WorkflowStepperBarProps {
  stages: WorkflowStageState[];
  currentStageId: WorkflowStageId;
  mode: WorkflowMode;
  onSelectStage: (stageId: WorkflowStageId) => void;
  onChangeMode: (mode: WorkflowMode) => void;
  preflightReport: PreflightReport | null;
  onOpenPreflight: () => void;
  onExportJobPackage: () => void;
  onImportJobPackage: () => void;
}

export const WorkflowStepperBar: React.FC<WorkflowStepperBarProps> = ({
  stages,
  currentStageId,
  mode,
  onSelectStage,
  onChangeMode,
  preflightReport,
  onOpenPreflight,
  onExportJobPackage,
  onImportJobPackage,
}) => {
  const getStageIcon = (id: WorkflowStageId) => {
    switch (id) {
      case 'STAGE_1_INGESTION':
        return <FileSpreadsheet className="w-3.5 h-3.5" />;
      case 'STAGE_2_RESOLUTION':
        return <Layers className="w-3.5 h-3.5" />;
      case 'STAGE_3_ORCHESTRATION':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'STAGE_4_PREFLIGHT_BAT':
        return <Eye className="w-3.5 h-3.5" />;
      case 'STAGE_5_PRODUCTION':
        return <Printer className="w-3.5 h-3.5" />;
    }
  };

  const getStatusBadge = (state: WorkflowStageState) => {
    switch (state.status) {
      case 'COMPLETED':
        return (
          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] animate-pulse">
            ●
          </span>
        );
      case 'REQUIRES_ATTENTION':
        return (
          <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px]" title={`${state.warningsCount} avertissement(s)`}>
            <AlertTriangle className="w-3.5 h-3.5" />
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]" title={`${state.blockingIssuesCount} erreur(s) bloquante(s)`}>
            <XCircle className="w-3.5 h-3.5" />
          </span>
        );
      default:
        return (
          <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center text-[10px]">
            ○
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-slate-200">
      {/* 5-Stage Stepper */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
        {stages.map((stage, idx) => {
          const isCurrent = stage.id === currentStageId;
          return (
            <React.Fragment key={stage.id}>
              {idx > 0 && <span className="text-slate-600 text-xs px-0.5">➔</span>}
              <button
                onClick={() => onSelectStage(stage.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition shrink-0 ${
                  isCurrent
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-xs'
                    : stage.status === 'COMPLETED'
                    ? 'bg-slate-950 border-emerald-900/60 text-emerald-300 hover:bg-slate-800'
                    : stage.status === 'BLOCKED'
                    ? 'bg-rose-950/40 border-rose-800 text-rose-300 hover:bg-slate-800'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {getStatusBadge(stage)}
                <span className="flex items-center gap-1.5">
                  {getStageIcon(stage.id)}
                  <span>{stage.label}</span>
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Mode Switcher & Quick Actions */}
      <div className="flex items-center gap-2 text-xs">
        {/* Preflight Badge */}
        {preflightReport && (
          <button
            onClick={onOpenPreflight}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition font-semibold ${
              preflightReport.status === 'PASS'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                : preflightReport.status === 'WARNING'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-400 hover:bg-amber-900/40'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-400 hover:bg-rose-900/40'
            }`}
            title="Consulter le rapport de Preflight"
          >
            {preflightReport.status === 'PASS' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            <span>
              Preflight:{' '}
              {preflightReport.status === 'PASS'
                ? 'Conforme'
                : preflightReport.blockingCount > 0
                ? `${preflightReport.blockingCount} bloquant(s)`
                : `${preflightReport.warningCount} avertissement(s)`}
            </span>
          </button>
        )}

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
          <span className="text-[11px] text-slate-400">Mode :</span>
          <select
            value={mode}
            onChange={(e) => onChangeMode(e.target.value as WorkflowMode)}
            className="bg-transparent text-white font-bold text-xs focus:outline-hidden cursor-pointer"
          >
            <option value="EXPRESS" className="bg-slate-900 text-white">⚡ Express (1-Clic Sécurisé)</option>
            <option value="STANDARD" className="bg-slate-900 text-white">⚙️ Standard (Validation BÀT)</option>
            <option value="EXPERT" className="bg-slate-900 text-white">🛠️ Expert (Contrôle Total)</option>
          </select>
        </div>

        {/* Snapshot Package Export */}
        <button
          onClick={onExportJobPackage}
          className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Exporter le paquet reproductible .estudio-job"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onImportJobPackage}
          className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Restaurer un paquet .estudio-job"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

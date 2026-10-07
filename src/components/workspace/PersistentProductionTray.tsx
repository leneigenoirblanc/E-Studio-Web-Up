/**
 * Persistent Production Tray
 * 
 * Permanent footer cockpit docked at the bottom of the workspace:
 * - Active template status (dimensions, name)
 * - Active workset counter (articles, poses, sheets)
 * - Zero-waste start offset slot
 * - Preflight BAT health badge
 * - Stage navigation ("← Précédent" / "Étape suivante →")
 * - Quick-action "Produire / Imprimer" trigger
 */

import React from 'react';
import {
  Layers,
  FileCheck2,
  AlertTriangle,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  ShieldCheck,
  Tag,
  Grid,
} from 'lucide-react';
import { LabelTemplate, ImpositionCalculation } from '../../types';
import { WorkflowStageId } from '../../domain/workflow/types';

interface PersistentProductionTrayProps {
  template: LabelTemplate;
  totalProducts: number;
  imposition?: ImpositionCalculation | null;
  startOffsetSlot: number;
  currentStageId: WorkflowStageId;
  stagesCount: number;
  currentStageIndex: number;
  hasErrors: boolean;
  warningsCount: number;
  onPrevStage: () => void;
  onNextStage: () => void;
  onQuickProduce: () => void;
}

export const PersistentProductionTray: React.FC<PersistentProductionTrayProps> = ({
  template,
  totalProducts,
  imposition,
  startOffsetSlot,
  currentStageId,
  stagesCount,
  currentStageIndex,
  hasErrors,
  warningsCount,
  onPrevStage,
  onNextStage,
  onQuickProduce,
}) => {
  const totalPoses = imposition?.total_per_page || 1;
  const totalSheets = Math.max(1, Math.ceil((totalProducts + startOffsetSlot) / totalPoses));

  return (
    <footer className="h-14 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between z-30 select-none shadow-2xl shrink-0">
      {/* Left: Template & Workset Telemetry */}
      <div className="flex items-center gap-3">
        {/* Template Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/90 border border-slate-700/60 text-xs">
          <Tag className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-200 truncate max-w-[140px] sm:max-w-[200px]" title={template.name}>
            {template.name}
          </span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-900/60 px-1.5 py-0.5 rounded border border-slate-700/40">
            {template.width_mm} × {template.height_mm} mm
          </span>
        </div>

        {/* Dataset Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/90 border border-slate-700/60 text-xs">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-slate-200">
            <strong className="text-emerald-400 font-mono">{totalProducts}</strong> article{totalProducts > 1 ? 's' : ''}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 text-[11px]">
            {totalSheets} planche{totalSheets > 1 ? 's' : ''} ({totalPoses}/pl.)
          </span>
        </div>

        {/* Offset Slot Indicator */}
        {startOffsetSlot > 0 && (
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs">
            <Grid className="w-3 h-3" />
            <span>Décalage pose <strong>#{startOffsetSlot + 1}</strong></span>
          </div>
        )}
      </div>

      {/* Center: Preflight Health Badge */}
      <div className="flex items-center gap-2">
        {hasErrors ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/70 border border-rose-700/60 text-rose-300 text-xs animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-medium">Blocages détectés</span>
          </div>
        ) : warningsCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-700/60 text-amber-300 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{warningsCount} avertissement{warningsCount > 1 ? 's' : ''}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">BAT Conforme</span>
          </div>
        )}
      </div>

      {/* Right: Stage Navigation & Primary Action */}
      <div className="flex items-center gap-2">
        {/* Previous Stage */}
        <button
          type="button"
          onClick={onPrevStage}
          disabled={currentStageIndex === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors border border-slate-700"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Précédent</span>
        </button>

        {/* Next Stage or Produce */}
        {currentStageIndex < stagesCount - 1 ? (
          <button
            type="button"
            onClick={onNextStage}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-900/50 transition-colors"
          >
            <span>Étape suivante</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onQuickProduce}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/50 transition-colors animate-pulse"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Lancer le tirage</span>
          </button>
        )}
      </div>
    </footer>
  );
};

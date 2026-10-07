/**
 * Stage 4: Mathematical Imposition & Preflight BAT
 * 
 * Configures sheet layout, Avery standard formats, margins/gutters,
 * zero-waste start offset slot, and runs real-time preflight checks.
 */

import React, { useState } from 'react';
import {
  Grid,
  Eye,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Crop,
  ShieldCheck,
  Zap,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import {
  LabelTemplate,
  ProductRecord,
  ImpositionCalculation,
  ImpositionConfig,
} from '../../../types';
import { AVERY_STANDARD_CATALOG } from '../../../utils/averyCatalog';
import { PreflightReport } from '../../../domain/workflow/types';
import { LabelRenderer } from '../../LabelRenderer';

interface Stage4ImpositionPreflightProps {
  template: LabelTemplate;
  products: ProductRecord[];
  imposition: ImpositionCalculation | null;
  impositionConfig: ImpositionConfig;
  onUpdateImpositionConfig: (cfg: Partial<ImpositionConfig>) => void;
  preflightReport: PreflightReport | null;
  onOpenPreflightModal: () => void;
}

export const Stage4ImpositionPreflight: React.FC<Stage4ImpositionPreflightProps> = ({
  template,
  products,
  imposition,
  impositionConfig,
  onUpdateImpositionConfig,
  preflightReport,
  onOpenPreflightModal,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<string>('CUSTOM');

  const totalPerSheet = imposition?.total_per_page || 1;
  const startOffset = impositionConfig.start_offset_slot || 0;
  const totalItemsToPlace = products.length + startOffset;
  const totalSheets = Math.max(1, Math.ceil(totalItemsToPlace / totalPerSheet));

  const handleSelectAveryPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = AVERY_STANDARD_CATALOG.find((p) => p.id === presetId);
    if (found) {
      onUpdateImpositionConfig({
        page_size: found.pageSize === 'ROLL' ? 'CUSTOM' : found.pageSize,
        margin_top_mm: 10,
        margin_left_mm: 10,
        margin_right_mm: 10,
        margin_bottom_mm: 10,
        gap_x_mm: 2,
        gap_y_mm: 2,
      });
    }
  };

  const handleSetOffsetSlot = (slotIndex: number) => {
    onUpdateImpositionConfig({
      start_offset_slot: slotIndex === startOffset ? 0 : slotIndex,
    });
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-900 text-slate-100 overflow-hidden">
      {/* Left Sidebar: Controls & Format Settings */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/70 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Grid className="w-4 h-4 text-indigo-400" />
            <span>Étape 4 : Imposition & BAT</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mise en page des poses sur planches et contrôle prépresse.
          </p>
        </div>

        {/* Avery Presets Picker */}
        <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Gabarit de Planche Pré-découpée (Avery)
          </label>
          <select
            value={selectedPreset}
            onChange={(e) => handleSelectAveryPreset(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="CUSTOM">📐 Grille Calculée Automatiquement</option>
            {AVERY_STANDARD_CATALOG.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.labelsPerPage} poses)
              </option>
            ))}
          </select>
        </div>

        {/* Zero-Waste Start Offset Slot */}
        <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300">
              Départ Zéro-Déchet (Pose #{startOffset + 1})
            </label>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
              {startOffset} sautée{startOffset > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            Cliquez sur la première étiquette vierge disponible sur une feuille entamée :
          </p>

          {/* Mini Interactive Sheet Grid for Offset Picking */}
          {imposition && (
            <div
              className="grid gap-1 p-2 rounded bg-slate-950 border border-slate-800"
              style={{
                gridTemplateColumns: `repeat(${imposition.cols}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: imposition.total_per_page }).map((_, idx) => {
                const isSkipped = idx < startOffset;
                const isFirstPrint = idx === startOffset;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSetOffsetSlot(idx)}
                    title={`Démarrer à l'étiquette ${idx + 1}`}
                    className={`h-7 rounded text-[10px] font-mono font-bold flex items-center justify-center border transition-all ${
                      isFirstPrint
                        ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500'
                        : isSkipped
                        ? 'bg-slate-800 text-slate-600 border-slate-700/40 line-through'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Calibration & Cut Marks */}
        <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            Repères & Marges d'Impression
          </label>

          <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
            <span className="flex items-center gap-1.5">
              <Crop className="w-3.5 h-3.5 text-indigo-400" />
              <span>Traits de coupe (Cut marks)</span>
            </span>
            <input
              type="checkbox"
              checked={Boolean(impositionConfig.show_cut_marks)}
              onChange={(e) => onUpdateImpositionConfig({ show_cut_marks: e.target.checked })}
              className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 text-[11px] block">Espacement X (mm)</span>
              <input
                type="number"
                step="0.5"
                value={impositionConfig.gap_x_mm ?? 2}
                onChange={(e) => onUpdateImpositionConfig({ gap_x_mm: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200"
              />
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block">Espacement Y (mm)</span>
              <input
                type="number"
                step="0.5"
                value={impositionConfig.gap_y_mm ?? 2}
                onChange={(e) => onUpdateImpositionConfig({ gap_y_mm: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Preflight BAT Summary Button */}
        <div className="mt-auto">
          <button
            type="button"
            onClick={onOpenPreflightModal}
            className="w-full py-2 px-3 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Rapport Preflight BAT Détaillé</span>
          </button>
        </div>
      </div>

      {/* Right Area: Interactive Sheet Visualizer */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-950 p-4 overflow-hidden">
        {/* Visualizer Top Bar */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-white">
              Aperçu Planche {currentPage + 1} / {totalSheets}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">
              {imposition ? `${imposition.cols} colonnes × ${imposition.rows} lignes (${imposition.total_per_page} poses/feuille)` : 'Calcul en cours'}
            </span>
          </div>

          {/* Page navigation */}
          {totalSheets > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-2 py-1 rounded bg-slate-900 text-slate-300 disabled:opacity-40 border border-slate-800"
              >
                ◀ Précédente
              </button>
              <span className="font-mono text-slate-400 px-1">
                {currentPage + 1} / {totalSheets}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalSheets - 1, p + 1))}
                disabled={currentPage === totalSheets - 1}
                className="px-2 py-1 rounded bg-slate-900 text-slate-300 disabled:opacity-40 border border-slate-800"
              >
                Suivante ▶
              </button>
            </div>
          )}
        </div>

        {/* Sheet Rendering Container */}
        <div className="flex-1 min-h-0 flex items-center justify-center bg-slate-900/40 rounded-xl border border-slate-800/80 p-6 overflow-auto">
          {imposition ? (
            <div
              className="bg-white shadow-2xl rounded p-4 relative"
              style={{
                width: '680px',
                minHeight: '480px',
                aspectRatio: impositionConfig.orientation === 'landscape' ? '297/210' : '210/297',
              }}
            >
              {/* Imposed Labels Grid */}
              <div
                className="grid gap-2 w-full h-full"
                style={{
                  gridTemplateColumns: `repeat(${imposition.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${imposition.rows}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: imposition.total_per_page }).map((_, slotIdx) => {
                  const globalSlot = currentPage * totalPerSheet + slotIdx;
                  const isSkipped = currentPage === 0 && slotIdx < startOffset;
                  const productIdx = globalSlot - startOffset;
                  const prod = products[productIdx];

                  if (isSkipped) {
                    return (
                      <div
                        key={slotIdx}
                        className="border-2 border-dashed border-slate-200 rounded flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-mono select-none"
                      >
                        [Pose Vierge #{slotIdx + 1}]
                      </div>
                    );
                  }

                  if (!prod) {
                    return (
                      <div
                        key={slotIdx}
                        className="border border-slate-100 rounded bg-slate-50/50 flex items-center justify-center text-slate-300 text-[10px] select-none"
                      >
                        Libre
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slotIdx}
                      className="border border-slate-300 rounded overflow-hidden shadow-xs relative bg-white"
                      style={{
                        aspectRatio: `${template.width_mm} / ${template.height_mm}`,
                      }}
                    >
                      <LabelRenderer
                        template={template}
                        record={prod}
                        zoom={0.4}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-xs">Calcul de l'imposition en cours...</div>
          )}
        </div>
      </div>
    </div>
  );
};

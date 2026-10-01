/**
 * E-Studio Continuous Preflight Strip (28 px)
 * 
 * Part of Precision Press Architecture:
 * - Always visible at bottom of workspace (28 px)
 * - Continuous live preflight: ● errors  ▲ warnings
 * - Production Run totals: labels count · sheets/rolls count
 * - Anti-waste Sheet Ledger indicator (saved slots, proposed offset)
 * - Click jumps to finding or opens preflight report
 */

import React, { useState } from 'react';
import { LabelTemplate, ProductRecord } from '../types';
import { StockProfile } from '../domain/stock/stockModel';
import { sheetLedger } from '../domain/stock/sheetLedger';
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Layers,
  Leaf,
  ChevronUp,
  X,
} from 'lucide-react';

interface PreflightFinding {
  id: string;
  type: 'error' | 'warning';
  title: string;
  elementId?: string;
}

interface PreflightStripProps {
  template: LabelTemplate;
  totalLabelsCount: number;
  totalSheetsCount: number;
  stockProfile: StockProfile;
  currentProduct?: ProductRecord;
  onJumpToElement?: (elementId: string) => void;
}

export const PreflightStrip: React.FC<PreflightStripProps> = ({
  template,
  totalLabelsCount,
  totalSheetsCount,
  stockProfile,
  currentProduct,
  onJumpToElement,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Compute live preflight findings against template and current product
  const findings: PreflightFinding[] = React.useMemo(() => {
    const list: PreflightFinding[] = [];

    // 1. Elements outside printable area
    template.items.forEach((it) => {
      if (
        it.x_mm < 0 ||
        it.y_mm < 0 ||
        it.x_mm + it.w_mm > template.width_mm ||
        it.y_mm + it.h_mm > template.height_mm
      ) {
        list.push({
          id: `out-of-bounds-${it.id}`,
          type: 'error',
          title: `Élément #${it.id.slice(0, 5)} hors gabarit physique`,
          elementId: it.id,
        });
      }
    });

    // 2. Barcode scan safety
    const barcodes = template.items.filter((it) => it.type === 'barcode');
    barcodes.forEach((bc) => {
      if (bc.w_mm < 25) {
        list.push({
          id: `barcode-width-${bc.id}`,
          type: 'warning',
          title: `Largeur code-barres (${bc.w_mm} mm < 25 mm recommandée)`,
          elementId: bc.id,
        });
      }
    });

    // 3. Price validation
    if (currentProduct) {
      if (currentProduct.SELLING_PRICE === undefined || currentProduct.SELLING_PRICE <= 0) {
        list.push({
          id: 'price-zero',
          type: 'warning',
          title: 'Prix de vente nul ou non défini pour cet article',
        });
      }
      if (
        currentProduct.PROMOPRICE &&
        currentProduct.PROMOPRICE >= currentProduct.SELLING_PRICE
      ) {
        list.push({
          id: 'promo-incoherent',
          type: 'error',
          title: 'Prix promo supérieur ou égal au prix régulier',
        });
      }
    }

    return list;
  }, [template, currentProduct]);

  const errorCount = findings.filter((f) => f.type === 'error').length;
  const warningCount = findings.filter((f) => f.type === 'warning').length;

  // Sheet Ledger Anti-Waste info
  const ledgerEntry = sheetLedger.getEntry(stockProfile.id);
  const startOffset = ledgerEntry ? ledgerEntry.nextStartOffsetSlot : 0;
  const labelsSaved = ledgerEntry ? ledgerEntry.accumulatedLabelsSaved : 0;

  return (
    <>
      {/* Findings Popover Drawer */}
      {isDetailsOpen && (
        <div className="bg-slate-900 border-t border-slate-700 p-3 text-xs text-slate-200 select-none z-30 shadow-2xl animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 font-bold">
            <span className="text-white">Diagnostic Continu Pré-Vol ({findings.length})</span>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1.5 pt-2">
            {findings.length === 0 ? (
              <div className="text-emerald-400 font-medium py-1">
                ✓ Aucun problème détecté. Le gabarit est prêt pour l'impression haute précision.
              </div>
            ) : (
              findings.map((f) => (
                <div
                  key={f.id}
                  onClick={() => f.elementId && onJumpToElement?.(f.elementId)}
                  className={`p-2 rounded flex items-center justify-between cursor-pointer transition ${
                    f.type === 'error'
                      ? 'bg-rose-950/60 border border-rose-800 text-rose-200 hover:bg-rose-900/60'
                      : 'bg-amber-950/60 border border-amber-800 text-amber-200 hover:bg-amber-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {f.type === 'error' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>{f.title}</span>
                  </div>
                  {f.elementId && (
                    <span className="text-[10px] underline text-blue-400">Voir élément</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main 28px Strip */}
      <div className="h-7 bg-slate-900 border-t border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-300 font-mono select-none z-20 shrink-0">
        {/* Left: Preflight Quality Findings */}
        <button
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="flex items-center gap-2 hover:text-white transition"
          title="Cliquez pour afficher le détail du contrôle pré-vol"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                errorCount > 0
                  ? 'bg-rose-500 animate-pulse'
                  : warningCount > 0
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span className={errorCount > 0 ? 'text-rose-400 font-bold' : ''}>
              {errorCount} {errorCount === 1 ? 'erreur' : 'erreurs'}
            </span>
          </div>

          <span className="text-slate-600">·</span>

          <span className={warningCount > 0 ? 'text-amber-300 font-bold' : 'text-slate-400'}>
            {warningCount} {warningCount === 1 ? 'avertissement' : 'avertissements'}
          </span>

          <ChevronUp className={`w-3 h-3 text-slate-400 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Center: Production Scope */}
        <div className="flex items-center gap-2 font-sans font-medium text-slate-400">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-200 font-bold font-mono">{totalLabelsCount}</span> étiquettes
          <span className="text-slate-600">·</span>
          <span className="text-slate-200 font-bold font-mono">{totalSheetsCount}</span>{' '}
          {stockProfile.type === 'sheet' ? 'planches A4' : 'rouleaux'}
        </div>

        {/* Right: Sheet Ledger Anti-Waste */}
        <div className="flex items-center gap-2 text-[10px]">
          {stockProfile.type === 'sheet' && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-sans">
              <Leaf className="w-3 h-3 text-emerald-400" />
              <span>
                Anti-gaspillage : {startOffset > 0 ? `Démarrage case #${startOffset + 1}` : 'Planche neuve'}
              </span>
              {labelsSaved > 0 && (
                <span className="text-[9px] text-emerald-400 font-mono">({labelsSaved} étiquettes sauvées)</span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

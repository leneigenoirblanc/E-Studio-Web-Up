/**
 * Stage 2: Data Resolution & Canonical Catalog Matching
 * 
 * Resolves imported rows against the permanent master catalog.
 * Manages conflicts, provenance badges ([REFERENCE] vs [IMPORT]), and multi-identifiers.
 */

import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  Filter,
  RefreshCw,
  Info,
} from 'lucide-react';
import { ProductRecord } from '../../../types';
import { ProductionDataset, ResolutionStatus } from '../../../domain/resolution/types';

interface Stage2ResolutionProps {
  products: ProductRecord[];
  onUpdateProducts: (products: ProductRecord[]) => void;
  dataset: ProductionDataset | null;
  onRefreshResolution: () => void;
}

export const Stage2Resolution: React.FC<Stage2ResolutionProps> = ({
  products,
  onUpdateProducts,
  dataset,
  onRefreshResolution,
}) => {
  const [filterState, setFilterState] = useState<'ALL' | 'EXACT' | 'CONFLICT' | 'UNMATCHED'>('ALL');

  // Compute resolution items from dataset.products
  const items = dataset?.products || [];
  const exactCount = items.filter((i) => i.resolutionStatus === 'EXACT_MATCH').length;
  const conflictCount = items.filter((i) => i.resolutionStatus === 'CONFLICT').length;
  const unmatchedCount = items.filter((i) => i.resolutionStatus === 'NEW_PRODUCT' || i.resolutionStatus === 'UNRESOLVED').length;

  const filteredItems = items.filter((item) => {
    if (filterState === 'EXACT') return item.resolutionStatus === 'EXACT_MATCH';
    if (filterState === 'CONFLICT') return item.resolutionStatus === 'CONFLICT';
    if (filterState === 'UNMATCHED') return item.resolutionStatus === 'NEW_PRODUCT' || item.resolutionStatus === 'UNRESOLVED';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Banner & Resolution Telemetry */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Étape 2 : Résolution & Réconciliation des Données
              </h2>
              <p className="text-xs text-slate-400">
                Croisement du lot importé avec la base de référence canonique pour enrichir les attributs et arbitrer les divergences.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterState('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                filterState === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Tous ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterState('EXACT')}
              className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1 transition-colors ${
                filterState === 'EXACT'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Exacts ({exactCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterState('CONFLICT')}
              className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1 transition-colors ${
                filterState === 'CONFLICT'
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Conflits ({conflictCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterState('UNMATCHED')}
              className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1 transition-colors ${
                filterState === 'UNMATCHED'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-800 text-sky-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <HelpCircle className="w-3 h-3" />
              <span>Nouveaux ({unmatchedCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resolution Grid */}
      <div className="flex-1 min-h-0 p-4 overflow-auto">
        <div className="border border-slate-800 rounded-lg bg-slate-950/70 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/90 sticky top-0 z-10 border-b border-slate-800 text-slate-400 font-semibold select-none">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-36">Statut Résolution</th>
                <th className="py-2.5 px-3">Donnée Magasin (Import)</th>
                <th className="py-2.5 px-3">Identifiants Scoped</th>
                <th className="py-2.5 px-3 w-44 text-center">Arbitrage / Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredItems.map((effProd, idx) => {
                const prod = products.find((p) => p.id === effProd.id) || {
                  ITEMNAME: effProd.identity.name,
                  PARTNO: effProd.identifiers.partNumber,
                  SELLING_PRICE: effProd.commercial.sellingPrice,
                  PRODUCT_SCAN: effProd.identifiers.primaryScan,
                };
                const isConflict = effProd.resolutionStatus === 'CONFLICT';
                const isExact = effProd.resolutionStatus === 'EXACT_MATCH';

                return (
                  <tr key={effProd.id || idx} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      {isExact && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Exact Match
                        </span>
                      )}
                      {isConflict && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300 text-[10px] font-semibold">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Conflit d'attribut
                        </span>
                      )}
                      {!isExact && !isConflict && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-700/60 text-sky-300 text-[10px] font-semibold">
                          <HelpCircle className="w-3 h-3 text-sky-400" />
                          Nouvel article
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-100">{prod.ITEMNAME}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>Réf: {prod.PARTNO || '—'}</span>
                        <span>•</span>
                        <span>Prix: {Number(prod.SELLING_PRICE || 0).toFixed(2)} €</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                      <div>EAN: {effProd.identifiers.primaryScan || 'Non renseigné'}</div>
                      <div className="text-slate-500 text-[10px]">Canonical: {effProd.canonicalProductId || 'N/A'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 font-mono text-[10px]">
                          [IMPORT]
                        </span>
                        <span className="text-slate-500 text-xs">✓</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

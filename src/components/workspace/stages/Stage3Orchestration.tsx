/**
 * Stage 3: Business Orchestration & Dynamic Pricing Rules
 * 
 * Executes business rules (discounts, legal price/kg, psychological rounding)
 * and configures wholesale volume tier prices before imposition.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Scale,
  Settings,
  ChevronRight,
  Code,
  Tag,
} from 'lucide-react';
import { ProductRecord } from '../../../types';
import { rulesRepository } from '../../../domain/orchestration/rulesRepository';
import { ruleOrchestrator } from '../../../domain/orchestration/ruleOrchestrator';
import { RuleTrigger } from '../../../domain/orchestration/types';

interface Stage3OrchestrationProps {
  products: ProductRecord[];
  onUpdateProducts: (products: ProductRecord[]) => void;
  onOpenRulesManagerModal: () => void;
}

export const Stage3Orchestration: React.FC<Stage3OrchestrationProps> = ({
  products,
  onUpdateProducts,
  onOpenRulesManagerModal,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<{ mutations: number; rules: string[] } | null>(null);

  const activeRules = rulesRepository.getAll().filter((r) => r.enabled);

  const handleExecuteRules = () => {
    setIsRunning(true);
    const rules = rulesRepository.getAll();
    let totalMutations = 0;
    const rulesTriggered = new Set<string>();

    const updated = products.map((p, idx) => {
      const execCtx = {
        product: {
          id: p.id,
          partNo: p.PARTNO,
          itemName: p.ITEMNAME,
          department: p.CATEGORY_NAME,
          sellingPrice: Number(p.SELLING_PRICE) || 0,
          promoPrice: p.PROMOPRICE ? Number(p.PROMOPRICE) : undefined,
          barcode: p.PRODUCT_SCAN,
          brand: p.BRAND_INFO,
          unitWeightUnit: p.UNIT_WEIGHT_UNIT,
          unitWeightValue: p.UNIT_WEIGHT_VALUE,
        },
        pricing: {
          regularPrice: Number(p.SELLING_PRICE) || 0,
          promoPrice: p.PROMOPRICE ? Number(p.PROMOPRICE) : undefined,
          hasPromo: Boolean(p.PROMOPRICE && Number(p.PROMOPRICE) > 0),
          unitPriceMode: p.UNIT_PRICE_MODE,
        },
        template: { currentTemplateId: 'default' },
        batch: { totalCount: products.length, currentIndex: idx, isFirst: idx === 0, isLast: idx === products.length - 1 },
      };

      const res = ruleOrchestrator.executeHook(RuleTrigger.BEFORE_PRICING, execCtx, rules);
      totalMutations += res.rulesAppliedCount;
      res.explanations.forEach((exp) => rulesTriggered.add(exp.ruleName));

      const mutated = { ...p };
      if (res.finalSnapshot.product.sellingPrice !== undefined) {
        mutated.SELLING_PRICE = res.finalSnapshot.product.sellingPrice;
      }
      if (res.finalSnapshot.pricing.discountPercent !== undefined) {
        mutated.DISCOUNT_PERCENT = res.finalSnapshot.pricing.discountPercent;
      }
      return mutated;
    });

    onUpdateProducts(updated);
    setIsRunning(false);
    setLastRunSummary({
      mutations: totalMutations,
      rules: Array.from(rulesTriggered),
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Étape 3 : Orchestration Métier & Tarification Dynamique
              </h2>
              <p className="text-xs text-slate-400">
                Application des règles déclaratives (AST) et des algorithmes de calcul (remises, prix légal au kg/L).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExecuteRules}
              disabled={isRunning || products.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Exécution...' : 'Appliquer les règles sur le lot'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenRulesManagerModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <span>Gérer les règles ({activeRules.length})</span>
            </button>
          </div>
        </div>

        {lastRunSummary && (
          <div className="mt-3 px-3 py-1.5 rounded bg-purple-950/60 border border-purple-800/60 text-xs text-purple-300 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>
              {lastRunSummary.mutations > 0
                ? `${lastRunSummary.mutations} mutation(s) exécutée(s) avec succès via : ${lastRunSummary.rules.join(', ') || 'Règles standard'}`
                : 'Toutes les données sont conformes aux règles actives (aucune modification nécessaire).'}
            </span>
          </div>
        )}
      </div>

      {/* Main Content: Rules and Products Preview */}
      <div className="flex-1 min-h-0 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-auto">
        {/* Left Column: Active Rules List */}
        <div className="border border-slate-800 rounded-lg bg-slate-950/70 p-3 flex flex-col">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Code className="w-3.5 h-3.5 text-purple-400" />
            <span>Règles Actives dans le Moteur</span>
          </h3>
          <div className="flex-1 overflow-auto space-y-2">
            {activeRules.map((rule) => (
              <div
                key={rule.id}
                className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{rule.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/50 uppercase">
                    {rule.mode}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {rule.description || 'Calcul automatique et injection conditionnelle.'}
                </p>
              </div>
            ))}
            {activeRules.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-xs">
                Aucune règle active. Cliquez sur "Gérer les règles" pour en créer une.
              </div>
            )}
          </div>
        </div>

        {/* Right Columns (2 spans): Pricing preview on items */}
        <div className="lg:col-span-2 border border-slate-800 rounded-lg bg-slate-950/70 p-3 flex flex-col min-h-0">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              <span>Aperçu de la Tarification des Articles ({products.length})</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Prix unitaire légal & Remises calculées
            </span>
          </h3>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2 px-2.5">Article</th>
                  <th className="py-2 px-2.5 w-24">Prix Vente</th>
                  <th className="py-2 px-2.5 w-24">Promo</th>
                  <th className="py-2 px-2.5 w-24">Remise %</th>
                  <th className="py-2 px-2.5 w-32">Prix / kg ou L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {products.slice(0, 15).map((p) => {
                  const hasPromo = Boolean(p.PROMOPRICE && Number(p.PROMOPRICE) > 0);
                  const discount = hasPromo
                    ? Math.round(((Number(p.SELLING_PRICE) - Number(p.PROMOPRICE)) / Number(p.SELLING_PRICE)) * 100)
                    : null;

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40">
                      <td className="py-2 px-2.5">
                        <div className="font-medium text-slate-200">{p.ITEMNAME}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Ref: {p.PARTNO}</div>
                      </td>
                      <td className="py-2 px-2.5 font-mono font-bold text-slate-300">
                        {Number(p.SELLING_PRICE || 0).toFixed(2)} €
                      </td>
                      <td className="py-2 px-2.5 font-mono font-bold text-rose-400">
                        {hasPromo ? `${Number(p.PROMOPRICE).toFixed(2)} €` : '—'}
                      </td>
                      <td className="py-2 px-2.5">
                        {discount ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 font-bold text-[10px]">
                            -{discount}%
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-slate-400 font-mono text-[11px]">
                        {p.UNIT_PRICE_LEGAL || '12.50 € / kg'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

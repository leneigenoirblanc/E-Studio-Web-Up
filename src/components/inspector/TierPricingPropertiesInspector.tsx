import React from 'react';
import { TemplateItem, TierPriceItemProperties } from '../../types';
import { Coins } from 'lucide-react';

export interface TierPricingPropertiesInspectorProps {
  selectedItem: TemplateItem;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

export const TierPricingPropertiesInspector: React.FC<TierPricingPropertiesInspectorProps> = ({
  selectedItem,
  onUpdate,
}) => {
  if (selectedItem.type !== 'tier_price') return null;

  const item = selectedItem as TierPriceItemProperties;

  return (
    <div className="pt-2 border-t border-slate-200 space-y-3">
      <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
        <Coins className="w-3.5 h-3.5 text-amber-600" />
        <span>Paliers Cash & Carry</span>
      </h4>

      <div>
        <label className="text-[11px] text-slate-500">Palier Cible (1 à 10)</label>
        <input
          type="number"
          min="1"
          max="10"
          value={item.primary_tier ?? 1}
          onChange={(e) => onUpdate({ primary_tier: parseInt(e.target.value, 10) || 1 })}
          className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-500">Préfixe quantité</label>
          <input
            type="text"
            value={item.prefix_text || ''}
            onChange={(e) => onUpdate({ prefix_text: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Symbole monétaire</label>
          <input
            type="text"
            value={item.unit_label || ''}
            onChange={(e) => onUpdate({ unit_label: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
          />
        </div>
      </div>

      {/* Pricing Strategy Selector */}
      <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-200 space-y-1.5">
        <label className="text-[11px] font-bold text-sky-950 flex items-center justify-between">
          <span>Mode de Tarification (Strategy)</span>
          <span className="text-[10px] text-sky-700 uppercase font-mono">
            {item.pricing_strategy === 'graduated' ? 'Progressif' : 'Unitaire'}
          </span>
        </label>
        <select
          value={item.pricing_strategy || 'flat'}
          onChange={(e) => onUpdate({ pricing_strategy: e.target.value as any })}
          className="w-full px-2 py-1.5 bg-white border border-sky-300 rounded text-xs text-sky-950 focus:ring-1 focus:ring-sky-500 cursor-pointer"
        >
          <option value="flat">Volume Standard (Prix unitaire appliqué à tous les articles)</option>
          <option value="graduated">Tarification Cumulative / Par Tranche (Graduated)</option>
        </select>
        <p className="text-[10px] text-sky-700 leading-tight">
          {item.pricing_strategy === 'graduated'
            ? '⚡ Chaque tranche de quantité est calculée avec son propre barème de prix.'
            : '📦 Dès que le palier est atteint, tout le panier bénéficie du prix réduit.'}
        </p>
      </div>

      {/* Cross-Tiers Conditional */}
      <div className="p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-200 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer text-[11px] font-medium text-indigo-950">
          <input
            type="checkbox"
            checked={Boolean(item.cross_conditional?.enabled)}
            onChange={(e) =>
              onUpdate({
                cross_conditional: {
                  enabled: e.target.checked,
                  trigger_column: item.cross_conditional?.trigger_column || 'PARENT_BRAND_VOLUME',
                  min_threshold: item.cross_conditional?.min_threshold ?? 50,
                },
              })
            }
            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span>Condition Croisée (Cross-Tiers)</span>
        </label>

        {item.cross_conditional?.enabled && (
          <div className="space-y-2 pt-1">
            <div>
              <label className="text-[10px] text-indigo-900 font-medium">Colonne Déclencheur</label>
              <input
                type="text"
                placeholder="ex: PARENT_BRAND_VOLUME"
                value={item.cross_conditional.trigger_column || ''}
                onChange={(e) =>
                  onUpdate({
                    cross_conditional: {
                      ...item.cross_conditional!,
                      trigger_column: e.target.value,
                    },
                  })
                }
                className="w-full mt-0.5 px-2 py-1 bg-white border border-indigo-300 rounded text-xs font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] text-indigo-900 font-medium">Seuil Minimal</label>
              <input
                type="number"
                value={item.cross_conditional.min_threshold ?? 50}
                onChange={(e) =>
                  onUpdate({
                    cross_conditional: {
                      ...item.cross_conditional!,
                      min_threshold: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full mt-0.5 px-2 py-1 bg-white border border-indigo-300 rounded text-xs font-mono text-slate-800"
              />
            </div>
            <p className="text-[10px] text-indigo-700 leading-tight">
              Le palier promo sera validé uniquement si la colonne atteint ce seuil.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1.5 pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
          <input
            type="checkbox"
            checked={Boolean(item.strict_required)}
            onChange={(e) => onUpdate({ strict_required: e.target.checked })}
            className="rounded text-blue-600 cursor-pointer"
          />
          <span>Strictement requis (Alerte si palier absent)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-[11px]">
          <input
            type="checkbox"
            checked={Boolean(item.fallback_to_base_price ?? true)}
            onChange={(e) => onUpdate({ fallback_to_base_price: e.target.checked })}
            className="rounded text-blue-600 cursor-pointer"
          />
          <span>Repli sur le prix de base si palier absent</span>
        </label>
      </div>
    </div>
  );
};

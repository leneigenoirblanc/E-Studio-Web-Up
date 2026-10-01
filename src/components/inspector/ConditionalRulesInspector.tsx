import React from 'react';
import { TemplateItem } from '../../types';
import { Eye } from 'lucide-react';

export interface ConditionalRulesInspectorProps {
  selectedItem: TemplateItem;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

export const ConditionalRulesInspector: React.FC<ConditionalRulesInspectorProps> = ({
  selectedItem,
  onUpdate,
}) => {
  return (
    <div className="pt-2 border-t border-slate-200 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          <span>Règles Conditionnelles d'Affichage</span>
        </h4>
      </div>
      <div>
        <label className="text-[11px] text-slate-500">Visibilité dynamique</label>
        <select
          value={selectedItem.conditional_display?.rule || 'always'}
          onChange={(e) => {
            const rule = e.target.value as any;
            onUpdate({
              conditional_display: {
                enabled: rule !== 'always',
                rule,
                field_key: selectedItem.conditional_display?.field_key || selectedItem.binding_key,
              },
            });
          }}
          className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white cursor-pointer"
        >
          <option value="always">Toujours afficher (Par défaut)</option>
          <option value="has_promo">Afficher UNIQUEMENT si l'article est en promotion</option>
          <option value="has_barcode">Afficher UNIQUEMENT si le code-barres est renseigné</option>
          <option value="has_tiers">Afficher UNIQUEMENT si des paliers de prix existent</option>
          <option value="field_gt_zero">Afficher si la valeur numérique est &gt; 0</option>
          <option value="field_not_empty">Afficher si le champ n'est pas vide</option>
        </select>
      </div>
    </div>
  );
};

import React from 'react';
import { TemplateItem, PictogramItemProperties, PictogramType } from '../../types';
import { Stamp } from 'lucide-react';

export interface PictogramPropertiesInspectorProps {
  selectedItem: TemplateItem;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

const PICTOGRAM_OPTIONS: Array<{ value: PictogramType; label: string; group: string }> = [
  // Nutri-Score
  { value: 'nutriscore_a', label: 'Nutri-Score A', group: 'Nutrition' },
  { value: 'nutriscore_b', label: 'Nutri-Score B', group: 'Nutrition' },
  { value: 'nutriscore_c', label: 'Nutri-Score C', group: 'Nutrition' },
  { value: 'nutriscore_d', label: 'Nutri-Score D', group: 'Nutrition' },
  { value: 'nutriscore_e', label: 'Nutri-Score E', group: 'Nutrition' },
  // Éco-Score
  { value: 'ecoscore_a', label: 'Éco-Score A', group: 'Écologie' },
  { value: 'ecoscore_b', label: 'Éco-Score B', group: 'Écologie' },
  { value: 'ecoscore_c', label: 'Éco-Score C', group: 'Écologie' },
  { value: 'ecoscore_d', label: 'Éco-Score D', group: 'Écologie' },
  { value: 'ecoscore_e', label: 'Éco-Score E', group: 'Écologie' },
  // Origine & Labels
  { value: 'origin_france', label: 'Origine France Garantie', group: 'Origine & Labels' },
  { value: 'origin_local', label: 'Producteur Local', group: 'Origine & Labels' },
  { value: 'bio_ab', label: 'Agriculture Biologique (AB)', group: 'Origine & Labels' },
  { value: 'bio_europe', label: 'Eurofeuille Bio', group: 'Origine & Labels' },
  { value: 'triman_recycling', label: 'Triman (Recyclage)', group: 'Origine & Labels' },
  // Allergènes
  { value: 'allergen_gluten', label: 'Contient Gluten', group: 'Allergènes' },
  { value: 'allergen_milk', label: 'Contient Lait / Lactose', group: 'Allergènes' },
  { value: 'allergen_peanut', label: 'Contient Arachide', group: 'Allergènes' },
  { value: 'allergen_egg', label: 'Contient Œuf', group: 'Allergènes' },
  { value: 'allergen_fish', label: 'Contient Poisson', group: 'Allergènes' },
  { value: 'allergen_crustacean', label: 'Contient Crustacés', group: 'Allergènes' },
  // Sécurité & Stockage
  { value: 'symbol_danger_hazard', label: 'Symbole Danger / Avertissement', group: 'Sécurité & Chaîne' },
  { value: 'symbol_cold_chain', label: 'Respect de la Chaîne du Froid', group: 'Sécurité & Chaîne' },
];

export const PictogramPropertiesInspector: React.FC<PictogramPropertiesInspectorProps> = ({
  selectedItem,
  onUpdate,
}) => {
  if (selectedItem.type !== 'pictogram') return null;

  const item = selectedItem as PictogramItemProperties;

  return (
    <div className="pt-2 border-t border-slate-200 space-y-3">
      <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
        <Stamp className="w-3.5 h-3.5 text-blue-600" />
        <span>Pictogramme & Réglementaire</span>
      </h4>

      <div>
        <label className="text-[11px] text-slate-500">Symbole / Norme</label>
        <select
          value={item.pictogram_type || 'nutriscore_a'}
          onChange={(e) => onUpdate({ pictogram_type: e.target.value as PictogramType })}
          className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
        >
          {['Nutrition', 'Écologie', 'Origine & Labels', 'Allergènes', 'Sécurité & Chaîne'].map(
            (groupName) => (
              <optgroup key={groupName} label={groupName}>
                {PICTOGRAM_OPTIONS.filter((o) => o.group === groupName).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            )
          )}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-500">Variante Graphique</label>
          <select
            value={item.style_variant || 'color'}
            onChange={(e) => onUpdate({ style_variant: e.target.value as any })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
          >
            <option value="color">Couleur Officielle</option>
            <option value="monochrome_black">Monochrome Noir</option>
            <option value="badge">Badge avec Fond</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Texte Personnalisé</label>
          <input
            type="text"
            placeholder="Optionnel"
            value={item.custom_label || ''}
            onChange={(e) => onUpdate({ custom_label: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
          />
        </div>
      </div>
    </div>
  );
};

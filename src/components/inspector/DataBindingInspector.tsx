import React from 'react';
import { TemplateItem } from '../../types';

export interface DataBindingInspectorProps {
  selectedItem: TemplateItem;
  availableFields: Array<{ key: string; label: string; description?: string }>;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

export const DataBindingInspector: React.FC<DataBindingInspectorProps> = ({
  selectedItem,
  availableFields,
  onUpdate,
}) => {
  if (
    selectedItem.type === 'shape' ||
    selectedItem.type === 'ellipse' ||
    selectedItem.type === 'line'
  ) {
    return null;
  }

  return (
    <div className="pt-2 border-t border-slate-200">
      <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] tracking-wider text-slate-400">
        Liaison de Données (Binding)
      </h4>
      <div className="space-y-2">
        <div>
          <label className="text-[11px] text-slate-500">Champ Canonique</label>
          <select
            value={selectedItem.binding_key || ''}
            onChange={(e) => onUpdate({ binding_key: e.target.value || undefined })}
            className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white cursor-pointer"
          >
            <option value="">-- Aucun (Texte statique) --</option>
            {availableFields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.key} ({f.label})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Ou Clé Personnalisée</label>
          <input
            type="text"
            placeholder="ex: CODE_RAYON, PROMO_TAG..."
            value={selectedItem.binding_key || ''}
            onChange={(e) => onUpdate({ binding_key: e.target.value.trim() || undefined })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>
    </div>
  );
};

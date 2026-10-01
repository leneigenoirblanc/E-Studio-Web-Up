import React from 'react';
import { TemplateItem, RestrictedAreaItemProperties } from '../../types';
import { ShieldAlert } from 'lucide-react';

export interface RestrictedAreaPropertiesInspectorProps {
  selectedItem: TemplateItem;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

export const RestrictedAreaPropertiesInspector: React.FC<RestrictedAreaPropertiesInspectorProps> = ({
  selectedItem,
  onUpdate,
}) => {
  if (selectedItem.type !== 'restricted_area') return null;

  const item = selectedItem as RestrictedAreaItemProperties;

  return (
    <div className="pt-2 border-t border-slate-200 space-y-3 bg-rose-50/40 p-3 rounded-lg border border-rose-200">
      <h4 className="font-bold text-rose-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
        <span>Zone de Contrainte / Masquage</span>
      </h4>
      <div>
        <label className="text-[11px] text-slate-600 font-medium">Libellé / Description</label>
        <input
          type="text"
          placeholder="ex: Zone Poinçon / Encoche"
          value={item.label || ''}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-600">Motif de Hachure</label>
          <select
            value={item.pattern || 'diagonal_stripes'}
            onChange={(e) => onUpdate({ pattern: e.target.value as any })}
            className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer"
          >
            <option value="diagonal_stripes">Hachures Diagonales</option>
            <option value="cross">Croisillons (Grille)</option>
            <option value="solid">Couleur Pleine</option>
            <option value="outline">Contour Simple</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-600">Couleur d'Alerte</label>
          <div className="flex items-center gap-1 mt-0.5">
            <input
              type="color"
              value={item.zone_color || '#ef4444'}
              onChange={(e) => onUpdate({ zone_color: e.target.value })}
              className="w-7 h-6 p-0 rounded border border-slate-300 cursor-pointer"
            />
            <input
              type="text"
              value={item.zone_color || '#ef4444'}
              onChange={(e) => onUpdate({ zone_color: e.target.value })}
              className="flex-1 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono uppercase"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center">
          <label className="text-[11px] text-slate-600">
            Opacité ({Math.round((item.opacity ?? 0.25) * 100)}%)
          </label>
        </div>
        <input
          type="range"
          min="0.05"
          max="1"
          step="0.05"
          value={item.opacity ?? 0.25}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) || 0.25 })}
          className="w-full accent-rose-600 mt-1 cursor-pointer"
        />
      </div>

      <div className="space-y-1.5 pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 font-medium">
          <input
            type="checkbox"
            checked={Boolean(item.warn_on_overlap ?? true)}
            onChange={(e) => onUpdate({ warn_on_overlap: e.target.checked })}
            className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
          />
          <span>Alerter si un élément déborde sur cette zone</span>
        </label>
      </div>
    </div>
  );
};

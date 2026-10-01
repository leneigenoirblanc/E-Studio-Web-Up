import React from 'react';
import { TemplateItem, ShapeItemProperties } from '../../types';

export interface ShapePropertiesInspectorProps {
  selectedItem: TemplateItem;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

export const ShapePropertiesInspector: React.FC<ShapePropertiesInspectorProps> = ({
  selectedItem,
  onUpdate,
}) => {
  if (
    selectedItem.type !== 'shape' &&
    selectedItem.type !== 'ellipse' &&
    selectedItem.type !== 'line'
  ) {
    return null;
  }

  return (
    <div className="pt-2 border-t border-slate-200 space-y-3">
      {/* SHAPE & ELLIPSE */}
      {(selectedItem.type === 'shape' || selectedItem.type === 'ellipse') && (
        <>
          <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] tracking-wider text-slate-400">
            Style de la Forme
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Couleur de fond</label>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="color"
                  value={selectedItem.fill_color || '#ffffff'}
                  onChange={(e) => onUpdate({ fill_color: e.target.value })}
                  className="w-8 h-7 p-0 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedItem.fill_color || '#ffffff'}
                  onChange={(e) => onUpdate({ fill_color: e.target.value })}
                  className="flex-1 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono uppercase"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Couleur bordure</label>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="color"
                  value={selectedItem.border_color || '#000000'}
                  onChange={(e) => onUpdate({ border_color: e.target.value })}
                  className="w-8 h-7 p-0 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedItem.border_color || '#000000'}
                  onChange={(e) => onUpdate({ border_color: e.target.value })}
                  className="flex-1 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono uppercase"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Épaisseur bordure (px)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={selectedItem.border_width || 1}
                onChange={(e) => onUpdate({ border_width: parseFloat(e.target.value) || 0 })}
                className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
              />
            </div>
            {selectedItem.type === 'shape' && (
              <div>
                <label className="text-[11px] text-slate-500">Rayon coins (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={(selectedItem as ShapeItemProperties).corner_radius || 0}
                  onChange={(e) => onUpdate({ corner_radius: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* LINE */}
      {selectedItem.type === 'line' && (
        <>
          <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] tracking-wider text-slate-400">
            Paramètres de la Ligne
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Couleur du trait</label>
              <input
                type="color"
                value={(selectedItem as any).color || '#000000'}
                onChange={(e) => onUpdate({ color: e.target.value } as any)}
                className="w-full h-7 p-0 rounded border border-slate-300 cursor-pointer mt-0.5"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Épaisseur (px)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={(selectedItem as any).thickness || 1}
                onChange={(e) => onUpdate({ thickness: parseFloat(e.target.value) || 1 } as any)}
                className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Style du trait</label>
            <select
              value={(selectedItem as any).style || 'solid'}
              onChange={(e) => onUpdate({ style: e.target.value } as any)}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
            >
              <option value="solid">Trait continu (Solid)</option>
              <option value="dashed">Tirets (Dashed)</option>
              <option value="dotted">Pointillés (Dotted)</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
};

import React from 'react';
import { TemplateItem, SemanticSnapConfig } from '../../types';
import { Magnet, Link2, Scissors } from 'lucide-react';
import { AnchorReflowInspector } from './AnchorReflowInspector';

export interface TransformLayoutInspectorProps {
  selectedItem: TemplateItem;
  allItems: TemplateItem[];
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

export const TransformLayoutInspector: React.FC<TransformLayoutInspectorProps> = ({
  selectedItem,
  allItems,
  onUpdate,
}) => {
  return (
    <div className="space-y-4">
      {/* Geometry (mm) */}
      <div>
        <h4 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider text-slate-400">
          Géométrie (Millimètres)
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-slate-500">X (mm)</label>
            <input
              type="number"
              step="0.5"
              value={selectedItem.x_mm ?? 0}
              onChange={(e) => onUpdate({ x_mm: parseFloat(e.target.value) || 0 })}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Y (mm)</label>
            <input
              type="number"
              step="0.5"
              value={selectedItem.y_mm ?? 0}
              onChange={(e) => onUpdate({ y_mm: parseFloat(e.target.value) || 0 })}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Largeur (mm)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={selectedItem.w_mm ?? 1}
              onChange={(e) => onUpdate({ w_mm: Math.max(1, parseFloat(e.target.value) || 1) })}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Hauteur (mm)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={selectedItem.h_mm ?? 1}
              onChange={(e) => onUpdate({ h_mm: Math.max(1, parseFloat(e.target.value) || 1) })}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Rotation (°)</label>
            <input
              type="number"
              step="15"
              value={selectedItem.rotation ?? 0}
              onChange={(e) => onUpdate({ rotation: parseFloat(e.target.value) || 0 })}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Plan (Z-Index)</label>
            <input
              type="number"
              value={selectedItem.z_index ?? 1}
              onChange={(e) => onUpdate({ z_index: parseInt(e.target.value, 10) || 1 })}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Responsive Gabarit Anchor Constraints with Material Design Icons */}
      <AnchorReflowInspector selectedItem={selectedItem} onUpdate={onUpdate} />

      {/* Print finish & die-cut masks */}
      <div className="pt-2 border-t border-slate-200 space-y-2">
        <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
          <Scissors className="w-3.5 h-3.5" />
          <span>Finition & Masque d'Impression</span>
        </h4>
        <div>
          <label className="text-[11px] text-slate-500">Traitement spécial / Finition</label>
          <select
            value={selectedItem.finish_effect || 'none'}
            onChange={(e) => onUpdate({ finish_effect: e.target.value as any })}
            className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
          >
            <option value="none">Standard (Impression quadrichromie)</option>
            <option value="die_cut">Tracé de Découpe (Ligne rose magenta de forme)</option>
            <option value="spot_varnish">Vernis Sélectif Brillant (Zone d'enduction UV)</option>
            <option value="hot_foil">Dorure à Chaud (Marquage or métallisé)</option>
          </select>
        </div>
      </div>

      {/* Semantic Snapping (Aimant Sémantique) */}
      <div className="pt-2 border-t border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1.5">
            <Magnet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Aimant Sémantique (Snapping Lié)</span>
          </h4>
          {selectedItem.semantic_snap && (
            <button
              type="button"
              onClick={() => onUpdate({ semantic_snap: undefined })}
              className="text-[10px] text-rose-600 hover:text-rose-700 underline font-medium cursor-pointer"
            >
              Détacher
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 font-medium">
          <input
            type="checkbox"
            checked={Boolean(selectedItem.semantic_snap)}
            onChange={(e) => {
              if (e.target.checked) {
                const potentialParent = allItems.find((i) => i.id !== selectedItem.id);
                onUpdate({
                  semantic_snap: {
                    parent_id: potentialParent ? potentialParent.id : '',
                    anchor_edge: 'bottom',
                    offset_mm: 2.0,
                  },
                });
              } else {
                onUpdate({ semantic_snap: undefined });
              }
            }}
            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span>Asservir la boîte à un élément parent</span>
        </label>

        {selectedItem.semantic_snap && (
          <div className="p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-200 space-y-2">
            <div>
              <label className="text-[11px] text-indigo-900 font-medium flex items-center gap-1">
                <Link2 className="w-3 h-3 text-indigo-600" />
                <span>Élément Parent de Référence</span>
              </label>
              <select
                value={selectedItem.semantic_snap.parent_id}
                onChange={(e) =>
                  onUpdate({
                    semantic_snap: {
                      ...selectedItem.semantic_snap!,
                      parent_id: e.target.value,
                    },
                  })
                }
                className="w-full mt-1 px-2 py-1.5 bg-white border border-indigo-300 rounded text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Sélectionner un élément --</option>
                {allItems
                  .filter((it) => it.id !== selectedItem.id)
                  .map((it) => {
                    const label =
                      (it as any).text ||
                      (it as any).code ||
                      (it as any).label ||
                      (it as any).binding_key ||
                      it.type;
                    return (
                      <option key={it.id} value={it.id}>
                        {it.id} ({it.type} - {String(label).slice(0, 22)})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-indigo-900 font-medium">Bord d'ancrage</label>
                <select
                  value={selectedItem.semantic_snap.anchor_edge}
                  onChange={(e) =>
                    onUpdate({
                      semantic_snap: {
                        ...selectedItem.semantic_snap!,
                        anchor_edge: e.target.value as any,
                      },
                    })
                  }
                  className="w-full mt-1 px-2 py-1 bg-white border border-indigo-300 rounded text-xs text-slate-800"
                >
                  <option value="bottom">En dessous (bottom)</option>
                  <option value="top">Au dessus (top)</option>
                  <option value="right">À droite (right)</option>
                  <option value="left">À gauche (left)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-indigo-900 font-medium">Distance (mm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={selectedItem.semantic_snap.offset_mm ?? 0}
                  onChange={(e) =>
                    onUpdate({
                      semantic_snap: {
                        ...selectedItem.semantic_snap!,
                        offset_mm: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full mt-1 px-2 py-1 bg-white border border-indigo-300 rounded text-xs font-mono text-slate-800"
                />
              </div>
            </div>

            <p className="text-[10px] text-indigo-700 leading-tight">
              💡 Si le parent bouge ou s'élargit, cet élément se déplace de façon synchrone à{' '}
              {selectedItem.semantic_snap.offset_mm} mm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

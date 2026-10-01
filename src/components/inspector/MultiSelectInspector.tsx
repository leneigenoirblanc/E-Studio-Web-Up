import React from 'react';
import {
  TemplateItem,
} from '../../types';
import {
  AVAILABLE_FONTS,
  FONT_WEIGHTS,
  extractCommonProperties,
  ElementStylePayload,
  extractElementStyle,
} from '../../models/TemplateObjectModel';
import {
  Trash2,
  Copy,
  Lock,
  Unlock,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Type,
  Box,
  Paintbrush,
  ClipboardCheck,
  X,
} from 'lucide-react';

export interface MultiSelectInspectorProps {
  selectedItems: TemplateItem[];
  onUpdateMultipleItems?: (updatedItems: TemplateItem[]) => void;
  onUpdateItem: (updatedItem: TemplateItem) => void;
  onDeleteMultipleItems?: (ids: string[]) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateMultipleItems?: (ids: string[]) => void;
  onDuplicateItem: (id: string) => void;
  copiedStyle?: ElementStylePayload | null;
  onCopyStyle?: (style: ElementStylePayload) => void;
  onPasteStyle?: () => void;
  onClose?: () => void;
}

export const MultiSelectInspector: React.FC<MultiSelectInspectorProps> = ({
  selectedItems,
  onUpdateMultipleItems,
  onUpdateItem,
  onDeleteMultipleItems,
  onDeleteItem,
  onDuplicateMultipleItems,
  onDuplicateItem,
  copiedStyle,
  onCopyStyle,
  onPasteStyle,
  onClose,
}) => {
  const count = selectedItems.length;
  const common = extractCommonProperties(selectedItems);

  const updateMulti = (patch: Partial<any>) => {
    const updated = selectedItems.map((it) => ({
      ...it,
      ...patch,
    }));
    if (onUpdateMultipleItems) {
      onUpdateMultipleItems(updated);
    } else {
      updated.forEach((it) => onUpdateItem(it));
    }
  };

  const handleDeleteAll = () => {
    if (onDeleteMultipleItems) {
      onDeleteMultipleItems(selectedItems.map((it) => it.id));
    } else {
      selectedItems.forEach((it) => onDeleteItem(it.id));
    }
  };

  const handleDuplicateAll = () => {
    if (onDuplicateMultipleItems) {
      onDuplicateMultipleItems(selectedItems.map((it) => it.id));
    } else {
      selectedItems.forEach((it) => onDuplicateItem(it.id));
    }
  };

  const handleCopyStyleFromFirst = () => {
    if (onCopyStyle && selectedItems[0]) {
      onCopyStyle(extractElementStyle(selectedItems[0]));
    }
  };

  const allLocked = selectedItems.every((it) => it.locked);

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col text-xs text-slate-700 select-none overflow-y-auto shrink-0 z-10 shadow-lg">
      {/* Multi-Selection Header */}
      <div className="p-3 border-b border-slate-200 bg-blue-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
            {count}
          </span>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-800">Sélection Multiple</span>
            <h3 className="font-bold text-slate-900 text-xs">Propriétés Communes</h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onCopyStyle && (
            <button
              onClick={handleCopyStyleFromFirst}
              title="Copier le style du 1er élément (Ctrl+Alt+C)"
              className="p-1.5 rounded hover:bg-blue-100 text-blue-700 transition cursor-pointer"
            >
              <Paintbrush className="w-3.5 h-3.5" />
            </button>
          )}
          {onPasteStyle && copiedStyle && (
            <button
              onClick={onPasteStyle}
              title="Coller le style sur toute la sélection (Ctrl+Alt+V)"
              className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => updateMulti({ locked: !allLocked })}
            title={allLocked ? 'Déverrouiller tout' : 'Verrouiller tout'}
            className={`p-1.5 rounded transition cursor-pointer ${
              allLocked ? 'bg-amber-100 text-amber-800' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            {allLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDuplicateAll}
            title="Dupliquer la sélection"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDeleteAll}
            title="Supprimer la sélection"
            className="p-1.5 rounded hover:bg-rose-100 text-rose-600 ml-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded ml-1 cursor-pointer"
              title="Fermer l'inspecteur"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Style Paste Alert in Multi-Select */}
      {copiedStyle && onPasteStyle && (
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-[11px] text-blue-700">Style en mémoire prêt à coller</span>
          <button
            onClick={onPasteStyle}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-[10px] cursor-pointer"
          >
            Appliquer à la sélection
          </button>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Dimensions communes */}
        <div>
          <h4 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
            <Box className="w-3 h-3" />
            <span>Dimensions Communes (mm)</span>
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Largeur (mm)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                placeholder={common.w_mm !== undefined ? String(common.w_mm) : 'Mixte'}
                value={common.w_mm !== undefined ? common.w_mm : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) updateMulti({ w_mm: val });
                }}
                className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Hauteur (mm)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                placeholder={common.h_mm !== undefined ? String(common.h_mm) : 'Mixte'}
                value={common.h_mm !== undefined ? common.h_mm : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) updateMulti({ h_mm: val });
                }}
                className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Rotation (°)</label>
              <input
                type="number"
                step="15"
                placeholder={common.rotation !== undefined ? String(common.rotation) : 'Mixte'}
                value={common.rotation !== undefined ? common.rotation : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) updateMulti({ rotation: val });
                }}
                className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Typographie commune */}
        <div className="pt-2 border-t border-slate-200">
          <h4 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
            <Type className="w-3 h-3" />
            <span>Typographie Commune</span>
          </h4>
          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] text-slate-500">Police de Caractères</label>
              <select
                value={common.font_family || ''}
                onChange={(e) => {
                  if (e.target.value) updateMulti({ font_family: e.target.value });
                }}
                className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs"
              >
                <option value="">{common.font_family ? common.font_family : '-- Conserver / Mixte --'}</option>
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">Taille (pt)</label>
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="120"
                  placeholder={common.font_size_pt !== undefined ? String(common.font_size_pt) : 'Mixte'}
                  value={common.font_size_pt !== undefined ? common.font_size_pt : ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0) updateMulti({ font_size_pt: val });
                  }}
                  className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Graisse</label>
                <select
                  value={common.font_weight || ''}
                  onChange={(e) => {
                    if (e.target.value) updateMulti({ font_weight: e.target.value });
                  }}
                  className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
                >
                  <option value="">{common.font_weight || '-- Mixte --'}</option>
                  {FONT_WEIGHTS.map((fw) => (
                    <option key={fw.value} value={fw.value}>
                      {fw.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Style & Décoration Multi */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">Style Italique</label>
                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    type="button"
                    onClick={() => updateMulti({ font_style: common.font_style === 'italic' ? 'normal' : 'italic' })}
                    className={`flex-1 py-1 text-center font-serif italic text-xs rounded border cursor-pointer ${
                      common.font_style === 'italic'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Italique
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Décoration</label>
                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateMulti({ text_decoration: common.text_decoration === 'underline' ? 'none' : 'underline' })
                    }
                    className={`flex-1 py-1 text-center underline text-xs rounded border cursor-pointer ${
                      common.text_decoration === 'underline'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                    title="Souligné"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateMulti({
                        text_decoration: common.text_decoration === 'line-through' ? 'none' : 'line-through',
                      })
                    }
                    className={`flex-1 py-1 text-center line-through text-xs rounded border cursor-pointer ${
                      common.text_decoration === 'line-through'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                    title="Barré"
                  >
                    S
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500">Couleur Texte</label>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="color"
                    value={common.text_color || '#000000'}
                    onChange={(e) => updateMulti({ text_color: e.target.value })}
                    className="w-8 h-7 p-0 rounded border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder="Mixte"
                    value={common.text_color || ''}
                    onChange={(e) => updateMulti({ text_color: e.target.value })}
                    className="flex-1 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-500">Alignement H</label>
                <div className="flex items-center gap-1 mt-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
                  <button
                    type="button"
                    onClick={() => updateMulti({ alignment: 'left' })}
                    className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${
                      common.alignment === 'left' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
                    }`}
                    title="Gauche"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMulti({ alignment: 'center' })}
                    className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${
                      common.alignment === 'center' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
                    }`}
                    title="Centré"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMulti({ alignment: 'right' })}
                    className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${
                      common.alignment === 'right' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
                    }`}
                    title="Droite"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMulti({ alignment: 'justify' })}
                    className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${
                      common.alignment === 'justify' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
                    }`}
                    title="Justifié"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Couleurs et Bordures Communes */}
        <div className="pt-2 border-t border-slate-200">
          <h4 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
            <Palette className="w-3 h-3" />
            <span>Couleurs & Bordures Communes</span>
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Fond (Fill)</label>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="color"
                  value={common.fill_color || '#ffffff'}
                  onChange={(e) => updateMulti({ fill_color: e.target.value })}
                  className="w-8 h-7 p-0 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  placeholder="Mixte"
                  value={common.fill_color || ''}
                  onChange={(e) => updateMulti({ fill_color: e.target.value })}
                  className="flex-1 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono uppercase"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Bordure</label>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="color"
                  value={common.border_color || '#000000'}
                  onChange={(e) => updateMulti({ border_color: e.target.value })}
                  className="w-8 h-7 p-0 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  placeholder="Mixte"
                  value={common.border_color || ''}
                  onChange={(e) => updateMulti({ border_color: e.target.value })}
                  className="flex-1 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono uppercase"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

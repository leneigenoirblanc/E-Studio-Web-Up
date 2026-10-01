import React from 'react';
import { TemplateItem, LabelTemplate } from '../types';
import { DOMAIN_FIELDS } from '../domainFields';
import { useMappingDictionary } from '../context/MappingDictionaryContext';
import { ResponsiveLayoutEngine } from '../utils/responsiveLayoutEngine';
import {
  ElementStylePayload,
  extractElementStyle,
} from '../models/TemplateObjectModel';
import {
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Sliders,
  Paintbrush,
  ClipboardCheck,
  X,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import {
  MultiSelectInspector,
  TransformLayoutInspector,
  DataBindingInspector,
  ConditionalRulesInspector,
  TextPropertiesInspector,
  PriceBlockPropertiesInspector,
  BarcodePropertiesInspector,
  ShapePropertiesInspector,
  RichTextPropertiesInspector,
  RestrictedAreaPropertiesInspector,
  PictogramPropertiesInspector,
  TierPricingPropertiesInspector,
} from './inspector';

export interface PropertyInspectorProps {
  selectedItems: TemplateItem[];
  allItems?: TemplateItem[];
  template?: LabelTemplate;
  onUpdateTemplate?: (patch: Partial<LabelTemplate>) => void;
  onUpdateItem: (updatedItem: TemplateItem) => void;
  onUpdateMultipleItems?: (updatedItems: TemplateItem[]) => void;
  onDeleteItem: (id: string) => void;
  onDeleteMultipleItems?: (ids: string[]) => void;
  onDuplicateItem: (id: string) => void;
  onDuplicateMultipleItems?: (ids: string[]) => void;
  onReorderItem: (id: string, delta: number) => void;
  copiedStyle?: ElementStylePayload | null;
  onCopyStyle?: (style: ElementStylePayload) => void;
  onPasteStyle?: () => void;
  onClose?: () => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  selectedItems,
  allItems = [],
  template,
  onUpdateTemplate,
  onUpdateItem,
  onUpdateMultipleItems,
  onDeleteItem,
  onDeleteMultipleItems,
  onDuplicateItem,
  onDuplicateMultipleItems,
  onReorderItem,
  copiedStyle,
  onCopyStyle,
  onPasteStyle,
  onClose,
}) => {
  const { dictionary } = useMappingDictionary();
  const availableFields = React.useMemo(() => {
    if (!dictionary || !Array.isArray(dictionary) || dictionary.length === 0) return DOMAIN_FIELDS;
    return dictionary.map((f) => ({
      key: f.key,
      label: f.label,
      description: f.description,
    }));
  }, [dictionary]);

  const count = selectedItems.length;

  // 1. Zero Selection State -> Canvas / Gabarit Inspector
  if (count === 0) {
    if (template && onUpdateTemplate) {
      return (
        <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col text-xs text-slate-700 select-none overflow-y-auto shrink-0 z-10 shadow-lg">
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <LayoutGrid className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Gabarit & Toile</span>
                <h3 className="font-bold text-slate-800 text-sm truncate max-w-[170px]">{template.name}</h3>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-4 space-y-4 flex-1">
            {/* Template Physical Dimensions with Responsive Reflow */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400">
                  Format Étiquette (mm)
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                  {template.width_mm} × {template.height_mm} mm
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500">Largeur (mm)</label>
                  <input
                    type="number"
                    step="1"
                    min="15"
                    max="300"
                    value={template.width_mm}
                    onChange={(e) => {
                      const newW = Math.max(15, parseFloat(e.target.value) || template.width_mm);
                      const adaptedItems = ResponsiveLayoutEngine.adaptItemsToNewDimensions(template.items, {
                        oldWidthMm: template.width_mm,
                        oldHeightMm: template.height_mm,
                        newWidthMm: newW,
                        newHeightMm: template.height_mm,
                      });
                      onUpdateTemplate({ width_mm: newW, items: adaptedItems });
                    }}
                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500">Hauteur (mm)</label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="300"
                    value={template.height_mm}
                    onChange={(e) => {
                      const newH = Math.max(10, parseFloat(e.target.value) || template.height_mm);
                      const adaptedItems = ResponsiveLayoutEngine.adaptItemsToNewDimensions(template.items, {
                        oldWidthMm: template.width_mm,
                        oldHeightMm: template.height_mm,
                        newWidthMm: template.width_mm,
                        newHeightMm: newH,
                      });
                      onUpdateTemplate({ height_mm: newH, items: adaptedItems });
                    }}
                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs font-bold"
                  />
                </div>
              </div>
              <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3" />
                <span>Reflow élastique automatique actif selon ancrages</span>
              </p>
            </div>

            {/* Quick Standard Preset Sizes */}
            <div className="pt-2 border-t border-slate-200">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                Formats Standards Rayon
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { w: 60, h: 40, label: '60 × 40 mm (Broche)' },
                  { w: 80, h: 40, label: '80 × 40 mm (Rayon)' },
                  { w: 100, h: 60, label: '100 × 60 mm (Palette)' },
                  { w: 70, h: 36, label: '70 × 36 mm (Avery 3474)' },
                ].map((std) => (
                  <button
                    key={`${std.w}x${std.h}`}
                    type="button"
                    onClick={() => {
                      const adapted = ResponsiveLayoutEngine.adaptItemsToNewDimensions(template.items, {
                        oldWidthMm: template.width_mm,
                        oldHeightMm: template.height_mm,
                        newWidthMm: std.w,
                        newHeightMm: std.h,
                      });
                      onUpdateTemplate({ width_mm: std.w, height_mm: std.h, items: adapted });
                    }}
                    className={`px-2 py-1 text-[10px] font-medium rounded border transition text-left truncate cursor-pointer ${
                      template.width_mm === std.w && template.height_mm === std.h
                        ? 'bg-blue-600 text-white font-bold border-blue-600 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {std.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Background Color */}
            <div className="pt-2 border-t border-slate-200">
              <label className="text-[11px] text-slate-500 block mb-1">Couleur Fond Étiquette</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={template.bg_color || '#ffffff'}
                  onChange={(e) => onUpdateTemplate({ bg_color: e.target.value })}
                  className="w-7 h-6 p-0 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={template.bg_color || '#ffffff'}
                  onChange={(e) => onUpdateTemplate({ bg_color: e.target.value })}
                  className="flex-1 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono uppercase"
                />
              </div>
            </div>

            {/* Inner Margins */}
            <div className="pt-2 border-t border-slate-200">
              <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400 block mb-1">
                Marges Internes d'Impression (mm)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500">Haut</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={template.inner_margins_mm?.top ?? 2}
                    onChange={(e) =>
                      onUpdateTemplate({
                        inner_margins_mm: {
                          ...template.inner_margins_mm,
                          top: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Bas</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={template.inner_margins_mm?.bottom ?? 2}
                    onChange={(e) =>
                      onUpdateTemplate({
                        inner_margins_mm: {
                          ...template.inner_margins_mm,
                          bottom: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Gauche</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={template.inner_margins_mm?.left ?? 2}
                    onChange={(e) =>
                      onUpdateTemplate({
                        inner_margins_mm: {
                          ...template.inner_margins_mm,
                          left: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Droite</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={template.inner_margins_mm?.right ?? 2}
                    onChange={(e) =>
                      onUpdateTemplate({
                        inner_margins_mm: {
                          ...template.inner_margins_mm,
                          right: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-80 bg-white border-l border-slate-200 p-6 text-slate-500 text-sm flex flex-col items-center justify-center text-center h-full select-none shrink-0 z-10">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Sliders className="w-6 h-6" />
        </div>
        <p className="font-semibold text-slate-700">Aucun élément sélectionné</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Sélectionnez un ou plusieurs objets sur la toile pour afficher et modifier leurs propriétés contextuelles.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Fermer l'inspecteur
          </button>
        )}
      </div>
    );
  }

  // 2. Multi-Selection Inspector
  if (count > 1) {
    return (
      <MultiSelectInspector
        selectedItems={selectedItems}
        onUpdateItem={onUpdateItem}
        onUpdateMultipleItems={onUpdateMultipleItems}
        onDeleteItem={onDeleteItem}
        onDeleteMultipleItems={onDeleteMultipleItems}
        onDuplicateItem={onDuplicateItem}
        onDuplicateMultipleItems={onDuplicateMultipleItems}
        copiedStyle={copiedStyle}
        onCopyStyle={onCopyStyle}
        onPasteStyle={onPasteStyle}
        onClose={onClose}
      />
    );
  }

  // 3. Single-Selection Inspector
  const selectedItem = selectedItems[0];

  const update = (patch: Partial<TemplateItem>) => {
    onUpdateItem({ ...selectedItem, ...patch } as TemplateItem);
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col text-xs text-slate-700 select-none overflow-y-auto shrink-0 z-10 shadow-lg">
      {/* Header with Quick Actions */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Élément</span>
          <h3 className="font-bold text-slate-800 capitalize text-sm">{selectedItem.type.replace('_', ' ')}</h3>
        </div>
        <div className="flex items-center gap-1">
          {onCopyStyle && (
            <button
              onClick={() => onCopyStyle(extractElementStyle(selectedItem))}
              title="Copier le style de cet élément (Ctrl+Alt+C)"
              className="p-1.5 rounded hover:bg-blue-100 text-blue-700 transition cursor-pointer"
            >
              <Paintbrush className="w-3.5 h-3.5" />
            </button>
          )}
          {onPasteStyle && copiedStyle && (
            <button
              onClick={onPasteStyle}
              title="Coller le style copié sur cet élément (Ctrl+Alt+V)"
              className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => update({ locked: !selectedItem.locked })}
            title={selectedItem.locked ? 'Déverrouiller' : 'Verrouiller'}
            className={`p-1.5 rounded transition cursor-pointer ${
              selectedItem.locked ? 'bg-amber-100 text-amber-800' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            {selectedItem.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onReorderItem(selectedItem.id, 1)}
            title="Avancer (z-index)"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onReorderItem(selectedItem.id, -1)}
            title="Reculer (z-index)"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Fermer l'inspecteur"
              className="p-1.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition ml-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onDuplicateItem(selectedItem.id)}
            title="Dupliquer"
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteItem(selectedItem.id)}
            title="Supprimer"
            className="p-1.5 rounded hover:bg-rose-100 text-rose-600 ml-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Copy/Paste Style Notification Bar */}
      {copiedStyle && onPasteStyle && (
        <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-[11px] text-blue-700">Style en mémoire</span>
          <button
            onClick={onPasteStyle}
            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-[10px] cursor-pointer"
          >
            Coller le style
          </button>
        </div>
      )}

      {/* Body: Modular Sub-Inspectors */}
      <div className="p-4 space-y-4">
        {/* 1. Geometry & Snapping */}
        <TransformLayoutInspector
          selectedItem={selectedItem}
          allItems={allItems}
          onUpdate={update}
        />

        {/* 2. Data Binding Key */}
        <DataBindingInspector
          selectedItem={selectedItem}
          availableFields={availableFields}
          onUpdate={update}
        />

        {/* 3. Conditional Display Rules */}
        <ConditionalRulesInspector
          selectedItem={selectedItem}
          onUpdate={update}
        />

        {/* 4. Type Specific Sub-Inspectors */}
        <TextPropertiesInspector
          selectedItem={selectedItem}
          onUpdate={update}
        />

        <PriceBlockPropertiesInspector
          selectedItem={selectedItem}
          onUpdate={update}
        />

        <BarcodePropertiesInspector
          selectedItem={selectedItem}
          onUpdate={update}
        />

        <ShapePropertiesInspector
          selectedItem={selectedItem}
          onUpdate={update}
        />

        <RichTextPropertiesInspector
          selectedItem={selectedItem}
          availableFields={availableFields}
          onUpdate={update}
        />

        <RestrictedAreaPropertiesInspector
          selectedItem={selectedItem}
          onUpdate={update}
        />

        <PictogramPropertiesInspector
          selectedItem={selectedItem}
          onUpdate={update}
        />

        <TierPricingPropertiesInspector
          selectedItem={selectedItem}
          onUpdate={update}
        />
      </div>
    </div>
  );
};

export default PropertyInspector;

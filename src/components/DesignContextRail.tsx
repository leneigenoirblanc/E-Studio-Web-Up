/**
 * Precision Production Cockpit — Single Adaptive Design Context Rail
 * 
 * Replaces the previous dual-rail clutter with ONE sleek 280px rail (collapsible to 48px):
 * - Tab 1: Calques (Layers, structural hierarchy, z-index, visibility, lock)
 * - Tab 2: Propriétés (Selection-aware: Geometry → Typography → Binding → Rules → Appearance)
 * - Tab 3: Insérer (High-speed click presets for Price V2, Codes, Texts, Shapes, Pictos)
 */

import React, { useState } from 'react';
import { TemplateItem, LabelTemplate } from '../types';
import { PropertyInspector } from './PropertyInspector';
import { SmartNavTreeSidebar } from './SmartNavTreeSidebar';
import { ElementStylePayload } from '../models/TemplateObjectModel';
import {
  Layers,
  Sliders,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Tag,
  Percent,
  Scale,
  Barcode,
  QrCode,
  Type,
  FileText,
  Square,
  Circle,
  Minus,
  Stamp,
  Image as ImageIcon,
  Crosshair,
  Settings2,
} from 'lucide-react';

export type DesignRailTab = 'layers' | 'properties' | 'insert';

interface DesignContextRailProps {
  template: LabelTemplate;
  selectedItems: TemplateItem[];
  selectedItemIds: string[];
  activeTab: DesignRailTab;
  onTabChange: (tab: DesignRailTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;

  // Layer & Item actions
  onSelectItem: (id: string, multi?: boolean) => void;
  onUpdateItem: (item: TemplateItem) => void;
  onUpdateMultipleItems?: (items: TemplateItem[]) => void;
  onDeleteItem: (id: string) => void;
  onDeleteMultipleItems?: (ids: string[]) => void;
  onDuplicateItem: (id: string) => void;
  onDuplicateMultipleItems?: (ids: string[]) => void;
  onReorderItem: (id: string, delta: number) => void;
  onAddNewItem: (type: string, payload?: any) => void;

  // Style Clipboard
  copiedStyle?: ElementStylePayload | null;
  onCopyStyle?: (style: ElementStylePayload) => void;
  onPasteStyle?: () => void;

  // Template modifications
  onUpdateTemplate?: (patch: Partial<LabelTemplate>) => void;
  onOpenCalibration?: () => void;
}

export const DesignContextRail: React.FC<DesignContextRailProps> = ({
  template,
  selectedItems,
  selectedItemIds,
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  onSelectItem,
  onUpdateItem,
  onUpdateMultipleItems,
  onDeleteItem,
  onDeleteMultipleItems,
  onDuplicateItem,
  onDuplicateMultipleItems,
  onReorderItem,
  onAddNewItem,
  copiedStyle,
  onCopyStyle,
  onPasteStyle,
  onUpdateTemplate,
  onOpenCalibration,
}) => {
  const hasSelection = selectedItems.length > 0;

  // If collapsed to icon strip (48px)
  if (isCollapsed) {
    return (
      <aside className="w-12 bg-white border-r border-slate-200 flex flex-col items-center py-2 shrink-0 z-30 select-none shadow-2xs">
        <button
          onClick={onToggleCollapse}
          className="p-2 mb-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          title="Développer le volet latéral"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-1 w-full px-1.5">
          <button
            onClick={() => {
              onTabChange('layers');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`w-full p-2 rounded-lg flex flex-col items-center justify-center transition ${
              activeTab === 'layers'
                ? 'bg-blue-50 text-blue-600 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Calques & Structure"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              onTabChange('properties');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`w-full p-2 rounded-lg flex flex-col items-center justify-center relative transition ${
              activeTab === 'properties'
                ? 'bg-blue-50 text-blue-600 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Propriétés & Format"
          >
            <Sliders className="w-4 h-4" />
            {hasSelection && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute top-1.5 right-1.5" />
            )}
          </button>

          <button
            onClick={() => {
              onTabChange('insert');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`w-full p-2 rounded-lg flex flex-col items-center justify-center transition ${
              activeTab === 'insert'
                ? 'bg-blue-50 text-blue-600 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Insérer des composants"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // Expanded rail (280px)
  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 z-30 select-none shadow-2xs h-full overflow-hidden">
      {/* Rail Tab Header */}
      <div className="h-9 px-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTabChange('layers')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'layers'
                ? 'bg-white text-blue-600 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Calques</span>
          </button>

          <button
            onClick={() => onTabChange('properties')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition relative ${
              activeTab === 'properties'
                ? 'bg-white text-blue-600 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Format</span>
            {hasSelection && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            )}
          </button>

          <button
            onClick={() => onTabChange('insert')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'insert'
                ? 'bg-white text-blue-600 shadow-2xs font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Insérer</span>
          </button>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          title="Réduire le volet (48px)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Rail Tab Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* TAB 1: CALQUES (LAYERS & TREE) */}
        {activeTab === 'layers' && (
          <div className="h-full">
            <SmartNavTreeSidebar
              template={template}
              selectedItemIds={selectedItemIds}
              onSelectItem={(id, multi) => {
                onSelectItem(id, multi);
                // Selection automatically empowers the properties tab
                onTabChange('properties');
              }}
              onUpdateItem={(id, patch) => {
                const item = template.items.find((i) => i.id === id);
                if (item) onUpdateItem({ ...item, ...patch } as TemplateItem);
              }}
              onDeleteItem={onDeleteItem}
              onDuplicateItem={onDuplicateItem}
              onReorderItem={(id, dir) => onReorderItem(id, dir === 'up' ? 1 : -1)}
              onAddNewItem={(type, customField) => onAddNewItem(type, customField)}
              isCollapsed={false}
              onToggleCollapse={onToggleCollapse}
            />
          </div>
        )}

        {/* TAB 2: PROPRIÉTÉS (SELECTION-AWARE) */}
        {activeTab === 'properties' && (
          <div>
            {hasSelection ? (
              <PropertyInspector
                selectedItems={selectedItems}
                allItems={template.items}
                template={template}
                onUpdateTemplate={onUpdateTemplate}
                onUpdateItem={onUpdateItem}
                onUpdateMultipleItems={onUpdateMultipleItems}
                onDeleteItem={onDeleteItem}
                onDeleteMultipleItems={onDeleteMultipleItems}
                onDuplicateItem={onDuplicateItem}
                onDuplicateMultipleItems={onDuplicateMultipleItems}
                onReorderItem={onReorderItem}
                copiedStyle={copiedStyle}
                onCopyStyle={onCopyStyle}
                onPasteStyle={onPasteStyle}
              />
            ) : (
              <div className="p-4 space-y-4 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-bold">
                  <Settings2 className="w-4 h-4 text-blue-600" />
                  <span>Propriétés du Gabarit</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Dimensions physiques</div>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500">Largeur (mm)</span>
                        <input
                          type="number"
                          value={template.width_mm}
                          onChange={(e) => onUpdateTemplate?.({ width_mm: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">Hauteur (mm)</span>
                        <input
                          type="number"
                          value={template.height_mm}
                          onChange={(e) => onUpdateTemplate?.({ height_mm: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Calibration Réelle</div>
                    <p className="text-[11px] text-slate-500">
                      Superposer un scan ou une photo du support physique pour repérer les découpes.
                    </p>
                    <button
                      onClick={onOpenCalibration}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-amber-600" />
                      <span>Calque de Calibration</span>
                    </button>
                  </div>

                  <div className="text-center p-3 text-slate-400 italic text-[11px]">
                    Sélectionnez un élément sur le canvas pour afficher ses propriétés spécifiques.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INSÉRER (HIGH-SPEED CLICK PRESETS) */}
        {activeTab === 'insert' && (
          <div className="p-3 space-y-3.5 text-xs">
            {/* PRIX V2 */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Moteur Tarifaire V2</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onAddNewItem('price', { preset: 'simple' })}
                  className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 flex items-center gap-2 text-left transition"
                >
                  <Tag className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Prix Simple</div>
                    <div className="text-[9px] text-emerald-700">Standard retail</div>
                  </div>
                </button>

                <button
                  onClick={() => onAddNewItem('price', { preset: 'promotion' })}
                  className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 flex items-center gap-2 text-left transition"
                >
                  <Percent className="w-4 h-4 text-rose-700 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Prix Promo</div>
                    <div className="text-[9px] text-rose-700">Pastille & remise</div>
                  </div>
                </button>

                <button
                  onClick={() => onAddNewItem('price', { preset: 'unit_price' })}
                  className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 flex items-center gap-2 text-left transition"
                >
                  <Scale className="w-4 h-4 text-blue-700 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Prix / Kilo</div>
                    <div className="text-[9px] text-blue-700">Unité légale</div>
                  </div>
                </button>

                <button
                  onClick={() => onAddNewItem('price', { preset: 'wholesale_tiers' })}
                  className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 flex items-center gap-2 text-left transition"
                >
                  <Tag className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Paliers B2B</div>
                    <div className="text-[9px] text-amber-700">Volume dégressif</div>
                  </div>
                </button>
              </div>
            </div>

            {/* CODES 1D & 2D */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Codes & Traçabilité</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onAddNewItem('barcode')}
                  className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 flex items-center gap-2 text-left transition"
                >
                  <Barcode className="w-4 h-4 text-purple-700 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">Code EAN-13</div>
                    <div className="text-[9px] text-purple-700">Norme GS1</div>
                  </div>
                </button>

                <button
                  onClick={() => onAddNewItem('qrcode')}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 flex items-center gap-2 text-left transition"
                >
                  <QrCode className="w-4 h-4 text-slate-700 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">QR Code 2D</div>
                    <div className="text-[9px] text-slate-500">URL traçabilité</div>
                  </div>
                </button>
              </div>
            </div>

            {/* TEXTES */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Zones de Texte</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onAddNewItem('text')}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-left transition"
                >
                  <Type className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-slate-800">Texte Simple</div>
                    <div className="text-[9px] text-slate-500">Titre ou libellé</div>
                  </div>
                </button>

                <button
                  onClick={() => onAddNewItem('rich_text')}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-left transition"
                >
                  <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-slate-800">Texte Riche</div>
                    <div className="text-[9px] text-slate-500">Multiligne auto</div>
                  </div>
                </button>
              </div>
            </div>

            {/* FORMES & PASTILLES */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Formes Géométriques</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => onAddNewItem('shape')}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex flex-col items-center justify-center text-center transition"
                >
                  <Square className="w-4 h-4 text-slate-700 mb-1" />
                  <span className="text-[10px] font-semibold text-slate-800">Rectangle</span>
                </button>

                <button
                  onClick={() => onAddNewItem('ellipse')}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex flex-col items-center justify-center text-center transition"
                >
                  <Circle className="w-4 h-4 text-rose-600 mb-1" />
                  <span className="text-[10px] font-semibold text-slate-800">Pastille</span>
                </button>

                <button
                  onClick={() => onAddNewItem('line')}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex flex-col items-center justify-center text-center transition"
                >
                  <Minus className="w-4 h-4 text-slate-700 mb-1" />
                  <span className="text-[10px] font-semibold text-slate-800">Ligne</span>
                </button>
              </div>
            </div>

            {/* ASSETS & PICTOS */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Médias & Légal</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onAddNewItem('image')}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-left transition"
                >
                  <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-slate-800">Image / Logo</div>
                    <div className="text-[9px] text-slate-500">Vectoriel ou bitmap</div>
                  </div>
                </button>

                <button
                  onClick={() => onAddNewItem('pictogram')}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2 text-left transition"
                >
                  <Stamp className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-slate-800">Picto Légal</div>
                    <div className="text-[9px] text-slate-500">Nutri-Score, Bio</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

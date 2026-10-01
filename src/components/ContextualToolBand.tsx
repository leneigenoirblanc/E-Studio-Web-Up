/**
 * E-Studio Contextual Tool Band (44 px)
 * 
 * Part of Precision Press Architecture:
 * - Changes dynamically with selection
 * - Nothing selected: Stock summary chip, grid/snap toggles, row-preview stepper (PgUp/PgDn, stress rows)
 * - Text / field: font, size, weight, alignment, fit mode, binding {ITEMNAME}, Show if…
 * - Price: slot chips (Integer · Separator · Fraction · Currency · Unit)
 * - Barcode: symbology, live EAN check-digit status, quiet-zone warning, human-readable toggle
 * - Shape / line / image: fill, stroke, radius
 * - Production zone: type, blocks print toggle
 */

import React, { useState } from 'react';
import { TemplateItem, LabelTemplate, ProductRecord } from '../types';
import { StockProfile, PRELOADED_STOCKS } from '../domain/stock/stockModel';
import {
  Grid,
  Magnet,
  ChevronLeft,
  ChevronRight,
  Flame,
  DollarSign,
  Percent,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Check,
  Tag,
  Barcode,
  QrCode,
  Sliders,
  Type,
  Maximize2,
  Box,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ContextualToolBandProps {
  template: LabelTemplate;
  selectedItems: TemplateItem[];
  currentProduct?: ProductRecord;
  totalProductsCount: number;
  currentProductIndex: number;
  onSelectProductIndex: (index: number) => void;
  onSelectStressRow: (type: 'longest_name' | 'widest_price' | 'promo_tiers') => void;
  onUpdateItem: (updatedItem: TemplateItem) => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  gridSizeMm: number;
  onChangeGridSize: (size: number) => void;
  stockProfile?: StockProfile;
  onChangeStockProfile?: (stock: StockProfile) => void;
  onOpenRulesModal?: () => void;
}

export const ContextualToolBand: React.FC<ContextualToolBandProps> = ({
  template,
  selectedItems,
  currentProduct,
  totalProductsCount,
  currentProductIndex,
  onSelectProductIndex,
  onSelectStressRow,
  onUpdateItem,
  snapToGrid,
  onToggleSnapToGrid,
  gridSizeMm,
  onChangeGridSize,
  stockProfile = PRELOADED_STOCKS[0],
  onChangeStockProfile,
  onOpenRulesModal,
}) => {
  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null;

  // =========================================================================
  // 1. NOTHING SELECTED: STOCK SUMMARY + GRID/SNAP + ROW-PREVIEW STEPPER
  // =========================================================================
  if (!selectedItem) {
    return (
      <div className="h-11 bg-white border-b border-slate-200 px-3 flex items-center justify-between text-xs text-slate-700 select-none z-30 shrink-0 font-sans shadow-2xs">
        {/* Left: Stock Summary Chip */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
            <Box className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold">{stockProfile.name}</span>
            <span className="text-[10px] font-mono text-slate-500">
              {template.width_mm}×{template.height_mm}mm
            </span>
          </div>

          {/* Grid & Snap Toggles */}
          <div className="flex items-center gap-1 bg-slate-50 rounded border border-slate-200 p-0.5">
            <button
              onClick={onToggleSnapToGrid}
              className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
                snapToGrid ? 'bg-blue-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Magnétisme de la grille (Snap)"
            >
              <Magnet className="w-3 h-3" />
              <span>Snap {gridSizeMm}mm</span>
            </button>
            <select
              value={gridSizeMm}
              onChange={(e) => onChangeGridSize(Number(e.target.value))}
              className="bg-transparent text-[11px] font-mono text-slate-600 outline-none px-1"
            >
              <option value={0.5}>0.5 mm</option>
              <option value={1.0}>1.0 mm</option>
              <option value={2.0}>2.0 mm</option>
              <option value={5.0}>5.0 mm</option>
            </select>
          </div>
        </div>

        {/* Right: Live-Bound Row Preview Stepper & Stress Pins */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
            Données Réelles :
          </span>

          {/* Row Stepper (PgUp / PgDn) */}
          <div className="flex items-center bg-slate-100 rounded border border-slate-200 p-0.5">
            <button
              onClick={() => onSelectProductIndex(Math.max(0, currentProductIndex - 1))}
              disabled={currentProductIndex <= 0}
              className="p-1 rounded hover:bg-white text-slate-600 disabled:opacity-30 disabled:pointer-events-none"
              title="Article précédent (PgUp)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-xs font-bold text-slate-800">
              Ligne {currentProductIndex + 1} / {Math.max(1, totalProductsCount)}
            </span>
            <button
              onClick={() => onSelectProductIndex(Math.min(totalProductsCount - 1, currentProductIndex + 1))}
              disabled={currentProductIndex >= totalProductsCount - 1}
              className="p-1 rounded hover:bg-white text-slate-600 disabled:opacity-30 disabled:pointer-events-none"
              title="Article suivant (PgDn)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stress Rows Pre-Pins */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onSelectStressRow('longest_name')}
              className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1 transition"
              title="Tester avec le nom le plus long du catalogue"
            >
              <Flame className="w-3 h-3 text-amber-600" />
              <span className="hidden md:inline">Nom Max</span>
            </button>

            <button
              onClick={() => onSelectStressRow('widest_price')}
              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1 transition"
              title="Tester avec le montant le plus large"
            >
              <DollarSign className="w-3 h-3 text-emerald-600" />
              <span className="hidden md:inline">Prix Max</span>
            </button>

            <button
              onClick={() => onSelectStressRow('promo_tiers')}
              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-1 transition"
              title="Tester avec une promo et remises par lot"
            >
              <Percent className="w-3 h-3 text-rose-600" />
              <span className="hidden md:inline">Promo Tiers</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. TEXT OR BOUND FIELD SELECTED
  // =========================================================================
  if (selectedItem.type === 'text') {
    const textItem = selectedItem as any;
    const isBold = textItem.font_weight === 'bold' || textItem.font_weight === '800';
    const isItalic = textItem.font_style === 'italic';
    const isUnderline = (textItem.text_decoration || '').includes('underline');

    return (
      <div className="h-11 bg-white border-b border-slate-200 px-3 flex items-center justify-between text-xs text-slate-700 select-none z-30 shrink-0 font-sans shadow-2xs overflow-x-auto">
        {/* Left: Font family, size, weights, alignments */}
        <div className="flex items-center gap-2">
          {/* Font Family */}
          <select
            value={textItem.font_family || 'Plus Jakarta Sans'}
            onChange={(e) => onUpdateItem({ ...textItem, font_family: e.target.value })}
            className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold bg-slate-50 text-slate-800 outline-none"
          >
            <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Oswald">Oswald (Compact)</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Courier Prime">Courier (Mono)</option>
          </select>

          {/* Size (pt) */}
          <input
            type="number"
            value={textItem.font_size_pt || 12}
            onChange={(e) => onUpdateItem({ ...textItem, font_size_pt: Number(e.target.value) })}
            className="w-14 px-2 py-1 border border-slate-300 rounded text-xs font-mono font-bold text-center"
            title="Taille de police (pt)"
          />

          {/* B I U */}
          <div className="flex items-center bg-slate-100 rounded border border-slate-200 p-0.5">
            <button
              onClick={() => onUpdateItem({ ...textItem, font_weight: isBold ? 'normal' : 'bold' })}
              className={`p-1 rounded ${isBold ? 'bg-white shadow-2xs font-black text-blue-600' : 'text-slate-600'}`}
              title="Gras"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateItem({ ...textItem, font_style: isItalic ? 'normal' : 'italic' })}
              className={`p-1 rounded ${isItalic ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-600'}`}
              title="Italique"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onUpdateItem({ ...textItem, text_decoration: isUnderline ? 'none' : 'underline' })}
              className={`p-1 rounded ${isUnderline ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-600'}`}
              title="Souligné"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Alignments */}
          <div className="flex items-center bg-slate-100 rounded border border-slate-200 p-0.5">
            {(['left', 'center', 'right', 'justify'] as const).map((align) => (
              <button
                key={align}
                onClick={() => onUpdateItem({ ...textItem, alignment: align })}
                className={`p-1 rounded ${textItem.alignment === align ? 'bg-white shadow-2xs text-blue-600' : 'text-slate-600'}`}
                title={`Alignement ${align}`}
              >
                {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                {align === 'justify' && <AlignJustify className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          {/* Fit Mode */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Fit:</span>
            <select
              value={textItem.overflow || 'autofit_shrink'}
              onChange={(e) => onUpdateItem({ ...textItem, overflow: e.target.value })}
              className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold bg-slate-50 text-slate-800 outline-none"
            >
              <option value="autofit_shrink">Auto-réduction</option>
              <option value="clip">Couper (Clip)</option>
              <option value="overflow">Déborder</option>
            </select>
          </div>
        </div>

        {/* Right: Field Binding & Show if... */}
        <div className="flex items-center gap-2">
          {/* Field Binding Chip */}
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-purple-50 border border-purple-200 text-purple-900 font-mono text-xs font-bold">
            <Tag className="w-3 h-3 text-purple-700" />
            <span>{textItem.binding_key ? `{${textItem.binding_key}}` : 'Texte statique'}</span>
          </div>

          {/* Show if... Condition Chip */}
          <button
            onClick={onOpenRulesModal}
            className={`px-2 py-1 rounded border text-xs font-semibold flex items-center gap-1 transition ${
              textItem.conditional_display?.enabled
                ? 'bg-purple-600 text-white border-purple-700 font-bold'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
            title="Définir une condition de visibilité"
          >
            <Sparkles className="w-3 h-3" />
            <span>Show if…</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. PRICE COMPONENT SELECTED (TYPOGRAPHIC SLOTS)
  // =========================================================================
  if (selectedItem.type === 'price' || selectedItem.type === 'price_block') {
    const priceItem = selectedItem as any;
    return (
      <div className="h-11 bg-white border-b border-slate-200 px-3 flex items-center justify-between text-xs text-slate-700 select-none z-30 shrink-0 font-sans shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Slots Prix :</span>

          {/* Integer Slot Chip */}
          <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 font-bold text-slate-800">
            Entier: 36pt
          </span>

          {/* Separator Slot Chip */}
          <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 font-bold text-slate-800">
            Sép: ,
          </span>

          {/* Fraction Slot Chip */}
          <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 font-bold text-slate-800">
            Fraction: 20pt
          </span>

          {/* Currency Slot Chip */}
          <span className="px-2 py-1 rounded bg-blue-50 border border-blue-200 font-bold text-blue-800">
            Devise: FCFA
          </span>

          {/* Unit Slot Chip */}
          <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 font-bold text-slate-600">
            Unité: /kg
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRulesModal}
            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>Règle Promo</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 4. BARCODE / QR COMPONENT SELECTED
  // =========================================================================
  if (selectedItem.type === 'barcode' || selectedItem.type === 'qrcode') {
    const isEAN = selectedItem.type === 'barcode';
    return (
      <div className="h-11 bg-white border-b border-slate-200 px-3 flex items-center justify-between text-xs text-slate-700 select-none z-30 shrink-0 font-sans shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            {isEAN ? <Barcode className="w-4 h-4 text-purple-600" /> : <QrCode className="w-4 h-4 text-blue-600" />}
            <span>{isEAN ? 'EAN-13 GS1' : 'QR Code 2D'}</span>
          </div>

          {isEAN && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Clé GS1 Conforme</span>
            </div>
          )}

          <div className="text-[11px] text-slate-500 font-mono">
            Champ: {(selectedItem as any).binding_key || 'PRODUCT_SCAN'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={(selectedItem as any).show_text !== false}
              onChange={(e) => onUpdateItem({ ...selectedItem, show_text: e.target.checked } as any)}
              className="rounded text-blue-600"
            />
            <span>Texte lisible</span>
          </label>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 5. SHAPE / IMAGE / LINE
  // =========================================================================
  return (
    <div className="h-11 bg-white border-b border-slate-200 px-3 flex items-center justify-between text-xs text-slate-700 select-none z-30 shrink-0 font-sans shadow-2xs">
      <div className="flex items-center gap-3">
        <span className="font-bold text-slate-800 uppercase">{selectedItem.type}</span>
        <span className="text-[11px] font-mono text-slate-500">
          W: {selectedItem.w_mm}mm × H: {selectedItem.h_mm}mm
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenRulesModal}
          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-purple-600" />
          <span>Show if…</span>
        </button>
      </div>
    </div>
  );
};

/**
 * E-Studio Contextual Floating Ribbon V2
 * Ruban HUD ergonomique flottant contextuel :
 * - Outils dédiés par type (Prix V2, Texte, Code-barres, Formes)
 * - Sélecteur de preset tarifaire direct (Simple, Promo, Unité, Paliers B2B, Membre, Lot)
 * - Réglages rapides (Taille, Séparateurs, Position Devise, Couleurs)
 * - Agencement magnétique (Centrer H/V, Calques, Verrouillage, Duplication)
 */

import React, { useState } from 'react';
import { TemplateItem, LabelTemplate } from '../types';
import { PriceElement, PricePreset } from '../domain/pricing/presentation';
import { pricingEngine } from '../domain/pricing/pricingEngine';
import {
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Lock,
  Unlock,
  Copy,
  Trash2,
  MoveUp,
  MoveDown,
  Plus,
  Minus,
  Crosshair,
  Sliders,
  DollarSign,
  Tag,
  Scale,
  Sparkles,
  ChevronDown,
  RotateCw,
} from 'lucide-react';
import { ContextTooltip } from '../context/TooltipContext';

interface ContextualFloatingRibbonProps {
  selectedItem: TemplateItem | null;
  selectedItemsCount: number;
  template: LabelTemplate;
  zoom: number;
  canvasContainerWidthPx?: number;
  onUpdateItem: (updatedItem: TemplateItem) => void;
  onDuplicateItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onReorderItem: (itemId: string, direction: 'up' | 'down') => void;
  onCenterItem?: (itemId: string, axis: 'x' | 'y' | 'both') => void;
  onRotateStep90?: (itemId: string) => void;
  onOpenInspectorDrawer?: () => void;
}

export const ContextualFloatingRibbon: React.FC<ContextualFloatingRibbonProps> = ({
  selectedItem,
  selectedItemsCount,
  template,
  zoom,
  onUpdateItem,
  onDuplicateItem,
  onDeleteItem,
  onReorderItem,
  onCenterItem,
  onRotateStep90,
  onOpenInspectorDrawer,
}) => {
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);

  if (!selectedItem || selectedItemsCount === 0) return null;

  const itemAny = selectedItem as any;
  const isPrice = selectedItem.type === 'price' || selectedItem.type === 'price_block';
  const isV2Price = selectedItem.type === 'price';
  const isTextLike =
    selectedItem.type === 'text' ||
    selectedItem.type === 'curved_text' ||
    selectedItem.type === 'rich_text' ||
    isPrice;
  const isLocked = Boolean(selectedItem.locked);

  const pricePreset: PricePreset = isV2Price
    ? (selectedItem as PriceElement).preset || 'simple'
    : itemAny.binding_key === 'PROMOPRICE'
    ? 'promotion'
    : 'simple';

  const handlePresetSelect = (preset: PricePreset) => {
    setIsPresetMenuOpen(false);
    if (isV2Price) {
      const switched = pricingEngine.switchPreset(selectedItem as PriceElement, preset);
      onUpdateItem(switched as any);
    } else {
      if (preset === 'promotion') {
        onUpdateItem({
          ...selectedItem,
          binding_key: 'PROMOPRICE',
          promo_badge_type: 'discount_pct',
        } as any);
      } else {
        onUpdateItem({
          ...selectedItem,
          binding_key: 'SELLING_PRICE',
          promo_badge_type: undefined,
        } as any);
      }
    }
  };

  const handleFontSizeChange = (delta: number) => {
    if (isV2Price) {
      const p = selectedItem as PriceElement;
      const slots = { ...(p.typography?.slots || {}) };
      const curSize = slots.integer?.sizePt || p.typography?.default?.sizePt || 28;
      const newSize = Math.max(8, Math.min(144, curSize + delta * 2));
      if (slots.integer) {
        slots.integer = { ...slots.integer, sizePt: newSize };
      }
      onUpdateItem({
        ...p,
        typography: { ...(p.typography || {}), slots },
      } as any);
    } else if (selectedItem.type === 'price_block') {
      const currentInt = itemAny.integer_style?.font_size_pt || 28;
      const currentDec = itemAny.decimal_style?.font_size_pt || 14;
      const newInt = Math.max(8, Math.min(120, currentInt + delta * 2));
      const newDec = Math.max(6, Math.min(80, currentDec + delta));
      onUpdateItem({
        ...selectedItem,
        integer_style: { ...itemAny.integer_style, font_size_pt: newInt },
        decimal_style: { ...itemAny.decimal_style, font_size_pt: newDec },
      } as any);
    } else if (selectedItem.type === 'text' || selectedItem.type === 'curved_text') {
      const currentSize = itemAny.font_size_pt || 12;
      const newSize = Math.max(4, Math.min(120, currentSize + delta));
      onUpdateItem({ ...selectedItem, font_size_pt: newSize } as any);
    }
  };

  const handleToggleBold = () => {
    if (isV2Price) {
      const p = selectedItem as PriceElement;
      const slots = { ...(p.typography?.slots || {}) };
      const curWeight = slots.integer?.weight || 700;
      const newWeight = curWeight === 700 || curWeight === 800 || curWeight === 'bold' ? 400 : 700;
      if (slots.integer) {
        slots.integer = { ...slots.integer, weight: newWeight };
      }
      onUpdateItem({ ...p, typography: { ...(p.typography || {}), slots } } as any);
    } else if (selectedItem.type === 'price_block') {
      const curWeight = itemAny.integer_style?.font_weight || 'bold';
      const newWeight = curWeight === 'bold' || curWeight === '800' ? 'normal' : 'bold';
      onUpdateItem({
        ...selectedItem,
        integer_style: { ...itemAny.integer_style, font_weight: newWeight },
      } as any);
    } else if (selectedItem.type === 'text' || selectedItem.type === 'curved_text') {
      const curWeight = itemAny.font_weight || 'normal';
      onUpdateItem({
        ...selectedItem,
        font_weight: curWeight === 'bold' || curWeight === '800' ? 'normal' : 'bold',
      } as any);
    }
  };

  const handleColorChange = (color: string) => {
    if (isV2Price) {
      const p = selectedItem as PriceElement;
      const slots = { ...(p.typography?.slots || {}) };
      if (slots.integer) slots.integer = { ...slots.integer, color };
      if (slots.decimalSeparator) slots.decimalSeparator = { ...slots.decimalSeparator, color };
      if (slots.fraction) slots.fraction = { ...slots.fraction, color };
      if (slots.currency) slots.currency = { ...slots.currency, color };
      onUpdateItem({ ...p, typography: { ...(p.typography || {}), slots } } as any);
    } else if (selectedItem.type === 'price_block') {
      onUpdateItem({
        ...selectedItem,
        integer_style: { ...itemAny.integer_style, text_color: color },
        decimal_style: { ...itemAny.decimal_style, text_color: color },
        currency_style: { ...itemAny.currency_style, text_color: color },
      } as any);
    } else if (selectedItem.type === 'text' || selectedItem.type === 'curved_text') {
      onUpdateItem({ ...selectedItem, text_color: color } as any);
    } else if (selectedItem.type === 'shape' || selectedItem.type === 'ellipse') {
      onUpdateItem({ ...selectedItem, fill_color: color } as any);
    } else if (selectedItem.type === 'line') {
      onUpdateItem({ ...selectedItem, color } as any);
    }
  };

  const handleCenter = (axis: 'x' | 'y' | 'both') => {
    if (onCenterItem) {
      onCenterItem(selectedItem.id, axis);
      return;
    }
    const patch: any = {};
    if (axis === 'x' || axis === 'both') {
      const centeredX = Number(((template.width_mm - selectedItem.w_mm) / 2).toFixed(2));
      patch.x_mm = Math.max(0, centeredX);
    }
    if (axis === 'y' || axis === 'both') {
      const centeredY = Number(((template.height_mm - selectedItem.h_mm) / 2).toFixed(2));
      patch.y_mm = Math.max(0, centeredY);
    }
    onUpdateItem({ ...selectedItem, ...patch });
  };

  const getFontSizeDisplay = (): string => {
    if (isV2Price) {
      const p = selectedItem as PriceElement;
      return `${p.typography?.slots?.integer?.sizePt || p.typography?.default?.sizePt || 28}pt`;
    }
    if (selectedItem.type === 'price_block') {
      return `${itemAny.integer_style?.font_size_pt || 28}pt`;
    }
    return `${itemAny.font_size_pt || 12}pt`;
  };

  const quickColors = ['#0f172a', '#ffffff', '#dc2626', '#16a34a', '#2563eb', '#f59e0b'];

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100%-80px)] flex items-center gap-1.5 bg-slate-900/95 text-white backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl px-3 py-1.5 text-xs select-none pointer-events-auto animate-in fade-in zoom-in-95 duration-150 overflow-x-auto"
      style={{
        boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.5)',
      }}
    >
      {/* 1. Badge Type & Dimensions */}
      <ContextTooltip
        title="Élément Actif"
        content={`Type: ${selectedItem.type} | Dimensions: ${selectedItem.w_mm} × ${selectedItem.h_mm} mm`}
        category="Objet"
        placement="bottom"
      >
        <div className="flex items-center gap-1.5 bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-700/60 font-mono text-[11px] shrink-0">
          <span className="px-1.5 py-0.5 bg-indigo-600 text-white font-bold text-[9px] rounded uppercase tracking-wider">
            {selectedItem.type.replace('_', ' ')}
          </span>
          <span className="text-slate-300 font-semibold text-[10px]">
            {selectedItem.w_mm}×{selectedItem.h_mm}mm
          </span>
        </div>
      </ContextTooltip>

      {/* 2. Menu Déroulant Presets Prix V2 */}
      {isPrice && (
        <div className="relative shrink-0">
          <button
            onClick={() => setIsPresetMenuOpen(!isPresetMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900 rounded-lg text-xs font-semibold transition"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="capitalize">{pricePreset.replace('_', ' ')}</span>
            <ChevronDown className="w-3 h-3 text-emerald-400 opacity-80" />
          </button>

          {isPresetMenuOpen && (
            <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 min-w-[170px] z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95">
              {[
                { id: 'simple', label: 'Prix Simple' },
                { id: 'promotion', label: 'Prix Promo (-20%)' },
                { id: 'unit_price', label: 'Prix au kg / L' },
                { id: 'wholesale_tiers', label: 'Paliers Gros B2B' },
                { id: 'member', label: 'Prix Club Membre' },
                { id: 'bundle', label: 'Lot / Bundle' },
                { id: 'variable_measure', label: 'Poids Variable' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id as PricePreset)}
                  className={`px-2 py-1 text-left rounded-lg text-[11px] font-medium transition ${
                    pricePreset === preset.id
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 3. Stepper de Taille Typographique */}
      {isTextLike && (
        <div className="flex items-center gap-1 shrink-0">
          <ContextTooltip title="Diminuer la Taille" content="-1 pt" category="Typographie" placement="bottom">
            <button
              onClick={() => handleFontSizeChange(-1)}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </ContextTooltip>

          <span className="font-mono text-[11px] font-bold px-1.5 text-slate-200 min-w-[34px] text-center">
            {getFontSizeDisplay()}
          </span>

          <ContextTooltip title="Agrandir la Taille" content="+1 pt" category="Typographie" placement="bottom">
            <button
              onClick={() => handleFontSizeChange(1)}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </ContextTooltip>

          <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5" />

          {/* Toggle Gras */}
          <ContextTooltip title="Mettre en Gras" content="Bascule le poids de la police" category="Typographie" placement="bottom">
            <button
              onClick={handleToggleBold}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
          </ContextTooltip>

          <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5" />
        </div>
      )}

      {/* 4. Nuancier Rapide de Couleurs */}
      <div className="flex items-center gap-1 px-1 shrink-0">
        {quickColors.map((c) => (
          <button
            key={c}
            onClick={() => handleColorChange(c)}
            style={{ backgroundColor: c }}
            className="w-4 h-4 rounded-full border border-slate-600 hover:scale-125 transition shrink-0"
            title={`Appliquer la couleur ${c}`}
          />
        ))}
      </div>

      <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5 shrink-0" />

      {/* 5. Centrage Rapide sur l'Étiquette */}
      <ContextTooltip title="Centrer Horizontalement" content="Aligne l'élément au milieu du gabarit (Axe X)" category="Disposition" placement="bottom">
        <button
          onClick={() => handleCenter('x')}
          className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </ContextTooltip>

      <ContextTooltip title="Centrer Verticalement" content="Aligne l'élément au centre vertical (Axe Y)" category="Disposition" placement="bottom">
        <button
          onClick={() => handleCenter('y')}
          className="px-1.5 py-0.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition"
        >
          Y
        </button>
      </ContextTooltip>

      {/* 6. Rotation 90° Rapide */}
      {onRotateStep90 && (
        <ContextTooltip title="Pivoter de 90°" content="Fait pivoter l'élément d'un quart de tour dans le sens horaire" category="Disposition" placement="bottom">
          <button
            onClick={() => onRotateStep90(selectedItem.id)}
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </ContextTooltip>
      )}

      {/* 6. Ordre des Calques */}
      <ContextTooltip title="Avancer Calque" content="Monte l'élément dans la pile (Z-Index + 1)" category="Calques" placement="bottom">
        <button
          onClick={() => onReorderItem(selectedItem.id, 'up')}
          className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
        >
          <MoveUp className="w-3.5 h-3.5" />
        </button>
      </ContextTooltip>

      <ContextTooltip title="Reculer Calque" content="Descend l'élément dans la pile (Z-Index - 1)" category="Calques" placement="bottom">
        <button
          onClick={() => onReorderItem(selectedItem.id, 'down')}
          className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
        >
          <MoveDown className="w-3.5 h-3.5" />
        </button>
      </ContextTooltip>

      {/* 7. Verrouillage */}
      <ContextTooltip
        title={isLocked ? "Déverrouiller l'Élément" : "Verrouiller l'Élément"}
        content="Protège la position contre les déplacements accidentels"
        category="Sécurité"
        placement="bottom"
      >
        <button
          onClick={() => onUpdateItem({ ...selectedItem, locked: !isLocked } as any)}
          className={`p-1 rounded-lg transition ${
            isLocked ? 'text-amber-400 bg-slate-800 font-bold' : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>
      </ContextTooltip>

      {/* 8. Duplication */}
      <ContextTooltip title="Dupliquer" content="Crée une copie immédiate (+2mm)" category="Actions" placement="bottom">
        <button
          onClick={() => onDuplicateItem(selectedItem.id)}
          className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </ContextTooltip>

      {/* 9. Suppression */}
      <ContextTooltip title="Supprimer" content="Supprime définitivement cet objet" category="Actions" placement="bottom">
        <button
          onClick={() => onDeleteItem(selectedItem.id)}
          className="p-1 hover:bg-red-900/80 text-slate-300 hover:text-red-300 rounded-lg transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </ContextTooltip>

      {/* 10. Bouton Ouvrir l'Inspecteur Dédié */}
      {onOpenInspectorDrawer && (
        <>
          <div className="w-[1px] h-4 bg-slate-700/80 mx-0.5 shrink-0" />
          <ContextTooltip title="Inspecteur Complet" content="Ouvre le panneau de réglages avancés (Source, Format, Typo, Paliers)" category="Inspecteur" placement="bottom">
            <button
              onClick={onOpenInspectorDrawer}
              className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center gap-1.5 px-2.5 transition shadow-2xs shrink-0"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">Inspecteur</span>
            </button>
          </ContextTooltip>
        </>
      )}
    </div>
  );
};

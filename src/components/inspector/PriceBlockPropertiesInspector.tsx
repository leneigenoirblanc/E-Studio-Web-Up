import React from 'react';
import { TemplateItem, PriceBlockItemProperties } from '../../types';
import { PriceElement, PricePreset } from '../../domain/pricing/presentation';
import { pricingEngine } from '../../domain/pricing/pricingEngine';
import { DollarSign, Sparkles, Layers, Sliders } from 'lucide-react';
import { ContrastAdvisorWidget } from './ContrastAdvisorWidget';

export interface PriceBlockPropertiesInspectorProps {
  selectedItem: TemplateItem;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

export const PriceBlockPropertiesInspector: React.FC<PriceBlockPropertiesInspectorProps> = ({
  selectedItem,
  onUpdate,
}) => {
  if (selectedItem.type !== 'price_block' && selectedItem.type !== 'price') return null;

  // Support both new composable PriceElement (type: 'price') and legacy price_block
  const isV2Price = selectedItem.type === 'price';
  const v2Element = isV2Price ? (selectedItem as PriceElement) : null;
  const legacyItem = !isV2Price ? (selectedItem as PriceBlockItemProperties) : null;

  // Extraction des valeurs de couleur et taille pour affichage unifié
  const currentColor = isV2Price
    ? v2Element?.typography?.slots?.integer?.color || v2Element?.typography?.default?.color || '#0f172a'
    : legacyItem?.integer_style?.text_color || '#000000';

  const currentFontSizePt = isV2Price
    ? v2Element?.typography?.slots?.integer?.sizePt || 28
    : legacyItem?.integer_style?.font_size_pt || 28;

  const currentPreset: PricePreset = isV2Price ? v2Element?.preset || 'simple' : 'simple';

  const handlePresetChange = (preset: PricePreset) => {
    if (isV2Price && v2Element) {
      const switched = pricingEngine.switchPreset(v2Element, preset);
      onUpdate(switched as any);
    } else {
      // Convert legacy price_block into V2 PriceElement or configure promo
      if (preset === 'promotion') {
        onUpdate({
          binding_key: 'PROMOPRICE',
          promo_badge_type: 'discount_pct',
        } as any);
      } else {
        onUpdate({
          binding_key: 'SELLING_PRICE',
          promo_badge_type: undefined,
        } as any);
      }
    }
  };

  const applyRetailProfile = (profile: 'EUR' | 'USD' | 'FCFA' | 'GBP' | 'CAD' | 'CHF') => {
    if (isV2Price && v2Element) {
      const updatedFormatting = { ...(v2Element.formatting || {}) };
      const updatedDisplay = { ...(v2Element.display || { mode: 'single', slots: [], currencyPosition: 'after', currencySpacing: true }) };
      const updatedTypography = { ...(v2Element.typography || {}) };

      let sym = '€';
      let pos: 'after' | 'before' | 'superscript' = 'after';
      let decSep: '.' | ',' = ',';

      switch (profile) {
        case 'EUR':
          sym = '€';
          pos = 'after';
          decSep = ',';
          break;
        case 'USD':
          sym = '$';
          pos = 'before';
          decSep = '.';
          break;
        case 'FCFA':
          sym = 'FCFA';
          pos = 'after';
          decSep = ',';
          break;
        case 'GBP':
          sym = '£';
          pos = 'before';
          decSep = '.';
          break;
        case 'CAD':
          sym = '$';
          pos = 'after';
          decSep = ',';
          break;
        case 'CHF':
          sym = 'CHF';
          pos = 'after';
          decSep = '.';
          break;
      }

      updatedFormatting.decimalSeparator = decSep;
      updatedDisplay.currencyPosition = pos;

      onUpdate({
        formatting: updatedFormatting,
        display: updatedDisplay,
        bindings: { ...(v2Element.bindings || {}), currency: sym },
      } as any);
    } else if (legacyItem) {
      switch (profile) {
        case 'EUR':
          onUpdate({
            currency_symbol: '€',
            currency_position: 'after',
            decimal_separator: ',',
            decimal_style: {
              font_size_pt: Math.round((legacyItem.integer_style?.font_size_pt || 28) * 0.52),
              font_weight: 'bold',
              text_color: legacyItem.integer_style?.text_color || '#000000',
              baseline_shift: 'superscript',
            },
          });
          break;
        case 'USD':
          onUpdate({
            currency_symbol: '$',
            currency_position: 'before',
            decimal_separator: '.',
            decimal_style: {
              font_size_pt: Math.round((legacyItem.integer_style?.font_size_pt || 28) * 0.55),
              font_weight: 'bold',
              text_color: legacyItem.integer_style?.text_color || '#000000',
              baseline_shift: 'superscript',
            },
          });
          break;
        case 'FCFA':
          onUpdate({
            currency_symbol: 'FCFA',
            currency_position: 'after',
            decimal_separator: ',',
            fallback_price: 2500,
            decimal_style: {
              font_size_pt: Math.round((legacyItem.integer_style?.font_size_pt || 28) * 0.45),
              font_weight: 'bold',
              text_color: legacyItem.integer_style?.text_color || '#000000',
              baseline_shift: 'normal',
            },
          });
          break;
        case 'GBP':
          onUpdate({
            currency_symbol: '£',
            currency_position: 'before',
            decimal_separator: '.',
            decimal_style: {
              font_size_pt: Math.round((legacyItem.integer_style?.font_size_pt || 28) * 0.52),
              font_weight: 'bold',
              text_color: legacyItem.integer_style?.text_color || '#000000',
              baseline_shift: 'superscript',
            },
          });
          break;
        case 'CAD':
          onUpdate({
            currency_symbol: '$',
            currency_position: 'after',
            decimal_separator: ',',
            decimal_style: {
              font_size_pt: Math.round((legacyItem.integer_style?.font_size_pt || 28) * 0.52),
              font_weight: 'bold',
              text_color: legacyItem.integer_style?.text_color || '#000000',
              baseline_shift: 'superscript',
            },
          });
          break;
        case 'CHF':
          onUpdate({
            currency_symbol: 'CHF',
            currency_position: 'after',
            decimal_separator: '.',
            decimal_style: {
              font_size_pt: Math.round((legacyItem.integer_style?.font_size_pt || 28) * 0.52),
              font_weight: 'bold',
              text_color: legacyItem.integer_style?.text_color || '#000000',
              baseline_shift: 'superscript',
            },
          });
          break;
      }
    }
  };

  return (
    <div className="pt-2 border-t border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isV2Price ? 'Élément Prix Composable V2' : 'Bloc Prix & Centimes Flottants'}</span>
        </h4>
        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">
          {isV2Price ? 'V2 Model' : 'Classic'}
        </span>
      </div>

      {/* 1. Presets Composables UX (Section 47) */}
      <div>
        <label className="text-[11px] text-slate-500 flex items-center gap-1 mb-1 font-semibold">
          <Layers className="w-3 h-3 text-indigo-500" />
          <span>Modèle Tarifaire Composable (Preset)</span>
        </label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'simple', label: 'Prix Simple' },
            { id: 'promotion', label: 'Promotion' },
            { id: 'unit_price', label: 'Prix au kg/L' },
            { id: 'wholesale_tiers', label: 'Paliers Gros' },
            { id: 'member', label: 'Prix Club' },
            { id: 'bundle', label: 'Lot / Bundle' },
            { id: 'variable_measure', label: 'Poids Var.' },
            { id: 'range', label: 'Fourchette' },
            { id: 'quote', label: 'Sur Devis' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetChange(preset.id as PricePreset)}
              className={`px-1.5 py-1 text-[10px] font-medium rounded border transition text-center truncate cursor-pointer ${
                currentPreset === preset.id
                  ? 'bg-indigo-600 text-white border-indigo-700 font-bold shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 border-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Profils Marchés / Devises Prédéfinis */}
      <div>
        <label className="text-[11px] text-slate-500 flex items-center gap-1 mb-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Profils Monétaires</span>
        </label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'EUR', label: 'Euro (€)' },
            { id: 'USD', label: 'USD ($)' },
            { id: 'FCFA', label: 'FCFA' },
            { id: 'GBP', label: 'Livre (£)' },
            { id: 'CAD', label: 'CAD ($)' },
            { id: 'CHF', label: 'Suisse' },
          ].map((prof) => (
            <button
              key={prof.id}
              type="button"
              onClick={() => applyRetailProfile(prof.id as any)}
              className="px-1.5 py-1 text-[10px] font-medium bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 rounded transition text-center truncate cursor-pointer"
            >
              {prof.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Séparateur Décimal & Fallback */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-500">Séparateur Décimal</label>
          <select
            value={
              isV2Price
                ? v2Element?.formatting?.decimalSeparator || ','
                : legacyItem?.decimal_separator || ','
            }
            onChange={(e) => {
              const val = e.target.value as '.' | ',';
              if (isV2Price && v2Element) {
                onUpdate({
                  formatting: { ...(v2Element.formatting || {}), decimalSeparator: val },
                } as any);
              } else {
                onUpdate({ decimal_separator: val });
              }
            }}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
          >
            <option value=",">Virgule (ex: 29,99)</option>
            <option value=".">Point (ex: 29.99)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-slate-500">Position Devise</label>
          <select
            value={
              isV2Price
                ? v2Element?.display?.currencyPosition || 'after'
                : legacyItem?.currency_position || 'after'
            }
            onChange={(e) => {
              const val = e.target.value as any;
              if (isV2Price && v2Element) {
                onUpdate({
                  display: { ...(v2Element.display || {}), currencyPosition: val },
                } as any);
              } else {
                onUpdate({ currency_position: val });
              }
            }}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
          >
            <option value="after">Après le prix (2 500 FCFA)</option>
            <option value="before">Avant le prix ($ 29.99)</option>
            <option value="superscript">Exposant haut (€^)</option>
          </select>
        </div>
      </div>

      {/* 4. Couleur du Prix */}
      <div>
        <label className="text-[11px] text-slate-500">Couleur du Prix</label>
        <div className="flex items-center gap-1.5 mt-0.5">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => {
              const col = e.target.value;
              if (isV2Price && v2Element) {
                const slots = { ...(v2Element.typography?.slots || {}) };
                if (slots.integer) slots.integer = { ...slots.integer, color: col };
                if (slots.decimalSeparator) slots.decimalSeparator = { ...slots.decimalSeparator, color: col };
                if (slots.fraction) slots.fraction = { ...slots.fraction, color: col };
                if (slots.currency) slots.currency = { ...slots.currency, color: col };
                onUpdate({
                  typography: { ...(v2Element.typography || {}), slots },
                } as any);
              } else if (legacyItem) {
                onUpdate({
                  integer_style: { ...(legacyItem.integer_style || {}), text_color: col },
                  decimal_style: { ...(legacyItem.decimal_style || {}), text_color: col },
                  currency_style: { ...(legacyItem.currency_style || {}), text_color: col },
                });
              }
            }}
            className="w-7 h-6 p-0 rounded border border-slate-300 cursor-pointer"
          />
          <input
            type="text"
            value={currentColor}
            onChange={(e) => {
              const col = e.target.value;
              if (isV2Price && v2Element) {
                const slots = { ...(v2Element.typography?.slots || {}) };
                if (slots.integer) slots.integer = { ...slots.integer, color: col };
                onUpdate({ typography: { ...(v2Element.typography || {}), slots } } as any);
              } else if (legacyItem) {
                onUpdate({
                  integer_style: { ...(legacyItem.integer_style || {}), text_color: col },
                });
              }
            }}
            className="flex-1 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono uppercase"
          />
        </div>
      </div>

      {/* 5. WCAG Contrast Advisor */}
      <ContrastAdvisorWidget
        textColor={currentColor}
        bgColor="#ffffff"
        fontSizePt={currentFontSizePt}
        isBold={true}
        onApplyRecommended={(recColor) => {
          if (isV2Price && v2Element) {
            const slots = { ...(v2Element.typography?.slots || {}) };
            if (slots.integer) slots.integer = { ...slots.integer, color: recColor };
            if (slots.decimalSeparator) slots.decimalSeparator = { ...slots.decimalSeparator, color: recColor };
            if (slots.fraction) slots.fraction = { ...slots.fraction, color: recColor };
            if (slots.currency) slots.currency = { ...slots.currency, color: recColor };
            onUpdate({ typography: { ...(v2Element.typography || {}), slots } } as any);
          } else if (legacyItem) {
            onUpdate({
              integer_style: { ...(legacyItem.integer_style || {}), text_color: recColor },
              decimal_style: { ...(legacyItem.decimal_style || {}), text_color: recColor },
              currency_style: { ...(legacyItem.currency_style || {}), text_color: recColor },
            });
          }
        }}
      />

      {/* 6. Typographie par Slot (Partie Entière) */}
      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
        <span className="text-[11px] font-bold text-slate-700 block flex items-center justify-between">
          <span>Partie Entière (Chiffres Principaux)</span>
          <span className="text-[10px] text-slate-400 font-mono">Slot: Integer</span>
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500">Taille (pt)</label>
            <input
              type="number"
              step="1"
              min="8"
              max="144"
              value={currentFontSizePt}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 28;
                if (isV2Price && v2Element) {
                  const slots = { ...(v2Element.typography?.slots || {}) };
                  if (slots.integer) slots.integer = { ...slots.integer, sizePt: val };
                  onUpdate({ typography: { ...(v2Element.typography || {}), slots } } as any);
                } else if (legacyItem) {
                  onUpdate({
                    integer_style: { ...(legacyItem.integer_style || {}), font_size_pt: val },
                  });
                }
              }}
              className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Police</label>
            <select
              value={
                isV2Price
                  ? v2Element?.typography?.slots?.integer?.font?.family || 'Oswald'
                  : legacyItem?.font_family || 'Plus Jakarta Sans'
              }
              onChange={(e) => {
                const family = e.target.value;
                if (isV2Price && v2Element) {
                  const slots = { ...(v2Element.typography?.slots || {}) };
                  const fontRef = {
                    fontId: `font-${family.toLowerCase().replace(/\s+/g, '-')}`,
                    family,
                    weight: 700,
                    style: 'normal' as const,
                    source: 'application' as const,
                    fallbackFamilies: ['sans-serif'],
                  };
                  if (slots.integer) slots.integer = { ...slots.integer, font: fontRef };
                  onUpdate({ typography: { ...(v2Element.typography || {}), slots } } as any);
                } else if (legacyItem) {
                  onUpdate({ font_family: family });
                }
              }}
              className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer font-medium"
            >
              <option value="Oswald">Oswald (Chiffres impact)</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="Inter">Inter (Épuré)</option>
              <option value="Roboto">Roboto</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

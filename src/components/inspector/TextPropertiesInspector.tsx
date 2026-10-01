import React from 'react';
import {
  TemplateItem,
  CurvedTextItemProperties,
} from '../../types';
import {
  AVAILABLE_FONTS,
  FONT_WEIGHTS,
  TEXT_TRANSFORMS,
  VERTICAL_ALIGNMENTS,
  CURRENCY_SYMBOLS,
  FONT_SIZE_PRESETS,
} from '../../models/TemplateObjectModel';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  RotateCcw,
  Sun,
  Highlighter,
  DollarSign,
  Calculator,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  CircleDot,
} from 'lucide-react';
import { ContrastAdvisorWidget } from './ContrastAdvisorWidget';

export interface TextPropertiesInspectorProps {
  selectedItem: TemplateItem;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

export const TextPropertiesInspector: React.FC<TextPropertiesInspectorProps> = ({
  selectedItem,
  onUpdate,
}) => {
  if (
    selectedItem.type !== 'text' &&
    selectedItem.type !== 'tier_price' &&
    selectedItem.type !== 'curved_text'
  ) {
    return null;
  }

  const item = selectedItem as any;

  return (
    <div className="pt-2 border-t border-slate-200 space-y-3">
      <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
        <Type className="w-3.5 h-3.5" />
        <span>Typographie & Texte</span>
      </h4>

      {item.type === 'text' && (
        <div>
          <label className="text-[11px] text-slate-500">Texte / Valeur par défaut</label>
          <textarea
            rows={2}
            value={item.text ?? ''}
            onChange={(e) => onUpdate({ text: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      )}

      {/* Curved Text specific settings */}
      {item.type === 'curved_text' && (
        <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px]">
            <CircleDot className="w-3.5 h-3.5 text-blue-600" />
            <span>Paramètres Texte Circulaire</span>
          </div>
          <div>
            <label className="text-[11px] text-slate-600">Texte</label>
            <input
              type="text"
              value={(item as CurvedTextItemProperties).text || ''}
              onChange={(e) => onUpdate({ text: e.target.value })}
              className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-600">Angle de Départ (°)</label>
              <input
                type="number"
                step="5"
                value={(item as CurvedTextItemProperties).start_angle_deg ?? 180}
                onChange={(e) => onUpdate({ start_angle_deg: parseFloat(e.target.value) || 0 })}
                className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-600">Angle de Balayage (°)</label>
              <input
                type="number"
                step="5"
                min="10"
                max="360"
                value={(item as CurvedTextItemProperties).sweep_angle_deg ?? 180}
                onChange={(e) => onUpdate({ sweep_angle_deg: parseFloat(e.target.value) || 180 })}
                className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Prefix & Suffix */}
      {item.type === 'text' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-slate-500">Préfixe</label>
            <input
              type="text"
              placeholder="ex: Réf: "
              value={item.prefix_text || ''}
              onChange={(e) => onUpdate({ prefix_text: e.target.value })}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Suffixe</label>
            <input
              type="text"
              placeholder="ex: TTC"
              value={item.suffix_text || ''}
              onChange={(e) => onUpdate({ suffix_text: e.target.value })}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
            />
          </div>
        </div>
      )}

      {/* Quick Size Presets & Size Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-slate-500 font-medium">Taille de Police (pt)</label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                onUpdate({
                  font_size_pt: 10,
                  font_weight: 'normal',
                  font_style: 'normal',
                  text_decoration: 'none',
                  letter_spacing_pt: 0,
                  line_height_multiplier: 1.25,
                  highlight_color: undefined,
                  text_shadow: undefined,
                  subscript_superscript: 'none',
                  text_transform: 'none',
                });
              }}
              title="Effacer le formatage et réinitialiser la typographie"
              className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            step="0.5"
            min="4"
            max="120"
            value={item.font_size_pt ?? 10}
            onChange={(e) => onUpdate({ font_size_pt: parseFloat(e.target.value) || 10 })}
            className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono font-bold"
          />
          <div className="flex-1 flex items-center gap-1 overflow-x-auto pb-0.5">
            {FONT_SIZE_PRESETS.slice(0, 7).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onUpdate({ font_size_pt: size })}
                className={`px-1.5 py-0.5 text-[10px] rounded border transition cursor-pointer ${
                  item.font_size_pt === size
                    ? 'bg-blue-600 border-blue-600 text-white font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-500">Police de Caractères</label>
          <select
            value={item.font_family || 'Arial'}
            onChange={(e) => onUpdate({ font_family: e.target.value })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
          >
            {AVAILABLE_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Graisse (Font Weight)</label>
          <select
            value={item.font_weight || 'normal'}
            onChange={(e) => onUpdate({ font_weight: e.target.value as any })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
          >
            {FONT_WEIGHTS.map((fw) => (
              <option key={fw.value} value={fw.value}>
                {fw.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Styles, Sub/Superscript & Décorations */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-slate-500">Style, Décoration & Indice</label>
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            onClick={() => onUpdate({ font_style: item.font_style === 'italic' ? 'normal' : 'italic' })}
            className={`py-1 text-center font-serif italic text-xs rounded border cursor-pointer ${
              item.font_style === 'italic'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                : 'border-slate-200 bg-white'
            }`}
            title="Italique"
          >
            I
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdate({ text_decoration: item.text_decoration === 'underline' ? 'none' : 'underline' })
            }
            className={`py-1 text-center underline text-xs rounded border cursor-pointer ${
              item.text_decoration === 'underline'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                : 'border-slate-200 bg-white'
            }`}
            title="Souligné"
          >
            U
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdate({ text_decoration: item.text_decoration === 'line-through' ? 'none' : 'line-through' })
            }
            className={`py-1 text-center line-through text-xs rounded border cursor-pointer ${
              item.text_decoration === 'line-through'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                : 'border-slate-200 bg-white'
            }`}
            title="Barré"
          >
            S
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdate({
                subscript_superscript:
                  item.subscript_superscript === 'subscript' ? 'none' : 'subscript',
              })
            }
            className={`py-1 flex items-center justify-center text-xs rounded border cursor-pointer ${
              item.subscript_superscript === 'subscript'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
            title="Indice (Subscript)"
          >
            <SubscriptIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdate({
                subscript_superscript:
                  item.subscript_superscript === 'superscript' ? 'none' : 'superscript',
              })
            }
            className={`py-1 flex items-center justify-center text-xs rounded border cursor-pointer ${
              item.subscript_superscript === 'superscript'
                ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
            title="Exposant (Superscript)"
          >
            <SuperscriptIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Surlignage (Highlight) & Couleur de Texte */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-500 flex items-center gap-1">
            <Highlighter className="w-3 h-3 text-amber-500" />
            <span>Surlignage</span>
          </label>
          <div className="flex items-center gap-1 mt-0.5">
            <input
              type="color"
              value={item.highlight_color || '#fef08a'}
              onChange={(e) => onUpdate({ highlight_color: e.target.value })}
              className="w-7 h-6 p-0 rounded border border-slate-300 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onUpdate({ highlight_color: undefined })}
              className={`px-1.5 py-1 text-[10px] rounded border cursor-pointer ${
                !item.highlight_color
                  ? 'bg-slate-200 text-slate-800 font-bold'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Aucun
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-500">Couleur Texte</label>
          <div className="flex items-center gap-1 mt-0.5">
            <input
              type="color"
              value={item.text_color || '#000000'}
              onChange={(e) => onUpdate({ text_color: e.target.value })}
              className="w-7 h-6 p-0 rounded border border-slate-300 cursor-pointer"
            />
            <input
              type="text"
              value={item.text_color || '#000000'}
              onChange={(e) => onUpdate({ text_color: e.target.value })}
              className="flex-1 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-xs font-mono uppercase"
            />
          </div>
        </div>
      </div>

      {/* WCAG Color Contrast & Legibility Advisor */}
      <ContrastAdvisorWidget
        textColor={item.text_color || '#000000'}
        bgColor={item.fill_color || '#ffffff'}
        fontSizePt={item.font_size_pt || 11}
        isBold={item.font_weight === 'bold' || item.font_weight === '800'}
        onApplyRecommended={(recColor) => onUpdate({ text_color: recColor })}
      />

      {/* Ombre Portée (Text Shadow) */}
      <div className="space-y-1.5 p-2 bg-slate-50 rounded border border-slate-200">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
            <Sun className="w-3 h-3 text-slate-500" />
            <span>Ombre du Texte (Shadow)</span>
          </label>
          <input
            type="checkbox"
            checked={Boolean(item.text_shadow && item.text_shadow.enabled)}
            onChange={(e) => {
              const enabled = e.target.checked;
              onUpdate({
                text_shadow: {
                  enabled,
                  offset_x_px: item.text_shadow?.offset_x_px ?? 1,
                  offset_y_px: item.text_shadow?.offset_y_px ?? 1,
                  blur_px: item.text_shadow?.blur_px ?? 2,
                  color: item.text_shadow?.color ?? 'rgba(0,0,0,0.4)',
                },
              });
            }}
            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        {item.text_shadow && item.text_shadow.enabled && (
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <div>
              <label className="text-[9px] text-slate-400">X (px)</label>
              <input
                type="number"
                step="0.5"
                value={item.text_shadow?.offset_x_px ?? 0}
                onChange={(e) =>
                  onUpdate({
                    text_shadow: {
                      ...item.text_shadow!,
                      offset_x_px: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400">Y (px)</label>
              <input
                type="number"
                step="0.5"
                value={item.text_shadow?.offset_y_px ?? 0}
                onChange={(e) =>
                  onUpdate({
                    text_shadow: {
                      ...item.text_shadow!,
                      offset_y_px: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400">Flou (px)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={item.text_shadow?.blur_px ?? 0}
                onChange={(e) =>
                  onUpdate({
                    text_shadow: {
                      ...item.text_shadow!,
                      blur_px: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                className="w-full px-1 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400">Couleur</label>
              <input
                type="color"
                value={item.text_shadow?.color || '#000000'}
                onChange={(e) =>
                  onUpdate({
                    text_shadow: {
                      ...item.text_shadow!,
                      color: e.target.value,
                    },
                  })
                }
                className="w-full h-6 p-0 rounded border border-slate-300 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Transformations & Spacing */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-500">Casse / Transform</label>
          <select
            value={item.text_transform || 'none'}
            onChange={(e) => onUpdate({ text_transform: e.target.value as any })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
          >
            {TEXT_TRANSFORMS.map((tt) => (
              <option key={tt.value} value={tt.value}>
                {tt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Interlettrage (pt)</label>
          <input
            type="number"
            step="0.2"
            min="-2"
            max="10"
            value={item.letter_spacing_pt || 0}
            onChange={(e) => onUpdate({ letter_spacing_pt: parseFloat(e.target.value) || 0 })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-500">Interligne (Line Height)</label>
          <input
            type="number"
            step="0.1"
            min="0.8"
            max="3"
            value={item.line_height_multiplier || 1.2}
            onChange={(e) => onUpdate({ line_height_multiplier: parseFloat(e.target.value) || 1.2 })}
            className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Alignement H</label>
          <div className="flex items-center gap-1 mt-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
            <button
              type="button"
              onClick={() => onUpdate({ alignment: 'left' })}
              className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${
                item.alignment === 'left' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
              }`}
              title="Gauche"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ alignment: 'center' })}
              className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${
                item.alignment === 'center' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
              }`}
              title="Centré"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ alignment: 'right' })}
              className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${
                item.alignment === 'right' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
              }`}
              title="Droite"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ alignment: 'justify' })}
              className={`flex-1 py-1 flex justify-center rounded cursor-pointer ${
                item.alignment === 'justify' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
              }`}
              title="Justifié"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-500">Alignement V</label>
          <select
            value={item.valign || 'top'}
            onChange={(e) => onUpdate({ valign: e.target.value as any })}
            className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
          >
            {VERTICAL_ALIGNMENTS.map((va) => (
              <option key={va.value} value={va.value}>
                {va.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-slate-500">Fond de bloc</label>
          <div className="flex items-center gap-1 mt-0.5">
            <input
              type="color"
              value={item.fill_color || '#ffffff'}
              onChange={(e) => onUpdate({ fill_color: e.target.value })}
              className="w-8 h-7 p-0 rounded border border-slate-300 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onUpdate({ fill_color: undefined })}
              className="text-[10px] text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer"
            >
              Transparent
            </button>
          </div>
        </div>
      </div>

      {/* Attached Currency & Price Section */}
      {item.type === 'text' && (
        <div className="pt-3 border-t border-dashed border-slate-300 space-y-2.5 bg-slate-50/60 p-2.5 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-bold text-slate-800 text-xs">Devise Associée & Prix</span>
            </div>
            <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={Boolean(
                  item.is_price ||
                    item.currency_symbol ||
                    item.binding_key === 'SELLING_PRICE' ||
                    item.binding_key === 'PROMOPRICE' ||
                    (item.binding_key && item.binding_key.toLowerCase().includes('price'))
                )}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onUpdate({
                    is_price: checked,
                    currency_symbol: checked ? item.currency_symbol || 'FCFA' : undefined,
                  });
                }}
                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Activer Devise</span>
            </label>
          </div>

          {(item.is_price ||
            item.currency_symbol ||
            item.binding_key?.toLowerCase().includes('price')) && (
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Symbole Devise</label>
                  <select
                    value={item.currency_symbol || 'FCFA'}
                    onChange={(e) => onUpdate({ currency_symbol: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-emerald-800 cursor-pointer"
                  >
                    {CURRENCY_SYMBOLS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 font-medium">Position Devise</label>
                  <select
                    value={item.currency_position || 'after'}
                    onChange={(e) => onUpdate({ currency_position: e.target.value as any })}
                    className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer"
                  >
                    <option value="after">Après le prix (ex: 2 500 FCFA)</option>
                    <option value="before">Avant le prix (ex: $ 25.00)</option>
                    <option value="superscript">Exposant / Haut (ex: 2500 ᶠᶜᶠᵃ)</option>
                    <option value="subscript">Indice / Bas (ex: 2500 ₍FCFA₎)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500">Police Devise</label>
                  <select
                    value={item.currency_font_family || item.font_family}
                    onChange={(e) => onUpdate({ currency_font_family: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer"
                  >
                    <option value="">(Identique au prix)</option>
                    {AVAILABLE_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500">Taille Devise (pt)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="4"
                    max="80"
                    placeholder={String(Math.round((item.font_size_pt || 10) * 0.6))}
                    value={item.currency_font_size_pt || ''}
                    onChange={(e) =>
                      onUpdate({ currency_font_size_pt: parseFloat(e.target.value) || undefined })
                    }
                    className="w-full mt-0.5 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Retail Automation & Calculations */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <h5 className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
              <Calculator className="w-3 h-3 text-sky-600" />
              <span>Calculateur Métier</span>
            </h5>
            <div>
              <select
                value={item.calculation_mode || 'none'}
                onChange={(e) => onUpdate({ calculation_mode: e.target.value as any })}
                className="w-full mt-0.5 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
              >
                <option value="none">Aucun (Texte ou Prix standard)</option>
                <option value="unit_price">Calcul Automatique Prix au Kg / Litre</option>
                <option value="discount_pct">Calcul Automatique Taux de Remise (%)</option>
                <option value="secondary_currency">Double Affichage & Conversion Devise</option>
                <option value="dynamic_date">Calculateur de Dates Dynamiques (DLC / DLUO)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * E-Studio Pricing Element Inspector
 * Panneau d'inspection et de configuration approfondie des éléments tarifaires.
 * Permet de régler individuellement chaque slot typographique (entier, centimes, devise, unité),
 * le formatage numérique (séparateurs d'espaces insécables, groupement) et les calculs de promo/unitaires.
 */

import React, { useState } from 'react';
import {
  PricingElementType,
  PriceBlockElementPayload,
  PromoPriceElementPayload,
  UnitPriceElementPayload,
} from '../domain/pricing/types';
import { PriceElementRenderer } from './PriceElementRenderer';
import { fontRegistry } from '../domain/elements/v2/fontRegistry';
import { ProductRecord } from '../types';
import {
  DollarSign,
  Type,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  Calculator,
  RotateCcw,
} from 'lucide-react';

interface PricingElementInspectorProps {
  elementType: PricingElementType;
  payload: any;
  onChange: (updatedPayload: any) => void;
  sampleProduct?: ProductRecord;
}

export const PricingElementInspector: React.FC<PricingElementInspectorProps> = ({
  elementType,
  payload,
  onChange,
  sampleProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'slots' | 'format' | 'promo' | 'preview'>('slots');
  const availableFonts = fontRegistry.getAllFonts();

  const mockProduct: ProductRecord = sampleProduct || {
    id: 'DEMO-1',
    STORE_NAME: 'Supermarché Démo',
    PRODUCT_SCAN: '3012345678901',
    ITEMNAME: 'Lait Nido Croissance 400g',
    SELLING_PRICE: 2500,
    PROMOPRICE: 2200,
    CURRENCY: 'FCFA',
    UNIT_WEIGHT_VALUE: 400,
    UNIT_WEIGHT_UNIT: 'g',
    PACK_UNIT: 'boîte',
  };

  const updateNestedProperty = (path: string[], value: any) => {
    const updated = JSON.parse(JSON.stringify(payload));
    let current = updated;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    onChange(updated);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-slate-100 flex flex-col max-w-2xl w-full shadow-2xl">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Inspecteur Tarifaire Avancé
            </h3>
            <p className="text-[11px] text-slate-400 font-medium capitalize">
              Élément : {elementType.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('slots')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              activeTab === 'slots' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Slots Typo
          </button>
          <button
            onClick={() => setActiveTab('format')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              activeTab === 'format' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Format Chiffres
          </button>
          {elementType === 'promo_price' && (
            <button
              onClick={() => setActiveTab('promo')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'promo' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Promo & Barré
            </button>
          )}
        </div>
      </div>

      {/* Live Visual Canvas Preview */}
      <div className="p-6 bg-slate-950/60 border-b border-slate-800 flex flex-col items-center justify-center min-h-[100px] relative">
        <div className="text-[10px] uppercase font-bold text-slate-500 absolute top-2 left-3">
          Aperçu Typographique Temps Réel
        </div>
        <div className="bg-white text-slate-900 p-4 rounded-xl shadow-lg border border-slate-200">
          <PriceElementRenderer type={elementType} payload={payload} product={mockProduct} />
        </div>
      </div>

      {/* Tab Contents */}
      <div className="p-5 overflow-y-auto max-h-[380px] space-y-4 text-xs">
        {activeTab === 'slots' && (
          <div className="space-y-4">
            {/* Slot 1: Integer */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" /> Slot Entier (Integer)
                </span>
                <span className="text-[10px] text-slate-500">Chiffres principaux</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Police</label>
                  <select
                    value={payload.typography?.integer?.font?.family || 'Oswald'}
                    onChange={(e) =>
                      updateNestedProperty(['typography', 'integer', 'font', 'family'], e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    {availableFonts.map((f) => (
                      <option key={f.id} value={f.family}>
                        {f.family}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Taille (pt)</label>
                  <input
                    type="number"
                    value={payload.typography?.integer?.sizePt || 36}
                    onChange={(e) =>
                      updateNestedProperty(['typography', 'integer', 'sizePt'], Number(e.target.value))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Graisse (Weight)</label>
                  <select
                    value={payload.typography?.integer?.weight || '700'}
                    onChange={(e) =>
                      updateNestedProperty(['typography', 'integer', 'weight'], e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="400">Regular (400)</option>
                    <option value="600">Semi-Bold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">Extra-Bold (800)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Slot 2: Decimals / Fraction */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Slot Centimes (Fraction)
                </span>
                <span className="text-[10px] text-slate-500">Centimes & Exposant</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Taille (pt)</label>
                  <input
                    type="number"
                    value={payload.typography?.fraction?.sizePt || 20}
                    onChange={(e) =>
                      updateNestedProperty(['typography', 'fraction', 'sizePt'], Number(e.target.value))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Décalage Base (pt)</label>
                  <input
                    type="number"
                    value={payload.typography?.fraction?.baselineShiftPt || 10}
                    onChange={(e) =>
                      updateNestedProperty(['typography', 'fraction', 'baselineShiftPt'], Number(e.target.value))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Afficher si ,00</label>
                  <input
                    type="checkbox"
                    checked={Boolean(payload.display?.showDecimalIfZero)}
                    onChange={(e) =>
                      updateNestedProperty(['display', 'showDecimalIfZero'], e.target.checked)
                    }
                    className="mt-2 w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Slot 3: Currency */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Devise & Position
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Symbole</label>
                  <input
                    type="text"
                    value={payload.currency?.symbol || 'FCFA'}
                    onChange={(e) =>
                      updateNestedProperty(['currency', 'symbol'], e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Position</label>
                  <select
                    value={payload.currency?.position || 'after'}
                    onChange={(e) =>
                      updateNestedProperty(['currency', 'position'], e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="after">Après (2 500 FCFA)</option>
                    <option value="before">Avant (FCFA 2 500)</option>
                    <option value="superscript">Exposant (2 500^FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Taille Devise (pt)</label>
                  <input
                    type="number"
                    value={payload.typography?.currency?.sizePt || 14}
                    onChange={(e) =>
                      updateNestedProperty(['typography', 'currency', 'sizePt'], Number(e.target.value))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'format' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-xs">Séparateurs & Groupements</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Séparateur de Milliers</label>
                  <select
                    value={payload.format?.thousandsSeparator || 'space'}
                    onChange={(e) =>
                      updateNestedProperty(['format', 'thousandsSeparator'], e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="space">Espace standard (1 000)</option>
                    <option value="nbsp">Espace insécable NBSP (1&nbsp;000)</option>
                    <option value="nnbsp">Espace fine insécable NNBSP</option>
                    <option value="none">Aucun (1000)</option>
                    <option value=",">Virgule (1,000)</option>
                    <option value=".">Point (1.000)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Séparateur Décimal</label>
                  <select
                    value={payload.format?.decimalSeparator || ','}
                    onChange={(e) =>
                      updateNestedProperty(['format', 'decimalSeparator'], e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value=",">Virgule (2500,00)</option>
                    <option value=".">Point (2500.00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Mode d'Arrondi</label>
                  <select
                    value={payload.format?.roundingMode || 'half_up'}
                    onChange={(e) =>
                      updateNestedProperty(['format', 'roundingMode'], e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="half_up">Standard Demi-Supérieur (Half-Up)</option>
                    <option value="half_even">Bancaire (Half-Even)</option>
                    <option value="ceil">Plafond (Ceil)</option>
                    <option value="floor">Plancher (Floor)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Affichage du Zéro</label>
                  <select
                    value={payload.format?.zeroDisplay || 'zero'}
                    onChange={(e) =>
                      updateNestedProperty(['format', 'zeroDisplay'], e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="zero">Afficher 0 FCFA</option>
                    <option value="dash">Tiret cadratin (— FCFA)</option>
                    <option value="empty">Masqué (Vide)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'promo' && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-rose-400 text-xs">Configuration du Prix Barré</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Style de Barre</label>
                  <select
                    value={payload.regularPriceStyle?.strikethrough?.type || 'diagonal'}
                    onChange={(e) =>
                      updateNestedProperty(['regularPriceStyle', 'strikethrough', 'type'], e.target.value)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  >
                    <option value="diagonal">Diagonale (Recommandé)</option>
                    <option value="horizontal">Horizontale stricte</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Épaisseur (pt)</label>
                  <input
                    type="number"
                    value={payload.regularPriceStyle?.strikethrough?.thicknessPt || 2}
                    onChange={(e) =>
                      updateNestedProperty(['regularPriceStyle', 'strikethrough', 'thicknessPt'], Number(e.target.value))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

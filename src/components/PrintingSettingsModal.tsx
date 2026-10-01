import React, { useState, useId } from 'react';
import {
  X,
  Settings,
  Globe,
  Sliders,
  Printer,
  Grid,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { printingSettingsService } from '../domain/printing/printingSettingsService';
import { printerRepository } from '../domain/printing/printerRepository';
import { formatRepository } from '../domain/printing/formatRepository';
import { useToast } from './ToastNotification';

interface PrintingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrintingSettingsModal: React.FC<PrintingSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const settingsTitleId = useId();
  const toast = useToast();
  const currentSettings = printingSettingsService.getSettings();

  const [measurementUnit, setMeasurementUnit] = useState<'mm' | 'in'>(currentSettings.measurementUnit);
  const [showDualUnits, setShowDualUnits] = useState<boolean>(currentSettings.showDualUnits);
  const [currencySymbol, setCurrencySymbol] = useState(currentSettings.currency.symbol);
  const [currencyPosition, setCurrencyPosition] = useState<'prefix' | 'suffix'>(currentSettings.currency.position);
  const [decimalSeparator, setDecimalSeparator] = useState<'.' | ','>(currentSettings.currency.decimalSeparator);
  const [thousandsSeparator, setThousandsSeparator] = useState<' ' | ',' | '.'>(currentSettings.currency.thousandsSeparator);
  const [defaultCopies, setDefaultCopies] = useState<number>(currentSettings.defaultCopies);
  const [batchThreshold, setBatchThreshold] = useState<number>(currentSettings.batchConfirmationThreshold);

  const [defaultPrinterId, setDefaultPrinterId] = useState(currentSettings.defaultPrinterId || '');
  const [defaultFormatId, setDefaultFormatId] = useState(currentSettings.defaultFormatId || '');

  const [showAdvanced, setShowAdvanced] = useState(false);

  const printers = printerRepository.getAll();
  const formats = formatRepository.getAll();

  if (!isOpen) return null;

  const handleSave = () => {
    printingSettingsService.updateSettings({
      measurementUnit,
      showDualUnits,
      currency: {
        ...currentSettings.currency,
        symbol: currencySymbol,
        position: currencyPosition,
        decimalSeparator,
        thousandsSeparator,
      },
      defaultCopies,
      batchConfirmationThreshold: batchThreshold,
      defaultPrinterId,
      defaultFormatId,
    });

    toast.success('Paramètres enregistrés', 'Vos préférences d\'impression sont appliquées.');
    onClose();
  };

  // Preview formatted price
  const sampleFormattedPrice = printingSettingsService.formatPrice(1249.99, {
    symbol: currencySymbol,
    position: currencyPosition,
    decimalSeparator,
    thousandsSeparator,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby={settingsTitleId}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 id={settingsTitleId} className="text-lg font-bold text-white">Paramètres d'Impression &amp; Internationalisation</h2>
              <p className="text-xs text-slate-400">Unités, devises, valeurs par défaut et moteur d'impression</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Section 1: Units and Dimensions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>Unités Physiques de Mesure</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Unité principale</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMeasurementUnit('mm')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                      measurementUnit === 'mm'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    Millimètres (mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeasurementUnit('in')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                      measurementUnit === 'in'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-slate-800 bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    Pouces (in)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Affichage double unité</label>
                <button
                  type="button"
                  onClick={() => setShowDualUnits(!showDualUnits)}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded-xl border transition flex items-center justify-between ${
                    showDualUnits
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <span>{showDualUnits ? 'Actif : 60 × 40 mm (2.36 × 1.57 in)' : 'Désactivé (unité simple)'}</span>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      showDualUnits ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-slate-600'
                    }`}
                  >
                    {showDualUnits && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Internationalization & Currency */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Formatage des Prix &amp; Monnaies (i18n)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Symbole monétaire</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="€, $, ₹, FCFA"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Position</label>
                <select
                  value={currencyPosition}
                  onChange={(e) => setCurrencyPosition(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="suffix">Suffixe (ex: 12.50 €)</option>
                  <option value="prefix">Préfixe (ex: $12.50 / ₹500)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Séparateur décimal</label>
                <select
                  value={decimalSeparator}
                  onChange={(e) => setDecimalSeparator(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value=",">Virgule (12,50)</option>
                  <option value=".">Point (12.50)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Séparateur milliers</label>
                <select
                  value={thousandsSeparator}
                  onChange={(e) => setThousandsSeparator(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value=" ">Espace (1 250,00)</option>
                  <option value=",">Virgule (1,250.00)</option>
                  <option value=".">Point (1.250,00)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Exemple de rendu sur étiquette :</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">{sampleFormattedPrice}</span>
            </div>
          </div>

          {/* Section 3: Defaults */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-2">
              <Printer className="w-4 h-4" />
              <span>Valeurs par Défaut</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Imprimante par défaut</label>
                <select
                  value={defaultPrinterId}
                  onChange={(e) => setDefaultPrinterId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="">Sélectionner une imprimante...</option>
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.selectedDpi} DPI)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Format par défaut</label>
                <select
                  value={defaultFormatId}
                  onChange={(e) => setDefaultFormatId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                >
                  <option value="">Sélectionner un format...</option>
                  {formats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.width}×{f.height} mm)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nombre d'exemplaires par article</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={defaultCopies}
                  onChange={(e) => setDefaultCopies(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Seuil de confirmation gros volume (nb étiquettes)
                </label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  value={batchThreshold}
                  onChange={(e) => setBatchThreshold(parseInt(e.target.value) || 500)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Advanced (collapsed by default, Part XV UX principle) */}
          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-semibold"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>Paramètres Avancés (Moteur de Rendu &amp; Protocoles)</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-3">
                <p className="text-slate-400">
                  Ces paramètres restent masqués du flux standard conformément aux principes UX d'E-Studio.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Mode de Rendu Préféré</label>
                    <select className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white">
                      <option value="auto">Automatique (Natif si vectoriel, Raster si logo)</option>
                      <option value="force_raster">Forcer Raster (Graphique 1-bit)</option>
                      <option value="force_native">Forcer Commandes Natives (ZPL/TSPL)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Contrôle de marge silencieuse</label>
                    <select className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white">
                      <option value="strict">Strict (Recommandation GS1 2.5 mm)</option>
                      <option value="warning">Avertissement non bloquant</option>
                      <option value="disabled">Désactivé</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md"
          >
            Enregistrer les préférences
          </button>
        </div>
      </div>
    </div>
  );
};

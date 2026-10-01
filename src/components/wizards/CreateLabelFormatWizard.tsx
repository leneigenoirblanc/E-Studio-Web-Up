import React, { useState, useId } from 'react';
import {
  X,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Grid,
  FileText,
  Sparkles,
} from 'lucide-react';
import { LabelFormat, FormatCategory, MediaType, LabelShape } from '../../domain/printing/types';
import { formatRepository } from '../../domain/printing/formatRepository';

interface CreateLabelFormatWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onFormatCreated: (newFormat: LabelFormat, createTemplateNow: boolean) => void;
}

export const CreateLabelFormatWizard: React.FC<CreateLabelFormatWizardProps> = ({
  isOpen,
  onClose,
  onFormatCreated,
}) => {
  const wizardTitleId = useId();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FormatCategory>('Shelf / Supermarket');
  const [width, setWidth] = useState<number>(60);
  const [height, setHeight] = useState<number>(40);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [mediaTypeId, setMediaTypeId] = useState<MediaType>('DIE_CUT');
  const [shape, setShape] = useState<LabelShape>('Rounded Rectangle');
  const [cornerRadius, setCornerRadius] = useState<number>(2);

  // Margins & Gaps
  const [topMargin, setTopMargin] = useState<number>(2);
  const [bottomMargin, setBottomMargin] = useState<number>(2);
  const [leftMargin, setLeftMargin] = useState<number>(2);
  const [rightMargin, setRightMargin] = useState<number>(2);
  const [horizontalGap, setHorizontalGap] = useState<number>(2);
  const [verticalGap, setVerticalGap] = useState<number>(2);
  const [allowNegativeOffsets, setAllowNegativeOffsets] = useState<boolean>(false);
  const [showAdvancedMargins, setShowAdvancedMargins] = useState<boolean>(false);

  // Sheet specific
  const [pageSize, setPageSize] = useState<'A4' | 'A5' | 'LETTER' | 'CUSTOM'>('A4');
  const [sheetRows, setSheetRows] = useState<number>(7);
  const [sheetColumns, setSheetColumns] = useState<number>(3);

  if (!isOpen) return null;

  // Real-time validations
  const errors: Record<string, string> = {};
  if (!name.trim()) errors.name = 'Le nom du format est obligatoire';
  if (width <= 0) errors.width = 'La largeur doit être strictement positive';
  if (height <= 0) errors.height = 'La hauteur doit être strictement positive';
  if (leftMargin + rightMargin >= width) {
    errors.margins = 'La somme des marges horizontales dépasse la largeur totale';
  }
  if (topMargin + bottomMargin >= height) {
    errors.margins = 'La somme des marges verticales dépasse la hauteur totale';
  }

  const printableWidth = Math.max(0, width - (leftMargin + rightMargin));
  const printableHeight = Math.max(0, height - (topMargin + bottomMargin));

  const handleSave = (createTemplateNow: boolean) => {
    if (Object.keys(errors).length > 0) return;

    const newFormat = formatRepository.createCustomFormat({
      name: name.trim(),
      description: description.trim() || `Format personnalisé ${width}×${height} mm`,
      category,
      width,
      height,
      unit: 'mm',
      orientation,
      topMargin,
      bottomMargin,
      leftMargin,
      rightMargin,
      horizontalGap: mediaTypeId === 'CONTINUOUS' ? 0 : horizontalGap,
      verticalGap: mediaTypeId === 'CONTINUOUS' ? 0 : verticalGap,
      columns: mediaTypeId === 'SHEET' ? sheetColumns : 1,
      rows: mediaTypeId === 'SHEET' ? sheetRows : 1,
      mediaTypeId,
      shape,
      cornerRadius: shape === 'Rounded Rectangle' ? cornerRadius : 0,
      printableWidth,
      printableHeight,
      sheetConfig:
        mediaTypeId === 'SHEET'
          ? {
              pageSize,
              labelsPerPage: sheetRows * sheetColumns,
            }
          : undefined,
    });

    onFormatCreated(newFormat, createTemplateNow);
    onClose();
  };

  const steps = [
    { number: 1, label: 'Informations' },
    { number: 2, label: 'Dimensions' },
    { number: 3, label: 'Support & Découpe' },
    { number: 4, label: 'Marges & Espacements' },
    { number: 5, label: 'Validation' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby={wizardTitleId}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h2 id={wizardTitleId} className="text-lg font-bold text-white">Assistant Nouveau Format d'Étiquette</h2>
              <p className="text-xs text-slate-400">Définissez la géométrie physique sans modifier les gabarits système</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper Bar */}
        <div className="px-6 py-3 bg-slate-950/30 border-b border-slate-800 flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStep(s.number as any)}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  currentStep === s.number
                    ? 'bg-blue-600 text-white shadow'
                    : currentStep > s.number
                    ? 'bg-slate-800 text-emerald-400'
                    : 'bg-slate-800/50 text-slate-500'
                }`}
              >
                <span>{s.number}</span>
                <span>{s.label}</span>
              </button>
              {idx < steps.length - 1 && <span className="text-slate-700 text-xs">→</span>}
            </div>
          ))}
        </div>

        {/* Wizard Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-5 max-w-xl mx-auto">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nom du Format <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Rayon Épicerie 65×35"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                />
                {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Description & Usage
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex: Étiquettes gondole avec prix et code EAN-13, rouleau 500 pcs"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Catégorie</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      'Small',
                      'Standard Retail',
                      'Shelf / Supermarket',
                      'Large / Product',
                      'Continuous',
                      'Sheet',
                    ] as FormatCategory[]
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`p-3 rounded-xl border text-left text-xs font-medium transition ${
                        category === cat
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Dimensions & Live Preview */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-3xl mx-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Largeur (mm) : <span className="text-blue-400 font-bold">{width} mm</span> ({((width || 0) / 25.4).toFixed(2)} in)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="220"
                    value={width}
                    onChange={(e) => setWidth(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                  {errors.width && <p className="text-xs text-rose-400 mt-1">{errors.width}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Hauteur (mm) : <span className="text-blue-400 font-bold">{height} mm</span> ({((height || 0) / 25.4).toFixed(2)} in)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="350"
                    value={height}
                    onChange={(e) => setHeight(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                  {errors.height && <p className="text-xs text-rose-400 mt-1">{errors.height}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Orientation</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOrientation('landscape')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                        orientation === 'landscape'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400'
                      }`}
                    >
                      Paysage (Rayon standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation('portrait')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                        orientation === 'portrait'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400'
                      }`}
                    >
                      Portrait (Colis / Bouteille)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Forme de découpe</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShape('Rounded Rectangle')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                        shape === 'Rounded Rectangle'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400'
                      }`}
                    >
                      Coins arrondis
                    </button>
                    <button
                      type="button"
                      onClick={() => setShape('Rectangle')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                        shape === 'Rectangle'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400'
                      }`}
                    >
                      Coins vifs (Rectangle)
                    </button>
                  </div>
                </div>
              </div>

              {/* Proportional Physical Preview */}
              <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center min-h-[260px]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-4">
                  Aperçu Proportionnel Réel
                </span>
                <div
                  style={{
                    width: `${Math.min(240, Math.max(60, width * 2.8))}px`,
                    height: `${Math.min(180, Math.max(40, height * 2.8))}px`,
                    borderRadius: shape === 'Rounded Rectangle' ? `${cornerRadius * 2}px` : '0px',
                  }}
                  className="bg-white text-slate-900 border-2 border-blue-500 shadow-xl flex flex-col items-center justify-center relative p-3 text-center transition-all duration-200"
                >
                  <div className="absolute inset-1 border border-dashed border-slate-300 rounded pointer-events-none" />
                  <span className="text-xs font-bold text-slate-800">{name || 'Format'}</span>
                  <span className="text-[10px] text-slate-600 font-mono mt-0.5">
                    {width} × {height} mm
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    ({((width || 0) / 25.4).toFixed(2)}″ × {((height || 0) / 25.4).toFixed(2)}″)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 text-center">
                  Surface imprimable calculée : {printableWidth} × {printableHeight} mm
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Media Type */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Type de support consommable (Stock)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {[
                    { id: 'DIE_CUT', title: 'Découpé (Die-Cut)', desc: 'Espacement régulier sur glassine' },
                    { id: 'CONTINUOUS', title: 'Continu (Continuous)', desc: 'Rouleau sans fin découpé par massicot' },
                    { id: 'BLACK_MARK', title: 'Marque Noire (Black Mark)', desc: 'Capteur optique par réflectance' },
                    { id: 'NOTCH', title: 'Encoche (Notch)', desc: 'Trou ou encoche latérale' },
                    { id: 'FANFOLD', title: 'Paravent (Fanfold)', desc: 'Plié en accordéon en boîte' },
                    { id: 'SHEET', title: 'Planche A4/A5 (Sheet)', desc: 'Grille d\'étiquettes bureautique' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMediaTypeId(m.id as MediaType)}
                      className={`p-3 rounded-xl border text-left transition ${
                        mediaTypeId === m.id
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-200">{m.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* If SHEET media type is chosen, show sheet grid setup */}
              {mediaTypeId === 'SHEET' && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                    Configuration de la Planche d'imposition
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Taille de page</label>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                      >
                        <option value="A4">A4 (210 × 297 mm)</option>
                        <option value="A5">A5 (148.5 × 210 mm)</option>
                        <option value="LETTER">US Letter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Colonnes</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={sheetColumns}
                        onChange={(e) => setSheetColumns(parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Lignes</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={sheetRows}
                        onChange={(e) => setSheetRows(parseInt(e.target.value) || 1)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Total poses par planche : <strong className="text-white">{sheetRows * sheetColumns} étiquettes</strong>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Margins & Gaps */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-bold text-slate-300 block mb-3">Marges Internes (mm)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Haut</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={topMargin}
                      onChange={(e) => setTopMargin(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bas</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={bottomMargin}
                      onChange={(e) => setBottomMargin(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Gauche</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={leftMargin}
                      onChange={(e) => setLeftMargin(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Droite</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={rightMargin}
                      onChange={(e) => setRightMargin(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>
                {errors.margins && <p className="text-xs text-rose-400 mt-2">{errors.margins}</p>}
              </div>

              {mediaTypeId !== 'CONTINUOUS' && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs font-bold text-slate-300 block mb-3">
                    Espacement entre étiquettes (Gaps mm)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Échenillage vertical (Gap)</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={verticalGap}
                        onChange={(e) => setVerticalGap(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Espacement horizontal</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={horizontalGap}
                        onChange={(e) => setHorizontalGap(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Margins Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedMargins(!showAdvancedMargins)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Options avancées (Décalages négatifs)</span>
                </button>
                {showAdvancedMargins && (
                  <div className="mt-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800 text-xs space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowNegativeOffsets}
                        onChange={(e) => setAllowNegativeOffsets(e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-blue-600"
                      />
                      <span>Autoriser les marges et décalages négatifs de calage tête</span>
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Recommandé uniquement pour compenser une dérive mécanique de rouleau connue.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Review & Save */}
          {currentStep === 5 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">{name || 'Format sans nom'}</h3>
                    <p className="text-xs text-slate-400">{description || 'Aucune description'}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Dimensions brutes :</span>
                    <p className="font-bold text-slate-200">
                      {width} × {height} mm ({(width / 25.4).toFixed(2)} × {(height / 25.4).toFixed(2)} in)
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Zone imprimable :</span>
                    <p className="font-bold text-emerald-400">
                      {printableWidth} × {printableHeight} mm
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Support / Découpe :</span>
                    <p className="font-bold text-slate-200">{mediaTypeId}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Orientation & Forme :</span>
                    <p className="font-bold text-slate-200">
                      {orientation === 'landscape' ? 'Paysage' : 'Portrait'} ({shape})
                    </p>
                  </div>
                </div>
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Veuillez corriger les erreurs avant d'enregistrer le format.</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={Object.keys(errors).length > 0}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Enregistrer le Format</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={Object.keys(errors).length > 0}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Enregistrer & Concevoir un Gabarit</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1) as any)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            ← Étape précédente
          </button>
          {currentStep < 5 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1) as any)}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-md transition"
            >
              Étape suivante →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

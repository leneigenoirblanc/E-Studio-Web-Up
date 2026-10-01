import React from 'react';
import { LayoutAnchor, TemplateItem } from '../../types';
import {
  MdAnchor,
  MdNorthWest,
  MdNorth,
  MdNorthEast,
  MdWest,
  MdCenterFocus,
  MdEast,
  MdSouthWest,
  MdSouth,
  MdSouthEast,
  MdStretchX,
  MdStretchY,
  MdStretchBoth,
  MdAutoReflow,
} from './MaterialAnchorIcons';

export interface AnchorReflowInspectorProps {
  selectedItem: TemplateItem;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

interface AnchorOption {
  id: LayoutAnchor;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  description: string;
}

const PIN_ANCHORS: AnchorOption[] = [
  {
    id: 'top-left',
    label: 'Haut Gauche',
    shortLabel: '↖ H.G.',
    icon: MdNorthWest,
    description: 'Conserve les marges supérieure et gauche fixes.',
  },
  {
    id: 'top-center',
    label: 'Haut Centre',
    shortLabel: '↑ H.C.',
    icon: MdNorth,
    description: 'Reste centré horizontalement, marge haute verrouillée.',
  },
  {
    id: 'top-right',
    label: 'Haut Droite',
    shortLabel: '↗ H.D.',
    icon: MdNorthEast,
    description: 'Conserve les marges supérieure et droite fixes.',
  },
  {
    id: 'bottom-left',
    label: 'Bas Gauche',
    shortLabel: '↙ B.G.',
    icon: MdSouthWest,
    description: 'Conserve les marges inférieure et gauche fixes.',
  },
  {
    id: 'bottom-center',
    label: 'Bas Centre',
    shortLabel: '↓ B.C.',
    icon: MdSouth,
    description: 'Reste centré horizontalement, marge basse verrouillée.',
  },
  {
    id: 'bottom-right',
    label: 'Bas Droite',
    shortLabel: '↘ B.D.',
    icon: MdSouthEast,
    description: 'Conserve les marges inférieure et droite fixes.',
  },
  {
    id: 'center',
    label: 'Centré (Pivôt)',
    shortLabel: '• Centre',
    icon: MdCenterFocus,
    description: 'Garde une position relative centrée sur les deux axes.',
  },
];

const REFLOW_STRETCH_OPTIONS: AnchorOption[] = [
  {
    id: 'stretch-x',
    label: 'Étirer Largeur (X)',
    shortLabel: 'Étirer X',
    icon: MdStretchX,
    description: 'Ajuste automatiquement la largeur en conservant les marges latérales.',
  },
  {
    id: 'stretch-y',
    label: 'Étirer Hauteur (Y)',
    shortLabel: 'Étirer Y',
    icon: MdStretchY,
    description: 'Ajuste automatiquement la hauteur en conservant les marges verticales.',
  },
  {
    id: 'stretch-both',
    label: 'Plein Cadre (X / Y)',
    shortLabel: 'Étirer X/Y',
    icon: MdStretchBoth,
    description: 'S’adapte entièrement aux nouvelles dimensions du gabarit.',
  },
];

export const AnchorReflowInspector: React.FC<AnchorReflowInspectorProps> = ({
  selectedItem,
  onUpdate,
}) => {
  const currentAnchor: LayoutAnchor = selectedItem.anchor || 'top-left';

  // Find active option details
  const activeOption =
    [...PIN_ANCHORS, ...REFLOW_STRETCH_OPTIONS].find((opt) => opt.id === currentAnchor) ||
    PIN_ANCHORS[0];

  return (
    <div className="pt-2.5 border-t border-slate-200 space-y-3">
      {/* Header with Responsive Material Design Icon */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500 flex items-center gap-1.5">
          <MdAnchor className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Ancrage &amp; Reflow Automatique</span>
        </h4>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium font-mono text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full shrink-0">
          <MdAutoReflow className="w-3 h-3 text-blue-600 animate-pulse" />
          <span>{activeOption.label}</span>
        </span>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Comportement de reflow dynamique lors du redimensionnement du gabarit ou changement de format étiquette.
      </p>

      {/* 9-Pin Constraint Matrix (Card Layout) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
            Point d'ancrage fixe
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Matrice 9 points</span>
        </div>

        {/* Responsive Grid with Material Design directional icons */}
        <div className="grid grid-cols-3 gap-1.5 max-w-[260px] mx-auto bg-slate-200/70 p-1.5 rounded-lg">
          {/* Row 1: Top-Left, Top-Center, Top-Right */}
          <button
            type="button"
            title="Ancrage Haut Gauche"
            onClick={() => onUpdate({ anchor: 'top-left' })}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition duration-150 ${
              currentAnchor === 'top-left'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 border border-slate-300/40'
            }`}
          >
            <MdNorthWest className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110" />
            <span className="text-[9px] mt-0.5 font-medium">H. Gauche</span>
          </button>

          <button
            type="button"
            title="Ancrage Haut Centre"
            onClick={() => onUpdate({ anchor: 'top-center' })}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition duration-150 ${
              currentAnchor === 'top-center'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 border border-slate-300/40'
            }`}
          >
            <MdNorth className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[9px] mt-0.5 font-medium">H. Centre</span>
          </button>

          <button
            type="button"
            title="Ancrage Haut Droite"
            onClick={() => onUpdate({ anchor: 'top-right' })}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition duration-150 ${
              currentAnchor === 'top-right'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 border border-slate-300/40'
            }`}
          >
            <MdNorthEast className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[9px] mt-0.5 font-medium">H. Droite</span>
          </button>

          {/* Row 2: Left Pin, Center Focus, Right Pin */}
          <button
            type="button"
            title="Ancrage Marge Gauche"
            onClick={() => onUpdate({ anchor: 'top-left' })}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition duration-150 ${
              currentAnchor === 'top-left' && false
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-white/80 text-slate-500 hover:bg-slate-100 hover:text-blue-600 border border-slate-300/40'
            }`}
          >
            <MdWest className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[9px] mt-0.5 font-medium">Gauche</span>
          </button>

          <button
            type="button"
            title="Ancrage Centré"
            onClick={() => onUpdate({ anchor: 'center' })}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition duration-150 ${
              currentAnchor === 'center'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 border border-slate-300/40'
            }`}
          >
            <MdCenterFocus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[9px] mt-0.5 font-medium">Centre</span>
          </button>

          <button
            type="button"
            title="Ancrage Marge Droite"
            onClick={() => onUpdate({ anchor: 'top-right' })}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition duration-150 ${
              currentAnchor === 'top-right' && false
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-white/80 text-slate-500 hover:bg-slate-100 hover:text-blue-600 border border-slate-300/40'
            }`}
          >
            <MdEast className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[9px] mt-0.5 font-medium">Droite</span>
          </button>

          {/* Row 3: Bottom-Left, Bottom-Center, Bottom-Right */}
          <button
            type="button"
            title="Ancrage Bas Gauche"
            onClick={() => onUpdate({ anchor: 'bottom-left' })}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition duration-150 ${
              currentAnchor === 'bottom-left'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 border border-slate-300/40'
            }`}
          >
            <MdSouthWest className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[9px] mt-0.5 font-medium">B. Gauche</span>
          </button>

          <button
            type="button"
            title="Ancrage Bas Centre"
            onClick={() => onUpdate({ anchor: 'bottom-center' })}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition duration-150 ${
              currentAnchor === 'bottom-center'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 border border-slate-300/40'
            }`}
          >
            <MdSouth className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[9px] mt-0.5 font-medium">B. Centre</span>
          </button>

          <button
            type="button"
            title="Ancrage Bas Droite"
            onClick={() => onUpdate({ anchor: 'bottom-right' })}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition duration-150 ${
              currentAnchor === 'bottom-right'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-blue-600 border border-slate-300/40'
            }`}
          >
            <MdSouthEast className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[9px] mt-0.5 font-medium">B. Droite</span>
          </button>
        </div>
      </div>

      {/* Reflow & Stretch Mode Controls */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider block">
          Modes d'Étirage &amp; Reflow (Redimensionnement Dynamique)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {REFLOW_STRETCH_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = currentAnchor === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdate({ anchor: opt.id })}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition duration-150 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isSelected ? 'text-white' : 'text-blue-600'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold truncate leading-tight">{opt.shortLabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic explanation footer */}
      <div className="p-2 bg-blue-50/70 border border-blue-200/70 rounded-lg flex items-start gap-2">
        <activeOption.icon className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-[10px] text-blue-900 leading-snug">
          <strong className="font-semibold">{activeOption.label} :</strong> {activeOption.description}
        </p>
      </div>
    </div>
  );
};

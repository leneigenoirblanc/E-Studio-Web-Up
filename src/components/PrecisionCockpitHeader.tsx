/**
 * Precision Production Cockpit — Global Shell Header (40 px)
 * 
 * Part of E-Studio Precision Cockpit Architecture:
 * - 40 px max height precision chrome
 * - Logo wordmark & template quick-switcher
 * - Mode Switcher: Design (Alt+1) | Data (Alt+2) | Produce (Alt+3) | Monitor (Alt+4)
 * - In-place Search / Command Palette (Ctrl+K / Alt+Q)
 * - Auto-save pill & Preflight quality score chip with Heatmap toggle
 * - Context-sensitive primary action button
 * - Focus Mode toggle (F)
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AppView } from '../services/navigationService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { LabelTemplate } from '../types';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Printer,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Maximize2,
  Minimize2,
  Clock,
  Sparkle,
  X,
  Plus,
  Upload,
  Layers,
  Database,
  Sliders,
  CheckCircle,
  Zap,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

export type CockpitMode = 'design' | 'data' | 'print';

interface PrecisionCockpitHeaderProps {
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  isHeatmapActive?: boolean;
  onToggleHeatmap?: () => void;
  onQuickAction?: (actionId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  zoom?: number;
  runLabelCount?: number;
}

export const PrecisionCockpitHeader: React.FC<PrecisionCockpitHeaderProps> = ({
  isFocusMode = false,
  onToggleFocusMode,
  isHeatmapActive = false,
  onToggleHeatmap,
  onQuickAction,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  zoom = 1,
  runLabelCount = 212,
}) => {
  const store = useAppStore();
  const isOnline = useOnlineStatus();

  // Active mode mapped from currentView (3 Workspaces)
  const currentMode: CockpitMode = React.useMemo(() => {
    switch (store.currentView) {
      case 'editor':
      case 'labels':
        return 'design';
      case 'database':
        return 'data';
      case 'generation':
      case 'jobs':
      case 'printers':
        return 'print';
      case 'home':
      default:
        return 'design';
    }
  }, [store.currentView]);

  // Mode navigation
  const setMode = (mode: CockpitMode) => {
    switch (mode) {
      case 'design':
        if (!store.activeTemplate && store.templates.length > 0) {
          store.setActiveTemplate(store.templates[0]);
        }
        store.navigateTo('editor');
        break;
      case 'data':
        store.navigateTo('database');
        break;
      case 'print':
        if (!store.activeTemplate && store.templates.length > 0) {
          store.setActiveTemplate(store.templates[0]);
        }
        store.navigateTo('generation');
        break;
    }
  };

  // Keyboard navigation shortcuts: Alt+1..5, Ctrl+K, F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          store.navigateTo('home');
        } else if (e.key === '2') {
          e.preventDefault();
          store.navigateTo('templates');
        } else if (e.key === '3') {
          e.preventDefault();
          store.navigateTo('jobs');
        } else if (e.key === '4') {
          e.preventDefault();
          store.navigateTo('activity');
        } else if (e.key === '5') {
          e.preventDefault();
          store.navigateTo('settings');
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }

      if (!isInput && (e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        onToggleFocusMode?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store.activeTemplate, store.templates, onToggleFocusMode]);

  // Template Switcher Dropdown
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  // Search Command Palette
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setIsTemplateMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Preflight Quality calculation
  const activeTemplate = store.activeTemplate || store.templates[0];
  const preflightAudit = React.useMemo(() => {
    if (!activeTemplate) return { blockingCount: 0, warningCount: 0, score: 100 };

    let blockingCount = 0;
    let warningCount = 0;

    activeTemplate.items.forEach((it) => {
      if (it.x_mm < 0 || it.y_mm < 0 || it.x_mm + it.w_mm > activeTemplate.width_mm || it.y_mm + it.h_mm > activeTemplate.height_mm) {
        blockingCount++;
      }
    });

    const barcodes = activeTemplate.items.filter((it) => it.type === 'barcode' || it.type === 'qrcode');
    barcodes.forEach((bc) => {
      if (bc.w_mm < 15 || bc.h_mm < 8) warningCount++;
    });

    const prices = activeTemplate.items.filter((it) => it.type === 'price' || it.type === 'price_block');
    if (prices.length === 0) warningCount++;

    const score = Math.max(0, 100 - blockingCount * 40 - warningCount * 15);
    return { blockingCount, warningCount, score };
  }, [activeTemplate]);

  // Primary action button context-sensitive handler
  const handlePrimaryAction = () => {
    switch (currentMode) {
      case 'design':
        if (activeTemplate) {
          store.setActiveTemplate(activeTemplate);
          store.setBatchInitialData(undefined, undefined);
          store.navigateTo('generation');
        }
        break;
      case 'data':
        onQuickAction?.('import-data');
        break;
      case 'print':
        onQuickAction?.('launch-print');
        break;
    }
  };

  const primaryActionLabel = React.useMemo(() => {
    switch (currentMode) {
      case 'design':
        return 'Tirage (Print) →';
      case 'data':
        return 'Importer CSV';
      case 'print':
        return 'Lancer BAT';
    }
  }, [currentMode]);

  return (
    <header className="h-10 bg-slate-900 border-b border-slate-800 text-slate-200 select-none z-40 shrink-0 font-sans px-3 flex items-center justify-between gap-2">
      {/* LEFT ZONE: Logo Wordmark + History + Active Template Quick Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('design')}
          className="text-sm font-black tracking-tight text-white hover:text-blue-400 transition-colors flex items-center gap-1.5 focus-visible:outline-none"
        >
          <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">E-Studio</span>
        </button>

        {/* Browser-style Back / Forward */}
        <div className="flex items-center gap-0.5 bg-slate-800/90 rounded p-0.5 border border-slate-700/60">
          <button
            onClick={store.goBack}
            disabled={!store.canGoBack}
            title="Page précédente (Historique)"
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={store.goForward}
            disabled={!store.canGoForward}
            title="Page suivante (Historique)"
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Active Gabarit Selector Badge */}
        {activeTemplate && (
          <div className="relative" ref={templateMenuRef}>
            <button
              onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 transition max-w-[210px]"
              title="Changer de gabarit actif"
            >
              <span className="truncate max-w-[120px] text-white">{activeTemplate.name}</span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-1 py-0.2 rounded border border-slate-700/60">
                {activeTemplate.width_mm}×{activeTemplate.height_mm}mm
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isTemplateMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Gabarits récents ({store.templates.length})
                </div>
                <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-0.5">
                  {store.templates.map((tpl) => (
                    <button
                      key={tpl.name}
                      onClick={() => {
                        store.setActiveTemplate(tpl);
                        setIsTemplateMenuOpen(false);
                        if (store.currentView !== 'editor') store.navigateTo('editor');
                      }}
                      className={`w-full px-2 py-1.5 rounded text-left text-xs flex items-center justify-between transition ${
                        activeTemplate.name === tpl.name
                          ? 'bg-blue-600/30 text-blue-200 font-bold border border-blue-500/40'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate max-w-[140px]">{tpl.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{tpl.width_mm}×{tpl.height_mm}</span>
                    </button>
                  ))}
                </div>
                <div className="pt-1 mt-1 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setIsTemplateMenuOpen(false);
                      store.openModal('isWizardOpen');
                    }}
                    className="w-full px-2 py-1 text-left text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-slate-800/80 rounded flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Créer un nouveau gabarit...</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CENTER ZONE: 5 Canonical Destinations Switcher + Global Command Search */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Segmented Mode Switcher */}
        <nav className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/80 text-xs">
          {[
            { id: 'home', label: 'Accueil', shortcut: 'Alt+1' },
            { id: 'templates', label: 'Gabarits', shortcut: 'Alt+2' },
            { id: 'jobs', label: 'Travaux', shortcut: 'Alt+3' },
            { id: 'activity', label: 'Activité', shortcut: 'Alt+4' },
            { id: 'settings', label: 'Paramètres', shortcut: 'Alt+5' },
          ].map((dest) => {
            const isActive =
              store.currentView === dest.id ||
              (dest.id === 'templates' && store.currentView === 'editor') ||
              (dest.id === 'jobs' && (store.currentView === 'generation' || store.currentView === 'database'));

            return (
              <button
                key={dest.id}
                onClick={() => store.navigateTo(dest.id as AppView)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
                title={`Naviguer vers ${dest.label} (${dest.shortcut})`}
              >
                <span>{dest.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Undo / Redo */}
        <div className="hidden sm:flex items-center gap-0.5 bg-slate-800/80 rounded p-0.5 border border-slate-700/60">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition"
            title="Annuler (Ctrl+Z)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 transition"
            title="Rétablir (Ctrl+Y)"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        </div>

        {/* Zoom Chip */}
        <span className="hidden md:inline-block font-mono text-[10px] font-bold text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
          {Math.round(zoom * 100)}%
        </span>

        {/* Run Chip */}
        <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-800 text-indigo-300 text-[10px] font-mono font-bold">
          <span>Run #1</span>
          <span className="text-indigo-500">·</span>
          <span>{runLabelCount} étiquettes</span>
        </div>

        {/* Global Search / Command Bar (Ctrl+K) */}
        <div className="relative" ref={searchContainerRef}>
          <button
            onClick={() => {
              setIsSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="h-7 w-36 sm:w-48 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded px-2 flex items-center justify-between text-xs text-slate-400 transition"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Search className="w-3 h-3 text-slate-400" />
              <span className="truncate text-[11px]">Commandes (⌘K)...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1 bg-slate-900 text-[9px] font-mono rounded text-slate-500 border border-slate-700/60">
              Ctrl+K
            </kbd>
          </button>

          {isSearchOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-84 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 text-xs">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 rounded-lg mb-2 border border-slate-700">
                <Search className="w-3.5 h-3.5 text-blue-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tapez une action (ex: 'centrer', 'prix promo')..."
                  className="w-full bg-transparent text-xs text-white outline-none font-medium placeholder-slate-500"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto space-y-0.5 text-xs scrollbar-thin">
                {[
                  { title: 'Insérer Prix Promotionnel %', cat: 'Tarifs V2', action: () => onQuickAction?.('insert-price-promo') },
                  { title: 'Insérer Prix Simple Standard', cat: 'Tarifs V2', action: () => onQuickAction?.('insert-price-simple') },
                  { title: 'Insérer Code-Barres EAN-13', cat: 'Codes', action: () => onQuickAction?.('insert-barcode') },
                  { title: 'Insérer QR Code 2D', cat: 'Codes', action: () => onQuickAction?.('insert-qrcode') },
                  { title: 'Centrer sur le gabarit', cat: 'Alignement', action: () => onQuickAction?.('center-item') },
                  { title: 'Basculer Heatmap de lisibilité', cat: 'Contrôle', action: () => onToggleHeatmap?.() },
                  { title: 'Mode Focus Plein Écran (F)', cat: 'Affichage', action: () => onToggleFocusMode?.() },
                  { title: 'Dictionnaire de Mappage ERP', cat: 'Données', action: () => store.openModal('isMappingDictionaryOpen') },
                ]
                  .filter((c) => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        c.action?.();
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-2.5 py-1.5 rounded hover:bg-slate-800 text-left flex items-center justify-between text-slate-200 hover:text-white transition group"
                    >
                      <span className="font-semibold">{c.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 group-hover:bg-slate-700 rounded">
                        {c.cat}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT ZONE: AutoSave + Preflight Score + Focus Mode + Primary CTA */}
      <div className="flex items-center gap-2">
        {/* AutoSave Indicator Pill */}
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800/80 border border-slate-700/60 text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Enregistré</span>
        </div>

        {/* Preflight Score Chip with Heatmap Toggle */}
        <div className="flex items-center bg-slate-800/90 rounded border border-slate-700/80 p-0.5">
          <button
            onClick={() => onQuickAction?.('open-preflight')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
              preflightAudit.blockingCount > 0
                ? 'text-rose-400 bg-rose-950/40 hover:bg-rose-900/60'
                : preflightAudit.warningCount > 0
                ? 'text-amber-400 bg-amber-950/40 hover:bg-amber-900/60'
                : 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60'
            }`}
            title="Score pré-vol qualité impression"
          >
            {preflightAudit.blockingCount > 0 ? (
              <ShieldAlert className="w-3 h-3 text-rose-400" />
            ) : preflightAudit.warningCount > 0 ? (
              <AlertTriangle className="w-3 h-3 text-amber-400" />
            ) : (
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
            )}
            <span>
              {preflightAudit.blockingCount > 0
                ? `${preflightAudit.blockingCount} Blq`
                : `${preflightAudit.score}%`}
            </span>
          </button>

          {/* Heatmap toggle in chip */}
          <button
            onClick={onToggleHeatmap}
            className={`p-1 rounded text-xs transition ${
              isHeatmapActive
                ? 'bg-purple-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title={isHeatmapActive ? 'Désactiver Heatmap de lisibilité' : 'Activer Heatmap de lisibilité'}
          >
            <Activity className="w-3 h-3" />
          </button>
        </div>

        {/* Focus Mode Button (F) */}
        {currentMode === 'design' && (
          <button
            onClick={onToggleFocusMode}
            className={`p-1.5 rounded transition ${
              isFocusMode
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isFocusMode ? 'Quitter Mode Focus (F)' : 'Mode Focus Plein Écran (F)'}
          >
            {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Primary Context-Sensitive CTA */}
        <button
          onClick={handlePrimaryAction}
          className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded text-xs tracking-tight shadow-xs flex items-center gap-1.5 transition active:scale-95"
        >
          {currentMode === 'design' && <Printer className="w-3.5 h-3.5" />}
          {currentMode === 'data' && <Upload className="w-3.5 h-3.5" />}
          {currentMode === 'print' && <Printer className="w-3.5 h-3.5" />}
          <span>{primaryActionLabel}</span>
        </button>
      </div>
    </header>
  );
};

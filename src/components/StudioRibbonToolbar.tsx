/**
 * E-Studio Viewport-First Command Deck & Tool Strip
 * 
 * Architecture 80/20 Spatiale :
 * - Command Deck ultra-compact (36 px) : Retour, AutoSave, Titre, Search Alt+Q, Chip Pré-Vol, Bouton Produire, Focus Mode
 * - Compact Command Strip (34 px) : Bandeau monocouche d'onglets (Accueil, Insérer, Données, Prix, Production, Affichage, Diagnostic)
 * - Palettes éphémères contextuelles (Popover) s'ouvrant sous le bouton et se refermant immédiatement pour libérer 100% du canvas
 * - Insertion intelligente Context-Aware (+ Insérer)
 */

import React, { useState, useRef, useEffect } from 'react';
import { LabelTemplate, TemplateItem, ProductRecord } from '../types';
import { AlignmentDirection } from '../utils/canvasAlignment';
import { PriceElement, PricePreset } from '../domain/pricing/presentation';
import { pricingEngine } from '../domain/pricing/pricingEngine';
import {
  Type,
  Square,
  Circle,
  Minus,
  Barcode,
  QrCode,
  Image as ImageIcon,
  Tag,
  Scale,
  Sparkles,
  Stamp,
  ShieldAlert,
  ShieldCheck,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Magnet,
  Ruler,
  Crosshair,
  Sliders,
  Paintbrush,
  ClipboardCheck,
  Lock,
  Unlock,
  Copy,
  Trash2,
  MoveUp,
  MoveDown,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  RotateCcw,
  RotateCw,
  Search,
  Layers,
  Percent,
  X,
  Save,
  Download,
  Printer,
  FileText,
  AlertTriangle,
  MousePointer,
  Hand,
  SlidersHorizontal,
  Database,
  Activity,
  CheckCircle,
  Clock,
  Sparkle,
  Zap,
  Maximize,
  Minimize,
  Eye,
  Plus,
  Compass,
} from 'lucide-react';

export type ToolStripPopover =
  | 'file'
  | 'home'
  | 'insert'
  | 'data'
  | 'pricing'
  | 'production'
  | 'view'
  | 'diagnostic'
  | null;

export type AutoSaveState = 'saved' | 'saving' | 'pending';

interface StudioRibbonToolbarProps {
  template: LabelTemplate;
  selectedItems: TemplateItem[];
  activeTool: 'select' | 'marquee' | 'pan';
  onToolChange: (tool: 'select' | 'marquee' | 'pan') => void;
  onAddItem: (type: string, payload?: any) => void;
  onUpdateItem: (item: TemplateItem) => void;
  onUpdateMultipleItems?: (items: TemplateItem[]) => void;
  onDuplicateItems: (ids: string[]) => void;
  onDeleteItems: (ids: string[]) => void;
  onAlign: (direction: AlignmentDirection) => void;
  onDistribute: (direction: 'horizontal' | 'vertical') => void;
  onCenterItem?: (itemId: string, axis: 'x' | 'y' | 'both') => void;
  onReorderItem: (itemId: string, direction: 'up' | 'down') => void;
  onRotateStep90?: (itemId: string) => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  hasCopiedStyle: boolean;
  smartGuidesEnabled: boolean;
  onToggleSmartGuides: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  gridSizeMm: number;
  onChangeGridSize: (size: number) => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  showBleed: boolean;
  onToggleBleed: () => void;
  showInnerMargins: boolean;
  onToggleInnerMargins: () => void;
  isHeatmapActive: boolean;
  onToggleHeatmap: () => void;
  onOpenCalibration: () => void;
  previewDataIndex: number | null;
  onChangePreviewDataIndex: (index: number | null) => void;
  availablePreviewProducts: ProductRecord[];
  isInspectorDrawerOpen: boolean;
  onToggleInspectorDrawer: () => void;

  // Title / Navigation / History
  onBackToHome?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  historyIndex?: number;
  historyLength?: number;
  onSave?: () => void;
  onExportJson?: () => void;
  onOpenGeneration?: () => void;
  onOpenFindReplace?: () => void;
  onOpenRulesModal?: () => void;
  onOpenDataMapping?: () => void;

  // Viewport-First Focus Mode
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onOpenRightDrawerTab?: (tab: 'properties' | 'data' | 'rules' | 'preflight') => void;
}

export const StudioRibbonToolbar: React.FC<StudioRibbonToolbarProps> = ({
  template,
  selectedItems,
  activeTool,
  onToolChange,
  onAddItem,
  onUpdateItem,
  onDuplicateItems,
  onDeleteItems,
  onAlign,
  onCenterItem,
  onReorderItem,
  onRotateStep90,
  onCopyStyle,
  onPasteStyle,
  hasCopiedStyle,
  smartGuidesEnabled,
  onToggleSmartGuides,
  snapToGrid,
  onToggleSnapToGrid,
  gridSizeMm,
  showRulers,
  onToggleRulers,
  showBleed,
  onToggleBleed,
  isHeatmapActive,
  onToggleHeatmap,
  onOpenCalibration,
  previewDataIndex,
  onChangePreviewDataIndex,
  availablePreviewProducts,
  isInspectorDrawerOpen,
  onToggleInspectorDrawer,
  onBackToHome,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  onSave,
  onExportJson,
  onOpenGeneration,
  onOpenFindReplace,
  onOpenDataMapping,
  isFocusMode = false,
  onToggleFocusMode,
  onOpenRightDrawerTab,
}) => {
  // Active Popover Palette
  const [activePopover, setActivePopover] = useState<ToolStripPopover>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // AutoSave State
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>('saved');

  // Search Alt+Q State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const primarySelected = selectedItems.length > 0 ? selectedItems[0] : null;
  const isPrice = primarySelected?.type === 'price' || primarySelected?.type === 'price_block';
  const isV2Price = primarySelected?.type === 'price';
  const isLocked = Boolean(primarySelected?.locked);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Shortcut Alt+Q / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === 'q' || e.key === 'Q')) || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setActivePopover(null);
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Preflight Quality Audit calculation
  const preflightAudit = React.useMemo(() => {
    const issues: { severity: 'BLOCKING' | 'WARNING' | 'INFO'; message: string }[] = [];

    template.items.forEach((it) => {
      if (it.x_mm < 0 || it.y_mm < 0 || it.x_mm + it.w_mm > template.width_mm || it.y_mm + it.h_mm > template.height_mm) {
        issues.push({
          severity: 'BLOCKING',
          message: `Élément #${it.id.slice(0, 5)} déborde des limites.`,
        });
      }
    });

    const barcodes = template.items.filter((it) => it.type === 'barcode' || it.type === 'qrcode');
    barcodes.forEach((bc) => {
      if (bc.w_mm < 15 || bc.h_mm < 8) {
        issues.push({
          severity: 'WARNING',
          message: `Code-barres #${bc.id.slice(0, 5)} inférieur aux normes GS1.`,
        });
      }
    });

    const prices = template.items.filter((it) => it.type === 'price' || it.type === 'price_block');
    if (prices.length === 0) {
      issues.push({
        severity: 'WARNING',
        message: 'Aucun bloc prix présent.',
      });
    }

    const blockingCount = issues.filter((i) => i.severity === 'BLOCKING').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
    const score = Math.max(0, 100 - blockingCount * 40 - warningCount * 15);

    return { issues, blockingCount, warningCount, score };
  }, [template]);

  // Execute NLP Commands
  const executeCommand = (rawQuery: string) => {
    const q = rawQuery.toLowerCase().trim();
    if (!q) return;
    setIsSearchOpen(false);
    setSearchQuery('');

    if (q.includes('centre') || q.includes('centrer')) {
      if (primarySelected && onCenterItem) {
        onCenterItem(primarySelected.id, 'both');
        showToast('Centré sur le gabarit');
      }
      return;
    }
    if (q.includes('rouge')) {
      if (primarySelected) {
        onUpdateItem({ ...primarySelected, text_color: '#dc2626', fill_color: '#dc2626' } as any);
        showToast('Couleur rouge appliquée');
      }
      return;
    }
    if (q.includes('bleu')) {
      if (primarySelected) {
        onUpdateItem({ ...primarySelected, text_color: '#0078d4', fill_color: '#0078d4' } as any);
        showToast('Couleur bleue appliquée');
      }
      return;
    }
    if (q.includes('prix promo') || q.includes('promo')) {
      onAddItem('price', { preset: 'promotion' });
      showToast('Prix promo inséré');
      return;
    }
    if (q.includes('prix simple') || q.includes('prix')) {
      onAddItem('price', { preset: 'simple' });
      showToast('Prix simple inséré');
      return;
    }
    if (q.includes('code') || q.includes('ean')) {
      onAddItem('barcode');
      showToast('Code-barres inséré');
      return;
    }
    if (q.includes('qr')) {
      onAddItem('qrcode');
      showToast('QR Code inséré');
      return;
    }
    if (q.includes('texte')) {
      onAddItem('text');
      showToast('Texte inséré');
      return;
    }
    if (q.includes('grille')) {
      onToggleSnapToGrid();
      showToast('Grille basculée');
      return;
    }
    if (q.includes('règle') || q.includes('regle')) {
      onToggleRulers();
      showToast('Règles basculées');
      return;
    }
    if (q.includes('tirage') || q.includes('imprimer') || q.includes('bat') || q.includes('produire')) {
      onOpenGeneration?.();
      return;
    }
    if (q.includes('diagnostic') || q.includes('audit')) {
      onOpenRightDrawerTab?.('preflight');
      return;
    }

    showToast(`Commande exécutée : "${rawQuery}"`);
  };

  const handlePresetSelect = (preset: PricePreset) => {
    setActivePopover(null);
    if (!primarySelected) return;
    if (isV2Price) {
      const switched = pricingEngine.switchPreset(primarySelected as PriceElement, preset);
      onUpdateItem(switched as any);
    } else {
      if (preset === 'promotion') {
        onUpdateItem({
          ...primarySelected,
          binding_key: 'PROMOPRICE',
          promo_badge_type: 'discount_pct',
        } as any);
      } else {
        onUpdateItem({
          ...primarySelected,
          binding_key: 'SELLING_PRICE',
          promo_badge_type: undefined,
        } as any);
      }
    }
    showToast(`Preset : ${preset.toUpperCase()}`);
  };

  return (
    <div className="bg-[#f8f9fa] text-[#1e293b] border-b border-[#e2e8f0] select-none z-30 shrink-0 font-sans shadow-2xs relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-medium shadow-xl border border-slate-700 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
          <Sparkle className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. COMMAND DECK (36 PX) : MINIMAL CHROME & QUICK ACCESS                   */}
      {/* ========================================================================= */}
      <div className="h-9 px-2.5 flex items-center justify-between border-b border-[#edebe9] text-xs bg-[#f3f2f1]/90">
        {/* Left Side: Back | AutoSave Pill | Undo / Redo | Name & Dimensions */}
        <div className="flex items-center gap-1.5">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="px-2 py-0.5 bg-white hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900 transition flex items-center gap-1 font-bold text-[11px] border border-slate-300 shadow-2xs"
              title="Retour aux gabarits"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[#c43e1c]" />
              <span>E-Studio</span>
            </button>
          )}

          {/* AutoSave Status Pill */}
          <button
            onClick={() => setAutoSaveState((p) => (p === 'saved' ? 'saving' : p === 'saving' ? 'pending' : 'saved'))}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 hover:border-slate-300 transition"
            title="État de synchronisation continue"
          >
            {autoSaveState === 'saved' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700">Enregistré</span>
              </>
            )}
            {autoSaveState === 'saving' && (
              <>
                <Clock className="w-2.5 h-2.5 text-blue-500 animate-spin" />
                <span className="text-blue-700">Enreg…</span>
              </>
            )}
            {autoSaveState === 'pending' && (
              <>
                <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                <span className="text-amber-700">En attente</span>
              </>
            )}
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 hover:bg-white rounded text-slate-700 disabled:opacity-30 transition"
              title="Annuler (Ctrl+Z)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 hover:bg-white rounded text-slate-700 disabled:opacity-30 transition"
              title="Rétablir (Ctrl+Y)"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-slate-300 mx-0.5" />

          {/* Document Name & Dimensions Badge */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[11px] text-slate-800 max-w-[130px] truncate">{template.name}</span>
            <span className="text-[10px] font-mono font-bold text-slate-600 bg-white px-1 py-0.2 rounded border border-slate-200">
              {template.width_mm}×{template.height_mm}mm
            </span>
          </div>
        </div>

        {/* Center: Universal Command Bar Search (Alt+Q) */}
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="w-48 sm:w-64 h-6.5 bg-white hover:bg-slate-50 border border-slate-300 rounded px-2 flex items-center justify-between text-[11px] text-slate-500 shadow-2xs transition"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Search className="w-3 h-3 text-[#0078d4]" />
              <span className="truncate">Commande / outil...</span>
            </div>
            <kbd className="hidden sm:inline-block px-1 bg-slate-100 text-[9px] font-mono rounded text-slate-500 border border-slate-200">
              Alt+Q
            </kbd>
          </button>

          {isSearchOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-84 bg-white rounded-xl shadow-2xl border border-slate-300 p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg mb-1.5 border border-slate-200">
                <Search className="w-3.5 h-3.5 text-[#0078d4]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeCommand(searchQuery)}
                  placeholder="Écrivez une action (ex: 'centrer', 'prix promo')..."
                  className="w-full bg-transparent text-xs text-slate-800 outline-none font-medium"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-0.5 text-xs">
                {[
                  { title: 'Centrer sur le gabarit', cat: 'Action', run: () => primarySelected && onCenterItem?.(primarySelected.id, 'both') },
                  { title: 'Insérer Prix Promotionnel %', cat: 'Tarifs', run: () => onAddItem('price', { preset: 'promotion' }) },
                  { title: 'Insérer Prix Simple', cat: 'Tarifs', run: () => onAddItem('price', { preset: 'simple' }) },
                  { title: 'Insérer Code-barres EAN-13', cat: 'Codes', run: () => onAddItem('barcode') },
                  { title: 'Insérer QR Code 2D', cat: 'Codes', run: () => onAddItem('qrcode') },
                  { title: 'Insérer Zone de Texte', cat: 'Texte', run: () => onAddItem('text') },
                  { title: 'Activer la Grille', cat: 'Affichage', run: onToggleSnapToGrid },
                  { title: 'Afficher les Règles', cat: 'Affichage', run: onToggleRulers },
                  { title: 'Lancer Tirage BAT', cat: 'Production', run: onOpenGeneration },
                ]
                  .filter((c) => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        c.run?.();
                        setIsSearchOpen(false);
                      }}
                      className="w-full px-2 py-1 rounded hover:bg-slate-100 flex items-center justify-between text-left transition"
                    >
                      <span className="font-semibold text-slate-800">{c.title}</span>
                      <span className="text-[10px] px-1 bg-slate-200 text-slate-600 rounded">{c.cat}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Preflight Status Chip | PRODUIRE Button | Focus Mode */}
        <div className="flex items-center gap-1.5">
          {/* Preflight Chip */}
          <button
            onClick={() => onOpenRightDrawerTab?.('preflight')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 border transition ${
              preflightAudit.blockingCount > 0
                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                : preflightAudit.warningCount > 0
                ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
            title="Inspecter le diagnostic pré-vol"
          >
            {preflightAudit.blockingCount > 0 ? (
              <ShieldAlert className="w-3 h-3 text-rose-600" />
            ) : preflightAudit.warningCount > 0 ? (
              <AlertTriangle className="w-3 h-3 text-amber-600" />
            ) : (
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
            )}
            <span>
              {preflightAudit.blockingCount > 0
                ? `✕ ${preflightAudit.blockingCount}`
                : preflightAudit.warningCount > 0
                ? `⚠ ${preflightAudit.warningCount}`
                : `✓ ${preflightAudit.score}%`}
            </span>
          </button>

          {/* Primary Production Action */}
          {onOpenGeneration && (
            <button
              onClick={onOpenGeneration}
              className="px-2.5 py-0.5 bg-[#c43e1c] hover:bg-[#b13718] text-white font-bold rounded shadow-2xs flex items-center gap-1 text-[11px] tracking-tight transition"
              title="Lancer le tirage et l'imposition (BAT)"
            >
              <Printer className="w-3 h-3" />
              <span>PRODUIRE</span>
            </button>
          )}

          {/* Focus Mode (Canvas 95%+ Viewport Fullscreen) */}
          <button
            onClick={onToggleFocusMode}
            className={`p-1 rounded text-slate-600 hover:text-slate-900 transition border ${
              isFocusMode ? 'bg-[#c43e1c]/10 text-[#c43e1c] border-[#c43e1c]/30 font-bold' : 'hover:bg-white border-transparent'
            }`}
            title={isFocusMode ? 'Quitter le Mode Focus (F)' : 'Mode Focus Plein Écran (F)'}
          >
            {isFocusMode ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMPACT TOOL STRIP (34 PX) : SINGLE-LINE & TRANSIENT POPOVERS          */}
      {/* ========================================================================= */}
      {!isFocusMode && (
        <div className="h-8.5 px-2 flex items-center justify-between bg-white text-xs border-b border-slate-200">
          <div className="flex items-center gap-0.5 relative" ref={popoverRef}>
            {/* Fichier (Backstage Popover) */}
            <button
              onClick={() => setActivePopover(activePopover === 'file' ? null : 'file')}
              className="px-2.5 py-1 bg-[#c43e1c] hover:bg-[#b13718] text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-2xs mr-1"
            >
              <span>Fichier</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-80" />
            </button>

            {/* Quick Insert (+) Button */}
            <button
              onClick={() => setActivePopover(activePopover === 'insert' ? null : 'insert')}
              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[11px] flex items-center gap-1 border border-blue-200 mr-1"
              title="Insertion rapide intelligente"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Insérer</span>
            </button>

            {/* Tool Strip Tabs */}
            {[
              { id: 'home', label: 'Accueil' },
              { id: 'data', label: 'Données' },
              { id: 'pricing', label: 'Prix V2' },
              { id: 'production', label: 'Production' },
              { id: 'view', label: 'Affichage' },
              { id: 'diagnostic', label: 'Diagnostic' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePopover(activePopover === tab.id ? null : (tab.id as ToolStripPopover))}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition flex items-center gap-1 ${
                  activePopover === tab.id
                    ? 'bg-slate-100 text-[#c43e1c] font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                <ChevronDown className={`w-2.5 h-2.5 opacity-60 transition-transform ${activePopover === tab.id ? 'rotate-180' : ''}`} />
              </button>
            ))}

            {/* Transient Popover Content Panel */}
            {activePopover && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-300 p-2.5 z-50 animate-in fade-in zoom-in-95 min-w-[280px]">
                {/* FICHIER POPOVER */}
                {activePopover === 'file' && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-0.5">Fichier & Gabarit</div>
                    <button
                      onClick={() => {
                        onSave?.();
                        setActivePopover(null);
                        showToast('Gabarit sauvegardé');
                      }}
                      className="w-full px-2.5 py-1.5 rounded hover:bg-slate-100 text-left flex items-center gap-2"
                    >
                      <Save className="w-4 h-4 text-[#c43e1c]" />
                      <div>
                        <div className="font-semibold text-slate-800">Enregistrer (Ctrl+S)</div>
                        <div className="text-[10px] text-slate-500">Sauvegarder immédiatement</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        onExportJson?.();
                        setActivePopover(null);
                        showToast('JSON exporté');
                      }}
                      className="w-full px-2.5 py-1.5 rounded hover:bg-slate-100 text-left flex items-center gap-2"
                    >
                      <Download className="w-4 h-4 text-[#0078d4]" />
                      <div>
                        <div className="font-semibold text-slate-800">Exporter JSON Vectoriel</div>
                        <div className="text-[10px] text-slate-500">Structure du modèle</div>
                      </div>
                    </button>
                  </div>
                )}

                {/* INSERT POPOVER (CONTEXT-AWARE) */}
                {activePopover === 'insert' && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Composants & Blocs</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          onAddItem('price', { preset: 'simple' });
                          setActivePopover(null);
                        }}
                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 flex items-center gap-2 text-left"
                      >
                        <Tag className="w-4 h-4 text-emerald-700" />
                        <div>
                          <div className="font-bold text-xs">Prix Simple</div>
                          <div className="text-[9px] text-emerald-700">Standard retail</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          onAddItem('price', { preset: 'promotion' });
                          setActivePopover(null);
                        }}
                        className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 flex items-center gap-2 text-left"
                      >
                        <Percent className="w-4 h-4 text-rose-700" />
                        <div>
                          <div className="font-bold text-xs">Prix Promo</div>
                          <div className="text-[9px] text-rose-700">Pastille & remise</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          onAddItem('text');
                          setActivePopover(null);
                        }}
                        className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 flex items-center gap-2 text-left"
                      >
                        <Type className="w-4 h-4 text-blue-700" />
                        <div>
                          <div className="font-bold text-xs">Texte</div>
                          <div className="text-[9px] text-blue-700">Libellé / Titre</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          onAddItem('barcode');
                          setActivePopover(null);
                        }}
                        className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 flex items-center gap-2 text-left"
                      >
                        <Barcode className="w-4 h-4 text-purple-700" />
                        <div>
                          <div className="font-bold text-xs">Code EAN-13</div>
                          <div className="text-[9px] text-purple-700">Norme GS1</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          onAddItem('qrcode');
                          setActivePopover(null);
                        }}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-2 text-left"
                      >
                        <QrCode className="w-4 h-4 text-slate-700" />
                        <div>
                          <div className="font-bold text-xs">QR Code 2D</div>
                          <div className="text-[9px] text-slate-500">Traçabilité URL</div>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          onAddItem('ellipse');
                          setActivePopover(null);
                        }}
                        className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-2 text-left"
                      >
                        <Circle className="w-4 h-4 text-amber-700" />
                        <div>
                          <div className="font-bold text-xs">Pastille Ronde</div>
                          <div className="text-[9px] text-amber-700">Badge offre</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* ACCUEIL POPOVER */}
                {activePopover === 'home' && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Presse-papiers & Alignements</div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onPasteStyle();
                          setActivePopover(null);
                        }}
                        disabled={!hasCopiedStyle}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Coller Style</span>
                      </button>
                      <button
                        onClick={() => {
                          onCopyStyle();
                          setActivePopover(null);
                        }}
                        disabled={!primarySelected}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
                      >
                        <Paintbrush className="w-3.5 h-3.5 text-blue-600" />
                        <span>Copier Style</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-600">Centrer :</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            if (primarySelected) onCenterItem?.(primarySelected.id, 'x');
                            setActivePopover(null);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold"
                        >
                          Horizontal
                        </button>
                        <button
                          onClick={() => {
                            if (primarySelected) onCenterItem?.(primarySelected.id, 'y');
                            setActivePopover(null);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold"
                        >
                          Vertical
                        </button>
                        <button
                          onClick={() => {
                            if (primarySelected) onCenterItem?.(primarySelected.id, 'both');
                            setActivePopover(null);
                          }}
                          className="px-2 py-1 bg-slate-800 text-white hover:bg-black rounded text-[11px] font-bold"
                        >
                          Les Deux
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* PRIX V2 POPOVER */}
                {activePopover === 'pricing' && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Presets Moteur Tarifaire V2</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={() => handlePresetSelect('simple')} className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-left font-bold text-xs text-emerald-800">
                        Standard Retail
                      </button>
                      <button onClick={() => handlePresetSelect('promotion')} className="p-2 rounded bg-rose-50 hover:bg-rose-100 text-left font-bold text-xs text-rose-800">
                        Offre Choc / %
                      </button>
                      <button onClick={() => handlePresetSelect('unit_price')} className="p-2 rounded bg-blue-50 hover:bg-blue-100 text-left font-bold text-xs text-blue-800">
                        Prix au Kilo / L
                      </button>
                      <button onClick={() => handlePresetSelect('wholesale_tiers')} className="p-2 rounded bg-amber-50 hover:bg-amber-100 text-left font-bold text-xs text-amber-800">
                        Paliers / Volume
                      </button>
                    </div>
                  </div>
                )}

                {/* DONNÉES POPOVER */}
                {activePopover === 'data' && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Jeu de données de test</div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          onChangePreviewDataIndex(null);
                          setActivePopover(null);
                        }}
                        className={`px-2 py-1 rounded text-xs font-semibold ${previewDataIndex === null ? 'bg-[#c43e1c] text-white' : 'bg-slate-100'}`}
                      >
                        Vierge
                      </button>
                      {availablePreviewProducts.slice(0, 4).map((p, idx) => (
                        <button
                          key={p.id || idx}
                          onClick={() => {
                            onChangePreviewDataIndex(idx);
                            setActivePopover(null);
                          }}
                          className={`px-2 py-1 rounded text-xs font-semibold ${previewDataIndex === idx ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}
                        >
                          P{idx + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        onOpenDataMapping?.();
                        setActivePopover(null);
                      }}
                      className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold text-slate-800 flex items-center justify-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                      <span>Gérer Mappage ERP/CSV</span>
                    </button>
                  </div>
                )}

                {/* AFFICHAGE POPOVER */}
                {activePopover === 'view' && (
                  <div className="space-y-1 text-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Repères & Aides</div>
                    <button
                      onClick={() => {
                        onToggleSnapToGrid();
                        setActivePopover(null);
                      }}
                      className={`w-full p-1.5 rounded text-left flex items-center justify-between ${snapToGrid ? 'bg-blue-50 font-bold text-blue-800' : 'hover:bg-slate-100'}`}
                    >
                      <span>Grille magnétique ({gridSizeMm}mm)</span>
                      {snapToGrid && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                    <button
                      onClick={() => {
                        onToggleRulers();
                        setActivePopover(null);
                      }}
                      className={`w-full p-1.5 rounded text-left flex items-center justify-between ${showRulers ? 'bg-blue-50 font-bold text-blue-800' : 'hover:bg-slate-100'}`}
                    >
                      <span>Règles graduées millimétriques</span>
                      {showRulers && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                    <button
                      onClick={() => {
                        onToggleSmartGuides();
                        setActivePopover(null);
                      }}
                      className={`w-full p-1.5 rounded text-left flex items-center justify-between ${smartGuidesEnabled ? 'bg-blue-50 font-bold text-blue-800' : 'hover:bg-slate-100'}`}
                    >
                      <span>Guides magnétiques d'alignement</span>
                      {smartGuidesEnabled && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                    <button
                      onClick={() => {
                        onToggleBleed();
                        setActivePopover(null);
                      }}
                      className={`w-full p-1.5 rounded text-left flex items-center justify-between ${showBleed ? 'bg-amber-50 font-bold text-amber-800' : 'hover:bg-slate-100'}`}
                    >
                      <span>Fond Perdu (Bleed imprimerie)</span>
                      {showBleed && <CheckCircle className="w-3.5 h-3.5 text-amber-600" />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Micro Context: Selected item breadcrumb */}
          <div className="text-[11px] text-slate-500 truncate max-w-[280px]">
            {primarySelected ? (
              <span className="font-semibold text-slate-700">
                Sélection : <strong className="text-blue-600">{primarySelected.type.toUpperCase()}</strong> #{primarySelected.id.slice(0, 5)}
              </span>
            ) : (
              <span className="italic text-slate-400">Canvas {template.width_mm}×{template.height_mm}mm ({template.items.length} éléments)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

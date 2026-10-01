import React, { useState, useEffect, useRef } from 'react';
import { AppView } from '../services/navigationService';
import { LabelTemplate } from '../types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useAppStore } from '../store/useAppStore';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Settings,
  Printer,
  Type,
  BookOpen,
  Cpu,
  History,
  Plus,
  WifiOff,
} from 'lucide-react';

interface AppTopNavigationBarProps {
  currentView?: AppView;
  activeTemplate?: LabelTemplate | null;
  templates?: LabelTemplate[];
  totalProductsCount?: number;
  isTursoConfigured?: boolean;
  onNavigate?: (view: AppView) => void;
  onOpenMasterDatabase?: () => void;
  onOpenRulesModal?: () => void;
  onOpenFontManager?: () => void;
  onOpenAuditLogs?: () => void;
  onOpenMappingDictionary?: () => void;
  onOpenPreferences?: () => void;
  onOpenNewWizard?: () => void;
}

export const AppTopNavigationBar: React.FC<AppTopNavigationBarProps> = (props) => {
  const store = useAppStore();
  const currentView = props.currentView ?? store.currentView;
  const onNavigate = props.onNavigate ?? store.navigateTo;
  const onOpenRulesModal = props.onOpenRulesModal ?? (() => store.openModal('isRulesModalOpen'));
  const onOpenFontManager = props.onOpenFontManager ?? (() => store.openModal('isFontManagerOpen'));
  const onOpenAuditLogs = props.onOpenAuditLogs ?? (() => store.openModal('isAuditTrailOpen'));
  const onOpenMappingDictionary = props.onOpenMappingDictionary ?? (() => store.openModal('isMappingDictionaryOpen'));
  const onOpenPreferences = props.onOpenPreferences ?? (() => store.openModal('isPreferencesModalOpen'));
  const onOpenNewWizard = props.onOpenNewWizard ?? (() => store.openModal('isWizardOpen'));

  const isOnline = useOnlineStatus();
  const [toolsOpen, setToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          onNavigate('home');
        } else if (e.key === '2') {
          e.preventDefault();
          onNavigate('database');
        } else if (e.key === '3') {
          e.preventDefault();
          onNavigate('editor');
        } else if (e.key === '4') {
          e.preventDefault();
          onNavigate('generation');
        } else if (e.key === '5') {
          e.preventDefault();
          onNavigate('printers');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  const navItems: { view: AppView; label: string }[] = [
    { view: 'home', label: "Vue d'ensemble" },
    { view: 'database', label: 'Catalogue' },
    { view: 'labels', label: 'Formats & Gabarits' },
    { view: 'editor', label: 'Conception' },
    { view: 'generation', label: 'Tirage & Planches' },
    { view: 'printers', label: 'Imprimantes' },
    { view: 'jobs', label: 'File & Historique' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 shrink-0 select-none z-40 relative">
      <div className="max-w-7xl mx-auto h-13 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark + Navigation History Back/Forward */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="text-base font-bold tracking-tight text-white hover:text-blue-400 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            E-Studio
          </button>

          <div className="flex items-center gap-0.5 bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
            <button
              onClick={store.goBack}
              disabled={!store.canGoBack}
              title="Page précédente (Historique)"
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={store.goForward}
              disabled={!store.canGoForward}
              title="Page suivante (Historique)"
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => onNavigate(item.view)}
                className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded ${
                  isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span
                    className="absolute -bottom-3.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2.5">
          {!isOnline && (
            <div
              className="flex items-center gap-1 text-xs text-amber-400 mr-2"
              title="Mode hors-ligne actif. Vos données sont préservées localement."
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hors-ligne</span>
            </div>
          )}

          {/* Tools Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-expanded={toolsOpen}
              aria-haspopup="true"
            >
              <span>Outils</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {toolsOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50 animate-in fade-in-50 zoom-in-95">
                <button
                  onClick={() => {
                    setToolsOpen(false);
                    store.openModal('isPrintingSettingsOpen');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-blue-400 hover:bg-slate-700/70 transition-colors text-left"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Paramètres d'impression (i18n)</span>
                </button>

                <button
                  onClick={() => {
                    setToolsOpen(false);
                    onOpenPreferences();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/70 transition-colors text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Préférences d'affichage</span>
                </button>

                <button
                  onClick={() => {
                    setToolsOpen(false);
                    onOpenFontManager();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/70 transition-colors text-left"
                >
                  <Type className="w-3.5 h-3.5 text-slate-400" />
                  <span>Gestionnaire de polices</span>
                </button>

                <button
                  onClick={() => {
                    setToolsOpen(false);
                    onOpenMappingDictionary();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/70 transition-colors text-left"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dictionnaire de mapping</span>
                </button>

                <button
                  onClick={() => {
                    setToolsOpen(false);
                    onOpenRulesModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-indigo-300 hover:text-white hover:bg-slate-700/70 transition-colors text-left font-medium"
                >
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Orchestration & Règles Hybrides</span>
                </button>

                <button
                  onClick={() => {
                    setToolsOpen(false);
                    onOpenAuditLogs();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:bg-slate-700/70 transition-colors text-left"
                >
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Journal d'audit</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          {onOpenNewWizard ? (
            <button
              onClick={onOpenNewWizard}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Gabarit</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('generation')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <span>Lancer un Tirage</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile navigation row for small screens */}
      <div className="md:hidden border-t border-slate-800 px-4 py-2 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
              currentView === item.view ? 'bg-blue-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};

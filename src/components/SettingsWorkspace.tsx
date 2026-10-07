/**
 * E-Studio Settings Workspace
 * Conforms to SECTION 5 & 37: System Configuration
 * 
 * Manages Stock/Media Profiles, Printers, Currency & Number formatting, Station pairing, and Backup/Restore.
 */

import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { printerRepository } from '../domain/printing/printerRepository';
import { formatRepository } from '../domain/printing/formatRepository';
import { BackupRestoreService } from '../services/backupRestoreService';
import { useToast } from './ToastNotification';
import {
  Settings,
  Printer,
  Tag,
  DollarSign,
  Radio,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';

export const SettingsWorkspace: React.FC = () => {
  const store = useAppStore();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'stocks' | 'printers' | 'currency' | 'station' | 'backup'>('stocks');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Currency settings
  const [currencyCode, setCurrencyCode] = useState('EUR');
  const [currencySymbol, setCurrencySymbol] = useState('€');
  const [decimals, setDecimals] = useState(2);

  // Printers & Formats from repository
  const printers = printerRepository.getAll();
  const formats = formatRepository.getAll();

  const handleExportBackup = async () => {
    try {
      const archive = await BackupRestoreService.createBackupArchive();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(archive, null, 2));
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `estudio_complete_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Sauvegarde générée', 'Archive complète exportée avec succès.');
    } catch (e: any) {
      toast.error('Erreur', e.message);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const result = await BackupRestoreService.restoreFromBackup(parsed);
        if (result.success) {
          toast.success('Restauration réussie', 'Toutes les données ont été restaurées.');
          window.location.reload();
        } else {
          toast.error('Erreur de restauration', result.message || 'Archive non valide.');
        }
      } catch {
        toast.error('Erreur', 'Impossible de lire le fichier de sauvegarde.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
            <Settings className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">Configuration Système & Matériel</h1>
            <p className="text-[11px] text-slate-400">Supports, périphériques d'impression, devises et sauvegarde</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 bg-slate-950/20 px-6 flex items-center gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('stocks')}
          className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'stocks'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Formats & Supports ({formats.length})
        </button>
        <button
          onClick={() => setActiveTab('printers')}
          className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'printers'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimantes ({printers.length})
        </button>
        <button
          onClick={() => setActiveTab('currency')}
          className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'currency'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Devises & Prix
        </button>
        <button
          onClick={() => setActiveTab('station')}
          className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'station'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Poste & Appairage Mobile
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'backup'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          Sauvegarde & Restauration
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
        {/* STOCKS & FORMATS */}
        {activeTab === 'stocks' && (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Catalogue des Formats de Papier & Rouleaux
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {formats.map((fmt) => (
                <div key={fmt.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">{fmt.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {fmt.width} x {fmt.height} mm · {fmt.category}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono bg-slate-850 px-1.5 py-0.5 rounded text-slate-300">
                      {fmt.mediaTypeId}
                    </span>
                  </div>
                  {fmt.sheetConfig && (
                    <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-850 font-mono">
                      Page : {fmt.sheetConfig.pageSize} · {fmt.sheetConfig.labelsPerPage} étiquettes / feuille
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRINTERS */}
        {activeTab === 'printers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Périphériques d'Impression Configurés
              </h3>
              <button
                onClick={() => store.navigateTo('printers')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Découverte & Ajout d'imprimantes →
              </button>
            </div>

            <div className="space-y-3">
              {printers.map((p) => (
                <div key={p.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-850 flex items-center justify-center">
                      <Printer className="w-4 h-4 text-slate-300" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        {p.name}
                        {p.isDefault && (
                          <span className="text-[9px] bg-blue-900 text-blue-200 px-1.5 py-0.2 rounded font-bold">
                            PAR DÉFAUT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {p.connectionType} · {p.selectedDpi} DPI · {p.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CURRENCY & NUMBER FORMATTING */}
        {activeTab === 'currency' && (
          <div className="space-y-5 bg-slate-950 p-5 rounded-lg border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Paramètres Monétaires & Typographie des Prix
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Code Devise :</label>
                <select
                  value={currencyCode}
                  onChange={(e) => {
                    const c = e.target.value;
                    setCurrencyCode(c);
                    if (c === 'EUR') {
                      setCurrencySymbol('€');
                      setDecimals(2);
                    } else if (c === 'XAF' || c === 'XOF') {
                      setCurrencySymbol('FCFA');
                      setDecimals(0);
                    } else if (c === 'USD') {
                      setCurrencySymbol('$');
                      setDecimals(2);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-750 text-xs rounded px-3 py-1.5 text-slate-200"
                >
                  <option value="EUR">EUR (€) — Euro</option>
                  <option value="XAF">XAF (FCFA) — Franc CFA (Centimes = 0)</option>
                  <option value="USD">USD ($) — Dollar US</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Symbole Affiché :</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 text-xs rounded px-3 py-1.5 text-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Décimales (Exposant) :</label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={decimals}
                  onChange={(e) => setDecimals(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-750 text-xs rounded px-3 py-1.5 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded border border-slate-800 text-xs text-slate-300">
              <span className="font-semibold text-blue-400">Aperçu du rendu typographique : </span>
              {decimals === 0 ? `2 450 ${currencySymbol}` : `14,99 ${currencySymbol}`}
            </div>
          </div>
        )}

        {/* STATION & MOBILE PAIRING */}
        {activeTab === 'station' && (
          <div className="space-y-4 bg-slate-950 p-5 rounded-lg border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Configuration du Poste Local & Appairage
            </h3>
            <p className="text-xs text-slate-400">
              Permet aux terminaux mobiles et douchettes Wi-Fi de scanner des articles directement dans un lot de travail en cours.
            </p>

            <div className="p-4 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono font-semibold text-slate-200">
                  Station ID : {store.tursoConfig.tableName || 'PC-CENTRAL-01'}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Protocole : estudio-pair-v2 · Port 3000
                </div>
              </div>

              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs rounded font-medium">
                Prêt pour appairage
              </span>
            </div>
          </div>
        )}

        {/* BACKUP & RESTORE */}
        {activeTab === 'backup' && (
          <div className="space-y-5 bg-slate-950 p-5 rounded-lg border border-slate-800">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Sauvegarde Complète & Restauration
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Exporte l'intégralité des gabarits, travaux de production, catalogue, paramètres et journal d'audit dans une archive JSON certifiée.
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleExportBackup}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded flex items-center gap-2 transition-colors shadow"
              >
                <Download className="w-4 h-4" />
                Générer la sauvegarde (JSON)
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleRestoreFile}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Restaurer depuis une sauvegarde
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

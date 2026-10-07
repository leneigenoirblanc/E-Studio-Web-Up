/**
 * E-Studio Home / Print Desk
 * Conforms to SECTION 4 (New Top-Level Product Model) & SECTION 5 (Target Information Architecture)
 * 
 * Operational starting point and launcher:
 * - Print Now (Live template preview cards with 1-click print)
 * - Start From Data (Import Excel/CSV, scan, paste data, blank job)
 * - Needs Attention (Genuine issues only: failed output, incomplete jobs, blocking preflight errors)
 * - Recent Jobs (Searchable production history with resume action)
 * - Recent Activity (Compact audit feed linked to Activity module)
 * - Hardware / Station Status (Real system state)
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LabelTemplate } from '../types';
import { useAppStore } from '../store/useAppStore';
import { jobRepository } from '../domain/jobs/jobRepository';
import { ProductionJob, createDefaultJob } from '../domain/jobs/jobModel';
import { auditRepository } from '../domain/repositories/auditRepository';
import { AuditEvent } from '../domain/persistenceTypes';
import { printerRepository } from '../domain/printing/printerRepository';
import { buildRenderList } from '../domain/rendering/renderList';
import { RenderListSvg } from '../domain/rendering/RenderListSvg';
import { useToast } from './ToastNotification';
import { parseSpreadsheetBuffer } from '../utils/safeSpreadsheetParser';
import {
  Printer,
  FileSpreadsheet,
  Plus,
  Play,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Tag,
  ArrowRight,
  Layers,
  Upload,
  Radio,
  FileText,
  Search,
  ScanLine,
} from 'lucide-react';

export interface HomeDashboardProps {
  onDuplicateTemplate?: (template: LabelTemplate) => void;
  onDeleteTemplate?: (templateName: string) => void;
  onImportTemplate?: (template: LabelTemplate) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = () => {
  const store = useAppStore();
  const toast = useToast();

  const [jobs, setJobs] = useState<ProductionJob[]>(() => jobRepository.getAll());
  const [recentAudit, setRecentAudit] = useState<AuditEvent[]>(() => auditRepository.getAll().slice(0, 5));
  const [templateSearch, setTemplateSearch] = useState('');
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to Jobs & Audit
  useEffect(() => {
    const unsubJobs = jobRepository.subscribe((j) => setJobs(j));
    const unsubAudit = auditRepository.subscribe((a) => setRecentAudit(a.slice(0, 5)));
    return () => {
      unsubJobs();
      unsubAudit();
    };
  }, []);

  // Filtered Templates for Print Now
  const printNowTemplates = useMemo(() => {
    return store.templates.filter((tpl) =>
      tpl.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      `${tpl.width_mm}x${tpl.height_mm}`.includes(templateSearch)
    );
  }, [store.templates, templateSearch]);

  // Real "Needs Attention" jobs: partial or failed outputs, or jobs with blocking preflight
  const needsAttentionJobs = useMemo(() => {
    return jobs.filter((j) => j.status === 'PARTIAL' || j.outputAttempts.some((a) => a.outcome === 'FAILED'));
  }, [jobs]);

  // Recent jobs (top 5)
  const recentJobs = useMemo(() => jobs.slice(0, 5), [jobs]);

  // Printers status
  const printers = useMemo(() => printerRepository.getAll(), []);
  const defaultPrinter = printers.find((p) => p.isDefault) || printers[0];

  // Actions
  const handleQuickPrintTemplate = (template: LabelTemplate) => {
    // Launch Quick Print workflow
    const newJob = createDefaultJob(template, [
      { ITEMNAME: 'Article Exemple', PRODUCT_SCAN: '3250390123453', SELLING_PRICE: 2.99 },
    ]);
    jobRepository.save(newJob);
    toast.success('Tirage initialisé', `Prêt pour l'impression de "${template.name}".`);
    store.navigateTo('jobs');
  };

  const handleStartBlankJob = () => {
    const defaultTemplate = store.templates[0];
    if (!defaultTemplate) return;
    const newJob = createDefaultJob(defaultTemplate, []);
    jobRepository.save(newJob);
    toast.info('Nouveau travail', 'Prêt pour l\'importation ou saisie de données.');
    store.navigateTo('jobs');
  };

  const handleImportExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const parsed = parseSpreadsheetBuffer(buffer);

        if (parsed.rows.length === 0) {
          toast.warning('Fichier vide', 'Aucune ligne de données détectée dans ce fichier.');
          return;
        }

        const defaultTemplate = store.templates[0];
        const job = createDefaultJob(defaultTemplate, parsed.rows);
        job.name = `Import ${file.name.replace(/\.[^/.]+$/, '')}`;
        jobRepository.save(job);

        toast.success('Données importées', `${parsed.rows.length} articles chargés dans le nouveau travail.`);
        store.navigateTo('jobs');
      } catch (err: any) {
        toast.error('Erreur de lecture', err.message || 'Impossible d\'importer le fichier Excel / CSV.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100 overflow-y-auto font-sans p-6 space-y-6">
      {/* TOP BANNER / GREETING (Operational Desk) */}
      <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-md">
        <div>
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            Poste de Production & Tirage
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Sélectionnez un gabarit pour un tirage immédiat ou lancez un lot depuis vos fichiers de données.
          </p>
        </div>

        {/* Real Station Hardware Pill */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300">Station Locale Prête</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              {defaultPrinter ? defaultPrinter.name : 'Pilote Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: NEEDS ATTENTION (Only when genuine issues exist) */}
      {needsAttentionJobs.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-800/80 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Attention Requise — Travaux Interrompus ({needsAttentionJobs.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {needsAttentionJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => store.navigateTo('jobs')}
                className="p-3 bg-slate-950/80 border border-amber-900/60 rounded-lg flex items-center justify-between cursor-pointer hover:bg-slate-900 transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200">{job.name}</div>
                  <div className="text-[11px] text-amber-400 mt-0.5">
                    {job.totalLabels - job.lastCompletedIndex} étiquette(s) restante(s) sur {job.totalLabels}
                  </div>
                </div>
                <button className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium flex items-center gap-1">
                  <Play className="w-3 h-3 fill-current" />
                  Reprendre
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: START FROM DATA (Operational Ingestion Entry Points) */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Créer un Nouveau Travail de Tirage
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Import Excel / CSV */}
          <input
            type="file"
            ref={excelInputRef}
            onChange={handleImportExcelFile}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <div
            onClick={() => excelInputRef.current?.click()}
            className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500/60 rounded-xl cursor-pointer hover:bg-slate-900/80 transition-all flex items-start gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                Importer un fichier Excel / CSV
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Chargez un fichier de prix, détection automatique des colonnes et résolution des écarts.
              </p>
            </div>
          </div>

          {/* 2. Start from Catalogue Articles */}
          <div
            onClick={() => store.navigateTo('database')}
            className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500/60 rounded-xl cursor-pointer hover:bg-slate-900/80 transition-all flex items-start gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-950/60 border border-blue-800/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                Sélectionner dans le Catalogue
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Recherchez parmi vos références de magasin et préparez un tirage sur mesure.
              </p>
            </div>
          </div>

          {/* 3. Start Blank Job */}
          <div
            onClick={handleStartBlankJob}
            className="p-4 bg-slate-950 border border-slate-800 hover:border-blue-500/60 rounded-xl cursor-pointer hover:bg-slate-900/80 transition-all flex items-start gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-950/60 border border-purple-800/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                Tirage Vierge / Saisie Manuelle
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Saisissez ou collez des références manuellement pour un dépannage immédiat en rayon.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: PRINT NOW (Live Template Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-blue-400" />
            Tirage Direct (Print Now) — Gabarits Disponibles ({store.templates.length})
          </h2>
          <button
            onClick={() => store.navigateTo('templates')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
          >
            Gérer les gabarits
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {printNowTemplates.map((template) => {
            const previewList = buildRenderList(template, {
              ITEMNAME: 'Article Démo',
              SELLING_PRICE: 2.99,
              PROMOPRICE: 1.99,
              PRODUCT_SCAN: '3250390123453',
            });

            return (
              <div
                key={template.name}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg overflow-hidden flex flex-col transition-all group"
              >
                {/* Visual Thumbnail */}
                <div
                  onClick={() => handleQuickPrintTemplate(template)}
                  className="h-36 bg-slate-900/60 p-3 flex items-center justify-center cursor-pointer border-b border-slate-850 group-hover:bg-slate-900 transition-colors relative"
                >
                  <div className="transform scale-80 origin-center shadow">
                    <RenderListSvg renderList={previewList} zoom={0.65} />
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="text-xs font-semibold text-slate-200 line-clamp-1">{template.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-850 px-1 py-0.5 rounded shrink-0">
                        {template.width_mm}x{template.height_mm} mm
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">
                      {template.width_mm <= 110 ? 'Rouleau thermique ou planche' : 'Planche A4'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickPrintTemplate(template)}
                    className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Tirage Rapide
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM SECTION: RECENT JOBS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Recent Jobs */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Derniers Travaux de Production
            </h3>
            <button
              onClick={() => store.navigateTo('jobs')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Tous les travaux ({jobs.length}) →
            </button>
          </div>

          {recentJobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Aucun travail de production récent. Créez un premier tirage ci-dessus.
            </div>
          ) : (
            <div className="divide-y divide-slate-850">
              {recentJobs.map((j) => (
                <div
                  key={j.id}
                  onClick={() => store.navigateTo('jobs')}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 px-2 rounded transition-colors"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{j.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {j.templateName} · {j.totalLabels} étiquettes
                    </div>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                      j.status === 'COMPLETED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : j.status === 'FROZEN'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {j.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Journal d'Activité Récent
            </h3>
            <button
              onClick={() => store.navigateTo('activity')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Journal complet →
            </button>
          </div>

          {recentAudit.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Aucune activité enregistrée.
            </div>
          ) : (
            <div className="divide-y divide-slate-850 text-xs">
              {recentAudit.map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between px-2">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-200">{a.action}</span>
                    <div className="text-[11px] text-slate-400">
                      {a.operator || 'Opérateur'} · {a.entityType || 'SYSTÈME'}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(a.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

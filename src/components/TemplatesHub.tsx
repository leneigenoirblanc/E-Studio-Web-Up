/**
 * E-Studio Templates Operational Hub
 * Conforms to SECTION 5 & 20 (Template Management System)
 * 
 * Reusable design definitions with versioning, stock compatibility, and 1-click Quick Print launch.
 */

import React, { useState, useMemo, useRef } from 'react';
import { LabelTemplate } from '../types';
import { useAppStore } from '../store/useAppStore';
import { buildRenderList } from '../domain/rendering/renderList';
import { RenderListSvg } from '../domain/rendering/RenderListSvg';
import { jobRepository } from '../domain/jobs/jobRepository';
import { createDefaultJob } from '../domain/jobs/jobModel';
import { useToast } from './ToastNotification';
import {
  Tag,
  Search,
  Plus,
  Play,
  Copy,
  Trash2,
  Download,
  Upload,
  Layers,
  Edit3,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface TemplatesHubProps {
  onSelectToEdit: (tpl: LabelTemplate) => void;
  onCreateNew: () => void;
}

export const TemplatesHub: React.FC<TemplatesHubProps> = ({ onSelectToEdit, onCreateNew }) => {
  const store = useAppStore();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SHELF' | 'PROMO' | 'ROLL'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTemplates = useMemo(() => {
    return store.templates.filter((tpl) => {
      const matchSearch =
        tpl.name.toLowerCase().includes(search.toLowerCase()) ||
        `${tpl.width_mm}x${tpl.height_mm}`.includes(search);
      if (!matchSearch) return false;

      if (filterType === 'ALL') return true;
      if (filterType === 'SHELF') return tpl.height_mm <= 45 && !tpl.name.toLowerCase().includes('promo');
      if (filterType === 'PROMO') return tpl.name.toLowerCase().includes('promo') || tpl.width_mm >= 140;
      if (filterType === 'ROLL') return tpl.width_mm <= 110 && tpl.height_mm <= 80;
      return true;
    });
  }, [store.templates, search, filterType]);

  const handleStartQuickJob = (template: LabelTemplate) => {
    // Generate job with sample/catalogue rows
    const job = createDefaultJob(template, [
      { ITEMNAME: 'Article Exemple', PRODUCT_SCAN: '3250390123453', SELLING_PRICE: 2.99 },
    ]);
    jobRepository.save(job);
    toast.success('Travail créé', `Travail lancé pour le gabarit "${template.name}".`);
    store.navigateTo('jobs');
  };

  const handleExportTemplate = (template: LabelTemplate) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${template.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.info('Exportation', `Gabarit "${template.name}" exporté.`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.name && parsed.width_mm && parsed.height_mm) {
          await store.importTemplate(parsed);
          toast.success('Gabarit importé', `Le gabarit "${parsed.name}" a été ajouté.`);
        } else {
          toast.error('Format invalide', 'Le fichier JSON ne contient pas un gabarit valide.');
        }
      } catch {
        toast.error('Erreur', 'Impossible de lire le fichier JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Header bar */}
      <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
            <Tag className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">Gabarits d'Étiquettes ({store.templates.length})</h1>
            <p className="text-[11px] text-slate-400">Bibliothèque officielle des modèles et versions publiées</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Importer JSON
          </button>
          <button
            onClick={onCreateNew}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau Gabarit
          </button>
        </div>
      </div>

      {/* Filter and search toolbar */}
      <div className="h-11 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/30 shrink-0">
        <div className="flex items-center gap-3 w-96">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou dimension..."
              className="w-full bg-slate-900 border border-slate-750 text-xs rounded pl-8 pr-2.5 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {(['ALL', 'SHELF', 'PROMO', 'ROLL'] as const).map((ft) => (
            <button
              key={ft}
              onClick={() => setFilterType(ft)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterType === ft
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-850 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {ft === 'ALL'
                ? 'Tous les formats'
                : ft === 'SHELF'
                ? 'Rayon Standard'
                : ft === 'PROMO'
                ? 'Affiches Promo'
                : 'Rouleaux Thermiques'}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid View */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredTemplates.map((template) => {
            // Build quick live thumbnail preview
            const previewList = buildRenderList(template, {
              ITEMNAME: 'Article Exemple',
              SELLING_PRICE: 2.99,
              PROMOPRICE: 1.99,
              PRODUCT_SCAN: '3250390123453',
            });

            return (
              <div
                key={template.name}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg overflow-hidden flex flex-col transition-all group hover:shadow-xl hover:shadow-black/40"
              >
                {/* Visual Preview Box */}
                <div
                  onClick={() => onSelectToEdit(template)}
                  className="h-44 bg-slate-900/80 p-4 flex items-center justify-center cursor-pointer border-b border-slate-850 group-hover:bg-slate-900 transition-colors relative overflow-hidden"
                >
                  <div className="transform scale-90 group-hover:scale-95 transition-transform origin-center shadow-lg">
                    <RenderListSvg renderList={previewList} zoom={0.75} />
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-600/90 text-white flex items-center gap-1 shadow">
                      <Edit3 className="w-2.5 h-2.5" />
                      Modifier
                    </span>
                  </div>
                </div>

                {/* Info & Metadata */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3
                        onClick={() => onSelectToEdit(template)}
                        className="text-xs font-semibold text-slate-100 hover:text-blue-400 cursor-pointer line-clamp-1"
                      >
                        {template.name}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-850 px-1.5 py-0.5 rounded shrink-0">
                        {template.width_mm}x{template.height_mm} mm
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1 mb-3">
                      {(template.items?.length || (template as any).elements?.length || 0)} éléments ·{' '}
                      {template.width_mm <= 110 ? 'Rouleau thermique ou planche' : 'Planche A4'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="pt-2.5 border-t border-slate-850/80 flex items-center justify-between">
                    <button
                      onClick={() => handleStartQuickJob(template)}
                      className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      title="Créer un tirage avec ce gabarit"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Imprimer
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSelectToEdit(template)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                        title="Ouvrir dans l'Éditeur"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleExportTemplate(template)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                        title="Exporter en fichier JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => store.duplicateTemplate(template.name)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                        title="Dupliquer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => store.deleteTemplate(template.name)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

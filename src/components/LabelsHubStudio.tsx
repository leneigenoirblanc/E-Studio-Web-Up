import React, { useState } from 'react';
import {
  Grid,
  FileText,
  Plus,
  Copy,
  Trash2,
  Edit,
  Eye,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { LabelFormat, FormatCategory } from '../domain/printing/types';
import { formatRepository } from '../domain/printing/formatRepository';
import { LabelTemplate } from '../types';
import { CreateLabelFormatWizard } from './wizards/CreateLabelFormatWizard';
import { useToast } from './ToastNotification';
import { useAppStore } from '../store/useAppStore';

interface LabelsHubStudioProps {
  onSelectTemplateToEdit: (tpl: LabelTemplate) => void;
  onSelectTemplateToGenerate: (tpl: LabelTemplate) => void;
  onCreateNewTemplate: () => void;
}

export const LabelsHubStudio: React.FC<LabelsHubStudioProps> = ({
  onSelectTemplateToEdit,
  onSelectTemplateToGenerate,
  onCreateNewTemplate,
}) => {
  const toast = useToast();
  const { templates, duplicateTemplate, deleteTemplate, navigateTo } = useAppStore();

  const [activeTab, setActiveTab] = useState<'templates' | 'formats'>('formats');
  const [formats, setFormats] = useState<LabelFormat[]>(formatRepository.getAll());
  const [isFormatWizardOpen, setIsFormatWizardOpen] = useState(false);
  const [formatSearch, setFormatSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [templateSearch, setTemplateSearch] = useState('');

  // Delete confirmation for custom format
  const [deletingFormat, setDeletingFormat] = useState<LabelFormat | null>(null);

  const refreshFormats = () => {
    setFormats([...formatRepository.getAll()]);
  };

  const handleDuplicateFormat = (fmt: LabelFormat) => {
    const dup = formatRepository.duplicateFormat(fmt.id);
    if (dup) {
      refreshFormats();
      toast.success(
        'Format dupliqué',
        `Création de "${dup.name}". Vous pouvez le personnaliser librement.`
      );
    }
  };

  const handleDeleteFormatConfirm = () => {
    if (!deletingFormat) return;
    formatRepository.deleteCustomFormat(deletingFormat.id);
    refreshFormats();
    setDeletingFormat(null);
    toast.warning('Format supprimé', 'Le format personnalisé a été retiré.');
  };

  const filteredFormats = formats.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(formatSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(formatSearch.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(templateSearch.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-blue-400" />
            <span>Bibliothèque d'Étiquettes &amp; Formats</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Formats physiques indépendants des gabarits graphiques (Règle d'or : Format ≠ Gabarit)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'formats' ? (
            <button
              onClick={() => setIsFormatWizardOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un format</span>
            </button>
          ) : (
            <button
              onClick={onCreateNewTemplate}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un gabarit</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex items-center gap-4">
        <button
          onClick={() => setActiveTab('formats')}
          className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'formats'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Formats Physiques ({formats.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Gabarits de Conception ({templates.length})</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* TAB 1: Formats */}
        {activeTab === 'formats' && (
          <div className="space-y-4">
            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou dimension..."
                  value={formatSearch}
                  onChange={(e) => setFormatSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-1.5 flex-wrap">
                {[
                  'all',
                  'Small',
                  'Standard Retail',
                  'Shelf / Supermarket',
                  'Large / Product',
                  'Continuous',
                  'Sheet',
                ].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      categoryFilter === c
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {c === 'all' ? 'Toutes catégories' : c}
                  </button>
                ))}
              </div>
            </div>

            {/* Formats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFormats.map((f) => (
                <div
                  key={f.id}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {f.category}
                      </span>
                      {f.isBuiltIn ? (
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                          <Lock className="w-3 h-3 text-slate-500" />
                          Système
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Personnalisé
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-white text-sm mb-0.5">{f.name}</h3>
                    <p className="text-xs text-slate-400 mb-3">{f.description}</p>

                    {/* Dimensions & Characteristics Box */}
                    <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800/80 mb-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dimensions :</span>
                        <span className="font-bold text-slate-200">
                          {f.width} × {f.height} mm ({(f.width / 25.4).toFixed(2)}″ × {(f.height / 25.4).toFixed(2)}″)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Imprimable :</span>
                        <span className="font-semibold text-emerald-400">
                          {f.printableWidth} × {f.printableHeight} mm
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Support :</span>
                        <span className="text-slate-300">
                          {f.mediaTypeId} {f.columns > 1 ? `(Grille ${f.columns}×${f.rows})` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (System presets: Duplicate / Use; Custom: Edit / Delete) */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleDuplicateFormat(f)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-400" />
                      <span>Dupliquer</span>
                    </button>

                    {!f.isBuiltIn && (
                      <button
                        onClick={() => setDeletingFormat(f)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
                        title="Supprimer ce format personnalisé"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Templates */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher un gabarit..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((t) => (
                <div
                  key={t.name}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {t.width_mm} × {t.height_mm} mm
                      </span>
                      <span className="text-[10px] font-semibold text-blue-400">
                        {t.items?.length || 0} éléments
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm mb-1">{t.name}</h3>
                    <p className="text-xs text-slate-400 mb-3">
                      Gabarit vectoriel prêt pour tirage et personnalisation
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => onSelectTemplateToEdit(t)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Concevoir</span>
                    </button>
                    <button
                      onClick={() => onSelectTemplateToGenerate(t)}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tirer</span>
                    </button>
                    <button
                      onClick={async () => {
                        const cloned = await duplicateTemplate(t.name);
                        if (cloned) {
                          toast.success('Gabarit dupliqué', `Création de "${cloned.name}"`);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                      title="Dupliquer le gabarit"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Format Wizard Modal */}
      <CreateLabelFormatWizard
        isOpen={isFormatWizardOpen}
        onClose={() => setIsFormatWizardOpen(false)}
        onFormatCreated={(newFmt, createTemplateNow) => {
          refreshFormats();
          toast.success('Format créé', `Le format ${newFmt.name} est disponible.`);
          if (createTemplateNow) {
            onCreateNewTemplate();
          }
        }}
      />

      {/* Delete Confirmation Modal with dependency check */}
      {deletingFormat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-white text-base">Supprimer "{deletingFormat.name}" ?</h3>
            </div>
            <p className="text-xs text-slate-300">
              Êtes-vous sûr de vouloir supprimer ce format physique ? Les gabarits qui utilisaient ce format conserveront leurs dimensions mais n'auront plus ce profil lié.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingFormat(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteFormatConfirm}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

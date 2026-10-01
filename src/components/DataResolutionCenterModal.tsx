/**
 * Data Resolution Center Modal
 * Interface d'arbitrage et d'enrichissement entre le fichier importé
 * et le catalogue canonique de référence.
 */

import React, { useState } from 'react';
import {
  ProductionDataset,
  EffectiveProduct,
  ResolutionConflict,
  ResolutionPolicy,
  DEFAULT_RESOLUTION_POLICY,
} from '../domain/resolution/types';
import { resolutionEngine } from '../domain/resolution/resolutionEngine';
import { referenceCatalogRepository } from '../domain/resolution/referenceCatalogRepository';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Layers,
  Database,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  FileSpreadsheet,
  Lock,
  Sparkles,
  Search,
  Tag,
  Link,
  PlusCircle,
} from 'lucide-react';

interface DataResolutionCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: ProductionDataset | null;
  onApplyResolvedDataset: (frozenDataset: ProductionDataset) => void;
}

export const DataResolutionCenterModal: React.FC<DataResolutionCenterModalProps> = ({
  isOpen,
  onClose,
  dataset: initialDataset,
  onApplyResolvedDataset,
}) => {
  const [workingDataset, setWorkingDataset] = useState<ProductionDataset | null>(initialDataset);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'conflicts' | 'unresolved' | 'matched'>('all');
  const [policy, setPolicy] = useState<ResolutionPolicy>(DEFAULT_RESOLUTION_POLICY);
  const [searchFilter, setSearchFilter] = useState('');

  // Update working dataset when prop changes
  React.useEffect(() => {
    if (initialDataset) {
      setWorkingDataset(JSON.parse(JSON.stringify(initialDataset)));
      if (initialDataset.products.length > 0) {
        setSelectedProductId(initialDataset.products[0].id);
      }
    }
  }, [initialDataset]);

  if (!isOpen || !workingDataset) return null;

  const products = workingDataset.products;
  const filteredProducts = products.filter((p) => {
    if (filterTab === 'conflicts' && p.conflicts.length === 0) return false;
    if (filterTab === 'unresolved' && p.resolutionStatus !== 'UNRESOLVED') return false;
    if (filterTab === 'matched' && (p.conflicts.length > 0 || p.resolutionStatus === 'UNRESOLVED')) return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = p.identity.name.toLowerCase().includes(q);
      const matchScan = p.identifiers.primaryScan.toLowerCase().includes(q);
      const matchPart = p.identifiers.partNumber?.toLowerCase().includes(q) || false;
      return matchName || matchScan || matchPart;
    }
    return true;
  });

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleResolveConflict = (conflictIndex: number, choice: 'USE_REFERENCE' | 'USE_IMPORT') => {
    if (!selectedProduct) return;

    setWorkingDataset((prev) => {
      if (!prev) return prev;
      const updatedProducts = prev.products.map((p) => {
        if (p.id !== selectedProduct.id) return p;
        const newConflicts = [...p.conflicts];
        const conflict = newConflicts[conflictIndex];
        if (!conflict) return p;

        conflict.resolutionChoice = choice;

        const updatedIdentity = { ...p.identity };
        if (conflict.field === 'brand') {
          updatedIdentity.brand = choice === 'USE_REFERENCE' ? conflict.referenceValue : conflict.importValue;
        } else if (conflict.field === 'name') {
          updatedIdentity.name = choice === 'USE_REFERENCE' ? conflict.referenceValue : conflict.importValue;
        }

        const newSourceMap = { ...p.sourceMap };
        newSourceMap[conflict.field] = {
          source: choice === 'USE_REFERENCE' ? 'REFERENCE' : 'IMPORT',
          confidence: 1.0,
        };

        return {
          ...p,
          identity: updatedIdentity,
          sourceMap: newSourceMap,
          conflicts: newConflicts.filter((_, idx) => idx !== conflictIndex),
          resolutionStatus: (newConflicts.length <= 1 ? 'EXACT_MATCH' : 'CONFLICT') as any,
        };
      });

      return {
        ...prev,
        products: updatedProducts,
        stats: {
          ...prev.stats,
          conflicts: Math.max(0, prev.stats.conflicts - 1),
          exactMatches: prev.stats.exactMatches + 1,
        },
      };
    });
  };

  const handleCreateCanonical = (product: EffectiveProduct) => {
    // Crée une nouvelle référence canonique dans le catalogue
    const newCanonical = {
      id: `EST-PROD-${Date.now().toString().slice(-6)}`,
      status: 'active' as const,
      name: product.identity.name,
      brand: product.identity.brand,
      description: product.identity.description,
      department: product.identity.department,
      category: product.identity.category,
      unitWeightValue: product.packaging?.unitWeightValue,
      unitWeightUnit: product.packaging?.unitWeightUnit,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const identifiers: any[] = [];
    if (product.identifiers.primaryScan) {
      identifiers.push({
        productId: newCanonical.id,
        type: 'SCAN_CODE',
        value: product.identifiers.primaryScan,
        normalizedValue: product.identifiers.primaryScan,
        isPrimary: true,
        status: 'active',
      });
    }
    if (product.identifiers.partNumber) {
      identifiers.push({
        productId: newCanonical.id,
        type: 'SUPPLIER_PARTNO',
        value: product.identifiers.partNumber,
        normalizedValue: product.identifiers.partNumber,
        namespace: product.identifiers.namespace || 'DEFAULT',
        isPrimary: false,
        status: 'active',
      });
    }

    referenceCatalogRepository.saveCanonicalProduct(newCanonical, identifiers, 'USER');

    // Met à jour le produit effectif
    setWorkingDataset((prev) => {
      if (!prev) return prev;
      const updated = prev.products.map((p) => {
        if (p.id !== product.id) return p;
        return {
          ...p,
          canonicalProductId: newCanonical.id,
          resolutionStatus: 'EXACT_MATCH' as const,
          sourceMap: {
            ...p.sourceMap,
            name: { source: 'USER' as const, confidence: 1.0 },
          },
        };
      });
      return {
        ...prev,
        products: updated,
        stats: {
          ...prev.stats,
          unresolved: Math.max(0, prev.stats.unresolved - 1),
          newProducts: prev.stats.newProducts + 1,
        },
      };
    });
  };

  const handleCommitAndFreeze = () => {
    if (!workingDataset) return;
    const frozen = resolutionEngine.freezeDataset(workingDataset);
    onApplyResolvedDataset(frozen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Centre de Résolution des Données</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Pipeline Industriel
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Croisement du fichier de travail (<strong>{workingDataset.sourceFileName || 'Dataset Import'}</strong>) avec la base de référence
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800 text-xs">
          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Lignes Importées</div>
              <div className="text-base font-bold text-white">{workingDataset.stats.total}</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Reconnus & Enrichis</div>
              <div className="text-base font-bold text-emerald-400">
                {workingDataset.stats.exactMatches + workingDataset.stats.aliasMatches}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Conflits d'Attributs</div>
              <div className="text-base font-bold text-amber-400">{workingDataset.stats.conflicts}</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Non Référencés</div>
              <div className="text-base font-bold text-rose-400">{workingDataset.stats.unresolved}</div>
            </div>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left List */}
          <div className="w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-950/20">
            {/* Filter Tabs & Search */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg text-[11px]">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`flex-1 py-1 text-center font-medium rounded-md transition ${
                    filterTab === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tous ({products.length})
                </button>
                <button
                  onClick={() => setFilterTab('conflicts')}
                  className={`flex-1 py-1 text-center font-medium rounded-md transition ${
                    filterTab === 'conflicts' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Conflits ({workingDataset.stats.conflicts})
                </button>
                <button
                  onClick={() => setFilterTab('unresolved')}
                  className={`flex-1 py-1 text-center font-medium rounded-md transition ${
                    filterTab === 'unresolved' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Inconnus ({workingDataset.stats.unresolved})
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filtrer code, nom, SKU..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Product Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {filteredProducts.map((p) => {
                const isSelected = p.id === selectedProduct?.id;
                const hasConflict = p.conflicts.length > 0;
                const isUnresolved = p.resolutionStatus === 'UNRESOLVED';

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={`w-full text-left p-3 transition flex items-start justify-between gap-2 ${
                      isSelected ? 'bg-indigo-950/40 border-l-4 border-indigo-500' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{p.identity.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                        {p.identifiers.primaryScan || p.identifiers.partNumber || 'Sans identifiant'}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                        {p.identity.brand && (
                          <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded">
                            {p.identity.brand}
                          </span>
                        )}
                        {p.commercial.sellingPrice !== undefined && (
                          <span className="text-emerald-400 font-bold">
                            {p.commercial.sellingPrice} {p.commercial.currency || 'FCFA'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {hasConflict && (
                        <span className="p-1 rounded bg-amber-500/20 text-amber-400 inline-block" title="Conflit détecté">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {isUnresolved && (
                        <span className="p-1 rounded bg-rose-500/20 text-rose-400 inline-block" title="Non référencé">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {!hasConflict && !isUnresolved && (
                        <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 inline-block" title="Résolu">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Inspector */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {selectedProduct ? (
              <>
                {/* Active Item Identification Banner */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono text-indigo-400 flex items-center gap-2">
                      <span>Réf. Canonique : <strong>{selectedProduct.canonicalProductId}</strong></span>
                      {selectedProduct.matchMethod && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          Méthode : {selectedProduct.matchMethod}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{selectedProduct.identity.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>Code-barres : <strong className="text-white">{selectedProduct.identifiers.primaryScan}</strong></span>
                      {selectedProduct.identifiers.partNumber && (
                        <span>Part No : <strong className="text-white">{selectedProduct.identifiers.partNumber}</strong></span>
                      )}
                      {selectedProduct.identifiers.namespace && (
                        <span>Namespace : <strong className="text-white">{selectedProduct.identifiers.namespace}</strong></span>
                      )}
                    </div>
                  </div>

                  {selectedProduct.resolutionStatus === 'UNRESOLVED' && (
                    <button
                      onClick={() => handleCreateCanonical(selectedProduct)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Ajouter au Catalogue Référence</span>
                    </button>
                  )}
                </div>

                {/* Conflicts Resolution Box if Any */}
                {selectedProduct.conflicts.length > 0 && (
                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Conflits détectés entre le fichier importé et la base de référence :</span>
                    </div>

                    {selectedProduct.conflicts.map((conf, idx) => (
                      <div key={idx} className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs space-y-2">
                        <div className="text-slate-300">
                          Champ : <strong className="text-amber-400 uppercase">{conf.field}</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div className="p-2 rounded bg-slate-950 border border-slate-800">
                            <span className="text-slate-400 block">Base de référence :</span>
                            <span className="font-semibold text-white">{String(conf.referenceValue)}</span>
                          </div>
                          <div className="p-2 rounded bg-slate-950 border border-slate-800">
                            <span className="text-slate-400 block">Fichier importé :</span>
                            <span className="font-semibold text-white">{String(conf.importValue)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleResolveConflict(idx, 'USE_REFERENCE')}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium transition"
                          >
                            Conserver Référence ({String(conf.referenceValue)})
                          </button>
                          <button
                            onClick={() => handleResolveConflict(idx, 'USE_IMPORT')}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition"
                          >
                            Utiliser Valeur Importée ({String(conf.importValue)})
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Source-Aware Resolved Data Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Données Finales Résolues & Provenance (Source Map)
                    </h4>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> [REFERENCE]
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> [IMPORT]
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> [COMPUTED]
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl divide-y divide-slate-800/80 text-xs">
                    {/* Désignation */}
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-400">Désignation / Nom</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{selectedProduct.identity.name}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {selectedProduct.sourceMap.name?.source || 'REFERENCE'}
                        </span>
                      </div>
                    </div>

                    {/* Marque */}
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-400">Marque</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{selectedProduct.identity.brand || '—'}</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {selectedProduct.sourceMap.brand?.source || 'REFERENCE'}
                        </span>
                      </div>
                    </div>

                    {/* Prix de Vente */}
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-400">Prix de Vente Normal</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {selectedProduct.commercial.sellingPrice ?? 0} {selectedProduct.commercial.currency}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          IMPORT
                        </span>
                      </div>
                    </div>

                    {/* Prix Promo */}
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-400">Prix Promotionnel</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-400">
                          {selectedProduct.commercial.promoPrice ? `${selectedProduct.commercial.promoPrice} ${selectedProduct.commercial.currency}` : 'Aucune promo'}
                        </span>
                        {selectedProduct.commercial.promoPrice && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            IMPORT
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remise Calculée */}
                    {selectedProduct.commercial.discountPercent && (
                      <div className="p-3 flex items-center justify-between">
                        <span className="text-slate-400">Remise Calculée</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-400">-{selectedProduct.commercial.discountPercent}%</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            COMPUTED
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Poids / Contenance */}
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-400">Poids Net / Volume</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {selectedProduct.packaging?.unitWeightValue
                            ? `${selectedProduct.packaging.unitWeightValue} ${selectedProduct.packaging.unitWeightUnit || 'g'}`
                            : 'Non renseigné'}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          REFERENCE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Sélectionnez un article dans la liste pour examiner sa résolution
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <Database className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-400">Mode Catalogue :</span>
            <select
              value={policy.importMode}
              onChange={(e) => setPolicy({ ...policy, importMode: e.target.value as any })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden"
            >
              <option value="ENRICH_AND_SAVE">Enrichir et Sauvegarder les Nouveaux Articles</option>
              <option value="READ_ONLY_ENRICH">Lecture Seule (Ne pas modifier le catalogue)</option>
              <option value="SYNCHRONIZE">Synchroniser les Conflits Validés</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              Annuler
            </button>

            <button
              onClick={handleCommitAndFreeze}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <Lock className="w-4 h-4" />
              <span>Figer & Envoyer à l'Impression ({workingDataset.products.length} articles)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

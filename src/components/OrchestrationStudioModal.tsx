import React, { useState, useEffect, useMemo } from 'react';
import {
  RuleDefinition,
  RuleTrigger,
  RuleMode,
  RuleActionType,
  RuleOperator,
  RuleSet,
  RuleSimulationResult,
} from '../domain/orchestration/types';
import {
  rulesRepository,
  DEFAULT_ORCHESTRATION_RULES,
} from '../domain/orchestration/rulesRepository';
import { ruleOrchestrator } from '../domain/orchestration/ruleOrchestrator';
import { databaseService } from '../services/databaseService';
import { ProductRecord } from '../types';
import {
  Cpu,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Copy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Code,
  Sliders,
  Filter,
  Search,
  Check,
  Zap,
  Tag,
  ShieldCheck,
  FolderGit2,
  History,
  X,
} from 'lucide-react';

interface OrchestrationStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (templateId: string) => void;
}

export const OrchestrationStudioModal: React.FC<OrchestrationStudioModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'rules' | 'builder' | 'simulator' | 'sets' | 'versions'>('rules');

  // Rules state
  const [rules, setRules] = useState<RuleDefinition[]>(() => rulesRepository.getAll());
  const [ruleSets, setRuleSets] = useState<RuleSet[]>(() => rulesRepository.getAllRuleSets());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrigger, setFilterTrigger] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterSet, setFilterSet] = useState<string>('ALL');

  // Rule Builder Form State
  const [editingRule, setEditingRule] = useState<RuleDefinition | null>(null);
  const [builderName, setBuilderName] = useState('');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderTrigger, setBuilderTrigger] = useState<RuleTrigger>(RuleTrigger.BEFORE_PRICING);
  const [builderPriority, setBuilderPriority] = useState<number>(500);
  const [builderMode, setBuilderMode] = useState<RuleMode>('gui');
  const [builderStopProcessing, setBuilderStopProcessing] = useState(false);
  const [builderSetId, setBuilderSetId] = useState<string>('set-general-retail');
  const [builderScopeDept, setBuilderScopeDept] = useState('');
  const [builderScopeStore, setBuilderScopeStore] = useState('');

  // GUI Conditions State
  const [conditionsList, setConditionsList] = useState<
    { id: string; field: string; operator: RuleOperator; value: string }[]
  >([
    { id: '1', field: 'product.sellingPrice', operator: 'greater_than', value: '0' },
  ]);

  // GUI Actions State
  const [actionsList, setActionsList] = useState<
    { id: string; type: RuleActionType; target: string; value: string; templateId?: string }[]
  >([
    { id: '1', type: 'CALCULATE_DISCOUNT', target: '', value: '' },
  ]);

  // Script Mode State
  const [scriptCode, setScriptCode] = useState(`// E-Studio Sandboxed Script
const price = ctx.product.get('sellingPrice');
const promo = ctx.product.get('promoPrice');

if (promo && promo < price) {
  const discount = ctx.helpers.calcDiscount(price, promo);
  ctx.pricing.set('discountPercent', discount);
  ctx.pricing.set('hasPromo', true);
  ctx.label.setVisible('promo_banner', true);
  ctx.log('Remise calculée : -' + discount + '%');
}`);

  // Simulator State
  const [simProduct, setSimProduct] = useState<ProductRecord | null>(null);
  const [simTrigger, setSimTrigger] = useState<RuleTrigger>(RuleTrigger.BEFORE_PRICING);
  const [simBatchCount, setSimBatchCount] = useState<number>(1);
  const [simResult, setSimResult] = useState<RuleSimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Synchronisation avec le repository
  useEffect(() => {
    const unsub = rulesRepository.subscribe((updated) => {
      setRules(updated);
    });
    return unsub;
  }, []);

  // Charger un produit échantillon par défaut pour le simulateur
  useEffect(() => {
    const prods = databaseService.getProducts();
    if (prods.length > 0 && !simProduct) {
      setSimProduct(prods[0]);
    }
  }, [simProduct]);

  // Filtrage des règles affichées
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchDesc = (r.description || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      if (filterTrigger !== 'ALL' && r.trigger !== filterTrigger) return false;
      if (filterMode !== 'ALL' && r.mode !== filterMode) return false;
      if (filterSet !== 'ALL' && r.ruleSetId !== filterSet) return false;
      return true;
    });
  }, [rules, searchQuery, filterTrigger, filterMode, filterSet]);

  if (!isOpen) return null;

  // Initialiser le builder pour une nouvelle règle
  const handleStartNewRule = () => {
    setEditingRule(null);
    setBuilderName('Nouvelle Règle Métier');
    setBuilderDesc('');
    setBuilderTrigger(RuleTrigger.BEFORE_PRICING);
    setBuilderPriority(500);
    setBuilderMode('gui');
    setBuilderStopProcessing(false);
    setBuilderSetId(ruleSets[0]?.id || 'set-general-retail');
    setBuilderScopeDept('');
    setBuilderScopeStore('');
    setConditionsList([
      { id: '1', field: 'product.sellingPrice', operator: 'greater_than', value: '0' },
    ]);
    setActionsList([
      { id: '1', type: 'CALCULATE_DISCOUNT', target: '', value: '' },
    ]);
    setActiveTab('builder');
  };

  // Éditer une règle existante
  const handleEditRule = (r: RuleDefinition) => {
    setEditingRule(r);
    setBuilderName(r.name);
    setBuilderDesc(r.description || '');
    setBuilderTrigger(r.trigger);
    setBuilderPriority(r.priority);
    setBuilderMode(r.mode);
    setBuilderStopProcessing(Boolean(r.stopProcessing));
    setBuilderSetId(r.ruleSetId || 'set-general-retail');
    setBuilderScopeDept(r.scope.departments?.join(', ') || '');
    setBuilderScopeStore(r.scope.stores?.join(', ') || '');

    if (r.mode === 'gui' && r.conditionGroup?.conditions) {
      setConditionsList(
        r.conditionGroup.conditions.map((c: any, idx: number) => ({
          id: String(idx + 1),
          field: c.field || 'product.sellingPrice',
          operator: c.operator || 'greater_than',
          value: String(c.value ?? ''),
        }))
      );
      if (r.actions) {
        setActionsList(
          r.actions.map((a: any, idx: number) => ({
            id: String(idx + 1),
            type: a.type,
            target: a.target || '',
            value: String(a.value ?? ''),
            templateId: a.templateId,
          }))
        );
      }
    } else if (r.mode === 'script' && r.scriptSource) {
      setScriptCode(r.scriptSource);
    }
    setActiveTab('builder');
  };

  // Sauvegarder la règle depuis le builder
  const handleSaveRule = () => {
    if (!builderName.trim()) {
      alert('Veuillez spécifier un nom de règle.');
      return;
    }

    const depts = builderScopeDept
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const stores = builderScopeStore
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const ruleDef: RuleDefinition = {
      id: editingRule ? editingRule.id : `R-${Date.now().toString().slice(-4)}`,
      name: builderName.trim(),
      description: builderDesc.trim(),
      enabled: editingRule ? editingRule.enabled : true,
      trigger: builderTrigger,
      priority: builderPriority,
      scope: {
        departments: depts.length > 0 ? depts : undefined,
        stores: stores.length > 0 ? stores : undefined,
      },
      mode: builderMode,
      stopProcessing: builderStopProcessing,
      ruleSetId: builderSetId,
      version: editingRule ? editingRule.version : 1,
      createdAt: editingRule ? editingRule.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (builderMode === 'gui') {
      ruleDef.conditionGroup = {
        id: `grp-${Date.now()}`,
        logicalOperator: 'AND',
        conditions: conditionsList.map((c) => ({
          id: c.id,
          field: c.field,
          operator: c.operator,
          value: c.value,
        })),
      };
      ruleDef.actions = actionsList.map((a) => ({
        id: a.id,
        type: a.type,
        target: a.target || undefined,
        value: a.value || undefined,
        templateId: a.templateId || undefined,
      }));
    } else {
      ruleDef.scriptSource = scriptCode;
      ruleDef.scriptLimits = { maxExecutionMs: 250 };
    }

    rulesRepository.save(ruleDef);
    setActiveTab('rules');
  };

  // Lancer une simulation / dry-run
  const handleRunSimulation = () => {
    if (!simProduct) return;
    setSimLoading(true);

    setTimeout(() => {
      const execContext = {
        product: {
          id: simProduct.id,
          itemName: simProduct.ITEMNAME || 'Article Test',
          sellingPrice: simProduct.SELLING_PRICE || 0,
          promoPrice: simProduct.PROMOPRICE,
          barcode: simProduct.PRODUCT_SCAN,
          department: simProduct.DEPT_NAME || simProduct['DEPT NAME'],
          category: simProduct.CATEGORY_NAME,
          brand: simProduct.BRAND_INFO,
          volumeMl: (simProduct as any).VOLUME_ML || ((simProduct as any).UNIT_WEIGHT && String(simProduct.UNIT_WEIGHT).includes('L') ? 1000 : 750),
          unitWeightUnit: (simProduct.WEIGHT_UNIT as any) || 'piece',
          tiers: simProduct.TIERS,
        },
        pricing: {
          regularPrice: simProduct.SELLING_PRICE || 0,
          promoPrice: simProduct.PROMOPRICE,
          hasPromo: Boolean(simProduct.PROMOPRICE && simProduct.PROMOPRICE < simProduct.SELLING_PRICE),
        },
        template: {
          currentTemplateId: 'Balisage Standard 100x50',
        },
        batch: {
          totalCount: simBatchCount,
          currentIndex: 0,
          isFirst: true,
          isLast: true,
        },
        print: {},
        label: {
          elementsVisibility: {},
          elementsText: {},
          elementsColor: {},
        },
      };

      const result = ruleOrchestrator.executeHook(simTrigger, execContext, rules, { dryRun: true });
      setSimResult(result);
      setSimLoading(false);
    }, 60);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative flex flex-col w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight">Plateforme d'Orchestration & Règles Hybrides</h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-400/30">
                  E-Studio Pipeline v2
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Moteur de règles déclaratif GUI, expressions AST, scripts sandboxés et traçabilité en cycle de vie
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleStartNewRule}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une Règle</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-1 py-2">
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'rules'
                  ? 'bg-white text-indigo-700 shadow-xs border border-gray-200 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Catalogue des Règles ({rules.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('builder')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'builder'
                  ? 'bg-white text-indigo-700 shadow-xs border border-gray-200 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Constructeur GUI & Script</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('simulator');
                if (!simResult) handleRunSimulation();
              }}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'simulator'
                  ? 'bg-white text-indigo-700 shadow-xs border border-gray-200 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Play className="w-4 h-4 text-emerald-600" />
              <span>Simulateur Dry-Run & Mode Explain</span>
            </button>

            <button
              onClick={() => setActiveTab('sets')}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'sets'
                  ? 'bg-white text-indigo-700 shadow-xs border border-gray-200 font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FolderGit2 className="w-4 h-4" />
              <span>Ensembles de Règles ({ruleSets.length})</span>
            </button>
          </div>

          <div className="text-xs text-gray-500 font-mono">
            Modèle d'exécution : <span className="text-emerald-700 font-semibold">Read ➔ Decide ➔ Mutate</span>
          </div>
        </div>

        {/* Tab 1: Catalogue des Règles */}
        {activeTab === 'rules' && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* Filtres & Recherche */}
            <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une règle par nom ou mot-clé..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filterTrigger}
                  onChange={(e) => setFilterTrigger(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700"
                >
                  <option value="ALL">Tous les Déclencheurs</option>
                  <option value={RuleTrigger.BEFORE_PRICING}>BEFORE_PRICING (Tarifs)</option>
                  <option value={RuleTrigger.BEFORE_TEMPLATE_RESOLUTION}>BEFORE_TEMPLATE_RESOLUTION (Gabarit)</option>
                  <option value={RuleTrigger.BEFORE_EXPORT}>BEFORE_EXPORT (Export/ZPL)</option>
                  <option value={RuleTrigger.BEFORE_PRINT}>BEFORE_PRINT (Impression)</option>
                </select>

                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700"
                >
                  <option value="ALL">Tous les Modes</option>
                  <option value="gui">GUI (Déclaratif)</option>
                  <option value="script">Script (Sandboxé)</option>
                </select>

                <select
                  value={filterSet}
                  onChange={(e) => setFilterSet(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700"
                >
                  <option value="ALL">Tous les Ensembles</option>
                  {ruleSets.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Liste des Règles sous forme de cartes */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {filteredRules.map((rule) => {
                const priorityColor =
                  rule.priority >= 800
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : rule.priority >= 500
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200';

                return (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-xl border transition-all ${
                      rule.enabled
                        ? 'bg-white border-gray-200 shadow-2xs hover:border-indigo-300'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => rulesRepository.toggle(rule.id)}
                          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            rule.enabled
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 text-transparent hover:bg-gray-300'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-gray-500">[{rule.id}]</span>
                            <h3 className="text-sm font-bold text-gray-900">{rule.name}</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${priorityColor}`}>
                              Prio: {rule.priority}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                              Hook: {rule.trigger}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                              rule.mode === 'gui'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {rule.mode === 'gui' ? 'GUI (AST)' : 'Script (Sandbox)'}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-mono bg-gray-100 text-gray-500 rounded-full">
                              v{rule.version}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-gray-600">{rule.description}</p>

                          {/* Scopes & Conditions Preview */}
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                            {rule.scope.departments && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                                Rayon : {rule.scope.departments.join(', ')}
                              </span>
                            )}
                            {rule.stopProcessing && (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-semibold rounded-md border border-rose-200">
                                🛑 Stop Pipeline
                              </span>
                            )}
                            {rule.mode === 'gui' && rule.conditionGroup && (
                              <span className="text-gray-500">
                                WHEN : {rule.conditionGroup.conditions.length} condition(s) ➔ THEN : {rule.actions?.length || 0} action(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            handleEditRule(rule);
                          }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Éditer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rulesRepository.duplicate(rule.id)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Dupliquer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer la règle [${rule.id}] ${rule.name} ?`)) {
                              rulesRepository.delete(rule.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Constructeur GUI & Script */}
        {activeTab === 'builder' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom de la règle</label>
                <input
                  type="text"
                  value={builderName}
                  onChange={(e) => setBuilderName(e.target.value)}
                  placeholder="ex: Calcul Promo Flash pour Boissons"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ensemble (Rule Set)</label>
                <select
                  value={builderSetId}
                  onChange={(e) => setBuilderSetId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                >
                  {ruleSets.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Objectif</label>
                <input
                  type="text"
                  value={builderDesc}
                  onChange={(e) => setBuilderDesc(e.target.value)}
                  placeholder="Expliquez la logique métier de cette règle..."
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Point d'accroche (Hook)</label>
                <select
                  value={builderTrigger}
                  onChange={(e) => setBuilderTrigger(e.target.value as RuleTrigger)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                >
                  <option value={RuleTrigger.BEFORE_IMPORT}>BEFORE_IMPORT</option>
                  <option value={RuleTrigger.AFTER_IMPORT}>AFTER_IMPORT</option>
                  <option value={RuleTrigger.BEFORE_PRICING}>BEFORE_PRICING (Calculs & Tarifs)</option>
                  <option value={RuleTrigger.AFTER_PRICING}>AFTER_PRICING</option>
                  <option value={RuleTrigger.BEFORE_TEMPLATE_RESOLUTION}>BEFORE_TEMPLATE_RESOLUTION (Choix Gabarit)</option>
                  <option value={RuleTrigger.BEFORE_EXPORT}>BEFORE_EXPORT (Choix ZPL/PDF)</option>
                  <option value={RuleTrigger.BEFORE_PRINT}>BEFORE_PRINT (Routage Imprimante)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Priorité d'exécution</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={builderPriority}
                    onChange={(e) => setBuilderPriority(Number(e.target.value))}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="font-mono text-xs font-bold text-indigo-700 w-12 text-right">{builderPriority}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Arrêt de pipeline</label>
                <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={builderStopProcessing}
                    onChange={(e) => setBuilderStopProcessing(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-700">stopProcessing (ne pas exécuter d'autres règles)</span>
                </label>
              </div>

              <div className="md:col-span-3 grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Périmètre Rayons (séparés par virgule)</label>
                  <input
                    type="text"
                    value={builderScopeDept}
                    onChange={(e) => setBuilderScopeDept(e.target.value)}
                    placeholder="Boissons, Épicerie, Textile (laisser vide = tous)"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Périmètre Magasins / Stores</label>
                  <input
                    type="text"
                    value={builderScopeStore}
                    onChange={(e) => setBuilderScopeStore(e.target.value)}
                    placeholder="Magasin Principal, Dépôt B2B (laisser vide = tous)"
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-gray-700">Mode d'écriture :</span>
              <button
                onClick={() => setBuilderMode('gui')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  builderMode === 'gui'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                GUI Déclaratif (AST Conditions / Actions)
              </button>
              <button
                onClick={() => setBuilderMode('script')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  builderMode === 'script'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Script Sandboxé (JavaScript Isolé)
              </button>
            </div>

            {/* GUI Builder Blocks */}
            {builderMode === 'gui' && (
              <div className="space-y-6">
                {/* Section WHEN */}
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-black rounded">WHEN</span>
                      <span className="text-xs text-gray-600">Conditions déclenchantes (Toutes doivent être vraies)</span>
                    </div>
                    <button
                      onClick={() =>
                        setConditionsList([
                          ...conditionsList,
                          {
                            id: String(Date.now()),
                            field: 'product.sellingPrice',
                            operator: 'greater_than',
                            value: '0',
                          },
                        ])
                      }
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter une condition</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {conditionsList.map((c, index) => (
                      <div key={c.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <span className="text-xs font-bold text-gray-400 w-6">#{index + 1}</span>
                        <select
                          value={c.field}
                          onChange={(e) => {
                            const updated = [...conditionsList];
                            updated[index].field = e.target.value;
                            setConditionsList(updated);
                          }}
                          className="px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-mono"
                        >
                          <option value="product.sellingPrice">product.sellingPrice</option>
                          <option value="product.promoPrice">product.promoPrice</option>
                          <option value="product.barcode">product.barcode</option>
                          <option value="product.department">product.department</option>
                          <option value="product.volumeMl">product.volumeMl</option>
                          <option value="product.unitWeightUnit">product.unitWeightUnit</option>
                          <option value="product.tiers">product.tiers</option>
                          <option value="batch.totalCount">batch.totalCount</option>
                        </select>

                        <select
                          value={c.operator}
                          onChange={(e) => {
                            const updated = [...conditionsList];
                            updated[index].operator = e.target.value as RuleOperator;
                            setConditionsList(updated);
                          }}
                          className="px-2 py-1.5 bg-white border border-gray-300 rounded text-xs"
                        >
                          <option value="equals">égal à (equals)</option>
                          <option value="not_equals">différent de (not equals)</option>
                          <option value="greater_than">supérieur à (&gt;)</option>
                          <option value="less_than">inférieur à (&lt;)</option>
                          <option value="greater_or_equal">supérieur ou égal (&gt;=)</option>
                          <option value="less_or_equal">inférieur ou égal (&lt;=)</option>
                          <option value="contains">contient (contains)</option>
                          <option value="is_empty">est vide (is empty)</option>
                          <option value="is_not_empty">n'est pas vide (is not empty)</option>
                        </select>

                        {!['is_empty', 'is_not_empty'].includes(c.operator) && (
                          <input
                            type="text"
                            value={c.value}
                            onChange={(e) => {
                              const updated = [...conditionsList];
                              updated[index].value = e.target.value;
                              setConditionsList(updated);
                            }}
                            placeholder="Valeur attendue"
                            className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs"
                          />
                        )}

                        {conditionsList.length > 1 && (
                          <button
                            onClick={() => setConditionsList(conditionsList.filter((_, i) => i !== index))}
                            className="p-1 text-gray-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section THEN */}
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-black rounded">THEN</span>
                      <span className="text-xs text-gray-600">Actions à générer et appliquer</span>
                    </div>
                    <button
                      onClick={() =>
                        setActionsList([
                          ...actionsList,
                          { id: String(Date.now()), type: 'USE_TEMPLATE', target: '', value: '', templateId: 'Balisage Simple XL' },
                        ])
                      }
                      className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter une action</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {actionsList.map((a, index) => (
                      <div key={a.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <span className="text-xs font-bold text-gray-400 w-6">#{index + 1}</span>
                        <select
                          value={a.type}
                          onChange={(e) => {
                            const updated = [...actionsList];
                            updated[index].type = e.target.value as RuleActionType;
                            setActionsList(updated);
                          }}
                          className="px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium"
                        >
                          <option value="CALCULATE_DISCOUNT">Calculer remise & activer promo</option>
                          <option value="USE_TEMPLATE">Changer de gabarit (Use Template)</option>
                          <option value="SET_UNIT_PRICE_MODE">Mode Prix au Litre / Kilo</option>
                          <option value="SET_VISIBILITY">Afficher / Masquer un élément</option>
                          <option value="SET_EXPORT_FORMAT">Format d'export (ZPL / PDF)</option>
                          <option value="SET_PRINTER">Assigner une imprimante</option>
                          <option value="SET_FIELD">Définir un champ (Set Field)</option>
                        </select>

                        {a.type === 'USE_TEMPLATE' && (
                          <input
                            type="text"
                            value={a.templateId || ''}
                            onChange={(e) => {
                              const updated = [...actionsList];
                              updated[index].templateId = e.target.value;
                              setActionsList(updated);
                            }}
                            placeholder="Nom exact du gabarit"
                            className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium"
                          />
                        )}

                        {a.type === 'SET_UNIT_PRICE_MODE' && (
                          <select
                            value={a.value}
                            onChange={(e) => {
                              const updated = [...actionsList];
                              updated[index].value = e.target.value;
                              setActionsList(updated);
                            }}
                            className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs"
                          >
                            <option value="PER_LITER">Prix au Litre (PER_LITER)</option>
                            <option value="PER_KG">Prix au Kilo (PER_KG)</option>
                            <option value="NONE">Aucun (NONE)</option>
                          </select>
                        )}

                        {a.type === 'SET_EXPORT_FORMAT' && (
                          <select
                            value={a.value}
                            onChange={(e) => {
                              const updated = [...actionsList];
                              updated[index].value = e.target.value;
                              setActionsList(updated);
                            }}
                            className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs"
                          >
                            <option value="ZPL">Thermique ZPL II</option>
                            <option value="PDF">Planche PDF</option>
                            <option value="PPTX">PowerPoint (.pptx)</option>
                          </select>
                        )}

                        {a.type === 'SET_VISIBILITY' && (
                          <>
                            <input
                              type="text"
                              value={a.target}
                              onChange={(e) => {
                                const updated = [...actionsList];
                                updated[index].target = e.target.value;
                                setActionsList(updated);
                              }}
                              placeholder="ID élément (ex: promo_banner)"
                              className="px-2 py-1.5 bg-white border border-gray-300 rounded text-xs"
                            />
                            <select
                              value={a.value}
                              onChange={(e) => {
                                const updated = [...actionsList];
                                updated[index].value = e.target.value;
                                setActionsList(updated);
                              }}
                              className="px-2 py-1.5 bg-white border border-gray-300 rounded text-xs"
                            >
                              <option value="true">Visible</option>
                              <option value="false">Masqué</option>
                            </select>
                          </>
                        )}

                        {actionsList.length > 1 && (
                          <button
                            onClick={() => setActionsList(actionsList.filter((_, i) => i !== index))}
                            className="p-1 text-gray-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Script Editor Block */}
            {builderMode === 'script' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="font-semibold">Code JavaScript Sandboxé (Sans accès FS / Tauri / Réseau) :</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Limite watchdog : 250ms
                  </span>
                </div>
                <textarea
                  value={scriptCode}
                  onChange={(e) => setScriptCode(e.target.value)}
                  rows={14}
                  className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 space-y-1">
                  <div className="font-bold text-gray-800">API EStudioScriptAPIv1 disponible sur 'ctx' :</div>
                  <div className="font-mono text-[11px] text-gray-700">
                    ctx.product.get(field) | ctx.pricing.set(field, val) | ctx.template.use(id) | ctx.print.setFormat('ZPL') | ctx.log(msg)
                  </div>
                </div>
              </div>
            )}

            {/* Save Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setActiveTab('rules')}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveRule}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                Enregistrer la Règle (v{editingRule ? editingRule.version + 1 : 1})
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Simulateur Dry-Run & Mode Explain */}
        {activeTab === 'simulator' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Colonne de Gauche : Paramètres d'Évaluation */}
            <div className="w-full md:w-80 bg-gray-50 border-r border-gray-200 p-5 overflow-y-auto space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Contexte d'Entrée</h3>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Article Test</label>
                <select
                  value={simProduct?.id || ''}
                  onChange={(e) => {
                    const found = databaseService.getProducts().find((p) => p.id === e.target.value);
                    if (found) setSimProduct(found);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                >
                  {databaseService.getProducts().slice(0, 50).map((p) => (
                    <option key={p.id} value={p.id}>{p.ITEMNAME} ({p.SELLING_PRICE} F)</option>
                  ))}
                </select>
              </div>

              {simProduct && (
                <div className="p-3 bg-white rounded-lg border border-gray-200 text-xs space-y-1">
                  <div><strong>Prix Vente :</strong> {simProduct.SELLING_PRICE} F</div>
                  <div><strong>Prix Promo :</strong> {simProduct.PROMOPRICE ? `${simProduct.PROMOPRICE} F` : 'Aucun'}</div>
                  <div><strong>Code EAN :</strong> {simProduct.PRODUCT_SCAN || 'Absent'}</div>
                  <div><strong>Rayon :</strong> {simProduct.DEPT_NAME || 'N/A'}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Point d'accroche (Trigger)</label>
                <select
                  value={simTrigger}
                  onChange={(e) => setSimTrigger(e.target.value as RuleTrigger)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                >
                  <option value={RuleTrigger.BEFORE_PRICING}>BEFORE_PRICING</option>
                  <option value={RuleTrigger.BEFORE_TEMPLATE_RESOLUTION}>BEFORE_TEMPLATE_RESOLUTION</option>
                  <option value={RuleTrigger.BEFORE_EXPORT}>BEFORE_EXPORT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Taille du Lot (Batch Count)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={simBatchCount}
                  onChange={(e) => setSimBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                />
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={simLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center space-x-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>{simLoading ? 'Calcul en cours...' : 'Exécuter Dry-Run'}</span>
              </button>
            </div>

            {/* Colonne de Droite : Trace d'Exécution & Explications */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6">
              {simResult ? (
                <>
                  {/* Résumé de Performance */}
                  <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Règles Évaluées</div>
                      <div className="text-lg font-bold text-gray-800">{simResult.totalRulesEvaluated}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Règles Déclenchées</div>
                      <div className="text-lg font-bold text-emerald-600">{simResult.rulesMatchedCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Actions Appliquées</div>
                      <div className="text-lg font-bold text-indigo-600">{simResult.rulesAppliedCount}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Durée d'Exécution</div>
                      <div className="text-lg font-mono font-bold text-gray-700">{simResult.executionDurationMs.toFixed(2)} ms</div>
                    </div>
                  </div>

                  {/* Mode Explain : Cartouche Explicatif */}
                  {simResult.explanations.length > 0 && (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                      <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>Mode "Explain" — Justification des Décisions Métier</span>
                      </div>

                      <div className="space-y-2">
                        {simResult.explanations.map((exp, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-lg border border-indigo-100 text-xs space-y-1">
                            <div className="font-bold text-indigo-900">{exp.title}</div>
                            <div className="text-gray-600 text-[11px]">
                              Déclenché par la règle <span className="font-semibold text-gray-800">[{exp.ruleId}] {exp.ruleName}</span> (Prio {exp.priority})
                            </div>
                            <ul className="list-disc list-inside text-gray-700 text-[11px] pt-1">
                              {exp.reasons.map((r, rIdx) => (
                                <li key={rIdx}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Journal de Trace Détaillé */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Trace d'Exécution Pas-à-Pas</h4>
                    <div className="space-y-2">
                      {simResult.trace.map((tr) => (
                        <div
                          key={tr.ruleId}
                          className={`p-3.5 rounded-xl border text-xs ${
                            tr.applied
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : 'bg-gray-50/60 border-gray-200 text-gray-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {tr.applied ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
                              )}
                              <span className="font-mono font-bold text-gray-700">[{tr.ruleId}]</span>
                              <span className="font-semibold text-gray-900">{tr.ruleName}</span>
                              <span className="text-[10px] text-gray-400">({tr.executionTimeMs.toFixed(2)}ms)</span>
                            </div>

                            <span className="text-[10px] font-mono text-gray-500">Prio {tr.priority}</span>
                          </div>

                          {tr.conditionDetails && (
                            <div className="mt-2 pl-6 space-y-0.5 font-mono text-[11px]">
                              {tr.conditionDetails.map((cd, cdIdx) => (
                                <div key={cdIdx} className={cd.result ? 'text-emerald-700' : 'text-gray-500'}>
                                  {cd.result ? '✓' : '✗'} {cd.field} ({cd.actualValue ?? 'null'}) {cd.operator} {cd.expectedValue}
                                </div>
                              ))}
                            </div>
                          )}

                          {tr.generatedCommands.length > 0 && (
                            <div className="mt-2 pl-6 space-y-1">
                              {tr.generatedCommands.map((gc, gcIdx) => (
                                <div key={gcIdx} className="text-emerald-800 font-medium text-[11px]">
                                  ➔ Commande : {gc.type} {gc.target ? `sur ${gc.target}` : ''} {gc.templateId ? `[Gabarit: ${gc.templateId}]` : ''} {gc.exportFormat ? `[Format: ${gc.exportFormat}]` : ''}
                                </div>
                              ))}
                            </div>
                          )}

                          {tr.error && (
                            <div className="mt-2 pl-6 text-rose-700 font-medium text-[11px]">
                              ⚠️ Erreur : {tr.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <Play className="w-8 h-8 opacity-40" />
                  <p className="text-xs">Cliquez sur "Exécuter Dry-Run" pour tester les règles sur cet article</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Ensembles de Règles (Rule Sets) */}
        {activeTab === 'sets' && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Ensembles de Règles Métier (Rule Sets)</h3>
                <p className="text-xs text-gray-500">Regroupez vos règles par enseigne, secteur d'activité ou type d'opération</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ruleSets.map((set) => {
                const count = rules.filter((r) => r.ruleSetId === set.id).length;
                return (
                  <div key={set.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-900">{set.name}</h4>
                      <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                        {count} règles
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{set.description}</p>
                    <div className="flex items-center space-x-1 pt-2">
                      {set.tags?.map((t) => (
                        <span key={t} className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

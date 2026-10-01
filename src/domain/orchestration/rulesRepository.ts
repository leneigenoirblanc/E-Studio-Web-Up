/**
 * Rules Repository
 * Persistance, gestion des versions et ensembles de règles (Rule Sets)
 * Pré-configuré avec les règles métier standard de la grande distribution
 */

import { RuleDefinition, RuleSet, RuleTrigger, RuleVersion } from './types';

const STORAGE_KEY_RULES = 'estudio_orchestration_rules_v1';
const STORAGE_KEY_RULESETS = 'estudio_orchestration_rulesets_v1';
const STORAGE_KEY_VERSIONS = 'estudio_orchestration_versions_v1';

export const DEFAULT_RULE_SETS: RuleSet[] = [
  {
    id: 'set-general-retail',
    name: 'Grande Distribution & Alimentaire',
    description: 'Règles standards de conformité légale, promotions et prix au kilo/litre',
    enabled: true,
    category: 'retail',
    tags: ['Légal', 'Promo', 'Alimentaire'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'set-wholesale-b2b',
    name: 'Grossiste & Libre-Service B2B',
    description: 'Paliers dégressifs par carton/palette et étiquetage thermique haute vitesse',
    enabled: true,
    category: 'wholesale',
    tags: ['B2B', 'Paliers', 'Zebra'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_ORCHESTRATION_RULES: RuleDefinition[] = [
  {
    id: 'R-001',
    name: 'Détection & Calcul Automatique Promotion',
    description: 'Active le bandeau promotionnel et calcule le pourcentage de rabais dès que le prix promo est inférieur au prix standard',
    enabled: true,
    trigger: RuleTrigger.BEFORE_PRICING,
    priority: 900,
    scope: {},
    mode: 'gui',
    ruleSetId: 'set-general-retail',
    conditionGroup: {
      id: 'grp-001',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c-001',
          field: 'product.promoPrice',
          operator: 'is_not_empty',
        },
        {
          id: 'c-002',
          field: 'product.promoPrice',
          operator: 'less_than',
          value: 'product.sellingPrice',
        },
      ],
    },
    actions: [
      {
        id: 'act-001',
        type: 'CALCULATE_DISCOUNT',
      },
      {
        id: 'act-002',
        type: 'SET_VISIBILITY',
        target: 'promo_banner',
        value: true,
      },
    ],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'R-002',
    name: 'Prix au Litre pour Rayon Boissons < 1L',
    description: 'Applique automatiquement le mode d’affichage légal "Prix au Litre" pour toutes les boissons de contenance inférieure à 1 litre',
    enabled: true,
    trigger: RuleTrigger.BEFORE_PRICING,
    priority: 750,
    scope: {
      departments: ['Boissons', 'Liquides', 'Cave', 'Sodas', 'Eaux'],
    },
    mode: 'gui',
    ruleSetId: 'set-general-retail',
    conditionGroup: {
      id: 'grp-002',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c-003',
          field: 'product.volumeMl',
          operator: 'less_than',
          value: 1000,
        },
      ],
    },
    actions: [
      {
        id: 'act-003',
        type: 'SET_UNIT_PRICE_MODE',
        value: 'PER_LITER',
      },
    ],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'R-003',
    name: 'Bascule Gabarit "Sans Code-Barres" si EAN Absent',
    description: 'Bascule automatiquement sur le gabarit sans code-barres si la référence produit n’a pas de code EAN renseigné',
    enabled: true,
    trigger: RuleTrigger.BEFORE_TEMPLATE_RESOLUTION,
    priority: 800,
    scope: {},
    mode: 'gui',
    ruleSetId: 'set-general-retail',
    conditionGroup: {
      id: 'grp-003',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c-004',
          field: 'product.barcode',
          operator: 'is_empty',
        },
      ],
    },
    actions: [
      {
        id: 'act-004',
        type: 'USE_TEMPLATE',
        templateId: 'Balisage Simple XL',
      },
      {
        id: 'act-005',
        type: 'SET_VISIBILITY',
        target: 'barcode_ean',
        value: false,
      },
    ],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'R-004',
    name: 'Routage Automatique Thermique Zebra si Lot > 1000',
    description: 'Bascule automatiquement en impression industrielle thermique directe (Zebra ZPL) pour les séries massives excédant 1 000 étiquettes',
    enabled: true,
    trigger: RuleTrigger.BEFORE_EXPORT,
    priority: 650,
    scope: {},
    mode: 'gui',
    ruleSetId: 'set-wholesale-b2b',
    conditionGroup: {
      id: 'grp-004',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c-005',
          field: 'batch.totalCount',
          operator: 'greater_than',
          value: 1000,
        },
      ],
    },
    actions: [
      {
        id: 'act-006',
        type: 'SET_EXPORT_FORMAT',
        exportFormat: 'ZPL',
      },
      {
        id: 'act-007',
        type: 'SET_PRINTER',
        printerId: 'printer-zebra-network',
      },
    ],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'R-005',
    name: 'Affichage Grille Paliers pour Grossiste',
    description: 'Active le tableau dégressif et masque le prix unitaire simple pour les articles possédant des tarifs de gros',
    enabled: true,
    trigger: RuleTrigger.BEFORE_TEMPLATE_RESOLUTION,
    priority: 500,
    scope: {
      departments: ['Gros', 'Demi-Gros', 'B2B', 'Boissons Gazeuses'],
    },
    mode: 'gui',
    ruleSetId: 'set-wholesale-b2b',
    conditionGroup: {
      id: 'grp-005',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c-006',
          field: 'product.tiers',
          operator: 'is_not_empty',
        },
      ],
    },
    actions: [
      {
        id: 'act-008',
        type: 'USE_TEMPLATE',
        templateId: 'Balisage Palette Demi-Gros',
      },
      {
        id: 'act-009',
        type: 'SET_VISIBILITY',
        target: 'tier_pricing_table',
        value: true,
      },
    ],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'R-006',
    name: 'Masquage Prix au Kilo pour Vente à la Pièce',
    description: 'Désactive le calcul au kilo/litre pour les articles vendus à l’unité (ex: accessoires, électroménager, bazar)',
    enabled: true,
    trigger: RuleTrigger.BEFORE_PRICING,
    priority: 450,
    scope: {},
    mode: 'gui',
    ruleSetId: 'set-general-retail',
    conditionGroup: {
      id: 'grp-006',
      logicalOperator: 'AND',
      conditions: [
        {
          id: 'c-007',
          field: 'product.unitWeightUnit',
          operator: 'equals',
          value: 'piece',
        },
      ],
    },
    actions: [
      {
        id: 'act-010',
        type: 'SET_UNIT_PRICE_MODE',
        value: 'NONE',
      },
      {
        id: 'act-011',
        type: 'SET_VISIBILITY',
        target: 'txt_unit_price',
        value: false,
      },
    ],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'R-007',
    name: 'Script Sandboxé : Arrondi Psychologique Retail',
    description: 'Script JavaScript sandboxé calculant un prix de vente psychologique finissant par 90 ou 900 FCFA avec journalisation',
    enabled: true,
    trigger: RuleTrigger.BEFORE_PRICING,
    priority: 300,
    scope: {
      departments: ['Textile', 'Bazar', 'Maison'],
    },
    mode: 'script',
    ruleSetId: 'set-general-retail',
    scriptSource: `// Script sandboxé d'arrondi psychologique
const price = ctx.product.get('sellingPrice');
if (price && price > 1000) {
  // Arrondi au millier inférieur + 900
  const base = Math.floor(price / 1000) * 1000;
  const rounded = base + 900;
  ctx.pricing.set('regularPrice', rounded);
  ctx.label.setText('badge_psychologique', 'PRIX ROND');
  ctx.log('Prix ajusté psychologiquement de ' + price + ' vers ' + rounded);
}`,
    scriptLimits: {
      maxExecutionMs: 150,
    },
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class RulesRepository {
  private static instance: RulesRepository | null = null;
  private rules: RuleDefinition[] = [];
  private ruleSets: RuleSet[] = [];
  private versions: RuleVersion[] = [];
  private listeners: Array<(rules: RuleDefinition[]) => void> = [];

  private constructor() {
    this.load();
  }

  public static getInstance(): RulesRepository {
    if (!this.instance) {
      this.instance = new RulesRepository();
    }
    return this.instance;
  }

  private load(): void {
    if (typeof window === 'undefined') {
      this.rules = [...DEFAULT_ORCHESTRATION_RULES];
      this.ruleSets = [...DEFAULT_RULE_SETS];
      return;
    }

    try {
      const savedRules = localStorage.getItem(STORAGE_KEY_RULES);
      if (savedRules) {
        this.rules = JSON.parse(savedRules);
      } else {
        this.rules = [...DEFAULT_ORCHESTRATION_RULES];
        this.persistRules();
      }

      const savedSets = localStorage.getItem(STORAGE_KEY_RULESETS);
      if (savedSets) {
        this.ruleSets = JSON.parse(savedSets);
      } else {
        this.ruleSets = [...DEFAULT_RULE_SETS];
        this.persistSets();
      }

      const savedVers = localStorage.getItem(STORAGE_KEY_VERSIONS);
      if (savedVers) {
        this.versions = JSON.parse(savedVers);
      }
    } catch {
      this.rules = [...DEFAULT_ORCHESTRATION_RULES];
      this.ruleSets = [...DEFAULT_RULE_SETS];
    }
  }

  private persistRules(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(this.rules));
    } catch (e) {
      console.error('Failed to persist rules:', e);
    }
    this.notify();
  }

  private persistSets(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_RULESETS, JSON.stringify(this.ruleSets));
    } catch (e) {
      console.error('Failed to persist rule sets:', e);
    }
  }

  private persistVersions(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(this.versions));
    } catch (e) {
      console.error('Failed to persist rule versions:', e);
    }
  }

  public getAll(): RuleDefinition[] {
    return [...this.rules];
  }

  public getActiveCount(): number {
    return this.rules.filter((r) => r.enabled).length;
  }

  public getById(id: string): RuleDefinition | undefined {
    return this.rules.find((r) => r.id === id);
  }

  public save(rule: RuleDefinition): void {
    const index = this.rules.findIndex((r) => r.id === rule.id);
    const updated = {
      ...rule,
      version: (rule.version || 1) + (index >= 0 ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      // Archivage de la version précédente
      this.versions.unshift({
        id: `VER-${Date.now()}-${rule.id}`,
        ruleId: rule.id,
        version: this.rules[index].version,
        definition: { ...this.rules[index] },
        createdAt: new Date().toISOString(),
        status: 'archived',
      });
      this.rules[index] = updated;
    } else {
      this.rules.unshift(updated);
    }

    this.persistRules();
    this.persistVersions();
  }

  public toggle(id: string): void {
    const rule = this.rules.find((r) => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
      rule.updatedAt = new Date().toISOString();
      this.persistRules();
    }
  }

  public delete(id: string): void {
    this.rules = this.rules.filter((r) => r.id !== id);
    this.persistRules();
  }

  public duplicate(id: string): RuleDefinition | null {
    const original = this.getById(id);
    if (!original) return null;

    const copy: RuleDefinition = {
      ...JSON.parse(JSON.stringify(original)),
      id: `R-${Date.now().toString().slice(-4)}`,
      name: `${original.name} (Copie)`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.rules.unshift(copy);
    this.persistRules();
    return copy;
  }

  public restoreVersion(versionId: string): RuleDefinition | null {
    const version = this.versions.find((v) => v.id === versionId);
    if (!version) return null;

    const current = this.getById(version.ruleId);
    if (current) {
      current.conditionGroup = version.definition.conditionGroup;
      current.actions = version.definition.actions;
      current.scriptSource = version.definition.scriptSource;
      current.priority = version.definition.priority;
      current.scope = version.definition.scope;
      current.version = current.version + 1;
      current.updatedAt = new Date().toISOString();
      this.persistRules();
      return current;
    }
    return null;
  }

  public getVersionsForRule(ruleId: string): RuleVersion[] {
    return this.versions.filter((v) => v.ruleId === ruleId);
  }

  public getAllRuleSets(): RuleSet[] {
    return [...this.ruleSets];
  }

  public saveRuleSet(set: RuleSet): void {
    const index = this.ruleSets.findIndex((s) => s.id === set.id);
    if (index >= 0) {
      this.ruleSets[index] = { ...set, updatedAt: new Date().toISOString() };
    } else {
      this.ruleSets.push({ ...set, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.persistSets();
  }

  public deleteRuleSet(id: string): void {
    this.ruleSets = this.ruleSets.filter((s) => s.id !== id);
    this.persistSets();
  }

  public subscribe(cb: (rules: RuleDefinition[]) => void): () => void {
    this.listeners.push(cb);
    cb(this.getAll());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(): void {
    const current = this.getAll();
    this.listeners.forEach((cb) => {
      try {
        cb(current);
      } catch {}
    });
  }
}

export const rulesRepository = RulesRepository.getInstance();

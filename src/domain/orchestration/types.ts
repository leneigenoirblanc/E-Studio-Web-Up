/**
 * E-Studio Hybrid Rules Platform — Types & Spécifications
 * Couche d'orchestration métier globale entre l'ingestion et l'impression
 */

// ============================================================================
// 1. Déclencheurs de Cycle de Vie (Lifecycle Hooks)
// ============================================================================

export enum RuleTrigger {
  BEFORE_IMPORT = 'BEFORE_IMPORT',
  AFTER_IMPORT = 'AFTER_IMPORT',

  BEFORE_NORMALIZATION = 'BEFORE_NORMALIZATION',
  AFTER_NORMALIZATION = 'AFTER_NORMALIZATION',

  BEFORE_PRICING = 'BEFORE_PRICING',
  AFTER_PRICING = 'AFTER_PRICING',

  BEFORE_TEMPLATE_RESOLUTION = 'BEFORE_TEMPLATE_RESOLUTION',
  AFTER_TEMPLATE_RESOLUTION = 'AFTER_TEMPLATE_RESOLUTION',

  BEFORE_RENDER = 'BEFORE_RENDER',
  AFTER_RENDER = 'AFTER_RENDER',

  BEFORE_IMPOSITION = 'BEFORE_IMPOSITION',
  AFTER_IMPOSITION = 'AFTER_IMPOSITION',

  BEFORE_EXPORT = 'BEFORE_EXPORT',
  AFTER_EXPORT = 'AFTER_EXPORT',

  BEFORE_PRINT = 'BEFORE_PRINT',
  AFTER_PRINT = 'AFTER_PRINT',

  ON_PRINT_ERROR = 'ON_PRINT_ERROR',
}

export type RuleMode = 'gui' | 'script';

// ============================================================================
// 2. Opérateurs & Conditions Déclaratives (AST)
// ============================================================================

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'regex'
  | 'between';

export interface RuleConditionNode {
  id: string;
  field: string; // e.g. "product.DEPARTMENT", "product.SELLING_PRICE", "pricing.hasPromo"
  operator: RuleOperator;
  value?: any;
  valueSecondary?: any; // Pour 'between'
}

export interface RuleConditionGroup {
  id: string;
  logicalOperator: 'AND' | 'OR';
  conditions: (RuleConditionNode | RuleConditionGroup)[];
}

// ============================================================================
// 3. Actions & Commandes Métier (Read -> Decide -> Mutate)
// ============================================================================

export type RuleActionType =
  | 'SET_FIELD'
  | 'USE_TEMPLATE'
  | 'SET_VISIBILITY'
  | 'SET_TEXT'
  | 'SET_PRINTER'
  | 'SET_EXPORT_FORMAT'
  | 'SET_UNIT_PRICE_MODE'
  | 'CALCULATE_DISCOUNT'
  | 'SKIP_ITEM'
  | 'ALERT'
  | 'ENRICH_DATA';

export interface RuleActionDefinition {
  id: string;
  type: RuleActionType;
  target?: string; // e.g. "product.ITEMNAME", "pricing.unitPriceMode", "promoBanner"
  value?: any;
  templateId?: string;
  printerId?: string;
  exportFormat?: 'PDF' | 'ZPL' | 'PPTX';
  message?: string;
}

export interface ActionCommand {
  ruleId: string;
  ruleName: string;
  priority: number;
  type: RuleActionType;
  target?: string;
  value?: any;
  templateId?: string;
  printerId?: string;
  exportFormat?: 'PDF' | 'ZPL' | 'PPTX';
  message?: string;
  rationale?: string;
}

// ============================================================================
// 4. Périmètre (Scope) & Priorités
// ============================================================================

export interface RuleScope {
  departments?: string[];
  stores?: string[];
  templates?: string[];
  printers?: string[];
  productCategories?: string[];
  projects?: string[];
}

export interface RuleDefinition {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: RuleTrigger;
  priority: number; // 1000 = Critique, 500 = Métier, 100 = Standard, 10 = Secondaire
  scope: RuleScope;
  mode: RuleMode;

  // Mode GUI
  conditionGroup?: RuleConditionGroup;
  actions?: RuleActionDefinition[];

  // Mode Script (Sandboxed JS)
  scriptSource?: string;
  scriptLimits?: ScriptLimits;

  stopProcessing?: boolean;
  ruleSetId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RuleVersion {
  id: string;
  ruleId: string;
  version: number;
  definition: RuleDefinition;
  createdAt: string;
  status: 'draft' | 'published' | 'archived';
}

export interface RuleSet {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: 'retail' | 'beverage' | 'wholesale' | 'promo' | 'custom';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 5. Contexte d'Exécution & API de Scripting Sandboxé
// ============================================================================

export interface ProductContext {
  id?: string;
  itemName: string;
  sellingPrice: number;
  promoPrice?: number;
  barcode?: string;
  partNumber?: string;
  department?: string;
  category?: string;
  brand?: string;
  unitWeight?: number;
  unitWeightUnit?: string;
  volumeMl?: number;
  stockQty?: number;
  [customField: string]: any;
}

export interface PricingContext {
  regularPrice: number;
  promoPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  hasPromo: boolean;
  unitPrice?: number;
  unitPriceMode?: 'PER_KG' | 'PER_LITER' | 'PER_100G' | 'PER_PIECE' | 'NONE';
  formattedPrice?: string;
  currency?: string;
  [customKey: string]: any;
}

export interface TemplateContext {
  currentTemplateId?: string;
  resolvedTemplateId?: string;
  availableTemplates?: string[];
}

export interface LabelContext {
  elementsVisibility: Record<string, boolean>;
  elementsText: Record<string, string>;
  elementsColor: Record<string, string>;
}

export interface PrintContext {
  printerId?: string;
  exportFormat?: 'PDF' | 'ZPL' | 'PPTX';
  copies?: number;
  startSlot?: number;
}

export interface BatchContext {
  batchId?: string;
  totalCount: number;
  currentIndex: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface ScriptLimits {
  maxExecutionMs: number; // e.g. 200 ms
  maxMemoryBytes?: number;
  maxOutputSize?: number;
}

export interface EStudioScriptAPIv1 {
  product: {
    get(field: string): any;
    set(field: string, value: any): void;
  };
  pricing: {
    get(field: string): any;
    set(field: string, value: any): void;
  };
  label: {
    setText(elementId: string, text: string): void;
    setVisible(elementId: string, visible: boolean): void;
    setColor(elementId: string, color: string): void;
  };
  template: {
    use(templateId: string): void;
  };
  print: {
    setPrinter(printerId: string): void;
    setFormat(format: 'PDF' | 'ZPL' | 'PPTX'): void;
    setCopies(copies: number): void;
  };
  helpers: {
    calcDiscount(regular: number, promo: number): number;
    calcPricePerLiter(price: number, volumeMl: number): number;
    calcPricePerKg(price: number, weightGrams: number): number;
    formatCurrency(amount: number, symbol?: string): string;
  };
  log(message: string): void;
}

// ============================================================================
// 6. Trace d'Exécution & Simulation (Explain Mode)
// ============================================================================

export interface RuleTraceEntry {
  ruleId: string;
  ruleName: string;
  priority: number;
  mode: RuleMode;
  trigger: RuleTrigger;
  matched: boolean;
  scopeMatched: boolean;
  applied: boolean;
  stoppedPipeline: boolean;
  conditionDetails?: {
    field: string;
    actualValue: any;
    operator: string;
    expectedValue: any;
    result: boolean;
  }[];
  generatedCommands: ActionCommand[];
  executionTimeMs: number;
  error?: string;
  logs?: string[];
}

export interface RuleSimulationResult {
  trigger: RuleTrigger;
  totalRulesEvaluated: number;
  rulesMatchedCount: number;
  rulesAppliedCount: number;
  executionDurationMs: number;
  trace: RuleTraceEntry[];
  finalSnapshot: {
    product: ProductContext;
    pricing: PricingContext;
    templateId?: string;
    printerId?: string;
    exportFormat?: 'PDF' | 'ZPL' | 'PPTX';
    labelOverrides: LabelContext;
  };
  explanations: RuleExplainReason[];
}

export interface RuleExplainReason {
  category: 'TEMPLATE_SELECTION' | 'PRICING_DECISION' | 'ROUTING_DECISION' | 'VISIBILITY_CHANGE';
  title: string;
  ruleName: string;
  ruleId: string;
  priority: number;
  reasons: string[];
}

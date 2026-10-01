/**
 * Rule Orchestrator
 * Moteur d'orchestration hybride reliant les hooks du cycle de vie aux moteurs métier
 * Modèle Read -> Decide -> Mutate avec priorités, scopes, simulation et mode Explain
 */

import {
  ActionCommand,
  ProductContext,
  PricingContext,
  LabelContext,
  RuleDefinition,
  RuleExplainReason,
  RuleSimulationResult,
  RuleTraceEntry,
  RuleTrigger,
} from './types';
import { evaluateConditionGroup, matchesScope } from './evaluator';
import { executeSandboxedScript } from './sandbox';

export interface OrchestrationExecutionContext {
  product: ProductContext;
  pricing: PricingContext;
  template?: { currentTemplateId?: string; resolvedTemplateId?: string; availableTemplates?: string[] };
  print?: { printerId?: string; exportFormat?: 'PDF' | 'ZPL' | 'PPTX'; copies?: number; startSlot?: number };
  batch?: { totalCount: number; currentIndex: number; isFirst: boolean; isLast: boolean };
  label?: LabelContext;
}

export class RuleOrchestrator {
  private static instance: RuleOrchestrator | null = null;

  public static getInstance(): RuleOrchestrator {
    if (!this.instance) {
      this.instance = new RuleOrchestrator();
    }
    return this.instance;
  }

  /**
   * Exécute un hook du cycle de vie et applique les mutations validées
   */
  public executeHook(
    trigger: RuleTrigger,
    context: OrchestrationExecutionContext,
    rules: RuleDefinition[],
    options: { dryRun?: boolean; recordTrace?: boolean } = {}
  ): RuleSimulationResult {
    const startTime = performance.now();
    const trace: RuleTraceEntry[] = [];
    const explanations: RuleExplainReason[] = [];

    // Clone profond pour préserver l'état de référence
    const workingContext: OrchestrationExecutionContext = {
      product: JSON.parse(JSON.stringify(context.product || { itemName: '', sellingPrice: 0 })),
      pricing: JSON.parse(JSON.stringify(context.pricing || { regularPrice: 0, hasPromo: false })),
      template: { ...(context.template || {}) },
      print: { ...(context.print || {}) },
      batch: context.batch ? { ...context.batch } : { totalCount: 1, currentIndex: 0, isFirst: true, isLast: true },
      label: {
        elementsVisibility: { ...(context.label?.elementsVisibility || {}) },
        elementsText: { ...(context.label?.elementsText || {}) },
        elementsColor: { ...(context.label?.elementsColor || {}) },
      },
    };

    // 1. Filtrer les règles applicables au trigger actif et activées
    const eligibleRules = rules
      .filter((r) => r.enabled && r.trigger === trigger)
      .sort((a, b) => b.priority - a.priority); // Priorité décroissante (1000 -> 10)

    let stopped = false;
    let matchedCount = 0;
    let appliedCount = 0;

    for (const rule of eligibleRules) {
      if (stopped) break;

      const ruleStart = performance.now();
      const conditionDetails: { field: string; actualValue: any; operator: string; expectedValue: any; result: boolean }[] = [];
      let isScopeOk = false;
      let isConditionMatched = false;
      let generatedCommands: ActionCommand[] = [];
      let executionError: string | undefined;
      let scriptLogs: string[] | undefined;

      try {
        isScopeOk = matchesScope(rule.scope, workingContext);

        if (isScopeOk) {
          if (rule.mode === 'gui') {
            if (rule.conditionGroup) {
              isConditionMatched = evaluateConditionGroup(rule.conditionGroup, workingContext, conditionDetails);
            } else {
              isConditionMatched = true; // Pas de condition = toujours vrai
            }

            if (isConditionMatched && rule.actions) {
              matchedCount++;
              generatedCommands = rule.actions.map((act) => ({
                ruleId: rule.id,
                ruleName: rule.name,
                priority: rule.priority,
                type: act.type,
                target: act.target,
                value: act.value,
                templateId: act.templateId,
                printerId: act.printerId,
                exportFormat: act.exportFormat,
                message: act.message,
                rationale: `Règle GUI "${rule.name}" (Priorité ${rule.priority})`,
              }));
            }
          } else if (rule.mode === 'script' && rule.scriptSource) {
            const scriptRes = executeSandboxedScript(
              rule.id,
              rule.name,
              rule.priority,
              rule.scriptSource,
              {
                product: workingContext.product,
                pricing: workingContext.pricing,
                template: workingContext.template ? { id: workingContext.template.resolvedTemplateId || workingContext.template.currentTemplateId } : undefined,
                print: workingContext.print,
                batch: workingContext.batch,
              },
              rule.scriptLimits
            );

            scriptLogs = scriptRes.logs;
            if (scriptRes.success) {
              isConditionMatched = scriptRes.commands.length > 0;
              generatedCommands = scriptRes.commands;
              if (isConditionMatched) matchedCount++;
            } else {
              executionError = scriptRes.error;
            }
          }
        }

        // 2. Validation & Application des commandes (Phase Mutate)
        if (isScopeOk && isConditionMatched && generatedCommands.length > 0 && !executionError) {
          const validatedCommands = this.validateCommands(generatedCommands, workingContext);

          if (!options.dryRun) {
            this.applyCommands(validatedCommands, workingContext);
          }

          appliedCount++;

          // Construction des explications pour le mode Explain
          this.buildExplanations(rule, validatedCommands, conditionDetails, explanations);

          if (rule.stopProcessing) {
            stopped = true;
          }
        }
      } catch (err: any) {
        executionError = err.message || String(err);
      }

      trace.push({
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        mode: rule.mode,
        trigger: rule.trigger,
        matched: isConditionMatched,
        scopeMatched: isScopeOk,
        applied: isConditionMatched && generatedCommands.length > 0 && !executionError,
        stoppedPipeline: stopped,
        conditionDetails: conditionDetails.length > 0 ? conditionDetails : undefined,
        generatedCommands,
        executionTimeMs: performance.now() - ruleStart,
        error: executionError,
        logs: scriptLogs,
      });
    }

    return {
      trigger,
      totalRulesEvaluated: eligibleRules.length,
      rulesMatchedCount: matchedCount,
      rulesAppliedCount: appliedCount,
      executionDurationMs: performance.now() - startTime,
      trace,
      finalSnapshot: {
        product: workingContext.product,
        pricing: workingContext.pricing,
        templateId: workingContext.template?.resolvedTemplateId || workingContext.template?.currentTemplateId,
        printerId: workingContext.print?.printerId,
        exportFormat: workingContext.print?.exportFormat,
        labelOverrides: workingContext.label!,
      },
      explanations,
    };
  }

  /**
   * Validation des commandes générées avant application
   */
  private validateCommands(commands: ActionCommand[], context: OrchestrationExecutionContext): ActionCommand[] {
    const validated: ActionCommand[] = [];

    for (const cmd of commands) {
      if (cmd.type === 'SET_FIELD') {
        if (!cmd.target) continue;
        // Validation des prix numériques
        if (cmd.target.includes('Price') || cmd.target.includes('PRICE')) {
          if (isNaN(Number(cmd.value))) {
            console.warn(`[RuleOrchestrator] Rejeté: valeur non numérique pour prix: ${cmd.value}`);
            continue;
          }
        }
      }

      if (cmd.type === 'USE_TEMPLATE' && !cmd.templateId) {
        continue;
      }

      validated.push(cmd);
    }

    return validated;
  }

  /**
   * Application atomique des commandes sur le snapshot d'état
   */
  private applyCommands(commands: ActionCommand[], context: OrchestrationExecutionContext): void {
    for (const cmd of commands) {
      switch (cmd.type) {
        case 'SET_FIELD': {
          if (!cmd.target) break;
          const [domain, ...rest] = cmd.target.split('.');
          const fieldName = rest.join('.');

          if (domain === 'product') {
            (context.product as any)[fieldName] = cmd.value;
          } else if (domain === 'pricing') {
            (context.pricing as any)[fieldName] = cmd.value;
          } else if (domain === 'print' && context.print) {
            (context.print as any)[fieldName] = cmd.value;
          } else if (domain === 'label' && context.label) {
            if (fieldName.startsWith('color.')) {
              const elId = fieldName.replace('color.', '');
              context.label.elementsColor[elId] = String(cmd.value);
            }
          }
          break;
        }

        case 'USE_TEMPLATE': {
          if (cmd.templateId) {
            if (!context.template) context.template = {};
            context.template.resolvedTemplateId = cmd.templateId;
          }
          break;
        }

        case 'SET_VISIBILITY': {
          if (cmd.target && context.label) {
            context.label.elementsVisibility[cmd.target] = Boolean(cmd.value);
          }
          break;
        }

        case 'SET_TEXT': {
          if (cmd.target && context.label) {
            context.label.elementsText[cmd.target] = String(cmd.value ?? '');
          }
          break;
        }

        case 'SET_PRINTER': {
          if (cmd.printerId) {
            if (!context.print) context.print = {};
            context.print.printerId = cmd.printerId;
          }
          break;
        }

        case 'SET_EXPORT_FORMAT': {
          if (cmd.exportFormat) {
            if (!context.print) context.print = {};
            context.print.exportFormat = cmd.exportFormat;
          }
          break;
        }

        case 'SET_UNIT_PRICE_MODE': {
          context.pricing.unitPriceMode = cmd.value;
          break;
        }

        case 'CALCULATE_DISCOUNT': {
          const reg = context.pricing.regularPrice || context.product.sellingPrice;
          const promo = context.pricing.promoPrice || context.product.promoPrice;
          if (reg && promo && promo < reg) {
            context.pricing.hasPromo = true;
            context.pricing.discountPercent = Math.round(((reg - promo) / reg) * 100);
            context.pricing.discountAmount = reg - promo;
          }
          break;
        }
      }
    }
  }

  /**
   * Construit des explications lisibles par un humain pour le mode Explain
   */
  private buildExplanations(
    rule: RuleDefinition,
    commands: ActionCommand[],
    conditions: { field: string; actualValue: any; operator: string; expectedValue: any; result: boolean }[],
    outExplanations: RuleExplainReason[]
  ): void {
    const reasons = conditions.map((c) => `${c.field} (${c.actualValue}) ${c.operator} ${c.expectedValue}`);

    for (const cmd of commands) {
      if (cmd.type === 'USE_TEMPLATE') {
        outExplanations.push({
          category: 'TEMPLATE_SELECTION',
          title: `Gabarit "${cmd.templateId}" sélectionné automatiquement`,
          ruleName: rule.name,
          ruleId: rule.id,
          priority: rule.priority,
          reasons: reasons.length > 0 ? reasons : ['Application directe sans condition'],
        });
      } else if (cmd.type === 'SET_EXPORT_FORMAT' || cmd.type === 'SET_PRINTER') {
        outExplanations.push({
          category: 'ROUTING_DECISION',
          title: `Routage d'impression : ${cmd.printerId ? `Imprimante ${cmd.printerId}` : `Format ${cmd.exportFormat}`}`,
          ruleName: rule.name,
          ruleId: rule.id,
          priority: rule.priority,
          reasons: reasons.length > 0 ? reasons : ['Routage automatique par lot'],
        });
      } else if (cmd.type === 'SET_UNIT_PRICE_MODE' || cmd.type === 'CALCULATE_DISCOUNT') {
        outExplanations.push({
          category: 'PRICING_DECISION',
          title: `Tarification : Mode ${cmd.value || 'Calcul Promo'} activé`,
          ruleName: rule.name,
          ruleId: rule.id,
          priority: rule.priority,
          reasons: reasons.length > 0 ? reasons : ['Tarification automatique'],
        });
      }
    }
  }
}

export const ruleOrchestrator = RuleOrchestrator.getInstance();

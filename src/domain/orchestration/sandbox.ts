/**
 * Sandboxed Script Runner for E-Studio Rules Platform
 * Exécution sécurisée de scripts utilisateur avec isolation des globales,
 * surveillance de temps CPU (watchdog) et collecte de commandes (Read -> Decide -> Mutate).
 */

import { ActionCommand, EStudioScriptAPIv1, ScriptLimits } from './types';

export interface SandboxExecutionResult {
  success: boolean;
  commands: ActionCommand[];
  logs: string[];
  executionTimeMs: number;
  error?: string;
}

const DEFAULT_SCRIPT_LIMITS: ScriptLimits = {
  maxExecutionMs: 250,
  maxMemoryBytes: 4 * 1024 * 1024,
  maxOutputSize: 64 * 1024,
};

/**
 * Exécute un script utilisateur dans un bac à sable isolé
 */
export function executeSandboxedScript(
  ruleId: string,
  ruleName: string,
  priority: number,
  scriptSource: string,
  snapshot: {
    product: Record<string, any>;
    pricing: Record<string, any>;
    template?: { id?: string; name?: string };
    print?: { printerId?: string; format?: string; copies?: number };
    batch?: { totalCount: number; currentIndex: number };
  },
  limits: ScriptLimits = DEFAULT_SCRIPT_LIMITS
): SandboxExecutionResult {
  const startTime = performance.now();
  const commands: ActionCommand[] = [];
  const logs: string[] = [];

  // Deep clone des snapshots d'entrée pour garantir l'immutabilité directe
  const productData = JSON.parse(JSON.stringify(snapshot.product || {}));
  const pricingData = JSON.parse(JSON.stringify(snapshot.pricing || {}));

  // Construction de l'API de scripting restreinte
  const api: EStudioScriptAPIv1 = {
    product: {
      get: (field: string) => productData[field] ?? productData[field.toLowerCase()] ?? productData[field.toUpperCase()],
      set: (field: string, value: any) => {
        productData[field] = value;
        commands.push({
          ruleId,
          ruleName,
          priority,
          type: 'SET_FIELD',
          target: `product.${field}`,
          value,
          rationale: `Script: set product.${field} = ${JSON.stringify(value)}`,
        });
      },
    },
    pricing: {
      get: (field: string) => pricingData[field],
      set: (field: string, value: any) => {
        pricingData[field] = value;
        commands.push({
          ruleId,
          ruleName,
          priority,
          type: 'SET_FIELD',
          target: `pricing.${field}`,
          value,
          rationale: `Script: set pricing.${field} = ${JSON.stringify(value)}`,
        });
      },
    },
    label: {
      setText: (elementId: string, text: string) => {
        commands.push({
          ruleId,
          ruleName,
          priority,
          type: 'SET_TEXT',
          target: elementId,
          value: text,
          rationale: `Script: set label text for ${elementId}`,
        });
      },
      setVisible: (elementId: string, visible: boolean) => {
        commands.push({
          ruleId,
          ruleName,
          priority,
          type: 'SET_VISIBILITY',
          target: elementId,
          value: visible,
          rationale: `Script: set visibility for ${elementId} = ${visible}`,
        });
      },
      setColor: (elementId: string, color: string) => {
        commands.push({
          ruleId,
          ruleName,
          priority,
          type: 'SET_FIELD',
          target: `label.color.${elementId}`,
          value: color,
        });
      },
    },
    template: {
      use: (templateId: string) => {
        commands.push({
          ruleId,
          ruleName,
          priority,
          type: 'USE_TEMPLATE',
          templateId,
          rationale: `Script: switch to template ${templateId}`,
        });
      },
    },
    print: {
      setPrinter: (printerId: string) => {
        commands.push({
          ruleId,
          ruleName,
          priority,
          type: 'SET_PRINTER',
          printerId,
          rationale: `Script: assign printer ${printerId}`,
        });
      },
      setFormat: (format: 'PDF' | 'ZPL' | 'PPTX') => {
        commands.push({
          ruleId,
          ruleName,
          priority,
          type: 'SET_EXPORT_FORMAT',
          exportFormat: format,
          rationale: `Script: export format ${format}`,
        });
      },
      setCopies: (copies: number) => {
        commands.push({
          ruleId,
          ruleName,
          priority,
          type: 'SET_FIELD',
          target: 'print.copies',
          value: Math.max(1, copies),
        });
      },
    },
    helpers: {
      calcDiscount: (regular: number, promo: number) => {
        if (!regular || regular <= 0 || !promo || promo >= regular) return 0;
        return Math.round(((regular - promo) / regular) * 100);
      },
      calcPricePerLiter: (price: number, volumeMl: number) => {
        if (!volumeMl || volumeMl <= 0) return 0;
        return (price / volumeMl) * 1000;
      },
      calcPricePerKg: (price: number, weightGrams: number) => {
        if (!weightGrams || weightGrams <= 0) return 0;
        return (price / weightGrams) * 1000;
      },
      formatCurrency: (amount: number, symbol: string = 'FCFA') => {
        return `${amount.toLocaleString('fr-FR')} ${symbol}`;
      },
    },
    log: (msg: string) => {
      if (logs.length < 50) {
        logs.push(String(msg));
      }
    },
  };

  // Création d'une fonction isolée
  // On masque explicitement toutes les globales dangereuses
  const blacklistedGlobals = [
    'window',
    'document',
    'globalThis',
    'fetch',
    'XMLHttpRequest',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'WebSocket',
    'Worker',
    'importScripts',
    'process',
    'require',
    'eval',
    'Function',
    '__TAURI__',
    '__TAURI_INTERNALS__',
  ];

  try {
    const wrappedCode = `
      "use strict";
      return (function(ctx) {
        ${scriptSource}
      })(api);
    `;

    // Création de la fonction avec les globales masquées comme paramètres null
    const paramNames = ['api', ...blacklistedGlobals];
    const paramValues = [api, ...blacklistedGlobals.map(() => undefined)];

    const fn = new Function(...paramNames, wrappedCode);

    // Watchdog timing check
    const execStart = performance.now();
    fn(...paramValues);
    const duration = performance.now() - execStart;

    if (duration > limits.maxExecutionMs) {
      return {
        success: false,
        commands: [],
        logs,
        executionTimeMs: duration,
        error: `Dépassement du temps d'exécution maximal (${duration.toFixed(1)}ms > ${limits.maxExecutionMs}ms)`,
      };
    }

    return {
      success: true,
      commands,
      logs,
      executionTimeMs: performance.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      commands: [],
      logs,
      executionTimeMs: performance.now() - startTime,
      error: `Erreur de script : ${err.message || String(err)}`,
    };
  }
}

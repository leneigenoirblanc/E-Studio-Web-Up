/**
 * AST & Expression Evaluator for Declarative Rules
 * Évalue les conditions de manière déterministe, sécurisée et traçable
 */

import {
  RuleConditionGroup,
  RuleConditionNode,
  RuleOperator,
  RuleScope,
} from './types';

/**
 * Résolution sécurisée d'un chemin de propriété (e.g. "product.sellingPrice")
 */
export function resolvePath(context: any, path: string): any {
  if (!context || !path) return undefined;
  const cleanPath = path.trim();
  const segments = cleanPath.split('.');

  let current = context;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    // Permet la recherche insensible à la casse pour les propriétés directes
    if (typeof current === 'object' && !(seg in current)) {
      const lower = seg.toLowerCase();
      const foundKey = Object.keys(current).find((k) => k.toLowerCase() === lower);
      if (foundKey) {
        current = current[foundKey];
        continue;
      }
    }
    current = current[seg];
  }
  return current;
}

/**
 * Évaluation d'une comparaison unitaire
 */
export function evaluateOperator(
  actual: any,
  operator: RuleOperator,
  expected: any,
  secondaryExpected?: any
): boolean {
  if (operator === 'is_empty') {
    return actual === null || actual === undefined || actual === '' || (Array.isArray(actual) && actual.length === 0);
  }
  if (operator === 'is_not_empty') {
    return actual !== null && actual !== undefined && actual !== '' && (!Array.isArray(actual) || actual.length > 0);
  }

  // Traitement numérique si les deux valeurs sont des nombres ou convertibles
  const isActualNum = typeof actual === 'number' || (!isNaN(Number(actual)) && actual !== '' && actual !== null);
  const isExpectedNum = typeof expected === 'number' || (!isNaN(Number(expected)) && expected !== '' && expected !== null);

  if (isActualNum && isExpectedNum && ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'between'].includes(operator)) {
    const a = Number(actual);
    const b = Number(expected);
    switch (operator) {
      case 'equals': return a === b;
      case 'not_equals': return a !== b;
      case 'greater_than': return a > b;
      case 'less_than': return a < b;
      case 'greater_or_equal': return a >= b;
      case 'less_or_equal': return a <= b;
      case 'between': {
        const c = Number(secondaryExpected ?? expected);
        const min = Math.min(b, c);
        const max = Math.max(b, c);
        return a >= min && a <= max;
      }
    }
  }

  // Traitement booléen
  if (typeof expected === 'boolean') {
    const boolActual = Boolean(actual === true || actual === 'true' || actual === 1 || actual === '1');
    return operator === 'equals' ? boolActual === expected : boolActual !== expected;
  }

  // Traitement texte standard
  const actStr = String(actual ?? '').toLowerCase();
  const expStr = String(expected ?? '').toLowerCase();

  switch (operator) {
    case 'equals':
      return actStr === expStr;
    case 'not_equals':
      return actStr !== expStr;
    case 'greater_than':
      return actStr > expStr;
    case 'less_than':
      return actStr < expStr;
    case 'greater_or_equal':
      return actStr >= expStr;
    case 'less_or_equal':
      return actStr <= expStr;
    case 'contains':
      return actStr.includes(expStr);
    case 'not_contains':
      return !actStr.includes(expStr);
    case 'starts_with':
      return actStr.startsWith(expStr);
    case 'ends_with':
      return actStr.endsWith(expStr);
    case 'in': {
      if (Array.isArray(expected)) {
        return expected.map((x) => String(x).toLowerCase()).includes(actStr);
      }
      return expStr.split(',').map((s) => s.trim()).includes(actStr);
    }
    case 'not_in': {
      if (Array.isArray(expected)) {
        return !expected.map((x) => String(x).toLowerCase()).includes(actStr);
      }
      return !expStr.split(',').map((s) => s.trim()).includes(actStr);
    }
    case 'regex': {
      try {
        const re = new RegExp(expected, 'i');
        return re.test(String(actual ?? ''));
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

/**
 * Évaluation d'un groupe de conditions avec trace détaillée
 */
export function evaluateConditionGroup(
  group: RuleConditionGroup,
  context: any,
  diagnosticTrace: { field: string; actualValue: any; operator: string; expectedValue: any; result: boolean }[] = []
): boolean {
  if (!group || !group.conditions || group.conditions.length === 0) {
    return true;
  }

  const results: boolean[] = [];

  for (const node of group.conditions) {
    if ('logicalOperator' in node) {
      // Sous-groupe récursif
      const subResult = evaluateConditionGroup(node as RuleConditionGroup, context, diagnosticTrace);
      results.push(subResult);
    } else {
      // Condition élémentaire
      const cond = node as RuleConditionNode;
      const actual = resolvePath(context, cond.field);
      const passed = evaluateOperator(actual, cond.operator, cond.value, cond.valueSecondary);

      diagnosticTrace.push({
        field: cond.field,
        actualValue: actual,
        operator: cond.operator,
        expectedValue: cond.valueSecondary ? `${cond.value} .. ${cond.valueSecondary}` : cond.value,
        result: passed,
      });

      results.push(passed);
    }
  }

  if (group.logicalOperator === 'OR') {
    return results.some(Boolean);
  }
  return results.every(Boolean);
}

/**
 * Vérifie si le scope de la règle correspond au contexte actuel
 */
export function matchesScope(scope: RuleScope, context: any): boolean {
  if (!scope) return true;

  if (scope.departments && scope.departments.length > 0) {
    const dept = String(resolvePath(context, 'product.department') || resolvePath(context, 'product.DEPT_NAME') || '').toLowerCase();
    if (!scope.departments.some((d) => d.toLowerCase() === dept)) return false;
  }

  if (scope.stores && scope.stores.length > 0) {
    const store = String(resolvePath(context, 'product.store') || resolvePath(context, 'product.STORE_NAME') || '').toLowerCase();
    if (!scope.stores.some((s) => s.toLowerCase() === store)) return false;
  }

  if (scope.productCategories && scope.productCategories.length > 0) {
    const cat = String(resolvePath(context, 'product.category') || resolvePath(context, 'product.CATEGORY_NAME') || '').toLowerCase();
    if (!scope.productCategories.some((c) => c.toLowerCase() === cat)) return false;
  }

  if (scope.templates && scope.templates.length > 0) {
    const tpl = String(resolvePath(context, 'template.currentTemplateId') || resolvePath(context, 'template.name') || '').toLowerCase();
    if (!scope.templates.some((t) => t.toLowerCase() === tpl)) return false;
  }

  if (scope.printers && scope.printers.length > 0) {
    const prt = String(resolvePath(context, 'print.printerId') || '').toLowerCase();
    if (!scope.printers.some((p) => p.toLowerCase() === prt)) return false;
  }

  return true;
}

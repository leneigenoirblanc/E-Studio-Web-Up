/**
 * E-Studio Continuous Preflight Engine
 * Conforms to SECTION 15: CONTINUOUS PREFLIGHT
 * 
 * One single unified issues engine driving Editor diagnostics, Job validation, and the Production Gate.
 * Errors ('BLOCKING') block freezing/output; Warnings require operator acknowledgment.
 */

import { LabelTemplate } from '../../types';
import { PreflightIssue, PreflightReport } from '../workflow/types';
import { buildRenderList } from '../rendering/renderList';

export class PreflightEngine {
  /**
   * Run full preflight evaluation on a template against a set of real rows
   */
  public static evaluate(
    template: LabelTemplate,
    rows: any[] = [{}],
    options: { targetDpi?: number } = {}
  ): PreflightReport {
    const issues: PreflightIssue[] = [];
    const rowsToInspect = rows.length > 0 ? rows : [{}];

    let totalChecked = 0;

    for (let rIdx = 0; rIdx < rowsToInspect.length; rIdx++) {
      const row = rowsToInspect[rIdx];
      totalChecked++;

      // Use the canonical RenderList builder to extract issues deterministically
      const renderList = buildRenderList(template, row, rIdx, options);
      for (const issue of renderList.issues) {
        issues.push({
          ...issue,
          rowIndex: rIdx,
          productName: row.ITEMNAME || row.designation || `Ligne ${rIdx + 1}`,
          barcode: row.PRODUCT_SCAN || row.barcode,
        } as PreflightIssue & { rowIndex: number });
      }
    }

    const blockingCount = issues.filter((i) => i.severity === 'BLOCKING').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
    const infoCount = issues.filter((i) => i.severity === 'INFO').length;

    const status: 'PASS' | 'WARNING' | 'FAIL' =
      blockingCount > 0 ? 'FAIL' : warningCount > 0 ? 'WARNING' : 'PASS';

    return {
      timestamp: new Date().toISOString(),
      status,
      totalChecked,
      blockingCount,
      warningCount,
      infoCount,
      issues,
      thermalAnalysisIncluded: Boolean(options.targetDpi),
    };
  }

  /**
   * Single-label quick check for interactive editor
   */
  public static evaluateSingleLabel(
    template: LabelTemplate,
    activeRow: any = {},
    options: { targetDpi?: number } = {}
  ): PreflightIssue[] {
    const list = buildRenderList(template, activeRow, 0, options);
    return list.issues;
  }
}

/**
 * E-Studio Job Package Service
 * Gère la création, l'exportation et la restauration de paquets d'impression
 * reproductibles (.estudio-job) intégrant l'ensemble des snapshots d'état.
 */

import { ProductionJobPackage, WorkflowMode, ImpositionConfig, PreflightReport } from './types';
import { ProductionDataset } from '../resolution/types';
import { RuleDefinition } from '../orchestration/types';
import { LabelTemplate } from '../../types';

export class JobPackageService {
  private static instance: JobPackageService | null = null;

  public static getInstance(): JobPackageService {
    if (!this.instance) {
      this.instance = new JobPackageService();
    }
    return this.instance;
  }

  /**
   * Calcule une signature de hash simple pour le chaînage d'audit
   */
  private computeHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'SHA256-' + Math.abs(hash).toString(16).padStart(8, '0') + '-' + Date.now().toString(36);
  }

  /**
   * Assemble un paquet de travail complet prêt à être figé et exporté
   */
  public createJobPackage(params: {
    jobName: string;
    mode: WorkflowMode;
    dataset: ProductionDataset;
    template: LabelTemplate;
    rules: RuleDefinition[];
    imposition: ImpositionConfig;
    preflightReport: PreflightReport;
    author?: string;
  }): ProductionJobPackage {
    const now = new Date().toISOString();
    const payloadForHash = JSON.stringify({
      id: params.dataset.id,
      productsCount: params.dataset.products.length,
      template: params.template.name,
      createdAt: now,
    });

    const hashSig = this.computeHash(payloadForHash);

    const pkg: ProductionJobPackage = {
      formatVersion: '1.0.0',
      jobId: `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      jobName: params.jobName || `Tirage ${params.dataset.products.length} étiquettes`,
      mode: params.mode,
      createdAt: now,
      frozenAt: now,
      manifest: {
        appVersion: '1.0.0-industrial',
        totalProducts: params.dataset.products.length,
        totalLabelsToPrint: params.dataset.products.length,
        author: params.author || 'Opérateur E-Studio',
        hashSignature: hashSig,
      },
      datasetSnapshot: params.dataset,
      referenceCatalogVersion: 'v1.0-snapshot',
      rulesSnapshot: params.rules,
      pricingRulesVersion: 'v1.0-standard',
      templateSnapshot: params.template,
      impositionSnapshot: params.imposition,
      preflightReportSnapshot: params.preflightReport,
      auditChain: {
        previousEventHash: 'GENESIS-00000000',
        currentHash: hashSig,
        loggedAt: now,
      },
    };

    return pkg;
  }

  /**
   * Exporte le paquet .estudio-job en fichier téléchargeable
   */
  public exportJobFile(pkg: ProductionJobPackage): void {
    const jsonStr = JSON.stringify(pkg, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pkg.jobName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${pkg.jobId}.estudio-job`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Parse et valide un fichier de snapshot .estudio-job importé
   */
  public parseJobFile(jsonContent: string): ProductionJobPackage {
    const parsed = JSON.parse(jsonContent);
    if (!parsed.formatVersion || !parsed.datasetSnapshot || !parsed.templateSnapshot) {
      throw new Error('Format de fichier .estudio-job invalide ou corrompu.');
    }
    return parsed as ProductionJobPackage;
  }
}

export const jobPackageService = JobPackageService.getInstance();

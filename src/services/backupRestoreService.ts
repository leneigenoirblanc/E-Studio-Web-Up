/**
 * Backup / Restore Service
 * Permet l'exportation et la restauration intégrale d'un conteneur .estudio
 * Conforme à la Section 27 de PERSISTENCE_ARCHITECTURE.md
 */

import { BackupArchive, BackupManifest } from '../domain/persistenceTypes';
import { settingsRepository } from '../domain/repositories/settingsRepository';
import { productRepository } from '../domain/repositories/productRepository';
import { templateRepository } from '../domain/repositories/templateRepository';
import { printerRepository } from '../domain/repositories/printerRepository';
import { printJobRepository } from '../domain/repositories/printJobRepository';
import { importJobRepository } from '../domain/repositories/importJobRepository';
import { auditRepository } from '../domain/repositories/auditRepository';

const CURRENT_SCHEMA_VERSION = 1;
const APP_VERSION = '1.0.0';

export class BackupRestoreService {
  /**
   * Créer une archive de sauvegarde complète E-Studio
   */
  public static async createBackupArchive(): Promise<BackupArchive> {
    const settings = settingsRepository.getSettings();
    const products = await productRepository.findAll();
    const templates = templateRepository.getAll();
    const printers = await printerRepository.findAll();
    const rawPrintJobs = printJobRepository.getAll();
    const importJobs = await importJobRepository.findAll();
    const auditLogs = auditRepository.getAll();

    const manifest: BackupManifest = {
      manifestVersion: 1,
      appVersion: APP_VERSION,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      itemCounts: {
        products: products.length,
        templates: templates.length,
        printers: printers.length,
        printJobs: rawPrintJobs.length,
        importJobs: importJobs.length,
        auditEvents: auditLogs.length,
      },
    };

    const printJobs = rawPrintJobs.map((j) => ({
      id: j.id,
      tableName: j.tableName,
      templateName: j.templateName,
      printerId: 'default',
      printerName: 'Défaut',
      status: (j.status.toLowerCase() as any) || 'completed',
      totalLabels: j.totalLabels,
      printedLabels: j.totalLabels,
      failedLabels: 0,
      createdAt: new Date(j.createdAt).toISOString(),
      completedAt: j.completedAt ? new Date(j.completedAt).toISOString() : undefined,
      errorMessage: j.errorMessage,
    }));

    const auditEvents = auditLogs.map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      action: a.action,
      entityType: a.template_name ? 'template' : a.product_id ? 'product' : 'system',
      entityId: a.product_id || a.template_name || 'system',
      metadata: { details: a.details, user: a.user },
      operator: a.user,
    }));

    const archive: BackupArchive = {
      manifest,
      settings,
      products,
      templates,
      printers,
      printJobs,
      importJobs,
      auditEvents,
    };

    auditRepository.log({
      action: 'SYSTEM_BACKUP_CREATED',
      user: 'Système',
      details: `Sauvegarde .estudio créée avec ${products.length} produits et ${templates.length} gabarits`,
    });

    return archive;
  }

  /**
   * Télécharger l'archive sous forme de fichier .estudio
   */
  public static async downloadBackupFile(): Promise<void> {
    const archive = await this.createBackupArchive();
    const jsonString = JSON.stringify(archive, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const nowStr = new Date().toISOString().split('T')[0];
    const fileName = `E-Studio-Backup-${nowStr}.estudio`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Valider et restaurer une archive .estudio
   */
  public static async restoreFromBackup(
    archiveContent: string | object,
    options: { overwriteSettings?: boolean; overwriteProducts?: boolean } = {}
  ): Promise<{ success: boolean; message: string; counts: BackupManifest['itemCounts'] }> {
    try {
      const data: BackupArchive =
        typeof archiveContent === 'string' ? JSON.parse(archiveContent) : archiveContent;

      if (!data.manifest || !data.manifest.schemaVersion) {
        throw new Error('Fichier de sauvegarde invalide : métadonnées manifest absentes.');
      }

      // Restauration des préférences si demandée
      if (options.overwriteSettings !== false && data.settings) {
        await settingsRepository.updateSettings(data.settings);
      }

      // Restauration des templates
      if (Array.isArray(data.templates)) {
        for (const t of data.templates) {
          try {
            await templateRepository.save(t);
          } catch (e) {
            console.warn('Failed restoring template', t.name, e);
          }
        }
      }

      // Restauration des produits
      if (options.overwriteProducts !== false && Array.isArray(data.products)) {
        await productRepository.bulkSave(data.products);
      }

      // Restauration des imprimantes
      if (Array.isArray(data.printers)) {
        for (const p of data.printers) {
          await printerRepository.save(p);
        }
      }

      auditRepository.log({
        action: 'SYSTEM_BACKUP_RESTORED',
        user: 'Système',
        details: `Sauvegarde restaurée (exportée le ${data.manifest.exportedAt})`,
      });

      return {
        success: true,
        message: 'Sauvegarde restaurée avec succès.',
        counts: data.manifest.itemCounts,
      };
    } catch (err: any) {
      console.error('Restore failed:', err);
      return {
        success: false,
        message: `Échec de la restauration : ${err.message || err}`,
        counts: {
          products: 0,
          templates: 0,
          printers: 0,
          printJobs: 0,
          importJobs: 0,
          auditEvents: 0,
        },
      };
    }
  }
}

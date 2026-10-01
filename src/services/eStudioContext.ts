/**
 * EStudio Application Context
 * Point d'accès central unifié pour l'application E-Studio
 * Conforme à la Section 22 de PERSISTENCE_ARCHITECTURE.md
 */

import { settingsRepository } from '../domain/repositories/settingsRepository';
import { productRepository } from '../domain/repositories/productRepository';
import { templateRepository } from '../domain/repositories/templateRepository';
import { printerRepository } from '../domain/repositories/printerRepository';
import { printJobRepository } from '../domain/repositories/printJobRepository';
import { importJobRepository } from '../domain/repositories/importJobRepository';
import { auditRepository } from '../domain/repositories/auditRepository';
import { BackupRestoreService } from './backupRestoreService';
import { PricingService } from '../domain/pricingService';
import { ImpositionService } from '../domain/impositionService';
import { rulesRepository } from '../domain/orchestration/rulesRepository';
import { ruleOrchestrator } from '../domain/orchestration/ruleOrchestrator';
import { RuleTrigger } from '../domain/orchestration/types';

export class EStudioContext {
  private static instance: EStudioContext | null = null;

  public readonly settings = {
    get: () => settingsRepository.getSettings(),
    update: (partial: any) => settingsRepository.updateSettings(partial),
    reset: () => settingsRepository.resetToDefaults(),
    subscribe: (fn: any) => settingsRepository.subscribe(fn),
  };

  public readonly products = {
    getById: (id: string) => productRepository.findById(id),
    getByBarcode: (barcode: string) => productRepository.findByBarcode(barcode),
    getAll: () => productRepository.findAll(),
    save: (product: any) => productRepository.save(product),
    update: (product: any) => productRepository.update(product),
    delete: (id: string) => productRepository.delete(id),
    bulkSave: (products: any[]) => productRepository.bulkSave(products),
  };

  public readonly templates = {
    getAll: () => templateRepository.getAll(),
    getByName: (name: string) => templateRepository.getByName(name),
    save: (t: any) => templateRepository.save(t),
    delete: (name: string) => templateRepository.delete(name),
    subscribe: (fn: any) => templateRepository.subscribe(fn),
  };

  public readonly printers = {
    getAll: () => printerRepository.findAll(),
    getById: (id: string) => printerRepository.findById(id),
    getDefault: () => printerRepository.findDefault(),
    save: (printer: any) => printerRepository.save(printer),
    setDefault: (id: string) => printerRepository.setDefault(id),
    delete: (id: string) => printerRepository.delete(id),
  };

  public readonly imports = {
    getAll: () => importJobRepository.findAll(),
    getById: (id: string) => importJobRepository.findById(id),
    create: (job: any) => importJobRepository.create(job),
    updateStatus: (id: string, status: any, stats?: any) =>
      importJobRepository.updateStatus(id, status, stats),
  };

  public readonly printJobs = {
    getAll: () => printJobRepository.getAll(),
    getById: (id: string) => printJobRepository.getById(id),
    create: (job: any) => printJobRepository.createJob(job),
    update: (id: string, updates: any) => printJobRepository.updateJob(id, updates),
    clearHistory: () => printJobRepository.clearHistory(),
    subscribe: (fn: any) => printJobRepository.subscribe(fn),
  };

  public readonly audit = {
    getAll: () => auditRepository.getAll(),
    log: (entry: any) => auditRepository.log(entry),
    clear: () => auditRepository.clear(),
    subscribe: (fn: any) => auditRepository.subscribe(fn),
  };

  public readonly backup = {
    createArchive: () => BackupRestoreService.createBackupArchive(),
    downloadFile: () => BackupRestoreService.downloadBackupFile(),
    restore: (content: string | object, opts?: any) =>
      BackupRestoreService.restoreFromBackup(content, opts),
  };

  public readonly rules = {
    getAll: () => rulesRepository.getAll(),
    getById: (id: string) => rulesRepository.getById(id),
    save: (rule: any) => rulesRepository.save(rule),
    toggle: (id: string) => rulesRepository.toggle(id),
    delete: (id: string) => rulesRepository.delete(id),
    duplicate: (id: string) => rulesRepository.duplicate(id),
    getRuleSets: () => rulesRepository.getAllRuleSets(),
    subscribe: (fn: any) => rulesRepository.subscribe(fn),
  };

  public readonly orchestrator = {
    executeHook: (trigger: RuleTrigger, ctx: any, opts?: any) =>
      ruleOrchestrator.executeHook(trigger, ctx, rulesRepository.getAll(), opts),
    simulate: (trigger: RuleTrigger, ctx: any) =>
      ruleOrchestrator.executeHook(trigger, ctx, rulesRepository.getAll(), { dryRun: true, recordTrace: true }),
  };

  public readonly pricing = PricingService;
  public readonly imposition = ImpositionService;

  public static getInstance(): EStudioContext {
    if (!this.instance) {
      this.instance = new EStudioContext();
    }
    return this.instance;
  }
}

export const app = EStudioContext.getInstance();

/**
 * Import Job Repository
 * Historique persistant des imports de données (Excel, CSV)
 */

import { ImportJob, ImportJobStatus, ImportError } from '../persistenceTypes';

const STORAGE_KEY = 'estudio_import_jobs_v1';
const MAX_JOBS = 100;

export interface IImportJobRepository {
  findAll(): Promise<ImportJob[]>;
  findById(id: string): Promise<ImportJob | null>;
  create(job: Omit<ImportJob, 'id' | 'startedAt'>): Promise<ImportJob>;
  updateStatus(
    id: string,
    status: ImportJobStatus,
    stats?: { importedRows?: number; errorRows?: number; errors?: ImportError[] }
  ): Promise<ImportJob | null>;
}

export class ImportJobRepository implements IImportJobRepository {
  private static instance: ImportJobRepository | null = null;
  private jobs: ImportJob[] = [];

  private constructor() {
    this.load();
  }

  public static getInstance(): ImportJobRepository {
    if (!this.instance) {
      this.instance = new ImportJobRepository();
    }
    return this.instance;
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.jobs = JSON.parse(raw);
      }
    } catch {
      this.jobs = [];
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs.slice(0, MAX_JOBS)));
    } catch (e) {
      console.error('Failed to persist import jobs:', e);
    }
  }

  public async findAll(): Promise<ImportJob[]> {
    return [...this.jobs];
  }

  public async findById(id: string): Promise<ImportJob | null> {
    const found = this.jobs.find((j) => j.id === id);
    return found ? { ...found } : null;
  }

  public async create(job: Omit<ImportJob, 'id' | 'startedAt'>): Promise<ImportJob> {
    const newJob: ImportJob = {
      ...job,
      id: `IMP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      startedAt: new Date().toISOString(),
    };
    this.jobs.unshift(newJob);
    this.persist();
    return newJob;
  }

  public async updateStatus(
    id: string,
    status: ImportJobStatus,
    stats?: { importedRows?: number; errorRows?: number; errors?: ImportError[] }
  ): Promise<ImportJob | null> {
    const job = this.jobs.find((j) => j.id === id);
    if (!job) return null;

    job.status = status;
    if (stats?.importedRows !== undefined) job.importedRows = stats.importedRows;
    if (stats?.errorRows !== undefined) job.errorRows = stats.errorRows;
    if (stats?.errors) job.errors = stats.errors;
    if (status === 'completed' || status === 'failed') {
      job.completedAt = new Date().toISOString();
    }

    this.persist();
    return { ...job };
  }
}

export const importJobRepository = ImportJobRepository.getInstance();

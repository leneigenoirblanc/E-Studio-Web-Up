/**
 * E-Studio Production Job Repository
 * Conforms to SECTION 30 (Job Workspace) & 37 (Persistence Truth)
 * 
 * Manages persistent storage of production jobs, frozen datasets, and output attempts.
 */

import { ProductionJob, OutputAttempt } from './jobModel';
import { auditRepository } from '../repositories/auditRepository';

const STORAGE_KEY = 'estudio_production_jobs_v2';

class JobRepository {
  private jobs: ProductionJob[] = [];
  private listeners: Array<(jobs: ProductionJob[]) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.jobs = parsed;
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load jobs from storage, initializing empty list', e);
    }
    this.jobs = [];
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs));
      }
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to save jobs to storage', e);
    }
  }

  public getAll(): ProductionJob[] {
    return [...this.jobs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getById(id: string): ProductionJob | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  public save(job: ProductionJob): ProductionJob {
    const existingIndex = this.jobs.findIndex((j) => j.id === job.id);
    const updated: ProductionJob = {
      ...job,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.jobs[existingIndex] = updated;
    } else {
      this.jobs.unshift(updated);
      auditRepository.log({
        action: 'JOB_CREATED',
        user: updated.operator,
        details: `Travail "${updated.name}" créé pour gabarit "${updated.templateName}" (${updated.rawRows.length} lignes)`,
      });
    }

    this.saveToStorage();
    return updated;
  }

  public delete(id: string): boolean {
    const found = this.jobs.find((j) => j.id === id);
    if (!found) return false;

    this.jobs = this.jobs.filter((j) => j.id !== id);
    this.saveToStorage();

    auditRepository.log({
      action: 'JOB_DELETED',
      user: found.operator,
      details: `Travail "${found.name}" (${id}) supprimé`,
    });

    return true;
  }

  public duplicateAsNew(id: string): ProductionJob | null {
    const source = this.getById(id);
    if (!source) return null;

    const newId = `JOB-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const clone: ProductionJob = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: `Copie de ${source.name}`,
      status: 'STAGED',
      frozenAt: undefined,
      frozenHash: undefined,
      outputAttempts: [],
      lastCompletedIndex: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.unshift(clone);
    this.saveToStorage();
    return clone;
  }

  /**
   * Records an output attempt and updates lastCompletedIndex for resumable printing
   */
  public recordOutputAttempt(jobId: string, attempt: OutputAttempt): ProductionJob | null {
    const job = this.getById(jobId);
    if (!job) return null;

    job.outputAttempts.push(attempt);
    
    if (attempt.outcome === 'ACKNOWLEDGED' || attempt.outcome === 'HANDED_TO_SYSTEM') {
      job.lastCompletedIndex = Math.max(job.lastCompletedIndex, attempt.endIndex);
      if (job.lastCompletedIndex >= job.totalLabels) {
        job.status = 'COMPLETED';
      } else {
        job.status = 'PARTIAL';
      }
    } else if (attempt.outcome === 'PARTIAL') {
      job.lastCompletedIndex = Math.max(job.lastCompletedIndex, attempt.completedQuantity);
      job.status = 'PARTIAL';
    } else if (attempt.outcome === 'FAILED') {
      job.status = 'PARTIAL'; // keep partial/failed for retry
    }

    job.updatedAt = new Date().toISOString();
    this.save(job);

    auditRepository.log({
      action: 'OUTPUT_ATTEMPT',
      user: attempt.operator,
      details: `Sortie ${attempt.outputFormat} (${attempt.outcome}) sur ${attempt.printerName} - Plage ${attempt.startIndex + 1}..${attempt.endIndex}`,
    });

    return job;
  }

  public subscribe(listener: (jobs: ProductionJob[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getAll());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    const all = this.getAll();
    this.listeners.forEach((l) => {
      try {
        l(all);
      } catch (e) {
        console.error('Error notifying job listener', e);
      }
    });
  }
}

export const jobRepository = new JobRepository();

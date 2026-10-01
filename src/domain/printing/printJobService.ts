import { PrintJob, PrintJobStatus, PrintJobLog } from './types';

const STORAGE_KEY = 'estudio_print_jobs_v3';

export class PrintJobService {
  private jobs: PrintJob[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadJobs();
  }

  private loadJobs() {
    try {
      localStorage.removeItem('estudio_print_jobs_v2');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.jobs = Array.isArray(parsed)
          ? parsed.filter((j: PrintJob) => !j.id.startsWith('job-init-'))
          : [];
      } else {
        this.jobs = [];
      }
    } catch {
      this.jobs = [];
    }
  }

  private saveJobs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs));
      this.notify();
    } catch (e) {
      console.error('Failed to save print jobs', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getAll(): PrintJob[] {
    return this.jobs;
  }

  public getById(id: string): PrintJob | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  public createJob(params: {
    templateId: string;
    templateName: string;
    labelFormatId: string;
    labelFormatName: string;
    printerInstanceId: string;
    printerName: string;
    dataSource: string;
    quantity: number;
    copies: number;
    renderingMode: 'native' | 'raster';
  }): PrintJob {
    const totalLabels = params.quantity * params.copies;
    const newJob: PrintJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...params,
      totalLabels,
      createdAt: Date.now(),
      status: 'QUEUED',
      lastCompletedIndex: -1,
      failedIndices: [],
      logs: [
        {
          timestamp: Date.now(),
          message: `Travail créé pour ${totalLabels} étiquette(s) via mode ${params.renderingMode.toUpperCase()}`,
          type: 'info',
        },
      ],
    };

    this.jobs.unshift(newJob);
    this.saveJobs();
    return newJob;
  }

  public updateJobStatus(id: string, status: PrintJobStatus, extra?: Partial<PrintJob>): void {
    const job = this.getById(id);
    if (!job) return;

    job.status = status;
    if (status === 'PRINTING' && !job.startedAt) {
      job.startedAt = Date.now();
    }
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
      job.completedAt = Date.now();
    }

    if (extra) {
      Object.assign(job, extra);
    }

    this.saveJobs();
  }

  public addLog(id: string, message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
    const job = this.getById(id);
    if (!job) return;
    job.logs.push({
      timestamp: Date.now(),
      message,
      type,
    });
    this.saveJobs();
  }

  /**
   * Resumes a paused or partially failed print job starting from lastCompletedIndex + 1
   */
  public resumeJob(id: string): boolean {
    const job = this.getById(id);
    if (!job) return false;

    if (job.status === 'COMPLETED') return false;

    const fromIndex = job.lastCompletedIndex + 1;
    this.addLog(id, `Reprise de l'impression à partir de l'étiquette #${fromIndex + 1}/${job.totalLabels}`, 'info');
    this.updateJobStatus(id, 'PRINTING');
    return true;
  }

  /**
   * Retry specifically failed labels
   */
  public retryFailed(id: string): boolean {
    const job = this.getById(id);
    if (!job || job.failedIndices.length === 0) return false;

    this.addLog(id, `Nouvelle tentative pour les ${job.failedIndices.length} étiquettes en échec`, 'warn');
    job.failedIndices = [];
    job.status = 'PRINTING';
    this.saveJobs();
    return true;
  }

  public cancelJob(id: string): boolean {
    const job = this.getById(id);
    if (!job || job.status === 'COMPLETED' || job.status === 'CANCELLED') return false;

    this.addLog(id, 'Impression annulée par l\'opérateur', 'warn');
    this.updateJobStatus(id, 'CANCELLED');
    return true;
  }
}

export const printJobService = new PrintJobService();

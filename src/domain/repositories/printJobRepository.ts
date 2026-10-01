/**
 * Print Job Repository (Local-First Data Layer)
 * Manages durable print jobs, queue state, progress tracking, and print history.
 */

export interface PrintJobRecord {
  id: string;
  tableId?: string;
  tableName: string;
  templateName: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number; // 0 to 100
  totalLabels: number;
  totalPages?: number;
  format: 'PDF' | 'ZPL' | 'PPTX' | 'DIRECT_PRINT';
  createdAt: number;
  completedAt?: number;
  errorMessage?: string;
  operatorName?: string;
}

const STORAGE_KEY = 'estudio_print_jobs_v1';

export class PrintJobRepository {
  private static instance: PrintJobRepository | null = null;
  private jobs: PrintJobRecord[] = [];
  private listeners: Array<(jobs: PrintJobRecord[]) => void> = [];

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): PrintJobRepository {
    if (!this.instance) {
      this.instance = new PrintJobRepository();
    }
    return this.instance;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.jobs = JSON.parse(saved);
      }
    } catch {
      this.jobs = [];
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.jobs));
    } catch {}
    this.notify();
  }

  public getAll(): PrintJobRecord[] {
    return [...this.jobs];
  }

  public getById(id: string): PrintJobRecord | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  public createJob(job: Omit<PrintJobRecord, 'id' | 'createdAt' | 'status' | 'progress'>): PrintJobRecord {
    const newJob: PrintJobRecord = {
      ...job,
      id: `JOB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: Date.now(),
      status: 'QUEUED',
      progress: 0,
    };
    this.jobs.unshift(newJob);
    this.persist();
    return newJob;
  }

  public updateJob(id: string, updates: Partial<PrintJobRecord>): PrintJobRecord | null {
    const job = this.jobs.find((j) => j.id === id);
    if (!job) return null;
    Object.assign(job, updates);
    this.persist();
    return { ...job };
  }

  public clearHistory(): void {
    this.jobs = this.jobs.filter((j) => j.status === 'QUEUED' || j.status === 'PROCESSING');
    this.persist();
  }

  public subscribe(cb: (jobs: PrintJobRecord[]) => void): () => void {
    this.listeners.push(cb);
    cb(this.getAll());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(): void {
    const current = this.getAll();
    this.listeners.forEach((l) => {
      try {
        l(current);
      } catch {}
    });
  }
}

export const printJobRepository = PrintJobRepository.getInstance();

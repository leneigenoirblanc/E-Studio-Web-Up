/**
 * Audit Repository (Local-First Data Layer)
 * Manages immutable audit logs for compliance, operator activity tracking,
 * barcode changes, pricing overrides, and template edits.
 */

import { AuditLogEntry } from '../../types';

const STORAGE_KEY = 'estudio_audit_logs_v1';
const MAX_LOGS = 1000;

export class AuditRepository {
  private static instance: AuditRepository | null = null;
  private logs: AuditLogEntry[] = [];
  private listeners: Array<(logs: AuditLogEntry[]) => void> = [];

  private constructor() {
    this.load();
  }

  public static getInstance(): AuditRepository {
    if (!this.instance) {
      this.instance = new AuditRepository();
    }
    return this.instance;
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch {
      this.logs = [];
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(0, MAX_LOGS)));
    } catch {}
    this.notify();
  }

  public getAll(): AuditLogEntry[] {
    return [...this.logs];
  }

  public log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const record: AuditLogEntry = {
      ...entry,
      id: `AUD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(record);
    this.persist();
    return record;
  }

  public clear(): void {
    this.logs = [];
    this.persist();
  }

  public subscribe(cb: (logs: AuditLogEntry[]) => void): () => void {
    this.listeners.push(cb);
    cb(this.getAll());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(): void {
    const list = this.getAll();
    this.listeners.forEach((cb) => {
      try {
        cb(list);
      } catch {}
    });
  }
}

export const auditRepository = AuditRepository.getInstance();

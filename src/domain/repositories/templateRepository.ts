/**
 * Template Repository (Local-First Data Layer)
 * Implements a durable IndexedDB repository for label templates with:
 * - Deterministic schema versioning
 * - Automatic migration from legacy localStorage
 * - Reactive listener subscriptions
 * - Resilient fallback in constrained environments
 */

import { LabelTemplate } from '../../types';
import { DEFAULT_TEMPLATES } from '../../defaultTemplates';

const DB_NAME = 'EStudioTemplatesDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'templates';
const LEGACY_STORAGE_KEY = 'estudio_templates_v1';

export class TemplateRepository {
  private static instance: TemplateRepository | null = null;
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private cache: LabelTemplate[] = [];
  private listeners: Array<(templates: LabelTemplate[]) => void> = [];
  private isInitialized: boolean = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): TemplateRepository {
    if (!this.instance) {
      this.instance = new TemplateRepository();
    }
    return this.instance;
  }

  private init(): void {
    if (typeof window === 'undefined') {
      this.cache = [...DEFAULT_TEMPLATES];
      this.isInitialized = true;
      return;
    }

    // Step 1: Pre-populate cache immediately from localStorage (zero render delay)
    try {
      const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cache = parsed;
        } else {
          this.cache = [...DEFAULT_TEMPLATES];
        }
      } else {
        this.cache = [...DEFAULT_TEMPLATES];
      }
    } catch {
      this.cache = [...DEFAULT_TEMPLATES];
    }

    // Step 2: Asynchronously open IndexedDB for durable local persistence
    if ('indexedDB' in window) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const request = indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
          };

          request.onsuccess = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            resolve(db);
            this.syncFromIndexedDB(db);
          };

          request.onerror = () => {
            console.warn('[TemplateRepository] IndexedDB failed to open, using memory/localStorage fallback');
            resolve(null);
          };
        } catch {
          resolve(null);
        }
      });
    }

    this.isInitialized = true;
  }

  private async syncFromIndexedDB(db: IDBDatabase): Promise<void> {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const stored = req.result as LabelTemplate[];
        if (stored && stored.length > 0) {
          this.cache = stored;
          this.notifyListeners();
        } else {
          // First time initialization in IndexedDB: seed with current cache (defaults or legacy)
          this.persistAllToIndexedDB(this.cache);
        }
      };
    } catch (err) {
      console.warn('[TemplateRepository] Failed to read from IndexedDB', err);
    }
  }

  private async persistAllToIndexedDB(templates: LabelTemplate[]): Promise<void> {
    // Keep localStorage in sync for instant sync across tabs and fast first paints
    try {
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(templates));
    } catch {}

    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    if (!db) return;

    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      templates.forEach((t) => store.put(t));
    } catch (err) {
      console.warn('[TemplateRepository] Failed to write templates to IndexedDB', err);
    }
  }

  public getAll(): LabelTemplate[] {
    return [...this.cache];
  }

  public getByName(name: string): LabelTemplate | undefined {
    return this.cache.find((t) => t.name === name);
  }

  public async save(template: LabelTemplate): Promise<void> {
    const existingIdx = this.cache.findIndex((t) => t.name === template.name);
    if (existingIdx >= 0) {
      this.cache[existingIdx] = { ...template };
    } else {
      this.cache.push({ ...template });
    }
    await this.persistAllToIndexedDB(this.cache);
    this.notifyListeners();
  }

  public async delete(templateName: string): Promise<void> {
    this.cache = this.cache.filter((t) => t.name !== templateName);
    await this.persistAllToIndexedDB(this.cache);
    this.notifyListeners();
  }

  public async duplicate(templateName: string): Promise<LabelTemplate | null> {
    const orig = this.getByName(templateName);
    if (!orig) return null;

    let copyName = `${orig.name} (Copie)`;
    let counter = 2;
    while (this.cache.some((t) => t.name === copyName)) {
      copyName = `${orig.name} (Copie ${counter++})`;
    }

    const cloned: LabelTemplate = {
      ...JSON.parse(JSON.stringify(orig)),
      name: copyName,
    };

    this.cache.push(cloned);
    await this.persistAllToIndexedDB(this.cache);
    this.notifyListeners();
    return cloned;
  }

  public async resetToDefaults(): Promise<void> {
    this.cache = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
    await this.persistAllToIndexedDB(this.cache);
    this.notifyListeners();
  }

  public subscribe(callback: (templates: LabelTemplate[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.getAll());
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    const list = this.getAll();
    this.listeners.forEach((cb) => {
      try {
        cb(list);
      } catch (err) {
        console.error('[TemplateRepository] Error in listener', err);
      }
    });
  }
}

export const templateRepository = TemplateRepository.getInstance();

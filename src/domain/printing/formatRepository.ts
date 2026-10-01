import { LabelFormat } from './types';
import { CANONICAL_LABEL_FORMATS } from './formatCatalog';

const STORAGE_KEY = 'estudio_custom_formats_v2';

export class FormatRepository {
  private customFormats: LabelFormat[] = [];

  constructor() {
    this.loadCustomFormats();
  }

  private loadCustomFormats() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.customFormats = JSON.parse(saved);
      }
    } catch {
      this.customFormats = [];
    }
  }

  private saveCustomFormats() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customFormats));
    } catch (e) {
      console.error('Failed to persist custom formats', e);
    }
  }

  public getAll(): LabelFormat[] {
    return [...CANONICAL_LABEL_FORMATS, ...this.customFormats];
  }

  public getById(id: string): LabelFormat | undefined {
    return this.getAll().find((f) => f.id === id);
  }

  public getSystemFormats(): LabelFormat[] {
    return CANONICAL_LABEL_FORMATS;
  }

  public getCustomFormats(): LabelFormat[] {
    return this.customFormats;
  }

  public createCustomFormat(data: Omit<LabelFormat, 'id' | 'isBuiltIn' | 'isCustom' | 'version' | 'createdAt' | 'updatedAt'>): LabelFormat {
    const newFormat: LabelFormat = {
      ...data,
      id: `custom-fmt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      isBuiltIn: false,
      isCustom: true,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.customFormats.unshift(newFormat);
    this.saveCustomFormats();
    return newFormat;
  }

  /**
   * Part IX: Migration & Snapshot policy for duplicates.
   * System presets are never modified directly. Duplicates snapshot values.
   */
  public duplicateFormat(sourceId: string, customName?: string): LabelFormat | null {
    const source = this.getById(sourceId);
    if (!source) return null;

    const duplicate: LabelFormat = {
      ...source,
      id: `custom-fmt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: customName || `${source.name} (Personnalisé)`,
      description: `Format personnalisé dérivé de ${source.name}`,
      isBuiltIn: false,
      isCustom: true,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.customFormats.unshift(duplicate);
    this.saveCustomFormats();
    return duplicate;
  }

  public updateCustomFormat(id: string, updates: Partial<LabelFormat>): LabelFormat | null {
    const index = this.customFormats.findIndex((f) => f.id === id);
    if (index === -1) {
      // Cannot edit system format
      return null;
    }

    this.customFormats[index] = {
      ...this.customFormats[index],
      ...updates,
      updatedAt: Date.now(),
    };
    this.saveCustomFormats();
    return this.customFormats[index];
  }

  public deleteCustomFormat(id: string): boolean {
    const initialLen = this.customFormats.length;
    this.customFormats = this.customFormats.filter((f) => f.id !== id);
    if (this.customFormats.length !== initialLen) {
      this.saveCustomFormats();
      return true;
    }
    return false;
  }
}

export const formatRepository = new FormatRepository();

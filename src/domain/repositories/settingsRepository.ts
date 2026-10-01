/**
 * Settings Repository (Tauri Store / LocalStorage Fallback)
 * Gère la persistance, l'auto-save debouncé et le versionnement des préférences
 */

import { AppSettings, DEFAULT_APP_SETTINGS, migrateSettings } from '../persistenceTypes';

const STORAGE_KEY = 'estudio_app_settings_v1';

export interface ISettingsRepository {
  getSettings(): AppSettings;
  updateSettings(partial: Partial<AppSettings>): Promise<AppSettings>;
  resetToDefaults(): Promise<AppSettings>;
  subscribe(listener: (settings: AppSettings) => void): () => void;
}

export class SettingsRepository implements ISettingsRepository {
  private static instance: SettingsRepository | null = null;
  private currentSettings: AppSettings;
  private listeners: Array<(settings: AppSettings) => void> = [];
  private saveDebounceTimer: any = null;

  private constructor() {
    this.currentSettings = this.loadFromStorage();
  }

  public static getInstance(): SettingsRepository {
    if (!this.instance) {
      this.instance = new SettingsRepository();
    }
    return this.instance;
  }

  private loadFromStorage(): AppSettings {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_APP_SETTINGS };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return migrateSettings(parsed);
      }
    } catch (e) {
      console.warn('Failed to load settings from storage:', e);
    }

    return { ...DEFAULT_APP_SETTINGS };
  }

  private persist(): void {
    if (typeof window === 'undefined') return;

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
      } catch (e) {
        console.error('Error saving settings to storage:', e);
      }
    }, 200);

    this.notify();
  }

  public getSettings(): AppSettings {
    return { ...this.currentSettings };
  }

  public async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    this.currentSettings = migrateSettings({
      ...this.currentSettings,
      ...partial,
      general: {
        ...this.currentSettings.general,
        ...(partial.general || {}),
      },
      editor: {
        ...this.currentSettings.editor,
        ...(partial.editor || {}),
      },
      scanner: {
        ...this.currentSettings.scanner,
        ...(partial.scanner || {}),
      },
      pricing: {
        ...this.currentSettings.pricing,
        ...(partial.pricing || {}),
      },
      printing: {
        ...this.currentSettings.printing,
        ...(partial.printing || {}),
      },
    });

    this.persist();
    return this.getSettings();
  }

  public async resetToDefaults(): Promise<AppSettings> {
    this.currentSettings = { ...DEFAULT_APP_SETTINGS };
    this.persist();
    return this.getSettings();
  }

  public subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.push(listener);
    listener(this.getSettings());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const s = this.getSettings();
    this.listeners.forEach((fn) => {
      try {
        fn(s);
      } catch {}
    });
  }
}

export const settingsRepository = SettingsRepository.getInstance();

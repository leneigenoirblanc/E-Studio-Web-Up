/**
 * Tauri Desktop Service
 * Provides desktop integration when running inside Tauri Windows/macOS/Linux.
 * Gracefully falls back to browser standard web APIs when running in the browser.
 */

export interface DesktopInfo {
  isTauri: boolean;
  platform: 'windows' | 'macos' | 'linux' | 'web';
  appName: string;
  version: string;
}

export class TauriDesktopService {
  private static cachedIsTauri: boolean | null = null;

  /**
   * Check if running in Tauri desktop environment
   */
  public static isTauri(): boolean {
    if (this.cachedIsTauri !== null) return this.cachedIsTauri;
    if (typeof window !== 'undefined') {
      const w = window as any;
      this.cachedIsTauri = Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
      return this.cachedIsTauri;
    }
    return false;
  }

  /**
   * Get desktop environment metadata
   */
  public static async getDesktopInfo(): Promise<DesktopInfo> {
    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = (await invoke('get_desktop_info')) as any;
        return {
          isTauri: true,
          platform: res?.platform || 'windows',
          appName: res?.app_name || 'E-Studio',
          version: res?.version || '1.0.0',
        };
      } catch {
        return {
          isTauri: true,
          platform: 'windows',
          appName: 'E-Studio',
          version: '1.0.0',
        };
      }
    }

    return {
      isTauri: false,
      platform: 'web',
      appName: 'E-Studio Web',
      version: '1.0.0',
    };
  }

  /**
   * Minimize the current desktop window (Windows)
   */
  public static async minimizeWindow(): Promise<void> {
    if (!this.isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (e) {
      console.warn('Tauri window minimize error:', e);
    }
  }

  /**
   * Toggle maximize / restore for current desktop window
   */
  public static async toggleMaximizeWindow(): Promise<void> {
    if (!this.isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch (e) {
      console.warn('Tauri window toggle maximize error:', e);
    }
  }

  /**
   * Close the desktop window
   */
  public static async closeWindow(): Promise<void> {
    if (!this.isTauri()) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (e) {
      console.warn('Tauri window close error:', e);
    }
  }
}

export const tauriDesktopService = TauriDesktopService;

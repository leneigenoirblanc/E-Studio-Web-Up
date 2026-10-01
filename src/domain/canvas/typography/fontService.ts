/**
 * E-Studio Central Font Service & Registry (Sections 17-18)
 * Classification : System, Application, Project, Embedded, Missing
 */

import { FontRecord, FontReference, FontService, FontAvailability, TypographyStyle } from './types';

export class CentralFontService implements FontService {
  private static instance: CentralFontService | null = null;
  private registry: Map<string, FontRecord> = new Map();
  private projectFonts: Map<string, FontRecord> = new Map();

  private constructor() {
    this.seedApplicationFonts();
  }

  public static getInstance(): CentralFontService {
    if (!this.instance) {
      this.instance = new CentralFontService();
    }
    return this.instance;
  }

  private seedApplicationFonts() {
    const fonts: FontRecord[] = [
      {
        id: 'font-oswald',
        family: 'Oswald',
        category: 'display',
        weights: [400, 500, 600, 700],
        styles: ['normal'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-inter',
        family: 'Inter',
        category: 'sans-serif',
        weights: [300, 400, 500, 600, 700, 800],
        styles: ['normal', 'italic'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-roboto',
        family: 'Roboto',
        category: 'sans-serif',
        weights: [300, 400, 500, 700, 900],
        styles: ['normal', 'italic'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-plus-jakarta',
        family: 'Plus Jakarta Sans',
        category: 'sans-serif',
        weights: [400, 500, 600, 700, 800],
        styles: ['normal', 'italic'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-jetbrains-mono',
        family: 'JetBrains Mono',
        category: 'monospace',
        weights: [400, 500, 600, 700],
        styles: ['normal', 'italic'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-montserrat',
        family: 'Montserrat',
        category: 'sans-serif',
        weights: [400, 500, 600, 700, 800],
        styles: ['normal', 'italic'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-arial',
        family: 'Arial',
        category: 'sans-serif',
        weights: [400, 700],
        styles: ['normal', 'italic'],
        source: 'system',
        available: true,
        supportsTabularNumbers: false,
      },
      {
        id: 'font-helvetica',
        family: 'Helvetica',
        category: 'sans-serif',
        weights: [400, 700],
        styles: ['normal', 'italic'],
        source: 'system',
        available: true,
        supportsTabularNumbers: false,
      },
      {
        id: 'font-courier',
        family: 'Courier New',
        category: 'monospace',
        weights: [400, 700],
        styles: ['normal', 'italic'],
        source: 'system',
        available: true,
        supportsTabularNumbers: true,
      },
    ];

    fonts.forEach((f) => this.registry.set(f.id, f));
  }

  public async listFonts(): Promise<FontRecord[]> {
    return [
      ...Array.from(this.registry.values()),
      ...Array.from(this.projectFonts.values()),
    ];
  }

  public async getFont(id: string): Promise<FontRecord | null> {
    return this.registry.get(id) || this.projectFonts.get(id) || null;
  }

  public async searchFonts(query: string): Promise<FontRecord[]> {
    const q = query.toLowerCase().trim();
    const all = await this.listFonts();
    if (!q) return all;
    return all.filter((f) => f.family.toLowerCase().includes(q) || f.category.includes(q as any));
  }

  public async validateFont(fontId: string): Promise<FontAvailability> {
    const found = await this.getFont(fontId);
    if (!found) {
      return {
        fontId,
        isAvailable: false,
        fallbackFontId: 'font-plus-jakarta',
        message: `Police introuvable '${fontId}', repli vers Plus Jakarta Sans.`,
      };
    }
    return {
      fontId,
      isAvailable: found.available,
      fallbackFontId: found.available ? undefined : 'font-plus-jakarta',
    };
  }

  public async registerProjectFont(fontPath: string): Promise<FontRecord> {
    const fileName = fontPath.split(/[\\/]/).pop() || 'CustomFont';
    const family = fileName.replace(/\.[^/.]+$/, '');
    const id = `project-${family.toLowerCase().replace(/\s+/g, '-')}`;

    const record: FontRecord = {
      id,
      family,
      category: 'sans-serif',
      weights: [400, 700],
      styles: ['normal'],
      source: 'project',
      available: true,
      supportsTabularNumbers: true,
    };

    this.projectFonts.set(id, record);
    return record;
  }

  public createFontReference(family: string, fallbackFamilies: string[] = ['sans-serif']): FontReference {
    const clean = family.toLowerCase().trim();
    const match = Array.from(this.registry.values()).find((f) => f.family.toLowerCase() === clean);
    return {
      fontId: match?.id || `custom-${clean.replace(/\s+/g, '-')}`,
      family: match?.family || family,
      postScriptName: match?.postScriptName,
      weight: 400,
      style: 'normal',
      source: match?.source || 'system',
      fallbackFontIds: match ? ['font-plus-jakarta'] : fallbackFamilies,
    };
  }

  public createTypographyStyle(overrides: Partial<TypographyStyle> = {}, family: string = 'Plus Jakarta Sans'): TypographyStyle {
    return {
      font: this.createFontReference(family),
      sizePt: 12,
      weight: 400,
      style: 'normal',
      stretch: 1,
      color: '#0f172a',
      letterSpacingPt: 0,
      lineHeight: 'auto',
      baselineShiftPt: 0,
      alignment: 'left',
      verticalAlignment: 'top',
      textTransform: 'none',
      decoration: {
        underline: false,
        lineThrough: false,
        overline: false,
      },
      kerning: true,
      ligatures: true,
      openTypeFeatures: {
        tnum: true,
      },
      ...overrides,
    };
  }
}

export const fontService = CentralFontService.getInstance();

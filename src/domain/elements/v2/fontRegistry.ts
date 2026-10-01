/**
 * E-Studio Central Font Registry Service
 * Gestionnaire unifié de polices : système, application, web (Google Fonts), projet et embarquées.
 * Fournit la résolution de fallbacks, les aperçus typographiques et les métadonnées OpenType.
 */

import { FontReference, FontStyle, FontWeight, TypographyStyle } from './types';

export interface FontRecord {
  id: string;
  family: string;
  postScriptName?: string;
  category: 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting';
  weights: FontWeight[];
  styles: FontStyle[];
  source: 'system' | 'application' | 'project' | 'embedded' | 'google';
  available: boolean;
  sampleText?: string;
  supportsTabularNumbers: boolean;
}

export class FontRegistry {
  private static instance: FontRegistry | null = null;
  private fonts: Map<string, FontRecord> = new Map();

  private constructor() {
    this.seedDefaultFonts();
  }

  public static getInstance(): FontRegistry {
    if (!this.instance) {
      this.instance = new FontRegistry();
    }
    return this.instance;
  }

  private seedDefaultFonts() {
    const defaultCatalog: FontRecord[] = [
      {
        id: 'font-inter',
        family: 'Inter',
        category: 'sans-serif',
        weights: ['300', '400', '500', '600', '700', '800'],
        styles: ['normal', 'italic'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-roboto',
        family: 'Roboto',
        category: 'sans-serif',
        weights: ['300', '400', '500', '700', '900'],
        styles: ['normal', 'italic'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-oswald',
        family: 'Oswald',
        category: 'display',
        weights: ['400', '500', '600', '700'],
        styles: ['normal'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-montserrat',
        family: 'Montserrat',
        category: 'sans-serif',
        weights: ['400', '500', '600', '700', '800'],
        styles: ['normal', 'italic'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-arial',
        family: 'Arial',
        category: 'sans-serif',
        weights: ['400', '700'],
        styles: ['normal', 'italic'],
        source: 'system',
        available: true,
        supportsTabularNumbers: false,
      },
      {
        id: 'font-helvetica',
        family: 'Helvetica',
        category: 'sans-serif',
        weights: ['400', '700'],
        styles: ['normal', 'italic'],
        source: 'system',
        available: true,
        supportsTabularNumbers: false,
      },
      {
        id: 'font-courier',
        family: 'Courier New',
        category: 'monospace',
        weights: ['400', '700'],
        styles: ['normal', 'italic'],
        source: 'system',
        available: true,
        supportsTabularNumbers: true,
      },
      {
        id: 'font-bebas-neue',
        family: 'Bebas Neue',
        category: 'display',
        weights: ['400'],
        styles: ['normal'],
        source: 'application',
        available: true,
        supportsTabularNumbers: true,
      },
    ];

    defaultCatalog.forEach((f) => this.fonts.set(f.id, f));
  }

  public getAllFonts(): FontRecord[] {
    return Array.from(this.fonts.values());
  }

  public getFontById(id: string): FontRecord | undefined {
    return this.fonts.get(id);
  }

  public findFontByFamily(family: string): FontRecord | undefined {
    const clean = family.toLowerCase().trim();
    return Array.from(this.fonts.values()).find((f) => f.family.toLowerCase() === clean);
  }

  /**
   * Crée une référence typographique standardisée
   */
  public createFontReference(family: string, fallbackFamilies: string[] = ['sans-serif']): FontReference {
    const match = this.findFontByFamily(family);
    return {
      fontId: match?.id || `custom-${family.toLowerCase().replace(/\s+/g, '-')}`,
      family: match?.family || family,
      postScriptName: match?.postScriptName,
      source: match?.source || 'system',
      fallbackFamilies: match ? ['sans-serif'] : fallbackFamilies,
    };
  }

  /**
   * Génère un TypographyStyle par défaut pour les textes ou les prix
   */
  public createDefaultTypography(
    overrides: Partial<TypographyStyle> = {},
    family: string = 'Inter'
  ): TypographyStyle {
    return {
      font: this.createFontReference(family),
      sizePt: 12,
      weight: '400',
      style: 'normal',
      stretch: 'normal',
      color: '#0f172a',
      letterSpacingPt: 0,
      lineHeight: 'auto',
      alignment: 'left',
      verticalAlignment: 'top',
      textTransform: 'none',
      decoration: {
        underline: false,
        lineThrough: false,
        overline: false,
      },
      baselineShiftPt: 0,
      kerning: true,
      ligatures: true,
      openTypeFeatures: {
        tnum: true,
        lnum: true,
      },
      ...overrides,
    };
  }

  /**
   * Convertit un TypographyStyle en chaîne CSS font de manière robuste
   */
  public toCssProperties(style?: Partial<TypographyStyle> | any): React.CSSProperties {
    if (!style) {
      return { fontFamily: 'Inter, sans-serif', fontSize: '12pt', color: '#0f172a' };
    }

    const family =
      style.font?.family ||
      style.fontFamily ||
      style.font_family ||
      'Inter';

    const fallbackFamilies: string[] =
      style.font?.fallbackFamilies || ['sans-serif'];

    const fontFamilies = [`"${family}"`, ...fallbackFamilies].join(', ');

    const sizePt = style.sizePt ?? style.font_size_pt ?? 12;
    const weight = style.weight ?? style.font_weight ?? '400';
    const fontStyle = style.style ?? style.font_style ?? 'normal';
    const color = style.color ?? style.text_color ?? '#0f172a';
    const letterSpacingPt = style.letterSpacingPt ?? style.letter_spacing_pt ?? 0;
    const lineHeight = style.lineHeight ?? style.line_height_multiplier ?? 'normal';
    const alignment = style.alignment ?? 'left';
    const textTransform = style.textTransform ?? style.text_transform ?? 'none';

    let textDecoration: string | undefined = undefined;
    if (typeof style.text_decoration === 'string' && style.text_decoration !== 'none') {
      textDecoration = style.text_decoration;
    } else if (style.decoration) {
      textDecoration = [
        style.decoration.underline ? 'underline' : '',
        style.decoration.lineThrough ? 'line-through' : '',
        style.decoration.overline ? 'overline' : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined;
    }

    const baselineShiftPt =
      style.baselineShiftPt ??
      (style.baseline_shift === 'superscript' ? 6 : style.baseline_shift === 'subscript' ? -4 : 0);

    return {
      fontFamily: fontFamilies,
      fontSize: typeof sizePt === 'number' ? `${sizePt}pt` : sizePt,
      fontWeight: String(weight),
      fontStyle: fontStyle,
      color: color,
      letterSpacing: letterSpacingPt !== 0 ? `${letterSpacingPt}pt` : undefined,
      lineHeight: typeof lineHeight === 'number' ? lineHeight : 'normal',
      textAlign: alignment,
      textTransform: textTransform !== 'none' ? textTransform : undefined,
      textDecoration: textDecoration,
      verticalAlign: baselineShiftPt !== 0 ? `${baselineShiftPt}pt` : undefined,
      fontVariantNumeric: style.openTypeFeatures?.tnum ? 'tabular-nums' : undefined,
    };
  }
}

export const fontRegistry = FontRegistry.getInstance();

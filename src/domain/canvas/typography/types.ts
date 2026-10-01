/**
 * E-Studio Typography System V2 (Sections 16, 17, 18)
 */

export type FontStyleMode = 'normal' | 'italic' | 'oblique';
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type TextTransformMode = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export interface FontReference {
  fontId: string;
  family: string;
  postScriptName?: string;
  weight?: number | string;
  style?: FontStyleMode;
  stretch?: number;
  source: 'system' | 'application' | 'project' | 'embedded' | 'google';
  fallbackFontIds?: string[];
  fallbackFamilies?: string[];
}

export interface TypographyStyle {
  font: FontReference;
  sizePt: number;
  weight: number | string;
  style: FontStyleMode;
  stretch?: number;
  color: string;
  letterSpacingPt: number;
  lineHeight: number | 'auto';
  baselineShiftPt: number;
  alignment: TextAlignment;
  verticalAlignment: VerticalAlignment;
  textTransform: TextTransformMode;
  decoration: {
    underline: boolean;
    lineThrough: boolean;
    overline: boolean;
  };
  kerning: boolean;
  ligatures: boolean;
  openTypeFeatures?: Record<string, boolean | number | undefined>;
}

export interface FontRecord {
  id: string;
  family: string;
  postScriptName?: string;
  category: 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting';
  weights: number[];
  styles: FontStyleMode[];
  source: 'system' | 'application' | 'project' | 'embedded' | 'google';
  available: boolean;
  sampleText?: string;
  supportsTabularNumbers: boolean;
}

export interface FontAvailability {
  fontId: string;
  isAvailable: boolean;
  fallbackFontId?: string;
  message?: string;
}

export interface FontService {
  listFonts(): Promise<FontRecord[]>;
  getFont(id: string): Promise<FontRecord | null>;
  searchFonts(query: string): Promise<FontRecord[]>;
  validateFont(fontId: string): Promise<FontAvailability>;
  installFont?(fontPath: string): Promise<void>;
  registerProjectFont(fontPath: string): Promise<FontRecord>;
}

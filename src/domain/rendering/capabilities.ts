/**
 * E-Studio Renderer Capabilities & Fallback Matrix (Sections 57, 58)
 */

export type FallbackStrategy =
  | 'native'
  | 'approximate'
  | 'rasterize'
  | 'omit'
  | 'error';

export interface FontCapability {
  family: string;
  isNative: boolean;
  needsEmbedding: boolean;
}

export interface RendererCapabilities {
  rendererId: 'canvas' | 'pdf' | 'zpl' | 'pptx';
  supportsRotation: boolean;
  supportsArbitraryRotation: boolean;
  supportsRichText: boolean;
  supportsTransparency: boolean;
  supportsImages: boolean;
  supportsCurvedText: boolean;
  supportsNativeBarcodes: string[];
  supportsFonts: FontCapability[];
  fallbackStrategies: Record<string, FallbackStrategy>;
}

export const CANVAS_CAPABILITIES: RendererCapabilities = {
  rendererId: 'canvas',
  supportsRotation: true,
  supportsArbitraryRotation: true,
  supportsRichText: true,
  supportsTransparency: true,
  supportsImages: true,
  supportsCurvedText: true,
  supportsNativeBarcodes: ['ean13', 'ean8', 'code128', 'qrcode', 'datamatrix'],
  supportsFonts: [],
  fallbackStrategies: {
    default: 'native',
  },
};

export const PDF_CAPABILITIES: RendererCapabilities = {
  rendererId: 'pdf',
  supportsRotation: true,
  supportsArbitraryRotation: true,
  supportsRichText: true,
  supportsTransparency: true,
  supportsImages: true,
  supportsCurvedText: true,
  supportsNativeBarcodes: ['ean13', 'code128', 'qrcode'],
  supportsFonts: [],
  fallbackStrategies: {
    curved_text: 'rasterize',
    missing_font: 'approximate',
  },
};

export const ZPL_CAPABILITIES: RendererCapabilities = {
  rendererId: 'zpl',
  supportsRotation: true,
  supportsArbitraryRotation: false, // 0, 90, 180, 270 only
  supportsRichText: false,
  supportsTransparency: false,
  supportsImages: true, // Monochrome bitmaps
  supportsCurvedText: false,
  supportsNativeBarcodes: ['ean13', 'ean8', 'code128', 'qrcode'],
  supportsFonts: [],
  fallbackStrategies: {
    curved_text: 'rasterize',
    rich_text: 'approximate',
    gradient: 'rasterize',
    color: 'omit',
  },
};

export const PPTX_CAPABILITIES: RendererCapabilities = {
  rendererId: 'pptx',
  supportsRotation: true,
  supportsArbitraryRotation: true,
  supportsRichText: true,
  supportsTransparency: true,
  supportsImages: true,
  supportsCurvedText: false,
  supportsNativeBarcodes: [],
  supportsFonts: [],
  fallbackStrategies: {
    curved_text: 'rasterize',
    barcode: 'rasterize',
  },
};

export class CapabilityResolver {
  public static getStrategy(capabilities: RendererCapabilities, feature: string): FallbackStrategy {
    return capabilities.fallbackStrategies[feature] || capabilities.fallbackStrategies.default || 'approximate';
  }
}

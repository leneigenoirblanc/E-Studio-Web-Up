/**
 * E-Studio Unified Label Render Intermediate Representation (Render IR)
 * 
 * Provides a renderer-agnostic, millimetric scene graph representation of a fully
 * resolved label. Decouples template logic, dynamic pricing, and data bindings
 * from output devices (SVG, Canvas 2D, Vector PDF, Zebra ZPL II, PowerPoint).
 */

export type IRNodeType =
  | 'text'
  | 'price_block'
  | 'barcode'
  | 'qrcode'
  | 'shape'
  | 'line'
  | 'pictogram'
  | 'image';

export interface IRPoint {
  xMm: number;
  yMm: number;
}

export interface IRRect {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface IRBaseNode {
  id: string;
  type: IRNodeType;
  bounds: IRRect;
  rotationDeg: number;
  opacity: number;
  zIndex: number;
}

export interface IRTextNode extends IRBaseNode {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSizePt: number;
  fontWeight: 'normal' | 'bold' | '600' | '800';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  color: string;
  letterSpacingMm?: number;
  lineHeightMultiplier?: number;
  autoShrink?: boolean;
  minFontSizePt?: number;
  maxLines?: number;
  textDecoration?: 'none' | 'line-through' | 'underline';
}

export interface IRPriceBlockNode extends IRBaseNode {
  type: 'price_block';
  integerPart: string;
  decimalPart: string;
  currencySymbol: string;
  originalPrice?: string;
  hasPromo: boolean;
  discountPercent?: number;
  unitPriceLegal?: string; // e.g. "12.50 € / kg"
  primaryColor: string;
  accentColor: string;
  backgroundColor?: string;
  layoutVariant: 'compact' | 'standard' | 'stacked' | 'promotional';
}

export interface IRBarcodeBar {
  x: number;
  width: number;
}

export interface IRBarcodeNode extends IRBaseNode {
  type: 'barcode';
  format: 'CODE128' | 'EAN13';
  value: string;
  displayValue: string;
  showText: boolean;
  quietZoneMm: number;
  barColor: string;
  backgroundColor?: string;
  bars: IRBarcodeBar[];
  totalUnits: number;
}

export interface IRQrCodeNode extends IRBaseNode {
  type: 'qrcode';
  content: string;
  matrix: boolean[][]; // 2D boolean grid
  sizeModules: number;
  darkColor: string;
  lightColor: string;
}

export interface IRShapeNode extends IRBaseNode {
  type: 'shape';
  shapeVariant: 'rectangle' | 'ellipse' | 'pill';
  fillColor?: string;
  strokeColor?: string;
  strokeWidthMm: number;
  borderRadiusMm?: number;
}

export interface IRLineNode extends IRBaseNode {
  type: 'line';
  x2Mm: number;
  y2Mm: number;
  strokeColor: string;
  strokeWidthMm: number;
  dashPattern?: number[];
}

export interface IRPictogramNode extends IRBaseNode {
  type: 'pictogram';
  iconKey: string;
  label?: string;
  color: string;
}

export interface IRImageNode extends IRBaseNode {
  type: 'image';
  src: string;
  objectFit: 'contain' | 'cover' | 'fill';
}

export type IRNode =
  | IRTextNode
  | IRPriceBlockNode
  | IRBarcodeNode
  | IRQrCodeNode
  | IRShapeNode
  | IRLineNode
  | IRPictogramNode
  | IRImageNode;

export interface RenderScene {
  id: string;
  templateName: string;
  dimensionsMm: {
    widthMm: number;
    heightMm: number;
  };
  bleedMm: number;
  dpi: number;
  backgroundColor: string;
  productId?: string;
  productName?: string;
  nodes: IRNode[];
  metadata: {
    createdAt: number;
    hasPromo: boolean;
    ruleMutationsCount: number;
  };
}

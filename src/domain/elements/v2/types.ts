/**
 * E-Studio Canvas Elements Model V2 — Spécifications Architecturales Officielles
 *
 * Architecture modulaire découplée :
 * CanvasElement<TPayload>
 * ├── identity: ElementIdentity
 * ├── geometry: Geometry
 * ├── transform: Transform
 * ├── appearance: CommonAppearance
 * ├── payload: TPayload (Typé spécifiquement par famille)
 * ├── bindings?: BindingDefinition[]
 * ├── rules?: ElementRuleBinding[]
 * ├── constraints?: ElementConstraint[]
 * └── production?: ProductionMetadata
 */

// ============================================================================
// 1. IDENTITÉ & STRUCTURE COMMUNE DU CANVAS V2
// ============================================================================

export type ElementFamily =
  | 'TYPOGRAPHY'
  | 'PRICING'
  | 'DATA_IDENTIFICATION'
  | 'MEDIA'
  | 'GRAPHICS'
  | 'LAYOUT'
  | 'PRODUCTION';

export type ElementTypeV2 =
  // Famille TYPOGRAPHY
  | 'text'
  | 'rich_text'
  | 'curved_text'
  | 'product_field'
  | 'date_field'
  | 'quantity_field'
  // Famille PRICING
  | 'price_amount'
  | 'price_block'
  | 'promo_price'
  | 'compare_price'
  | 'unit_price'
  | 'tier_price'
  | 'discount_badge'
  | 'dual_currency_price'
  | 'price_range'
  // Famille DATA_IDENTIFICATION
  | 'barcode_1d'
  | 'qrcode'
  | 'datamatrix'
  // Famille MEDIA
  | 'image'
  | 'icon'
  | 'pictogram'
  // Famille GRAPHICS
  | 'rectangle'
  | 'rounded_rectangle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'polyline'
  | 'path'
  // Famille LAYOUT
  | 'container'
  | 'table'
  | 'repeater'
  // Famille PRODUCTION
  | 'restricted_area'
  | 'quiet_zone'
  | 'safe_margin'
  | 'cut_line'
  | 'fold_line'
  | 'bleed_area'
  | 'sensor_gap';

export interface ElementIdentity {
  id: string;
  type: ElementTypeV2;
  family: ElementFamily;
  name?: string; // Nom lisible dans le calque (ex: "Prix Promo Central", "Nutri-Score A")
}

export interface Geometry {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface Transform {
  rotationDeg: number;
  scaleX: number;
  scaleY: number;
  origin: {
    x: number; // 0 à 1 (0.5 = centre)
    y: number; // 0 à 1 (0.5 = centre)
  };
}

export interface ClippingConfig {
  enabled: boolean;
  shape: 'rectangle' | 'ellipse' | 'path';
  pathData?: string;
  cornerRadiusMm?: number;
}

export interface CommonAppearance {
  opacity: number; // 0 à 1
  visible: boolean;
  locked: boolean;
  zIndex: number;
  groupId?: string;
  clipping?: ClippingConfig;
}

// ============================================================================
// 2. DATA BINDINGS & RÈGLES DÉCOUPLÉES
// ============================================================================

export interface BindingDefinition {
  property: string; // Propriété cible dans le payload (ex: "value", "text", "barcode")
  expression: string; // Clé de donnée ou expression (ex: "product.ITEMNAME", "pricing.finalPrice")
  fallback?: unknown;
  required?: boolean;
  formatPipe?: string; // ex: "uppercase", "currency:FCFA", "date:DD/MM/YYYY"
}

export interface ElementRuleBinding {
  visibilityRuleId?: string;
  styleRuleIds?: string[];
  valueRuleId?: string;
}

export interface ElementConstraint {
  type: 'no_overlap_restricted' | 'stay_in_canvas' | 'min_quiet_zone' | 'min_font_size';
  severity: 'WARNING' | 'BLOCKING';
  params?: Record<string, unknown>;
}

export interface ProductionMetadata {
  printable: boolean; // false pour les repères de coupe ou restricted_area
  colorLayer?: 'black' | 'red' | 'yellow' | 'spot_varnish' | 'white_underprint';
  dieCutOperation?: 'none' | 'through_cut' | 'kiss_cut' | 'perforation' | 'crease';
}

// ============================================================================
// 3. SYSTÈME TYPOGRAPHIQUE GLOBAL (TypographyStyle)
// ============================================================================

export type FontWeight = '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | 'normal' | 'bold';
export type FontStyle = 'normal' | 'italic' | 'oblique';
export type FontStretch = 'ultra-condensed' | 'condensed' | 'semi-condensed' | 'normal' | 'semi-expanded' | 'expanded';
export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type TextTransformMode = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export interface FontReference {
  fontId: string;
  family: string;
  postScriptName?: string;
  source: 'system' | 'application' | 'project' | 'embedded' | 'google';
  fallbackFamilies: string[];
}

export interface TypographyStyle {
  font: FontReference;
  sizePt: number;
  weight: FontWeight;
  style: FontStyle;
  stretch: FontStretch;
  color: string; // Hex, RGB, CMYK representation
  letterSpacingPt: number;
  lineHeight: number | 'auto';
  alignment: TextAlignment;
  verticalAlignment: VerticalAlignment;
  textTransform: TextTransformMode;
  decoration: {
    underline: boolean;
    lineThrough: boolean;
    overline: boolean;
  };
  baselineShiftPt: number; // Décalage de la ligne de base (ex: exposant pour devise)
  kerning: boolean;
  ligatures: boolean;
  openTypeFeatures?: {
    tnum?: boolean; // Tabular Numbers (chiffres alignés en colonnes)
    lnum?: boolean; // Lining Numbers
    onum?: boolean; // Oldstyle Numbers
    pnum?: boolean; // Proportional Numbers
    frac?: boolean; // Fractions diagonales
    zero?: boolean; // Slashed Zero
    [key: string]: boolean | number | undefined;
  };
}

// ============================================================================
// 4. MOTEUR DE FORMATAGE NUMÉRIQUE & MONÉTAIRE (NumberFormat)
// ============================================================================

export type GroupingStrategy = 'auto' | 'none' | 'western' | 'indian' | 'custom';
export type ThousandsSeparator = 'auto' | 'none' | 'space' | 'nbsp' | 'nnbsp' | ',' | '.' | "'" | 'custom';
export type DecimalSeparator = 'auto' | '.' | ',' | 'custom';
export type RoundingMode = 'half_up' | 'half_down' | 'half_even' | 'up' | 'down' | 'floor' | 'ceil';
export type NegativeStyle = 'minus' | 'parentheses';
export type ZeroDisplay = 'zero' | 'empty' | 'dash' | 'custom';

export interface NumberFormat {
  locale?: string;
  grouping: GroupingStrategy;
  thousandsSeparator: ThousandsSeparator;
  customThousandsSeparator?: string;
  decimalSeparator: DecimalSeparator;
  customDecimalSeparator?: string;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
  fixedFractionDigits?: number;
  trimTrailingZeros: boolean;
  roundingMode: RoundingMode;
  showPlusSign: boolean;
  negativeStyle: NegativeStyle;
  zeroDisplay: ZeroDisplay;
  customZeroString?: string;
}

// ============================================================================
// 5. TYPOGRAPHIE MODULAIRE PAR SLOTS DE PRIX
// ============================================================================

export interface PriceTypographySlots {
  integer: TypographyStyle;
  decimalSeparator: TypographyStyle;
  fraction: TypographyStyle;
  currency: TypographyStyle;
  prefix?: TypographyStyle;
  suffix?: TypographyStyle;
  unit?: TypographyStyle;
  sign?: TypographyStyle;
}

export interface CurrencyDisplayConfig {
  code: string; // "EUR", "XAF", "USD"
  symbol?: string; // "€", "FCFA", "$"
  position: 'before' | 'after' | 'superscript' | 'subscript' | 'stacked';
  spacingSpace: boolean;
}

// ============================================================================
// 6. PAYLOADS SPÉCIFIQUES PAR FAMILLE D'ÉLÉMENTS
// ============================================================================

// --- 6.1 Famille TYPOGRAPHY ---
export interface TextPayload {
  content: string;
  typography: TypographyStyle;
  layout: {
    wrap: boolean;
    overflow: 'clip' | 'ellipsis' | 'overflow' | 'shrink' | 'expand';
    autosize?: {
      minFontSizePt: number;
      maxFontSizePt: number;
    };
  };
  boxAppearance?: {
    fillColor?: string;
    borderColor?: string;
    borderWidthMm?: number;
    cornerRadiusMm?: number;
    paddingMm?: { top: number; right: number; bottom: number; left: number };
  };
}

export interface RichTextRun {
  id: string;
  text: string;
  style: Partial<TypographyStyle>;
}

export interface RichTextPayload {
  runs: RichTextRun[];
  defaultTypography: TypographyStyle;
  layout: {
    wrap: boolean;
    lineHeight: number;
    alignment: TextAlignment;
  };
}

export interface CurvedTextPayload {
  content: string;
  typography: TypographyStyle;
  curveRadiusMm: number;
  startAngleDeg: number;
  direction: 'clockwise' | 'counter_clockwise';
}

export interface ProductFieldPayload {
  fieldKey: string;
  prefix?: string;
  suffix?: string;
  typography: TypographyStyle;
  fallbackText?: string;
}

export interface DateFieldPayload {
  dateType: 'created' | 'updated' | 'expiry_dlc' | 'best_before_dluo' | 'production' | 'today';
  offsetDays?: number;
  formatPattern: string; // "DD/MM/YYYY", "DD.MM.YY", etc.
  prefixLabel?: string;
  typography: TypographyStyle;
}

export interface QuantityFieldPayload {
  bindingKey: string;
  unitLabel: string;
  prefix?: string;
  formatter: NumberFormat;
  typography: TypographyStyle;
}

// --- 6.2 Famille PRICING ---
export interface PriceAmountPayload {
  valueBinding: string;
  format: NumberFormat;
  typography: PriceTypographySlots;
  currency: CurrencyDisplayConfig;
  prefixText?: string;
  suffixText?: string;
}

export interface PriceBlockPayload {
  valueBinding: string; // ex: "pricing.finalPrice"
  format: NumberFormat;
  display: {
    showInteger: boolean;
    showFraction: boolean;
    showCurrency: boolean;
    showUnit: boolean;
  };
  typography: PriceTypographySlots;
  currency: CurrencyDisplayConfig;
  prefixText?: string;
  suffixText?: string;
  unitText?: string; // ex: "le kg", "la bouteille"
  boxAppearance?: {
    fillColor?: string;
    borderColor?: string;
    borderWidthMm?: number;
    cornerRadiusMm?: number;
  };
}

export interface PromoPricePayload {
  regularPriceBinding: string;
  promoPriceBinding: string;
  format: NumberFormat;
  regularTypography: TypographyStyle;
  promoTypography: PriceTypographySlots;
  currency: CurrencyDisplayConfig;
  crossedOut: {
    enabled: boolean;
    style: 'diagonal' | 'horizontal' | 'double';
    color: string;
    thicknessPt: number;
  };
  discountDisplay?: {
    showDiscount: boolean;
    format: 'percent' | 'amount_saved';
    typography: TypographyStyle;
  };
}

export interface ComparePricePayload {
  priceBinding: string;
  label: string; // "Prix conseillé", "Ancien prix", "Prix moyen"
  format: NumberFormat;
  crossedOut: boolean;
  typography: TypographyStyle;
}

export interface UnitPricePayload {
  priceBinding: string; // Prix de vente
  quantityBinding: string; // Poids / Volume / Conditionnement
  measureUnit: 'kg' | 'g' | 'L' | 'cl' | 'ml' | 'piece' | 'carton';
  calculationMode: 'per_kg' | 'per_liter' | 'per_100g' | 'per_100ml' | 'custom';
  multiplier?: number;
  formatter: NumberFormat;
  typography: TypographyStyle;
  prefix?: string; // "Soit "
  suffixPattern?: string; // "{price} / {unit}"
}

export interface TierPriceRowPayload {
  minQuantity: number;
  unitPrice: number;
  label?: string;
  discountPct?: number;
}

export interface TierPricePayload {
  sourceBinding?: string;
  rows: TierPriceRowPayload[];
  formatter: NumberFormat;
  headerTypography?: TypographyStyle;
  rowTypography: TypographyStyle;
  priceTypography: TypographyStyle;
  tableStyle: {
    rowHeightMm: number;
    borderColor: string;
    borderWidthMm: number;
    alternateRowColor?: string;
  };
}

export interface DiscountBadgePayload {
  calculationMode: 'percent' | 'amount_saved' | 'fixed_label';
  fixedText?: string;
  regularPriceBinding?: string;
  promoPriceBinding?: string;
  shape: 'circle' | 'pill' | 'starburst' | 'ribbon' | 'rectangle';
  badgeColor: string;
  textColor: string;
  typography: TypographyStyle;
}

// --- 6.3 Famille DATA_IDENTIFICATION ---
export interface Barcode1DPayload {
  symbology: 'ean13' | 'ean8' | 'upca' | 'code128' | 'code39' | 'itf14' | 'gs1_128';
  dataBinding: string;
  staticCode?: string;
  humanReadable: {
    visible: boolean;
    position: 'bottom' | 'top';
    typography?: TypographyStyle;
  };
  moduleWidthMm: number;
  heightMm: number;
  quietZoneMm: number;
  barColor: string;
  backgroundColor?: string;
  checksumValidation: boolean;
}

export interface QRCodePayload {
  dataBinding: string;
  staticUrlOrText?: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  sizeMm: number;
  color: string;
  backgroundColor?: string;
  quietZoneModules: number;
  centerLogoUrl?: string;
}

export interface DataMatrixPayload {
  dataBinding: string;
  staticData?: string;
  symbolSize: 'auto' | 'square_10x10' | 'square_26x26' | 'rect_8x18';
  color: string;
  backgroundColor?: string;
  quietZoneModules: number;
}

// --- 6.4 Famille MEDIA ---
export interface ImagePayload {
  sourceBinding?: string;
  staticUrl?: string;
  fit: 'contain' | 'cover' | 'fill' | 'none';
  opacity: number;
  cornerRadiusMm?: number;
  aspectRatioLock: boolean;
}

export interface PictogramPayload {
  category: 'nutriscore' | 'ecoscore' | 'recycling' | 'allergen' | 'origin_flag' | 'hazard';
  valueBinding?: string;
  staticKey?: string;
  scalePct: number;
}

export interface IconPayload {
  iconName: string;
  color: string;
  sizePt: number;
}

// --- 6.5 Famille GRAPHICS ---
export interface ShapeAppearance {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidthMm?: number;
  strokeDashArray?: string;
  strokeLineCap?: 'butt' | 'round' | 'square';
}

export interface RectanglePayload {
  appearance: ShapeAppearance;
  cornerRadiusMm?: number;
}

export interface RoundedRectanglePayload {
  appearance: ShapeAppearance;
  cornersMm: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number };
}

export interface EllipsePayload {
  appearance: ShapeAppearance;
}

export interface LinePayload {
  strokeColor: string;
  strokeWidthMm: number;
  strokeDashArray?: string;
  arrowStart?: boolean;
  arrowEnd?: boolean;
}

export interface PolygonPayload {
  points: { xMm: number; yMm: number }[];
  appearance: ShapeAppearance;
}

export interface PolylinePayload {
  points: { xMm: number; yMm: number }[];
  strokeColor: string;
  strokeWidthMm: number;
}

export interface PathPayload {
  svgPathData: string;
  appearance: ShapeAppearance;
}

// --- 6.6 Famille LAYOUT ---
export interface ContainerPayload {
  layoutMode: 'free' | 'flex_column' | 'flex_row' | 'grid';
  paddingMm: { top: number; right: number; bottom: number; left: number };
  gapMm: number;
  alignment: 'start' | 'center' | 'end' | 'space_between';
  backgroundColor?: string;
  borderColor?: string;
  borderWidthMm?: number;
  cornerRadiusMm?: number;
}

export interface TablePayload {
  rowsCount: number;
  columnsCount: number;
  columnWidthsMm: number[];
  rowHeightsMm: number[];
  cellStyles: Record<string, ShapeAppearance>;
}

export interface RepeaterPayload {
  collectionBinding: string;
  itemTemplateId: string;
  direction: 'vertical' | 'horizontal' | 'grid';
  maxItems?: number;
  gapMm: number;
}

// --- 6.7 Famille PRODUCTION ---
export interface RestrictedAreaPayload {
  zoneName: string;
  reason: 'printhead_deadzone' | 'sensor_gap' | 'die_cut_clearance' | 'magnetic_strip';
  pattern: 'diagonal_stripes' | 'solid' | 'cross' | 'outline';
  warningOnOverlap: boolean;
  color: string;
  opacity: number;
}

export interface CutLinePayload {
  lineType: 'through_cut' | 'kiss_cut' | 'perforation' | 'crease';
  color: string;
  dashPattern?: string;
}

// ============================================================================
// 7. UNION DISCRIMINÉE DES ÉLÉMENTS CANVAS V2
// ============================================================================

export type CanvasElementPayload =
  | TextPayload
  | RichTextPayload
  | CurvedTextPayload
  | ProductFieldPayload
  | DateFieldPayload
  | QuantityFieldPayload
  | PriceAmountPayload
  | PriceBlockPayload
  | PromoPricePayload
  | ComparePricePayload
  | UnitPricePayload
  | TierPricePayload
  | DiscountBadgePayload
  | Barcode1DPayload
  | QRCodePayload
  | DataMatrixPayload
  | ImagePayload
  | PictogramPayload
  | IconPayload
  | RectanglePayload
  | RoundedRectanglePayload
  | EllipsePayload
  | LinePayload
  | PolygonPayload
  | PolylinePayload
  | PathPayload
  | ContainerPayload
  | TablePayload
  | RepeaterPayload
  | RestrictedAreaPayload
  | CutLinePayload;

export interface CanvasElementV2<TPayload = CanvasElementPayload> {
  identity: ElementIdentity;
  geometry: Geometry;
  transform: Transform;
  appearance: CommonAppearance;
  payload: TPayload;
  bindings?: BindingDefinition[];
  rules?: ElementRuleBinding;
  constraints?: ElementConstraint[];
  production?: ProductionMetadata;
}

/**
 * E-Studio Canvas Core Elements Model V2
 * Conforme aux spécifications du Plan d'Architecture V2 (Sections 5 à 12)
 */

// ============================================================================
// 1. GÉOMÉTRIE (Section 6)
// ============================================================================

export interface Geometry {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

// ============================================================================
// 2. TRANSFORM (Section 7)
// ============================================================================

export interface Transform {
  rotationDeg: number;
  scaleX: number;
  scaleY: number;
  origin: {
    x: number; // 0 à 1 (0.5 = centre)
    y: number; // 0 à 1 (0.5 = centre)
  };
}

// ============================================================================
// 3. APPEARANCE COMMUNE (Section 8)
// ============================================================================

export interface CommonAppearance {
  visible: boolean;
  opacity: number;
  zIndex: number;
  locked: boolean;
  groupId?: string;
}

// ============================================================================
// 4. BINDINGS V2 (Section 9)
// ============================================================================

export interface BindingDefinition {
  target: string; // ex: "content", "pricing.primary", "barcode"
  expression: string; // ex: "product.ITEMNAME", "pricing.finalPrice"
  fallback?: unknown;
  required?: boolean;
  formatPipe?: string; // ex: "uppercase", "currency:FCFA", "date:DD/MM/YYYY"
}

// ============================================================================
// 5. RULE BINDING V2 (Section 10)
// ============================================================================

export interface ElementRuleBinding {
  visibilityRuleId?: string;
  valueRuleId?: string;
  styleRuleIds?: string[];
  variantRuleId?: string;
}

// ============================================================================
// 6. PRODUCTION EFFECTS (Section 11)
// ============================================================================

export type ProductionEffectType =
  | 'die_cut'
  | 'spot_varnish'
  | 'hot_foil'
  | 'emboss'
  | 'deboss';

export interface ProductionEffect {
  type: ProductionEffectType;
  parameters?: Record<string, unknown>;
}

export interface ProductionMetadata {
  printable: boolean;
  colorLayer?: 'black' | 'red' | 'yellow' | 'spot_varnish' | 'white_underprint';
  dieCutOperation?: 'none' | 'through_cut' | 'kiss_cut' | 'perforation' | 'crease';
}

// ============================================================================
// 7. CONTRAINTES D'ÉLÉMENT
// ============================================================================

export interface ElementConstraint {
  type: 'no_overlap_restricted' | 'stay_in_canvas' | 'min_quiet_zone' | 'min_font_size';
  severity: 'warning' | 'error';
  params?: Record<string, unknown>;
}

// ============================================================================
// 8. TAXONOMIE GLOBALE DES ÉLÉMENTS (Section 12)
// ============================================================================

export type CanvasElementType =
  // TEXT
  | 'text'
  | 'rich_text'
  | 'curved_text'
  | 'product_field'
  | 'date_field'
  | 'quantity_field'
  // PRICING (Section 21)
  | 'price'
  | 'discount_badge'
  | 'price_breakdown'
  // IDENTIFICATION
  | 'barcode_1d'
  | 'qrcode'
  | 'datamatrix'
  // MEDIA
  | 'image'
  | 'icon'
  | 'pictogram'
  // GRAPHICS
  | 'rectangle'
  | 'rounded_rectangle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'polyline'
  | 'path'
  // LAYOUT
  | 'container'
  | 'table'
  | 'repeater'
  // PRODUCTION
  | 'restricted_area'
  | 'quiet_zone'
  | 'safe_margin'
  | 'cut_line'
  | 'fold_line'
  | 'bleed_area'
  | 'sensor_gap';

// ============================================================================
// 9. MODÈLE RACINE DES ÉLÉMENTS (Section 5)
// ============================================================================

export interface BaseCanvasElement<TPayload = unknown, TAppearance = CommonAppearance, TBindings = BindingDefinition[], TRules = ElementRuleBinding[]> {
  id: string;
  type: CanvasElementType;
  name?: string;
  // Métadonnées géométriques canoniques V2
  geometry: Geometry;
  transform: Transform;
  appearance: TAppearance;
  // Propriétés aplaties pour interopérabilité immédiate
  x_mm?: number;
  y_mm?: number;
  w_mm?: number;
  h_mm?: number;
  rotation?: number;
  z_index?: number;
  locked?: boolean;
  visible?: boolean;
  opacity?: number;
  binding_key?: string;
  conditional_display?: any;
  anchor?: any;
  semantic_snap?: any;
  finish_effect?: any;
  payload?: TPayload;
  bindings?: TBindings;
  rules?: TRules;
  constraints?: ElementConstraint[];
  productionEffects?: ProductionEffect[];
  production?: ProductionMetadata;
}

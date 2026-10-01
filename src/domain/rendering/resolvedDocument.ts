/**
 * E-Studio Resolved Label Document Model (Section 60, 62)
 * Modèle canonique transmis directement aux renderers (Canvas, PDF, ZPL, PPTX)
 * sans dépendance directe aux sources de données brutes.
 */

import { CanvasElementType, Geometry, Transform, CommonAppearance } from '../canvas/core/types';
import { ResolvedPrice } from '../pricing/models';
import { TypographyStyle } from '../canvas/typography/types';

export interface ResolvedCanvasElement {
  id: string;
  type: CanvasElementType;
  name?: string;
  geometry: Geometry;
  transform: Transform;
  appearance: CommonAppearance;
  resolvedContent?: {
    text?: string;
    runs?: Array<{ text: string; style?: Partial<TypographyStyle> }>;
    price?: ResolvedPrice;
    barcodeValue?: string;
    qrContent?: string;
    imageUrl?: string;
    vectorData?: string;
  };
  typography?: TypographyStyle;
  rawPayload?: any;
}

export interface ResolvedLabelDocument {
  documentId: string;
  datasetSnapshotId: string;
  rulesSnapshotId: string;
  templateSnapshotId: string;
  dimensionsMm: {
    widthMm: number;
    heightMm: number;
  };
  elements: ResolvedCanvasElement[];
}

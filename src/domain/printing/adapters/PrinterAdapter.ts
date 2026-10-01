import { LabelTemplate, ProductRecord } from '../../../types';
import { LabelFormat, PrinterInstance, PrinterModel } from '../types';

export interface GeneratedPrintPayload {
  mode: 'native' | 'raster';
  language: string;
  data: string; // Command stream string or Base64 / data URL
  mimeType: string;
  labelCount: number;
}

export interface PrinterAdapter {
  readonly language: string;
  generateLabelPayload(
    template: LabelTemplate,
    format: LabelFormat,
    instance: PrinterInstance,
    products: ProductRecord[],
    model?: PrinterModel | null
  ): Promise<GeneratedPrintPayload>;

  generateTestLabel(
    instance: PrinterInstance,
    format: LabelFormat,
    model?: PrinterModel | null
  ): Promise<GeneratedPrintPayload>;
}

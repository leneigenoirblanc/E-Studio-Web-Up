import { LabelTemplate, ProductRecord } from '../../../types';
import { LabelFormat, PrinterInstance, PrinterModel } from '../types';
import { PrinterAdapter, GeneratedPrintPayload } from './PrinterAdapter';
import { HeadlessCanvasRenderer } from '../../../utils/headlessCanvasRenderer';

export class SystemDriverAdapter implements PrinterAdapter {
  readonly language = 'SystemDriver';

  public async generateLabelPayload(
    template: LabelTemplate,
    format: LabelFormat,
    instance: PrinterInstance,
    products: ProductRecord[],
    model?: PrinterModel | null
  ): Promise<GeneratedPrintPayload> {
    const dpi = instance.selectedDpi || 300;
    
    // Render raster images headlessly for all products
    const rasterImages: string[] = [];
    for (const prod of products) {
      const dataUrl = await HeadlessCanvasRenderer.renderLabelToDataUrl(template, prod, {
        dpi,
        renderBackground: true,
      });
      rasterImages.push(dataUrl);
    }

    return {
      mode: 'raster',
      language: 'SystemDriver',
      data: JSON.stringify({
        templateName: template.name,
        formatName: format.name,
        widthMm: format.width,
        heightMm: format.height,
        dpi,
        count: products.length,
        images: rasterImages,
      }),
      mimeType: 'application/json',
      labelCount: products.length,
    };
  }

  public async generateTestLabel(
    instance: PrinterInstance,
    format: LabelFormat,
    model?: PrinterModel | null
  ): Promise<GeneratedPrintPayload> {
    return {
      mode: 'raster',
      language: 'SystemDriver',
      data: JSON.stringify({
        isTest: true,
        printerName: instance.name,
        formatWidthMm: format.width,
        formatHeightMm: format.height,
        dpi: instance.selectedDpi || 300,
      }),
      mimeType: 'application/json',
      labelCount: 1,
    };
  }
}

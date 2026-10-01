/**
 * Headless Rendering Service
 * Encapsulates canvas-to-image and canvas-to-pdf logic.
 * Generates high-fidelity buffers and data URLs strictly matching the dimensions
 * and DPI requirements defined in the template format and printer settings,
 * ensuring 1:1 WYSIWYG parity between the UI preview and the final export.
 */

import { jsPDF } from 'jspdf';
import { LabelTemplate, ProductRecord, ImpositionCalculation, ImpositionConfig } from '../types';
import { HeadlessCanvasRenderer, HeadlessRenderOptions } from '../utils/headlessCanvasRenderer';
import { PrinterInstance } from '../domain/printing/types';

export interface RenderBufferResult {
  dataUrl: string;
  blob: Blob;
  widthPx: number;
  heightPx: number;
  dpi: number;
  widthMm: number;
  heightMm: number;
}

export class HeadlessRendererService {
  /**
   * Generates a high-fidelity image buffer strictly matching template dimensions and DPI requirements
   */
  public static async renderHighFidelityBuffer(
    template: LabelTemplate,
    product?: ProductRecord,
    printerSettings?: Partial<PrinterInstance> | { dpi?: number; scale?: number },
    options?: HeadlessRenderOptions
  ): Promise<RenderBufferResult> {
    const dpi = (printerSettings as any)?.selectedDpi || (printerSettings as any)?.dpi || options?.dpi || 300;
    const pxPerMm = dpi / 25.4;

    const widthPx = Math.max(1, Math.round(template.width_mm * pxPerMm));
    const heightPx = Math.max(1, Math.round(template.height_mm * pxPerMm));

    const canvas = await HeadlessCanvasRenderer.renderLabelToCanvas(template, product, {
      ...options,
      dpi,
      renderBackground: options?.renderBackground ?? true,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/png');
    });

    return {
      dataUrl,
      blob,
      widthPx,
      heightPx,
      dpi,
      widthMm: template.width_mm,
      heightMm: template.height_mm,
    };
  }

  /**
   * Generates an imposed multi-page PDF buffer with WYSIWYG parity
   */
  public static async renderImposedPdf(
    template: LabelTemplate,
    products: ProductRecord[],
    imposition: ImpositionCalculation,
    impositionConfig: ImpositionConfig,
    dpi = 300
  ): Promise<jsPDF> {
    const isLandscape = impositionConfig.orientation === 'landscape';
    const pdfFormat =
      impositionConfig.page_size === 'CUSTOM' && impositionConfig.custom_page_w_mm && impositionConfig.custom_page_h_mm
        ? [impositionConfig.custom_page_w_mm, impositionConfig.custom_page_h_mm]
        : impositionConfig.page_size.toLowerCase();

    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: pdfFormat as any,
    });

    const labelsPerPage = imposition.total_per_page;
    const startOffset = Math.max(0, Math.min(labelsPerPage - 1, impositionConfig.start_offset_slot || 0));
    const totalItemsToPlace = products.length + startOffset;
    const totalPages = Math.max(1, Math.ceil(totalItemsToPlace / labelsPerPage));

    const gapX = Math.max(0, impositionConfig.gap_x_mm ?? impositionConfig.gap_mm ?? 2.0);
    const gapY = Math.max(0, impositionConfig.gap_y_mm ?? impositionConfig.gap_mm ?? 2.0);

    const renderCache = new Map<string, string>();
    let productCursor = 0;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();

      for (let slot = 0; slot < labelsPerPage; slot++) {
        if (page === 0 && slot < startOffset) continue;
        if (productCursor >= products.length) break;

        const prod = products[productCursor];
        productCursor++;

        const col = slot % imposition.cols;
        const row = Math.floor(slot / imposition.cols);

        const x = imposition.horizontal_offset_mm + col * (imposition.label_total_w_mm + gapX);
        const y = imposition.vertical_offset_mm + row * (imposition.label_total_h_mm + gapY);

        const cacheKey = `${template.name}_${prod?.id || 'demo'}_${template.items.length}_${dpi}`;
        let imgData = renderCache.get(cacheKey);

        if (!imgData) {
          const result = await this.renderHighFidelityBuffer(template, prod, { dpi });
          imgData = result.dataUrl;
          renderCache.set(cacheKey, imgData);
        }

        if (imgData) {
          doc.addImage(imgData, 'PNG', x, y, template.width_mm, template.height_mm);
        }

        if (impositionConfig.show_cut_marks) {
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.15);
          doc.line(x - 2, y, x + 2, y);
          doc.line(x, y - 2, x, y + 2);
          doc.line(x + template.width_mm - 2, y + template.height_mm, x + template.width_mm + 2, y + template.height_mm);
          doc.line(x + template.width_mm, y + template.height_mm - 2, x + template.width_mm, y + template.height_mm + 2);
        }
      }
    }

    return doc;
  }
}

export const headlessRenderer = HeadlessRendererService;

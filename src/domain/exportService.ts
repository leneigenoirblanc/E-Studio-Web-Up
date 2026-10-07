/**
 * Export Domain Service
 * Encapsulates all document generation logic (WYSIWYG PDF batch generation,
 * PPTX slides, direct physical printing, and ZPL II industrial thermal label commands)
 * using a Headless Canvas Reproduction Strategy that mirrors the Template Editor preview exactly.
 */

import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import { LabelTemplate, ProductRecord, ImpositionCalculation, ImpositionConfig, PdfExportConfig } from '../types';
import { HeadlessCanvasRenderer } from '../utils/headlessCanvasRenderer';
import { PptxExporter } from '../utils/pptxExporter';
import { compileTemplateToIR } from './rendering/compileTemplateToIR';
import { drawSceneToPdf } from './rendering/adapters/pdfVectorAdapter';

export interface ExportProgressEvent {
  current: number;
  total: number;
  percentage: number;
  phase: 'preparing' | 'rendering' | 'packing' | 'done';
}

export interface ZplExportOptions {
  dpi: 203 | 300 | 600;
  darkness?: number; // 0-30
  speed?: number; // 2-6 inch/sec
}

export class ExportService {
  /**
   * Generates a multi-page imposed PDF document using the Headless Canvas Reproduction Strategy.
   * Ensures 100% WYSIWYG 1:1 scaling and pixel-perfect element placement matching the Template Editor.
   */
  public static async generatePdfBatchAsync(
    template: LabelTemplate,
    products: ProductRecord[],
    imposition: ImpositionCalculation,
    impositionConfig: ImpositionConfig,
    pdfConfig: PdfExportConfig = {
      dpi: 300,
      bleed_mm: 2.0,
      show_crop_marks: true,
      show_registration_marks: false,
      include_calibration_layer: false,
      color_mode: 'cmyk_sim',
    },
    onProgress?: (event: ExportProgressEvent) => void
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

      if (onProgress) {
        onProgress({
          current: Math.min(products.length, productCursor + 1),
          total: products.length,
          percentage: Math.round(((page + 1) / totalPages) * 100),
          phase: 'rendering',
        });
      }

      for (let slot = 0; slot < labelsPerPage; slot++) {
        if (page === 0 && slot < startOffset) continue;
        if (productCursor >= products.length) break;

        const prod = products[productCursor];
        productCursor++;

        const col = slot % imposition.cols;
        const row = Math.floor(slot / imposition.cols);

        const x = imposition.horizontal_offset_mm + col * (imposition.label_total_w_mm + gapX);
        const y = imposition.vertical_offset_mm + row * (imposition.label_total_h_mm + gapY);

        // Render label headlessly with 1:1 WYSIWYG reproduction
        const cacheKey = `${template.name}_${prod?.id || 'demo'}_${template.items.length}_${pdfConfig.dpi || 300}`;
        let imgData = renderCache.get(cacheKey);

        if (!imgData) {
          imgData = await HeadlessCanvasRenderer.renderLabelToDataUrl(template, prod, {
            dpi: pdfConfig.dpi || 300,
            renderBackground: true,
          });
          renderCache.set(cacheKey, imgData);
        }

        if (imgData) {
          doc.addImage(imgData, 'PNG', x, y, template.width_mm, template.height_mm);
        }

        // Cut / crop marks
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

    if (onProgress) {
      onProgress({ current: products.length, total: products.length, percentage: 100, phase: 'done' });
    }

    return doc;
  }

  /**
   * Generates a high-speed, 100% Vector-Native PDF batch using the Unified Render IR (Phase 2).
   * Renders native vectors (lines, rectangles, vector text, barcodes) directly into jsPDF
   * for sub-second generation and infinite scalability.
   */
  public static async generateNativeVectorPdfBatchAsync(
    template: LabelTemplate,
    products: ProductRecord[],
    imposition: ImpositionCalculation,
    impositionConfig: ImpositionConfig,
    pdfConfig: PdfExportConfig = {
      dpi: 300,
      bleed_mm: 2.0,
      show_crop_marks: true,
      show_registration_marks: false,
      include_calibration_layer: false,
      color_mode: 'cmyk_sim',
    },
    onProgress?: (event: ExportProgressEvent) => void
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

    let productCursor = 0;

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();

      if (onProgress) {
        onProgress({
          current: Math.min(products.length, productCursor + 1),
          total: products.length,
          percentage: Math.round(((page + 1) / totalPages) * 100),
          phase: 'rendering',
        });
      }

      for (let slot = 0; slot < labelsPerPage; slot++) {
        if (page === 0 && slot < startOffset) continue;
        if (productCursor >= products.length) break;

        const prod = products[productCursor];
        productCursor++;

        const col = slot % imposition.cols;
        const row = Math.floor(slot / imposition.cols);

        const x = imposition.horizontal_offset_mm + col * (imposition.label_total_w_mm + gapX);
        const y = imposition.vertical_offset_mm + row * (imposition.label_total_h_mm + gapY);

        // Compile to Render IR and draw directly via vector primitives
        const scene = compileTemplateToIR(template, prod, { dpi: pdfConfig.dpi || 300 });
        drawSceneToPdf(doc, scene, { offsetXmm: x, offsetYmm: y });

        // Cut / crop marks
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

    if (onProgress) {
      onProgress({ current: products.length, total: products.length, percentage: 100, phase: 'done' });
    }

    return doc;
  }

  /**
   * Generates a single-label continuous PDF for roll printers or single-item exports
   */
  public static async generateSingleLabelPdfAsync(
    template: LabelTemplate,
    record?: ProductRecord,
    dpi = 300
  ): Promise<jsPDF> {
    const isLandscape = template.width_mm > template.height_mm;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [template.width_mm, template.height_mm],
    });

    const imgData = await HeadlessCanvasRenderer.renderLabelToDataUrl(template, record, {
      dpi,
      renderBackground: true,
    });

    doc.addImage(imgData, 'PNG', 0, 0, template.width_mm, template.height_mm);
    return doc;
  }

  /**
   * Generates a native Microsoft PowerPoint (.pptx) presentation with one slide per print sheet
   * using Headless Canvas rasterization to guarantee 1:1 visual parity with the editor.
   */
  public static async generatePptxPresentation(
    template: LabelTemplate,
    products: ProductRecord[],
    imposition: ImpositionCalculation,
    impositionConfig: ImpositionConfig,
    onProgress?: (event: ExportProgressEvent) => void
  ): Promise<void> {
    if (onProgress) {
      onProgress({ current: 1, total: products.length, percentage: 10, phase: 'preparing' });
    }

    await PptxExporter.exportToPptx(template, products, imposition, impositionConfig);

    if (onProgress) {
      onProgress({ current: products.length, total: products.length, percentage: 100, phase: 'done' });
    }
  }

  /**
   * Triggers a direct physical print dialog using a headless canvas generated PDF in a hidden iframe
   */
  public static async printLabelsDirectlyAsync(
    template: LabelTemplate,
    products: ProductRecord[],
    imposition: ImpositionCalculation,
    impositionConfig: ImpositionConfig
  ): Promise<void> {
    const doc = await this.generatePdfBatchAsync(template, products, imposition, impositionConfig);
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    printIframe.src = blobUrl;

    printIframe.onload = () => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      } catch {
        window.open(blobUrl, '_blank');
      } finally {
        setTimeout(() => {
          try {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
            URL.revokeObjectURL(blobUrl);
          } catch {
            // Ignore cleanup errors
          }
        }, 60000);
      }
    };

    document.body.appendChild(printIframe);
  }

  /**
   * Generates industrial standard Zebra Programming Language (ZPL II) code
   * for direct execution on Zebra / Honeywell / Sato thermal printers.
   */
  public static generateZplBatch(
    template: LabelTemplate,
    products: ProductRecord[],
    options: ZplExportOptions = { dpi: 203 }
  ): string {
    const dotsPerMm = options.dpi === 600 ? 23.62 : options.dpi === 300 ? 11.81 : 8.0;
    const labelWidthDots = Math.round(template.width_mm * dotsPerMm);
    const labelHeightDots = Math.round(template.height_mm * dotsPerMm);

    const zplCommands: string[] = [];

    products.forEach((prod) => {
      zplCommands.push('^XA'); // Start of Label format
      zplCommands.push(`^PW${labelWidthDots}`); // Print Width
      zplCommands.push(`^LL${labelHeightDots}`); // Label Length
      zplCommands.push(`^PR${options.speed || 4},${options.speed || 4}`); // Print Speed
      if (options.darkness) zplCommands.push(`~SD${options.darkness}`); // Darkness

      // Iterate through elements and generate ZPL field data
      (template.items || []).forEach((elem: any) => {
        const xDots = Math.round((elem.x_mm || 0) * dotsPerMm);
        const yDots = Math.round((elem.y_mm || 0) * dotsPerMm);

        if (elem.type === 'text') {
          let text = elem.text || '';
          if (elem.binding_key || elem.binding) {
            const key = elem.binding_key || elem.binding;
            text = (prod as any)[key] || text;
          }
          const fontH = Math.round((elem.font_size_pt || elem.fontSize || 10) * (dotsPerMm / 2.8));
          zplCommands.push(`^FO${xDots},${yDots}`);
          zplCommands.push(`^A0N,${fontH},${fontH}`);
          zplCommands.push(`^FD${text}^FS`);
        } else if (elem.type === 'barcode') {
          const barcodeValue = prod.PRODUCT_SCAN || (prod as any).barcode || elem.barcodeValue || '123456789012';
          const bcH = Math.round((elem.h_mm || 15) * dotsPerMm);
          zplCommands.push(`^FO${xDots},${yDots}`);
          zplCommands.push(`^BCN,${bcH},Y,N,N`);
          zplCommands.push(`^FD${barcodeValue}^FS`);
        } else if (elem.type === 'qrcode') {
          const qrVal = prod.PRODUCT_SCAN || (prod as any).sku || 'https://estudio.internal';
          zplCommands.push(`^FO${xDots},${yDots}`);
          zplCommands.push(`^BQN,2,4`);
          zplCommands.push(`^FDLA,${qrVal}^FS`);
        } else if (elem.type === 'shape') {
          const wDots = Math.round((elem.w_mm || 20) * dotsPerMm);
          const hDots = Math.round((elem.h_mm || 10) * dotsPerMm);
          const borderDots = Math.max(1, Math.round((elem.border_width || elem.stroke_width_mm || 1) * (dotsPerMm / 4)));
          zplCommands.push(`^FO${xDots},${yDots}`);
          zplCommands.push(`^GB${wDots},${hDots},${borderDots}^FS`);
        }
      });

      zplCommands.push('^XZ'); // End of Label format
    });

    return zplCommands.join('\n');
  }

  /**
   * Generates a direct PDF download of an imposed batch
   */
  public static savePdfDocument(doc: jsPDF, filename: string): void {
    doc.save(filename);
  }
}

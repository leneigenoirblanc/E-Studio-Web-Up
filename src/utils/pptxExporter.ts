import pptxgen from 'pptxgenjs';
import { LabelTemplate, ProductRecord, ImpositionConfig, ImpositionCalculation } from '../types';
import { HeadlessCanvasRenderer } from './headlessCanvasRenderer';

/**
 * Converts mm to inches for pptxgenjs layout
 */
const mmToIn = (mm: number) => mm / 25.4;

export class PptxExporter {
  /**
   * Generates a PowerPoint (.pptx) file with one slide per print sheet page,
   * rendering each label using a headless canvas reproduction strategy to mirror
   * the Template Editor preview rendering exactly.
   */
  static async exportToPptx(
    template: LabelTemplate,
    products: ProductRecord[],
    imposition: ImpositionCalculation,
    impositionConfig: ImpositionConfig
  ) {
    const pptx = new pptxgen();

    // Configure Slide Dimensions matching the paper page
    const pageWidthIn = mmToIn(imposition.page_w_mm);
    const pageHeightIn = mmToIn(imposition.page_h_mm);

    pptx.defineLayout({
      name: 'CUSTOM_SHEET',
      width: pageWidthIn,
      height: pageHeightIn,
    });
    pptx.layout = 'CUSTOM_SHEET';

    const labelsPerPage = imposition.total_per_page;
    const startOffset = Math.max(0, Math.min(labelsPerPage - 1, impositionConfig.start_offset_slot || 0));
    const totalItems = products.length + startOffset;
    const totalPages = Math.max(1, Math.ceil(totalItems / labelsPerPage));

    const gapX = Math.max(0, impositionConfig.gap_x_mm ?? impositionConfig.gap_mm ?? 2.0);
    const gapY = Math.max(0, impositionConfig.gap_y_mm ?? impositionConfig.gap_mm ?? 2.0);

    let productIndex = 0;

    // Cache rendered label images to optimize performance
    const renderCache = new Map<string, string>();

    for (let page = 0; page < totalPages; page++) {
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      for (let slot = 0; slot < labelsPerPage; slot++) {
        if (page === 0 && slot < startOffset) {
          continue; // Skip offset slots on first sheet
        }

        if (productIndex >= products.length) break;
        const prod = products[productIndex];
        productIndex++;

        const col = slot % imposition.cols;
        const row = Math.floor(slot / imposition.cols);

        // Calculate label origin in mm on sheet
        const labelX_mm = imposition.horizontal_offset_mm + col * (imposition.label_total_w_mm + gapX);
        const labelY_mm = imposition.vertical_offset_mm + row * (imposition.label_total_h_mm + gapY);

        const labelX_in = mmToIn(labelX_mm);
        const labelY_in = mmToIn(labelY_mm);
        const labelW_in = mmToIn(template.width_mm);
        const labelH_in = mmToIn(template.height_mm);

        // Render label with headless canvas renderer at 300 DPI
        const cacheKey = `${template.name}_${prod?.id || 'demo'}_${template.items.length}`;
        let labelDataUrl = renderCache.get(cacheKey);

        if (!labelDataUrl) {
          labelDataUrl = await HeadlessCanvasRenderer.renderLabelToDataUrl(template, prod, {
            dpi: 300,
            renderBackground: true,
          });
          renderCache.set(cacheKey, labelDataUrl);
        }

        // Add exact high-res rendered label image to slide
        slide.addImage({
          data: labelDataUrl,
          x: labelX_in,
          y: labelY_in,
          w: labelW_in,
          h: labelH_in,
        });

        // Add optional cut marks / border in PPTX
        if (impositionConfig.show_cut_marks) {
          slide.addShape(pptx.ShapeType.rect, {
            x: labelX_in,
            y: labelY_in,
            w: labelW_in,
            h: labelH_in,
            fill: { color: '000000', transparency: 100 },
            line: { color: 'CBD5E1', width: 0.5, dashType: 'dash' },
          });
        }
      }
    }

    const safeName = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    await pptx.writeFile({ fileName: `etiquettes_${safeName}.pptx` });
  }
}

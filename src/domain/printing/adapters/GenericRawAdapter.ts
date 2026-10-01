import { LabelTemplate, ProductRecord } from '../../../types';
import { LabelFormat, PrinterInstance, PrinterModel } from '../types';
import { PrinterAdapter, GeneratedPrintPayload } from './PrinterAdapter';

export class GenericRawAdapter implements PrinterAdapter {
  readonly language = 'Generic';

  public async generateLabelPayload(
    template: LabelTemplate,
    format: LabelFormat,
    instance: PrinterInstance,
    products: ProductRecord[],
    model?: PrinterModel | null
  ): Promise<GeneratedPrintPayload> {
    // Generates formatted text stream with standard ESC/POS or plain ASCII representation
    const textLines: string[] = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      textLines.push('========================================');
      textLines.push(`  ${p.ITEMNAME || 'ARTICLE'}`);
      textLines.push(`  CODE: ${p.PRODUCT_SCAN || 'N/A'}`);
      textLines.push(`  PRIX: ${(p.SELLING_PRICE || 0).toFixed(2)} EUR`);
      textLines.push('========================================\n');
    }

    return {
      mode: 'native',
      language: 'Generic',
      data: textLines.join('\n'),
      mimeType: 'text/plain',
      labelCount: products.length,
    };
  }

  public async generateTestLabel(
    instance: PrinterInstance,
    format: LabelFormat,
    model?: PrinterModel | null
  ): Promise<GeneratedPrintPayload> {
    const lines = [
      '========================================',
      '      TEST IMPRIMANTE GENERIQUE',
      `  Appareil : ${instance.name}`,
      `  Format   : ${format.width}x${format.height} mm`,
      `  DPI      : ${instance.selectedDpi || 203}`,
      '  Statut   : PRET POUR IMPRESSION',
      '========================================',
    ];

    return {
      mode: 'native',
      language: 'Generic',
      data: lines.join('\n'),
      mimeType: 'text/plain',
      labelCount: 1,
    };
  }
}

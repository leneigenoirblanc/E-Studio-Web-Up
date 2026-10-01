import { LabelTemplate, ProductRecord } from '../../../types';
import { LabelFormat, PrinterInstance, PrinterModel } from '../types';
import { PrinterAdapter, GeneratedPrintPayload } from './PrinterAdapter';

export class TscTsplAdapter implements PrinterAdapter {
  readonly language = 'TSPL';

  public async generateLabelPayload(
    template: LabelTemplate,
    format: LabelFormat,
    instance: PrinterInstance,
    products: ProductRecord[],
    model?: PrinterModel | null
  ): Promise<GeneratedPrintPayload> {
    const dpi = instance.selectedDpi || 203;
    const mmToDots = (mm: number) => Math.round((mm * dpi) / 25.4);

    const commands: string[] = [];

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      commands.push(`SIZE ${format.width} mm, ${format.height} mm`);
      commands.push(`GAP ${format.verticalGap || 2} mm, 0 mm`);
      commands.push('DIRECTION 1');
      commands.push('CLS');

      if (instance.calibrationOffsets) {
        const offX = mmToDots(instance.calibrationOffsets.horizontal);
        const offY = mmToDots(instance.calibrationOffsets.vertical);
        commands.push(`OFFSET ${offX} dot, ${offY} dot`);
      }

      if (template.items && Array.isArray(template.items)) {
        for (const item of template.items) {
          const x = mmToDots(item.x_mm);
          const y = mmToDots(item.y_mm);

          if (item.type === 'text') {
            const content = (item as any).text || '';
            commands.push(`TEXT ${x},${y},"3",0,1,1,"${content.replace(/"/g, '')}"`);
          } else if (item.type === 'price_block') {
            const rawPrice = p.SELLING_PRICE || (item as any).fallback_price || 0;
            const priceStr = typeof rawPrice === 'number' ? rawPrice.toFixed(2) + ' €' : String(rawPrice);
            commands.push(`TEXT ${x},${y},"4",0,1,1,"${priceStr.replace(/"/g, '')}"`);
          } else if (item.type === 'barcode') {
            const code = p.PRODUCT_SCAN || (item as any).code || '3614272049381';
            const h = mmToDots(item.h_mm);
            commands.push(`BARCODE ${x},${y},"EAN13",${h},1,0,2,2,"${code}"`);
          } else if (item.type === 'qrcode') {
            const qrContent = (item as any).content || 'https://estudio.app';
            commands.push(`QRCODE ${x},${y},L,4,A,0,"${qrContent}"`);
          } else if (item.type === 'shape') {
            const x2 = x + mmToDots(item.w_mm);
            const y2 = y + mmToDots(item.h_mm);
            const border = Math.max(1, mmToDots((item as any).border_width || 1));
            commands.push(`BOX ${x},${y},${x2},${y2},${border}`);
          }
        }
      }

      commands.push('PRINT 1,1');
    }

    return {
      mode: 'native',
      language: 'TSPL',
      data: commands.join('\n'),
      mimeType: 'text/plain',
      labelCount: products.length,
    };
  }

  public async generateTestLabel(
    instance: PrinterInstance,
    format: LabelFormat,
    model?: PrinterModel | null
  ): Promise<GeneratedPrintPayload> {
    const dpi = instance.selectedDpi || 203;
    const mmToDots = (mm: number) => Math.round((mm * dpi) / 25.4);

    const wDots = mmToDots(format.width);
    const hDots = mmToDots(format.height);

    const lines: string[] = [
      `SIZE ${format.width} mm, ${format.height} mm`,
      `GAP ${format.verticalGap || 2} mm, 0 mm`,
      'DIRECTION 1',
      'CLS',
      `BOX 0,0,${wDots},${hDots},2`,
      `TEXT 20,20,"3",0,1,1,"TEST CALIBRATION E-STUDIO (TSPL)"`,
      `TEXT 20,60,"2",0,1,1,"Imprimante : ${instance.name} (${dpi} DPI)"`,
      `TEXT 20,100,"2",0,1,1,"Format : ${format.width}x${format.height} mm"`,
      `BARCODE 20,150,"EAN13",60,1,0,2,2,"3614272049381"`,
      `QRCODE ${wDots - 120},140,L,3,A,0,"E-STUDIO TSPL OK"`,
      'PRINT 1,1',
    ];

    return {
      mode: 'native',
      language: 'TSPL',
      data: lines.join('\n'),
      mimeType: 'text/plain',
      labelCount: 1,
    };
  }
}

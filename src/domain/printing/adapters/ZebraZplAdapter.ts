import { LabelTemplate, ProductRecord } from '../../../types';
import { LabelFormat, PrinterInstance, PrinterModel } from '../types';
import { PrinterAdapter, GeneratedPrintPayload } from './PrinterAdapter';

export class ZebraZplAdapter implements PrinterAdapter {
  readonly language = 'ZPL';

  public async generateLabelPayload(
    template: LabelTemplate,
    format: LabelFormat,
    instance: PrinterInstance,
    products: ProductRecord[],
    model?: PrinterModel | null
  ): Promise<GeneratedPrintPayload> {
    const dpi = instance.selectedDpi || 203;
    const mmToDots = (mm: number) => Math.round((mm * dpi) / 25.4);

    const widthDots = mmToDots(format.width);
    const heightDots = mmToDots(format.height);
    const offsetX = mmToDots(instance.calibrationOffsets?.horizontal || 0);
    const offsetY = mmToDots(instance.calibrationOffsets?.vertical || 0);

    const commands: string[] = [];

    // Process each product record into a ZPL label block
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      commands.push('^XA');
      commands.push(`^PW${widthDots}`);
      commands.push(`^LL${heightDots}`);
      commands.push(`^LH${offsetX},${offsetY}`);

      if (instance.darkness !== undefined) {
        commands.push(`~SD${Math.min(30, Math.max(0, instance.darkness))}`);
      }
      if (instance.printSpeedIps) {
        commands.push(`^PR${instance.printSpeedIps}`);
      }

      // Render standard elements from template
      if (template.items && Array.isArray(template.items)) {
        for (const item of template.items) {
          const x = mmToDots(item.x_mm);
          const y = mmToDots(item.y_mm);

          if (item.type === 'text') {
            const fontSize = Math.max(16, mmToDots((item as any).font_size_pt * 0.3527));
            const content = (item as any).text || '';
            commands.push(`^FO${x},${y}^A0N,${fontSize},${fontSize}^FD${this.escapeZpl(content)}^FS`);
          } else if (item.type === 'price_block') {
            const rawPrice = p.SELLING_PRICE || (item as any).fallback_price || 0;
            const priceStr = typeof rawPrice === 'number' ? rawPrice.toFixed(2) + ' €' : String(rawPrice);
            const fontSize = mmToDots(12);
            commands.push(`^FO${x},${y}^A0N,${fontSize},${fontSize}^FD${this.escapeZpl(priceStr)}^FS`);
          } else if (item.type === 'barcode') {
            const code = p.PRODUCT_SCAN || (item as any).code || '3614272049381';
            const h = mmToDots(item.h_mm);
            commands.push(`^FO${x},${y}^BEN,${h},Y,N^FD${code}^FS`);
          } else if (item.type === 'qrcode') {
            const qrContent = (item as any).content || 'https://estudio.app';
            commands.push(`^FO${x},${y}^BQN,2,5^FDQA,${qrContent}^FS`);
          } else if (item.type === 'line') {
            const w = mmToDots(item.w_mm);
            const thickness = Math.max(2, mmToDots((item as any).thickness || 0.5));
            commands.push(`^FO${x},${y}^GB${w},${thickness},${thickness}^FS`);
          } else if (item.type === 'shape') {
            const w = mmToDots(item.w_mm);
            const h = mmToDots(item.h_mm);
            const border = Math.max(1, mmToDots((item as any).border_width || 1));
            commands.push(`^FO${x},${y}^GB${w},${h},${border}^FS`);
          }
        }
      }

      commands.push('^XZ');
    }

    return {
      mode: 'native',
      language: 'ZPL',
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
    const offX = mmToDots(instance.calibrationOffsets?.horizontal || 0);
    const offY = mmToDots(instance.calibrationOffsets?.vertical || 0);

    const zpl: string[] = [
      '^XA',
      `^PW${wDots}`,
      `^LL${hDots}`,
      `^LH${offX},${offY}`,
      // 1. Full perimeter test border (for calibration and alignment check)
      `^FO0,0^GB${wDots},${hDots},2^FS`,
      // 2. Header text: Printer name, model, DPI
      `^FO${mmToDots(3)},${mmToDots(3)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDTEST D'ALIGNEMENT E-STUDIO^FS`,
      `^FO${mmToDots(3)},${mmToDots(8)}^A0N,${mmToDots(3)},${mmToDots(3)}^FD${this.escapeZpl(instance.name)} (${model?.model || 'Zebra ZPL'}) - ${dpi} DPI^FS`,
      `^FO${mmToDots(3)},${mmToDots(12)}^A0N,${mmToDots(2.5)},${mmToDots(2.5)}^FDDimensions : ${format.width}x${format.height} mm (${(format.width / 25.4).toFixed(2)}x${(format.height / 25.4).toFixed(2)} in)^FS`,
      // 3. Millimeter test ruler
      `^FO${mmToDots(3)},${mmToDots(16)}^GB${mmToDots(Math.min(50, format.width - 6))},2,2^FS`,
      `^FO${mmToDots(3)},${mmToDots(18)}^A0N,${mmToDots(2)},${mmToDots(2)}^FD|---- 10mm ---- 20mm ---- 30mm ---- 40mm ---- 50mm|^FS`,
      // 4. Sample Barcode EAN-13
      `^FO${mmToDots(3)},${mmToDots(23)}^BEN,${mmToDots(10)},Y,N^FD3614272049381^FS`,
      // 5. Diagnostic QR code
      `^FO${wDots - mmToDots(16)},${mmToDots(22)}^BQN,2,3^FDQA,E-STUDIO CALIBRATION OK^FS`,
      '^XZ',
    ];

    return {
      mode: 'native',
      language: 'ZPL',
      data: zpl.join('\n'),
      mimeType: 'text/plain',
      labelCount: 1,
    };
  }

  private escapeZpl(text: string): string {
    return text.replace(/[\^~]/g, '');
  }
}

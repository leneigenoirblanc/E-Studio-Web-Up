/**
 * E-Studio Zebra ZPL II Render Adapter
 * 
 * Transforms a RenderScene IR directly into native Zebra Programming Language (ZPL II)
 * for industrial direct thermal and thermal transfer printers.
 */

import { RenderScene, IRNode, IRTextNode, IRPriceBlockNode, IRBarcodeNode, IRQrCodeNode, IRShapeNode } from '../renderIR';

export interface ZplOptions {
  dpi?: 203 | 300 | 600;
  darkness?: number; // 0-30
  printSpeed?: number; // 2-6 ips
}

export function renderSceneToZpl(
  scene: RenderScene,
  options?: ZplOptions
): string {
  const dpi = options?.dpi || 203;
  const dotsPerMm = dpi === 300 ? 11.81 : dpi === 600 ? 23.62 : 8.0;

  const toDots = (mm: number) => Math.round(mm * dotsPerMm);

  const labelWidthDots = toDots(scene.dimensionsMm.widthMm);
  const labelHeightDots = toDots(scene.dimensionsMm.heightMm);

  const commands: string[] = [
    '^XA',
    `^PW${labelWidthDots}`,
    `^LL${labelHeightDots}`,
    options?.darkness ? `~SD${options.darkness}` : '',
    options?.printSpeed ? `^PR${options.printSpeed}` : '',
  ].filter(Boolean);

  for (const node of scene.nodes) {
    const x = toDots(node.bounds.xMm);
    const y = toDots(node.bounds.yMm);
    const w = toDots(node.bounds.widthMm);
    const h = toDots(node.bounds.heightMm);

    switch (node.type) {
      case 'text': {
        const textNode = node as IRTextNode;
        const fontH = Math.max(16, Math.round(textNode.fontSizePt * (dotsPerMm / 2.8)));
        const fontW = Math.round(fontH * 0.7);
        commands.push(`^FO${x},${y}^A0N,${fontH},${fontW}^FD${escapeZpl(textNode.text)}^FS`);
        break;
      }

      case 'price_block': {
        const priceNode = node as IRPriceBlockNode;
        const mainH = Math.max(30, Math.round(h * 0.75));
        const mainW = Math.round(mainH * 0.75);
        const decH = Math.round(mainH * 0.55);
        const decW = Math.round(decH * 0.75);

        // Integer price
        commands.push(`^FO${x},${y}^A0N,${mainH},${mainW}^FD${priceNode.integerPart}^FS`);
        // Decimal price
        const decX = x + priceNode.integerPart.length * mainW + 4;
        commands.push(`^FO${decX},${y}^A0N,${decH},${decW}^FD.${priceNode.decimalPart} ${priceNode.currencySymbol}^FS`);

        if (priceNode.hasPromo && priceNode.discountPercent) {
          commands.push(`^FO${x + w - 100},${y}^GB100,${decH},2^FS`);
          commands.push(`^FO${x + w - 95},${y + 4}^A0N,${decH - 8},${decW - 4}^FD-${priceNode.discountPercent}%^FS`);
        }
        break;
      }

      case 'barcode': {
        const barcodeNode = node as IRBarcodeNode;
        const barH = Math.max(20, Math.round(h * (barcodeNode.showText ? 0.75 : 1.0)));
        const modW = Math.max(2, Math.round(w / barcodeNode.totalUnits));

        if (barcodeNode.format === 'EAN13') {
          commands.push(`^FO${x},${y}^BEN,${barH},${barcodeNode.showText ? 'Y' : 'N'},N^FD${barcodeNode.value}^FS`);
        } else {
          commands.push(`^FO${x},${y}^BCN,${barH},${barcodeNode.showText ? 'Y' : 'N'},N,N^FD>:${barcodeNode.value}^FS`);
        }
        break;
      }

      case 'qrcode': {
        const qrNode = node as IRQrCodeNode;
        const mag = Math.max(2, Math.min(10, Math.round(w / 30)));
        commands.push(`^FO${x},${y}^BQN,2,${mag}^FDQA,${qrNode.content}^FS`);
        break;
      }

      case 'shape': {
        const shapeNode = node as IRShapeNode;
        const borderDots = Math.max(1, toDots(shapeNode.strokeWidthMm || 0.3));
        commands.push(`^FO${x},${y}^GB${w},${h},${borderDots}^FS`);
        break;
      }
    }
  }

  commands.push('^XZ');
  return commands.join('\n');
}

function escapeZpl(str: string): string {
  return str.replace(/\^/g, '_5E').replace(/~/g, '_7E');
}

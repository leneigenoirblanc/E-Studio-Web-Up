/**
 * E-Studio Vector PDF Adapter
 * 
 * Draws a RenderScene IR directly into a jsPDF document using pure vector
 * primitives (rectangles, text, lines, native barcode bars).
 * Ensures instant generation, infinite sharpness, and zero raster degradation.
 */

import { jsPDF } from 'jspdf';
import { RenderScene, IRNode, IRTextNode, IRPriceBlockNode, IRBarcodeNode, IRQrCodeNode, IRShapeNode, IRLineNode } from '../renderIR';

export interface DrawSceneOptions {
  offsetXmm: number;
  offsetYmm: number;
  scale?: number;
}

export function drawSceneToPdf(
  doc: jsPDF,
  scene: RenderScene,
  options: DrawSceneOptions
): void {
  const { offsetXmm, offsetYmm } = options;

  for (const node of scene.nodes) {
    drawNodeToPdf(doc, node, offsetXmm, offsetYmm);
  }
}

function parseHexColor(hex: string): [number, number, number] {
  if (!hex || !hex.startsWith('#')) return [0, 0, 0];
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [r, g, b];
  }
  return [0, 0, 0];
}

function drawNodeToPdf(
  doc: jsPDF,
  node: IRNode,
  sheetX: number,
  sheetY: number
): void {
  const nodeX = sheetX + node.bounds.xMm;
  const nodeY = sheetY + node.bounds.yMm;
  const { widthMm, heightMm } = node.bounds;

  switch (node.type) {
    case 'text': {
      const textNode = node as IRTextNode;
      const [r, g, b] = parseHexColor(textNode.color);
      doc.setTextColor(r, g, b);
      doc.setFontSize(textNode.fontSizePt);
      doc.setFont('helvetica', textNode.fontWeight === 'bold' || textNode.fontWeight === '800' ? 'bold' : 'normal');

      // Vertical alignment calculation
      const textY = nodeY + Math.max(2, textNode.fontSizePt * 0.352);
      const align = textNode.textAlign === 'center' ? 'center' : textNode.textAlign === 'right' ? 'right' : 'left';
      const textX = textNode.textAlign === 'center' ? nodeX + widthMm / 2 : textNode.textAlign === 'right' ? nodeX + widthMm : nodeX;

      doc.text(textNode.text, textX, textY, { align: align as any });

      if (textNode.textDecoration === 'line-through') {
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.3);
        doc.line(nodeX, textY - 1, nodeX + widthMm, textY - 1);
      }
      break;
    }

    case 'price_block': {
      const priceNode = node as IRPriceBlockNode;
      const [pr, pg, pb] = parseHexColor(priceNode.primaryColor);

      // Promo badge
      if (priceNode.hasPromo && priceNode.discountPercent) {
        doc.setFillColor(220, 38, 38);
        doc.rect(nodeX, nodeY, Math.min(widthMm * 0.45, 18), heightMm * 0.28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(Math.max(6, heightMm * 0.5));
        doc.setFont('helvetica', 'bold');
        doc.text(`-${priceNode.discountPercent}%`, nodeX + 1.5, nodeY + heightMm * 0.2);
      }

      const promoOffset = priceNode.hasPromo ? Math.min(widthMm * 0.45, 18) + 2 : 0;

      // Integer part
      doc.setTextColor(pr, pg, pb);
      const intFontSizePt = Math.max(10, heightMm * 2.2);
      doc.setFontSize(intFontSizePt);
      doc.setFont('helvetica', 'bold');
      doc.text(priceNode.integerPart, nodeX + promoOffset, nodeY + heightMm * 0.72);

      // Decimal & Currency
      const decFontSizePt = intFontSizePt * 0.55;
      doc.setFontSize(decFontSizePt);
      const intWidth = doc.getTextWidth(priceNode.integerPart);
      doc.text(`,${priceNode.decimalPart} ${priceNode.currencySymbol}`, nodeX + promoOffset + intWidth + 0.5, nodeY + heightMm * 0.48);

      // Strike-through original price
      if (priceNode.originalPrice) {
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(decFontSizePt * 0.85);
        const origText = `${priceNode.originalPrice} ${priceNode.currencySymbol}`;
        const origX = nodeX + widthMm - doc.getTextWidth(origText);
        const origY = nodeY + heightMm * 0.3;
        doc.text(origText, origX, origY);
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.25);
        doc.line(origX, origY - 0.8, origX + doc.getTextWidth(origText), origY - 0.8);
      }
      break;
    }

    case 'barcode': {
      const barcodeNode = node as IRBarcodeNode;
      const [br, bg, bb] = parseHexColor(barcodeNode.barColor);
      doc.setFillColor(br, bg, bb);

      const unitWidth = widthMm / Math.max(1, barcodeNode.totalUnits);
      const barHeight = heightMm * (barcodeNode.showText ? 0.78 : 1.0);

      for (const bar of barcodeNode.bars) {
        doc.rect(nodeX + bar.x * unitWidth, nodeY, bar.width * unitWidth, barHeight, 'F');
      }

      if (barcodeNode.showText) {
        doc.setTextColor(br, bg, bb);
        doc.setFontSize(Math.max(6, heightMm * 0.45));
        doc.setFont('courier', 'normal');
        doc.text(barcodeNode.displayValue, nodeX + widthMm / 2, nodeY + heightMm, { align: 'center' });
      }
      break;
    }

    case 'qrcode': {
      const qrNode = node as IRQrCodeNode;
      const [dr, dg, db] = parseHexColor(qrNode.darkColor);
      const [lr, lg, lb] = parseHexColor(qrNode.lightColor);

      // Background
      doc.setFillColor(lr, lg, lb);
      doc.rect(nodeX, nodeY, widthMm, heightMm, 'F');

      // Modules
      doc.setFillColor(dr, dg, db);
      const modSize = Math.min(widthMm, heightMm) / qrNode.sizeModules;

      for (let r = 0; r < qrNode.sizeModules; r++) {
        for (let c = 0; c < qrNode.sizeModules; c++) {
          if (qrNode.matrix[r] && qrNode.matrix[r][c]) {
            doc.rect(nodeX + c * modSize, nodeY + r * modSize, modSize, modSize, 'F');
          }
        }
      }
      break;
    }

    case 'shape': {
      const shapeNode = node as IRShapeNode;
      const hasFill = Boolean(shapeNode.fillColor && shapeNode.fillColor !== 'none');
      const hasStroke = Boolean(shapeNode.strokeColor && shapeNode.strokeColor !== 'none' && shapeNode.strokeWidthMm > 0);

      if (hasFill) {
        const [fr, fg, fb] = parseHexColor(shapeNode.fillColor!);
        doc.setFillColor(fr, fg, fb);
      }
      if (hasStroke) {
        const [sr, sg, sb] = parseHexColor(shapeNode.strokeColor!);
        doc.setDrawColor(sr, sg, sb);
        doc.setLineWidth(shapeNode.strokeWidthMm);
      }

      const style = hasFill && hasStroke ? 'FD' : hasFill ? 'F' : hasStroke ? 'D' : null;
      if (style) {
        if (shapeNode.borderRadiusMm && shapeNode.borderRadiusMm > 0) {
          doc.roundedRect(nodeX, nodeY, widthMm, heightMm, shapeNode.borderRadiusMm, shapeNode.borderRadiusMm, style);
        } else {
          doc.rect(nodeX, nodeY, widthMm, heightMm, style);
        }
      }
      break;
    }

    case 'line': {
      const lineNode = node as IRLineNode;
      const [lr, lg, lb] = parseHexColor(lineNode.strokeColor);
      doc.setDrawColor(lr, lg, lb);
      doc.setLineWidth(lineNode.strokeWidthMm);
      doc.line(nodeX, nodeY, nodeX + widthMm, nodeY);
      break;
    }
  }
}

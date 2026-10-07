/**
 * E-Studio SVG Vector Render Adapter
 * 
 * Transforms a RenderScene IR into an ultra-sharp, infinite-resolution SVG string
 * with millimetric coordinate space (1 unit = 1mm).
 */

import { RenderScene, IRNode, IRTextNode, IRPriceBlockNode, IRBarcodeNode, IRQrCodeNode, IRShapeNode, IRLineNode } from '../renderIR';

export function renderSceneToSvgString(scene: RenderScene): string {
  const { widthMm, heightMm } = scene.dimensionsMm;
  const elementsSvg: string[] = [];

  for (const node of scene.nodes) {
    const elemSvg = renderNodeToSvg(node);
    if (elemSvg) elementsSvg.push(elemSvg);
  }

  return `
<svg 
  xmlns="http://www.w3.org/2000/svg" 
  viewBox="0 0 ${widthMm} ${heightMm}" 
  width="${widthMm}mm" 
  height="${heightMm}mm" 
  style="background-color: ${scene.backgroundColor}; display: block;"
>
  <style>
    .ir-text { font-family: Inter, system-ui, -apple-system, sans-serif; }
    .ir-price-int { font-weight: 800; font-family: Impact, Inter, sans-serif; }
    .ir-price-dec { font-weight: 700; font-family: Inter, sans-serif; }
  </style>
  <rect x="0" y="0" width="${widthMm}" height="${heightMm}" fill="${scene.backgroundColor}" />
  ${elementsSvg.join('\n  ')}
</svg>
`.trim();
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderNodeToSvg(node: IRNode): string {
  const { xMm, yMm, widthMm, heightMm } = node.bounds;
  const transform = node.rotationDeg !== 0
    ? `transform="rotate(${node.rotationDeg} ${xMm + widthMm / 2} ${yMm + heightMm / 2})"`
    : '';

  switch (node.type) {
    case 'text': {
      const textNode = node as IRTextNode;
      const textAnchor = textNode.textAlign === 'center' ? 'middle' : textNode.textAlign === 'right' ? 'end' : 'start';
      const textX = textNode.textAlign === 'center' ? xMm + widthMm / 2 : textNode.textAlign === 'right' ? xMm + widthMm : xMm;
      // Convert pt to mm approximation: 1 pt = 0.352778 mm
      const fontSizeMm = Math.max(1, textNode.fontSizePt * 0.352778);
      const textY = yMm + fontSizeMm;

      return `
        <text 
          x="${textX}" 
          y="${textY}" 
          text-anchor="${textAnchor}" 
          font-family="${escapeXml(textNode.fontFamily)}" 
          font-size="${fontSizeMm.toFixed(2)}" 
          font-weight="${textNode.fontWeight}" 
          font-style="${textNode.fontStyle}" 
          fill="${textNode.color}" 
          ${textNode.textDecoration === 'line-through' ? 'text-decoration="line-through"' : ''} 
          class="ir-text" 
          ${transform}
        >${escapeXml(textNode.text)}</text>
      `.trim();
    }

    case 'price_block': {
      const priceNode = node as IRPriceBlockNode;
      const intFontSizeMm = heightMm * 0.68;
      const decFontSizeMm = heightMm * 0.38;
      const origFontSizeMm = heightMm * 0.28;

      let promoBadge = '';
      if (priceNode.hasPromo && priceNode.discountPercent) {
        promoBadge = `
          <g transform="translate(${xMm}, ${yMm})">
            <rect x="0" y="0" width="${Math.min(widthMm * 0.45, 18)}" height="${heightMm * 0.28}" rx="1" fill="#dc2626" />
            <text x="2" y="${heightMm * 0.2}" font-size="${heightMm * 0.2}" fill="#ffffff" font-weight="bold">-${priceNode.discountPercent}%</text>
          </g>
        `;
      }

      return `
        <g ${transform}>
          ${promoBadge}
          <text 
            x="${xMm + (priceNode.hasPromo ? Math.min(widthMm * 0.45, 18) + 2 : 0)}" 
            y="${yMm + intFontSizeMm}" 
            font-size="${intFontSizeMm.toFixed(2)}" 
            fill="${priceNode.primaryColor}" 
            class="ir-price-int"
          >${priceNode.integerPart}</text>
          <text 
            x="${xMm + (priceNode.hasPromo ? Math.min(widthMm * 0.45, 18) + 2 : 0) + intFontSizeMm * 0.6 * priceNode.integerPart.length}" 
            y="${yMm + decFontSizeMm}" 
            font-size="${decFontSizeMm.toFixed(2)}" 
            fill="${priceNode.primaryColor}" 
            class="ir-price-dec"
          >,${priceNode.decimalPart} ${priceNode.currencySymbol}</text>
          ${priceNode.originalPrice ? `
            <text 
              x="${xMm + widthMm}" 
              y="${yMm + origFontSizeMm}" 
              text-anchor="end" 
              font-size="${origFontSizeMm.toFixed(2)}" 
              fill="#94a3b8" 
              text-decoration="line-through"
            >${priceNode.originalPrice} ${priceNode.currencySymbol}</text>
          ` : ''}
        </g>
      `.trim();
    }

    case 'barcode': {
      const barcodeNode = node as IRBarcodeNode;
      const unitWidthMm = widthMm / Math.max(1, barcodeNode.totalUnits);
      const barElements = barcodeNode.bars.map((bar) => {
        const barX = xMm + bar.x * unitWidthMm;
        const barW = bar.width * unitWidthMm;
        return `<rect x="${barX.toFixed(3)}" y="${yMm}" width="${barW.toFixed(3)}" height="${(heightMm * (barcodeNode.showText ? 0.78 : 1)).toFixed(2)}" fill="${barcodeNode.barColor}" />`;
      }).join('');

      let textElement = '';
      if (barcodeNode.showText) {
        const textFontSize = Math.min(3, heightMm * 0.18);
        textElement = `
          <text 
            x="${xMm + widthMm / 2}" 
            y="${yMm + heightMm}" 
            text-anchor="middle" 
            font-size="${textFontSize.toFixed(2)}" 
            font-family="monospace" 
            fill="${barcodeNode.barColor}"
          >${escapeXml(barcodeNode.displayValue)}</text>
        `;
      }

      return `
        <g ${transform}>
          ${barElements}
          ${textElement}
        </g>
      `.trim();
    }

    case 'qrcode': {
      const qrNode = node as IRQrCodeNode;
      const moduleSizeMm = Math.min(widthMm, heightMm) / qrNode.sizeModules;
      const rects: string[] = [];

      for (let r = 0; r < qrNode.sizeModules; r++) {
        for (let c = 0; c < qrNode.sizeModules; c++) {
          if (qrNode.matrix[r] && qrNode.matrix[r][c]) {
            rects.push(`<rect x="${(xMm + c * moduleSizeMm).toFixed(3)}" y="${(yMm + r * moduleSizeMm).toFixed(3)}" width="${moduleSizeMm.toFixed(3)}" height="${moduleSizeMm.toFixed(3)}" fill="${qrNode.darkColor}" />`);
          }
        }
      }

      return `
        <g ${transform}>
          <rect x="${xMm}" y="${yMm}" width="${widthMm}" height="${heightMm}" fill="${qrNode.lightColor}" />
          ${rects.join('')}
        </g>
      `.trim();
    }

    case 'shape': {
      const shapeNode = node as IRShapeNode;
      if (shapeNode.shapeVariant === 'ellipse') {
        const rx = widthMm / 2;
        const ry = heightMm / 2;
        return `
          <ellipse 
            cx="${xMm + rx}" 
            cy="${yMm + ry}" 
            rx="${rx}" 
            ry="${ry}" 
            fill="${shapeNode.fillColor || 'none'}" 
            stroke="${shapeNode.strokeColor || 'none'}" 
            stroke-width="${shapeNode.strokeWidthMm}" 
            ${transform} 
          />
        `.trim();
      }

      return `
        <rect 
          x="${xMm}" 
          y="${yMm}" 
          width="${widthMm}" 
          height="${heightMm}" 
          rx="${shapeNode.borderRadiusMm || 0}" 
          fill="${shapeNode.fillColor || 'none'}" 
          stroke="${shapeNode.strokeColor || 'none'}" 
          stroke-width="${shapeNode.strokeWidthMm}" 
          ${transform} 
        />
      `.trim();
    }

    case 'line': {
      const lineNode = node as IRLineNode;
      return `
        <line 
          x1="${xMm}" 
          y1="${yMm}" 
          x2="${lineNode.x2Mm}" 
          y2="${lineNode.y2Mm}" 
          stroke="${lineNode.strokeColor}" 
          stroke-width="${lineNode.strokeWidthMm}" 
          ${transform} 
        />
      `.trim();
    }

    default:
      return '';
  }
}

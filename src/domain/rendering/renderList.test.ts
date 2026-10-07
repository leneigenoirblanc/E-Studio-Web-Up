import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateEan13, decomposePrice, buildRenderList } from './renderList';
import { mmToDots, generateSingleLabelZpl } from './zplGenerator';
import { LabelTemplate } from '../../types';

describe('Canonical RenderList & Geometry Truth', () => {
  it('correctly calculates and validates EAN-13 barcodes', () => {
    // 3250390123453 -> Checksum is 3 (3+6+5+0+3+27+0+3+2+9+4+15 = 77 -> 10-7 = 3)
    const validEan = validateEan13('3250390123453');
    assert.strictEqual(validEan.valid, true);

    // Corrupted checksum
    const invalidEan = validateEan13('3250390123450');
    assert.strictEqual(invalidEan.valid, false);
    assert.strictEqual(invalidEan.calculatedChecksum, 3);
  });

  it('decomposes prices into typography slots with currency exponents', () => {
    // EUR (exponent = 2)
    const eurPrice = decomposePrice(12.5, 'EUR', 2, ',');
    assert.strictEqual(eurPrice.integerPart, '12');
    assert.strictEqual(eurPrice.separator, ',');
    assert.strictEqual(eurPrice.decimalPart, '50');
    assert.strictEqual(eurPrice.currencySymbol, '€');

    // XAF (exponent = 0)
    const xafPrice = decomposePrice(2450, 'XAF', 0);
    assert.strictEqual(xafPrice.integerPart, '2 450');
    assert.strictEqual(xafPrice.separator, '');
    assert.strictEqual(xafPrice.decimalPart, '');
    assert.strictEqual(xafPrice.currencySymbol, 'FCFA');
  });

  it('converts millimetres to exact printer dots deterministically', () => {
    // 25.4 mm at 203 DPI = 203 dots
    assert.strictEqual(mmToDots(25.4, 203), 203);
    // 25.4 mm at 300 DPI = 300 dots
    assert.strictEqual(mmToDots(25.4, 300), 300);
    // 70 mm at 203 DPI = ~559 dots
    assert.strictEqual(mmToDots(70, 203), 559);
  });

  it('builds canonical RenderList with preflight diagnostics', () => {
    const template: LabelTemplate = {
      schema_version: 1,
      name: 'Test Gabarit 70x38',
      width_mm: 70,
      height_mm: 38,
      inner_margins_mm: { top: 0, bottom: 0, left: 0, right: 0 },
      outer_margins_mm: { top: 0, bottom: 0, left: 0, right: 0 },
      bg_color: '#ffffff',
      bg_opacity: 1,
      items: [
        {
          id: 'el-text',
          name: 'Désignation',
          type: 'text',
          x: 4,
          y: 4,
          width: 62,
          height: 8,
          content: 'Café Pur Arabica',
          font_size: 11,
          font_weight: 'bold',
        } as any,
        {
          id: 'el-price',
          name: 'Prix Vente',
          type: 'price',
          x: 4,
          y: 15,
          width: 35,
          height: 14,
          price_value: 3.49,
          currency: 'EUR',
          font_size: 24,
        } as any,
        {
          id: 'el-barcode',
          name: 'Code EAN',
          type: 'barcode',
          x: 4,
          y: 28,
          width: 50,
          height: 8,
          content: '3250390123453',
        } as any,
      ],
    };

    const renderList = buildRenderList(template, { SELLING_PRICE: 3.49 });
    assert.strictEqual(renderList.widthMm, 70);
    assert.strictEqual(renderList.heightMm, 38);
    assert.strictEqual(renderList.primitives.length, 3);
    assert.strictEqual(renderList.issues.length, 0);

    // Generate ZPL
    const zpl = generateSingleLabelZpl(renderList, { dpi: 203 });
    assert.ok(zpl.includes('^XA'));
    assert.ok(zpl.includes('^PW559')); // 70 mm
    assert.ok(zpl.includes('^LL304')); // 38 mm
    assert.ok(zpl.includes('^BEN,')); // EAN-13 command
    assert.ok(zpl.includes('^XZ'));
  });

  it('catches blocking preflight errors on negative prices and invalid barcodes', () => {
    const template: LabelTemplate = {
      schema_version: 1,
      name: 'Erroneous Template',
      width_mm: 50,
      height_mm: 30,
      inner_margins_mm: { top: 0, bottom: 0, left: 0, right: 0 },
      outer_margins_mm: { top: 0, bottom: 0, left: 0, right: 0 },
      bg_color: '#ffffff',
      bg_opacity: 1,
      items: [
        {
          id: 'el-price',
          type: 'price',
          x: 2,
          y: 5,
          width: 40,
          height: 12,
          price_value: 0,
        } as any,
        {
          id: 'el-barcode',
          type: 'barcode',
          x: 2,
          y: 18,
          width: 40,
          height: 8,
          content: '123456', // Invalid EAN-13
        } as any,
      ],
    };

    const renderList = buildRenderList(template, { SELLING_PRICE: 0 });
    const blocking = renderList.issues.filter((i) => i.severity === 'BLOCKING');
    assert.ok(blocking.length >= 2);
  });
});

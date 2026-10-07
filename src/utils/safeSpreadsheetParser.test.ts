import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeRow } from './safeSpreadsheetParser';

describe('Safe Spreadsheet Parser & Sanitizer', () => {
  it('strips forbidden prototype-pollution keys (__proto__, constructor, prototype)', () => {
    const maliciousInput = {
      ITEMNAME: 'Café Pur Arabica',
      SELLING_PRICE: 4.99,
      __proto__: { isAdmin: true },
      constructor: { hacked: true },
      prototype: { evil: true },
    };

    const clean = sanitizeRow(maliciousInput);
    assert.strictEqual(clean.ITEMNAME, 'Café Pur Arabica');
    assert.strictEqual(clean.SELLING_PRICE, 4.99);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(clean, '__proto__'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(clean, 'constructor'), false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(clean, 'prototype'), false);
  });

  it('disarms spreadsheet formula injection (=, +, -, @)', () => {
    const formulaInput = {
      ITEMNAME: '=cmd|"/C calc"!A0',
      REF_CODE: '+123456',
      NOTE: '@SUM(A1:A10)',
    };

    const clean = sanitizeRow(formulaInput);
    assert.strictEqual(clean.ITEMNAME, 'cmd|"/C calc"!A0');
    assert.strictEqual(clean.REF_CODE, '123456');
    assert.strictEqual(clean.NOTE, 'SUM(A1:A10)');
  });
});

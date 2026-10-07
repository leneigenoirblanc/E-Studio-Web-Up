/**
 * E-Studio Safe Spreadsheet Parser & Sanitizer
 * Mitigates prototype-pollution and malicious injection risks when loading untrusted Excel / CSV files.
 */

import * as XLSX from 'xlsx';

export interface SanitizedSpreadsheetResult {
  sheetNames: string[];
  activeSheetName: string;
  rows: Array<Record<string, any>>;
  totalRows: number;
  columns: string[];
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_ALLOWED_ROWS = 50000;

/**
 * Sanitizes a single raw record from a spreadsheet to guarantee no prototype pollution
 */
export function sanitizeRow(raw: any): Record<string, any> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const clean: Record<string, any> = {};

  for (const [key, val] of Object.entries(raw)) {
    const trimmedKey = String(key).trim();
    if (!trimmedKey || FORBIDDEN_KEYS.has(trimmedKey.toLowerCase())) {
      continue;
    }

    // Handle formula injection: strip leading '=', '+', '-', '@' if present in text strings
    if (typeof val === 'string') {
      const trimmedVal = val.trim();
      if (trimmedVal.startsWith('=') || trimmedVal.startsWith('+') || trimmedVal.startsWith('-') || trimmedVal.startsWith('@')) {
        // Disarm potential spreadsheet formula injection
        clean[trimmedKey] = trimmedVal.replace(/^[=+\-@]+/, '');
      } else {
        clean[trimmedKey] = trimmedVal;
      }
    } else if (typeof val === 'number') {
      clean[trimmedKey] = isFinite(val) ? val : 0;
    } else if (typeof val === 'boolean') {
      clean[trimmedKey] = val;
    } else if (val === null || val === undefined) {
      clean[trimmedKey] = '';
    } else {
      clean[trimmedKey] = String(val);
    }
  }

  return clean;
}

/**
 * Safely parses an Excel or CSV file buffer with prototype-pollution guard and size limits
 */
export function parseSpreadsheetBuffer(buffer: ArrayBuffer | Uint8Array): SanitizedSpreadsheetResult {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  
  // Read with safe options
  const workbook = XLSX.read(data, {
    type: 'array',
    raw: false,
    cellFormula: false, // Disallow formula execution
    cellHTML: false,
  });

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('Le classeur ne contient aucune feuille de calcul.');
  }

  const activeSheetName = sheetNames[0];
  const worksheet = workbook.Sheets[activeSheetName];
  if (!worksheet) {
    throw new Error(`Feuille "${activeSheetName}" introuvable.`);
  }

  const rawRows = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
  if (rawRows.length > MAX_ALLOWED_ROWS) {
    throw new Error(`Le fichier dépasse la limite autorisée de ${MAX_ALLOWED_ROWS.toLocaleString()} lignes.`);
  }

  const columnsSet = new Set<string>();
  const sanitizedRows: Array<Record<string, any>> = [];

  for (const raw of rawRows) {
    const clean = sanitizeRow(raw);
    Object.keys(clean).forEach((k) => columnsSet.add(k));
    sanitizedRows.push(clean);
  }

  return {
    sheetNames,
    activeSheetName,
    rows: sanitizedRows,
    totalRows: sanitizedRows.length,
    columns: Array.from(columnsSet),
  };
}

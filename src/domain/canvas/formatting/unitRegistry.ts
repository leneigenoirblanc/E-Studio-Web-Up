/**
 * E-Studio Enterprise Unit Registry (Section 20)
 * Gère les unités métriques, packaging, et facteurs de conversion pour les prix unitaires.
 */

import { UnitDefinition, MeasurementCategory } from './types';

export class UnitRegistry {
  private static instance: UnitRegistry | null = null;
  private units: Map<string, UnitDefinition> = new Map();

  private constructor() {
    this.seedStandardUnits();
  }

  public static getInstance(): UnitRegistry {
    if (!this.instance) {
      this.instance = new UnitRegistry();
    }
    return this.instance;
  }

  private seedStandardUnits() {
    const standard: UnitDefinition[] = [
      // Masse (Base : kg)
      { id: 'kg', name: 'Kilogramme', symbol: 'kg', category: 'mass', baseUnit: 'kg', conversionFactor: 1 },
      { id: 'g', name: 'Gramme', symbol: 'g', category: 'mass', baseUnit: 'kg', conversionFactor: 0.001 },
      { id: 'mg', name: 'Milligramme', symbol: 'mg', category: 'mass', baseUnit: 'kg', conversionFactor: 0.000001 },
      { id: 't', name: 'Tonne', symbol: 't', category: 'mass', baseUnit: 'kg', conversionFactor: 1000 },

      // Volume (Base : L)
      { id: 'L', name: 'Litre', symbol: 'L', category: 'volume', baseUnit: 'L', conversionFactor: 1 },
      { id: 'cL', name: 'Centilitre', symbol: 'cL', category: 'volume', baseUnit: 'L', conversionFactor: 0.01 },
      { id: 'mL', name: 'Millilitre', symbol: 'mL', category: 'volume', baseUnit: 'L', conversionFactor: 0.001 },
      { id: 'm3', name: 'Mètre cube', symbol: 'm³', category: 'volume', baseUnit: 'L', conversionFactor: 1000 },

      // Longueur (Base : m)
      { id: 'm', name: 'Mètre', symbol: 'm', category: 'length', baseUnit: 'm', conversionFactor: 1 },
      { id: 'cm', name: 'Centimètre', symbol: 'cm', category: 'length', baseUnit: 'm', conversionFactor: 0.01 },
      { id: 'mm', name: 'Millimètre', symbol: 'mm', category: 'length', baseUnit: 'm', conversionFactor: 0.001 },

      // Superficie (Base : m²)
      { id: 'm2', name: 'Mètre carré', symbol: 'm²', category: 'area', baseUnit: 'm2', conversionFactor: 1 },
      { id: 'cm2', name: 'Centimètre carré', symbol: 'cm²', category: 'area', baseUnit: 'm2', conversionFactor: 0.0001 },

      // Comptage & Conditionnement
      { id: 'piece', name: 'Pièce', symbol: 'pce', category: 'count', baseUnit: 'piece', conversionFactor: 1 },
      { id: 'pack', name: 'Pack', symbol: 'pk', category: 'packaging', baseUnit: 'piece', conversionFactor: 1 },
      { id: 'case', name: 'Caisse', symbol: 'cs', category: 'packaging', baseUnit: 'piece', conversionFactor: 1 },
      { id: 'carton', name: 'Carton', symbol: 'ctn', category: 'packaging', baseUnit: 'piece', conversionFactor: 1 },
      { id: 'pallet', name: 'Palette', symbol: 'pal', category: 'packaging', baseUnit: 'piece', conversionFactor: 1 },
    ];

    standard.forEach((u) => this.units.set(u.id.toLowerCase(), u));
  }

  public getAllUnits(): UnitDefinition[] {
    return Array.from(this.units.values());
  }

  public getUnitsByCategory(category: MeasurementCategory): UnitDefinition[] {
    return Array.from(this.units.values()).filter((u) => u.category === category);
  }

  public getUnit(idOrSymbol: string): UnitDefinition | undefined {
    const clean = idOrSymbol.toLowerCase().trim();
    return this.units.get(clean) || Array.from(this.units.values()).find((u) => u.symbol.toLowerCase() === clean);
  }

  public registerCustomUnit(unit: UnitDefinition) {
    this.units.set(unit.id.toLowerCase(), unit);
  }

  /**
   * Convertit une valeur d'une unité source vers une unité cible compatible
   */
  public convert(value: number, fromUnitId: string, toUnitId: string): number | null {
    const from = this.getUnit(fromUnitId);
    const to = this.getUnit(toUnitId);
    if (!from || !to) return null;
    if (from.category !== to.category) return null;

    // Convert to base unit, then to target
    const inBase = value * (from.conversionFactor || 1);
    return inBase / (to.conversionFactor || 1);
  }
}

export const unitRegistry = UnitRegistry.getInstance();

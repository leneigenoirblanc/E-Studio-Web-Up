/**
 * Printer Repository
 * Persistance des imprimantes thermiques, laser et virtuelles
 */

import { Printer } from '../persistenceTypes';

const STORAGE_KEY = 'estudio_printers_registry_v1';

const DEFAULT_PRINTERS: Printer[] = [
  {
    id: 'printer-pdf-default',
    name: 'Générateur PDF Vectoriel Haute Définition',
    type: 'pdf',
    protocol: 'pdf',
    connection: { type: 'file' },
    capabilities: { dpi: 300, color: true },
    isDefault: true,
    status: 'online',
  },
  {
    id: 'printer-zebra-network',
    name: 'Zebra ZD420 (Réseau Raw 9100)',
    type: 'zebra',
    protocol: 'zpl',
    connection: { type: 'network', host: '192.168.1.100', port: 9100 },
    capabilities: { dpi: 203, thermal: true, maxWidthMm: 104 },
    isDefault: false,
    status: 'offline',
  },
];

export interface IPrinterRepository {
  findAll(): Promise<Printer[]>;
  findById(id: string): Promise<Printer | null>;
  findDefault(): Promise<Printer | null>;
  save(printer: Printer): Promise<void>;
  update(printer: Printer): Promise<void>;
  delete(id: string): Promise<void>;
  setDefault(id: string): Promise<void>;
}

export class PrinterRepository implements IPrinterRepository {
  private static instance: PrinterRepository | null = null;
  private printers: Printer[] = [];

  private constructor() {
    this.load();
  }

  public static getInstance(): PrinterRepository {
    if (!this.instance) {
      this.instance = new PrinterRepository();
    }
    return this.instance;
  }

  private load(): void {
    if (typeof window === 'undefined') {
      this.printers = [...DEFAULT_PRINTERS];
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.printers = JSON.parse(raw);
      } else {
        this.printers = [...DEFAULT_PRINTERS];
        this.persist();
      }
    } catch {
      this.printers = [...DEFAULT_PRINTERS];
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.printers));
    } catch (e) {
      console.error('Failed to persist printers:', e);
    }
  }

  public async findAll(): Promise<Printer[]> {
    return [...this.printers];
  }

  public async findById(id: string): Promise<Printer | null> {
    const found = this.printers.find((p) => p.id === id);
    return found ? { ...found } : null;
  }

  public async findDefault(): Promise<Printer | null> {
    const found = this.printers.find((p) => p.isDefault) || this.printers[0] || null;
    return found ? { ...found } : null;
  }

  public async save(printer: Printer): Promise<void> {
    const index = this.printers.findIndex((p) => p.id === printer.id);
    if (index >= 0) {
      this.printers[index] = { ...printer };
    } else {
      if (printer.isDefault) {
        this.printers.forEach((p) => (p.isDefault = false));
      }
      this.printers.push({ ...printer });
    }
    this.persist();
  }

  public async update(printer: Printer): Promise<void> {
    return this.save(printer);
  }

  public async delete(id: string): Promise<void> {
    this.printers = this.printers.filter((p) => p.id !== id);
    if (!this.printers.some((p) => p.isDefault) && this.printers.length > 0) {
      this.printers[0].isDefault = true;
    }
    this.persist();
  }

  public async setDefault(id: string): Promise<void> {
    this.printers.forEach((p) => {
      p.isDefault = p.id === id;
    });
    this.persist();
  }
}

export const printerRepository = PrinterRepository.getInstance();

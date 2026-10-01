import { PrinterInstance } from './types';
import { CANONICAL_PRINTER_MODELS } from './printerModelCatalog';

const STORAGE_KEY = 'estudio_configured_printers_v3';

const DEFAULT_PRINTER_INSTANCES: PrinterInstance[] = [];

export class PrinterRepository {
  private instances: PrinterInstance[] = [];

  constructor() {
    this.loadPrinters();
  }

  private loadPrinters() {
    try {
      // Clean legacy mock instances if present
      localStorage.removeItem('estudio_configured_printers_v2');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Exclude legacy mock printers if any
        this.instances = Array.isArray(parsed)
          ? parsed.filter((p: PrinterInstance) => !p.id.startsWith('printer-inst-zebra-') && !p.id.startsWith('printer-inst-office-') && !p.id.startsWith('printer-inst-generic-'))
          : [];
      } else {
        this.instances = [];
      }
    } catch {
      this.instances = [];
    }
  }

  private savePrinters() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.instances));
    } catch (e) {
      console.error('Failed to persist printers', e);
    }
  }

  public getAll(): PrinterInstance[] {
    return this.instances;
  }

  public getById(id: string): PrinterInstance | undefined {
    return this.instances.find((p) => p.id === id);
  }

  public addPrinter(instance: Omit<PrinterInstance, 'id' | 'createdAt'>): PrinterInstance {
    const newInst: PrinterInstance = {
      ...instance,
      id: `printer-inst-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };

    this.instances.unshift(newInst);
    this.savePrinters();
    return newInst;
  }

  public updatePrinter(id: string, updates: Partial<PrinterInstance>): PrinterInstance | null {
    const index = this.instances.findIndex((p) => p.id === id);
    if (index === -1) return null;

    this.instances[index] = {
      ...this.instances[index],
      ...updates,
    };
    this.savePrinters();
    return this.instances[index];
  }

  public updateCalibration(id: string, calibrationOffsets: PrinterInstance['calibrationOffsets']): boolean {
    const printer = this.getById(id);
    if (!printer) return false;
    printer.calibrationOffsets = calibrationOffsets;
    this.savePrinters();
    return true;
  }

  public removePrinter(id: string): boolean {
    const initialLen = this.instances.length;
    this.instances = this.instances.filter((p) => p.id !== id);
    if (this.instances.length !== initialLen) {
      this.savePrinters();
      return true;
    }
    return false;
  }

  public getModelForInstance(instance: PrinterInstance) {
    if (!instance.printerModelId) return null;
    return CANONICAL_PRINTER_MODELS.find((m) => m.id === instance.printerModelId) || null;
  }
}

export const printerRepository = new PrinterRepository();

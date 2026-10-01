/**
 * E-Studio Sheet Ledger — Anti-Waste Tracking
 * 
 * Remembers which slots of a partly used sheet are consumed,
 * and proposes the next start slot.
 */

export interface SheetLedgerEntry {
  stockId: string;
  templateName: string;
  lastRunTimestamp: number;
  consumedSlotsCount: number; // e.g., 7 labels printed on a 10-up sheet
  totalSlotsPerSheet: number;
  remainingSlotsOnPartialSheet: number; // 3 slots remaining
  nextStartOffsetSlot: number; // e.g. slot 4 (1-indexed) or 3 (0-indexed)
  accumulatedLabelsSaved: number;
}

const STORAGE_KEY = 'estudio_sheet_ledger_v1';

export class SheetLedgerService {
  private static instance: SheetLedgerService | null = null;
  private entries: Map<string, SheetLedgerEntry> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): SheetLedgerService {
    if (!this.instance) {
      this.instance = new SheetLedgerService();
    }
    return this.instance;
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((e: SheetLedgerEntry) => this.entries.set(e.stockId, e));
        }
      }
    } catch (e) {
      console.warn('Failed to load sheet ledger:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const arr = Array.from(this.entries.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('Failed to save sheet ledger:', e);
    }
  }

  /**
   * Proposes the next starting slot for a given stock
   */
  public getProposedStartSlot(stockId: string, totalSlotsPerSheet: number): number {
    const entry = this.entries.get(stockId);
    if (!entry) return 0;
    if (entry.remainingSlotsOnPartialSheet > 0) {
      return entry.nextStartOffsetSlot;
    }
    return 0;
  }

  /**
   * Records a completed print run and calculates remaining slots
   */
  public recordRun(
    stockId: string,
    templateName: string,
    labelsPrinted: number,
    startOffset: number,
    slotsPerSheet: number
  ): SheetLedgerEntry {
    const totalSlotsUsed = startOffset + labelsPrinted;
    const remainder = totalSlotsUsed % slotsPerSheet;

    const remainingSlots = remainder === 0 ? 0 : slotsPerSheet - remainder;
    const nextStartSlot = remainder === 0 ? 0 : remainder;

    const previousSaved = this.entries.get(stockId)?.accumulatedLabelsSaved || 0;
    const savedInThisRun = startOffset; // labels that avoided starting on a clean sheet

    const entry: SheetLedgerEntry = {
      stockId,
      templateName,
      lastRunTimestamp: Date.now(),
      consumedSlotsCount: remainder,
      totalSlotsPerSheet: slotsPerSheet,
      remainingSlotsOnPartialSheet: remainingSlots,
      nextStartOffsetSlot: nextStartSlot,
      accumulatedLabelsSaved: previousSaved + savedInThisRun,
    };

    this.entries.set(stockId, entry);
    this.saveToStorage();
    return entry;
  }

  public getEntry(stockId: string): SheetLedgerEntry | undefined {
    return this.entries.get(stockId);
  }

  public clearEntry(stockId: string) {
    this.entries.delete(stockId);
    this.saveToStorage();
  }
}

export const sheetLedger = SheetLedgerService.getInstance();

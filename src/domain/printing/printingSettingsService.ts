import { PrintingSettings, CurrencyConfig } from './types';

const STORAGE_KEY = 'estudio_printing_settings_v2';

const DEFAULT_SETTINGS: PrintingSettings = {
  defaultPrinterId: 'printer-inst-zebra-zd421',
  defaultFormatId: 'fmt-shelf-60x40',
  defaultTemplateName: 'Standard Supermarché 60x40',
  measurementUnit: 'mm',
  showDualUnits: true,
  currency: {
    code: 'EUR',
    symbol: '€',
    position: 'suffix',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
    decimals: 2,
  },
  batchConfirmationThreshold: 500,
  autoPreview: true,
  strictBarcodeValidation: true,
  defaultCopies: 1,
};

export class PrintingSettingsService {
  private settings: PrintingSettings = { ...DEFAULT_SETTINGS };

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  public getSettings(): PrintingSettings {
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<PrintingSettings>): PrintingSettings {
    this.settings = { ...this.settings, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
    return { ...this.settings };
  }

  public formatPrice(value: number, customCurrency?: Partial<CurrencyConfig>): string {
    const c = { ...this.settings.currency, ...customCurrency };
    const fixed = value.toFixed(c.decimals);
    const parts = fixed.split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, c.thousandsSeparator);
    const decimalPart = parts[1];

    const formattedNumber = c.decimals > 0 ? `${integerPart}${c.decimalSeparator}${decimalPart}` : integerPart;

    if (c.position === 'prefix') {
      return `${c.symbol} ${formattedNumber}`;
    }
    return `${formattedNumber} ${c.symbol}`;
  }

  public formatDimension(mm: number): string {
    const inches = (mm / 25.4).toFixed(2);
    if (this.settings.showDualUnits) {
      return `${mm} mm (${inches} in)`;
    }
    return this.settings.measurementUnit === 'in' ? `${inches} in` : `${mm} mm`;
  }
}

export const printingSettingsService = new PrintingSettingsService();

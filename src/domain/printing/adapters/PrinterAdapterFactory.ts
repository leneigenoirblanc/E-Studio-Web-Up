import { PrinterModel, PrinterInstance } from '../types';
import { PrinterAdapter } from './PrinterAdapter';
import { ZebraZplAdapter } from './ZebraZplAdapter';
import { TscTsplAdapter } from './TscTsplAdapter';
import { GenericRawAdapter } from './GenericRawAdapter';
import { SystemDriverAdapter } from './SystemDriverAdapter';

export class PrinterAdapterFactory {
  private static zpl = new ZebraZplAdapter();
  private static tspl = new TscTsplAdapter();
  private static raw = new GenericRawAdapter();
  private static system = new SystemDriverAdapter();

  public static getAdapter(model?: PrinterModel | null, instance?: PrinterInstance | null): PrinterAdapter {
    if (!model) {
      return this.raw;
    }

    switch (model.commandLanguage) {
      case 'ZPL':
      case 'EPL':
      case 'CPCL':
        return this.zpl;
      case 'TSPL':
        return this.tspl;
      case 'SystemDriver':
        return this.system;
      case 'Generic':
      case 'ESC/POS':
      default:
        return this.raw;
    }
  }
}

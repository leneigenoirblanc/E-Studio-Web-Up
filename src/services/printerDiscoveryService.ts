import { CANONICAL_PRINTER_MODELS } from '../domain/printing/printerModelCatalog';
import { PrinterConnectionType, PrinterModel } from '../domain/printing/types';

export interface DiscoveredPrinter {
  id: string;
  name: string;
  address: string;
  port: number;
  protocol: 'mDNS / Bonjour' | 'IPP' | 'RAW 9100' | 'LPR' | 'WebUSB' | 'Bluetooth' | 'System Spooler';
  connectionType: PrinterConnectionType;
  manufacturer?: string;
  model?: string;
  suggestedModelId?: string;
  macAddress?: string;
  txtRecords?: Record<string, string>;
  discoveredAt: number;
  latencyMs?: number;
  status: 'ONLINE' | 'OFFLINE' | 'UNVERIFIED';
  details?: string;
}

export class PrinterDiscoveryService {
  /**
   * Matches detected hardware string to the best matching Manufacturer Preset in catalog
   */
  public matchPreset(vendorOrName = '', model = '', text = ''): PrinterModel {
    const combined = `${vendorOrName} ${model} ${text}`.toLowerCase();

    if (combined.includes('zebra') || combined.includes('zd421') || combined.includes('zd420') || combined.includes('gk420') || combined.includes('zt411') || combined.includes('zpl')) {
      if (combined.includes('zt411') || combined.includes('industrial') || combined.includes('xi')) {
        return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-zebra-zt411') || CANONICAL_PRINTER_MODELS[0];
      }
      return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-zebra-zd421') || CANONICAL_PRINTER_MODELS[0];
    }

    if (combined.includes('brother') || combined.includes('ql-820') || combined.includes('ql-800') || combined.includes('ql-1110') || combined.includes('ql')) {
      if (combined.includes('1110') || combined.includes('wide')) {
        return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-brother-ql1110') || CANONICAL_PRINTER_MODELS[0];
      }
      return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-brother-ql820') || CANONICAL_PRINTER_MODELS[0];
    }

    if (combined.includes('tsc') || combined.includes('ttp-244') || combined.includes('tspl') || combined.includes('te200')) {
      return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-tsc-ttp244') || CANONICAL_PRINTER_MODELS[0];
    }

    if (combined.includes('epson') || combined.includes('c3500') || combined.includes('colorworks') || combined.includes('tm-c')) {
      return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-epson-c3500') || CANONICAL_PRINTER_MODELS[0];
    }

    if (combined.includes('tm-t88') || combined.includes('pos') || combined.includes('receipt') || combined.includes('ticket') || combined.includes('esc/pos')) {
      return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-epson-tmt88') || CANONICAL_PRINTER_MODELS[0];
    }

    if (combined.includes('dymo') || combined.includes('labelwriter') || combined.includes('450') || combined.includes('550')) {
      return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-dymo-lw450') || CANONICAL_PRINTER_MODELS[0];
    }

    if (combined.includes('bizerba') || combined.includes('mettler') || combined.includes('balance') || combined.includes('scale')) {
      return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-bizerba-sc2') || CANONICAL_PRINTER_MODELS[0];
    }

    if (combined.includes('laser') || combined.includes('office') || combined.includes('cups') || combined.includes('system') || combined.includes('hp') || combined.includes('canon')) {
      return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-system-office') || CANONICAL_PRINTER_MODELS[0];
    }

    return CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-generic-thermal') || CANONICAL_PRINTER_MODELS[0];
  }

  /**
   * Discover network printers using backend mDNS / Bonjour / IPP / RAW 9100 sweep
   */
  public async discoverNetworkPrinters(): Promise<DiscoveredPrinter[]> {
    try {
      const response = await fetch('/api/v2/printers/discover');
      if (response.ok) {
        const data = await response.json();
        if (data.printers && Array.isArray(data.printers)) {
          return data.printers.map((p: any) => ({
            id: p.id || `net-${p.address}-${p.port}`,
            name: p.name || `Imprimante Réseau (${p.address})`,
            address: p.address,
            port: p.port || 9100,
            protocol: p.protocol || 'mDNS / Bonjour',
            connectionType: (p.protocol === 'IPP' ? 'Ethernet' : 'Ethernet') as PrinterConnectionType,
            manufacturer: p.manufacturer,
            model: p.model,
            suggestedModelId: p.suggestedModelId || this.matchPreset(p.manufacturer, p.model, p.name).id,
            latencyMs: p.latencyMs,
            status: p.status || 'ONLINE',
            details: p.details || `Découverte réseau mDNS/Bonjour · ${p.address}:${p.port}`,
            discoveredAt: p.discoveredAt || Date.now(),
          }));
        }
      }
    } catch {
      // Backend not running or offline
    }

    return [];
  }

  /**
   * Probe a single IP address and Port
   */
  public async probeAddress(address: string, port = 9100): Promise<{
    reachable: boolean;
    latencyMs: number;
    suggestedModel: PrinterModel;
    details: string;
  }> {
    const startTime = performance.now();

    // Try backend proxy probe first
    try {
      const resp = await fetch('/api/v2/printers/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, port }),
      });
      if (resp.ok) {
        const res = await resp.json();
        const matched = CANONICAL_PRINTER_MODELS.find((m) => m.id === res.suggestedModelId) || this.matchPreset('', '', res.banner || address);
        return {
          reachable: res.isReachable,
          latencyMs: res.latencyMs || Math.round(performance.now() - startTime),
          suggestedModel: matched,
          details: res.isReachable
            ? `Port ${port} accessible en ${res.latencyMs}ms${res.banner ? ' · Bannière: ' + res.banner.slice(0, 30) : ''}`
            : `Hôte ${address}:${port} inaccessible ou refus de connexion`,
        };
      }
    } catch {
      // fallback to browser fetch probe
    }

    // Direct browser fetch probing (no-cors)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const httpPort = port === 9100 ? 80 : port;
      await fetch(`http://${address}:${httpPort}`, {
        mode: 'no-cors',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const latency = Math.round(performance.now() - startTime);
      return {
        reachable: true,
        latencyMs: latency,
        suggestedModel: this.matchPreset('', '', address),
        details: `Réponse réseau HTTP/RAW reçue en ${latency}ms`,
      };
    } catch {
      return {
        reachable: false,
        latencyMs: Math.round(performance.now() - startTime),
        suggestedModel: CANONICAL_PRINTER_MODELS.find((m) => m.id === 'model-generic-thermal') || CANONICAL_PRINTER_MODELS[0],
        details: `Aucune réponse de ${address}:${port}`,
      };
    }
  }

  /**
   * Request real physical USB printer device via WebUSB
   */
  public async requestUsbDevice(): Promise<{
    device: any;
    name: string;
    details: string;
    suggestedModel: PrinterModel;
  }> {
    if (typeof navigator === 'undefined' || !('usb' in navigator)) {
      throw new Error("L'API WebUSB n'est pas supportée par ce navigateur.");
    }

    const device = await (navigator as any).usb.requestDevice({ filters: [] });
    const mfg = device.manufacturerName || '';
    const prod = device.productName || '';
    const devName = prod || mfg || `Imprimante USB (VID: 0x${device.vendorId.toString(16).padStart(4, '0')})`;
    const details = `VID: 0x${device.vendorId.toString(16).padStart(4, '0')} · PID: 0x${device.productId.toString(16).padStart(4, '0')}${device.serialNumber ? ' · S/N: ' + device.serialNumber : ''}`;
    const suggestedModel = this.matchPreset(mfg, prod, devName);

    return {
      device,
      name: devName,
      details,
      suggestedModel,
    };
  }

  /**
   * Request real physical Bluetooth printer device via Web Bluetooth
   */
  public async requestBluetoothDevice(): Promise<{
    device: any;
    name: string;
    details: string;
    suggestedModel: PrinterModel;
  }> {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      throw new Error("L'API Web Bluetooth n'est pas supportée par ce navigateur.");
    }

    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
    });
    const devName = device.name || 'Imprimante Bluetooth';
    const details = `Périphérique Bluetooth appairé (ID: ${device.id})`;
    const suggestedModel = this.matchPreset('', '', devName);

    return {
      device,
      name: devName,
      details,
      suggestedModel,
    };
  }

  /**
   * Request real physical Serial / USB Virtual COM printer device via Web Serial API
   */
  public async requestSerialDevice(): Promise<{
    port: any;
    name: string;
    details: string;
    suggestedModel: PrinterModel;
  }> {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      throw new Error("L'API Web Serial n'est pas supportée par ce navigateur (recommandé: Google Chrome ou Microsoft Edge).");
    }

    const port = await (navigator as any).serial.requestPort();
    const info = port.getInfo ? port.getInfo() : {};
    const vid = info.usbVendorId ? `0x${info.usbVendorId.toString(16).padStart(4, '0')}` : 'COM Direct';
    const pid = info.usbProductId ? `0x${info.usbProductId.toString(16).padStart(4, '0')}` : '';
    const devName = `Port Série / USB COM (${vid}${pid ? ':' + pid : ''})`;
    const details = `Connexion Port Série / COM directe (VID: ${vid}${pid ? ' · PID: ' + pid : ''}) · Émulation thermique standard`;
    const suggestedModel = this.matchPreset('serial', 'thermal', devName);

    return {
      port,
      name: devName,
      details,
      suggestedModel,
    };
  }
}

export const printerDiscoveryService = new PrinterDiscoveryService();

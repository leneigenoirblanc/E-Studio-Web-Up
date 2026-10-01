import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { PersistedServerState, StationConfig, CatalogItem } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE_PATH = path.resolve(__dirname, '../../.estudio_state.json');

export const DEFAULT_CATALOG: CatalogItem[] = [
  {
    sku: 'CAF-250A',
    barcode: '3250390123456',
    designation: 'Café Moulu Arabica Pur 250g',
    department: 'Épicerie',
    category: 'Boissons Chaudes',
    regularPrice: 2450,
    promoPrice: 1950,
    unit: 'paquet',
    stock: 45,
  },
  {
    sku: 'HUI-100T',
    barcode: '3700012345678',
    designation: 'Huile de Tournesol Raffinée 1L',
    department: 'Épicerie',
    category: 'Corps Gras',
    regularPrice: 1350,
    promoPrice: 990,
    unit: 'bouteille',
    stock: 28,
  },
  {
    sku: 'NUT-400G',
    barcode: '3017620422003',
    designation: 'Pâte à Tartiner Noisette Cacao 400g',
    department: 'Épicerie',
    category: 'Petit Déjeuner',
    regularPrice: 3.89,
    promoPrice: 3.29,
    unit: 'pot',
    stock: 60,
  },
  {
    sku: 'COCA-15L',
    barcode: '5449000000996',
    designation: 'Soda Cola Original 1.5L',
    department: 'Boissons',
    category: 'Sodas & Eaux',
    regularPrice: 1.95,
    promoPrice: null,
    unit: 'bouteille',
    stock: 120,
  },
  {
    sku: 'JUS-100O',
    barcode: '3250390667788',
    designation: "Jus d'Orange Pur Jus 1L",
    department: 'Boissons',
    category: 'Jus de Fruits',
    regularPrice: 2.19,
    promoPrice: 1.79,
    unit: 'bouteille',
    stock: 35,
  },
  {
    sku: 'JAM-160G',
    barcode: '3250390123456',
    designation: 'Jambon Supérieur Découenne 4T 160g',
    department: 'Frais',
    category: 'Charcuterie',
    regularPrice: 3.49,
    promoPrice: 2.79,
    unit: 'barquette',
    stock: 22,
  },
  {
    sku: 'COM-200G',
    barcode: '3250390987654',
    designation: 'Fromage Comté AOP 24 Mois 200g',
    department: 'Frais',
    category: 'Fromagerie',
    regularPrice: 4.85,
    promoPrice: null,
    unit: 'pièce',
    stock: 18,
  },
  {
    sku: 'BEU-250G',
    barcode: '3250390554433',
    designation: 'Beurre Demi-Sel Moulé Tradition 250g',
    department: 'Frais',
    category: 'Crèmerie',
    regularPrice: 2.25,
    promoPrice: null,
    unit: 'plaquette',
    stock: 30,
  },
];

export const AVAILABLE_TEMPLATES = [
  { id: 'template_38x70', name: 'Étiquette Rayon 38x70 mm', type: 'SHELF', widthMm: 70, heightMm: 38 },
  { id: 'template_promo', name: 'Promo Flash A4 Balisage', type: 'PROMO', widthMm: 210, heightMm: 297 },
  { id: 'template_50x30', name: 'Étiquette Rayon Classique (50x30 mm)', type: 'SHELF', widthMm: 50, heightMm: 30 },
  { id: 'template_70x40_red', name: 'Étiquette Promotionnelle Rouge (70x40 mm)', type: 'PROMO', widthMm: 70, heightMm: 40 },
  { id: 'template_100x60_cash', name: 'Planche Paliers Grossiste Cash & Carry (100x60 mm)', type: 'TIERS', widthMm: 100, heightMm: 60 },
];

export function generateDefaultStationConfig(port = 3000): StationConfig {
  const randomToken = crypto.randomBytes(24).toString('hex');
  const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
  return {
    protocol: 'estudio-pair-v2',
    stationId: `PC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    stationName: 'Poste Caisse & Balisage Principal',
    storeName: 'Hypermarché Central',
    storeId: 'STORE-PARIS-15',
    host: '0.0.0.0',
    port,
    token: randomToken,
    pin: randomPin,
    version: '2.5.0-PROD',
    catalogVersion: '2026.09.26-V1',
    status: 'ready',
  };
}

function loadPersistedState(): PersistedServerState {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        stationConfig: { ...generateDefaultStationConfig(), ...(parsed.stationConfig || {}) },
        registeredDevices: parsed.registeredDevices || {},
        importedTables: Array.isArray(parsed.importedTables) ? parsed.importedTables : [],
        printQueue: Array.isArray(parsed.printQueue) ? parsed.printQueue : [],
        catalogItems:
          Array.isArray(parsed.catalogItems) && parsed.catalogItems.length > 0
            ? parsed.catalogItems
            : DEFAULT_CATALOG,
      };
    }
  } catch (err) {
    console.warn('[Server State] Failed to read state file, initializing fresh state:', err);
  }
  return {
    stationConfig: generateDefaultStationConfig(),
    registeredDevices: {},
    importedTables: [],
    printQueue: [],
    catalogItems: DEFAULT_CATALOG,
  };
}

class ServerStateManager {
  private state: PersistedServerState = loadPersistedState();
  private saveTimeout: NodeJS.Timeout | null = null;

  getState(): PersistedServerState {
    return this.state;
  }

  schedulePersistence() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
      } catch (err) {
        console.error('[Server State] Failed to write state to disk:', err);
      }
    }, 250);
  }
}

export const serverStateManager = new ServerStateManager();
export const serverState = serverStateManager.getState();

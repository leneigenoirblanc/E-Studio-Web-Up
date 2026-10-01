# E-Studio — Architecture de Persistance, Stockage Local et Gestion des Données

## 1. Objectif

E-Studio est une suite logicielle desktop conçue pour la conception, la tarification, l’importation de données produits, l’imposition et l’impression industrielle d’étiquettes de commerce de détail.

L’application doit donc conserver durablement plusieurs catégories de données :

* préférences globales de l'application ;
* données produits ;
* projets et modèles d'étiquettes ;
* formats d'étiquettes ;
* paramètres d'imprimantes ;
* règles de tarification ;
* historiques d'importation ;
* travaux d'impression ;
* journaux et audit ;
* fichiers et ressources associés aux projets.

La persistance ne doit pas être considérée comme un simple mécanisme de sauvegarde de variables TypeScript. Elle doit constituer une **couche d'infrastructure centrale**, indépendante de l'interface utilisateur et utilisée par les différents services métier.

---

# 2. Principe fondamental

Il faut distinguer quatre catégories de données :

| Catégorie                   | Exemple                                    | Stockage recommandé |
| --------------------------- | ------------------------------------------ | ------------------- |
| Configuration / préférences | thème, langue, grille, mode de scan        | Tauri Store / LocalStorage fallback |
| Données métier structurées  | produits, imprimantes, projets, prix       | SQLite / IndexedDB  |
| Documents et ressources     | images, imports Excel, exports PDF, assets | Système de fichiers / Blob Store |
| Données opérationnelles     | jobs d'impression, imports, audit          | SQLite / IndexedDB  |

À cela s'ajoute un cinquième concept qui **ne doit généralement pas être persisté** :

| Catégorie    | Exemple                                                     | Stockage                |
| ------------ | ----------------------------------------------------------- | ----------------------- |
| État runtime | écran courant, loading, modal ouverte, connexion temporaire | mémoire / state manager |

Le principe directeur est donc :

> **Runtime State ≠ Settings ≠ Business Data ≠ Documents/Files.**

---

# 3. Le fait que le build Tauri ne montre qu'un `.exe`

Le fait que le répertoire d'installation semble contenir essentiellement :

```text
E-Studio.exe
```

n'est pas un problème.

Avec Tauri, les données persistantes n'ont pas besoin d'être placées à côté de l'exécutable.

Tauri expose des répertoires applicatifs spécifiques, notamment :

* `appConfigDir()` pour la configuration ;
* `appDataDir()` pour les données de l'application ;
* `appLocalDataDir()` pour les données locales ;
* `appCacheDir()` pour le cache ;
* `appLogDir()` pour les logs.

Ces chemins sont déterminés selon le système d'exploitation et le bundle identifier de l'application.

Cela signifie que l'architecture normale doit être conceptuellement :

```text
PROGRAMME
E-Studio.exe
        │
        │
        └──────────────► Données utilisateur / application
                         │
                         ├── Settings
                         ├── Database
                         ├── Logs
                         ├── Cache
                         └── Application files
```

Le programme et les données utilisateur sont donc découplés.

Cette séparation est souhaitable parce que les données doivent survivre aux mises à jour de l'application.

---

# 4. Architecture de stockage recommandée

L'architecture finale recommandée est :

```text
                         E-STUDIO
                            │
             ┌──────────────┼───────────────┐
             │              │               │
             ▼              ▼               ▼
        Tauri Store       SQLite        Filesystem
             │              │               │
             │              │               │
      Preferences      Business Data     Documents
             │              │               │
             └──────────────┼───────────────┘
                            │
                     Application Services
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
     PricingEngine      TemplateEngine     PrintEngine
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                     Export / Printing
```

---

# 5. Tauri Store : préférences globales

Le plugin Store de Tauri fournit un stockage clé/valeur persistant côté backend. Il est prévu pour conserver des valeurs entre les redémarrages de l'application et stocke son fichier dans le répertoire de données de l'application. Le store peut être chargé, modifié et sauvegardé depuis le frontend ou partagé avec la partie Rust.

Il convient parfaitement aux paramètres relativement petits.

Exemple :

```ts
export interface AppSettings {
  version: number;

  general: {
    language: "fr" | "en";
    theme: "light" | "dark" | "system";
    autosave: boolean;
    autosaveIntervalSeconds: number;
  };

  editor: {
    gridEnabled: boolean;
    gridSizeMm: number;
    snapEnabled: boolean;
    smartGuidesEnabled: boolean;
    showRulers: boolean;
    showBleed: boolean;
  };

  scanner: {
    confirmationMode: "manual" | "automatic";
    soundEnabled: boolean;
    hapticFeedback: boolean;
  };

  pricing: {
    currency: string;
    exchangeRate: number;
  };

  printing: {
    defaultPrinterId: string | null;
    defaultPaperSize: "A4" | "A3" | "LETTER";
    orientation: "portrait" | "landscape";
  };
}
```

Le Store Tauri possède notamment `get`, `set`, `save`, `reset`, `clear` et des mécanismes d'écoute des modifications. Il supporte également l'auto-save avec debounce.

Le Store doit donc être utilisé pour :

```text
Theme
Language
Editor preferences
Grid settings
Snap settings
Smart Guides
Default paper
Default printer
Scanner preferences
User interface preferences
Small application flags
```

Il ne faut pas y placer toute la base métier.

---

# 6. SQLite : cœur des données métier

Le système E-Studio possède des données relationnelles qui nécessitent recherche, filtrage, relations, historique et évolution du schéma.

SQLite doit donc devenir le **data store principal du métier**.

Le plugin SQL officiel de Tauri permet d'utiliser SQLite depuis l'application. La base peut être chargée avec une connexion du type :

```ts
import Database from "@tauri-apps/plugin-sql";

const db = await Database.load("sqlite:estudio.db");
```

Le plugin documente la création de la base si elle n'existe pas et le support des migrations enregistrées côté Rust.

---

# 7. Structure logique de la base

Une première organisation peut être :

```text
estudio.db
│
├── products
├── product_prices
├── product_tiers
│
├── projects
├── templates
├── template_elements
├── label_formats
│
├── printers
├── printer_profiles
│
├── imports
├── import_mappings
├── import_errors
│
├── print_jobs
├── print_job_items
│
├── pricing_rules
├── currencies
│
└── audit_events
```

Cette structure est volontairement séparée par domaine.

---

# 8. Produits

Le catalogue produit constitue l'une des principales sources de données.

Exemple conceptuel :

```ts
interface Product {
  id: string;
  barcode?: string;
  partNumber?: string;
  itemName: string;

  sellingPrice?: number;
  promoPrice?: number;
  referencePrice?: number;

  unitWeight?: number;
  unitWeightUnit?: "kg" | "g" | "l" | "cl" | "ml" | "piece";

  upTo?: number;
  tiers?: ProductTier[];

  currency?: string;

  createdAt: string;
  updatedAt: string;
}
```

Les produits doivent être conservés dans SQLite et non dans les préférences globales.

---

# 9. Séparation Template / Product Data

C'est une décision architecturale majeure pour E-Studio.

Un template ne doit pas contenir directement :

```text
"Lait Nido 400g"
"2 500 FCFA"
"1234567890123"
```

Il doit contenir des **bindings** métier.

Exemple :

```ts
{
  type: "text",
  binding: "ITEMNAME"
}
```

```ts
{
  type: "price",
  binding: "SELLING_PRICE"
}
```

```ts
{
  type: "barcode",
  binding: "PRODUCT_SCAN"
}
```

Le pipeline devient donc :

```text
Product Data
      │
      ▼
PricingEngine
      │
      ▼
Normalized Label Data
      │
      ▼
Template
      │
      ▼
Renderer
      │
      ├── PDF
      ├── ZPL
      └── PPTX
```

Cette séparation permet à un même template d'être utilisé sur des milliers de produits.

---

# 10. Persistance du modèle WYSIWYG

Le canvas ne doit pas être sauvegardé sous forme d'objets appartenant directement à une librairie graphique.

E-Studio doit posséder son propre modèle de document.

Exemple :

```ts
interface LabelDocument {
  id: string;
  name: string;

  widthMm: number;
  heightMm: number;

  margins: {
    innerMm: number;
    outerMm: number;
    bleedMm: number;
  };

  elements: LabelElement[];

  createdAt: string;
  updatedAt: string;
}
```

Puis :

```ts
type LabelElement =
  | TextElement
  | RectangleElement
  | EllipseElement
  | BarcodeElement
  | ImageElement
  | CircularTextElement
  | ProtectionZoneElement;
```

Chaque objet doit être représenté dans les unités métier réelles :

```text
x_mm
y_mm
width_mm
height_mm
rotation
font
color
binding
barcode settings
etc.
```

La librairie Canvas est donc un **renderer/editor**, et non la source de vérité métier.

---

# 11. Imprimantes

Les imprimantes doivent être persistées dans SQLite.

Exemple :

```ts
interface Printer {
  id: string;

  name: string;

  type:
    | "zebra"
    | "citizen"
    | "tsc"
    | "windows"
    | "pdf";

  protocol:
    | "zpl"
    | "raw"
    | "windows"
    | "pdf";

  connection: {
    type: "network" | "usb" | "windows" | "file";

    host?: string;
    port?: number;
  };

  capabilities?: {
    dpi?: number;
    thermal?: boolean;
    color?: boolean;
    maxWidthMm?: number;
  };

  isDefault: boolean;
}
```

Cela permettra d'avoir un véritable catalogue d'imprimantes plutôt que des paramètres codés en dur.

---

# 12. Importation Excel / CSV

Le pipeline d'importation doit lui aussi devenir persistant.

E-Studio doit savoir :

```text
Quel fichier ?
Quand ?
Combien de lignes ?
Quel mapping ?
Combien d'erreurs ?
Quel statut ?
```

Exemple :

```ts
interface ImportJob {
  id: string;

  fileName: string;
  fileType: "xlsx" | "xlsm" | "csv";

  startedAt: string;
  completedAt?: string;

  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed";

  totalRows: number;
  importedRows: number;
  errorRows: number;

  mappingId?: string;
}
```

Cela permet de développer ensuite une vraie interface :

```text
Import History

products.xlsx
1 842 rows
1 837 imported
5 errors
Completed
```

---

# 13. Print Jobs

Le spooler ne doit pas conserver uniquement ses données en mémoire.

Un travail d'impression peut être volumineux et long :

```text
2 400 labels
```

L'application doit donc pouvoir survivre à un redémarrage sans perdre complètement son historique.

Exemple :

```ts
interface PrintJob {
  id: string;

  projectId?: string;
  templateId?: string;
  printerId: string;

  status:
    | "pending"
    | "processing"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";

  totalLabels: number;
  printedLabels: number;
  failedLabels: number;

  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
```

Le système pourra ainsi afficher :

```text
Printing
1 450 / 2 400
```

et conserver le résultat.

---

# 14. Audit Trail

Le système d'audit doit également être persistant.

Exemple :

```ts
interface AuditEvent {
  id: string;

  timestamp: string;

  action: string;

  entityType?: string;
  entityId?: string;

  metadata?: Record<string, unknown>;
}
```

Exemples :

```text
PRODUCT_IMPORT
PRODUCT_UPDATE
TEMPLATE_CREATE
TEMPLATE_UPDATE
PRINTER_ADDED
PRINTER_REMOVED
PRINT_START
PRINT_COMPLETE
PRINT_FAILED
```

Cela crée une véritable traçabilité opérationnelle.

---

# 15. Système de fichiers

SQLite ne doit pas contenir tout le contenu binaire de l'application.

Le filesystem est mieux adapté aux fichiers tels que :

```text
Calibration images
Excel imports
CSV imports
PDF exports
PPTX exports
Generated assets
Large images
Backup archives
Project assets
```

Tauri fournit une API filesystem avec des répertoires de base comme `$APPDATA`, `$APPLOCALDATA`, `$APPCACHE` et `$APPLOG`, ainsi que des mécanismes de permissions/scopes permettant de limiter les chemins accessibles.

---

# 16. Arborescence de données recommandée

Conceptuellement :

```text
E-Studio Application Data
│
├── database/
│   └── estudio.db
│
├── settings/
│   └── settings.json
│
├── templates/
│
├── projects/
│
├── imports/
│
├── exports/
│
├── assets/
│   ├── images/
│   └── calibration/
│
├── backups/
│
├── logs/
│
└── cache/
```

Cette arborescence représente les données de l'application, pas nécessairement les chemins littéraux imposés à chaque système d'exploitation.

Tauri fournit des chemins d'application adaptés au système et peut également permettre des overrides explicites.

---

# 17. Données utilisateur vs données internes

Il est préférable de séparer :

### Données internes de l'application

```text
Database
Settings
Logs
Cache
Internal indexes
Print history
Audit
```

### Documents utilisateur

```text
Projects
Templates
Imports
Exports
Assets
```

On peut par exemple exposer dans l'interface :

```text
Documents/E-Studio/
│
├── Projects/
├── Templates/
├── Imports/
└── Exports/
```

alors que le database et les paramètres restent gérés automatiquement.

---

# 18. Ne pas mettre les fichiers à côté de l'exécutable

Il faut éviter une structure du type :

```text
E-Studio/
├── E-Studio.exe
├── database.sqlite
├── settings.json
├── logs/
├── templates/
└── imports/
```

pour une installation normale.

Cela crée une dépendance directe entre l'installation et les données utilisateur.

Il vaut mieux :

```text
Program / Installation
└── E-Studio.exe

Application Data
└── E-Studio
    ├── database
    ├── settings
    ├── logs
    └── cache

User Documents
└── E-Studio
    ├── Projects
    ├── Templates
    ├── Imports
    └── Exports
```

L'intérêt principal est que les données survivent aux mises à jour du logiciel.

---

# 19. Cas particulier : application portable

Tauri permet aussi de modifier les répertoires applicatifs avec `appDirectoriesOverride`. La documentation indique explicitement que cela peut servir aux applications portables qui souhaitent conserver leurs données à côté de l'exécutable.

Donc deux modes sont techniquement possibles :

### Mode standard

```text
E-Studio.exe
      │
      └──► OS Application Data
```

### Mode portable éventuel

```text
E-Studio/
├── E-Studio.exe
├── data/
├── database/
├── settings/
└── logs/
```

Pour une installation commerciale normale, le **mode standard** est le choix recommandé.

Le mode portable peut être proposé ultérieurement comme fonctionnalité spécifique.

---

# 20. Architecture logicielle

Le frontend ne doit pas communiquer directement avec SQLite partout dans le code.

L'architecture recommandée est :

```text
┌───────────────────────────────────────────┐
│                   UI                      │
│           React / TypeScript              │
└─────────────────────┬─────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────┐
│             Application Layer             │
│                                           │
│ ProductService                            │
│ TemplateService                           │
│ ProjectService                            │
│ PrinterService                            │
│ ImportService                             │
│ PricingService                            │
│ PrintService                              │
│ AuditService                              │
└─────────────────────┬─────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────┐
│          Infrastructure Layer             │
│                                           │
│ SettingsRepository                        │
│ ProductRepository                         │
│ TemplateRepository                        │
│ ProjectRepository                          │
│ PrinterRepository                          │
│ PrintJobRepository                         │
│ ImportRepository                           │
│ AuditRepository                            │
└─────────────────────┬─────────────────────┘
                      │
             ┌────────┼────────┐
             ▼        ▼        ▼
          Store    SQLite   Filesystem
             │        │        │
             └────────┼────────┘
                      ▼
                    Tauri
```

---

# 21. Repositories

Chaque domaine doit avoir son interface de persistance.

Exemple :

```ts
interface ProductRepository {
  findByBarcode(barcode: string): Promise<Product | null>;

  findAll(): Promise<Product[]>;

  save(product: Product): Promise<void>;

  update(product: Product): Promise<void>;

  delete(id: string): Promise<void>;
}
```

Le service métier utilise cette abstraction :

```ts
class ProductService {
  constructor(
    private readonly repository: ProductRepository
  ) {}

  async findByBarcode(barcode: string) {
    return this.repository.findByBarcode(barcode);
  }
}
```

La UI ne sait donc pas si le produit vient de SQLite, d'un cache ou d'une autre implémentation.

---

# 22. Application Context

E-Studio peut disposer d'un contexte applicatif central :

```ts
interface EStudioContext {
  settings: SettingsService;

  products: ProductService;

  templates: TemplateService;

  projects: ProjectService;

  printers: PrinterService;

  imports: ImportService;

  pricing: PricingService;

  printing: PrintService;

  audit: AuditService;
}
```

Les écrans utilisent alors :

```ts
const product = await app.products.findByBarcode(barcode);

const pricing = await app.pricing.calculate(product);

await app.printing.createJob({
  product,
  templateId,
  printerId
});
```

Cela évite que des dizaines de composants UI effectuent chacun leurs propres opérations de stockage.

---

# 23. État runtime

Tout ne doit pas être persisté.

Exemples :

```text
Current route
Current modal
Loading state
Current selection
Temporary drag state
Canvas interaction state
Mouse coordinates
Temporary notifications
Current scanner session
Temporary connection handshake
```

Ces informations appartiennent au state manager de l'application.

Par exemple :

```ts
interface RuntimeState {
  currentProjectId?: string;
  currentTemplateId?: string;

  activePrinterId?: string;

  isScanning: boolean;
  isPrinting: boolean;

  connectionStatus:
    | "disconnected"
    | "connecting"
    | "connected";
}
```

Ce state peut être en mémoire et ne doit pas devenir automatiquement une donnée persistante.

---

# 24. Migrations de données

La base doit être versionnée.

Exemple :

```text
Migration 001
    │
    ├── products
    ├── printers
    └── projects
         │
         ▼
Migration 002
    │
    └── pricing rules
         │
         ▼
Migration 003
    │
    └── print jobs
```

Lors du démarrage :

```text
Start
  │
  ▼
Open Database
  │
  ▼
Check Schema Version
  │
  ▼
Run Pending Migrations
  │
  ▼
Initialize Services
  │
  ▼
Start UI
```

Cela évite que les nouvelles versions d'E-Studio cassent les installations existantes.

---

# 25. Versionnement des Settings

Les settings doivent également être versionnés.

Exemple :

```ts
interface PersistedSettings {
  version: number;
  data: AppSettings;
}
```

Puis :

```text
v1
 │
 ▼
migrateV1ToV2()
 │
 ▼
v2
 │
 ▼
migrateV2ToV3()
 │
 ▼
Current Version
```

Il faut également avoir des valeurs par défaut :

```ts
const DEFAULT_SETTINGS: AppSettings = {
  version: 1,

  general: {
    language: "fr",
    theme: "system",
    autosave: true,
    autosaveIntervalSeconds: 30
  },

  editor: {
    gridEnabled: true,
    gridSizeMm: 5,
    snapEnabled: true,
    smartGuidesEnabled: true,
    showRulers: true,
    showBleed: true
  },

  scanner: {
    confirmationMode: "automatic",
    soundEnabled: true,
    hapticFeedback: true
  },

  pricing: {
    currency: "XAF",
    exchangeRate: 1
  },

  printing: {
    defaultPrinterId: null,
    defaultPaperSize: "A4",
    orientation: "portrait"
  }
};
```

La combinaison :

```text
DEFAULT_SETTINGS + persisted settings
```

permet d'ajouter de nouveaux paramètres sans casser une ancienne installation.

---

# 26. Démarrage d'E-Studio

Le démarrage devrait suivre une séquence contrôlée :

```text
E-Studio Launch
      │
      ▼
Resolve Application Paths
      │
      ▼
Create Required Directories
      │
      ▼
Load Settings
      │
      ▼
Initialize SQLite
      │
      ▼
Run Database Migrations
      │
      ▼
Initialize Repositories
      │
      ▼
Initialize Application Services
      │
      ▼
Restore Safe Runtime State
      │
      ▼
Start UI
```

Les dossiers d'application peuvent être créés au runtime ; le plugin filesystem de Tauri documente notamment la création et l'accès aux répertoires applicatifs ainsi que les permissions associées.

---

# 27. Sauvegarde et restauration

Une fonction **Backup / Restore** doit faire partie de la conception de base.

Le backup devrait pouvoir inclure :

```text
✓ Products
✓ Templates
✓ Projects
✓ Printers
✓ Label formats
✓ Pricing rules
✓ Settings
✓ Import mappings
✓ Audit history
✓ Important assets
```

Exemple de fonctionnalité utilisateur :

```text
Settings
└── Data & Storage

    [ Create Backup ]

    Last backup:
    30 September 2026

    [ Restore Backup ]

    [ Open Data Folder ]
```

Un format dédié peut être utilisé :

```text
E-Studio-Backup-2026-09-30.estudio
```

Il pourrait s'agir d'une archive contenant :

```text
manifest.json
database.sqlite
settings.json
assets/
projects/
templates/
```

Le `manifest.json` peut contenir :

```text
E-Studio version
Schema version
Backup date
Application version
Backup format version
```

---

# 28. Résilience et récupération

La persistance doit également gérer les problèmes réels :

```text
Application crash
Power loss
Interrupted print
Corrupted file
Incomplete import
Failed migration
Database lock
Printer unavailable
```

Une règle importante est :

> Une opération métier critique doit avoir un état persistant permettant de déterminer ce qui s'est réellement produit.

Par exemple :

```text
PRINTING
   │
   ├── pending
   ├── processing
   ├── paused
   ├── completed
   ├── failed
   └── cancelled
```

et non simplement :

```ts
isPrinting = true;
```

---

# 29. Architecture finale recommandée pour E-Studio

La vue globale devient :

```text
                         E-STUDIO
                            │
                ┌───────────┴───────────┐
                │                       │
          Presentation              Application
                │                       │
          TypeScript UI             Services
                │                       │
                └───────────┬───────────┘
                            │
                      Domain Models
                            │
                ┌───────────┴────────────┐
                │                        │
          Infrastructure            Engines
                │                        │
       ┌────────┼────────┐       ┌───────┼────────┐
       │        │        │       │       │        │
    Store     SQLite   Files   Pricing  Layout   Print
       │        │        │       │       │        │
       └────────┼────────┘       └───────┼────────┘
                │                        │
                └───────────┬────────────┘
                            │
                           Tauri
                            │
                ┌───────────┼─────────────┐
                │           │             │
             OS paths    Filesystem    Native APIs
```

---

# 30. Résumé des décisions architecturales

### Décision 1 — Tauri Store
Utiliser le Store pour les préférences globales et les petites données de configuration.

### Décision 2 — SQLite
Utiliser SQLite pour les données métier structurées et les données opérationnelles.

### Décision 3 — Filesystem
Utiliser le système de fichiers pour les documents, assets, imports, exports, backups et autres contenus volumineux.

### Décision 4 — Repository Pattern
Les services métier ne doivent pas accéder directement au mécanisme de stockage.

### Décision 5 — Domain Model
Le modèle métier d'E-Studio doit être indépendant des librairies UI/canvas.

### Décision 6 — Template Binding
Les templates doivent référencer des champs métier plutôt que contenir des données produits fixes.

### Décision 7 — Migrations
La base et les settings doivent être versionnés et migrables.

### Décision 8 — Application Data ≠ Installation
Les données utilisateurs ne doivent normalement pas être stockées à côté de `E-Studio.exe`.

### Décision 9 — Backup/Restore
La sauvegarde et la restauration doivent être prévues dès la conception.

### Décision 10 — Runtime State séparé
L'état temporaire de l'application doit rester indépendant des données persistantes.

---

# 31. Architecture cible en une seule vue

```text
E-STUDIO.EXE
│
├─────────────────────────────────────────────┐
│                                             │
│              APPLICATION                    │
│                                             │
│  UI                                         │
│   ↓                                         │
│  ViewModels / State                         │
│   ↓                                         │
│  Application Services                       │
│   ↓                                         │
│  Domain / Engines                            │
│   ↓                                         │
│  Repositories / Adapters                    │
│                                             │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
               PERSISTENCE LAYER
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
  Tauri Store       SQLite          Filesystem
       │               │                │
       │               │                │
  Settings        Products         Calibration
  Preferences     Projects         Imports
  UI config       Templates        Exports
  Defaults        Printers         Assets
                  Print Jobs        Backups
                  Imports           Logs
                  Audit
                       │
                       ▼
               OS APPLICATION DATA
                       │
             survives app updates
```

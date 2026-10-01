# E-Studio — Suite Professionnelle de Conception & Production Industrielle d'Étiquettes Retail

[![Tauri v2](https://img.shields.io/badge/Tauri-v2.12.0-blue.svg)](https://tauri.app)
[![React 18](https://img.shields.io/badge/React-18.3.1-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8.svg)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**E-Studio** est une suite logicielle tout-en-un de nouvelle génération dédiée à la conception vectorielle assistée, la tarification dynamique et l'impression en masse d'étiquettes de prix pour le commerce de détail, la grande distribution et la vente en gros / demi-gros.

L'application est disponible en deux modes de déploiement partageant le même socle de fonctionnalités :
1. **Mode Full-Web Cloud** : Interface web réactive en React 18 / TypeScript / Vite / Tailwind CSS avec serveur backend Express 5 (Node.js).
2. **Mode Desktop Natif Windows** : Application de bureau ultra-légère et performante propulsée par **Tauri v2** et **Rust**, compilant vers des installeurs autonomes Windows (`.exe` NSIS et `.msi`).

---

## Sommaire

1. [Vue d'Ensemble & Objectifs](#1-vue-densemble--objectifs)
2. [Comment Fonctionne le Programme (Architecture & Mécanismes)](#2-comment-fonctionne-le-programme-architecture--mécanismes)
   - [2.1 Le Pipeline de Conception Graphique WYSIWYG](#21-le-pipeline-de-conception-graphique-wysiwyg)
   - [2.2 Le Moteur Métier Retail & Tarification (PricingEngine)](#22-le-moteur-métier-retail--tarification-pricingengine)
   - [2.3 Le Pipeline de Données : Import, Normalisation & Mapping](#23-le-pipeline-de-données--import-normalisation--mapping)
   - [2.4 L'Algorithme Mathématique d'Imposition sur Planches](#24-lalgorithme-mathématique-dimposition-sur-planches)
   - [2.5 Le Moteur Multi-Formats de Sortie (PDF, ZPL, PPTX, JSON)](#25-le-moteur-multi-formats-de-sortie-pdf-zpl-pptx-json)
3. [Modules & Studios Fonctionnels](#3-modules--studios-fonctionnels)
   - [3.1 Bibliothèque & Hub de Gabarits](#31-bibliothèque--hub-de-gabarits)
   - [3.2 Éditeur Vectoriel Haute Précision](#32-éditeur-vectoriel-haute-précision)
   - [3.3 Espace de Génération & Tableur Interactif](#33-espace-de-génération--tableur-interactif)
   - [3.4 Studio Paliers Tarifaires Dégressifs (Grossiste / Demi-Gros)](#34-studio-paliers-tarifaires-dégressifs-grossiste--demi-gros)
   - [3.5 Multi-Slot Signage Studio (Balisage Têtes de Gondole & Kakémonos)](#35-multi-slot-signage-studio-balisage-têtes-de-gondole--kakémonos)
   - [3.6 Diagnostic Heatmap & Contrôle Qualité Thermique](#36-diagnostic-heatmap--contrôle-qualité-thermique)
   - [3.7 Spooler d'Impression Réseau & Découverte Matérielle](#37-spooler-dimpression-réseau--découverte-matérielle)
   - [3.8 Journal d'Audit & Traçabilité Réglementaire](#38-journal-daudit--traçabilité-réglementaire)
   - [3.9 Plateforme d'Orchestration & Règles Hybrides](#39-plateforme-dorchestration--règles-hybrides-hybrid-rules-platform)
   - [3.10 Centre de Résolution des Données & Catalogue de Référence](#310-centre-de-résolution-des-données--catalogue-de-référence)
   - [3.11 Workflow Officiel en 5 Étapes & Paquets Reproductibles (.estudio-job)](#311-workflow-officiel-en-5-étapes--paquets-reproductibles-estudio-job)
   - [3.12 Modèle des Éléments Canvas V2 & Typographie par Slots](#312-modèle-des-éléments-canvas-v2--typographie-par-slots)
4. [Spécification du Format de Gabarit (.json)](#4-spécification-du-format-de-gabarit-json)
5. [Raccourcis Clavier](#5-raccourcis-clavier)
6. [Architecture de Persistance & Stockage Local](#6-architecture-de-persistance--stockage-local)
7. [Installation, Démarrage & Compilation](#7-installation-démarrage--compilation)
   - [7.1 Exécution en Mode Web](#71-exécution-en-mode-web)
   - [7.2 Exécution & Compilation Desktop Windows (Tauri v2)](#72-exécution--compilation-desktop-windows-tauri-v2)
   - [7.3 Intégration Continue (GitHub Actions CI/CD)](#73-intégration-continue-github-actions-cicd)

---

## 1. Vue d'Ensemble & Objectifs

Dans le commerce moderne et la distribution omnicanale, l'étiquetage de prix doit répondre à des contraintes opérationnelles et juridiques strictes :
- **Précision géométrique millimétrique** pour s'adapter exactement aux réglettes de linéaires, étiquettes adhésives découpées ou rouleaux thermiques.
- **Conformité légale** : affichage obligatoire du prix unitaire (au kilogramme ou au litre), origine, mentions de danger/recyclage, décomposition de la taxe.
- **Dynamisme promotionnel** : calcul automatique des remises en pourcentage (`-XX%`), affichage de prix barrés conditionnels, dates d'opération promotionnelle.
- **Gestion de volumes massifs** : capacité d'importer des catalogues de milliers d'articles depuis un ERP ou un tableur (Excel, CSV) et de générer instantanément des planches d'impression optimisées.
- **Réduction du gaspillage** : possibilité de démarrer une impression sur une étiquette spécifique d'une planche déjà entamée.

**E-Studio** réconcilie la flexibilité d'un logiciel de publication assistée par ordinateur (PAO) avec l'automatisation d'un moteur de production industrielle.

---

## 2. Comment Fonctionne le Programme (Architecture & Mécanismes)

Le fonctionnement d'E-Studio repose sur 5 piliers interconnectés qui forment une chaîne de traitement complète :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           1. CONCEPTION GABARIT                             │
│  Éditeur WYSIWYG vectoriel, Canvas millimétrique, Règles X/Y, Smart Guides  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         2. LIAISON & RÈGLES MÉTIER                          │
│     Binding Keys (ITEMNAME, SELLING_PRICE...), Conditions d'affichage,      │
│            Calculateur légal Prix/kg/L, Détection Promo & Devises           │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         3. INGESTION DE DONNÉES                             │
│     Fichiers Excel (.xlsx) / CSV, Dictionnaire de Mapping intelligent,      │
│          Studio de nettoyage & Tableur d'appoint intégré                    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    4. MOTEUR D'IMPOSITION MATHÉMATIQUE                      │
│      Calcul de poses (A4, A3, Letter), Espacements X/Y personnalisés,       │
│      Start Offset Slot (zéro déchet de planches), Repères de coupe          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   5. PRODUCTION & MULTI-EXPORT VECTORIEL                    │
│   PDF Haute Définition, Code Thermique ZPL II, Diapositives PPTX éditables, │
│            Spooler d'impression réseau & Audit Trail traçable               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Le Pipeline de Conception Graphique WYSIWYG
1. **Échelle millimétrique absolue** : Chaque objet (`x_mm`, `y_mm`, `w_mm`, `h_mm`) est calculé avec un facteur d'échelle exact millimètre/pixel.
2. **Gestion des marges de sécurité** :
   - *Inner margins* : zone d'impression utile garantie hors des bords de découpe physique.
   - *Outer margins / Bleed* : fond perdu pour massicotage pleine page sans liseré blanc.
3. **Moteur d'aide au positionnement** :
   - Règles graduées interactives (`CanvasRulers`) avec indicateur de position du curseur en temps réel et HUD flottant.
   - Grille magnétique configurable (`0.5 mm` à `10 mm`).
   - Guides intelligents dynamiques (`Smart Guides`) pour l'alignement bord à bord et l'équidistance entre éléments.
4. **Calque de calibration d'arrière-plan** : Chargement possible d'un scan ou d'une photo d'une étiquette physique existante (avec réglette d'opacité) pour rétro-concevoir un gabarit avec une précision au quart de millimètre.
5. **Pile d'historique Undo / Redo** : Mémorisation exhaustive des états du canvas avec indicateur visuel de positionnement.
6. **Moteur Global "Rechercher et Remplacer" (`Ctrl+F`)** : Permet de substituer en un instant un texte, une famille de police ou un code couleur hexadécimal sur l'ensemble du gabarit.

### 2.2 Le Moteur Métier Retail & Tarification (PricingEngine)
Le `PricingEngine` prend en charge toute l'intelligence comptable et légale du balisage :
- **Calcul automatique du Prix au Kilo / au Litre** :
  $$\text{Prix Unitaire} = \frac{\text{Prix}}{\text{Poids ou Volume}}\times\text{Facteur d'Unité}$$
  Prise en charge des unités standard (`kg`, `g`, `mg`, `l`, `cl`, `ml`, `pièce`).
- **Calcul dynamique de la Remise** :
  $$\text{Taux Remise} = \text{arrondi}\left(\frac{\text{PRIX\_VENTE} - \text{PRIX\_PROMO}}{\text{PRIX\_VENTE}}\times 100\right)\%$$
- **Règles d'affichage conditionnel** :
  - `has_promo` : le bandeau promotionnel et le prix d'origine barré ne s'affichent que si une promotion réelle existe.
  - `has_barcode` : masquage élégant de l'espace code-barres si la référence n'en comporte pas.
  - `has_tiers` : masquage automatique du tableau de remises dégressives si le produit est vendu exclusivement à l'unité.
  - Règles par opérateur (`>`, `<`, `==`, `non vide`).
- **Conversion Multi-Devises** : Application instantanée de taux de conversion (ex: FCFA <-> EUR) pour les marchés internationaux.

### 2.3 Le Pipeline de Données : Résolution, Enrichissement & Jeu de Travail
- **Séparation Fondamentale Catalogue de Référence vs Dataset de Production** :
  Le fichier importé constitue le *jeu de travail* de la production du jour. La base locale agit comme *catalogue de référence et d'enrichissement*. Seul le jeu résolu est envoyé à la génération d'étiquettes, évitant de générer l'intégralité de la base de référence (voir [`DATA_RESOLUTION_ARCHITECTURE.md`](DATA_RESOLUTION_ARCHITECTURE.md)).
- **Moteur de Résolution des Données (`ResolutionEngine`)** :
  - Correspondance par scan code, EAN principal, alias historiques et numéros de pièce scopés (`SUPPLIER_PARTNO` avec namespace).
  - Détection automatique et arbitrage des divergences (conflits d'attributs).
  - Traçabilité de provenance certifiée pour chaque attribut (`[REFERENCE]`, `[IMPORT]`, `[USER]`, `[RULE]`, `[COMPUTED]`).
  - Figement du dataset (`freezeDataset`) garantissant l'immuabilité pendant toute la phase d'impression.
- **Analyseurs de fichiers** : Import direct de classeurs Microsoft Excel (`.xlsx`, `.xlsm`) via la bibliothèque `xlsx`, et de fichiers CSV avec détection automatique de la ligne d'en-tête, du délimiteur (virgule, point-virgule, tabulation) et du codage de caractères.
- **Mapping heuristique assisté par Regex** :
  Le dictionnaire de correspondance identifie automatiquement les colonnes de votre fichier vers les clés canoniques du système :
  - `ITEMNAME` $\leftarrow$ `LIBELLE`, `DESIGNATION`, `NOM_ARTICLE`, `DESCRIPTION`
  - `SELLING_PRICE` $\leftarrow$ `PRIX_VENTE`, `PV_TTC`, `TARIF`, `PRICE`
  - `PROMOPRICE` $\leftarrow$ `PRIX_PROMO`, `PV_PROMO`, `PRIX_SOLDE`, `DISCOUNT_PRICE`
  - `PRODUCT_SCAN` $\leftarrow$ `EAN`, `EAN13`, `CODE_BARRE`, `BARCODE`, `UPC`
  - `UNIT_WEIGHT` $\leftarrow$ `POIDS`, `CONTENANCE`, `VOLUME`, `NET_WEIGHT`
- **Studio de Nettoyage de Données (`DataCleaningStudioModal`)** :
  Correction automatique des espaces superflus, mise en majuscule des désignations, validation de conformité des clés de contrôle EAN-13, et détection des valeurs manquantes.
- **Tableur d'appoint intégré** : Édition immédiate des lignes directement dans l'application sans devoir rouvrir Excel.

### 2.4 L'Algorithme Mathématique d'Imposition sur Planches
Le moteur calcule la disposition géométrique optimale pour tout format de feuille (A4, A3, Letter en orientation portrait ou paysage) :
- **Calcul du nombre de poses** :
  $$N_X = \left\lfloor\frac{L_{\text{feuille}} - \text{marge}_G - \text{marge}_D + \text{gap}_X}{L_{\text{étiquette}} + \text{gap}_X}\right\rfloor$$
  $$N_Y = \left\lfloor\frac{H_{\text{feuille}} - \text{marge}_H - \text{marge}_B + \text{gap}_Y}{H_{\text{étiquette}} + \text{gap}_Y}\right\rfloor$$
- **Centrage optique automatique** : Les marges restantes sont réparties équitablement pour garantir un centrage parfait de la planche.
- **Espacements X et Y indépendants (`gap_x_mm`, `gap_y_mm`)** : Indispensable pour s'ajuster aux planches d'étiquettes prédécoupées (ex: marques Avery, Agipa, Herma) dont les séparations horizontales et verticales diffèrent souvent.
- **Fonctionnalité "Start Offset Slot" (Anti-gaspillage)** :
  Permet de définir à partir de quel emplacement (case $1$ à $N$) démarrer l'impression sur la première feuille. Une planche d'autocollants entamée peut ainsi être réutilisée jusqu'au dernier sticker.
- **Repères de coupe (*Crop Marks*) vectoriels** : Tracé automatique de repères aux 4 coins de chaque pose pour faciliter la découpe manuelle ou au massicot.

### 2.5 Le Moteur Multi-Formats de Sortie (PDF, ZPL, PPTX, JSON)
- **PDF Vectoriel Haute Fidélité (`jspdf`)** : Génération directe côté client de planches d'étiquettes en vraie grandeur avec typographies vectorisées, tracés de bordures nets et codes-barres 100% lisibles par des douchettes laser.
- **Zebra Programming Language (ZPL II)** : Traduction géométrique du gabarit en commandes natives ZPL (`^XA`, `^FO`, `^FD`, `^BY`, `^BC`, etc.) pour l'impression thermique directe ou transfert thermique sur imprimantes d'étiquettes industrielles (Zebra, Citizen, TSC, Honeywell).
- **Microsoft PowerPoint (`.pptx` via `pptxgenjs`)** : Exportation de chaque étiquette ou planche sous forme de formes et zones de texte éditables dans PowerPoint pour présentations d'enseignes ou validation marketing.
- **Export / Import JSON** : Fichiers légers, auditables, versionnés et stockables dans un système de contrôle de versions (Git) ou une base de données.

---

## 3. Modules & Studios Fonctionnels

### 3.1 Bibliothèque & Hub de Gabarits
- Catalogue de gabarits préenregistrés (Avery standard 100x50 mm, promo choc 70x35 mm, balisage XL 140x70 mm, kakémonos tête de gondole).
- Assistant de création pas à pas (`NewGabaritWizard`) avec réglage guidé des dimensions et marges.
- Clônage, duplication et téléchargement de modèles en un clic.

### 3.2 Éditeur Vectoriel Haute Précision
- Outils graphiques complets :
  - **Textes simples et multilignes** avec enrichissement typographique (gras, italique, souligné, barré, encadrement, alignements horizontaux et verticaux).
  - **Gestionnaire de Polices (`FontManagerModal`)** : sélection de polices système et typographies spécialisées.
  - **Formes vectorielles** : rectangles avec rayons d'arrondis (*border-radius*), bordures de couleurs et fonds personnalisés.
  - **Ellipses et médaillons promotionnels**.
  - **Lignes de séparation** horizontales ou obliques.
  - **Codes-barres 1D vectoriels** : génération native EAN-13 (avec calcul et validation automatique du 13e chiffre de contrôle) et Code 128 (haute densité alphanumérique).
  - **QR Codes 2D vectoriels** : liens web vers fiches techniques, informations allergènes ou traçabilité.
  - **Texte courbé / circulaire (`CurvedTextRenderer`)** : texte suivant un arc ou un cercle pour sceaux de qualité, médailles ou macarons d'appellation.
  - **Zones de protection anti-impression (`restricted_area`)** : délimitation visuelle hachurée pour interdire l'impression sur des zones mécaniques (perforations d'étagères, capteurs optiques).
  - **Pictogrammes normalisés (`PictogramRenderer`)** : logos Origine France, Triman recyclage, label Bio AB, pictogrammes de danger, labels énergétiques.

### 3.3 Espace de Génération & Tableur Interactif
- Navigation d'aperçu dynamique article par article avec rendu instantané à l'échelle.
- Filtrage rapide et pagination pour traiter de grands volumes de données.
- Édition directe des données depuis l'interface avec recalcul en temps réel des étiquettes associées.

### 3.4 Studio Paliers Tarifaires Dégressifs (Grossiste / Demi-Gros)
- Composant spécialisé `tier_price` permettant de présenter les remises par quantité (ex: *1 carton = 1 500 F*, *5 cartons = 1 350 F*, *10 cartons = 1 200 F*).
- Idéal pour le commerce B2B, le libre-service de gros (cash & carry) et les grossistes alimentaires ou de matériaux.

### 3.5 Multi-Slot Signage Studio (Balisage Têtes de Gondole & Kakémonos)
- Conception d'affiches multi-produits (de 2 à 8 cases par affiche) pour valoriser des offres groupées ou des opérations thématiques.
- Module de clustering automatique (`ProductClusteringStudio`) regroupant les articles par marque, catégorie ou fournisseur.

### 3.6 Diagnostic Heatmap & Contrôle Qualité Thermique
- Analyse visuelle en fausses couleurs (`DiagnosticHeatmapOverlay`) de la densité d'encre ou de chauffe thermique.
- Prévention de la surchauffe des têtes d'impression thermique Zebra et détection précoce des zones saturées.

### 3.7 Spooler d'Impression Réseau & Découverte Matérielle
- Serveur backend Express avec routeurs de découverte d'imprimantes réseau (TCP/IP port 9100 Raw, USB et CUPS).
- File d'attente centralisée de travaux d'impression (`BatchSpoolerModal`, `PrintJobsStudio`) avec reprise sur incident et suivi du statut.

### 3.8 Journal d'Audit & Traçabilité Réglementaire
- Modal `AuditTrailModal` assurant l'historisation de chaque création, modification, import de données et lancement d'impression pour conformité avec les processus qualité d'entreprise.

### 3.9 Plateforme d'Orchestration & Règles Hybrides (Hybrid Rules Platform)
E-Studio intègre une couche d'orchestration intelligente agissant entre l'ingestion de données et la production d'étiquettes :
- **17 Points d'Accroche en Cycle de Vie (`RuleTrigger`)** : `BEFORE_IMPORT`, `AFTER_IMPORT`, `BEFORE_NORMALIZATION`, `BEFORE_PRICING`, `BEFORE_TEMPLATE_RESOLUTION`, `BEFORE_RENDER`, `BEFORE_IMPOSITION`, `BEFORE_EXPORT`, `BEFORE_PRINT`, `ON_PRINT_ERROR`, etc.
- **Deux Niveaux d'Écriture** :
  - **Niveau A — GUI Déclaratif (AST)** : Constructeur visuel pour les utilisateurs métier (`WHEN ... AND ... THEN ...`) sans code.
  - **Niveau B — Script Sandboxé** : JavaScript isolé (sans accès à `fs`, `sqlite`, `fetch`, `process` ou `tauri`), surveillé par un watchdog CPU (max 250 ms) avec API `EStudioScriptAPIv1` (`ctx.product`, `ctx.pricing`, `ctx.label`, `ctx.template`, `ctx.print`, `ctx.helpers`).
- **Modèle Read ➔ Decide ➔ Mutate** : Émission de commandes validées (`USE_TEMPLATE`, `SET_FIELD`, `SET_VISIBILITY`, `SET_PRINTER`, `SET_EXPORT_FORMAT`) avant application.
- **Priorités & Gestion de Conflits** : Échelonnage de 10 à 1 000 avec drapeau `stopProcessing`.
- **Périmètres (Scopes)** : Filtrage par rayon (`departments`), magasin (`stores`), gabarit (`templates`) ou imprimante (`printers`).
- **Simulateur Dry-Run & Mode "Explain"** : Évaluation à blanc sur un produit échantillon avec trace détaillée des conditions (vrai/faux) et cartouche explicatif détaillant le pourquoi de chaque décision.
- **Ensembles de Règles (Rule Sets) & Versionnement** : Regroupement par enseigne ou opération commerciale avec historique des versions et retour arrière.

*Pour les spécifications complètes, l'architecture détaillée des hooks et le guide d'utilisation, consultez [`ORCHESTRATION_ARCHITECTURE.md`](ORCHESTRATION_ARCHITECTURE.md).*

### 3.10 Centre de Résolution des Données & Catalogue de Référence
E-Studio opère une distinction fondamentale entre la base locale de référence et le lot de production à imprimer :
- **Jeu de Travail vs Catalogue de Référence** : L'import d'un fichier Excel de 20 lignes ne génère que 20 étiquettes, sans injecter toute la base de référence de 500 000 articles.
- **Résolution Multi-Identifiants Scoped** : Recherche par EAN-13, GTIN, scan code, et numéros de pièce scopés (`SUPPLIER_PARTNO` avec `namespace`).
- **Détection & Arbitrage des Conflits (`DataResolutionCenterModal`)** : Comparaison champ par champ des attributs importés vs base de référence (`[REFERENCE]`, `[IMPORT]`, `[USER]`, `[RULE]`, `[COMPUTED]`).
- **Figement Immuable du Dataset (`freezeDataset`)** : Snapshot garantissant l'intégrité des prix et libellés pendant toute l'exécution du travail d'impression.

*Pour l'architecture complète de résolution des données et la gestion des identifiants, consultez [`DATA_RESOLUTION_ARCHITECTURE.md`](DATA_RESOLUTION_ARCHITECTURE.md).*

### 3.11 Workflow Officiel en 5 Étapes & Paquets Reproductibles (.estudio-job)
Le pipeline d'E-Studio est séquencé selon un ruban interactif officiel (`WorkflowStepperBar`) :
1. **Ingestion & Staging** : Ingestion du fichier source sans modification de la base maîtresse.
2. **Résolution & Arbitrage** : Identification multi-identifiants, détection de conflits et constitution de l'`EffectiveProduct`.
3. **Règles & Tarification** : Séparation stricte entre le Rule Engine (décisions d'aiguillage) et le Pricing Engine (calculs mathématiques et remises).
4. **Preflight & Double BÀT** : Contrôle automatisé des codes-barres / prix et validation visuelle BÀT unitaire + BÀT planche imposée.
5. **Spooler Local & Paquet .estudio-job** : Génération d'artefacts haute fidélité (PDF/ZPL/PPTX) et export d'archives complètes scellées par signature cryptographique.

### 3.12 Modèle des Éléments Canvas V2 & Typographie par Slots
Le modèle V2 supprime la surcharge de l'élément générique `text` au profit d'une taxonomie en 7 familles spécialisées :
- **Architecture Découplée** : Séparation stricte entre `Identity`, `Geometry`, `Transform`, `Appearance`, `Bindings`, `Rules`, `Constraints` et `Payload`.
- **Typographie Modulaire par Slots de Prix (`PriceTypographySlots`)** : Stylisation indépendante de la partie entière, du séparateur décimal, des centimes, de la devise et de l'unité de vente.
- **Moteur de Formatage Financier (`NumberFormatter`)** : Groupement occidental / indien, séparateurs insécables (`nbsp`/`nnbsp`), arrondis bancaires et zéro configurable.
- **Registre Central des Polices (`FontRegistry`)** : Gestion des polices système, application, projet, et support OpenType (`tabular-nums`).

*Pour les spécifications complètes du modèle V2, consultez [`ELEMENTS_V2_ARCHITECTURE.md`](ELEMENTS_V2_ARCHITECTURE.md).*

---

## 4. Spécification du Format de Gabarit (.json)

Un gabarit E-Studio est un document JSON standardisé et indépendant de la plateforme :

```json
{
  "schema_version": 1,
  "id": "template_promo_100x50",
  "name": "Balisage Promo 100x50",
  "width_mm": 100.0,
  "height_mm": 50.0,
  "inner_margins_mm": {
    "top": 2.0,
    "bottom": 2.0,
    "left": 2.0,
    "right": 2.0
  },
  "outer_margins_mm": {
    "top": 1.0,
    "bottom": 1.0,
    "left": 1.0,
    "right": 1.0
  },
  "bg_color": "#FFFFFF",
  "default_imposition": {
    "page_size": "A4",
    "orientation": "landscape",
    "gap_mm": 2.0,
    "gap_x_mm": 3.0,
    "gap_y_mm": 2.0,
    "show_cut_marks": true,
    "start_offset_slot": 0
  },
  "items": [
    {
      "id": "box_promo_bg",
      "type": "rectangle",
      "name": "Bandeau Fond Promo",
      "x_mm": 0.0,
      "y_mm": 0.0,
      "w_mm": 100.0,
      "h_mm": 12.0,
      "bg_color": "#DC2626",
      "border_color": "#DC2626",
      "border_width_mm": 0.0,
      "border_radius_mm": 0.0,
      "condition": "has_promo"
    },
    {
      "id": "txt_promo_banner",
      "type": "text",
      "name": "Libellé Promo",
      "x_mm": 2.0,
      "y_mm": 2.0,
      "w_mm": 96.0,
      "h_mm": 8.0,
      "text": "OFFRE SPÉCIALE",
      "font_family": "Arial",
      "font_size_pt": 12.0,
      "font_weight": "bold",
      "text_color": "#FFFFFF",
      "alignment": "center",
      "condition": "has_promo"
    },
    {
      "id": "txt_item_name",
      "type": "text",
      "name": "Désignation Produit",
      "x_mm": 3.0,
      "y_mm": 14.0,
      "w_mm": 94.0,
      "h_mm": 12.0,
      "text": "Nom de l'article",
      "binding_key": "ITEMNAME",
      "font_family": "Arial",
      "font_size_pt": 13.0,
      "font_weight": "bold",
      "text_color": "#111827",
      "alignment": "left"
    },
    {
      "id": "barcode_ean",
      "type": "barcode",
      "name": "Code EAN-13",
      "x_mm": 3.0,
      "y_mm": 30.0,
      "w_mm": 45.0,
      "h_mm": 16.0,
      "text": "3600550000000",
      "binding_key": "PRODUCT_SCAN",
      "barcode_format": "EAN13",
      "show_text": true
    },
    {
      "id": "txt_price",
      "type": "text",
      "name": "Prix de Vente",
      "x_mm": 52.0,
      "y_mm": 28.0,
      "w_mm": 45.0,
      "h_mm": 18.0,
      "text": "1 500 F",
      "binding_key": "SELLING_PRICE",
      "font_family": "Arial",
      "font_size_pt": 26.0,
      "font_weight": "bold",
      "text_color": "#DC2626",
      "alignment": "right"
    }
  ]
}
```

---

## 5. Raccourcis Clavier

Pour maximiser l'efficacité de conception, l'éditeur intègre des raccourcis clavier standardisés :

| Raccourci | Action |
| :--- | :--- |
| `Ctrl + Z` | Annuler la dernière opération (*Undo*) |
| `Ctrl + Y` ou `Ctrl + Shift + Z` | Rétablir la dernière opération (*Redo*) |
| `Ctrl + C` | Copier l'élément ou les propriétés |
| `Ctrl + V` | Coller l'élément copié |
| `Ctrl + D` | Dupliquer immédiatement l'élément sélectionné |
| `Ctrl + A` | Sélectionner tous les éléments du canvas |
| `Ctrl + F` | Ouvrir la modal "Rechercher et Remplacer" (textes, polices, couleurs) |
| `Suppr` ou `Retour arrière` | Supprimer les éléments sélectionnés |
| `Flèches directionnelles` | Déplacer les éléments sélectionnés de 1 mm |
| `Shift + Flèches` | Déplacer les éléments sélectionnés de 5 mm |
| `Échap` | Désélectionner les éléments / Fermer la fenêtre modale active |

---

## 6. Architecture de Persistance & Stockage Local

E-Studio adopte une architecture de persistance rigoureuse découplée de l'exécutable (`E-Studio.exe`), détaillée dans le document complet [`PERSISTENCE_ARCHITECTURE.md`](PERSISTENCE_ARCHITECTURE.md) :

```text
E-STUDIO.EXE
│
├─────────────────────────────────────────────┐
│              APPLICATION                    │
│  UI (React / TS) ──> ViewModels / State     │
│  Application Services ──> Domain Engines    │
│  Repositories / Adapters                    │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
               PERSISTENCE LAYER
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
  Tauri Store       SQLite          Filesystem
  (Préférences)  (Catalogue,      (Imports, PDFs,
                 Jobs, Audit)     Assets, Backups)
                       │
                       ▼
               OS APPLICATION DATA
              (Survit aux mises à jour)
```

### Principes Directeurs
1. **Runtime State $\neq$ Settings $\neq$ Business Data $\neq$ Files** : Séparation stricte entre état éphémère d'interface (modales, coordonnées de souris), préférences applicatives, données relationnelles métier et fichiers binaires.
2. **Repository Pattern & Application Context (`app`)** : Les composants d'interface n'interagissent jamais directement avec les drivers de stockage. Ils consomment le contexte unifié `app` (`app.products`, `app.templates`, `app.printers`, `app.imports`, `app.printJobs`, `app.audit`, `app.backup`).
3. **Format d'Archive `.estudio` (Backup & Restore)** : Génération et restauration de conteneurs de sauvegarde standardisés incluant `manifest.json`, données produits, gabarits, imprimantes, historique d'impression et journal d'audit.

---

## 7. Installation, Démarrage & Compilation

### 7.1 Exécution en Mode Web

Nécessite **Node.js 18+** (Node.js 22 recommandé) :

```bash
# 1. Cloner le dépôt et installer les dépendances
npm install

# 2. Démarrer le serveur de développement full-stack (Express API + Vite HMR sur http://localhost:3000)
npm run dev

# 3. Vérifier le code et construire pour la production
npm run lint
npm run build

# 4. Lancer en mode production
npm run start
```

### 7.2 Exécution & Compilation Desktop Windows (Tauri v2)

Pour générer des exécutables et installeurs Windows natifs autonomes sans dépendance Node.js sur les postes cibles :

#### Prérequis sur Windows :
1. **Rust & Cargo** : installé via [rustup.rs](https://rustup.rs) avec la cible `stable-x86_64-pc-windows-msvc`.
2. **Visual Studio C++ Build Tools** : composant *"Développement Desktop en C++"*.
3. **WebView2 Runtime** : présent nativement sur Windows 10 et Windows 11.

#### Commandes :
```powershell
# Installer les dépendances
npm install

# Lancer l'application de bureau en mode développement interactif
npm run tauri:dev

# Compiler les installeurs Windows de production
npm run tauri:build
```

#### Fichiers produits :
- **Installeur d'installation assistée (Recommandé)** :  
  `src-tauri/target/release/bundle/nsis/E-Studio_1.0.0_x64-setup.exe`
- **Installeur entreprise MSI** :  
  `src-tauri/target/release/bundle/msi/E-Studio_1.0.0_x64_fr-FR.msi`
- **Exécutable autonome direct** :  
  `src-tauri/target/release/e-studio.exe`

### 7.3 Intégration Continue (GitHub Actions CI/CD)

Le dépôt contient un workflow d'intégration continue prêt à l'emploi (`.github/workflows/build-tauri-windows.yml`) qui s'exécute automatiquement sur les machines virtuelles Windows de GitHub (`windows-latest`) :
- Résolution automatique des dépendances natives cross-plateforme (`@rollup/rollup-win32-x64-msvc`, `lightningcss-win32-x64-msvc`, `@tailwindcss/oxide-win32-x64-msvc`).
- Compilation complète de l'application frontend (`vite build`).
- Compilation du moteur Rust et assemblage du bundle Tauri v2.
- Mise à disposition des artefacts `.exe` et `.msi` directement téléchargeables dans l'onglet **Actions > Artifacts**.

---

*E-Studio — Conçu avec rigueur pour l'excellence opérationnelle, la précision millimétrique et la productivité dans le commerce moderne.*

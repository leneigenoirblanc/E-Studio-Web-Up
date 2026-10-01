# E-Studio — Architecture des Éléments Canvas V2 & Système Typographique Modulaire

## 1. Pourquoi la Refonte du Modèle des Éléments V2 ?

Dans les versions antérieures, l'élément générique `text` concentrait une multitude de responsabilités hétérogènes (calcul de prix au litre/kilo, calculs de remise, conversion monétaire, calculs de dates dynamiques DLC/DLUO, badges promo), tandis que `price_block` possédait sa propre logique tarifaire dupliquée.

Cette surcharge entraînait :
1. Un chevauchement de responsabilités entre primitives graphiques et logique métier.
2. Une typographie monolithique incapable de styliser indépendamment chaque sous-partie d'un prix (partie entière, séparateur, centimes, devise, unité de vente).
3. Un formatage numérique limité qui ne gérait pas proprement les séparateurs d'espaces insécables (`nbsp`/`nnbsp`), le groupement indien ou les arrondis financiers.
4. L'absence d'un service centralisé de gestion des polices (`FontRegistry`) avec gestion des fallbacks et fonctionnalités OpenType (`tnum` tabular numbers).

---

## 2. Le Nouveau Modèle Fondamental Découplé

Chaque élément du Canvas V2 respecte une séparation stricte :

```text
CanvasElement<TPayload>
├── identity: ElementIdentity        (id, type, family, nom lisible)
├── geometry: Geometry              (xMm, yMm, widthMm, heightMm)
├── transform: Transform            (rotationDeg, scaleX, scaleY, origin)
├── appearance: CommonAppearance    (opacity, visible, locked, zIndex, clipping)
├── payload: TPayload               (propriétés exclusives à ce que l'élément sait faire)
├── bindings?: BindingDefinition[]  (liaison aux données de production)
├── rules?: ElementRuleBinding      (règles de visibilité et d'aiguillage)
├── constraints?: ElementConstraint[] (contraintes anti-débordement / zones d'exclusion)
└── production?: ProductionMetadata (séparation des couches, traits de découpe)
```

> **Règle d'or** : Les propriétés communes décrivent uniquement l'existence et la géométrie de l'objet. Les propriétés spécifiques sont encapsulées dans le `payload` typé par famille.

---

## 3. Taxonomie des 7 Familles d'Éléments

| Famille | Éléments V2 | Responsabilités & Payloads |
| :--- | :--- | :--- |
| **1. TYPOGRAPHY** | `text`, `rich_text`, `curved_text`, `product_field`, `date_field`, `quantity_field` | Rendu de chaînes de caractères, césure, ajustement automatique de taille (`autosize`), alignement, sans calcul métier direct. |
| **2. PRICING** | `price_amount`, `price_block`, `promo_price`, `compare_price`, `unit_price`, `tier_price`, `discount_badge` | Gestion de montants financiers, stylisation typographique indépendante par sous-partie (*slots*), calculs de prix au kilo/litre, tableaux dégressifs B2B. |
| **3. DATA / IDENTIFICATION** | `barcode_1d`, `qrcode`, `datamatrix` | Génération vectorielle de codes scannables (EAN-13, GS1-128, Code 128, QR Code, DataMatrix) avec zones de silence (*quiet zones*) et texte en clair. |
| **4. MEDIA** | `image`, `icon`, `pictogram` | Visuels produit, logos enseigne, pictogrammes réglementaires (Nutri-Score, Éco-Score, Triman, Dangers). |
| **5. GRAPHICS** | `rectangle`, `rounded_rectangle`, `ellipse`, `line`, `polygon`, `polyline`, `path` | Primitives géométriques, fonds de couleur, filets séparateurs et tracés vectoriels. |
| **6. LAYOUT** | `container`, `table`, `repeater` | Mise en page automatique (Flex column/row, grille, répétiteurs de collections ou variantes). |
| **7. PRODUCTION** | `restricted_area`, `quiet_zone`, `safe_margin`, `cut_line`, `fold_line`, `bleed_area`, `sensor_gap` | Annotations techniques non imprimables, zones d'exclusion thermique et repères d'usinage. |

---

## 4. Système Typographique Modulaire par Slots (`PriceTypographySlots`)

Pour afficher un prix tel que :

```text
       2 500,99 FCFA
       (Soit 5,50 €/kg)
```

Le composant `price_block` / `price_amount` découpe le rendu en 8 slots typographiques indépendants :

```text
┌───────────┬─────────────┬───────────┬───────────┬──────────┐
│  INTEGER  │ DECIMAL_SEP │ FRACTION  │ CURRENCY  │   UNIT   │
│   2 500   │      ,      │    99     │   FCFA    │  le kg   │
│ Oswald 42 │  Oswald 24  │ Oswald 24 │ Roboto 16 │ Inter 11 │
│  Bold #00 │   Bold #00  │  Semi #00 │ Medium #44│ Normal #6│
└───────────┴─────────────┴───────────┴───────────┴──────────┘
```

Chaque slot possède sa propre configuration `TypographyStyle` :
* Police et variante (`fontId`, `family`, `weight`, `style`).
* Taille en points (`sizePt`), couleur (`color`), espacement (`letterSpacingPt`).
* Décalage vertical de ligne de base (`baselineShiftPt`) pour exposants et indices.
* Fonctionnalités OpenType (`tnum` pour aligner verticalement les chiffres dans les grilles).

---

## 5. Moteur de Formatage Numérique & Monétaire (`NumberFormatter`)

Le moteur `NumberFormatter` offre un contrôle paramétrique complet :
* **Stratégie de groupement** : `western` (3 par 3 : `1 000 000`) ou `indian` (3 puis 2 par 2 : `10,00,000`).
* **Séparateur de milliers** : `space`, `nbsp` (espace insécable), `nnbsp` (espace fine insécable), `,`, `.`, `'` ou personnalisé.
* **Séparateur décimal** : `,`, `.` ou personnalisé.
* **Gestion des décimales** : `minimumFractionDigits`, `maximumFractionDigits`, `trimTrailingZeros`.
* **Modes d'arrondi financiers** : `half_up`, `half_down`, `half_even` (arrondi bancaire), `ceil`, `floor`.
* **Affichage du zéro** : `zero` (`0,00`), `empty` (masqué), `dash` (`—`).

---

## 6. Gestionnaire Central de Polices (`FontRegistry`)

Le service `FontRegistry` gère l'inventaire des polices :
* **Polices Système** : Détection des polices de l'OS (Arial, Helvetica, Calibri, Segoe UI).
* **Polices Application** : Polices professionnelles pré-embarquées (Inter, Roboto, Oswald, Montserrat, Bebas Neue).
* **Chaîne de repli (*fallback chain*)** : En cas de police manquante lors de l'ouverture d'un projet sur une autre machine, substitution contrôlée sans blocage.
* **Support OpenType** : Activation des chiffres tabulaires (`tabular-nums`) pour les tableaux d'imposition et grilles tarifaires.

---

## 7. Sous-Système Tarifaire Dédié & Autonome (`src/domain/pricing/`)

Les éléments de prix forment désormais un sous-système architectural de premier ordre :
* **`PriceAmount` & `PriceBlock`** : Rendu granulaire par slots indépendants.
* **`PromoPrice`** : Barrage dynamique (diagonale, horizontale, double), calcul automatique du rabais (`-20%`) et badge visuel.
* **`UnitPrice`** : Calcul automatique du prix unitaire réglementaire au kg / L / 100g.
* **`TierPrice`** : Tableau dégressif B2B / Gros par seuils de quantité.
* **`DualCurrencyPrice`** : Conversion monétaire temps réel avec taux de change.
* **`PriceElementRenderer.tsx` & `PricingElementInspector.tsx`** : Moteur de rendu haute fidélité et inspecteur visuel interactif.

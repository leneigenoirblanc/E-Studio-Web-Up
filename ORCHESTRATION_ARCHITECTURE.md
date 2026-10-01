# E-Studio — Architecture de la Plateforme Globale de Règles Hybrides & Orchestration Métier

## 1. Vision & Positionnement

Dans un environnement retail moderne, de libre-service de gros (B2B) et de grande distribution (GMS), la production d’étiquettes et de balisage en rayon ne se résume pas à afficher passivement des données brutes issues de fichiers Excel ou d’un ERP. 

L’approche retenue par **E-Studio** est celle d’une **Hybrid Rules Platform (Plateforme de Règles Hybrides)** agissant comme **couche d’orchestration métier** entre l'ingestion des données et l'impression physique.

Cette architecture garantit :
* **Découplage architectural strict** : le canvas graphique, le moteur de tarification et le spooler d'impression ne contiennent aucune règle en dur.
* **Sécurité & Isolation absolue** : aucun script utilisateur ne peut accéder directement à SQLite, au système de fichiers ou aux API natives Tauri.
* **Modèle Read-Decide-Mutate** : lecture du contexte en lecture seule, calcul des décisions, génération de commandes validées, application atomique.
* **Double niveau d'accessibilité** :
  1. **Niveau A (GUI Rule Engine)** : Moteur déclaratif visuel (WHEN / AND / THEN) pour 80 à 90 % des besoins métier quotidiens des équipes terrain.
  2. **Niveau B (Sandboxed Scripting Runner)** : Moteur de script JavaScript sécurisé pour les calculs algorithmiques complexes (arrondis psychologiques, remises par paliers imbriqués, surtaxes temporaires).
* **Traçabilité & Mode Explain** : traçabilité complète de chaque mutation avec son motif métier et son auteur.

---

## 2. Emplacement dans le Pipeline E-Studio

### 2.1 Le Pipeline Traditionnel Linéaire
```text
Import → Normalisation → PricingEngine → Template → Imposition → Export → Spooler → Impression
```

### 2.2 Le Pipeline Orchestré E-Studio
```text
                          E-STUDIO PIPELINE
                                │
                                ▼
                       ┌──────────────────┐
                       │ Rule Orchestrator│
                       └────────┬─────────┘
                                │
             ┌──────────────────┼───────────────────────────┐
             │                  │                           │
             ▼                  ▼                           ▼
          Import            Pricing                    Template
             │                  │                           │
             ▼                  ▼                           ▼
        Normalization       Calculation                Rendering
             │                  │                           │
             └──────────────┬───┴───────────────┬───────────┘
                            │                   │
                            ▼                   ▼
                       Imposition             Export
                            │                   │
                            └──────────┬────────┘
                                       ▼
                                  Print Queue
```

Le `RuleOrchestrator` intervient de façon ciblée et idempotente à chaque point de contrôle stratégique du cycle de vie.

---

## 3. Cycle de Vie & Points de Contrôle (Hooks)

Le cycle d’exécution est jalonné par l’énumération formelle `RuleTrigger` (`src/domain/orchestration/types.ts`) :

| Hook / Déclencheur | Étape du Pipeline | Objectif Métier Principal | Exemples de Cas d'Usage |
| :--- | :--- | :--- | :--- |
| `BEFORE_IMPORT` | Pré-ingestion | Assainissement brut des flux entrants | Détection d'encodage, rejet des fichiers corrompus |
| `AFTER_IMPORT` | Post-ingestion | Validation initiale du schéma importé | Typage des colonnes, alerting sur champs manquants |
| `BEFORE_NORMALIZATION` | Pré-nettoyage | Préparation des formats spécifiques | Trimming des espaces superflus, regex préventive |
| `AFTER_NORMALIZATION` | Post-nettoyage | Harmonisation des unités de vente | Conversion pièces, litres, millilitres, grammes |
| `BEFORE_PRICING` | Pré-tarification | Enrichissement des prix et remises | Calcul du pourcentage de promo, mode prix au litre/kg |
| `AFTER_PRICING` | Post-tarification | Contrôles légaux de tarification | Détection de vente à perte, arrondi psychologique |
| `BEFORE_TEMPLATE_RESOLUTION`| Pré-sélection | Choix intelligent du gabarit | Bascule sur gabarit sans code-barres si EAN absent |
| `AFTER_TEMPLATE_RESOLUTION` | Post-sélection | Ajustement des éléments du gabarit | Masquage de logos de certification manquants |
| `BEFORE_RENDER` | Pré-rendu canvas | Stylisation conditionnelle | Changement de couleur dynamique (ex: bandeau rouge promo) |
| `AFTER_RENDER` | Post-rendu canvas | Contrôle de débordement graphique | Détection de texte tronqué (preflight visuel) |
| `BEFORE_IMPOSITION` | Pré-mise en page | Optimisation du placement planche | Choix orientation paysage/portrait selon nombre |
| `AFTER_IMPOSITION` | Post-mise en page | Contrôle de gâche papier | Optimisation de la première étiquette vierge |
| `BEFORE_EXPORT` | Pré-génération | Aiguillage du format de production | Bascule automatique vers ZPL si volume > 1 000 |
| `AFTER_EXPORT` | Post-génération | Archivage & Traçabilité | Inscription des fichiers générés au journal d'audit |
| `BEFORE_PRINT` | Pré-envoi spooler | Validation matérielle & autorisations | Vérification de la compatibilité largeur papier |
| `AFTER_PRINT` | Confirmation | Mise à jour des compteurs et stocks | Horodatage de l'impression effective en magasin |
| `ON_PRINT_ERROR` | Défaillance | Récupération d'incident | Alerte de rupture ruban thermique, routage secours |

---

## 4. Les Deux Niveaux du Moteur Hybride

### 4.1 Niveau A : Moteur Déclaratif Visuel (GUI Rule Engine)
Destiné aux directeurs de magasin, gestionnaires de stock et merchandiseurs :
* **Syntaxe visuelle claire** :
  * `WHEN` : `[product.promoPrice] [is_not_empty]`
  * `AND` : `[product.promoPrice] [less_than] [product.sellingPrice]`
  * `THEN` : `[CALCULATE_DISCOUNT]`
  * `THEN` : `[SET_VISIBILITY] promo_banner = true`
* **Persistance structurée** : arbre syntaxique AST déclaratif (proche de JSON Logic) sérialisable en JSON, sans risque d'injection de code.

### 4.2 Niveau B : Sandboxed Scripting Runner (Script Sécurisé)
Destiné aux ingénieurs informatiques et cas avancés (arrondis complexes, taxes régionales, calculs matriciels) :
* **Confinement strict** :
  * Variables globales inaccessibles : `window`, `document`, `globalThis`, `fetch`, `XMLHttpRequest`, `require`, `process`, `fs`, `eval`, `Function`.
  * Aucun accès direct à SQLite, aux fichiers ou à Tauri.
* **Watchdog & Quotas CPU** :
  * Temps d'exécution plafonné (par défaut 150 ms, paramétrable dans `scriptLimits.maxExecutionMs`).
  * Timeout automatique en cas de boucle infinie (`while(true)`).
* **API Sandbox exposée** (`ctx`) :
  * `ctx.product.get(prop)` : lecture seule des attributs produit.
  * `ctx.pricing.set(prop, val)` : génération d'une commande `SET_FIELD`.
  * `ctx.template.use(templateId)` : génération d'une commande `USE_TEMPLATE`.
  * `ctx.print.setPrinter(id)` : génération d'une commande `SET_PRINTER`.
  * `ctx.print.setFormat(fmt)` : génération d'une commande `SET_EXPORT_FORMAT`.
  * `ctx.label.setVisibility(elId, bool)` : génération d'une commande `SET_VISIBILITY`.
  * `ctx.label.setText(elId, str)` : génération d'une commande `SET_TEXT`.
  * `ctx.label.setColor(elId, colorHex)` : génération d'une commande `SET_COLOR`.
  * `ctx.log(message)` : journalisation dans la trace de simulation.

---

## 5. Modèle Transactionnel Read-Decide-Mutate

Pour éviter qu'une règle ne corrompe l'état global ou ne crée des effets de bord imprévisibles, le moteur applique strictement 3 phases successives :

```text
 ┌──────────────────────┐
 │     1. READ          │  Snapshot immuable du contexte (product, pricing, template, batch, print)
 └──────────┬───────────┘
            ▼
 ┌──────────────────────┐
 │    2. DECIDE         │  Évaluation des conditions AST ou exécution sandboxée
 └──────────┬───────────┘  Génération d'une liste ordonnée d'ActionCommand[] (sans mutation directe)
            ▼
 ┌──────────────────────┐
 │ 3. VALIDATE & MUTATE │  Vérification de cohérence des commandes (types, bornes)
 └──────────────────────┘  Application atomique des mutations dans le snapshot de sortie
```

---

## 6. Priorités, Scopes et Arrêt de Chaîne

* **Priorité numérique** : chaque règle possède un score entier (ex : `900` pour promo critique, `500` pour affichage standard, `100` pour cosmétique). Les règles sont triées et exécutées par priorité strictement décroissante.
* **Filtrage de Scope (Périmètre)** :
  * Par rayon / département (`departments: ['Boissons', 'Cave']`)
  * Par magasin / enseigne (`stores: ['HYPER-01', 'DRIVE-NORD']`)
  * Par catégorie de gabarit (`templateCategories: ['Alimentaire']`)
* **Stop Processing (`stopProcessing: true`)** :
  * Permet d'interrompre immédiatement l'évaluation des règles suivantes sur le même trigger dès qu'une condition prioritaire exclusive est satisfaite.

---

## 7. Catalogue des Règles Métier Pré-configurées

Le système est livré avec un jeu de règles complètes préconfigurées :

1. **`R-001` : Détection & Calcul Automatique Promotion**
   * *Trigger* : `BEFORE_PRICING` (Priorité 900)
   * *Logique* : Si `promoPrice < sellingPrice`, calcule le % de remise et active le bandeau promotionnel.
2. **`R-002` : Prix au Litre pour Rayon Boissons < 1L**
   * *Trigger* : `BEFORE_PRICING` (Priorité 750)
   * *Logique* : Obligation légale d'afficher le prix au litre sur les formats individuels de boissons.
3. **`R-003` : Bascule Gabarit "Sans Code-Barres" si EAN Absent**
   * *Trigger* : `BEFORE_TEMPLATE_RESOLUTION` (Priorité 800)
   * *Logique* : Si le code-barres est vide, bascule automatiquement sur un gabarit d'affichage grand format adapté au vrac ou à la boulangerie.
4. **`R-004` : Routage Automatique Thermique Zebra si Lot > 1 000**
   * *Trigger* : `BEFORE_EXPORT` (Priorité 650)
   * *Logique* : Dès que le volume d'étiquettes dépasse 1 000 unités, oriente la production vers les imprimantes thermiques ZPL haute cadence.
5. **`R-005` : Affichage Grille Paliers pour Grossiste**
   * *Trigger* : `BEFORE_TEMPLATE_RESOLUTION` (Priorité 500)
   * *Logique* : Détecte les paliers de volume B2B et active la table dégressive.
6. **`R-006` : Masquage Prix au Kilo pour Vente à la Pièce**
   * *Trigger* : `BEFORE_PRICING` (Priorité 450)
   * *Logique* : Masque la mention du prix au kilo/litre pour les articles vendus à l'unité (bazar, accessoires).
7. **`R-007` : Arrondi Psychologique Retail (Script Sandboxé)**
   * *Trigger* : `BEFORE_PRICING` (Priorité 300)
   * *Logique* : Script JavaScript sandboxé arrondissant les montants au palier supérieur à 90 ou 900.

---

## 8. Mode Explain, Simulation & Audit Trail

### 8.1 Simulateur Graphique (Dry-Run Studio)
Le modal d'orchestration (`OrchestrationStudioModal.tsx`) intègre un laboratoire de simulation interactif permettant de :
* Sélectionner un article réel ou éditer un payload JSON de test.
* Choisir le déclencheur à tester (`RuleTrigger`).
* Lancer la simulation sans altérer les données de production (`dryRun: true`).
* Visualiser le comparatif avant/après (snapshot initial vs snapshot muté).
* Consulter la trace détaillée règle par règle (temps d'exécution en ms, conditions satisfaites, commandes émises, logs sandboxés).

### 8.2 Mode Explain
Pour chaque mutation appliquée, le système construit un rapport d'explication lisible par un être humain :
```text
Règle : "Détection & Calcul Automatique Promotion" (Priorité 900)
Conditions satisfaites :
  • product.promoPrice (14.90) est non vide
  • product.promoPrice (14.90) < product.sellingPrice (19.90)
Actions exécutées :
  • CALCULATE_DISCOUNT → Remise calculée à -25.13%
  • SET_VISIBILITY → Élément "promo_banner" rendu visible
```

### 8.3 Gestion des Versions & Restauration
Chaque modification de règle génère une nouvelle entrée dans le journal des versions (`RuleVersion`). L'utilisateur peut à tout moment comparer deux versions et restaurer un état antérieur en un clic.

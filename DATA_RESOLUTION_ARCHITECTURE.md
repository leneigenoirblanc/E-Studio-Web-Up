# E-Studio — Architecture de Résolution des Données, Catalogue de Référence & Dataset de Production

## 1. Le Changement Conceptuel Fondamental

Dans les architectures d'étiquetage naïves, tout fichier importé est fusionné en vrac dans la base locale, et le générateur traite indistinctement « toute la base » comme lot d'étiquettes à imprimer. 

Pour une suite logicielle industrielle comme **E-Studio**, ce fonctionnement n'est pas le bon choix :
* **Le catalogue local est une Base de Référence & d'Enrichissement** : il peut contenir 500 000 articles, des nomenclatures multi-fournisseurs, des fiches techniques et des antécédents historiques. Il ne constitue **jamais** en soi le dataset à imprimer.
* **Le fichier importé est le Jeu de Travail de la Production** : il contient 10, 50 ou 500 articles que l'utilisateur souhaite effectivement baliser en rayon aujourd'hui.
* **Le Moteur de Résolution (Resolution Engine)** croise ce jeu de travail avec la base de référence pour identifier chaque article, enrichir les données manquantes (marque, conditionnement, poids net) et arbitrer les éventuels conflits.
* **L'Effective Dataset (Dataset Résolu & Figé)** : seules les lignes résolues de ce jeu de travail sont envoyées au moteur de règles, à l'imposition et à l'impression.

```text
                    BASE DE RÉFÉRENCE (500 000 articles)
                                   │
                                   │ lookup / enrichissement
                                   ▼
Excel / CSV (17 articles) ───► Résolution des Données
                                   │
                         ┌─────────┼─────────┐
                         │         │         │
                      trouvé    conflit   introuvable
                         │         │         │
                         │         │       arbitrage
                         │         │       utilisateur
                         │         │         │
                         └─────────┼─────────┘
                                   ▼
                       EFFECTIVE DATASET (17 articles)
                                   │
                                 freeze
                                   ▼
                            Rule Orchestrator
                                   │
                            Pricing Engine
                                   │
                           Template Resolver
                                   │
                          Preflight & Imposition
                                   │
                           Impression (17 étiquettes)
```

---

## 2. Distinction des Niveaux de Données

E-Studio structure l'information produit en 3 couches distinctes :

### 2.1 Couche 1 — Identité Produit Canonique (`CanonicalProduct`)
Informations stables et universelles définissant l'article indépendamment de son lieu de vente :
* Identifiant interne non signifiant : `EST-PROD-000001`, `EST-PROD-000002` (évite de dépendre d'un code EAN externe susceptible d'évoluer).
* Nom canonique, Marque (`brand`), Fabricant (`manufacturer`), Description, Code douanier (`hsCode`).
* Caractéristiques physiques : conditionnement (`packUnit`), colisage (`caseSize`, `caseUnit`), poids net (`unitWeightValue`, `unitWeightUnit`).

### 2.2 Couche 2 — Multi-Identifiants Scoped (`ProductIdentifier`)
Un même produit physique possède souvent plusieurs identifiants dans sa vie commerciale. Le système distingue strictement l'**identité** des **identifiants** :
```text
                         CANONICAL PRODUCT
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
       EAN13                 GTIN/SCAN            PART NUMBER
  3012345678901            1234567890124            ABC-001
  isPrimary: true         isPrimary: false      namespace: SUPPLIER_X
```
* **EAN / GTIN / SCAN_CODE** : identifiants globaux.
* **PART_NUMBER (Numéro de Pièce / Réf Fournisseur)** : identifiants **scopés**. Un code comme `ABC-123` n'est pas universel ; il est qualifié par un `namespace` (ex : `namespace = SUPPLIER_A` ou `namespace = STORE_DOUALA`).
* **Historique des codes** : lorsqu'un fournisseur change de code EAN, l'ancien code reste un alias actif pointant vers le même produit canonique, évitant de créer des doublons.

### 2.3 Couche 3 — Données Commerciales & Contextuelles
Données fluctuantes selon le magasin, la devise, le pays ou l'opération promotionnelle :
* `STORE_NAME`, `SELLING_PRICE`, `PROMOPRICE`, `CURRENCY`, `TAX_RATE`, `TAX_TYPE`, `VALID_FROM`, `VALID_TO`.
* Elles sont apportées par le fichier de travail du supermarché et associées au produit pour la session de tirage.

---

## 3. Provenance des Champs (Source Map) & Confiance

Chaque valeur dans l'article résolu (`EffectiveProduct`) est assortie de son origine certifiée :

| Source | Badge UI | Description |
| :--- | :--- | :--- |
| `REFERENCE` | `[REFERENCE]` | Donnée maîtresse issue du catalogue canonique local |
| `IMPORT` | `[IMPORT]` | Donnée fraîche apportée par le fichier Excel/CSV du magasin |
| `USER` | `[USER]` | Arbitrage manuel ou saisie directe par l'opérateur |
| `RULE` | `[RULE]` | Valeur assignée par une règle d'orchestration |
| `COMPUTED` | `[COMPUTED]` | Calcul automatique (ex : `% Remise = ((PV - Promo) / PV) * 100`) |

---

## 4. États de Résolution & Centre d'Arbitrage

Lors du croisement du fichier importé avec la base de référence, le `ResolutionEngine` catégorise chaque ligne :

1. **`EXACT_MATCH`** : Correspondance parfaite sur le scan code primaire ou le part number.
2. **`ALIAS_MATCH`** : Correspondance sur un ancien EAN ou un code fournisseur historique.
3. **`CONFLICT`** : La référence existe, mais un attribut diverge (ex : Marque `Nestlé` en base vs `Nestle SA` dans l'import). L'opérateur peut :
   * Conserver la valeur de référence (`USE_REFERENCE`)
   * Appliquer la valeur importée (`USE_IMPORT`)
   * Conserver les deux en créant un alias
4. **`UNRESOLVED`** : Article absent du catalogue. L'opérateur peut :
   * Créer instantanément une nouvelle fiche canonique (`Créer Article Canonique`)
   * Associer manuellement à un produit existant
   * Poursuivre le tirage sans enregistrement en base

---

## 5. Modes de Synchronisation Contrôlés du Catalogue

L'utilisateur contrôle l'impact de son tirage sur le catalogue de référence :
* **Mode Enrichissement (`ENRICH_AND_SAVE`)** : Les nouveaux articles validés sont ajoutés au catalogue canonique ; les données existantes restent protégées.
* **Mode Lecture Seule (`READ_ONLY_ENRICH`)** : Le catalogue sert uniquement à enrichir l'impression sans jamais être modifié.
* **Mode Synchronisation (`SYNCHRONIZE`)** : Les modifications d'attributs validées sont propagées dans l'historique d'audit du catalogue.
* **Mode Remplacement Ciblé (`REPLACE_SCOPE`)** : Remplacement réservé à un périmètre précis (un fournisseur ou un rayon), interdisant tout `DELETE` global destructeur.

---

## 6. Figement du Dataset (`freezeDataset`)

Avant l'envoi à l'impression, le dataset de production passe à l'état `frozen` (`ProductionDataset.status = 'frozen'`).
Ce snapshot immuable garantit qu'aucune modification ultérieure du catalogue de référence ne viendra modifier la tarification ou les textes d'un lot d'étiquettes en cours de distribution ou de spooling.

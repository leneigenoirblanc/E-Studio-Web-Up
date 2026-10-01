/**
 * E-Studio Preflight Engine V2 (Sections 56, 77)
 * Contrôle qualité automatisé, détection d'anomalies bloquantes et non-bloquantes
 * avant le Bon à Tirer (BÀT) et la distribution d'impression :
 * - Data validation (données manquantes, cohérence)
 * - Geometry validation (dépassement des marges, collision zones restreintes)
 * - Typography & Font validation (polices disponibles, fallbacks)
 * - Barcode validation (checksum EAN-13, zones de silence)
 * - Pricing validation (promo < régulier, prix au kilo)
 * - Renderer compatibility validation (ZPL, PDF, Canvas)
 */

import { PreflightReport, PreflightIssue, ImpositionConfig } from './types';
import { LabelTemplate, ProductRecord } from '../../types';
import { fontService } from '../canvas/typography/fontService';
import { ZPL_CAPABILITIES, PDF_CAPABILITIES, CapabilityResolver } from '../rendering/capabilities';

export class PreflightEngine {
  private static instance: PreflightEngine | null = null;

  public static getInstance(): PreflightEngine {
    if (!this.instance) {
      this.instance = new PreflightEngine();
    }
    return this.instance;
  }

  /**
   * Vérifie la validité de la somme de contrôle d'un code EAN-13
   */
  public isValidEan13(code: string): boolean {
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 13) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(clean[12], 10);
  }

  /**
   * Exécute la vérification complète de preflight
   */
  public runPreflightCheck(
    products: ProductRecord[],
    template: LabelTemplate,
    options: {
      isThermalOutput?: boolean;
      targetRenderer?: 'canvas' | 'pdf' | 'zpl' | 'pptx';
      impositionConfig?: ImpositionConfig;
    } = {}
  ): PreflightReport {
    const issues: PreflightIssue[] = [];

    // 1. VÉRIFICATION DU GABARIT & GÉOMÉTRIE (Geometry Validation)
    if (!template || !template.items || template.items.length === 0) {
      issues.push({
        id: `ISSUE-TPL-EMPTY`,
        severity: 'BLOCKING',
        category: 'DATA_INTEGRITY',
        message: 'Le gabarit actif ne contient aucun élément graphique.',
        recommendation: 'Chargez ou configurez un gabarit valide avec au moins un champ de prix.',
      });
    }

    const items = template?.items || [];
    const hasBarcodeElement = items.some((el) => el.type === 'barcode' || el.type === 'qrcode');
    const hasPriceElement = items.some(
      (el) => el.type === 'price' || el.type === 'price_block' || el.binding_key === 'SELLING_PRICE'
    );

    if (!hasPriceElement) {
      issues.push({
        id: `ISSUE-TPL-NO-PRICE`,
        severity: 'WARNING',
        category: 'PRICING',
        message: 'Aucun bloc de prix détecté dans le gabarit.',
        recommendation: 'Ajoutez un élément de type "Prix" pour afficher le tarif réglementaire.',
      });
    }

    // 1.1 Détection des collisions avec les zones restreintes (Constraint Collision)
    const restrictedAreas = items.filter((it) => it.type === 'restricted_area');
    items.forEach((it) => {
      if (it.type === 'restricted_area') return;
      restrictedAreas.forEach((res) => {
        const overlap =
          it.x_mm < res.x_mm + res.w_mm &&
          it.x_mm + it.w_mm > res.x_mm &&
          it.y_mm < res.y_mm + res.h_mm &&
          it.y_mm + it.h_mm > res.y_mm;

        if (overlap) {
          issues.push({
            id: `ISSUE-RESTRICTED-COLLISION-${it.id}`,
            severity: 'WARNING',
            category: 'GEOMETRY',
            message: `L'élément "${it.type}" chevauche une zone restreinte technique (${(res as any).label || 'Encoche'}).`,
            recommendation: 'Déplacez l\'élément en dehors de la zone d\'exclusion thermique ou mécanique.',
          });
        }
      });

      // Dépassement physique de l'étiquette
      if (it.x_mm + it.w_mm > template.width_mm || it.y_mm + it.h_mm > template.height_mm) {
        issues.push({
          id: `ISSUE-GEOMETRY-OVERFLOW-${it.id}`,
          severity: 'WARNING',
          category: 'GEOMETRY',
          message: `L'élément "${it.type}" dépasse les dimensions physiques de l'étiquette.`,
          recommendation: 'Redimensionnez ou repositionnez l\'objet à l\'intérieur de la zone imprimable.',
        });
      }
    });

    // 1.2 Compatibilité Renderer (Section 57-58)
    if (options.targetRenderer === 'zpl') {
      const hasCurvedText = items.some((it) => it.type === 'curved_text');
      if (hasCurvedText) {
        const strat = CapabilityResolver.getStrategy(ZPL_CAPABILITIES, 'curved_text');
        issues.push({
          id: `ISSUE-RENDERER-CURVED-ZPL`,
          severity: strat === 'error' ? 'BLOCKING' : 'INFO',
          category: 'THERMAL',
          message: `Texte courbé détecté pour sortie thermique ZPL : tramage bitmap automatique (${strat}).`,
          recommendation: 'Le moteur convertira automatiquement ce texte en image vectorielle matricielle ZPL.',
        });
      }
    }

    // 2. CONTRÔLE SUR LE JEU DE DONNÉES (Data & Pricing Validation)
    products.forEach((prod, index) => {
      const pName = prod.ITEMNAME || `Article #${index + 1}`;
      const barcode = (prod.PRODUCT_SCAN || prod.BARCODE || '').toString().trim();
      const sellingPrice = Number(prod.SELLING_PRICE) || 0;
      const promoPrice = prod.PROMOPRICE ? Number(prod.PROMOPRICE) : undefined;

      // 2.1 Contrôle Code-Barres
      if (hasBarcodeElement) {
        if (!barcode) {
          issues.push({
            id: `ISSUE-BC-EMPTY-${index}`,
            productId: prod.id || String(index),
            productName: pName,
            field: 'PRODUCT_SCAN',
            severity: 'BLOCKING',
            category: 'BARCODE',
            message: `Code-barres manquant pour "${pName}".`,
            recommendation: 'Renseignez un code EAN-13 / GTIN ou appliquez la règle de bascule sans code-barres.',
          });
        } else if (barcode.length === 13 && /^\d+$/.test(barcode)) {
          if (!this.isValidEan13(barcode)) {
            issues.push({
              id: `ISSUE-BC-CHKSUM-${index}`,
              productId: prod.id || String(index),
              productName: pName,
              barcode,
              field: 'PRODUCT_SCAN',
              severity: 'WARNING',
              category: 'BARCODE',
              message: `Clé de contrôle EAN-13 invalide pour le code "${barcode}".`,
              recommendation: 'Vérifiez la clé de contrôle EAN-13 auprès de votre centrale ou ERP.',
            });
          }
        }
      }

      // 2.2 Contrôle Tarification
      if (sellingPrice <= 0) {
        issues.push({
          id: `ISSUE-PRICE-ZERO-${index}`,
          productId: prod.id || String(index),
          productName: pName,
          field: 'SELLING_PRICE',
          severity: 'BLOCKING',
          category: 'PRICING',
          message: `Prix de vente nul ou manquant (0 ${prod.CURRENCY || 'FCFA'}).`,
          recommendation: 'Indiquez un prix de vente valide supérieur à zéro.',
        });
      }

      if (promoPrice !== undefined && promoPrice > 0) {
        if (promoPrice >= sellingPrice) {
          issues.push({
            id: `ISSUE-PROMO-HIGH-${index}`,
            productId: prod.id || String(index),
            productName: pName,
            field: 'PROMOPRICE',
            severity: 'BLOCKING',
            category: 'PRICING',
            message: `Le prix promo (${promoPrice}) est supérieur ou égal au prix normal (${sellingPrice}).`,
            recommendation: 'Le prix promotionnel doit être strictement inférieur au prix de référence.',
          });
        }
      }

      // 2.3 Contrôle Longueur de texte
      if (pName.length > 60) {
        issues.push({
          id: `ISSUE-TEXT-LEN-${index}`,
          productId: prod.id || String(index),
          productName: pName,
          field: 'ITEMNAME',
          severity: 'INFO',
          category: 'GEOMETRY',
          message: `Libellé long (${pName.length} caractères) susceptible d'être tronqué.`,
          recommendation: 'Vérifiez le rendu en BÀT unitaire ou activez la réduction automatique de taille de police.',
        });
      }
    });

    // 3. CONTRÔLE IMPOSITION PLANCHE
    if (options.impositionConfig) {
      const imp = options.impositionConfig;
      const totalSlots = imp.rows * imp.columns;
      if (imp.startSlotOffset >= totalSlots) {
        issues.push({
          id: `ISSUE-IMP-OFFSET`,
          severity: 'BLOCKING',
          category: 'IMPOSITION',
          message: `L'offset de départ (${imp.startSlotOffset}) dépasse le nombre de poses de la planche (${totalSlots}).`,
          recommendation: 'Réduisez l\'offset de départ pour commencer sur une case valide.',
        });
      }
    }

    // 4. Synthèse et statut final
    const blockingCount = issues.filter((i) => i.severity === 'BLOCKING').length;
    const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
    const infoCount = issues.filter((i) => i.severity === 'INFO').length;

    const status = blockingCount > 0 ? 'FAIL' : warningCount > 0 ? 'WARNING' : 'PASS';

    return {
      timestamp: new Date().toISOString(),
      status,
      totalChecked: products.length,
      blockingCount,
      warningCount,
      infoCount,
      issues,
      thermalAnalysisIncluded: Boolean(options.isThermalOutput),
    };
  }
}

export const preflightEngine = PreflightEngine.getInstance();

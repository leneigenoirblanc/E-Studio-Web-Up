import { LabelTemplate } from '../../types';
import {
  LabelFormat,
  PrinterModel,
  PrinterInstance,
  CompatibilityReport,
  CompatibilityIssue,
} from './types';
import { RenderModeResolver } from './renderModeResolver';

export class CompatibilityEngine {
  /**
   * Evaluates the full compatibility matrix between a LabelFormat, LabelTemplate,
   * and a configured PrinterInstance (with its resolved PrinterModel).
   */
  public static evaluate(
    format: LabelFormat,
    template: LabelTemplate,
    instance: PrinterInstance,
    model?: PrinterModel | null
  ): CompatibilityReport {
    const issues: CompatibilityIssue[] = [];
    const dpi = instance.selectedDpi || 203;

    // Dot math (non-accumulating independent rounding)
    const labelDotsW = Math.round((format.width * dpi) / 25.4);
    const labelDotsH = Math.round((format.height * dpi) / 25.4);

    // 1. Width verification against physical printer capability
    if (model) {
      if (format.width > model.maxMediaWidth) {
        issues.push({
          severity: 'error',
          field: 'width',
          message: `La largeur de l'étiquette (${format.width} mm) dépasse la largeur physique maximale acceptée par l'imprimante (${model.maxMediaWidth} mm).`,
          recommendation: `Sélectionnez un gabarit d'une largeur ≤ ${model.maxMediaWidth} mm ou changez d'imprimante (ex: classe 4 pouces / 108 mm).`,
        });
      } else if (model.maxMediaWidth - format.width < 2 && format.width > 20) {
        issues.push({
          severity: 'warning',
          field: 'width',
          message: `La largeur de l'étiquette (${format.width} mm) est très proche de la limite maximale (${model.maxMediaWidth} mm).`,
          recommendation: 'Assurez-vous que les guides latéraux de rouleau sont calés avec précision pour éviter tout débordement de tête.',
        });
      }

      if (model.minMediaWidth && format.width < model.minMediaWidth) {
        issues.push({
          severity: 'warning',
          field: 'minWidth',
          message: `La largeur de l'étiquette (${format.width} mm) est inférieure à la largeur minimale recommandée (${model.minMediaWidth} mm).`,
          recommendation: 'Le capteur de cellule de cellule de détection peut nécessiter un réglage manuel.',
        });
      }

      // 2. Media Type Compatibility
      if (format.mediaTypeId === 'SHEET' && model.printerType !== 'Office Printer') {
        issues.push({
          severity: 'error',
          field: 'mediaType',
          message: `Le format est une planche d'étiquettes A4/A5 (SHEET), mais l'imprimante sélectionnée est une imprimante thermique à rouleau (${model.model}).`,
          recommendation: 'Basculez sur une imprimante bureautique standard (pilote OS) pour imprimer les planches A4, ou choisissez un format rouleau.',
        });
      } else if (format.mediaTypeId !== 'SHEET' && model.printerType === 'Office Printer') {
        issues.push({
          severity: 'warning',
          field: 'mediaType',
          message: `L'étiquette est unitaire (rouleau ${format.mediaTypeId}), mais l'imprimante sélectionnée est une imprimante bureautique A4/A5.`,
          recommendation: 'E-Studio configurera automatiquement une planche d\'imposition multi-poses sur votre imprimante bureautique.',
          canAutoFix: true,
        });
      } else if (!model.supportedMediaTypes.includes(format.mediaTypeId)) {
        issues.push({
          severity: 'warning',
          field: 'mediaType',
          message: `Le type de support "${format.mediaTypeId}" n'est pas expressément certifié sur le profil de l'imprimante ${model.model}.`,
          recommendation: 'Vérifiez les spécifications du fabricant pour l\'alignement par encoche ou marque noire.',
        });
      }

      // 3. Resolution Validation
      if (!model.resolutionOptions.includes(dpi)) {
        issues.push({
          severity: 'warning',
          field: 'dpi',
          message: `La résolution sélectionnée (${dpi} DPI) n'est pas dans la liste officielle du modèle (${model.resolutionOptions.join(', ')} DPI).`,
          recommendation: `Basculez sur ${model.resolutionOptions[0]} DPI pour éviter tout étirement d'échelle.`,
          canAutoFix: true,
        });
      }
    }

    // 4. Element-level checks: Barcode Quiet Zone & Module Width at target DPI
    if (template.items && Array.isArray(template.items)) {
      for (const item of template.items) {
        if (item.type === 'barcode') {
          // Check quiet zone: barcode x offset from label left edge, and right edge clearance
          const bcLeft = item.x_mm;
          const bcRight = format.width - (item.x_mm + item.w_mm);
          const minQuietZoneMm = 2.5; // Standard GS1 / EAN quiet zone recommendation

          if (bcLeft < minQuietZoneMm || bcRight < minQuietZoneMm) {
            issues.push({
              severity: 'warning',
              field: 'barcode_quiet_zone',
              message: `Le code-barres "${(item as any).code || 'Code-barres'}" est placé à moins de ${minQuietZoneMm} mm du bord (gauche: ${bcLeft.toFixed(1)}mm, droite: ${bcRight.toFixed(1)}mm).`,
              recommendation: 'Une marge silencieuse (quiet zone) d\'au moins 2.5 mm de chaque côté est indispensable pour garantir la scannabilité en caisse.',
            });
          }

          // Check narrow bar width at DPI
          // If total width is very small for 13 digits (EAN-13 needs ~95 modules)
          const isEan13 = (item as any).barcode_type === 'ean13';
          if (isEan13 && item.w_mm < 25) {
            issues.push({
              severity: 'error',
              field: 'barcode_density',
              message: `Largeur du code EAN-13 insuffisante (${item.w_mm} mm). À ${dpi} DPI, les barres élémentaires deviennent trop fines pour être imprimées sans bavure.`,
              recommendation: 'Augmentez la largeur du code-barres à au moins 28-30 mm.',
            });
          }
        }

        // Check if element overflows the format boundaries
        const itemRight = item.x_mm + item.w_mm;
        const itemBottom = item.y_mm + item.h_mm;
        if (itemRight > format.width || itemBottom > format.height) {
          issues.push({
            severity: 'warning',
            field: 'element_overflow',
            message: `Un élément de type "${item.type}" déborde des dimensions physiques de l'étiquette (${itemRight.toFixed(1)} > ${format.width} mm ou ${itemBottom.toFixed(1)} > ${format.height} mm).`,
            recommendation: 'Ajustez la position ou activez le redimensionnement automatique dans le concepteur.',
          });
        }
      }
    }

    // Resolve rendering mode
    const renderModeDecision = RenderModeResolver.resolve(template, model, instance);

    // Compute overall status
    let status: 'Compatible' | 'Attention' | 'Incompatible' = 'Compatible';
    if (issues.some((i) => i.severity === 'error')) {
      status = 'Incompatible';
    } else if (issues.some((i) => i.severity === 'warning')) {
      status = 'Attention';
    }

    return {
      status,
      recommendedRenderingMode: renderModeDecision.mode,
      issues,
      printerDpi: dpi,
      labelDimensionsMm: { width: format.width, height: format.height },
      printableDimensionsMm: { width: format.printableWidth, height: format.printableHeight },
      labelDimensionsDots: { width: labelDotsW, height: labelDotsH },
    };
  }
}

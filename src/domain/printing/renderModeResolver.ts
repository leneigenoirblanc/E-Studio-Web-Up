import { LabelTemplate } from '../../types';
import { PrinterModel, PrinterInstance } from './types';

export interface RenderModeDecision {
  mode: 'native' | 'raster';
  reason: string;
  hasRasterOnlyElements: boolean;
  rasterReasons: string[];
}

export class RenderModeResolver {
  /**
   * Resolves whether the template should be rendered as native printer commands
   * (e.g. ZPL with ^FN / TSPL) or rasterized as a 1-bit / monochrome graphic bitmap.
   */
  public static resolve(
    template: LabelTemplate,
    model?: PrinterModel | null,
    instance?: PrinterInstance | null
  ): RenderModeDecision {
    const rasterReasons: string[] = [];

    // System Driver or Generic without command language must use raster
    if (!model || model.commandLanguage === 'SystemDriver') {
      return {
        mode: 'raster',
        reason: "Le pilote système / bureautique nécessite un rendu d'image matricielle haute résolution.",
        hasRasterOnlyElements: false,
        rasterReasons: ['Pilote OS générique'],
      };
    }

    if (model.commandLanguage === 'Generic' && (!instance || instance.printerModelId === null)) {
      return {
        mode: 'raster',
        reason: 'Imprimante générique sans profil de commandes natif - rendu graphique universel.',
        hasRasterOnlyElements: false,
        rasterReasons: ['Commandes génériques'],
      };
    }

    // Inspect template elements
    if (template.items && Array.isArray(template.items)) {
      for (const item of template.items) {
        if (item.type === 'image') {
          rasterReasons.push(`Contient une image ou un logo graphique (${(item as any).source || 'élément image'})`);
        }
        if (item.type === 'curved_text') {
          rasterReasons.push('Contient du texte curviligne (non supporté en commande native vectorielle simple)');
        }
        if (item.type === 'pictogram') {
          rasterReasons.push('Contient un pictogramme vectoriel riche');
        }
        if (item.type === 'shape' && (item as any).corner_radius > 4) {
          rasterReasons.push('Forme complexe avec rayon arrondi non standard');
        }
      }
    }

    if (template.background_image_path && template.background_image_visible !== false) {
      rasterReasons.push('Contient une image de fond de gabarit');
    }

    if (rasterReasons.length > 0) {
      return {
        mode: 'raster',
        reason: `Rendu matriciel (Raster) requis car le gabarit intègre des éléments visuels complexes : ${rasterReasons.join(', ')}.`,
        hasRasterOnlyElements: true,
        rasterReasons,
      };
    }

    return {
      mode: 'native',
      reason: `Rendu vectoriel natif (${model.commandLanguage}) optimal activé pour un tirage ultra-rapide et des contours d'une netteté parfaite à ${instance?.selectedDpi || 203} DPI.`,
      hasRasterOnlyElements: false,
      rasterReasons: [],
    };
  }
}

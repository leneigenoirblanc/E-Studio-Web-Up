import React from 'react';
import { TemplateItem, BarcodeItemProperties } from '../../types';

export interface BarcodePropertiesInspectorProps {
  selectedItem: TemplateItem;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

export const BarcodePropertiesInspector: React.FC<BarcodePropertiesInspectorProps> = ({
  selectedItem,
  onUpdate,
}) => {
  if (selectedItem.type !== 'barcode' && selectedItem.type !== 'qrcode') return null;

  return (
    <div className="pt-2 border-t border-slate-200 space-y-3">
      {/* 1D Barcode */}
      {selectedItem.type === 'barcode' && (
        <>
          <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] tracking-wider text-slate-400">
            Paramètres Code-Barres
          </h4>
          <div>
            <label className="text-[11px] text-slate-500">Type de Code-barres</label>
            <select
              value={(selectedItem as BarcodeItemProperties).barcode_type || 'ean13'}
              onChange={(e) => onUpdate({ barcode_type: e.target.value as any })}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs cursor-pointer"
            >
              <option value="ean13">EAN-13 (Standard grande distribution)</option>
              <option value="code128">Code 128 (Logistique & Alphanumérique)</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-500">Code par défaut (si non lié)</label>
            <input
              type="text"
              value={(selectedItem as BarcodeItemProperties).code || ''}
              onChange={(e) => onUpdate({ code: e.target.value })}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Couleur des Barres</label>
              <input
                type="color"
                value={(selectedItem as BarcodeItemProperties).bar_color || '#000000'}
                onChange={(e) => onUpdate({ bar_color: e.target.value })}
                className="w-full h-7 p-0 rounded border border-slate-300 cursor-pointer mt-0.5"
              />
            </div>
            <div className="flex items-center pt-4">
              <label className="text-[11px] text-slate-600 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean((selectedItem as BarcodeItemProperties).show_text)}
                  onChange={(e) => onUpdate({ show_text: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Afficher texte</span>
              </label>
            </div>
          </div>
        </>
      )}

      {/* 2D QR Code */}
      {selectedItem.type === 'qrcode' && (
        <>
          <h4 className="font-bold text-slate-900 mb-1.5 uppercase text-[10px] tracking-wider text-slate-400">
            Paramètres QR Code
          </h4>
          <div>
            <label className="text-[11px] text-slate-500">Contenu / URL</label>
            <input
              type="text"
              value={(selectedItem as any).content || ''}
              onChange={(e) => onUpdate({ content: e.target.value } as any)}
              className="w-full mt-0.5 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-500">Couleur modules</label>
              <input
                type="color"
                value={(selectedItem as any).module_color || '#000000'}
                onChange={(e) => onUpdate({ module_color: e.target.value } as any)}
                className="w-full h-7 p-0 rounded border border-slate-300 cursor-pointer mt-0.5"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500">Couleur fond</label>
              <input
                type="color"
                value={(selectedItem as any).background_color || '#ffffff'}
                onChange={(e) => onUpdate({ background_color: e.target.value } as any)}
                className="w-full h-7 p-0 rounded border border-slate-300 cursor-pointer mt-0.5"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

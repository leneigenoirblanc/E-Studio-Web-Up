import React from 'react';
import { TemplateItem, RichTextItemProperties, TextRun } from '../../types';
import { Type, Plus, Trash2 } from 'lucide-react';

export interface RichTextPropertiesInspectorProps {
  selectedItem: TemplateItem;
  availableFields: Array<{ key: string; label: string; description?: string }>;
  onUpdate: (patch: Partial<TemplateItem>) => void;
}

export const RichTextPropertiesInspector: React.FC<RichTextPropertiesInspectorProps> = ({
  selectedItem,
  availableFields,
  onUpdate,
}) => {
  if (selectedItem.type !== 'rich_text') return null;

  const item = selectedItem as RichTextItemProperties;
  const runs = item.runs || [];

  return (
    <div className="pt-2 border-t border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-400 flex items-center gap-1">
          <Type className="w-3.5 h-3.5 text-blue-600" />
          <span>Texte Riche & Runs Typographiques</span>
        </h4>
        <button
          type="button"
          onClick={() => {
            const nextRuns: TextRun[] = [
              ...runs,
              {
                id: `run_${Date.now()}`,
                text: 'Nouveau segment',
                font_weight: 'normal',
                font_style: 'normal',
              },
            ];
            onUpdate({ runs: nextRuns });
          }}
          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Segment</span>
        </button>
      </div>

      <div className="space-y-2">
        {runs.map((run, rIdx) => (
          <div key={run.id || rIdx} className="p-2 bg-slate-50 rounded border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500">Segment #{rIdx + 1}</span>
              <button
                type="button"
                onClick={() => {
                  const nextRuns = runs.filter((_, i) => i !== rIdx);
                  onUpdate({ runs: nextRuns });
                }}
                className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500">Texte</label>
                <input
                  type="text"
                  value={run.text || ''}
                  onChange={(e) => {
                    const nextRuns = [...runs];
                    nextRuns[rIdx] = { ...nextRuns[rIdx], text: e.target.value };
                    onUpdate({ runs: nextRuns });
                  }}
                  className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Ou Donnée Liée</label>
                <select
                  value={run.binding_key || ''}
                  onChange={(e) => {
                    const nextRuns = [...runs];
                    nextRuns[rIdx] = { ...nextRuns[rIdx], binding_key: e.target.value || undefined };
                    onUpdate({ runs: nextRuns });
                  }}
                  className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer"
                >
                  <option value="">-- Aucun --</option>
                  {availableFields.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.key}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-500">Taille (pt)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Défaut"
                  value={run.font_size_pt || ''}
                  onChange={(e) => {
                    const nextRuns = [...runs];
                    nextRuns[rIdx] = {
                      ...nextRuns[rIdx],
                      font_size_pt: e.target.value ? parseFloat(e.target.value) : undefined,
                    };
                    onUpdate({ runs: nextRuns });
                  }}
                  className="w-full px-1.5 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Graisse</label>
                <select
                  value={run.font_weight || 'normal'}
                  onChange={(e) => {
                    const nextRuns = [...runs];
                    nextRuns[rIdx] = { ...nextRuns[rIdx], font_weight: e.target.value as any };
                    onUpdate({ runs: nextRuns });
                  }}
                  className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer"
                >
                  <option value="normal">Normal</option>
                  <option value="600">Demi-Gras</option>
                  <option value="bold">Gras</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Position</label>
                <select
                  value={run.baseline_shift || 'normal'}
                  onChange={(e) => {
                    const nextRuns = [...runs];
                    nextRuns[rIdx] = { ...nextRuns[rIdx], baseline_shift: e.target.value as any };
                    onUpdate({ runs: nextRuns });
                  }}
                  className="w-full px-1 py-1 bg-white border border-slate-300 rounded text-xs cursor-pointer"
                >
                  <option value="normal">Normale</option>
                  <option value="superscript">Exposant</option>
                  <option value="subscript">Indice</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

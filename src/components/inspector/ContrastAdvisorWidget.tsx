import React from 'react';
import { auditColorContrast } from '../../utils/colorContrastEngine';
import { CheckCircle2, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react';

interface ContrastAdvisorWidgetProps {
  textColor: string;
  bgColor?: string;
  fontSizePt?: number;
  isBold?: boolean;
  onApplyRecommended?: (color: string) => void;
}

export const ContrastAdvisorWidget: React.FC<ContrastAdvisorWidgetProps> = ({
  textColor,
  bgColor = '#ffffff',
  fontSizePt = 11,
  isBold = false,
  onApplyRecommended,
}) => {
  const effectiveBg = !bgColor || bgColor === 'transparent' ? '#ffffff' : bgColor;
  const audit = auditColorContrast(textColor, effectiveBg, fontSizePt, isBold);

  const badgeColor =
    audit.scoreText === 'AAA'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
      : audit.scoreText === 'AA' || audit.scoreText === 'AA Large'
      ? 'bg-blue-50 text-blue-700 border-blue-300'
      : 'bg-rose-50 text-rose-700 border-rose-300';

  return (
    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
          <span>Contraste & Lisibilité (WCAG 2.1)</span>
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeColor}`}>
          {audit.scoreText} • {audit.ratio}:1
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2">
          {audit.isAccessible ? (
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conforme aux normes rayon</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-rose-700 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Contraste insuffisant</span>
            </div>
          )}
        </div>

        {audit.recommendedTextColor && onApplyRecommended && (
          <button
            type="button"
            onClick={() => onApplyRecommended(audit.recommendedTextColor!)}
            className="px-2 py-0.5 text-[10px] font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 rounded flex items-center gap-1 transition cursor-pointer"
            title={`Optimiser vers ${audit.recommendedTextColor}`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Corriger ({audit.recommendedTextColor})</span>
          </button>
        )}
      </div>
    </div>
  );
};

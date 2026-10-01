/**
 * Preflight Report Modal
 * Affichage et inspection détaillée des contrôles qualité automatisés
 * (codes-barres, cohérence des prix, débordements géométriques, imposition).
 */

import React from 'react';
import { PreflightReport, PreflightIssue } from '../domain/workflow/types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  Barcode,
  DollarSign,
  Maximize2,
  Grid,
  Zap,
} from 'lucide-react';

interface PreflightReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PreflightReport | null;
  onSelectProduct?: (productId: string) => void;
}

export const PreflightReportModal: React.FC<PreflightReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onSelectProduct,
}) => {
  const [filterSeverity, setFilterSeverity] = React.useState<'ALL' | 'BLOCKING' | 'WARNING' | 'INFO'>('ALL');

  if (!isOpen || !report) return null;

  const filteredIssues = report.issues.filter((issue) => {
    if (filterSeverity === 'ALL') return true;
    return issue.severity === filterSeverity;
  });

  const getCategoryIcon = (cat: PreflightIssue['category']) => {
    switch (cat) {
      case 'BARCODE':
        return <Barcode className="w-4 h-4 text-purple-400" />;
      case 'PRICING':
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'GEOMETRY':
        return <Maximize2 className="w-4 h-4 text-blue-400" />;
      case 'IMPOSITION':
        return <Grid className="w-4 h-4 text-amber-400" />;
      default:
        return <Zap className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                report.status === 'PASS'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : report.status === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {report.status === 'PASS' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Rapport de Preflight Automatisé</h2>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                    report.status === 'PASS'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : report.status === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {report.status === 'PASS'
                    ? 'Conforme BÀT'
                    : report.status === 'WARNING'
                    ? 'Avertissements Tolérés'
                    : 'Bloqué — Erreurs Détectées'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {report.totalChecked} article(s) contrôlé(s) avant génération d'artefacts
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-slate-950/40 border-b border-slate-800 text-xs">
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`p-2.5 rounded-xl border text-left transition ${
              filterSeverity === 'ALL'
                ? 'bg-slate-800 border-slate-600'
                : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
            }`}
          >
            <div className="text-[11px] text-slate-400">Total Anomalies</div>
            <div className="text-base font-bold text-white">{report.issues.length}</div>
          </button>

          <button
            onClick={() => setFilterSeverity('BLOCKING')}
            className={`p-2.5 rounded-xl border text-left transition ${
              filterSeverity === 'BLOCKING'
                ? 'bg-rose-950/60 border-rose-500/60'
                : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
            }`}
          >
            <div className="text-[11px] text-rose-400 font-medium">Bloquants (Bypass refusé)</div>
            <div className="text-base font-bold text-rose-400">{report.blockingCount}</div>
          </button>

          <button
            onClick={() => setFilterSeverity('WARNING')}
            className={`p-2.5 rounded-xl border text-left transition ${
              filterSeverity === 'WARNING'
                ? 'bg-amber-950/60 border-amber-500/60'
                : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
            }`}
          >
            <div className="text-[11px] text-amber-400 font-medium">Avertissements</div>
            <div className="text-base font-bold text-amber-400">{report.warningCount}</div>
          </button>

          <button
            onClick={() => setFilterSeverity('INFO')}
            className={`p-2.5 rounded-xl border text-left transition ${
              filterSeverity === 'INFO'
                ? 'bg-blue-950/60 border-blue-500/60'
                : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
            }`}
          >
            <div className="text-[11px] text-blue-400 font-medium">Remarques & Conseils</div>
            <div className="text-base font-bold text-blue-400">{report.infoCount}</div>
          </button>
        </div>

        {/* Issues List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3">
          {filteredIssues.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
              <h3 className="text-sm font-bold text-white">Aucune anomalie détectée dans ce filtre</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Tous les codes-barres, calculs de prix et contraintes de gabarit respectent les règles de production.
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition ${
                  issue.severity === 'BLOCKING'
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : issue.severity === 'WARNING'
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getCategoryIcon(issue.category)}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{issue.message}</span>
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-bold uppercase rounded ${
                          issue.severity === 'BLOCKING'
                            ? 'bg-rose-500/30 text-rose-300'
                            : issue.severity === 'WARNING'
                            ? 'bg-amber-500/30 text-amber-300'
                            : 'bg-blue-500/30 text-blue-300'
                        }`}
                      >
                        {issue.severity}
                      </span>
                    </div>

                    {issue.productName && (
                      <div className="text-[11px] text-slate-400">
                        Article concerné : <strong className="text-slate-200">{issue.productName}</strong>
                        {issue.barcode && <span className="ml-2 font-mono">({issue.barcode})</span>}
                      </div>
                    )}

                    {issue.recommendation && (
                      <div className="text-[11px] text-indigo-300 bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-2 mt-2">
                        💡 Recommandation : {issue.recommendation}
                      </div>
                    )}
                  </div>
                </div>

                {issue.productId && onSelectProduct && (
                  <button
                    onClick={() => {
                      onSelectProduct(issue.productId!);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs shrink-0 transition"
                  >
                    Examiner l'article
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {report.blockingCount > 0 ? (
              <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Le mode Express est bloqué tant que les anomalies critiques ne sont pas résolues.
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Dataset prêt pour le Bon à Tirer (BÀT) et l'impression physique.
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Fermer le Rapport
          </button>
        </div>
      </div>
    </div>
  );
};

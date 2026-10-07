/**
 * E-Studio Activity & Audit Workspace
 * Conforms to SECTION 5 & 34: ONE REAL AUDIT STREAM
 * 
 * Append-only operational history and audit trail.
 * Searchable and filterable by who, what, when, job, and outcome.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { auditRepository } from '../domain/repositories/auditRepository';
import { AuditEvent } from '../domain/persistenceTypes';
import {
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Shield,
  Tag,
  Printer,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Trash2,
} from 'lucide-react';

export const ActivityWorkspace: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>(() => auditRepository.getAll());
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  useEffect(() => {
    const unsub = auditRepository.subscribe((updated) => setEvents(updated));
    return unsub;
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchSearch =
        ev.action.toLowerCase().includes(search.toLowerCase()) ||
        (ev.operator || '').toLowerCase().includes(search.toLowerCase()) ||
        (ev.entityId || '').toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(ev.metadata || {}).toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      if (actionFilter === 'ALL') return true;
      if (actionFilter === 'OUTPUT') return ev.action.includes('OUTPUT') || ev.action.includes('PRINT');
      if (actionFilter === 'JOB') return ev.action.includes('JOB');
      if (actionFilter === 'TEMPLATE') return ev.action.includes('TEMPLATE');
      return true;
    });
  }, [events, search, actionFilter]);

  const handleExportAudit = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `estudio_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100">Journal d'Activité & Traçabilité ({events.length})</h1>
            <p className="text-[11px] text-slate-400">Flux d'audit immuable des opérations de production</p>
          </div>
        </div>

        <button
          onClick={handleExportAudit}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Exporter l'Audit (JSON)
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="h-11 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/30 shrink-0">
        <div className="relative w-80">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par opérateur, action, référence..."
            className="w-full bg-slate-900 border border-slate-750 text-xs rounded pl-8 pr-2.5 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['ALL', 'OUTPUT', 'JOB', 'TEMPLATE'] as const).map((af) => (
            <button
              key={af}
              onClick={() => setActionFilter(af)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                actionFilter === af
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-850 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {af === 'ALL'
                ? 'Toutes les actions'
                : af === 'OUTPUT'
                ? 'Impressions & Sorties'
                : af === 'JOB'
                ? 'Travaux de tirage'
                : 'Gabarits'}
            </button>
          ))}
        </div>
      </div>

      {/* Events table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
          <table className="w-full text-left text-xs divide-y divide-slate-800">
            <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Horodatage</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entité & ID</th>
                <th className="p-3">Opérateur</th>
                <th className="p-3">Détails & Métadonnées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-sans text-xs">
                    Aucun événement d'audit enregistré.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => {
                  const isSuccess =
                    ev.action.includes('CREATED') ||
                    ev.action.includes('SAVED') ||
                    (ev.metadata?.outcome === 'ACKNOWLEDGED' || ev.metadata?.outcome === 'HANDED_TO_SYSTEM');
                  const isFail = ev.metadata?.outcome === 'FAILED' || ev.action.includes('ERROR');
                  const isWarning = ev.metadata?.outcome === 'PARTIAL';

                  return (
                    <tr key={ev.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : isFail
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : isWarning
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {ev.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-200">
                        {ev.entityType ? <strong className="text-slate-400 font-sans mr-1">{ev.entityType}:</strong> : null}
                        <span className="text-blue-400">{ev.entityId || '—'}</span>
                      </td>
                      <td className="p-3 text-slate-300 font-sans">{ev.operator || 'Opérateur'}</td>
                      <td className="p-3 text-slate-400 font-sans">
                        {ev.metadata ? (
                          <span className="text-[11px] text-slate-300">
                            {Object.entries(ev.metadata)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

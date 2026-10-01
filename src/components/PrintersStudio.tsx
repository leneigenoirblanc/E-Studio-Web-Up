import React, { useState, useEffect } from 'react';
import {
  Printer,
  Plus,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Trash2,
  Search,
  Filter,
  Check,
  X,
  FileText,
  Clock,
  ExternalLink,
  Wifi,
  RefreshCw,
  Zap,
  Usb,
  Bluetooth,
  Sparkles,
  Info,
} from 'lucide-react';
import { PrinterInstance, PrinterModel, PrintJob } from '../domain/printing/types';
import { printerRepository } from '../domain/printing/printerRepository';
import { CANONICAL_PRINTER_MODELS } from '../domain/printing/printerModelCatalog';
import { formatRepository } from '../domain/printing/formatRepository';
import { printJobService } from '../domain/printing/printJobService';
import { AddPrinterWizard } from './wizards/AddPrinterWizard';
import { PrinterAdapterFactory } from '../domain/printing/adapters/PrinterAdapterFactory';
import { useToast } from './ToastNotification';
import { printerDiscoveryService, DiscoveredPrinter } from '../services/printerDiscoveryService';

export const PrintersStudio: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'printers' | 'catalog' | 'queue'>('printers');
  const [printers, setPrinters] = useState<PrinterInstance[]>(printerRepository.getAll());
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);
  const [selectedDiscoveredForWizard, setSelectedDiscoveredForWizard] = useState<DiscoveredPrinter | null>(null);
  const [selectedPresetForWizard, setSelectedPresetForWizard] = useState<PrinterModel | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Network & Live Discovery state
  const [isNetworkScanning, setIsNetworkScanning] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);

  // Test print loading states
  const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null);

  // Calibration fine-tuning modal state
  const [calibratingPrinter, setCalibratingPrinter] = useState<PrinterInstance | null>(null);
  const [calibH, setCalibH] = useState(0);
  const [calibV, setCalibV] = useState(0);

  // Deletion confirmation
  const [deletingPrinter, setDeletingPrinter] = useState<PrinterInstance | null>(null);

  const refreshPrinters = () => {
    setPrinters([...printerRepository.getAll()]);
  };

  const runNetworkScan = async () => {
    setIsNetworkScanning(true);
    try {
      const results = await printerDiscoveryService.discoverNetworkPrinters();
      setDiscoveredPrinters(results);
      setLastScanTime(Date.now());
      if (results.length > 0) {
        toast.success(
          'Découverte Réseau Réussie',
          `${results.length} imprimante(s) physique(s) détectée(s) via mDNS / Bonjour / RAW.`
        );
      } else {
        toast.info(
          'Scan Réseau Terminé',
          'Aucune nouvelle imprimante réseau détectée automatiquement. Vous pouvez ajouter une unité manuellement ou via USB.'
        );
      }
    } catch {
      toast.error('Erreur de scan réseau', 'Impossible de scanner le sous-réseau local.');
    } finally {
      setIsNetworkScanning(false);
    }
  };

  const handleOpenAddWithDiscovered = (dp: DiscoveredPrinter) => {
    setSelectedDiscoveredForWizard(dp);
    setSelectedPresetForWizard(null);
    setIsAddWizardOpen(true);
  };

  const handleOpenAddWithPreset = (model: PrinterModel) => {
    setSelectedDiscoveredForWizard(null);
    setSelectedPresetForWizard(model);
    setIsAddWizardOpen(true);
  };

  const handleTestPrint = async (printer: PrinterInstance) => {
    setTestingPrinterId(printer.id);
    const model = printerRepository.getModelForInstance(printer);
    const defaultFormat = formatRepository.getById(printer.defaultLabelFormatId || 'fmt-shelf-60x40') || formatRepository.getAll()[0];
    const adapter = PrinterAdapterFactory.getAdapter(model, printer);

    try {
      await adapter.generateTestLabel(printer, defaultFormat, model);
      setTimeout(() => {
        setTestingPrinterId(null);
        toast.success(
          'Épreuve de tirage transmise',
          `Mire de calibrage envoyée avec succès vers ${printer.name} (${printer.selectedDpi} DPI)`
        );
      }, 700);
    } catch {
      setTestingPrinterId(null);
      toast.error('Erreur de communication', `Impossible d'émettre l'épreuve vers ${printer.name}`);
    }
  };

  const handleOpenCalibration = (p: PrinterInstance) => {
    setCalibratingPrinter(p);
    setCalibH(p.calibrationOffsets?.horizontal || 0);
    setCalibV(p.calibrationOffsets?.vertical || 0);
  };

  const handleSaveCalibration = () => {
    if (!calibratingPrinter) return;
    printerRepository.updateCalibration(calibratingPrinter.id, {
      ...calibratingPrinter.calibrationOffsets,
      horizontal: calibH,
      vertical: calibV,
    });
    refreshPrinters();
    setCalibratingPrinter(null);
    toast.success('Calibrage enregistré', `Offsets mis à jour pour ${calibratingPrinter.name}`);
  };

  const handleDeleteConfirm = () => {
    if (!deletingPrinter) return;
    printerRepository.removePrinter(deletingPrinter.id);
    refreshPrinters();
    setDeletingPrinter(null);
    toast.warning('Imprimante retirée', 'La configuration de l\'appareil a été supprimée.');
  };

  const filteredPrinters = printers.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredModels = CANONICAL_PRINTER_MODELS.filter((m) => {
    const matchesSearch =
      m.manufacturer.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.model.toLowerCase().includes(modelSearch.toLowerCase());
    const matchesType = typeFilter === 'all' || m.printerType === typeFilter;
    return matchesSearch && matchesType;
  });

  const jobs = printJobService.getAll();

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-blue-400" />
            <span>Gestionnaire d'Imprimantes &amp; Périphériques</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Détection automatique mDNS/Bonjour · Prise en charge des gabarits constructeurs pour ajustement physique
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={runNetworkScan}
            disabled={isNetworkScanning}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isNetworkScanning ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
            <span>{isNetworkScanning ? 'Scan Réseau...' : 'Découvrir mDNS / IP'}</span>
          </button>

          <button
            onClick={() => {
              setSelectedDiscoveredForWizard(null);
              setSelectedPresetForWizard(null);
              setIsAddWizardOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une imprimante</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex items-center gap-4">
        <button
          onClick={() => setActiveTab('printers')}
          className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'printers'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Imprimantes Configurées ({printers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Catalogue Fabricants &amp; Presets de Gabarits ({CANONICAL_PRINTER_MODELS.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>File d'Impression &amp; Spooler ({jobs.length})</span>
        </button>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* TAB 1: Configured Printers & Discovered Network Devices */}
        {activeTab === 'printers' && (
          <div className="space-y-6">
            {/* Live Network Discovered Banner if any found */}
            {discoveredPrinters.length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-bold">
                      {discoveredPrinters.length} imprimante(s) physique(s) détectée(s) sur le réseau local (mDNS / Bonjour / RAW)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-500 font-mono">
                    Scan actif
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {discoveredPrinters.map((dp) => (
                    <div
                      key={dp.id}
                      className="p-3 bg-slate-900/90 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{dp.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {dp.address}:{dp.port} · {dp.protocol}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenAddWithDiscovered(dp)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shrink-0 transition"
                      >
                        Configurer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search toolbar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher une imprimante installée..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Empty State */}
            {filteredPrinters.length === 0 && (
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-10 text-center max-w-lg mx-auto my-8">
                <Printer className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Aucune imprimante physique configurée</h3>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Connectez votre imprimante d'étiquettes ou bureautique via le réseau local (mDNS/Bonjour), USB ou Bluetooth, ou ajoutez-la manuellement avec son adresse IP.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={runNetworkScan}
                    disabled={isNetworkScanning}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isNetworkScanning ? 'animate-spin' : ''}`} />
                    <span>Détecter sur le réseau</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDiscoveredForWizard(null);
                      setSelectedPresetForWizard(null);
                      setIsAddWizardOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow"
                  >
                    Ajouter manuellement
                  </button>
                </div>
              </div>
            )}

            {/* Printers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrinters.map((p) => {
                const model = printerRepository.getModelForInstance(p);
                const defaultFormat = formatRepository.getById(p.defaultLabelFormatId || '');
                const isTesting = testingPrinterId === p.id;

                return (
                  <div
                    key={p.id}
                    className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition shadow-sm"
                  >
                    <div>
                      {/* Status row */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                          {p.connectionType} {p.connectionDetails?.address ? `(${p.connectionDetails.address})` : ''}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              p.status === 'READY'
                                ? 'bg-emerald-500 animate-pulse'
                                : p.status === 'PRINTING'
                                ? 'bg-blue-500 animate-spin'
                                : 'bg-slate-500'
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-300">
                            {p.status === 'READY'
                              ? 'Prête'
                              : p.status === 'PRINTING'
                              ? 'Impression en cours'
                              : p.status === 'OFFLINE'
                              ? 'Hors ligne'
                              : p.status}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-white text-sm mb-0.5">{p.name}</h3>
                      <p className="text-xs text-slate-400 mb-3">
                        Preset : {model ? `${model.manufacturer} ${model.model} (${model.commandLanguage})` : 'Générique'} • {p.selectedDpi} DPI
                      </p>

                      {/* Capabilities & Offsets */}
                      <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800/80 mb-3 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Gabarit par défaut :</span>
                          <span className="font-semibold text-slate-200">{defaultFormat?.name || 'Standard 60×40'}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Offsets calibrage :</span>
                          <span className="font-mono text-slate-300">
                            H:{p.calibrationOffsets?.horizontal || 0}mm / V:{p.calibrationOffsets?.vertical || 0}mm
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5">
                            <Check className="w-3 h-3 text-emerald-400" /> Barcode
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Check className="w-3 h-3 text-emerald-400" /> QR Code
                          </span>
                          <span className="flex items-center gap-0.5">
                            {model?.capabilities.cutter ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <X className="w-3 h-3 text-slate-600" />
                            )}
                            Massicot
                          </span>
                          <span className="flex items-center gap-0.5">
                            {model?.capabilities.peeler ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <X className="w-3 h-3 text-slate-600" />
                            )}
                            Décolleur
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleTestPrint(p)}
                        disabled={isTesting}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Play className={`w-3 h-3 text-blue-400 ${isTesting ? 'animate-spin' : ''}`} />
                        <span>{isTesting ? 'Émission...' : 'Test Tirage'}</span>
                      </button>
                      <button
                        onClick={() => handleOpenCalibration(p)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="Calibrer les offsets"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingPrinter(p)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
                        title="Supprimer cette imprimante"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Manufacturer Models Catalog (Presets for gabarit fitting & capabilities) */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Explanatory Banner */}
            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-200">
                <p className="font-bold mb-0.5">Presets de Gabarits &amp; Dimensions Constructeurs</p>
                <p className="text-blue-300/80 leading-relaxed">
                  Ces profils constituent des <strong>modèles de référence</strong>. Ils permettent d'adapter n'importe quelle étiquette ou gabarit de composition aux contraintes physiques réelles d'une marque (largeur de tête max, résolutions 203/300/600 DPI, langage de commande natif ZPL, TSPL, ESC/POS).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filtrer modèles (Zebra, TSC, Brother, EPSON, Dymo...)"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {['all', 'Label Printer', 'Industrial Printer', 'POS-Receipt Printer', 'Office Printer'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      typeFilter === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === 'all' ? 'Tous types' : t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-blue-400">{m.manufacturer}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {m.commandLanguage}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-sm">{m.model}</h4>
                    <p className="text-xs text-slate-400 mb-2">{m.family} • {m.technology}</p>

                    <div className="space-y-1 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Largeur max tête :</span>
                        <span className="font-semibold text-slate-200">{m.maxMediaWidth} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Résolutions supportées :</span>
                        <span className="font-semibold text-slate-200">{m.resolutionOptions.join(', ')} DPI</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Connexions :</span>
                        <span className="text-slate-300">{m.supportedConnectionTypes.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 mt-3 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500">
                      {m.capabilities.cutter ? 'Massicot supporté' : 'Sans massicot'}
                    </span>
                    <button
                      onClick={() => handleOpenAddWithPreset(m)}
                      className="px-3 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Utiliser ce gabarit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Print Queue & Resumable Jobs */}
        {activeTab === 'queue' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {jobs.length === 0 ? (
              <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-10 text-center">
                <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-white mb-1">Aucun travail en file d'attente</h3>
                <p className="text-xs text-slate-400">Vos impressions actives et terminées apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((j) => (
                  <div
                    key={j.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white text-sm">{j.templateName}</span>
                        <span className="text-xs text-slate-400">({j.labelFormatName})</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            j.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : j.status === 'PRINTING'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                              : j.status === 'PARTIAL' || j.status === 'FAILED'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {j.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400">
                        Imprimante : <strong className="text-slate-200">{j.printerName}</strong> • {j.totalLabels} étiquettes • Mode {j.renderingMode.toUpperCase()}
                      </p>

                      {j.status === 'PARTIAL' && (
                        <p className="text-xs text-amber-400 mt-1">
                          Arrêt à l'étiquette #{j.lastCompletedIndex + 1}/{j.totalLabels}. Prêt pour reprise immédiate.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {j.status === 'PARTIAL' && (
                        <button
                          onClick={() => {
                            printJobService.resumeJob(j.id);
                            toast.info('Reprise de lot', 'Impression relancée à partir de la dernière étiquette validée');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
                        >
                          Reprendre le lot
                        </button>
                      )}
                      {j.failedIndices && j.failedIndices.length > 0 && (
                        <button
                          onClick={() => {
                            printJobService.retryFailed(j.id);
                            toast.info('Relance ciblée', 'Impression des étiquettes en échec uniquement');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition"
                        >
                          Réimprimer les échecs
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Printer Wizard Modal */}
      <AddPrinterWizard
        isOpen={isAddWizardOpen}
        onClose={() => {
          setIsAddWizardOpen(false);
          setSelectedDiscoveredForWizard(null);
          setSelectedPresetForWizard(null);
        }}
        initialDiscoveredPrinter={selectedDiscoveredForWizard}
        initialPresetModel={selectedPresetForWizard}
        onPrinterAdded={(newInst) => {
          refreshPrinters();
          toast.success('Imprimante ajoutée', `L'imprimante ${newInst.name} est prête à l'emploi.`);
        }}
      />

      {/* Recalibrate Offsets Modal */}
      {calibratingPrinter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Calibrer {calibratingPrinter.name}</h3>
              <button
                onClick={() => setCalibratingPrinter(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Ajustez les décalages mécaniques en millimètres pour compenser le bord de cellule ou l'échenillage.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Décalage Horizontal (mm) : <span className="font-bold text-blue-400">{calibH} mm</span>
                </label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={calibH}
                  onChange={(e) => setCalibH(parseFloat(e.target.value) || 0)}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Décalage Vertical (mm) : <span className="font-bold text-blue-400">{calibV} mm</span>
                </label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={calibV}
                  onChange={(e) => setCalibV(parseFloat(e.target.value) || 0)}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCalibratingPrinter(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCalibration}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition shadow"
              >
                Enregistrer le calibrage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPrinter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-white text-base">Supprimer "{deletingPrinter.name}" ?</h3>
            </div>
            <p className="text-xs text-slate-300">
              Cette action supprimera l'association de connexion et les calibrages d'offsets pour cette imprimante.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingPrinter(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

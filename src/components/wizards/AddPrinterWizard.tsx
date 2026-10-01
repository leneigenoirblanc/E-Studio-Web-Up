import React, { useState, useId, useEffect } from 'react';
import {
  X,
  Printer,
  Wifi,
  Usb,
  Bluetooth,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  RefreshCw,
  Check,
  ChevronRight,
  Radio,
  ExternalLink,
  Zap,
  Activity,
  Sparkles,
} from 'lucide-react';
import {
  PrinterConnectionType,
  PrinterModel,
  PrinterInstance,
  LabelFormat,
} from '../../domain/printing/types';
import { CANONICAL_PRINTER_MODELS } from '../../domain/printing/printerModelCatalog';
import { formatRepository } from '../../domain/printing/formatRepository';
import { printerRepository } from '../../domain/printing/printerRepository';
import { PrinterAdapterFactory } from '../../domain/printing/adapters/PrinterAdapterFactory';
import { printerDiscoveryService, DiscoveredPrinter } from '../../services/printerDiscoveryService';

interface AddPrinterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onPrinterAdded: (newInstance: PrinterInstance) => void;
  initialDiscoveredPrinter?: DiscoveredPrinter | null;
  initialPresetModel?: PrinterModel | null;
}

export const AddPrinterWizard: React.FC<AddPrinterWizardProps> = ({
  isOpen,
  onClose,
  onPrinterAdded,
  initialDiscoveredPrinter,
  initialPresetModel,
}) => {
  const wizardTitleId = useId();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Step 1: Connection & Hardware Discovery
  const [connectionType, setConnectionType] = useState<PrinterConnectionType>(
    initialDiscoveredPrinter?.connectionType || 'Ethernet'
  );
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [discoveredUnits, setDiscoveredUnits] = useState<DiscoveredPrinter[]>([]);
  const [selectedDiscoveredId, setSelectedDiscoveredId] = useState<string | null>(
    initialDiscoveredPrinter?.id || null
  );

  const [networkAddress, setNetworkAddress] = useState<string>(
    initialDiscoveredPrinter?.address || '192.168.1.100'
  );
  const [networkPort, setNetworkPort] = useState<number>(
    initialDiscoveredPrinter?.port || 9100
  );

  // Probe testing state for manual IP
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [probeResult, setProbeResult] = useState<{
    tested: boolean;
    reachable: boolean;
    latencyMs?: number;
    details?: string;
  } | null>(null);

  // Step 2: Manufacturer Preset Association (Gabarit / Emulation / Dimensions)
  const [selectedModel, setSelectedModel] = useState<PrinterModel>(
    initialPresetModel || CANONICAL_PRINTER_MODELS[0]
  );
  const [printerCustomName, setPrinterCustomName] = useState<string>(
    initialDiscoveredPrinter?.name || `${CANONICAL_PRINTER_MODELS[0].manufacturer} ${CANONICAL_PRINTER_MODELS[0].model}`
  );
  const [modelPresetAutoMatched, setModelPresetAutoMatched] = useState<boolean>(false);

  // Step 3: Hardware Parameters & Calibration
  const [selectedDpi, setSelectedDpi] = useState<number>(203);
  const [darkness, setDarkness] = useState<number>(18);
  const [printSpeedIps, setPrintSpeedIps] = useState<number>(6);
  const [calibHorizontal, setCalibHorizontal] = useState<number>(0);
  const [calibVertical, setCalibVertical] = useState<number>(0);
  const [calibRotation, setCalibRotation] = useState<0 | 90 | 180 | 270>(0);
  const [calibScale, setCalibScale] = useState<number>(1.0);

  // Step 4: Default Label Format
  const formats = formatRepository.getAll();
  const [defaultFormatId, setDefaultFormatId] = useState<string>(
    formats[0]?.id || 'fmt-shelf-60x40'
  );

  // Step 5: Test Print
  const [isTestPrinting, setIsTestPrinting] = useState<boolean>(false);
  const [testPrintDone, setTestPrintDone] = useState<boolean>(false);
  const [testPrintStatus, setTestPrintStatus] = useState<'untested' | 'success' | 'needs_adjustment'>('untested');
  const [adjustSymptom, setAdjustSymptom] = useState<string>('');

  const [scanErrorMessage, setScanErrorMessage] = useState<string>('');

  // Pre-load if props change
  useEffect(() => {
    if (initialDiscoveredPrinter) {
      setNetworkAddress(initialDiscoveredPrinter.address);
      setNetworkPort(initialDiscoveredPrinter.port);
      setConnectionType(initialDiscoveredPrinter.connectionType);
      setPrinterCustomName(initialDiscoveredPrinter.name);
      setSelectedDiscoveredId(initialDiscoveredPrinter.id);
      setDiscoveredUnits([initialDiscoveredPrinter]);
      const matched = printerDiscoveryService.matchPreset(
        initialDiscoveredPrinter.manufacturer,
        initialDiscoveredPrinter.model,
        initialDiscoveredPrinter.name
      );
      setSelectedModel(matched);
      setSelectedDpi(matched.resolutionOptions[0] || 203);
      setModelPresetAutoMatched(true);
    } else if (initialPresetModel) {
      setSelectedModel(initialPresetModel);
      setPrinterCustomName(`${initialPresetModel.manufacturer} ${initialPresetModel.model}`);
      setSelectedDpi(initialPresetModel.resolutionOptions[0] || 203);
    }
  }, [initialDiscoveredPrinter, initialPresetModel]);

  if (!isOpen) return null;

  const resolvedFormat = formats.find((f) => f.id === defaultFormatId) || formats[0];

  // Auto-discovery routine for Network (mDNS/Bonjour & Subnet)
  const handleScanNetwork = async () => {
    setIsScanning(true);
    setScanErrorMessage('');
    try {
      const units = await printerDiscoveryService.discoverNetworkPrinters();
      setDiscoveredUnits(units);
      if (units.length > 0) {
        const first = units[0];
        setSelectedDiscoveredId(first.id);
        setNetworkAddress(first.address);
        setNetworkPort(first.port);
        setPrinterCustomName(first.name);
        const matched = printerDiscoveryService.matchPreset(first.manufacturer, first.model, first.name);
        setSelectedModel(matched);
        setSelectedDpi(matched.resolutionOptions[0] || 203);
        setModelPresetAutoMatched(true);
      }
    } catch (err: any) {
      setScanErrorMessage(err.message || 'Erreur lors du scan réseau.');
    } finally {
      setIsScanning(false);
    }
  };

  // WebUSB Discovery
  const handleScanUsb = async () => {
    setIsScanning(true);
    setScanErrorMessage('');
    try {
      const usbRes = await printerDiscoveryService.requestUsbDevice();
      setPrinterCustomName(usbRes.name);
      setSelectedModel(usbRes.suggestedModel);
      setSelectedDpi(usbRes.suggestedModel.resolutionOptions[0] || 203);
      setModelPresetAutoMatched(true);
      const newDiscovered: DiscoveredPrinter = {
        id: `usb-${Date.now()}`,
        name: usbRes.name,
        address: 'USB Direct',
        port: 0,
        protocol: 'WebUSB',
        connectionType: 'USB',
        discoveredAt: Date.now(),
        status: 'ONLINE',
        details: usbRes.details,
      };
      setDiscoveredUnits([newDiscovered]);
      setSelectedDiscoveredId(newDiscovered.id);
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setScanErrorMessage(err.message || 'Accès USB impossible.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Web Bluetooth Discovery
  const handleScanBluetooth = async () => {
    setIsScanning(true);
    setScanErrorMessage('');
    try {
      const btRes = await printerDiscoveryService.requestBluetoothDevice();
      setPrinterCustomName(btRes.name);
      setSelectedModel(btRes.suggestedModel);
      setSelectedDpi(btRes.suggestedModel.resolutionOptions[0] || 203);
      setModelPresetAutoMatched(true);
      const newDiscovered: DiscoveredPrinter = {
        id: `bt-${Date.now()}`,
        name: btRes.name,
        address: 'Bluetooth',
        port: 0,
        protocol: 'Bluetooth',
        connectionType: 'Bluetooth',
        discoveredAt: Date.now(),
        status: 'ONLINE',
        details: btRes.details,
      };
      setDiscoveredUnits([newDiscovered]);
      setSelectedDiscoveredId(newDiscovered.id);
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setScanErrorMessage(err.message || 'Recherche Bluetooth impossible.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Web Serial Discovery
  const handleScanSerial = async () => {
    setIsScanning(true);
    setScanErrorMessage('');
    try {
      const serialRes = await printerDiscoveryService.requestSerialDevice();
      setPrinterCustomName(serialRes.name);
      setSelectedModel(serialRes.suggestedModel);
      setSelectedDpi(serialRes.suggestedModel.resolutionOptions[0] || 203);
      setModelPresetAutoMatched(true);
      const newDiscovered: DiscoveredPrinter = {
        id: `serial-${Date.now()}`,
        name: serialRes.name,
        address: 'COM Direct',
        port: 0,
        protocol: 'RAW 9100',
        connectionType: 'Serial',
        discoveredAt: Date.now(),
        status: 'ONLINE',
        details: serialRes.details,
      };
      setDiscoveredUnits([newDiscovered]);
      setSelectedDiscoveredId(newDiscovered.id);
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setScanErrorMessage(err.message || 'Connexion Port Série impossible.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Manual IP Probe
  const handleProbeAddress = async () => {
    setIsProbing(true);
    setProbeResult(null);
    try {
      const res = await printerDiscoveryService.probeAddress(networkAddress, networkPort);
      setProbeResult({
        tested: true,
        reachable: res.reachable,
        latencyMs: res.latencyMs,
        details: res.details,
      });
      if (res.reachable) {
        setSelectedModel(res.suggestedModel);
        setSelectedDpi(res.suggestedModel.resolutionOptions[0] || 203);
        setModelPresetAutoMatched(true);
      }
    } catch (err: any) {
      setProbeResult({
        tested: true,
        reachable: false,
        details: err.message || 'Impossible de joindre cette adresse',
      });
    } finally {
      setIsProbing(false);
    }
  };

  const handleSelectDiscoveredUnit = (unit: DiscoveredPrinter) => {
    setSelectedDiscoveredId(unit.id);
    setNetworkAddress(unit.address);
    setNetworkPort(unit.port);
    setConnectionType(unit.connectionType);
    setPrinterCustomName(unit.name);
    const matched = printerDiscoveryService.matchPreset(unit.manufacturer, unit.model, unit.name);
    setSelectedModel(matched);
    setSelectedDpi(matched.resolutionOptions[0] || 203);
    setModelPresetAutoMatched(true);
  };

  const handleTestPrint = async () => {
    setIsTestPrinting(true);
    const tempInstance: PrinterInstance = {
      id: 'temp-test-id',
      name: printerCustomName,
      printerModelId: selectedModel.id,
      connectionType,
      connectionDetails: {
        address: networkAddress,
        port: networkPort,
      },
      selectedDpi,
      calibrationOffsets: {
        horizontal: calibHorizontal,
        vertical: calibVertical,
        rotation: calibRotation,
        scale: calibScale,
      },
      darkness,
      printSpeedIps,
      status: 'READY',
      createdAt: Date.now(),
    };

    const adapter = PrinterAdapterFactory.getAdapter(selectedModel, tempInstance);
    await adapter.generateTestLabel(tempInstance, resolvedFormat, selectedModel);

    setTimeout(() => {
      setIsTestPrinting(false);
      setTestPrintDone(true);
    }, 900);
  };

  const handleFinish = () => {
    const newInstance = printerRepository.addPrinter({
      name: printerCustomName.trim() || `${selectedModel.manufacturer} ${selectedModel.model}`,
      printerModelId: selectedModel.id,
      connectionType,
      connectionDetails: {
        address: networkAddress,
        port: networkPort,
      },
      selectedDpi,
      calibrationOffsets: {
        horizontal: calibHorizontal,
        vertical: calibVertical,
        rotation: calibRotation,
        scale: calibScale,
      },
      darkness,
      printSpeedIps,
      defaultLabelFormatId: defaultFormatId,
      status: 'READY',
      statusMessage: `Prête - ${connectionType}`,
    });

    onPrinterAdded(newInstance);
    onClose();
  };

  const steps = [
    { number: 1, label: 'Détection Matérielle' },
    { number: 2, label: 'Preset Gabarit' },
    { number: 3, label: 'Calibrage' },
    { number: 4, label: 'Format Défaut' },
    { number: 5, label: 'Épreuve Test' },
    { number: 6, label: 'Confirmation' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={wizardTitleId}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 id={wizardTitleId} className="text-lg font-bold text-white flex items-center gap-2">
                <span>Installation &amp; Détection d'Imprimante</span>
              </h2>
              <p className="text-xs text-slate-400">
                Détection automatique mDNS / Bonjour / USB &amp; association du gabarit constructeur
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6-step progress stepper */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between overflow-x-auto gap-2">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCurrentStep(s.number as any)}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                  currentStep === s.number
                    ? 'bg-blue-600 text-white shadow'
                    : currentStep > s.number
                    ? 'bg-slate-800 text-emerald-400'
                    : 'bg-slate-800/40 text-slate-500'
                }`}
              >
                <span>{s.number}</span>
                <span>{s.label}</span>
              </button>
              {idx < steps.length - 1 && <span className="text-slate-700 text-xs mx-1">→</span>}
            </div>
          ))}
        </div>

        {/* Wizard Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* STEP 1: Connection & Discovery */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Méthode de raccordement
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'Ethernet', label: 'Réseau (Ethernet / IP)', icon: Wifi },
                    { id: 'Wi-Fi', label: 'Wi-Fi', icon: Wifi },
                    { id: 'USB', label: 'USB Direct (WebUSB)', icon: Usb },
                    { id: 'Serial', label: 'Port Série / COM (Web Serial)', icon: Radio },
                    { id: 'Bluetooth', label: 'Bluetooth', icon: Bluetooth },
                    { id: 'Windows Driver', label: 'Pilote Système OS', icon: Printer },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setConnectionType(item.id as any);
                          setScanErrorMessage('');
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                          connectionType === item.id
                            ? 'border-blue-500 bg-blue-500/10 text-white shadow-sm'
                            : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-xs font-semibold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Network Discovery Section */}
              {(connectionType === 'Ethernet' || connectionType === 'Wi-Fi') && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Détection Réseau mDNS / Bonjour &amp; Broadcast</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Scan automatique des services d'impression sur le sous-réseau local
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleScanNetwork}
                      disabled={isScanning}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50 self-start sm:self-auto"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? 'Scan en cours...' : 'Scanner le réseau'}</span>
                    </button>
                  </div>

                  {/* Discovered units list */}
                  {discoveredUnits.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold text-slate-300 block">
                        Imprimantes détectées ({discoveredUnits.length}) :
                      </span>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {discoveredUnits.map((u) => {
                          const isSelected = selectedDiscoveredId === u.id;
                          return (
                            <div
                              key={u.id}
                              onClick={() => handleSelectDiscoveredUnit(u)}
                              className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                  : 'border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    isSelected ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-slate-600'
                                  }`}
                                />
                                <div>
                                  <p className="font-bold text-xs">{u.name}</p>
                                  <p className="text-[11px] text-slate-400 font-mono">
                                    {u.address}:{u.port} · {u.protocol} {u.latencyMs ? `(${u.latencyMs}ms)` : ''}
                                  </p>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {isSelected ? 'Sélectionnée' : 'Sélectionner'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manual IP Entry & Probe */}
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                      Ou saisie manuelle de l'adresse IP / Port :
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={networkAddress}
                        onChange={(e) => {
                          setNetworkAddress(e.target.value);
                          setProbeResult(null);
                        }}
                        placeholder="192.168.1.100"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                      />
                      <input
                        type="number"
                        value={networkPort}
                        onChange={(e) => {
                          setNetworkPort(parseInt(e.target.value, 10) || 9100);
                          setProbeResult(null);
                        }}
                        placeholder="9100"
                        className="w-24 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleProbeAddress}
                        disabled={isProbing || !networkAddress}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Activity className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
                        <span>{isProbing ? 'Test...' : 'Tester le port'}</span>
                      </button>
                    </div>

                    {probeResult && probeResult.tested && (
                      <div
                        className={`mt-2 p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          probeResult.reachable
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {probeResult.reachable ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          <span>{probeResult.details}</span>
                        </div>
                        {probeResult.reachable && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20">
                            En ligne
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* USB Scanning Action */}
              {connectionType === 'USB' && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-center">
                  <Usb className="w-8 h-8 text-blue-400 mx-auto" />
                  <h4 className="text-xs font-bold text-white">Connexion Directe WebUSB</h4>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Le navigateur va interroger directement les descripteurs USB de l'imprimante connectée (VendorID &amp; ProductID).
                  </p>
                  <button
                    type="button"
                    onClick={handleScanUsb}
                    disabled={isScanning}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition inline-flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>Sélectionner le périphérique USB</span>
                  </button>
                </div>
              )}

              {/* Web Serial Scanning Action */}
              {connectionType === 'Serial' && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-center">
                  <Radio className="w-8 h-8 text-blue-400 mx-auto" />
                  <h4 className="text-xs font-bold text-white">Connexion Directe Port Série / COM</h4>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Connexion via Web Serial API pour imprimantes thermiques RS-232, convertisseurs USB-COM (FTDI, CH340, CP2102) ou ports virtuels.
                  </p>
                  <button
                    type="button"
                    onClick={handleScanSerial}
                    disabled={isScanning}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition inline-flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>Sélectionner le port COM / Série</span>
                  </button>
                </div>
              )}

              {/* Bluetooth Scanning Action */}
              {connectionType === 'Bluetooth' && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-center">
                  <Bluetooth className="w-8 h-8 text-blue-400 mx-auto" />
                  <h4 className="text-xs font-bold text-white">Appairage Web Bluetooth</h4>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Recherche des imprimantes d'étiquettes et de reçus Bluetooth à proximité.
                  </p>
                  <button
                    type="button"
                    onClick={handleScanBluetooth}
                    disabled={isScanning}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition inline-flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>Lancer la recherche Bluetooth</span>
                  </button>
                </div>
              )}

              {/* OS Driver Notice */}
              {connectionType === 'Windows Driver' && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Printer className="w-4 h-4 text-blue-400" />
                    <span>Gestionnaire Spooler Système OS</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Utilise la boîte de dialogue d'impression native du système d'exploitation pour router les impressions vers les pilotes Windows, macOS ou Linux CUPS installés.
                  </p>
                </div>
              )}

              {scanErrorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{scanErrorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Associate Manufacturer Preset for Gabarit & Media Fitting */}
          {currentStep === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Rôle des modèles constructeurs (Presets de Gabarit) :</span>
                </p>
                <p className="text-[11px] text-blue-300/80 leading-relaxed">
                  Le catalogue constructeur n'impose pas de matériel fictif : il fournit les <strong>profils de gabarits</strong> (largeur d'impression max, résolutions DPI, marges techniques et jeu d'instructions ZPL/TSPL/ESC-POS) pour que vos étiquettes s'adaptent parfaitement à votre unité physique.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nom d'affichage de cette imprimante
                </label>
                <input
                  type="text"
                  value={printerCustomName}
                  onChange={(e) => setPrinterCustomName(e.target.value)}
                  placeholder="Ex: Imprimante Rayon Frais - ZD421"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Modèle d'imprimante associé (Preset Gabarit &amp; Émulation)
                  </label>
                  {modelPresetAutoMatched && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Auto-associé d'après la signature
                    </span>
                  )}
                </div>

                <select
                  value={selectedModel.id}
                  onChange={(e) => {
                    const m = CANONICAL_PRINTER_MODELS.find((mod) => mod.id === e.target.value);
                    if (m) {
                      setSelectedModel(m);
                      setSelectedDpi(m.resolutionOptions[0] || 203);
                      setModelPresetAutoMatched(false);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                >
                  {CANONICAL_PRINTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.manufacturer} {m.model} ({m.printerType} — {m.technology} • {m.commandLanguage})
                    </option>
                  ))}
                </select>
              </div>

              {/* Resolved Capabilities Card */}
              <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {selectedModel.manufacturer} {selectedModel.model}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Famille : {selectedModel.family} • Technologie : {selectedModel.technology}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Langage : {selectedModel.commandLanguage}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Largeur Max :</span>
                    <p className="font-bold text-slate-200">{selectedModel.maxMediaWidth} mm</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Résolutions :</span>
                    <p className="font-bold text-slate-200">{selectedModel.resolutionOptions.join(', ')} DPI</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Massicot :</span>
                    <p className="font-bold text-slate-200">{selectedModel.capabilities.cutter ? '✓ Présent' : '✕ Non'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Décolleur :</span>
                    <p className="font-bold text-slate-200">{selectedModel.capabilities.peeler ? '✓ Présent' : '✕ Non'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Configuration (DPI & Calibrations) */}
          {currentStep === 3 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Résolution de tête (DPI)
                </label>
                <div className="flex gap-2">
                  {selectedModel.resolutionOptions.map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setSelectedDpi(res)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                        selectedDpi === res
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400'
                      }`}
                    >
                      {res} DPI
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-300 block">
                  Décalages de Calibrage Tête (Offsets physiques)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Décalage Horizontal (mm)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="-10"
                      max="10"
                      value={calibHorizontal}
                      onChange={(e) => setCalibHorizontal(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Décalage Vertical (mm)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="-10"
                      max="10"
                      value={calibVertical}
                      onChange={(e) => setCalibVertical(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Ces valeurs permettent d'ajuster le calage au demi-millimètre près sans altérer vos gabarits.
                </p>
              </div>

              {selectedModel.technology !== 'Laser/Inkjet' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Chauffe thermique (Darkness : {darkness})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={darkness}
                      onChange={(e) => setDarkness(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Vitesse d'impression ({printSpeedIps} IPS)
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="14"
                      value={printSpeedIps}
                      onChange={(e) => setPrintSpeedIps(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Default Label Format & Media Profile */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Format de gabarit / rouleau par défaut
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {formats.map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setDefaultFormatId(fmt.id)}
                      className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        defaultFormatId === fmt.id
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-200">{fmt.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {fmt.width}×{fmt.height} mm
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{fmt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Test Print */}
          {currentStep === 5 && (
            <div className="space-y-6 max-w-xl mx-auto text-center">
              <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
                <Printer className="w-12 h-12 text-blue-400 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-white">Épreuve de Tirage &amp; Validation</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Génère et transmet une mire de calibrage vers <strong>{printerCustomName}</strong> ({selectedDpi} DPI, format {resolvedFormat.name}).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestPrint}
                  disabled={isTestPrinting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition inline-flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isTestPrinting ? 'animate-spin' : ''}`} />
                  <span>{isTestPrinting ? 'Émission en cours...' : 'Imprimer une étiquette de test'}</span>
                </button>

                {testPrintDone && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Ordre d'impression envoyé avec succès ({selectedModel.commandLanguage}) !</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: Confirmation */}
          {currentStep === 6 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Prêt à enregistrer l'imprimante</h3>
                    <p className="text-xs text-slate-400">Votre périphérique physique est configuré</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Nom :</span>
                    <span className="font-bold text-white">{printerCustomName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Connexion :</span>
                    <span className="text-slate-200">
                      {connectionType}{' '}
                      {connectionType === 'Ethernet' || connectionType === 'Wi-Fi'
                        ? `(${networkAddress}:${networkPort})`
                        : ''}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Gabarit Constructeur :</span>
                    <span className="text-slate-200">
                      {selectedModel.manufacturer} {selectedModel.model} ({selectedModel.commandLanguage})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Résolution :</span>
                    <span className="text-slate-200">{selectedDpi} DPI</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Format par défaut :</span>
                    <span className="text-slate-200">{resolvedFormat.name}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (currentStep > 1) setCurrentStep((currentStep - 1) as any);
              else onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            {currentStep === 1 ? 'Annuler' : 'Précédent'}
          </button>

          <div className="flex items-center gap-2">
            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep + 1) as any)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
              >
                <span>Étape suivante</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer l'imprimante</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

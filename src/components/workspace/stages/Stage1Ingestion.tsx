/**
 * Stage 1: Data Ingestion & Workset Preparation
 * 
 * Upload Excel/CSV/JSON files, add from Master Catalog, or enter data manually.
 * Separates transient working batch from the permanent master catalog.
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Plus,
  Trash2,
  Copy,
  Search,
  Database,
  RefreshCw,
  CheckCircle2,
  FileText,
  AlertCircle,
  Table,
} from 'lucide-react';
import { ProductRecord } from '../../../types';
import * as XLSX from 'xlsx';

interface Stage1IngestionProps {
  products: ProductRecord[];
  onUpdateProducts: (products: ProductRecord[]) => void;
  onOpenMasterCatalog: () => void;
  onAddEmptyRow: () => void;
  onSelectProductForPreview: (index: number) => void;
  selectedIndex: number;
}

export const Stage1Ingestion: React.FC<Stage1IngestionProps> = ({
  products,
  onUpdateProducts,
  onOpenMasterCatalog,
  onAddEmptyRow,
  onSelectProductForPreview,
  selectedIndex,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];

        if (!data || data.length === 0) {
          setUploadStatus('Le fichier est vide.');
          return;
        }

        const normalized: ProductRecord[] = data.map((row, idx) => {
          const keys = Object.keys(row);
          const findKey = (...candidates: string[]) => {
            const found = keys.find((k) =>
              candidates.some((c) => k.trim().toLowerCase() === c.toLowerCase())
            );
            return found ? row[found] : undefined;
          };

          return {
            id: String(row.id || row.ID || `PROD-${Date.now()}-${idx}`),
            PARTNO: String(findKey('PARTNO', 'part_number', 'reference', 'ref', 'code_article') || `REF-${idx + 1}`),
            ITEMNAME: String(findKey('ITEMNAME', 'item_name', 'designation', 'nom', 'article', 'libelle') || 'Article sans nom'),
            CATEGORY_NAME: String(findKey('CATEGORY_NAME', 'category', 'rayon', 'famille', 'departement') || 'Général'),
            SELLING_PRICE: Number(findKey('SELLING_PRICE', 'selling_price', 'prix_vente', 'prix', 'pv_ttc') || 0),
            PROMOPRICE: findKey('PROMOPRICE', 'promo_price', 'prix_promo', 'promo') ? Number(findKey('PROMOPRICE', 'promo_price', 'prix_promo', 'promo')) : undefined,
            PRODUCT_SCAN: String(findKey('PRODUCT_SCAN', 'product_scan', 'ean', 'ean13', 'code_barres', 'barcode') || ''),
            BRAND_INFO: String(findKey('BRAND_INFO', 'brand', 'marque', 'fournisseur') || ''),
            ORIGIN: String(findKey('ORIGIN', 'origin', 'origine', 'pays') || 'France'),
            UNIT_PRICE_LEGAL: String(findKey('UNIT_PRICE_LEGAL', 'unit_price', 'prix_unitaire_kg') || ''),
          };
        });

        onUpdateProducts(normalized);
        setUploadStatus(`${normalized.length} articles importés depuis "${file.name}"`);
      } catch (err) {
        console.error(err);
        setUploadStatus("Erreur lors de la lecture du fichier Excel/CSV.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpdateField = (id: string, field: keyof ProductRecord, val: any) => {
    const updated = products.map((p) => {
      if (p.id === id) {
        return { ...p, [field]: val };
      }
      return p;
    });
    onUpdateProducts(updated);
  };

  const handleDeleteRow = (id: string) => {
    onUpdateProducts(products.filter((p) => p.id !== id));
  };

  const handleDuplicateRow = (prod: ProductRecord) => {
    const copy: ProductRecord = {
      ...prod,
      id: `PROD-${Date.now()}`,
      ITEMNAME: `${prod.ITEMNAME} (Copie)`,
    };
    onUpdateProducts([...products, copy]);
  };

  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.ITEMNAME?.toLowerCase().includes(q) ||
      p.PARTNO?.toLowerCase().includes(q) ||
      p.PRODUCT_SCAN?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Banner / Dropzone & Action Bar */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Étape 1 : Ingestion du Jeu de Production
                <span className="text-xs font-normal text-slate-400">
                  ({products.length} articles chargés dans le lot)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Importez les articles à baliser aujourd'hui (Excel/CSV) ou sélectionnez-les depuis le catalogue maître.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importer Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={onOpenMasterCatalog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Catalogue Maître (500k)</span>
            </button>

            <button
              type="button"
              onClick={onAddEmptyRow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ajouter une ligne</span>
            </button>
          </div>
        </div>

        {uploadStatus && (
          <div className="mt-2.5 px-3 py-1.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-xs text-indigo-300 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* Search and Table Grid Container */}
      <div className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center justify-between pb-3 shrink-0">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par libellé, référence, EAN..."
              className="w-full pl-8 pr-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400">
            Affichage de <strong>{filteredProducts.length}</strong> sur <strong>{products.length}</strong> référence{products.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Data Table */}
        <div className="flex-1 min-h-0 overflow-auto border border-slate-800 rounded-lg bg-slate-950/70">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900/90 sticky top-0 z-10 border-b border-slate-800 text-slate-400 font-semibold select-none">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 w-32">Référence</th>
                <th className="py-2.5 px-3 min-w-[200px]">Désignation Article</th>
                <th className="py-2.5 px-3 w-28">Prix TTC (€)</th>
                <th className="py-2.5 px-3 w-28">Prix Promo (€)</th>
                <th className="py-2.5 px-3 w-36">Code-barres / EAN</th>
                <th className="py-2.5 px-3 w-28">Marque</th>
                <th className="py-2.5 px-3 w-24">Origine</th>
                <th className="py-2.5 px-3 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredProducts.map((p, idx) => {
                const isSelected = idx === selectedIndex;
                const hasPromo = Boolean(p.PROMOPRICE && Number(p.PROMOPRICE) > 0);

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectProductForPreview(idx)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-950/40 hover:bg-indigo-950/50'
                        : 'hover:bg-slate-900/50'
                    }`}
                  >
                    <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={p.PARTNO || ''}
                        onChange={(e) => handleUpdateField(p.id, 'PARTNO', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-slate-300 font-mono text-xs focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={p.ITEMNAME || ''}
                        onChange={(e) => handleUpdateField(p.id, 'ITEMNAME', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-slate-100 font-medium text-xs focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={p.SELLING_PRICE || 0}
                        onChange={(e) => handleUpdateField(p.id, 'SELLING_PRICE', parseFloat(e.target.value) || 0)}
                        className={`w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 font-bold font-mono text-xs focus:outline-none ${
                          hasPromo ? 'line-through text-slate-400' : 'text-emerald-400'
                        }`}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={p.PROMOPRICE ?? ''}
                        placeholder="—"
                        onChange={(e) => handleUpdateField(p.id, 'PROMOPRICE', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-rose-400 font-bold font-mono text-xs focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={p.PRODUCT_SCAN || ''}
                        onChange={(e) => handleUpdateField(p.id, 'PRODUCT_SCAN', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-slate-300 font-mono text-xs focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={p.BRAND_INFO || ''}
                        onChange={(e) => handleUpdateField(p.id, 'BRAND_INFO', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-slate-400 text-xs focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={p.ORIGIN || ''}
                        onChange={(e) => handleUpdateField(p.id, 'ORIGIN', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-slate-400 text-xs focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(p)}
                          title="Dupliquer"
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(p.id)}
                          title="Supprimer"
                          className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

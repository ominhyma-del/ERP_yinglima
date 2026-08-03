import React, { useState } from 'react';
import { Upload, X, Check, ArrowRight, Download, AlertCircle, RefreshCw, Layers, CheckCircle2, FileText, Plus } from 'lucide-react';

export interface FieldSchema {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
}

export interface CsvImportModalProps {
  isOpen: boolean;
  title: string;
  entityName: string;
  fieldSchemas: FieldSchema[];
  onClose: () => void;
  onImportItems: (
    items: any[],
    options: { mode: 'CREATE' | 'MERGE' },
    onProgress: (current: number, total: number, importedCount: number) => void,
    isAborted: () => boolean
  ) => Promise<{ successCount: number; duplicatesCount: number; duplicateItems: any[] }>;
  onComplete: (summary: string) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  title,
  entityName,
  fieldSchemas,
  onClose,
  onImportItems,
  onComplete,
}) => {
  // Stage 1: FILE_SELECT, Stage 2: FIELD_MAPPING, Stage 3: IMPORTING, Stage 4: DUPLICATE_PROMPT
  const [stage, setStage] = useState<'FILE_SELECT' | 'FIELD_MAPPING' | 'IMPORTING' | 'DUPLICATE_PROMPT'>('FILE_SELECT');
  
  const [fileName, setFileName] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  
  // Mapping state: CSV Header Index -> Field Schema Key
  const [mapping, setMapping] = useState<Record<string, string>>({});
  
  // Progressive Import State
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; successCount: number }>({ current: 0, total: 0, successCount: 0 });
  const [pendingDuplicates, setPendingDuplicates] = useState<any[]>([]);
  const [parsedItemsCache, setParsedItemsCache] = useState<any[]>([]);

  // Cancel Warning State & Abort Ref
  const [showCancelWarning, setShowCancelWarning] = useState(false);
  const isAbortedRef = React.useRef(false);

  if (!isOpen) return null;

  const handleCancelRequest = () => {
    if (stage === 'IMPORTING') {
      setShowCancelWarning(true);
    } else {
      onClose();
    }
  };

  const confirmCancelImport = () => {
    isAbortedRef.current = true;
    setShowCancelWarning(false);
    onComplete(`Import cancelled by user. Processed ${importProgress.current} of ${importProgress.total} records.`);
    onClose();
  };

  // Simple CSV Parser handling quotes & commas
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      const headers = parseCsvLine(lines[0]);
      const dataRows = lines.slice(1).map((l) => parseCsvLine(l));

      setCsvHeaders(headers);
      setCsvRows(dataRows);

      // Auto-match headers to schema keys
      const initialMapping: Record<string, string> = {};
      headers.forEach((header, colIndex) => {
        const cleanH = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = fieldSchemas.find((s) => {
          const cleanK = s.key.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanL = s.label.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanH === cleanK || cleanH === cleanL) return true;
          if (s.aliases && s.aliases.some((a) => cleanH === a.toLowerCase().replace(/[^a-z0-9]/g, ''))) return true;
          return false;
        });
        if (matched) {
          initialMapping[colIndex.toString()] = matched.key;
        }
      });

      setMapping(initialMapping);
      setStage('FIELD_MAPPING');
    };
    reader.readAsText(file);
  };

  // Convert CSV Data Rows into JavaScript Objects based on Mapping
  const mapRowsToEntities = (): any[] => {
    return csvRows.map((row, idx) => {
      const entity: Record<string, any> = { id: `imp-${Date.now()}-${idx}` };
      csvHeaders.forEach((_, colIdx) => {
        const fieldKey = mapping[colIdx.toString()];
        if (fieldKey) {
          const val = row[colIdx] || '';
          if (fieldKey.endsWith('_categories') || fieldKey.endsWith('_subcategories') || fieldKey === 'emails') {
            entity[fieldKey] = val ? val.split(';').map((s) => s.trim()) : [];
          } else {
            entity[fieldKey] = val;
          }
        }
      });
      // Fallbacks
      if (!entity.name && !entity.name_tally) {
        entity.name = `Imported ${entityName} #${idx + 1}`;
      }
      return entity;
    });
  };

  const startBatchImport = async (mode: 'CREATE' | 'MERGE', itemsToImport?: any[]) => {
    const items = itemsToImport || mapRowsToEntities();
    isAbortedRef.current = false;
    setParsedItemsCache(items);
    setStage('IMPORTING');
    setImportProgress({ current: 0, total: items.length, successCount: 0 });

    try {
      const result = await onImportItems(
        items,
        { mode },
        (current, total, importedCount) => {
          setImportProgress({ current, total, successCount: importedCount });
        },
        () => isAbortedRef.current
      );

      if (isAbortedRef.current) {
        return; // Aborted by user
      }

      setImportProgress({ current: items.length, total: items.length, successCount: result.successCount });

      if (result.duplicateItems && result.duplicateItems.length > 0 && mode === 'CREATE') {
        setPendingDuplicates(result.duplicateItems);
        setStage('DUPLICATE_PROMPT');
      } else {
        onComplete(`Successfully imported ${result.successCount} ${entityName.toLowerCase()}(s)!`);
        onClose();
      }
    } catch (err: any) {
      if (!isAbortedRef.current) {
        alert(`Import error: ${err?.message || 'Failed to process import.'}`);
        setStage('FIELD_MAPPING');
      }
    }
  };

  const handleContinueWithoutMerging = async () => {
    // Continue import: add duplicate data as new separate entries
    await startBatchImport('CREATE', pendingDuplicates);
  };

  const handleMergeDuplicates = async () => {
    // Merge import: merge duplicate data into existing entries
    await startBatchImport('MERGE', pendingDuplicates);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload size={18} className="text-blue-600" /> {title}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Stage {stage === 'FILE_SELECT' ? '1' : stage === 'FIELD_MAPPING' ? '2' : stage === 'IMPORTING' ? '3' : '4'} of 4: {' '}
              {stage === 'FILE_SELECT'
                ? 'Select CSV / Excel File'
                : stage === 'FIELD_MAPPING'
                ? 'Field Header Mapping'
                : stage === 'IMPORTING'
                ? 'Progressive Data Import'
                : 'Duplicate Resolution Prompt'}
            </p>
          </div>
          <button onClick={handleCancelRequest} className="p-1 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STAGE 1: FILE SELECT */}
          {stage === 'FILE_SELECT' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 p-10 rounded-2xl text-center space-y-3 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <Upload size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">Click or Drag & Drop File Here</p>
                  <p className="text-xs text-slate-400">Supports .CSV, .TXT (Up to 10MB)</p>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: FIELD MAPPING POPUP */}
          {stage === 'FIELD_MAPPING' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs text-blue-800">
                <span className="font-semibold">
                  Detected {csvRows.length} rows & {csvHeaders.length} columns in "{fileName}".
                </span>
                <span className="text-[11px] text-blue-600 font-medium">Verify field mapping below</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3">File Header Column</th>
                      <th className="p-3">Target Database Field</th>
                      <th className="p-3">First Row Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvHeaders.map((header, colIdx) => (
                      <tr key={colIdx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800 flex items-center gap-1.5">
                          <FileText size={14} className="text-slate-400" />
                          {header}
                        </td>
                        <td className="p-3">
                          <select
                            value={mapping[colIdx.toString()] || ''}
                            onChange={(e) => setMapping({ ...mapping, [colIdx.toString()]: e.target.value })}
                            className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-semibold bg-white outline-none focus:border-blue-500"
                          >
                            <option value="">-- Do Not Import Column --</option>
                            {fieldSchemas.map((schema) => (
                              <option key={schema.key} value={schema.key}>
                                {schema.label} {schema.required ? '*' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-slate-500 truncate max-w-[150px]">
                          {csvRows[0]?.[colIdx] || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STAGE 3: PROGRESSIVE IMPORTING LOADING BAR */}
          {stage === 'IMPORTING' && (
            <div className="py-8 text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-spin">
                <RefreshCw size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900">
                  Importing {entityName} Records...
                </h4>
                <p className="text-xs text-slate-600 font-semibold">
                  Processed <span className="text-blue-600 font-bold">{importProgress.current.toLocaleString()}</span> of{' '}
                  <span className="text-slate-900 font-bold">{importProgress.total.toLocaleString()}</span> records into Supabase Database
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-4 max-w-md mx-auto overflow-hidden border border-slate-200 shadow-inner">
                <div
                  className="bg-blue-600 h-full transition-all duration-200 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                  style={{
                    width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              
              <div className="flex items-center justify-center gap-6 text-xs font-bold">
                <span className="text-blue-600 text-sm">
                  {importProgress.total > 0
                    ? ((importProgress.current / importProgress.total) * 100).toFixed(1)
                    : '0.0'}% Complete
                </span>
                <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  Successfully Imported: {importProgress.successCount.toLocaleString()} records
                </span>
              </div>
              
              <div className="pt-2">
                <button
                  onClick={handleCancelRequest}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel Import Process
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: INTERACTIVE DUPLICATE RESOLUTION MODAL */}
          {stage === 'DUPLICATE_PROMPT' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle size={20} className="text-amber-600" />
                  <span>⚠️ Duplicate Records Detected During Import</span>
                </div>
                <p className="text-xs font-medium">
                  Found <strong className="underline">{pendingDuplicates.length}</strong> record(s) in your file that match existing company names or tax IDs in the database.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2.5">Record Identifier</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingDuplicates.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-800">
                          {item.name || item.name_tally || `Item #${idx + 1}`}
                        </td>
                        <td className="p-2.5 text-amber-700 font-bold text-[11px]">
                          Duplicate Record
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-slate-800">Choose Action for Duplicate Items:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleContinueWithoutMerging}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-xs flex flex-col items-start gap-1 border border-slate-300 transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Plus size={16} className="text-blue-600" /> Continue & Add as Duplicates
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Import incoming rows as separate new entries without merging.
                    </span>
                  </button>

                  <button
                    onClick={handleMergeDuplicates}
                    className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex flex-col items-start gap-1 shadow-2xs transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers size={16} /> Merge Incoming Duplicates
                    </span>
                    <span className="text-[10px] text-blue-100 font-normal">
                      Combine incoming fields into existing database entries automatically.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleCancelRequest}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
          >
            Cancel
          </button>

          {stage === 'FIELD_MAPPING' && (
            <button
              onClick={() => startBatchImport('CREATE')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={16} /> Save Mapping & Start Import
            </button>
          )}
        </div>
      </div>

      {/* CANCEL WARNING CONFIRMATION MODAL */}
      {showCancelWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 border-b border-red-100 pb-3">
              <AlertCircle size={24} />
              <h3 className="text-base font-extrabold text-slate-900">Cancel Import Process?</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Data import is currently in progress (<span className="font-bold text-slate-900">{importProgress.current}</span> of{' '}
              <span className="font-bold text-slate-900">{importProgress.total}</span> records processed).
              <br /><br />
              If you cancel now, <strong className="text-red-600">the import process will stop immediately</strong>. Any records already saved ({importProgress.successCount}) will remain in your database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCancelWarning(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
              >
                No, Continue Import
              </button>
              <button
                onClick={confirmCancelImport}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Yes, Cancel & Stop Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

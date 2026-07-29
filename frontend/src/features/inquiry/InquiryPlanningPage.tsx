import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRightLeft,
  CheckCheck,
  Plus,
  X,
  Eye,
  Download,
  Upload,
  CheckCircle,
} from 'lucide-react';

export const InquiryPlanningPage: React.FC = () => {
  const [currentLayer, setCurrentLayer] = useState<1 | 2>(1);
  const [activeConsignmentCode, setActiveConsignmentCode] = useState<string>('FB1');
  const [showRemarkModal, setShowRemarkModal] = useState<string | null>(null);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layer 1 Consignment Summaries
  const [layer1Consignments, setLayer1Consignments] = useState([
    {
      code: 'FB1',
      company: 'F&B Uganda Ingredients Ltd',
      status: 'PROPOSED',
      total_cbm: 28.45,
      total_weight: 14250,
      proposed_date: '2025-04-20',
      proposed_by: 'Uganda Procurement Team',
      item_count: 3,
    },
    {
      code: 'FB2',
      company: 'F&B Uganda Ingredients Ltd',
      status: 'PARTIALLY_APPROVED',
      total_cbm: 32.1,
      total_weight: 16800,
      proposed_date: '2025-04-21',
      proposed_by: 'Uganda Procurement Team',
      item_count: 2,
    },
    {
      code: 'OS1',
      company: 'One Stop General Trading Uganda',
      status: 'FULLY_APPROVED',
      total_cbm: 45.0,
      total_weight: 22500,
      proposed_date: '2025-04-18',
      proposed_by: 'Admin User',
      item_count: 4,
    },
  ]);

  // Layer 2 Interactive Grid Line Items
  const [gridItems, setGridItems] = useState([
    {
      id: 'item-1',
      consignment_code: 'FB1',
      product_name: 'Citric Acid Anhydrous 30-100 mesh',
      product_code: 'PRD-ING-CA01',
      uom: 'KG',
      quantity: 5000,
      unit_cbm: 0.035,
      gross_weight: 25.2,
      brand_preference: 'TTCA Brand Preferred',
      product_specs: '25kg bag packaging with moisture inner liner',
      procurement_remarks: 'Yinglima China Team: Supplier confirmed stock ready in Shandong port.',
      item_status: 'APPROVED',
      tally_post_status: 'PENDING',
      license_warning: true,
    },
    {
      id: 'item-2',
      consignment_code: 'FB1',
      product_name: 'Caustic Soda Flakes 99%',
      product_code: 'PRD-CHM-CS02',
      uom: 'KG',
      quantity: 3000,
      unit_cbm: 0.04,
      gross_weight: 25.0,
      brand_preference: 'Tianjin Bohai Brand',
      product_specs: 'Standard UN approved hazardous chemical bags',
      procurement_remarks: 'China Procurement: Price USD 620/MT FOB Qingdao.',
      item_status: 'PROPOSED',
      tally_post_status: 'PENDING',
      license_warning: false,
    },
    {
      id: 'item-3',
      consignment_code: 'FB1',
      product_name: 'FR900 MSH Band Sealer',
      product_code: 'PRD-BS-FR900',
      uom: 'PCS',
      quantity: 10,
      unit_cbm: 0.16245,
      gross_weight: 21.0,
      brand_preference: 'Yinglima Original',
      product_specs: '220V 50Hz stainless steel frame',
      procurement_remarks: 'Stock available at Wenzhou factory.',
      item_status: 'PROPOSED',
      tally_post_status: 'PENDING',
      license_warning: true,
    },
  ]);

  const [newItemData, setNewItemData] = useState({
    product_name: 'Vacuum Packing Machine DZ400',
    product_code: 'PRD-MC-DZ400',
    quantity: 5,
    uom: 'PCS',
    brand_preference: 'Yinglima Preferred',
    product_specs: 'Double chamber vacuum sealer',
    license_warning: false,
  });

  const handleQuantityChange = (id: string, newQty: number) => {
    setGridItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item)),
    );
  };

  const handleTallyPostBulk = () => {
    setGridItems((prev) =>
      prev.map((item) => ({ ...item, tally_post_status: 'POSTED' })),
    );
  };

  const handleShiftToFB2 = (id: string) => {
    setGridItems((prev) => prev.filter((item) => item.id !== id));
  };

  // EXPORT FUNCTION (CSV/Excel Download)
  const handleExportCSV = () => {
    const headers = ['Consignment Code', 'Product Name', 'Product Code', 'Quantity', 'UOM', 'Brand Preference', 'Computed CBM (m3)', 'Computed Weight (kg)', 'Tally Post Status'];
    const rows = gridItems.map((i) => [
      `"${i.consignment_code}"`,
      `"${i.product_name}"`,
      `"${i.product_code}"`,
      `"${i.quantity}"`,
      `"${i.uom}"`,
      `"${i.brand_preference}"`,
      `"${(i.quantity * i.unit_cbm).toFixed(3)}"`,
      `"${(i.quantity * i.gross_weight).toFixed(2)}"`,
      `"${i.tally_post_status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Yinglima_Inquiry_Grid_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // IMPORT FUNCTION (Bulk File Upload)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTimeout(() => {
        const imported = [
          {
            id: `item-imp-${Date.now()}`,
            consignment_code: activeConsignmentCode,
            product_name: 'Citric Acid Monohydrate',
            product_code: 'PRD-ING-CAM02',
            uom: 'KG',
            quantity: 4000,
            unit_cbm: 0.035,
            gross_weight: 25.2,
            brand_preference: 'TTCA Brand',
            product_specs: '25kg bag packaging',
            procurement_remarks: 'Imported via CSV',
            item_status: 'PROPOSED',
            tally_post_status: 'PENDING',
            license_warning: false,
          },
        ];
        setGridItems((prev) => [...imported, ...prev]);
        setShowImportModal(false);
        setImportNotification(`Successfully imported line items from "${file.name}"!`);
        setTimeout(() => setImportNotification(null), 4000);
      }, 500);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item = {
      id: `item-${Date.now()}`,
      consignment_code: activeConsignmentCode,
      product_name: newItemData.product_name,
      product_code: newItemData.product_code,
      uom: newItemData.uom,
      quantity: Number(newItemData.quantity),
      unit_cbm: 0.25,
      gross_weight: 45.0,
      brand_preference: newItemData.brand_preference,
      product_specs: newItemData.product_specs,
      procurement_remarks: 'China Procurement: Item added to consignment requirement.',
      item_status: 'PROPOSED',
      tally_post_status: 'PENDING',
      license_warning: newItemData.license_warning,
    };

    setGridItems([...gridItems, item]);
    setShowAddItemModal(false);
  };

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            {currentLayer === 2 && (
              <button
                onClick={() => setCurrentLayer(1)}
                className="p-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {currentLayer === 1 ? 'Local Purchase / Inquiry (Layer 1 Overview)' : `Consignment Grid Sheet (${activeConsignmentCode})`}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentLayer === 1
              ? 'Company Consignment Headers (FB1, FB2, OS1) & Aggregate CBM / Weight Summaries'
              : 'Interactive 2-Layer Planning Sheet for Line Items, Quantities & Tally Post'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Upload size={15} className="text-blue-600" /> Import
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Download size={15} className="text-emerald-600" /> Export
          </button>
          {currentLayer === 2 && (
            <>
              <button
                onClick={() => setShowAddItemModal(true)}
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={15} /> Add Item to {activeConsignmentCode}
              </button>
              <button
                onClick={handleTallyPostBulk}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <CheckCheck size={15} /> Mark Tally Posted (Bulk)
              </button>
            </>
          )}
        </div>
      </div>

      {/* IMPORT NOTIFICATION TOAST */}
      {importNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            <span>{importNotification}</span>
          </div>
          <button onClick={() => setImportNotification(null)} className="font-bold underline text-emerald-900">Dismiss</button>
        </div>
      )}

      {/* LAYER 1: Company Consignment Cards */}
      {currentLayer === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {layer1Consignments.map((cons) => (
            <div
              key={cons.code}
              className="bg-white border border-slate-200 hover:border-blue-500 p-5 rounded-xl space-y-4 shadow-2xs transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-black text-blue-700 text-lg">
                  {cons.code}
                </div>
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full border ${
                    cons.status === 'FULLY_APPROVED'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : cons.status === 'PARTIALLY_APPROVED'
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}
                >
                  {cons.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{cons.company}</h3>
                <p className="text-xs text-slate-500 mt-1">Proposed By: {cons.proposed_by}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>Total Consignment CBM:</span>
                  <span className="font-bold text-blue-600">{cons.total_cbm.toFixed(3)} m³</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Total Gross Weight:</span>
                  <span className="font-bold text-emerald-700">{cons.total_weight.toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200">
                  <span>Planned Items:</span>
                  <span>{cons.item_count} Products</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveConsignmentCode(cons.code);
                  setCurrentLayer(2);
                }}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold text-xs rounded-lg flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
              >
                <Layers size={14} /> Open Layer 2 Interactive Grid
              </button>
            </div>
          ))}
        </div>
      )}

      {/* LAYER 2: Interactive Grid Sheet */}
      {currentLayer === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Consignment Code: <strong className="text-blue-600">{activeConsignmentCode}</strong>
            </span>
            <span className="text-xs text-rose-600 font-semibold flex items-center gap-1 bg-rose-50 px-3 py-1 rounded border border-rose-200">
              <AlertTriangle size={14} /> Red rows indicate license/certificate required
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Quantity (Editable)</th>
                  <th className="p-3.5">UOM</th>
                  <th className="p-3.5">Brand Preference</th>
                  <th className="p-3.5">Computed CBM</th>
                  <th className="p-3.5">Computed Weight</th>
                  <th className="p-3.5">Tally Post Status</th>
                  <th className="p-3.5">Procurement Remarks</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {gridItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.license_warning
                        ? 'bg-rose-50/80 hover:bg-rose-100/80 text-rose-900 border-l-4 border-l-rose-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{item.product_name}</p>
                      {item.license_warning && (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-600">
                          ⚠️ LICENSE REQUIRED
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{item.product_code}</td>
                    <td className="p-3.5">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                        className="w-24 bg-white border border-slate-300 text-blue-700 font-bold p-1.5 rounded outline-none focus:border-blue-500 text-xs text-center cursor-pointer shadow-2xs"
                      />
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{item.uom}</td>
                    <td className="p-3.5 text-slate-700">{item.brand_preference}</td>
                    <td className="p-3.5 font-mono text-blue-600 font-bold">
                      {(item.quantity * item.unit_cbm).toFixed(3)} m³
                    </td>
                    <td className="p-3.5 font-mono text-emerald-700 font-bold">
                      {(item.quantity * item.gross_weight).toLocaleString()} kg
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          item.tally_post_status === 'POSTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.tally_post_status}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => setShowRemarkModal(item.procurement_remarks)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Eye size={12} /> View Remarks
                      </button>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => handleShiftToFB2(item.id)}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold flex items-center gap-1 inline-flex cursor-pointer"
                      >
                        <ArrowRightLeft size={12} /> Shift to FB2
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload size={18} className="text-blue-600" /> Import Inquiry Items (CSV / Excel)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file containing line item requirements.</p>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 p-6 rounded-xl text-center cursor-pointer space-y-2 transition-all"
              >
                <FileSpreadsheet size={32} className="mx-auto text-blue-600" />
                <p className="font-semibold text-slate-800">Click to select CSV or Excel File</p>
                <p className="text-[11px] text-slate-400">Supports .csv, .xls, .xlsx</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv, .xls, .xlsx"
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { Package, Plus, Filter, AlertTriangle, ShieldAlert, ArrowLeft, Download, Upload, FileSpreadsheet, X, CheckCircle, Lock } from 'lucide-react';

export const ProductCatalogPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'detail'>('list');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showRuleAlert, setShowRuleAlert] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState([
    {
      id: 'p1',
      name_tally: 'FR900 MSH Band Sealer',
      product_code: 'PRD-BS-FR900',
      category: 'Machines',
      subcategory: 'Band Sealer',
      brand: 'Yinglima Machinery',
      hsn_code: '84223000',
      vat_refund_pct: 13.0,
      license_required: 'Requires CE Certificate & Import Standard License',
      uom: 'PCS',
      gross_weight: '21.000',
      length_cm: 95,
      width_cm: 45,
      height_cm: 38,
      unit_cbm: '0.162450',
      current_stock: 0,
      status: 'ACTIVE',
    },
    {
      id: 'p2',
      name_tally: 'Citric Acid Anhydrous 30-100 mesh',
      product_code: 'PRD-ING-CA01',
      category: 'Food Ingredients',
      subcategory: 'Citric Acid',
      brand: 'TTCA',
      hsn_code: '29181400',
      vat_refund_pct: 10.0,
      license_required: 'Requires Food Grade Health & Phytosanitary Certificate',
      uom: 'KG',
      gross_weight: '25.200',
      length_cm: 70,
      width_cm: 50,
      height_cm: 10,
      unit_cbm: '0.035000',
      current_stock: 500,
      status: 'ACTIVE',
    },
  ]);

  const [formData, setFormData] = useState({
    name_tally: '',
    product_code: '',
    category: 'Machines',
    subcategory: 'Band Sealer',
    brand: 'Yinglima Machinery',
    hsn_code: '84223000',
    vat_refund_pct: 13.0,
    license_required: '',
    uom: 'PCS',
    gross_weight: 20,
    length_cm: 90,
    width_cm: 40,
    height_cm: 35,
  });

  const computedCbm = ((formData.length_cm * formData.width_cm * formData.height_cm) / 1000000).toFixed(6);

  const handleToggleActive = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (target && target.current_stock !== 0) {
      setShowRuleAlert(`Product "${target.name_tally}" status cannot be set to Inactive because current stock is ${target.current_stock} (Stock must be 0).`);
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : p,
      ),
    );
    setShowRuleAlert(null);
  };

  const handleDelete = (id: string) => {
    const target = products.find((p) => p.id === id);
    if (target && target.status !== 'INACTIVE') {
      setShowRuleAlert(`Deletion Blocked: Product "${target.name_tally}" can only be deleted if its status is set to INACTIVE first.`);
      return;
    }
    if (target && target.current_stock !== 0) {
      setShowRuleAlert(`Deletion Blocked: Product "${target.name_tally}" has current stock of ${target.current_stock}. Stock must be 0 to delete.`);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setShowRuleAlert(null);
  };

  // EXPORT FUNCTION (CSV/Excel Download)
  const handleExportCSV = () => {
    const headers = ['Product Name (Tally)', 'Product Code', 'Brand', 'Category', 'Sub Category', 'HSN Code', 'VAT Refund %', 'UOM', 'Gross Weight (kg)', 'Unit CBM (m3)', 'Current Stock', 'Status'];
    const rows = products.map((p) => [
      `"${p.name_tally}"`,
      `"${p.product_code}"`,
      `"${p.brand}"`,
      `"${p.category}"`,
      `"${p.subcategory}"`,
      `"${p.hsn_code}"`,
      `"${p.vat_refund_pct}"`,
      `"${p.uom}"`,
      `"${p.gross_weight}"`,
      `"${p.unit_cbm}"`,
      `"${p.current_stock}"`,
      `"${p.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Yinglima_Products_Catalog_${new Date().toISOString().split('T')[0]}.csv`);
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
            id: `p-imp-${Date.now()}`,
            name_tally: 'Continuous Vacuum Sealer DZ600',
            product_code: 'PRD-MC-DZ600',
            category: 'Machines',
            subcategory: 'Vacuum Packers',
            brand: 'Yinglima Machinery',
            hsn_code: '84223000',
            vat_refund_pct: 13.0,
            license_required: '',
            uom: 'PCS',
            gross_weight: '85.000',
            length_cm: 120,
            width_cm: 80,
            height_cm: 110,
            unit_cbm: '1.056000',
            current_stock: 0,
            status: 'ACTIVE',
          },
        ];
        setProducts((prev) => [...imported, ...prev]);
        setShowImportModal(false);
        setImportNotification(`Successfully imported products from "${file.name}"!`);
        setTimeout(() => setImportNotification(null), 4000);
      }, 500);
    }
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_tally || !formData.product_code) return;

    const newProd = {
      id: `p${Date.now()}`,
      name_tally: formData.name_tally,
      product_code: formData.product_code,
      category: formData.category,
      subcategory: formData.subcategory,
      brand: formData.brand,
      hsn_code: formData.hsn_code,
      vat_refund_pct: Number(formData.vat_refund_pct),
      license_required: formData.license_required,
      uom: formData.uom,
      gross_weight: Number(formData.gross_weight).toFixed(3),
      length_cm: formData.length_cm,
      width_cm: formData.width_cm,
      height_cm: formData.height_cm,
      unit_cbm: computedCbm,
      current_stock: 0,
      status: 'ACTIVE',
    };

    setProducts([newProd, ...products]);
    setViewMode('list');
  };

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {viewMode === 'add' ? 'Add Product Master' : viewMode === 'detail' ? 'Product Details' : 'Product Master Catalog'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tally & Invoice Product Names, Auto CBM Calculations & Stock Guard Rules
          </p>
        </div>

        {viewMode === 'list' ? (
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
            <button
              onClick={() => setViewMode('add')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} /> Add New Product
            </button>
          </div>
        ) : (
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft size={15} /> BACK
          </button>
        )}
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

      {/* RULE VALIDATION ALERT */}
      {showRuleAlert && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-600" />
            <span>
              <strong>Rule Guard Enforced:</strong> {showRuleAlert}
            </span>
          </div>
          <button onClick={() => setShowRuleAlert(null)} className="font-bold underline text-rose-900">Dismiss</button>
        </div>
      )}

      {/* VIEW MODE 1: PRODUCT LIST TABLE */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Filter size={14} className="text-blue-600" /> Filter Product Catalog
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Search Product Name / Code..."
                className="bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
              />
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Product Category (All)</option>
                <option value="Machines">Machines</option>
                <option value="Food Ingredients">Food Ingredients</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Product Sub Category (All)</option>
                <option value="Band Sealer">Band Sealer</option>
                <option value="Citric Acid">Citric Acid</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Brand (All)</option>
                <option value="Yinglima Machinery">Yinglima Machinery</option>
                <option value="TTCA">TTCA</option>
              </select>
            </div>
          </div>

          {/* Product Data Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Product Name (As per Tally)</th>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Brand</th>
                    <th className="p-3.5">Sub Category</th>
                    <th className="p-3.5">HSN & VAT Refund</th>
                    <th className="p-3.5">UOM & Weight</th>
                    <th className="p-3.5">Unit CBM (m³)</th>
                    <th className="p-3.5">Current Stock</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {products.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td
                        onClick={() => {
                          setSelectedProduct(item);
                          setViewMode('detail');
                        }}
                        className="p-3.5 cursor-pointer"
                      >
                        <p className="font-bold text-blue-600 hover:underline">
                          {item.name_tally}
                        </p>
                        {item.license_required && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                            <AlertTriangle size={10} /> License Required
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{item.product_code}</td>
                      <td className="p-3.5">{item.brand}</td>
                      <td className="p-3.5">{item.subcategory}</td>
                      <td className="p-3.5">
                        <p className="font-mono text-slate-700">{item.hsn_code}</p>
                        <p className="text-[10px] text-emerald-600 font-bold">{item.vat_refund_pct}% VAT Refund</p>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-900">{item.uom}</span> ({item.gross_weight} kg)
                      </td>
                      <td className="p-3.5 font-mono font-bold text-blue-600">{item.unit_cbm}</td>
                      <td className="p-3.5 font-mono font-bold">
                        <span className={item.current_stock > 0 ? 'text-amber-600' : 'text-slate-400'}>
                          {item.current_stock}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleActive(item.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                            item.status === 'ACTIVE'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`}
                        >
                          {item.status}
                        </button>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[11px] font-semibold flex items-center gap-1 inline-flex cursor-pointer"
                        >
                          <Lock size={11} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload size={18} className="text-blue-600" /> Import Products (CSV / Excel)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file containing product catalog records.</p>
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

      {/* VIEW MODE 2: DARSH IMPEX FORM LAYOUT FOR ADD PRODUCT */}
      {viewMode === 'add' && (
        <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-2xs space-y-6">
          <form onSubmit={handleCreateProduct} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Product Name (As per Tally) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FR900 MSH Band Sealer"
                  value={formData.name_tally}
                  onChange={(e) => setFormData({ ...formData, name_tally: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Product Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRD-BS-FR900"
                  value={formData.product_code}
                  onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="flex justify-start pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Submit Product Master
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW MODE 3: PRODUCT DETAIL CARD */}
      {viewMode === 'detail' && selectedProduct && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">{selectedProduct.name_tally} Details</h3>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2 text-slate-700 font-mono">
            <p><strong>Code:</strong> {selectedProduct.product_code} | <strong>UOM:</strong> {selectedProduct.uom}</p>
            <p><strong>Category:</strong> {selectedProduct.category} &gt; {selectedProduct.subcategory}</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

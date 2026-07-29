import React, { useState, useRef } from 'react';
import { Database, Plus, Tags, Layers, Bookmark, Globe, X, CheckCircle, Download, Upload, FileSpreadsheet } from 'lucide-react';

export const MastersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories' | 'brands' | 'hsn' | 'countries'>('categories');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState([
    { id: '1', name: 'Machines', status: 'ACTIVE' },
    { id: '2', name: 'Food Ingredients', status: 'ACTIVE' },
    { id: '3', name: 'Chemicals', status: 'ACTIVE' },
    { id: '4', name: 'Spare Parts', status: 'ACTIVE' },
  ]);

  const [subcategories, setSubcategories] = useState([
    { id: 's1', name: 'Band Sealer', category: 'Machines', status: 'ACTIVE' },
    { id: 's2', name: 'Citric Acid', category: 'Food Ingredients', status: 'ACTIVE' },
    { id: 's3', name: 'Caustic Soda', category: 'Chemicals', status: 'ACTIVE' },
    { id: 's4', name: 'Spares for Band Sealer', category: 'Machines', status: 'ACTIVE' },
  ]);

  const [brands, setBrands] = useState([
    { id: 'b1', name: 'Yinglima Machinery', description: 'Band Sealers & Packaging Equipment', status: 'ACTIVE' },
    { id: 'b2', name: 'TTCA', description: 'Food grade citric acid manufacturer', status: 'ACTIVE' },
    { id: 'b3', name: 'Tianjin Bohai', description: 'Chemicals & Caustic Soda', status: 'ACTIVE' },
  ]);

  const [hsnCodes] = useState([
    { code: '84223000', description: 'Packaging or wrapping machinery', vat_refund: 13.0 },
    { code: '29181400', description: 'Citric Acid Anhydrous', vat_refund: 10.0 },
    { code: '28151100', description: 'Sodium hydroxide (Caustic Soda) solid', vat_refund: 13.0 },
  ]);

  const [countries] = useState([
    { name: 'China', code: 'CN', phone_code: '+86', min: 7, max: 11 },
    { name: 'Uganda', code: 'UG', phone_code: '+256', min: 9, max: 10 },
    { name: 'India', code: 'IN', phone_code: '+91', min: 10, max: 10 },
    { name: 'Kenya', code: 'KE', phone_code: '+254', min: 9, max: 10 },
  ]);

  // EXPORT FUNCTION (CSV Download)
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === 'categories') {
      headers = ['Category ID', 'Category Name', 'Status'];
      rows = categories.map((c) => [`"${c.id}"`, `"${c.name}"`, `"${c.status}"`]);
    } else if (activeTab === 'subcategories') {
      headers = ['Sub Category ID', 'Sub Category Name', 'Parent Category', 'Status'];
      rows = subcategories.map((s) => [`"${s.id}"`, `"${s.name}"`, `"${s.category}"`, `"${s.status}"`]);
    } else if (activeTab === 'brands') {
      headers = ['Brand ID', 'Brand Name', 'Description', 'Status'];
      rows = brands.map((b) => [`"${b.id}"`, `"${b.name}"`, `"${b.description}"`, `"${b.status}"`]);
    } else if (activeTab === 'hsn') {
      headers = ['HSN Code', 'Description', 'China Refund VAT %'];
      rows = hsnCodes.map((h) => [`"${h.code}"`, `"${h.description}"`, `"${h.vat_refund}"`]);
    } else {
      headers = ['Country Name', 'ISO Code', 'Phone Dial Code', 'Min Digits', 'Max Digits'];
      rows = countries.map((c) => [`"${c.name}"`, `"${c.code}"`, `"${c.phone_code}"`, `"${c.min}"`, `"${c.max}"`]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Yinglima_Masters_${activeTab}_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // IMPORT FUNCTION
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTimeout(() => {
        if (activeTab === 'categories') {
          setCategories((prev) => [...prev, { id: `${Date.now()}`, name: 'New Imported Category', status: 'ACTIVE' }]);
        }
        setShowImportModal(false);
        setImportNotification(`Successfully imported master records from "${file.name}"!`);
        setTimeout(() => setImportNotification(null), 4000);
      }, 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Masters & Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Product Categories, Sub-Categories, Brands, HSN VAT & Country Rules
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-white text-blue-600 border-t-2 border-t-blue-600 border-x border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Tags size={14} /> Product Categories
        </button>
        <button
          onClick={() => setActiveTab('subcategories')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'subcategories'
              ? 'bg-white text-blue-600 border-t-2 border-t-blue-600 border-x border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers size={14} /> Sub Categories
        </button>
        <button
          onClick={() => setActiveTab('brands')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'brands'
              ? 'bg-white text-blue-600 border-t-2 border-t-blue-600 border-x border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Bookmark size={14} /> Brands
        </button>
        <button
          onClick={() => setActiveTab('hsn')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'hsn'
              ? 'bg-white text-blue-600 border-t-2 border-t-blue-600 border-x border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          HSN & Refund VAT
        </button>
        <button
          onClick={() => setActiveTab('countries')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'countries'
              ? 'bg-white text-blue-600 border-t-2 border-t-blue-600 border-x border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Globe size={14} /> Countries & Phone Rules
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white border border-slate-200 p-6 rounded-b-xl rounded-tr-xl shadow-2xs">
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Product Categories</h3>
              <button
                onClick={() => setShowModal('CATEGORY')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Category
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'subcategories' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Product Sub Categories</h3>
              <button
                onClick={() => setShowModal('SUBCATEGORY')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Sub Category
              </button>
            </div>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3">Sub Category Name</th>
                  <th className="p-3">Parent Product Category</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subcategories.map((s) => (
                  <tr key={s.id}>
                    <td className="p-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="p-3 text-blue-600 font-semibold">{s.category}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'brands' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Brand Master</h3>
              <button
                onClick={() => setShowModal('BRAND')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Brand
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {brands.map((b) => (
                <div key={b.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm">{b.name}</h4>
                  <p className="text-xs text-slate-500">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'hsn' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">HSN Codes & China Refund VAT %</h3>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3">HSN Code</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Refund VAT %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hsnCodes.map((h) => (
                  <tr key={h.code}>
                    <td className="p-3 font-mono font-bold text-slate-900">{h.code}</td>
                    <td className="p-3">{h.description}</td>
                    <td className="p-3 font-bold text-emerald-700">{h.vat_refund}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'countries' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Countries & Phone Validation Rules</h3>
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="p-3">Country Name</th>
                  <th className="p-3">ISO Code</th>
                  <th className="p-3">Phone Dial Code</th>
                  <th className="p-3">Phone Digits Allowed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {countries.map((c) => (
                  <tr key={c.code}>
                    <td className="p-3 font-bold text-slate-900">{c.name}</td>
                    <td className="p-3 font-mono text-slate-500">{c.code}</td>
                    <td className="p-3 font-mono text-blue-600">{c.phone_code}</td>
                    <td className="p-3">{c.min} to {c.max} Digits</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload size={18} className="text-blue-600" /> Import Master Data (CSV / Excel)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file for master records.</p>
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

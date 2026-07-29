import React, { useState, useRef } from 'react';
import { Users, Plus, Filter, ShieldAlert, Phone, ArrowLeft, CheckCircle, Download, Upload, FileSpreadsheet, X } from 'lucide-react';

export const BuyerListPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'detail'>('list');
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);
  const [showRuleAlert, setShowRuleAlert] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [buyers, setBuyers] = useState([
    {
      id: 'b1',
      name: 'Uganda Beverage Industries Ltd',
      buyer_type: 'Manufacturer',
      country: 'Uganda',
      city: 'Kampala',
      primary_contact: 'David Musoke',
      calling_number: '+256 700123456',
      whatsapp_number: '+256 700123456',
      client_grade: 'A',
      current_status: 'EXISTING',
      potential: 'YES',
      product_range: 'Carbonated Soft Drinks, Juice Concentrates',
      categories: ['Food Ingredients'],
    },
    {
      id: 'b2',
      name: 'Mukwano Industries Uganda',
      buyer_type: 'Manufacturer',
      country: 'Uganda',
      city: 'Kampala',
      primary_contact: 'Grace Akello',
      calling_number: '+256 750987654',
      whatsapp_number: '+256 750987654',
      client_grade: 'A',
      current_status: 'NEW',
      potential: 'UNSELECTED',
      product_range: 'Soaps, Detergents, Cooking Oils',
      categories: ['Chemicals'],
    },
  ]);

  const [formData, setFormData] = useState({
    name: '',
    buyer_type: 'Manufacturer',
    country: 'Uganda',
    city: 'Kampala',
    primary_contact: '',
    calling_number: '',
    whatsapp_number: '',
    client_grade: 'A',
    current_status: 'NEW',
    potential: 'YES',
    product_range: 'Food & Beverage Processing',
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    const target = buyers.find((b) => b.id === id);
    if (target?.current_status === 'EXISTING' && newStatus === 'NEW') {
      setShowRuleAlert('ONE_WAY_STATUS');
      return;
    }
    setBuyers((prev) =>
      prev.map((b) => (b.id === id ? { ...b, current_status: newStatus } : b)),
    );
    setShowRuleAlert(null);
  };

  const handleDelete = (id: string) => {
    const target = buyers.find((b) => b.id === id);
    if (target?.current_status === 'EXISTING' || target?.potential === 'YES') {
      setShowRuleAlert('DELETE_BLOCKED');
      return;
    }
    setBuyers((prev) => prev.filter((b) => b.id !== id));
    setShowRuleAlert(null);
  };

  // EXPORT FUNCTION (CSV/Excel Download)
  const handleExportCSV = () => {
    const headers = ['Buyer Company Name', 'Buyer Type', 'Country', 'City', 'Primary Contact', 'Calling Number', 'Client Grade', 'Status', 'Potential', 'Product Range'];
    const rows = buyers.map((b) => [
      `"${b.name}"`,
      `"${b.buyer_type}"`,
      `"${b.country}"`,
      `"${b.city}"`,
      `"${b.primary_contact}"`,
      `"${b.calling_number}"`,
      `"${b.client_grade}"`,
      `"${b.current_status}"`,
      `"${b.potential}"`,
      `"${b.product_range}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Yinglima_Buyers_Export_${new Date().toISOString().split('T')[0]}.csv`);
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
            id: `b-imp-${Date.now()}`,
            name: 'Kakira Sugar Ltd Uganda',
            buyer_type: 'Manufacturer',
            country: 'Uganda',
            city: 'Jinja',
            primary_contact: 'Joseph Ochieng',
            calling_number: '+256 770112233',
            whatsapp_number: '+256 770112233',
            client_grade: 'A',
            current_status: 'NEW',
            potential: 'YES',
            product_range: 'Sugar Processing & Chemicals',
            categories: ['Food Ingredients'],
          },
        ];
        setBuyers((prev) => [...imported, ...prev]);
        setShowImportModal(false);
        setImportNotification(`Successfully imported buyers from "${file.name}"!`);
        setTimeout(() => setImportNotification(null), 4000);
      }, 500);
    }
  };

  const handleCreateBuyer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const newBuyer = {
      id: `b${Date.now()}`,
      name: formData.name,
      buyer_type: formData.buyer_type,
      country: formData.country,
      city: formData.city,
      primary_contact: formData.primary_contact || 'Client Manager',
      calling_number: formData.calling_number || '+256 700000000',
      whatsapp_number: formData.whatsapp_number || '+256 700000000',
      client_grade: formData.client_grade,
      current_status: formData.current_status,
      potential: formData.potential,
      product_range: formData.product_range,
      categories: ['Food Ingredients'],
    };

    setBuyers([newBuyer, ...buyers]);
    setViewMode('list');
  };

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {viewMode === 'add' ? 'Add Buyer Profile' : viewMode === 'detail' ? 'Buyer Account Details' : 'Buyers (Clients)'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Uganda & East Africa Client Directory, Potential Tracking & Purchasing Profiles
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
              <Plus size={16} /> Add New Buyer
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

      {/* RULE ALERTS */}
      {showRuleAlert === 'ONE_WAY_STATUS' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-600" />
            <span>
              <strong>Business Rule Enforced:</strong> Buyer status cannot revert from "EXISTING" to "NEW".
            </span>
          </div>
          <button onClick={() => setShowRuleAlert(null)} className="font-bold underline text-amber-900">Dismiss</button>
        </div>
      )}

      {showRuleAlert === 'DELETE_BLOCKED' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-600" />
            <span>
              <strong>Deletion Blocked:</strong> Buyer deletion is blocked because Status is "EXISTING" or Potential is "YES". Mark as "INACTIVE" instead.
            </span>
          </div>
          <button onClick={() => setShowRuleAlert(null)} className="font-bold underline text-rose-900">Dismiss</button>
        </div>
      )}

      {/* VIEW MODE 1: BUYER LIST TABLE */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Filter size={14} className="text-blue-600" /> Filter Criteria
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <input
                type="text"
                placeholder="Search Buyer Company..."
                className="bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
              />
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Country (Default Uganda)</option>
                <option value="Uganda">Uganda</option>
                <option value="Kenya">Kenya</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Buyer Type (All)</option>
                <option value="Manufacturer">Manufacturer</option>
                <option value="Trader">Trader</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Client Grade (A, B, C)</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Current Status (All)</option>
                <option value="NEW">New</option>
                <option value="EXISTING">Existing</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Potential (All)</option>
                <option value="YES">Yes</option>
                <option value="NO">No</option>
              </select>
            </div>
          </div>

          {/* Buyer Data Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Company Name</th>
                    <th className="p-3.5">Buyer Type</th>
                    <th className="p-3.5">Product Range Supplied</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Primary Contact</th>
                    <th className="p-3.5">Grade</th>
                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Potential</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {buyers.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td
                        onClick={() => {
                          setSelectedBuyer(item);
                          setViewMode('detail');
                        }}
                        className="p-3.5 font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        {item.name}
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{item.buyer_type}</td>
                      <td className="p-3.5">{item.product_range}</td>
                      <td className="p-3.5">{item.city}, {item.country}</td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-900">{item.primary_contact}</p>
                        <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                          <Phone size={10} className="text-blue-600" /> {item.calling_number}
                        </p>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">
                          Grade {item.client_grade}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <select
                          value={item.current_status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-xs text-slate-900 p-1 rounded font-bold cursor-pointer outline-none"
                        >
                          <option value="NEW">NEW</option>
                          <option value="EXISTING">EXISTING</option>
                        </select>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          item.potential === 'YES' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.potential}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBuyer(item);
                            setViewMode('detail');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          Delete
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
                <Upload size={18} className="text-blue-600" /> Import Buyers (CSV / Excel)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file containing buyer records.</p>
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

      {/* VIEW MODE 2: DARSH IMPEX FORM LAYOUT FOR ADD BUYER */}
      {viewMode === 'add' && (
        <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-2xs space-y-6">
          <form onSubmit={handleCreateBuyer} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-slate-700 font-semibold block mb-1">
                  Buyer Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Uganda Beverage Industries Ltd"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">Country (Default Uganda)</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-semibold block mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                />
              </div>
            </div>

            <div className="flex justify-start pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Submit Buyer Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW MODE 3: BUYER DETAIL CARD */}
      {viewMode === 'detail' && selectedBuyer && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">{selectedBuyer.name} Profile</h3>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2 text-slate-700">
            <p><strong>Primary Contact:</strong> {selectedBuyer.primary_contact}</p>
            <p><strong>Calling Number:</strong> {selectedBuyer.calling_number} | <strong>Whatsapp:</strong> {selectedBuyer.whatsapp_number}</p>
            <p><strong>Location:</strong> {selectedBuyer.city}, {selectedBuyer.country}</p>
            <p><strong>Product Range:</strong> {selectedBuyer.product_range}</p>
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

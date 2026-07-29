import React, { useState, useRef } from 'react';
import { Truck, Plus, Filter, ShieldAlert, ArrowLeft, Download, Upload, FileSpreadsheet, X, CheckCircle, Copy, Eye, Trash2, Camera, Building2, MapPin, Phone } from 'lucide-react';

export const SupplierListPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'detail'>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showRuleAlert, setShowRuleAlert] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Stage state (Stage 1 & Stage 2)
  const [formStage, setFormStage] = useState<1 | 2>(1);

  // Suppliers state with full domain fields
  const [suppliers, setSuppliers] = useState([
    {
      id: 's1',
      name: 'Zhejiang Packaging Machinery Ltd',
      supplier_type: 'Manufacturer',
      brand_name: 'Yinglima Machinery',
      category: 'Machines',
      subcategory: 'Band Sealer',
      country: 'China',
      province: 'Zhejiang',
      city: 'Wenzhou',
      town: 'Ruian',
      address: 'No. 888 Industrial Zone',
      contact_title: 'Mr',
      contact_name: 'John Zhang',
      designation: 'Export Director',
      calling_number: '+86 13800138000',
      whatsapp_number: '+86 13800138000',
      wechat_number: 'wxid_john88',
      email: 'john@zhejiangpack.com',
      tax_id: '91330300MA12345678',
      primary_website: 'www.zhejiangpack.com',
      secondary_website: 'www.pack-machine.cn',
      key_strengths: 'Band Sealer, Vacuum Packing specialist',
      grade: 'A',
      current_status: 'EXISTING',
      potential: 'YES',
      potential_reason: 'High manufacturing capacity & quality control',
      secondary_products: 'Teflon Belts, Heating Blocks, Spare Parts',
      visited_factory: 'Yes',
      visit_remarks: 'Visited factory in April 2024. 4 production lines active.',
      contacts: [
        { name: 'John Zhang', designation: 'Export Manager', territory: 'Export Africa & India', calling: '+86 13800138000', email: 'john@zhejiangpack.com' },
      ],
    },
    {
      id: 's2',
      name: 'Shandong Citric Acid Chemical Co',
      supplier_type: 'Manufacturer',
      brand_name: 'TTCA Brand',
      category: 'Food Ingredients',
      subcategory: 'Citric Acid',
      country: 'China',
      province: 'Shandong',
      city: 'Weifang',
      town: 'Anqiu',
      address: 'Chemical Industry Park',
      contact_title: 'Mr',
      contact_name: 'Li Wei',
      designation: 'Sales Manager',
      calling_number: '+86 13900139000',
      whatsapp_number: '+86 13900139000',
      wechat_number: 'wxid_liwei99',
      email: 'liwei@citric.cn',
      tax_id: '91370700MA98765432',
      primary_website: 'www.citricacid-shandong.com',
      secondary_website: '',
      key_strengths: 'Citric Acid Anhydrous 30-100 mesh',
      grade: 'B',
      current_status: 'NEW',
      potential: 'UNSELECTED',
      potential_reason: '',
      secondary_products: 'Citric Acid Monohydrate',
      visited_factory: 'No',
      visit_remarks: '',
      contacts: [
        { name: 'Li Wei', designation: 'Sales Manager', territory: 'Export Global', calling: '+86 13900139000', email: 'liwei@citric.cn' },
      ],
    },
  ]);

  // Form State matching Document 4
  const [formData, setFormData] = useState({
    name: '',
    supplier_type: 'Manufacturer',
    brand_name: 'Yinglima Machinery',
    category: 'Machines',
    subcategory: 'Band Sealer',
    country: 'China',
    province: 'Zhejiang',
    city: 'Wenzhou',
    town: 'Ruian',
    address: '',
    contact_title: 'Mr',
    contact_name: '',
    designation: '',
    calling_number: '',
    whatsapp_number: '',
    wechat_number: '',
    email: '',
    tax_id: '',
    primary_website: '',
    secondary_website: '',
    key_strengths: '',
    grade: 'A',
    current_status: 'NEW',
    potential: 'YES',
    potential_reason: '',
    secondary_products: '',
    visited_factory: 'No',
    visit_remarks: '',
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    const target = suppliers.find((s) => s.id === id);
    if (target?.current_status === 'EXISTING' && newStatus === 'NEW') {
      setShowRuleAlert('ONE_WAY_STATUS');
      return;
    }
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, current_status: newStatus } : s)),
    );
    setShowRuleAlert(null);
  };

  const handleDelete = (id: string) => {
    const target = suppliers.find((s) => s.id === id);
    if (target?.current_status === 'EXISTING' || target?.potential === 'YES') {
      setShowRuleAlert('DELETE_BLOCKED');
      return;
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    setShowRuleAlert(null);
  };

  const handleExportCSV = () => {
    const headers = ['Company Name', 'Supplier Type', 'Category', 'Sub Category', 'Country', 'Province', 'City', 'Contact Name', 'Calling Number', 'Grade', 'Current Status', 'Potential'];
    const rows = suppliers.map((s) => [
      `"${s.name}"`,
      `"${s.supplier_type}"`,
      `"${s.category}"`,
      `"${s.subcategory}"`,
      `"${s.country}"`,
      `"${s.province}"`,
      `"${s.city}"`,
      `"${s.contact_name}"`,
      `"${s.calling_number}"`,
      `"${s.grade}"`,
      `"${s.current_status}"`,
      `"${s.potential}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Yinglima_Suppliers_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTimeout(() => {
        const imported = [
          {
            id: `s-imp-${Date.now()}`,
            name: 'Wenzhou Machinery Manufacturing Co',
            supplier_type: 'Manufacturer',
            brand_name: 'Yinglima Partner',
            category: 'Machines',
            subcategory: 'Vacuum Packers',
            country: 'China',
            province: 'Zhejiang',
            city: 'Wenzhou',
            town: 'Ouhai',
            address: 'Machinery Industrial Park',
            contact_title: 'Mr',
            contact_name: 'Chen Gang',
            designation: 'Sales Director',
            calling_number: '+86 13700137000',
            whatsapp_number: '+86 13700137000',
            wechat_number: 'wxid_chen',
            email: 'sales@wenzhoupack.cn',
            tax_id: '91330302MA99112233',
            primary_website: 'www.wenzhoupack.cn',
            secondary_website: '',
            key_strengths: 'Double Chamber Vacuum Sealers',
            grade: 'A',
            current_status: 'NEW',
            potential: 'YES',
            potential_reason: 'Imported via CSV',
            secondary_products: 'Spare Seals, Heating Wires',
            visited_factory: 'No',
            visit_remarks: '',
            contacts: [],
          },
        ];
        setSuppliers((prev) => [...imported, ...prev]);
        setShowImportModal(false);
        setImportNotification(`Successfully imported records from "${file.name}"!`);
        setTimeout(() => setImportNotification(null), 4000);
      }, 500);
    }
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const newSupplier = {
      id: `s${Date.now()}`,
      name: formData.name,
      supplier_type: formData.supplier_type,
      brand_name: formData.brand_name,
      category: formData.category,
      subcategory: formData.subcategory,
      country: formData.country,
      province: formData.province,
      city: formData.city,
      town: formData.town,
      address: formData.address || 'Industrial Zone',
      contact_title: formData.contact_title,
      contact_name: formData.contact_name || 'John Zhang',
      designation: formData.designation || 'Sales Manager',
      calling_number: formData.calling_number || '+86 13800000000',
      whatsapp_number: formData.whatsapp_number || formData.calling_number || '+86 13800000000',
      wechat_number: formData.wechat_number || 'wxid_supplier',
      email: formData.email || 'info@supplier.com',
      tax_id: formData.tax_id || 'TAX-99887766',
      primary_website: formData.primary_website || 'www.supplier.com',
      secondary_website: formData.secondary_website,
      key_strengths: formData.key_strengths || 'Key Factory Supplier',
      grade: formData.grade,
      current_status: formData.current_status,
      potential: formData.potential,
      potential_reason: formData.potential_reason,
      secondary_products: formData.secondary_products,
      visited_factory: formData.visited_factory,
      visit_remarks: formData.visit_remarks,
      contacts: [
        {
          name: `${formData.contact_title} ${formData.contact_name || 'John Zhang'}`,
          designation: formData.designation || 'Sales Manager',
          territory: 'Export Global',
          calling: formData.calling_number || '+86 13800000000',
          email: formData.email || 'info@supplier.com',
        },
      ],
    };

    setSuppliers([newSupplier, ...suppliers]);
    setViewMode('list');
    setFormStage(1);
  };

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {viewMode === 'add' ? `Add Supplier Profile (Stage ${formStage} of 2)` : viewMode === 'detail' ? 'Supplier Details' : 'Suppliers'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Yinglima China Procurement & Supplier Database (2-Stage Profile Entry)
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
              onClick={() => {
                setViewMode('add');
                setFormStage(1);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} /> Add New Supplier
            </button>
          </div>
        ) : (
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft size={15} /> BACK TO LIST
          </button>
        )}
      </div>

      {/* IMPORT TOAST */}
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
              <strong>Validation Rule Enforced:</strong> Current Status cannot revert from "EXISTING" to "NEW" (One-Way Status Rule).
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
              <strong>Deletion Blocked:</strong> Supplier deletion is blocked because Status is "EXISTING" or Potential is "YES". Mark as "INACTIVE" instead.
            </span>
          </div>
          <button onClick={() => setShowRuleAlert(null)} className="font-bold underline text-rose-900">Dismiss</button>
        </div>
      )}

      {/* VIEW MODE 1: SUPPLIER LIST TABLE */}
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
                placeholder="Search Company Name..."
                className="bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
              />
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Product Category (All)</option>
                <option value="Machines">Machines</option>
                <option value="Food Ingredients">Food Ingredients</option>
                <option value="Chemicals">Chemicals</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Supplier Type (All)</option>
                <option value="Manufacturer">Manufacturer</option>
                <option value="Trader">Trader</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Grade (A, B, C)</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Current Status (All)</option>
                <option value="NEW">New</option>
                <option value="EXISTING">Existing</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none">
                <option value="">Visited Factory? (All)</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          {/* Supplier Data Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Company Name</th>
                    <th className="p-3.5">Category & Sub Category</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Primary Contact</th>
                    <th className="p-3.5">Calling & WeChat</th>
                    <th className="p-3.5">Grade</th>
                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Visited Factory</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {suppliers.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td
                        onClick={() => {
                          setSelectedSupplier(item);
                          setViewMode('detail');
                        }}
                        className="p-3.5 font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        {item.name}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-900">{item.category}</span>
                        <p className="text-[11px] text-slate-500">{item.subcategory}</p>
                      </td>
                      <td className="p-3.5">{item.city}, {item.province}, {item.country}</td>
                      <td className="p-3.5">
                        <p className="font-semibold text-slate-900">{item.contact_title} {item.contact_name}</p>
                        <p className="text-[11px] text-slate-500">{item.designation}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="font-mono text-slate-800">{item.calling_number}</p>
                        <p className="text-[11px] text-blue-600 font-mono">WeChat: {item.wechat_number}</p>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">
                          Grade {item.grade}
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
                          item.visited_factory === 'Yes' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.visited_factory}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSupplier(item);
                            setViewMode('detail');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          View Profile
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

      {/* VIEW MODE 2: 2-STAGE FORM ENTRY (DOCUMENT 4 SPEC) */}
      {viewMode === 'add' && (
        <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-2xs space-y-6">
          {/* Stage Tabs */}
          <div className="flex border-b border-slate-200 gap-4 pb-3">
            <button
              type="button"
              onClick={() => setFormStage(1)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                formStage === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Stage 1: Basic Company & Contact Info
            </button>
            <button
              type="button"
              onClick={() => setFormStage(2)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                formStage === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Stage 2: Main Data Profile & Factory Visit
            </button>
          </div>

          <form onSubmit={handleCreateSupplier} className="space-y-6">
            {formStage === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-700 font-semibold block mb-1">
                    Name Of Company <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zhejiang Packaging Machinery Ltd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Supplier Type</label>
                  <select
                    value={formData.supplier_type}
                    onChange={(e) => setFormData({ ...formData, supplier_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  >
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Trader">Trader</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Yinglima Machinery"
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">
                    Province <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Town</label>
                  <input
                    type="text"
                    placeholder="e.g. Ruian"
                    value={formData.town}
                    onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Contact Person Name</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.contact_title}
                      onChange={(e) => setFormData({ ...formData, contact_title: e.target.value })}
                      className="w-20 bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Contact Full Name"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Export Director"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">
                    Calling Number (7-11 digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+86 13800138000"
                    value={formData.calling_number}
                    onChange={(e) => setFormData({ ...formData, calling_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Whatsapp Number</label>
                  <input
                    type="text"
                    placeholder="+86 13800138000"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">WeChat Number</label>
                  <input
                    type="text"
                    placeholder="wxid_supplier"
                    value={formData.wechat_number}
                    onChange={(e) => setFormData({ ...formData, wechat_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Email ID</label>
                  <input
                    type="email"
                    placeholder="john@zhejiangpack.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>
              </div>
            )}

            {formStage === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Tax ID Number</label>
                  <input
                    type="text"
                    placeholder="91330300MA12345678"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Supplier Grade</label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  >
                    <option value="A">Grade A</option>
                    <option value="B">Grade B</option>
                    <option value="C">Grade C</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Current Status</label>
                  <select
                    value={formData.current_status}
                    onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  >
                    <option value="NEW">NEW</option>
                    <option value="EXISTING">EXISTING</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Visited Factory / Office?</label>
                  <select
                    value={formData.visited_factory}
                    onChange={(e) => setFormData({ ...formData, visited_factory: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                {formData.visited_factory === 'Yes' && (
                  <div className="md:col-span-4">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Visit Remarks & Factory Observation</label>
                    <input
                      type="text"
                      placeholder="e.g. Visited Wenzhou plant in April 2024. 4 active production lines."
                      value={formData.visit_remarks}
                      onChange={(e) => setFormData({ ...formData, visit_remarks: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    />
                  </div>
                )}

                <div className="md:col-span-4">
                  <label className="text-xs text-slate-700 font-semibold block mb-1">Overall Remarks / Key Strengths</label>
                  <textarea
                    rows={3}
                    placeholder="Band Sealer, Vacuum Packing, Key factory strength details..."
                    value={formData.key_strengths}
                    onChange={(e) => setFormData({ ...formData, key_strengths: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-3 rounded-lg outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {formStage === 2 ? (
                <button
                  type="button"
                  onClick={() => setFormStage(1)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
                >
                  Back to Stage 1
                </button>
              ) : <div />}

              {formStage === 1 ? (
                <button
                  type="button"
                  onClick={() => setFormStage(2)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm"
                >
                  Next to Stage 2
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm"
                >
                  Submit Supplier Profile
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* VIEW MODE 3: SUPPLIER DETAIL DRAWER CARD & CONTACTS TABLE */}
      {viewMode === 'detail' && selectedSupplier && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-2xs space-y-6">
          <h3 className="text-base font-bold text-slate-900">{selectedSupplier.name} Full Data Profile</h3>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2 text-slate-700">
            <p><strong>Primary Contact:</strong> {selectedSupplier.contact_title} {selectedSupplier.contact_name} ({selectedSupplier.designation})</p>
            <p><strong>Calling Number:</strong> {selectedSupplier.calling_number} | <strong>Whatsapp:</strong> {selectedSupplier.whatsapp_number} | <strong>WeChat:</strong> {selectedSupplier.wechat_number}</p>
            <p><strong>GST No / Tax ID:</strong> {selectedSupplier.tax_id}</p>
            <p><strong>Category:</strong> {selectedSupplier.category} &gt; {selectedSupplier.subcategory}</p>
            <p><strong>Address:</strong> {selectedSupplier.address}, {selectedSupplier.town}, {selectedSupplier.city}, {selectedSupplier.province}, {selectedSupplier.country}</p>
            <p><strong>Grade:</strong> Grade {selectedSupplier.grade} | <strong>Status:</strong> {selectedSupplier.current_status} | <strong>Visited Factory:</strong> {selectedSupplier.visited_factory}</p>
            {selectedSupplier.visit_remarks && <p><strong>Visit Remarks:</strong> {selectedSupplier.visit_remarks}</p>}
          </div>

          {/* Sub-contacts List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Associated Supplier Contacts</h4>
            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="p-2.5">Name / Designation</th>
                    <th className="p-2.5">Calling / Whatsapp</th>
                    <th className="p-2.5">Handling Territory</th>
                    <th className="p-2.5">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedSupplier.contacts?.map((c: any, i: number) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold">{c.name} ({c.designation})</td>
                      <td className="p-2.5 font-mono">{c.calling}</td>
                      <td className="p-2.5">{c.territory}</td>
                      <td className="p-2.5 font-mono text-blue-600">{c.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

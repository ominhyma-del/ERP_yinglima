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
  Search,
  Building2,
  Package,
  Calendar,
  UserCheck,
  Edit,
  Trash2,
  ShieldAlert,
  Zap,
  Filter,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { inquiryApi } from '../../api/inquiryApi';

// Consignment master options mapping by company
const companyConsignmentMasterMap: Record<string, { code: string; label: string }[]> = {
  'F&B Uganda Ingredients Ltd': [
    { code: 'FB1', label: 'FB1 - F&B Uganda Shipment 1' },
    { code: 'FB2', label: 'FB2 - F&B Uganda Shipment 2' },
    { code: 'FB3', label: 'FB3 - F&B Uganda Shipment 3' },
  ],
  'One Stop General Trading Uganda': [
    { code: 'OS1', label: 'OS1 - One Stop Uganda Shipment 1' },
    { code: 'OS2', label: 'OS2 - One Stop Uganda Shipment 2' },
  ],
  'Inhyma Machinery & Trade (China HQ / India)': [
    { code: 'ING1', label: 'ING1 - Inhyma Gujarat Shipment 1' },
    { code: 'ING2', label: 'ING2 - Inhyma Gujarat Shipment 2' },
    { code: 'INM1', label: 'INM1 - Inhyma Mumbai Shipment 1' },
    { code: 'INM2', label: 'INM2 - Inhyma Mumbai Shipment 2' },
    { code: 'INC1', label: 'INC1 - Inhyma Chennai Shipment 1' },
    { code: 'INI1', label: 'INI1 - Inhyma Indore Shipment 1' },
  ],
};

// Master Items with default UOM & License Requirement Flag
const masterProductOptions = [
  { name: 'Citric Acid Anhydrous 30-100 mesh', code: 'PRD-ING-CA01', uom: 'KG', defaultCbm: 0.035, defaultWeight: 25.2, requiresLicense: true, licenseRemark: 'FSSAI / Uganda UNBS Food Safety License Required' },
  { name: 'Caustic Soda Flakes 99%', code: 'PRD-CHM-CS02', uom: 'KG', defaultCbm: 0.04, defaultWeight: 25.0, requiresLicense: false, licenseRemark: '' },
  { name: 'FR900 MSH Band Sealer', code: 'PRD-BS-FR900', uom: 'PCS', defaultCbm: 0.16245, defaultWeight: 21.0, requiresLicense: true, licenseRemark: 'CE & Electrical Safety Certificate Required' },
  { name: 'Vacuum Packing Machine DZ400', code: 'PRD-MC-DZ400', uom: 'PCS', defaultCbm: 0.35, defaultWeight: 75.0, requiresLicense: false, licenseRemark: '' },
  { name: 'Citric Acid Monohydrate', code: 'PRD-ING-CAM02', uom: 'KG', defaultCbm: 0.035, defaultWeight: 25.2, requiresLicense: true, licenseRemark: 'Import Pharma & Food Grade Import License Required' },
];

export const InquiryPlanningPage: React.FC = () => {
  const [currentLayer, setCurrentLayer] = useState<1 | 2>(1);
  const [activeCompanyFilter, setActiveCompanyFilter] = useState<string>('ALL');
  const [activeConsignmentCode, setActiveConsignmentCode] = useState<string>('FB1');
  const [layer1Search, setLayer1Search] = useState<string>('');

  const [showRemarkModal, setShowRemarkModal] = useState<string | null>(null);
  const [showInquiryModal, setShowInquiryModal] = useState<'QUICK' | 'MAIN' | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [selectedItemsForTally, setSelectedItemsForTally] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User Role State (Admin sees all, User sees restricted)
  const [userRole] = useState<'ADMIN' | 'USER'>('ADMIN');
  const [loggedInCompany] = useState<string>('Inhyma Machinery & Trade (China HQ / India)');

  // 1ST LAYER SUMMARY: Company Consignments List
  const [consignments, setConsignments] = useState([
    {
      id: 'c-1',
      company: 'F&B Uganda Ingredients Ltd',
      code: 'FB1',
      status: 'PROPOSED', // PROPOSED, PARTIALLY_APPROVED, FULLY_APPROVED
      total_cbm: 28.45,
      total_weight: 14250,
      proposed_date: '2025-04-20',
      proposed_by: 'Yinglima Admin',
    },
    {
      id: 'c-2',
      company: 'F&B Uganda Ingredients Ltd',
      code: 'FB2',
      status: 'PARTIALLY_APPROVED',
      total_cbm: 32.1,
      total_weight: 16800,
      proposed_date: '2025-04-21',
      proposed_by: 'Uganda Buyer Team',
    },
    {
      id: 'c-3',
      company: 'One Stop General Trading Uganda',
      code: 'OS1',
      status: 'FULLY_APPROVED',
      total_cbm: 45.0,
      total_weight: 22500,
      proposed_date: '2025-04-18',
      proposed_by: 'One Stop Admin',
    },
    {
      id: 'c-4',
      company: 'Inhyma Machinery & Trade (China HQ / India)',
      code: 'ING1',
      status: 'PROPOSED',
      total_cbm: 18.2,
      total_weight: 8500,
      proposed_date: '2025-04-22',
      proposed_by: 'Gujarat Branch',
    },
  ]);

  // 2ND LAYER: Detailed Requirement Grid Line Items inside Consignment
  const [gridItems, setGridItems] = useState([
    {
      id: 'item-1',
      company: 'F&B Uganda Ingredients Ltd',
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
      license_remark: 'FSSAI / Uganda UNBS Food Safety License Required',
      proposed_date: '2025-04-20',
      proposed_by: 'Yinglima Admin',
    },
    {
      id: 'item-2',
      company: 'F&B Uganda Ingredients Ltd',
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
      license_remark: '',
      proposed_date: '2025-04-20',
      proposed_by: 'Yinglima Admin',
    },
    {
      id: 'item-3',
      company: 'F&B Uganda Ingredients Ltd',
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
      license_remark: 'CE & Electrical Safety Certificate Required',
      proposed_date: '2025-04-20',
      proposed_by: 'Yinglima Admin',
    },
    {
      id: 'item-4',
      company: 'F&B Uganda Ingredients Ltd',
      consignment_code: 'FB2',
      product_name: 'Vacuum Packing Machine DZ400',
      product_code: 'PRD-MC-DZ400',
      uom: 'PCS',
      quantity: 8,
      unit_cbm: 0.35,
      gross_weight: 75.0,
      brand_preference: 'Yinglima Preferred',
      product_specs: 'Double chamber vacuum sealer',
      procurement_remarks: 'Ready for loading',
      item_status: 'APPROVED',
      tally_post_status: 'PENDING',
      license_warning: false,
      license_remark: '',
      proposed_date: '2025-04-21',
      proposed_by: 'Uganda Buyer Team',
    },
  ]);

  // Filter & Sub-Tab States matching Darsh Impex
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [subTab, setSubTab] = useState<'Active' | 'Inactive'>('Active');
  const [showImpExpDropdown, setShowImpExpDropdown] = useState(false);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State for Quick / Main Add Modal
  const [formData, setFormData] = useState({
    company: loggedInCompany,
    consignment_code: 'FB1',
    product_name: '',
    product_code: '',
    uom: '',
    quantity: 100,
    brand_preference: 'TTCA Brand Preferred',
    product_specs: 'Standard export packaging',
    status: 'PROPOSED',
  });

  // Calculate UOM automatically when product name changes
  const handleProductNameChange = (selectedProdName: string) => {
    if (!selectedProdName) {
      setFormData((prev) => ({
        ...prev,
        product_name: '',
        product_code: '',
        uom: '',
      }));
      return;
    }
    const matched = masterProductOptions.find((p) => p.name === selectedProdName);
    setFormData((prev) => ({
      ...prev,
      product_name: selectedProdName,
      product_code: matched?.code || 'PRD-CUSTOM',
      uom: matched?.uom || 'PCS',
    }));
  };

  // Open Inquiry Modal with Prefilled Memory for Brand & Specs
  const handleOpenInquiryModal = (type: 'QUICK' | 'MAIN') => {
    const lastBrand = localStorage.getItem('yinglima_last_brand_pref') || 'TTCA Brand Preferred';
    const lastSpecs = localStorage.getItem('yinglima_last_product_specs') || 'Standard export packaging';
    const initialComp = userRole === 'ADMIN' ? loggedInCompany : loggedInCompany;
    const initialCode = companyConsignmentMasterMap[initialComp]?.[0]?.code || 'FB1';

    setFormData({
      company: initialComp,
      consignment_code: initialCode,
      product_name: '',
      product_code: '',
      uom: '',
      quantity: 100,
      brand_preference: lastBrand,
      product_specs: lastSpecs,
      status: 'PROPOSED',
    });
    setShowInquiryModal(type);
  };

  // Quick or Main Form Submit Handler
  const handleSaveInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name) {
      alert('Please select a Product Name from the dropdown menu.');
      return;
    }
    const matched = masterProductOptions.find((p) => p.name === formData.product_name);
    const requiresLic = matched ? matched.requiresLicense : false;
    const licRem = matched ? matched.licenseRemark : '';

    // Remember last entered Brand Preference and Product Specs in localStorage memory
    if (formData.brand_preference) {
      localStorage.setItem('yinglima_last_brand_pref', formData.brand_preference);
    }
    if (formData.product_specs) {
      localStorage.setItem('yinglima_last_product_specs', formData.product_specs);
    }

    const newItem = {
      id: `item-${Date.now()}`,
      company: formData.company,
      consignment_code: formData.consignment_code,
      product_name: formData.product_name,
      product_code: matched?.code || 'PRD-CUSTOM',
      uom: matched?.uom || 'PCS',
      quantity: Number(formData.quantity),
      unit_cbm: matched?.defaultCbm || 0.1,
      gross_weight: matched?.defaultWeight || 20.0,
      brand_preference: formData.brand_preference || 'Standard Preferred',
      product_specs: formData.product_specs || 'Standard Spec',
      procurement_remarks: 'China Procurement: Item added to consignment requirement.',
      item_status: formData.status,
      tally_post_status: 'PENDING',
      license_warning: requiresLic,
      license_remark: licRem,
      proposed_date: new Date().toISOString().split('T')[0],
      proposed_by: 'Yinglima Admin',
    };

    // Persist to Supabase Cloud DB via NestJS Backend API
    inquiryApi.createInquiryItem(newItem);
    setGridItems([newItem, ...gridItems]);

    // Ensure Consignment exists in 1st layer summary
    const existsInLayer1 = consignments.some((c) => c.code === formData.consignment_code);
    if (!existsInLayer1) {
      setConsignments([
        {
          id: `c-${Date.now()}`,
          company: formData.company,
          code: formData.consignment_code,
          status: 'PROPOSED',
          total_cbm: (matched?.defaultCbm || 0.1) * Number(formData.quantity),
          total_weight: (matched?.defaultWeight || 20) * Number(formData.quantity),
          proposed_date: new Date().toISOString().split('T')[0],
          proposed_by: 'Yinglima Admin',
        },
        ...consignments,
      ]);
    }

    setShowInquiryModal(null);
    setImportNotification(`Successfully added inquiry item "${newItem.product_name}" to consignment "${newItem.consignment_code}"!`);
    setTimeout(() => setImportNotification(null), 5000);
  };

  // Editable Quantity in Grid
  const handleQuantityChange = (id: string, newQty: number) => {
    setGridItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item)),
    );
  };

  // Shift item between consignments (e.g., FB1 to FB2)
  const handleShiftConsignment = (id: string, targetCode: string) => {
    setGridItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, consignment_code: targetCode } : item)),
    );
  };

  // Tally Entry Posted Bulk Selection Toggle
  const toggleItemForTally = (id: string) => {
    if (selectedItemsForTally.includes(id)) {
      setSelectedItemsForTally(selectedItemsForTally.filter((i) => i !== id));
    } else {
      setSelectedItemsForTally([...selectedItemsForTally, id]);
    }
  };

  const handleTallyPostBulk = () => {
    setGridItems((prev) =>
      prev.map((item) =>
        selectedItemsForTally.includes(item.id) || selectedItemsForTally.length === 0
          ? { ...item, tally_post_status: 'POSTED' }
          : item,
      ),
    );
    setSelectedItemsForTally([]);
    setImportNotification('Selected inquiry entries marked as "Tally Posted"!');
    setTimeout(() => setImportNotification(null), 4000);
  };

  // Filter 1st Layer Consignments by Company & Search
  const filteredLayer1Consignments = consignments.filter((c) => {
    if (activeCompanyFilter !== 'ALL' && c.company !== activeCompanyFilter) return false;
    if (layer1Search) {
      const term = layer1Search.toLowerCase();
      const codeMatch = c.code.toLowerCase().includes(term);
      const compMatch = c.company.toLowerCase().includes(term);
      if (!codeMatch && !compMatch) return false;
    }
    return true;
  });

  // Filter 2nd Layer Grid Items by activeConsignmentCode
  const activeGridItems = gridItems
    .filter((item) => item.consignment_code === activeConsignmentCode)
    .sort((a, b) => (a.tally_post_status === 'PENDING' ? -1 : 1)); // Pending entries on top by default!

  // Export CSV (Layer-Aware & Excel UTF-8 BOM formatted)
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let fileName = '';

    if (currentLayer === 1) {
      // 1ST LAYER EXPORT: Company Consignment Summary List
      headers = [
        'Inquiry By (Buyer Company Name)',
        'Consignment Code',
        'Consignment Status',
        'Total CBM (m³)',
        'Total Gross Weight (KG)',
        'Proposed Date',
        'Proposed By',
      ];

      rows = filteredLayer1Consignments.map((c) => [
        `"${(c.company || '').replace(/"/g, '""')}"`,
        `"${(c.code || '').replace(/"/g, '""')}"`,
        `"${(c.status || '').replace(/"/g, '""')}"`,
        `"${c.total_cbm || 0}"`,
        `"${c.total_weight || 0}"`,
        `"${c.proposed_date || ''}"`,
        `"${(c.proposed_by || '').replace(/"/g, '""')}"`,
      ]);

      fileName = `Yinglima_Consignments_Summary_Layer1_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // 2ND LAYER EXPORT: Consignment Line Items Master Planning Sheet
      headers = [
        'Inquiry By (Buyer Company Name)',
        'Consignment Code',
        'Product Name',
        'Product Code',
        'Quantity',
        'UOM',
        'Brand Preference',
        'Product Specs / Remarks',
        'Computed CBM (m³)',
        'Computed Gross Weight (KG)',
        'Item Status',
        'Tally Entry Status',
        'License Required?',
        'License Warning Remark',
        'China Procurement Team Remarks',
        'Proposed Date',
        'Proposed By',
      ];

      rows = activeGridItems.map((i) => [
        `"${(i.company || '').replace(/"/g, '""')}"`,
        `"${(i.consignment_code || '').replace(/"/g, '""')}"`,
        `"${(i.product_name || '').replace(/"/g, '""')}"`,
        `"${(i.product_code || '').replace(/"/g, '""')}"`,
        `"${i.quantity || 0}"`,
        `"${(i.uom || '').replace(/"/g, '""')}"`,
        `"${(i.brand_preference || '').replace(/"/g, '""')}"`,
        `"${(i.product_specs || '').replace(/"/g, '""')}"`,
        `"${(i.quantity * i.unit_cbm).toFixed(3)}"`,
        `"${(i.quantity * i.gross_weight).toFixed(2)}"`,
        `"${(i.item_status || '').replace(/"/g, '""')}"`,
        `"${(i.tally_post_status || '').replace(/"/g, '""')}"`,
        `"${i.license_warning ? 'YES' : 'NO'}"`,
        `"${(i.license_remark || '').replace(/"/g, '""')}"`,
        `"${(i.procurement_remarks || '').replace(/"/g, '""')}"`,
        `"${i.proposed_date || ''}"`,
        `"${(i.proposed_by || '').replace(/"/g, '""')}"`,
      ]);

      fileName = `Yinglima_Inquiry_Planning_${activeConsignmentCode}_${new Date().toISOString().split('T')[0]}.csv`;
    }

    const csvContent = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTimeout(() => {
        setShowImportModal(false);
        setImportNotification(`Imported inquiry requirements from "${file.name}"!`);
        setTimeout(() => setImportNotification(null), 4000);
      }, 500);
    }
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
              {currentLayer === 1
                ? 'Local Purchase / Inquiry (1st Layer - Company & Consignments)'
                : `Consignment Master Planning Sheet (${activeConsignmentCode})`}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentLayer === 1
              ? 'Company-wise Summary (F&B, One Stop, Inhyma) & Aggregate Consignment Codes'
              : 'Excel-like Master Planning Sheet for Line Items, Quantities, License Alerts & Tally Post'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* DARSH IMPEX FILTER TOGGLE BUTTON [ T ] */}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`p-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              showFilterPanel
                ? 'bg-slate-700 hover:bg-slate-800 text-white'
                : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
            title="Toggle Filter Fields Box"
          >
            <Filter size={16} />
          </button>

          <button
            onClick={() => handleOpenInquiryModal('QUICK')}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Zap size={15} /> Quick Add Inquiry
          </button>
          <button
            onClick={() => handleOpenInquiryModal('MAIN')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} /> + ADD NEW
          </button>

          {/* IMP / EXP DROPDOWN BUTTON */}
          <div className="relative">
            <button
              onClick={() => setShowImpExpDropdown(!showImpExpDropdown)}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <span>Imp / Exp</span>
              <ChevronDown size={14} />
            </button>
            {showImpExpDropdown && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-xl z-50 text-xs py-1">
                <button
                  onClick={() => {
                    setShowImportModal(true);
                    setShowImpExpDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold"
                >
                  <Upload size={14} className="text-blue-600" /> Import
                </button>
                <button
                  onClick={() => {
                    handleExportCSV();
                    setShowImpExpDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold"
                >
                  <Download size={14} className="text-amber-600" /> Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* IMPORT / SAVE SUCCESS TOAST */}
      {importNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            <span>{importNotification}</span>
          </div>
          <button onClick={() => setImportNotification(null)} className="font-bold underline text-emerald-900">Dismiss</button>
        </div>
      )}

      {/* 1ST LAYER: COMPANY WISE SUMMARY & CONSIGNMENT CODES */}
      {currentLayer === 1 && (
        <div className="space-y-4">
          {/* EXACT DARSH IMPEX COLLAPSIBLE FILTER PANEL */}
          {showFilterPanel && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 transition-all">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Company Filter</label>
                  <select
                    value={activeCompanyFilter}
                    onChange={(e) => setActiveCompanyFilter(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 p-2 rounded-lg outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="ALL">All Companies</option>
                    {Object.keys(companyConsignmentMasterMap).map((comp) => (
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Consignment Code</label>
                  <select
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-800 p-2 rounded-lg outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">All Consignment Codes</option>
                    <option value="FB1">FB1 (F&B Uganda)</option>
                    <option value="FB2">FB2 (F&B Uganda)</option>
                    <option value="OS1">OS1 (One Stop Uganda)</option>
                    <option value="ING1">ING1 (Inhyma Gujarat)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    className="w-full bg-white border border-slate-300 text-slate-800 p-2 rounded-lg outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PROPOSED">Proposed</option>
                    <option value="PARTIALLY_APPROVED">Partially Approved</option>
                    <option value="FULLY_APPROVED">Fully Approved</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCompanyFilter('ALL');
                  }}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw size={14} /> Reset
                </button>
                <button
                  onClick={() => {}}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Search size={14} /> Search
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE / INACTIVE SUB-TAB NAVIGATION MATCHING DARSH IMPEX */}
          <div className="flex items-center border-b border-slate-200 px-1 gap-8 text-xs font-bold pt-2">
            <button
              onClick={() => setSubTab('Active')}
              className={`pb-3 border-b-2 transition-all cursor-pointer ${
                subTab === 'Active'
                  ? 'border-blue-600 text-blue-600 font-extrabold text-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setSubTab('Inactive')}
              className={`pb-3 border-b-2 transition-all cursor-pointer ${
                subTab === 'Inactive'
                  ? 'border-blue-600 text-blue-600 font-extrabold text-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Inactive
            </button>
          </div>
          {/* SEARCH FILTER & COMPANY TAB SWITCHER */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">
                Company Filter:
              </span>
              <button
                onClick={() => setActiveCompanyFilter('ALL')}
                className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                  activeCompanyFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Companies
              </button>
              {Object.keys(companyConsignmentMasterMap).map((comp) => (
                <button
                  key={comp}
                  onClick={() => setActiveCompanyFilter(comp)}
                  className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
                    activeCompanyFilter === comp ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {comp.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64 flex items-center">
              <Search size={15} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search consignments (FB1, OS1...)"
                value={layer1Search}
                onChange={(e) => setLayer1Search(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs pl-9 pr-8 py-2 rounded-lg outline-none focus:border-blue-500 font-medium"
              />
              {layer1Search && (
                <button
                  onClick={() => setLayer1Search('')}
                  className="absolute right-2.5 p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
                  title="Clear Search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* 1ST LAYER COLUMNS IN LIST TABLE MATCHING SPEC */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5"><input type="checkbox" className="rounded border-slate-300" /></th>
                    <th className="p-3.5">Inquiry By (Buyer Company Name)</th>
                    <th className="p-3.5">Inquiry Consignment Code</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Total CBM (m³)</th>
                    <th className="p-3.5">Total Gross Weight (kg)</th>
                    <th className="p-3.5">Date & Proposed By</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredLayer1Consignments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5"><input type="checkbox" className="rounded border-slate-300" /></td>
                      {/* Inquiry By (Company) - Clickable to open 2nd Layer */}
                      <td
                        onClick={() => {
                          setActiveConsignmentCode(item.code);
                          setCurrentLayer(2);
                        }}
                        className="p-3.5 font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1.5"
                      >
                        <Building2 size={15} className="text-slate-400 shrink-0" />
                        {item.company}
                      </td>

                      {/* Consignment Code - Clickable to open 2nd Layer */}
                      <td
                        onClick={() => {
                          setActiveConsignmentCode(item.code);
                          setCurrentLayer(2);
                        }}
                        className="p-3.5 font-black text-slate-900 cursor-pointer"
                      >
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-md font-mono text-xs hover:bg-blue-100">
                          {item.code}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${
                            item.status === 'FULLY_APPROVED'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : item.status === 'PARTIALLY_APPROVED'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-blue-600 font-bold">{item.total_cbm.toFixed(3)} m³</td>
                      <td className="p-3.5 font-mono text-emerald-700 font-bold">{item.total_weight.toLocaleString()} kg</td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        <p className="font-semibold text-slate-800">{item.proposed_date}</p>
                        <p>By: {item.proposed_by}</p>
                      </td>

                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => {
                            setActiveConsignmentCode(item.code);
                            setCurrentLayer(2);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye size={12} /> View Details (2nd Layer)
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

      {/* 2ND LAYER: EXCEL-LIKE MASTER PLANNING SHEET FOR CONSIGNMENT */}
      {currentLayer === 2 && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Consignment Code: <strong className="text-blue-600 text-sm">{activeConsignmentCode}</strong>
              </span>
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-200 flex items-center gap-1">
                <AlertTriangle size={13} /> RED Highlight = License / Certificate Required
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTallyPostBulk}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <CheckCheck size={14} /> Mark Selected as Tally Posted
              </button>
            </div>
          </div>

          {/* Master Planning Sheet Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5"><input type="checkbox" className="rounded border-slate-300" /></th>
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">Quantity (Editable)</th>
                    <th className="p-3.5">UOM</th>
                    <th className="p-3.5">Brand Preference</th>
                    <th className="p-3.5">Computed CBM</th>
                    <th className="p-3.5">Computed Weight</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Tally Entry Posted?</th>
                    <th className="p-3.5">China Procurement Remarks</th>
                    <th className="p-3.5 text-right">Shift Consignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {activeGridItems.length > 0 ? (
                    activeGridItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          item.license_warning
                            ? 'bg-rose-50/80 hover:bg-rose-100/80 text-rose-900 border-l-4 border-l-rose-500 font-medium'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3.5">
                          <input
                            type="checkbox"
                            checked={selectedItemsForTally.includes(item.id)}
                            onChange={() => toggleItemForTally(item.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        {/* Product Name with Red Alert Badge if License Required */}
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{item.product_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{item.product_code}</p>
                          {item.license_warning && (
                            <span className="inline-block mt-1 text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                              ⚠️ RED REMARK: {item.license_remark}
                            </span>
                          )}
                        </td>

                        {/* Editable Quantity Inline */}
                        <td className="p-3.5">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                            className="w-24 bg-white border border-slate-300 text-blue-700 font-bold p-1.5 rounded outline-none focus:border-blue-500 text-xs text-center cursor-pointer shadow-2xs"
                          />
                        </td>

                        <td className="p-3.5 font-bold text-slate-800">{item.uom}</td>
                        <td className="p-3.5 text-slate-700">{item.brand_preference}</td>
                        <td className="p-3.5 font-mono text-blue-600 font-bold">
                          {(item.quantity * item.unit_cbm).toFixed(3)} m³
                        </td>
                        <td className="p-3.5 font-mono text-emerald-700 font-bold">
                          {(item.quantity * item.gross_weight).toLocaleString()} kg
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              item.item_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.item_status}
                          </span>
                        </td>

                        {/* Tally Entry Posted (Pending on top by default) */}
                        <td className="p-3.5">
                          <span
                            onClick={() => {
                              setGridItems(
                                gridItems.map((g) =>
                                  g.id === item.id ? { ...g, tally_post_status: g.tally_post_status === 'POSTED' ? 'PENDING' : 'POSTED' } : g,
                                ),
                              );
                            }}
                            className={`px-2.5 py-1 rounded font-bold text-[10px] cursor-pointer ${
                              item.tally_post_status === 'POSTED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {item.tally_post_status}
                          </span>
                        </td>

                        {/* China Procurement Remarks with View Eye Button */}
                        <td className="p-3.5">
                          <button
                            onClick={() => setShowRemarkModal(item.procurement_remarks)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            <Eye size={12} /> View Remarks
                          </button>
                        </td>

                        {/* Shift between FB1, FB2, OS1... */}
                        <td className="p-3.5 text-right">
                          <select
                            value={item.consignment_code}
                            onChange={(e) => handleShiftConsignment(item.id, e.target.value)}
                            className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-1 rounded font-bold cursor-pointer outline-none"
                          >
                            <option value="FB1">Shift to FB1</option>
                            <option value="FB2">Shift to FB2</option>
                            <option value="OS1">Shift to OS1</option>
                            <option value="ING1">Shift to ING1</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400 font-semibold">
                        No inquiry requirement items in consignment "{activeConsignmentCode}". Click "Add Main Inquiry" above to add products.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD & MAIN INQUIRY MODAL MATCHING SPECIFICATION */}
      {showInquiryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveInquiry}
            className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-xl space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {showInquiryModal === 'QUICK' ? <Zap size={18} className="text-indigo-600" /> : <Plus size={18} className="text-blue-600" />}
                {showInquiryModal === 'QUICK' ? 'Quick Access Inquiry Form' : 'Add Main Inquiry Form (1st Step Process)'}
              </h3>
              <button type="button" onClick={() => setShowInquiryModal(null)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Inquiry By (Buyer Company Name) */}
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Inquiry By (Buyer Company Name) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.company}
                  disabled={userRole !== 'ADMIN'}
                  onChange={(e) => {
                    const newComp = e.target.value;
                    const defaultCode = companyConsignmentMasterMap[newComp]?.[0]?.code || 'FB1';
                    setFormData({ ...formData, company: newComp, consignment_code: defaultCode });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-bold"
                >
                  {Object.keys(companyConsignmentMasterMap).map((comp) => (
                    <option key={comp} value={comp}>{comp}</option>
                  ))}
                </select>
              </div>

              {/* Inquiry Consignment Code */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Inquiry Consignment Code <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.consignment_code}
                  onChange={(e) => setFormData({ ...formData, consignment_code: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-black text-blue-700"
                >
                  {(companyConsignmentMasterMap[formData.company] || []).map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Product Name from Masters */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.product_name}
                  onChange={(e) => handleProductNameChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
                  required
                >
                  <option value="">-- Select Product Name --</option>
                  {masterProductOptions.map((p) => (
                    <option key={p.code} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Quantity & Auto-Reflecting UOM */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  UOM (Auto-Reflects from Inventory Master)
                </label>
                <input
                  type="text"
                  disabled
                  value={formData.uom}
                  className="w-full bg-slate-100 border border-slate-200 text-xs text-slate-600 p-2.5 rounded-lg font-bold"
                />
              </div>

              {/* Brand Preference */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Brand Preference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TTCA Brand Preferred"
                  value={formData.brand_preference}
                  onChange={(e) => setFormData({ ...formData, brand_preference: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Status (Default Proposed)</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
                >
                  <option value="PROPOSED">Proposed</option>
                  <option value="APPROVED">Approved</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product Specs / Remarks (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. 25kg bag packaging with moisture inner liner"
                  value={formData.product_specs}
                  onChange={(e) => setFormData({ ...formData, product_specs: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowInquiryModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                Submit Inquiry Requirement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW REMARKS MODAL */}
      {showRemarkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Eye size={18} className="text-blue-600" /> China Procurement Team Remarks
              </h3>
              <button onClick={() => setShowRemarkModal(null)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-medium">
              {showRemarkModal}
            </p>
            <div className="flex justify-end pt-2">
              <button onClick={() => setShowRemarkModal(null)} className="px-4 py-2 bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT EXCEL / CSV DATA MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload size={18} className="text-blue-600" /> Import Inquiry Requirements (Excel / CSV)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Upload your CSV or Excel file containing consignment inquiry line items. Download sample template if needed.
              </p>

              {/* Drag and Drop Zone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 p-8 rounded-xl text-center space-y-2 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const importedItem = {
                        id: `imp-inq-${Date.now()}`,
                        company: 'F&B Uganda Ingredients Ltd',
                        consignment_code: 'FB1',
                        product_name: 'Caustic Soda Flakes 99%',
                        product_code: 'PRD-ING-CS02',
                        uom: 'KG',
                        quantity: 2500,
                        unit_cbm: 0.02,
                        gross_weight: 25.0,
                        brand_preference: 'Tianjin Brand',
                        product_specs: 'Imported requirement specs',
                        procurement_remarks: 'Imported via CSV file',
                        item_status: 'PROPOSED',
                        tally_post_status: 'PENDING',
                        license_warning: false,
                        license_remark: '',
                        proposed_date: new Date().toISOString().split('T')[0],
                        proposed_by: 'Yinglima Admin',
                      };
                      setGridItems([importedItem, ...gridItems]);
                      setShowImportModal(false);
                      setImportNotification(`Successfully imported inquiry line items from "${file.name}"!`);
                      setTimeout(() => setImportNotification(null), 5000);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Upload size={24} />
                </div>
                <p className="text-xs font-bold text-slate-800">Click or Drag & Drop File Here</p>
                <p className="text-[11px] text-slate-400">Supports .CSV, .XLSX, .XLS (Up to 10MB)</p>
              </div>

              {/* Sample Template Link */}
              <div className="flex items-center justify-between pt-2">
                <a
                  href="#download-sample"
                  onClick={(e) => {
                    e.preventDefault();
                    const sampleHeaders = 'Company,Consignment Code,Product Name,Quantity,UOM,Brand Preference\n"F&B Uganda Ingredients Ltd","FB1","Caustic Soda Flakes 99%",2500,"KG","Tianjin Brand"';
                    const blob = new Blob([sampleHeaders], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Yinglima_Inquiry_Import_Sample.csv';
                    a.click();
                  }}
                  className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Download size={13} /> Download CSV Sample Template
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-200"
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

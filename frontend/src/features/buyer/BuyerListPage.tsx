import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Plus,
  Filter,
  ShieldAlert,
  ArrowLeft,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle,
  Eye,
  Trash2,
  Phone,
  Mail,
  Check,
  ChevronDown,
  Edit,
  Globe,
  Search,
  RotateCcw,
  Calendar,
  Building2,
} from 'lucide-react';
import { buyerApi } from '../../api/buyerApi';

// Country Phone Dial Code & Max Digit Length Master
const countryMaster: Record<string, { code: string; maxDigits: number }> = {
  Uganda: { code: '+256 ', maxDigits: 9 },
  China: { code: '+86 ', maxDigits: 11 },
  India: { code: '+91 ', maxDigits: 10 },
  Kenya: { code: '+254 ', maxDigits: 9 },
  UAE: { code: '+971 ', maxDigits: 9 },
  'United States': { code: '+1 ', maxDigits: 10 },
};

// Available Master Product Categories and Subcategories
const categorySubcategoryMap: Record<string, string[]> = {
  'Food Ingredients': ['Citric Acid', 'Caustic Soda', 'Sodium Benzoate', 'Flavoring Agents', 'Sorbic Acid'],
  Chemicals: ['Caustic Soda', 'Citric Acid', 'Solvents', 'Industrial Detergents', 'Hydrogen Peroxide'],
  Machines: ['Band Sealer', 'Vacuum Packers', 'Shrink Wrappers', 'Carton Sealers', 'Capping Machines'],
  'Spare Parts': ['Spares for Band Sealer', 'Teflon Belts', 'Heating Blocks', 'Temperature Controllers', 'Silicone Strips'],
};

// AUTO-COMPLETE KEYWORD SUGGESTION INPUT FOR BUYER COMPANY NAME
const CompanyAutocompleteInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
}> = ({ value, onChange, suggestions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value);

  return (
    <div className="relative">
      <label className="text-[11px] text-slate-700 font-semibold block mb-1">
        Name of Company <span className="text-rose-500">*</span>
      </label>
      <input
        type="text"
        required
        placeholder="e.g. Uganda Beverage Industries Ltd"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none focus:border-blue-500 focus:bg-white font-medium"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto text-xs divide-y divide-slate-100">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              onClick={() => {
                onChange(item);
                setIsOpen(false);
              }}
              className="p-2.5 hover:bg-blue-50 text-slate-800 cursor-pointer font-semibold"
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Multi-Select Dropdown Component with Checkboxes & Badges
const MultiSelectDropdown: React.FC<{
  label: string;
  options: string[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
  placeholder?: string;
}> = ({ label, options, selected, onChange, placeholder = 'Select multiple...' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((item) => item !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-[11px] text-slate-700 font-semibold block mb-1">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[34px] bg-slate-50 border border-slate-200 hover:border-blue-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 flex items-center justify-between cursor-pointer transition-all"
      >
        <div className="flex flex-wrap gap-1 items-center max-w-[90%] overflow-hidden">
          {selected.length === 0 ? (
            <span className="text-slate-400 text-xs">{placeholder}</span>
          ) : (
            selected.map((item) => (
              <span
                key={item}
                className="bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1"
              >
                {item}
                <X
                  size={10}
                  className="hover:text-blue-900 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(item);
                  }}
                />
              </span>
            ))
          )}
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto p-1.5 space-y-0.5">
          {options.map((opt) => {
            const isChecked = selected.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => toggleOption(opt)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  isChecked ? 'bg-blue-50 text-blue-800 font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>{opt}</span>
                {isChecked && <Check size={14} className="text-blue-600" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const BuyerListPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'detail'>('list');
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);
  const [editingBuyerId, setEditingBuyerId] = useState<string | null>(null);
  const [showRuleAlert, setShowRuleAlert] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [eyeModalContent, setEyeModalContent] = useState<{ title: string; items: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buyers State (loaded live from Supabase DB via NestJS API)
  const [buyers, setBuyers] = useState<any[]>([]);

  // 8 Exact Top Filters
  const [filterDateRange, setFilterDateRange] = useState('');
  const [filterBuyerType, setFilterBuyerType] = useState('');
  const [filterCurrentStatus, setFilterCurrentStatus] = useState('');
  const [filterProductCategory, setFilterProductCategory] = useState('');
  const [filterProductSubCategory, setFilterProductSubCategory] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterPotential, setFilterPotential] = useState('');
  const [filterClientGrade, setFilterClientGrade] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Form Data State
  const initialFormData = {
    name: '',
    product_categories: [] as string[],
    potential_subcategories: [] as string[],
    buyer_type: 'Select',
    country: 'Uganda',
    city: '',
    address: '',
    contact_salutation: 'Mr.',
    contact_name: '',
    designation: '',
    calling_number: '',
    whatsapp_number: '',
    email: '',
    emails: [] as string[],
    tax_id: '',
    primary_website: '',
    current_status: 'Select',
    product_range_supplied: '',
    potential: 'Select',
    potential_reason: '',
    client_grade: 'Select',
    currently_buying_from: '',
    overall_remarks: '',
  };

  const [formData, setFormData] = useState({ ...initialFormData });

  // Additional Buyer Contacts
  const [formContacts, setFormContacts] = useState<any[]>([]);
  const [newContact, setNewContact] = useState({
    salutation: 'Mr.',
    full_name: '',
    designation: '',
    country: 'Uganda',
    calling_number: '',
    whatsapp_number: '',
    email: '',
  });

  // Load buyers from NestJS API on mount
  const loadApiBuyers = async () => {
    const data = await buyerApi.getBuyers();
    if (data && Array.isArray(data) && data.length > 0) {
      setBuyers(data);
    }
  };

  useEffect(() => {
    loadApiBuyers();
  }, []);

  // Filter options for Subcategories based on selected Product Categories
  const availableSubcategories = Array.from(
    new Set(
      (formData.product_categories.length > 0 ? formData.product_categories : Object.keys(categorySubcategoryMap)).flatMap(
        (cat) => categorySubcategoryMap[cat] || [],
      ),
    ),
  );

  // Phone max length for selected country
  const currentCountryConfig = countryMaster[formData.country] || { code: '+256 ', maxDigits: 9 };

  // Add Contact to Contact List
  const handleAddContact = () => {
    if (!newContact.full_name.trim()) {
      alert('Please enter Full Name for contact person.');
      return;
    }
    setFormContacts([...formContacts, { id: `c-${Date.now()}`, ...newContact }]);
    setNewContact({
      salutation: 'Mr.',
      full_name: '',
      designation: '',
      country: 'Uganda',
      calling_number: '',
      whatsapp_number: '',
      email: '',
    });
  };

  const handleDeleteContact = (id: string) => {
    setFormContacts(formContacts.filter((c) => c.id !== id));
  };

  // Status Change with 1-Way Rule Check
  const handleStatusChange = async (id: string, newStatus: string) => {
    const target = buyers.find((b) => b.id === id);
    if (target?.current_status === 'EXISTING' && newStatus === 'NEW') {
      setShowRuleAlert('ONE_WAY_STATUS');
      return;
    }

    setBuyers((prev) => prev.map((b) => (b.id === id ? { ...b, current_status: newStatus } : b)));
    setShowRuleAlert(null);
    await buyerApi.updateStatus(id, newStatus);
  };

  // Deletion Guard Rule Check
  const handleDeleteBuyer = async (id: string) => {
    const target = buyers.find((b) => b.id === id);
    const canDeleteStatus = target?.current_status === 'NEW' || target?.current_status === 'Select';
    const canDeletePotential = target?.potential === 'NO' || target?.potential === 'Select' || target?.potential === 'UNSELECTED';

    if (!canDeleteStatus || !canDeletePotential) {
      setShowRuleAlert('DELETE_BLOCKED');
      return;
    }

    setBuyers((prev) => prev.filter((b) => b.id !== id));
    setShowRuleAlert(null);
    await buyerApi.deleteBuyer(id);
  };

  // Form Submit Handler
  const handleCreateBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Company Name is mandatory.');
      return;
    }
    if (!formData.country.trim()) {
      alert('Country is mandatory.');
      return;
    }

    const companyName = formData.name.trim();
    const callingNum = formData.calling_number.trim();
    const whatsappNum = formData.whatsapp_number.trim();

    // Duplicate Check: Company Name, Calling Number, or WhatsApp Number
    if (!editingBuyerId) {
      const isDuplicate = buyers.some((b) => {
        const matchName = b.name.trim().toLowerCase() === companyName.toLowerCase();
        const matchCalling = callingNum && b.calling_number && b.calling_number.includes(callingNum);
        const matchWhatsapp = whatsappNum && b.whatsapp_number && b.whatsapp_number.includes(whatsappNum);
        return matchName || matchCalling || matchWhatsapp;
      });

      if (isDuplicate) {
        setShowRuleAlert(`DUPLICATE_ENTRY: Buyer with Company Name "${companyName}" or Phone/WhatsApp number already exists!`);
        return;
      }
    }

    // Combine primary contact into contacts list
    const primaryContactObj = {
      salutation: formData.contact_salutation,
      full_name: `${formData.contact_salutation} ${formData.contact_name || 'Primary Contact'}`.trim(),
      designation: formData.designation || 'Procurement Manager',
      country: formData.country,
      calling_number: formData.calling_number || '',
      whatsapp_number: formData.whatsapp_number || formData.calling_number || '',
      email: formData.email || (formData.emails && formData.emails[0]) || '',
    };

    const buyerPayload: any = {
      ...formData,
      name: companyName,
      contacts: [primaryContactObj, ...formContacts],
    };

    setBuyers([buyerPayload, ...buyers]);
    await buyerApi.createBuyer(buyerPayload);
    await loadApiBuyers();

    setViewMode('list');
    setEditingBuyerId(null);
    setFormData({ ...initialFormData });
    setFormContacts([]);
    setShowRuleAlert(null);
    setImportNotification(`Successfully saved buyer profile "${companyName}" to Supabase Database!`);
    setTimeout(() => setImportNotification(null), 5000);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Company Name', 'Buyer Type', 'Product Categories', 'Product Sub Categories', 'Country', 'City', 'Status', 'Potential', 'Grade', 'Added On'];
    const rows = filteredBuyers.map((b) => [
      `"${b.name}"`,
      `"${b.buyer_type}"`,
      `"${b.product_categories ? b.product_categories.join('; ') : ''}"`,
      `"${b.potential_subcategories ? b.potential_subcategories.join('; ') : ''}"`,
      `"${b.country}"`,
      `"${b.city}"`,
      `"${b.current_status}"`,
      `"${b.potential}"`,
      `"${b.client_grade}"`,
      `"${b.created_at || ''}"`,
    ]);

    const csvContent = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Yinglima_Buyers_Directory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter Logic matching 8 Exact Filters
  const filteredBuyers = buyers.filter((b) => {
    if (searchQuery && !b.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterBuyerType && filterBuyerType !== 'All' && b.buyer_type !== filterBuyerType) return false;
    if (filterCurrentStatus && filterCurrentStatus !== 'All' && b.current_status !== filterCurrentStatus) return false;
    if (filterCountry && filterCountry !== 'All' && b.country !== filterCountry) return false;
    if (filterPotential && filterPotential !== 'All' && b.potential !== filterPotential) return false;
    if (filterClientGrade && filterClientGrade !== 'All' && b.client_grade !== filterClientGrade) return false;
    if (filterProductCategory && filterProductCategory !== 'All') {
      if (!b.product_categories || !b.product_categories.includes(filterProductCategory)) return false;
    }
    if (filterProductSubCategory && filterProductSubCategory !== 'All') {
      if (!b.potential_subcategories || !b.potential_subcategories.includes(filterProductSubCategory)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {viewMode === 'add'
              ? editingBuyerId
                ? `Edit Buyer Profile (${formData.name})`
                : 'Add Buyer (Client) Data Form (Yinglima)'
              : viewMode === 'detail'
              ? 'View Buyer Details'
              : 'Buyers (Clients)'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Uganda & Global Client Directory, Potential Tracking & Purchasing Profiles
          </p>
        </div>

        {viewMode === 'list' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Upload size={15} className="text-blue-600" /> Import
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Download size={15} className="text-emerald-600" /> Export
            </button>
            <button
              onClick={() => {
                setEditingBuyerId(null);
                setFormData({ ...initialFormData });
                setFormContacts([]);
                setViewMode('add');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} /> Add Buyer
            </button>
          </div>
        ) : (
          <button
            onClick={() => setViewMode('list')}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft size={15} /> BACK TO BUYERS LIST
          </button>
        )}
      </div>

      {/* NOTIFICATIONS & RULE ALERTS */}
      {importNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-600" />
            <span>{importNotification}</span>
          </div>
          <button onClick={() => setImportNotification(null)} className="font-bold underline text-emerald-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {showRuleAlert && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-600" />
            <span>{showRuleAlert}</span>
          </div>
          <button onClick={() => setShowRuleAlert(null)} className="font-bold underline text-rose-900 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW MODE 1: BUYER LIST TABLE */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* TOP FILTERS BAR (8 EXACT FIELDS) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Filter size={14} className="text-blue-600" /> Top Filter Fields
              </span>
              <button
                onClick={() => {
                  setFilterDateRange('');
                  setFilterBuyerType('');
                  setFilterCurrentStatus('');
                  setFilterProductCategory('');
                  setFilterProductSubCategory('');
                  setFilterCountry('');
                  setFilterPotential('');
                  setFilterClientGrade('');
                  setSearchQuery('');
                }}
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 normal-case cursor-pointer"
              >
                <RotateCcw size={12} /> Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {/* 1. Added Date Range */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Added Date Range</label>
                <input
                  type="date"
                  value={filterDateRange}
                  onChange={(e) => setFilterDateRange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none"
                />
              </div>

              {/* 2. Buyer Type */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Buyer Type</label>
                <select
                  value={filterBuyerType}
                  onChange={(e) => setFilterBuyerType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                >
                  <option value="">All Types</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Trader">Trader</option>
                  <option value="Select">Select</option>
                </select>
              </div>

              {/* 3. Current Status */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Current Status</label>
                <select
                  value={filterCurrentStatus}
                  onChange={(e) => setFilterCurrentStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="EXISTING">Existing</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="Select">Select</option>
                </select>
              </div>

              {/* 4. Product Category */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Product Category</label>
                <select
                  value={filterProductCategory}
                  onChange={(e) => setFilterProductCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {Object.keys(categorySubcategoryMap).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Product Sub Category */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Product Sub Category</label>
                <select
                  value={filterProductSubCategory}
                  onChange={(e) => setFilterProductSubCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                >
                  <option value="">All Sub Categories</option>
                  {availableSubcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Country */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Country</label>
                <select
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                >
                  <option value="">All Countries</option>
                  {Object.keys(countryMaster).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Potential */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Potential</label>
                <select
                  value={filterPotential}
                  onChange={(e) => setFilterPotential(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                >
                  <option value="">All Potential</option>
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                  <option value="Select">Select</option>
                </select>
              </div>

              {/* 8. Client Grade */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Client Grade</label>
                <select
                  value={filterClientGrade}
                  onChange={(e) => setFilterClientGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                >
                  <option value="">All Grades</option>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEARCH BAR WITH CLEAR BUTTON */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name, category, or country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-10 pr-9 py-2.5 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-slate-100 p-1 rounded-full cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* BUYER TABLE LIST (11 EXACT COLUMNS) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 w-10 text-center">Select</th>
                    <th className="p-3.5">Name of Company</th>
                    <th className="p-3.5">Buyer Type</th>
                    <th className="p-3.5">Product Category</th>
                    <th className="p-3.5">Product Sub Category</th>
                    <th className="p-3.5">Country</th>
                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Potential</th>
                    <th className="p-3.5">Client Grade</th>
                    <th className="p-3.5">Added On</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBuyers.map((item) => {
                    const categories = item.product_categories || ['Food Ingredients'];
                    const subcategories = item.potential_subcategories || ['Citric Acid'];
                    const showCatEye = categories.length > 5;
                    const showSubEye = subcategories.length > 5;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 text-center">
                          <input type="checkbox" className="rounded border-slate-300 text-blue-600 cursor-pointer" />
                        </td>
                        {/* Company Name Hyperlink -> Opens View Details Page */}
                        <td
                          onClick={() => {
                            setSelectedBuyer(item);
                            setViewMode('detail');
                          }}
                          className="p-3.5 font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          {item.name}
                        </td>
                        <td className="p-3.5 text-slate-800">{item.buyer_type}</td>

                        {/* Product Category (Up to 5 items + Eye Icon if > 5) */}
                        <td className="p-3.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {categories.slice(0, 5).map((cat: string) => (
                              <span key={cat} className="bg-slate-100 text-slate-700 font-bold text-[10px] px-1.5 py-0.5 rounded">
                                {cat}
                              </span>
                            ))}
                            {showCatEye && (
                              <button
                                onClick={() => setEyeModalContent({ title: `All Product Categories (${item.name})`, items: categories })}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                                title="View All Categories"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Product Sub Category (Up to 5 items + Eye Icon if > 5) */}
                        <td className="p-3.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {subcategories.slice(0, 5).map((sub: string) => (
                              <span key={sub} className="bg-blue-50 text-blue-700 font-bold text-[10px] px-1.5 py-0.5 rounded">
                                {sub}
                              </span>
                            ))}
                            {showSubEye && (
                              <button
                                onClick={() => setEyeModalContent({ title: `All Product Sub Categories (${item.name})`, items: subcategories })}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                                title="View All Sub Categories"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 font-semibold text-slate-800">{item.country}</td>

                        {/* Current Status Badge / 1-Way Selector */}
                        <td className="p-3.5">
                          <select
                            value={item.current_status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-xs text-slate-900 p-1 rounded font-bold cursor-pointer outline-none"
                          >
                            <option value="Select">Select</option>
                            <option value="NEW">New</option>
                            <option value="EXISTING">Existing</option>
                            <option value="INACTIVE">Inactive</option>
                          </select>
                        </td>

                        {/* Potential */}
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              item.potential === 'YES'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.potential === 'NO'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.potential}
                          </span>
                        </td>

                        {/* Client Grade */}
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[11px]">
                            Grade {item.client_grade}
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">{item.created_at || '2026-07-30'}</td>

                        {/* Action: ONLY EDIT BUTTON */}
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setEditingBuyerId(item.id);
                              setFormData({
                                name: item.name,
                                product_categories: item.product_categories || [],
                                potential_subcategories: item.potential_subcategories || [],
                                buyer_type: item.buyer_type || 'Manufacturer',
                                country: item.country || 'Uganda',
                                city: item.city || '',
                                address: item.address || '',
                                contact_salutation: item.contact_salutation || 'Mr.',
                                contact_name: item.contact_name || '',
                                designation: item.designation || '',
                                calling_number: item.calling_number || '',
                                whatsapp_number: item.whatsapp_number || '',
                                email: item.emails && item.emails[0] ? item.emails[0] : '',
                                emails: item.emails || [],
                                tax_id: item.tax_id || '',
                                primary_website: item.primary_website || '',
                                current_status: item.current_status || 'NEW',
                                product_range_supplied: item.product_range || '',
                                potential: item.potential || 'YES',
                                potential_reason: item.potential_reason || '',
                                client_grade: item.client_grade || 'A',
                                currently_buying_from: item.currently_buying_from || '',
                                overall_remarks: item.overall_remarks || '',
                              });
                              setFormContacts(item.contacts || []);
                              setViewMode('add');
                            }}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Edit size={12} /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EYE ICON MODAL (For viewing > 5 categories or subcategories) */}
      {eyeModalContent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye size={16} className="text-blue-600" /> {eyeModalContent.title}
              </h3>
              <button onClick={() => setEyeModalContent(null)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
              {eyeModalContent.items.map((item) => (
                <span key={item} className="bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded text-xs">
                  {item}
                </span>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEyeModalContent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ADD BUYER FORM (COMPACT 1-SCREEN LAYOUT) */}
      {viewMode === 'add' && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-2xs space-y-6">
          <form onSubmit={handleCreateBuyer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {/* Name of Company* */}
              <div className="md:col-span-2">
                <CompanyAutocompleteInput
                  value={formData.name}
                  onChange={(val) => setFormData({ ...formData, name: val })}
                  suggestions={buyers.map((b) => b.name)}
                />
              </div>

              {/* Product Category (Multiple) */}
              <div>
                <MultiSelectDropdown
                  label="Product Category (Multiple)"
                  options={Object.keys(categorySubcategoryMap)}
                  selected={formData.product_categories}
                  onChange={(cats) => setFormData({ ...formData, product_categories: cats })}
                  placeholder="Select categories..."
                />
              </div>

              {/* Product Sub Category (Multiple based on category) */}
              <div>
                <MultiSelectDropdown
                  label="Product Sub Category (Multiple)"
                  options={availableSubcategories}
                  selected={formData.potential_subcategories}
                  onChange={(subs) => setFormData({ ...formData, potential_subcategories: subs })}
                  placeholder="Select sub categories..."
                />
              </div>

              {/* Buyer Type */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Buyer Type</label>
                <select
                  value={formData.buyer_type}
                  onChange={(e) => setFormData({ ...formData, buyer_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none cursor-pointer"
                >
                  <option value="Select">Select</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Trader">Trader</option>
                </select>
              </div>

              {/* Country* (Default Uganda) */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                  Country <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none cursor-pointer"
                >
                  {Object.keys(countryMaster).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">City</label>
                <input
                  type="text"
                  placeholder="e.g. Kampala"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="e.g. Plot 45 Industrial Area"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                />
              </div>

              {/* Salutation + Primary Contact Name */}
              <div className="flex gap-2">
                <div className="w-24">
                  <label className="text-[11px] text-slate-700 font-semibold block mb-1">Salutation</label>
                  <select
                    value={formData.contact_salutation}
                    onChange={(e) => setFormData({ ...formData, contact_salutation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-slate-700 font-semibold block mb-1">Full Name (Primary Contact)</label>
                  <input
                    type="text"
                    placeholder="e.g. David Musoke"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                  />
                </div>
              </div>

              {/* Designation */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Procurement Director"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                />
              </div>

              {/* Calling Number (Country Prefix + Max Digits Enforced) */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                  Calling Number ({currentCountryConfig.code} max {currentCountryConfig.maxDigits} digits)
                </label>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <span className="px-2 py-2 text-xs font-bold text-slate-600 bg-slate-200 border-r border-slate-300">
                    {currentCountryConfig.code.trim()}
                  </span>
                  <input
                    type="text"
                    maxLength={currentCountryConfig.maxDigits}
                    placeholder="700123456"
                    value={formData.calling_number}
                    onChange={(e) => setFormData({ ...formData, calling_number: e.target.value.replace(/\D/g, '') })}
                    className="w-full text-xs text-slate-900 p-2 outline-none bg-white"
                  />
                </div>
              </div>

              {/* Whatsapp Number (Country Prefix + Max Digits Enforced) */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">
                  Whatsapp Number ({currentCountryConfig.code} max {currentCountryConfig.maxDigits} digits)
                </label>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <span className="px-2 py-2 text-xs font-bold text-emerald-700 bg-emerald-100 border-r border-emerald-200">
                    {currentCountryConfig.code.trim()}
                  </span>
                  <input
                    type="text"
                    maxLength={currentCountryConfig.maxDigits}
                    placeholder="700123456"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value.replace(/\D/g, '') })}
                    className="w-full text-xs text-slate-900 p-2 outline-none bg-white"
                  />
                </div>
              </div>

              {/* Email ID (Multiple) */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Email ID (Multiple)</label>
                <input
                  type="email"
                  placeholder="david@ugandabev.co.ug"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                />
              </div>

              {/* Tax ID Number */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Tax ID Number (TIN / GST)</label>
                <input
                  type="text"
                  placeholder="TIN-10098877"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                />
              </div>

              {/* Website */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Website (Hyperlink)</label>
                <input
                  type="text"
                  placeholder="www.ugandabev.co.ug"
                  value={formData.primary_website}
                  onChange={(e) => setFormData({ ...formData, primary_website: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                />
              </div>

              {/* Current Status (1-Way Rule) */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Current Status</label>
                <select
                  value={formData.current_status}
                  onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none cursor-pointer font-bold"
                >
                  <option value="Select">Select</option>
                  <option value="NEW">New</option>
                  <option value="EXISTING">Existing</option>
                </select>
              </div>

              {/* Potential */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Potential</label>
                <select
                  value={formData.potential}
                  onChange={(e) => setFormData({ ...formData, potential: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none cursor-pointer font-bold"
                >
                  <option value="Select">Select</option>
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                </select>
              </div>

              {/* Potential Reason (ONLY if Potential === 'NO') */}
              {formData.potential === 'NO' && (
                <div>
                  <label className="text-[11px] text-rose-700 font-semibold block mb-1">Potential Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Has long term exclusive contract"
                    value={formData.potential_reason}
                    onChange={(e) => setFormData({ ...formData, potential_reason: e.target.value })}
                    className="w-full bg-rose-50 border border-rose-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                  />
                </div>
              )}

              {/* Client Grade */}
              <div>
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Client Grade</label>
                <select
                  value={formData.client_grade}
                  onChange={(e) => setFormData({ ...formData, client_grade: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none cursor-pointer font-bold"
                >
                  <option value="Select">Select</option>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                  <option value="C">Grade C</option>
                </select>
              </div>

              {/* Product Range Manufactured or Supplied */}
              <div className="md:col-span-2">
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Product Range they Manufacture or Supply</label>
                <input
                  type="text"
                  placeholder="e.g. Carbonated Soft Drinks, Juice Concentrates, Energy Drinks"
                  value={formData.product_range_supplied}
                  onChange={(e) => setFormData({ ...formData, product_range_supplied: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                />
              </div>

              {/* Currently Buying From */}
              <div className="md:col-span-2">
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Currently Buying From</label>
                <input
                  type="text"
                  placeholder="e.g. Local Traders in Kampala / Import directly from Europe"
                  value={formData.currently_buying_from}
                  onChange={(e) => setFormData({ ...formData, currently_buying_from: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                />
              </div>

              {/* Overall Observation / Remarks */}
              <div className="md:col-span-4">
                <label className="text-[11px] text-slate-700 font-semibold block mb-1">Overall Observation / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. High volume potential client. Requires 30 days credit terms."
                  value={formData.overall_remarks}
                  onChange={(e) => setFormData({ ...formData, overall_remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2 rounded-lg outline-none"
                />
              </div>
            </div>

            {/* CONTACTS SECTION BELOW BUYER FORM */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} className="text-blue-600" /> Add Contacts of Buyer (Client)
              </h3>

              {/* Inline Add Contact Controls */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <select
                    value={newContact.salutation}
                    onChange={(e) => setNewContact({ ...newContact, salutation: e.target.value })}
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Ms.">Ms.</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newContact.full_name}
                    onChange={(e) => setNewContact({ ...newContact, full_name: e.target.value })}
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Designation"
                    value={newContact.designation}
                    onChange={(e) => setNewContact({ ...newContact, designation: e.target.value })}
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Calling Number"
                    value={newContact.calling_number}
                    onChange={(e) => setNewContact({ ...newContact, calling_number: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="WhatsApp Number"
                    value={newContact.whatsapp_number}
                    onChange={(e) => setNewContact({ ...newContact, whatsapp_number: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleAddContact}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Contacts Table List */}
              {formContacts.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Salutation & Name</th>
                        <th className="p-2.5">Designation</th>
                        <th className="p-2.5">Country</th>
                        <th className="p-2.5">Phone / WhatsApp</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {formContacts.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{c.salutation} {c.full_name}</td>
                          <td className="p-2.5 text-slate-700">{c.designation || 'Staff'}</td>
                          <td className="p-2.5">{c.country}</td>
                          <td className="p-2.5 text-slate-700 font-mono text-[11px]">
                            {c.calling_number || c.whatsapp_number || 'N/A'}
                          </td>
                          <td className="p-2.5 text-blue-600">{c.email || 'N/A'}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteContact(c.id)}
                              className="text-rose-600 hover:underline text-[11px] font-bold cursor-pointer"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Check size={16} /> Save Buyer Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW MODE 3: BUYER DETAILS READ-ONLY PAGE */}
      {viewMode === 'detail' && selectedBuyer && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" /> {selectedBuyer.name} Details
            </h3>
            <button
              onClick={() => {
                setEditingBuyerId(selectedBuyer.id);
                setFormData({
                  name: selectedBuyer.name,
                  product_categories: selectedBuyer.product_categories || [],
                  potential_subcategories: selectedBuyer.potential_subcategories || [],
                  buyer_type: selectedBuyer.buyer_type || 'Manufacturer',
                  country: selectedBuyer.country || 'Uganda',
                  city: selectedBuyer.city || '',
                  address: selectedBuyer.address || '',
                  contact_salutation: selectedBuyer.contact_salutation || 'Mr.',
                  contact_name: selectedBuyer.contact_name || '',
                  designation: selectedBuyer.designation || '',
                  calling_number: selectedBuyer.calling_number || '',
                  whatsapp_number: selectedBuyer.whatsapp_number || '',
                  email: selectedBuyer.emails && selectedBuyer.emails[0] ? selectedBuyer.emails[0] : '',
                  emails: selectedBuyer.emails || [],
                  tax_id: selectedBuyer.tax_id || '',
                  primary_website: selectedBuyer.primary_website || '',
                  current_status: selectedBuyer.current_status || 'NEW',
                  product_range_supplied: selectedBuyer.product_range || '',
                  potential: selectedBuyer.potential || 'YES',
                  potential_reason: selectedBuyer.potential_reason || '',
                  client_grade: selectedBuyer.client_grade || 'A',
                  currently_buying_from: selectedBuyer.currently_buying_from || '',
                  overall_remarks: selectedBuyer.overall_remarks || '',
                });
                setFormContacts(selectedBuyer.contacts || []);
                setViewMode('add');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Edit size={14} /> Edit Buyer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider text-blue-600">Company Overview</h4>
              <p><strong>Name:</strong> {selectedBuyer.name}</p>
              <p><strong>Buyer Type:</strong> {selectedBuyer.buyer_type}</p>
              <p><strong>Location:</strong> {selectedBuyer.city}, {selectedBuyer.country}</p>
              <p><strong>Address:</strong> {selectedBuyer.address || 'Industrial Area'}</p>
              <p>
                <strong>Website:</strong>{' '}
                {selectedBuyer.primary_website ? (
                  <a href={`https://${selectedBuyer.primary_website}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {selectedBuyer.primary_website}
                  </a>
                ) : (
                  'N/A'
                )}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider text-blue-600">Status & Potential</h4>
              <p><strong>Current Status:</strong> <span className="font-bold text-blue-700">{selectedBuyer.current_status}</span></p>
              <p><strong>Potential:</strong> <span className="font-bold text-emerald-700">{selectedBuyer.potential}</span></p>
              {selectedBuyer.potential_reason && <p><strong>Potential Reason:</strong> {selectedBuyer.potential_reason}</p>}
              <p><strong>Client Grade:</strong> Grade {selectedBuyer.client_grade}</p>
              <p><strong>Product Range:</strong> {selectedBuyer.product_range}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider text-blue-600">Primary Contact</h4>
              <p><strong>Contact Name:</strong> {selectedBuyer.contact_salutation} {selectedBuyer.contact_name}</p>
              <p><strong>Designation:</strong> {selectedBuyer.designation}</p>
              <p><strong>Calling Number:</strong> {selectedBuyer.calling_number}</p>
              <p><strong>WhatsApp:</strong> {selectedBuyer.whatsapp_number}</p>
              <p><strong>Email:</strong> {selectedBuyer.emails ? selectedBuyer.emails.join(', ') : 'N/A'}</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setViewMode('list')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerListPage;

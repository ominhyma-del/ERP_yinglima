import React, { useState, useRef, useEffect } from 'react';
import { Truck, Plus, Filter, ShieldAlert, ArrowLeft, Download, Upload, FileSpreadsheet, X, CheckCircle, Eye, Trash2, Camera, Phone, Mail, MessageSquare, AlertCircle, Link as LinkIcon, Check, ChevronDown, UserPlus, Edit, Maximize2, FileText, Image as ImageIcon, Video } from 'lucide-react';

// Country Phone Dial Code Map
const countryPhoneCodeMap: Record<string, string> = {
  China: '+86 ',
  Uganda: '+256 ',
  India: '+91 ',
  Kenya: '+254 ',
  UAE: '+971 ',
  'United States': '+1 ',
};

// MULTI-SELECT DROPDOWN COMPONENT WITH CHECKBOXES & TAGS
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
    <div ref={containerRef} className="relative">
      <label className="text-xs text-slate-700 font-semibold block mb-1">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg cursor-pointer flex items-center justify-between min-h-[38px] hover:border-blue-500 transition-colors"
      >
        <div className="flex flex-wrap gap-1 items-center overflow-hidden">
          {selected.length > 0 ? (
            selected.map((item) => (
              <span key={item} className="bg-blue-100 text-blue-900 text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                {item}
                <X
                  size={12}
                  className="hover:text-rose-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(item);
                  }}
                />
              </span>
            ))
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto p-1 text-xs space-y-0.5">
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <div
                key={option}
                onClick={() => toggleOption(option)}
                className={`p-2 rounded flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 text-blue-800 font-bold' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span>{option}</span>
                {isSelected && <Check size={14} className="text-blue-600" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// AUTO-COMPLETE KEYWORD SUGGESTION INPUT FOR COMPANY NAME
const CompanyAutocompleteInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
}> = ({ value, onChange, suggestions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value);

  return (
    <div className="relative">
      <label className="text-xs text-slate-700 font-semibold block mb-1">
        Name Of Company <span className="text-rose-500">*</span> (Keyword Suggestion - Matches Any Part)
      </label>
      <input
        type="text"
        required
        placeholder="Type Company Name..."
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white"
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

export const SupplierListPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'detail'>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showRuleAlert, setShowRuleAlert] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExpandAllModal, setShowExpandAllModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [expandedFieldModal, setExpandedFieldModal] = useState<{ title: string; items: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Stage state (Stage 1 & Stage 2)
  const [formStage, setFormStage] = useState<1 | 2>(1);

  // On-blur Phone Error states (7 to 11 digits requirement)
  const [phoneErrors, setPhoneErrors] = useState<{ calling?: string; whatsapp?: string; wechat?: string }>({});

  // Province and City Master Mapping
  const provinceCityMap: Record<string, string[]> = {
    Zhejiang: ['Wenzhou', 'Ruian', 'Ningbo', 'Hangzhou', 'Jiaxing'],
    Shandong: ['Weifang', 'Anqiu', 'Qingdao', 'Jinan', 'Zibo'],
    Guangdong: ['Guangzhou', 'Shenzhen', 'Foshan', 'Dongguan'],
    Jiangsu: ['Suzhou', 'Wuxi', 'Nanjing', 'Changzhou'],
    Shanghai: ['Shanghai City'],
  };

  // Master Categories & Subcategories
  const categoryMasterOptions = [
    'Food Ingredients',
    'Chemicals',
    'Tech/Feed Grade Ingredients',
    'Machines',
    'Filteration',
    'Pumps',
    'Spare Parts',
    'Packaging Equipment',
  ];

  const subcategoryMasterOptions = [
    'Citric Acid',
    'Caustic Soda',
    'Band Sealer',
    'Spares for Band Sealer',
    'Vacuum Packers',
    'Shrink Wrappers',
    'Carton Sealers',
    'Teflon Belts',
    'Temperature Controllers',
  ];

  // Initial Suppliers state
  const [suppliers, setSuppliers] = useState([
    {
      id: 's1',
      name: 'Zhejiang Packaging Machinery Ltd',
      product_categories: ['Machines', 'Spare Parts', 'Packaging Equipment'],
      supplier_type: 'Manufacturer',
      brand_name: 'Yinglima Machinery',
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
      wechat_number: '+86 13800138000',
      emails: ['john@zhejiangpack.com', 'export@zhejiangpack.com'],
      tax_id: '91330300MA12345678',
      primary_website: 'www.zhejiangpack.com',
      secondary_website: 'www.pack-machine.cn',
      key_strength_subcategories: ['Band Sealer', 'Vacuum Packers', 'Spares for Band Sealer'],
      grade: 'A',
      current_status: 'EXISTING',
      potential: 'YES',
      potential_reason: 'High manufacturing capacity & 4 automated production lines',
      secondary_products: ['Teflon Belts', 'Heating Blocks', 'Silicone Strips'],
      visited_factory: 'Yes',
      visit_remarks: 'Visited Wenzhou factory in April 2024. Excellent QA testing.',
      attachments: [
        { name: 'wenzhou_assembly_line.jpg', type: 'photo', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300' },
        { name: 'factory_tour_video.mp4', type: 'video', url: '' },
      ],
      overall_remarks: 'Primary OEM supplier for Yinglima Band Sealers & Vacuum Packers.',
      contacts: [
        { id: 'c1', title: 'Mr', name: 'John Zhang', designation: 'Export Director', territory: 'Export Africa & India', country: 'China', calling: '+86 13800138000', whatsapp: '+86 13800138000', wechat: '+86 13800138000', email: 'john@zhejiangpack.com' },
        { id: 'c2', title: 'Ms', name: 'Lisa Chen', designation: 'Technical Engineer', territory: 'China Local', country: 'China', calling: '+86 13911223344', whatsapp: '+86 13911223344', wechat: '+86 13911223344', email: 'lisa@zhejiangpack.com' },
      ],
    },
    {
      id: 's2',
      name: 'Shandong Citric Acid Chemical Co',
      product_categories: ['Food Ingredients', 'Chemicals'],
      supplier_type: 'Manufacturer',
      brand_name: 'TTCA Brand',
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
      wechat_number: '+86 13900139000',
      emails: ['liwei@citric.cn'],
      tax_id: '91370700MA98765432',
      primary_website: 'www.citricacid-shandong.com',
      secondary_website: '',
      key_strength_subcategories: ['Citric Acid'],
      grade: 'B',
      current_status: 'NEW',
      potential: 'UNSELECTED',
      potential_reason: '',
      secondary_products: ['Citric Acid Monohydrate', 'Sodium Citrate'],
      visited_factory: 'No',
      visit_remarks: '',
      attachments: [],
      overall_remarks: 'Food grade Citric Acid Anhydrous 30-100 mesh supplier.',
      contacts: [
        { id: 'c3', title: 'Mr', name: 'Li Wei', designation: 'Sales Manager', territory: 'Export Global', country: 'China', calling: '+86 13900139000', whatsapp: '+86 13900139000', wechat: '+86 13900139000', email: 'liwei@citric.cn' },
      ],
    },
  ]);

  // Filters State matching exact spec
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterSupplierType, setFilterSupplierType] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPotential, setFilterPotential] = useState('');
  const [filterVisited, setFilterVisited] = useState('');

  // Form Data state
  const [formData, setFormData] = useState({
    name: '',
    product_categories: ['Machines'] as string[],
    supplier_type: 'Manufacturer',
    brand_name: '',
    country: 'China',
    province: 'Zhejiang',
    city: 'Wenzhou',
    town: '',
    address: '',
    contact_title: 'Mr',
    contact_name: '',
    designation: '',
    calling_number: '+86 ',
    whatsapp_number: '+86 ',
    wechat_number: '+86 ',
    email: '',
    tax_id: '',
    primary_website: '',
    secondary_website: '',
    key_strength_subcategories: ['Band Sealer'] as string[],
    grade: 'Select',
    current_status: 'Select',
    potential: 'Select',
    potential_reason: '',
    secondary_products: '',
    visited_factory: 'No',
    visit_remarks: '',
    overall_remarks: '',
  });

  // Attachments State for Factory Visit Photos / Videos
  const [visitAttachments, setVisitAttachments] = useState<{ id: string; name: string; type: 'photo' | 'video'; url: string }[]>([
    { id: 'att-1', name: 'factory_front.jpg', type: 'photo', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300' },
  ]);

  // Secondary Contacts List State (Inside Form)
  const [formContacts, setFormContacts] = useState<any[]>([]);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  const [newContact, setNewContact] = useState({
    title: 'Mr',
    name: '',
    designation: '',
    territory: 'Export Global',
    country: 'China',
    calling: '+86 ',
    whatsapp: '+86 ',
    wechat: '+86 ',
    email: '',
  });

  // Country Auto-Prefix Phone Code Handler
  const handleFirstFormCountryChange = (newCountry: string) => {
    const prefix = countryPhoneCodeMap[newCountry] || '+86 ';
    setFormData((prev) => ({
      ...prev,
      country: newCountry,
      calling_number: prefix + prev.calling_number.replace(/^\+\d+\s?/, ''),
      whatsapp_number: prefix + prev.whatsapp_number.replace(/^\+\d+\s?/, ''),
      wechat_number: prefix + prev.wechat_number.replace(/^\+\d+\s?/, ''),
    }));
  };

  const handleSubContactCountryChange = (newCountry: string) => {
    const prefix = countryPhoneCodeMap[newCountry] || '+86 ';
    setNewContact((prev) => ({
      ...prev,
      country: newCountry,
      calling: prefix + prev.calling.replace(/^\+\d+\s?/, ''),
      whatsapp: prefix + prev.whatsapp.replace(/^\+\d+\s?/, ''),
      wechat: prefix + prev.wechat.replace(/^\+\d+\s?/, ''),
    }));
  };

  // Attachments Handler
  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newAtts = Array.from(files).map((f) => ({
        id: `att-${Date.now()}-${Math.random()}`,
        name: f.name,
        type: (f.type.includes('video') ? 'video' : 'photo') as 'photo' | 'video',
        url: URL.createObjectURL(f),
      }));
      setVisitAttachments([...visitAttachments, ...newAtts]);
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    setVisitAttachments(visitAttachments.filter((a) => a.id !== attId));
  };

  // Validation function on blur (7 to 11 digits requirement)
  const validatePhone = (field: 'calling' | 'whatsapp' | 'wechat', value: string) => {
    if (!value) return;
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 11) {
      setPhoneErrors((prev) => ({
        ...prev,
        [field]: `Phone number must contain between 7 and 11 digits (Current: ${digitsOnly.length} digits).`,
      }));
    } else {
      setPhoneErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSaveSubContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name) return;

    if (editingContactId) {
      setFormContacts(
        formContacts.map((c) => (c.id === editingContactId ? { ...newContact, id: editingContactId } : c)),
      );
      setEditingContactId(null);
    } else {
      setFormContacts([...formContacts, { ...newContact, id: `c-${Date.now()}` }]);
    }

    setNewContact({
      title: 'Mr',
      name: '',
      designation: '',
      territory: 'Export Global',
      country: 'China',
      calling: '+86 ',
      whatsapp: '+86 ',
      wechat: '+86 ',
      email: '',
    });
  };

  const handleEditFormContact = (contact: any) => {
    setNewContact({ ...contact });
    setEditingContactId(contact.id);
  };

  const handleDeleteFormContact = (contactId: string) => {
    setFormContacts(formContacts.filter((c) => c.id !== contactId));
  };

  // Inline Grade Change in Table
  const handleInlineGradeChange = (id: string, newGrade: string) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, grade: newGrade } : s)),
    );
  };

  // Inline Potential Change in Table
  const handleInlinePotentialChange = (id: string, newPotential: string) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, potential: newPotential } : s)),
    );
  };

  // 1-Way Status Rule Enforced
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

  // Delete Guard Rule Enforced
  const handleDelete = (id: string) => {
    const target = suppliers.find((s) => s.id === id);
    const canDeleteStatus = target?.current_status === 'NEW' || target?.current_status === 'Select';
    const canDeletePotential = target?.potential === 'NO' || target?.potential === 'Select' || target?.potential === 'UNSELECTED';

    if (!canDeleteStatus || !canDeletePotential) {
      setShowRuleAlert('DELETE_BLOCKED_SPEC');
      return;
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    setShowRuleAlert(null);
  };

  const handleExportCSV = () => {
    const headers = ['Company Name', 'Supplier Type', 'Brand', 'Categories', 'Sub Categories', 'Secondary Products', 'Country', 'City & Province', 'Status', 'Grade', 'Potential'];
    const rows = suppliers.map((s) => [
      `"${s.name}"`,
      `"${s.supplier_type}"`,
      `"${s.brand_name}"`,
      `"${s.product_categories.join(', ')}"`,
      `"${s.key_strength_subcategories.join(', ')}"`,
      `"${Array.isArray(s.secondary_products) ? s.secondary_products.join(', ') : s.secondary_products}"`,
      `"${s.country}"`,
      `"${s.city}, ${s.province}"`,
      `"${s.current_status}"`,
      `"${s.grade}"`,
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
            name: 'Wenzhou Packaging Machinery Co',
            product_categories: ['Machines', 'Spare Parts'],
            supplier_type: 'Manufacturer',
            brand_name: 'Yinglima OEM',
            country: 'China',
            province: 'Zhejiang',
            city: 'Wenzhou',
            town: 'Ruian',
            address: 'Machinery Park',
            contact_title: 'Mr',
            contact_name: 'Chen Gang',
            designation: 'Sales Manager',
            calling_number: '+86 13700137000',
            whatsapp_number: '+86 13700137000',
            wechat_number: '+86 13700137000',
            emails: ['chen@wenzhoupack.cn'],
            tax_id: '91330302MA99112233',
            primary_website: 'www.wenzhoupack.cn',
            secondary_website: '',
            key_strength_subcategories: ['Vacuum Packers'],
            grade: 'A',
            current_status: 'NEW',
            potential: 'YES',
            potential_reason: 'Imported via Excel CSV',
            secondary_products: ['Heating Wires', 'Suction Nozzles'],
            visited_factory: 'No',
            visit_remarks: '',
            attachments: [],
            overall_remarks: 'Imported via CSV',
            contacts: [],
          },
        ];
        setSuppliers((prev) => [...imported, ...prev]);
        setShowImportModal(false);
        setImportNotification(`Successfully imported supplier profiles from "${file.name}"!`);
        setTimeout(() => setImportNotification(null), 4000);
      }, 500);
    }
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // Check Duplication: Name of Company + City
    const isDuplicate = suppliers.some(
      (s) => s.name.trim().toLowerCase() === formData.name.trim().toLowerCase() && s.city.trim().toLowerCase() === formData.city.trim().toLowerCase()
    );

    if (isDuplicate) {
      setShowRuleAlert(`DUPLICATE_ENTRY: Supplier with company name "${formData.name}" in city "${formData.city}" already exists!`);
      return;
    }

    const primaryContactObj = {
      id: `c-p-${Date.now()}`,
      title: formData.contact_title,
      name: `${formData.contact_title} ${formData.contact_name || 'Primary Contact'}`,
      designation: formData.designation || 'Sales Manager',
      territory: 'Export Global',
      country: formData.country,
      calling: formData.calling_number || '+86 13800000000',
      whatsapp: formData.whatsapp_number || formData.calling_number || '+86 13800000000',
      wechat: formData.wechat_number || '+86 13800000000',
      email: formData.email || 'info@supplier.com',
    };

    const newSupplier = {
      id: `s${Date.now()}`,
      name: formData.name,
      product_categories: formData.product_categories,
      supplier_type: formData.supplier_type,
      brand_name: formData.brand_name || 'Generic Supplier Brand',
      country: formData.country,
      province: formData.province,
      city: formData.city,
      town: formData.town,
      address: formData.address || 'Industrial Zone',
      contact_title: formData.contact_title,
      contact_name: formData.contact_name || 'Primary Contact',
      designation: formData.designation || 'Sales Director',
      calling_number: formData.calling_number || '+86 13800000000',
      whatsapp_number: formData.whatsapp_number || formData.calling_number || '+86 13800000000',
      wechat_number: formData.wechat_number || '+86 13800000000',
      emails: [formData.email || 'info@supplier.com'],
      tax_id: formData.tax_id || 'TAX-99887766',
      primary_website: formData.primary_website || 'www.supplier.com',
      secondary_website: formData.secondary_website,
      key_strength_subcategories: formData.key_strength_subcategories,
      grade: formData.grade === 'Select' ? 'A' : formData.grade,
      current_status: formData.current_status === 'Select' ? 'NEW' : formData.current_status,
      potential: formData.potential === 'Select' ? 'YES' : formData.potential,
      potential_reason: formData.potential_reason,
      secondary_products: formData.secondary_products ? formData.secondary_products.split(',') : [],
      visited_factory: formData.visited_factory,
      visit_remarks: formData.visit_remarks,
      attachments: visitAttachments,
      overall_remarks: formData.overall_remarks,
      contacts: [primaryContactObj, ...formContacts],
    };

    setSuppliers([newSupplier, ...suppliers]);
    setViewMode('list');
    setFormStage(1);
    setFormContacts([]);
    setShowRuleAlert(null);
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
            Yinglima China Procurement & Supplier Directory
          </p>
        </div>

        {viewMode === 'list' ? (
          <div className="flex items-center gap-2">
            {/* FEATURE 2: EXPAND ALL FILTERED DATA MASTER BUTTON */}
            <button
              onClick={() => setShowExpandAllModal(true)}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Maximize2 size={15} /> Expand All Filtered Data
            </button>
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
              <strong>Rule Guard Enforced:</strong> Current Status cannot revert from "Existing" to "New" (1-Way Rule).
            </span>
          </div>
          <button onClick={() => setShowRuleAlert(null)} className="font-bold underline text-amber-900">Dismiss</button>
        </div>
      )}

      {showRuleAlert === 'DELETE_BLOCKED_SPEC' && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-600" />
            <span>
              <strong>Deletion Blocked by Rule:</strong> Delete is allowed ONLY if Current Status is "New/Select" AND Potential is "No/Select". Since Status is "Existing" or Potential is "Yes", this supplier cannot be deleted. You can mark it as "Inactive".
            </span>
          </div>
          <button onClick={() => setShowRuleAlert(null)} className="font-bold underline text-rose-900">Dismiss</button>
        </div>
      )}

      {showRuleAlert?.startsWith('DUPLICATE_ENTRY') && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-600" />
            <span><strong>{showRuleAlert}</strong></span>
          </div>
          <button onClick={() => setShowRuleAlert(null)} className="font-bold underline text-rose-900">Dismiss</button>
        </div>
      )}

      {/* VIEW MODE 1: SUPPLIER LIST TABLE MATCHING SPECIFICATION */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Top Filter Fields matching spec */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Filter size={14} className="text-blue-600" /> Top Filter Fields
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
              <input
                type="text"
                placeholder="Company Name Search..."
                className="bg-slate-50 border border-slate-200 text-slate-800 p-2 rounded-lg outline-none focus:bg-white"
              />
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-lg outline-none">
                <option value="">Product Category (All)</option>
                {categoryMasterOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select value={filterSubCategory} onChange={(e) => setFilterSubCategory(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-lg outline-none">
                <option value="">Key Strength Sub Category (All)</option>
                {subcategoryMasterOptions.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
              <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-lg outline-none">
                <option value="">Country (All)</option>
                <option value="China">China</option>
                <option value="Uganda">Uganda</option>
                <option value="India">India</option>
              </select>
              <select value={filterProvince} onChange={(e) => setFilterProvince(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-lg outline-none">
                <option value="">Province (All)</option>
                {Object.keys(provinceCityMap).map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
              <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-lg outline-none">
                <option value="">City (All)</option>
                <option value="Wenzhou">Wenzhou</option>
                <option value="Weifang">Weifang</option>
                <option value="Qingdao">Qingdao</option>
              </select>
              <select value={filterSupplierType} onChange={(e) => setFilterSupplierType(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-lg outline-none">
                <option value="">Supplier Type (All / Blank)</option>
                <option value="Manufacturer">Manufacturer</option>
                <option value="Trader">Trader</option>
              </select>
              <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-lg outline-none">
                <option value="">Supplier's Grade (All / Blank)</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
                <option value="C">Grade C</option>
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-lg outline-none">
                <option value="">Current Status (All / Blank)</option>
                <option value="Existing">Existing</option>
                <option value="New">New</option>
              </select>
              <select value={filterPotential} onChange={(e) => setFilterPotential(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 p-2 rounded-lg outline-none">
                <option value="">Potential (All / Blank)</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          {/* Supplier Data Table matching exact spec */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5"><input type="checkbox" className="rounded border-slate-300" /></th>
                    <th className="p-3.5">Company Name</th>
                    <th className="p-3.5">Product Category (Max 5)</th>
                    <th className="p-3.5">Key Strength Sub Category</th>
                    <th className="p-3.5">Secondary Products</th>
                    <th className="p-3.5">Country</th>
                    <th className="p-3.5">City, Province</th>
                    <th className="p-3.5">Brand</th>
                    <th className="p-3.5">Supplier Type</th>
                    <th className="p-3.5">Current Status</th>
                    <th className="p-3.5">Supplier's Grade (Editable)</th>
                    <th className="p-3.5">Potential (Editable)</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {suppliers.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5"><input type="checkbox" className="rounded border-slate-300" /></td>
                      <td
                        onClick={() => {
                          setSelectedSupplier(item);
                          setViewMode('detail');
                        }}
                        className="p-3.5 font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        {item.name}
                      </td>

                      {/* Product Category (Show max 5, eye button if more) */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 items-center">
                          {item.product_categories.slice(0, 5).map((cat, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] rounded font-semibold">
                              {cat}
                            </span>
                          ))}
                          {item.product_categories.length > 5 && (
                            <button
                              onClick={() => setExpandedFieldModal({ title: `${item.name} - All Product Categories`, items: item.product_categories })}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Eye size={12} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Key Strength Sub Category (Show max 5, eye button if more) */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 items-center">
                          {item.key_strength_subcategories.slice(0, 5).map((sub, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-800 text-[10px] rounded font-semibold">
                              {sub}
                            </span>
                          ))}
                          {item.key_strength_subcategories.length > 5 && (
                            <button
                              onClick={() => setExpandedFieldModal({ title: `${item.name} - All Key Strength Sub Categories`, items: item.key_strength_subcategories })}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Eye size={12} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Secondary Products */}
                      <td className="p-3.5">
                        <span className="text-slate-600">
                          {Array.isArray(item.secondary_products) ? item.secondary_products.join(', ') : item.secondary_products}
                        </span>
                      </td>

                      <td className="p-3.5 font-semibold text-slate-900">{item.country}</td>
                      <td className="p-3.5">{item.city}, {item.province}</td>
                      <td className="p-3.5 text-slate-700">{item.brand_name || '-'}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{item.supplier_type}</td>

                      {/* Current Status (1-way editable) */}
                      <td className="p-3.5">
                        <select
                          value={item.current_status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-xs text-slate-900 p-1 rounded font-bold cursor-pointer outline-none"
                        >
                          <option value="NEW">New</option>
                          <option value="EXISTING">Existing</option>
                        </select>
                      </td>

                      {/* Editable Supplier's Grade in List */}
                      <td className="p-3.5">
                        <select
                          value={item.grade}
                          onChange={(e) => handleInlineGradeChange(item.id, e.target.value)}
                          className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-1 rounded font-bold cursor-pointer outline-none"
                        >
                          <option value="A">Grade A</option>
                          <option value="B">Grade B</option>
                          <option value="C">Grade C</option>
                        </select>
                      </td>

                      {/* Editable Potential in List */}
                      <td className="p-3.5">
                        <select
                          value={item.potential}
                          onChange={(e) => handleInlinePotentialChange(item.id, e.target.value)}
                          className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-1 rounded font-bold cursor-pointer outline-none"
                        >
                          <option value="YES">Yes</option>
                          <option value="NO">No</option>
                          <option value="UNSELECTED">Select</option>
                        </select>
                      </td>

                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedSupplier(item);
                            setViewMode('detail');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          Edit
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

      {/* VIEW MODE 2: 2-STAGE FORM ENTRY WITH MULTI-SELECT DROPDOWNS & AUTO-COMPLETE */}
      {viewMode === 'add' && (
        <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-2xs space-y-6">
          {/* Stage Switcher */}
          <div className="flex border-b border-slate-200 gap-4 pb-3">
            <button
              type="button"
              onClick={() => setFormStage(1)}
              className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                formStage === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              First Data Form (Basic Supplier & Contact Info)
            </button>
            <button
              type="button"
              onClick={() => setFormStage(2)}
              className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                formStage === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Second Form (Main Data Profile & Factory Visit)
            </button>
          </div>

          <form onSubmit={handleCreateSupplier} className="space-y-6">
            {/* FIRST FORM FIELDS */}
            {formStage === 1 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">First Data Form (Supplier)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* AUTO-COMPLETE KEYWORD SUGGESTION COMPANY NAME */}
                  <div className="md:col-span-2">
                    <CompanyAutocompleteInput
                      value={formData.name}
                      onChange={(val) => setFormData({ ...formData, name: val })}
                      suggestions={suppliers.map((s) => s.name)}
                    />
                  </div>

                  {/* MULTI-SELECT PRODUCT CATEGORY DROPDOWN */}
                  <div>
                    <MultiSelectDropdown
                      label="Product Category (Multi-Select Dropdown)"
                      options={categoryMasterOptions}
                      selected={formData.product_categories}
                      onChange={(newSel) => setFormData({ ...formData, product_categories: newSel })}
                      placeholder="Select Categories..."
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
                      <option value="Select">Select</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Brand of Suppliers Products</label>
                    <input
                      type="text"
                      placeholder="e.g. Yinglima Machinery"
                      value={formData.brand_name}
                      onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    />
                  </div>

                  {/* COUNTRY DROPDOWN WITH AUTO PHONE CODE PREFIX */}
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Country <span className="text-rose-500">*</span> (Dropdown - Auto-Prefixes Phone Codes)
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleFirstFormCountryChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-bold"
                    >
                      <option value="China">China (+86)</option>
                      <option value="Uganda">Uganda (+256)</option>
                      <option value="India">India (+91)</option>
                      <option value="Kenya">Kenya (+254)</option>
                      <option value="UAE">UAE (+971)</option>
                    </select>
                  </div>

                  {/* DYNAMIC PROVINCE DROPDOWN */}
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Province <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.province}
                      onChange={(e) => {
                        const newProv = e.target.value;
                        const defaultCity = provinceCityMap[newProv]?.[0] || 'Wenzhou';
                        setFormData({ ...formData, province: newProv, city: defaultCity });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    >
                      {Object.keys(provinceCityMap).map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>

                  {/* DYNAMIC CITY DROPDOWN BASED ON PROVINCE */}
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    >
                      {(provinceCityMap[formData.province] || ['Wenzhou', 'Ruian']).map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
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
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Primary Contact Name</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.contact_title}
                        onChange={(e) => setFormData({ ...formData, contact_title: e.target.value })}
                        className="w-20 bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                      >
                        <option value="Mr">Mr</option>
                        <option value="Mrs">Mrs</option>
                        <option value="Ms">Ms</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Full Name"
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

                  {/* Calling Number with 7-11 digits on-blur validation error */}
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Calling Number (7-11 digits restriction) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+86 13800138000"
                      value={formData.calling_number}
                      onChange={(e) => setFormData({ ...formData, calling_number: e.target.value })}
                      onBlur={(e) => validatePhone('calling', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-mono"
                    />
                    {phoneErrors.calling && <p className="text-[10px] text-rose-600 font-bold mt-1">{phoneErrors.calling}</p>}
                  </div>

                  {/* Whatsapp Number */}
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Whatsapp Number</label>
                    <input
                      type="text"
                      placeholder="+86 13800138000"
                      value={formData.whatsapp_number}
                      onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                      onBlur={(e) => validatePhone('whatsapp', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-mono"
                    />
                    {phoneErrors.whatsapp && <p className="text-[10px] text-rose-600 font-bold mt-1">{phoneErrors.whatsapp}</p>}
                  </div>

                  {/* Wechat Number */}
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">WeChat Number</label>
                    <input
                      type="text"
                      placeholder="+86 13800138000"
                      value={formData.wechat_number}
                      onChange={(e) => setFormData({ ...formData, wechat_number: e.target.value })}
                      onBlur={(e) => validatePhone('wechat', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-mono"
                    />
                    {phoneErrors.wechat && <p className="text-[10px] text-rose-600 font-bold mt-1">{phoneErrors.wechat}</p>}
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Email ID (Multiple Supported)</label>
                    <input
                      type="email"
                      placeholder="john@zhejiangpack.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECOND FORM FIELDS */}
            {formStage === 2 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Second Form (Main Data Profile & Factory Visit)</h3>
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

                  <div className="md:col-span-3">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Address</label>
                    <input
                      type="text"
                      placeholder="No. 888 Industrial Zone"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Primary Website (Hyperlink)</label>
                    <input
                      type="text"
                      placeholder="www.zhejiangpack.com"
                      value={formData.primary_website}
                      onChange={(e) => setFormData({ ...formData, primary_website: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none text-blue-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Secondary Website (Hyperlink)</label>
                    <input
                      type="text"
                      placeholder="www.pack-machine.cn"
                      value={formData.secondary_website}
                      onChange={(e) => setFormData({ ...formData, secondary_website: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none text-blue-600"
                    />
                  </div>

                  {/* MULTI-SELECT KEY STRENGTH SUB-CATEGORY DROPDOWN */}
                  <div className="md:col-span-2">
                    <MultiSelectDropdown
                      label="Suppliers Key Strength Product Sub Category (Multi-Select)"
                      options={subcategoryMasterOptions}
                      selected={formData.key_strength_subcategories}
                      onChange={(newSel) => setFormData({ ...formData, key_strength_subcategories: newSel })}
                      placeholder="Select Sub Categories..."
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Supplier's Grade</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    >
                      <option value="Select">Select</option>
                      <option value="A">Grade A</option>
                      <option value="B">Grade B</option>
                      <option value="C">Grade C</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Current Status (Default Select)</label>
                    <select
                      value={formData.current_status}
                      onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    >
                      <option value="Select">Select</option>
                      <option value="NEW">New</option>
                      <option value="EXISTING">Existing</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Potential (Default Select)</label>
                    <select
                      value={formData.potential}
                      onChange={(e) => setFormData({ ...formData, potential: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    >
                      <option value="Select">Select</option>
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Key Reason for Potential / Not Potential</label>
                    <input
                      type="text"
                      placeholder="e.g. High manufacturing capacity & 4 automated lines"
                      value={formData.potential_reason}
                      onChange={(e) => setFormData({ ...formData, potential_reason: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Secondary Products Can Supply (Description)</label>
                    <input
                      type="text"
                      placeholder="e.g. Teflon Belts, Heating Blocks, Silicone Strips, Motor Drives"
                      value={formData.secondary_products}
                      onChange={(e) => setFormData({ ...formData, secondary_products: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Visited Factory / Office?</label>
                    <select
                      value={formData.visited_factory}
                      onChange={(e) => setFormData({ ...formData, visited_factory: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                    >
                      <option value="No">No (Default)</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {formData.visited_factory === 'Yes' && (
                    <div className="md:col-span-3">
                      <label className="text-xs text-slate-700 font-semibold block mb-1">Visit Remarks</label>
                      <input
                        type="text"
                        placeholder="e.g. Visited Wenzhou factory in April 2024. Excellent QA testing."
                        value={formData.visit_remarks}
                        onChange={(e) => setFormData({ ...formData, visit_remarks: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none"
                      />
                    </div>
                  )}

                  {/* ISSUE 1 FIX: FULL INTERACTIVE ATTACHMENTS MANAGER FOR VISIT PHOTOS / VIDEOS */}
                  {formData.visited_factory === 'Yes' && (
                    <div className="md:col-span-4 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                          <Camera size={16} className="text-blue-600" /> Visit Photos / Videos Attachments (Upload & Manage)
                        </label>
                        <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1">
                          <Upload size={14} /> Upload File
                          <input type="file" multiple accept="image/*, video/*" onChange={handleAddAttachment} className="hidden" />
                        </label>
                      </div>

                      {/* File Thumbnails List */}
                      {visitAttachments.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                          {visitAttachments.map((att) => (
                            <div key={att.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {att.type === 'video' ? <Video size={16} className="text-amber-500 shrink-0" /> : <ImageIcon size={16} className="text-blue-500 shrink-0" />}
                                <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">{att.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(att.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No factory photos or videos attached yet.</p>
                      )}
                    </div>
                  )}

                  <div className="md:col-span-4">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Overall Remarks / Key Strengths</label>
                    <textarea
                      rows={3}
                      placeholder="Primary OEM supplier details..."
                      value={formData.overall_remarks}
                      onChange={(e) => setFormData({ ...formData, overall_remarks: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-3 rounded-lg outline-none"
                    />
                  </div>
                </div>

                {/* ADD SECONDARY CONTACTS FORM SECTION INSIDE FORM */}
                <div className="pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus size={15} className="text-blue-600" /> Add Contacts Form
                    </h4>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Mr. / Mrs / Ms - Person Name</label>
                        <div className="flex gap-1">
                          <select
                            value={newContact.title}
                            onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                            className="w-16 bg-white border border-slate-200 text-xs p-2 rounded outline-none"
                          >
                            <option value="Mr">Mr</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Ms">Ms</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={newContact.name}
                            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                            className="flex-1 bg-white border border-slate-200 text-xs p-2 rounded outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Designation</label>
                        <input
                          type="text"
                          placeholder="e.g. Technical Engineer"
                          value={newContact.designation}
                          onChange={(e) => setNewContact({ ...newContact, designation: e.target.value })}
                          className="w-full bg-white border border-slate-200 text-xs p-2 rounded outline-none"
                        />
                      </div>

                      {/* ISSUE 2 FIX: HANDLING TERRITORY COMBOBOX / WRITE-IN DROPDOWN */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Handling Territory (Select or Type Custom)</label>
                        <input
                          type="text"
                          list="territoryOptionsList"
                          placeholder="Export Global"
                          value={newContact.territory}
                          onChange={(e) => setNewContact({ ...newContact, territory: e.target.value })}
                          className="w-full bg-white border border-slate-200 text-xs p-2 rounded outline-none"
                        />
                        <datalist id="territoryOptionsList">
                          <option value="Local" />
                          <option value="Export India" />
                          <option value="Export Africa" />
                          <option value="Export Global" />
                          <option value="Export USA & Europe" />
                        </datalist>
                      </div>

                      {/* ISSUE 3 FIX: COUNTRY DROPDOWN WITH AUTO PHONE CODE PREFIX IN SUB-CONTACT FORM */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Country (Dropdown Menu)</label>
                        <select
                          value={newContact.country}
                          onChange={(e) => handleSubContactCountryChange(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-xs p-2 rounded outline-none font-bold"
                        >
                          <option value="China">China (+86)</option>
                          <option value="Uganda">Uganda (+256)</option>
                          <option value="India">India (+91)</option>
                          <option value="Kenya">Kenya (+254)</option>
                          <option value="UAE">UAE (+971)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Calling Number</label>
                        <input
                          type="text"
                          placeholder="+86 13900000000"
                          value={newContact.calling}
                          onChange={(e) => setNewContact({ ...newContact, calling: e.target.value })}
                          className="w-full bg-white border border-slate-200 text-xs p-2 rounded outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Whatsapp Number</label>
                        <input
                          type="text"
                          placeholder="+86 13900000000"
                          value={newContact.whatsapp}
                          onChange={(e) => setNewContact({ ...newContact, whatsapp: e.target.value })}
                          className="w-full bg-white border border-slate-200 text-xs p-2 rounded outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">WeChat Number</label>
                        <input
                          type="text"
                          placeholder="+86 13900000000"
                          value={newContact.wechat}
                          onChange={(e) => setNewContact({ ...newContact, wechat: e.target.value })}
                          className="w-full bg-white border border-slate-200 text-xs p-2 rounded outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Email</label>
                        <input
                          type="email"
                          placeholder="email@supplier.com"
                          value={newContact.email}
                          onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          className="w-full bg-white border border-slate-200 text-xs p-2 rounded outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSaveSubContact}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} /> {editingContactId ? 'Update Contact in Table' : 'Add Contact to Table'}
                      </button>
                    </div>
                  </div>

                  {/* ISSUE 4 FIX: ADD CONTACTS LIST TABLE WITH EXACT SPEC HEADINGS & HYPERLINKS */}
                  {formContacts.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden text-xs space-y-2">
                      <h4 className="p-3 bg-slate-100 font-bold uppercase text-[11px] text-slate-700 border-b border-slate-200">
                        Add Contacts List
                      </h4>
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 font-bold uppercase text-[10px] text-slate-600">
                          <tr>
                            <th className="p-3">Mr. / Mrs / Ms - Person Name / Designation</th>
                            <th className="p-3">Calling Number / Whatsapp Number</th>
                            <th className="p-3">Wechat / Email</th>
                            <th className="p-3">Handling Territory</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {formContacts.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50">
                              <td className="p-3">
                                <p className="font-bold text-slate-900">{c.title} {c.name}</p>
                                <p className="text-[11px] text-slate-500">{c.designation}</p>
                              </td>
                              <td className="p-3 font-mono">
                                <a href={`tel:${c.calling}`} className="text-blue-600 hover:underline block">Call: {c.calling}</a>
                                <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline block text-[11px]">WA: {c.whatsapp}</a>
                              </td>
                              <td className="p-3 font-mono">
                                <p className="text-slate-800">WeChat: {c.wechat}</p>
                                <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline block text-[11px]">{c.email}</a>
                              </td>
                              <td className="p-3 text-slate-700">{c.territory}</td>
                              <td className="p-3 text-right space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditFormContact(c)}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFormContact(c.id)}
                                  className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-semibold"
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
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {formStage === 2 ? (
                <button
                  type="button"
                  onClick={() => setFormStage(1)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
                >
                  Back to First Form
                </button>
              ) : <div />}

              {formStage === 1 ? (
                <button
                  type="button"
                  onClick={() => setFormStage(2)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm"
                >
                  Next to Second Form
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

      {/* VIEW MODE 3: SUPPLIER DETAIL DRAWER & SUB-CONTACTS LIST */}
      {viewMode === 'detail' && selectedSupplier && (
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-2xs space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">{selectedSupplier.name} Full Profile Details</h3>
            <button onClick={() => setViewMode('list')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg">
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-slate-700">
              <p><strong>Company:</strong> {selectedSupplier.name}</p>
              <p><strong>Supplier Type:</strong> {selectedSupplier.supplier_type} | <strong>Brand:</strong> {selectedSupplier.brand_name || 'Generic'}</p>
              <p><strong>Country / Location:</strong> {selectedSupplier.city}, {selectedSupplier.province}, {selectedSupplier.country}</p>
              <p><strong>Address:</strong> {selectedSupplier.address}, {selectedSupplier.town}</p>
              <p><strong>Tax ID:</strong> {selectedSupplier.tax_id}</p>
              <p><strong>Primary Website:</strong> <a href={`https://${selectedSupplier.primary_website}`} target="_blank" rel="noreferrer" className="text-blue-600 underline font-mono">{selectedSupplier.primary_website}</a></p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-slate-700">
              <p><strong>Current Status:</strong> {selectedSupplier.current_status} | <strong>Grade:</strong> Grade {selectedSupplier.grade}</p>
              <p><strong>Potential:</strong> {selectedSupplier.potential} ({selectedSupplier.potential_reason || 'N/A'})</p>
              <p><strong>Visited Factory:</strong> {selectedSupplier.visited_factory} ({selectedSupplier.visit_remarks || 'N/A'})</p>
              <p><strong>Product Categories:</strong> {selectedSupplier.product_categories?.join(', ')}</p>
              <p><strong>Key Strength Sub-Categories:</strong> {selectedSupplier.key_strength_subcategories?.join(', ')}</p>
              <p><strong>Secondary Products:</strong> {Array.isArray(selectedSupplier.secondary_products) ? selectedSupplier.secondary_products.join(', ') : selectedSupplier.secondary_products}</p>
            </div>
          </div>

          {/* ADD CONTACTS SUB-FORM & LIST TABLE MATCHING EXACT SPEC */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Add Contacts List (Synchronized with First Form Contact)</h4>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Mr. / Mrs / Ms - Person Name / Designation</th>
                    <th className="p-3">Calling Number / Whatsapp Number</th>
                    <th className="p-3">Wechat / Email</th>
                    <th className="p-3">Handling Territory</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedSupplier.contacts?.map((c: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{c.title} {c.name}</p>
                        <p className="text-[11px] text-slate-500">{c.designation}</p>
                      </td>
                      <td className="p-3 font-mono">
                        <a href={`tel:${c.calling}`} className="text-blue-600 hover:underline block">Call: {c.calling}</a>
                        <a href={`https://wa.me/${c.whatsapp?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline block text-[11px]">WA: {c.whatsapp}</a>
                      </td>
                      <td className="p-3 font-mono">
                        <p className="text-slate-800">WeChat: {c.wechat}</p>
                        <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline block text-[11px]">{c.email}</a>
                      </td>
                      <td className="p-3 text-slate-700">{c.territory}</td>
                      <td className="p-3 text-right space-x-1">
                        <button className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px]">Edit</button>
                        <button className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px]">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ISSUE 5 FIX: EXPAND ALL FILTERED DATA MASTER MODAL */}
      {showExpandAllModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Maximize2 size={18} className="text-indigo-600" /> Expanded Filtered View (All Master Data)
                </h3>
                <p className="text-xs text-slate-500">Full un-truncated categories, sub-categories, secondary products, contacts, and visit attachments</p>
              </div>
              <button onClick={() => setShowExpandAllModal(false)} className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-200 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {suppliers.map((s) => (
                <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h4 className="text-sm font-bold text-blue-700">{s.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">Grade {s.grade}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">{s.current_status}</span>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-bold rounded">Potential: {s.potential}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">All Product Categories:</span>
                      <div className="flex flex-wrap gap-1">
                        {s.product_categories.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 font-semibold rounded text-[11px]">{c}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-900 block mb-1">Key Strength Sub-Categories:</span>
                      <div className="flex flex-wrap gap-1">
                        {s.key_strength_subcategories.map((sc, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-900 font-semibold rounded text-[11px]">{sc}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-900 block mb-1">Secondary Products:</span>
                      <p className="text-slate-700">{Array.isArray(s.secondary_products) ? s.secondary_products.join(', ') : s.secondary_products}</p>
                    </div>
                  </div>

                  {/* Associated Contacts in Expanded View */}
                  {s.contacts && s.contacts.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-900 block">Associated Contacts List:</span>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-100 font-bold uppercase">
                            <tr>
                              <th className="p-2">Name / Designation</th>
                              <th className="p-2">Calling / Whatsapp</th>
                              <th className="p-2">Wechat / Email</th>
                              <th className="p-2">Handling Territory</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {s.contacts.map((c: any, i: number) => (
                              <tr key={i}>
                                <td className="p-2 font-bold">{c.title} {c.name} ({c.designation})</td>
                                <td className="p-2 font-mono text-blue-600">{c.calling} / {c.whatsapp}</td>
                                <td className="p-2 font-mono">{c.wechat} / {c.email}</td>
                                <td className="p-2">{c.territory}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EXPANDED ITEMS MODAL FOR >5 ITEMS */}
      {expandedFieldModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{expandedFieldModal.title}</h3>
              <button onClick={() => setExpandedFieldModal(null)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg">
              {expandedFieldModal.items.map((item, idx) => (
                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-900 text-xs font-semibold rounded">
                  {item}
                </span>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setExpandedFieldModal(null)} className="px-4 py-2 bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

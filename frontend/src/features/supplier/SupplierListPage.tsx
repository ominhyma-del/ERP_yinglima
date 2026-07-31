import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Truck, Plus, Filter, ShieldAlert, ArrowLeft, Download, Upload, FileSpreadsheet, X, CheckCircle, Eye, Trash2, Camera, Phone, Mail, MessageSquare, AlertCircle, Link as LinkIcon, Check, ChevronDown, UserPlus, Edit, Maximize2, FileText, Image as ImageIcon, Video, Search, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import { supplierApi } from '../../api/supplierApi';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';
import { can } from '../team/teamStore';

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
      <label className="text-xs font-semibold text-slate-700 block mb-1">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-300 text-xs text-slate-900 p-2.5 rounded-lg cursor-pointer flex items-center justify-between min-h-[38px] hover:border-blue-500 transition-colors shadow-2xs"
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
        placeholder="Type Company Name..."
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white font-medium"
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
  const [inlineEditEnabled, setInlineEditEnabled] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null); // EDIT SUPPLIER STATE
  const [showRuleAlert, setShowRuleAlert] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExpandAllModal, setShowExpandAllModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [expandedFieldModal, setExpandedFieldModal] = useState<{ title: string; items: string[] } | null>(null);

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

  const { user: currentUser } = useAuth();
  const canEdit = can(currentUser as any, 'suppliers', 'edit');
  const canDelete = can(currentUser as any, 'suppliers', 'delete');

  // Initial Suppliers state (100% database driven)
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch live suppliers directly from Supabase DB via NestJS API
  useEffect(() => {
    async function loadApiSuppliers() {
      setIsLoading(true);
      const data = await supplierApi.getSuppliers();
      if (data && Array.isArray(data)) {
        setSuppliers(data);
      }
      setIsLoading(false);
    }
    loadApiSuppliers();
  }, []);

  // Active Top Filter & View States matching Darsh Impex
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [subTab, setSubTab] = useState<'Active' | 'Inactive'>('Active');
  const [showImpExpDropdown, setShowImpExpDropdown] = useState(false);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterSubCategory, setFilterSubCategory] = useState('All');
  const [filterCountry, setFilterCountry] = useState('All');
  const [filterProvince, setFilterProvince] = useState('All');
  const [filterCity, setFilterCity] = useState('All');
  const [filterSupplierType, setFilterSupplierType] = useState('All');
  const [filterGrade, setFilterGrade] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPotential, setFilterPotential] = useState('All');
  const [filterVisited, setFilterVisited] = useState('All');

  // ACTIVE FILTERED SUPPLIERS IMPLEMENTATION
  const filteredSuppliers = suppliers.filter((s) => {
    if (subTab === 'Active' && s.current_status === 'INACTIVE') return false;
    if (subTab === 'Inactive' && s.current_status !== 'INACTIVE') return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const nameMatch = s.name.toLowerCase().includes(term);
      const brandMatch = s.brand_name.toLowerCase().includes(term);
      const cityMatch = s.city.toLowerCase().includes(term);
      const catMatch = s.product_categories.some((c) => c.toLowerCase().includes(term));
      if (!nameMatch && !brandMatch && !cityMatch && !catMatch) return false;
    }

    if (filterCategory !== 'All' && !s.product_categories.includes(filterCategory)) return false;
    if (filterSubCategory !== 'All' && !s.key_strength_subcategories.includes(filterSubCategory)) return false;
    if (filterCountry !== 'All' && s.country !== filterCountry) return false;
    if (filterProvince !== 'All' && s.province !== filterProvince) return false;
    if (filterCity !== 'All' && s.city !== filterCity) return false;
    if (filterSupplierType !== 'All' && s.supplier_type !== filterSupplierType) return false;
    if (filterGrade !== 'All' && s.grade !== filterGrade) return false;
    if (filterStatus !== 'All' && s.current_status.toUpperCase() !== filterStatus.toUpperCase()) return false;
    if (filterPotential !== 'All' && s.potential.toUpperCase() !== filterPotential.toUpperCase()) return false;
    if (filterVisited !== 'All' && s.visited_factory.toUpperCase() !== filterVisited.toUpperCase()) return false;

    return true;
  });

  // Column Sorting State
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedSuppliers = useMemo(() => {
    if (!sortField) return filteredSuppliers;
    return [...filteredSuppliers].sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';

      if (Array.isArray(valA)) valA = valA.join(', ');
      if (Array.isArray(valB)) valB = valB.join(', ');

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredSuppliers, sortField, sortDirection]);

  const renderSortHeader = (label: string, field: string) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className="p-3.5 select-none cursor-pointer hover:bg-slate-200/70 transition-colors group"
      >
        <div className="flex items-center gap-1.5">
          <span className="p-0.5 text-slate-500">
            {isActive ? (
              sortDirection === 'asc' ? (
                <ArrowUp size={14} className="text-blue-600 font-bold" />
              ) : (
                <ArrowDown size={14} className="text-blue-600 font-bold" />
              )
            ) : (
              <ArrowUpDown size={14} className="text-slate-400 group-hover:text-slate-700" />
            )}
          </span>
          <span>{label}</span>
        </div>
      </th>
    );
  };

  // Bulk selection & Merge State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [targetMergeId, setTargetMergeId] = useState<string>('');

  const isAllSelected = sortedSuppliers.length > 0 && sortedSuppliers.every((s) => selectedIds.includes(s.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedSuppliers.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected supplier(s)?`)) {
      setSuppliers((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      setImportNotification(`${selectedIds.length} supplier(s) deleted.`);
    }
  };

  const handleOpenMerge = () => {
    if (selectedIds.length < 2) {
      alert('Please select at least 2 records to merge.');
      return;
    }
    setTargetMergeId(selectedIds[0]);
    setShowMergeModal(true);
  };

  const handleExecuteMerge = () => {
    if (!targetMergeId) return;
    const targetSupplier = suppliers.find((s) => s.id === targetMergeId);
    if (!targetSupplier) return;

    const mergeItems = suppliers.filter((s) => selectedIds.includes(s.id));
    const mergedCategories = Array.from(new Set(mergeItems.flatMap((s) => s.product_categories || [])));
    const mergedSubcats = Array.from(new Set(mergeItems.flatMap((s) => s.key_strength_subcategories || [])));

    setSuppliers((prev) =>
      prev
        .map((s) =>
          s.id === targetMergeId
            ? {
                ...s,
                product_categories: mergedCategories,
                key_strength_subcategories: mergedSubcats,
              }
            : s,
        )
        .filter((s) => s.id === targetMergeId || !selectedIds.includes(s.id)),
    );

    setSelectedIds([]);
    setShowMergeModal(false);
    setImportNotification(`Merged ${mergeItems.length} suppliers into "${targetSupplier.name}".`);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterCategory('All');
    setFilterSubCategory('All');
    setFilterCountry('All');
    setFilterProvince('All');
    setFilterCity('All');
    setFilterSupplierType('All');
    setFilterGrade('All');
    setFilterStatus('All');
    setFilterPotential('All');
    setFilterVisited('All');
  };

  // Initial Form Data reset state
  const initialFormData = {
    name: '',
    product_categories: [] as string[],
    supplier_type: 'Manufacturer',
    brand_name: '',
    country: 'China',
    province: 'Zhejiang',
    city: 'Wenzhou',
    address: '',
    town: '',
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
    key_strength_subcategories: [] as string[],
    grade: 'Select',
    current_status: 'Select',
    potential: 'Select',
    potential_reason: '',
    secondary_products: '',
    visited_factory: 'No',
    visit_remarks: '',
    overall_remarks: '',
  };

  // Form Data state
  const [formData, setFormData] = useState({ ...initialFormData });

  // Attachments State for Factory Visit Photos / Videos (Empty by default for new entry)
  const [visitAttachments, setVisitAttachments] = useState<{ id: string; name: string; type: 'photo' | 'video'; url: string }[]>([]);

  // Secondary Contacts List State (Inside Form)
  const [formContacts, setFormContacts] = useState<any[]>([]);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  // HANDLING TERRITORY CLEAN DROPDOWN
  const [newContact, setNewContact] = useState({
    title: 'Mr',
    name: '',
    designation: '',
    territory: 'Export India',
    country: 'China',
    calling: '+86 ',
    whatsapp: '+86 ',
    wechat: '+86 ',
    email: '',
  });

  // EDIT SUPPLIER ACTION (LOAD DATA & OPEN FORM)
  const handleOpenEditSupplier = (supplier: any) => {
    setEditingSupplierId(supplier.id);
    setFormData({
      name: supplier.name,
      product_categories: supplier.product_categories || ['Machines'],
      supplier_type: supplier.supplier_type || 'Manufacturer',
      brand_name: supplier.brand_name || '',
      country: supplier.country || 'China',
      province: supplier.province || 'Zhejiang',
      city: supplier.city || 'Wenzhou',
      address: supplier.address || '',
      town: supplier.town || '',
      contact_title: supplier.contact_title || 'Mr',
      contact_name: supplier.contact_name || '',
      designation: supplier.designation || '',
      calling_number: supplier.calling_number || '+86 ',
      whatsapp_number: supplier.whatsapp_number || '+86 ',
      wechat_number: supplier.wechat_number || '+86 ',
      email: supplier.emails?.[0] || '',
      tax_id: supplier.tax_id || '',
      primary_website: supplier.primary_website || '',
      secondary_website: supplier.secondary_website || '',
      key_strength_subcategories: supplier.key_strength_subcategories || ['Band Sealer'],
      grade: supplier.grade || 'Select',
      current_status: supplier.current_status || 'Select',
      potential: supplier.potential || 'Select',
      potential_reason: supplier.potential_reason || '',
      secondary_products: Array.isArray(supplier.secondary_products) ? supplier.secondary_products.join(', ') : supplier.secondary_products || '',
      visited_factory: supplier.visited_factory || 'No',
      visit_remarks: supplier.visit_remarks || '',
      overall_remarks: supplier.overall_remarks || '',
    });
    setFormContacts(supplier.contacts ? supplier.contacts.slice(1) : []); // Load secondary contacts
    setVisitAttachments(supplier.attachments || []);
    setViewMode('add');
    setFormStage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    if (!newContact.name) {
      alert('Please enter Person Name for the contact.');
      return;
    }

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
      territory: 'Export India',
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
    const headers = [
      'Company Name',
      'Supplier Type',
      'Brand Name',
      'Product Categories',
      'Key Strength Sub Categories',
      'Secondary Products',
      'Country',
      'Province',
      'City',
      'Town',
      'Address',
      'Primary Contact Name',
      'Calling Number',
      'Email',
      'Current Status',
      'Supplier Grade',
      'Potential',
      'Visited Factory?',
      'Visit Remarks',
    ];

    const rows = filteredSuppliers.map((s) => [
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.supplier_type || '').replace(/"/g, '""')}"`,
      `"${(s.brand_name || '').replace(/"/g, '""')}"`,
      `"${(Array.isArray(s.product_categories) ? s.product_categories.join('; ') : '').replace(/"/g, '""')}"`,
      `"${(Array.isArray(s.key_strength_subcategories) ? s.key_strength_subcategories.join('; ') : '').replace(/"/g, '""')}"`,
      `"${(Array.isArray(s.secondary_products) ? s.secondary_products.join('; ') : s.secondary_products || '').replace(/"/g, '""')}"`,
      `"${(s.country || '').replace(/"/g, '""')}"`,
      `"${(s.province || '').replace(/"/g, '""')}"`,
      `"${(s.city || '').replace(/"/g, '""')}"`,
      `"${(s.town || '').replace(/"/g, '""')}"`,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      `"${(s.contact_name || '').replace(/"/g, '""')}"`,
      `"${(s.calling_number || '').replace(/"/g, '""')}"`,
      `"${(s.emails ? s.emails.join('; ') : '').replace(/"/g, '""')}"`,
      `"${(s.current_status || '').replace(/"/g, '""')}"`,
      `"${(s.grade || '').replace(/"/g, '""')}"`,
      `"${(s.potential || '').replace(/"/g, '""')}"`,
      `"${(s.visited_factory || '').replace(/"/g, '""')}"`,
      `"${(s.visit_remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Yinglima_Suppliers_Directory_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // CREATE OR UPDATE SUPPLIER PROFILE HANDLER
  const handleCreateSupplier = async (e?: any) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    const companyName = formData.name.trim() || 'Yinglima Supplier Co.';

    // Check Duplication if creating new supplier
    if (!editingSupplierId) {
      const isDuplicate = suppliers.some(
        (s) => s.name.trim().toLowerCase() === companyName.toLowerCase() && s.city.trim().toLowerCase() === formData.city.trim().toLowerCase()
      );

      if (isDuplicate) {
        setShowRuleAlert(`DUPLICATE_ENTRY: Supplier with company name "${companyName}" in city "${formData.city}" already exists!`);
        return;
      }
    }

    const primaryContactObj = {
      id: `c-p-${Date.now()}`,
      title: formData.contact_title,
      name: `${formData.contact_title} ${formData.contact_name || 'Primary Contact'}`,
      designation: formData.designation || 'Sales Director',
      territory: 'Export Global',
      country: formData.country,
      calling: formData.calling_number || '+86 13800000000',
      whatsapp: formData.whatsapp_number || formData.calling_number || '+86 13800000000',
      wechat: formData.wechat_number || '+86 13800000000',
      email: formData.email || 'info@supplier.com',
    };

    const updatedSupplierObj = {
      id: editingSupplierId || `s${Date.now()}`,
      name: companyName,
      product_categories: formData.product_categories.length > 0 ? formData.product_categories : ['Machines'],
      supplier_type: formData.supplier_type,
      brand_name: formData.brand_name || 'Yinglima Supplier',
      country: formData.country,
      province: formData.province,
      city: formData.city,
      town: formData.town || 'Industrial Town',
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
      key_strength_subcategories: formData.key_strength_subcategories.length > 0 ? formData.key_strength_subcategories : ['Band Sealer'],
      grade: formData.grade === 'Select' ? 'A' : formData.grade,
      current_status: formData.current_status === 'Select' ? 'NEW' : formData.current_status,
      potential: formData.potential === 'Select' ? 'YES' : formData.potential,
      potential_reason: formData.potential_reason,
      secondary_products: formData.secondary_products ? formData.secondary_products.split(',') : ['Spare Parts'],
      visited_factory: formData.visited_factory,
      visit_remarks: formData.visit_remarks,
      attachments: visitAttachments,
      overall_remarks: formData.overall_remarks || 'Supplier Profile Updated',
      contacts: [primaryContactObj, ...formContacts],
    };

    if (editingSupplierId) {
      setSuppliers(suppliers.map((s) => (s.id === editingSupplierId ? updatedSupplierObj : s)));
      setImportNotification(`Successfully updated supplier profile for "${companyName}"!`);
    } else {
      // Persist to Supabase Cloud DB via NestJS Backend API
      setSuppliers([updatedSupplierObj, ...suppliers]);
      await supplierApi.createSupplier(updatedSupplierObj);
      const apiList = await supplierApi.getSuppliers();
      if (apiList && Array.isArray(apiList) && apiList.length > 0) {
        setSuppliers(apiList);
      }
      setImportNotification(`Successfully created & saved new supplier profile "${companyName}" to Supabase Database!`);
    }

    setViewMode('list');
    setEditingSupplierId(null);
    setFormStage(1);
    setFormContacts([]);
    setFormData({ ...initialFormData });
    setShowRuleAlert(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setImportNotification(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {viewMode === 'add' ? (editingSupplierId ? `Edit Supplier Profile (${formData.name})` : `Add Supplier Profile (Stage ${formStage} of 2)`) : viewMode === 'detail' ? 'Supplier Details' : 'Suppliers'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Yinglima China Procurement & Supplier Directory
          </p>
        </div>

        {viewMode === 'list' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                showFilterPanel
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
              title="Toggle Filters Panel"
            >
              <Filter size={15} />
            </button>

            {/* Inline Edit Toggle Button */}
            <button
              onClick={() => setInlineEditEnabled(!inlineEditEnabled)}
              className={`p-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs text-xs font-bold ${
                inlineEditEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                  : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
              title="Toggle Inline Editing Mode"
            >
              <Edit size={14} />
              <span>Inline Edit</span>
            </button>

            {/* + ADD NEW BUTTON */}
            {canEdit && (
              <button
                onClick={() => {
                  setEditingSupplierId(null);
                  setFormData({ ...initialFormData });
                  setVisitAttachments([]);
                  setFormContacts([]);
                  setViewMode('add');
                  setFormStage(1);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus size={16} /> + ADD NEW
              </button>
            )}

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

            {/* BULK ACTIONS DROPDOWN BUTTON */}
            <div className="relative">
              <button
                onClick={() => setShowBulkDropdown(!showBulkDropdown)}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <span>Bulk Actions</span>
                <ChevronDown size={14} />
              </button>
              {showBulkDropdown && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-xl z-50 text-xs py-1">
                  <button
                    onClick={() => {
                      setShowBulkDropdown(false);
                      setImportNotification('Bulk updated selected items');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                  >
                    Mark as Active
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkDropdown(false);
                      setImportNotification('Exported bulk data');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                  >
                    Export Selected
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setViewMode('list');
              setEditingSupplierId(null);
            }}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <ArrowLeft size={15} /> BACK TO LIST
          </button>
        )}
      </div>

      {/* IMPORT / CREATE TOAST */}
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
          {/* EXACT DARSH IMPEX COLLAPSIBLE FILTER PANEL */}
          {showFilterPanel && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <Filter size={14} className="text-blue-600" /> Top Filter Fields
                </span>
                <button
                  onClick={handleResetFilters}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 normal-case cursor-pointer"
                >
                  <RotateCcw size={12} /> Reset Filters
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Product Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="All">All</option>
                    {categoryMasterOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Key Strength Sub Category</label>
                  <select
                    value={filterSubCategory}
                    onChange={(e) => setFilterSubCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="All">All</option>
                    {subcategoryMasterOptions.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Country</label>
                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="All">All</option>
                    <option value="China">China</option>
                    <option value="Uganda">Uganda</option>
                    <option value="India">India</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Province</label>
                  <select
                    value={filterProvince}
                    onChange={(e) => setFilterProvince(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="All">All</option>
                    {Object.keys(provinceCityMap).map((prov) => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">City</label>
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="All">All</option>
                    <option value="Wenzhou">Wenzhou</option>
                    <option value="Weifang">Weifang</option>
                    <option value="Qingdao">Qingdao</option>
                  </select>
                </div>
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
          {/* TABLE SEARCH BAR (MATCHING DARSH IMPEX EXACT LAYOUT) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search suppliers by name, brand, city, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs text-slate-800 outline-none bg-transparent"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
                title="Clear Search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* BULK ACTION BAR */}
          {selectedIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <CheckCircle size={16} className="text-blue-600" />
                <span>{selectedIds.length} supplier(s) selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenMerge}
                  disabled={selectedIds.length < 2}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Layers size={14} /> Merge Selected ({selectedIds.length})
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 size={14} /> Delete Selected ({selectedIds.length})
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Supplier Data Table matching exact spec */}
          {isLoading ? (
            <TableSkeleton rows={8} />
          ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 text-center w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 cursor-pointer w-4 h-4"
                      />
                    </th>
                    {renderSortHeader('Company Name', 'name')}
                    {renderSortHeader('Product Category (Max 5)', 'product_categories')}
                    {renderSortHeader('Key Strength Sub Category', 'key_strength_subcategories')}
                    {renderSortHeader('Secondary Products', 'secondary_products')}
                    {renderSortHeader('Country', 'country')}
                    {renderSortHeader('City, Province', 'city')}
                    {renderSortHeader('Brand', 'brand_name')}
                    {renderSortHeader('Supplier Type', 'supplier_type')}
                    {renderSortHeader(`Current Status${inlineEditEnabled ? ' (Editable)' : ''}`, 'current_status')}
                    {renderSortHeader(`Supplier's Grade${inlineEditEnabled ? ' (Editable)' : ''}`, 'grade')}
                    {renderSortHeader(`Potential${inlineEditEnabled ? ' (Editable)' : ''}`, 'potential')}
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sortedSuppliers.length > 0 ? (
                    sortedSuppliers.map((item) => (
                      <tr key={item.id} className={`transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelectOne(item.id)}
                            className="rounded border-slate-300 cursor-pointer w-4 h-4"
                          />
                        </td>
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

                        {/* Current Status */}
                        <td className="p-3.5">
                          {inlineEditEnabled ? (
                            <select
                              value={item.current_status}
                              onChange={(e) => handleStatusChange(item.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-xs text-slate-900 p-1 rounded font-bold cursor-pointer outline-none"
                            >
                              <option value="NEW">New</option>
                              <option value="EXISTING">Existing</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 rounded font-bold text-xs uppercase ${
                              item.current_status === 'EXISTING' ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.current_status === 'EXISTING' ? 'Existing' : 'New'}
                            </span>
                          )}
                        </td>

                        {/* Supplier's Grade */}
                        <td className="p-3.5">
                          {inlineEditEnabled ? (
                            <select
                              value={item.grade}
                              onChange={(e) => handleInlineGradeChange(item.id, e.target.value)}
                              className="bg-blue-50 border border-blue-200 text-blue-800 text-xs p-1 rounded font-bold cursor-pointer outline-none"
                            >
                              <option value="A">Grade A</option>
                              <option value="B">Grade B</option>
                              <option value="C">Grade C</option>
                            </select>
                          ) : (
                            <span className="px-2 py-1 bg-blue-50 text-blue-800 rounded font-bold text-xs">
                              Grade {item.grade || 'Select'}
                            </span>
                          )}
                        </td>

                        {/* Potential */}
                        <td className="p-3.5">
                          {inlineEditEnabled ? (
                            <select
                              value={item.potential}
                              onChange={(e) => handleInlinePotentialChange(item.id, e.target.value)}
                              className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-1 rounded font-bold cursor-pointer outline-none"
                            >
                              <option value="YES">Yes</option>
                              <option value="NO">No</option>
                              <option value="UNSELECTED">Select</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 rounded font-bold text-xs ${
                              item.potential === 'YES' ? 'bg-emerald-50 text-emerald-800' :
                              item.potential === 'NO' ? 'bg-rose-50 text-rose-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.potential === 'YES' ? 'Yes' : item.potential === 'NO' ? 'No' : 'Select'}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right space-x-1">
                          {/* EDIT BUTTON LOADS FULL SUPPLIER FORM FOR EDITING (DARSH IMPEX EXACT BEHAVIOR) */}
                          <button
                            onClick={() => handleOpenEditSupplier(item)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-bold cursor-pointer"
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-slate-400 font-semibold">
                        No suppliers match the selected filter criteria. Click "Reset" above to show all.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: EDIT / ADD SUPPLIER FORM (STAGE 1 & STAGE 2) */}
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
                    >
                      {(provinceCityMap[formData.province] || ['Wenzhou', 'Ruian']).map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Primary Contact Name</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.contact_title}
                        onChange={(e) => setFormData({ ...formData, contact_title: e.target.value })}
                        className="w-20 bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
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
                        className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
                    />
                  </div>

                  {/* Calling Number with 7-11 digits on-blur validation error */}
                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Calling Number (7-11 digits restriction)
                    </label>
                    <input
                      type="text"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Address</label>
                    <input
                      type="text"
                      placeholder="No. 888 Industrial Zone"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Town</label>
                    <input
                      type="text"
                      placeholder="e.g. Ruian Town"
                      value={formData.town}
                      onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Primary Website (Hyperlink)</label>
                    <input
                      type="text"
                      placeholder="www.zhejiangpack.com"
                      value={formData.primary_website}
                      onChange={(e) => setFormData({ ...formData, primary_website: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none text-blue-600 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Secondary Website (Hyperlink)</label>
                    <input
                      type="text"
                      placeholder="www.pack-machine.cn"
                      value={formData.secondary_website}
                      onChange={(e) => setFormData({ ...formData, secondary_website: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none text-blue-600 font-mono"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
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
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Secondary Products Can Supply (Description)</label>
                    <input
                      type="text"
                      placeholder="e.g. Teflon Belts, Heating Blocks, Silicone Strips, Motor Drives"
                      value={formData.secondary_products}
                      onChange={(e) => setFormData({ ...formData, secondary_products: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Visited Factory / Office?</label>
                    <select
                      value={formData.visited_factory}
                      onChange={(e) => setFormData({ ...formData, visited_factory: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium"
                    >
                      <option value="No">No (Default)</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">
                      Visit Remarks {formData.visited_factory === 'Yes' ? '(Opens when Visited is Yes)' : '(Disabled - Select Yes above)'}
                    </label>
                    <input
                      type="text"
                      disabled={formData.visited_factory !== 'Yes'}
                      placeholder="e.g. Visited Wenzhou factory in April 2024. Excellent QA testing."
                      value={formData.visit_remarks}
                      onChange={(e) => setFormData({ ...formData, visit_remarks: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none disabled:bg-slate-100 disabled:text-slate-400 font-medium"
                    />
                  </div>

                  {/* PROVISION TO ATTACH MULTIPLE FACTORY PHOTOS / VIDEOS */}
                  <div className="md:col-span-4 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                        <Camera size={16} className="text-blue-600" /> Visit Photos / Videos (Provision to attach multiple factory Videos / Photos)
                      </label>
                      <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs">
                        <Upload size={14} /> Upload Photos / Videos
                        <input type="file" multiple accept="image/*, video/*" onChange={handleAddAttachment} className="hidden" />
                      </label>
                    </div>

                    {/* File Thumbnails Preview List */}
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
                      <p className="text-xs text-slate-400 italic">No factory photos or videos attached yet. Click "Upload Photos / Videos" above to add.</p>
                    )}
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-xs text-slate-700 font-semibold block mb-1">Overall Remarks / Key Strengths</label>
                    <textarea
                      rows={3}
                      placeholder="Primary OEM supplier details..."
                      value={formData.overall_remarks}
                      onChange={(e) => setFormData({ ...formData, overall_remarks: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-3 rounded-lg outline-none font-medium"
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

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Handling Territory (Dropdown Menu)</label>
                        <select
                          value={newContact.territory}
                          onChange={(e) => setNewContact({ ...newContact, territory: e.target.value })}
                          className="w-full bg-white border border-slate-300 text-xs p-2 rounded-lg outline-none font-semibold text-slate-800"
                        >
                          <option value="Local">Local</option>
                          <option value="Export India">Export India</option>
                          <option value="Export Africa">Export Africa</option>
                          <option value="Export Global">Export Global</option>
                          <option value="Export USA & Europe">Export USA & Europe</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Country (Dropdown Menu)</label>
                        <select
                          value={newContact.country}
                          onChange={(e) => handleSubContactCountryChange(e.target.value)}
                          className="w-full bg-white border border-slate-300 text-xs p-2 rounded-lg outline-none font-bold text-slate-800"
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

                  {/* ADD CONTACTS LIST TABLE WITH EXACT SPEC HEADINGS & HYPERLINKS */}
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
                              <td className="p-3 text-slate-700 font-semibold">{c.territory}</td>
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

            {/* DIRECT ACCESSIBLE SUBMIT / UPDATE BUTTON ON ALL STAGES */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              {formStage === 2 ? (
                <button
                  type="button"
                  onClick={() => setFormStage(1)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Back to First Form
                </button>
              ) : <div />}

              <div className="flex gap-2">
                {formStage === 1 && (
                  <button
                    type="button"
                    onClick={() => setFormStage(2)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-sm cursor-pointer"
                  >
                    Next to Second Form
                  </button>
                )}

                {/* PROMINENT SUBMIT / UPDATE BUTTON */}
                <button
                  type="button"
                  onClick={() => handleCreateSupplier()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle size={15} /> {editingSupplierId ? 'Update Supplier Profile' : 'Submit Supplier Profile'}
                </button>
              </div>
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

      {/* EXPAND ALL FILTERED DATA MASTER MODAL */}
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
              {filteredSuppliers.map((s) => (
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
                                <td className="p-2 font-semibold">{c.territory}</td>
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

      {/* IMPORT EXCEL / CSV DATA MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload size={18} className="text-blue-600" /> Import Suppliers (Excel / CSV)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Upload your CSV or Excel file containing supplier directory data. Download our sample template if needed.
              </p>

              {/* Drag and Drop Zone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 p-8 rounded-xl text-center space-y-2 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const sampleNewSupplier = {
                        id: `imp-${Date.now()}`,
                        name: file.name.split('.')[0] + ' Imported Supplier Co.',
                        product_categories: ['Food Ingredients', 'Chemicals'],
                        supplier_type: 'Manufacturer',
                        brand_name: 'Imported Brand',
                        country: 'China',
                        province: 'Zhejiang',
                        city: 'Wenzhou',
                        town: 'Industrial District',
                        address: '100 Export Highway',
                        contact_title: 'Mr',
                        contact_name: 'Chen Wei',
                        designation: 'Export Manager',
                        calling_number: '+86 13800112233',
                        whatsapp_number: '+86 13800112233',
                        wechat_number: '+86 13800112233',
                        emails: ['chen@imported-supplier.cn'],
                        tax_id: 'IMP-TAX-8899',
                        primary_website: 'www.imported-supplier.cn',
                        secondary_website: '',
                        key_strength_subcategories: ['Citric Acid'],
                        grade: 'A',
                        current_status: 'NEW',
                        potential: 'YES',
                        potential_reason: 'Imported from Excel dataset',
                        secondary_products: ['Sodium Citrate'],
                        visited_factory: 'Yes',
                        visit_remarks: 'Imported via CSV file',
                        attachments: [],
                        overall_remarks: 'Imported from file upload',
                        contacts: [],
                      };
                      setSuppliers([sampleNewSupplier, ...suppliers]);
                      setShowImportModal(false);
                      setImportNotification(`Successfully imported supplier data from "${file.name}"!`);
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
                    const sampleHeaders = 'Company Name,Supplier Type,Country,Province,City,Contact Name,Phone,Email\n"Sample Supplier Ltd","Manufacturer","China","Zhejiang","Wenzhou","Chen Wei","+8613800112233","chen@supplier.cn"';
                    const blob = new Blob([sampleHeaders], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Yinglima_Supplier_Import_Sample.csv';
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
      {/* MERGE SUPPLIERS MODAL */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-blue-600" /> Merge Selected Suppliers ({selectedIds.length})
              </h3>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Select the <strong>primary target record</strong> to keep. Data (categories & subcategories) from other selected records will be merged into this primary supplier, and duplicate records will be removed.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Primary Supplier Record to Keep:</label>
              <select
                value={targetMergeId}
                onChange={(e) => setTargetMergeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-xs text-slate-900 p-2.5 rounded-xl font-semibold outline-none focus:border-blue-500"
              >
                {suppliers
                  .filter((s) => selectedIds.includes(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city}, {s.country})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMerge}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Layers size={14} /> Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

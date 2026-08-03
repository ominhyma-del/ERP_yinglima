import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { inquiryApi } from '../../api/inquiryApi';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import { BulkDeleteModal, BulkDeleteResultLike } from '../../components/common/BulkDeleteModal';
import { useAuth } from '../../context/AuthContext';
import { can } from '../team/teamStore';
import { DuplicateToast, DuplicateNotification } from '../../components/common/DuplicateToast';
import { CsvImportModal, FieldSchema } from '../../components/common/CsvImportModal';

const inquiryFieldSchemas: FieldSchema[] = [
  { key: 'product_name', label: 'Product Name', required: true, aliases: ['product', 'item name', 'name'] },
  { key: 'consignment_code', label: 'Consignment Code', required: true, aliases: ['consignment', 'code', 'consignment code'] },
  { key: 'quantity', label: 'Quantity', aliases: ['qty', 'amount'] },
  { key: 'uom', label: 'UOM', aliases: ['unit'] },
  { key: 'brand_preference', label: 'Brand Preference', aliases: ['brand', 'brand preference'] },
  { key: 'product_specs', label: 'Product Specs', aliases: ['specs', 'specification'] },
];
import { Pagination } from '../../components/common/Pagination';

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
  // BUG FIX: this used to default to the hardcoded string 'FB1', which
  // fired GET /inquiries/layer2-grid/FB1 on first mount regardless of
  // whether a consignment with that code actually exists for the active
  // tenant — causing a guaranteed 400/404 on every fresh load. Start empty
  // and only set it once we know a real consignment code (see the
  // "select first loaded consignment" effect below).
  const [activeConsignmentCode, setActiveConsignmentCode] = useState<string>('');
  const [layer1Search, setLayer1Search] = useState<string>('');

  const [showRemarkModal, setShowRemarkModal] = useState<string | null>(null);
  const [showInquiryModal, setShowInquiryModal] = useState<'QUICK' | 'MAIN' | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [selectedItemsForTally, setSelectedItemsForTally] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user: currentUser } = useAuth();
  const canEdit = can(currentUser as any, 'inquiry', 'edit');
  const canDelete = can(currentUser as any, 'inquiry', 'delete');

  // User Role State (Admin sees all, User sees restricted)
  const [userRole] = useState<'ADMIN' | 'USER'>('ADMIN');
  const [loggedInCompany] = useState<string>('Inhyma Machinery & Trade (China HQ / India)');

  // 1ST LAYER SUMMARY: Company Consignments List (100% DB Driven)
  const [consignments, setConsignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2ND LAYER: Detailed Requirement Grid Line Items inside Consignment (100% DB Driven)
  const [gridItems, setGridItems] = useState<any[]>([]);

  // Fetch live consignments & items from NestJS API connected to Supabase DB on mount
  useEffect(() => {
    async function loadApiInquiries() {
      setIsLoading(true);
      const data = await inquiryApi.getConsignments();
      if (data && Array.isArray(data)) {
        setConsignments(data);
        // BUG FIX: only pick a consignment code once we actually know one
        // exists for this tenant, instead of assuming 'FB1' is always
        // present. Falls back to no selection (Layer 2 grid stays empty)
        // if the tenant has zero consignments yet.
        if (data.length > 0 && !data.some((c) => c.code === activeConsignmentCode)) {
          setActiveConsignmentCode(data[0].code);
        }
      }
      setIsLoading(false);
    }
    loadApiInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Layer 2 grid items from DB whenever consignment code or layer changes
  useEffect(() => {
    async function loadGridItems() {
      // BUG FIX: guard against firing with an empty/placeholder code before
      // the real consignment list has loaded (see effect above).
      if (!activeConsignmentCode) {
        setGridItems([]);
        return;
      }
      const items = await inquiryApi.getInquiryItems(activeConsignmentCode);
      if (items && Array.isArray(items)) {
        setGridItems(items);
      }
    }
    loadGridItems();
  }, [activeConsignmentCode, currentLayer]);

  // 10-Second Live Background Sync
  useEffect(() => {
    const syncTimer = setInterval(async () => {
      const data = await inquiryApi.getConsignments();
      if (data && Array.isArray(data)) {
        setConsignments(data);
      }
      if (activeConsignmentCode) {
        const items = await inquiryApi.getInquiryItems(activeConsignmentCode);
        if (items && Array.isArray(items)) {
          setGridItems(items);
        }
      }
    }, 10000);
    return () => clearInterval(syncTimer);
  }, [activeConsignmentCode]);

  // Filter & Sub-Tab States matching Darsh Impex
  const [showFilterPanel, setShowFilterPanel] = useState(false);
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
  const handleSaveInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name) {
      alert('Please select or type a Product Name.');
      return;
    }

    const isDuplicate = gridItems.some(
      (item) =>
        (item.consignment_code || '').toLowerCase() === (formData.consignment_code || '').toLowerCase() &&
        (item.product_name || '').toLowerCase() === (formData.product_name || '').toLowerCase()
    );

    if (isDuplicate) {
      setDuplicateToast({
        title: 'Duplicate Inquiry Entry Blocked',
        count: 1,
        items: [`${formData.consignment_code} - ${formData.product_name}`],
        message: `This product item already exists under consignment code "${formData.consignment_code}". Duplicates are not allowed.`,
      });
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

    try {
      const res = await inquiryApi.createInquiryItem(newItem);
      const updatedConsignments = await inquiryApi.getConsignments();
      if (updatedConsignments && Array.isArray(updatedConsignments)) {
        setConsignments(updatedConsignments);
      }
      const updatedGrid = await inquiryApi.getInquiryItems(formData.consignment_code);
      if (updatedGrid && Array.isArray(updatedGrid)) {
        setGridItems(updatedGrid);
      }
      setImportNotification(`Successfully added inquiry item "${newItem.product_name}" to consignment "${newItem.consignment_code}" in Supabase DB!`);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || '';
      if (errMsg.toLowerCase().includes('already exists') || err?.response?.status === 400 || err?.response?.status === 409) {
        setDuplicateToast({
          title: 'Duplicate Inquiry Blocked by Backend DB',
          count: 1,
          items: [`${formData.consignment_code} - ${formData.product_name}`],
          message: Array.isArray(errMsg) ? errMsg.join(', ') : errMsg || `Inquiry item already exists under consignment in Supabase DB.`,
        });
        return;
      }
    }

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

  // Layer 1 Sorting State
  const [l1SortField, setL1SortField] = useState<string | null>(null);
  const [l1SortDirection, setL1SortDirection] = useState<'asc' | 'desc'>('asc');

  const handleL1Sort = (field: string) => {
    if (l1SortField === field) {
      if (l1SortDirection === 'asc') setL1SortDirection('desc');
      else { setL1SortField(null); setL1SortDirection('asc'); }
    } else {
      setL1SortField(field);
      setL1SortDirection('asc');
    }
  };

  const sortedLayer1Consignments = useMemo(() => {
    if (!l1SortField) return filteredLayer1Consignments;
    return [...filteredLayer1Consignments].sort((a, b) => {
      let valA = a[l1SortField] ?? '';
      let valB = b[l1SortField] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return l1SortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return l1SortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLayer1Consignments, l1SortField, l1SortDirection]);

  // Layer 2 Sorting State
  const [l2SortField, setL2SortField] = useState<string | null>(null);
  const [l2SortDirection, setL2SortDirection] = useState<'asc' | 'desc'>('asc');

  const handleL2Sort = (field: string) => {
    if (l2SortField === field) {
      if (l2SortDirection === 'asc') setL2SortDirection('desc');
      else { setL2SortField(null); setL2SortDirection('asc'); }
    } else {
      setL2SortField(field);
      setL2SortDirection('asc');
    }
  };

  const sortedGridItems = useMemo(() => {
    if (!l2SortField) return activeGridItems;
    return [...activeGridItems].sort((a, b) => {
      let valA = a[l2SortField] ?? '';
      let valB = b[l2SortField] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return l2SortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return l2SortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeGridItems, l2SortField, l2SortDirection]);

  // Duplicate Toast State
  const [duplicateToast, setDuplicateToast] = useState<DuplicateNotification | null>(null);

  // Pagination State for Layer 1 Consignments (Max 100 per page)
  const [l1Page, setL1Page] = useState(1);
  const [l1PageSize, setL1PageSize] = useState(100);

  useEffect(() => {
    setL1Page(1);
  }, [layer1Search, activeCompanyFilter, subTab]);

  const paginatedLayer1Consignments = useMemo(() => {
    const startIndex = (l1Page - 1) * l1PageSize;
    return sortedLayer1Consignments.slice(startIndex, startIndex + l1PageSize);
  }, [sortedLayer1Consignments, l1Page, l1PageSize]);

  // Pagination State for Layer 2 Line Items (Max 100 per page)
  const [l2Page, setL2Page] = useState(1);
  const [l2PageSize, setL2PageSize] = useState(100);

  useEffect(() => {
    setL2Page(1);
  }, [searchTerm, activeConsignmentCode]);

  const paginatedGridItems = useMemo(() => {
    const startIndex = (l2Page - 1) * l2PageSize;
    return sortedGridItems.slice(startIndex, startIndex + l2PageSize);
  }, [sortedGridItems, l2Page, l2PageSize]);

  const renderL1SortHeader = (label: string, field: string) => {
    const isActive = l1SortField === field;
    return (
      <th
        onClick={() => handleL1Sort(field)}
        className="p-3.5 select-none cursor-pointer hover:bg-slate-200/70 transition-colors group"
      >
        <div className="flex items-center gap-1.5">
          <span className="p-0.5 text-slate-500">
            {isActive ? (
              l1SortDirection === 'asc' ? (
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

  const renderL2SortHeader = (label: string, field: string) => {
    const isActive = l2SortField === field;
    return (
      <th
        onClick={() => handleL2Sort(field)}
        className="p-3.5 select-none cursor-pointer hover:bg-slate-200/70 transition-colors group"
      >
        <div className="flex items-center gap-1.5">
          <span className="p-0.5 text-slate-500">
            {isActive ? (
              l2SortDirection === 'asc' ? (
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

  // Bulk selection & Merge State for Layer 1
  const [selectedL1Ids, setSelectedL1Ids] = useState<string[]>([]);
  const [showL1MergeModal, setShowL1MergeModal] = useState(false);
  const [targetL1MergeId, setTargetL1MergeId] = useState<string>('');

  const isAllL1Selected = sortedLayer1Consignments.length > 0 && sortedLayer1Consignments.every((c) => selectedL1Ids.includes(c.id));

  const toggleSelectAllL1 = () => {
    if (isAllL1Selected) {
      setSelectedL1Ids([]);
    } else {
      setSelectedL1Ids(sortedLayer1Consignments.map((c) => c.id));
    }
  };

  const toggleSelectOneL1 = (id: string) => {
    if (selectedL1Ids.includes(id)) {
      setSelectedL1Ids(selectedL1Ids.filter((i) => i !== id));
    } else {
      setSelectedL1Ids([...selectedL1Ids, id]);
    }
  };

  // BUG FIX: same defect as Supplier/Buyer bulk delete — this used to hide
  // rows locally with no rule check and no backend call at all. Now it
  // calls the real bulk-delete endpoint, which blocks any consignment
  // containing an Approved or already Tally-posted item, and surfaces
  // blocked ones via the Skip/Force popup.
  const [bulkDeleteResult, setBulkDeleteResult] = useState<BulkDeleteResultLike | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleBulkDeleteL1 = async () => {
    if (selectedL1Ids.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedL1Ids.length} selected consignment(s)?`)) return;

    setIsBulkDeleting(true);
    try {
      const result = await inquiryApi.bulkDeleteConsignments(selectedL1Ids);
      applyBulkDeleteOutcome(result);
    } catch (err: any) {
      setImportNotification(err?.response?.data?.message || 'Bulk delete failed. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const applyBulkDeleteOutcome = (result: BulkDeleteResultLike) => {
    const deletedIds = new Set(result.deleted.map((d) => d.id));
    setConsignments((prev) => prev.filter((c) => !deletedIds.has(c.id)));

    if (result.deleted.length > 0) {
      setImportNotification(`${result.deleted.length} consignment(s) deleted successfully.`);
    }

    if (result.blocked.length > 0) {
      setSelectedL1Ids(result.blocked.map((b) => b.id));
      setBulkDeleteResult(result);
    } else {
      setSelectedL1Ids([]);
      setBulkDeleteResult(null);
    }
  };

  const handleForceBulkDeleteL1 = async (blockedIds: string[]) => {
    setIsBulkDeleting(true);
    try {
      const result = await inquiryApi.bulkDeleteConsignments(blockedIds, { force: true, forceIds: blockedIds });
      applyBulkDeleteOutcome(result);
    } catch (err: any) {
      setImportNotification(err?.response?.data?.message || 'Force delete failed. Please try again.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Single-consignment delete: blocked if it contains any Approved or
  // Tally-posted item. On block, offer a force-delete confirmation
  // instead of silently failing or silently succeeding.
  const [consignmentDeleteWarning, setConsignmentDeleteWarning] = useState<{
    isOpen: boolean;
    id: string;
    code: string;
    message: string;
  }>({ isOpen: false, id: '', code: '', message: '' });

  const handleDeleteConsignment = async (id: string, code: string, force = false) => {
    if (!force && !confirm(`Are you sure you want to delete consignment "${code}" and all its inquiry items?`)) return;
    try {
      await inquiryApi.deleteConsignment(id, force);
      setConsignments((prev) => prev.filter((c) => c.id !== id));
      setImportNotification(`Consignment "${code}" deleted successfully.`);
      setTimeout(() => setImportNotification(null), 4000);
      setConsignmentDeleteWarning({ isOpen: false, id: '', code: '', message: '' });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Consignment cannot be deleted.';
      setConsignmentDeleteWarning({
        isOpen: true,
        id,
        code,
        message: Array.isArray(errMsg) ? errMsg.join('\n') : String(errMsg),
      });
    }
  };

  // Single line-item delete: blocked if the item is Approved or already
  // Tally-posted (see InquiryService.getItemDeleteBlockingReasons on the
  // backend). BUG FIX: previously had no try/catch, so a rejected delete
  // (or any other API error) still removed the row from local state right
  // after the un-awaited-for-errors call — same "optimistic without
  // rollback" defect as the old consignment/buyer handlers.
  const [itemDeleteWarning, setItemDeleteWarning] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    message: string;
  }>({ isOpen: false, id: '', name: '', message: '' });

  const handleDeleteInquiryItem = async (id: string, productName: string, force = false) => {
    if (!force && !confirm(`Are you sure you want to delete inquiry item "${productName}"?`)) return;
    try {
      await inquiryApi.deleteInquiryItem(id, force);
      setGridItems((prev) => prev.filter((g) => g.id !== id));
      setImportNotification(`Inquiry item "${productName}" deleted successfully.`);
      setTimeout(() => setImportNotification(null), 4000);
      setItemDeleteWarning({ isOpen: false, id: '', name: '', message: '' });
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Inquiry item cannot be deleted.';
      setItemDeleteWarning({
        isOpen: true,
        id,
        name: productName,
        message: Array.isArray(errMsg) ? errMsg.join('\n') : String(errMsg),
      });
    }
  };

  const handleOpenMergeL1 = () => {
    if (selectedL1Ids.length < 2) {
      alert('Please select at least 2 consignments to merge.');
      return;
    }
    setTargetL1MergeId(selectedL1Ids[0]);
    setShowL1MergeModal(true);
  };

  const handleExecuteMergeL1 = () => {
    if (!targetL1MergeId) return;
    const targetConsignment = consignments.find((c) => c.id === targetL1MergeId);
    if (!targetConsignment) return;

    setConsignments((prev) => prev.filter((c) => c.id === targetL1MergeId || !selectedL1Ids.includes(c.id)));
    setSelectedL1Ids([]);
    setShowL1MergeModal(false);
    setImportNotification(`Merged consignments into "${targetConsignment.code}".`);
  };

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

  const handleInquiryBatchImport = async (
    items: any[],
    options: { mode: 'CREATE' | 'MERGE' },
    onProgress?: (current: number, total: number, importedCount: number) => void,
    isAborted?: () => boolean
  ) => {
    let successCount = 0;
    const duplicates: any[] = [];
    const total = items.length;
    const CHUNK_SIZE = 25;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      if (isAborted && isAborted()) break;
      const chunk = items.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (item) => {
          if (isAborted && isAborted()) return;
          const isDup = gridItems.some(
            (g) =>
              (g.consignment_code || '').toLowerCase() === (item.consignment_code || activeConsignmentCode || 'FB1').toLowerCase() &&
              (g.product_name || '').toLowerCase() === (item.product_name || '').toLowerCase()
          );

          if (options.mode === 'CREATE') {
            if (isDup) {
              duplicates.push(item);
            } else {
              try {
                await inquiryApi.createInquiryItem({
                  company: loggedInCompany,
                  consignment_code: item.consignment_code || activeConsignmentCode || 'FB1',
                  product_name: item.product_name,
                  product_code: item.product_code || 'PRD-CUSTOM',
                  uom: item.uom || 'PCS',
                  quantity: item.quantity ? Number(item.quantity) : 100,
                  brand_preference: item.brand_preference || 'TTCA Brand Preferred',
                  product_specs: item.product_specs || 'Standard export packaging',
                  item_status: 'PROPOSED',
                });
                successCount++;
              } catch (e) {
                console.error('Failed to create imported inquiry row', e);
              }
            }
          } else if (options.mode === 'MERGE') {
            try {
              await inquiryApi.createInquiryItem({
                company: loggedInCompany,
                consignment_code: item.consignment_code || activeConsignmentCode || 'FB1',
                product_name: item.product_name,
                product_code: item.product_code || 'PRD-CUSTOM',
                uom: item.uom || 'PCS',
                quantity: item.quantity ? Number(item.quantity) : 100,
                brand_preference: item.brand_preference || 'TTCA Brand Preferred',
                product_specs: item.product_specs || 'Standard export packaging',
                item_status: 'PROPOSED',
              });
              successCount++;
            } catch (e) {
              console.error('Failed to create imported inquiry row', e);
            }
          }
        })
      );

      const processed = Math.min(i + CHUNK_SIZE, total);
      if (onProgress) {
        onProgress(processed, total, successCount);
      }
    }

    if (activeConsignmentCode) {
      const refreshed = await inquiryApi.getInquiryItems(activeConsignmentCode);
      if (refreshed && Array.isArray(refreshed)) {
        setGridItems(refreshed);
      }
    }
    return { successCount, duplicatesCount: duplicates.length, duplicateItems: duplicates };
  };

  return (
    <div className="space-y-6">
      {/* Upper-left Duplicate Notification Toast */}
      <DuplicateToast toast={duplicateToast} onClose={() => setDuplicateToast(null)} />

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
              ? 'Company-wise Summary & Aggregate Consignment Codes'
              : 'Excel-like Master Planning Sheet for Line Items, Quantities, License Alerts & Tally Post'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`p-2.5 rounded-lg border transition-all cursor-pointer ${showFilterPanel
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
            title="Toggle Filters Panel"
          >
            <Filter size={15} />
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
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <Filter size={14} className="text-blue-600" /> Top Filter Fields
                </span>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveCompanyFilter('ALL');
                  }}
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 normal-case cursor-pointer"
                >
                  <RotateCcw size={12} /> Reset Filters
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Company Filter</label>
                  <select
                    value={activeCompanyFilter}
                    onChange={(e) => setActiveCompanyFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="ALL">All Companies</option>
                    {Object.keys(companyConsignmentMasterMap).map((comp) => (
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Consignment Code</label>
                  <select
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="">All Consignment Codes</option>
                    <option value="FB1">FB1 (Uganda Shipment 1)</option>
                    <option value="FB2">FB2 (Uganda Shipment 2)</option>
                    <option value="OS1">OS1 (Uganda Shipment 1)</option>
                    <option value="ING1">ING1 (Gujarat Shipment 1)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Status</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PROPOSED">Proposed</option>
                    <option value="PARTIALLY_APPROVED">Partially Approved</option>
                    <option value="FULLY_APPROVED">Fully Approved</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE / INACTIVE SUB-TAB NAVIGATION MATCHING DARSH IMPEX */}
          <div className="flex items-center border-b border-slate-200 px-1 gap-8 text-xs font-bold pt-2">
            <button
              onClick={() => setSubTab('Active')}
              className={`pb-3 border-b-2 transition-all cursor-pointer ${subTab === 'Active'
                  ? 'border-blue-600 text-blue-600 font-extrabold text-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              Active
            </button>
            <button
              onClick={() => setSubTab('Inactive')}
              className={`pb-3 border-b-2 transition-all cursor-pointer ${subTab === 'Inactive'
                  ? 'border-blue-600 text-blue-600 font-extrabold text-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              Inactive
            </button>
          </div>
          {/* SEARCH FILTER */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-80 flex items-center">
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

          {/* BULK ACTION BAR LAYER 1 */}
          {selectedL1Ids.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-blue-900">
                <CheckCircle size={16} className="text-blue-600" />
                <span>{selectedL1Ids.length} consignment(s) selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenMergeL1}
                  disabled={selectedL1Ids.length < 2}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Layers size={14} /> Merge Selected ({selectedL1Ids.length})
                </button>
                <button
                  onClick={handleBulkDeleteL1}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 size={14} /> Delete Selected ({selectedL1Ids.length})
                </button>
                <button
                  onClick={() => setSelectedL1Ids([])}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* 1ST LAYER COLUMNS IN LIST TABLE MATCHING SPEC */}
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3.5 text-center w-10">
                          <input
                            type="checkbox"
                            checked={isAllL1Selected}
                            onChange={toggleSelectAllL1}
                            className="rounded border-slate-300 cursor-pointer w-4 h-4"
                          />
                        </th>
                        {renderL1SortHeader('Inquiry By (Buyer Company Name)', 'company')}
                        {renderL1SortHeader('Inquiry Consignment Code', 'code')}
                        {renderL1SortHeader('Status', 'status')}
                        {renderL1SortHeader('Total CBM (m³)', 'total_cbm')}
                        {renderL1SortHeader('Total Gross Weight (kg)', 'total_weight')}
                        {renderL1SortHeader('Date & Proposed By', 'proposed_date')}
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {paginatedLayer1Consignments.map((item) => (
                      <tr key={item.id} className={`transition-colors ${selectedL1Ids.includes(item.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}>
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedL1Ids.includes(item.id)}
                            onChange={() => toggleSelectOneL1(item.id)}
                            className="rounded border-slate-300 cursor-pointer w-4 h-4"
                          />
                        </td>
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
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${item.status === 'FULLY_APPROVED'
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

                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setActiveConsignmentCode(item.code);
                              setCurrentLayer(2);
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> View Details (2nd Layer)
                          </button>
                          <button
                            onClick={() => handleDeleteConsignment(item.id, item.code)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                            title="Delete Consignment"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PAGINATION FOOTER CONTROL LAYER 1 */}
            <Pagination
              currentPage={l1Page}
              totalItems={sortedLayer1Consignments.length}
              pageSize={l1PageSize}
              onPageChange={setL1Page}
              onPageSizeChange={setL1PageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        )}
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
                    {renderL2SortHeader('Product Name', 'product_name')}
                    {renderL2SortHeader('Quantity (Editable)', 'quantity')}
                    {renderL2SortHeader('UOM', 'uom')}
                    {renderL2SortHeader('Brand Preference', 'brand_preference')}
                    {renderL2SortHeader('Computed CBM', 'unit_cbm')}
                    {renderL2SortHeader('Computed Weight', 'gross_weight')}
                    {renderL2SortHeader('Status', 'item_status')}
                    {renderL2SortHeader('Tally Entry Posted?', 'tally_post_status')}
                    {renderL2SortHeader('China Procurement Remarks', 'procurement_remarks')}
                    <th className="p-3.5 text-right">Shift Consignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedGridItems.length > 0 ? (
                    paginatedGridItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`transition-colors ${item.license_warning
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
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${item.item_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
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
                            className={`px-2.5 py-1 rounded font-bold text-[10px] cursor-pointer ${item.tally_post_status === 'POSTED'
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

                        {/* Action: Shift Consignment + Delete Item */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
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

                            <button
                              onClick={() => handleDeleteInquiryItem(item.id, item.product_name)}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
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

            {/* PAGINATION FOOTER CONTROL LAYER 2 */}
            <Pagination
              currentPage={l2Page}
              totalItems={sortedGridItems.length}
              pageSize={l2PageSize}
              onPageChange={setL2Page}
              onPageSizeChange={setL2PageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
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

              {/* Product Name from Masters with datalist suggestions */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.product_name}
                  onChange={(e) => handleProductNameChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none font-medium cursor-pointer focus:border-blue-500 focus:bg-white"
                  required
                >
                  <option value="">Select Product...</option>
                  {masterProductOptions.map((p) => (
                    <option key={p.code} value={p.name}>
                      {p.name}
                    </option>
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
      <CsvImportModal
        isOpen={showImportModal}
        title="Import Inquiry Requirements (CSV / Excel)"
        entityName="Inquiry Item"
        fieldSchemas={inquiryFieldSchemas}
        onClose={() => setShowImportModal(false)}
        onImportItems={handleInquiryBatchImport}
        onComplete={(msg) => {
          setImportNotification(msg);
          setTimeout(() => setImportNotification(null), 5000);
        }}
      />
      {/* MERGE CONSIGNMENTS MODAL */}
      {showL1MergeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-blue-600" /> Merge Selected Consignments ({selectedL1Ids.length})
              </h3>
              <button onClick={() => setShowL1MergeModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Select the <strong>primary consignment record</strong> to keep. The line items from other selected consignments will be merged into this primary consignment.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Primary Consignment to Keep:</label>
              <select
                value={targetL1MergeId}
                onChange={(e) => setTargetL1MergeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-xs text-slate-900 p-2.5 rounded-xl font-semibold outline-none focus:border-blue-500"
              >
                {consignments
                  .filter((c) => selectedL1Ids.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} ({c.company})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowL1MergeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMergeL1}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Layers size={14} /> Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE CONSIGNMENT DELETE BLOCKED WARNING (Approved/Tally-posted items) */}
      {consignmentDeleteWarning.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-600" /> Deletion Blocked: {consignmentDeleteWarning.code}
              </h3>
              <button
                onClick={() => setConsignmentDeleteWarning({ isOpen: false, id: '', code: '', message: '' })}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-line font-medium">{consignmentDeleteWarning.message}</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConsignmentDeleteWarning({ isOpen: false, id: '', code: '', message: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Keep It
              </button>
              <button
                onClick={() => handleDeleteConsignment(consignmentDeleteWarning.id, consignmentDeleteWarning.code, true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Force Delete Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE ITEM DELETE BLOCKED WARNING (Approved/Tally-posted) */}
      {itemDeleteWarning.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-600" /> Deletion Blocked: {itemDeleteWarning.name}
              </h3>
              <button
                onClick={() => setItemDeleteWarning({ isOpen: false, id: '', name: '', message: '' })}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-line font-medium">{itemDeleteWarning.message}</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setItemDeleteWarning({ isOpen: false, id: '', name: '', message: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Keep It
              </button>
              <button
                onClick={() => handleDeleteInquiryItem(itemDeleteWarning.id, itemDeleteWarning.name, true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Force Delete Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE SKIP/FORCE POPUP (Layer 1 consignments) */}
      {bulkDeleteResult && bulkDeleteResult.blocked.length > 0 && (
        <BulkDeleteModal
          entityLabel="consignment"
          result={bulkDeleteResult}
          isProcessing={isBulkDeleting}
          onCancel={() => {
            setBulkDeleteResult(null);
            setSelectedL1Ids([]);
          }}
          onForceDelete={handleForceBulkDeleteL1}
        />
      )}
    </div>
  );
};
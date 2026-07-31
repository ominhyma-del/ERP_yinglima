import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Package, Plus, Filter, AlertTriangle, ShieldAlert, ArrowLeft,
  Download, Upload, FileSpreadsheet, X, CheckCircle, Lock, Search,
  Eye, Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw,
  Tags, Layers, Bookmark, Image as ImageIcon, FileText, Bold,
  Italic, List, Table2, Info, Clock, User, Calendar, Settings,
  GripVertical, ListChecks, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown,
} from 'lucide-react';
import { useBulkSelect } from './useBulkSelect';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import {
  DEFAULT_FIELD_CONFIG, FieldOverrideMap, loadFieldOverrides,
  saveFieldOverrides, getEffectiveFields, FieldDef,
} from './fieldConfig';
import { productApi } from '../../api/productApi';

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = 'ACTIVE' | 'INACTIVE';
type TopTab = 'products' | 'categories' | 'subcategories' | 'brands';

interface AuditEntry { action: string; user: string; date: string; }

interface Product {
  id: string;
  name_tally: string;
  name_invoice: string;
  product_code: string;
  category: string;
  subcategory: string;
  brand: string;
  hsn_code: string;
  vat_refund_pct: number;
  license_remarks: string;
  uom: string;
  status: Status;
  pkg_quantity: number;
  pkg_net_weight: number;
  pkg_gross_weight: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  pkg_cbm: string;
  specifications: string;
  current_stock: number;
  created_by: string;
  created_date: string;
  modified_by: string;
  modified_date: string;
  audit: AuditEntry[];
}

interface Category { id: string; name: string; status: Status; }
interface SubCategoryRow { id: string; name: string; categoryId: string; category: string; status: Status; }
interface BrandRow { id: string; name: string; status: Status; }
interface HsnCode { code: string; description: string; vat_refund: number; }

const HSN_DATA: HsnCode[] = [
  { code: '84223000', description: 'Packaging / wrapping machinery', vat_refund: 13.0 },
  { code: '29181400', description: 'Citric Acid Anhydrous', vat_refund: 10.0 },
  { code: '28151100', description: 'Caustic Soda (Sodium Hydroxide)', vat_refund: 13.0 },
  { code: '28276000', description: 'Potassium Iodide', vat_refund: 9.0 },
];

const UOM_LIST = ['PCS', 'KG', 'MT', 'LTR', 'BAG', 'CTN', 'SET', 'ROL', 'SQM'];

const calcCBM = (l: number, w: number, h: number) => ((l * w * h) / 1_000_000).toFixed(6);
const now = () => new Date().toISOString().replace('T', ' ').substring(0, 16);

// ─── Initial data (mock — no backend wired yet, so this seeds state only) ────

// ─── Initial data (100% DB driven) ────
const INIT_CATEGORIES: Category[] = [];
const INIT_SUBCATS: SubCategoryRow[] = [];
const INIT_BRANDS: BrandRow[] = [];
const INIT_PRODUCTS: Product[] = [];

// ─── Small shared UI bits ──────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold border
      ${type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
      {type === 'success' ? <CheckCircle size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-rose-600" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  );
}

function ConfirmDialog({ msg, onConfirm, onCancel, danger = true }: { msg: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className={`${danger ? 'text-rose-500' : 'text-amber-500'} flex-shrink-0 mt-0.5`} />
          <p className="text-sm text-slate-700 font-medium">{msg}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button onClick={onCancel} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-white text-xs font-semibold rounded-lg cursor-pointer ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

/** Tri-state header checkbox for "select all" */
function HeaderCheckbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="rounded cursor-pointer w-3.5 h-3.5" />;
}

/** Floating bulk-action bar shown once >=1 row selected, Bitrix24-style */
function BulkActionBar({
  count, onClear, onActivate, onDeactivate, onDelete, onMerge, deleteDisabled, deleteTitle,
}: {
  count: number;
  onClear: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onDelete: () => void;
  onMerge?: () => void;
  deleteDisabled?: boolean;
  deleteTitle?: string;
}) {
  if (count === 0) return null;
  return (
    <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-between text-xs shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="flex items-center gap-2 font-medium">
        <CheckCircle size={15} className="text-emerald-400" />
        <span>{count} item{count !== 1 ? 's' : ''} selected</span>
        <span className="text-slate-500">|</span>
        <button onClick={onClear} className="underline opacity-80 hover:opacity-100 cursor-pointer font-normal">Clear</button>
      </div>
      <div className="flex items-center gap-2">
        {onMerge && (
          <button onClick={onMerge} disabled={count < 2} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg cursor-pointer transition-colors flex items-center gap-1 font-bold text-white">
            <Layers size={12} /> Merge Selected
          </button>
        )}
        {onActivate && (
          <button onClick={onActivate} className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg cursor-pointer transition-colors">Set Active</button>
        )}
        {onDeactivate && (
          <button onClick={onDeactivate} className="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg cursor-pointer transition-colors">Set Inactive</button>
        )}
        <button onClick={onDelete} disabled={deleteDisabled} title={deleteTitle}
          className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5
            ${deleteDisabled ? 'bg-white/10 opacity-50 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-400'}`}>
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}

function QuickCreateModal({
  type, categories, onSave, onClose,
}: {
  type: 'CATEGORY' | 'SUBCATEGORY' | 'BRAND';
  categories: Category[];
  onSave: (name: string, extra?: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [catId, setCatId] = useState(categories[0]?.id ?? '');
  const [err, setErr] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Name is required.'); return; }
    onSave(name.trim(), catId);
  };
  const title = type === 'CATEGORY' ? 'New Category' : type === 'SUBCATEGORY' ? 'New Sub Category' : 'New Brand';
  const Icon = type === 'CATEGORY' ? Tags : type === 'SUBCATEGORY' ? Layers : Bookmark;
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white border border-slate-200 p-5 rounded-2xl w-full max-w-sm shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Icon size={16} className="text-blue-600" /> {title}
          </h4>
          <button type="button" onClick={onClose} className="p-1 bg-slate-100 rounded text-slate-500 hover:text-slate-900 cursor-pointer"><X size={14} /></button>
        </div>
        {type === 'SUBCATEGORY' && (
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Parent Category <span className="text-rose-500">*</span></label>
            <select value={catId} onChange={e => setCatId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
              {categories.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Name <span className="text-rose-500">*</span></label>
          <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder={`Enter ${title.toLowerCase()} name`}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {err && <p className="text-xs text-rose-600 mt-1">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
          <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 cursor-pointer">Save</button>
        </div>
      </form>
    </div>
  );
}

function SpecsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (pre: string, suf: string) => {
    const el = ref.current; if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const selected = value.slice(s, e) || 'text';
    const newVal = value.slice(0, s) + pre + selected + suf + value.slice(e);
    onChange(newVal);
    setTimeout(() => { el.setSelectionRange(s + pre.length, s + pre.length + selected.length); el.focus(); }, 0);
  };
  const btn = (icon: React.ReactNode, title: string, fn: () => void) => (
    <button type="button" title={title} onClick={fn} className="p-1.5 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
      {icon}
    </button>
  );
  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 border-b border-slate-200">
        {btn(<Bold size={13} />, 'Bold', () => wrap('<b>', '</b>'))}
        {btn(<Italic size={13} />, 'Italic', () => wrap('<i>', '</i>'))}
        {btn(<List size={13} />, 'Bullet', () => onChange(value + '\n• '))}
        {btn(<span className="text-[11px] font-bold">1.</span>, 'Numbered', () => onChange(value + '\n1. '))}
        {btn(<Table2 size={13} />, 'Table row', () => onChange(value + '\n| Col1 | Col2 | Col3 |'))}
      </div>
      <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} rows={8}
        placeholder="Enter product specifications (supports basic HTML like <b>Motor:</b> 220V/50Hz)"
        className="w-full px-3 py-2.5 text-xs text-slate-800 outline-none resize-y font-mono" />
    </div>
  );
}

// ─── Manage Fields Panel ────────────────────────────────────────────────────

function ManageFieldsPanel({
  overrides, onChange, onClose,
}: {
  overrides: FieldOverrideMap;
  onChange: (o: FieldOverrideMap) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<FieldOverrideMap>(overrides);
  const fields = getEffectiveFields(local);
  const grouped = {
    general: fields.filter(f => f.tab === 'general'),
    packaging: fields.filter(f => f.tab === 'packaging'),
    specs: fields.filter(f => f.tab === 'specs'),
    docs: fields.filter(f => f.tab === 'docs'),
  };
  const tabLabel: Record<string, string> = { general: 'General', packaging: 'Packaging', specs: 'Specifications', docs: 'Images & Docs' };

  const setVisible = (key: string, visible: boolean) => {
    setLocal(prev => ({ ...prev, [key]: { visible, required: prev[key]?.required } }));
  };
  const setRequired = (key: string, required: boolean) => {
    setLocal(prev => ({ ...prev, [key]: { visible: prev[key]?.visible ?? true, required } }));
  };
  const resetAll = () => setLocal({});
  const save = () => { onChange(local); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Settings size={17} className="text-blue-600" /> Manage Product Form Fields
          </h3>
          <button onClick={onClose} className="p-1 bg-slate-100 rounded text-slate-500 hover:text-slate-900 cursor-pointer"><X size={16} /></button>
        </div>

        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-800 flex items-start gap-2">
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <span>Toggle which fields appear on the Add/Edit Product form and whether they're required. Core fields (Product Name, Code, Category, HSN, etc.) can't be removed since the system depends on them, but everything else is fully customizable. Hiding a field never deletes existing product data — it just isn't shown on the form.</span>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
          {(['general', 'packaging', 'specs', 'docs'] as const).map(tabKey => (
            <div key={tabKey}>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{tabLabel[tabKey]}</h4>
              <div className="space-y-1.5">
                {grouped[tabKey].map(f => (
                  <div key={f.key} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <GripVertical size={13} className="text-slate-300" />
                      <span className={`text-xs font-medium ${f.visible ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{f.label}</span>
                      {f.core && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-bold">CORE</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none">
                        <input type="checkbox" checked={f.required} disabled={f.core} onChange={e => setRequired(f.key, e.target.checked)} className="rounded cursor-pointer disabled:cursor-not-allowed" />
                        Required
                      </label>
                      <button
                        onClick={() => !f.core && setVisible(f.key, !f.visible)}
                        disabled={f.core}
                        title={f.core ? 'Core fields are always visible' : f.visible ? 'Click to hide' : 'Click to show'}
                        className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40
                          ${f.visible ? 'bg-blue-600' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${f.visible ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <button onClick={resetAll} className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer">Reset to defaults</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer">Cancel</button>
            <button onClick={save} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer">Save Field Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export const ProductMasterPage: React.FC = () => {
  const IS_ADMIN = true;

  const [topTab, setTopTab] = useState<TopTab>('products');

  // Master data (shared across the 4 tabs)
  const [categories, setCategories] = useState<Category[]>(INIT_CATEGORIES);
  const [subcats, setSubcats] = useState<SubCategoryRow[]>(INIT_SUBCATS);
  const [brands, setBrands] = useState<BrandRow[]>(INIT_BRANDS);
  const [products, setProducts] = useState<Product[]>(INIT_PRODUCTS);

  // Field customization
  const [fieldOverrides, setFieldOverrides] = useState<FieldOverrideMap>(() => loadFieldOverrides());
  const [showManageFields, setShowManageFields] = useState(false);
  const effectiveFields = useMemo(() => getEffectiveFields(fieldOverrides), [fieldOverrides]);
  const isFieldVisible = (key: string) => effectiveFields.find(f => f.key === key)?.visible ?? true;
  const isFieldRequired = (key: string) => effectiveFields.find(f => f.key === key)?.required ?? false;

  useEffect(() => { saveFieldOverrides(fieldOverrides); }, [fieldOverrides]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadApiProducts() {
      setIsLoading(true);
      const data = await productApi.getProducts();
      if (data && Array.isArray(data)) {
        setProducts(data);
      }
      setIsLoading(false);
    }
    loadApiProducts();
  }, []);

  // Shared toast / alerts
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });
  const [ruleAlert, setRuleAlert] = useState<string | null>(null);

  // ── Product view state ──────────────────────────────────────────────────
  const [prodView, setProdView] = useState<'list' | 'detail' | 'add' | 'edit'>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'packaging' | 'specs' | 'docs'>('general');
  const [statusFilterTab, setStatusFilterTab] = useState<Status>('ACTIVE');

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSubCat, setFilterSubCat] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterHSN, setFilterHSN] = useState('');
  const [filterUOM, setFilterUOM] = useState('');

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);
  const [quickCreate, setQuickCreate] = useState<'CATEGORY' | 'SUBCATEGORY' | 'BRAND' | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showImpExpDropdown, setShowImpExpDropdown] = useState(false);
  const [importReport, setImportReport] = useState<{ added: string[]; skipped: string[] } | null>(null);

  const [showProductMergeModal, setShowProductMergeModal] = useState(false);
  const [targetProductMergeId, setTargetProductMergeId] = useState<string>('');

  const fileRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  const emptyForm = () => ({
    name_tally: '', name_invoice: '', product_code: '',
    category: categories.find(c => c.status === 'ACTIVE')?.name ?? '',
    subcategory: subcats.find(s => s.status === 'ACTIVE')?.name ?? '',
    brand: brands.find(b => b.status === 'ACTIVE')?.name ?? '',
    hsn_code: '84223000', vat_refund_pct: 13.0, license_remarks: '',
    uom: 'PCS', status: 'ACTIVE' as Status,
    pkg_quantity: 1, pkg_net_weight: 0, pkg_gross_weight: 0,
    length_cm: 0, width_cm: 0, height_cm: 0,
    specifications: '',
  });
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const computedCBM = calcCBM(form.length_cm, form.width_cm, form.height_cm);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(p => {
      if (p.status !== statusFilterTab) return false;
      if (q && !p.name_tally.toLowerCase().includes(q) && !p.product_code.toLowerCase().includes(q) && !p.name_invoice.toLowerCase().includes(q)) return false;
      if (filterCat && p.category !== filterCat) return false;
      if (filterSubCat && p.subcategory !== filterSubCat) return false;
      if (filterBrand && p.brand !== filterBrand) return false;
      if (filterHSN && p.hsn_code !== filterHSN) return false;
      if (filterUOM && p.uom !== filterUOM) return false;
      return true;
    });
  }, [products, search, filterCat, filterSubCat, filterBrand, filterHSN, filterUOM, statusFilterTab]);

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

  const sortedFiltered = useMemo(() => {
    if (!sortField) return filtered;
    return [...filtered].sort((a: any, b: any) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const paginated = sortedFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderSortHeader = (label: string, field: string) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className="p-3 font-bold text-slate-500 uppercase tracking-wider select-none cursor-pointer hover:bg-slate-200/70 transition-colors group"
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
  const bulkProducts = useBulkSelect(paginated);

  const selectedProductIds = Array.from(bulkProducts.selected);

  const handleOpenProductMerge = () => {
    if (selectedProductIds.length < 2) {
      alert('Please select at least 2 products to merge.');
      return;
    }
    setTargetProductMergeId(selectedProductIds[0]);
    setShowProductMergeModal(true);
  };

  const handleExecuteProductMerge = () => {
    if (!targetProductMergeId) return;
    const targetProduct = products.find((p) => p.id === targetProductMergeId);
    if (!targetProduct) return;

    setProducts((prev) => prev.filter((p) => p.id === targetProductMergeId || !selectedProductIds.includes(p.id)));
    bulkProducts.clear();
    setShowProductMergeModal(false);
    setToast({ msg: `Merged products into "${targetProduct.name_tally}".`, type: 'success' });
  };

  useEffect(() => setPage(1), [search, filterCat, filterSubCat, filterBrand, filterHSN, filterUOM, statusFilterTab]);
  useEffect(() => { bulkProducts.clear(); }, [page, statusFilterTab]);

  // ── Status toggle / delete (single) ───────────────────────────────────────

  const handleToggleStatus = (id: string) => {
    const p = products.find(x => x.id === id)!;
    if (p.status === 'ACTIVE' && p.current_stock > 0) {
      setRuleAlert(`Cannot deactivate "${p.name_tally}" — current stock is ${p.current_stock}. Stock must be 0 first.`);
      return;
    }
    setProducts(prev => prev.map(x => x.id === id
      ? { ...x, status: x.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', modified_by: 'Admin', modified_date: now(), audit: [...x.audit, { action: x.status === 'ACTIVE' ? 'Deactivated' : 'Reactivated', user: 'Admin', date: now() }] }
      : x));
    showToast('Product status updated.');
  };

  const handleDeleteRequest = (id: string) => {
    if (!IS_ADMIN) { setRuleAlert('Only Admin users can delete products.'); return; }
    const p = products.find(x => x.id === id)!;
    if (p.status !== 'INACTIVE') { setRuleAlert(`"${p.name_tally}" must be set to INACTIVE before deletion.`); return; }
    if (p.current_stock > 0) { setRuleAlert(`"${p.name_tally}" has stock of ${p.current_stock}. Cannot delete.`); return; }
    setConfirmDel(id);
  };

  const confirmDelete = () => {
    if (!confirmDel) return;
    setProducts(prev => prev.filter(x => x.id !== confirmDel));
    setConfirmDel(null);
    showToast('Product deleted successfully.');
  };

  // ── Bulk actions (products) ───────────────────────────────────────────────

  const bulkSetStatus = (status: Status) => {
    const ids = bulkProducts.selected;
    if (status === 'INACTIVE') {
      const blocked = products.filter(p => ids.has(p.id) && p.current_stock > 0);
      if (blocked.length > 0) {
        setRuleAlert(`${blocked.length} selected product(s) still have stock and cannot be deactivated: ${blocked.map(p => p.name_tally).join(', ')}`);
        return;
      }
    }
    setProducts(prev => prev.map(p => ids.has(p.id)
      ? { ...p, status, modified_by: 'Admin', modified_date: now(), audit: [...p.audit, { action: status === 'ACTIVE' ? 'Reactivated (bulk)' : 'Deactivated (bulk)', user: 'Admin', date: now() }] }
      : p));
    showToast(`${ids.size} product(s) updated to ${status}.`);
    bulkProducts.clear();
  };

  const bulkDeletable = useMemo(() => {
    return [...bulkProducts.selected].every(id => {
      const p = products.find(x => x.id === id);
      return p && p.status === 'INACTIVE' && p.current_stock === 0;
    });
  }, [bulkProducts.selected, products]);

  const confirmBulkDelete = () => {
    setProducts(prev => prev.filter(p => !bulkProducts.selected.has(p.id)));
    showToast(`${bulkProducts.selectedCount} product(s) deleted.`);
    bulkProducts.clear();
    setConfirmBulkDel(false);
  };

  // ── Form logic ─────────────────────────────────────────────────────────

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (isFieldVisible('name_tally') && !form.name_tally.trim()) errs.name_tally = 'Product Name (Tally) is required.';
    if (isFieldVisible('product_code') && !form.product_code.trim()) errs.product_code = 'Product Code is required.';
    if (isFieldVisible('category') && !form.category) errs.category = 'Category is required.';
    if (isFieldVisible('subcategory') && !form.subcategory) errs.subcategory = 'Sub Category is required.';
    if (isFieldVisible('brand') && !form.brand) errs.brand = 'Brand is required.';
    if (isFieldVisible('hsn_code') && !form.hsn_code) errs.hsn_code = 'HSN Code is required.';
    const dup = products.find(p =>
      p.id !== editingId &&
      p.name_tally.toLowerCase() === form.name_tally.trim().toLowerCase() &&
      p.product_code.toLowerCase() === form.product_code.trim().toLowerCase()
    );
    if (dup) errs.dup = `Duplicate: a product with the same Name + Code already exists (${dup.product_code}).`;
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openAdd = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormErrors({});
    setActiveFormTab('general');
    setSuggestions([]);
    setProdView('add');
  };

  const openEdit = (p: Product) => {
    setForm({
      name_tally: p.name_tally, name_invoice: p.name_invoice, product_code: p.product_code,
      category: p.category, subcategory: p.subcategory, brand: p.brand,
      hsn_code: p.hsn_code, vat_refund_pct: p.vat_refund_pct, license_remarks: p.license_remarks,
      uom: p.uom, status: p.status,
      pkg_quantity: p.pkg_quantity, pkg_net_weight: p.pkg_net_weight, pkg_gross_weight: p.pkg_gross_weight,
      length_cm: p.length_cm, width_cm: p.width_cm, height_cm: p.height_cm,
      specifications: p.specifications,
    });
    setEditingId(p.id);
    setFormErrors({});
    setActiveFormTab('general');
    setSuggestions([]);
    setProdView('edit');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (editingId) {
      setProducts(prev => prev.map(p => p.id === editingId ? {
        ...p, ...form, pkg_cbm: computedCBM, modified_by: 'Admin', modified_date: now(),
        audit: [...p.audit, { action: 'Updated', user: 'Admin', date: now() }],
      } : p));
      showToast('Product updated successfully.');
    } else {
      const newP: Product = {
        id: `p${Date.now()}`, ...form, pkg_cbm: computedCBM,
        current_stock: 0, created_by: 'Admin', created_date: now(),
        modified_by: 'Admin', modified_date: now(),
        audit: [{ action: 'Created', user: 'Admin', date: now() }],
      };
      setProducts(prev => [newP, ...prev]);
      showToast('Product created successfully.');
    }
    setProdView('list');
  };

  const handleHsnChange = (code: string) => {
    const hsn = HSN_DATA.find(h => h.code === code);
    setForm(f => ({ ...f, hsn_code: code, vat_refund_pct: hsn ? hsn.vat_refund : f.vat_refund_pct }));
  };

  const handleNameInput = (val: string) => {
    setForm(f => ({ ...f, name_tally: val }));
    if (val.length > 2) {
      const q = val.toLowerCase();
      setSuggestions(products.filter(p => p.id !== editingId && (p.name_tally.toLowerCase().includes(q) || p.product_code.toLowerCase().includes(q))).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const handleQuickSave = (name: string, extra?: string) => {
    if (quickCreate === 'CATEGORY') {
      const id = `c${Date.now()}`;
      setCategories(prev => [...prev, { id, name, status: 'ACTIVE' }]);
      setForm(f => ({ ...f, category: name }));
    } else if (quickCreate === 'SUBCATEGORY') {
      const id = `s${Date.now()}`;
      const cat = categories.find(c => c.id === extra);
      setSubcats(prev => [...prev, { id, name, categoryId: extra ?? '', category: cat?.name ?? '', status: 'ACTIVE' }]);
      setForm(f => ({ ...f, subcategory: name }));
    } else if (quickCreate === 'BRAND') {
      const id = `b${Date.now()}`;
      setBrands(prev => [...prev, { id, name, status: 'ACTIVE' }]);
      setForm(f => ({ ...f, brand: name }));
    }
    setQuickCreate(null);
    showToast(`${quickCreate?.toLowerCase() ?? 'record'} created.`);
  };

  const handleExport = () => {
    const headers = ['Product Name (Tally)', 'Product Name (Invoice)', 'Product Code', 'Category', 'Sub Category', 'Brand', 'HSN Code', 'VAT Refund %', 'UOM', 'Pkg Qty', 'Pkg Gross Wt (kg)', 'Pkg CBM (m³)', 'Status'];
    const rows = products.map(p => [
      p.name_tally, p.name_invoice, p.product_code, p.category, p.subcategory, p.brand,
      p.hsn_code, p.vat_refund_pct, p.uom, p.pkg_quantity, p.pkg_gross_weight, p.pkg_cbm, p.status
    ].map(v => `"${v}"`));
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `Yinglima_Products_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Products exported successfully.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split(/\r?\n/);
      if (lines.length <= 1) return;
      
      const addedList: string[] = [];
      const skippedList: string[] = [];
      const importedProducts: Product[] = [];
      
      // Parse header to map columns
      const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
      
      // Index mapping helper
      const getIndex = (name: string) => headers.findIndex(h => h.includes(name));
      const idxTally = getIndex('tally') >= 0 ? getIndex('tally') : 0;
      const idxInvoice = getIndex('invoice') >= 0 ? getIndex('invoice') : 1;
      const idxCode = getIndex('code') >= 0 ? getIndex('code') : 2;
      const idxCategory = getIndex('category') >= 0 ? getIndex('category') : 3;
      const idxSub = getIndex('sub') >= 0 ? getIndex('sub') : 4;
      const idxBrand = getIndex('brand') >= 0 ? getIndex('brand') : 5;
      const idxHsn = getIndex('hsn') >= 0 ? getIndex('hsn') : 6;
      const idxRefund = getIndex('refund') >= 0 ? getIndex('refund') : 7;
      const idxUom = getIndex('uom') >= 0 ? getIndex('uom') : 8;
      const idxQty = getIndex('qty') >= 0 ? getIndex('qty') : 9;
      const idxGross = getIndex('gross') >= 0 ? getIndex('gross') : 10;
      const idxCbm = getIndex('cbm') >= 0 ? getIndex('cbm') : 11;
      const idxStatus = getIndex('status') >= 0 ? getIndex('status') : 12;
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV splitter that respects quoted strings
        const cols: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cols.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        cols.push(cur.trim());
        
        if (cols.length < 3 || !cols[idxTally]) continue;
        
        const nameTally = cols[idxTally].replace(/^"|"$/g, '');
        const prodCode = (cols[idxCode] || `PRD-MC-${Date.now()}-${i}`).replace(/^"|"$/g, '');
        
        const dup = products.find(p => p.name_tally.toLowerCase() === nameTally.toLowerCase() && p.product_code.toLowerCase() === prodCode.toLowerCase());
        if (dup) {
          skippedList.push(`${nameTally} (${prodCode}) — duplicate`);
          continue;
        }
        
        const newProd: Product = {
          id: `p-imp-${Date.now()}-${i}`,
          name_tally: nameTally,
          name_invoice: (cols[idxInvoice] || nameTally).replace(/^"|"$/g, ''),
          product_code: prodCode,
          category: (cols[idxCategory] || 'General').replace(/^"|"$/g, ''),
          subcategory: (cols[idxSub] || 'General').replace(/^"|"$/g, ''),
          brand: (cols[idxBrand] || 'Yinglima').replace(/^"|"$/g, ''),
          hsn_code: (cols[idxHsn] || '84223000').replace(/^"|"$/g, ''),
          vat_refund_pct: Number(cols[idxRefund]) || 0,
          license_remarks: '',
          uom: (cols[idxUom] || 'PCS').replace(/^"|"$/g, ''),
          status: (cols[idxStatus]?.toUpperCase()?.replace(/^"|"$/g, '') === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as Status,
          pkg_quantity: Number(cols[idxQty]) || 1,
          pkg_net_weight: 0,
          pkg_gross_weight: Number(cols[idxGross]) || 0,
          length_cm: 0,
          width_cm: 0,
          height_cm: 0,
          pkg_cbm: (cols[idxCbm] || '0.000000').replace(/^"|"$/g, ''),
          specifications: '',
          current_stock: 0,
          created_by: 'Import',
          created_date: now(),
          modified_by: 'Import',
          modified_date: now(),
          audit: [{ action: 'Imported', user: 'Import', date: now() }],
        };
        
        importedProducts.push(newProd);
        addedList.push(`${nameTally} (${prodCode})`);
      }
      
      if (importedProducts.length > 0) {
        setProducts(prev => [...importedProducts, ...prev]);
      }
      setImportReport({ added: addedList, skipped: skippedList });
    };
    reader.readAsText(file);
  };

  const resetFilters = () => { setSearch(''); setFilterCat(''); setFilterSubCat(''); setFilterBrand(''); setFilterHSN(''); setFilterUOM(''); };
  const catSubcats = subcats.filter(s => s.category === form.category && s.status === 'ACTIVE');

  // ── Categories tab state ──────────────────────────────────────────────────
  const [showCatModal, setShowCatModal] = useState<'add' | 'edit' | null>(null);
  const [catEditId, setCatEditId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catErr, setCatErr] = useState('');
  const bulkCats = useBulkSelect(categories);
  const [confirmCatDel, setConfirmCatDel] = useState<string | null>(null);
  const [confirmBulkCatDel, setConfirmBulkCatDel] = useState(false);

  const openCatAdd = () => { setCatEditId(null); setCatName(''); setCatErr(''); setShowCatModal('add'); };
  const openCatEdit = (c: Category) => { setCatEditId(c.id); setCatName(c.name); setCatErr(''); setShowCatModal('edit'); };
  const saveCat = (e: React.FormEvent) => {
    e.preventDefault();
    const name = catName.trim();
    if (!name) { setCatErr('Category name is required.'); return; }
    if (categories.some(c => c.id !== catEditId && c.name.toLowerCase() === name.toLowerCase())) { setCatErr(`"${name}" already exists.`); return; }
    if (catEditId) {
      setCategories(prev => prev.map(c => c.id === catEditId ? { ...c, name } : c));
      showToast('Category updated.');
    } else {
      setCategories(prev => [...prev, { id: `c${Date.now()}`, name, status: 'ACTIVE' }]);
      showToast('Category created.');
    }
    setShowCatModal(null);
  };
  const toggleCatStatus = (id: string) => {
    const c = categories.find(x => x.id === id)!;
    if (c.status === 'ACTIVE' && subcats.some(s => s.category === c.name && s.status === 'ACTIVE')) {
      setRuleAlert(`"${c.name}" still has active Sub Categories linked to it. Deactivate those first.`);
      return;
    }
    setCategories(prev => prev.map(x => x.id === id ? { ...x, status: x.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : x));
  };
  const requestDeleteCat = (id: string) => {
    const c = categories.find(x => x.id === id)!;
    if (c.status !== 'INACTIVE') { setRuleAlert(`"${c.name}" must be Inactive before it can be deleted.`); return; }
    setConfirmCatDel(id);
  };
  const confirmDeleteCat = () => {
    if (!confirmCatDel) return;
    setCategories(prev => prev.filter(c => c.id !== confirmCatDel));
    setConfirmCatDel(null);
    showToast('Category deleted.');
  };
  const bulkCatDeletable = useMemo(() => [...bulkCats.selected].every(id => categories.find(c => c.id === id)?.status === 'INACTIVE'), [bulkCats.selected, categories]);
  const confirmBulkDeleteCat = () => {
    setCategories(prev => prev.filter(c => !bulkCats.selected.has(c.id)));
    showToast(`${bulkCats.selectedCount} categor${bulkCats.selectedCount === 1 ? 'y' : 'ies'} deleted.`);
    bulkCats.clear();
    setConfirmBulkCatDel(false);
  };

  // ── Sub Categories tab state ──────────────────────────────────────────────
  const [showSubModal, setShowSubModal] = useState<'add' | 'edit' | null>(null);
  const [subEditId, setSubEditId] = useState<string | null>(null);
  const [subName, setSubName] = useState('');
  const [subCatId, setSubCatId] = useState('');
  const [subErr, setSubErr] = useState('');
  const bulkSubs = useBulkSelect(subcats);
  const [confirmSubDel, setConfirmSubDel] = useState<string | null>(null);
  const [confirmBulkSubDel, setConfirmBulkSubDel] = useState(false);

  const openSubAdd = () => { setSubEditId(null); setSubName(''); setSubCatId(categories[0]?.id ?? ''); setSubErr(''); setShowSubModal('add'); };
  const openSubEdit = (s: SubCategoryRow) => { setSubEditId(s.id); setSubName(s.name); setSubCatId(s.categoryId); setSubErr(''); setShowSubModal('edit'); };
  const saveSub = (e: React.FormEvent) => {
    e.preventDefault();
    const name = subName.trim();
    if (!name) { setSubErr('Sub Category name is required.'); return; }
    if (!subCatId) { setSubErr('Parent category is required.'); return; }
    if (subcats.some(s => s.id !== subEditId && s.name.toLowerCase() === name.toLowerCase())) { setSubErr(`"${name}" already exists.`); return; }
    const parent = categories.find(c => c.id === subCatId);
    if (subEditId) {
      setSubcats(prev => prev.map(s => s.id === subEditId ? { ...s, name, categoryId: subCatId, category: parent?.name ?? s.category } : s));
      showToast('Sub Category updated.');
    } else {
      setSubcats(prev => [...prev, { id: `s${Date.now()}`, name, categoryId: subCatId, category: parent?.name ?? '', status: 'ACTIVE' }]);
      showToast('Sub Category created.');
    }
    setShowSubModal(null);
  };
  const toggleSubStatus = (id: string) => setSubcats(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : s));
  const requestDeleteSub = (id: string) => {
    const s = subcats.find(x => x.id === id)!;
    if (s.status !== 'INACTIVE') { setRuleAlert(`"${s.name}" must be Inactive before it can be deleted.`); return; }
    setConfirmSubDel(id);
  };
  const confirmDeleteSub = () => {
    if (!confirmSubDel) return;
    setSubcats(prev => prev.filter(s => s.id !== confirmSubDel));
    setConfirmSubDel(null);
    showToast('Sub Category deleted.');
  };
  const bulkSubDeletable = useMemo(() => [...bulkSubs.selected].every(id => subcats.find(s => s.id === id)?.status === 'INACTIVE'), [bulkSubs.selected, subcats]);
  const confirmBulkDeleteSub = () => {
    setSubcats(prev => prev.filter(s => !bulkSubs.selected.has(s.id)));
    showToast(`${bulkSubs.selectedCount} sub categor${bulkSubs.selectedCount === 1 ? 'y' : 'ies'} deleted.`);
    bulkSubs.clear();
    setConfirmBulkSubDel(false);
  };

  // ── Brands tab state ──────────────────────────────────────────────────────
  const [showBrandModal, setShowBrandModal] = useState<'add' | 'edit' | null>(null);
  const [brandEditId, setBrandEditId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandErr, setBrandErr] = useState('');
  const bulkBrands = useBulkSelect(brands);
  const [confirmBrandDel, setConfirmBrandDel] = useState<string | null>(null);
  const [confirmBulkBrandDel, setConfirmBulkBrandDel] = useState(false);

  const openBrandAdd = () => { setBrandEditId(null); setBrandName(''); setBrandErr(''); setShowBrandModal('add'); };
  const openBrandEdit = (b: BrandRow) => { setBrandEditId(b.id); setBrandName(b.name); setBrandErr(''); setShowBrandModal('edit'); };
  const saveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const name = brandName.trim();
    if (!name) { setBrandErr('Brand name is required.'); return; }
    if (brands.some(b => b.id !== brandEditId && b.name.toLowerCase() === name.toLowerCase())) { setBrandErr(`"${name}" already exists.`); return; }
    if (brandEditId) {
      setBrands(prev => prev.map(b => b.id === brandEditId ? { ...b, name } : b));
      showToast('Brand updated.');
    } else {
      setBrands(prev => [...prev, { id: `b${Date.now()}`, name, status: 'ACTIVE' }]);
      showToast('Brand created.');
    }
    setShowBrandModal(null);
  };
  const toggleBrandStatus = (id: string) => setBrands(prev => prev.map(b => b.id === id ? { ...b, status: b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : b));
  const requestDeleteBrand = (id: string) => {
    const b = brands.find(x => x.id === id)!;
    if (b.status !== 'INACTIVE') { setRuleAlert(`"${b.name}" must be Inactive before it can be deleted.`); return; }
    setConfirmBrandDel(id);
  };
  const confirmDeleteBrand = () => {
    if (!confirmBrandDel) return;
    setBrands(prev => prev.filter(b => b.id !== confirmBrandDel));
    setConfirmBrandDel(null);
    showToast('Brand deleted.');
  };
  const bulkBrandDeletable = useMemo(() => [...bulkBrands.selected].every(id => brands.find(b => b.id === id)?.status === 'INACTIVE'), [bulkBrands.selected, brands]);
  const confirmBulkDeleteBrand = () => {
    setBrands(prev => prev.filter(b => !bulkBrands.selected.has(b.id)));
    showToast(`${bulkBrands.selectedCount} brand(s) deleted.`);
    bulkBrands.clear();
    setConfirmBulkBrandDel(false);
  };

  // ── Top tab config ────────────────────────────────────────────────────────

  const topTabs: { id: TopTab; label: string; icon: React.ElementType }[] = [
    { id: 'products', label: 'Product Master', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'subcategories', label: 'Sub Categories', icon: Layers },
    { id: 'brands', label: 'Brands', icon: Bookmark },
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">

      {/* ── Page Title ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Product Master</h2>
        <p className="text-xs text-slate-500 mt-0.5">Manage products, categories, sub categories and brands in one place.</p>
      </div>

      {/* ── Top Tab Bar (Product Master / Categories / Sub Categories / Brands) ── */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2 shadow-sm">
        {topTabs.map(t => {
          const Icon = t.icon;
          const active = topTab === t.id;
          return (
            <button key={t.id} onClick={() => { setTopTab(t.id); setProdView('list'); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 -mb-px transition-colors cursor-pointer
                ${active ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Global Rule Alert ───────────────────────────────────────────── */}
      {ruleAlert && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-start gap-3 text-xs shadow-sm">
          <ShieldAlert size={17} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1"><strong>Rule Enforced:</strong> {ruleAlert}</div>
          <button onClick={() => setRuleAlert(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer"><X size={14} /></button>
        </div>
      )}

      {/* ═══════════════════ TAB: PRODUCT MASTER ═══════════════════════════ */}
      {topTab === 'products' && (
        <>
          {/* Header actions row */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {prodView === 'list' ? 'Products' : prodView === 'detail' ? 'Product Details' : prodView === 'add' ? 'Add New Product' : 'Edit Product'}
              </h3>
              {prodView === 'list' && <p className="text-xs text-slate-500 mt-0.5">{filtered.length} product{filtered.length !== 1 ? 's' : ''} · Page {page} of {totalPages}</p>}
            </div>
            <div className="flex items-center gap-2">
              {prodView === 'list' ? (
                <>
                  <button onClick={() => setShowManageFields(true)} title="Customize which fields appear on the product form"
                    className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
                    <Settings size={14} className="text-slate-500" /> Manage Fields
                  </button>

                  <button onClick={openAdd} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
                    <Plus size={16} /> + ADD NEW
                  </button>

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
                        {IS_ADMIN && (
                          <button
                            onClick={() => {
                              setShowImport(true);
                              setShowImpExpDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold"
                          >
                            <Upload size={14} className="text-blue-600" /> Import
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleExport();
                            setShowImpExpDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-semibold"
                        >
                          <Download size={14} className="text-amber-600" /> Export CSV
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button onClick={() => { setProdView('list'); setSelectedProduct(null); }} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer">
                  <ArrowLeft size={15} /> BACK TO LIST
                </button>
              )}
            </div>
          </div>

          {/* ── LIST VIEW ── */}
          {prodView === 'list' && (
            <div className="space-y-4">

              {/* Active / Inactive sub-tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200">
                {(['ACTIVE', 'INACTIVE'] as Status[]).map(s => (
                  <button key={s} onClick={() => setStatusFilterTab(s)}
                    className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px cursor-pointer transition-colors
                      ${statusFilterTab === s ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-700'}`}>
                    {s === 'ACTIVE' ? 'Active' : 'Inactive'} ({products.filter(p => p.status === s).length})
                  </button>
                ))}
              </div>

              {/* Filters */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Filter size={13} className="text-blue-600" /> Filters
                  </span>
                  <button onClick={resetFilters} className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                    <RefreshCw size={11} /> Reset
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  <div className="relative col-span-2 md:col-span-2">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or code..."
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-lg outline-none focus:border-blue-500 focus:bg-white" />
                  </div>
                  <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs text-slate-700 px-2.5 py-2 rounded-lg outline-none focus:border-blue-500">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <select value={filterSubCat} onChange={e => setFilterSubCat(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs text-slate-700 px-2.5 py-2 rounded-lg outline-none focus:border-blue-500">
                    <option value="">All Sub Categories</option>
                    {subcats.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs text-slate-700 px-2.5 py-2 rounded-lg outline-none focus:border-blue-500">
                    <option value="">All Brands</option>
                    {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                  <select value={filterUOM} onChange={e => setFilterUOM(e.target.value)} className="bg-slate-50 border border-slate-200 text-xs text-slate-700 px-2.5 py-2 rounded-lg outline-none focus:border-blue-500">
                    <option value="">All UOM</option>
                    {UOM_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Bulk action bar */}
              <BulkActionBar
                count={bulkProducts.selectedCount}
                onClear={bulkProducts.clear}
                onMerge={handleOpenProductMerge}
                onActivate={statusFilterTab === 'INACTIVE' ? () => bulkSetStatus('ACTIVE') : undefined}
                onDeactivate={statusFilterTab === 'ACTIVE' ? () => bulkSetStatus('INACTIVE') : undefined}
                onDelete={() => setConfirmBulkDel(true)}
                deleteDisabled={!IS_ADMIN || !bulkDeletable}
                deleteTitle={!bulkDeletable ? 'All selected products must be Inactive with 0 stock to delete' : undefined}
              />

              {/* Table */}
              {isLoading ? (
                <TableSkeleton rows={8} />
              ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-8">
                          <HeaderCheckbox checked={bulkProducts.allSelected} indeterminate={bulkProducts.someSelected} onChange={bulkProducts.toggleAll} />
                        </th>
                        {renderSortHeader('Product Name', 'name_tally')}
                        {renderSortHeader('Code', 'product_code')}
                        {renderSortHeader('Category', 'category')}
                        {renderSortHeader('Sub Category', 'subcategory')}
                        {renderSortHeader('Brand', 'brand')}
                        {renderSortHeader('HSN', 'hsn_code')}
                        {renderSortHeader('UOM', 'uom')}
                        {renderSortHeader('Pkg Qty', 'pkg_quantity')}
                        {renderSortHeader('Gross Wt', 'pkg_gross_weight')}
                        {renderSortHeader('CBM', 'pkg_cbm')}
                        {renderSortHeader('Status', 'status')}
                        <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="py-16 text-center text-slate-400">
                            <Package size={36} className="mx-auto mb-3 opacity-30" />
                            <p className="font-semibold text-sm">No products found</p>
                            <p className="text-xs mt-1">Try adjusting the filters or add a new product.</p>
                          </td>
                        </tr>
                      ) : paginated.map(p => (
                        <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${bulkProducts.isSelected(p.id) ? 'bg-blue-50/50' : ''}`}>
                          <td className="p-3">
                            <input type="checkbox" checked={bulkProducts.isSelected(p.id)} onChange={() => bulkProducts.toggleOne(p.id)} className="rounded cursor-pointer w-3.5 h-3.5" />
                          </td>
                          <td className="p-3">
                            <button onClick={() => { setSelectedProduct(p); setProdView('detail'); }} className="font-bold text-blue-600 hover:underline text-left cursor-pointer">
                              {p.name_tally}
                            </button>
                            {p.license_remarks && (
                              <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                                <AlertTriangle size={9} /> License
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{p.product_code}</td>
                          <td className="p-3 text-slate-600">{p.category}</td>
                          <td className="p-3 text-slate-600">{p.subcategory}</td>
                          <td className="p-3 text-slate-600">{p.brand}</td>
                          <td className="p-3">
                            <span className="font-mono text-slate-700">{p.hsn_code}</span>
                            <div className="text-[10px] text-emerald-600 font-semibold">{p.vat_refund_pct}% VAT</div>
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{p.uom}</td>
                          <td className="p-3 text-slate-600">{p.pkg_quantity}</td>
                          <td className="p-3 text-slate-600">{p.pkg_gross_weight} kg</td>
                          <td className="p-3 font-mono font-bold text-blue-700">{p.pkg_cbm}</td>
                          <td className="p-3">
                            <button onClick={() => handleToggleStatus(p.id)}
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer transition-colors
                                ${p.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'}`}>
                              {p.status}
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => { setSelectedProduct(p); setProdView('detail'); }} title="View" className="p-1.5 bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 rounded cursor-pointer transition-colors">
                                <Eye size={13} />
                              </button>
                              <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-600 rounded cursor-pointer transition-colors">
                                <Pencil size={13} />
                              </button>
                              {IS_ADMIN && (
                                <button onClick={() => handleDeleteRequest(p.id)} title={p.status !== 'INACTIVE' || p.current_stock > 0 ? 'Set Inactive + 0 stock to delete' : 'Delete'}
                                  disabled={p.status !== 'INACTIVE' || p.current_stock > 0}
                                  className={`p-1.5 rounded transition-colors cursor-pointer
                                    ${p.status === 'INACTIVE' && p.current_stock === 0 ? 'bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}>
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <span className="text-xs text-slate-500">
                    Showing {paginated.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-slate-600">
                      <ChevronLeft size={14} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1).reduce((acc: (number | string)[], n, i, arr) => {
                      if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push('…');
                      acc.push(n);
                      return acc;
                    }, []).map((n, i) => (
                      typeof n === 'string'
                        ? <span key={`el-${i}`} className="px-2 text-slate-400 text-xs">…</span>
                        : <button key={n} onClick={() => setPage(n as number)} className={`w-7 h-7 rounded text-xs font-semibold cursor-pointer ${page === n ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            {n}
                          </button>
                    ))}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer text-slate-600">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* ── DETAIL VIEW ── */}
          {prodView === 'detail' && selectedProduct && (() => {
            const p = selectedProduct;
            return (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button onClick={() => openEdit(p)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer">
                    <Pencil size={13} /> Edit Product
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                        <Info size={15} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-800">Product Information</h3>
                      </div>
                      <div className="p-5 grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
                        {[
                          ['Name (Tally)', p.name_tally], ['Name (Invoice)', p.name_invoice],
                          ['Product Code', p.product_code], ['Category', p.category],
                          ['Sub Category', p.subcategory], ['Brand', p.brand],
                          ['HSN Code', p.hsn_code], ['VAT Refund %', `${p.vat_refund_pct}%`],
                          ['UOM', p.uom], ['Status', p.status],
                          ['License / Certificate Remarks', p.license_remarks || '—'],
                        ].map(([k, v]) => (
                          <div key={k as string}>
                            <p className="text-slate-500 font-medium mb-0.5">{k}</p>
                            <p className={`font-semibold ${k === 'Status' ? (v === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400') : 'text-slate-900'}`}>{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                        <Package size={15} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-800">Packaging Information</h3>
                      </div>
                      <div className="p-5 grid grid-cols-3 gap-x-6 gap-y-3 text-xs">
                        {[
                          ['Pkg Quantity', p.pkg_quantity], ['Net Weight', `${p.pkg_net_weight} kg`],
                          ['Gross Weight', `${p.pkg_gross_weight} kg`], ['Length', `${p.length_cm} cm`],
                          ['Width', `${p.width_cm} cm`], ['Height', `${p.height_cm} cm`],
                          ['Calculated CBM', p.pkg_cbm + ' m³'],
                        ].map(([k, v]) => (
                          <div key={k as string}>
                            <p className="text-slate-500 font-medium mb-0.5">{k}</p>
                            <p className="font-bold text-slate-900">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {p.specifications && (
                      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                          <FileText size={15} className="text-blue-600" />
                          <h3 className="text-sm font-bold text-slate-800">Specifications</h3>
                        </div>
                        <div className="p-5 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-mono" dangerouslySetInnerHTML={{ __html: p.specifications }} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                        <ImageIcon size={15} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-800">Product Image</h3>
                      </div>
                      <div className="p-5 flex items-center justify-center h-40 bg-slate-50 border-2 border-dashed border-slate-200 m-3 rounded-lg text-slate-400 text-xs flex-col gap-2">
                        <ImageIcon size={28} className="opacity-30" />
                        <span>No image uploaded</span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
                        <Clock size={15} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-800">Audit Information</h3>
                      </div>
                      <div className="p-4 space-y-3 text-xs">
                        {[
                          ['Created By', p.created_by, User], ['Created Date', p.created_date, Calendar],
                          ['Last Modified By', p.modified_by, User], ['Last Modified Date', p.modified_date, Calendar],
                        ].map(([label, value, Icon]) => (
                          <div key={label as string} className="flex items-start gap-2.5">
                            <span className="text-slate-400 mt-0.5"><Icon size={13} /></span>
                            <div>
                              <p className="text-slate-500 font-medium">{label as string}</p>
                              <p className="font-semibold text-slate-800">{value as string}</p>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-slate-500 font-medium mb-2">Audit Log</p>
                          {p.audit.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">{a.action}</span>
                              <span className="text-slate-500">{a.user}</span>
                              <span className="text-slate-400 ml-auto">{a.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── ADD / EDIT VIEW ── */}
          {(prodView === 'add' || prodView === 'edit') && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-50">
                {(['general', 'packaging', 'specs', 'docs'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveFormTab(tab)}
                    className={`px-5 py-3 text-xs font-semibold transition-colors cursor-pointer border-b-2 -mb-px
                      ${activeFormTab === tab ? 'text-blue-600 border-blue-600 bg-white' : 'text-slate-500 border-transparent hover:text-slate-800'}`}>
                    {tab === 'general' ? '① General' : tab === 'packaging' ? '② Packaging' : tab === 'specs' ? '③ Specifications' : '④ Images & Docs'}
                  </button>
                ))}
                <button type="button" onClick={() => setShowManageFields(true)} title="Customize fields" className="ml-auto mr-3 my-2 px-2.5 py-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <Settings size={14} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6">

                {activeFormTab === 'general' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                      {isFieldVisible('name_tally') && (
                        <div className="relative">
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Product Name (As per Tally) {isFieldRequired('name_tally') && <span className="text-rose-500">*</span>}</label>
                          <input type="text" value={form.name_tally} onChange={e => handleNameInput(e.target.value)} placeholder="e.g. HPT Foot Release Pedal"
                            className={`w-full bg-slate-50 border text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white ${formErrors.name_tally ? 'border-rose-400' : 'border-slate-200'}`} />
                          {formErrors.name_tally && <p className="text-rose-500 text-[11px] mt-1">{formErrors.name_tally}</p>}
                          {suggestions.length > 0 && (
                            <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                              <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-100 text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                                <AlertTriangle size={11} /> Similar products found
                              </div>
                              {suggestions.map(s => (
                                <div key={s.id} className="px-3 py-2 hover:bg-slate-50 text-xs border-b border-slate-100 last:border-0">
                                  <span className="font-semibold text-slate-800">{s.name_tally}</span>
                                  <span className="text-slate-400 ml-2 font-mono">{s.product_code}</span>
                                </div>
                              ))}
                              <button type="button" onClick={() => setSuggestions([])} className="w-full text-center text-[11px] py-1.5 text-slate-400 hover:text-slate-600 cursor-pointer">Dismiss</button>
                            </div>
                          )}
                        </div>
                      )}

                      {isFieldVisible('name_invoice') && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Product Name (As per Invoice) {isFieldRequired('name_invoice') && <span className="text-rose-500">*</span>}</label>
                          <input type="text" value={form.name_invoice} onChange={e => setForm(f => ({ ...f, name_invoice: e.target.value }))} placeholder="e.g. Foot Release Pedal"
                            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white" />
                        </div>
                      )}

                      {isFieldVisible('product_code') && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Product Code {isFieldRequired('product_code') && <span className="text-rose-500">*</span>}</label>
                          <input type="text" value={form.product_code} onChange={e => setForm(f => ({ ...f, product_code: e.target.value }))} placeholder="e.g. PRD-HPT-FRP"
                            className={`w-full bg-slate-50 border text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white ${formErrors.product_code ? 'border-rose-400' : 'border-slate-200'}`} />
                          {formErrors.product_code && <p className="text-rose-500 text-[11px] mt-1">{formErrors.product_code}</p>}
                        </div>
                      )}

                      {isFieldVisible('category') && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Product Category {isFieldRequired('category') && <span className="text-rose-500">*</span>}</label>
                          <div className="flex gap-2">
                            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}
                              className={`flex-1 bg-slate-50 border text-xs text-slate-700 p-2.5 rounded-lg outline-none focus:border-blue-500 ${formErrors.category ? 'border-rose-400' : 'border-slate-200'}`}>
                              <option value="">Select Category</option>
                              {categories.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <button type="button" onClick={() => setQuickCreate('CATEGORY')} title="Add new category" className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer">
                              <Plus size={14} />
                            </button>
                          </div>
                          {formErrors.category && <p className="text-rose-500 text-[11px] mt-1">{formErrors.category}</p>}
                        </div>
                      )}

                      {isFieldVisible('subcategory') && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Product Sub Category {isFieldRequired('subcategory') && <span className="text-rose-500">*</span>}</label>
                          <div className="flex gap-2">
                            <select value={form.subcategory} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                              className={`flex-1 bg-slate-50 border text-xs text-slate-700 p-2.5 rounded-lg outline-none focus:border-blue-500 ${formErrors.subcategory ? 'border-rose-400' : 'border-slate-200'}`}>
                              <option value="">Select Sub Category</option>
                              {catSubcats.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              {subcats.filter(s => s.status === 'ACTIVE' && !catSubcats.find(c => c.id === s.id)).map(s => <option key={s.id} value={s.name}>{s.name} ({s.category})</option>)}
                            </select>
                            <button type="button" onClick={() => setQuickCreate('SUBCATEGORY')} title="Add new sub category" className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer">
                              <Plus size={14} />
                            </button>
                          </div>
                          {formErrors.subcategory && <p className="text-rose-500 text-[11px] mt-1">{formErrors.subcategory}</p>}
                        </div>
                      )}

                      {isFieldVisible('brand') && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Brand {isFieldRequired('brand') && <span className="text-rose-500">*</span>}</label>
                          <div className="flex gap-2">
                            <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                              className={`flex-1 bg-slate-50 border text-xs text-slate-700 p-2.5 rounded-lg outline-none focus:border-blue-500 ${formErrors.brand ? 'border-rose-400' : 'border-slate-200'}`}>
                              <option value="">Select Brand</option>
                              {brands.filter(b => b.status === 'ACTIVE').map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </select>
                            <button type="button" onClick={() => setQuickCreate('BRAND')} title="Add new brand" className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer">
                              <Plus size={14} />
                            </button>
                          </div>
                          {formErrors.brand && <p className="text-rose-500 text-[11px] mt-1">{formErrors.brand}</p>}
                        </div>
                      )}

                      {isFieldVisible('hsn_code') && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">HSN Code {isFieldRequired('hsn_code') && <span className="text-rose-500">*</span>}</label>
                          <select value={form.hsn_code} onChange={e => handleHsnChange(e.target.value)}
                            className={`w-full bg-slate-50 border text-xs text-slate-700 p-2.5 rounded-lg outline-none focus:border-blue-500 ${formErrors.hsn_code ? 'border-rose-400' : 'border-slate-200'}`}>
                            <option value="">Select HSN Code</option>
                            {HSN_DATA.map(h => <option key={h.code} value={h.code}>{h.code} — {h.description}</option>)}
                          </select>
                        </div>
                      )}

                      {isFieldVisible('vat_refund_pct') && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Refund VAT % <span className="text-xs text-slate-400">(Auto from HSN)</span></label>
                          <input type="number" step="0.1" value={form.vat_refund_pct} readOnly className="w-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold p-2.5 rounded-lg outline-none cursor-not-allowed" />
                        </div>
                      )}

                      {isFieldVisible('uom') && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Unit of Measure (UOM) {isFieldRequired('uom') && <span className="text-rose-500">*</span>}</label>
                          <select value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none focus:border-blue-500">
                            {UOM_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      )}

                      {isFieldVisible('license_remarks') && (
                        <div className="md:col-span-2">
                          <label className="text-xs font-semibold text-slate-700 block mb-1">License / Certificate Remarks</label>
                          <input type="text" value={form.license_remarks} onChange={e => setForm(f => ({ ...f, license_remarks: e.target.value }))} placeholder="e.g. Requires CE Certificate & Import Standard License"
                            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white" />
                        </div>
                      )}

                      {isFieldVisible('status') && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">Status</label>
                          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))} className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 p-2.5 rounded-lg outline-none focus:border-blue-500">
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {formErrors.dup && (
                      <div className="bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                        <ShieldAlert size={14} className="text-rose-500" /> {formErrors.dup}
                      </div>
                    )}
                  </div>
                )}

                {activeFormTab === 'packaging' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    {([
                      ['pkg_quantity', 'Packaging Quantity', 'pkg_quantity'],
                      ['pkg_net_weight', 'Net Weight (kg)', 'pkg_net_weight'],
                      ['pkg_gross_weight', 'Gross Weight (kg)', 'pkg_gross_weight'],
                      ['length_cm', 'Length (cm)', 'length_cm'],
                      ['width_cm', 'Width (cm)', 'width_cm'],
                      ['height_cm', 'Height (cm)', 'height_cm'],
                    ] as [string, string, keyof typeof form][]).map(([fieldKey, label, key]) => isFieldVisible(fieldKey) && (
                      <div key={key as string}>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">{label}</label>
                        <input type="number" step="any" value={form[key] as number}
                          onChange={e => setForm(f => ({ ...f, [key]: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:bg-white" />
                      </div>
                    ))}
                    {isFieldVisible('pkg_cbm') && (
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Packaging CBM (m³) <span className="text-xs text-slate-400 font-normal">Auto-calculated</span></label>
                        <input value={computedCBM} readOnly className="w-full bg-blue-50 border border-blue-200 text-xs text-blue-800 font-bold p-2.5 rounded-lg outline-none cursor-not-allowed" />
                        <p className="text-[11px] text-slate-400 mt-1">= ({form.length_cm} × {form.width_cm} × {form.height_cm}) ÷ 1,000,000</p>
                      </div>
                    )}
                  </div>
                )}

                {activeFormTab === 'specs' && isFieldVisible('specifications') && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Use the toolbar for basic formatting. HTML tags like <code className="bg-slate-100 px-1 rounded">&lt;b&gt;</code> are supported.</p>
                    <SpecsEditor value={form.specifications} onChange={v => setForm(f => ({ ...f, specifications: v }))} />
                  </div>
                )}
                {activeFormTab === 'specs' && !isFieldVisible('specifications') && (
                  <p className="text-xs text-slate-400 text-center py-8">This tab's field has been hidden via Manage Fields.</p>
                )}

                {activeFormTab === 'docs' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'product_image', label: 'Product Image', accept: 'image/*', icon: ImageIcon },
                        { key: 'certificates', label: 'Certificates', accept: '.pdf,.jpg,.png', icon: FileText },
                        { key: 'manuals', label: 'Manuals / PDFs', accept: '.pdf', icon: FileText },
                        { key: 'other_docs', label: 'Other Documents', accept: '*', icon: FileText },
                      ].filter(f => isFieldVisible(f.key)).map(({ key, label, accept, icon: Icon }) => (
                        <div key={key} className="border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-xl p-6 text-center cursor-pointer transition-colors space-y-2"
                          onClick={() => document.getElementById(`upload-${key}`)?.click()}>
                          <Icon size={24} className="mx-auto text-slate-300" />
                          <p className="text-xs font-semibold text-slate-600">{label}</p>
                          <p className="text-[11px] text-slate-400">Click to upload</p>
                          <input id={`upload-${key}`} type="file" accept={accept} className="hidden" />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 text-center">File upload functionality will be connected to backend storage.</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-100">
                  <div className="flex gap-2">
                    {activeFormTab !== 'general' && (
                      <button type="button" onClick={() => setActiveFormTab(t => t === 'packaging' ? 'general' : t === 'specs' ? 'packaging' : 'specs')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5">
                        <ChevronLeft size={13} /> Previous
                      </button>
                    )}
                    {activeFormTab !== 'docs' && (
                      <button type="button" onClick={() => setActiveFormTab(t => t === 'general' ? 'packaging' : t === 'packaging' ? 'specs' : 'docs')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5">
                        Next <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setProdView('list')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5">
                      <CheckCircle size={14} /> {editingId ? 'Save Changes' : 'Create Product'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ TAB: CATEGORIES ═══════════════════════════════ */}
      {topTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Product Categories</h3>
              <p className="text-xs text-slate-500 mt-0.5">{categories.length} categories</p>
            </div>
            <button onClick={openCatAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer">
              <Plus size={14} /> Add Category
            </button>
          </div>

          <BulkActionBar
            count={bulkCats.selectedCount} onClear={bulkCats.clear}
            onDelete={() => setConfirmBulkCatDel(true)}
            deleteDisabled={!bulkCatDeletable}
            deleteTitle={!bulkCatDeletable ? 'All selected must be Inactive to delete' : undefined}
          />

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-8"><HeaderCheckbox checked={bulkCats.allSelected} indeterminate={bulkCats.someSelected} onChange={bulkCats.toggleAll} /></th>
                  <th className="p-3 font-bold text-slate-500 uppercase">Category Name</th>
                  <th className="p-3 font-bold text-slate-500 uppercase">Status</th>
                  <th className="p-3 font-bold text-slate-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map(c => (
                  <tr key={c.id} className={bulkCats.isSelected(c.id) ? 'bg-blue-50/50' : ''}>
                    <td className="p-3"><input type="checkbox" checked={bulkCats.isSelected(c.id)} onChange={() => bulkCats.toggleOne(c.id)} className="rounded cursor-pointer w-3.5 h-3.5" /></td>
                    <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="p-3">
                      <button onClick={() => toggleCatStatus(c.id)} className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                        {c.status}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openCatEdit(c)} className="text-blue-600 hover:text-blue-800 cursor-pointer" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => requestDeleteCat(c.id)} disabled={c.status !== 'INACTIVE'}
                          className={`cursor-pointer ${c.status === 'INACTIVE' ? 'text-red-600 hover:text-red-800' : 'text-slate-300 cursor-not-allowed'}`}
                          title={c.status === 'INACTIVE' ? 'Delete' : 'Set Inactive to enable Delete'}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════ TAB: SUB CATEGORIES ═══════════════════════════ */}
      {topTab === 'subcategories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Product Sub Categories</h3>
              <p className="text-xs text-slate-500 mt-0.5">{subcats.length} sub categories</p>
            </div>
            <button onClick={openSubAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer">
              <Plus size={14} /> Add Sub Category
            </button>
          </div>

          <BulkActionBar
            count={bulkSubs.selectedCount} onClear={bulkSubs.clear}
            onDelete={() => setConfirmBulkSubDel(true)}
            deleteDisabled={!bulkSubDeletable}
            deleteTitle={!bulkSubDeletable ? 'All selected must be Inactive to delete' : undefined}
          />

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-8"><HeaderCheckbox checked={bulkSubs.allSelected} indeterminate={bulkSubs.someSelected} onChange={bulkSubs.toggleAll} /></th>
                  <th className="p-3 font-bold text-slate-500 uppercase">Sub Category Name</th>
                  <th className="p-3 font-bold text-slate-500 uppercase">Parent Category</th>
                  <th className="p-3 font-bold text-slate-500 uppercase">Status</th>
                  <th className="p-3 font-bold text-slate-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subcats.map(s => (
                  <tr key={s.id} className={bulkSubs.isSelected(s.id) ? 'bg-blue-50/50' : ''}>
                    <td className="p-3"><input type="checkbox" checked={bulkSubs.isSelected(s.id)} onChange={() => bulkSubs.toggleOne(s.id)} className="rounded cursor-pointer w-3.5 h-3.5" /></td>
                    <td className="p-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="p-3 text-blue-600 font-semibold">{s.category}</td>
                    <td className="p-3">
                      <button onClick={() => toggleSubStatus(s.id)} className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${s.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                        {s.status}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openSubEdit(s)} className="text-blue-600 hover:text-blue-800 cursor-pointer" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => requestDeleteSub(s.id)} disabled={s.status !== 'INACTIVE'}
                          className={`cursor-pointer ${s.status === 'INACTIVE' ? 'text-red-600 hover:text-red-800' : 'text-slate-300 cursor-not-allowed'}`}
                          title={s.status === 'INACTIVE' ? 'Delete' : 'Set Inactive to enable Delete'}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════ TAB: BRANDS ═══════════════════════════════════ */}
      {topTab === 'brands' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Brands</h3>
              <p className="text-xs text-slate-500 mt-0.5">{brands.length} brands</p>
            </div>
            <button onClick={openBrandAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer">
              <Plus size={14} /> Add Brand
            </button>
          </div>

          <BulkActionBar
            count={bulkBrands.selectedCount} onClear={bulkBrands.clear}
            onDelete={() => setConfirmBulkBrandDel(true)}
            deleteDisabled={!bulkBrandDeletable}
            deleteTitle={!bulkBrandDeletable ? 'All selected must be Inactive to delete' : undefined}
          />

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-8"><HeaderCheckbox checked={bulkBrands.allSelected} indeterminate={bulkBrands.someSelected} onChange={bulkBrands.toggleAll} /></th>
                  <th className="p-3 font-bold text-slate-500 uppercase">Brand Name</th>
                  <th className="p-3 font-bold text-slate-500 uppercase">Status</th>
                  <th className="p-3 font-bold text-slate-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.map(b => (
                  <tr key={b.id} className={bulkBrands.isSelected(b.id) ? 'bg-blue-50/50' : ''}>
                    <td className="p-3"><input type="checkbox" checked={bulkBrands.isSelected(b.id)} onChange={() => bulkBrands.toggleOne(b.id)} className="rounded cursor-pointer w-3.5 h-3.5" /></td>
                    <td className="p-3 font-bold text-slate-900">{b.name}</td>
                    <td className="p-3">
                      <button onClick={() => toggleBrandStatus(b.id)} className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                        {b.status}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openBrandEdit(b)} className="text-blue-600 hover:text-blue-800 cursor-pointer" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => requestDeleteBrand(b.id)} disabled={b.status !== 'INACTIVE'}
                          className={`cursor-pointer ${b.status === 'INACTIVE' ? 'text-red-600 hover:text-red-800' : 'text-slate-300 cursor-not-allowed'}`}
                          title={b.status === 'INACTIVE' ? 'Delete' : 'Set Inactive to enable Delete'}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════ SHARED MODALS ══════════════════════════════════ */}

      {/* Manage Fields */}
      {showManageFields && (
        <ManageFieldsPanel overrides={fieldOverrides} onChange={setFieldOverrides} onClose={() => setShowManageFields(false)} />
      )}

      {/* Quick Create (from product form) */}
      {quickCreate && <QuickCreateModal type={quickCreate} categories={categories} onSave={handleQuickSave} onClose={() => setQuickCreate(null)} />}

      {/* Import */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Upload size={16} className="text-blue-600" /> Import Products (CSV / Excel)</h3>
              <button onClick={() => { setShowImport(false); setImportReport(null); }} className="p-1 bg-slate-100 rounded text-slate-500 hover:text-slate-900 cursor-pointer"><X size={14} /></button>
            </div>
            {!importReport ? (
              <>
                <div className="text-xs text-slate-600 space-y-2">
                  <p>Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file. Duplicate Name + Code combinations will be skipped with a report.</p>
                  <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50 p-8 rounded-xl text-center cursor-pointer space-y-2 transition-all relative">
                    <FileSpreadsheet size={32} className="mx-auto text-blue-500" />
                    <p className="font-semibold text-slate-700">Click to select file</p>
                    <p className="text-[11px] text-slate-400">Supports .csv, .xls, .xlsx</p>
                    <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" onChange={handleImportFile} className="hidden" />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <a
                      href="#download-sample"
                      onClick={(e) => {
                        e.preventDefault();
                        const sampleHeaders = 'Product Name (Tally),Product Name (Invoice),Product Code,Category,Sub Category,Brand,HSN Code,VAT Refund %,UOM,Pkg Qty,Pkg Gross Wt (kg),Pkg CBM (m³),Status\n"Continuous Band Sealer FR900","Continuous Band Sealer FR-900","PRD-BAND-SEALER","Chemicals & Machinery","General Ingredients & Machines","Yinglima","84223000",0,"SETS",1,28.5,0.15,"ACTIVE"';
                        const blob = new Blob([sampleHeaders], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'Yinglima_Product_Import_Sample.csv';
                        a.click();
                      }}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Download size={13} /> Download CSV Sample Template
                    </a>
                  </div>
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button onClick={() => setShowImport(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 cursor-pointer">Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 text-xs">
                  {importReport.added.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
                      <p className="font-bold text-emerald-700 flex items-center gap-1.5"><CheckCircle size={13} /> {importReport.added.length} Imported Successfully</p>
                      {importReport.added.map((r, i) => <p key={i} className="text-emerald-600 pl-5">• {r}</p>)}
                    </div>
                  )}
                  {importReport.skipped.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                      <p className="font-bold text-amber-700 flex items-center gap-1.5"><AlertTriangle size={13} /> {importReport.skipped.length} Skipped (Duplicates)</p>
                      {importReport.skipped.map((r, i) => <p key={i} className="text-amber-600 pl-5">• {r}</p>)}
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button onClick={() => { setShowImport(false); setImportReport(null); showToast('Import completed.'); }} className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 cursor-pointer">Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Category Add/Edit Modal */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={saveCat} className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Tags size={18} className="text-blue-600" /> {catEditId ? 'Edit Category' : 'Add Product Category'}</h3>
              <button type="button" onClick={() => setShowCatModal(null)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded cursor-pointer"><X size={16} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Category Name <span className="text-red-500">*</span></label>
              <input autoFocus type="text" value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Packaging Machines" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {catErr && <p className="text-xs text-red-600 font-medium">{catErr}</p>}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowCatModal(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer">{catEditId ? 'Save Changes' : 'Add Category'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Sub Category Add/Edit Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={saveSub} className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Layers size={18} className="text-blue-600" /> {subEditId ? 'Edit Sub Category' : 'Add Product Sub Category'}</h3>
              <button type="button" onClick={() => setShowSubModal(null)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded cursor-pointer"><X size={16} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Product Category <span className="text-red-500">*</span></label>
              <select value={subCatId} onChange={e => setSubCatId(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="" disabled>Select Product Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Sub Category Name <span className="text-red-500">*</span></label>
              <input type="text" value={subName} onChange={e => setSubName(e.target.value)} placeholder="e.g. Band Sealer" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {subErr && <p className="text-xs text-red-600 font-medium">{subErr}</p>}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowSubModal(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer">{subEditId ? 'Save Changes' : 'Add Sub Category'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Brand Add/Edit Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={saveBrand} className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Bookmark size={18} className="text-blue-600" /> {brandEditId ? 'Edit Brand' : 'Add Brand'}</h3>
              <button type="button" onClick={() => setShowBrandModal(null)} className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 rounded cursor-pointer"><X size={16} /></button>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Brand Name <span className="text-red-500">*</span></label>
              <input autoFocus type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Yinglima" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {brandErr && <p className="text-xs text-red-600 font-medium">{brandErr}</p>}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowBrandModal(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer">{brandEditId ? 'Save Changes' : 'Add Brand'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm dialogs */}
      {confirmDel && <ConfirmDialog msg="Are you sure you want to permanently delete this product? This action cannot be undone." onConfirm={confirmDelete} onCancel={() => setConfirmDel(null)} />}
      {confirmBulkDel && <ConfirmDialog msg={`Delete ${bulkProducts.selectedCount} selected product(s)? This cannot be undone.`} onConfirm={confirmBulkDelete} onCancel={() => setConfirmBulkDel(false)} />}
      {confirmCatDel && <ConfirmDialog msg="Delete this category permanently?" onConfirm={confirmDeleteCat} onCancel={() => setConfirmCatDel(null)} />}
      {confirmBulkCatDel && <ConfirmDialog msg={`Delete ${bulkCats.selectedCount} selected categor${bulkCats.selectedCount === 1 ? 'y' : 'ies'}?`} onConfirm={confirmBulkDeleteCat} onCancel={() => setConfirmBulkCatDel(false)} />}
      {confirmSubDel && <ConfirmDialog msg="Delete this sub category permanently?" onConfirm={confirmDeleteSub} onCancel={() => setConfirmSubDel(null)} />}
      {confirmBulkSubDel && <ConfirmDialog msg={`Delete ${bulkSubs.selectedCount} selected sub categor${bulkSubs.selectedCount === 1 ? 'y' : 'ies'}?`} onConfirm={confirmBulkDeleteSub} onCancel={() => setConfirmBulkSubDel(false)} />}
      {confirmBrandDel && <ConfirmDialog msg="Delete this brand permanently?" onConfirm={confirmDeleteBrand} onCancel={() => setConfirmBrandDel(null)} />}
      {confirmBulkBrandDel && <ConfirmDialog msg={`Delete ${bulkBrands.selectedCount} selected brand(s)?`} onConfirm={confirmBulkDeleteBrand} onCancel={() => setConfirmBulkBrandDel(false)} />}

      {/* MERGE PRODUCTS MODAL */}
      {showProductMergeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-blue-600" /> Merge Selected Products ({bulkProducts.selectedCount})
              </h3>
              <button onClick={() => setShowProductMergeModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Select the <strong>primary product record</strong> to keep. Secondary product duplicate records will be merged and removed.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Primary Product Record to Keep:</label>
              <select
                value={targetProductMergeId}
                onChange={(e) => setTargetProductMergeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-xs text-slate-900 p-2.5 rounded-xl font-semibold outline-none focus:border-blue-500"
              >
                {products
                  .filter((p) => selectedProductIds.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name_tally} ({p.product_code})
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowProductMergeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteProductMerge}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Layers size={14} /> Confirm Merge
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

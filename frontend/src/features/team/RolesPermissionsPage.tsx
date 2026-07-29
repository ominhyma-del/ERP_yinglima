import React, { useState } from 'react';
import { ShieldCheck, Lock, CheckCircle, RefreshCw, X } from 'lucide-react';

type PermMap = Record<string, Record<string, boolean>>;

/**
 * ── Full Permission Matrix ────────────────────────────────────────────────
 * One block per module currently reachable from the sidebar:
 * Suppliers, Local Purchase/Inquiry, Import Purchase, Buyers, Quotation,
 * Product Master (+ Categories/Sub Categories/Brands), Stock Transactions,
 * Re-Order Reports, Team Members, Roles & Permissions, Masters (HSN/Countries).
 * Add a new module here whenever a new sidebar entry is added, so this
 * matrix always stays a complete scan of the app rather than a partial one.
 */
const PERMISSION_GROUPS: { module: string; perms: { key: string; label: string }[] }[] = [
  {
    module: 'Suppliers',
    perms: [
      { key: 'suppliers.view', label: 'View Suppliers' },
      { key: 'suppliers.create', label: 'Create Supplier' },
      { key: 'suppliers.edit', label: 'Edit Supplier' },
      { key: 'suppliers.delete', label: 'Delete Supplier' },
      { key: 'suppliers.export', label: 'Export Suppliers' },
    ],
  },
  {
    module: 'Local Purchase / Inquiry',
    perms: [
      { key: 'inquiry.view', label: 'View Inquiries' },
      { key: 'inquiry.create', label: 'Create Inquiry' },
      { key: 'inquiry.approve', label: 'Approve Consignment' },
      { key: 'inquiry.shift', label: 'Shift Between Companies' },
      { key: 'inquiry.tally_post', label: 'Tally Entry Post' },
    ],
  },
  {
    module: 'Import Purchase',
    perms: [
      { key: 'import_purchase.view', label: 'View Import Purchases' },
      { key: 'import_purchase.create', label: 'Create Import Purchase' },
      { key: 'import_purchase.edit', label: 'Edit Import Purchase' },
    ],
  },
  {
    module: 'Buyers (Clients)',
    perms: [
      { key: 'buyers.view', label: 'View Buyers' },
      { key: 'buyers.create', label: 'Create Buyer' },
      { key: 'buyers.edit', label: 'Edit Buyer' },
      { key: 'buyers.delete', label: 'Delete Buyer' },
    ],
  },
  {
    module: 'Quotation',
    perms: [
      { key: 'quotation.view', label: 'View Quotations' },
      { key: 'quotation.create', label: 'Create Quotation' },
      { key: 'quotation.approve', label: 'Approve Quotation' },
    ],
  },
  {
    module: 'Product Master',
    perms: [
      { key: 'products.view', label: 'View Products' },
      { key: 'products.create', label: 'Add Product' },
      { key: 'products.edit', label: 'Edit Product' },
      { key: 'products.delete', label: 'Delete Product' },
      { key: 'products.manage_fields', label: 'Manage Product Form Fields' },
      { key: 'products.categories', label: 'Manage Categories / Sub Categories' },
      { key: 'products.brands', label: 'Manage Brands' },
      { key: 'products.import_export', label: 'Import / Export Products' },
    ],
  },
  {
    module: 'Stock & Re-Order',
    perms: [
      { key: 'stock.view', label: 'View Stock Transactions' },
      { key: 'stock.adjust', label: 'Adjust Stock' },
      { key: 'stock.reorder_view', label: 'View Re-Order Reports' },
    ],
  },
  {
    module: 'Team Members',
    perms: [
      { key: 'team.view', label: 'View Team Members' },
      { key: 'team.create', label: 'Add Team Member' },
      { key: 'team.edit', label: 'Edit Team Member' },
      { key: 'team.view_password', label: 'View Member Passwords' },
      { key: 'team.delete', label: 'Remove Team Member' },
    ],
  },
  {
    module: 'Roles & Permissions',
    perms: [
      { key: 'roles.view', label: 'View Roles Matrix' },
      { key: 'roles.edit', label: 'Edit Role Permissions' },
    ],
  },
  {
    module: 'Masters (HSN, Countries)',
    perms: [
      { key: 'masters.view', label: 'View Masters' },
      { key: 'masters.edit', label: 'Edit Masters' },
      { key: 'masters.import_export', label: 'Import / Export Masters' },
    ],
  },
];

const ALL_ROLES = ['Super Admin', 'Procurement Manager', 'China Sourcing Specialist', 'Uganda Sales Director', 'Finance & Accounting'];

const DEFAULT_PERMISSIONS: PermMap = {
  'Procurement Manager': {
    'suppliers.view': true, 'suppliers.create': true, 'suppliers.edit': true, 'suppliers.delete': false, 'suppliers.export': true,
    'inquiry.view': true, 'inquiry.create': true, 'inquiry.approve': true, 'inquiry.shift': true, 'inquiry.tally_post': true,
    'import_purchase.view': true, 'import_purchase.create': true, 'import_purchase.edit': true,
    'buyers.view': true, 'buyers.create': true, 'buyers.edit': false, 'buyers.delete': false,
    'quotation.view': true, 'quotation.create': false, 'quotation.approve': false,
    'products.view': true, 'products.create': true, 'products.edit': true, 'products.delete': false,
    'products.manage_fields': false, 'products.categories': true, 'products.brands': true, 'products.import_export': true,
    'stock.view': true, 'stock.adjust': true, 'stock.reorder_view': true,
    'team.view': false, 'team.create': false, 'team.edit': false, 'team.view_password': false, 'team.delete': false,
    'roles.view': false, 'roles.edit': false,
    'masters.view': true, 'masters.edit': false, 'masters.import_export': false,
  },
  'China Sourcing Specialist': {
    'suppliers.view': true, 'suppliers.create': true, 'suppliers.edit': true, 'suppliers.delete': false, 'suppliers.export': false,
    'inquiry.view': true, 'inquiry.create': false, 'inquiry.approve': false, 'inquiry.shift': false, 'inquiry.tally_post': false,
    'import_purchase.view': true, 'import_purchase.create': false, 'import_purchase.edit': false,
    'buyers.view': false, 'buyers.create': false, 'buyers.edit': false, 'buyers.delete': false,
    'quotation.view': false, 'quotation.create': false, 'quotation.approve': false,
    'products.view': true, 'products.create': false, 'products.edit': false, 'products.delete': false,
    'products.manage_fields': false, 'products.categories': false, 'products.brands': false, 'products.import_export': false,
    'stock.view': true, 'stock.adjust': false, 'stock.reorder_view': false,
    'team.view': false, 'team.create': false, 'team.edit': false, 'team.view_password': false, 'team.delete': false,
    'roles.view': false, 'roles.edit': false,
    'masters.view': true, 'masters.edit': false, 'masters.import_export': false,
  },
  'Uganda Sales Director': {
    'suppliers.view': false, 'suppliers.create': false, 'suppliers.edit': false, 'suppliers.delete': false, 'suppliers.export': false,
    'inquiry.view': true, 'inquiry.create': false, 'inquiry.approve': true, 'inquiry.shift': false, 'inquiry.tally_post': false,
    'import_purchase.view': false, 'import_purchase.create': false, 'import_purchase.edit': false,
    'buyers.view': true, 'buyers.create': true, 'buyers.edit': true, 'buyers.delete': false,
    'quotation.view': true, 'quotation.create': true, 'quotation.approve': true,
    'products.view': true, 'products.create': false, 'products.edit': false, 'products.delete': false,
    'products.manage_fields': false, 'products.categories': false, 'products.brands': false, 'products.import_export': false,
    'stock.view': true, 'stock.adjust': false, 'stock.reorder_view': true,
    'team.view': false, 'team.create': false, 'team.edit': false, 'team.view_password': false, 'team.delete': false,
    'roles.view': false, 'roles.edit': false,
    'masters.view': false, 'masters.edit': false, 'masters.import_export': false,
  },
  'Finance & Accounting': {
    'suppliers.view': true, 'suppliers.create': false, 'suppliers.edit': false, 'suppliers.delete': false, 'suppliers.export': true,
    'inquiry.view': true, 'inquiry.create': false, 'inquiry.approve': false, 'inquiry.shift': false, 'inquiry.tally_post': true,
    'import_purchase.view': true, 'import_purchase.create': false, 'import_purchase.edit': false,
    'buyers.view': true, 'buyers.create': false, 'buyers.edit': false, 'buyers.delete': false,
    'quotation.view': true, 'quotation.create': false, 'quotation.approve': false,
    'products.view': true, 'products.create': false, 'products.edit': false, 'products.delete': false,
    'products.manage_fields': false, 'products.categories': false, 'products.brands': false, 'products.import_export': false,
    'stock.view': true, 'stock.adjust': false, 'stock.reorder_view': true,
    'team.view': false, 'team.create': false, 'team.edit': false, 'team.view_password': false, 'team.delete': false,
    'roles.view': false, 'roles.edit': false,
    'masters.view': true, 'masters.edit': false, 'masters.import_export': false,
  },
};

export const RolesPermissionsPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState('Procurement Manager');
  const [permissions, setPermissions] = useState<PermMap>(DEFAULT_PERMISSIONS);
  const [savedToast, setSavedToast] = useState(false);

  const togglePermission = (role: string, permKey: string) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [permKey]: !prev[role]?.[permKey] },
    }));
  };

  const setAllForModule = (role: string, moduleKeys: string[], value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], ...Object.fromEntries(moduleKeys.map((k) => [k, value])) },
    }));
  };

  const resetToDefaults = () => {
    setPermissions(DEFAULT_PERMISSIONS);
  };

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const totalGranted = (role: string) => Object.values(permissions[role] ?? {}).filter(Boolean).length;
  const totalPerms = PERMISSION_GROUPS.reduce((sum, g) => sum + g.perms.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Roles & Permissions Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full permission scan across every module — Suppliers, Purchase, Buyers, Quotation, Product Master, Stock, Team & Masters.
          </p>
        </div>
      </div>

      {savedToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs shadow-sm">
          <CheckCircle size={16} className="text-emerald-600" /> Permission matrix saved for "{selectedRole}".
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Role Selector Sidebar */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-2 h-fit">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Role to Edit</h3>
          {ALL_ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`w-full text-left p-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                selectedRole === role ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{role}</span>
              {role === 'Super Admin' ? (
                <Lock size={13} className="text-slate-400" />
              ) : (
                <span className="text-[10px] font-mono text-slate-400">{totalGranted(role)}/{totalPerms}</span>
              )}
            </button>
          ))}
        </div>

        {/* Permissions Table */}
        <div className="md:col-span-3 bg-white border border-slate-200 p-6 rounded-xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" /> Permissions for "{selectedRole}"
              </h3>
              <p className="text-xs text-slate-500">Check permissions to grant access to this role, module by module.</p>
            </div>
            {selectedRole !== 'Super Admin' && (
              <div className="flex items-center gap-2">
                <button onClick={resetToDefaults} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer">
                  <RefreshCw size={12} /> Reset
                </button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer">
                  Save Permission Matrix
                </button>
              </div>
            )}
          </div>

          {selectedRole === 'Super Admin' ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Lock size={14} /> Super Admin has full unrestricted access to all system modules, settings, and deletion controls.
            </div>
          ) : (
            <div className="space-y-6 text-xs text-slate-800 max-h-[65vh] overflow-y-auto pr-1">
              {PERMISSION_GROUPS.map((group) => {
                const moduleKeys = group.perms.map((p) => p.key);
                const allChecked = moduleKeys.every((k) => permissions[selectedRole]?.[k]);
                return (
                  <div key={group.module} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-blue-600">{group.module}</h4>
                      <button
                        onClick={() => setAllForModule(selectedRole, moduleKeys, !allChecked)}
                        className="text-[10px] text-slate-400 hover:text-blue-600 font-semibold cursor-pointer"
                      >
                        {allChecked ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {group.perms.map((perm) => (
                        <label key={perm.key} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                          <input
                            type="checkbox"
                            checked={!!permissions[selectedRole]?.[perm.key]}
                            onChange={() => togglePermission(selectedRole, perm.key)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-medium text-slate-800">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

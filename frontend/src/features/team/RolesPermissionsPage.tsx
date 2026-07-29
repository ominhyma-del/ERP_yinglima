import React, { useState } from 'react';
import { ShieldCheck, Plus, Check, Lock } from 'lucide-react';

export const RolesPermissionsPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState('Procurement Manager');

  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({
    'Procurement Manager': {
      'suppliers.view': true,
      'suppliers.create': true,
      'suppliers.edit': true,
      'suppliers.delete': false,
      'inquiry.view': true,
      'inquiry.approve': true,
      'inquiry.shift': true,
      'inquiry.tally_post': true,
      'products.view': true,
      'products.create': true,
      'products.edit': true,
      'products.delete': false,
      'buyers.view': true,
      'buyers.create': true,
    },
    'China Sourcing Specialist': {
      'suppliers.view': true,
      'suppliers.create': true,
      'suppliers.edit': true,
      'suppliers.delete': false,
      'inquiry.view': true,
      'inquiry.approve': false,
      'inquiry.shift': false,
      'inquiry.tally_post': false,
      'products.view': true,
      'products.create': false,
      'products.edit': false,
      'buyers.view': false,
    },
  });

  const togglePermission = (role: string, permKey: string) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permKey]: !prev[role]?.[permKey],
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Roles & Permissions Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure Role-Based Access Control (RBAC) & Feature Level Access Grants
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Role Selector Sidebar */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-2xs space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Role to Edit</h3>
          {['Super Admin', 'Procurement Manager', 'China Sourcing Specialist', 'Uganda Sales Director', 'Finance & Accounting'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`w-full text-left p-3 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                selectedRole === role
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{role}</span>
              {role === 'Super Admin' && <Lock size={13} className="text-slate-400" />}
            </button>
          ))}
        </div>

        {/* Permissions Table */}
        <div className="md:col-span-3 bg-white border border-slate-200 p-6 rounded-xl shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" /> Permissions for "{selectedRole}"
              </h3>
              <p className="text-xs text-slate-500">Check permissions to grant access to this role</p>
            </div>
            {selectedRole !== 'Super Admin' && (
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs">
                Save Permission Matrix
              </button>
            )}
          </div>

          {selectedRole === 'Super Admin' ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs font-semibold">
              🔒 Super Admin has full unrestricted access to all system modules, settings, and deletion controls.
            </div>
          ) : (
            <div className="space-y-6 text-xs text-slate-800">
              {/* Suppliers Access */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-blue-600">Suppliers Module</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'suppliers.view', label: 'View Suppliers' },
                    { key: 'suppliers.create', label: 'Create Supplier' },
                    { key: 'suppliers.edit', label: 'Edit Supplier' },
                    { key: 'suppliers.delete', label: 'Delete Supplier' },
                  ].map((perm) => (
                    <label key={perm.key} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={!!permissions[selectedRole]?.[perm.key]}
                        onChange={() => togglePermission(selectedRole, perm.key)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-slate-800">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Inquiry & Consignment Access */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-blue-600">Local Purchase / Inquiry Module</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'inquiry.view', label: 'View Inquiries' },
                    { key: 'inquiry.approve', label: 'Approve Consignment' },
                    { key: 'inquiry.shift', label: 'Shift FB1 <-> FB2' },
                    { key: 'inquiry.tally_post', label: 'Tally Entry Post' },
                  ].map((perm) => (
                    <label key={perm.key} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={!!permissions[selectedRole]?.[perm.key]}
                        onChange={() => togglePermission(selectedRole, perm.key)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-slate-800">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Product Catalog Access */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-blue-600">Products & Stock Module</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'products.view', label: 'View Products' },
                    { key: 'products.create', label: 'Add Product' },
                    { key: 'products.edit', label: 'Edit Product' },
                    { key: 'products.delete', label: 'Delete Product' },
                  ].map((perm) => (
                    <label key={perm.key} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
                      <input
                        type="checkbox"
                        checked={!!permissions[selectedRole]?.[perm.key]}
                        onChange={() => togglePermission(selectedRole, perm.key)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium text-slate-800">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShoppingBag,
  Truck,
  Users,
  Package,
  FileSpreadsheet,
  BarChart3,
  Bot,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  FileText,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../features/team/teamStore';
import { ROUTE_PERMISSION } from '../../config/routeAccess';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const menuSections = [
    {
      title: 'DASHBOARD',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Bot, path: '/dashboard' },
      ],
    },
    {
      title: 'PURCHASE',
      items: [
        { id: 'suppliers', label: 'Suppliers', icon: Truck, path: '/suppliers' },
        { id: 'localpurchase', label: 'Local Purchase / Inquiry', icon: FileSpreadsheet, path: '/localpurchase' },
        { id: 'import-purchase', label: 'Import Purchase', icon: ShoppingBag, path: '/import-purchase' },
      ],
    },
    {
      title: 'SALES & BUYERS',
      items: [
        { id: 'buyers', label: 'Buyers (Clients)', icon: Users, path: '/buyers' },
        { id: 'quotation', label: 'Quotation', icon: FileText, path: '/quotation' },
      ],
    },
    {
      title: 'PRODUCTS & STOCK',
      items: [
        { id: 'products', label: 'Product Master', icon: Package, path: '/products' },
        { id: 'stock-transactions', label: 'Stock Transactions', icon: RefreshCw, path: '/stock-transactions' },
        { id: 'reorder-reports', label: 'Re-Order Reports', icon: BarChart3, path: '/reorder-reports' },
      ],
    },
    {
      title: 'TEAM & ACCESS',
      items: [
        { id: 'team', label: 'Team Members', icon: Users, path: '/team' },
        { id: 'roles', label: 'Roles & Permission', icon: ShieldCheck, path: '/roles' },
        { id: 'audit-logs', label: 'Audit Trace Logs', icon: ShieldAlert, path: '/audit-logs' },
      ],
    },
  ];

  const memberForCheck = user
    ? { accountType: user.accountType, permissions: user.permissions } as any
    : null;

  const isVisible = (itemPath: string) => {
    const gate = ROUTE_PERMISSION[itemPath];
    if (gate === null || gate === undefined) return true;
    if (!memberForCheck) return false;
    return can(memberForCheck, gate, 'view');
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-30 select-none shadow-xs">
      {/* YINGLIMA LOGO HEADER */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-600/30">
            Y
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-base tracking-tight leading-none">YINGLIMA</h1>
            <span className="text-[10px] font-bold text-blue-600 tracking-wider">PROCUREMENT • ERP</span>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {menuSections.map((section) => {
          const visibleItems = section.items.filter((item) => isVisible(item.path));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="space-y-1">
              <h2 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {section.title}
              </h2>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) =>
                      `w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 font-bold shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5">
                          <Icon size={17} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight size={14} className="text-blue-600" />}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer User Info & Logout Button */}
      <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
        <div className="overflow-hidden">
          <p className="font-bold text-slate-800 truncate">{user?.name || 'Yinglima User'}</p>
          <span className="text-[10px] text-blue-600 font-semibold">{user?.accountType || 'USER'}</span>
        </div>
        <button
          onClick={logout}
          className="p-1.5 bg-white border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
};

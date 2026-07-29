import React from 'react';
import {
  ShoppingBag,
  Truck,
  Users,
  Package,
  FileSpreadsheet,
  Database,
  BarChart3,
  Bot,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building2,
  RefreshCw,
  FileText,
  Trash2,
} from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  const menuSections = [
    {
      title: 'PURCHASE',
      items: [
        { id: 'suppliers', label: 'Suppliers', icon: Truck },
        { id: 'inquiries', label: 'Local Purchase / Inquiry', icon: FileSpreadsheet },
        { id: 'import_purchase', label: 'Import Purchase', icon: ShoppingBag },
      ],
    },
    {
      title: 'SALES & BUYERS',
      items: [
        { id: 'buyers', label: 'Buyers (Clients)', icon: Users },
        { id: 'quotation', label: 'Quotation', icon: FileText },
      ],
    },
    {
      title: 'PRODUCTS & STOCK',
      items: [
        { id: 'products', label: 'Product Master', icon: Package },
        { id: 'stock_trans', label: 'Stock Transactions', icon: RefreshCw },
        { id: 'reorder', label: 'Re-Order Reports', icon: BarChart3 },
      ],
    },
    {
      title: 'TEAM & ACCESS',
      items: [
        { id: 'team', label: 'Team Members', icon: Users },
        { id: 'roles', label: 'Roles & Permission', icon: ShieldCheck },
      ],
    },
    {
      title: 'SETTINGS',
      items: [
        { id: 'masters', label: 'Masters', icon: Database },
      ],
    },
    {
      title: 'AI SERVICES',
      items: [
        { id: 'dashboard', label: 'AI Optimization & Risk', icon: Bot },
      ],
    },
  ];

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
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <h2 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {section.title}
            </h2>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 font-bold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={17} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="text-blue-600" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer User Info */}
      <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Logged in as <strong>Yinglima Admin</strong></span>
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
      </div>
    </aside>
  );
};

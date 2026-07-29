import React, { useState, useRef, useEffect } from 'react';
import { Building2, Bell, Search, ChevronDown, LogOut, ShieldCheck, Copy, Check } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

interface HeaderProps {
  currentCompany: string;
  setCompany: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentCompany, setCompany }) => {
  const { user, sessionId, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const companies = [
    { id: 'c1', name: 'Yinglima Machinery & Trade (China HQ)', country: 'China' },
    { id: 'c2', name: 'F&B Uganda Ingredients Ltd', country: 'Uganda' },
    { id: 'c3', name: 'One Stop General Trading Uganda', country: 'Uganda' },
    { id: 'c4', name: 'Ingredi Trade Uganda Ltd', country: 'Uganda' },
    { id: 'c5', name: 'Darsh Impex India LLP (India HQ)', country: 'India' },
    { id: 'c6', name: 'East Africa Chemical Supply', country: 'Kenya' },
  ];

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const copySessionId = () => {
    if (!sessionId) return;
    navigator.clipboard?.writeText(sessionId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left Search */}
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Products, Suppliers, POs..."
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white w-64 transition-all"
          />
        </div>
      </div>

      {/* Right Company Switcher & Profile */}
      <div className="flex items-center gap-4">
        {/* Multi-Tenant Company Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-lg">
          <Building2 size={16} className="text-blue-600 ml-1" />
          <select
            value={currentCompany}
            onChange={(e) => setCompany(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-2"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-extrabold rounded uppercase">
            Active Tenant
          </span>
        </div>

        {/* Notifications */}
        <button className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 relative cursor-pointer">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
        </button>

        {/* User Profile + Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-2.5 pl-3 border-l border-slate-200 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-xs">
              {user?.avatarInitials ?? '??'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user?.name ?? 'Unknown User'}</p>
              <p className="text-[10px] font-semibold text-blue-600">{user?.role ?? ''}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-30 text-xs">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="font-bold text-slate-900">{user?.name}</p>
                <p className="text-slate-500">{user?.email}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold text-[10px]">{user?.role}</span>
              </div>
              <div className="px-4 py-3 border-b border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <ShieldCheck size={11} /> Session
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-slate-600 truncate">{sessionId}</span>
                  <button onClick={copySessionId} className="text-slate-400 hover:text-slate-700 cursor-pointer flex-shrink-0" title="Copy session ID">
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-3 text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer transition-colors"
              >
                <LogOut size={13} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

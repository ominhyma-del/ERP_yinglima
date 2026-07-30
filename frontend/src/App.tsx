import { useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { SupplierListPage } from './features/supplier/SupplierListPage';
import { BuyerListPage } from './features/buyer/BuyerListPage';
import { ProductMasterPage } from './features/product-master/ProductMasterPage';
import { ProductStockPage } from './features/product/ProductStockPage';
import { InquiryPlanningPage } from './features/inquiry/InquiryPlanningPage';
import { MastersPage } from './features/masters/MastersPage';
import { TeamMembersPage } from './features/team/TeamMembersPage';
import { RolesPermissionsPage } from './features/team/RolesPermissionsPage';
import { LoginPage } from './features/auth/LoginPage';
import { useAuth } from './features/auth/AuthContext';
import { can } from './features/team/teamStore';
import { ShieldAlert } from 'lucide-react';

// Same module-key mapping used by the Sidebar, so App.tsx enforces the
// same access rule even if activeModule is somehow set to a hidden module.
const MODULE_GATE: Record<string, string | null> = {
  suppliers: 'suppliers',
  import_purchase: 'import_purchase',
  buyers: 'buyers',
  quotation: 'quotation',
  products: 'products',
  reorder: 'stock',
  stock_trans: 'stock',
  inquiries: 'inquiry',
  masters: 'masters',
  team: 'team',
  roles: 'roles',
  dashboard: null,
};

function AccessDenied() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 text-center space-y-3 max-w-lg mx-auto mt-10">
      <ShieldAlert size={32} className="mx-auto text-amber-500" />
      <h3 className="text-base font-bold text-slate-900">You don't have access to this module</h3>
      <p className="text-xs text-slate-500">Ask an Admin to grant you View permission for this section from Roles &amp; Permissions.</p>
    </div>
  );
}

export function App() {
  const [activeModule, setActiveModule] = useState<string>('suppliers');
  const [currentCompany, setCompany] = useState<string>('c1');
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const memberForCheck = user ? ({ accountType: user.accountType, permissions: user.permissions } as any) : null;
  const gate = MODULE_GATE[activeModule];
  const allowed = gate === null || gate === undefined || can(memberForCheck, gate, 'view');

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
      {/* Navigation Sidebar */}
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header currentCompany={currentCompany} setCompany={setCompany} />

        <main className="p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          {!allowed ? (
            <AccessDenied />
          ) : (
            <>
              {activeModule === 'dashboard' && <DashboardPage />}
              {(activeModule === 'suppliers' || activeModule === 'import_purchase') && <SupplierListPage />}
              {(activeModule === 'buyers' || activeModule === 'quotation') && <BuyerListPage />}
              {(activeModule === 'products' || activeModule === 'reorder') && <ProductMasterPage />}
              {activeModule === 'stock_trans' && <ProductStockPage />}
              {activeModule === 'inquiries' && <InquiryPlanningPage />}
              {activeModule === 'masters' && <MastersPage />}
              {activeModule === 'team' && <TeamMembersPage />}
              {activeModule === 'roles' && <RolesPermissionsPage />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

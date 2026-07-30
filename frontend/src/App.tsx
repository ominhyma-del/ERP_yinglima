import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { SupplierListPage } from './features/supplier/SupplierListPage';
import { BuyerListPage } from './features/buyer/BuyerListPage';
import { ProductMasterPage } from './features/product-master/ProductMasterPage';
import { ProductStockPage } from './features/product/ProductStockPage';
import { InquiryPlanningPage } from './features/inquiry/InquiryPlanningPage';
import { MastersPage } from './features/masters/MastersPage';
import { TeamMembersPage } from './features/team/TeamMembersPage';
import { RolesPermissionsPage } from './features/team/RolesPermissionsPage';
import { AuditLogsPage } from './features/team/AuditLogsPage';

export function App() {
  const { isAuthenticated } = useAuth();
  const [activeModule, setActiveModule] = useState<string>('suppliers');
  const [currentCompany, setCompany] = useState<string>('c1');
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const memberForCheck = user ? ({ accountType: user.accountType, permissions: user.permissions } as any) : null;
  const gate = MODULE_GATE[activeModule];
  const allowed = gate === null || gate === undefined || can(memberForCheck, gate, 'view');

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
      {/* Navigation Sidebar */}
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header currentCompany={currentCompany} setCompany={setCompany} />

        <main className="p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeModule === 'dashboard' && <DashboardPage />}
          {(activeModule === 'suppliers' || activeModule === 'import_purchase') && <SupplierListPage />}
          {(activeModule === 'buyers' || activeModule === 'quotation') && <BuyerListPage />}
          {(activeModule === 'products' || activeModule === 'reorder') && <ProductMasterPage />}
          {activeModule === 'stock_trans' && <ProductStockPage />}
          {activeModule === 'inquiries' && <InquiryPlanningPage />}
          {activeModule === 'masters' && <MastersPage />}
          {activeModule === 'team' && <TeamMembersPage />}
          {activeModule === 'roles' && <RolesPermissionsPage />}
          {activeModule === 'audit_logs' && <AuditLogsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;

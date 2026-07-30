import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useState } from 'react';
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
  const [currentCompany, setCompany] = useState<string>('c1');

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header currentCompany={currentCompany} setCompany={setCompany} />

        <main className="p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/suppliers" replace />} />

            {/* PURCHASE */}
            <Route path="/suppliers" element={<SupplierListPage />} />
            <Route path="/localpurchase" element={<InquiryPlanningPage />} />
            <Route path="/import-purchase" element={<SupplierListPage />} />

            {/* SALES & BUYERS */}
            <Route path="/buyers" element={<BuyerListPage />} />
            <Route path="/quotation" element={<BuyerListPage />} />

            {/* PRODUCTS & STOCK */}
            <Route path="/products" element={<ProductMasterPage />} />
            <Route path="/stock-transactions" element={<ProductStockPage />} />
            <Route path="/reorder-reports" element={<ProductMasterPage />} />

            {/* TEAM & ACCESS */}
            <Route path="/team" element={<TeamMembersPage />} />
            <Route path="/roles" element={<RolesPermissionsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />

            {/* SETTINGS */}
            <Route path="/masters" element={<MastersPage />} />

            {/* AI SERVICES */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/suppliers" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;

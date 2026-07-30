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
import { TeamMembersPage } from './features/team/TeamMembersPage';
import { RolesPermissionsPage } from './features/team/RolesPermissionsPage';
import { AuditLogsPage } from './features/team/AuditLogsPage';
import { can } from './features/team/teamStore';
import { ROUTE_PERMISSION } from './config/routeAccess';

/**
 * Guards a route against direct URL access. Even though the Sidebar hides
 * links a user isn't permitted to see, someone could still type/bookmark
 * the URL directly (or land on a stale route left over from a previous
 * user's session on a shared machine). This makes the permission check
 * authoritative at the route level too, not just cosmetic in the nav.
 */
function ProtectedRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const gate = ROUTE_PERMISSION[path];
  const allowed = gate === null || gate === undefined ? true : can(user as any, gate, 'view');
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function App() {
  const { isAuthenticated, isInitializing } = useAuth();
  const [currentCompany, setCompany] = useState<string>('c1');

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans text-white">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-r-indigo-500 border-t-transparent border-b-transparent border-l-transparent animate-spin [animation-duration:1.5s] [animation-direction:reverse]"></div>
          <div className="absolute inset-4 rounded-full border-4 border-b-purple-500 border-t-transparent border-r-transparent border-l-transparent animate-spin [animation-duration:1s]"></div>
        </div>
        <h2 className="text-lg font-bold tracking-widest text-slate-200">YINGLIMA</h2>
        <p className="text-xs text-slate-500 mt-1">Initializing secure ERP environment...</p>
      </div>
    );
  }

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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* DASHBOARD */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* PURCHASE */}
            <Route path="/suppliers" element={<ProtectedRoute path="/suppliers"><SupplierListPage /></ProtectedRoute>} />
            <Route path="/localpurchase" element={<ProtectedRoute path="/localpurchase"><InquiryPlanningPage /></ProtectedRoute>} />
            <Route path="/import-purchase" element={<ProtectedRoute path="/import-purchase"><SupplierListPage /></ProtectedRoute>} />

            {/* SALES & BUYERS */}
            <Route path="/buyers" element={<ProtectedRoute path="/buyers"><BuyerListPage /></ProtectedRoute>} />
            <Route path="/quotation" element={<ProtectedRoute path="/quotation"><BuyerListPage /></ProtectedRoute>} />

            {/* PRODUCTS & STOCK */}
            <Route path="/products" element={<ProtectedRoute path="/products"><ProductMasterPage /></ProtectedRoute>} />
            <Route path="/stock-transactions" element={<ProtectedRoute path="/stock-transactions"><ProductStockPage /></ProtectedRoute>} />
            <Route path="/reorder-reports" element={<ProtectedRoute path="/reorder-reports"><ProductMasterPage /></ProtectedRoute>} />

            {/* TEAM & ACCESS */}
            <Route path="/team" element={<ProtectedRoute path="/team"><TeamMembersPage /></ProtectedRoute>} />
            <Route path="/roles" element={<ProtectedRoute path="/roles"><RolesPermissionsPage /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute path="/audit-logs"><AuditLogsPage /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;

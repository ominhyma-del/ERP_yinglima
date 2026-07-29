import { useState } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { SupplierListPage } from './features/supplier/SupplierListPage';
import { BuyerListPage } from './features/buyer/BuyerListPage';
import { ProductCatalogPage } from './features/product/ProductCatalogPage';
import { InquiryPlanningPage } from './features/inquiry/InquiryPlanningPage';
import { MastersPage } from './features/masters/MastersPage';

export function App() {
  const [activeModule, setActiveModule] = useState<string>('suppliers');
  const [currentCompany, setCompany] = useState<string>('c1');

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
          {(activeModule === 'products' || activeModule === 'stock_trans' || activeModule === 'reorder') && <ProductCatalogPage />}
          {activeModule === 'inquiries' && <InquiryPlanningPage />}
          {(activeModule === 'masters' || activeModule === 'team' || activeModule === 'roles') && <MastersPage />}
        </main>
      </div>
    </div>
  );
}

export default App;

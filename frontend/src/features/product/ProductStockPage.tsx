import React, { useState } from 'react';
import { Filter, Download, Search, Package, ShieldAlert, ArrowLeft } from 'lucide-react';

export const ProductStockPage: React.FC = () => {
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [isNegativeStock, setIsNegativeStock] = useState('');

  const [stockItems] = useState([
    {
      sr: 1,
      name_tally: 'FR900 MSH Band Sealer',
      code: 'PRD-BS-FR900',
      brand: 'Yinglima Machinery',
      subcategory: 'Band Sealer',
      uganda: 15,
      uganda_transit: 5,
      uganda_ordered: 10,
      china: 45,
      china_transit: 0,
      china_ordered: 20,
      total_qty: 95,
    },
    {
      sr: 2,
      name_tally: 'Citric Acid Anhydrous 30-100 mesh',
      code: 'PRD-ING-CA01',
      brand: 'TTCA',
      subcategory: 'Citric Acid',
      uganda: 500,
      uganda_transit: 200,
      uganda_ordered: 500,
      china: 2500,
      china_transit: 0,
      china_ordered: 1000,
      total_qty: 4700,
    },
    {
      sr: 3,
      name_tally: 'Caustic Soda Flakes 99%',
      code: 'PRD-CHM-CS02',
      brand: 'Tianjin Bohai',
      subcategory: 'Caustic Soda',
      uganda: 120,
      uganda_transit: 80,
      uganda_ordered: 200,
      china: 1800,
      china_transit: 0,
      china_ordered: 500,
      total_qty: 2700,
    },
    {
      sr: 4,
      name_tally: 'Teflon Belt 750mm for Band Sealer',
      code: 'PRD-SPR-TB750',
      brand: 'Yinglima Machinery',
      subcategory: 'Spares for Band Sealer',
      uganda: 50,
      uganda_transit: 10,
      uganda_ordered: 30,
      china: 300,
      china_transit: 0,
      china_ordered: 100,
      total_qty: 490,
    },
  ]);

  const handleExportCSV = () => {
    const headers = ['Sr No', 'Product Name (As per Tally)', 'Product Code', 'Brand', 'Sub Category', 'Uganda', 'Uganda Transit', 'Uganda Ordered', 'China', 'China Transit', 'China Ordered', 'Total Qty'];
    const rows = stockItems.map((s) => [
      `"${s.sr}"`,
      `"${s.name_tally}"`,
      `"${s.code}"`,
      `"${s.brand}"`,
      `"${s.subcategory}"`,
      `"${s.uganda}"`,
      `"${s.uganda_transit}"`,
      `"${s.uganda_ordered}"`,
      `"${s.china}"`,
      `"${s.china_transit}"`,
      `"${s.china_ordered}"`,
      `"${s.total_qty}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Yinglima_Product_Stock_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* DARSH IMPEX TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Product Stock</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Warehouse Stock Balances, In-Transit Consignments & Open Orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
            className={`px-3.5 py-2.5 border font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
              showAdvancedFilter ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Filter size={15} /> Advanced Filter
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* ADVANCED FILTER PANEL */}
      {showAdvancedFilter && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-lg outline-none"
              >
                <option value="">Category (All)</option>
                <option value="Machines">Machines</option>
                <option value="Food Ingredients">Food Ingredients</option>
                <option value="Chemicals">Chemicals</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Sub Category</label>
              <select
                value={subCategoryFilter}
                onChange={(e) => setSubCategoryFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-lg outline-none"
              >
                <option value="">Sub Category (All)</option>
                <option value="Band Sealer">Band Sealer</option>
                <option value="Citric Acid">Citric Acid</option>
                <option value="Caustic Soda">Caustic Soda</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Brand</label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-lg outline-none"
              >
                <option value="">Brand (All)</option>
                <option value="Yinglima Machinery">Yinglima Machinery</option>
                <option value="TTCA">TTCA</option>
                <option value="Tianjin Bohai">Tianjin Bohai</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Is Negative Stock?</label>
              <select
                value={isNegativeStock}
                onChange={(e) => setIsNegativeStock(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 p-2.5 rounded-lg outline-none"
              >
                <option value="">Is Negative Stock (All)</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="flex justify-end">
        <div className="relative w-full max-w-md">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name, code, brand, sub-category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 text-xs text-slate-800 rounded-lg outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* EXACT DARSH IMPEX PRODUCT STOCK TABLE WITH COLOR-CODED WAREHOUSES */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="p-3 border-r border-slate-200">Sr. No.</th>
                <th className="p-3 border-r border-slate-200">Product Name (As Per Tally)</th>
                <th className="p-3 border-r border-slate-200">Product Code</th>
                <th className="p-3 border-r border-slate-200">Brand</th>
                <th className="p-3 border-r border-slate-200">Sub Category</th>

                {/* UGANDA WAREHOUSE */}
                <th className="p-3 border-r border-slate-200 bg-rose-100/70 text-rose-900 text-center">Uganda</th>
                <th className="p-3 border-r border-slate-200 bg-slate-100 text-center">Uganda Transit</th>
                <th className="p-3 border-r border-slate-200 bg-slate-100 text-center">Uganda Ordered</th>

                {/* CHINA HQ WAREHOUSE */}
                <th className="p-3 border-r border-slate-200 bg-emerald-100/70 text-emerald-900 text-center">China HQ</th>
                <th className="p-3 border-r border-slate-200 bg-slate-100 text-center">China Transit</th>
                <th className="p-3 border-r border-slate-200 bg-slate-100 text-center">China Ordered</th>

                <th className="p-3 text-center">Total Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {stockItems.map((item) => (
                <tr key={item.sr} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 border-r border-slate-200 font-semibold text-slate-500">{item.sr}</td>
                  <td className="p-3 border-r border-slate-200 font-bold text-blue-600 hover:underline cursor-pointer">
                    {item.name_tally}
                  </td>
                  <td className="p-3 border-r border-slate-200 font-mono text-slate-600">{item.code}</td>
                  <td className="p-3 border-r border-slate-200">{item.brand}</td>
                  <td className="p-3 border-r border-slate-200">{item.subcategory}</td>

                  {/* UGANDA QUANTITIES */}
                  <td className="p-3 border-r border-slate-200 bg-rose-50/60 font-bold text-rose-900 text-center font-mono">
                    {item.uganda}
                  </td>
                  <td className="p-3 border-r border-slate-200 bg-slate-50 font-mono text-center text-slate-600">
                    {item.uganda_transit}
                  </td>
                  <td className="p-3 border-r border-slate-200 bg-slate-50 font-mono text-center text-slate-600">
                    {item.uganda_ordered}
                  </td>

                  {/* CHINA QUANTITIES */}
                  <td className="p-3 border-r border-slate-200 bg-emerald-50/60 font-bold text-emerald-900 text-center font-mono">
                    {item.china}
                  </td>
                  <td className="p-3 border-r border-slate-200 bg-slate-50 font-mono text-center text-slate-600">
                    {item.china_transit}
                  </td>
                  <td className="p-3 border-r border-slate-200 bg-slate-50 font-mono text-center text-slate-600">
                    {item.china_ordered}
                  </td>

                  <td className="p-3 font-bold text-slate-900 text-center font-mono text-sm">
                    {item.total_qty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

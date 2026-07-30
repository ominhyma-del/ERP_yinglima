import React, { useState } from 'react';
import { Bot, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>({
    recommended_container: '40ft High Cube (HC)',
    total_volume_cbm: 58.4,
    container_capacity_cbm: 68.0,
    utilization_percentage: 85.88,
    estimated_freight_usd: 3400.0,
    risk_assessment: 'LOW',
    warnings: [
      'Item Citric Acid Anhydrous has license certificate requirements (Health & Phytosanitary Certificate).',
    ],
  });

  const handleRunAiOptimization = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* TOP TITLE BAR */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI Optimization & Risk • Container Packing & Compliance Analysis
          </p>
        </div>
        <button
          onClick={handleRunAiOptimization}
          disabled={analyzing}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <Bot size={16} /> {analyzing ? 'Analyzing Consignment...' : 'Re-Run AI Container Packing'}
        </button>
      </div>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Recommended Container</span>
          <p className="text-lg font-bold text-slate-900">{result.recommended_container}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Volume Utilization</span>
          <p className="text-lg font-bold text-blue-600">{result.utilization_percentage}%</p>
          <span className="text-[10px] text-slate-500">{result.total_volume_cbm} / {result.container_capacity_cbm} m³</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Estimated Freight Cost</span>
          <p className="text-lg font-bold text-emerald-600">${result.estimated_freight_usd.toLocaleString()} USD</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Risk Level</span>
          <p className="text-lg font-bold text-emerald-600 flex items-center gap-1.5">
            <CheckCircle size={18} /> {result.risk_assessment} RISK
          </p>
        </div>
      </div>

      {/* WARNINGS & AI RECOMMENDATION CARD */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="text-amber-500" size={18} /> AI Procurement & Compliance Alerts
        </h3>

        <div className="space-y-2">
          {result.warnings.map((warn: string, idx: number) => (
            <div key={idx} className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2 text-slate-700">
          <p><strong>AI Model Suggestion:</strong> Consignment FB1 can accommodate an additional 9.600 m³ (approx 380 bags of Citric Acid) without triggering an extra container penalty.</p>
        </div>
      </div>
    </div>
  );
};

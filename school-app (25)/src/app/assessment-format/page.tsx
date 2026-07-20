"use client";

import { useState } from 'react';
import { Settings2, Save, CheckCircle2, Percent, Calculator, Info, Loader2, AlertCircle } from 'lucide-react';

export default function AssessmentFormatPage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [format, setFormat] = useState([
    { id: 1, name: 'First Continuous Assessment (CA1)', weight: 20 },
    { id: 2, name: 'Second Continuous Assessment (CA2)', weight: 20 },
    { id: 3, name: 'Final Examination', weight: 60 },
  ]);

  const totalWeight = format.reduce((acc, curr) => acc + curr.weight, 0);

  const handleWeightChange = (id: number, newWeight: number) => {
    setFormat(format.map(item => item.id === id ? { ...item, weight: newWeight } : item));
    setSuccess(false);
  };

  const handleSave = () => {
    if (totalWeight !== 100) {
      alert("Total weight must equal exactly 100%");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assessment Format</h1>
          <p className="text-slate-500">Configure how student grades are calculated across the school.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || totalWeight !== 100}
          className={`flex items-center gap-2 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors ${
            saving || totalWeight !== 100 ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#0033A0] hover:bg-[#002277] shadow-md'
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Format
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center gap-3 animation-fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Assessment format updated successfully! All future broadsheets will use this calculation.</span>
        </div>
      )}

      {totalWeight !== 100 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl flex items-start gap-3 animation-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Invalid Total Weight</span>
            <span className="text-sm mt-1 block">Your current assessment weights add up to {totalWeight}%. They must equal exactly 100% before you can save.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: The Setup */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#0033A0]" />
              <h2 className="font-bold text-slate-900">Grade Weighting Configuration</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {format.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-1">Maximum obtainable score for this section.</p>
                  </div>
                  <div className="flex items-center gap-2 w-32 relative">
                    <input 
                      type="number" 
                      min="0" 
                      max="100"
                      value={item.weight}
                      onChange={(e) => handleWeightChange(item.id, parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-lg font-black text-center text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <Percent className="w-4 h-4 text-slate-400 absolute right-3" />
                  </div>
                </div>
              ))}

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between gap-4">
                <div className="flex-1 text-right">
                  <p className="font-black text-slate-900 text-lg uppercase tracking-wider">Total Weighting</p>
                </div>
                <div className={`w-32 py-3 rounded-lg text-xl font-black text-center border-2 transition-colors ${
                  totalWeight === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {totalWeight}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Info */}
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
            <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5" /> How it works
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              This configuration determines how the columns in the Broadsheet Editor are generated. 
              <br/><br/>
              If you change the CA1 weight to 30%, the Broadsheet will automatically update its maximum input limit for CA1 to 30, and recalculate all student percentages accordingly.
            </p>
          </div>
          
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
              <Info className="w-4 h-4" /> Need more sections?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Custom assessment fields (like Mid-Term Projects or Practical Exams) can be requested through your technical support contact.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

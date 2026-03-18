import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Subscriber } from '../types';
import { Search, Download, ChevronDown, AlertCircle, MapPin, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { resolveLocation, ResolvedLocation } from '../services/locationService';

interface IrregularConsumptionViewProps {
  subscribers: Subscriber[];
  resolvedLocations?: Record<string, ResolvedLocation>;
  onLocationResolved?: (key: string, location: ResolvedLocation) => void;
}

const IrregularConsumptionView: React.FC<IrregularConsumptionViewProps> = ({ 
  subscribers, 
  resolvedLocations = {}, 
  onLocationResolved
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const [monthFilters, setMonthFilters] = useState({
    dec: true,
    jan: true,
    feb: true
  });

  // Filter Logic: Consumption > 0 but no muhatap for selected months
  const filteredData = useMemo(() => {
    return subscribers.filter(sub => {
      // 1. Filter by Search Query
      if (searchQuery && !sub.tesisatNo.includes(searchQuery)) {
        return false;
      }

      // 2. Irregular Consumption Logic
      // If a month is selected, it MUST have consumption > 0 AND no muhatap
      if (monthFilters.dec) {
        const decCons = sub.consumption.dec || 0;
        const hasDecMuhatap = sub.monthsWithMuhatap.includes('dec');
        if (!(decCons > 0 && !hasDecMuhatap)) return false;
      }

      if (monthFilters.jan) {
        const janCons = sub.consumption.jan || 0;
        const hasJanMuhatap = sub.monthsWithMuhatap.includes('jan');
        if (!(janCons > 0 && !hasJanMuhatap)) return false;
      }

      if (monthFilters.feb) {
        const febCons = sub.consumption.feb || 0;
        const hasFebMuhatap = sub.monthsWithMuhatap.includes('feb');
        if (!(febCons > 0 && !hasFebMuhatap)) return false;
      }

      // If no months are selected, don't show anything (or could show all, but this is safer)
      if (!monthFilters.dec && !monthFilters.jan && !monthFilters.feb) return false;

      return true;
    }).sort((a, b) => {
      const sumA = (a.consumption.dec || 0) + (a.consumption.jan || 0) + (a.consumption.feb || 0);
      const sumB = (b.consumption.dec || 0) + (b.consumption.jan || 0) + (b.consumption.feb || 0);
      return sumB - sumA;
    });
  }, [subscribers, searchQuery, monthFilters]);

  const isResolvingRef = useRef(false);
  const visibleData = filteredData.slice(0, visibleCount);

  useEffect(() => {
    if (!onLocationResolved || isResolvingRef.current) return;

    const resolveVisible = async () => {
      const itemsToResolve = visibleData
        .filter(sub => {
          const key = `${sub.location.lat.toFixed(5)},${sub.location.lng.toFixed(5)}`;
          const notResolvedYet = !resolvedLocations[key];
          const hasLocation = sub.location && sub.location.lat !== 0;
          return notResolvedYet && hasLocation;
        })
        .slice(0, 3);

      if (itemsToResolve.length === 0) return;

      isResolvingRef.current = true;
      for (const sub of itemsToResolve) {
        const key = `${sub.location.lat.toFixed(5)},${sub.location.lng.toFixed(5)}`;
        if (resolvedLocations[key]) continue;
        
        try {
          const resolved = await resolveLocation(sub.location.lat, sub.location.lng);
          if (resolved) {
            onLocationResolved(key, resolved);
          }
        } catch (e) {
          console.error("Resolution error in view:", e);
        }
        await new Promise(r => setTimeout(r, 500));
      }
      isResolvingRef.current = false;
    };

    resolveVisible();
  }, [visibleData, resolvedLocations, onLocationResolved]);

  const handleShowMore = () => {
    setVisibleCount(prev => prev + 50);
  };

  const handleExport = () => {
    if (filteredData.length === 0) return;
    const exportData = filteredData.map(row => {
      const resolved = resolvedLocations[`${row.location.lat.toFixed(5)},${row.location.lng.toFixed(5)}`];
      const total = (monthFilters.dec ? (row.consumption.dec || 0) : 0) + 
                    (monthFilters.jan ? (row.consumption.jan || 0) : 0) + 
                    (monthFilters.feb ? (row.consumption.feb || 0) : 0);
      
      const data: any = {
        "Tesisat No": row.tesisatNo,
        "Adres": row.address,
        "İlçe / İl": resolved ? `${resolved.district} / ${resolved.city}` : row.district || "",
      };

      if (monthFilters.dec) data["Aralık (m3)"] = row.consumption.dec;
      if (monthFilters.jan) data["Ocak (m3)"] = row.consumption.jan;
      if (monthFilters.feb) data["Şubat (m3)"] = row.consumption.feb;
      
      data["Toplam Tüketim (Seçili)"] = total;
      data["Durum"] = "Sözleşmesiz Tüketim (Usulsüz)";
      
      return data;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usulsüz_Tuketim");
    XLSX.writeFile(wb, "Usulsuz_Tuketim_Raporu.xlsx");
  };

  return (
    <div className="bg-white rounded-[32px] shadow-apple border border-white/50 flex flex-col h-full overflow-hidden relative">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#F5F5F7] bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shadow-sm">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Usulsüz Tüketim Analizi</h2>
              <p className="text-sm text-[#86868B] font-medium">Sözleşmesi (muhatabı) olmadığı halde tüketim yapmaya devam eden tesisatları listeler.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Search */}
            <div className="flex flex-col gap-1.5 w-full md:w-80">
                <label className="text-xs font-bold text-[#86868B] uppercase ml-1">Tesisat Ara</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Tesisat No..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#F5F5F7] rounded-xl text-sm font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                </div>
            </div>

            {/* Month Filters */}
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#86868B] uppercase ml-1">Analiz Dönemi</label>
                <div className="flex items-center gap-2 bg-[#F5F5F7] p-1 rounded-xl h-[42px]">
                    {[
                        { id: 'dec', label: 'Aralık' },
                        { id: 'jan', label: 'Ocak' },
                        { id: 'feb', label: 'Şubat' }
                    ].map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMonthFilters(prev => ({ ...prev, [m.id]: !prev[m.id as keyof typeof prev] }))}
                            className={`px-4 h-full rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${monthFilters[m.id as keyof typeof monthFilters] ? 'bg-white text-amber-600 shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]'}`}
                        >
                            <div className={`w-3 h-3 rounded-sm border ${monthFilters[m.id as keyof typeof monthFilters] ? 'bg-amber-600 border-amber-600' : 'border-gray-300 bg-white'}`}>
                                {monthFilters[m.id as keyof typeof monthFilters] && <div className="w-full h-full flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full"></div></div>}
                            </div>
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          <button 
              onClick={handleExport}
              disabled={filteredData.length === 0}
              className="h-[42px] bg-white border border-gray-200 hover:bg-gray-50 text-[#1D1D1F] font-bold text-sm rounded-xl px-6 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
              <Download className="h-4 w-4" /> Excel İndir
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#FBFBFD] p-6">
        {filteredData.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] mb-2">Kayıt Bulunamadı</h3>
                <p className="text-gray-500 max-w-md">
                    Kriterlere uygun usulsüz tüketim tespiti yapılamadı.
                </p>
            </div>
        ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {filteredData.length} Şüpheli Kayıt Bulundu
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-md font-bold border border-amber-200">
                        Kritik: Sözleşmesiz Kullanım
                    </span>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-[#86868B] uppercase text-[10px] font-bold tracking-wider border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Tesisat Bilgisi</th>
                            <th className={`px-6 py-4 ${!monthFilters.dec && 'opacity-30'}`}>Aralık</th>
                            <th className={`px-6 py-4 ${!monthFilters.jan && 'opacity-30'}`}>Ocak</th>
                            <th className={`px-6 py-4 ${!monthFilters.feb && 'opacity-30'}`}>Şubat</th>
                            <th className="px-6 py-4">Toplam (Seçili)</th>
                            <th className="px-6 py-4">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {visibleData.map((row, idx) => {
                            const total = (monthFilters.dec ? (row.consumption.dec || 0) : 0) + 
                                          (monthFilters.jan ? (row.consumption.jan || 0) : 0) + 
                                          (monthFilters.feb ? (row.consumption.feb || 0) : 0);
                            return (
                                <tr key={idx} className="hover:bg-amber-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[#1D1D1F] font-mono">{row.tesisatNo}</span>
                                            <div className="flex items-center gap-1 mt-1">
                                                <MapPin className="h-3 w-3 text-amber-400" />
                                                <span className="text-[10px] text-gray-500 font-medium">
                                                    {(() => {
                                                        const resolved = resolvedLocations[`${row.location.lat.toFixed(5)},${row.location.lng.toFixed(5)}`];
                                                        if (resolved) return `${resolved.district} / ${resolved.city}`;
                                                        return row.district || 'Belirleniyor...';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`px-6 py-4 font-mono font-bold ${monthFilters.dec ? 'text-gray-700' : 'text-gray-300'}`}>{row.consumption.dec}</td>
                                    <td className={`px-6 py-4 font-mono font-bold ${monthFilters.jan ? 'text-gray-700' : 'text-gray-300'}`}>{row.consumption.jan}</td>
                                    <td className={`px-6 py-4 font-mono font-bold ${monthFilters.feb ? 'text-gray-700' : 'text-gray-300'}`}>{row.consumption.feb}</td>
                                    <td className="px-6 py-4 font-mono font-bold text-amber-600">{total.toFixed(1)}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 w-fit">
                                            SÖZLEŞMESİZ KULLANIM
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {visibleCount < filteredData.length && (
                    <div className="p-4 border-t border-gray-100 flex justify-center">
                        <button 
                            onClick={handleShowMore}
                            className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
                        >
                            Daha Fazla Göster <ChevronDown className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default IrregularConsumptionView;

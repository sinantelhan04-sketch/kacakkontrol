

import React, { useState, useEffect, useRef } from 'react';
import { RiskScore } from '../types';
import { ThermometerSnowflake, User, Building2, AlertCircle, ChevronDown, Download, Search, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { resolveLocation, ResolvedLocation } from '../services/locationService';

interface Rule120TableProps {
  data: RiskScore[];
  resolvedLocations?: Record<string, ResolvedLocation>;
  onLocationResolved?: (key: string, location: ResolvedLocation) => void;
}

const Rule120Table: React.FC<Rule120TableProps> = ({ data, resolvedLocations = {}, onLocationResolved }) => {
  const [visibleCount, setVisibleCount] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const isResolvingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleCount(50);
    }, 0);
    return () => clearTimeout(timer);
  }, [data, searchQuery]);

  const handleShowMore = () => {
    setVisibleCount(prev => prev + 50);
  };

  const filteredData = data.filter(row => row.tesisatNo.includes(searchQuery));
  const visibleData = filteredData.slice(0, visibleCount);

  // Sequential location resolution is now handled in App.tsx
  // But we can still keep a small effect here to trigger resolution for visible items if they are not yet in the global map
  useEffect(() => {
    if (!onLocationResolved || isResolvingRef.current) return;

    const resolveVisible = async () => {
      const itemsToResolve = visibleData
        .filter(sub => {
          const key = `${sub.location.lat},${sub.location.lng}`;
          const notResolvedYet = !resolvedLocations[key];
          const hasLocation = sub.location && sub.location.lat !== 0;
          return notResolvedYet && hasLocation;
        })
        .slice(0, 3);

      if (itemsToResolve.length === 0) return;

      isResolvingRef.current = true;
      for (const sub of itemsToResolve) {
        const key = `${sub.location.lat},${sub.location.lng}`;
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

  const handleExport = () => {
    const exportData = filteredData.map(row => {
        const resolved = resolvedLocations[`${row.location.lat},${row.location.lng}`];
        return {
            "Tesisat No": row.tesisatNo,
            "Muhatap No": row.muhatapNo,
            "Bağlantı Nesnesi": row.baglantiNesnesi,
            "Abone Tipi": row.rawAboneTipi || row.aboneTipi,
            "Aralık (m3)": row.rule120Data?.dec,
            "Ocak (m3)": row.rule120Data?.jan,
            "Şubat (m3)": row.rule120Data?.feb,
            "3 Aylık Toplam": (row.rule120Data?.dec || 0) + (row.rule120Data?.jan || 0) + (row.rule120Data?.feb || 0),
            "Risk Durumu": "120 Kuralı İhlali (25 < Tüketim < 110)",
            "Adres": resolved?.fullName || row.address,
            "İlçe (OSM)": resolved?.district || ""
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "120_Kurali_Analizi");
    XLSX.writeFile(wb, "120_Kurali_Analiz_Raporu.xlsx");
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden flex flex-col h-full relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
      
      <div className="p-5 border-b border-blue-100 bg-white sticky top-0 z-10 flex justify-between items-center backdrop-blur-xl">
        <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2.5">
            <div className="bg-blue-50 p-1.5 rounded-md border border-blue-200 animate-pulse">
                <ThermometerSnowflake className="h-5 w-5 text-blue-500" />
            </div>
            120 Kuralı Analizi
            </h3>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-500 rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95"
                title="Listeyi Excel olarak indir"
            >
                <Download className="h-3.5 w-3.5" />
                Excel İndir
            </button>
        </div>
        
        <div className="flex items-center gap-4">
             {/* Search Input */}
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300" />
                <input 
                    type="text" 
                    placeholder="Tesisat Ara..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-sm font-medium text-slate-700 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all w-48"
                />
            </div>

             <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Kriter: 25 &lt; Ara, Oca, Şub &lt; 110
                </span>
                <span className="text-[9px] text-slate-500">
                    Üç ay da belirtilen aralıkta olmalı.
                </span>
            </div>
        </div>
      </div>
      
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-left text-sm text-slate-500">
          <thead className="bg-blue-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-0">
            <tr>
              <th className="px-6 py-4">Tesisat No</th>
              <th className="px-6 py-4">Abone Tipi</th>
              <th className="px-6 py-4">Aralık (sm³)</th>
              <th className="px-6 py-4">Ocak (sm³)</th>
              <th className="px-6 py-4">Şubat (sm³)</th>
              <th className="px-6 py-4">Durum</th>
              <th className="px-6 py-4">Adres</th>
              <th className="px-6 py-4">Risk Skoru</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50">
            {visibleData.map((row, index) => {
               const dec = row.rule120Data?.dec || 0;
               const jan = row.rule120Data?.jan || 0;
               const feb = row.rule120Data?.feb || 0;
               const total = dec + jan + feb;
               
               return (
                <tr key={row.tesisatNo} 
                    className="hover:bg-blue-50/50 transition-colors duration-200 group table-row-animate"
                    style={{ animationDelay: `${index % 20 * 30}ms` }}
                >
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 group-hover:text-black font-mono transition-colors">{row.tesisatNo}</span>
                            <span className="text-xs text-slate-400 font-mono mt-0.5">{row.muhatapNo}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            {row.aboneTipi === 'Commercial' ? (
                                <div className="p-1.5 bg-orange-50 rounded text-orange-600 border border-orange-200">
                                    <Building2 className="h-3 w-3" />
                                </div>
                            ) : (
                                <div className="p-1.5 bg-blue-50 rounded text-blue-600 border border-blue-200">
                                    <User className="h-3 w-3" />
                                </div>
                            )}
                            <span className="text-xs font-medium text-slate-600">
                                {row.rawAboneTipi || (row.aboneTipi === 'Commercial' ? 'Ticari' : 'Mesken')}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`font-mono px-2 py-1 rounded text-xs font-bold ${
                            dec < 50 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                            {dec}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`font-mono px-2 py-1 rounded text-xs font-bold ${
                            jan < 50 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                            {jan}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`font-mono px-2 py-1 rounded text-xs font-bold ${
                            feb < 50 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                            {feb}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        {total < 150 ? (
                            <div className="flex flex-col">
                                <span className="text-red-600 text-xs font-bold flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Çok Kritik
                                </span>
                                <span className="text-[9px] text-slate-400">3 ay toplamı çok düşük.</span>
                            </div>
                        ) : (
                             <div className="flex flex-col">
                                <span className="text-orange-500 text-xs font-bold flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    İncelenmeli
                                </span>
                                <span className="text-[9px] text-slate-400">Ortalamanın çok altında.</span>
                            </div>
                        )}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1 text-slate-600 font-bold mb-0.5" title={(() => {
                                const resolved = resolvedLocations[`${row.location.lat},${row.location.lng}`];
                                return resolved?.fullName || 'Konum Belirleniyor...';
                            })()}>
                                <MapPin className="h-3 w-3 text-blue-400" />
                                <span className="text-xs">
                                    {(() => {
                                        const resolved = resolvedLocations[`${row.location.lat},${row.location.lng}`];
                                        if (resolved) return `${resolved.district} / ${resolved.city}`;
                                        return row.district || 'Belirleniyor...';
                                    })()}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono ml-4">
                                {row.location.lat.toFixed(4)}, {row.location.lng.toFixed(4)}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                             <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, row.totalScore)}%` }}></div>
                             </div>
                             <span className="font-mono text-xs text-blue-600">{row.totalScore}</span>
                        </div>
                    </td>
                </tr>
               );
            })}
            {visibleCount < filteredData.length && (
                <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                        <button 
                            onClick={handleShowMore}
                            className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            Daha Fazla Göster ({filteredData.length - visibleCount} kaldı)
                            <ChevronDown className="h-3 w-3" />
                        </button>
                    </td>
                </tr>
            )}
            {filteredData.length === 0 && (
                <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <p>{searchQuery ? 'Arama sonucu bulunamadı.' : '120 Kuralı kriterine uyan kayıt bulunamadı.'}</p>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Rule120Table;

import React, { useState, useEffect, useRef } from 'react';
import { RiskScore } from '../types';
import { TrendingDown, GraduationCap, Filter, AlertOctagon, Activity, ChevronDown, Download, Search, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { resolveLocation, ResolvedLocation } from '../services/locationService';

interface InconsistentTableProps {
  data: RiskScore[];
  resolvedLocations?: Record<string, ResolvedLocation>;
  onLocationResolved?: (key: string, location: ResolvedLocation) => void;
}

const InconsistentTable: React.FC<InconsistentTableProps> = ({ data, resolvedLocations = {}, onLocationResolved }) => {
  const [hideSemester, setHideSemester] = useState(true);
  const [visibleCount, setVisibleCount] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const isResolvingRef = useRef(false);

  // Filter logic: 
  const filteredData = data.filter(row => {
      // 1. Search Query
      if (searchQuery && !row.tesisatNo.includes(searchQuery)) return false;

      // 2. Hide Semester
      const isOnlySemester = row.inconsistentData.isSemesterSuspect && !row.inconsistentData.hasWinterDrop;
      if (hideSemester && isOnlySemester) return false;
      
      return true;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleCount(50);
    }, 0);
    return () => clearTimeout(timer);
  }, [data, hideSemester, searchQuery]);

  const handleShowMore = () => {
    setVisibleCount(prev => prev + 50);
  };

  const visibleData = filteredData.slice(0, visibleCount);

  // Sequential location resolution is now handled in App.tsx
  // But we can still keep a small effect here to trigger resolution for visible items if they are not yet in the global map
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
        .slice(0, 5); // Increased slice for parallel resolution

      if (itemsToResolve.length === 0) return;

      isResolvingRef.current = true;

      const resolveWithRetry = async (sub: RiskScore, attempt = 1): Promise<void> => {
        const key = `${sub.location.lat.toFixed(5)},${sub.location.lng.toFixed(5)}`;
        if (resolvedLocations[key]) return;

        try {
          const resolved = await resolveLocation(sub.location.lat, sub.location.lng);
          if (resolved) {
            onLocationResolved(key, resolved);
          } else if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1000));
            return resolveWithRetry(sub, attempt + 1);
          }
        } catch {
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1000));
            return resolveWithRetry(sub, attempt + 1);
          }
        }
      };

      // Resolve visible items sequentially with stagger
      for (const sub of itemsToResolve) {
        await resolveWithRetry(sub);
        await new Promise(r => setTimeout(r, 300));
      }
      
      isResolvingRef.current = false;
    };

    resolveVisible();
  }, [visibleData, resolvedLocations, onLocationResolved]);

  const handleExport = () => {
    const exportData = filteredData.map(row => {
        const resolved = resolvedLocations[`${row.location.lat.toFixed(5)},${row.location.lng.toFixed(5)}`];
        return {
            "Tesisat No": row.tesisatNo,
            "Muhatap No": row.muhatapNo,
            "Bağlantı Nesnesi": row.baglantiNesnesi,
            "Abone Tipi": row.rawAboneTipi || row.aboneTipi,
            "Tutarsızlık Detayı": row.inconsistentData.dropDetails.join(' | '),
            "Sinyal Türü": row.inconsistentData.isSemesterSuspect && !row.inconsistentData.hasWinterDrop 
                           ? 'Olası Sömestr' 
                           : (row.inconsistentData.volatilityScore > 0 ? 'ZigZag (Dalgalı)' : 'Kritik Düşüş'),
            "Risk Puanı": row.breakdown.trendInconsistency,
            "İlçe / İl": resolved ? `${resolved.district} / ${resolved.city}` : row.district || ""
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tutarsiz_Tuketim");
    XLSX.writeFile(wb, "Tutarsiz_Tuketim_Raporu.xlsx");
  };

  return (
    <div className="bg-white rounded-2xl border border-pink-200 shadow-sm overflow-hidden flex flex-col h-full relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-pink-500"></div>
      
      <div className="p-5 border-b border-pink-100 bg-white sticky top-0 z-10 flex justify-between items-center backdrop-blur-xl">
        <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2.5">
            <div className="bg-pink-50 p-1.5 rounded-md border border-pink-200">
                <TrendingDown className="h-5 w-5 text-pink-500" />
            </div>
            Tutarsız Kış Tüketimleri
            </h3>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-pink-300 hover:text-pink-600 text-slate-500 rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95"
                title="Listeyi Excel olarak indir"
            >
                <Download className="h-3.5 w-3.5" />
                Excel İndir
            </button>
        </div>
        
        <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-300" />
                <input 
                    type="text" 
                    placeholder="Tesisat Ara..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-pink-50 border border-pink-100 rounded-full text-sm font-medium text-slate-700 placeholder-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all w-48"
                />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <button 
                    onClick={() => setHideSemester(!hideSemester)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-all duration-300 ${hideSemester ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}
                >
                    <GraduationCap className="h-3.5 w-3.5" />
                    {hideSemester ? 'Sömestr Tatilini Gizle' : 'Tümünü Göster'}
                </button>
            </div>
        </div>
      </div>
      
      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-left text-sm text-slate-500">
          <thead className="bg-pink-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-0">
            <tr>
              <th className="px-6 py-4">Tesisat No</th>
              <th className="px-6 py-4">Abone Tipi</th>
              <th className="px-6 py-4">Tespit Edilen Tutarsızlık</th>
              <th className="px-6 py-4">Sinyal Türü</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-100/50">
            {visibleData.map((row, index) => {
               const isSemester = row.inconsistentData.isSemesterSuspect;
               const hasDrop = row.inconsistentData.hasWinterDrop;

               return (
                <tr key={row.tesisatNo} 
                    className="hover:bg-pink-50/50 transition-colors duration-200 group table-row-animate"
                    style={{ animationDelay: `${index % 20 * 30}ms` }}
                >
                    <td className="px-6 py-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-800 group-hover:text-black font-mono transition-colors">{row.tesisatNo}</span>
                            <span className="text-xs text-slate-400 font-mono mt-0.5">{row.muhatapNo}</span>
                            <div className="flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3 text-pink-400" />
                                <span className="text-[10px] text-slate-500 font-medium">
                                    {(() => {
                                        const resolved = resolvedLocations[`${row.location.lat.toFixed(5)},${row.location.lng.toFixed(5)}`];
                                        if (resolved) return `${resolved.district} / ${resolved.city}`;
                                        return row.district || 'Belirleniyor...';
                                    })()}
                                </span>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs font-medium text-slate-600">
                          {row.rawAboneTipi || (row.aboneTipi === 'Commercial' ? 'Ticari' : 'Mesken')}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                            {row.inconsistentData.dropDetails.map((detail, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                                    {detail}
                                </div>
                            ))}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        {isSemester && !hasDrop ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-indigo-50 text-indigo-600 border-indigo-200">
                                <GraduationCap className="h-3 w-3" />
                                Olası Sömestr
                            </span>
                        ) : row.inconsistentData.volatilityScore > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-yellow-50 text-yellow-600 border-yellow-200">
                                <Activity className="h-3 w-3" />
                                Dalgalı (ZigZag)
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border bg-red-50 text-red-600 border-red-200">
                                <AlertOctagon className="h-3 w-3" />
                                Kritik Düşüş
                            </span>
                        )}
                    </td>
                </tr>
               );
            })}
             {visibleCount < filteredData.length && (
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
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
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                             <Filter className="h-8 w-8 text-slate-300" />
                             <p>{searchQuery ? 'Arama sonucu bulunamadı.' : 'Kriterlere uyan tutarsız tüketim bulunamadı.'}</p>
                             {hideSemester && !searchQuery && <p className="text-xs text-indigo-500">Sömestr filtresi aktif. Devre dışı bırakmayı deneyin.</p>}
                        </div>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InconsistentTable;

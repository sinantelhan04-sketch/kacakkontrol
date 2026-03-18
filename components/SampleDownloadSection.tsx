import React from 'react';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const SampleDownloadSection: React.FC = () => {
    const downloadReferenceSample = (format: 'xlsx' | 'csv') => {
        const data = [
            { "Tesisat No": "1000001", "Muhatap No": "5000001" },
            { "Tesisat No": "1000002", "Muhatap No": "5000002" },
            { "Tesisat No": "1000003", "Muhatap No": "5000003" },
            { "Tesisat No": "1000004", "Muhatap No": "5000004" },
            { "Tesisat No": "1000005", "Muhatap No": "5000005" },
        ];

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Referans");
        
        if (format === 'xlsx') {
            XLSX.writeFile(wb, "referans_ornek.xlsx");
        } else {
            XLSX.writeFile(wb, "referans_ornek.csv", { bookType: 'csv' });
        }
    };

    const downloadConsumptionSample = (format: 'xlsx' | 'csv') => {
        const data = [
            {
                "Tesisat No": "1000001",
                "Muhatap No": "5000001",
                "Adres": "Atatürk Mah. No:1",
                "Il": "İSTANBUL",
                "Ilce": "KADIKÖY",
                "Enlem": 40.991,
                "Boylam": 29.023,
                "Abone Tipi": "MESKEN",
                "Aralık": 150,
                "Ocak": 180,
                "Şubat": 160,
                "Haziran": 20,
                "Temmuz": 15,
                "Ağustos": 18
            },
            {
                "Tesisat No": "1000002",
                "Muhatap No": "5000002",
                "Adres": "Cumhuriyet Cad. No:10",
                "Il": "İSTANBUL",
                "Ilce": "BEŞİKTAŞ",
                "Enlem": 41.042,
                "Boylam": 29.008,
                "Abone Tipi": "TİCARİ",
                "Aralık": 500,
                "Ocak": 550,
                "Şubat": 520,
                "Haziran": 100,
                "Temmuz": 90,
                "Ağustos": 95
            },
            {
                "Tesisat No": "1000003",
                "Muhatap No": "5000003",
                "Adres": "İstiklal Cad. No:50",
                "Il": "İSTANBUL",
                "Ilce": "BEYOĞLU",
                "Enlem": 41.034,
                "Boylam": 28.978,
                "Abone Tipi": "MESKEN",
                "Aralık": 0,
                "Ocak": 0,
                "Şubat": 0,
                "Haziran": 30,
                "Temmuz": 25,
                "Ağustos": 28
            }
        ];

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tuketim");
        
        if (format === 'xlsx') {
            XLSX.writeFile(wb, "tuketim_ornek.xlsx");
        } else {
            XLSX.writeFile(wb, "tuketim_ornek.csv", { bookType: 'csv' });
        }
    };

    return (
        <div className="w-full max-w-4xl mt-12 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-apple-blue/10 flex items-center justify-center">
                    <Download className="h-5 w-5 text-apple-blue" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-[#1D1D1F]">Örnek Veri Şablonları</h3>
                    <p className="text-sm text-[#86868B] font-medium">Analiz için gerekli dosya formatlarını buradan indirebilirsiniz.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reference Sample */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[#1D1D1F]">Referans Listesi</h4>
                                <p className="text-[11px] text-[#86868B] font-medium">Sabıkalı tesisat/muhatap listesi</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => downloadReferenceSample('xlsx')}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#F5F5F7] hover:bg-gray-200 rounded-xl text-xs font-bold text-[#1D1D1F] transition-all"
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" /> XLSX
                        </button>
                        <button 
                            onClick={() => downloadReferenceSample('csv')}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#F5F5F7] hover:bg-gray-200 rounded-xl text-xs font-bold text-[#1D1D1F] transition-all"
                        >
                            <FileText className="h-3.5 w-3.5 text-blue-600" /> CSV
                        </button>
                    </div>
                </div>

                {/* Consumption Sample */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[#1D1D1F]">Tüketim Verisi</h4>
                                <p className="text-[11px] text-[#86868B] font-medium">Abonelik ve tüketim detayları</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => downloadConsumptionSample('xlsx')}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#F5F5F7] hover:bg-gray-200 rounded-xl text-xs font-bold text-[#1D1D1F] transition-all"
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" /> XLSX
                        </button>
                        <button 
                            onClick={() => downloadConsumptionSample('csv')}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#F5F5F7] hover:bg-gray-200 rounded-xl text-xs font-bold text-[#1D1D1F] transition-all"
                        >
                            <FileText className="h-3.5 w-3.5 text-blue-600" /> CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SampleDownloadSection;

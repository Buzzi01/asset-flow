'use client';
import { Layers, X, Download, Calendar, Info, ExternalLink } from 'lucide-react';

export const ReportModal = ({ isOpen, onClose, ativo }: { isOpen: boolean, onClose: () => void, ativo: any }) => {
    if (!isOpen || !ativo) return null;

    const report = ativo.last_report;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f172a] w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/30">
                            <Layers size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm tracking-tight">{ativo.ticker}</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Central de Documentos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Corpo */}
                <div className="p-6">
                    {report?.link ? (
                        <div className="space-y-4">
                            <div className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl space-y-3">
                                <div className="flex items-start gap-3">
                                    <Calendar size={14} className="text-blue-400 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Data de Emissão</p>
                                        <p className="text-sm text-slate-200 font-medium">{report.date}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Info size={14} className="text-blue-400 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold">Tipo de Documento</p>
                                        <p className="text-sm text-slate-200 font-medium">{report.type}</p>
                                    </div>
                                </div>
                            </div>

                            <a
                                href={report.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20 group"
                            >
                                Visualizar PDF Oficial
                                <ExternalLink size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </a>
                        </div>
                    ) : (
                        <div className="py-8 text-center space-y-3">
                            <div className="mx-auto w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                                <Layers size={20} className="text-slate-500" />
                            </div>
                            <p className="text-sm text-slate-400">Nenhum relatório encontrado para este ativo.</p>
                            <p className="text-[10px] text-slate-600 uppercase font-bold">Sincronize os dados na página principal</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    FileText, Info, Layers, X, ExternalLink, Calendar,
    TrendingUp, TrendingDown, Activity
} from 'lucide-react';
import { formatMoney } from '../utils';
import { usePrivacy } from '../context/PrivacyContext';

// Interface para os dados fundamentalistas vindos do motor CVM
interface FundamentalistData {
    ticker_info: {
        ultimo_periodo: string;
        data_base: string;
    };
    cards_indicadores: Array<{
        titulo: string;
        valor?: number;
        valor_formatado?: string;
        yoy?: number;
        qoq?: number;
        status?: 'positivo' | 'negativo';
        tipo?: string;
    }>;
    evolucao_grafico: Array<{
        label: string;
        receita: number;
        lucro: number;
    }>;
}

const PrivateValue = ({ value, isHidden, className = "" }: { value: string | number, isHidden: boolean, className?: string }) => (
    <span className={className}>{isHidden ? '••••••' : value}</span>
);

const ReportModal = ({ isOpen, onClose, ativo }: { isOpen: boolean, onClose: () => void, ativo: any }) => {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'docs' | 'saude'>('docs');
    const { isHidden } = usePrivacy() as any;

    useEffect(() => {
        setMounted(true);
        if (ativo?.tipo === 'Ação') setActiveTab('saude');
        return () => setMounted(false);
    }, [isOpen, ativo]);

    if (!isOpen || !ativo || !mounted) return null;

    // --- LÓGICA DE EXTRAÇÃO DE DADOS ---
    let reports: any[] = [];
    let fundamentalist: FundamentalistData | null = ativo.fundamentalist_data || null;

    try {
        const rawData = ativo.last_report_type;

        // Verifica se a coluna last_report_type contém o JSON de fundamentos ou lista de documentos
        if (typeof rawData === 'string' && rawData.trim().startsWith('{')) {
            const parsedData = JSON.parse(rawData);

            if (ativo.tipo === 'Ação') {
                // Se for ação, o JSON principal é a análise fundamentalista
                fundamentalist = parsedData as FundamentalistData;
            } else {
                // Se for FII, mapeia como lista de documentos (Gerencial, Mensal, etc)
                reports = Object.values(parsedData);
            }
        }

        // Fallback: se não houver JSON mas houver uma URL direta
        if (reports.length === 0 && ativo.last_report_url) {
            reports = [{
                link: ativo.last_report_url,
                date: ativo.last_report_at || "Recente",
                type: (typeof rawData === 'string' && rawData.length > 2) ? rawData : "Relatório Geral"
            }];
        }
    } catch (e) {
        console.error("Erro ao processar dados de relatórios/fundamentos:", e);
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f172a] w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* HEADER */}
                <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/30">
                            <Layers size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm tracking-tight">{ativo.ticker}</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Análise de Ativo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* SELECTOR DE ABAS */}
                <div className="flex p-1 bg-slate-900 border-b border-slate-800">
                    <button
                        onClick={() => setActiveTab('saude')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase transition-all rounded-md ${activeTab === 'saude' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Activity size={14} /> Saúde Financeira
                    </button>
                    <button
                        onClick={() => setActiveTab('docs')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold uppercase transition-all rounded-md ${activeTab === 'docs' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <FileText size={14} /> Documentos
                    </button>
                </div>

                {/* CONTEÚDO */}
                <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar flex-1">

                    {/* ABA: SAÚDE FINANCEIRA (FUNDAMENTOS CVM) */}
                    {activeTab === 'saude' && (
                        <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
                            {fundamentalist ? (
                                <>
                                    <div className="grid grid-cols-1 gap-3">
                                        {fundamentalist.cards_indicadores.map((card, i) => (
                                            <div key={i} className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl flex justify-between items-center hover:bg-slate-800/60 transition-colors group">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{card.titulo}</p>
                                                    <p className="text-sm text-slate-200 font-bold font-mono">
                                                        <PrivateValue
                                                            value={card.valor_formatado || formatMoney(card.valor || 0)}
                                                            isHidden={isHidden}
                                                        />
                                                    </p>
                                                </div>

                                                {/* ÁREA DE CRESCIMENTO (YoY e QoQ) */}
                                                <div className="text-right flex flex-col gap-1.5">
                                                    {/* YoY - Year over Year */}
                                                    {card.yoy !== undefined && (
                                                        <div className={`flex items-center justify-end gap-1 text-[10px] font-bold ${card.yoy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {card.yoy > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                            {card.yoy > 0 ? '+' : ''}{card.yoy}%
                                                            <span className="text-[8px] opacity-60 ml-0.5 font-normal text-slate-400">YoY</span>
                                                        </div>
                                                    )}

                                                    {/* QoQ - Quarter over Quarter */}
                                                    {card.qoq !== undefined && (
                                                        <div className={`flex items-center justify-end gap-1 text-[10px] font-bold ${card.qoq >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                                            {card.qoq > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                            {card.qoq > 0 ? '+' : ''}{card.qoq}%
                                                            <span className="text-[8px] opacity-60 ml-0.5 font-normal text-slate-400">QoQ</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-lg text-center">
                                        <p className="text-[9px] text-blue-400/70 font-bold uppercase tracking-widest">
                                            Dados Oficiais CVM • Ref: {fundamentalist.ticker_info.ultimo_periodo}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="py-12 text-center space-y-3">
                                    <Activity size={32} className="text-slate-800 mx-auto animate-pulse" />
                                    <p className="text-xs text-slate-500 italic text-center px-4">
                                        Nenhum dado fundamentalista processado. Clique no botão de sincronização no dashboard.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ABA: DOCUMENTOS (RELATÓRIOS FII/PDFS) */}
                    {activeTab === 'docs' && (
                        <div className="space-y-3 animate-in slide-in-from-left-2 duration-300">
                            {reports.length > 0 ? (
                                reports.map((doc: any, i: number) => (
                                    <div key={i} className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl space-y-3 hover:bg-slate-800/60 transition-colors group">
                                        <div className="flex flex-col gap-2">
                                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                                {(doc.type || "").toLowerCase().includes('gerencial') ? '⭐ Relatório Principal' : 'Documento Oficial'}
                                            </span>
                                            <div className="flex items-start gap-3">
                                                <Calendar size={14} className="text-blue-400 mt-0.5" />
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Emissão</p>
                                                    <p className="text-xs text-slate-200 font-medium">{doc.date || 'Não informada'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {typeof doc.link === 'string' && doc.link.length > 0 ? (
                                            <a
                                                href={doc.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-blue-600 text-white py-2 rounded-lg font-bold text-[10px] uppercase transition-all"
                                            >
                                                Visualizar PDF <ExternalLink size={12} />
                                            </a>
                                        ) : (
                                            <div className="w-full py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-center text-[10px] text-slate-600 font-bold uppercase">
                                                Link Indisponível
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-slate-500 text-xs italic">Nenhum documento disponível para este ativo.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ReportModal;
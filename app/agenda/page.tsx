'use client';
import { useEffect, useState } from 'react';
import { Calendar as CalIcon, ArrowLeft, Clock, CheckCircle2, AlertCircle, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { formatMoney } from '../utils';

interface Evento {
  ticker: string;
  date: string;
  type: string;
  total: number;
  status: string;
  value_per_share: number;
  is_estimate: boolean; // 👈 Nova propriedade vinda do backend
}

export default function AgendaPage() {
  const [events, setEvents] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5328/api/calendar')
      .then(res => res.json())
      .then(data => { 
        setEvents(data); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, []);

  // Agrupa eventos por Mês
  const grouped = events.reduce((acc, evt) => {
    const key = evt.date.substring(0, 7); // "2024-12"
    if (!acc[key]) acc[key] = [];
    acc[key].push(evt);
    return acc;
  }, {} as Record<string, Evento[]>);

  const months = Object.keys(grouped).sort(); // Cronológico (mais próximo primeiro)

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <CalIcon className="text-blue-500" /> Agenda de Proventos
              </h1>
              <p className="text-sm text-slate-500 font-medium">Previsões e Anúncios Futuros Detectados</p>
            </div>
          </div>
        </div>

        {/* Legenda Rápida */}
        <div className="flex gap-4 mb-6 px-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Confirmado
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <div className="w-2 h-2 rounded-full bg-slate-700 border border-dashed border-slate-500"></div> Estimado (Projeção)
            </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-20 text-slate-500 gap-3 animate-pulse">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
            <p className="text-sm font-medium">Sincronizando com Yahoo Finance...</p>
          </div>
        )}

        {/* Lista de Eventos */}
        <div className="space-y-8">
          {months.map(month => {
            const [y, m] = month.split('-');
            const dateObj = new Date(parseInt(y), parseInt(m)-1, 1);
            const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const totalMonth = grouped[month].reduce((acc, curr) => acc + curr.total, 0);

            return (
              <div key={month} className="animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-end border-b border-slate-800 pb-2 mb-4">
                  <h2 className="text-xl font-bold capitalize text-slate-300">{monthName}</h2>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Total Estimado</p>
                    <span className="text-blue-400 font-mono font-bold bg-blue-950/30 px-2 py-1 rounded text-sm">
                        + {formatMoney(totalMonth)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3">
                  {grouped[month].map((evt, i) => (
                    <div 
                        key={i} 
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                            evt.is_estimate 
                                ? 'bg-slate-900/40 border-dashed border-slate-800 opacity-70' 
                                : 'bg-slate-900 border-emerald-900/30 shadow-lg shadow-emerald-950/10'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Data Box */}
                        <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center border font-bold ${
                          evt.is_estimate 
                            ? 'bg-slate-800 text-slate-500 border-slate-700' 
                            : 'bg-emerald-950 text-emerald-400 border-emerald-900'
                        }`}>
                          <span className="text-[10px] uppercase opacity-70">{evt.date.split('-')[1]}</span>
                          <span className="text-lg">{evt.date.split('-')[2]}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-lg">{evt.ticker}</span>
                            {evt.is_estimate ? (
                              <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700 font-bold">ESTIMADO</span>
                            ) : (
                              <span className="text-[9px] bg-emerald-600/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">CONFIRMADO</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatMoney(evt.value_per_share)} por cota
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-mono font-bold text-lg ${evt.is_estimate ? 'text-slate-400' : 'text-emerald-400'}`}>
                          {formatMoney(evt.total)}
                        </p>
                        <div className={`text-[10px] flex items-center justify-end gap-1 font-medium ${evt.is_estimate ? 'text-slate-600' : 'text-emerald-500/70'}`}>
                          {evt.is_estimate ? <Clock size={10}/> : <CalendarCheck size={10}/>}
                          {evt.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {!loading && events.length === 0 && (
            <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                <AlertCircle className="mx-auto text-slate-700 mb-3" size={40} />
                <p className="text-slate-500 text-sm">Nenhum anúncio de provento futuro encontrado para sua carteira atual.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
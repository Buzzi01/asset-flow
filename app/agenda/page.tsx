'use client';
import { useEffect, useState } from 'react';
import { Calendar as CalIcon, ArrowLeft, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { formatMoney } from '../utils';

interface Evento {
  ticker: string;
  date: string;
  type: string;
  total: number;
  status: string;
  value_per_share: number;
}

export default function AgendaPage() {
  const [events, setEvents] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5328/api/calendar')
      .then(res => res.json())
      .then(data => { setEvents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Agrupa eventos por Mês
  const grouped = events.reduce((acc, evt) => {
    const key = evt.date.substring(0, 7); // "2024-12"
    if (!acc[key]) acc[key] = [];
    acc[key].push(evt);
    return acc;
  }, {} as Record<string, Evento[]>);

  const months = Object.keys(grouped).sort().reverse(); // Decrescente

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CalIcon className="text-blue-500" /> Agenda de Proventos
            </h1>
            <p className="text-sm text-slate-500">Histórico de 12 meses e Previsões Futuras</p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-20 text-slate-500 gap-3 animate-pulse">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
            <p>Consultando B3 e Yahoo...</p>
          </div>
        )}

        {/* Lista */}
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
                  <span className="text-emerald-400 font-mono font-bold bg-emerald-950/30 px-2 py-1 rounded text-sm">
                    + {formatMoney(totalMonth)}
                  </span>
                </div>

                <div className="grid gap-3">
                  {grouped[month].map((evt, i) => {
                    const isFuture = evt.status === 'Agendado';
                    return (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isFuture ? 'bg-slate-900 border-blue-900/50' : 'bg-slate-900/50 border-slate-800'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center border font-bold ${
                            isFuture ? 'bg-blue-950 text-blue-400 border-blue-900' : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            <span className="text-[10px] uppercase opacity-70">{evt.date.split('-')[1]}</span>
                            <span className="text-lg">{evt.date.split('-')[2]}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-lg">{evt.ticker}</span>
                              {isFuture && <span className="text-[10px] bg-blue-600 text-white px-2 rounded-full">FUTURO</span>}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatMoney(evt.value_per_share)} / cota
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-bold text-lg ${isFuture ? 'text-blue-400' : 'text-emerald-400'}`}>
                            {formatMoney(evt.total)}
                          </p>
                          <p className="text-xs text-slate-600 flex items-center justify-end gap-1">
                            {isFuture ? <Clock size={12}/> : <CheckCircle2 size={12}/>}
                            {evt.status}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
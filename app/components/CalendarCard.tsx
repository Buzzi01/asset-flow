import { useEffect, useState } from 'react';
import { Calendar, Clock, DollarSign, CalendarClock } from 'lucide-react';
import { formatMoney } from '../utils';

interface Evento {
  ticker: string;
  date: string;
  type: string;
  total: number;
  status: string;
  value_per_share: number;
}

export const CalendarCard = () => {
  const [events, setEvents] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5328/api/calendar')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(e => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    // Adiciona o timezone offset para corrigir bug de dia anterior
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);
    return correctedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-700/50 p-6 h-full flex flex-col overflow-hidden">
      
      {/* Cabeçalho Fixo */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg">
             <CalendarClock className="text-emerald-400" size={20} />
          </div>
          <h2 className="text-lg font-bold text-white">Próximos Proventos</h2>
        </div>
        <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30 font-bold uppercase">
          Futuro
        </span>
      </div>

      {/* Lista com Scroll Interno */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
             <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-xs">Buscando na B3...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
            <div className="bg-slate-800/50 p-4 rounded-full">
                <Calendar size={24} className="opacity-40"/>
            </div>
            <div className="text-center">
                <p className="text-sm font-bold text-slate-400">Nenhum agendamento</p>
                <p className="text-xs text-slate-600 mt-1">As empresas ainda não anunciaram.</p>
            </div>
          </div>
        ) : (
          events.map((evt, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border transition-all bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/80 group">
                
                <div className="flex items-center gap-3">
                  {/* Data Box */}
                  <div className="w-11 h-11 rounded-lg flex flex-col items-center justify-center border bg-slate-800 text-slate-300 border-slate-700 group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">
                      <span className="text-[9px] uppercase font-bold opacity-60">{evt.date.split('-')[1]}</span> {/* Mês */}
                      <span className="text-lg font-bold leading-none">{evt.date.split('-')[2]}</span> {/* Dia */}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                       <span className="font-bold text-slate-200">{evt.ticker}</span>
                       <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 rounded uppercase font-bold">
                           {evt.type === 'DATA_COM' ? 'Data Com' : 'Pagamento'}
                       </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                       <Clock size={10}/>
                       {evt.status}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                   <p className="font-mono font-bold text-emerald-400 text-sm">
                      {evt.total > 0 ? formatMoney(evt.total) : '---'}
                   </p>
                   <p className="text-[10px] text-slate-600">
                      {evt.value_per_share > 0 ? `${formatMoney(evt.value_per_share)}/cota` : 'A definir'}
                   </p>
                </div>
              </div>
          ))
        )}
      </div>
    </div>
  );
};
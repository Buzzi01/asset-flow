import { useEffect, useState } from 'react';
import { Receipt, TrendingUp } from 'lucide-react';
import { formatMoney } from '../utils';

interface DividendRecord {
  ticker: string;
  date: string;
  total: number;
  status: string;
}

export const DividendHistory = () => {
  const [history, setHistory] = useState<DividendRecord[]>([]);

  useEffect(() => {
    fetch('http://localhost:5328/api/dividends/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error("Erro ao carregar extrato:", err));
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Receipt size={16} className="text-emerald-400" /> Extrato de Proventos Reais
        </h3>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase">
          Confirmados
        </span>
      </div>
      
      <div className="divide-y divide-slate-800/50">
        {history.map((div, i) => (
          <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp size={14} />
              </div>
              <div>
                <p className="font-bold text-slate-200 text-sm">{div.ticker}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Data-Com: {new Date(div.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-emerald-400 font-mono font-bold">{formatMoney(div.total)}</p>
              <p className="text-[9px] text-slate-600 uppercase font-black tracking-tighter">Liquidado</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
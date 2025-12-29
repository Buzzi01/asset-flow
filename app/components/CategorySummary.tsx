'use client';
import { formatMoney } from '../utils';
import { Asset } from '../types';
import { usePrivacy } from '../context/PrivacyContext';
import { PieChart } from 'lucide-react'; // 👈 Adicionei o ícone aqui

const METAS_CONFIG: Record<string, number> = {
  'Ação': 25, 'FII': 35, 'Internacional': 25, 'Renda Fixa': 10, 'Cripto': 5, 'Reserva': 0
};

export const CategorySummary = ({ ativos }: { ativos: Asset[] }) => {
  const { isHidden } = usePrivacy();

  if (!ativos || ativos.length === 0) return null;

  const groups = ativos.reduce((acc: any, asset) => {
    const cat = asset.tipo;
    if (!acc[cat]) { acc[cat] = { tipo: cat, investido: 0, atual: 0 }; }
    acc[cat].investido += asset.total_investido;
    acc[cat].atual += asset.total_atual;
    return acc;
  }, {});

  const lista = Object.values(groups) as any[];
  const totalInvestidoGeral = lista.reduce((acc, item) => acc + item.investido, 0);
  const totalAtualGeral = lista.reduce((acc, item) => acc + item.atual, 0);
  lista.sort((a, b) => b.atual - a.atual);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl animate-in fade-in flex flex-col h-full overflow-hidden">
      
      {/* 👇 CABEÇALHO PADRONIZADO (Igual ao do Radar) */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 shrink-0 flex items-center gap-2">
        <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20">
           <PieChart size={16} className="text-blue-400" />
        </div>
        <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wide">Consolidação por Classe</h3>
      </div>
      
      {/* CONTEÚDO */}
      <div className="flex-1 w-full">
        <table className="w-full h-full text-left text-sm">
          <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 pl-6">Descrição</th>
              <th className="px-4 py-3 text-right">Inves. R$</th>
              <th className="px-4 py-3 text-right text-white">Atual R$</th>
              <th className="px-4 py-3 text-right">% Inves.</th>
              <th className="px-4 py-3 text-right text-blue-400">% Atual</th>
              <th className="px-4 py-3 text-right">Meta</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-800/50">
            {lista.map((item) => {
              const pctInvestido = totalInvestidoGeral > 0 ? (item.investido / totalInvestidoGeral) * 100 : 0;
              const pctAtual = totalAtualGeral > 0 ? (item.atual / totalAtualGeral) * 100 : 0;
              const meta = METAS_CONFIG[item.tipo] || 0;
              const diff = pctAtual - meta;

              return (
                <tr key={item.tipo} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 font-bold text-slate-300 pl-6">{item.tipo}</td>
                  <td className="px-4 text-right text-slate-500">{isHidden ? '••••••' : formatMoney(item.investido)}</td>
                  <td className="px-4 text-right text-white font-medium">{isHidden ? '••••••' : formatMoney(item.atual)}</td>
                  <td className="px-4 text-right text-slate-600 text-xs">{pctInvestido.toFixed(1)}%</td>
                  <td className="px-4 text-right font-bold text-blue-400">{pctAtual.toFixed(1)}%</td>
                  <td className="px-4 text-right text-xs">
                    <div className="flex flex-col items-end">
                        <span className="text-slate-400">{meta.toFixed(0)}%</span>
                        {meta > 0 && Math.abs(diff) > 0.1 && (
                            <span className={`text-[9px] font-bold ${diff > 2 ? 'text-red-400' : diff < -2 ? 'text-green-400' : 'text-slate-600'}`}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                            </span>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            <tr className="bg-slate-950/80 font-bold border-t border-slate-700 h-12">
                <td className="px-4 pl-6 text-white">TOTAL</td>
                <td className="px-4 text-right text-slate-400">{isHidden ? '••••••' : formatMoney(totalInvestidoGeral)}</td>
                <td className="px-4 text-right text-green-400 text-base">{isHidden ? '••••••' : formatMoney(totalAtualGeral)}</td>
                <td className="px-4 text-right text-slate-500">100%</td>
                <td className="px-4 text-right text-blue-500">100%</td>
                <td className="px-4 text-right text-slate-500">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
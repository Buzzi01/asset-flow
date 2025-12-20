'use client';
import { formatMoney } from '../utils';
import { Asset } from '../types';

// ⚠️ AJUSTE SUAS METAS MACRO AQUI PARA APARECER NA TABELA
const METAS_CONFIG: Record<string, number> = {
  'Ação': 25,
  'FII': 35,
  'Internacional': 25,
  'Renda Fixa': 10,
  'Cripto': 5,
  'Reserva': 0
};

export const CategorySummary = ({ ativos }: { ativos: Asset[] }) => {
  if (!ativos || ativos.length === 0) return null;

  // 1. Agrupar e Somar
  const groups = ativos.reduce((acc: any, asset) => {
    const cat = asset.tipo;
    if (!acc[cat]) {
      acc[cat] = { tipo: cat, investido: 0, atual: 0 };
    }
    acc[cat].investido += asset.total_investido;
    acc[cat].atual += asset.total_atual;
    return acc;
  }, {});

  const lista = Object.values(groups) as any[];

  // 2. Calcular Totais Gerais
  const totalInvestidoGeral = lista.reduce((acc, item) => acc + item.investido, 0);
  const totalAtualGeral = lista.reduce((acc, item) => acc + item.atual, 0);

  // 3. Ordenar por Valor Atual (Do maior para o menor)
  lista.sort((a, b) => b.atual - a.atual);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl animate-in fade-in">
      <div className="p-4 border-b border-slate-800 bg-slate-950/30">
        <h3 className="font-bold text-slate-200">Consolidação por Classe</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
            <tr>
              <th className="p-3 pl-6">Descrição</th>
              <th className="p-3 text-right">Inves. R$</th>
              <th className="p-3 text-right text-white">Atual R$</th>
              <th className="p-3 text-right">% Inves.</th>
              <th className="p-3 text-right text-blue-400">% Atual</th>
              <th className="p-3 text-right">Meta</th>
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
                  <td className="p-3 pl-6 font-bold text-slate-300">{item.tipo}</td>
                  <td className="p-3 text-right text-slate-500">{formatMoney(item.investido)}</td>
                  <td className="p-3 text-right text-white font-medium">{formatMoney(item.atual)}</td>
                  <td className="p-3 text-right text-slate-600 text-xs">{pctInvestido.toFixed(1)}%</td>
                  <td className="p-3 text-right font-bold text-blue-400">{pctAtual.toFixed(1)}%</td>
                  <td className="p-3 text-right text-xs">
                    <span className="text-slate-400 block">{meta.toFixed(1)}%</span>
                    {meta > 0 && (
                        <span className={`text-[9px] ${diff > 2 ? 'text-red-400' : diff < -2 ? 'text-green-400' : 'text-slate-600'}`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                        </span>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {/* LINHA DE TOTAIS */}
            <tr className="bg-slate-950/80 font-bold border-t border-slate-700">
                <td className="p-3 pl-6 text-white">TOTAL</td>
                <td className="p-3 text-right text-slate-400">{formatMoney(totalInvestidoGeral)}</td>
                <td className="p-3 text-right text-green-400">{formatMoney(totalAtualGeral)}</td>
                <td className="p-3 text-right text-slate-500">100%</td>
                <td className="p-3 text-right text-blue-500">100%</td>
                <td className="p-3 text-right text-slate-500">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
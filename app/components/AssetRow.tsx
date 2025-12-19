import { Snowflake } from 'lucide-react';
import { formatMoney } from '../utils';

interface AssetRowProps {
  ativo: any;
  tab: string;
}

export const AssetRow = ({ ativo, tab }: AssetRowProps) => {
  const percentualDaMeta = ativo.meta > 0 ? (ativo.pct_atual / ativo.meta) * 100 : 0;
  const barraWidth = Math.min(percentualDaMeta, 100);
  const isOverweight = ativo.pct_atual > ativo.meta;
  const magicNumber = ativo.magic_number || 0;
  const atingiuMagic = magicNumber > 0 && ativo.qtd >= magicNumber;

  return (
    <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50 last:border-0 group">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-8 rounded-full opacity-60 group-hover:opacity-100 transition-opacity ${ativo.cor_rec === 'green' ? 'bg-green-500' : ativo.cor_rec === 'blue' ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
          <div>
            <div className="font-bold text-white text-sm">{ativo.ticker}</div>
            <div className="text-[10px] text-slate-500 uppercase">{ativo.tipo} • {ativo.qtd}</div>
          </div>
        </div>
      </td>

      <td className="p-4 text-center">
        <div className="inline-flex flex-col items-center group/tooltip relative cursor-help">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${
            ativo.cor_rec === 'green' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
            ativo.cor_rec === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
            ativo.cor_rec === 'yellow' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
            'bg-slate-800 text-slate-400 border-slate-700'
          }`}>{ativo.recomendacao}</span>
          <div className="absolute bottom-full mb-2 hidden group-hover/tooltip:block w-48 bg-slate-950 text-xs text-slate-300 p-3 rounded-lg border border-slate-800 shadow-xl z-50">
            <p className="font-bold text-white mb-1 border-b border-slate-800 pb-1">Análise:</p>
            {ativo.motivo || "Neutro"}
          </div>
        </div>
      </td>

      <td className="p-4 text-right">
        <div className="text-slate-200 font-mono text-sm">{formatMoney(ativo.preco_atual)}</div>
        {ativo.min_6m > 0 && <div className="text-[10px] text-slate-600">Min: {formatMoney(ativo.min_6m)}</div>}
      </td>

      <td className="p-4 text-right w-32 hidden sm:table-cell">
        <div className="flex justify-between text-[10px] mb-1">
           <span className={isOverweight ? 'text-red-400 font-bold' : 'text-blue-300'}>{ativo.pct_atual.toFixed(1)}%</span>
           <span className="text-slate-600">/{ativo.meta}%</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-700 ${isOverweight ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${barraWidth}%` }}></div>
        </div>
      </td>

      <td className="p-4 text-right">
        {ativo.falta_comprar > 1 ? (
          <span className="text-blue-300 font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 text-xs">
            +{formatMoney(ativo.falta_comprar)}
          </span>
        ) : <span className="text-slate-700 text-xs">-</span>}
      </td>
      
      {(tab === 'FII' || tab === 'Resumo') && (
        <td className="p-4 text-center hidden lg:table-cell">
           {magicNumber > 0 ? (
             <div className={`text-xs flex flex-col items-center ${atingiuMagic ? 'text-cyan-400' : 'text-slate-600'}`}>
               <span className="flex items-center gap-1 font-mono">
                 {atingiuMagic && <Snowflake size={12}/>} {ativo.qtd}/{magicNumber}
               </span>
             </div>
           ) : <span className="text-slate-800 text-xs">-</span>}
        </td>
      )}

      {(tab === 'Ação' || tab === 'Resumo') && (
        <td className="p-4 text-right hidden lg:table-cell">
          {ativo.vi_graham > 0 ? (
            <div className="font-mono text-xs">
              <span className={ativo.mg_graham > 0 ? 'text-green-500' : 'text-red-500'}>
                {ativo.mg_graham > 0 ? '+' : ''}{ativo.mg_graham.toFixed(0)}%
              </span>
            </div>
          ) : <span className="text-slate-800 text-xs">-</span>}
        </td>
      )}
    </tr>
  );
};
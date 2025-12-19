// app/components/AssetRow.tsx
import { Snowflake, TrendingUp, TrendingDown } from 'lucide-react';
import { formatMoney } from '../utils';

interface AssetRowProps {
  ativo: any;
  tab: string;
}

export const AssetRow = ({ ativo, tab }: AssetRowProps) => {
  // Cálculo visual da barra de progresso baseada na Meta da Categoria
  // Se a meta é 10% e você tem 5%, a barra está em 50%.
  const percentualDaMeta = ativo.meta > 0 ? (ativo.pct_na_categoria / ativo.meta) * 100 : 0;
  const barraWidth = Math.min(percentualDaMeta, 100);
  
  // Verifica se passou da meta (ficar amarelo/vermelho)
  const isOverweight = ativo.pct_na_categoria > ativo.meta;
  
  const magicNumber = ativo.magic_number || 0;
  const atingiuMagic = magicNumber > 0 && ativo.qtd >= magicNumber;
  const lucroPositivo = ativo.lucro_valor >= 0;

  return (
    <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50 last:border-0 group text-xs sm:text-sm">
      
      {/* 1. NOME E TIPO */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-8 rounded-full opacity-60 group-hover:opacity-100 transition-opacity ${ativo.cor_rec === 'green' ? 'bg-green-500' : ativo.cor_rec === 'blue' ? 'bg-blue-500' : 'bg-slate-600'}`}></div>
          <div>
            <div className="font-bold text-white text-sm">{ativo.ticker}</div>
            <div className="text-[10px] text-slate-500 uppercase">{ativo.tipo} • {ativo.qtd} un</div>
          </div>
        </div>
      </td>

      {/* 2. PREÇOS (Atual vs PM) */}
      <td className="p-4 text-right">
        <div className="flex flex-col items-end">
            <span className="text-white font-mono">{formatMoney(ativo.preco_atual)}</span>
            <span className="text-[10px] text-slate-500" title="Preço Médio">PM: {formatMoney(ativo.pm)}</span>
        </div>
      </td>

      {/* 3. LUCRO / PREJUÍZO (Novo!) */}
      <td className="p-4 text-right">
        <div className="flex flex-col items-end">
            <span className={`font-bold font-mono ${lucroPositivo ? 'text-green-400' : 'text-red-400'}`}>
                {lucroPositivo ? '+' : ''}{formatMoney(ativo.lucro_valor)}
            </span>
            <div className={`text-[10px] flex items-center gap-1 ${lucroPositivo ? 'text-green-500/70' : 'text-red-500/70'}`}>
                {lucroPositivo ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                {ativo.lucro_pct.toFixed(2)}%
            </div>
        </div>
      </td>

      {/* 4. META NA CATEGORIA (Barra de Progresso) */}
      <td className="p-4 text-right w-36 hidden sm:table-cell">
        <div className="flex justify-between text-[10px] mb-1">
           {/* Mostra quanto % esse ativo representa DENTRO da categoria dele */}
           <span className={isOverweight ? 'text-yellow-400 font-bold' : 'text-blue-300'}>{ativo.pct_na_categoria.toFixed(1)}%</span>
           <span className="text-slate-600">Meta: {ativo.meta}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-700 ${isOverweight ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${barraWidth}%` }}></div>
        </div>
      </td>

      {/* 5. RECOMENDAÇÃO / APORTE */}
      <td className="p-4 text-right">
        <div className="flex flex-col items-end gap-1">
          {ativo.falta_comprar > 1 ? (
            <span className="text-blue-300 font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 text-xs whitespace-nowrap">
              +{formatMoney(ativo.falta_comprar)}
            </span>
          ) : <span className="text-slate-600 text-[10px]">Aguardar</span>}
          
          {/* Badge de Compra Pequeno */}
          <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${
            ativo.cor_rec === 'green' ? 'border-green-500/30 text-green-500' : 
            ativo.cor_rec === 'blue' ? 'border-blue-500/30 text-blue-400' : 'border-slate-700 text-slate-500'
          }`}>
            {ativo.recomendacao}
          </span>
        </div>
      </td>
      
      {/* 6. MAGIC NUMBER & GRAHAM */}
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
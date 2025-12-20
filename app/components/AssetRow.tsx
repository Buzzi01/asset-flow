'use client';
import { useState } from 'react';
import { Snowflake, TrendingUp, TrendingDown } from 'lucide-react';
import { formatMoney, getStatusColor, getStatusBg } from '../utils';
import { Asset } from '../types';

interface AssetRowProps {
  ativo: Asset;
  tab: string;
}

export const AssetRow = ({ ativo, tab }: AssetRowProps) => {
  const percentualDaMeta = ativo.meta > 0 ? (ativo.pct_na_categoria / ativo.meta) * 100 : 0;
  const barraWidth = Math.min(percentualDaMeta, 100);
  const isOverweight = ativo.pct_na_categoria > ativo.meta;
  
  const magicNumber = ativo.magic_number || 0;
  const atingiuMagic = magicNumber > 0 && ativo.qtd >= magicNumber;
  const lucroPositivo = ativo.lucro_valor >= 0;

  const showIndicators = tab === 'Ação' || tab === 'FII';

  const [imgError, setImgError] = useState(false);
  const logoUrl = `https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${ativo.ticker}.png`;

  return (
    <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50 last:border-0 group text-xs sm:text-sm">
      
      {/* 1. ATIVO + LOGO */}
      <td className="p-4 pl-6">
        <div className="flex items-center gap-3">
          
          {/* Lógica Visual Ajustada: Sem borda branca dura */}
          {!imgError ? (
             <div className="w-9 h-9 rounded-full bg-white/5 p-1 overflow-hidden shrink-0 border border-white/10">
               <img 
                 src={logoUrl} 
                 alt={ativo.ticker} 
                 className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                 onError={() => setImgError(true)} 
               />
             </div>
          ) : (
             // Fallback: Bolinha colorida (Mantido igual)
             <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-lg ${getStatusBg(ativo.status)}`}>
               {ativo.ticker.substring(0, 2)}
             </div>
          )}

          <div>
            <div className="font-bold text-white text-sm">{ativo.ticker}</div>
            <div className="text-[10px] text-slate-500 uppercase">{ativo.tipo} • {ativo.qtd} un</div>
          </div>
        </div>
      </td>

      {/* ... (RESTO DO CÓDIGO PERMANECE IGUAL) ... */}

      {/* 2. MINHA POSIÇÃO */}
      <td className="p-4 text-right">
        <div className="flex flex-col items-end">
            <span className="text-white font-bold">{formatMoney(ativo.total_atual)}</span>
            <span className="text-[10px] text-slate-500">Custo: {formatMoney(ativo.total_investido)}</span>
        </div>
      </td>

      {/* 3. PREÇO */}
      <td className="p-4 text-right hidden sm:table-cell">
        <div className="flex flex-col items-end">
            <span className="text-slate-300 font-mono">{formatMoney(ativo.preco_atual)}</span>
            <span className="text-[10px] text-slate-600">PM: {formatMoney(ativo.pm)}</span>
        </div>
      </td>

      {/* 4. RESULTADO */}
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

      {/* 5. META */}
      <td className="p-4 text-right w-32 hidden md:table-cell">
        <div className="flex justify-between text-[10px] mb-1">
           <span className={isOverweight ? 'text-yellow-400 font-bold' : 'text-blue-300'}>{ativo.pct_na_categoria.toFixed(1)}%</span>
           <span className="text-slate-600">/{ativo.meta}%</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full transition-all duration-700 ${isOverweight ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{ width: `${barraWidth}%` }}></div>
        </div>
      </td>

      {/* 6. APORTE */}
      <td className="p-4 text-right">
        <div className="flex flex-col items-end gap-1">
          {ativo.falta_comprar > 1 ? (
            <span className="text-blue-300 font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 text-xs whitespace-nowrap">
              +{formatMoney(ativo.falta_comprar)}
            </span>
          ) : <span className="text-slate-700 text-[10px]">-</span>}
          
          {ativo.status !== 'MANTER' && ativo.status !== 'NEUTRO' && (
             <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase ${getStatusColor(ativo.status)}`}>
               {ativo.recomendacao}
             </span>
          )}
        </div>
      </td>

      {/* 7. INDICADORES */}
      {showIndicators && (
        <td className="p-4 text-center hidden lg:table-cell w-24">
            {tab === 'FII' && magicNumber > 0 ? (
                 <div className={`text-xs flex flex-col items-center ${atingiuMagic ? 'text-cyan-400' : 'text-slate-600'}`} title="Cotas Atuais / Cotas Mágicas">
                   <span className="flex items-center gap-1 font-mono">
                     {atingiuMagic && <Snowflake size={12}/>} {ativo.qtd}/{magicNumber}
                   </span>
                 </div>
            ) : tab === 'Ação' && (ativo.vi_graham ?? 0) > 0 ? (
                <div className="font-mono text-xs">
                  <span className={(ativo.mg_graham ?? 0) > 0 ? 'text-green-500' : 'text-red-500'} title="Margem de Graham">
                    {(ativo.mg_graham ?? 0) > 0 ? '+' : ''}{(ativo.mg_graham ?? 0).toFixed(0)}%
                  </span>
                </div>
            ) : (
                <span className="text-slate-800">-</span>
            )}
        </td>
      )}
    </tr>
  );
};
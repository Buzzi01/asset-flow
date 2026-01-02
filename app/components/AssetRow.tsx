'use client';
import { useState } from 'react';
import { Snowflake, TrendingUp, TrendingDown, Pencil, FileText, Info } from 'lucide-react';
import { formatMoney, getStatusBg, getStatusColor } from '../utils'; 
import { Asset } from '../types';
import { usePrivacy } from '../context/PrivacyContext';

interface AssetRowProps {
  ativo: Asset;
  tab: string;
  onEdit: (ativo: Asset) => void;
  onViewNews?: (ticker: string) => void;
  index: number; 
  total: number; 
}

// Sub-componente para limpar os códigos de isHidden sem mudar o design original
const PrivateValue = ({ value, isHidden, className = "" }: { value: string | number, isHidden: boolean, className?: string }) => (
  <span className={className}>{isHidden ? (className.includes('pct') ? '•••%' : '••••••') : value}</span>
);

export const AssetRow = ({ ativo, tab, onEdit, onViewNews, index, total }: AssetRowProps) => {
  const { isHidden } = usePrivacy();

  // Travas de segurança para evitar que o componente quebre se o dado estiver ausente
  const pvp = ativo.p_vp || 0;
  const magicNumber = ativo.magic_number || 0;
  const score = ativo.score ?? 0;
  const rsi = ativo.rsi ?? 50;
  const vi_graham = ativo.vi_graham ?? 0;
  const mg_graham = ativo.mg_graham ?? 0;

  const percentualDaMeta = ativo.meta > 0 ? (ativo.pct_na_categoria / ativo.meta) * 100 : 0;
  const barraWidth = Math.min(percentualDaMeta, 100);
  const isOverweight = ativo.pct_na_categoria > ativo.meta;
  
  const atingiuMagic = magicNumber > 0 && ativo.qtd >= magicNumber;
  const lucroPositivo = ativo.lucro_valor >= 0;
  
  // Trava visual: Só mostra indicadores em Ações ou FIIs
  const showIndicators = tab === 'Ação' || tab === 'FII';
  
  const [imgError, setImgError] = useState(false);
  const logoUrl = `https://raw.githubusercontent.com/thefintz/icones-b3/main/icones/${ativo.ticker}.png`;

  // Correção do erro da linha 168: Garantindo que motivosLista seja sempre um array
  const motivosRaw = ativo.motivo || "";
  const separator = motivosRaw.includes(' • ') ? ' • ' : ' + ';
  const motivosLista = motivosRaw ? motivosRaw.split(separator) : [];

  const getBulletClass = (text: string) => {
      const t = text.toLowerCase();
      if (t.includes('desconto') || t.includes('baixo') || t.includes('oportunidade') || t.includes('fundo') || t.includes('bola de neve') || t.includes('graham')) 
          return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]';
      if (t.includes('esticado') || t.includes('caro') || t.includes('ágio') || t.includes('acima') || t.includes('queda')) 
          return 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]';
      return 'bg-blue-400';
  };

  const isBottomRow = total > 3 && index >= total - 3;
  const tooltipPositionClass = isBottomRow ? 'bottom-8' : 'top-7';

  const isUSD = (ativo as any).currency === 'USD';
  const displayPrice = isUSD ? `$ ${ativo.preco_atual.toFixed(2)}` : formatMoney(ativo.preco_atual);
  const displayPM = isUSD ? `$ ${ativo.pm.toFixed(2)}` : formatMoney(ativo.pm);

  return (
    <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/50 last:border-0 group text-xs sm:text-sm">
      
      {/* 1. ATIVO & LOGO */}
      <td className="p-4 pl-6">
        <div className="flex items-center gap-3">
          {!imgError ? (
             <div className="w-9 h-9 rounded-full bg-white/5 p-1 overflow-hidden shrink-0 border border-white/10 shadow-sm">
               <img src={logoUrl} alt={ativo.ticker} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity" onError={() => setImgError(true)} />
             </div>
          ) : (
             <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-lg ${getStatusBg(ativo.status)}`}>
                {ativo.ticker.substring(0, 2)}
             </div>
          )}
          <div>
            <div className="font-bold text-white text-sm flex items-center gap-2">
                {ativo.ticker}
                <div className="flex opacity-0 group-hover:opacity-100 transition-all gap-1">
                    <button onClick={() => onEdit(ativo)} className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-blue-400 transition-colors" title="Editar">
                        <Pencil size={12} />
                    </button>
                    {onViewNews && (
                        <button onClick={() => onViewNews(ativo.ticker)} className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-emerald-400 transition-colors" title="Notícias">
                            <FileText size={12} />
                        </button>
                    )}
                </div>
            </div>
            <div className="text-[10px] text-slate-500 uppercase font-medium tracking-wide">
                {ativo.tipo} • <PrivateValue value={`${ativo.qtd} UN`} isHidden={isHidden} />
            </div>
          </div>
        </div>
      </td>

      {/* 2. POSIÇÃO */}
      <td className="p-4 text-right">
        <div className="flex flex-col items-end">
            <PrivateValue value={formatMoney(ativo.total_atual)} isHidden={isHidden} className="text-slate-200 font-bold" />
            <PrivateValue value={`Investido: ${formatMoney(ativo.total_investido)}`} isHidden={isHidden} className="text-[10px] text-slate-500" />
        </div>
      </td>

      {/* 3. PREÇO */}
      <td className="p-4 text-right hidden sm:table-cell">
        <div className="flex flex-col items-end">
            <PrivateValue value={displayPrice} isHidden={isHidden} className="text-slate-300 font-mono" />
            <PrivateValue value={`PM: ${displayPM}`} isHidden={isHidden} className="text-[10px] text-slate-600" />
        </div>
      </td>

      {/* 4. RESULTADO */}
      <td className="p-4 text-right">
        <div className="flex flex-col items-end">
            <PrivateValue value={(lucroPositivo ? '+' : '') + formatMoney(ativo.lucro_valor)} isHidden={isHidden} className={`font-bold font-mono ${lucroPositivo ? 'text-emerald-400' : 'text-rose-400'}`} />
            <div className={`text-[10px] flex items-center gap-1 ${lucroPositivo ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                <PrivateValue value={`${lucroPositivo ? '+' : ''}${ativo.lucro_pct.toFixed(2)}%`} isHidden={isHidden} className="pct" />
                {!isHidden && (lucroPositivo ? <TrendingUp size={10}/> : <TrendingDown size={10}/>)}
            </div>
        </div>
      </td>

      {/* 5. META */}
      <td className="p-4 text-right w-36 hidden md:table-cell">
        <div className="flex justify-between text-[10px] mb-1.5 px-0.5">
           <span className={`font-bold ${isOverweight ? 'text-yellow-400' : 'text-blue-300'}`}>
               {ativo.pct_na_categoria.toFixed(1)}%
           </span>
           <span className="text-slate-600">meta {ativo.meta}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden ring-1 ring-slate-800">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${isOverweight ? 'bg-yellow-500' : 'bg-blue-500'}`} 
            style={{ width: `${barraWidth}%` }}
          ></div>
        </div>
      </td>

      {/* 6. APORTE & INSIGHTS (Tooltip Restaurado) */}
      <td className="p-4 text-right">
        <div className="flex flex-col items-end gap-1.5">
          {ativo.falta_comprar > 1 ? (
            <PrivateValue value={`+${formatMoney(ativo.falta_comprar)}`} isHidden={isHidden} className="text-blue-300 font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 text-xs whitespace-nowrap shadow-sm shadow-blue-900/20" />
          ) : (
            <span className="text-slate-700 text-[10px] font-medium">-</span>
          )}
          
          <div className="group/tooltip relative inline-block">
             <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border uppercase font-bold cursor-help transition-all hover:brightness-110 ${getStatusColor(ativo.status)}`}>
                {ativo.recomendacao}
                <Info size={10} className="opacity-60 hover:opacity-100 transition-opacity" />
             </div>
             
             {/* Card Flutuante com Design Original e RSI */}
             <div className={`absolute right-0 ${tooltipPositionClass} z-50 w-64 p-0 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl text-left hidden group-hover/tooltip:block pointer-events-none animate-in fade-in zoom-in-95 duration-200`}>
                <div className="bg-slate-800/80 px-3 py-2 border-b border-slate-700 rounded-t-lg flex justify-between items-center backdrop-blur-sm">
                    <span className="text-[10px] font-bold text-slate-200 flex items-center gap-1">
                        📊 Análise de {ativo.ticker}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                        Score: {score}
                    </span>
                </div>
                
                <div className="p-3 space-y-2.5">
                    {motivosLista.length > 0 ? motivosLista.map((m, i) => (
                        <div key={i} className="text-[10px] text-slate-300 flex items-start gap-2 leading-relaxed">
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${getBulletClass(m)}`}></span>
                            {m}
                        </div>
                    )) : <span className="text-[10px] text-slate-500 italic">Apenas rebalanceamento de carteira.</span>}
                </div>

                <div className="px-3 pb-3 pt-2 border-t border-slate-800/80 bg-slate-800/30 rounded-b-lg">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] text-slate-400 font-bold tracking-wide uppercase">Momento (RSI 14D)</span>
                        <span className={`text-[9px] font-bold ${rsi < 30 ? 'text-emerald-400' : rsi > 70 ? 'text-rose-400' : 'text-blue-400'}`}>
                            {rsi.toFixed(0)}
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex relative">
                        <div className={`h-full transition-all duration-1000 ${rsi < 30 ? 'bg-emerald-500' : rsi > 70 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(rsi, 100)}%` }}></div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </td>

      {/* 7. INDICADORES (Trava Recuperada + Inclusão do V.I.) */}
      {showIndicators && (
        <td className="p-4 text-center hidden lg:table-cell w-28 align-middle">
            {tab === 'FII' ? (
                 <div className="flex flex-col gap-1 items-end w-full">
                     {pvp > 0 && (
                         <div className="text-xs font-mono flex items-center gap-1.5 bg-slate-800/30 px-2 py-0.5 rounded border border-slate-800" title="P/VP">
                            <span className="text-[9px] text-slate-500 uppercase">P/VP</span>
                            <span className={pvp < 0.95 ? 'text-emerald-400 font-bold' : pvp > 1.05 ? 'text-rose-400' : 'text-slate-300'}>
                                {pvp.toFixed(2)}
                            </span>
                         </div>
                     )}
                     {magicNumber > 0 && (
                         <div className={`text-[10px] flex items-center gap-1 justify-end w-full px-1 ${atingiuMagic ? 'text-cyan-400 font-bold' : 'text-slate-600'}`} title="Progresso Magic Number">
                            <Snowflake size={10} className={atingiuMagic ? "animate-pulse" : ""}/> 
                            <PrivateValue value={`${ativo.qtd}/${magicNumber}`} isHidden={isHidden} />
                         </div>
                     )}
                 </div>
            ) : tab === 'Ação' && (vi_graham > 0 || mg_graham !== 0) ? (
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-[10px] font-mono px-2 py-1 rounded border ${
                      mg_graham > 20 ? 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20' : 
                      mg_graham > 0 ? 'text-emerald-600 bg-emerald-400/5 border-emerald-600/10' :
                      'text-rose-400 bg-rose-400/5 border-rose-400/20'
                  }`} title="Margem de Graham">
                    {mg_graham > 0 ? '+' : ''}{mg_graham.toFixed(0)}%
                  </span>
                  <span className="text-[9px] text-slate-600 font-medium uppercase tracking-tighter">
                    V.I: <PrivateValue value={formatMoney(vi_graham)} isHidden={isHidden} />
                  </span>
                </div>
            ) : <span className="text-slate-800">-</span>}
        </td>
      )}
    </tr>
  );
};
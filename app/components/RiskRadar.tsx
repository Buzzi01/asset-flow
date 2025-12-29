'use client';
import { 
  Siren, 
  Sparkles, 
  Scale, 
  Anchor, 
  TrendingUp, 
  ShieldCheck, 
  Activity 
} from 'lucide-react';

export const RiskRadar = ({ alertas }: { alertas: string[] }) => {
  
  // Função que analisa o texto do alerta e define o ícone e a cor
  const analyzeAlert = (text: string) => {
    const t = text.toLowerCase();

    if (t.includes('oportunidade') || t.includes('graham') || t.includes('desconto')) {
      return {
        icon: Sparkles,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        label: 'Oportunidade'
      };
    }
    if (t.includes('rebalancear') || t.includes('meta')) {
      return {
        icon: Scale,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        label: 'Ajuste de Carteira'
      };
    }
    if (t.includes('esticado') || t.includes('rsi alto') || t.includes('alerta')) {
      return {
        icon: Siren,
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        label: 'Risco Elevado'
      };
    }
    if (t.includes('mínima') || t.includes('fundo')) {
      return {
        icon: Anchor,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        label: 'Suporte / Fundo'
      };
    }

    // Padrão
    return {
      icon: Activity,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      label: 'Movimentação'
    };
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Cabeçalho Bonito */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-purple-500/10 border border-purple-500/20">
             <ShieldCheck size={16} className="text-purple-400" />
          </div>
          <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wide">Radar de Mercado</h3>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full border border-slate-700">
          {alertas.length} Insights
        </span>
      </div>
      
      {/* Lista de Cards */}
      <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
        {alertas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3 py-10 opacity-60">
            <ShieldCheck size={48} strokeWidth={1} />
            <p className="text-xs font-medium">Nenhum alerta relevante no momento.</p>
          </div>
        ) : (
          alertas.map((alerta, index) => {
            const style = analyzeAlert(alerta);
            const Icon = style.icon;

            return (
              <div 
                key={index} 
                className={`relative p-3 rounded-xl border ${style.bg} ${style.border} group hover:brightness-110 transition-all duration-300`}
              >
                <div className="flex items-start gap-3">
                  {/* Ícone com brilho */}
                  <div className={`p-2 rounded-lg bg-slate-900/50 border border-white/5 shadow-sm shrink-0 ${style.color}`}>
                    <Icon size={18} />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {/* Label do Tipo */}
                    <span className={`text-[9px] font-bold uppercase tracking-wider opacity-70 ${style.color}`}>
                      {style.label}
                    </span>
                    
                    {/* Mensagem Principal */}
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {alerta.replace(/⚠️|💎|📈|📉|⚖️/g, '').trim()} {/* Remove emojis antigos do texto se houver */}
                    </p>
                  </div>
                </div>

                {/* Efeito de brilho no hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
import { AlertTriangle, TrendingDown, Diamond, Snowflake, Sparkles } from 'lucide-react';

export const RiskRadar = ({ alertas }: { alertas: string[] }) => {
  if (!alertas || alertas.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl animate-in fade-in mt-6 flex flex-col">
      
      {/* Cabeçalho Fixo */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/30 flex items-center gap-2 shrink-0">
        <Sparkles size={16} className="text-blue-400" />
        <h3 className="font-bold text-slate-200 text-sm">Insights de Oportunidade</h3>
      </div>
      
      {/* AJUSTE DE ALTURA E SCROLL:
         1. max-h-[245px]: Reduzi para tentar alinhar o fundo com a tabela ao lado.
         2. Classes [&::-webkit...]: Barra de rolagem cinza escuro (Theme Dark).
      */}
      <div className="divide-y divide-slate-800/50 overflow-y-auto max-h-[245px] 
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-slate-950
        [&::-webkit-scrollbar-thumb]:bg-slate-700
        [&::-webkit-scrollbar-thumb]:rounded-full
        hover:[&::-webkit-scrollbar-thumb]:bg-slate-600"
      >
        {alertas.map((rawAlert, i) => {
          const parts = rawAlert.split(':');
          const type = parts.length > 1 ? parts[0] : 'INFO';
          const msg = parts.length > 1 ? parts[1] : rawAlert;

          // Configuração Visual Minimalista
          let Icon = Sparkles;
          let colorClass = "text-slate-400";
          let bgClass = "bg-slate-800";
          let label = "Info";

          switch (type) {
            case 'REBALANCEAR':
              colorClass = "text-yellow-500";
              bgClass = "bg-yellow-500/10";
              Icon = AlertTriangle;
              label = "Atenção";
              break;
            case 'QEDA':
              colorClass = "text-emerald-400";
              bgClass = "bg-emerald-500/10";
              Icon = TrendingDown;
              label = "Preço Atrativo";
              break;
            case 'GRAHAM':
              colorClass = "text-blue-400";
              bgClass = "bg-blue-500/10";
              Icon = Diamond;
              label = "Valor Patrimonial";
              break;
            case 'MAGIC':
              colorClass = "text-cyan-400";
              bgClass = "bg-cyan-500/10";
              Icon = Snowflake;
              label = "Bola de Neve";
              break;
          }

          return (
            <div key={i} className="p-4 flex items-start gap-4 hover:bg-slate-800/30 transition-colors group">
              {/* Ícone Redondo */}
              <div className={`p-2 rounded-full shrink-0 ${bgClass} ${colorClass}`}>
                <Icon size={18} />
              </div>

              {/* Texto */}
              <div className="flex flex-col pr-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${colorClass} opacity-80`}>
                  {label}
                </span>
                <span className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors leading-snug">
                  {msg}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
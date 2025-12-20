import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  colorClass: string; // Ex: "text-green-500"
}

export const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: StatCardProps) => {
  // Extrai a cor base para criar um fundo bem suave (opacity-10)
  // Se colorClass for "text-green-500", o bg será "bg-green-500/10"
  // Nota: Isso é um truque visual simples.
  
  return (
    <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 flex flex-col justify-between h-full hover:border-slate-600 transition-colors group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
           <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">{title}</span>
           <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        
        {/* O ÍCONE LIMPO (Sem quadrado sólido) */}
        <div className={`p-2 rounded-lg bg-white/5 border border-white/5 ${colorClass.replace('text-', 'bg-').split(' ')[0]}/10`}>
           <Icon className={colorClass.split(' ')[0]} size={20} />
        </div>
      </div>
      
      {subtext && (
        <p className="text-[10px] text-slate-500 font-medium">
          {subtext}
        </p>
      )}
    </div>
  );
};
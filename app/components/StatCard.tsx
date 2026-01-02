'use client';
import { LucideIcon } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  colorClass: string;
}

export const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: StatCardProps) => {
  const { isHidden } = usePrivacy();

  // Extração da cor base para o fundo do ícone (ex: text-blue-400 -> bg-blue-400/10)
  const iconColor = colorClass.split(' ')[0];
  const bgColor = iconColor.replace('text-', 'bg-');

  return (
    <div className="bg-[#0f172a] p-5 rounded-xl border border-slate-800 flex flex-col justify-between h-full hover:border-slate-700 transition-all duration-300 shadow-lg group">
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
           <span className="text-[9px] uppercase font-bold text-slate-500 tracking-widest mb-1 leading-none">
             {title}
           </span>
           <h3 className="text-xl font-bold text-white tracking-tight font-mono mt-1">
             {isHidden ? '••••••' : value}
           </h3>
        </div>
        
        <div className={`p-2 rounded-lg ${bgColor}/10 border border-${iconColor.replace('text-', '')}/20 transition-transform group-hover:scale-110 duration-300`}>
           <Icon className={iconColor} size={18} />
        </div>
      </div>
      
      {subtext && (
        <div className="mt-auto pt-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight flex items-center gap-1.5">
            <span className={`w-1 h-1 rounded-full ${bgColor}`} />
            {subtext}
          </p>
        </div>
      )}
    </div>
  );
};
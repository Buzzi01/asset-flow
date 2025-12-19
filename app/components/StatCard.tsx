import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  colorClass: string;
}

export const StatCard = ({ title, value, subtext, icon: Icon, colorClass }: StatCardProps) => (
  <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 backdrop-blur-sm flex flex-col justify-between h-full hover:border-slate-600 transition-all">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-lg ${colorClass} bg-opacity-20`}>
        <Icon size={20} className={colorClass.replace('bg-', 'text-')} />
      </div>
      {subtext && <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded-full">{subtext}</span>}
    </div>
    <div>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
  </div>
);
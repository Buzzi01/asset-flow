interface BadgeProps {
  label: string;
  variant?: 'blue' | 'emerald' | 'slate' | 'amber';
}

export function Badge({ label, variant = 'slate' }: BadgeProps) {
  const variants = {
    blue: "bg-blue-600/20 text-blue-400 border-blue-500/30",
    emerald: "bg-emerald-600/20 text-emerald-400 border-emerald-500/30",
    slate: "bg-slate-800 text-slate-500 border-slate-700",
    amber: "bg-amber-600/20 text-amber-400 border-amber-500/30"
  };

  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider ${variants[variant]}`}>
      {label}
    </span>
  );
}
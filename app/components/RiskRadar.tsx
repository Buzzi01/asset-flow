import { AlertTriangle } from 'lucide-react';

export const RiskRadar = ({ alertas }: { alertas: string[] }) => {
  if (!alertas || alertas.length === 0) return null;

  return (
    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex items-start gap-3 animate-in fade-in">
      <AlertTriangle className="text-red-500 shrink-0" size={20} />
      <div>
        <h4 className="text-sm font-bold text-red-400 mb-1">Atenção Necessária</h4>
        <div className="text-xs text-red-200/70 space-y-1">
          {alertas.map((a: string, i: number) => <p key={i}>• {a}</p>)}
        </div>
      </div>
    </div>
  );
};
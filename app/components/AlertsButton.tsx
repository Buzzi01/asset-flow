'use client';
import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';
// Importamos os teus novos utilitários de UI apenas para lógica, 
// mas manteremos o CSS manual que tu gostavas no dropdown.
import { Badge } from './ui/Badge';

interface Alert {
  id: number;
  ticker: string;
  type: string;
  message: string;
  field: string;
}

interface Props {
  onFixAsset: (assetId: number) => void;
}

export const AlertsButton = ({ onFixAsset }: Props) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:5328/api/alerts');
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setAlerts(data);
        setHasError(false);
      } else {
        setAlerts([]);
      }
    } catch (e) {
      console.error("Falha ao buscar alertas:", e);
      setHasError(true);
      setAlerts([]);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Botão Principal - Design Original Conservado */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-all border relative group ${
            isOpen 
            ? 'bg-slate-700 border-slate-600 text-white' 
            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
        }`}
        title="Alertas e Pendências"
      >
        <Bell size={16} className={alerts.length > 0 ? 'text-slate-200' : 'group-hover:text-white'} />
        
        {/* Bolinha de Notificação Pulsante */}
        {alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#0b0f19]"></span>
        )}
      </button>

      {/* Dropdown Menu - Recuperado o Design Original que tu gostavas */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          
          <div className="absolute right-0 mt-2 w-80 bg-[#0f1421] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header do Dropdown */}
            <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Notificações</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                alerts.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {alerts.length} pendentes
              </span>
            </div>
            
            {/* Lista de Alertas */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-2">
              {hasError ? (
                <div className="text-center py-6 text-slate-500 flex flex-col items-center gap-2">
                    <WifiOff size={20} className="opacity-20"/>
                    <p className="text-xs">Erro ao sincronizar alertas</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-6 text-slate-500 flex flex-col items-center gap-2">
                    <CheckCircle size={24} className="opacity-20"/>
                    <p className="text-xs">Sua carteira está saudável.</p>
                </div>
              ) : (
                alerts.map((alert, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800 transition-colors group">
                    <div className="mt-0.5 text-yellow-500">
                        <AlertTriangle size={14} />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-200 text-sm">{alert.ticker}</span>
                            <button 
                               onClick={() => { onFixAsset(alert.id); setIsOpen(false); }}
                               className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition-colors"
                            >
                               Resolver
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 leading-tight">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
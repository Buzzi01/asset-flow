'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoney } from '../utils';

export const HistoryChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/40 p-8 rounded-xl border border-slate-700/50 text-center text-slate-500 h-64 flex items-center justify-center">
        <p>Aguardando dados históricos... (Amanhã aparecerá o gráfico)</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 p-6 rounded-xl border border-slate-700/50 h-[400px] animate-in fade-in">
      <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 tracking-wider">Evolução Patrimonial</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorInvestido" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          
          <XAxis 
            dataKey="date" 
            stroke="#64748b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false}
            dy={10}
          />
          
          <YAxis 
            stroke="#64748b" 
            fontSize={12} 
            tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} 
            tickLine={false} 
            axisLine={false}
            dx={-10}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
            itemStyle={{ fontSize: '12px' }}
            formatter={(value: number) => [formatMoney(value), '']}
            labelStyle={{ color: '#94a3b8', marginBottom: '5px' }}
          />
          
          <Area 
            type="monotone" 
            dataKey="Patrimônio" 
            stroke="#3b82f6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPatrimonio)" 
            name="Patrimônio"
          />
          
          <Area 
            type="monotone" 
            dataKey="Investido" 
            stroke="#64748b" 
            strokeWidth={2}
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorInvestido)" 
            name="Investido"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
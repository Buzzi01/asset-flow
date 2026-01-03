'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoney } from '../utils';
import { Card } from './ui/Card';
import { LineChart as LineChartIcon } from 'lucide-react';

export const HistoryChart = ({ data }: { data: any[] }) => {
  // Estado de espera quando não há dados
  if (!data || data.length === 0) {
    return (
      <div className="bg-[#0f172a] p-8 rounded-xl border border-slate-800 text-center text-slate-500 h-64 flex flex-col items-center justify-center gap-4 animate-pulse">
        <LineChartIcon size={32} className="text-slate-700" />
        <p className="text-xs font-bold uppercase tracking-widest">Aguardando dados históricos...</p>
        <span className="text-[10px] text-slate-600 uppercase">O primeiro registro aparecerá após o fechamento de hoje</span>
      </div>
    );
  }

  return (
    <Card className="flex flex-col !bg-[#0f172a] !border-slate-800 shadow-2xl p-6 h-[400px] animate-in fade-in duration-500">
      {/* Cabeçalho Sincronizado com Radar e Consolidação */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <LineChartIcon size={16} className="text-blue-400" />
          </div>
          <h3 className="font-bold text-slate-200 text-xs uppercase tracking-widest leading-none">Evolução Patrimonial</h3>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Patrimônio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Investido</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorInvestido" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748b" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
            
            <XAxis 
              dataKey="date" 
              stroke="#475569" 
              fontSize={10} 
              fontWeight="bold"
              tickLine={false} 
              axisLine={false}
              dy={10}
              tickFormatter={(date) => date.split('/')[0] + '/' + date.split('/')[1]}
            />
            
            <YAxis 
              stroke="#475569" 
              fontSize={10} 
              fontWeight="bold"
              tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} 
              tickLine={false} 
              axisLine={false}
              dx={-5}
            />
            
            <Tooltip 
              cursor={{ stroke: '#334155', strokeWidth: 1 }}
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                borderColor: '#1e293b', 
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                border: '1px solid #334155'
              }}
              itemStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
              formatter={(value: number) => [formatMoney(value), '']}
              labelStyle={{ color: '#64748b', marginBottom: '8px', fontSize: '10px', fontWeight: 'bold' }}
            />
            
            <Area 
              type="monotone" 
              dataKey="Patrimônio" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPatrimonio)" 
              name="Patrimônio"
              animationDuration={1500}
            />
            
            <Area 
              type="monotone" 
              dataKey="Investido" 
              stroke="#64748b" 
              strokeWidth={2}
              strokeDasharray="6 6"
              fillOpacity={1} 
              fill="url(#colorInvestido)" 
              name="Investido"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
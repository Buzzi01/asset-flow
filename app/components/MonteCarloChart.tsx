'use client';

import { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
// 👇 1. Importar o contexto
import { usePrivacy } from '../context/PrivacyContext';

export default function MonteCarloChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ vol: '', retorno: '' });
  
  // 👇 2. Pegar o estado de privacidade
  const { isHidden } = usePrivacy();

  useEffect(() => {
    fetch('/api/simulation')
      .then(res => res.json())
      .then(d => {
        if (d.status === 'Sucesso') {
          const formattedData = d.projecao.medio.map((_: any, index: number) => ({
            dia: index,
            pior: d.projecao.pior_caso[index],
            medio: d.projecao.medio[index],
            melhor: d.projecao.melhor_caso[index],
          }));
          
          setData(formattedData);
          setStats({ vol: d.volatilidade_anual, retorno: '' });
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse h-64 bg-slate-800/50 rounded-xl" />;
  if (data.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                🔮 Simulação de Monte Carlo (1 Ano)
            </h3>
            <p className="text-slate-400 text-sm mt-1">
                Projeção baseada em 1.000 cenários possíveis (Movimento Browniano)
            </p>
        </div>
        <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-bold">Volatilidade Anual</p>
            {/* Volatilidade é porcentagem, não revela patrimônio, então mantive visível. 
                Se quiser esconder, coloque: {isHidden ? '•••' : stats.vol} */}
            <p className="text-2xl font-mono text-yellow-400">{stats.vol}</p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis 
                dataKey="dia" 
                stroke="#94a3b8" 
                tickFormatter={(val) => val % 30 === 0 ? `${val}d` : ''} 
            />
            <YAxis 
                stroke="#94a3b8" 
                // 👇 3. Esconde o Eixo Y
                tickFormatter={(val) => isHidden ? '••••' : `R$${(val/1000).toFixed(0)}k`}
                domain={['auto', 'auto']}
                width={isHidden ? 40 : 60} // Ajusta largura para não ficar estranho
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                // 👇 4. Esconde o valor do Tooltip (mouse over)
                formatter={(val: number) => [isHidden ? '••••••' : `R$ ${val.toFixed(2)}`, '']}
                labelFormatter={(label) => `Dia ${label}`}
            />
            <Legend />
            
            <Line 
                type="monotone" 
                dataKey="melhor" 
                name="Cenário Otimista (95%)" 
                stroke="#4ade80" 
                strokeWidth={2} 
                dot={false} 
            />
            <Line 
                type="monotone" 
                dataKey="medio" 
                name="Tendência Média" 
                stroke="#38bdf8" 
                strokeWidth={3} 
                dot={false} 
            />
            <Line 
                type="monotone" 
                dataKey="pior" 
                name="Cenário Pessimista (5%)" 
                stroke="#f87171" 
                strokeWidth={2} 
                dot={false} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
'use client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { COLORS } from '../utils';

export const AllocationChart = ({ data }: { data: any[] }) => {
  return (
    <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 md:col-span-2 flex items-center">
      <div className="h-24 w-24 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={45} paddingAngle={2} dataKey="value">
              {data?.map((e:any, i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} stroke="none"/>)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="ml-4 flex-1 grid grid-cols-2 gap-2">
        {data?.slice(0,4).map((e:any, i:number) => (
          <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i%COLORS.length]}}></div>
            <span>{e.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
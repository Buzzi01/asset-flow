// app/utils.ts
export const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const formatMoney = (v: number) => {
  return v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
};

export const formatMoneyPrivate = (value: number, isHidden: boolean) => {
  if (isHidden) return '••••••';
  return formatMoney(value);
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPRA_FORTE':
      return 'text-green-500 border-green-500/30';
    case 'COMPRAR':
      return 'text-blue-400 border-blue-500/30';
    case 'AGUARDAR':
      return 'text-yellow-400 border-yellow-500/30';
    default: // MANTER ou NEUTRO
      return 'text-slate-500 border-slate-700';
  }
};

export const getStatusBg = (status: string) => {
  switch (status) {
    case 'COMPRA_FORTE':
      return 'bg-green-500';
    case 'COMPRAR':
      return 'bg-blue-500';
    case 'AGUARDAR':
      return 'bg-yellow-500';
    default:
      return 'bg-slate-600';
  }
};
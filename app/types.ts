// app/types.ts

export interface AssetMetrics {
  vi_graham: number;
  mg_graham: number;
  magic_number: number;
  renda_mensal_est: number;
}

export interface Asset {
  ticker: string;
  tipo: string;
  qtd: number;
  pm: number;
  meta: number;
  preco_atual: number;
  min_6m: number;
  
  // Valores calculados
  total_atual: number;
  total_investido: number;
  lucro_valor: number;
  lucro_pct: number;
  pct_na_categoria: number;
  falta_comprar: number;
  
  // Estratégia
  recomendacao: string; // Texto legível (Ex: Compra Forte)
  status: 'COMPRA_FORTE' | 'COMPRAR' | 'AGUARDAR' | 'MANTER' | 'NEUTRO'; // Código lógico
  score: number;
  motivo: string;
  
  // Métricas Opcionais (spread do metrics)
  vi_graham?: number;
  mg_graham?: number;
  magic_number?: number;
  renda_mensal_est?: number;
}

export interface DashboardData {
  status: string;
  dolar: number;
  resumo: {
    Total: number;
    RendaMensal: number;
    TotalInvestido: number;
    LucroTotal: number;
    [key: string]: number; // Para totais dinâmicos de categoria
  };
  grafico: { name: string; value: number }[];
  alertas: string[];
  ativos: Asset[];
}
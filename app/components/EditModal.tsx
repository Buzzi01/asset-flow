'use client';
import { useState, useEffect } from 'react';
import { X, Save, Calculator, Trash2, DollarSign, Info, Plus, Minus } from 'lucide-react';
import { Asset } from '../types';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  ativo: Asset | null;
  allAssets?: Asset[];
}

export const EditModal = ({ isOpen, onClose, onSave, ativo, allAssets = [] }: EditModalProps) => {
  const [formData, setFormData] = useState({
    quantity: 0,
    average_price: 0,
    target_percent: 0,
    manual_dy: 0,
    manual_lpa: 0,
    manual_vpa: 0,
    manual_price: 0
  });

  const [loading, setLoading] = useState(false);

  // 1️⃣ Validação de Domínio: Identifica se o formato pertence à Bolsa
  const isMarketTicker = (ticker: string) => {
    if (!ticker) return false;
    const t = ticker.trim().toUpperCase();
    return (
      /^[A-Z]{4}[0-9]{1,2}$/.test(t) ||    // Ações/BDRs: PETR4, VALE3, GOGL34
      /^[A-Z0-9]{4,6}11$/.test(t) ||       // FIIs/ETFs: HGLG11, B5P211, IVVB11
      /^[A-Z]{1,4}$/.test(t)               // ETFs USA: IVV, VT, QQQ
    );
  };

  // 2️⃣ Lógica de Decisão: Define a interface do Modal
  const shouldShowManualPrice = () => {
    if (!ativo) return false;

    const ticker = ativo.ticker?.trim().toUpperCase() || "";
    const preco = Number(ativo.preco_atual);
    const categoria = ativo.tipo || "";

    // REGRA 1: Não segue padrão de mercado? Manual obrigatório (TESTE, TESTE1)
    if (!isMarketTicker(ticker)) {
      return true;
    }

    // REGRA 2: É mercado, mas o preço está zerado/inválido? Manual (B5P211 se Yahoo falhar)
    // No seu services.py, mdata.price vira 0 se não houver captura
    if (isNaN(preco) || preco <= 0) {
      return true;
    }

    // REGRA 4: Caso contrário, confiamos na automação
    return false;
  };

  // 3️⃣ useEffect Sincronizado: Garante que o form reflita a decisão acima
  useEffect(() => {
    if (ativo && isOpen) {
      setFormData({
        quantity: ativo.qtd || 0,
        average_price: ativo.pm || 0,
        target_percent: ativo.meta || 0,
        manual_dy: Number(((ativo.manual_dy || 0) * 100).toFixed(2)),
        manual_lpa: ativo.manual_lpa || 0,
        manual_vpa: ativo.manual_vpa || 0,
        manual_price: Number(ativo.preco_atual) || 0
      });
    }
  }, [ativo, isOpen]);

  const adjustValue = (field: keyof typeof formData, delta: number, precision = 2) => {
    setFormData(prev => {
      const newVal = Number((prev[field] + delta).toFixed(precision));
      return { ...prev, [field]: Math.max(0, newVal) };
    });
  };

  const maxLimit = (() => {
    if (!ativo) return 100;
    const outrosDoMesmoTipo = allAssets.filter(
      (a) => a.tipo === ativo.tipo && a.ticker !== ativo.ticker
    );
    const totalOcupado = outrosDoMesmoTipo.reduce((acc, a) => acc + (a.meta || 0), 0);
    return Math.max(0, 100 - totalOcupado);
  })();

  useEffect(() => {
    if (ativo && isOpen) { // Adicionado isOpen para resetar o form ao abrir
      setFormData({
        quantity: ativo.qtd || 0,
        average_price: ativo.pm || 0,
        target_percent: ativo.meta || 0,
        manual_dy: Number(((ativo.manual_dy || 0) * 100).toFixed(2)),
        manual_lpa: ativo.manual_lpa || 0,
        manual_vpa: ativo.manual_vpa || 0,
        manual_price: ativo.preco_atual || 0
      });
    }
  }, [ativo, isOpen]);

  const handleSave = async () => {
    if (!ativo) return;
    setLoading(true);
    try {
      const payload = {
        ticker: ativo.ticker,
        qtd: Number(formData.quantity) || 0,
        pm: Number(formData.average_price) || 0,
        meta: Number(formData.target_percent) || 0,
        dy: Number(formData.manual_dy) / 100 || 0,
        lpa: Number(formData.manual_lpa) || 0,
        vpa: Number(formData.manual_vpa) || 0,
        // IMPORTANTE: Verifique se o backend espera 'current_price' ou 'manual_price'
        current_price: Number(formData.manual_price) || 0
      };

      const res = await fetch('http://localhost:5328/api/update_asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSave();
        onClose();
      } else {
        const errorData = await res.json();
        alert(`Erro ao salvar: ${errorData.msg || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error(error);
      alert("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!ativo) return;
    if (!window.confirm(`Deseja realmente excluir ${ativo.ticker}?`)) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5328/api/delete_asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ativo.id }),
      });
      if (res.ok) { onSave(); onClose(); }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const InputControl = ({ label, value, field, step, precision, color = "blue" }: any) => (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">{label}</label>
      <div className={`flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden focus-within:border-${color}-500/50 transition-all shadow-inner`}>
        <button type="button" onClick={() => adjustValue(field, -step, precision)} className={`p-2.5 text-${color}-500 hover:bg-${color}-500/10 transition-colors`}>
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => setFormData({ ...formData, [field]: Number(e.target.value) })}
          className="w-full bg-transparent p-2 text-white outline-none font-mono text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" onClick={() => adjustValue(field, step, precision)} className={`p-2.5 text-${color}-500 hover:bg-${color}-500/10 transition-colors`}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );

  if (!isOpen || !ativo) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f172a] w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-900/50 p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-400 font-bold border border-blue-500/20 text-lg shadow-inner">
              {ativo.ticker.substring(0, 2)}
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight uppercase">Configurar {ativo.ticker}</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">{ativo.tipo}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {shouldShowManualPrice() && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <DollarSign size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Preço Manual</span>
              </div>
              <InputControl label="Preço Atual / Saldo" value={formData.manual_price} field="manual_price" step={10} precision={2} color="emerald" />
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 italic ml-1">
                <Info size={10} />
                <span>Yahoo Finance desativado ou não encontrado.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <InputControl label="Quantidade" value={formData.quantity} field="quantity" step={1} precision={4} color="blue" />
            <InputControl label="Preço Médio" value={formData.average_price} field="average_price" step={0.5} precision={2} color="blue" />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex justify-between items-center ml-1">
              <span>Meta na Carteira</span>
              <div className="text-right flex flex-col items-end">
                <span className="text-blue-400 font-mono text-sm leading-none">{formData.target_percent}%</span>
                <span className="text-[9px] text-slate-600 font-normal tracking-normal mt-1">limite: {maxLimit.toFixed(1)}%</span>
              </div>
            </label>
            <input
              type="range" min="0" max={maxLimit} step="0.5"
              value={formData.target_percent > maxLimit ? maxLimit : formData.target_percent}
              onChange={(e) => setFormData({ ...formData, target_percent: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {!shouldShowManualPrice() && (
            <div className="pt-5 border-t border-slate-800/50 space-y-4">
              <div className="flex items-center gap-2 ml-1">
                <Calculator size={14} className="text-purple-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inteligência</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputControl label="DY Anual %" value={formData.manual_dy} field="manual_dy" step={0.1} precision={2} color="purple" />
                {ativo.tipo === 'FII' && (
                  <InputControl label="VP / Cota" value={formData.manual_vpa} field="manual_vpa" step={0.5} precision={2} color="purple" />
                )}
                {ativo.tipo === 'Ação' && (
                  <>
                    <InputControl label="LPA (Lucro)" value={formData.manual_lpa} field="manual_lpa" step={0.5} precision={2} color="purple" />
                    <div className="col-span-2">
                      <InputControl label="VPA (Patrimonial)" value={formData.manual_vpa} field="manual_vpa" step={0.5} precision={2} color="purple" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900/80 p-5 border-t border-slate-800 flex justify-between items-center">
          <button type="button" onClick={handleDelete} disabled={loading} className="text-rose-500 hover:text-rose-400 p-2.5 hover:bg-rose-500/10 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest disabled:opacity-50">
            <Trash2 size={16} />
            <span>Excluir</span>
          </button>
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest">Cancelar</button>
            <button type="button" onClick={handleSave} disabled={loading} className="px-6 py-2.5 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/20 uppercase tracking-widest disabled:opacity-50">
              {loading ? 'Salvando...' : <><Save size={14} /> Atualizar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
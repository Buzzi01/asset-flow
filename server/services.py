# server/services.py
import sys
import os
import yfinance as yf
import math
import pandas as pd
from datetime import datetime, date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ajuste para importar da pasta vizinha
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from database.models import Asset, Position, Category, MarketData, PortfolioSnapshot, engine

# Configuração da Sessão (Factory)
Session = sessionmaker(bind=engine)

class PortfolioService:
    # Não guardamos mais sessão no __init__ para evitar vazamento
    def __init__(self):
        pass

    def _extract_value(self, data_point):
        """Helper: Extrai valor numérico de Series/Dataframes do Pandas"""
        try:
            if hasattr(data_point, 'iloc'):
                return float(data_point.iloc[0])
            if hasattr(data_point, 'item'):
                return float(data_point.item())
            return float(data_point)
        except:
            return 0.0

    def get_usd_rate(self):
        """Busca cotação do Dólar (BRL=X)"""
        try:
            ticker = yf.Ticker("BRL=X")
            hist = ticker.history(period="1d")
            if not hist.empty:
                return float(hist['Close'].iloc[-1])
        except Exception as e:
            print(f"⚠️ Erro ao buscar Dólar: {e}")
        return 5.80 # Fallback se falhar

    def update_prices(self):
        """JOB: Baixa preços UM POR UM com gestão correta de sessão"""
        print("🔄 JOB: Iniciando atualização sequencial...")
        
        # Abre sessão temporária
        with Session() as session:
            assets = session.query(Asset).filter(Asset.ticker != 'Nubank Caixinha').all()
            
            count_ok = 0
            count_err = 0

            for asset in assets:
                if asset.category.name in ['Ação', 'FII', 'Renda Fixa', 'ETF']:
                    symbol = f"{asset.ticker}.SA"
                else:
                    symbol = asset.ticker
                
                try:
                    # Timeout de 10s para não travar o job
                    stock = yf.Ticker(symbol)
                    hist = stock.history(period="1y") # yfinance não aceita timeout direto no history, mas o request interno tem
                    
                    if hist.empty:
                        print(f"⚠️ {asset.ticker}: Sem dados encontrados.")
                        count_err += 1
                        continue

                    current_price = float(hist['Close'].iloc[-1])
                    min_6m = float(hist['Close'].tail(126).min())

                    # Atualiza Banco
                    mdata = session.query(MarketData).filter_by(asset_id=asset.id).first()
                    if not mdata:
                        mdata = MarketData(asset_id=asset.id)
                        session.add(mdata)
                    
                    mdata.price = current_price
                    mdata.min_6m = min_6m
                    mdata.date = datetime.now()
                    
                    print(f"   ✅ {asset.ticker}: R$ {current_price:.2f}")
                    count_ok += 1

                except Exception as e:
                    print(f"   ❌ {asset.ticker}: Erro - {e}")
                    count_err += 1
            
            session.commit()
            print(f"🏁 Fim do JOB. Sucessos: {count_ok} | Falhas: {count_err}")

    def get_dashboard_data(self):
        """Monta o JSON para o site"""
        with Session() as session:
            positions = session.query(Position).all()
            categories = session.query(Category).all()
            
            # Busca dólar atualizado
            dolar_rate = self.get_usd_rate()
            
            resumo = {"Total": 0, "RendaMensal": 0, "TotalInvestido": 0, "LucroTotal": 0}
            cat_totals = {c.name: 0 for c in categories}
            cat_metas = {c.name: c.target_percent for c in categories}
            
            ativos_proc = []

            for pos in positions:
                asset = pos.asset
                mdata = asset.market_data[0] if asset.market_data else None
                
                try:
                    qtd = float(pos.quantity or 0)
                    pm = float(pos.average_price or 0)

                    if mdata and mdata.price is not None:
                        preco = float(mdata.price)
                        min_6m = float(mdata.min_6m or 0)
                    else:
                        preco = pm if pm > 0 else 0.0
                        min_6m = 0.0
                except:
                    qtd=0; pm=0; preco=0; min_6m=0

                fator = dolar_rate if asset.currency == 'USD' else 1.0
                
                total_atual = qtd * preco * fator
                total_investido = qtd * pm * fator
                
                resumo["Total"] += total_atual
                resumo["TotalInvestido"] += total_investido
                if asset.category.name in cat_totals:
                    cat_totals[asset.category.name] += total_atual
                
                metrics = self._calculate_metrics(pos, preco, min_6m)
                resumo["RendaMensal"] += metrics["renda_mensal_est"]
                
                ativos_proc.append({
                    "obj": pos, 
                    "total_atual": total_atual,
                    "total_investido": total_investido,
                    "preco_atual": preco,
                    "min_6m": min_6m,
                    "metrics": metrics
                })

            resumo["LucroTotal"] = resumo["Total"] - resumo["TotalInvestido"]
            resumo.update(cat_totals)

            final_list = []
            alertas = []
            
            for item in ativos_proc:
                pos = item["obj"]
                cat_name = pos.asset.category.name
                
                total_cat = cat_totals.get(cat_name, 1)
                pct_na_categoria = (item["total_atual"] / total_cat * 100) if total_cat > 0 else 0
                
                meta_macro = cat_metas.get(cat_name, 0) / 100
                meta_micro = (pos.target_percent or 0) / 100
                meta_global_valor = resumo["Total"] * meta_macro * meta_micro
                falta = meta_global_valor - item["total_atual"]
                
                rec_text, status, score, motivo = self._apply_strategy(pos, item["metrics"], falta, item["preco_atual"], item["min_6m"])
                
                if pos.target_percent and pct_na_categoria > pos.target_percent * 1.5:
                    alertas.append(f"{pos.asset.ticker} estourou meta ({pct_na_categoria:.1f}%)")

                final_list.append({
                    "ticker": pos.asset.ticker,
                    "tipo": cat_name,
                    "qtd": pos.quantity,
                    "pm": pos.average_price,
                    "meta": pos.target_percent,
                    "preco_atual": item["preco_atual"],
                    "min_6m": item["min_6m"],
                    "total_atual": item["total_atual"],          
                    "total_investido": item["total_investido"],  
                    "lucro_valor": item["total_atual"] - item["total_investido"],
                    "lucro_pct": ((item["total_atual"] - item["total_investido"]) / item["total_investido"] * 100) if item["total_investido"] > 0 else 0,
                    "pct_na_categoria": pct_na_categoria,
                    "falta_comprar": falta,
                    "recomendacao": rec_text, "status": status, "score": score, "motivo": motivo,
                    **item["metrics"]
                })

            final_list.sort(key=lambda x: x["score"], reverse=True)
            grafico = [{"name": k, "value": v} for k, v in cat_totals.items() if v > 0]
            
            return {
                "status": "Sucesso", "dolar": dolar_rate,
                "resumo": resumo, "grafico": grafico, "alertas": alertas, "ativos": final_list
            }

    def _calculate_metrics(self, pos, preco, min_6m):
        m = {"vi_graham": 0, "mg_graham": 0, "magic_number": 0, "renda_mensal_est": 0}
        try:
            dy = self._extract_value(pos.manual_dy)
            lpa = self._extract_value(pos.manual_lpa)
            vpa = self._extract_value(pos.manual_vpa)
            qtd = self._extract_value(pos.quantity)
            
            if dy > 0:
                m["renda_mensal_est"] = (dy * qtd) / 12
                if preco > 0: m["magic_number"] = math.ceil(preco / (dy / 12))
                
            if pos.asset.category.name == "Ação" and lpa > 0 and vpa > 0:
                m["vi_graham"] = math.sqrt(22.5 * lpa * vpa)
                if preco > 0: m["mg_graham"] = ((m["vi_graham"] - preco) / preco) * 100
        except: pass
        return m

    def _apply_strategy(self, pos, metrics, falta, preco, min_6m):
        # Definição dos Estados (Status Codes)
        status = "NEUTRO" 
        rec_text = "MANTER"
        motivo = [] 
        score = 0
        
        # 1. Pontuação Base (Rebalanceamento)
        if falta > 0: 
            score += 30
            motivo.append("Abaixo da Meta")
        else: 
            score -= 20
        
        # 2. Análise Técnica/Fundamentalista
        if pos.asset.category.name == "Ação":
            if metrics["mg_graham"] > 20: 
                score += 30
                motivo.append("Graham Barato")
            if min_6m > 0 and preco <= min_6m * 1.05: 
                score += 20
                motivo.append("No Fundo (6m)")
            
        elif pos.asset.category.name == "FII":
            if metrics["magic_number"] > 0 and pos.quantity >= metrics["magic_number"]: 
                score += 10
                motivo.append("Bola de Neve ❄️")

        # 3. Decisão Final (Regra de Negócio Pura)
        if falta > 0:
            if score >= 60: 
                status = "COMPRA_FORTE"
                rec_text = "COMPRA FORTE"
            elif score >= 30: 
                status = "COMPRAR"
                rec_text = "COMPRAR"
            else: 
                status = "AGUARDAR"
                rec_text = "AGUARDAR"
        else: 
            status = "MANTER"
            rec_text = "MANTER"
            
        # Retorna STATUS (código) em vez de COR
        return rec_text, status, score, ", ".join(motivo)
    
    def take_daily_snapshot(self):
        """JOB: Snapshot"""
        print("📸 JOB: Gerando Snapshot Diário...")
        with Session() as session:
            positions = session.query(Position).all()
            total_equity = 0
            total_invested = 0
            
            # Busca dólar só para o snapshot
            dolar_rate = self.get_usd_rate()

            for pos in positions:
                mdata = pos.asset.market_data[0] if pos.asset.market_data else None
                try:
                    if mdata and mdata.price is not None:
                        price = float(mdata.price)
                    else:
                        price = float(pos.average_price or 0)
                    
                    qtd = float(pos.quantity or 0)
                    pm = float(pos.average_price or 0)
                except:
                    price=0; qtd=0; pm=0
                
                fator = dolar_rate if pos.asset.currency == 'USD' else 1.0
                total_equity += (qtd * price * fator)
                total_invested += (qtd * pm * fator)
                
            today = date.today()
            existing = session.query(PortfolioSnapshot).filter(PortfolioSnapshot.date == today).first()
            
            if existing:
                existing.total_equity = total_equity
                existing.total_invested = total_invested
                existing.profit = total_equity - total_invested
            else:
                snap = PortfolioSnapshot(date=today, total_equity=total_equity, total_invested=total_invested, profit=total_equity-total_invested)
                session.add(snap)
                
            session.commit()

    # CORREÇÃO 1.1: Método movido para fora (indentação corrigida)
    def get_history_data(self):
        """Retorna o histórico para o gráfico de evolução"""
        with Session() as session:
            snapshots = session.query(PortfolioSnapshot).order_by(PortfolioSnapshot.date).all()
            
            history = []
            for s in snapshots:
                history.append({
                    "date": s.date.strftime("%d/%m"), 
                    "Patrimônio": s.total_equity,
                    "Investido": s.total_invested,
                    "Lucro": s.profit
                })
                
            return history
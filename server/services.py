# server/services.py
import sys
import os
import shutil
import yfinance as yf
import math
import pandas as pd
import requests
import time
from datetime import datetime, date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ajuste para importar da pasta vizinha
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from database.models import Asset, Position, Category, MarketData, PortfolioSnapshot, engine

Session = sessionmaker(bind=engine)

class PortfolioService:
    def __init__(self):
        pass

    def _extract_value(self, data_point):
        try:
            if hasattr(data_point, 'iloc'):
                return float(data_point.iloc[0])
            if hasattr(data_point, 'item'):
                return float(data_point.item())
            return float(data_point)
        except:
            return 0.0

    def get_usd_rate(self):
        try:
            ticker = yf.Ticker("BRL=X")
            hist = ticker.history(period="1d")
            if not hist.empty:
                return float(hist['Close'].iloc[-1])
        except Exception as e:
            print(f"⚠️ Erro ao buscar Dólar: {e}")
        return 5.80

    def update_prices(self):
        print("🔄 JOB: Atualizando Preços e Fundamentos (Modo Nativo + Pausa)...")
        
        # REMOVIDO: A sessão manual que causava o erro. Deixamos o yfinance gerenciar.

        with Session() as session_db:
            assets = session_db.query(Asset).filter(Asset.ticker != 'Nubank Caixinha').all()
            count_ok = 0; count_err = 0

            for asset in assets:
                # Tratamento do Símbolo (.SA)
                if asset.category.name in ['Ação', 'FII', 'Renda Fixa', 'ETF']:
                    symbol = f"{asset.ticker}.SA" if not asset.ticker.endswith('.SA') else asset.ticker
                else:
                    symbol = asset.ticker
                
                try:
                    # CORREÇÃO: Chamada simples, sem 'session='
                    stock = yf.Ticker(symbol)
                    
                    # --- PREÇO (Histórico) ---
                    # Periodo curto para ser rápido
                    hist = stock.history(period="5d")
                    current_price = 0.0
                    min_6m = 0.0
                    
                    if not hist.empty:
                        current_price = float(hist['Close'].iloc[-1])
                        # Se quiser ser muito preciso na mínima, teria que baixar "6mo", 
                        # mas isso deixa lento. Vamos focar no preço atual primeiro.
                    
                    # --- FUNDAMENTOS ---
                    lpa = 0; vpa = 0; dy = 0
                    
                    # Só tenta buscar info pesada se for Ação/FII
                    if asset.category.name in ['Ação', 'FII', 'Internacional']:
                        try:
                            # Tenta pegar infos básicas. Se o Yahoo bloquear, vai cair no except e seguir vida.
                            info = stock.info
                            
                            lpa = info.get('trailingEps') or info.get('forwardEps') or 0
                            vpa = info.get('bookValue') or info.get('navPrice') or 0
                            
                            dy_raw = info.get('dividendYield', 0) or 0
                            if dy_raw and current_price > 0:
                                dy = info.get('dividendRate') or (current_price * dy_raw)
                        except Exception as e_info:
                            # Falha silenciosa nos fundamentos para não travar o preço
                            # print(f"   ⚠️ Info n/d para {asset.ticker}") 
                            pass

                    # --- SALVAR NO BANCO ---
                    
                    # 1. Market Data
                    mdata = session_db.query(MarketData).filter_by(asset_id=asset.id).first()
                    if not mdata:
                        mdata = MarketData(asset_id=asset.id)
                        session_db.add(mdata)
                    
                    if current_price > 0:
                        mdata.price = current_price
                        mdata.date = datetime.now()
                        if not hist.empty and len(hist) > 100:
                             mdata.min_6m = float(hist['Close'].min())

                    # 2. Position (Fundamentos)
                    pos = session_db.query(Position).filter_by(asset_id=asset.id).first()
                    if pos:
                        if (pos.manual_lpa or 0) == 0 and lpa != 0: pos.manual_lpa = float(lpa)
                        if (pos.manual_vpa or 0) == 0 and vpa != 0: pos.manual_vpa = float(vpa)
                        if (pos.manual_dy or 0) == 0 and dy != 0: pos.manual_dy = float(dy)

                    # Log de Sucesso
                    infos_extras = ""
                    if lpa > 0 or vpa > 0: infos_extras = f"| LPA: {lpa:.2f} VPA: {vpa:.2f}"
                    print(f"   ✅ {asset.ticker}: R$ {current_price:.2f} {infos_extras}")
                    count_ok += 1
                    
                except Exception as e:
                    print(f"   ❌ {asset.ticker}: Falha - {e}")
                    count_err += 1
                
                # ESTRATÉGIA DE SEGURANÇA: Pausa de 0.5 segundos entre requisições
                # Isso evita que o Yahoo bloqueie seu IP por "spam"
                time.sleep(0.5)
            
            session_db.commit()
            print(f"🏁 Fim do JOB. Sucessos: {count_ok} | Falhas: {count_err}")

    def get_dashboard_data(self):
        with Session() as session:
            positions = session.query(Position).all()
            categories = session.query(Category).all()
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
                except: qtd=0; pm=0; preco=0; min_6m=0

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
                    "obj": pos, "total_atual": total_atual, "total_investido": total_investido,
                    "preco_atual": preco, "min_6m": min_6m, "metrics": metrics
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
                
                # --- SISTEMA DE ALERTAS (VERSÃO BUY & HOLD) ---
                
                # 1. Rebalanceamento (Amarelo): Só avisa para não comprar mais desse por enquanto
                if pos.target_percent and pct_na_categoria > pos.target_percent * 1.5:
                    alertas.append(f"REBALANCEAR:{pos.asset.ticker} ultrapassou a meta ideal (Está com {pct_na_categoria:.1f}%)")

                # 2. Mínima (Verde): Bom ponto de entrada
                if item["min_6m"] > 0 and item["preco_atual"] <= item["min_6m"] * 1.03:
                     alertas.append(f"QEDA:{pos.asset.ticker} próximo da mínima de 6 meses")

                # 3. Valor/Graham (Azul): Ação barata (Promoção)
                if "mg_graham" in item["metrics"] and item["metrics"]["mg_graham"] > 50:
                     alertas.append(f"GRAHAM:{pos.asset.ticker} está descontada (Potencial de Valor)")

                # 4. P/VP para FIIs (NOVO)
                if cat_name == "FII" and "p_vp" in item["metrics"]:
                     pvp = item["metrics"]["p_vp"]
                     if pvp > 0 and pvp < 0.95: # Desconto de 5% ou mais
                         alertas.append(f"PVP:{pos.asset.ticker} está barato (P/VP {pvp:.2f})")

                # 5. Bola de Neve (Ciano): Faltam poucas cotas
                mn = item["metrics"].get("magic_number", 0)
                if mn > 0 and pos.quantity < mn and (mn - pos.quantity) <= 5:
                     alertas.append(f"MAGIC:{pos.asset.ticker} quase atingindo o Número Mágico (Faltam {int(mn - pos.quantity)})")
                
                # ----------------------------------------

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
                    
                    # --- CORREÇÃO VITAL: Retornando dados manuais para o Frontend ---
                    "manual_dy": pos.manual_dy,
                    "manual_lpa": pos.manual_lpa,
                    "manual_vpa": pos.manual_vpa,
                    # -----------------------------------------------------------------

                    "recomendacao": rec_text, "status": status, "score": score, "motivo": motivo,
                    **item["metrics"]
                })

            final_list.sort(key=lambda x: x["score"], reverse=True)
            grafico = [{"name": k, "value": v} for k, v in cat_totals.items() if v > 0]
            
            return { "status": "Sucesso", "dolar": dolar_rate, "resumo": resumo, "grafico": grafico, "alertas": alertas, "ativos": final_list }

    def _calculate_metrics(self, pos, preco, min_6m):
        m = {"vi_graham": 0, "mg_graham": 0, "magic_number": 0, "renda_mensal_est": 0, "p_vp": 0}
        try:
            dy = self._extract_value(pos.manual_dy)
            lpa = self._extract_value(pos.manual_lpa)
            vpa = self._extract_value(pos.manual_vpa)
            qtd = self._extract_value(pos.quantity)
            
            if dy > 0:
                m["renda_mensal_est"] = (dy * qtd) / 12
                if preco > 0: m["magic_number"] = math.ceil(preco / (dy / 12))
            
            # Cálculo P/VP (Novo)
            if vpa > 0 and preco > 0:
                m["p_vp"] = preco / vpa

            if pos.asset.category.name == "Ação" and lpa > 0 and vpa > 0:
                m["vi_graham"] = math.sqrt(22.5 * lpa * vpa)
                if preco > 0: m["mg_graham"] = ((m["vi_graham"] - preco) / preco) * 100
        except: pass
        return m

    def _apply_strategy(self, pos, metrics, falta, preco, min_6m):
        rec_text = "MANTER"; status = "NEUTRO"; motivo = []; score = 0
        if falta > 0: score += 30; motivo.append("Abaixo da Meta")
        else: score -= 20
        
        if pos.asset.category.name == "Ação":
            if metrics["mg_graham"] > 20: score += 30; motivo.append("Graham Barato")
            if min_6m > 0 and preco <= min_6m * 1.05: score += 20; motivo.append("No Fundo (6m)")
        elif pos.asset.category.name == "FII":
            if metrics["magic_number"] > 0 and pos.quantity >= metrics["magic_number"]: 
                score += 10; motivo.append("Bola de Neve ❄️")
            # Score extra para FII barato (Novo)
            if metrics["p_vp"] > 0 and metrics["p_vp"] < 0.95:
                score += 20; motivo.append("Desconto Patrimonial")

        if falta > 0:
            if score >= 60: status = "COMPRA_FORTE"; rec_text = "COMPRA FORTE"
            elif score >= 30: status = "COMPRAR"; rec_text = "COMPRAR"
            else: status = "AGUARDAR"; rec_text = "AGUARDAR"
        else: status = "MANTER"; rec_text = "MANTER"
        return rec_text, status, score, ", ".join(motivo)

    def _backup_database(self):
        try:
            backup_dir = 'backups'
            if not os.path.exists(backup_dir): os.makedirs(backup_dir)
            filename = f"assetflow_backup_{date.today()}.db"
            dest = os.path.join(backup_dir, filename)
            shutil.copy('assetflow.db', dest)
            print(f"💾 Backup criado: {dest}")
        except Exception as e: print(f"❌ Erro backup: {e}")

    def take_daily_snapshot(self):
        print("📸 JOB: Snapshot...")
        with Session() as session:
            positions = session.query(Position).all()
            total_equity = 0; total_invested = 0
            dolar_rate = self.get_usd_rate()
            for pos in positions:
                mdata = pos.asset.market_data[0] if pos.asset.market_data else None
                try:
                    price = float(mdata.price) if (mdata and mdata.price) else float(pos.average_price or 0)
                    qtd = float(pos.quantity or 0)
                    pm = float(pos.average_price or 0)
                except: price=0; qtd=0; pm=0
                fator = dolar_rate if pos.asset.currency == 'USD' else 1.0
                total_equity += (qtd * price * fator)
                total_invested += (qtd * pm * fator)
            today = date.today()
            existing = session.query(PortfolioSnapshot).filter(PortfolioSnapshot.date == today).first()
            if existing:
                existing.total_equity = total_equity; existing.total_invested = total_invested
                existing.profit = total_equity - total_invested
            else:
                snap = PortfolioSnapshot(date=today, total_equity=total_equity, total_invested=total_invested, profit=total_equity-total_invested)
                session.add(snap)
            session.commit()
        self._backup_database()

    def get_history_data(self):
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
        
    def update_position(self, ticker, qtd, pm, meta, dy=0, lpa=0, vpa=0):
        """Atualiza posição + indicadores fundamentalistas"""
        print(f"📝 Atualizando {ticker} | Qtd:{qtd} PM:{pm} Meta:{meta}% | DY:{dy} LPA:{lpa} VPA:{vpa}")
        with Session() as session:
            asset = session.query(Asset).filter_by(ticker=ticker).first()
            if not asset: return {"status": "Erro", "msg": "Ativo não encontrado"}
            
            pos = session.query(Position).filter_by(asset_id=asset.id).first()
            if not pos:
                pos = Position(asset_id=asset.id)
                session.add(pos)
            
            # Dados de Posição
            pos.quantity = float(qtd)
            pos.average_price = float(pm)
            pos.target_percent = float(meta)
            
            # Dados Fundamentalistas (Manuais)
            pos.manual_dy = float(dy)
            pos.manual_lpa = float(lpa)
            pos.manual_vpa = float(vpa)
            
            session.commit()
            return {"status": "Sucesso", "msg": "Dados atualizados!"}
        
    def add_new_asset(self, ticker, category_name, qtd, pm):
        """Cria um ativo novo do zero"""
        print(f"🆕 Criando Ativo: {ticker} ({category_name})")
        with Session() as session:
            # 1. Verifica se já existe
            exists = session.query(Asset).filter_by(ticker=ticker).first()
            if exists:
                return {"status": "Erro", "msg": "Ativo já existe!"}
            
            # 2. Busca a Categoria
            category = session.query(Category).filter_by(name=category_name).first()
            if not category:
                # Fallback: Tenta criar ou pega a primeira
                category = session.query(Category).first()
            
            # 3. Define Moeda (BRL ou USD)
            currency = "USD" if category.name in ["Internacional", "Cripto"] else "BRL"
            
            # 4. Cria o Ativo
            new_asset = Asset(ticker=ticker, category_id=category.id, currency=currency)
            session.add(new_asset)
            session.flush() # Para gerar o ID
            
            # 5. Cria a Posição Inicial
            pos = Position(asset_id=new_asset.id, quantity=float(qtd), average_price=float(pm))
            session.add(pos)
            
            session.commit()
            return {"status": "Sucesso", "msg": "Ativo criado!"}
        
    def delete_asset(self, ticker):
        """Exclui completamente um ativo do banco de dados"""
        print(f"🗑️ Excluindo Ativo: {ticker}")
        with Session() as session:
            asset = session.query(Asset).filter_by(ticker=ticker).first()
            if not asset:
                return {"status": "Erro", "msg": "Ativo não encontrado"}
            
            # 1. Remove Posição (Quantidade/Preço Médio)
            session.query(Position).filter_by(asset_id=asset.id).delete()
            
            # 2. Remove Dados de Mercado (Preços salvos)
            session.query(MarketData).filter_by(asset_id=asset.id).delete()
            
            # 3. Remove o Ativo em si
            session.delete(asset)
            
            session.commit()
            return {"status": "Sucesso", "msg": f"{ticker} foi excluído para sempre."}
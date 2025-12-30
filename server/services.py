# server/services.py
import sys
import os
import shutil
import yfinance as yf
import math
import pandas as pd
import time
import numpy as np
import pytz 
from datetime import datetime, date, timedelta
from sqlalchemy.orm import scoped_session, sessionmaker
import traceback

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from database.models import Asset, Position, Category, MarketData, PortfolioSnapshot, engine

session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)

class PortfolioService:
    def __init__(self):
        pass

    def _extract_value(self, data_point):
        try:
            if hasattr(data_point, 'iloc'): return float(data_point.iloc[0])
            if hasattr(data_point, 'item'): return float(data_point.item())
            return float(data_point)
        except: return 0.0

    def get_usd_rate(self):
        try:
            ticker = yf.Ticker("BRL=X")
            data = ticker.history(period="1d")
            if not data.empty: return float(data['Close'].iloc[-1])
        except Exception as e:
            print(f"⚠️ Erro ao buscar Dólar: {e}")
        return 5.80 

    # --- CÁLCULOS TÉCNICOS ---
    def _calculate_rsi(self, series, period=14):
        if len(series) < period + 1: return 50.0
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else 50.0

    def _calculate_sma(self, series, window=20):
        if len(series) < window: return float(series.mean())
        return float(series.rolling(window=window).mean().iloc[-1])

    def update_prices(self):
        print("🔄 JOB: Atualizando Preços & Inteligência Técnica...")
        session = Session()
        try:
            assets = session.query(Asset).filter(Asset.ticker != 'Nubank Caixinha').all()
            tickers_map = {}; download_list = []

            for asset in assets:
                suffix = ".SA" if asset.category.name in ['Ação', 'FII', 'Renda Fixa', 'ETF'] and not asset.ticker.endswith('.SA') else ""
                symbol = f"{asset.ticker}{suffix}"
                tickers_map[symbol] = asset
                download_list.append(symbol)

            if not download_list:
                return

            print(f"   ⬇️ Baixando histórico (2 meses) para {len(download_list)} ativos...")
            try:
                batch_data = yf.download(download_list, period="2mo", group_by='ticker', threads=True, progress=False, auto_adjust=True)
            except Exception as e:
                print(f"❌ Erro crítico no download: {e}")
                return

            count_ok = 0
            
            for symbol, asset in tickers_map.items():
                try:
                    hist = pd.DataFrame()
                    if len(download_list) == 1:
                        if isinstance(batch_data, pd.DataFrame) and 'Close' in batch_data.columns:
                            hist = batch_data
                    else:
                        if symbol in batch_data.columns:
                            hist = batch_data[symbol]
                        elif 'Close' in batch_data.columns and symbol in batch_data['Close'].columns:
                            hist = pd.DataFrame({'Close': batch_data['Close'][symbol]})
                    
                    hist = hist.dropna(how='all')
                    if hist.empty or 'Close' not in hist.columns: continue

                    close_series = hist['Close']
                    current_price = float(close_series.iloc[-1])
                    min_6m = float(close_series.min())

                    rsi = self._calculate_rsi(close_series, 14)
                    sma20 = self._calculate_sma(close_series, 20)

                    mdata = session.query(MarketData).filter_by(asset_id=asset.id).first()
                    if not mdata:
                        mdata = MarketData(asset_id=asset.id)
                        session.add(mdata)
                    
                    mdata.price = current_price
                    mdata.date = datetime.now()
                    mdata.rsi_14 = rsi
                    mdata.sma_20 = sma20
                    
                    if mdata.min_6m is None or min_6m < mdata.min_6m:
                         mdata.min_6m = min_6m

                    count_ok += 1

                except Exception as e:
                    print(f"   ❌ Erro processando {asset.ticker}: {e}")

            session.commit()
            print(f"🏁 Fim do JOB. Atualizados: {count_ok}/{len(download_list)}")
        
        except Exception as e:
            session.rollback()
            print(f"❌ Erro Geral no Update: {e}")
        finally:
            Session.remove()

    def get_dashboard_data(self):
        session = Session()
        try:
            positions = session.query(Position).all()
            categories = session.query(Category).all()
            dolar_rate = self.get_usd_rate()
            
            resumo = {"Total": 0, "RendaMensal": 0, "TotalInvestido": 0, "LucroTotal": 0}
            cat_totals = {c.name: 0 for c in categories}
            cat_metas = {c.name: c.target_percent for c in categories}
            ativos_proc = []

            for pos in positions:
                asset = pos.asset
                
                # 👇 CORREÇÃO CRÍTICA (BLINDAGEM CONTRA ERRO 500)
                if not asset:
                    continue 
                # 👆 Se o ativo for None (deletado incorretamente antes), ele pula e não trava o site.

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
                
                rec_text, status, score, motivo, rsi = self._apply_strategy(pos, item["metrics"], falta, item["preco_atual"], item["min_6m"])
                
                if pos.target_percent and pct_na_categoria > pos.target_percent * 1.5:
                    alertas.append(f"⚠️ REBALANCEAR: {pos.asset.ticker} estourou a meta ({pct_na_categoria:.1f}%)")
                
                if rsi < 30:
                     alertas.append(f"💎 OPORTUNIDADE: {pos.asset.ticker} com RSI em {rsi:.0f} (Sobrevenda)")
                elif rsi > 75:
                     alertas.append(f"📈 ALERTA: {pos.asset.ticker} esticado (RSI {rsi:.0f})")

                if item["min_6m"] > 0 and item["preco_atual"] <= item["min_6m"] * 1.03:
                     alertas.append(f"📉 MÍNIMA: {pos.asset.ticker} no fundo de 6 meses")

                final_list.append({
                    "id": pos.asset.id, # IMPORTANTE: O ID para o botão de deletar funcionar
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
                    "manual_dy": pos.manual_dy,
                    "manual_lpa": pos.manual_lpa,
                    "manual_vpa": pos.manual_vpa,
                    "recomendacao": rec_text, "status": status, "score": score, "motivo": motivo,
                    "rsi": rsi,
                    **item["metrics"]
                })

            final_list.sort(key=lambda x: x["score"], reverse=True)
            grafico = [{"name": k, "value": v} for k, v in cat_totals.items() if v > 0]

            cats_data = [{"name": c.name, "meta": c.target_percent} for c in categories]
            
            return { "status": "Sucesso", "dolar": dolar_rate, "resumo": resumo, "grafico": grafico, "alertas": alertas, "ativos": final_list, "categorias": cats_data }
        finally:
            Session.remove()

    def _calculate_metrics(self, pos, preco, min_6m):
        m = {"vi_graham": 0, "mg_graham": 0, "magic_number": 0, "renda_mensal_est": 0, "p_vp": 0}
        try:
            dy = self._extract_value(pos.manual_dy) 
            lpa = self._extract_value(pos.manual_lpa)
            vpa = self._extract_value(pos.manual_vpa)
            qtd = self._extract_value(pos.quantity)
            
            if dy > 0 and preco > 0:
                m["renda_mensal_est"] = (preco * dy * qtd) / 12
                m["magic_number"] = math.ceil(12 / dy)
            
            if vpa > 0 and preco > 0:
                m["p_vp"] = preco / vpa

            if pos.asset.category.name == "Ação" and lpa > 0 and vpa > 0:
                m["vi_graham"] = math.sqrt(22.5 * lpa * vpa)
                if preco > 0: m["mg_graham"] = ((m["vi_graham"] - preco) / preco) * 100
        except: pass
        return m

    def _apply_strategy(self, pos, metrics, falta, preco, min_6m):
        score = 0
        motivos = []
        
        if falta > 0: 
            score += 40
            motivos.append("⚖️ Abaixo da Meta (Rebalancear)")
        else: 
            score -= 20

        if pos.asset.category.name == "Ação":
            mg = metrics.get("mg_graham", 0)
            if mg > 50:
                score += 35
                motivos.append(f"💎 Graham: Super Desconto (+{mg:.0f}%)")
            elif mg > 20:
                score += 20
                motivos.append(f"💰 Graham: Oportunidade (+{mg:.0f}%)")
            elif mg < -20:
                score -= 10
                motivos.append(f"💸 Graham: Preço Esticado ({mg:.0f}%)")
                
        elif pos.asset.category.name == "FII":
            pvp = metrics.get("p_vp", 1)
            if pvp > 0 and pvp < 0.90:
                score += 35
                motivos.append(f"🏢 P/VP: Muito Descontado ({pvp:.2f})")
            elif pvp > 0 and pvp < 1.00:
                score += 20
                motivos.append(f"🏬 P/VP: Abaixo do Patrimonial ({pvp:.2f})")
            elif pvp > 1.15:
                score -= 10
                motivos.append(f"⚠️ P/VP: Ágio Elevado ({pvp:.2f})")

            mn = metrics.get("magic_number", 0)
            if mn > 0 and pos.quantity >= mn:
                score += 10
                motivos.append("❄️ Efeito Bola de Neve Ativo")

        rsi = 50
        if pos.asset.market_data and len(pos.asset.market_data) > 0:
            rsi = pos.asset.market_data[0].rsi_14 or 50
        
        if rsi < 30:
            score += 25
            motivos.append(f"📉 RSI: Sobrevenda Extrema ({rsi:.0f})")
        elif rsi < 40:
            score += 15
            motivos.append(f"↘️ RSI: Zona de Compra ({rsi:.0f})")
        elif rsi > 70:
            score -= 15
            motivos.append(f"🔥 RSI: Sobrecomprado ({rsi:.0f})")
        
        if min_6m > 0 and preco <= min_6m * 1.02: 
            score += 15
            motivos.append("⚓ Na Mínima de 6 Meses")

        if falta > 0:
            if score >= 80: 
                status = "COMPRA_FORTE"
                rec_text = "💎 OPORTUNIDADE"
            elif score >= 50: 
                status = "COMPRAR"
                rec_text = "COMPRAR"
            elif score >= 20: 
                status = "AGUARDAR"
                rec_text = "OBSERVAR"
            else:
                status = "NEUTRO"
                rec_text = "NEUTRO"
        else:
            status = "MANTER"
            rec_text = "MANTER"
            
        return rec_text, status, score, " • ".join(motivos), rsi

    def _backup_database(self):
        try:
            backup_dir = 'backups'
            if not os.path.exists(backup_dir): os.makedirs(backup_dir)
            filename = f"assetflow_backup_{date.today()}.db"
            dest = os.path.join(backup_dir, filename)
            shutil.copy('assetflow.db', dest)
        except Exception as e: print(f"❌ Erro backup: {e}")

    def take_daily_snapshot(self):
        print("📸 JOB: Snapshot...")
        session = Session()
        try:
            positions = session.query(Position).all()
            total_equity = 0; total_invested = 0
            dolar_rate = self.get_usd_rate()
            for pos in positions:
                asset = pos.asset
                if not asset: continue # Blindagem aqui também
                
                mdata = asset.market_data[0] if asset.market_data else None
                try:
                    price = float(mdata.price) if (mdata and mdata.price) else float(pos.average_price or 0)
                    qtd = float(pos.quantity or 0)
                    pm = float(pos.average_price or 0)
                except: price=0; qtd=0; pm=0
                fator = dolar_rate if asset.currency == 'USD' else 1.0
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
        except: session.rollback()
        finally: Session.remove()

    def get_history_data(self):
        session = Session()
        try:
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
        finally: Session.remove()
        
    def update_position(self, ticker, qtd, pm, meta, dy=0, lpa=0, vpa=0, current_price=None):
        print(f"📝 Atualizando {ticker} (Preço Manual: {current_price})...")
        session = Session()
        try:
            asset = session.query(Asset).filter_by(ticker=ticker).first()
            if not asset: return {"status": "Erro", "msg": "Ativo não encontrado"}
            
            # 1. Atualiza a POSIÇÃO (Seus dados de compra)
            pos = session.query(Position).filter_by(asset_id=asset.id).first()
            if not pos:
                pos = Position(asset_id=asset.id)
                session.add(pos)
            
            pos.quantity = float(qtd)
            pos.average_price = float(pm)
            pos.target_percent = float(meta)
            pos.manual_dy = float(dy)
            pos.manual_lpa = float(lpa)
            pos.manual_vpa = float(vpa)
            
            # 2. Atualiza o PREÇO ATUAL (Market Data)
            # Isso permite definir quanto vale HOJE, ignorando o Yahoo
            if current_price is not None and str(current_price).strip() != "":
                mdata = session.query(MarketData).filter_by(asset_id=asset.id).first()
                if not mdata:
                    mdata = MarketData(asset_id=asset.id)
                    session.add(mdata)
                
                # Atualiza preço e data para "agora"
                mdata.price = float(current_price)
                mdata.date = datetime.now()
                # Zera os indicadores técnicos já que é manual
                mdata.min_6m = float(current_price) 
                
            session.commit()
            return {"status": "Sucesso", "msg": "Dados e Preço Atualizados!"}
        except Exception as e:
            session.rollback()
            return {"status": "Erro", "msg": str(e)}
        finally:
            Session.remove()
        
    # 👇 CORREÇÃO: Adicionamos o parâmetro meta=0
    def add_new_asset(self, ticker, category_name, qtd, pm, meta=0):
        ticker = ticker.upper().strip().replace(".SA", "")
        print(f"🆕 Criando Ativo: {ticker}")
        session = Session()
        try:
            exists = session.query(Asset).filter_by(ticker=ticker).first()
            if exists: return {"status": "Erro", "msg": "Ativo já existe!"}
            
            category = session.query(Category).filter_by(name=category_name).first()
            if not category: category = session.query(Category).first()
            
            currency = "USD" if category.name in ["Internacional", "Cripto"] else "BRL"
            new_asset = Asset(ticker=ticker, category_id=category.id, currency=currency)
            session.add(new_asset)
            session.flush()
            
            # 👇 Salva a META junto com a posição
            pos = Position(
                asset_id=new_asset.id, 
                quantity=float(qtd), 
                average_price=float(pm),
                target_percent=float(meta) # Salvando a meta inicial
            )
            session.add(pos)
            
            session.commit()
            return {"status": "Sucesso", "msg": "Ativo criado!"}
        except Exception as e:
            session.rollback()
            return {"status": "Erro", "msg": str(e)}
        finally: Session.remove()
        
    def delete_asset(self, asset_id):
        session = Session()
        try:
            print(f"🗑️ FORCE DELETE: Iniciando exclusão do Ativo ID: {asset_id}")
            
            # 1. Verifica se o ativo existe
            asset = session.query(Asset).filter_by(id=asset_id).first()
            if not asset:
                return {"status": "Erro", "msg": "Ativo não encontrado"}
            
            # 2. APAGA OS FILHOS MANUALMENTE (Ignora a regra do banco)
            # Isso garante que não sobra linha NULL, independente da config do DB.
            
            # Apaga Posições vinculadas
            qtd_pos = session.query(Position).filter_by(asset_id=asset_id).delete()
            print(f"   - Posições removidas: {qtd_pos}")
            
            # Apaga Histórico de Preços (MarketData) vinculado
            qtd_md = session.query(MarketData).filter_by(asset_id=asset_id).delete()
            print(f"   - Histórico removido: {qtd_md}")
            
            # 3. Finalmente, apaga o Pai (Ativo)
            session.delete(asset)
            session.commit()
            
            return {"status": "Sucesso", "msg": "Ativo e dados vinculados excluídos!"}
            
        except Exception as e:
            session.rollback()
            print(f"❌ Erro ao deletar: {e}")
            return {"status": "Erro", "msg": str(e)}
        finally:
            Session.remove()

    def run_monte_carlo_simulation(self, days=252, simulations=1000):
        print("🎲 --- INICIANDO MONTE CARLO ---")
        session = Session()
        try:
            positions = session.query(Position).all()
            tickers = []
            weights = []
            total_value = 0.0
            
            for pos in positions:
                # Blindagem contra órfãos
                if not pos.asset: continue

                if pos.asset.category.name in ['Ação', 'FII', 'ETF', 'Internacional']:
                    price = 0.0
                    if pos.asset.market_data and len(pos.asset.market_data) > 0:
                        price = float(pos.asset.market_data[0].price or 0.0)
                    
                    if price == 0:
                        price = float(pos.average_price or 0.0)

                    qty = float(pos.quantity)
                    val = qty * price
                    
                    if val > 0:
                        suffix = ".SA" if pos.asset.category.name != 'Internacional' else ""
                        clean_ticker = pos.asset.ticker.strip() + suffix
                        tickers.append(clean_ticker)
                        weights.append(val)
                        total_value += val
            
            if not tickers or total_value == 0:
                return {"status": "Erro", "msg": "Carteira vazia ou sem valor."}

            weights = np.array([w / total_value for w in weights])
            
            # Baixa dados (otimizado)
            data = yf.download(tickers, period="1y", group_by='ticker', progress=False, auto_adjust=True)
            close_prices = pd.DataFrame()

            if len(tickers) == 1:
                t = tickers[0]
                if isinstance(data, pd.DataFrame) and 'Close' in data.columns: close_prices[t] = data['Close']
                else: close_prices[t] = data
            else:
                for t in tickers:
                    try:
                        if t in data.columns: close_prices[t] = data[t]['Close']
                        elif 'Close' in data.columns and t in data['Close'].columns: close_prices[t] = data['Close'][t]
                    except: pass

            close_prices = close_prices.dropna()
            if close_prices.empty:
                return {"status": "Erro", "msg": "Dados insuficientes do Yahoo Finance."}

            returns = close_prices.pct_change().dropna()
            mean_returns = returns.mean()
            cov_matrix = returns.cov()
            
            valid_tickers = close_prices.columns.tolist()
            valid_weights = []
            temp_total = 0
            ticker_map = dict(zip(tickers, weights))
            
            for t in valid_tickers:
                w = ticker_map.get(t, 0)
                valid_weights.append(w)
                temp_total += w
            
            if temp_total == 0: temp_total = 1
            valid_weights = np.array([w/temp_total for w in valid_weights])

            port_return = np.sum(mean_returns * valid_weights) * days
            port_volatility = np.sqrt(np.dot(valid_weights.T, np.dot(cov_matrix, valid_weights))) * np.sqrt(days)

            simulation_data = {}
            last_price = total_value
            daily_vol = port_volatility / np.sqrt(days)
            daily_ret = port_return / days
            
            for x in range(simulations):
                random_shocks = np.random.normal(daily_ret, daily_vol, days)
                price_path = last_price * (1 + random_shocks).cumprod()
                simulation_data[x] = price_path

            simulation_df = pd.DataFrame(simulation_data)
            pior = simulation_df.quantile(0.05, axis=1).tolist()
            medio = simulation_df.mean(axis=1).tolist()
            melhor = simulation_df.quantile(0.95, axis=1).tolist()
            
            if np.isnan(pior).any() or np.isnan(medio).any():
                return {"status": "Erro", "msg": "Erro matemático na simulação."}

            results = { "pior_caso": pior, "medio": medio, "melhor_caso": melhor }
            
            return {
                "status": "Sucesso", 
                "volatilidade_anual": f"{port_volatility*100:.2f}%",
                "projecao": results
            }

        except Exception as e:
            return {"status": "Erro", "msg": str(e)}
        finally:
            Session.remove()
    
    def update_category_meta(self, category_name, new_meta):
        session = Session()
        try:
            cat = session.query(Category).filter_by(name=category_name).first()
            if not cat: return {"status": "Erro", "msg": "Categoria não encontrada"}
            cat.target_percent = float(new_meta)
            session.commit()
            return {"status": "Sucesso", "msg": "Meta atualizada!"}
        except Exception as e:
            session.rollback()
            return {"status": "Erro", "msg": str(e)}
        finally:
            Session.remove()

    def validate_ticker_on_yahoo(self, ticker):
        try:
            import yfinance as yf
            ticker = ticker.upper().strip() # Garante maiúsculo e sem espaços
            
            # 1. Tenta o ticker puro (ex: AAPL, BTC-USD)
            stock = yf.Ticker(ticker)
            hist = stock.history(period="1d")
            if not hist.empty: 
                return {"valid": True, "ticker": ticker}
            
            # 2. Se falhou, tenta adicionar .SA (Padrão B3)
            if not ticker.endswith('.SA'):
                ticker_sa = f"{ticker}.SA"
                stock_sa = yf.Ticker(ticker_sa)
                hist_sa = stock_sa.history(period="1d")
                
                # 👇 O PULO DO GATO: Achou com .SA, mas retorna o ticker LIMPO (sem .SA)
                if not hist_sa.empty: 
                    return {"valid": True, "ticker": ticker} 
            
            return {"valid": False, "ticker": None}
            
        except Exception as e:
            print(f"Erro ao validar ticker: {e}")
            return {"valid": False, "ticker": None}

    def update_fundamentals(self):
        print("📊 JOB: Calculando Fundamentos...")
        session = Session()
        count = 0
        try:
            assets = session.query(Asset).join(Category).filter(
                Category.name.in_(['Ação', 'FII', 'Internacional', 'ETF', 'BDR'])
            ).all()
            tz = pytz.timezone("America/Sao_Paulo")
            cutoff_date = datetime.now(tz) - timedelta(days=365)
            dolar_rate = self.get_usd_rate()

            for asset in assets:
                try:
                    is_intl = not asset.ticker.endswith('.SA') and asset.category.name == 'Internacional'
                    suffix = ".SA" if not asset.ticker.endswith('.SA') and not is_intl else ""
                    ticker_symbol = f"{asset.ticker}{suffix}"
                    y_asset = yf.Ticker(ticker_symbol)
                    
                    current_price = 0
                    if hasattr(y_asset, 'fast_info') and y_asset.fast_info.last_price:
                         current_price = y_asset.fast_info.last_price
                    else:
                         hist = y_asset.history(period="1d")
                         if not hist.empty: current_price = hist['Close'].iloc[-1]

                    if current_price <= 0: continue

                    divs = y_asset.dividends
                    total_divs_val = 0.0
                    if not divs.empty:
                        if divs.index.tz is None: divs.index = divs.index.tz_localize(tz)
                        else: divs.index = divs.index.tz_convert(tz)
                        divs_last_12m = divs[divs.index >= cutoff_date]
                        total_divs_val = divs_last_12m.sum()

                    dy_calculated = total_divs_val / current_price if current_price > 0 else 0
                    info = y_asset.info
                    lpa = info.get('trailingEps') or info.get('forwardEps') or 0
                    vpa = info.get('bookValue') or 0

                    if is_intl:
                        lpa *= dolar_rate
                        vpa *= dolar_rate

                    pos = session.query(Position).filter_by(asset_id=asset.id).first()
                    if pos:
                        if lpa != 0: pos.manual_lpa = round(lpa, 2)
                        if vpa != 0: pos.manual_vpa = round(vpa, 2)
                        if dy_calculated > 0: pos.manual_dy = round(dy_calculated, 4)
                        count += 1
                except Exception as e:
                    print(f"   ⚠️ Falha em {asset.ticker}: {e}")
                    continue
            
            session.commit()
            return {"status": "Sucesso", "msg": f"{count} ativos atualizados."}
        except Exception as e:
            session.rollback()
            return {"status": "Erro", "msg": str(e)}
        finally:
            Session.remove()
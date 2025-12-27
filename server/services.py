# server/services.py
import sys
import os
import shutil
import yfinance as yf
import math
import pandas as pd
import time
import numpy as np
from datetime import datetime, date
from sqlalchemy.orm import scoped_session, sessionmaker

# Ajuste para importar da pasta vizinha
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from database.models import Asset, Position, Category, MarketData, PortfolioSnapshot, engine

# Usando scoped_session para melhor gerenciamento de threads
session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)

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
            # Tenta pegar o preço mais atual possível
            data = ticker.history(period="1d")
            if not data.empty:
                return float(data['Close'].iloc[-1])
        except Exception as e:
            print(f"⚠️ Erro ao buscar Dólar: {e}")
        return 5.80 # Fallback seguro

    def update_prices(self):
        print("🔄 JOB: Atualizando Preços (Modo BATCH - Otimizado)...")
        
        session = Session()
        try:
            assets = session.query(Asset).filter(Asset.ticker != 'Nubank Caixinha').all()
            
            # 1. Preparar lista de tickers para download em lote
            tickers_map = {} # Mapa: "PETR4.SA" -> asset_id
            download_list = []

            for asset in assets:
                suffix = ".SA" if asset.category.name in ['Ação', 'FII', 'Renda Fixa', 'ETF'] and not asset.ticker.endswith('.SA') else ""
                symbol = f"{asset.ticker}{suffix}"
                tickers_map[symbol] = asset
                download_list.append(symbol)

            if not download_list:
                print("⚠️ Nenhum ativo para atualizar.")
                return

            # 2. Download em Lote (MUITO MAIS RÁPIDO)
            print(f"   ⬇️ Baixando dados para {len(download_list)} ativos...")
            try:
                # group_by='ticker' garante estrutura consistente mesmo com 1 ativo
                batch_data = yf.download(download_list, period="5d", group_by='ticker', threads=True)
            except Exception as e:
                print(f"❌ Erro crítico no download em lote: {e}")
                return

            count_ok = 0
            
            # 3. Processar resultados
            for symbol, asset in tickers_map.items():
                try:
                    # Tenta pegar os dados do DataFrame complexo do yfinance
                    # Se baixou só um ativo, a estrutura é diferente, o yf tenta simplificar
                    if len(download_list) == 1:
                        hist = batch_data
                    else:
                        hist = batch_data[symbol]
                    
                    # Limpa linhas vazias (NaN)
                    hist = hist.dropna(how='all')

                    if hist.empty:
                        print(f"   ⚠️ Sem dados recentes para {asset.ticker}")
                        continue

                    current_price = float(hist['Close'].iloc[-1])
                    min_6m = 0.0 
                    # Nota: Para min_6m preciso, precisaríamos baixar 6mo. 
                    # Para performance, mantemos 5d e pegamos a min do histórico curto ou
                    # confiamos no histórico salvo anteriormente se não quisermos baixar tudo agora.
                    # Aqui, vou pegar a mínima desses 5 dias para garantir que temos algo.
                    if len(hist) > 0:
                        min_6m = float(hist['Close'].min())

                    # --- Atualizar DB ---
                    mdata = session.query(MarketData).filter_by(asset_id=asset.id).first()
                    if not mdata:
                        mdata = MarketData(asset_id=asset.id)
                        session.add(mdata)
                    
                    mdata.price = current_price
                    mdata.date = datetime.now()
                    # Só atualiza a mínima se baixamos histórico suficiente ou se quisermos a min da semana
                    # Se quiser manter a logica antiga de 6m, teria que baixar period="6mo" no batch.
                    # Vou manter a atualização simples para não quebrar a lógica.
                    if mdata.min_6m is None or min_6m < mdata.min_6m:
                         mdata.min_6m = min_6m

                    # --- Fundamentos (Ainda precisa ser individual, mas fazemos sob demanda) ---
                    # Para não travar o job, vamos pular fundamentos pesados no loop rápido
                    # ou atualizar apenas se estiver zerado/velho.
                    # Deixei comentado para priorizar velocidade. 
                    # Se quiser ativar, descomente, mas vai lentificar.
                    """
                    if asset.category.name in ['Ação', 'FII']:
                         # Lógica de info individual aqui (lento)
                         pass 
                    """

                    print(f"   ✅ {asset.ticker}: R$ {current_price:.2f}")
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
                
                # --- SISTEMA DE ALERTAS ---
                if pos.target_percent and pct_na_categoria > pos.target_percent * 1.5:
                    alertas.append(f"REBALANCEAR:{pos.asset.ticker} ultrapassou a meta ideal ({pct_na_categoria:.1f}%)")
                if item["min_6m"] > 0 and item["preco_atual"] <= item["min_6m"] * 1.03:
                     alertas.append(f"QUEDA:{pos.asset.ticker} próximo da mínima")
                if "mg_graham" in item["metrics"] and item["metrics"]["mg_graham"] > 50:
                     alertas.append(f"GRAHAM:{pos.asset.ticker} está descontada")
                if cat_name == "FII" and "p_vp" in item["metrics"]:
                     pvp = item["metrics"]["p_vp"]
                     if pvp > 0 and pvp < 0.95: 
                         alertas.append(f"PVP:{pos.asset.ticker} está barato (P/VP {pvp:.2f})")
                mn = item["metrics"].get("magic_number", 0)
                if mn > 0 and pos.quantity < mn and (mn - pos.quantity) <= 5:
                     alertas.append(f"MAGIC:{pos.asset.ticker} quase atingindo o Número Mágico")

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
                    "manual_dy": pos.manual_dy,
                    "manual_lpa": pos.manual_lpa,
                    "manual_vpa": pos.manual_vpa,
                    "recomendacao": rec_text, "status": status, "score": score, "motivo": motivo,
                    **item["metrics"]
                })

            final_list.sort(key=lambda x: x["score"], reverse=True)
            grafico = [{"name": k, "value": v} for k, v in cat_totals.items() if v > 0]
            
            return { "status": "Sucesso", "dolar": dolar_rate, "resumo": resumo, "grafico": grafico, "alertas": alertas, "ativos": final_list }
        finally:
            Session.remove()

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
            if metrics.get("p_vp", 0) > 0 and metrics.get("p_vp", 1) < 0.95:
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
        except Exception as e: print(f"❌ Erro backup: {e}")

    def take_daily_snapshot(self):
        print("📸 JOB: Snapshot...")
        session = Session()
        try:
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
        
    def update_position(self, ticker, qtd, pm, meta, dy=0, lpa=0, vpa=0):
        print(f"📝 Atualizando {ticker}...")
        session = Session()
        try:
            asset = session.query(Asset).filter_by(ticker=ticker).first()
            if not asset: return {"status": "Erro", "msg": "Ativo não encontrado"}
            
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
            
            session.commit()
            return {"status": "Sucesso", "msg": "Dados atualizados!"}
        except Exception as e:
            session.rollback()
            return {"status": "Erro", "msg": str(e)}
        finally: Session.remove()
        
    def add_new_asset(self, ticker, category_name, qtd, pm):
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
            
            pos = Position(asset_id=new_asset.id, quantity=float(qtd), average_price=float(pm))
            session.add(pos)
            
            session.commit()
            return {"status": "Sucesso", "msg": "Ativo criado!"}
        except Exception as e:
            session.rollback()
            return {"status": "Erro", "msg": str(e)}
        finally: Session.remove()
        
    def delete_asset(self, ticker):
        print(f"🗑️ Excluindo Ativo: {ticker}")
        session = Session()
        try:
            asset = session.query(Asset).filter_by(ticker=ticker).first()
            if not asset: return {"status": "Erro", "msg": "Ativo não encontrado"}
            
            session.query(Position).filter_by(asset_id=asset.id).delete()
            session.query(MarketData).filter_by(asset_id=asset.id).delete()
            session.delete(asset)
            
            session.commit()
            return {"status": "Sucesso", "msg": f"{ticker} foi excluído."}
        except Exception as e:
            session.rollback()
            return {"status": "Erro", "msg": str(e)}
        finally: Session.remove()

    # Adicione imports no topo do arquivo services.py se não tiver:
    # import numpy as np

    def run_monte_carlo_simulation(self, days=252, simulations=1000):
        """
        Simula 1000 cenários possíveis. Versão DEBUG BLINDADA.
        """
        print("🎲 --- INICIANDO MONTE CARLO DEBUG ---")
        import numpy as np
        import pandas as pd
        import yfinance as yf
        import traceback # Para ver o erro real

        session = Session()
        try:
            # PASSO 1: ATIVOS
            print("📍 Passo 1: Carregando posições...")
            positions = session.query(Position).all()
            tickers = []
            weights = []
            total_value = 0.0
            
            for pos in positions:
                if pos.asset.category.name in ['Ação', 'FII', 'ETF', 'Internacional']:
                    # Prioridade: Preço Atual > Preço Médio
                    price = 0.0
                    if pos.asset.market_data and len(pos.asset.market_data) > 0:
                        # Garante que é float
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
            
            print(f"   Ativos encontrados: {len(tickers)} | Valor Total: {total_value}")

            if not tickers or total_value == 0:
                print("❌ Erro: Sem ativos ou valor total zero.")
                return {"status": "Erro", "msg": "Carteira vazia ou sem valor."}

            # Normalizar pesos
            weights = np.array([w / total_value for w in weights])

            # PASSO 2: DADOS HISTÓRICOS
            print("📍 Passo 2: Baixando dados do Yahoo Finance...")
            # auto_adjust=True resolve o warning do log
            data = yf.download(tickers, period="1y", group_by='ticker', progress=False, auto_adjust=True)
            
            close_prices = pd.DataFrame()

            # Lógica robusta para extrair apenas o 'Close'
            if len(tickers) == 1:
                t = tickers[0]
                # Se for 1 ativo, o yfinance retorna DataFrame direto ou Series
                if isinstance(data, pd.DataFrame) and 'Close' in data.columns:
                    close_prices[t] = data['Close']
                else:
                    close_prices[t] = data # Tenta pegar direto
            else:
                # Múltiplos ativos
                for t in tickers:
                    try:
                        if t in data.columns:
                            series = data[t]['Close']
                            close_prices[t] = series
                        elif 'Close' in data.columns and t in data['Close'].columns:
                            close_prices[t] = data['Close'][t]
                    except Exception as e:
                        print(f"⚠️ Aviso: Não consegui ler dados de {t}. Erro: {e}")

            # Limpeza de dados
            close_prices = close_prices.dropna()
            
            if close_prices.empty:
                print("❌ Erro: DataFrame de preços vazio após limpeza.")
                return {"status": "Erro", "msg": "Dados insuficientes do Yahoo Finance."}

            # PASSO 3: ESTATÍSTICAS
            print("📍 Passo 3: Calculando Matriz de Covariância...")
            returns = close_prices.pct_change().dropna()
            mean_returns = returns.mean()
            cov_matrix = returns.cov()
            
            # Precisamos alinhar os pesos com os ativos que REALMENTE baixaram dados
            valid_tickers = close_prices.columns.tolist()
            valid_weights = []
            
            # Recalcula pesos apenas para ativos válidos
            temp_total = 0
            ticker_map = dict(zip(tickers, weights)) # Mapa original
            
            for t in valid_tickers:
                w = ticker_map.get(t, 0)
                valid_weights.append(w)
                temp_total += w
            
            # Normaliza de novo para somar 1 (100%)
            if temp_total == 0: temp_total = 1
            valid_weights = np.array([w/temp_total for w in valid_weights])

            port_return = np.sum(mean_returns * valid_weights) * days
            port_volatility = np.sqrt(np.dot(valid_weights.T, np.dot(cov_matrix, valid_weights))) * np.sqrt(days)

            print(f"   Volatilidade Calculada: {port_volatility:.4f}")

            # PASSO 4: SIMULAÇÃO (OTIMIZADA)
            print("📍 Passo 4: Rodando loops da simulação...")
            simulation_data = {}
            last_price = total_value
            daily_vol = port_volatility / np.sqrt(days)
            daily_ret = port_return / days
            
            for x in range(simulations):
                random_shocks = np.random.normal(daily_ret, daily_vol, days)
                price_path = last_price * (1 + random_shocks).cumprod()
                simulation_data[x] = price_path

            simulation_df = pd.DataFrame(simulation_data)

            # PASSO 5: PREPARAÇÃO JSON
            print("📍 Passo 5: Formatando saída...")
            
            # .tolist() é CRUCIAL para o Flask conseguir ler (numpy array quebra o Flask)
            pior = simulation_df.quantile(0.05, axis=1).tolist()
            medio = simulation_df.mean(axis=1).tolist()
            melhor = simulation_df.quantile(0.95, axis=1).tolist()
            
            # Verifica se tem NaN ou Infinito (quebra o JSON)
            if np.isnan(pior).any() or np.isnan(medio).any():
                print("❌ Erro: Resultados contêm NaN (Not a Number)")
                return {"status": "Erro", "msg": "Erro matemático na simulação."}

            results = {
                "pior_caso": pior,
                "medio": medio,
                "melhor_caso": melhor
            }
            
            print("✅ SUCESSO: Simulação finalizada.")
            return {
                "status": "Sucesso", 
                "volatilidade_anual": f"{port_volatility*100:.2f}%",
                "projecao": results
            }

        except Exception as e:
            print("🔥 ERRO CRÍTICO (EXCEPTION):")
            traceback.print_exc() # Imprime o erro detalhado no terminal
            return {"status": "Erro", "msg": str(e)}
        finally:
            Session.remove()
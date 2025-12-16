from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
import math
import os
import pandas as pd
import time

# --- CACHE SIMPLES (Memória) ---
# Evita lentidão no Vercel e bloqueio do Yahoo
CACHE = {
    "timestamp": 0,
    "cotacoes": {},
    "dolar": 5.82,
    "timeout": 300  # 5 minutos
}

class handler(BaseHTTPRequestHandler):
    
    # --- FUNÇÕES AUXILIARES ---
    def get_market_data(self, tickers):
        # Se o cache ainda for válido (menos de 5 min), usa ele
        if (time.time() - CACHE["timestamp"]) < CACHE["timeout"] and CACHE["cotacoes"]:
            return CACHE["cotacoes"], CACHE["dolar"]

        print("Atualizando dados do Yahoo Finance...")
        cotacoes_novas = {}
        dolar_novo = CACHE["dolar"]

        try:
            # 1. Pega Dólar
            dolar_ticker = yf.Ticker("BRL=X") # USD to BRL
            hist_dolar = dolar_ticker.history(period="1d")
            if not hist_dolar.empty:
                dolar_novo = float(hist_dolar['Close'].iloc[-1])
            
            # 2. Pega Ativos (Histórico 1 ano para mínimas)
            if tickers:
                dados = yf.download(tickers, period="1y", group_by='ticker', progress=False)
                # Formata para dicionário fácil de ler
                for t in tickers:
                    try:
                        # Se baixou varios, é DataFrame multi-index. Se um, é simples.
                        serie = dados[t]['Close'] if len(tickers) > 1 else dados['Close']
                        cotacoes_novas[t] = {
                            "atual": float(serie.iloc[-1]),
                            "min_12m": float(serie.min()),
                            "min_6m": float(serie.tail(126).min()) # ~6 meses uteis
                        }
                    except:
                        pass
            
            # Atualiza Cache
            CACHE["timestamp"] = time.time()
            CACHE["cotacoes"] = cotacoes_novas
            CACHE["dolar"] = dolar_novo
            
        except Exception as e:
            print(f"Erro ao atualizar cache: {e}")
        
        return CACHE["cotacoes"], CACHE["dolar"]

    def calcular_valuation(self, item, preco):
        """Retorna Graham, Bazin e P/VP calculados"""
        lpa = item.get("lpa_manual", 0)
        vpa = item.get("vpa_manual", 0)
        dy_proj = item.get("dy_proj_12m", 0)

        metrics = {"vi_graham": 0, "mg_graham": 0, "teto_bazin": 0, "mg_bazin": 0, "p_vp": 0}

        # Graham (Ações)
        if item["tipo"] == "Ação" and lpa > 0 and vpa > 0:
            try:
                metrics["vi_graham"] = math.sqrt(22.5 * lpa * vpa)
                metrics["mg_graham"] = ((metrics["vi_graham"] - preco) / preco) * 100
            except: pass

        # Bazin (Teto 6%)
        if dy_proj > 0:
            metrics["teto_bazin"] = dy_proj / 0.06
            metrics["mg_bazin"] = ((metrics["teto_bazin"] - preco) / preco) * 100

        # P/VP (FIIs)
        if vpa > 0:
            metrics["p_vp"] = preco / vpa

        return metrics

    def gerar_recomendacao(self, item, metrics, falta_comprar, dados_preco):
        """O Grande Juiz: Define Score e Recomendação"""
        rec = "Neutro"
        cor = "gray"
        motivo = []
        score = 0 # 0 a 100

        # Fatores universais
        if falta_comprar > 0:
            score += 30
            motivo.append("Abaixo da Meta")
        else:
            score -= 20
            motivo.append("Meta Atingida")

        preco = item["preco_atual"]
        min_6m = dados_preco.get("min_6m", 0)

        # Regras Específicas
        if item["tipo"] == "Ação":
            # Valuation
            if metrics["mg_graham"] > 20: 
                score += 30
                motivo.append(f"Graham Barato (+{metrics['mg_graham']:.0f}%)")
            if metrics["mg_bazin"] > 10: 
                score += 20
                motivo.append("Bazin Atrativo")
            
            # Técnica (Perto da mínima)
            if min_6m > 0 and preco <= min_6m * 1.05:
                score += 20
                motivo.append("No Fundo (6m)")

        elif item["tipo"] == "FII":
            if metrics["p_vp"] > 0 and metrics["p_vp"] < 1.0:
                score += 30
                motivo.append("Desconto Patrimonial")
            elif metrics["p_vp"] > 1.10:
                score -= 30
                motivo.append("Ágio Alto")
            
            if min_6m > 0 and preco <= min_6m * 1.02:
                score += 20
                motivo.append("Preço Mínimo")

        # Decisão Final baseada no Score e Balanceamento
        if falta_comprar > 0:
            if score >= 60:
                rec = "COMPRA FORTE"
                cor = "green"
            elif score >= 30:
                rec = "COMPRAR"
                cor = "blue"
            else:
                rec = "AGUARDAR" # Precisa comprar, mas tá caro ou ruim
                cor = "yellow"
        else:
            if score >= 80: # Oportunidade imperdível mesmo sem precisar
                rec = "OPORTUNIDADE"
                cor = "green"
            else:
                rec = "MANTER"
                cor = "gray"

        return rec, cor, score, ", ".join(motivo)

    # --- HANDLERS PRINCIPAIS ---

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        try:
            arquivo = 'carteira.json'
            if not os.path.exists(arquivo):
                with open(arquivo, 'w') as f: json.dump([], f)
            with open(arquivo, 'r', encoding='utf-8') as f:
                carteira = json.load(f)

            # 1. Obter Dados de Mercado (Com Cache)
            tickers_yahoo = [
                (i["ticker"] + ".SA") if i["tipo"] in ["Ação", "FII"] else i["ticker"]
                for i in carteira if i["tipo"] not in ["Renda Fixa", "Reserva"]
            ]
            
            dados_mercado, dolar_atual = self.get_market_data(tickers_yahoo)

            resumo = {"Total": 0}
            ativos_proc = []
            
            # 2. Processamento e Cálculos
            for item_orig in carteira:
                # IMPORTANTE: Copiar para não mutar o cache ou json original na memória
                item = item_orig.copy()
                
                tipo = item["tipo"]
                ticker = item["ticker"]
                ticker_full = ticker + ".SA" if tipo in ["Ação", "FII"] else ticker
                
                # Preço e Mínimas
                dados_preco = dados_mercado.get(ticker_full, {})
                preco = dados_preco.get("atual", item.get("valor_fixo", item["pm"]))
                
                # Conversão Moeda
                fator = dolar_atual if item.get("moeda") == "USD" else 1
                preco_brl = preco * fator
                
                # Totais
                total_atual = item["qtd"] * preco_brl
                resumo["Total"] += total_atual
                resumo[tipo] = resumo.get(tipo, 0) + total_atual

                # Atualiza item processado
                item["preco_atual"] = preco
                item["total_atual_brl"] = total_atual
                item["min_6m"] = dados_preco.get("min_6m", 0)
                item["min_12m"] = dados_preco.get("min_12m", 0)

                ativos_proc.append(item)

            # 3. Análise Final (Precisa do Resumo Total pronto)
            estrategia = []
            alerta_concentracao = []

            for item in ativos_proc:
                # Balanceamento
                meta_valor = resumo["Total"] * (item.get("meta", 0) / 100)
                falta_comprar = meta_valor - item["total_atual_brl"]
                pct_atual = (item["total_atual_brl"] / resumo["Total"]) * 100 if resumo["Total"] > 0 else 0

                # Alerta de Risco
                if pct_atual > item.get("meta", 0) * 1.5:
                    alerta_concentracao.append(f"{item['ticker']} está com {pct_atual:.1f}% (Meta: {item['meta']}%)")

                # Valuation
                metrics = self.calcular_valuation(item, item["preco_atual"])

                # Recomendação
                rec, cor, score, motivo = self.gerar_recomendacao(item, metrics, falta_comprar, item)

                estrategia.append({
                    **item,
                    **metrics,
                    "pct_atual": pct_atual,
                    "falta_comprar": falta_comprar,
                    "recomendacao": rec,
                    "cor_rec": cor,
                    "score": score,
                    "motivo": motivo
                })

            # Ordena por Score (Melhores oportunidades primeiro)
            estrategia.sort(key=lambda x: x["score"], reverse=True)

            response = {
                "status": "Sucesso",
                "dolar": dolar_atual,
                "resumo": resumo,
                "alertas": alerta_concentracao,
                "ativos": estrategia
            }

            self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            import traceback
            traceback.print_exc()
            self.wfile.write(json.dumps({"status": "Erro", "detalhe": str(e)}).encode('utf-8'))

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            
            with open('carteira.json', 'r') as f: data = json.load(f)
            
            encontrou = False
            for item in data:
                if item["ticker"] == body["ticker"]:
                    # Atualiza campos manuais e estruturais
                    item.update({
                        "lpa_manual": float(body.get("lpa", item.get("lpa_manual", 0))),
                        "vpa_manual": float(body.get("vpa", item.get("vpa_manual", 0))),
                        "dy_proj_12m": float(body.get("dy", item.get("dy_proj_12m", 0))),
                        "meta": float(body.get("meta", item.get("meta", 0))),
                        "qtd": float(body.get("qtd", item.get("qtd", 0))),
                        "pm": float(body.get("pm", item.get("pm", 0))),
                        "valor_fixo": float(body.get("valor_fixo", item.get("valor_fixo", 0)))
                    })
                    encontrou = True
            
            if not encontrou: # Se for ativo novo (futuro)
                pass 

            with open('carteira.json', 'w') as f: json.dump(data, f, indent=2)
            self.wfile.write(json.dumps({"status": "Salvo"}).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"erro": str(e)}).encode('utf-8'))
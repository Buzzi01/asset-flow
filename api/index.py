from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
import math
import os
import pandas as pd
import time
import traceback

# Configurações Globais
CACHE = {
    "timestamp": 0,
    "cotacoes": {},
    "dolar": 5.82,
    "timeout": 300 # 5 minutos
}

class handler(BaseHTTPRequestHandler):

    # ==============================================================================
    # 1. CAMADA DE DADOS (IO)
    # ==============================================================================
    def _load_database(self):
        """Carrega ou cria o arquivo JSON local."""
        arquivo = 'carteira.json'
        if not os.path.exists(arquivo):
            with open(arquivo, 'w') as f: json.dump([], f)
        
        with open(arquivo, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _save_database(self, data):
        """Salva os dados no JSON."""
        with open('carteira.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

    def _fetch_market_data(self, tickers):
        """Gerencia cache e busca dados no Yahoo Finance."""
        # Verifica Cache
        if (time.time() - CACHE["timestamp"]) < CACHE["timeout"] and CACHE["cotacoes"]:
            return CACHE["cotacoes"], CACHE["dolar"]

        print("🔄 Atualizando Cache Yahoo Finance...")
        cotacoes_novas = {}
        dolar_novo = CACHE["dolar"]

        try:
            # Dólar
            hist_dolar = yf.Ticker("BRL=X").history(period="1d")
            if not hist_dolar.empty:
                dolar_novo = float(hist_dolar['Close'].iloc[-1])
            
            # Ativos (Histórico 1 ano)
            if tickers:
                dados = yf.download(tickers, period="1y", group_by='ticker', progress=False)
                for t in tickers:
                    try:
                        # Lida com DataFrame multi-index ou simples
                        serie = dados[t]['Close'] if len(tickers) > 1 else dados['Close']
                        cotacoes_novas[t] = {
                            "atual": float(serie.iloc[-1]),
                            "min_12m": float(serie.min()),
                            "min_6m": float(serie.tail(126).min()) # ~6 meses úteis
                        }
                    except: pass
            
            # Atualiza Global
            CACHE["timestamp"] = time.time()
            CACHE["cotacoes"] = cotacoes_novas
            CACHE["dolar"] = dolar_novo
            
        except Exception as e:
            print(f"⚠️ Erro no Cache: {e}")
        
        return CACHE["cotacoes"], CACHE["dolar"]

    # ==============================================================================
    # 2. CAMADA DE CÁLCULO (Matemática Pura)
    # ==============================================================================
    def _calculate_metrics(self, item, preco_atual):
        """Calcula Graham, Bazin, P/VP e DoC."""
        metrics = {
            "vi_graham": 0, "mg_graham": 0, 
            "teto_bazin": 0, "mg_bazin": 0, 
            "p_vp": 0, "doc_yield": 0, "dy_atual": 0
        }
        
        lpa = item.get("lpa_manual", 0)
        vpa = item.get("vpa_manual", 0)
        dy_proj_reais = item.get("dy_proj_12m", 0)
        pm = item.get("pm", 0)

        # Graham (Raiz de 22.5 * LPA * VPA)
        if item["tipo"] == "Ação" and lpa > 0 and vpa > 0:
            try:
                metrics["vi_graham"] = math.sqrt(22.5 * lpa * vpa)
                metrics["mg_graham"] = ((metrics["vi_graham"] - preco_atual) / preco_atual) * 100
            except: pass

        # Bazin (Teto 6% ou 7%)
        if dy_proj_reais > 0:
            metrics["teto_bazin"] = dy_proj_reais / 0.06
            if preco_atual > 0:
                metrics["mg_bazin"] = ((metrics["teto_bazin"] - preco_atual) / preco_atual) * 100
            metrics["dy_atual"] = (dy_proj_reais / preco_atual) * 100 if preco_atual > 0 else 0
            metrics["doc_yield"] = (dy_proj_reais / pm) * 100 if pm > 0 else 0

        # P/VP
        if vpa > 0 and preco_atual > 0:
            metrics["p_vp"] = preco_atual / vpa

        return metrics

    # ==============================================================================
    # 3. CAMADA DE ESTRATÉGIA (O Juiz)
    # ==============================================================================
    def _apply_strategy(self, item, metrics, falta_comprar, dados_preco):
        """Define Score (0-100), Recomendação e Cor."""
        rec = "Neutro"
        cor = "gray"
        motivo = []
        score = 0 
        
        preco = item["preco_atual"]
        min_6m = dados_preco.get("min_6m", 0)

        # Fatores de Balanceamento
        if falta_comprar > 0:
            score += 30
            motivo.append("Abaixo da Meta")
        else:
            score -= 20
            motivo.append("Meta Atingida")

        # Regras por Tipo
        if item["tipo"] == "Ação":
            if metrics["mg_graham"] > 20: 
                score += 30
                motivo.append(f"Graham Barato (+{metrics['mg_graham']:.0f}%)")
            if metrics["mg_bazin"] > 10: 
                score += 20
                motivo.append("Bazin Atrativo")
            if min_6m > 0 and preco <= min_6m * 1.05:
                score += 20
                motivo.append("Próximo da Mínima")

        elif item["tipo"] == "FII":
            if metrics["p_vp"] > 0 and metrics["p_vp"] < 1.0:
                score += 30
                motivo.append("Desconto Patrimonial")
            elif metrics["p_vp"] > 1.10:
                score -= 30
                motivo.append("Ágio Alto")
            
            if metrics["doc_yield"] > 10: # Yield on Cost alto é bom
                score += 10
                motivo.append(f"Yield on Cost: {metrics['doc_yield']:.1f}%")

        # Decisão Final
        if falta_comprar > 0:
            if score >= 60:
                rec = "COMPRA FORTE"; cor = "green"
            elif score >= 30:
                rec = "COMPRAR"; cor = "blue"
            else:
                rec = "AGUARDAR"; cor = "yellow"
        else:
            if score >= 80:
                rec = "OPORTUNIDADE"; cor = "green"
            else:
                rec = "MANTER"; cor = "gray"

        return rec, cor, score, ", ".join(motivo)

    # ==============================================================================
    # HANDLERS HTTP
    # ==============================================================================
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        try:
            # 1. Load
            carteira = self._load_database()
            
            # 2. Market Data
            tickers_yahoo = [
                (i["ticker"] + ".SA") if i["tipo"] in ["Ação", "FII"] else i["ticker"]
                for i in carteira if i["tipo"] not in ["Renda Fixa", "Reserva"]
            ]
            market_data, dolar_atual = self._fetch_market_data(tickers_yahoo)

            # 3. Processamento
            resumo = {"Total": 0}
            ativos_processados = []

            # Passo A: Totais primeiro (preciso do total pra calcular %)
            temp_list = []
            for item_orig in carteira:
                item = item_orig.copy()
                
                # Definição de Preço
                ticker_full = (item["ticker"] + ".SA") if item["tipo"] in ["Ação", "FII"] else item["ticker"]
                dados_preco = market_data.get(ticker_full, {})
                preco = dados_preco.get("atual", item.get("valor_fixo", item["pm"]))
                
                # Conversão
                fator = dolar_atual if item.get("moeda") == "USD" else 1
                preco_brl = preco * fator
                total_atual = item["qtd"] * preco_brl
                
                # Acumula
                resumo["Total"] += total_atual
                resumo[item["tipo"]] = resumo.get(item["tipo"], 0) + total_atual
                
                # Enriquece item
                item["preco_atual"] = preco
                item["total_atual_brl"] = total_atual
                item["min_6m"] = dados_preco.get("min_6m", 0)
                item["min_12m"] = dados_preco.get("min_12m", 0)
                temp_list.append(item)

            # Passo B: Análise e Estratégia
            alertas = []
            for item in temp_list:
                # Metas
                meta_valor = resumo["Total"] * (item.get("meta", 0) / 100)
                falta_comprar = meta_valor - item["total_atual_brl"]
                pct_atual = (item["total_atual_brl"] / resumo["Total"]) * 100 if resumo["Total"] > 0 else 0
                
                if pct_atual > item.get("meta", 0) * 1.5:
                    alertas.append(f"{item['ticker']} - Concentração Alta ({pct_atual:.1f}%)")

                # Métricas e Decisão
                metrics = self._calculate_metrics(item, item["preco_atual"])
                rec, cor, score, motivo = self._apply_strategy(item, metrics, falta_comprar, item)

                ativos_processados.append({
                    **item, **metrics,
                    "pct_atual": pct_atual,
                    "falta_comprar": falta_comprar,
                    "recomendacao": rec, "cor_rec": cor, "score": score, "motivo": motivo
                })

            ativos_processados.sort(key=lambda x: x["score"], reverse=True)

            response = {
                "status": "Sucesso",
                "dolar": dolar_atual,
                "resumo": resumo,
                "alertas": alertas,
                "ativos": ativos_processados
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            traceback.print_exc()
            self.wfile.write(json.dumps({"status": "Erro", "detalhe": str(e)}).encode('utf-8'))

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            data = self._load_database()
            
            for item in data:
                if item["ticker"] == body["ticker"]:
                    # Atualização segura
                    campos_permitidos = ["lpa_manual", "vpa_manual", "dy_proj_12m", "meta", "qtd", "pm", "valor_fixo"]
                    for campo in campos_permitidos:
                        if campo == "dy_proj_12m" and "dy" in body: # adaptação frontend
                             item[campo] = float(body["dy"])
                        elif campo in body:
                             item[campo] = float(body[campo])
            
            self._save_database(data)
            self.wfile.write(json.dumps({"status": "Salvo"}).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"erro": str(e)}).encode('utf-8'))
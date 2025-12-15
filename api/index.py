from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
import pandas as pd

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        # --- 1. SEUS DADOS (Baseado nas suas imagens) ---
        # No futuro, isso virá de um banco de dados real.
        carteira = [
            {"ticker": "BBDC4", "qtd": 60, "pm": 14.69, "tipo": "Ação"},
            {"ticker": "ITUB3", "qtd": 38, "pm": 23.35, "tipo": "Ação"},
            {"ticker": "AURE3", "qtd": 90, "pm": 12.00, "tipo": "Ação"},
            {"ticker": "CPLE5", "qtd": 60, "pm": 7.66, "tipo": "Ação"},
            {"ticker": "MXRF11", "qtd": 181, "pm": 10.04, "tipo": "FII"},
            {"ticker": "HGLG11", "qtd": 10, "pm": 161.74, "tipo": "FII"},
            {"ticker": "VT", "qtd": 3.73, "pm": 96.88, "tipo": "ETF-INTL"}, # Exemplo Internacional
            {"ticker": "BTC-USD", "qtd": 0.005, "pm": 60000, "tipo": "Cripto"} # Exemplo Cripto
        ]

        try:
            # --- 2. PREPARAÇÃO DOS TICKERS ---
            # Adiciona .SA para ações BR, converte Cripto e deixa USD puro
            lista_tickers = []
            for item in carteira:
                if item["tipo"] == "ETF-INTL" or item["tipo"] == "Cripto":
                     lista_tickers.append(item["ticker"])
                else:
                     lista_tickers.append(item["ticker"] + ".SA")

            # --- 3. BUSCAR PREÇOS ONLINE (Yahoo Finance) ---
            dados_yahoo = yf.download(lista_tickers, period="1d", progress=False)['Close']
            cotacoes = dados_yahoo.iloc[-1] # Pega o último preço disponível

            # --- 4. CÁLCULOS MATEMÁTICOS (A Mágica da Planilha) ---
            carteira_calculada = []
            total_patrimonio = 0

            # Taxa dólar fixa pra teste (depois podemos pegar autmático)
            dolar = 5.80 

            for item in carteira:
                # Resolve o nome do ticker pra buscar na lista de cotações
                if item["tipo"] == "ETF-INTL" or item["tipo"] == "Cripto":
                    ticker_busca = item["ticker"]
                    fator_moeda = dolar if item["tipo"] == "ETF-INTL" or "USD" in item["ticker"] else 1
                else:
                    ticker_busca = item["ticker"] + ".SA"
                    fator_moeda = 1

                # Preço Atual
                preco_atual = float(cotacoes[ticker_busca])
                
                # Conversão para Reais se for internacional
                preco_atual_brl = preco_atual * fator_moeda
                pm_atual_brl = item["pm"] * fator_moeda

                # Cálculos Fundamentais
                total_investido = item["qtd"] * pm_atual_brl
                total_atual = item["qtd"] * preco_atual_brl
                lucro_reais = total_atual - total_investido
                lucro_percentual = ((total_atual / total_investido) - 1) * 100

                total_patrimonio += total_atual

                carteira_calculada.append({
                    "ticker": item["ticker"],
                    "tipo": item["tipo"],
                    "qtd": item["qtd"],
                    "pm": item["pm"],
                    "preco_atual": preco_atual,
                    "total_atual": total_atual,
                    "lucro_reais": lucro_reais,
                    "lucro_perc": lucro_percentual
                })

            # --- 5. CALCULAR % DA CARTEIRA (BALANCEAMENTO) ---
            for item in carteira_calculada:
                item["percentual_carteira"] = (item["total_atual"] / total_patrimonio) * 100

            # Ordenar do que tem mais valor para o que tem menos
            carteira_calculada.sort(key=lambda x: x["total_atual"], reverse=True)

            response = {
                "status": "Sucesso",
                "total_patrimonio": total_patrimonio,
                "ativos": carteira_calculada
            }

        except Exception as e:
            response = {
                "status": "Erro",
                "detalhe": str(e)
            }

        self.wfile.write(json.dumps(response).encode('utf-8'))
        return
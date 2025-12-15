from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
import math

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        # --- SEUS DADOS (Baseado na sua planilha) ---
        # Adicionei LPA e VPA manualmente para permitir o cálculo de Graham
        carteira = [
            # AÇÕES (Graham funciona bem aqui)
            {"ticker": "BBDC4", "qtd": 60, "pm": 14.69, "tipo": "Ação", "lpa": 2.01, "vpa": 16.58},
            {"ticker": "ITUB3", "qtd": 38, "pm": 23.35, "tipo": "Ação", "lpa": 4.06, "vpa": 19.93},
            {"ticker": "AURE3", "qtd": 90, "pm": 12.00, "tipo": "Ação", "lpa": 0.67, "vpa": 12.08},
            {"ticker": "CPLE5", "qtd": 60, "pm": 7.66, "tipo": "Ação", "lpa": 1.02, "vpa": 8.58},
            
            # FIIs (Focamos em P/VP e Dividendos)
            {"ticker": "MXRF11", "qtd": 181, "pm": 10.04, "tipo": "FII", "dy": 12.15, "pvp": 1.01},
            {"ticker": "HGLG11", "qtd": 10, "pm": 161.74, "tipo": "FII", "dy": 8.27, "pvp": 0.96},
            
            # INTERNACIONAL
            {"ticker": "VT", "qtd": 3.73, "pm": 96.88, "tipo": "Internacional", "moeda": "USD"},
            
            # RENDA FIXA (Simulada, pois não tem ticker no Yahoo)
            {"ticker": "Tesouro IPCA+", "qtd": 1, "pm": 1000, "tipo": "Renda Fixa", "valor_fixo": 1250.00}
        ]

        try:
            # Filtra o que precisa de cotação online
            tickers_yahoo = []
            for item in carteira:
                if item["tipo"] != "Renda Fixa":
                    sufixo = ".SA" if item["tipo"] in ["Ação", "FII"] else ""
                    tickers_yahoo.append(item["ticker"] + sufixo)

            # Baixa cotações
            dados_yahoo = yf.download(tickers_yahoo, period="1d", progress=False)['Close']
            cotacoes = dados_yahoo.iloc[-1]

            carteira_processada = []
            resumo = {"Total": 0, "Ação": 0, "FII": 0, "Internacional": 0, "Renda Fixa": 0}
            dolar = 5.82 # Pode ser automatizado depois

            for item in carteira:
                # 1. Definir Preço Atual
                if item["tipo"] == "Renda Fixa":
                    preco_atual = item["valor_fixo"]
                    ticker_busca = item["ticker"]
                else:
                    sufixo = ".SA" if item["tipo"] in ["Ação", "FII"] else ""
                    ticker_busca = item["ticker"] + sufixo
                    preco_atual = float(cotacoes[ticker_busca])

                # 2. Conversão de Moeda
                fator_moeda = dolar if item.get("moeda") == "USD" else 1
                preco_atual_brl = preco_atual * fator_moeda
                
                # 3. Cálculos Básicos
                total_investido = item["qtd"] * (item["pm"] * fator_moeda)
                total_atual = item["qtd"] * preco_atual_brl
                lucro = total_atual - total_investido
                lucro_perc = ((total_atual / total_investido) - 1) * 100

                # 4. CÁLCULO DE GRAHAM (Preço Justo) = Raiz(22.5 * LPA * VPA)
                preco_justo = 0
                margem_seguranca = 0
                
                if item["tipo"] == "Ação" and item.get("lpa") and item.get("vpa"):
                    try:
                        # Graham Number
                        projecao = 22.5 * item["lpa"] * item["vpa"]
                        if projecao > 0:
                            preco_justo = math.sqrt(projecao)
                            margem_seguranca = ((preco_justo - preco_atual) / preco_atual) * 100
                    except:
                        preco_justo = 0

                # Adiciona aos totais
                resumo["Total"] += total_atual
                if item["tipo"] in resumo:
                    resumo[item["tipo"]] += total_atual

                carteira_processada.append({
                    **item,
                    "preco_atual": preco_atual,
                    "total_atual": total_atual,
                    "lucro_reais": lucro,
                    "lucro_perc": lucro_perc,
                    "preco_justo_graham": preco_justo,
                    "margem_seguranca": margem_seguranca
                })

            response = {
                "status": "Sucesso",
                "resumo": resumo,
                "ativos": carteira_processada
            }

        except Exception as e:
            response = {"status": "Erro", "detalhe": str(e)}

        self.wfile.write(json.dumps(response).encode('utf-8'))
        return
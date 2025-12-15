from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
import math
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        try:
            # 1. LER O ARQUIVO JSON (Sua Carteira)
            with open('carteira.json', 'r', encoding='utf-8') as f:
                carteira = json.load(f)

            # 2. PREPARAR TICKERS
            tickers_yahoo = []
            for item in carteira:
                if item["tipo"] != "Renda Fixa":
                    sufixo = ".SA" if item["tipo"] in ["Ação", "FII"] else ""
                    tickers_yahoo.append(item["ticker"] + sufixo)

            # 3. BAIXAR PREÇOS E INFO
            # period='1d' é rápido para preços
            dados_yahoo = yf.download(tickers_yahoo, period="1d", progress=False)['Close']
            cotacoes = dados_yahoo.iloc[-1]

            resumo = {"Total": 0, "Ação": 0, "FII": 0, "Internacional": 0, "Renda Fixa": 0}
            ativos_processados = []
            dolar = 5.82 

            # --- PROCESSAMENTO DOS ATIVOS ---
            for item in carteira:
                # Definição de Ticker e Preço
                if item["tipo"] == "Renda Fixa":
                    preco_atual = item.get("valor_fixo", item["pm"])
                    ticker_busca = item["ticker"]
                else:
                    sufixo = ".SA" if item["tipo"] in ["Ação", "FII"] else ""
                    ticker_busca = item["ticker"] + sufixo
                    preco_atual = float(cotacoes[ticker_busca])

                # Conversão Moeda
                fator_moeda = dolar if item.get("moeda") == "USD" else 1
                preco_atual_brl = preco_atual * fator_moeda
                pm_brl = item["pm"] * fator_moeda

                # Valores Totais
                total_atual = item["qtd"] * preco_atual_brl
                total_investido = item["qtd"] * pm_brl
                lucro_reais = total_atual - total_investido
                lucro_perc = ((total_atual / total_investido) - 1) * 100 if total_investido > 0 else 0

                # Somar ao Patrimônio
                resumo["Total"] += total_atual
                if item["tipo"] in resumo:
                    resumo[item["tipo"]] += total_atual

                # --- BUSCA AUTOMÁTICA DE INDICADORES (LPA/VPA/DY) ---
                lpa = 0
                vpa = 0
                dy = 0
                pvp = 0
                
                # Só busca indicadores para Ações e FIIs
                if item["tipo"] in ["Ação", "FII"]:
                    try:
                        # Tenta pegar infos do Ticker
                        stock = yf.Ticker(ticker_busca)
                        info = stock.info
                        
                        # Ações
                        lpa = info.get('trailingEps', 0)
                        vpa = info.get('bookValue', 0)
                        
                        # FIIs (Estimativa)
                        if item["tipo"] == "FII" and vpa > 0:
                            pvp = preco_atual / vpa
                    except:
                        pass # Se falhar, segue zerado

                # --- CÁLCULO DE GRAHAM (Ações) ---
                preco_justo = 0
                margem_seguranca = 0
                if item["tipo"] == "Ação" and lpa > 0 and vpa > 0:
                    try:
                        projecao = 22.5 * lpa * vpa
                        if projecao > 0:
                            preco_justo = math.sqrt(projecao)
                            margem_seguranca = ((preco_justo - preco_atual) / preco_atual) * 100
                    except:
                        pass

                ativos_processados.append({
                    **item,
                    "preco_atual": preco_atual,
                    "total_atual": total_atual,
                    "lucro_reais": lucro_reais,
                    "lucro_perc": lucro_perc,
                    "preco_justo": preco_justo,
                    "margem_seguranca": margem_seguranca,
                    "pvp": pvp,
                    "lpa": lpa,
                    "vpa": vpa
                })

            # --- ESTRATÉGIA DE BALANCEAMENTO ---
            # Calcula quanto falta comprar para atingir a meta
            estrategia = []
            for ativo in ativos_processados:
                meta_financeira = resumo["Total"] * (ativo["meta"] / 100)
                diferenca = meta_financeira - ativo["total_atual"]
                
                status = "Aguardar"
                if diferenca > 0:
                    status = "Comprar"
                elif diferenca < -100: # Tolerância
                    status = "Vender/Segurar"

                ativo["status_balanceamento"] = status
                ativo["falta_comprar"] = diferenca
                ativo["porcentagem_atual"] = (ativo["total_atual"] / resumo["Total"]) * 100
                estrategia.append(ativo)

            # Ordena: Primeiro os que precisa comprar mais (maior diferença positiva)
            estrategia.sort(key=lambda x: x["falta_comprar"], reverse=True)

            response = {
                "status": "Sucesso",
                "resumo": resumo,
                "ativos": estrategia
            }

        except Exception as e:
            response = {"status": "Erro", "detalhe": str(e)}

        self.wfile.write(json.dumps(response).encode('utf-8'))
        return
from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
import math
import os

class handler(BaseHTTPRequestHandler):
    
    # --- LEITURA DE DADOS (GET) ---
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        try:
            # Tenta ler o arquivo local
            caminho_arquivo = 'carteira.json'
            if not os.path.exists(caminho_arquivo):
                # Cria arquivo vazio se não existir
                with open(caminho_arquivo, 'w') as f: json.dump([], f)
            
            with open(caminho_arquivo, 'r', encoding='utf-8') as f:
                carteira = json.load(f)

            # Prepara tickers para Yahoo
            tickers_yahoo = []
            for item in carteira:
                if item["tipo"] != "Renda Fixa":
                    sufixo = ".SA" if item["tipo"] in ["Ação", "FII"] else ""
                    tickers_yahoo.append(item["ticker"] + sufixo)

            # Baixa cotações
            try:
                dados_yahoo = yf.download(tickers_yahoo, period="1d", progress=False)['Close']
                cotacoes = dados_yahoo.iloc[-1]
            except:
                cotacoes = {}

            resumo = {"Total": 0, "Ação": 0, "FII": 0, "Internacional": 0, "Renda Fixa": 0}
            ativos_processados = []
            dolar = 5.82 

            for item in carteira:
                # -- 1. PREÇOS --
                if item["tipo"] == "Renda Fixa":
                    preco_atual = item.get("valor_fixo", item["pm"])
                    ticker_busca = item["ticker"]
                else:
                    sufixo = ".SA" if item["tipo"] in ["Ação", "FII"] else ""
                    ticker_busca = item["ticker"] + sufixo
                    try:
                        preco_atual = float(cotacoes[ticker_busca])
                    except:
                        preco_atual = item["pm"] # Fallback

                fator_moeda = dolar if item.get("moeda") == "USD" else 1
                preco_atual_brl = preco_atual * fator_moeda
                pm_brl = item["pm"] * fator_moeda
                
                total_atual = item["qtd"] * preco_atual_brl
                resumo["Total"] += total_atual
                if item["tipo"] in resumo: resumo[item["tipo"]] += total_atual

                lucro_reais = total_atual - (item["qtd"] * pm_brl)
                lucro_perc = ((total_atual / (item["qtd"] * pm_brl)) - 1) * 100 if pm_brl > 0 else 0

                # -- 2. INDICADORES (Prioridade: Manual > Yahoo) --
                lpa = item.get("lpa_manual", 0)
                vpa = item.get("vpa_manual", 0)
                dy_proj = item.get("dy_medio_5a", 0) # Valor em Reais médio de dividendos
                
                # Se não tiver manual, tenta Yahoo (para ações)
                if lpa == 0 and item["tipo"] == "Ação":
                     # Aqui você poderia adicionar scraping avançado no futuro
                     pass 

                # -- 3. CÁLCULOS AVANÇADOS --
                
                # Graham: Raiz(22.5 * LPA * VPA)
                preco_graham = 0
                margem_graham = 0
                if lpa > 0 and vpa > 0:
                    val = 22.5 * lpa * vpa
                    if val > 0:
                        preco_graham = math.sqrt(val)
                        margem_graham = ((preco_graham - preco_atual) / preco_atual) * 100

                # Preço Teto (Bazin Adaptado 7%)
                # Formula: Dividendos Médios / 0.07
                preco_teto_7 = 0
                margem_teto = 0
                if dy_proj > 0:
                    preco_teto_7 = dy_proj / 0.07
                    margem_teto = ((preco_teto_7 - preco_atual) / preco_atual) * 100

                # P/L e ROE (Estimados se tiver LPA/VPA)
                p_l = preco_atual / lpa if lpa > 0 else 0
                roe = (lpa / vpa) * 100 if vpa > 0 else 0

                ativos_processados.append({
                    **item,
                    "preco_atual": preco_atual,
                    "total_atual": total_atual,
                    "lucro_reais": lucro_reais,
                    "lucro_perc": lucro_perc,
                    "lpa": lpa,
                    "vpa": vpa,
                    "dy_medio": dy_proj,
                    "preco_graham": preco_graham,
                    "margem_graham": margem_graham,
                    "preco_teto_7": preco_teto_7,
                    "margem_teto": margem_teto,
                    "p_l": p_l,
                    "roe": roe
                })

            # -- ESTRATÉGIA --
            estrategia = []
            for ativo in ativos_processados:
                meta_fin = resumo["Total"] * (ativo.get("meta", 0) / 100)
                falta = meta_fin - ativo["total_atual"]
                ativo["falta_comprar"] = falta
                ativo["pct_atual"] = (ativo["total_atual"] / resumo["Total"]) * 100 if resumo["Total"] > 0 else 0
                estrategia.append(ativo)

            estrategia.sort(key=lambda x: x["falta_comprar"], reverse=True)

            self.wfile.write(json.dumps({"status": "Sucesso", "resumo": resumo, "ativos": estrategia}).encode('utf-8'))
            return

        except Exception as e:
            self.wfile.write(json.dumps({"status": "Erro", "detalhe": str(e)}).encode('utf-8'))


    # --- SALVAR DADOS (POST) ---
    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        content_len = int(self.headers.get('Content-Length', 0))
        post_body = self.rfile.read(content_len)
        dados_novos = json.loads(post_body) # Recebe apenas o ativo editado

        # Lê o atual
        with open('carteira.json', 'r', encoding='utf-8') as f:
            carteira = json.load(f)

        # Atualiza o ativo específico
        for item in carteira:
            if item["ticker"] == dados_novos["ticker"]:
                item["lpa_manual"] = float(dados_novos["lpa"])
                item["vpa_manual"] = float(dados_novos["vpa"])
                item["dy_medio_5a"] = float(dados_novos["dy_medio"])
        
        # Salva no disco
        with open('carteira.json', 'w', encoding='utf-8') as f:
            json.dump(carteira, f, indent=2)

        self.wfile.write(json.dumps({"status": "Salvo"}).encode('utf-8'))
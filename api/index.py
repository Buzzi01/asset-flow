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
            # 1. Carregar/Criar Dados
            arquivo = 'carteira.json'
            if not os.path.exists(arquivo):
                with open(arquivo, 'w') as f: json.dump([], f)
            with open(arquivo, 'r', encoding='utf-8') as f:
                carteira = json.load(f)

            # 2. Cotações Online
            tickers_yahoo = [
                (i["ticker"] + ".SA") if i["tipo"] in ["Ação", "FII"] else i["ticker"]
                for i in carteira if i["tipo"] not in ["Renda Fixa", "Reserva"]
            ]
            
            cotacoes = {}
            if tickers_yahoo:
                try:
                    dados = yf.download(tickers_yahoo, period="1d", progress=False)['Close']
                    cotacoes = dados.iloc[-1]
                except: pass

            resumo = {"Total": 0}
            ativos_proc = []
            dolar = 5.82 

            # 3. Processamento Inicial (Totais)
            for item in carteira:
                tipo = item["tipo"]
                ticker = item["ticker"]
                
                # Definir Preço Atual
                if tipo in ["Renda Fixa", "Reserva"]:
                    preco = item.get("valor_fixo", item["pm"])
                else:
                    busca = ticker + ".SA" if tipo in ["Ação", "FII"] else ticker
                    try: preco = float(cotacoes[busca])
                    except: preco = item["pm"] # Fallback

                # Moeda
                fator = dolar if item.get("moeda") == "USD" else 1
                preco_brl = preco * fator
                
                # Totais
                total_atual = item["qtd"] * preco_brl
                resumo["Total"] += total_atual
                resumo[tipo] = resumo.get(tipo, 0) + total_atual

                item["preco_atual"] = preco
                item["total_atual_brl"] = total_atual
                ativos_proc.append(item)

            # 4. Análise Fundamentalista e Decisão
            estrategia = []
            for item in ativos_proc:
                # Dados
                preco = item["preco_atual"]
                lpa = item.get("lpa_manual", 0)
                vpa = item.get("vpa_manual", 0)
                dy_proj = item.get("dy_proj_12m", 0) # Dividendo anual projetado em R$

                # --- CÁLCULOS DE VALUATION ---
                # Graham (Raiz de 22.5 * LPA * VPA)
                vi_graham = 0
                mg_graham = 0
                if item["tipo"] == "Ação" and lpa > 0 and vpa > 0:
                    try: 
                        vi_graham = math.sqrt(22.5 * lpa * vpa)
                        mg_graham = ((vi_graham - preco) / preco) * 100
                    except: pass

                # Bazin (Preço Teto = Div / 0.06) - Ou 7% se preferir
                teto_bazin = 0
                mg_bazin = 0
                if dy_proj > 0:
                    teto_bazin = dy_proj / 0.06 # Usando 6% como padrão de mercado
                    mg_bazin = ((teto_bazin - preco) / preco) * 100

                # P/VP para FIIs
                pvp = 0
                if item["tipo"] == "FII" and vpa > 0:
                    pvp = preco / vpa

                # --- LÓGICA DE BALANCEAMENTO ---
                meta_valor = resumo["Total"] * (item.get("meta", 0) / 100)
                falta_comprar = meta_valor - item["total_atual_brl"]
                pct_atual = (item["total_atual_brl"] / resumo["Total"]) * 100 if resumo["Total"] > 0 else 0

                # --- DECISÃO FINAL (O GRANDE JUIZ) ---
                recomendacao = "Neutro"
                cor_rec = "gray"

                if item["tipo"] == "Ação":
                    # Regra: Precisa na carteira E (Está barato em Graham OU Bazin)
                    if falta_comprar > 0:
                        if mg_graham > 20 or mg_bazin > 10:
                            recomendacao = "COMPRA FORTE"
                            cor_rec = "green"
                        elif mg_graham > 0 or mg_bazin > 0:
                            recomendacao = "COMPRAR"
                            cor_rec = "blue"
                        else:
                            recomendacao = "AGUARDAR PREÇO" # Precisa balancear, mas tá caro
                            cor_rec = "yellow"
                    else:
                        recomendacao = "MANTER/VENDER"
                        cor_rec = "red"
                
                elif item["tipo"] == "FII":
                    # Regra: P/VP abaixo de 1.05 e precisa na carteira
                    if falta_comprar > 0:
                        if pvp > 0 and pvp < 1.00:
                            recomendacao = "COMPRA OPORTUNIDADE"
                            cor_rec = "green"
                        elif pvp < 1.05:
                            recomendacao = "COMPRAR"
                            cor_rec = "blue"
                        else:
                            recomendacao = "CARO (AGUARDAR)"
                            cor_rec = "yellow"
                    else:
                        recomendacao = "MANTER"
                        cor_rec = "gray"
                
                else:
                    # Outros ativos (apenas balanceamento)
                    if falta_comprar > 0:
                        recomendacao = "APORTAR (META)"
                        cor_rec = "blue"
                    else:
                        recomendacao = "OK"

                estrategia.append({
                    **item,
                    "pct_atual": pct_atual,
                    "falta_comprar": falta_comprar,
                    "vi_graham": vi_graham,
                    "mg_graham": mg_graham,
                    "teto_bazin": teto_bazin,
                    "mg_bazin": mg_bazin,
                    "pvp": pvp,
                    "recomendacao": recomendacao,
                    "cor_rec": cor_rec
                })

            # Ordenar: Prioridade para o que precisa comprar mais
            estrategia.sort(key=lambda x: x["falta_comprar"], reverse=True)

            self.wfile.write(json.dumps({"status": "Sucesso", "resumo": resumo, "ativos": estrategia}).encode('utf-8'))

        except Exception as e:
            self.wfile.write(json.dumps({"status": "Erro", "detalhe": str(e)}).encode('utf-8'))

    # Salvar Edições
    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length))
            
            with open('carteira.json', 'r') as f: data = json.load(f)
            
            for item in data:
                if item["ticker"] == body["ticker"]:
                    # Atualiza campos manuais
                    if "lpa" in body: item["lpa_manual"] = float(body["lpa"])
                    if "vpa" in body: item["vpa_manual"] = float(body["vpa"])
                    if "dy" in body: item["dy_proj_12m"] = float(body["dy"])
                    if "meta" in body: item["meta"] = float(body["meta"])
                    if "qtd" in body: item["qtd"] = float(body["qtd"])
                    if "pm" in body: item["pm"] = float(body["pm"])
                    if "valor_fixo" in body: item["valor_fixo"] = float(body["valor_fixo"])

            with open('carteira.json', 'w') as f: json.dump(data, f, indent=2)
            self.wfile.write(json.dumps({"status": "Salvo"}).encode('utf-8'))
        except Exception as e:
            self.wfile.write(json.dumps({"erro": str(e)}).encode('utf-8'))
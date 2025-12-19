from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import yfinance as yf
import math
import os
import time
import pandas as pd
import numpy as np
import sys
import os

app = Flask(__name__)
CORS(app)

CACHE = { "timestamp": 0, "data": None, "timeout": 3600 }

def load_database():
    try:
        caminho = os.path.join(os.path.dirname(__file__), 'carteira.json')
        with open(caminho, 'r', encoding='utf-8') as f:
            return json.load(f)
    except: return []

# --- FUNÇÃO DE LIMPEZA (CORREÇÃO DO ERRO NaN) ---
def sanitize(val):
    """Converte NaN ou Infinito para 0 para não quebrar o JSON"""
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return 0
    return val

def calculate_metrics(item, dados_preco):
    preco_atual = dados_preco.get("atual", 0)
    
    # Inicia tudo zerado
    metrics = { 
        "vi_graham": 0, "mg_graham": 0, "teto_bazin": 0, "mg_bazin": 0, 
        "p_vp": 0, "doc_yield": 0, "dy_atual": 0, "magic_number": 0, 
        "renda_mensal_est": 0 
    }
    
    try:
        lpa = item.get("lpa_manual", 0)
        vpa = item.get("vpa_manual", 0)
        dy_proj_reais = item.get("dy_proj_12m", 0)
        pm = item.get("pm", 0)
        qtd = item.get("qtd", 0)

        if dy_proj_reais > 0:
            metrics["renda_mensal_est"] = (dy_proj_reais * qtd) / 12
            if preco_atual > 0: 
                metrics["magic_number"] = math.ceil(preco_atual / (dy_proj_reais / 12))

        if item["tipo"] == "Ação" and lpa > 0 and vpa > 0:
            try:
                metrics["vi_graham"] = math.sqrt(22.5 * lpa * vpa)
                if preco_atual > 0: 
                    metrics["mg_graham"] = ((metrics["vi_graham"] - preco_atual) / preco_atual) * 100
            except: pass

        if dy_proj_reais > 0:
            metrics["teto_bazin"] = dy_proj_reais / 0.06
            if preco_atual > 0:
                metrics["mg_bazin"] = ((metrics["teto_bazin"] - preco_atual) / preco_atual) * 100
                metrics["dy_atual"] = (dy_proj_reais / preco_atual) * 100
            if pm > 0: 
                metrics["doc_yield"] = (dy_proj_reais / pm) * 100

        if vpa > 0 and preco_atual > 0: 
            metrics["p_vp"] = preco_atual / vpa
            
    except Exception as e:
        print(f"Erro calculo metricas {item.get('ticker')}: {e}")

    # Limpa todos os valores antes de retornar
    return {k: sanitize(v) for k, v in metrics.items()}

def apply_strategy(item, metrics, falta_comprar, dados_preco):
    rec = "NEUTRO"; cor = "gray"; motivo = []; score = 0 
    preco = dados_preco.get("atual", 0)
    min_6m = dados_preco.get("min_6m", 0)

    if falta_comprar > 0: score += 30; motivo.append("Abaixo da Meta")
    else: score -= 20

    if item["tipo"] == "Ação":
        if metrics["mg_graham"] > 20: score += 30; motivo.append("Graham Barato")
        if min_6m > 0 and preco <= min_6m * 1.05: score += 20; motivo.append("No Fundo (6m)")
    elif item["tipo"] == "FII":
        if metrics["p_vp"] > 0 and metrics["p_vp"] < 1.0: score += 30; motivo.append("Desconto")
        if metrics["magic_number"] > 0 and item["qtd"] >= metrics["magic_number"]: score += 10; motivo.append("Bola de Neve ❄️")

    if falta_comprar > 0:
        if score >= 60: rec = "COMPRA FORTE"; cor = "green"
        elif score >= 30: rec = "COMPRAR"; cor = "blue"
        else: rec = "AGUARDAR"; cor = "yellow"
    else: rec = "MANTER"; cor = "gray"

    return rec, cor, score, ", ".join(motivo)

@app.route('/api/index', methods=['GET'])
def get_data():
    global CACHE
    if CACHE["data"] and (time.time() - CACHE["timestamp"] < CACHE["timeout"]):
        print("⚡ Cache Local Utilizado")
        return jsonify(CACHE["data"])

    print("🔄 Baixando Historico Completo...")
    carteira = load_database()
    
    tickers = [
        (i["ticker"] + ".SA") if i["tipo"] in ["Ação", "FII"] else i["ticker"] 
        for i in carteira if i["tipo"] not in ["Renda Fixa", "Reserva"]
    ]
    
    cotacoes = {}
    dolar = 5.82

    if tickers:
        try:
            # Pega Dolar
            try:
                usd = yf.Ticker("BRL=X").history(period="1d")
                if not usd.empty: dolar = float(usd['Close'].iloc[-1])
            except: pass

            # Pega Ativos
            dados = yf.download(tickers, period="1y", group_by='ticker', progress=False, threads=True)
            
            for t in tickers:
                try:
                    serie = dados[t]['Close'] if len(tickers) > 1 else dados['Close']
                    if not serie.empty:
                        atual = float(serie.iloc[-1])
                        min_12m = float(serie.min())
                        min_6m = float(serie.tail(126).min())
                        
                        cotacoes[t] = {
                            "atual": sanitize(atual),
                            "min_12m": sanitize(min_12m),
                            "min_6m": sanitize(min_6m)
                        }
                except: pass
        except Exception as e: print(f"Erro download: {e}")

    resumo = {"Total": 0, "RendaMensal": 0}
    ativos_temp = []

    for item_orig in carteira:
        item = item_orig.copy()
        ticker_full = (item["ticker"] + ".SA") if item["tipo"] in ["Ação", "FII"] else item["ticker"]
        
        dados_preco = cotacoes.get(ticker_full, {})
        # Fallback de preço se falhar o download
        preco = dados_preco.get("atual", 0)
        if preco == 0: preco = item.get("valor_fixo", item.get("pm", 0))
        
        fator = dolar if item.get("moeda") == "USD" else 1
        item["_total"] = item["qtd"] * preco * fator
        item["preco_atual"] = preco
        
        resumo["Total"] += item["_total"]
        if item["tipo"] not in resumo: resumo[item["tipo"]] = 0
        resumo[item["tipo"]] += item["_total"]
        
        item["_dados_preco"] = dados_preco
        ativos_temp.append(item)

    ativos_proc = []; alertas = []
    for item in ativos_temp:
        total_carteira = resumo["Total"] if resumo["Total"] > 0 else 1
        pct = (item["_total"] / total_carteira * 100)
        
        meta_val = resumo["Total"] * (item.get("meta", 0) / 100)
        falta = meta_val - item["_total"]
        
        if pct > item.get("meta", 0) * 1.5: alertas.append(f"{item['ticker']} Concentrado ({pct:.1f}%)")

        metrics = calculate_metrics(item, item["_dados_preco"])
        resumo["RendaMensal"] += metrics["renda_mensal_est"]
        
        rec, cor, score, motivo = apply_strategy(item, metrics, falta, item["_dados_preco"])
        
        # Limpa dados internos
        item_final = {k:v for k,v in item.items() if not k.startswith('_')}
        item_final["min_6m"] = sanitize(item["_dados_preco"].get("min_6m", 0))

        # SANITIZA TUDO ANTES DE ADICIONAR
        ativo_pronto = { 
            **item_final, **metrics, 
            "pct_atual": sanitize(pct), 
            "falta_comprar": sanitize(falta), 
            "recomendacao": rec, "cor_rec": cor, "score": score, "motivo": motivo 
        }
        ativos_proc.append(ativo_pronto)

    ativos_proc.sort(key=lambda x: x["score"], reverse=True)
    
    # Sanitiza o gráfico também
    grafico = [{"name": k, "value": sanitize(v)} for k, v in resumo.items() if k not in ["Total", "RendaMensal"] and v > 0]
    
    response_data = { 
        "status": "Sucesso", 
        "dolar": sanitize(dolar), 
        "resumo": {k: sanitize(v) for k,v in resumo.items()}, 
        "grafico": grafico, 
        "alertas": alertas, 
        "ativos": ativos_proc 
    }
    
    CACHE["timestamp"] = time.time(); CACHE["data"] = response_data
    return jsonify(response_data)

if __name__ == '__main__':
    app.run(port=5328)
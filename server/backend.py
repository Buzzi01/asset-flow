from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import yfinance as yf
import math
import os
import time
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

CACHE = { "timestamp": 0, "data": None, "timeout": 3600 }

def get_path(filename):
    return os.path.join(os.path.dirname(__file__), filename)

def load_database():
    try:
        with open(get_path('carteira.json'), 'r', encoding='utf-8') as f:
            return json.load(f)
    except: return []

def load_categories():
    try:
        with open(get_path('categorias.json'), 'r', encoding='utf-8') as f:
            return json.load(f)
    except: return {}

def sanitize(val):
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val): return 0
    return val

def clean_dict(d):
    new_dict = {}
    for k, v in d.items():
        if isinstance(v, dict): new_dict[k] = clean_dict(v)
        elif isinstance(v, float): new_dict[k] = sanitize(v)
        else: new_dict[k] = v
    return new_dict

def calculate_metrics(item, dados_preco):
    preco_atual = dados_preco.get("atual", 0)
    metrics = { "vi_graham": 0, "mg_graham": 0, "teto_bazin": 0, "mg_bazin": 0, "p_vp": 0, "magic_number": 0, "renda_mensal_est": 0 }
    
    try:
        lpa = item.get("lpa_manual", 0); vpa = item.get("vpa_manual", 0)
        dy_proj = item.get("dy_proj_12m", 0); qtd = item.get("qtd", 0)
        pm = item.get("pm", 0)

        if dy_proj > 0:
            metrics["renda_mensal_est"] = (dy_proj * qtd) / 12
            if preco_atual > 0: metrics["magic_number"] = math.ceil(preco_atual / (dy_proj / 12))

        if item["tipo"] == "Ação" and lpa > 0 and vpa > 0:
            metrics["vi_graham"] = math.sqrt(22.5 * lpa * vpa)
            if preco_atual > 0: metrics["mg_graham"] = ((metrics["vi_graham"] - preco_atual) / preco_atual) * 100

        if dy_proj > 0:
            metrics["teto_bazin"] = dy_proj / 0.06
            if preco_atual > 0: metrics["mg_bazin"] = ((metrics["teto_bazin"] - preco_atual) / preco_atual) * 100

        if vpa > 0 and preco_atual > 0: metrics["p_vp"] = preco_atual / vpa
            
    except: pass
    return metrics

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

    print("🔄 Calculando Lucros e Metas...")
    carteira = load_database()
    metas_categorias = load_categories()
    
    tickers = [(i["ticker"] + ".SA") if i["tipo"] in ["Ação", "FII"] else i["ticker"] for i in carteira if i["tipo"] not in ["Renda Fixa", "Reserva"]]
    cotacoes = {}; dolar = 5.82

    if tickers:
        try:
            try:
                usd = yf.Ticker("BRL=X").history(period="1d")
                if not usd.empty: dolar = float(usd['Close'].iloc[-1])
            except: pass
            
            dados = yf.download(tickers, period="1y", group_by='ticker', progress=False, threads=True)
            for t in tickers:
                try:
                    serie = dados[t]['Close'] if len(tickers) > 1 else dados['Close']
                    if not serie.empty:
                        cotacoes[t] = {
                            "atual": sanitize(float(serie.iloc[-1])),
                            "min_6m": sanitize(float(serie.tail(126).min()))
                        }
                except: pass
        except: pass

    resumo = {"Total": 0, "RendaMensal": 0, "TotalInvestido": 0, "LucroTotal": 0}
    for cat in metas_categorias: resumo[cat] = 0
    
    ativos_temp = []

    # 1. TOTAIS GERAIS
    for item_orig in carteira:
        item = item_orig.copy()
        ticker_full = (item["ticker"] + ".SA") if item["tipo"] in ["Ação", "FII"] else item["ticker"]
        
        dados_preco = cotacoes.get(ticker_full, {})
        preco = dados_preco.get("atual", 0)
        if preco == 0: preco = item.get("valor_fixo", item.get("pm", 0))
        
        fator = dolar if item.get("moeda") == "USD" else 1
        
        # Matematica Financeira
        item["preco_atual"] = preco
        item["total_atual"] = item["qtd"] * preco * fator
        item["total_investido"] = item["qtd"] * item["pm"] * fator
        item["lucro_valor"] = item["total_atual"] - item["total_investido"]
        item["lucro_pct"] = (item["lucro_valor"] / item["total_investido"] * 100) if item["total_investido"] > 0 else 0
        
        resumo["Total"] += item["total_atual"]
        resumo["TotalInvestido"] += item["total_investido"]
        
        if item["tipo"] not in resumo: resumo[item["tipo"]] = 0
        resumo[item["tipo"]] += item["total_atual"]
        
        item["_dados_preco"] = dados_preco
        ativos_temp.append(item)

    resumo["LucroTotal"] = resumo["Total"] - resumo["TotalInvestido"]
    ativos_proc = []; alertas = []

    # 2. METAS RELATIVAS (TOP-DOWN)
    for item in ativos_temp:
        # Pega o total da CATEGORIA deste ativo (ex: Total investido em Ações)
        total_categoria = resumo.get(item["tipo"], 1)
        
        # Porcentagem que esse ativo ocupa NA CATEGORIA (ex: ITUB é 10% das Ações)
        pct_na_categoria = (item["total_atual"] / total_categoria * 100) if total_categoria > 0 else 0
        
        # Calculo de Aporte (Falta Comprar)
        # Meta Global = Meta Categoria (25%) * Meta Ativo (10%) = 2.5% do Patrimonio Total
        meta_cat_pct = metas_categorias.get(item["tipo"], 0) / 100
        meta_ativo_pct = item.get("meta", 0) / 100
        meta_global_valor = resumo["Total"] * meta_cat_pct * meta_ativo_pct
        
        falta = meta_global_valor - item["total_atual"]

        if pct_na_categoria > item.get("meta", 0) * 1.5: 
            alertas.append(f"{item['ticker']} estourou meta na categoria ({pct_na_categoria:.1f}%)")

        metrics = calculate_metrics(item, item["_dados_preco"])
        resumo["RendaMensal"] += metrics["renda_mensal_est"]
        rec, cor, score, motivo = apply_strategy(item, metrics, falta, item["_dados_preco"])
        
        item_final = {k:v for k,v in item.items() if not k.startswith('_')}
        item_final["min_6m"] = sanitize(item["_dados_preco"].get("min_6m", 0))

        ativo_pronto = { 
            **item_final, **metrics, 
            "pct_na_categoria": sanitize(pct_na_categoria), # Essa é a % que vai pro Front
            "falta_comprar": sanitize(falta), 
            "recomendacao": rec, "cor_rec": cor, "score": score, "motivo": motivo 
        }
        ativos_proc.append(clean_dict(ativo_pronto))

    ativos_proc.sort(key=lambda x: x["score"], reverse=True)
    grafico = [{"name": k, "value": sanitize(v)} for k, v in resumo.items() if k not in ["Total", "RendaMensal", "TotalInvestido", "LucroTotal"] and v > 0]
    
    response_data = { 
        "status": "Sucesso", "dolar": sanitize(dolar), 
        "resumo": {k: sanitize(v) for k,v in resumo.items()}, 
        "grafico": grafico, "alertas": alertas, "ativos": ativos_proc 
    }
    CACHE["timestamp"] = time.time(); CACHE["data"] = response_data
    return jsonify(response_data)

if __name__ == '__main__':
    print("🚀 Backend Financeiro Rodando na porta 5328...")
    app.run(port=5328)
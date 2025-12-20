# server/backend.py
import sys
import os
import threading
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('AssetFlow')

from services import PortfolioService

app = Flask(__name__)
CORS(app)

service = PortfolioService()

# --- JOB AGENDADO ---
def scheduled_update():
    """Roda automaticamente em segundo plano"""
    # Como agora usamos sessão segura no services.py, não precisamos de app.app_context aqui obrigatoriamente,
    # mas mantemos para compatibilidade futura com plugins flask
    with app.app_context():
        service.update_prices()
        service.take_daily_snapshot()

# CORREÇÃO 1.3 e 2.3: Scheduler seguro
scheduler = BackgroundScheduler()
if not scheduler.running:
    scheduler.add_job(func=scheduled_update, trigger="interval", minutes=30)
    scheduler.start()

@app.route('/api/index', methods=['GET'])
def get_data():
    force = request.args.get('force') == 'true'
    if force:
        try:
            # Roda síncrono para dar feedback imediato ao usuário
            service.update_prices()
            service.take_daily_snapshot()
        except: pass
        
    data = service.get_dashboard_data()
    return jsonify(data)

@app.route('/api/history', methods=['GET'])
def get_history():
    data = service.get_history_data()
    return jsonify(data)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "running", "db": "sqlite"})

# --- TAREFA DE INICIALIZAÇÃO EM BACKGROUND ---
def initial_background_update():
    print("⏳ Aguardando servidor iniciar para atualizar dados...")
    time.sleep(3) 
    try:
        service.update_prices()
        service.take_daily_snapshot()
    except Exception as e:
        print(f"⚠️ Erro na atualização inicial: {e}")

@app.route('/api/update_asset', methods=['POST'])
def update_asset():
    data = request.json
    try:
        # Extrai tudo do JSON
        ticker = data.get('ticker')
        qtd = data.get('qtd', 0)
        pm = data.get('pm', 0)
        meta = data.get('meta', 0)
        dy = data.get('dy', 0)
        lpa = data.get('lpa', 0)
        vpa = data.get('vpa', 0)
        
        # Passa tudo para o service
        result = service.update_position(ticker, qtd, pm, meta, dy, lpa, vpa)
        
        if result["status"] == "Sucesso":
             service.take_daily_snapshot() 
             
        return jsonify(result)
    except Exception as e:
        print(f"Erro no update: {e}")
        return jsonify({"status": "Erro", "msg": str(e)})

@app.route('/api/add_asset', methods=['POST'])
def add_asset():
    data = request.json
    try:
        ticker = data.get('ticker').upper().strip() # Força Maiúscula
        category = data.get('category')
        qtd = data.get('qtd', 0)
        pm = data.get('pm', 0)
        
        result = service.add_new_asset(ticker, category, qtd, pm)
        
        if result["status"] == "Sucesso":
             # Tenta baixar o preço logo de cara para não ficar zerado
             try:
                service.update_prices()
                service.take_daily_snapshot()
             except: pass
             
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)})
    
@app.route('/api/delete_asset', methods=['POST'])
def delete_asset():
    data = request.json
    try:
        ticker = data.get('ticker')
        result = service.delete_asset(ticker)
        
        # Se deletou, atualiza o snapshot para o patrimônio total cair na hora
        if result["status"] == "Sucesso":
             service.take_daily_snapshot()
             
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)})

if __name__ == '__main__':
    print("🚀 AssetFlow Server (SQL Edition) Iniciando...")
    
    # Thread separada para não travar o boot do Flask
    boot_thread = threading.Thread(target=initial_background_update)
    boot_thread.daemon = True 
    boot_thread.start()
    
    print("✅ Servidor pronto na porta 5328.")
    app.run(port=5328, debug=False, use_reloader=False)
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

if __name__ == '__main__':
    print("🚀 AssetFlow Server (SQL Edition) Iniciando...")
    
    # Thread separada para não travar o boot do Flask
    boot_thread = threading.Thread(target=initial_background_update)
    boot_thread.daemon = True 
    boot_thread.start()
    
    print("✅ Servidor pronto na porta 5328.")
    app.run(port=5328, debug=False, use_reloader=False)
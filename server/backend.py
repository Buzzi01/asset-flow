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
    with app.app_context():
        # 1. Atualiza Preços
        service.update_prices()
        # 2. Tira a Foto do Patrimônio
        service.take_daily_snapshot()

scheduler = BackgroundScheduler()
# Executa a cada 30 minutos
scheduler.add_job(func=scheduled_update, trigger="interval", minutes=30)
scheduler.start()

@app.route('/api/index', methods=['GET'])
def get_data():
    force = request.args.get('force') == 'true'
    
    # Se pedir force, rodamos em uma thread separada para não travar a resposta
    # Mas para simplificar, se for force, rodamos síncrono (pode demorar um pouco)
    if force:
        try:
            service.update_prices()
            service.take_daily_snapshot()
        except: pass
        
    data = service.get_dashboard_data()
    return jsonify(data)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "running", "db": "sqlite"})

# --- TAREFA DE INICIALIZAÇÃO EM BACKGROUND ---
def initial_background_update():
    """Espera o servidor subir e roda a atualização sem travar o boot"""
    print("⏳ Aguardando servidor iniciar para atualizar dados...")
    time.sleep(3) # Espera 3s para garantir que o Flask subiu
    try:
        service.update_prices()
        service.take_daily_snapshot()
    except Exception as e:
        print(f"⚠️ Erro na atualização inicial (background): {e}")

if __name__ == '__main__':
    print("🚀 AssetFlow Server (SQL Edition) Iniciando...")
    
    # MUDANÇA CRÍTICA: Roda a atualização inicial em uma Thread separada
    # Isso impede que o erro do Yahoo trave a abertura do site
    boot_thread = threading.Thread(target=initial_background_update)
    boot_thread.daemon = True # Garante que fecha se o programa fechar
    boot_thread.start()
    
    # Inicia o servidor imediatamente
    print("✅ Servidor pronto na porta 5328.")
    app.run(port=5328, debug=False, use_reloader=False)
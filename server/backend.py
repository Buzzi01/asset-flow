# server/backend.py
import sys
import os
import threading
import time
from flask import Flask
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
import logging

# Importa as rotas novas
from routes.dashboard import dashboard_bp
from routes.assets import assets_bp
from services import PortfolioService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('AssetFlow')

app = Flask(__name__)
CORS(app)

# Registra os Blueprints
app.register_blueprint(dashboard_bp)
app.register_blueprint(assets_bp)

# Instância local apenas para o Scheduler
service = PortfolioService()

# --- JOB AGENDADO ---
def scheduled_update():
    """Roda automaticamente em segundo plano"""
    with app.app_context():
        service.update_prices()
        service.take_daily_snapshot()

scheduler = BackgroundScheduler()
if not scheduler.running:
    scheduler.add_job(func=scheduled_update, trigger="interval", minutes=30)
    scheduler.start()

# --- TAREFA DE INICIALIZAÇÃO ---
def initial_background_update():
    print("⏳ Aguardando servidor iniciar para atualizar dados...")
    time.sleep(3) 
    try:
        service.update_prices()
        service.take_daily_snapshot()
    except Exception as e:
        print(f"⚠️ Erro na atualização inicial: {e}")

if __name__ == '__main__':
    print("🚀 AssetFlow Server (Docker Ready) Iniciando...")
    
    boot_thread = threading.Thread(target=initial_background_update)
    boot_thread.daemon = True 
    boot_thread.start()
    
    # Host 0.0.0.0 é obrigatório para funcionar dentro do Docker
    app.run(host='0.0.0.0', port=5328, debug=False, use_reloader=False)
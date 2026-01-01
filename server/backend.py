import os
import threading
import time
import logging
from flask import Flask
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

# Importação de Blueprints
from routes.dashboard import dashboard_bp
from routes.assets import assets_bp
from routes.news import news_bp
from routes.calendar import calendar_bp
from routes.alerts import alerts_bp
from routes.dividends import dividends_bp
from routes.maintenance import maintenance_bp # <--- Novo
from services import PortfolioService

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)
CORS(app)

# Registro de Rotas
app.register_blueprint(dashboard_bp)
app.register_blueprint(assets_bp)
app.register_blueprint(news_bp)
app.register_blueprint(calendar_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(dividends_bp)
app.register_blueprint(maintenance_bp)

service = PortfolioService()

def scheduled_update():
    with app.app_context():
        try:
            service.update_prices()
            service.take_daily_snapshot()
            service.record_confirmed_dividends()
            logging.info("✅ Manutenção automática concluída.")
        except Exception as e:
            logging.error(f"❌ Erro no agendador: {e}")

# Configuração do Agendador
scheduler = BackgroundScheduler()
if not scheduler.running:
    scheduler.add_job(func=scheduled_update, trigger="interval", minutes=60)
    scheduler.start()

def initial_background_update():
    time.sleep(5) 
    scheduled_update()

if __name__ == '__main__':
    boot_thread = threading.Thread(target=initial_background_update)
    boot_thread.daemon = True 
    boot_thread.start()
    
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host='0.0.0.0', port=5328, debug=debug_mode, use_reloader=False)
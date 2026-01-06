import os
import threading
import time
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

# Importação de Blueprints
from routes.dashboard import dashboard_bp
from routes.assets import assets_bp
from routes.news import news_bp
from routes.calendar import calendar_bp
from routes.alerts import alerts_bp
from routes.dividends import dividends_bp
from routes.maintenance import maintenance_bp
from services import PortfolioService

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)
CORS(app)

# Registro de Rotas (Blueprints que você já tem)
app.register_blueprint(dashboard_bp)
app.register_blueprint(assets_bp)
app.register_blueprint(news_bp)
app.register_blueprint(calendar_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(dividends_bp)
app.register_blueprint(maintenance_bp)

# Instância única do serviço
service = PortfolioService()

# --- NOVA ROTA PARA SINCRONIZAÇÃO DE RELATÓRIOS CVM ---
@app.route('/api/sync-reports', methods=['POST'])
def sync_reports():
    try:
        logging.info("🚀 Iniciando sincronia manual de relatórios...")
        # Chamamos o método que você já tem no services.py
        result = service.sync_reports_with_fnet() 
        
        # Garante que o retorno seja JSON e status 200
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"❌ Erro na rota de sincronia: {str(e)}")
        # Se der erro, retorna JSON com erro 500, evitando o envio de HTML do Flask
        return jsonify({
            "status": "Erro", 
            "msg": f"Erro interno no servidor: {str(e)}"
        }), 500

def scheduled_update():
    with app.app_context():
        try:
            logging.info("🔄 Iniciando manutenção automática...")
            service.update_prices()
            service.take_daily_snapshot()
            # Certifique-se que esta função existe no seu services.py atual
            if hasattr(service, 'record_confirmed_dividends'):
                service.record_confirmed_dividends()
            logging.info("✅ Manutenção automática concluída.")
        except Exception as e:
            logging.error(f"❌ Erro no agendador: {e}")

# Configuração do Agendador (APScheduler)
scheduler = BackgroundScheduler()
if not scheduler.running:
    # Roda a cada 60 minutos
    scheduler.add_job(func=scheduled_update, trigger="interval", minutes=60)
    scheduler.start()

def initial_background_update():
    """Roda uma atualização 5 segundos após o boot para não travar a inicialização"""
    time.sleep(5) 
    scheduled_update()

if __name__ == '__main__':
    # Thread para processamento inicial sem travar o Flask
    boot_thread = threading.Thread(target=initial_background_update)
    boot_thread.daemon = True 
    boot_thread.start()
    
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    # Porta 5328 conforme seu padrão
    app.run(host='0.0.0.0', port=5328, debug=debug_mode, use_reloader=False)
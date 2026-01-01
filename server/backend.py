# server/backend.py
import sys
import os
import threading
import time
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

# Importa as rotas e serviços
from routes.dashboard import dashboard_bp
from routes.assets import assets_bp
from routes.news import news_bp
from routes.calendar import calendar_bp
from routes.alerts import alerts_bp
from routes.dividends import dividends_bp # <--- [CONFIRMADO] Rota para a nova tabela
from services import PortfolioService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('AssetFlow')

app = Flask(__name__)
CORS(app)

# Registra os Blueprints
app.register_blueprint(dashboard_bp)
app.register_blueprint(assets_bp)
app.register_blueprint(news_bp)
app.register_blueprint(calendar_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(dividends_bp) # <--- Ativando a rota de extrato real

service = PortfolioService()

# --- JOB AGENDADO (UNIFICADO) ---
def scheduled_update():
    """Rotina de manutenção: Preços -> Snapshot -> Robô de Proventos"""
    with app.app_context():
        print("⏰ [JOB] Iniciando manutenção automática...", flush=True)
        try:
            # 1. Atualiza Preços (Regras 2 e 3 de Ticker/Yahoo)
            service.update_prices()
            # 2. Registra histórico de patrimônio
            service.take_daily_snapshot()
            # 3. 👇 CARIMBO OFICIAL: Registra dividendos confirmados no banco
            service.record_confirmed_dividends()
            print("✅ [JOB] Manutenção concluída com sucesso.", flush=True)
        except Exception as e:
            print(f"❌ [JOB] Erro na manutenção: {e}", flush=True)

# Configuração do Agendador (Roda a cada 60 min para não sobrecarregar o Yahoo)
scheduler = BackgroundScheduler()
if not scheduler.running:
    scheduler.add_job(func=scheduled_update, trigger="interval", minutes=60)
    scheduler.start()

# --- TAREFA DE INICIALIZAÇÃO ---
def initial_background_update():
    print("⏳ Aguardando servidor iniciar para sincronizar dados...", flush=True)
    time.sleep(5) 
    scheduled_update() # Reutiliza a função unificada para rodar tudo no boot

# --- ROTAS DE UTILIDADE ---

@app.route('/api/update_category_meta', methods=['POST'])
def update_category_meta():
    data = request.json
    result = service.update_category_meta(data.get('category'), data.get('meta'))
    return jsonify(result)

@app.route('/api/validate_ticker', methods=['POST'])
def validate_ticker():
    data = request.json
    ticker = data.get('ticker', '').strip()
    if not ticker:
        return jsonify({"valid": False, "msg": "Ticker vazio"})
    
    result = service.validate_ticker_on_yahoo(ticker)
    # Regra: Se não existe no Yahoo, permitimos como "Manual"
    if not result['valid']:
        return jsonify({
            "valid": True, 
            "ticker": ticker.upper(), 
            "manual": True, 
            "msg": "Ativo não encontrado no Yahoo. Será cadastrado como Manual."
        })
    return jsonify(result)

@app.route('/api/simulation', methods=['GET'])
def simulation():
    return jsonify(service.run_monte_carlo_simulation())

@app.route('/api/cleanup_trash', methods=['GET'])
def cleanup_trash():
    from services import Session, Position
    session = Session()
    try:
        positions = session.query(Position).all()
        deleted_count = 0
        for pos in positions:
            if pos.asset is None:
                session.delete(pos)
                deleted_count += 1
        session.commit()
        return jsonify({"status": "Sucesso", "msg": f"Faxina concluída! {deleted_count} itens removidos."})
    except Exception as e:
        session.rollback()
        return jsonify({"status": "Erro", "msg": str(e)})
    finally:
        session.close()

if __name__ == '__main__':
    print("🚀 AssetFlow Server (Docker Ready) Iniciando...")
    
    # Thread para não travar o boot do Flask
    boot_thread = threading.Thread(target=initial_background_update)
    boot_thread.daemon = True 
    boot_thread.start()
    
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host='0.0.0.0', port=5328, debug=debug_mode, use_reloader=False) # Loader False para evitar Jobs duplos
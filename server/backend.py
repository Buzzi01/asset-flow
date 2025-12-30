# server/backend.py
import sys
import os
import threading
import time
from flask import Flask
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from routes.calendar import calendar_bp
from routes.alerts import alerts_bp
from flask import Flask, jsonify, request
import logging

# Importa as rotas
from routes.dashboard import dashboard_bp
from routes.assets import assets_bp
from routes.news import news_bp  # <--- [NOVO] Importando o arquivo news.py

from services import PortfolioService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('AssetFlow')

app = Flask(__name__)
CORS(app)

# Registra os Blueprints
app.register_blueprint(dashboard_bp)
app.register_blueprint(assets_bp)
app.register_blueprint(news_bp)  # <--- [NOVO] Ativando a rota de notícias
app.register_blueprint(calendar_bp)
app.register_blueprint(alerts_bp)

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

@app.route('/api/update_category_meta', methods=['POST'])
def update_category_meta():
    data = request.json
    service = PortfolioService()
    result = service.update_category_meta(data.get('category'), data.get('meta'))
    return jsonify(result)

# 👇 Adicione logo após os imports ou junto com as outras rotas
@app.route('/api/validate_ticker', methods=['POST'])
def validate_ticker():
    data = request.json
    ticker = data.get('ticker', '').strip()
    
    if not ticker:
        return jsonify({"valid": False, "msg": "Ticker vazio"})
    
    service = PortfolioService()
    result = service.validate_ticker_on_yahoo(ticker)
    
    # 👇 A MUDANÇA MÁGICA:
    # Se o Yahoo disse que não existe (valid=False), nós aprovamos mesmo assim!
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
    service = PortfolioService()
    # Chama a função matemática que já existe no services.py
    result = service.run_monte_carlo_simulation()
    return jsonify(result)

# Adicione ao server/backend.py

@app.route('/api/cleanup_trash', methods=['GET'])
def cleanup_trash():
    from services import Session, Position
    session = Session()
    try:
        # Busca todas as posições
        positions = session.query(Position).all()
        deleted_count = 0
        
        for pos in positions:
            # Se não tem ativo associado, é lixo
            if pos.asset is None:
                print(f"🧹 Faxina: Deletando Posição Órfã ID {pos.id}")
                session.delete(pos)
                deleted_count += 1
        
        session.commit()
        return jsonify({
            "status": "Sucesso", 
            "msg": f"Faxina concluída! {deleted_count} itens órfãos foram removidos do banco."
        })
    except Exception as e:
        session.rollback()
        return jsonify({"status": "Erro", "msg": str(e)})
    finally:
        session.close()

if __name__ == '__main__':
    print("🚀 AssetFlow Server (Docker Ready) Iniciando...")
    
    boot_thread = threading.Thread(target=initial_background_update)
    boot_thread.daemon = True 
    boot_thread.start()
    
    # 🛠️ CORREÇÃO: Permite que o FLASK_DEBUG do docker-compose controle o reloader
    debug_mode = os.environ.get("FLASK_DEBUG", "0") == "1"
    
    # Se estiver em debug, ativamos o reloader.
    app.run(host='0.0.0.0', port=5328, debug=debug_mode, use_reloader=debug_mode)
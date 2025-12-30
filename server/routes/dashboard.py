# server/routes/dashboard.py
from flask import Blueprint, jsonify, request
import sys
import os

# Ajuste para importar services da pasta pai
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from services import PortfolioService

dashboard_bp = Blueprint('dashboard', __name__)
service = PortfolioService()

@dashboard_bp.route('/api/index', methods=['GET'])
def get_data():
    force = request.args.get('force') == 'true'
    if force:
        try:
            # Roda síncrono para feedback imediato
            service.update_prices()
            service.take_daily_snapshot()
        except: pass
        
    data = service.get_dashboard_data()
    return jsonify(data)

@dashboard_bp.route('/api/history', methods=['GET'])
def get_history():
    data = service.get_history_data()
    return jsonify(data)

@dashboard_bp.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "running", "db": "sqlite", "container": os.environ.get('IS_DOCKER', 'false')})

@dashboard_bp.route('/api/update-fundamentals', methods=['POST'])
def trigger_fundamentals():
    service = PortfolioService()
    result = service.update_fundamentals()
    return jsonify(result)

@dashboard_bp.route('/api/simulation', methods=['GET'])
def simulation():
    service = PortfolioService()
    # Chama a função que já existe no services.py
    result = service.run_monte_carlo_simulation()
    return jsonify(result)
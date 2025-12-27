# server/routes/assets.py
from flask import Blueprint, jsonify, request
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from services import PortfolioService

assets_bp = Blueprint('assets', __name__)
service = PortfolioService()

@assets_bp.route('/api/add_asset', methods=['POST'])
def add_asset():
    data = request.json
    try:
        ticker = data.get('ticker').upper().strip()
        category = data.get('category')
        qtd = data.get('qtd', 0)
        pm = data.get('pm', 0)
        
        result = service.add_new_asset(ticker, category, qtd, pm)
        
        if result["status"] == "Sucesso":
             try:
                service.update_prices()
                service.take_daily_snapshot()
             except: pass
             
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)})

@assets_bp.route('/api/update_asset', methods=['POST'])
def update_asset():
    data = request.json
    try:
        # Passa tudo para o service
        result = service.update_position(
            data.get('ticker'), 
            data.get('qtd', 0), 
            data.get('pm', 0), 
            data.get('meta', 0), 
            data.get('dy', 0), 
            data.get('lpa', 0), 
            data.get('vpa', 0)
        )
        
        if result["status"] == "Sucesso":
             service.take_daily_snapshot() 
             
        return jsonify(result)
    except Exception as e:
        print(f"Erro no update: {e}")
        return jsonify({"status": "Erro", "msg": str(e)})

@assets_bp.route('/api/delete_asset', methods=['POST'])
def delete_asset():
    data = request.json
    try:
        ticker = data.get('ticker')
        result = service.delete_asset(ticker)
        
        if result["status"] == "Sucesso":
             service.take_daily_snapshot()
             
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)})
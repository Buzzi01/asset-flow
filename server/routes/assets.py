# server/routes/assets.py
from flask import Blueprint, jsonify, request
from pydantic import BaseModel, Field, ValidationError
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from services import PortfolioService
from utils.cvm_processor import CVMProcessor

assets_bp = Blueprint('assets', __name__)
service = PortfolioService()

# --- Schemas de Validação ---
class AssetInput(BaseModel):
    ticker: str = Field(..., min_length=1, strip_whitespace=True)
    category: str = Field(..., min_length=1)
    qtd: float = Field(ge=0, default=0)
    pm: float = Field(ge=0, default=0)
    meta: float = Field(ge=0, default=0) # 👈 Adicionado campo META

class UpdateInput(BaseModel):
    ticker: str
    qtd: float = Field(ge=0)
    pm: float = Field(ge=0)
    meta: float = Field(ge=0, le=100, default=0)
    dy: float = Field(default=0)
    lpa: float = Field(default=0)
    vpa: float = Field(default=0)
    current_price: float = Field(default=None)

# --- Rotas ---

@assets_bp.route('/api/simulation')
def simulation():
    try:
        result = service.run_monte_carlo_simulation()
        return jsonify(result)
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)}), 500

@assets_bp.route('/api/add_asset', methods=['POST'])
def add_asset():
    try:
        # Validação automática com Pydantic
        body = AssetInput(**request.json)
        
        result = service.add_new_asset(
            body.ticker.upper(), 
            body.category, 
            body.qtd, 
            body.pm,
            body.meta # 👈 Passando a meta para o serviço
        )
        
        if result["status"] == "Sucesso":
             try: service.update_prices(); service.take_daily_snapshot()
             except: pass
             
        return jsonify(result)
        
    except ValidationError as e:
        return jsonify({"status": "Erro", "msg": "Dados inválidos", "errors": e.errors()}), 400
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)}), 500

@assets_bp.route('/api/update_asset', methods=['POST'])
def update_asset():
    try:
        body = UpdateInput(**request.json)
        
        # 👇 2. Passamos o manual_price para o serviço
        result = service.update_position(
            ticker=body.ticker, 
            qtd=body.qtd, 
            pm=body.pm, 
            meta=body.meta, 
            dy=body.dy, 
            lpa=body.lpa, 
            vpa=body.vpa,
            current_price=body.current_price
        )
        
        if result["status"] == "Sucesso":
             service.take_daily_snapshot() 
             
        return jsonify(result)
    except ValidationError as e:
        return jsonify({"status": "Erro", "msg": "Dados inválidos", "detalhe": str(e)}), 400
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)}), 500
    
@assets_bp.route('/api/validate_ticker', methods=['POST'])
def validate_ticker():
    data = request.json
    ticker = data.get('ticker', '').strip()
    if not ticker:
        return jsonify({"valid": False, "msg": "Ticker vazio"})
    
    service = PortfolioService()
    result = service.validate_ticker_on_yahoo(ticker)
    
    if not result['valid']:
        return jsonify({
            "valid": True, 
            "ticker": ticker.upper(), 
            "manual": True, 
            "msg": "Ativo não encontrado no Yahoo. Será cadastrado como Manual."
        })
    return jsonify(result)

@assets_bp.route('/api/delete_asset', methods=['POST'])
def delete_asset():
    data = request.json
    asset_id = data.get('id')
    
    if not asset_id:
        return jsonify({"status": "Erro", "msg": "ID não informado"})
    
    service = PortfolioService()
    result = service.delete_asset(asset_id)
    return jsonify(result)

@assets_bp.route('/api/assets')
def get_assets():
    try:
        assets = service.get_all_assets() 
        results = []
        for asset in assets:
            asset_dict = asset.to_dict()
            # Verifica se é Ação e se tem o código CVM preenchido no banco
            if getattr(asset, 'tipo', '') == 'Ação' and getattr(asset, 'cvm_code', None):
                try:
                    # CHAMADA CORRETA:
                    asset_dict['fundamentalist_data'] = CVMProcessor.get_dashboard_data(asset.cvm_code)
                except Exception as e:
                    print(f"Erro CVM {asset.ticker}: {e}")
                    asset_dict['fundamentalist_data'] = None
            else:
                asset_dict['fundamentalist_data'] = None
            results.append(asset_dict)
        return jsonify(results)
    except Exception as e:
        return jsonify({"status": "Erro", "msg": str(e)}), 500
    
# Adicione isso junto com suas outras rotas
@assets_bp.route('/api/correlation', methods=['GET'])
def correlation():
    # Usa o service global já instanciado no topo
    data = service.get_correlation_matrix()
    return jsonify(data)
